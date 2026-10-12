import { rng, grain, bayer } from '../../fx/pix';
import { Lienzo } from './lienzo';
import { drawText, textWidth, LINE_H } from './letras';
import type { Color } from './paleta';
import { bandera } from './vietnam';

/**
 * Fondos de la capa `cerca` por tema, para los tramos de Saigón del Cross Country. Cada pintor llena su rango
 * [x0, x1) del lienzo de la fila (largo x `base`, con la base en la última fila) y deja transparente donde se ve el
 * cielo. Regla de legibilidad: de la fila base-50 para abajo, que es donde quedan los atletas del fondo, nada oscuro
 * grande: el contorno de los atletas es casi negro.
 */

export interface CtxCerca {
  seed: number;
  /** Rangos del layout con su nombre: para poner el letrero que va con lo que se vende, o el hueco entre edificios. */
  zonas?: { x0: number; x1: number; tipo: string }[];
  huecos?: { x0: number; x1: number }[];
}
export type PintorCerca = (C: Lienzo, x0: number, x1: number, base: number, ctx: CtxCerca) => void;

/** Copa de árbol: racimos de círculos con luz arriba a la izquierda. */
export function copa(C: Lienzo, cx: number, cy: number, r: number, seed: number, tonos: [Color, Color, Color] = ['verde_oscuro', 'verde', 'menta']) {
  const R = rng(seed);
  const bolas = Array.from({ length: Math.round(r / 2.5) + 4 }, () => { const a = R() * Math.PI * 2, t = Math.sqrt(R()) * r * 0.7; return [cx + Math.cos(a) * t * 1.3, cy + Math.sin(a) * t * 0.8, r * (0.35 + R() * 0.25)] as const; });
  for (const [x, y, rr] of bolas) C.d(Math.round(x), Math.round(y + 2), rr, tonos[0]);
  for (const [x, y, rr] of bolas) C.d(Math.round(x), Math.round(y), rr - 1, tonos[1]);
  for (const [x, y, rr] of bolas) for (let j = -rr; j < 0; j++) for (let i = -rr; i < 0; i++) if (i * i + j * j < (rr - 1) ** 2 && i + j < -rr * 0.6 && bayer(x + i, y + j) < 0.5) C.p(Math.round(x + i), Math.round(y + j), tonos[2]);
}

/** Árbol de calle: tronco y copa grande. */
function arbol(C: Lienzo, x: number, base: number, alto: number, seed: number) {
  C.f(x - 2, base - alto * 0.55, 5, alto * 0.55, 'terracota'); C.vl(x - 2, base - alto * 0.55, alto * 0.55, 'ocre'); C.vl(x + 2, base - alto * 0.55, alto * 0.55, 'vino');
  C.ln(x, base - alto * 0.45, x - 10, base - alto * 0.7, 'terracota'); C.ln(x + 1, base - alto * 0.5, x + 12, base - alto * 0.72, 'terracota');
  copa(C, x, Math.round(base - alto * 0.75), Math.round(alto * 0.32), seed);
}

/** Palmera de coco: tronco curvo con anillos y penacho. */
function palmera(C: Lienzo, x: number, base: number, alto: number, lado: 1 | -1, seed: number) {
  let tx = x, ty = base;
  for (let i = 0; i < alto; i++) {
    const t = i / alto; tx = x + lado * Math.round(Math.sin(t * 1.4) * alto * 0.18); ty = base - i;
    C.p(tx - 1, ty, 'ocre'); C.p(tx, ty, i % 4 === 0 ? 'terracota' : 'amarillo'); C.p(tx + 1, ty, 'terracota');
  }
  const R = rng(seed);
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI / 2 + (k - 3) * 0.5 + (R() - 0.5) * 0.2, len = 16 + R() * 8;
    for (let i = 0; i < len; i++) {
      const t = i / len, px = Math.round(tx + Math.cos(a) * i), py = Math.round(ty + Math.sin(a) * i + t * t * 10);
      C.p(px, py, 'verde'); C.p(px, py + 1, 'verde_oscuro'); if (i % 3 === 0) C.p(px, py + 2, 'verde_oscuro');
    }
  }
  C.d(tx, ty + 2, 2, 'verde_oscuro'); C.p(tx - 1, ty + 3, 'ocre'); C.p(tx + 1, ty + 3, 'ocre');
}

/** Letrero rectangular con texto centrado. Devuelve el ancho. */
function letrero(C: Lienzo, cx: number, y: number, texto: string, fondo: Color, letra: Color, borde: Color = 'tinta', pad = 3) {
  const w = textWidth(texto) + pad * 2, x = Math.round(cx - w / 2);
  C.box(x, y, w, LINE_H + 1, fondo, borde); drawText(C, x + pad, y - 1, texto, letra);
  return w;
}

// ------------------------------------------------------------------ Bến Thành

/** Ventana de arco de medio punto, con marco y vidrio que refleja el cielo. */
function ventanaArco(C: Lienzo, x: number, y: number, w: number, h: number, marco: Color, vidrio: Color, fondo: Color) {
  const r = Math.floor(w / 2);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const dy = j - r;
    if (dy < 0 && (i - r + 0.5) ** 2 + dy * dy > r * r) continue;
    const borde = i === 0 || i === w - 1 || j === h - 1 || (dy < 0 && (i - r + 0.5) ** 2 + dy * dy > (r - 1) ** 2);
    C.p(x + i, y + j, borde ? marco : j < h * 0.45 ? vidrio : fondo);
  }
  C.vl(x + r, y + 1, h - 2, marco); C.hl(x + 1, y + r + 2, w - 2, marco);
}

/** La fachada del mercado Bến Thành por fuera: muro amarillo, arcos, techo de teja y la torre del reloj en la puerta. */
export const fachadaBenThanh: PintorCerca = (C, x0, x1, base, ctx) => {
  const R = rng(ctx.seed + 5), bx0 = x0 + 150;
  // árboles de Lê Lợi a la izquierda, con su seto
  arbol(C, x0 + 40, base, 120, ctx.seed + 1); arbol(C, x0 + 110, base, 104, ctx.seed + 2);
  for (let x = x0; x < bx0; x++) for (let y = base - 12; y < base; y++) C.p(x, y, y === base - 12 ? 'menta' : grain(x, y, 3) < 0.3 ? 'verde_oscuro' : 'verde');
  // techo de teja
  const wt = base - 104;
  for (let y = wt - 18; y < wt; y++) {
    const k = wt - y, m = Math.round(k * 0.6);
    for (let x = bx0 + m; x < x1; x++) C.p(x, y, (y - wt) % 3 === 0 ? 'vino' : (x + (y >> 1)) % 6 === 0 ? 'vino' : 'terracota');
    C.p(bx0 + m, y, 'vino');
  }
  C.hl(bx0 + 11, wt - 19, x1 - bx0 - 11, 'salmon');
  // muro, cornisa y molduras
  C.f(bx0, wt, x1 - bx0, base - wt, 'amarillo');
  C.f(bx0, wt, x1 - bx0, 4, 'crema'); C.hl(bx0, wt, x1 - bx0, 'luz'); C.hl(bx0, wt + 4, x1 - bx0, 'ocre');
  C.speckle(bx0, wt + 5, x1 - bx0, base - wt - 5, 'ocre', 0.025, ctx.seed);
  const banda = base - 48;
  C.f(bx0, banda, x1 - bx0, 5, 'crema'); C.hl(bx0, banda, x1 - bx0, 'luz'); C.hl(bx0, banda + 5, x1 - bx0, 'terracota');
  // ventanas de arco arriba y arcada abajo
  for (let x = bx0 + 8; x < x1 - 30; x += 28) {
    C.vl(x - 4, wt + 5, banda - wt - 5, 'crema');
    ventanaArco(C, x + 2, wt + 12, 12, 26, 'crema', 'celeste', 'azul');
    // arco de la planta baja, abierto: adentro se ve el mercado iluminado
    const ay = banda + 9, aw = 20, ah = base - ay;
    for (let j = 0; j < ah; j++) for (let i = 0; i < aw; i++) {
      const r = aw / 2, dy = j - r;
      if (dy < 0 && (i - r + 0.5) ** 2 + dy * dy > r * r) continue;
      const edge = i === 0 || i === aw - 1 || (dy < 0 && (i - r + 0.5) ** 2 + dy * dy > (r - 1) ** 2);
      C.p(x + i, ay + j, edge ? 'ocre' : j > ah - 14 ? ((i >> 1) % 4 === 0 ? 'rojo' : (i >> 1) % 4 === 1 ? 'amarillo' : (i >> 1) % 4 === 2 ? 'celeste' : 'luz') : j > ah - 16 ? 'ocre' : 'crema');
    }
    // mercancía colgada en el arco
    for (let i = 3; i < aw - 3; i += 4) { C.f(x + i, ay + 12, 3, 5, (['rojo', 'azul', 'oro', 'menta'] as Color[])[Math.floor(R() * 4)]); }
  }
  // zócalo
  C.f(bx0, base - 4, x1 - bx0, 4, 'terracota'); C.hl(bx0, base - 4, x1 - bx0, 'salmon'); C.hl(bx0, base - 1, x1 - bx0, 'vino');
  C.vl(bx0, wt, base - wt, 'ocre');
};

/** La torre del reloj de Bến Thành, centrada en `cx`: va encima de todo, también del interior del mercado. */
export function torreReloj(C: Lienzo, cx: number, base: number) {
  const tw = 60, x0 = cx - tw / 2, cuerpo = base - 104, uw = 40, ux = cx - uw / 2, uy = 34;
  // cuerpo ancho
  C.f(x0, cuerpo - 8, tw, base - cuerpo + 8, 'amarillo'); C.vl(x0, cuerpo - 8, base - cuerpo + 8, 'ocre'); C.vl(x0 + tw - 1, cuerpo - 8, base - cuerpo + 8, 'ocre');
  C.vl(x0 + 4, cuerpo - 8, base - cuerpo + 8, 'crema'); C.vl(x0 + tw - 5, cuerpo - 8, base - cuerpo + 8, 'crema');
  C.f(x0 - 2, cuerpo - 12, tw + 4, 4, 'crema'); C.hl(x0 - 2, cuerpo - 12, tw + 4, 'luz'); C.hl(x0 - 2, cuerpo - 8, tw + 4, 'terracota');
  // el nombre del mercado
  const t = 'CHỢ BẾN THÀNH';
  C.f(cx - textWidth(t) / 2 - 3, cuerpo + 2, textWidth(t) + 6, LINE_H + 2, 'vino'); drawText(C, cx - Math.floor(textWidth(t) / 2), cuerpo + 1, t, 'oro');
  // gran arco de la puerta, con el interior iluminado
  const aw = 34, ay = cuerpo + 22, ah = base - ay;
  for (let j = 0; j < ah; j++) for (let i = 0; i < aw; i++) {
    const r = aw / 2, dy = j - r;
    if (dy < 0 && (i - r + 0.5) ** 2 + dy * dy > r * r) continue;
    const edge = (dy < 0 && (i - r + 0.5) ** 2 + dy * dy > (r - 2) ** 2) || i < 2 || i > aw - 3;
    C.p(cx - r + i, ay + j, edge ? 'crema' : j < 20 ? (bayer(i, j) < 0.3 ? 'cemento_claro' : 'luz') : 'cemento_claro');
  }
  // cuerpo alto con el reloj
  C.f(ux, uy, uw, cuerpo - 12 - uy, 'amarillo'); C.vl(ux, uy, cuerpo - 12 - uy, 'ocre'); C.vl(ux + uw - 1, uy, cuerpo - 12 - uy, 'ocre'); C.vl(ux + 3, uy, cuerpo - 12 - uy, 'crema');
  C.f(ux - 2, uy - 3, uw + 4, 4, 'crema'); C.hl(ux - 2, uy - 3, uw + 4, 'luz'); C.hl(ux - 2, uy + 1, uw + 4, 'terracota');
  const ry = uy + 22;
  C.d(cx, ry, 13, 'ocre'); C.d(cx, ry, 12, 'crema'); C.d(cx, ry, 10, 'luz');
  for (let h = 0; h < 12; h++) { const a = (h / 12) * Math.PI * 2; C.p(Math.round(cx + Math.sin(a) * 9), Math.round(ry - Math.cos(a) * 9), 'tinta'); }
  C.ln(cx, ry, cx - 4, ry + 3, 'tinta'); C.ln(cx, ry, cx, ry - 7, 'tinta'); C.p(cx, ry, 'rojo');
  for (let y = ry + 16; y < cuerpo - 14; y += 6) ventanaArco(C, cx - 4, y, 8, 5, 'crema', 'celeste', 'azul');
  // techito y bandera
  for (let y = uy - 18; y < uy - 3; y++) { const k = y - (uy - 18), hw = Math.round(4 + k * 1.4); C.hl(cx - hw, y, hw * 2, (k % 3 === 2 ? 'vino' : 'terracota')); C.p(cx - hw, y, 'vino'); }
  C.vl(cx, uy - 34, 16, 'cemento'); bandera(C, cx, uy - 18);
}

// ------------------------------------------------------------------ interior del mercado

const ZONA_TEXTO: Record<string, string> = {
  puesto_ropa: 'QUẦN ÁO', puesto_flores: 'HOA TƯƠI', puesto_telas: 'VẢI', puesto_comida: 'ĂN UỐNG', puesto_recuerdos: 'LƯU NIỆM', puesto_cafe: 'CÀ PHÊ', puesto_frutas: 'TRÁI CÂY',
};

/** Una cercha de acero triangular bajo el techo, entre `xa` y `xb`. */
function cercha(C: Lienzo, xa: number, xb: number, y0: number, y1: number) {
  const cx = Math.round((xa + xb) / 2);
  C.ln(xa, y1, cx, y0, 'cemento_claro'); C.ln(cx, y0, xb, y1, 'cemento_claro'); C.ln(xa, y1 + 1, cx, y0 + 1, 'asfalto_claro'); C.ln(cx, y0 + 1, xb, y1 + 1, 'asfalto_claro');
  C.hl(xa, y1, xb - xa, 'cemento_claro'); C.hl(xa, y1 + 1, xb - xa, 'asfalto_claro');
  for (let x = xa + 16; x < xb - 8; x += 16) { const t = x < cx ? (x - xa) / (cx - xa) : (xb - x) / (xb - cx); const yt = Math.round(y1 - t * (y1 - y0)); C.vl(x, yt, y1 - yt, 'cemento'); C.ln(x, y1, x + 8, Math.round(y1 - (x + 8 < cx ? (x + 8 - xa) / (cx - xa) : (xb - x - 8) / (xb - cx)) * (y1 - y0)), 'cemento'); }
}

/** Mercancía en los estantes del fondo, sobre lona clara. */
function estante(C: Lienzo, x: number, y: number, w: number, h: number, k: number, R: () => number) {
  C.f(x, y, w, h, 'crema'); C.speckle(x, y, w, h, 'cemento_claro', 0.1, x);
  const cols: Color[] = ['rojo', 'celeste', 'amarillo', 'menta', 'salmon', 'azul', 'oro', 'verde', 'luz'];
  for (let yy = y + 2; yy < y + h - 6; yy += 10) {
    C.hl(x, yy + 8, w, 'ocre'); C.hl(x, yy + 9, w, 'terracota');
    for (let xx = x + 1; xx < x + w - 5; xx += 6) {
      const c = cols[Math.floor(R() * cols.length)], t = (k + (xx >> 4)) % 4;
      if (t === 0) { C.f(xx, yy + 2, 5, 6, c); C.hl(xx, yy + 2, 5, 'luz'); } // cajas
      else if (t === 1) { C.d(xx + 2, yy + 5, 2.5, c); C.p(xx + 1, yy + 4, 'luz'); } // frascos
      else if (t === 2) { C.f(xx + 1, yy, 3, 8, c); C.p(xx + 2, yy - 1, 'sombra'); } // bolsos colgados
      else { for (let j = 0; j < 4; j++) C.hl(xx + 2 - (j >> 1), yy + 4 + j, 1 + j, j === 3 ? 'ocre' : 'amarillo'); } // nón lá
    }
  }
}

/** El mercado por dentro: techo de lámina con claraboya, cerchas, lámparas, letreros de zona y los puestos del fondo. */
export const mercadoInterior: PintorCerca = (C, x0, x1, base, ctx) => {
  const R = rng(ctx.seed + 9);
  // techo de lámina (las ondas corren hacia el fondo)
  for (let y = 0; y < 30; y++) for (let x = x0; x < x1; x++) C.p(x, y, x % 4 === 0 ? 'asfalto' : x % 4 === 1 ? 'cemento' : 'asfalto_claro');
  // claraboya: vidrios con la luz de la mañana
  for (let y = 30; y < 46; y++) for (let x = x0; x < x1; x++) C.p(x, y, x % 24 === 0 || y === 30 || y === 45 ? 'cemento' : y < 34 || bayer(x, y) < 0.15 ? 'luz' : 'cielo');
  // muro alto
  C.f(x0, 46, x1 - x0, 58, 'cemento_claro'); C.hl(x0, 46, x1 - x0, 'cemento'); C.speckle(x0, 47, x1 - x0, 56, 'crema', 0.08, ctx.seed);
  for (let x = x0 + 6; x < x1; x += 40) { C.box(x, 54, 24, 16, 'cemento', 'asfalto_claro'); for (let y = 56; y < 68; y += 3) C.hl(x + 1, y, 22, 'asfalto_claro'); }
  // cerchas cada 200
  for (let x = x0 - ((x0 - 40) % 200); x < x1; x += 200) cercha(C, x, x + 200, 6, 58);
  // tubos de luz colgando
  for (let x = x0 + 30; x < x1 - 20; x += 80) { C.vl(x + 2, 58, 8, 'asfalto_claro'); C.vl(x + 13, 58, 8, 'asfalto_claro'); C.f(x, 66, 16, 3, 'cemento'); C.hl(x + 1, 68, 14, 'luz'); }
  // letreros de zona colgados, con lo que se vende en la fila de puestos de adelante
  for (const z of ctx.zonas ?? []) {
    const t = ZONA_TEXTO[z.tipo]; if (!t || z.x1 <= x0 || z.x0 >= x1) continue;
    const cx = Math.round((z.x0 + z.x1) / 2);
    C.vl(cx - 12, 58, 18, 'asfalto_claro'); C.vl(cx + 12, 58, 18, 'asfalto_claro');
    letrero(C, cx, 76, t, 'azul', 'luz', 'azul_noche', 4);
  }
  // columnas cada 400, pintadas de verde abajo
  const cols: number[] = [];
  for (let x = x0 + 200 - ((x0 - 40) % 200); x < x1 - 10; x += 400) cols.push(x);
  // puestos del fondo: cortina enrollada, placa, mercancía y mostrador
  const fy = base - 96;
  for (let x = x0, k = 0; x < x1; k++) {
    const w = Math.min(x1 - x, 44 + Math.floor(R() * 20));
    C.f(x, fy, w, 8, 'cemento'); for (let y = fy + 1; y < fy + 8; y += 2) C.hl(x, y, w, 'cemento_claro');
    estante(C, x, fy + 8, w, 60, k, R);
    const num = `${String.fromCharCode(65 + (k % 8))}${100 + k * 3}`;
    C.box(x + 3, fy + 9, textWidth(num) + 4, 9, 'azul', 'azul_noche'); drawText(C, x + 5, fy + 6, num, 'luz');
    C.f(x, base - 28, w, 28, 'ocre'); C.hl(x, base - 28, w, 'amarillo'); C.hl(x, base - 27, w, 'terracota');
    for (let xx = x + 4; xx < x + w - 6; xx += 7) { C.f(xx, base - 34, 6, 6, (['rojo', 'amarillo', 'luz', 'menta'] as Color[])[(xx >> 3) % 4]); C.hl(xx, base - 34, 6, 'luz'); }
    for (let xx = x + 3; xx < x + w; xx += 10) C.vl(xx, base - 25, 22, 'terracota');
    C.vl(x, fy, base - fy, 'asfalto_claro');
    x += w;
  }
  for (const cx of cols) {
    C.f(cx - 5, 46, 10, base - 46, 'cemento_claro'); C.vl(cx - 5, 46, base - 46, 'luz'); C.vl(cx + 4, 46, base - 46, 'cemento');
    C.f(cx - 7, 46, 14, 4, 'cemento'); C.hl(cx - 7, 46, 14, 'luz');
    C.f(cx - 5, base - 40, 10, 40, 'verde'); C.vl(cx - 5, base - 40, 40, 'menta'); C.vl(cx + 4, base - 40, 40, 'verde_oscuro'); C.hl(cx - 5, base - 40, 10, 'menta');
  }
  C.hl(x0, base - 1, x1 - x0, 'cemento');
};

/** Arco de salida del mercado a la calle, con la luz de afuera. Centrado en `cx`. */
export function arcoSalida(C: Lienzo, cx: number, base: number, texto = 'CỬA BẮC') {
  const w = 56, x0 = cx - w / 2, y0 = base - 120;
  C.f(x0 - 6, y0 - 6, w + 12, base - y0 + 6, 'amarillo'); C.vl(x0 - 6, y0 - 6, base - y0 + 6, 'ocre'); C.vl(x0 + w + 5, y0 - 6, base - y0 + 6, 'ocre');
  C.hl(x0 - 6, y0 - 6, w + 12, 'luz');
  for (let j = 0; j < base - y0; j++) for (let i = 0; i < w; i++) {
    const r = w / 2, dy = j - r;
    if (dy < 0 && (i - r + 0.5) ** 2 + dy * dy > r * r) continue;
    const edge = dy < 0 && (i - r + 0.5) ** 2 + dy * dy > (r - 2) ** 2;
    C.p(x0 + i, y0 + j, edge ? 'crema' : j > base - y0 - 30 ? (bayer(i, j) < 0.5 ? 'cemento_claro' : 'luz') : bayer(i, j) < 0.2 ? 'bruma' : 'luz');
  }
  letrero(C, cx, y0 + 4, texto, 'vino', 'oro', 'tinta');
}

// ------------------------------------------------------------------ el río

/** Edificio colonial del malecón: repello crema, persianas verdes, techo de teja y un letrero. */
function colonial(C: Lienzo, x: number, base: number, w: number, pisos: number, R: () => number, letra?: string) {
  const h = 22 + pisos * 26, y0 = base - h;
  C.f(x, y0, w, h, 'crema'); C.vl(x, y0, h, 'cemento_claro'); C.vl(x + w - 1, y0, h, 'cemento');
  for (let k = 0; k < pisos; k++) {
    const fy = y0 + 14 + k * 26;
    C.hl(x, fy - 2, w, 'cemento_claro');
    for (let wx = x + 5; wx < x + w - 10; wx += 13) {
      C.f(wx, fy + 4, 8, 14, 'verde'); for (let y = fy + 6; y < fy + 17; y += 2) C.hl(wx, y, 8, 'verde_oscuro'); C.vl(wx + 4, fy + 4, 14, 'verde_oscuro');
      C.f(wx - 1, fy + 2, 10, 2, 'luz'); C.hl(wx - 1, fy + 18, 10, 'cemento');
      if (k === 0 && R() < 0.3) { C.f(wx + 2, fy + 4, 4, 14, 'azul_noche'); }
    }
    C.f(x + 2, fy + 19, w - 4, 2, 'cemento_claro'); for (let bx = x + 3; bx < x + w - 3; bx += 3) C.vl(bx, fy + 15, 4, 'cemento');
  }
  // techo de teja y alero
  for (let y = y0 - 10; y < y0; y++) { const m = Math.round((y0 - y) * 0.8); C.hl(x + m, y, w - m * 2, (y % 3 === 0 ? 'vino' : 'terracota')); }
  C.hl(x - 2, y0, w + 4, 'cemento');
  if (letra) letrero(C, x + w / 2, y0 + 2, letra, 'vino', 'oro', 'tinta');
}

/** El malecón Bạch Đằng: jardinera con seto y flores, tamarindos y edificios coloniales detrás. */
export const malecon: PintorCerca = (C, x0, x1, base, ctx) => {
  const R = rng(ctx.seed + 21), nombres = ['KHÁCH SẠN', 'NHÀ HÀNG', 'BẢO TÀNG', 'CÀ PHÊ'];
  let x = x0 - 20, k = 0;
  while (x < x1) {
    const w = 90 + Math.floor(R() * 60);
    colonial(C, x, base - 6, w, 2 + Math.floor(R() * 2), R, R() < 0.6 ? nombres[k % nombres.length] : undefined);
    x += w + 20 + Math.floor(R() * 60); k++;
  }
  for (let ax = x0 + 30; ax < x1; ax += 110 + Math.floor(R() * 60)) arbol(C, ax, base - 8, 110 + Math.floor(R() * 30), ctx.seed + ax);
  // jardinera baja con seto y flores, y la baranda de hierro
  for (let xx = x0; xx < x1; xx++) {
    for (let y = base - 22; y < base - 8; y++) C.p(xx, y, y === base - 22 ? 'menta' : grain(xx >> 1, y, 4) < 0.25 ? 'verde_oscuro' : 'verde');
    if (grain(xx, 0, 8) < 0.12) C.p(xx, base - 21 + Math.floor(grain(xx, 1, 8) * 6), grain(xx, 2, 8) < 0.5 ? 'rojo' : 'amarillo');
    C.f(xx, base - 8, 1, 8, 'cemento_claro'); if (xx % 16 === 0) C.vl(xx, base - 8, 8, 'cemento');
  }
  C.hl(x0, base - 8, x1 - x0, 'luz'); C.hl(x0, base - 1, x1 - x0, 'cemento');
};

/** El río abierto: se ve el agua hasta la otra orilla, donde está Landmark 81 (en la capa lejos). */
export const rioAbierto: PintorCerca = (C, x0, x1, base, ctx) => {
  const top = base - 34, R = rng(ctx.seed + 31);
  for (let y = top; y < base; y++) for (let x = x0; x < x1; x++) {
    const t = (y - top) / (base - top);
    C.p(x, y, y === top ? 'verde_oscuro' : bayer(x, y) < 0.06 + t * 0.12 ? 'azul' : grain(x >> 3, y, 5) < 0.12 ? 'canal' : 'celeste');
  }
  // reflejos en rayitas, más largas adelante
  for (let k = 0; k < (x1 - x0) / 6; k++) { const y = top + 2 + Math.floor(R() * (base - top - 3)), x = x0 + Math.floor(R() * (x1 - x0)), len = 2 + Math.floor(((y - top) / (base - top)) * 8); C.hl(x, y, len, R() < 0.3 ? 'luz' : 'cielo'); }
  // botes chicos a lo lejos
  for (let x = x0 + 80; x < x1 - 40; x += 220 + Math.floor(R() * 120)) {
    const y = top + 4 + Math.floor(R() * 8);
    C.f(x, y, 14, 2, 'sombra'); C.hl(x + 1, y + 2, 12, 'asfalto'); C.f(x + 4, y - 3, 5, 3, 'crema'); C.hl(x - 2, y + 3, 18, 'cielo');
  }
};

/** Casa de palafito de Thủ Thiêm: tablas, techo de zinc con óxido y pilotes. */
const TABLAS: [Color, Color][] = [['ocre', 'terracota'], ['celeste', 'azul'], ['menta', 'canal'], ['crema', 'cemento'], ['salmon', 'terracota']];
function palafito(C: Lienzo, x: number, base: number, w: number, R: () => number) {
  const h = 30 + Math.floor(R() * 22), y0 = base - h - 12, [pc, ps] = TABLAS[Math.floor(R() * TABLAS.length)];
  for (let px = x + 3; px < x + w; px += 12) C.vl(px, y0 + h, base - y0 - h, 'terracota');
  C.f(x, y0, w, h, pc);
  for (let xx = x; xx < x + w; xx += 4) C.vl(xx, y0, h, (xx >> 2) % 3 === 0 ? ps : pc);
  // un bote amarrado al pie
  if (R() < 0.5) { const bx = x + Math.floor(R() * (w - 20)); C.f(bx, base - 6, 22, 3, 'vino'); C.hl(bx + 2, base - 3, 18, 'terracota'); C.f(bx + 6, base - 9, 8, 3, 'ocre'); }
  C.hl(x, y0 + h - 1, w, 'vino');
  // ventana y puerta
  C.f(x + 6, y0 + 10, 10, 9, 'sombra'); C.hl(x + 6, y0 + 10, 10, 'terracota'); C.f(x + 8, y0 + 12, 3, 7, 'celeste');
  C.f(x + w - 16, y0 + 12, 10, h - 12, 'vino'); C.vl(x + w - 15, y0 + 13, h - 14, 'terracota');
  // techo de zinc
  for (let y = y0 - 9; y < y0; y++) { const m = Math.round((y0 - y) * 0.5); for (let xx = x - 4 + m; xx < x + w + 4 - m; xx++) C.p(xx, y, xx % 3 === 0 ? 'cemento' : grain(xx >> 1, y, 6) < 0.18 ? 'terracota' : 'cemento_claro'); }
  C.hl(x - 4, y0, w + 8, 'asfalto_claro');
  // ropa al sol
  if (R() < 0.6) for (let xx = x + 2; xx < x + w - 6; xx += 8) { C.f(xx, y0 + h + 2, 5, 6, (['luz', 'rojo', 'azul', 'amarillo'] as Color[])[(xx >> 3) % 4]); }
}

/** Mata de dừa nước: hojas largas que salen del agua. */
function duaNuoc(C: Lienzo, x: number, base: number, seed: number) {
  const R = rng(seed);
  for (let k = 0; k < 9; k++) {
    const a = -Math.PI / 2 + (k - 4) * 0.28 + (R() - 0.5) * 0.15, len = 22 + R() * 16;
    for (let i = 0; i < len; i++) { const t = i / len, px = Math.round(x + Math.cos(a) * i), py = Math.round(base + Math.sin(a) * i + t * t * 8); C.p(px, py, i % 2 ? 'verde' : 'verde_oscuro'); if (i > 4 && i % 2 === 0) { C.p(px - 1, py + 1, 'verde'); C.p(px + 1, py + 1, 'menta'); } }
  }
}

/** La orilla de Thủ Thiêm: palafitos, dừa nước y cocoteros, y el canal que se abre hacia atrás. */
export const orillaThuThiem: PintorCerca = (C, x0, x1, base, ctx) => {
  const R = rng(ctx.seed + 41);
  // agua al pie, entre los pilotes
  for (let y = base - 14; y < base; y++) for (let x = x0; x < x1; x++) C.p(x, y, bayer(x, y) < 0.2 ? 'celeste' : 'canal');
  for (let x = x0 + 20; x < x1; x += 60 + Math.floor(R() * 50)) palmera(C, x, base - 10, 70 + Math.floor(R() * 30), R() < 0.5 ? 1 : -1, ctx.seed + x);
  for (let x = x0 + 10; x < x1 - 40;) {
    const w = 46 + Math.floor(R() * 24);
    if (!(ctx.huecos ?? []).some((h) => x + w > h.x0 - 10 && x < h.x1 + 10)) palafito(C, x, base, w, R);
    x += w + 30 + Math.floor(R() * 60);
  }
  for (let x = x0 + 5; x < x1; x += 22 + Math.floor(R() * 20)) if (!(ctx.huecos ?? []).some((h) => x > h.x0 - 16 && x < h.x1 + 16)) duaNuoc(C, x, base - 2, ctx.seed + x);
  for (let x = x0; x < x1; x += 3) C.p(x, base - 14 + ((x >> 2) % 2), 'cielo');
};

// ------------------------------------------------------------------ azoteas

const AVISOS: [string, Color, Color][] = [['KARAOKE', 'vino', 'oro'], ['KHÁCH SẠN', 'azul_noche', 'menta'], ['CÀ PHÊ', 'tinta', 'rojo'], ['NHÀ HÀNG', 'vino', 'luz'], ['PHỞ', 'tinta', 'amarillo'], ['SPA', 'azul_noche', 'salmon']];

/** Azoteas vecinas detrás de la nuestra: pisos de arriba con ventanas prendidas, tanques, avisos y un café con bombillos. */
export const azoteas: PintorCerca = (C, x0, x1, base, ctx) => {
  const R = rng(ctx.seed + 51), par = base - 16;
  const paredes: Color[] = ['crema', 'salmon', 'menta', 'cemento_claro', 'amarillo', 'celeste'];
  // edificios vecinos de distintos altos
  for (let x = x0 - 10, k = 0; x < x1; k++) {
    const w = 60 + Math.floor(R() * 70), h = 36 + Math.floor(R() * 56), y0 = par - h, c = paredes[(k + Math.floor(R() * 2)) % paredes.length];
    C.f(x, y0, w, h, c); C.vl(x, y0, h, 'luz'); C.vl(x + w - 1, y0, h, 'cemento'); C.hl(x, y0, w, 'cemento');
    C.speckle(x, y0, w, h, 'cemento', 0.06, x);
    for (let fy = y0 + 8; fy < par - 10; fy += 18) for (let wx = x + 6; wx < x + w - 10; wx += 14) {
      const pr = R() < 0.4; C.f(wx, fy, 8, 10, pr ? 'oro' : 'asfalto_claro'); C.hl(wx, fy, 8, pr ? 'amarillo' : 'cemento'); if (!pr) C.p(wx + 2, fy + 3, 'cemento_claro');
      C.hl(wx - 1, fy + 10, 10, 'cemento');
    }
    // en el techo: tanque, aviso o café
    const que = R();
    if (que < 0.35) { const tx = x + 8 + Math.floor(R() * (w - 30)); C.f(tx, y0 - 16, 14, 16, 'cemento_claro'); C.vl(tx, y0 - 16, 16, 'luz'); C.vl(tx + 13, y0 - 16, 16, 'cemento'); C.hl(tx, y0 - 16, 14, 'luz'); for (let yy = y0 - 12; yy < y0; yy += 5) C.hl(tx, yy, 14, 'cemento'); }
    else if (que < 0.7) {
      const [t, f, l] = AVISOS[Math.floor(R() * AVISOS.length)], aw = textWidth(t) + 10, ax = x + Math.max(2, Math.floor((w - aw) / 2));
      C.vl(ax + 3, y0 - 8, 8, 'asfalto_claro'); C.vl(ax + aw - 4, y0 - 8, 8, 'asfalto_claro');
      C.box(ax, y0 - 22, aw, 14, f, 'asfalto'); drawText(C, ax + 5, y0 - 22, t, l);
    } else {
      // café de azotea: sombrillas y bombillos colgados
      for (let ux = x + 10; ux < x + w - 16; ux += 24) { C.vl(ux + 7, y0 - 14, 14, 'cemento'); for (let j = 0; j < 5; j++) C.hl(ux + 7 - j * 2, y0 - 18 + j, 1 + j * 4, j === 4 ? 'vino' : 'rojo'); }
      for (let xx = x + 2; xx < x + w - 2; xx++) { const yy = y0 - 22 + Math.round(Math.sin(((xx - x) / w) * Math.PI) * 4); C.p(xx, yy, 'sombra'); if (xx % 6 === 0) C.p(xx, yy + 1, 'oro'); }
    }
    x += w + (R() < 0.3 ? 8 + Math.floor(R() * 12) : 0);
  }
  // nuestra baranda del fondo: murito con matas, cortado en los huecos entre edificios
  const enHueco = (x: number) => (ctx.huecos ?? []).some((h) => x >= h.x0 && x < h.x1);
  for (let x = x0; x < x1; x++) {
    if (enHueco(x)) continue;
    C.f(x, par, 1, 16, 'crema'); C.p(x, par, 'luz'); C.p(x, par + 1, 'cemento_claro'); C.p(x, base - 1, 'cemento');
    if (grain(x >> 3, 0, 9) < 0.12) { C.f(x, par - 6, 1, 6, 'terracota'); C.p(x, par - 9 - (x % 3), 'verde'); }
  }
  // los huecos: el vacío entre edificios, con las paredes que bajan
  for (const h of ctx.huecos ?? []) {
    if (h.x1 <= x0 || h.x0 >= x1) continue;
    for (let y = par - 70; y < base; y++) for (let x = h.x0; x < h.x1; x++) {
      const t = (y - par + 70) / 86;
      C.p(x, y, x === h.x0 || x === h.x1 - 1 ? 'cemento' : bayer(x, y) < t * 0.6 ? 'asfalto' : 'asfalto_claro');
    }
    // cables que cruzan el hueco
    for (let k = 0; k < 3; k++) { const y = par - 50 + k * 14; for (let x = h.x0; x < h.x1; x++) C.p(x, y + Math.round(Math.sin(((x - h.x0) / (h.x1 - h.x0)) * Math.PI) * 4), 'sombra'); }
  }
};

// ------------------------------------------------------------------ el estadio

const VALLAS_AVISO: [string, Color, Color][] = [['NEKKETSU', 'luz', 'rojo'], ['VIỆT NAM', 'rojo', 'oro'], ['SÀI GÒN', 'azul', 'luz'], ['GG', 'oro', 'vino'], ['CỐ LÊN!', 'luz', 'azul'], ['CROSS', 'menta', 'azul_noche']];

/** El estadio por fuera: muro con aletas, el nombre, banderas y la taquilla. */
export const estadioFuera: PintorCerca = (C, x0, x1, base, ctx) => {
  const top = base - 112;
  for (let x = x0 + 10; x < x1; x += 70) arbol(C, x, base, 96, ctx.seed + x);
  C.f(x0 + 60, top, x1 - x0 - 60, base - top, 'cemento_claro'); C.hl(x0 + 60, top, x1 - x0 - 60, 'luz');
  for (let x = x0 + 64; x < x1; x += 12) { C.f(x, top + 4, 4, base - top - 4, 'crema'); C.vl(x + 3, top + 4, base - top - 4, 'cemento'); }
  C.f(x0 + 60, top + 2, x1 - x0 - 60, 3, 'azul'); C.f(x0 + 60, base - 30, x1 - x0 - 60, 3, 'azul');
  letrero(C, Math.round((x0 + 60 + x1) / 2), top + 14, 'SÂN VẬN ĐỘNG', 'azul', 'luz', 'azul_noche', 5);
  // taquilla
  const tx = x0 + 90;
  C.box(tx, base - 34, 40, 34, 'crema', 'cemento'); C.f(tx + 4, base - 26, 32, 12, 'azul_noche'); C.hl(tx + 4, base - 26, 32, 'celeste');
  letrero(C, tx + 20, base - 44, 'VÉ', 'rojo', 'luz', 'vino');
  // astas con banderas
  for (let x = x0 + 150; x < x1 - 10; x += 40) { C.vl(x, top - 44, 44 + 30, 'cemento'); bandera(C, x, top - 30); }
};

/** Gradas llenas: valla de avisos adelante, filas de público con banderas, escaleras y el techo voladizo. */
export const gradas: PintorCerca = (C, x0, x1, base, ctx) => {
  const R = rng(ctx.seed + 61), techo = 84, vy = base - 24;
  // techo voladizo: el canto, la cara de abajo en sombra y las vigas que lo sostienen
  C.f(x0, techo - 16, x1 - x0, 6, 'cemento_claro'); C.hl(x0, techo - 16, x1 - x0, 'luz'); C.hl(x0, techo - 11, x1 - x0, 'cemento');
  C.f(x0, techo - 10, x1 - x0, 10, 'asfalto_claro'); for (let x = x0; x < x1; x += 8) C.vl(x, techo - 10, 10, 'asfalto');
  for (let x = x0 + 4; x < x1; x += 32) { C.f(x, techo - 22, 3, 6, 'cemento'); C.f(x - 2, techo - 25, 7, 3, 'luz'); }
  // filas de público
  const piel: Color[] = ['salmon', 'ocre', 'terracota', 'crema'], ropa: Color[] = ['rojo', 'amarillo', 'luz', 'celeste', 'rojo', 'oro', 'menta', 'azul'];
  for (let y = techo; y < vy - 6; y += 9) {
    const sombra = y < techo + 30;
    C.f(x0, y, x1 - x0, 9, sombra ? 'asfalto_claro' : 'cemento'); C.hl(x0, y + 8, x1 - x0, sombra ? 'asfalto' : 'asfalto_claro');
    for (let x = x0 + ((y >> 3) % 2) * 2; x < x1 - 4; x += 5) {
      if (grain(x >> 2, y, 7) < 0.08) { C.f(x, y + 5, 4, 3, (y >> 3) % 2 ? 'rojo' : 'azul'); continue; } // silla vacía
      const c = ropa[Math.floor(R() * ropa.length)];
      C.f(x, y + 4, 4, 4, c); C.d(x + 1.5, y + 2, 1.6, piel[Math.floor(R() * piel.length)]); C.p(x + 1, y + 1, 'tinta');
      if (R() < 0.05) { C.vl(x + 3, y - 6, 8, 'cemento'); C.f(x + 4, y - 6, 6, 4, 'rojo'); C.p(x + 6, y - 5, 'oro'); } // bandera
    }
  }
  // escaleras cada 240 y una pancarta grande
  for (let x = x0 + 120; x < x1; x += 240) { C.f(x, techo, 10, vy - techo, 'cemento_claro'); for (let y = techo + 2; y < vy; y += 4) C.hl(x, y, 10, 'cemento'); }
  for (let x = x0 + 300; x < x1 - 140; x += 600) { const t = 'CỐ LÊN NEKKETSU!'; C.f(x, techo + 30, textWidth(t) + 10, 14, 'luz'); C.hl(x, techo + 30, textWidth(t) + 10, 'cemento'); drawText(C, x + 5, techo + 31, t, 'rojo'); }
  // columnas del techo
  for (let x = x0 + 60; x < x1; x += 240) { C.f(x, techo - 10, 4, vy - techo + 10, 'cemento'); C.vl(x, techo - 10, vy - techo + 10, 'cemento_claro'); }
  // valla de avisos
  C.hl(x0, vy - 2, x1 - x0, 'cemento_claro'); C.hl(x0, vy - 1, x1 - x0, 'cemento');
  for (let x = x0, k = 0; x < x1; x += 96, k++) {
    const [t, f, l] = VALLAS_AVISO[k % VALLAS_AVISO.length], w = Math.min(96, x1 - x);
    C.f(x, vy, w, base - vy, f); C.hl(x, vy, w, 'luz'); C.vl(x, vy, base - vy, 'cemento'); C.hl(x, base - 1, w, 'cemento');
    if (textWidth(t) < w - 8) drawText(C, x + Math.floor((w - textWidth(t)) / 2), vy + 4, t, l);
  }
};

/** El marcador del estadio sobre las gradas: pantalla de puntos con VỀ ĐÍCH y el reloj. */
export const marcador: PintorCerca = (C, x0, x1) => {
  const w = Math.min(160, x1 - x0 - 20), x = Math.round((x0 + x1 - w) / 2), y = 6, h = 60;
  for (const px of [x + 20, x + w - 26]) { C.f(px, y + h, 6, 40, 'cemento'); C.vl(px, y + h, 40, 'cemento_claro'); }
  C.box(x - 3, y - 3, w + 6, h + 6, 'cemento', 'asfalto'); C.f(x, y, w, h, 'tinta');
  for (let yy = y + 1; yy < y + h; yy += 2) for (let xx = x + 1; xx < x + w; xx += 2) C.p(xx, yy, 'sombra');
  const t1 = 'VỀ ĐÍCH', t2 = '00:00.0';
  drawText(C, x + Math.floor((w - textWidth(t1)) / 2), y + 8, t1, 'oro');
  drawText(C, x + Math.floor((w - textWidth(t2)) / 2), y + 26, t2, 'luz');
  for (let xx = x + 8; xx < x + w - 8; xx += 6) C.p(xx, y + h - 8, (xx >> 3) % 2 ? 'rojo' : 'oro');
};

/** Qué pintor va con cada tema de `ranuras_deco` (capa cerca, o lejos cuando abre la vista). */
export const PINTORES_CERCA: Record<string, PintorCerca> = {
  calle_le_loi: fachadaBenThanh,
  mercado_interior: mercadoInterior,
  malecon_bach_dang: malecon,
  rio_landmark81: rioAbierto,
  orilla_thu_thiem: orillaThuThiem,
  azoteas_cafes: azoteas,
  gradas_llenas: gradas,
  marcador,
};

/** El fondo que va donde ningún tema dice nada, según `paralaje.cerca`. Sin entrada: la fila de casas tubo. */
export const FONDO_CERCA: Record<string, PintorCerca> = { azoteas, gradas: estadioFuera, rio: malecon };
