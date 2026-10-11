export const PREFIJO = 'dividicuenta:v1:';

// Borra todo lo que la app guardó en el navegador (todos los modos), sin tocar
// claves de otras aplicaciones del mismo dominio.
export function borrarDatosGuardados() {
  try {
    Object.keys(window.localStorage)
      .filter((clave) => clave.startsWith(PREFIJO))
      .forEach((clave) => window.localStorage.removeItem(clave));
  } catch {
    // sin acceso al almacenamiento: no hay nada que borrar
  }
}
