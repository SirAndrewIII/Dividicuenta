import { formatoPesos } from './calculos';

const url = (mensaje) => `https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`;

export function abrirWhatsApp(mensaje) {
  window.open(url(mensaje), '_blank', 'noopener');
}

export function mensajeConsumo(comensales, propina, granTotal, sinAsignar = 0) {
  const bloques = comensales.map((c) => {
    const lineas = [`👤 *${c.nombre}*`];
    c.items.forEach((item) => {
      const subItem = (Number(item.cantidad) || 0) * (Number(item.valorUnitario) || 0);
      lineas.push(` - ${item.cantidad}x ${item.nombre} (${formatoPesos(subItem)})`);
    });
    c.detalleCompartido.forEach((comp) => {
      lineas.push(` - [Compartido] ${comp.nombre} (${formatoPesos(comp.monto)})`);
    });
    if (c.items.length === 0 && c.detalleCompartido.length === 0) {
      lineas.push(' - Sin consumos registrados');
    }
    lineas.push(
      ` 🔸 Subtotal: ${formatoPesos(c.subtotal)}`,
      ` 🔸 Propina (${propina || 0}%): ${formatoPesos(c.propinaValor)}`,
      ` ✅ *Total a pagar: ${formatoPesos(c.total)}*`,
    );
    return lineas.join('\n');
  });

  return [
    '🧾 *RESUMEN DE CUENTA - DividiCuenta* 🧾',
    '',
    bloques.join('\n\n'),
    '',
    '━━━━━━━━━━━━━━━━━━━',
    `💰 *GRAN TOTAL FACTURA: ${formatoPesos(granTotal)}*`,
    ...(sinAsignar > 0 ? [`⚠️ Sin asignar (platos compartidos sin participantes): ${formatoPesos(sinAsignar)}`] : []),
  ].join('\n');
}

export function mensajeIguales({ motivo, total, propina, personas, montos }) {
  return [
    `🧾 *${motivo.trim() || 'Cuenta'} - DividiCuenta*`,
    `💰 Total: ${formatoPesos(total)}${propina ? ` (con ${propina}% de propina)` : ''}`,
    '',
    ...personas.map((p, i) => `• *${p.nombre}*: ${formatoPesos(montos[i])}`),
  ].join('\n');
}

// Los ingresos individuales son datos sensibles: solo se incluyen si el usuario lo pide.
export function mensajeIngresos({ motivo, total, personas, ingresos, montos, porcentajes, esfuerzo, incluirIngresos = false }) {
  return [
    '🏠 *División justa según ingresos - DividiCuenta*',
    `📝 Motivo: ${motivo.trim() || 'Gastos compartidos'}`,
    `💰 Gasto total: ${formatoPesos(total)}`,
    '',
    ...personas.map((p, i) => {
      const detalle = incluirIngresos
        ? `${porcentajes[i].toFixed(1)}% | ingresos ${formatoPesos(ingresos[i])}`
        : `${porcentajes[i].toFixed(1)}%`;
      return `• *${p.nombre}*: pone ${formatoPesos(montos[i])} (${detalle})`;
    }),
    '',
    `📊 Esfuerzo parejo: todos destinan el ${esfuerzo.toFixed(1)}% de lo que ganan.`,
  ].join('\n');
}

export function mensajeCruzados({ motivo, total, cantidad, transferencias }) {
  return [
    `💸 *${motivo.trim() || 'Ajuste de cuentas'} - DividiCuenta*`,
    `💰 Total gastado: ${formatoPesos(total)} (${formatoPesos(total / cantidad)} c/u)`,
    '',
    ...(transferencias.length
      ? transferencias.map((t) => `• ${t.de} le debe ${formatoPesos(t.monto)} a ${t.a}`)
      : ['✅ Están a mano, nadie debe nada.']),
  ].join('\n');
}
