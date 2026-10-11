// Casos de interfaz reproducidos en la auditoría de ChatGPT (H02, H12, H16, N01).
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

const preparar = async (nombres = ['Ana', 'Beto']) => {
  const user = userEvent.setup();
  const vista = render(<App />);
  const campo = screen.getByRole('textbox', { name: 'Nombre del comensal' });
  for (const nombre of nombres) await user.type(campo, `${nombre}{Enter}`);
  return { user, ...vista };
};

const irA = (user, nombre) => user.click(screen.getByRole('tab', { name: nombre }));
const alertas = () => screen.queryAllByRole('alert').map((a) => a.textContent);

async function registrarCompartido(user, { nombre = 'Vino', valor = '100', quienes = [] } = {}) {
  await user.type(screen.getByRole('textbox', { name: 'Nombre del plato compartido' }), nombre);
  await user.type(screen.getByRole('spinbutton', { name: 'Valor total del plato compartido' }), valor);
  for (const q of quienes) await user.click(screen.getByRole('checkbox', { name: q }));
  await user.click(screen.getByRole('button', { name: 'Registrar compartido' }));
}

describe('H02: compartidos con participantes eliminados', () => {
  it('no deja registrar un compartido cuya selección apunta a alguien eliminado', async () => {
    const { user } = await preparar(['Ana', 'Beto']);
    await user.click(screen.getByRole('checkbox', { name: 'Ana' })); // seleccionada...
    await user.click(screen.getByRole('button', { name: 'Eliminar a Ana' })); // ...y eliminada
    await user.type(screen.getByRole('textbox', { name: 'Nombre del plato compartido' }), 'Vino');
    await user.type(screen.getByRole('spinbutton', { name: 'Valor total del plato compartido' }), '100');
    await user.click(screen.getByRole('button', { name: 'Registrar compartido' }));

    expect(alertas()).toContain('Elige quiénes lo comparten.');
    expect(screen.queryByRole('button', { name: 'Eliminar Vino' })).toBeNull();
  });

  it('si queda un participante vigente, registra solo a ese', async () => {
    const { user } = await preparar(['Ana', 'Beto']);
    await user.click(screen.getByRole('checkbox', { name: 'Ana' }));
    await user.click(screen.getByRole('checkbox', { name: 'Beto' }));
    await user.click(screen.getByRole('button', { name: 'Eliminar a Ana' }));
    await user.type(screen.getByRole('textbox', { name: 'Nombre del plato compartido' }), 'Vino');
    await user.type(screen.getByRole('spinbutton', { name: 'Valor total del plato compartido' }), '100');
    await user.click(screen.getByRole('button', { name: 'Registrar compartido' }));

    expect(screen.getByRole('button', { name: 'Eliminar Vino' })).toBeTruthy();
    expect(screen.getAllByText('$110').length).toBeGreaterThan(0); // 100 de Beto + 10 % de propina
  });

  it('al eliminar al último participante, el plato queda marcado y el gasto aparece como sin asignar', async () => {
    const { user } = await preparar(['Ana', 'Beto']);
    await registrarCompartido(user, { quienes: ['Ana'] });
    await user.click(screen.getByRole('button', { name: 'Eliminar a Ana' }));

    expect(screen.getByText(/Sin participantes: no se le cobra a nadie/)).toBeTruthy();
    expect(alertas().some((a) => a.includes('$100 de platos compartidos sin participantes'))).toBe(true);
  });

  it('el mensaje de WhatsApp advierte el gasto sin asignar', async () => {
    const abrir = vi.spyOn(window, 'open').mockImplementation(() => null);
    const { user } = await preparar(['Ana', 'Beto']);
    await registrarCompartido(user, { quienes: ['Ana'] });
    await user.click(screen.getByRole('button', { name: 'Eliminar a Ana' }));
    await user.click(screen.getByRole('button', { name: 'Enviar por WhatsApp' }));

    const mensaje = decodeURIComponent(abrir.mock.calls[0][0].split('text=')[1]);
    expect(mensaje).toContain('Sin asignar (platos compartidos sin participantes): $100');
  });
});

describe('H12: el lote conserva las líneas rechazadas', () => {
  it('agrega las válidas y deja las inválidas en el cuadro para corregirlas', async () => {
    const { user } = await preparar(['Ana']);
    await user.click(screen.getByRole('button', { name: 'Varios platos' }));
    const area = screen.getByRole('textbox', { name: 'Platos, uno por línea' });
    await user.type(area, 'pizza 100{Enter}sin precio{Enter}pizza 12.34.56');
    await user.click(screen.getByRole('button', { name: 'Añadir platos' }));

    expect(screen.getByRole('textbox', { name: 'Nombre del plato de Ana' }).value).toBe('pizza');
    expect(area.value).toBe('sin precio\npizza 12.34.56');
    expect(screen.getByText(/No entendí estas líneas/).textContent).toContain('sin precio');
  });

  it('si todo era válido, el cuadro queda vacío', async () => {
    const { user } = await preparar(['Ana']);
    await user.click(screen.getByRole('button', { name: 'Varios platos' }));
    const area = screen.getByRole('textbox', { name: 'Platos, uno por línea' });
    await user.type(area, 'pizza 100{Enter}flan 50');
    await user.click(screen.getByRole('button', { name: 'Añadir 2 platos' }));
    expect(area.value).toBe('');
  });
});

describe('N01: «Sí, borrar todo» borra todos los modos', () => {
  it('vacía Partes iguales, Según ingresos y Quién pagó qué, y su guardado', async () => {
    window.localStorage.setItem('otra-app', 'queda');
    const { user } = await preparar(['Ana']);

    await irA(user, /Partes iguales/);
    await user.type(screen.getByRole('spinbutton', { name: 'Total de la cuenta' }), '123');
    await irA(user, /Según ingresos/);
    await user.type(screen.getByRole('spinbutton', { name: 'Ingreso de Persona 1' }), '900000');
    await irA(user, /Quién pagó qué/);
    await user.type(screen.getByRole('spinbutton', { name: 'Pagó de Persona 1' }), '5000');

    await user.click(screen.getByRole('button', { name: 'Reiniciar' }));
    expect(screen.getByRole('alertdialog').textContent).toContain('todos los modos');
    await user.click(screen.getByRole('button', { name: 'Sí, borrar todo' }));

    expect(screen.queryByRole('textbox', { name: 'Nombre del comensal 1' })).toBeNull();
    await irA(user, /Partes iguales/);
    expect(screen.getByRole('spinbutton', { name: 'Total de la cuenta' }).value).toBe('');
    await irA(user, /Según ingresos/);
    expect(screen.getByRole('spinbutton', { name: 'Ingreso de Persona 1' }).value).toBe('');
    await irA(user, /Quién pagó qué/);
    expect(screen.getByRole('spinbutton', { name: 'Pagó de Persona 1' }).value).toBe('');

    // Los modos vuelven a guardar su estado inicial (vacío), no lo cargado antes
    expect(window.localStorage.getItem('dividicuenta:v1:iguales:total')).toBe('""');
    expect(window.localStorage.getItem('dividicuenta:v1:ingresos:personas') || '').not.toContain('900000');
    expect(window.localStorage.getItem('otra-app')).toBe('queda');
  });

  it('el botón Reiniciar está siempre disponible, aunque solo haya datos en otro modo', async () => {
    const user = userEvent.setup();
    render(<App />);
    await irA(user, /Partes iguales/);
    await user.type(screen.getByRole('spinbutton', { name: 'Total de la cuenta' }), '500');
    expect(screen.getByRole('button', { name: 'Reiniciar' })).toBeTruthy();
  });
});

describe('H16: ingresos en el mensaje', () => {
  const armar = async (user) => {
    await irA(user, /Según ingresos/);
    await user.type(screen.getByRole('spinbutton', { name: 'Gasto total' }), '300000');
    await user.type(screen.getByRole('spinbutton', { name: 'Ingreso de Persona 1' }), '900000');
    await user.type(screen.getByRole('spinbutton', { name: 'Ingreso de Persona 2' }), '300000');
  };
  const mensaje = (abrir) => decodeURIComponent(abrir.mock.calls[0][0].split('text=')[1]);

  it('por defecto no se envían los ingresos individuales', async () => {
    const abrir = vi.spyOn(window, 'open').mockImplementation(() => null);
    const user = userEvent.setup();
    render(<App />);
    await armar(user);
    const casilla = screen.getByRole('checkbox', { name: /Mostrar el ingreso de cada persona/ });
    expect(casilla.checked).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Enviar por WhatsApp' }));
    expect(mensaje(abrir)).toContain('pone $225.000 (75.0%)');
    expect(mensaje(abrir)).not.toContain('900.000');
  });

  it('se incluyen cuando el usuario lo elige', async () => {
    const abrir = vi.spyOn(window, 'open').mockImplementation(() => null);
    const user = userEvent.setup();
    render(<App />);
    await armar(user);
    await user.click(screen.getByRole('checkbox', { name: /Mostrar el ingreso de cada persona/ }));
    await user.click(screen.getByRole('button', { name: 'Enviar por WhatsApp' }));
    expect(mensaje(abrir)).toContain('ingresos $900.000');
  });
});
