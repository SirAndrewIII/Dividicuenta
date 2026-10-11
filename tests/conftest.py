import os
import sys
import types

import pytest

# main.py crea el cliente de Gemini al importarse y lee estos valores del entorno.
os.environ["GEMINI_API_KEY"] = "clave-de-prueba"
os.environ["ALLOWED_ORIGINS"] = "https://miapp.example"
os.environ["MAX_UPLOAD_MB"] = "1"
os.environ["RATE_LIMIT_MAX"] = "4"

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import main  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture(autouse=True)
def limpiar_limite():
    main._peticiones.clear()
    main._peticiones_globales.clear()
    yield
    main._peticiones.clear()
    main._peticiones_globales.clear()


@pytest.fixture
def cliente():
    return TestClient(main.app, raise_server_exceptions=False)


@pytest.fixture
def gemini(monkeypatch):
    """Sustituye el cliente de Gemini: gemini(lambda **kw: objeto_con_text)."""

    def instalar(generar):
        monkeypatch.setattr(
            main,
            "client",
            types.SimpleNamespace(models=types.SimpleNamespace(generate_content=generar)),
        )

    return instalar


class Respuesta:
    def __init__(self, text):
        self.text = text


MENU_OK = (
    '{"status":"success","menu":{"categorias":[{"nombre_categoria":"A",'
    '"items":[{"nombre":"Flan","descripcion":"Con dulce de leche","precio":3000}]}]}}'
)


def menu_con_items(*items):
    """Menú de una categoría con los ítems dados (cada uno es un dict ya serializable)."""
    import json

    return json.dumps(
        {"status": "success", "menu": {"categorias": [{"nombre_categoria": "A", "items": list(items)}]}}
    )


# Cabeceras reales de cada formato (el backend valida el contenido, no el Content-Type declarado)
PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 32
JPEG = b"\xff\xd8\xff\xe0" + b"0" * 32
WEBP = b"RIFF\x24\x00\x00\x00WEBPVP8 " + b"0" * 32
HEIC = b"\x00\x00\x00\x18ftypheic\x00\x00\x00\x00" + b"0" * 32
HEIF = b"\x00\x00\x00\x18ftypmif1\x00\x00\x00\x00" + b"0" * 32

IMAGEN = ("carta.png", PNG, "image/png")
