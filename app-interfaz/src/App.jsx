import React, { useRef, useState } from 'react';
import ConfirmarReinicio from './components/ConfirmarReinicio';
import ModoConsumo from './components/ModoConsumo';
import PartesIguales from './components/PartesIguales';
import QuienPagoQue from './components/QuienPagoQue';
import SegunIngresos from './components/SegunIngresos';
import SelectorModo from './components/SelectorModo';
import { idPanel, idTab } from './modos';
import { useCuentaPorConsumo } from './hooks/useCuentaPorConsumo';
import { useEstadoPersistente } from './hooks/useEstadoPersistente';

export default function DividiCuentaApp() {
  const [modo, setModo] = useEstadoPersistente('modo', 'consumo');
  const cuenta = useCuentaPorConsumo();
  const [confirmandoReinicio, setConfirmandoReinicio] = useState(false);
  // Al cambiar la clave se vuelven a montar los modos y se limpian los borradores
  const [clave, setClave] = useState(0);
  const botonReiniciar = useRef(null);

  const reiniciar = () => {
    cuenta.reiniciar();
    setClave(clave + 1);
    setConfirmandoReinicio(false);
  };

  const cancelarReinicio = () => {
    setConfirmandoReinicio(false);
    botonReiniciar.current?.focus();
  };

  // Los modos quedan montados (ocultos) para no perder lo cargado al cambiar de pestaña
  const paneles = [
    { id: 'consumo', contenido: <ModoConsumo cuenta={cuenta} /> },
    { id: 'iguales', contenido: <PartesIguales /> },
    { id: 'ingresos', contenido: <SegunIngresos /> },
    { id: 'cruzados', contenido: <QuienPagoQue /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-6 font-sans text-gray-800 flex justify-center items-start">
      <main className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden pb-10 border border-gray-100">
        <header className="bg-emerald-700 p-6 text-white text-center rounded-b-3xl shadow-md relative">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-wide">DividiCuenta</h1>
          <p className="text-emerald-100 text-sm mt-1">Cuentas claras, amistades largas</p>
          {cuenta.hayDatos && (
            <button
              ref={botonReiniciar}
              onClick={() => setConfirmandoReinicio(true)}
              className="absolute top-4 right-4 bg-emerald-800 hover:bg-emerald-900 text-emerald-100 hover:text-white text-xs px-3 min-h-11 rounded-xl font-medium transition"
            >
              Reiniciar
            </button>
          )}
        </header>

        {confirmandoReinicio && <ConfirmarReinicio onConfirmar={reiniciar} onCancelar={cancelarReinicio} />}

        <SelectorModo modo={modo} onCambiar={setModo} />

        {paneles.map(({ id, contenido }) => (
          <div
            key={`${id}-${clave}`}
            role="tabpanel"
            id={idPanel(id)}
            aria-labelledby={idTab(id)}
            hidden={modo !== id}
            className={id === 'consumo' ? undefined : 'p-6'}
          >
            {contenido}
          </div>
        ))}
      </main>
    </div>
  );
}
