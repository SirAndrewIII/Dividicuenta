import pytest

from conftest import IMAGEN, MENU_OK, Respuesta


def subir(cliente, archivo=IMAGEN):
    return cliente.post("/api/parse-menu", files={"file": archivo})


def test_raiz_responde(cliente):
    assert cliente.get("/").status_code == 200


def test_menu_valido(cliente, gemini):
    gemini(lambda **kw: Respuesta(MENU_OK))
    r = subir(cliente)
    assert r.status_code == 200
    assert r.json()["status"] == "success"


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
