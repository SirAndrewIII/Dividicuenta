import React, { useState } from 'react';
import { abrirWhatsApp, mensajeConsumo } from '../mensajes';
import AgregarComensal from './AgregarComensal';
import EscanerCarta from './EscanerCarta';
import FormularioConsumo from './FormularioConsumo';
import ListaComensales from './ListaComensales';
import PlatosCompartidos from './PlatosCompartidos';
import ResumenCuenta from './ResumenCuenta';

// `cuenta` es el valor de useCuentaPorConsumo (estado y operaciones).
export default function ModoConsumo({ cuenta }) {
  // Borrador del formulario de «un plato»; el menú escaneado lo rellena.
  const [nombrePlato, setNombrePlato] = useState('');
  const [precioPlato, setPrecioPlato] = useState('');

  const usarPlatoDelMenu = (plato) => {
    setNombrePlato(plato.nombre);
    setPrecioPlato(String(plato.precio));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const compartir = () => {
    if (cuenta.comensalesCalculados.length === 0) return;
    abrirWhatsApp(mensajeConsumo(cuenta.comensalesCalculados, cuenta.propina, cuenta.granTotal));
  };

  return (
    <>
      <EscanerCarta menu={cuenta.menu} onMenu={cuenta.setMenu} onSeleccionarPlato={usarPlatoDelMenu} />

      <div className="p-6 space-y-6">
        <AgregarComensal onAgregar={cuenta.agregarComensal} />

        <ListaComensales
          comensales={cuenta.comensales}
          onRenombrar={cuenta.renombrarComensal}
          onEliminar={cuenta.eliminarComensal}
          onModificarItem={cuenta.modificarItem}
          onEliminarItem={cuenta.eliminarItem}
        />

        {cuenta.comensales.length > 0 && (
          <FormularioConsumo
            comensales={cuenta.comensales}
            seleccionadoId={cuenta.seleccionadoId}
            onSeleccionar={cuenta.setSeleccionadoId}
            onAgregarItems={cuenta.agregarItems}
            nombre={nombrePlato}
            precio={precioPlato}
            onNombre={setNombrePlato}
            onPrecio={setPrecioPlato}
          />
        )}

        <PlatosCompartidos
          comensales={cuenta.comensales}
          compartidos={cuenta.compartidos}
          onAgregar={cuenta.agregarCompartido}
          onEliminar={cuenta.eliminarCompartido}
        />

        {cuenta.comensales.length > 0 && (
          <ResumenCuenta
            comensales={cuenta.comensalesCalculados}
            propina={cuenta.propina}
            granTotal={cuenta.granTotal}
            onPropina={cuenta.cambiarPropina}
            onCompartir={compartir}
          />
        )}
      </div>
    </>
  );
}
