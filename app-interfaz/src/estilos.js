// Clases de Tailwind compartidas. Los campos usan borde gray-500 (4,8:1 sobre
// blanco) y los controles miden al menos 44 px de alto para el toque en móvil.
export const campo =
  'border border-gray-500 rounded-xl px-3 py-2 min-h-11 text-sm bg-white focus-visible:outline-2 focus-visible:outline-emerald-700';

export const campoCompacto =
  'border border-gray-500 rounded-lg px-2 min-h-10 text-sm bg-white focus-visible:outline-2 focus-visible:outline-emerald-700';

export const boton =
  'inline-flex items-center justify-center min-h-11 px-4 rounded-xl text-sm font-medium bg-emerald-700 hover:bg-emerald-800 text-white transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed';

export const botonPeligro =
  'inline-flex items-center justify-center min-h-11 min-w-11 px-2 rounded-lg text-sm font-semibold text-red-700 hover:text-red-800 hover:bg-red-50 transition';
