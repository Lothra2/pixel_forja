import { rng, grain, bayer } from '../../fx/pix';
import { Lienzo } from './lienzo';
import type { Color, Paleta } from './paleta';
import { drawText, textWidth, LINE_H } from './letras';
import { MAS_OSCURO } from './tonos';
import { copa, type CtxCerca } from './fachadas';
import { MARGEN_CANCHA as OX, type ObliqueLayout } from './layout';
import type { Luz, Particula, VidaEscena } from './escena';
import type { Lugar } from './lugares';

/**
 * El parque Tao Đàn de Saigón al amanecer (estilo `vietnam_parque`), de lado, para el Đá cầu. Los árboles dầu enormes
 * con sus troncos claros y altísimos y la copa que tapa el cielo, los rayos de sol que entran entre los troncos, los
 * bancos de piedra con los señores del café de los pájaros y sus jaulas colgadas, el grupo de tai chi y los abuelos
 * haciendo ejercicio en el pasto. Lejos, Saigón en la bruma rosada. El piso es la cancha de tierra apisonada, con las
 * rayas en el mismo sitio donde las pone DaCau.ts.
 *
 * Mide 800 (lote E4): la cancha va en los 640 del medio, de x 80 a 720, y a cada lado hay 80 de parque. A la izquierda
 * otro dầu en la bruma y el cà phê cóc de la señora, con sus taburetes de plástico, el termo y un señor tomándose su
 * café con la jaula colgada al lado. A la derecha otro dầu y el barrendero de naranja con su escoba de palma, el montón
 * de hojas secas y el carrito de la basura.
 */

export const CERCA_TAODAN = 'parque_tao_dan';
/** La franja del layout: el fondo se para en la fila 290 (franja.atras). */
const FT = 290;
/** Fila del pasto de atrás (donde se paran el tai chi y los bancos) y del camino que bordea la cancha. */
export const PASTO = 256;
const CAMINO = 282;
/** Los troncos de los dầu: centro, ancho y dónde empiezan (debajo de la copa). El primero y el último van en los márgenes. */
export const TRONCOS = [
  { x: 34, w: 16, top: 60, base: 250, lejos: true },
  { x: OX + 64, w: 30, top: 40, base: 266 }, { x: OX + 222, w: 18, top: 60, base: 250, lejos: true }, { x: OX + 508, w: 34, top: 30, base: 268 }, { x: OX + 632, w: 24, top: 50, base: 264 },
  { x: 778, w: 14, top: 64, base: 250, lejos: true },
];
/** El grupo de tai chi: x de cada uno, en el pasto de atrás. */
export const TAI_CHI = [OX + 130, OX + 158, OX + 186, OX + 214, OX + 250];
/** El palo de las jaulas y el banco de piedra de los señores del café de los pájaros. */
export const JAULAS = { x0: OX + 404, x1: OX + 468, y: 202 };
export const BANCO = { x0: OX + 406, x1: OX + 466, asiento: 262 };
/** Los abuelos haciendo ejercicio, a la derecha. */
export const ABUELOS = [OX + 556, OX + 584];
/** El letrero del parque, arriba de la red (que el juego pone en x 400 y llega a la fila 264). */
export const LETRERO = { x: OX + 254, y: 222 };
/** El cà phê cóc del margen de la izquierda y el barrendero del margen de la derecha: x de la izquierda de cada uno. */
export const CAFE_COC = { x: 6 }, BARRENDERO = { x: 734 };
/** Dónde empiezan los rayos de sol (x en la fila RAYO_Y, debajo de la copa): bajan a la derecha 0.62 por fila. */
export const RAYOS = [OX + 120, OX + 300, OX + 540], RAYO_Y = 136;
/** La x del medio de un rayo en la fila y. */
const enRayo = (x0: number, y: number) => x0 + Math.round((y - RAYO_Y) * 0.62) + 12;
/** Las rayas de la cancha de DaCau.ts: de x 114 a 686 en la fila 298 (y 8) y de x 108 a 692 en la 322 (y 32); la red en x 400. */
export const CANCHA = { atras: 8, adelante: 32, x0: OX + 34, x1: OX + 606, abre: 6, red: OX + 320 };

// ---------------------------------------------------------------------------------------------------------------------
// Lo lejos: Saigón en la bruma del amanecer

/** Una torre de lejos, plana y en la bruma, con su filo encendido del lado del sol (la izquierda). */
function torre(L: Lienzo, x: number, w: number, top: number, base: number, color: Color, luz: Color) {
  for (let y = top; y < base; y++) for (let i = 0; i < w; i++) L.p((((x + i) % L.w) + L.w) % L.w, y, i === 0 ? luz : color);
}

/** Saigón al amanecer: Landmark 81 y la Bitexco con su helipuerto entre las torres, en la bruma, y los árboles del parque delante. */
export function saigonAmanecer(pal: Paleta, w: number, h: number, seed: number): Lienzo {
  const L = new Lienzo(w, h, pal), R = rng(seed), base = h - 22;
  // torres bajas en dos planos, la de atrás más clara
  for (const [plano, c, luz] of [[0, 'bruma', 'cielo'], [1, 'canal', 'bruma']] as const) {
    // la última da la vuelta por el borde: la capa se repite sin costura
    let x = plano * 11;
    while (x < w + plano * 11) {
      const tw = 10 + Math.floor(R() * 22), alto = (plano ? 24 : 36) + Math.floor(R() * (plano ? 30 : 34));
      torre(L, x, tw, base - alto, base, c, luz);
      if (plano) for (let y = base - alto + 3; y < base; y += 4) for (let i = 2; i < tw - 1; i += 3) if (grain(x + i, y, seed) < 0.18) L.p((x + i) % w, y, 'cielo');
      x += tw + Math.floor(R() * 8);
    }
  }
  // Landmark 81: la torre más alta, en escalones angostos que suben. Con la cancha a 800 las dos torres se corrieron 40 (la
  // mitad del margen, porque la capa lejos va a un cuarto de la cámara): así caen entre los troncos se vea la cancha
  // entera o centrada
  const lx = 420;
  // (la Bitexco va a la izquierda de la Landmark, como se ven desde el parque)
  for (const [i, ww, top] of [[0, 22, 40], [3, 16, 22], [6, 10, 10], [8, 6, 4]] as const) torre(L, lx + i, ww, top, base, 'canal', 'cielo');
  L.vl(lx + 10, 0, 6, 'canal');
  // la Bitexco: el cuerpo que se angosta y el helipuerto que sale de lado
  const bx = 340;
  for (let y = 30; y < base; y++) { const half = Math.round(5 + ((y - 30) / (base - 30)) * 6); L.hl(bx - half, y, half * 2, 'canal'); L.p(bx - half, y, 'cielo'); }
  L.f(bx - 2, 22, 4, 8, 'canal'); L.f(bx - 1, 48, 12, 3, 'canal'); L.hl(bx + 1, 48, 10, 'bruma');
  // la bruma que las borra hacia abajo
  for (let y = base - 30; y < base; y++) for (let x = 0; x < w; x++) if (bayer(x, y) < (y - (base - 30)) / 40) L.p(x, y, 'bruma');
  // los árboles del parque, adelante y en sombra
  for (let x = -10; x < w + 20; x += 18 + Math.floor(R() * 16)) {
    const r = 9 + Math.floor(R() * 8), X = ((x % w) + w) % w;
    for (let j = -r; j <= r; j++) for (let i = -r - 4; i <= r + 4; i++) {
      if (((i / (r + 4)) ** 2 + (j / r) ** 2) > 1) continue;
      const px = ((X + i) % w + w) % w, py = base + 4 - Math.round(r * 0.4) + j;
      L.p(px, py, i + j < -r * 0.6 && bayer(px, py) < 0.4 ? 'verde' : 'verde_oscuro');
    }
  }
  for (let y = base + 6; y < h; y++) for (let x = 0; x < w; x++) L.p(x, y, bayer(x, y) < 0.2 ? 'verde' : 'verde_oscuro');
  return L;
}

// ---------------------------------------------------------------------------------------------------------------------
// Los árboles dầu

/** El tronco de un dầu: recto y claro, con la luz a la izquierda, la corteza en rayas, el liquen y las raíces abiertas abajo. */
function troncoDau(C: Lienzo, cx: number, w: number, top: number, base: number, seed: number, lejos = false) {
  const R = rng(seed);
  for (let y = top; y < base; y++) {
    const raiz = Math.max(0, y - (base - 22)), ancho = w + Math.round(raiz * raiz * 0.09);
    const x0 = Math.round(cx - ancho / 2);
    for (let i = 0; i < ancho; i++) {
      const t = i / ancho, x = x0 + i;
      let c: Color = t < 0.12 ? 'crema' : t < 0.4 ? 'cemento_claro' : t < 0.78 ? 'cemento' : 'asfalto_claro';
      if (lejos) c = t < 0.3 ? 'cemento_claro' : 'cemento';
      // la corteza: rayas verticales oscuras que se cortan
      else if (grain(x, y >> 3, seed) < 0.1 && t > 0.15) c = MAS_OSCURO[c];
      // el liquen en manchones
      if (!lejos && grain(x >> 1, y >> 1, seed + 1) < 0.06 && grain(x, y, seed + 2) < 0.75) c = t < 0.5 ? 'menta' : 'verde';
      C.p(x, y, c);
    }
    // el contorno
    C.p(x0 - 1, y, lejos ? 'cemento' : 'asfalto'); C.p(x0 + ancho, y, lejos ? 'asfalto_claro' : 'sombra');
  }
  // las raíces que se abren en el pasto, con su sombra
  if (!lejos) for (const d of [-1, 1]) for (let k = 0; k < 3; k++) {
    const len = 8 + Math.floor(R() * 10);
    for (let i = 0; i < len; i++) { const x = cx + d * (w / 2 + 6 + i + k * 3), y = base - 2 + Math.round(i * 0.3) - k; C.p(x, y, 'asfalto_claro'); C.p(x, y - 1, 'cemento'); }
  }
}

/**
 * La copa enorme de los dầu: una bóveda de hojas que tapa casi todo el cielo de arriba, con racimos que cuelgan más
 * abajo, el borde encendido del lado del sol (la izquierda) y unos huecos de cielo.
 */
function copas(C: Lienzo, seed: number) {
  const R = rng(seed), W = C.w;
  // la bóveda: una banda tupida de follaje oscuro con el borde de abajo ondulado
  const borde = (x: number) => 82 + Math.round(Math.sin(x / 37) * 10 + Math.sin(x / 13 + 1) * 5 + grain(x >> 3, 0, seed) * 8);
  for (let x = 0; x < W; x++) for (let y = 0; y < borde(x); y++) C.p(x, y, 'verde_oscuro');
  // adentro de la bóveda, racimos más claros que asoman (sin ruido: masas enteras)
  for (let k = 0; k < 30; k++) {
    const x = Math.floor(R() * W), y = 6 + Math.floor(R() * 56), r = 8 + Math.floor(R() * 8);
    copa(C, x, y, r, seed + k * 7, k % 3 ? ['verde_oscuro', 'verde', 'verde'] : ['verde_oscuro', 'verde_oscuro', 'verde']);
  }
  // racimos grandes colgando del borde de la bóveda, con luz arriba a la izquierda
  for (let x = -10; x < W + 20; x += 16 + Math.floor(R() * 12)) {
    const y = borde(Math.max(0, Math.min(W - 1, x))) - 4 + Math.floor(R() * 14), r = 9 + Math.floor(R() * 9);
    copa(C, x, y, r, seed + x, ['verde_oscuro', 'verde', 'menta']);
  }
  for (const t of TRONCOS) for (let k = 0; k < 5; k++) {
    const x = t.x + Math.round((R() - 0.5) * 140), y = 96 + Math.floor(R() * 34), r = (t.lejos ? 8 : 11) + Math.floor(R() * 8);
    copa(C, x, y, r, seed + x * 3 + k, ['verde_oscuro', 'verde', 'menta']);
  }
  // el borde que da al sol se enciende
  for (let y = 1; y < 170; y++) for (let x = W - 1; x > 0; x--) if (C.has(x, y) && !C.has(x - 1, y) && grain(x, y, seed) < 0.7) C.p(x, y, y < 70 ? 'menta' : 'oro');
  for (let y = 1; y < 170; y++) for (let x = 0; x < W; x++) if (C.has(x, y) && !C.has(x, y + 1) && grain(x, y, seed + 9) < 0.5) C.p(x, y, 'verde_oscuro');
}

/**
 * Los rayos de sol del amanecer: bandas anchas que bajan desde los huecos de la copa, de arriba a la izquierda hacia
 * abajo a la derecha, tramadas suave sobre lo que hay detrás (y sobre el cielo, donde la capa queda transparente).
 */
function rayos(C: Lienzo, x0s: number[], y0: number, y1: number) {
  for (const x0 of x0s) for (let y = y0; y < y1; y++) {
    const cx = x0 + Math.round((y - y0) * 0.62), ancho = 22 + Math.round((y - y0) * 0.12);
    for (let x = cx; x < cx + ancho; x++) {
      const borde = Math.min(x - cx, cx + ancho - 1 - x), t = (y - y0) / (y1 - y0);
      // sobre el cielo casi no se ve: solo sobre lo que tiene algo detrás (troncos, seto, pasto)
      const k = (borde < 4 ? 0.06 : 0.13) * (1 - t * 0.7);
      if (C.has(x, y) && bayer(x, y) < k) C.p(x, y, 'amarillo');
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// La gente del parque, las jaulas y el banco

/** Una persona de pie en el pasto de atrás (está lejos, un poco más chica que los atletas): `pose` mueve los brazos. */
function persona(C: Lienzo, x: number, base: number, ropa: Color, pant: Color, pelo: Color, pose: number, abanico = false) {
  const piel: Color = 'salmon';
  // piernas: en el tai chi, abiertas y un poco dobladas
  C.f(x + 1, base - 12, 2, 12, pant); C.f(x + 5, base - 12, 2, 12, pant); C.vl(x + 3, base - 12, 3, pant); C.vl(x + 4, base - 12, 3, pant);
  C.vl(x + 6, base - 11, 10, MAS_OSCURO[pant]);
  C.hl(x, base - 1, 3, 'sombra'); C.hl(x + 5, base - 1, 3, 'sombra');
  // el torso, la camisa holgada
  C.f(x, base - 23, 8, 11, ropa); C.vl(x + 7, base - 23, 11, MAS_OSCURO[ropa]); C.hl(x, base - 13, 8, MAS_OSCURO[ropa]);
  // la cabeza con el pelo canoso o negro
  C.f(x + 2, base - 29, 5, 5, piel); C.hl(x + 2, base - 30, 5, pelo); C.f(x + 2, base - 29, 5, 1, pelo); C.p(x + 2, base - 28, pelo);
  C.p(x + 5, base - 27, 'tinta'); C.vl(x + 6, base - 28, 3, MAS_OSCURO[piel]);
  // los brazos según la pose: abiertos, adelante, arriba o uno arriba y otro abajo
  const brazos: [number, number, number, number][][] = [
    [[0, -22, -5, -17], [7, -22, 12, -17]],
    [[0, -22, -6, -22], [7, -22, 13, -22]],
    [[0, -22, -3, -29], [7, -22, 10, -29]],
    [[0, -22, -5, -27], [7, -22, 12, -16]],
  ];
  for (const [ax, ay, bx, by] of brazos[pose % 4]) { C.ln(x + ax, base + ay, x + bx, base + by, ropa); C.ln(x + ax, base + ay + 1, x + bx, base + by + 1, MAS_OSCURO[ropa]); }
  const [, , ix, iy] = brazos[pose % 4][0], [, , dx, dy] = brazos[pose % 4][1];
  C.f(x + ix - 1, base + iy - 1, 2, 2, piel); C.f(x + dx, base + dy - 1, 2, 2, piel);
  // el abanico rojo del tai chi, abierto en la mano
  if (abanico) for (let i = -3; i <= 3; i++) for (let j = 0; j < 4; j++) C.p(x + dx + 1 + i + j, base + dy - 3 - j + Math.abs(i), j === 3 ? 'oro' : 'rojo');
}

/** Un señor sentado en el banco de piedra, chiquito: el café en el vaso o el periódico. */
function sentadoBanco(C: Lienzo, x: number, asiento: number, ropa: Color, cosa: 'cafe' | 'periodico') {
  C.f(x - 1, asiento - 3, 10, 3, 'azul_noche'); C.f(x, asiento, 2, 9, 'azul_noche'); C.f(x + 6, asiento, 2, 9, 'azul_noche'); C.hl(x - 1, asiento + 9, 3, 'sombra'); C.hl(x + 6, asiento + 9, 3, 'sombra');
  C.f(x, asiento - 14, 8, 11, ropa); C.vl(x + 7, asiento - 14, 11, MAS_OSCURO[ropa]);
  C.f(x + 1, asiento - 20, 5, 5, 'salmon'); C.hl(x + 1, asiento - 21, 5, 'cemento_claro'); C.p(x + 1, asiento - 20, 'cemento_claro'); C.vl(x + 5, asiento - 19, 3, 'terracota'); C.p(x + 4, asiento - 18, 'tinta');
  if (cosa === 'cafe') { C.f(x + 8, asiento - 9, 2, 3, 'luz'); C.p(x + 8, asiento - 10, 'terracota'); C.p(x + 8, asiento - 8, 'salmon'); }
  else { C.f(x - 4, asiento - 15, 11, 7, 'crema'); C.hl(x - 3, asiento - 13, 9, 'cemento'); C.hl(x - 3, asiento - 11, 7, 'cemento'); C.vl(x + 1, asiento - 15, 7, 'cemento_claro'); }
}

/** Una jaula de pájaros (lồng chim) de bambú con el techo de cúpula, colgada de su gancho, con el pájaro adentro. `f` hace saltar al pájaro. */
function jaula(C: Lienzo, cx: number, y: number, pajaro: Color, tapa: Color | null, f = 0, que: 'todo' | 'jaula' | 'pajaro' = 'todo') {
  if (que !== 'pajaro') jaulaSola(C, cx, y, tapa);
  if (que === 'jaula') return;
  // el pájaro: salta entre el palito y el piso de la jaula
  const top = y + 4, py = f ? top + 14 : top + 9, px = cx - 2 + (f ? 1 : 0);
  C.f(px, py, 4, 2, pajaro); C.p(px + 3, py - 1, pajaro); C.p(px + 4, py - 1, 'oro'); C.p(px, py + 2, MAS_OSCURO[pajaro]);
}

/** La jaula sin el pájaro: el gancho, la cúpula, los barrotes, el palito y la tela. */
function jaulaSola(C: Lienzo, cx: number, y: number, tapa: Color | null) {
  C.vl(cx, y, 4, 'sombra');
  const w = 15, h = 18, x0 = cx - 7, top = y + 4;
  // la cúpula y los barrotes
  for (let j = 0; j < h; j++) {
    const ancho = j < 4 ? 3 + j * 2 : w;
    const a = cx - Math.floor(ancho / 2);
    for (let i = 0; i < ancho; i++) if (j < 4 ? i === 0 || i === ancho - 1 || j === 0 : i % 3 === 0 || i === ancho - 1) C.p(a + i, top + j, j < 4 ? 'ocre' : 'amarillo');
  }
  C.hl(x0, top + 4, w, 'ocre'); C.hl(x0, top + h, w, 'terracota'); C.hl(x0 + 1, top + h + 1, w - 2, 'vino');
  // el palito
  C.hl(x0 + 2, top + 12, w - 4, 'terracota');
  // una tela que tapa la mitad de la jaula
  if (tapa) for (let j = 0; j < 7; j++) for (let i = 0; i < w - j; i++) if (j < 4 || i < w / 2) C.p(x0 + i, top + j, j === 6 ? MAS_OSCURO[tapa] : tapa);
}

const PAJAROS: Color[] = ['amarillo', 'verde', 'rojo'], TAPAS: (Color | null)[] = [null, 'azul', null];
const enJaula = (i: number) => ({ cx: JAULAS.x0 + 13 + i * 20, y: JAULAS.y + 1 + (i % 2) * 3 });

/** Los pájaros de las jaulas solos (la vida): cada uno salta en su cuadro. */
function pajarosJaulas(C: Lienzo, f: number) {
  for (let i = 0; i < 3; i++) { const j = enJaula(i); jaula(C, j.cx, j.y, PAJAROS[i], TAPAS[i], (i + f) % 2, 'pajaro'); }
}

/** El palo de bambú de las jaulas, en sus dos parales, con las tres jaulas colgadas (sin los pájaros si van en la vida). */
function palJaulas(C: Lienzo, conPajaros: boolean) {
  const { x0, x1, y } = JAULAS;
  for (const px of [x0, x1]) { C.f(px, y, 3, BANCO.asiento - y + 8, 'ocre'); C.vl(px + 2, y, BANCO.asiento - y + 8, 'terracota'); }
  C.f(x0 - 4, y - 2, x1 - x0 + 11, 3, 'amarillo'); C.hl(x0 - 4, y, x1 - x0 + 11, 'ocre');
  for (let x = x0; x < x1 + 3; x += 9) C.p(x, y - 1, 'ocre');
  for (let i = 0; i < 3; i++) { const j = enJaula(i); jaula(C, j.cx, j.y, PAJAROS[i], TAPAS[i], i % 2, conPajaros ? 'todo' : 'jaula'); }
}

/** El banco de piedra del parque, de concreto gris claro. */
function banco(C: Lienzo, x0: number, x1: number, asiento: number) {
  C.f(x0, asiento - 1, x1 - x0, 4, 'cemento_claro'); C.hl(x0, asiento - 1, x1 - x0, 'crema'); C.hl(x0, asiento + 3, x1 - x0, 'asfalto_claro');
  for (const px of [x0 + 4, x1 - 10]) { C.f(px, asiento + 3, 6, 7, 'cemento'); C.vl(px + 5, asiento + 3, 7, 'asfalto_claro'); }
}

/** El letrero del parque, en sus dos palos: verde con la letra blanca al doble. */
function letreroParque(C: Lienzo, x: number, y: number, texto: string) {
  const tw = textWidth(texto) * 2, w = tw + 12, h = 2 * LINE_H - 2;
  for (const px of [x + 6, x + w - 8]) { C.f(px, y + h, 3, PASTO + 8 - y - h, 'asfalto'); C.vl(px, y + h, PASTO + 8 - y - h, 'asfalto_claro'); }
  C.box(x, y, w, h, 'verde_oscuro', 'sombra'); C.hl(x + 1, y + 1, w - 2, 'verde'); C.hl(x + 2, y + h - 3, w - 4, 'sombra');
  const T = new Lienzo(textWidth(texto) + 2, LINE_H + 1, C.pal);
  drawText(T, 0, 0, texto, 'luz');
  for (let j = 0; j < T.h; j++) for (let i = 0; i < T.w; i++) if (T.has(i, j)) C.f(x + 6 + i * 2, y + (j - 2) * 2, 2, 2, 'luz');
}

/** Un taburete de plástico de los del café de la calle, bajito: el asiento y las patas abiertas. */
function taburete(C: Lienzo, x: number, piso: number, c: Color) {
  C.f(x, piso - 7, 8, 2, c); C.hl(x, piso - 5, 8, MAS_OSCURO[c]);
  C.ln(x + 1, piso - 5, x, piso - 1, c); C.ln(x + 6, piso - 5, x + 7, piso - 1, c); C.f(x + 3, piso - 4, 2, 2, MAS_OSCURO[c]);
}

/**
 * El cà phê cóc del margen de la izquierda: la señora sentada en su taburete detrás de la mesita, con el termo rojo de
 * flores, la tetera y los vasos de cà phê sữa đá. Enfrente un señor en su taburete azul se toma el café, y al lado
 * tiene la jaula de su pájaro colgada de un palito de bambú clavado en el pasto.
 */
function cafeCoc(C: Lienzo) {
  const x = CAFE_COC.x, piso = PASTO + 14;
  // el palito de bambú con la jaula del señor
  const px = x + 62;
  C.f(px, piso - 52, 2, 52, 'ocre'); C.vl(px + 1, piso - 52, 52, 'terracota'); for (let y = piso - 46; y < piso; y += 9) C.p(px, y, 'terracota');
  C.hl(px - 8, piso - 52, 10, 'ocre');
  jaula(C, px - 7, piso - 51, 'amarillo', 'rojo', 0);
  // la señora del café: sentada bajito, con el pelo negro recogido y el nón lá
  taburete(C, x + 2, piso, 'rojo');
  sentadoBanco(C, x + 2, piso - 8, 'salmon', 'cafe');
  C.f(x + 3, piso - 29, 5, 2, 'tinta'); C.p(x + 3, piso - 27, 'tinta'); C.p(x + 2, piso - 28, 'tinta');
  for (const [j, i0, w] of [[0, 5, 1], [1, 4, 3], [2, 3, 5], [3, 1, 9], [4, -1, 13]] as const) C.hl(x + i0, piso - 34 + j, w, j === 4 ? 'ocre' : 'crema');
  // la mesita de plástico azul con el termo, la tetera y los vasos
  const mx = x + 16;
  C.f(mx, piso - 11, 22, 2, 'azul'); C.hl(mx, piso - 9, 22, 'azul_noche');
  for (const lx of [mx + 1, mx + 19]) C.f(lx, piso - 9, 2, 9, 'azul');
  C.f(mx + 2, piso - 22, 6, 11, 'rojo'); C.vl(mx + 7, piso - 22, 11, 'vino'); C.hl(mx + 2, piso - 23, 6, 'luz'); C.p(mx + 4, piso - 18, 'amarillo'); C.p(mx + 5, piso - 16, 'luz');
  C.f(mx + 10, piso - 16, 6, 5, 'cemento_claro'); C.hl(mx + 10, piso - 16, 6, 'luz'); C.hl(mx + 9, piso - 15, 2, 'cemento_claro'); C.hl(mx + 16, piso - 15, 2, 'cemento'); C.f(mx + 12, piso - 18, 2, 2, 'asfalto_claro');
  for (const vx of [mx + 17, mx + 20]) { C.f(vx, piso - 15, 2, 4, 'luz'); C.vl(vx, piso - 13, 2, 'terracota'); }
  // el señor en su taburete azul, con su café
  taburete(C, x + 42, piso, 'azul');
  sentadoBanco(C, x + 42, piso - 8, 'crema', 'cafe');
}

/**
 * El barrendero del margen de la derecha: el uniforme naranja con la cinta que brilla, el nón lá, la escoba larga de
 * palma barriendo las hojas secas de los dầu en un montón, y el carrito de la basura con su tapa.
 */
function barrendero(C: Lienzo) {
  const x = BARRENDERO.x, piso = PASTO + 13;
  // el montón de hojas secas
  for (let i = 0; i < 16; i++) for (let j = 0; j < 4 - Math.abs(i - 8) / 3; j++) C.p(x - 4 + i, piso - 1 - j, (['ocre', 'terracota', 'oro', 'vino'] as Color[])[(i * 3 + j * 5) % 4]);
  // el barrendero, con los brazos para adelante agarrando la escoba
  persona(C, x + 12, piso, 'oro', 'oro', 'sombra', 1);
  C.hl(x + 12, piso - 17, 7, 'luz'); C.hl(x + 13, piso - 5, 2, 'luz'); C.hl(x + 17, piso - 5, 2, 'luz');
  for (const [j, i0, w] of [[0, 4, 1], [1, 3, 3], [2, 2, 5], [3, 0, 9], [4, -2, 13]] as const) C.hl(x + 12 + i0, piso - 35 + j, w, j === 4 ? 'ocre' : 'crema');
  // la escoba de palma: el palo de las manos al piso y las varas abiertas en las hojas
  C.ln(x + 6, piso - 23, x + 2, piso - 2, 'terracota');
  for (let i = -4; i <= 4; i++) C.ln(x + 2, piso - 4, x + 2 + i, piso, i % 2 ? 'amarillo' : 'ocre');
  // el carrito de la basura: la caja verde con su tapa, el manubrio y la rueda
  const cx = x + 30;
  C.f(cx, piso - 16, 18, 13, 'verde'); C.vl(cx + 17, piso - 16, 13, 'verde_oscuro'); C.hl(cx, piso - 4, 18, 'verde_oscuro');
  C.f(cx - 1, piso - 18, 20, 2, 'verde_oscuro'); C.hl(cx - 1, piso - 18, 20, 'menta');
  C.ln(cx + 18, piso - 14, cx + 24, piso - 22, 'asfalto'); C.hl(cx + 23, piso - 22, 3, 'asfalto');
  C.d(cx + 5, piso - 2, 2.5, 'sombra'); C.p(cx + 5, piso - 2, 'cemento'); C.d(cx + 13, piso - 2, 2.5, 'sombra'); C.p(cx + 13, piso - 2, 'cemento');
  C.p(cx + 4, piso - 19, 'ocre'); C.p(cx + 9, piso - 19, 'terracota');
}

// ---------------------------------------------------------------------------------------------------------------------
// La capa cerca completa

/** Lo que se mueve en el parque, por su vida: si la vida está en el layout, la capa cerca va sin eso y la vida lo trae. */
const VIDA_TAODAN = ['tai_chi', 'abuelos_ejercicio', 'pajaros'] as const;
type VidaTaodan = (typeof VIDA_TAODAN)[number];

/** Dibuja solo lo de una vida, en su cuadro `f`: el grupo de tai chi, los abuelos o los pájaros de las jaulas. */
function dibujarVida(C: Lienzo, que: VidaTaodan, f: number) {
  if (que === 'tai_chi') {
    // el grupo de tai chi, cada uno en su pose (se mueven juntos, un poco desfasados)
    const ropas: Color[] = ['crema', 'luz', 'rojo', 'crema', 'luz'], pant: Color[] = ['luz', 'crema', 'luz', 'azul_noche', 'crema'];
    TAI_CHI.forEach((x, i) => persona(C, x, PASTO + 10 + (i % 2) * 3, ropas[i], pant[i], i % 3 === 0 ? 'cemento_claro' : 'sombra', f + (i === 4 ? 2 : 0), i === 2));
  }
  if (que === 'abuelos_ejercicio') {
    // los abuelos haciendo ejercicio: uno gira los brazos y otro se estira
    persona(C, ABUELOS[0], PASTO + 12, 'celeste', 'azul_noche', 'cemento_claro', f % 2 ? 2 : 1);
    persona(C, ABUELOS[1], PASTO + 11, 'luz', 'sombra', 'cemento_claro', f % 2 ? 3 : 0);
  }
  if (que === 'pajaros') pajarosJaulas(C, f);
}

/**
 * El parque completo, sobre un lienzo de la capa (alto franja.atras). Lo que nombra `vida` (tai chi, abuelos, pájaros de
 * las jaulas) no se pinta aquí: lo trae la vida, cuadro a cuadro. Sin vida, va quieto en su cuadro 0.
 */
export function pintarTaodan(C: Lienzo, seed: number, vida: readonly string[] = []) {
  const W = C.w, quieto = (v: VidaTaodan) => !vida.includes(v);
  // el pasto de atrás, con la sombra de los árboles y manchas de sol
  for (let y = PASTO - 14; y < FT; y++) for (let x = 0; x < W; x++) {
    if (y < PASTO) { if (bayer(x, y) < (y - (PASTO - 14)) / 14 * 0.9 || (grain(x >> 1, y, seed) < 0.3 && y > PASTO - 5)) C.p(x, y, grain(x, y, seed) < 0.3 ? 'verde_oscuro' : 'verde'); continue; }
    // el pasto: verde parejo con matitas sueltas (la punta con luz y la sombra abajo)
    const n = grain(x, y, seed + 1);
    C.p(x, y, n < 0.05 ? 'verde_oscuro' : n > 0.95 ? 'menta' : 'verde');
  }
  // un seto bajo al fondo del pasto
  for (let x = 0; x < W; x++) { const alto = 8 + Math.round(Math.sin(x / 9) * 2 + grain(x >> 2, 0, seed) * 3); for (let j = 0; j < alto; j++) C.p(x, PASTO - 8 + j - alto + 8, j === 0 ? 'verde' : bayer(x, j) < 0.3 ? 'verde' : 'verde_oscuro'); }
  // el camino de baldosas que bordea la cancha
  for (let y = CAMINO; y < FT; y++) for (let x = 0; x < W; x++) C.p(x, y, y === CAMINO ? 'crema' : (x + (y - CAMINO) * 4) % 16 === 0 ? 'cemento' : y === FT - 1 ? 'cemento' : 'cemento_claro');
  // los troncos de los dầu (el de lejos primero) y la copa encima
  for (const t of [...TRONCOS].sort((a, b) => Number(!!b.lejos) - Number(!!a.lejos))) troncoDau(C, t.x, t.w, t.top, t.base, seed + t.x, !!t.lejos);
  copas(C, seed + 11);
  // el letrero del parque
  letreroParque(C, LETRERO.x, LETRERO.y, 'CÔNG VIÊN TAO ĐÀN');
  for (const v of ['tai_chi', 'abuelos_ejercicio'] as const) if (quieto(v)) dibujarVida(C, v, 0);
  // el banco de piedra con los señores del café de los pájaros, y sus jaulas colgadas
  palJaulas(C, quieto('pajaros'));
  banco(C, BANCO.x0, BANCO.x1, BANCO.asiento);
  sentadoBanco(C, BANCO.x0 + 12, BANCO.asiento - 1, 'luz', 'cafe'); sentadoBanco(C, BANCO.x0 + 44, BANCO.asiento - 1, 'celeste', 'periodico');
  // en los márgenes: el cà phê cóc a la izquierda y el barrendero a la derecha
  cafeCoc(C);
  barrendero(C);
  // los rayos de sol entre los troncos
  rayos(C, RAYOS, RAYO_Y, FT - 6);
}

export const fondoTaodan = (C: Lienzo, _x0: number, _x1: number, _base: number, ctx: CtxCerca) => pintarTaodan(C, ctx.seed, ctx.vida ?? []);

// ---------------------------------------------------------------------------------------------------------------------
// La cancha de tierra

/** La tierra apisonada de la cancha: roja, con manchones más claros donde se pisa, piedritas y hojas secas. */
export function tierraTaodan(x: number, y: number, s: number): Color {
  const xr = ((x % 960) + 960) % 960;
  // las hojas secas de los dầu y alguna piedrita
  const n = grain(xr, y, s);
  if (n < 0.006) return 'ocre';
  if (n > 0.994) return 'vino';
  // pisado: manchones más claros y redondeados donde se juega, y la tierra suelta más oscura en la orilla de atrás
  const v = grain(xr >> 4, y >> 3, s + 1) * 0.45 + grain(xr >> 2, y >> 1, s + 5) * 0.35 + grain(xr >> 1, y, s + 6) * 0.2;
  if (v < 0.3 && bayer(xr, y) < 0.3) return 'ocre';
  if (y < 3 && bayer(xr, y) < 0.5) return 'vino';
  return grain(xr >> 1, y, s + 2) < 0.03 ? 'vino' : 'terracota';
}

/** Las rayas gastadas de la cancha y la de debajo de la red, en el piso derecho (antes de nada). */
export function rayasTaodan(P: Lienzo, L: ObliqueLayout, seed: number) {
  const { atras, adelante, x0, x1, abre, red } = CANCHA, gasta = (x: number, y: number) => grain(x >> 1, y, seed + 7) < 0.18;
  for (let x = x0; x <= x1; x++) if (!gasta(x, atras)) P.p(x, atras, 'crema');
  for (let x = x0 - abre; x <= x1 + abre; x++) if (!gasta(x, adelante)) P.p(x, adelante, 'crema');
  for (let y = atras; y <= adelante; y++) {
    const t = (y - atras) / (adelante - atras);
    for (const x of [Math.round(x0 - abre * t), Math.round(x1 + abre * t), Math.round(red + 3 * t)]) if (!gasta(x, y)) P.p(x, y, 'crema');
  }
  void L;
}

/** Lo de adelante de la cancha: el borde de la tierra, el pasto y el camino de baldosas del parque. */
export function orillaTaodan(x: number, r: number, s: number): Color {
  const xr = ((x % 960) + 960) % 960;
  if (r === 0) return 'vino';
  if (r < 6) { const n = grain(xr, r, s); return r === 1 || n < 0.08 ? 'verde_oscuro' : n > 0.92 ? 'menta' : 'verde'; }
  if (r === 6) return 'cemento';
  if (r < 22) { const fila = Math.floor((r - 7) / 5), jy = (r - 7) % 5, jx = (xr + fila * 8) % 16; return jy === 4 || jx === 0 ? 'cemento' : grain(xr >> 1, r, s) < 0.05 ? 'cemento' : 'cemento_claro'; }
  if (r === 22) return 'asfalto_claro';
  const n = grain(xr, r, s + 2);
  return r === 23 || n < 0.06 ? 'verde_oscuro' : n > 0.94 ? 'menta' : 'verde';
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

/** Un pájaro que vuela lejos: la V que bate las alas, 2 cuadros. */
function pajaroLejos(pal: Paleta): Lienzo[] {
  return [0, 1].map((f) => { const L = new Lienzo(7, 4, pal); if (f) { L.p(0, 0, 'sombra'); L.p(1, 1, 'sombra'); L.p(2, 2, 'sombra'); L.p(3, 1, 'sombra'); L.p(4, 2, 'sombra'); L.p(5, 1, 'sombra'); L.p(6, 0, 'sombra'); } else { L.hl(0, 2, 3, 'sombra'); L.p(3, 2, 'sombra'); L.hl(4, 2, 3, 'sombra'); L.p(2, 1, 'sombra'); L.p(4, 1, 'sombra'); } return L; });
}

export function vidaTaodan(pal: Paleta, L: ObliqueLayout, _k: number, _seed: number, capas: { cerca: Lienzo; piso: Lienzo }): VidaEscena[] {
  const out: VidaEscena[] = [], quiere = (t: string) => L.vida.includes(t);
  // cada pieza trae solo lo que se mueve (la capa cerca va sin eso): un recorte de un lienzo con solo esa vida
  const piezas = (que: VidaTaodan, n: number, x: number, y: number, w: number, h: number) => Array.from({ length: n }, (_, f) => { const c = new Lienzo(capas.cerca.w, capas.cerca.h, pal); dibujarVida(c, que, f); return recorte(c, x, y, w, h); });
  if (quiere('tai_chi')) { const x = TAI_CHI[0] - 8, y = PASTO - 22, w = TAI_CHI[TAI_CHI.length - 1] + 22 - x, h = 38; out.push({ id: 'tai_chi', tipo: 'tai_chi', capa: 'cerca', x, y, cuadros: piezas('tai_chi', 4, x, y, w, h), fps: 1.5 }); }
  if (quiere('abuelos_ejercicio')) { const x = ABUELOS[0] - 8, y = PASTO - 22, w = ABUELOS[1] + 22 - x, h = 38; out.push({ id: 'abuelos_ejercicio', tipo: 'abuelos_ejercicio', capa: 'cerca', x, y, cuadros: piezas('abuelos_ejercicio', 2, x, y, w, h), fps: 2 }); }
  if (quiere('pajaros')) {
    const x = JAULAS.x0, y = JAULAS.y, w = JAULAS.x1 - JAULAS.x0 + 4, h = 30;
    out.push({ id: 'pajaros_jaulas', tipo: 'pajaros', capa: 'cerca', x, y, cuadros: piezas('pajaros', 2, x, y, w, h), fps: 3 });
    out.push({ id: 'pajaros_lejos', tipo: 'pajaros', capa: 'lejos', x: 1280, y: 30, cuadros: pajaroLejos(pal), fps: 4, recorrido: { desde: [1280, 30], hasta: [-10, 18], segundos: 40, desfase: 0.4 } });
  }
  return out;
}

export function lucesTaodan(pal: Paleta, _L: ObliqueLayout, _k: number): Luz[] {
  return RAYOS.map((x) => ({ x: enRayo(x, 250), y: 250, color: pal.amarillo, radio: 70, latido: 0.12, encendida: true, nota: 'el rayo de sol del amanecer que entra entre los troncos' }));
}

export function particulasTaodan(pal: Paleta, _L: ObliqueLayout, _k: number): Particula[] {
  return RAYOS.map((x) => ({ tipo: 'brillo', x0: enRayo(x, 150) - 8, x1: enRayo(x, 260) + 8, y0: 150, y1: 260, color: [pal.luz, pal.amarillo], cada: 0.9, vida: 1, nota: 'el polvo que brilla en el rayo de sol (rayos_de_luz)' }));
}

export const TAODAN: Lugar = {
  estilo: 'vietnam_parque',
  fondo: fondoTaodan,
  lejos: { saigon_amanecer: saigonAmanecer },
  pisos: { tierra: tierraTaodan },
  orilla: orillaTaodan,
  marcas: rayasTaodan,
  vida: vidaTaodan,
  luces: lucesTaodan,
  particulas: particulasTaodan,
};

