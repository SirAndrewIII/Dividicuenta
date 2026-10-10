import React from 'react';
import { campo, boton, botonPeligro } from '../estilos';
import { MAX_PERSONAS, nuevaPersona } from '../personas';
import { MAX_MONTO, MAX_NOMBRE } from '../validacion';

// Aviso de un valor inválido; se anuncia a los lectores de pantalla.
export function Aviso({ children }) {
  return (
    <p role="alert" className="text-sm text-red-800 font-medium">
      {children}
    </p>
  );
}

// Lista editable de personas; `etiquetaValor` activa una segunda columna numérica.
export function ListaPersonas({ personas, setPersonas, etiquetaValor }) {
  const cambiar = (id, campoCambiado, valor) =>
    setPersonas(personas.map((p) => (p.id === id ? { ...p, [campoCambiado]: valor } : p)));

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {personas.map((p, i) => (
          // En pantallas angostas el importe baja a su propia fila para que el nombre se lea completo
          <li
            key={p.id}
            className={`grid gap-2 items-center ${
              etiquetaValor ? 'grid-cols-[1fr_auto] sm:grid-cols-[1fr_8rem_auto]' : 'grid-cols-[1fr_auto]'
            }`}
          >
            <input
              type="text"
              aria-label={`Nombre de la persona ${i + 1}`}
              maxLength={MAX_NOMBRE}
              value={p.nombre}
              onChange={(e) => cambiar(p.id, 'nombre', e.target.value)}
              className={`${campo} min-w-0 order-1 sm:order-none`}
            />
            {etiquetaValor && (
              <input
                type="number"
                min="0"
                max={MAX_MONTO}
                aria-label={`${etiquetaValor} de ${p.nombre || `la persona ${i + 1}`}`}
                placeholder={etiquetaValor}
                value={p.valor}
                onChange={(e) => cambiar(p.id, 'valor', e.target.value)}
                className={`${campo} min-w-0 col-span-2 order-3 sm:col-span-1 sm:order-none`}
              />
            )}
            <button
              onClick={() => setPersonas(personas.filter((x) => x.id !== p.id))}
              disabled={personas.length <= 2}
              className={`${botonPeligro} text-lg disabled:opacity-40 order-2 sm:order-none`}
              aria-label={`Eliminar a ${p.nombre || `la persona ${i + 1}`}`}
            >
              <span aria-hidden="true">×</span>
            </button>
          </li>
        ))}
      </ul>
      {personas.length < MAX_PERSONAS && (
        <button
          onClick={() => setPersonas([...personas, nuevaPersona(personas.length + 1)])}
          className="w-full min-h-11 border border-emerald-700 text-emerald-800 text-sm font-bold rounded-xl hover:bg-emerald-50 transition"
        >
          + Sumar otra persona
        </button>
      )}
    </div>
  );
}

export function Campo({ etiqueta, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-gray-700">{etiqueta}</span>
      {children}
    </label>
  );
}

export function Resultado({ children, onCompartir }) {
  return (
    <div className="space-y-3">
      <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100 space-y-2 text-sm">
        {children}
      </div>
      <button onClick={onCompartir} className={`${boton} w-full py-3`}>
        Enviar por WhatsApp
      </button>
    </div>
  );
}

export const Fila = ({ izq, der, sub }) => (
  <div className="flex justify-between items-center border-b border-emerald-100/60 pb-2">
    <div>
      <span className="font-semibold text-gray-800">{izq}</span>
      {sub && <span className="text-xs text-gray-500 block">{sub}</span>}
    </div>
    <span className="font-bold text-emerald-700">{der}</span>
  </div>
);
