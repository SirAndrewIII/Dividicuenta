from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
import os
import json
import math
import re
import time
import asyncio
import logging
from collections import defaultdict, deque

logger = logging.getLogger("dividicuenta")

app = FastAPI()

# Orígenes del frontend, separados por coma. En producción hay que definir
# ALLOWED_ORIGINS con el dominio real (ej. "https://dividicuenta.vercel.app").
# Por defecto solo se aceptan el servidor de desarrollo y la app de Capacitor.
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://localhost,capacitor://localhost",
    ).split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_MB", "5")) * 1024 * 1024
RATE_LIMIT_MAX = int(os.getenv("RATE_LIMIT_MAX", "10"))  # peticiones por ventana
RATE_LIMIT_WINDOW = 60  # segundos
# Tope global (todas las IP juntas): protege la cuota de Gemini aunque alguien
# consiga rotar de IP.
GLOBAL_RATE_LIMIT_MAX = int(os.getenv("GLOBAL_RATE_LIMIT_MAX", "100"))
# Detrás de un proxy (Render, Railway, etc.) activar TRUST_PROXY=1. El proxy
# agrega al FINAL de X-Forwarded-For la IP que él vio; lo que viene antes lo
# puede escribir el cliente. TRUSTED_PROXY_HOPS es cuántos proxies de confianza
# hay delante (1 en Render; 2 si además hay un CDN delante).
TRUST_PROXY = os.getenv("TRUST_PROXY") == "1"
TRUSTED_PROXY_HOPS = max(1, int(os.getenv("TRUSTED_PROXY_HOPS", "1")))

_peticiones = defaultdict(deque)
_peticiones_globales = deque()
_MAX_IPS_EN_MEMORIA = 10_000


def _ip_cliente(request: Request) -> str:
    if TRUST_PROXY:
        reenviada = request.headers.get("x-forwarded-for")
        if reenviada:
            partes = [p.strip() for p in reenviada.split(",") if p.strip()]
            if partes:
                return partes[max(0, len(partes) - TRUSTED_PROXY_HOPS)]
    return request.client.host if request.client else "desconocida"


def _olvidar_ips_inactivas(ahora: float):
    """Evita que el diccionario crezca sin límite con IP que ya no consultan."""
    if len(_peticiones) <= _MAX_IPS_EN_MEMORIA:
        return
    for ip in [ip for ip, cola in _peticiones.items() if not cola or ahora - cola[-1] > RATE_LIMIT_WINDOW]:
        del _peticiones[ip]


def _limitar_ritmo(request: Request):
    """Límite en memoria por IP y global; protege la cuota de Gemini de abusos simples."""
    ahora = time.monotonic()
    _olvidar_ips_inactivas(ahora)
    cola = _peticiones[_ip_cliente(request)]
    while cola and ahora - cola[0] > RATE_LIMIT_WINDOW:
        cola.popleft()
    while _peticiones_globales and ahora - _peticiones_globales[0] > RATE_LIMIT_WINDOW:
        _peticiones_globales.popleft()
    if len(cola) >= RATE_LIMIT_MAX or len(_peticiones_globales) >= GLOBAL_RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=429,
            detail="Demasiadas solicitudes. Espera un minuto e intenta de nuevo.",
        )
    cola.append(ahora)
    _peticiones_globales.append(ahora)


_PRECIO_EN_TEXTO = re.compile(r"^\d+(\.\d{1,2})?$")


def _precio_de(valor):
    """Devuelve el precio como número, o None si no es un precio válido.

    Es válido un número finito de 0 a 1.000.000.000 (no booleano, no nulo) o un
    texto numérico simple como "3000" o "3000.5".
    """
    if isinstance(valor, str) and _PRECIO_EN_TEXTO.match(valor.strip()):
        valor = float(valor.strip())
        valor = int(valor) if valor.is_integer() else valor
    if (
        isinstance(valor, (int, float))
        and not isinstance(valor, bool)
        and math.isfinite(valor)
        and 0 <= valor <= 1_000_000_000
    ):
        return valor
    return None


def _limpiar_menu(datos):
    """Valida con esquema estricto lo que devolvió la IA y descarta lo inválido.

    Devuelve el menú limpio, o None si no queda ningún plato utilizable.
    """
    if not isinstance(datos, dict) or datos.get("status") != "success":
        return None
    menu = datos.get("menu")
    categorias = menu.get("categorias") if isinstance(menu, dict) else None
    if not isinstance(categorias, list):
        return None

    limpias = []
    for cat in categorias:
        if not isinstance(cat, dict) or not isinstance(cat.get("items"), list):
            continue
        items = []
        for item in cat["items"]:
            if not isinstance(item, dict):
                continue
            nombre = item.get("nombre")
            precio = _precio_de(item.get("precio"))
            if not isinstance(nombre, str) or not nombre.strip() or precio is None:
                continue
            descripcion = item.get("descripcion")
            items.append({
                "nombre": nombre.strip(),
                "descripcion": descripcion if isinstance(descripcion, str) else "",
                "precio": precio,
            })
        if items:
            nombre_cat = cat.get("nombre_categoria")
            limpias.append({
                "nombre_categoria": nombre_cat if isinstance(nombre_cat, str) and nombre_cat.strip() else "Otros",
                "items": items,
            })
    if not limpias:
        return None
    return {"status": "success", "menu": {"categorias": limpias}}

# Cliente nativo de Gemini
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Google retira modelos con el tiempo (gemini-2.5-flash ya no está disponible
# para cuentas nuevas y responde 404). Se puede cambiar con GEMINI_MODEL sin
# volver a desplegar código.
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

PROMPT = """
Analiza este menú de restaurante. Extrae todos los platos, bebidas, entradas y postres organizados por sus respectivas categorías.

Devuelve la respuesta estrictamente en formato JSON válido siguiendo esta estructura exacta:
{
  "status": "success",
  "menu": {
    "categorias": [
      {
        "nombre_categoria": "Nombre de la categoría",
        "items": [
          {
            "nombre": "Nombre del plato",
            "descripcion": "Breve descripción o ingredientes",
            "precio": 31900
          }
        ]
      }
    ]
  }
}
Asegúrate de que el campo "precio" sea un número entero (sin símbolos de moneda, comas ni puntos de miles).
"""


# Marcas de los formatos que acepta Gemini. HEIC/HEIF: bloque «ftyp» con una de estas marcas.
_MARCAS_HEIC = {b"heic", b"heix", b"heim", b"heis", b"hevc", b"hevx", b"hevm", b"hevs"}
_MARCAS_HEIF = {b"mif1", b"msf1"}


def _detectar_imagen(datos: bytes):
    """Devuelve el tipo MIME real según los primeros bytes, o None si no es una imagen soportada.

    El Content-Type que declara el cliente no es confiable: texto o un ejecutable pueden
    llegar etiquetados como image/png.
    """
    if datos.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if datos.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if len(datos) >= 12 and datos[:4] == b"RIFF" and datos[8:12] == b"WEBP":
        return "image/webp"
    if len(datos) >= 12 and datos[4:8] == b"ftyp":
        if datos[8:12] in _MARCAS_HEIC:
            return "image/heic"
        if datos[8:12] in _MARCAS_HEIF:
            return "image/heif"
    return None


@app.post("/api/parse-menu")
async def parse_menu(request: Request, file: UploadFile = File(...)):
    _limitar_ritmo(request)
    try:
        mime_type = file.content_type

        if not mime_type or not mime_type.startswith("image/"):
            raise HTTPException(
                status_code=400,
                detail="Formato no soportado. Sube una imagen válida."
            )

        contents = await file.read(MAX_UPLOAD_BYTES + 1)
        if len(contents) > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"La imagen es demasiado grande (máximo {MAX_UPLOAD_BYTES // (1024 * 1024)} MB).",
            )

        tipo_real = _detectar_imagen(contents)
        if tipo_real is None:
            raise HTTPException(
                status_code=415,
                detail="Formato no soportado. Sube una foto en JPG, PNG, WEBP o HEIC.",
            )

        # La llamada es síncrona y puede tardar segundos: se ejecuta en un hilo
        # para no bloquear al resto de las peticiones del worker.
        response = await asyncio.to_thread(
            client.models.generate_content,
            model=GEMINI_MODEL,
            contents=[
                types.Part.from_bytes(data=contents, mime_type=tipo_real),
                PROMPT,
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )

        try:
            datos_menu = json.loads(response.text.strip())
        except (ValueError, AttributeError):
            logger.exception("Gemini devolvió una respuesta que no es JSON")
            raise HTTPException(
                status_code=502,
                detail="No pudimos interpretar la carta. Prueba con otra foto.",
            )

        menu_limpio = _limpiar_menu(datos_menu)
        if menu_limpio is None:
            logger.error("Gemini devolvió un JSON con forma inesperada o sin platos válidos")
            raise HTTPException(
                status_code=502,
                detail="No pudimos interpretar la carta. Prueba con otra foto.",
            )
        return menu_limpio

    except HTTPException:
        raise
    except Exception:
        # El detalle va solo al log del servidor; el cliente recibe un mensaje genérico.
        logger.exception("Error al procesar el menú con IA")
        raise HTTPException(
            status_code=502,
            detail="El servicio de escaneo no está disponible en este momento. Intenta de nuevo en unos minutos.",
        )


@app.get("/")
async def root():
    return {"message": "API de DividiCuenta funcionando correctamente"}