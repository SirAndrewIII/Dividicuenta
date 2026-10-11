import React from 'react';

// Campo de importe. Es de texto (no type="number") porque un campo numérico del
// navegador interpreta «1.500» como 1,5; aquí el texto se interpreta siempre con
// la gramática de importes de validacion.js. `inputMode="decimal"` conserva el
// teclado numérico en el celular.
export default function CampoMonto(props) {
  return <input type="text" inputMode="decimal" autoComplete="off" spellCheck={false} {...props} />;
}
