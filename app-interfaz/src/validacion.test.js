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
  aMonto,
  montoOCero,
  sanearComensales,
  sanearCompartidos,
  sanearPropina,
} from './validacion';

describe('errorDeMonto (gramática única de importes)', () => {
  it('vacío no es error (todavía no se escribió nada)', () => {
    ['', '   ', null, undefined].forEach((v) => expect(errorDeMonto(v, 'El precio')).toBeNull());
  });

  it.each(['0', '8500', '8500.5', '8500,5', '8500,50', '1.500', '10.000', '$ 4.500', '1.234.567,89', 8500, 8500.55, 0, MAX_MONTO, '1000000000'])(
    '%j es válido',
    (valor) => {
      expect(errorDeMonto(valor, 'El precio')).toBeNull();
    },
  );

  it.each([
    ['-1', 'El precio no puede ser negativo.'],
    ['-0,01', 'El precio no puede ser negativo.'],
    [-5, 'El precio no puede ser negativo.'],
    ['1000000001', 'El precio es demasiado alto.'],
    [MAX_MONTO + 1, 'El precio es demasiado alto.'],
    [10.005, 'El precio admite hasta 2 decimales.'],
    [Infinity, 'El precio no es un número válido.'],
    [NaN, 'El precio no es un número válido.'],
  ])('%j -> %s', (valor, mensaje) => {
    expect(errorDeMonto(valor, 'El precio')).toBe(mensaje);
  });

  it.each(['abc', '1e999', '12.34.56', '1..2', '1,2,3', '1,500', '1.5.000', '10,555', '1.50.0', ',5', '.5'])(
    '«%s» es ambiguo o inválido y el mensaje enseña el formato',
    (valor) => {
      const mensaje = errorDeMonto(valor, 'El precio');
      expect(mensaje).toContain('El precio no es válido.');
      expect(mensaje).toContain('1500, 1.500 o 1500,50');
    },
  );
});

describe('aMonto y montoOCero', () => {
  it('el texto se interpreta con la misma gramática en todos los campos', () => {
    expect(aMonto('1.500')).toBe(1500);
    expect(aMonto('1,5')).toBe(1.5);
    expect(aMonto('4500,50')).toBe(4500.5);
    expect(aMonto(8500)).toBe(8500);
    ['', '  ', null, undefined, 'abc', {}, []].forEach((v) => expect(aMonto(v)).toBeNaN());
  });

  it('montoOCero convierte lo inválido en 0 para poder sumar', () => {
    expect(montoOCero('1.500')).toBe(1500);
    expect(montoOCero('abc')).toBe(0);
    expect(montoOCero('')).toBe(0);
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

describe('saneado de lo guardado: solo la estructura, nunca los importes', () => {
  it('comensales: conserva los valores fuera de rango para que se muestren y se marquen (P1)', () => {
    const limpio = sanearComensales([
      { id: 1, nombre: 'x'.repeat(100), items: [{ id: 2, nombre: 'Plato', cantidad: 150, valorUnitario: 2000000000 }, { id: 3, nombre: 'Otro', cantidad: -3, valorUnitario: '12.34.56' }, { id: 5, nombre: 'Medio', cantidad: 2.5, valorUnitario: 'abc' }, { nombre: 'sin id' }, null] },
      { nombre: 'sin id' },
      { id: 4, nombre: 'Sin items' },
      null,
    ]);
    expect(limpio).toHaveLength(2);
    expect(limpio[0].nombre).toHaveLength(MAX_NOMBRE);
    expect(limpio[0].items).toEqual([
      { id: 2, nombre: 'Plato', cantidad: 150, valorUnitario: 2000000000 },
      { id: 3, nombre: 'Otro', cantidad: -3, valorUnitario: '12.34.56' },
      { id: 5, nombre: 'Medio', cantidad: 2.5, valorUnitario: 'abc' },
    ]);
    expect(limpio[1]).toEqual({ id: 4, nombre: 'Sin items', items: [] });
  });

  it('lo que no se puede mostrar (nulo, objetos) vuelve al valor por defecto', () => {
    const [c] = sanearComensales([{ id: 1, nombre: 'A', items: [{ id: 2, nombre: 'P', cantidad: null, valorUnitario: {} }] }]);
    expect(c.items[0]).toMatchObject({ cantidad: 1, valorUnitario: 0 });
  });

  it('lo que no es una lista queda vacío', () => {
    [{}, 'texto', 7, null].forEach((v) => {
      expect(sanearComensales(v)).toEqual([]);
      expect(sanearCompartidos(v)).toEqual([]);
    });
  });

  it('compartidos: conserva el valor y limpia solo los participantes', () => {
    expect(sanearCompartidos([{ id: 1, nombre: 'Vino', valorTotal: -5, comensalesIds: [1, 'x', null, 2] }])).toEqual([
      { id: 1, nombre: 'Vino', valorTotal: -5, comensalesIds: [1, 2] },
    ]);
    expect(sanearCompartidos([{ id: 1, nombre: 'Vino', valorTotal: '1.500', comensalesIds: [] }])[0].valorTotal).toBe('1.500');
    expect(sanearCompartidos([{ id: 1, nombre: 'Vino', valorTotal: null, comensalesIds: [] }])[0].valorTotal).toBe(0);
  });

  it('propina: se conserva aunque esté fuera de 0 a 100; solo lo que no es un número vuelve al valor por defecto', () => {
    expect(sanearPropina(15)).toBe(15);
    expect(sanearPropina('7.5')).toBe('7.5');
    expect(sanearPropina('')).toBe('');
    expect(sanearPropina(500)).toBe(500);
    expect(sanearPropina(-1)).toBe(-1);
    [null, undefined, 'abc', NaN, {}].forEach((v) => expect(sanearPropina(v)).toBe(10));
    expect(sanearPropina('abc', 0)).toBe(0);
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
