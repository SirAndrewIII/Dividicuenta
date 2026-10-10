import React, { useRef } from 'react';
import { MODOS, idPanel, idTab } from '../modos';

// Pestañas con el patrón WAI-ARIA: flechas, Inicio y Fin cambian de pestaña.
export default function SelectorModo({ modo, onCambiar }) {
  const refs = useRef({});

  const teclado = (e) => {
    const actual = MODOS.findIndex((m) => m.id === modo);
    const destino = {
      ArrowRight: (actual + 1) % MODOS.length,
      ArrowLeft: (actual - 1 + MODOS.length) % MODOS.length,
      Home: 0,
      End: MODOS.length - 1,
    }[e.key];
    if (destino === undefined) return;
    e.preventDefault();
    onCambiar(MODOS[destino].id);
    refs.current[MODOS[destino].id]?.focus();
  };

  return (
    <div
      className="flex gap-2 overflow-x-auto px-4 pt-4 pb-1"
      role="tablist"
      aria-label="Forma de dividir la cuenta"
      onKeyDown={teclado}
    >
      {MODOS.map((m) => (
        <button
          key={m.id}
          ref={(el) => (refs.current[m.id] = el)}
          id={idTab(m.id)}
          role="tab"
          aria-selected={modo === m.id}
          aria-controls={idPanel(m.id)}
          tabIndex={modo === m.id ? 0 : -1}
          onClick={() => onCambiar(m.id)}
          className={`shrink-0 px-4 min-h-11 rounded-xl text-sm font-medium border transition ${
            modo === m.id
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
              : 'bg-white text-gray-600 border-gray-500 hover:border-emerald-600'
          }`}
        >
          <span aria-hidden="true">{m.icono} </span>
          {m.etiqueta}
        </button>
      ))}
    </div>
  );
}
