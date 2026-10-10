import React, { useState } from 'react';
import { boton, campo } from '../estilos';

export default function AgregarComensal({ onAgregar }) {
  const [nombre, setNombre] = useState('');

  const agregar = () => {
    if (onAgregar(nombre)) setNombre('');
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        aria-label="Nombre del comensal"
        placeholder="Nombre del comensal"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && agregar()}
        className={`${campo} flex-1 min-w-0`}
      />
      <button onClick={agregar} className={`${boton} px-5`}>
        Agregar comensal
      </button>
    </div>
  );
}
