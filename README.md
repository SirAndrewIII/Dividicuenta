# DividiCuenta

Divide la cuenta entre amigos de cuatro formas:

| Modo | Para qué sirve |
|---|---|
| **Por consumo** | Cada uno carga lo que pidió (uno a uno o pegando una lista), con platos compartidos y propina. Se puede escanear la carta con IA. |
| **Partes iguales** | Un total entre N personas, con propina opcional. |
| **Según ingresos** | Cada uno aporta el mismo porcentaje de lo que gana. |
| **Quién pagó qué** | Calcula la menor cantidad posible de transferencias para quedar a mano (óptimo exacto hasta 16 personas con saldo). |

Todos los modos pueden compartir el resultado por WhatsApp. Lo que cargas se guarda en el navegador (`localStorage`), así que sobrevive a recargas; no hay base de datos ni cuentas de usuario.

## Reglas de validación

Los límites viven en `app-interfaz/src/validacion.js`:

- **Precios y montos:** de 0 a 1.000.000.000. El 0 sirve para una cortesía; no se admiten descuentos negativos.
- **Cantidad de un plato:** entero de 1 a 99.
- **Propina:** de 0 a 100.
- **Nombres:** hasta 40 caracteres (personas) y 60 (platos y motivos).
- **Precios escritos a mano** (`1.500`, `4500,50`, `$10.000`): se aceptan hasta 2 decimales y el punto seguido de 3 dígitos cuenta como separador de miles. Lo ambiguo (`12.34.56`, `1..2`, `1,500`) se rechaza en lugar de interpretarse.
- **Un valor fuera de rango** se conserva tal como se escribió, se marca en rojo con un mensaje que dice por qué, y los totales se ocultan hasta corregirlo. Nada se cambia en silencio.
- **Precios de la IA:** `null`, booleanos, vacíos o negativos descartan el plato (un precio desconocido nunca aparece como gratis). El backend y el frontend aplican el mismo esquema.
- **Platos compartidos:** solo se registran con participantes que existen. Si al eliminar a alguien un plato queda sin participantes, se marca y su importe aparece como «sin asignar» en el resumen y en el mensaje.
- **Ingresos:** no se incluyen en el mensaje de WhatsApp salvo que se marque la opción.
- **Reiniciar** borra lo cargado en todos los modos y su guardado en el navegador.
- Lo guardado en el navegador se sanea al cargar, por si viene de una versión anterior o fue alterado.

## Estructura

```
app-interfaz/     Frontend (React 19 + Vite + Tailwind 4)
  src/App.jsx           Estructura general y pestañas
  src/components/       Un componente por pantalla o sección
  src/hooks/            Estado del modo «Por consumo» y persistencia
  src/calculos.js       Reparto en centavos, saldos y parser de platos (funciones puras)
  src/mensajes.js       Textos para WhatsApp
  src/api.js            Cliente del backend de escaneo
main.py           Backend (FastAPI): POST /api/parse-menu, lee la carta con Gemini
tests/            Pruebas del backend (pytest)
```

## Desarrollo local

**Backend** (Python 3.12):

```bash
python -m venv .venv && source .venv/bin/activate   # en Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env                                  # completa GEMINI_API_KEY
uvicorn main:app --reload                             # http://localhost:8000
```

**Frontend** (Node 22):

```bash
cd app-interfaz
npm ci
cp .env.example .env.local                            # VITE_API_URL=http://localhost:8000
npm run dev                                           # http://localhost:5173
```

## Pruebas y calidad

```bash
cd app-interfaz && npm run lint && npm test && npm run build
python -m pytest tests                                # desde la raíz
```

El workflow de [CI](.github/workflows/ci.yml) ejecuta todo esto en cada pull request y en cada push a `main`.

Las pruebas del frontend incluyen una auditoría de accesibilidad con axe-core. El contraste no se puede medir en jsdom; se comprobó en un navegador real (WCAG 2.2 AA, escritorio y 375 px).

## Despliegue

Variables de entorno del **backend** (ver [.env.example](.env.example)):

- `GEMINI_API_KEY`: obligatoria.
- `GEMINI_MODEL` (por defecto `gemini-3.8-flash`): Google retira modelos con el tiempo. Si el escaneo responde 502 y el log de Render muestra `404 NOT_FOUND ... is no longer available`, basta con cambiar esta variable y reiniciar el servicio, sin tocar código. `python test_gemini.py` prueba la clave y los modelos.
- `ALLOWED_ORIGINS`: dominio(s) del frontend separados por coma. **Sin esto, el escaneo de cartas falla por CORS** al estar el frontend en otro dominio.
- `TRUST_PROXY=1`: si el backend está detrás de un proxy (Render, Railway...), para que el límite de peticiones use la IP real. Se toma la entrada de `X-Forwarded-For` que **agrega el proxy** (la última), nunca la primera, que puede escribirla el cliente.
- `TRUSTED_PROXY_HOPS` (1): cuántos proxies de confianza hay delante. Usa 2 si además hay un CDN delante.
- `MAX_UPLOAD_MB` (5), `RATE_LIMIT_MAX` (10 por minuto y por IP) y `GLOBAL_RATE_LIMIT_MAX` (100 por minuto en total): opcionales.

Variable del **frontend** (se fija al compilar): `VITE_API_URL`, la URL pública del backend.

El límite de peticiones vive en la memoria del proceso: sirve contra abusos simples, no reemplaza a un WAF ni a un token de acceso.

## Aplicación móvil

`app-interfaz/capacitor.config.json` deja preparado el empaquetado con Capacitor. El origen `capacitor://localhost` ya está permitido por defecto en CORS.
