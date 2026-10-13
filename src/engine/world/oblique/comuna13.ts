import { rng, grain, bayer } from '../../fx/pix';
import { Lienzo } from './lienzo';
import type { Color, Paleta } from './paleta';
import { nueva, type Pieza } from './calle';
import { drawText, textWidth } from './letras';
import { aireAcondicionado, antena } from './saigon';
import type { CtxCerca, PintorCerca } from './fachadas';

/**
 * La Comuna 13 de Medellín en el estilo `colombia_ladrillo`: las casas de ladrillo apiladas en el cerro, los murales, la
 * escalera eléctrica con techo naranja, la escalera de colores, los techos de zinc y el mirador con las letras.
 * Todo con la paleta de la ficha y la luz de la izquierda. Los murales son intensos pero van atrás o en los frentes de
 * las terrazas, nunca detrás de la franja con el valor de la ropa de los atletas.
 */

// ---------------------------------------------------------------------------------------------------------------------
// Texturas y motivos

/** Ladrillo a la vista: hiladas de 3 filas (2 de ladrillo y 1 de junta), trabadas, con ladrillos más claros y más oscuros. */
export function ladrillo(C: Lienzo, x: number, y: number, w: number, h: number, seed: number, claro = false) {
  const base: Color = claro ? 'ocre' : 'terracota', junta: Color = claro ? 'crema' : 'ocre', oscuro: Color = claro ? 'terracota' : 'vino';
  // la junta se insinúa: hiladas marcadas a medias y pocas juntas verticales, así una pared grande no hace ruido
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const X = x + i, Y = y + j, fila = Math.floor(Y / 3), enJunta = Y % 3 === 2;
    const col = Math.floor((X + (fila % 2) * 4) / 8), jv = (X + (fila % 2) * 4) % 8 === 7;
    if (enJunta) { C.p(X, Y, bayer(X, Y) < 0.5 ? junta : base); continue; }
    if (jv && grain(col, fila, seed + 5) < 0.5) { C.p(X, Y, junta); continue; }
    const g = grain(col, fila, seed + 3);
    C.p(X, Y, g < 0.07 ? oscuro : base);
  }
}

/** Repello pintado con su mugre: pared lisa de un color, más oscura abajo. */
function pintada(C: Lienzo, x: number, y: number, w: number, h: number, c: Color, seed: number) {
  C.f(x, y, w, h, c);
  const osc: Record<string, Color> = { amarillo: 'ocre', menta: 'verde', celeste: 'azul', crema: 'cemento_claro', salmon: 'terracota', canal: 'azul_noche', cemento_claro: 'cemento' };
  C.drips(x, y + 1, w, 5, osc[c] ?? 'cemento', seed, 0.18);
  for (let i = 0; i < w; i++) if (bayer(x + i, y + h - 1) < 0.5) C.p(x + i, y + h - 1, osc[c] ?? 'cemento');
}

const REJAS: Color[] = ['azul', 'verde', 'rojo', 'amarillo', 'menta', 'celeste'];

/** Ventana con reja de hierro pintada y el vidrio oscuro detrás. */
export function ventana(C: Lienzo, x: number, y: number, w: number, h: number, reja: Color) {
  C.f(x, y, w, h, 'azul_noche');
  C.hl(x + 1, y + 1, Math.max(1, w - 3), 'azul');
  for (let i = 2; i < w - 1; i += 3) C.vl(x + i, y, h, reja);
  C.hl(x, y + Math.floor(h / 2), w, reja);
  C.hl(x, y, w, reja); C.hl(x, y + h - 1, w, reja); C.vl(x, y, h, reja); C.vl(x + w - 1, y, h, reja);
  C.hl(x - 1, y + h, w + 2, 'cemento_claro');
}

/** Mata en su matera: la lata o el barro abajo y un copete de hojas. */
export function matera(C: Lienzo, x: number, y: number, seed: number, flor?: Color) {
  const lata = grain(x, y, seed) < 0.5;
  C.f(x, y - 3, 5, 3, lata ? 'cemento_claro' : 'terracota'); C.vl(x + 4, y - 3, 3, lata ? 'cemento' : 'vino');
  const R = rng(seed + x);
  for (let k = 0; k < 7; k++) { const dx = Math.floor(R() * 7) - 1, dy = Math.floor(R() * 5); C.p(x + dx, y - 4 - dy, k < 3 ? 'verde_oscuro' : 'verde'); }
  C.p(x + 1, y - 7, 'verde'); C.p(x + 3, y - 8, 'verde');
  if (flor) { C.p(x + 1, y - 6, flor); C.p(x + 4, y - 7, flor); }
}

/** La bandera de Colombia: amarillo la mitad de arriba, azul y rojo. `ola` la ondula. */
export function bandera(C: Lienzo, x: number, y: number, w: number, h: number, ola = 0) {
  const am = Math.round(h / 2), az = Math.round(h * 0.75);
  for (let i = 0; i < w; i++) {
    const dy = ola ? Math.round(Math.sin((i / w) * Math.PI * 1.5 + ola) * 1.5 * (i / w)) : 0;
    for (let j = 0; j < h; j++) C.p(x + i, y + j + dy, j < am ? 'amarillo' : j < az ? 'azul' : 'rojo');
  }
}

/** Tanque negro de plástico de los techos (el de 500 o 1000 litros), con sus anillos y la tapa. */
export function tanqueNegro(C: Lienzo, x: number, y: number, w: number, h: number) {
  const cx = x + w / 2;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const t = (i + 0.5) / w;
    C.p(x + i, y + j, t < 0.22 ? 'asfalto' : t > 0.8 ? 'tinta' : 'sombra');
  }
  for (let j = 3; j < h - 1; j += 4) C.hl(x, y + j, w, 'tinta');
  C.hl(x + 1, y - 1, w - 2, 'sombra'); C.hl(Math.round(cx - w / 4), y - 2, Math.round(w / 2), 'asfalto');
}

/** Varillas de la losa que esperan el otro piso: el sello de las casas que siguen creciendo. */
function varillas(C: Lienzo, x: number, y: number, w: number, seed: number) {
  for (let i = 1; i < w - 1; i += 5) if (grain(x + i, y, seed) < 0.6) { const n = 3 + Math.floor(grain(i, y, seed) * 4); C.vl(x + i, y - n, n, 'sombra'); }
}

/** Banderines de colores en una cuerda, de (x0, y0) a (x1, y1), con su comba. `f` mueve la punta. */
export function banderines(C: Lienzo, x0: number, y0: number, x1: number, y1: number, sag: number, f = 0) {
  const cols: Color[] = ['rojo', 'amarillo', 'azul', 'verde', 'salmon', 'oro', 'menta', 'canal'];
  const len = Math.max(1, Math.abs(x1 - x0));
  for (let i = 0; i <= len; i++) {
    const t = i / len, x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag);
    C.p(x, y, 'sombra');
    if (i % 6 === 2 && i < len - 2) {
      const c = cols[(i / 6 + x0) % cols.length | 0];
      const tip = f && (i / 6) % 2 ? 1 : 0;
      C.hl(x - 1, y + 1, 4, c); C.hl(x, y + 2, 3, c); C.hl(x + tip, y + 3, 2, c); C.p(x + 1 + tip, y + 4, c);
    }
  }
}

/** Ropa tendida en una cuerda: camisas, pantalones y toallas. `f` mueve los bordes. */
export function ropa(C: Lienzo, x: number, y: number, w: number, seed: number, f = 0) {
  C.hl(x, y, w, 'sombra');
  const cols: Color[] = ['luz', 'celeste', 'salmon', 'amarillo', 'azul', 'menta', 'rojo', 'crema'];
  const R = rng(seed);
  for (let i = 2; i < w - 6; ) {
    const tipo = Math.floor(R() * 3), c = cols[Math.floor(R() * cols.length)], pw = tipo === 1 ? 5 : 6, ph = tipo === 1 ? 9 : tipo === 2 ? 8 : 6;
    for (let j = 0; j < ph; j++) for (let k = 0; k < pw; k++) {
      if (tipo === 1 && j > 3 && k === 2) continue; // pantalón: las dos piernas
      if (tipo === 0 && j > 1 && (k === 0 || k === pw - 1) && j < 3) continue;
      C.p(x + i + k + (f && j > ph - 3 ? 1 : 0), y + 1 + j, j === ph - 1 || k === pw - 1 ? (c === 'luz' ? 'cemento_claro' : 'sombra') : c);
    }
    C.p(x + i + 1, y, 'tinta'); C.p(x + i + pw - 2, y, 'tinta');
    i += pw + 2 + Math.floor(R() * 3);
  }
}

// --- motivos de los murales

/** Colibrí de mural, de 16 x 10, mirando a la derecha (o a la izquierda con `dir` -1). */
export function colibri(C: Lienzo, x: number, y: number, dir: 1 | -1 = 1, ala = 0) {
  const S = ala
    ? ['................', '.....cc.........', '....cccc........', '...ccaa.........', '..mmmmmmv.......', '.mmmmmmmmvt.....', 'mmmmmmmms.tttttt', '.vvmmmmm........', '..v.vv..........', '................']
    : ['....aa..........', '...aaaa.........', '..aaccc.........', '...ccc..........', '..mmmmmmv.......', '.mmmmmmmmvt.....', 'mmmmmmmms.tttttt', '.vvmmmmm........', '..v.vv..........', '................'];
  const col: Record<string, Color> = { a: 'celeste', c: 'azul', m: 'menta', v: 'verde', t: 'tinta', s: 'salmon' };
  S.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') C.p(x + (dir === 1 ? i : 15 - i), y + j, col[ch]); }));
}

/** Mariposa monarca de 11 x 8. */
export function mariposa(C: Lienzo, x: number, y: number) {
  const S = ['.ooo...ooo.', 'oooot.toooo', 'oolotttolo.', '.oootttooo.', '..ootttoo..', '.ooo.t.ooo.', '.olo...olo.', '..o.....o..'];
  S.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') C.p(x + i, y + j, ch === 'o' ? 'oro' : ch === 'l' ? 'luz' : 'tinta'); }));
}

/** Flor de mural: pétalos alrededor del centro amarillo. */
export function florMural(C: Lienzo, cx: number, cy: number, r: number, c: Color) {
  for (let a = 0; a < 6; a++) { const t = (a / 6) * Math.PI * 2; C.d(Math.round(cx + Math.cos(t) * r), Math.round(cy + Math.sin(t) * r), Math.max(1, r * 0.7), c); }
  C.d(cx, cy, Math.max(1, r * 0.55), 'amarillo'); C.p(cx, cy, 'oro');
}

/** El ojo gigante de los murales de la 13: almendra con el iris azul y el maquillaje de colores. */
export function ojoMural(C: Lienzo, cx: number, cy: number, w: number) {
  const h = Math.round(w * 0.42);
  for (let j = -h; j <= h; j++) for (let i = -w; i <= w; i++) {
    const t = Math.abs(i) / w, borde = h * (1 - t * t);
    if (Math.abs(j) > borde + 2.5) continue;
    const X = cx + i, Y = cy + j;
    if (Math.abs(j) > borde) C.p(X, Y, j < 0 ? 'canal' : 'salmon');
    else if (Math.abs(j) > borde - 1) C.p(X, Y, 'tinta');
    else C.p(X, Y, 'luz');
  }
  const r = Math.round(h * 0.85);
  C.d(cx, cy, r, 'azul'); C.d(cx, cy, r - 1, 'celeste'); C.d(cx - 1, cy + 1, Math.max(1, r - 3), 'azul'); C.d(cx, cy, Math.max(1, Math.round(r * 0.45)), 'tinta');
  C.p(cx - Math.round(r / 2), cy - Math.round(r / 2), 'luz'); C.p(cx - Math.round(r / 2) + 1, cy - Math.round(r / 2), 'luz');
  for (let i = -w + 3; i < w - 2; i += 3) { const t = Math.abs(i) / w; C.p(cx + i, Math.round(cy - h * (1 - t * t)) - 2, 'tinta'); }
}

/** Cara de mural de perfil, de `h` de alto: piel cálida, pelo violeta y azul, y el ojo cerrado mirando arriba. */
export function caraMural(C: Lienzo, x: number, y: number, h: number, dir: 1 | -1 = 1) {
  const w = Math.round(h * 0.7);
  const px = (i: number) => (dir === 1 ? x + i : x + w - 1 - i);
  for (let j = 0; j < h; j++) {
    const t = j / h;
    // perfil: frente, nariz, boca y mentón
    const nariz = t > 0.38 && t < 0.56 ? Math.round((1 - Math.abs(t - 0.47) / 0.09) * h * 0.08) : 0;
    const boca = t > 0.62 && t < 0.72 ? -1 : 0;
    const cara = Math.round(w * (t < 0.15 ? 0.55 + t : t > 0.8 ? 0.7 - (t - 0.8) * 1.6 : 0.7)) + nariz + boca;
    const pelo = Math.round(w * (t < 0.5 ? 0.62 : 0.4 - (t - 0.5) * 0.6));
    for (let i = 0; i < w; i++) {
      if (i < w - cara) { if (i >= w - cara - pelo && t < 0.8) C.p(px(i), y + j, (i + j) % 5 < 2 ? 'azul' : 'canal'); continue; }
      const luz = i > w - cara + Math.round(cara * 0.55);
      C.p(px(i), y + j, i === w - cara ? 'vino' : luz ? 'ocre' : 'terracota');
    }
  }
  // el ojo y la ceja
  const ex = w - Math.round(w * 0.45), ey = Math.round(h * 0.36);
  C.hl(px(ex), y + ey, 1, 'tinta'); C.p(px(ex + 1), y + ey, 'tinta'); C.p(px(ex + 2), y + ey - 1, 'tinta'); C.p(px(ex + 3), y + ey - 1, 'tinta');
  C.p(px(ex + 1), y + ey - 3, 'vino'); C.p(px(ex + 2), y + ey - 3, 'vino'); C.p(px(ex + 3), y + ey - 4, 'vino');
  // labios
  const ly = Math.round(h * 0.66);
  C.p(px(w - 2), y + ly, 'salmon'); C.p(px(w - 3), y + ly, 'salmon'); C.p(px(w - 2), y + ly + 1, 'rojo');
}

/** Texto grande con la letra de 3 x 5 agrandada `sx` x `sy`, con contorno. Devuelve el ancho. */
export function textoGrande(C: Lienzo, x: number, y: number, texto: string, relleno: Color | Color[], borde: Color, sx = 2, sy = 2, sombra?: Color) {
  const T = new Lienzo(textWidth(texto) + 2, 12, C.pal);
  drawText(T, 0, 0, texto, 'luz');
  // la fila de la letra: drawText pone las mayúsculas entre las filas 4 y 8
  let ancho = 0;
  const cols = Array.isArray(relleno) ? relleno : [relleno];
  for (let j = 0; j < T.h; j++) for (let i = 0; i < T.w; i++) {
    if (!T.has(i, j)) continue;
    // el color de cada letra (contando columnas de 4)
    const c = cols[Math.floor(i / 4) % cols.length];
    for (let b = 0; b < sy; b++) for (let a = 0; a < sx; a++) {
      const X = x + i * sx + a, Y = y + (j - 4) * sy + b;
      C.p(X, Y, c);
      ancho = Math.max(ancho, i * sx + a + 1);
    }
  }
  // contorno y sombra: donde no hay letra y hay letra al lado
  const marca = new Set<number>();
  for (let j = 0; j < T.h; j++) for (let i = 0; i < T.w; i++) if (T.has(i, j)) for (let b = 0; b < sy; b++) for (let a = 0; a < sx; a++) marca.add((y + (j - 4) * sy + b) * 100000 + x + i * sx + a);
  const es = (X: number, Y: number) => marca.has(Y * 100000 + X);
  for (const k of marca) {
    const X = k % 100000, Y = Math.floor(k / 100000);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!es(X + dx, Y + dy)) C.p(X + dx, Y + dy, borde);
    if (sombra && !es(X + 1, Y + 1) && !es(X + 2, Y + 2)) C.p(X + 2, Y + 2, sombra);
  }
  return ancho;
}

/** Un tramo de mural sobre fondo de colores: franjas diagonales y los motivos repartidos. */
export function mural(C: Lienzo, x: number, y: number, w: number, h: number, seed: number, fondo: Color[] = ['canal', 'azul', 'salmon', 'menta']) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = Math.floor((i + j * 0.6 + seed * 7) / 22) % fondo.length;
    const k2 = (k + 1) % fondo.length;
    const t = ((i + j * 0.6 + seed * 7) % 22) / 22;
    C.p(x + i, y + j, t > 0.8 && bayer(x + i, y + j) < (t - 0.8) * 5 ? fondo[k2] : fondo[k]);
  }
  // hojas y flores sueltas
  const R = rng(seed);
  for (let n = 0; n < w / 9; n++) {
    const fx = x + 3 + Math.floor(R() * (w - 6)), fy = y + 3 + Math.floor(R() * (h - 6));
    if (R() < 0.5) florMural(C, fx, fy, 2 + Math.floor(R() * 2), (['salmon', 'amarillo', 'oro', 'luz'] as Color[])[Math.floor(R() * 4)]);
    else { C.ln(fx, fy, fx + 3, fy - 3, 'verde'); C.ln(fx + 1, fy, fx + 4, fy - 2, 'verde_oscuro'); }
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Las casas del cerro (capa cerca)

interface OpcCasa { pintada?: Color; techo: 'losa' | 'zinc' | 'teja'; tanque?: boolean; bandera?: boolean; mural?: 'ojo' | 'colibri' | 'cara' | 'mariposa'; claro?: boolean }

/** Casa de ladrillo de varios pisos, con la planta de abajo en `base`. Pisos de 22 px con su losa de concreto. */
export function casa(C: Lienzo, x: number, base: number, w: number, h: number, o: OpcCasa, seed: number) {
  const top = base - h, R = rng(seed);
  if (o.pintada) pintada(C, x, top, w, h, o.pintada, seed);
  else ladrillo(C, x, top, w, h, seed, o.claro);
  // losas y columnas de concreto
  for (let y = base - 22; y > top + 4; y -= 22) { C.hl(x, y, w, 'cemento'); C.hl(x, y + 1, w, 'cemento_claro'); }
  if (!o.pintada && w > 30) { C.f(x, top, 2, h, 'cemento'); C.vl(x, top, h, 'cemento_claro'); C.f(x + w - 2, top, 2, h, 'cemento'); }
  // ventanas y la puerta, con las rejas de colores
  for (let y = base - 22; y > top + 4; y -= 22) {
    const n = Math.max(1, Math.floor((w - 8) / 16));
    for (let k = 0; k < n; k++) {
      const vx = x + 5 + Math.floor(((w - 10) / n) * k) + Math.floor(R() * 3), vy = y + 6;
      if (vx + 9 > x + w - 3) continue;
      ventana(C, vx, vy, 9, 8, REJAS[Math.floor(R() * REJAS.length)]);
      if (R() < 0.45) for (let m = 0; m < 2; m++) matera(C, vx + m * 5, vy + 11, seed + k + m, R() < 0.5 ? 'salmon' : undefined);
    }
  }
  if (h >= 22) {
    const dx = x + Math.floor(w * 0.6), dy = base - 13;
    if (dx + 7 < x + w - 2) { C.f(dx, dy, 7, 13, REJAS[Math.floor(R() * REJAS.length)]); C.vl(dx + 6, dy, 13, 'tinta'); C.p(dx + 1, dy + 7, 'oro'); C.hl(dx - 1, dy - 1, 9, 'cemento'); }
  }
  // el mural de la pared de un lado
  if (o.mural && w >= 34 && h >= 30) {
    const mx = x + 3, my = top + 4, mw = Math.min(w - 6, 40), mh = h - 10;
    mural(C, mx, my, mw, mh, seed, ['canal', 'azul', 'menta', 'salmon']);
    if (o.mural === 'ojo') ojoMural(C, mx + Math.floor(mw / 2), my + Math.floor(mh / 2), Math.min(14, Math.floor(mw / 2) - 3));
    if (o.mural === 'colibri') colibri(C, mx + Math.floor(mw / 2) - 8, my + Math.floor(mh / 2) - 5, R() < 0.5 ? 1 : -1);
    if (o.mural === 'mariposa') mariposa(C, mx + Math.floor(mw / 2) - 5, my + Math.floor(mh / 2) - 4);
    if (o.mural === 'cara') caraMural(C, mx + 2, my + 1, Math.min(mh - 2, 40));
  }
  // la bandera de la ventana
  if (o.bandera && h > 30) bandera(C, x + w - 16, top + 8, 12, 8);
  // contorno de la casa
  C.vl(x - 1, top, h, 'vino'); C.vl(x + w, top, h, 'vino');
  // techo
  if (o.techo === 'losa') {
    C.hl(x - 1, top - 1, w + 2, 'cemento_claro'); C.hl(x - 1, top, w + 2, 'cemento');
    varillas(C, x, top - 1, w, seed);
    if (o.tanque) tanqueNegro(C, x + w - 15, top - 10, 11, 9);
    if (R() < 0.4) for (let k = 0; k < 3; k++) matera(C, x + 3 + k * 6, top - 1, seed + 9 + k, k === 1 ? 'salmon' : undefined);
  } else if (o.techo === 'zinc') {
    for (let i = -2; i < w + 3; i++) { C.p(x + i, top - 3, 'cemento_claro'); C.p(x + i, top - 2, i % 3 ? 'cemento' : 'asfalto_claro'); C.p(x + i, top - 1, 'asfalto'); }
    for (let i = 0; i < w; i += 7) if (grain(i, top, seed) < 0.5) C.p(x + i, top - 2, 'terracota');
    if (o.tanque) tanqueNegro(C, x + 4, top - 12, 11, 9);
  } else {
    for (let r = 0; r < 4; r++) for (let i = -2 + r; i < w + 3 - r; i++) C.p(x + i, top - 1 - r, r === 3 ? 'vino' : (i + r) % 3 ? 'terracota' : 'vino');
  }
}

/** Matorral del cerro entre casas: verde oscuro abajo, con luz arriba a la izquierda. */
function monte(C: Lienzo, x: number, y: number, w: number, h: number, seed: number) {
  for (let i = 0; i < w; i++) {
    const top = y + Math.round(Math.sin((x + i) * 0.21 + seed) * 2 + Math.sin((x + i) * 0.07) * 3);
    for (let j = top; j < y + h; j++) {
      const g = grain(x + i, j, seed);
      C.p(x + i, j, j < top + 2 ? (g < 0.6 ? 'verde' : 'menta') : g < 0.25 ? 'verde' : 'verde_oscuro');
    }
  }
}

/** Una hilera de casas de una grada del cerro, del rango [x0, x1), con la planta en `base`. */
function grada(C: Lienzo, x0: number, x1: number, base: number, alto: [number, number], seed: number, claro = false, murales = 0.25, banderas = 0.15) {
  const R = rng(seed);
  let x = x0 - Math.floor(R() * 20);
  while (x < x1) {
    const w = 34 + Math.floor(R() * 30), h = alto[0] + Math.floor(R() * (alto[1] - alto[0]));
    const r = R();
    const o: OpcCasa = {
      pintada: r < 0.28 ? (['amarillo', 'menta', 'celeste', 'crema', 'salmon'] as Color[])[Math.floor(R() * 5)] : undefined,
      techo: R() < 0.55 ? 'losa' : R() < 0.7 ? 'zinc' : 'teja',
      tanque: R() < 0.45,
      bandera: R() < banderas,
      mural: R() < murales ? (['ojo', 'colibri', 'mariposa', 'cara'] as const)[Math.floor(R() * 4)] : undefined,
      claro,
    };
    casa(C, x, base, w, h, o, seed + x);
    x += w + (R() < 0.3 ? 4 + Math.floor(R() * 10) : 1);
  }
}

/** El cerro de casas apiladas: tres gradas, de la de más arriba a la de abajo, con monte entre una y otra. */
function cerroDeCasas(C: Lienzo, x0: number, x1: number, base: number, seed: number, o: { murales?: number; arriba?: number } = {}) {
  const arriba = o.arriba ?? 0;
  monte(C, x0, 52 - arriba, x1 - x0, base - 52 + arriba, seed + 1);
  grada(C, x0, x1, 78 - arriba, [26, 40], seed + 2, true, 0.1, 0.1);
  monte(C, x0, 82 - arriba, x1 - x0, 14, seed + 3);
  grada(C, x0, x1, 138 - arriba, [36, 56], seed + 4, false, o.murales ?? 0.25, 0.2);
  monte(C, x0, 140 - arriba, x1 - x0, 10, seed + 5);
  grada(C, x0, x1, base, [44, 62], seed + 6, false, o.murales ?? 0.25, 0.15);
}

/** Estación San Javier del metro: el andén elevado de concreto, el letrero y el metrocable que sale. */
const estacion: PintorCerca = (C, x0, x1, base, ctx) => {
  // el valle abierto detrás, con matas y la baranda del borde
  monte(C, x0, base - 34, x1 - x0, 34, ctx.seed + 11);
  for (let x = x0; x < x1; x += 4) C.vl(x, base - 44, 10, 'sombra');
  C.hl(x0, base - 44, x1 - x0, 'tinta'); C.hl(x0, base - 40, x1 - x0, 'sombra');
  // el edificio de la estación
  const ex = x0 + 104, ew = 260, techo = base - 118;
  C.f(ex, techo + 14, ew, base - techo - 14, 'cemento_claro');
  for (let x = ex + 8; x < ex + ew - 10; x += 34) { C.f(x, techo + 14, 6, base - techo - 14, 'cemento'); C.vl(x, techo + 14, base - techo - 14, 'luz'); }
  // los vidrios del hall
  for (let x = ex + 14; x < ex + ew - 30; x += 34) {
    C.f(x, techo + 40, 28, base - techo - 52, 'azul_noche');
    for (let y = techo + 41; y < base - 13; y++) if ((x + y) % 9 === 0) C.ln(x + 2, y, x + 8, y - 6, 'azul');
    C.hl(x, techo + 40, 28, 'cemento'); C.vl(x + 14, techo + 40, base - techo - 52, 'cemento');
  }
  // la losa del techo en voladizo, con su canto
  C.f(ex - 10, techo, ew + 24, 14, 'cemento'); C.hl(ex - 10, techo, ew + 24, 'luz'); C.hl(ex - 10, techo + 1, ew + 24, 'cemento_claro'); C.hl(ex - 10, techo + 13, ew + 24, 'asfalto');
  // el letrero negro con el nombre, y el de la línea
  const lt = 'SAN JAVIER', lw = textWidth(lt) * 2 + 30;
  C.box(ex + 16, techo + 17, lw, 20, 'tinta', 'sombra');
  C.box(ex + 19, techo + 20, 14, 14, 'verde', 'verde_oscuro'); textoGrande(C, ex + 23, techo + 23, 'M', 'luz', 'verde', 2, 2);
  textoGrande(C, ex + 38, techo + 22, lt, 'luz', 'tinta', 2, 2);
  drawText(C, ex + lw + 24, techo + 16, 'ESTACIÓN', 'tinta');
  const mt = 'METROCABLE LÍNEA J', mx = ex + ew - textWidth(mt) - 16;
  C.vl(mx + 4, techo + 14, 6, 'sombra'); C.vl(mx + textWidth(mt) + 4, techo + 14, 6, 'sombra');
  C.box(mx, techo + 20, textWidth(mt) + 10, 13, 'tinta', 'sombra'); drawText(C, mx + 5, techo + 20, mt, 'luz');
  // escaleras de la entrada con las franjas amarillas
  for (let k = 0; k < 6; k++) { C.hl(ex + ew - 60 + k * 4, base - 3 - k * 2, 30, k % 2 ? 'amarillo' : 'cemento_claro'); }
  // la torre del metrocable que sale de la estación, con la rueda
  const tx = Math.min(x1 - 30, ex + ew + 70);
  C.f(tx, base - 150, 6, 150, 'cemento'); C.vl(tx, base - 150, 150, 'cemento_claro'); C.vl(tx + 5, base - 150, 150, 'asfalto');
  for (let y = base - 140; y < base; y += 12) C.ln(tx, y, tx + 5, y + 6, 'asfalto');
  C.f(tx - 14, base - 156, 34, 5, 'asfalto'); C.hl(tx - 14, base - 156, 34, 'cemento_claro');
  C.d(tx - 10, base - 158, 3, 'tinta'); C.d(tx + 16, base - 158, 3, 'tinta');
};

/** La subida de los grafitis: el cerro de casas con más murales, el letrero LA 13 ES CULTURA y banderines. */
const grafitis: PintorCerca = (C, x0, x1, base, ctx) => {
  cerroDeCasas(C, x0, x1, base, ctx.seed + 21, { murales: 0.55 });
  // un mural enorme en la pared de una casa: la cara de perfil con el colibrí
  const mx = x0 + Math.floor((x1 - x0) * 0.35);
  C.f(mx - 2, base - 92, 112, 4, 'cemento');
  mural(C, mx, base - 88, 108, 70, ctx.seed + 5, ['canal', 'azul', 'menta', 'salmon']);
  caraMural(C, mx + 6, base - 84, 60);
  colibri(C, mx + 54, base - 70, -1);
  florMural(C, mx + 80, base - 40, 4, 'amarillo'); florMural(C, mx + 94, base - 56, 3, 'salmon');
  C.vl(mx - 1, base - 88, 70, 'vino'); C.vl(mx + 108, base - 88, 70, 'vino');
  // LA 13 ES CULTURA en una pared negra
  const lx = x1 - 90;
  C.box(lx, base - 108, 44, 48, 'tinta', 'sombra');
  textoGrande(C, lx + 5, base - 104, 'LA', 'luz', 'tinta', 2, 2); textoGrande(C, lx + 5, base - 92, '13 ES', 'luz', 'tinta', 2, 2);
  drawText(C, lx + 4, base - 82, 'CULTURA', 'amarillo');
  C.p(lx + 36, base - 102, 'oro'); C.p(lx + 38, base - 103, 'oro'); C.p(lx + 40, base - 102, 'oro'); C.hl(lx + 36, base - 101, 5, 'oro');
  // banderines de casa a casa
  for (let x = x0 + 30; x < x1 - 80; x += 150) banderines(C, x, base - 128 + ((x / 150) % 2) * 6, x + 120, base - 132, 6);
};

/** Las casas de ladrillo apiladas, con la ropa tendida y las banderas: el corazón del barrio. */
const apiladas: PintorCerca = (C, x0, x1, base, ctx) => {
  cerroDeCasas(C, x0, x1, base, ctx.seed + 31, { murales: 0.3, arriba: 6 });
  for (let x = x0 + 60; x < x1 - 60; x += 210) banderines(C, x, base - 140, x + 100, base - 146, 5);
};

/** Los techos de zinc: casas más altas (ya vamos arriba), con tanques, antenas, parabólicas y el valle detrás. */
const techosZinc: PintorCerca = (C, x0, x1, base, ctx) => {
  // solo se ve lo de arriba: las gradas de arriba del cerro
  monte(C, x0, 40, x1 - x0, base - 40, ctx.seed + 41);
  grada(C, x0, x1, 70, [24, 36], ctx.seed + 42, true, 0.1, 0.15);
  monte(C, x0, 72, x1 - x0, 10, ctx.seed + 43);
  grada(C, x0, x1, 120, [34, 50], ctx.seed + 44, false, 0.2, 0.2);
  const R = rng(ctx.seed + 45);
  for (let x = x0 + 20; x < x1 - 20; x += 70 + Math.floor(R() * 60)) {
    // antena de espina de pescado o parabólica sobre las casas de abajo
    const y = 84 + Math.floor(R() * 8);
    if (R() < 0.5) { C.vl(x, y - 22, 22, 'sombra'); for (let k = 0; k < 4; k++) C.hl(x - 4 + k, y - 20 + k * 4, 9 - k * 2, 'asfalto'); }
    else { C.d(x, y - 6, 5, 'cemento_claro'); C.d(x + 1, y - 6, 3, 'cemento'); C.vl(x, y - 1, 4, 'sombra'); }
  }
};

/** El mirador: lo de atrás es el valle abierto. Solo asoman copas de árboles y la reja del borde. */
const mirador: PintorCerca = (C, x0, x1, base, ctx) => {
  const R = rng(ctx.seed + 51);
  for (let x = x0 + 10; x < x1; x += 40 + Math.floor(R() * 50)) {
    const cy = 42 + Math.floor(R() * 10), r = 10 + Math.floor(R() * 8);
    for (let k = 0; k < 6; k++) C.d(x + Math.floor(R() * r) - r / 2, cy + Math.floor(R() * 6), r * 0.6, k < 3 ? 'verde_oscuro' : 'verde');
    C.f(x - 1, cy + 6, 3, base - cy, 'vino');
  }
  monte(C, x0, 52, x1 - x0, base - 52, ctx.seed + 52);
};

/** Los pintores de la Comuna 13 por tema de `ranuras_deco`. */
export const PINTORES_C13: Record<string, PintorCerca> = {
  estacion_san_javier: estacion,
  grafitis_murales: grafitis,
  casas_ladrillo_apiladas: apiladas,
  techos_zinc_tanques: techosZinc,
  mirador_grafitis: mirador,
};
/** El fondo donde ningún tema dice nada: el cerro de casas. */
export const FONDO_C13: Record<string, PintorCerca> = { c13_casas_ladrillo: (C, x0, x1, base, ctx: CtxCerca) => cerroDeCasas(C, x0, x1, base, ctx.seed) };

// ---------------------------------------------------------------------------------------------------------------------
// Lo lejos: el Valle de Aburrá con el metrocable

/** Fila donde va el cable del metrocable en la capa lejos (y la de vuelta, 5 más abajo). */
export const CABLE_Y = 46;
/** Las torres del metrocable en la capa lejos: cada 640 px, así el cable da la vuelta sin costura. */
const TORRES = [180, 820];

/** El Valle de Aburrá: las montañas en bruma, los cerros verdes llenos de casitas, la ciudad abajo y el cable. */
export function valleAburra(pal: Paleta, w: number, h: number, seed: number): Lienzo {
  const L = new Lienzo(w, h, pal);
  // las ondas tienen periodos que dividen el ancho: dan la vuelta sin costura
  const onda = (x: number, a: number[], f: number[], ph: number[]) => a.reduce((s, ai, i) => s + ai * Math.sin((x / w) * Math.PI * 2 * f[i] + ph[i]), 0);
  // cordillera del fondo
  for (let x = 0; x < w; x++) {
    const top = Math.round(40 + onda(x, [10, 5, 2], [2, 5, 13], [0.3, 1.1, 2.0]));
    for (let y = top; y < h; y++) L.p(x, y, y < top + 2 ? 'bruma' : (y - top) % 9 === 4 && bayer(x, y) < 0.5 ? 'bruma' : 'celeste');
  }
  // cerros del medio, verdes con bruma
  for (let x = 0; x < w; x++) {
    const top = Math.round(72 + onda(x, [12, 6, 3], [3, 7, 17], [1.7, 0.4, 2.2]));
    for (let y = top; y < h; y++) L.p(x, y, y < top + 2 ? 'menta' : y < top + 6 && bayer(x, y) < 0.3 ? 'celeste' : 'verde');
    // casitas en las laderas: puntos de ladrillo
    for (let y = top + 6; y < h; y += 3) if (grain(x, y, seed) < 0.1 + (y - top) * 0.004) L.p(x, y, grain(x, y, seed + 1) < 0.5 ? 'ocre' : 'crema');
  }
  // la ciudad en el fondo del valle, con las torres del centro
  const R = rng(seed);
  for (let x = 0; x < w; x++) {
    const top = Math.round(128 + onda(x, [4, 2], [4, 11], [0.9, 1.3]));
    for (let y = top; y < h; y++) { const g = grain(x, y, seed + 2); L.p(x, y, bayer(x, y) < 0.4 ? 'bruma' : g < 0.3 ? 'ocre' : g < 0.8 ? 'cemento_claro' : 'crema'); }
  }
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(R() * (w - 10)), tw = 4 + Math.floor(R() * 6), th = 14 + Math.floor(R() * 30), gy = 140 + Math.floor(R() * 10);
    L.f(x, gy - th, tw, th, 'cemento_claro'); L.vl(x + tw - 1, gy - th, th, 'cemento');
    for (let y = gy - th + 2; y < gy - 1; y += 3) for (let xx = x + 1; xx < x + tw - 1; xx += 2) L.p(xx, y, 'celeste');
  }
  // el metrocable: torres y los dos cables de lado a lado
  for (const t of TORRES) {
    L.f(t - 1, CABLE_Y - 4, 3, 100, 'cemento'); L.vl(t + 1, CABLE_Y - 4, 100, 'asfalto');
    L.hl(t - 6, CABLE_Y - 4, 13, 'asfalto'); L.hl(t - 6, CABLE_Y - 3, 13, 'sombra');
  }
  L.hl(0, CABLE_Y - 2, w, 'sombra'); L.hl(0, CABLE_Y + 3, w, 'sombra');
  return L;
}

/** Cabina del metrocable de 12 x 14 (con el brazo), roja con la franja blanca. */
export function cabina(pal: Paleta): Lienzo {
  const L = new Lienzo(12, 14, pal);
  L.vl(5, 0, 4, 'sombra'); L.hl(3, 0, 5, 'tinta');
  L.box(1, 4, 10, 9, 'rojo', 'tinta');
  L.hl(2, 6, 8, 'azul_noche'); L.hl(2, 7, 8, 'azul_noche'); L.p(2, 6, 'cielo');
  L.hl(2, 9, 8, 'luz'); L.hl(2, 11, 8, 'vino');
  return L;
}

// ---------------------------------------------------------------------------------------------------------------------
// Las cajas del layout

export interface CtxPieza { x: number; tema?: string; meta?: number }

/** Concreto con juntas cada `paso` y grietitas: el techo de las terrazas y los descansos. */
function losa(L: Lienzo, x: number, y: number, w: number, h: number, seed: number, paso = 16, c: Color = 'cemento_claro') {
  L.f(x, y, w, h, c);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if ((i % paso === 0) || (j % 10 === 9)) L.p(x + i, y + j, 'cemento');
    else if (grain(x + i, y + j, seed) < 0.03) L.p(x + i, y + j, 'cemento');
  }
  L.hl(x, y, w, 'luz');
}

/** Carrito de paletas de mango biche con el parasol verde. */
function carritoPaletas(pal: Paleta, w: number, d: number, z: number): Pieza {
  const sobre = 26, P = nueva(pal, w, d, z, sobre), L = P.img, top = sobre, fr = top + d;
  // la tapa con las paletas y los vasos de mango
  L.f(2, top + 4, w - 4, d - 4, 'cemento_claro'); L.hl(2, top + 4, w - 4, 'luz');
  for (let i = 6; i < w - 6; i += 4) { L.vl(i, top + 6, 5, 'amarillo'); L.p(i, top + 5, 'verde'); L.vl(i + 1, top + 8, 3, 'ocre'); }
  // el cajón amarillo con el letrero
  L.f(0, fr - 2, w, z - 6, 'amarillo'); L.hl(0, fr - 2, w, 'crema'); L.vl(w - 1, fr - 2, z - 6, 'ocre'); L.hl(0, fr + z - 9, w, 'ocre');
  L.box(4, fr + 1, w - 8, 9, 'verde', 'verde_oscuro'); drawText(L, Math.floor((w - textWidth('MANGO')) / 2), fr - 1, 'MANGO', 'amarillo');
  L.d(8, fr + z - 3, 3, 'tinta'); L.d(8, fr + z - 3, 1, 'cemento'); L.d(w - 9, fr + z - 3, 3, 'tinta'); L.d(w - 9, fr + z - 3, 1, 'cemento');
  // el parasol
  const cx = Math.floor(w / 2);
  L.vl(cx, 6, top + 6, 'cemento');
  for (let j = 0; j < 8; j++) { const hw = 6 + j * 3; L.hl(cx - hw, 2 + j, hw * 2, j < 2 ? 'menta' : j === 7 ? 'verde_oscuro' : (j % 3 === 0 ? 'menta' : 'verde')); }
  L.hl(cx - 27, 10, 54, 'verde_oscuro');
  for (let i = cx - 26; i < cx + 27; i += 6) L.p(i, 11, 'verde');
  return P;
}

/** Escalón de concreto de la estación con la franja amarilla en la nariz. */
function escalonAmarillo(pal: Paleta, w: number, d: number, z: number): Pieza {
  const P = nueva(pal, w, d, z), L = P.img;
  losa(L, 0, 0, w, d, 3, 99, 'cemento_claro');
  L.vl(w - 2, 0, d, 'amarillo'); L.vl(w - 1, 0, d, 'ocre');
  L.f(0, d, w, z, 'cemento'); L.hl(0, d, w, 'amarillo'); L.hl(0, d + z - 1, w, 'asfalto');
  return P;
}

/** El frente de una terraza: el muro de contención de ladrillo con su mural, matas arriba y la baranda. */
function frenteTerraza(L: Lienzo, y0: number, w: number, z: number, seed: number, tema: string | undefined, x0: number) {
  if (tema === 'grafitis_murales') {
    // el muro largo de COMUNA 13: el mural corrido con la cara, el colibrí, las letras y la mariposa
    mural(L, 0, y0, w, z, seed, ['canal', 'azul', 'canal', 'menta']);
    for (let x = 30; x < w - 40; x += 140) colibri(L, x, y0 + Math.max(2, Math.floor(z / 2) - 6), 1);
    for (let x = 90; x < w - 20; x += 160) mariposa(L, x, y0 + Math.max(1, Math.floor(z / 2) - 5));
    const t = 'COMUNA 13', tw = textWidth(t) * 2;
    textoGrande(L, Math.floor(w / 2) - Math.floor(tw / 2), y0 + Math.max(2, Math.floor(z / 2) - 5), t, 'amarillo', 'tinta', 2, 2, 'vino');
    L.hl(0, y0, w, 'cemento_claro');
    return;
  }
  ladrillo(L, 0, y0, w, z, seed);
  // franja de concreto arriba (el borde de la terraza) y el pie
  L.hl(0, y0, w, 'luz'); L.f(0, y0 + 1, w, 2, 'cemento_claro'); L.hl(0, y0 + 3, w, 'cemento');
  if (z >= 40 && tema !== 'mirador_grafitis') {
    // murales en tramos, con ladrillo a la vista entre uno y otro
    const R = rng(seed + x0);
    for (let x = 16 + Math.floor(R() * 30); x < w - 70; x += 150 + Math.floor(R() * 90)) {
      const mw = 80 + Math.floor(R() * 50), mh = z - 14, my = y0 + 8;
      if (x + mw > w - 6) break;
      const fondo: Color[] = R() < 0.5 ? ['canal', 'azul', 'menta', 'salmon'] : ['salmon', 'oro', 'canal', 'azul'], k = Math.floor(R() * 4);
      L.f(x - 1, my - 1, mw + 2, mh + 2, 'tinta');
      mural(L, x, my, mw, mh, seed + x, fondo);
      if (k === 0) ojoMural(L, x + Math.floor(mw / 2), my + Math.floor(mh / 2), Math.min(16, Math.floor(mh / 2) - 2));
      else if (k === 1) { colibri(L, x + 8, my + 6, 1); colibri(L, x + mw - 26, my + mh - 16, -1); florMural(L, x + mw - 14, my + 8, 4, 'salmon'); }
      else if (k === 2) { mariposa(L, x + Math.floor(mw / 2) - 5, my + 6); florMural(L, x + 12, my + mh - 10, 4, 'amarillo'); }
      else caraMural(L, x + 4, my + 2, Math.min(mh - 4, 48), 1);
    }
  }
  if (tema === 'mirador_grafitis' && z >= 60) {
    // el mural del mirador: Aquí se sueña en grande
    // dos murales chicos a los lados y el grande en el medio
    for (const [mx2, k] of [[40, 0], [w - 170, 1]] as [number, number][]) {
      L.f(mx2 - 1, y0 + 15, 122, z - 38, 'tinta'); mural(L, mx2, y0 + 16, 120, z - 40, seed + mx2, k ? ['salmon', 'oro', 'canal', 'azul'] : ['canal', 'azul', 'menta', 'salmon']);
      if (k) ojoMural(L, mx2 + 60, y0 + 16 + Math.floor((z - 40) / 2), 18); else caraMural(L, mx2 + 6, y0 + 20, Math.min(z - 48, 60));
    }
    const mx = Math.floor(w * 0.42), mw = 200, my = y0 + 12, mh = Math.min(z - 24, 90);
    L.f(mx - 2, my - 2, mw + 4, mh + 4, 'tinta');
    mural(L, mx, my, mw, mh, seed + 7, ['azul', 'canal', 'menta', 'azul']);
    textoGrande(L, mx + 10, my + 12, 'AQUÍ SE SUEÑA', 'luz', 'azul_noche', 2, 2);
    textoGrande(L, mx + 10, my + 30, 'EN GRANDE', 'amarillo', 'azul_noche', 2, 2);
    colibri(L, mx + mw - 40, my + 14, -1); florMural(L, mx + mw - 20, my + mh - 16, 6, 'salmon'); florMural(L, mx + 30, my + mh - 12, 5, 'amarillo');
  }
  // matas en la orilla de arriba
  for (let x = 6; x < w - 6; x += 23) if (grain(x, z, seed) < 0.6) matera(L, x, y0 + 1, seed + x, grain(x, 1, seed) < 0.5 ? 'salmon' : undefined);
  L.hl(0, y0 + z - 1, w, 'vino');
}

/** Adoquín de concreto en losetas de 24 x 12, unas un tono más gastadas, con su junta. */
function adoquin(L: Lienzo, x: number, y: number, w: number, h: number, seed: number) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const fila = Math.floor(j / 12), col = Math.floor((i + (fila % 2) * 12) / 24);
    const junta = j % 12 === 11 || (i + (fila % 2) * 12) % 24 === 23;
    const gastada = grain(col, fila, seed) < 0.3;
    L.p(x + i, y + j, junta ? 'cemento' : gastada && bayer(x + i, y + j) < 0.25 ? 'cemento' : 'cemento_claro');
  }
}

/** Una flor grande pintada en el piso (como las de la 13), aplastada por la vista: pétalos de colores y el centro. */
function pisoPintado(L: Lienzo, cx: number, cy: number, seed: number) {
  const cols: Color[] = ['salmon', 'menta', 'amarillo', 'celeste', 'oro', 'canal'];
  const R = rng(seed);
  for (let a = 0; a < 6; a++) {
    const t = (a / 6) * Math.PI * 2, c = cols[Math.floor(R() * cols.length)];
    const px = Math.round(cx + Math.cos(t) * 11), py = Math.round(cy + Math.sin(t) * 6);
    for (let j = -3; j <= 3; j++) for (let i = -6; i <= 6; i++) if ((i * i) / 36 + (j * j) / 9 <= 1) L.p(px + i, py + j, c);
  }
  for (let j = -3; j <= 3; j++) for (let i = -5; i <= 5; i++) if ((i * i) / 25 + (j * j) / 9 <= 1) L.p(cx + i, cy + j, 'amarillo');
}

/** Terraza: el techo de concreto por donde se corre y el muro de adelante. */
function terraza(pal: Paleta, w: number, d: number, z: number, seed: number, c: CtxPieza): Pieza {
  const mir = c.tema === 'mirador_grafitis';
  const sobre = 12, P = nueva(pal, w, d, z, sobre), L = P.img, top = sobre;
  if (mir) {
    // la plaza del mirador: adoquín gris y crema con dibujos de colores pintados en el piso
    for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) {
      const a = (Math.floor(i / 6) + Math.floor(j / 4)) % 2;
      L.p(i, top + j, (i % 6 === 0 || j % 4 === 0) ? 'cemento' : a ? 'cemento_claro' : 'crema');
    }
    const cols: Color[] = ['rojo', 'oro', 'amarillo', 'verde', 'celeste', 'canal'];
    for (let k = 0; k < cols.length; k++) L.f(140 + k * 10, top + 70, 9, 6, cols[k]);
    // la reja del borde, con el valle detrás
    for (let x = 0; x < w; x += 5) L.vl(x, 2, sobre - 2, 'sombra');
    L.hl(0, 2, w, 'tinta'); L.hl(0, 3, w, 'asfalto'); L.hl(0, 8, w, 'sombra');
    // bancas y materas
    for (let x = 60; x < w - 40; x += 180) { L.f(x, top + 40, 26, 3, 'ocre'); L.hl(x, top + 43, 26, 'terracota'); L.vl(x + 2, top + 44, 3, 'sombra'); L.vl(x + 23, top + 44, 3, 'sombra'); }
    for (let x = 30; x < w; x += 120) { L.f(x, top + 4, 10, 6, 'cemento'); matera(L, x + 2, top + 4, seed + x, 'salmon'); matera(L, x + 6, top + 5, seed + x + 1); }
  } else {
    adoquin(L, 0, top, w, d, seed);
    if (c.tema === 'grafitis_murales') {
      // las flores pintadas en el piso de la subida
      for (let x = 50; x < w - 30; x += 130) pisoPintado(L, x, top + 40 + Math.floor(grain(x, 1, seed) * 40), seed + x);
    } else {
      // el callejón: la cuneta del medio, tapas y parches de cemento nuevo
      L.hl(0, top + Math.floor(d / 2), w, 'cemento'); L.hl(0, top + Math.floor(d / 2) + 1, w, 'asfalto_claro');
      for (let i = 30; i < w; i += 160) { L.box(i, top + 86, 10, 5, 'asfalto_claro', 'asfalto'); L.hl(i + 2, top + 88, 6, 'asfalto'); }
      for (let i = 70; i < w; i += 110) L.f(i, top + 20 + Math.floor(grain(i, 7, seed) * 80), 16, 7, 'cemento_claro');
    }
    // el murito de atrás con las matas, y su sombra en el piso
    for (let x = 0; x < w; x++) for (let j = 0; j < 4; j++) if (bayer(x, j) < 0.5 - j * 0.12) L.p(x, top + j, 'cemento');
    L.f(0, top - 7, w, 7, 'cemento_claro'); L.hl(0, top - 7, w, 'luz'); L.hl(0, top - 1, w, 'cemento');
    for (let x = 4; x < w - 6; x += 9) if (grain(x, 2, seed) < 0.55) matera(L, x, top - 6, seed + x, grain(x, 5, seed) < 0.35 ? 'salmon' : grain(x, 6, seed) < 0.2 ? 'amarillo' : undefined);
  }
  frenteTerraza(L, top + d, w, z, seed, c.tema, c.x);
  return P;
}

/** Muro de grafitis: franjas de colores por altura (la cara de la izquierda las sigue) y un grafiti encima. */
function muroGrafiti(pal: Paleta, w: number, d: number, z: number, seed: number): Pieza {
  const P = nueva(pal, w, d, z), L = P.img;
  L.f(0, 0, w, d, 'cemento'); L.vl(0, 0, d, 'cemento_claro');
  const bandas: Color[] = ['canal', 'salmon', 'amarillo', 'menta', 'azul'];
  for (let h = 0; h < z; h++) L.hl(0, d + h, w, bandas[Math.floor((h / z) * bandas.length)]);
  for (let h = 2; h < z - 2; h += 7) { L.p(3 + (h % 5), d + h, 'tinta'); L.p(5 + (h % 4), d + h + 1, 'luz'); }
  L.speckle(0, 0, w, d, 'cemento_claro', 0.08, seed);
  L.hl(0, d, w, 'cemento_claro'); L.hl(0, d + z - 1, w, 'tinta');
  return P;
}

/** Un escalón de la escalera eléctrica: el peldaño de aluminio con sus estrías y el borde amarillo. `f` corre las estrías. */
export function peldano(L: Lienzo, x: number, y: number, w: number, d: number, f = 0) {
  L.f(x, y, w, d, 'asfalto');
  for (let i = 0; i < w; i++) if ((i + f) % 3 === 0) L.vl(x + i, y, d, 'sombra');
  L.vl(x + w - 1, y, d, 'amarillo'); L.vl(x, y, d, 'asfalto_claro');
}

/** Escalera eléctrica: peldaño de metal y el costado de aluminio con el vidrio y el pasamanos negro, que sube. */
function escaleraElectrica(pal: Paleta, w: number, d: number, z: number): Pieza {
  const sobre = 0, P = nueva(pal, w, d, z, sobre), L = P.img;
  peldano(L, 0, 0, w, d);
  // el vidrio del costado de adelante, que sube con el tramo: 14 px de vidrio y el pasamanos arriba
  // el vidrio sube 6 px por peldaño (lo que sube la escalera), así de un peldaño al otro el pasamanos sigue derecho
  for (let i = 0; i < w; i++) {
    const alto = 12 + Math.round((6 * i) / w), y1 = d - 1;
    for (let j = 0; j < alto; j++) L.p(i, y1 - j, (i * 2 + j) % 11 === 0 ? 'luz' : bayer(i, j) < 0.5 ? 'cielo' : 'celeste');
    L.p(i, y1 - alto, 'tinta'); L.p(i, y1 - alto - 1, 'tinta'); L.p(i, y1 - alto + 1, 'cemento');
  }
  // el costado: aluminio
  L.f(0, d, w, z, 'cemento'); L.hl(0, d, w, 'cemento_claro'); L.hl(0, d + 1, w, 'luz');
  for (let y = d + 6; y < d + z; y += 8) L.hl(0, y, w, 'asfalto_claro');
  return P;
}

/** Escalones de concreto al lado de la escalera eléctrica, con el pasamanos de tubo. */
function escalonesConcreto(pal: Paleta, w: number, d: number, z: number, seed: number): Pieza {
  const P = nueva(pal, w, d, z, 10), L = P.img, top = 10;
  losa(L, 0, top, w, d, seed, 99);
  L.vl(Math.floor(w / 2), top, d, 'cemento'); L.vl(Math.floor(w / 2) + 1, top, d, 'luz');
  // pasamanos de tubo en el borde de adelante
  L.hl(0, top + d - 10, w, 'cemento_claro'); L.hl(0, top + d - 9, w, 'asfalto');
  for (let x = 2; x < w; x += 15) L.vl(x, top + d - 9, 9, 'asfalto');
  L.f(0, top + d, w, z, 'cemento'); L.hl(0, top + d, w, 'cemento_claro');
  for (let y = top + d + 6; y < top + d + z; y += 6) L.hl(0, y, w, grain(0, y, seed) < 0.5 ? 'cemento_claro' : 'asfalto_claro');
  return P;
}

/** Tanque negro sobre su base: la caja del layout. */
function tanqueCaja(pal: Paleta, w: number, d: number, z: number): Pieza {
  const sobre = 2, P = nueva(pal, w, d, z, sobre), L = P.img;
  const cx = w / 2, rx = w / 2 - 1, ry = d / 2 - 1;
  for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) { const dx = (i - cx + 0.5) / rx, dy = (j - d / 2 + 0.5) / ry; if (dx * dx + dy * dy <= 1) L.p(i, sobre + j, dx * dx + dy * dy > 0.7 ? 'sombra' : 'asfalto'); }
  L.d(Math.round(cx), sobre + Math.round(d / 2), 4, 'tinta'); L.d(Math.round(cx) - 1, sobre + Math.round(d / 2) - 1, 2, 'sombra');
  tanqueNegro(L, 0, sobre + Math.round(d / 2), w, z + Math.round(d / 2));
  return P;
}

/** Techo de zinc: láminas onduladas con su óxido, y abajo la casa de ladrillo con sus ventanas. */
function techoLata(pal: Paleta, w: number, d: number, z: number, seed: number): Pieza {
  const P = nueva(pal, w, d, z), L = P.img;
  for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) {
    const m = i % 4;
    L.p(i, j, m === 0 ? 'asfalto_claro' : m === 1 ? 'cemento_claro' : m === 3 ? 'cemento' : 'cemento_claro');
  }
  // traslapes de lámina, tornillos y óxido
  for (let j = 30; j < d; j += 32) { L.hl(0, j, w, 'asfalto_claro'); for (let i = 2; i < w; i += 8) L.p(i, j + 1, 'sombra'); }
  // láminas de distinta edad: unas nuevas más claras, otras con óxido en manchas
  const R = rng(seed);
  for (let x = 0; x < w; ) {
    const lw = 24 + Math.floor(R() * 30), vieja = R() < 0.4;
    if (vieja) for (let j = 0; j < d; j++) for (let i = x; i < Math.min(w, x + lw); i++) {
      const g = grain(Math.floor(i / 2), Math.floor(j / 3), seed);
      if (g < 0.06) L.p(i, j, 'terracota'); else if (g < 0.14 && i % 4 !== 0) L.p(i, j, 'ocre');
      else if (i % 4 === 2) L.p(i, j, 'cemento');
    }
    L.vl(x, 0, d, 'asfalto');
    x += lw;
  }
  L.hl(0, 0, w, 'luz');
  // el canto de la lámina y las casas de abajo: tramos de ladrillo y de repello pintado, con columnas de concreto
  L.hl(0, d, w, 'cemento_claro'); L.hl(0, d + 1, w, 'asfalto');
  for (let x = 0; x < w; ) {
    const cw = Math.min(w - x, 50 + Math.floor(R() * 50)), r = R();
    if (r < 0.45) ladrillo(L, x, d + 2, cw, z - 2, seed + x);
    else pintada(L, x, d + 2, cw, z - 2, (['amarillo', 'menta', 'celeste', 'crema', 'salmon'] as Color[])[Math.floor(R() * 5)], seed + x);
    L.f(x, d + 2, 2, z - 2, 'cemento'); L.vl(x, d + 2, z - 2, 'cemento_claro');
    for (let y = d + 8; y < d + z - 14; y += 24) {
      const vx = x + 8 + Math.floor(R() * Math.max(1, cw - 26));
      ventana(L, vx, y, 10, 9, REJAS[Math.floor(R() * REJAS.length)]);
      if (R() < 0.5) { matera(L, vx, y + 12, seed + x + y, 'salmon'); matera(L, vx + 5, y + 12, seed + x + y + 1); }
    }
    for (let y = d + 24; y < d + z - 4; y += 24) L.hl(x, y, cw, 'cemento');
    x += cw;
  }
  if (z > 50 && w > 200) { const mx = Math.floor(w * 0.55); L.f(mx - 1, d + 9, 62, z - 28, 'tinta'); mural(L, mx, d + 10, 60, z - 30, seed + 3); caraMural(L, mx + 4, d + 12, Math.min(z - 34, 44), 1); }
  L.hl(0, d + z - 1, w, 'vino');
  return P;
}

/** Baranda: la pasarela de lámina sobre el hueco, con la reja a los dos lados. */
function baranda(pal: Paleta, w: number, d: number, z: number): Pieza {
  const sobre = 10, P = nueva(pal, w, d, z, sobre), L = P.img, top = sobre;
  L.f(0, top, w, d, 'asfalto_claro');
  for (let i = 0; i < w; i += 3) L.vl(i, top, d, 'asfalto');
  // la reja de atrás (sobre el techo) y la de adelante
  for (const y of [top - 1, top + d - 1]) { L.hl(0, y - 8, w, 'tinta'); L.hl(0, y - 7, w, 'sombra'); for (let x = 0; x < w; x += 4) L.vl(x, y - 8, 9, 'sombra'); }
  // la viga de abajo
  L.f(0, top + d, w, Math.min(z, 6), 'sombra'); L.hl(0, top + d, w, 'asfalto');
  return P;
}

/** La escalera pintada de colores: cada peldaño ancho lleva franjas del arcoíris y su contrahuella de un color. */
function escaleraPintada(pal: Paleta, w: number, d: number, z: number, seed: number, c: CtxPieza): Pieza {
  const P = nueva(pal, w, d, z), L = P.img;
  const cols: Color[] = ['rojo', 'oro', 'amarillo', 'verde', 'celeste', 'azul', 'canal', 'salmon'];
  const i0 = Math.floor(c.x / 8);
  for (let i = 0; i < w; i++) {
    const k = (i0 + Math.floor(i / 8)) % cols.length, borde = i % 8 === 7;
    L.vl(i, 0, d, borde ? 'luz' : cols[k]);
  }
  for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) if (grain(i, j, seed) < 0.04) L.p(i, j, 'cemento_claro');
  // el frente: la contrahuella de color (lo que se ve de lado) y el concreto de abajo
  const k = cols[(i0 + Math.floor(w / 8)) % cols.length];
  L.f(0, d, w, Math.min(12, z), k); L.hl(0, d, w, 'luz');
  if (z > 12) { L.f(0, d + 12, w, z - 12, 'cemento'); L.hl(0, d + 12, w, 'asfalto_claro'); }
  for (let y = d + 18; y < d + z; y += 10) L.hl(0, y, w, 'cemento_claro');
  return P;
}

/** Las letras gigantes de COMUNA 13: cada una de un color, con su espesor y una base oscura. */
function letrasComuna(pal: Paleta, w: number, d: number, z: number): Pieza {
  const vis = Math.min(z, 44), P = nueva(pal, w, d, z), L = P.img;
  const fr = d + z - vis; // la fila donde empieza lo que se ve por encima del mirador
  const texto = 'COMUNA 13', cols: Color[] = ['oro', 'salmon', 'canal', 'verde', 'azul', 'rojo', 'luz', 'celeste', 'amarillo'];
  const n = texto.length, cw = Math.floor(w / n), sx = Math.max(2, Math.floor((cw - 3) / 3)), sy = Math.floor((vis - 10) / 5);
  L.f(0, fr + vis - 7, w, 7, 'sombra'); L.hl(0, fr + vis - 7, w, 'asfalto'); L.hl(0, fr + vis - 1, w, 'tinta');
  const OSC: Partial<Record<Color, Color>> = { oro: 'terracota', salmon: 'vino', canal: 'azul_noche', verde: 'verde_oscuro', azul: 'azul_noche', rojo: 'vino', luz: 'cemento', celeste: 'azul', amarillo: 'ocre' };
  for (let k = 0; k < n; k++) {
    if (texto[k] === ' ') continue;
    const T = new Lienzo(5, 12, pal);
    drawText(T, 0, 0, texto[k], 'luz');
    const x0 = k * cw + Math.floor((cw - 3 * sx) / 2), y0 = fr + 3, c = cols[k];
    const lleno = (i: number, j: number) => i >= 0 && i < 3 && j >= 4 && j <= 8 && T.has(i, j);
    // el espesor (corrido arriba a la derecha), el contorno y la cara de la letra
    for (let j = 4; j <= 8; j++) for (let i = 0; i < 3; i++) if (lleno(i, j)) L.f(x0 + i * sx + 2, y0 + (j - 4) * sy - 2, sx, sy, OSC[c] ?? 'sombra');
    for (let j = 4; j <= 8; j++) for (let i = 0; i < 3; i++) if (lleno(i, j)) L.f(x0 + i * sx - 1, y0 + (j - 4) * sy - 1, sx + 2, sy + 2, 'tinta');
    for (let j = 4; j <= 8; j++) for (let i = 0; i < 3; i++) if (lleno(i, j)) {
      L.f(x0 + i * sx, y0 + (j - 4) * sy, sx, sy, c);
      if (!lleno(i, j - 1)) L.hl(x0 + i * sx, y0 + (j - 4) * sy, sx, c === 'luz' ? 'cemento_claro' : 'luz');
    }
  }
  return P;
}

/** Las cajas de la Comuna 13. null si el tipo no es de aquí (va el de Vietnam). */
export function piezaColombia(pal: Paleta, tipo: string | undefined, w: number, d: number, z: number, seed: number, c: CtxPieza): Pieza | null {
  switch (tipo) {
    case 'carrito_paletas': return carritoPaletas(pal, w, d, z);
    case 'escalon': return escalonAmarillo(pal, w, d, z);
    case 'terraza':
    case 'mirador': return terraza(pal, w, d, z, seed, { ...c, tema: tipo === 'mirador' ? 'mirador_grafitis' : c.tema });
    case 'muro_grafiti': return muroGrafiti(pal, w, d, z, seed);
    case 'escalera_electrica': return escaleraElectrica(pal, w, d, z);
    case 'escalones': return escalonesConcreto(pal, w, d, z, seed);
    case 'tanque_agua': return tanqueCaja(pal, w, d, z);
    case 'techo_lata': return techoLata(pal, w, d, z, seed);
    case 'baranda': return baranda(pal, w, d, z);
    case 'escalera_pintada': return escaleraPintada(pal, w, d, z, seed, c);
    case 'letras_comuna13': return letrasComuna(pal, w, d, z);
    case 'aire_acondicionado': return aireAcondicionado(pal, w, d, z);
    default: return null;
  }
}

/** Los postes de aquí: la antena y el asta de la bandera. `null` si es el poste de luz de siempre. */
export function posteColombia(pal: Paleta, tipo: string | undefined, alto: number, seed = 1): { pieza: Pieza; cx: number } | null {
  if (tipo === 'antena') return { pieza: antena(pal, alto, seed), cx: 20 };
  if (tipo === 'asta_bandera') {
    const P = nueva(pal, 6, 0, alto + 5), L = P.img;
    L.f(2, 0, 2, alto + 5, 'cemento_claro'); L.vl(3, 0, alto + 5, 'cemento'); L.d(3, 1, 2, 'oro');
    L.f(0, alto + 1, 6, 4, 'cemento');
    return { pieza: P, cx: 3 };
  }
  return null;
}

/** La bandera del asta, ondeando: 4 cuadros de 30 x 22. */
export function banderaAsta(pal: Paleta): Lienzo[] {
  return [0, 1, 2, 3].map((f) => { const L = new Lienzo(30, 22, pal); bandera(L, 0, 2, 28, 18, f * 1.6); return L; });
}

/** Los banderines de la vida: 2 cuadros de una cuerda de `w`. */
export function banderinesVida(pal: Paleta, w: number, sag: number): Lienzo[] {
  return [0, 1].map((f) => { const L = new Lienzo(w + 4, sag + 8, pal); banderines(L, 0, 1, w, 1, sag, f); return L; });
}

/** La ropa tendida de la vida: 2 cuadros. */
export function ropaVida(pal: Paleta, w: number, seed: number): Lienzo[] {
  return [0, 1].map((f) => { const L = new Lienzo(w + 2, 12, pal); ropa(L, 0, 0, w, seed, f); return L; });
}

/** El tendedero de un `bajo`: tres cuerdas de lado a lado (a distinta profundidad) con la ropa colgada, en la vista inclinada. */
export function tendedero(pal: Paleta, w: number, y0: number, y1: number, z: number, seed: number, k: number, piso = 0): { img: Lienzo; dx: number; top: number } {
  const d = y1 - y0, palo = Math.max(6, z - piso), L = new Lienzo(w + Math.round(k * d) + 4, d + palo + 2, pal);
  for (const [n, f] of [[0, 0.15], [1, 0.5], [2, 0.85]] as [number, number][]) {
    const yy = Math.round(d * f), x = Math.round(k * yy);
    // los palos de las puntas, parados en el piso, y la cuerda
    for (const px of [x, x + w - 1]) { L.vl(px, yy - 2, palo + 2, 'asfalto'); L.p(px, yy - 3, 'sombra'); }
    ropa(L, x, yy, w, seed + n * 31);
  }
  return { img: L, dx: Math.round(k * y0), top: y0 - z };
}

/** El techo naranja de la escalera eléctrica sobre sus columnas grises, en la vista inclinada. */
export function techoEscalera(pal: Paleta, w: number, y0: number, y1: number, z: number, k: number, piso: (x: number) => number): { img: Lienzo; dx: number; top: number } {
  const d = y1 - y0, ext = Math.round(k * d), alto = z + d;
  const L = new Lienzo(w + ext + 6, alto + 4, pal);
  // columnas: en las cuatro esquinas, del techo al peldaño de abajo
  for (const [xx, yy] of [[2, 0], [w - 4, 0], [2, d - 1], [w - 4, d - 1]] as [number, number][]) {
    const px = xx + Math.round(k * yy), pyTop = yy + 6, pyBot = yy + z - piso(xx);
    for (let y = pyTop; y < pyBot; y++) { L.p(px, y, 'cemento'); L.p(px + 1, y, 'asfalto_claro'); }
  }
  // la lámina naranja ondulada, con el canto
  for (let j = 0; j < d; j++) {
    const s = Math.round(k * j);
    for (let i = -2; i < w + 2; i++) L.p(i + s + 2, j + 2, (i % 4 === 0) ? 'ocre' : j < 2 ? 'amarillo' : 'oro');
  }
  for (let i = -2; i < w + 2; i++) { L.p(i + ext + 2, d + 2, 'terracota'); L.p(i + ext + 2, d + 3, 'vino'); }
  for (let j = 0; j < d + 2; j++) L.p(Math.round(k * j) + 1, j + 2, 'vino');
  return { img: L, dx: Math.round(k * y0) - 2, top: y0 - z - 2 };
}
