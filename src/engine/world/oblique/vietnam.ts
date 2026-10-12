import { rng, grain, bayer } from '../../fx/pix';
import { Lienzo } from './lienzo';
import { drawText, textWidth, LINE_H } from './letras';
import type { Color, Paleta } from './paleta';
import { banquito, moto, MOTO_W } from './calle';

/**
 * Estilo `vietnam`: casas tubo (nhà ống) del hẻm de Saigón y los objetos de la calle, en pixel art de 8 bits con la
 * paleta de la ficha. La luz viene de arriba a la izquierda.
 */

export const PB = 64; // alto de la planta baja: la puerta mide 44, como un atleta
export const PISO = 44; // alto de cada piso de arriba

export type ParedColor = 'amarillo' | 'salmon' | 'menta' | 'celeste' | 'crema';
const SOMBRA: Record<ParedColor, Color> = { amarillo: 'ocre', salmon: 'terracota', menta: 'canal', celeste: 'azul', crema: 'cemento_claro' };
const LUZ: Record<ParedColor, Color> = { amarillo: 'crema', salmon: 'crema', menta: 'cielo', celeste: 'cielo', crema: 'luz' };

export type PlantaBaja = 'reja' | 'cortina' | 'tienda' | 'cafe' | 'garaje' | 'pho' | 'farmacia' | 'ropa' | 'peluqueria' | 'sala';

/** El letrero va con lo que hay adentro: cada local tiene su lista. */
export const LETREROS_DE: Record<PlantaBaja, string[]> = {
  reja: [],
  cortina: [],
  tienda: ['TẠP HÓA', 'SIM THẺ', 'ĐIỆN THOẠI'],
  cafe: ['CÀ PHÊ', 'CÀ PHÊ SỮA ĐÁ', 'BIA HƠI', 'TRÀ ĐÁ'],
  garaje: ['SỬA XE', 'VÁ XE', 'RỬA XE'],
  pho: ['PHỞ 24', 'BÚN BÒ', 'HỦ TIẾU', 'CƠM TẤM', 'BÁNH MÌ'],
  farmacia: ['NHÀ THUỐC', 'THUỐC TÂY'],
  ropa: ['TIỆM MAY', 'ÁO DÀI', 'SHOP'],
  peluqueria: ['GỘI ĐẦU', 'CẮT TÓC', 'SALON'],
  sala: [],
};
export type Techo = 'tanque' | 'ton' | 'terraza';

export interface CasaTubo {
  w: number;
  pisos: number; // contando la planta baja
  pared: ParedColor;
  planta: PlantaBaja;
  letrero?: string;
  techo?: Techo;
  numero?: string;
  altar?: boolean;
  seed?: number;
}

/** Dónde quedó lo que se anima o echa partículas, en pixeles de la casa. */
export interface Anclas {
  ropa: { x: number; y: number; w: number; seed: number }[];
  altares: { x: number; y: number }[];
  buganvillas: { x: number; y: number }[];
  aires: { x: number; y: number }[];
}
export const nuevasAnclas = (): Anclas => ({ ropa: [], altares: [], buganvillas: [], aires: [] });

/** Alto total de una casa (con el techo). */
export const casaAlto = (c: CasaTubo) => PB + PISO * (c.pisos - 1) + 16;

/** Una casa tubo de frente, con la base en la última fila. */
export function casaTubo(pal: Paleta, c: CasaTubo, anclas?: Anclas): Lienzo {
  const W = c.w, H = casaAlto(c);
  const L = new Lienzo(W, H, pal);
  const R = rng(c.seed ?? 1);
  const base = c.pared, sh = SOMBRA[base], hi = LUZ[base];
  const roofY = 16; // donde empieza la pared
  // pared
  L.f(0, roofY, W, H - roofY, base);
  L.speckle(0, roofY, W, H - roofY, sh, 0.035, (c.seed ?? 1) * 7);
  // pilares a los lados: una franja de luz a la izquierda y de sombra a la derecha
  L.vl(1, roofY, H - roofY, hi); L.vl(W - 2, roofY, H - roofY, sh);
  L.vl(0, roofY, H - roofY, 'tinta'); L.vl(W - 1, roofY, H - roofY, 'tinta');

  // pisos de arriba, de abajo hacia arriba
  for (let k = 1; k < c.pisos; k++) {
    const fy = H - PB - PISO * k; // arriba de este piso
    piso(L, c, fy, k, R, k === c.pisos - 1, anclas);
  }
  plantaBaja(L, c, H - PB, R, anclas);
  techo(L, c, roofY, R);
  return L;
}

function piso(L: Lienzo, c: CasaTubo, fy: number, k: number, R: () => number, ultimo: boolean, anclas?: Anclas) {
  const W = c.w, sh = SOMBRA[c.pared], hi = LUZ[c.pared];
  // losa: canto claro arriba, sombra debajo y chorreado de mugre
  L.f(2, fy + PISO - 4, W - 4, 3, 'cemento_claro');
  L.hl(2, fy + PISO - 1, W - 4, 'cemento');
  L.hl(2, fy + PISO, W - 4, sh);
  L.drips(3, fy + PISO + 1, W - 6, 7, sh, k * 13 + (c.seed ?? 1));
  // vano con puertas de persiana o ventana con reja
  const ow = Math.min(W - 16, 56), ox = Math.floor((W - ow) / 2), oy = fy + 6, oh = 30;
  L.box(ox - 1, oy - 1, ow + 2, oh + 1, 'sombra', 'tinta');
  const tipo = (k + (c.seed ?? 0)) % 3;
  if (tipo === 0) {
    // puertas de persiana de madera, una abierta
    const pw = Math.floor(ow / 4);
    for (let i = 0; i < 4; i++) {
      const px = ox + i * pw, abierta = i === 1;
      if (abierta) { L.f(px, oy, pw, oh, 'azul_noche'); L.vl(px + 1, oy + 2, oh - 4, 'azul'); continue; }
      L.f(px, oy, pw - 1, oh, i % 3 ? 'verde' : 'verde');
      for (let y = oy + 2; y < oy + oh - 1; y += 3) L.hl(px + 1, y, pw - 3, 'verde_oscuro');
      L.vl(px + pw - 1, oy, oh, 'verde_oscuro');
    }
  } else if (tipo === 1) {
    // ventanal con vidrio y reja de hierro (song sắt)
    L.f(ox, oy, ow, oh, 'azul_noche');
    for (let i = 0; i < ow; i += 7) { L.ln(ox + i, oy + 6, ox + i + 5, oy + 1, 'celeste'); }
    for (let x = ox + 3; x < ox + ow; x += 4) L.vl(x, oy, oh, 'sombra');
    for (let y = oy + 4; y < oy + oh; y += 9) L.hl(ox, y, ow, 'sombra');
  } else {
    // puerta de vidrio con cortina
    L.f(ox, oy, ow, oh, 'azul_noche');
    L.f(ox + 2, oy + 2, Math.floor(ow / 2) - 3, oh - 2, 'crema');
    for (let y = oy + 2; y < oy + oh; y += 2) L.p(ox + 2 + ((y >> 1) % 3), y, 'cemento_claro');
    L.vl(ox + Math.floor(ow / 2), oy, oh, 'ocre');
    L.ln(ox + ow - 8, oy + 3, ox + ow - 3, oy + 8, 'cielo');
  }
  // dintel
  L.f(ox - 3, oy - 3, ow + 6, 2, hi);
  L.hl(ox - 3, oy - 1, ow + 6, sh);
  // balcón: baranda de hierro con curvas o de concreto
  const by = fy + PISO - 16;
  const sinBalcon = R() < 0.22;
  if (sinBalcon) {
    // solo el alféizar con su matica
    L.f(ox - 2, oy + oh, ow + 4, 3, 'cemento_claro'); L.hl(ox - 2, oy + oh + 3, ow + 4, sh);
    const px = ox + 4 + Math.floor(R() * (ow - 14));
    L.f(px, oy + oh - 4, 8, 4, 'terracota'); L.d(px + 4, oy + oh - 7, 4, 'verde'); L.p(px + 2, oy + oh - 9, 'menta'); L.p(px + 6, oy + oh - 6, 'verde_oscuro');
    if (ultimo) L.hl(2, fy, W - 4, sh);
    return;
  }
  if ((k + (c.seed ?? 0)) % 2) {
    L.f(3, by + 12, W - 6, 1, 'tinta');
    L.hl(3, by, W - 6, 'sombra'); L.hl(3, by + 1, W - 6, 'tinta');
    for (let x = 4; x < W - 4; x += 6) {
      L.vl(x, by + 2, 10, 'sombra');
      L.p(x + 2, by + 4, 'sombra'); L.p(x + 3, by + 5, 'sombra'); L.p(x + 2, by + 6, 'sombra');
      L.p(x + 2, by + 9, 'sombra'); L.p(x + 3, by + 8, 'sombra');
    }
  } else {
    L.f(3, by + 1, W - 6, 11, 'crema');
    L.hl(3, by, W - 6, 'luz');
    for (let x = 6; x < W - 6; x += 5) L.f(x, by + 4, 2, 6, 'cemento');
    L.hl(3, by + 11, W - 6, 'cemento');
  }
  // matas en el balcón
  const pots = 1 + Math.floor(R() * 3);
  for (let i = 0; i < pots; i++) {
    const px = 6 + Math.floor(R() * (W - 18));
    L.f(px, by + 5, 6, 6, 'terracota'); L.hl(px, by + 5, 6, 'salmon');
    L.d(px + 3, by + 2, 3.5, 'verde'); L.p(px + 2, by, 'menta'); L.p(px + 4, by + 3, 'verde_oscuro'); L.p(px + 1, by + 3, 'verde_oscuro');
    if (R() < 0.5) { L.p(px + 1, by + 1, 'rojo'); L.p(px + 5, by + 2, 'rojo'); L.p(px + 3, by - 1, 'salmon'); }
  }
  // buganvilla que se derrama por la baranda: en cascadas grandes, lo que más color le da al hẻm
  if (R() < 0.5) {
    const bx = R() < 0.5 ? 12 + Math.floor(R() * 8) : W - 12 - Math.floor(R() * 8);
    buganvilla(L, bx, by, 18 + Math.floor(R() * 26), (c.seed ?? 1) * 31 + k);
    anclas?.buganvillas.push({ x: bx, y: by + 6 });
  }
  // ropa tendida en algunos balcones: con anclas va aparte, para animarla con el viento
  if (R() < 0.35) {
    const lw = Math.min(W - 8, 24 + Math.floor(R() * 24)), lx = 4 + Math.floor(R() * (W - 8 - lw)), ly = by - 9, rs = Math.floor(R() * 1000);
    if (anclas) anclas.ropa.push({ x: lx, y: ly, w: lw, seed: rs });
    else ropaTendida(L, lx, ly, lw, rs, 0);
  }
  // aire acondicionado colgado
  if (R() < 0.6) {
    const ax = R() < 0.5 ? 3 : W - 17;
    L.box(ax, oy + 2, 14, 9, 'luz', 'cemento');
    anclas?.aires.push({ x: ax + 3, y: oy + 12 });
    for (let y = oy + 4; y < oy + 10; y += 2) L.hl(ax + 2, y, 10, 'cemento_claro');
    L.hl(ax, oy + 11, 14, sh);
  }
  if (ultimo) L.hl(2, fy, W - 4, sh);
}

function plantaBaja(L: Lienzo, c: CasaTubo, gy: number, R: () => number, anclas?: Anclas) {
  const W = c.w, sh = SOMBRA[c.pared];
  // letrero arriba del vano
  const sy = gy + 2, shh = LINE_H + 3;
  const pal: [Color, Color, Color][] = [['rojo', 'oro', 'vino'], ['azul', 'luz', 'azul_noche'], ['amarillo', 'rojo', 'ocre'], ['luz', 'rojo', 'cemento_claro']];
  const [bg, fg, ed] = pal[(c.seed ?? 0) % pal.length];
  if (c.letrero) {
    const tw = textWidth(c.letrero), bw = Math.min(W - 6, Math.max(tw + 8, W - 10)), bx = Math.floor((W - bw) / 2);
    L.box(bx, sy, bw, shh, bg, ed);
    L.hl(bx + 1, sy + 1, bw - 2, fg === 'luz' ? 'celeste' : 'luz');
    drawText(L, bx + Math.floor((bw - tw) / 2), sy + 1, c.letrero, fg);
    L.hl(bx, sy + shh, bw, sh);
  }
  // vano de la tienda
  const ox = 4, oy = gy + 18, ow = W - 8, oh = PB - 18 - 2;
  L.f(ox - 1, oy - 1, ow + 2, oh + 1, 'tinta');
  L.f(ox, oy, ow, oh, 'sombra');
  L.hl(ox, oy, ow, 'tinta');
  // umbral
  L.f(0, gy + PB - 2, W, 2, 'cemento');
  L.hl(0, gy + PB - 2, W, 'cemento_claro');
  const floorY = gy + PB - 2;
  if (c.planta === 'reja') rejaPlegable(L, ox, oy, ow, oh, 0.7);
  else if (c.planta === 'cortina') cortinaMetalica(L, ox, oy, ow, oh, (c.seed ?? 0) % 3 === 0 ? 'azul' : 'verde', R);
  else if (c.planta === 'tienda') tienda(L, ox, oy, ow, oh, R);
  else if (c.planta === 'cafe') cafe(L, ox, oy, ow, oh, floorY, R);
  else if (c.planta === 'garaje') { garajeMoto(L, ox, oy, ow, oh, R); rejaPlegable(L, ox, oy, ow, oh, 0.25); }
  else if (c.planta === 'farmacia') farmacia(L, ox, oy, ow, oh);
  else if (c.planta === 'ropa') ropa(L, ox, oy, ow, oh, R);
  else if (c.planta === 'peluqueria') peluqueria(L, ox, oy, ow, oh);
  else if (c.planta === 'sala') sala(L, ox, oy, ow, oh, R);
  else pho(L, ox, oy, ow, oh);
  // toldo de rayas sobre los locales que venden: verde, azul o rojo, cada uno con su crema
  if ((c.planta === 'tienda' || c.planta === 'cafe' || c.planta === 'pho' || c.planta === 'ropa' || c.planta === 'farmacia') && ((c.seed ?? 0) * 7) % 10 < 7) {
    const cols: Color[] = ['verde', 'azul', 'rojo', 'canal'];
    toldoRayas(L, 1, oy - 2, W - 2, cols[(c.seed ?? 0) % cols.length]);
  }
  // altar de la tierra (Thần Tài) en el piso, en la esquina
  if (c.altar) {
    const ax = c.planta === 'reja' ? ox + ow - 14 : ox + 1;
    altarTierra(L, ax, floorY - 12);
    anclas?.altares.push({ x: ax + 7, y: floorY - 18 });
  }
  // numero de casa en placa azul
  if (c.numero) {
    const nw = textWidth(c.numero) + 4;
    L.box(W - nw - 3, gy + 20 + (c.letrero ? 0 : -14), nw, 9, 'azul', 'azul_noche');
    drawText(L, W - nw - 1, gy + 17 + (c.letrero ? 0 : -14), c.numero, 'luz');
  }
}

/**
 * Ropa tendida en su cuerda, de `w` de largo con la cuerda en la fila `y`. Dos cuadros: en el 1 el viento la empuja.
 * Mide w x 10.
 */
export function ropaTendida(L: Lienzo, x: number, y: number, w: number, seed: number, cuadro: 0 | 1) {
  const R = rng(seed);
  L.hl(x, y, w, 'sombra');
  const cols: Color[] = ['luz', 'rojo', 'azul', 'amarillo', 'celeste', 'salmon'];
  for (let cx = x + 2; cx < x + w - 6; cx += 7 + Math.floor(R() * 4)) {
    const col = cols[Math.floor(R() * cols.length)], tall = R() < 0.5, hh = tall ? 8 : 5, sh: Color = col === 'luz' ? 'cemento_claro' : 'sombra';
    if (cuadro === 0) {
      L.f(cx, y + 1, 5, hh, col);
      L.vl(cx + 4, y + 1, hh, sh);
      if (tall) L.p(cx + 2, y + hh, 'tinta');
    } else {
      // empujada: la parte de abajo se va a la derecha
      for (let j = 0; j < hh; j++) { const dx = Math.floor((j * 2) / hh); L.f(cx + dx, y + 1 + j, 5, 1, col); L.p(cx + dx + 4, y + 1 + j, sh); }
    }
  }
}

/** Buganvilla: una mata de flores rojas y rosadas que cuelga desde (x, y) y baja `len` pixeles. */
export function buganvilla(L: Lienzo, x: number, y: number, len: number, seed: number) {
  const R = rng(seed);
  const blobs: [number, number, number][] = [];
  for (let i = 0; i < 9 + Math.floor(len / 2.5); i++) {
    const t = i / (8 + len / 2.5);
    blobs.push([x + (R() - 0.5) * (28 - t * 16), y - 4 + t * len, 3 + R() * 3 * (1 - t * 0.55)]);
  }
  const m = new Lienzo(L.w, L.h, L.pal);
  for (const [bx, by, br] of blobs) m.d(bx, by, br, 'verde');
  for (let yy = 0; yy < L.h; yy++) for (let xx = 0; xx < L.w; xx++) {
    if (!m.has(xx, yy)) continue;
    const g = grain(xx, yy, seed);
    const under = !m.has(xx, yy + 1), over = !m.has(xx, yy - 1);
    // racimos de flor: rosado con luz arriba y vino en la sombra, y las hojas que asoman entre racimos
    const flor = grain(xx >> 1, yy >> 1, seed + 3) < 0.66;
    L.p(xx, yy, under ? 'verde_oscuro' : flor ? (over || g < 0.62 ? 'salmon' : 'vino') : g < 0.6 ? 'verde' : 'verde_oscuro');
  }
}

/**
 * Cortina metálica enrollable (cửa cuốn), bajada: láminas horizontales del color de la casa de al lado (verde o azul),
 * con la caja del rollo arriba, la manilla abajo y un papelito pegado.
 */
export function cortinaMetalica(L: Lienzo, x: number, y: number, w: number, h: number, col: 'verde' | 'azul', R: () => number) {
  const claro: Color = col === 'verde' ? 'menta' : 'celeste', oscuro: Color = col === 'verde' ? 'verde_oscuro' : 'azul_noche';
  L.f(x, y, w, h, col);
  for (let j = y + 5; j < y + h - 1; j += 3) { L.hl(x, j, w, oscuro); L.hl(x, j + 1, w, claro); }
  // la caja del rollo arriba
  L.f(x, y, w, 5, 'cemento'); L.hl(x, y, w, 'cemento_claro'); L.hl(x, y + 4, w, 'sombra');
  // luz de la izquierda: el lado izquierdo de cada lámina un poco más claro
  for (let j = y + 6; j < y + h - 1; j += 3) L.hl(x, j, Math.min(6, w), claro);
  // manilla y cerrojo abajo
  const mx = x + Math.floor(w / 2) - 3;
  L.f(mx, y + h - 5, 6, 2, 'cemento_claro'); L.p(mx - 2, y + h - 3, 'sombra'); L.p(mx + 7, y + h - 3, 'sombra');
  // un aviso de papel pegado (alquiler, número de teléfono)
  if (w > 30 && R() < 0.7) { const px = x + 4 + Math.floor(R() * (w - 16)), py = y + 10 + Math.floor(R() * 8); L.box(px, py, 7, 9, 'luz', 'cemento_claro'); L.hl(px + 1, py + 3, 5, 'sombra'); L.hl(px + 1, py + 5, 4, 'sombra'); }
}

/** Toldo de rayas sobre la tienda, con el borde en ondas y su sombra: va encima del vano. */
export function toldoRayas(L: Lienzo, x: number, y: number, w: number, col: Color) {
  const h = 7;
  for (let i = 0; i < w; i++) {
    const raya = Math.floor(i / 4) % 2 === 0;
    for (let j = 0; j < h; j++) L.p(x + i, y + j, j === 0 ? 'luz' : raya ? col : 'crema');
    // ondas abajo
    const onda = i % 4 === 1 || i % 4 === 2;
    L.p(x + i, y + h, onda ? (raya ? col : 'crema') : 'tinta');
    if (onda) L.p(x + i, y + h + 1, 'tinta');
  }
  L.hl(x, y - 1, w, 'tinta');
  L.vl(x, y, h, 'tinta'); L.vl(x + w - 1, y, h, 'tinta');
  // la sombra que tira sobre la pared y el vano
  for (let i = 1; i < w - 1; i++) L.p(x + i, y + h + 2, 'sombra');
}

/** Reja plegable (cửa xếp): barras con tijeras; `k` es cuánto del vano tapa, desde la izquierda. */
export function rejaPlegable(L: Lienzo, x: number, y: number, w: number, h: number, k: number) {
  const rw = Math.round(w * k);
  if (rw <= 0) return;
  L.hl(x, y, w, 'asfalto_claro'); L.hl(x, y + h - 1, w, 'asfalto_claro');
  for (let i = 0; i < rw; i += 4) {
    L.vl(x + i, y, h, 'cemento');
    L.vl(x + i + 1, y + 1, h - 2, 'asfalto_claro');
    if (i + 4 < rw) for (let j = 0; j < h - 6; j += 8) { L.ln(x + i + 1, y + j + 2, x + i + 3, y + j + 6, 'asfalto'); L.ln(x + i + 3, y + j + 2, x + i + 1, y + j + 6, 'asfalto'); }
  }
  L.vl(x + rw, y, h, 'tinta');
}

function tienda(L: Lienzo, x: number, y: number, w: number, h: number, R: () => number) {
  // repisas con mercancía de colores
  const goods: Color[] = ['rojo', 'oro', 'azul', 'verde', 'luz', 'salmon', 'amarillo', 'celeste'];
  for (let s = 0; s < 3; s++) {
    const sy = y + 6 + s * 10;
    L.hl(x + 2, sy + 7, w - 4, 'ocre');
    for (let i = x + 3; i < x + w - 4; i += 3) {
      const col = goods[Math.floor(R() * goods.length)], hh = 3 + Math.floor(R() * 4);
      L.f(i, sy + 7 - hh, 2, hh, col);
    }
  }
  // paquetes colgados arriba
  for (let i = x + 4; i < x + w - 4; i += 5) { L.vl(i + 1, y + 1, 2, 'cemento'); L.f(i, y + 3, 3, 3, (i >> 2) % 2 ? 'rojo' : 'oro'); }
  // nevera a un lado
  if (w > 40) { const fx = x + w - 16; L.box(fx, y + 6, 14, h - 6, 'luz', 'cemento'); L.f(fx + 2, y + 9, 10, 10, 'cielo'); L.f(fx + 3, y + 10, 2, 3, 'rojo'); L.f(fx + 6, y + 10, 2, 3, 'azul'); L.f(fx + 9, y + 10, 2, 3, 'verde'); L.f(fx + 2, y + 22, 10, 1, 'cemento'); }
}

function cafe(L: Lienzo, x: number, y: number, w: number, _h: number, floorY: number, R: () => number) {
  // adentro: mostrador con la cafetera y vasos, y banquitos rojos y azules al frente
  L.f(x + 2, y + 16, w - 4, 12, 'ocre'); L.hl(x + 2, y + 16, w - 4, 'amarillo');
  L.f(x + 6, y + 9, 6, 7, 'cemento_claro'); L.p(x + 8, y + 8, 'sombra');
  for (let i = x + 16; i < x + w - 8; i += 5) { L.f(i, y + 12, 3, 4, 'luz'); L.f(i, y + 14, 3, 2, 'ocre'); }
  L.f(x + 2, y + 2, w - 4, 2, 'oro');
  for (let i = 0; i < 3; i++) {
    const sx = x + 4 + i * Math.floor((w - 12) / 3) + Math.floor(R() * 4);
    banquito(L, sx, floorY - 7, i % 2 ? 'azul' : 'rojo');
  }
}

function garajeMoto(L: Lienzo, x: number, y: number, w: number, h: number, R: () => number) {
  L.f(x, y + h - 6, w, 6, 'asfalto');
  for (let i = x; i < x + w; i += 6) L.vl(i, y + h - 6, 6, 'asfalto_claro');
  // herramientas colgadas y llantas
  for (let i = x + 4; i < x + w - 20; i += 7) { L.vl(i + 2, y + 4, 3, 'cemento'); L.f(i, y + 7, 5, 2, 'cemento_claro'); }
  L.d(x + 8, y + h - 12, 6, 'tinta'); L.d(x + 8, y + h - 12, 3, 'sombra');
  const cols: Color[] = ['rojo', 'azul', 'crema', 'sombra'];
  moto(L, x + w - MOTO_W - 2, y + h, cols[Math.floor(R() * cols.length)], -1);
}

/** Farmacia: vitrinas blancas con cajitas de colores y la cruz verde. */
function farmacia(L: Lienzo, x: number, y: number, w: number, h: number) {
  L.f(x, y, w, h, 'crema');
  for (let s = 0; s < 3; s++) { const sy = y + 4 + s * 9; L.hl(x + 2, sy + 7, w - 4, 'cemento'); for (let i = x + 3; i < x + w - 3; i += 3) L.f(i, sy + 3 + ((i >> 1) % 2), 2, 4 - ((i >> 1) % 2), (['luz', 'celeste', 'verde', 'salmon', 'azul'] as Color[])[(i * 7) % 5]); }
  L.box(x + 2, y + h - 12, w - 4, 12, 'cielo', 'cemento'); L.hl(x + 3, y + h - 11, w - 6, 'luz');
  const cx = x + Math.floor(w / 2);
  L.f(cx - 1, y + 1, 3, 7, 'verde'); L.f(cx - 3, y + 3, 7, 3, 'verde');
}

/** Sastrería: camisas y áo dài colgadas en una barra, y un maniquí. */
function ropa(L: Lienzo, x: number, y: number, w: number, h: number, R: () => number) {
  L.hl(x + 2, y + 5, w - 4, 'cemento');
  const cols: Color[] = ['luz', 'rojo', 'celeste', 'amarillo', 'salmon', 'menta', 'azul'];
  for (let i = x + 3; i < x + w - 16; i += 6) { const c = cols[Math.floor(R() * cols.length)], long = R() < 0.4; L.f(i, y + 6, 5, long ? 20 : 11, c); L.vl(i + 4, y + 6, long ? 20 : 11, c === 'luz' ? 'cemento_claro' : 'sombra'); L.p(i + 2, y + 5, 'cemento_claro'); }
  const mx = x + w - 11;
  L.d(mx + 3, y + 9, 2.5, 'crema'); L.f(mx, y + 12, 7, 14, 'rojo'); L.f(mx + 1, y + 26, 5, 8, 'rojo'); L.vl(mx + 3, y + 34, h - 34, 'cemento');
  L.f(x + 2, y + h - 3, w - 4, 3, 'ocre');
}

/** Peluquería: silla, espejo y las toallas. */
function peluqueria(L: Lienzo, x: number, y: number, w: number, h: number) {
  L.f(x, y, w, h, 'salmon'); L.dither(x, y, w, h, 'salmon', 'crema');
  L.box(x + 6, y + 4, 14, 18, 'cielo', 'cemento'); L.ln(x + 8, y + 8, x + 12, y + 5, 'luz');
  if (w > 44) { L.box(x + w - 22, y + 4, 14, 18, 'cielo', 'cemento'); L.ln(x + w - 20, y + 8, x + w - 16, y + 5, 'luz'); }
  for (const cx of [x + 13, x + w - 15]) { L.f(cx - 5, y + h - 16, 10, 8, 'sombra'); L.f(cx - 4, y + h - 22, 8, 7, 'sombra'); L.vl(cx, y + h - 8, 8, 'cemento'); L.hl(cx - 3, y + h - 1, 7, 'cemento'); }
  for (let i = x + 24; i < x + w - 26; i += 4) L.f(i, y + 6, 3, 6, i % 8 ? 'luz' : 'celeste');
}

/** Sala de una casa: piso de baldosa, la moto adentro y el altar de los ancestros en la pared del fondo. */
function sala(L: Lienzo, x: number, y: number, w: number, h: number, R: () => number) {
  L.f(x, y, w, h - 8, 'crema'); L.speckle(x, y, w, h - 8, 'cemento_claro', 0.06, x);
  for (let i = x; i < x + w; i++) for (let j = y + h - 8; j < y + h; j++) L.p(i, j, ((i >> 2) + (j >> 1)) % 2 ? 'cemento_claro' : 'luz');
  // altar de los ancestros: repisa roja con fotos, frutas y dos lámparas
  const ax = x + 3, ay = y + 4, aw = Math.min(26, w - 8);
  L.f(ax, ay + 10, aw, 4, 'vino'); L.hl(ax, ay + 10, aw, 'oro');
  L.box(ax + 3, ay, 7, 9, 'cemento', 'ocre'); L.f(ax + 5, ay + 2, 3, 4, 'sombra');
  L.box(ax + 12, ay + 1, 6, 8, 'cemento', 'ocre'); L.f(ax + 14, ay + 3, 2, 3, 'sombra');
  L.p(ax + 1, ay + 8, 'rojo'); L.p(ax + aw - 2, ay + 8, 'rojo'); L.p(ax + 1, ay + 9, 'oro'); L.p(ax + aw - 2, ay + 9, 'oro');
  L.d(ax + aw - 5, ay + 8, 2, 'amarillo');
  // reloj y almanaque rojo de hojas
  if (w > 50) { L.d(x + w - 10, y + 7, 3, 'luz'); L.p(x + w - 10, y + 6, 'tinta'); L.p(x + w - 9, y + 7, 'tinta'); }
  L.f(x + aw + 6, y + 3, 7, 9, 'rojo'); L.f(x + aw + 7, y + 6, 5, 5, 'luz'); L.hl(x + aw + 8, y + 8, 3, 'rojo'); L.hl(x + aw + 6, y + 3, 7, 'oro');
  // ventilador de pie
  const vx = x + aw + 4, vy = y + h - 22;
  if (w >= 60) { L.d(vx + 4, vy + 4, 4, 'celeste'); L.d(vx + 4, vy + 4, 1.5, 'azul'); L.vl(vx + 4, vy + 8, 12, 'cemento'); L.hl(vx + 1, vy + 20, 7, 'cemento'); }
  const cols: Color[] = ['rojo', 'azul', 'crema', 'sombra'];
  if (w >= 60) moto(L, x + w - MOTO_W - 1, y + h, cols[Math.floor(R() * cols.length)], -1);
  else { banquito(L, x + w - 12, y + h - 7, 'azul'); }
}

function pho(L: Lienzo, x: number, y: number, w: number, h: number) {
  // vitrina con la olla grande y la carne colgada
  L.f(x + 2, y + 14, w - 4, h - 14, 'cemento_claro');
  L.f(x + 3, y + 15, w - 6, 9, 'cielo'); L.hl(x + 3, y + 15, w - 6, 'luz');
  for (let i = x + 6; i < x + w - 8; i += 6) { L.f(i, y + 18, 4, 3, 'salmon'); L.p(i + 1, y + 18, 'luz'); }
  L.f(x + 2, y + 24, w - 4, 2, 'rojo');
  L.d(x + w - 14, y + 10, 6, 'cemento', 0.9); L.f(x + w - 20, y + 10, 13, 4, 'cemento_claro'); L.hl(x + w - 20, y + 9, 13, 'luz');
  for (let k = 0; k < 3; k++) { L.p(x + w - 16 + k * 3, y + 5 - k, 'luz'); L.p(x + w - 15 + k * 3, y + 3 - k, 'cemento_claro'); }
}

/** Altar de la tierra (Thần Tài / Ông Địa): casita roja con dorado, frutas e incienso. 14 x 12. */
export function altarTierra(L: Lienzo, x: number, y: number) {
  L.f(x, y + 2, 14, 10, 'vino');
  L.f(x + 1, y + 3, 12, 8, 'rojo');
  L.f(x - 1, y, 16, 3, 'oro'); L.hl(x - 1, y, 16, 'amarillo');
  L.f(x + 4, y + 4, 6, 5, 'vino'); L.p(x + 6, y + 6, 'oro'); L.p(x + 7, y + 6, 'oro'); L.p(x + 6, y + 7, 'amarillo');
  L.p(x + 2, y + 9, 'amarillo'); L.p(x + 3, y + 9, 'verde'); L.p(x + 11, y + 9, 'amarillo'); L.p(x + 10, y + 9, 'salmon');
  // incienso con brasa
  for (const ix of [x + 5, x + 7, x + 9]) { L.vl(ix, y - 5, 5, 'ocre'); L.p(ix, y - 6, 'rojo'); }
}

function techo(L: Lienzo, c: CasaTubo, roofY: number, R: () => number) {
  const W = c.w, t = c.techo ?? 'tanque';
  // pretil arriba con calados
  L.f(0, roofY, W, 5, 'crema'); L.hl(0, roofY, W, 'luz'); L.hl(0, roofY + 5, W, SOMBRA[c.pared]);
  for (let x = 4; x < W - 4; x += 6) L.f(x, roofY + 2, 3, 2, 'cemento');
  L.vl(0, roofY, 6, 'tinta'); L.vl(W - 1, roofY, 6, 'tinta'); L.hl(0, roofY - 1, W, 'tinta');
  if (t === 'tanque') {
    // tanque de inox acostado sobre su base, y antena
    const tx = 6 + Math.floor(R() * Math.max(1, W - 34));
    L.f(tx + 3, roofY - 4, 2, 4, 'sombra'); L.f(tx + 19, roofY - 4, 2, 4, 'sombra');
    L.f(tx, roofY - 13, 24, 9, 'cemento_claro'); L.hl(tx + 1, roofY - 12, 22, 'luz'); L.hl(tx, roofY - 5, 24, 'cemento');
    L.vl(tx, roofY - 12, 8, 'cemento'); L.vl(tx + 23, roofY - 12, 8, 'cemento'); L.vl(tx + 8, roofY - 13, 9, 'cemento'); L.vl(tx + 16, roofY - 13, 9, 'cemento');
    L.p(tx - 1, roofY - 13, 'tinta'); L.hl(tx, roofY - 14, 24, 'tinta');
    const ax = W - 8; L.vl(ax, roofY - 15, 15, 'sombra'); L.hl(ax - 4, roofY - 13, 9, 'sombra'); L.hl(ax - 3, roofY - 10, 7, 'sombra');
  } else if (t === 'ton') {
    // techito de lámina ondulada sobre la escalera
    const tw = Math.min(W - 8, 40), tx = W - tw - 4;
    L.f(tx, roofY - 10, tw, 10, 'crema'); L.f(tx + tw - 10, roofY - 8, 6, 8, 'sombra');
    for (let i = 0; i < tw + 4; i++) { L.p(tx - 2 + i, roofY - 12 + (i % 4 < 2 ? 0 : 1), 'azul'); L.p(tx - 2 + i, roofY - 11 + (i % 4 < 2 ? 0 : 1), 'azul_noche'); }
  } else {
    // terraza con matas y una sombrilla
    for (let x = 4; x < W - 6; x += 9) { L.f(x, roofY - 5, 5, 5, 'terracota'); L.d(x + 2, roofY - 8, 3.5, 'verde'); L.p(x + 1, roofY - 10, 'menta'); }
    const ux = Math.floor(W / 2);
    L.vl(ux, roofY - 14, 14, 'cemento'); L.f(ux - 9, roofY - 16, 19, 2, 'rojo'); L.f(ux - 7, roofY - 17, 15, 1, 'rojo'); L.hl(ux - 9, roofY - 14, 19, 'vino');
  }
}

/** Texto de un letrero de tienda que cabe en `w`: escoge el más largo que quepa de la lista. */
export function letreroQueCabe(opciones: string[], w: number) {
  return opciones.find((o) => textWidth(o) + 8 <= w);
}

/** Bandera de Vietnam de 11 x 8 en su asta, con la base en (x, y). */
export function bandera(L: Lienzo, x: number, y: number) {
  L.vl(x, y - 16, 16, 'cemento');
  L.f(x + 1, y - 16, 11, 8, 'rojo'); L.hl(x + 1, y - 9, 11, 'vino');
  L.p(x + 6, y - 14, 'oro'); L.hl(x + 5, y - 13, 3, 'oro'); L.p(x + 5, y - 12, 'oro'); L.p(x + 7, y - 12, 'oro');
}

export interface Hueco { x0: number; x1: number; tipo: 'callejon' | 'canal' }

/** Un callejón abierto al fondo: piso que se va, muro bajo con matas al final y el cielo arriba (transparente). */
function callejon(L: Lienzo, x0: number, x1: number, base: number, tipo: 'callejon' | 'canal', R: () => number) {
  const w = x1 - x0, fondo = base - 34;
  if (tipo === 'canal') {
    for (let y = fondo + 14; y < base; y++) for (let x = x0; x < x1; x++) L.p(x, y, grain(x >> 2, y >> 1, 5) < 0.3 && bayer(x, y) < 0.5 ? 'verde_oscuro' : 'canal');
    for (let x = x0; x < x1; x += 3) L.p(x, fondo + 18 + ((x >> 2) % 3), 'cielo');
    // la otra orilla con su baranda
    L.f(x0, fondo + 8, w, 6, 'cemento_claro'); L.hl(x0, fondo + 8, w, 'luz'); L.hl(x0, fondo + 13, w, 'cemento');
    for (let x = x0 + 1; x < x1; x += 4) L.vl(x, fondo, 8, 'cemento'); L.hl(x0, fondo, w, 'cemento_claro');
    L.d(x0 + Math.floor(w / 2), fondo + 3, 5, 'verde'); L.p(x0 + Math.floor(w / 2) - 2, fondo, 'menta');
  } else {
    // piso del callejón con su sombra, y el murito del fondo con matas
    for (let y = fondo + 12; y < base; y++) for (let x = x0; x < x1; x++) L.p(x, y, x - x0 < (base - y) * 0.4 + 3 ? 'cemento' : (y - fondo) % 7 === 0 ? 'cemento' : 'cemento_claro');
    L.f(x0, fondo, w, 12, 'crema'); L.hl(x0, fondo, w, 'luz'); L.hl(x0, fondo + 11, w, 'cemento');
    L.speckle(x0, fondo + 1, w, 10, 'cemento_claro', 0.15, x0);
    for (let x = x0 + 3; x < x1 - 4; x += 8 + Math.floor(R() * 4)) { L.f(x, fondo - 5, 5, 5, 'terracota'); L.d(x + 2, fondo - 8, 3.5, 'verde'); L.p(x + 1, fondo - 10, 'menta'); }
    // una moto parada adentro, en sombra
    if (w >= 22 && R() < 0.6) { L.f(x0 + 4, base - 9, w - 8, 3, 'sombra'); L.d(x0 + 6, base - 4, 3, 'tinta'); L.d(x1 - 6, base - 4, 3, 'tinta'); }
  }
  // cuerda de ropa que cruza el callejón arriba
  const ly = fondo - 38 - Math.floor(R() * 20);
  for (let x = x0 - 2; x < x1 + 2; x++) L.p(x, ly + Math.round(Math.sin(((x - x0 + 2) / (w + 4)) * Math.PI) * 3), 'sombra');
  const cols: Color[] = ['luz', 'rojo', 'azul', 'amarillo'];
  for (let x = x0 + 2; x < x1 - 5; x += 8) { const c = cols[Math.floor(R() * cols.length)]; const yy = ly + 1 + Math.round(Math.sin(((x - x0 + 2) / (w + 4)) * Math.PI) * 3); L.f(x, yy, 5, 7, c); L.vl(x + 4, yy, 7, c === 'luz' ? 'cemento_claro' : 'sombra'); }
}

export interface FilaOpts {
  /** Huecos entre casas: canales que siguen hacia atrás y callejones abiertos. */
  huecos: Hueco[];
  /** Zonas con tema: comida o inundadas. */
  temas: { x0: number; x1: number; tema: string }[];
  /** Rangos donde no van casas: ahí pinta otro tema. Las casas terminan y empiezan justo en sus bordes. */
  vacios?: { x0: number; x1: number }[];
  /** Aclara las plantas bajas en las últimas 48 filas (donde quedan los atletas del fondo): lo negro pasa a gris. */
  pieClaro?: boolean;
  seed?: number;
}

/**
 * La fila de casas tubo de todo el tramo, de `w` x `base` pixeles, con la base de las casas en la última fila.
 * Arriba de las casas queda transparente: ahí se ven el cielo y la ciudad lejana.
 */
export function filaVietnam(pal: Paleta, w: number, base: number, o: FilaOpts, anclas?: Anclas): Lienzo {
  const L = new Lienzo(w, base, pal);
  const R = rng(o.seed ?? 42);
  const huecos = [...o.huecos].sort((a, b) => a.x0 - b.x0);
  const cortes = [...huecos, ...(o.vacios ?? [])].sort((a, b) => a.x0 - b.x0);
  const tramos: [number, number][] = [];
  let x = -24; // la primera casa empieza afuera, así el borde no se ve cortado a propósito
  for (const h of cortes) { if (h.x0 > x) tramos.push([x, h.x0]); x = Math.max(x, h.x1); }
  if (x < w + 24) tramos.push([x, w + 24]);
  // sin paredes rosadas: el rosado es de la buganvilla, que tiene que resaltar sobre la pared
  const paredes: ParedColor[] = ['amarillo', 'menta', 'celeste', 'crema', 'amarillo', 'menta'];
  let last: ParedColor = 'crema', n = 0, lastPlanta: PlantaBaja | null = null;
  const bolsas = new Map<string, PlantaBaja[]>();
  for (const [a, b] of tramos) {
    let cx = a;
    while (cx < b) {
      const resto = b - cx;
      let cw = [56, 64, 72, 80, 88, 96, 104][Math.floor(R() * 7)];
      if (resto - cw < 56) cw = resto < 112 && resto >= 56 ? resto : Math.min(resto, cw);
      const tema = o.temas.filter((t) => cx + cw / 2 >= t.x0 && cx + cw / 2 < t.x1).sort((p, q) => p.x1 - p.x0 - (q.x1 - q.x0))[0]?.tema; // el más angosto manda
      const inund = tema === 'fachadas_inundadas', comida = tema === 'puesto_comida';
      const pisos = [2, 3, 3, 4, 4, 4, 5][Math.floor(R() * 7)];
      let pared = paredes[Math.floor(R() * paredes.length)];
      if (pared === last) pared = paredes[(paredes.indexOf(pared) + 1) % paredes.length];
      last = pared;
      const opciones: PlantaBaja[] = inund ? ['reja', 'cortina', 'garaje', 'sala'] : comida ? ['pho', 'pho', 'cafe'] : ['cortina', 'tienda', 'cafe', 'garaje', 'sala', 'sala', 'farmacia', 'ropa', 'peluqueria', 'reja', 'tienda', 'cafe', 'cortina'];
      // bolsa sin repetición: se sacan todos los tipos antes de repetir
      const key = inund ? 'inund' : comida ? 'comida' : 'calle';
      let bag = bolsas.get(key);
      if (!bag || !bag.length) { bag = [...opciones]; for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; } bolsas.set(key, bag); }
      let planta = bag.pop()!;
      if (planta === lastPlanta && bag.length) { const o2 = bag.pop()!; bag.unshift(planta); planta = o2; }
      lastPlanta = planta;
      const lista = LETREROS_DE[planta];
      const k0 = Math.floor(R() * Math.max(1, lista.length));
      const letrero = lista.length ? letreroQueCabe([...lista.slice(k0), ...lista.slice(0, k0)], cw) : undefined;
      const c: CasaTubo = {
        w: cw, pisos, pared, planta, letrero, seed: (o.seed ?? 42) * 100 + n,
        techo: (['tanque', 'ton', 'terraza', 'tanque'] as Techo[])[Math.floor(R() * 4)],
        numero: R() < 0.5 ? `${10 + n * 2}${R() < 0.4 ? '/' + (1 + Math.floor(R() * 9)) : ''}` : undefined,
        altar: planta !== 'garaje' && planta !== 'sala' && R() < 0.45,
      };
      const an = anclas ? nuevasAnclas() : undefined;
      const casa = casaTubo(pal, c, an);
      if (an && anclas) {
        const dy = base - casa.h;
        for (const k of ['ropa', 'altares', 'buganvillas', 'aires'] as const) for (const it of an[k]) (anclas[k] as { x: number; y: number }[]).push({ ...it, x: it.x + cx, y: it.y + dy });
      }
      if (inund) marcaInundacion(casa, R);
      if (R() < 0.18) bandera(casa, cw - 14, 16);
      L.paste(casa, cx, base - casa.h);
      // en la acera: una mata grande en su matero al pie de la casa (la mitad de las casas)
      if (R() < 0.5 && !inund) mataGrande(L, cx + (R() < 0.5 ? 6 : cw - 18), base - 1, Math.floor(R() * 1000));
      cx += cw; n++;
    }
  }
  for (const h of huecos) callejon(L, h.x0, h.x1, base, h.tipo, R);
  // sombra de contacto al pie de toda la fila
  for (let xx = 0; xx < w; xx++) if (L.has(xx, base - 1)) L.p(xx, base - 1, 'cemento');
  if (o.pieClaro) {
    const sombra = pal.sombra.toLowerCase(), tinta = pal.tinta.toLowerCase();
    for (let y = base - 48; y < base; y++) for (let xx = 0; xx < w; xx++) {
      const i = (y * w + xx) * 4, d = L.r.data;
      if (!d[i + 3]) continue;
      const hx = '#' + [d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');
      if (hx === sombra) L.p(xx, y, 'asfalto'); else if (hx === tinta) L.p(xx, y, 'sombra');
    }
  }
  return L;
}

/** Mata grande en matero, de 14 x 26: el matero de barro o vidriado azul y las hojas en manojos con luz arriba. */
export function mataGrande(L: Lienzo, x: number, gy: number, seed: number) {
  const R = rng(seed), azul = R() < 0.35;
  const mc: Color = azul ? 'azul' : 'terracota', ml: Color = azul ? 'celeste' : 'salmon', ms: Color = azul ? 'azul_noche' : 'vino';
  // matero
  L.f(x + 1, gy - 9, 12, 9, mc); L.hl(x, gy - 10, 14, ml); L.hl(x, gy - 9, 14, mc); L.vl(x + 11, gy - 9, 9, ms); L.hl(x + 2, gy - 1, 10, ms);
  L.vl(x, gy - 10, 2, 'tinta'); L.vl(x + 13, gy - 10, 2, 'tinta');
  // hojas: manojos que salen hacia arriba y a los lados
  const m = new Lienzo(L.w, L.h, L.pal);
  for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (R() - 0.5) * 2.2, r = 5 + R() * 9; m.d(x + 7 + Math.cos(a) * r * 0.8, gy - 12 + Math.sin(a) * r, 2.5 + R() * 2, 'verde'); }
  for (let yy = gy - 30; yy < gy - 9; yy++) for (let xx = x - 6; xx < x + 21; xx++) {
    if (!m.has(xx, yy)) continue;
    const top = !m.has(xx, yy - 1), side = !m.has(xx + 1, yy);
    L.p(xx, yy, top ? 'menta' : side || grain(xx, yy, seed) < 0.25 ? 'verde_oscuro' : 'verde');
  }
}

/** La marca que deja el agua en las paredes, y sacos de arena en la puerta. */
function marcaInundacion(c: Lienzo, R: () => number) {
  const top = c.h - 16;
  for (let y = top; y < c.h - 2; y++) for (let x = 2; x < c.w - 2; x++) {
    if (!c.has(x, y)) continue;
    if (y === top) { if (bayer(x, y) < 0.5) c.p(x, y, 'canal'); continue; }
    if (bayer(x, y) < 0.18 + (y - top) * 0.012) c.p(x, y, 'canal');
  }
  // sacos de arena
  for (let x = 5; x < c.w - 10; x += 9 + Math.floor(R() * 3)) {
    if (R() < 0.35) continue;
    c.f(x, c.h - 8, 9, 5, 'ocre'); c.hl(x, c.h - 8, 9, 'amarillo'); c.hl(x, c.h - 4, 9, 'terracota'); c.vl(x + 4, c.h - 7, 2, 'terracota');
  }
}
