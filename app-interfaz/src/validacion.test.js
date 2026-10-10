import { describe, expect, it } from 'vitest';
import { calcularCuentaPorConsumo, dividirIgual, parsearConsumos } from './calculos';
import { sanearPersonas } from './personas';
import {
  MAX_CANTIDAD,
  MAX_MONTO,
  MAX_NOMBRE,
  errorDeCantidad,
  errorDeMonto,
  esCantidadValida,
  esMontoValido,
  sanearComensales,
  sanearCompartidos,
  sanearPropina,
} from './validacion';

describe('errorDeMonto', () => {
  it('vacío no es error (todavía no se escribió nada)', () => {
    expect(errorDeMonto('', 'El precio')).toBeNull();
    expect(errorDeMonto(null, 'El precio')).toBeNull();
    expect(errorDeMonto(undefined, 'El precio')).toBeNull();
  });

  it('acepta de 0 al máximo', () => {
    expect(errorDeMonto('0', 'El precio')).toBeNull();
    expect(errorDeMonto('8500.5', 'El precio')).toBeNull();
    expect(errorDeMonto(MAX_MONTO, 'El precio')).toBeNull();
  });

  it.each([
    ['-1', 'El precio no puede ser negativo.'],
    ['-0.01', 'El precio no puede ser negativo.'],
    [String(MAX_MONTO + 1), 'El precio es demasiado alto.'],
    ['1e999', 'El precio no es un número válido.'],
    ['abc', 'El precio no es un número válido.'],
    [Infinity, 'El precio no es un número válido.'],
    [NaN, 'El precio no es un número válido.'],
  ])('rechaza %s', (valor, mensaje) => {
    expect(errorDeMonto(valor, 'El precio')).toBe(mensaje);
  });
});

describe('cantidades y montos', () => {
  it('la cantidad es un entero de 1 al máximo', () => {
    [1, 2, MAX_CANTIDAD].forEach((n) => expect(esCantidadValida(n)).toBe(true));
    [0, -1, 1.5, MAX_CANTIDAD + 1, NaN, Infinity].forEach((n) => expect(esCantidadValida(n)).toBe(false));
    expect(errorDeCantidad(0)).toContain('entre 1 y 99');
    expect(errorDeCantidad(3)).toBeNull();
  });

  it('el monto es finito, no negativo y no supera el máximo', () => {
    [0, 0.5, MAX_MONTO].forEach((n) => expect(esMontoValido(n)).toBe(true));
    [-1, MAX_MONTO + 1, NaN, Infinity].forEach((n) => expect(esMontoValido(n)).toBe(false));
  });
});

describe('parser de platos con límites (BL-2)', () => {
  it('cantidad 0 ya no se convierte en 1: la línea es inválida', () => {
    expect(parsearConsumos('0 cerveza 4500')).toEqual({ items: [], invalidas: ['0 cerveza 4500'] });
  });

  it('rechaza cantidades y precios fuera de límites', () => {
    const { items, invalidas } = parsearConsumos(
      ['100 papas 10', '1000000 papas 10', 'x 99999999999999999999', 'torta 1e999', '2 cerveza -4500'].join('\n'),
    );
    expect(items).toEqual([]);
    expect(invalidas).toHaveLength(5);
  });

  it('acepta el precio 0 (cortesía) y las cantidades límite', () => {
    const { items } = parsearConsumos('agua 0\n99 empanada 100\n1 flan 3000');
    expect(items.map((i) => [i.nombre, i.cantidad, i.valorUnitario])).toEqual([
      ['agua', 1, 0],
      ['empanada', 99, 100],
      ['flan', 1, 3000],
    ]);
  });

  it('recorta nombres demasiado largos', () => {
    const { items } = parsearConsumos(`${'a'.repeat(200)} 100`);
    expect(items[0].nombre).toHaveLength(60);
  });
});

describe('los cálculos no se contagian de valores no finitos', () => {
  it('un precio Infinity o NaN cuenta como 0 en lugar de dar NaN', () => {
    const comensales = [{ id: 1, nombre: 'A', items: [{ cantidad: 1, valorUnitario: Infinity }, { cantidad: 1, valorUnitario: 1000 }] }];
    expect(calcularCuentaPorConsumo(comensales, [], 10).total).toBe(1100);
    expect(dividirIgual(NaN, 3)).toEqual([0, 0, 0]);
  });
});

describe('saneado de lo guardado en el navegador', () => {
  it('comensales: corrige cantidades y precios inválidos y descarta lo que no sirve', () => {
    const limpio = sanearComensales([
      { id: 1, nombre: 'x'.repeat(100), items: [{ id: 2, nombre: 'Plato', cantidad: -3, valorUnitario: 'abc' }, { id: 3, nombre: 'Otro', cantidad: 2.5, valorUnitario: -10 }, { nombre: 'sin id' }, null] },
      { nombre: 'sin id' },
      { id: 4, nombre: 'Sin items' },
      null,
    ]);
    expect(limpio).toHaveLength(2);
    expect(limpio[0].nombre).toHaveLength(MAX_NOMBRE);
    expect(limpio[0].items).toEqual([
      { id: 2, nombre: 'Plato', cantidad: 1, valorUnitario: 0 },
      { id: 3, nombre: 'Otro', cantidad: 1, valorUnitario: 0 },
    ]);
    expect(limpio[1]).toEqual({ id: 4, nombre: 'Sin items', items: [] });
  });

  it('lo que no es una lista queda vacío', () => {
    [{}, 'texto', 7, null].forEach((v) => {
      expect(sanearComensales(v)).toEqual([]);
      expect(sanearCompartidos(v)).toEqual([]);
    });
  });

  it('compartidos: corrige el valor y los participantes', () => {
    expect(sanearCompartidos([{ id: 1, nombre: 'Vino', valorTotal: -5, comensalesIds: [1, 'x', null, 2] }])).toEqual([
      { id: 1, nombre: 'Vino', valorTotal: 0, comensalesIds: [1, 2] },
    ]);
  });

  it('propina: 0 a 100, vacío se respeta y lo demás vuelve al valor por defecto', () => {
    expect(sanearPropina(15)).toBe(15);
    expect(sanearPropina('7.5')).toBe(7.5);
    expect(sanearPropina('')).toBe('');
    [500, -1, 'abc', null, NaN].forEach((v) => expect(sanearPropina(v)).toBe(10));
    expect(sanearPropina(500, 0)).toBe(0);
  });

  it('personas: vuelve a la lista inicial si lo guardado no sirve', () => {
    const inicial = (v) => sanearPersonas(v).map((p) => p.nombre);
    expect(inicial('x')).toEqual(['Persona 1', 'Persona 2']);
    expect(inicial([{ id: 1, nombre: 'Sola' }])).toEqual(['Persona 1', 'Persona 2']);
    expect(inicial(Array.from({ length: 16 }, (_, i) => ({ id: i, nombre: 'P' })))).toEqual(['Persona 1', 'Persona 2']);
    expect(sanearPersonas([{ id: 1, nombre: 'Ana', valor: 5 }, { id: 2, nombre: 'Beto', valor: {} }])).toEqual([
      { id: 1, nombre: 'Ana', valor: '5' },
      { id: 2, nombre: 'Beto', valor: '' },
    ]);
  });
});
