import React from 'react';
import { render, renderHook, screen, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { escanearCarta, ErrorEscaneo } from './api';
import ErrorBoundary from './ErrorBoundary';
import { useEstadoPersistente } from './hooks/useEstadoPersistente';
import { generarId } from './ids';
import { abrirWhatsApp, mensajeConsumo, mensajeCruzados, mensajeIguales, mensajeIngresos } from './mensajes';

const archivo = new File(['x'], 'carta.png', { type: 'image/png' });
const resp = (ok, cuerpo) => ({ ok, json: async () => cuerpo });
const MENU = { status: 'success', menu: { categorias: [{ nombre_categoria: 'A', items: [{ nombre: 'Flan', precio: 3000 }] }] } };

describe('escanearCarta', () => {
  it('devuelve el menú validado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resp(true, MENU)));
    expect(await escanearCarta(archivo)).toEqual({
      categorias: [{ nombre_categoria: 'A', items: [{ nombre: 'Flan', descripcion: '', precio: 3000 }] }],
    });
  });

  it.each([
    ['detail de texto', resp(false, { detail: 'Demasiadas solicitudes.' }), 'Demasiadas solicitudes.'],
    ['detail que no es texto (422)', resp(false, { detail: [{ msg: 'x' }] }), 'No se pudo procesar la carta'],
    ['respuesta sin JSON', { ok: false, json: async () => { throw new Error('no json'); } }, 'No se pudo procesar la carta'],
    ['menú sin platos', resp(true, { status: 'success', menu: { categorias: [] } }), 'No pudimos leer platos'],
    ['status distinto de success', resp(true, { status: 'error' }), 'No pudimos leer platos'],
  ])('error con %s', async (_caso, respuesta, texto) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta));
    const error = await escanearCarta(archivo).catch((e) => e);
    expect(error).toBeInstanceOf(ErrorEscaneo);
    expect(error.message).toContain(texto);
  });

  it('error de red', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(escanearCarta(archivo)).rejects.toThrow('No pudimos conectar');
  });
});

describe('mensajes de WhatsApp', () => {
  const calculado = {
    nombre: 'Ana', items: [{ cantidad: 2, nombre: 'Cerveza', valorUnitario: 4500 }],
    detalleCompartido: [{ nombre: 'Picada', monto: 33.34 }], subtotal: 9033.34, propinaValor: 903.33, total: 9936.67,
  };

  it('mensajeConsumo lista consumos, compartidos, propina y total', () => {
    const texto = mensajeConsumo([calculado, { ...calculado, nombre: 'Beto', items: [], detalleCompartido: [] }], 10, 20000);
    expect(texto).toContain('👤 *Ana*');
    expect(texto).toContain(' - 2x Cerveza ($9.000)');
    expect(texto).toContain(' - [Compartido] Picada ($33,34)');
    expect(texto).toContain('Propina (10%): $903,33');
    expect(texto).toContain('Sin consumos registrados');
    expect(texto).toContain('GRAN TOTAL FACTURA: $20.000');
  });

  it('los otros modos usan motivo por defecto y es-AR', () => {
    expect(mensajeIguales({ motivo: ' ', total: 100, propina: 0, personas: [{ nombre: 'A' }], montos: [100] })).toContain('*Cuenta - DividiCuenta*');
    expect(mensajeIngresos({ motivo: '', total: 300, personas: [{ nombre: 'A' }], ingresos: [1000], montos: [300], porcentajes: [100], esfuerzo: 30 })).toContain('Gastos compartidos');
    expect(mensajeCruzados({ motivo: 'Viaje', total: 3000, cantidad: 3, transferencias: [] })).toContain('Están a mano');
    expect(mensajeCruzados({ motivo: '', total: 3000, cantidad: 3, transferencias: [{ de: 'B', a: 'A', monto: 1000 }] })).toContain('B le debe $1.000 a A');
  });

  it('abrirWhatsApp codifica el texto y abre con noopener', () => {
    const abrir = vi.spyOn(window, 'open').mockImplementation(() => null);
    abrirWhatsApp('hola & chau');
    expect(abrir).toHaveBeenCalledWith('https://api.whatsapp.com/send?text=hola%20%26%20chau', '_blank', 'noopener');
  });
});

describe('useEstadoPersistente', () => {
  it('lee y escribe en localStorage', () => {
    window.localStorage.setItem('dividicuenta:v1:x', JSON.stringify(5));
    const { result } = renderHook(() => useEstadoPersistente('x', 0));
    expect(result.current[0]).toBe(5);
    act(() => result.current[1](9));
    expect(window.localStorage.getItem('dividicuenta:v1:x')).toBe('9');
  });

  it('un dato corrupto cae en el valor inicial', () => {
    window.localStorage.setItem('dividicuenta:v1:y', '{roto');
    const { result } = renderHook(() => useEstadoPersistente('y', () => 'inicial'));
    expect(result.current[0]).toBe('inicial');
  });

  it('sin acceso al almacenamiento sigue funcionando', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('lleno'); });
    const { result } = renderHook(() => useEstadoPersistente('z', 1));
    act(() => result.current[1](2));
    expect(result.current[0]).toBe(2);
  });
});

describe('generarId', () => {
  it('no repite ids dentro del mismo milisegundo', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    const ids = Array.from({ length: 50 }, generarId);
    expect(new Set(ids).size).toBe(50);
  });
});

describe('ErrorBoundary (FE-2)', () => {
  const Roto = () => { throw new Error('falla al dibujar'); };

  it('muestra una pantalla de error en lugar de quedar en blanco', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><Roto /></ErrorBoundary>);
    expect(screen.getByRole('alert').textContent).toContain('Algo salió mal');
  });

  it('«Empezar de cero» borra solo los datos de la app', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    window.localStorage.setItem('dividicuenta:v1:comensales', '[]');
    window.localStorage.setItem('otra-app', 'queda');
    const recargar = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload: recargar });
    render(<ErrorBoundary><Roto /></ErrorBoundary>);

    screen.getByRole('button', { name: 'Empezar de cero' }).click();
    expect(window.localStorage.getItem('dividicuenta:v1:comensales')).toBeNull();
    expect(window.localStorage.getItem('otra-app')).toBe('queda');
    expect(recargar).toHaveBeenCalled();
  });
});
