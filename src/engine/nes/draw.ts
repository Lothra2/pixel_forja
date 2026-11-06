import { createRaster, type Raster, type RGBA } from '../core/raster';
import type { NesLook } from './look';

/**
 * El dibujo del estilo Nekketsu, pixel por pixel y sin Canvas (mismo resultado en el navegador y en Node).
 * Cuadro de 32 x 32, los pies en y = 30. Cabeza grande y redonda (unos 14 x 13), ojos de rayita negra con cejas gruesas, torso corto y ancho,
 * manos grandes, piernas cortas, colores planos con una sombra, y un contorno oscuro alrededor de toda la figura.
 */
export const NES_CELL = 32;
export const NES_FOOT = 30;
export const NES_INK: RGBA = [16, 10, 24, 255];

export const rgb = (h: string): RGBA => { const s = h.replace('#', ''); return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16), 255]; };
export const nesShade = (c: RGBA, k: number): RGBA => [Math.max(0, Math.min(255, Math.round(c[0] * k))), Math.max(0, Math.min(255, Math.round(c[1] * k))), Math.max(0, Math.min(255, Math.round(c[2] * k))), 255];
const dark = (c: RGBA): boolean => c[0] + c[1] + c[2] < 200;

/** Un cuadro en construcción: un mapa de pixeles con utilidades de dibujo. */
export class NesCell {
  px = new Map<number, RGBA>();
  put(x: number, y: number, c: RGBA): void { const X = Math.round(x), Y = Math.round(y); if (X >= 0 && Y >= 0 && X < NES_CELL && Y < NES_CELL) this.px.set(Y * NES_CELL + X, c); }
  rect(x: number, y: number, w: number, h: number, c: RGBA): void { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.put(x + i, y + j, c); }
  line(x0: number, y0: number, x1: number, y1: number, c: RGBA, w = 1): void {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) + 1;
    for (let k = 0; k <= n; k++) {
      const t = k / Math.max(1, n), x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < w; dy++) this.put(x + dx - (w - 1) / 2, y + dy - (w - 1) / 2, c);
    }
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: RGBA): void {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) this.put(x, y, c);
    }
  }
  /** El cuadro terminado, con el contorno oscuro de una pieza alrededor de la figura (como los sprites de la NES). */
  raster(outline = true): Raster {
    const r = createRaster(NES_CELL, NES_CELL);
    for (const [k, c] of this.px) r.data.set(c, k * 4);
    if (!outline) return r;
    const src = new Uint8ClampedArray(r.data);
    const a = (x: number, y: number): number => (x < 0 || y < 0 || x >= NES_CELL || y >= NES_CELL ? 0 : src[(y * NES_CELL + x) * 4 + 3]);
    for (let y = 0; y < NES_CELL; y++) for (let x = 0; x < NES_CELL; x++) {
      if (a(x, y)) continue;
      if (a(x + 1, y) || a(x - 1, y) || a(x, y + 1) || a(x, y - 1)) r.data.set(NES_INK, (y * NES_CELL + x) * 4);
    }
    return r;
  }
}

export type NesView = 'side' | 'front' | 'back';
/** Una pose: dónde van las manos y los pies (respecto al hombro y a la cadera), cuánto se inclina, cuánto sube, y si el cuadro se gira (caídas, chilena). */
export interface NesPose {
  arms?: [number, number][]; legs?: [number, number][]; lean?: number; bob?: number; dx?: number; hx?: number; hy?: number;
  rot?: number; tx?: number; ty?: number; face?: 'normal' | 'grito' | 'dolor' | 'ko' | 'feliz' | 'triste';
}

/** La cabeza grande del estilo. cx es el centro, top la fila de arriba. La cara mira a la derecha de lado. */
export function head(c: NesCell, L: NesLook, cx: number, top: number, view: NesView, face: NesPose['face'] = 'normal'): void {
  const skin = rgb(L.piel), hair = rgb(L.pelo), sk2 = nesShade(skin, 0.8), hr2 = dark(hair) ? nesShade(hair, 2.2) : nesShade(hair, 0.75);
  const st = L.peinado, mk = new Set(L.marcas ?? []), acc = rgb(L.acento ?? '#ffd447');
  const w = 14, x0 = cx - 7;
  // el pelo largo cae detrás de la cabeza
  if (st === 'largo' || st === 'liso') {
    if (view === 'side') c.rect(x0, top + 5, 7, st === 'largo' ? 10 : 9, hair);
    else if (view === 'back') c.rect(x0 + 1, top + 5, w - 2, st === 'largo' ? 10 : 9, hair);
    else { c.rect(x0 - 1, top + 4, 3, st === 'largo' ? 10 : 9, hair); c.rect(x0 + w - 2, top + 4, 3, st === 'largo' ? 10 : 9, hair); }
  }
  if (st === 'moño') c.ellipse(view === 'side' ? x0 + 1 : cx, top + 1, 3, 2.6, hair);
  // el cráneo: casi cuadrado con las esquinas redondas, como en la NES
  c.rect(x0 + 2, top, w - 4, 13, skin); c.rect(x0 + 1, top + 1, w - 2, 11, skin); c.rect(x0, top + 3, w, 7, skin);
  // el pelo
  if (st !== 'rapado') {
    if (view === 'back') { c.rect(x0 + 2, top - 1, w - 4, 13, hair); c.rect(x0 + 1, top, w - 2, 11, hair); c.rect(x0, top + 2, w, 8, hair); }
    else {
      c.rect(x0 + 2, top - 1, w - 4, 4, hair); c.rect(x0 + 1, top, w - 2, 3, hair);
      if (view === 'side') { c.rect(x0, top + 1, 6, 8, hair); c.rect(x0 + 6, top + 2, 2, 2, hair); }
      else { c.rect(x0, top + 2, 2, 6, hair); c.rect(x0 + w - 2, top + 2, 2, 6, hair); c.rect(x0 + 2, top + 2, 3, 2, hair); c.rect(x0 + w - 5, top + 2, 3, 2, hair); }
      if (st === 'raya') { c.put(cx + 1, top, hr2); c.put(cx + 2, top + 1, hr2); }
      if (st === 'tazon') c.rect(x0 + 1, top + 3, w - 2, 2, hair);
    }
  } else c.rect(x0 + 2, top, w - 4, 2, nesShade(hair, 1.3));
  if (st === 'despeinado' || st === 'puntas') {
    for (let i = 0; i < 4; i++) { const dx = -5 + i * 3.5; c.line(cx + dx, top, cx + dx + (st === 'despeinado' ? 1.5 : 0), top - 3 - (i % 2), hair, 2); }
  }
  if (st === 'colitas') {
    if (view === 'side') { c.ellipse(x0 - 1.5, top + 6, 2.4, 3.6, hair); }
    else { c.ellipse(x0 - 2, top + 6, 2.4, 3.6, hair); c.ellipse(x0 + w + 2, top + 6, 2.4, 3.6, hair); }
  }
  if (mk.has('ligas')) { if (view === 'side') c.rect(x0 - 1, top + 2, 2, 2, acc); else { c.rect(x0 - 2, top + 2, 2, 2, acc); c.rect(x0 + w, top + 2, 2, 2, acc); } }
  if (mk.has('cintillo')) {
    c.rect(x0, top + 3, w, 2, acc);
    if (view === 'side') { c.rect(x0 - 2, top + 3, 2, 1, acc); c.rect(x0 - 3, top + 4, 2, 1, acc); }
  }
  if (mk.has('cuernos')) { c.line(cx - 4, top, cx - 5, top - 3, acc); c.line(cx + 4, top, cx + 5, top - 3, acc); }
  if (mk.has('aleta')) for (let i = 0; i < 4; i++) c.rect(cx - 2 + (i >> 1), top - 4 + i, 4 - i + (i > 1 ? 1 : 0), 1, acc);
  if (mk.has('plumas')) { c.line(cx - 6, top + 1, cx - 7, top - 2, acc, 2); c.line(cx + 6, top + 1, cx + 7, top - 2, acc, 2); }
  if (mk.has('antifaz')) { c.ellipse(cx - 5, top - 1, 1.8, 1.8, acc); c.ellipse(cx + 6, top - 1, 1.8, 1.8, acc); }
  if (view === 'back') return;
  // la cara: ojos de rayita negra, cejas gruesas, boca chiquita
  const brow = L.malandro ? 2 : 1, ink = NES_INK;
  if (view === 'side') {
    const fx = cx + 3;
    if (mk.has('antifaz')) c.rect(fx - 3, top + 5, 7, 3, nesShade(acc, 0.55));
    if (face === 'ko') { c.put(fx, top + 6, ink); c.put(fx + 1, top + 7, ink); c.put(fx + 1, top + 5, ink); c.put(fx - 1, top + 7, ink); c.put(fx - 1, top + 5, ink); }
    else if (face === 'feliz') { c.rect(fx - 1, top + 6, 3, 1, ink); }
    else c.rect(fx, top + 5, 1, 3, ink);
    if (face !== 'ko') c.rect(fx - 1, top + 4 - (face === 'grito' ? 1 : 0), 3, brow, ink);
    c.put(cx + 7, top + 7, skin); c.put(cx + 7, top + 8, sk2);                   // la nariz
    if (face === 'grito' || face === 'dolor') c.rect(fx + 1, top + 9, 3, 2, ink); else c.rect(fx + 1, top + 10, 3, 1, nesShade(skin, 0.55));
    c.rect(cx - 1, top + 6, 2, 3, sk2);                                           // la oreja
    if (mk.has('barba')) { c.rect(cx - 1, top + 9, 8, 3, hair); c.rect(cx + 1, top + 12, 5, 1, hair); c.rect(fx + 1, top + 10, 3, 1, nesShade(skin, 0.55)); }
    if (mk.has('bigote')) c.rect(fx, top + 9, 4, 1, hair);
    if (mk.has('lentes')) { c.rect(fx - 2, top + 5, 4, 3, [180, 220, 255, 255]); c.rect(fx - 2, top + 5, 4, 1, ink); }
  } else {
    if (mk.has('antifaz')) c.rect(cx - 6, top + 5, 13, 3, nesShade(acc, 0.55));
    for (const ex of [cx - 3, cx + 2]) {
      if (face === 'ko') { c.put(ex, top + 5, ink); c.put(ex + 1, top + 6, ink); c.put(ex, top + 7, ink); c.put(ex - 1, top + 6, ink); }
      else if (face === 'feliz') c.rect(ex - 1, top + 6, 3, 1, ink);
      else c.rect(ex, top + 5, 1, 3, ink);
      if (face !== 'ko') c.rect(ex - 1, top + 4 - (face === 'grito' ? 1 : 0), 3, brow, ink);
    }
    if (face === 'grito' || face === 'dolor') c.rect(cx - 1, top + 9, 3, 2, ink); else c.rect(cx - 1, top + 10, 3, 1, nesShade(skin, 0.55));
    if (mk.has('barba')) { c.rect(cx - 5, top + 9, 11, 3, hair); c.rect(cx - 3, top + 12, 7, 1, hair); c.rect(cx - 1, top + 10, 3, 1, nesShade(skin, 0.55)); }
    if (mk.has('bigote')) c.rect(cx - 2, top + 9, 5, 1, hair);
    if (mk.has('lentes')) { c.rect(cx - 5, top + 5, 4, 3, [180, 220, 255, 255]); c.rect(cx + 1, top + 5, 4, 3, [180, 220, 255, 255]); c.rect(cx - 5, top + 5, 10, 1, ink); }
  }
}

/** Torso, short, brazos con manos grandes y piernas cortas. Las manos y los pies van relativos al hombro y a la cadera. */
export function body(c: NesCell, L: NesLook, cx: number, top: number, view: NesView, p: NesPose): void {
  const shirt = rgb(L.camisa), shorts = rgb(L.short), socks = rgb(L.medias), shoes = rgb(L.zapatos), skin = rgb(L.piel);
  const sh2 = nesShade(shirt, 0.75), lean = p.lean ?? 0, wide = L.talla === 'grande' ? 1 : 0;
  const hipx = cx + lean, hipy = top + 8;
  const legs = p.legs ?? [[2, 6], [-2, 6]], arms = p.arms ?? [[1, 6], [-1, 6]];
  // las piernas (detrás del short): muslo de piel, media y zapato
  legs.forEach(([fx, fy], i) => {
    const k: number = view === 'side' ? 0 : i === 0 ? -2 : 2;
    const kx = hipx + k, ky = hipy + 1, ex = hipx + fx, ey = hipy + fy;
    const s = i === 0 ? socks : nesShade(socks, 0.8);
    c.line(kx, ky, ex, ey - 1, i === 0 ? skin : nesShade(skin, 0.85), 3);
    c.line(kx + (ex - kx) * 0.5, ky + (ey - ky) * 0.5, ex, ey - 1, s, 3);
    if (view === 'side') c.rect(ex - 1, ey - 1, 5, 2, i === 0 ? shoes : nesShade(shoes, 1.5));
    else c.rect(ex - 2, ey - 1, 4, 2, i === 0 ? shoes : nesShade(shoes, 1.5));
  });
  const side = view === 'side', tw = side ? 9 : 11 + wide * 2, tx0 = cx - (side ? 4 : 5 + wide) + lean;
  // los brazos: manga, brazo y una mano grande (o el guante del portero). De lado el de atrás va detrás del torso y el de adelante encima,
  // corrido hacia el frente para que se lea como brazo y no como una mancha en la camisa
  const arm = (i: number): void => {
    const [hx, hy] = arms[i];
    const sx = side ? cx + lean + (i === 0 ? 2 : -2) : cx + lean + (i === 0 ? -5 - wide : 5 + wide), sy = top + 1, tx = sx + hx, ty = sy + hy;
    const back = side && i === 1;
    c.line(sx, sy, sx + hx * 0.4, sy + hy * 0.4, back ? sh2 : shirt, 3);
    c.line(sx + hx * 0.4, sy + hy * 0.4, tx, ty, back ? nesShade(skin, 0.8) : skin, 2);
    c.rect(tx - 1, ty - 1, 3, 3, L.guantes ? [248, 248, 248, 255] : back ? nesShade(skin, 0.8) : skin);
  };
  if (side) arm(1);
  // el torso: corto y ancho de frente, más angosto de lado, con la sombra abajo
  c.rect(tx0, top, tw, 7, shirt);
  c.rect(tx0, top + 6, tw, 1, sh2);
  if (side) c.rect(tx0, top + 1, 1, 5, sh2);
  // el short
  c.rect(tx0, top + 7, tw, 3, shorts);
  c.rect(tx0, top + 9, tw, 1, nesShade(shorts, 0.78));
  if (!side) c.rect(cx + lean, top + 8, 1, 2, nesShade(shorts, 0.6));
  if (side) { // a thin dark line where the near arm crosses the shirt keeps the two apart
    const [hx, hy] = arms[0], sx = cx + lean + 2, sy = top + 1;
    c.line(sx - 1, sy + 1, sx + hx * 0.4 - 1, sy + hy * 0.4 + 1, sh2, 1);
    arm(0);
  } else { arm(0); arm(1); }
}
