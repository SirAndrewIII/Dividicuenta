import { generarId } from './ids';
import { MAX_NOMBRE } from './validacion';

export const MAX_PERSONAS = 15;

export const nuevaPersona = (n) => ({ id: generarId(), nombre: `Persona ${n}`, valor: '' });
export const personasIniciales = () => [nuevaPersona(1), nuevaPersona(2)];

// Un valor no finito (por ejemplo «1e999») cuenta como 0.
export const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

// Limpia la lista guardada en el navegador; si no sirve, vuelve a la inicial.
export function sanearPersonas(crudo) {
  if (!Array.isArray(crudo) || crudo.length < 2 || crudo.length > MAX_PERSONAS) return personasIniciales();
  const personas = crudo
    .filter((p) => p && Number.isFinite(p.id))
    .map((p) => ({
      id: p.id,
      nombre: String(p.nombre ?? '').slice(0, MAX_NOMBRE),
      valor: typeof p.valor === 'number' || typeof p.valor === 'string' ? String(p.valor) : '',
    }));
  return personas.length >= 2 ? personas : personasIniciales();
}
