import { describe, expect, it } from 'vitest';
import {
  calcularCuentaPorConsumo,
  dividirIgual,
  dividirPorIngresos,
  formatoPesos,
  normalizarMenu,
  parsearConsumos,
  parsearPrecio,
  repartirProporcional,
  saldarDeudas,
} from './calculos';

const centavos = (arr) => arr.reduce((a, n) => a + Math.round(n * 100), 0);

// Generador pseudoaleatorio con semilla fija para que las pruebas sean estables.
function aleatorio(semilla) {
  let s = semilla;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('repartos', () => {
  it('100 entre 3 suma exactamente 100', () => {
    const partes = dividirIgual(100, 3);
    expect(partes).toEqual([33.34, 33.33, 33.33]);
    expect(centavos(partes)).toBe(10000);
  });

  it('sin personas o con pesos nulos devuelve ceros', () => {
    expect(dividirIgual(100, 0)).toEqual([]);
    expect(repartirProporcional(100, [0, 0])).toEqual([0, 0]);
  });

  it('según ingresos: mismo porcentaje de esfuerzo', () => {
    const { montos, porcentajes, esfuerzo } = dividirPorIngresos(300000, [1000000, 500000, 500000]);
    expect(montos).toEqual([150000, 75000, 75000]);
    expect(porcentajes).toEqual([50, 25, 25]);
    expect(esfuerzo).toBe(15);
  });

  it('la suma siempre coincide con el total (casos aleatorios)', () => {
    const rnd = aleatorio(42);
    for (let i = 0; i < 500; i++) {
      const total = Math.round(rnd() * 1000000) / 100;
      const pesos = Array.from({ length: 1 + Math.floor(rnd() * 12) }, () => 1 + Math.floor(rnd() * 1000));
      expect(centavos(repartirProporcional(total, pesos))).toBe(Math.round(total * 100));
    }
  });
});

describe('saldarDeudas', () => {
  it('uno pagó todo: los demás le transfieren', () => {
    const t = saldarDeudas([
      { nombre: 'A', pagado: 9000, corresponde: 3000 },
      { nombre: 'B', pagado: 0, corresponde: 3000 },
      { nombre: 'C', pagado: 0, corresponde: 3000 },
    ]);
    expect(t).toEqual([
      { de: 'B', a: 'A', monto: 3000 },
      { de: 'C', a: 'A', monto: 3000 },
    ]);
  });

  it('si están a mano no hay transferencias', () => {
    expect(saldarDeudas([{ nombre: 'A', pagado: 100, corresponde: 100 }])).toEqual([]);
  });

  it('las transferencias dejan a todos en cero (casos aleatorios)', () => {
    const rnd = aleatorio(7);
    for (let i = 0; i < 200; i++) {
      const n = 2 + Math.floor(rnd() * 6);
      const pagos = Array.from({ length: n }, () => Math.round(rnd() * 100000) / 100);
      const total = pagos.reduce((a, b) => a + b, 0);
      const parte = dividirIgual(total, n);
      const personas = pagos.map((p, k) => ({ nombre: `P${k}`, pagado: p, corresponde: parte[k] }));
      const saldo = Object.fromEntries(personas.map((p) => [p.nombre, Math.round(p.pagado * 100) - Math.round(p.corresponde * 100)]));
      saldarDeudas(personas).forEach((t) => {
        saldo[t.de] += Math.round(t.monto * 100);
        saldo[t.a] -= Math.round(t.monto * 100);
      });
      Object.values(saldo).forEach((v) => expect(v).toBe(0));
    }
  });
});

describe('calcularCuentaPorConsumo (BL-1)', () => {
  const diner = (id, items = []) => ({ id, nombre: `D${id}`, items });
  const item = (cantidad, valorUnitario) => ({ cantidad, valorUnitario });

  it('el caso de la auditoría: 100 entre 3 con 10 % de propina suma 110', () => {
    const comensales = [diner(1), diner(2), diner(3)];
    const compartidos = [{ id: 9, nombre: 'Picada', valorTotal: 100, comensalesIds: [1, 2, 3] }];
    const r = calcularCuentaPorConsumo(comensales, compartidos, 10);
    expect(r.total).toBe(110);
    expect(centavos(r.porComensal.map((c) => c.total))).toBe(11000);
  });

  it('suma consumos individuales y compartidos, con propina proporcional', () => {
    const comensales = [diner(1, [item(2, 1000)]), diner(2, [item(1, 500)])];
    const compartidos = [{ id: 9, nombre: 'Vino', valorTotal: 600, comensalesIds: [1, 2] }];
    const r = calcularCuentaPorConsumo(comensales, compartidos, 10);
    expect(r.porComensal[0]).toMatchObject({ subtotalIndividual: 2000, subtotalCompartido: 300, subtotal: 2300, propinaValor: 230, total: 2530 });
    expect(r.porComensal[1]).toMatchObject({ subtotal: 800, propinaValor: 80, total: 880 });
    expect(r.total).toBe(3410);
  });

  it('el centavo sobrante rota entre platos compartidos', () => {
    const comensales = [diner(1), diner(2)];
    const compartidos = [
      { id: 1, nombre: 'A', valorTotal: 0.01, comensalesIds: [1, 2] },
      { id: 2, nombre: 'B', valorTotal: 0.01, comensalesIds: [1, 2] },
    ];
    const r = calcularCuentaPorConsumo(comensales, compartidos, 0);
    expect(r.porComensal.map((c) => c.subtotal)).toEqual([0.01, 0.01]);
  });

  it('ignora participantes eliminados y platos sin participantes', () => {
    const comensales = [diner(1)];
    const compartidos = [
      { id: 1, nombre: 'Huérfano', valorTotal: 500, comensalesIds: [99] },
      { id: 2, nombre: 'Mío', valorTotal: 200, comensalesIds: [1, 99] },
    ];
    const r = calcularCuentaPorConsumo(comensales, compartidos, 0);
    expect(r.total).toBe(200);
  });

  it('propina vacía o inválida cuenta como 0 y sin comensales no rompe', () => {
    expect(calcularCuentaPorConsumo([diner(1, [item(1, 100)])], [], '').total).toBe(100);
    expect(calcularCuentaPorConsumo([], [], 10).total).toBe(0);
  });

  it('cantidades vacías o precios no numéricos no producen NaN', () => {
    const r = calcularCuentaPorConsumo([diner(1, [item('', 100), item(2, '')])], [], 10);
    expect(r.total).toBe(0);
  });

  it('los totales por persona suman el total (casos aleatorios)', () => {
    const rnd = aleatorio(2026);
    for (let caso = 0; caso < 300; caso++) {
      const n = 1 + Math.floor(rnd() * 8);
      const comensales = Array.from({ length: n }, (_, i) =>
        diner(i + 1, Array.from({ length: Math.floor(rnd() * 4) }, () => item(1 + Math.floor(rnd() * 3), Math.round(rnd() * 500000) / 100))),
      );
      const compartidos = Array.from({ length: Math.floor(rnd() * 4) }, (_, k) => ({
        id: 100 + k,
        nombre: `C${k}`,
        valorTotal: Math.round(rnd() * 500000) / 100,
        comensalesIds: comensales.filter(() => rnd() > 0.3).map((c) => c.id),
      }));
      const propina = Math.floor(rnd() * 31);
      const r = calcularCuentaPorConsumo(comensales, compartidos, propina);
      expect(centavos(r.porComensal.map((c) => c.total))).toBe(Math.round(r.total * 100));
      expect(centavos(r.porComensal.map((c) => c.propinaValor))).toBe(Math.round(r.totalPropina * 100));
    }
  });
});

describe('parser de consumos', () => {
  it('interpreta cantidad opcional, $, miles y decimales', () => {
    const { items, invalidas } = parsearConsumos('2 hamburguesa 30000\npapas fritas $10.000\n3x cerveza 4500\n7up 2000\nempanada 1.500,50\nsolo texto');
    expect(items).toEqual([
      { nombre: 'hamburguesa', cantidad: 2, valorUnitario: 30000 },
      { nombre: 'papas fritas', cantidad: 1, valorUnitario: 10000 },
      { nombre: 'cerveza', cantidad: 3, valorUnitario: 4500 },
      { nombre: '7up', cantidad: 1, valorUnitario: 2000 },
      { nombre: 'empanada', cantidad: 1, valorUnitario: 1500.5 },
    ]);
    expect(invalidas).toEqual(['solo texto']);
  });

  it('parsearPrecio rechaza texto', () => {
    expect(parsearPrecio('abc')).toBeNaN();
    expect(parsearPrecio('$1.234')).toBe(1234);
  });
});

describe('normalizarMenu (FE-2)', () => {
  it('descarta categorías e ítems con forma inválida', () => {
    const menu = normalizarMenu({
      categorias: [
        { nombre_categoria: 'Platos', items: [{ nombre: 'Milanesa', precio: '8500' }, { nombre: '', precio: 1 }, { nombre: 'X', precio: 'gratis' }] },
        { nombre_categoria: 'Sin ítems' },
        null,
      ],
    });
    expect(menu).toEqual({ categorias: [{ nombre_categoria: 'Platos', items: [{ nombre: 'Milanesa', descripcion: '', precio: 8500 }] }] });
  });

  it('devuelve null si no queda nada utilizable', () => {
    expect(normalizarMenu(null)).toBeNull();
    expect(normalizarMenu({})).toBeNull();
    expect(normalizarMenu({ categorias: [{ items: [] }] })).toBeNull();
  });
});

describe('formatoPesos (FE-3)', () => {
  it('usa es-AR: sin decimales si es entero y 2 si hay centavos', () => {
    expect(formatoPesos(10000)).toBe('$10.000');
    expect(formatoPesos(33.34)).toBe('$33,34');
    expect(formatoPesos(1500)).toBe('$1.500');
    expect(formatoPesos(1500.5)).toBe('$1.500,50');
    expect(formatoPesos(0)).toBe('$0');
    expect(formatoPesos('x')).toBe('$0');
  });
});
