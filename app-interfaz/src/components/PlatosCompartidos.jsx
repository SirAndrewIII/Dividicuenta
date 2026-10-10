import React, { useState } from 'react';
import { formatoPesos } from '../calculos';
import { boton, botonPeligro, campo } from '../estilos';

export default function PlatosCompartidos({ comensales, compartidos, onAgregar, onEliminar }) {
  const [nombre, setNombre] = useState('');
  const [valor, setValor] = useState('');
  const [ids, setIds] = useState([]);

  const alternar = (id) => setIds(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);

  const registrar = () => {
    if (!nombre.trim() || !valor || isNaN(valor) || ids.length === 0) return;
    onAgregar({ nombre: nombre.trim(), valorTotal: parseFloat(valor), comensalesIds: [...ids] });
    setNombre('');
    setValor('');
    setIds([]);
  };

  return (
    <section aria-labelledby="titulo-compartido" className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
      <h2 id="titulo-compartido" className="font-semibold text-sm text-gray-700">Plato o entrada compartida</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          type="text"
          aria-label="Nombre del plato compartido"
          placeholder="Ej. Botella de vino, Entrada"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className={campo}
        />
        <input
          type="number"
          min="0"
          aria-label="Valor total del plato compartido"
          placeholder="Valor total"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className={campo}
        />
        <button onClick={registrar} className={boton}>
          Registrar compartido
        </button>
      </div>

      {comensales.length > 0 && (
        <fieldset className="flex flex-wrap gap-2 pt-2">
          <legend className="text-xs text-gray-500 w-full mb-2">¿Quiénes lo comparten?</legend>
          {comensales.map((c) => (
            <label
              key={c.id}
              className="inline-flex items-center gap-2 text-xs bg-white border border-gray-500 px-3 min-h-11 rounded-lg cursor-pointer focus-within:outline-2 focus-within:outline-emerald-700"
            >
              <input
                type="checkbox"
                checked={ids.includes(c.id)}
                onChange={() => alternar(c.id)}
                className="size-4 accent-emerald-700"
              />
              {c.nombre}
            </label>
          ))}
        </fieldset>
      )}

      <ul className="space-y-2 pt-2">
        {compartidos.map((comp) => (
          <li key={comp.id} className="flex justify-between items-center text-sm bg-white p-2.5 rounded-lg border border-gray-200">
            <div>
              <span className="font-medium text-gray-800">{comp.nombre}</span>
              <span className="text-gray-500 text-xs ml-2">({formatoPesos(comp.valorTotal)})</span>
            </div>
            <button
              onClick={() => onEliminar(comp.id)}
              aria-label={`Eliminar ${comp.nombre}`}
              className={`${botonPeligro} text-xs`}
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
