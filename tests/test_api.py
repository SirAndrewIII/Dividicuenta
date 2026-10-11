import asyncio
import time

import httpx
import pytest

import main
from conftest import HEIC, HEIF, IMAGEN, JPEG, MENU_OK, PNG, WEBP, Respuesta, menu_con_items


def subir(cliente, archivo=IMAGEN, **cabeceras):
    return cliente.post("/api/parse-menu", files={"file": archivo}, headers=cabeceras)


def test_raiz_responde(cliente):
    assert cliente.get("/").status_code == 200


def test_menu_valido(cliente, gemini):
    gemini(lambda **kw: Respuesta(MENU_OK))
    r = subir(cliente)
    assert r.status_code == 200
    assert r.json()["status"] == "success"
    assert r.json()["menu"]["categorias"][0]["items"][0] == {
        "nombre": "Flan",
        "descripcion": "Con dulce de leche",
        "precio": 3000,
    }


# --- El contenido real del archivo, no el tipo declarado ----------------------


@pytest.mark.parametrize(
    "nombre, contenido, declarado",
    [
        ("texto", b"hola, esto no es una imagen", "image/png"),
        ("ejecutable", b"MZ\x90\x00\x03\x00\x00\x00" + b"0" * 20, "image/jpeg"),
        ("html", b"<html><script>alert(1)</script></html>", "image/webp"),
        ("pdf", b"%PDF-1.7\n" + b"0" * 20, "image/png"),
        ("gif", b"GIF89a" + b"0" * 20, "image/gif"),
        ("vacío", b"", "image/png"),
        ("RIFF que no es WEBP", b"RIFF\x24\x00\x00\x00WAVEfmt " + b"0" * 20, "image/webp"),
        ("ftyp de video", b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00" + b"0" * 20, "image/heic"),
    ],
)
def test_un_archivo_que_no_es_imagen_se_rechaza_sin_llegar_a_gemini(cliente, gemini, nombre, contenido, declarado):
    llamadas = []
    gemini(lambda **kw: llamadas.append(kw) or Respuesta(MENU_OK))
    r = subir(cliente, (f"{nombre}.png", contenido, declarado))
    assert r.status_code == 415, nombre
    assert "JPG, PNG, WEBP o HEIC" in r.json()["detail"]
    assert llamadas == []  # no se gastó cuota de la IA


@pytest.mark.parametrize(
    "contenido, declarado, esperado",
    [
        (PNG, "image/png", "image/png"),
        (JPEG, "image/jpeg", "image/jpeg"),
        (WEBP, "image/webp", "image/webp"),
        (HEIC, "image/heic", "image/heic"),
        (HEIF, "image/heif", "image/heif"),
        (JPEG, "image/png", "image/jpeg"),  # declarado mal: se usa el tipo real
        (PNG, "image/jpg", "image/png"),
    ],
)
def test_a_gemini_se_le_envia_el_tipo_real(cliente, gemini, contenido, declarado, esperado):
    tipos = []
    gemini(lambda **kw: tipos.append(kw["contents"][0].inline_data.mime_type) or Respuesta(MENU_OK))
    r = subir(cliente, ("foto.bin", contenido, declarado))
    assert r.status_code == 200
    assert tipos == [esperado]


# --- Esquema estricto del menú (precio nulo, booleano, texto...) -------------


@pytest.mark.parametrize("precio", [None, True, False, "", "abc", "1,500", "-5", [], {}, -5, float("inf"), 2_000_000_000])
def test_un_precio_invalido_descarta_el_plato(cliente, gemini, precio):
    texto = menu_con_items({"nombre": "Misterioso", "precio": precio}, {"nombre": "Flan", "precio": 3000})
    gemini(lambda **kw: Respuesta(texto.replace("Infinity", "1e999")))
    r = subir(cliente)
    assert r.status_code == 200
    nombres = [i["nombre"] for c in r.json()["menu"]["categorias"] for i in c["items"]]
    assert nombres == ["Flan"]


def test_un_precio_en_texto_numerico_se_convierte_a_numero(cliente, gemini):
    gemini(lambda **kw: Respuesta(menu_con_items({"nombre": "A", "precio": "3000"}, {"nombre": "B", "precio": " 450.5 "})))
    precios = [i["precio"] for c in subir(cliente).json()["menu"]["categorias"] for i in c["items"]]
    assert precios == [3000, 450.5]


def test_si_ningun_plato_es_valido_responde_502(cliente, gemini):
    gemini(lambda **kw: Respuesta(menu_con_items({"nombre": "A", "precio": None}, {"nombre": "", "precio": 10})))
    assert subir(cliente).status_code == 502


def test_se_limpian_categorias_y_nombres(cliente, gemini):
    texto = (
        '{"status":"success","menu":{"categorias":['
        '{"nombre_categoria":"  ","items":[{"nombre":"  Flan  ","precio":3000.5,"descripcion":7}]},'
        '{"nombre_categoria":"Vacía","items":[]},'
        '"no es un diccionario"]}}'
    )
    gemini(lambda **kw: Respuesta(texto))
    categorias = subir(cliente).json()["menu"]["categorias"]
    assert categorias == [
        {"nombre_categoria": "Otros", "items": [{"nombre": "Flan", "descripcion": "", "precio": 3000.5}]}
    ]


# --- El modelo de Gemini es configurable -------------------------------------


def test_usa_el_modelo_configurado(cliente, gemini, monkeypatch):
    usados = []

    def captura(**kw):
        usados.append(kw["model"])
        return Respuesta(MENU_OK)

    gemini(captura)
    subir(cliente)
    assert usados == [main.GEMINI_MODEL] == ["gemini-3.8-flash"]  # el de la recomendación de Google

    monkeypatch.setattr(main, "GEMINI_MODEL", "otro-modelo")
    main._peticiones.clear()
    subir(cliente)
    assert usados[-1] == "otro-modelo"


def test_un_modelo_retirado_responde_502_sin_filtrar_el_detalle(cliente, gemini):
    def retirado(**kw):
        raise RuntimeError("404 NOT_FOUND. This model models/x is no longer available to new users")

    gemini(retirado)
    r = subir(cliente)
    assert r.status_code == 502
    assert "NOT_FOUND" not in r.text and "models/" not in r.text


# --- Gemini no bloquea el event loop ----------------------------------------


def test_varias_cartas_se_procesan_en_paralelo(gemini):
    def lenta(**kw):
        time.sleep(0.3)
        return Respuesta(MENU_OK)

    gemini(lenta)

    async def correr():
        transporte = httpx.ASGITransport(app=main.app)
        async with httpx.AsyncClient(transport=transporte, base_url="http://prueba") as c:
            inicio = time.perf_counter()
            respuestas = await asyncio.gather(
                *[c.post("/api/parse-menu", files={"file": IMAGEN}) for _ in range(3)]
            )
            return [r.status_code for r in respuestas], time.perf_counter() - inicio

    codigos, duracion = asyncio.run(correr())
    assert codigos == [200, 200, 200]
    assert duracion < 0.7  # en serie tardarían ~0.9 s


# --- Límite de peticiones detrás de un proxy ---------------------------------


def test_con_proxy_el_encabezado_falsificado_no_da_cuota_extra(cliente, gemini, monkeypatch):
    monkeypatch.setattr(main, "TRUST_PROXY", True)
    monkeypatch.setattr(main, "TRUSTED_PROXY_HOPS", 1)
    gemini(lambda **kw: Respuesta(MENU_OK))
    # El cliente inventa la primera IP; el proxy agrega al final la real (9.9.9.9)
    codigos = [subir(cliente, **{"X-Forwarded-For": f"10.0.0.{i}, 9.9.9.9"}).status_code for i in range(6)]
    assert codigos == [200, 200, 200, 200, 429, 429]


def test_con_dos_proxies_se_toma_la_penultima_entrada(cliente, gemini, monkeypatch):
    monkeypatch.setattr(main, "TRUST_PROXY", True)
    monkeypatch.setattr(main, "TRUSTED_PROXY_HOPS", 2)
    gemini(lambda **kw: Respuesta(MENU_OK))
    codigos = [subir(cliente, **{"X-Forwarded-For": f"falsa{i}, 9.9.9.9, 172.16.0.1"}).status_code for i in range(6)]
    assert codigos == [200, 200, 200, 200, 429, 429]


def test_ips_distintas_tienen_cuotas_distintas(cliente, gemini, monkeypatch):
    monkeypatch.setattr(main, "TRUST_PROXY", True)
    gemini(lambda **kw: Respuesta(MENU_OK))
    codigos = [subir(cliente, **{"X-Forwarded-For": f"9.9.9.{i}"}).status_code for i in range(6)]
    assert codigos == [200] * 6


def test_el_tope_global_corta_aunque_cambie_la_ip(cliente, gemini, monkeypatch):
    monkeypatch.setattr(main, "TRUST_PROXY", True)
    monkeypatch.setattr(main, "GLOBAL_RATE_LIMIT_MAX", 3)
    gemini(lambda **kw: Respuesta(MENU_OK))
    codigos = [subir(cliente, **{"X-Forwarded-For": f"9.9.9.{i}"}).status_code for i in range(5)]
    assert codigos == [200, 200, 200, 429, 429]


def test_sin_proxy_se_ignora_el_encabezado(cliente, gemini):
    gemini(lambda **kw: Respuesta(MENU_OK))
    codigos = [subir(cliente, **{"X-Forwarded-For": f"9.9.9.{i}"}).status_code for i in range(6)]
    assert codigos == [200, 200, 200, 200, 429, 429]


def test_se_olvidan_las_ips_inactivas(monkeypatch):
    monkeypatch.setattr(main, "_MAX_IPS_EN_MEMORIA", 2)
    for i in range(5):
        main._peticiones[f"ip{i}"].append(time.monotonic() - 1000)  # fuera de la ventana
    main._peticiones["activa"].append(time.monotonic())
    main._olvidar_ips_inactivas(time.monotonic())
    assert list(main._peticiones) == ["activa"]


def test_pdf_devuelve_400_real(cliente):
    r = subir(cliente, ("carta.pdf", b"%PDF", "application/pdf"))
    assert r.status_code == 400


def test_archivo_demasiado_grande_devuelve_413(cliente):
    r = subir(cliente, ("grande.png", b"0" * (1024 * 1024 + 5), "image/png"))
    assert r.status_code == 413


def test_limite_de_peticiones_devuelve_429(cliente, gemini):
    gemini(lambda **kw: Respuesta(MENU_OK))
    codigos = [subir(cliente).status_code for _ in range(6)]
    assert codigos == [200, 200, 200, 200, 429, 429]


def test_cors_solo_para_el_origen_permitido(cliente):
    def origen(valor):
        r = cliente.options(
            "/api/parse-menu",
            headers={"Origin": valor, "Access-Control-Request-Method": "POST"},
        )
        return r.headers.get("access-control-allow-origin")

    assert origen("https://miapp.example") == "https://miapp.example"
    assert origen("https://evil.example") is None


def test_error_de_gemini_no_filtra_detalles(cliente, gemini):
    def fallar(**kw):
        raise RuntimeError("SECRETO api_key=AIzaFALSA host interno 10.0.0.5")

    gemini(fallar)
    r = subir(cliente)
    assert r.status_code == 502
    assert "SECRETO" not in r.text and "AIza" not in r.text and "10.0.0.5" not in r.text


@pytest.mark.parametrize(
    "texto",
    [
        "esto no es json",
        '{"status":"error"}',
        '{"status":"success","menu":"texto"}',
        '{"status":"success","menu":{"categorias":"no es lista"}}',
    ],
)
def test_respuestas_invalidas_de_gemini_devuelven_502(cliente, gemini, texto):
    gemini(lambda **kw: Respuesta(texto))
    assert subir(cliente).status_code == 502
