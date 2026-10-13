import { rng, grain, bayer } from '../../fx/pix';
import { Lienzo } from './lienzo';
import type { Color, Paleta } from './paleta';
import { MAS_OSCURO, MAS_CLARO } from './tonos';
import type { CtxCerca } from './fachadas';
import type { Entidad, ObliqueLayout } from './layout';
import type { Luz, ObjetoEscena, Particula, VidaEscena } from './escena';
import type { Lugar } from './lugares';
import { corre } from './inclinada';
import { recorte, textoGrande, anchoTexto, banderines, sentadita, palmaCoco } from './pinceles';

/**
 * Una calle del Carnaval de Barranquilla al mediodía (estilo `colombia_caribe`), en la vista inclinada de la pelea, para
 * el Fútbol Callejero. Al fondo, las casas de colores del Barrio Abajo con sus puertas altas, ventanas de barrotes y
 * las máscaras de Marimonda y de Torito colgadas; a los lados, los palcos llenos de gente con sombrero vueltiao; arriba,
 * las guirnaldas de banderines y el pendón de CARNAVAL DE BARRANQUILLA. En la acera baila una comparsa. La calle de
 * asfalto tiene el confeti, la maicena y las rayas de tiza donde las pinta Futbol.ts, y los dos arcos de piedra.
 */

export const CERCA_BARRANQUILLA = 'calle_carnaval_barranquilla';
/** La franja de Futbol.ts: el piso empieza en la fila 212 (FT) y tiene 104 de fondo (PROF). */
const FT = 212;
/** La acera de las casas, arriba de la calle. */
export const ACERA = 200;
/** Los palcos de los dos lados: de dónde a dónde y la fila del techo. */
export const PALCOS = [{ x0: -4, x1: 192, techo: 118 }, { x0: 488, x1: 680, techo: 118 }];
/** Las casas del Barrio Abajo entre los palcos: x, ancho, fila de arriba, color y pisos. */
export const CASAS: { x: number; w: number; top: number; c: Color; pisos: 1 | 2; mascara?: 'marimonda' | 'torito' }[] = [
  { x: 192, w: 98, top: 116, c: 'amarillo', pisos: 1, mascara: 'marimonda' },
  { x: 290, w: 104, top: 84, c: 'menta', pisos: 2 },
  { x: 394, w: 96, top: 110, c: 'salmon', pisos: 1, mascara: 'torito' },
];
/** El pendón del Carnaval colgado entre los palcos. */
export const PENDON = { x0: 214, x1: 466, y0: 50, y1: 78 };
/** La comparsa que baila en la acera, x de cada uno. */
export const COMPARSA = [220, 262, 410, 448];
/** Las rayas de la cancha de Futbol.ts (x, y de mundo): las líneas de gol, el fondo, el medio y las áreas chiquitas. */
export const CANCHA = { gol: [26, 600] as const, prof: 104, medio: 313, circulo: [18, 12] as const, area: 40 };
/** Los arcos de piedra de Futbol.ts: en cada línea de gol, de y 34 a y 70 y 26 de alto. */
export const ARCO = { y0: 34, y1: 70, alto: 26 };
/** Los colores del Carnaval. */
const CARNAVAL: Color[] = ['rojo', 'amarillo', 'verde', 'azul', 'canal', 'oro'];

// ---------------------------------------------------------------------------------------------------------------------
// Lo lejos: Barranquilla al mediodía

/** Barranquilla detrás de las casas: los edificios bajos y unas torres en la calima del mediodía, con palmas y el campanario de la catedral. */
export function barranquillaMediodia(pal: Paleta, w: number, h: number, seed: number): Lienzo {
  const L = new Lienzo(w, h, pal), R = rng(seed), base = h - 10;
  // las torres de atrás, claras en la calima
  for (let x = 4; x < w; x += 30 + Math.floor(R() * 60)) {
    const tw = 12 + Math.floor(R() * 14), alto = 40 + Math.floor(R() * 50);
    for (let y = base - alto; y < base; y++) for (let i = 0; i < tw; i++) L.p((x + i) % w, y, i === 0 ? 'luz' : (y - (base - alto)) % 5 === 2 && i % 3 === 1 ? 'cielo' : 'bruma');
  }
  // la catedral: el campanario delgado con la cruz, a la izquierda
  const cx = 150;
  for (let y = base - 96; y < base; y++) for (let i = 0; i < 8; i++) L.p(cx + i, y, i < 2 ? 'luz' : 'cemento_claro');
  for (let j = 0; j < 14; j++) L.hl(cx + 4 - Math.round((14 - j) * 0.3), base - 110 + j, Math.round((14 - j) * 0.6) + 1, 'cemento_claro');
  L.vl(cx + 4, base - 118, 8, 'cemento'); L.hl(cx + 2, base - 115, 5, 'cemento');
  // los edificios bajos de colores, más cerca, con sus tanques
  for (let x = -6; x < w; x += 22 + Math.floor(R() * 20)) {
    const bw = 20 + Math.floor(R() * 22), alto = 16 + Math.floor(R() * 22), c: Color = (['crema', 'cielo', 'cemento_claro', 'crema'] as Color[])[Math.floor(R() * 4)];
    for (let y = base - alto; y < h; y++) for (let i = 0; i < bw; i++) L.p(((x + i) % w + w) % w, y, i === 0 ? 'luz' : (y - (base - alto)) % 6 === 3 && i % 5 === 2 ? 'cemento' : c);
    if (R() < 0.5) L.f(((x + 4) % w + w) % w, base - alto - 4, 5, 4, 'cemento');
  }
  // palmas sueltas entre los edificios
  for (const px of [60, 250, 410, 560, 760, 1010, 1180]) palmaCoco(L, px, h, 46 + (px % 20), px % 2 ? 1 : -1, seed + px, ['verde_oscuro', 'verde', 'verde'], ['cemento', 'cemento', 'cemento_claro'], 0.1);
  for (let y = base - 8; y < h; y++) for (let x = 0; x < w; x++) if (bayer(x, y) < (y - base + 8) / 14) L.p(x, y, 'bruma');
  return L;
}

// ---------------------------------------------------------------------------------------------------------------------
// Las casas del Barrio Abajo, las máscaras, los palcos y el pendón

/** Una puerta alta de madera de dos hojas con el arco de medio punto y la clavija, en su color. */
function puerta(C: Lienzo, x: number, base: number, w: number, h: number, c: Color) {
  C.f(x - 2, base - h - 2, w + 4, h + 2, 'crema');
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const arco = j < w / 2 && Math.hypot(i - w / 2 + 0.5, j - w / 2) > w / 2;
    if (arco) continue;
    C.p(x + i, base - h + j, i === Math.floor(w / 2) || i === 0 ? MAS_OSCURO[c] : (j > 6 && (j - 6) % 10 === 0) || i % 7 === 3 ? MAS_OSCURO[c] : c);
  }
  C.p(x + Math.floor(w / 2) - 2, base - Math.floor(h / 2), 'oro'); C.p(x + Math.floor(w / 2) + 1, base - Math.floor(h / 2), 'oro');
}

/** Una ventana alta de barrotes torneados, con su visera de lata y el antepecho. */
function ventana(C: Lienzo, x: number, y: number, w: number, h: number, marco: Color) {
  C.f(x - 2, y - 4, w + 4, 2, 'terracota'); C.hl(x - 3, y - 3, w + 6, 'vino');
  C.box(x - 1, y - 1, w + 2, h + 2, 'sombra', marco);
  for (let i = 1; i < w; i += 3) for (let j = 0; j < h; j++) C.p(x + i, y + j, j % 5 === 2 ? 'crema' : 'luz');
  C.hl(x, y + Math.floor(h / 2), w, 'crema');
  C.f(x - 2, y + h + 1, w + 4, 2, 'crema'); C.hl(x - 2, y + h + 3, w + 4, 'cemento');
}

/** Una casa del Barrio Abajo: la fachada de color con sus pilastras, la cornisa y el pretil con molduras, puertas y ventanas. */
function casa(C: Lienzo, k: (typeof CASAS)[number], seed: number) {
  const { x, w, top, c, pisos } = k, base = ACERA, R = rng(seed);
  // la fachada, con la sombra de la cornisa y un poco de pintura gastada
  for (let y = top; y < base; y++) for (let i = 0; i < w; i++) {
    let col: Color = c;
    if (y < top + 12) col = (y - top) % 4 === 0 ? 'luz' : y === top + 11 ? MAS_OSCURO[c] : 'crema';
    else if (y < top + 15) col = MAS_OSCURO[c];
    else if (grain((x + i) >> 2, y >> 2, seed) < 0.05) col = MAS_CLARO[c];
    C.p(x + i, y, col);
  }
  // el pretil: las pilastras que suben y los remates
  for (const px of [x, x + w - 6]) { C.f(px, top - 6, 6, base - top + 6, 'crema'); C.vl(px, top - 6, base - top + 6, 'luz'); C.vl(px + 5, top - 6, base - top + 6, 'cemento_claro'); C.f(px - 1, top - 8, 8, 2, 'luz'); }
  C.f(x + 6, top - 4, w - 12, 4, 'crema'); C.hl(x + 6, top - 4, w - 12, 'luz');
  for (let i = x + 12; i < x + w - 12; i += 8) C.f(i, top - 3, 3, 2, 'cemento_claro');
  // el zócalo de abajo
  for (let i = 6; i < w - 6; i++) for (let y = base - 8; y < base; y++) C.p(x + i, y, y === base - 8 ? 'crema' : MAS_OSCURO[c]);
  if (pisos === 2) {
    // el segundo piso: el balcón corrido de madera con sus barrotes y dos puertas ventana
    const by = top + 44;
    for (let i = 4; i < w - 4; i++) { C.p(x + i, by, 'terracota'); C.p(x + i, by + 1, 'vino'); if (i % 3 === 0) C.vl(x + i, by - 10, 10, 'ocre'); }
    C.hl(x + 4, by - 11, w - 8, 'terracota');
    for (const px of [x + 18, x + w - 34]) { C.f(px, top + 18, 16, 26, 'azul'); C.vl(px + 8, top + 18, 26, 'azul_noche'); C.f(px - 2, top + 15, 20, 3, 'crema'); }
    puerta(C, x + Math.floor(w / 2) - 8, base - 8, 16, 40, 'azul');
    ventana(C, x + 14, base - 40, 14, 22, 'crema'); ventana(C, x + w - 28, base - 40, 14, 22, 'crema');
  } else {
    const pc = R() < 0.5 ? 'verde' : 'azul';
    puerta(C, x + 16, base - 8, 18, 50, pc);
    ventana(C, x + w - 40, base - 52, 18, 30, 'crema');
  }
}

/** La máscara de la Marimonda colgada en la fachada: la capucha de color, las orejotas, los ojos y la boca con su aro y la trompa larga. */
export function mascaraMarimonda(C: Lienzo, cx: number, cy: number) {
  // las orejotas, con el adentro amarillo
  for (const d of [-1, 1]) { C.d(cx + d * 15, cy - 4, 8, 'azul'); C.d(cx + d * 15, cy - 4, 5, 'amarillo'); C.d(cx + d * 15, cy - 3, 2, 'oro'); }
  // la capucha roja con el remate
  C.d(cx, cy, 12, 'rojo'); C.d(cx - 3, cy - 4, 5, 'oro'); C.d(cx, cy, 12, 'rojo', 1);
  for (let j = -12; j <= 12; j++) for (let i = -12; i <= 12; i++) if (i * i + j * j <= 144 && i * i + j * j > 110) C.p(cx + i, cy + j, 'vino');
  C.d(cx - 4, cy - 6, 3, 'salmon');
  // los ojos y la boca: huecos negros con el aro blanco
  for (const d of [-1, 1]) { C.d(cx + d * 5, cy - 2, 3, 'luz'); C.d(cx + d * 5, cy - 2, 1.5, 'tinta'); }
  C.d(cx, cy + 7, 2.5, 'luz'); C.d(cx, cy + 7, 1.2, 'tinta');
  // la trompa larga que cuelga, con sus anillos, y la punta
  for (let j = 0; j < 22; j++) { const tx = cx + Math.round(Math.sin(j / 5) * 3); C.f(tx - 1, cy + 1 + j, 3, 1, j % 4 === 0 ? 'amarillo' : 'rojo'); C.p(tx + 2, cy + 1 + j, 'vino'); }
  C.d(cx + Math.round(Math.sin(22 / 5) * 3), cy + 24, 2, 'verde');
}

/** La máscara del Torito: la cabeza negra con la nariz roja, los ojos blancos, los cuernos y las cintas de colores. */
function mascaraTorito(C: Lienzo, cx: number, cy: number) {
  // los cuernos
  for (const d of [-1, 1]) for (let i = 0; i < 12; i++) { const x = cx + d * (8 + i), y = cy - 8 - Math.round(Math.sin((i / 12) * Math.PI * 0.8) * 8); C.p(x, y, 'luz'); C.p(x, y + 1, 'crema'); C.p(x, y + 2, 'cemento_claro'); }
  // la cabeza alargada con el hocico
  for (let j = -10; j <= 14; j++) { const hw = j < 4 ? 10 : Math.round(10 - (j - 4) * 0.4); for (let i = -hw; i <= hw; i++) C.p(cx + i, cy + j, i === -hw || i === hw ? 'tinta' : 'sombra'); }
  C.f(cx - 6, cy + 9, 13, 5, 'rojo'); C.p(cx - 3, cy + 11, 'tinta'); C.p(cx + 3, cy + 11, 'tinta');
  for (const d of [-1, 1]) { C.d(cx + d * 5, cy - 2, 2.5, 'luz'); C.p(cx + d * 5, cy - 2, 'tinta'); }
  // los adornos de colores en la frente y las cintas que cuelgan
  for (let i = -8; i <= 8; i += 2) C.p(cx + i, cy - 9, CARNAVAL[(i + 8) / 2 % CARNAVAL.length]);
  for (const [i, c] of [[-9, 'amarillo'], [-6, 'verde'], [6, 'azul'], [9, 'canal']] as const) C.vl(cx + i, cy + 15, 8 + Math.abs(i) % 3, c);
}

/** Un palco del Carnaval: la gradería de tablas en cuatro escalones, la gente sentada, los tubos, el techo de lona a rayas y el faldón de colores. `f` levanta los brazos (la vida). */
function palco(C: Lienzo, p: (typeof PALCOS)[number], seed: number, f: number) {
  const { x0, x1, techo } = p, base = FT, w = x1 - x0, R = rng(seed);
  // la sombra del techo sobre la gradería
  for (let y = techo + 10; y < base; y++) for (let x = x0; x < x1; x++) C.p(x, y, 'sombra');
  // los cuatro escalones de tablas, cada uno con su gente
  const escalones = 4, paso = 16;
  for (let e = escalones - 1; e >= 0; e--) {
    const asiento = base - 22 - e * paso;
    for (let x = x0; x < x1; x++) { C.p(x, asiento, 'amarillo'); C.p(x, asiento + 1, 'ocre'); C.p(x, asiento + 2, 'ocre'); for (let y = asiento + 3; y < asiento + paso && y < base; y++) C.p(x, y, (x - x0) % 24 === 0 ? 'sombra' : 'terracota'); }
    for (let x = x0 + 4, n = 0; x < x1 - 10; n++) {
      const hueco = R() < 0.12, sombrero = R() < 0.45, ropa = CARNAVAL[Math.floor(R() * CARNAVAL.length)], piel: Color = R() < 0.5 ? 'terracota' : R() < 0.5 ? 'ocre' : 'salmon', paso2 = 12 + Math.floor(R() * 4), arriba = (n + e + f) % 3 === 0;
      if (!hueco) sentadita(C, x, asiento, { ropa, pant: R() < 0.5 ? 'azul' : 'luz', pelo: 'tinta', piel, alto: 17, sombrero: sombrero ? 'crema' : undefined }, arriba);
      // el sombrero vueltiao tiene las rayas negras de la caña flecha
      if (!hueco && sombrero) for (let i = 0; i < 9; i += 2) C.p(x + i, asiento - 3 - 9 - 5 - 1, 'tinta');
      x += paso2;
    }
  }
  // los tubos del palco y el techo de lona a rayas con el fleco
  for (let x = x0 + 6; x < x1; x += 46) { C.f(x, techo, 3, base - techo, 'asfalto_claro'); C.vl(x, techo, base - techo, 'cemento'); }
  for (let y = techo; y < techo + 10; y++) for (let x = x0; x < x1; x++) C.p(x, y, y === techo ? MAS_OSCURO[CARNAVAL[Math.floor((x - x0) / 12) % CARNAVAL.length]] : CARNAVAL[Math.floor((x - x0) / 12) % CARNAVAL.length]);
  for (let x = x0; x < x1; x++) { const c = CARNAVAL[Math.floor((x - x0) / 12) % CARNAVAL.length], t = (x - x0) % 12; for (let j = 0; j < 4 - Math.abs(t - 6) / 2; j++) C.p(x, techo + 10 + j, MAS_OSCURO[c]); }
  // el faldón de adelante: tela amarilla con la franja de colores y la baranda
  for (let y = base - 14; y < base; y++) for (let x = x0; x < x1; x++) C.p(x, y, y < base - 11 ? CARNAVAL[Math.floor((x - x0) / 8) % CARNAVAL.length] : y === base - 1 ? 'ocre' : 'amarillo');
  C.hl(x0, base - 16, w, 'cemento_claro'); C.hl(x0, base - 15, w, 'asfalto_claro');
}

/** El pendón del Carnaval colgado de las cuerdas: CARNAVAL DE BARRANQUILLA y el lema, con el fleco de colores. */
function pendon(C: Lienzo) {
  const { x0, x1, y0, y1 } = PENDON, w = x1 - x0;
  C.ln(PALCOS[0].x1 - 10, PALCOS[0].techo, x0, y0 + 2, 'sombra'); C.ln(PALCOS[1].x0 + 10, PALCOS[1].techo, x1, y0 + 2, 'sombra');
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) C.p(x, y, y === y0 || y === y1 - 1 ? 'vino' : y < y0 + 3 ? 'rojo' : 'luz');
  for (let x = x0; x < x1; x++) { const c = CARNAVAL[Math.floor((x - x0) / 6) % CARNAVAL.length]; C.p(x, y1, c); if ((x - x0) % 3) C.p(x, y1 + 1, c); }
  const t1 = 'CARNAVAL DE BARRANQUILLA', w1 = anchoTexto(t1);
  textoGrande(C, x0 + Math.round((w - w1) / 2), y0 + 1, t1, 'rojo', 2, 'vino');
  const t2 = '¡QUIEN LO VIVE ES QUIEN LO GOZA!', w2 = anchoTexto(t2, 1);
  textoGrande(C, x0 + Math.round((w - w2) / 2), y0 + 18, t2, 'azul', 1);
}

/** La acera de las casas: baldosas de cemento con el borde que da a la calle. */
function acera(C: Lienzo, seed: number) {
  for (let y = ACERA; y < FT; y++) for (let x = 0; x < C.w; x++) {
    const jx = (x + (y >> 2) * 3) % 16;
    C.p(x, y, y === FT - 1 ? 'cemento' : y === FT - 2 ? 'luz' : jx === 0 || y === ACERA ? 'cemento' : grain(x >> 1, y, seed) < 0.05 ? 'cemento' : 'cemento_claro');
  }
}

/** Un bailarín de la comparsa: la cumbiambera de pollera, el Congo de turbante de flores o el de garabato. `f` es el paso (4 cuadros). */
function bailarin(C: Lienzo, x: number, base: number, tipo: number, f: number) {
  const s = [0, 1, 0, -1][f % 4], sube = f % 2;
  if (tipo % 2 === 0) {
    // la cumbiambera: la pollera ancha de vuelos que se abre con el paso, la blusa y las flores en el pelo
    const falda: Color = tipo === 0 ? 'rojo' : 'amarillo', vuelo: Color = tipo === 0 ? 'amarillo' : 'rojo';
    for (let j = 0; j < 16; j++) { const hw = 3 + Math.round(j * 0.55) + (j > 10 ? Math.abs(s) * 2 : 0); for (let i = -hw; i <= hw; i++) C.p(x + i + (j > 8 ? s : 0), base - 2 - j + sube, j % 5 === 1 ? vuelo : j < 2 ? 'luz' : falda); }
    C.f(x - 3, base - 26 + sube, 7, 9, 'luz'); C.hl(x - 3, base - 26 + sube, 7, 'crema');
    C.f(x - 2, base - 32 + sube, 5, 6, 'terracota'); C.hl(x - 2, base - 33 + sube, 5, 'tinta'); C.p(x + 3, base - 33 + sube, 'rojo'); C.p(x - 3, base - 33 + sube, 'amarillo');
    // los brazos arriba con la vela o la pollera
    C.ln(x - 3, base - 24 + sube, x - 7 - s, base - 30 + sube, 'terracota'); C.ln(x + 3, base - 24 + sube, x + 7 - s, base - 20 + sube, 'terracota');
    C.vl(x - 7 - s, base - 34 + sube, 4, 'luz'); C.p(x - 7 - s, base - 35 + sube, 'oro');
    C.hl(x - 3 + s, base - 1, 3, 'tinta'); C.hl(x + 1 - s, base - 1, 3, 'tinta');
  } else {
    // el Congo: el turbante alto de flores con espejitos, la cara pintada, la camisa y el pantalón de colores y el garabato
    const camisa: Color = tipo === 1 ? 'canal' : 'azul';
    C.f(x - 2 + s, base - 12, 2, 12, 'rojo'); C.f(x + 2 - s, base - 12, 2, 12, 'amarillo');
    C.f(x - 3, base - 24 + sube, 8, 12, camisa); C.vl(x + 4, base - 24 + sube, 12, MAS_OSCURO[camisa]); C.hl(x - 3, base - 19 + sube, 8, 'oro');
    C.f(x - 2, base - 30 + sube, 6, 6, 'luz'); C.p(x - 1, base - 28 + sube, 'tinta'); C.p(x + 2, base - 28 + sube, 'tinta'); C.p(x, base - 26 + sube, 'rojo');
    for (let j = 0; j < 12; j++) { const hw = 3 + Math.round(Math.sin((j / 12) * Math.PI) * 2); for (let i = -hw; i <= hw; i++) C.p(x + 1 + i, base - 31 - j + sube, (i + j) % 3 === 0 ? 'salmon' : (i + j) % 3 === 1 ? 'amarillo' : 'verde'); }
    C.p(x + 1, base - 43 + sube, 'luz'); C.p(x - 1, base - 37 + sube, 'luz');
    // el garabato: el palo con la cinta, arriba y abajo con el paso
    C.ln(x + 5, base - 22 + sube, x + 10, base - 30 - s * 3 + sube, 'terracota'); C.ln(x + 10, base - 30 - s * 3 + sube, x + 10, base - 38 - s * 3 + sube, 'ocre');
    C.ln(x + 10, base - 38 - s * 3 + sube, x + 7, base - 36 - s * 3 + sube, 'ocre');
    for (let j = 0; j < 6; j++) C.p(x + 11, base - 36 - s * 3 + j + sube, CARNAVAL[j % CARNAVAL.length]);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// La capa cerca completa

export interface CuadroBarranquilla { publico?: number; guirnaldas?: number; comparsa?: number }

/** Las cuerdas de banderines que cruzan la calle: de, a y la comba. */
const GUIRNALDAS: [number, number, number, number, number][] = [[-4, 24, 680, 38, 12], [140, 12, 560, 14, 18], [-4, 92, 680, 88, 12], [-4, 62, 206, 50, 6], [474, 52, 680, 66, 6]];

/** La calle completa sobre la capa cerca (alto franja.atras). `q` dice el cuadro de cada cosa que se mueve. */
export function pintarBarranquilla(C: Lienzo, seed: number, q: CuadroBarranquilla = {}) {
  acera(C, seed);
  for (const [i, k] of CASAS.entries()) casa(C, k, seed + i * 13);
  // las máscaras grandes colgadas en las fachadas
  for (const k of CASAS) if (k.mascara === 'marimonda') mascaraMarimonda(C, k.x + k.w - 32, k.top + 30); else if (k.mascara === 'torito') mascaraTorito(C, k.x + k.w - 30, k.top + 30);
  // la comparsa que baila en la acera
  COMPARSA.forEach((x, i) => bailarin(C, x, FT - 3, i, (q.comparsa ?? 0) + i));
  PALCOS.forEach((p, i) => palco(C, p, seed + 40 + i, q.publico ?? 0));
  pendon(C);
  for (const [i, [a, b, c, d, comba]] of GUIRNALDAS.entries()) banderines(C, a, b, c, d, comba, i % 2 ? [...CARNAVAL].reverse() : CARNAVAL, (q.guirnaldas ?? 0) + i, 10);
}

export const fondoBarranquilla = (C: Lienzo, _x0: number, _x1: number, _base: number, ctx: CtxCerca) => pintarBarranquilla(C, ctx.seed);

// ---------------------------------------------------------------------------------------------------------------------
// El piso: el asfalto con el confeti, la maicena y las rayas de tiza

/** Las manchas de maicena en la calle (x, y de mundo y radio): blancas, con el borde tramado. */
const MAICENA: [number, number, number][] = [[96, 70, 9], [182, 24, 7], [262, 88, 8], [388, 40, 10], [470, 78, 7], [548, 20, 8], [640, 62, 9], [760, 30, 8], [860, 84, 9]];

/** El asfalto caliente de la calle, con el confeti de colores regado y la maicena en manchas. */
export function asfaltoCarnaval(x: number, y: number, s: number): Color {
  const xr = ((x % 960) + 960) % 960;
  const n = grain(xr, y, s);
  // el confeti: puntitos de colores sueltos
  if (n < 0.01) return CARNAVAL[Math.floor(grain(xr, y, s + 9) * CARNAVAL.length)];
  // la maicena: manchas redondas aplastadas, blancas en el medio y tramadas en el borde
  for (const [mx, my, r] of MAICENA) {
    const d = Math.hypot((xr - mx) / 1.6, y - my) / r + (grain(xr >> 1, y, s + 4) - 0.5) * 0.35;
    if (d < 1) return d < 0.45 ? 'luz' : bayer(xr, y) < (1 - d) * 1.4 ? 'cemento_claro' : 'asfalto_claro';
  }
  // el asfalto: gris tibio con el granito y unas manchas más oscuras de aceite
  return n > 0.975 ? 'cemento' : n > 0.94 ? 'asfalto' : 'asfalto_claro';
}

/** Las rayas de tiza de la cancha donde las pinta Futbol.ts, y las serpentinas en el piso (en el piso derecho, antes de inclinarlo). */
export function rayasBarranquilla(P: Lienzo, _L: ObliqueLayout, seed: number) {
  const { gol, prof, medio, circulo, area } = CANCHA, gasta = (x: number, y: number) => grain(x >> 1, y, seed + 7) < 0.12;
  const raya = (x: number, y: number) => { if (x >= 0 && y >= 0 && x < P.w && y < prof && !gasta(x, y)) P.p(x, y, 'luz'); };
  for (let x = gol[0]; x <= gol[1]; x++) { raya(x, 0); raya(x, prof - 1); }
  for (let y = 0; y < prof; y++) { raya(gol[0], y); raya(gol[1], y); raya(medio, y); }
  for (let a = 0; a < Math.PI * 2; a += 0.02) raya(Math.round(medio + Math.cos(a) * circulo[0]), Math.round(prof / 2 + Math.sin(a) * circulo[1]));
  for (const [x0, x1] of [[gol[0], gol[0] + area], [gol[1] - area, gol[1]]]) {
    for (let x = x0; x <= x1; x++) { raya(x, ARCO.y0 - 10); raya(x, ARCO.y1 + 10); }
    for (let y = ARCO.y0 - 10; y <= ARCO.y1 + 10; y++) raya(x0 === gol[0] ? x1 : x0, y);
  }
  // las serpentinas: tiras de papel enroscadas sobre el asfalto
  const R = rng(seed + 3);
  for (let k = 0; k < 18; k++) {
    let x = 20 + R() * 600, y = 4 + R() * (prof - 8);
    const c = CARNAVAL[k % CARNAVAL.length], a0 = R() * Math.PI * 2;
    for (let i = 0; i < 26; i++) { x += Math.cos(a0 + i * 0.5); y += Math.sin(a0 + i * 0.5) * 0.5; P.p(Math.round(x), Math.round(y), c); }
  }
}

/** Lo de abajo de la franja: el bordillo pintado de amarillo y negro, la cuneta y el andén de enfrente. */
export function orillaBarranquilla(x: number, r: number, s: number): Color {
  const xr = ((x % 960) + 960) % 960;
  if (r === 0) return 'luz';
  if (r < 6) return Math.floor(xr / 12) % 2 ? 'amarillo' : 'sombra';
  if (r === 6) return 'asfalto';
  const jx = (xr + (r >> 2) * 5) % 18;
  return jx === 0 ? 'cemento' : grain(xr >> 1, r, s) < 0.06 ? CARNAVAL[(xr >> 1) % CARNAVAL.length] : 'cemento_claro';
}

// ---------------------------------------------------------------------------------------------------------------------
// Los arcos de piedra

/** Una columna de piedras apiladas: cantos de colores de piedra con su contorno, de abajo hacia arriba. */
function columnaPiedras(L: Lienzo, x: number, base: number, alto: number, seed: number) {
  const R = rng(seed);
  let y = base;
  while (y > base - alto) {
    const h = 4 + Math.floor(R() * 3), w = 7 + Math.floor(R() * 2), dx = Math.floor(R() * 3) - 1, c: Color = (['cemento_claro', 'crema', 'cemento'] as Color[])[Math.floor(R() * 3)];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const borde = j === 0 || j === h - 1 || i === 0 || i === w - 1, esquina = (j === 0 || j === h - 1) && (i === 0 || i === w - 1);
      if (esquina) continue;
      L.p(x + dx + i - Math.floor(w / 2), y - h + j, borde ? 'tinta' : i < 2 ? MAS_CLARO[c] : i > w - 3 ? MAS_OSCURO[c] : c);
    }
    y -= h - 1;
  }
}

/**
 * Un arco de piedra de Futbol.ts en su línea de gol, en la vista inclinada: la columna de atrás (y 34) con el palo de
 * arriba y las cintas, o la de adelante (y 70). Van en dos objetos: el de atrás detrás de quien está entre las columnas.
 */
function arcoPiedra(pal: Paleta, x: number, k: number, parte: 'atras' | 'adelante', seed: number): ObjetoEscena {
  const { y0, y1, alto } = ARCO, a = x + corre(k, y0), b = x + corre(k, y1);
  const left = a - 8, top = FT + y0 - alto - 10, img = new Lienzo(b - a + 18, y1 - y0 + alto + 14, pal);
  const X = (sx: number) => sx - left, Y = (sy: number) => sy - top;
  if (parte === 'atras') {
    columnaPiedras(img, X(a), Y(FT + y0), alto + 4, seed);
    // el palo de arriba: una vara de madera amarrada con cabuya, de columna a columna, con cintas de colores
    const ya = FT + y0 - alto - 2, yb = FT + y1 - alto - 2;
    // la vara va de una columna a la otra (en la vista inclinada baja en diagonal): cuatro filas, con la luz arriba
    const n = Math.max(b - a, yb - ya);
    for (let i = 0; i <= n; i++) {
      const t = i / n, xx = Math.round(a + (b - a) * t), yy = Math.round(ya + (yb - ya) * t);
      img.p(X(xx) - 1, Y(yy), 'tinta'); img.p(X(xx), Y(yy) - 1, 'tinta'); img.p(X(xx), Y(yy), 'amarillo'); img.p(X(xx) + 1, Y(yy), 'ocre'); img.p(X(xx) + 2, Y(yy), 'terracota'); img.p(X(xx) + 3, Y(yy), 'tinta');
    }
    // las cintas de colores amarradas a la vara, que cuelgan
    for (const [t, c] of [[0.25, 'rojo'], [0.45, 'amarillo'], [0.65, 'verde'], [0.85, 'azul']] as const) { const xi = Math.round(a + (b - a) * t) + 2, yy = Math.round(ya + (yb - ya) * t) + 1; for (let j = 0; j < 9; j++) img.p(X(xi + (j > 4 ? 1 : 0)), Y(yy + j), j === 8 ? MAS_OSCURO[c] : c); }
    for (const [sx, sy] of [[a, ya], [b, yb]]) { img.p(X(sx) - 1, Y(sy) + 1, 'crema'); img.p(X(sx) + 1, Y(sy) + 1, 'crema'); }
    return { id: `arco_piedra_${x}_atras`, tipo: 'arco_piedra', origen: 'entidades', img, x: left, y: top, orden: y0 + 1 };
  }
  columnaPiedras(img, X(b), Y(FT + y1), alto + 4, seed + 1);
  return { id: `arco_piedra_${x}`, tipo: 'arco_piedra', origen: 'entidades', img, x: left, y: top, orden: y1 + 1 };
}

/** Las entidades del layout que pinta la calle: los arcos de piedra (dos objetos cada uno). */
function objetoBarranquilla(pal: Paleta, e: Entidad, _L: ObliqueLayout, k: number, seed: number): ObjetoEscena | null {
  if (e.objeto !== 'arco_piedra' || typeof e.x !== 'number') return null;
  // la columna de atrás va en su propio objeto (con el palo): se arma aquí y se suma a la lista con `parte`
  return arcoPiedra(pal, e.x, k, e.parte === 'atras' ? 'atras' : 'adelante', seed + e.x);
}

// ---------------------------------------------------------------------------------------------------------------------
// Vida, luces y partículas

export function vidaBarranquilla(pal: Paleta, L: ObliqueLayout, _k: number, seed: number, capas: { cerca: Lienzo; piso: Lienzo }): VidaEscena[] {
  const out: VidaEscena[] = [], quiere = (t: string) => L.vida.includes(t), W = capas.cerca.w, H = capas.cerca.h;
  const cuadro = (q: CuadroBarranquilla) => { const c = new Lienzo(W, H, pal); pintarBarranquilla(c, seed, q); return c; };
  if (quiere('publico')) {
    const cs = [0, 1].map((f) => cuadro({ publico: f }));
    PALCOS.forEach((p, i) => { const x = Math.max(0, p.x0), y = p.techo + 14, w = Math.min(W, p.x1) - x, h = FT - 14 - y; out.push({ id: `publico_${i}`, tipo: 'publico', capa: 'cerca', x, y, cuadros: cs.map((c) => recorte(c, x, y, w, h)), fps: 2 }); });
  }
  if (quiere('guirnaldas')) {
    const cs = [0, 1].map((f) => cuadro({ guirnaldas: f }));
    // una pieza por cuerda, del tamaño de la cuerda con su comba y sus banderines
    GUIRNALDAS.forEach(([a, b, c, d, comba], i) => {
      const x = Math.max(0, Math.min(a, c)), y = Math.min(b, d) - 1, w = Math.min(W, Math.max(a, c) + 4) - x, h = Math.max(b, d) + comba + 10 - y;
      out.push({ id: `guirnaldas_${i}`, tipo: 'guirnaldas', capa: 'cerca', x, y, cuadros: cs.map((q) => recorte(q, x, y, w, h)), fps: 2 });
    });
  }
  if (quiere('comparsa')) {
    const cs = [0, 1, 2, 3].map((f) => cuadro({ comparsa: f }));
    for (const [x0, x1] of [[COMPARSA[0] - 12, COMPARSA[1] + 16], [COMPARSA[2] - 12, COMPARSA[3] + 16]]) out.push({ id: `comparsa_${x0}`, tipo: 'comparsa', capa: 'cerca', x: x0, y: FT - 50, cuadros: cs.map((c) => recorte(c, x0, FT - 50, x1 - x0, 50)), fps: 4 });
  }
  return out;
}

/** Al mediodía no hay luces prendidas. */
export function lucesBarranquilla(_pal: Paleta, _L: ObliqueLayout, _k: number): Luz[] {
  return [];
}

export function particulasBarranquilla(pal: Paleta, L: ObliqueLayout, _k: number): Particula[] {
  const out: Particula[] = [{ tipo: 'confeti', fx: 'confeti', x0: 40, x1: 640, y0: 120, y1: 190, cada: 2.2, nota: 'el confeti que tiran desde los palcos (el efecto confeti del kit)' }];
  if (L.vida.includes('confeti')) out.push({ tipo: 'confeti', x0: 0, x1: 676, y0: 20, y1: 140, color: [pal.rojo, pal.amarillo, pal.verde, pal.azul, pal.canal], cada: 0.15, vida: 2.5, nota: 'papelitos de colores que caen sobre la calle' });
  return out;
}

export const BARRANQUILLA: Lugar = {
  estilo: 'colombia_caribe',
  fondo: fondoBarranquilla,
  lejos: { barranquilla_mediodia: barranquillaMediodia },
  pisos: { cancha: (x, y, s) => asfaltoCarnaval(x, y, s) },
  orilla: orillaBarranquilla,
  marcas: rayasBarranquilla,
  objeto: objetoBarranquilla,
  vida: vidaBarranquilla,
  luces: lucesBarranquilla,
  particulas: particulasBarranquilla,
};

