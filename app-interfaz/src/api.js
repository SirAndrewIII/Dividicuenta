import { normalizarMenu } from './calculos';

export class ErrorEscaneo extends Error {}

// Envía la foto de la carta al backend y devuelve el menú ya validado.
// Lanza ErrorEscaneo con un mensaje listo para mostrar al usuario.
export async function escanearCarta(archivo) {
  const formData = new FormData();
  formData.append('file', archivo);

  let response;
  try {
    response = await fetch(`${import.meta.env.VITE_API_URL}/api/parse-menu`, {
      method: 'POST',
      body: formData,
    });
  } catch (error) {
    console.error('Error al subir el menú:', error);
    throw new ErrorEscaneo('No pudimos conectar con el servicio de escaneo. Revisa tu conexión e intenta de nuevo.');
  }

  const datos = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ErrorEscaneo(
      typeof datos.detail === 'string' ? datos.detail : 'No se pudo procesar la carta. Intenta de nuevo.',
    );
  }

  const menu = datos.status === 'success' ? normalizarMenu(datos.menu) : null;
  if (!menu) {
    throw new ErrorEscaneo('No pudimos leer platos en esa imagen. Prueba con una foto más nítida y de frente.');
  }
  return menu;
}
