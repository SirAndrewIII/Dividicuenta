import React from 'react';
import { dividirIgual, formatoPesos, saldarDeudas } from '../calculos';
import { campo } from '../estilos';
import { useEstadoPersistente } from '../hooks/useEstadoPersistente';
import { abrirWhatsApp, mensajeCruzados } from '../mensajes';
import { num, personasIniciales } from '../personas';
import { Campo, Fila, ListaPersonas, Resultado } from './comunes';

export default function QuienPagoQue() {
  const [motivo, setMotivo] = useEstadoPersistente('cruzados:motivo', '');
  const [personas, setPersonas] = useEstadoPersistente('cruzados:personas', personasIniciales);

  const pagos = personas.map((p) => num(p.valor));
  const total = pagos.reduce((a, b) => a + b, 0);
  const porPersona = dividirIgual(total, personas.length);
  const transferencias = saldarDeudas(
    personas.map((p, i) => ({ nombre: p.nombre, pagado: pagos[i], corresponde: porPersona[i] })),
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Anotá cuánto pagó cada uno (alquiler, super, luz...) y te decimos quién le transfiere a quién para
        quedar a mano.
      </p>
      <Campo etiqueta="Motivo (opcional)">
        <input className={`${campo} w-full`} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Gastos del viaje" />
      </Campo>
      <ListaPersonas personas={personas} setPersonas={setPersonas} etiquetaValor="Pagó" />
      {total > 0 && (
        <Resultado
          onCompartir={() =>
            abrirWhatsApp(mensajeCruzados({ motivo, total, cantidad: personas.length, transferencias }))
          }
        >
          <div className="flex justify-between font-bold">
            <span>Total gastado:</span>
            <span>{formatoPesos(total)}</span>
          </div>
          <p className="text-xs text-gray-500">A cada uno le toca {formatoPesos(total / personas.length)}.</p>
          {transferencias.length === 0 ? (
            <p className="font-semibold text-emerald-700"><span aria-hidden="true">✅ </span>Están a mano, nadie debe nada.</p>
          ) : (
            transferencias.map((t, i) => (
              <Fila key={i} izq={`${t.de} → ${t.a}`} der={formatoPesos(t.monto)} />
            ))
          )}
        </Resultado>
      )}
    </div>
  );
}
