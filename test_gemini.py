"""
Prueba rápida y aislada: ¿la clave y el modelo responden?
Uso:
    pip install google-genai python-dotenv --break-system-packages
    python test_gemini.py
"""
from dotenv import load_dotenv
load_dotenv()

import os
from google import genai

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise SystemExit("No encontré GEMINI_API_KEY en tu .env")

print(f"Clave encontrada ({len(api_key)} caracteres).")

client = genai.Client(api_key=api_key)

# Primero el modelo configurado en GEMINI_MODEL (el que usa main.py); después
# algunos candidatos por si Google retiró el actual.
candidatos = [os.getenv("GEMINI_MODEL", "gemini-3.8-flash"), "gemini-3.8-flash", "gemini-2.5-flash"]
for modelo in dict.fromkeys(candidatos):
    print(f"\n--- Probando modelo: {modelo} ---")
    try:
        response = client.models.generate_content(
            model=modelo,
            contents="Responde solo con la palabra: OK",
        )
        print("✅ Funciona. Respuesta:", response.text.strip())
    except Exception as e:
        print("❌ Error:", e)
