import React, { useState } from 'react';

export default function DividiCuentaApp() {
  // --- ESTADOS PRINCIPALES ---
  const [comensales, setComensales] = useState([
    {
      id: 1,
      nombre: 'Andrés',
      items: [
        { id: 101, nombre: 'Hamburguesa', cantidad: 1, valorUnitario: 45000 }
      ]
    },
    {
      id: 2,
      nombre: 'Lucía',
      items: [
        { id: 102, nombre: 'Pasta', cantidad: 1, valorUnitario: 38000 }
      ]
    }
  ]);

  const [compartidos, setCompartidos] = useState([
    {
      id: 201,
      nombre: 'Entrada de Patacones',
      valorTotal: 30000,
      comensalesIds: [1, 2]
    }
  ]);

  const [nuevoComensal, setNuevoComensal] = useState('');
  const [propina, setPropina] = useState(10);

  // Estados temporales para consumo individual
  const [itemNombre, setItemNombre] = useState('');
  const [itemCantidad, setItemCantidad] = useState(1);
  const [itemValor, setItemValor] = useState('');
  const [comensalSeleccionadoId, setComensalSeleccionadoId] = useState(1);

  // Estados temporales para plato compartido
  const [compNombre, setCompNombre] = useState('');
  const [compValor, setCompValor] = useState('');
  const [compIdsSeleccionados, setCompIdsSeleccionados] = useState([]);

  // Estados para digitalización con IA
  const [menuRestaurante, setMenuRestaurante] = useState(null);
  const [cargandoMenu, setCargandoMenu] = useState(false);

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
    if (!itemNombre.trim() || !itemValor || isNaN(itemValor)) return;

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
    if (!archivo) return;

    const formData = new FormData();
    formData.append("file", archivo);

    setCargandoMenu(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/parse-menu`, {
        method: "POST",
        body: formData,
      });
      const datos = await respuesta.json();
      
      if (datos.status === "success") {
        setMenuRestaurante(datos.menu);
        document.getElementById('seccion-menu-ia')?.scrollIntoView({ behavior: 'smooth' });
      } else {
        alert("La IA no pudo procesar la carta. Intenta con un archivo más claro.");
      }
    } catch (error) {
      console.error("Error al subir el menú:", error);
      alert("Hubo un error conectando con el servidor de IA. Asegúrate de que FastAPI esté corriendo.");
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
    if (window.confirm('¿Estás seguro de limpiar la pantalla y empezar de cero?')) {
      setComensales([]);
      setCompartidos([]);
      setNuevoComensal('');
      setPropina(10);
      setItemNombre('');
      setItemCantidad(1);
      setItemValor('');
      setCompNombre('');
      setCompValor('');
      setCompIdsSeleccionados([]);
      setMenuRestaurante(null);
    }
  };

  const porcPropina = typeof propina === 'number' ? propina / 100 : 0;

  const comensalesCalculados = comensales.map(comensal => {
    const subtotalIndividual = comensal.items.reduce((acc, item) => {
      const cant = Number(item.cantidad) || 0;
      const val = Number(item.valorUnitario) || 0;
      return acc + (cant * val);
    }, 0);

    const subtotalCompartido = compartidos.reduce((acc, comp) => {
      if (comp.comensalesIds.includes(comensal.id)) {
        const division = comp.valorTotal / (comp.comensalesIds.length || 1);
        return acc + division;
      }
      return acc;
    }, 0);

    const subtotal = subtotalIndividual + subtotalCompartido;
    const propinaValor = subtotal * porcPropina;
    const total = subtotal + propinaValor;

    return {
      ...comensal,
      subtotalIndividual,
      subtotalCompartido,
      subtotal,
      propinaValor,
      total
    };
  });

  const granTotal = comensalesCalculados.reduce((acc, curr) => acc + curr.total, 0);

  const compartirWhatsApp = () => {
    if (comensalesCalculados.length === 0) return;

    let mensaje = `🧾 *RESUMEN DE CUENTA - DividiCuenta* 🧾\n\n`;
    
    comensalesCalculados.forEach(c => {
      mensaje += `👤 *${c.nombre}*\n`;
      
      if (c.items.length > 0) {
        c.items.forEach(item => {
          const subItem = (Number(item.cantidad) || 0) * (Number(item.valorUnitario) || 0);
          mensaje += ` - ${item.cantidad}x ${item.nombre} ($${subItem.toLocaleString()})\n`;
        });
      }

      compartidos.forEach(comp => {
        if (comp.comensalesIds.includes(c.id)) {
          const parte = comp.valorTotal / comp.comensalesIds.length;
          mensaje += ` - [Compartido] ${comp.nombre} ($${Math.round(parte).toLocaleString()})\n`;
        }
      });

      if (c.items.length === 0 && c.subtotalCompartido === 0) {
        mensaje += ` - Sin consumos registrados\n`;
      }

      mensaje += ` 🔸 Subtotal: $${Math.round(c.subtotal).toLocaleString()}\n`;
      mensaje += ` 🔸 Propina (${propina}%): $${Math.round(c.propinaValor).toLocaleString()}\n`;
      mensaje += ` ✅ *Total a pagar: $${Math.round(c.total).toLocaleString()}*\n\n`;
    });

    mensaje += `━━━━━━━━━━━━━━━━━━━\n`;
    mensaje += `💰 *GRAN TOTAL FACTURA: $${Math.round(granTotal).toLocaleString()}*`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-6 font-sans text-gray-800 flex justify-center items-start">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden pb-10 border border-gray-100">
        
        {/* Encabezado */}
        <div className="bg-emerald-600 p-6 text-white text-center rounded-b-3xl shadow-md relative">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-wide">DividiCuenta</h1>
          <p className="text-emerald-100 text-sm mt-1">Cuentas claras, amistades largas</p>
          {(comensales.length > 0 || menuRestaurante) && (
            <button 
              onClick={reiniciarTodo}
              className="absolute top-4 right-4 bg-emerald-700 hover:bg-emerald-800 text-emerald-100 hover:text-white text-xs px-3 py-2 rounded-xl font-medium transition"
            >
              Reiniciar
            </button>
          )}
        </div>

        {/* Sección de Escaneo de Carta con IA (Imágenes y PDFs) */}
        <div className="p-6 border-b border-gray-100 bg-emerald-50/50">
          <h2 className="text-lg font-semibold text-emerald-800 mb-2">Escanear Menú con IA</h2>
          <p className="text-sm text-gray-600 mb-4">Sube una foto o un archivo PDF de la carta del restaurante para extraer los platos por categorías automáticamente.</p>
          
          <div className="flex items-center gap-4">
            <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition shadow-sm inline-flex items-center gap-2">
              <span>📄 Subir foto o PDF de la carta</span>
              <input type="file" accept="image/*,application/pdf" onChange={manejarSubidaCarta} className="hidden" />
            </label>
            {cargandoMenu && <span className="text-sm text-emerald-700 font-medium animate-pulse">Analizando carta con IA...</span>}
          </div>

          {/* Menú Detectado por Categorías */}
          {menuRestaurante && menuRestaurante.categorias && (
            <div id="seccion-menu-ia" className="mt-6 bg-white p-4 rounded-xl border border-emerald-200 shadow-sm space-y-6">
              <h3 className="font-bold text-emerald-900">Menú Organizado (Haz clic en un plato para agregarlo):</h3>
              
              {menuRestaurante.categorias.map((cat, idxCat) => (
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
                          {plato.descripcion && <p className="text-xs text-gray-400 line-clamp-1">{plato.descripcion}</p>}
                        </div>
                        <span className="font-bold text-emerald-600 text-sm shrink-0">${Number(plato.precio).toLocaleString()}</span>
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-sm font-medium transition shadow-sm"
            >
              Agregar Comensal
            </button>
          </div>

          {/* Lista de comensales y sus consumos */}
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
                    className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1"
                  >
                    Eliminar
                  </button>
                </div>

                {/* Ítems del comensal */}
                <div className="space-y-2">
                  {comensal.items.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded-lg gap-2">
                      <input 
                        type="text" 
                        value={item.nombre}
                        onChange={(e) => modificarItemDeComensal(comensal.id, item.id, 'nombre', e.target.value)}
                        className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-emerald-500 focus:outline-none flex-1 text-gray-700"
                      />
                      <input 
                        type="number" 
                        value={item.cantidad}
                        onChange={(e) => modificarItemDeComensal(comensal.id, item.id, 'cantidad', e.target.value)}
                        className="w-12 text-center bg-white border border-gray-200 rounded px-1"
                      />
                      <span className="text-gray-500">x</span>
                      <input 
                        type="number" 
                        value={item.valorUnitario}
                        onChange={(e) => modificarItemDeComensal(comensal.id, item.id, 'valorUnitario', e.target.value)}
                        className="w-20 text-right bg-white border border-gray-200 rounded px-1"
                      />
                      <button 
                        onClick={() => eliminarItemDeComensal(comensal.id, item.id)}
                        className="text-red-400 hover:text-red-600 font-bold px-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {comensal.items.length === 0 && (
                    <p className="text-xs text-gray-400 italic">No hay consumos individuales registrados.</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Formulario para agregar consumo individual */}
          {comensales.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
              <h3 className="font-semibold text-sm text-gray-700">Agregar Consumo Individual</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <select 
                  value={comensalSeleccionadoId}
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
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg p-2 transition shadow-sm"
                >
                  Añadir Plato
                </button>
              </div>
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg p-2 transition shadow-sm"
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
                      className="rounded text-emerald-600 focus:ring-emerald-500"
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
                    <span className="text-gray-500 text-xs ml-2">(${comp.valorTotal.toLocaleString()})</span>
                  </div>
                  <button 
                    onClick={() => eliminarPlatoCompartido(comp.id)}
                    className="text-red-500 hover:text-red-700 text-xs font-semibold"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Configuración de Propina y Totales */}
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
                    <span className="text-xs text-gray-500 block">Subtotal: ${Math.round(c.subtotal).toLocaleString()} + Propina: ${Math.round(c.propinaValor).toLocaleString()}</span>
                  </div>
                  <span className="font-bold text-emerald-700">${Math.round(c.total).toLocaleString()}</span>
                </div>
              ))}

              <div className="flex justify-between items-center pt-2 font-bold text-base text-gray-900">
                <span>Gran Total Factura:</span>
                <span className="text-emerald-700">${Math.round(granTotal).toLocaleString()}</span>
              </div>
            </div>

            {/* Botón WhatsApp */}
            <button 
              onClick={compartirWhatsApp}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl transition shadow-md flex justify-center items-center gap-2 text-sm"
            >
              <span>Enviar por WhatsApp</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}