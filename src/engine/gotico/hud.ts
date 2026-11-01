import { zipSync } from 'fflate';
import { createRaster, type Raster } from '../core/raster';
import { encodePng } from '../export/png';
import { renderLoot } from '../loot/render';
import { baseWeapon, baseArmor, baseOffhand, findLoot, rollItem, modText, SET_NAME, SET_BONUS, type LootItem } from '../loot/catalog';
import type { Rarity } from '../loot/materials';
import { pintarEscena } from './render';
import { personajeEscena, armaSuelta, type Cuerpo, type Equipo, type TipoArma, type Encanto } from './cuerpo';
import { HEROES } from './catalogo/personajes';

/**
 * Interfaz del taller gótico: la barra de abajo con los orbes de vida y maná, el cinturón de pociones, los botones
 * de habilidad, las barras de aguante y experiencia; los paneles de 320x432 (inventario, personaje, árbol de
 * habilidades, cofre, mercader, misiones y portales), el tooltip en 9 partes, 30 íconos de habilidad, cursores,
 * minimapa, barra del jefe, placas de nombre, cuadro de diálogo, botones de menú, pantalla de carga, cartel de
 * muerte y destello de subir de nivel. Todo para una pantalla base de 800x600, como los juegos de rol oscuros de
 * fines de los 90, pero con diseño propio: hierro forjado y piedra tallada con remaches de latón, cuero gastado y
 * el escudo de la familia GG (dos G entrelazadas).
 *
 * Todo se pinta por código en Raster, sin Canvas, así sale igual en el navegador y en Node.
 * La luz viene siempre de arriba a la izquierda. Paleta apagada, de 256 colores.
 * Los textos salen en español o en inglés (`idioma`).
 */

// =====================================================================================================================
// Colores y lienzo
// =====================================================================================================================

export type Idioma = 'es' | 'en';
export type C3 = [number, number, number];
type Rampa = C3[];

const hx = (h: string): C3 => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rampa = (...hs: string[]): Rampa => hs.map(hx);
const mezcla = (a: C3, b: C3, t: number): C3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const escalar = (a: C3, k: number): C3 => [a[0] * k, a[1] * k, a[2] * k];
const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);

/** Paleta de la interfaz: rampas cortas, de la sombra a la luz. */
export const PALETA = {
  piedra: rampa('#08070a', '#100e12', '#17141a', '#1f1b21', '#28232a', '#322c33', '#3e373e', '#4c444a', '#5d5458'),
  hierro: rampa('#09090c', '#121318', '#1b1d23', '#262931', '#33373f', '#444952', '#5a6069', '#757b84', '#999ea5'),
  laton: rampa('#1a1004', '#33220b', '#523813', '#73501c', '#956c2a', '#b58a3e', '#d0aa5c', '#e6c88a', '#f6e6be'),
  cuero: rampa('#0f0906', '#1b110b', '#281a10', '#372416', '#47301e', '#583d27', '#6b4c32', '#7e5d40'),
  sangre: rampa('#1c0306', '#36060b', '#560b12', '#7a121a', '#9e1c22', '#c02a2a', '#de4a3c', '#f08060', '#ffc2a0'),
  mana: rampa('#030520', '#060c3a', '#0c1658', '#152478', '#1f3698', '#2c4cb8', '#4568d4', '#7092ea', '#b4ccff'),
  veneno: rampa('#031206', '#06220c', '#0c3612', '#154c18', '#22661f', '#358228', '#52a032', '#80c048', '#c4e88a'),
  hielo: rampa('#0a1624', '#132a40', '#1e4260', '#2d5e80', '#447e9e', '#64a0ba', '#8cc2d4', '#bce0ea', '#eefaff'),
  aguante: rampa('#1e1404', '#3a2808', '#5a3e0c', '#7c5612', '#9e701a', '#c08c26', '#dcaa3a', '#f0cc6a'),
  xp: rampa('#140a02', '#2e1a06', '#4e2e0a', '#704412', '#94601c', '#b88028', '#d8a438', '#f2cc60', '#fff0b0'),
  pergamino: rampa('#2a2218', '#3e3324', '#544632', '#6c5b42', '#867154', '#a08a6a', '#bba684'),
  fuego: rampa('#2a0602', '#5a1004', '#8e2006', '#c43a0a', '#e86414', '#f89828', '#ffc858', '#fff0b0', '#ffffff'),
  rayo: rampa('#0a0a2a', '#1a1a5a', '#2e3a9a', '#4a6ad0', '#7aa0f0', '#b0d0ff', '#e8f4ff', '#ffffff'),
  sagrado: rampa('#2a1e04', '#4e3a0a', '#7a5c14', '#a88222', '#d0a838', '#ecc858', '#fae49a', '#fffadc'),
  sombra: rampa('#08040e', '#140a20', '#221236', '#341c4e', '#4a2a6a', '#64408a', '#8460aa', '#a888c8'),
  hueso: rampa('#1a1812', '#302c22', '#4a4434', '#666048', '#847e62', '#a49e80', '#c4bea0', '#e2dcc4', '#f8f4e6'),
  naturaleza: rampa('#0a1006', '#16200c', '#243414', '#34481c', '#486026', '#5e7a32', '#7a9844', '#9cb860'),
};
const P = PALETA;

/** Colores de rareza para el texto de los objetos. */
export const COLOR_RAREZA = {
  normal: hx('#e4e0d4'), magico: hx('#7484ff'), raro: hx('#ecdc5a'), set: hx('#3ed858'),
  unico: hx('#c8a868'), artesanal: hx('#ff9838'), engarzado: hx('#9a9a9a'),
} as const;
export type RarezaTexto = keyof typeof COLOR_RAREZA;

const TXT = {
  claro: hx('#d8d0bc'), tenue: hx('#958a76'), oro: hx('#e0bc6c'), rojo: hx('#e05a48'), azul: hx('#7c9cff'),
  verde: hx('#6ad06a'), hielo: hx('#9cd4ff'), rayo: hx('#f0e070'), veneno: hx('#8ae060'), fuego: hx('#ff8a48'),
  negro: hx('#000000'),
};

// tramado ordenado 4x4: degradés sin escalones
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bayer = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)];
/** Tono de la rampa para un valor 0..1, tramando entre los dos vecinos. */
function tono(r: Rampa, v: number, x: number, y: number): C3 {
  const t = clamp(v) * (r.length - 1);
  const b = Math.floor(t);
  return r[Math.min(r.length - 1, t - b > bayer(x, y) ? b + 1 : b)];
}

function hash(x: number, y: number, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 974711) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** Ruido de valor suave (0..1). */
function ruido(x: number, y: number, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x: number, y: number, s = 0) => ruido(x, y, s) * 0.55 + ruido(x * 2.1, y * 2.1, s + 7) * 0.3 + ruido(x * 4.3, y * 4.3, s + 13) * 0.15;

/** Un Raster con herramientas de dibujo (mezcla con alfa, rectángulos, líneas, polígonos, texto). */
export class Lienzo {
  r: Raster;
  constructor(public w: number, public h: number) { this.r = createRaster(w, h); }
  static de(r: Raster): Lienzo { const l = new Lienzo(0, 0); l.r = r; l.w = r.w; l.h = r.h; return l; }
  den(x: number, y: number) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  /** Pixel con mezcla (a de 0 a 1). Sobre transparente queda opaco con alfa a. */
  px(x: number, y: number, c: C3, a = 1) {
    x |= 0; y |= 0;
    if (!this.den(x, y) || a <= 0) return;
    const d = this.r.data, i = (y * this.w + x) * 4;
    const da = d[i + 3] / 255;
    if (a >= 1 || da === 0) {
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
      d[i + 3] = a >= 1 ? 255 : Math.max(d[i + 3], Math.round(a * 255));
      return;
    }
    d[i] += (c[0] - d[i]) * a; d[i + 1] += (c[1] - d[i + 1]) * a; d[i + 2] += (c[2] - d[i + 2]) * a;
    d[i + 3] = Math.round(255 * (a + da * (1 - a)));
  }
  /** Suma luz (resplandores). */
  suma(x: number, y: number, c: C3, k = 1) {
    x |= 0; y |= 0;
    if (!this.den(x, y) || k <= 0) return;
    const d = this.r.data, i = (y * this.w + x) * 4;
    d[i] += c[0] * k; d[i + 1] += c[1] * k; d[i + 2] += c[2] * k;
    if (d[i + 3] === 0) d[i + 3] = Math.round(clamp(k) * 255);
  }
  /** Multiplica (oscurece) el pixel. */
  mul(x: number, y: number, k: number) {
    x |= 0; y |= 0;
    if (!this.den(x, y)) return;
    const d = this.r.data, i = (y * this.w + x) * 4;
    d[i] *= k; d[i + 1] *= k; d[i + 2] *= k;
  }
  get(x: number, y: number): C3 { const i = ((y | 0) * this.w + (x | 0)) * 4; return [this.r.data[i], this.r.data[i + 1], this.r.data[i + 2]]; }
  alfa(x: number, y: number) { return this.den(x, y) ? this.r.data[((y | 0) * this.w + (x | 0)) * 4 + 3] : 0; }
  rect(x: number, y: number, w: number, h: number, c: C3, a = 1) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.px(i, j, c, a); }
  hl(x0: number, x1: number, y: number, c: C3, a = 1) { for (let x = x0; x <= x1; x++) this.px(x, y, c, a); }
  vl(x: number, y0: number, y1: number, c: C3, a = 1) { for (let y = y0; y <= y1; y++) this.px(x, y, c, a); }
  linea(x0: number, y0: number, x1: number, y1: number, c: C3, a = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (;;) {
      this.px(x0, y0, c, a);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }
  /** Pega otro raster (con su alfa). */
  pegar(src: Raster, ox: number, oy: number, a = 1) {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const i = (y * src.w + x) * 4, sa = src.data[i + 3];
      if (!sa) continue;
      this.px(ox + x, oy + y, [src.data[i], src.data[i + 1], src.data[i + 2]], (sa / 255) * a);
    }
  }
  /** Recorre cada pixel dentro de un polígono (regla par-impar). */
  cadaEnPoligono(pts: [number, number][], f: (x: number, y: number) => void) {
    let y0 = Infinity, y1 = -Infinity;
    for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const cy = y + 0.5, xs: number[] = [];
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > cy) !== (yj > cy)) xs.push(xi + ((cy - yi) / (yj - yi)) * (xj - xi));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) f(x, y);
    }
  }
  poligono(pts: [number, number][], c: C3, a = 1) { this.cadaEnPoligono(pts, (x, y) => this.px(x, y, c, a)); }
}

const crearLienzo = (w: number, h: number) => new Lienzo(w, h);

// =====================================================================================================================
// Fuente pixel propia (7 px de mayúscula, minúsculas con ascendentes y descendentes). Es original del taller:
// legible a 1x en 800x600. Fila 0 = arriba de la mayúscula, fila 6 = línea de base, 7 y 8 descendentes.
// =====================================================================================================================

const GLIFOS: Record<string, string> = {
  A: ' ### |#   #|#   #|#####|#   #|#   #|#   #', B: '#### |#   #|#   #|#### |#   #|#   #|#### ',
  C: ' ### |#   #|#    |#    |#    |#   #| ### ', D: '#### |#   #|#   #|#   #|#   #|#   #|#### ',
  E: '#####|#    |#    |#### |#    |#    |#####', F: '#####|#    |#    |#### |#    |#    |#    ',
  G: ' ### |#   #|#    |# ###|#   #|#   #| ####', H: '#   #|#   #|#   #|#####|#   #|#   #|#   #',
  I: '###| # | # | # | # | # |###', J: '  ###|    #|    #|    #|    #|#   #| ### ',
  K: '#   #|#  # |# #  |##   |# #  |#  # |#   #', L: '#    |#    |#    |#    |#    |#    |#####',
  M: '#   #|## ##|# # #|# # #|#   #|#   #|#   #', N: '#   #|##  #|# # #|#  ##|#   #|#   #|#   #',
  O: ' ### |#   #|#   #|#   #|#   #|#   #| ### ', P: '#### |#   #|#   #|#### |#    |#    |#    ',
  Q: ' ### |#   #|#   #|#   #|# # #|#  # | ## #', R: '#### |#   #|#   #|#### |# #  |#  # |#   #',
  S: ' ####|#    |#    | ### |    #|    #|#### ', T: '#####|  #  |  #  |  #  |  #  |  #  |  #  ',
  U: '#   #|#   #|#   #|#   #|#   #|#   #| ### ', V: '#   #|#   #|#   #|#   #| # # | # # |  #  ',
  W: '#   #|#   #|#   #|# # #|# # #|## ##|#   #', X: '#   #|#   #| # # |  #  | # # |#   #|#   #',
  Y: '#   #|#   #| # # |  #  |  #  |  #  |  #  ', Z: '#####|    #|   # |  #  | #   |#    |#####',
  a: '    |    | ### |    #| ####|#   #| ####', b: '#    |#    |#### |#   #|#   #|#   #|#### ',
  c: '    |    | ####|#    |#    |#    | ####', d: '    #|    #| ####|#   #|#   #|#   #| ####',
  e: '     |     | ### |#   #|#####|#    | ####', f: '  ##| #  |####| #  | #  | #  | #  ',
  g: '     |     | ####|#   #|#   #|#   #| ####|    #| ### ', h: '#    |#    |#### |#   #|#   #|#   #|#   #',
  i: '#| |#|#|#|#|#', j: '   #|    |  ##|   #|   #|   #|   #|#  #| ## ',
  k: '#   |#   |#  #|# # |##  |# # |#  #', l: '# |# |# |# |# |# | #',
  m: '     |     |## # |# # #|# # #|# # #|# # #', n: '     |     |#### |#   #|#   #|#   #|#   #',
  o: '     |     | ### |#   #|#   #|#   #| ### ', p: '     |     |#### |#   #|#   #|#   #|#### |#    |#    ',
  q: '     |     | ####|#   #|#   #|#   #| ####|    #|    #', r: '    |    |# ##|##  |#   |#   |#   ',
  s: '     |     | ####|#    | ### |    #|#### ', t: ' #  | #  |####| #  | #  | #  |  ##',
  u: '     |     |#   #|#   #|#   #|#   #| ####', v: '     |     |#   #|#   #|#   #| # # |  #  ',
  w: '     |     |#   #|#   #|# # #|# # #| # # ', x: '     |     |#   #| # # |  #  | # # |#   #',
  y: '     |     |#   #|#   #|#   #|#   #| ####|    #| ### ', z: '     |     |#####|   # |  #  | #   |#####',
  '0': ' ### |#   #|#  ##|# # #|##  #|#   #| ### ', '1': '  #  | ##  |  #  |  #  |  #  |  #  | ### ',
  '2': ' ### |#   #|    #|   # |  #  | #   |#####', '3': ' ### |#   #|    #|  ## |    #|#   #| ### ',
  '4': '   # |  ## | # # |#  # |#####|   # |   # ', '5': '#####|#    |#### |    #|    #|#   #| ### ',
  '6': ' ### |#    |#    |#### |#   #|#   #| ### ', '7': '#####|    #|   # |  #  |  #  |  #  |  #  ',
  '8': ' ### |#   #|#   #| ### |#   #|#   #| ### ', '9': ' ### |#   #|#   #| ####|    #|    #| ### ',
  ' ': '   ', '.': ' | | | | | |#', ',': '  |  |  |  |  | #| #|# ', ':': ' | |#| | | |#', ';': '  |  | #|  |  | #| #|# ',
  '!': '#|#|#|#|#| |#', '¡': '#| |#|#|#|#|#', '?': ' ### |#   #|    #|   # |  #  |     |  #  ',
  '¿': '  #  |     |  #  | #   |#    |#   #| ### ', '-': '   |   |   |###|   |   |   ', '+': '     |  #  |  #  |#####|  #  |  #  |     ',
  '%': '##  #|## # |   # |  #  | #   | # ##|#  ##', '/': '    #|   # |   # |  #  | #   | #   |#    ',
  '(': ' #|# |# |# |# |# | #', ')': '# | #| #| #| #| #|# ', '[': '##|# |# |# |# |# |##', ']': '##| #| #| #| #| #|##',
  "'": '#|#', '"': '# #|# #', '·': ' | | |#', '=': '    |    |####|    |####|    |    ', '_': '    |    |    |    |    |    |    |####',
  '<': '   #|  # | #  |#   | #  |  # |   #', '>': '#   | #  |  # |   #|  # | #  |#   ', '*': '     |# # #| ### |#####| ### |# # #|     ',
  '#': ' # # | # # |#####| # # |#####| # # | # # ', '&': ' ##  |#  # |# #  | #   |# # #|#  # | ## #', '°': ' # |# #| # ',
  '«': '      |      |  #  #| #  # |#  #  | #  # |  #  #', '»': '      |      |#  #  | #  # |  #  #| #  # |#  #  ',
  '…': '     |     |     |     |     |     |# # #',
};
/** Acentos: base, marca y en qué filas va. */
const ACENTOS: Record<string, [string, 'agudo' | 'tilde' | 'dieresis']> = {
  á: ['a', 'agudo'], é: ['e', 'agudo'], í: ['ı', 'agudo'], ó: ['o', 'agudo'], ú: ['u', 'agudo'], ñ: ['n', 'tilde'], ü: ['u', 'dieresis'],
  Á: ['A', 'agudo'], É: ['E', 'agudo'], Í: ['I', 'agudo'], Ó: ['O', 'agudo'], Ú: ['U', 'agudo'], Ñ: ['N', 'tilde'], Ü: ['U', 'dieresis'],
};
GLIFOS['ı'] = ' | |#|#|#|#|#';

interface Glifo { w: number; px: [number, number][] }
const cacheGlifos = new Map<string, Glifo>();
function glifo(ch: string): Glifo | null {
  const hit = cacheGlifos.get(ch);
  if (hit) return hit;
  let g: Glifo | null = null;
  const def = GLIFOS[ch];
  if (def !== undefined) {
    const filas = def.split('|');
    const w = Math.max(...filas.map((f) => f.length));
    const px: [number, number][] = [];
    filas.forEach((f, y) => { for (let x = 0; x < f.length; x++) if (f[x] === '#') px.push([x, y]); });
    g = { w, px };
  } else if (ACENTOS[ch]) {
    const [base, marca] = ACENTOS[ch];
    const b = glifo(base)!;
    const may = base === base.toUpperCase() && base !== 'ı';
    const top = may ? -3 : -1; // mayúsculas: dos filas sobre la letra; minúsculas: arriba de la x
    const cx = Math.floor(b.w / 2);
    const extra: [number, number][] =
      marca === 'agudo' ? [[cx + 1, top], [cx, top + 1]]
        : marca === 'tilde' ? [[cx - 1, top], [cx, top], [cx + 2, top], [cx - 2, top + 1], [cx + 1, top + 1]]
          : [[cx - 1, top + 1], [cx + 1, top + 1]];
    g = { w: b.w, px: [...b.px, ...extra] };
  }
  if (g) cacheGlifos.set(ch, g);
  return g;
}

export type Alineado = 'izq' | 'centro' | 'der';
export interface OpcTexto { sombra?: C3 | null; negrita?: boolean; alin?: Alineado; a?: number }

/** Ancho en pixeles de un texto con la fuente de la interfaz. */
export function anchoTexto(s: string, negrita = false): number {
  let w = 0;
  for (const ch of s) { const g = glifo(ch) ?? glifo('?')!; w += g.w + 1 + (negrita ? 1 : 0); }
  return Math.max(0, w - 1);
}

/** Escribe con la fuente de la interfaz. (x, y) es la esquina de arriba de la mayúscula. Devuelve el ancho. */
export function texto(l: Lienzo, x: number, y: number, s: string, c: C3, o: OpcTexto = {}): number {
  const w = anchoTexto(s, o.negrita);
  if (o.alin === 'centro') x = Math.round(x - w / 2);
  else if (o.alin === 'der') x = x - w;
  const sombra = o.sombra === undefined ? TXT.negro : o.sombra;
  const pasada = (dx: number, dy: number, col: C3, a: number) => {
    let cx = x;
    for (const ch of s) {
      const g = glifo(ch) ?? glifo('?')!;
      for (const [gx, gy] of g.px) {
        l.px(cx + gx + dx, y + gy + dy, col, a);
        if (o.negrita) l.px(cx + gx + 1 + dx, y + gy + dy, col, a);
      }
      cx += g.w + 1 + (o.negrita ? 1 : 0);
    }
  };
  if (sombra) pasada(1, 1, sombra, (o.a ?? 1) * 0.85);
  pasada(0, 0, c, o.a ?? 1);
  return w;
}

/**
 * Texto de título: relleno en degradé por filas (de la rampa), contorno oscuro y sombra. escala 1 o 2 (o más).
 * (x, y) es la esquina de arriba. Devuelve el ancho.
 */
export function textoTitulo(l: Lienzo, x: number, y: number, s: string, r: Rampa, o: { escala?: number; alin?: Alineado; contorno?: C3; negrita?: boolean } = {}): number {
  const k = o.escala ?? 1, neg = o.negrita ?? true;
  const w = anchoTexto(s, neg) * k;
  if (o.alin === 'centro') x = Math.round(x - w / 2);
  else if (o.alin === 'der') x = x - w;
  // máscara del texto
  const mw = w + 8 * k, mh = 14 * k;
  const m = new Int16Array(mw * mh).fill(-100);
  let cx = 0;
  for (const ch of s) {
    const g = glifo(ch) ?? glifo('?')!;
    for (const [gx, gy] of g.px) for (let b = 0; b <= (neg ? 1 : 0); b++) for (let sy = 0; sy < k; sy++) for (let sx = 0; sx < k; sx++) {
      const X = (cx + gx + b) * k + sx + 2 * k, Y = (gy + 3) * k + sy;
      if (X >= 0 && Y >= 0 && X < mw && Y < mh) m[Y * mw + X] = gy;
    }
    cx += g.w + 1 + (neg ? 1 : 0);
  }
  const en = (X: number, Y: number) => X >= 0 && Y >= 0 && X < mw && Y < mh && m[Y * mw + X] > -100;
  const ox = x - 2 * k, oy = y - 3 * k;
  const cont = o.contorno ?? hx('#0a0604');
  for (let Y = 0; Y < mh; Y++) for (let X = 0; X < mw; X++) {
    if (en(X, Y)) continue;
    let borde = false;
    for (let dy = -1; dy <= 1 && !borde; dy++) for (let dx = -1; dx <= 1; dx++) if (en(X + dx, Y + dy)) { borde = true; break; }
    if (borde) l.px(ox + X, oy + Y, cont);
    else if (en(X - 2, Y - 2) || en(X - 1, Y - 2)) l.px(ox + X, oy + Y, TXT.negro, 0.6);
  }
  for (let Y = 0; Y < mh; Y++) for (let X = 0; X < mw; X++) {
    if (m[Y * mw + X] === -100) continue;
    const fy = ((Y / k) - 3) / 7; // 0 arriba, 1 abajo de la mayúscula
    let v = 1 - fy * 0.85;
    if (!en(X, Y - 1)) v = 1.05; // borde de arriba con brillo
    if (!en(X, Y + 1)) v -= 0.12;
    l.px(ox + X, oy + Y, tono(r, v, X, Y));
  }
  return w;
}

/** Números chicos de 3x5 para esquinas de casilleros (atajos, cantidades). */
const MICRO: Record<string, string> = {
  '0': '###|# #|# #|# #|###', '1': ' # |## | # | # |###', '2': '###|  #|###|#  |###', '3': '###|  #| ##|  #|###', '4': '# #|# #|###|  #|  #',
  '5': '###|#  |###|  #|###', '6': '###|#  |###|# #|###', '7': '###|  #| # | # | # ', '8': '###|# #|###|# #|###', '9': '###|# #|###|  #|###',
  F: '###|#  |## |#  |#  ', M: '# #|###|###|# #|# #', L: '#  |#  |#  |#  |###', R: '## |# #|## |# #|# #', '+': '   | # |###| # |   ', '/': '  #|  #| # |#  |#  ',
  X: '# #|# #| # |# #|# #', V: '# #|# #|# #|# #| # ', ' ': '  |  |  |  |  ',
};
export function textoMicro(l: Lienzo, x: number, y: number, s: string, c: C3, sombra: C3 | null = TXT.negro) {
  const pasada = (dx: number, dy: number, col: C3) => {
    let cx = x;
    for (const ch of s) {
      const d = (MICRO[ch] ?? MICRO[' ']).split('|');
      d.forEach((f, yy) => { for (let xx = 0; xx < f.length; xx++) if (f[xx] === '#') l.px(cx + xx + dx, y + yy + dy, col); });
      cx += d[0].length + 1;
    }
  };
  if (sombra) pasada(1, 1, sombra);
  pasada(0, 0, c);
}
const anchoMicro = (s: string) => [...s].reduce((a, ch) => a + (MICRO[ch] ?? MICRO[' ']).split('|')[0].length + 1, 0) - 1;

// =====================================================================================================================
// Materiales: piedra tallada, hierro forjado, cuero gastado, latón. Biseles, remaches, grabados y casilleros hundidos.
// =====================================================================================================================

// luz de arriba a la izquierda y un poco de frente
const LUZ = (() => { const v = [-0.5, -0.62, 0.6]; const n = Math.hypot(...v); return v.map((c) => c / n) as [number, number, number]; })();

interface OpcMat { semilla?: number; luz?: number; contraste?: number }

/** Piedra oscura tallada: manchas suaves, poros y alguna grieta fina. */
function piedra(l: Lienzo, x0: number, y0: number, w: number, h: number, o: OpcMat & { grietas?: number; rampa?: Rampa } = {}) {
  const s = o.semilla ?? 1, base = o.luz ?? 0.36, k = o.contraste ?? 1, r = o.rampa ?? P.piedra;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    let v = base + (fbm(x / 11, y / 8, s) - 0.5) * 0.34 * k + (hash(x, y, s) - 0.5) * 0.07 * k;
    v += 0.05 * (1 - (y - y0) / Math.max(1, h)); // un poco más de luz arriba
    l.px(x, y, tono(r, v, x, y));
  }
  // poros: un pixel hondo con su borde de abajo a la derecha que agarra luz
  for (let y = y0 + 1; y < y0 + h - 1; y++) for (let x = x0 + 1; x < x0 + w - 1; x++) {
    const q = hash(x, y, s + 99);
    if (q < 0.010) { l.mul(x, y, 0.55); l.px(x + 1, y + 1, r[5], 0.35); }
  }
  // grietas: caminatas al azar con su labio claro
  const n = o.grietas ?? Math.round((w * h) / 9000);
  for (let g = 0; g < n; g++) {
    let x = x0 + hash(g, 1, s) * w, y = y0 + hash(g, 2, s) * h, a = hash(g, 3, s) * Math.PI * 2;
    const largo = 6 + hash(g, 4, s) * 18;
    for (let t = 0; t < largo; t++) {
      a += (hash(g, t, s + 5) - 0.5) * 1.1;
      x += Math.cos(a); y += Math.sin(a);
      if (x < x0 + 1 || y < y0 + 1 || x >= x0 + w - 1 || y >= y0 + h - 1) break;
      l.mul(x, y, 0.5); l.px(x + 1, y + 1, r[5], 0.25);
    }
  }
}

/** Hierro forjado: martillado, vetas horizontales y golpes. */
function hierro(l: Lienzo, x0: number, y0: number, w: number, h: number, o: OpcMat & { vertical?: boolean } = {}) {
  const s = o.semilla ?? 3, base = o.luz ?? 0.42;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const [u, v] = o.vertical ? [y, x] : [x, y];
    let t = base + (fbm(u / 16, v / 3, s) - 0.5) * 0.28 + (hash(x, y, s) - 0.5) * 0.06;
    t += 0.12 * (1 - (y - y0) / Math.max(1, h)) - 0.06;
    l.px(x, y, tono(P.hierro, t, x, y));
  }
  // golpes de martillo
  const n = Math.round((w * h) / 140);
  for (let g = 0; g < n; g++) {
    const cx = x0 + 2 + hash(g, 7, s) * (w - 4), cy = y0 + 1 + hash(g, 8, s) * (h - 2), rr = 1 + hash(g, 9, s) * 1.5;
    for (let y = Math.floor(cy - rr); y <= cy + rr; y++) for (let x = Math.floor(cx - rr); x <= cx + rr; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d > rr) continue;
      if (x - cx + y - cy < -0.5) l.mul(x, y, 0.82); else l.px(x, y, P.hierro[6], 0.18);
    }
  }
}

/** Cuero gastado con grano, zonas lustradas y costura opcional. */
function cuero(l: Lienzo, x0: number, y0: number, w: number, h: number, o: OpcMat & { costura?: boolean } = {}) {
  const s = o.semilla ?? 5, base = o.luz ?? 0.45;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    let v = base + (fbm(x / 7, y / 5, s) - 0.5) * 0.4 + (hash(x, y, s) - 0.5) * 0.12;
    if (hash(x >> 1, y, s + 2) < 0.06) v -= 0.12; // grano
    const e = Math.min(x - x0, y - y0, x0 + w - 1 - x, y0 + h - 1 - y);
    if (e === 0) v -= 0.3; else if (e === 1) v -= 0.08;
    if (y === y0 + 1) v += 0.12;
    l.px(x, y, tono(P.cuero, v, x, y));
  }
  if (o.costura && h >= 8) for (let x = x0 + 3; x < x0 + w - 3; x += 4) {
    l.px(x, y0 + 2, P.pergamino[4]); l.px(x + 1, y0 + 2, P.pergamino[3]); l.px(x, y0 + 3, P.cuero[0], 0.6);
    l.px(x, y0 + h - 3, P.pergamino[3]); l.px(x + 1, y0 + h - 3, P.pergamino[2]); l.px(x, y0 + h - 2, P.cuero[0], 0.6);
  }
}

/** Latón cepillado (para placas y bordes finos). */
function laton(l: Lienzo, x0: number, y0: number, w: number, h: number, o: OpcMat = {}) {
  const s = o.semilla ?? 9, base = o.luz ?? 0.55;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const v = base + (fbm(x / 9, y / 2, s) - 0.5) * 0.25 + 0.2 * (0.5 - (y - y0) / Math.max(1, h));
    l.px(x, y, tono(P.laton, v, x, y));
  }
}

/**
 * Bisel en el borde de un rectángulo: contorno oscuro, cantos de arriba y de la izquierda con luz, de abajo y de la
 * derecha en sombra (al revés si es hundido). b = grosor; las esquinas de arriba a la derecha y de abajo a la
 * izquierda quedan en un tono medio, como en un bisel tallado.
 */
function bisel(l: Lienzo, x0: number, y0: number, w: number, h: number, r: Rampa, b: number, o: { hundido?: boolean; sinContorno?: boolean; a?: number } = {}) {
  const n = r.length;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const e = Math.min(i, j, w - 1 - i, h - 1 - j);
    if (e >= b) continue;
    const x = x0 + i, y = y0 + j;
    if (e === 0 && !o.sinContorno) {
      if ((i === 0 || i === w - 1) && (j === 0 || j === h - 1)) continue; // esquinas redondeadas
      l.px(x, y, r[0], o.a ?? 1); continue;
    }
    const arriba = j === e, izq = i === e, abajo = h - 1 - j === e, der = w - 1 - i === e;
    let lado: 'luz' | 'sombra' | 'medio';
    if ((arriba && der) || (izq && abajo)) lado = 'medio';
    else if (arriba || izq) lado = 'luz';
    else lado = 'sombra';
    if (o.hundido) lado = lado === 'luz' ? 'sombra' : lado === 'sombra' ? 'luz' : 'medio';
    const p = (e - (o.sinContorno ? 0 : 1)) / Math.max(1, b - 1); // 0 afuera, 1 adentro
    let v = lado === 'luz' ? 0.92 - p * 0.3 : lado === 'sombra' ? 0.22 + p * 0.1 : 0.5;
    if (o.hundido && lado === 'luz') v = 0.6 - p * 0.15;
    const c = tono(r, v, x, y);
    l.px(x, y, c, o.a ?? 1);
  }
  void n;
}

/** Sombra interna (para huecos): oscurece el borde de arriba y de la izquierda hacia adentro. */
function sombraInterna(l: Lienzo, x0: number, y0: number, w: number, h: number, d = 4, k = 0.55) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const t = Math.min(i, j);
    const t2 = Math.min(w - 1 - i, h - 1 - j);
    if (t < d) l.mul(x0 + i, y0 + j, 1 - (1 - t / d) * k);
    else if (t2 < 2) l.mul(x0 + i, y0 + j, 1 - (2 - t2) * 0.06);
  }
}

/** Sombra que cae a la derecha y abajo de una pieza (oscurece lo que hay debajo). */
function sombraCaida(l: Lienzo, x0: number, y0: number, w: number, h: number, d = 2, k = 0.5) {
  for (let j = 0; j < h + d; j++) for (let i = 0; i < w + d; i++) {
    if (i < w && j < h) continue;
    if (i < d || j < d) continue;
    l.mul(x0 + i, y0 + j, 1 - k * (1 - Math.max(0, Math.max(i - w, j - h)) / (d + 1)));
  }
}

/** Sombra que proyecta un sprite (según su alfa) abajo a la derecha. */
function sombraDe(l: Lienzo, r: Raster, ox: number, oy: number, d = 3, k = 0.5) {
  for (let y = 0; y < r.h + d; y++) for (let x = 0; x < r.w + d; x++) {
    const dentro = (xx: number, yy: number) => xx >= 0 && yy >= 0 && xx < r.w && yy < r.h && r.data[(yy * r.w + xx) * 4 + 3] > 0;
    if (dentro(x, y)) continue;
    for (let s = d; s >= 1; s--) if (dentro(x - s, y - s)) { l.mul(ox + x, oy + y, 1 - k * (1 - (s - 1) / d)); break; }
  }
}

/** Remache redondo con brillo arriba a la izquierda y sombra que cae. */
function remache(l: Lienzo, cx: number, cy: number, r = 2, mat: Rampa = P.laton) {
  const R = r + 0.5;
  for (let y = Math.floor(cy - R) - 1; y <= cy + R + 2; y++) for (let x = Math.floor(cx - R) - 1; x <= cx + R + 2; x++) {
    const d0 = Math.hypot(x - cx, y - cy), d1 = Math.hypot(x - cx - 1, y - cy - 1);
    if (d0 > R && d1 <= R + 0.3) l.mul(x, y, 0.45);
  }
  for (let y = Math.floor(cy - R); y <= cy + R; y++) for (let x = Math.floor(cx - R); x <= cx + R; x++) {
    const dx = (x - cx) / R, dy = (y - cy) / R, d = dx * dx + dy * dy;
    if (d > 1) continue;
    const nz = Math.sqrt(1 - d);
    const lu = dx * LUZ[0] + dy * LUZ[1] + nz * LUZ[2];
    let v = 0.15 + lu * 0.8;
    if (d > 0.7) v = Math.min(v, 0.3);
    l.px(x, y, tono(mat, v, x, y));
  }
  l.px(Math.round(cx - r * 0.45), Math.round(cy - r * 0.45), mat[mat.length - 1]);
}

/** Máscara para grabar en piedra o metal (surcos) o en relieve. */
class Mascara {
  m: Uint8Array;
  constructor(public w: number, public h: number) { this.m = new Uint8Array(w * h); }
  set(x: number, y: number) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.m[y * this.w + x] = 1; }
  en(x: number, y: number) { return x >= 0 && y >= 0 && x < this.w && y < this.h && this.m[y * this.w + x] === 1; }
  linea(x0: number, y0: number, x1: number, y1: number) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n);
  }
  arco(cx: number, cy: number, r: number, a0: number, a1: number) {
    const n = Math.max(8, Math.ceil(Math.abs(a1 - a0) * r * 1.5));
    for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; this.set(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  }
  circulo(cx: number, cy: number, r: number) { this.arco(cx, cy, r, 0, Math.PI * 2); }
  disco(cx: number, cy: number, r: number) { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if (Math.hypot(x - cx, y - cy) <= r) this.set(x, y); }
  rombo(cx: number, cy: number, rx: number, ry: number) { this.linea(cx - rx, cy, cx, cy - ry); this.linea(cx, cy - ry, cx + rx, cy); this.linea(cx + rx, cy, cx, cy + ry); this.linea(cx, cy + ry, cx - rx, cy); }
}

/** Surco grabado: el fondo del surco en sombra y el labio de abajo a la derecha con luz. */
function grabar(l: Lienzo, m: Mascara, ox = 0, oy = 0, k = 1) {
  for (let y = -1; y <= m.h; y++) for (let x = -1; x <= m.w; x++) {
    if (m.en(x, y)) l.mul(ox + x, oy + y, 1 - 0.5 * k);
    else if (m.en(x - 1, y - 1)) l.px(ox + x, oy + y, [255, 236, 200], 0.13 * k);
  }
}
/** Relieve: la pieza sobresale, luz arriba a la izquierda y sombra que cae abajo a la derecha. */
function relieve(l: Lienzo, m: Mascara, ox = 0, oy = 0, k = 1) {
  for (let y = -1; y <= m.h + 1; y++) for (let x = -1; x <= m.w + 1; x++) {
    if (m.en(x, y)) {
      if (!m.en(x - 1, y - 1)) l.px(ox + x, oy + y, [255, 236, 200], 0.22 * k);
      else l.px(ox + x, oy + y, [255, 236, 200], 0.06 * k);
    } else if (m.en(x - 1, y - 1)) l.mul(ox + x, oy + y, 1 - 0.45 * k);
  }
}

/** Casillero hundido (inventario, cinturón, equipo): bisel de hierro hacia adentro, fondo oscuro, sombra interna. */
function casillero(l: Lienzo, x: number, y: number, w: number, h: number, o: { tinte?: C3; luzFondo?: number; semilla?: number } = {}) {
  piedra(l, x + 2, y + 2, w - 4, h - 4, { luz: o.luzFondo ?? 0.16, contraste: 0.6, semilla: o.semilla ?? x * 7 + y, grietas: 0 });
  if (o.tinte) for (let j = 2; j < h - 2; j++) for (let i = 2; i < w - 2; i++) {
    const g = 1 - Math.hypot((i - w / 2) / (w / 2), (j - h / 2) / (h / 2)) * 0.8;
    if (g > 0) l.suma(x + i, y + j, o.tinte, g * 0.12);
  }
  sombraInterna(l, x + 2, y + 2, w - 4, h - 4, 4, 0.6);
  bisel(l, x, y, w, h, P.hierro, 2, { hundido: true });
}

/** Separador horizontal de hierro con remaches. */
function barraHierro(l: Lienzo, x: number, y: number, w: number, h: number, remaches = 0, s = 1) {
  hierro(l, x, y, w, h, { semilla: s, luz: 0.46 });
  bisel(l, x, y, w, h, P.hierro, 2);
  if (remaches > 0) for (let i = 0; i < remaches; i++) {
    const rx = x + 5 + ((w - 11) * i) / Math.max(1, remaches - 1);
    remache(l, Math.round(rx), y + Math.floor(h / 2), h >= 9 ? 2 : 1, P.laton);
  }
}

// =====================================================================================================================
// El escudo de la familia GG: dos G entrelazadas sobre un escudo de campo rojo oscuro con borde de latón.
// =====================================================================================================================

/** ¿El punto (x, y) cae en una G de centro (cx, cy), radio externo ro y grosor t? */
function enG(x: number, y: number, cx: number, cy: number, ro: number, t: number): boolean {
  const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
  let a = Math.atan2(dy, dx); if (a < 0) a += Math.PI * 2; // 0 derecha, sentido horario (y hacia abajo)
  const enAnillo = d <= ro && d >= ro - t && !(a > Math.PI * 1.72 && a < Math.PI * 2) && !(a < 0.05);
  const barra = dx >= ro * 0.12 && dx <= ro - 0.2 && dy >= -0.2 && dy <= t - 0.2;
  const cola = dx >= ro - t && dx <= ro && dy >= -0.2 && dy <= ro * 0.4;
  return enAnillo || barra || cola;
}

/** Dibuja las GG entrelazadas centradas en (cx, cy) con radio ro: la de la derecha pasa por encima arriba y por debajo abajo. */
function pintarGG(l: Lienzo, cx: number, cy: number, ro: number, mat: Rampa = P.laton) {
  const t = Math.max(2, Math.round(ro * 0.34)), sep = ro * 0.74;
  const c1 = cx - sep, c2 = cx + sep;
  const x0 = Math.floor(cx - sep - ro - 2), x1 = Math.ceil(cx + sep + ro + 2), y0 = Math.floor(cy - ro - 2), y1 = Math.ceil(cy + ro + 2);
  const W = x1 - x0 + 1, H = y1 - y0 + 1;
  const id = new Uint8Array(W * H);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const px = x + 0.5, py = y + 0.5;
    const a = enG(px, py, c1, cy, ro, t), b = enG(px, py, c2, cy, ro, t);
    // la barra de la primera G pasa por encima de la segunda: así se lee G y no C
    const barra1 = px - c1 >= ro * 0.12 && px - c1 <= ro - 0.2 && py - cy >= -0.2 && py - cy <= t - 0.2;
    id[(y - y0) * W + (x - x0)] = a && b ? (barra1 ? 1 : py < cy ? 2 : 1) : a ? 1 : b ? 2 : 0;
  }
  const g = (x: number, y: number) => (x < x0 || y < y0 || x > x1 || y > y1 ? 0 : id[(y - y0) * W + (x - x0)]);
  // contorno y huecos del entrelazado
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const v = g(x, y);
    if (v !== 0) continue;
    let borde = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (g(x + dx, y + dy)) borde = true;
    if (borde) l.px(x, y, mat[0]);
    else if (g(x - 1, y - 1) || g(x - 2, y - 2)) l.mul(x, y, 0.55);
  }
  function py(y: number) { return y + 0.5; }
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const v = g(x, y);
    if (!v) continue;
    // el de abajo en el cruce se separa con un pixel oscuro del de arriba
    let tapado = false;
    const enBarra1 = v === 1 && x + 0.5 - c1 >= ro * 0.12 && y + 0.5 - cy >= -0.2 && y + 0.5 - cy <= t - 0.2;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = g(x + dx, y + dy); if (!enBarra1 && n && n !== v && ((py(y) < cy && n === 2) || (py(y) >= cy && n === 1))) tapado = true; }
    if (tapado) { l.px(x, y, mat[1]); continue; }
    const lit = !g(x - 1, y) || !g(x, y - 1), dark = !g(x + 1, y) || !g(x, y + 1);
    const vv = lit && !dark ? 0.95 : dark && !lit ? 0.35 : lit && dark ? 0.6 : 0.68;
    l.px(x, y, tono(mat, vv, x, y));
  }
}

/** Forma del escudo (heater): ancho w, alto h, en coordenadas locales. */
function enEscudo(x: number, y: number, w: number, h: number): boolean {
  const u = x / w - 0.5, v = y / h;
  if (v < 0 || v > 1) return false;
  if (v < 0.5) return Math.abs(u) <= 0.5 - Math.max(0, 0.04 - v) * 2;
  const k = (v - 0.5) / 0.5; // 0..1 hacia la punta
  return Math.abs(u) <= 0.5 * Math.sqrt(Math.max(0, 1 - k * k * 0.98)) * (1 - k * 0.15);
}

/** El escudo de la casa GG (tam 1: 26x30, 2: 52x60...). Borde de latón, campo rojo oscuro, GG de latón. */
export function escudoGG(tam = 1): Raster {
  const w = 26 * tam, h = 30 * tam;
  const l = crearLienzo(w + 2, h + 2);
  const en = (x: number, y: number) => enEscudo(x + 0.5, y + 0.5, w, h);
  const borde = Math.max(2, Math.round(2.2 * tam));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!en(x, y)) continue;
    let d = 99;
    for (let k = 1; k <= borde + 1 && d === 99; k++) for (const [dx, dy] of [[k, 0], [-k, 0], [0, k], [0, -k], [k, k], [-k, -k], [k, -k], [-k, k]]) if (!en(x + dx, y + dy)) { d = k; break; }
    if (d === 1) l.px(x, y, P.laton[0]);
    else if (d <= borde) {
      const lit = !en(x - d, y) || !en(x, y - d) || !en(x - d, y - d);
      l.px(x, y, tono(P.laton, lit ? 0.85 - (d - 2) * 0.1 : 0.4, x, y));
    } else if (d === borde + 1) l.px(x, y, P.sangre[0]);
    else {
      // campo: rojo oscuro con luz diagonal y un leve labrado de rombos
      const v = 0.42 - ((x + y) / (w + h)) * 0.25 + (hash(x, y, 4) - 0.5) * 0.05 + (((x + y) >> 2) % 2 === 0 && tam > 1 ? 0.03 : 0);
      l.px(x, y, tono(P.sangre, v, x, y));
    }
  }
  // franja diagonal tenue
  pintarGG(l, w / 2 - 0.5, h * 0.42, 5.3 * tam, P.laton);
  // brillo de la placa
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (en(x, y) && y < h * 0.3 && x > w * 0.2 && x < w * 0.5 && y > borde + 1 && hash(x, y, 2) < 0.06) l.px(x, y, P.laton[7], 0.25);
  return l.r;
}

// =====================================================================================================================
// Orbes de vida y maná: globo de vidrio con líquido animado (superficie con olas, menisco y burbujas), brillo en
// media luna arriba a la izquierda, borde oscuro y aro de hierro forjado con remaches de latón.
// =====================================================================================================================

export type TipoOrbe = 'vida' | 'mana' | 'veneno' | 'helado';
export const TIPOS_ORBE: TipoOrbe[] = ['vida', 'mana', 'veneno', 'helado'];
export const CUADROS_ORBE = 8;
/** Radio del vidrio del orbe en la barra de abajo. */
export const RADIO_ORBE = 38;
const ARO = 6;
const VIDRIO = rampa('#030205', '#07060b', '#0c0a12', '#13101b', '#1c1826', '#272233');
const LIQ: Record<TipoOrbe, Rampa> = { vida: P.sangre, mana: P.mana, veneno: P.veneno, helado: P.hielo };

/** Tamaño del raster de un orbe de radio r (vidrio + aro). */
export const ladoOrbe = (r = RADIO_ORBE) => 2 * (r + ARO + 1);

/**
 * Un cuadro del orbe. nivel de 0 (vacío) a 1 (lleno); cuadro de 0 a 7 (cierra el ciclo).
 * 'veneno' y 'helado' son variantes de la vida (envenenado y congelado).
 */
export function orbe(tipo: TipoOrbe, nivel: number, cuadro = 0, r = RADIO_ORBE): Raster {
  const S = ladoOrbe(r), l = crearLienzo(S, S);
  const c = S / 2, liq = LIQ[tipo];
  nivel = clamp(nivel);
  const fase = (cuadro % CUADROS_ORBE) / CUADROS_ORBE * Math.PI * 2;
  const calma = tipo === 'helado' ? 0.25 : 1;
  const amp = 1.25 * Math.sqrt(Math.sin(nivel * Math.PI)) * calma;
  const ySup = (x: number) => c + r - 2 * r * nivel + amp * (Math.sin((x / (r * 0.95)) * Math.PI * 2 + fase) * 0.7 + Math.sin((x / (r * 0.42)) * Math.PI * 2 - 2 * fase) * 0.35);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const px = x + 0.5, py = y + 0.5, dx = (px - c) / r, dy = (py - c) / r, d2 = dx * dx + dy * dy, d = Math.sqrt(d2);
    if (d > 1) continue;
    const nz = Math.sqrt(1 - d2), lu = dx * LUZ[0] + dy * LUZ[1] + nz * LUZ[2];
    let ys = ySup(px);
    // menisco: el líquido trepa un poco por el vidrio en los bordes
    const semi = Math.sqrt(Math.max(0.0001, 1 - ((ys - c) / r) ** 2));
    const borde = Math.abs(dx) / semi;
    if (borde > 0.8) ys -= ((borde - 0.8) / 0.2) ** 2 * 2.2;
    const prof = py - ys;
    let col: C3;
    if (prof >= 0 && nivel > 0) {
      const giro = Math.sin(dx * 5.2 + Math.sin(dy * 4 + fase) * 1.4 + fase) * Math.cos(dy * 3.1 - fase);
      let v = 0.26 + 0.36 * lu + 0.1 * giro * calma + 0.16 * nz - (prof / (2 * r)) * 0.2;
      if (tipo === 'veneno') v += 0.07 * Math.sin(dx * 9 - fase + dy * 6) - 0.04;
      if (prof < 1) v = 0.94; // la línea del menisco
      else if (prof < 2.2) v += 0.24;
      else if (prof < 4) v += 0.1;
      col = tono(liq, v, x, y);
    } else {
      // vidrio vacío, oscuro y apenas teñido por el líquido
      const v = 0.18 + 0.35 * lu * nz + 0.1 * nz;
      col = mezcla(tono(VIDRIO, v, x, y), liq[2], 0.12);
      // reflejo del líquido en la cara de atrás del vidrio, justo arriba de la superficie
      if (nivel > 0 && prof > -5 && prof < 0) col = mezcla(col, liq[3], 0.25 * (1 + prof / 5));
    }
    l.px(x, y, col);
  }
  // burbujas (o cristales de hielo flotando)
  const nb = tipo === 'veneno' ? 11 : tipo === 'helado' ? 6 : 8;
  for (let b = 0; b < nb; b++) {
    const t = ((cuadro % CUADROS_ORBE) / CUADROS_ORBE + hash(b, 3, 7)) % 1;
    const span = 14 + hash(b, 4, 7) * 18;
    const bx = c + (hash(b, 1, 7) - 0.5) * 1.15 * r + Math.sin(t * Math.PI * 4 + b) * 0.8;
    const by = c + r * 0.82 - hash(b, 2, 7) * r * 0.9 - t * span;
    const ddx = (bx - c) / r, ddy = (by - c) / r;
    if (ddx * ddx + ddy * ddy > 0.72 || by < ySup(bx) + 3) continue;
    if (tipo === 'helado') {
      const k = Math.sin(t * Math.PI);
      l.px(bx, by, liq[8], 0.4 + 0.6 * k);
      if (k > 0.6) { l.px(bx - 1, by, liq[7], 0.5); l.px(bx + 1, by, liq[7], 0.5); l.px(bx, by - 1, liq[7], 0.5); l.px(bx, by + 1, liq[7], 0.5); }
      continue;
    }
    if (t < 0.35 || (tipo !== 'veneno' && hash(b, 5, 7) < 0.4)) l.px(bx, by, liq[7], 0.75);
    else {
      l.px(bx, by, liq[8]); l.px(bx + 1, by, liq[6]); l.px(bx, by + 1, liq[6]); l.px(bx + 1, by + 1, liq[4]);
      if (tipo === 'veneno' && hash(b, 6, 7) < 0.5) { l.px(bx - 1, by, liq[5], 0.7); l.px(bx, by - 1, liq[7], 0.7); }
    }
  }
  // escarcha que trepa desde el borde (congelado)
  if (tipo === 'helado') {
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = (x + 0.5 - c) / r, dy = (y + 0.5 - c) / r, d = Math.hypot(dx, dy);
      if (d > 1 || d < 0.7) continue;
      const a = Math.atan2(dy, dx);
      const n = fbm(Math.cos(a) * 3 + 5, Math.sin(a) * 3 + 5, 21) * 0.6 + hash(x, y, 4) * 0.4;
      if (n > 1.55 - (d - 0.7) / 0.3 * 0.95) l.px(x, y, tono(P.hielo, 0.65 + (d - 0.7), x, y), 0.85);
    }
    for (let k = 0; k < 14; k++) {
      const a = hash(k, 1, 33) * Math.PI * 2, len = 4 + hash(k, 2, 33) * 9;
      let x = c + Math.cos(a) * (r - 1), y = c + Math.sin(a) * (r - 1);
      for (let i = 0; i < len; i++) {
        l.px(x, y, P.hielo[8], 0.7 - (i / len) * 0.5);
        if (i === Math.floor(len / 2)) { l.px(x + Math.sin(a) * 1.5, y - Math.cos(a) * 1.5, P.hielo[7], 0.5); l.px(x - Math.sin(a) * 1.5, y + Math.cos(a) * 1.5, P.hielo[7], 0.5); }
        x -= Math.cos(a); y -= Math.sin(a);
      }
    }
  }
  // vidrio: luz que atraviesa abajo a la derecha, borde oscuro, media luna de brillo y destello
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (x + 0.5 - c) / r, dy = (y + 0.5 - c) / r, d = Math.hypot(dx, dy);
    if (d > 1) continue;
    const ang = (Math.atan2(dy, dx) * 180) / Math.PI; // -180..180, 0 derecha, 90 abajo
    if (d > 0.84 && d < 0.93 && ang > 15 && ang < 120 && y + 0.5 > ySup(x + 0.5)) {
      const k = Math.sin(((ang - 15) / 105) * Math.PI) * Math.sin(((d - 0.84) / 0.09) * Math.PI);
      if (k > bayer(x, y) * 0.8) l.px(x, y, liq[7], 0.45 * k + 0.1);
    }
    if (d > 0.9) l.mul(x, y, 0.82 - (d - 0.9) * 3);
    if (d > 0.965) l.px(x, y, VIDRIO[0], 0.8);
    // media luna arriba a la izquierda
    const a2 = ang < 0 ? ang + 360 : ang; // 0..360
    if (d > 0.62 && d < 0.9 && a2 > 188 && a2 < 282) {
      const k = Math.sin(((d - 0.62) / 0.28) * Math.PI) * Math.sin(((a2 - 188) / 94) * Math.PI);
      if (k > 0.25 + bayer(x, y) * 0.55) l.px(x, y, [235, 240, 250], 0.16 + 0.32 * k);
      if (k > 0.85) l.px(x, y, [255, 255, 255], 0.3);
    }
  }
  // destello y reflejo de una ventana
  const sx = c - r * 0.44, sy = c - r * 0.5;
  for (let y = Math.floor(sy - 3); y <= sy + 3; y++) for (let x = Math.floor(sx - 3); x <= sx + 3; x++) {
    const d = Math.hypot((x + 0.5 - sx) / 1.25, y + 0.5 - sy);
    if (d < 1.4) l.px(x, y, [255, 255, 255], 0.95); else if (d < 2.6) l.px(x, y, [235, 240, 255], 0.35);
  }
  l.px(c + r * 0.34, c + r * 0.55, [255, 255, 255], 0.5); l.px(c + r * 0.38, c + r * 0.52, [255, 255, 255], 0.3);
  // aro de hierro forjado
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x + 0.5 - c, dy = y + 0.5 - c, d = Math.hypot(dx, dy);
    if (d <= r || d > r + ARO) continue;
    const u = (d - r) / ARO; // 0 adentro, 1 afuera
    const nr = (u - 0.45) * 1.9, nzz = Math.sqrt(Math.max(0, 1 - nr * nr));
    const lu = (dx / d) * nr * LUZ[0] + (dy / d) * nr * LUZ[1] + nzz * LUZ[2];
    let v = 0.05 + lu * 0.85 + (fbm(Math.atan2(dy, dx) * 9, u * 2, 5) - 0.5) * 0.15;
    if (d < r + 1 || d > r + ARO - 1) v = 0.02;
    l.px(x, y, tono(P.hierro, v, x, y));
  }
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    remache(l, Math.round(c + Math.cos(a) * (r + ARO / 2)) - 0.5, Math.round(c + Math.sin(a) * (r + ARO / 2)) - 0.5, 1.4, P.laton);
  }
  return l.r;
}

/** Los 8 cuadros del orbe y la tira horizontal. */
export function orbeAnimado(tipo: TipoOrbe, nivel: number, r = RADIO_ORBE): { img: Raster; frames: Raster[] } {
  const frames = Array.from({ length: CUADROS_ORBE }, (_, f) => orbe(tipo, nivel, f, r));
  return { img: tira(frames), frames };
}

/** Une cuadros del mismo tamaño en una tira horizontal. */
export function tira(frames: Raster[]): Raster {
  const w = frames[0].w, h = frames[0].h, out = createRaster(w * frames.length, h);
  frames.forEach((f, i) => { for (let y = 0; y < h; y++) out.data.set(f.data.subarray(y * w * 4, (y + 1) * w * 4), (y * out.w + i * w) * 4); });
  return out;
}

// =====================================================================================================================
// Formas biseladas y pictogramas
// =====================================================================================================================

/**
 * Pinta una forma cualquiera (dada por en(x, y)) con su relleno y un bisel de b pixeles que sigue el contorno:
 * los cantos que miran arriba a la izquierda con luz, los otros en sombra, y contorno oscuro.
 */
function forma(l: Lienzo, x0: number, y0: number, x1: number, y1: number, en: (x: number, y: number) => boolean, relleno: (x: number, y: number) => C3 | null, r: Rampa, b = 3) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!en(x, y)) continue;
    let d = 0;
    for (let k = 1; k <= b; k++) {
      if (!en(x - k, y) || !en(x + k, y) || !en(x, y - k) || !en(x, y + k) || !en(x - k, y - k) || !en(x + k, y + k) || !en(x + k, y - k) || !en(x - k, y + k)) { d = k; break; }
    }
    if (d === 0) { const c = relleno(x, y); if (c) l.px(x, y, c); continue; }
    if (d === 1 && (!en(x - 1, y) || !en(x + 1, y) || !en(x, y - 1) || !en(x, y + 1))) { l.px(x, y, r[0]); continue; }
    // ¿de qué lado está el afuera más cercano?
    let lu = 0;
    for (let k = 1; k <= d + 1; k++) { if (!en(x - k, y)) lu += 1; if (!en(x, y - k)) lu += 1; if (!en(x + k, y)) lu -= 1; if (!en(x, y + k)) lu -= 1; if (!en(x - k, y - k)) lu += 0.7; if (!en(x + k, y + k)) lu -= 0.7; }
    const p = (d - 1) / Math.max(1, b - 1);
    const v = lu > 0.3 ? 0.9 - p * 0.3 : lu < -0.3 ? 0.22 + p * 0.1 : 0.5;
    l.px(x, y, tono(r, v, x, y));
  }
}

/**
 * Pictogramas chicos dibujados a mano: '#' contorno, 'o' cuerpo, '+' brillo, '.' sombra, 'x' acento.
 * Se tiñen con una rampa al pintarlos.
 */
const PICTO: Record<string, string[]> = {
  personaje: [
    '    ####     ', '   #++oo#    ', '  #+oooo.#   ', '  #+o##o.#   ', '  #o#..#.#   ', '   #oooo#    ', '    #..#     ',
    '  ##o++o##   ', ' #+oo++oo.#  ', '#+ooo++ooo.# ', '#oooo++ooo.# ', '#ooooooooo.# ', ' ########## ',
  ],
  inventario: [
    '    ####     ', '   #+..#     ', '  #+#  #.#   ', ' ##########  ', '#++ooooooo.# ', '#+oooooooo.# ', '#ooo#xx#oo.# ',
    '#ooo#xx#oo.# ', '#oooo##ooo.# ', '#oooooooo..# ', '#ooooooo...# ', ' ########## ', '             ',
  ],
  habilidades: [
    '     #       ', '    #+#      ', '    #o#      ', ' ## #o# ##   ', '#+o##o##o.#  ', ' #oooxooo#   ', '  #oxxxo#    ',
    ' #oooxooo#   ', '#+o##o##o.#  ', ' ## #o# ##   ', '    #o#      ', '    #.#      ', '     #       ',
  ],
  mapa: [' ###########  ', '#+#ooooooo#.# ', '#+#x#ooo#x#.# ', '#+#ox#o#xo#.# ', '#+#oox#xoo#.# ', '#+#ooxxxoo#.# ', '#+#oox#xoo#.# ', '#+#ox#o#xo#.# ', '#+#x#ooo#x#.# ', '#+#oooooo.#.# ', ' ###########  '],
  menu: [
    '     ###     ', '  ## #+# ##  ', ' #+o##o##o.# ', ' #oo#ooo#..# ', '  ##o...o##  ', '###o.###.o###', '#+oo.# #.o..#',
    '###o.###.o###', '  ##o...o##  ', ' #+o#ooo#o.# ', ' #oo##o##..# ', '  ## #.# ##  ', '     ###     ',
  ],
  caminar: ['     ##      ', '    #++#     ', '    #oo#     ', '     ##      ', '    #+o#     ', '   #+oo.#    ', '  #+#oo.##   ', '    #oo.#    ', '    #o#.#    ', '   #o# #.#   ', '   #o#  #.#  ', '  ##    ###  '],
  correr: ['        ##   ', '       #++#  ', '       #oo#  ', '   ##   ##   ', '  #  #+oo### ', '     #+o.#  #', '     #oo.#   ', '    #o.##.#  ', '  ##o.#  #.# ', ' #..#     #.#', ' ##        ##'],
  cerrar: [
    '##       ##', '#+#     #.#', ' #+#   #.# ', '  #+# #.#  ', '   #+#.#   ', '    #o#    ', '   #+#.#   ', '  #+# #.#  ', ' #+#   #.# ', '#+#     #.#', '##       ##',
  ],
  mas: ['   ###   ', '   #+#   ', '   #o#   ', '####o####', '#++ooo..#', '####o####', '   #o#   ', '   #.#   ', '   ###   '],
  oro: ['  ####  ', ' #++oo# ', '#+oxxo.#', '#+oxoo.#', '#ooxxo.#', '#oooxo.#', '#ooxxo.#', ' #oo..# ', '  ####  '],
  candado: ['  ####  ', ' #.  .# ', ' #    # ', '########', '#++ooo.#', '#+o##o.#', '#oo#oo.#', '#ooo...#', '########'],
};

function picto(l: Lienzo, nombre: string, x: number, y: number, r: Rampa, a = 1) {
  const filas = PICTO[nombre];
  filas.forEach((f, j) => { for (let i = 0; i < f.length; i++) {
    const ch = f[i];
    if (ch === '#') l.px(x + i, y + j, r[0], a);
    else if (ch === 'o') l.px(x + i, y + j, r[Math.floor(r.length * 0.62)], a);
    else if (ch === '+') l.px(x + i, y + j, r[r.length - 1], a);
    else if (ch === '.') l.px(x + i, y + j, r[Math.floor(r.length * 0.35)], a);
    else if (ch === 'x') l.px(x + i, y + j, r[1], a);
  } });
}
const anchoPicto = (n: string) => Math.max(...PICTO[n].map((f) => f.length));

// =====================================================================================================================
// Diseño de la pantalla de 800x600: dónde va cada cosa (sirve para pintar y para las zonas de clic de hud.json)
// =====================================================================================================================

export const PANTALLA = { w: 800, h: 600 } as const;
/** Alto de la barra de abajo y dónde empieza en la pantalla. */
export const BARRA = { w: 800, h: 120, y: 480, cuerpoY: 56 } as const;
/** Corrimiento vertical de todo lo que va en el cuerpo de la barra (el cuerpo mide 64 px). */
const T = BARRA.cuerpoY - 40;

export interface Zona {
  id: string;
  /** orbe, boton, habilidad, cinturon, barra, atajo, interruptor, casillero, equipo, pestana... */
  tipo: string;
  x: number; y: number; w: number; h: number;
  /** tecla sugerida */
  tecla?: string;
  es?: string;
  en?: string;
}

const CENTRO_ORBE_VIDA: [number, number] = [62, 57 + T];
const CENTRO_ORBE_MANA: [number, number] = [800 - 62, 57 + T];

export const BOTONES_CHICOS: { id: string; picto: string; tecla: string; es: string; en: string }[] = [
  { id: 'boton_personaje', picto: 'personaje', tecla: 'C', es: 'Personaje', en: 'Character' },
  { id: 'boton_inventario', picto: 'inventario', tecla: 'I', es: 'Inventario', en: 'Inventory' },
  { id: 'boton_habilidades', picto: 'habilidades', tecla: 'T', es: 'Habilidades', en: 'Skills' },
  { id: 'boton_mapa', picto: 'mapa', tecla: 'Tab', es: 'Mapa', en: 'Map' },
  { id: 'boton_menu', picto: 'menu', tecla: 'Esc', es: 'Menú', en: 'Menu' },
];

/** Zonas de la barra de abajo en coordenadas de la barra (sumar BARRA.y para la pantalla). */
export function zonasBarra(): Zona[] {
  const z: Zona[] = [];
  const [vx, vy] = CENTRO_ORBE_VIDA, [mx, my] = CENTRO_ORBE_MANA, R = RADIO_ORBE;
  z.push({ id: 'orbe_vida', tipo: 'orbe', x: vx - R, y: vy - R, w: 2 * R, h: 2 * R, es: 'Vida', en: 'Life' });
  z.push({ id: 'orbe_mana', tipo: 'orbe', x: mx - R, y: my - R, w: 2 * R, h: 2 * R, es: 'Maná', en: 'Mana' });
  z.push({ id: 'habilidad_izq', tipo: 'habilidad', x: 130, y: 45 + T, w: 48, h: 48, tecla: 'clic izquierdo / left click', es: 'Habilidad izquierda', en: 'Left skill' });
  z.push({ id: 'habilidad_der', tipo: 'habilidad', x: 622, y: 45 + T, w: 48, h: 48, tecla: 'clic derecho / right click', es: 'Habilidad derecha', en: 'Right skill' });
  z.push({ id: 'caminar_correr', tipo: 'interruptor', x: 186, y: 48 + T, w: 20, h: 18, tecla: 'R', es: 'Caminar / correr', en: 'Walk / run' });
  z.push({ id: 'barra_aguante', tipo: 'barra', x: 210, y: 51 + T, w: 118, h: 12, es: 'Aguante', en: 'Stamina' });
  BOTONES_CHICOS.forEach((b, i) => z.push({ id: b.id, tipo: 'boton', x: 186 + i * 29, y: 71 + T, w: 24, h: 22, tecla: b.tecla, es: b.es, en: b.en }));
  for (let i = 0; i < 4; i++) z.push({ id: `cinturon_${i + 1}`, tipo: 'cinturon', x: 340 + i * 31, y: 59 + T, w: 28, h: 28, tecla: String(i + 1), es: `Poción ${i + 1}`, en: `Potion ${i + 1}` });
  for (let i = 0; i < 10; i++) z.push({ id: `atajo_f${i + 1}`, tipo: 'atajo', x: 478 + (i % 5) * 27, y: 45 + T + Math.floor(i / 5) * 25, w: 24, h: 24, tecla: `F${i + 1}`, es: `Atajo F${i + 1}`, en: `Hotkey F${i + 1}` });
  z.push({ id: 'barra_experiencia', tipo: 'barra', x: 128, y: 96 + T, w: 544, h: 6, es: 'Experiencia', en: 'Experience' });
  z.push({ id: 'escudo_casa', tipo: 'adorno', x: 387, y: 12 + T, w: 26, h: 30, es: 'Casa GG', en: 'House GG' });
  return z;
}

// =====================================================================================================================
// Piezas comunes: botones, barras, marcos de habilidad
// =====================================================================================================================

export type EstadoBoton = 'normal' | 'encima' | 'presionado' | 'apagado';

/** Botón de hierro con pictograma de latón. */
function botonPicto(l: Lienzo, x: number, y: number, w: number, h: number, nombre: string, estado: EstadoBoton = 'normal') {
  const hundido = estado === 'presionado';
  hierro(l, x, y, w, h, { semilla: x + y, luz: estado === 'encima' ? 0.56 : hundido ? 0.3 : 0.46 });
  if (hundido) sombraInterna(l, x + 1, y + 1, w - 2, h - 2, 3, 0.5);
  bisel(l, x, y, w, h, P.hierro, 2, { hundido });
  const pw = anchoPicto(nombre), ph = PICTO[nombre].length;
  const px = x + Math.floor((w - pw) / 2) + (hundido ? 1 : 0), py = y + Math.floor((h - ph) / 2) + (hundido ? 1 : 0);
  const mat = estado === 'apagado' ? P.hierro : P.laton;
  // sombra del pictograma
  PICTO[nombre].forEach((f, j) => { for (let i = 0; i < f.length; i++) if (f[i] !== ' ') l.mul(px + i + 1, py + j + 1, 0.6); });
  picto(l, nombre, px, py, estado === 'encima' ? [mat[0], ...mat.slice(3)] : mat);
  if (estado === 'encima') for (let i = 2; i < w - 2; i++) l.px(x + i, y + 2, P.laton[7], 0.35);
}

/** Barra de valor hundida (aguante, experiencia, vida del jefe): canal, relleno con brillo arriba y marcas. */
function barraValor(l: Lienzo, x: number, y: number, w: number, h: number, frac: number, r: Rampa, o: { marcas?: number; borde?: Rampa; resto?: number } = {}) {
  bisel(l, x - 2, y - 2, w + 4, h + 4, o.borde ?? P.hierro, 2, { hundido: true });
  const lleno = Math.round(w * clamp(frac));
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const fy = j / Math.max(1, h - 1);
    if (i < lleno) {
      let v = 0.72 - fy * 0.45 + (fbm(i / 6, j / 2, 3) - 0.5) * 0.12;
      if (j === 0) v = 0.98; else if (j === 1 && h > 4) v = 0.85;
      if (i === lleno - 1) v += 0.15;
      l.px(x + i, y + j, tono(r, v, x + i, y + j));
    } else if (o.resto !== undefined && i < Math.round(w * clamp(o.resto))) {
      l.px(x + i, y + j, tono(r, 0.32 - fy * 0.12, x + i, y + j)); // daño reciente (se vacía despacio)
    } else {
      l.px(x + i, y + j, tono(P.piedra, 0.1 + (1 - fy) * 0.08, x + i, y + j));
    }
  }
  sombraInterna(l, x, y, w, h, 2, 0.35);
  if (o.marcas) for (let k = 1; k < o.marcas; k++) {
    const mx = x + Math.round((w * k) / o.marcas);
    for (let j = 0; j < h; j++) { l.px(mx, y + j, P.hierro[0], 0.75); l.px(mx + 1, y + j, P.hierro[5], 0.18); }
  }
}

/** Engaste de latón para un botón de habilidad de 48x48 (o del tamaño dado). */
function engaste(l: Lienzo, x: number, y: number, w = 48, h = 48) {
  laton(l, x - 3, y - 3, w + 6, h + 6, { luz: 0.5 });
  bisel(l, x - 3, y - 3, w + 6, h + 6, P.laton, 3);
  for (const [cx, cy] of [[x - 2, y - 2], [x + w + 1, y - 2], [x - 2, y + h + 1], [x + w + 1, y + h + 1]]) l.px(cx, cy, P.laton[7]);
}

/** Achica un raster a la mitad promediando cada 2x2 (para los íconos de atajo de 24 px). */
function mitad(r: Raster): Raster {
  const o = createRaster(r.w >> 1, r.h >> 1);
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) {
    let R = 0, G = 0, B = 0, A = 0;
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const i = ((y * 2 + dy) * r.w + x * 2 + dx) * 4; const a = r.data[i + 3]; R += r.data[i] * a; G += r.data[i + 1] * a; B += r.data[i + 2] * a; A += a; }
    const i = (y * o.w + x) * 4;
    if (A > 0) { o.data[i] = R / A; o.data[i + 1] = G / A; o.data[i + 2] = B / A; o.data[i + 3] = Math.min(255, A / 4 > 100 ? 255 : 0); }
  }
  return o;
}

/** Recorta un raster centrado al tamaño dado. */
function centrado(r: Raster, w: number, h: number): Raster {
  const o = createRaster(w, h), ox = Math.floor((r.w - w) / 2), oy = Math.floor((r.h - h) / 2);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = x + ox, sy = y + oy;
    if (sx < 0 || sy < 0 || sx >= r.w || sy >= r.h) continue;
    o.data.set(r.data.subarray((sy * r.w + sx) * 4, (sy * r.w + sx) * 4 + 4), (y * w + x) * 4);
  }
  return o;
}

// =====================================================================================================================
// La barra de abajo (800x120)
// =====================================================================================================================

/** Ojiva de la caja del orbe: corrimiento de los centros a los lados, hacia abajo y radio. */
const OJ = [26, 4, 81] as const;
/** ¿Pixel dentro de la caja de piedra que aloja un orbe? Arco gótico en punta arriba. */
function enAlojamiento(x: number, y: number, cx: number, cy: number): boolean {
  const px = x + 0.5, py = y + 0.5;
  if (Math.abs(px - cx) <= 64 && py >= BARRA.cuerpoY - 4) return true;
  if (Math.hypot(px - cx, py - cy) <= 55) return true;
  if (py >= 24 + T && Math.abs(px - cx) <= 50 + (py - 24 - T) * 1.1) return true; // hombros que bajan al cuerpo
  // ojiva: intersección de dos círculos corridos a los lados, con la punta arriba de todo
  if (py < cy && Math.hypot(px - (cx - OJ[0]), py - (cy + OJ[1])) <= OJ[2] && Math.hypot(px - (cx + OJ[0]), py - (cy + OJ[1])) <= OJ[2]) return true;
  return false;
}

function pintarAlojamiento(l: Lienzo, cx: number, cy: number, lado: 'izq' | 'der') {
  const x0 = cx - 66, x1 = cx + 66;
  const en = (x: number, y: number) => y < BARRA.h && x >= Math.max(0, x0) && x <= Math.min(799, x1) && enAlojamiento(x, y, cx, cy) && (lado === 'izq' ? x >= 0 : x <= 799);
  forma(l, x0, 0, x1, BARRA.h - 1, (x, y) => (x < 0 || x > 799 ? true : en(x, y)), (x, y) => {
    const v = 0.46 + (fbm(x / 10, y / 8, 41) - 0.5) * 0.3 + (hash(x, y, 4) - 0.5) * 0.06 + 0.12 * (1 - y / 104);
    return tono(P.piedra, v, x, y);
  }, P.hierro, 4);
  // surcos tallados: un arco que sigue la ojiva y nervios radiales
  const m = new Mascara(800, BARRA.h);
  // la ojiva grabada por dentro del borde
  for (let y = 0; y < cy; y++) for (let x = cx - 60; x <= cx + 60; x++) {
    const a = Math.hypot(x + 0.5 - (cx - OJ[0]), y + 0.5 - (cy + OJ[1])), b = Math.hypot(x + 0.5 - (cx + OJ[0]), y + 0.5 - (cy + OJ[1]));
    const d = Math.max(a, b);
    if (d > OJ[2] - 7.5 && d <= OJ[2] - 6.5 && Math.hypot(x - cx, y - cy) > 52) m.set(x, y);
  }
  for (let k = 0; k < 9; k++) {
    const a = Math.PI * (1.1 + k * 0.1);
    m.linea(cx + Math.cos(a) * 50, cy + Math.sin(a) * 50, cx + Math.cos(a) * 53, cy + Math.sin(a) * 53);
  }
  // rosetón en la punta: cuatro lóbulos y un ojo
  const ry = 15;
  m.circulo(cx, ry, 5.5);
  for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + Math.PI / 4; m.circulo(cx + Math.cos(a) * 2.6, ry + Math.sin(a) * 2.6, 1.8); }
  m.linea(cx, ry - 10, cx, ry - 6.5);
  grabar(l, m, 0, 0, 1.1);
  // cuenco hundido donde va el orbe y aro de latón
  const RA = RADIO_ORBE + ARO + 1;
  for (let y = cy - 52; y <= cy + 52; y++) for (let x = cx - 52; x <= cx + 52; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    if (d <= RA) l.px(x, y, tono(P.piedra, 0.06 + ((x - cx) + (y - cy) > 0 ? 0.05 : 0), x, y));
    else if (d <= RA + 3.5) {
      const ang = Math.atan2(y + 0.5 - cy, x + 0.5 - cx), nr = (d - RA) / 3.5 - 0.5;
      const lu = -(Math.cos(ang) * LUZ[0] + Math.sin(ang) * LUZ[1]) * nr * 2 + 0.3;
      l.px(x, y, tono(P.laton, d > RA + 3 ? 0.05 : d < RA + 0.6 ? 0.1 : 0.45 + lu * 0.4, x, y));
    } else if (d <= RA + 5.5) {
      const ang = Math.atan2(y + 0.5 - cy, x + 0.5 - cx);
      const s = Math.cos(ang) * LUZ[0] + Math.sin(ang) * LUZ[1]; // > 0: mira a la luz (abajo a la derecha del cuenco)
      if (en(x, y)) l.mul(x, y, s > 0 ? 1.15 : 0.6);
    }
  }
  // garras de hierro que sujetan el orbe
  for (const a of [Math.PI * 1.25, Math.PI * 1.75, Math.PI * 0.62, Math.PI * 0.38]) {
    const pts: [number, number][] = [];
    for (const [rr, da] of [[RA - 3, -0.1], [RA + 6, -0.06], [RA + 8, 0], [RA + 6, 0.06], [RA - 3, 0.1], [RA - 5, 0]] as [number, number][]) pts.push([cx + Math.cos(a + da) * rr, cy + Math.sin(a + da) * rr]);
    const mk = new Mascara(800, BARRA.h);
    l.cadaEnPoligono(pts, (x, y) => mk.set(x, y));
    forma(l, Math.floor(cx - 60), 0, Math.ceil(cx + 60), BARRA.h - 1, (x, y) => mk.en(x, y), (x, y) => tono(P.hierro, 0.5 + (hash(x, y, 2) - 0.5) * 0.1, x, y), P.hierro, 2);
    remache(l, Math.round(cx + Math.cos(a) * (RA + 3)), Math.round(cy + Math.sin(a) * (RA + 3)), 1.5, P.laton);
  }
  // pilastra de hierro que une la caja con el cuerpo
  const px = lado === 'izq' ? cx + 58 : cx - 66;
  // el ojo del rosetón con una gema de la escuela del orbe
  bola(l, cx, ry, 1.6, lado === 'izq' ? P.sangre : P.mana, { contorno: false, brillo: 0.2 });
  hierro(l, px, BARRA.cuerpoY - 6, 8, BARRA.h - BARRA.cuerpoY + 6, { semilla: 7, vertical: true, luz: 0.48 });
  bisel(l, px, BARRA.cuerpoY - 6, 8, BARRA.h - BARRA.cuerpoY + 6, P.hierro, 2);
  for (let y = BARRA.cuerpoY; y < BARRA.h - 4; y += 14) remache(l, px + 3.5, y + 2, 1.5, P.laton);
}

export interface OpcBarra {
  idioma?: Idioma;
  vida?: number; mana?: number; aguante?: number; experiencia?: number;
  tipoVida?: TipoOrbe;
  cuadro?: number;
  /** pociones del cinturón (null = vacío) */
  cinturon?: (('health' | 'mana' | 'rejuv' | 'stamina' | 'antidote' | 'thawing') | null)[];
  habilidadIzq?: string; habilidadDer?: string;
  /** íconos en los atajos F1..F10 (id de habilidad o null) */
  atajos?: (string | null)[];
  corriendo?: boolean;
  /** sin orbes ni contenido: solo el marco, para que el juego pinte encima */
  vacia?: boolean;
  /** botón resaltado (id de zona) */
  encima?: string;
}

/** La barra de abajo completa, 800x120 (cuerpo de 64 px; las cajas de los orbes y la piedra clave suben más). */
export function barraInferior(o: OpcBarra = {}): Raster {
  const l = crearLienzo(BARRA.w, BARRA.h);
  const cy0 = BARRA.cuerpoY;
  const zonas = new Map(zonasBarra().map((z) => [z.id, z]));
  const Z = (id: string) => zonas.get(id)!;
  // cuerpo de piedra con paneles tallados
  piedra(l, 96, cy0, 608, BARRA.h - cy0, { semilla: 11, luz: 0.3, grietas: 4 });
  const pan = new Mascara(800, BARRA.h);
  for (const [x0, x1] of [[182, 331], [473, 615]]) {
    pan.linea(x0, cy0 + 9, x1, cy0 + 9); pan.linea(x0, cy0 + 53, x1, cy0 + 53); pan.linea(x0, cy0 + 9, x0, cy0 + 53); pan.linea(x1, cy0 + 9, x1, cy0 + 53);
  }
  for (let x = 338; x <= 462; x += 6) pan.rombo(x, cy0 + 56, 2, 1.5);
  grabar(l, pan, 0, 0, 0.9);
  // moldura de arriba: hierro con remaches
  hierro(l, 100, cy0, 600, 6, { semilla: 2, luz: 0.5 });
  bisel(l, 100, cy0, 600, 6, P.hierro, 2);
  for (let x = 140; x < 680; x += 36) if (Math.abs(x - 400) > 30) remache(l, x, cy0 + 2.5, 1.3, P.laton);
  sombraCaida(l, 100, cy0, 600, 6, 2, 0.5);
  // canal de la experiencia y moldura de abajo
  const xp = Z('barra_experiencia');
  hierro(l, 100, BARRA.h - 10, 600, 10, { semilla: 6, luz: 0.42 });
  bisel(l, 100, BARRA.h - 10, 600, 10, P.hierro, 1);
  barraValor(l, xp.x, xp.y, xp.w, xp.h, o.vacia ? 0 : o.experiencia ?? 0.62, P.xp, { marcas: 10 });
  // cajas de los orbes
  pintarAlojamiento(l, CENTRO_ORBE_VIDA[0], CENTRO_ORBE_VIDA[1], 'izq');
  pintarAlojamiento(l, CENTRO_ORBE_MANA[0], CENTRO_ORBE_MANA[1], 'der');
  // engastes de las habilidades
  for (const id of ['habilidad_izq', 'habilidad_der']) {
    const z = Z(id);
    engaste(l, z.x, z.y);
    casillero(l, z.x, z.y, 48, 48);
  }
  // sección izquierda: caminar/correr, aguante y botones chicos
  const cc = Z('caminar_correr');
  botonPicto(l, cc.x, cc.y, cc.w, cc.h, o.corriendo ? 'correr' : 'caminar', o.encima === cc.id ? 'encima' : 'normal');
  const ag = Z('barra_aguante');
  barraValor(l, ag.x + 2, ag.y + 2, ag.w - 4, ag.h - 4, o.vacia ? 0 : o.aguante ?? 0.8, P.aguante, { marcas: 4 });
  for (const b of BOTONES_CHICOS) { const z = Z(b.id); botonPicto(l, z.x, z.y, z.w, z.h, b.picto, o.encima === z.id ? 'encima' : 'normal'); }
  // cinturón de cuero con hebilla y bolsillos
  cuero(l, 330, 62 + T, 142, 22, { costura: true, semilla: 3 });
  sombraCaida(l, 330, 62 + T, 142, 22, 2, 0.45);
  laton(l, 323, 60 + T, 10, 26); bisel(l, 323, 60 + T, 10, 26, P.laton, 2);
  l.rect(326, 64 + T, 4, 18, P.cuero[1]); sombraInterna(l, 326, 64 + T, 4, 18, 2, 0.5);
  l.rect(330, 72 + T, 6, 3, P.laton[6]); l.hl(330, 335, 75 + T, P.laton[2]);
  for (let i = 0; i < 4; i++) {
    const z = Z(`cinturon_${i + 1}`);
    laton(l, z.x - 1, z.y - 1, z.w + 2, z.h + 2, { luz: 0.45 });
    bisel(l, z.x - 1, z.y - 1, z.w + 2, z.h + 2, P.laton, 2);
    casillero(l, z.x + 1, z.y + 1, z.w - 2, z.h - 2, { tinte: [120, 60, 30] });
    textoMicro(l, z.x + z.w - 5, z.y + z.h + 3, String(i + 1), P.laton[6]);
  }
  // atajos F1..F10
  for (let i = 0; i < 10; i++) {
    const z = Z(`atajo_f${i + 1}`);
    casillero(l, z.x, z.y, z.w, z.h);
  }
  // piedra clave con el escudo GG
  const ks: [number, number][] = [[377, 8 + T], [389, 2 + T], [411, 2 + T], [423, 8 + T], [423, 43 + T], [400, 57 + T], [377, 43 + T]];
  const mk = new Mascara(800, BARRA.h); l.cadaEnPoligono(ks, (x, y) => mk.set(x, y));
  forma(l, 370, 0, 430, 60 + T, (x, y) => mk.en(x, y), (x, y) => tono(P.hierro, 0.42 + (fbm(x / 7, y / 5, 9) - 0.5) * 0.2, x, y), P.hierro, 3);
  remache(l, 381, 12 + T, 1.5); remache(l, 418, 12 + T, 1.5); remache(l, 400, 51 + T, 1.5);
  l.pegar(escudoGG(1), 387, 11 + T);
  if (o.vacia) return l.r;

  // ---------------------------------------------------------------- contenido
  l.pegar(orbe(o.tipoVida ?? 'vida', o.vida ?? 0.7, o.cuadro ?? 0), CENTRO_ORBE_VIDA[0] - ladoOrbe() / 2, CENTRO_ORBE_VIDA[1] - ladoOrbe() / 2);
  l.pegar(orbe('mana', o.mana ?? 0.85, o.cuadro ?? 0), CENTRO_ORBE_MANA[0] - ladoOrbe() / 2, CENTRO_ORBE_MANA[1] - ladoOrbe() / 2);
  const hi = Z('habilidad_izq'), hd = Z('habilidad_der');
  l.pegar(iconoHabilidad(o.habilidadIzq ?? 'golpe_sagrado', o.encima === hi.id ? 'encima' : 'normal'), hi.x, hi.y);
  l.pegar(iconoHabilidad(o.habilidadDer ?? 'bola_de_fuego', o.encima === hd.id ? 'encima' : 'normal'), hd.x, hd.y);
  const cint = o.cinturon ?? ['health', 'health', 'mana', 'rejuv'];
  cint.slice(0, 4).forEach((k, i) => {
    if (!k) return;
    const z = Z(`cinturon_${i + 1}`);
    const ic = renderLoot({ id: 'p', name: { es: '', en: '' }, rarity: 'normal', base: { cat: 'potion', kind: k, size: 'normal' }, level: 1, stats: { mods: [] } }, { px: 32 });
    l.pegar(centrado(ic, 26, 26), z.x + 1, z.y + 1);
  });
  const atj = o.atajos ?? ['bola_de_fuego', 'muro_de_llamas', 'nova_de_escarcha', 'teletransporte', null, 'sanar', null, null, null, null];
  atj.slice(0, 10).forEach((id, i) => {
    const z = Z(`atajo_f${i + 1}`);
    if (id) { const ic = mitad(iconoHabilidad(id)); l.pegar(centrado(ic, 20, 20), z.x + 2, z.y + 2); }
    textoMicro(l, z.x + 3, z.y + 3, `F${i + 1}`.length > 2 ? `${i + 1}` : `F${i + 1}`, P.laton[7]);
  });
  return l.r;
}

// =====================================================================================================================
// Íconos de habilidad (48x48): fondo de la escuela, símbolo pintado y engaste de bronce. Estados normal, encima y apagado.
// =====================================================================================================================

type Escuela = 'fuego' | 'hielo' | 'rayo' | 'hueso' | 'veneno' | 'sagrado' | 'guerra' | 'arco' | 'sombra' | 'naturaleza';
const FONDO_ESCUELA: Record<Escuela, [string, string, string]> = {
  fuego: ['#4a1a0a', '#200a05', '#080302'], hielo: ['#173450', '#0a1828', '#03070c'], rayo: ['#24285a', '#0e1030', '#04040e'],
  hueso: ['#283020', '#11160d', '#050604'], veneno: ['#1c3814', '#0b1a08', '#030803'], sagrado: ['#4a3812', '#211806', '#0a0703'],
  guerra: ['#3c241a', '#1a0f0a', '#070403'], arco: ['#283018', '#12160a', '#050603'], sombra: ['#2c1a40', '#130b1e', '#050308'],
  naturaleza: ['#22361a', '#0f190a', '#040703'],
};

/** Resplandor que suma luz con caída suave. */
function resplandor(l: Lienzo, cx: number, cy: number, r: number, c: C3, k = 1) {
  for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
    if (d < 1) l.suma(x, y, c, (1 - d) * (1 - d) * k);
  }
}

/** Esfera sombreada con la luz de arriba a la izquierda. */
function bola(l: Lienzo, cx: number, cy: number, r: number, ram: Rampa, o: { brillo?: number; contorno?: boolean } = {}) {
  for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
    const dx = (x + 0.5 - cx) / r, dy = (y + 0.5 - cy) / r, d2 = dx * dx + dy * dy;
    if (d2 > 1) continue;
    const nz = Math.sqrt(1 - d2), lu = dx * LUZ[0] + dy * LUZ[1] + nz * LUZ[2];
    let v = 0.12 + lu * 0.8 + (o.brillo ?? 0);
    if (o.contorno !== false && d2 > (1 - 1.4 / r) ** 2) v = Math.min(v, 0.18);
    l.px(x, y, tono(ram, v, x, y));
  }
}

/** Llama: gota alargada con lenguas de ruido, núcleo claro abajo. inclina corre la punta. */
function llama(l: Lienzo, cx: number, base: number, ancho: number, alto: number, s = 1, ram: Rampa = P.fuego, inclina = 0) {
  for (let y = Math.floor(base - alto - 2); y <= base + 1; y++) for (let x = Math.floor(cx - ancho - 4); x <= cx + ancho + 4; x++) {
    const v = (base - (y + 0.5)) / alto;
    if (v < -0.05 || v > 1) continue;
    const xc = cx + inclina * v * alto;
    let u = (x + 0.5 - xc) / ancho;
    u += (fbm((x + s * 13) / 4, (y + s * 7) / 3.5, s) - 0.5) * 0.9 * (0.2 + v);
    const p = v < 0.28 ? 0.62 + v * 1.35 : Math.pow((1 - v) / 0.72, 0.85);
    const a = Math.abs(u) / Math.max(0.01, p);
    if (a >= 1) continue;
    let heat = (1 - a) * 0.7 + (1 - v) * 0.45 - 0.08;
    if (a > 0.82) heat = Math.min(heat, 0.28);
    l.px(x, y, tono(ram, heat, x, y));
  }
}

/** Llama que sale de (bx, by) hacia el ángulo ang (radianes, 0 a la derecha). */
function llamaDir(l: Lienzo, bx: number, by: number, ang: number, ancho: number, alto: number, s = 1, ram: Rampa = P.fuego) {
  const c = Math.cos(ang), sn = Math.sin(ang), R = alto + ancho + 2;
  for (let y = Math.floor(by - R); y <= by + R; y++) for (let x = Math.floor(bx - R); x <= bx + R; x++) {
    const dx = x + 0.5 - bx, dy = y + 0.5 - by;
    const v = (dx * c + dy * sn) / alto;
    if (v < -0.05 || v > 1) continue;
    let u = (-dx * sn + dy * c) / ancho;
    u += (fbm((x + s * 13) / 4, (y + s * 7) / 4, s) - 0.5) * 0.9 * (0.2 + v);
    const p = v < 0.28 ? 0.62 + v * 1.35 : Math.pow((1 - v) / 0.72, 0.85);
    const a = Math.abs(u) / Math.max(0.01, p);
    if (a >= 1) continue;
    let heat = (1 - a) * 0.7 + (1 - v) * 0.45 - 0.08;
    if (a > 0.82) heat = Math.min(heat, 0.28);
    l.px(x, y, tono(ram, heat, x, y));
  }
}

/** Esquirla de hielo (o cristal): rombo largo con cara clara y cara en sombra. */
function esquirla(l: Lienzo, x0: number, y0: number, x1: number, y1: number, ancho: number, ram: Rampa = P.hielo, medio = 0.3) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const mx = x0 + dx * medio, my = y0 + dy * medio;
  const pts: [number, number][] = [[x0, y0], [mx + nx * ancho / 2, my + ny * ancho / 2], [x1, y1], [mx - nx * ancho / 2, my - ny * ancho / 2]];
  const ladoLuz = nx * LUZ[0] + ny * LUZ[1] < 0 ? 1 : -1;
  const m = new Mascara(l.w, l.h);
  l.cadaEnPoligono(pts, (x, y) => m.set(x, y));
  for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) {
    if (!m.en(x, y)) continue;
    const sd = (x + 0.5 - x0) * nx + (y + 0.5 - y0) * ny;
    const t = ((x + 0.5 - x0) * ux + (y + 0.5 - y0) * uy) / L;
    let v = sd * ladoLuz > 0.5 ? 0.82 - t * 0.2 : sd * ladoLuz < -0.5 ? 0.38 - t * 0.12 : 0.97;
    if (!m.en(x - 1, y) || !m.en(x + 1, y) || !m.en(x, y - 1) || !m.en(x, y + 1)) v = Math.min(v, 0.2);
    l.px(x, y, tono(ram, v, x, y));
  }
}

/** Camino quebrado de un rayo entre dos puntos. */
function caminoRayo(x0: number, y0: number, x1: number, y1: number, s: number, quiebre = 3.5): [number, number][] {
  const n = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / 5));
  const nx = -(y1 - y0), ny = x1 - x0, L = Math.hypot(nx, ny);
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, j = i === 0 || i === n ? 0 : (hash(i, 3, s) - 0.5) * 2 * quiebre;
    pts.push([x0 + (x1 - x0) * t + (nx / L) * j, y0 + (y1 - y0) * t + (ny / L) * j]);
  }
  return pts;
}
function rayo(l: Lienzo, pts: [number, number][], ram: Rampa = P.rayo, grueso = 1) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay));
    for (let k = 0; k <= n; k += 2) resplandor(l, ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n, 5 + grueso, ram[3], 0.11);
  }
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) l.linea(ax + ox, ay + oy, bx + ox, by + oy, ram[5], 0.8);
    if (grueso > 1) for (const [ox, oy] of [[1, 0], [0, 1]]) l.linea(ax + ox, ay + oy, bx + ox, by + oy, ram[7]);
    l.linea(ax, ay, bx, by, ram[ram.length - 1]);
  }
}

/** Trazo grueso con sombreado de cilindro (lanzas, huesos, astas). */
function trazo(l: Lienzo, x0: number, y0: number, x1: number, y1: number, g: number, ram: Rampa, o: { g1?: number; contorno?: boolean } = {}) {
  const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy, L = Math.sqrt(L2);
  const nx = -dy / L, ny = dx / L, signo = nx * LUZ[0] + ny * LUZ[1] < 0 ? 1 : -1;
  const g1 = o.g1 ?? g;
  for (let y = Math.floor(Math.min(y0, y1) - g - 1); y <= Math.max(y0, y1) + g + 1; y++) for (let x = Math.floor(Math.min(x0, x1) - g - 1); x <= Math.max(x0, x1) + g + 1; x++) {
    const px = x + 0.5 - x0, py = y + 0.5 - y0;
    const t = clamp((px * dx + py * dy) / L2);
    const sd = px * nx + py * ny - 0 * t;
    const along = (px * dx + py * dy) / L2;
    if (along < -0.02 || along > 1.02) continue;
    const half = (g + (g1 - g) * t) / 2;
    if (Math.abs(sd) > half) continue;
    let v = 0.55 + 0.4 * (sd / Math.max(0.5, half)) * signo;
    if (o.contorno !== false && Math.abs(sd) > half - 0.8) v = 0.12;
    l.px(x, y, tono(ram, v, x, y));
  }
}

/** Flecha de la cola (x0, y0) a la punta (x1, y1). */
function flecha(l: Lienzo, x0: number, y0: number, x1: number, y1: number, o: { pluma?: Rampa; punta?: Rampa; brillo?: C3 } = {}) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  // asta
  for (let t = 0; t < L - 4; t += 0.5) {
    const x = x0 + ux * t, y = y0 + uy * t;
    l.px(x, y, P.cuero[6]); l.px(x + nx * 0.8, y + ny * 0.8, P.cuero[2]);
  }
  // punta
  const pr = o.punta ?? P.hierro;
  const bx = x1 - ux * 5, by = y1 - uy * 5;
  const tri: [number, number][] = [[x1 + ux, y1 + uy], [bx + nx * 2.6, by + ny * 2.6], [bx - nx * 2.6, by - ny * 2.6]];
  l.poligono(tri, pr[2]);
  l.linea(x1, y1, bx + nx * 2.2, by + ny * 2.2, pr[pr.length - 1]);
  l.linea(x1, y1, bx - nx * 2.2, by - ny * 2.2, pr[4]);
  if (o.brillo) resplandor(l, x1, y1, 5, o.brillo, 0.5);
  // plumas
  const pl = o.pluma ?? rampa('#3a0c0c', '#6e1a16', '#a8352a', '#d86a50');
  for (let k = 0; k < 6; k++) {
    const t = k * 0.9, x = x0 + ux * t, y = y0 + uy * t;
    l.linea(x, y, x - ux * 2.5 + nx * 2.8, y - uy * 2.5 + ny * 2.8, pl[k < 2 ? 1 : 3]);
    l.linea(x, y, x - ux * 2.5 - nx * 2.8, y - uy * 2.5 - ny * 2.8, pl[k < 2 ? 0 : 2]);
  }
}

/** Arte de pixeles por filas: '#' contorno, 'o' cuerpo, '+' luz, '.' sombra, 'x' hueco oscuro, '*' brillo puro. */
function arte(l: Lienzo, filas: string[], x: number, y: number, r: Rampa, k = 1) {
  filas.forEach((f, j) => { for (let i = 0; i < f.length; i++) {
    const ch = f[i];
    const c = ch === '#' ? r[0] : ch === 'o' ? r[Math.floor(r.length * 0.6)] : ch === '+' ? r[r.length - 2] : ch === '.' ? r[Math.floor(r.length * 0.32)] : ch === 'x' ? r[1] : ch === '*' ? r[r.length - 1] : null;
    if (c) for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) l.px(x + i * k + a, y + j * k + b, c);
  } });
}

const CALAVERA = [
  '   ######   ', '  #++oooo#  ', ' #+oooooo.# ', '#+oooooooo.#', '#+o##oo##o.#', '#ox**oox*#.#', '#o###o.###.#',
  '#oo##o.o##.#', ' #ooo#x#o.# ', '  #o.....#  ', '  #o#o#o.#  ', '  #.#.#.##  ', '   ######   ',
];

function fondoIcono(l: Lienzo, e: Escuela) {
  const [c0, c1, c2] = FONDO_ESCUELA[e].map(hx);
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
    const d = Math.hypot((x + 0.5 - 22) / 26, (y + 0.5 - 21) / 26) + (fbm(x / 6, y / 6, 3) - 0.5) * 0.25;
    const t = clamp(d);
    const c = t < 0.5 ? mezcla(c0, c1, t / 0.5) : mezcla(c1, c2, (t - 0.5) / 0.5);
    const k = (bayer(x, y) - 0.5) * 0.08;
    l.px(x, y, escalar(c, 1 + k));
  }
}

function marcoIcono(l: Lienzo, estado: 'normal' | 'encima' | 'apagado', e: Escuela) {
  const mat = estado === 'encima' ? P.laton.slice(1) : P.laton.slice(0, 8);
  // sombra interna del hueco
  sombraInterna(l, 3, 3, 42, 42, 3, 0.45);
  bisel(l, 0, 0, 48, 48, mat, 3);
  for (let i = 3; i < 45; i++) { l.px(i, 3, P.piedra[0], 0.7); l.px(3, i, P.piedra[0], 0.7); }
  for (const [x, y] of [[1, 1], [46, 1], [1, 46], [46, 46]]) { l.px(x, y, P.laton[7]); }
  if (estado === 'encima') {
    const c = hx(FONDO_ESCUELA[e][0]);
    for (let i = 3; i < 45; i++) for (const [x, y] of [[i, 3], [i, 44], [3, i], [44, i]]) l.suma(x, y, mezcla(c, [255, 230, 160], 0.6), 0.5);
  }
}

export interface DefHabilidad { id: string; es: string; en: string; escuela: Escuela; pintar: (l: Lienzo) => void }

const H = (id: string, es: string, en: string, escuela: Escuela, pintar: (l: Lienzo) => void): DefHabilidad => ({ id, es, en, escuela, pintar });
const blanco: C3 = [255, 255, 255];

export const HABILIDADES: DefHabilidad[] = [
  H('saeta_de_fuego', 'Saeta de fuego', 'Fire Bolt', 'fuego', (l) => {
    const ang = Math.atan2(40 - 15, 8 - 33);
    resplandor(l, 32, 16, 16, [255, 110, 30], 0.75);
    llamaDir(l, 33, 15, ang, 7, 30, 3);
    llamaDir(l, 33, 15, ang + 0.25, 4, 18, 5);
    llamaDir(l, 33, 15, ang - 0.25, 4, 18, 7);
    bola(l, 33, 15, 6, P.fuego, { brillo: 0.45, contorno: false });
    l.px(31, 13, blanco); l.px(32, 13, P.fuego[7]); l.px(31, 12, P.fuego[7]);
    for (let k = 0; k < 7; k++) { const t = hash(k, 1, 5); l.px(10 + t * 20 + hash(k, 2, 5) * 6, 38 - t * 20 + hash(k, 3, 5) * 6, P.fuego[6]); }
  }),
  H('bola_de_fuego', 'Bola de fuego', 'Fire Ball', 'fuego', (l) => {
    resplandor(l, 25, 23, 22, [255, 90, 20], 0.8);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2 + 0.2;
      const largo = 8 + hash(k, 1, 9) * 6 + (Math.cos(a - 2.4) > 0 ? 6 : 0); // más larga la cola (abajo a la izquierda)
      llamaDir(l, 25 + Math.cos(a) * 7, 23 + Math.sin(a) * 7, a, 3.6, largo, k + 3);
    }
    bola(l, 25, 23, 10, P.fuego, { brillo: 0.32, contorno: false });
    resplandor(l, 22, 20, 7, [255, 240, 180], 0.9);
  }),
  H('muro_de_llamas', 'Muro de llamas', 'Flame Wall', 'fuego', (l) => {
    for (let x = 4; x < 44; x++) for (let y = 34; y < 44; y++) l.px(x, y, tono(P.fuego, 0.25 - (y - 34) / 40 + hash(x, y) * 0.1, x, y));
    resplandor(l, 24, 34, 24, [255, 80, 20], 0.5);
    llama(l, 10, 40, 6, 20, 1); llama(l, 38, 40, 6, 22, 2); llama(l, 24, 41, 8, 32, 3); llama(l, 17, 41, 5, 17, 4); llama(l, 31, 41, 5, 19, 5);
  }),
  H('saeta_de_hielo', 'Saeta de hielo', 'Ice Bolt', 'hielo', (l) => {
    for (let k = 0; k < 16; k++) { const t = k / 16; l.px(8 + t * 18 + hash(k, 1) * 4, 40 - t * 18 + hash(k, 2) * 4, P.hielo[7], 0.7); }
    resplandor(l, 30, 18, 16, [120, 200, 255], 0.6);
    esquirla(l, 9, 39, 40, 8, 13, P.hielo, 0.58);
    esquirla(l, 10, 40, 22, 30, 5, P.hielo, 0.5);
    esquirla(l, 16, 30, 26, 24, 4, P.hielo, 0.5);
    l.px(37, 11, blanco); l.px(36, 12, P.hielo[8]);
  }),
  H('nova_de_escarcha', 'Nova de escarcha', 'Frost Nova', 'hielo', (l) => {
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
      const d = Math.hypot(x + 0.5 - 24, (y + 0.5 - 24) * 1.0);
      if (d > 13 && d < 19) l.suma(x, y, [90, 170, 230], (1 - Math.abs(d - 16) / 3) * 0.5);
    }
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + 0.2;
      esquirla(l, 24 + Math.cos(a) * 7, 24 + Math.sin(a) * 7, 24 + Math.cos(a) * 21, 24 + Math.sin(a) * 21, 5, P.hielo, 0.4);
    }
    resplandor(l, 24, 24, 9, [200, 240, 255], 0.9);
    esquirla(l, 24, 18, 24, 30, 6, P.hielo, 0.5);
  }),
  H('ventisca', 'Ventisca', 'Blizzard', 'hielo', (l) => {
    for (let k = 0; k < 4; k++) bola(l, 10 + k * 9, 9 + (k % 2) * 2, 7, rampa('#1a2a3c', '#2e4660', '#4a6a88', '#7092b0', '#a4c0d8'), { contorno: false });
    for (let k = 0; k < 7; k++) { const x = 8 + k * 5 + hash(k, 2) * 3, y = 20 + hash(k, 3) * 10; esquirla(l, x + 5, y - 5, x - 2, y + 9, 3.5, P.hielo, 0.35); }
    for (let k = 0; k < 30; k++) l.px(4 + hash(k, 4) * 40, 16 + hash(k, 5) * 28, P.hielo[8], 0.5 + hash(k, 6) * 0.5);
  }),
  H('rayo_en_cadena', 'Rayo en cadena', 'Chain Lightning', 'rayo', (l) => {
    const pts: [number, number][] = [[8, 38], [22, 14], [32, 32], [41, 9]];
    for (let i = 0; i + 1 < pts.length; i++) rayo(l, caminoRayo(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], i + 3, 3), P.rayo, 2);
    for (const [x, y] of pts.slice(1)) { resplandor(l, x, y, 7, [180, 200, 255], 0.9); l.px(x, y, blanco); }
  }),
  H('teletransporte', 'Teletransporte', 'Teleport', 'sombra', (l) => {
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
      const dx = x + 0.5 - 24, dy = (y + 0.5 - 26) * 1.5, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      if (d > 21) continue;
      const s = Math.sin(a * 3 + d * 0.45);
      if (s > 0.35) l.px(x, y, tono(P.sombra, 0.4 + (1 - d / 21) * 0.5 + s * 0.15, x, y), 0.9);
    }
    resplandor(l, 24, 26, 12, [190, 140, 255], 0.8);
    // figura que se desvanece
    const m = new Mascara(48, 48);
    m.disco(24, 14, 3.2); for (let y = 18; y < 38; y++) { const w = y < 28 ? 4 : 3 - (y - 28) * 0.15; for (let x = -w; x <= w; x++) m.set(24 + x, y); }
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (m.en(x, y) && (y < 30 || hash(x, y, 2) > (y - 30) / 10)) l.px(x, y, !m.en(x - 1, y) || !m.en(x, y - 1) ? [230, 210, 255] : P.sombra[2]);
  }),
  H('lanza_de_hueso', 'Lanza de hueso', 'Bone Spear', 'hueso', (l) => {
    for (let k = 0; k < 14; k++) resplandor(l, 8 + k * 2.4, 40 - k * 2.4, 7, [80, 160, 90], 0.12);
    trazo(l, 6, 42, 33, 15, 6, P.hueso, { g1: 4 });
    for (const t of [0.15, 0.35, 0.55]) { const x = 6 + 27 * t, y = 42 - 27 * t; l.linea(x - 3, y - 3, x + 3, y + 3, P.hueso[1]); l.linea(x - 2, y - 3, x + 3, y + 2, P.hueso[6]); }
    esquirla(l, 27, 21, 43, 5, 11, P.hueso, 0.3);
    esquirla(l, 26, 22, 31, 11, 4, P.hueso, 0.4); esquirla(l, 26, 22, 37, 17, 4, P.hueso, 0.4);
  }),
  H('alzar_esqueleto', 'Alzar esqueleto', 'Raise Skeleton', 'hueso', (l) => {
    for (let y = 34; y < 46; y++) for (let x = 4; x < 44; x++) l.px(x, y, tono(P.piedra, 0.2 + hash(x, y) * 0.2 + (y === 34 ? 0.3 : 0), x, y));
    resplandor(l, 24, 34, 18, [90, 200, 110], 0.6);
    trazo(l, 12, 36, 16, 20, 3, P.hueso); trazo(l, 16, 20, 13, 12, 2.5, P.hueso);
    trazo(l, 36, 36, 32, 22, 3, P.hueso); trazo(l, 32, 22, 36, 14, 2.5, P.hueso);
    for (const [x, y] of [[12, 10], [36, 12]]) { l.px(x, y, P.hueso[7]); l.px(x + 1, y - 1, P.hueso[6]); l.px(x - 1, y - 1, P.hueso[6]); }
    arte(l, CALAVERA, 18, 20, P.hueso);
    l.px(21, 25, [120, 255, 140]); l.px(26, 25, [120, 255, 140]);
  }),
  H('nube_venenosa', 'Nube venenosa', 'Poison Cloud', 'veneno', (l) => {
    const pu: [number, number, number][] = [[16, 28, 9], [30, 26, 10], [23, 19, 9], [36, 33, 7], [11, 35, 6], [24, 33, 9]];
    for (const [x, y, r] of pu) bola(l, x, y, r, P.veneno, { contorno: false, brillo: -0.05 });
    for (const [x, y, r] of pu) resplandor(l, x - r * 0.3, y - r * 0.4, r * 0.6, [140, 220, 80], 0.25);
    for (let k = 0; k < 14; k++) { const x = 8 + hash(k, 1, 4) * 32, y = 12 + hash(k, 2, 4) * 26; l.px(x, y, P.veneno[8]); l.px(x + 1, y + 1, P.veneno[2]); }
    arte(l, CALAVERA, 18, 20, rampa('#061206', '#0e260c', '#1c3e14', '#2a5a1c', '#3e7a28', '#62a038'));
  }),
  H('aura_sagrada', 'Aura sagrada', 'Holy Aura', 'sagrado', (l) => {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2, r0 = 12, r1 = k % 2 ? 19 : 22;
      for (let r = r0; r < r1; r += 0.5) l.suma(24 + Math.cos(a) * r, 24 + Math.sin(a) * r, [255, 210, 120], 0.55 * (1 - (r - r0) / (r1 - r0)));
    }
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
      const d = Math.hypot(x + 0.5 - 24, y + 0.5 - 24);
      if (d > 9.5 && d < 12.5) l.px(x, y, tono(P.sagrado, 0.95 - Math.abs(d - 11) * 0.25 - (x + y > 48 ? 0.2 : 0), x, y));
    }
    resplandor(l, 24, 24, 10, [255, 240, 190], 0.8);
    // estrella de cuatro puntas
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2; esquirla(l, 24, 24, 24 + Math.cos(a) * 8, 24 + Math.sin(a) * 8, 4, P.sagrado, 0.15); }
  }),
  H('golpe_sagrado', 'Golpe sagrado', 'Smite', 'sagrado', (l) => {
    resplandor(l, 31, 18, 18, [255, 220, 140], 0.7);
    for (let k = 0; k < 9; k++) { const a = -Math.PI / 2 + (k - 4) * 0.33; l.linea(31, 18, 31 + Math.cos(a) * 16, 18 + Math.sin(a) * 16, P.sagrado[6], 0.6); }
    // escudo que golpea
    const m = new Mascara(48, 48);
    for (let y = 0; y < 26; y++) for (let x = 0; x < 22; x++) if (enEscudo(x + 0.5, y + 0.5, 22, 26)) m.set(x + 7, y + 17);
    forma(l, 0, 0, 47, 47, (x, y) => m.en(x, y), (x, y) => tono(P.mana, 0.5 - (x + y - 30) / 60, x, y), P.laton, 2);
    arte(l, ['  #  ', ' #+# ', '#+o.#', ' #.# ', '  #  '], 16, 26, P.laton);
    for (const [x, y] of [[33, 8], [40, 16], [36, 26]]) { l.px(x, y, blanco); l.px(x - 1, y, P.sagrado[6]); l.px(x + 1, y, P.sagrado[6]); l.px(x, y - 1, P.sagrado[6]); l.px(x, y + 1, P.sagrado[6]); }
  }),
  H('embestida', 'Embestida', 'Charge', 'guerra', (l) => {
    for (let k = 0; k < 7; k++) { const y = 12 + k * 4.5; l.hl(4 + (k % 3) * 3, 16 + (k % 2) * 4, y, P.hueso[5], 0.5); }
    // jinete que embiste: escudo y lanza
    trazo(l, 10, 32, 44, 20, 3, P.cuero, { g1: 2 });
    esquirla(l, 38, 22, 46, 19, 4, P.hierro, 0.3);
    const m = new Mascara(48, 48);
    for (let y = 0; y < 22; y++) for (let x = 0; x < 18; x++) if (enEscudo(x + 0.5, y + 0.5, 18, 22)) m.set(x + 14, y + 18);
    forma(l, 0, 0, 47, 47, (x, y) => m.en(x, y), (x, y) => tono(P.sangre, 0.5 - (x + y - 40) / 50, x, y), P.hierro, 2);
    arte(l, ['#  #', '#  #', ' ## '], 21, 25, P.laton);
    for (let k = 0; k < 10; k++) l.px(4 + hash(k, 3) * 10, 38 + hash(k, 4) * 6, P.pergamino[3]);
  }),
  H('torbellino', 'Torbellino', 'Whirlwind', 'guerra', (l) => {
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { const d = Math.hypot(x + 0.5 - 24, (y + 0.5 - 26) / 0.7); if (d < 21 && d > 3) { const a = Math.atan2((y - 26) / 0.7, x - 24); const s = Math.sin(a * 3 - d * 0.35); if (s > 0.55) l.px(x, y, P.hueso[5], (s - 0.55) * 1.2 * (1 - d / 21)); } }
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.3;
      const x1 = 24 + Math.cos(a) * 21, y1 = 26 + Math.sin(a) * 21 * 0.7, x0 = 24 + Math.cos(a) * 5, y0 = 26 + Math.sin(a) * 5 * 0.7;
      esquirla(l, x0, y0, x1, y1, 5, rampa('#1a1c22', '#3a3e48', '#6a707c', '#9aa0aa', '#cfd4dc', '#ffffff'), 0.5);
      trazo(l, 24 + Math.cos(a) * 3, 26 + Math.sin(a) * 2, x0, y0, 3, P.laton);
    }
    bola(l, 24, 26, 3.5, P.laton);
    resplandor(l, 24, 26, 10, [255, 220, 180], 0.25);
  }),
  H('salto', 'Salto', 'Leap', 'guerra', (l) => {
    for (let t = 0; t < 1; t += 0.015) { const x = 6 + t * 30, y = 42 - Math.sin(t * Math.PI) * 32; l.px(x, y, P.hueso[5], 0.25 + t * 0.4); }
    const m = new Mascara(48, 48);
    m.disco(28, 10, 3.6);
    const miembros: number[][] = [[28, 13, 25, 24, 7], [25, 24, 18, 27, 3.4], [18, 27, 14, 23, 3], [25, 24, 31, 28, 3.4], [31, 28, 32, 35, 3], [28, 15, 35, 9, 3], [27, 15, 18, 17, 3]];
    for (const [a, b, c, d, g] of miembros) capsula(m, a, b, c, d, g / 2);
    forma(l, 0, 0, 47, 47, (x, y) => m.en(x, y), (x, y) => tono(P.hierro, 0.62 - (x + y - 30) / 45, x, y), P.hierro, 2);
    resplandor(l, 22, 18, 14, [255, 150, 70], 0.25);
    trazo(l, 35, 9, 43, 1, 3, rampa('#1a1c22', '#3a3e48', '#6a707c', '#9aa0aa', '#cfd4dc', '#ffffff'));
    for (let x = 4; x < 44; x++) l.px(x, 43 + (hash(x, 1) < 0.3 ? 1 : 0), P.pergamino[2]);
    for (let k = 0; k < 10; k++) l.px(32 + hash(k, 2) * 12, 38 + hash(k, 3) * 6, P.pergamino[4]);
  }),
  H('grito_de_guerra', 'Grito de guerra', 'Battle Cry', 'guerra', (l) => {
    for (let k = 0; k < 3; k++) {
      const r = 14 + k * 6;
      for (let a = -0.75; a <= 0.75; a += 0.015) { const x = 20 + Math.cos(a) * r, y = 27 + Math.sin(a) * r; l.px(x, y, P.sangre[7 - k], 0.95 - k * 0.2); l.px(x + 1, y, P.sangre[3], 0.6); }
    }
    resplandor(l, 22, 27, 18, [255, 80, 40], 0.3);
    trazo(l, 9, 18, 3, 6, 4, P.hueso, { g1: 1 }); trazo(l, 27, 18, 33, 6, 4, P.hueso, { g1: 1 });
    const m = new Mascara(48, 48);
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { const dx = (x + 0.5 - 18) / 11, dy = (y + 0.5 - 24) / 12; if ((dy < 0 && dx * dx + dy * dy <= 1) || (dy >= 0 && dy < 1.1 && Math.abs(dx) <= 1 - dy * 0.25)) m.set(x, y); }
    forma(l, 0, 0, 47, 47, (x, y) => m.en(x, y), (x, y) => tono(P.hierro, 0.72 - (x + y - 24) / 40, x, y), P.hierro, 2);
    l.rect(11, 22, 15, 3, P.hierro[0]); l.rect(17, 22, 3, 13, P.hierro[0]);
    l.hl(11, 25, 25, P.hierro[6], 0.5);
    for (const [x, y] of [[10, 17], [26, 17], [18, 14]]) remache(l, x, y, 1, P.laton);
    l.rect(14, 33, 9, 3, P.sangre[2]); l.hl(15, 21, 34, P.sangre[0]);
  }),
  H('disparo_multiple', 'Disparo múltiple', 'Multishot', 'arco', (l) => {
    for (let k = -2; k <= 2; k++) { const a = -Math.PI / 4 + k * 0.28; flecha(l, 8, 40, 8 + Math.cos(a) * 36, 40 + Math.sin(a) * 36); }
  }),
  H('flecha_guiada', 'Flecha guiada', 'Guided Arrow', 'arco', (l) => {
    let px0 = 6, py0 = 36;
    for (let t = 0; t <= 1; t += 0.01) {
      const x = 6 + t * 34, y = 36 - Math.sin(t * Math.PI * 1.2) * 18 + t * 6;
      l.suma(x, y, [110, 200, 255], 0.5 * t); l.suma(x, y + 1, [60, 120, 220], 0.4 * t); px0 = x; py0 = y;
    }
    flecha(l, 24, 24, px0 + 2, py0 - 2, { brillo: [140, 210, 255] });
    // ojo que guía
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { const d = Math.hypot(x + 0.5 - 39, (y + 0.5 - 12) * 1.8); if (d < 6 && d > 4.5) l.px(x, y, P.mana[7]); }
    bola(l, 39, 12, 2.2, P.mana, { brillo: 0.3 });
  }),
  H('lanza_de_rayos', 'Lanza de rayos', 'Lightning Spear', 'rayo', (l) => {
    trazo(l, 6, 42, 34, 14, 3, P.cuero);
    esquirla(l, 31, 17, 43, 5, 7, P.hierro, 0.35);
    for (let k = 0; k < 3; k++) rayo(l, caminoRayo(12 + k * 8, 36 - k * 8, 40, 8, k + 10, 4), P.rayo, 1);
    resplandor(l, 40, 8, 8, [200, 220, 255], 0.9);
  }),
  H('trampa', 'Trampa', 'Trap', 'guerra', (l) => {
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
      const d = Math.hypot((x + 0.5 - 24) / 19, (y + 0.5 - 27) / 12);
      if (d < 0.45) l.px(x, y, tono(P.hierro, 0.3 + (0.45 - d), x, y));
      else if (d < 1 && d > 0.84) l.px(x, y, tono(P.hierro, y < 27 ? 0.8 : 0.35, x, y));
      else if (d <= 0.84) l.px(x, y, tono(P.piedra, 0.08, x, y));
    }
    for (let k = 0; k < 11; k++) {
      const a = Math.PI * (1.08 + (k / 10) * 0.84), x = 24 + Math.cos(a) * 17, y = 27 + Math.sin(a) * 10.5;
      esquirla(l, x, y, 24 + Math.cos(a) * 11, 27 + Math.sin(a) * 6, 3.4, P.hierro, 0.15);
      const b = Math.PI * (0.08 + (k / 10) * 0.84), x2 = 24 + Math.cos(b) * 17, y2 = 27 + Math.sin(b) * 10.5;
      esquirla(l, x2, y2, 24 + Math.cos(b) * 11, 27 + Math.sin(b) * 6, 3.4, P.hierro, 0.15);
    }
    bola(l, 24, 27, 3.5, P.laton, { brillo: 0.1 });
    for (let k = 0; k < 5; k++) { const x = 30 + k * 3, y = 38 + k * 1.6; for (let a = 0; a < Math.PI * 2; a += 0.3) l.px(x + Math.cos(a) * 1.6, y + Math.sin(a) * 1.1, P.hierro[k % 2 ? 4 : 6]); }
    for (let k = 0; k < 6; k++) { const x = 24 + (hash(k, 1) - 0.5) * 30, y = 6 + hash(k, 2) * 10; l.px(x, y, P.fuego[7]); l.px(x + 1, y, P.fuego[5], 0.6); }
  }),
  H('paso_sombrio', 'Paso sombrío', 'Shadow Step', 'sombra', (l) => {
    const fig = (ox: number, a: number, clara: boolean) => {
      const m = new Mascara(48, 48);
      m.disco(ox, 11, 3.2);
      for (let y = 15; y < 30; y++) { const w = 4.2 - (y - 15) * 0.08; for (let x = -w; x <= w; x++) m.set(ox + x, y); }
      for (let i = 0; i < 14; i++) { m.disco(ox - 2 - i * 0.3, 30 + i, 1.4); m.disco(ox + 2 + i * 0.4, 30 + i, 1.4); }
      for (let i = 0; i < 10; i++) { m.disco(ox - 4 - i * 0.5, 16 + i, 1.2); m.disco(ox + 4 + i * 0.6, 16 + i * 0.8, 1.2); }
      for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (m.en(x, y)) l.px(x, y, clara && (!m.en(x - 1, y) || !m.en(x, y - 1)) ? [200, 160, 255] : P.sombra[clara ? 1 : 3], a);
    };
    fig(14, 0.35, false); fig(22, 0.55, false);
    for (let k = 0; k < 18; k++) l.px(8 + hash(k, 1) * 30, 20 + hash(k, 2) * 24, P.sombra[6], 0.6);
    fig(32, 1, true);
    resplandor(l, 32, 12, 4, [200, 120, 255], 0.6); l.px(31, 11, [255, 200, 255]); l.px(34, 11, [255, 200, 255]);
  }),
  H('zarpazo', 'Zarpazo', 'Claw Strike', 'naturaleza', (l) => {
    for (let k = 0; k < 3; k++) {
      for (let t = 0; t <= 1; t += 0.008) {
        const x = 10 + k * 9 + t * 18 + Math.sin(t * Math.PI) * 4, y = 6 + t * 36;
        const w = Math.sin(t * Math.PI) * 2.6;
        for (let s = -w; s <= w; s += 0.5) l.px(x + s, y, s < -w + 1 ? P.sangre[8] : tono(P.sangre, 0.7 - Math.abs(s) / 5, Math.round(x + s), Math.round(y)));
        l.px(x + w + 1, y, P.sangre[1]);
      }
    }
    for (let k = 0; k < 10; k++) { const x = 14 + hash(k, 1) * 26, y = 18 + hash(k, 2) * 26; l.px(x, y, P.sangre[4]); l.px(x, y + 1, P.sangre[2]); }
  }),
  H('forma_de_lobo', 'Forma de lobo', 'Werewolf Form', 'naturaleza', (l) => {
    bola(l, 24, 15, 14, rampa('#3a0c0c', '#6e1a14', '#a03a22', '#c8642e', '#e69448', '#f4c070'), { contorno: false });
    resplandor(l, 24, 15, 22, [200, 70, 40], 0.35);
    const pelo = rampa('#0c0a0c', '#1c181c', '#2e282c', '#443c3e', '#5e5454', '#7c7070', '#a09490');
    const cab = new Mascara(48, 48);
    l.cadaEnPoligono([[9, 7], [18, 17], [12, 22]], (x, y) => cab.set(x, y)); l.cadaEnPoligono([[39, 7], [30, 17], [36, 22]], (x, y) => cab.set(x, y));
    l.cadaEnPoligono([[12, 16], [36, 16], [41, 26], [35, 34], [29, 44], [19, 44], [13, 34], [7, 26]], (x, y) => cab.set(x, y));
    forma(l, 0, 0, 47, 47, (x, y) => cab.en(x, y), (x, y) => tono(pelo, 0.55 - (y - 16) / 60 + (hash(x >> 1, y) - 0.5) * 0.15 - Math.abs(x - 24) / 50, x, y), pelo, 2);
    const hoc = new Mascara(48, 48); l.cadaEnPoligono([[19, 29], [29, 29], [28, 42], [20, 42]], (x, y) => hoc.set(x, y));
    forma(l, 0, 0, 47, 47, (x, y) => hoc.en(x, y), (x, y) => tono(pelo, 0.72 - (y - 29) / 40, x, y), pelo, 1);
    l.rect(22, 29, 5, 3, pelo[0]); l.px(23, 29, pelo[5]);
    for (const [x0, d] of [[15, 1], [33, -1]] as [number, number][]) { l.linea(x0, 21, x0 + d * 5, 24, pelo[0]); l.px(x0 + d * 2, 23, [255, 210, 60]); l.px(x0 + d * 3, 23, [255, 160, 40]); l.px(x0 + d * 2, 24, [200, 100, 20]); resplandor(l, x0 + d * 2.5, 23, 4, [255, 180, 40], 0.4); }
    l.hl(20, 28, 42, P.sangre[2]); for (const x of [20, 27]) { l.vl(x, 40, 43, P.hueso[7]); l.px(x, 44, P.hueso[5]); }
  }),
  H('invocar_lobo', 'Invocar lobo', 'Summon Wolf', 'naturaleza', (l) => {
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
      const d = Math.hypot((x + 0.5 - 24) / 20, (y + 0.5 - 39) / 6.5);
      if (d < 1 && d > 0.84) l.px(x, y, P.veneno[7], 0.85); else if (d <= 0.84) l.suma(x, y, [40, 130, 50], 0.3 * (1 - d));
    }
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; l.px(24 + Math.cos(a) * 14, 39 + Math.sin(a) * 4.5, P.veneno[8]); }
    resplandor(l, 24, 32, 18, [90, 220, 110], 0.3);
    const pelo = rampa('#0e0c0a', '#2a2218', '#463a28', '#665438', '#8a744e', '#ae9a6c', '#d4c094');
    const m = new Mascara(48, 48);
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (Math.hypot((x + 0.5 - 22) / 11, (y + 0.5 - 25) / 5.5) <= 1) m.set(x, y);
    m.disco(33, 20, 5);
    l.cadaEnPoligono([[35, 17], [43, 21], [41, 24], [34, 24]], (x, y) => m.set(x, y));
    l.cadaEnPoligono([[30, 17], [31, 10], [35, 16]], (x, y) => m.set(x, y));
    capsula(m, 13, 27, 9, 37, 1.6); capsula(m, 17, 28, 18, 37, 1.6); capsula(m, 27, 28, 32, 37, 1.6); capsula(m, 30, 27, 36, 35, 1.6);
    capsula(m, 12, 23, 4, 17, 1.8); capsula(m, 4, 17, 3, 12, 1.2);
    forma(l, 0, 0, 47, 47, (x, y) => m.en(x, y), (x, y) => tono(pelo, 0.6 - (y - 12) / 40 + (hash(x, y >> 1) - 0.5) * 0.12, x, y), pelo, 2);
    l.px(36, 19, [150, 255, 150]); l.px(42, 21, pelo[0]);
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (m.en(x, y) && !m.en(x, y + 1)) l.px(x, y, P.veneno[6], 0.7);
  }),
  H('tornado', 'Tornado', 'Tornado', 'naturaleza', (l) => {
    for (let y = 5; y < 44; y++) {
      const t = (y - 5) / 39, w = 18 - t * 14, cx = 24 + Math.sin(t * 4) * 3;
      for (let x = Math.floor(cx - w); x <= cx + w; x++) {
        const u = (x + 0.5 - cx) / w;
        const s = Math.sin(u * 3.5 + y * 0.55);
        const v = 0.35 + s * 0.25 + (1 - Math.abs(u)) * 0.25 - t * 0.1;
        if (Math.abs(u) < 0.98) l.px(x, y, tono(rampa('#141810', '#2a3020', '#465036', '#687458', '#909a7e', '#bcc4aa'), v, x, y), 0.6 + (1 - Math.abs(u)) * 0.4);
      }
    }
    for (let k = 0; k < 8; k++) { const x = 8 + hash(k, 3) * 32, y = 8 + hash(k, 4) * 32; l.px(x, y, P.cuero[5]); l.px(x + 1, y, P.cuero[3]); l.px(x, y + 1, P.naturaleza[5]); }
  }),
  H('sanar', 'Sanar', 'Heal', 'sagrado', (l) => {
    resplandor(l, 24, 24, 20, [255, 230, 160], 0.55);
    const cruz: [number, number][] = [[19, 8], [29, 8], [29, 19], [40, 19], [40, 29], [29, 29], [29, 40], [19, 40], [19, 29], [8, 29], [8, 19], [19, 19]];
    const m = new Mascara(48, 48); l.cadaEnPoligono(cruz, (x, y) => m.set(x, y));
    forma(l, 0, 0, 47, 47, (x, y) => m.en(x, y), (x, y) => tono(rampa('#4a0a10', '#7a1820', '#a82c2c', '#d04a3c', '#ec7a5a', '#ffb898'), 0.75 - (x + y - 16) / 70, x, y), P.laton, 2);
    for (const [x, y] of [[10, 10], [38, 12], [12, 38], [37, 36]]) { l.px(x, y, blanco); l.px(x - 1, y, P.sagrado[6]); l.px(x + 1, y, P.sagrado[6]); l.px(x, y - 1, P.sagrado[6]); l.px(x, y + 1, P.sagrado[6]); }
  }),
  H('escudo_de_luz', 'Escudo de luz', 'Shield of Light', 'sagrado', (l) => {
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; l.linea(24, 24, 24 + Math.cos(a) * 22, 24 + Math.sin(a) * 22, P.sagrado[5], 0.35); }
    resplandor(l, 24, 24, 22, [255, 220, 140], 0.6);
    const m = new Mascara(48, 48);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 26; x++) if (enEscudo(x + 0.5, y + 0.5, 26, 32)) m.set(x + 11, y + 8);
    forma(l, 0, 0, 47, 47, (x, y) => m.en(x, y), (x, y) => tono(P.sagrado, 0.82 - (x + y - 20) / 60, x, y), P.laton, 3);
    const mk = new Mascara(48, 48); mk.linea(24, 13, 24, 33); mk.linea(17, 20, 31, 20); grabar(l, mk, 0, 0, 1.2);
  }),
  H('lluvia_de_flechas', 'Lluvia de flechas', 'Rain of Arrows', 'arco', (l) => {
    for (let k = 0; k < 7; k++) { const x = 6 + k * 6 + hash(k, 1) * 3, y = 6 + hash(k, 2) * 14; flecha(l, x - 4, y - 2, x + 3, y + 22); }
    for (let x = 4; x < 44; x++) l.px(x, 43, P.pergamino[2]);
  }),
  H('meteoro', 'Meteoro', 'Meteor', 'fuego', (l) => {
    for (let k = 0; k < 18; k++) { const t = k / 18; llama(l, 8 + t * 18, 10 + t * 18, 2 + t * 4, 6 + t * 6, k, P.fuego, -0.6); }
    resplandor(l, 31, 31, 16, [255, 110, 30], 0.8);
    bola(l, 31, 31, 8, rampa('#140a06', '#2e1a10', '#4a2e1c', '#6a4228', '#8a5a34', '#c47a3a'));
    for (let k = 0; k < 6; k++) { const x = 27 + hash(k, 3) * 9, y = 27 + hash(k, 4) * 9; l.px(x, y, P.fuego[6]); }
    for (let x = 4; x < 44; x++) l.px(x, 44, P.fuego[3], 0.6);
  }),
];

/** Ids de las 30 habilidades. */
export const IDS_HABILIDADES = HABILIDADES.map((h) => h.id);
const cacheIconos = new Map<string, Raster>();

/** Ícono de habilidad de 48x48 en un estado: normal, encima (iluminado) o apagado (gris). */
export function iconoHabilidad(id: string, estado: 'normal' | 'encima' | 'apagado' = 'normal'): Raster {
  const k = `${id}|${estado}`;
  const hit = cacheIconos.get(k);
  if (hit) return hit;
  const def = HABILIDADES.find((h) => h.id === id) ?? HABILIDADES[0];
  const l = crearLienzo(48, 48);
  fondoIcono(l, def.escuela);
  def.pintar(l);
  // recorte al hueco: lo que se salió del marco se tapa con el marco
  if (estado === 'encima') for (let i = 0; i < l.r.data.length; i += 4) for (let c = 0; c < 3; c++) l.r.data[i + c] = Math.min(255, l.r.data[i + c] * 1.22 + 10);
  marcoIcono(l, estado, def.escuela);
  if (estado === 'apagado') {
    for (let i = 0; i < l.r.data.length; i += 4) {
      const d = l.r.data, g = d[i] * 0.3 + d[i + 1] * 0.55 + d[i + 2] * 0.15;
      const v = g * 0.5 + 8;
      d[i] = v; d[i + 1] = v; d[i + 2] = v * 1.08;
    }
  }
  for (let i = 3; i < l.r.data.length; i += 4) l.r.data[i] = 255;
  cacheIconos.set(k, l.r);
  return l.r;
}

// =====================================================================================================================
// Paneles de 320x432 (mitad derecha o izquierda de la pantalla)
// =====================================================================================================================

export const PANEL = { w: 320, h: 432, y: 48, xIzq: 0, xDer: 480 } as const;
export const CELDA_INV = 29;

export interface Panel { img: Raster; zonas: Zona[] }

/** Separa un texto en líneas que entren en maxW pixeles. */
export function envolver(s: string, maxW: number): string[] {
  const out: string[] = [];
  for (const parrafo of s.split('\n')) {
    let linea = '';
    for (const p of parrafo.split(' ')) {
      const prueba = linea ? `${linea} ${p}` : p;
      if (anchoTexto(prueba) > maxW && linea) { out.push(linea); linea = p; } else linea = prueba;
    }
    out.push(linea);
  }
  return out;
}

/** Placa hundida de hierro para etiquetas y valores. */
function placa(l: Lienzo, x: number, y: number, w: number, h: number, o: { luz?: number } = {}) {
  piedra(l, x + 1, y + 1, w - 2, h - 2, { luz: o.luz ?? 0.14, contraste: 0.5, grietas: 0, semilla: x * 3 + y });
  sombraInterna(l, x + 1, y + 1, w - 2, h - 2, 3, 0.45);
  bisel(l, x, y, w, h, P.hierro, 2, { hundido: true });
}

/** Botón con texto: hierro con borde de latón. */
function botonTexto(l: Lienzo, x: number, y: number, w: number, h: number, s: string, estado: EstadoBoton = 'normal', o: { grande?: boolean } = {}) {
  const hund = estado === 'presionado';
  hierro(l, x + 1, y + 1, w - 2, h - 2, { semilla: x + y, luz: estado === 'encima' ? 0.6 : hund ? 0.3 : 0.47 });
  bisel(l, x, y, w, h, estado === 'apagado' ? P.hierro : P.laton, 2, { hundido: hund });
  if (hund) sombraInterna(l, x + 2, y + 2, w - 4, h - 4, 3, 0.5);
  if (estado === 'encima') for (let i = 3; i < w - 3; i++) { l.px(x + i, y + 2, P.laton[7], 0.4); }
  const col = estado === 'apagado' ? TXT.tenue : estado === 'encima' ? hx('#fff0c0') : TXT.oro;
  const d = hund ? 1 : 0;
  if (o.grande) textoTitulo(l, x + w / 2 + d, y + Math.floor((h - 7) / 2) + d, s, estado === 'encima' ? P.laton.slice(3) : estado === 'apagado' ? P.hierro.slice(3) : P.laton.slice(2), { alin: 'centro' });
  else texto(l, x + w / 2 + d, y + Math.floor((h - 7) / 2) + d, s, col, { alin: 'centro' });
}

/** Pestaña: la activa sale hacia adelante y se une con el panel. */
function pestana(l: Lienzo, x: number, y: number, w: number, h: number, s: string, activa: boolean) {
  if (activa) {
    piedra(l, x, y, w, h + 2, { luz: 0.34, semilla: x, grietas: 0 });
    bisel(l, x, y, w, h + 3, P.laton, 2);
    l.rect(x + 2, y + h, w - 4, 3, P.piedra[4]);
    textoTitulo(l, x + w / 2, y + Math.floor((h - 7) / 2), s, P.laton.slice(2), { alin: 'centro', negrita: false });
  } else {
    piedra(l, x + 1, y + 3, w - 2, h - 3, { luz: 0.2, semilla: x, grietas: 0 });
    bisel(l, x + 1, y + 3, w - 2, h - 3, P.hierro, 2);
    texto(l, x + w / 2, y + Math.floor((h - 7) / 2) + 2, s, TXT.tenue, { alin: 'centro' });
  }
}

/** Esquinero de latón con remaches (va en las cuatro esquinas del panel). */
function esquinero(l: Lienzo, x: number, y: number, fx: 1 | -1, fy: 1 | -1) {
  const m = new Mascara(l.w, l.h);
  for (let j = 0; j < 22; j++) for (let i = 0; i < 22; i++) {
    const enL = (i < 8 || j < 8) && i + j < 34;
    const curva = Math.hypot(i - 22, j - 22) < 15;
    if (enL && !curva) m.set(x + fx * i - (fx < 0 ? 1 : 0), y + fy * j - (fy < 0 ? 1 : 0));
  }
  forma(l, 0, 0, l.w - 1, l.h - 1, (a, b) => m.en(a, b), (a, b) => tono(P.laton, 0.5 + (fbm(a / 5, b / 3, 2) - 0.5) * 0.3, a, b), P.laton, 2);
  const px = (i: number, j: number): [number, number] => [x + fx * i - (fx < 0 ? 1 : 0), y + fy * j - (fy < 0 ? 1 : 0)];
  remache(l, ...px(4, 4), 1.6); remache(l, ...px(16, 4), 1.2); remache(l, ...px(4, 16), 1.2);
}

/** Marco común de los paneles: piedra tallada, borde de hierro forjado, esquineros de latón y título en placa. */
function marcoPanel(titulo: string, cerrar = true): { l: Lienzo; zonas: Zona[] } {
  const W = PANEL.w, Hh = PANEL.h, l = crearLienzo(W, Hh);
  piedra(l, 0, 0, W, Hh, { semilla: 17, luz: 0.3, grietas: 9 });
  // friso de rombos grabado a lo largo del borde interno
  const m = new Mascara(W, Hh);
  m.linea(12, 12, W - 13, 12); m.linea(12, Hh - 13, W - 13, Hh - 13); m.linea(12, 12, 12, Hh - 13); m.linea(W - 13, 12, W - 13, Hh - 13);
  for (let x = 20; x < W - 18; x += 8) m.rombo(x, Hh - 8, 2.5, 2);
  grabar(l, m, 0, 0, 0.8);
  // borde de hierro
  for (const [x, y, w, h, v] of [[0, 0, W, 8, false], [0, Hh - 8, W, 8, false], [0, 0, 8, Hh, true], [W - 8, 0, 8, Hh, true]] as [number, number, number, number, boolean][]) hierro(l, x, y, w, h, { semilla: x + y, vertical: v, luz: 0.48 });
  bisel(l, 0, 0, W, Hh, P.hierro, 3);
  bisel(l, 6, 6, W - 12, Hh - 12, P.hierro, 2, { hundido: true, sinContorno: true });
  for (let i = 0; i < W; i++) { l.px(i, 8, P.hierro[0]); l.px(i, Hh - 9, P.hierro[6], 0.3); }
  for (let j = 8; j < Hh - 8; j++) { l.px(8, j, P.hierro[0]); l.px(W - 9, j, P.hierro[6], 0.3); }
  sombraInterna(l, 9, 9, W - 18, Hh - 18, 5, 0.45);
  for (let x = 40; x < W - 30; x += 40) { remache(l, x, 3.5, 1.3); remache(l, x, Hh - 4.5, 1.3); }
  for (let y = 50; y < Hh - 30; y += 48) { remache(l, 3.5, y, 1.3); remache(l, W - 4.5, y, 1.3); }
  esquinero(l, 0, 0, 1, 1); esquinero(l, W, 0, -1, 1); esquinero(l, 0, Hh, 1, -1); esquinero(l, W, Hh, -1, -1);
  // placa del título
  const tw = Math.max(120, anchoTexto(titulo, true) + 40), tx = Math.round((W - tw) / 2);
  hierro(l, tx, 4, tw, 26, { semilla: 4, luz: 0.42 });
  bisel(l, tx, 4, tw, 26, P.laton, 3);
  sombraCaida(l, tx, 4, tw, 26, 2, 0.5);
  remache(l, tx + 7, 17, 1.6); remache(l, tx + tw - 8, 17, 1.6);
  textoTitulo(l, W / 2, 13, titulo, P.laton, { alin: 'centro' });
  const zonas: Zona[] = [];
  if (cerrar) {
    botonPicto(l, W - 34, 10, 20, 20, 'cerrar');
    zonas.push({ id: 'cerrar', tipo: 'boton', x: W - 34, y: 10, w: 20, h: 20, tecla: 'Esc', es: 'Cerrar', en: 'Close' });
  }
  return { l, zonas };
}

/** Rejilla de casilleros de cell px (inventario, cofre, mercader). */
function rejilla(l: Lienzo, x: number, y: number, cols: number, filas: number, cell = CELDA_INV) {
  const w = cols * cell, h = filas * cell;
  piedra(l, x, y, w, h, { luz: 0.13, contraste: 0.5, grietas: 0, semilla: 23 });
  for (let j = 0; j < filas; j++) for (let i = 0; i < cols; i++) {
    const cx = x + i * cell, cy = y + j * cell;
    sombraInterna(l, cx + 1, cy + 1, cell - 1, cell - 1, 3, 0.35);
    for (let k = 0; k < cell; k++) { l.px(cx + k, cy, P.hierro[0]); l.px(cx, cy + k, P.hierro[0]); l.px(cx + k, cy + 1, P.hierro[5], 0.32); l.px(cx + 1, cy + k, P.hierro[5], 0.32); l.px(cx + k, cy + cell - 1, P.hierro[4], 0.2); }
  }
  bisel(l, x - 3, y - 3, w + 6, h + 6, P.hierro, 3, { hundido: true });
}

const RAREZA_DE: Record<Rarity, RarezaTexto> = { normal: 'normal', magic: 'magico', rare: 'raro', set: 'set', unique: 'unico', legendary: 'unico' };

/** Pega el ícono de un objeto ocupando un rectángulo (con un leve fondo del color de la rareza). */
function pegarObjeto(l: Lienzo, it: LootItem, x: number, y: number, w: number, h: number, o: { fondo?: boolean } = {}) {
  const col = COLOR_RAREZA[RAREZA_DE[it.rarity]];
  if (o.fondo !== false && it.rarity !== 'normal') for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
    const g = 1 - Math.hypot((i - w / 2) / (w / 2), (j - h / 2) / (h / 2));
    if (g > 0) l.suma(x + i, y + j, col, g * 0.16);
  }
  const grande = w >= 50 && h >= 50;
  const ic = renderLoot(it, { px: grande ? 64 : 32, noAura: true });
  const c = centrado(ic, Math.min(w, ic.w), Math.min(h, ic.h));
  l.pegar(c, x + Math.floor((w - c.w) / 2), y + Math.floor((h - c.h) / 2));
}

/** Silueta grabada de un objeto (casillero de equipo vacío). */
function siluetaObjeto(l: Lienzo, it: LootItem, x: number, y: number, w: number, h: number) {
  const grande = w >= 50 || h >= 50;
  const ic = centrado(renderLoot(it, { px: grande ? 64 : 32, noAura: true }), Math.min(w, grande ? 64 : 32), Math.min(h, grande ? 64 : 32));
  const m = new Mascara(ic.w, ic.h);
  for (let j = 0; j < ic.h; j++) for (let i = 0; i < ic.w; i++) if (ic.data[(j * ic.w + i) * 4 + 3] > 0) m.set(i, j);
  const borde = new Mascara(ic.w, ic.h);
  for (let j = 0; j < ic.h; j++) for (let i = 0; i < ic.w; i++) if (m.en(i, j) && (!m.en(i - 1, j) || !m.en(i + 1, j) || !m.en(i, j - 1) || !m.en(i, j + 1))) borde.set(i, j);
  grabar(l, borde, x + Math.floor((w - ic.w) / 2), y + Math.floor((h - ic.h) / 2), 0.9);
}

// ------------------------------------------------------------------------------------------------ objetos de ejemplo

const L = (id: string): LootItem => findLoot(id) ?? baseWeapon('sword', 1);
const HEROE_MUESTRA = { cuerpo: HEROES[1].cuerpo, equipo: HEROES[1].niveles[2] };

/** Casilleros del equipo en coordenadas del panel (con el héroe de verdad en el nicho del medio). */
export const EQUIPO: { id: string; x: number; y: number; w: number; h: number; es: string; en: string }[] = [
  { id: 'arma', x: 14, y: 40, w: 44, h: 92, es: 'Arma', en: 'Weapon' },
  { id: 'guantes', x: 14, y: 138, w: 44, h: 44, es: 'Guantes', en: 'Gloves' },
  { id: 'casco', x: 62, y: 40, w: 40, h: 40, es: 'Cabeza', en: 'Head' },
  { id: 'pecho', x: 62, y: 84, w: 40, h: 56, es: 'Pecho', en: 'Chest' },
  { id: 'cinturon', x: 62, y: 144, w: 40, h: 38, es: 'Cinturón', en: 'Belt' },
  { id: 'amuleto', x: 218, y: 40, w: 40, h: 30, es: 'Amuleto', en: 'Amulet' },
  { id: 'anillo_izq', x: 218, y: 74, w: 40, h: 30, es: 'Anillo', en: 'Ring' },
  { id: 'anillo_der', x: 218, y: 108, w: 40, h: 30, es: 'Anillo', en: 'Ring' },
  { id: 'talisman', x: 218, y: 142, w: 40, h: 40, es: 'Talismán', en: 'Talisman' },
  { id: 'mano_libre', x: 262, y: 40, w: 44, h: 92, es: 'Escudo o mano libre', en: 'Shield or off-hand' },
  { id: 'botas', x: 262, y: 138, w: 44, h: 44, es: 'Botas', en: 'Boots' },
];
/** El nicho donde se ve el héroe con todo lo que lleva puesto. */
export const NICHO = { x: 106, y: 38, w: 108, h: 146 } as const;
/** La bolsa: 10x5 casilleros de 29 px y tres bolsas con pestañas. */
export const BOLSA = { x: 15, y: 234, cols: 10, filas: 5, bolsas: 3 } as const;

const SILUETAS: Record<string, LootItem> = {
  casco: baseArmor('helm', 'placas', 2), amuleto: { id: 'a', name: { es: '', en: '' }, rarity: 'normal', base: { cat: 'jewel', icon: 'amulet' }, level: 1, stats: { mods: [] } },
  arma: baseWeapon('sword', 1), mano_libre: baseOffhand('shield_kite', 1), pecho: baseArmor('chest', 'placas', 2), guantes: baseArmor('gloves', 'placas', 2),
  cinturon: baseArmor('belt', 'cuero', 2), botas: baseArmor('boots', 'placas', 2),
  anillo_izq: { id: 'r', name: { es: '', en: '' }, rarity: 'normal', base: { cat: 'jewel', icon: 'ring' }, level: 1, stats: { mods: [] } },
  anillo_der: { id: 'r', name: { es: '', en: '' }, rarity: 'normal', base: { cat: 'jewel', icon: 'ring' }, level: 1, stats: { mods: [] } },
  talisman: { id: 't', name: { es: '', en: '' }, rarity: 'normal', base: { cat: 'jewel', icon: 'amulet' }, level: 1, stats: { mods: [] } },
};

/** Un arma 3D del motor para el inventario: de pie, de frente, pintada al tamaño exacto de su casilla. */
export interface Arma3D { tipo: TipoArma; mat?: string; mango?: string; gema?: string; encanto?: Encanto }
const cacheArma3D = new Map<string, Raster>();
export function iconoArma3D(a: Arma3D, w: number, h: number, cuadro = 0): Raster {
  const k = `${JSON.stringify(a)}|${w}|${h}|${cuadro % 8}`;
  const c = cacheArma3D.get(k);
  if (c) return c;
  const pinta = (escala: number) => { const e = armaSuelta(a.tipo, { ...a, escala }, 'icono', cuadro); return pintarEscena({ piezas: e.piezas, resplandor: e.resplandor, sinSombra: true, ss: 1 }).img; };
  const r1 = pinta(1);
  const k1 = Math.min((w - 4) / Math.max(1, r1.w), (h - 4) / Math.max(1, r1.h));
  let r = pinta(Math.max(0.5, k1 * 0.96));
  if (r.w > w || r.h > h) r = centrado(r, Math.min(w, r.w), Math.min(h, r.h));
  cacheArma3D.set(k, r);
  return r;
}

/** Un objeto en la bolsa: dónde está, cuánto ocupa y lo que se dibuja encima (cantidad, durabilidad, engastes, si es mejor). */
export interface ObjetoInv {
  it: LootItem; x: number; y: number; w: number; h: number;
  arma3d?: Arma3D;
  cantidad?: number;
  /** durabilidad 0..1 (sin valor = no se gasta) */
  durabilidad?: number;
  /** engastes: null vacío o lo engastado ('rubi', 'zafiro', 'esmeralda', 'amatista', 'diamante', 'topacio', 'runa') */
  engastes?: (string | null)[];
  /** comparado con lo que lleva puesto: 1 mejor, -1 peor */
  compara?: 1 | -1 | 0;
  nuevo?: boolean;
}

const COLOR_GEMA: Record<string, C3> = { rubi: [220, 40, 40], zafiro: [60, 110, 240], esmeralda: [40, 200, 90], amatista: [170, 70, 220], diamante: [235, 240, 255], topacio: [240, 200, 60], runa: [210, 170, 90] };

/** Fondo de la rareza bajo un objeto: degradé del color, borde fino y un halo para lo único y los conjuntos. */
function fondoRareza(l: Lienzo, it: LootItem, x: number, y: number, w: number, h: number) {
  const rz = RAREZA_DE[it.rarity];
  if (rz === 'normal') { for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) l.mul(x + i, y + j, 0.92); return; }
  const col = COLOR_RAREZA[rz];
  for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
    const g = Math.max(0, 1 - Math.hypot((i - w / 2) / (w * 0.62), (j - h / 2) / (h * 0.62)));
    l.px(x + i, y + j, escalar(col, 0.32), 0.18 + g * 0.22);
  }
  for (let i = 1; i < w - 1; i++) { l.px(x + i, y + 1, col, 0.45); l.px(x + i, y + h - 2, col, 0.35); }
  for (let j = 1; j < h - 1; j++) { l.px(x + 1, y + j, col, 0.45); l.px(x + w - 2, y + j, col, 0.35); }
  if (rz === 'unico' || rz === 'set') for (let j = 2; j < h - 2; j++) for (let i = 2; i < w - 2; i++) { const borde = Math.min(i, j, w - 1 - i, h - 1 - j); if (borde < 4) l.suma(x + i, y + j, col, (4 - borde) * 0.035); }
}

/** Achica un raster promediando (para que los íconos no se corten ni se salgan de su casilla). */
function reducir(r: Raster, w: number, h: number): Raster {
  const o = createRaster(Math.max(1, w), Math.max(1, h));
  const kx = r.w / o.w, ky = r.h / o.h;
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) {
    let a = 0, rr = 0, g = 0, b = 0, n = 0;
    for (let j = Math.floor(y * ky); j < Math.min(r.h, Math.ceil((y + 1) * ky)); j++) for (let i = Math.floor(x * kx); i < Math.min(r.w, Math.ceil((x + 1) * kx)); i++) {
      const q = (j * r.w + i) * 4, al = r.data[q + 3] / 255;
      rr += r.data[q] * al; g += r.data[q + 1] * al; b += r.data[q + 2] * al; a += al; n++;
    }
    const d = (y * o.w + x) * 4;
    if (a > 0) { o.data[d] = rr / a; o.data[d + 1] = g / a; o.data[d + 2] = b / a; o.data[d + 3] = a / n >= 0.43 ? 255 : Math.round((a / n) * 255); }
  }
  return o;
}

/** El ícono de un objeto ocupando su rectángulo: armas en 3D del motor, lo demás con el motor de botín (sin salirse). */
function iconoEn(l: Lienzo, o: { it: LootItem; arma3d?: Arma3D }, x: number, y: number, w: number, h: number, cuadro = 0) {
  let r: Raster;
  if (o.arma3d) r = iconoArma3D(o.arma3d, w, h, cuadro);
  else {
    const ic = renderLoot(o.it, { px: Math.min(w, h) >= 50 ? 64 : 32, noAura: true });
    const k = Math.min(1, (w - 2) / ic.w, (h - 2) / ic.h);
    r = k < 1 ? reducir(ic, Math.floor(ic.w * k), Math.floor(ic.h * k)) : ic;
  }
  const px = x + Math.floor((w - r.w) / 2), py = y + Math.floor((h - r.h) / 2);
  sombraDe(l, r, px, py, 2, 0.55);
  l.pegar(r, px, py);
}

/** Lo que va encima del objeto: engastes, durabilidad, cantidad, flecha de comparación y chispa de nuevo. */
function marcasObjeto(l: Lienzo, o: ObjetoInv, x: number, y: number, w: number, h: number, cuadro = 0) {
  if (o.engastes?.length) {
    const n = o.engastes.length, paso = Math.min(9, (w - 6) / n), x0 = x + Math.round((w - paso * (n - 1)) / 2);
    o.engastes.forEach((g, k) => {
      const cx = Math.round(x0 + k * paso), cy = y + h - 9;
      for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { const d = Math.hypot(i, j); if (d <= 3.2) l.px(cx + i, cy + j, d > 2.3 ? P.hierro[1] : g ? escalar(COLOR_GEMA[g] ?? [200, 200, 200], 0.55 + (j < 0 ? 0.35 : 0) + (i < 0 ? 0.1 : 0)) : P.piedra[0]); }
      if (g) l.px(cx - 1, cy - 1, [255, 255, 255], 0.8);
    });
  }
  if (o.durabilidad !== undefined) {
    const bw = w - 8, f = clamp(o.durabilidad), col: C3 = f > 0.5 ? [90, 190, 80] : f > 0.25 ? [220, 180, 60] : [220, 60, 50];
    l.rect(x + 4, y + h - 3, bw, 2, [10, 8, 8], 0.8); l.rect(x + 4, y + h - 3, Math.max(1, Math.round(bw * f)), 2, col);
  }
  if (o.cantidad && o.cantidad > 1) texto(l, x + w - 2, y + h - 10, String(o.cantidad), [240, 232, 210], { alin: 'der', sombra: TXT.negro });
  if (o.compara) {
    const col: C3 = o.compara > 0 ? [90, 230, 90] : [230, 70, 60], cx = x + w - 6, cy = y + 6;
    for (let j = 0; j < 4; j++) for (let i = -j; i <= j; i++) l.px(cx + i, o.compara > 0 ? cy - 2 + j : cy + 2 - j, col);
  }
  if (o.nuevo) { const b = 0.5 + 0.5 * Math.sin(cuadro * 0.8); for (const [i, j] of [[0, -2], [0, 2], [-2, 0], [2, 0], [0, -1], [0, 1], [-1, 0], [1, 0], [0, 0]]) l.suma(x + 6 + i, y + 6 + j, [255, 240, 180], 0.4 + b * 0.5); }
}

/** Objetos de ejemplo para el inventario de muestra (del motor de botín y del arsenal 3D). */
export function objetosDeMuestra() {
  const cosa = (id: string, es: string, en: string, base: Record<string, unknown>): LootItem => ({ id, name: { es, en }, rarity: 'normal', base, level: 1, stats: { mods: [] } }) as unknown as LootItem;
  return {
    equipo: {
      casco: { it: L('corona_del_rey_caido') }, amuleto: { it: L('collar_de_thor') },
      arma: { it: L('filo_del_alba'), arma3d: { tipo: 'espada', mat: 'cu_oro', encanto: 'sagrado' } as Arma3D },
      mano_libre: { it: L('escudo_de_la_casa_gg') }, pecho: { it: baseArmor('chest', 'placas', 5) }, guantes: { it: L('guanteletes_del_titan') },
      cinturon: { it: L('cinto_del_gigante') }, botas: { it: L('botas_de_siete_leguas') },
      anillo_izq: { it: L('anillo_del_ojo_eterno') }, anillo_der: { it: L('sello_del_liche') },
      talisman: { it: rollItem(cosa('talisman', 'Talismán', 'Talisman', { cat: 'jewel', icon: 'amulet' }), 'magic', 12) },
    } as Record<string, { it: LootItem; arma3d?: Arma3D }>,
    bolsa: [
      { it: L('beso_de_la_vibora'), arma3d: { tipo: 'espada', mat: 'cu_placa_oscura', encanto: 'fuego' }, x: 0, y: 0, w: 1, h: 3, durabilidad: 0.9, engastes: ['rubi'], compara: 1, nuevo: true },
      { it: rollItem(baseWeapon('sword', 3), 'rare', 4), arma3d: { tipo: 'mandoble', mat: 'cu_placa', encanto: 'hielo' }, x: 1, y: 0, w: 2, h: 4, durabilidad: 0.62, engastes: ['zafiro', null, null], compara: 1 },
      { it: rollItem(baseWeapon('axe', 3), 'magic', 7), arma3d: { tipo: 'hacha', mat: 'cu_placa', mango: 'madera' }, x: 3, y: 0, w: 2, h: 3, durabilidad: 0.3, compara: -1 },
      { it: rollItem(baseArmor('chest', 'malla', 4), 'rare', 3), x: 5, y: 0, w: 2, h: 3, durabilidad: 0.8, engastes: [null, null] },
      { it: rollItem(baseArmor('helm', 'placas', 3), 'rare', 5), x: 7, y: 0, w: 2, h: 2, durabilidad: 0.55, compara: -1 },
      { it: rollItem(baseOffhand('shield_kite', 3), 'magic', 6), x: 7, y: 2, w: 2, h: 3, durabilidad: 0.95, engastes: ['esmeralda', 'amatista'] },
      { it: baseArmor('boots', 'cuero', 2), x: 3, y: 3, w: 2, h: 2, durabilidad: 0.4 },
      { it: rollItem(baseWeapon('sword', 2), 'magic', 8), arma3d: { tipo: 'daga', mat: 'cu_hueso', encanto: 'veneno' }, x: 0, y: 3, w: 1, h: 2, durabilidad: 1 },
      { it: cosa('pocion_vida', 'Poción de vida', 'Life potion', { cat: 'potion', kind: 'health', size: 'greater' }), x: 9, y: 0, w: 1, h: 1, cantidad: 6 },
      { it: cosa('pocion_mana', 'Poción de maná', 'Mana potion', { cat: 'potion', kind: 'mana', size: 'greater' }), x: 9, y: 1, w: 1, h: 1, cantidad: 4 },
      { it: cosa('pocion_rejuv', 'Poción de rejuvenecer', 'Rejuvenation potion', { cat: 'potion', kind: 'rejuv', size: 'normal' }), x: 9, y: 2, w: 1, h: 1, cantidad: 2 },
      { it: cosa('rubi', 'Rubí', 'Ruby', { cat: 'gem', kind: 'ruby', grade: 'flawless' }), x: 5, y: 3, w: 1, h: 1 },
      { it: cosa('amatista', 'Amatista', 'Amethyst', { cat: 'gem', kind: 'amethyst', grade: 'perfect' }), x: 6, y: 3, w: 1, h: 1 },
      { it: cosa('runa', 'Runa', 'Rune', { cat: 'rune', index: 6 }), x: 5, y: 4, w: 1, h: 1, cantidad: 3 },
      { it: cosa('pergamino', 'Pergamino de regreso', 'Return scroll', { cat: 'consumable', icon: 'scroll_portal' }), x: 9, y: 3, w: 1, h: 1, cantidad: 12 },
      { it: cosa('llave', 'Llave', 'Key', { cat: 'consumable', icon: 'key' }), x: 9, y: 4, w: 1, h: 1, cantidad: 3 },
      { it: rollItem(cosa('anillo', 'Anillo', 'Ring', { cat: 'jewel', icon: 'ring' }), 'rare', 11), x: 6, y: 4, w: 1, h: 1, compara: 1, nuevo: true },
    ] as ObjetoInv[],
  };
}

export interface OpcInventario {
  vacio?: boolean; oro?: number;
  /** el héroe que se ve en el nicho (por omisión un templario leyenda) */
  heroe?: { cuerpo: Cuerpo; equipo: Equipo };
  /** lo que lleva puesto por casillero y lo que hay en la bolsa activa */
  equipo?: Record<string, { it: LootItem; arma3d?: Arma3D }>;
  bolsa?: ObjetoInv[];
  /** bolsa activa (0..2) */
  bolsaActiva?: number;
  /** resumen de estadísticas del héroe */
  resumen?: { danio: [number, number]; defensa: number; res: [number, number, number, number]; peso: [number, number] };
  cuadro?: number;
}

const cacheHeroe = new Map<string, Raster>();
/** El héroe con su equipo, casi al doble de tamaño (pintado así, no agrandado), mirando de frente y respirando. */
export function heroeEnNicho(cuerpo: Cuerpo, equipo: Equipo, cuadro = 0): Raster {
  const k = JSON.stringify([cuerpo, equipo, cuadro % 4]);
  const c = cacheHeroe.get(k);
  if (c) return c;
  const e = personajeEscena({ ...cuerpo, alto: (cuerpo.alto ?? 1) * 1.9 }, equipo, 'so', 'quieto', cuadro % 4);
  const r = pintarEscena({ ...e, sinSombra: true, ss: 1 }).img;
  cacheHeroe.set(k, r);
  return r;
}

/** Inventario: el héroe en su nicho con 11 casilleros de equipo alrededor, resumen, tres bolsas de 10x5 y oro. */
export function panelInventario(idioma: Idioma = 'es', o: OpcInventario = {}): Panel {
  const { l, zonas } = marcoPanel(idioma === 'es' ? 'Inventario' : 'Inventory');
  const W = PANEL.w, cuadro = o.cuadro ?? 0;
  const muestra = objetosDeMuestra();
  // ---- el nicho del héroe: arco de piedra oscura con la luz de una antorcha y su sombra en el piso
  const N = NICHO;
  piedra(l, N.x, N.y, N.w, N.h, { luz: 0.1, contraste: 0.6, grietas: 2, semilla: 41 });
  for (let j = 0; j < N.h; j++) for (let i = 0; i < N.w; i++) {
    const dx = (i - N.w / 2) / (N.w * 0.55), dy = (j - N.h * 0.42) / (N.h * 0.6);
    const g = Math.max(0, 1 - Math.hypot(dx, dy));
    l.suma(N.x + i, N.y + j, [255, 170, 90], g * g * 0.13);
    if (j < 22 && Math.hypot(i - N.w / 2, (j - 22) * 2.3) > N.w / 2 - 1) l.mul(N.x + i, N.y + j, 0.35);
  }
  sombraInterna(l, N.x, N.y, N.w, N.h, 6, 0.6);
  bisel(l, N.x - 2, N.y - 2, N.w + 4, N.h + 4, P.hierro, 2, { hundido: true });
  if (!o.vacio) {
    const hh = o.heroe ?? HEROE_MUESTRA;
    const fig = heroeEnNicho(hh.cuerpo, hh.equipo, cuadro);
    const k = Math.min(1, (N.h - 10) / fig.h), f1 = k < 1 ? reducir(fig, Math.floor(fig.w * k), Math.floor(fig.h * k)) : fig;
    const f2 = f1.w > N.w - 4 ? centrado(f1, N.w - 4, f1.h) : f1;
    // sombra suave en el piso del nicho
    const sx = N.x + N.w / 2, sy = N.y + N.h - 8;
    for (let j = -6; j <= 6; j++) for (let i = -34; i <= 34; i++) { const d = Math.hypot(i / 34, j / 6); if (d < 1) l.mul(sx + i, sy + j, 0.55 + 0.45 * d); }
    l.pegar(f2, N.x + Math.floor((N.w - f2.w) / 2), N.y + N.h - f2.h - 6);
  }
  zonas.push({ id: 'heroe', tipo: 'info', x: N.x, y: N.y, w: N.w, h: N.h, es: 'Tu héroe', en: 'Your hero' });
  // ---- casilleros del equipo
  const eq = o.equipo ?? muestra.equipo;
  for (const e of EQUIPO) {
    casillero(l, e.x, e.y, e.w, e.h, { luzFondo: 0.15 });
    const it = eq[e.id];
    if (o.vacio || !it) siluetaObjeto(l, SILUETAS[e.id], e.x, e.y, e.w, e.h);
    else { fondoRareza(l, it.it, e.x + 1, e.y + 1, e.w - 2, e.h - 2); iconoEn(l, it, e.x + 2, e.y + 2, e.w - 4, e.h - 4, cuadro); }
    zonas.push({ id: `equipo_${e.id}`, tipo: 'equipo', x: e.x, y: e.y, w: e.w, h: e.h, es: e.es, en: e.en });
  }
  // ---- resumen de estadísticas
  const R = o.resumen ?? { danio: [34, 78] as [number, number], defensa: 412, res: [45, 30, 62, 20] as [number, number, number, number], peso: [42, 120] as [number, number] };
  const ys = 190;
  placa(l, 14, ys, W - 28, 28);
  texto(l, 22, ys + 4, idioma === 'es' ? 'Daño' : 'Damage', TXT.tenue); texto(l, 22, ys + 15, `${R.danio[0]}-${R.danio[1]}`, TXT.oro);
  texto(l, 96, ys + 4, idioma === 'es' ? 'Defensa' : 'Defense', TXT.tenue); texto(l, 96, ys + 15, String(R.defensa), TXT.oro);
  texto(l, 168, ys + 4, idioma === 'es' ? 'Resistencias' : 'Resistances', TXT.tenue);
  const colRes: C3[] = [[240, 110, 50], [110, 170, 255], [250, 230, 90], [110, 220, 90]];
  R.res.forEach((v, k) => texto(l, 168 + k * 33, ys + 15, String(v), colRes[k]));
  zonas.push({ id: 'resumen', tipo: 'info', x: 14, y: ys, w: W - 28, h: 28, es: 'Resumen', en: 'Summary' });
  // ---- pestañas de las bolsas y ordenar
  const act = o.bolsaActiva ?? 0, yt = BOLSA.y - 14;
  for (let b = 0; b < BOLSA.bolsas; b++) { pestana(l, BOLSA.x + b * 40, yt, 38, 13, ['I', 'II', 'III'][b], b === act); zonas.push({ id: `bolsa_pestana_${b + 1}`, tipo: 'pestana', x: BOLSA.x + b * 40, y: yt, w: 38, h: 13, es: `Bolsa ${b + 1}`, en: `Bag ${b + 1}` }); }
  botonTexto(l, W - 15 - 70, yt - 1, 70, 14, idioma === 'es' ? 'Ordenar' : 'Sort');
  zonas.push({ id: 'ordenar', tipo: 'boton', x: W - 15 - 70, y: yt - 1, w: 70, h: 14, es: 'Ordenar la bolsa', en: 'Sort the bag' });
  // ---- la bolsa
  rejilla(l, BOLSA.x, BOLSA.y, BOLSA.cols, BOLSA.filas);
  const bolsa = o.vacio ? [] : o.bolsa ?? muestra.bolsa;
  for (const b of bolsa) {
    const x = BOLSA.x + b.x * CELDA_INV, y = BOLSA.y + b.y * CELDA_INV, w = b.w * CELDA_INV + 1, h = b.h * CELDA_INV + 1;
    fondoRareza(l, b.it, x + 1, y + 1, w - 2, h - 2);
    iconoEn(l, b, x + 2, y + 2, w - 4, h - 4, cuadro);
    marcasObjeto(l, b, x + 1, y + 1, w - 2, h - 2, cuadro);
  }
  for (let j = 0; j < BOLSA.filas; j++) for (let i = 0; i < BOLSA.cols; i++) zonas.push({ id: `bolsa_${i}_${j}`, tipo: 'casillero', x: BOLSA.x + i * CELDA_INV, y: BOLSA.y + j * CELDA_INV, w: CELDA_INV, h: CELDA_INV });
  // ---- oro y peso
  const yo = BOLSA.y + BOLSA.filas * CELDA_INV + 8;
  placa(l, 15, yo, 140, 20);
  picto(l, 'oro', 21, yo + 6, P.laton);
  texto(l, 34, yo + 7, (o.oro ?? 12450).toLocaleString(idioma === 'es' ? 'es-VE' : 'en-US'), TXT.oro);
  zonas.push({ id: 'oro', tipo: 'boton', x: 15, y: yo, w: 140, h: 20, es: 'Soltar oro', en: 'Drop gold' });
  texto(l, W - 17, yo + 7, `${idioma === 'es' ? 'Peso' : 'Weight'} ${R.peso[0]} / ${R.peso[1]}`, TXT.tenue, { alin: 'der' });
  return { img: l.r, zonas };
}

// ------------------------------------------------------------------------------------------------ hoja del personaje

const ES_EN = (es: string, en: string, idioma: Idioma) => (idioma === 'es' ? es : en);
/** Formato de miles con punto (es) o coma (en). */
const miles = (n: number, idioma: Idioma) => n.toLocaleString(idioma === 'es' ? 'es-VE' : 'en-US');

export interface DatosPersonaje {
  nombre: string; clase: { es: string; en: string }; nivel: number; experiencia: number; siguiente: number;
  fuerza: number; destreza: number; vitalidad: number; energia: number; puntos: number;
  vida: [number, number]; mana: [number, number]; aguante: [number, number];
  danio: [number, number]; defensa: number; ataque: number; bloqueo: number;
  res: { fuego: number; frio: number; rayo: number; veneno: number };
}
export const PERSONAJE_DEMO: DatosPersonaje = {
  nombre: 'Gael', clase: { es: 'Caballero de la Forja', en: 'Forge Knight' }, nivel: 24, experiencia: 1245800, siguiente: 1500000,
  fuerza: 85, destreza: 40, vitalidad: 120, energia: 35, puntos: 5, vida: [412, 412], mana: [145, 145], aguante: [180, 180],
  danio: [34, 58], defensa: 412, ataque: 612, bloqueo: 32, res: { fuego: 45, frio: 30, rayo: 52, veneno: 18 },
};

/** Hoja del personaje: nombre, clase, nivel, experiencia, atributos con botón de sumar puntos, derivados y resistencias. */
export function panelPersonaje(idioma: Idioma = 'es', d: DatosPersonaje = PERSONAJE_DEMO): Panel {
  const { l, zonas } = marcoPanel(ES_EN('Personaje', 'Character', idioma));
  const etiqueta = (x: number, y: number, s: string) => texto(l, x, y, s, TXT.tenue, { sombra: P.piedra[0] });
  // nombre y clase
  placa(l, 16, 44, 120, 26); etiqueta(22, 46, ES_EN('Nombre', 'Name', idioma).toUpperCase().slice(0, 12));
  texto(l, 76, 58, d.nombre, TXT.claro, { alin: 'centro' });
  placa(l, 140, 44, 164, 26); etiqueta(146, 46, ES_EN('CLASE', 'CLASS', idioma));
  texto(l, 222, 58, d.clase[idioma], TXT.oro, { alin: 'centro' });
  // nivel y experiencia
  placa(l, 16, 76, 56, 34); etiqueta(22, 79, ES_EN('NIVEL', 'LEVEL', idioma));
  textoTitulo(l, 44, 93, String(d.nivel), P.laton, { alin: 'centro' });
  placa(l, 76, 76, 112, 34); etiqueta(82, 79, ES_EN('EXPERIENCIA', 'EXPERIENCE', idioma));
  texto(l, 182, 96, miles(d.experiencia, idioma), TXT.claro, { alin: 'der' });
  placa(l, 192, 76, 112, 34); etiqueta(198, 79, ES_EN('SIGUIENTE', 'NEXT LEVEL', idioma));
  texto(l, 298, 96, miles(d.siguiente, idioma), TXT.claro, { alin: 'der' });
  // atributos
  const attrs: [string, string, string, number, [string, string][]][] = [
    ['fuerza', 'Fuerza', 'Strength', d.fuerza, [[ES_EN('Daño', 'Damage', idioma), `${d.danio[0]}-${d.danio[1]}`], [ES_EN('Ataque', 'Attack rating', idioma), String(d.ataque)]]],
    ['destreza', 'Destreza', 'Dexterity', d.destreza, [[ES_EN('Defensa', 'Defense', idioma), String(d.defensa)], [ES_EN('Bloqueo', 'Block', idioma), `${d.bloqueo}%`]]],
    ['vitalidad', 'Vitalidad', 'Vitality', d.vitalidad, [[ES_EN('Aguante', 'Stamina', idioma), `${d.aguante[0]} / ${d.aguante[1]}`], [ES_EN('Vida', 'Life', idioma), `${d.vida[0]} / ${d.vida[1]}`]]],
    ['energia', 'Energía', 'Energy', d.energia, [[ES_EN('Maná', 'Mana', idioma), `${d.mana[0]} / ${d.mana[1]}`]]],
  ];
  attrs.forEach(([id, es, en, v, der], i) => {
    const y = 120 + i * 42;
    placa(l, 16, y, 86, 22); texto(l, 22, y + 8, (idioma === 'es' ? es : en), TXT.claro);
    placa(l, 104, y, 38, 22); texto(l, 123, y + 8, String(v), TXT.claro, { alin: 'centro' });
    const bx = 145, by = y + 1;
    if (d.puntos > 0) { botonPicto(l, bx, by, 20, 20, 'mas'); resplandor(l, bx + 10, by + 10, 12, [255, 200, 90], 0.12); }
    else botonPicto(l, bx, by, 20, 20, 'mas', 'apagado');
    zonas.push({ id: `sumar_${id}`, tipo: 'boton', x: bx, y: by, w: 20, h: 20, es: `Sumar a ${es}`, en: `Add to ${en}` });
    der.forEach(([k, val], j) => {
      const yy = y + j * 22 - (der.length === 1 ? 0 : 0);
      placa(l, 170, yy, 134, 20);
      texto(l, 176, yy + 7, k, TXT.tenue);
      texto(l, 298, yy + 7, val, k === ES_EN('Vida', 'Life', idioma) ? TXT.rojo : k === ES_EN('Maná', 'Mana', idioma) ? TXT.azul : TXT.claro, { alin: 'der' });
    });
  });
  barraHierro(l, 16, 276, 288, 8, 5, 3);
  // puntos sin gastar
  const yp = 292;
  placa(l, 16, yp, 126, 22, { luz: 0.2 });
  texto(l, 22, yp + 8, ES_EN('Puntos', 'Points', idioma), TXT.oro);
  textoTitulo(l, 128, yp + 8, String(d.puntos), P.fuego.slice(3), { alin: 'der' });
  resplandor(l, 120, yp + 11, 14, [255, 150, 60], 0.12);
  // resistencias
  const res: [string, string, number, C3, Rampa][] = [
    [ES_EN('Res. al fuego', 'Fire resist', idioma), 'fuego', d.res.fuego, TXT.fuego, P.fuego],
    [ES_EN('Res. al frío', 'Cold resist', idioma), 'frio', d.res.frio, TXT.hielo, P.hielo],
    [ES_EN('Res. al rayo', 'Lightning resist', idioma), 'rayo', d.res.rayo, TXT.rayo, P.aguante],
    [ES_EN('Res. al veneno', 'Poison resist', idioma), 'veneno', d.res.veneno, TXT.veneno, P.veneno],
  ];
  res.forEach(([k, , v, c, r], i) => {
    const y = 322 + i * 24;
    placa(l, 16, y, 288, 20);
    bola(l, 27, y + 10, 5, r, { brillo: 0.15 });
    texto(l, 38, y + 7, k, TXT.claro);
    texto(l, 298, y + 7, `${v}%`, c, { alin: 'der' });
  });
  return { img: l.r, zonas };
}

// ------------------------------------------------------------------------------------------------ árbol de habilidades

export interface RamaHabilidades { es: string; en: string; casillas: { id: string; col: number; fila: number; nivel: number; requiere?: number[] }[] }
/** Tres ramas de ejemplo (3 columnas x 6 filas). requiere = índices de casillas de la misma rama. */
export const ARBOL_DEMO: RamaHabilidades[] = [
  { es: 'Forja', en: 'Forge', casillas: [
    { id: 'saeta_de_fuego', col: 0, fila: 0, nivel: 8 }, { id: 'muro_de_llamas', col: 2, fila: 0, nivel: 3 },
    { id: 'bola_de_fuego', col: 0, fila: 2, nivel: 12, requiere: [0] }, { id: 'escudo_de_luz', col: 1, fila: 1, nivel: 1 },
    { id: 'aura_sagrada', col: 1, fila: 3, nivel: 0, requiere: [3] }, { id: 'meteoro', col: 0, fila: 5, nivel: 0, requiere: [2, 4] },
    { id: 'golpe_sagrado', col: 2, fila: 3, nivel: 1, requiere: [1] }, { id: 'sanar', col: 2, fila: 5, nivel: 0, requiere: [6] },
  ] },
  { es: 'Escarcha', en: 'Frost', casillas: [
    { id: 'saeta_de_hielo', col: 0, fila: 0, nivel: 5 }, { id: 'nova_de_escarcha', col: 1, fila: 1, nivel: 4, requiere: [0] },
    { id: 'ventisca', col: 1, fila: 4, nivel: 0, requiere: [1] }, { id: 'teletransporte', col: 2, fila: 2, nivel: 1 },
  ] },
  { es: 'Tormenta', en: 'Storm', casillas: [
    { id: 'rayo_en_cadena', col: 1, fila: 0, nivel: 2 }, { id: 'lanza_de_rayos', col: 1, fila: 3, nivel: 0, requiere: [0] }, { id: 'tornado', col: 2, fila: 5, nivel: 0, requiere: [1] },
  ] },
];
const ARBOL = { x0: 48, y0: 66, dx: 88, dy: 56 } as const;

/** Flecha grabada en latón entre dos casillas del árbol. */
function flechaArbol(l: Lienzo, x0: number, y0: number, x1: number, y1: number, activa: boolean) {
  const r = activa ? P.laton : P.hierro;
  const pts: [number, number][] = x0 === x1 ? [[x0, y0], [x1, y1]] : [[x0, y0], [x0, (y0 + y1) / 2], [x1, (y0 + y1) / 2], [x1, y1]];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    if (ax === bx) for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) { l.px(ax - 2, y, r[0]); l.px(ax - 1, y, r[6]); l.px(ax, y, r[4]); l.px(ax + 1, y, r[2]); l.px(ax + 2, y, r[0]); }
    else for (let x = Math.min(ax, bx) - 2; x <= Math.max(ax, bx) + 2; x++) { l.px(x, ay - 2, r[0]); l.px(x, ay - 1, r[6]); l.px(x, ay, r[4]); l.px(x, ay + 1, r[2]); l.px(x, ay + 2, r[0]); }
  }
  // punta
  for (let k = 0; k < 5; k++) { l.hl(x1 - 5 + k, x1 + 5 - k, y1 - 6 + k, k === 0 ? r[0] : r[6 - Math.min(4, k)]); l.px(x1 - 5 + k - 1, y1 - 6 + k, r[0]); l.px(x1 + 5 - k + 1, y1 - 6 + k, r[0]); }
}

/** Árbol de habilidades: 3 pestañas, grilla de 3x6 con flechas y contador de puntos. */
export function panelHabilidades(idioma: Idioma = 'es', o: { rama?: number; puntos?: number; ramas?: RamaHabilidades[] } = {}): Panel {
  const ramas = o.ramas ?? ARBOL_DEMO, ri = o.rama ?? 0;
  const { l, zonas } = marcoPanel(ES_EN('Habilidades', 'Skills', idioma));
  ramas.slice(0, 3).forEach((r, i) => {
    const x = 14 + i * 98;
    pestana(l, x, 36, 94, 20, r[idioma], i === ri);
    zonas.push({ id: `pestana_${i + 1}`, tipo: 'pestana', x, y: 36, w: 94, h: 20, es: r.es, en: r.en });
  });
  // fondo de la rama: panel hundido con columnas grabadas
  placa(l, 14, 58, 292, 336, { luz: 0.2 });
  const m = new Mascara(PANEL.w, PANEL.h);
  for (let c = 0; c < 3; c++) for (let y = 64; y < 390; y += 3) m.set(ARBOL.x0 + 24 + c * ARBOL.dx, y);
  grabar(l, m, 0, 0, 0.35);
  const rama = ramas[ri];
  const pos = (c: number, f: number): [number, number] => [ARBOL.x0 + c * ARBOL.dx, ARBOL.y0 + f * ARBOL.dy];
  for (const cs of rama.casillas) for (const q of cs.requiere ?? []) {
    const a = rama.casillas[q];
    const [ax, ay] = pos(a.col, a.fila), [bx, by] = pos(cs.col, cs.fila);
    flechaArbol(l, ax + 24, ay + 50, bx + 24, by - 4, a.nivel > 0);
  }
  for (let f = 0; f < 6; f++) for (let c = 0; c < 3; c++) {
    const [x, y] = pos(c, f);
    const cs = rama.casillas.find((k) => k.col === c && k.fila === f);
    if (!cs) {
      // casilla vacía: un rombo grabado tenue
      const mk = new Mascara(PANEL.w, PANEL.h); mk.rombo(x + 24, y + 24, 6, 6); grabar(l, mk, 0, 0, 0.5);
    } else {
      sombraCaida(l, x, y, 48, 48, 2, 0.6);
      const bloqueada = cs.nivel === 0 && (cs.requiere ?? []).some((q) => rama.casillas[q].nivel === 0);
      l.pegar(iconoHabilidad(cs.id, bloqueada ? 'apagado' : 'normal'), x, y);
      // insignia del nivel
      placa(l, x + 34, y + 38, 18, 13, { luz: 0.08 });
      const s = String(cs.nivel);
      textoMicro(l, x + 43 - Math.floor(anchoMicro(s) / 2), y + 42, s, cs.nivel > 0 ? P.laton[7] : P.hierro[6]);
    }
    zonas.push({ id: `habilidad_${c}_${f}`, tipo: 'habilidad', x, y, w: 48, h: 48, es: cs ? HABILIDADES.find((h) => h.id === cs.id)?.es : undefined, en: cs ? HABILIDADES.find((h) => h.id === cs.id)?.en : undefined });
  }
  // puntos
  placa(l, 14, 398, 292, 24, { luz: 0.18 });
  texto(l, 24, 406, ES_EN('Puntos de habilidad', 'Skill points', idioma), TXT.oro);
  textoTitulo(l, 294, 406, String(o.puntos ?? 3), P.fuego.slice(3), { alin: 'der' });
  return { img: l.r, zonas };
}

// ------------------------------------------------------------------------------------------------ cofre y mercader

function bolsaGrande(l: Lienzo, zonas: Zona[], x: number, y: number, cols: number, filas: number, items: { it: LootItem; x: number; y: number; w: number; h: number }[], pref: string) {
  rejilla(l, x, y, cols, filas);
  for (const b of items) pegarObjeto(l, b.it, x + b.x * CELDA_INV + 1, y + b.y * CELDA_INV + 1, b.w * CELDA_INV - 1, b.h * CELDA_INV - 1);
  for (let j = 0; j < filas; j++) for (let i = 0; i < cols; i++) zonas.push({ id: `${pref}_${i}_${j}`, tipo: 'casillero', x: x + i * CELDA_INV, y: y + j * CELDA_INV, w: CELDA_INV, h: CELDA_INV });
}

const mk = (id: string, base: LootItem['base'], es: string, en: string): LootItem => ({ id, name: { es, en }, rarity: 'normal', base, level: 1, stats: { mods: [] } });

/** Cofre: tres pestañas (personal, compartido, gemas) y rejilla de 10x10. */
export function panelCofre(idioma: Idioma = 'es'): Panel {
  const { l, zonas } = marcoPanel(ES_EN('Cofre', 'Stash', idioma));
  const tabs: [string, string][] = [['Personal', 'Personal'], ['Compartido', 'Shared'], ['Gemas', 'Gems']];
  tabs.forEach(([es, en], i) => { const x = 14 + i * 98; pestana(l, x, 36, 94, 20, idioma === 'es' ? es : en, i === 0); zonas.push({ id: `pestana_${i + 1}`, tipo: 'pestana', x, y: 36, w: 94, h: 20, es, en }); });
  const items = [
    { it: L('juramento_del_titan'), x: 0, y: 0, w: 2, h: 4 }, { it: L('bastion_del_alba'), x: 2, y: 0, w: 2, h: 3 },
    { it: rollItem(baseArmor('chest', 'placas', 3), 'rare', 9), x: 4, y: 0, w: 2, h: 3 }, { it: L('coraza_del_dragon_rojo'), x: 6, y: 0, w: 2, h: 3 },
    { it: L('lagrima_de_la_diosa'), x: 8, y: 0, w: 1, h: 1 }, { it: L('corazon_de_estrella'), x: 9, y: 0, w: 1, h: 1 },
    ...(['ruby', 'sapphire', 'emerald', 'topaz', 'amethyst', 'diamond'] as const).map((k, i) => ({ it: mk(`g${i}`, { cat: 'gem', kind: k, grade: 'perfect' }, '', ''), x: 4 + i, y: 9, w: 1, h: 1 })),
    ...[0, 1, 2, 3].map((i) => ({ it: mk(`r${i}`, { cat: 'rune', index: i * 3 }, '', ''), x: 6 + i, y: 7, w: 1, h: 1 })),
    { it: rollItem(baseWeapon('bow', 2), 'magic', 4), x: 0, y: 5, w: 2, h: 3 }, { it: L('rompecielos'), x: 2, y: 5, w: 2, h: 3 },
    { it: mk('tomo', { cat: 'consumable', icon: 'tome_portal' }, '', ''), x: 8, y: 1, w: 1, h: 2 }, { it: mk('mapa', { cat: 'consumable', icon: 'map' }, '', ''), x: 9, y: 1, w: 1, h: 1 },
  ];
  bolsaGrande(l, zonas, 15, 62, 10, 10, items, 'cofre');
  const y = 62 + 290 + 10;
  placa(l, 20, y, 150, 22); picto(l, 'oro', 26, y + 7, P.laton); texto(l, 38, y + 8, miles(84210, idioma), TXT.oro);
  botonTexto(l, 180, y, 120, 22, ES_EN('Retirar', 'Withdraw', idioma));
  zonas.push({ id: 'retirar_oro', tipo: 'boton', x: 180, y, w: 120, h: 22, es: 'Retirar', en: 'Withdraw' });
  texto(l, 160, y + 34, ES_EN('Lo que guardes aquí espera por ti', 'What you keep here waits for you', idioma), P.laton[4], { alin: 'centro', sombra: P.piedra[0] });
  return { img: l.r, zonas };
}

/** Mercader: pestañas armadura, armas, magia y varios; rejilla 10x10; comprar, vender, reparar. */
export function panelMercader(idioma: Idioma = 'es', o: { pestana?: number } = {}): Panel {
  const { l, zonas } = marcoPanel(ES_EN('Herrera Ilda', 'Ilda the Smith', idioma));
  const tabs: [string, string][] = [['Armadura', 'Armor'], ['Armas', 'Weapons'], ['Magia', 'Magic'], ['Varios', 'Misc']];
  const pi = o.pestana ?? 1;
  tabs.forEach(([es, en], i) => { const x = 14 + i * 73; pestana(l, x, 36, 71, 20, idioma === 'es' ? es : en, i === pi); zonas.push({ id: `pestana_${['armadura', 'armas', 'magia', 'varios'][i]}`, tipo: 'pestana', x, y: 36, w: 71, h: 20, es, en }); });
  const W = (icon: Parameters<typeof baseWeapon>[0], g: 1 | 2 | 3, x: number, y: number, w: number, h: number, rare?: 'magic' | 'rare') => ({ it: rare ? rollItem(baseWeapon(icon, g), rare, x * 7 + y) : baseWeapon(icon, g), x, y, w, h });
  const items = [
    W('sword', 1, 0, 0, 1, 3), W('scimitar', 2, 1, 0, 1, 3, 'magic'), W('axe', 1, 2, 0, 2, 3), W('mace', 2, 4, 0, 1, 3), W('warhammer', 1, 5, 0, 2, 3, 'magic'),
    W('dagger', 1, 7, 0, 1, 2), W('wand', 2, 8, 0, 1, 2, 'magic'), W('claw', 1, 9, 0, 1, 2),
    W('greatsword', 2, 0, 3, 2, 4), W('greataxe', 1, 2, 3, 2, 4), W('halberd', 1, 4, 3, 2, 4, 'magic'), W('staff', 2, 6, 3, 1, 4),
    W('bow', 1, 7, 2, 2, 3), W('crossbow', 2, 7, 5, 2, 3, 'magic'), W('javelin', 1, 9, 2, 1, 4), W('spear', 1, 0, 7, 2, 3), W('scythe', 2, 2, 7, 2, 3),
    W('flail', 1, 4, 7, 2, 3), W('morning_star', 2, 6, 7, 2, 3, 'magic'), W('hatchet', 1, 9, 6, 1, 2),
  ];
  bolsaGrande(l, zonas, 15, 62, 10, 10, items, 'mercader');
  const y = 362;
  const bots: [string, string, string][] = [['comprar', 'Comprar', 'Buy'], ['vender', 'Vender', 'Sell'], ['reparar', 'Reparar', 'Repair'], ['reparar_todo', 'Rep. todo', 'Repair all']];
  bots.forEach(([id, es, en], i) => { const x = 16 + i * 73; botonTexto(l, x, y, 69, 22, idioma === 'es' ? es : en, i === 0 ? 'presionado' : 'normal'); zonas.push({ id, tipo: 'boton', x, y, w: 69, h: 22, es, en }); });
  placa(l, 160, y + 28, 144, 22); picto(l, 'oro', 166, y + 35, P.laton); texto(l, 298, y + 36, miles(12450, idioma), TXT.oro, { alin: 'der' });
  texto(l, 20, y + 36, ES_EN('Tu oro', 'Your gold', idioma), TXT.tenue);
  return { img: l.r, zonas };
}

// ------------------------------------------------------------------------------------------------ misiones y portales

const CAPITULOS = ['I', 'II', 'III', 'IV'];
function pestanasCapitulo(l: Lienzo, zonas: Zona[], activa: number, idioma: Idioma) {
  CAPITULOS.forEach((c, i) => { const x = 14 + i * 73; pestana(l, x, 36, 71, 20, `${ES_EN('Cap.', 'Ch.', idioma)} ${c}`, i === activa); zonas.push({ id: `capitulo_${i + 1}`, tipo: 'pestana', x, y: 36, w: 71, h: 20, es: `Capítulo ${c}`, en: `Chapter ${c}` }); });
}

/** Sello de misión: medallón de lacre con símbolo (hecha, activa o cerrada). */
function selloMision(l: Lienzo, cx: number, cy: number, estado: 'hecha' | 'activa' | 'cerrada', simbolo: number) {
  const r = estado === 'cerrada' ? P.hierro : estado === 'activa' ? P.sangre : P.laton;
  if (estado === 'activa') resplandor(l, cx, cy, 26, [255, 90, 50], 0.35);
  // borde ondulado de lacre
  for (let y = cy - 22; y <= cy + 22; y++) for (let x = cx - 22; x <= cx + 22; x++) {
    const a = Math.atan2(y - cy, x - cx), d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy), R = 19 + Math.sin(a * 9) * 1.4;
    if (d > R) continue;
    const nz = Math.sqrt(Math.max(0, 1 - (d / R) ** 2)), lu = ((x - cx) / R) * LUZ[0] + ((y - cy) / R) * LUZ[1] + nz * LUZ[2];
    let v = 0.15 + lu * 0.7;
    if (d > R - 1) v = 0.1;
    if (d > 12 && d < 13.2) v -= 0.2;
    l.px(x, y, tono(r, v, x, y));
  }
  const m = new Mascara(l.w, l.h);
  const s = simbolo % 6;
  if (s === 0) { m.linea(cx - 6, cy, cx - 2, cy + 5); m.linea(cx - 2, cy + 5, cx + 6, cy - 6); } // marca
  else if (s === 1) { m.circulo(cx, cy, 5); m.linea(cx, cy - 8, cx, cy + 8); }
  else if (s === 2) { m.linea(cx - 6, cy + 6, cx + 6, cy - 6); m.linea(cx - 6, cy - 6, cx + 6, cy + 6); }
  else if (s === 3) { m.rombo(cx, cy, 6, 8); m.set(cx, cy); }
  else if (s === 4) { m.arco(cx, cy, 6, Math.PI * 0.2, Math.PI * 1.8); m.linea(cx + 2, cy - 3, cx + 6, cy - 3); }
  else { for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k * 4 * Math.PI) / 5, b = -Math.PI / 2 + ((k + 1) * 4 * Math.PI) / 5; m.linea(cx + Math.cos(a) * 7, cy + Math.sin(a) * 7, cx + Math.cos(b) * 7, cy + Math.sin(b) * 7); } }
  grabar(l, m, 0, 0, 1.3);
  if (estado === 'cerrada') picto(l, 'candado', cx + 8, cy + 8, P.hierro);
}

export const MISIONES_DEMO: { es: string; en: string; estado: 'hecha' | 'activa' | 'cerrada' }[] = [
  { es: 'La cripta de los sauces', en: 'The Willow Crypt', estado: 'hecha' },
  { es: 'El herrero desaparecido', en: 'The Missing Smith', estado: 'hecha' },
  { es: 'Ceniza en el pozo', en: 'Ash in the Well', estado: 'activa' },
  { es: 'La campana muda', en: 'The Silent Bell', estado: 'cerrada' },
  { es: 'El vigía ciego', en: 'The Blind Watcher', estado: 'cerrada' },
  { es: 'Sangre de la casa', en: 'Blood of the House', estado: 'cerrada' },
];

/** Diario de misiones: capítulos, 6 sellos y el texto de la misión elegida. */
export function panelMisiones(idioma: Idioma = 'es', o: { elegida?: number } = {}): Panel {
  const { l, zonas } = marcoPanel(ES_EN('Misiones', 'Quests', idioma));
  pestanasCapitulo(l, zonas, 0, idioma);
  placa(l, 14, 60, 292, 154, { luz: 0.18 });
  const el = o.elegida ?? 2;
  MISIONES_DEMO.forEach((q, i) => {
    const cx = 64 + (i % 3) * 96, cy = 94 + Math.floor(i / 3) * 70;
    if (i === el) { const mm = new Mascara(PANEL.w, PANEL.h); mm.circulo(cx, cy, 24); grabar(l, mm, 0, 0, 0.1); for (let a = 0; a < Math.PI * 2; a += 0.02) l.px(cx + Math.cos(a) * 25, cy + Math.sin(a) * 25, P.laton[6], 0.8); }
    selloMision(l, cx, cy, q.estado, i);
    zonas.push({ id: `mision_${i + 1}`, tipo: 'mision', x: cx - 24, y: cy - 24, w: 48, h: 48, es: q.es, en: q.en });
  });
  // pergamino con el texto
  const px = 14, py = 220, pw = 292, ph = 196;
  for (let y = py; y < py + ph; y++) for (let x = px; x < px + pw; x++) {
    const v = 0.55 + (fbm(x / 9, y / 7, 31) - 0.5) * 0.35 + (hash(x, y, 2) - 0.5) * 0.06 - Math.max(0, 1 - Math.min(x - px, px + pw - 1 - x, y - py, py + ph - 1 - y) / 10) * 0.35;
    l.px(x, y, tono(P.pergamino, v, x, y));
  }
  bisel(l, px - 2, py - 2, pw + 4, ph + 4, P.hierro, 3);
  const q = MISIONES_DEMO[el];
  const tinta = hx('#2a1a10'), tintaRoja = hx('#6a1810');
  texto(l, px + pw / 2, py + 12, q[idioma], tintaRoja, { alin: 'centro', sombra: null, negrita: true });
  for (let x = px + 40; x < px + pw - 40; x++) l.px(x, py + 24, tinta, 0.4);
  const cuerpo = idioma === 'es'
    ? 'El pozo de la aldea escupe ceniza desde que se apagó la fragua de la casa. Los aldeanos dicen que algo respira allá abajo. Baja por el pozo, encuentra la brasa que lo alimenta y apágala.\n\nRecompensa: un punto de habilidad.'
    : 'The village well has been coughing ash since the house forge went cold. The villagers say something breathes down there. Climb into the well, find the ember that feeds it and put it out.\n\nReward: one skill point.';
  envolver(cuerpo, pw - 28).forEach((ln, i) => texto(l, px + 14, py + 34 + i * 12, ln, tinta, { sombra: null }));
  texto(l, px + pw - 14, py + ph - 14, ES_EN('Activa', 'Active', idioma), tintaRoja, { alin: 'der', sombra: null });
  return { img: l.r, zonas };
}

export const PORTALES_DEMO: { es: string; en: string; visitado: boolean }[] = [
  { es: 'Aldea del Cuervo', en: 'Raven Village', visitado: true }, { es: 'Cementerio de Sauces', en: 'Willow Cemetery', visitado: true },
  { es: 'Bosque de Ceniza', en: 'Ashen Wood', visitado: true }, { es: 'Cripta Olvidada', en: 'Forgotten Crypt', visitado: true },
  { es: 'Torre del Vigía', en: "Watcher's Tower", visitado: false }, { es: 'Minas de Hierro Negro', en: 'Blackiron Mines', visitado: true },
  { es: 'Pantano de las Brujas', en: 'Witchmire', visitado: false }, { es: 'Catedral Hundida', en: 'Sunken Cathedral', visitado: false },
  { es: 'Puerta del Abismo', en: 'Abyss Gate', visitado: false },
];

/** Lista de portales para viajar: capítulos y una fila por lugar (visitado, sin visitar, elegido). */
export function panelPortales(idioma: Idioma = 'es', o: { elegido?: number } = {}): Panel {
  const { l, zonas } = marcoPanel(ES_EN('Portales', 'Waypoints', idioma));
  pestanasCapitulo(l, zonas, 0, idioma);
  placa(l, 14, 60, 292, 330, { luz: 0.16 });
  const el = o.elegido ?? 3;
  PORTALES_DEMO.forEach((p, i) => {
    const y = 66 + i * 35, x = 20, w = 280, h = 31;
    if (i === el) { laton(l, x, y, w, h, { luz: 0.25 }); bisel(l, x, y, w, h, P.laton, 2); }
    else { piedra(l, x, y, w, h, { luz: 0.24, grietas: 0, semilla: i }); bisel(l, x, y, w, h, P.hierro, 2); }
    // runa del portal
    const cx = x + 18, cy = y + 15;
    for (let yy = cy - 11; yy <= cy + 11; yy++) for (let xx = cx - 11; xx <= cx + 11; xx++) {
      const d = Math.hypot(xx + 0.5 - cx, yy + 0.5 - cy);
      if (d < 10) l.px(xx, yy, p.visitado ? tono(P.mana, 0.25 + (1 - d / 10) * 0.6 + (Math.sin(Math.atan2(yy - cy, xx - cx) * 3 + d * 0.6) * 0.12), xx, yy) : tono(P.piedra, 0.15, xx, yy));
      else if (d < 11.2) l.px(xx, yy, P.hierro[p.visitado ? 6 : 3]);
    }
    if (p.visitado) resplandor(l, cx, cy, 9, [140, 170, 255], 0.35);
    texto(l, x + 36, y + 12, p[idioma], i === el ? hx('#fff2c8') : p.visitado ? TXT.claro : TXT.tenue);
    if (!p.visitado) picto(l, 'candado', x + w - 18, y + 11, P.hierro);
    zonas.push({ id: `portal_${i + 1}`, tipo: 'fila', x, y, w, h, es: p.es, en: p.en });
  });
  botonTexto(l, 90, 396, 140, 24, ES_EN('Viajar', 'Travel', idioma), 'normal', { grande: true });
  zonas.push({ id: 'viajar', tipo: 'boton', x: 90, y: 396, w: 140, h: 24, es: 'Viajar', en: 'Travel' });
  return { img: l.r, zonas };
}

// =====================================================================================================================
// Tooltip en 9 partes con texto por rareza
// =====================================================================================================================

export interface LineaTooltip { texto: string; color: RarezaTexto | C3 }
/** Márgenes del 9-slice del tooltip: izquierda, derecha, arriba, abajo. */
export const SLICE_TOOLTIP: [number, number, number, number] = [7, 7, 7, 7];

/** Marco de tooltip de w x h: fondo negro translúcido, filete de hierro, hilo de latón y esquinas con rombo. */
export function marcoTooltip(w: number, h: number): Raster {
  const l = crearLienzo(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const e = Math.min(x, y, w - 1 - x, h - 1 - y);
    if (e === 0) { if ((x === 0 || x === w - 1) && (y === 0 || y === h - 1)) continue; l.px(x, y, P.hierro[0]); }
    else if (e === 1) l.px(x, y, y === 1 || x === 1 ? P.hierro[5] : P.hierro[3]);
    else if (e === 2) l.px(x, y, P.hierro[0]);
    else if (e === 3) l.px(x, y, P.laton[3], 0.55);
    else { const v = 6 + hash(x >> 1, y >> 1) * 4; l.px(x, y, [v, v - 1, v + 2], 0.88); }
  }
  for (const [cx, cy] of [[3, 3], [w - 4, 3], [3, h - 4], [w - 4, h - 4]]) {
    l.px(cx, cy - 1, P.laton[6]); l.px(cx - 1, cy, P.laton[5]); l.px(cx, cy, P.laton[7]); l.px(cx + 1, cy, P.laton[4]); l.px(cx, cy + 1, P.laton[3]);
  }
  return l.r;
}
/** El marco del tooltip chico para estirar en 9 partes (21x21, márgenes SLICE_TOOLTIP). */
export const marcoTooltip9 = () => marcoTooltip(21, 21);

const colorLinea = (c: RarezaTexto | C3): C3 => (typeof c === 'string' ? COLOR_RAREZA[c] : c);

/** Tooltip con sus líneas centradas (la primera es el nombre). */
export function tooltip(lineas: LineaTooltip[]): Raster {
  const w = Math.max(80, ...lineas.map((ln) => anchoTexto(ln.texto))) + 22, h = lineas.length * 11 + 14;
  const r = marcoTooltip(w, h), l = Lienzo.de(r);
  lineas.forEach((ln, i) => texto(l, Math.floor(w / 2), 8 + i * 11, ln.texto, colorLinea(ln.color), { alin: 'centro' }));
  return r;
}

/** Líneas de tooltip de un objeto del motor de botín. */
export function lineasObjeto(it: LootItem, idioma: Idioma = 'es', o: { rareza?: RarezaTexto; engarces?: number } = {}): LineaTooltip[] {
  const rz = o.rareza ?? RAREZA_DE[it.rarity];
  const out: LineaTooltip[] = [{ texto: it.name[idioma], color: rz }];
  const st = it.stats;
  if (st.damage) out.push({ texto: `${ES_EN(it.twoHanded ? 'Daño a dos manos' : 'Daño a una mano', it.twoHanded ? 'Two-hand damage' : 'One-hand damage', idioma)}: ${st.damage[0]} ${ES_EN('a', 'to', idioma)} ${st.damage[1]}`, color: 'normal' });
  if (st.defense) out.push({ texto: `${ES_EN('Defensa', 'Defense', idioma)}: ${st.defense}`, color: 'normal' });
  if (st.block) out.push({ texto: `${ES_EN('Prob. de bloqueo', 'Chance to block', idioma)}: ${st.block}%`, color: 'normal' });
  out.push({ texto: `${ES_EN('Nivel requerido', 'Required level', idioma)}: ${it.level}`, color: 'normal' });
  for (const m of st.mods) out.push({ texto: modText(m, idioma), color: rz === 'artesanal' ? 'magico' : rz === 'normal' || rz === 'engarzado' ? 'magico' : rz === 'set' ? 'magico' : 'magico' });
  if (o.engarces) out.push({ texto: `${ES_EN('Engarzado', 'Socketed', idioma)} (${o.engarces})`, color: 'magico' });
  if (it.set) {
    out.push({ texto: '', color: 'normal' });
    out.push({ texto: SET_NAME[idioma], color: 'unico' });
    for (const b of SET_BONUS.slice(0, 2)) out.push({ texto: `(${b.pieces}) ${b.mods.map((m) => modText(m, idioma)).join(', ')}`, color: 'set' });
  }
  if (it.flavor) out.push({ texto: it.flavor[idioma], color: TXT.tenue });
  return out;
}

/** Tooltips de muestra, uno por color de rareza: normal, mágico, raro, set, único, artesanal y engarzado. */
export function tooltipsDeMuestra(idioma: Idioma = 'es'): { rareza: RarezaTexto; img: Raster }[] {
  const artesanal: LootItem = { ...baseArmor('gloves', 'placas', 3), name: { es: 'Puños de la Fragua', en: 'Forgefists' }, stats: { defense: 38, mods: [{ stat: 'fireDmg', value: 12 }, { stat: 'atkSpeed', value: 10 }, { stat: 'lifeSteal', value: 3 }, { stat: 'str', value: 8 }] } };
  const engarzado: LootItem = { ...baseOffhand('shield_kite', 2), name: { es: 'Escudo de cometa reforzado', en: 'Reinforced Kite Shield' } };
  const lista: [RarezaTexto, LootItem, { engarces?: number }][] = [
    ['normal', baseWeapon('mace', 1), {}],
    ['magico', rollItem(baseWeapon('sword', 2), 'magic', 21), {}],
    ['raro', rollItem(baseArmor('helm', 'malla', 3), 'rare', 8), {}],
    ['set', L('juramento_de_rick'), {}],
    ['unico', L('colmillo_de_ceniza'), {}],
    ['artesanal', artesanal, {}],
    ['engarzado', engarzado, { engarces: 3 }],
  ];
  return lista.map(([rz, it, ex]) => ({ rareza: rz, img: tooltip(lineasObjeto(it, idioma, { rareza: rz, ...ex })) }));
}

// =====================================================================================================================
// Cursores (32x32, con su punto activo)
// =====================================================================================================================

export interface Cursor { id: string; img: Raster; ancla: [number, number] }

function capsula(m: Mascara, x0: number, y0: number, x1: number, y1: number, r: number) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) + 1;
  for (let i = 0; i <= n; i++) m.disco(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, r);
}

function guantelete(l: Lienzo, cerrado: boolean) {
  const acero = rampa('#101218', '#262a32', '#40454f', '#5e646e', '#80868f', '#a6abb2', '#cdd1d6', '#f0f2f4');
  const m = new Mascara(32, 32), puno = new Mascara(32, 32), dedo = new Mascara(32, 32);
  // dorso de la mano (placa) y nudillos
  l.cadaEnPoligono([[8, 11], [15, 7], [22, 12], [21, 20], [14, 23], [8, 18]], (x, y) => m.set(x, y));
  if (cerrado) { for (const [x, y] of [[7, 10], [10, 7.5], [13.5, 6], [17, 6.5]]) m.disco(x, y, 2.7); }
  else { capsula(dedo, 2.2, 2.2, 10.5, 12, 2.6); for (const [x, y] of [[14, 7.5], [17.5, 8], [20.5, 10.5]]) m.disco(x, y, 2.5); }
  capsula(m, 9, 17, 5.5, 21, 2.2);
  l.cadaEnPoligono([[15, 21], [22, 16], [27, 22], [20, 27]], (x, y) => puno.set(x, y));
  forma(l, 0, 0, 31, 31, (x, y) => puno.en(x, y), (x, y) => tono(P.cuero, 0.6 + (hash(x, y) - 0.5) * 0.2, x, y), P.laton, 2);
  forma(l, 0, 0, 31, 31, (x, y) => m.en(x, y), (x, y) => tono(acero, 0.66 - (x + y - 18) / 46 + (hash(x, y) - 0.5) * 0.06, x, y), acero, 2);
  if (!cerrado) forma(l, 0, 0, 31, 31, (x, y) => dedo.en(x, y), (x, y) => tono(acero, 0.78 - (x + y) / 60, x, y), acero, 2);
  // placas: juntas del dedo y del dorso
  if (!cerrado) for (const t of [0.38, 0.7]) { const cx = 2.2 + 8.3 * t, cy = 2.2 + 9.8 * t; l.linea(cx - 2.2, cy + 1.6, cx + 1.6, cy - 2.2, acero[1]); l.linea(cx - 1.6, cy + 2.2, cx + 2.2, cy - 1.6, acero[6]); }
  for (const [y0, y1] of [[13, 11], [17, 16]]) { l.linea(10, y0, 20, y1, acero[1]); l.linea(10, y0 + 1, 20, y1 + 1, acero[6]); }
  remache(l, 15, 19.5, 1, P.laton); remache(l, 21.5, 21.5, 1, P.laton);
  if (!cerrado) { l.px(1, 1, acero[7]); l.px(2, 1, acero[6]); l.px(1, 2, acero[6]); }
}

/** Los cinco cursores: guantelete que señala, agarrar, atacar, hablar y no se puede. */
export function cursores(): Cursor[] {
  const out: Cursor[] = [];
  { const l = crearLienzo(32, 32); guantelete(l, false); out.push({ id: 'senalar', img: l.r, ancla: [1, 1] }); }
  { const l = crearLienzo(32, 32); guantelete(l, true); out.push({ id: 'agarrar', img: l.r, ancla: [10, 8] }); }
  {
    const l = crearLienzo(32, 32);
    trazo(l, 2, 2, 19, 19, 4, rampa('#1a1c22', '#3a3e48', '#6a707c', '#9aa0aa', '#cfd4dc', '#ffffff'), { g1: 4 });
    l.linea(3, 3, 17, 17, P.hierro[8]);
    trazo(l, 14, 23, 23, 14, 3, P.laton);
    trazo(l, 19, 19, 26, 26, 3, P.cuero);
    bola(l, 27, 27, 2.6, P.laton);
    l.px(1, 1, P.hierro[8]); l.px(2, 1, P.hierro[2]); l.px(1, 2, P.hierro[2]);
    out.push({ id: 'atacar', img: l.r, ancla: [1, 1] });
  }
  {
    const l = crearLienzo(32, 32);
    const m = new Mascara(32, 32);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (Math.hypot((x + 0.5 - 19) / 12, (y + 0.5 - 12) / 9) <= 1) m.set(x, y);
    l.cadaEnPoligono([[11, 17], [8, 26], [17, 19]], (x, y) => m.set(x, y));
    forma(l, 0, 0, 31, 31, (x, y) => m.en(x, y), (x, y) => tono(P.pergamino, 0.85 - (y - 4) / 40 + (hash(x, y) - 0.5) * 0.08, x, y), P.cuero, 2);
    for (const x of [14, 19, 24]) { l.px(x, 12, P.cuero[1]); l.px(x + 1, 12, P.cuero[2]); l.px(x, 13, P.cuero[2]); l.px(x + 1, 13, P.cuero[3]); }
    const f = new Mascara(32, 32); l.cadaEnPoligono([[0, 0], [0, 10], [3, 7], [6, 12], [8, 11], [5, 6], [9, 6]], (x, y) => f.set(x, y));
    forma(l, 0, 0, 31, 31, (x, y) => f.en(x, y), () => P.laton[6], P.laton, 1);
    out.push({ id: 'hablar', img: l.r, ancla: [0, 0] });
  }
  {
    const l = crearLienzo(32, 32);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const dx = x + 0.5 - 16, dy = y + 0.5 - 16, d = Math.hypot(dx, dy);
      const barra = Math.abs((dx - dy) / Math.SQRT2) < 2.6 && d < 11;
      if (d > 12.5) continue;
      if (d > 11.5) l.px(x, y, P.hierro[0]);
      else if (d > 8.5 || barra) { const lu = -(dx * LUZ[0] + dy * LUZ[1]) / d; l.px(x, y, tono(P.sangre, barra ? 0.6 : 0.5 + (d > 10 ? -lu : lu) * 0.3, x, y)); }
      else if (d > 7.5) l.px(x, y, P.sangre[0]);
    }
    out.push({ id: 'no_se_puede', img: l.r, ancla: [16, 16] });
  }
  return out;
}

// =====================================================================================================================
// Minimapa y brújula
// =====================================================================================================================

/** Marco del minimapa (192x144, centro transparente) con placa del nombre de la zona. */
export function marcoMinimapa(nombre = 'Bosque de Ceniza'): Raster {
  const W = 192, Hh = 144, l = crearLienzo(W, Hh);
  for (const [x, y, w, h, v] of [[0, 0, W, 7, false], [0, Hh - 7, W, 7, false], [0, 0, 7, Hh, true], [W - 7, 0, 7, Hh, true]] as [number, number, number, number, boolean][]) hierro(l, x, y, w, h, { semilla: x * 3 + y, vertical: v, luz: 0.48 });
  bisel(l, 0, 0, W, Hh, P.hierro, 3);
  for (let i = 6; i < W - 6; i++) { l.px(i, 6, P.hierro[0]); l.px(i, Hh - 7, P.hierro[6], 0.4); }
  for (let j = 6; j < Hh - 6; j++) { l.px(6, j, P.hierro[0]); l.px(W - 7, j, P.hierro[6], 0.4); }
  for (let x = 24; x < W - 10; x += 36) { remache(l, x, 3, 1.2); remache(l, x, Hh - 4, 1.2); }
  esquinero(l, 0, 0, 1, 1); esquinero(l, W, 0, -1, 1); esquinero(l, 0, Hh, 1, -1); esquinero(l, W, Hh, -1, -1);
  const tw = anchoTexto(nombre) + 20, tx = Math.round((W - tw) / 2);
  hierro(l, tx, Hh - 14, tw, 16, { luz: 0.4 }); bisel(l, tx, Hh - 14, tw, 14, P.laton, 2);
  texto(l, W / 2, Hh - 10, nombre, TXT.oro, { alin: 'centro' });
  return l.r;
}

/** Brújula de esquina (56x56): disco de hierro, rosa de latón con el norte en rojo apuntando arriba a la derecha (isométrico). */
export function brujula(): Raster {
  const S = 56, l = crearLienzo(S, S), c = 28;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x + 0.5 - c, dy = y + 0.5 - c, d = Math.hypot(dx, dy);
    if (d > 27) continue;
    if (d > 26) l.px(x, y, P.hierro[0]);
    else if (d > 21) { const nr = (d - 23.5) / 2.5, lu = -((dx / d) * LUZ[0] + (dy / d) * LUZ[1]) * nr; l.px(x, y, tono(P.hierro, 0.45 + lu * 0.4, x, y)); }
    else if (d > 20) l.px(x, y, P.hierro[0]);
    else l.px(x, y, tono(P.piedra, 0.2 + (1 - d / 20) * 0.15, x, y));
  }
  for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; l.px(c + Math.cos(a) * 23.5, c + Math.sin(a) * 23.5, P.laton[k % 4 === 0 ? 7 : 4]); }
  const g = new Mascara(S, S); g.circulo(c, c, 13); grabar(l, g, 0, 0, 0.8);
  const rot = -Math.PI / 4 + Math.atan2(-0.5, 1) + Math.PI / 4; // norte hacia arriba a la derecha, siguiendo el piso 2:1
  for (let k = 0; k < 4; k++) {
    const a = rot - Math.PI / 2 + (k * Math.PI) / 2;
    const tip: [number, number] = [c + Math.cos(a) * 19, c + Math.sin(a) * 19];
    const s1: [number, number] = [c + Math.cos(a + Math.PI / 2) * 4, c + Math.sin(a + Math.PI / 2) * 4];
    const s2: [number, number] = [c + Math.cos(a - Math.PI / 2) * 4, c + Math.sin(a - Math.PI / 2) * 4];
    const r = k === 0 ? P.sangre : P.laton;
    l.poligono([[c, c], tip, s1], r[k === 0 ? 7 : 7]); l.poligono([[c, c], tip, s2], r[k === 0 ? 3 : 3]);
  }
  for (let k = 0; k < 4; k++) {
    const a = rot - Math.PI / 4 + (k * Math.PI) / 2;
    l.poligono([[c, c], [c + Math.cos(a) * 11, c + Math.sin(a) * 11], [c + Math.cos(a + 0.5) * 3, c + Math.sin(a + 0.5) * 3]], P.hierro[6]);
    l.poligono([[c, c], [c + Math.cos(a) * 11, c + Math.sin(a) * 11], [c + Math.cos(a - 0.5) * 3, c + Math.sin(a - 0.5) * 3]], P.hierro[3]);
  }
  remache(l, c, c, 2, P.laton);
  const na = rot - Math.PI / 2;
  texto(l, c + Math.cos(na) * 24, c + Math.sin(na) * 24 - 3, 'N', hx('#ff6050'), { alin: 'centro' });
  return l.r;
}

// =====================================================================================================================
// Barra del jefe, placas de nombre y números de daño
// =====================================================================================================================

/** Barra de vida del jefe (420x52) con placa del nombre, remates de hierro y el daño reciente. */
export function barraJefe(nombre: string, vida = 0.64, o: { titulo?: string; reciente?: number } = {}): Raster {
  const W = 420, Hh = 52, l = crearLienzo(W, Hh);
  // placa del nombre
  const tw = Math.max(160, anchoTexto(nombre, true) + 56), tx = Math.round((W - tw) / 2);
  hierro(l, tx, 0, tw, 22, { luz: 0.4, semilla: 8 }); bisel(l, tx, 0, tw, 22, P.laton, 2);
  arte(l, CALAVERA, tx + 6, 4, P.hueso); arte(l, CALAVERA, tx + tw - 18, 4, P.hueso);
  textoTitulo(l, W / 2, 7, nombre, P.sangre.slice(2), { alin: 'centro' });
  // barra con remates en punta
  const by = 26, bh = 12;
  const rem = (x: number, f: 1 | -1) => {
    const m = new Mascara(W, Hh);
    l.cadaEnPoligono([[x, by - 4], [x + f * 18, by - 2], [x + f * 18, by + bh + 2], [x, by + bh + 4], [x - f * 8, by + bh / 2]], (a, b) => m.set(a, b));
    forma(l, 0, 0, W - 1, Hh - 1, (a, b) => m.en(a, b), (a, b) => tono(P.hierro, 0.5 + (hash(a, b) - 0.5) * 0.1, a, b), P.hierro, 2);
    remache(l, x + f * 8, by + bh / 2, 1.5);
  };
  barraValor(l, 28, by, W - 56, bh, vida, P.sangre, { borde: P.laton, resto: o.reciente ?? Math.min(1, vida + 0.08), marcas: 4 });
  rem(9, 1); rem(W - 10, -1);
  if (o.titulo) texto(l, W / 2, by + bh + 4, o.titulo, TXT.tenue, { alin: 'centro' });
  return l.r;
}

export type ClaseMonstruo = 'normal' | 'campeon' | 'unico';
/** Placa con el nombre del monstruo y su vida (160x24): blanco normal, azul campeón, dorado único. */
export function placaMonstruo(nombre: string, clase: ClaseMonstruo = 'normal', vida = 0.7): Raster {
  const W = 160, Hh = 24, l = crearLienzo(W, Hh);
  const col = clase === 'normal' ? COLOR_RAREZA.normal : clase === 'campeon' ? COLOR_RAREZA.magico : COLOR_RAREZA.unico;
  const tw = Math.min(W, anchoTexto(nombre) + 20), tx = Math.round((W - tw) / 2);
  for (let y = 0; y < 14; y++) for (let x = tx; x < tx + tw; x++) {
    const e = Math.min(x - tx, tx + tw - 1 - x);
    l.px(x, y, [8, 6, 10], 0.78 * Math.min(1, e / 6));
  }
  if (clase !== 'normal') {
    const r = clase === 'campeon' ? P.mana : P.laton;
    for (const fx of [tx + 2, tx + tw - 3]) { l.px(fx, 3, r[7]); l.px(fx, 4, r[5]); l.px(fx - 1, 4, r[5]); l.px(fx + 1, 4, r[5]); l.px(fx, 5, r[3]); }
    for (let x = tx + 6; x < tx + tw - 6; x++) l.px(x, 0, r[4], 0.6);
  }
  texto(l, W / 2, 4, nombre, col, { alin: 'centro' });
  const bw = 100, bx = Math.round((W - bw) / 2);
  l.rect(bx - 1, 16, bw + 2, 6, P.hierro[0]);
  for (let i = 0; i < bw; i++) for (let j = 0; j < 4; j++) l.px(bx + i, 17 + j, i < bw * vida ? P.sangre[j === 0 ? 7 : 5 - j] : P.piedra[2]);
  return l.r;
}

/** Muestras de números de daño: normal, crítico, fuego, frío, rayo, veneno, curación, maná, fallo y bloqueo. */
export function muestrasDanio(idioma: Idioma = 'es'): Raster {
  const W = 360, Hh = 92, l = crearLienzo(W, Hh);
  const m: [string, Rampa, number, number, number][] = [
    ['128', P.hueso.slice(3), 1, 8, 6], ['412!', P.fuego.slice(4), 2, 52, 2], ['37', P.fuego.slice(2), 1, 150, 8],
    ['22', P.hielo.slice(3), 1, 186, 8], ['64', P.xp.slice(3), 1, 220, 8], ['15', P.veneno.slice(3), 1, 256, 8],
    ['+120', P.veneno.slice(2), 1, 8, 50], ['+45', P.mana.slice(3), 1, 70, 50], [ES_EN('Fallo', 'Miss', idioma), P.hierro.slice(3), 1, 130, 50],
    [ES_EN('Bloqueo', 'Blocked', idioma), P.laton.slice(2), 1, 200, 50], ['1.204', P.sangre.slice(4), 2, 236, 66],
  ];
  for (const [s, r, k, x, y] of m) textoTitulo(l, x, y, s, r, { escala: k });
  return l.r;
}

// =====================================================================================================================
// Cuadro de diálogo, botones de menú, pantalla de carga, cartel de muerte y subir de nivel
// =====================================================================================================================

/** Retrato de muestra: herrera con capucha a contraluz de la fragua (88x104). */
function retrato(w = 88, h = 104): Raster {
  const l = crearLienzo(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = Math.hypot((x - w * 0.7) / w, (y - h * 0.75) / h);
    l.px(x, y, tono(P.fuego, 0.42 - d * 0.55 + (fbm(x / 8, y / 8, 4) - 0.5) * 0.08, x, y));
  }
  const m = new Mascara(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const cab = Math.hypot((x - w * 0.45) / 22, (y - 40) / 27) <= 1;
    const hombros = y > 62 && Math.abs(x - w * 0.45) < 18 + (y - 62) * 1.1;
    if (cab || hombros) m.set(x, y);
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!m.en(x, y)) continue;
    const borde = !m.en(x + 2, y) || !m.en(x + 1, y - 1);
    l.px(x, y, borde ? P.fuego[5] : tono(P.cuero, 0.18 + (hash(x, y) - 0.5) * 0.05 + (x / w) * 0.15, x, y));
  }
  // rostro en sombra bajo la capucha y ojos con brillo
  for (let y = 34; y < 58; y++) for (let x = 26; x < 54; x++) if (Math.hypot((x - 41) / 11, (y - 47) / 13) < 1) l.px(x, y, tono(P.sangre, 0.12 + (x - 26) / 120, x, y));
  for (const ex of [36, 46]) { l.px(ex, 45, P.fuego[7]); l.px(ex + 1, 45, P.fuego[5]); }
  // martillo al hombro
  trazo(l, 64, 100, 76, 58, 3, P.cuero);
  l.rect(68, 48, 16, 10, P.hierro[5]); bisel(l, 68, 48, 16, 10, P.hierro, 2);
  return l.r;
}

/** Cuadro de diálogo (520x150) con marco de retrato, nombre, texto envuelto, dos respuestas y botón de seguir. */
export function cuadroDialogo(idioma: Idioma = 'es'): Panel {
  const W = 520, Hh = 150, l = crearLienzo(W, Hh);
  piedra(l, 0, 0, W, Hh, { semilla: 5, luz: 0.28 });
  bisel(l, 0, 0, W, Hh, P.hierro, 4);
  sombraInterna(l, 4, 4, W - 8, Hh - 8, 4, 0.4);
  esquinero(l, 0, 0, 1, 1); esquinero(l, W, 0, -1, 1); esquinero(l, 0, Hh, 1, -1); esquinero(l, W, Hh, -1, -1);
  // retrato
  laton(l, 14, 14, 100, 122); bisel(l, 14, 14, 100, 122, P.laton, 3);
  l.pegar(retrato(), 20, 20); bisel(l, 19, 19, 90, 112, P.hierro, 1, { hundido: true });
  sombraInterna(l, 20, 20, 88, 104, 4, 0.4);
  remache(l, 18, 18, 1.4); remache(l, 109, 18, 1.4); remache(l, 18, 131, 1.4); remache(l, 109, 131, 1.4);
  textoTitulo(l, 128, 16, ES_EN('Herrera Ilda', 'Ilda the Smith', idioma), P.laton);
  const t = idioma === 'es'
    ? 'La fragua de tu casa lleva tres noches fría, muchacho. Sin ese fuego no puedo templar ni una hebilla. ¿Vas a bajar al pozo o te quedas mirando?'
    : 'Your house forge has been cold for three nights, lad. Without that fire I cannot temper so much as a buckle. Will you climb down the well, or just stand there?';
  envolver(t, W - 150).forEach((ln, i) => texto(l, 128, 34 + i * 12, ln, TXT.claro));
  const zonas: Zona[] = [];
  const resp = idioma === 'es' ? ['Bajaré al pozo.', 'Cuéntame más de la fragua.'] : ['I will go down the well.', 'Tell me more about the forge.'];
  resp.forEach((r, i) => {
    const y = 88 + i * 14;
    l.px(131, y + 3, P.laton[7]); l.px(130, y + 3, P.laton[4]); l.px(132, y + 3, P.laton[4]); l.px(131, y + 2, P.laton[5]); l.px(131, y + 4, P.laton[3]);
    texto(l, 138, y, r, i === 0 ? hx('#fff0c0') : TXT.oro);
    zonas.push({ id: `respuesta_${i + 1}`, tipo: 'opcion', x: 126, y: y - 2, w: 260, h: 12, es: idioma === 'es' ? r : undefined, en: idioma === 'en' ? r : undefined });
  });
  botonTexto(l, W - 120, Hh - 34, 104, 22, ES_EN('Seguir', 'Continue', idioma));
  zonas.push({ id: 'seguir', tipo: 'boton', x: W - 120, y: Hh - 34, w: 104, h: 22, es: 'Seguir', en: 'Continue' });
  return { img: l.r, zonas };
}

/** Botón del menú principal (240x36) en sus estados. */
export function botonMenu(s: string, estado: EstadoBoton = 'normal', w = 240, h = 36): Raster {
  const l = crearLienzo(w + 4, h + 4);
  if (estado !== 'presionado') sombraCaida(l, 0, 0, w, h, 3, 0.6);
  const hund = estado === 'presionado';
  piedra(l, 0, 0, w, h, { luz: estado === 'encima' ? 0.5 : hund ? 0.24 : 0.36, semilla: 3, grietas: 1 });
  if (estado === 'encima') for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) l.suma(x, y, [255, 150, 60], Math.max(0, 1 - Math.hypot((x - w / 2) / (w / 2), (y - h / 2) / (h / 1.2))) * 0.18);
  bisel(l, 0, 0, w, h, P.hierro, 4, { hundido: hund });
  for (let x = 6; x < w - 6; x++) { l.px(x, 4, P.laton[hund ? 2 : 4], 0.6); l.px(x, h - 5, P.laton[hund ? 4 : 2], 0.6); }
  if (hund) sombraInterna(l, 4, 4, w - 8, h - 8, 4, 0.5);
  remache(l, 9, h / 2 - 0.5, 1.6); remache(l, w - 10, h / 2 - 0.5, 1.6);
  const d = hund ? 1 : 0;
  textoTitulo(l, w / 2 + d, Math.floor(h / 2) - 4 + d, s, estado === 'encima' ? P.laton.slice(3) : estado === 'apagado' ? P.hierro.slice(2) : P.laton.slice(1), { alin: 'centro' });
  if (estado === 'encima') { for (const fx of [26, w - 27]) { l.px(fx, h / 2 - 1, P.fuego[7]); l.px(fx - 1, h / 2 - 1, P.fuego[5]); l.px(fx + 1, h / 2 - 1, P.fuego[5]); l.px(fx, h / 2 - 2, P.fuego[5]); l.px(fx, h / 2, P.fuego[5]); } }
  return l.r;
}
export const OPCIONES_MENU = [
  { id: 'nueva_partida', es: 'Nueva partida', en: 'New game' }, { id: 'continuar', es: 'Continuar', en: 'Continue' },
  { id: 'opciones', es: 'Opciones', en: 'Options' }, { id: 'creditos', es: 'Créditos', en: 'Credits' }, { id: 'salir', es: 'Salir', en: 'Quit' },
];

/** Pantalla de carga (800x600): marco tallado, el escudo grande, el capítulo, la barra de avance y un consejo. */
export function pantallaCarga(idioma: Idioma = 'es', avance = 0.6): Raster {
  const W = 800, Hh = 600, l = crearLienzo(W, Hh);
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x - W / 2) / (W * 0.6), (y - Hh * 0.42) / (Hh * 0.6));
    l.px(x, y, tono(P.piedra, 0.34 - d * 0.32 + (fbm(x / 14, y / 10, 7) - 0.5) * 0.12, x, y));
  }
  resplandor(l, W / 2, Hh * 0.4, 220, [120, 40, 20], 0.35);
  // marco
  for (const [x, y, w, h, v] of [[0, 0, W, 12, false], [0, Hh - 12, W, 12, false], [0, 0, 12, Hh, true], [W - 12, 0, 12, Hh, true]] as [number, number, number, number, boolean][]) hierro(l, x, y, w, h, { semilla: x + y, vertical: v, luz: 0.46 });
  bisel(l, 0, 0, W, Hh, P.hierro, 4); bisel(l, 10, 10, W - 20, Hh - 20, P.hierro, 2, { hundido: true, sinContorno: true });
  for (let x = 40; x < W - 20; x += 48) { remache(l, x, 5.5, 1.6); remache(l, x, Hh - 6.5, 1.6); }
  for (let y = 40; y < Hh - 20; y += 48) { remache(l, 5.5, y, 1.6); remache(l, W - 6.5, y, 1.6); }
  esquinero(l, 0, 0, 1, 1); esquinero(l, W, 0, -1, 1); esquinero(l, 0, Hh, 1, -1); esquinero(l, W, Hh, -1, -1);
  // tracería grabada alrededor del escudo
  const m = new Mascara(W, Hh);
  m.circulo(W / 2, 220, 96); m.circulo(W / 2, 220, 102);
  for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; m.linea(W / 2 + Math.cos(a) * 102, 220 + Math.sin(a) * 102, W / 2 + Math.cos(a) * 112, 220 + Math.sin(a) * 112); }
  grabar(l, m, 0, 0, 1);
  const rel = new Mascara(W, Hh);
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; rel.disco(W / 2 + Math.cos(a) * 124, 220 + Math.sin(a) * 124, 6); }
  relieve(l, rel, 0, 0, 1);
  const esc = escudoGG(5), ex = Math.round(W / 2 - esc.w / 2), ey = Math.round(220 - esc.h / 2);
  sombraDe(l, esc, ex, ey, 5, 0.55);
  l.pegar(esc, ex, ey);
  textoTitulo(l, W / 2, 372, ES_EN('Capítulo I', 'Chapter I', idioma), P.laton, { alin: 'centro', escala: 2 });
  texto(l, W / 2, 400, ES_EN('La fragua apagada', 'The Cold Forge', idioma), TXT.claro, { alin: 'centro' });
  barraValor(l, 200, 470, 400, 10, avance, P.xp, { borde: P.laton });
  texto(l, W / 2, 490, `${ES_EN('Cargando', 'Loading', idioma)}... ${Math.round(avance * 100)}%`, TXT.tenue, { alin: 'centro' });
  const consejo = ES_EN('Consejo: las pociones del cinturón se toman con las teclas 1 a 4.', 'Tip: drink the potions on your belt with keys 1 to 4.', idioma);
  texto(l, W / 2, 540, consejo, TXT.oro, { alin: 'centro' });
  return l.r;
}

/** Cartel de muerte (520x110): banda oscura con "Has caído" o "You have fallen" y la indicación para seguir. */
export function cartelMuerte(idioma: Idioma = 'es'): Raster {
  const W = 520, Hh = 110, l = crearLienzo(W, Hh);
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const a = Math.min(1, Math.min(x, W - 1 - x) / 80) * Math.min(1, Math.min(y, Hh - 1 - y) / 24);
    l.px(x, y, [14, 2, 4], 0.85 * a);
  }
  for (let x = 40; x < W - 40; x++) { const a = Math.min(1, Math.min(x - 40, W - 41 - x) / 60); l.px(x, 18, P.sangre[4], a * 0.8); l.px(x, Hh - 19, P.sangre[4], a * 0.8); l.px(x, 19, P.sangre[1], a * 0.8); }
  textoTitulo(l, W / 2, 34, ES_EN('Has caído', 'You have fallen', idioma), P.sangre.slice(2), { alin: 'centro', escala: 3 });
  texto(l, W / 2, 76, ES_EN('Pulsa Esc para volver al pueblo', 'Press Esc to return to town', idioma), TXT.claro, { alin: 'centro' });
  return l.r;
}

/** Destello de subir de nivel (160x160, 8 cuadros): columna dorada, anillo que se abre, chispas y el texto. */
export function destelloNivel(idioma: Idioma = 'es'): { img: Raster; frames: Raster[] } {
  const S = 160, frames: Raster[] = [];
  const oro = P.sagrado;
  for (let f = 0; f < 8; f++) {
    const l = crearLienzo(S, S), t = f / 7;
    const cx = S / 2, base = 128;
    // intensidad de la luz en cada pixel; el color sale de la rampa dorada y el alfa de la intensidad
    const I = new Float32Array(S * S);
    const sube = 120 * Math.min(1, t * 2.5 + 0.12);
    for (let y = 0; y < base + 4; y++) for (let x = 0; x < S; x++) {
      if (y < base - sube) continue;
      const w = 9 + 13 * Math.sin(t * Math.PI) + (base - y) * 0.05;
      const u = Math.abs(x + 0.5 - cx) / w;
      if (u < 1) I[y * S + x] += (1 - u) ** 1.5 * Math.min(1, (base + 4 - y) / 26) * Math.min(1, (y - (base - sube)) / 30) * (1 - t * 0.55);
    }
    const rr = 10 + t * 56;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const d = Math.hypot(x + 0.5 - cx, (y + 0.5 - base) * 2);
      if (Math.abs(d - rr) < 3) I[y * S + x] += (1 - Math.abs(d - rr) / 3) * (1 - t * 0.85);
      if (d < rr) I[y * S + x] += 0.18 * (1 - d / rr) * (1 - t);
    }
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const v = clamp(I[y * S + x]);
      if (v < 0.04) continue;
      const q = Math.floor(v * 4 + bayer(x, y) * 1.0) / 4; // alfa en 4 escalones tramados, como en los 90
      if (q <= 0) continue;
      l.px(x, y, tono(oro, 0.35 + v * 0.65, x, y), clamp(q));
    }
    for (let k = 0; k < 26; k++) {
      const ph = (hash(k, 1, 3) + t) % 1;
      const x = cx + (hash(k, 2, 3) - 0.5) * 60 + Math.sin(ph * 6 + k) * 4, y = base - ph * 120;
      const c = ph < 0.5 ? oro[7] : oro[5];
      l.px(x, y, c); if (hash(k, 4, 3) < 0.4) { l.px(x + 1, y, oro[4], 0.8); l.px(x, y + 1, oro[4], 0.8); }
    }
    if (f >= 2) textoTitulo(l, cx, 22 - Math.max(0, 4 - f) * 2, ES_EN('¡Subiste de nivel!', 'Level up!', idioma), P.sagrado.slice(2), { alin: 'centro' });
    frames.push(l.r);
  }
  return { img: tira(frames), frames };
}

// =====================================================================================================================
// Pantalla de muestra, lámina con todas las piezas, hud.json y paquete .zip
// =====================================================================================================================

/** Silueta de reemplazo (héroe o monstruo) con luz de borde, alto en pixeles. */
function silueta(l: Lienzo, cx: number, pie: number, alto: number, borde: C3, ancho = 1) {
  const k = alto / 75, m = new Mascara(l.w, l.h);
  m.disco(cx, pie - 68 * k, 6 * k);
  for (let y = pie - 61 * k; y < pie - 32 * k; y++) { const w = (10 - (y - (pie - 61 * k)) / k * 0.1) * k * ancho; for (let x = -w; x <= w; x++) m.set(cx + x, y); }
  for (let i = 0; i < 32 * k; i++) { m.disco(cx - 4 * k - i * 0.08, pie - 32 * k + i, 2.6 * k); m.disco(cx + 4 * k + i * 0.08, pie - 32 * k + i, 2.6 * k); }
  for (let i = 0; i < 26 * k; i++) { m.disco(cx - 10 * k * ancho - i * 0.15, pie - 58 * k + i, 2.2 * k); m.disco(cx + 10 * k * ancho + i * 0.25, pie - 58 * k + i * 0.9, 2.2 * k); }
  // sombra en el piso (elipse 2:1)
  for (let y = pie - 6; y <= pie + 6; y++) for (let x = cx - 18 * k; x <= cx + 18 * k; x++) if (Math.hypot((x - cx) / (16 * k), (y - pie) / (6 * k)) < 1) l.mul(x, y, 0.55);
  for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) if (m.en(x, y)) l.px(x, y, !m.en(x - 1, y) || !m.en(x, y - 1) ? borde : !m.en(x + 1, y) ? mezcla(borde, [10, 8, 10], 0.6) : [14, 12, 16]);
}

/** Piso de reemplazo: rombos isométricos de piedra (160x80 por baldosa, celdas de 32x16) con luz de antorcha. */
function pisoDemo(l: Lienzo, luzX: number, luzY: number) {
  for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) {
    const u = (x / 32 + y / 16), v = (y / 16 - x / 32);
    const cu = Math.floor(u), cv = Math.floor(v), fu = u - cu, fv = v - cv;
    const junta = fu < 0.04 || fv < 0.04;
    const bu = Math.floor(u / 5), bv = Math.floor(v / 5);
    let val = 0.38 + (hash(cu, cv, 3) - 0.5) * 0.12 + (fbm(x / 30, y / 20, 2) - 0.5) * 0.25 + ((bu + bv) % 2 === 0 ? 0.03 : 0);
    if (junta) val -= 0.22;
    const d = Math.hypot((x - luzX) / 260, (y - luzY) / 160);
    const luz = clamp(1.15 - d) * 0.9 + 0.12;
    const c = tono(P.piedra, val, x, y);
    l.px(x, y, [Math.min(255, c[0] * luz * 1.35 + 10 * clamp(1 - d)), Math.min(255, c[1] * luz * 1.2 + 4 * clamp(1 - d)), c[2] * luz]);
  }
}

/** Captura de muestra de 800x600: piso oscuro, barra abajo, inventario abierto a la derecha, un tooltip y el jefe arriba. */
export function pintarPantallaDemo(w = 800, h = 600, idioma: Idioma = 'es', cuadro = 0): Raster {
  const l = crearLienzo(w, h);
  const hx0 = Math.round(w * 0.3), hy0 = Math.round(h * 0.56);
  pisoDemo(l, hx0, hy0);
  // monstruos y héroe
  silueta(l, hx0 - 110, hy0 - 50, 70, [120, 140, 255], 1.2);
  silueta(l, hx0 + 70, hy0 + 70, 60, [200, 200, 190]);
  silueta(l, hx0, hy0, 75, [255, 190, 110]);
  resplandor(l, hx0 + 12, hy0 - 52, 34, [255, 140, 50], 0.3);
  const pl = placaMonstruo(ES_EN('Necrófago Feroz', 'Savage Ghoul', idioma), 'campeon', 0.45);
  l.pegar(pl, hx0 - 110 - pl.w / 2, hy0 - 50 - 100);
  const pl2 = placaMonstruo(ES_EN('Necrófago', 'Ghoul', idioma), 'normal', 0.8);
  l.pegar(pl2, hx0 + 70 - pl2.w / 2, hy0 + 70 - 88);
  textoTitulo(l, hx0 - 96, hy0 - 128, '128', P.hueso.slice(3));
  textoTitulo(l, hx0 - 140, hy0 - 112, '412!', P.fuego.slice(4), { escala: 2 });
  // jefe arriba
  const jb = barraJefe(ES_EN('Señor de las Cenizas', 'Lord of Ashes', idioma), 0.64, { titulo: ES_EN('Jefe del capítulo I', 'Chapter I boss', idioma) });
  l.pegar(jb, Math.round(w / 2 - jb.w / 2), 2);
  // inventario a la derecha
  const inv = panelInventario(idioma);
  const px = w - PANEL.w, py = PANEL.y;
  l.pegar(inv.img, px, py);
  // casillero del arma resaltado y su tooltip
  const arma = EQUIPO.find((e) => e.id === 'arma')!;
  for (let i = 0; i < arma.w; i++) for (let j = 0; j < arma.h; j++) { const e = Math.min(i, j, arma.w - 1 - i, arma.h - 1 - j); if (e < 2) l.px(px + arma.x + i, py + arma.y + j, P.laton[7], e === 0 ? 0.9 : 0.4); }
  const tt = tooltip(lineasObjeto(L('filo_del_alba'), idioma));
  l.pegar(tt, Math.max(4, px + arma.x - tt.w - 6), py + arma.y);
  // barra de abajo
  l.pegar(barraInferior({ idioma, cuadro, vida: 0.58, mana: 0.82, encima: 'boton_inventario' }), 0, h - BARRA.h);
  // cursor sobre el arma
  const cur = cursores()[0];
  l.pegar(cur.img, px + arma.x + 30 - cur.ancla[0], py + arma.y + 60 - cur.ancla[1]);
  return l.r;
}

/** Zonas de clic de toda la interfaz en coordenadas de la pantalla de 800x600 (lo que va en hud.json). */
export function hudJson(): Record<string, unknown> {
  const abs = (zs: Zona[], ox: number, oy: number) => zs.map((z) => ({ ...z, x: z.x + ox, y: z.y + oy }));
  const lados: Record<string, 'izq' | 'der'> = { inventario: 'der', habilidades: 'der', personaje: 'izq', cofre: 'izq', mercader: 'izq', misiones: 'izq', portales: 'izq' };
  const paneles: Record<string, unknown> = {};
  for (const [id, p] of Object.entries(PANELES)) {
    const x = lados[id] === 'der' ? PANEL.xDer : PANEL.xIzq;
    paneles[id] = { lado: lados[id], x, y: PANEL.y, w: PANEL.w, h: PANEL.h, archivo: { es: `paneles/${id}_es.png`, en: `paneles/${id}_en.png` }, zonas: abs(p('es').zonas, x, PANEL.y) };
  }
  const dlg = cuadroDialogo('es');
  return {
    formato: 'pixelforja-gotico-hud', version: 1,
    pantalla: PANTALLA,
    leeme: 'x, y, w, h en pixeles de la pantalla de 800x600. Las zonas de un mismo grupo no se pisan.',
    barra: { x: 0, y: BARRA.y, w: BARRA.w, h: BARRA.h, archivo: 'barra/barra_base.png', zonas: abs(zonasBarra(), 0, BARRA.y) },
    orbes: Object.fromEntries(TIPOS_ORBE.map((t) => {
      const c = t === 'mana' ? CENTRO_ORBE_MANA : CENTRO_ORBE_VIDA, lado = ladoOrbe();
      return [t, { centro: [c[0], c[1] + BARRA.y], radio: RADIO_ORBE, x: c[0] - lado / 2, y: c[1] + BARRA.y - lado / 2, w: lado, h: lado, cuadros: CUADROS_ORBE, cuadros_por_segundo: 10, archivos: Array.from({ length: 11 }, (_, n) => `orbes/${t}_${n * 10}.png`), nota: 'tira horizontal; elegir el archivo por el nivel redondeado a 10%' }];
    })),
    paneles,
    dialogo: { x: Math.round((800 - 520) / 2), y: BARRA.y - 150 - 8, w: 520, h: 150, zonas: abs(dlg.zonas, Math.round((800 - 520) / 2), BARRA.y - 158) },
    jefe: { x: 190, y: 2, w: 420, h: 52 },
    tooltip: { archivo: 'tooltip/marco_9.png', slice: SLICE_TOOLTIP, colores: Object.fromEntries(Object.entries(COLOR_RAREZA).map(([k, v]) => [k, `#${v.map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')}`])) },
    cursores: cursores().map((c) => ({ id: c.id, archivo: `cursores/${c.id}.png`, ancla: c.ancla })),
    habilidades: HABILIDADES.map((h) => ({ id: h.id, es: h.es, en: h.en, escuela: h.escuela, archivos: { normal: `habilidades/${h.id}.png`, encima: `habilidades/${h.id}_encima.png`, apagado: `habilidades/${h.id}_apagado.png` } })),
    textos: TEXTOS,
  };
}

/** Textos de la interfaz en los dos idiomas. */
export const TEXTOS = {
  es: { vida: 'Vida', mana: 'Maná', aguante: 'Aguante', experiencia: 'Experiencia', inventario: 'Inventario', personaje: 'Personaje', habilidades: 'Habilidades', mapa: 'Mapa', menu: 'Menú', cofre: 'Cofre', mercader: 'Mercader', misiones: 'Misiones', portales: 'Portales', caminar: 'Caminar', correr: 'Correr', cerrar: 'Cerrar', muerte: 'Has caído', subirNivel: '¡Subiste de nivel!', cargando: 'Cargando', lema: 'Forjados en la misma llama' },
  en: { vida: 'Life', mana: 'Mana', aguante: 'Stamina', experiencia: 'Experience', inventario: 'Inventory', personaje: 'Character', habilidades: 'Skills', mapa: 'Map', menu: 'Menu', cofre: 'Stash', mercader: 'Merchant', misiones: 'Quests', portales: 'Waypoints', caminar: 'Walk', correr: 'Run', cerrar: 'Close', muerte: 'You have fallen', subirNivel: 'Level up!', cargando: 'Loading', lema: 'Forged in the same flame' },
};

/** Los paneles por id. */
export const PANELES: Record<string, (idioma: Idioma) => Panel> = {
  inventario: (i) => panelInventario(i), personaje: (i) => panelPersonaje(i), habilidades: (i) => panelHabilidades(i),
  cofre: (i) => panelCofre(i), mercader: (i) => panelMercader(i), misiones: (i) => panelMisiones(i), portales: (i) => panelPortales(i),
};

/** Lámina con todas las piezas sobre fondo oscuro (para revisar el conjunto de un vistazo). */
export function laminaHud(idioma: Idioma = 'es'): Raster {
  const W = 1700, l = crearLienzo(W, 2400);
  l.rect(0, 0, W, l.h, [24, 22, 24]);
  let y = 8;
  const titulo = (s: string) => { textoTitulo(l, 10, y, s, P.laton); y += 16; };
  titulo(ES_EN('Barra de abajo', 'Bottom bar', idioma));
  l.pegar(barraInferior({ idioma, vacia: true }), 8, y); l.pegar(barraInferior({ idioma, tipoVida: 'veneno', vida: 0.4, cuadro: 2, corriendo: true }), 840, y); y += BARRA.h + 8;
  titulo(ES_EN('Orbes (4 cuadros de 8)', 'Orbs (4 of 8 frames)', idioma));
  let x = 8;
  for (const t of TIPOS_ORBE) for (let f = 0; f < 8; f += 2) { l.pegar(orbe(t, t === 'mana' ? 0.8 : 0.55, f), x, y); x += ladoOrbe() + 4; }
  y += ladoOrbe() + 8;
  titulo(ES_EN('Paneles', 'Panels', idioma));
  x = 8;
  for (const p of Object.values(PANELES)) { const im = p(idioma).img; if (x + im.w > W) { x = 8; y += PANEL.h + 8; } l.pegar(im, x, y); x += im.w + 8; }
  y += PANEL.h + 10;
  titulo(ES_EN('Habilidades: normal, encima y apagado', 'Skills: normal, hover and disabled', idioma));
  HABILIDADES.forEach((h, i) => {
    const cx = 8 + (i % 10) * 166, cy = y + Math.floor(i / 10) * 64;
    (['normal', 'encima', 'apagado'] as const).forEach((e, k) => l.pegar(iconoHabilidad(h.id, e), cx + k * 52, cy));
    texto(l, cx, cy + 50, h[idioma], TXT.tenue);
  });
  y += 3 * 64 + 6;
  titulo(ES_EN('Tooltips por rareza', 'Tooltips by rarity', idioma));
  x = 8; let alto = 0;
  for (const t of tooltipsDeMuestra(idioma)) { if (x + t.img.w > W) { x = 8; y += alto + 6; alto = 0; } l.pegar(t.img, x, y); x += t.img.w + 6; alto = Math.max(alto, t.img.h); }
  y += alto + 10;
  titulo(ES_EN('Cursores, minimapa, brújula, jefe, placas y daño', 'Cursors, minimap, compass, boss, plates and damage', idioma));
  x = 8;
  for (const c of cursores()) { l.pegar(c.img, x, y); x += 40; }
  l.pegar(marcoMinimapa(ES_EN('Bosque de Ceniza', 'Ashen Wood', idioma)), 220, y); l.pegar(brujula(), 420, y);
  l.pegar(barraJefe(ES_EN('Señor de las Cenizas', 'Lord of Ashes', idioma), 0.64, { titulo: ES_EN('Jefe del capítulo I', 'Chapter I boss', idioma) }), 490, y);
  (['normal', 'campeon', 'unico'] as ClaseMonstruo[]).forEach((c, i) => l.pegar(placaMonstruo([ES_EN('Necrófago', 'Ghoul', idioma), ES_EN('Necrófago Feroz', 'Savage Ghoul', idioma), 'Grimm'][i], c, 0.8 - i * 0.25), 8, y + 44 + i * 28));
  l.pegar(muestrasDanio(idioma), 920, y);
  l.pegar(escudoGG(1), 1300, y); l.pegar(escudoGG(2), 1340, y); l.pegar(escudoGG(3), 1410, y);
  y += 150;
  titulo(ES_EN('Diálogo, menú, muerte y nivel', 'Dialog, menu, death and level up', idioma));
  l.pegar(cuadroDialogo(idioma).img, 8, y);
  (['normal', 'encima', 'presionado'] as EstadoBoton[]).forEach((e, i) => l.pegar(botonMenu(ES_EN('Nueva partida', 'New game', idioma), e), 540, y + i * 44));
  l.pegar(cartelMuerte(idioma), 800, y);
  const dn = destelloNivel(idioma);
  dn.frames.forEach((f, i) => { if (i % 2 === 1) l.pegar(f, 1000 + (i >> 1) * 160 - 160, y + 110); });
  y += 280;
  return { w: W, h: y, data: l.r.data.slice(0, W * y * 4) };
}

const txt = (s: string) => new TextEncoder().encode(s);
const LEEME_HUD = `Interfaz del taller gótico de PixelForja (arte original: hierro forjado, piedra tallada, latón y cuero; escudo de la casa GG).

Pantalla base: 800x600. Todas las posiciones de hud.json están en pixeles de esa pantalla.
barra/: la barra de abajo vacía (para pintar encima) y de muestra.
orbes/: <tipo>_<nivel>.png, tira horizontal de 8 cuadros; tipo vida, mana, veneno (vida envenenada) o helado (vida congelada); nivel 0 a 100 de 10 en 10.
paneles/: 320x432, en español (_es) y en inglés (_en). Van a la derecha (x 480) o a la izquierda (x 0), con y 48.
habilidades/: 30 íconos de 48x48 en tres estados (normal, _encima, _apagado).
tooltip/: marco en 9 partes (márgenes en hud.json) y tooltips de muestra por rareza.
cursores/: 32x32 con su punto activo (ancla) en hud.json.
Los números de daño y los títulos usan la fuente pixel de la interfaz con degradé por filas y contorno.
`;

/** Paquete .zip con todas las piezas en PNG, los cuadros en tiras, hud.json y un LEEME. */
export function paqueteHud(): Uint8Array {
  const f: Record<string, Uint8Array> = {};
  const png = (k: string, r: Raster) => { f[k] = encodePng(r); };
  png('barra/barra_base.png', barraInferior({ vacia: true }));
  for (const i of ['es', 'en'] as Idioma[]) png(`barra/barra_muestra_${i}.png`, barraInferior({ idioma: i }));
  for (const t of TIPOS_ORBE) for (let n = 0; n <= 10; n++) png(`orbes/${t}_${n * 10}.png`, orbeAnimado(t, n / 10).img);
  for (const i of ['es', 'en'] as Idioma[]) {
    for (const [id, p] of Object.entries(PANELES)) png(`paneles/${id}_${i}.png`, p(i).img);
    for (const t of tooltipsDeMuestra(i)) png(`tooltip/muestra_${t.rareza}_${i}.png`, t.img);
    png(`jefe/barra_jefe_${i}.png`, barraJefe(ES_EN('Señor de las Cenizas', 'Lord of Ashes', i), 0.64, { titulo: ES_EN('Jefe del capítulo I', 'Chapter I boss', i) }));
    png(`varios/numeros_de_danio_${i}.png`, muestrasDanio(i));
    png(`dialogo/cuadro_${i}.png`, cuadroDialogo(i).img);
    for (const o of OPCIONES_MENU) for (const e of ['normal', 'encima', 'presionado'] as EstadoBoton[]) png(`menu/${o.id}_${e}_${i}.png`, botonMenu(o[i], e));
    png(`pantallas/carga_${i}.png`, pantallaCarga(i));
    png(`pantallas/muerte_${i}.png`, cartelMuerte(i));
    png(`pantallas/subir_nivel_${i}.png`, destelloNivel(i).img);
    png(`pantallas/demo_${i}.png`, pintarPantallaDemo(800, 600, i));
    png(`minimapa/marco_${i}.png`, marcoMinimapa(ES_EN('Bosque de Ceniza', 'Ashen Wood', i)));
  }
  png('paneles/inventario_vacio_es.png', panelInventario('es', { vacio: true }).img);
  png('paneles/inventario_vacio_en.png', panelInventario('en', { vacio: true }).img);
  png('tooltip/marco_9.png', marcoTooltip9());
  for (const h of HABILIDADES) { png(`habilidades/${h.id}.png`, iconoHabilidad(h.id)); png(`habilidades/${h.id}_encima.png`, iconoHabilidad(h.id, 'encima')); png(`habilidades/${h.id}_apagado.png`, iconoHabilidad(h.id, 'apagado')); }
  for (const c of cursores()) png(`cursores/${c.id}.png`, c.img);
  png('minimapa/brujula.png', brujula());
  (['normal', 'campeon', 'unico'] as ClaseMonstruo[]).forEach((c) => png(`varios/placa_${c}.png`, placaMonstruo(c === 'normal' ? 'Necrófago' : c === 'campeon' ? 'Necrófago Feroz' : 'Grimm el Desollador', c, 0.7)));
  for (const t of [1, 2, 3, 5]) png(`varios/escudo_gg_${t}x.png`, escudoGG(t));
  f['hud.json'] = txt(JSON.stringify(hudJson(), null, 1));
  f['LEEME.txt'] = txt(LEEME_HUD);
  return zipSync(f, { level: 6 });
}
