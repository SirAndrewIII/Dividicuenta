let ultimo = 0;

// Id numérico único aunque se llame varias veces en el mismo milisegundo.
export function generarId() {
  ultimo = Math.max(Date.now(), ultimo + 1);
  return ultimo;
}
