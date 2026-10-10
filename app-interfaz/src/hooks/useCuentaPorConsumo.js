import { calcularCuentaPorConsumo, normalizarMenu } from '../calculos';
import { generarId } from '../ids';
import { useEstadoPersistente } from './useEstadoPersistente';

const MAX_COMENSALES = 15;

const cambiarComensal = (comensales, id, cambio) =>
  comensales.map((c) => (c.id === id ? cambio(c) : c));

// Estado y operaciones del modo «Por consumo». Todo lo que el usuario carga
// se guarda en el navegador (ver useEstadoPersistente).
export function useCuentaPorConsumo() {
  const [comensales, setComensales] = useEstadoPersistente('comensales', []);
  const [compartidos, setCompartidos] = useEstadoPersistente('compartidos', []);
  const [propina, setPropina] = useEstadoPersistente('propina', 10);
  const [seleccionadoId, setSeleccionadoId] = useEstadoPersistente('comensalSeleccionadoId', null);
  const [menuGuardado, setMenu] = useEstadoPersistente('menuRestaurante', null);

  const agregarComensal = (nombre) => {
    const limpio = nombre.trim();
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
    setComensales(cambiarComensal(comensales, id, (c) => ({ ...c, nombre })));

  // Agrega uno o varios platos al comensal seleccionado.
  const agregarItems = (items) => {
    if (items.length === 0 || !seleccionadoId) return false;
    const nuevos = items.map((item) => ({ id: generarId(), ...item }));
    setComensales(cambiarComensal(comensales, seleccionadoId, (c) => ({ ...c, items: [...c.items, ...nuevos] })));
    return true;
  };

  const eliminarItem = (comensalId, itemId) =>
    setComensales(
      cambiarComensal(comensales, comensalId, (c) => ({ ...c, items: c.items.filter((i) => i.id !== itemId) })),
    );

  const modificarItem = (comensalId, itemId, campo, valor) =>
    setComensales(
      cambiarComensal(comensales, comensalId, (c) => ({
        ...c,
        items: c.items.map((i) =>
          i.id === itemId ? { ...i, [campo]: campo === 'nombre' ? valor : valor === '' ? '' : Number(valor) } : i,
        ),
      })),
    );

  const agregarCompartido = ({ nombre, valorTotal, comensalesIds }) => {
    setCompartidos([...compartidos, { id: generarId(), nombre, valorTotal, comensalesIds }]);
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
    agregarCompartido,
    eliminarCompartido,
    cambiarPropina,
    reiniciar,
  };
}
