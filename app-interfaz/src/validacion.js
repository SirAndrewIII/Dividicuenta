// Límites y validación de lo que escribe el usuario.
//
// Política: los precios y montos van de 0 a MAX_MONTO con hasta 2 decimales (el
// 0 sirve para una cortesía); no se admiten descuentos negativos. Las
// cantidades son enteros de 1 a MAX_CANTIDAD. La propina va de 0 a 100.
//
// Todo importe escrito por el usuario se interpreta con la MISMA gramática
// (parsearPrecio), sea cual sea el campo o el modo.

export const MAX_MONTO = 1_000_000_000;
export const MAX_CANTIDAD = 99;
export const MAX_NOMBRE = 40;
export const MAX_TEXTO = 60;
export const MAX_LOTE = 2000;
export const PROPINA_INICIAL = 10;

export const esMontoValido = (n) => Number.isFinite(n) && n >= 0 && n <= MAX_MONTO;
export const esCantidadValida = (n) => Number.isInteger(n) && n >= 1 && n <= MAX_CANTIDAD;

// --- Gramática de importes --------------------------------------------------
// Formatos válidos (es-AR), con hasta 2 decimales:
//   4500   4500,50   4500.50   1.500   10.000   1.234.567,89
// Todo lo demás es ambiguo y se rechaza (NaN): 12.34.56, 1..2, 1,2,3, 1,500…
const PRECIO_CON_MILES = /^[1-9]\d{0,2}(\.\d{3})+(,\d{1,2})?$/;
const PRECIO_SIMPLE = /^\d+([,.]\d{1,2})?$/;

export function parsearPrecio(texto) {
  const limpio = String(texto).replace(/[$\s]/g, '');
  if (PRECIO_CON_MILES.test(limpio)) return parseFloat(limpio.replace(/\./g, '').replace(',', '.'));
  if (PRECIO_SIMPLE.test(limpio)) return parseFloat(limpio.replace(',', '.'));
  return NaN;
}

// Valor numérico de un importe: los números pasan tal cual y el texto se
// interpreta con la gramática de arriba (NaN si no es un importe).
export function aMonto(valor) {
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string' && valor.trim() !== '') return parsearPrecio(valor);
  return NaN;
}

// Igual que aMonto, pero lo que no es un importe cuenta como 0 (para sumar).
export function montoOCero(valor) {
  const n = aMonto(valor);
  return Number.isFinite(n) ? n : 0;
}

const FORMATO_VALIDO = 'Escríbelo como 1500, 1.500 o 1500,50 (hasta 2 decimales).';

// Mensaje de error de un campo de monto, o null si está vacío o es válido.
// `sujeto` es la frase que abre el mensaje, p. ej. «El precio».
export function errorDeMonto(valor, sujeto) {
  if (valor === '' || valor === null || valor === undefined) return null;
  if (typeof valor === 'string' && valor.trim() === '') return null;

  if (typeof valor === 'string' && /^\s*-/.test(valor)) return `${sujeto} no puede ser negativo.`;
  const n = aMonto(valor);
  if (!Number.isFinite(n)) {
    return typeof valor === 'string'
      ? `${sujeto} no es válido. ${FORMATO_VALIDO}`
      : `${sujeto} no es un número válido.`;
  }
  if (n < 0) return `${sujeto} no puede ser negativo.`;
  if (n > MAX_MONTO) return `${sujeto} es demasiado alto.`;
  if (Math.abs(n * 100 - Math.round(n * 100)) > 1e-6) return `${sujeto} admite hasta 2 decimales.`;
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
// Solo se arregla la ESTRUCTURA (tipos, ids, largos). Los valores fuera de
// rango se conservan tal cual para que la validación los muestre y bloquee los
// totales: nunca se reemplaza un importe en silencio.

const texto = (v, max) => String(v ?? '').slice(0, max);

// Un número o un texto se conservan; cualquier otra cosa no se puede mostrar.
function valorCrudo(v, porDefecto) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') return v.slice(0, 30);
  return porDefecto;
}

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
          cantidad: valorCrudo(it.cantidad, 1),
          valorUnitario: valorCrudo(it.valorUnitario, 0),
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
      valorTotal: valorCrudo(c.valorTotal, 0),
      comensalesIds: (Array.isArray(c.comensalesIds) ? c.comensalesIds : []).filter(Number.isFinite),
    }));
}

export function sanearPropina(crudo, porDefecto = PROPINA_INICIAL) {
  if (crudo === '') return '';
  const valido = (typeof crudo === 'number' || typeof crudo === 'string') && Number.isFinite(Number(crudo));
  return valido ? crudo : porDefecto;
}
