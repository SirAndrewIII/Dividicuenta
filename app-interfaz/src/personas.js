import { generarId } from './ids';

export const MAX_PERSONAS = 15;

export const nuevaPersona = (n) => ({ id: generarId(), nombre: `Persona ${n}`, valor: '' });
export const personasIniciales = () => [nuevaPersona(1), nuevaPersona(2)];
export const num = (v) => parseFloat(v) || 0;
