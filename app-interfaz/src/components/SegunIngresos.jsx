import React from 'react';
import { dividirPorIngresos, formatoPesos } from '../calculos';
import { campo } from '../estilos';
import { useEstadoPersistente } from '../hooks/useEstadoPersistente';
import { abrirWhatsApp, mensajeIngresos } from '../mensajes';
import { num, personasIniciales, sanearPersonas } from '../personas';
import { MAX_MONTO, MAX_TEXTO, errorDeMonto } from '../validacion';
import { Aviso, Campo, Fila, ListaPersonas, Resultado } from './comunes';

export default function SegunIngresos() {
  const [total, setTotal] = useEstadoPersistente('ingresos:total', '');
  const [motivo, setMotivo] = useEstadoPersistente('ingresos:motivo', '');
  const [personas, setPersonas] = useEstadoPersistente('ingresos:personas', personasIniciales, sanearPersonas);

  const ingresos = personas.map((p) => num(p.valor));
  const error =
    errorDeMonto(total, 'El gasto total') ||
    personas.map((p, i) => errorDeMonto(p.valor, `El ingreso de ${p.nombre || `la persona ${i + 1}`}`)).find(Boolean) ||
    null;
  const ingresosValidos = ingresos.every((i) => i > 0);
  const listo = num(total) > 0 && ingresosValidos && !error;
  const { montos, porcentajes, esfuerzo } = dividirPorIngresos(num(total), ingresos);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Quien gana más pone más: cada uno aporta el mismo porcentaje de su ingreso.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Campo etiqueta="Motivo (opcional)">
          <input className={`${campo} w-full`} maxLength={MAX_TEXTO} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Alquiler y expensas" />
        </Campo>
        <Campo etiqueta="Gasto total">
          <input type="number" min="0" max={MAX_MONTO} className={`${campo} w-full`} value={total} onChange={(e) => setTotal(e.target.value)} />
        </Campo>
      </div>
      <ListaPersonas personas={personas} setPersonas={setPersonas} etiquetaValor="Ingreso" />
      {error && <Aviso>{error}</Aviso>}
      {!error && num(total) > 0 && !ingresosValidos && (
        <p role="alert" className="text-xs text-amber-700 font-medium">Cargá el ingreso de cada persona (mayor a 0).</p>
      )}
      {listo && (
        <Resultado
          onCompartir={() =>
            abrirWhatsApp(mensajeIngresos({ motivo, total: num(total), personas, ingresos, montos, porcentajes, esfuerzo }))
          }
        >
          {personas.map((p, i) => (
            <Fila
              key={p.id}
              izq={p.nombre}
              sub={`Ingresos ${formatoPesos(ingresos[i])} (${porcentajes[i].toFixed(1)}%)`}
              der={formatoPesos(montos[i])}
            />
          ))}
          <p className="text-xs text-gray-600 pt-1 text-center font-medium">
            <span aria-hidden="true">📊 </span>Esfuerzo parejo: todos destinan el {esfuerzo.toFixed(1)}% de sus ingresos.
          </p>
        </Resultado>
      )}
    </div>
  );
}
