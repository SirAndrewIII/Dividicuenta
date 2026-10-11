import React, { useState } from 'react';
import { formatoPesos } from '../calculos';
import { boton, botonPeligro, campo } from '../estilos';
import { MAX_TEXTO, aMonto, errorDeMonto } from '../validacion';
import CampoMonto from './CampoMonto';

export default function PlatosCompartidos({ comensales, compartidos, onAgregar, onEliminar }) {
  const [nombre, setNombre] = useState('');
  const [valor, setValor] = useState('');
  const [ids, setIds] = useState([]);
  const [error, setError] = useState(null);

  const existe = (id) => comensales.some((c) => c.id === id);
  // Una selección puede quedar apuntando a alguien que ya se eliminó
  const idsVigentes = ids.filter(existe);

  const alternar = (id) => {
    setError(null);
    setIds(idsVigentes.includes(id) ? idsVigentes.filter((x) => x !== id) : [...idsVigentes, id]);
  };

  const registrar = () => {
    const problema = !nombre.trim()
      ? 'Escribe el nombre del plato compartido.'
      : valor === ''
        ? 'Ingresa el valor total del plato.'
        : errorDeMonto(valor, 'El valor') ||
          (idsVigentes.length === 0 ? 'Elige quiénes lo comparten.' : null);
    if (problema) return setError(problema);

    if (onAgregar({ nombre: nombre.trim(), valorTotal: aMonto(valor), comensalesIds: idsVigentes })) {
      setNombre('');
      setValor('');
      setIds([]);
      setError(null);
    }
  };

  // Escribir en cualquier campo limpia el aviso anterior
  const cambiar = (alCambiar) => (e) => {
    setError(null);
    alCambiar(e.target.value);
  };

  return (
    <section aria-labelledby="titulo-compartido" className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
      <h2 id="titulo-compartido" className="font-semibold text-sm text-gray-700">Plato o entrada compartida</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          type="text"
          aria-label="Nombre del plato compartido"
          placeholder="Ej. Botella de vino, Entrada"
          maxLength={MAX_TEXTO}
          value={nombre}
          onChange={cambiar(setNombre)}
          className={campo}
        />
        <CampoMonto
          aria-label="Valor total del plato compartido"
          aria-invalid={error !== null && error.includes('valor')}
          aria-describedby={error ? 'error-compartido' : undefined}
          placeholder="Valor total"
          value={valor}
          onChange={cambiar(setValor)}
          className={campo}
        />
        <button onClick={registrar} className={boton}>
          Registrar compartido
        </button>
      </div>
      {error && (
        <p id="error-compartido" role="alert" className="text-sm text-red-800">
          {error}
        </p>
      )}

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
                checked={idsVigentes.includes(c.id)}
                onChange={() => alternar(c.id)}
                className="size-4 accent-emerald-700"
              />
              {c.nombre}
            </label>
          ))}
        </fieldset>
      )}

      <ul className="space-y-2 pt-2">
        {compartidos.map((comp) => {
          const sinParticipantes = !comp.comensalesIds.some(existe);
          return (
            <li
              key={comp.id}
              className={`flex justify-between items-center gap-2 text-sm bg-white p-2.5 rounded-lg border ${
                sinParticipantes ? 'border-red-700' : 'border-gray-200'
              }`}
            >
              <div>
                <span className="font-medium text-gray-800">{comp.nombre}</span>
                <span className="text-gray-500 text-xs ml-2">({formatoPesos(comp.valorTotal)})</span>
                {sinParticipantes && (
                  <span className="block text-xs font-medium text-red-800">
                    Sin participantes: no se le cobra a nadie. Elimínalo y regístralo de nuevo.
                  </span>
                )}
              </div>
              <button
                onClick={() => onEliminar(comp.id)}
                aria-label={`Eliminar ${comp.nombre}`}
                className={`${botonPeligro} text-xs`}
              >
                Eliminar
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
