import { rng } from '../../fx/pix';
import { Lienzo } from './lienzo';
import type { Color, Paleta } from './paleta';

/**
 * Siluetas lejanas que se repiten en x sin costura. Van en un color plano con ventanitas, así se leen lejos con la
 * bruma detrás. Cada lugar trae sus íconos y cada hora sus tonos.
 */
export const SKYLINES = ['saigon_skyline', 'saigon_landmark81', 'saigon_bitexco'] as const;
export type Skyline = (typeof SKYLINES)[number];

/** Los colores de la silueta: cuerpo, ventanas, el lado en sombra y el detalle (antena, foco). */
export interface Tonos { cuerpo: Color; ventana: Color; sombra: Color; detalle: Color; ventanas: number }
export function tonosDe(hora: string, lluvia: boolean): Tonos {
  if (lluvia) return { cuerpo: 'asfalto_claro', ventana: 'oro', sombra: 'asfalto', detalle: 'rojo', ventanas: 0.25 };
  if (hora === 'mediodia') return { cuerpo: 'cemento_claro', ventana: 'cielo', sombra: 'cemento', detalle: 'rojo', ventanas: 0.6 };
  if (hora === 'atardecer') return { cuerpo: 'celeste', ventana: 'oro', sombra: 'azul_noche', detalle: 'rojo', ventanas: 0.35 };
  return { cuerpo: 'celeste', ventana: 'cielo', sombra: 'azul', detalle: 'rojo', ventanas: 0.7 };
}

/** Landmark 81: torre de cajas escalonadas que se angosta, con la aguja. Base en (x, gy), ancho de la base `w`. */
function landmark81(L: Lienzo, x: number, gy: number, h: number, T: Tonos, w = 22) {
  const tramos = [[1, 0.34], [0.82, 0.26], [0.64, 0.18], [0.45, 0.12], [0.27, 0.06]] as const;
  let y = gy;
  tramos.forEach(([k, kh], i) => {
    const tw = Math.max(3, Math.round(w * k)), hh = Math.round(h * kh), off = Math.floor((w - tw) / 2) + (i % 2 ? 1 : 0);
    L.f(x + off, y - hh, tw, hh, T.cuerpo);
    for (let yy = y - hh + 2; yy < y - 1; yy += 3) for (let xx = x + off + 2; xx < x + off + tw - 2; xx += 3) if ((xx * 7 + yy * 3) % 10 < T.ventanas * 10) L.p(xx, yy, T.ventana);
    L.vl(x + off + tw - 1, y - hh, hh, T.sombra);
    L.hl(x + off, y - hh, tw, T.sombra);
    y -= hh;
  });
  const cx = x + Math.floor(w / 2);
  L.vl(cx, y - Math.round(h * 0.08), Math.round(h * 0.08), T.cuerpo); L.p(cx, y - Math.round(h * 0.08) - 1, T.detalle);
}

/** Bitexco: torre en forma de capullo con el helipuerto que sale de lado. `k` escala el ancho. */
function bitexco(L: Lienzo, x: number, gy: number, h: number, T: Tonos, k = 1) {
  const hwMax = Math.round(10 * k);
  for (let v = 0; v < h; v++) {
    const t = v / h, hw = Math.round(hwMax * Math.sin(Math.PI * (0.12 + t * 0.78)) ** 0.7);
    const yy = gy - 1 - v, cx = x + hwMax + 2;
    L.f(cx - hw, yy, hw * 2, 1, T.cuerpo);
    L.p(cx + hw - 1, yy, T.sombra);
    if (v % 3 === 1) for (let xx = cx + 2 - hw; xx < cx - 2 + hw; xx += 3) if ((xx + v) % 10 < T.ventanas * 10) L.p(xx, yy, T.ventana);
  }
  const cx = x + hwMax + 2, hy = gy - Math.round(h * 0.62);
  L.f(cx, hy, Math.round(14 * k), Math.max(2, Math.round(2 * k)), T.cuerpo); L.hl(cx, hy + Math.max(2, Math.round(2 * k)), Math.round(13 * k), T.sombra);
  L.vl(cx, gy - h - Math.round(8 * k), Math.round(8 * k), T.cuerpo); L.p(cx, gy - h - Math.round(8 * k) - 1, T.detalle);
}

/** Torre genérica de oficinas o vivienda, con ventanas en rejilla. */
function torre(L: Lienzo, x: number, gy: number, w: number, h: number, R: () => number, T: Tonos) {
  L.f(x, gy - h, w, h, T.cuerpo);
  for (let yy = gy - h + 3; yy < gy - 2; yy += 4) for (let xx = x + 2; xx < x + w - 2; xx += 3) if (R() < T.ventanas) L.p(xx, yy, T.ventana);
  L.vl(x + w - 1, gy - h, h, T.sombra);
  if (R() < 0.4) L.vl(x + Math.floor(w / 2), gy - h - 6, 6, T.cuerpo);
}

/** Grúa de construcción. */
function grua(L: Lienzo, x: number, gy: number, h: number, T: Tonos) {
  for (let v = 0; v < h; v++) { L.p(x, gy - v, T.cuerpo); L.p(x + 2, gy - v, T.cuerpo); if (v % 3 === 0) L.p(x + 1, gy - v, T.cuerpo); }
  L.hl(x - 10, gy - h, 34, T.cuerpo); L.hl(x - 10, gy - h + 1, 6, T.sombra);
  L.vl(x + 18, gy - h + 1, 10, T.cuerpo);
}

/** Relleno bajo y continuo de techos, y torres medianas lejos de los bordes. */
function ciudad(L: Lienzo, R: () => number, T: Tonos, alto = 1) {
  const w = L.w, gy = L.h;
  for (let x = 0; x < w; x += 6 + Math.floor(R() * 10)) {
    const bw = 8 + Math.floor(R() * 16), bh = Math.round((10 + Math.floor(R() * 16)) * alto);
    torre(L, Math.min(x, w - bw), gy, bw, bh, R, T);
  }
  L.f(0, gy - 8, w, 8, T.cuerpo);
  for (let x = 30; x < w - 40; x += 40 + Math.floor(R() * 50)) torre(L, x, gy, 12 + Math.floor(R() * 12), Math.round((28 + Math.floor(R() * 34)) * alto), R, T);
}

/**
 * La ciudad lejana de Saigón, de `w` x `h`, con la base en la última fila. El borde izquierdo y el derecho calzan:
 * nada cruza el borde, así se repite sin salto.
 */
export function saigonSkyline(pal: Paleta, w: number, h: number, seed = 81, T: Tonos = tonosDe('manana', false)): Lienzo {
  const L = new Lienzo(w, h, pal), R = rng(seed), gy = h;
  ciudad(L, R, T);
  landmark81(L, Math.floor(w * 0.68), gy, Math.min(h - 14, 130), T);
  bitexco(L, Math.floor(w * 0.3), gy, Math.min(h - 30, 84), T);
  grua(L, Math.floor(w * 0.12), gy - 20, 44, T);
  return L;
}

/** Del otro lado del río: Landmark 81 grande y cerca, con Thủ Thiêm bajo y verde a sus pies. */
export function saigonLandmark81(pal: Paleta, w: number, h: number, seed = 81, T: Tonos = tonosDe('mediodia', false)): Lienzo {
  const L = new Lienzo(w, h, pal), R = rng(seed), gy = h;
  ciudad(L, R, T, 0.8);
  landmark81(L, Math.floor(w * 0.55), gy, Math.min(h - 4, 166), T, 34);
  bitexco(L, Math.floor(w * 0.18), gy, Math.min(h - 40, 70), T, 0.8);
  grua(L, Math.floor(w * 0.82), gy - 16, 50, T);
  // la orilla de enfrente: árboles bajos de Thủ Thiêm
  // los árboles dan la vuelta por el borde: así el trozo se repite sin salto
  for (let x = 0; x < w; x += 5) { const r = 3 + ((x * 13) % 4); for (const dx of [-w, 0, w]) L.d(x + 2 + dx, gy - 6, r, 'verde_oscuro', 0.7); }
  L.f(0, gy - 4, w, 4, 'verde_oscuro');
  // la última columna repite la primera: la vuelta no se nota
  for (let y = 0; y < h; y++) L.r.data.copyWithin(((y + 1) * w - 1) * 4, y * w * 4, y * w * 4 + 4);
  return L;
}

/** Bitexco de cerca, entre torres con las ventanas prendidas: la vista de las azoteas. */
export function saigonBitexco(pal: Paleta, w: number, h: number, seed = 81, T: Tonos = tonosDe('tarde', true)): Lienzo {
  const L = new Lienzo(w, h, pal), R = rng(seed), gy = h;
  ciudad(L, R, T, 1.4);
  bitexco(L, Math.floor(w * 0.42), gy, Math.min(h - 4, 158), T, 1.8);
  landmark81(L, Math.floor(w * 0.85), gy, Math.min(h - 40, 110), T, 18);
  return L;
}

/** La ciudad lejana que pide el layout (`paralaje.lejos`). */
export function lejosDe(nombre: string | undefined, pal: Paleta, w: number, h: number, seed: number, T: Tonos): Lienzo {
  if (nombre === 'saigon_landmark81') return saigonLandmark81(pal, w, h, seed, T);
  if (nombre === 'saigon_bitexco') return saigonBitexco(pal, w, h, seed, T);
  return saigonSkyline(pal, w, h, seed, T);
}
