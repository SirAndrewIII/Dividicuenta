import { MAX_TEXTO, aMonto, esCantidadValida, esMontoValido, montoOCero, parsearPrecio } from './validacion';

// La gramática de importes vive en validacion.js; se reexporta por compatibilidad.
export { parsearPrecio };

// Funciones puras de reparto. Trabajan en centavos enteros para que la suma
// de las partes siempre coincida exactamente con el total.

// Un valor no finito (NaN, Infinity) cuenta como 0 en lugar de contagiar a todo el cálculo.
// Acepta números o texto de importe (se interpreta con la misma gramática que los campos).
const aCentavos = (n) => {
  const v = aMonto(n);
  return Number.isFinite(v) ? Math.round(v * 100) : 0;
};
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
      (acc, it) => acc + aCentavos((Number(it.cantidad) || 0) * montoOCero(it.valorUnitario)),
      0,
    ),
  );

  const compartido = comensales.map(() => 0);
  const detalle = comensales.map(() => []);
  // Gasto de platos compartidos que no se le cobra a nadie (sin participantes)
  let sinAsignar = 0;
  compartidos.forEach((plato, k) => {
    const participantes = plato.comensalesIds.filter((id) => posicion.has(id));
    const n = participantes.length;
    const totalC = aCentavos(plato.valorTotal);
    if (n === 0) {
      sinAsignar += totalC;
      return;
    }
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
    sinAsignar: aPesos(sinAsignar),
  };
}

// Valida y limpia el menú que devuelve la IA: descarta lo que no tenga la
// forma esperada. Devuelve null si no queda ningún plato utilizable.
// Un precio solo es válido si llega como número o como texto numérico («8500»,
// «8500.5»). `null`, `true`, `''` o `[]` no son precios: Number(null) valdría 0
// y un plato de precio desconocido aparecería como gratis.
export function precioDeLaIA(valor) {
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string' && /^\d+(\.\d{1,2})?$/.test(valor.trim())) return Number(valor.trim());
  return NaN;
}

export function normalizarMenu(menu) {
  if (!menu || !Array.isArray(menu.categorias)) return null;
  const categorias = menu.categorias
    .map((cat) => ({
      nombre_categoria: String((cat && cat.nombre_categoria) || 'Otros'),
      items: (Array.isArray(cat && cat.items) ? cat.items : [])
        .map((it) => ({
          nombre: typeof (it && it.nombre) === 'string' ? it.nombre.trim() : '',
          descripcion: it && typeof it.descripcion === 'string' ? it.descripcion : '',
          precio: precioDeLaIA(it && it.precio),
        }))
        .filter((it) => it.nombre && esMontoValido(it.precio)),
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

// Hasta este número de personas con saldo se calcula el óptimo exacto (2^16 subconjuntos).
const MAX_PERSONAS_EXACTO = 16;

// Parte a las personas con saldo en el máximo de grupos disjuntos que suman
// cero. Cada grupo se salda por dentro con (tamaño - 1) transferencias, así que
// la cantidad total es n menos el número de grupos: maximizar grupos = minimizar
// transferencias.
function gruposDeSumaCero(saldos) {
  const n = saldos.length;
  if (n > MAX_PERSONAS_EXACTO) return [saldos];

  const total = 1 << n;
  const suma = new Float64Array(total);
  const mejor = new Int8Array(total);
  const padre = new Int8Array(total);
  for (let m = 1; m < total; m++) {
    const bajo = 31 - Math.clz32(m & -m);
    suma[m] = suma[m & (m - 1)] + saldos[bajo].c;
    let top = -1;
    for (let i = 0; i < n; i++) {
      if (m & (1 << i) && mejor[m ^ (1 << i)] > top) {
        top = mejor[m ^ (1 << i)];
        padre[m] = i;
      }
    }
    mejor[m] = top + (suma[m] === 0 ? 1 : 0);
  }

  // Reconstruye un orden de inclusión y corta donde la suma acumulada vuelve a cero
  const orden = [];
  for (let m = total - 1; m; m ^= 1 << padre[m]) orden.push(padre[m]);
  orden.reverse();

  const grupos = [];
  let actual = [];
  let acumulado = 0;
  for (const i of orden) {
    actual.push(saldos[i]);
    acumulado += saldos[i].c;
    if (acumulado === 0) {
      grupos.push(actual);
      actual = [];
    }
  }
  if (actual.length > 0) grupos.push(actual); // saldos que no cierran (entradas inconsistentes)
  return grupos;
}

// Salda un grupo cruzando el mayor deudor con el mayor acreedor.
function saldarGrupo(grupo) {
  const deudores = grupo.filter((p) => p.c < 0).map((p) => ({ nombre: p.nombre, c: -p.c }));
  const acreedores = grupo.filter((p) => p.c > 0).map((p) => ({ nombre: p.nombre, c: p.c }));
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

// Dado cuánto pagó cada uno y cuánto le corresponde, calcula la menor cantidad
// de transferencias que deja todo en cero (óptimo exacto hasta 16 personas con
// saldo; más allá, cruza mayor deudor con mayor acreedor).
export function saldarDeudas(personas) {
  const saldos = personas
    .map(({ nombre, pagado, corresponde }) => ({ nombre, c: aCentavos(pagado) - aCentavos(corresponde) }))
    .filter((p) => p.c !== 0);
  // Orden estable: de mayor a menor monto y, a igualdad, según el orden de la lista
  const posicion = (nombre) => personas.findIndex((p) => p.nombre === nombre);
  return gruposDeSumaCero(saldos)
    .flatMap(saldarGrupo)
    .sort((x, y) => y.monto - x.monto || posicion(x.de) - posicion(y.de) || posicion(x.a) - posicion(y.a));
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

// Una línea por plato: "[cantidad] nombre precio-unitario".
// Ej.: "2 hamburguesa 30000", "papas fritas $10.000", "3x cerveza 4500".
// Las líneas con cantidad o precio fuera de los límites van a `invalidas`.
export function parsearConsumos(texto) {
  const items = [];
  const invalidas = [];
  texto.split('\n').forEach((linea) => {
    const l = linea.trim();
    if (!l) return;
    const m = l.match(/^(?:(\d+)\s*[x×]?\s+)?(.+?)\s+(\$?\s*\d[\d.,]*)$/i);
    const precio = m ? parsearPrecio(m[3]) : NaN;
    const cantidad = m && m[1] !== undefined ? parseInt(m[1], 10) : 1;
    if (!m || !m[2].trim() || !esMontoValido(precio) || !esCantidadValida(cantidad)) {
      invalidas.push(l);
      return;
    }
    items.push({ nombre: m[2].trim().slice(0, MAX_TEXTO), cantidad, valorUnitario: precio });
  });
  return { items, invalidas };
}
