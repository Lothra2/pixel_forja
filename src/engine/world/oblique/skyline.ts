import { rng } from '../../fx/pix';
import { Lienzo } from './lienzo';
import type { Paleta } from './paleta';

/**
 * Siluetas lejanas que se repiten en x sin costura. Van en un color plano con ventanitas, así se leen lejos con la
 * bruma detrás. Cada lugar trae sus íconos.
 */
export const SKYLINES = ['saigon_skyline'] as const;
export type Skyline = (typeof SKYLINES)[number];

/** Landmark 81: torre de cajas escalonadas que se angosta, con la aguja. Base en (x, gy). */
function landmark81(L: Lienzo, x: number, gy: number, h: number) {
  const tramos = [[22, 0.34], [18, 0.26], [14, 0.18], [10, 0.12], [6, 0.06]] as const;
  let y = gy;
  tramos.forEach(([w, k], i) => {
    const hh = Math.round(h * k), off = Math.floor((22 - w) / 2) + (i % 2 ? 1 : 0);
    L.f(x + off, y - hh, w, hh, 'celeste');
    for (let yy = y - hh + 2; yy < y - 1; yy += 3) for (let xx = x + off + 2; xx < x + off + w - 2; xx += 3) L.p(xx, yy, 'cielo');
    L.vl(x + off + w - 1, y - hh, hh, 'azul');
    y -= hh;
  });
  L.vl(x + 11, y - 10, 10, 'celeste'); L.p(x + 11, y - 11, 'rojo');
}

/** Bitexco: torre en forma de capullo con el helipuerto que sale de lado. */
function bitexco(L: Lienzo, x: number, gy: number, h: number) {
  for (let v = 0; v < h; v++) {
    const t = v / h, hw = Math.round(10 * Math.sin(Math.PI * (0.12 + t * 0.78)) ** 0.7);
    const yy = gy - 1 - v;
    L.f(x + 12 - hw, yy, hw * 2, 1, 'celeste');
    L.p(x + 12 + hw - 1, yy, 'azul');
    if (v % 3 === 1) for (let xx = x + 14 - hw; xx < x + 10 + hw; xx += 3) L.p(xx, yy, 'cielo');
  }
  const hy = gy - Math.round(h * 0.62);
  L.f(x + 12, hy, 14, 2, 'celeste'); L.hl(x + 12, hy + 2, 13, 'azul');
}

/** Torre genérica de oficinas o vivienda, con ventanas en rejilla. */
function torre(L: Lienzo, x: number, gy: number, w: number, h: number, R: () => number) {
  L.f(x, gy - h, w, h, 'celeste');
  for (let yy = gy - h + 3; yy < gy - 2; yy += 4) for (let xx = x + 2; xx < x + w - 2; xx += 3) if (R() < 0.7) L.p(xx, yy, 'cielo');
  L.vl(x + w - 1, gy - h, h, 'azul');
  if (R() < 0.4) { L.vl(x + Math.floor(w / 2), gy - h - 6, 6, 'celeste'); }
}

/** Grúa de construcción. */
function grua(L: Lienzo, x: number, gy: number, h: number) {
  for (let v = 0; v < h; v++) { L.p(x, gy - v, 'celeste'); L.p(x + 2, gy - v, 'celeste'); if (v % 3 === 0) L.p(x + 1, gy - v, 'celeste'); }
  L.hl(x - 10, gy - h, 34, 'celeste'); L.hl(x - 10, gy - h + 1, 6, 'azul');
  L.vl(x + 18, gy - h + 1, 10, 'celeste');
}

/**
 * La ciudad lejana de Saigón, de `w` x `h`, con la base en la última fila. El borde izquierdo y el derecho calzan:
 * nada cruza el borde, así se repite sin salto.
 */
export function saigonSkyline(pal: Paleta, w: number, h: number, seed = 81): Lienzo {
  const L = new Lienzo(w, h, pal), R = rng(seed), gy = h;
  // relleno bajo y continuo: techos de la ciudad
  for (let x = 0; x < w; x += 6 + Math.floor(R() * 10)) {
    const bw = 8 + Math.floor(R() * 16), bh = 10 + Math.floor(R() * 16);
    torre(L, Math.min(x, w - bw), gy, bw, bh, R);
  }
  L.f(0, gy - 8, w, 8, 'celeste');
  // torres medianas, sin tocar los bordes
  for (let x = 30; x < w - 40; x += 40 + Math.floor(R() * 50)) torre(L, x, gy, 12 + Math.floor(R() * 12), 28 + Math.floor(R() * 34), R);
  // los íconos
  landmark81(L, Math.floor(w * 0.68), gy, Math.min(h - 14, 130));
  bitexco(L, Math.floor(w * 0.3), gy, Math.min(h - 30, 84));
  grua(L, Math.floor(w * 0.12), gy - 20, 44);
  return L;
}
