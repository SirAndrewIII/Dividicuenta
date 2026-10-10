import React from 'react';
import { formatoPesos } from '../calculos';
import { boton, campo } from '../estilos';

export default function ResumenCuenta({ comensales, propina, granTotal, onPropina, onCompartir }) {
  return (
    <div className="border-t border-gray-200 pt-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="propina" className="text-sm font-medium text-gray-700">Porcentaje de propina (%)</label>
        <input
          id="propina"
          type="number"
          min="0"
          max="100"
          value={propina}
          onChange={(e) => onPropina(e.target.value)}
          className={`${campo} w-24 text-center font-medium`}
        />
      </div>

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

        <div className="flex justify-between items-center pt-2 font-bold text-base text-gray-900">
          <span>Gran total factura:</span>
          <span className="text-emerald-700">{formatoPesos(granTotal)}</span>
        </div>
      </section>

      <button onClick={onCompartir} className={`${boton} w-full py-3 shadow-md`}>
        Enviar por WhatsApp
      </button>
    </div>
  );
}
