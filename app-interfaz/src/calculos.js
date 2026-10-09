// Funciones puras de reparto. Trabajan en centavos enteros para que la suma
// de las partes siempre coincida exactamente con el total.

const aCentavos = (n) => Math.round((Number(n) || 0) * 100);
const aPesos = (c) => c / 100;

// Reparte `total` según `pesos` (método del mayor resto). Devuelve pesos.
export function repartirProporcional(total, pesos) {
  const totalC = aCentavos(total);
  const suma = pesos.reduce((a, p) => a + p, 0);
  if (pesos.length === 0 || suma <= 0) return pesos.map(() => 0);

  const bases = pesos.map((p) => (totalC * p) / suma);
  const partes = bases.map(Math.floor);
  let resto = totalC - partes.reduce((a, b) => a + b, 0);

  const orden = bases
    .map((b, i) => ({ i, frac: b - Math.floor(b) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; resto > 0; k = (k + 1) % orden.length, resto--) {
    partes[orden[k].i] += 1;
  }
  return partes.map(aPesos);
}

export function dividirIgual(total, cantidad) {
  return repartirProporcional(total, Array(cantidad).fill(1));
}

// Aporte según ingresos: cada uno pone el mismo % de lo que gana.
export function dividirPorIngresos(total, ingresos) {
  const sumaIngresos = ingresos.reduce((a, b) => a + b, 0);
  const montos = repartirProporcional(total, ingresos);
  return {
    montos,
    porcentajes: ingresos.map((i) => (sumaIngresos > 0 ? (i / sumaIngresos) * 100 : 0)),
    esfuerzo: sumaIngresos > 0 ? (total / sumaIngresos) * 100 : 0,
  };
}

// Dado cuánto pagó cada uno y cuánto le corresponde, calcula las transferencias
// mínimas (deudor mayor -> acreedor mayor) para dejar todo en cero.
export function saldarDeudas(personas) {
  const deudores = [];
  const acreedores = [];
  personas.forEach(({ nombre, pagado, corresponde }) => {
    const saldo = aCentavos(pagado) - aCentavos(corresponde);
    if (saldo < 0) deudores.push({ nombre, c: -saldo });
    else if (saldo > 0) acreedores.push({ nombre, c: saldo });
  });
  deudores.sort((a, b) => b.c - a.c);
  acreedores.sort((a, b) => b.c - a.c);

  const transferencias = [];
  let d = 0;
  let a = 0;
  while (d < deudores.length && a < acreedores.length) {
    const monto = Math.min(deudores[d].c, acreedores[a].c);
    transferencias.push({ de: deudores[d].nombre, a: acreedores[a].nombre, monto: aPesos(monto) });
    deudores[d].c -= monto;
    acreedores[a].c -= monto;
    if (deudores[d].c === 0) d++;
    if (acreedores[a].c === 0) a++;
  }
  return transferencias;
}

export const formatoPesos = (n) =>
  '$' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
