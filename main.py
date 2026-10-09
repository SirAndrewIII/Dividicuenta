from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
import os
import json
import time
from collections import defaultdict, deque

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
# Detrás de un proxy (Render, Railway, etc.) activar TRUST_PROXY=1 para tomar
# la IP real del primer valor de X-Forwarded-For.
TRUST_PROXY = os.getenv("TRUST_PROXY") == "1"

_peticiones = defaultdict(deque)


def _ip_cliente(request: Request) -> str:
    if TRUST_PROXY:
        reenviada = request.headers.get("x-forwarded-for")
        if reenviada:
            return reenviada.split(",")[0].strip()
    return request.client.host if request.client else "desconocida"


def _limitar_ritmo(request: Request):
    """Límite en memoria por IP; protege la cuota de Gemini de abusos simples."""
    ahora = time.monotonic()
    cola = _peticiones[_ip_cliente(request)]
    while cola and ahora - cola[0] > RATE_LIMIT_WINDOW:
        cola.popleft()
    if len(cola) >= RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=429,
            detail="Demasiadas solicitudes. Espera un minuto e intenta de nuevo.",
        )
    cola.append(ahora)

# Cliente nativo de Gemini
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

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

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Part.from_bytes(data=contents, mime_type=mime_type),
                PROMPT,
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )

        texto_respuesta = response.text.strip()
        datos_menu = json.loads(texto_respuesta)
        return datos_menu

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error al procesar el menú con IA: {e}")
        return {"status": "error", "message": str(e)}


@app.get("/")
async def root():
    return {"message": "API de DividiCuenta funcionando correctamente"}