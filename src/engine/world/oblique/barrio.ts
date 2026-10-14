import { rng, grain, bayer } from '../../fx/pix';
import { Lienzo } from './lienzo';
import type { Color, Paleta } from './paleta';
import type { CtxCerca } from './fachadas';
import type { Entidad, ObliqueLayout } from './layout';
import type { Luz, ObjetoEscena, Particula, VidaEscena } from './escena';
import type { Lugar } from './lugares';
import { MAS_OSCURO, MAS_CLARO } from './tonos';
import { recorte, textoGrande, anchoTexto, personita, sentadita, sombraOval } from './pinceles';

/**
 * Una calle de barrio de Caracas en la tarde (estilo `venezuela_barrio`), de lado, para la Chapita. Lejos, El Ávila verde
 * con el hotel Humboldt arriba y los zamuros que dan vueltas. Atrás, los ranchos de ladrillo y bloque que suben por el
 * cerro con sus escaleras y sus tanques. Cerca, la fila de casas de la calle con sus rejas, el abasto, el mango, el poste
 * con el enredo de cables y la gente en las puertas. La casa del vecino (con la ventana) y la ventana rota van aparte,
 * como objetos, donde las ponía Chapita.ts. El piso es el asfalto gastado con el home de tiza.
 */

export const CERCA_BARRIO = 'calle_barrio_caracas';
/** La franja: la acera termina en la fila 296 y la calle va hasta la 336; los pies de Chapita.ts van en la fila 316 (y 20). */
const FT = 296;
/** La calle de Chapita.ts: el home de tiza en x 94 a 116 (filas 314 a 320) y la marca del pitcher en x 326 a 334 (fila 318). */
export const CALLE = { pies: 20, home: { x0: 94, x1: 116, y0: 18, y1: 24 }, pitcher: { x0: 326, x1: 334, y: 22 } };
/**
 * La casa del vecino de Chapita.ts: de x 640 a 810, 100 de alto desde la fila 316 (más el tanque arriba), con la ventana
 * de x 646 a 682 entre z 40 y z 64 (filas 252 a 276) y el letrero HIELITOS. Va en un objeto; la ventana rota en otro.
 */
export const CASA_VECINO = { x0: 640, x1: 810, alto: 100, piso: 316, ventana: { x0: 646, x1: 682, z0: 40, z1: 64 } };
/** Las casas de la fila de la calle (la de Chapita va aparte): de dónde a dónde, alto, color y si tiene segundo piso. */
export const CASAS: { x0: number; x1: number; alto: number; color: Color; pisos: number }[] = [
  { x0: -10, x1: 92, alto: 66, color: 'salmon', pisos: 2 }, { x0: 92, x1: 176, alto: 52, color: 'cemento', pisos: 1 },
  { x0: 176, x1: 300, alto: 74, color: 'amarillo', pisos: 2 }, { x0: 300, x1: 420, alto: 56, color: 'crema', pisos: 1 },
  { x0: 470, x1: 560, alto: 70, color: 'celeste', pisos: 2 }, { x0: 560, x1: 640, alto: 58, color: 'cemento', pisos: 1 },
  { x0: 810, x1: 910, alto: 64, color: 'salmon', pisos: 2 },
];
/** El abasto de la esquina. */
export const ABASTO = { x0: 300, x1: 420 };
/** El mango y el poste. */
export const MANGO = { x: 446, copa: 186 };
export const POSTE = { x: 172 };

// ---------------------------------------------------------------------------------------------------------------------
// Lo lejos: El Ávila

const onda = (x: number, w: number, vueltas: number, fase: number) => Math.sin((x / w) * Math.PI * 2 * vueltas + fase);

/**
 * El Ávila en la tarde: la montaña verde de lomo largo, con las quebradas oscuras que bajan, la luz dorada en las
 * laderas de la izquierda y el hotel Humboldt (la torre redonda) en la cima. Abajo, la ciudad en la calima.
 */
export function avilaTarde(pal: Paleta, w: number, h: number, seed: number): Lienzo {
  const L = new Lienzo(w, h, pal);
  const lomo = (x: number) => Math.round(44 + onda(x, w, 1, 0.6) * 12 + onda(x, w, 3, 1.9) * 7 + onda(x, w, 9, 0.4) * 3);
  for (let x = 0; x < w; x++) {
    const a = lomo(x), sube = lomo(x + 4) - lomo(x - 4);
    for (let y = a; y < h; y++) {
      const t = (y - a) / (h - a);
      let c: Color = y === a ? 'menta' : sube > 0 ? (bayer(x, y) < 0.35 ? 'verde_oscuro' : 'verde') : bayer(x, y) < 0.4 ? 'verde' : 'verde_oscuro';
      // las quebradas: vetas oscuras que bajan de la cresta
      if (Math.abs(((x + y * 0.6) % 90) - 45) < 2 && y > a + 6) c = 'sombra';
      if (t > 0.6 && bayer(x, y) < (t - 0.6) * 2) c = 'canal';
      if (t > 0.85 && bayer(x, y) < (t - 0.85) * 5) c = 'bruma';
      L.p(x, y, c);
    }
  }
  // el hotel Humboldt en la cima más alta: la torre redonda de muchos pisos, blanca, con su antena
  let cima = 0;
  for (let x = 0; x < w; x++) if (lomo(x) < lomo(cima)) cima = x;
  const hx = cima, hy = lomo(cima);
  L.f(hx - 3, hy - 14, 7, 14, 'luz'); L.vl(hx + 3, hy - 14, 14, 'cemento_claro');
  for (let j = hy - 13; j < hy; j += 2) L.hl(hx - 3, j, 7, 'cemento');
  L.hl(hx - 4, hy - 15, 9, 'cemento'); L.vl(hx, hy - 20, 5, 'asfalto');
  // la ciudad lejos al pie de la montaña: edificios en la calima
  const R = rng(seed);
  for (let k = 0; k < 40; k++) {
    const x = Math.floor(R() * w), bw = 4 + Math.floor(R() * 8), bh = 6 + Math.floor(R() * 16);
    for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) L.p((x + i) % w, h - 1 - j, (i + j) % 4 === 0 ? 'cemento_claro' : 'bruma');
  }
  return L;
}

// ---------------------------------------------------------------------------------------------------------------------
// Los ranchos del cerro

/** Una casa de rancho: cubo de ladrillo o de bloque con la ventanita, la puerta y a veces el tanque o la platabanda. */
function rancho(C: Lienzo, x: number, base: number, w: number, h: number, seed: number) {
  const g = grain(x, base, seed), ladrillo = g < 0.6, pintada = g > 0.85;
  const pared: Color = pintada ? (['salmon', 'amarillo', 'celeste', 'menta'] as Color[])[Math.floor(grain(x, 1, seed) * 4)] : ladrillo ? 'terracota' : 'cemento';
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    let c: Color = pared;
    if (ladrillo && !pintada && (j % 3 === 0 || (i + (j % 6 < 3 ? 0 : 2)) % 5 === 0)) c = 'vino';
    if (!ladrillo && !pintada && j % 3 === 0) c = 'asfalto_claro';
    if (i === w - 1) c = MAS_OSCURO[pared];
    C.p(x + i, base - j, c);
  }
  C.hl(x - 1, base - h, w + 2, 'cemento_claro');
  // la ventanita con su reja y la puerta
  if (w > 7) C.f(x + 2, base - h + 3, 3, 3, 'sombra');
  if (w > 10 && h > 8) C.f(x + w - 5, base - 6, 3, 6, g < 0.3 ? 'azul' : 'sombra');
  // el tanque de agua en la platabanda
  if (grain(x, 7, seed) < 0.3) { C.f(x + 1, base - h - 4, 4, 4, grain(x, 9, seed) < 0.5 ? 'azul' : 'tinta'); C.hl(x + 1, base - h - 4, 4, 'celeste'); }
}

/** El cerro de ranchos: los cubos apilados por la ladera, de abajo para arriba, con las escaleras que suben entre ellos. */
function cerroRanchos(C: Lienzo, seed: number) {
  const W = C.w, R = rng(seed);
  const ladera = (x: number) => Math.round(150 + Math.sin(x / 160 + 0.4) * 30 + Math.sin(x / 57) * 6);
  // la tierra del cerro debajo de los ranchos
  for (let x = 0; x < W; x++) for (let y = ladera(x); y < 250; y++) C.p(x, y, bayer(x, y) < 0.3 ? 'verde_oscuro' : grain(x >> 2, y >> 2, seed) < 0.4 ? 'terracota' : 'verde');
  // los ranchos, en filas que suben
  for (let fila = 0; fila < 7; fila++) {
    let x = -10 + Math.floor(R() * 10);
    while (x < W) {
      const w = 9 + Math.floor(R() * 10), h = 8 + Math.floor(R() * 7);
      const base = Math.max(ladera(x + w / 2) + 6, 250 - fila * 14) - Math.floor(R() * 3);
      if (base > ladera(x + w / 2) + 2) rancho(C, x, base, w, h, seed + fila);
      x += w + (R() < 0.15 ? 6 : 0);
    }
  }
  // las escaleras que suben por el cerro
  for (const sx of [120, 380, 700]) for (let j = 0; j < 80; j++) { const x = sx + Math.round(j * 0.6), y = 248 - j; if (y > ladera(x)) { C.p(x, y, j % 2 ? 'cemento_claro' : 'cemento'); C.p(x + 1, y, 'cemento'); } }
}

// ---------------------------------------------------------------------------------------------------------------------
// La fila de casas de la calle

/** Una reja de hierro sobre una ventana o una puerta: barrotes y los adornos de arriba. */
function reja(C: Lienzo, x: number, y: number, w: number, h: number) {
  for (let i = 0; i < w; i += 3) C.vl(x + i, y, h, 'tinta');
  C.hl(x, y, w, 'tinta'); C.hl(x, y + h - 1, w, 'tinta'); C.hl(x, y + Math.floor(h / 2), w, 'tinta');
  for (let i = 1; i < w - 1; i += 6) { C.p(x + i, y + 1, 'tinta'); C.p(x + i + 1, y + 2, 'tinta'); }
}

/** Una casa de la calle: la pared frisada y pintada (o de bloque), el zócalo, la puerta y las ventanas con reja, el techo de platabanda con el tanque. */
function casaCalle(C: Lienzo, c: (typeof CASAS)[number], seed: number) {
  const { x0, x1, alto, color, pisos } = c, w = x1 - x0, base = FT - 8, top = base - alto;
  const bloque = color === 'cemento';
  for (let y = top; y < base; y++) for (let x = x0; x < x1; x++) {
    let k: Color = color;
    if (bloque && (y % 4 === 0 || (x + ((y >> 2) % 2) * 5) % 10 === 0)) k = 'asfalto_claro';
    if (!bloque && grain(x >> 1, y >> 1, seed + x0) < 0.06) k = MAS_OSCURO[color];
    if (x === x1 - 1) k = MAS_OSCURO[color];
    C.p(x, y, k);
  }
  // el zócalo y la platabanda con el remate
  C.f(x0, base - 8, w, 8, bloque ? 'cemento' : MAS_OSCURO[color]); C.hl(x0 - 1, top, w + 2, 'cemento_claro'); C.hl(x0 - 1, top + 1, w + 2, 'cemento');
  // la luz de la tarde, de la izquierda: una franja dorada arriba
  for (let y = top + 2; y < top + 8; y++) for (let x = x0; x < x1; x++) if (bayer(x, y) < 0.35 - (y - top) * 0.04) C.p(x, y, 'oro');
  // la puerta con su reja y las ventanas
  const px = x0 + Math.floor(w * 0.6);
  C.f(px, base - 30, 14, 30, 'sombra'); reja(C, px, base - 30, 14, 30);
  for (const vx of [x0 + 8, x0 + Math.floor(w * 0.3)]) if (vx + 14 < px) { C.f(vx, base - 26, 14, 12, 'azul_noche'); C.hl(vx + 1, base - 25, 5, 'celeste'); reja(C, vx, base - 26, 14, 12); }
  if (pisos > 1) for (let vx = x0 + 10; vx + 14 < x1 - 4; vx += 28) { C.f(vx, top + 12, 14, 12, 'azul_noche'); C.hl(vx + 1, top + 13, 6, 'celeste'); reja(C, vx, top + 12, 14, 12); }
  // en la platabanda: el tanque, la antena o el plato, y unas cabillas que salen (para el piso de arriba que algún día se hará)
  const g = grain(x0, 3, seed);
  if (g < 0.5) { C.f(x0 + w - 18, top - 9, 10, 9, g < 0.25 ? 'tinta' : 'azul'); C.hl(x0 + w - 18, top - 9, 10, g < 0.25 ? 'asfalto' : 'celeste'); C.hl(x0 + w - 19, top - 10, 12, g < 0.25 ? 'sombra' : 'azul'); }
  else { C.vl(x0 + 12, top - 14, 14, 'asfalto'); C.ln(x0 + 8, top - 12, x0 + 16, top - 12, 'asfalto'); C.ln(x0 + 9, top - 9, x0 + 15, top - 9, 'asfalto'); }
  for (let i = 0; i < 4; i++) C.vl(x0 + 4 + i * 6, top - 4, 4, 'terracota');
}

/** El abasto de la esquina: la santamaría medio abierta, el mostrador con los frascos, el letrero ABASTO EL PANA y el cartel de los precios. */
function abasto(C: Lienzo) {
  const { x0, x1 } = ABASTO, base = FT - 8, w = x1 - x0;
  // el letrero pintado arriba
  const t = 'ABASTO EL PANA', tw = anchoTexto(t);
  C.box(x0 + Math.round((w - tw) / 2) - 5, base - 54, tw + 10, 15, 'rojo', 'vino');
  textoGrande(C, x0 + Math.round((w - tw) / 2), base - 52, t, 'amarillo', 2, 'vino');
  // la santamaría (la cortina de metal) medio subida y adentro el mostrador
  C.f(x0 + 10, base - 34, w - 20, 34, 'sombra');
  for (let y = base - 34; y < base - 22; y++) C.hl(x0 + 10, y, w - 20, y % 2 ? 'asfalto_claro' : 'cemento');
  C.f(x0 + 14, base - 14, w - 28, 14, 'azul'); C.hl(x0 + 14, base - 14, w - 28, 'celeste');
  for (let i = 0; i < 9; i++) { const fx = x0 + 18 + i * 10; C.f(fx, base - 20, 4, 6, (['amarillo', 'rojo', 'menta'] as Color[])[i % 3]); C.hl(fx, base - 21, 4, 'luz'); }
  // el cartel de los precios escrito a mano, colgado en la santamaría
  C.box(x1 - 32, base - 33, 18, 10, 'luz', 'cemento'); for (let j = 0; j < 3; j++) C.hl(x1 - 30, base - 31 + j * 3, 12 - j * 3, j ? 'azul' : 'rojo');
}

/** El poste de luz con el transformador y el enredo de cables que va a las casas. */
function poste(C: Lienzo, seed: number) {
  const { x } = POSTE, base = FT - 6;
  C.f(x, 150, 4, base - 150, 'cemento'); C.vl(x, 150, base - 150, 'cemento_claro'); C.vl(x + 3, 150, base - 150, 'asfalto_claro');
  C.hl(x - 14, 160, 32, 'asfalto'); C.f(x + 6, 164, 8, 12, 'asfalto_claro'); C.hl(x + 6, 164, 8, 'cemento');
  // el enredo: cables que salen para los dos lados y cuelgan, y uno con un par de zapatos colgados
  const R = rng(seed);
  for (let k = 0; k < 9; k++) {
    const tx = x + (k % 2 ? 1 : -1) * (60 + Math.floor(R() * 160)), ty = 200 + Math.floor(R() * 40), comba = 6 + Math.floor(R() * 10);
    const n = Math.abs(tx - x);
    for (let i = 0; i <= n; i++) { const t = i / n, xx = Math.round(x + 2 + (tx - x - 2) * t), yy = Math.round(160 + (ty - 160) * t + Math.sin(t * Math.PI) * comba); C.p(xx, yy, 'sombra'); }
  }
  C.f(x + 40, 178, 3, 4, 'luz'); C.f(x + 44, 179, 3, 4, 'rojo'); C.vl(x + 41, 172, 6, 'sombra'); C.vl(x + 45, 172, 7, 'sombra');
}

/** El mango: el tronco grueso, la copa grande y redonda y los mangos maduros. */
function mango(C: Lienzo, seed: number) {
  const { x, copa } = MANGO, base = FT - 6, R = rng(seed);
  C.f(x - 3, copa + 10, 7, base - copa - 10, 'terracota'); C.vl(x - 3, copa + 10, base - copa - 10, 'ocre'); C.vl(x + 3, copa + 10, base - copa - 10, 'vino');
  for (let k = 0; k < 60; k++) {
    const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 30, cx = Math.round(x + Math.cos(a) * r * 1.2), cy = Math.round(copa + Math.sin(a) * r * 0.65), rr = 5 + R() * 4;
    for (let j = -rr; j <= rr; j++) for (let i = -rr; i <= rr; i++) if (i * i + j * j < rr * rr) C.p(cx + i, cy + j, j < -rr / 3 && i < 0 ? 'verde' : bayer(cx + i, cy + j) < 0.35 ? 'verde_oscuro' : 'verde');
  }
  for (let k = 0; k < 14; k++) { const mx = x - 30 + Math.floor(R() * 60), my = copa - 6 + Math.floor(R() * 24); C.f(mx, my, 2, 3, R() < 0.6 ? 'oro' : 'rojo'); }
}

/** La acera de la calle con el brocal: cemento con las juntas, y el borde amarillo despintado. */
function acera(C: Lienzo) {
  for (let y = FT - 8; y < FT; y++) for (let x = 0; x < C.w; x++) C.p(x, y, y >= FT - 2 ? (Math.floor(x / 12) % 2 ? 'amarillo' : 'cemento_claro') : x % 18 === 0 ? 'cemento' : 'cemento_claro');
}

export interface CuadroBarrio { f?: number }

/** El barrio completo sobre la capa cerca (alto franja.atras). `q.f` mueve la ropa, la gente y el perro. */
export function pintarBarrio(C: Lienzo, seed: number, q: CuadroBarrio = {}) {
  const f = q.f ?? 0;
  cerroRanchos(C, seed);
  mango(C, seed + 3);
  for (const c of CASAS) casaCalle(C, c, seed);
  abasto(C);
  // detrás de la casa del vecino: un muro de bloque (la casa la pone el objeto)
  for (let y = FT - 50; y < FT - 8; y++) for (let x = 640; x < 810; x++) C.p(x, y, y % 4 === 0 ? 'asfalto_claro' : 'cemento');
  poste(C, seed + 5);
  acera(C);
  // la ropa tendida en el segundo piso de la casa amarilla, que se mueve con la brisa
  C.hl(186, 230, 60, 'sombra');
  for (let i = 0; i < 6; i++) { const rx = 190 + i * 10, mece = (i + f) % 2; C.f(rx + mece, 231, 6, 7 + (i % 2) * 3, (['rojo', 'luz', 'azul', 'amarillo', 'salmon', 'menta'] as Color[])[i]); }
  // la gente: el señor de la silla con el radio, las comadres en la puerta y los niños mirando el juego
  sentadita(C, 312, FT - 10, { ropa: 'luz', pant: 'azul_noche', pelo: 'cemento_claro', piel: 'terracota', alto: 18, sombrero: undefined }, f % 2 === 1);
  C.f(326, FT - 16, 6, 4, 'asfalto'); C.p(330, FT - 15, 'oro');
  personita(C, 500, FT - 8, { ropa: 'salmon', pant: 'azul', pelo: 'tinta', piel: 'terracota', alto: 24, pose: f % 2 ? 3 : 0 });
  personita(C, 512, FT - 8, { ropa: 'amarillo', pant: 'vino', pelo: 'sombra', piel: 'salmon', alto: 23, pose: f % 2 ? 0 : 3 });
  personita(C, 580, FT - 8, { ropa: 'rojo', pant: 'azul', pelo: 'tinta', piel: 'terracota', alto: 16, pose: f % 2 ? 2 : 1 });
  personita(C, 592, FT - 8, { ropa: 'celeste', pant: 'azul_noche', pelo: 'tinta', piel: 'salmon', alto: 15, pose: f % 2 ? 1 : 2 });
  // el perro callejero echado en la acera, que se rasca
  const dx = 250, dy = FT - 3;
  C.f(dx, dy - 4, 10, 4, 'ocre'); C.hl(dx, dy - 4, 10, 'amarillo'); C.f(dx + 9, dy - (f % 2 ? 7 : 6), 4, 4, 'ocre'); C.p(dx + 12, dy - (f % 2 ? 6 : 5), 'tinta'); C.p(dx + 10, dy - (f % 2 ? 8 : 7), 'terracota');
  if (f % 2) C.ln(dx + 6, dy - 1, dx + 9, dy - 5, 'terracota'); else C.hl(dx + 2, dy - 1, 4, 'terracota');
}

export const fondoBarrio = (C: Lienzo, _x0: number, _x1: number, _base: number, ctx: CtxCerca) => pintarBarrio(C, ctx.seed);

// ---------------------------------------------------------------------------------------------------------------------
// La casa del vecino y la ventana rota (objetos)

/**
 * La casa del vecino de Chapita.ts: dos pisos de bloque frisado y pintado de verde pastel, con la ventana de reja donde
 * se asoma la señora Carmen, la puerta, el letrero de HIELITOS escrito a mano, la platabanda con el tanque azul y una
 * trinitaria que cuelga. Va parada en la fila 316, como en el juego.
 */
function casaVecino(pal: Paleta, seed: number): ObjetoEscena {
  const { x0, x1, alto, piso, ventana } = CASA_VECINO, w = x1 - x0, top = piso - alto, img = new Lienzo(w, alto + 16, pal);
  const Y = (sy: number) => sy - (top - 16);
  for (let y = top; y < piso; y++) for (let x = 0; x < w; x++) {
    let c: Color = 'menta';
    if (grain(x >> 1, y >> 1, seed) < 0.05) c = 'verde';
    if (x >= w - 3) c = 'verde';
    if ((y - top) % 50 === 49) c = 'cemento';
    img.p(x, Y(y), c);
  }
  // la luz dorada de la tarde en la esquina de arriba
  for (let y = top; y < top + 10; y++) for (let x = 0; x < w; x++) if (bayer(x, y) < 0.3 - (y - top) * 0.03) img.p(x, Y(y), 'oro');
  // el zócalo y la platabanda con el remate y el tanque azul
  img.f(0, Y(piso - 10), w, 10, 'verde'); img.hl(0, Y(piso - 10), w, 'verde_oscuro');
  img.f(0, Y(top) - 3, w, 3, 'cemento_claro'); img.hl(0, Y(top) - 1, w, 'cemento');
  img.f(118, Y(top) - 14, 24, 11, 'azul'); img.hl(118, Y(top) - 14, 24, 'celeste'); img.hl(117, Y(top) - 15, 26, 'azul'); img.vl(141, Y(top) - 13, 10, 'azul_noche');
  // la ventana del juego: marco blanco, el vidrio con el brillo y la reja (Carmen se asoma ahí; la rota la tapa)
  const vx = ventana.x0 - x0, vy = Y(piso - ventana.z1), vw = ventana.x1 - ventana.x0, vh = ventana.z1 - ventana.z0;
  img.f(vx - 2, vy - 2, vw + 4, vh + 4, 'luz'); img.hl(vx - 3, vy + vh + 2, vw + 6, 'cemento_claro');
  for (let j = 0; j < vh; j++) for (let i = 0; i < vw; i++) img.p(vx + i, vy + j, i + j < 10 ? 'cielo' : bayer(i, j) < 0.3 ? 'celeste' : 'azul');
  img.f(vx + 3, vy + 3, 7, 3, 'luz');
  for (let i = 0; i < vw; i += 6) img.vl(vx + i, vy, vh, 'tinta');
  img.hl(vx, vy, vw, 'tinta'); img.hl(vx, vy + Math.floor(vh / 2), vw, 'tinta'); img.hl(vx, vy + vh - 1, vw, 'tinta');
  // la ventana del segundo piso y la puerta
  img.f(60, Y(top) + 12, 18, 14, 'azul_noche'); img.hl(61, Y(top) + 13, 6, 'celeste'); reja(img, 60, Y(top) + 12, 18, 14);
  img.f(100, Y(piso - 34), 18, 34, 'terracota'); img.vl(100, Y(piso - 34), 34, 'vino'); img.vl(108, Y(piso - 34), 34, 'vino'); img.p(115, Y(piso - 17), 'oro');
  // el letrero de HIELITOS en un cartón pegado a la pared, escrito con marcador
  const t = 'HIELITOS', tw = anchoTexto(t);
  img.box(110 - Math.round(tw / 2) - 4, Y(piso - 82), tw + 8, 15, 'luz', 'cemento');
  textoGrande(img, 110 - Math.round(tw / 2), Y(piso - 80), t, 'azul', 2);
  img.hl(110 - 14, Y(piso - 64), 28, 'rojo'); textoGrande(img, 110 - 10, Y(piso - 63), 'A 1 BS', 'rojo', 1);
  // la trinitaria que cuelga de la platabanda
  for (let k = 0; k < 40; k++) { const tx = 140 + Math.floor(grain(k, 0, seed) * 28), ty = Y(top) + Math.floor(grain(k, 1, seed) * 24); img.p(tx, ty, k % 3 ? 'salmon' : 'verde'); }
  return { id: 'casa_vecino', tipo: 'casa_vecino', origen: 'entidades', img, x: x0, y: top - 16, orden: 0 };
}

/** La ventana rota: el vidrio estrellado con el hueco oscuro en el medio y la reja. El juego la prende cuando la chapa rompe la ventana. */
function ventanaRota(pal: Paleta): ObjetoEscena {
  const { piso, ventana } = CASA_VECINO, vw = ventana.x1 - ventana.x0, vh = ventana.z1 - ventana.z0, img = new Lienzo(vw, vh, pal);
  const cx = vw / 2 + 2, cy = vh / 2 - 1;
  for (let j = 0; j < vh; j++) for (let i = 0; i < vw; i++) img.p(i, j, bayer(i, j) < 0.3 ? 'celeste' : 'azul');
  // el hueco: adentro de la casa, oscuro, con los bordes del vidrio en picos
  for (let j = 0; j < vh; j++) for (let i = 0; i < vw; i++) {
    const a = Math.atan2(j - cy, i - cx), r = Math.hypot(i - cx, (j - cy) * 1.3), borde = 6 + Math.abs(Math.sin(a * 5)) * 4;
    if (r < borde) img.p(i, j, r < borde - 1.5 ? 'sombra' : 'luz');
  }
  // las grietas que salen del hueco
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + 0.3, len = 12 + (k % 3) * 6;
    for (let t = 9; t < len; t++) { const x = Math.round(cx + Math.cos(a) * t), y = Math.round(cy + Math.sin(a) * t * 0.7); if (x >= 0 && y >= 0 && x < vw && y < vh) img.p(x, y, 'luz'); }
  }
  for (let i = 0; i < vw; i += 6) img.vl(i, 0, vh, 'tinta');
  img.hl(0, 0, vw, 'tinta'); img.hl(0, Math.floor(vh / 2), vw, 'tinta'); img.hl(0, vh - 1, vw, 'tinta');
  return { id: 'ventana_rota', tipo: 'ventana_rota', origen: 'entidades', img, x: ventana.x0, y: piso - ventana.z1, orden: 1 };
}

/** Las entidades del layout que pinta el barrio: la casa del vecino y la ventana rota. */
function objetoBarrio(pal: Paleta, e: Entidad, _L: ObliqueLayout, _k: number, seed: number): ObjetoEscena | null {
  if (e.objeto === 'casa_vecino') return casaVecino(pal, seed);
  if (e.objeto === 'ventana_rota') return ventanaRota(pal);
  return null;
}

// ---------------------------------------------------------------------------------------------------------------------
// El piso: el asfalto con el home de tiza

/** El asfalto gastado de la calle, con los parches, las grietas y el aceite. */
export function asfaltoBarrio(x: number, y: number, s: number): Color {
  const n = grain(x, y, s);
  if (grain(x >> 4, y >> 2, s + 1) < 0.08) return 'asfalto_claro';
  if (n < 0.03) return 'sombra';
  if (n > 0.97) return 'cemento';
  return 'asfalto';
}

/** El home de tiza, la marca del pitcher y la tapa de la alcantarilla, donde los pintaba Chapita.ts. */
export function tizaBarrio(P: Lienzo, _L: ObliqueLayout, _seed: number) {
  const { home, pitcher } = CALLE;
  for (let x = home.x0; x <= home.x1; x++) { P.p(x, home.y0, 'luz'); P.p(x, home.y1, 'luz'); }
  for (let y = home.y0; y <= home.y1; y++) { P.p(home.x0, y, 'luz'); P.p(home.x1, y, 'luz'); }
  for (let x = pitcher.x0; x <= pitcher.x1; x++) P.p(x, pitcher.y, 'luz');
  // la alcantarilla y una grieta larga
  for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) P.p(560 + i, 30 + j, (i + j) % 3 === 0 ? 'sombra' : 'asfalto_claro');
  for (let i = 0; i < 80; i++) P.p(200 + i, 8 + Math.round(Math.sin(i / 7) * 2), 'sombra');
}

/** Lo de adelante de la calle: el brocal de la acera de este lado. */
export function orillaBarrio(x: number, r: number, s: number): Color {
  if (r < 2) return Math.floor(x / 12) % 2 ? 'amarillo' : 'cemento_claro';
  return x % 18 === 0 ? 'cemento' : grain(x, r, s) < 0.05 ? 'cemento' : 'cemento_claro';
}

// ---------------------------------------------------------------------------------------------------------------------
// Vida, luces y partículas

/** Un zamuro que da vueltas lejos: las alas abiertas en V, 2 cuadros. */
function zamuro(pal: Paleta): Lienzo[] {
  return [0, 1].map((f) => {
    const L = new Lienzo(13, 5, pal);
    L.f(5, 2, 3, 2, 'tinta'); L.p(8, 2, 'asfalto_claro');
    if (f) { L.ln(5, 2, 0, 0, 'tinta'); L.ln(7, 2, 12, 0, 'tinta'); } else { L.ln(5, 2, 0, 1, 'tinta'); L.ln(7, 2, 12, 1, 'tinta'); }
    return L;
  });
}

export function vidaBarrio(pal: Paleta, L: ObliqueLayout, _k: number, seed: number, capas: { cerca: Lienzo; piso: Lienzo }): VidaEscena[] {
  const out: VidaEscena[] = [], quiere = (t: string) => L.vida.includes(t), W = capas.cerca.w, H = capas.cerca.h;
  const cs = ['ropa_tendida', 'vecinos', 'perro'].some(quiere) ? [0, 1].map((f) => { const c = new Lienzo(W, H, pal); pintarBarrio(c, seed, { f }); return c; }) : [];
  const pieza = (id: string, x: number, y: number, w: number, h: number, fps: number) => out.push({ id, tipo: id, capa: 'cerca', x, y, cuadros: cs.map((c) => recorte(c, x, y, w, h)), fps });
  if (quiere('ropa_tendida')) pieza('ropa_tendida', 186, 229, 64, 14, 1.5);
  if (quiere('vecinos')) pieza('vecinos', 300, FT - 40, 310, 34, 1.2);
  if (quiere('perro')) pieza('perro', 246, FT - 12, 20, 12, 2);
  if (quiere('zamuros')) for (let i = 0; i < 2; i++) out.push({ id: `zamuro_${i}`, tipo: 'zamuros', capa: 'lejos', x: 200 + i * 400, y: 30 + i * 10, cuadros: zamuro(pal), fps: 1, recorrido: { desde: [200 + i * 500, 30 + i * 10], hasta: [700 + i * 300, 22 + i * 12], segundos: 24 + i * 6, desfase: 0.2 + i * 0.4 } });
  void MAS_CLARO;
  return out;
}

/** En la tarde no hay luces prendidas. */
export function lucesBarrio(_pal: Paleta, _L: ObliqueLayout, _k: number): Luz[] {
  return [];
}

export function particulasBarrio(pal: Paleta, L: ObliqueLayout, _k: number): Particula[] {
  return [{ tipo: 'polvo', x0: 0, x1: L.largo, y0: FT, y1: FT + 30, color: [pal.cemento_claro, pal.bruma], cada: 1.5, vida: 1.2, nota: 'el polvo de la calle que levanta la brisa' }];
}

export const BARRIO: Lugar = {
  estilo: 'venezuela_barrio',
  fondo: fondoBarrio,
  lejos: { avila_tarde: avilaTarde },
  pisos: { asfalto: (x, y, s) => asfaltoBarrio(x, y, s) },
  orilla: orillaBarrio,
  marcas: tizaBarrio,
  objeto: objetoBarrio,
  vida: vidaBarrio,
  luces: lucesBarrio,
  particulas: particulasBarrio,
};

void sombraOval;
