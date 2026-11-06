import { CW, CH, type Toma } from './cine_toma';
import { fuegoTrasVidrios } from './cine_fuego';
import type { Mascara } from './cine';
import type { Pose } from './estudio';
import type { NombrePaleta } from './fuego_doom';

/**
 * Fuego de Doom detrás de unas ventanas de un plano (máscara del tamaño de la capa de 1408 x 792): una tira de 12
 * cuadros que empalma, recortada a la caja de las ventanas, que se suma (anim 'cuadros' del reproductor).
 */
export function fuegoEnVentanas(t: Toma, id: string, z: number, paralaje: number, ven: Mascara, o: { paleta: NombrePaleta; semilla: number; hueco?: number; fondo?: { c: [number, number, number]; k: number }; alto_px?: number; k?: number; celda?: number }) {
  let x0 = CW, y0 = CH, x1 = -1, y1 = -1;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (ven.d[y * CW + x] > 0.05) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  if (x1 < 0) return;
  x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); x1 = Math.min(CW - 1, x1 + 2); y1 = Math.min(CH - 1, y1 + 2);
  const w = x1 - x0 + 1, h = y1 - y0 + 1, m = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m[y * w + x] = Math.min(1, ven.d[(y + y0) * CW + x + x0]);
  t.tira(id, z, paralaje, 'sumar', fuegoTrasVidrios(m, w, h, { cuadros: 12, celda: o.celda ?? 2, ...o }), x0, y0, 12, { notas: 'fuego de Doom horneado detrás de los vitrales: anim cuadros, se suma, empalma' });
}

/** La luz propia de una pose (vitrales, brasas) puesta en (x, y) como máscara del tamaño de la capa. */
export function mascaraLuzPose(p: Pose, x: number, y: number, umbral = 0.25): Mascara {
  const m = { w: CW, h: CH, d: new Float32Array(CW * CH) }, ox = Math.round(x - p.ax), oy = Math.round(y - p.ay);
  for (let j = 0; j < p.luz.h; j++) for (let i = 0; i < p.luz.w; i++) {
    const X = ox + i, Y = oy + j; if (X < 0 || Y < 0 || X >= CW || Y >= CH) continue;
    const s = (j * p.luz.w + i) * 4, v = Math.max(p.luz.d[s], p.luz.d[s + 1], p.luz.d[s + 2]);
    if (v > umbral) m.d[Y * CW + X] = Math.min(1, (v - umbral) * 2);
  }
  return m;
}
