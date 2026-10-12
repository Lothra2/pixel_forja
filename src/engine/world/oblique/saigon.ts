import { rng, grain } from '../../fx/pix';
import { Lienzo } from './lienzo';
import { drawText, textWidth, LINE_H } from './letras';
import { nueva, pie, type Pieza } from './calle';
import type { Color, Paleta } from './paleta';

/**
 * Piezas de Saigón para el Cross Country: el mercado Bến Thành, el río, las azoteas y el estadio. Igual que en
 * `calle.ts`, cada una calza con su caja: el techo mide `d` filas y el frente `z`. Lo que es calado (vallas, redes)
 * deja ver lo de atrás con pixeles transparentes.
 */

const FRUTAS: [Color, Color, Color][] = [
  ['salmon', 'rojo', 'verde'], // thanh long
  ['amarillo', 'oro', 'verde'], // xoài
  ['rojo', 'vino', 'verde'], // chôm chôm
  ['vino', 'sombra', 'verde'], // măng cụt
  ['verde', 'verde_oscuro', 'menta'], // bưởi
];

/** Una fruta de 3 a 5 px con su brillo, para llenar canastos y puestos. */
function fruta(L: Lienzo, x: number, y: number, k: number, r = 2) {
  const [c, s, h] = FRUTAS[k % FRUTAS.length];
  L.d(x, y, r, c); L.p(x + Math.ceil(r / 2), y + Math.ceil(r / 2), s); L.p(x - 1, y - 1, k % FRUTAS.length === 0 ? h : 'luz');
  if (k % FRUTAS.length === 0) { L.p(x - r, y, h); L.p(x + r, y - 1, h); }
}

/** Canasto redondo visto desde arriba, lleno de fruta. */
function canastoFruta(L: Lienzo, cx: number, cy: number, rx: number, ry: number, k: number, seed: number) {
  L.d(cx, cy, rx, 'terracota', ry / rx); L.d(cx, cy, rx - 1, 'ocre', (ry - 1) / (rx - 1));
  const R = rng(seed);
  for (let i = 0; i < rx * ry * 0.5; i++) {
    const a = R() * Math.PI * 2, t = Math.sqrt(R()) * 0.75;
    fruta(L, Math.round(cx + Math.cos(a) * t * (rx - 2)), Math.round(cy + Math.sin(a) * t * (ry - 2)), k, 2);
  }
}

/** Tejido de bambú: trama cruzada en dos tonos. */
function trama(L: Lienzo, x: number, y: number, w: number, h: number, a: Color = 'ocre', b: Color = 'amarillo') {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) L.p(x + i, y + j, ((i >> 1) + (j >> 1)) % 2 ? a : b);
}

// ------------------------------------------------------------------ mercado Bến Thành

export const PUESTOS = ['ropa', 'flores', 'telas', 'comida', 'recuerdos', 'cafe'] as const;
export type Puesto = (typeof PUESTOS)[number];

/**
 * Fila de puestos del mercado, alta (no se salta): techo con la mercancía vista desde arriba y frente con lo que se
 * vende colgado, el mostrador y la placa con el número del puesto. Cada ~44 px es un puesto distinto.
 */
export function puesto(pal: Paleta, tipo: Puesto, w: number, d: number, z: number, seed = 1): Pieza {
  const P = nueva(pal, w, d, z), L = P.img, fr = d, R = rng(seed);
  const n = Math.max(1, Math.round(w / 44)), sw = w / n;
  const mostrador = Math.min(12, Math.round(z * 0.26)), my = fr + z - mostrador;
  const ropa: Color[] = ['rojo', 'celeste', 'amarillo', 'menta', 'salmon', 'luz', 'azul', 'oro'];
  for (let k = 0; k < n; k++) {
    const x0 = Math.round(k * sw), x1 = Math.round((k + 1) * sw), pw = x1 - x0, s = seed * 13 + k;
    // fondo claro del puesto: lona crema, así el atleta se lee delante
    L.f(x0, fr, pw, z, 'crema'); L.speckle(x0, fr, pw, z - mostrador, 'cemento_claro', 0.12, s);
    // techo: lo que se ve desde arriba
    L.f(x0, 0, pw, d, 'cemento_claro');
    if (tipo === 'ropa') for (let x = x0 + 1; x < x1 - 1; x += 6) { const c = ropa[(x + s) % ropa.length]; L.f(x, 2, 5, d - 4, c); L.hl(x, 2, 5, 'luz'); for (let y = 5; y < d - 2; y += 3) L.hl(x, y, 5, c === 'luz' ? 'cemento_claro' : 'sombra'); }
    else if (tipo === 'flores') for (let i = 0; i < pw * d * 0.09; i++) { const x = x0 + 2 + Math.floor(R() * (pw - 4)), y = 2 + Math.floor(R() * (d - 4)); L.p(x, y, 'verde'); L.d(x, y - 1, 1.2, (['rojo', 'amarillo', 'salmon', 'luz', 'oro'] as Color[])[Math.floor(R() * 5)]); }
    else if (tipo === 'telas') for (let y = 1; y < d - 1; y += 4) { const c = ropa[(y + s) % ropa.length]; L.f(x0 + 1, y, pw - 2, 3, c); L.p(x0 + 1, y + 1, 'luz'); L.p(x1 - 2, y + 1, 'sombra'); }
    else if (tipo === 'comida') { for (let x = x0 + 6; x < x1 - 4; x += 12) { L.d(x, Math.floor(d / 2), 5, 'cemento', 0.7); L.d(x, Math.floor(d / 2), 4, k % 2 ? 'ocre' : 'terracota', 0.7); L.p(x - 1, Math.floor(d / 2) - 1, 'amarillo'); } }
    else if (tipo === 'recuerdos') for (let x = x0 + 2; x < x1 - 4; x += 9) { L.f(x, 3, 7, d - 6, (x >> 3) % 2 ? 'rojo' : 'vino'); L.hl(x, 3, 7, 'oro'); L.p(x + 3, Math.floor(d / 2), 'oro'); }
    else for (let x = x0 + 4; x < x1 - 4; x += 10) { L.d(x, Math.floor(d / 2), 4, 'crema', 0.8); L.d(x, Math.floor(d / 2), 3, 'terracota', 0.7); L.speckle(x - 3, Math.floor(d / 2) - 2, 6, 4, 'vino', 0.4, x); }
    L.hl(x0, 0, pw, 'luz');
    // la mercancía del frente
    const gy0 = fr + 4, gy1 = my - 1;
    if (tipo === 'ropa') {
      // camisas y áo dài en ganchos, dos barras
      for (const [ry, hh] of [[gy0, 13], [gy0 + 16, gy1 - gy0 - 16]] as const) {
        L.hl(x0 + 1, ry, pw - 2, 'asfalto_claro');
        for (let x = x0 + 2; x < x1 - 7; x += 8) {
          const c = ropa[Math.floor(R() * ropa.length)], sh: Color = c === 'luz' ? 'cemento_claro' : c === 'amarillo' || c === 'oro' ? 'ocre' : c === 'celeste' || c === 'menta' ? 'azul' : 'vino';
          L.p(x + 3, ry + 1, 'asfalto'); L.f(x, ry + 2, 7, 3, c); L.f(x + 1, ry + 5, 5, Math.max(2, hh - 6), c); L.vl(x + 5, ry + 5, Math.max(2, hh - 6), sh); L.p(x + 3, ry + 2, sh);
        }
      }
    } else if (tipo === 'flores') {
      // ramos en baldes y una guirnalda de cempasúchil
      for (let x = x0 + 2; x < x1 - 6; x += 7) {
        const c = (['rojo', 'amarillo', 'salmon', 'luz', 'oro', 'rojo'] as Color[])[Math.floor(R() * 6)], top = gy0 + 6 + Math.floor(R() * 6);
        for (let i = 0; i < 4; i++) L.vl(x + 1 + i, top + 3, gy1 - top - 8, i % 2 ? 'verde_oscuro' : 'verde');
        L.d(x + 2, top + 1, 2.4, c); L.d(x + 4, top + 3, 2, c); L.p(x + 1, top, 'luz');
        L.f(x, gy1 - 6, 6, 6, 'celeste'); L.hl(x, gy1 - 6, 6, 'cielo'); L.vl(x + 5, gy1 - 6, 6, 'azul');
      }
      for (let x = x0 + 1; x < x1 - 1; x++) { const y = gy0 + Math.round(Math.sin(((x - x0) / pw) * Math.PI) * 4); L.p(x, y, (x >> 1) % 2 ? 'oro' : 'amarillo'); }
    } else if (tipo === 'telas') {
      // rollos de tela en estantes y pañuelos colgados
      for (let y = gy0; y < gy1 - 4; y += 5) {
        L.hl(x0 + 1, y + 4, pw - 2, 'ocre');
        for (let x = x0 + 2; x < x1 - 6; x += 7) { const c = ropa[Math.floor(R() * ropa.length)]; L.f(x, y, 6, 4, c); L.vl(x, y, 4, 'luz'); L.d(x + 5, y + 2, 1.5, c === 'luz' ? 'cemento' : 'sombra'); }
      }
      for (let x = x0 + 4; x < x1 - 3; x += 12) { L.f(x, gy0 - 3, 3, 12, ropa[(x + s) % ropa.length]); L.p(x + 1, gy0 + 9, 'oro'); }
    } else if (tipo === 'comida') {
      // tablero del menú arriba, ollas con vapor y la vitrina
      const menu = ['BÚN BÒ', 'CƠM', 'PHỞ', 'CHÈ', 'GỎI CUỐN', 'BÁNH XÈO'];
      const t = menu.filter((m) => textWidth(m) <= pw - 6)[Math.floor(R() * 3)] ?? 'CƠM';
      L.box(x0 + 2, gy0 - 2, pw - 4, LINE_H + 1, 'rojo', 'vino'); drawText(L, x0 + Math.floor((pw - textWidth(t)) / 2), gy0 - 3, t, 'amarillo');
      for (let x = x0 + 5; x < x1 - 8; x += 13) {
        // olla de aluminio: panza redonda, tapa con su perilla y el vapor
        const oy = gy1 - 10;
        L.f(x + 1, oy, 9, 9, 'cemento_claro'); L.f(x, oy + 1, 11, 6, 'cemento_claro'); L.vl(x, oy + 1, 6, 'luz'); L.vl(x + 10, oy + 1, 6, 'cemento'); L.hl(x + 1, oy + 8, 9, 'cemento');
        L.hl(x - 1, oy + 2, 2, 'asfalto_claro'); L.hl(x + 10, oy + 2, 2, 'asfalto_claro');
        L.d(x + 5, oy, 5, 'cemento', 0.4); L.hl(x + 1, oy - 1, 9, 'luz'); L.p(x + 5, oy - 2, 'asfalto');
        for (let j = 0; j < 3; j++) { L.p(x + 3 + j * 2, oy - 5 - j, 'luz'); L.p(x + 4 + j * 2, oy - 8 - j, 'cielo'); }
      }
    } else if (tipo === 'recuerdos') {
      // nón lá colgados, cajitas lacadas y franelas
      for (let x = x0 + 3; x < x1 - 9; x += 11) {
        const y = gy0 + 2;
        for (let j = 0; j < 6; j++) L.hl(x + 5 - j, y + j, 1 + j * 2, j === 5 ? 'ocre' : (j % 2 ? 'crema' : 'amarillo'));
        L.p(x + 5, y - 1, 'sombra');
      }
      for (let x = x0 + 2; x < x1 - 7; x += 8) { const yy = gy0 + 11; L.f(x, yy, 7, 9, ropa[(x * 3 + s) % ropa.length]); L.f(x + 2, yy + 3, 3, 3, 'rojo'); L.p(x + 3, yy + 4, 'oro'); }
      for (let x = x0 + 2; x < x1 - 6; x += 7) { L.f(x, gy1 - 5, 6, 5, (x >> 2) % 2 ? 'rojo' : 'vino'); L.hl(x, gy1 - 5, 6, 'oro'); }
    } else {
      // café: sacos abiertos, latas apiladas y los filtros phin
      const t = 'CÀ PHÊ';
      if (textWidth(t) <= pw - 6) { L.box(x0 + 2, gy0 - 2, pw - 4, LINE_H + 1, 'vino', 'sombra'); drawText(L, x0 + Math.floor((pw - textWidth(t)) / 2), gy0 - 3, t, 'luz'); }
      for (let x = x0 + 2; x < x1 - 9; x += 11) { L.f(x, gy0 + 12, 9, 6, 'cemento_claro'); L.hl(x, gy0 + 12, 9, 'luz'); for (let j = 0; j < 3; j++) L.f(x + 1 + j * 3, gy0 + 9, 2, 3, 'cemento'); }
      for (let x = x0 + 2; x < x1 - 10; x += 12) { L.f(x, gy1 - 9, 10, 9, 'crema'); L.hl(x, gy1 - 9, 10, 'ocre'); L.f(x + 1, gy1 - 10, 8, 2, 'terracota'); L.speckle(x + 1, gy1 - 10, 8, 2, 'vino', 0.5, x); L.hl(x + 2, gy1 - 5, 6, 'rojo'); }
    }
    // mostrador de madera con la placa del puesto
    L.f(x0, my, pw, mostrador, 'ocre'); L.hl(x0, my, pw, 'amarillo'); L.hl(x0, my + 1, pw, 'terracota');
    for (let x = x0 + 5; x < x1; x += 9) L.vl(x, my + 2, mostrador - 3, 'terracota');
    const num = `${String.fromCharCode(65 + ((seed + k) % 6))}${10 + ((seed * 7 + k * 3) % 80)}`;
    const nw = textWidth(num) + 4;
    L.box(x0 + 2, my + 1, nw, 9, 'azul', 'azul_noche'); drawText(L, x0 + 4, my - 2, num, 'luz');
    // parales del puesto
    L.vl(x0, fr, z, 'asfalto_claro'); L.vl(x1 - 1, fr, z, 'asfalto_claro');
    L.hl(x0, fr, pw, 'cemento'); L.hl(x0, fr + 1, pw, 'cemento_claro');
  }
  L.vl(0, 0, d, 'asfalto'); L.vl(w - 1, 0, d, 'asfalto');
  pie(L, fr + z - 1, w);
  return P;
}

/** Puesto bajo de frutas: canastos llenos vistos desde arriba y la tarima de madera con el precio en cartón. */
export function puestoFrutas(pal: Paleta, w: number, d: number, z: number, seed = 1): Pieza {
  const P = nueva(pal, w, d, z), L = P.img, fr = d;
  L.f(0, 0, w, d, 'ocre'); for (let y = 2; y < d; y += 5) L.hl(0, y, w, 'terracota'); L.hl(0, 0, w, 'amarillo');
  const cols = Math.max(1, Math.round(w / 22)), rows = Math.max(1, Math.round(d / 18)), cw = w / cols, rh = d / rows;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const cx = Math.round((i + 0.5) * cw), cy = Math.round((j + 0.5) * rh);
    canastoFruta(L, cx, cy, Math.floor(cw / 2) - 1, Math.floor(rh / 2) - 1, seed + i + j * 2, seed * 31 + i * 7 + j);
  }
  // tarima
  L.f(0, fr, w, z, 'ocre'); L.hl(0, fr, w, 'amarillo'); L.hl(0, fr + 1, w, 'terracota');
  for (let y = fr + 5; y < fr + z - 2; y += 5) L.hl(1, y, w - 2, 'terracota');
  L.vl(0, fr, z, 'terracota'); L.vl(w - 1, fr, z, 'terracota'); L.vl(Math.floor(w / 2), fr + 2, z - 3, 'terracota');
  // fruta suelta en el borde y el cartón del precio
  for (let x = 4; x < w - 4; x += 6) fruta(L, x, fr + 3, seed + (x >> 3), 2);
  const t = `${20 + (seed % 5) * 10}K`;
  L.box(w - textWidth(t) - 8, fr + 6, textWidth(t) + 5, 9, 'crema', 'ocre'); drawText(L, w - textWidth(t) - 5, fr + 3, t, 'rojo');
  pie(L, fr + z - 1, w);
  return P;
}

/** Sacos de arroz abiertos: la boca con el grano y un cucharón, y el saco de fique con la marca roja. */
export function sacosArroz(pal: Paleta, w: number, d: number, z: number): Pieza {
  const P = nueva(pal, w, d, z), L = P.img, fr = d;
  const n = Math.max(1, Math.round(w / 13)), sw = w / n;
  for (let k = 0; k < n; k++) {
    const x0 = Math.round(k * sw), x1 = Math.round((k + 1) * sw), cx = Math.floor((x0 + x1) / 2), pw = x1 - x0;
    // boca del saco enrollada y el arroz adentro
    L.f(x0, 0, pw, d, 'crema'); L.hl(x0, 0, pw, 'luz'); L.vl(x0, 0, d, 'ocre'); L.vl(x1 - 1, 0, d, 'ocre');
    L.d(cx, Math.floor(d / 2), Math.floor(pw / 2) - 2, 'luz', 0.9);
    for (let y = 3; y < d - 3; y++) for (let x = x0 + 3; x < x1 - 3; x++) if (grain(x, y, 3) < 0.12) L.p(x, y, 'cemento_claro');
    if (k === 0) { L.ln(cx - 1, d - 4, cx + 3, 3, 'cemento'); L.d(cx - 2, d - 5, 2, 'cemento_claro'); }
    // saco de frente
    L.f(x0, fr, pw, z, 'crema'); trama(L, x0 + 1, fr + 1, pw - 2, z - 2, 'crema', 'cemento_claro');
    L.hl(x0 + 2, fr + Math.floor(z / 2) - 1, pw - 4, 'rojo'); L.hl(x0 + 2, fr + Math.floor(z / 2) + 1, pw - 4, 'rojo');
    L.vl(x0, fr, z, 'ocre'); L.vl(x1 - 1, fr, z, 'ocre'); L.hl(x0, fr, pw, 'luz');
  }
  pie(L, fr + z - 1, w);
  return P;
}

/** Baldes de flores: el techo es la mata de flores y el frente los baldes de lata con los tallos. */
export function cubosFlores(pal: Paleta, w: number, d: number, z: number, seed = 1): Pieza {
  const P = nueva(pal, w, d, z), L = P.img, fr = d, R = rng(seed);
  L.f(0, 0, w, d, 'verde'); L.speckle(0, 0, w, d, 'verde_oscuro', 0.35, seed);
  const flores: Color[] = ['rojo', 'amarillo', 'salmon', 'luz', 'oro', 'menta'];
  for (let i = 0; i < w * d * 0.07; i++) { const x = 1 + Math.floor(R() * (w - 2)), y = 1 + Math.floor(R() * (d - 2)), c = flores[Math.floor(R() * flores.length)]; L.d(x, y, 1.5, c); L.p(x, y, c === 'luz' ? 'amarillo' : 'luz'); }
  const n = Math.max(1, Math.round(w / 11)), sw = w / n;
  for (let k = 0; k < n; k++) {
    const x0 = Math.round(k * sw) + 1, bw = Math.round(sw) - 2, c: Color = k % 2 ? 'celeste' : 'cemento_claro', s: Color = k % 2 ? 'azul' : 'cemento';
    for (let i = 0; i < bw; i += 2) L.vl(x0 + i, fr, 5, i % 4 ? 'verde_oscuro' : 'verde');
    L.f(x0, fr + 5, bw, z - 5, c); L.hl(x0, fr + 5, bw, 'luz'); L.vl(x0 + bw - 1, fr + 5, z - 5, s); L.hl(x0, fr + 9, bw, s);
  }
  pie(L, fr + z - 1, w);
  return P;
}

/** Canastas de bambú con verduras, ají y limones. */
export function canastas(pal: Paleta, w: number, d: number, z: number, seed = 1): Pieza {
  const P = nueva(pal, w, d, z), L = P.img, fr = d, R = rng(seed);
  L.f(0, 0, w, d, 'ocre');
  const n = Math.max(1, Math.round(d / 16));
  for (let j = 0; j < n; j++) {
    const cy = Math.round(((j + 0.5) * d) / n), r = Math.floor(Math.min(w, d / n) / 2) - 1;
    L.d(Math.floor(w / 2), cy, r, 'terracota', 0.95); L.d(Math.floor(w / 2), cy, r - 1, 'amarillo', 0.9);
    for (let i = 0; i < r * r * 0.6; i++) {
      const a = R() * Math.PI * 2, t = Math.sqrt(R()) * (r - 3), x = Math.round(w / 2 + Math.cos(a) * t), y = Math.round(cy + Math.sin(a) * t * 0.9);
      const k = (j + i) % 3; L.p(x, y, k === 0 ? 'verde' : k === 1 ? 'rojo' : 'menta'); L.p(x + 1, y, k === 0 ? 'verde_oscuro' : k === 1 ? 'vino' : 'verde');
    }
  }
  trama(L, 0, fr, w, z); L.hl(0, fr, w, 'terracota'); L.hl(0, fr + 1, w, 'amarillo'); L.vl(0, fr, z, 'terracota'); L.vl(w - 1, fr, z, 'terracota');
  pie(L, fr + z - 1, w);
  return P;
}

/** Carrito de café: caja de madera roja con vitrina, los vasos del cà phê sữa đá, el termo y dos ruedas. */
export function carritoCafe(pal: Paleta, w: number, d: number, z: number): Pieza {
  const sobre = 10, P = nueva(pal, w, d, z, sobre), L = P.img, top = sobre, fr = top + d;
  // techo de la vitrina con los vasos y el termo asomando
  L.f(0, top, w, d, 'vino'); L.f(2, top + 2, w - 4, d - 4, 'rojo'); L.hl(0, top, w, 'salmon');
  for (let x = 5; x < w - 14; x += 6) { L.f(x, top - 4, 4, 6, 'cielo'); L.hl(x, top - 4, 4, 'luz'); L.f(x, top - 1, 4, 3, 'ocre'); L.p(x + 1, top - 5, 'verde'); }
  L.f(w - 12, top - 9, 7, 11, 'rojo'); L.hl(w - 12, top - 9, 7, 'salmon'); L.f(w - 11, top - 10, 5, 2, 'cemento'); L.hl(w - 12, top - 5, 7, 'oro');
  // frente: letrero y caja
  const t = 'CÀ PHÊ';
  L.f(0, fr, w, z - 6, 'rojo'); L.hl(0, fr, w, 'salmon'); L.vl(0, fr, z - 6, 'vino'); L.vl(w - 1, fr, z - 6, 'vino');
  L.box(3, fr + 2, w - 6, LINE_H + 1, 'crema', 'vino'); drawText(L, Math.floor((w - textWidth(t)) / 2), fr + 1, t, 'vino');
  L.hl(2, fr + 15, w - 4, 'vino'); for (let x = 6; x < w - 4; x += 10) L.f(x, fr + 17, 5, 3, 'oro');
  // ruedas y manubrio
  const gy = fr + z;
  for (const wx of [9, w - 10]) { L.d(wx, gy - 5, 5, 'tinta'); L.d(wx, gy - 5, 3, 'cemento'); L.p(wx, gy - 5, 'luz'); }
  L.ln(-1, fr + 4, 2, fr + 8, 'cemento');
  pie(L, gy - 1, w);
  return P;
}

/**
 * Portón del mercado: pilar de repello amarillo con la moldura terracota y el remate, como la fachada de Bến Thành.
 * El arco que cruza el paso va aparte (`arco`), para que pase por encima de los atletas.
 */
export function portonMercado(pal: Paleta, w: number, d: number, z: number, seed = 1): Pieza {
  const sobre = 8, P = nueva(pal, w, d, z, sobre), L = P.img, top = sobre, fr = top + d;
  // techo: cornisa con tejas
  L.f(0, top, w, d, 'terracota');
  for (let y = top + 1; y < fr; y += 3) for (let x = 0; x < w; x++) L.p(x, y, (x + (y >> 1)) % 4 === 0 ? 'vino' : 'terracota');
  L.hl(0, top, w, 'salmon'); L.vl(0, top, d, 'vino'); L.vl(w - 1, top, d, 'vino');
  // remate: pináculo sobre la cornisa
  const cx = Math.floor(w / 2);
  L.f(cx - 3, top - 6, 7, 6, 'amarillo'); L.hl(cx - 3, top - 6, 7, 'luz'); L.vl(cx + 3, top - 6, 6, 'ocre'); L.p(cx, top - 8, 'oro'); L.p(cx, top - 7, 'oro');
  // frente: pilastra con capitel, panel rehundido y zócalo
  L.f(0, fr, w, z, 'amarillo'); L.hl(0, fr, w, 'luz'); L.f(0, fr + 1, w, 4, 'crema'); L.hl(0, fr + 5, w, 'terracota');
  L.vl(0, fr, z, 'ocre'); L.vl(w - 1, fr, z, 'ocre');
  L.box(5, fr + 9, w - 10, z - 22, 'amarillo', 'ocre'); L.hl(6, fr + 10, w - 12, 'crema'); L.vl(6, fr + 10, z - 24, 'crema');
  L.speckle(1, fr + 6, w - 2, z - 16, 'crema', 0.06, seed);
  L.f(0, fr + z - 10, w, 10, 'terracota'); L.hl(0, fr + z - 10, w, 'salmon'); for (let x = 3; x < w; x += 8) L.vl(x, fr + z - 9, 8, 'vino');
  pie(L, fr + z - 1, w);
  return P;
}

/**
 * Arco que cruza un paso entre dos pilares, por encima de las cabezas: viga de `y0` a `y1` de profundidad, a la altura
 * `z`, con la placa de frente. Devuelve el dibujo, la fila de arriba relativa a `franja.atras` y el `orden`.
 */
export function arco(pal: Paleta, w: number, y0: number, y1: number, z: number, placa: string, colores: { viga: Color; borde: Color; placa: Color; letra: Color } = { viga: 'amarillo', borde: 'ocre', placa: 'vino', letra: 'oro' }) {
  const g = 6, tw = textWidth(placa) + 6, W = Math.max(w, tw), top = y0 - z - g - LINE_H - 2, H = y1 - z - top + 1;
  const L = new Lienzo(W, H, pal), ox = Math.floor((W - w) / 2);
  // la viga vista desde arriba (techo) y su frente al final del paso
  for (let y = y0; y < y1; y++) { L.hl(ox, y - z - g - top, w, colores.viga); L.p(ox, y - z - g - top, colores.borde); L.p(ox + w - 1, y - z - g - top, colores.borde); }
  L.hl(ox, y0 - z - g - top, w, 'luz');
  L.f(ox, y1 - z - g - top, w, g, colores.borde); L.hl(ox, y1 - z - g - top, w, colores.viga);
  // placa colgada de la viga, de frente
  const sx = Math.floor((W - tw) / 2), sy = y1 - z - g - top - LINE_H - 1;
  L.box(sx, sy, tw, LINE_H + 2, colores.placa, 'tinta'); drawText(L, sx + 3, sy, placa, colores.letra);
  return { img: L, dx: -ox, top, orden: y1 };
}

// ------------------------------------------------------------------ el río

/** Banca del malecón: tablas de madera sobre patas de hierro verde. */
export function banca(pal: Paleta, w: number, d: number, z: number): Pieza {
  const P = nueva(pal, w, d, z), L = P.img, fr = d;
  for (let y = 0; y < d; y++) L.hl(0, y, w, y % 4 === 3 ? 'terracota' : y % 4 === 0 ? 'amarillo' : 'ocre');
  L.vl(0, 0, d, 'verde_oscuro'); L.vl(w - 1, 0, d, 'verde_oscuro');
  // frente: el canto del asiento y las patas caladas
  L.f(0, fr, w, 3, 'ocre'); L.hl(0, fr, w, 'amarillo'); L.hl(0, fr + 2, w, 'terracota');
  for (const lx of [3, w - 7]) { L.f(lx, fr + 3, 4, z - 3, 'verde'); L.vl(lx, fr + 3, z - 3, 'menta'); L.vl(lx + 3, fr + 3, z - 3, 'verde_oscuro'); L.f(lx - 1, fr + z - 2, 6, 2, 'verde_oscuro'); }
  pie(L, fr + z - 1, w);
  return P;
}

/** Carrito de chè: frascos de vidrio con las capas de colores, el letrero y la sombrilla doblada. */
export function carritoChe(pal: Paleta, w: number, d: number, z: number): Pieza {
  const sobre = 12, P = nueva(pal, w, d, z, sobre), L = P.img, top = sobre, fr = top + d;
  L.f(0, top, w, d, 'cemento_claro'); L.hl(0, top, w, 'luz'); L.vl(0, top, d, 'cemento'); L.vl(w - 1, top, d, 'cemento');
  // frascos vistos de arriba y asomando
  const capas: Color[][] = [['rojo', 'crema', 'verde'], ['amarillo', 'luz', 'ocre'], ['verde', 'menta', 'crema'], ['vino', 'salmon', 'luz'], ['ocre', 'crema', 'verde_oscuro']];
  for (let i = 0, x = 3; x < w - 8; x += 9, i++) {
    const c = capas[i % capas.length];
    L.f(x, top - 8, 7, 10, 'cielo'); L.hl(x, top - 9, 7, 'cemento'); L.f(x + 1, top - 6, 5, 3, c[0]); L.f(x + 1, top - 3, 5, 2, c[1]); L.f(x + 1, top - 1, 5, 2, c[2]); L.vl(x + 1, top - 7, 9, 'luz');
  }
  const t = 'CHÈ';
  L.f(0, fr, w, z - 6, 'celeste'); L.hl(0, fr, w, 'cielo'); L.vl(0, fr, z - 6, 'azul'); L.vl(w - 1, fr, z - 6, 'azul');
  L.box(Math.floor((w - textWidth(t)) / 2) - 3, fr + 3, textWidth(t) + 6, LINE_H + 1, 'luz', 'azul'); drawText(L, Math.floor((w - textWidth(t)) / 2), fr + 2, t, 'rojo');
  for (let x = 3; x < w - 3; x += 4) L.p(x, fr + z - 9, 'azul');
  const gy = fr + z;
  for (const wx of [8, w - 9]) { L.d(wx, gy - 5, 5, 'tinta'); L.d(wx, gy - 5, 3, 'cemento'); L.p(wx, gy - 5, 'luz'); }
  pie(L, gy - 1, w);
  return P;
}

/** Escalón de concreto con el canto gastado. */
export function escalon(pal: Paleta, w: number, d: number, z: number): Pieza {
  const P = nueva(pal, w, d, z), L = P.img, fr = d;
  L.f(0, 0, w, d, 'cemento_claro'); L.speckle(0, 0, w, d, 'cemento', 0.12, 4); L.hl(0, 0, w, 'luz');
  L.f(0, fr, w, z, 'cemento'); L.hl(0, fr, w, 'luz'); L.vl(0, 0, d + z, 'asfalto_claro'); L.vl(w - 1, 0, d + z, 'asfalto_claro');
  pie(L, fr + z - 1, w);
  return P;
}

/** Muelle de tablas sobre pilotes, con bitas de amarre y llantas de defensa colgando hacia el agua. */
export function muelle(pal: Paleta, w: number, d: number, z: number, seed = 1): Pieza {
  const P = nueva(pal, w, d, z), L = P.img, fr = d;
  // tablas a lo largo, con juntas trabadas y clavos
  for (let y = 0; y < d; y++) for (let x = 0; x < w; x++) {
    const tb = Math.floor(y / 5), jx = (x + tb * 29) % 60;
    L.p(x, y, y % 5 === 4 || jx === 0 ? 'terracota' : grain(x >> 2, y, seed) < 0.1 ? 'terracota' : y % 5 === 0 ? 'amarillo' : 'ocre');
    if (jx === 2 && y % 5 === 2) L.p(x, y, 'sombra');
  }
  L.hl(0, 0, w, 'amarillo');
  // bitas de amarre
  for (let x = 20; x < w - 10; x += 90) { L.d(x, 4, 3, 'asfalto'); L.d(x, 3, 2, 'asfalto_claro'); L.p(x - 1, 2, 'cemento_claro'); }
  // frente: viga y pilotes
  L.f(0, fr, w, 4, 'terracota'); L.hl(0, fr, w, 'ocre'); L.hl(0, fr + 3, w, 'vino');
  for (let x = 4; x < w - 4; x += 24) { L.f(x, fr + 4, 5, z - 4, 'terracota'); L.vl(x, fr + 4, z - 4, 'ocre'); L.vl(x + 4, fr + 4, z - 4, 'vino'); }
  // llantas de defensa colgadas de la viga, de canto
  for (let x = 40; x < w - 20; x += 96) { L.f(x, fr + 1, 6, 7, 'sombra'); L.vl(x, fr + 2, 5, 'asfalto'); L.f(x + 2, fr + 3, 2, 3, 'canal'); L.p(x + 3, fr, 'cemento'); }
  L.vl(0, 0, d + z, 'vino'); L.vl(w - 1, 0, d + z, 'vino');
  return P;
}

/** Thúng chai: el bote redondo de bambú tejido, con la panza embreada y su remo. */
export function boteBambu(pal: Paleta, w: number, d: number, z: number): Pieza {
  const P = nueva(pal, w, d, z), L = P.img, fr = d, cx = (w - 1) / 2, rx = w / 2, ry = d / 2;
  // techo: la boca ovalada con el tejido adentro
  for (let y = 0; y < d; y++) for (let x = 0; x < w; x++) {
    const e = ((x - cx) / rx) ** 2 + ((y - ry + 0.5) / ry) ** 2;
    if (e > 1) continue;
    L.p(x, y, e > 0.8 ? (y < ry ? 'amarillo' : 'terracota') : ((x >> 1) + (y >> 1)) % 2 ? 'ocre' : 'amarillo');
  }
  L.f(Math.floor(cx) - 6, Math.floor(ry) - 1, 12, 2, 'terracota');
  // frente: la panza curva, embreada abajo
  for (let x = 0; x < w; x++) {
    const t = Math.abs(x - cx) / rx, hh = Math.round(z * Math.sqrt(Math.max(0, 1 - t * t)));
    for (let j = 0; j < hh; j++) L.p(x, fr + j - Math.round(ry * (1 - Math.sqrt(Math.max(0, 1 - t * t)))) , j > hh * 0.45 ? (x < cx ? 'asfalto' : 'sombra') : ((x >> 1) + (j >> 1)) % 2 ? 'ocre' : 'terracota');
  }
  // remo apoyado
  L.ln(w - 6, -1 + 2, w - 14, fr + z - 3, 'terracota'); L.f(w - 16, fr + z - 6, 3, 5, 'ocre');
  return P;
}

/** Cajas de icopor de pescado con hielo y la marca azul, y una canasta plástica con pescados. */
export function cajasPescado(pal: Paleta, w: number, d: number, z: number, seed = 1): Pieza {
  const P = nueva(pal, w, d, z), L = P.img, fr = d, R = rng(seed);
  L.f(0, 0, w, d, 'luz'); L.vl(0, 0, d, 'cemento'); L.vl(w - 1, 0, d, 'cemento');
  const n = Math.max(1, Math.round(w / 25));
  for (let k = 0; k < n; k++) {
    const x0 = Math.round((k * w) / n) + 2, x1 = Math.round(((k + 1) * w) / n) - 2;
    L.f(x0, 2, x1 - x0, d - 4, 'cielo'); L.speckle(x0, 2, x1 - x0, d - 4, 'luz', 0.3, seed + k);
    for (let i = 0; i < (x1 - x0) * (d - 4) * 0.02; i++) {
      const fx = x0 + 2 + Math.floor(R() * (x1 - x0 - 10)), fy = 4 + Math.floor(R() * (d - 10));
      L.f(fx, fy, 7, 2, 'cemento'); L.hl(fx + 1, fy, 5, 'cemento_claro'); L.p(fx + 7, fy, 'cemento'); L.p(fx + 7, fy + 1, 'asfalto_claro'); L.p(fx + 1, fy, 'sombra');
    }
    L.hl(x0 - 1, 1, x1 - x0 + 2, 'cemento_claro');
  }
  // frente: icopor con la franja azul y una canasta roja encima del borde
  for (let k = 0; k < n; k++) {
    const x0 = Math.round((k * w) / n), x1 = Math.round(((k + 1) * w) / n);
    L.box(x0, fr, x1 - x0, z, 'luz', 'cemento'); L.f(x0 + 2, fr + Math.floor(z / 2) - 2, x1 - x0 - 4, 4, 'azul'); L.hl(x0 + 2, fr + 1, x1 - x0 - 4, 'cemento_claro');
  }
  pie(L, fr + z - 1, w);
  return P;
}

// ------------------------------------------------------------------ las azoteas

/** Unidad exterior de aire acondicionado: caja de lámina con el ventilador redondo y su gotera. */
export function aireAcondicionado(pal: Paleta, w: number, d: number, z: number): Pieza {
  const P = nueva(pal, w, d, z), L = P.img, fr = d;
  L.f(0, 0, w, d, 'cemento_claro'); for (let y = 3; y < d - 2; y += 3) L.hl(3, y, w - 6, 'cemento'); L.hl(0, 0, w, 'luz');
  L.vl(0, 0, d, 'cemento'); L.vl(w - 1, 0, d, 'cemento');
  L.f(0, fr, w, z, 'cemento_claro'); L.hl(0, fr, w, 'luz'); L.vl(0, fr, z, 'cemento'); L.vl(w - 1, fr, z, 'asfalto_claro');
  const r = Math.min(Math.floor(z / 2) - 2, Math.floor(w / 3)), cx = Math.floor(w * 0.4), cy = fr + Math.floor(z / 2);
  L.d(cx, cy, r, 'asfalto_claro'); L.d(cx, cy, r - 1, 'cemento');
  for (let a = 0; a < 3; a++) L.ln(cx, cy, Math.round(cx + Math.cos(a * 2.1) * (r - 2)), Math.round(cy + Math.sin(a * 2.1) * (r - 2)), 'asfalto_claro');
  for (let j = -r + 1; j < r; j += 2) L.hl(cx - r + 1, cy + j, r * 2 - 1, 'cemento');
  L.d(cx, cy, 1.5, 'asfalto');
  L.f(w - 7, fr + 3, 5, z - 6, 'cemento'); for (let y = fr + 4; y < fr + z - 3; y += 2) L.hl(w - 7, y, 5, 'asfalto_claro');
  L.vl(3, fr + z - 1, 1, 'celeste');
  pie(L, fr + z - 1, w);
  return P;
}

/** Materas de barro con matas, una buganvilla y un papayo enano. */
export function macetas(pal: Paleta, w: number, d: number, z: number, seed = 1): Pieza {
  const P = nueva(pal, w, d, z), L = P.img, fr = d, R = rng(seed);
  // techo: el follaje
  for (let i = 0; i < w * d * 0.12; i++) { const x = Math.floor(R() * w), y = Math.floor(R() * d); L.d(x, y, 2.5, R() < 0.5 ? 'verde' : 'verde_oscuro'); }
  for (let i = 0; i < w * d * 0.03; i++) { const x = 2 + Math.floor(R() * (w - 4)), y = 2 + Math.floor(R() * (d - 4)); L.p(x, y, R() < 0.6 ? 'salmon' : 'rojo'); L.p(x + 1, y, 'menta'); }
  // frente: tres materas
  const n = Math.max(1, Math.round(w / 14));
  for (let k = 0; k < n; k++) {
    const x0 = Math.round((k * w) / n) + 1, mw = Math.round(w / n) - 2;
    L.f(x0, fr + 2, mw, z - 2, 'terracota'); L.hl(x0 - 1, fr, mw + 2, 'salmon'); L.hl(x0 - 1, fr + 1, mw + 2, 'terracota'); L.vl(x0 + mw - 1, fr + 2, z - 2, 'vino'); L.vl(x0, fr + 2, z - 2, 'salmon');
    L.hl(x0, fr + Math.floor(z / 2), mw, 'vino');
  }
  pie(L, fr + z - 1, w);
  return P;
}

/** Caseta de la escalera en la azotea: techo plano con su antena, puerta de lámina azul, ventanita y repello mojado. */
export function casetaEscalera(pal: Paleta, w: number, d: number, z: number, seed = 1): Pieza {
  const P = nueva(pal, w, d, z), L = P.img, fr = d;
  L.f(0, 0, w, d, 'cemento_claro'); L.speckle(0, 0, w, d, 'cemento', 0.1, seed); L.hl(0, 0, w, 'luz');
  L.f(0, 0, w, 2, 'cemento'); L.f(0, d - 2, w, 2, 'cemento'); L.vl(0, 0, d, 'cemento'); L.vl(w - 1, 0, d, 'cemento');
  for (let x = 6; x < w - 6; x += 14) { L.d(x, Math.floor(d / 2), 3, 'cemento'); L.p(x, Math.floor(d / 2), 'asfalto_claro'); }
  // frente
  L.f(0, fr, w, z, 'crema'); L.hl(0, fr, w, 'luz'); L.hl(0, fr + 2, w, 'cemento_claro');
  L.speckle(0, fr + 3, w, z - 3, 'cemento_claro', 0.18, seed + 1);
  L.drips(0, fr + 3, w, 14, 'cemento', seed + 2, 0.3);
  const dw = 18, dx = Math.floor(w * 0.55);
  L.box(dx, fr + z - 40, dw, 40, 'azul', 'azul_noche'); for (let y = fr + z - 37; y < fr + z - 2; y += 3) L.hl(dx + 2, y, dw - 4, 'celeste');
  L.p(dx + 3, fr + z - 20, 'oro');
  L.box(6, fr + 10, 14, 10, 'celeste', 'asfalto_claro'); L.vl(12, fr + 11, 8, 'asfalto_claro'); L.hl(7, fr + 15, 12, 'asfalto_claro'); L.p(8, fr + 12, 'luz');
  for (let x = 0; x < w; x++) { const hh = 1 + Math.floor(grain(x, 0, seed + 5) * 4); for (let y = 0; y < hh; y++) L.p(x, fr + z - 1 - y, y === 0 ? 'verde_oscuro' : 'canal'); }
  L.vl(0, fr, z, 'cemento'); L.vl(w - 1, fr, z, 'asfalto_claro');
  pie(L, fr + z - 1, w);
  return P;
}

// ------------------------------------------------------------------ el estadio

/** Pilar del portón del estadio: concreto con franjas azul y blanco y el foco arriba. */
export function portonEstadio(pal: Paleta, w: number, d: number, z: number): Pieza {
  const sobre = 6, P = nueva(pal, w, d, z, sobre), L = P.img, top = sobre, fr = top + d;
  L.f(0, top, w, d, 'cemento_claro'); L.hl(0, top, w, 'luz'); L.vl(0, top, d, 'cemento'); L.vl(w - 1, top, d, 'cemento');
  L.f(Math.floor(w / 2) - 3, top - 5, 6, 5, 'cemento'); L.f(Math.floor(w / 2) - 2, top - 6, 4, 2, 'luz');
  L.f(0, fr, w, z, 'cemento_claro'); L.hl(0, fr, w, 'luz'); L.vl(0, fr, z, 'cemento'); L.vl(w - 1, fr, z, 'asfalto_claro');
  for (let k = 0; k < 2; k++) { L.f(0, fr + 8 + k * 10, w, 5, 'azul'); L.hl(0, fr + 8 + k * 10, w, 'celeste'); }
  L.f(0, fr + z - 8, w, 8, 'cemento'); L.hl(0, fr + z - 8, w, 'cemento_claro');
  pie(L, fr + z - 1, w);
  return P;
}

/**
 * Fila de vallas de atletismo que cruza la pista, una por carril. Calada: entre la barra y el piso se ve la pista.
 * El techo de la caja son las barras vistas desde arriba y cada valla baja de la barra al piso por sus dos patas.
 */
export function vallas(pal: Paleta, w: number, d: number, z: number, carril = 16): Pieza {
  const P = nueva(pal, w, d, z), L = P.img;
  const row = (y: number, h: number) => y + (z - h); // fila de la imagen para (profundidad, altura)
  for (let y0 = 1; y0 < d - 2; y0 += carril) {
    const y1 = Math.min(d - 1, y0 + carril - 3);
    // sombra de la barra en el piso, hacia la derecha
    for (let y = y0; y <= y1; y++) if (y % 2) L.p(w - 1, row(y, 0), 'vino');
    // patas en los dos extremos, con el pie que se apoya en el piso
    for (const yy of [y0, y1]) { L.vl(2, row(yy, z), z, 'cemento_claro'); L.vl(3, row(yy, z), z, 'cemento'); L.hl(0, row(yy, 0), w - 1, 'asfalto_claro'); }
    // barra a rayas blanco y negro, de 4 de ancho y 3 de alto
    for (let y = y0; y <= y1; y++) for (const h of [z, z - 1, z - 2]) for (let c = 1; c <= 4; c++) {
      const negra = Math.floor((y - y0) / 4) % 2 === 1;
      L.p(c, row(y, h), negra ? (h === z ? 'sombra' : 'tinta') : h === z ? 'luz' : c === 4 ? 'cemento_claro' : 'luz');
    }
  }
  return P;
}

// ------------------------------------------------------------------ postes

/** Farol del malecón: columna de hierro pintado crema con tres globos y la base con moldura. Base en la última fila. */
export function farolRio(pal: Paleta, alto: number): Pieza {
  const w = 30, P = { img: new Lienzo(w, alto + 6, pal), sobre: 6 }, L = P.img, cx = 15, base = alto + 5;
  // base con moldura
  L.f(cx - 5, base - 10, 11, 10, 'cemento_claro'); L.hl(cx - 5, base - 10, 11, 'luz'); L.vl(cx + 5, base - 10, 10, 'cemento'); L.hl(cx - 6, base - 1, 13, 'cemento');
  L.f(cx - 3, base - 16, 7, 6, 'crema'); L.vl(cx + 3, base - 16, 6, 'cemento');
  // columna estriada
  for (let y = 26; y < base - 16; y++) { L.p(cx - 1, y, 'luz'); L.p(cx, y, 'crema'); L.p(cx + 1, y, 'cemento_claro'); L.p(cx + 2, y, 'cemento'); }
  for (let y = 40; y < base - 20; y += 30) L.f(cx - 2, y, 6, 2, 'cemento_claro');
  // brazos y globos
  L.hl(cx - 10, 22, 21, 'cemento'); L.hl(cx - 10, 21, 21, 'cemento_claro');
  for (const gx of [cx - 10, cx, cx + 10]) {
    const gy = gx === cx ? 12 : 18;
    L.d(gx, gy, 4, 'luz'); L.d(gx, gy, 3, 'crema'); L.p(gx - 1, gy - 2, 'luz'); L.hl(gx - 2, gy + 4, 5, 'cemento'); L.vl(gx, gy + 5, 21 - gy - 5, 'cemento');
    L.p(gx, gy - 5, 'cemento');
  }
  L.p(cx, 6, 'oro');
  return P;
}

/** Antena de televisión en un tubo con vientos, y una parabólica chica. Metal claro para que el atleta se lea delante. */
export function antena(pal: Paleta, alto: number, seed = 1): Pieza {
  const w = 40, P = { img: new Lienzo(w, alto + 6, pal), sobre: 6 }, L = P.img, cx = 20, base = alto + 5;
  L.f(cx - 1, 10, 3, base - 10, 'cemento_claro'); L.vl(cx - 1, 10, base - 10, 'luz'); L.vl(cx + 1, 10, base - 10, 'cemento');
  L.f(cx - 4, base - 3, 9, 3, 'cemento'); L.hl(cx - 4, base - 3, 9, 'cemento_claro');
  // espina de pescado
  for (let k = 0; k < 6; k++) { const y = 10 + k * 4, hw = 14 - k * 2; L.hl(cx - hw, y, hw * 2 + 1, 'cemento_claro'); L.p(cx - hw, y + 1, 'cemento'); }
  L.hl(cx - 16, 8, 33, 'cemento');
  // parabólica en el tubo
  if (seed % 2 === 0) { const py = Math.floor(alto * 0.45); L.d(cx + 8, py, 6, 'cemento_claro', 1); L.d(cx + 9, py, 4, 'luz'); L.ln(cx + 1, py + 2, cx + 6, py, 'cemento'); L.p(cx + 13, py - 1, 'cemento'); }
  // vientos tensores (claros)
  L.ln(cx, 30, 2, base - 1, 'cemento_claro'); L.ln(cx, 30, w - 3, base - 1, 'cemento_claro');
  return P;
}

/** Torre de luz del estadio: celosía de acero y el banco de focos arriba. */
export function torreLuz(pal: Paleta, alto: number): Pieza {
  const w = 48, P = { img: new Lienzo(w, alto + 6, pal), sobre: 6 }, L = P.img, cx = 24, base = alto + 5;
  const fy = 6;
  // celosía que se angosta hacia arriba
  for (let y = fy + 30; y <= base; y++) {
    const t = (y - fy - 30) / (base - fy - 30), hw = Math.round(3 + t * 6);
    L.p(cx - hw, y, 'cemento_claro'); L.p(cx + hw, y, 'cemento');
    if ((y - fy) % 10 === 0) L.hl(cx - hw, y, hw * 2 + 1, 'cemento');
    const k = (y - fy) % 10, d = Math.round((k / 10) * hw * 2);
    L.p(cx - hw + d, y, 'asfalto_claro');
  }
  L.f(cx - 10, base - 2, 21, 3, 'cemento');
  // banco de focos con su marco
  L.box(cx - 20, fy, 41, 26, 'asfalto_claro', 'asfalto');
  for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) { const x = cx - 18 + i * 6.5, y = fy + 2 + j * 6; L.f(Math.round(x), y, 5, 5, 'luz'); L.p(Math.round(x) + 1, y + 1, 'amarillo'); }
  L.f(cx - 2, fy + 26, 5, 6, 'cemento');
  return P;
}

// ------------------------------------------------------------------ lo que cuelga (bajo)

/** Faroles de tela rojos colgando del techo del mercado, a distintas profundidades. Sale como una sola imagen. */
export function lamparasColgantes(pal: Paleta, w: number, y0: number, y1: number, z: number, techo: number, seed = 1) {
  // filas relativas a franja.atras: arriba el techo (row techo), abajo el farol más adelante
  const top = techo, H = y1 - z + 14 - top, L = new Lienzo(w, H, pal), R = rng(seed);
  const n = Math.max(2, Math.round(w / 26));
  for (let k = 0; k < n; k++) {
    const x = Math.round(((k + 0.5) * w) / n) + Math.floor(R() * 7) - 3, y = y0 + 4 + Math.floor(R() * Math.max(1, y1 - y0 - 8)), h = z + 4 + Math.floor(R() * 8);
    const ly = y - h - top; // fila del farol dentro del dibujo
    L.vl(x, 0, ly, 'sombra');
    L.f(x - 4, ly + 1, 9, 8, 'rojo'); L.hl(x - 3, ly, 7, 'oro'); L.hl(x - 3, ly + 9, 7, 'oro');
    L.vl(x - 4, ly + 2, 6, 'vino'); L.vl(x + 4, ly + 2, 6, 'vino'); L.vl(x - 2, ly + 1, 8, 'salmon'); L.hl(x - 4, ly + 4, 9, 'vino');
    L.vl(x, ly + 10, 3, 'oro'); L.p(x - 1, ly + 12, 'amarillo'); L.p(x + 1, ly + 12, 'amarillo');
  }
  return { img: L, top };
}

/** Redes de pesca puestas a secar en una vara de bambú, con boyas. Caladas: se ve lo de atrás. */
export function redesPesca(pal: Paleta, w: number, d: number, z: number, seed = 1) {
  const caida = 16, H = d + z + 4, L = new Lienzo(w, H, pal);
  // parales de bambú hasta el piso, adelante y atrás (fila del piso a la profundidad yy: yy + z + 2)
  for (const yy of [2, d - 2]) for (const px of [1, w - 2]) { L.vl(px, yy, z + 2, 'amarillo'); L.p(px, yy + z + 2, 'terracota'); for (let k = 6; k < z; k += 8) L.p(px, yy + k, 'ocre'); }
  // varas a lo largo, adelante y atrás
  for (const yy of [2, d]) { L.hl(0, yy, w, 'amarillo'); L.hl(0, yy + 1, w, 'ocre'); for (let x = 9; x < w; x += 18) L.p(x, yy, 'terracota'); }
  // la red tendida entre las varas, y lo que cuelga por delante
  for (let y = 3; y < d + caida; y++) for (let x = 0; x < w; x++) {
    const sag = y > d ? Math.round(Math.sin((x / w) * Math.PI * 3 + seed) * 2) : 0;
    if (y > d + 1 && y - d > caida - 4 + sag) continue;
    if ((x + y) % 6 === 0 || (x - y + 600) % 6 === 0) L.p(x, y, y > d ? 'verde' : 'menta');
  }
  for (let x = 6; x < w; x += 16) { const y = d + caida - 2 + Math.round(Math.sin(x) * 2); L.f(x, y, 4, 3, (x >> 4) % 2 ? 'oro' : 'rojo'); L.p(x, y, 'luz'); }
  return { img: L, alto: z };
}

/** Cuerdas de ropa en la azotea: cada cuerda a lo largo, a una profundidad, con su ropa colgada (2 cuadros). */
export function cuerdasRopa(pal: Paleta, w: number, y0: number, y1: number, z: number, cuadro: 0 | 1, seed = 1) {
  const top = y0 - z - 16, H = y1 - z + 14 - top, L = new Lienzo(w, H, pal), R = rng(seed);
  const cols: Color[] = ['luz', 'rojo', 'azul', 'amarillo', 'celeste', 'salmon', 'menta'];
  for (let y = y0 + 6; y < y1; y += 26) {
    const ly = y - z - 10 - top;
    for (let x = 0; x < w; x++) L.p(x, ly + Math.round(Math.sin((x / w) * Math.PI) * 4), 'cemento');
    // palos en las puntas
    for (const px of [0, w - 1]) { L.vl(px, ly - 2, 12, 'cemento_claro'); }
    for (let x = 6; x < w - 10; x += 9 + Math.floor(R() * 5)) {
      const c = cols[Math.floor(R() * cols.length)], hh = 8 + Math.floor(R() * 5), yy = ly + 1 + Math.round(Math.sin((x / w) * Math.PI) * 4), sw = cuadro && (x >> 3) % 2 ? 1 : 0;
      L.f(x + sw, yy, 6, hh, c); L.vl(x + 5 + sw, yy, hh, c === 'luz' ? 'cemento_claro' : 'sombra'); L.p(x + 1, yy - 1, 'cemento_claro'); L.p(x + 4, yy - 1, 'cemento_claro');
      if (hh > 10) L.hl(x + sw, yy + 4, 6, c === 'luz' ? 'cemento_claro' : c);
    }
  }
  return { img: L, top };
}

/** Qué dibujo va en cada `tipo` de caja nuevo de Saigón. `null` si no es de aquí. */
export function piezaSaigon(pal: Paleta, tipo: string | undefined, w: number, d: number, z: number, seed = 1): Pieza | null {
  if (tipo?.startsWith('puesto_')) {
    const k = tipo.slice(7) as Puesto;
    if (PUESTOS.includes(k)) return puesto(pal, k, w, d, z, seed);
  }
  switch (tipo) {
    case 'puesto_frutas': return puestoFrutas(pal, w, d, z, seed);
    case 'sacos_arroz': return sacosArroz(pal, w, d, z);
    case 'cubos_flores': return cubosFlores(pal, w, d, z, seed);
    case 'canastas': return canastas(pal, w, d, z, seed);
    case 'carrito_cafe': return carritoCafe(pal, w, d, z);
    case 'porton_mercado': return portonMercado(pal, w, d, z, seed);
    case 'banca': return banca(pal, w, d, z);
    case 'carrito_che': return carritoChe(pal, w, d, z);
    case 'escalon': return escalon(pal, w, d, z);
    case 'muelle': return muelle(pal, w, d, z, seed);
    case 'bote_bambu': return boteBambu(pal, w, d, z);
    case 'cajas_pescado': return cajasPescado(pal, w, d, z, seed);
    case 'aire_acondicionado': return aireAcondicionado(pal, w, d, z);
    case 'macetas': return macetas(pal, w, d, z, seed);
    case 'caseta_escalera': return casetaEscalera(pal, w, d, z, seed);
    case 'porton_estadio': return portonEstadio(pal, w, d, z);
    case 'valla': return vallas(pal, w, d, z);
    default: return null;
  }
}

/** Qué poste va en cada `tipo`. `null` si es el poste de luz de siempre. */
export function posteSaigon(pal: Paleta, tipo: string | undefined, alto: number, seed = 1): { pieza: Pieza; cx: number } | null {
  switch (tipo) {
    case 'farol_rio': return { pieza: farolRio(pal, alto), cx: 15 };
    case 'antena': return { pieza: antena(pal, alto, seed), cx: 20 };
    case 'torre_luz': return { pieza: torreLuz(pal, alto), cx: 24 };
    default: return null;
  }
}

