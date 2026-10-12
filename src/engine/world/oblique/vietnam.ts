import { rng, grain } from '../../fx/pix';
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

export type PlantaBaja = 'reja' | 'tienda' | 'cafe' | 'garaje' | 'pho';
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

/** Alto total de una casa (con el techo). */
export const casaAlto = (c: CasaTubo) => PB + PISO * (c.pisos - 1) + 16;

/** Una casa tubo de frente, con la base en la última fila. */
export function casaTubo(pal: Paleta, c: CasaTubo): Lienzo {
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
    piso(L, c, fy, k, R, k === c.pisos - 1);
  }
  plantaBaja(L, c, H - PB, R);
  techo(L, c, roofY, R);
  return L;
}

function piso(L: Lienzo, c: CasaTubo, fy: number, k: number, R: () => number, ultimo: boolean) {
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
  // buganvilla que se derrama por la baranda
  if (R() < 0.3) buganvilla(L, R() < 0.5 ? 12 : W - 12, by, 10 + Math.floor(R() * 10), (c.seed ?? 1) * 31 + k);
  // ropa tendida en algunos balcones
  if (R() < 0.35) {
    const lw = Math.min(W - 8, 24 + Math.floor(R() * 24)), lx = 4 + Math.floor(R() * (W - 8 - lw)), ly = by - 9;
    L.hl(lx, ly, lw, 'sombra');
    const cols: Color[] = ['luz', 'rojo', 'azul', 'amarillo', 'celeste', 'salmon'];
    for (let x = lx + 2; x < lx + lw - 6; x += 7 + Math.floor(R() * 4)) {
      const col = cols[Math.floor(R() * cols.length)];
      const tall = R() < 0.5;
      L.f(x, ly + 1, 5, tall ? 8 : 5, col);
      if (tall) { L.p(x + 2, ly + 8, 'tinta'); L.p(x + 2, ly + 7, col === 'luz' ? 'cemento_claro' : 'sombra'); }
      L.vl(x + 4, ly + 1, tall ? 8 : 5, col === 'luz' ? 'cemento_claro' : 'sombra');
    }
  }
  // aire acondicionado colgado
  if (R() < 0.6) {
    const ax = R() < 0.5 ? 3 : W - 17;
    L.box(ax, oy + 2, 14, 9, 'luz', 'cemento');
    for (let y = oy + 4; y < oy + 10; y += 2) L.hl(ax + 2, y, 10, 'cemento_claro');
    L.hl(ax, oy + 11, 14, sh);
  }
  if (ultimo) L.hl(2, fy, W - 4, sh);
}

function plantaBaja(L: Lienzo, c: CasaTubo, gy: number, R: () => number) {
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
  else if (c.planta === 'tienda') tienda(L, ox, oy, ow, oh, R);
  else if (c.planta === 'cafe') cafe(L, ox, oy, ow, oh, floorY, R);
  else if (c.planta === 'garaje') { garajeMoto(L, ox, oy, ow, oh); rejaPlegable(L, ox, oy, ow, oh, 0.25); }
  else pho(L, ox, oy, ow, oh);
  // altar de la tierra (Thần Tài) en el piso, en la esquina
  if (c.altar) altarTierra(L, c.planta === 'reja' ? ox + ow - 14 : ox + 1, floorY - 12);
  // numero de casa en placa azul
  if (c.numero) {
    const nw = textWidth(c.numero) + 4;
    L.box(W - nw - 3, gy + 20 + (c.letrero ? 0 : -14), nw, 9, 'azul', 'azul_noche');
    drawText(L, W - nw - 1, gy + 17 + (c.letrero ? 0 : -14), c.numero, 'luz');
  }
}

/** Buganvilla: una mata de flores rojas y rosadas que cuelga desde (x, y) y baja `len` pixeles. */
export function buganvilla(L: Lienzo, x: number, y: number, len: number, seed: number) {
  const R = rng(seed);
  const blobs: [number, number, number][] = [];
  for (let i = 0; i < 7 + Math.floor(len / 3); i++) {
    const t = i / (6 + len / 3);
    blobs.push([x + (R() - 0.5) * (22 - t * 12), y - 3 + t * len, 2.5 + R() * 2.5 * (1 - t * 0.5)]);
  }
  const m = new Lienzo(L.w, L.h, L.pal);
  for (const [bx, by, br] of blobs) m.d(bx, by, br, 'verde');
  for (let yy = 0; yy < L.h; yy++) for (let xx = 0; xx < L.w; xx++) {
    if (!m.has(xx, yy)) continue;
    const g = grain(xx, yy, seed);
    const under = !m.has(xx, yy + 1), over = !m.has(xx, yy - 1);
    L.p(xx, yy, under ? 'verde_oscuro' : g < 0.36 ? 'rojo' : g < 0.55 ? 'salmon' : over && g < 0.7 ? 'menta' : g < 0.85 ? 'verde' : 'verde_oscuro');
  }
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

function garajeMoto(L: Lienzo, x: number, y: number, w: number, h: number) {
  L.f(x, y + h - 6, w, 6, 'asfalto');
  for (let i = x; i < x + w; i += 6) L.vl(i, y + h - 6, 6, 'asfalto_claro');
  moto(L, x + w - MOTO_W - 2, y + h, 'rojo', -1);
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
  return opciones.filter((o) => textWidth(o) + 8 <= w).sort((a, b) => textWidth(b) - textWidth(a))[0];
}
