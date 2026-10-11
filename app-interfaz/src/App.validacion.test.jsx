import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';

const preparar = async (nombres = ['Ana']) => {
  const user = userEvent.setup();
  const vista = render(<App />);
  const campo = screen.getByRole('textbox', { name: 'Nombre del comensal' });
  for (const nombre of nombres) await user.type(campo, `${nombre}{Enter}`);
  return { user, ...vista };
};

const plato = (user, nombre, precio) => async () => {
  const nombreCampo = screen.getByRole('textbox', { name: 'Nombre del plato' });
  const precioCampo = screen.getByRole('textbox', { name: 'Precio del plato' });
  if (nombre) await user.type(nombreCampo, nombre);
  if (precio !== undefined) await user.type(precioCampo, precio);
  await user.click(screen.getByRole('button', { name: 'Añadir plato' }));
};

const alerta = () => screen.getByRole('alert').textContent;
const platosCargados = () => screen.queryAllByRole('textbox', { name: /Nombre del plato de/ });

describe('plato individual', () => {
  it.each([
    ['precio negativo', 'Milanesa', '-500', 'El precio no puede ser negativo.'],
    ['precio demasiado alto', 'Milanesa', '2000000000', 'El precio es demasiado alto.'],
    ['precio vacío', 'Milanesa', undefined, 'Ingresa el precio del plato.'],
    ['nombre vacío', '', '500', 'Escribe el nombre del plato.'],
  ])('%s: muestra el motivo y no agrega nada', async (_caso, nombre, precio, mensaje) => {
    const { user } = await preparar();
    await plato(user, nombre, precio)();

    expect(alerta()).toBe(mensaje);
    expect(platosCargados()).toHaveLength(0);
  });

  it('el aviso se limpia al corregir el campo', async () => {
    const { user } = await preparar();
    await plato(user, 'Milanesa', '-5')();
    expect(screen.getByRole('alert')).toBeTruthy();

    await user.type(screen.getByRole('textbox', { name: 'Nombre del plato' }), 'x');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('el precio 0 se acepta (cortesía)', async () => {
    const { user } = await preparar();
    await plato(user, 'Agua de cortesía', '0')();

    expect(screen.queryByRole('alert')).toBeNull();
    expect(platosCargados()).toHaveLength(1);
  });
});

describe('varios platos', () => {
  it('descarta las líneas con cantidad 0, cantidad excesiva o precio negativo y agrega las válidas', async () => {
    const { user } = await preparar();
    await user.click(screen.getByRole('button', { name: 'Varios platos' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Platos, uno por línea' }),
      '0 cerveza 4500{Enter}100 papas 10{Enter}2 cerveza -4500{Enter}2 flan 500',
    );

    const aviso = screen.getByText(/No entendí estas líneas/).textContent;
    expect(aviso).toContain('0 cerveza 4500');
    expect(aviso).toContain('100 papas 10');
    expect(aviso).toContain('2 cerveza -4500');
    expect(aviso).not.toContain('flan');

    await user.click(screen.getByRole('button', { name: 'Añadir platos' }));
    expect(platosCargados()).toHaveLength(1);
  });
});

describe('edición de un plato ya cargado', () => {
  const cargarPlato = async () => {
    const ctx = await preparar();
    await plato(ctx.user, 'Milanesa', '8500')();
    return ctx;
  };
  const hayTotales = () => !!screen.queryByRole('button', { name: 'Enviar por WhatsApp' });
  const bloqueado = () => screen.getByText(/Hay valores fuera de rango/);

  it('una cantidad inválida se conserva, se marca y oculta los totales hasta corregirla (N02)', async () => {
    const { user } = await cargarPlato();
    const cantidad = screen.getByRole('spinbutton', { name: 'Cantidad de Milanesa' });
    expect(hayTotales()).toBe(true);

    await user.clear(cantidad);
    await user.type(cantidad, '0');
    expect(cantidad.value).toBe('0'); // lo escrito se mantiene
    expect(cantidad.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getAllByRole('alert').some((a) => a.textContent === 'La cantidad debe ser un número entero entre 1 y 99.')).toBe(true);
    expect(bloqueado()).toBeTruthy();
    expect(hayTotales()).toBe(false);

    await user.clear(cantidad);
    await user.type(cantidad, '3');
    expect(cantidad.getAttribute('aria-invalid')).toBe('false');
    expect(hayTotales()).toBe(true);
  });

  it('la cantidad vacía vuelve a 1 al salir del campo', async () => {
    const { user } = await cargarPlato();
    const cantidad = screen.getByRole('spinbutton', { name: 'Cantidad de Milanesa' });
    await user.clear(cantidad);
    await user.tab();
    expect(cantidad.value).toBe('1');
  });

  it('150 de cantidad no se transforma en 15: se conserva y se marca (N02)', async () => {
    const { user } = await cargarPlato();
    const cantidad = screen.getByRole('spinbutton', { name: 'Cantidad de Milanesa' });

    await user.clear(cantidad);
    await user.type(cantidad, '150');
    expect(cantidad.value).toBe('150');
    expect(hayTotales()).toBe(false);

    await user.clear(cantidad);
    await user.type(cantidad, '1.5');
    expect(cantidad.value).toBe('1.5');
    expect(hayTotales()).toBe(false);
  });

  it('un precio negativo se conserva y se marca; el vacío vuelve a 0', async () => {
    const { user } = await cargarPlato();
    const precio = screen.getByRole('textbox', { name: 'Precio unitario de Milanesa' });

    await user.clear(precio);
    await user.type(precio, '-3');
    expect(precio.value).toBe('-3');
    expect(screen.getAllByRole('alert').some((a) => a.textContent === 'El precio no puede ser negativo.')).toBe(true);
    expect(hayTotales()).toBe(false);

    await user.clear(precio);
    await user.tab();
    expect(precio.value).toBe('0');
    expect(hayTotales()).toBe(true);
  });

  it('la propina fuera de 0 a 100 se conserva, se marca y oculta los totales', async () => {
    const { user } = await cargarPlato();
    const propina = screen.getByRole('spinbutton', { name: 'Porcentaje de propina (%)' });

    await user.clear(propina);
    await user.type(propina, '150');
    expect(propina.value).toBe('150');
    expect(screen.getAllByRole('alert').some((a) => a.textContent === 'La propina debe estar entre 0 y 100.')).toBe(true);
    expect(hayTotales()).toBe(false);

    await user.clear(propina);
    await user.type(propina, '15');
    expect(hayTotales()).toBe(true);
  });

  it('los nombres tienen largo máximo', async () => {
    const { user } = await cargarPlato();
    expect(screen.getByRole('textbox', { name: 'Nombre del comensal' }).getAttribute('maxlength')).toBe('40');
    expect(screen.getByRole('textbox', { name: 'Nombre del plato de Ana' }).getAttribute('maxlength')).toBe('60');
    await user.type(screen.getByRole('textbox', { name: 'Nombre del comensal' }), 'x'.repeat(60));
    expect(screen.getByRole('textbox', { name: 'Nombre del comensal' }).value).toHaveLength(40);
  });
});

describe('plato compartido', () => {
  const registrar = async (user, { nombre, valor, quienes = [] }) => {
    if (nombre) await user.type(screen.getByRole('textbox', { name: 'Nombre del plato compartido' }), nombre);
    if (valor !== undefined) await user.type(screen.getByRole('textbox', { name: 'Valor total del plato compartido' }), valor);
    for (const q of quienes) await user.click(screen.getByRole('checkbox', { name: q }));
    await user.click(screen.getByRole('button', { name: 'Registrar compartido' }));
  };

  it.each([
    ['valor negativo', { nombre: 'Vino', valor: '-100', quienes: ['Ana'] }, 'El valor no puede ser negativo.'],
    ['valor demasiado alto', { nombre: 'Vino', valor: '5000000000', quienes: ['Ana'] }, 'El valor es demasiado alto.'],
    ['sin valor', { nombre: 'Vino', quienes: ['Ana'] }, 'Ingresa el valor total del plato.'],
    ['sin nombre', { valor: '100', quienes: ['Ana'] }, 'Escribe el nombre del plato compartido.'],
    ['sin participantes', { nombre: 'Vino', valor: '100' }, 'Elige quiénes lo comparten.'],
  ])('%s: muestra el motivo y no registra nada', async (_caso, datos, mensaje) => {
    const { user } = await preparar();
    await registrar(user, datos);

    expect(alerta()).toBe(mensaje);
    expect(screen.queryByRole('button', { name: 'Eliminar Vino' })).toBeNull();
  });

  it('un compartido válido se registra y limpia el aviso', async () => {
    const { user } = await preparar();
    await registrar(user, { nombre: 'Vino', valor: '100', quienes: ['Ana'] });

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: 'Eliminar Vino' })).toBeTruthy();
  });
});

describe('modos simples', () => {
  const irA = async (user, nombre) => user.click(screen.getByRole('tab', { name: nombre }));

  it('Partes iguales: un total negativo muestra el motivo y no calcula', async () => {
    const { user } = await preparar();
    await irA(user, /Partes iguales/);
    await user.type(screen.getByRole('textbox', { name: 'Total de la cuenta' }), '-100');

    expect(alerta()).toBe('El total no puede ser negativo.');
    expect(screen.queryAllByRole('button', { name: 'Enviar por WhatsApp' }).filter((b) => !b.closest('[hidden]'))).toHaveLength(0);
  });

  it('Partes iguales: la propina fuera de 0 a 100 se conserva, se marca y no calcula', async () => {
    const { user } = await preparar();
    await irA(user, /Partes iguales/);
    await user.type(screen.getByRole('textbox', { name: 'Total de la cuenta' }), '1000');
    const propina = screen.getByRole('spinbutton', { name: 'Propina (%)' });

    await user.clear(propina);
    await user.type(propina, '150');
    expect(propina.value).toBe('150');
    expect(alerta()).toBe('La propina debe estar entre 0 y 100.');
    expect(screen.queryAllByRole('button', { name: 'Enviar por WhatsApp' }).filter((b) => !b.closest('[hidden]'))).toHaveLength(0);

    await user.clear(propina);
    await user.type(propina, '10');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('Según ingresos: un ingreso negativo muestra a quién corresponde', async () => {
    const { user } = await preparar();
    await irA(user, /Según ingresos/);
    await user.type(screen.getByRole('textbox', { name: 'Gasto total' }), '1000');
    await user.type(screen.getByRole('textbox', { name: 'Ingreso de Persona 1' }), '-50');

    expect(alerta()).toBe('El ingreso de Persona 1 no puede ser negativo.');
  });

  it('Quién pagó qué: un pago negativo no genera transferencias', async () => {
    const { user } = await preparar();
    await irA(user, /Quién pagó qué/);
    await user.type(screen.getByRole('textbox', { name: 'Pagó de Persona 1' }), '5000');
    await user.type(screen.getByRole('textbox', { name: 'Pagó de Persona 2' }), '-2000');

    expect(alerta()).toBe('Lo que pagó Persona 2 no puede ser negativo.');
    expect(screen.queryByText('Persona 2 → Persona 1')).toBeNull();
  });
});

describe('datos guardados alterados o de versiones anteriores', () => {
  const guardar = (clave, valor) => window.localStorage.setItem(`dividicuenta:v1:${clave}`, JSON.stringify(valor));
  const hayTotales = () => !!screen.queryByRole('button', { name: 'Enviar por WhatsApp' });

  it('P1: los valores fuera de rango se conservan al recargar, con su error y sin totales', () => {
    guardar('comensales', [{ id: 1, nombre: 'Ana', items: [
      { id: 2, nombre: 'Milanesa', cantidad: 150, valorUnitario: 8500 },
      { id: 3, nombre: 'Lomo', cantidad: 1, valorUnitario: 2000000000 },
    ] }]);
    render(<App />);

    expect(screen.getByRole('spinbutton', { name: 'Cantidad de Milanesa' }).value).toBe('150');
    expect(screen.getByRole('textbox', { name: 'Precio unitario de Lomo' }).value).toBe('2000000000');
    const alertas = screen.getAllByRole('alert').map((a) => a.textContent);
    expect(alertas).toContain('La cantidad debe ser un número entero entre 1 y 99.');
    expect(alertas).toContain('El precio es demasiado alto.');
    expect(screen.getByText(/Hay valores fuera de rango/)).toBeTruthy();
    expect(hayTotales()).toBe(false);
  });

  it('P1: un precio en texto inválido también se conserva y se marca', () => {
    guardar('comensales', [{ id: 1, nombre: 'Ana', items: [{ id: 2, nombre: 'Pizza', cantidad: 1, valorUnitario: '12.34.56' }] }]);
    render(<App />);
    expect(screen.getByRole('textbox', { name: 'Precio unitario de Pizza' }).value).toBe('12.34.56');
    expect(screen.getAllByRole('alert').some((a) => a.textContent.includes('El precio no es válido.'))).toBe(true);
    expect(hayTotales()).toBe(false);
  });

  it('una lista corrupta no rompe la pantalla', () => {
    guardar('comensales', { no: 'es una lista' });
    guardar('compartidos', 'texto');
    guardar('propina', 500);
    render(<App />);

    expect(screen.getByRole('textbox', { name: 'Nombre del comensal' })).toBeTruthy();
    expect(screen.queryByText('Algo salió mal')).toBeNull();
  });

  it('una propina fuera de rango se conserva y se marca; las personas corruptas vuelven a la lista inicial', async () => {
    guardar('comensales', [{ id: 1, nombre: 'Ana', items: [] }]);
    guardar('propina', -20);
    guardar('iguales:personas', 'x');
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('spinbutton', { name: 'Porcentaje de propina (%)' }).value).toBe('-20');
    expect(screen.getAllByRole('alert').some((a) => a.textContent === 'La propina debe estar entre 0 y 100.')).toBe(true);
    await user.click(screen.getByRole('tab', { name: /Partes iguales/ }));
    expect(screen.getByRole('textbox', { name: 'Nombre de la persona 1' }).value).toBe('Persona 1');
    expect(screen.getByRole('textbox', { name: 'Nombre de la persona 2' }).value).toBe('Persona 2');
  });
});
