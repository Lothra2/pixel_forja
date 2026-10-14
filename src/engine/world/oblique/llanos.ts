import { rng, grain, bayer } from '../../fx/pix';
import { Lienzo } from './lienzo';
import type { Color, Paleta } from './paleta';
import type { CtxCerca } from './fachadas';
import type { ObliqueLayout } from './layout';
import type { Luz, Particula, VidaEscena } from './escena';
import type { Lugar } from './lugares';
import { recorte, textoGrande, anchoTexto, personita, sombraOval } from './pinceles';

/**
 * Los Llanos de Apure al atardecer (estilo `venezuela_llano`), de lado, para la Jabalina Llanera. Lejos, el horizonte
 * plano del llano con las matas y los morichales chiquitos contra el sol que se pone. Cerca, la sabana dorada con los
 * morichales, el caney de palma con los chinchorros, el estero con los chigüires y las garzas, el ganado con el llanero a
 * caballo y la tranquera del hato. El piso es el campo de lanzamiento: la pista de impulso de tartán, la línea de foul
 * en x 380 y el sector de caída con sus rayas cada 10 m, donde los pintaba Jabalina.ts.
 */

export const CERCA_APURE = 'morichal_apure';
/** La franja de Jabalina.ts: TOP 226 y 120 de fondo (de la fila 226 a la 346). */
const FT = 226;
/**
 * El campo de Jabalina.ts, en y de la franja: la pista de impulso de y 60 a y 76 (rayas en las dos orillas) hasta la
 * línea de foul en x 380 (la tabla de y 58 a y 80), el carril de carrera en y 70, y el sector de caída con sus orillas en
 * y 0 y y 100 y una raya cada 100 px desde la de foul. Los números de los metros los pone el juego en y 112.
 */
export const CAMPO = { pista: [60, 76], carrera: 70, foul: 380, tabla: [58, 80], sector: [0, 100], paso: 100, espera: [18, 30, 42] };
/** El horizonte del llano en la capa cerca: la sabana empieza acá. */
const HORIZONTE = 180;
/** Los morichales de la capa cerca: x, fila de la copa y cuántas palmas. */
export const MORICHALES: { x: number; copa: number; n: number }[] = [
  { x: 70, copa: 150, n: 3 }, { x: 470, copa: 142, n: 4 }, { x: 760, copa: 156, n: 2 }, { x: 1180, copa: 146, n: 3 }, { x: 1470, copa: 140, n: 4 },
];
/** El caney de palma con los chinchorros, detrás de la pista de impulso. */
export const CANEY = { x0: 200, x1: 300, techo: 172, piso: 214 };
/** El estero con los chigüires y las garzas. */
export const ESTERO = { x0: 880, x1: 1060, y0: 200, y1: 216 };
/** El ganado y el llanero. */
export const GANADO = { x: 1290, piso: 210 };
/** La tranquera del hato con el letrero. */
export const TRANQUERA = { x: 600, piso: 216 };

// ---------------------------------------------------------------------------------------------------------------------
// Lo lejos: el horizonte del llano y el sol

/**
 * El horizonte del llano al atardecer: la línea plana y lejana con las matas y los morichales chiquitos en silueta, el
 * sol grande que se pone, con las franjas de nubes que lo cruzan, y el resplandor sobre la sabana lejos.
 */
export function horizonteLlano(pal: Paleta, w: number, h: number, seed: number): Lienzo {
  const L = new Lienzo(w, h, pal), R = rng(seed), horiz = 154;
  // el sol que se pone, con su halo, cruzado por nubes largas
  const sx = Math.floor(w * 0.62), sy = horiz - 10;
  for (let y = sy - 40; y <= horiz; y++) for (let x = sx - 60; x <= sx + 60; x++) {
    const d = Math.hypot(x - sx, (y - sy) * 1.1);
    if (d < 16) L.p(x, y, d < 12 ? (y > sy + 4 ? 'oro' : 'amarillo') : 'oro');
    else if (d < 52 && bayer(x, y) < ((52 - d) / 52) * 0.6) L.p(x, y, d < 30 ? 'oro' : 'bruma');
  }
  for (const [y0, x0, x1] of [[sy - 6, sx - 70, sx + 40], [sy + 2, sx - 30, sx + 80], [sy - 18, sx + 10, sx + 90]] as const) for (let x = x0; x < x1; x++) { L.p(x, y0, 'salmon'); if (bayer(x, y0 + 1) < 0.5) L.p(x, y0 + 1, 'vino'); }
  // la sabana lejos: la franja plana debajo del horizonte con el resplandor del sol
  for (let y = horiz; y < h; y++) for (let x = 0; x < w; x++) {
    const cerca = Math.abs(x - sx) < 70 - (y - horiz) * 2;
    L.p(x, y, y === horiz ? 'bruma' : cerca && bayer(x, y) < 0.5 ? 'oro' : bayer(x, y) < (y - horiz) / 16 ? 'ocre' : 'bruma');
  }
  // las matas (islas de monte) y los morichales chiquitos en silueta sobre el horizonte
  for (let k = 0; k < 14; k++) {
    const cx = Math.floor((k + R()) * (w / 14)), ancho = 8 + Math.floor(R() * 26), alto = 4 + Math.floor(R() * 7);
    for (let dx = -ancho; dx <= ancho; dx++) {
      const a = Math.round(alto * Math.sqrt(Math.max(0, 1 - (dx / ancho) ** 2)) + (grain(cx + dx, 0, seed) - 0.5) * 2);
      for (let j = 0; j < a; j++) L.p((cx + dx + w) % w, horiz - j, j < 2 ? 'sombra' : 'asfalto');
    }
  }
  for (let k = 0; k < 10; k++) {
    const x = Math.floor((k + 0.5 + (R() - 0.5) * 0.6) * (w / 10)), alto = 10 + Math.floor(R() * 8);
    L.vl(x, horiz - alto, alto, 'sombra');
    for (let i = -3; i <= 3; i++) for (let j = -2; j <= 1; j++) if (i * i + j * j * 2 < 10) L.p(x + i, horiz - alto + j, 'sombra');
  }
  return L;
}

// ---------------------------------------------------------------------------------------------------------------------
// La capa cerca: la sabana

/** La sabana: paja dorada con la luz del atardecer de lado, matas oscuras y florecitas. */
function sabana(x: number, y: number, s: number): Color {
  const t = (y - HORIZONTE) / (FT - HORIZONTE);
  const n = grain(x, y, s);
  if (n < 0.006) return 'salmon';
  if (grain(x >> 2, y >> 1, s + 1) < 0.12) return t < 0.4 ? 'asfalto_claro' : 'verde_oscuro';
  if (t < 0.25) return bayer(x, y) < 0.5 ? 'ocre' : 'amarillo';
  if ((x + (y >> 1)) % 7 === 0) return 'amarillo';
  return bayer(x, y) < t * 0.6 ? 'verde' : n < 0.4 ? 'menta' : 'ocre';
}

/**
 * Una palma de moriche: el tronco liso y derecho, con los restos de las hojas viejas abajo de la copa, y la copa redonda
 * de hojas en abanico. Al atardecer, del lado del sol (la derecha) la copa se enciende.
 */
function moriche(C: Lienzo, x: number, pie: number, copa: number, seed: number) {
  for (let y = copa; y < pie; y++) { C.p(x - 1, y, 'asfalto'); C.p(x, y, 'asfalto_claro'); C.p(x + 1, y, (y & 3) === 0 ? 'sombra' : 'asfalto'); }
  // la falda de hojas secas que cuelga
  for (let j = 0; j < 6; j++) for (let i = -2 - (j >> 1); i <= 3 + (j >> 1); i++) if (bayer(x + i, copa + 3 + j) < 0.7) C.p(x + i, copa + 3 + j, 'terracota');
  // la copa de abanicos: rayos que salen del centro y se doblan
  const R = rng(seed);
  for (let k = 0; k < 22; k++) {
    const ang = Math.PI * (0.95 + (k / 21) * 1.1) + (R() - 0.5) * 0.1, largo = 13 + Math.floor(R() * 6);
    for (let i = 2; i < largo; i++) {
      const px = Math.round(x + Math.cos(ang) * i), py = Math.round(copa + Math.sin(ang) * i * 0.8 + (i > largo - 4 ? 1 : 0));
      const sol = Math.cos(ang) > 0.3;
      C.p(px, py, sol && i > largo / 2 ? 'oro' : i % 3 === 0 ? 'verde' : 'verde_oscuro');
      if (i > 4) C.p(px, py + 1, sol ? 'verde' : 'sombra');
    }
  }
  C.f(x - 2, copa - 2, 6, 4, 'verde_oscuro');
}

/** El caney: el techo de palma a dos aguas sobre horcones, abierto, con dos chinchorros colgados y el farol. */
function caney(C: Lienzo) {
  const { x0, x1, techo, piso } = CANEY, cx = Math.round((x0 + x1) / 2);
  sombraOval(C, cx + 6, piso + 1, (x1 - x0) / 2 + 4, 3, 'asfalto', 0.6);
  for (const px of [x0 + 4, cx - 1, x1 - 6]) { C.f(px, techo + 10, 3, piso - techo - 10, 'asfalto_claro'); C.vl(px + 2, techo + 10, piso - techo - 10, 'asfalto'); }
  // los chinchorros: hamacas de colores colgadas en arco entre los horcones
  for (const [a, b, c1, c2] of [[x0 + 7, cx - 1, 'rojo', 'amarillo'], [cx + 2, x1 - 6, 'azul', 'crema']] as const) {
    for (let x = a; x < b; x++) { const t = (x - a) / (b - a), y = techo + 18 + Math.round(Math.sin(t * Math.PI) * 9); C.p(x, y, (x >> 1) % 2 ? c1 : c2); C.p(x, y + 1, (x >> 1) % 2 ? c2 : c1); }
  }
  // alguien echado en un chinchorro, con el sombrero
  C.f(x0 + 20, techo + 23, 12, 3, 'crema'); C.f(x0 + 31, techo + 21, 4, 3, 'salmon'); C.hl(x0 + 30, techo + 20, 6, 'ocre');
  // el techo de palma seca: capas de hojas, más oscuras abajo, con el borde deshilachado
  for (let j = 0; j < 14; j++) {
    const hw = Math.round(8 + j * 4.2), y = techo - 4 + j;
    for (let i = -hw; i <= hw; i++) C.p(cx + i, y, j === 13 || (i === -hw || i === hw) ? 'terracota' : (cx + i + j * 2) % 5 === 0 ? 'terracota' : j < 4 ? 'amarillo' : 'ocre');
  }
  for (let i = -62; i < 62; i += 2) if (grain(i, 1, 3) < 0.6) C.vl(cx + i, techo + 10, 1 + Math.floor(grain(i, 2, 3) * 3), 'terracota');
  // el farol colgado y la tinaja
  C.vl(x1 - 14, techo + 10, 4, 'sombra'); C.f(x1 - 15, techo + 14, 3, 4, 'oro'); C.p(x1 - 14, techo + 15, 'luz');
  C.f(x0 + 8, piso - 7, 6, 7, 'terracota'); C.hl(x0 + 8, piso - 7, 6, 'ocre');
}

/** El estero: el agua quieta que refleja el cielo, con la orilla de juncos, los chigüires y las garzas. `f` mueve los animales. */
function estero(C: Lienzo, seed: number, f: number) {
  const { x0, x1, y0, y1 } = ESTERO;
  for (let y = y0; y < y1; y++) {
    const t = (y - y0) / (y1 - y0), m = Math.round(Math.sin(t * Math.PI) * 10);
    for (let x = x0 - m; x < x1 + m; x++) C.p(x, y, y === y0 ? 'cielo' : bayer(x, y) < 0.3 + t * 0.4 ? 'canal' : (x + y * 3) % 13 === 0 ? 'salmon' : 'celeste');
  }
  // los juncos de la orilla
  for (let x = x0 - 6; x < x1 + 6; x += 3) if (grain(x, 0, seed) < 0.6) C.vl(x, y1 - 3 - Math.floor(grain(x, 1, seed) * 4), 4, 'verde_oscuro');
  // los chigüires: tres, gordos, color paja, uno con la cabeza levantada
  for (const [i, x] of [[0, x0 + 30], [1, x0 + 46], [2, x1 - 30]] as const) {
    const y = y1 + 2, arriba = (i + f) % 2 === 0;
    C.f(x, y - 6, 11, 6, 'cemento'); C.hl(x, y - 6, 11, 'cemento_claro'); C.hl(x, y - 1, 11, 'asfalto_claro');
    C.f(x + 9, y - (arriba ? 9 : 7), 5, 4, 'cemento'); C.p(x + 12, y - (arriba ? 8 : 6), 'tinta'); C.p(x + 10, y - (arriba ? 10 : 8), 'asfalto');
    C.vl(x + 1, y, 2, 'asfalto'); C.vl(x + 8, y, 2, 'asfalto');
  }
  // las garzas blancas en el agua, una pescando
  for (const [i, x] of [[0, x0 + 90], [1, x0 + 118], [2, x1 - 60]] as const) {
    const y = y0 + 8, pesca = (i + f) % 2 === 1;
    C.vl(x + 2, y, 6, 'ocre'); C.vl(x + 4, y, 6, 'ocre');
    C.f(x, y - 6, 6, 6, 'luz'); C.p(x + 5, y - 6, 'crema');
    if (pesca) { C.ln(x + 5, y - 5, x + 8, y - 1, 'luz'); C.p(x + 9, y, 'oro'); }
    else { C.vl(x + 5, y - 11, 5, 'luz'); C.f(x + 5, y - 13, 3, 2, 'luz'); C.hl(x + 8, y - 12, 3, 'oro'); }
  }
}

/** El ganado que pasta y el llanero a caballo con el sombrero y el mecate. `f` mueve las cabezas y el caballo. */
function ganado(C: Lienzo, f: number) {
  const { x, piso } = GANADO;
  const reses: [number, Color, Color][] = [[0, 'cemento_claro', 'cemento'], [30, 'asfalto_claro', 'asfalto'], [58, 'crema', 'cemento_claro'], [92, 'cemento', 'asfalto_claro']];
  for (const [i, [dx, c, s]] of reses.entries()) {
    const rx = x + dx, come = (i + f) % 2 === 0;
    sombraOval(C, rx + 9, piso + 1, 11, 2, 'asfalto', 0.5);
    C.f(rx, piso - 13, 18, 8, c); C.hl(rx, piso - 6, 18, s); C.p(rx + 6, piso - 13, 'cemento'); C.f(rx + 4, piso - 15, 4, 2, c);
    for (const lx of [1, 4, 13, 16]) C.vl(rx + lx, piso - 5, 5, s);
    const hy = come ? piso - 7 : piso - 15;
    C.f(rx + 18, hy, 5, 5, c); C.p(rx + 21, hy + 1, 'tinta'); C.hl(rx + 17, hy - 1, 2, 'crema'); C.p(rx + 23, hy - 1, 'crema');
    C.vl(rx - 1, piso - 12, 6, s);
  }
  // el llanero a caballo
  const cx = x + 130, paso = f % 2;
  sombraOval(C, cx + 12, piso + 1, 14, 2, 'asfalto', 0.5);
  C.f(cx, piso - 16, 22, 9, 'terracota'); C.hl(cx, piso - 16, 22, 'ocre'); C.hl(cx, piso - 8, 22, 'vino');
  for (const [lx, d] of [[2, paso], [6, -paso], [16, -paso], [20, paso]] as const) C.ln(cx + lx, piso - 7, cx + lx + d, piso, 'vino');
  C.f(cx + 21, piso - 22, 5, 8, 'terracota'); C.f(cx + 24, piso - 22, 4, 4, 'terracota'); C.p(cx + 26, piso - 21, 'tinta'); C.vl(cx + 21, piso - 22, 6, 'sombra');
  C.vl(cx - 1, piso - 15, 8, 'sombra');
  // el llanero: liqui liqui crema, sombrero de pelo de guama y el mecate en la mano
  C.f(cx + 9, piso - 28, 6, 10, 'crema'); C.vl(cx + 14, piso - 28, 10, 'cemento_claro'); C.f(cx + 9, piso - 20, 6, 5, 'asfalto');
  C.f(cx + 10, piso - 33, 4, 5, 'salmon'); C.hl(cx + 7, piso - 34, 10, 'asfalto'); C.f(cx + 9, piso - 37, 6, 3, 'asfalto_claro');
  C.ln(cx + 15, piso - 25, cx + 21, piso - 30, 'crema'); for (let a = 0; a < 6; a++) C.p(cx + 21 + Math.round(Math.cos(a) * 3), piso - 32 + Math.round(Math.sin(a) * 2), 'ocre');
}

/** La tranquera del hato: los dos estantillos, las varas y el letrero LLANOS DE APURE colgado arriba. */
function tranquera(C: Lienzo) {
  const { x, piso } = TRANQUERA, t = 'LLANOS DE APURE', w = anchoTexto(t) + 14;
  for (const px of [x, x + w - 4]) { C.f(px, piso - 44, 4, 44, 'asfalto_claro'); C.vl(px + 3, piso - 44, 44, 'asfalto'); C.hl(px, piso - 44, 4, 'cemento_claro'); }
  for (const y of [piso - 22, piso - 15, piso - 8]) { C.hl(x + 4, y, w - 8, 'cemento_claro'); C.hl(x + 4, y + 1, w - 8, 'asfalto'); }
  C.box(x - 2, piso - 62, w + 4, 18, 'asfalto_claro', 'sombra');
  for (let j = piso - 58; j < piso - 46; j += 5) C.hl(x - 1, j, w + 2, 'asfalto');
  textoGrande(C, x + 7, piso - 59, t, 'crema', 2, 'sombra');
  // un cráneo de res en el estantillo, como en los hatos
  C.f(x + w - 6, piso - 40, 6, 5, 'luz'); C.p(x + w - 5, piso - 38, 'sombra'); C.p(x + w - 2, piso - 38, 'sombra'); C.hl(x + w - 9, piso - 41, 12, 'crema');
}

export interface CuadroApure { f?: number }

/** El llano completo sobre la capa cerca (alto franja.atras). `q.f` mueve los animales. */
export function pintarApure(C: Lienzo, seed: number, q: CuadroApure = {}) {
  const f = q.f ?? 0, W = C.w;
  for (let y = HORIZONTE; y < FT; y++) for (let x = 0; x < W; x++) C.p(x, y, y === HORIZONTE ? 'bruma' : sabana(x, y, seed));
  // las matas de monte bajas en la sabana de atrás
  const R = rng(seed + 2);
  for (let k = 0; k < W / 90; k++) {
    const cx = Math.floor(R() * W), y = HORIZONTE + 4 + Math.floor(R() * 10), rw = 10 + Math.floor(R() * 16);
    for (let j = -5; j <= 1; j++) for (let i = -rw; i <= rw; i++) if ((i / rw) ** 2 + (j / 5) ** 2 < 1) C.p(cx + i, y + j, j < -3 ? 'verde' : bayer(cx + i, y + j) < 0.3 ? 'sombra' : 'verde_oscuro');
  }
  // el camino de tierra
  for (let x = 0; x < W; x++) for (let y = 206; y < 210; y++) if (grain(x >> 3, y, seed) < 0.85) C.p(x, y, y === 206 ? 'cemento_claro' : (x + y) % 5 === 0 ? 'ocre' : 'terracota');
  estero(C, seed, f);
  caney(C);
  tranquera(C);
  ganado(C, f);
  // unos niños jugando con un perro cerca del caney
  personita(C, 330, 214, { ropa: 'rojo', pant: 'azul', pelo: 'tinta', piel: 'salmon', alto: 15, pose: f % 2 ? 2 : 0 });
  for (const m of MORICHALES) for (let i = 0; i < m.n; i++) {
    const x = m.x + i * 15 + (i % 2) * 4, copa = m.copa + (i % 3) * 6;
    sombraOval(C, x + 8, 222, 9, 1.5, 'asfalto', 0.5);
    moriche(C, x, 222, copa, seed + x);
  }
  // el borde de la sabana contra el campo
  for (let x = 0; x < W; x++) { C.p(x, FT - 2, 'verde'); C.p(x, FT - 1, 'verde_oscuro'); }
}

export const fondoApure = (C: Lienzo, _x0: number, _x1: number, _base: number, ctx: CtxCerca) => pintarApure(C, ctx.seed);

// ---------------------------------------------------------------------------------------------------------------------
// El piso: el campo de lanzamiento

/** El pasto del campo de lanzamiento, cortado en franjas, con la luz dorada del atardecer. */
export function pastoCampo(x: number, y: number, s: number): Color {
  const n = grain(x, y, s);
  if (n < 0.015) return 'verde_oscuro';
  if (n > 0.992) return 'amarillo';
  return Math.floor(x / 60) % 2 ? 'verde' : bayer(x, y) < 0.5 ? 'verde' : 'menta';
}

/** La pista de impulso, la tabla de foul, el sector de caída y sus rayas cada 10 m, donde los pintaba Jabalina.ts. */
export function campoApure(P: Lienzo, _L: ObliqueLayout, seed: number) {
  const { pista, foul, tabla, sector, paso } = CAMPO, W = P.w;
  for (let y = pista[0]; y <= pista[1]; y++) for (let x = 0; x < foul; x++) P.p(x, y, y === pista[0] || y === pista[1] ? 'luz' : grain(x, y, seed) < 0.1 ? 'terracota' : 'rojo');
  for (let y = tabla[0]; y <= tabla[1]; y++) for (let x = foul - 2; x < foul + 2; x++) P.p(x, y, 'luz');
  for (let x = foul; x < W; x += 3) { P.p(x, sector[0] + 1, 'luz'); P.p(x, sector[1], 'luz'); }
  for (let x = foul + paso; x < W; x += paso) for (let y = sector[0] + 1; y < sector[1]; y += 3) P.p(x, y, 'luz');
  // las marcas de caídas de antes: hoyitos con la tierra
  const R = rng(seed + 5);
  for (let k = 0; k < 24; k++) { const x = foul + 150 + Math.floor(R() * (W - foul - 200)), y = 8 + Math.floor(R() * 88); P.p(x, y, 'terracota'); P.p(x + 1, y, 'asfalto_claro'); }
}

/** Lo de adelante del campo: la sabana con matas de paja y florecitas. */
export function orillaApure(x: number, r: number, s: number): Color {
  return sabana(x, FT - 30 + r * 2, s);
}

// ---------------------------------------------------------------------------------------------------------------------
// Vida, luces y partículas

/** Una bandada en V: garzas blancas o corocoras rojas, 2 cuadros. */
function bandada(pal: Paleta, color: Color, n: number): Lienzo[] {
  return [0, 1].map((f) => {
    const L = new Lienzo(10 + n * 7, 6 + n * 3, pal);
    for (let i = 0; i < n; i++) {
      const x = 2 + i * 7, y = 2 + Math.abs(i - Math.floor(n / 2)) * 3 + ((i + f) % 2);
      L.f(x + 2, y + 1, 3, 1, color); L.p(x + 5, y + 1, color === 'luz' ? 'oro' : 'vino');
      if ((i + f) % 2) { L.p(x, y, color); L.p(x + 1, y, color); L.p(x + 4, y, color); L.p(x + 5, y - 1, color); }
      else { L.p(x, y + 2, color); L.p(x + 1, y + 2, color); L.p(x + 4, y + 2, color); L.p(x + 5, y + 3, color); }
    }
    return L;
  });
}

export function vidaApure(pal: Paleta, L: ObliqueLayout, _k: number, seed: number, capas: { cerca: Lienzo; piso: Lienzo }): VidaEscena[] {
  const out: VidaEscena[] = [], quiere = (t: string) => L.vida.includes(t), W = capas.cerca.w, H = capas.cerca.h;
  const cs = quiere('estero') || quiere('ganado') ? [0, 1].map((f) => { const c = new Lienzo(W, H, pal); pintarApure(c, seed, { f }); return c; }) : [];
  if (quiere('estero')) {
    const { x0, x1, y0, y1 } = ESTERO, x = x0 - 12, y = y0 - 16, w = x1 - x0 + 24, h = y1 - y0 + 22;
    out.push({ id: 'estero', tipo: 'estero', capa: 'cerca', x, y, cuadros: cs.map((c) => recorte(c, x, y, w, h)), fps: 0.8 });
  }
  if (quiere('ganado')) {
    const { x, piso } = GANADO, w = 170, h = 42;
    out.push({ id: 'ganado', tipo: 'ganado', capa: 'cerca', x: x - 4, y: piso - 38, cuadros: cs.map((c) => recorte(c, x - 4, piso - 38, w, h)), fps: 0.6 });
  }
  if (quiere('garzas')) out.push({ id: 'garzas', tipo: 'garzas', capa: 'lejos', x: 1280, y: 110, cuadros: bandada(pal, 'luz', 5), fps: 3, recorrido: { desde: [1280, 110], hasta: [-60, 100], segundos: 40, desfase: 0.2 } });
  if (quiere('corocoras')) out.push({ id: 'corocoras', tipo: 'corocoras', capa: 'lejos', x: -60, y: 120, cuadros: bandada(pal, 'rojo', 7), fps: 3, recorrido: { desde: [-60, 120], hasta: [1280, 112], segundos: 48, desfase: 0.6 } });
  return out;
}

/** El farol del caney, que ya está prendido. */
export function lucesApure(pal: Paleta, _L: ObliqueLayout, _k: number): Luz[] {
  return [{ x: CANEY.x1 - 14, y: CANEY.techo + 16, color: pal.oro, radio: 14, latido: 2.4, encendida: true, nota: 'el farol del caney, ya prendido' }];
}

export function particulasApure(pal: Paleta, L: ObliqueLayout, _k: number): Particula[] {
  return [
    { tipo: 'brillo', x0: 0, x1: L.largo, y0: 190, y1: 224, color: [pal.amarillo, pal.oro], cada: 0.7, vida: 1.2, nota: 'los cocuyos que prenden en la sabana al caer la tarde' },
    { tipo: 'polvo', x0: GANADO.x - 20, x1: GANADO.x + 180, y0: GANADO.piso - 6, y1: GANADO.piso, color: [pal.cemento_claro, pal.bruma], cada: 0.6, vida: 1.5, nota: 'el polvo que levanta el ganado' },
  ];
}

export const APURE: Lugar = {
  estilo: 'venezuela_llano',
  fondo: fondoApure,
  lejos: { horizonte_llano: horizonteLlano },
  pisos: { pasto: (x, y, s) => pastoCampo(x, y, s) },
  orilla: orillaApure,
  marcas: campoApure,
  vida: vidaApure,
  luces: lucesApure,
  particulas: particulasApure,
};
