import { rng, grain, bayer } from '../../fx/pix';
import { Lienzo } from './lienzo';
import type { Color, Paleta } from './paleta';
import type { CtxCerca } from './fachadas';
import type { Entidad, ObliqueLayout } from './layout';
import type { Luz, ObjetoEscena, Particula, VidaEscena } from './escena';
import type { Lugar } from './lugares';
import { MAS_OSCURO } from './tonos';
import { textoGrande, anchoTexto, palmaCoco } from './pinceles';

/**
 * Las azoteas de la ciudad amurallada de Cartagena al atardecer (estilo `colombia_amurallada`), de lado, para las Azoteas
 * de Cartagena. Lejos, la bahía con Bocagrande y el Castillo de San Felipe en su cerro, y el sol que se pone en el mar.
 * Cerca, los techos de teja de la ciudad vieja con la Torre del Reloj, la catedral y las palmas; el edificio de salida con
 * la azotea de baldosas de barro, la cajita de la garrocha y la raya del borde, las fachadas de colores con los balcones de
 * madera y las buganvillas, y el callejón en sombra con el farol. El techo de enfrente (con el balcón y la colchoneta) y el
 * carrito de frutas van aparte, como objetos, porque Azoteas.ts los corre en cada ronda. El piso es la calle de adoquín.
 */

export const CERCA_CARTAGENA = 'azoteas_cartagena';
/** La franja es la calle: el andén termina en la fila 340 y el adoquín va hasta la 360; los que caen quedan en CALLE 352 (y 12). */
const FT = 340;
/**
 * Las medidas de Azoteas.ts: la azotea donde corren (TECHO 262; las baldosas van de la fila 250 a la 262), el borde del
 * techo de salida en x 440 con la raya blanca, la cajita roja donde se clava la garrocha en x 428 (CAJA), la calle en la
 * fila 352 y el techo de enfrente, que el juego pone a 4, 5, 6 o 7 metros (10 px por metro) del borde.
 */
export const AZOTEA = { techo: 262, baldosa: 250, borde: 440, caja: 428, calle: 352, pxM: 10, huecos: [4, 5, 6, 7], ancho: 420 };
/** La fila de los techos de la ciudad vieja detrás de las azoteas. */
const CIUDAD = 238;
/** La Torre del Reloj y la catedral, de fondo. */
export const TORRE = { x: 250, base: 236 };
export const CATEDRAL = { x: 640, base: 236 };

// ---------------------------------------------------------------------------------------------------------------------
// Lo lejos: la bahía, Bocagrande y el Castillo

const onda = (x: number, w: number, vueltas: number, fase: number) => Math.sin((x / w) * Math.PI * 2 * vueltas + fase);

/**
 * La bahía de Cartagena al atardecer: el mar que se pone violeta con el camino del sol, las torres de Bocagrande en la
 * punta, el cerro de La Popa con el convento arriba, el Castillo de San Felipe en su cerro con las murallas en rampa, y
 * el sol grande que toca el agua. Arriba queda transparente: ahí va el cielo.
 */
export function bahiaCartagena(pal: Paleta, w: number, h: number, seed: number): Lienzo {
  const L = new Lienzo(w, h, pal), horiz = 96, sx = Math.floor(w * 0.7);
  // el sol que se pone, con su halo, y las nubes encendidas
  for (let y = horiz - 40; y <= horiz; y++) for (let x = sx - 50; x <= sx + 50; x++) {
    const d = Math.hypot(x - sx, (y - horiz + 4) * 1.15);
    if (d < 13) L.p(x, y, d < 10 ? 'amarillo' : 'oro');
    else if (d < 44 && bayer(x, y) < ((44 - d) / 44) * 0.55) L.p(x, y, d < 26 ? 'oro' : 'bruma');
  }
  for (const [y0, x0, x1] of [[horiz - 18, sx - 90, sx + 20], [horiz - 9, sx - 30, sx + 70], [horiz - 28, sx - 10, sx + 110]] as const) for (let x = x0; x < x1; x++) { L.p(x, y0, 'salmon'); if (bayer(x, y0 + 1) < 0.5) L.p(x, y0 + 1, 'vino'); }
  // el mar: violeta lejos y azul adelante, con el camino de oro del sol
  for (let y = horiz; y < h; y++) for (let x = 0; x < w; x++) {
    const camino = Math.abs(x - sx) < 14 + (y - horiz) * 0.8 && (x + y * 3) % 5 < 2;
    L.p(x, y, y === horiz ? 'bruma' : camino ? (y < horiz + 10 ? 'amarillo' : 'oro') : bayer(x, y) < (y - horiz) / 40 ? 'azul_noche' : 'canal');
  }
  // Bocagrande: las torres de la punta en la calima, a la izquierda
  const R = rng(seed);
  for (let k = 0; k < 16; k++) {
    const x = 60 + k * 14 + Math.floor(R() * 6), bh = 16 + Math.floor(R() * 26), bw = 6 + Math.floor(R() * 5);
    for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) L.p(x + i, horiz - 1 - j, i === 0 ? 'cielo' : (j % 3 === 0 && i % 2 === 1) ? 'oro' : 'celeste');
  }
  // el cerro de La Popa con el convento blanco arriba
  for (let x = 460; x < 640; x++) {
    const a = Math.round(Math.max(0, 30 * Math.sin(((x - 460) / 180) * Math.PI)) + onda(x, w, 7, 1) * 2);
    for (let j = 0; j < a; j++) L.p(x, horiz - 1 - j, j > a - 3 ? 'verde' : bayer(x, j) < 0.4 ? 'verde_oscuro' : 'azul_noche');
  }
  L.f(548, horiz - 36, 12, 6, 'crema'); L.hl(547, horiz - 37, 14, 'terracota'); L.vl(552, horiz - 41, 4, 'crema');
  // el Castillo de San Felipe: el cerro y las murallas en rampa, de piedra, con las garitas
  for (let x = 860; x < 1040; x++) {
    const a = Math.round(Math.max(0, 22 * Math.sin(((x - 860) / 180) * Math.PI)));
    for (let j = 0; j < a; j++) L.p(x, horiz - 1 - j, bayer(x, j) < 0.4 ? 'verde_oscuro' : 'verde');
  }
  for (let k = 0; k < 4; k++) {
    const x0 = 900 + k * 18, top = horiz - 22 - k * 6, ancho = 100 - k * 36;
    for (let j = 0; j < 8; j++) for (let i = 0; i < ancho - j; i++) L.p(x0 + i + j, top + j, i === 0 ? 'cemento_claro' : (i + j) % 7 === 0 ? 'cemento' : 'cemento_claro');
  }
  for (const gx of [912, 948, 980]) { L.f(gx, horiz - 34, 4, 5, 'cemento_claro'); L.p(gx + 1, horiz - 36, 'cemento'); L.p(gx + 2, horiz - 35, 'cemento'); }
  return L;
}

// ---------------------------------------------------------------------------------------------------------------------
// Los techos de la ciudad vieja

/** Un techo de teja de barro a dos aguas, visto de lado, con las hileras de tejas. */
function techoTeja(C: Lienzo, x0: number, x1: number, base: number, alto: number) {
  for (let j = 0; j < alto; j++) {
    const a = x0 + Math.round(j * 0.9), b = x1 - Math.round(j * 0.9), y = base - j;
    for (let x = a; x < b; x++) C.p(x, y, j === alto - 1 ? 'vino' : (x + (j & 1) * 2) % 4 === 0 ? 'vino' : j < 2 ? 'terracota' : 'ocre');
  }
}

/** La Torre del Reloj: la puerta de la muralla con el arco, la torre amarilla con el reloj y el remate con la cúpula y la veleta. */
function torreReloj(C: Lienzo) {
  const { x, base } = TORRE;
  // el cuerpo de la puerta con los tres arcos
  C.f(x - 26, base - 40, 52, 40, 'cemento_claro'); C.vl(x + 25, base - 40, 40, 'cemento');
  for (const ax of [x - 20, x - 6, x + 8]) { C.f(ax, base - 22, 12, 22, 'sombra'); for (let i = 0; i < 12; i++) C.p(ax + i, base - 22 - Math.round(Math.sin((i / 11) * Math.PI) * 4), 'sombra'); }
  // la torre amarilla con las pilastras blancas
  C.f(x - 12, base - 74, 24, 34, 'amarillo'); C.vl(x - 12, base - 74, 34, 'luz'); C.vl(x + 11, base - 74, 34, 'ocre');
  C.hl(x - 14, base - 41, 28, 'crema'); C.hl(x - 14, base - 75, 28, 'crema');
  // el reloj
  C.d(x, base - 60, 6, 'luz'); C.d(x, base - 60, 6, 'tinta', 1);
  for (let a = 0; a < 12; a++) C.p(x + Math.round(Math.cos(a / 12 * Math.PI * 2) * 4.6), base - 60 + Math.round(Math.sin(a / 12 * Math.PI * 2) * 4.6), 'tinta');
  C.ln(x, base - 60, x, base - 64, 'tinta'); C.ln(x, base - 60, x + 3, base - 59, 'tinta');
  // el remate: el cuerpo de arriba con el arco, la cúpula y la veleta
  C.f(x - 8, base - 88, 16, 13, 'amarillo'); C.f(x - 3, base - 85, 6, 8, 'sombra'); C.vl(x + 7, base - 88, 13, 'ocre');
  for (let j = 0; j < 9; j++) { const hw = Math.round(Math.sqrt(Math.max(0, 81 - j * j)) * 0.9); C.hl(x - hw, base - 89 - j, hw * 2, j < 3 ? 'ocre' : 'amarillo'); }
  C.vl(x, base - 104, 6, 'tinta'); C.hl(x - 2, base - 102, 5, 'tinta');
}

/** La catedral: el campanario con la cúpula de colores y la fachada de piedra. */
function catedral(C: Lienzo) {
  const { x, base } = CATEDRAL;
  C.f(x - 30, base - 34, 60, 34, 'cemento_claro'); C.vl(x + 29, base - 34, 34, 'cemento'); techoTeja(C, x - 34, x + 34, base - 34, 6);
  // el campanario
  C.f(x + 6, base - 82, 22, 48, 'crema'); C.vl(x + 27, base - 82, 48, 'cemento_claro');
  for (const y of [base - 76, base - 58]) { C.f(x + 12, y, 10, 12, 'sombra'); for (let i = 0; i < 10; i++) C.p(x + 12 + i, y - Math.round(Math.sin((i / 9) * Math.PI) * 3), 'sombra'); }
  // la cúpula naranja y crema a gajos
  for (let j = 0; j < 12; j++) { const hw = Math.round(Math.sqrt(Math.max(0, 144 - j * j))); for (let i = -hw; i < hw; i++) C.p(x + 17 + i, base - 83 - j, ((i + 12) >> 2) % 2 ? 'ocre' : 'amarillo'); }
  C.vl(x + 17, base - 101, 6, 'tinta'); C.hl(x + 15, base - 99, 5, 'tinta');
}

/** La ciudad vieja detrás de las azoteas: los techos de teja, las fachadas que asoman, las palmas, la torre y la catedral. */
function ciudadVieja(C: Lienzo, seed: number) {
  const W = C.w, R = rng(seed);
  // las fachadas de atrás, más bajas y en la luz del atardecer
  let x = -6;
  while (x < W) {
    const w = 30 + Math.floor(R() * 40), alto = 18 + Math.floor(R() * 20), c = (['amarillo', 'ocre', 'menta', 'crema', 'salmon', 'azul'] as Color[])[Math.floor(R() * 6)];
    C.f(x, CIUDAD - alto, w, alto + 14, c); C.vl(x + w - 1, CIUDAD - alto, alto + 14, MAS_OSCURO[c]);
    for (let wx = x + 5; wx < x + w - 8; wx += 12) { C.f(wx, CIUDAD - alto + 5, 5, 8, 'sombra'); C.hl(wx - 1, CIUDAD - alto + 13, 7, 'vino'); }
    techoTeja(C, x - 2, x + w + 2, CIUDAD - alto, 5 + Math.floor(R() * 3));
    x += w;
  }
  torreReloj(C);
  catedral(C);
  for (const [px, alto] of [[86, 64], [470, 70], [770, 60]] as const) palmaCoco(C, px, CIUDAD + 4, alto, px % 2 ? 1 : -1, seed + px);
}

// ---------------------------------------------------------------------------------------------------------------------
// El edificio de salida y el callejón

/** Un balcón de madera colonial: el tejadito, los barrotes torneados y las buganvillas que se derraman. */
function balcon(C: Lienzo, x: number, y: number, w: number, flores: number, seed: number) {
  C.hl(x - 2, y - 14, w + 4, 'vino'); C.hl(x - 1, y - 15, w + 2, 'terracota');
  C.f(x, y, w, 2, 'vino'); C.hl(x, y + 2, w, 'sombra');
  for (let i = 0; i < w; i += 3) C.vl(x + i, y - 9, 9, 'vino');
  C.hl(x, y - 10, w, 'vino');
  for (let i = 0; i < w; i += 6) C.p(x + i + 1, y + 3, 'vino');
  // las buganvillas: matas de flor fucsia con hojas que cuelgan del tejadito y se derraman por un lado del balcón
  const R = rng(seed), lado = R() < 0.5 ? x - 2 : x + w - 6;
  const matas = Math.max(3, Math.floor(flores / 8));
  for (let m = 0; m < matas; m++) {
    const cx = m === 0 ? lado : x - 2 + Math.floor(R() * (w + 4)), cy = m === 0 ? y - 12 + Math.floor(R() * 4) : y - 15 + Math.floor(R() * 6);
    const rx = 3 + Math.floor(R() * 3), ry = m === 0 ? 8 + Math.floor(R() * 8) : 2 + Math.floor(R() * 2);
    for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) {
      if ((i * i) / (rx * rx) + (j * j) / (ry * ry) > 1 || R() < 0.18) continue;
      C.p(cx + i, cy + j, j > ry - 1 || i <= -rx ? 'vino' : bayer(cx + i, cy + j) < 0.2 ? 'verde_oscuro' : (i * 7 + j * 3) % 11 === 0 ? 'rojo' : 'salmon');
    }
  }
}

/** Una fachada colonial de dos pisos: la pared de color, el pretil, los balcones con buganvillas, la puerta y el zócalo. */
function fachada(C: Lienzo, x0: number, x1: number, c: Color, seed: number, puerta = true) {
  const top = AZOTEA.techo + 1, base = FT, w = x1 - x0;
  for (let y = top; y < base; y++) for (let x = x0; x < x1; x++) C.p(x, y, x >= x1 - 2 ? MAS_OSCURO[c] : grain(x >> 2, y >> 2, seed) < 0.03 && bayer(x, y) < 0.5 ? MAS_OSCURO[c] : c);
  // la luz del atardecer en la parte de arriba, que entra de la derecha
  for (let y = top; y < top + 14; y++) for (let x = x0; x < x1; x++) if (bayer(x, y) < 0.35 - (y - top) * 0.025) C.p(x, y, 'oro');
  C.f(x0, top, w, 3, 'crema'); C.hl(x0, top + 3, w, MAS_OSCURO[c]);
  // los balcones del segundo piso con las puertas ventana
  for (let bx = x0 + 8; bx + 22 < x1 - 4; bx += 34) { C.f(bx + 4, top + 12, 12, 18, 'sombra'); C.vl(bx + 10, top + 12, 18, 'vino'); balcon(C, bx, top + 32, 22, 30, seed + bx); }
  // la puerta grande de la calle y la ventana de reja de abajo
  if (puerta) { const px = x0 + Math.floor(w / 2) - 8; C.f(px, base - 30, 16, 30, 'rojo'); C.vl(px + 8, base - 30, 30, 'vino'); C.hl(px - 1, base - 31, 18, 'crema'); C.p(px + 5, base - 15, 'oro'); C.p(px + 10, base - 15, 'oro'); }
  C.f(x0, base - 6, w, 6, MAS_OSCURO[c]); C.hl(x0, base - 6, w, 'crema');
}

/** El edificio de salida: la azotea de baldosas de barro con la cajita y la raya del borde, y las fachadas de colores debajo. */
function edificioSalida(C: Lienzo, seed: number) {
  const { baldosa, techo, borde, caja } = AZOTEA;
  // las fachadas
  const cs: Color[] = ['amarillo', 'azul', 'salmon', 'ocre', 'menta', 'crema'];
  let x = 0, i = 0;
  while (x < borde) { const w = Math.min(borde - x, 72 + ((i * 17) % 30)); fachada(C, x, x + w, cs[i % cs.length], seed + i, w > 40); x += w; i++; }
  // la azotea: baldosas de barro vistas en una franja, con las juntas
  for (let y = baldosa; y <= techo; y++) for (let x2 = 0; x2 < borde; x2++) C.p(x2, y, y === techo ? 'crema' : x2 % 8 === 0 || (y - baldosa) % 4 === 3 ? 'vino' : (y - baldosa) < 2 ? 'ocre' : 'terracota');
  // la cajita roja donde se clava la garrocha y la raya blanca del borde
  C.f(caja - 4, baldosa + 4, 8, 6, 'rojo'); C.f(caja - 3, baldosa + 5, 6, 3, 'vino');
  C.f(borde - 2, baldosa, 2, techo - baldosa, 'luz');
  // las materas y una silla en la azotea, al fondo
  for (const mx of [30, 196, 380]) { C.f(mx, baldosa - 6, 8, 6, 'terracota'); for (let k = 0; k < 9; k++) C.p(mx - 2 + (k * 5) % 12, baldosa - 8 - (k % 4), k % 3 ? 'verde' : 'salmon'); }
}

/** El callejón en sombra entre los edificios: la pared de atrás, una ventana prendida, el farol y la ropa tendida. */
function callejon(C: Lienzo, seed: number) {
  const { borde, baldosa } = AZOTEA, W = C.w;
  for (let y = baldosa; y < FT; y++) for (let x = borde; x < W; x++) {
    // arriba la sombra del alero; abajo el resplandor del farol y de la calle sobre la pared
    const t = (y - baldosa) / (FT - baldosa);
    C.p(x, y, t < 0.35 ? (bayer(x, y) < 0.6 - t ? 'sombra' : 'vino') : bayer(x, y) < (t - 0.35) * 2.2 ? 'terracota' : 'vino');
    if (grain(x >> 2, y >> 2, seed) < 0.03 && t > 0.3) C.p(x, y, 'vino');
  }
  // las ventanas prendidas y el farol de la esquina
  for (const [vx, vy] of [[470, 272], [612, 268], [760, 274]] as const) { C.f(vx, vy, 10, 14, 'oro'); C.vl(vx + 5, vy, 14, 'terracota'); C.hl(vx - 1, vy + 14, 12, 'sombra'); C.p(vx + 2, vy + 2, 'luz'); }
  C.f(borde + 28, 290, 2, 40, 'tinta'); C.hl(borde + 24, 290, 8, 'tinta'); C.f(borde + 21, 291, 5, 7, 'oro'); C.p(borde + 23, 293, 'luz');
  // la ropa tendida de lado a lado del callejón
  C.hl(borde, 262, W - borde, 'sombra');
  for (let k = 0; k < 14; k++) C.f(borde + 8 + k * 30, 263, 6, 6 + (k % 3) * 2, (['luz', 'amarillo', 'celeste', 'salmon'] as Color[])[k % 4]);
}

export interface CuadroCartagena { f?: number }

/** La ciudad y las azoteas sobre la capa cerca (alto franja.atras). */
export function pintarCartagena(C: Lienzo, seed: number, q: CuadroCartagena = {}) {
  void q;
  ciudadVieja(C, seed);
  callejon(C, seed + 3);
  edificioSalida(C, seed + 5);
  // el andén de la calle
  for (let y = FT - 2; y < FT; y++) for (let x = 0; x < C.w; x++) C.p(x, y, y === FT - 1 ? 'cemento' : 'cemento_claro');
}

export const fondoCartagena = (C: Lienzo, _x0: number, _x1: number, _base: number, ctx: CtxCerca) => pintarCartagena(C, ctx.seed);

// ---------------------------------------------------------------------------------------------------------------------
// El techo de enfrente y el carrito de frutas (objetos que el juego corre)

/**
 * El techo de enfrente de Azoteas.ts: 420 de ancho desde x (que el juego corre según la ronda), con la azotea de baldosas
 * y la colchoneta azul donde caen, las fachadas de colores con los balcones, y el balcón grande que sale 16 px hacia el
 * hueco con las buganvillas, donde cae el que no llega.
 */
function techoEnfrente(pal: Paleta, x: number, seed: number): ObjetoEscena {
  const { baldosa, techo, ancho } = AZOTEA, top = baldosa, img = new Lienzo(ancho + 16, FT - top + 14, pal);
  const sub = new Lienzo(ancho, FT, pal);
  const cs: Color[] = ['ocre', 'menta', 'amarillo', 'salmon', 'azul', 'crema'];
  let xx = 0, i = 0;
  while (xx < ancho) { const w = Math.min(ancho - xx, 66 + ((i * 23) % 34)); fachada(sub, xx, xx + w, cs[(i + 2) % cs.length], seed + 40 + i, w > 40); xx += w; i++; }
  for (let y = baldosa; y <= techo; y++) for (let x2 = 0; x2 < ancho; x2++) sub.p(x2, y, y === techo ? 'crema' : x2 % 8 === 0 || (y - baldosa) % 4 === 3 ? 'vino' : (y - baldosa) < 2 ? 'ocre' : 'terracota');
  // la colchoneta azul donde caen, con las costuras
  sub.f(0, baldosa + 2, 70, 9, 'azul'); sub.f(0, baldosa + 2, 70, 2, 'celeste');
  for (let k = 10; k < 70; k += 14) sub.vl(k, baldosa + 4, 7, 'azul_noche');
  // la pared del costado que da al hueco, en sombra
  for (let y = techo + 1; y < FT; y++) { sub.p(0, y, 'sombra'); sub.p(1, y, 'vino'); }
  for (let y = top; y < FT; y++) for (let x2 = 0; x2 < ancho; x2++) {
    const a = (y * sub.w + x2) * 4;
    if (sub.r.data[a + 3]) img.r.data.set(sub.r.data.subarray(a, a + 4), ((y - top) * img.w + x2 + 16) * 4);
  }
  // el balcón grande que sale hacia el hueco: el piso de madera, los barrotes y las buganvillas que se derraman
  const by = 38, R = rng(seed + 7);
  img.hl(0, by + 10, 18, 'vino'); img.hl(0, by + 11, 18, 'sombra');
  for (let k = 0; k < 18; k += 3) img.vl(k, by + 12, 7, 'vino');
  img.hl(0, by + 18, 18, 'sombra'); img.hl(0, by + 19, 18, 'vino');
  for (let k = 0; k < 46; k++) img.p(Math.floor(R() * 20), by + Math.floor(R() * 16), R() < 0.7 ? 'salmon' : 'verde');
  return { id: 'techo_enfrente', tipo: 'techo_enfrente', origen: 'entidades', img, x: x - 16, y: top, orden: 0 };
}

/** El carrito de frutas de la palenquera de la esquina: la carreta de madera con las frutas en montones y la sombrilla de rayas. */
function carritoFrutas(pal: Paleta, x: number): ObjetoEscena {
  const img = new Lienzo(34, 34, pal), base = 33;
  // la sombrilla de rayas rojas y blancas en su palo
  img.vl(16, 4, 16, 'asfalto');
  for (let j = 0; j < 4; j++) for (let i = -14 + j * 2; i <= 14 - j * 2; i++) img.p(17 + i, 7 - j, ((i + 14) >> 2) % 2 ? 'rojo' : 'luz');
  // la carreta: la caja de madera verde y las ruedas
  img.f(2, 18, 30, 9, 'verde'); img.hl(2, 18, 30, 'menta'); img.hl(2, 26, 30, 'verde_oscuro');
  for (let k = 5; k < 30; k += 6) img.vl(k, 19, 7, 'verde_oscuro');
  // las frutas en montones: mango, piña, patilla, mamoncillo
  const frutas: [number, Color, Color][] = [[6, 'amarillo', 'oro'], [12, 'oro', 'ocre'], [18, 'rojo', 'vino'], [24, 'verde', 'verde_oscuro'], [28, 'amarillo', 'ocre']];
  for (const [fx, c, s] of frutas) { img.d(fx, 15, 2.5, c); img.p(fx + 1, 16, s); img.p(fx - 1, 14, 'luz'); }
  img.f(20, 10, 4, 6, 'oro'); img.vl(21, 7, 3, 'verde');
  for (const rx of [8, 26]) { img.d(rx, base - 3, 3, 'tinta'); img.p(rx, base - 3, 'cemento'); }
  return { id: 'carrito_frutas', tipo: 'carrito_frutas', origen: 'entidades', img, x: x - 17, y: AZOTEA.calle - base, orden: 11 };
}

/** Las entidades del layout que pinta Cartagena: el techo de enfrente y el carrito de frutas. */
function objetoCartagena(pal: Paleta, e: Entidad, _L: ObliqueLayout, _k: number, seed: number): ObjetoEscena | null {
  if (typeof e.x !== 'number') return null;
  if (e.objeto === 'techo_enfrente') return techoEnfrente(pal, e.x, seed);
  if (e.objeto === 'carrito_frutas') return carritoFrutas(pal, e.x);
  return null;
}

// ---------------------------------------------------------------------------------------------------------------------
// El piso: la calle de adoquín

/** El adoquín de la calle: piedras redondeadas en hileras, con las juntas oscuras. */
export function adoquin(x: number, y: number, s: number): Color {
  const fila = Math.floor(y / 4), cx = (x + (fila % 2) * 3) % 6;
  if (y % 4 === 3 || cx === 5) return 'asfalto';
  if (cx === 0 && y % 4 === 0) return 'cemento';
  return grain(x >> 1, y, s) < 0.15 ? 'asfalto' : 'asfalto_claro';
}

/** Lo de adelante de la calle: el mismo adoquín, con el brocal del andén de enfrente. */
export function orillaCartagena(x: number, r: number, s: number): Color {
  return adoquin(x, r + 20, s);
}

// ---------------------------------------------------------------------------------------------------------------------
// Vida, luces y partículas

/** Un alcatraz que vuela lejos sobre la bahía, 2 cuadros. */
function alcatraz(pal: Paleta): Lienzo[] {
  return [0, 1].map((f) => {
    const L = new Lienzo(15, 7, pal);
    L.f(5, 3, 5, 2, 'sombra'); L.hl(10, 3, 4, 'ocre'); L.p(4, 4, 'sombra');
    if (f) { L.ln(6, 3, 1, 0, 'sombra'); L.ln(8, 3, 12, 0, 'sombra'); } else { L.ln(6, 4, 1, 6, 'sombra'); L.ln(8, 4, 12, 6, 'sombra'); }
    return L;
  });
}

/** Un velero chiquito en la bahía. */
function velero(pal: Paleta): Lienzo[] {
  const L = new Lienzo(12, 12, pal);
  for (let j = 0; j < 8; j++) for (let i = 0; i <= j / 1.4; i++) L.p(5 + i, 1 + j, 'luz');
  L.vl(4, 0, 10, 'sombra'); L.hl(1, 10, 10, 'crema'); L.hl(2, 11, 8, 'azul_noche');
  return [L];
}

export function vidaCartagena(pal: Paleta, L: ObliqueLayout, _k: number, _seed: number, _capas: { cerca: Lienzo; piso: Lienzo }): VidaEscena[] {
  const out: VidaEscena[] = [], quiere = (t: string) => L.vida.includes(t);
  if (quiere('alcatraces')) for (let i = 0; i < 3; i++) out.push({ id: `alcatraz_${i}`, tipo: 'alcatraces', capa: 'lejos', x: 1280 + i * 14, y: 70 + i * 5, cuadros: alcatraz(pal), fps: 3, recorrido: { desde: [1280 + i * 14, 70 + i * 5], hasta: [-20 + i * 14, 60 + i * 5], segundos: 40, desfase: 0.4 + i * 0.01 } });
  if (quiere('veleros')) {
    out.push({ id: 'velero_0', tipo: 'veleros', capa: 'lejos', x: 300, y: 92, cuadros: velero(pal), fps: 1, recorrido: { desde: [300, 92], hasta: [800, 92], segundos: 200, desfase: 0.1 } });
    out.push({ id: 'velero_1', tipo: 'veleros', capa: 'lejos', x: 1100, y: 96, cuadros: velero(pal), fps: 1, recorrido: { desde: [1100, 96], hasta: [600, 96], segundos: 240, desfase: 0.5 } });
  }
  return out;
}

/** El farol del callejón y las ventanas que ya se prenden al atardecer. */
export function lucesCartagena(pal: Paleta, _L: ObliqueLayout, _k: number): Luz[] {
  return [
    { x: AZOTEA.borde + 23, y: 294, color: pal.oro, radio: 22, latido: 2.6, encendida: true, nota: 'el farol de la esquina del callejón' },
    { x: 475, y: 279, color: pal.oro, radio: 12, encendida: true, nota: 'una ventana prendida del callejón' },
    { x: 617, y: 275, color: pal.oro, radio: 12, encendida: true, nota: 'otra ventana prendida' },
  ];
}

export function particulasCartagena(pal: Paleta, _L: ObliqueLayout, _k: number): Particula[] {
  return [{ tipo: 'confeti', x0: 0, x1: 880, y0: 230, y1: 300, color: [pal.salmon, pal.luz], cada: 0.5, vida: 3, nota: 'los pétalos de buganvilla que se lleva la brisa del mar' }];
}

export const CARTAGENA: Lugar = {
  estilo: 'colombia_amurallada',
  fondo: fondoCartagena,
  lejos: { bahia_cartagena: bahiaCartagena },
  pisos: { baldosa: (x, y, s) => adoquin(x, y, s) },
  orilla: orillaCartagena,
  objeto: objetoCartagena,
  vida: vidaCartagena,
  luces: lucesCartagena,
  particulas: particulasCartagena,
};

void anchoTexto; void textoGrande; void onda;
