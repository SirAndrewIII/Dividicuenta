// Auditoría 3, P2 y P4: un mismo texto de importe vale lo mismo en todos los campos y modos,
// y el mensaje de ingresos no permite despejar el sueldo.
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import { dividirPorIngresos } from './calculos';
import { mensajeIngresos } from './mensajes';

const preparar = async (nombres = ['Ana']) => {
  const user = userEvent.setup();
  render(<App />);
  const campo = screen.getByRole('textbox', { name: 'Nombre del comensal' });
  for (const nombre of nombres) await user.type(campo, `${nombre}{Enter}`);
  return user;
};

const irA = (user, nombre) => user.click(screen.getByRole('tab', { name: nombre }));
const alertas = () => screen.queryAllByRole('alert').map((a) => a.textContent);

async function agregarPlato(user, nombre, precio) {
  await user.type(screen.getByRole('textbox', { name: 'Nombre del plato' }), nombre);
  await user.type(screen.getByRole('textbox', { name: 'Precio del plato' }), precio);
  await user.click(screen.getByRole('button', { name: 'Añadir plato' }));
}

describe('P2: el campo de precio de un plato usa la gramática de importes', () => {
  it.each([
    ['1.500', '1500'],
    ['1500', '1500'],
    ['4500,50', '4500.5'],
    ['4500.50', '4500.5'],
    ['1,5', '1.5'],
    ['$ 10.000', '10000'],
    ['1.234.567,89', '1234567.89'],
  ])('«%s» se guarda como %s (igual que por lote)', async (escrito, guardado) => {
    const user = await preparar();
    await agregarPlato(user, 'Pizza', escrito);
    expect(alertas()).toEqual([]);
    expect(screen.getByRole('textbox', { name: 'Precio unitario de Pizza' }).value).toBe(guardado);
  });

  it.each(['12.34.56', '1..2', '1,2,3', '1,500', '10,555', 'abc'])('«%s» se rechaza con el formato válido y no se agrega', async (escrito) => {
    const user = await preparar();
    await agregarPlato(user, 'Pizza', escrito);
    expect(alertas()[0]).toContain('El precio no es válido.');
    expect(alertas()[0]).toContain('1500, 1.500 o 1500,50');
    expect(screen.queryByRole('textbox', { name: /Precio unitario de/ })).toBeNull();
  });

  it('«1.500» da el mismo total por el campo que por el lote', async () => {
    const user = await preparar();
    await agregarPlato(user, 'Pizza', '1.500');
    const totalCampo = screen.getAllByText('$1.650'); // 1.500 + 10 % de propina (comensal y gran total)
    expect(totalCampo.length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Eliminar Pizza de Ana' }));

    await user.click(screen.getByRole('button', { name: 'Varios platos' }));
    await user.type(screen.getByRole('textbox', { name: 'Platos, uno por línea' }), 'pizza 1.500');
    await user.click(screen.getByRole('button', { name: 'Añadir platos' }));
    expect(screen.getAllByText('$1.650').length).toBeGreaterThan(0);
  });

  it('editar el precio de un plato ya cargado usa la misma gramática', async () => {
    const user = await preparar();
    await agregarPlato(user, 'Pizza', '100');
    const precio = screen.getByRole('textbox', { name: 'Precio unitario de Pizza' });

    await user.clear(precio);
    await user.type(precio, '1.500');
    expect(alertas()).toEqual([]);
    expect(screen.getAllByText('$1.650').length).toBeGreaterThan(0);

    await user.clear(precio);
    await user.type(precio, '12.34.56');
    expect(alertas().some((a) => a.includes('El precio no es válido.'))).toBe(true);
    expect(screen.getByText(/Hay valores fuera de rango/)).toBeTruthy();
  });

  it('el valor de un plato compartido también', async () => {
    const user = await preparar(['Ana']);
    await user.type(screen.getByRole('textbox', { name: 'Nombre del plato compartido' }), 'Vino');
    await user.type(screen.getByRole('textbox', { name: 'Valor total del plato compartido' }), '1.500');
    await user.click(screen.getByRole('checkbox', { name: 'Ana' }));
    await user.click(screen.getByRole('button', { name: 'Registrar compartido' }));
    expect(alertas()).toEqual([]);
    expect(screen.getByText('($1.500)')).toBeTruthy();
  });
});

describe('P2: los demás modos usan la misma gramática y límite de decimales', () => {
  it('Partes iguales: «1.500» son mil quinientos pesos', async () => {
    const user = await preparar();
    await irA(user, /Partes iguales/);
    await user.type(screen.getByRole('textbox', { name: 'Total de la cuenta' }), '1.500');
    expect(alertas()).toEqual([]);
    expect(screen.getAllByText('$750').length).toBe(2); // entre las 2 personas
  });

  it('Partes iguales: más de 2 decimales se rechaza', async () => {
    const user = await preparar();
    await irA(user, /Partes iguales/);
    await user.type(screen.getByRole('textbox', { name: 'Total de la cuenta' }), '10,555');
    expect(alertas()[0]).toContain('El total no es válido.');
  });

  it('Según ingresos: ingresos con separador de miles', async () => {
    const user = await preparar();
    await irA(user, /Según ingresos/);
    await user.type(screen.getByRole('textbox', { name: 'Gasto total' }), '300.000');
    await user.type(screen.getByRole('textbox', { name: 'Ingreso de Persona 1' }), '900.000');
    await user.type(screen.getByRole('textbox', { name: 'Ingreso de Persona 2' }), '300.000');
    expect(alertas()).toEqual([]);
    expect(screen.getByText('$225.000')).toBeTruthy();
    expect(screen.getByText('$75.000')).toBeTruthy();
  });

  it('Quién pagó qué: pagos con separador de miles', async () => {
    const user = await preparar();
    await irA(user, /Quién pagó qué/);
    await user.type(screen.getByRole('textbox', { name: 'Pagó de Persona 1' }), '9.000');
    await user.type(screen.getByRole('textbox', { name: 'Pagó de Persona 2' }), '3.000');
    expect(alertas()).toEqual([]);
    expect(screen.getByText('Persona 2 → Persona 1')).toBeTruthy();
    expect(screen.getByText('$3.000')).toBeTruthy();
  });

  it('un importe mal formado muestra el error en cada modo', async () => {
    const user = await preparar();
    await irA(user, /Según ingresos/);
    await user.type(screen.getByRole('textbox', { name: 'Ingreso de Persona 1' }), '12.34.56');
    expect(alertas()[0]).toContain('El ingreso de Persona 1 no es válido.');
    await irA(user, /Quién pagó qué/);
    await user.type(screen.getByRole('textbox', { name: 'Pagó de Persona 2' }), '1..2');
    expect(alertas().some((a) => a.includes('Lo que pagó Persona 2 no es válido.'))).toBe(true);
  });
});

describe('P4: el mensaje de ingresos no permite despejar el sueldo', () => {
  const datos = () => {
    const ingresos = [900000, 300000];
    const { montos, porcentajes, esfuerzo } = dividirPorIngresos(300000, ingresos);
    return { motivo: '', total: 300000, personas: [{ nombre: 'Ana' }, { nombre: 'Beto' }], ingresos, montos, porcentajes, esfuerzo };
  };

  it('sin la casilla no se incluye ni el ingreso ni el % de esfuerzo', () => {
    const texto = mensajeIngresos(datos());
    expect(texto).not.toContain('Esfuerzo');
    expect(texto).not.toContain('900.000');
    expect(texto).not.toMatch(/%\s+de lo que ganan/);
    // Con lo que queda (aportes y % de reparto) no se puede obtener el sueldo en pesos
    expect(texto).toContain('pone $225.000 (75.0%)');
    expect(texto).toContain('pone $75.000 (25.0%)');
  });

  it('con la casilla se incluyen los ingresos y el esfuerzo', () => {
    const texto = mensajeIngresos({ ...datos(), incluirIngresos: true });
    expect(texto).toContain('ingresos $900.000');
    expect(texto).toContain('Esfuerzo parejo: todos destinan el 25.0%');
  });

  it('en la pantalla el mensaje enviado sigue la casilla', async () => {
    const abrir = vi.spyOn(window, 'open').mockImplementation(() => null);
    const user = await preparar();
    await irA(user, /Según ingresos/);
    await user.type(screen.getByRole('textbox', { name: 'Gasto total' }), '300000');
    await user.type(screen.getByRole('textbox', { name: 'Ingreso de Persona 1' }), '900000');
    await user.type(screen.getByRole('textbox', { name: 'Ingreso de Persona 2' }), '300000');
    await user.click(screen.getByRole('button', { name: 'Enviar por WhatsApp' }));
    expect(decodeURIComponent(abrir.mock.calls[0][0].split('text=')[1])).not.toContain('Esfuerzo');

    await user.click(screen.getByRole('checkbox', { name: /Mostrar el ingreso de cada persona/ }));
    await user.click(screen.getByRole('button', { name: 'Enviar por WhatsApp' }));
    expect(decodeURIComponent(abrir.mock.calls[1][0].split('text=')[1])).toContain('Esfuerzo parejo');
  });
});
