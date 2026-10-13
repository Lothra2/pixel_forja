import { rng, grain, bayer } from '../../fx/pix';
import { Lienzo } from './lienzo';
import type { Color, Paleta } from './paleta';
import { nueva, type Pieza } from './calle';
import { drawText, textWidth } from './letras';
import { textoGrande } from './comuna13';
import { nombreEn } from './inclinada';
import type { CtxCerca, PintorCerca } from './fachadas';

/**
 * La azotea de Parque Central en el estilo `venezuela_ciudad`, de noche: El Ávila con la Cruz encendida y los cerros
 * llenos de lucecitas (lejos), las dos torres de Parque Central con sus ventanas, la ciudad encendida y el público en
 * las azoteas vecinas (cerca), la caseta de la escalera con los neones de AREPERA LA CHAMA y CARACAS, los tanques, las
 * antenas y el borde sin baranda con su franja amarilla y negra. Todo con la paleta de la ficha. La luz es la de la
 * luna desde la izquierda y la de los neones, que se refleja en el piso mojado.
 */

// ---------------------------------------------------------------------------------------------------------------------
// Lo lejos: El Ávila de noche

/** Dónde está la Cruz en la capa lejos (x, y de la punta del pico). */
export const CRUZ = { x: 430, y: 36 };

/** El Ávila de noche: la montaña larga casi negra con las laderas de luna, la Cruz encendida, los cerros con lucecitas y la ciudad abajo. */
export function avilaNoche(pal: Paleta, w: number, h: number, seed: number): Lienzo {
  const L = new Lienzo(w, h, pal);
  // ondas con periodos que dividen el ancho: la capa da la vuelta sin costura
  const onda = (x: number, a: number[], f: number[], ph: number[]) => a.reduce((s, ai, i) => s + ai * Math.sin((x / w) * Math.PI * 2 * f[i] + ph[i]), 0);
  // el pico de la Cruz: una campana que también da la vuelta
  const pico = (x: number) => { const d = Math.min(Math.abs(x - CRUZ.x), w - Math.abs(x - CRUZ.x)); return 22 * Math.exp(-((d / 200) ** 2)); };
  const cresta = (x: number) => Math.round(CRUZ.y + 20 + onda(x, [7, 4, 2], [2, 5, 13], [0.6 - (CRUZ.x / w) * Math.PI * 4, 2.1, 0.4]) - pico(x));
  for (let x = 0; x < w; x++) {
    const top = cresta(x), antes = cresta((x - 3 + w) % w);
    // la ladera que sube hacia la derecha mira a la luna (izquierda): más clara
    const luna = top < antes ? 0.45 : top === antes ? 0.22 : 0.08;
    for (let y = top; y < h; y++) {
      const t = (y - top) / 60;
      // quebradas: vetas finas que bajan en diagonal, hacia afuera de la cresta
      const dir = top < antes ? 1 : -1, veta = grain((x + dir * ((y - top) >> 1)) >> 1, (y - top) >> 4, seed + 3) < 0.16 && bayer(x, y) < 0.7;
      // la montaña de noche es azul casi negra; la luna la toca arriba y abajo el monte se pone verde oscuro
      let c: Color = y === top ? 'cielo' : veta ? 'azul_noche' : bayer(x >> 1, y >> 1) < luna * (1 - t) ? 'cielo' : t > 0.55 && bayer(x, y) < (t - 0.55) * 1.5 ? 'verde_oscuro' : 'azul';
      // el pie del Ávila se pierde en el resplandor de la ciudad
      if (y > 100 && bayer(x, y) < (y - 100) / 40) c = 'bruma';
      L.p(x, y, c);
    }
    // casitas encendidas en las faldas del Ávila, pocas
    for (let y = top + 34; y < h; y += 2) if (grain(x, y, seed + 7) < 0.012 + (y - top - 34) * 0.0008) L.p(x, y, grain(x, y, seed + 8) < 0.7 ? 'ocre' : 'amarillo');
  }
  // la Cruz del Ávila con su resplandor
  const cy = cresta(CRUZ.x) - 1;
  for (let j = -18; j <= 4; j++) for (let i = -14; i <= 14; i++) {
    const d = Math.hypot(i, (j + 7) * 1.1);
    if (d < 14 && d > 3 && bayer(CRUZ.x + i, cy + j) < (1 - d / 14) * 0.45) L.p(CRUZ.x + i, cy + j, d < 7 ? 'oro' : 'ocre');
  }
  L.f(CRUZ.x - 1, cy - 14, 3, 14, 'luz'); L.vl(CRUZ.x + 1, cy - 14, 14, 'crema');
  L.f(CRUZ.x - 5, cy - 10, 11, 2, 'luz'); L.hl(CRUZ.x - 5, cy - 9, 11, 'crema');
  // los cerros de adelante: barrios llenos de lucecitas, en manchones
  for (let x = 0; x < w; x++) {
    const top = Math.round(92 + onda(x, [10, 6, 3], [3, 7, 17], [1.3, 0.2, 2.6]));
    for (let y = top; y < h; y++) {
      L.p(x, y, y === top ? 'asfalto' : bayer(x, y) < 0.2 ? 'azul' : 'sombra');
      const barrio = grain(x >> 4, y >> 3, seed + 11) < 0.55;
      if (barrio && grain(x, y, seed + 12) < 0.06 + (y - top) * 0.0035) L.p(x, y, grain(x, y, seed + 13) < 0.65 ? 'ocre' : grain(x, y, seed + 14) < 0.7 ? 'amarillo' : 'luz');
    }
  }
  // la ciudad abajo: edificios con ventanas prendidas
  const R = rng(seed + 20);
  for (let n = 0; n < 70; n++) {
    const x = Math.floor(R() * w), bw = 5 + Math.floor(R() * 9), bh = 8 + Math.floor(R() * 22), gy = 150 + Math.floor(R() * 8);
    for (let i = 0; i < bw; i++) { const X = (x + i) % w; for (let y = gy - bh; y < h; y++) L.p(X, y, i === 0 ? 'asfalto' : 'sombra'); }
    for (let y = gy - bh + 2; y < h - 1; y += 3) for (let i = 1; i < bw - 1; i += 2) if (R() < 0.5) L.p((x + i) % w, y, R() < 0.7 ? 'oro' : 'amarillo');
  }
  return L;
}

// ---------------------------------------------------------------------------------------------------------------------
// Lo cerca: las torres, la ciudad, el público y nuestra azotea

/** Las dos torres de Parque Central: x de la izquierda, ancho y fila de arriba. */
export const TORRES_PC = [{ x: 74, w: 54, top: 22 }, { x: 206, w: 54, top: 30 }];
/** Fila donde termina la caseta por arriba y empiezan los neones. */
const CASETA = { x0: 392, x1: 568, techo: 162 };
/** Los dos neones: dónde va cada caja (en la capa cerca). */
export const NEONES_CCS = {
  arepera: { x: 396, y: 104, w: 104, h: 48, color: 'salmon' as Color },
  caracas: { x: 506, y: 112, w: 82, h: 40, color: 'menta' as Color },
};
/** El público en las azoteas vecinas: x de la izquierda, ancho y fila del techo. */
export const AZOTEAS_PUBLICO = [{ x: 140, w: 52, techo: 196 }, { x: 290, w: 80, techo: 192 }];

/** Una torre de Parque Central: concreto con las losas marcadas, ventanas prendidas, la corona y la luz roja. */
function torrePC(C: Lienzo, x: number, w: number, top: number, base: number, seed: number) {
  // la corona: dos pisos de máquinas más angostos y el mástil
  C.f(x + 8, top - 8, w - 16, 8, 'asfalto'); C.hl(x + 8, top - 8, w - 16, 'cemento');
  C.vl(x + Math.floor(w / 2), top - 22, 14, 'asfalto_claro');
  for (let j = 0; j < base - top; j++) for (let i = 0; i < w; i++) {
    const X = x + i, Y = top + j;
    // los pilares cada 6 y la losa cada 4: la cuadrícula de concreto
    const pilar = i % 6 === 0 || i === w - 1, losa = j % 4 === 0;
    const sombra = i > w * 0.72;
    if (i === 0) { C.p(X, Y, 'cemento_claro'); continue; }
    if (pilar || losa) { C.p(X, Y, sombra ? 'asfalto' : pilar ? 'crema' : 'cemento_claro'); continue; }
    // la ventana: prendida (amarillo u oro), apagada o con la tele
    // por apartamento (dos ventanas) y piso: casi todas prendidas, en tibio
    const g = grain((X / 12) | 0, (Y / 4) | 0, seed);
    C.p(X, Y, g < 0.6 ? (sombra ? 'ocre' : g < 0.25 ? 'amarillo' : 'oro') : g < 0.63 ? 'celeste' : sombra ? 'sombra' : 'asfalto');
  }
  // la franja de arriba, el remate de concreto
  C.f(x, top, w, 3, 'cemento_claro'); C.hl(x, top, w, 'crema');
}

/** La ciudad encendida detrás del murito: edificios bajos con ventanas, en bandas. Igual en todo el ancho (por x de mundo). */
function ciudad(C: Lienzo, x0: number, x1: number, base: number, seed: number) {
  const R = rng(seed + 31);
  // dos bandas: la de atrás, más alta y más oscura, y la de adelante
  for (const [banda, alto, cuerpo] of [[0, 30, 'sombra'], [1, 18, 'asfalto']] as [number, number, Color][]) {
    for (let x = -30; x < x1 + 30;) {
      const w = 16 + Math.floor(R() * 34), h = alto * 0.5 + Math.floor(R() * alto), top = base - 30 - banda * 4 - Math.round(h);
      if (x + w > x0) {
        for (let j = 0; top + j < base; j++) for (let i = 0; i < w; i++) C.p(x + i, top + j, i === 0 && banda ? 'asfalto_claro' : j === 0 ? 'asfalto_claro' : cuerpo);
        for (let y = top + 3; y < base - 4; y += 4) for (let i = 2; i < w - 2; i += 3) if (grain(x + i, y, seed + banda) < 0.42) { C.p(x + i, y, grain(x + i, y, seed + 5) < 0.7 ? 'oro' : 'amarillo'); C.p(x + i + 1, y, 'ocre'); }
        if (R() < 0.15) C.p(x + Math.floor(w / 2), top - 1, 'rojo');
      }
      x += w + (R() < 0.25 ? 2 + Math.floor(R() * 6) : 0);
    }
  }
}

/** El público en una azotea vecina: gente parada detrás de su murito, con banderitas y celulares. */
export function publico(C: Lienzo, x: number, w: number, techo: number, seed: number, f = 0) {
  // un bombillo colgado que los alumbra: la cuerda de lucecitas
  for (let i = 0; i < w; i++) { const yy = techo - 20 + Math.round(Math.sin((i / w) * Math.PI) * 3); C.p(x + i, yy, 'sombra'); if (i % 7 === 3) C.p(x + i, yy + 1, 'amarillo'); }
  const R = rng(seed);
  for (let px = x + 3, n = 0; px < x + w - 4; n++) {
    // todo lo de cada persona sale antes de dibujar: así los dos cuadros de la vida tienen la misma gente
    const alto = 9 + Math.floor(R() * 3), ropa: Color = (['rojo', 'amarillo', 'celeste', 'crema', 'menta'] as Color[])[Math.floor(R() * 5)], bandera = R() < 0.5, paso = 7 + Math.floor(R() * 4);
    const cabeza = techo - alto, arriba = (n + f) % 3 === 0;
    // hombros, cuerpo con su lado en sombra, y la cabeza con el pelo
    C.f(px, cabeza + 4, 5, alto - 4, ropa); C.vl(px + 4, cabeza + 4, alto - 4, 'asfalto'); C.hl(px, cabeza + 4, 5, ropa === 'crema' ? 'luz' : ropa);
    C.f(px + 1, cabeza + 1, 3, 3, 'terracota'); C.p(px + 3, cabeza + 3, 'vino'); C.hl(px + 1, cabeza, 3, 'tinta'); C.p(px + 1, cabeza + 1, 'tinta');
    if (arriba) {
      // brazos arriba: con la bandera de Venezuela o el celular prendido
      C.vl(px - 1, cabeza - 1, 6, ropa); C.vl(px + 5, cabeza - 1, 6, ropa);
      if (bandera) { C.vl(px + 6, cabeza - 8, 8, 'cemento_claro'); C.hl(px + 7, cabeza - 8, 6, 'amarillo'); C.hl(px + 7, cabeza - 7, 6, 'azul'); C.hl(px + 7, cabeza - 6, 6, 'rojo'); C.p(px + 9, cabeza - 7, 'luz'); C.p(px + 11, cabeza - 7, 'luz'); }
      else { C.p(px - 1, cabeza - 2, 'luz'); C.p(px - 1, cabeza - 3, 'celeste'); }
    } else { C.vl(px - 1, cabeza + 5, 4, ropa); }
    px += paso;
  }
  // su murito, con la luz de las lucecitas
  C.f(x, techo, w, 6, 'asfalto_claro'); C.hl(x, techo, w, 'cemento'); C.f(x, techo + 6, w, 4, 'asfalto');
}

/** Un tanque de agua cilíndrico en su base de hierro, con los anillos y el tubo que baja. */
function tanque(C: Lienzo, x: number, y: number, w: number, h: number, base: number) {
  // las patas
  for (const px of [x + 3, x + w - 5]) C.f(px, y + h, 2, base - y - h, 'sombra');
  C.hl(x + 2, y + h + 4, w - 4, 'asfalto'); C.ln(x + 4, y + h + 4, x + w - 6, base - 2, 'asfalto');
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const t = i / (w - 1);
    // cilindro: la luna da por la izquierda
    let c: Color = t < 0.12 ? 'cemento' : t < 0.35 ? 'cemento_claro' : t < 0.7 ? 'cemento' : t < 0.9 ? 'asfalto_claro' : 'asfalto';
    if (j % 12 === 6) c = t < 0.35 ? 'cemento' : 'asfalto';
    C.p(x + i, y + j, c);
  }
  // el techo en domo
  for (let i = 0; i < w; i++) { const t = (i - w / 2) / (w / 2), d = Math.round(Math.sqrt(Math.max(0, 1 - t * t)) * 4); for (let j = 0; j < d; j++) C.p(x + i, y - j, j === d - 1 ? 'cemento_claro' : 'cemento'); }
  C.f(x + Math.floor(w / 2) - 2, y - 6, 4, 2, 'asfalto');
  // los chorreados del óxido y el tubo que baja al piso
  C.drips(x + 1, y + 2, w - 2, 8, 'asfalto_claro', x, 0.15);
  const tx = x + w - 8;
  C.f(tx, y + h - 2, 3, base - y - h + 2, 'terracota'); C.vl(tx, y + h - 2, base - y - h + 2, 'ocre'); C.hl(tx - 1, base - 12, 5, 'vino');
}

/** El murito del borde de la azotea: concreto con su remate, manchas y la luz de los neones que le cae encima. */
function murito(C: Lienzo, x0: number, x1: number, base: number, seed: number) {
  const top = base - 18;
  for (let x = x0; x < x1; x++) {
    for (let y = top; y < base; y++) {
      const r = y - top;
      C.p(x, y, r === 0 ? 'crema' : r < 3 ? 'cemento_claro' : r === 3 ? 'asfalto' : r === 17 ? 'asfalto' : grain(x >> 1, y, seed) < 0.05 ? 'asfalto_claro' : 'cemento');
    }
    if (x % 48 === 0) C.vl(x, top + 4, 13, 'asfalto_claro');
  }
  C.drips(x0, top + 4, x1 - x0, 7, 'asfalto_claro', seed, 0.22);
}

/** El fondo de la azotea: la ciudad, las torres de Parque Central, el público, los tanques y el murito. */
export const torresParqueCentral: PintorCerca = (C, x0, x1, base, ctx: CtxCerca) => {
  ciudad(C, x0, x1, base, ctx.seed);
  for (const [i, t] of TORRES_PC.entries()) torrePC(C, t.x, t.w, t.top, base - 30, ctx.seed + i * 17);
  for (const [i, a] of AZOTEAS_PUBLICO.entries()) {
    // el edificio vecino debajo del público
    C.f(a.x - 2, a.techo + 6, a.w + 4, base - a.techo, 'sombra');
    for (let y = a.techo + 12; y < base - 20; y += 5) for (let xx = a.x + 2; xx < a.x + a.w - 2; xx += 4) if (grain(xx, y, ctx.seed + 9) < 0.5) C.p(xx, y, 'oro');
    publico(C, a.x, a.w, a.techo, ctx.seed + 40 + i);
  }
  // los tanques grandes de la izquierda
  tanque(C, 2, 120, 40, 62, base - 18);
  tanque(C, 34, 146, 34, 44, base - 18);
  // barandas de tubo entre los tanques y el murito
  murito(C, x0 - 2, Math.min(x1, CASETA.x0), base, ctx.seed);
  // pipotes y una unidad de aire contra el murito
  for (const bx of [318, 332]) { C.f(bx, base - 30, 12, 14, 'celeste'); C.hl(bx, base - 26, 12, 'azul'); C.hl(bx, base - 21, 12, 'azul'); C.vl(bx, base - 30, 14, 'cielo'); C.hl(bx, base - 30, 12, 'cemento_claro'); }
  aireEnPared(C, 350, base - 34);
};

/** Una unidad de aire acondicionado con el ventilador, pegada a la pared. */
function aireEnPared(C: Lienzo, x: number, y: number) {
  C.box(x, y, 26, 18, 'cemento_claro', 'asfalto'); C.hl(x + 1, y + 1, 24, 'crema');
  C.d(x + 9, y + 9, 6, 'asfalto'); C.d(x + 9, y + 9, 5, 'sombra');
  for (let k = 0; k < 4; k++) C.ln(x + 9, y + 9, x + 9 + Math.round(Math.cos(k * 1.57 + 0.5) * 4), y + 9 + Math.round(Math.sin(k * 1.57 + 0.5) * 4), 'asfalto_claro');
  for (let j = y + 4; j < y + 15; j += 2) C.hl(x + 17, j, 6, 'cemento');
  C.f(x + 2, y + 18, 3, 2, 'asfalto'); C.f(x + 21, y + 18, 3, 2, 'asfalto');
}

/** El halo de un neón: el color tramado que se apaga hacia afuera, solo sobre lo oscuro. */
function halo(C: Lienzo, x: number, y: number, w: number, h: number, c: Color, fuerza = 0.42) {
  const cx = x + w / 2, cy = y + h / 2;
  for (let j = -12; j < h + 12; j++) for (let i = -14; i < w + 14; i++) {
    const dx = Math.max(0, Math.abs(x + i - cx) - w / 2) / 14, dy = Math.max(0, Math.abs(y + j - cy) - h / 2) / 12, d = Math.hypot(dx, dy);
    if (d < 1 && bayer(x + i, y + j) < (1 - d) * fuerza) C.p(x + i, y + j, c);
  }
}

/** El ícono de la arepa en neón: el círculo con la raja del medio. */
function arepa(C: Lienzo, cx: number, cy: number, c: Color) {
  for (let a = 0; a < 64; a++) { const t = (a / 64) * Math.PI * 2; C.p(Math.round(cx + Math.cos(t) * 9), Math.round(cy + Math.sin(t) * 7), c); C.p(Math.round(cx + Math.cos(t) * 8), Math.round(cy + Math.sin(t) * 6), 'luz'); }
  for (let i = -6; i <= 6; i++) { C.p(cx + i, cy + Math.round(Math.sin(i * 0.6)), 'luz'); C.p(cx + i, cy + 1 + Math.round(Math.sin(i * 0.6)), c); }
  for (const [i, j] of [[-4, -3], [0, -4], [4, -3], [-3, 3], [2, 3]]) C.p(cx + i, cy + j, c);
}

/**
 * Un neón en su caja: el fondo negro, el marco de tubo y las letras de luz con el borde del color. `apagado` apaga
 * unas letras (el parpadeo de la vida). Se pinta en (0, 0) de un lienzo del tamaño de la caja más el halo.
 */
export function neon(C: Lienzo, n: 'arepera' | 'caracas', ox: number, oy: number, apagado = false) {
  const N = NEONES_CCS[n], c = N.color, x = ox, y = oy;
  // las patas sobre el techo de la caseta
  for (const px of [x + 8, x + N.w - 10]) C.f(px, y + N.h, 2, CASETA.techo - (N.y + N.h), 'sombra');
  C.f(x, y, N.w, N.h, 'tinta');
  C.box(x + 1, y + 1, N.w - 2, N.h - 2, 'tinta', c); C.box(x + 2, y + 2, N.w - 4, N.h - 4, 'tinta', apagado ? 'vino' : 'luz');
  if (n === 'arepera') {
    arepa(C, x + 16, y + 24, c);
    textoGrande(C, x + 32, y + 9, 'AREPERA', 'luz', c);
    // en el parpadeo se apaga LA CHAMA
    textoGrande(C, x + 32, y + 28, 'LA CHAMA', apagado ? 'vino' : 'luz', apagado ? 'sombra' : c);
  } else {
    // El Ávila en tubo, con la Cruz, encima de CARACAS
    const pts: [number, number][] = [[8, 22], [22, 10], [30, 16], [41, 5], [52, 15], [60, 11], [74, 22]];
    for (let k = 0; k < pts.length - 1; k++) { const [a, b] = pts[k], [p, q] = pts[k + 1]; C.ln(x + a, y + b, x + p, y + q, apagado ? 'cielo' : c); C.ln(x + a, y + b + 1, x + p, y + q + 1, apagado ? 'azul' : 'luz'); }
    C.vl(x + 41, y + 1, 4, 'luz'); C.hl(x + 40, y + 2, 3, 'luz');
    textoGrande(C, x + 13, y + 26, 'CARACAS', 'luz', c);
  }
}

/** La caseta de la escalera: paredes de concreto, la puerta de lámina, los bombillos, el letrero pintado y la escalerita al techo. */
function caseta(C: Lienzo, base: number, seed: number) {
  const { x0, x1, techo } = CASETA;
  // las paredes, más claras donde caen los bombillos
  const bombillos = [428, 511];
  for (let y = techo; y < base; y++) for (let x = x0; x < x1; x++) {
    const d = Math.min(...bombillos.map((b) => Math.hypot((x - b) / 1.3, y - techo - 8)));
    const t = Math.max(0, 1 - d / 34);
    C.p(x, y, x === x0 ? 'cemento_claro' : bayer(x, y) < t * 1.4 - 0.4 ? 'crema' : bayer(x, y) < t * 1.4 ? 'cemento_claro' : y > base - 6 ? 'asfalto_claro' : 'cemento');
  }
  C.drips(x0, techo + 2, x1 - x0, 10, 'asfalto_claro', seed, 0.2);
  // el techo: la losa que vuela con su canto
  C.f(x0 - 4, techo - 6, x1 - x0 + 8, 6, 'cemento_claro'); C.hl(x0 - 4, techo - 6, x1 - x0 + 8, 'crema'); C.hl(x0 - 4, techo - 1, x1 - x0 + 8, 'asfalto');
  // la baranda del techo
  C.hl(x0 - 2, techo - 14, x1 - x0 + 4, 'asfalto_claro'); for (let x = x0; x <= x1; x += 12) C.vl(x, techo - 14, 8, 'asfalto_claro');
  // la rejilla de ventilación
  C.box(536, techo + 14, 22, 14, 'asfalto', 'sombra'); for (let j = techo + 16; j < techo + 27; j += 2) C.hl(537, j, 20, 'asfalto_claro');
  // la puerta de lámina con su ventanita, debajo del bombillo
  const px = 500, pw = 22, py = base - 40;
  C.box(px - 2, py - 2, pw + 4, 42, 'asfalto', 'sombra');
  C.f(px, py, pw, 38, 'asfalto_claro'); C.vl(px, py, 38, 'cemento'); C.f(px + 6, py + 5, 10, 8, 'sombra'); C.hl(px + 6, py + 5, 10, 'asfalto');
  C.f(px + 17, py + 20, 2, 2, 'oro'); C.hl(px, py + 18, pw, 'asfalto');
  // los bombillos con su luz
  for (const b of bombillos) { C.f(b - 3, techo + 4, 7, 3, 'asfalto'); C.f(b - 2, techo + 7, 5, 2, 'amarillo'); C.hl(b - 1, techo + 7, 3, 'luz'); }
  // CARACAS ES BELLA pintado en la pared, con la banderita
  const tx = 410;
  for (const [i, t] of ['CARACAS', 'ES', 'BELLA'].entries()) drawText(C, tx + Math.floor((28 - textWidth(t)) / 2), techo + 14 + i * 9, t, 'sombra');
  C.hl(tx + 6, techo + 44, 15, 'amarillo'); C.hl(tx + 6, techo + 45, 15, 'amarillo'); C.hl(tx + 6, techo + 46, 15, 'azul'); C.hl(tx + 6, techo + 47, 15, 'azul'); C.hl(tx + 6, techo + 48, 15, 'rojo'); C.hl(tx + 6, techo + 49, 15, 'rojo');
  for (let i = 0; i < 5; i++) C.p(tx + 9 + i * 2, techo + 46 + (i === 0 || i === 4 ? 1 : 0), 'luz');
  // los tubos que bajan por la pared
  for (const tx2 of [x0 + 3, 486]) { C.f(tx2, techo, 2, base - techo - 2, 'terracota'); C.vl(tx2, techo, base - techo - 2, 'ocre'); for (let y = techo + 20; y < base; y += 26) C.hl(tx2 - 1, y, 4, 'vino'); }
  // dos aires contra la pared, abajo a la derecha
  aireEnPared(C, 536, base - 30);
  // la escalerita de hierro del lado derecho, del piso al techo
  const ex0 = x1 + 2, ex1 = 606;
  for (let y = techo - 8; y < base; y++) {
    const t = (y - techo + 8) / (base - techo + 8), x = Math.round(ex0 + (ex1 - ex0) * t);
    C.p(x, y, 'asfalto_claro'); C.p(x + 6, y, 'asfalto'); C.p(x - 2, y - 10, 'cemento');
    if ((y - techo) % 7 === 0) C.hl(x, y, 7, 'cemento');
  }
}

/** El tramo de los neones: la ciudad y las torres de fondo, la caseta con sus neones, el murito y el borde. */
export const letrerosNeon: PintorCerca = (C, x0, x1, base, ctx: CtxCerca) => {
  torresParqueCentral(C, x0, x1, base, ctx);
  // antenas y parabólicas en el techo de la caseta
  C.vl(410, 62, CASETA.techo - 62, 'asfalto_claro'); C.vl(411, 62, CASETA.techo - 62, 'sombra');
  for (let y = 66; y < CASETA.techo; y += 6) C.ln(408, y, 413, y + 6, 'asfalto');
  C.f(406, 70, 3, 12, 'cemento_claro'); C.f(413, 74, 3, 12, 'cemento_claro'); C.p(410, 60, 'rojo');
  for (const [dx, dy] of [[476, 96], [560, 100]]) {
    // la parabólica mira arriba a la izquierda: el plato de canto, la cara con luz y el brazo con el receptor
    C.d(dx, dy, 7, 'asfalto_claro', 0.55); C.d(dx - 1, dy - 1, 6, 'cemento_claro', 0.5); C.d(dx - 1, dy - 1, 3, 'crema', 0.5);
    C.ln(dx, dy, dx - 5, dy - 5, 'asfalto'); C.p(dx - 5, dy - 5, 'cemento');
    C.ln(dx + 2, dy + 3, dx + 4, CASETA.techo - 14, 'asfalto_claro');
  }
  // el murito llega hasta el borde: de ahí en adelante, el vacío
  const borde = ctx.huecos?.find((h) => h.x1 >= x1 - 60)?.x0 ?? x1;
  murito(C, CASETA.x1, borde - 2, base, ctx.seed + 3);
  // el canto del murito donde se acaba, con la franja de peligro
  for (let y = base - 18; y < base; y++) for (let x = borde - 6; x < borde - 2; x++) C.p(x, y, ((y + x) >> 2) % 2 ? 'amarillo' : 'tinta');
  caseta(C, base, ctx.seed);
  for (const n of ['arepera', 'caracas'] as const) { const N = NEONES_CCS[n]; halo(C, N.x, N.y, N.w, N.h, N.color); }
  for (const n of ['arepera', 'caracas'] as const) neon(C, n, NEONES_CCS[n].x, NEONES_CCS[n].y);
  // la luz del neón que baña el techo y la baranda
  for (let x = CASETA.x0 - 4; x < CASETA.x1 + 4; x++) if (bayer(x, CASETA.techo - 6) < 0.5) C.p(x, CASETA.techo - 6, x < 502 ? 'salmon' : 'menta');
};

export const PINTORES_CCS: Record<string, PintorCerca> = { letreros_neon: letrerosNeon };
export const FONDO_CCS: Record<string, PintorCerca> = { torres_parque_central: torresParqueCentral };

// ---------------------------------------------------------------------------------------------------------------------
// El piso: las losas de la azotea, el borde y el reflejo del neón

/** Losas grandes de concreto de la azotea, de 40 x 14, con sus juntas, unas más oscuras y manchas de agua. */
export function losaAzotea(x: number, y: number, s: number): Color {
  const col = Math.floor(x / 48), fila = Math.floor(y / 16), jx = x % 48, jy = y % 16;
  if (jy === 15 || jx === 47) return 'asfalto';
  const t = grain(col, fila, s + 21);
  // el canto de arriba de la losa da a la luna, en algunas
  if (jy === 0 && t > 0.6) return 'cemento_claro';
  // charquitos: manchas ovaladas oscuras con el borde tramado
  for (const c of charcosDe(s)) {
    const d = (((x % 680) - c.x) / c.rx) ** 2 + ((y - c.y) / c.ry) ** 2;
    if (d < 0.7 || (d < 1 && bayer(x, y) < (1 - d) * 2)) return 'asfalto_claro';
  }
  // losas más gastadas, un poco más oscuras
  if (t < 0.18 && bayer(x, y) < 0.25) return 'asfalto_claro';
  if (grain(x, y, s + 23) < 0.012) return 'asfalto_claro';
  return 'cemento';
}

/** Los charquitos de la azotea: unos pocos óvalos repartidos por la franja (por semilla). */
const CHARCOS = new Map<number, { x: number; y: number; rx: number; ry: number }[]>();
function charcosDe(s: number) {
  let c = CHARCOS.get(s);
  if (!c) {
    const R = rng(s + 25);
    c = Array.from({ length: 14 }, () => ({ x: Math.floor(R() * 680), y: 8 + Math.floor(R() * 84), rx: 10 + Math.floor(R() * 22), ry: 3 + Math.floor(R() * 4) }));
    CHARCOS.set(s, c);
  }
  return c;
}

/** La fachada del edificio debajo del borde de adelante: el remate y las ventanas de los pisos de abajo. */
export function orillaTorre(x: number, r: number, s: number): Color {
  if (r === 0) return 'asfalto';
  if (r < 4) return r === 1 ? 'cemento_claro' : 'cemento';
  if (r === 4) return 'sombra';
  // la fachada en sombra y, más abajo, las ventanas del último piso
  const v = (x % 16 > 3 && x % 16 < 12) && r > 17 && (r - 18) % 12 < 7;
  if (v) return grain(x / 16 | 0, (r / 12) | 0, s) < 0.55 ? 'oro' : 'tinta';
  return grain(x >> 1, r, s + 3) < 0.04 ? 'asfalto' : 'asfalto_claro';
}

/** La franja amarilla y negra del borde sin baranda, pintada en el piso (antes de inclinarlo), de `ancho` px. */
export function franjaBorde(P: Lienzo, x: number, D: number, ancho = 10) {
  for (let y = 0; y < D; y++) for (let i = 0; i < ancho; i++) P.p(x - ancho + i, y, i === ancho - 1 ? 'luz' : ((x - ancho + i + y) >> 2) % 2 ? 'amarillo' : 'tinta');
}

/**
 * El borde del edificio (un vacío que llega al final del mundo), sobre el piso ya inclinado: de ahí para allá solo
 * se ve la ciudad muy abajo, con sus calles encendidas.
 */
export function bordeAlVacio(P: Lienzo, x0: number, D: number, k: number, s: number) {
  for (let y = 0; y < P.h; y++) {
    const c0 = x0 + Math.round(k * Math.min(y, D));
    for (let c = c0; c < P.w; c++) P.p(c, y, c - c0 < 2 ? (y < D ? 'cemento' : 'asfalto') : vacioEn(c, y, s));
  }
}

/** La ciudad allá abajo, vista desde el borde: manzanas oscuras, calles encendidas y lucecitas. Se repite cada 64 x 64. */
export function vacioEn(c: number, y: number, s: number): Color {
  const X = ((c % 64) + 64) % 64, Y = ((y % 64) + 64) % 64;
  // las avenidas en diagonal, con los faroles, y unas ventanitas sueltas en las manzanas
  if ((X + Y * 2) % 32 === 0 || (X - Y + 64) % 64 === 0) return grain(X >> 1, Y, s) < 0.3 ? 'oro' : 'asfalto';
  if (grain(X >> 1, Y >> 1, s + 1) < 0.03) return grain(X, Y, s + 2) < 0.6 ? 'ocre' : 'amarillo';
  return bayer(X, Y) < 0.3 ? 'sombra' : 'tinta';
}

/** La textura del vacío para el juego: 64 x 64, se repite (para pintar lo que se cae cuando el borde avanza). */
export function vacioTextura(pal: Paleta, s: number): Lienzo {
  const L = new Lienzo(64, 64, pal);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) L.p(x, y, vacioEn(x, y, s));
  return L;
}

/**
 * El filo que se desmorona, para cuando el borde avanza: 6 cuadros del canto con la franja amarilla y negra, de la
 * fila de atrás hasta abajo de la pantalla, en la vista inclinada. En el 0 está entero; del 1 al 5 se le caen pedazos
 * de concreto con su polvo. Lo de la derecha del canto va transparente: ahí el juego pone el vacío. El ancla (0, 0) va
 * en (x del borde - 10, franja.atras).
 */
export function filoDesmorona(pal: Paleta, D: number, alto: number, k: number, s: number): Lienzo[] {
  const ext = Math.round(k * D), W = 10 + ext + 40, R = rng(s + 41);
  const trozos = Array.from({ length: 7 }, (_, i) => ({ y: Math.floor(((i + R() * 0.8) / 7) * (D - 8)), w: 6 + Math.floor(R() * 5), h: 5 + Math.floor(R() * 4), vx: 2 + R() * 3, vy: 2 + R() * 4, t0: Math.floor(R() * 3) }));
  return [0, 1, 2, 3, 4, 5].map((f) => {
    const L = new Lienzo(W, alto, pal);
    for (let y = 0; y < alto; y++) {
      const sy = Math.round(k * Math.min(y, D));
      for (let i = 0; i < 10; i++) {
        // lo que se cayó: muescas en el canto que crecen cuadro a cuadro
        const roto = trozos.some((t) => f > t.t0 && y >= t.y && y < t.y + t.h && i >= 10 - Math.min(t.w, 2 + (f - t.t0) * 2));
        if (roto) continue;
        L.p(sy + i, y, y >= D ? (i === 9 ? 'asfalto' : 'sombra') : i === 9 ? 'luz' : ((sy + i + y) >> 2) % 2 ? 'amarillo' : 'tinta');
      }
      if (y < D) L.p(sy + 10, y, 'cemento');
    }
    // los pedazos que caen hacia el vacío y el polvo
    for (const t of trozos) {
      if (f <= t.t0) continue;
      // el pedazo: concreto con su franja arriba, que se aleja, cae y se achica (se va lejos, hacia abajo)
      const d = f - t.t0, x = Math.round(k * t.y) + 8 + Math.round(t.vx * d), y = t.y + Math.round(t.vy * d + d * d * 1.5);
      const pw = Math.max(2, t.w - d), ph = Math.max(2, t.h - d);
      if (y + ph >= alto) continue;
      L.f(x, y, pw, ph, 'cemento'); L.vl(x, y, ph, 'cemento_claro'); L.hl(x, y + ph - 1, pw, 'asfalto');
      for (let i = 0; i < pw; i++) L.p(x + i, y, ((x + i) >> 1) % 2 ? 'amarillo' : 'tinta');
      // la nube de polvo donde se soltó
      for (let n = 0; n < 10; n++) { const px = Math.round(k * t.y) + 6 + Math.floor(R() * 10), py = t.y - 3 + Math.floor(R() * 8); if (d < 3 && bayer(px, py) < 0.5) L.p(px, py, d === 1 ? 'crema' : 'cemento_claro'); }
    }
    return L;
  });
}

/** Los colores de luz que se reflejan en el piso mojado, y en qué se convierten. */
const REFLEJA: Partial<Record<Color, [Color, Color]>> = { salmon: ['salmon', 'canal'], menta: ['menta', 'celeste'], amarillo: ['oro', 'ocre'], luz: ['crema', 'cemento_claro'] };

/**
 * El reflejo de los neones y los bombillos en el piso mojado (de noche): debajo de cada columna con luz, rayas verticales
 * del color de esa luz, cortadas y cada vez más débiles hacia adelante. Sobre el piso ya inclinado.
 */
export function reflejoNeon(P: Lienzo, C: Lienzo, D: number, s: number, hueco: (sx: number, y: number) => boolean) {
  const W = Math.min(P.w, C.w);
  for (let sx = 0; sx < W; sx++) {
    // cuenta las luces de esa franja de columnas, en lo alto (los neones) y en la pared (los bombillos)
    // en cuántas filas aparece cada luz: un neón con su halo ocupa muchas, una camisa turquesa pocas
    const cuenta = new Map<Color, number>();
    for (let y = 60; y < C.h - 20; y++) {
      const vistos = new Set<Color>();
      for (let dx = -2; dx <= 2; dx++) {
        const i = ((y * C.w) + sx + dx) * 4, d = C.r.data;
        if (sx + dx < 0 || sx + dx >= C.w || !d[i + 3]) continue;
        const hx = '#' + [d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');
        for (const c of Object.keys(REFLEJA) as Color[]) if (C.pal[c].toLowerCase() === hx) vistos.add(c);
      }
      for (const c of vistos) cuenta.set(c, (cuenta.get(c) ?? 0) + 1);
    }
    const [mejor, n] = [...cuenta].filter(([c]) => c === 'salmon' || c === 'menta').sort((a, b) => b[1] - a[1])[0] ?? [undefined, 0];
    if (!mejor || n < 24) continue;
    const fuerza = Math.min(1, n / 50), [fuerte, debil] = REFLEJA[mejor]!;
    // rayas de largo distinto: cada 4 columnas una fuerte, en medio una débil y más corta, y entre ellas el violeta suelto
    const tipo = sx % 4, azar = grain(sx, 0, s + 33);
    const largo = (D + 8) * fuerza * (tipo === 0 ? 0.55 + 0.45 * azar : tipo === 2 ? 0.3 + 0.4 * azar : 0.5);
    for (let y = 2; y < largo; y++) {
      if (hueco(sx, y) || y >= P.h) continue;
      // el agua tiembla: la raya se corta en bandas, más seguido hacia la punta
      const t = y / largo, charco = nombreEn(P, sx, y) === 'asfalto_claro';
      // en los charquitos el reflejo sale entero
      if (!charco && grain(sx >> 1, y >> 1, s + 31) < 0.15 + t * 0.45) continue;
      if (charco && tipo !== 0) P.p(sx, y, bayer(sx, y) < 0.5 ? debil : fuerte);
      else if (tipo === 0) P.p(sx, y, t < 0.45 || charco ? fuerte : debil);
      else if (tipo === 2) P.p(sx, y, debil);
      else if (bayer(sx, y) < 0.35 * (1 - t)) P.p(sx, y, mejor === 'salmon' ? 'canal' : debil);
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Las piezas y la vida

/** La antena de telecomunicaciones: torre de celosía con los paneles, una parabólica y la luz roja arriba. */
export function antenaTelecom(pal: Paleta, alto: number): Pieza {
  const w = 30, P = nueva(pal, w, 0, alto + 6), L = P.img, cx = 15, base = alto + 5;
  for (let y = 4; y < base; y++) {
    const t = (y - 4) / (base - 4), hw = Math.round(2 + t * 3);
    L.p(cx - hw, y, 'cemento_claro'); L.p(cx + hw, y, 'asfalto_claro');
    // la celosía en zigzag
    const z = (y % 8) / 8, xz = Math.round(cx - hw + z * hw * 2);
    L.p(xz, y, 'cemento'); L.p(cx * 2 - xz, y, 'asfalto');
  }
  L.f(cx - 6, base - 2, 13, 3, 'cemento'); L.hl(cx - 6, base - 2, 13, 'cemento_claro');
  // los paneles arriba y la parabólica en el medio
  for (const [dx, y] of [[-6, 12], [5, 12], [-6, 26], [5, 26]]) { L.f(cx + dx, y, 3, 10, 'cemento_claro'); L.vl(cx + dx + 2, y, 10, 'cemento'); }
  const py = Math.floor(alto * 0.55); L.d(cx + 7, py, 5, 'cemento_claro'); L.d(cx + 8, py, 3, 'crema'); L.ln(cx + 2, py + 1, cx + 5, py, 'asfalto_claro');
  // la luz roja
  L.vl(cx, 0, 4, 'asfalto_claro'); L.f(cx - 1, 0, 3, 2, 'rojo'); L.p(cx, 0, 'luz');
  return P;
}

/** Los neones en la vida: encendido, encendido, parpadeo y encendido. Cuadros del tamaño de la caja con sus patas. */
export function neonVida(pal: Paleta, n: 'arepera' | 'caracas'): Lienzo[] {
  const N = NEONES_CCS[n];
  return [false, false, true, false].map((ap) => { const L = new Lienzo(N.w, CASETA.techo - N.y, pal); neon(L, n, 0, 0, ap); return L; });
}

/** La luz roja de la punta de una torre: prendida y apagada. */
export function luzRoja(pal: Paleta): Lienzo[] {
  return [true, false].map((on) => { const L = new Lienzo(5, 5, pal); if (on) { L.f(1, 1, 3, 3, 'rojo'); L.p(2, 2, 'luz'); L.p(2, 0, 'rojo'); L.p(0, 2, 'rojo'); L.p(4, 2, 'rojo'); L.p(2, 4, 'rojo'); } else { L.f(1, 1, 3, 3, 'vino'); } return L; });
}

/** El público que se mueve: dos cuadros (brazos arriba y abajo cambian de gente). */
export function publicoVida(pal: Paleta, a: { x: number; w: number; techo: number }, seed: number): Lienzo[] {
  // el cuadro va de 24 filas sobre el techo hasta su murito: se pone en (a.x - 4, a.techo - 24)
  return [0, 1].map((f) => { const L = new Lienzo(a.w + 8, 34, pal); publico(L, 4, a.w, 24, seed, f); return L; });
}

/** El avioncito que cruza alto: el cuerpo y las luces de las alas que parpadean. */
export function avion(pal: Paleta): Lienzo[] {
  return [0, 1].map((f) => { const L = new Lienzo(9, 4, pal); L.hl(1, 2, 7, 'cemento'); L.p(2, 1, 'cemento'); L.p(6, 1, 'asfalto_claro'); L.p(0, 2, f ? 'rojo' : 'vino'); L.p(8, 2, f ? 'luz' : 'cemento'); return L; });
}

/**
 * El helicóptero con el reflector: el cuerpo, el rotor que gira y el haz de luz que barre hacia abajo a la izquierda.
 * 4 cuadros; el haz va de la nariz hacia abajo y se abre.
 */
export function helicoptero(pal: Paleta): Lienzo[] {
  const W = 104, H = 96, hx = 82, hy = 6;
  return [0, 1, 2, 3].map((f) => {
    const L = new Lienzo(W, H, pal);
    // el haz: un cono tramado que barre de un lado a otro
    const ang = 2.1 + Math.sin((f / 4) * Math.PI * 2) * 0.12;
    for (let y = hy + 6; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = x - (hx - 1), dy = y - (hy + 6), r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      const ab = 0.1 + r * 0.0035;
      if (Math.abs(a - ang) > ab || r > 100) continue;
      const t = r / 100, centro = Math.abs(a - ang) < ab * 0.4;
      if (bayer(x, y) < (1 - t * 0.8) * (centro ? 0.75 : 0.42)) L.p(x, y, centro && t < 0.4 ? 'luz' : t < 0.6 ? 'celeste' : 'cielo');
    }
    // el cuerpo, la cola y los patines
    L.f(hx - 2, hy + 1, 12, 6, 'asfalto'); L.hl(hx - 1, hy + 1, 10, 'asfalto_claro'); L.f(hx - 2, hy + 2, 4, 3, 'celeste');
    L.hl(hx + 10, hy + 3, 10, 'asfalto'); L.vl(hx + 19, hy, 4, 'asfalto');
    L.hl(hx - 2, hy + 8, 12, 'sombra'); L.p(hx, hy + 7, 'sombra'); L.p(hx + 7, hy + 7, 'sombra');
    L.p(hx - 2, hy + 4, 'luz'); L.p(hx + 19, hy, f % 2 ? 'rojo' : 'vino');
    // el rotor: largo o corto, según el cuadro
    L.vl(hx + 4, hy - 1, 2, 'sombra');
    if (f % 2) L.hl(hx - 9, hy - 1, 26, 'cemento'); else L.hl(hx - 2, hy - 1, 12, 'cemento_claro');
    return L;
  });
}

/** El tráfico allá abajo, más allá del borde: lucecitas que corren por la calle en diagonal. 4 cuadros. */
export function trafico(pal: Paleta, w: number, h: number): Lienzo[] {
  return [0, 1, 2, 3].map((f) => {
    const L = new Lienzo(w, h, pal);
    for (let k = 0; k < 6; k++) {
      const t = ((k / 6 + f / 24) % 1), y = Math.round(t * (h - 4)) + 2, x = Math.round(w * 0.2 + t * w * 0.5);
      L.p(x, y, k % 2 ? 'luz' : 'rojo'); L.p(x + 1, y, k % 2 ? 'amarillo' : 'vino');
    }
    return L;
  });
}

/** Las piezas de Caracas. null si el tipo no es de aquí. */
export function posteVenezuela(pal: Paleta, tipo: string | undefined, alto: number): { pieza: Pieza; cx: number } | null {
  if (tipo === 'antena') return { pieza: antenaTelecom(pal, alto), cx: 15 };
  return null;
}
