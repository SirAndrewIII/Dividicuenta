import { calcularCuentaPorConsumo, normalizarMenu } from '../calculos';
import { generarId } from '../ids';
import {
  MAX_NOMBRE,
  MAX_TEXTO,
  PROPINA_INICIAL,
  esCantidadValida,
  esMontoValido,
  sanearComensales,
  sanearCompartidos,
  sanearPropina,
} from '../validacion';
import { useEstadoPersistente } from './useEstadoPersistente';

const MAX_COMENSALES = 15;

const cambiarComensal = (comensales, id, cambio) =>
  comensales.map((c) => (c.id === id ? cambio(c) : c));

// Estado y operaciones del modo «Por consumo». Todo lo que el usuario carga
// se guarda en el navegador (ver useEstadoPersistente).
export function useCuentaPorConsumo() {
  const [comensales, setComensales] = useEstadoPersistente('comensales', [], sanearComensales);
  const [compartidos, setCompartidos] = useEstadoPersistente('compartidos', [], sanearCompartidos);
  const [propina, setPropina] = useEstadoPersistente('propina', PROPINA_INICIAL, sanearPropina);
  const [seleccionadoId, setSeleccionadoId] = useEstadoPersistente('comensalSeleccionadoId', null);
  const [menuGuardado, setMenu] = useEstadoPersistente('menuRestaurante', null);

  const agregarComensal = (nombre) => {
    const limpio = nombre.trim().slice(0, MAX_NOMBRE);
    if (!limpio || comensales.length >= MAX_COMENSALES) return false;
    const id = generarId();
    setComensales([...comensales, { id, nombre: limpio, items: [] }]);
    if (comensales.length === 0) setSeleccionadoId(id);
    return true;
  };

  const eliminarComensal = (id) => {
    const restantes = comensales.filter((c) => c.id !== id);
    setComensales(restantes);
    if (restantes.length === 0) setSeleccionadoId(null);
    else if (seleccionadoId === id) setSeleccionadoId(restantes[0].id);
    setCompartidos(
      compartidos.map((comp) => ({
        ...comp,
        comensalesIds: comp.comensalesIds.filter((cid) => cid !== id),
      })),
    );
  };

  const renombrarComensal = (id, nombre) =>
    setComensales(cambiarComensal(comensales, id, (c) => ({ ...c, nombre: nombre.slice(0, MAX_NOMBRE) })));

  // Agrega uno o varios platos al comensal seleccionado. Rechaza todo el lote
  // si algún plato tiene cantidad o precio fuera de los límites.
  const agregarItems = (items) => {
    if (items.length === 0 || !seleccionadoId) return false;
    if (!items.every((i) => esCantidadValida(i.cantidad) && esMontoValido(i.valorUnitario))) return false;
    const nuevos = items.map((item) => ({ id: generarId(), ...item }));
    setComensales(cambiarComensal(comensales, seleccionadoId, (c) => ({ ...c, items: [...c.items, ...nuevos] })));
    return true;
  };

  const eliminarItem = (comensalId, itemId) =>
    setComensales(
      cambiarComensal(comensales, comensalId, (c) => ({ ...c, items: c.items.filter((i) => i.id !== itemId) })),
    );

  // Edición de un plato. Un valor fuera de los límites se ignora (el campo
  // conserva el anterior); el campo vacío se admite mientras se escribe y se
  // corrige en confirmarItem al salir del campo.
  const modificarItem = (comensalId, itemId, campo, valor) => {
    let nuevo = valor;
    if (campo === 'nombre') {
      nuevo = String(valor).slice(0, MAX_TEXTO);
    } else if (valor !== '') {
      nuevo = Number(valor);
      const valido = campo === 'cantidad' ? esCantidadValida(nuevo) : esMontoValido(nuevo);
      if (!valido) return;
    }
    setComensales(
      cambiarComensal(comensales, comensalId, (c) => ({
        ...c,
        items: c.items.map((i) => (i.id === itemId ? { ...i, [campo]: nuevo } : i)),
      })),
    );
  };

  // Al salir del campo: cantidad vacía vuelve a 1 y precio vacío a 0.
  const confirmarItem = (comensalId, itemId) =>
    setComensales(
      cambiarComensal(comensales, comensalId, (c) => ({
        ...c,
        items: c.items.map((i) =>
          i.id === itemId
            ? { ...i, cantidad: i.cantidad === '' ? 1 : i.cantidad, valorUnitario: i.valorUnitario === '' ? 0 : i.valorUnitario }
            : i,
        ),
      })),
    );

  const agregarCompartido = ({ nombre, valorTotal, comensalesIds }) => {
    if (!esMontoValido(valorTotal) || comensalesIds.length === 0) return false;
    setCompartidos([...compartidos, { id: generarId(), nombre: nombre.slice(0, MAX_TEXTO), valorTotal, comensalesIds }]);
    return true;
  };

  const eliminarCompartido = (id) => setCompartidos(compartidos.filter((c) => c.id !== id));

  const cambiarPropina = (texto) => {
    if (texto === '') return setPropina('');
    const n = parseInt(texto, 10);
    if (n >= 0 && n <= 100) setPropina(n);
  };

  const reiniciar = () => {
    setComensales([]);
    setCompartidos([]);
    setPropina(10);
    setSeleccionadoId(null);
    setMenu(null);
  };

  const cuenta = calcularCuentaPorConsumo(comensales, compartidos, propina);

  return {
    comensales,
    compartidos,
    propina,
    seleccionadoId,
    // También valida lo que quedó guardado de sesiones anteriores
    menu: normalizarMenu(menuGuardado),
    hayDatos: comensales.length > 0 || menuGuardado !== null,
    comensalesCalculados: comensales.map((c, i) => ({ ...c, ...cuenta.porComensal[i] })),
    granTotal: cuenta.total,
    setSeleccionadoId,
    setMenu,
    agregarComensal,
    eliminarComensal,
    renombrarComensal,
    agregarItems,
    eliminarItem,
    modificarItem,
    confirmarItem,
    agregarCompartido,
    eliminarCompartido,
    cambiarPropina,
    reiniciar,
  };
}
