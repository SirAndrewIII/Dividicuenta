// Funciones puras de reparto. Trabajan en centavos enteros para que la suma
// de las partes siempre coincida exactamente con el total.

const aCentavos = (n) => Math.round((Number(n) || 0) * 100);
const aPesos = (c) => c / 100;

// Reparte `totalC` centavos según `pesos` (método del mayor resto).
// La suma del resultado es siempre exactamente `totalC`.
function repartirCentavos(totalC, pesos) {
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
  return partes;
}

// Reparte `total` según `pesos`. Devuelve pesos.
export function repartirProporcional(total, pesos) {
  return repartirCentavos(aCentavos(total), pesos).map(aPesos);
}

// Cuenta del modo «Por consumo»: consumos individuales + platos compartidos
// (en partes iguales) + propina repartida según lo consumido. Todo en centavos,
// así que los totales por persona suman exactamente el total de la cuenta.
export function calcularCuentaPorConsumo(comensales, compartidos, propinaPct) {
  const posicion = new Map(comensales.map((c, i) => [c.id, i]));

  const individual = comensales.map((c) =>
    c.items.reduce(
      (acc, it) => acc + aCentavos((Number(it.cantidad) || 0) * (Number(it.valorUnitario) || 0)),
      0,
    ),
  );

  const compartido = comensales.map(() => 0);
  const detalle = comensales.map(() => []);
  compartidos.forEach((plato, k) => {
    const participantes = plato.comensalesIds.filter((id) => posicion.has(id));
    const n = participantes.length;
    if (n === 0) return;
    const totalC = aCentavos(plato.valorTotal);
    const base = Math.floor(totalC / n);
    const extra = totalC - base * n;
    participantes.forEach((id, j) => {
      // el centavo sobrante rota entre platos para no cargar siempre al mismo
      const recibeExtra = (j - (k % n) + n) % n < extra;
      const monto = base + (recibeExtra ? 1 : 0);
      compartido[posicion.get(id)] += monto;
      detalle[posicion.get(id)].push({ id: plato.id, nombre: plato.nombre, monto: aPesos(monto) });
    });
  });

  const subtotales = individual.map((v, i) => v + compartido[i]);
  const totalSubtotal = subtotales.reduce((a, b) => a + b, 0);
  const pct = Number(propinaPct) || 0;
  const totalPropina = totalSubtotal > 0 ? Math.round((totalSubtotal * pct) / 100) : 0;
  const propinas = repartirCentavos(
    totalPropina,
    subtotales.map((s) => Math.max(0, s)),
  );

  const porComensal = comensales.map((_, i) => ({
    subtotalIndividual: aPesos(individual[i]),
    subtotalCompartido: aPesos(compartido[i]),
    subtotal: aPesos(subtotales[i]),
    propinaValor: aPesos(propinas[i]),
    total: aPesos(subtotales[i] + propinas[i]),
    detalleCompartido: detalle[i],
  }));
  const propinaAsignada = propinas.reduce((a, b) => a + b, 0);

  return {
    porComensal,
    totalSubtotal: aPesos(totalSubtotal),
    totalPropina: aPesos(propinaAsignada),
    total: aPesos(totalSubtotal + propinaAsignada),
  };
}

// Valida y limpia el menú que devuelve la IA: descarta lo que no tenga la
// forma esperada. Devuelve null si no queda ningún plato utilizable.
export function normalizarMenu(menu) {
  if (!menu || !Array.isArray(menu.categorias)) return null;
  const categorias = menu.categorias
    .map((cat) => ({
      nombre_categoria: String((cat && cat.nombre_categoria) || 'Otros'),
      items: (Array.isArray(cat && cat.items) ? cat.items : [])
        .map((it) => ({
          nombre: String((it && it.nombre) || '').trim(),
          descripcion: it && it.descripcion ? String(it.descripcion) : '',
          precio: Number(it && it.precio),
        }))
        .filter((it) => it.nombre && Number.isFinite(it.precio) && it.precio >= 0),
    }))
    .filter((cat) => cat.items.length > 0);
  return categorias.length > 0 ? { categorias } : null;
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

// Formato es-AR: sin decimales si es entero y con 2 si hay centavos ($33,34).
export const formatoPesos = (n) => {
  const centavos = Math.round((Number(n) || 0) * 100);
  const decimales = centavos % 100 === 0 ? 0 : 2;
  return (
    '$' +
    (centavos / 100).toLocaleString('es-AR', {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    })
  );
};

// "30.000", "$30000", "1.500,50" -> número (formato es-AR). NaN si no es un precio.
export function parsearPrecio(texto) {
  const limpio = texto.replace(/[$\s]/g, '');
  if (!/^\d[\d.,]*$/.test(limpio)) return NaN;
  const conMiles = /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(limpio);
  return parseFloat(conMiles ? limpio.replace(/\./g, '').replace(',', '.') : limpio.replace(',', '.'));
}

// Una línea por plato: "[cantidad] nombre precio-unitario".
// Ej.: "2 hamburguesa 30000", "papas fritas $10.000", "3x cerveza 4500".
export function parsearConsumos(texto) {
  const items = [];
  const invalidas = [];
  texto.split('\n').forEach((linea) => {
    const l = linea.trim();
    if (!l) return;
    const m = l.match(/^(?:(\d+)\s*[x×]?\s+)?(.+?)\s+(\$?\s*\d[\d.,]*)$/i);
    const precio = m ? parsearPrecio(m[3]) : NaN;
    if (!m || !(precio >= 0) || !m[2].trim()) {
      invalidas.push(l);
      return;
    }
    items.push({ nombre: m[2].trim(), cantidad: parseInt(m[1], 10) || 1, valorUnitario: precio });
  });
  return { items, invalidas };
}
