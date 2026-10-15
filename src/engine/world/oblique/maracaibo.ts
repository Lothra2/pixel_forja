import { rng, grain, bayer } from '../../fx/pix';
import { Lienzo } from './lienzo';
import type { Color, Paleta } from './paleta';
import { MAS_OSCURO } from './tonos';
import { copa, type CtxCerca } from './fachadas';
import { MARGEN_CANCHA as OX, type ObliqueLayout } from './layout';
import type { Luz, Particula, VidaEscena } from './escena';
import type { Lugar } from './lugares';
import { recorte, soloAfuera, textoGrande, anchoTexto, malla, sentadita, personita } from './pinceles';

/**
 * La cancha de básquet de un barrio de Maracaibo de noche (estilo `venezuela_lago`), en la vista inclinada de la pelea,
 * para el Básquet 3x3. Lejos, el Lago de Maracaibo oscuro con el puente General Rafael Urdaneta encendido de punta a
 * punta (las seis torres con sus tirantes), los balancines con su luz roja, los mechurrios de la otra orilla y, a la
 * derecha, la nube de tormenta del Catatumbo con sus relámpagos. Cerca, la malla de la cancha sobre el muro pintado de
 * CANCHA LA CHINITA, los postes con los bombillos de sodio, la gradita con la gente y los gaiteros con su furro. El
 * piso es la cancha de concreto pintada, con las rayas donde las pone Basket.ts.
 *
 * Mide 800 (lote E4): la cancha va en los 640 del medio, de x 80 a 720, y la malla con su muro va de paral a paral (x 84
 * a 752). A cada lado queda la calle del barrio, afuera de la malla: a la izquierda la casita con la vecina echada en su
 * mecedora, el perro durmiendo y el poste de alumbrado con sus cables, y a la derecha el kiosco de los patacones y la
 * chicha con el señor que despacha y un cliente sentado en su silla plástica.
 */

export const CERCA_MARACAIBO = 'cancha_barrio_maracaibo';
/** La franja de Basket.ts: el piso empieza en la fila 212 (FT) y tiene 104 de fondo (PROF). */
const FT = 212;
/** El muro de bloques pintado al pie de la malla, y la malla: la fila de arriba y los parales (el primero y el último son las puntas). */
export const MURO = { top: 168 }, MALLA = { top: 74, postes: [OX + 4, OX + 132, OX + 268, OX + 404, OX + 540, OX + 672] };
/** De dónde a dónde va la malla con su muro: de paral a paral. Afuera es la calle. */
const MALLA_X0 = MALLA.postes[0] - 1, MALLA_X1 = MALLA.postes[MALLA.postes.length - 1] + 2;
/** Los postes de luz con su bombillo de sodio (x del poste y fila del bombillo). */
export const POSTES_LUZ = [{ x: OX + 96, y: 40 }, { x: OX + 336, y: 34 }, { x: OX + 600, y: 40 }];
/** La gradita de concreto de la izquierda, con su gente. */
export const GRADAS = { x0: OX + 8, x1: OX + 150, top: 176 };
/** Los gaiteros de la derecha: x de cada uno (furro, tambora, charrasca y cuatro). */
export const GAITEROS = [OX + 520, OX + 548, OX + 576, OX + 604];
/** El letrero pintado en el muro. */
export const LETRERO = { x: OX + 196, y: 176 };
/** Las rayas de Basket.ts (x, y de mundo): la media cancha, el aro, el área y el arco de los 2 puntos. */
export const CANCHA = { x0: OX + 40, x1: OX + 596, prof: 104, aro: { x: OX + 566, y: 52 }, arco: 150 };
/** En el margen de la izquierda, afuera de la malla: la casita del barrio (de dónde a dónde y la fila de la platabanda). */
export const CASITA = { x0: 0, x1: 58, top: 112 };
/** El poste de alumbrado de la calle, al lado de la casita: x del poste y fila del bombillo. */
export const FAROL = { x: 70, y: 58 };
/** En el margen de la derecha, afuera de la malla: el kiosco de los patacones y la chicha, y la fila del techo. */
export const KIOSCO = { x0: 758, x1: 794, top: 140 };

// ---------------------------------------------------------------------------------------------------------------------
// Lo lejos: el Lago de Maracaibo con el puente, los balancines y el Catatumbo

/** Fila de la otra orilla en la capa lejos (la capa va de la fila 12 a la 182 de la pantalla). */
export const ORILLA_LAGO = 120;
/** El puente General Rafael Urdaneta: la fila del tablero y las seis torres de los cinco tramos atirantados (x en lejos.png). */
export const PUENTE = { tablero: 114, torres: [132, 192, 252, 312, 372, 432], alto: 50 };
/** La nube del Catatumbo, a la derecha, sobre el horizonte. */
export const CATATUMBO = { x0: 456, x1: 676, top: 40 };

/** La altura del tablero del puente en x: sube un poco en el tramo de las torres (por donde pasan los barcos). */
const tableroEn = (x: number) => PUENTE.tablero - Math.round(Math.max(0, 1 - Math.abs(x - 282) / 220) * 10);

/** Una torre del puente: las dos patas en A que se juntan arriba, la pila en X debajo del tablero y los tirantes a los lados. */
function torrePuente(L: Lienzo, cx: number) {
  const t = tableroEn(cx), top = t - PUENTE.alto;
  // los tirantes: dos a cada lado, de la punta al tablero (finitos, encendidos)
  for (const d of [-1, 1]) for (const largo of [22, 30]) L.ln(cx, top + 3, cx + d * largo, tableroEn(cx + d * largo) - 1, 'cemento');
  // las patas en A
  for (let j = 0; j <= t - top; j++) { const abre = Math.round((j / (t - top)) * 5); L.p(cx - abre, top + j, 'cemento_claro'); L.p(cx - abre + 1, top + j, 'cemento'); L.p(cx + abre, top + j, 'cemento'); }
  L.hl(cx - 3, top + 22, 7, 'cemento');
  // la pila en X debajo del tablero, hasta el agua
  for (let j = 1; j < ORILLA_LAGO + 6 - t; j++) { const a = Math.round(4 - (j / (ORILLA_LAGO + 6 - t)) * 8); L.p(cx - a, t + j, 'asfalto_claro'); L.p(cx + a, t + j, 'asfalto_claro'); }
  // las luces de la torre: rojas arriba (para los aviones) y blancas en las patas
  L.p(cx, top - 1, 'rojo'); L.p(cx, top - 2, 'rojo');
  for (let j = 6; j < t - top; j += 7) { L.p(cx - Math.round((j / (t - top)) * 4), top + j, 'luz'); L.p(cx + Math.round((j / (t - top)) * 4), top + j, 'luz'); }
}

/** Un balancín petrolero en el Lago: la torre de celosía chiquita con su luz roja y el reflejo. */
function balancin(L: Lienzo, x: number, agua: number) {
  for (let j = 0; j < 14; j++) { const hw = Math.round((14 - j) * 0.25); L.p(x - hw, agua - j, 'asfalto_claro'); L.p(x + hw, agua - j, 'asfalto_claro'); if (j % 3 === 0) L.hl(x - hw, agua - j, hw * 2 + 1, 'asfalto'); }
  L.p(x, agua - 15, 'rojo'); L.hl(x - 3, agua, 7, 'asfalto');
  for (let j = 2; j < 10; j += 2) L.p(x, agua + j, 'vino');
}

/**
 * El Lago de Maracaibo de noche: la otra orilla con sus lucecitas y los mechurrios, el puente General Rafael Urdaneta
 * encendido de lado a lado con el tramo de las seis torres, los balancines, la nube del Catatumbo a la derecha con su
 * borde iluminado, y el agua oscura con los reflejos de las luces. Arriba queda transparente (el cielo).
 */
export function lagoPuenteUrdaneta(pal: Paleta, w: number, h: number, seed: number): Lienzo {
  const L = new Lienzo(w, h, pal), R = rng(seed);
  // la nube del Catatumbo: una torre de tormenta que sube del horizonte, violeta, con el borde de arriba alumbrado
  const { x0, x1, top } = CATATUMBO;
  for (let x = x0; x < x1 + 140; x++) {
    const t = (x - x0) / (x1 - x0), alto = Math.round((ORILLA_LAGO - top) * Math.sin(Math.min(1, Math.max(0, t)) * Math.PI * 0.9 + 0.15) * (0.8 + 0.2 * Math.sin(x / 9)) + grain(x >> 3, 0, seed) * 6);
    if (alto <= 0) continue;
    for (let j = 0; j < alto; j++) {
      const y = ORILLA_LAGO - j, borde = alto - j;
      const X = x % w;
      L.p(X, y, borde < 2 ? 'cielo' : borde < 5 && bayer(X, y) < 0.5 ? 'cielo' : grain(X >> 2, y >> 2, seed + 1) < 0.25 ? 'azul' : bayer(X, y) < 0.3 + j / (alto * 3) ? 'canal' : 'azul');
    }
  }
  // un resplandor violeta adentro de la nube (el relámpago que viene y va lo pone la vida)
  for (let y = top + 20; y < ORILLA_LAGO - 6; y++) for (let x = x0 + 40; x < x1 - 20; x++) { const d = Math.hypot((x - (x0 + 110)) / 60, (y - 80) / 26); if (d < 1 && bayer(x, y) < (1 - d) * 0.35) L.p(x, y, 'salmon'); }
  // la otra orilla: la costa oriental baja, con lucecitas y los mechurrios encendidos
  for (let x = 0; x < w; x++) {
    const a = 2 + Math.round(grain(x >> 3, 1, seed) * 3 + Math.sin(x / 50) * 1.5);
    for (let j = 0; j < a; j++) L.p(x, ORILLA_LAGO - j, 'asfalto');
    if (grain(x, 2, seed) < 0.18) L.p(x, ORILLA_LAGO - 1 - Math.floor(grain(x, 3, seed) * a), grain(x, 4, seed) < 0.3 ? 'oro' : 'amarillo');
  }
  for (const mx of [64, 520, 620, 900]) { L.vl(mx, ORILLA_LAGO - 9, 6, 'asfalto_claro'); L.p(mx, ORILLA_LAGO - 10, 'oro'); L.p(mx, ORILLA_LAGO - 11, 'amarillo'); L.p(mx - 1, ORILLA_LAGO - 10, 'ocre'); }
  // el agua del Lago: oscura, con el brillo de la ciudad que baja
  for (let y = ORILLA_LAGO + 1; y < h; y++) for (let x = 0; x < w; x++) L.p(x, y, bayer(x, y) < 0.12 + (y - ORILLA_LAGO) / 260 ? 'azul_noche' : 'sombra');
  // el puente: el tablero encendido con su hilera de faroles, las pilas que bajan al agua y las seis torres
  for (let x = 0; x < w; x++) {
    const t = tableroEn(x);
    L.p(x, t - 1, 'cemento'); L.p(x, t, 'cemento_claro'); L.p(x, t + 1, 'cemento'); L.p(x, t + 2, 'asfalto_claro');
    if (x % 5 === 0) L.p(x, t - 2, 'amarillo');
    if (x % 14 === 0 && PUENTE.torres.every((cx) => Math.abs(cx - x) > 6)) for (let j = 3; j < ORILLA_LAGO + 8 - t; j++) L.p(x, t + j, j % 2 ? 'asfalto' : 'asfalto_claro');
  }
  for (const cx of PUENTE.torres) torrePuente(L, cx);
  // los reflejos de las luces en el agua: rayitas que tiemblan debajo del puente y de la orilla
  for (let x = 0; x < w; x += 2) if (x % 6 === 0 || grain(x, 5, seed) < 0.2) for (let j = 0; j < 6 + Math.floor(R() * 14); j++) {
    const y = ORILLA_LAGO + 3 + j * 2 + Math.floor(R() * 2);
    if (y < h && grain(x, y, seed + 6) < 0.6) L.p(x + (j % 2), y, j < 3 ? 'oro' : 'ocre');
  }
  balancin(L, 440, ORILLA_LAGO + 22); balancin(L, 520, ORILLA_LAGO + 30); balancin(L, 92, ORILLA_LAGO + 28);
  // la ciudad de este lado, abajo del todo: techos oscuros y ventanas
  for (let x = 0; x < w; x++) { const a = 6 + Math.round(grain(x >> 4, 7, seed) * 10); for (let j = 0; j < a; j++) L.p(x, h - 1 - j, (x >> 4) % 2 ? 'sombra' : 'tinta'); if (grain(x, 8, seed) < 0.1) L.p(x, h - 3 - Math.floor(grain(x, 9, seed) * (a - 3)), 'oro'); }
  return L;
}

// ---------------------------------------------------------------------------------------------------------------------
// El muro, la malla, los postes de luz, la gradita y los gaiteros

/** El muro de bloques al pie de la malla: pintado de crema y alumbrado por los bombillos, con la franja tricolor, el letrero y el mural. */
function muro(C: Lienzo, seed: number) {
  const { top } = MURO, X0 = MALLA_X0, W = MALLA_X1 - MALLA_X0;
  for (let y = top; y < FT; y++) for (let x = X0; x < X0 + W; x++) {
    // los bloques con sus juntas, más alumbrados cerca de los postes
    const cerca = POSTES_LUZ.some((p) => Math.abs(x - p.x) < 70);
    const junta = (y - top) % 8 === 0 || (x + ((y - top) >> 3) * 10) % 20 === 0;
    C.p(x, y, y < top + 2 ? 'cemento_claro' : junta ? 'cemento_claro' : cerca || bayer(x, y) < 0.5 ? 'crema' : 'cemento_claro');
  }
  // la franja tricolor pintada abajo, a lo largo
  for (let y = FT - 12; y < FT - 3; y++) for (let x = X0; x < X0 + W; x++) C.p(x, y, y < FT - 9 ? 'amarillo' : y < FT - 6 ? 'celeste' : 'rojo');
  C.hl(X0, FT - 3, W, 'cemento'); C.hl(X0, FT - 2, W, 'asfalto_claro'); C.hl(X0, FT - 1, W, 'asfalto');
  // las manchas de humedad que bajan
  C.drips(X0, top + 2, W, 8, 'cemento_claro', seed, 0.08);
  // el letrero: CANCHA LA CHINITA en azul y BARRIO SANTA LUCÍA debajo
  const t1 = 'CANCHA LA CHINITA', w1 = anchoTexto(t1), t2 = 'BARRIO SANTA LUCÍA', w2 = anchoTexto(t2, 1);
  textoGrande(C, LETRERO.x, LETRERO.y + 1, t1, 'azul', 2, 'celeste');
  textoGrande(C, LETRERO.x + Math.round((w1 - w2) / 2), LETRERO.y + 15, t2, 'vino', 1);
  // el mural del puente: el sol amarillo y el puente pintado, al lado del letrero
  const mx = LETRERO.x + w1 + 16, my = top + 6;
  C.box(mx, my, 92, 28, 'celeste', 'azul');
  C.d(mx + 70, my + 10, 6, 'amarillo'); C.d(mx + 70, my + 10, 4, 'oro');
  for (let x = mx + 2; x < mx + 90; x++) { C.p(x, my + 19, 'luz'); C.p(x, my + 20, 'cemento_claro'); if (x % 9 === 0) C.vl(x, my + 21, 6, 'cemento_claro'); }
  for (const tx of [mx + 22, mx + 40, mx + 58]) { C.ln(tx, my + 8, tx - 3, my + 19, 'luz'); C.ln(tx, my + 8, tx + 3, my + 19, 'luz'); C.ln(tx, my + 9, tx - 10, my + 19, 'cemento_claro'); C.ln(tx, my + 9, tx + 10, my + 19, 'cemento_claro'); }
  for (let x = mx + 1; x < mx + 91; x++) for (let y = my + 21; y < my + 27; y++) if (bayer(x, y) < 0.4) C.p(x, y, 'azul');
}

/** Un poste de luz de la cancha: el tubo, el brazo y el bombillo de sodio con la caja. */
function posteLuz(C: Lienzo, x: number, y: number) {
  C.f(x - 2, y + 4, 4, FT - y - 4, 'asfalto_claro'); C.vl(x - 2, y + 4, FT - y - 4, 'cemento'); C.vl(x + 1, y + 4, FT - y - 4, 'asfalto');
  C.hl(x - 14, y + 2, 16, 'asfalto_claro'); C.hl(x - 14, y + 3, 16, 'asfalto');
  // la caja del bombillo y su cara encendida, que mira a la cancha
  C.f(x - 20, y - 2, 12, 6, 'asfalto'); C.f(x - 19, y + 4, 10, 2, 'luz'); C.hl(x - 18, y + 6, 8, 'amarillo');
  C.f(x + 2, y - 2, 12, 6, 'asfalto'); C.f(x + 3, y + 4, 10, 2, 'luz'); C.hl(x + 4, y + 6, 8, 'amarillo');
  C.hl(x - 2, y + 2, 16, 'asfalto_claro');
  // el halo de sodio alrededor de las dos caras encendidas, tramado sobre lo oscuro
  for (const hx of [x - 14, x + 8]) for (let j = -10; j <= 16; j++) for (let i = -16; i <= 16; i++) {
    const d = Math.hypot(i / 16, (j - 4) / 13);
    if (d < 1 && bayer(hx + i, y + j) < (1 - d) * 0.3 && !C.has(hx + i, y + j)) C.p(hx + i, y + j, d < 0.5 ? 'oro' : 'ocre');
  }
}

/** La gradita de concreto de tres escalones, con la gente sentada (`f` levanta los brazos: la vida). */
function gradas(C: Lienzo, seed: number, f: number) {
  const { x0, x1, top } = GRADAS, R = rng(seed);
  for (let e = 0; e < 3; e++) {
    const y = top + e * 12, xa = x0 + (2 - e) * 0, w = x1 - x0;
    for (let yy = y; yy < FT; yy++) for (let x = xa; x < xa + w; x++) C.p(x, yy, yy === y ? 'crema' : yy < y + 3 ? 'cemento_claro' : (x - xa) % 30 === 0 ? 'cemento' : 'cemento');
  }
  const ROPA: Color[] = ['rojo', 'amarillo', 'luz', 'celeste', 'menta', 'oro', 'salmon'];
  for (let e = 0; e < 3; e++) {
    const asiento = top + e * 12;
    for (let x = x0 + 6, n = 0; x < x1 - 10; n++) {
      const salta = R() < 0.2, ropa = ROPA[Math.floor(R() * ROPA.length)], piel: Color = R() < 0.5 ? 'terracota' : 'ocre', paso = 13 + Math.floor(R() * 6);
      if (!salta && e < 2) sentadita(C, x, asiento, { ropa, pant: R() < 0.5 ? 'asfalto' : 'celeste', pelo: 'tinta', piel, alto: 17 }, (n + e + f) % 3 === 0);
      x += paso;
    }
  }
}

/**
 * Un gaitero de pie con su instrumento: el furro (el tambor de fricción con la vara), la tambora, la charrasca o el
 * cuatro. Camisa blanca, el sombrero de gaitero con la cinta negra y pantalón oscuro. `f` es el golpe (la vida).
 */
function gaitero(C: Lienzo, x: number, base: number, que: 0 | 1 | 2 | 3, f: number) {
  const g = f % 2, piel: Color = que % 2 ? 'terracota' : 'ocre', camisa: Color = que === 2 ? 'amarillo' : 'luz';
  // las piernas y el cuerpo
  C.f(x + 1, base - 13, 3, 13, 'asfalto'); C.f(x + 6, base - 13, 3, 13, 'asfalto'); C.hl(x, base - 1, 4, 'tinta'); C.hl(x + 6, base - 1, 4, 'tinta');
  C.f(x, base - 26 + g * (que === 0 ? 1 : 0), 10, 13, camisa); C.vl(x + 9, base - 26, 13, 'crema'); C.hl(x, base - 15, 10, 'cemento_claro');
  // la cabeza con el sombrero de paja de ala ancha y la cinta negra
  const hy = base - 33;
  C.f(x + 2, hy, 6, 7, piel); C.p(x + 3, hy + 3, 'tinta'); C.p(x + 6, hy + 3, 'tinta'); C.vl(x + 7, hy + 1, 6, MAS_OSCURO[piel]);
  C.hl(x - 3, hy, 16, 'crema'); C.hl(x - 2, hy + 1, 14, 'ocre'); C.f(x + 1, hy - 5, 8, 5, 'crema'); C.hl(x + 1, hy - 2, 8, 'tinta'); C.hl(x + 1, hy - 5, 8, 'luz');
  if (que === 0) {
    // el furro: el tambor de cuero entre las piernas y la vara que se frota
    C.f(x - 2, base - 16, 14, 12, 'terracota'); C.hl(x - 2, base - 16, 14, 'crema'); C.vl(x - 2, base - 16, 12, 'ocre'); C.vl(x + 11, base - 16, 12, 'vino');
    C.vl(x + 5, base - 24 + g * 3, 9, 'ocre'); C.f(x + 4, base - 22 + g * 3, 2, 2, piel);
  } else if (que === 1) {
    // la tambora colgada, con las dos baquetas arriba y abajo
    C.f(x - 3, base - 22, 16, 9, 'rojo'); C.hl(x - 3, base - 22, 16, 'luz'); C.hl(x - 3, base - 14, 16, 'luz'); for (let i = -2; i < 13; i += 3) C.ln(x + i, base - 21, x + i + 2, base - 15, 'oro');
    C.ln(x - 4, base - 26, x - 1, base - 22 + g * 2, 'ocre'); C.ln(x + 14, base - 26 + g * 2, x + 11, base - 22, 'ocre');
  } else if (que === 2) {
    // la charrasca: el tubo estriado y el raspador que va y viene
    C.f(x - 2, base - 21, 14, 3, 'cemento_claro'); for (let i = 0; i < 14; i += 2) C.p(x - 2 + i, base - 20, 'asfalto');
    C.ln(x + 2 + g * 6, base - 24, x + 4 + g * 6, base - 18, 'luz');
  } else {
    // el cuatro: la guitarrita de madera con el brazo y la mano que rasga
    C.d(x + 3, base - 18, 4, 'ocre'); C.d(x + 3, base - 18, 1.5, 'tinta'); C.ln(x + 6, base - 21, x + 14, base - 27, 'terracota');
    C.p(x + 3 + g, base - 16, piel); C.p(x + 4 + g, base - 15, piel);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Los márgenes: la calle del barrio afuera de la malla

/**
 * Una pared de casa del barrio de noche: la fachada de su color, más oscura lejos del bombillo, la platabanda de concreto
 * con el tanque de agua azul arriba y el zócalo oscuro. `luz` es la x del bombillo que la alumbra.
 */
function pared(C: Lienzo, x0: number, x1: number, top: number, c: Color, sombra: Color, luz: number, tanque: number) {
  for (let y = top; y < FT; y++) for (let x = x0; x < x1; x++) {
    const d = Math.hypot((x - luz) / 40, (y - (top + 30)) / 50);
    C.p(x, y, y >= FT - 7 ? (y === FT - 7 ? 'cemento_claro' : 'verde_oscuro') : bayer(x, y) < 0.2 + d * 0.5 ? sombra : c);
  }
  C.f(x0, top - 4, x1 - x0, 4, 'cemento_claro'); C.hl(x0, top - 4, x1 - x0, 'luz'); C.hl(x0, top, x1 - x0, 'cemento');
  // el tanque de agua en la platabanda, con su tapa
  C.f(tanque, top - 16, 14, 12, 'azul'); C.vl(tanque, top - 16, 12, 'celeste'); C.hl(tanque, top - 16, 14, 'celeste'); C.f(tanque + 4, top - 18, 6, 2, 'azul_noche');
  C.hl(tanque, top - 10, 14, 'azul_noche');
}

/** Una ventana de rejas con la luz de la sala prendida adentro (y la tele que alumbra celeste en una esquina). */
function ventanaRejas(C: Lienzo, vx: number, vy: number, vw: number, vh: number) {
  C.box(vx - 1, vy - 1, vw + 2, vh + 2, 'oro', 'crema');
  for (let j = 0; j < vh; j++) for (let i = 0; i < vw; i++) if (bayer(vx + i, vy + j) < 0.3 + j / (vh * 2)) C.p(vx + i, vy + j, i > vw * 0.6 && j > vh * 0.45 ? 'celeste' : 'amarillo');
  for (let i = 2; i < vw; i += 3) C.vl(vx + i, vy, vh, 'sombra');
  for (let j = 7; j < vh; j += 8) C.hl(vx, vy + j, vw, 'sombra');
  C.f(vx - 2, vy + vh + 1, vw + 4, 2, 'cemento_claro');
}

/**
 * La casita del barrio en el margen de la izquierda, afuera de la malla: el palo de mango de atrás, la pared verde agua
 * con su platabanda y el tanque, la ventana de rejas con la luz prendida, la puerta de hierro entreabierta, el bombillo
 * del porche y la plaquita de la CALLE 72. Al frente la vecina echada en su mecedora de mimbre cogiendo fresco, las matas
 * en sus potes y el perro durmiendo en la acera.
 */
function casita(C: Lienzo, seed: number) {
  const { x0, x1, top } = CASITA, R = rng(seed);
  // el palo de mango de atrás, que se asoma por encima de la platabanda (de noche, casi negro)
  C.f(x0 + 40, top - 30, 5, 30, 'sombra'); C.ln(x0 + 42, top - 22, x0 + 30, top - 40, 'sombra'); C.ln(x0 + 43, top - 26, x0 + 54, top - 42, 'sombra');
  copa(C, x0 + 34, top - 52, 30, seed + 1, ['tinta', 'verde_oscuro', 'verde']);
  for (let k = 0; k < 9; k++) { const mx = x0 + 14 + Math.floor(R() * 44), my = top - 60 + Math.floor(R() * 34); if (C.has(mx, my)) { C.p(mx, my, 'ocre'); C.p(mx, my + 1, 'terracota'); } }
  pared(C, x0, x1, top, 'menta', 'verde', x0 + 39, x0 + 6);
  ventanaRejas(C, x0 + 4, top + 26, 20, 24);
  // la puerta de hierro entreabierta, con la luz que sale por la rendija
  const px = x0 + 32, ph = 44, py = FT - 7 - ph;
  C.box(px - 1, py - 1, 18, ph + 1, 'azul_noche', 'crema');
  C.f(px + 6, py, 3, ph, 'oro'); C.vl(px + 7, py, ph, 'amarillo');
  for (let j = 4; j < ph; j += 6) C.hl(px + 10, py + j, 6, 'azul');
  C.p(px + 11, py + ph / 2, 'oro');
  // el bombillo del porche, pelado, con su halo
  const bx = px + 7, by = py - 6;
  C.p(bx, by, 'luz'); C.p(bx, by - 1, 'asfalto');
  for (let j = -8; j <= 8; j++) for (let i = -10; i <= 10; i++) { const d = Math.hypot(i / 10, j / 8); if (d < 1 && (i || j) && bayer(bx + i, by + j) < (1 - d) * 0.45) C.p(bx + i, by + j, d < 0.4 ? 'amarillo' : 'oro'); }
  // la plaquita azul de la calle en la esquina de la casa
  C.box(x0 + 19, top + 4, 37, 10, 'azul', 'luz');
  textoGrande(C, x0 + 22, top + 5, 'CALLE 72', 'luz', 1);
  // las matas en sus potes al lado de la puerta: la sábila y la de flores
  C.f(px + 18, FT - 8, 6, 6, 'terracota'); C.hl(px + 18, FT - 8, 6, 'ocre');
  for (const [dx, h] of [[0, 8], [2, 11], [4, 9], [5, 6]] as const) C.ln(px + 19 + dx, FT - 8, px + 18 + dx * 1.5, FT - 8 - h, 'verde');
  // la vecina en su mecedora de mimbre, de bata y con los rolos puestos
  const mx = x0 + 10, asiento = FT - 9;
  for (let i = -5; i <= 13; i++) C.p(mx + i, FT - 2 - Math.round(((i - 4) / 9) ** 2 * 2), 'ocre');
  C.vl(mx - 3, asiento - 18, 18, 'ocre'); C.vl(mx - 2, asiento - 18, 18, 'terracota');
  for (let j = asiento - 17; j < asiento; j += 2) C.p(mx - 2, j, 'crema');
  C.ln(mx - 1, asiento + 1, mx - 3, FT - 3, 'ocre'); C.ln(mx + 8, asiento + 1, mx + 10, FT - 3, 'ocre');
  sentadita(C, mx, asiento, { ropa: 'salmon', pant: 'salmon', pelo: 'cemento_claro', piel: 'terracota', alto: 18 }, false);
  C.p(mx + 2, asiento - 17, 'celeste'); C.p(mx + 5, asiento - 17, 'amarillo');
  // el perro echado en la acera, durmiendo con la cabeza en las patas
  const dx = px - 6 + Math.floor(R() * 2);
  C.f(dx, FT - 5, 11, 4, 'ocre'); C.hl(dx, FT - 5, 11, 'amarillo'); C.f(dx + 9, FT - 6, 4, 4, 'ocre'); C.p(dx + 12, FT - 6, 'terracota'); C.p(dx + 11, FT - 5, 'tinta');
  C.hl(dx - 2, FT - 3, 3, 'ocre'); C.hl(dx + 1, FT - 1, 12, 'sombra');
}

/**
 * El poste de alumbrado de la calle: el poste de concreto, el brazo curvo que sale hacia la calle y la lámpara de sodio
 * con su halo, y los cables que van a la casita. No es de la cancha: es del barrio.
 */
function farol(C: Lienzo, x: number, y: number) {
  // los cables que salen del poste: el de la luz, que baja a la casita, y el de arriba, que sigue la calle
  for (let i = 0; i <= x; i++) { const t = i / x; C.p(x - i, y + 8 + Math.round(t * 56 + Math.sin(t * Math.PI) * 6), 'tinta'); C.p(x - i, y + 2 + Math.round(Math.sin(t * Math.PI) * 9), 'sombra'); }
  C.f(x - 1, y, 4, FT - y, 'cemento'); C.vl(x - 1, y, FT - y, 'cemento_claro'); C.vl(x + 2, y, FT - y, 'asfalto_claro');
  for (let j = y + 20; j < FT; j += 14) C.hl(x - 1, j, 4, 'asfalto_claro');
  C.hl(x - 3, y + 8, 8, 'asfalto');
  // el brazo curvo que se asoma a la calle y la lámpara de cabeza de cobra
  for (let i = 0; i < 14; i++) C.p(x - i, y - Math.round(Math.sqrt(Math.max(0, 14 * 14 - (14 - i) ** 2)) * 0.35), 'cemento');
  const lx = x - 18, ly = y - 3;
  C.f(lx, ly - 2, 8, 3, 'asfalto'); C.hl(lx, ly - 2, 8, 'asfalto_claro'); C.hl(lx + 1, ly + 1, 6, 'luz'); C.hl(lx + 2, ly + 2, 4, 'amarillo');
  for (let j = -6; j <= 16; j++) for (let i = -14; i <= 14; i++) {
    const d = Math.hypot(i / 14, (j - 4) / 12);
    if (d < 1 && bayer(lx + 4 + i, ly + j) < (1 - d) * 0.3 && !C.has(lx + 4 + i, ly + j)) C.p(lx + 4 + i, ly + j, d < 0.5 ? 'oro' : 'ocre');
  }
}

/**
 * El margen de la derecha, afuera de la malla: la casa de dos pisos color salmón con la ventana de arriba prendida y, al
 * frente, el kiosco de los patacones y la chicha: la caseta de lata amarilla y roja con el techo de zinc y su tablita de
 * PATACONES, el bombillo colgando, el señor que despacha detrás de la plancha humeando, el cliente parado en el
 * mostrador y el otro sentado en su silla plástica comiéndose el suyo.
 */
function kiosco(C: Lienzo, seed: number) {
  const { x0, x1, top } = KIOSCO, w = x1 - x0, mostrador = top + 34;
  // la casa de atrás, con la ventana de arriba prendida y una matera colgando
  pared(C, MALLA_X1 + 1, C.w, top - 40, 'salmon', 'vino', x0 + 24, x0 + 26);
  ventanaRejas(C, x0 + 2, top - 33, 16, 14);
  C.vl(x1 - 2, top - 34, 6, 'sombra'); C.f(x1 - 5, top - 28, 7, 4, 'terracota'); for (let j = 0; j < 8; j++) C.p(x1 - 5 + (j % 3) * 3, top - 24 + j, j % 2 ? 'verde_oscuro' : 'verde');
  // adentro del kiosco, oscuro y alumbrado por el bombillo
  for (let y = top + 6; y < mostrador; y++) for (let x = x0; x < x1; x++) C.p(x, y, bayer(x, y) < 0.35 - (y - top) / 120 ? 'ocre' : 'sombra');
  // el señor que despacha, de franela blanca y gorra, detrás de la plancha
  C.f(x0 + 12, top + 22, 10, 12, 'luz'); C.vl(x0 + 21, top + 22, 12, 'cemento_claro');
  C.f(x0 + 14, top + 14, 6, 8, 'terracota'); C.p(x0 + 15, top + 17, 'tinta'); C.p(x0 + 18, top + 17, 'tinta'); C.vl(x0 + 19, top + 15, 7, 'vino');
  C.f(x0 + 13, top + 12, 8, 3, 'rojo'); C.hl(x0 + 19, top + 14, 4, 'rojo');
  C.ln(x0 + 22, top + 24, x0 + 27, top + 30, 'luz'); C.p(x0 + 27, top + 31, 'terracota');
  // la plancha con los patacones y el humito, el pote de salsa y la jarra de chicha
  C.f(x0 + 4, mostrador - 3, 20, 3, 'asfalto'); C.hl(x0 + 4, mostrador - 3, 20, 'asfalto_claro');
  for (const i of [6, 12, 18]) { C.f(x0 + i, mostrador - 4, 4, 1, 'amarillo'); C.p(x0 + i + 1, mostrador - 5, 'ocre'); }
  for (let j = 0; j < 8; j++) C.p(x0 + 9 + (j % 3) - 1 + Math.round(Math.sin(j)), mostrador - 6 - j * 2, j < 4 ? 'cemento_claro' : 'cemento');
  C.f(x0 + 26, mostrador - 7, 3, 7, 'rojo'); C.p(x0 + 27, mostrador - 8, 'luz');
  C.f(x0 + 30, mostrador - 8, 5, 8, 'crema'); C.hl(x0 + 30, mostrador - 8, 5, 'luz'); C.vl(x0 + 34, mostrador - 7, 7, 'cemento_claro');
  // los costados de lata y el mostrador
  C.f(x0 - 2, top + 4, 3, FT - top - 4, 'rojo'); C.vl(x0 - 2, top + 4, FT - top - 4, 'salmon');
  C.f(x1 - 1, top + 4, 3, FT - top - 4, 'vino');
  C.f(x0 - 2, mostrador, w + 4, 3, 'cemento_claro'); C.hl(x0 - 2, mostrador, w + 4, 'luz'); C.hl(x0 - 2, mostrador + 2, w + 4, 'cemento');
  // el frente de lata amarilla con sus láminas y CHICHA pintado
  for (let y = mostrador + 3; y < FT; y++) for (let x = x0; x < x1 - 1; x++) C.p(x, y, y >= FT - 3 ? 'vino' : (x - x0) % 9 === 0 ? 'ocre' : 'amarillo');
  textoGrande(C, x1 - 3 - anchoTexto('CHICHA', 1), mostrador + 9, 'CHICHA', 'rojo', 1);
  C.hl(x1 - 3 - anchoTexto('CHICHA', 1), mostrador + 15, anchoTexto('CHICHA', 1), 'azul');
  // el techo de zinc ondulado que sale por los lados, con la tablita de PATACONES encima y el bombillo colgando
  for (let j = 0; j < 6; j++) for (let x = x0 - 5; x < x1 + 5; x++) C.p(x, top - 1 + j, j === 5 ? 'asfalto' : (x + j) % 3 === 0 ? 'cemento' : j < 2 ? 'cemento_claro' : 'asfalto_claro');
  const tw = anchoTexto('PATACONES', 1) + 4, tx = x0 + Math.round((w - tw) / 2);
  C.vl(tx + 3, top - 4, 3, 'asfalto'); C.vl(tx + tw - 4, top - 4, 3, 'asfalto');
  C.box(tx, top - 13, tw, 10, 'luz', 'rojo');
  textoGrande(C, tx + 2, top - 11, 'PATACONES', 'rojo', 1);
  C.vl(x0 + 24, top + 5, 4, 'tinta'); C.p(x0 + 24, top + 9, 'luz'); C.p(x0 + 24, top + 10, 'amarillo');
  // el cliente parado en el mostrador, de espaldas, esperando el suyo
  personita(C, x0 + 1, FT - 1, { ropa: 'verde', pant: 'azul', pelo: 'tinta', piel: 'terracota', alto: 28 });
  // y el otro en su silla plástica roja, al lado del kiosco, con su patacón en la mano
  const sx = x1 + 6, asiento = FT - 9, R = rng(seed);
  C.f(sx - 2, asiento - 14, 2, 14, 'rojo'); C.f(sx - 2, asiento, 12, 2, 'rojo'); C.vl(sx - 1, asiento + 2, 7, 'vino'); C.vl(sx + 8, asiento + 2, 7, 'vino');
  sentadita(C, sx, asiento, { ropa: R() < 0.5 ? 'celeste' : 'luz', pant: 'asfalto', pelo: 'tinta', piel: 'ocre', alto: 18 }, false);
  C.f(sx - 3, asiento - 9, 4, 3, 'amarillo'); C.p(sx - 3, asiento - 10, 'oro');
}

// ---------------------------------------------------------------------------------------------------------------------
// La capa cerca completa

export interface CuadroMaracaibo { publico?: number; gaiteros?: number }

/** La cancha completa sobre la capa cerca (alto franja.atras). `q` dice el cuadro de cada cosa que se mueve. */
export function pintarMaracaibo(C: Lienzo, seed: number, q: CuadroMaracaibo = {}) {
  // la malla de arriba del muro, de paral a paral: alambre en rombos (deja ver el Lago y el puente), el tubo de arriba y los parales
  malla(C, MALLA_X0, MALLA.top, MALLA_X1, MURO.top, 'asfalto', 10, 'asfalto_claro');
  for (let x = MALLA_X0; x < MALLA_X1; x++) { C.p(x, MALLA.top - 2, 'cemento'); C.p(x, MALLA.top - 1, 'asfalto_claro'); C.p(x, MALLA.top + 40, 'asfalto_claro'); }
  for (const px of MALLA.postes) { C.f(px - 1, MALLA.top - 4, 3, MURO.top - MALLA.top + 4, 'asfalto_claro'); C.vl(px - 1, MALLA.top - 4, MURO.top - MALLA.top + 4, 'cemento'); }
  muro(C, seed);
  for (const p of POSTES_LUZ) posteLuz(C, p.x, p.y);
  gradas(C, seed + 5, q.publico ?? 0);
  GAITEROS.forEach((x, i) => gaitero(C, x, FT - 2, i as 0 | 1 | 2 | 3, (q.gaiteros ?? 0) + (i % 2)));
  // los dos márgenes, afuera de la malla: la casita con su farol a la izquierda y el kiosco a la derecha
  casita(C, seed + 11);
  farol(C, FAROL.x, FAROL.y);
  kiosco(C, seed + 12);
}

export const fondoMaracaibo = (C: Lienzo, _x0: number, _x1: number, _base: number, ctx: CtxCerca) => pintarMaracaibo(C, ctx.seed);

// ---------------------------------------------------------------------------------------------------------------------
// El piso: la cancha de concreto pintada

/** ¿Está (x, y) de mundo adentro del área pintada (la llave) de Basket.ts? */
const enArea = (x: number, y: number) => x >= CANCHA.aro.x - 70 && x < CANCHA.x1 && y >= CANCHA.aro.y - 20 && y < CANCHA.aro.y + 20;

/** El concreto pintado: azul adentro de la cancha, naranja en el área y verde afuera, gastado y con grietas, y la luz de los bombillos. */
export function concretoCancha(x: number, y: number, s: number): Color {
  // la textura va contada desde el borde de la cancha (x - OX), para que se vea igual que cuando medía 640
  const xr = (((x - OX) % 960) + 960) % 960;
  // afuera de la malla es la calle del barrio
  if (x < MALLA_X0 || x >= MALLA_X1) {
    // la acera pegada a las casas, el brocal y la calle de asfalto
    // (el asfalto va claro, gastado y alumbrado: sobre el oscuro no se leen los atletas)
    if (y < 12) return (xr + (y >> 2) * 4) % 16 === 0 || grain(xr >> 1, y, s + 3) < 0.05 ? 'cemento' : 'cemento_claro';
    if (y < 14) return y === 12 ? 'luz' : 'cemento';
    return grain(xr, y, s + 3) < 0.04 ? 'cemento_claro' : bayer(xr, y) < 0.12 ? 'asfalto_claro' : 'cemento';
  }
  const dentro = x >= CANCHA.x0 && x < CANCHA.x1 && y < CANCHA.prof;
  const base: Color = !dentro ? 'verde' : enArea(x, y) ? 'ocre' : 'celeste';
  const n = grain(xr, y, s);
  // la pintura gastada: manchones donde asoma el concreto, más por donde se pisa
  if (grain(xr >> 3, y >> 2, s + 1) < 0.035 && bayer(xr, y) < 0.3) return 'cemento';
  // las grietas finitas
  if (grain(xr >> 1, y, s + 2) < 0.005) return MAS_OSCURO[base];
  // la luz de los bombillos cae en charcos más claros
  // (de noche el `cielo` de la paleta es oscuro: la luz de cada color va a mano)
  const claro: Color = base === 'celeste' ? 'cemento_claro' : base === 'ocre' ? 'amarillo' : 'menta';
  const luz = POSTES_LUZ.some((p) => Math.hypot((x - p.x) / 2.2, y - 6) < 30);
  if (luz && bayer(xr, y) < 0.18) return claro;
  return n > 0.985 ? claro : base;
}

/** Las rayas blancas de la media cancha, el área y el arco de los 2 puntos, donde las pone Basket.ts. */
export function rayasMaracaibo(P: Lienzo, _L: ObliqueLayout, seed: number) {
  const { x0, x1, prof, aro, arco } = CANCHA, gasta = (x: number, y: number) => grain(x >> 1, y, seed + 7) < 0.1;
  const raya = (x: number, y: number) => { if (x >= 0 && y >= 0 && x < P.w && y < prof && !gasta(x, y)) P.p(x, y, 'luz'); };
  for (let x = x0; x <= x1; x++) { raya(x, 0); raya(x, prof - 1); }
  for (let y = 0; y < prof; y++) { raya(x0, y); raya(x1, y); }
  for (let x = aro.x - 70; x <= x1; x++) { raya(x, aro.y - 20); raya(x, aro.y + 20); }
  for (let y = aro.y - 20; y <= aro.y + 20; y++) raya(aro.x - 70, y);
  for (let a = -Math.PI / 2; a <= Math.PI / 2; a += 0.004) raya(Math.round(aro.x - Math.cos(a) * arco), Math.round(Math.min(prof - 1, Math.max(0, aro.y + (Math.sin(a) * arco) / 1.6))));
  // el círculo del tiro libre, en la punta del área
  for (let a = 0; a < Math.PI * 2; a += 0.05) raya(Math.round(aro.x - 70 + Math.cos(a) * 12), Math.round(aro.y + Math.sin(a) * 18));
}

/** Lo de abajo de la franja: el canto de la cancha, el concreto verde y una alcantarilla. */
export function orillaMaracaibo(x: number, r: number, s: number): Color {
  // contado desde el borde de la cancha: las alcantarillas quedan donde estaban, corridas con la cancha
  const xr = (((x - OX) % 960) + 960) % 960;
  if (r === 0) return 'cemento_claro';
  if (r < 4) return 'cemento';
  if (r === 4) return 'asfalto';
  if (xr % 320 > 200 && xr % 320 < 226 && r > 10 && r < 18) return (xr + r) % 2 ? 'sombra' : 'tinta';
  return grain(xr >> 1, r, s) < 0.05 ? 'verde_oscuro' : bayer(xr, r) < 0.15 ? 'verde_oscuro' : 'verde';
}

// ---------------------------------------------------------------------------------------------------------------------
// Vida, luces y partículas

/**
 * Lo que se corre la capa lejos contra el mundo con la cámara parada en la cancha (x = OX, el juego la centra): la capa
 * lejos va al 0.25 de la cámara (PARALAJE.lejos de escena.ts, que no se importa aquí para no armar un ciclo), así que el
 * pixel x de lejos.png cae en el x de mundo x - OX * 0.25 + OX. Con OX 80 son 60 px.
 */
const CORRE_LEJOS = OX - OX * 0.25;

/**
 * El relámpago del Catatumbo: 8 cuadros a 4 por segundo. Casi siempre nada; de pronto la nube se alumbra por dentro y
 * cae un rayo ramificado, se apaga y vuelve a parpadear. Solo se ve donde la capa cerca deja ver afuera (el cielo y los
 * huecos de la malla). `x` es de mundo; la nube se busca en lejos.png en `x - CORRE_LEJOS`.
 */
function relampago(pal: Paleta, cerca: Lienzo, lejos: Lienzo, x: number, y: number, w: number, h: number, yLejos: number, seed: number): Lienzo[] {
  const R = rng(seed);
  const nubeEn = new Set(['canal', 'azul', 'cielo', 'salmon'].map((c) => pal[c as Color]));
  const hex = (L: Lienzo, px: number, py: number) => { if (px < 0 || py < 0 || px >= L.w || py >= L.h) return ''; const i = (py * L.w + px) * 4, d = L.r.data; return d[i + 3] ? '#' + [d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('') : ''; };
  const rayo = (L: Lienzo, sx: number, sy: number, largo: number, rama: boolean) => {
    let px = sx, py = sy;
    for (let i = 0; i < largo; i++) {
      px += Math.round((R() - 0.5) * 3); py += 1 + (R() < 0.3 ? 1 : 0);
      L.p(px, py, 'luz'); L.p(px + 1, py, 'salmon');
      if (rama && i > 6 && R() < 0.1) { let qx = px, qy = py; for (let j = 0; j < 8; j++) { qx += R() < 0.5 ? 1 : 2; qy += 1; L.p(qx, qy, 'salmon'); } }
    }
  };
  // la nube alumbrada por dentro: solo sobre los pixeles de la nube de la capa lejos, blanca al centro y violeta afuera
  const nube = (L: Lienzo, cx: number, cy: number, k: number) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (!nubeEn.has(hex(lejos, x - CORRE_LEJOS + i, y + j - yLejos))) continue;
      const d = Math.hypot((i - cx) / (w * 0.42), (j - cy) / (h * 0.5));
      if (d < 1 && bayer(i, j) < (1 - d) * k) L.p(i, j, d < 0.35 ? 'luz' : d < 0.6 ? 'salmon' : 'cielo');
    }
  };
  const cuadros = Array.from({ length: 8 }, () => new Lienzo(w, h, pal));
  nube(cuadros[5], w * 0.45, h * 0.45, 0.9); rayo(cuadros[5], Math.round(w * 0.42), Math.round(h * 0.4), Math.round(h * 0.6), true);
  nube(cuadros[6], w * 0.45, h * 0.45, 0.4);
  nube(cuadros[7], w * 0.65, h * 0.35, 0.6); rayo(cuadros[7], Math.round(w * 0.62), Math.round(h * 0.3), Math.round(h * 0.35), false);
  return cuadros.map((c) => soloAfuera(c, cerca, x, y));
}

export function vidaMaracaibo(pal: Paleta, L: ObliqueLayout, _k: number, seed: number, capas: { cerca: Lienzo; piso: Lienzo }): VidaEscena[] {
  const out: VidaEscena[] = [], quiere = (t: string) => L.vida.includes(t), W = capas.cerca.w, H = capas.cerca.h;
  const cuadro = (q: CuadroMaracaibo) => { const c = new Lienzo(W, H, pal); pintarMaracaibo(c, seed, q); return c; };
  if (quiere('relampago')) {
    // sobre la nube del Catatumbo: la capa lejos va de la fila 12 (franja.atras - 30 - 170) y, con la cámara parada en la
    // cancha (x = OX), su x de lejos.png cae en el x de mundo + CORRE_LEJOS
    const yLejos = FT - 30 - 170, x = CATATUMBO.x0 + 10 + CORRE_LEJOS, y = yLejos + CATATUMBO.top - 4, w = 200, h = ORILLA_LAGO - CATATUMBO.top + 4;
    // la misma capa lejos que pinta la escena (semilla + 39): el relámpago alumbra solo la nube
    const lejos = lagoPuenteUrdaneta(pal, 1280, 170, seed + 39);
    out.push({ id: 'relampago_catatumbo', tipo: 'relampago', capa: 'cerca', x, y, cuadros: relampago(pal, capas.cerca, lejos, x, y, w, h, yLejos, seed), fps: 4 });
  }
  if (quiere('gaiteros')) {
    const cs = [0, 1].map((f) => cuadro({ gaiteros: f }));
    const x = GAITEROS[0] - 8, y = FT - 42, w = GAITEROS[3] + 22 - x, h = 40;
    out.push({ id: 'gaiteros', tipo: 'gaiteros', capa: 'cerca', x, y, cuadros: cs.map((c) => recorte(c, x, y, w, h)), fps: 3 });
  }
  if (quiere('publico')) {
    const cs = [0, 1].map((f) => cuadro({ publico: f }));
    const x = GRADAS.x0, y = GRADAS.top - 26, w = GRADAS.x1 - GRADAS.x0, h = 40;
    out.push({ id: 'publico', tipo: 'publico', capa: 'cerca', x, y, cuadros: cs.map((c) => recorte(c, x, y, w, h)), fps: 2 });
  }
  return out;
}

export function lucesMaracaibo(pal: Paleta, _L: ObliqueLayout, _k: number): Luz[] {
  const out: Luz[] = POSTES_LUZ.flatMap((p) => [-14, 8].map((d) => ({ x: p.x + d, y: p.y + 6, color: pal.oro, radio: 80, latido: 0.05, encendida: true, nota: 'el bombillo de sodio del poste, que alumbra la cancha' })));
  // la luz va en x de mundo, donde se ve la nube con la cámara en la cancha (lejos x + CORRE_LEJOS), igual que su vida
  out.push({ x: CATATUMBO.x0 + 110 + CORRE_LEJOS, y: FT - 30 - 170 + 80, color: pal.salmon, radio: 70, parpadeo: 2, encendida: true, nota: 'el resplandor del relámpago del Catatumbo en la nube: prende y apaga con su vida' });
  out.push({ x: FAROL.x - 14, y: FAROL.y, color: pal.oro, radio: 60, latido: 0.05, encendida: true, nota: 'el poste de alumbrado de la calle, afuera de la malla' });
  out.push({ x: KIOSCO.x0 + 24, y: KIOSCO.top + 10, color: pal.amarillo, radio: 36, latido: 0.08, encendida: true, nota: 'el bombillo pelado del kiosco de los patacones' });
  return out;
}

export function particulasMaracaibo(pal: Paleta, L: ObliqueLayout, _k: number): Particula[] {
  return [
    ...POSTES_LUZ.map((p) => ({ tipo: 'brillo', x0: p.x - 24, x1: p.x + 24, y0: p.y - 4, y1: p.y + 22, color: [pal.amarillo, pal.luz], cada: 0.5, vida: 0.6, nota: 'las polillas que dan vueltas alrededor del bombillo' })),
    { tipo: 'brillo', x0: FAROL.x - 30, x1: FAROL.x, y0: FAROL.y - 6, y1: FAROL.y + 16, color: [pal.amarillo, pal.luz], cada: 0.7, vida: 0.6, nota: 'las polillas del poste de alumbrado de la calle' },
    { tipo: 'calor', x0: OX + 40, x1: L.largo, y0: 200, y1: 300, color: [pal.cemento_claro, pal.crema], cada: 1.2, sube: 6, vida: 1.6, nota: 'el calor que sube del concreto: ¡qué calor, primo!' },
  ];
}

export const MARACAIBO: Lugar = {
  estilo: 'venezuela_lago',
  fondo: fondoMaracaibo,
  lejos: { lago_puente_urdaneta: lagoPuenteUrdaneta },
  pisos: { cancha: (x, y, s) => concretoCancha(x, y, s) },
  orilla: orillaMaracaibo,
  marcas: rayasMaracaibo,
  vida: vidaMaracaibo,
  luces: lucesMaracaibo,
  particulas: particulasMaracaibo,
};
