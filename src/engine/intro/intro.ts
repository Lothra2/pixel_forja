import { createRaster, type Raster } from '../core/raster';
import { renderClip } from '../render/clip';
import { scaleRaster } from '../render/rotsprite';
import { familyFicha, thorFicha } from '../rpg/family';
import { renderBoss } from '../boss/render';
import { MINO_SPEC } from '../boss/minotauro';
import { GUARDIAN_SPEC } from '../boss/guardian';
import { MINO_ANIMS } from '../boss/minotauroAnims';
import { bossPoses } from '../boss/anim';

/**
 * El intro cinematográfico (encargo, parte 4): paneles de 480 x 270 pintados para él, en capas para el paralaje.
 *
 * Reglas de todos: paleta oscura y el fuego naranja y rojo como única luz fuerte. La luz sale de abajo (del fuego), no
 * de arriba a la izquierda como en el mundo. Nada de sangre ni de caras de terror: los ojos son de dragón de cuento.
 * Las siluetas se tienen que leer al 50 % del tamaño (por eso son planas, grandes y con canto de luz).
 */

export const PANEL_W = 480;
export const PANEL_H = 270;

export interface IntroLayer { nombre: 'fondo' | 'medio' | 'frente'; frames: Raster[]; fps: number; paralaje: number }
export interface IntroPanel { id: string; w: number; h: number; capas: IntroLayer[]; notas: string }

// ---------------------------------------------------------------- utilidades de pintura

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixc = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
function hash(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** ruido de valor suave; `px` = periodo en x (0 = sin repetir) para que pegue de lado a lado */
function vnoise(x: number, y: number, cell: number, seed: number, px = 0): number {
  const gx = x / cell, gy = y / cell, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const n = px ? Math.round(px / cell) : 0, w = (i: number) => (n ? ((i % n) + n) % n : i);
  const v = (i: number, j: number) => hash(w(i), j, seed);
  const a = v(x0, y0), b = v(x0 + 1, y0), c = v(x0, y0 + 1), d = v(x0 + 1, y0 + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
const fbm = (x: number, y: number, s: number, px = 0) => vnoise(x, y, 48, s, px) * 0.55 + vnoise(x, y, 16, s + 1, px) * 0.3 + vnoise(x, y, 6, s + 2, px) * 0.15;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bayer = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)];

function setPx(r: Raster, x: number, y: number, c: RGB, a = 255) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= r.w || y >= r.h) return;
  const k = (y * r.w + x) * 4;
  if (a >= 255 || !r.data[k + 3]) { r.data[k] = c[0]; r.data[k + 1] = c[1]; r.data[k + 2] = c[2]; r.data[k + 3] = Math.max(a, r.data[k + 3]); return; }
  const t = a / 255;
  for (let i = 0; i < 3; i++) r.data[k + i] = r.data[k + i] * (1 - t) + c[i] * t;
  r.data[k + 3] = Math.max(r.data[k + 3], a);
}
/** suma luz (fuego) a lo que ya está pintado, sin tocar lo transparente */
function addLight(r: Raster, x: number, y: number, c: RGB, k: number) {
  if (x < 0 || y < 0 || x >= r.w || y >= r.h || k <= 0) return;
  const i = (y * r.w + x) * 4;
  if (!r.data[i + 3]) return;
  for (let q = 0; q < 3; q++) r.data[i + q] = Math.min(255, r.data[i + q] + c[q] * k);
}
/** degradé vertical con tramado (sin bandas) */
function vgrad(r: Raster, stops: [number, string][], y0 = 0, y1 = r.h) {
  const S = stops.map(([t, h]) => [t, hex(h)] as [number, RGB]);
  for (let y = y0; y < y1; y++) {
    const t = (y - y0) / Math.max(1, y1 - y0 - 1);
    let i = 0;
    while (i < S.length - 2 && t > S[i + 1][0]) i++;
    const [ta, ca] = S[i], [tb, cb] = S[i + 1];
    const u = Math.max(0, Math.min(1, (t - ta) / Math.max(1e-6, tb - ta)));
    for (let x = 0; x < r.w; x++) {
      // cuatro tonos entre cada par: el tramado decide cuál
      const q = Math.floor(u * 4 + bayer(x, y) * 0.999) / 4;
      setPx(r, x, y, mixc(ca, cb, Math.min(1, q)));
    }
  }
}
/** brillo radial que suma luz (aditivo) en una elipse */
function glow(r: Raster, cx: number, cy: number, rx: number, ry: number, c: RGB, k: number) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
    if (d >= 1) continue;
    const a = (1 - d) ** 2 * k;
    addLight(r, x, y, c, a + (bayer(x, y) - 0.5) * 0.04);
  }
}
const copy = (r: Raster): Raster => ({ w: r.w, h: r.h, data: new Uint8ClampedArray(r.data) });

/** Silueta de pino: triángulos apilados con borde quebrado */
function pine(r: Raster, x: number, base: number, h: number, c: RGB, seed: number, sway = 0) {
  const w = h * 0.36;
  for (let y = 0; y < h; y++) {
    const t = y / h; // 0 abajo, 1 arriba
    const tier = (t * 5) % 1;
    const hw = w * (1 - t) * (0.55 + 0.45 * (1 - tier)) + (hash(y, seed, 3) - 0.5) * 2;
    const off = sway * t * t;
    for (let dx = -hw; dx <= hw; dx++) setPx(r, x + dx + off, base - y, c);
  }
  for (let y = 0; y < h * 0.12; y++) setPx(r, x, base + y - h * 0.05, c);
}
/** Silueta de árbol de copa (roble): tronco con ramas y una copa hecha de varias nubes de hojas */
function oak(r: Raster, x: number, base: number, h: number, c: RGB, seed: number, sway = 0) {
  const tw = Math.max(1.5, h * 0.045);
  for (let y = 0; y < h * 0.5; y++) { const w = tw * (1 + Math.max(0, 0.08 - y / h) * 8); for (let dx = -w; dx <= w; dx++) setPx(r, x + dx, base - y, c); }
  // dos ramas que abren
  for (const sd of [-1, 1]) for (let t = 0; t < h * 0.22; t++) for (let d = -tw * 0.6; d <= tw * 0.6; d++) setPx(r, x + sd * t * 0.8 + d, base - h * 0.42 - t * 0.7, c);
  const cy = base - h * 0.66, R = h * 0.34;
  const blobs = Array.from({ length: 7 }, (_, i) => {
    const a = (i / 7) * Math.PI * 2 + hash(i, seed, 5) * 0.8, d = i === 0 ? 0 : R * (0.45 + hash(seed, i, 6) * 0.35);
    return { x: Math.cos(a) * d * 1.25, y: Math.sin(a) * d * 0.8 - (i === 0 ? R * 0.1 : 0), r: R * (0.5 + hash(i, seed, 7) * 0.25) };
  });
  for (let y = -R * 1.4; y <= R * 1.1; y++) for (let dx = -R * 1.9; dx <= R * 1.9; dx++) {
    const n = (vnoise(x + dx + seed * 31, cy + y, 5, seed) - 0.5) * 0.35;
    if (blobs.some((b) => Math.hypot(dx - b.x, y - b.y) / b.r + n < 1)) setPx(r, x + dx + sway * (1 - (y + R) / (2 * R)), cy + y, c);
  }
}

// ---------------------------------------------------------------- 1. el Bosque de noche

function bosqueNoche(): IntroPanel {
  const W = PANEL_W, H = PANEL_H;
  const RED: RGB = hex('#ff3a1a'), EMBER: RGB = hex('#ff8a3a');
  // fondo: cielo, estrellas, montes lejanos
  const fondo = createRaster(W, H);
  vgrad(fondo, [[0, '#05040c'], [0.45, '#0c0a1c'], [0.7, '#1a1028'], [1, '#22101a']]);
  for (let i = 0; i < 140; i++) { const x = Math.floor(hash(i, 1, 11) * W), y = Math.floor(hash(i, 2, 11) * H * 0.55); setPx(fondo, x, y, hash(i, 3, 11) > 0.85 ? hex('#e8e0ff') : hex('#8a84a8')); }
  for (const [base, amp, col, s] of [[170, 34, '#140c1e', 12], [188, 22, '#1a0f1e', 13]] as [number, number, string, number][]) {
    for (let x = 0; x < W; x++) { const top = base - fbm(x, 0, s) * amp * 2; for (let y = Math.floor(top); y < H; y++) setPx(fondo, x, y, hex(col)); }
  }
  // un resplandor rojo muy tenue en el horizonte, donde está la grieta
  glow(fondo, 250, 200, 160, 40, RED, 0.12);
  // medio: el Bosque, la pradera y la grieta con su luz roja
  const medio = createRaster(W, H);
  const TREE: RGB = hex('#07050c'), GROUND: RGB = hex('#0b0810');
  for (let y = 205; y < H; y++) for (let x = 0; x < W; x++) setPx(medio, x, y, mixc(GROUND, hex('#120a10'), (y - 205) / 65 * 0.5));
  for (let i = 0; i < 26; i++) {
    const x = 6 + i * 18.5 + (hash(i, 1, 21) - 0.5) * 10;
    if (x > 205 && x < 300 && i % 3 !== 0) continue; // el claro de la grieta
    const h = 46 + hash(i, 2, 21) * 40;
    (hash(i, 3, 21) > 0.35 ? pine : oak)(medio, x, 208 + hash(i, 4, 21) * 6, h, TREE, i);
  }
  // la grieta: una línea quebrada en el piso con la luz que sale de adentro
  const crack: [number, number][] = [];
  for (let x = 196; x <= 312; x++) crack.push([x, 232 + Math.sin(x * 0.11) * 3 + (hash(x >> 2, 0, 22) - 0.5) * 4]);
  for (const [x, y] of crack) {
    const w = 1.5 + 2.2 * Math.sin(((x - 196) / 116) * Math.PI);
    for (let d = -w; d <= w; d++) setPx(medio, x, y + d, Math.abs(d) < w - 1 ? hex('#ffb07a') : hex('#c83a18'));
  }
  glow(medio, 254, 228, 150, 46, RED, 0.5);
  glow(medio, 254, 232, 60, 14, EMBER, 0.6);
  // la luz de abajo pega en la parte de abajo de los árboles cercanos
  for (let y = 150; y < 232; y++) for (let x = 130; x < 380; x++) {
    const i = (y * W + x) * 4;
    if (!medio.data[i + 3]) continue;
    const below = y + 1 < H && medio.data[((y + 1) * W + x) * 4 + 3] === 0;
    const d = Math.hypot((x - 254) / 140, (y - 232) / 60);
    if (below && d < 1) addLight(medio, x, y, RED, (1 - d) * 0.7);
  }
  // frente: copas grandes a los costados que se mecen (4 cuadros a 6 fps) y pasto del frente
  const frente: Raster[] = [];
  for (let f = 0; f < 4; f++) {
    const r = createRaster(W, H), sw = Math.sin((f / 4) * Math.PI * 2) * 3;
    oak(r, 18, 300, 230, hex('#030206'), 41, sw);
    pine(r, 470, 290, 240, hex('#030206'), 42, -sw);
    for (let x = 0; x < W; x++) { const h = 6 + vnoise(x, 0, 5, 43) * 10; for (let y = 0; y < h; y++) setPx(r, x + Math.sin((y / h) * 2 + f * 1.6 + x * 0.3) * (y / h) * 1.5, H - 1 - y, hex('#030206')); }
    // canto rojo abajo de las hojas del frente (la luz viene del suelo)
    for (let y = 1; y < H - 1; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (r.data[i + 3] && !r.data[((y + 1) * W + x) * 4 + 3] && Math.abs(x - 250) < 260) setPx(r, x, y, hex('#3a0e0a')); }
    frente.push(r);
  }
  return { id: 'intro_bosque_noche', w: W, h: H, notas: 'Momento 1: el Bosque GG de noche, tranquilo, con una grieta en el suelo que deja salir una luz roja muy tenue.', capas: [
    { nombre: 'fondo', frames: [fondo], fps: 1, paralaje: 0.3 },
    { nombre: 'medio', frames: [medio], fps: 1, paralaje: 0.6 },
    { nombre: 'frente', frames: frente, fps: 6, paralaje: 1 },
  ] };
}

// ---------------------------------------------------------------- 2. el abismo en corte

function corteAbismo(): IntroPanel {
  const W = PANEL_W, H = 540;
  const fondo = createRaster(W, H), frente = createRaster(W, H);
  // la tierra en corte: estratos que se calientan hacia abajo (la luz del fondo)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = y / H, n = fbm(x, y, 51);
    const strata = Math.sin((y + n * 40) * 0.12) > 0.6 ? 1 : 0;
    const base = mixc(hex('#0e0b12'), hex('#2a0c08'), Math.max(0, t - 0.3) / 0.7);
    setPx(fondo, x, y, mixc(base, hex('#1a1418'), strata * 0.35 + (n - 0.5) * 0.25));
  }
  // el cielo y el Bosque arriba
  for (let y = 0; y < 34; y++) for (let x = 0; x < W; x++) setPx(fondo, x, y, mixc(hex('#06050e'), hex('#120c20'), y / 34));
  for (let i = 0; i < 30; i++) pine(fondo, 8 + i * 16 + hash(i, 1, 52) * 6, 40, 14 + hash(i, 2, 52) * 12, hex('#07050a'), i);
  for (let x = 0; x < W; x++) for (let y = 38; y < 44; y++) setPx(fondo, x, y, hex('#0a0810'));
  // los siete pisos: cada uno una caverna con su silueta y su luz (más rojo cuanto más hondo)
  const floors: { y: number; name: string; light: string }[] = [
    { y: 60, name: 'bosque', light: '#3a6a4a' }, { y: 128, name: 'catedral', light: '#5ae0d0' }, { y: 196, name: 'minas', light: '#5ae8ff' },
    { y: 264, name: 'mar', light: '#3a7ab8' }, { y: 332, name: 'ciudad', light: '#a89a8a' }, { y: 400, name: 'fraguas', light: '#ff6a2a' }, { y: 472, name: 'corazon', light: '#ff3a1a' },
  ];
  // el pozo que baja zigzagueando entre los pisos (la cámara lo sigue)
  for (let y = 40; y < H; y++) { const cx = 240 + Math.sin(y * 0.03) * 60; for (let dx = -7; dx <= 7; dx++) setPx(fondo, cx + dx, y, hex('#040306')); }
  floors.forEach((fl, k) => {
    const cw = 150 + k * 6, ch = 26 + (k === 6 ? 24 : 0), cx = 240 + Math.sin(fl.y * 0.03) * 60;
    const CAVE: RGB = hex('#050408'), L = hex(fl.light), floorY = fl.y + ch * 0.55;
    const inCave = new Set<number>();
    for (let y = fl.y - ch; y <= fl.y + ch; y++) for (let x = cx - cw; x <= cx + cw; x++) {
      const d = Math.hypot((x - cx) / cw, (y - fl.y) / ch) + (vnoise(x, y, 10, 60 + k) - 0.5) * 0.18;
      if (d >= 1) continue;
      // la caverna se llena con su propia luz, más fuerte abajo (donde está lo que la ilumina): las siluetas se recortan
      const up = Math.max(0, (y - (fl.y - ch)) / (2 * ch));
      setPx(fondo, x, y, mixc(CAVE, L, (0.12 + 0.3 * up) * (1 - d * 0.6) + (bayer(Math.round(x), y) - 0.5) * 0.03));
      inCave.add(y * W + Math.round(x));
    }
    const sil: RGB = hex('#020203');
    if (fl.name === 'bosque') for (let i = 0; i < 9; i++) pine(fondo, cx - cw + 20 + i * cw * 0.22, floorY, 16 + hash(i, 1, 61) * 10, sil, 70 + i);
    if (fl.name === 'catedral') for (let i = 0; i < 6; i++) {
      const x0 = cx - cw * 0.8 + i * cw * 0.32;
      for (let y = floorY - 34; y <= floorY; y++) for (let dx = -3; dx <= 3; dx++) setPx(fondo, x0 + dx, y, sil);
      if (i < 5) for (let a = 0; a <= 180; a += 3) { const t = (a * Math.PI) / 180; for (let w = 0; w < 3; w++) setPx(fondo, x0 + cw * 0.16 - Math.cos(t) * (cw * 0.16 - w), floorY - 34 - Math.sin(t) * (12 - w), sil); }
    }
    if (fl.name === 'minas') for (let i = 0; i < 12; i++) {
      const x0 = cx - cw * 0.85 + i * cw * 0.15, h = 6 + hash(i, 2, 62) * 12, col = hex(['#5ae8ff', '#b07aff', '#ffb35a'][i % 3]);
      for (let y = 0; y < h; y++) for (let dx = -(h - y) * 0.25; dx <= (h - y) * 0.25; dx++) setPx(fondo, x0 + dx, floorY - y, mixc(sil, col, 0.7));
      glow(fondo, x0, floorY - h * 0.5, 12, 10, col, 0.35);
    }
    if (fl.name === 'mar') for (let y = Math.floor(floorY - 10); y <= fl.y + ch; y++) for (let x = cx - cw; x <= cx + cw; x++) {
      if (inCave.has(y * W + Math.round(x))) setPx(fondo, x, y, Math.sin(x * 0.2 + y * 0.9) > 0.85 ? hex('#4a7aa8') : hex('#0a1828'));
    }
    if (fl.name === 'ciudad') for (let i = 0; i < 10; i++) {
      const x0 = cx - cw * 0.85 + i * cw * 0.18, h = 12 + hash(i, 3, 63) * 26, w = 6 + hash(i, 4, 63) * 8;
      for (let y = 0; y < h; y++) for (let dx = -w; dx <= w; dx++) setPx(fondo, x0 + dx, floorY - y, sil);
      for (let dx = -w * 0.6; dx <= w * 0.6; dx++) for (let y = 0; y < 6; y++) if (Math.abs(dx) < (6 - y)) setPx(fondo, x0 + dx, floorY - h - y, sil);
    }
    if (fl.name === 'fraguas') for (let i = 0; i < 5; i++) {
      const x0 = cx - cw * 0.7 + i * cw * 0.35;
      for (let y = 0; y < 10; y++) for (let dx = -10 + (y < 4 ? 4 : 0); dx <= 10 - (y < 4 ? 4 : 0); dx++) setPx(fondo, x0 + dx, floorY - y, sil);
      glow(fondo, x0, floorY - 4, 26, 16, hex('#ff6a1a'), 0.8);
    }
    if (fl.name === 'corazon') {
      // el corazón con fuego: una forma redonda que late, con llamas alrededor
      for (let y = -22; y <= 22; y++) for (let dx = -26; dx <= 26; dx++) if (Math.hypot(dx / 26, y / 22) < 1) setPx(fondo, cx + dx, fl.y + y, mixc(hex('#3a0806'), hex('#ff5a1a'), Math.max(0, 1 - Math.hypot(dx / 26, y / 22)) * 0.9));
      glow(fondo, cx, fl.y, 200, 70, hex('#ff3a10'), 0.9);
      glow(fondo, cx, fl.y, 60, 30, hex('#ffb05a'), 0.8);
    }
    void CAVE;
  });
  // frente: raíces y piedras pegadas a los bordes (se mueven distinto con el paralaje)
  for (let i = 0; i < 16; i++) {
    const side = i % 2 ? 1 : -1, y0 = 40 + hash(i, 1, 64) * 480, len = 40 + hash(i, 2, 64) * 80;
    const x0 = side < 0 ? 0 : W - 1;
    for (let t = 0; t < len; t++) { const x = x0 - side * (t * 0.8 + Math.sin(t * 0.08 + i) * 6), y = y0 + t * 0.6 + Math.sin(t * 0.05) * 8, w = 4 * (1 - t / len) + 1; for (let d = -w; d <= w; d++) setPx(frente, x, y + d, hex('#0a0606')); }
  }
  for (let y = 0; y < H; y++) for (const side of [0, 1]) { const w = 18 + fbm(side * 99, y, 65) * 26; for (let x = 0; x < w; x++) setPx(frente, side ? W - 1 - x : x, y, hex('#070508')); }
  return { id: 'intro_corte_abismo', w: W, h: H, notas: 'Momento 2: el abismo en corte, como un hormiguero. Los siete pisos uno debajo del otro y la cámara baja por ellos. Las brasas las suma el juego.', capas: [
    { nombre: 'fondo', frames: [fondo], fps: 1, paralaje: 0.8 },
    { nombre: 'frente', frames: [frente], fps: 1, paralaje: 1 },
  ] };
}

// ---------------------------------------------------------------- 3. los ojos

function ojos(): IntroPanel {
  const W = PANEL_W, H = PANEL_H;
  // cerrados, se abren de a poco, miran, miran al costado, parpadean, miran
  const open = [0, 0.12, 0.38, 0.72, 1, 1, 0.08, 1];
  const look = [0, 0, 0, 0, 0, -0.35, 0, 0.15];
  const frames: Raster[] = [];
  for (let f = 0; f < 8; f++) {
    const r = createRaster(W, H);
    vgrad(r, [[0, '#020102'], [0.6, '#070203'], [1, '#1a0604']]);
    // escamas sugeridas alrededor de los ojos, apenas tocadas por la luz de abajo
    for (let y = 60; y < 220; y++) for (let x = 40; x < 440; x++) {
      const n = vnoise(x, y, 7, 80) - 0.5;
      const near = Math.min(Math.hypot((x - 150) / 120, (y - 132) / 70), Math.hypot((x - 330) / 120, (y - 132) / 70));
      if (near < 1 && n > 0.32) setPx(r, x, y, mixc(hex('#0c0405'), hex('#2a0a06'), (1 - near) * 0.8));
    }
    for (const [ex, ey, side] of [[150, 132, -1], [330, 132, 1]] as [number, number, number][]) {
      const RX = 72, RY = 34, o = open[f];
      // párpado: almendra, el borde de arriba baja al cerrarse
      for (let y = -RY - 6; y <= RY + 6; y++) for (let x = -RX - 8; x <= RX + 8; x++) {
        const u = x / RX, tilt = side * u * 6; // el borde de afuera un poco más alto: mirada de cuento, no de enojo
        const top = -RY * Math.sqrt(Math.max(0, 1 - u * u)) * o + tilt * o, bot = RY * 0.85 * Math.sqrt(Math.max(0, 1 - u * u)) + tilt * 0.3;
        const Y = y;
        if (Math.abs(u) <= 1 && Y >= top && Y <= bot && o > 0.02) {
          // iris rojo anaranjado con degradé radial, más claro abajo (la luz del fuego)
          const ix = (x - look[f] * RX * 0.5) / (RX * 0.62), iy = (Y - 2) / (RY * 0.95);
          const d = Math.hypot(ix, iy);
          let c: RGB;
          if (d < 1) {
            c = mixc(hex('#ffd06a'), hex('#c81a08'), Math.min(1, d * 0.9 + (iy < 0 ? -iy * 0.25 : -iy * 0.1)));
            // rayitas del iris
            if (hash(Math.round(Math.atan2(iy, ix) * 30), 0, 81) > 0.6 && d > 0.35) c = mixc(c, hex('#ff8a3a'), 0.35);
            // pupila: rendija vertical con puntas redondeadas
            const px = ix * RX * 0.62, pw = 5 + (1 - o) * 3;
            if (Math.abs(px) < pw * Math.sqrt(Math.max(0, 1 - (iy / 1.05) ** 2))) c = hex('#120202');
          } else c = mixc(hex('#3a0a06'), hex('#7a1a0a'), Math.max(0, 1 - (Y - top) / (RY * 2)));
          setPx(r, ex + x, ey + Y, c);
          // brillo húmedo arriba a un costado
          if (Math.hypot(x + RX * 0.25, Y + RY * 0.35) < 6 && o > 0.6) setPx(r, ex + x, ey + Y, hex('#fff0d0'), 220);
        } else if (Math.abs(u) <= 1.08 && Y >= top - 4 && Y <= bot + 3) {
          // el borde del párpado, oscuro con un canto rojo abajo
          setPx(r, ex + x, ey + Y, Y > bot ? hex('#5a1408') : hex('#160506'));
        }
      }
      if (o > 0.02) glow(r, ex, ey + 4, RX * 1.5, RY * 1.9, hex('#ff3a10'), 0.25 * o);
    }
    // brasas que flotan delante, subiendo
    for (let i = 0; i < 26; i++) {
      const x = (hash(i, 1, 82) * W + f * (2 + hash(i, 4, 82) * 3)) % W, y = H - ((hash(i, 2, 82) * H + f * (8 + hash(i, 3, 82) * 8)) % H);
      const big = hash(i, 5, 82) > 0.7;
      setPx(r, x, y, hex('#ffb05a'), 230); if (big) { setPx(r, x + 1, y, hex('#ff6a1a'), 200); setPx(r, x, y + 1, hex('#ff6a1a'), 200); glow(r, x, y, 5, 5, hex('#ff6a1a'), 0.4); }
    }
    frames.push(r);
  }
  return { id: 'intro_ojos', w: W, h: H, notas: 'Momento 3: dos ojos enormes en lo oscuro, de dragón de cuento: se abren de a poco, miran, miran al costado, parpadean. Brasas delante.', capas: [{ nombre: 'medio', frames, fps: 8, paralaje: 1 }] };
}

// ---------------------------------------------------------------- 4. los guardianes

/** Un jefe dibujado grande y pasado a silueta con canto rojo abajo (la luz del fuego) */
function bossSilhouette(spec: typeof MINO_SPEC, cell: number, yaw: number, poseIdx: number): Raster {
  const idle = MINO_ANIMS.find((a) => a.name === (poseIdx < 0 ? 'hit' : 'idle'))!;
  const pose = bossPoses(idle)[Math.abs(poseIdx) % idle.frames];
  const fr = renderBoss(spec.scene(cell, pose), cell, { yaw, elev: 10 }, [cell / 2, cell - 4]).raster;
  const out = createRaster(fr.w, fr.h);
  for (let y = 0; y < fr.h; y++) for (let x = 0; x < fr.w; x++) {
    const i = (y * fr.w + x) * 4;
    if (!fr.data[i + 3]) continue;
    const lum = (fr.data[i] + fr.data[i + 1] + fr.data[i + 2]) / 765;
    const below = y + 2 >= fr.h || !fr.data[((y + 2) * fr.w + x) * 4 + 3];
    const side = x < 1 || x >= fr.w - 1 || !fr.data[i - 4 + 3] || !fr.data[i + 4 + 3];
    // casi negro (con un poco del volumen) y el canto de abajo y de los costados en rojo
    let c = mixc(hex('#050306'), hex('#1a0c10'), lum * 0.7);
    if (below) c = hex('#c8361a'); else if (side) c = mixc(c, hex('#6a1a10'), 0.6);
    setPx(out, x, y, c);
  }
  return out;
}

function guardianes(): IntroPanel {
  const W = PANEL_W, H = PANEL_H;
  const mino = bossSilhouette(MINO_SPEC, 256, 30, 2);
  const guard = bossSilhouette(GUARDIAN_SPEC as typeof MINO_SPEC, 256, 150, 5);
  const mx = 30, gx = W - guard.w - 30, my = H - mino.h + 10, gy = H - guard.h + 10;
  const mc = mx + mino.w / 2, gc = gx + guard.w / 2;
  // fondo: oscuro arriba y un contraluz de fuego detrás de cada uno (así las siluetas se leen al 50 %)
  const fondo = createRaster(W, H);
  vgrad(fondo, [[0, '#030204'], [0.5, '#12050a'], [1, '#2a0806']]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const n = fbm(x, y * 1.4, 91); if (n > 0.55) addLight(fondo, x, y, hex('#5a1a10'), (n - 0.55) * 1.1 * (y / H)); }
  for (const c of [mc, gc]) { glow(fondo, c, H * 0.62, 150, 120, hex('#ff4a14'), 0.75); glow(fondo, c, H * 0.7, 70, 60, hex('#ffa04a'), 0.45); }
  const frente: Raster[] = [];
  for (let f = 0; f < 4; f++) {
    const r = createRaster(W, H);
    const place = (sil: Raster, ox: number, oy: number) => { for (let y = 0; y < sil.h; y++) for (let x = 0; x < sil.w; x++) { const i = (y * sil.w + x) * 4; if (sil.data[i + 3]) setPx(r, ox + x, oy + y, [sil.data[i], sil.data[i + 1], sil.data[i + 2]]); } };
    place(mino, mx, my); place(guard, gx, gy);
    // raíces: pocas y gruesas, suben del piso y se enroscan en las piernas; en cada cuadro se aprietan un poco más
    const k = f / 3;
    for (let i = 0; i < 10; i++) {
      const target = i < 5 ? mc : gc, side = i % 2 ? 1 : -1;
      const reach = 70 + hash(i, 2, 92) * 50 + k * 18;
      const r0 = 46 - k * 14, x0 = target + side * (r0 + hash(i, 1, 92) * 20);
      for (let t = 0; t < reach; t++) {
        const u = t / reach;
        // la vuelta alrededor de la pierna: va de un lado al otro y se cierra hacia arriba
        const ang = u * Math.PI * (1.4 + (i % 3) * 0.3) + (side > 0 ? 0 : Math.PI);
        const rad = r0 * (1 - u * 0.55);
        const x = target + Math.cos(ang) * rad + (x0 - target) * (1 - u) * 0.2;
        const y = H + 2 - t;
        const front = Math.sin(ang) > -0.2; // la parte de atrás de la vuelta queda tapada por la pierna
        const w = 5.5 * (1 - u) + 1.2;
        for (let d = -w; d <= w; d++) {
          const X = x + d, Y = y;
          if (!front) { const ii = (Math.round(Y) * W + Math.round(X)) * 4; if (r.data[ii + 3]) continue; }
          setPx(r, X, Y, d > w - 1.3 ? hex('#ff7a3a') : d < -w + 1.2 ? hex('#3a0806') : hex('#8a160a'));
        }
        // venas que brillan
        if (t % 9 === 0) setPx(r, x, y, hex('#ffb05a'));
      }
    }
    frente.push(r);
  }
  return { id: 'intro_guardianes', w: W, h: H, notas: 'Momento 4: el Minotauro y el Guardián de la Campana en silueta, a contraluz del fuego, enredados por raíces rojas que suben desde abajo y se aprietan.', capas: [
    { nombre: 'fondo', frames: [fondo], fps: 1, paralaje: 0.5 },
    { nombre: 'frente', frames: frente, fps: 6, paralaje: 1 },
  ] };
}

// ---------------------------------------------------------------- 5. la familia frente al portal

/** Un personaje de espaldas, en contraluz: casi negro con el canto del color del fuego */
function backlit(fr: Raster, rim: RGB, k: number): Raster {
  const s = scaleRaster(fr, k) as Raster;
  const out = createRaster(s.w, s.h);
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
    const i = (y * s.w + x) * 4;
    if (s.data[i + 3] < 128) continue;
    const edge = [[0, -1], [-1, 0], [1, 0], [0, -2]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X < 0 || Y < 0 || X >= s.w || s.data[(Y * s.w + X) * 4 + 3] < 128; });
    const own: RGB = [s.data[i], s.data[i + 1], s.data[i + 2]];
    setPx(out, x, y, edge ? mixc(rim, own, 0.25) : mixc(hex('#08060a'), own, 0.16));
  }
  return out;
}

function familia(): IntroPanel {
  const W = PANEL_W, H = PANEL_H;
  const FIRE: RGB = hex('#ff7a2a');
  // fondo: la cueva y el portal que brilla, con fuego detrás
  const fondo = createRaster(W, H);
  vgrad(fondo, [[0, '#040306'], [1, '#120608']]);
  const pcx = 240, pcy = 118;
  glow(fondo, pcx, pcy, 230, 150, hex('#ff3a10'), 0.5);
  for (let a = 0; a < 360; a += 0.5) {
    const t = (a * Math.PI) / 180;
    for (let w = 0; w < 9; w++) { const R = 62 + w; setPx(fondo, pcx + Math.cos(t) * R, pcy + Math.sin(t) * R * 1.25, w < 2 ? hex('#ffd08a') : w < 5 ? hex('#ff7a2a') : hex('#8a2a10')); }
  }
  for (let y = -76; y <= 76; y++) for (let x = -60; x <= 60; x++) { const d = Math.hypot(x / 60, y / 76); if (d < 1) setPx(fondo, pcx + x, pcy + y, mixc(hex('#ffcf7a'), hex('#c83a18'), d)); }
  glow(fondo, pcx, pcy, 120, 120, hex('#ffd08a'), 0.5);
  // medio: el piso con las sombras largas hacia la cámara
  const medio = createRaster(W, H);
  for (let y = 196; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x - pcx) / 240, (y - 196) / 90);
    setPx(medio, x, y, mixc(hex('#3a1a10'), hex('#0a0608'), Math.min(1, d)));
  }
  // tres sombras largas que bajan hacia la cámara desde los pies
  for (const [fx, w] of [[192, 10], [262, 8], [228, 9]] as [number, number][]) for (let y = 214; y < H; y++) {
    const t = (y - 214) / (H - 214), cx = fx + (fx - pcx) * t * 0.9, ww = w * (1 + t * 1.6);
    for (let x = cx - ww; x <= cx + ww; x++) setPx(medio, x, y, hex('#050304'), Math.round(230 * (1 - t * 0.5)));
  }
  // frente: Sophie y Alana de espaldas, Thor adelante; Thor gira la cabeza hacia la cámara al final
  const sophie = familyFicha('sophie', true), alana = familyFicha('alana', true), thor = thorFicha(0);
  const frente: Raster[] = [];
  const sIdle = renderClip(sophie, 64, 'idle', 'back').frames, aIdle = renderClip(alana, 64, 'idle', 'back').frames;
  const tBack = renderClip(thor, 64, 'idle', 'back').frames, tTurn = renderClip(thor, 64, 'idle', 'nw').frames;
  for (let f = 0; f < 6; f++) {
    const r = createRaster(W, H);
    const draw = (s: Raster, cx: number, by: number) => { for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const i = (y * s.w + x) * 4; if (s.data[i + 3]) setPx(r, cx - s.w / 2 + x, by - s.h + y, [s.data[i], s.data[i + 1], s.data[i + 2]]); } };
    const sp = backlit(sIdle[f % sIdle.length], FIRE, 2), ap = backlit(aIdle[(f + 2) % aIdle.length], FIRE, 2);
    const tp = backlit((f >= 4 ? tTurn : tBack)[f % tBack.length], FIRE, 2);
    // los pies: Sophie a la izquierda, Alana a la derecha, Thor adelante entre las dos (más cerca del portal: más arriba)
    const trimBottom = (s: Raster) => { let b = s.h - 1; while (b > 0) { let any = false; for (let x = 0; x < s.w; x++) if (s.data[(b * s.w + x) * 4 + 3]) { any = true; break; } if (any) break; b--; } return s.h - 1 - b; };
    draw(tp, 228, 214 + trimBottom(tp));
    draw(sp, 192, 236 + trimBottom(sp));
    draw(ap, 262, 238 + trimBottom(ap));
    frente.push(r);
  }
  return { id: 'intro_familia', w: W, h: H, notas: 'Momento 5: de espaldas, Sophie y Alana con Thor adelante, frente al portal que brilla. Sombras largas hacia la cámara. Thor gira hacia la cámara en los dos últimos cuadros.', capas: [
    { nombre: 'fondo', frames: [fondo], fps: 1, paralaje: 0.4 },
    { nombre: 'medio', frames: [medio], fps: 1, paralaje: 0.7 },
    { nombre: 'frente', frames: frente, fps: 8, paralaje: 1 },
  ] };
}

export function introPanels(): IntroPanel[] {
  return [bosqueNoche(), corteAbismo(), ojos(), guardianes(), familia()];
}

// ---------------------------------------------------------------- fuego, humo y logo

/** Color del fuego según la altura relativa dentro de la llama (0 la base, 1 la punta) */
function fireColor(t: number): RGB | null {
  if (t >= 1) return null;
  if (t < 0.18) return hex('#fff4c8');
  if (t < 0.38) return hex('#ffd25a');
  if (t < 0.58) return hex('#ff9a2a');
  if (t < 0.78) return hex('#e8501a');
  return hex('#9a1e0e');
}

/**
 * `fuego_pared` (128 x 96, pega de lado a lado, 8 cuadros a 12 fps, en bucle): una pared de llamas sin piedras. Cada
 * columna tiene su altura, que sube y baja con un ruido que se repite cada 128 px y cada 8 cuadros.
 */
export function fuegoPared(): Raster[] {
  const W = 128, H = 96, out: Raster[] = [];
  for (let f = 0; f < 8; f++) {
    const r = createRaster(W, H), ph = (f / 8) * Math.PI * 2;
    for (let x = 0; x < W; x++) {
      // lenguas: tres ondas que pegan en 128 y se mueven en el ciclo de 8
      const u = (x / W) * Math.PI * 2;
      const h = 46 + 14 * Math.sin(u * 3 + ph) + 9 * Math.sin(u * 7 - ph * 2 + 1) + 6 * Math.sin(u * 11 + ph * 3 + 2);
      for (let y = 0; y < H; y++) {
        const fromBottom = H - 1 - y;
        // el borde de la llama tiembla con ruido que también vuelve al principio
        const n = vnoise(x, fromBottom - f * 12, 8, 101, W) * 10 - 5;
        const t = (fromBottom + n * (fromBottom / h)) / h;
        const c = fireColor(t + (bayer(x, y) - 0.5) * 0.08);
        if (c) setPx(r, x, y, c, t > 0.85 ? 200 : 255);
      }
    }
    // chispas que suben
    for (let i = 0; i < 10; i++) { const x = Math.floor(hash(i, 1, 102) * W), y = H - 1 - ((hash(i, 2, 102) * 96 + f * 12) % 96); if (y < 40) setPx(r, x, y, hex('#ffd08a'), 230); }
    out.push(r);
  }
  return out;
}

/** `humo_grande` (128 x 128, 6 cuadros a 6 fps): humo que cruza delante de todo y se desvanece. */
export function humoGrande(): Raster[] {
  const S = 128, out: Raster[] = [];
  for (let f = 0; f < 6; f++) {
    const r = createRaster(S, S), fade = 1 - f / 6;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const d = Math.hypot((x - 64) / 60, (y - 64) / 56);
      const n = fbm(x + f * 6, y - f * 4, 111);
      const a = (1 - d) * 1.4 + (n - 0.5) * 1.2 - 0.25;
      if (a <= 0) continue;
      const tone = mixc(hex('#1a1214'), hex('#4a3a3a'), Math.min(1, n * 1.2));
      setPx(r, x, y, tone, Math.round(Math.min(1, a) * 150 * fade));
    }
    out.push(r);
  }
  return out;
}

/**
 * `logo_fuego` (el logo de siempre al doble, 16 cuadros a 12 fps): una lengua de fuego recorre las letras de izquierda
 * a derecha y saltan chispas. El logo va encima del fuego; el canto de abajo de cada letra toma la luz.
 */
export function logoFuego(logo: Raster): Raster[] {
  const big = scaleRaster(logo, 2) as Raster;
  const W = big.w, H = big.h + 32, out: Raster[] = [];
  const top = new Int16Array(W).fill(-1);
  for (let x = 0; x < W; x++) for (let y = 0; y < big.h; y++) if (big.data[(y * W + x) * 4 + 3] > 128) { top[x] = y + 32; break; }
  for (let f = 0; f < 16; f++) {
    const r = createRaster(W, H);
    const head = (f / 16) * (W + 160) - 80;
    // llamas que salen del borde de arriba de las letras, más altas donde pasa la lengua
    for (let x = 0; x < W; x++) {
      if (top[x] < 0) continue;
      const near = Math.max(0, 1 - Math.abs(x - head) / 90);
      const h = 6 + near * 26 + vnoise(x, f, 4, 121) * 6;
      for (let t = 0; t < h; t++) {
        const n = vnoise(x, t - f * 6, 5, 122) * 6 - 3;
        const c = fireColor((t + n * (t / h)) / h);
        if (c) setPx(r, x, top[x] - t, c, Math.round(255 * (0.55 + near * 0.45)));
      }
    }
    // el logo encima, con luz de fuego en el canto de abajo
    for (let y = 0; y < big.h; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (!big.data[i + 3]) continue;
      setPx(r, x, y + 32, [big.data[i], big.data[i + 1], big.data[i + 2]], big.data[i + 3]);
      const below = y + 1 >= big.h || big.data[((y + 1) * W + x) * 4 + 3] < 128;
      if (below) addLight(r, x, y + 32, hex('#ff7a2a'), 0.35 + 0.5 * Math.max(0, 1 - Math.abs(x - head) / 120));
    }
    // chispas
    for (let i = 0; i < 18; i++) {
      const x = head + (hash(i, f, 123) - 0.5) * 120, y = 30 + (hash(f, i, 124) * 50) - (f % 4) * 4;
      setPx(r, x, y, hex('#ffd08a'), 240); setPx(r, x, y + 1, hex('#ff6a1a'), 160);
    }
    out.push(r);
  }
  return out;
}

export { copy };
