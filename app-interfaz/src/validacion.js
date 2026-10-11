// Límites y validación de lo que escribe el usuario (BL-2).
//
// Política: los precios y montos van de 0 a MAX_MONTO (el 0 sirve para una
// cortesía); no se admiten descuentos negativos. Las cantidades son enteros de
// 1 a MAX_CANTIDAD. La propina va de 0 a 100.

export const MAX_MONTO = 1_000_000_000;
export const MAX_CANTIDAD = 99;
export const MAX_NOMBRE = 40;
export const MAX_TEXTO = 60;
export const MAX_LOTE = 2000;
export const PROPINA_INICIAL = 10;

export const esMontoValido = (n) => Number.isFinite(n) && n >= 0 && n <= MAX_MONTO;
export const esCantidadValida = (n) => Number.isInteger(n) && n >= 1 && n <= MAX_CANTIDAD;

// Mensaje de error de un campo de monto, o null si está vacío o es válido.
// `sujeto` es la frase que abre el mensaje, p. ej. «El precio».
export function errorDeMonto(texto, sujeto) {
  if (texto === '' || texto === null || texto === undefined) return null;
  const n = typeof texto === 'number' ? texto : Number(texto);
  if (!Number.isFinite(n)) return `${sujeto} no es un número válido.`;
  if (n < 0) return `${sujeto} no puede ser negativo.`;
  if (n > MAX_MONTO) return `${sujeto} es demasiado alto.`;
  return null;
}

// Propina: vacío cuenta como 0; si no, debe estar entre 0 y 100.
export function errorDePropina(valor) {
  if (valor === '' || valor === null || valor === undefined) return null;
  const n = Number(valor);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? null : 'La propina debe estar entre 0 y 100.';
}

// Cantidad de un plato ya cargado: vacío no es error mientras se escribe
// (al salir del campo vuelve a 1).
export function errorDeCantidadEditada(valor) {
  return valor === '' ? null : errorDeCantidad(valor);
}

export function errorDeCantidad(valor) {
  return esCantidadValida(Number(valor))
    ? null
    : `La cantidad debe ser un número entero entre 1 y ${MAX_CANTIDAD}.`;
}

// --- Saneado de lo guardado en el navegador -------------------------------
// localStorage puede traer datos de versiones anteriores o alterados a mano.

const texto = (v, max) => String(v ?? '').slice(0, max);
const montoSeguro = (v) => (esMontoValido(Number(v)) && v !== '' && v !== null ? Number(v) : 0);
const cantidadSegura = (v) => (esCantidadValida(Number(v)) ? Number(v) : 1);

export function sanearComensales(crudo) {
  if (!Array.isArray(crudo)) return [];
  return crudo
    .filter((c) => c && Number.isFinite(c.id))
    .map((c) => ({
      id: c.id,
      nombre: texto(c.nombre, MAX_NOMBRE),
      items: (Array.isArray(c.items) ? c.items : [])
        .filter((it) => it && Number.isFinite(it.id))
        .map((it) => ({
          id: it.id,
          nombre: texto(it.nombre, MAX_TEXTO),
          cantidad: cantidadSegura(it.cantidad),
          valorUnitario: montoSeguro(it.valorUnitario),
        })),
    }));
}

export function sanearCompartidos(crudo) {
  if (!Array.isArray(crudo)) return [];
  return crudo
    .filter((c) => c && Number.isFinite(c.id))
    .map((c) => ({
      id: c.id,
      nombre: texto(c.nombre, MAX_TEXTO),
      valorTotal: montoSeguro(c.valorTotal),
      comensalesIds: (Array.isArray(c.comensalesIds) ? c.comensalesIds : []).filter(Number.isFinite),
    }));
}

export function sanearPropina(crudo, porDefecto = PROPINA_INICIAL) {
  if (crudo === '') return '';
  const n = Number(crudo);
  return crudo !== null && Number.isFinite(n) && n >= 0 && n <= 100 ? n : porDefecto;
}
