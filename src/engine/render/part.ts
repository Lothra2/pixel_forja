import { BASE } from '../color/ramp';

export interface Px { mat: string; slot: number }

/** Pieza en construcción. Se sombrea completa al final y recién ahí va al lienzo. */
export class Part {
  readonly px = new Map<number, Px>();
  static key(x: number, y: number) { return (y + 2048) * 8192 + (x + 2048); }
  set(x: number, y: number, mat: string, slot = BASE) { this.px.set(Part.key(x, y), { mat, slot }); }
  has(x: number, y: number) { return this.px.has(Part.key(x, y)); }
  get(x: number, y: number) { return this.px.get(Part.key(x, y)); }
  *entries(): Generator<[number, number, Px]> {
    for (const [k, v] of this.px) yield [(k % 8192) - 2048, Math.floor(k / 8192) - 2048, v];
  }
}

/** Pincel de grosor fijo: un cuadrado de t x t que se estampa a lo largo de la línea. Nunca se rotan imágenes. */
export function stroke(part: Part, a: [number, number], b: [number, number], t: number, matAt: (s: number) => string, slot = BASE) {
  const x0 = Math.round(a[0]), y0 = Math.round(a[1]), x1 = Math.round(b[0]), y1 = Math.round(b[1]);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  const n = Math.max(dx, -dy);
  let err = dx + dy, x = x0, y = y0, i = 0;
  const off = Math.floor((t - 1) / 2);
  for (;;) {
    const mat = matAt(n ? i / n : 0);
    for (let yy = 0; yy < t; yy++) for (let xx = 0; xx < t; xx++) part.set(x - off + xx, y - off + yy, mat, slot);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
    i++;
  }
}

/** Círculo lleno de diámetro `size` centrado en c. */
export function blob(part: Part, c: [number, number], size: number, mat: string, slot = BASE) {
  const r = (size - 1) / 2;
  const ox = Math.round(c[0] - r), oy = Math.round(c[1] - r);
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++) {
      const dx = i - r, dy = j - r;
      if (dx * dx + dy * dy <= r * r + 0.5) part.set(ox + i, oy + j, mat, slot);
    }
}

/** Polígono lleno (centro de pixel adentro). */
export function polygon(part: Part, pts: [number, number][], mat: string, slot = BASE) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++)
    for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) part.set(x, y, mat, slot);
    }
}

export function rot(p: [number, number], deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
}
