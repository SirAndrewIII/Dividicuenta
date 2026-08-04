from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
import os
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cliente nativo de Gemini (funciona con las claves nuevas "AQ." y con las "AIza" clásicas)
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
async def parse_menu(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        mime_type = file.content_type

        if not mime_type or not mime_type.startswith("image/"):
            raise HTTPException(
                status_code=400,
                detail="Formato no soportado. Sube una imagen válida."
            )

        response = client.models.generate_content(
            model="gemini-2.5-flash",  # rápido y económico; usa "gemini-2.5-pro" si necesitas más precisión
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

    except Exception as e:
        print(f"Error al procesar el menú con IA: {e}")
        return {"status": "error", "message": str(e)}