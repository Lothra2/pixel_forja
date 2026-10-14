import { rng, grain, bayer } from '../../fx/pix';
import { Lienzo } from './lienzo';
import type { Color, Paleta } from './paleta';
import type { CtxCerca } from './fachadas';
import type { ObliqueLayout } from './layout';
import type { Luz, Particula, VidaEscena } from './escena';
import type { Lugar } from './lugares';
import { recorte, textoGrande, anchoTexto, personita, sentadita, sombraOval } from './pinceles';

/**
 * La bahía de Hạ Long al mediodía (estilo `vietnam_bahia`), de lado, para la Natación. Lejos, los islotes de piedra
 * caliza en la calima, uno detrás del otro, cada vez más claros. Cerca, el agua esmeralda de la bahía con los islotes
 * grandes y su monte encima, un junco de velas, la aldea flotante y el muelle de atrás de la piscina con las banderas de
 * Vietnam, el letrero VỊNH HẠ LONG, la silla del salvavidas y la mesa de los jueces. El piso es la piscina flotante con
 * sus corcheras y la pared de llegada donde las pintaba Natacion.ts, y adelante sigue la bahía.
 */

export const CERCA_HALONG = 'bahia_halong';
/** La franja de Natacion.ts: TOP 226 y 120 de fondo (de la fila 226 a la 346). */
const FT = 226;
/**
 * La piscina de Natacion.ts, en y de la franja: el agua de y 2 a y 110 (filas 228 a 336) entre la salida y la llegada,
 * las corcheras en y 36, 62 y 88 (filas 262, 288 y 314), los carriles en y 24, 50, 76 y 102, la marca de 15 m y la
 * pared de llegada a cuadros negros y amarillos.
 */
export const PISCINA = { y0: 2, y1: 110, salida: 120, llegada: 1360, poyete: 112, corcheras: [36, 62, 88], carriles: [24, 50, 76, 102], m15: 492, pared: 10, fin: 118 };
/** La fila donde la bahía toca el muelle de atrás. */
const MUELLE = 212;
/** El horizonte de la bahía en la capa cerca (el agua empieza acá). */
const HORIZONTE_CERCA = 184;
/** Los islotes grandes de la capa cerca: centro, ancho de la base y alto. */
export const ISLOTES: { x: number; w: number; alto: number }[] = [
  { x: 120, w: 70, alto: 66 }, { x: 430, w: 54, alto: 52 }, { x: 760, w: 88, alto: 78 }, { x: 1120, w: 62, alto: 60 }, { x: 1390, w: 76, alto: 70 },
];
/** El junco anclado en la bahía. */
export const JUNCO = { x: 560, y: 200 };
/** La aldea flotante de pescadores. */
export const ALDEA = { x0: 930, x1: 1060, y: 200 };
/** El letrero del muelle, la silla del salvavidas y la mesa de los jueces. */
export const MUELLE_COSAS = { letrero: 260, silla: 700, jueces: 1386 };

// ---------------------------------------------------------------------------------------------------------------------
// Lo lejos: los islotes en la calima

const onda = (x: number, w: number, vueltas: number, fase: number) => Math.sin((x / w) * Math.PI * 2 * vueltas + fase);

/** Un islote de caliza: paredes casi verticales con la cima redondeada y quebrada (el perfil de Hạ Long). */
function perfilIslote(dx: number, w: number, alto: number, seed: number): number {
  const u = Math.abs(dx) / w;
  if (u >= 1) return 0;
  const cuerpo = Math.pow(1 - Math.pow(u, 3.2), 0.5);
  return Math.round(alto * cuerpo * (0.92 + 0.08 * Math.sin(dx * 0.6 + seed)) + (grain(dx + 99, 0, seed) - 0.5) * 3);
}

/**
 * Los islotes de la bahía en la calima: tres filas de siluetas, cada una más clara y más lejos, y el agua de la bahía
 * abajo con el brillo del sol. Arriba queda transparente: ahí va el cielo.
 */
export function islotesHalong(pal: Paleta, w: number, h: number, seed: number): Lienzo {
  const L = new Lienzo(w, h, pal), R = rng(seed);
  const horiz = 156;
  // el agua de la bahía lejos
  for (let y = horiz; y < h; y++) for (let x = 0; x < w; x++) L.p(x, y, y === horiz ? 'bruma' : bayer(x, y) < (y - horiz) / 20 ? 'canal' : 'menta');
  // tres filas de islotes, de atrás para adelante: cemento claro, cemento y asfalto claro con monte
  const filas: [number, number, Color, Color][] = [[11, 48, 'cemento_claro', 'bruma'], [8, 40, 'cemento', 'cemento_claro'], [6, 30, 'asfalto_claro', 'verde_oscuro']];
  filas.forEach(([n, alto, roca, cima], fi) => {
    for (let i = 0; i < n; i++) {
      const cx = Math.floor((i + 0.3 + R() * 0.4) * (w / n)), iw = 10 + Math.floor(R() * 16), ia = Math.floor(alto * (0.6 + R() * 0.5));
      for (let dx = -iw; dx <= iw; dx++) {
        const a = perfilIslote(dx, iw, ia, seed + i + fi * 20);
        if (!a) continue;
        const x = (((cx + dx) % w) + w) % w;
        for (let j = 0; j < a; j++) {
          const y = horiz - j, borde = a - j;
          let c: Color = roca;
          if (fi === 2) c = borde < 5 ? (bayer(x, y) < 0.5 ? 'verde' : 'verde_oscuro') : dx < -iw / 3 ? 'cemento' : grain(x >> 1, y >> 2, seed + 3) < 0.25 ? 'asfalto' : roca;
          else if (borde < 3 && fi === 1) c = cima;
          if (j < 3) c = fi === 2 ? 'sombra' : 'cemento';
          L.p(x, y, c);
        }
      }
    }
  });
  // la calima: una banda tramada sobre el agua, delante de las dos filas de atrás
  for (let x = 0; x < w; x++) for (let y = horiz - 8; y < horiz; y++) if (bayer(x, y) < 0.25 + (y - horiz + 8) * 0.04 && L.has(x, y) && grain(x, y, seed) < 0.6) L.p(x, y, 'bruma');
  // el brillo del sol en el agua
  for (let k = 0; k < w / 4; k++) { const x = Math.floor(R() * w), y = horiz + 2 + Math.floor(R() * (h - horiz - 3)), len = 2 + Math.floor(R() * 5); for (let i = 0; i < len; i++) L.p((x + i) % w, y, R() < 0.3 ? 'luz' : 'cielo'); }
  void onda;
  return L;
}

// ---------------------------------------------------------------------------------------------------------------------
// La capa cerca: la bahía, los islotes, el junco, la aldea flotante y el muelle

/** El agua esmeralda de la bahía, del horizonte al muelle: más clara lejos, con las rayas del oleaje y el brillo. */
function bahia(C: Lienzo, seed: number, f = 0) {
  for (let y = HORIZONTE_CERCA; y < MUELLE; y++) for (let x = 0; x < C.w; x++) {
    const t = (y - HORIZONTE_CERCA) / (MUELLE - HORIZONTE_CERCA);
    let c: Color = t < 0.25 ? (bayer(x, y) < 0.5 ? 'menta' : 'canal') : 'canal';
    const ola = Math.sin(x / 9 + y * 1.7 + f * 1.3) + Math.sin(x / 23 - y + seed);
    if (ola > 1.6) c = t < 0.5 ? 'luz' : 'menta';
    else if (ola < -1.75 && t > 0.3) c = 'verde_oscuro';
    C.p(x, y, c);
  }
}

/**
 * Un islote de piedra caliza grande: las paredes grises casi verticales con las vetas, la base comida por el agua (la
 * muesca de la marea) y el monte verde que lo corona y le chorrea por las grietas. La luz viene de la izquierda.
 */
function isloteGrande(C: Lienzo, cx: number, w: number, alto: number, seed: number) {
  const base = MUELLE - 14 + (seed % 5);
  for (let dx = -w; dx <= w; dx++) {
    const a = perfilIslote(dx, w, alto, seed);
    if (!a) continue;
    const x = cx + dx, luz = dx < -w * 0.35, sombra = dx > w * 0.4;
    for (let j = 0; j < a; j++) {
      const y = base - j, borde = a - j;
      let c: Color = luz ? 'cemento_claro' : sombra ? 'asfalto' : 'cemento';
      if (grain(x >> 1, y >> 3, seed) < 0.22) c = luz ? 'cemento' : 'asfalto_claro';
      if ((x * 3 + (y >> 2)) % 11 === 0 && !luz) c = 'asfalto';
      // el monte de arriba y el que baja por las grietas
      const monte = borde < 7 + Math.round(grain(x >> 2, 0, seed + 1) * 6) || (grain(x >> 2, y >> 3, seed + 2) < 0.12 && borde < a * 0.7);
      if (monte) c = borde < 2 ? 'verde' : bayer(x, y) < (luz ? 0.6 : 0.3) ? 'verde' : 'verde_oscuro';
      // la muesca de la marea: la base comida, oscura
      if (j < 3) c = j === 0 ? 'sombra' : 'asfalto';
      C.p(x, y, c);
    }
  }
  // el reflejo en el agua, tramado
  for (let dx = -w; dx <= w; dx++) for (let j = 1; j < 8; j++) if (bayer(cx + dx, base + j) < 0.35 - j * 0.04 && perfilIslote(dx, w, alto, seed)) C.p(cx + dx, base + j, 'verde_oscuro');
}

/** El junco: el casco de madera oscura con la popa alta y las tres velas de color ladrillo con sus listones. */
function junco(C: Lienzo, f: number) {
  const { x, y } = JUNCO;
  for (let i = 0; i < 44; i++) {
    const sube = i < 5 ? 5 - i : i > 36 ? Math.round((i - 36) * 0.9) : 0;
    for (let j = 0; j < 6 + sube; j++) C.p(x + i, y - j, j === 5 + sube ? 'ocre' : j < 2 ? 'sombra' : 'asfalto');
  }
  C.hl(x + 4, y - 6, 34, 'terracota');
  // la casita de cubierta
  C.f(x + 14, y - 11, 14, 5, 'terracota'); C.hl(x + 13, y - 12, 16, 'vino'); C.p(x + 18, y - 9, 'amarillo'); C.p(x + 23, y - 9, 'amarillo');
  // las velas: abanicos con los listones, la del medio la más alta; se inflan un poco con el viento (f)
  for (const [mx, alto, ancho] of [[x + 9, 26, 12], [x + 22, 34, 15], [x + 35, 22, 11]] as const) {
    C.vl(mx, y - 6 - alto, alto, 'sombra');
    for (let j = 0; j < alto - 3; j++) {
      const t = j / (alto - 3), wv = Math.round(ancho * (0.55 + t * 0.45)) + (f && j > alto / 3 ? 1 : 0);
      for (let i = 1; i <= wv; i++) C.p(mx + i, y - 7 - alto + 3 + j, j % 5 === 0 ? 'vino' : i < 3 ? 'oro' : 'terracota');
    }
  }
  for (let i = -2; i < 48; i++) if (bayer(x + i, y + 1) < 0.5) C.p(x + i, y + 1, 'menta');
}

/** La aldea flotante: casitas de madera de colores sobre balsas, con los botes amarrados y la ropa colgada. */
function aldea(C: Lienzo, seed: number) {
  const { x0, x1, y } = ALDEA, R = rng(seed);
  const colores: Color[] = ['azul', 'crema', 'amarillo', 'celeste', 'crema'];
  let x = x0;
  for (let i = 0; x < x1; i++) {
    const w = 18 + Math.floor(R() * 8), h = 9 + Math.floor(R() * 4), c = colores[i % colores.length];
    // la balsa
    C.f(x - 1, y, w + 2, 2, 'terracota'); C.hl(x - 1, y + 2, w + 2, 'sombra');
    // la casita y el techo
    C.f(x, y - h, w, h, c); C.vl(x + w - 1, y - h, h, 'cemento');
    for (let j = 0; j < 4; j++) C.hl(x - 1 + j, y - h - 1 - j, w + 2 - 2 * j, j ? (i % 2 ? 'azul' : 'rojo') : (i % 2 ? 'azul_noche' : 'vino'));
    C.f(x + 3, y - h + 3, 3, 3, 'sombra'); C.f(x + w - 7, y - 6, 4, 6, 'terracota');
    x += w + 6;
  }
  // la ropa colgada y un bote chiquito con su remero
  for (let i = 0; i < 6; i++) C.f(x0 + 30 + i * 4, y - 19 + (i & 1), 2, 3, (['rojo', 'amarillo', 'luz'] as Color[])[i % 3]);
  C.hl(x0 + 28, y - 20, 26, 'sombra');
  C.f(x1 + 8, y + 4, 16, 2, 'terracota'); C.hl(x1 + 9, y + 3, 14, 'ocre');
  personita(C, x1 + 13, y + 4, { ropa: 'cemento_claro', pant: 'sombra', pelo: 'tinta', piel: 'salmon', alto: 13, sombrero: 'amarillo' });
  void bayer;
}

/** Una bandera de Vietnam en su asta: roja con la estrella amarilla; `f` la mece. */
function banderaVietnam(C: Lienzo, x: number, piso: number, f: number) {
  C.vl(x, piso - 36, 36, 'cemento_claro'); C.vl(x + 1, piso - 36, 36, 'cemento'); C.p(x, piso - 37, 'amarillo');
  const top = piso - 35;
  for (let j = 0; j < 10; j++) for (let i = 0; i < 15; i++) {
    const caida = f ? Math.round(Math.sin(i / 3) * 1) : Math.round(i / 6);
    C.p(x + 2 + i, top + j + caida, 'rojo');
  }
  for (let i = 0; i < 15; i++) C.p(x + 2 + i, top + 9 + (f ? Math.round(Math.sin(i / 3)) : Math.round(i / 6)), 'vino');
  for (const [dx, dy] of [[0, -2], [0, -1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, 1], [1, 1], [-1, 2], [1, 2]]) C.p(x + 9 + dx, top + 4 + dy + (f ? 0 : 1), 'amarillo');
}

/**
 * El muelle de atrás de la piscina: la pasarela de tablas sobre los flotadores, la baranda de cuerda, el letrero
 * VỊNH HẠ LONG con la banda, las banderas, la silla alta del salvavidas con su sombrilla y la mesa de los jueces con el
 * cronómetro, y la gente que mira.
 */
function muelle(C: Lienzo, seed: number, f: number) {
  const W = C.w;
  // la pasarela y los flotadores azules
  for (let x = 0; x < W; x++) {
    for (let y = MUELLE; y < MUELLE + 4; y++) C.p(x, y, y === MUELLE ? 'ocre' : (x + (y & 1) * 3) % 9 === 0 ? 'terracota' : 'ocre');
    for (let y = MUELLE + 4; y < MUELLE + 7; y++) C.p(x, y, (x % 22) < 18 ? (y === MUELLE + 4 ? 'celeste' : 'azul') : 'sombra');
    for (let y = MUELLE + 7; y < FT; y++) C.p(x, y, (x + y) % 7 === 0 ? 'vino' : y === FT - 1 ? 'terracota' : 'ocre');
  }
  // la baranda de cuerda en sus palitos
  for (let x = 4; x < W; x += 30) C.f(x, MUELLE - 10, 2, 10, 'terracota');
  for (let x = 0; x < W; x++) C.p(x, MUELLE - 8 + Math.round(Math.sin(((x % 30) / 30) * Math.PI) * 2), 'crema');
  // el letrero VỊNH HẠ LONG en su banda roja, con el arco de tubos
  const { letrero, silla, jueces } = MUELLE_COSAS, t1 = 'VỊNH HẠ LONG', w1 = anchoTexto(t1) + 14;
  for (const px of [letrero, letrero + w1 - 2]) C.f(px, MUELLE - 44, 2, 44, 'cemento');
  C.box(letrero, MUELLE - 44, w1, 26, 'rojo', 'vino'); C.hl(letrero + 1, MUELLE - 43, w1 - 2, 'oro');
  textoGrande(C, letrero + 7, MUELLE - 42, t1, 'amarillo', 2, 'vino');
  // las banderas
  for (const bx of [letrero - 30, letrero + w1 + 16, 520, 880, 1180]) banderaVietnam(C, bx, MUELLE, f);
  // la silla del salvavidas: alta, de tubos blancos, con la sombrilla roja y blanca y el salvavidas colgado
  C.ln(silla, MUELLE, silla + 6, MUELLE - 24, 'luz'); C.ln(silla + 16, MUELLE, silla + 10, MUELLE - 24, 'luz');
  C.hl(silla + 2, MUELLE - 12, 12, 'cemento_claro'); C.f(silla + 4, MUELLE - 27, 9, 3, 'azul');
  sentadita(C, silla + 4, MUELLE - 27, { ropa: 'rojo', pant: 'amarillo', pelo: 'tinta', piel: 'salmon', alto: 16, sombrero: 'crema' });
  C.vl(silla + 8, MUELLE - 52, 22, 'cemento');
  for (let j = 0; j < 5; j++) for (let i = -12 + j * 2; i <= 12 - j * 2; i++) C.p(silla + 8 + i, MUELLE - 52 + 4 - j, ((i + 12) >> 2) % 2 ? 'rojo' : 'luz');
  C.d(silla + 18, MUELLE - 16, 3, 'rojo'); C.d(silla + 18, MUELLE - 16, 1.4, 'ocre');
  // la mesa de los jueces en la llegada, con el mantel azul y el cronómetro grande
  C.f(jueces, MUELLE - 10, 44, 10, 'azul'); C.hl(jueces, MUELLE - 10, 44, 'celeste'); C.hl(jueces, MUELLE - 1, 44, 'azul_noche');
  for (const [i, ropa] of [[4, 'luz'], [16, 'amarillo'], [28, 'luz']] as const) sentadita(C, jueces + i, MUELLE - 11, { ropa, pant: 'azul_noche', pelo: 'tinta', piel: 'salmon', alto: 15 });
  C.box(jueces + 10, MUELLE - 46, 30, 14, 'tinta', 'sombra'); C.vl(jueces + 24, MUELLE - 32, 22, 'cemento');
  textoGrande(C, jueces + 13, MUELLE - 43, '00:00', 'oro', 1);
  // la gente que mira desde el muelle
  const R = rng(seed + 9);
  for (let k = 0; k < 9; k++) {
    const x = 380 + k * 34 + Math.floor(R() * 12);
    if (Math.abs(x - silla) < 30 || Math.abs(x - 520) < 10) continue;
    personita(C, x, MUELLE, { ropa: (['rojo', 'amarillo', 'luz', 'celeste', 'crema'] as Color[])[k % 5], pant: k % 2 ? 'azul_noche' : 'sombra', pelo: 'tinta', piel: 'salmon', alto: 20 + (k % 3), pose: (k + f) % 3 === 0 ? 2 : 0, sombrero: k % 4 === 0 ? 'crema' : undefined });
  }
}

export interface CuadroHalong { f?: number }

/** La bahía completa sobre la capa cerca (alto franja.atras). `q.f` mueve el agua, las banderas y la gente. */
export function pintarHalong(C: Lienzo, seed: number, q: CuadroHalong = {}) {
  const f = q.f ?? 0;
  bahia(C, seed, f);
  for (const [i, s] of ISLOTES.entries()) isloteGrande(C, s.x, s.w, s.alto, seed + i * 13);
  aldea(C, seed + 4);
  junco(C, f);
  // un bote de pesca con su red
  C.f(300, 204, 18, 3, 'asfalto'); C.hl(300, 203, 18, 'terracota'); personita(C, 306, 204, { ropa: 'azul', pant: 'sombra', pelo: 'tinta', piel: 'salmon', alto: 12, sombrero: 'amarillo' });
  muelle(C, seed, f);
}

export const fondoHalong = (C: Lienzo, _x0: number, _x1: number, _base: number, ctx: CtxCerca) => pintarHalong(C, ctx.seed);

// ---------------------------------------------------------------------------------------------------------------------
// El piso: el muelle flotante y la piscina

/** Las tablas del muelle flotante: madera con las juntas y los clavos. */
export function tablas(x: number, y: number, s: number): Color {
  if ((y + 3) % 6 === 0) return 'terracota';
  if (((x + (Math.floor(y / 6) % 2) * 17) % 37) === 0) return 'vino';
  return grain(x, y, s) < 0.08 ? 'terracota' : 'ocre';
}

/** La piscina, sobre las tablas: el borde blanco, el agua azul con las líneas del fondo, las corcheras, la marca de 15 m y la pared de llegada. */
export function piscinaHalong(P: Lienzo, _L: ObliqueLayout, seed: number) {
  const { y0, y1, salida, llegada, corcheras, carriles, m15, pared } = PISCINA;
  // el borde blanco
  for (let y = y0 - 2; y < y1 + 2; y++) for (let x = salida - 4; x < llegada + pared + 2; x++) P.p(x, y, 'luz');
  // el agua: más honda adelante, con el brillo
  for (let y = y0; y < y1; y++) for (let x = salida - 2; x < llegada; x++) {
    const t = (y - y0) / (y1 - y0);
    let c: Color = t < 0.4 ? (bayer(x, y) < 0.3 ? 'celeste' : 'azul') : bayer(x, y) < (t - 0.4) * 0.7 ? 'azul_noche' : 'azul';
    if (grain(x, y, seed) < 0.03) c = 'celeste';
    P.p(x, y, c);
  }
  // la línea del fondo de cada carril, con la T al llegar
  for (const c of carriles) for (let x = salida + 30; x < llegada - 12; x++) P.p(x, c - 6, 'azul_noche');
  for (const c of carriles) for (let y = c - 10; y < c - 2; y++) P.p(llegada - 14, y, 'azul_noche');
  // las corcheras: rojas y blancas
  for (const y of corcheras) for (let x = salida; x < llegada; x += 4) { const blanca = Math.floor((x - salida) / 4) % 3 === 0; for (let i = 0; i < 3; i++) { P.p(x + i, y, blanca ? 'luz' : 'rojo'); P.p(x + i, y + 1, blanca ? 'cemento_claro' : 'vino'); } }
  // la marca de 15 m
  for (let y = y0; y < y1; y += 3) P.p(m15, y, 'amarillo');
  // la pared de llegada a cuadros negros y amarillos
  for (let y = y0; y < y1; y++) for (let x = llegada; x < llegada + pared; x++) P.p(x, y, x < llegada + 2 || x >= llegada + pared - 2 ? 'cemento_claro' : Math.floor(y / 4) % 2 ? 'tinta' : 'amarillo');
}

/** Lo de adelante de la piscina: el borde del muelle con los flotadores y la bahía esmeralda. */
export function orillaHalong(x: number, r: number, s: number): Color {
  if (r < 2) return r === 0 ? 'terracota' : (x % 22) < 18 ? 'azul' : 'sombra';
  const ola = Math.sin(x / 8 + r * 1.9) + Math.sin(x / 21 - r + s);
  if (ola > 1.6) return 'menta';
  return r < 4 ? 'verde_oscuro' : 'canal';
}

// ---------------------------------------------------------------------------------------------------------------------
// Vida, luces y partículas

/** Una gaviota que planea lejos, 2 cuadros. */
function gaviota(pal: Paleta): Lienzo[] {
  return [0, 1].map((f) => {
    const L = new Lienzo(11, 5, pal);
    L.f(4, 2, 3, 1, 'luz'); L.p(7, 2, 'amarillo');
    if (f) { L.ln(4, 2, 0, 0, 'luz'); L.ln(6, 2, 10, 0, 'cemento_claro'); } else { L.ln(4, 2, 0, 3, 'luz'); L.ln(6, 2, 10, 3, 'cemento_claro'); }
    return L;
  });
}

/** Un junco chiquito que navega lejos, con las velas de ladrillo. */
function juncoLejos(pal: Paleta): Lienzo[] {
  const L = new Lienzo(16, 13, pal);
  L.f(1, 10, 14, 2, 'asfalto'); L.hl(0, 9, 16, 'terracota');
  for (const [mx, alto] of [[4, 7], [8, 9], [12, 6]] as const) for (let j = 0; j < alto; j++) for (let i = 0; i < 3; i++) L.p(mx + i, 9 - alto + j, j % 3 === 0 ? 'vino' : 'terracota');
  return [L];
}

export function vidaHalong(pal: Paleta, L: ObliqueLayout, _k: number, seed: number, capas: { cerca: Lienzo; piso: Lienzo }): VidaEscena[] {
  const out: VidaEscena[] = [], quiere = (t: string) => L.vida.includes(t), W = capas.cerca.w, H = capas.cerca.h;
  const cuadros = (n: number) => Array.from({ length: n }, (_, f) => { const c = new Lienzo(W, H, pal); pintarHalong(c, seed, { f }); return c; });
  const cs = quiere('banderas') || quiere('publico') ? cuadros(2) : [];
  if (quiere('banderas')) {
    const { letrero } = MUELLE_COSAS, w1 = anchoTexto('VỊNH HẠ LONG') + 14;
    for (const [i, bx] of [letrero - 30, letrero + w1 + 16, 520, 880, 1180].entries()) {
      const x = bx - 1, y = MUELLE - 38, w = 20, h = 16;
      out.push({ id: `bandera_${i}`, tipo: 'banderas', capa: 'cerca', x, y, cuadros: cs.map((c) => recorte(c, x, y, w, h)), fps: 2 });
    }
  }
  if (quiere('publico')) {
    const x = 376, y = MUELLE - 30, w = 320, h = 30;
    out.push({ id: 'publico', tipo: 'publico', capa: 'cerca', x, y, cuadros: cs.map((c) => recorte(c, x, y, w, h)), fps: 1.5 });
  }
  if (quiere('juncos')) {
    out.push({ id: 'junco_lejos_0', tipo: 'juncos', capa: 'lejos', x: -16, y: 146, cuadros: juncoLejos(pal), fps: 1, recorrido: { desde: [-16, 146], hasta: [1280, 146], segundos: 140, desfase: 0.15 } });
    out.push({ id: 'junco_lejos_1', tipo: 'juncos', capa: 'lejos', x: 1280, y: 150, cuadros: juncoLejos(pal), fps: 1, recorrido: { desde: [1280, 150], hasta: [-16, 150], segundos: 170, desfase: 0.7 } });
  }
  if (quiere('gaviotas')) {
    out.push({ id: 'gaviota_0', tipo: 'gaviotas', capa: 'lejos', x: 1280, y: 104, cuadros: gaviota(pal), fps: 3, recorrido: { desde: [1280, 104], hasta: [-12, 112], segundos: 34, desfase: 0.4 } });
    out.push({ id: 'gaviota_1', tipo: 'gaviotas', capa: 'lejos', x: 1290, y: 112, cuadros: gaviota(pal), fps: 3, recorrido: { desde: [1296, 112], hasta: [0, 118], segundos: 34, desfase: 0.43 } });
  }
  return out;
}

/** Al mediodía no hay luces prendidas. */
export function lucesHalong(_pal: Paleta, _L: ObliqueLayout, _k: number): Luz[] {
  return [];
}

export function particulasHalong(pal: Paleta, L: ObliqueLayout, _k: number): Particula[] {
  return [
    { tipo: 'brillo', x0: 0, x1: L.largo, y0: HORIZONTE_CERCA, y1: MUELLE, color: [pal.luz, pal.menta], cada: 0.3, vida: 0.5, nota: 'el sol del mediodía que brilla en la bahía' },
    { tipo: 'brillo', x0: PISCINA.salida, x1: PISCINA.llegada, y0: FT + PISCINA.y0, y1: FT + PISCINA.y1, color: [pal.luz, pal.celeste], cada: 0.5, vida: 0.4, nota: 'el brillo del agua de la piscina' },
  ];
}

export const HALONG: Lugar = {
  estilo: 'vietnam_bahia',
  fondo: fondoHalong,
  lejos: { islotes_halong: islotesHalong },
  pisos: { madera: (x, y, s) => tablas(x, y, s) },
  orilla: orillaHalong,
  marcas: piscinaHalong,
  vida: vidaHalong,
  luces: lucesHalong,
  particulas: particulasHalong,
};

void sombraOval;
