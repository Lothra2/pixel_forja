import { createRaster, type Raster } from '../core/raster';

/**
 * Herramientas de pintura de las cinemáticas del final (encargo F13). Son las mismas ideas del intro (degradés con
 * tramado, brillos que suman luz, ruido suave) más polígonos, trazos gruesos y cantos de luz, en un archivo aparte
 * para no tocar el intro.
 */

export type RGB = [number, number, number];
export const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const mixc = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function hash(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** ruido de valor suave; `px` = periodo en x (0 = sin repetir) */
export function vnoise(x: number, y: number, cell: number, seed: number, px = 0, py = 0): number {
  const gx = x / cell, gy = y / cell, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const nx = px ? Math.round(px / cell) : 0, ny = py ? Math.round(py / cell) : 0;
  const wx = (i: number) => (nx ? ((i % nx) + nx) % nx : i), wy = (j: number) => (ny ? ((j % ny) + ny) % ny : j);
  const v = (i: number, j: number) => hash(wx(i), wy(j), seed);
  const a = v(x0, y0), b = v(x0 + 1, y0), c = v(x0, y0 + 1), d = v(x0 + 1, y0 + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
export const fbm = (x: number, y: number, s: number, px = 0) => vnoise(x, y, 48, s, px) * 0.55 + vnoise(x, y, 16, s + 1, px) * 0.3 + vnoise(x, y, 6, s + 2, px) * 0.15;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const bayer = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)];

export function setPx(r: Raster, x: number, y: number, c: RGB, a = 255) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= r.w || y >= r.h || a <= 0) return;
  const k = (y * r.w + x) * 4;
  if (a >= 255 || !r.data[k + 3]) { r.data[k] = c[0]; r.data[k + 1] = c[1]; r.data[k + 2] = c[2]; r.data[k + 3] = Math.max(Math.min(255, Math.round(a)), r.data[k + 3]); return; }
  const t = a / 255;
  for (let i = 0; i < 3; i++) r.data[k + i] = r.data[k + i] * (1 - t) + c[i] * t;
  r.data[k + 3] = Math.max(r.data[k + 3], Math.round(a));
}
export function getPx(r: Raster, x: number, y: number): RGB | null {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= r.w || y >= r.h) return null;
  const k = (y * r.w + x) * 4;
  return r.data[k + 3] ? [r.data[k], r.data[k + 1], r.data[k + 2]] : null;
}
export const alphaAt = (r: Raster, x: number, y: number) => (x < 0 || y < 0 || x >= r.w || y >= r.h ? 0 : r.data[(y * r.w + x) * 4 + 3]);
/** suma luz a lo que ya está pintado, sin tocar lo transparente */
export function addLight(r: Raster, x: number, y: number, c: RGB, k: number) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= r.w || y >= r.h || k <= 0) return;
  const i = (y * r.w + x) * 4;
  if (!r.data[i + 3]) return;
  for (let q = 0; q < 3; q++) r.data[i + q] = Math.min(255, r.data[i + q] + c[q] * k);
}
/** degradé vertical con tramado */
export function vgrad(r: Raster, stops: [number, string][], y0 = 0, y1 = r.h, x0 = 0, x1 = r.w) {
  const S = stops.map(([t, h]) => [t, hex(h)] as [number, RGB]);
  for (let y = y0; y < y1; y++) {
    const t = (y - y0) / Math.max(1, y1 - y0 - 1);
    let i = 0;
    while (i < S.length - 2 && t > S[i + 1][0]) i++;
    const [ta, ca] = S[i], [tb, cb] = S[i + 1];
    const u = clamp01((t - ta) / Math.max(1e-6, tb - ta));
    for (let x = x0; x < x1; x++) {
      const q = Math.floor(u * 4 + bayer(x, y) * 0.999) / 4;
      setPx(r, x, y, mixc(ca, cb, Math.min(1, q)));
    }
  }
}
/** brillo radial aditivo en una elipse */
export function glow(r: Raster, cx: number, cy: number, rx: number, ry: number, c: RGB, k: number, pow = 2) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
    if (d >= 1) continue;
    addLight(r, x, y, c, (1 - d) ** pow * k + (bayer(x & 3, y & 3) - 0.5) * 0.03);
  }
}
/** brillo que también pinta donde no hay nada (para capas de luz): alfa según la distancia */
export function halo(r: Raster, cx: number, cy: number, rx: number, ry: number, c: RGB, k: number) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
    if (d >= 1) continue;
    const a = Math.round(Math.floor(((1 - d) ** 2 * k) * 6 + bayer(x & 3, y & 3) * 0.99) / 6 * 255);
    if (a <= 0) continue;
    if (alphaAt(r, x, y)) addLight(r, x, y, c, a / 255);
    else setPx(r, x, y, c, a);
  }
}
/** polígono relleno (regla par-impar) */
export function fillPoly(r: Raster, pts: [number, number][], c: RGB | ((x: number, y: number) => RGB | null), a = 255) {
  const ys = pts.map((p) => p[1]);
  const y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(r.h - 1, Math.ceil(Math.max(...ys)));
  for (let y = y0; y <= y1; y++) {
    const xs: number[] = [];
    const yy = y + 0.5;
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= yy && by > yy) || (by <= yy && ay > yy)) xs.push(ax + ((yy - ay) / (by - ay)) * (bx - ax));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) {
      const col = typeof c === 'function' ? c(x, y) : c;
      if (col) setPx(r, x, y, col, a);
    }
  }
}
/** trazo grueso de a a b, con grosor que puede ir de w0 a w1 */
export function stroke(r: Raster, a: [number, number], b: [number, number], w0: number, c: RGB | ((t: number, d: number) => RGB | null), w1 = w0, alpha = 255) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(1, Math.ceil(len * 2));
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, w = w0 + (w1 - w0) * t;
    const R = Math.ceil(w);
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const d = Math.hypot(dx, dy);
      if (d > w) continue;
      const col = typeof c === 'function' ? c(t, d / Math.max(0.01, w)) : c;
      if (col) setPx(r, x + dx, y + dy, col, alpha);
    }
  }
}
/** curva por puntos (spline de Catmull-Rom), trazada con grosor variable */
export function curva(r: Raster, pts: [number, number][], w: (t: number) => number, c: RGB | ((t: number, d: number) => RGB | null), alpha = 255) {
  const P = (i: number) => pts[Math.max(0, Math.min(pts.length - 1, i))];
  const seg: [number, number][] = [];
  for (let i = 0; i < pts.length - 1; i++) for (let s = 0; s < 8; s++) {
    const t = s / 8, p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const q = (k: 0 | 1) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t * t * t);
    seg.push([q(0), q(1)]);
  }
  seg.push(pts[pts.length - 1]);
  for (let i = 0; i < seg.length - 1; i++) {
    const t0 = i / (seg.length - 1), t1 = (i + 1) / (seg.length - 1);
    stroke(r, seg[i], seg[i + 1], w(t0), typeof c === 'function' ? (t, d) => c(t0 + (t1 - t0) * t, d) : c, w(t1), alpha);
  }
}
/** elipse rellena */
export function ellipse(r: Raster, cx: number, cy: number, rx: number, ry: number, c: RGB | ((x: number, y: number, d: number) => RGB | null), a = 255) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
    if (d > 1) continue;
    const col = typeof c === 'function' ? c(x, y, d) : c;
    if (col) setPx(r, x, y, col, a);
  }
}
/** contorno oscuro de 1 px alrededor de lo pintado (para que las figuras se lean) */
export function contorno(r: Raster, c: RGB, a = 255) {
  const src = new Uint8ClampedArray(r.data);
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    if (src[(y * r.w + x) * 4 + 3]) continue;
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < r.w && Y < r.h && src[(Y * r.w + X) * 4 + 3] > 128; });
    if (n) setPx(r, x, y, c, a);
  }
}
/** canto de luz: los pixeles de borde del lado de `dir` ([dx, dy] hacia donde está la luz) toman el color */
export function canto(r: Raster, dir: [number, number], c: RGB, k = 0.7, ancho = 1) {
  const src = new Uint8ClampedArray(r.data);
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    const i = (y * r.w + x) * 4;
    if (src[i + 3] < 128) continue;
    let borde = false;
    for (let s = 1; s <= ancho && !borde; s++) {
      const X = Math.round(x + dir[0] * s), Y = Math.round(y + dir[1] * s);
      if (X < 0 || Y < 0 || X >= r.w || Y >= r.h || src[(Y * r.w + X) * 4 + 3] < 128) borde = true;
    }
    if (borde) for (let q = 0; q < 3; q++) r.data[i + q] = r.data[i + q] * (1 - k) + c[q] * k;
  }
}
export const copia = (r: Raster): Raster => ({ w: r.w, h: r.h, data: new Uint8ClampedArray(r.data) });
export const lienzo = (w: number, h: number) => createRaster(w, h);
/** pega src encima de dst con su alfa */
export function pegar(dst: Raster, src: Raster, ox: number, oy: number, alpha = 1) {
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    const s = (y * src.w + x) * 4;
    const a = src.data[s + 3] * alpha;
    if (a <= 0) continue;
    setPx(dst, ox + x, oy + y, [src.data[s], src.data[s + 1], src.data[s + 2]], a);
  }
}
/** agranda por un entero (vecino más cercano) */
export function agrandar(r: Raster, k: number): Raster {
  const o = createRaster(r.w * k, r.h * k);
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) { const s = ((Math.floor(y / k)) * r.w + Math.floor(x / k)) * 4; o.data.set(r.data.subarray(s, s + 4), (y * o.w + x) * 4); }
  return o;
}
/** lleva cada pixel a un tono de una rampa por su luz (para pasar sprites a contraluz o a hielo) */
export function aRampa(r: Raster, rampa: RGB[], k = 1): Raster {
  const o = copia(r);
  for (let i = 0; i < r.w * r.h; i++) {
    if (!r.data[i * 4 + 3]) continue;
    const l = (r.data[i * 4] * 0.3 + r.data[i * 4 + 1] * 0.59 + r.data[i * 4 + 2] * 0.11) / 255;
    const c = rampa[Math.max(0, Math.min(rampa.length - 1, Math.floor(l * rampa.length)))];
    for (let q = 0; q < 3; q++) o.data[i * 4 + q] = r.data[i * 4 + q] * (1 - k) + c[q] * k;
  }
  return o;
}
