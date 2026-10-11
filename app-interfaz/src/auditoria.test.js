// Casos reproducidos en la auditoría de ChatGPT (H02, H03, H16, N03, N04) como pruebas unitarias.
import { describe, expect, it } from 'vitest';
import {
  calcularCuentaPorConsumo,
  dividirIgual,
  normalizarMenu,
  parsearConsumos,
  parsearPrecio,
  precioDeLaIA,
  saldarDeudas,
} from './calculos';
import { mensajeConsumo, mensajeIngresos } from './mensajes';

describe('H03: precios mal formados ya no se aceptan', () => {
  it.each([
    ['4500', 4500],
    ['$4500', 4500],
    ['4500,50', 4500.5],
    ['4500.50', 4500.5],
    ['12.5', 12.5],
    ['0,5', 0.5],
    ['1.500', 1500],
    ['10.000', 10000],
    ['$ 10.000', 10000],
    ['1.234.567,89', 1234567.89],
    ['12.345', 12345], // en es-AR el punto seguido de 3 dígitos es separador de miles
    ['100.000.000', 100000000],
  ])('%s es un precio válido', (texto, esperado) => {
    expect(parsearPrecio(texto)).toBe(esperado);
  });

  it.each(['12.34.56', '1..2', '1,2,3', '1.5.000', '1,500', '0.500', '1.50.0', '.5', '1.', ',5', '', 'abc', '1e5', '-5'])(
    '%s es ambiguo o inválido y se rechaza',
    (texto) => {
      expect(parsearPrecio(texto)).toBeNaN();
    },
  );

  it('una línea con un precio mal formado va a las inválidas, no se registra con otro valor', () => {
    const { items, invalidas } = parsearConsumos('pizza 12.34.56\npizza 1..2\npizza 1,2,3\nflan 1.500');
    expect(items).toEqual([{ nombre: 'flan', cantidad: 1, valorUnitario: 1500 }]);
    expect(invalidas).toEqual(['pizza 12.34.56', 'pizza 1..2', 'pizza 1,2,3']);
  });
});

describe('N03: un precio desconocido de la IA no se muestra como gratis', () => {
  const precio = (p) => normalizarMenu({ categorias: [{ nombre_categoria: 'A', items: [{ nombre: 'Flan', precio: p }] }] });

  it.each([null, undefined, true, false, '', [], {}, 'abc', '1,500', -1, Infinity, NaN])('%j descarta el plato', (valor) => {
    expect(precio(valor)).toBeNull();
  });

  it('acepta números y texto numérico simple', () => {
    expect(precioDeLaIA(8500)).toBe(8500);
    expect(precioDeLaIA(0)).toBe(0);
    expect(precioDeLaIA('8500')).toBe(8500);
    expect(precioDeLaIA(' 8500.5 ')).toBe(8500.5);
    expect(precio('3000').categorias[0].items[0].precio).toBe(3000);
  });

  it('el nombre y la descripción deben ser texto', () => {
    const menu = normalizarMenu({
      categorias: [{ nombre_categoria: 'A', items: [{ nombre: 7, precio: 1 }, { nombre: 'Flan', precio: 1, descripcion: 9 }] }],
    });
    expect(menu.categorias[0].items).toEqual([{ nombre: 'Flan', descripcion: '', precio: 1 }]);
  });
});

describe('H02: platos compartidos sin participantes', () => {
  const ana = { id: 1, nombre: 'Ana', items: [] };

  it('el gasto que no se le cobra a nadie queda como sin asignar', () => {
    const cuenta = calcularCuentaPorConsumo(
      [ana],
      [
        { id: 7, nombre: 'Vino', valorTotal: 100, comensalesIds: [] },
        { id: 8, nombre: 'Entrada', valorTotal: 50.5, comensalesIds: [99] }, // 99 ya no existe
        { id: 9, nombre: 'Postre', valorTotal: 30, comensalesIds: [1] },
      ],
      0,
    );
    expect(cuenta.sinAsignar).toBe(150.5);
    expect(cuenta.total).toBe(30);
  });

  it('sin platos huérfanos no hay nada sin asignar', () => {
    expect(calcularCuentaPorConsumo([ana], [], 10).sinAsignar).toBe(0);
  });

  it('el mensaje de WhatsApp advierte lo que quedó sin asignar', () => {
    const calculado = { nombre: 'Ana', items: [], detalleCompartido: [], subtotal: 0, propinaValor: 0, total: 0 };
    expect(mensajeConsumo([calculado], 10, 0, 100)).toContain('Sin asignar (platos compartidos sin participantes): $100');
    expect(mensajeConsumo([calculado], 10, 0)).not.toContain('Sin asignar');
  });
});

describe('H16: los ingresos individuales son opcionales en el mensaje', () => {
  const datos = { motivo: '', total: 300, personas: [{ nombre: 'Ana' }], ingresos: [900000], montos: [300], porcentajes: [100], esfuerzo: 0.03 };

  it('por defecto no incluye el ingreso de cada persona', () => {
    const texto = mensajeIngresos(datos);
    expect(texto).toContain('• *Ana*: pone $300 (100.0%)');
    expect(texto).not.toContain('900.000');
  });

  it('incluye el ingreso si se pide', () => {
    expect(mensajeIngresos({ ...datos, incluirIngresos: true })).toContain('100.0% | ingresos $900.000');
  });
});

// Algoritmo exacto e independiente (clásico «min cash flow» con retroceso) para contrastar.
function minimoPorRetroceso(saldos) {
  const s = saldos.filter((x) => x !== 0);
  const resolver = (i) => {
    while (i < s.length && s[i] === 0) i++;
    if (i === s.length) return 0;
    let mejor = Infinity;
    for (let j = i + 1; j < s.length; j++) {
      if (s[i] * s[j] < 0) {
        s[j] += s[i];
        mejor = Math.min(mejor, 1 + resolver(i + 1));
        s[j] -= s[i];
      }
    }
    return mejor;
  };
  return resolver(0);
}

const aPersonas = (saldos) =>
  saldos.map((x, i) => ({ nombre: `P${i}`, pagado: x > 0 ? x : 0, corresponde: x < 0 ? -x : 0 }));

describe('N04: transferencias realmente mínimas', () => {
  it('el caso donde el algoritmo voraz usaba 7 y bastan 5', () => {
    const saldos = [4, -4, 5, 8, -10, 2, 6, -11];
    expect(saldarDeudas(aPersonas(saldos))).toHaveLength(5);
  });

  it('a mano: un acreedor y dos deudores necesitan 2 transferencias', () => {
    expect(saldarDeudas(aPersonas([6000, -3000, -3000]))).toEqual([
      { de: 'P1', a: 'P0', monto: 3000 },
      { de: 'P2', a: 'P0', monto: 3000 },
    ]);
  });

  it('saldos que ya se compensan de a pares no se mezclan', () => {
    expect(saldarDeudas(aPersonas([5, -5, 7, -7]))).toHaveLength(2);
  });

  it('coincide con un algoritmo exacto independiente y deja a todos en cero', () => {
    let semilla = 99;
    const rnd = () => (semilla = (semilla * 1664525 + 1013904223) % 4294967296) / 4294967296;
    for (let caso = 0; caso < 400; caso++) {
      const n = 3 + Math.floor(rnd() * 5); // 3 a 7 personas
      const saldos = Array.from({ length: n - 1 }, () => Math.round((rnd() - 0.5) * 20));
      saldos.push(-saldos.reduce((a, b) => a + b, 0));

      const transferencias = saldarDeudas(aPersonas(saldos));
      expect(transferencias).toHaveLength(minimoPorRetroceso(saldos));

      const balance = Object.fromEntries(saldos.map((x, i) => [`P${i}`, x * 100]));
      transferencias.forEach((t) => {
        balance[t.de] += Math.round(t.monto * 100);
        balance[t.a] -= Math.round(t.monto * 100);
      });
      Object.values(balance).forEach((v) => expect(Math.abs(v)).toBe(0));
    }
  });

  it('con 15 personas (el máximo) responde al instante', () => {
    const saldos = Array.from({ length: 14 }, (_, i) => (i % 2 ? -(i + 3) : i + 3));
    saldos.push(-saldos.reduce((a, b) => a + b, 0));
    const inicio = performance.now();
    const t = saldarDeudas(aPersonas(saldos));
    expect(performance.now() - inicio).toBeLessThan(1000);
    expect(t.length).toBeLessThanOrEqual(14);
  });

  it('las partes iguales siguen sumando el total', () => {
    expect(dividirIgual(100, 3).reduce((a, b) => a + b, 0)).toBeCloseTo(100, 10);
  });
});
