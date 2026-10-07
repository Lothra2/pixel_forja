import type { WorkImage } from './work';
import { kmeans } from '../color/kmeans';
import { type Lab, deltaE } from '../color/oklab';

export interface BrushStroke {
  x: number;
  y: number;
  r: number;
  /** fg = es personaje, bg = es fondo */
  mode: 'fg' | 'bg';
}

export interface BackgroundOptions {
  /** tolerancia en OKLab (0.02 muy estricta, 0.2 muy suelta) */
  tolerance: number;
  strokes?: BrushStroke[];
}

/** 1 = personaje, 0 = fondo. */
export type Mask = Uint8Array;

export function hasTransparency(img: WorkImage): boolean {
  const { w, h, data } = img.raster;
  let transparent = 0;
  for (let i = 0; i < w * h; i++) if (data[i * 4 + 3] < 128) transparent++;
  return transparent > w * h * 0.02;
}

/**
 * Quita el fondo. Si el PNG ya trae transparencia se usa tal cual.
 * Si no, se rellena desde los bordes: un pixel es fondo si se parece al color del borde donde empezó el relleno.
 */
export function removeBackground(img: WorkImage, opt: BackgroundOptions): Mask {
  const { w, h, data } = img.raster;
  const mask = new Uint8Array(w * h);
  if (hasTransparency(img)) {
    for (let i = 0; i < w * h; i++) mask[i] = data[i * 4 + 3] >= 128 ? 1 : 0;
  } else {
    mask.fill(1);
    const seedOf = new Int32Array(w * h).fill(-1);
    const queue = new Int32Array(w * h);
    let qh = 0, qt = 0;
    const push = (i: number, seed: number) => {
      if (seedOf[i] !== -1) return;
      seedOf[i] = seed;
      mask[i] = 0;
      queue[qt++] = i;
    };
    const tol = opt.tolerance;
    const lab = img.lab;
    const close = (i: number, j: number, t: number) => {
      const dl = lab[i * 3] - lab[j * 3], da = lab[i * 3 + 1] - lab[j * 3 + 1], db = lab[i * 3 + 2] - lab[j * 3 + 2];
      return dl * dl + da * da + db * db <= t * t;
    };
    // Semillas: pixeles del borde cuyo color es de los dominantes del borde.
    // Así, si el personaje toca el borde (pies abajo), no se borra.
    const border: number[] = [];
    for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x);
    for (let y = 1; y < h - 1; y++) border.push(y * w, y * w + w - 1);
    const pts = border.map((i) => [lab[i * 3], lab[i * 3 + 1], lab[i * 3 + 2]] as Lab);
    const km = kmeans(pts, 3, 7);
    const bgCenters = km.centers.filter((_, c) => km.counts[c] >= border.length * 0.1);
    for (let k = 0; k < border.length; k++)
      if (bgCenters.some((c) => deltaE(pts[k], c) <= tol * 2)) push(border[k], border[k]);
    while (qh < qt) {
      const i = queue[qh++];
      const seed = seedOf[i];
      const x = i % w, y = (i / w) | 0;
      const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
      // contra el vecino: paso a paso, permite degradados suaves. Contra la semilla: evita colarse en el personaje.
      for (const j of nb) if (j >= 0 && seedOf[j] === -1 && close(j, i, tol * 0.5) && close(j, seed, tol * 2)) push(j, seed);
    }
  }
  for (const s of opt.strokes ?? []) {
    const r2 = s.r * s.r;
    for (let y = Math.max(0, Math.floor(s.y - s.r)); y <= Math.min(h - 1, Math.ceil(s.y + s.r)); y++)
      for (let x = Math.max(0, Math.floor(s.x - s.r)); x <= Math.min(w - 1, Math.ceil(s.x + s.r)); x++)
        if ((x - s.x) ** 2 + (y - s.y) ** 2 <= r2) mask[y * w + x] = s.mode === 'fg' ? 1 : 0;
  }
  return keepMainShapes(mask, w, h);
}

/** Etiqueta componentes 4-conexas de un valor dado. Devuelve etiquetas (-1 si no aplica) y tamaños. */
export function components(mask: Uint8Array, w: number, h: number, value = 1): { labels: Int32Array; sizes: number[] } {
  const labels = new Int32Array(w * h).fill(-1);
  const sizes: number[] = [];
  const stack: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (mask[i] !== value || labels[i] !== -1) continue;
    const id = sizes.length;
    let size = 0;
    stack.push(i);
    labels[i] = id;
    while (stack.length) {
      const p = stack.pop()!;
      size++;
      const x = p % w, y = (p / w) | 0;
      if (x > 0 && mask[p - 1] === value && labels[p - 1] === -1) { labels[p - 1] = id; stack.push(p - 1); }
      if (x < w - 1 && mask[p + 1] === value && labels[p + 1] === -1) { labels[p + 1] = id; stack.push(p + 1); }
      if (y > 0 && mask[p - w] === value && labels[p - w] === -1) { labels[p - w] = id; stack.push(p - w); }
      if (y < h - 1 && mask[p + w] === value && labels[p + w] === -1) { labels[p + w] = id; stack.push(p + w); }
    }
    sizes.push(size);
  }
  return { labels, sizes };
}

/** Deja la figura principal (y piezas grandes sueltas, como un balón) y tapa huequitos internos. */
function keepMainShapes(mask: Mask, w: number, h: number): Mask {
  const fg = components(mask, w, h, 1);
  const biggest = Math.max(0, ...fg.sizes);
  for (let i = 0; i < w * h; i++) if (mask[i] && fg.sizes[fg.labels[i]] < biggest * 0.02) mask[i] = 0;
  const bg = components(mask, w, h, 0);
  for (let i = 0; i < w * h; i++) if (!mask[i] && bg.sizes[bg.labels[i]] < w * h * 0.0004) mask[i] = 1;
  return mask;
}

export function maskBBox(mask: Mask, w: number, h: number): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (mask[y * w + x]) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
  return { x0, y0, x1, y1 };
}
