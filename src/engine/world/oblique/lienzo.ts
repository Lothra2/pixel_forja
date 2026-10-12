import { Pix, grain } from '../../fx/pix';
import type { Color, Paleta } from './paleta';

/**
 * Un lienzo que pinta con los nombres de la paleta del escenario. Así nada se sale de los 24 colores de la ficha.
 * Todo en enteros y sin mezcla (alfa 0 o 255).
 */
export class Lienzo extends Pix {
  constructor(w: number, h: number, readonly pal: Paleta) { super(w, h); }

  p(x: number, y: number, c: Color) { this.px(x, y, this.pal[c]); }
  f(x: number, y: number, w: number, h: number, c: Color) { this.rect(x, y, w, h, this.pal[c]); }
  hl(x: number, y: number, w: number, c: Color) { this.rect(x, y, w, 1, this.pal[c]); }
  vl(x: number, y: number, h: number, c: Color) { this.rect(x, y, 1, h, this.pal[c]); }
  ln(x0: number, y0: number, x1: number, y1: number, c: Color) { this.line(x0, y0, x1, y1, this.pal[c]); }
  d(cx: number, cy: number, rad: number, c: Color, sy = 1) { this.disc(cx, cy, rad, this.pal[c], sy); }
  /** Rectángulo con borde de 1 px. */
  box(x: number, y: number, w: number, h: number, fill: Color, edge: Color) { this.f(x, y, w, h, edge); if (w > 2 && h > 2) this.f(x + 1, y + 1, w - 2, h - 2, fill); }
  /** Tramado de damero: mezcla dos colores sin salirse de la paleta. */
  dither(x: number, y: number, w: number, h: number, a: Color, b: Color) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.p(x + i, y + j, (x + i + y + j) & 1 ? b : a);
  }
  /** Salpica un color en granitos, con probabilidad `k`, solo donde ya hay pintura. */
  speckle(x: number, y: number, w: number, h: number, c: Color, k: number, seed: number) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (this.has(x + i, y + j) && grain(x + i, y + j, seed) < k) this.p(x + i, y + j, c);
  }
  /** Chorreado de mugre bajo un borde: rayitas que bajan con largo al azar. */
  drips(x: number, y: number, w: number, maxLen: number, c: Color, seed: number, k = 0.35) {
    for (let i = 0; i < w; i++) {
      const g = grain(x + i, y, seed);
      if (g > k) continue;
      const len = 1 + Math.floor(grain(x + i, y + 1, seed + 1) * maxLen);
      for (let j = 0; j < len; j++) if (this.has(x + i, y + j) && (j < 2 || grain(x + i, y + j, seed + 2) < 0.8)) this.p(x + i, y + j, c);
    }
  }
  /** Caja en vista oblicua: el techo (d px) y el frente (z px) con borde. Devuelve el alto total. */
  obl(x: number, y: number, w: number, d: number, z: number, top: Color, front: Color, edge: Color) {
    this.f(x, y, w, d, top);
    this.f(x, y + d, w, z, front);
    this.hl(x, y + d, w, edge);
    return d + z;
  }
}
