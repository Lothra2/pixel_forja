import { createRaster, type Raster } from '../core/raster';
import { makeRamp } from '../color/ramp';

/**
 * El pintor del chibi: capas del tamaño de la celda donde cada pieza se pinta con su color plano.
 * Al juntar las capas, cada una lleva su contorno negro de 1 px por fuera (así el brazo de adelante
 * queda separado del pecho, como en el video) y una sombra de 1 px abajo y atrás.
 */

export const CONTORNO = 0x100c14;
export const VACIO = -1;

export interface Capa {
  w: number; h: number;
  col: Int32Array;
  /** 1 = se sombrea en el borde de abajo y atrás. */
  som: Uint8Array;
  contorno: boolean;
  /** Oscurecer toda la capa (brazo y pierna de atrás). */
  lejos?: boolean;
}

export function capa(w: number, h: number, contorno = true): Capa {
  return { w, h, col: new Int32Array(w * h).fill(VACIO), som: new Uint8Array(w * h), contorno };
}

const hexCache = new Map<string, number>();
export function hex(h: string): number {
  let v = hexCache.get(h);
  if (v === undefined) {
    const s = h.replace('#', '');
    const f = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
    v = parseInt(f.slice(0, 6), 16) | 0;
    hexCache.set(h, v);
  }
  return v;
}
export const toHex = (v: number) => '#' + (v & 0xffffff).toString(16).padStart(6, '0');

const rampCache = new Map<number, [number, number, number]>();
/** [sombra, base, luz] de un color, con el giro de tono de la rampa del motor. */
export function rampa(v: number): [number, number, number] {
  let r = rampCache.get(v);
  if (!r) {
    const rp = makeRamp(toHex(v));
    r = [hex(rp[1]), v, hex(rp[3])];
    rampCache.set(v, r);
  }
  return r;
}
export const sombra = (v: number) => rampa(v)[0];
export const luz = (v: number) => rampa(v)[2];
export function mezcla(a: number, b: number, t: number): number {
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

const lum = (v: number) => ((v >> 16) & 255) * 0.3 + ((v >> 8) & 255) * 0.59 + (v & 255) * 0.11;
/** Lo muy oscuro (ropa, pelo) se pierde contra el contorno negro: se sube hasta que se lea (como en SF2). */
export function legible(v: number): number {
  const l = lum(v);
  return l >= 58 ? v : mezcla(v, hex('#b8bccc'), Math.min(0.6, (58 - l) / (184 - l)));
}
/** La sombra de un color, sin caer en el negro del contorno. */
export function sombraLegible(v: number): number {
  const s = sombra(v);
  return lum(s) >= 34 ? s : mezcla(v, CONTORNO, 0.32);
}
export function pon(c: Capa, x: number, y: number, v: number, som = 1): void {
  x = Math.floor(x); y = Math.floor(y);
  if (x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  c.col[y * c.w + x] = v; c.som[y * c.w + x] = som;
}
export function hay(c: Capa, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= c.w || y >= c.h) return false;
  return c.col[y * c.w + x] !== VACIO;
}
export function rect(c: Capa, x: number, y: number, w: number, h: number, v: number, som = 1): void {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) pon(c, x + i, y + j, v, som);
}

/**
 * Barra orientada de (ax, ay) a (bx, by) con grosor entero. `color(t, lado)` da el color según dónde cae el pixel
 * a lo largo (t de 0 a 1) y de lado (-1 atrás, 1 adelante); -1 deja el pixel vacío.
 * Los extremos se extienden `pad` pixeles (para que las juntas de codo y rodilla no queden con hueco).
 */
export function barra(c: Capa, ax: number, ay: number, bx: number, by: number, grosor: number, color: (t: number, lado: number) => number, pad = 0.5, som = 1): void {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 0.0001;
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const r = grosor / 2 + 1;
  const x0 = Math.floor(Math.min(ax, bx) - r - pad), x1 = Math.ceil(Math.max(ax, bx) + r + pad);
  const y0 = Math.floor(Math.min(ay, by) - r - pad), y1 = Math.ceil(Math.max(ay, by) + r + pad);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const px = x + 0.5 - ax, py = y + 0.5 - ay;
    const a = px * ux + py * uy, p = px * nx + py * ny;
    if (a < -pad || a > L + pad) continue;
    if (p < -grosor / 2 || p >= grosor / 2) continue;
    const v = color(Math.max(0, Math.min(1, a / L)), p >= 0 ? 1 : -1);
    if (v !== VACIO) pon(c, x, y, v, som);
  }
}

/** Elipse llena (centro en pixel). */
export function elipse(c: Capa, cx: number, cy: number, rx: number, ry: number, v: number, som = 1): void {
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
    const ex = (x + 0.5 - cx) / (rx + 0.01), ey = (y + 0.5 - cy) / (ry + 0.01);
    if (ex * ex + ey * ey <= 1) pon(c, x, y, v, som);
  }
}

/** Polígono lleno (regla par-impar en el centro del pixel). */
export function poligono(c: Capa, pts: [number, number][], v: number | ((x: number, y: number) => number), som = 1): void {
  const ys = pts.map((p) => p[1]), xs = pts.map((p) => p[0]);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
    const px = x + 0.5, py = y + 0.5;
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
    if (inside) {
      const col = typeof v === 'number' ? v : v(x, y);
      if (col !== VACIO) pon(c, x, y, col, som);
    }
  }
}

/** Pega una imagen chica (la cabeza, ya pintada) en la capa, girada en cuartos de vuelta y espejada. */
export function pegar(c: Capa, src: Capa, ox: number, oy: number, cuartos = 0, espejo = false): void {
  const q = ((cuartos % 4) + 4) % 4;
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    const v = src.col[y * src.w + x];
    if (v === VACIO) continue;
    let sx = espejo ? src.w - 1 - x : x, sy = y;
    let tx: number, ty: number;
    if (q === 0) { tx = sx; ty = sy; }
    else if (q === 1) { tx = src.h - 1 - sy; ty = sx; }
    else if (q === 2) { tx = src.w - 1 - sx; ty = src.h - 1 - sy; }
    else { tx = sy; ty = src.w - 1 - sx; }
    sx = tx; sy = ty;
    pon(c, ox + sx, oy + sy, v, src.som[y * src.w + x]);
  }
}

/** Junta las capas en una imagen RGBA: contorno por capa, sombra de borde y oscurecido de lo lejano. */
export function juntar(capas: Capa[], w: number, h: number, mira = 1): Raster {
  const out = createRaster(w, h);
  const d = out.data;
  const set = (i: number, v: number) => { d[i * 4] = (v >> 16) & 255; d[i * 4 + 1] = (v >> 8) & 255; d[i * 4 + 2] = v & 255; d[i * 4 + 3] = 255; };
  for (const c of capas) {
    const { col, som } = c;
    if (c.contorno) {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (col[i] !== VACIO) continue;
        if ((x > 0 && col[i - 1] !== VACIO) || (x < w - 1 && col[i + 1] !== VACIO) || (y > 0 && col[i - w] !== VACIO) || (y < h - 1 && col[i + w] !== VACIO)) set(i, CONTORNO);
      }
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let v = col[i];
      if (v === VACIO) continue;
      if (som[i]) {
        const abajo = y === h - 1 || col[i + w] === VACIO;
        const bx = x - mira;
        const atras = bx < 0 || bx >= w || col[y * w + bx] === VACIO;
        if (abajo || atras) v = sombra(v);
      }
      if (c.lejos) v = mezcla(v, sombra(v), 0.55);
      set(i, v);
    }
  }
  return out;
}
