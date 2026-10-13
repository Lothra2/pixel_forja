import { rng, grain, bayer } from '../../fx/pix';
import { Lienzo } from './lienzo';
import type { Color, Paleta } from './paleta';
import { drawText, textWidth } from './letras';
import { MAS_OSCURO } from './tonos';
import type { CtxCerca } from './fachadas';
import type { ObliqueLayout } from './layout';
import type { Luz, Particula, VidaEscena } from './escena';
import type { Lugar } from './lugares';

/**
 * El dojo de judo de Hà Nội en la tarde (estilo `vietnam_dojo`), en la vista inclinada de la pelea. La pared del fondo
 * es de madera clara en paneles, con los ventanales altos que dan al lago Hoàn Kiếm (la Torre de la Tortuga y el puente
 * rojo Thê Húc, en la capa lejos), la bandera de Vietnam en el centro, el letrero del club y la caligrafía en rollos. Al
 * pie de la pared, el público sentado en la banca y los judocas de judogi esperando en seiza. El piso es el tatami: la
 * zona de combate verde y la de seguridad amarilla. La luz de la tarde entra por las ventanas y cae en rayos.
 */

/** El fondo de la capa cerca del dojo. */
export const CERCA_DOJO = 'dojo_hanoi';

/** Filas de la pared: el cielo raso, el letrero, los ventanales, el alféizar y el zócalo de madera. */
const RASO = 34, VENTANA = { y0: 100, y1: 196 }, ZOCALO = 202;
/** Los ventanales, x de pantalla (de la capa cerca). La bandera va en el medio, entre el segundo y el tercero. */
export const VENTANALES = [{ x0: 30, x1: 110 }, { x0: 168, x1: 248 }, { x0: 426, x1: 506 }, { x0: 564, x1: 644 }];
/** La bandera de Vietnam en el centro de la pared. */
export const BANDERA = { x: 296, y: 120, w: 72, h: 48 };
/** Los rollos de caligrafía: x, y y el texto. */
const ROLLOS: { x: number; y: number; texto: string }[] = [{ x: 130, y: 116, texto: 'TÂM' }, { x: 524, y: 116, texto: 'NHẪN' }];
/** La banca del público: de dónde a dónde, y la fila del asiento. Thor se sienta antes, en x 70. */
export const BANCA = { x0: 104, x1: 668, asiento: 234 };

/** La zona de combate del tatami (verde), en x e y de mundo: igual a la del layout. Lo de afuera es la de seguridad. */
export const ZONA = { x0: 64, x1: 576, y0: 10, y1: 88 };

// ---------------------------------------------------------------------------------------------------------------------
// Lo lejos: el lago Hoàn Kiếm por las ventanas

/** Fila del agua del lago en la capa lejos. */
export const AGUA_LAGO = 122;
/** La Torre de la Tortuga (Tháp Rùa) y el puente Thê Húc en la capa lejos (x en pixeles de lejos.png). */
export const TORRE = { x: 494, base: AGUA_LAGO + 8 };
export const PUENTE_THE_HUC = { x0: 150, x1: 262 };

/** Un sauce llorón de la orilla: el tronco y las ramas que caen en cortinas. */
function sauce(L: Lienzo, x: number, base: number, alto: number, seed: number) {
  const R = rng(seed), X = (v: number) => ((v % L.w) + L.w) % L.w;
  for (let j = 0; j < alto; j++) { L.p(X(x + Math.round(Math.sin(j / 9) * 2)), base - j, 'asfalto'); L.p(X(x + 1 + Math.round(Math.sin(j / 9) * 2)), base - j, 'sombra'); }
  const top = base - alto;
  for (let k = 0; k < 26; k++) {
    const a = (R() - 0.5) * Math.PI * 0.9, r = 6 + R() * 22, cx = x + Math.round(Math.sin(a) * r * 1.4), cy = top + Math.round((1 - Math.cos(a)) * r * 0.5) - 4;
    const largo = 10 + Math.floor(R() * 26);
    for (let j = 0; j < largo; j++) {
      const px = X(cx + Math.round(Math.sin(j / 6 + k) * 1)), py = cy + j;
      L.p(px, py, j < 3 ? 'verde_oscuro' : grain(px, py, seed) < 0.3 ? 'menta' : bayer(px, py) < 0.5 ? 'verde' : 'verde_oscuro');
    }
  }
}

/** Un árbol redondo de la otra orilla. */
function arbolLejos(L: Lienzo, x: number, base: number, r: number, seed: number) {
  const R = rng(seed), X = (v: number) => ((v % L.w) + L.w) % L.w;
  for (let k = 0; k < 7; k++) {
    const cx = x + Math.round((R() - 0.5) * r * 1.6), cy = base - r + Math.round((R() - 0.5) * r * 0.6), rr = r * (0.5 + R() * 0.3);
    for (let j = -rr; j <= rr; j++) for (let i = -rr * 1.2; i <= rr * 1.2; i++) {
      if ((i / 1.2) ** 2 + j * j > rr * rr || cy + j > base) continue;
      const px = X(Math.round(cx + i)), py = Math.round(cy + j);
      L.p(px, py, i + j < -rr * 0.5 && bayer(px, py) < 0.5 ? 'verde' : 'verde_oscuro');
    }
  }
}

/** La Torre de la Tortuga en su islote: tres pisos con sus arcos, el techo de tejas y el islote con árboles. */
function torreTortuga(L: Lienzo, cx: number, base: number) {
  // el islote con su mata y la orilla de piedra
  for (let j = 0; j < 8; j++) for (let i = -28 + j; i <= 28 - j; i++) L.p(cx + i, base - j, j === 0 ? 'asfalto' : bayer(cx + i, j) < 0.4 ? 'verde' : 'verde_oscuro');
  arbolLejos(L, cx - 20, base - 4, 9, 7); arbolLejos(L, cx + 22, base - 3, 7, 8);
  // tres pisos: el de abajo más ancho, cada uno con sus arcos oscuros
  const pisos: [number, number, number][] = [[24, 14, 4], [18, 11, 3], [12, 9, 2]];
  let y = base - 8;
  for (const [w, h, arcos] of pisos) {
    const x0 = cx - Math.floor(w / 2);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) L.p(x0 + i, y - h + j, i === 0 ? 'crema' : i === w - 1 ? 'cemento' : j === 0 ? 'crema' : 'cemento_claro');
    const paso = w / arcos;
    for (let a = 0; a < arcos; a++) {
      const ax = Math.round(x0 + paso * a + paso / 2) - 1;
      L.f(ax, y - h + 4, 3, h - 5, 'asfalto'); L.p(ax + 1, y - h + 3, 'asfalto'); L.vl(ax + 2, y - h + 5, h - 6, 'sombra');
    }
    // la cornisa de tejas con las puntas curvas
    L.hl(x0 - 2, y - h - 1, w + 4, 'terracota'); L.hl(x0 - 1, y - h - 2, w + 2, 'vino');
    L.p(x0 - 3, y - h - 2, 'terracota'); L.p(x0 + w + 2, y - h - 2, 'terracota');
    y -= h + 2;
  }
  // el remate de arriba
  L.f(cx - 2, y - 3, 4, 3, 'vino'); L.p(cx - 1, y - 4, 'terracota'); L.p(cx, y - 5, 'oro');
}

/** El puente Thê Húc: el arco rojo de madera sobre pilotes, con su baranda, y la puerta del templo Ngọc Sơn al final. */
function puenteTheHuc(L: Lienzo, x0: number, x1: number, agua: number) {
  const w = x1 - x0;
  for (let x = x0; x <= x1; x++) {
    const u = (x - x0) / w, y = Math.round(agua - 6 - Math.sin(u * Math.PI) * 14);
    L.f(x, y, 1, 3, 'rojo'); L.p(x, y + 3, 'vino');
    L.p(x, y - 5, 'rojo'); if ((x - x0) % 5 === 0) L.vl(x, y - 5, 5, 'rojo');
    if ((x - x0) % 16 === 0) L.vl(x, y + 4, agua - y - 4, 'vino');
  }
  // la puerta del templo con su techo de tejas, al final del puente
  const px = x1 + 2;
  L.f(px, agua - 26, 22, 20, 'crema'); L.vl(px, agua - 26, 20, 'luz'); L.vl(px + 21, agua - 26, 20, 'cemento');
  L.f(px + 8, agua - 18, 6, 12, 'vino');
  for (let j = 0; j < 5; j++) L.hl(px - 3 + j, agua - 31 + j, 28 - 2 * j, j === 4 ? 'vino' : 'terracota');
  L.p(px - 4, agua - 32, 'terracota'); L.p(px + 25, agua - 32, 'terracota');
}

/** El lago Hoàn Kiếm en la tarde, para ver por los ventanales: el cielo de miel, la otra orilla, el agua jade, la Torre de la Tortuga, el puente Thê Húc y los sauces. */
export function lagoHoanKiem(pal: Paleta, w: number, h: number, seed: number): Lienzo {
  const L = new Lienzo(w, h, pal), R = rng(seed);
  // el cielo: del celeste de arriba a la miel del horizonte, con nubes largas encendidas
  for (let y = 0; y < AGUA_LAGO; y++) for (let x = 0; x < w; x++) {
    const t = y / AGUA_LAGO;
    L.p(x, y, t < 0.3 ? (bayer(x, y) < t / 0.3 * 0.5 ? 'cielo' : 'celeste') : t < 0.7 ? (bayer(x, y) < (t - 0.3) / 0.4 * 0.6 ? 'bruma' : 'cielo') : 'bruma');
  }
  for (let i = 0; i < 9; i++) {
    const cx = R() * w, cy = 10 + Math.floor(R() * 40), cw = 40 + R() * 90;
    for (let x = Math.floor(cx - cw / 2); x < cx + cw / 2; x++) {
      const t = (x - (cx - cw / 2)) / cw, th = Math.max(1, Math.round(Math.sin(t * Math.PI) * 2.5));
      for (let j = 0; j < th; j++) L.p(((x % w) + w) % w, cy + j, j === th - 1 ? 'oro' : 'luz');
    }
  }
  // la otra orilla: la ciudad vieja baja con sus techos y árboles, en la bruma
  for (let x = 0; x < w; x++) {
    const casa = Math.floor(x / 14), alto = 6 + Math.floor(grain(casa, 0, seed) * 10);
    for (let j = 0; j < alto; j++) L.p(x, AGUA_LAGO - 1 - j, j === alto - 1 ? 'terracota' : x % 14 === 0 ? 'cemento' : (j % 4 === 2 && x % 4 === 1) ? 'cemento' : 'cemento_claro');
  }
  for (let x = 6; x < w; x += 34 + Math.floor(R() * 30)) arbolLejos(L, x, AGUA_LAGO - 2, 7 + Math.floor(R() * 5), seed + x);
  // el agua jade, más oscura hacia adelante, con rayas de luz de la tarde
  for (let y = AGUA_LAGO; y < h; y++) for (let x = 0; x < w; x++) {
    const t = (y - AGUA_LAGO) / (h - AGUA_LAGO);
    L.p(x, y, y === AGUA_LAGO ? 'bruma' : bayer(x, y) < 0.15 + t * 0.35 ? 'verde' : 'canal');
  }
  for (let k = 0; k < w / 6; k++) {
    const x = Math.floor(R() * w), y = AGUA_LAGO + 2 + Math.floor(R() * (h - AGUA_LAGO - 4)), len = 2 + Math.floor(R() * 7);
    for (let i = 0; i < len; i++) L.p((x + i) % w, y, R() < 0.3 ? 'oro' : 'menta');
  }
  // el puente rojo y el templo, y la torre en su islote (con su reflejo)
  puenteTheHuc(L, PUENTE_THE_HUC.x0, PUENTE_THE_HUC.x1, AGUA_LAGO + 14);
  torreTortuga(L, TORRE.x, TORRE.base);
  for (let j = 1; j < 18; j++) for (let i = -10; i <= 10; i++) if (bayer(TORRE.x + i, TORRE.base + j) < 0.35 - j * 0.015) L.p(TORRE.x + i, TORRE.base + j, j < 8 ? 'cemento_claro' : 'menta');
  // los sauces de esta orilla, adelante: sus cortinas cuelgan por arriba de las ventanas
  for (const [x, alto] of [[60, 120], [330, 132], [640, 124], [880, 128], [1100, 120]] as const) sauce(L, x, h, alto, seed + x);
  // la orilla de piedra de este lado, abajo del todo
  for (let x = 0; x < w; x++) { L.p(x, h - 3, 'cemento'); L.p(x, h - 2, 'asfalto_claro'); L.p(x, h - 1, 'asfalto'); }
  return L;
}

// ---------------------------------------------------------------------------------------------------------------------
// La pared del dojo

/** La pared de madera en paneles verticales, con la veta y las juntas. */
function paneles(C: Lienzo, x0: number, x1: number, y0: number, y1: number, seed: number) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const jx = x % 24;
    const veta = grain(x >> 1, y >> 3, seed) < 0.22 && (y + (x >> 2)) % 5 === 0;
    C.p(x, y, jx === 0 ? 'cemento' : jx === 1 ? 'crema' : veta ? 'cemento' : 'cemento_claro');
  }
}

/** Un ventanal: el marco de madera oscura, los parteluces que hacen 2 x 3 vidrios (transparentes: ahí se ve el lago) y los postigos abiertos. */
function ventanal(C: Lienzo, x0: number, x1: number, y0: number, y1: number) {
  const w = x1 - x0, h = y1 - y0;
  for (let y = y0 - 3; y < y1 + 3; y++) for (let x = x0 - 3; x < x1 + 3; x++) C.p(x, y, x < x0 || y < y0 ? 'asfalto' : x >= x1 || y >= y1 ? 'sombra' : 'asfalto');
  // los vidrios: transparentes, para que se vea la capa lejos
  const mx = x0 + Math.floor(w / 2), filas = [y0, y0 + Math.floor(h / 3), y0 + Math.floor((2 * h) / 3), y1];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) C.clear(x, y);
  // el parteluz del medio y los travesaños
  C.f(mx - 1, y0, 3, h, 'asfalto'); C.vl(mx - 1, y0, h, 'asfalto_claro');
  for (const fy of filas.slice(1, -1)) { C.f(x0, fy - 1, w, 2, 'asfalto'); C.hl(x0, fy - 1, w, 'asfalto_claro'); }
  // un brillo en algunos vidrios (el reflejo de la tarde)
  for (let k = 0; k < 3; k++) for (let i = 0; i < 6; i++) { C.p(x0 + 4 + i + k * 2, filas[k] + 3 + i, 'luz'); C.p(mx + 5 + i + k, filas[k] + 4 + i, 'luz'); }
  // los postigos abiertos a los lados, de tablillas
  for (const [px, d] of [[x0 - 15, 1], [x1 + 3, -1]] as const) {
    for (let y = y0 - 2; y < y1 + 2; y++) for (let i = 0; i < 12; i++) C.p(px + i, y, i === 0 || i === 11 ? 'asfalto' : y % 4 === 0 ? 'terracota' : d * i > 0 && i > 8 ? 'terracota' : 'ocre');
  }
  // el alféizar
  C.f(x0 - 6, y1 + 3, w + 12, 3, 'ocre'); C.hl(x0 - 6, y1 + 3, w + 12, 'amarillo'); C.hl(x0 - 6, y1 + 6, w + 12, 'asfalto');
}

/** La bandera de Vietnam colgada: el rojo con la estrella amarilla de cinco puntas, con sus pliegues. */
export function banderaVietnam(C: Lienzo, x: number, y: number, w: number, h: number) {
  C.hl(x - 3, y - 2, w + 6, 'asfalto'); C.p(x - 3, y - 3, 'oro'); C.p(x + w + 2, y - 3, 'oro');
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    // los pliegues de la tela: una sombra suave tramada, sin cambiar el rojo
    const pliegue = Math.sin((i / w) * Math.PI * 3 + 0.6);
    C.p(x + i, y + j, pliegue < -0.55 && bayer(x + i, y + j) < (-pliegue - 0.55) * 1.6 ? 'vino' : 'rojo');
  }
  // la estrella: cinco puntas alrededor del centro
  const cx = x + w / 2, cy = y + h / 2 + 1, R1 = h * 0.3, R2 = R1 * 0.4;
  const pts: [number, number][] = [];
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? R2 : R1; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  for (let j = Math.floor(cy - R1); j <= cy + R1; j++) for (let i = Math.floor(cx - R1); i <= cx + R1; i++) {
    let dentro = false;
    for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) {
      const [xa, ya] = pts[a], [xb, yb] = pts[b];
      if (ya > j + 0.5 !== yb > j + 0.5 && i + 0.5 < ((xb - xa) * (j + 0.5 - ya)) / (yb - ya) + xa) dentro = !dentro;
    }
    if (dentro) C.p(i, j, 'amarillo');
  }
}

/** Un rollo de caligrafía (thư pháp): el papel crema con sus varillas, la palabra en tinta a pincel y el sello rojo. */
function rollo(C: Lienzo, x: number, y: number, texto: string) {
  const w = 22, h = 14 + [...texto.normalize('NFC')].length * 15;
  C.hl(x + Math.floor(w / 2) - 4, y - 6, 8, 'asfalto'); C.ln(x + Math.floor(w / 2), y - 6, x + 2, y - 1, 'asfalto'); C.ln(x + Math.floor(w / 2), y - 6, x + w - 3, y - 1, 'asfalto');
  C.f(x - 1, y - 1, w + 2, 3, 'terracota'); C.f(x - 1, y + h, w + 2, 3, 'terracota'); C.p(x - 2, y + h + 1, 'asfalto'); C.p(x + w + 1, y + h + 1, 'asfalto');
  C.box(x, y + 2, w, h - 2, 'crema', 'ocre');
  C.vl(x + w - 2, y + 3, h - 4, 'cemento_claro');
  // la palabra en vertical, una letra debajo de la otra, al doble
  const letras = [...texto.normalize('NFC')];
  let yy = y + 6;
  for (const ch of letras) {
    const T = new Lienzo(8, 12, C.pal);
    drawText(T, 0, 0, ch, 'tinta');
    const tw = textWidth(ch), ox = x + Math.floor((w - tw * 2) / 2);
    for (let j = 0; j < T.h; j++) for (let i = 0; i < T.w; i++) if (T.has(i, j)) C.f(ox + i * 2, yy + (j - 2) * 2, 2, 2, 'tinta');
    yy += 15;
  }
  // el sello rojo abajo a la derecha
  C.f(x + w - 8, y + h - 10, 5, 5, 'rojo'); C.p(x + w - 7, y + h - 9, 'crema'); C.p(x + w - 5, y + h - 7, 'crema');
}

/** El tablero de los nombres de los judocas: tablillas de madera clara colgadas en filas, con el nombre en tinta. */
function tablillas(C: Lienzo, x: number, y: number, cols: number, filas: number, seed: number) {
  const w = cols * 7 + 5, h = filas * 15 + 5;
  C.box(x, y, w, h, 'terracota', 'asfalto'); C.hl(x + 1, y + 1, w - 2, 'ocre');
  for (let f = 0; f < filas; f++) {
    C.hl(x + 2, y + 4 + f * 15, w - 4, 'vino');
    for (let c = 0; c < cols; c++) {
      const tx = x + 3 + c * 7, ty = y + 5 + f * 15;
      if (grain(c, f, seed) < 0.12) continue;
      C.f(tx, ty, 5, 12, 'crema'); C.vl(tx + 4, ty, 12, 'cemento_claro'); C.p(tx + 2, ty - 1, 'asfalto');
      for (let j = 2; j < 10; j += 2) if (grain(tx, ty + j, seed + 1) < 0.7) C.p(tx + 2, ty + j, 'tinta');
      if (grain(c, f, seed + 2) < 0.2) C.p(tx + 1, ty + 10, 'rojo');
    }
  }
}

/** El reloj de pared redondo, con el marco de madera. */
function reloj(C: Lienzo, cx: number, cy: number) {
  C.d(cx, cy, 9, 'terracota'); C.d(cx, cy, 7, 'luz');
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; C.p(Math.round(cx + Math.cos(a) * 6), Math.round(cy + Math.sin(a) * 6), k % 3 ? 'cemento' : 'tinta'); }
  // las cuatro y diez de la tarde
  C.ln(cx, cy, cx + 3, cy + 2, 'tinta'); C.ln(cx, cy, cx + 2, cy - 5, 'tinta'); C.p(cx, cy, 'rojo');
}

/** El letrero de madera del club, con letra tallada dorada. */
function letreroClub(C: Lienzo, cx: number, y: number, texto: string, escala = 2) {
  const tw = textWidth(texto) * escala, w = tw + 20, x = Math.round(cx - w / 2), h = 11 * escala - 2;
  C.f(x - 2, y - 2, w + 4, h + 4, 'sombra');
  C.box(x, y, w, h, 'terracota', 'asfalto'); C.hl(x + 1, y + 1, w - 2, 'ocre'); C.hl(x + 1, y + h - 2, w - 2, 'vino');
  const T = new Lienzo(textWidth(texto) + 2, 12, C.pal);
  drawText(T, 0, 0, texto, 'oro');
  for (let j = 0; j < T.h; j++) for (let i = 0; i < T.w; i++) if (T.has(i, j)) { C.f(x + 10 + i * escala, y + (j - 1) * escala - 1, escala, escala, 'oro'); C.p(x + 10 + i * escala + escala - 1, y + (j - 1) * escala - 1 + escala - 1, 'ocre'); }
}

/** Un judoca de judogi sentado en seiza (de rodillas sobre los talones), mirando el combate. */
function seiza(C: Lienzo, x: number, base: number, gi: Color, cinta: Color, pelo: Color, seed: number) {
  const R = rng(seed);
  const piel: Color = R() < 0.5 ? 'salmon' : 'ocre';
  // las rodillas y las piernas dobladas: una base ancha
  C.f(x - 1, base - 6, 15, 6, gi); C.hl(x - 1, base - 6, 15, gi === 'luz' ? 'luz' : 'celeste'); C.hl(x - 1, base - 1, 15, gi === 'luz' ? 'cemento_claro' : 'azul_noche');
  C.p(x - 1, base - 1, 'tinta'); C.p(x + 13, base - 1, 'tinta');
  // el torso con el cuello en V y el cinturón
  C.f(x + 1, base - 17, 11, 11, gi); C.vl(x + 11, base - 17, 11, gi === 'luz' ? 'cemento_claro' : 'azul_noche');
  C.p(x + 5, base - 16, piel); C.p(x + 6, base - 16, piel); C.p(x + 6, base - 15, piel); C.ln(x + 3, base - 17, x + 6, base - 13, gi === 'luz' ? 'cemento_claro' : 'azul_noche'); C.ln(x + 9, base - 17, x + 6, base - 13, gi === 'luz' ? 'cemento_claro' : 'azul_noche');
  C.hl(x + 1, base - 9, 11, cinta); C.p(x + 5, base - 8, cinta); C.p(x + 7, base - 8, cinta);
  // las manos sobre los muslos
  C.f(x + 1, base - 7, 3, 2, piel); C.f(x + 9, base - 7, 3, 2, piel);
  // la cabeza
  C.f(x + 3, base - 24, 7, 7, piel); C.hl(x + 3, base - 25, 7, pelo); C.f(x + 3, base - 24, 7, 2, pelo); C.p(x + 3, base - 22, pelo); C.p(x + 9, base - 22, pelo);
  C.p(x + 4, base - 21, 'tinta'); C.p(x + 7, base - 21, 'tinta'); C.p(x + 9, base - 21, MAS_OSCURO[piel]);
  C.hl(x + 4, base - 18, 4, MAS_OSCURO[piel]);
}

/** Una persona sentada en la banca: cabeza, torso, brazos (abajo o arriba aplaudiendo) y las piernas que bajan al piso. */
function sentado(C: Lienzo, x: number, asiento: number, base: number, ropa: Color, pantalon: Color, pelo: Color, piel: Color, arriba: boolean, nino: boolean) {
  const t = nino ? 8 : 10, alto = nino ? 9 : 12;
  // las piernas: los muslos hacia la cámara (las rodillas un poco abiertas) y las canillas que bajan al piso
  C.f(x - 1, asiento - 4, t + 3, 4, pantalon); C.hl(x - 1, asiento - 4, t + 3, MAS_OSCURO[pantalon] === 'tinta' ? pantalon : pantalon);
  for (const lx of [x, x + t - 2]) { C.f(lx, asiento, 3, base - asiento - 2, pantalon); C.vl(lx + 2, asiento, base - asiento - 2, MAS_OSCURO[pantalon]); C.f(lx - 1, base - 2, 4, 2, 'sombra'); }
  // el torso
  const ty = asiento - 4 - alto;
  C.f(x, ty, t + 1, alto, ropa); C.vl(x + t, ty, alto, MAS_OSCURO[ropa]); C.hl(x, ty, t + 1, ropa === 'luz' ? 'luz' : ropa);
  // los brazos
  if (arriba) { C.vl(x - 1, ty - 6, 7, ropa); C.vl(x + t + 1, ty - 6, 7, ropa); C.p(x - 1, ty - 7, piel); C.p(x + t + 1, ty - 7, piel); }
  else { C.vl(x - 1, ty + 1, alto - 1, ropa); C.vl(x + t + 1, ty + 1, alto - 1, MAS_OSCURO[ropa]); C.f(x - 1, ty + alto, 2, 2, piel); C.f(x + t, ty + alto, 2, 2, piel); }
  // la cabeza
  const hw = nino ? 6 : 7, hx = x + Math.floor((t + 1 - hw) / 2), hy = ty - hw - 1;
  C.f(hx, hy, hw, hw, piel); C.f(hx, hy - 1, hw, 3, pelo); C.p(hx, hy + 2, pelo); C.p(hx + hw - 1, hy + 2, pelo);
  C.p(hx + 1, hy + 3, 'tinta'); C.p(hx + hw - 2, hy + 3, 'tinta'); C.vl(hx + hw - 1, hy + 3, 3, MAS_OSCURO[piel]);
  C.p(hx + Math.floor(hw / 2), hy + 5, MAS_OSCURO[piel]);
  C.f(hx + 2, hy + hw, hw - 4, 1, MAS_OSCURO[piel]);
}

/** El público: los papás y los niños en la banca, y los judocas en seiza adelante. `f` es el cuadro de la vida (aplauden). */
function publicoDojo(C: Lienzo, seed: number, f = 0) {
  const R = rng(seed + 5), base = 245, { asiento } = BANCA;
  // la banca larga de madera
  C.f(BANCA.x0, asiento - 1, BANCA.x1 - BANCA.x0, 4, 'terracota'); C.hl(BANCA.x0, asiento - 1, BANCA.x1 - BANCA.x0, 'ocre'); C.hl(BANCA.x0, asiento + 3, BANCA.x1 - BANCA.x0, 'sombra');
  for (let x = BANCA.x0 + 6; x < BANCA.x1; x += 60) { C.f(x, asiento + 3, 3, base - asiento - 3, 'asfalto'); C.vl(x, asiento + 3, base - asiento - 3, 'asfalto_claro'); }
  const ROPA: Color[] = ['celeste', 'rojo', 'luz', 'amarillo', 'menta', 'salmon', 'azul', 'luz'];
  const PANT: Color[] = ['azul_noche', 'asfalto', 'sombra', 'azul', 'terracota'];
  // los de la banca, con huecos
  for (let x = BANCA.x0 + 4, n = 0; x < BANCA.x1 - 12; n++) {
    const nino = R() < 0.3, ropa = ROPA[Math.floor(R() * ROPA.length)], pant = PANT[Math.floor(R() * PANT.length)], pelo: Color = R() < 0.8 ? 'tinta' : 'sombra', piel: Color = R() < 0.6 ? 'salmon' : 'ocre';
    const salta = R() < 0.18, paso = (nino ? 14 : 17) + Math.floor(R() * 6), aplaude = (n + f) % 3 === 0;
    if (!salta) sentado(C, x, asiento, base, ropa, pant, pelo, piel, aplaude, nino);
    x += paso + (salta ? 8 : 0);
  }
  // los judocas en seiza, adelante de la banca, en grupitos
  const R2 = rng(seed + 9);
  for (const [x0, n] of [[132, 4], [300, 2], [470, 5]] as const) for (let i = 0; i < n; i++) {
    const azul = R2() < 0.3, cintas: Color[] = ['luz', 'amarillo', 'oro', 'verde', 'azul', 'tinta'];
    seiza(C, x0 + i * 18, base, azul ? 'azul' : 'luz', cintas[Math.floor(R2() * cintas.length)], R2() < 0.85 ? 'tinta' : 'sombra', seed + x0 + i);
  }
}

/** La capa cerca del dojo completa. `f` es el cuadro del público. */
export function pintarDojo(C: Lienzo, seed: number, o: { publico?: boolean; f?: number } = {}) {
  const W = C.w;
  // el cielo raso de tablas con las vigas
  for (let y = 0; y < RASO; y++) for (let x = 0; x < W; x++) C.p(x, y, y % 6 === 5 ? 'sombra' : (x + (y >> 1) * 3) % 50 === 0 ? 'asfalto' : 'asfalto_claro');
  for (let x = 20; x < W; x += 96) { C.f(x, 0, 10, RASO, 'asfalto'); C.vl(x, 0, RASO, 'asfalto_claro'); C.vl(x + 9, 0, RASO, 'sombra'); }
  C.f(0, RASO, W, 6, 'asfalto'); C.hl(0, RASO, W, 'ocre'); C.hl(0, RASO + 5, W, 'sombra');
  // la pared de arriba, de paneles de madera clara
  paneles(C, 0, W, RASO + 6, ZOCALO, seed);
  // el letrero del club arriba, en el centro
  letreroClub(C, BANDERA.x + BANDERA.w / 2, RASO + 18, 'VÕ ĐƯỜNG NHU ĐẠO HÀ NỘI');
  // el tablero de los nombres del club a la izquierda y el reloj a la derecha
  tablillas(C, 34, RASO + 14, 12, 2, seed);
  tablillas(C, 446, RASO + 14, 12, 2, seed + 3);
  reloj(C, 604, RASO + 30);
  // los ventanales que dan al lago, con su luz
  for (const v of VENTANALES) ventanal(C, v.x0, v.x1, VENTANA.y0, VENTANA.y1);
  // los pilares de madera oscura entre los paños
  for (const x of [0, 148, 274, 392, 544, W - 8]) { C.f(x, RASO + 6, 8, ZOCALO - RASO - 6, 'terracota'); C.vl(x, RASO + 6, ZOCALO - RASO - 6, 'ocre'); C.vl(x + 7, RASO + 6, ZOCALO - RASO - 6, 'vino'); }
  // la bandera en el centro y la caligrafía entre las ventanas
  banderaVietnam(C, BANDERA.x, BANDERA.y, BANDERA.w, BANDERA.h);
  for (const r of ROLLOS) rollo(C, r.x, r.y, r.texto);
  // el zócalo: la moldura, los paneles más oscuros de abajo y el rodapié
  C.f(0, ZOCALO, W, 4, 'terracota'); C.hl(0, ZOCALO, W, 'ocre'); C.hl(0, ZOCALO + 3, W, 'vino');
  for (let y = ZOCALO + 4; y < 240; y++) for (let x = 0; x < W; x++) {
    const jx = x % 32;
    C.p(x, y, jx === 0 ? 'asfalto_claro' : jx === 1 ? 'cemento_claro' : (y - ZOCALO) % 18 === 0 ? 'asfalto_claro' : grain(x >> 1, y >> 3, seed + 2) < 0.06 && (y + x) % 3 === 0 ? 'asfalto_claro' : 'cemento');
  }
  // el piso de madera del borde, donde va la banca
  for (let y = 240; y < 246; y++) for (let x = 0; x < W; x++) C.p(x, y, y === 240 ? 'sombra' : (x + y * 7) % 40 === 0 ? 'terracota' : y === 245 ? 'terracota' : 'ocre');
  // la luz que entra en rayos por los ventanales
  // el público
  if (o.publico !== false) publicoDojo(C, seed, o.f ?? 0);
}

export const fondoDojo = (C: Lienzo, _x0: number, _x1: number, _base: number, ctx: CtxCerca) => pintarDojo(C, ctx.seed);

// ---------------------------------------------------------------------------------------------------------------------
// El tatami

/** Las manchas de sol que entran por los ventanales y caen sobre el tatami (x e y de mundo). */
function solEn(x: number, y: number) {
  for (const v of VENTANALES) {
    const a = v.x0 + 70 + y * 0.5, b = a + (v.x1 - v.x0) * 0.6;
    if (x >= a && x < b && y < 64) return Math.min(x - a, b - 1 - x) < 2 ? 1 : 2;
  }
  return 0;
}

/**
 * El tatami: esteras de 64 x 26 con sus juntas, la zona de combate verde, la de seguridad amarilla y su borde, la
 * textura del tejido en rayas finas, las cintas de salida (azul y blanca) y las manchas de sol de la tarde.
 */
export function tatamiDojo(x: number, y: number, s: number): Color {
  const xr = ((x % 960) + 960) % 960;
  const dentro = xr >= ZONA.x0 && xr < ZONA.x1 && y >= ZONA.y0 && y < ZONA.y1;
  // las cintas de salida en el centro de la zona de combate
  const cy = Math.round((ZONA.y0 + ZONA.y1) / 2);
  if (y >= cy - 1 && y <= cy) { if (xr >= 286 && xr < 296) return 'azul'; if (xr >= 344 && xr < 354) return 'luz'; }
  // el borde entre las dos zonas, una raya roja
  if (((xr === ZONA.x0 || xr === ZONA.x1 - 1) && y >= ZONA.y0 && y < ZONA.y1) || ((y === ZONA.y0 || y === ZONA.y1 - 1) && xr >= ZONA.x0 && xr < ZONA.x1)) return 'rojo';
  const junta = xr % 64 === 0 || (y - ZONA.y0 + 260) % 26 === 0;
  const sol = solEn(xr, y);
  if (junta) return dentro ? (sol ? 'verde' : 'verde_oscuro') : sol ? 'ocre' : 'ocre';
  // el tejido de la estera: puntadas en rayas regulares a lo largo, y alguna estera un poco más gastada
  const gastada = grain(Math.floor(xr / 64), Math.floor((y + 16) / 26), s + 4) < 0.25;
  const tejido = y % 3 === 1 && (xr + y) % 4 === 0;
  if (dentro) return sol === 2 ? (tejido ? 'verde' : 'menta') : sol === 1 ? (bayer(xr, y) < 0.5 ? 'menta' : 'verde') : tejido || (gastada && bayer(xr, y) < 0.08) ? 'menta' : 'verde';
  return sol === 2 ? (tejido ? 'amarillo' : 'crema') : sol === 1 ? (bayer(xr, y) < 0.5 ? 'crema' : 'amarillo') : tejido || (gastada && bayer(xr, y) < 0.08) ? 'crema' : 'amarillo';
}

/** Lo de abajo de la franja: el canto del tatami (su grosor), la sombra y el piso de madera del dojo. */
export function orillaDojo(x: number, r: number, s: number): Color {
  const xr = ((x % 960) + 960) % 960;
  if (r === 0) return 'ocre';
  if (r < 4) return r === 3 ? 'terracota' : 'ocre';
  if (r === 4) return 'sombra';
  if (r < 7) return 'asfalto';
  // las tablas del piso, a lo largo, con sus juntas trabadas
  const b = Math.floor((r - 7) / 5), jy = (r - 7) % 5, jx = (xr + b * 37) % 64;
  if (jy === 4 || jx === 0) return 'asfalto_claro';
  return grain(xr >> 2, r, s) < 0.1 ? 'ocre' : jy === 0 ? 'cemento_claro' : 'cemento';
}

// ---------------------------------------------------------------------------------------------------------------------
// Vida, luces y partículas

/** Recorta un pedazo de una capa (todo lo que tiene, opaco o no). */
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

/** Las hojas que caen afuera, detrás del vidrio de un ventanal: 4 cuadros, solo donde la pared deja ver (los vidrios). */
function hojasVentanal(pal: Paleta, cerca: Lienzo, v: { x0: number; x1: number }, seed: number): Lienzo[] {
  const w = v.x1 - v.x0, h = VENTANA.y1 - VENTANA.y0, R = rng(seed);
  const hojas = Array.from({ length: 5 }, () => ({ x: R() * w, y: R() * h, c: (['ocre', 'amarillo', 'terracota', 'verde'] as Color[])[Math.floor(R() * 4)] }));
  return [0, 1, 2, 3].map((f) => {
    const L = new Lienzo(w, h, pal);
    for (const hj of hojas) {
      const x = Math.round(hj.x + Math.sin((f + hj.y) * 1.3) * 3 + f * 2) % w, y = Math.round(hj.y + f * (h / 4)) % h;
      for (const [dx, dy, c] of [[0, 0, hj.c], [1, 0, hj.c], [1, 1, MAS_OSCURO[hj.c]]] as const) {
        const px = x + dx, py = y + dy;
        if (px < w && py < h && !cerca.has(v.x0 + px, VENTANA.y0 + py)) L.p(px, py, c);
      }
    }
    return L;
  });
}

export function vidaDojo(pal: Paleta, L: ObliqueLayout, _k: number, seed: number, capas: { cerca: Lienzo; piso: Lienzo }): VidaEscena[] {
  const out: VidaEscena[] = [], quiere = (t: string) => L.vida.includes(t);
  if (quiere('publico')) {
    // el público: un recorte de la pared con la gente en cada cuadro (unos aplauden con los brazos arriba)
    const cuadrosDe = [0, 1].map((f) => { const c = new Lienzo(capas.cerca.w, capas.cerca.h, pal); pintarDojo(c, seed, { f }); return c; });
    const y = 196, h = 50;
    for (const [x0, x1] of [[BANCA.x0 - 4, 380], [380, BANCA.x1 + 4]] as const) out.push({ id: `publico_${x0}`, tipo: 'publico', capa: 'cerca', x: x0, y, cuadros: cuadrosDe.map((c) => recorte(c, x0, y, x1 - x0, h)), fps: 2 });
  }
  if (quiere('hojas_cayendo')) VENTANALES.forEach((v, i) => out.push({ id: `hojas_${i}`, tipo: 'hojas_cayendo', capa: 'cerca', x: v.x0, y: VENTANA.y0, cuadros: hojasVentanal(pal, capas.cerca, v, seed + i * 7), fps: 3 }));
  return out;
}

export function lucesDojo(pal: Paleta, _L: ObliqueLayout, _k: number): Luz[] {
  return VENTANALES.map((v) => ({ x: v.x0 + 60, y: 250, color: pal.cielo, radio: 60, latido: 0.15, encendida: true, nota: 'el sol de la tarde que entra por el ventanal y cae en el tatami' }));
}

export function particulasDojo(pal: Paleta, _L: ObliqueLayout, _k: number): Particula[] {
  return VENTANALES.slice(1, 3).map((v) => ({ tipo: 'brillo', x0: v.x0 + 10, x1: v.x0 + 60, y0: VENTANA.y1 + 8, y1: 236, color: [pal.luz, pal.cielo], cada: 1.2, vida: 0.8, nota: 'el polvo que brilla en el rayo de sol' }));
}

export const DOJO: Lugar = {
  estilo: 'vietnam_dojo',
  fondo: fondoDojo,
  lejos: { ho_hoan_kiem: lagoHoanKiem },
  pisos: { tatami: tatamiDojo },
  orilla: orillaDojo,
  vida: vidaDojo,
  luces: lucesDojo,
  particulas: particulasDojo,
  techado: true,
};
