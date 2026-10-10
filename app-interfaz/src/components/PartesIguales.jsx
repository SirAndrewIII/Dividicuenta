import React from 'react';
import { dividirIgual, formatoPesos } from '../calculos';
import { campo } from '../estilos';
import { useEstadoPersistente } from '../hooks/useEstadoPersistente';
import { abrirWhatsApp, mensajeIguales } from '../mensajes';
import { num, personasIniciales, sanearPersonas } from '../personas';
import { MAX_MONTO, MAX_TEXTO, errorDeMonto, sanearPropina } from '../validacion';
import { Aviso, Campo, Fila, ListaPersonas, Resultado } from './comunes';

export default function PartesIguales() {
  const [total, setTotal] = useEstadoPersistente('iguales:total', '');
  const [motivo, setMotivo] = useEstadoPersistente('iguales:motivo', '');
  const [propina, setPropina] = useEstadoPersistente('iguales:propina', 0, (v) => sanearPropina(v, 0));
  const [personas, setPersonas] = useEstadoPersistente('iguales:personas', personasIniciales, sanearPersonas);

  const error = errorDeMonto(total, 'El total');
  const totalConPropina = num(total) * (1 + num(propina) / 100);
  const montos = dividirIgual(totalConPropina, personas.length);
  const listo = num(total) > 0 && !error;

  // La propina va de 0 a 100; un valor fuera de rango se ignora
  const cambiarPropina = (texto) => {
    const n = Number(texto);
    if (texto === '' || (n >= 0 && n <= 100)) setPropina(texto);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Ingresá el total y entre cuántos se reparte. Todos ponen lo mismo.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Campo etiqueta="Motivo (opcional)">
          <input className={`${campo} w-full`} maxLength={MAX_TEXTO} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Asado del sábado" />
        </Campo>
        <Campo etiqueta="Total de la cuenta">
          <input type="number" min="0" max={MAX_MONTO} aria-invalid={error !== null} className={`${campo} w-full`} value={total} onChange={(e) => setTotal(e.target.value)} />
        </Campo>
        <Campo etiqueta="Propina (%)">
          <input type="number" min="0" max="100" className={`${campo} w-full`} value={propina} onChange={(e) => cambiarPropina(e.target.value)} />
        </Campo>
      </div>
      {error && <Aviso>{error}</Aviso>}
      <ListaPersonas personas={personas} setPersonas={setPersonas} />
      {listo && (
        <Resultado
          onCompartir={() =>
            abrirWhatsApp(mensajeIguales({ motivo, total: totalConPropina, propina: num(propina), personas, montos }))
          }
        >
          {personas.map((p, i) => (
            <Fila key={p.id} izq={p.nombre} der={formatoPesos(montos[i])} />
          ))}
          <div className="flex justify-between font-bold pt-1">
            <span>Total:</span>
            <span className="text-emerald-700">{formatoPesos(totalConPropina)}</span>
          </div>
        </Resultado>
      )}
    </div>
  );
}
