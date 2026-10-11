import React from 'react';
import { formatoPesos } from '../calculos';
import { boton, campo } from '../estilos';

export default function ResumenCuenta({
  comensales,
  propina,
  errorPropina,
  hayErrores,
  granTotal,
  sinAsignar,
  onPropina,
  onCompartir,
}) {
  return (
    <div className="border-t border-gray-200 pt-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="propina" className="text-sm font-medium text-gray-700">Porcentaje de propina (%)</label>
        <input
          id="propina"
          type="number"
          min="0"
          max="100"
          aria-invalid={errorPropina !== null}
          aria-describedby={errorPropina ? 'error-propina' : undefined}
          value={propina}
          onChange={(e) => onPropina(e.target.value)}
          className={`${campo} w-24 text-center font-medium ${errorPropina ? 'border-red-700 text-red-800' : ''}`}
        />
      </div>
      {errorPropina && (
        <p id="error-propina" role="alert" className="text-sm text-red-800 font-medium">{errorPropina}</p>
      )}

      {hayErrores ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Hay valores fuera de rango (marcados en rojo). Corrígelos para ver los totales.
        </p>
      ) : (
        <>
          {sinAsignar > 0 && (
            <p id="aviso-sin-asignar" role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              Hay {formatoPesos(sinAsignar)} de platos compartidos sin participantes: no se le cobran a nadie.
              Elimínalos y regístralos de nuevo eligiendo quién los comparte. Mientras tanto no se puede compartir la cuenta.
            </p>
          )}

          <section aria-labelledby="titulo-resumen" className="space-y-3 bg-emerald-50/60 p-4 rounded-xl border border-emerald-100">
            <h2 id="titulo-resumen" className="font-bold text-emerald-900 text-sm">Resumen por comensal</h2>
            <ul className="space-y-3">
              {comensales.map((c) => (
                <li key={c.id} className="flex justify-between items-center text-sm border-b border-emerald-100/60 pb-2">
                  <div>
                    <span className="font-semibold text-gray-800">{c.nombre}</span>
                    <span className="text-xs text-gray-500 block">
                      Subtotal: {formatoPesos(c.subtotal)} + Propina: {formatoPesos(c.propinaValor)}
                    </span>
                  </div>
                  <span className="font-bold text-emerald-700">{formatoPesos(c.total)}</span>
                </li>
              ))}
            </ul>

            {sinAsignar > 0 ? (
              <div className="space-y-1 pt-2 text-base text-gray-900">
                <div className="flex justify-between items-center text-sm font-medium">
                  <span>Total repartido entre los comensales:</span>
                  <span>{formatoPesos(granTotal)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-medium text-amber-900">
                  <span>Sin asignar:</span>
                  <span>{formatoPesos(sinAsignar)}</span>
                </div>
                <div className="flex justify-between items-center font-bold">
                  <span>Total de la factura:</span>
                  <span className="text-emerald-700">{formatoPesos(granTotal + sinAsignar)}</span>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center pt-2 font-bold text-base text-gray-900">
                <span>Gran total factura:</span>
                <span className="text-emerald-700">{formatoPesos(granTotal)}</span>
              </div>
            )}
          </section>

          <button
            onClick={onCompartir}
            disabled={sinAsignar > 0}
            aria-describedby={sinAsignar > 0 ? 'aviso-sin-asignar' : undefined}
            className={`${boton} w-full py-3 shadow-md`}
          >
            Enviar por WhatsApp
          </button>
        </>
      )}
    </div>
  );
}
