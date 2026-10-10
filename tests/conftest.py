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
    yield
    main._peticiones.clear()


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


MENU_OK = '{"status":"success","menu":{"categorias":[{"nombre_categoria":"A","items":[]}]}}'
IMAGEN = ("carta.png", b"\x89PNG0000", "image/png")
