import React from 'react';
import { useEstadoPersistente } from './useEstadoPersistente';
import { dividirIgual, dividirPorIngresos, saldarDeudas, formatoPesos } from './calculos';

const MAX_PERSONAS = 15;
const inputCls =
  'border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';
const btnCls =
  'bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-xl transition shadow-sm';

const nuevaPersona = (n) => ({ id: Date.now() + n, nombre: `Persona ${n}`, valor: '' });
const num = (v) => parseFloat(v) || 0;

function enviarWhatsApp(mensaje) {
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`, '_blank');
}

// Lista editable de personas; `etiquetaValor` activa una segunda columna numérica.
function ListaPersonas({ personas, setPersonas, etiquetaValor }) {
  const cambiar = (id, campo, valor) =>
    setPersonas(personas.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)));

  return (
    <div className="space-y-2">
      {personas.map((p) => (
        <div key={p.id} className="flex gap-2 items-center">
          <input
            type="text"
            value={p.nombre}
            onChange={(e) => cambiar(p.id, 'nombre', e.target.value)}
            className={`${inputCls} flex-1 min-w-0`}
          />
          {etiquetaValor && (
            <input
              type="number"
              min="0"
              placeholder={etiquetaValor}
              value={p.valor}
              onChange={(e) => cambiar(p.id, 'valor', e.target.value)}
              className={`${inputCls} w-32`}
            />
          )}
          <button
            onClick={() => setPersonas(personas.filter((x) => x.id !== p.id))}
            disabled={personas.length <= 2}
            className="text-red-700 hover:text-red-800 disabled:opacity-30 font-bold px-2 text-lg"
            aria-label="Eliminar persona"
          >
            ×
          </button>
        </div>
      ))}
      {personas.length < MAX_PERSONAS && (
        <button
          onClick={() => setPersonas([...personas, nuevaPersona(personas.length + 1)])}
          className="w-full py-2 border border-emerald-500/60 text-sm font-bold rounded-xl hover:bg-emerald-50 transition"
        >
          + Sumar otra persona
        </button>
      )}
    </div>
  );
}

function Campo({ etiqueta, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-gray-700">{etiqueta}</span>
      {children}
    </label>
  );
}

function Resultado({ children, onCompartir }) {
  return (
    <div className="space-y-3">
      <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100 space-y-2 text-sm">
        {children}
      </div>
      <button onClick={onCompartir} className={`${btnCls} w-full py-3 text-sm`}>
        Enviar por WhatsApp
      </button>
    </div>
  );
}

const Fila = ({ izq, der, sub }) => (
  <div className="flex justify-between items-center border-b border-emerald-100/60 pb-2">
    <div>
      <span className="font-semibold text-gray-800">{izq}</span>
      {sub && <span className="text-xs text-gray-500 block">{sub}</span>}
    </div>
    <span className="font-bold text-emerald-700">{der}</span>
  </div>
);

const personasIniciales = () => [nuevaPersona(1), nuevaPersona(2)];

// ---------- Partes iguales ----------
export function PartesIguales() {
  const [total, setTotal] = useEstadoPersistente('iguales:total', '');
  const [motivo, setMotivo] = useEstadoPersistente('iguales:motivo', '');
  const [propina, setPropina] = useEstadoPersistente('iguales:propina', 0);
  const [personas, setPersonas] = useEstadoPersistente('iguales:personas', personasIniciales);

  const totalConPropina = num(total) * (1 + num(propina) / 100);
  const montos = dividirIgual(totalConPropina, personas.length);
  const listo = num(total) > 0;

  const compartir = () => {
    const lineas = [
      `🧾 *${motivo.trim() || 'Cuenta'} - DividiCuenta*`,
      `💰 Total: ${formatoPesos(totalConPropina)}${num(propina) ? ` (con ${num(propina)}% de propina)` : ''}`,
      '',
      ...personas.map((p, i) => `• *${p.nombre}*: ${formatoPesos(montos[i])}`),
    ];
    enviarWhatsApp(lineas.join('\n'));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Ingresá el total y entre cuántos se reparte. Todos ponen lo mismo.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Campo etiqueta="Motivo (opcional)">
          <input className={`${inputCls} w-full`} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Asado del sábado" />
        </Campo>
        <Campo etiqueta="Total de la cuenta">
          <input type="number" min="0" className={`${inputCls} w-full`} value={total} onChange={(e) => setTotal(e.target.value)} />
        </Campo>
        <Campo etiqueta="Propina (%)">
          <input type="number" min="0" max="100" className={`${inputCls} w-full`} value={propina} onChange={(e) => setPropina(e.target.value)} />
        </Campo>
      </div>
      <ListaPersonas personas={personas} setPersonas={setPersonas} />
      {listo && (
        <Resultado onCompartir={compartir}>
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

// ---------- Según ingresos ----------
export function SegunIngresos() {
  const [total, setTotal] = useEstadoPersistente('ingresos:total', '');
  const [motivo, setMotivo] = useEstadoPersistente('ingresos:motivo', '');
  const [personas, setPersonas] = useEstadoPersistente('ingresos:personas', personasIniciales);

  const ingresos = personas.map((p) => num(p.valor));
  const ingresosValidos = ingresos.every((i) => i > 0);
  const listo = num(total) > 0 && ingresosValidos;
  const { montos, porcentajes, esfuerzo } = dividirPorIngresos(num(total), ingresos);

  const compartir = () => {
    const lineas = [
      '🏠 *División justa según ingresos - DividiCuenta*',
      `📝 Motivo: ${motivo.trim() || 'Gastos compartidos'}`,
      `💰 Gasto total: ${formatoPesos(num(total))}`,
      '',
      ...personas.map(
        (p, i) => `• *${p.nombre}*: pone ${formatoPesos(montos[i])} (${porcentajes[i].toFixed(1)}% | ingresos ${formatoPesos(ingresos[i])})`,
      ),
      '',
      `📊 Esfuerzo parejo: todos destinan el ${esfuerzo.toFixed(1)}% de lo que ganan.`,
    ];
    enviarWhatsApp(lineas.join('\n'));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Quien gana más pone más: cada uno aporta el mismo porcentaje de su ingreso.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Campo etiqueta="Motivo (opcional)">
          <input className={`${inputCls} w-full`} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Alquiler y expensas" />
        </Campo>
        <Campo etiqueta="Gasto total">
          <input type="number" min="0" className={`${inputCls} w-full`} value={total} onChange={(e) => setTotal(e.target.value)} />
        </Campo>
      </div>
      <ListaPersonas personas={personas} setPersonas={setPersonas} etiquetaValor="Ingreso" />
      {num(total) > 0 && !ingresosValidos && (
        <p className="text-xs text-amber-700 font-medium">Cargá el ingreso de cada persona (mayor a 0).</p>
      )}
      {listo && (
        <Resultado onCompartir={compartir}>
          {personas.map((p, i) => (
            <Fila
              key={p.id}
              izq={p.nombre}
              sub={`Ingresos ${formatoPesos(ingresos[i])} (${porcentajes[i].toFixed(1)}%)`}
              der={formatoPesos(montos[i])}
            />
          ))}
          <p className="text-xs text-gray-600 pt-1 text-center font-medium">
            📊 Esfuerzo parejo: todos destinan el {esfuerzo.toFixed(1)}% de sus ingresos.
          </p>
        </Resultado>
      )}
    </div>
  );
}

// ---------- Quién pagó qué (gastos cruzados) ----------
export function QuienPagoQue() {
  const [motivo, setMotivo] = useEstadoPersistente('cruzados:motivo', '');
  const [personas, setPersonas] = useEstadoPersistente('cruzados:personas', personasIniciales);

  const pagos = personas.map((p) => num(p.valor));
  const total = pagos.reduce((a, b) => a + b, 0);
  const porPersona = dividirIgual(total, personas.length);
  const transferencias = saldarDeudas(
    personas.map((p, i) => ({ nombre: p.nombre, pagado: pagos[i], corresponde: porPersona[i] })),
  );

  const compartir = () => {
    const lineas = [
      `💸 *${motivo.trim() || 'Ajuste de cuentas'} - DividiCuenta*`,
      `💰 Total gastado: ${formatoPesos(total)} (${formatoPesos(total / personas.length)} c/u)`,
      '',
      ...(transferencias.length
        ? transferencias.map((t) => `• ${t.de} le debe ${formatoPesos(t.monto)} a ${t.a}`)
        : ['✅ Están a mano, nadie debe nada.']),
    ];
    enviarWhatsApp(lineas.join('\n'));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Anotá cuánto pagó cada uno (alquiler, super, luz...) y te decimos quién le transfiere a quién para
        quedar a mano.
      </p>
      <Campo etiqueta="Motivo (opcional)">
        <input className={`${inputCls} w-full`} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Gastos del viaje" />
      </Campo>
      <ListaPersonas personas={personas} setPersonas={setPersonas} etiquetaValor="Pagó" />
      {total > 0 && (
        <Resultado onCompartir={compartir}>
          <div className="flex justify-between font-bold">
            <span>Total gastado:</span>
            <span>{formatoPesos(total)}</span>
          </div>
          <p className="text-xs text-gray-500">A cada uno le toca {formatoPesos(total / personas.length)}.</p>
          {transferencias.length === 0 ? (
            <p className="font-semibold text-emerald-700">✅ Están a mano, nadie debe nada.</p>
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
