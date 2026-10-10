import React from 'react';
import axe from 'axe-core';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

const preparar = () => {
  const user = userEvent.setup();
  const vista = render(<App />);
  return { user, ...vista };
};

async function agregarComensales(user, nombres) {
  const campo = screen.getByRole('textbox', { name: 'Nombre del comensal' });
  for (const nombre of nombres) {
    await user.type(campo, `${nombre}{Enter}`);
  }
}

const respuesta = (ok, cuerpo) => ({ ok, json: async () => cuerpo });
const archivoCarta = () => new File(['x'], 'carta.png', { type: 'image/png' });
const MENU = { status: 'success', menu: { categorias: [{ nombre_categoria: 'Platos', items: [{ nombre: 'Milanesa', precio: 8500 }] }] } };

describe('modo Por consumo', () => {
  it('reparte un plato compartido y la cuenta suma exactamente (BL-1)', async () => {
    const { user } = preparar();
    await agregarComensales(user, ['Ana', 'Beto', 'Caro']);

    await user.type(screen.getByRole('textbox', { name: 'Nombre del plato compartido' }), 'Picada');
    await user.type(screen.getByRole('spinbutton', { name: 'Valor total del plato compartido' }), '100');
    for (const nombre of ['Ana', 'Beto', 'Caro']) await user.click(screen.getByRole('checkbox', { name: nombre }));
    await user.click(screen.getByRole('button', { name: 'Registrar compartido' }));

    expect(screen.getByText('$110')).toBeTruthy(); // gran total
    expect(screen.getByText('$36,68')).toBeTruthy();
    expect(screen.getAllByText('$36,66')).toHaveLength(2);
  });

  it('arma el mensaje de WhatsApp en es-AR', async () => {
    const abrir = vi.spyOn(window, 'open').mockImplementation(() => null);
    const { user } = preparar();
    await agregarComensales(user, ['Ana']);
    await user.type(screen.getByRole('textbox', { name: 'Nombre del plato' }), 'Milanesa');
    await user.type(screen.getByRole('spinbutton', { name: 'Precio del plato' }), '10000');
    await user.click(screen.getByRole('button', { name: 'Añadir plato' }));
    await user.click(screen.getByRole('button', { name: 'Enviar por WhatsApp' }));

    const mensaje = decodeURIComponent(abrir.mock.calls[0][0].split('text=')[1]);
    expect(mensaje).toContain('1x Milanesa ($10.000)');
    expect(mensaje).toContain('Propina (10%): $1.000');
    expect(mensaje).toContain('GRAN TOTAL FACTURA: $11.000');
  });

  it('carga varios platos de una vez', async () => {
    const { user } = preparar();
    await agregarComensales(user, ['Ana']);
    await user.click(screen.getByRole('button', { name: 'Varios platos' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Platos, uno por línea' }),
      '2 hamburguesa 30000{Enter}papas fritas 10000{Enter}sin precio',
    );
    expect(screen.getByText(/No entendí estas líneas/).textContent).toContain('sin precio');
    await user.click(screen.getByRole('button', { name: 'Añadir 2 platos' }));

    expect(screen.getAllByRole('textbox', { name: 'Nombre del plato de Ana' })).toHaveLength(2);
    expect(screen.getAllByRole('spinbutton', { name: /Cantidad de/ })).toHaveLength(2);
    expect(screen.getAllByText('$77.000')).toHaveLength(2); // total de Ana y gran total: (60000 + 10000) + 10 % de propina
  });

  it('el borrador del formulario se rellena desde el menú escaneado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(true, MENU)));
    const { user } = preparar();
    await agregarComensales(user, ['Ana']);
    await user.upload(screen.getByLabelText(/Subir foto de la carta/), archivoCarta());

    await user.click(await screen.findByRole('button', { name: /Usar Milanesa/ }));
    expect(screen.getByRole('textbox', { name: 'Nombre del plato' }).value).toBe('Milanesa');
    expect(screen.getByRole('spinbutton', { name: 'Precio del plato' }).value).toBe('8500');
  });

  it('muestra en la página los errores del escaneo (sin alert)', async () => {
    const alerta = vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchFalso = vi.fn().mockResolvedValueOnce(respuesta(false, { detail: 'El servicio no está disponible.' }));
    vi.stubGlobal('fetch', fetchFalso);
    const { user } = preparar();

    await user.upload(screen.getByLabelText(/Subir foto de la carta/), archivoCarta());
    expect((await screen.findByRole('alert')).textContent).toBe('El servicio no está disponible.');

    fetchFalso.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await user.upload(screen.getByLabelText(/Subir foto de la carta/), archivoCarta());
    expect((await screen.findByRole('alert')).textContent).toContain('No pudimos conectar');
    expect(alerta).not.toHaveBeenCalled();
  });

  it('la cuenta sobrevive a una recarga (UX-1)', async () => {
    const { user, unmount } = preparar();
    await agregarComensales(user, ['Ana']);
    unmount();

    render(<App />);
    expect(screen.getByRole('textbox', { name: 'Nombre del comensal 1' }).value).toBe('Ana');
  });

  it('Reiniciar pide confirmación en la página (UX-2)', async () => {
    const confirmar = vi.spyOn(window, 'confirm').mockImplementation(() => true);
    const { user } = preparar();
    await agregarComensales(user, ['Ana']);

    await user.click(screen.getByRole('button', { name: 'Reiniciar' }));
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(document.activeElement.textContent).toBe('Cancelar');

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Nombre del comensal 1' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Reiniciar' }));
    await user.click(screen.getByRole('button', { name: 'Sí, borrar todo' }));
    expect(screen.queryByRole('textbox', { name: 'Nombre del comensal 1' })).toBeNull();
    expect(confirmar).not.toHaveBeenCalled();
  });

  it('Escape cierra la confirmación', async () => {
    const { user } = preparar();
    await agregarComensales(user, ['Ana']);
    await user.click(screen.getByRole('button', { name: 'Reiniciar' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});

describe('pestañas', () => {
  it('los datos de cada modo se conservan al cambiar de pestaña (FE-1)', async () => {
    const { user } = preparar();
    await user.click(screen.getByRole('tab', { name: /Partes iguales/ }));
    await user.type(screen.getByRole('spinbutton', { name: 'Total de la cuenta' }), '90000');
    await user.click(screen.getByRole('button', { name: '+ Sumar otra persona' }));

    await user.click(screen.getByRole('tab', { name: /Según ingresos/ }));
    await user.click(screen.getByRole('tab', { name: /Partes iguales/ }));

    expect(screen.getByRole('spinbutton', { name: 'Total de la cuenta' }).value).toBe('90000');
    expect(screen.getAllByText('$30.000').length).toBeGreaterThanOrEqual(3);
  });

  it('se navegan con flechas, Inicio y Fin', async () => {
    const { user } = preparar();
    screen.getByRole('tab', { name: /Por consumo/ }).focus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: /Partes iguales/ }).getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: /Partes iguales/ }));

    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: /Quién pagó qué/ }).getAttribute('aria-selected')).toBe('true');
    await user.keyboard('{ArrowRight}'); // da la vuelta
    expect(screen.getByRole('tab', { name: /Por consumo/ }).getAttribute('aria-selected')).toBe('true');
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: /Quién pagó qué/ }).getAttribute('aria-selected')).toBe('true');
    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: /Por consumo/ }).getAttribute('aria-selected')).toBe('true');
  });

  it('cada pestaña controla su panel', async () => {
    const { user } = preparar();
    await user.click(screen.getByRole('tab', { name: /Según ingresos/ }));
    const tab = screen.getByRole('tab', { name: /Según ingresos/ });
    expect(tab.getAttribute('tabindex')).toBe('0');
    const panel = document.getElementById(tab.getAttribute('aria-controls'));
    expect(panel.getAttribute('aria-labelledby')).toBe(tab.id);
    expect(panel.hidden).toBe(false);
  });

  it('Según ingresos reparte proporcionalmente', async () => {
    const { user } = preparar();
    await user.click(screen.getByRole('tab', { name: /Según ingresos/ }));
    await user.type(screen.getByRole('spinbutton', { name: 'Gasto total' }), '300000');
    await user.type(screen.getByRole('spinbutton', { name: 'Ingreso de Persona 1' }), '1000000');
    await user.type(screen.getByRole('spinbutton', { name: 'Ingreso de Persona 2' }), '500000');
    expect(screen.getByText('$200.000')).toBeTruthy();
    expect(screen.getByText('$100.000')).toBeTruthy();
  });

  it('Quién pagó qué muestra las transferencias', async () => {
    const { user } = preparar();
    await user.click(screen.getByRole('tab', { name: /Quién pagó qué/ }));
    await user.type(screen.getByRole('spinbutton', { name: 'Pagó de Persona 1' }), '9000');
    await user.type(screen.getByRole('spinbutton', { name: 'Pagó de Persona 2' }), '3000');
    expect(screen.getByText('Persona 2 → Persona 1')).toBeTruthy();
    expect(screen.getByText('$3.000')).toBeTruthy();
  });
});

describe('accesibilidad (axe)', () => {
  // jsdom no calcula estilos reales: el contraste se verifica aparte en navegador.
  const auditar = async (contenedor) => {
    const { violations } = await axe.run(contenedor, { rules: { 'color-contrast': { enabled: false } } });
    return violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
  };

  it('Por consumo, con datos, no tiene violaciones', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(true, MENU)));
    const { user, container } = preparar();
    await agregarComensales(user, ['Ana', 'Beto']);
    await user.type(screen.getByRole('textbox', { name: 'Nombre del plato' }), 'Milanesa');
    await user.type(screen.getByRole('spinbutton', { name: 'Precio del plato' }), '8500');
    await user.click(screen.getByRole('button', { name: 'Añadir plato' }));
    await user.type(screen.getByRole('textbox', { name: 'Nombre del plato compartido' }), 'Vino');
    await user.type(screen.getByRole('spinbutton', { name: 'Valor total del plato compartido' }), '5000');
    await user.click(screen.getByRole('checkbox', { name: 'Ana' }));
    await user.click(screen.getByRole('button', { name: 'Registrar compartido' }));
    await user.upload(screen.getByLabelText(/Subir foto de la carta/), archivoCarta());
    await screen.findByRole('button', { name: /Usar Milanesa/ });
    await user.click(screen.getByRole('button', { name: 'Varios platos' }));
    await user.type(screen.getByRole('textbox', { name: 'Platos, uno por línea' }), '2 cerveza 4500{Enter}mal');

    expect(await auditar(container)).toEqual([]);
  });

  it.each([
    ['Partes iguales', /Partes iguales/],
    ['Según ingresos', /Según ingresos/],
    ['Quién pagó qué', /Quién pagó qué/],
  ])('%s, con resultado, no tiene violaciones', async (_nombre, tab) => {
    const { user, container } = preparar();
    await user.click(screen.getByRole('tab', { name: tab }));
    const total = screen.queryByRole('spinbutton', { name: /Total de la cuenta|Gasto total/ });
    if (total) await user.type(total, '1000');
    for (const campo of screen.queryAllByRole('spinbutton', { name: /^(Ingreso|Pagó) de/ })) await user.type(campo, '500');

    expect(await auditar(container)).toEqual([]);
  });

  it('los botones de borrar tienen nombre accesible', async () => {
    const { user } = preparar();
    await agregarComensales(user, ['Ana']);
    expect(screen.getByRole('button', { name: 'Eliminar a Ana' })).toBeTruthy();
    const panel = within(screen.getByRole('tabpanel', { name: /Por consumo/ }));
    expect(panel.getAllByRole('textbox').length).toBeGreaterThan(0);
  });
});
