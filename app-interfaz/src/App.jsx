import React, { useState } from 'react';
import { PartesIguales, SegunIngresos, QuienPagoQue } from './ModosSimples';
import { parsearConsumos, calcularCuentaPorConsumo, normalizarMenu, formatoPesos } from './calculos';
import { useEstadoPersistente } from './useEstadoPersistente';

const MODOS = [
  { id: 'consumo', etiqueta: '🍽️ Por consumo' },
  { id: 'iguales', etiqueta: '➗ Partes iguales' },
  { id: 'ingresos', etiqueta: '⚖️ Según ingresos' },
  { id: 'cruzados', etiqueta: '💸 Quién pagó qué' },
];

export default function DividiCuentaApp() {
  const [modo, setModo] = useEstadoPersistente('modo', 'consumo');
  // --- ESTADOS PRINCIPALES (INICIALIZADOS VACÍOS) ---
  const [comensales, setComensales] = useEstadoPersistente('comensales', []);
  const [compartidos, setCompartidos] = useEstadoPersistente('compartidos', []);

  const [nuevoComensal, setNuevoComensal] = useState('');
  const [propina, setPropina] = useEstadoPersistente('propina', 10);

  // Estados temporales para consumo individual
  const [itemNombre, setItemNombre] = useState('');
  const [itemCantidad, setItemCantidad] = useState(1);
  const [itemValor, setItemValor] = useState('');
  const [comensalSeleccionadoId, setComensalSeleccionadoId] = useEstadoPersistente('comensalSeleccionadoId', null);
  const [cargaEnLote, setCargaEnLote] = useState(false);
  const [textoLote, setTextoLote] = useState('');

  // Estados temporales para plato compartido
  const [compNombre, setCompNombre] = useState('');
  const [compValor, setCompValor] = useState('');
  const [compIdsSeleccionados, setCompIdsSeleccionados] = useState([]);

  // Estados para digitalización con IA
  const [menuRestaurante, setMenuRestaurante] = useEstadoPersistente('menuRestaurante', null);
  const [cargandoMenu, setCargandoMenu] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [confirmandoReinicio, setConfirmandoReinicio] = useState(false);

  // --- FUNCIONES DE COMENSALES ---
  const agregarComensal = () => {
    if (nuevoComensal.trim() && comensales.length < 15) {
      const nuevoId = Date.now();
      const actualizados = [...comensales, { id: nuevoId, nombre: nuevoComensal.trim(), items: [] }];
      setComensales(actualizados);
      setNuevoComensal('');
      if (comensales.length === 0) setComensalSeleccionadoId(nuevoId);
    }
  };

  const eliminarComensal = (id) => {
    const filtrados = comensales.filter(c => c.id !== id);
    setComensales(filtrados);
    if (comensalSeleccionadoId === id && filtrados.length > 0) {
      setComensalSeleccionadoId(filtrados[0].id);
    } else if (filtrados.length === 0) {
      setComensalSeleccionadoId(null);
    }
    setCompartidos(compartidos.map(comp => ({
      ...comp,
      comensalesIds: comp.comensalesIds.filter(cid => cid !== id)
    })));
  };

  const modificarNombreComensal = (id, nuevoNombre) => {
    setComensales(comensales.map(c => c.id === id ? { ...c, nombre: nuevoNombre } : c));
  };

  // --- FUNCIONES DE ÍTEMS INDIVIDUALES ---
  const agregarItemAComensal = () => {
    if (!itemNombre.trim() || !itemValor || isNaN(itemValor) || !comensalSeleccionadoId) return;

    const valorNum = parseFloat(itemValor);
    const cantNum = parseInt(itemCantidad, 10) || 1;

    setComensales(comensales.map(comensal => {
      if (comensal.id === comensalSeleccionadoId) {
        return {
          ...comensal,
          items: [
            ...comensal.items,
            {
              id: Date.now(),
              nombre: itemNombre.trim(),
              cantidad: cantNum,
              valorUnitario: valorNum
            }
          ]
        };
      }
      return comensal;
    }));

    setItemNombre('');
    setItemCantidad(1);
    setItemValor('');
  };

  const loteParseado = parsearConsumos(textoLote);

  const agregarLoteAComensal = () => {
    if (loteParseado.items.length === 0 || !comensalSeleccionadoId) return;
    const base = Date.now();
    const nuevos = loteParseado.items.map((item, i) => ({ id: base + i, ...item }));
    setComensales(comensales.map(c =>
      c.id === comensalSeleccionadoId ? { ...c, items: [...c.items, ...nuevos] } : c
    ));
    setTextoLote('');
  };

  const eliminarItemDeComensal = (comensalId, itemId) => {
    setComensales(comensales.map(comensal => {
      if (comensal.id === comensalId) {
        return {
          ...comensal,
          items: comensal.items.filter(item => item.id !== itemId)
        };
      }
      return comensal;
    }));
  };

  const modificarItemDeComensal = (comensalId, itemId, campo, valor) => {
    setComensales(comensales.map(comensal => {
      if (comensal.id === comensalId) {
        return {
          ...comensal,
          items: comensal.items.map(item => {
            if (item.id === itemId) {
              return {
                ...item,
                [campo]: campo === 'nombre' ? valor : (valor === '' ? '' : Number(valor))
              };
            }
            return item;
          })
        };
      }
      return comensal;
    }));
  };

  // --- FUNCIONES DE ÍTEMS COMPARTIDOS ---
  const toggleCheckboxCompartido = (idComensal) => {
    if (compIdsSeleccionados.includes(idComensal)) {
      setCompIdsSeleccionados(compIdsSeleccionados.filter(id => id !== idComensal));
    } else {
      setCompIdsSeleccionados([...compIdsSeleccionados, idComensal]);
    }
  };

  const agregarPlatoCompartido = () => {
    if (!compNombre.trim() || !compValor || isNaN(compValor) || compIdsSeleccionados.length === 0) return;

    const nuevoComp = {
      id: Date.now(),
      nombre: compNombre.trim(),
      valorTotal: parseFloat(compValor),
      comensalesIds: [...compIdsSeleccionados]
    };

    setCompartidos([...compartidos, nuevoComp]);
    setCompNombre('');
    setCompValor('');
    setCompIdsSeleccionados([]);
  };

  const eliminarPlatoCompartido = (id) => {
    setCompartidos(compartidos.filter(c => c.id !== id));
  };

  // --- DIGITALIZACIÓN CON IA ---
  const manejarSubidaCarta = async (e) => {
    const archivo = e.target.files[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (!archivo) return;

    const formData = new FormData();
    formData.append("file", archivo);

    setAviso(null);
    setCargandoMenu(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/parse-menu`, {
        method: "POST",
        body: formData,
      });
      const datos = await response.json().catch(() => ({}));
      const menu = response.ok && datos.status === "success" ? normalizarMenu(datos.menu) : null;

      if (menu) {
        setMenuRestaurante(menu);
        document.getElementById('seccion-menu-ia')?.scrollIntoView({ behavior: 'smooth' });
      } else if (response.ok) {
        setAviso("No pudimos leer platos en esa imagen. Prueba con una foto más nítida y de frente.");
      } else {
        setAviso(typeof datos.detail === 'string' ? datos.detail : "No se pudo procesar la carta. Intenta de nuevo.");
      }
    } catch (error) {
      console.error("Error al subir el menú:", error);
      setAviso("No pudimos conectar con el servicio de escaneo. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setCargandoMenu(false);
    }
  };

  const seleccionarPlatoDelMenu = (plato) => {
    setItemNombre(plato.nombre);
    setItemValor(plato.precio);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const manejarPropinaChange = (e) => {
    const valor = e.target.value;
    if (valor === '') {
      setPropina('');
      return;
    }
    const num = parseInt(valor, 10);
    if (num >= 0 && num <= 100) {
      setPropina(num);
    }
  };

  const reiniciarTodo = () => {
    setComensales([]);
    setCompartidos([]);
    setNuevoComensal('');
    setPropina(10);
    setItemNombre('');
    setItemCantidad(1);
    setItemValor('');
    setComensalSeleccionadoId(null);
    setCompNombre('');
    setCompValor('');
    setCompIdsSeleccionados([]);
    setMenuRestaurante(null);
    setAviso(null);
    setConfirmandoReinicio(false);
  };

  // También valida lo que quedó guardado de sesiones anteriores
  const menuSeguro = normalizarMenu(menuRestaurante);

  const cuenta = calcularCuentaPorConsumo(comensales, compartidos, propina);
  const comensalesCalculados = comensales.map((c, i) => ({ ...c, ...cuenta.porComensal[i] }));
  const granTotal = cuenta.total;

  const compartirWhatsApp = () => {
    if (comensalesCalculados.length === 0) return;

    let mensaje = `🧾 *RESUMEN DE CUENTA - DividiCuenta* 🧾

`;

    comensalesCalculados.forEach(c => {
      mensaje += `👤 *${c.nombre}*
`;

      c.items.forEach(item => {
        const subItem = (Number(item.cantidad) || 0) * (Number(item.valorUnitario) || 0);
        mensaje += ` - ${item.cantidad}x ${item.nombre} (${formatoPesos(subItem)})
`;
      });

      c.detalleCompartido.forEach(comp => {
        mensaje += ` - [Compartido] ${comp.nombre} (${formatoPesos(comp.monto)})
`;
      });

      if (c.items.length === 0 && c.detalleCompartido.length === 0) {
        mensaje += ` - Sin consumos registrados
`;
      }

      mensaje += ` 🔸 Subtotal: ${formatoPesos(c.subtotal)}
`;
      mensaje += ` 🔸 Propina (${propina || 0}%): ${formatoPesos(c.propinaValor)}
`;
      mensaje += ` ✅ *Total a pagar: ${formatoPesos(c.total)}*

`;
    });

    mensaje += `━━━━━━━━━━━━━━━━━━━
`;
    mensaje += `💰 *GRAN TOTAL FACTURA: ${formatoPesos(granTotal)}*`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-6 font-sans text-gray-800 flex justify-center items-start">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden pb-10 border border-gray-100">
        
        {/* Encabezado */}
        <div className="bg-emerald-700 p-6 text-white text-center rounded-b-3xl shadow-md relative">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-wide">DividiCuenta</h1>
          <p className="text-emerald-100 text-sm mt-1">Cuentas claras, amistades largas</p>
          {(comensales.length > 0 || menuRestaurante) && (
            <button 
              onClick={() => setConfirmandoReinicio(true)}
              className="absolute top-4 right-4 bg-emerald-800 hover:bg-emerald-900 text-emerald-100 hover:text-white text-xs px-3 py-2 rounded-xl font-medium transition"
            >
              Reiniciar
            </button>
          )}
        </div>

        {confirmandoReinicio && (
          <div role="alertdialog" aria-label="Confirmar reinicio" className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <span>¿Borrar todo lo cargado y empezar de cero?</span>
            <span className="flex gap-2">
              <button onClick={reiniciarTodo} className="rounded-lg bg-red-700 px-3 py-1.5 font-medium text-white hover:bg-red-800">Sí, borrar todo</button>
              <button onClick={() => setConfirmandoReinicio(false)} className="rounded-lg border border-red-300 bg-white px-3 py-1.5 font-medium text-red-800 hover:bg-red-100">Cancelar</button>
            </span>
          </div>
        )}

        {/* Selector de forma de dividir */}
        <div className="flex gap-2 overflow-x-auto px-4 pt-4 pb-1" role="tablist">
          {MODOS.map(m => (
            <button
              key={m.id}
              role="tab"
              aria-selected={modo === m.id}
              onClick={() => setModo(m.id)}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium border transition ${
                modo === m.id
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
              }`}
            >
              {m.etiqueta}
            </button>
          ))}
        </div>

        {/* Los modos quedan montados (ocultos) para no perder lo cargado al cambiar de pestaña */}
        <div className="p-6" hidden={modo !== 'iguales'}><PartesIguales /></div>
        <div className="p-6" hidden={modo !== 'ingresos'}><SegunIngresos /></div>
        <div className="p-6" hidden={modo !== 'cruzados'}><QuienPagoQue /></div>

        {modo === 'consumo' && (<>
        {/* Sección de Escaneo de Carta con IA */}
        <div className="p-6 border-b border-gray-100 bg-emerald-50/50">
          <h2 className="text-lg font-semibold text-emerald-800 mb-2">Escanear Menú con IA</h2>
          <p className="text-sm text-gray-600 mb-4">Sube una foto de la carta del restaurante para extraer los platos por categorías automáticamente.</p>
          
          <div className="flex items-center gap-4">
            <label className="cursor-pointer bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition shadow-sm inline-flex items-center gap-2">
              <span>📄 Subir foto de la carta</span>
              <input type="file" accept="image/*" onChange={manejarSubidaCarta} className="hidden" />
            </label>
            {cargandoMenu && <span role="status" className="text-sm text-emerald-700 font-medium animate-pulse">Analizando carta con IA...</span>}
          </div>
          {aviso && (
            <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{aviso}</p>
          )}

          {menuSeguro && (
            <div id="seccion-menu-ia" className="mt-6 bg-white p-4 rounded-xl border border-emerald-200 shadow-sm space-y-6">
              <h3 className="font-bold text-emerald-900">Menú Organizado (Haz clic en un plato para agregarlo):</h3>
              
              {menuSeguro.categorias.map((cat, idxCat) => (
                <div key={idxCat} className="space-y-3">
                  <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider border-b border-emerald-100 pb-1">
                    {cat.nombre_categoria}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {cat.items.map((plato, idxPlato) => (
                      <div 
                        key={idxPlato} 
                        onClick={() => seleccionarPlatoDelMenu(plato)}
                        className="p-3 rounded-lg border border-gray-100 hover:border-emerald-500 hover:bg-emerald-50 cursor-pointer transition flex justify-between items-center"
                      >
                        <div className="pr-2">
                          <p className="font-medium text-gray-800 text-sm">{plato.nombre}</p>
                          {plato.descripcion && <p className="text-xs text-gray-500 line-clamp-1">{plato.descripcion}</p>}
                        </div>
                        <span className="font-bold text-emerald-700 text-sm shrink-0">{formatoPesos(plato.precio)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Controles principales y Gestión de Comensales */}
        <div className="p-6 space-y-6">
          <div className="flex gap-2">
            <input 
              type="text"
              placeholder="Nombre del comensal"
              value={nuevoComensal}
              onChange={(e) => setNuevoComensal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && agregarComensal()}
              className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button 
              onClick={agregarComensal}
              className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 rounded-xl text-sm font-medium transition shadow-sm"
            >
              Agregar Comensal
            </button>
          </div>

          {/* Lista de comensales y sus consumos */}
          {comensales.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {comensales.map(comensal => (
                <div key={comensal.id} className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <input 
                      type="text" 
                      value={comensal.nombre}
                      onChange={(e) => modificarNombreComensal(comensal.id, e.target.value)}
                      className="font-bold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-emerald-500 focus:outline-none text-base w-3/4"
                    />
                    <button 
                      onClick={() => eliminarComensal(comensal.id)}
                      className="text-red-700 hover:text-red-800 text-xs font-semibold px-2 py-1"
                    >
                      Eliminar
                    </button>
                  </div>

                  {/* Ítems del comensal */}
                  <div className="space-y-2">
                    {comensal.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded-lg gap-1 sm:gap-2">
                        <input 
                          type="text" 
                          value={item.nombre}
                          onChange={(e) => modificarItemDeComensal(comensal.id, item.id, 'nombre', e.target.value)}
                          className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-emerald-500 focus:outline-none flex-1 min-w-0 text-gray-700"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <input 
                            type="number" 
                            value={item.cantidad}
                            onChange={(e) => modificarItemDeComensal(comensal.id, item.id, 'cantidad', e.target.value)}
                            className="w-10 text-center bg-white border border-gray-200 rounded px-1 text-xs"
                          />
                          <span className="text-gray-500 text-xs">x</span>
                          <input 
                            type="number" 
                            value={item.valorUnitario}
                            onChange={(e) => modificarItemDeComensal(comensal.id, item.id, 'valorUnitario', e.target.value)}
                            className="w-16 sm:w-20 text-right bg-white border border-gray-200 rounded px-1 text-xs sm:text-sm"
                          />
                          <button 
                            onClick={() => eliminarItemDeComensal(comensal.id, item.id)}
                            className="text-red-700 hover:text-red-800 font-bold px-1 text-base"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                    {comensal.items.length === 0 && (
                      <p className="text-xs text-gray-500 italic">No hay consumos individuales registrados.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <p className="text-sm text-gray-500">Agrega comensales para comenzar a registrar la cuenta.</p>
            </div>
          )}

          {/* Formulario para agregar consumo individual */}
          {comensales.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-semibold text-sm text-gray-700">Agregar Consumo Individual</h3>
                <div className="flex gap-1 text-xs">
                  {[[false, 'Un plato'], [true, 'Varios platos']].map(([valor, etiqueta]) => (
                    <button
                      key={etiqueta}
                      onClick={() => setCargaEnLote(valor)}
                      className={`px-3 py-1 rounded-lg border transition ${
                        cargaEnLote === valor
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
                      }`}
                    >
                      {etiqueta}
                    </button>
                  ))}
                </div>
              </div>

              {!cargaEnLote ? (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <select
                    value={comensalSeleccionadoId || ''}
                    onChange={(e) => setComensalSeleccionadoId(Number(e.target.value))}
                    className="border border-gray-300 rounded-lg p-2 text-sm bg-white"
                  >
                    {comensales.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Nombre del plato"
                    value={itemNombre}
                    onChange={(e) => setItemNombre(e.target.value)}
                    className="border border-gray-300 rounded-lg p-2 text-sm bg-white"
                  />
                  <input
                    type="number"
                    placeholder="Precio"
                    value={itemValor}
                    onChange={(e) => setItemValor(e.target.value)}
                    className="border border-gray-300 rounded-lg p-2 text-sm bg-white"
                  />
                  <button
                    onClick={agregarItemAComensal}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg p-2 transition shadow-sm"
                  >
                    Añadir Plato
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    value={comensalSeleccionadoId || ''}
                    onChange={(e) => setComensalSeleccionadoId(Number(e.target.value))}
                    className="border border-gray-300 rounded-lg p-2 text-sm bg-white w-full sm:w-auto"
                  >
                    {comensales.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                  <textarea
                    rows={5}
                    value={textoLote}
                    onChange={(e) => setTextoLote(e.target.value)}
                    placeholder={`Un plato por línea: cantidad, nombre y precio unitario\n2 hamburguesa 30000\npapas fritas 10000\n3x cerveza 4500`}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white font-mono"
                  />
                  {loteParseado.items.length > 0 && (
                    <ul className="text-xs text-gray-600 bg-white border border-gray-200 rounded-lg p-2 space-y-0.5">
                      {loteParseado.items.map((it, i) => (
                        <li key={i} className="flex justify-between">
                          <span>{it.cantidad}x {it.nombre}</span>
                          <span>{formatoPesos(it.cantidad * it.valorUnitario)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {loteParseado.invalidas.length > 0 && (
                    <p className="text-xs text-amber-700">
                      No entendí estas líneas (falta el precio): {loteParseado.invalidas.join(' · ')}
                    </p>
                  )}
                  <button
                    onClick={agregarLoteAComensal}
                    disabled={loteParseado.items.length === 0}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-sm font-medium rounded-lg p-2 transition shadow-sm"
                  >
                    {loteParseado.items.length > 1
                      ? `Añadir ${loteParseado.items.length} platos`
                      : 'Añadir platos'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Platos Compartidos */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
            <h3 className="font-semibold text-sm text-gray-700">Plato o Entrada Compartida</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input 
                type="text"
                placeholder="Ej. Botella de vino, Entrada"
                value={compNombre}
                onChange={(e) => setCompNombre(e.target.value)}
                className="border border-gray-300 rounded-lg p-2 text-sm bg-white"
              />
              <input 
                type="number"
                placeholder="Valor Total"
                value={compValor}
                onChange={(e) => setCompValor(e.target.value)}
                className="border border-gray-300 rounded-lg p-2 text-sm bg-white"
              />
              <button 
                onClick={agregarPlatoCompartido}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg p-2 transition shadow-sm"
              >
                Registrar Compartido
              </button>
            </div>

            {comensales.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="text-xs text-gray-500 w-full">¿Quiénes lo comparten?</span>
                {comensales.map(c => (
                  <label key={c.id} className="inline-flex items-center gap-1.5 text-xs bg-white border border-gray-200 px-2.5 py-1 rounded-lg cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={compIdsSeleccionados.includes(c.id)}
                      onChange={() => toggleCheckboxCompartido(c.id)}
                      className="rounded text-emerald-700 focus:ring-emerald-500"
                    />
                    {c.nombre}
                  </label>
                ))}
              </div>
            )}

            <div className="space-y-2 pt-2">
              {compartidos.map(comp => (
                <div key={comp.id} className="flex justify-between items-center text-sm bg-white p-2.5 rounded-lg border border-gray-200">
                  <div>
                    <span className="font-medium text-gray-800">{comp.nombre}</span>
                    <span className="text-gray-500 text-xs ml-2">({formatoPesos(comp.valorTotal)})</span>
                  </div>
                  <button 
                    onClick={() => eliminarPlatoCompartido(comp.id)}
                    className="text-red-700 hover:text-red-800 text-xs font-semibold"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Configuración de Propina y Totales */}
          {comensales.length > 0 && (
            <div className="border-t border-gray-200 pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Porcentaje de Propina (%)</span>
                <input 
                  type="number"
                  value={propina}
                  onChange={manejarPropinaChange}
                  className="w-20 border border-gray-300 rounded-lg p-1.5 text-center text-sm font-medium"
                />
              </div>

              {/* Resumen Final */}
              <div className="space-y-3 bg-emerald-50/60 p-4 rounded-xl border border-emerald-100">
                <h3 className="font-bold text-emerald-900 text-sm">Resumen por Comensal</h3>
                {comensalesCalculados.map(c => (
                  <div key={c.id} className="flex justify-between items-center text-sm border-b border-emerald-100/60 pb-2">
                    <div>
                      <span className="font-semibold text-gray-800">{c.nombre}</span>
                      <span className="text-xs text-gray-500 block">Subtotal: {formatoPesos(c.subtotal)} + Propina: {formatoPesos(c.propinaValor)}</span>
                    </div>
                    <span className="font-bold text-emerald-700">{formatoPesos(c.total)}</span>
                  </div>
                ))}

                <div className="flex justify-between items-center pt-2 font-bold text-base text-gray-900">
                  <span>Gran Total Factura:</span>
                  <span className="text-emerald-700">{formatoPesos(granTotal)}</span>
                </div>
              </div>

              {/* Botón WhatsApp */}
              <button 
                onClick={compartirWhatsApp}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-3 rounded-xl transition shadow-md flex justify-center items-center gap-2 text-sm"
              >
                <span>Enviar por WhatsApp</span>
              </button>
            </div>
          )}

        </div>
        </>)}
      </div>
    </div>
  );
}