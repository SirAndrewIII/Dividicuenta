import React, { useState } from 'react';
import { escanearCarta, ErrorEscaneo } from '../api';
import { formatoPesos } from '../calculos';

export default function EscanerCarta({ menu, onMenu, onSeleccionarPlato }) {
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState(null);

  const manejarSubida = async (e) => {
    const archivo = e.target.files[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (!archivo) return;

    setAviso(null);
    setCargando(true);
    try {
      onMenu(await escanearCarta(archivo));
      setTimeout(() => document.getElementById('seccion-menu-ia')?.scrollIntoView?.({ behavior: 'smooth' }), 0);
    } catch (error) {
      setAviso(error instanceof ErrorEscaneo ? error.message : 'No se pudo procesar la carta. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <section aria-labelledby="titulo-escaner" className="p-6 border-b border-gray-100 bg-emerald-50/50">
      <h2 id="titulo-escaner" className="text-lg font-semibold text-emerald-800 mb-2">Escanear menú con IA</h2>
      <p className="text-sm text-gray-600 mb-4">
        Sube una foto de la carta del restaurante para extraer los platos por categorías automáticamente.
      </p>

      <div className="flex items-center gap-4">
        <label className="cursor-pointer bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium px-4 min-h-11 rounded-xl transition shadow-sm inline-flex items-center gap-2 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-emerald-700">
          <span aria-hidden="true">📄</span>
          <span>Subir foto de la carta</span>
          <input type="file" accept="image/*" onChange={manejarSubida} className="sr-only" />
        </label>
        {cargando && (
          <span role="status" className="text-sm text-emerald-700 font-medium animate-pulse">
            Analizando carta con IA...
          </span>
        )}
      </div>
      {aviso && (
        <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {aviso}
        </p>
      )}

      {menu && (
        <div id="seccion-menu-ia" className="mt-6 bg-white p-4 rounded-xl border border-emerald-200 shadow-sm space-y-6">
          <h3 className="font-bold text-emerald-900">Menú organizado (toca un plato para agregarlo)</h3>

          {menu.categorias.map((cat, idxCat) => (
            <div key={idxCat} className="space-y-3">
              <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider border-b border-emerald-100 pb-1">
                {cat.nombre_categoria}
              </h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cat.items.map((plato, idxPlato) => (
                  <li key={idxPlato}>
                    <button
                      type="button"
                      onClick={() => onSeleccionarPlato(plato)}
                      aria-label={`Usar ${plato.nombre}, ${formatoPesos(plato.precio)}`}
                      className="w-full min-h-11 text-left p-3 rounded-lg border border-gray-300 hover:border-emerald-600 hover:bg-emerald-50 transition flex justify-between items-center gap-2"
                    >
                      <span className="pr-2">
                        <span className="block font-medium text-gray-800 text-sm">{plato.nombre}</span>
                        {plato.descripcion && (
                          <span className="block text-xs text-gray-500 line-clamp-1">{plato.descripcion}</span>
                        )}
                      </span>
                      <span className="font-bold text-emerald-700 text-sm shrink-0">{formatoPesos(plato.precio)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
