import type { Raster } from '../core/raster';
import type { RenderedClip } from '../render/clip';
import { type Ficha, isHuman } from '../sheet/ficha';
import { hexToLab } from '../color/oklab';

export type Severity = 'error' | 'warn' | 'ok';

export interface QAItem {
  check: 'height' | 'ground' | 'orphans' | 'colors' | 'jitter' | 'face' | 'fit';
  severity: Severity;
  value: string;
  /** dónde falla: animación y cuadro */
  where?: string;
}

export interface QAReport {
  clip: string;
  cell: number;
  items: QAItem[];
  ok: boolean;
}

function bounds(r: Raster) {
  let x0 = r.w, y0 = r.h, x1 = -1, y1 = -1;
  for (let y = 0; y < r.h; y++)
    for (let x = 0; x < r.w; x++)
      if (r.data[(y * r.w + x) * 4 + 3]) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
  return { x0, y0, x1, y1 };
}

/** Pixeles opacos sin ningún vecino opaco (8 vecinos): basura visual. */
export function countOrphans(r: Raster): { n: number; at: [number, number][] } {
  const at: [number, number][] = [];
  const op = (x: number, y: number) => x >= 0 && y >= 0 && x < r.w && y < r.h && r.data[(y * r.w + x) * 4 + 3] > 0;
  for (let y = 0; y < r.h; y++)
    for (let x = 0; x < r.w; x++) {
      if (!op(x, y)) continue;
      let nb = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && op(x + dx, y + dy)) nb++;
      if (nb === 0) at.push([x, y]);
    }
  return { n: at.length, at };
}

export function uniqueColors(frames: Raster[]): number {
  const s = new Set<number>();
  for (const r of frames)
    for (let i = 0; i < r.w * r.h; i++)
      if (r.data[i * 4 + 3]) s.add((r.data[i * 4] << 16) | (r.data[i * 4 + 1] << 8) | r.data[i * 4 + 2]);
  return s.size;
}

/** Corre todas las medidas sobre una animación ya dibujada. */
export function runQA(f: Ficha, clip: RenderedClip): QAReport {
  const groundY = clip.cell - 2;
  const items: QAItem[] = [];
  // con el alto del cuerpo (sin armas ni balones) cuando el render lo da
  const b = clip.frames.map((fr, i) => {
    const bb = bounds(fr), body = clip.bodies?.[i];
    return body && isFinite(bb.y1) ? { ...bb, y0: body.y0, y1: body.y1 } : bb;
  });
  // altura: igual en todos los cuadros en el piso (±1). Solo en animaciones de pie (agacharse cambia la altura a propósito)
  const grounded = b.filter((_, i) => !clip.airborne[i]);
  const heights = grounded.map((x) => x.y1 - x.y0 + 1);
  const hr = heights.length ? Math.max(...heights) - Math.min(...heights) : 0;
  items.push({
    check: 'height',
    // de frente, de espalda o en diagonal la perspectiva sube y baja los pies: se tolera un pixel más
    severity: clip.steady && hr > (clip.view === 'side' || clip.view === 'left' ? 1 : 2) ? 'error' : 'ok',
    value: heights.length ? `${Math.min(...heights)}-${Math.max(...heights)} px${clip.steady ? '' : ' *'}` : 'n/a',
  });
  // que nada se salga del cuadro
  const clipped = clip.fits ? [] : clip.overflow?.length ? clip.overflow.map((i) => ({ i })) : b.map((_, i) => ({ i }));
  items.push({
    check: 'fit',
    severity: clipped.length ? 'error' : 'ok',
    value: clipped.length ? `${clipped.length}/${b.length}` : `${clip.cell}px`,
    where: clipped.length ? `#${clipped.map((x) => x.i).join(', #')}` : undefined,
  });
  // pies en el piso
  // midiendo el cuerpo sin armas, un arma apoyada debajo puede tapar la fila del contorno: se acepta un pixel
  const touches = (y1: number) => y1 === groundY || (!!clip.bodies && y1 === groundY - 1);
  const off = b.map((x, i) => ({ i, y1: x.y1 })).filter((x) => !clip.airborne[x.i] && !touches(x.y1));
  items.push({
    check: 'ground',
    severity: off.length ? 'error' : 'ok',
    value: off.length ? `${off.length}/${b.length}` : `y=${groundY}`,
    where: off.length ? `#${off.map((x) => x.i).join(', #')}` : undefined,
  });
  // pixeles sueltos
  const orphans = clip.frames.map(countOrphans);
  const total = orphans.reduce((s, o) => s + o.n, 0);
  const firstBad = orphans.findIndex((o) => o.n > 0);
  items.push({
    check: 'orphans',
    severity: total ? 'error' : 'ok',
    value: `${total}`,
    where: firstBad >= 0 ? `#${firstBad} (${orphans[firstBad].at[0].join(', ')})` : undefined,
  });
  // colores
  const nColors = uniqueColors(clip.frames);
  items.push({ check: 'colors', severity: nColors > 48 ? 'warn' : 'ok', value: `${nColors}` });
  // temblor de la cabeza: cuánto se mueve el borde de arriba entre cuadros seguidos
  let maxJ = 0, worst = 0;
  for (let i = 0; i < b.length; i++) {
    const j = (i + 1) % b.length;
    if (!clip.loop && j === 0) continue;
    if (clip.airborne[i] || clip.airborne[j]) continue;
    const dj = Math.max(Math.abs(b[i].y0 - b[j].y0), Math.abs(headCenterX(clip.frames[i], b[i].y0) - headCenterX(clip.frames[j], b[j].y0)));
    if (dj > maxJ) { maxJ = dj; worst = i; }
  }
  if (clip.steady) items.push({ check: 'jitter', severity: maxJ > 1 ? 'warn' : 'ok', value: `${maxJ} px`, where: maxJ > 1 ? `#${worst} > #${(worst + 1) % b.length}` : undefined });
  else items.push({ check: 'jitter', severity: 'ok', value: 'n/a' });
  // la cara se lee: contraste entre ojo y piel
  if (!isHuman(f)) {
    items.push({ check: 'face', severity: 'ok', value: 'n/a' });
    return { clip: clip.name, cell: clip.cell, items, ok: !items.some((x) => x.severity === 'error') };
  }
  const skin = hexToLab(f.palette.skin[2]);
  const eye = hexToLab(f.palette.eyes);
  const darkEye = Math.min(0.24, eye[0] * 0.45);
  const contrast = skin[0] - darkEye;
  items.push({ check: 'face', severity: contrast < 0.3 ? 'warn' : 'ok', value: `ΔL ${contrast.toFixed(2)}` });
  return { clip: clip.name, cell: clip.cell, items, ok: !items.some((x) => x.severity === 'error') };
}

function headCenterX(r: Raster, y0: number): number {
  // centro horizontal de las 4 filas de arriba de la silueta
  let s = 0, n = 0;
  for (let y = y0; y < Math.min(r.h, y0 + 4); y++)
    for (let x = 0; x < r.w; x++) if (r.data[(y * r.w + x) * 4 + 3]) { s += x; n++; }
  return n ? Math.round(s / n) : 0;
}
