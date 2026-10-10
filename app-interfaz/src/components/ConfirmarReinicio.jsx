import React from 'react';

// Confirmación en la página (en lugar de window.confirm). Escape cancela y el
// foco empieza en «Cancelar», la opción segura.
export default function ConfirmarReinicio({ onConfirmar, onCancelar }) {
  return (
    <div
      role="alertdialog"
      aria-label="Confirmar reinicio"
      onKeyDown={(e) => e.key === 'Escape' && onCancelar()}
      className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      <span>¿Borrar todo lo cargado y empezar de cero?</span>
      <span className="flex gap-2">
        <button
          onClick={onConfirmar}
          className="rounded-lg bg-red-700 px-3 min-h-11 font-medium text-white hover:bg-red-800"
        >
          Sí, borrar todo
        </button>
        <button
          autoFocus
          onClick={onCancelar}
          className="rounded-lg border border-red-700 bg-white px-3 min-h-11 font-medium text-red-800 hover:bg-red-100"
        >
          Cancelar
        </button>
      </span>
    </div>
  );
}
