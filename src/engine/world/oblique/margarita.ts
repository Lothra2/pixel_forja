import { rng, grain, bayer } from '../../fx/pix';
import { Lienzo } from './lienzo';
import type { Color, Paleta } from './paleta';
import { MAS_OSCURO } from './tonos';
import type { CtxCerca } from './fachadas';
import { MARGEN_CANCHA as OX, type ObliqueLayout } from './layout';
import type { Luz, Particula, VidaEscena } from './escena';
import type { Lugar } from './lugares';
import { recorte, textoGrande, anchoTexto, palmaCoco, sentadita, personita, sombraOval } from './pinceles';

/**
 * Playa El Agua, en la isla de Margarita, al mediodía (estilo `venezuela_playa`), de lado, para el Vóley Playa. Lejos,
 * el mar Caribe que se oscurece hacia el horizonte, el cerro verde de la punta de la playa con sus casitas y un peñero.
 * Cerca, la orilla con las olas que revientan, las palmas de coco, los toldos de colores con su gente y su cava, la
 * churuata de las empanadas con la bandera y el letrero de madera de PLAYA EL AGUA. El piso es la arena, con las cintas
 * de la cancha donde las pone Voley.ts.
 *
 * Mide 800 (lote E4): la cancha va en los 640 del medio, de x 80 a 720, y a cada lado hay 80 de playa. A la izquierda la
 * torre del salvavidas y una palma, a la derecha otro toldo con su gente y otra palma.
 */

export const CERCA_MARGARITA = 'playa_el_agua';
/** La franja del layout: el fondo se para en la fila 290 (franja.atras). */
const FT = 290;
/** Filas de la orilla (de la capa cerca): el agua bajita, donde revienta la ola, la espuma que sube y la arena mojada. */
export const ORILLA_MAR = { agua: 212, rompe: 224, espuma: 230, mojada: 238, seca: 246 };
/** Las palmas de coco: x de la base, alto e inclinación. La red del juego va en x 400: ninguna la toca. */
export const PALMAS: { x: number; alto: number; lado: 1 | -1; base: number }[] = [
  { x: 8, alto: 178, lado: 1, base: 264 },
  { x: OX + 34, alto: 206, lado: 1, base: 262 }, { x: OX + 214, alto: 170, lado: -1, base: 258 }, { x: OX + 492, alto: 194, lado: 1, base: 262 }, { x: OX + 612, alto: 214, lado: -1, base: 266 },
  { x: 788, alto: 186, lado: -1, base: 264 },
];
/** Los toldos: x de la izquierda, ancho y colores de las rayas. El último va en el margen de la derecha. */
export const TOLDOS: { x: number; w: number; a: Color; b: Color }[] = [{ x: OX + 62, w: 46, a: 'rojo', b: 'amarillo' }, { x: OX + 520, w: 46, a: 'azul', b: 'luz' }, { x: 728, w: 46, a: 'verde', b: 'amarillo' }];
/** La torre del salvavidas, en el margen de la izquierda: x de la izquierda. */
export const SALVAVIDAS = { x: 30 };
/** La fila del techo de los toldos. */
const TOLDO_Y = 206;
/** La churuata de las empanadas: de dónde a dónde, la fila del alero y la del mostrador. */
export const CHURUATA = { x0: OX + 360, x1: OX + 462, alero: 196, mostrador: 238 };
/** El letrero de madera de la playa. */
export const LETRERO = { x: OX + 120, y: 214 };
/** Las cintas de la cancha de Voley.ts: de x 114 a 686 en la fila 298 (y 8) y de x 108 a 692 en la 322 (y 32); la red en x 400. */
export const CANCHA = { atras: 8, adelante: 32, x0: OX + 34, x1: OX + 606, abre: 6, red: OX + 320 };

// ---------------------------------------------------------------------------------------------------------------------
// Lo lejos: el mar Caribe y el cerro

/** Fila del horizonte en la capa lejos (la capa va de la fila 90 a la 260 de la pantalla: el horizonte cae en la 186). */
export const HORIZONTE = 96;
/** El cerro de la punta de la playa (x en pixeles de lejos.png): la cima y dónde empieza y termina. */
export const CERRO = { x0: 380, cima: 548, x1: 700, alto: 74 };

/** El alto del cerro en la columna x (0 fuera): una loma con dos jorobas y la ladera que baja al mar. */
function cerroEn(x: number, seed: number): number {
  const { x0, cima, x1, alto } = CERRO;
  if (x <= x0 || x >= x1) return 0;
  const t = x < cima ? (x - x0) / (cima - x0) : (x1 - x) / (x1 - cima);
  const joroba = Math.max(0, 1 - Math.abs(x - (cima - 70)) / 46) * 12;
  return Math.round(Math.pow(Math.sin((t * Math.PI) / 2), 1.6) * alto + joroba + (grain(x >> 2, 0, seed) - 0.5) * 3);
}

/** El morro de la izquierda: una punta de piedra baja que entra al mar, con unas palmas chiquitas. */
function morro(L: Lienzo, seed: number) {
  for (let x = 0; x < 120; x++) {
    const h = Math.round(Math.max(0, 22 * Math.sin(((x + 10) / 130) * Math.PI) - (x > 90 ? (x - 90) * 0.6 : 0)) + grain(x >> 1, 1, seed) * 2);
    for (let j = 0; j < h; j++) {
      const y = HORIZONTE - j;
      L.p(x, y, j === h - 1 ? 'verde' : j > h - 5 ? (bayer(x, y) < 0.5 ? 'verde' : 'verde_oscuro') : grain(x, y, seed + 2) < 0.2 ? 'cemento' : 'verde_oscuro');
    }
  }
  for (const [px, alto] of [[22, 16], [40, 20], [64, 14]] as const) {
    for (let j = 0; j < alto; j++) L.p(px + Math.round(j * 0.15), HORIZONTE - 18 - j, 'asfalto');
    const tx = px + Math.round(alto * 0.15), ty = HORIZONTE - 18 - alto;
    for (const [dx, dy] of [[-4, 1], [-3, 0], [-2, -1], [2, -1], [3, 0], [4, 1], [-5, 2], [5, 2]]) L.p(tx + dx, ty + dy, 'verde_oscuro');
  }
}

/** Un peñero: el bote de pesca de madera, blanco con la franja de color, el motor atrás y el pescador. */
function penero(L: Lienzo, x: number, y: number) {
  for (let i = 0; i < 18; i++) { const sube = i < 3 ? 3 - i : i > 15 ? i - 15 : 0; L.p(x + i, y - sube, 'luz'); L.p(x + i, y + 1, i > 1 && i < 17 ? 'rojo' : 'luz'); L.p(x + i, y + 2, i > 2 && i < 16 ? 'azul' : 'cemento_claro'); }
  L.f(x + 15, y - 3, 2, 3, 'asfalto'); L.p(x + 17, y + 2, 'asfalto');
  L.f(x + 7, y - 5, 2, 4, 'amarillo'); L.p(x + 7, y - 6, 'terracota'); L.p(x + 8, y - 6, 'terracota');
  for (let i = -3; i < 22; i++) if (bayer(x + i, y + 3) < 0.5) L.p(x + i, y + 3, 'cielo');
}

/** Un velero chiquito en el horizonte. */
function velero(L: Lienzo, x: number, y: number) {
  for (let j = 0; j < 7; j++) for (let i = 0; i <= j / 1.6; i++) L.p(x + i, y - 8 + j, 'luz');
  L.vl(x - 1, y - 9, 9, 'asfalto'); L.hl(x - 3, y, 7, 'cemento_claro'); L.hl(x - 2, y + 1, 5, 'azul');
}

/**
 * El mar Caribe al mediodía con el cerro de la punta de Playa El Agua: el horizonte azul hondo, el mar que se aclara
 * hacia la orilla con rayitas de luz, el cerro verde con la piedra y las casitas blancas al pie, el morro de la izquierda,
 * un peñero y un velero. Arriba queda transparente: ahí va el cielo.
 */
export function marCaribe(pal: Paleta, w: number, h: number, seed: number): Lienzo {
  const L = new Lienzo(w, h, pal), R = rng(seed);
  // el mar: del azul hondo del horizonte al azul petróleo y al turquesa de abajo, con tramado entre uno y otro
  for (let y = HORIZONTE; y < h; y++) for (let x = 0; x < w; x++) {
    const t = (y - HORIZONTE) / (h - HORIZONTE);
    let c: Color = t < 0.08 ? 'azul_noche' : t < 0.3 ? (bayer(x, y) < (t - 0.08) / 0.22 ? 'canal' : 'azul') : t < 0.7 ? (bayer(x, y) < (t - 0.3) / 0.4 * 0.7 ? 'menta' : 'canal') : bayer(x, y) < 0.25 ? 'canal' : 'menta';
    if (y === HORIZONTE) c = 'azul_noche';
    L.p(x, y, c);
  }
  // rayitas de luz y de espuma en el agua (más largas y más seguidas hacia adelante)
  for (let k = 0; k < w / 3; k++) {
    const y = HORIZONTE + 3 + Math.floor(Math.pow(R(), 0.8) * (h - HORIZONTE - 4)), x = Math.floor(R() * w), t = (y - HORIZONTE) / (h - HORIZONTE), len = 2 + Math.floor(R() * (3 + t * 8));
    for (let i = 0; i < len; i++) L.p((x + i) % w, y, R() < 0.25 ? 'luz' : t < 0.4 ? 'celeste' : 'cielo');
  }
  // el cerro: la loma verde con la luz de la izquierda (las laderas que miran a la izquierda, claras), los montes en
  // manchones, unas piedras arriba y la calima de la base
  for (let x = 0; x < w; x++) {
    const a = cerroEn(x, seed);
    if (!a) continue;
    const sube = cerroEn(x + 5, seed) - cerroEn(x - 5, seed);
    for (let j = 0; j < a; j++) {
      const y = HORIZONTE - j, borde = a - j;
      let c: Color = sube > 1 ? (bayer(x, y) < 0.15 ? 'verde_oscuro' : 'verde') : sube < -1 ? (bayer(x, y) < 0.2 ? 'verde' : 'verde_oscuro') : bayer(x, y) < 0.5 ? 'verde' : 'verde_oscuro';
      // los montes: manchones redondos más oscuros
      if (grain(x >> 3, (y + (x >> 4)) >> 2, seed + 5) < 0.18 && borde > 3) c = 'verde_oscuro';
      if (borde <= 2) c = sube >= 0 ? 'menta' : 'verde';
      if (j < 14 && bayer(x, y) < (14 - j) / 18) c = 'bruma';
      L.p(x, y, c);
    }
  }
  // unas piedras grises que asoman cerca de la cima
  for (const [px, dy] of [[CERRO.cima - 30, 10], [CERRO.cima + 22, 16], [CERRO.cima - 92, 30]] as const) {
    const top = HORIZONTE - cerroEn(px, seed) + dy;
    for (let j = 0; j < 5; j++) for (let i = -4 + j; i < 5 - j / 2; i++) L.p(px + i, top + j, i < 0 ? 'cemento_claro' : 'cemento');
  }
  // las casitas al pie del cerro, frente al mar: blancas y de colores, con su techo, subiendo un poco por la ladera
  const casas: [number, number, Color][] = [[CERRO.x0 + 52, 0, 'luz'], [CERRO.x0 + 70, 3, 'amarillo'], [CERRO.x0 + 96, 1, 'luz'], [CERRO.x0 + 130, 6, 'salmon'], [CERRO.x0 + 150, 2, 'luz'], [CERRO.x0 + 236, 4, 'luz'], [CERRO.x0 + 262, 1, 'amarillo']];
  for (const [x, sube, c] of casas) {
    const cw = 9 + (x % 4), ch = 6 + (x % 3), y = HORIZONTE - 2 - sube;
    L.f(x, y - ch, cw, ch, c); L.vl(x + cw - 1, y - ch, ch, 'cemento'); L.p(x + 2, y - 3, 'asfalto'); L.p(x + 3, y - 3, 'asfalto'); L.f(x + cw - 4, y - 4, 2, 4, 'terracota');
    for (let j = 0; j < 3; j++) L.hl(x - 1 + j, y - ch - 1 - j, cw + 2 - 2 * j, j ? 'terracota' : 'vino');
  }
  void R;
  morro(L, seed + 7);
  penero(L, 236, HORIZONTE + 22);
  velero(L, 150, HORIZONTE - 1);
  velero(L, 860, HORIZONTE - 1);
  return L;
}

// ---------------------------------------------------------------------------------------------------------------------
// La orilla, los toldos y la churuata

/** La orilla: el agua bajita turquesa, la ola que se levanta y revienta, la espuma que sube por la arena y la arena mojada. `f` corre la ola (la vida). */
function orillaMar(C: Lienzo, f: number, seed: number) {
  const W = C.w, { agua, rompe, espuma, mojada, seca } = ORILLA_MAR;
  // cuánto sube la espuma en cada cuadro: sube, llega arriba y se retira
  const sube = [0, 2, 4, 2][f % 4], cresta = [0, -1, 1, 0][f % 4];
  for (let x = 0; x < W; x++) {
    const ond = Math.round(Math.sin(x / 23 + f * 0.9 + seed) * 1.5 + Math.sin(x / 7 - f) * 0.8);
    for (let y = agua; y < seca + 2; y++) {
      let c: Color;
      if (y < rompe - 4 + cresta + ond) c = bayer(x, y) < 0.2 ? 'canal' : 'menta';
      else if (y < rompe + cresta + ond) {
        // la cara de la ola, más oscura abajo, con la cresta blanca arriba
        const r = y - (rompe - 4 + cresta + ond);
        c = r === 0 ? 'luz' : r === 1 ? (bayer(x, y) < 0.6 ? 'luz' : 'cielo') : bayer(x, y) < 0.5 ? 'canal' : 'menta';
      } else if (y < espuma + ond) c = grain(x >> 1, y + f, seed) < 0.55 ? 'luz' : 'bruma';
      else if (y < mojada + sube + Math.round(ond / 2)) {
        // la espuma que sube por la arena: encaje blanco sobre el agua finita
        const borde = y >= mojada + sube + Math.round(ond / 2) - 1;
        c = borde ? 'luz' : grain(x, y, seed + f) < 0.3 ? 'bruma' : bayer(x, y) < 0.5 ? 'cielo' : 'cemento_claro';
      } else if (y < seca + Math.round(Math.sin(x / 17) * 1.2)) c = grain(x, y, seed + 9) < 0.1 ? 'cemento_claro' : 'cemento';
      else c = bayer(x, y) < 0.5 ? 'cemento_claro' : 'crema';
      C.p(x, y, c);
    }
  }
}

/** La arena seca de atrás, hasta la franja: clara, con las ondas del viento, granitos y huellas. */
function arenaSeca(C: Lienzo, seed: number) {
  const { seca } = ORILLA_MAR;
  for (let y = seca + 2; y < FT; y++) for (let x = 0; x < C.w; x++) C.p(x, y, arena(x, y, seed));
}

/** La arena clara del sol: ondas del viento en tramado, granitos y alguna conchita. */
export function arena(x: number, y: number, s: number): Color {
  const xr = ((x % 960) + 960) % 960;
  const n = grain(xr, y, s);
  if (n < 0.004) return 'salmon';
  if (n > 0.996) return 'luz';
  const onda = (y + Math.round(Math.sin(xr / 11 + y * 0.3) * 1.6)) % 5;
  if (onda === 0 && bayer(xr, y) < 0.55) return 'cemento_claro';
  if (grain(xr >> 3, y >> 2, s + 1) < 0.12 && bayer(xr, y) < 0.3) return 'cemento_claro';
  return grain(xr, y, s + 2) < 0.04 ? 'cemento' : 'crema';
}

/** Un toldo de lona a rayas sobre su palo de madera, con el fleco y la sombra en la arena. `f` lo mece (la vida). */
function toldo(C: Lienzo, t: (typeof TOLDOS)[number], f: number) {
  const { x, w, a, b } = t, cx = x + Math.floor(w / 2), y = TOLDO_Y, piso = 262;
  sombraOval(C, cx + 6, piso - 1, w / 2 + 2, 4, 'cemento', 0.6);
  C.f(cx - 1, y + 4, 2, piso - y - 4, 'terracota'); C.vl(cx - 1, y + 4, piso - y - 4, 'ocre');
  // la lona: un techo a dos aguas visto de lado, con las rayas que bajan y el fleco que se mece
  const mece = f % 2;
  for (let j = 0; j < 9; j++) {
    const hw = Math.round(5 + (j / 8) * (w / 2 - 5));
    for (let i = -hw; i <= hw; i++) {
      const raya = Math.floor((i + hw) / 5) % 2 === 0;
      C.p(cx + i, y - 4 + j, j === 0 ? MAS_OSCURO[a] : raya ? a : b);
    }
  }
  for (let i = -w / 2; i <= w / 2; i++) {
    const raya = Math.floor((i + w / 2) / 5) % 2 === 0, cae = (Math.floor(i) & 1) === 0 ? 2 : 3;
    for (let j = 0; j < cae; j++) C.p(Math.round(cx + i + (j === cae - 1 ? mece : 0)), y + 5 + j, raya ? MAS_OSCURO[a] : MAS_OSCURO[b]);
  }
  C.p(cx, y - 5, 'terracota'); C.p(cx, y - 6, 'ocre');
}

/** La cava (la cava de playa, azul y blanca) y una silla plegable. */
function cava(C: Lienzo, x: number, piso: number) {
  C.f(x, piso - 9, 14, 9, 'azul'); C.f(x, piso - 12, 14, 3, 'luz'); C.hl(x, piso - 12, 14, 'cielo'); C.vl(x + 13, piso - 12, 12, 'azul_noche');
  C.f(x + 4, piso - 14, 6, 2, 'luz'); C.hl(x + 1, piso - 1, 13, 'azul_noche');
}

/** La gente de un toldo: una señora sentada con su sombrero y un señor de pie con la franela, y la cava. */
function genteToldo(C: Lienzo, t: (typeof TOLDOS)[number], i: number, f: number) {
  const piso = 262;
  // la silla plegable de rayas
  const sx = t.x + 6;
  C.ln(sx, piso - 10, sx + 10, piso, 'asfalto_claro'); C.ln(sx + 10, piso - 10, sx, piso, 'asfalto_claro');
  C.f(sx - 1, piso - 11, 12, 2, (['celeste', 'amarillo', 'rojo'] as Color[])[i % 3]);
  sentadita(C, sx + 1, piso - 11, { ropa: (['luz', 'salmon', 'amarillo'] as Color[])[i % 3], pant: (['rojo', 'azul', 'verde'] as Color[])[i % 3], pelo: i === 2 ? 'tinta' : 'sombra', piel: i === 2 ? 'terracota' : 'ocre', sombrero: i === 0 ? 'amarillo' : undefined, alto: 20 }, false);
  cava(C, t.x + 22, piso);
  personita(C, t.x + t.w - 12, piso, { ropa: (['amarillo', 'rojo', 'luz'] as Color[])[i % 3], pant: (['azul', 'azul_noche', 'rojo'] as Color[])[i % 3], pelo: 'tinta', piel: i === 2 ? 'ocre' : 'terracota', pose: f % 2 ? 1 : 0, alto: 30 });
}

/**
 * La churuata de las empanadas: el techo de palma seca en capas, los horcones de madera, el mostrador con el letrero
 * EMPANADAS y COCO FRÍO, la vitrina con las empanadas, la nevera, la bandera de Venezuela en el techo y la vendedora.
 * `f` es el cuadro de la vendedora (la vida): pregona con una empanada en la mano.
 */
function churuata(C: Lienzo, seed: number, f: number) {
  const { x0, x1, alero, mostrador } = CHURUATA, piso = 262, cx = Math.round((x0 + x1) / 2), R = rng(seed);
  // la sombra del techo en la arena
  sombraOval(C, cx + 8, piso - 1, (x1 - x0) / 2 + 6, 5, 'cemento', 0.7);
  // los horcones y la viga
  for (const px of [x0 + 6, cx - 1, x1 - 8]) { C.f(px, alero, 4, piso - alero, 'terracota'); C.vl(px, alero, piso - alero, 'ocre'); C.vl(px + 3, alero, piso - alero, 'vino'); }
  // adentro, en sombra: la pared de atrás de tablas
  for (let y = alero + 2; y < mostrador; y++) for (let x = x0 + 10; x < x1 - 8; x++) C.p(x, y, (x - x0) % 9 === 0 ? 'sombra' : y === alero + 2 ? 'sombra' : 'asfalto');
  // la vendedora detrás del mostrador
  vendedora(C, cx + 14, mostrador, f);
  // un afiche del menú en la tabla: JUGOS en una pizarra
  C.box(x0 + 14, alero + 8, 24, 16, 'verde_oscuro', 'terracota');
  for (let j = 0; j < 4; j++) C.hl(x0 + 17, alero + 11 + j * 3, 10 + Math.floor(R() * 8), 'luz');
  // la nevera blanca y los cocos apilados
  C.box(x1 - 30, mostrador - 22, 16, 22, 'luz', 'cemento'); C.vl(x1 - 16, mostrador - 21, 20, 'cemento_claro'); C.hl(x1 - 29, mostrador - 13, 14, 'cemento_claro'); C.f(x1 - 28, mostrador - 18, 2, 4, 'cemento');
  // el mostrador de madera con su frente de tablas y el letrero
  C.f(x0 + 2, mostrador, x1 - x0 - 4, piso - mostrador, 'ocre');
  for (let x = x0 + 2; x < x1 - 2; x++) for (let y = mostrador; y < piso; y++) if ((x - x0) % 8 === 0) C.p(x, y, 'terracota');
  C.hl(x0, mostrador - 1, x1 - x0, 'amarillo'); C.hl(x0, mostrador, x1 - x0, 'terracota'); C.hl(x0 + 2, piso - 1, x1 - x0 - 4, 'vino');
  // la vitrina de las empanadas encima del mostrador
  C.box(x0 + 12, mostrador - 9, 30, 8, 'cielo', 'cemento'); for (let i = 0; i < 4; i++) { C.f(x0 + 14 + i * 7, mostrador - 5, 5, 3, 'oro'); C.p(x0 + 14 + i * 7, mostrador - 5, 'amarillo'); C.hl(x0 + 15 + i * 7, mostrador - 3, 4, 'ocre'); }
  // los cocos con su pitillo
  for (const [dx, dy] of [[0, 0], [7, 0], [3, -5]] as const) { C.d(x1 - 24 + dx, mostrador - 4 + dy, 3, 'verde'); C.p(x1 - 25 + dx, mostrador - 6 + dy, 'menta'); C.vl(x1 - 23 + dx, mostrador - 10 + dy, 4, 'rojo'); }
  // el letrero pintado en el frente del mostrador
  const t1 = 'EMPANADAS', w1 = anchoTexto(t1);
  C.box(cx - Math.round(w1 / 2) - 4, mostrador + 3, w1 + 8, 14, 'luz', 'rojo');
  textoGrande(C, cx - Math.round(w1 / 2), mostrador + 5, t1, 'rojo');
  const t2 = 'COCO FRÍO', w2 = anchoTexto(t2, 1);
  textoGrande(C, cx - Math.round(w2 / 2), mostrador + 15, t2, 'azul_noche', 1);
  // el techo de palma: capas de hojas secas que caen, más claras arriba, con el borde deshilachado
  const alto = 30;
  for (let j = 0; j < alto; j++) {
    const t = j / alto, hw = Math.round(14 + t * ((x1 - x0) / 2 + 10)), y = alero - alto + j + 4;
    for (let i = -hw; i <= hw; i++) {
      const x = cx + i, capa = Math.floor(j / 6), fleco = j === alto - 1 && (x & 1);
      let c: Color = (y + (x >> 1)) % 3 === 0 ? 'terracota' : capa % 2 ? 'ocre' : 'amarillo';
      if (j % 6 === 5) c = 'terracota';
      if (i < -hw + 2 || fleco) c = 'vino';
      C.p(x, y, c);
    }
  }
  for (let i = -((x1 - x0) / 2 + 10); i < (x1 - x0) / 2 + 10; i += 2) if (grain(i, 0, seed) < 0.6) C.vl(cx + i, alero + 4, 1 + Math.floor(grain(i, 1, seed) * 3), 'ocre');
  // la bandera de Venezuela en su palito, arriba del techo: amarilla, azul y roja, con las ocho estrellas en arco
  const bx = cx + 2, by = alero - alto - 4;
  C.vl(bx - 1, by - 2, 14, 'asfalto');
  for (let j = 0; j < 9; j++) for (let i = 0; i < 15; i++) C.p(bx + i, by + j, j < 3 ? 'amarillo' : j < 6 ? 'azul' : 'rojo');
  for (const i of [3, 5, 7, 9, 11]) C.p(bx + i, by + (i === 7 ? 3 : 4), 'luz');
}

/** La vendedora de empanadas: pañoleta, franela y la empanada que levanta al pregonar. */
function vendedora(C: Lienzo, x: number, mostrador: number, f: number) {
  const base = mostrador + 2;
  C.f(x, base - 16, 10, 16, 'salmon'); C.vl(x + 9, base - 16, 16, 'terracota'); C.f(x + 1, base - 8, 8, 6, 'luz');
  C.f(x + 2, base - 23, 6, 7, 'terracota'); C.hl(x + 1, base - 24, 8, 'rojo'); C.f(x + 1, base - 25, 8, 2, 'rojo'); C.p(x + 8, base - 22, 'rojo');
  C.p(x + 3, base - 20, 'tinta'); C.p(x + 6, base - 20, 'tinta');
  if (f % 2) {
    // pregona: la boca abierta y la empanada arriba
    C.p(x + 4, base - 18, 'vino'); C.p(x + 5, base - 18, 'vino');
    C.vl(x - 1, base - 26, 10, 'salmon'); C.f(x - 4, base - 30, 6, 3, 'oro'); C.p(x - 4, base - 30, 'amarillo');
  } else { C.hl(x + 4, base - 18, 2, 'vino'); C.vl(x - 1, base - 15, 8, 'salmon'); C.p(x - 1, base - 7, 'terracota'); }
}

/**
 * La torre del salvavidas en sus cuatro patas de madera: la caseta blanca y roja con el techito, la escalera, la cruz,
 * la bandera amarilla (se puede nadar) y el salvavidas colgado, con el salvavidas sentado mirando al mar.
 */
function torreSalvavidas(C: Lienzo, x: number) {
  const piso = 262, w = 30, casa = 212, plat = casa + 18;
  sombraOval(C, x + w / 2 + 8, piso - 1, w / 2 + 6, 3, 'cemento', 0.55);
  // las patas en X, de madera
  for (const px of [x + 2, x + w - 5]) { C.f(px, plat, 3, piso - plat, 'terracota'); C.vl(px, plat, piso - plat, 'ocre'); }
  C.ln(x + 4, plat + 2, x + w - 4, piso - 4, 'terracota'); C.ln(x + w - 4, plat + 2, x + 4, piso - 4, 'terracota');
  // la escalera de atrás, inclinada
  C.ln(x + w + 6, piso - 1, x + w - 2, plat, 'ocre'); C.ln(x + w + 10, piso - 1, x + w + 2, plat, 'ocre');
  for (let j = 4; j < piso - plat; j += 6) C.hl(x + w + 2 + Math.round(((piso - plat - j) / (piso - plat)) * -8) + 8, piso - j, 4, 'terracota');
  // la plataforma y la caseta
  C.f(x - 2, plat, w + 4, 3, 'ocre'); C.hl(x - 2, plat, w + 4, 'amarillo'); C.hl(x - 2, plat + 2, w + 4, 'vino');
  C.box(x + 2, casa, w - 4, plat - casa, 'luz', 'cemento');
  for (let y = casa + 1; y < plat; y += 4) C.hl(x + 3, y, w - 6, 'rojo');
  C.f(x + 6, casa + 4, 10, 8, 'azul_noche');
  // la cruz roja en la caseta
  C.f(x + 20, casa + 6, 2, 6, 'rojo'); C.f(x + 18, casa + 8, 6, 2, 'rojo');
  // el techito rojo a dos aguas
  for (let j = 0; j < 5; j++) C.hl(x + 2 - j, casa - 5 + j, w - 4 + 2 * j, j === 4 ? 'vino' : 'rojo');
  // el salvavidas sentado en la ventana, mirando al mar (la franela roja y la gorra)
  C.f(x + 8, casa + 6, 6, 6, 'rojo'); C.f(x + 9, casa + 2, 4, 4, 'terracota'); C.hl(x + 8, casa + 1, 6, 'amarillo');
  // la bandera amarilla en su palo y el salvavidas colgado de la baranda
  C.vl(x + w - 3, casa - 22, 18, 'asfalto');
  for (let j = 0; j < 6; j++) C.hl(x + w - 2, casa - 22 + j, 9 - Math.floor(j / 2), 'amarillo');
  C.d(x - 1, plat + 8, 4, 'rojo'); C.d(x - 1, plat + 8, 2, 'luz');
}

/** Una toalla a rayas en la arena con alguien acostado tomando sol, con su sombrero de paja. */
function toalla(C: Lienzo, x: number, y: number) {
  for (let j = 0; j < 6; j++) for (let i = 0; i < 34; i++) C.p(x + i + (5 - j), y + j, Math.floor(i / 4) % 2 ? 'salmon' : 'luz');
  // la persona acostada: piernas, traje de baño, la barriga al sol y la cabeza con el sombrero
  C.f(x + 6, y + 1, 12, 3, 'terracota'); C.hl(x + 6, y + 1, 12, 'ocre'); C.f(x + 18, y, 6, 4, 'azul'); C.f(x + 24, y, 7, 4, 'terracota'); C.hl(x + 24, y, 7, 'ocre');
  C.f(x + 31, y - 1, 5, 5, 'ocre'); C.hl(x + 30, y + 1, 8, 'amarillo'); C.f(x + 32, y - 3, 4, 2, 'amarillo');
}

/** Una pelota de playa de gajos de colores, medio enterrada. */
function pelotaPlaya(C: Lienzo, cx: number, cy: number) {
  for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) {
    if (i * i + j * j > 18) continue;
    const g = Math.floor(((Math.atan2(j, i) + Math.PI) / (Math.PI * 2)) * 6) % 3;
    C.p(cx + i, cy + j, i * i + j * j > 13 ? 'cemento' : i + j < -3 ? 'luz' : (['rojo', 'amarillo', 'azul'] as Color[])[g]);
  }
  sombraOval(C, cx + 3, cy + 5, 5, 1.5, 'cemento', 0.7);
}

/** El letrero de madera de la playa en sus dos palos: PLAYA EL AGUA y MARGARITA, tallado y pintado. */
function letreroPlaya(C: Lienzo) {
  const { x, y } = LETRERO, t1 = 'PLAYA EL AGUA', w = anchoTexto(t1) + 12, h = 26, piso = 262;
  for (const px of [x + 6, x + w - 9]) { C.f(px, y + h, 3, piso - y - h, 'terracota'); C.vl(px, y + h, piso - y - h, 'ocre'); }
  C.box(x, y, w, h, 'ocre', 'vino'); C.hl(x + 1, y + 1, w - 2, 'amarillo');
  for (let j = y + 4; j < y + h - 1; j += 6) C.hl(x + 1, j, w - 2, 'terracota');
  textoGrande(C, x + 6, y + 3, t1, 'luz', 2, 'vino');
  const t2 = 'MARGARITA', w2 = anchoTexto(t2, 1);
  textoGrande(C, x + Math.round((w - w2) / 2), y + 16, t2, 'azul_noche', 1);
  sombraOval(C, x + w / 2 + 4, piso - 1, w / 2, 3, 'cemento', 0.5);
}

// ---------------------------------------------------------------------------------------------------------------------
// La capa cerca completa

export interface CuadroMargarita { ola?: number; toldos?: number; vendedora?: number }

/** La playa completa sobre la capa cerca (alto franja.atras). `q` dice el cuadro de cada cosa que se mueve. */
export function pintarMargarita(C: Lienzo, seed: number, q: CuadroMargarita = {}) {
  orillaMar(C, q.ola ?? 0, seed);
  arenaSeca(C, seed);
  letreroPlaya(C);
  for (const p of PALMAS) sombraOval(C, p.x + p.lado * 40, 270, 22, 3, 'cemento', 0.45);
  churuata(C, seed + 3, q.vendedora ?? 0);
  TOLDOS.forEach((t, i) => { toldo(C, t, q.toldos ?? 0); genteToldo(C, t, i, q.toldos ?? 0); });
  // en la arena de atrás: una toalla con alguien tomando sol y una pelota de playa
  toalla(C, OX + 244, 268);
  pelotaPlaya(C, OX + 300, 276);
  torreSalvavidas(C, SALVAVIDAS.x);
  // unos bañistas en el agua bajita, chiquitos, en la orilla de atrás
  for (const [x, ropa] of [[OX + 262, 'rojo'], [OX + 282, 'amarillo'], [756, 'azul']] as const) { C.f(x, ORILLA_MAR.agua + 2, 5, 6, ropa); C.f(x + 1, ORILLA_MAR.agua - 3, 4, 5, 'terracota'); C.hl(x + 1, ORILLA_MAR.agua - 3, 4, 'tinta'); for (let i = -2; i < 8; i++) C.p(x + i, ORILLA_MAR.agua + 8, 'luz'); }
  for (const p of PALMAS) palmaCoco(C, p.x, p.base, p.alto, p.lado, seed + p.x);
}

export const fondoMargarita = (C: Lienzo, _x0: number, _x1: number, _base: number, ctx: CtxCerca) => pintarMargarita(C, ctx.seed);

// ---------------------------------------------------------------------------------------------------------------------
// El piso: la arena con las cintas de la cancha

/** Las cintas azules de la cancha de vóley playa, clavadas en la arena donde Voley.ts pone sus rayas, y la de la red. */
export function cintasMargarita(P: Lienzo, _L: ObliqueLayout, _seed: number) {
  const { atras, adelante, x0, x1, abre } = CANCHA;
  for (let x = x0; x <= x1; x++) { P.p(x, atras, 'azul'); P.p(x, atras + 1, 'cemento'); }
  for (let x = x0 - abre; x <= x1 + abre; x++) { P.p(x, adelante, 'azul'); P.p(x, adelante + 1, 'cemento'); }
  for (let y = atras; y <= adelante; y++) {
    const t = (y - atras) / (adelante - atras);
    for (const x of [Math.round(x0 - abre * t), Math.round(x1 + abre * t)]) P.p(x, y, 'azul');
  }
  // las estacas de las esquinas
  for (const [x, y] of [[x0, atras], [x1, atras], [x0 - abre, adelante], [x1 + abre, adelante]]) { P.p(x, y - 1, 'terracota'); P.p(x, y, 'vino'); }
  // huellas de pies en la arena de la cancha
  const R = rng(61);
  for (let k = 0; k < 40; k++) {
    const x = OX + 40 + Math.floor(R() * 560), y = 3 + Math.floor(R() * 34);
    if (Math.abs(y - atras) < 2 || Math.abs(y - adelante) < 2) continue;
    P.p(x, y, 'cemento_claro'); P.p(x + 1, y, 'cemento'); P.p(x + 3, y + 1, 'cemento_claro'); P.p(x + 4, y + 1, 'cemento');
  }
}

/** Lo de adelante de la cancha: la misma arena, con un coco, conchas y huellas. */
export function orillaMargarita(x: number, r: number, s: number): Color {
  const xr = ((x % 960) + 960) % 960;
  if (xr > 140 && xr < 150 && r > 10 && r < 17) { const d = Math.hypot(xr - 145, (r - 13.5) * 1.3); if (d < 4) return d < 1.6 ? 'amarillo' : d < 3 ? 'ocre' : 'terracota'; }
  if ((xr % 37 === 5 || xr % 37 === 9) && (r % 9 === 4)) return 'cemento';
  return arena(x, r + 40, s);
}

// ---------------------------------------------------------------------------------------------------------------------
// Vida, luces y partículas

/** Un alcatraz (pelícano) que vuela lejos: el cuerpo pardo, el pico largo y las alas que baten, 2 cuadros. */
function alcatraz(pal: Paleta): Lienzo[] {
  return [0, 1].map((f) => {
    const L = new Lienzo(15, 7, pal);
    L.f(5, 3, 5, 2, 'asfalto'); L.hl(10, 3, 4, 'ocre'); L.p(10, 2, 'cemento_claro'); L.p(4, 4, 'asfalto');
    if (f) { L.ln(6, 3, 1, 0, 'asfalto'); L.ln(8, 3, 12, 0, 'asfalto'); }
    else { L.ln(6, 4, 1, 6, 'asfalto'); L.ln(8, 4, 12, 6, 'asfalto'); L.hl(2, 3, 3, 'asfalto'); }
    return L;
  });
}

export function vidaMargarita(pal: Paleta, L: ObliqueLayout, _k: number, seed: number, capas: { cerca: Lienzo; piso: Lienzo }): VidaEscena[] {
  const out: VidaEscena[] = [], quiere = (t: string) => L.vida.includes(t), W = capas.cerca.w, H = capas.cerca.h;
  const cuadro = (q: CuadroMargarita) => { const c = new Lienzo(W, H, pal); pintarMargarita(c, seed, q); return c; };
  if (quiere('olas')) {
    // la orilla entera en cada cuadro (con las palmas y los toldos encima): la ola sube, revienta y se retira
    const y = ORILLA_MAR.agua - 2, h = ORILLA_MAR.seca + 6 - y;
    const cs = [0, 1, 2, 3].map((f) => cuadro({ ola: f }));
    out.push({ id: 'olas', tipo: 'olas', capa: 'cerca', x: 0, y, cuadros: cs.map((c) => recorte(c, 0, y, W, h)), fps: 3 });
  }
  if (quiere('toldos_viento')) {
    const cs = [0, 1].map((f) => cuadro({ toldos: f }));
    TOLDOS.forEach((t, i) => { const x = t.x - 2, y = TOLDO_Y - 8, w = t.w + 6, h = 62; out.push({ id: `toldo_${i}`, tipo: 'toldos_viento', capa: 'cerca', x, y, cuadros: cs.map((c) => recorte(c, x, y, w, h)), fps: 2 }); });
  }
  if (quiere('vendedor_empanadas')) {
    const cs = [0, 1].map((f) => cuadro({ vendedora: f }));
    const x = CHURUATA.x0 + 40, y = CHURUATA.mostrador - 34, w = 34, h = 34;
    out.push({ id: 'vendedor_empanadas', tipo: 'vendedor_empanadas', capa: 'cerca', x, y, cuadros: cs.map((c) => recorte(c, x, y, w, h)), fps: 1.5 });
  }
  if (quiere('alcatraces')) {
    out.push({ id: 'alcatraz_0', tipo: 'alcatraces', capa: 'lejos', x: 1280, y: 70, cuadros: alcatraz(pal), fps: 3, recorrido: { desde: [1280, 70], hasta: [-16, 84], segundos: 45, desfase: 0.55 } });
    out.push({ id: 'alcatraz_1', tipo: 'alcatraces', capa: 'lejos', x: 1290, y: 78, cuadros: alcatraz(pal), fps: 3, recorrido: { desde: [1300, 78], hasta: [4, 92], segundos: 45, desfase: 0.52 } });
  }
  return out;
}

/** Al mediodía no hay luces prendidas. */
export function lucesMargarita(_pal: Paleta, _L: ObliqueLayout, _k: number): Luz[] {
  return [];
}

export function particulasMargarita(pal: Paleta, L: ObliqueLayout, _k: number): Particula[] {
  return [
    { tipo: 'brillo', x0: 0, x1: L.largo, y0: 208, y1: 226, color: [pal.luz, pal.cielo], cada: 0.3, vida: 0.5, nota: 'el sol del mediodía que brilla en el agua' },
    { tipo: 'brillo', x0: 0, x1: L.largo, y0: 228, y1: 240, color: [pal.luz, pal.bruma], cada: 0.6, vida: 0.7, nota: 'la espuma de la ola que revienta' },
  ];
}

export const MARGARITA: Lugar = {
  estilo: 'venezuela_playa',
  fondo: fondoMargarita,
  lejos: { mar_caribe_cerro: marCaribe },
  pisos: { arena: (x, y, s) => arena(x, y, s) },
  orilla: orillaMargarita,
  marcas: cintasMargarita,
  vida: vidaMargarita,
  luces: lucesMargarita,
  particulas: particulasMargarita,
};
