import { rng, grain, bayer } from '../../fx/pix';
import { Lienzo } from './lienzo';
import type { Color, Paleta } from './paleta';
import { drawText } from './letras';
import { MAS_CLARO, MAS_OSCURO } from './tonos';
import { nueva, type Pieza } from './calle';
import type { CtxCerca } from './fachadas';
import type { ObliqueLayout } from './layout';
import type { Luz, Particula, VidaEscena } from './escena';
import type { Lugar } from './lugares';

/**
 * La cancha de tejo de La Candelaria en la tarde nublada (estilo `colombia_colonial`), de lado. La cancha techada: las
 * cerchas y las vigas de madera, la teja de barro por dentro, los pilares, los banderines de papel y los bombillos. La
 * pared colonial de cal con el zócalo verde, las ventanas de madera verdes por donde se ven las casas coloniales de
 * enfrente y Monserrate con su iglesia blanca (en la capa lejos), con la llovizna afuera. La gente con ruana en la banca,
 * el tablero de las reglas, la cajita de las mechas y el letrero donde el juego escribe CANCHA DE TEJO. Adelante, la
 * cancha de tierra con la raya y la caja de greda con el bocín en el mismo sitio donde la dibuja Tejo.ts.
 */

export const CERCA_CANDELARIA = 'cancha_tejo_candelaria';
/** La franja del layout: el fondo se para en la fila 286 (franja.atras). */
const FT = 286;
/** Filas del techo: la teja, la viga grande (el tirante de la cercha) y donde empieza la pared. */
const TECHO = 52, VIGA = 60, PARED = 70, ZOCALO = 246;
/** Los pilares de madera de la pared del fondo. */
export const PILARES = [6, 252, 486, 628];
/** Las ventanas coloniales: por la grande se ve Monserrate y la calle con las casas de enfrente. */
export const VENTANAS = [{ x0: 148, x1: 236, y0: 112, y1: 204 }, { x0: 396, x1: 460, y0: 104, y1: 172 }];
/** El letrero de madera clara donde el juego escribe CANCHA DE TEJO (en 440, 205, color #3a2418): el mismo sitio del fondo de antes. */
export const LETRERO = { x: 380, y: 196, w: 120, h: 18 };
/** La banca de la gente con ruana, bajo la ventana grande. */
export const BANCA = { x0: 130, x1: 366, asiento: 266 };
/** El tablero de las reglas y el estante de las mechas, a la izquierda, detrás de los que esperan su turno. */
export const TABLERO = { x: 22, y: 116, w: 90, h: 62 };
/** Los bombillos colgados de la viga. */
export const BOMBILLOS = [120, 330, 560];
/** La caja de greda de Tejo.ts: CAJA 556, PISO 300, la cara de (534, 300) a (582, 250), el palo hasta la 248 y el bocín en (548, 280). */
export const CAJA = { x: 556, piso: 300, bocin: [548, 280] as [number, number] };
/** La raya de lanzamiento (LINEA de Tejo.ts). */
export const RAYA = 104;

// ---------------------------------------------------------------------------------------------------------------------
// Lo lejos: Monserrate y las casas de enfrente, con la llovizna

/** Fila (de la capa lejos) donde empiezan los techos de las casas de enfrente. */
export const TECHOS_LEJOS = 92;
/** La punta de Monserrate en la capa lejos, con la iglesia blanca. */
export const MONSERRATE = { x: 196, y: 50 };

/** Una casa colonial de enfrente: pared de color, balcón de madera, ventanas con reja y el techo de teja. */
function casaColonial(L: Lienzo, x: number, w: number, top: number, h: number, pared: Color, balcon: Color, seed: number) {
  const X = (v: number) => ((v % L.w) + L.w) % L.w;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) L.p(X(x + i), top + j, i === w - 1 ? MAS_OSCURO[pared] : grain(X(x + i) >> 2, (top + j) >> 2, seed) < 0.05 ? MAS_OSCURO[pared] : pared);
  // el techo de teja con el alero
  for (let j = 0; j < 6; j++) for (let i = -3 + j; i < w + 3 - j; i++) L.p(X(x + i), top - 6 + j, j === 5 ? 'vino' : (i + j) % 3 === 0 ? 'vino' : 'salmon');
  L.hl(x - 3, top, w + 6, 'sombra');
  // el balcón corrido de madera con sus balaustres
  const by = top + 12;
  for (let i = 2; i < w - 2; i++) { L.p(X(x + i), by, balcon); L.p(X(x + i), by + 7, MAS_OSCURO[balcon]); if (i % 3 === 0) L.vl(X(x + i), by + 1, 6, balcon); }
  for (let i = 4; i < w - 6; i += 12) { L.f(X(x + i), top + 4, 6, 8, 'azul_noche'); L.vl(X(x + i), top + 4, 8, balcon); L.vl(X(x + i + 5), top + 4, 8, balcon); }
  // la puerta grande de abajo
  L.f(X(x + Math.floor(w / 2) - 4), top + h - 14, 8, 14, balcon); L.vl(X(x + Math.floor(w / 2)), top + h - 14, 14, MAS_OSCURO[balcon]);
  // el zócalo
  for (let i = 0; i < w; i++) for (let j = h - 4; j < h; j++) L.p(X(x + i), top + j, MAS_OSCURO[pared]);
}

/** Monserrate con la llovizna: el cielo tapado, el cerro con la iglesia arriba y el teleférico, la neblina y las casas coloniales de enfrente con sus techos de teja. */
export function monserrateLlovizna(pal: Paleta, w: number, h: number, seed: number): Lienzo {
  const L = new Lienzo(w, h, pal), R = rng(seed);
  // el cielo nublado, en capas que bajan más claras
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) L.p(x, y, y < 14 ? (bayer(x, y) < y / 14 ? 'cielo' : 'celeste') : bayer(x, y) < 0.15 && grain(x >> 3, y >> 2, seed) < 0.5 ? 'cemento_claro' : 'cielo');
  // los cerros orientales: Monserrate empinado con su punta, y Guadalupe más allá, que dan la vuelta por el borde
  const cerro = (x: number) => {
    const d = Math.min(Math.abs(x - MONSERRATE.x), w - Math.abs(x - MONSERRATE.x)), e = Math.min(Math.abs(x - 760), w - Math.abs(x - 760));
    return Math.min(MONSERRATE.y + Math.round(d * 0.5 + (d > 40 ? (d - 40) * 0.15 : 0)), 58 + Math.round(e * 0.3), 80);
  };
  for (let x = 0; x < w; x++) for (let y = cerro(x); y < TECHOS_LEJOS; y++) {
    const t = (y - cerro(x)) / 30;
    L.p(x, y, y < cerro(x) + 2 ? 'verde' : grain(x >> 1, y >> 1, seed + 1) < 0.2 ? 'verde' : t > 1 && bayer(x, y) < 0.2 ? 'bruma' : 'verde_oscuro');
  }
  // la iglesia blanca de Monserrate en la punta: la nave, las dos torres y la cruz
  const { x: mx, y: my } = MONSERRATE;
  L.f(mx - 7, my - 6, 14, 6, 'luz'); L.f(mx - 9, my - 11, 4, 11, 'luz'); L.f(mx + 5, my - 11, 4, 11, 'luz');
  L.hl(mx - 7, my - 7, 14, 'vino'); L.p(mx - 8, my - 12, 'cemento_claro'); L.p(mx + 6, my - 12, 'cemento_claro');
  L.vl(mx, my - 12, 5, 'cemento_claro'); L.hl(mx - 1, my - 10, 3, 'cemento_claro');
  L.f(mx - 2, my - 4, 2, 4, 'asfalto'); L.vl(mx + 7, my - 8, 2, 'asfalto'); L.vl(mx - 7, my - 8, 2, 'asfalto');
  // el cable del teleférico que baja por la ladera, con una cabina
  for (let i = 0; i < 90; i++) L.p(mx - 10 - i, my - 2 + Math.round(i * 0.55), 'asfalto');
  L.f(mx - 52, my + 18, 4, 3, 'rojo');
  // la neblina que se pega a la ladera
  for (let y = 62; y < TECHOS_LEJOS; y++) for (let x = 0; x < w; x++) if (L.has(x, y) && bayer(x, y) < Math.sin((x / w) * Math.PI * 6 + y * 0.05) * 0.25 + (y - 62) / 50) L.p(x, y, 'bruma');
  // las casas coloniales de enfrente: paredes de colores, balcones verdes y techos de teja
  const paredes: Color[] = ['crema', 'amarillo', 'celeste', 'crema', 'salmon', 'menta', 'luz'];
  // los anchos suman justo el ancho de la capa: la fila da la vuelta sin costura
  const anchos: number[] = [];
  for (let t = 0; t < w - 60;) { const cw = 46 + Math.floor(R() * 26); anchos.push(cw); t += cw; }
  anchos.push(w - anchos.reduce((a, b) => a + b, 0));
  // la primera empieza un poco antes del 0: la vuelta cae en medio de una casa, no entre dos
  let x = -24;
  for (const cw of anchos) {
    const top = TECHOS_LEJOS + Math.floor(R() * 8), pared = paredes[Math.floor(R() * paredes.length)];
    casaColonial(L, x, cw, top, h - top, pared, R() < 0.6 ? 'verde' : 'azul', seed + x);
    x += cw;
  }
  // la acera y la calle mojada de abajo
  for (let y = h - 8; y < h; y++) for (let xx = 0; xx < w; xx++) L.p(xx, y, y === h - 8 ? 'cemento_claro' : y < h - 5 ? 'cemento' : bayer(xx, y) < 0.3 ? 'cielo' : 'asfalto_claro');
  // la llovizna: rayitas finas inclinadas sobre todo
  for (let y = 0; y < h; y += 2) for (let xx = 0; xx < w; xx++) if (grain(xx, y, seed + 5) < 0.012) for (let j = 0; j < 4; j++) L.p((xx + Math.floor(j / 2)) % w, y + j, j === 0 ? 'luz' : 'cemento_claro');
  return L;
}

// ---------------------------------------------------------------------------------------------------------------------
// La cancha techada por dentro

/** El techo por dentro: el entablado de madera oscura, las dos vigas grandes con las cabezas de los cabios y el tirante. */
function techo(C: Lienzo, seed: number) {
  const W = C.w;
  // el entablado: tablas angostas que se van hacia el fondo, con la veta y alguna más oscura
  for (let y = 0; y < TECHO; y++) for (let x = 0; x < W; x++) {
    const tabla = Math.floor(x / 7), jx = x % 7, tono = grain(tabla, 0, seed) < 0.3;
    C.p(x, y, jx === 0 ? 'sombra' : tono ? 'vino' : 'terracota');
  }
  // las vigas grandes de lado a lado, con las cabezas de los cabios asomadas debajo de la de arriba
  for (const [y, h] of [[10, 7], [32, 6]] as const) {
    C.f(0, y, W, h, 'asfalto'); C.hl(0, y, W, 'terracota'); C.hl(0, y + h - 1, W, 'sombra');
    for (let x = 4; x < W; x += 16) { C.f(x, y + h, 5, 4, 'terracota'); C.hl(x, y + h, 5, 'ocre'); C.vl(x + 4, y + h, 4, 'sombra'); }
  }
  // el tirante grande de madera de lado a lado
  C.f(0, TECHO, W, VIGA - TECHO + 4, 'terracota'); C.hl(0, TECHO, W, 'ocre'); C.hl(0, VIGA + 3, W, 'sombra');
  for (let x = 0; x < W; x += 3) if (grain(x, 0, seed + 4) < 0.3) C.p(x, TECHO + 3, 'vino');
  // el humo de las mechas que se queda pegado al techo
  for (let y = TECHO - 14; y < VIGA + 6; y++) for (let x = 0; x < W; x++) if (bayer(x, y) < 0.05 * Math.max(0, Math.sin(x / 90 + 1)) && grain(x >> 3, y >> 2, seed + 6) < 0.5) C.p(x, y, 'bruma');
}

/** La pared colonial de cal, con las manchas de humedad, el pañete caído que deja ver el adobe y el zócalo verde. */
function pared(C: Lienzo, seed: number) {
  const W = C.w;
  for (let y = PARED; y < ZOCALO; y++) for (let x = 0; x < W; x++) {
    // la humedad que sube del zócalo, en manchas de borde irregular
    const v = grain(x >> 3, y >> 3, seed + 1) * 0.6 + grain(x >> 1, y >> 1, seed + 7) * 0.4;
    const humedad = y > ZOCALO - 34 && v < 0.2 + (y - (ZOCALO - 34)) / 120;
    C.p(x, y, humedad ? 'cemento_claro' : grain(x, y, seed) < 0.02 ? 'cemento_claro' : 'crema');
  }
  // el pañete caído: se ven los adobes
  const R = rng(seed + 3);
  for (let k = 0; k < 4; k++) {
    const cx = 40 + Math.floor(R() * (W - 80)), cy = PARED + 30 + Math.floor(R() * 120), rw = 8 + Math.floor(R() * 10), rh = 5 + Math.floor(R() * 6);
    for (let j = -rh; j <= rh; j++) for (let i = -rw; i <= rw; i++) {
      const d = (i / rw) ** 2 + (j / rh) ** 2;
      if (d > 1 + (grain(cx + i, cy + j, seed) - 0.5) * 0.4) continue;
      C.p(cx + i, cy + j, d > 0.75 ? 'cemento' : (cy + j) % 5 === 0 || (cx + i + ((cy + j) / 5 | 0) * 6) % 12 === 0 ? 'vino' : 'terracota');
    }
  }
  // el zócalo verde con su raya oscura
  for (let y = ZOCALO; y < FT - 4; y++) for (let x = 0; x < W; x++) C.p(x, y, y === ZOCALO ? 'verde' : y === ZOCALO + 1 ? 'luz' : y === FT - 5 ? 'verde' : grain(x >> 2, y >> 1, seed + 2) < 0.05 ? 'verde' : 'menta');
  // el piso de cemento al pie de la pared
  for (let y = FT - 4; y < FT; y++) for (let x = 0; x < W; x++) C.p(x, y, y === FT - 4 ? 'sombra' : 'asfalto_claro');
}

/** Una ventana colonial: el marco de madera verde, la reja de balaustres torneados, los postigos abiertos y el alféizar. El vano es transparente: ahí se ve la calle. */
function ventanaColonial(C: Lienzo, v: { x0: number; x1: number; y0: number; y1: number }) {
  const { x0, x1, y0, y1 } = v;
  C.f(x0 - 5, y0 - 5, x1 - x0 + 10, y1 - y0 + 10, 'verde_oscuro');
  C.f(x0 - 4, y0 - 4, x1 - x0 + 8, y1 - y0 + 8, 'menta');
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) C.clear(x, y);
  // la reja de balaustres de madera torneada
  for (let x = x0 + 7; x < x1 - 4; x += 14) for (let y = y0; y < y1; y++) { const t = (y - y0) % 12; C.p(x, y, 'verde_oscuro'); C.p(x + 1, y, t < 2 || t > 9 ? 'menta' : 'verde'); if (t === 5 || t === 6) { C.p(x + 2, y, 'verde'); C.p(x - 1, y, 'verde_oscuro'); } }
  C.hl(x0, y0 + 3, x1 - x0, 'verde'); C.hl(x0, y1 - 4, x1 - x0, 'verde');
  // los postigos abiertos, de tablero
  for (const [px, w] of [[x0 - 26, 20], [x1 + 6, 20]] as const) {
    C.box(px, y0 - 4, w, y1 - y0 + 8, 'menta', 'verde_oscuro');
    C.box(px + 3, y0, w - 6, Math.floor((y1 - y0) / 2) - 3, 'verde', 'verde_oscuro'); C.box(px + 3, y0 + Math.floor((y1 - y0) / 2) + 2, w - 6, Math.floor((y1 - y0) / 2) - 3, 'verde', 'verde_oscuro');
  }
  // el alféizar de piedra con la matera de geranios
  C.f(x0 - 8, y1 + 4, x1 - x0 + 16, 4, 'cemento_claro'); C.hl(x0 - 8, y1 + 4, x1 - x0 + 16, 'luz'); C.hl(x0 - 8, y1 + 8, x1 - x0 + 16, 'cemento');
  const mx = x0 + Math.floor((x1 - x0) / 2) - 8;
  C.f(mx, y1 - 2, 16, 6, 'terracota'); C.hl(mx, y1 - 2, 16, 'salmon');
  for (let i = 0; i < 16; i += 2) { C.p(mx + i, y1 - 4, 'verde'); C.p(mx + i + 1, y1 - 5, i % 4 ? 'rojo' : 'verde'); C.p(mx + i, y1 - 6, i % 6 === 0 ? 'rojo' : 'verde_oscuro'); }
}

/** Un pilar de madera de la cancha, con su zapata de piedra abajo y el pie de amigo arriba. */
function pilar(C: Lienzo, x: number) {
  C.f(x - 5, VIGA, 10, FT - 6 - VIGA, 'terracota'); C.vl(x - 5, VIGA, FT - 6 - VIGA, 'ocre'); C.vl(x + 4, VIGA, FT - 6 - VIGA, 'vino');
  for (let y = VIGA + 8; y < FT - 10; y += 23) C.hl(x - 4, y, 8, 'vino');
  C.f(x - 7, FT - 12, 14, 8, 'cemento'); C.hl(x - 7, FT - 12, 14, 'cemento_claro');
  for (const d of [-1, 1]) for (let i = 0; i < 14; i++) { C.f(x + d * (5 + i), VIGA + 18 - i, 2, 3, 'terracota'); C.p(x + d * (5 + i), VIGA + 18 - i, 'ocre'); }
}

/** Una mecha: el triangulito de papel blanco con la pólvora roja en la punta. */
export function mecha(C: Lienzo, x: number, y: number) {
  for (let j = 0; j < 5; j++) for (let i = -j; i <= j; i++) C.p(x + i, y + j, j === 4 ? 'cemento_claro' : 'luz');
  C.p(x, y + 1, 'rojo'); C.p(x, y + 2, 'rojo');
}

/** El tablero de las reglas: la pizarra con el marco de madera y las reglas escritas con tiza. */
function tablero(C: Lienzo, t: { x: number; y: number; w: number; h: number }) {
  C.box(t.x - 3, t.y - 3, t.w + 6, t.h + 6, 'ocre', 'sombra');
  C.f(t.x, t.y, t.w, t.h, 'verde_oscuro');
  for (let j = 0; j < t.h; j += 3) for (let i = 0; i < t.w; i++) if (grain(i >> 2, j, 9) < 0.05) C.p(t.x + i, t.y + j, 'verde');
  const lineas = ['MECHA 3', 'BOCÍN 6', 'MOÑONA 9', 'MANO 1'];
  lineas.forEach((l, i) => { drawText(C, t.x + 6, t.y + 2 + i * 14, l, 'crema'); });
  // una mecha dibujada con tiza al lado de cada regla
  for (const [i, y] of [[0, 9], [2, 37]] as const) { void i; for (let j = 0; j < 4; j++) for (let k = -j; k <= j; k++) if (k === -j || k === j || j === 3) C.p(t.x + t.w - 12 + k, t.y + y + j, 'crema'); }
  C.ring(t.x + t.w - 12, t.y + 24, 3, C.pal.crema);
  // el borrador y la tiza en la repisa
  C.f(t.x + 10, t.y + t.h + 3, 10, 3, 'asfalto'); C.hl(t.x + 10, t.y + t.h + 3, 10, 'crema'); C.f(t.x + 28, t.y + t.h + 4, 5, 2, 'luz');
}

/** El estante con la cajita de las mechas y los tejos de repuesto. */
function estante(C: Lienzo, x: number, y: number) {
  C.f(x, y, 80, 3, 'ocre'); C.hl(x, y, 80, 'amarillo'); C.hl(x, y + 3, 80, 'sombra');
  for (const px of [x + 6, x + 70]) { C.f(px, y + 3, 3, 6, 'terracota'); }
  // la cajita de cartón llena de mechas
  C.f(x + 6, y - 10, 26, 10, 'ocre'); C.hl(x + 6, y - 10, 26, 'amarillo'); C.vl(x + 31, y - 10, 10, 'terracota');
  for (let i = 0; i < 4; i++) mecha(C, x + 10 + i * 6, y - 14);
  // los tejos de metal apilados
  for (let i = 0; i < 3; i++) { C.f(x + 42, y - 3 - i * 3, 12, 3, 'asfalto_claro'); C.hl(x + 43, y - 3 - i * 3, 10, 'cemento_claro'); C.hl(x + 42, y - 1 - i * 3, 12, 'asfalto'); }
  C.f(x + 58, y - 3, 12, 3, 'asfalto_claro'); C.hl(x + 59, y - 3, 10, 'cemento_claro');
}

/** El letrero de madera clara donde el juego escribe CANCHA DE TEJO (la letra la pone el juego). */
function letreroJuego(C: Lienzo, l: typeof LETRERO) {
  C.f(l.x - 2, l.y - 2, l.w + 4, l.h + 4, 'terracota');
  C.f(l.x, l.y, l.w, l.h, 'crema'); C.hl(l.x, l.y, l.w, 'luz'); C.hl(l.x, l.y + l.h - 1, l.w, 'cemento_claro');
  // la franja de la bandera arriba y abajo, como el letrero de antes
  C.hl(l.x, l.y, l.w, 'amarillo'); C.hl(l.x, l.y + 1, l.w, 'amarillo'); C.hl(l.x, l.y + l.h - 2, l.w, 'azul'); C.hl(l.x, l.y + l.h - 1, l.w, 'rojo');
  for (const px of [l.x + 6, l.x + l.w - 7]) { C.p(px, l.y + 4, 'asfalto'); C.p(px, l.y + l.h - 5, 'asfalto'); }
  // los dos alambres de donde cuelga
  C.ln(l.x + 8, l.y - 2, l.x + 22, l.y - 18, 'asfalto'); C.ln(l.x + l.w - 9, l.y - 2, l.x + l.w - 23, l.y - 18, 'asfalto');
}

/** El afiche del torneo pegado en la pared, con las esquinas despegadas. */
function afiche(C: Lienzo, x: number, y: number) {
  const w = 52, h = 50;
  C.f(x, y, w, h, 'luz'); C.vl(x + w - 1, y, h, 'cemento_claro'); C.hl(x, y + h - 1, w, 'cemento_claro');
  C.f(x + 3, y + 3, w - 6, 13, 'rojo');
  drawText(C, x + 6, y + 2, 'TORNEO', 'amarillo');
  drawText(C, x + 6, y + 15, 'DE TEJO', 'tinta');
  drawText(C, x + 6, y + 26, 'SÁBADO', 'azul');
  // el tejo y una mecha dibujados abajo
  C.f(x + 8, y + 41, 12, 4, 'asfalto_claro'); C.hl(x + 9, y + 41, 10, 'cemento_claro'); mecha(C, x + 36, y + 39);
  C.p(x, y, 'cemento_claro'); C.p(x + w - 1, y + h - 1, 'cemento');
}

/** El tablón de atrás de la caja (donde paran los tejos que se pasan), de tablas gruesas con los golpes. */
function tablon(C: Lienzo, x0: number, x1: number, y0: number) {
  for (let y = y0; y < FT - 4; y++) for (let x = x0; x < x1; x++) {
    const t = (y - y0) % 12;
    C.p(x, y, t === 11 ? 'sombra' : t === 0 ? 'ocre' : grain(x >> 1, y >> 1, 21) < 0.015 ? 'asfalto' : 'terracota');
  }
  C.vl(x0, y0, FT - 4 - y0, 'sombra'); C.vl(x1 - 1, y0, FT - 4 - y0, 'sombra');
  for (let y = y0 + 4; y < FT - 6; y += 12) for (const x of [x0 + 3, x1 - 4]) C.p(x, y, 'cemento_claro');
}

/** Los banderines de papel de colores colgados de pilar a pilar. `f` los mece. */
function banderines(C: Lienzo, f = 0) {
  const colores: Color[] = ['amarillo', 'azul', 'rojo', 'verde', 'crema', 'amarillo', 'rojo', 'azul'];
  for (let k = 0; k < PILARES.length - 1; k++) for (const fila of [0, 1]) {
    const a = PILARES[k] + 6, b = PILARES[k + 1] - 6, y0 = VIGA + 6 + fila * 12, sag = 10 + fila * 4;
    let n = 0;
    for (let x = a; x < b; x++) {
      const u = (x - a) / (b - a), y = Math.round(y0 + Math.sin(u * Math.PI) * sag);
      C.p(x, y, 'asfalto');
      if ((x - a) % 9 === 4 && x < b - 4) {
        const c = colores[(n++ + k * 3 + fila) % colores.length], mece = f && n % 2 ? 1 : 0;
        for (let j = 0; j < 7; j++) for (let i = 0; i < 6 - Math.floor(j * 0.8); i++) C.p(x - 2 + i + Math.floor(j * 0.4) + (j > 3 ? mece : 0), y + 1 + j, j === 0 ? MAS_OSCURO[c] : c);
      }
    }
  }
}

/** Un bombillo colgado de su cable, prendido. */
function bombillo(C: Lienzo, x: number) {
  C.vl(x, VIGA + 4, 22, 'asfalto');
  C.f(x - 2, VIGA + 26, 5, 3, 'asfalto'); C.d(x, VIGA + 31, 3, 'oro'); C.f(x - 1, VIGA + 30, 2, 2, 'luz');
  for (let j = -8; j <= 8; j++) for (let i = -8; i <= 8; i++) { const d = Math.hypot(i, j); if (d > 4 && d < 8 && bayer(x + i, VIGA + 31 + j) < (8 - d) / 8 * 0.4 && C.has(x + i, VIGA + 31 + j)) C.p(x + i, VIGA + 31 + j, 'amarillo'); }
}

/** Una persona con ruana y sombrero sentada en la banca, con su tinto. `arriba` levanta el tinto (la vida). */
function ruana(C: Lienzo, x: number, asiento: number, base: number, colorRuana: Color, raya: Color, sombrero: boolean, arriba: boolean, mujer: boolean) {
  const piel: Color = 'salmon';
  // las piernas: el pantalón o la falda, y los zapatos
  C.f(x + 1, asiento - 3, 12, 3, mujer ? 'vino' : 'azul_noche');
  for (const lx of [x + 2, x + 9]) { C.f(lx, asiento, 3, base - asiento - 2, mujer ? 'sombra' : 'azul_noche'); C.f(lx - 1, base - 2, 5, 2, 'sombra'); }
  if (mujer) C.f(x + 1, asiento, 12, 5, 'vino');
  // las rodillas: los muslos sentados hacia la cámara, un poco más anchos que las canillas
  C.f(x, asiento - 4, 15, 4, mujer ? 'vino' : 'azul_noche'); C.hl(x, asiento - 4, 15, mujer ? 'rojo' : 'azul');
  // la ruana: el poncho de lana que cae de los hombros hasta el regazo, con sus rayas y los flecos
  const top = asiento - 20;
  for (let j = 0; j < 16; j++) {
    const ancho = 10 + Math.round(j * 0.35), a = x + 7 - Math.floor(ancho / 2);
    for (let i = 0; i < ancho; i++) C.p(a + i, top + j, (j === 6 || j === 12) ? raya : i === ancho - 1 ? MAS_OSCURO[colorRuana] : i === 0 ? MAS_CLARO[colorRuana] : colorRuana);
  }
  for (let i = 0; i < 16; i += 2) C.p(x - 1 + i, top + 16, MAS_OSCURO[colorRuana]);
  // el cuello en V y la cabeza
  C.p(x + 6, top, piel); C.p(x + 7, top, piel); C.p(x + 7, top + 1, piel);
  const hx = x + 4, hy = top - 7;
  C.f(hx, hy, 6, 7, piel); C.vl(hx + 5, hy + 1, 5, MAS_OSCURO[piel]); C.p(hx + 1, hy + 3, 'tinta'); C.p(hx + 4, hy + 3, 'tinta');
  if (sombrero) { C.f(hx - 3, hy - 1, 12, 2, 'ocre'); C.hl(hx - 3, hy, 12, 'terracota'); C.f(hx, hy - 4, 6, 3, 'ocre'); C.hl(hx, hy - 2, 6, 'sombra'); }
  else { C.f(hx, hy - 1, 6, 3, mujer ? 'tinta' : 'sombra'); C.vl(hx - 1, hy, mujer ? 8 : 3, mujer ? 'tinta' : 'sombra'); if (mujer) C.vl(hx + 6, hy, 8, 'tinta'); }
  // la mano con el tinto: abajo en el regazo o arriba brindando
  if (arriba) { C.vl(x + 14, top - 8, 9, colorRuana); C.f(x + 13, top - 12, 3, 3, 'luz'); C.p(x + 14, top - 11, 'terracota'); C.p(x + 14, top - 9, piel); }
  else { C.f(x + 5, top + 12, 4, 3, 'luz'); C.p(x + 6, top + 12, 'terracota'); C.p(x + 4, top + 13, piel); }
}

/** La gente de la banca con ruana. `f` es el cuadro de la vida. */
function gente(C: Lienzo, seed: number, f = 0) {
  const { x0, x1, asiento } = BANCA, base = FT - 4;
  C.f(x0, asiento - 1, x1 - x0, 4, 'ocre'); C.hl(x0, asiento - 1, x1 - x0, 'amarillo'); C.hl(x0, asiento + 3, x1 - x0, 'sombra');
  for (const px of [x0 + 4, Math.round((x0 + x1) / 2), x1 - 8]) { C.f(px, asiento + 3, 4, base - asiento - 3, 'terracota'); C.vl(px, asiento + 3, base - asiento - 3, 'ocre'); }
  const R = rng(seed + 31), RUANAS: [Color, Color][] = [['asfalto_claro', 'crema'], ['terracota', 'ocre'], ['vino', 'cemento_claro'], ['cemento', 'asfalto'], ['ocre', 'terracota'], ['asfalto', 'rojo']];
  for (let x = x0 + 6, n = 0; x < x1 - 16; n++) {
    const [c, r] = RUANAS[Math.floor(R() * RUANAS.length)], sombrero = R() < 0.55, mujer = !sombrero && R() < 0.6, paso = 20 + Math.floor(R() * 10);
    ruana(C, x, asiento, base, c, r, sombrero, (n + f) % 3 === 0, mujer);
    x += paso;
  }
}

/** La capa cerca de la cancha completa. `f` es el cuadro de la vida (banderines y gente). */
export function pintarCandelaria(C: Lienzo, seed: number, o: { f?: number; banderines?: boolean } = {}) {
  const f = o.f ?? 0;
  pared(C, seed);
  techo(C, seed);
  tablon(C, 508, C.w, 150);
  for (const v of VENTANAS) ventanaColonial(C, v);
  for (const x of PILARES) pilar(C, x);
  tablero(C, TABLERO);
  estante(C, 22, 220);
  letreroJuego(C, LETRERO);
  afiche(C, 290, 118);
  if (o.banderines !== false) banderines(C, f);
  for (const x of BOMBILLOS) bombillo(C, x);
  gente(C, seed, f);
}

export const fondoCandelaria = (C: Lienzo, _x0: number, _x1: number, _base: number, ctx: CtxCerca) => pintarCandelaria(C, ctx.seed);

// ---------------------------------------------------------------------------------------------------------------------
// La cancha: el piso, la raya y la caja de greda

/** La tierra de la cancha: apisonada, gris parda, con las salpicaduras de greda cerca de la caja y las chapas regadas. */
export function tierraCandelaria(x: number, y: number, s: number): Color {
  const xr = ((x % 960) + 960) % 960;
  const n = grain(xr, y, s);
  if (n < 0.002) return 'oro';
  if (n > 0.998) return 'cemento_claro';
  // la greda que salta de la caja: más cerca, más manchas
  const cerca = Math.max(0, (xr - 470) / 90);
  if (grain(xr >> 1, y >> 1, s + 3) < cerca * 0.22) return bayer(xr, y) < 0.5 ? 'cemento' : 'asfalto_claro';
  // la tierra parda apisonada, con manchones más claros y la huella de los que lanzan
  return grain(xr >> 3, y >> 1, s + 1) < 0.3 && bayer(xr, y) < 0.2 ? 'salmon' : grain(xr, y, s + 4) < 0.03 ? 'terracota' : 'ocre';
}

/** La raya de lanzamiento: un listón de madera clavado en la tierra (LINEA de Tejo.ts). */
export function rayaCandelaria(P: Lienzo, L: ObliqueLayout, _seed: number) {
  const D = L.franja.adelante - L.franja.atras;
  for (let y = 1; y < D - 1; y++) { P.p(RAYA, y, 'ocre'); P.p(RAYA + 1, y, 'terracota'); P.p(RAYA - 1, y, 'asfalto'); }
}

/** Lo de adelante de la cancha: el borde de madera, el piso de cemento del galpón con aserrín y chapas. */
export function orillaCandelaria(x: number, r: number, s: number): Color {
  const xr = ((x % 960) + 960) % 960;
  if (r === 0) return 'ocre';
  if (r < 4) return r === 3 ? 'vino' : (xr % 48 === 0 ? 'vino' : 'terracota');
  if (r === 4) return 'sombra';
  // el piso de cemento del galpón: losas grandes con su junta, una que otra chapa de botella y el aserrín regado
  if (xr % 96 === 0 || r === 30) return 'asfalto_claro';
  const n = grain(xr, r, s);
  if (n < 0.003) return 'oro';
  if (n > 0.996) return 'rojo';
  return grain(xr >> 3, r >> 2, s + 1) < 0.18 && bayer(xr, r) < 0.4 ? 'cemento_claro' : 'cemento';
}

/**
 * La caja de tejo vista de lado, con la geometría de Tejo.ts: el marco de madera en triángulo de (534, 300) a (582,
 * 300) y (582, 250), el palo de atrás de 578 a 584 hasta la fila 248, la cara de greda inclinada hacia el que lanza y el
 * bocín de metal en (548, 280). Las mechas y los tejos que caen los pinta el juego encima.
 */
export function cajaGreda(pal: Paleta, w: number, d: number, z: number): Pieza {
  const P = nueva(pal, w, d, z, 0), L = P.img, oy = z + d - 58, X = (sx: number) => sx - 534, Y = (sy: number) => sy - 242 + oy;
  const dentro = (px: number, py: number, ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => {
    const s1 = (bx - ax) * (py - ay) - (by - ay) * (px - ax), s2 = (cx - bx) * (py - by) - (cy - by) * (px - bx), s3 = (ax - cx) * (py - cy) - (ay - cy) * (px - cx);
    return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0);
  };
  for (let sy = 248; sy <= 300; sy++) for (let sx = 534; sx <= 584; sx++) {
    let c: Color | null = null;
    // el marco de madera: el costado del triángulo con las tablas
    if (dentro(sx, sy, 534, 300, 582, 300, 582, 250)) c = (sy - 250) % 9 === 0 ? 'vino' : grain(sx >> 1, sy, 4) < 0.06 ? 'vino' : 'terracota';
    // la greda: la cara inclinada, gris y húmeda, más oscura adentro
    if (dentro(sx, sy, 538, 298, 578, 298, 578, 254)) c = dentro(sx, sy, 544, 298, 578, 298, 578, 262) ? (bayer(sx, sy) < 0.25 ? 'asfalto' : 'asfalto_claro') : bayer(sx, sy) < 0.3 ? 'cemento_claro' : 'cemento';
    // el palo de atrás
    if (sx >= 578 && sx <= 583 && sy >= 248) c = sx === 578 ? 'ocre' : sx === 583 ? 'sombra' : 'terracota';
    if (c) L.p(X(sx), Y(sy), c);
  }
  // el canto del marco (la línea de Tejo.ts) y la base
  for (let i = 0; i <= 48; i++) { const sx = 534 + i, sy = Math.round(300 - (i * 50) / 48); L.p(X(sx), Y(sy), 'sombra'); L.p(X(sx), Y(sy) - 1, 'ocre'); }
  for (let sx = 534; sx <= 584; sx++) L.p(X(sx), Y(300), 'sombra');
  // la greda apisonada que sobresale del marco: la cara inclinada donde caen los tejos, la misma línea de Tejo.ts
  // (pasa por el bocín en 548, 280 con pendiente 1), con el filo de arriba claro
  const cara = (sx: number) => CAJA.bocin[1] - (sx - CAJA.bocin[0]);
  for (let sx = 535; sx <= 577; sx++) {
    const top = cara(sx) - 1, fondo = Math.round(300 - ((sx - 534) * 50) / 48);
    for (let sy = top; sy < fondo; sy++) L.p(X(sx), Y(sy), sy === top ? 'cemento_claro' : sy === top + 1 ? 'cemento' : bayer(sx, sy) < 0.3 ? 'asfalto_claro' : 'cemento');
  }
  // el bocín: el aro de metal enterrado en la greda
  const [bx, by] = CAJA.bocin;
  // el bocín: el aro de metal brillante, con su sombra adentro
  L.ring(X(bx), Y(by) + 1, 5, pal.asfalto, 0.5, 1);
  L.ring(X(bx), Y(by), 5, pal.cemento_claro, 0.5, 1);
  L.p(X(bx) - 3, Y(by) - 2, 'luz'); L.p(X(bx) - 2, Y(by) - 2, 'luz');
  // las salpicaduras de greda en la madera
  for (let k = 0; k < 14; k++) { const sx = 536 + ((k * 37) % 44), sy = 286 + ((k * 13) % 14); if (dentro(sx, sy, 534, 300, 582, 300, 582, 250)) L.p(X(sx), Y(sy), 'cemento'); }
  return P;
}

// ---------------------------------------------------------------------------------------------------------------------
// Vida, luces y partículas

function recorte(src: Lienzo, x: number, y: number, w: number, h: number): Lienzo {
  const out = new Lienzo(w, h, src.pal);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const sx = x + i, sy = y + j;
    if (sx < 0 || sy < 0 || sx >= src.w || sy >= src.h) continue;
    const a = (sy * src.w + sx) * 4;
    out.r.data.set(src.r.data.subarray(a, a + 4), (j * w + i) * 4);
  }
  return out;
}

/** La llovizna que cae afuera, vista por una ventana: rayitas inclinadas que bajan, solo donde la pared deja ver. 3 cuadros. */
function lloviznaVentana(pal: Paleta, cerca: Lienzo, v: (typeof VENTANAS)[number], seed: number): Lienzo[] {
  const w = v.x1 - v.x0, h = v.y1 - v.y0;
  return [0, 1, 2].map((f) => {
    const L = new Lienzo(w, h, pal);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (grain(x, (y - f * 5 + h * 3) % h, seed) > 0.016) continue;
      for (let j = 0; j < 4; j++) { const px = x + Math.floor(j / 2), py = y + j; if (px < w && py < h && !cerca.has(v.x0 + px, v.y0 + py)) L.p(px, py, j === 0 ? 'luz' : 'cemento_claro'); }
    }
    return L;
  });
}

export function vidaCandelaria(pal: Paleta, L: ObliqueLayout, _k: number, seed: number, capas: { cerca: Lienzo; piso: Lienzo }): VidaEscena[] {
  const out: VidaEscena[] = [], quiere = (t: string) => L.vida.includes(t);
  const cuadros = [0, 1].map((f) => { const c = new Lienzo(capas.cerca.w, capas.cerca.h, pal); pintarCandelaria(c, seed, { f }); return c; });
  if (quiere('banderines')) { const y = VIGA + 4, h = 34; out.push({ id: 'banderines', tipo: 'banderines', capa: 'cerca', x: 0, y, cuadros: cuadros.map((c) => recorte(c, 0, y, c.w, h)), fps: 2 }); }
  if (quiere('publico')) { const x = BANCA.x0 - 2, y = BANCA.asiento - 40, w = BANCA.x1 - BANCA.x0 + 4, h = 40; out.push({ id: 'publico', tipo: 'publico', capa: 'cerca', x, y, cuadros: cuadros.map((c) => recorte(c, x, y, w, h)), fps: 1.5 }); }
  if (quiere('llovizna')) VENTANAS.forEach((v, i) => out.push({ id: `llovizna_${i}`, tipo: 'llovizna', capa: 'cerca', x: v.x0, y: v.y0, cuadros: lloviznaVentana(pal, capas.cerca, v, seed + i), fps: 6 }));
  return out;
}

export function lucesCandelaria(pal: Paleta, _L: ObliqueLayout, _k: number): Luz[] {
  return BOMBILLOS.map((x) => ({ x, y: VIGA + 31, color: pal.oro, radio: 56, latido: 0.3, encendida: true, nota: 'el bombillo colgado de la viga: alumbra la cancha en la tarde nublada' }));
}

export function particulasCandelaria(pal: Paleta, L: ObliqueLayout, _k: number): Particula[] {
  if (!L.vida.includes('humo_mechas')) return [];
  return [{ tipo: 'humo', x0: CAJA.x - 14, x1: CAJA.x + 6, y0: 262, y1: 280, color: [pal.cemento_claro, pal.bruma], cada: 0.8, sube: 10, vida: 2.4, nota: 'el humo de las mechas reventadas, que sube de la caja de greda (cuando revienta una, el juego pone mecha_tejo)' }];
}

export const CANDELARIA: Lugar = {
  estilo: 'colombia_colonial',
  fondo: fondoCandelaria,
  lejos: { monserrate_llovizna: monserrateLlovizna },
  pisos: { tierra: tierraCandelaria },
  orilla: orillaCandelaria,
  marcas: rayaCandelaria,
  pieza: (pal, tipo, w, d, z) => (tipo === 'caja_greda' ? cajaGreda(pal, w, d, z) : null),
  vida: vidaCandelaria,
  luces: lucesCandelaria,
  particulas: particulasCandelaria,
  techado: true,
};

