import { rng, grain, bayer } from '../../fx/pix';
import { Lienzo } from './lienzo';
import type { Color, Paleta } from './paleta';
import { MAS_OSCURO } from './tonos';
import type { CtxCerca } from './fachadas';
import { MARGEN_CANCHA as OX, type ObliqueLayout } from './layout';
import type { Luz, Particula, VidaEscena } from './escena';
import type { Lugar } from './lugares';
import { recorte, textoGrande, anchoTexto, malla, sentadita, personita, sombraOval } from './pinceles';

/**
 * La cancha de tenis de arcilla de Đà Lạt en la mañana con neblina (estilo `vietnam_montana`), de lado, para el Tenis de
 * dobles. Lejos, las lomas cubiertas de pinos que se borran en la neblina, el lago Xuân Hương, la catedral rosada con
 * el gallo en la punta y una villa colonial francesa de techo empinado. Cerca, los pinos altísimos de tronco rojizo, el
 * pasto con las hortensias azules y rosadas, la malla verde de la cancha con su lona y el letrero, la silla del juez y
 * la banca de los jugadores. El piso es la arcilla roja barrida, con las rayas blancas donde las pone Tenis.ts.
 *
 * Mide 800 (lote E4): la cancha va en los 640 del medio, de x 80 a 720, y a cada lado hay 80 de pinar. A la izquierda la
 * puerta de la malla, un pino en la neblina y la banca de madera con dos que vinieron a ver abrigados, con su termo de
 * té. A la derecha un farol de hierro de los viejos de Đà Lạt y la señora de la bicicleta cargada de flores.
 */

export const CERCA_DALAT = 'cancha_arcilla_dalat';
/** La franja del layout: el fondo se para en la fila 290 (franja.atras). */
const FT = 290;
/** Filas del fondo: donde empieza el pasto de afuera, la base de la malla y la arcilla de atrás de la cancha. */
export const PASTO = 252, BASE_MALLA = 276;
/** La malla: de la fila de arriba a la base, y los parales (la red del juego va en x 400: ningún paral cae ahí). */
export const MALLA = { top: 206, postes: [8, OX + 8, OX + 128, OX + 248, OX + 392, OX + 512, OX + 632, 792] };
/** La lona verde de la malla con el letrero, entre dos parales. */
export const LONA = { x0: OX + 392, x1: OX + 512, y0: 232, y1: 250 };
/** Los pinos: x del tronco, ancho, la fila de la base y si están lejos (en la neblina). El primero y el último van en los márgenes. */
export const PINOS: { x: number; w: number; base: number; top: number; lejos?: boolean }[] = [
  { x: 22, w: 5, base: 250, top: 110, lejos: true },
  { x: OX + 150, w: 5, base: 250, top: 96, lejos: true }, { x: OX + 286, w: 4, base: 248, top: 120, lejos: true }, { x: OX + 404, w: 5, base: 250, top: 104, lejos: true }, { x: OX + 470, w: 4, base: 249, top: 126, lejos: true },
  { x: 762, w: 4, base: 249, top: 100, lejos: true },
  { x: OX + 36, w: 11, base: 262, top: 26 }, { x: OX + 590, w: 12, base: 264, top: 14 },
];
/** La silla del juez de silla, al lado de la red. */
export const SILLA_JUEZ = { x: OX + 338, base: 288 };
/** La banca de los jugadores. */
export const BANCA = { x0: OX + 196, x1: OX + 248, asiento: 276 };
/** La banca de madera de los que vienen a ver, en el margen de la izquierda, y la puerta de la malla. */
export const BANCA_VISITA = { x0: 8, x1: 50, asiento: 278 }, PUERTA = { x0: 54, x1: 74 };
/** El farol de hierro y la bicicleta de las flores, en el margen de la derecha. */
export const FAROL = { x: 728 }, BICI_FLORES = { x: 744 };
/** Las rayas de Tenis.ts: de x 114 a 686 en la fila 298 (y 8) y de x 108 a 692 en la 322 (y 32); la red en x 400. */
export const CANCHA = { atras: 8, adelante: 32, x0: OX + 34, x1: OX + 606, abre: 6, red: OX + 320 };

// ---------------------------------------------------------------------------------------------------------------------
// Lo lejos: el lago Xuân Hương, las lomas de pinos, la catedral y la villa en la neblina

/** Fila del agua del lago en la capa lejos (la capa va de la fila 90 a la 260 de la pantalla). */
export const LAGO = 128;
/**
 * La catedral del gallo (Nhà thờ Con Gà) y la villa colonial, en x de lejos.png. Con la cancha a 800 se corrieron (antes
 * 236 y 470): la capa lejos va a un cuarto de la cámara, y así caen en los huecos entre los pinos de atrás tanto con la
 * cámara centrada en los 640 como en los 780 del iPhone o con los 800 enteros.
 */
export const CATEDRAL = { x: 264, base: 104 }, VILLA = { x: 556, base: 112 };

/** Un pino lejano: la silueta angosta y puntuda, del color de su distancia (`luz` en el borde del lado del sol). */
function pinoLejos(L: Lienzo, x: number, base: number, alto: number, c: Color, luz: Color) {
  const X = (v: number) => ((v % L.w) + L.w) % L.w;
  for (let j = 0; j < alto; j++) {
    const hw = Math.round(((alto - j) / alto) * (alto * 0.28) * (0.8 + 0.2 * Math.sin(j * 1.7)));
    for (let i = -hw; i <= hw; i++) L.p(X(x + i), base - j, i === -hw && j > 1 ? luz : c);
  }
}

/** Una loma cubierta de pinos: el bosque tupido con las copas puntudas en el filo, del color de su distancia. */
function loma(L: Lienzo, y0: number, amp: number, per: number, fase: number, c: Color, filo: Color, seed: number, pinos = true) {
  const w = L.w;
  const alto = (x: number) => Math.round(y0 - Math.sin((x / w) * Math.PI * 2 * per + fase) * amp - Math.sin((x / w) * Math.PI * 2 * (per * 3) + fase * 2) * (amp / 3));
  for (let x = 0; x < w; x++) {
    const top = alto(x);
    for (let y = top; y < L.h; y++) L.p(x, y, c);
  }
  if (pinos) for (let x = 0; x < w; x += 2 + Math.floor(grain(x, 0, seed) * 4)) pinoLejos(L, x, alto(x) + 2, 5 + Math.floor(grain(x, 1, seed) * 7), c, filo);
}

/** La neblina: bandas tramadas de `bruma` que tapan lo de abajo, más densas al centro de la banda. */
function neblina(L: Lienzo, y0: number, y1: number, k: number, seed: number) {
  for (let y = y0; y < y1; y++) for (let x = 0; x < L.w; x++) {
    const t = (y - y0) / (y1 - y0), d = Math.sin(t * Math.PI) * k * (0.75 + 0.25 * Math.sin(x / 61 + seed));
    if (bayer(x, y) < d) L.p(x, y, 'bruma');
  }
}

/** La catedral del gallo de Đà Lạt: la nave rosada con su techo, la torre del campanario con el reloj, la aguja y el gallo arriba. */
function catedral(L: Lienzo, x: number, base: number) {
  // la nave: la pared rosada con las ventanas en arco y el techo de teja
  L.f(x + 6, base - 12, 30, 12, 'salmon'); L.vl(x + 35, base - 12, 12, 'terracota');
  for (let i = 0; i < 4; i++) { L.f(x + 9 + i * 7, base - 9, 2, 5, 'vino'); L.p(x + 9 + i * 7, base - 10, 'vino'); }
  for (let j = 0; j < 4; j++) L.hl(x + 5 + j, base - 13 - j, 32 - 2 * j, j ? 'terracota' : 'vino');
  // la torre: cuerpo rosado con su reloj, el campanario y la aguja
  L.f(x, base - 34, 9, 34, 'salmon'); L.vl(x, base - 34, 34, 'crema'); L.vl(x + 8, base - 34, 34, 'terracota');
  L.d(x + 4, base - 26, 2, 'crema'); L.p(x + 4, base - 26, 'tinta');
  L.f(x + 3, base - 19, 3, 5, 'vino'); L.p(x + 4, base - 20, 'vino');
  L.f(x + 2, base - 33, 5, 4, 'vino');
  for (let j = 0; j < 12; j++) { const hw = Math.max(0, Math.round((12 - j) * 0.42)); L.hl(x + 4 - hw, base - 35 - j, hw * 2 + 1, j % 3 === 0 ? 'vino' : 'terracota'); }
  // la cruz y el gallo de veleta en la punta
  L.vl(x + 4, base - 51, 4, 'asfalto'); L.hl(x + 3, base - 50, 3, 'asfalto');
  L.f(x + 3, base - 54, 3, 2, 'oro'); L.p(x + 6, base - 55, 'oro'); L.p(x + 2, base - 55, 'oro'); L.p(x + 6, base - 56, 'rojo');
}

/** Una villa colonial francesa: dos pisos crema con persianas, el techo de teja empinado con buhardilla y dos chimeneas. */
function villa(L: Lienzo, x: number, base: number) {
  const w = 34;
  L.f(x, base - 18, w, 18, 'crema'); L.vl(x + w - 1, base - 18, 18, 'cemento_claro'); L.hl(x, base - 9, w, 'cemento_claro');
  for (let i = 0; i < 4; i++) for (const fy of [base - 16, base - 7]) { L.f(x + 3 + i * 8, fy, 3, 4, 'azul_noche'); L.p(x + 2 + i * 8, fy, 'verde'); L.p(x + 6 + i * 8, fy, 'verde'); }
  // el techo empinado (mansarda) de teja roja, con la buhardilla y las chimeneas
  for (let j = 0; j < 12; j++) L.hl(x - 1 + Math.round(j * 0.6), base - 19 - j, w + 2 - Math.round(j * 1.2), j % 3 === 2 ? 'vino' : 'rojo');
  L.f(x + 14, base - 28, 6, 6, 'crema'); L.f(x + 15, base - 26, 4, 3, 'azul_noche'); L.hl(x + 13, base - 29, 8, 'vino');
  for (const cx of [x + 6, x + 26]) { L.f(cx, base - 36, 3, 8, 'cemento_claro'); L.hl(cx - 1, base - 36, 5, 'cemento'); }
}

/**
 * Đà Lạt en la mañana con neblina: las montañas lejanas casi borradas, las lomas cubiertas de pinos en planos que se
 * aclaran con la distancia, la catedral del gallo y una villa colonial en la loma, el lago Xuân Hương con su orilla y
 * la neblina en bandas. Arriba queda transparente (el cielo).
 */
export function lagoXuanHuong(pal: Paleta, w: number, h: number, seed: number): Lienzo {
  const L = new Lienzo(w, h, pal);
  // la montaña lejana (el Langbiang) apenas asoma en la neblina
  loma(L, 50, 16, 1, 1.1, 'celeste', 'cielo', seed, false);
  neblina(L, 38, 74, 0.55, seed);
  // las lomas de pinos, de atrás hacia adelante: cada una más verde y más oscura
  loma(L, 74, 8, 2, 0.4, 'cemento_claro', 'cielo', seed + 1);
  neblina(L, 64, 92, 0.42, seed + 2);
  loma(L, 96, 7, 3, 2.1, 'menta', 'cielo', seed + 3);
  catedral(L, CATEDRAL.x, CATEDRAL.base);
  villa(L, VILLA.x, VILLA.base);
  // la orilla de enfrente del lago, con sus árboles y casitas
  for (let x = 0; x < w; x++) { const t = LAGO - 2 - Math.round(2 + Math.sin(x / 40) * 2 + grain(x >> 3, 2, seed) * 3); for (let y = t; y < LAGO; y++) L.p(x, y, y === t ? 'verde' : 'verde_oscuro'); }
  for (let x = 20; x < w; x += 46 + Math.floor(grain(x, 3, seed) * 40)) { L.f(x, LAGO - 9, 7, 5, 'crema'); L.hl(x - 1, LAGO - 10, 9, 'rojo'); }
  // el lago: el agua quieta gris azulada con la orilla reflejada y rayitas de luz
  for (let y = LAGO; y < LAGO + 18; y++) for (let x = 0; x < w; x++) {
    const t = (y - LAGO) / 18;
    L.p(x, y, y === LAGO ? 'cielo' : t < 0.25 && bayer(x, y) < 0.5 - t * 2 ? 'verde_oscuro' : bayer(x, y) < 0.18 ? 'celeste' : 'canal');
  }
  for (let k = 0; k < w / 5; k++) { const x = Math.floor(grain(k, 4, seed) * w), y = LAGO + 3 + Math.floor(grain(k, 5, seed) * 14); L.hl(x, y, 2 + (k % 5), 'cielo'); }
  // un botecito de pedal en forma de cisne, blanco
  L.f(300, LAGO + 7, 9, 3, 'luz'); L.vl(307, LAGO + 3, 4, 'luz'); L.p(308, LAGO + 3, 'oro'); L.hl(299, LAGO + 10, 11, 'celeste');
  neblina(L, LAGO - 8, LAGO + 6, 0.5, seed + 4);
  // la orilla de este lado: pinos oscuros y pasto, que la capa cerca casi tapa
  loma(L, LAGO + 24, 4, 4, 0.7, 'verde_oscuro', 'verde', seed + 5);
  return L;
}

// ---------------------------------------------------------------------------------------------------------------------
// Los pinos, la malla, las hortensias, la silla del juez y la banca

/**
 * Un pino de Đà Lạt (thông ba lá): el tronco recto y rojizo con la corteza en placas, y la copa en racimos de agujas
 * que se abren como un paraguas irregular en el tercio de arriba, con ramas que asoman entre los racimos.
 */
export function pino(C: Lienzo, p: (typeof PINOS)[number], seed: number) {
  const R = rng(seed), { x, w, base, top, lejos } = p;
  const corteza: [Color, Color, Color] = lejos ? ['cemento', 'asfalto_claro', 'asfalto_claro'] : ['ocre', 'terracota', 'vino'];
  const alto = base - top, copaAbajo = top + Math.round(alto * (lejos ? 0.5 : 0.46));
  for (let y = top + 6; y < base; y++) {
    const ancho = Math.max(2, Math.round(w * (0.55 + 0.45 * (y - top) / alto)) + Math.max(0, Math.round((y - (base - 8)) * 0.6)));
    const x0 = x - Math.floor(ancho / 2);
    for (let i = 0; i < ancho; i++) {
      const t = i / ancho;
      let c: Color = t < 0.25 ? corteza[0] : t < 0.72 ? corteza[1] : corteza[2];
      if (!lejos && (grain((x0 + i) >> 1, y >> 2, seed) < 0.18 || (y + (i >> 1)) % 9 === 0)) c = MAS_OSCURO[c];
      C.p(x0 + i, y, c);
    }
  }
  const hojas: [Color, Color, Color] = lejos ? ['asfalto_claro', 'cemento', 'cemento_claro'] : ['verde_oscuro', 'verde', 'menta'];
  // las ramas que salen en diagonal hacia arriba y los racimos en su punta
  const n = lejos ? 14 : 16, ancho = lejos ? 30 : 46;
  const racimos: [number, number, number][] = [];
  for (let k = 0; k < n; k++) {
    const t = k / (n - 1), y = Math.round(top + t * (copaAbajo - top)), lado = k % 2 ? 1 : -1;
    const largo = Math.round((0.35 + 0.65 * Math.sin(t * Math.PI * 0.85 + 0.3)) * ancho * (0.7 + R() * 0.4));
    const ex = x + lado * largo, ey = y - Math.round(largo * 0.25);
    C.ln(x, y + 4, ex, ey + 2, corteza[2]);
    racimos.push([ex, ey + (lejos ? Math.floor(R() * 5) - 2 : 0), (lejos ? 9 : 11) + Math.floor(R() * (lejos ? 6 : 9))]);
    if (largo > 16) racimos.push([x + Math.round(lado * largo * 0.5), y - Math.round(largo * 0.1), (lejos ? 6 : 9) + Math.floor(R() * 5)]);
  }
  racimos.push([x, top, lejos ? 8 : 12]);
  // primero la sombra de todos y después la luz: los racimos se juntan en una copa
  for (const [cx, cy, r] of racimos) racimo(C, cx, cy, r, hojas, seed + cx * 7 + cy, 'sombra');
  for (const [cx, cy, r] of racimos) racimo(C, cx, cy, r, hojas, seed + cx * 7 + cy, 'luz');
}

/** Un racimo de agujas de pino: una nube aplastada con el borde en puntas. `capa` pinta la sombra o la luz encima. */
function racimo(C: Lienzo, cx: number, cy: number, r: number, c: [Color, Color, Color], seed: number, capa: 'sombra' | 'luz') {
  const hw = r, hh = Math.max(3, Math.round(r * 0.55));
  for (let j = -hh - 2; j <= hh + 1; j++) for (let i = -hw - 2; i <= hw + 2; i++) {
    const d = (i / hw) ** 2 + (j / hh) ** 2, puntas = grain(cx + i, cy + j, seed) * 0.5;
    if (d > 1 + puntas * (j > 0 ? 0.2 : 0.6)) continue;
    if (capa === 'sombra') { C.p(cx + i, cy + j + 1, c[0]); continue; }
    if (j > hh * 0.2 || d > 0.85) continue;
    C.p(cx + i, cy + j, j < -hh * 0.45 && i < hw * 0.3 && bayer(cx + i, cy + j) < 0.55 ? c[2] : c[1]);
  }
}

/** Una mata de hortensias (cẩm tú cầu): las bolas de flores azules, celestes o rosadas sobre las hojas. */
export function hortensias(C: Lienzo, x: number, base: number, w: number, flor: [Color, Color], seed: number) {
  const R = rng(seed);
  for (let i = 0; i < w; i += 3) { const hh = 6 + Math.floor(R() * 5); for (let j = 0; j < hh; j++) for (let q = 0; q < 4; q++) C.p(x + i + q, base - j, j > hh - 2 ? 'verde' : bayer(x + i + q, base - j) < 0.3 ? 'verde' : 'verde_oscuro'); }
  for (let k = 0; k < w / 6; k++) {
    const cx = x + 3 + Math.floor(R() * (w - 6)), cy = base - 7 - Math.floor(R() * 5);
    C.d(cx, cy, 3, flor[0]); C.p(cx - 1, cy - 1, flor[1]); C.p(cx, cy - 2, flor[1]); C.p(cx + 1, cy - 1, flor[1]);
  }
}

/** La silla del juez de silla: patas de tubo, escalerita, el asiento alto con su sombrilla chiquita, y el juez con gorra. */
function sillaJuez(C: Lienzo) {
  const { x, base } = SILLA_JUEZ, top = base - 40;
  for (const px of [x, x + 12]) { C.vl(px, top, base - top, 'luz'); C.vl(px + 1, top, base - top, 'cemento_claro'); }
  for (let y = top + 8; y < base; y += 6) C.hl(x, y, 13, 'cemento_claro');
  C.f(x - 1, top - 2, 15, 3, 'verde'); C.hl(x - 1, top - 2, 15, 'menta');
  // el juez sentado, de camisa clara y gorra
  sentadita(C, x + 3, top - 2, { ropa: 'crema', pant: 'azul_noche', pelo: 'tinta', piel: 'salmon', sombrero: 'luz', alto: 18 });
  C.f(x - 3, top - 26, 19, 2, 'verde'); C.vl(x + 6, top - 24, 6, 'asfalto_claro');
}

/** La banca de los jugadores: tablas verdes sobre patas, los bolsos de las raquetas, las toallas y el cesto de pelotas. */
function bancaJugadores(C: Lienzo, f: number) {
  const { x0, x1, asiento } = BANCA, piso = FT - 4;
  C.f(x0, asiento, x1 - x0, 3, 'verde'); C.hl(x0, asiento, x1 - x0, 'menta'); C.hl(x0, asiento + 3, x1 - x0, 'verde_oscuro');
  for (const px of [x0 + 3, x1 - 6]) C.f(px, asiento + 3, 3, piso - asiento - 3, 'asfalto');
  // dos jugadores esperando, que aplauden (la vida)
  sentadita(C, x0 + 8, asiento, { ropa: 'luz', pant: 'luz', pelo: 'tinta', piel: 'salmon', alto: 22 }, f % 2 === 1);
  sentadita(C, x0 + 22, asiento, { ropa: 'azul', pant: 'luz', pelo: 'sombra', piel: 'ocre', alto: 22, sombrero: 'luz' }, f % 2 === 0);
  // el bolso largo de las raquetas y la toalla
  C.f(x0 + 34, asiento - 6, 16, 6, 'rojo'); C.hl(x0 + 34, asiento - 6, 16, 'salmon'); C.vl(x0 + 49, asiento - 6, 6, 'vino'); C.f(x0 + 36, asiento - 5, 3, 3, 'luz');
  C.f(x0 - 2, asiento - 1, 6, 9, 'crema');
  // el cesto de pelotas amarillas
  const cx = x1 + 12;
  C.f(cx, piso - 10, 12, 10, 'asfalto_claro'); for (let i = 0; i < 12; i += 3) C.vl(cx + i, piso - 10, 10, 'asfalto');
  for (let i = 0; i < 5; i++) { C.d(cx + 2 + i * 2, piso - 11 - (i % 2), 1.6, 'amarillo'); }
  C.hl(cx - 1, piso - 10, 14, 'cemento');
}

/**
 * La banca de madera de los que vienen a ver (margen de la izquierda): dos abrigados para el frío de la mañana, uno de
 * suéter rojo y gorro de lana y la otra de chaqueta con bufanda, con el termo de té y los vasitos en la tabla.
 */
function bancaVisita(C: Lienzo) {
  const { x0, x1, asiento } = BANCA_VISITA, piso = FT - 4;
  sombraOval(C, (x0 + x1) / 2 + 2, piso, (x1 - x0) / 2 + 4, 2, 'vino', 0.45);
  for (const px of [x0 + 3, x1 - 6]) { C.f(px, asiento + 3, 3, piso - asiento - 3, 'terracota'); C.vl(px + 2, asiento + 3, piso - asiento - 3, 'vino'); }
  C.f(x0, asiento, x1 - x0, 3, 'ocre'); C.hl(x0, asiento, x1 - x0, 'amarillo'); C.hl(x0, asiento + 3, x1 - x0, 'vino');
  // el espaldar de tablas
  for (const y of [asiento - 9, asiento - 5]) { C.hl(x0, y, x1 - x0, 'ocre'); C.hl(x0, y + 1, x1 - x0, 'terracota'); }
  for (const px of [x0 + 2, x1 - 4]) C.vl(px, asiento - 10, 10, 'vino');
  sentadita(C, x0 + 6, asiento, { ropa: 'rojo', pant: 'azul_noche', pelo: 'tinta', piel: 'salmon', alto: 20 });
  // el gorro de lana con su pompón
  C.f(x0 + 8, asiento - 21, 5, 3, 'crema'); C.hl(x0 + 8, asiento - 19, 5, 'cemento_claro'); C.p(x0 + 10, asiento - 22, 'luz');
  sentadita(C, x0 + 20, asiento, { ropa: 'azul', pant: 'sombra', pelo: 'sombra', piel: 'ocre', alto: 20 });
  // la bufanda amarilla que le cuelga
  C.hl(x0 + 21, asiento - 13, 7, 'amarillo'); C.vl(x0 + 22, asiento - 12, 4, 'amarillo'); C.p(x0 + 22, asiento - 8, 'oro');
  // el termo rojo de té y los dos vasitos
  const tx = x0 + 32;
  C.f(tx, asiento - 9, 4, 9, 'rojo'); C.vl(tx + 3, asiento - 9, 9, 'vino'); C.hl(tx, asiento - 10, 4, 'luz'); C.hl(tx, asiento - 5, 4, 'crema');
  for (const vx of [tx + 6, tx + 9]) { C.f(vx, asiento - 3, 2, 3, 'luz'); C.p(vx, asiento - 3, 'ocre'); }
}

/** La puerta de la malla, en el margen de la izquierda: el marco de tubo, el pasador y el candado abierto colgando. */
function puertaMalla(C: Lienzo) {
  const { x0, x1 } = PUERTA, top = MALLA.top + 12;
  for (const px of [x0, x1]) { C.f(px - 1, top, 2, BASE_MALLA - top, 'asfalto'); C.vl(px - 1, top, BASE_MALLA - top, 'cemento'); }
  C.f(x0 - 1, top - 1, x1 - x0 + 2, 2, 'asfalto'); C.hl(x0, top - 1, x1 - x0, 'cemento');
  C.hl(x0, Math.round((top + BASE_MALLA) / 2), x1 - x0, 'asfalto');
  // las bisagras y el pasador con el candado
  for (const y of [top + 4, BASE_MALLA - 6]) C.f(x0 - 2, y, 3, 2, 'sombra');
  C.f(x1 - 4, top + 26, 6, 2, 'cemento_claro'); C.f(x1 + 1, top + 28, 3, 3, 'oro'); C.p(x1 + 2, top + 27, 'asfalto');
  // el letrerito blanco con el número de la cancha
  C.box(x0 + 5, top + 6, 10, 7, 'luz', 'cemento'); C.f(x0 + 9, top + 8, 2, 3, 'rojo');
}

/**
 * El farol de hierro de los viejos de Đà Lạt (margen de la derecha), afuera de la malla: el pie con su base de molduras,
 * el palo verde oscuro, el brazo con volutas y la linterna de vidrio, apagada a esta hora.
 */
function farol(C: Lienzo) {
  const x = FAROL.x, piso = BASE_MALLA - 1, top = 184;
  C.f(x - 3, piso - 6, 7, 6, 'sombra'); C.hl(x - 3, piso - 6, 7, 'asfalto'); C.f(x - 2, piso - 9, 5, 3, 'sombra');
  C.f(x - 1, top + 8, 3, piso - top - 17, 'sombra'); C.vl(x - 1, top + 8, piso - top - 17, 'asfalto');
  for (let y = top + 30; y < piso - 10; y += 22) C.hl(x - 2, y, 5, 'asfalto');
  // la linterna: el sombrerito, el vidrio crema con sus barras y el remate
  C.f(x - 4, top + 6, 9, 2, 'sombra');
  C.f(x - 3, top - 4, 7, 10, 'crema'); C.vl(x, top - 4, 10, 'asfalto'); C.vl(x - 3, top - 4, 10, 'sombra'); C.vl(x + 3, top - 4, 10, 'sombra');
  C.p(x - 2, top - 2, 'luz');
  for (let j = 0; j < 4; j++) C.hl(x - 4 + j, top - 5 - j, 9 - 2 * j, 'sombra');
  C.p(x, top - 10, 'asfalto');
  // las volutas debajo de la linterna
  C.p(x - 3, top + 9, 'sombra'); C.p(x - 4, top + 10, 'sombra'); C.p(x + 3, top + 9, 'sombra'); C.p(x + 4, top + 10, 'sombra');
}

/**
 * La bicicleta de las flores (margen de la derecha), parada en el pasto: las ruedas, el cuadro negro y las cestas de
 * mimbre llenas de hortensias, rosas y margaritas, con la señora del nón lá y el suéter rosado que las vende.
 */
function biciFlores(C: Lienzo, seed: number) {
  const x = BICI_FLORES.x, piso = BASE_MALLA - 1, R = rng(seed);
  // las ruedas y el cuadro
  for (const cx of [x + 6, x + 30]) {
    for (let a = 0; a < 32; a++) { const t = (a / 32) * Math.PI * 2; C.p(Math.round(cx + Math.cos(t) * 6), Math.round(piso - 6 + Math.sin(t) * 6), 'sombra'); }
    C.p(cx, piso - 6, 'cemento_claro');
  }
  C.ln(x + 6, piso - 6, x + 15, piso - 6, 'azul'); C.ln(x + 15, piso - 6, x + 12, piso - 15, 'azul'); C.ln(x + 12, piso - 15, x + 26, piso - 15, 'azul');
  C.ln(x + 26, piso - 15, x + 30, piso - 6, 'azul'); C.ln(x + 15, piso - 6, x + 26, piso - 15, 'azul'); C.ln(x + 6, piso - 6, x + 12, piso - 15, 'azul_noche');
  C.hl(x + 10, piso - 16, 4, 'sombra'); C.hl(x + 25, piso - 19, 5, 'sombra'); C.vl(x + 26, piso - 18, 3, 'asfalto');
  // la cesta grande de atrás y la de adelante, de mimbre
  for (const [bx, bw, bh] of [[x - 2, 15, 7], [x + 26, 9, 5]] as const) {
    C.f(bx, piso - 16 - bh, bw, bh, 'ocre');
    for (let i = 0; i < bw; i += 2) C.vl(bx + i, piso - 16 - bh, bh, 'terracota');
    C.hl(bx, piso - 16 - bh, bw, 'amarillo'); C.hl(bx, piso - 17, bw, 'terracota');
    // las flores que se salen de la cesta
    for (let k = 0; k < bw * 1.6; k++) {
      const fx = bx + Math.floor(R() * bw), fy = piso - 17 - bh - Math.floor(R() * 6);
      C.vl(fx, fy, piso - 16 - bh - fy, 'verde');
      C.d(fx, fy, 1.6, (['azul', 'celeste', 'rojo', 'salmon', 'amarillo', 'luz'] as Color[])[Math.floor(R() * 6)]);
    }
  }
  // la señora, parada al lado con su nón lá
  const px = x + 38;
  personita(C, px, piso + 1, { ropa: 'salmon', pant: 'sombra', pelo: 'tinta', piel: 'salmon', pose: 0, alto: 26 });
  const hy = piso + 1 - 26 + 1;
  for (const [j, i0, w] of [[0, 4, 1], [1, 3, 3], [2, 2, 5], [3, 0, 9], [4, -2, 13]] as const) C.hl(px + i0, hy - 4 + j, w, j === 4 ? 'ocre' : 'crema');
  // un ramito de hortensias en la mano
  C.d(px - 2, piso - 12, 2, 'azul'); C.p(px - 3, piso - 13, 'celeste'); C.vl(px - 2, piso - 10, 3, 'verde');
}

/** La lona verde de la malla con el letrero de la cancha: SÂN QUẦN VỢT ĐÀ LẠT. */
function lona(C: Lienzo) {
  const { x0, x1, y0, y1 } = LONA;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) C.p(x, y, y === y0 || y === y1 - 1 ? 'verde_oscuro' : (x + y) % 11 === 0 ? 'verde_oscuro' : 'verde');
  for (let x = x0 + 3; x < x1; x += 12) { C.p(x, y0 + 1, 'luz'); C.p(x, y1 - 2, 'luz'); }
  const t = 'SÂN QUẦN VỢT ĐÀ LẠT', w = anchoTexto(t, 1);
  textoGrande(C, Math.round((x0 + x1 - w) / 2), y0 + 3, t, 'luz', 1);
}

// ---------------------------------------------------------------------------------------------------------------------
// La capa cerca completa

/** La cancha completa sobre la capa cerca (alto franja.atras). `f` es el cuadro de la banca (los que aplauden). */
export function pintarDalat(C: Lienzo, seed: number, o: { f?: number } = {}) {
  const W = C.w;
  // el pasto de afuera, con la sombra de los pinos y las agujas caídas
  for (let y = PASTO; y < BASE_MALLA; y++) for (let x = 0; x < W; x++) {
    const n = grain(x, y, seed);
    C.p(x, y, y === PASTO ? 'menta' : n < 0.06 ? 'ocre' : n > 0.93 ? 'menta' : bayer(x, y) < 0.25 + (y - PASTO) / 60 ? 'verde' : 'menta');
  }
  // los pinos de atrás, en la neblina, y los de adelante, grandes
  for (const p of PINOS.filter((q) => q.lejos)) pino(C, p, seed + p.x);
  // las hortensias contra la malla, afuera
  for (const [x, w, a, b] of [[76, 26, 'salmon', 'crema'], [OX + 60, 50, 'azul', 'celeste'], [OX + 136, 40, 'salmon', 'crema'], [OX + 260, 44, 'azul', 'celeste'], [OX + 344, 36, 'salmon', 'crema'], [OX + 530, 60, 'azul', 'celeste'], [700, 24, 'celeste', 'luz']] as const) hortensias(C, x, BASE_MALLA - 1, w, [a, b], seed + x);
  // afuera de la malla, en el margen de la derecha: el farol viejo y la bicicleta de las flores
  farol(C);
  biciFlores(C, seed + 5);
  // la arcilla de atrás de la cancha, hasta la franja, con el borde de concreto de la malla
  for (let y = BASE_MALLA; y < FT; y++) for (let x = 0; x < W; x++) C.p(x, y, y === BASE_MALLA ? 'cemento_claro' : y === BASE_MALLA + 1 ? 'cemento' : arcilla(x, y + 40, seed));
  // la malla: los parales y el alambre en rombos (deja ver lo de atrás), con el tubo de arriba
  malla(C, 0, MALLA.top, W, BASE_MALLA, 'asfalto_claro', 10);
  for (let x = 0; x < W; x++) { C.p(x, MALLA.top - 1, 'asfalto'); C.p(x, MALLA.top, 'cemento'); }
  for (const px of MALLA.postes) { C.f(px - 1, MALLA.top - 3, 3, BASE_MALLA - MALLA.top + 3, 'asfalto'); C.vl(px - 1, MALLA.top - 3, BASE_MALLA - MALLA.top + 3, 'cemento'); C.f(px - 2, MALLA.top - 4, 5, 2, 'asfalto'); }
  lona(C);
  puertaMalla(C);
  // los pinos grandes de adelante, afuera de la cancha, que tapan el borde de la malla
  for (const p of PINOS.filter((q) => !q.lejos)) pino(C, p, seed + p.x);
  bancaJugadores(C, o.f ?? 0);
  sillaJuez(C);
  bancaVisita(C);
  for (const x of [OX + 150, OX + 470]) sombraOval(C, x, FT - 6, 30, 2, 'vino', 0.3);
}

export const fondoDalat = (C: Lienzo, _x0: number, _x1: number, _base: number, ctx: CtxCerca) => pintarDalat(C, ctx.seed);

// ---------------------------------------------------------------------------------------------------------------------
// El piso: la arcilla barrida

/** La arcilla roja de la cancha: barrida en arcos con la escoba de red, con el polvo más claro y huellas de deslizadas. */
export function arcilla(x: number, y: number, s: number): Color {
  const xr = ((x % 960) + 960) % 960;
  // los arcos que deja la red de barrer, de lado a lado
  const arco = Math.round(Math.sqrt(Math.max(0, (xr % 160 - 80) ** 2 + (y * 3) ** 2)));
  const barrida = arco % 7 === 0;
  const n = grain(xr, y, s);
  if (n < 0.01) return 'vino';
  if (n > 0.992) return 'crema';
  if (barrida && bayer(xr, y) < 0.45) return 'ocre';
  if (grain(xr >> 3, y >> 2, s + 1) < 0.15 && bayer(xr, y) < 0.35) return 'ocre';
  return grain(xr >> 1, y, s + 2) < 0.05 ? 'vino' : 'terracota';
}

/** Las rayas blancas de la cancha, con el polvo de arcilla encima, donde las pone Tenis.ts, y las marcas de una deslizada. */
export function rayasDalat(P: Lienzo, _L: ObliqueLayout, seed: number) {
  const { atras, adelante, x0, x1, abre, red } = CANCHA, polvo = (x: number, y: number) => grain(x >> 1, y, seed + 7) < 0.08;
  for (let x = x0; x <= x1; x++) P.p(x, atras, polvo(x, atras) ? 'ocre' : 'luz');
  for (let x = x0 - abre; x <= x1 + abre; x++) { P.p(x, adelante, polvo(x, adelante) ? 'ocre' : 'luz'); P.p(x, adelante + 1, 'crema'); }
  for (let y = atras; y <= adelante; y++) {
    const t = (y - atras) / (adelante - atras);
    for (const x of [Math.round(x0 - abre * t), Math.round(x1 + abre * t)]) if (!polvo(x, y)) P.p(x, y, 'luz');
    // la raya de debajo de la red, más gastada
    if (!polvo(red, y) && y % 2) P.p(Math.round(red + 3 * t), y, 'crema');
  }
  // una deslizada en la arcilla, cerca del fondo
  for (const [cx, cy] of [[OX + 120, 20], [OX + 512, 14]] as const) for (let i = 0; i < 22; i++) { P.p(cx + i, cy + Math.round(i / 11), 'ocre'); if (i % 3) P.p(cx + i, cy + 1 + Math.round(i / 11), 'vino'); }
}

/** Lo de adelante de la cancha: la arcilla, el bordillo de concreto y el pasto con agujas de pino y piñas caídas. */
export function orillaDalat(x: number, r: number, s: number): Color {
  const xr = ((x % 960) + 960) % 960;
  if (r < 20) return arcilla(x, r + 40, s);
  if (r === 20) return 'cemento_claro';
  if (r < 23) return r === 22 ? 'asfalto_claro' : 'cemento';
  // las piñas
  for (const px of [24, OX + 86, OX + 310, OX + 471, OX + 702, OX + 845]) { const d = Math.hypot(xr - px, (r - 26) * 1.4); if (d < 3) return d < 1.5 ? 'terracota' : 'vino'; }
  const n = grain(xr, r, s + 3);
  if (n < 0.07) return 'ocre';
  return r === 23 ? 'verde_oscuro' : n > 0.9 ? 'menta' : 'verde';
}

// ---------------------------------------------------------------------------------------------------------------------
// Vida, luces y partículas

/** Una banda de neblina que pasa delante de las lomas: un tramado de `bruma` que se apaga en las puntas. */
function bandaNeblina(pal: Paleta, w: number, h: number, seed: number): Lienzo[] {
  const L = new Lienzo(w, h, pal);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const t = Math.sin((y / h) * Math.PI) * Math.sin((x / w) * Math.PI);
    if (bayer(x, y) < t * 0.5 && grain(x >> 3, y >> 1, seed) < 0.85) L.p(x, y, 'bruma');
  }
  return [L];
}

export function vidaDalat(pal: Paleta, L: ObliqueLayout, _k: number, seed: number, capas: { cerca: Lienzo; piso: Lienzo }): VidaEscena[] {
  const out: VidaEscena[] = [], quiere = (t: string) => L.vida.includes(t);
  if (quiere('neblina')) {
    out.push({ id: 'neblina_0', tipo: 'neblina', capa: 'lejos', x: -260, y: 62, cuadros: bandaNeblina(pal, 260, 22, seed), fps: 1, recorrido: { desde: [-260, 62], hasta: [1280, 58], segundos: 90, desfase: 0.25 } });
    out.push({ id: 'neblina_1', tipo: 'neblina', capa: 'lejos', x: 1280, y: 104, cuadros: bandaNeblina(pal, 320, 18, seed + 1), fps: 1, recorrido: { desde: [1280, 104], hasta: [-320, 108], segundos: 120, desfase: 0.6 } });
  }
  if (quiere('publico')) {
    const cs = [0, 1].map((f) => { const c = new Lienzo(capas.cerca.w, capas.cerca.h, pal); pintarDalat(c, seed, { f }); return c; });
    const x = BANCA.x0 - 4, y = BANCA.asiento - 26, w = 40, h = 30;
    out.push({ id: 'publico', tipo: 'publico', capa: 'cerca', x, y, cuadros: cs.map((c) => recorte(c, x, y, w, h)), fps: 2 });
  }
  return out;
}

export function lucesDalat(pal: Paleta, _L: ObliqueLayout, _k: number): Luz[] {
  return [{ x: OX + 120, y: 220, color: pal.amarillo, radio: 80, latido: 0.1, encendida: true, nota: 'el sol de la mañana que entra entre los pinos y la neblina' }, { x: OX + 470, y: 230, color: pal.amarillo, radio: 70, latido: 0.08, encendida: true, nota: 'el sol de la mañana sobre la malla' }];
}

export function particulasDalat(pal: Paleta, L: ObliqueLayout, _k: number): Particula[] {
  return [
    { tipo: 'neblina', x0: 0, x1: L.largo, y0: 150, y1: 240, color: [pal.bruma, pal.cielo], cada: 0.8, sube: 2, vida: 3, nota: 'jirones de neblina que flotan entre los pinos' },
    { tipo: 'polvo', x0: OX + 20, x1: OX + 620, y0: 300, y1: 326, color: [pal.ocre, pal.terracota], cada: 1.4, sube: 4, vida: 0.8, nota: 'el polvo de arcilla que levantan los pasos' },
  ];
}

export const DALAT: Lugar = {
  estilo: 'vietnam_montana',
  fondo: fondoDalat,
  lejos: { lago_xuan_huong_pinos: lagoXuanHuong },
  pisos: { greda: (x, y, s) => arcilla(x, y, s) },
  orilla: orillaDalat,
  marcas: rayasDalat,
  vida: vidaDalat,
  luces: lucesDalat,
  particulas: particulasDalat,
};
