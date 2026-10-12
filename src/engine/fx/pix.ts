import { createRaster, type Raster, type RGBA } from '../core/raster';

/**
 * Lápiz de pixel art para los efectos del catálogo: puntos, rectángulos, discos, anillos, líneas, contorno y
 * desvanecido con tramado. Todo en enteros y sin mezcla (alfa 0 o 255), así los efectos se ven nítidos en cualquier
 * escala entera y salen iguales en Node y en el navegador.
 */

const cache = new Map<string, RGBA>();
export function hex(h: string): RGBA {
  let c = cache.get(h);
  if (!c) { c = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255]; cache.set(h, c); }
  return c;
}

/** Bayer 4 x 4, de 0 a 1: para desvanecer y tramar sin alfa. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const bayer = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)];

/** Generador determinista (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ruido por pixel (0..1), estable: para que algo se deshaga en granitos sueltos y no en rejilla. */
export const grain = (x: number, y: number, seed = 0) => {
  let h = Math.imul(x * 374761393 + y * 668265263 + seed * 2246822519, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export class Pix {
  readonly r: Raster;
  constructor(readonly w: number, readonly h: number) { this.r = createRaster(w, h); }

  px(x: number, y: number, c: string) {
    const xi = Math.round(x), yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= this.w || yi >= this.h) return;
    const i = (yi * this.w + xi) * 4, v = hex(c);
    this.r.data[i] = v[0]; this.r.data[i + 1] = v[1]; this.r.data[i + 2] = v[2]; this.r.data[i + 3] = 255;
  }
  has(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h && this.r.data[(y * this.w + x) * 4 + 3] > 0;
  }
  clear(x: number, y: number) {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.r.data[(y * this.w + x) * 4 + 3] = 0;
  }
  rect(x: number, y: number, w: number, h: number, c: string) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
  }
  /** Disco relleno; sy aplasta en vertical (0.5 = en el piso). */
  disc(cx: number, cy: number, rad: number, c: string, sy = 1) {
    if (rad < 0.5) { this.px(cx, cy, c); return; }
    const ry = rad * sy, lim = rad * rad + rad * 0.5;
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
      for (let x = Math.floor(cx - rad - 1); x <= Math.ceil(cx + rad + 1); x++) {
        const dx = x - cx, dy = (y - cy) / sy;
        if (dx * dx + dy * dy <= lim) this.px(x, y, c);
      }
  }
  /** Anillo de grosor `t` (en pixeles), opcionalmente aplastado; `from`/`to` en radianes limitan el arco. */
  ring(cx: number, cy: number, rad: number, c: string, sy = 1, t = 1, from = -Math.PI, to = Math.PI) {
    const ry = rad * sy;
    for (let y = Math.floor(cy - ry - t - 1); y <= Math.ceil(cy + ry + t + 1); y++)
      for (let x = Math.floor(cx - rad - t - 1); x <= Math.ceil(cx + rad + t + 1); x++) {
        const dx = x - cx, dy = (y - cy) / sy;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (Math.abs(d - rad) > t / 2 + 0.25) continue;
        const a = Math.atan2(dy, dx);
        if (a >= from && a <= to) this.px(x, y, c);
      }
  }
  line(x0: number, y0: number, x1: number, y1: number, c: string) {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let i = 0; i <= n; i++) this.px(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
  }
  /** Línea gruesa: un disco en cada paso. */
  thick(x0: number, y0: number, x1: number, y1: number, rad: number, c: string) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= n; i++) this.disc(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, rad, c);
  }
  /** Contorno de 1 pixel alrededor de lo pintado (solo en lo vacío). */
  outline(c: string, diagonal = false) {
    const add: number[] = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.has(x, y)) continue;
        const n = this.has(x - 1, y) || this.has(x + 1, y) || this.has(x, y - 1) || this.has(x, y + 1)
          || (diagonal && (this.has(x - 1, y - 1) || this.has(x + 1, y - 1) || this.has(x - 1, y + 1) || this.has(x + 1, y + 1)));
        if (n) add.push(x, y);
      }
    for (let i = 0; i < add.length; i += 2) this.px(add[i], add[i + 1], c);
  }
  /** Desvanece en granitos sueltos: a = 0 deja todo, a = 1 borra todo. */
  fade(a: number, seed = 0) {
    if (a <= 0) return;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (grain(x, y, seed) < a) this.clear(x, y);
  }
  /** Pega otro lienzo encima (solo lo pintado). */
  paste(o: Pix, ox = 0, oy = 0) {
    for (let y = 0; y < o.h; y++)
      for (let x = 0; x < o.w; x++) {
        if (!o.has(x, y)) continue;
        const i = (y * o.w + x) * 4, dx = x + ox, dy = y + oy;
        if (dx < 0 || dy < 0 || dx >= this.w || dy >= this.h) continue;
        this.r.data.set(o.r.data.subarray(i, i + 4), (dy * this.w + dx) * 4);
      }
  }
}

/**
 * Una bocanada redonda de polvo o humo, con luz arriba a la izquierda y sombra abajo. pal = [oscuro, medio, claro].
 * `erode` (0..1) la deshace desde el borde en granitos: así se apaga como el polvo de verdad.
 */
export function puff(p: Pix, cx: number, cy: number, rad: number, pal: readonly string[], erode = 0, seed = 0) {
  if (rad < 0.8) { if (erode < 0.6) p.px(cx, cy, pal[1]); return; }
  const lim = rad * rad + rad * 0.5;
  for (let y = Math.floor(cy - rad - 1); y <= Math.ceil(cy + rad + 1); y++)
    for (let x = Math.floor(cx - rad - 1); x <= Math.ceil(cx + rad + 1); x++) {
      const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
      if (d2 > lim) continue;
      const d = Math.sqrt(d2) / rad;
      if (erode > 0 && grain(x, y, seed) < erode * (0.35 + d * 0.9)) continue;
      const lx = dx + rad * 0.35, ly = dy + rad * 0.4;
      const light = rad >= 2 && lx * lx + ly * ly < rad * rad * 0.2;
      const sx = dx - rad * 0.15, sy = dy - rad * 0.2;
      const shade = sx * sx + sy * sy > rad * rad * 0.68 && dx + dy > -rad * 0.2;
      p.px(x, y, light ? pal[2] : shade ? pal[0] : pal[1]);
    }
}

/** Estrella de 4 puntas (brillo) de radio r. */
export function sparkle(p: Pix, cx: number, cy: number, r: number, core: string, edge: string) {
  for (let i = 1; i <= r; i++) {
    const c = i < r ? core : edge;
    p.px(cx + i, cy, c); p.px(cx - i, cy, c); p.px(cx, cy + i, c); p.px(cx, cy - i, c);
  }
  p.px(cx, cy, core);
  if (r >= 3) { p.px(cx + 1, cy + 1, edge); p.px(cx - 1, cy - 1, edge); p.px(cx + 1, cy - 1, edge); p.px(cx - 1, cy + 1, edge); }
}

/** Estrella de 5 puntas chiquita (5 x 5) para mareos y festejos. */
export function star5(p: Pix, cx: number, cy: number, fill: string, light: string, out: string) {
  const S = ['..#..', '.###.', '#####', '.###.', '.#.#.'];
  const o = new Pix(7, 7);
  S.forEach((row, y) => [...row].forEach((ch, x) => ch === '#' && o.px(x + 1, y + 1, fill)));
  o.px(3, 2, light); o.px(3, 3, light);
  o.outline(out);
  p.paste(o, Math.round(cx) - 3, Math.round(cy) - 3);
}
