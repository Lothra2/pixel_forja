import { createRaster, type Raster } from '../core/raster';
import { renderHuman } from '../render/human';
import { posesFor } from '../render/clip';
import type { HumanFicha } from '../sheet/ficha';
import type { EyeExpr, MouthExpr } from '../head/stamps';

/**
 * Retratos con expresión (diálogos, marcadores, selección de equipo) y cabecitas para el HUD. Salen del mismo
 * personaje dibujado de frente, con los ojos y la boca del motor (los sellos de las caras), así siempre se parecen
 * al sprite.
 *
 * - chico: 40 x 40, dibujado a celda 64 y recortado desde arriba del pelo (cabeza y torso, nítido, pixel a pixel).
 * - grande: 96 x 96. El motor dibuja personas hasta celda 64 y a ese tamaño el chibi entero mide unos 50 px, así que
 *   un recorte de 96 sería el cuerpo entero chiquito. El grande es la cabeza y los hombros (recorte de 32 x 32)
 *   escalado x3 entero: cada pixel queda como un bloque de 3 x 3, nítido, sin colores mezclados, pero sin más detalle
 *   que el sprite.
 * - cabecita: 12 x 12, la cabeza de celda 64 reducida a la mitad sin mezclar colores (ver `halve`).
 */

export const EXPRESSIONS = ['neutral', 'feliz', 'enojo', 'triste', 'susto', 'cerrado', 'dolor', 'burla'] as const;
export type Expression = (typeof EXPRESSIONS)[number];

/** Ojos y boca de cada expresión (sellos del motor). */
export const EXPRESSION_FACE: Record<Expression, { eyes: EyeExpr; mouth: MouthExpr }> = {
  neutral: { eyes: 'open', mouth: 'line' },
  feliz: { eyes: 'happy', mouth: 'grin' },
  enojo: { eyes: 'angry', mouth: 'frown' },
  triste: { eyes: 'sad', mouth: 'frown' },
  susto: { eyes: 'wide', mouth: 'o' },
  cerrado: { eyes: 'closed', mouth: 'line' },
  dolor: { eyes: 'hurt', mouth: 'open' },
  // la cara de sobrado de la pelea (lote P1): guiño con la ceja fruncida y media sonrisa torcida, para el VS
  burla: { eyes: 'wink', mouth: 'smirk' },
};

export const PORTRAIT_SMALL = 40;
export const PORTRAIT_BIG = 96;
export const HEAD_ICON = 12;

/** El personaje de frente, quieto, con una cara. Devuelve el cuadro grande y el centro de la cabeza. */
function faceFrame(f: HumanFicha, cell: 32 | 64, face: { eyes: EyeExpr; mouth: MouthExpr }) {
  const pose = posesFor(f, cell, 'idle', 'front')[0];
  const b = renderHuman(f, cell, { ...pose, face }, 'front', {});
  const head = b.joints?.head ?? [b.pivotX, b.groundRow - cell / 2];
  const top = (b.whole ?? b.full ?? b.body)?.y0 ?? head[1] - cell / 3;
  return { r: b.raster, head, top };
}

/** Recorta un cuadrado de lado `size` con la esquina en (x0, y0); lo que cae afuera queda transparente. */
function crop(r: Raster, x0: number, y0: number, size: number): Raster {
  const out = createRaster(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const sx = x0 + x, sy = y0 + y;
    if (sx < 0 || sy < 0 || sx >= r.w || sy >= r.h) continue;
    const s = (sy * r.w + sx) * 4, d = (y * size + x) * 4;
    for (let k = 0; k < 4; k++) out.data[d + k] = r.data[s + k];
  }
  return out;
}

/** Escala entera con vecino más cercano (sin mezclar colores). */
export function scaleInt(r: Raster, k: number): Raster {
  const out = createRaster(r.w * k, r.h * k);
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) {
    const s = (Math.floor(y / k) * r.w + Math.floor(x / k)) * 4, d = (y * out.w + x) * 4;
    for (let q = 0; q < 4; q++) out.data[d + q] = r.data[s + q];
  }
  return out;
}

/** Escala del retrato grande: el recorte de cabeza y hombros mide 96 / 3 = 32. */
export const PORTRAIT_BIG_SCALE = 3;

/** Un retrato: la cabeza arriba (con pixeles de aire sobre el pelo) y los hombros abajo. */
export function portrait(f: HumanFicha, expr: Expression, size: 'chico' | 'grande' = 'chico'): Raster {
  const { r, head, top } = faceFrame(f, 64, EXPRESSION_FACE[expr]);
  if (size === 'chico') return crop(r, Math.round(head[0] - PORTRAIT_SMALL / 2), top - 2, PORTRAIT_SMALL);
  const side = PORTRAIT_BIG / PORTRAIT_BIG_SCALE;
  return scaleInt(crop(r, Math.round(head[0] - side / 2), top - 1, side), PORTRAIT_BIG_SCALE);
}

/**
 * Reduce a la mitad sin mezclar colores: cada bloque de 2 x 2 se queda con su color más repetido (si empatan, el más
 * oscuro, así sobreviven el contorno, los ojos y los lentes). El bloque queda transparente si tiene menos de 2 pixeles
 * opacos.
 */
export function halve(r: Raster): Raster {
  const out = createRaster(Math.floor(r.w / 2), Math.floor(r.h / 2));
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) {
    const seen = new Map<number, { n: number; i: number }>();
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const i = ((2 * y + dy) * r.w + 2 * x + dx) * 4;
      if (!r.data[i + 3]) continue;
      const k = (r.data[i] << 16) | (r.data[i + 1] << 8) | r.data[i + 2];
      const e = seen.get(k);
      if (e) e.n++; else seen.set(k, { n: 1, i });
    }
    let opaque = 0, best: { n: number; i: number } | null = null, bestLum = Infinity;
    for (const e of seen.values()) {
      opaque += e.n;
      const lum = r.data[e.i] * 3 + r.data[e.i + 1] * 6 + r.data[e.i + 2];
      if (!best || e.n > best.n || (e.n === best.n && lum < bestLum)) { best = e; bestLum = lum; }
    }
    if (opaque < 2 || !best) continue;
    const d = (y * out.w + x) * 4;
    for (let k = 0; k < 4; k++) out.data[d + k] = r.data[best.i + k];
  }
  return out;
}

/**
 * La cabecita para el HUD: la cabeza de frente a celda 64 (24 x 24 desde lo alto del pelo) reducida a la mitad sin
 * mezclar colores. A celda 32 la cabeza ya mide más de 12 y pierde los lentes y el peinado, por eso sale de la grande.
 */
export function headIcon(f: HumanFicha): Raster {
  const { r, head, top } = faceFrame(f, 64, EXPRESSION_FACE.neutral);
  const side = HEAD_ICON * 2;
  return halve(crop(r, Math.round(head[0] - side / 2), top, side));
}

/**
 * Hoja de retratos: dos filas, la de arriba con los 8 chicos (40 x 40) y la de abajo con los 8 grandes (96 x 96), en
 * el orden de EXPRESSIONS. El chico i está en (i * 40, 0); el grande i en (i * 96, 40).
 */
export function portraitSheet(f: HumanFicha): { png: Raster; chico: number; grande: number; expresiones: Expression[] } {
  const png = createRaster(EXPRESSIONS.length * PORTRAIT_BIG, PORTRAIT_SMALL + PORTRAIT_BIG);
  EXPRESSIONS.forEach((e, i) => {
    const small = portrait(f, e, 'chico'), big = portrait(f, e, 'grande');
    for (const [img, ox, oy] of [[small, i * PORTRAIT_SMALL, 0], [big, i * PORTRAIT_BIG, PORTRAIT_SMALL]] as [Raster, number, number][]) {
      for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
        const s = (y * img.w + x) * 4, d = ((oy + y) * png.w + ox + x) * 4;
        for (let k = 0; k < 4; k++) png.data[d + k] = img.data[s + k];
      }
    }
  });
  return { png, chico: PORTRAIT_SMALL, grande: PORTRAIT_BIG, expresiones: [...EXPRESSIONS] };
}
