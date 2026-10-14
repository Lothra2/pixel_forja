import { createRaster, type Raster } from '../core/raster';
import { contactShadow } from './premium/contact';
import type { WorldObject } from './objects';
import { hash, put, glow, tone, outline, rgb } from './puertoObjects';

/**
 * Mundo 6: La Fragua de las Luces (encargo F12, parte 2). Detrás de la puerta con fuego del mural 5, una fragua del
 * tamaño de una montaña: ríos lentos de lava, puentes de obsidiana, cadenas del techo y miles de jaulitas con las
 * luces que la Ladrona se fue robando piso por piso. Todo respira: los fuelles gigantes soplan y las grietas del piso
 * se ponen al rojo.
 *
 * Como en el Puerto y la Ciudad: sin sombra horneada con dirección, cada objeto trae solo su sombra de contacto al
 * pie. La luz es de la lava, los braseros, las grietas, las jaulas y la Dragona: por eso el hierro y la roca llevan un
 * filo naranja abajo a la derecha (el rebote del fuego), y lo frío (las fuentes, la escarcha) brilla celeste.
 */

export const FRAGUA = {
  roca: ['#0a0606', '#140c0a', '#1e1412', '#2a1e1a', '#382a26', '#4a3a36'],
  obsidiana: ['#120c16', '#1c1420', '#2a1e2e', '#3a2c42', '#4a3a56', '#5a4a6a'],
  lava: ['#5a1000', '#8a2000', '#c03a10', '#ff7020', '#ffb040', '#fff0a0'],
  grieta: { apagada: '#2a1010', aviso: '#c04010', rojo: '#ff7020' },
  hierro: ['#14100e', '#241c18', '#342a24', '#4a3c34', '#6a5a50'],
  oxido: '#8a4a2a',
  frio: ['#1e3e5a', '#2e6a90', '#4a9ac8', '#7ad0ff', '#b0e8ff', '#e0f6ff'],
  carbon: ['#080606', '#120e0c', '#1c1614', '#2a2220', '#3a302c'],
  madera: ['#1a100a', '#2a1a10', '#3c2618', '#4e3422', '#62442e'],
  cuero: ['#2a1410', '#3e2018', '#562e20', '#6e3e2a', '#8a5236'],
  apagada: '#a05030',
};
/** Las luces robadas: una por mundo de arriba */
export const LUCES = { bosque: '#9aff7a', catedral: '#ffc070', galerias: '#8ae0ff', faro: '#ffe080', ciudad: '#ffd890' } as const;
export type LuzId = keyof typeof LUCES;
export const LUZ_IDS = Object.keys(LUCES) as LuzId[];

const R = FRAGUA.roca, O = FRAGUA.obsidiana, L = FRAGUA.lava, I = FRAGUA.hierro, F = FRAGUA.frio;
type Anim = { frames: Raster[]; fps: number; loop: boolean };
const one = (fr: Raster): Record<string, Anim> => ({ idle: { frames: [fr], fps: 1, loop: true } });
const grounded = (o: WorldObject, frame?: Raster, opts?: Parameters<typeof contactShadow>[2]): WorldObject => {
  const fr = frame ?? (o.anims.idle ?? Object.values(o.anims)[0]).frames[0];
  return { ...o, shadow: contactShadow(fr, o.anchor, opts) };
};

/** mezcla de dos colores hex */
export function mixC(a: string, b: string, t: number): string {
  const A = rgb(a), B = rgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * Math.max(0, Math.min(1, t))).toString(16).padStart(2, '0')).join('');
}

/**
 * El rebote del fuego: los pixeles del borde de abajo y de la derecha (los que tienen aire abajo o a la derecha) se
 * tiñen de naranja. Hace que todo lo de la fragua se vea alumbrado por la lava.
 */
export function warmRim(r: Raster, k = 0.45, col = '#ff7020') {
  const W = r.w, H = r.h, a0 = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) a0[i] = r.data[i * 4 + 3] > 150 ? 1 : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!a0[y * W + x]) continue;
    const open = (x + 1 < W && !a0[y * W + x + 1]) || (y + 1 < H && !a0[(y + 1) * W + x]);
    if (open) put(r, x, y, col, Math.round(255 * k));
  }
}

/** Ceniza asentada: motas grises sobre lo que mira para arriba. */
export function ashDust(r: Raster, amount: number, seed: number) {
  const W = r.w;
  for (let y = 1; y < r.h; y++) for (let x = 0; x < W; x++) {
    const k = (y * W + x) * 4;
    if (r.data[k + 3] < 200 || r.data[k - W * 4 + 3] > 0) continue;
    if (hash(x, y, seed) < amount) put(r, x, y, hash(x, y, seed + 1) > 0.5 ? '#8a8078' : '#5a504a', 230);
  }
}

/** Escarcha: cristalitos celestes sobre lo de arriba y algún brillo blanco. */
function frost(r: Raster, amount: number, seed: number, f = 0) {
  const W = r.w;
  for (let y = 1; y < r.h; y++) for (let x = 0; x < W; x++) {
    const k = (y * W + x) * 4;
    if (r.data[k + 3] < 200 || r.data[k - W * 4 + 3] > 0) continue;
    const h = hash(x, y, seed);
    if (h < amount) put(r, x, y, h < amount * 0.25 && (x + f * 3) % 7 === 0 ? '#ffffff' : hash(x, y, seed + 1) > 0.5 ? F[5] : F[4], 230);
  }
}

/** Corre un dibujo con un vaivén: la parte de abajo se corre `dx` px, la de arriba (y0) queda quieta. */
export function sway(r: Raster, y0: number, dx: number): Raster {
  if (!dx) return r;
  const o = createRaster(r.w, r.h);
  for (let y = 0; y < r.h; y++) {
    const s = y <= y0 ? 0 : (dx * (y - y0)) / (r.h - y0);
    for (let x = 0; x < r.w; x++) {
      const sx = Math.round(x - s);
      if (sx < 0 || sx >= r.w) continue;
      const si = (y * r.w + sx) * 4, di = (y * r.w + x) * 4;
      for (let c = 0; c < 4; c++) o.data[di + c] = r.data[si + c];
    }
  }
  return o;
}

/** Elipse rellena con una función de color por pixel (u, v de -1 a 1). */
function ellipse(r: Raster, cx: number, cy: number, rx: number, ry: number, col: (u: number, v: number, x: number, y: number) => string | null, a = 255) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry;
    if (u * u + v * v > 1) continue;
    const c = col(u, v, x, y);
    if (c) put(r, x, y, c, a);
  }
}

/** Una línea gruesa de color (para cadenas, palos, barrotes). */
function line(r: Raster, x0: number, y0: number, x1: number, y1: number, c: string | ((t: number) => string), w = 1, a = 255) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5));
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, col = typeof c === 'string' ? c : c(t);
    for (let k = 0; k < w; k++) put(r, x + k - (w - 1) / 2, y, col, a);
  }
}

/** Eslabones de cadena colgando de (x0, y0) a (x1, y1): óvalos alternados (de frente y de canto). */
export function chainLinks(r: Raster, x0: number, y0: number, x1: number, y1: number, size = 3, rim = 0.4) {
  const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.floor(len / (size * 1.7)));
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
    if (i % 2) { const hw = Math.max(0.5, size * 0.28); for (let k = -size; k <= size; k++) for (let w = -hw; w <= hw; w += 0.5) put(r, x + w, y + k * 0.9, w < -hw * 0.3 ? I[4] : w > hw * 0.4 ? mixC(I[2], '#ff7020', rim) : I[3]); }
    else ellipse(r, x, y, size * 0.75, size, (u, v) => (u * u + v * v < 0.3 ? null : u < -0.2 ? I[4] : v > 0.3 ? mixC(I[2], '#ff7020', rim) : I[3]));
  }
}

// ---------------------------------------------------------------- la fuente fría (la fogata del piso)

/**
 * Fuente fría (96 x 96, `idle` 6 cuadros a 6 fps): una pila redonda de piedra clara que no se calienta, llena de agua
 * helada que se mueve, con escarcha en el borde y una columna de hielo en el medio que gotea. Brilla celeste.
 */
function coldFountain(f: number): Raster {
  const r = createRaster(96, 96), cx = 48;
  // el pie de la pila: piedra gris azulada con escarcha
  for (let y = 70; y < 90; y++) { const hw = 34 - (y - 70) * 0.25; for (let x = Math.floor(cx - hw); x <= cx + hw; x++) { const u = (x - cx) / hw; put(r, x, y, tone(['#1a2230', '#2a3446', '#3e4a60', '#566478', '#7a889c'], 0.62 - u * 0.4 - (y > 86 ? 0.25 : 0) + (y < 73 ? 0.2 : 0), x, y)); } }
  // el borde de la pila
  ellipse(r, cx, 70, 38, 12, (u, v, x, y) => tone(['#2a3446', '#3e4a60', '#566478', '#7a889c', '#a8b8cc'], 0.75 - u * 0.35 - v * 0.2, x, y));
  // el agua helada adentro, que se mueve en ondas
  ellipse(r, cx, 69, 32, 9, (u, v, x, y) => {
    const w = Math.sin(Math.hypot(u * 3, v * 3) * 4 - f * (Math.PI / 3)) * 0.12;
    let l = 0.55 - v * 0.25 + w;
    if (Math.abs(Math.sin(u * 9 + f)) < 0.08 && v < 0.2) l += 0.3;
    return tone(F, l, x, y, true);
  });
  // la columna de hielo del medio con su gotera
  for (let y = 32; y < 70; y++) { const hw = 5 - (70 - y) * 0.05 + Math.sin(y * 0.6) * 0.8; for (let x = Math.floor(cx - hw); x <= cx + hw; x++) { const u = (x - cx) / hw; put(r, x, y, tone(F, 0.85 - u * 0.4 - (y > 64 ? 0.1 : 0), x, y)); } }
  // la corona de hielo arriba: cuatro picos
  for (const [dx, h] of [[-6, 10], [-2, 16], [3, 13], [7, 8]] as [number, number][]) for (let t = 0; t < h; t++) { const w = (1 - t / h) * 2.6; for (let x = -w; x <= w; x++) put(r, cx + dx + x, 34 - t, tone(F, 0.95 - x / 6, x, t)); }
  // el agua que cae de la corona a la pila (un hilo que baja por los cuadros)
  for (let k = 0; k < 3; k++) { const y = 36 + ((f * 6 + k * 11) % 32); put(r, cx + 6, y, F[5], 230); put(r, cx + 6, y + 1, F[4], 200); }
  // la salpicadura donde cae
  if (f % 2 === 0) for (const [dx, dy] of [[4, 66], [8, 65], [10, 67]]) put(r, cx + dx, dy, '#ffffff', 220);
  outline(r, '#06080e');
  frost(r, 0.5, 301, f);
  // brillitos de escarcha que titilan en el borde
  for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2 + 0.3, x = cx + Math.cos(a) * 36, y = 70 + Math.sin(a) * 11; if ((k + f) % 3 === 0) { put(r, x, y, '#ffffff'); put(r, x + 1, y, F[5], 180); put(r, x, y - 1, F[5], 180); } }
  glow(r, cx, 50, 30, F[3], 0.8 + 0.15 * Math.sin(f));
  return r;
}

function coldFountainObject(): WorldObject {
  const frames = Array.from({ length: 6 }, (_, f) => coldFountain(f));
  return grounded({ name: 'fuente_fria', w: 96, h: 96, anchor: [48, 88], solid: [-32, -18, 64, 24], light: { color: F[3], radius: 220, pulse: true, dy: 30 }, anims: { idle: { frames, fps: 6, loop: true } } }, frames[0], { spread: 4 });
}

/** Charco frío (64 x 32, `idle` 4 cuadros a 4 fps, capa suelo): agua helada con borde de escarcha. Luz chiquita. */
function coldPuddle(): WorldObject {
  const frames = Array.from({ length: 4 }, (_, f) => {
    const r = createRaster(64, 32);
    ellipse(r, 32, 16, 29, 12, (u, v, x, y) => {
      const d = Math.hypot(u, v) + (hash(x >> 2, y >> 1, 311) - 0.5) * 0.18;
      if (d > 1) return null;
      if (d > 0.82) return hash(x, y, 312) > 0.3 ? (d > 0.92 ? F[5] : F[4]) : null;
      const w = Math.sin(u * 7 + v * 3 - f * (Math.PI / 2)) * 0.1;
      return tone(F, 0.42 - v * 0.15 + w + (Math.abs(Math.sin(u * 11 - f)) < 0.07 ? 0.35 : 0), x, y, true);
    }, 230);
    for (let k = 0; k < 5; k++) if ((k + f) % 4 < 2) { const x = 8 + hash(k, 1, 313) * 48, y = 8 + hash(k, 2, 313) * 16; put(r, x, y, '#ffffff'); }
    return r;
  });
  return { name: 'charco_frio', w: 64, h: 32, anchor: [32, 16], solid: null, layer: 'suelo', light: { color: F[3], radius: 60, pulse: true, dy: 0 }, anims: { idle: { frames, fps: 4, loop: true } } };
}

// ---------------------------------------------------------------- las jaulas con las luces robadas

/** El dibujito de cada luz (lo que hay adentro de la jaula y lo que queda flotando), centrado en (cx, cy). */
function lightMotif(r: Raster, luz: LuzId, cx: number, cy: number, f: number, k = 1, a = 255) {
  const c = LUCES[luz], hi = mixC(c, '#ffffff', 0.6), lo = mixC(c, '#000000', 0.35);
  const b = Math.sin((f / 6) * Math.PI * 2);
  glow(r, cx, cy, 9 * k + b, c, 1.1);
  if (luz === 'bosque') {
    // una luciérnaga: el cuerpito con la cola que brilla y las alitas que se mueven
    ellipse(r, cx, cy + 1, 2.6 * k, 2.6 * k, (u, v) => (u + v < -0.5 ? '#ffffff' : u * u + v * v < 0.4 ? hi : c), a);
    for (const s of [-1, 1]) ellipse(r, cx + s * (3 + (f % 2)) * k, cy - 2 * k, 2 * k, 1.2 * k, () => '#d8ffe0', Math.round(a * 0.7));
    put(r, cx, cy - 3 * k, '#2a3a20', a);
  } else if (luz === 'catedral') {
    // una vela: el cabito blanco y la llama ámbar
    for (let y = 0; y < 5 * k; y++) for (let x = -1.5 * k; x <= 1.5 * k; x++) put(r, cx + x, cy + 1 + y, x < 0 ? '#f4ecd8' : '#d8ccb0', a);
    const fh = (4 + b * 0.6) * k;
    for (let y = 0; y < fh; y++) { const w = (1 - y / fh) * 1.8 * k; for (let x = -w; x <= w; x++) put(r, cx + x + Math.sin(f + y) * 0.3, cy - y, y < fh * 0.4 ? '#fffaf0' : c, a); }
  } else if (luz === 'galerias') {
    // un cristal celeste de seis lados con su brillo
    for (let y = -4 * k; y <= 4 * k; y++) { const w = (4 * k - Math.abs(y)) * 0.6 + 0.6; for (let x = -w; x <= w; x++) put(r, cx + x, cy + y, x < -w * 0.3 ? hi : x > w * 0.4 ? lo : c, a); }
    put(r, cx - 1, cy - 2 * k, '#ffffff', a);
  } else if (luz === 'faro') {
    // el oro del faro: una bolita con rayos que giran
    ellipse(r, cx, cy, 2.8 * k, 2.8 * k, (u, v) => (u + v < -0.4 ? '#fffaf0' : hi), a);
    for (let q = 0; q < 4; q++) { const ang = (q / 4) * Math.PI + f * 0.26; for (let t = 3.4 * k; t < 6 * k; t++) put(r, cx + Math.cos(ang) * t, cy + Math.sin(ang) * t, c, Math.round(a * (1 - (t - 3.4 * k) / (3 * k)))); }
  } else {
    // el farolito de la ciudad: una llamita dorada adentro de un vidrio chiquito
    for (let y = -3 * k; y <= 3 * k; y++) for (let x = -2.4 * k; x <= 2.4 * k; x++) put(r, cx + x, cy + y, Math.abs(x) > 1.6 * k || Math.abs(y) > 2.4 * k ? '#6a5a40' : Math.abs(x) < 0.8 * k && y > -1 ? '#fffaf0' : c, a);
    put(r, cx, cy - 3.6 * k, '#6a5a40', a);
  }
}

/** Dónde está el candado de la jaula, desde el apoyo (la argolla de arriba). */
export const JAULA_CANDADO: [number, number] = [0, 52];

/**
 * Una jaula colgante (32 x 64, apoyo arriba en la cadena [16, 4]): la cadena, la argolla, el techito de cúpula, los
 * barrotes, la base y el candado abajo adelante. `open` de 0 (cerrada) a 1 (puerta abierta), `lock` 0 puesto, 1
 * saltado (cae), `light` cuánto de la luz queda adentro y `rise` cuánto subió la luz al salir.
 */
function cage(luz: LuzId, f: number, sw: number, open: number, lock: number, light: number, rise: number): Raster {
  const r = createRaster(32, 64), cx = 16;
  // la cadena que sube hasta el techo
  chainLinks(r, cx, 0, cx, 9, 2, 0.2);
  // la luz adentro (detrás de los barrotes)
  // el aire de adentro teñido por la luz (más fuerte en el centro), y el dibujito de la luz
  const lt = light * (rise > 0 ? Math.max(0, 1 - rise * 1.5) : 1);
  if (light > 0 && rise <= 0) lightMotif(r, luz, cx, 33 + Math.sin((f / 6) * Math.PI * 2) * 1, f, 1.5, Math.round(255 * light));
  // la cúpula: arcos de hierro y un remate
  ellipse(r, cx, 17, 10, 6, (u, v, x, y) => (v > 0.3 ? null : tone(I, 0.7 - u * 0.45 - (v < -0.6 ? 0 : 0.1), x, y)));
  put(r, cx, 10, I[4]); put(r, cx, 11, I[3]);
  // los barrotes: 7 verticales (la puerta son los 3 del medio, que se abren hacia la derecha)
  for (let b = 0; b < 7; b++) {
    const x0 = 6 + b * 3.4, door = b >= 2 && b <= 4;
    if (door && open > 0) continue;
    for (let y = 18; y < 47; y++) put(r, x0, y, b === 0 ? I[4] : b === 6 ? mixC(I[2], '#ff7020', 0.35) : I[3]);
  }
  // la puerta abierta: girada sobre la bisagra de la derecha, se ve angosta
  if (open > 0) {
    // la puertita gira sobre la bisagra de la derecha y queda afuera, de canto (se ve angosta)
    const hx = 22, w = 10 - open * 7, dir = open > 0.5 ? 1 : -1;
    const ex = hx + dir * w * (open > 0.5 ? 0.6 : 1) * (open > 0.5 ? 1 : 1 - open * 2) + (open > 0.5 ? 0 : 0);
    for (let y = 19; y < 47; y++) { put(r, hx, y, I[3]); put(r, ex, y, I[4]); if ((y - 19) % 9 === 0) for (let t = 0; t <= Math.abs(ex - hx); t++) put(r, Math.min(hx, ex) + t, y, I[3]); }
    put(r, (hx + ex) / 2, 33, I[2]);
  }
  // los aros de arriba, del medio y la base
  for (const y of [18, 32]) for (let x = 5; x <= 27; x++) if (!(open > 0 && x > 11 && x < 21)) put(r, x, y, tone(I, 0.75 - (x - 5) / 30, x, y));
  for (let y = 47; y < 51; y++) { const hw = 11 - (y - 47) * 0.6; for (let x = Math.floor(cx - hw); x <= cx + hw; x++) put(r, x, y, tone(I, (y === 47 ? 0.85 : 0.55) - (x - cx + hw) / (hw * 3), x, y)); }
  // el candado: cuerpo de hierro con óxido, el arco arriba y el ojo de la llave
  const lx = cx + JAULA_CANDADO[0], ly = 4 + JAULA_CANDADO[1] + lock * 9;
  if (lock < 1) {
    const ax = lock * 3;
    for (let t = 0; t < Math.PI; t += 0.25) put(r, lx + ax + Math.cos(t) * 2, ly - 4 - Math.sin(t) * 2.4 - lock * 2, I[4]);
    for (let y = -3; y <= 2; y++) for (let x = -3; x <= 3; x++) put(r, lx + ax + x, ly + y, y === -3 ? '#c8a060' : x < -1 ? '#d8b070' : x > 1 ? FRAGUA.oxido : '#a87a40');
    put(r, lx + ax, ly - 1, '#1a100a'); put(r, lx + ax, ly, '#1a100a');
  }
  outline(r, '#0a0606');
  // el aire de adentro teñido por la luz (más fuerte en el centro): entre los barrotes, después del contorno
  if (lt > 0) for (let y = 19; y < 47; y++) for (let x = 7; x < 26; x++) {
    const d = Math.hypot((x - cx) / 10, (y - 33) / 15), k = (y * 32 + x) * 4;
    if (d >= 1) continue;
    const empty = r.data[k + 3] < 120 || (r.data[k] === 10 && r.data[k + 1] === 6 && r.data[k + 2] === 6);
    if (empty) { r.data[k + 3] = 0; put(r, x, y, mixC('#1a0c08', LUCES[luz], (1 - d) ** 1.2 * lt * 0.85), Math.round(110 + (1 - d) * 120 * lt)); }
  }
  // la luz que sale: sube por arriba de la jaula y se achica
  if (light > 0 && rise > 0) lightMotif(r, luz, cx + rise * 4, 34 - rise * 30, f, 1 - rise * 0.3, Math.round(255 * light));
  return sway(r, 4, sw);
}

function cageObjects(): WorldObject[] {
  return LUZ_IDS.map((luz) => {
    const sw = (f: number, n: number, k = 1.4) => Math.round(Math.sin((f / n) * Math.PI * 2) * k);
    const cerrada = Array.from({ length: 6 }, (_, f) => cage(luz, f, sw(f, 6), 0, 0, 0.85 + 0.15 * Math.sin((f / 6) * Math.PI * 2), 0));
    // abrir: el candado tiembla (0 y 1), salta y cae (2 a 4), la puerta se abre (3 a 6) y la luz sale por arriba (5 a 9)
    const abrir = Array.from({ length: 10 }, (_, f) => cage(luz, f, f < 2 ? (f % 2 ? 1 : -1) : sw(f, 10, 2), Math.max(0, Math.min(1, (f - 3) / 3)), f < 2 ? 0 : Math.min(1, (f - 1) / 3), f < 9 ? 1 : 0.4, Math.max(0, (f - 5) / 4)));
    const vacia = [0, 1].map((f) => cage(luz, f, f ? 1 : -1, 1, 1, 0, 0));
    return { name: `jaula_luz_${luz}`, w: 32, h: 64, anchor: [16, 4] as [number, number], solid: null, light: { color: LUCES[luz], radius: 40, pulse: true, dy: -30 }, anims: { cerrada: { frames: cerrada, fps: 6, loop: true }, abrir: { frames: abrir, fps: 12, loop: false }, vacia: { frames: vacia, fps: 2, loop: true } } };
  });
}

/** La luz liberada (24 x 24, `idle` 8 cuadros a 8 fps): flota y respira. Luz de su color de radio 260. */
function freeLights(): WorldObject[] {
  return LUZ_IDS.map((luz) => {
    const frames = Array.from({ length: 8 }, (_, f) => {
      const r = createRaster(24, 24), b = Math.sin((f / 8) * Math.PI * 2);
      // un halo grande que respira y el dibujito que sube y baja
      glow(r, 12, 12, 11.5 + b * 0.5, LUCES[luz], 2.4);
      lightMotif(r, luz, 12, 12 + Math.round(b * 1.5), f, 1.05);
      // dos chispitas que giran alrededor
      for (let q = 0; q < 2; q++) { const a = (f / 8) * Math.PI * 2 + q * Math.PI; put(r, 12 + Math.cos(a) * 8, 12 + Math.sin(a) * 5, '#ffffff', 220); }
      return r;
    });
    return { name: `luz_libre_${luz}`, w: 24, h: 24, anchor: [12, 12] as [number, number], solid: null, light: { color: LUCES[luz], radius: 260, pulse: true, dy: 0 }, anims: { idle: { frames, fps: 8, loop: true } } };
  });
}

// ---------------------------------------------------------------- las grietas que respiran

/**
 * Las grietas del piso (64 x 64, capa suelo): una red de rajaduras que encaja con las vecinas (todas cruzan los bordes
 * por los mismos puntos: x o y = 16, 32 y 48, alternados). `apagada` (1, rojo muy oscuro), `aviso` (6 cuadros a 8 fps:
 * el naranja sube y baja, avisando) y `caliente` (6 cuadros a 6 fps: al rojo, con el corazón amarillo y un halo).
 */
function crackPaths(v: number): [number, number][][] {
  // los puntos del borde: arriba y abajo en x = 16 o 48, izquierda y derecha en y = 32 (siempre los mismos)
  const top: [number, number] = [v % 2 ? 48 : 16, -1], bot: [number, number] = [v % 2 ? 48 : 16, 64], left: [number, number] = [-1, 32], right: [number, number] = [64, 32];
  const mid: [number, number] = [26 + hash(v, 1, 321) * 12, 26 + hash(v, 2, 321) * 12];
  const m2: [number, number] = [14 + hash(v, 3, 321) * 36, 10 + hash(v, 4, 321) * 44];
  const paths: [number, number][][] = [[top, mid, bot], [left, mid, right]];
  // una rama más que no llega al borde
  paths.push([mid, m2]);
  if (v >= 2) paths.push([mid, [mid[0] + (v === 2 ? -18 : 18), mid[1] + 16]]);
  // ramitas finas que salen de los tramos (más red, se lee como piso quebrado)
  for (let k = 0; k < 4; k++) { const a = hash(k, v, 326) * Math.PI * 2, base = paths[k % 2], t = 0.2 + hash(v, k, 327) * 0.6, o: [number, number] = t < 0.5 ? [base[0][0] + (base[1][0] - base[0][0]) * t * 2, base[0][1] + (base[1][1] - base[0][1]) * t * 2] : [base[1][0] + (base[2][0] - base[1][0]) * (t - 0.5) * 2, base[1][1] + (base[2][1] - base[1][1]) * (t - 0.5) * 2]; paths.push([o, [o[0] + Math.cos(a) * 11, o[1] + Math.sin(a) * 11]]); }
  // las rutas se quiebran: cada tramo en pasitos con ruido
  return paths.map((p) => {
    const out: [number, number][] = [];
    for (let i = 0; i < p.length - 1; i++) {
      const [x0, y0] = p[i], [x1, y1] = p[i + 1], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 6);
      for (let k = 0; k < n; k++) { const t = k / n, j = k === 0 ? 0 : (hash(i * 31 + k, v, 322) - 0.5) * 5; out.push([x0 + (x1 - x0) * t + j * Math.abs(y1 - y0) / 64 * 1.6, y0 + (y1 - y0) * t + j * Math.abs(x1 - x0) / 64 * 1.6]); }
    }
    out.push(p[p.length - 1]);
    return out;
  });
}

function crack(v: number, state: 'apagada' | 'aviso' | 'caliente', f: number): Raster {
  const r = createRaster(64, 64), paths = crackPaths(v);
  const heat = state === 'apagada' ? 0 : state === 'aviso' ? 0.45 + 0.35 * Math.sin((f / 6) * Math.PI * 2) : 0.85 + 0.15 * Math.sin((f / 6) * Math.PI * 2);
  // primero el halo (solo caliente): naranja transparente alrededor de las rajaduras
  const mark = new Float32Array(64 * 64).fill(99);
  for (const p of paths) for (let i = 0; i < p.length - 1; i++) {
    const [x0, y0] = p[i], [x1, y1] = p[i + 1], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
    for (let k = 0; k <= n; k++) { const x = x0 + (x1 - x0) * (k / n), y = y0 + (y1 - y0) * (k / n); for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) { const X = Math.round(x + dx), Y = Math.round(y + dy); if (X < 0 || Y < 0 || X >= 64 || Y >= 64) continue; mark[Y * 64 + X] = Math.min(mark[Y * 64 + X], Math.hypot(dx, dy)); } }
  }
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const d = mark[y * 64 + x];
    if (d > 6) continue;
    if (d <= 1) put(r, x, y, state === 'apagada' ? FRAGUA.grieta.apagada : tone([FRAGUA.grieta.aviso, FRAGUA.grieta.rojo, L[4], L[5]], heat + (hash(x, y, 323 + f) - 0.5) * 0.2, x, y));
    else if (d <= 2.2) put(r, x, y, state === 'apagada' ? '#140808' : mixC('#3a1408', FRAGUA.grieta.aviso, heat), state === 'apagada' ? 210 : 240);
    else if (state === 'apagada' && d <= 3.2) put(r, x, y, '#1a0c0a', 90);
    else if (state !== 'apagada' && heat > 0.3) put(r, x, y, state === 'caliente' ? FRAGUA.grieta.rojo : FRAGUA.grieta.aviso, Math.round((1 - d / 6) ** 1.5 * (state === 'caliente' ? 190 : 110) * heat));
  }
  // caliente: chispitas que saltan de las rajaduras
  if (state === 'caliente') for (let k = 0; k < 5; k++) { const p = paths[k % paths.length], q = p[Math.floor(hash(k, f, 324) * p.length)]; put(r, q[0] + (hash(k, 1, 325) - 0.5) * 4, q[1] - ((f + k) % 6) * 2, k % 2 ? L[5] : L[4]); }
  return r;
}

function cracks(): WorldObject[] {
  const mk = (name: string, v: number): WorldObject => ({
    name, w: 64, h: 64, anchor: [32, 32], solid: null, layer: 'suelo',
    anims: {
      apagada: { frames: [crack(v, 'apagada', 0)], fps: 1, loop: true },
      aviso: { frames: Array.from({ length: 6 }, (_, f) => crack(v, 'aviso', f)), fps: 8, loop: true },
      caliente: { frames: Array.from({ length: 6 }, (_, f) => crack(v, 'caliente', f)), fps: 6, loop: true },
    },
  });
  return [mk('grieta_brasa', 0), ...[0, 1, 2, 3].map((v) => mk(`grieta_brasa_${v}`, v))];
}

// ---------------------------------------------------------------- los fuelles gigantes

/**
 * Fuelle gigante (192 x 160): dos tapas de madera con herrajes, el cuero plegado entre las dos, la boquilla de hierro
 * que apunta a un costado y la cadena gruesa que baja del techo y tira de la tapa de arriba. Va sobre una base de
 * piedra con su caballete de hierro.
 *
 * `quieto` (1), `soplar` (12 cuadros a 10 fps: la tapa baja aplastando el cuero, sale un golpe de aire con brasas por
 * la boquilla y vuelve a inflarse) y `dormido` (1: la fragua apagada, la boca fría y ceniza encima).
 */
function bellows(v: number, squash: number, puff: number, cold: boolean, f: number): Raster {
  const W = 192, H = 160, r = createRaster(W, H);
  const flip = v === 1;
  const X = (x: number) => (flip ? W - 1 - x : x);
  const P = (x: number, y: number, c: string, a = 255) => put(r, X(x), y, c, a);
  const leather = v ? ['#2a1a14', '#3e2a20', '#563c2c', '#6e4e38', '#8a6448'] : FRAGUA.cuero;
  // la base de piedra y el caballete
  for (let y = 128; y < 154; y++) for (let x = 26; x < 170; x++) { const u = (x - 26) / 144; P(x, y, tone(R, 0.75 - u * 0.5 + (y < 131 ? 0.2 : 0) - (y > 150 ? 0.3 : 0) + (hash(x >> 3, y >> 2, 331 + v) - 0.5) * 0.12, x, y)); }
  for (const x0 of [40, 140]) for (let y = 104; y < 130; y++) for (let x = x0; x < x0 + 8; x++) P(x, y, tone(I, 0.7 - (x - x0) / 12, x, y));
  // la bisagra de atrás (izquierda) y las dos tapas: la de abajo fija, la de arriba baja con squash
  const hx = 30, hy = 96, len = 104;
  const topA = (-22 + squash * 16) * (Math.PI / 180), botA = 4 * (Math.PI / 180);
  const board = (ang: number, thick: number, lift: number) => {
    for (let t = 0; t < len; t++) {
      const bx = hx + Math.cos(ang) * t, by = hy + Math.sin(ang) * t - lift;
      const narrow = t > len - 26 ? (t - (len - 26)) / 26 : 0;
      const hw = 30 * (1 - narrow * 0.55);
      for (let k = 0; k < thick; k++) for (let w = -hw; w <= hw; w += 0.5) {
        // la tapa se ve de arriba en perspectiva: el ancho va en diagonal hacia abajo
        const px = bx + w * 0.42, py = by + w * 0.32 + k;
        const l = 0.62 - w / (hw * 3) - k * 0.12 + (Math.abs(w) > hw - 1.5 ? -0.2 : 0) + (hash(Math.round(t / 6), Math.round(w), 332 + v) - 0.5) * 0.12;
        P(px, py, tone(FRAGUA.madera, l, Math.round(px), Math.round(py)));
      }
      // los herrajes: dos bandas de hierro con clavos
      if (t % 42 === 20) for (let w = -hw; w <= hw; w += 0.5) { const px = bx + w * 0.42, py = by + w * 0.32; P(px, py, I[3]); P(px + 1, py, I[2]); if (Math.round(w) % 8 === 0) P(px, py - 1, I[4]); }
    }
  };
  // el cuero plegado entre las tapas: pliegues que se juntan con squash
  const folds = 6;
  for (let t = 6; t < len - 14; t++) {
    const yTop = hy + Math.sin(topA) * t + 10, yBot = hy + Math.sin(botA) * t - 2;
    const xBase = hx + t;
    for (let y = Math.floor(yTop); y < yBot; y++) {
      const u = (y - yTop) / Math.max(1, yBot - yTop);
      const fold = Math.sin(u * folds * Math.PI);
      const l = 0.5 + fold * 0.28 - (t / len) * 0.1 - squash * 0.08;
      P(xBase + fold * (1 + squash * 2), y, tone(leather, l, xBase, y));
    }
  }
  board(botA, 4, -2);
  board(topA, 4, 8);
  // la boquilla de hierro al frente (derecha)
  const nx = hx + len - 4, ny = hy + Math.sin(botA) * len - 2;
  for (let t = 0; t < 24; t++) { const hw = 8 - t * 0.2; for (let w = -hw; w <= hw; w++) P(nx + t, ny + w * 0.6, tone(I, 0.7 - w / (hw * 2.2) - (t > 26 ? 0.2 : 0), nx + t, ny + w)); }
  // la boca de la boquilla: brilla si la fragua está viva
  for (let w = -3; w <= 3; w++) P(nx + 24, ny + w * 0.6, cold ? '#1a1412' : w === 0 ? L[4] : L[3]);
  // la cadena gruesa que tira de la tapa de arriba, hasta el techo
  const cxp = hx + Math.cos(topA) * (len - 30), cyp = hy + Math.sin(topA) * (len - 30) - 10;
  const cr = createRaster(W, H);
  chainLinks(cr, flip ? W - 1 - cxp : cxp, 0, flip ? W - 1 - cxp : cxp, cyp, 4, cold ? 0 : 0.5);
  for (let i = 0; i < W * H; i++) if (cr.data[i * 4 + 3]) for (let c = 0; c < 4; c++) r.data[i * 4 + c] = cr.data[i * 4 + c];
  outline(r, '#0a0606');
  if (!cold) warmRim(r, 0.4);
  else ashDust(r, 0.5, 333 + v);
  // el golpe de aire: un abanico de aire tibio y brasas que salen por la boquilla
  if (puff > 0 && !cold) {
    const ox = nx + 26, oy = ny;
    // la nube de aire caliente (rulos de humo claro) y las brasas que salen disparadas
    for (let i = 0; i < 14; i++) {
      const a = (hash(i, 5, 334) - 0.5) * 0.8, d = (0.25 + hash(i, 6, 334) * 0.75) * puff * 30, rr = 3 + hash(i, 7, 334) * 7 * puff;
      const px = ox + Math.cos(a) * d, py = oy + Math.sin(a) * d * 0.6 - puff * 6;
      for (let yy = -rr; yy <= rr; yy++) for (let xx = -rr; xx <= rr; xx++) if (xx * xx + yy * yy <= rr * rr && px + xx < W - 1) P(px + xx, py + yy, yy < -rr * 0.3 ? '#d8c8b8' : '#a89888', Math.round(130 * (1 - puff * 0.4)));
    }
    for (let i = 0; i < 60; i++) {
      const a = (hash(i, 1, 334) - 0.5) * 1.1, d = (0.2 + hash(i, 2, 334) * 0.8) * puff * 52;
      const px = ox + Math.cos(a) * d, py = oy + Math.sin(a) * d * 0.7 - puff * 8 - hash(i, 3, 334) * 10 * puff;
      if (px >= W - 1) continue;
      P(px, py, i % 3 === 0 ? L[5] : i % 3 === 1 ? L[4] : L[3]);
      if (i % 2) P(px - 1, py, L[3], 200);
    }
  }
  void f;
  return r;
}

function bellowsObjects(): WorldObject[] {
  return [0, 1].map((v) => {
    // soplar: baja (0 a 4), sopla (4 a 8) y se infla (8 a 11)
    const sq = [0, 0.25, 0.55, 0.85, 1, 1, 0.9, 0.75, 0.55, 0.35, 0.18, 0.05];
    const pf = [0, 0, 0, 0.15, 0.45, 0.75, 1, 0.8, 0.5, 0.2, 0, 0];
    const soplar = sq.map((s, f) => bellows(v, s, pf[f], false, f));
    const quieto = bellows(v, 0, 0, false, 0);
    return grounded({
      name: `fuelle_gigante_${v}`, w: 192, h: 160, anchor: [96, 152], solid: [-70, -26, 140, 26],
      anims: { quieto: { frames: [quieto], fps: 1, loop: true }, soplar: { frames: soplar, fps: 10, loop: false }, dormido: { frames: [bellows(v, 0, 0, true, 0)], fps: 1, loop: true } },
    }, quieto, { spread: 4 });
  });
}

// ---------------------------------------------------------------- los braseros

/**
 * Braseros (32 x 64, `idle` 8 cuadros a 8 fps): fuego con luz naranja de radio 180. `apagado`: brasa tibia, sin llama.
 * 0: trípode con la taza honda. 1: columna de hierro alta con la canasta. 2: caldero bajo sobre cuatro patas.
 */
function brazier(v: number, f: number, lit: boolean): Raster {
  const r = createRaster(32, 64), cx = 16;
  const bowlY = v === 1 ? 26 : v === 0 ? 36 : 46;
  // las patas o la columna
  if (v === 0) for (const s of [-1, 0, 1]) line(r, cx + s * 2, bowlY + 4, cx + s * 9, 60, s === 1 ? mixC(I[2], '#ff7020', 0.3) : I[3], 2);
  else if (v === 1) { for (let y = bowlY + 4; y < 58; y++) for (let x = cx - 2; x <= cx + 2; x++) put(r, x, y, tone(I, 0.75 - (x - cx + 2) / 6, x, y)); for (let y = 56; y < 61; y++) for (let x = cx - 7; x <= cx + 7; x++) put(r, x, y, tone(I, 0.7 - (x - cx + 7) / 18 + (y === 56 ? 0.2 : 0), x, y)); for (const y of [36, 46]) for (let x = cx - 3; x <= cx + 3; x++) put(r, x, y, I[4]); }
  else for (const s of [-9, -3, 3, 9]) line(r, cx + s * 0.8, bowlY + 3, cx + s, 60, I[3], 2);
  // la taza (o la canasta de hierro)
  ellipse(r, cx, bowlY, v === 2 ? 13 : 11, 7, (u, vv, x, y) => (vv < -0.2 ? null : tone(I, 0.62 - u * 0.4 - vv * 0.2, x, y)));
  ellipse(r, cx, bowlY - 1, v === 2 ? 12 : 10, 3, (_u, _vv, x, y) => (lit ? tone(L, 0.6 + (hash(x, y + f, 341) - 0.5) * 0.5, x, y) : tone(['#1a0c08', '#3a1a10', '#5a2a18', FRAGUA.apagada], 0.4 + hash(x, y, 342) * 0.5, x, y)));
  if (v === 1) for (let x = cx - 10; x <= cx + 10; x += 4) line(r, x, bowlY - 2, x * 0.9 + cx * 0.1, bowlY + 5, I[2]);
  outline(r, '#0a0606');
  warmRim(r, lit ? 0.55 : 0.2);
  // la llama: tres lenguas que bailan
  if (lit) for (let q = 0; q < 3; q++) {
    const fx = cx - 5 + q * 5, fh = (12 + (q === 1 ? 6 : 0)) * (0.8 + 0.25 * Math.sin(f * 1.7 + q * 2));
    for (let y = 0; y < fh; y++) { const w = (1 - y / fh) * (q === 1 ? 4 : 3); for (let x = -w; x <= w; x++) { const t = y / fh + Math.abs(x) / 8; put(r, fx + x + Math.sin(f * 0.9 + y * 0.4 + q) * (y / fh) * 2, bowlY - 2 - y, t < 0.3 ? L[5] : t < 0.6 ? L[4] : L[3], t > 0.8 ? 200 : 255); } }
  }
  if (lit) { glow(r, cx, bowlY - 8, 14, L[3], 0.9 + 0.1 * Math.sin(f)); for (let k = 0; k < 2; k++) put(r, cx - 4 + hash(k, f, 343) * 8, bowlY - 18 - ((f * 3 + k * 7) % 16), L[4]); }
  else for (let k = 0; k < 3; k++) put(r, cx - 6 + k * 6, bowlY - 2, FRAGUA.apagada);
  return r;
}

function braziers(): WorldObject[] {
  return [0, 1, 2].map((v) => {
    const frames = Array.from({ length: 8 }, (_, f) => brazier(v, f, true));
    return grounded({ name: `brasero_${v}`, w: 32, h: 64, anchor: [16, 60], solid: [-8, -6, 16, 8], light: { color: '#ff8a30', radius: 180, flicker: true, dy: 64 - (v === 1 ? 26 : v === 0 ? 36 : 46) }, anims: { idle: { frames, fps: 8, loop: true }, apagado: { frames: [brazier(v, 0, false)], fps: 1, loop: true } } }, frames[0]);
  });
}

// ---------------------------------------------------------------- la arena: surtidores y palancas

/**
 * Surtidor (64 x 64, capa suelo): una rejilla redonda de hierro en el piso, con escarcha alrededor y el agua fría que
 * se ve abajo. `quieto` (1) y `chorro` (12 cuadros a 12 fps: la rejilla tiembla y sale vapor bajo). El chorro alto es
 * `surtidor_chorro` (64 x 128, 12 cuadros a 12 fps, va encima del surtidor, apoyo abajo al centro).
 */
function ventFrame(f: number, on: boolean): Raster {
  const r = createRaster(64, 64), cx = 32, cy = 34, sh = on && f < 10 ? (f % 2 ? 1 : -1) : 0;
  // la escarcha alrededor
  ellipse(r, cx, cy, 30, 20, (u, v, x, y) => { const d = Math.hypot(u, v) + (hash(x >> 1, y >> 1, 351) - 0.5) * 0.3; return d > 1 || d < 0.72 || hash(x, y, 352) < 0.35 ? null : d > 0.88 ? F[4] : F[3]; }, 210);
  // el aro de piedra y la rejilla de hierro con el agua abajo
  ellipse(r, cx, cy, 22, 14, (u, v, x, y) => tone(R, 0.7 - u * 0.35 - v * 0.25, x, y));
  ellipse(r, cx + sh, cy, 17, 10.5, (u, v, x, y) => {
    const bar = Math.abs(((u + 1) * 4) % 1 - 0.5) > 0.36 || Math.abs(v) > 0.86;
    return bar ? tone(I, 0.65 - u * 0.4, x, y) : tone(F, 0.35 + (on ? 0.25 : 0) + v * 0.1 + Math.sin(u * 6 + f) * 0.08, x, y);
  });
  // vapor bajo
  if (on) for (let i = 0; i < 26; i++) { const a = hash(i, 1, 353) * Math.PI * 2, d = 6 + hash(i, 2, 353 + f) * 22; put(r, cx + Math.cos(a) * d, cy - 4 + Math.sin(a) * d * 0.5 - (f % 4), '#e0f0ff', 120); }
  return r;
}

function ventObjects(): WorldObject[] {
  const chorro = Array.from({ length: 12 }, (_, f) => {
    const r = createRaster(64, 128), cx = 32, t = f / 11;
    // la columna de agua sube rápido (0 a 3), se sostiene y se deshace en vapor (8 a 11)
    const top = 122 - Math.min(1, (f + 1) / 3) * 96, fade = f >= 8 ? (f - 7) / 4 : 0;
    for (let y = Math.floor(top); y < 124; y++) {
      const hw = 7 + (y - top) * 0.02 + Math.sin(y * 0.35 + f * 1.3) * 1.4;
      for (let x = Math.floor(cx - hw); x <= cx + hw; x++) {
        const u = (x - cx) / hw;
        if (hash(x, y + f * 5, 361) < fade * 1.2) continue;
        const streak = Math.sin(x * 1.3 + y * 0.15 - f * 3) > 0.6 ? 0.18 : 0;
        put(r, x, y, tone(F, 0.92 - Math.abs(u) * 0.55 + streak - (u > 0.4 ? 0.15 : 0), x, y, true), Math.round(240 * (1 - fade * 0.5)));
      }
    }
    // las nubes de vapor: bollos blancos que se abren arriba y en la base
    const puffs: [number, number, number][] = [];
    for (let i = 0; i < 9; i++) puffs.push([cx + (hash(i, 1, 362) - 0.5) * (16 + t * 30), top + (hash(i, 2, 362) - 0.3) * 18 - t * 12, 5 + hash(i, 3, 362) * 5 + t * 5]);
    for (let i = 0; i < 5; i++) puffs.push([cx + (hash(i, 4, 362) - 0.5) * 40, 118 - hash(i, 5, 362) * 10 - t * 8, 4 + hash(i, 6, 362) * 4 + t * 3]);
    for (const [px, py, pr] of puffs) for (let y = Math.floor(py - pr); y <= py + pr; y++) for (let x = Math.floor(px - pr); x <= px + pr; x++) {
      const d = Math.hypot(x - px, y - py) / pr;
      if (d > 1 || y < 1 || y > 126) continue;
      put(r, x, y, d < 0.5 && y < py ? '#ffffff' : '#d0e8f6', Math.round((1 - d * 0.35) * 245 * (1 - t * 0.35)));
    }
    // gotas que caen
    for (let i = 0; i < 10; i++) put(r, cx + (hash(i, 4, 363) - 0.5) * 40, top + ((f * 9 + i * 13) % 90), F[4]);
    return r;
  });
  return [
    { name: 'surtidor', w: 64, h: 64, anchor: [32, 34], solid: null, layer: 'suelo', light: { color: F[3], radius: 70, pulse: true, dy: 0 }, anims: { quieto: { frames: [ventFrame(0, false)], fps: 1, loop: true }, chorro: { frames: Array.from({ length: 12 }, (_, f) => ventFrame(f, true)), fps: 12, loop: false } } },
    { name: 'surtidor_chorro', w: 64, h: 128, anchor: [32, 124], solid: null, light: { color: F[4], radius: 200, dy: 60 }, anims: { idle: { frames: chorro, fps: 12, loop: false } } },
  ];
}

/** Palanca (32 x 48): caja de hierro con el caño frío, la palanca con mango de madera. `arriba` (1) y `tirar` (8 a 10 fps). */
function lever(a: number, f: number): Raster {
  const r = createRaster(32, 48), cx = 16;
  // el caño frío que sale de la caja y se mete al piso, con escarcha
  for (let y = 30; y < 44; y++) for (let x = 22; x < 27; x++) put(r, x, y, tone(['#2a4a60', '#3a6a88', '#5a8aa8', '#8ab8d0'], 0.7 - (x - 22) / 6, x, y));
  // la caja
  for (let y = 28; y < 45; y++) for (let x = 6; x < 24; x++) put(r, x, y, tone(I, 0.7 - (x - 6) / 30 - (y > 42 ? 0.25 : 0) + (y < 30 ? 0.2 : 0), x, y));
  for (const [x, y] of [[8, 30], [21, 30], [8, 42], [21, 42]]) put(r, x, y, I[4]);
  // el reloj de presión con su aguja (sube cuando se tira)
  ellipse(r, 12, 36, 3, 3, (u, v) => (u * u + v * v > 0.6 ? I[4] : '#e8e0d0'));
  line(r, 12, 36, 12 + Math.cos(-2.4 + a * 2) * 2.4, 36 + Math.sin(-2.4 + a * 2) * 2.4, '#c02010');
  // la palanca: gira sobre la caja, de arriba-atrás a abajo-adelante
  const ang = (-110 + a * 110) * (Math.PI / 180), px = cx + 2, py = 28;
  const ex = px + Math.cos(ang) * 20, ey = py + Math.sin(ang) * 20;
  line(r, px, py, ex, ey, I[3], 2);
  for (let t = 0; t < 6; t++) put(r, ex + Math.cos(ang) * t, ey + Math.sin(ang) * t, t < 2 ? FRAGUA.madera[4] : FRAGUA.madera[3]), put(r, ex + Math.cos(ang) * t + 1, ey + Math.sin(ang) * t, FRAGUA.madera[2]);
  ellipse(r, px, py, 2.4, 2.4, () => I[4]);
  outline(r, '#0a0606');
  warmRim(r, 0.35);
  frost(r, 0.25, 371);
  // el vapor que sale del caño al tirar
  if (a > 0.7) for (let i = 0; i < 14; i++) put(r, 25 + hash(i, f, 372) * 6, 30 - hash(f, i, 373) * 18 * a, '#e8f4ff', 150);
  return r;
}

function leverObject(): WorldObject {
  const tirar = [0, 0.1, 0.3, 0.6, 0.85, 1, 1, 1].map((a, f) => lever(a, f));
  return grounded({ name: 'palanca', w: 32, h: 48, anchor: [16, 44], solid: [-10, -6, 20, 6], anims: { arriba: { frames: [lever(0, 0)], fps: 1, loop: true }, tirar: { frames: tirar, fps: 10, loop: false } } }, tirar[0]);
}

/** Cadena de la Dragona (32 x 32, capa suelo): eslabones gruesos de hierro tirados en el piso, a lo largo (se repite en x). */
function dragonChain(): WorldObject {
  const r = createRaster(32, 32);
  for (let k = 0; k < 2; k++) {
    const cx = 8 + k * 16;
    if (k === 0) ellipse(r, cx, 16, 9, 6, (u, v, x, y) => (u * u + v * v < 0.35 ? null : tone(I, 0.7 - u * 0.3 - v * 0.35, x, y)));
    else { for (let x = cx - 9; x <= cx + 9; x++) for (let y = 14; y <= 18; y++) put(r, x, y, tone(I, (y === 14 ? 0.85 : 0.55) - (y - 14) * 0.08, x, y)); }
  }
  outline(r, '#0a0606');
  warmRim(r, 0.4);
  // óxido
  for (let i = 0; i < 18; i++) put(r, 2 + hash(i, 1, 381) * 28, 11 + hash(i, 2, 381) * 10, FRAGUA.oxido, 180);
  // la sombrita de contacto abajo de la cadena
  for (let x = 1; x < 31; x++) if (!r.data[(23 * 32 + x) * 4 + 3]) put(r, x, 23, '#000000', 90);
  return { name: 'cadena_dragona', w: 32, h: 32, anchor: [16, 16], solid: null, layer: 'suelo', anims: one(r) };
}

// ---------------------------------------------------------------- la Puerta Negra y la boca del horno

/**
 * La Puerta Negra (256 x 256): un marco de hierro enorme metido en la roca, con remaches, bandas y un dintel con
 * cadenas cruzadas. Adentro, negro de verdad. Del piso de la puerta sale un frío celeste muy bajito. Sin ojos ni
 * caras: solo oscuridad. `cerrada` (1) y `latido` (4 cuadros a 2 fps: el negro de adentro respira apenas).
 */
function blackDoor(f: number): Raster {
  const W = 256, H = 256, r = createRaster(W, H), cx = 128;
  // la roca alrededor (la montaña), que se pierde hacia arriba
  for (let y = 0; y < 250; y++) for (let x = 0; x < W; x++) {
    const u = Math.abs(x - cx) / 128, top = 30 + Math.pow(u, 1.5) * 90 + (hash(x >> 3, 0, 391) - 0.5) * 16;
    if (y < top) continue;
    const l = 0.38 + (hash(x >> 3, y >> 3, 392) - 0.5) * 0.18 - (y - top < 6 ? -0.15 : 0) - (x - cx) / 900;
    put(r, x, y, tone(O, l, x, y));
  }
  // el hueco: un arco alto (de 120 de ancho) con el negro adentro
  const inside = (x: number, y: number) => { const dx = Math.abs(x + 0.5 - cx); return y > 96 ? dx < 60 && y < 250 : Math.hypot(dx, (y - 96) * 1.3) < 60; };
  const breathe = [0, 1, 2, 1][f];
  for (let y = 40; y < 250; y++) for (let x = 60; x < 196; x++) {
    if (!inside(x, y)) continue;
    // negro de verdad; solo el borde de adentro tiene un violeta casi negro que respira
    const dx = 60 - Math.abs(x + 0.5 - cx), dy = y > 96 ? 999 : 60 - Math.hypot(Math.abs(x + 0.5 - cx), (y - 96) * 1.3), e = Math.min(dx, dy);
    put(r, x, y, e < 3 + breathe ? '#0c0812' : e < 6 + breathe * 1.5 ? '#06040a' : '#000000');
  }
  // el marco de hierro: jambas y arco con bandas y remaches
  for (let y = 36; y < 250; y++) for (let x = 50; x < 206; x++) {
    if (inside(x, y)) continue;
    const dx = Math.abs(x + 0.5 - cx);
    const inFrame = y > 96 ? dx < 72 : Math.hypot(dx, (y - 96) * 1.3) < 72;
    if (!inFrame) continue;
    const d = y > 96 ? 72 - dx : 72 - Math.hypot(dx, (y - 96) * 1.3);
    let l = 0.5 + (d < 2 ? 0.25 : d > 10 ? -0.2 : 0) - (x - cx) / 400;
    const band = y > 96 && (y - 100) % 34 < 4;
    if (band) l += 0.15;
    put(r, x, y, tone(I, l, x, y));
    if (band && (x % 8 === 3) && d > 3 && d < 10) put(r, x, y - 1, I[4]);
  }
  // el dintel: una viga de hierro con dos cadenas cruzadas y un candado enorme apagado
  for (let y = 22; y < 36; y++) for (let x = 40; x < 216; x++) put(r, x, y, tone(I, 0.62 - (y - 22) / 30 + (y < 24 ? 0.2 : 0) - (x - cx) / 500, x, y));
  for (let x = 44; x < 214; x += 10) put(r, x, 28, I[4]);
  chainLinks(r, 46, 40, 210, 150, 4, 0.3);
  chainLinks(r, 210, 40, 46, 150, 4, 0.3);
  for (let y = 84; y < 104; y++) for (let x = 116; x < 140; x++) put(r, x, y, tone(I, 0.6 - (x - 116) / 40 + (y < 86 ? 0.2 : 0), x, y));
  for (let t = 0; t < Math.PI; t += 0.08) put(r, cx + Math.cos(t) * 8, 84 - Math.sin(t) * 9, I[3]);
  put(r, cx, 93, '#000000'); put(r, cx, 94, '#000000'); put(r, cx, 95, '#000000');
  // el umbral de piedra
  for (let y = 238; y < 250; y++) for (let x = 44; x < 212; x++) put(r, x, y, tone(R, 0.6 - (x - 44) / 400 + (y < 241 ? 0.25 : 0), x, y));
  outline(r, '#000000');
  // el frío que sale por abajo: jirones celestes bajitos sobre el umbral (respiran con el latido)
  for (let i = 0; i < 60; i++) {
    const x = 72 + hash(i, 1, 393) * 112 + Math.sin(i + f) * 2, y = 236 - hash(i, 2, 393) * (8 + breathe * 3);
    put(r, x, y, hash(i, 3, 393) > 0.5 ? '#9ad8ff' : '#5a8ab0', Math.round(60 + hash(i, 4, 393) * 70));
  }
  return r;
}

function blackDoorObject(): WorldObject {
  const lat = [0, 1, 2, 3].map(blackDoor);
  return grounded({ name: 'puerta_negra', w: 256, h: 256, anchor: [128, 249], solid: [-112, -40, 224, 40], light: { color: '#5a8ab0', radius: 90, dy: 12 }, anims: { cerrada: { frames: [lat[0]], fps: 1, loop: true }, latido: { frames: lat, fps: 2, loop: true } } }, lat[0], { spread: 6 });
}

/**
 * La boca del horno (256 x 192): una bóveda de ladrillo refractario negro con un arco enorme, adentro el fuego que
 * ruge y se mueve (6 cuadros a 8 fps), y la lengua de lava que sale al piso. `apagado`: el fuego hecho brasa tibia.
 */
function furnace(f: number, lit: boolean): Raster {
  const W = 256, H = 192, r = createRaster(W, H), cx = 128;
  // la bóveda: una cúpula de ladrillos oscuros
  for (let y = 0; y < 186; y++) for (let x = 0; x < W; x++) {
    const u = (x - cx) / 128, top = 20 + u * u * 80;
    if (y < top) continue;
    const row = Math.floor(y / 8), off = row % 2 ? 9 : 0, joint = y % 8 === 0 || (x + off) % 18 === 0;
    const heat = lit ? Math.max(0, 1 - Math.hypot((x - cx) / 90, (y - 150) / 70)) : 0;
    let c = joint ? R[0] : tone(R, 0.45 + (hash((x + off) / 18 | 0, row, 401) - 0.5) * 0.25 - u * 0.15, x, y);
    if (heat > 0.2 && !joint) c = mixC(c, L[1], heat * 0.6);
    put(r, x, y, c);
  }
  // el arco de la boca
  const mouth = (x: number, y: number) => { const dx = Math.abs(x + 0.5 - cx); return y > 120 ? dx < 70 && y < 186 : Math.hypot(dx, (y - 120) * 1.4) < 70; };
  for (let y = 60; y < 186; y++) for (let x = 50; x < 206; x++) {
    if (!mouth(x, y)) continue;
    if (!lit) { put(r, x, y, tone(['#0a0404', '#1a0a06', '#2a120a', '#4a2010', FRAGUA.apagada], 0.2 + (y - 60) / 200 + (hash(x >> 2, y >> 2, 402) - 0.5) * 0.3, x, y)); continue; }
    // el fuego: lenguas que suben y se mueven con el cuadro
    const t = (186 - y) / 126, wv = Math.sin(x * 0.11 + f * 1.05) * 0.18 + Math.sin(x * 0.27 - f * 1.6) * 0.1;
    const l = 1 - t * 0.9 + wv + (hash(x >> 1, (y + f * 6) >> 2, 403) - 0.5) * 0.25;
    put(r, x, y, tone(L, l, x, y, true));
  }
  // el arco de ladrillos alrededor de la boca, más claros
  for (let y = 40; y < 186; y++) for (let x = 40; x < 216; x++) {
    if (mouth(x, y)) continue;
    const dx = Math.abs(x + 0.5 - cx), d = y > 120 ? dx - 70 : Math.hypot(dx, (y - 120) * 1.4) - 70;
    if (d < 0 || d > 12) continue;
    const seg = Math.floor(Math.atan2(y - 120, x - cx) * 6);
    put(r, x, y, d < 1 || (y < 120 && Math.abs(Math.atan2(y - 120, x - cx) * 6 - seg) < 0.08) ? R[0] : tone(R, 0.75 - d / 30 + (lit ? 0.1 : 0), x, y));
  }
  outline(r, '#000000');
  if (lit) { warmRim(r, 0.5, L[3]); for (let k = 0; k < 10; k++) put(r, cx - 50 + hash(k, 1, 404) * 100, 120 - ((f * 11 + k * 17) % 70), k % 2 ? L[5] : L[4]); }
  return r;
}

function furnaceObject(): WorldObject {
  const frames = Array.from({ length: 6 }, (_, f) => furnace(f, true));
  return grounded({ name: 'boca_horno', w: 256, h: 192, anchor: [128, 184], solid: [-120, -36, 240, 36], light: { color: '#ff7020', radius: 360, flicker: true, dy: 50 }, anims: { idle: { frames, fps: 8, loop: true }, apagado: { frames: [furnace(0, false)], fps: 1, loop: true } } }, frames[0], { spread: 6 });
}

export function fraguaObjectsA(): WorldObject[] {
  return [
    coldFountainObject(), coldPuddle(), ...cageObjects(), ...freeLights(), ...cracks(), ...bellowsObjects(), ...braziers(), ...ventObjects(), leverObject(), dragonChain(), blackDoorObject(), furnaceObject(),
  ];
}

export { one, grounded, ellipse, line, frost };
export type { Anim };
