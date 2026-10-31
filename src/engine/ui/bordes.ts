import { bayer, grain, rng } from '../fx/pix';
import type { UiPiece } from './retro';
import { Lienzo } from '../world/oblique/lienzo';
import type { Color } from '../world/oblique/paleta';
import { VENEZUELA_MARGARITA_MEDIODIA, VENEZUELA_MARACAIBO_NOCHE, COLOMBIA_BARRANQUILLA_MEDIODIA, VIETNAM_TAODAN_AMANECER, VENEZUELA_LICEO_MEDIODIA } from '../world/oblique/lugaresPaleta';
import { personita, sentadita, sombraOval, textoGrande, type Personita } from '../world/oblique/pinceles';

/**
 * Los bordes de las canchas (lote BORDES): lo que hay alrededor de la cancha y que el escenario de lado no trae porque
 * la cancha a 800 se pinta lisa: las bancas de los suplentes con sus bolsos, la mesa de los jueces, las hieleras,
 * los conos, las banderas de las esquinas, las sombrillas de la playa, el carrito de raspados, los niños sentados en
 * el borde. Una pieza transparente de 800 x 360 por escenario, con la parte de 640 de x 80 a 720, en la paleta del
 * lugar. El juego la pega en (-80, 0) partida en dos por la fila `corte`: lo de arriba va detrás de los atletas
 * (sobre el piso) y lo de abajo, delante de todos (la franja del frente, donde nadie camina).
 *
 *   borde_margarita         el vóley playa: sombrillas, toallas, la silla del árbitro, las banderas y las huellas
 *   borde_cancha_maracaibo  el básquet de noche: las dos bancas, la mesa de control, el carrito de balones
 *   borde_barranquilla      el fútbol del carnaval: bancas, los tambores, el carrito de raspados, los niños en la acera
 *   borde_tao_dan           el đá cầu del parque: la banca, la bicicleta, la vendedora, el abuelo del tai chi
 *   borde_liceo_patio       el quemado del liceo: la banca con los morrales, la profe con el pito, los que esperan
 */

const W = 800, H = 360;
type Gente = Personita;

// ---------------------------------------------------------------- los pinceles de los bordes

/** La sombra de algo parado en el piso: un óvalo tramado. */
const sombra = (C: Lienzo, cx: number, cy: number, rx: number, c: Color = 'sombra') => sombraOval(C, cx, cy, rx, 2, c, 0.5);

/** Una banca de tablas con la gente sentada y los bolsos al lado. `base` es el piso. */
function banca(C: Lienzo, x: number, base: number, gente: Gente[], tabla: [Color, Color, Color] = ['ocre', 'terracota', 'vino'], largo = gente.length * 15 + 12) {
  const asiento = base - 13;
  sombra(C, x + largo / 2, base, largo / 2 + 2);
  for (const q of [x + 2, x + largo - 5]) { C.f(q, asiento + 3, 3, base - asiento - 3, 'asfalto'); C.vl(q, asiento + 3, base - asiento - 3, 'asfalto_claro'); }
  C.f(x, asiento, largo, 4, tabla[1]); C.hl(x, asiento, largo, tabla[0]); C.hl(x, asiento + 4, largo, tabla[2]);
  gente.forEach((p, i) => sentadita(C, x + 7 + i * 15, asiento, { alto: 26, ...p }));
}

/** Un morral en el piso, con su bolsillo. */
function morral(C: Lienzo, x: number, base: number, c: Color) {
  C.f(x, base - 12, 10, 12, c); C.hl(x, base - 12, 10, 'luz'); C.f(x + 2, base - 7, 6, 4, 'tinta'); C.vl(x + 9, base - 12, 12, 'sombra'); C.hl(x + 1, base, 9, 'sombra'); C.hl(x + 3, base - 13, 4, 'tinta');
}

/** Una hielera (cava) con la tapa clara. */
function hielera(C: Lienzo, x: number, base: number, c: Color) {
  sombra(C, x + 7, base, 8);
  C.f(x, base - 12, 18, 12, c); C.f(x, base - 15, 18, 4, 'luz'); C.hl(x, base - 15, 18, 'cemento_claro'); C.vl(x + 17, base - 12, 12, 'sombra'); C.hl(x + 5, base - 16, 8, 'asfalto');
}

/** Una botella de agua parada. */
function botella(C: Lienzo, x: number, base: number) { C.f(x, base - 9, 4, 9, 'celeste'); C.f(x + 1, base - 11, 2, 2, 'azul'); C.vl(x, base - 9, 9, 'luz'); }

/** La mesa plegable de los jueces: el mantel, dos sentados detrás, la planilla, la campana y la cajita del marcador. */
function mesa(C: Lienzo, x: number, base: number, mantel: Color, jueces: [Gente, Gente], marcador: [string, string] = ['0', '0']) {
  const alto = base - 18;
  sombra(C, x + 30, base, 32);
  // los que están sentados detrás (la mesa los tapa de la cintura para abajo)
  sentadita(C, x + 10, alto + 3, { alto: 24, ...jueces[0] }); sentadita(C, x + 38, alto + 3, { alto: 24, ...jueces[1] });
  C.f(x, alto, 60, 13, mantel); C.hl(x, alto, 60, 'luz'); C.hl(x, alto + 12, 60, 'sombra');
  for (const q of [x + 3, x + 56]) C.vl(q, alto + 13, base - alto - 13, 'asfalto');
  C.f(x + 5, alto - 2, 8, 2, 'luz'); C.p(x + 6, alto - 2, 'tinta'); C.p(x + 9, alto - 2, 'tinta');
  C.f(x + 24, alto - 9, 14, 9, 'tinta'); C.hl(x + 24, alto - 9, 14, 'asfalto');
  textoGrande(C, x + 26, alto - 7, marcador[0], 'rojo', 1); textoGrande(C, x + 32, alto - 7, marcador[1], 'rojo', 1);
  C.f(x + 46, alto - 4, 6, 4, 'oro'); C.hl(x + 47, alto - 5, 4, 'oro');
}

/** Un cono anaranjado con su franja. */
function cono(C: Lienzo, x: number, base: number) {
  C.hl(x - 1, base - 1, 8, 'sombra'); C.f(x, base - 2, 6, 2, 'terracota');
  for (let j = 0; j < 6; j++) C.hl(x + 3 - Math.ceil(j / 2), base - 8 + j, 1 + Math.floor(j / 2) * 2 - (j % 2 ? 1 : 0) + 1, j === 2 || j === 3 ? 'luz' : 'terracota');
}

/** Una bandera en su palo. */
function bandera(C: Lienzo, x: number, base: number, alto: number, c: Color, c2: Color = c) {
  C.vl(x, base - alto, alto, 'luz'); C.vl(x + 1, base - alto, alto, 'cemento');
  for (let j = 0; j < 7; j++) C.hl(x + 2, base - alto + j, 12 - Math.abs(j - 3) * 2, j < 3 ? c : c2);
  C.hl(x - 1, base - 1, 4, 'sombra');
}

/** Una sombrilla de playa: el palo y la copa a franjas, con su sombra en la arena. */
function sombrilla(C: Lienzo, x: number, base: number, a: Color, b: Color) {
  sombraOval(C, x + 6, base - 2, 22, 5, 'ocre', 0.45);
  C.vl(x, base - 44, 44, 'cemento'); C.vl(x + 1, base - 44, 44, 'asfalto');
  for (let j = 0; j < 12; j++) { const w = Math.round(Math.sqrt(1 - ((11 - j) / 12) ** 2) * 26); for (let i = -w; i <= w; i++) C.p(x + i, base - 44 + j, Math.floor((i + 26) / 9) % 2 ? a : b); }
  C.hl(x - 26, base - 32, 53, 'sombra');
}

/** Una toalla extendida, con rayas. */
function toalla(C: Lienzo, x: number, y: number, w: number, h: number, a: Color, b: Color) {
  for (let j = 0; j < h; j++) C.hl(x + (j % 2), y + j, w, j % 4 < 2 ? a : b);
  C.hl(x, y + h, w, 'ocre');
}

/** La silla alta del árbitro, con él arriba y la gorra. */
function sillaAlta(C: Lienzo, x: number, base: number, ropa: Color = 'luz') {
  const top = base - 40;
  sombra(C, x + 6, base, 9, 'ocre');
  for (const q of [x, x + 12]) { C.vl(q, top, base - top, 'luz'); C.vl(q + 1, top, base - top, 'cemento_claro'); }
  for (let y = top + 6; y < base; y += 6) C.hl(x, y, 13, 'cemento_claro');
  C.f(x - 1, top - 3, 15, 3, 'verde'); C.hl(x - 1, top - 3, 15, 'menta');
  sentadita(C, x + 2, top - 3, { ropa, pant: 'azul_noche', pelo: 'tinta', piel: 'salmon', sombrero: 'luz', alto: 18 });
}

/** Una pelota en el piso. */
function pelota(C: Lienzo, x: number, y: number, r: number, c: Color, raya: Color) {
  C.hl(x - r, y + r, r * 2 + 1, 'sombra');
  C.d(x, y, r, c); C.ln(x - r + 1, y, x + r - 1, y, raya); C.p(x - 1, y - r + 1, 'luz');
}

/** El carrito de balones: la reja con las pelotas. */
function carritoBalones(C: Lienzo, x: number, base: number, c: Color) {
  sombra(C, x + 12, base, 13);
  C.box(x, base - 18, 24, 14, c, 'asfalto');
  for (let j = base - 17; j < base - 5; j += 3) C.hl(x + 1, j, 22, 'asfalto');
  for (const [px, py] of [[5, -11], [12, -11], [19, -11], [8, -16], [16, -16]] as const) { C.d(x + px, base + py, 3, c === 'asfalto' ? 'terracota' : c, 1); C.p(x + px - 1, base + py - 1, 'luz'); }
  C.d(x + 4, base - 1, 2, 'tinta'); C.d(x + 20, base - 1, 2, 'tinta');
}

/** Un perro echado, de lado, con la cabeza levantada. */
function perroEchado(C: Lienzo, x: number, base: number, c: Color) {
  sombra(C, x + 10, base, 11);
  C.f(x, base - 5, 18, 5, c); C.hl(x, base - 5, 18, 'luz'); C.f(x + 15, base - 10, 6, 6, c); C.p(x + 15, base - 11, 'sombra'); C.p(x + 19, base - 11, 'sombra');
  C.p(x + 19, base - 9, 'tinta'); C.p(x + 21, base - 7, 'tinta'); C.ln(x, base - 5, x - 4, base - 9, c); C.hl(x + 2, base - 1, 3, 'sombra');
}

/** Una paloma en el piso. */
function paloma(C: Lienzo, x: number, y: number, c: Color = 'cemento') { C.f(x, y - 2, 4, 2, c); C.p(x + 4, y - 3, c); C.p(x + 5, y - 3, 'ocre'); C.p(x - 1, y - 2, 'asfalto'); C.p(x + 1, y, 'ocre'); C.p(x + 3, y, 'ocre'); }

/** Las huellas en la arena: pisadas tramadas de aquí para allá. */
function huellas(C: Lienzo, x0: number, x1: number, y0: number, y1: number, seed: number) {
  const R = rng(seed);
  for (let k = 0; k < 40; k++) {
    const x = x0 + R() * (x1 - x0), y = y0 + R() * (y1 - y0), n = 3 + Math.floor(R() * 4), dx = R() < 0.5 ? 4 : -4;
    for (let i = 0; i < n; i++) { const px = Math.round(x + i * dx), py = Math.round(y + (i % 2 ? 2 : 0) + i * 0.5); if (C.has(px, py) || true) { C.p(px, py, 'ocre'); C.p(px + 1, py, 'ocre'); C.p(px, py + 1, 'ocre'); } }
  }
}

/** Unas chancletas. */
function chancletas(C: Lienzo, x: number, y: number, c: Color) { for (const q of [x, x + 5]) { C.f(q, y, 3, 6, c); C.p(q + 1, y + 1, 'tinta'); } }

/** El carrito de raspados: la caja con ruedas, el bloque de hielo, los frascos de colores y la sombrilla. */
function carritoRaspados(C: Lienzo, x: number, base: number) {
  sombra(C, x + 16, base, 18);
  C.box(x, base - 22, 32, 18, 'luz', 'cemento'); C.f(x + 1, base - 21, 30, 5, 'rojo'); C.hl(x + 1, base - 16, 30, 'luz');
  textoGrande(C, x + 4, base - 13, 'RASPAO', 'rojo', 1);
  C.f(x + 4, base - 28, 10, 6, 'celeste'); C.hl(x + 4, base - 28, 10, 'luz');
  for (const [i, c] of (['rojo', 'amarillo', 'verde', 'vino'] as Color[]).entries()) { C.f(x + 17 + i * 4, base - 27, 3, 5, c); C.hl(x + 17 + i * 4, base - 28, 3, 'luz'); }
  C.d(x + 6, base - 1, 3, 'tinta'); C.d(x + 26, base - 1, 3, 'tinta');
  C.vl(x + 30, base - 34, 12, 'asfalto');
  for (let j = 0; j < 6; j++) { const w = Math.round(Math.sqrt(1 - ((5 - j) / 6) ** 2) * 18); for (let i = -w; i <= w; i++) C.p(x + 30 + i, base - 34 + j, Math.floor((i + 18) / 6) % 2 ? 'amarillo' : 'rojo'); }
}

/** Un tambor alegre de carnaval, parado. */
function tambor(C: Lienzo, x: number, base: number, c: Color) {
  sombra(C, x + 6, base, 8);
  C.f(x, base - 12, 12, 12, c); C.f(x, base - 14, 12, 3, 'crema'); C.hl(x, base - 14, 12, 'luz'); C.vl(x + 11, base - 12, 12, 'sombra');
  for (let j = 0; j < 3; j++) C.ln(x + 1 + j * 4, base - 11, x + 3 + j * 4, base - 1, 'luz');
}

/** Una bicicleta vieja apoyada en su pata. */
function bicicleta(C: Lienzo, x: number, base: number, c: Color) {
  sombra(C, x + 14, base, 16);
  C.ring(x + 5, base - 6, 6, C.pal.tinta); C.ring(x + 24, base - 6, 6, C.pal.tinta);
  C.ln(x + 5, base - 6, x + 14, base - 16, c); C.ln(x + 14, base - 16, x + 24, base - 6, c); C.ln(x + 5, base - 6, x + 16, base - 6, c); C.ln(x + 16, base - 6, x + 14, base - 16, c);
  C.ln(x + 22, base - 6, x + 20, base - 18, c); C.hl(x + 17, base - 19, 7, 'tinta'); C.f(x + 11, base - 19, 5, 2, 'tinta');
  C.box(x + 2, base - 22, 9, 6, 'ocre', 'terracota');
}

/** La vendedora con su carga al hombro: dos canastas colgando de la vara. */
function vendedora(C: Lienzo, x: number, base: number) {
  personita(C, x, base, { ropa: 'vino', pant: 'tinta', pelo: 'tinta', piel: 'salmon', alto: 30, sombrero: 'crema' });
  C.hl(x - 10, base - 22, 28, 'ocre');
  for (const q of [x - 12, x + 12]) { C.vl(q + 2, base - 21, 9, 'ocre'); C.f(q - 2, base - 12, 9, 5, 'terracota'); C.hl(q - 2, base - 12, 9, 'ocre'); C.hl(q - 1, base - 13, 7, 'verde'); }
}

/** Un bolso de deporte, largo. */
function bolso(C: Lienzo, x: number, base: number, c: Color) { C.f(x, base - 7, 16, 7, c); C.hl(x, base - 7, 16, 'luz'); C.hl(x + 4, base - 9, 8, 'tinta'); C.vl(x + 15, base - 7, 7, 'sombra'); C.hl(x + 1, base, 15, 'sombra'); }

/** Un pote de agua grande (el botellón) con su vasito. */
function botellon(C: Lienzo, x: number, base: number) {
  sombra(C, x + 5, base, 6);
  C.f(x, base - 10, 10, 10, 'celeste'); C.f(x + 2, base - 14, 6, 4, 'celeste'); C.hl(x + 2, base - 15, 6, 'azul'); C.vl(x + 1, base - 10, 10, 'luz'); C.f(x + 11, base - 4, 3, 4, 'luz');
  C.hl(x + 8, base - 6, 3, 'asfalto');
}

// ---------------------------------------------------------------- las escenas

const ROPAS: Color[] = ['rojo', 'azul', 'amarillo', 'luz', 'verde', 'salmon', 'celeste', 'crema'];
const persona = (R: () => number, ropa?: Color, extra: Partial<Gente> = {}): Gente => ({ ropa: ropa ?? ROPAS[Math.floor(R() * ROPAS.length)], pant: R() < 0.5 ? 'azul_noche' : 'sombra', pelo: R() < 0.7 ? 'tinta' : 'ocre', piel: R() < 0.6 ? 'salmon' : 'ocre', ...extra });

/** El vóley playa de Margarita: la arena detrás de la cancha (filas 238 a 296) y la de adelante (324 a 360). */
function bordeMargarita(seed: number): UiPiece {
  const C = new Lienzo(W, H, VENEZUELA_MARGARITA_MEDIODIA), R = rng(seed);
  huellas(C, 100, 700, 244, 294, seed);
  huellas(C, 60, 740, 328, 356, seed + 1);
  // las banderas de las esquinas de la cancha (la línea de fondo va en la 298)
  bandera(C, 114, 296, 30, 'rojo', 'amarillo'); bandera(C, 686, 296, 30, 'azul', 'luz');
  // la sombrilla de la izquierda con la gente en las toallas, la cava y la pelota de playa
  toalla(C, 150, 280, 26, 10, 'celeste', 'luz'); toalla(C, 214, 284, 24, 9, 'salmon', 'luz');
  sombrilla(C, 180, 292, 'rojo', 'luz');
  sentadita(C, 158, 282, { alto: 24, ...persona(R, 'amarillo', { sombrero: 'crema' }) }, true); sentadita(C, 220, 286, { alto: 24, ...persona(R, 'verde') });
  hielera(C, 248, 294, 'azul'); pelota(C, 266, 290, 4, 'rojo', 'luz'); pelota(C, 266, 290, 4, 'luz', 'azul');
  // la silla del árbitro pegada a la red, del lado de atrás
  sillaAlta(C, 404, 296);
  // la sombrilla de la derecha, el fotógrafo y el salvavidas con su tabla
  toalla(C, 560, 282, 28, 10, 'amarillo', 'luz');
  sombrilla(C, 596, 292, 'amarillo', 'azul');
  sentadita(C, 568, 284, { alto: 24, ...persona(R, 'luz', { sombrero: 'luz' }) }); sentadita(C, 604, 288, { alto: 24, ...persona(R, 'celeste') }, true);
  personita(C, 520, 294, { ropa: 'crema', pant: 'asfalto', pelo: 'tinta', piel: 'ocre', alto: 32, pose: 3, sombrero: 'luz' });
  C.f(527, 270, 7, 5, 'tinta'); C.p(534, 271, 'luz');
  personita(C, 650, 292, { ropa: 'rojo', pant: 'rojo', pelo: 'ocre', piel: 'salmon', alto: 32, pose: 0 });
  C.f(662, 256, 6, 36, 'amarillo'); C.vl(662, 256, 36, 'ocre'); C.hl(662, 256, 6, 'rojo');
  // adelante: la toalla con el sombrero, las chancletas, el balde con la pala y el castillito
  toalla(C, 120, 334, 30, 12, 'salmon', 'luz'); C.d(150, 338, 5, 'crema', 0.6); C.d(150, 338, 2, 'ocre', 0.6);
  chancletas(C, 170, 344, 'azul'); chancletas(C, 300, 338, 'rojo');
  C.f(236, 340, 10, 9, 'rojo'); C.hl(236, 340, 10, 'luz'); C.hl(235, 339, 12, 'rojo'); C.vl(250, 336, 10, 'ocre'); C.f(248, 346, 5, 3, 'amarillo');
  for (const [dx, h] of [[0, 8], [10, 12], [20, 8]] as const) { C.f(560 + dx, 354 - h, 8, h, 'ocre'); C.hl(560 + dx, 354 - h, 8, 'crema'); for (let i = 0; i < 8; i += 2) C.p(560 + dx + i, 354 - h - 1, 'crema'); }
  C.hl(556, 354, 36, 'crema');
  bolso(C, 640, 352, 'verde'); botella(C, 660, 352);
  paloma(C, 690, 350, 'luz'); paloma(C, 700, 346, 'luz');
  return { name: 'borde_margarita', frames: [C.r], w: W, h: H, extra: { corte: 300, nota: 'La arena alrededor de la cancha de vóley: de la fila 238 a la 296 detrás (sombrillas, toallas, la silla del árbitro, las banderas de las esquinas) y de la 324 a la 360 adelante. Se parte en la fila `corte`: arriba va detrás de los atletas, abajo delante.' } };
}

/** El básquet de noche en Maracaibo: la acera de adelante (filas 320 a 360) con las bancas y la mesa de control. */
function bordeMaracaibo(seed: number): UiPiece {
  const C = new Lienzo(W, H, VENEZUELA_MARACAIBO_NOCHE), R = rng(seed);
  const base = 354;
  // la banca de la Familia a la izquierda, con los morrales y las botellas
  banca(C, 130, base, [persona(R, 'azul', { sombrero: 'amarillo' }), persona(R, 'azul'), persona(R, 'amarillo')], ['cemento_claro', 'cemento', 'asfalto']);
  morral(C, 112, base, 'rojo'); morral(C, 190, base, 'azul'); botella(C, 200, base); botella(C, 204, base);
  hielera(C, 214, base, 'rojo');
  // la mesa de control en el medio, con la planilla y el marcador
  mesa(C, 352, base, 'azul_noche', [persona(R, 'luz'), persona(R, 'luz', { sombrero: 'luz' })]);
  carritoBalones(C, 420, base, 'asfalto');
  cono(C, 456, base); cono(C, 468, base);
  // la banca del rival a la derecha
  banca(C, 520, base, [persona(R, 'rojo'), persona(R, 'rojo', { sombrero: 'luz' }), persona(R, 'luz')], ['cemento_claro', 'cemento', 'asfalto']);
  morral(C, 592, base, 'vino'); bolso(C, 604, base, 'rojo');
  // el niño con la bandera y el perro echado, cada uno en su punta
  personita(C, 60, base, { ropa: 'amarillo', pant: 'azul_noche', pelo: 'tinta', piel: 'ocre', alto: 28, pose: 1 });
  C.vl(58, base - 40, 14, 'luz'); for (let j = 0; j < 7; j++) C.hl(59, base - 40 + j, 12 - Math.abs(j - 3) * 2, 'azul');
  perroEchado(C, 690, base, 'ocre');
  paloma(C, 300, base - 2); paloma(C, 640, base - 4);
  // la luz de los postes en la acera: un charco claro tramado bajo cada uno (los postes están en la x 140 y 660 del arte)
  for (const px of [140, 660]) for (let y = 322; y < 360; y++) for (let x = px - 70; x < px + 70; x++) if (!C.has(x, y) && grain(x, y, seed) < 0.5 && bayer(x, y) < 0.18 - Math.abs(x - px) / 600) C.p(x, y, 'cemento_claro');
  return { name: 'borde_cancha_maracaibo', frames: [C.r], w: W, h: H, extra: { corte: 312, nota: 'La acera de adelante de la cancha de básquet (filas 320 a 360): la banca de cada equipo con sus morrales, la mesa de control con el marcador, el carrito de balones, los conos, el niño con la bandera y el perro. Va delante de los atletas.' } };
}

/** El fútbol de calle en el carnaval de Barranquilla: la acera de adelante (320 a 360) con las bancas, los tambores y el raspao. */
function bordeBarranquilla(seed: number): UiPiece {
  const C = new Lienzo(W, H, COLOMBIA_BARRANQUILLA_MEDIODIA), R = rng(seed);
  const base = 354;
  // los niños sentados en el borde de la acera, a la izquierda
  for (let i = 0; i < 4; i++) sentadita(C, 44 + i * 16, base - 5, { alto: 26, ...persona(R) }, i === 1);
  banca(C, 130, base, [persona(R, 'azul'), persona(R, 'amarillo'), persona(R, 'azul', { sombrero: 'crema' })]);
  morral(C, 112, base, 'amarillo'); hielera(C, 192, base, 'azul'); pelota(C, 214, base - 4, 4, 'luz', 'tinta');
  // los tamboreros: dos tambores y el que toca, con la marimonda chiquita al lado
  tambor(C, 300, base, 'rojo'); tambor(C, 316, base, 'amarillo');
  personita(C, 334, base, { ropa: 'luz', pant: 'luz', pelo: 'tinta', piel: 'ocre', alto: 32, pose: 3, sombrero: 'crema' });
  personita(C, 354, base, { ropa: 'rojo', pant: 'amarillo', pelo: 'rojo', piel: 'rojo', alto: 30, pose: 2 });
  C.f(354, base - 30, 9, 4, 'luz'); C.p(356, base - 29, 'tinta'); C.p(360, base - 29, 'tinta'); C.hl(355, base - 27, 7, 'tinta');
  // el carrito de raspao con el vendedor y la cola
  carritoRaspados(C, 410, base);
  personita(C, 452, base, { ropa: 'crema', pant: 'asfalto', pelo: 'tinta', piel: 'salmon', alto: 32, sombrero: 'luz' });
  personita(C, 470, base, { ropa: 'celeste', pant: 'azul_noche', pelo: 'ocre', piel: 'salmon', alto: 26, pose: 1 });
  // la banca del rival y sus cosas
  banca(C, 520, base, [persona(R, 'rojo'), persona(R, 'luz'), persona(R, 'rojo')]);
  bolso(C, 598, base, 'rojo'); botella(C, 616, base); botella(C, 620, base); cono(C, 630, base);
  perroEchado(C, 680, base, 'crema');
  // el confeti y las serpentinas en la acera
  for (let k = 0; k < 160; k++) { const x = Math.floor(R() * W), y = 322 + Math.floor(R() * 36); if (!C.has(x, y)) C.p(x, y, ROPAS[k % ROPAS.length]); }
  for (let k = 0; k < 8; k++) { const x = Math.floor(R() * W), y = 324 + Math.floor(R() * 30); for (let i = 0; i < 9; i++) C.p(x + i, y + ((i >> 1) % 2), ROPAS[k % ROPAS.length]); }
  return { name: 'borde_barranquilla', frames: [C.r], w: W, h: H, extra: { corte: 312, nota: 'La acera de adelante de la cancha de fútbol (filas 320 a 360): los niños sentados en el borde, las bancas, los tamboreros con la marimonda, el carrito de raspao con su cola y el confeti. Va delante de los atletas.' } };
}

/** El đá cầu en el parque Tao Đàn: el pasto detrás de la cancha (236 a 262) y la pista del frente (326 a 360). */
function bordeTaoDan(seed: number): UiPiece {
  const C = new Lienzo(W, H, VIETNAM_TAODAN_AMANECER), R = rng(seed);
  // atrás: la banca del parque, la bicicleta apoyada y la vendedora que pasa
  banca(C, 170, 262, [persona(R, 'crema', { sombrero: 'crema' }), persona(R, 'verde')], ['verde', 'verde_oscuro', 'sombra']);
  bicicleta(C, 560, 262, 'vino');
  vendedora(C, 630, 262);
  // la cesta de volantes y el termo de té
  C.f(250, 254, 10, 8, 'ocre'); C.hl(250, 254, 10, 'crema'); for (let i = 0; i < 3; i++) { C.f(251 + i * 3, 251, 2, 3, 'luz'); C.p(251 + i * 3, 250, 'rojo'); }
  C.f(264, 255, 5, 7, 'rojo'); C.hl(264, 254, 5, 'luz');
  // adelante: los bolsos y las botellas en la pista, el abuelo del tai chi, las palomas y un par de niños sentados
  bolso(C, 150, 354, 'azul'); bolso(C, 168, 354, 'verde'); botella(C, 186, 354); botella(C, 190, 354);
  personita(C, 660, 354, { ropa: 'luz', pant: 'luz', pelo: 'cemento', piel: 'ocre', alto: 32, pose: 1 });
  paloma(C, 400, 350); paloma(C, 412, 346); paloma(C, 426, 352); paloma(C, 300, 356);
  sentadita(C, 520, 349, { alto: 26, ...persona(R, 'celeste') }); sentadita(C, 538, 349, { alto: 26, ...persona(R, 'amarillo') }, true);
  cono(C, 90, 354); pelota(C, 108, 350, 3, 'luz', 'rojo');
  return { name: 'borde_tao_dan', frames: [C.r], w: W, h: H, extra: { corte: 316, nota: 'El parque alrededor de la cancha de đá cầu: detrás (filas 236 a 262) la banca, la bicicleta y la vendedora; adelante (326 a 360) los bolsos, el abuelo del tai chi, las palomas y los niños sentados. Se parte en `corte`.' } };
}

/** El quemado en el patio del liceo: el concreto de adelante (320 a 360) con la banca de los morrales y la profe. */
function bordeLiceo(seed: number): UiPiece {
  const C = new Lienzo(W, H, VENEZUELA_LICEO_MEDIODIA), R = rng(seed);
  const base = 354;
  const uniforme = (extra: Partial<Gente> = {}): Gente => ({ ropa: 'luz', pant: 'azul_noche', pelo: R() < 0.7 ? 'tinta' : 'ocre', piel: R() < 0.6 ? 'salmon' : 'ocre', ...extra });
  // la banca con los morrales de todos
  banca(C, 140, base, [uniforme(), uniforme({ sombrero: 'rojo' }), uniforme()], ['ocre', 'terracota', 'vino']);
  for (const [i, c] of (['rojo', 'azul', 'verde', 'vino', 'amarillo'] as Color[]).entries()) morral(C, 206 + i * 12, base, c);
  // la profe con el pito y la planilla, y el botellón
  personita(C, 300, base, { ropa: 'crema', pant: 'asfalto', pelo: 'ocre', piel: 'salmon', alto: 34, pose: 1 });
  C.f(306, base - 22, 5, 4, 'luz'); C.p(307, base - 21, 'tinta'); C.p(299, base - 26, 'oro'); C.p(300, base - 27, 'oro');
  botellon(C, 322, base);
  // los que esperan sentados en el borde del concreto y los conos apilados
  for (let i = 0; i < 4; i++) sentadita(C, 480 + i * 17, base - 6, uniforme({ alto: 26 }), i === 2);
  cono(C, 600, base); cono(C, 606, base - 4); cono(C, 612, base);
  pelota(C, 650, base - 4, 4, 'rojo', 'vino');
  bolso(C, 690, base, 'azul'); botella(C, 708, base);
  // las rayas de tiza de una rayuela en el concreto, a la izquierda
  for (let j = 0; j < 4; j++) { C.box(40 + (j % 2 ? 0 : 0), 326 + j * 8, 12, 8, 'cemento', 'luz'); }
  textoGrande(C, 43, 328, '1', 'luz', 1); textoGrande(C, 43, 336, '2', 'luz', 1); textoGrande(C, 43, 344, '3', 'luz', 1);
  return { name: 'borde_liceo_patio', frames: [C.r], w: W, h: H, extra: { corte: 312, nota: 'El concreto de adelante de la cancha de quemado (filas 320 a 360): la banca con los morrales, la profe con el pito y el botellón, los que esperan sentados en el borde, los conos y la rayuela. Va delante de los atletas.' } };
}

export function piezasBordes(seed = 11): UiPiece[] {
  return [bordeMargarita(seed), bordeMaracaibo(seed + 1), bordeBarranquilla(seed + 2), bordeTaoDan(seed + 3), bordeLiceo(seed + 4)];
}

