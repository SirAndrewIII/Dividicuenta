import { useEffect, useState } from 'react';

const PREFIJO = 'dividicuenta:v1:';

// Igual que useState, pero guarda el valor en localStorage para sobrevivir a
// recargas. Si el almacenamiento no está disponible, funciona como useState.
export function useEstadoPersistente(clave, inicial) {
  const [valor, setValor] = useState(() => {
    try {
      const guardado = window.localStorage.getItem(PREFIJO + clave);
      if (guardado !== null) return JSON.parse(guardado);
    } catch {
      // almacenamiento bloqueado o dato corrupto: se usa el valor inicial
    }
    return typeof inicial === 'function' ? inicial() : inicial;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(PREFIJO + clave, JSON.stringify(valor));
    } catch {
      // sin espacio o sin permiso: la app sigue funcionando sin guardar
    }
  }, [clave, valor]);

  return [valor, setValor];
}
