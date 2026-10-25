import type { Contextura, Talla } from './look';

/**
 * Medidas del muñeco en pixeles, sin contorno (el contorno de 1 px va por fuera).
 * A 32 px sale como los del video: unos 26 px de alto con la cabeza de 12 x 10 por dentro.
 * La talla grande es el mismo muñeco al doble con una escala limpia (Scale2x), así no pierde el dibujo del video.
 */
export interface Medidas {
  talla: Talla;
  cabezaW: number; cabezaH: number;
  torsoW: number; torsoH: number;
  brazoW: number; brazo: number; antebrazo: number; mano: number;
  piernaW: number; muslo: number; canilla: number; pieL: number; pieH: number;
  /** Escala de las poses (se escriben a 32). */
  k: number;
  /** Celda de la hoja: ancho, alto y la línea del piso dentro de ella. */
  celda: [number, number]; piso: number;
}

const BASE: Record<Talla, Omit<Medidas, 'talla'>> = {
  32: { cabezaW: 12, cabezaH: 10, torsoW: 10, torsoH: 6, brazoW: 3, brazo: 3, antebrazo: 3, mano: 3, piernaW: 4, muslo: 3, canilla: 3, pieL: 5, pieH: 2, k: 1, celda: [56, 48], piso: 44 },
  48: { cabezaW: 16, cabezaH: 15, torsoW: 12, torsoH: 9, brazoW: 4, brazo: 6, antebrazo: 5, mano: 4, piernaW: 4, muslo: 5, canilla: 5, pieL: 6, pieH: 3, k: 1.45, celda: [72, 72], piso: 64 },
};

/** Cambios por contextura a 32 px (a 48 se escalan y redondean). */
const DELTA: Record<Contextura, Partial<Record<keyof Medidas, number>>> = {
  adulto: {},
  hombre: { torsoW: 1 },
  mujer: { torsoW: 0 },
  robusta: { torsoW: 3, piernaW: 1, brazoW: 0, torsoH: 0 },
  nino: { torsoW: -1, torsoH: -1, muslo: -1, cabezaW: 0 },
  pequena: { torsoW: -2, torsoH: -2, muslo: -1, canilla: -1, cabezaW: -1, cabezaH: -1, brazo: -1 },
  abuela: { torsoW: -1, torsoH: -1, muslo: -1, cabezaW: -1, cabezaH: -1 },
};

export function medidas(talla: Talla, c: Contextura = 'adulto'): Medidas {
  // la talla grande es el mismo muñeco al doble (escala limpia): se mide como el de 32
  if (talla === 48) { const m = medidas(32, c); return { ...m, talla: 48, k: 2, celda: [m.celda[0] * 2, m.celda[1] * 2], piso: m.piso * 2 }; }
  const b = BASE[talla];
  const m: Medidas = { talla, ...b, celda: [...b.celda] as [number, number] };
  const d = DELTA[c];
  for (const [key, v] of Object.entries(d) as [keyof Medidas, number][]) {
    (m[key] as number) = Math.max(1, (m[key] as number) + v);
  }
  return m;
}

/** Largo de la pierna parada (de la cadera al piso). */
export const largoPierna = (m: Medidas) => m.muslo + m.canilla + m.pieH;
export const largoBrazo = (m: Medidas) => m.brazo + m.antebrazo;
