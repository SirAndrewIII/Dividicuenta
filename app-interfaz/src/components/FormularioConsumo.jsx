import React, { useState } from 'react';
import { parsearConsumos, formatoPesos } from '../calculos';
import { boton, campo } from '../estilos';

const MODOS_CARGA = [
  [false, 'Un plato'],
  [true, 'Varios platos'],
];

export default function FormularioConsumo({
  comensales,
  seleccionadoId,
  onSeleccionar,
  onAgregarItems,
  nombre,
  precio,
  onNombre,
  onPrecio,
}) {
  const [enLote, setEnLote] = useState(false);
  const [textoLote, setTextoLote] = useState('');
  const lote = parsearConsumos(textoLote);

  const agregarUno = () => {
    if (!nombre.trim() || !precio || isNaN(precio)) return;
    if (onAgregarItems([{ nombre: nombre.trim(), cantidad: 1, valorUnitario: parseFloat(precio) }])) {
      onNombre('');
      onPrecio('');
    }
  };

  const agregarLote = () => {
    if (onAgregarItems(lote.items)) setTextoLote('');
  };

  const selector = (
    <select
      aria-label="Comensal que consumió"
      value={seleccionadoId || ''}
      onChange={(e) => onSeleccionar(Number(e.target.value))}
      className={`${campo} ${enLote ? 'w-full sm:w-auto' : ''}`}
    >
      {comensales.map((c) => (
        <option key={c.id} value={c.id}>{c.nombre}</option>
      ))}
    </select>
  );

  return (
    <section aria-labelledby="titulo-consumo" className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 id="titulo-consumo" className="font-semibold text-sm text-gray-700">Agregar consumo individual</h2>
        <div className="flex gap-1 text-xs" role="group" aria-label="Cantidad de platos a cargar">
          {MODOS_CARGA.map(([valor, etiqueta]) => (
            <button
              key={etiqueta}
              aria-pressed={enLote === valor}
              onClick={() => setEnLote(valor)}
              className={`px-3 min-h-11 rounded-lg border transition ${
                enLote === valor
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-white text-gray-600 border-gray-500 hover:border-emerald-600'
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>
      </div>

      {!enLote ? (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          {selector}
          <input
            type="text"
            aria-label="Nombre del plato"
            placeholder="Nombre del plato"
            value={nombre}
            onChange={(e) => onNombre(e.target.value)}
            className={campo}
          />
          <input
            type="number"
            min="0"
            aria-label="Precio del plato"
            placeholder="Precio"
            value={precio}
            onChange={(e) => onPrecio(e.target.value)}
            className={campo}
          />
          <button onClick={agregarUno} className={boton}>
            Añadir plato
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {selector}
          <textarea
            rows={5}
            aria-label="Platos, uno por línea"
            value={textoLote}
            onChange={(e) => setTextoLote(e.target.value)}
            placeholder={`Un plato por línea: cantidad, nombre y precio unitario\n2 hamburguesa 30000\npapas fritas 10000\n3x cerveza 4500`}
            className={`${campo} w-full font-mono`}
          />
          {lote.items.length > 0 && (
            <ul aria-label="Platos reconocidos" className="text-xs text-gray-600 bg-white border border-gray-200 rounded-lg p-2 space-y-0.5">
              {lote.items.map((it, i) => (
                <li key={i} className="flex justify-between">
                  <span>{it.cantidad}x {it.nombre}</span>
                  <span>{formatoPesos(it.cantidad * it.valorUnitario)}</span>
                </li>
              ))}
            </ul>
          )}
          {lote.invalidas.length > 0 && (
            <p className="text-xs text-amber-700">
              No entendí estas líneas (falta el precio): {lote.invalidas.join(' · ')}
            </p>
          )}
          <button onClick={agregarLote} disabled={lote.items.length === 0} className={`${boton} w-full`}>
            {lote.items.length > 1 ? `Añadir ${lote.items.length} platos` : 'Añadir platos'}
          </button>
        </div>
      )}
    </section>
  );
}
