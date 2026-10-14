import { rng, grain, bayer } from '../../fx/pix';
import { Lienzo } from './lienzo';
import type { Color, Paleta } from './paleta';
import type { CtxCerca } from './fachadas';
import type { ObliqueLayout } from './layout';
import type { Luz, Particula, VidaEscena } from './escena';
import type { Lugar } from './lugares';
import { recorte, textoGrande, anchoTexto, personita, sombraOval } from './pinceles';

/**
 * El valle de Cocora, en el Eje Cafetero, en la mañana (estilo `colombia_cafetera`), de lado, para las Vallas del Café.
 * Lejos, las montañas de la cordillera en planos que se aclaran en la neblina, con las palmas de cera que asoman por
 * encima de la loma. Cerca, el valle verde con las palmas de cera altísimas, una finca de Salento con el balcón de
 * colores y el cafetal, el Willys cargado de café, las vacas, la cerca de alambre y el letrero de madera. El piso es la
 * pista de tartán con las rayas de los carriles, la salida y la meta donde las pinta Vallas.ts.
 */

export const CERCA_COCORA = 'valle_cocora';
/** La franja de Vallas.ts: TOP 228 y 120 de fondo (de la fila 228 a la 348). */
const FT = 228;
/** Las rayas de la pista y la salida y la meta de Vallas.ts: rayas en y 0, 28, 56, 84 y 112, salida en x 120, meta en x 1570. */
export const PISTA = { rayas: [0, 28, 56, 84, 112], carriles: [18, 46, 74, 102], salida: 120, meta: 1570, marca: 100, fin: 116 };
/** Las palmas de cera grandes de la capa cerca: x del pie, fila de la copa y para dónde se inclinan. */
export const PALMAS_CERA: { x: number; copa: number; lado: 1 | -1 }[] = [
  { x: 42, copa: 148, lado: 1 }, { x: 228, copa: 138, lado: -1 }, { x: 452, copa: 152, lado: 1 }, { x: 760, copa: 140, lado: -1 },
  { x: 1012, copa: 146, lado: 1 }, { x: 1248, copa: 136, lado: -1 }, { x: 1440, copa: 150, lado: 1 }, { x: 1654, copa: 142, lado: -1 },
];
/** La finca de Salento: de dónde a dónde y la fila del techo. */
export const FINCA = { x0: 560, x1: 672, techo: 166, piso: 206 };
/** El Willys en el camino de tierra. */
export const WILLYS = { x: 880, piso: 208 };
/** Las vacas que pastan en la loma. */
export const VACAS = [{ x: 1160, piso: 204, lado: 1 as const }, { x: 1206, piso: 200, lado: -1 as const }, { x: 1530, piso: 204, lado: 1 as const }];
/** El letrero de madera de la entrada. */
export const LETRERO_COCORA = { x: 290, y: 172 };

// ---------------------------------------------------------------------------------------------------------------------
// Lo lejos: la cordillera con la neblina y las palmas de cera en la loma

/** Una onda que da vueltas enteras en el ancho de la capa lejos: así se repite sin costura. */
const onda = (x: number, w: number, vueltas: number, fase: number) => Math.sin((x / w) * Math.PI * 2 * vueltas + fase);

/** Una palma de cera chiquita, lejos: el tronco finito claro y el penacho oscuro. */
function palmita(L: Lienzo, x: number, pie: number, alto: number) {
  for (let j = 0; j < alto; j++) L.p(x, pie - j, j % 5 === 2 ? 'asfalto_claro' : 'cemento');
  const t = pie - alto;
  for (const [dx, dy] of [[-3, 1], [-2, 0], [-1, -1], [0, -1], [1, -1], [2, 0], [3, 1], [-4, 2], [4, 2], [0, 0]]) L.p(x + dx, t + dy, 'verde_oscuro');
}

/**
 * La cordillera en la mañana: la montaña de más atrás azul, los cerros azul verdosos, la banda de neblina que se queda
 * en los valles y la loma verde de adelante con el monte en manchones y las palmas de cera que asoman por encima. Arriba
 * queda transparente: ahí va el cielo.
 */
export function cordilleraCocora(pal: Paleta, w: number, h: number, seed: number): Lienzo {
  const L = new Lienzo(w, h, pal);
  // la montaña de más atrás: picos altos y quebrados, azul noche con el filo claro
  for (let x = 0; x < w; x++) {
    const a = Math.round(98 + onda(x, w, 3, 0.4) * 10 + onda(x, w, 7, 1.3) * 6 + onda(x, w, 17, 2) * 2);
    for (let y = a; y < h; y++) L.p(x, y, y === a ? 'canal' : bayer(x, y) < 0.15 ? 'canal' : 'azul_noche');
  }
  // los cerros de en medio, azul verdoso, más claros abajo donde los toca la neblina
  for (let x = 0; x < w; x++) {
    const a = Math.round(116 + onda(x, w, 5, 2.1) * 7 + onda(x, w, 11, 0.7) * 4);
    for (let y = a; y < h; y++) {
      const t = (y - a - 12) / 10;
      L.p(x, y, y === a ? 'menta' : t > 0 && bayer(x, y) < t * 0.6 ? 'bruma' : grain(x >> 3, y >> 3, seed) < 0.2 ? 'verde_oscuro' : 'canal');
    }
  }
  // la neblina de los valles: una banda blanca tramada que se come el pie de los cerros
  for (let x = 0; x < w; x++) {
    const a = Math.round(134 + onda(x, w, 4, 0.2) * 3);
    for (let y = a; y < a + 7; y++) if (bayer(x, y) < 0.42 - (y - a) * 0.05) L.p(x, y, 'bruma');
  }
  // la loma de adelante: verde, con el monte en manchones redondos y el filo con luz
  const filo = (x: number) => Math.round(142 + onda(x, w, 2, 1.1) * 6 + onda(x, w, 9, 0.3) * 2);
  for (let x = 0; x < w; x++) {
    const a = filo(x);
    for (let y = a; y < h; y++) {
      let c: Color = y === a ? 'menta' : bayer(x, y) < 0.3 ? 'verde_oscuro' : 'verde';
      if (grain(x >> 3, y >> 2, seed + 4) < 0.3 && y > a + 2) c = 'verde_oscuro';
      if (grain(x >> 2, y >> 2, seed + 6) < 0.06 && y > a + 3) c = 'sombra';
      L.p(x, y, c);
    }
  }
  // las palmas de cera en la loma: en grupitos, más altas que el monte (es lo que se ve de lejos en Cocora)
  const R = rng(seed + 11);
  for (let g = 0; g < 7; g++) {
    const gx = Math.floor((g + 0.2 + R() * 0.6) * (w / 7));
    for (let i = 0; i < 2 + Math.floor(R() * 2); i++) {
      const x = (gx + i * (5 + Math.floor(R() * 6))) % w, pie = filo(x) + 6;
      palmita(L, x, pie, 16 + Math.floor(R() * 12));
    }
  }
  return L;
}

// ---------------------------------------------------------------------------------------------------------------------
// La capa cerca: el valle

/** El alto de la loma de atrás del valle (fila donde empieza el pasto) en la columna x. */
const lomaAtras = (x: number) => Math.round(178 + Math.sin(x / 140) * 9 + Math.sin(x / 47 + 1) * 3);
/** La loma de adelante, el potrero que baja hasta la cerca. */
const lomaAdelante = (x: number) => Math.round(196 + Math.sin(x / 210 + 2) * 5 + Math.sin(x / 61) * 2);

/** El pasto del valle: verde con luz arriba, matas y florecitas, más oscuro donde la loma se dobla. */
function pasto(x: number, y: number, s: number, top: number): Color {
  if (y === top) return 'menta';
  const n = grain(x, y, s);
  if (n < 0.012) return 'amarillo';
  if (n > 0.992) return 'luz';
  if (grain(x >> 2, y >> 1, s + 1) < 0.18) return 'verde_oscuro';
  return bayer(x, y) < (y - top) / 40 ? 'verde' : grain(x, y, s + 2) < 0.2 ? 'menta' : 'verde';
}

/**
 * Una palma de cera: el tronco altísimo y finito, liso, gris claro con la luz de la izquierda y los anillos oscuros, y
 * arriba la copa chica de hojas largas que se doblan, verde oscuro por encima y plateadas por debajo.
 */
export function palmaCera(C: Lienzo, x: number, pie: number, copa: number, lado: 1 | -1, seed: number) {
  const alto = pie - copa;
  for (let j = 0; j < alto; j++) {
    const y = pie - j, cx = x + Math.round(lado * (j / alto) ** 2 * 6), anillo = (j + (seed & 3)) % 6 === 0;
    C.p(cx - 1, y, anillo ? 'asfalto' : 'cemento_claro');
    C.p(cx, y, anillo ? 'asfalto' : j % 9 < 2 ? 'luz' : 'cemento_claro');
    C.p(cx + 1, y, anillo ? 'asfalto' : 'cemento');
    C.p(cx + 2, y, anillo ? 'sombra' : 'asfalto_claro');
  }
  // la base de la copa: el capitel verde de donde salen las hojas
  const tx = x + lado * 6, ty = copa;
  C.f(tx - 1, ty - 2, 4, 5, 'verde'); C.vl(tx + 2, ty - 2, 5, 'verde_oscuro');
  // las hojas: arcos que salen para los dos lados y caen; el envés plateado se ve en las que bajan
  const R = rng(seed);
  for (let k = 0; k < 13; k++) {
    const ang = -Math.PI * (0.04 + (k / 12) * 0.92), largo = 22 + Math.floor(R() * 10);
    for (let i = 0; i < largo; i++) {
      const px = Math.round(tx + 1 + Math.cos(ang) * i * 1.1), py = Math.round(ty + Math.sin(ang) * i * 0.75 + (i * i) / (largo * 1.4));
      const baja = py > ty + 2;
      C.p(px, py, baja && i > largo / 2 ? 'cemento_claro' : i % 4 === 0 ? 'verde' : 'verde_oscuro');
      // los folíolos: rayitas que cuelgan del nervio
      if (i > 3 && i % 2 === 0) { C.p(px, py + 1, baja ? 'cemento' : 'verde_oscuro'); C.p(px, py + 2, baja ? 'cemento_claro' : i % 4 ? 'verde_oscuro' : 'verde'); }
    }
  }
}

/** Una mata de café con las cerezas rojas y alguna amarilla. */
function cafeto(C: Lienzo, x: number, piso: number, seed: number) {
  const R = rng(seed);
  for (let j = 0; j < 10; j++) {
    const hw = Math.round(2 + Math.sin((j / 10) * Math.PI) * 4);
    for (let i = -hw; i <= hw; i++) C.p(x + i, piso - j, bayer(x + i, piso - j) < 0.35 ? 'verde' : 'verde_oscuro');
  }
  for (let k = 0; k < 5; k++) C.p(x - 4 + Math.floor(R() * 9), piso - 2 - Math.floor(R() * 7), R() < 0.8 ? 'rojo' : 'amarillo');
  C.hl(x - 4, piso + 1, 9, 'sombra');
}

/**
 * La finca de Salento: la casa encalada de bahareque con el techo de teja de barro, el balcón corrido de madera pintado
 * de colores, las puertas y las ventanas de colores, las materas con flores y el cafetal al lado.
 */
function finca(C: Lienzo, seed: number) {
  const { x0, x1, techo, piso } = FINCA, w = x1 - x0;
  sombraOval(C, (x0 + x1) / 2 + 8, piso + 1, w / 2 + 6, 3, 'verde_oscuro', 0.6);
  // las paredes blancas con el zócalo rojo
  C.f(x0, techo + 6, w, piso - techo - 6, 'crema'); C.vl(x1 - 1, techo + 6, piso - techo - 6, 'cemento_claro');
  C.f(x0, piso - 6, w, 6, 'rojo'); C.hl(x0, piso - 6, w, 'vino');
  // las puertas y ventanas de madera de colores (la de Salento: roja, azul, amarilla, verde)
  const colores: Color[] = ['rojo', 'azul', 'amarillo', 'verde'];
  for (let i = 0; i < 4; i++) {
    const vx = x0 + 8 + i * 26, c = colores[i];
    if (i % 2 === 0) { C.box(vx, piso - 22, 12, 16, c, 'sombra'); C.vl(vx + 6, piso - 21, 14, 'sombra'); }
    else { C.box(vx, piso - 20, 12, 10, c, 'sombra'); C.vl(vx + 6, piso - 19, 8, 'luz'); }
    // las ventanas de arriba con su balcón
    C.box(vx + 1, techo + 10, 10, 9, colores[(i + 2) % 4], 'sombra');
  }
  // el balcón corrido de madera con las chambranas (los barrotes) pintados de azul y amarillo
  C.hl(x0 - 4, techo + 20, w + 8, 'azul_noche'); C.hl(x0 - 4, techo + 21, w + 8, 'azul');
  for (let x = x0 - 4; x < x1 + 4; x += 3) C.vl(x, techo + 22, 6, x % 2 ? 'amarillo' : 'azul');
  C.hl(x0 - 4, techo + 28, w + 8, 'azul_noche');
  // las materas con flores colgadas del balcón
  for (let x = x0 + 4; x < x1; x += 18) { C.f(x, techo + 29, 5, 3, 'terracota'); for (const [dx, dy, c] of [[0, -1, 'salmon'], [2, -2, 'rojo'], [4, -1, 'amarillo'], [1, 3, 'verde'], [3, 4, 'verde']] as const) C.p(x + dx, techo + 29 + dy, c); }
  // el techo de teja de barro a dos aguas, con el alero que sale
  for (let j = 0; j < 9; j++) {
    const y = techo - 3 + j, a = x0 - 8 + Math.round((8 - j) * 0.5), b = x1 + 8 - Math.round((8 - j) * 0.5);
    for (let x = a; x < b; x++) C.p(x, y, j === 8 ? 'vino' : (x + (j & 1) * 2) % 4 === 0 ? 'vino' : j < 2 ? 'salmon' : 'terracota');
  }
  // la chimenea del fogón con el humito
  C.f(x1 - 20, techo - 10, 5, 8, 'crema'); C.hl(x1 - 21, techo - 11, 7, 'terracota');
  void seed;
  // el cafetal al lado de la casa, en hileras
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) cafeto(C, x1 + 18 + i * 13 + j * 6, piso - 4 + j * 8, seed + i * 7 + j);
  for (let i = 0; i < 4; i++) cafeto(C, x0 - 60 + i * 14, piso + 2, seed + 50 + i);
}

/**
 * El Willys: el yip de los cafeteros, verde oliva... aquí azul, con el capó cuadrado, el parabrisas plegado, las llantas
 * grandes, cargado de bultos de café y un racimo de plátano. El conductor con sombrero aguadeño.
 */
function willys(C: Lienzo) {
  const { x, piso } = WILLYS;
  sombraOval(C, x + 22, piso + 1, 26, 2.5, 'sombra', 0.6);
  // la carrocería: el capó adelante (a la derecha), la cabina abierta y el platón atrás
  C.f(x, piso - 14, 46, 8, 'azul'); C.hl(x, piso - 14, 46, 'celeste'); C.hl(x, piso - 7, 46, 'azul_noche');
  C.f(x + 32, piso - 18, 14, 4, 'azul'); C.hl(x + 32, piso - 18, 14, 'celeste');
  // la parrilla y el farol
  C.vl(x + 45, piso - 17, 10, 'asfalto'); C.p(x + 45, piso - 15, 'luz');
  // el parabrisas y el volante
  C.ln(x + 30, piso - 18, x + 27, piso - 27, 'asfalto'); C.hl(x + 27, piso - 27, 4, 'asfalto'); C.ln(x + 24, piso - 18, x + 27, piso - 22, 'sombra');
  // el conductor con el sombrero aguadeño y la ruana
  C.f(x + 18, piso - 26, 6, 9, 'rojo'); C.f(x + 19, piso - 31, 4, 5, 'salmon'); C.hl(x + 16, piso - 32, 10, 'crema'); C.f(x + 18, piso - 34, 6, 2, 'crema'); C.hl(x + 18, piso - 33, 6, 'tinta');
  // los bultos de café de fique en el platón y el racimo de plátano
  for (const [dx, dy] of [[2, 0], [9, 0], [5, -6]] as const) { C.f(x + dx, piso - 21 + dy, 8, 7, 'ocre'); C.hl(x + dx, piso - 21 + dy, 8, 'amarillo'); C.vl(x + dx + 7, piso - 21 + dy, 7, 'terracota'); C.hl(x + dx + 2, piso - 18 + dy, 4, 'terracota'); }
  for (let k = 0; k < 4; k++) C.f(x + 2 + k * 2, piso - 31 + (k & 1), 2, 4, k % 2 ? 'oro' : 'amarillo');
  C.vl(x + 4, piso - 33, 3, 'verde_oscuro');
  // las llantas grandes con el rin
  for (const lx of [x + 8, x + 38]) { C.d(lx, piso - 4, 4, 'tinta'); C.d(lx, piso - 4, 1.6, 'cemento'); C.p(lx - 1, piso - 6, 'asfalto_claro'); }
}

/** Una vaca pastando de lado: blanca con manchas, la cabeza abajo comiendo (f 0) o arriba mirando (f 1). */
function vaca(C: Lienzo, x: number, piso: number, lado: 1 | -1, f: number) {
  const X = (i: number) => x + lado * i;
  sombraOval(C, x + lado * 8, piso + 1, 11, 2, 'verde_oscuro', 0.6);
  for (let j = 0; j < 7; j++) for (let i = 0; i < 16; i++) C.p(X(i), piso - 6 - j, grain(i >> 2, j >> 1, x) < 0.35 ? 'sombra' : j === 6 ? 'luz' : j < 2 ? 'cemento_claro' : 'crema');
  for (const i of [1, 3, 12, 14]) C.f(Math.min(X(i), X(i + 1)), piso - 6, 2, 6, i === 3 || i === 14 ? 'cemento' : 'cemento_claro');
  // la cabeza: abajo en el pasto o arriba
  const hy = f ? piso - 14 : piso - 6;
  C.f(Math.min(X(16), X(19)), hy, 4, 4, 'crema'); C.p(X(19), hy + 3, 'salmon'); C.p(X(17), hy + 1, 'tinta'); C.p(X(16), hy - 1, 'cemento');
  if (!f) for (const i of [17, 18, 19]) C.p(X(i), piso, 'menta');
  C.vl(X(-1), piso - 12, 5, 'cemento'); C.p(X(-1), piso - 7, 'sombra');
}

/** El letrero de madera de la entrada del valle: VALLE DE COCORA y SALENTO, QUINDÍO, tallado en dos palos. */
function letreroCocora(C: Lienzo) {
  const { x, y } = LETRERO_COCORA, t1 = 'VALLE DE COCORA', w = anchoTexto(t1) + 12, h = 26, piso = 210;
  for (const px of [x + 6, x + w - 9]) { C.f(px, y + h, 3, piso - y - h, 'terracota'); C.vl(px, y + h, piso - y - h, 'ocre'); }
  C.box(x, y, w, h, 'ocre', 'vino'); C.hl(x + 1, y + 1, w - 2, 'amarillo');
  for (let j = y + 4; j < y + h - 1; j += 6) C.hl(x + 1, j, w - 2, 'terracota');
  textoGrande(C, x + 6, y + 3, t1, 'luz', 2, 'vino');
  const t2 = 'SALENTO, QUINDÍO', w2 = anchoTexto(t2, 1);
  textoGrande(C, x + Math.round((w - w2) / 2), y + 16, t2, 'verde_oscuro', 1);
  // un tallo de flores al pie del letrero
  for (let i = 0; i < 6; i++) C.p(x + 10 + i * 9, piso - 1 - (i & 1), i % 2 ? 'salmon' : 'amarillo');
}

/** La cerca de palos y alambre a lo largo de la pista, con el pasto que le crece al pie. */
function cercaAlambre(C: Lienzo) {
  for (let x = 0; x < C.w; x++) {
    for (const [dy, c] of [[204, 'asfalto_claro'], [210, 'asfalto_claro'], [216, 'asfalto_claro']] as const) if ((x + dy) % 7 !== 0) C.p(x, dy + Math.round(Math.sin(x / 13) * 0.6), c);
  }
  for (let x = 6; x < C.w; x += 26) {
    C.f(x, 200, 3, 24, 'ocre'); C.vl(x, 200, 24, 'amarillo'); C.vl(x + 2, 200, 24, 'terracota'); C.hl(x, 200, 3, 'vino');
  }
}

export interface CuadroCocora { vacas?: number }

/** El valle completo sobre la capa cerca (alto franja.atras). `q` dice el cuadro de lo que se mueve. */
export function pintarCocora(C: Lienzo, seed: number, q: CuadroCocora = {}) {
  const W = C.w;
  // la loma de atrás y el potrero de adelante, hasta la pista
  for (let x = 0; x < W; x++) {
    const a = lomaAtras(x), b = lomaAdelante(x);
    for (let y = a; y < FT; y++) C.p(x, y, y < b ? (y === a ? 'menta' : bayer(x, y) < 0.4 ? 'verde_oscuro' : 'verde') : pasto(x, y, seed, b));
  }
  // el monte de la loma de atrás: matorrales y árboles en manchones
  const R = rng(seed + 3);
  for (let k = 0; k < W / 40; k++) {
    const x = Math.floor(R() * W), a = lomaAtras(x);
    for (let j = -5; j <= 5; j++) for (let i = -9; i <= 9; i++) if (i * i / 81 + j * j / 25 < 1 && a + j + 2 < lomaAdelante(x + i)) C.p(x + i, a + j + 2, j < -2 && i < 0 ? 'verde' : bayer(x + i, a + j) < 0.3 ? 'sombra' : 'verde_oscuro');
  }
  // el camino de tierra que sube por el potrero hasta la finca
  for (let x = 0; x < W; x++) for (let y = 205; y < 209; y++) if (x > 420 && x < 1120) C.p(x, y, y === 205 ? 'cemento_claro' : grain(x, y, seed) < 0.3 ? 'terracota' : 'ocre');
  finca(C, seed + 5);
  // las palmas de cera chicas de la loma de atrás (más lejos: más finitas y más claras)
  for (let k = 0; k < 14; k++) {
    const x = 30 + k * 123 + Math.floor(grain(k, 3, seed) * 40), a = lomaAtras(x);
    for (let j = 0; j < 40 + (k % 3) * 8; j++) C.p(x, a + 2 - j, j % 5 === 0 ? 'cemento' : 'cemento_claro');
    const t = a + 2 - 40 - (k % 3) * 8;
    for (const [dx, dy] of [[-4, 2], [-3, 1], [-2, 0], [-1, -1], [1, -1], [2, 0], [3, 1], [4, 2], [-5, 3], [5, 3], [0, -1]]) C.p(x + dx, t + dy, 'verde_oscuro');
  }
  letreroCocora(C);
  willys(C);
  for (const v of VACAS) vaca(C, v.x, v.piso, v.lado, q.vacas ?? 0);
  // unos caminantes en el sendero, chiquitos
  personita(C, 1080, 205, { ropa: 'amarillo', pant: 'azul', pelo: 'tinta', piel: 'salmon', alto: 18 });
  personita(C, 1092, 205, { ropa: 'rojo', pant: 'azul_noche', pelo: 'ocre', piel: 'salmon', alto: 17, sombrero: 'crema' });
  // las palmas de cera grandes, con su sombra en el potrero
  for (const p of PALMAS_CERA) sombraOval(C, p.x + 10, 220, 10, 1.6, 'verde_oscuro', 0.5);
  for (const p of PALMAS_CERA) palmaCera(C, p.x, 222, p.copa, p.lado, seed + p.x);
  cercaAlambre(C);
  // el borde del pasto contra la pista
  for (let x = 0; x < W; x++) { C.p(x, FT - 4, 'verde'); C.p(x, FT - 3, 'verde_oscuro'); C.p(x, FT - 2, bayer(x, 2) < 0.5 ? 'verde_oscuro' : 'sombra'); C.p(x, FT - 1, 'sombra'); }
}

export const fondoCocora = (C: Lienzo, _x0: number, _x1: number, _base: number, ctx: CtxCerca) => pintarCocora(C, ctx.seed);

// ---------------------------------------------------------------------------------------------------------------------
// El piso: la pista de tartán

/** El tartán rojo de la pista, con su granito. */
export function tartan(x: number, y: number, s: number): Color {
  const n = grain(x, y, s);
  if (n < 0.08) return 'terracota';
  if (n > 0.95) return 'salmon';
  return 'rojo';
}

/** Las rayas de los carriles, la salida, la meta a cuadros y las marquitas cada 100 px, donde las pintaba Vallas.ts. */
export function rayasCocora(P: Lienzo, _L: ObliqueLayout, _seed: number) {
  const { rayas, salida, meta, marca, fin } = PISTA, W = P.w;
  for (const y of rayas) for (let x = 0; x < W; x++) { P.p(x, y, 'luz'); P.p(x, y + 1, 'luz'); }
  for (let y = 0; y < fin - 2; y++) for (let i = 0; i < 3; i++) P.p(salida + i, y, 'luz');
  for (let y = 2; y < fin - 2; y++) for (let k = 0; k < 3; k++) for (let i = 0; i < 4; i++) P.p(meta + k * 4 + i, y, (Math.floor(y / 4) + k) % 2 ? 'tinta' : 'luz');
  for (let x = salida + marca; x < meta; x += marca) for (let y = 2; y < fin - 2; y += 6) P.p(x, y, 'luz');
  // el borde de pasto de adelante
  for (let y = fin; y < P.h; y++) for (let x = 0; x < W; x++) P.p(x, y, y === fin ? 'verde_oscuro' : 'verde');
}

/** Lo de adelante de la pista: el pasto con las matas de café y florecitas. */
export function orillaCocora(x: number, r: number, s: number): Color {
  const xr = ((x % 1720) + 1720) % 1720;
  if (xr % 97 < 12 && r > 2) { const cx = xr - (xr % 97) + 6, d = Math.hypot((xr - cx) / 1.3, r - 8); if (d < 5) return grain(xr, r, s) < 0.1 ? 'rojo' : d < 3 ? 'verde_oscuro' : 'verde'; }
  return pasto(x, r + 60, s, -1);
}

// ---------------------------------------------------------------------------------------------------------------------
// Vida, luces y partículas

/** Una banda de neblina que pasa por delante de los cerros (en la capa lejos). */
function bandaNeblina(pal: Paleta, w: number, h: number, seed: number): Lienzo[] {
  const L = new Lienzo(w, h, pal);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const t = Math.sin((y / h) * Math.PI) * Math.sin((x / w) * Math.PI);
    if (bayer(x, y) < t * 0.55 && grain(x >> 3, y >> 1, seed) < 0.85) L.p(x, y, t > 0.7 ? 'luz' : 'bruma');
  }
  return [L];
}

/** Un loro orejiamarillo (el de las palmas de cera) que vuela: verde, con la cara amarilla y las alas que baten, 2 cuadros. */
function loro(pal: Paleta): Lienzo[] {
  return [0, 1].map((f) => {
    const L = new Lienzo(11, 7, pal);
    L.f(3, 3, 5, 2, 'verde'); L.p(8, 3, 'amarillo'); L.p(9, 3, 'amarillo'); L.p(10, 4, 'sombra'); L.hl(0, 4, 3, 'verde_oscuro');
    if (f) { L.ln(4, 3, 2, 0, 'verde'); L.ln(6, 3, 8, 0, 'verde_oscuro'); } else { L.ln(4, 4, 2, 6, 'verde'); L.ln(6, 4, 8, 6, 'verde_oscuro'); }
    return L;
  });
}

export function vidaCocora(pal: Paleta, L: ObliqueLayout, _k: number, seed: number, capas: { cerca: Lienzo; piso: Lienzo }): VidaEscena[] {
  const out: VidaEscena[] = [], quiere = (t: string) => L.vida.includes(t), W = capas.cerca.w, H = capas.cerca.h;
  if (quiere('neblina')) {
    out.push({ id: 'neblina_0', tipo: 'neblina', capa: 'lejos', x: -300, y: 118, cuadros: bandaNeblina(pal, 300, 20, seed), fps: 1, recorrido: { desde: [-300, 118], hasta: [1280, 114], segundos: 100, desfase: 0.2 } });
    out.push({ id: 'neblina_1', tipo: 'neblina', capa: 'lejos', x: 1280, y: 136, cuadros: bandaNeblina(pal, 360, 16, seed + 1), fps: 1, recorrido: { desde: [1280, 136], hasta: [-360, 140], segundos: 130, desfase: 0.65 } });
  }
  if (quiere('vacas')) {
    const cs = [0, 1].map((f) => { const c = new Lienzo(W, H, pal); pintarCocora(c, seed, { vacas: f }); return c; });
    for (const [i, v] of VACAS.entries()) {
      const x = v.x - (v.lado < 0 ? 22 : 4), y = v.piso - 18, w = 28, h = 21;
      out.push({ id: `vaca_${i}`, tipo: 'vacas', capa: 'cerca', x, y, cuadros: cs.map((c) => recorte(c, x, y, w, h)), fps: i % 2 ? 0.4 : 0.3 });
    }
  }
  if (quiere('loros')) {
    out.push({ id: 'loros_0', tipo: 'loros', capa: 'lejos', x: -12, y: 108, cuadros: loro(pal), fps: 6, recorrido: { desde: [-12, 108], hasta: [1280, 96], segundos: 26, desfase: 0.3 } });
    out.push({ id: 'loros_1', tipo: 'loros', capa: 'lejos', x: -24, y: 112, cuadros: loro(pal), fps: 6, recorrido: { desde: [-24, 112], hasta: [1268, 100], segundos: 26, desfase: 0.32 } });
  }
  return out;
}

/** En la mañana no hay luces prendidas. */
export function lucesCocora(_pal: Paleta, _L: ObliqueLayout, _k: number): Luz[] {
  return [];
}

export function particulasCocora(pal: Paleta, L: ObliqueLayout, _k: number): Particula[] {
  return [
    { tipo: 'neblina', x0: 0, x1: L.largo, y0: 150, y1: 200, color: [pal.bruma, pal.luz], cada: 1.2, vida: 4, nota: 'jirones de neblina que bajan por el valle' },
    { tipo: 'brillo', x0: 0, x1: L.largo, y0: 200, y1: 226, color: [pal.luz, pal.menta], cada: 0.8, vida: 0.6, nota: 'el rocío del pasto que brilla con el sol de la mañana' },
  ];
}

export const COCORA: Lugar = {
  estilo: 'colombia_cafetera',
  fondo: fondoCocora,
  lejos: { cordillera_cocora: cordilleraCocora },
  pisos: { cancha: (x, y, s) => tartan(x, y, s) },
  orilla: orillaCocora,
  marcas: rayasCocora,
  vida: vidaCocora,
  luces: lucesCocora,
  particulas: particulasCocora,
};
