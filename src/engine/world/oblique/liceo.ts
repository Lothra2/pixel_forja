import { rng, grain, bayer } from '../../fx/pix';
import { Lienzo } from './lienzo';
import type { Color, Paleta } from './paleta';
import type { CtxCerca } from './fachadas';
import type { ObliqueLayout } from './layout';
import type { Luz, Particula, VidaEscena } from './escena';
import type { Lugar } from './lugares';
import { recorte, textoGrande, anchoTexto, personita, sentadita } from './pinceles';

/**
 * El patio techado de un liceo de Caracas al mediodía (estilo `venezuela_liceo`), en la vista inclinada de la pelea, para
 * el Quemado Nekketsu. Arriba, el techo de láminas con las cerchas azules y las lámparas. Por la abertura entre el techo y
 * el edificio se asoma El Ávila. Atrás, el edificio de las aulas con las ventanas de romanilla, la franja azul, el letrero
 * U.E. LICEO EL ÁVILA, la bandera, la cartelera y el mural; a la izquierda las gradas con los liceístas y a la derecha la
 * cantina. El piso es la cancha pintada con las rayas del quemado donde las pintaba Quemado.ts.
 */

export const CERCA_LICEO = 'patio_liceo_caracas';
/** La franja de Quemado.ts: FT 214 y PROF 100 (filas 214 a 314), con la inclinación de 0.35 de la pelea. */
const FT = 214;
/**
 * La cancha de Quemado.ts, en x e y de mundo (sin inclinar): de x 40 a 560 entre y 0 y 100, la raya del medio en x 300
 * con el círculo de 16 x 10, y los dos cementerios rayados de x 4 a 34 y de 566 a 596.
 */
export const CANCHA = { x0: 40, x1: 560, medio: 300, prof: 100, circulo: [16, 10] as const, cementerios: [[4, 34], [566, 596]] as const };
/** Las filas del techo, de la abertura donde se ve El Ávila y del edificio. */
export const TECHO = { alto: 40, abertura: 62 };
/** Los dos letreros que ponía Quemado.ts: el del liceo y el de la cantina, centrados en esos puntos. */
export const LETREROS = { liceo: { x: 270, y: 75, texto: 'U.E. LICEO EL ÁVILA' }, cantina: { x: 595, y: 113, texto: 'CANTINA' } };
/** Las gradas de la izquierda y la cantina de la derecha. */
export const GRADAS = { x0: 0, x1: 120, piso: 208 };
export const CANTINA = { x0: 548, x1: 640, piso: 208 };
/** Los pilares que sostienen el techo. */
export const PILARES = [22, 436, 626];

// ---------------------------------------------------------------------------------------------------------------------
// Lo lejos: El Ávila que se asoma

const onda = (x: number, w: number, vueltas: number, fase: number) => Math.sin((x / w) * Math.PI * 2 * vueltas + fase);

/** El Ávila al mediodía, alto en la capa lejos: lo que se ve por la abertura entre el techo y el edificio. */
export function avilaMediodia(pal: Paleta, w: number, h: number, seed: number): Lienzo {
  const L = new Lienzo(w, h, pal);
  const lomo = (x: number) => Math.round(26 + onda(x, w, 1, 2.2) * 6 + onda(x, w, 4, 0.7) * 4 + onda(x, w, 11, 1.4) * 2);
  for (let x = 0; x < w; x++) {
    const a = lomo(x);
    for (let y = a; y < h; y++) {
      const t = (y - a) / 30;
      let c: Color = y === a ? 'menta' : bayer(x, y) < 0.4 ? 'verde_oscuro' : 'verde';
      if (Math.abs(((x + y * 0.5) % 70) - 35) < 1.5 && y > a + 4) c = 'verde_oscuro';
      if (t > 0.6 && bayer(x, y) < (t - 0.6)) c = 'canal';
      if (t > 1.2) c = bayer(x, y) < 0.5 ? 'canal' : 'bruma';
      L.p(x, y, c);
    }
  }
  void seed;
  return L;
}

// ---------------------------------------------------------------------------------------------------------------------
// La capa cerca: el patio

/** El techo de láminas visto por debajo, con las cerchas azules en triángulos, los tubos y las lámparas. */
function techo(C: Lienzo, f: number) {
  const W = C.w, { alto } = TECHO;
  for (let y = 0; y < alto; y++) for (let x = 0; x < W; x++) C.p(x, y, y === alto - 1 ? 'sombra' : (x + (y >> 2)) % 6 === 0 ? 'asfalto' : y < alto / 2 ? 'asfalto_claro' : 'asfalto');
  // las cerchas: el cordón de abajo y las diagonales en zigzag
  for (let x = 0; x < W; x++) { C.p(x, alto - 6, 'azul'); C.p(x, alto - 5, 'azul_noche'); C.p(x, 4, 'azul'); }
  for (let x = 0; x < W; x += 24) { C.ln(x, alto - 6, x + 12, 5, 'azul'); C.ln(x + 12, 5, x + 24, alto - 6, 'azul'); }
  // las lámparas colgadas: el tubo fluorescente con su pantalla
  for (const lx of [100, 260, 420, 560]) { C.vl(lx + 8, alto - 5, 4, 'sombra'); C.f(lx, alto - 1, 18, 3, 'asfalto_claro'); C.hl(lx + 1, alto + 1, 16, f % 4 === 3 && lx === 420 ? 'cemento' : 'luz'); }
  // el borde del techo con la canal y la abertura donde se ve El Ávila (queda transparente)
  C.hl(0, alto, W, 'cemento'); C.hl(0, alto + 1, W, 'asfalto_claro');
}

/** Una ventana de romanilla (las persianas de vidrio) con su reja. */
function romanilla(C: Lienzo, x: number, y: number, w: number, h: number) {
  C.box(x, y, w, h, 'cemento_claro', 'cemento');
  for (let j = y + 2; j < y + h - 1; j += 3) { C.hl(x + 1, j, w - 2, 'celeste'); C.hl(x + 1, j + 1, w - 2, 'azul_noche'); }
  for (let i = x + 4; i < x + w - 1; i += 4) C.vl(i, y + 1, h - 2, 'sombra');
}

/** El edificio de las aulas: dos pisos crema con la franja azul, las romanillas, las puertas de madera y el pasillo de arriba con su baranda. */
function edificio(C: Lienzo, seed: number) {
  const W = C.w, top = TECHO.abertura, base = 192;
  for (let y = top; y < base; y++) for (let x = 0; x < W; x++) C.p(x, y, grain(x >> 2, y >> 2, seed) < 0.04 ? 'cemento_claro' : 'crema');
  // el remate de arriba y la franja azul entre los pisos
  C.f(0, top, W, 4, 'cemento_claro'); C.hl(0, top + 4, W, 'cemento');
  C.f(0, 126, W, 6, 'azul'); C.hl(0, 126, W, 'celeste'); C.hl(0, 131, W, 'azul_noche');
  // las ventanas de arriba y las de abajo con las puertas de las aulas
  for (let x = 14; x < W - 20; x += 46) {
    if (Math.abs(x + 15 - LETREROS.liceo.x) < 120 && x < 420) { romanilla(C, x, 100, 30, 20); }
    else romanilla(C, x, 86, 30, 32);
    if ((x / 46) % 3 === 1) { C.f(x + 6, 150, 18, 40, 'ocre'); C.vl(x + 14, 150, 40, 'terracota'); C.p(x + 20, 170, 'oro'); C.f(x + 4, 146, 22, 4, 'cemento_claro'); textoGrande(C, x + 9, 138, `${5 + Math.round(x / 46)}A`, 'azul', 1); }
    else romanilla(C, x, 146, 30, 26);
  }
  // el zócalo de abajo
  C.f(0, base - 10, W, 10, 'cemento'); C.hl(0, base - 10, W, 'cemento_claro');
  // el piso del pasillo detrás de la cancha, en concreto
  for (let y = base; y < FT; y++) for (let x = 0; x < W; x++) C.p(x, y, y === base ? 'sombra' : (x + y) % 23 === 0 ? 'cemento' : 'cemento_claro');
}

/** El letrero del liceo pintado en la pared, con el escudo, y el mural con los colores de la bandera. */
function letreroLiceo(C: Lienzo) {
  const { x, y, texto } = LETREROS.liceo, w = anchoTexto(texto) + 16;
  C.box(x - Math.round(w / 2), y - 10, w, 22, 'luz', 'azul');
  textoGrande(C, x - Math.round(w / 2) + 8, y - 7, texto, 'azul', 2, 'cemento_claro');
  // el escudo a los lados: el óvalo con los tres colores
  for (const sx of [x - Math.round(w / 2) - 14, x + Math.round(w / 2) + 4]) { C.f(sx, y - 8, 10, 6, 'amarillo'); C.f(sx, y - 2, 10, 5, 'azul'); C.f(sx, y + 3, 10, 5, 'rojo'); C.box(sx - 1, y - 9, 12, 18, 'oro', 'oro'); C.f(sx, y - 8, 10, 6, 'amarillo'); C.f(sx, y - 2, 10, 5, 'azul'); C.f(sx, y + 3, 10, 5, 'rojo'); }
}

/** La bandera de Venezuela en su asta, con las ocho estrellas. `f` la mece. */
function bandera(C: Lienzo, x: number, piso: number, f: number) {
  C.vl(x, piso - 96, 96, 'cemento_claro'); C.vl(x + 1, piso - 96, 96, 'cemento'); C.p(x, piso - 97, 'oro');
  const top = piso - 94;
  for (let j = 0; j < 15; j++) for (let i = 0; i < 24; i++) { const d = f ? Math.round(Math.sin(i / 4)) : Math.round(i / 10); C.p(x + 2 + i, top + j + d, j < 5 ? 'amarillo' : j < 10 ? 'azul' : 'rojo'); }
  for (const i of [6, 9, 12, 15, 18]) C.p(x + 2 + i, top + 6 + (f ? Math.round(Math.sin(i / 4)) : Math.round(i / 10)) + (i === 12 ? 0 : 1), 'luz');
}

/** La cartelera de corcho con los papelitos y el reloj de pared. */
function cartelera(C: Lienzo) {
  C.box(452, 140, 44, 30, 'ocre', 'terracota');
  const R = rng(7);
  for (let k = 0; k < 9; k++) C.f(455 + Math.floor(R() * 36), 143 + Math.floor(R() * 22), 6, 4, (['luz', 'amarillo', 'celeste', 'salmon'] as Color[])[k % 4]);
  textoGrande(C, 456, 133, 'CARTELERA', 'azul', 1);
  C.d(420, 108, 6, 'luz'); C.d(420, 108, 6, 'sombra', 1); C.ln(420, 108, 420, 104, 'tinta'); C.ln(420, 108, 423, 108, 'tinta');
}

/** Las gradas de concreto a la izquierda, llenas de liceístas con la camisa beige y el pantalón azul. `f` los pone a brincar. */
function gradas(C: Lienzo, f: number) {
  const { x0, x1, piso } = GRADAS;
  for (let k = 0; k < 4; k++) {
    const y = piso - k * 12;
    for (let x = x0; x < x1 - k * 14; x++) { C.p(x, y - 12, 'cemento_claro'); C.f(x, y - 11, 1, 11, 'cemento'); C.p(x, y - 1, 'asfalto_claro'); }
  }
  const R = rng(5);
  for (let k = 0; k < 4; k++) for (let x = x0 + 4; x < x1 - k * 14 - 8; x += 13) {
    const camisa: Color = R() < 0.7 ? 'crema' : R() < 0.5 ? 'celeste' : 'luz', arriba = (x + k + f) % 3 === 0;
    sentadita(C, x + (k & 1) * 4, piso - k * 12 - 12, { ropa: camisa, pant: 'azul', pelo: R() < 0.4 ? 'terracota' : 'tinta', piel: R() < 0.5 ? 'salmon' : 'terracota', alto: 16 }, arriba && f % 2 === 1);
  }
}

/** La cantina: el kiosco con la reja, el mostrador, las empanadas y el jugo, la señora que vende y la cola. `f` mueve a la señora. */
function cantina(C: Lienzo, f: number) {
  const { x0, x1, piso } = CANTINA, w = x1 - x0;
  C.f(x0, piso - 86, w, 86, 'crema'); C.vl(x0, piso - 86, 86, 'cemento_claro');
  C.f(x0 + 6, piso - 72, w - 6, 40, 'sombra');
  for (let i = x0 + 6; i < x1; i += 4) C.vl(i, piso - 72, 40, 'asfalto');
  C.f(x0 + 4, piso - 34, w - 4, 6, 'rojo'); C.hl(x0 + 4, piso - 34, w - 4, 'salmon'); C.f(x0 + 4, piso - 28, w - 4, 28, 'cemento');
  // el letrero de la cantina, rojo con letras blancas
  const { x, y, texto } = LETREROS.cantina, tw = anchoTexto(texto) + 10;
  C.box(x - Math.round(tw / 2), y - 9, tw, 18, 'rojo', 'vino');
  textoGrande(C, x - Math.round(tw / 2) + 5, y - 7, texto, 'luz', 2, 'vino');
  // la señora que vende, las empanadas y el jugo en el mostrador
  C.f(x0 + 30, piso - 54, 12, 20, 'luz'); C.f(x0 + 32, piso - 62, 8, 8, 'salmon'); C.hl(x0 + 31, piso - 63, 10, 'tinta');
  if (f % 2) { C.vl(x0 + 28, piso - 60, 8, 'luz'); C.f(x0 + 25, piso - 64, 5, 3, 'oro'); }
  for (let i = 0; i < 4; i++) C.f(x0 + 12 + i * 7, piso - 37, 5, 3, 'oro');
  C.f(x0 + 56, piso - 42, 4, 8, 'amarillo'); C.f(x0 + 62, piso - 42, 4, 8, 'vino');
  // la cola de los liceístas
  for (let k = 0; k < 3; k++) personita(C, x0 - 12 - k * 12, piso, { ropa: k === 1 ? 'celeste' : 'crema', pant: 'azul', pelo: 'tinta', piel: k ? 'salmon' : 'terracota', alto: 26, pose: (k + f) % 4 === 0 ? 1 : 0 });
}

/** Los pilares de concreto que sostienen el techo. */
function pilares(C: Lienzo) {
  for (const px of PILARES) { C.f(px - 4, TECHO.alto, 8, FT - TECHO.alto, 'cemento'); C.vl(px - 4, TECHO.alto, FT - TECHO.alto, 'cemento_claro'); C.vl(px + 3, TECHO.alto, FT - TECHO.alto, 'asfalto_claro'); C.f(px - 6, TECHO.alto, 12, 4, 'cemento_claro'); }
}

export interface CuadroLiceo { f?: number }

/** El patio completo sobre la capa cerca (alto franja.atras). `q.f` mueve la gente, la bandera y la lámpara. */
export function pintarLiceo(C: Lienzo, seed: number, q: CuadroLiceo = {}) {
  const f = q.f ?? 0;
  edificio(C, seed);
  letreroLiceo(C);
  cartelera(C);
  // un mural: la mano con el lápiz y "ESTUDIAR ES CRECER"
  C.box(330, 140, 90, 34, 'celeste', 'azul'); textoGrande(C, 336, 146, 'ESTUDIAR', 'luz', 1); textoGrande(C, 336, 158, 'ES CRECER', 'amarillo', 1);
  C.f(394, 150, 14, 10, 'salmon'); C.ln(404, 150, 412, 140, 'amarillo'); C.p(412, 140, 'tinta');
  // el bebedero
  C.f(510, 176, 16, 16, 'cemento_claro'); C.hl(510, 176, 16, 'luz'); C.vl(517, 172, 4, 'asfalto_claro');
  bandera(C, 140, 190, f);
  techo(C, f);
  pilares(C);
  gradas(C, f);
  cantina(C, f);
}

export const fondoLiceo = (C: Lienzo, _x0: number, _x1: number, _base: number, ctx: CtxCerca) => pintarLiceo(C, ctx.seed);

// ---------------------------------------------------------------------------------------------------------------------
// El piso: la cancha con las rayas del quemado

/** El concreto del patio afuera de la cancha y la cancha pintada de verde adentro (gastada), sin inclinar. */
export function pisoLiceo(x: number, y: number, s: number): Color {
  const { x0, x1, prof } = CANCHA, dentro = x >= x0 && x <= x1 && y >= 0 && y < prof;
  const n = grain(x, y, s);
  if (dentro) return n < 0.04 ? 'verde_oscuro' : grain(x >> 3, y >> 2, s + 1) < 0.1 ? 'menta' : 'verde';
  return n < 0.05 ? 'cemento' : (x + y) % 29 === 0 ? 'cemento' : 'cemento_claro';
}

/** Las rayas del quemado donde las pintaba Quemado.ts: el borde blanco, la raya amarilla del medio, el círculo y los cementerios rayados. */
export function rayasLiceo(P: Lienzo, _L: ObliqueLayout, seed: number) {
  const { x0, x1, medio, prof, circulo, cementerios } = CANCHA, gasta = (x: number, y: number) => grain(x >> 1, y, seed + 7) < 0.08;
  const raya = (x: number, y: number, c: Color) => { if (x >= 0 && y >= 0 && x < P.w && y < prof && !gasta(x, y)) P.p(x, y, c); };
  const gruesa = (x: number, y: number, c: Color) => { raya(x, y, c); raya(x + 1, y, c); };
  // el borde de la cancha
  for (let x = x0; x <= x1; x++) { raya(x, 0, 'luz'); raya(x, 1, 'luz'); raya(x, prof - 1, 'luz'); raya(x, prof - 2, 'luz'); }
  for (let y = 0; y < prof; y++) { gruesa(x0, y, 'luz'); gruesa(x1 - 1, y, 'luz'); gruesa(medio - 1, y, 'amarillo'); }
  for (let a = 0; a < Math.PI * 2; a += 0.015) gruesa(Math.round(medio + Math.cos(a) * circulo[0]), Math.round(prof / 2 + Math.sin(a) * circulo[1]), 'amarillo');
  // los cementerios: tres lados y las rayas en diagonal
  for (const [a, b] of cementerios) {
    for (let x = a; x <= b; x++) { raya(x, 0, 'crema'); raya(x, prof - 1, 'crema'); }
    for (let y = 0; y < prof; y++) raya(a, y, 'crema');
    for (let y = 10; y < prof; y += 14) for (let i = 0; i <= b - a; i++) raya(a + i, Math.round(y - (8 * i) / (b - a)), 'crema');
  }
}

/** Lo de abajo de la franja: el borde del patio y el concreto de adelante con su junta. */
export function orillaLiceo(x: number, r: number, s: number): Color {
  if (r === 0) return 'cemento';
  if (r === 1) return 'asfalto_claro';
  return (x + r * 2) % 37 === 0 ? 'cemento' : grain(x, r, s) < 0.04 ? 'cemento' : 'cemento_claro';
}

// ---------------------------------------------------------------------------------------------------------------------
// Vida, luces y partículas

export function vidaLiceo(pal: Paleta, L: ObliqueLayout, _k: number, seed: number, capas: { cerca: Lienzo; piso: Lienzo }): VidaEscena[] {
  const out: VidaEscena[] = [], quiere = (t: string) => L.vida.includes(t), W = capas.cerca.w, H = capas.cerca.h;
  const cs = [0, 1].map((f) => { const c = new Lienzo(W, H, pal); pintarLiceo(c, seed, { f }); return c; });
  const pieza = (id: string, x: number, y: number, w: number, h: number, fps: number) => out.push({ id, tipo: id, capa: 'cerca', x, y, cuadros: cs.map((c) => recorte(c, x, y, w, h)), fps });
  if (quiere('publico')) pieza('publico', GRADAS.x0, GRADAS.piso - 70, GRADAS.x1, 70, 1.5);
  if (quiere('cantina')) pieza('cantina', CANTINA.x0 - 50, CANTINA.piso - 66, 100, 66, 1);
  if (quiere('bandera')) pieza('bandera', 140, 190 - 98, 30, 22, 2);
  return out;
}

/** Las lámparas del techo, prendidas aunque sea de día (debajo del techo hay sombra). */
export function lucesLiceo(pal: Paleta, _L: ObliqueLayout, _k: number): Luz[] {
  return [100, 260, 420, 560].map((lx) => ({ x: lx + 9, y: TECHO.alto + 2, color: pal.luz, radio: 26, latido: 0, encendida: true, nota: 'el tubo fluorescente del techo', ...(lx === 420 ? { parpadeo: 3.1 } : {}) }));
}

export function particulasLiceo(pal: Paleta, _L: ObliqueLayout, _k: number): Particula[] {
  return [{ tipo: 'polvo', x0: 0, x1: 640, y0: TECHO.abertura, y1: FT, color: [pal.oro, pal.luz], cada: 0.9, vida: 2.5, nota: 'el polvo que flota en la luz que entra de lado' }];
}

export const LICEO: Lugar = {
  estilo: 'venezuela_liceo',
  fondo: fondoLiceo,
  lejos: { avila_mediodia: avilaMediodia },
  pisos: { cancha: (x, y, s) => pisoLiceo(x, y, s) },
  orilla: orillaLiceo,
  marcas: rayasLiceo,
  vida: vidaLiceo,
  luces: lucesLiceo,
  particulas: particulasLiceo,
  techado: true,
};
