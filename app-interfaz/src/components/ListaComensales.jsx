import React from 'react';
import { botonPeligro, campoCompacto } from '../estilos';
import CampoMonto from './CampoMonto';
import {
  MAX_CANTIDAD,
  MAX_NOMBRE,
  MAX_TEXTO,
  errorDeCantidadEditada,
  errorDeMonto,
} from '../validacion';

// Edición en línea: sin borde visible hasta enfocar, con aro de foco claro.
const campoInline =
  'bg-transparent border-b border-gray-400 hover:border-gray-600 min-h-10 focus-visible:outline-2 focus-visible:outline-emerald-700';

const conError = (error) => (error ? 'border-red-700 text-red-800' : '');

export default function ListaComensales({
  comensales,
  onRenombrar,
  onEliminar,
  onModificarItem,
  onConfirmarItem,
  onEliminarItem,
}) {
  if (comensales.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
        <p className="text-sm text-gray-500">Agrega comensales para comenzar a registrar la cuenta.</p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {comensales.map((comensal, i) => (
        <li key={comensal.id} className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm space-y-3">
          <div className="flex justify-between items-center gap-2">
            <input
              type="text"
              aria-label={`Nombre del comensal ${i + 1}`}
              maxLength={MAX_NOMBRE}
              value={comensal.nombre}
              onChange={(e) => onRenombrar(comensal.id, e.target.value)}
              className={`${campoInline} font-bold text-gray-800 text-base min-w-0 flex-1`}
            />
            <button
              onClick={() => onEliminar(comensal.id)}
              aria-label={`Eliminar a ${comensal.nombre || `comensal ${i + 1}`}`}
              className={`${botonPeligro} text-xs`}
            >
              Eliminar
            </button>
          </div>

          <ul className="space-y-2">
            {comensal.items.map((item) => {
              const errorCantidad = errorDeCantidadEditada(item.cantidad);
              const errorPrecio = errorDeMonto(item.valorUnitario, 'El precio');
              const idError = `error-item-${item.id}`;
              return (
                <li key={item.id} className="text-sm bg-gray-50 p-2 rounded-lg space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <input
                      type="text"
                      aria-label={`Nombre del plato de ${comensal.nombre}`}
                      maxLength={MAX_TEXTO}
                      value={item.nombre}
                      onChange={(e) => onModificarItem(comensal.id, item.id, 'nombre', e.target.value)}
                      className={`${campoInline} w-full sm:w-auto sm:flex-1 min-w-0 text-gray-700`}
                    />
                    <div className="flex items-center gap-1 shrink-0 ml-auto">
                      <input
                        type="number"
                        min="1"
                        max={MAX_CANTIDAD}
                        step="1"
                        aria-label={`Cantidad de ${item.nombre}`}
                        aria-invalid={errorCantidad !== null}
                        aria-describedby={errorCantidad || errorPrecio ? idError : undefined}
                        value={item.cantidad}
                        onChange={(e) => onModificarItem(comensal.id, item.id, 'cantidad', e.target.value)}
                        onBlur={() => onConfirmarItem(comensal.id, item.id)}
                        className={`${campoCompacto} w-14 text-center ${conError(errorCantidad)}`}
                      />
                      <span aria-hidden="true" className="text-gray-500 text-xs">x</span>
                      <CampoMonto
                        aria-label={`Precio unitario de ${item.nombre}`}
                        aria-invalid={errorPrecio !== null}
                        aria-describedby={errorCantidad || errorPrecio ? idError : undefined}
                        value={item.valorUnitario}
                        onChange={(e) => onModificarItem(comensal.id, item.id, 'valorUnitario', e.target.value)}
                        onBlur={() => onConfirmarItem(comensal.id, item.id)}
                        className={`${campoCompacto} w-20 sm:w-24 text-right ${conError(errorPrecio)}`}
                      />
                      <button
                        onClick={() => onEliminarItem(comensal.id, item.id)}
                        aria-label={`Eliminar ${item.nombre} de ${comensal.nombre}`}
                        className={`${botonPeligro} text-lg`}
                      >
                        <span aria-hidden="true">×</span>
                      </button>
                    </div>
                  </div>
                  {(errorCantidad || errorPrecio) && (
                    <p id={idError} role="alert" className="text-xs text-red-800 font-medium">
                      {errorCantidad || errorPrecio}
                    </p>
                  )}
                </li>
              );
            })}
            {comensal.items.length === 0 && (
              <li className="text-xs text-gray-500 italic">No hay consumos individuales registrados.</li>
            )}
          </ul>
        </li>
      ))}
    </ul>
  );
}
