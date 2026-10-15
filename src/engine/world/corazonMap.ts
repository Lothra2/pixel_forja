import { createRaster, type Raster } from '../core/raster';
import { TILE } from './tiles';
import { distTo, type PaintedTerrain, type TP } from './paint';
import { hash } from './puertoObjects';
import { corazonObjectsA, HIELO, crackDist } from './corazonObjects';
import { corazonObjectsB, AGUA_HELADA } from './corazonObjectsB';
import { forestObjects, type WorldObject } from './objects';
import { landmarkObjects } from './landmarks';
import { premiumPortals } from './portales';
import { footprint, CELL } from './premium/placer';
import type { BigMap, Deco, Ent, MapZone, Postal, Prop } from './bosqueMap';

/**
 * Mundo 7: El Corazón Helado (encargo F13, parte 1). Detrás de la Puerta Negra el fondo del abismo está congelado:
 * un lago de hielo negro con gigantes adentro mirando hacia arriba, columnas de hielo, cadenas con escarcha, una
 * ventisca que nunca para y, al final, el trono del Diablo, mitad hielo y mitad brasa, frente al vacío.
 *
 * El camino principal:
 *
 *   La Escalera Helada > El Bosque de Escarcha > La Ciudadela Congelada > El Puente de las Cadenas > La Puerta del
 *   Trono > El Corazón Helado
 *
 * Ramas que vuelven al camino: El Lago de los Gigantes (de la escalera a la ciudadela, con la Reina Escarcha), Las
 * Catacumbas de Hielo (del lago a la ciudadela, con el mural 7) y El Puente Viejo (del bosque a la primera isla del
 * puente, por el oeste). Secretos para el olfato de Thor: La Guarida del Lobo (en el bosque) y La Cripta Sellada (en
 * las catacumbas).
 *
 * La capa `agua` es el agua negra helada de los agujeros del lago (no se camina). El vacío del puente y del corazón es
 * transparente: abajo va el abismo lejano (`fondo_hielo_lejos_*`).
 */

export const CORAZON_W = 120;
export const CORAZON_H = 110;

/** Tipos de cuadro del diseño. */
const ROCK = 0, SNOW = 1, ICE = 2, STONE = 3, CATA = 4, CHAINB = 5, STAIRS = 6, VOID = 7, WATER = 8, ARENA = 9, GATE = 10;
const SOLIDS = new Set([ROCK, VOID, WATER]);

/** Lugares (en cuadros). */
export const LC = {
  portal: [15, 5] as TP,
  lago: [56, 18] as TP,
  reina: [72, 23] as TP,
  mural: [100, 8] as TP,
  guarida: [5, 65] as TP,
  cripta: [115, 33] as TP,
  guardian: [75, 92] as TP,
  arena: [101, 88] as TP,
  trono: [101, 78] as TP,
};

/** La arena del Diablo: radio 256 y los cuatro braseros de hueso a unos 170 px del centro. */
export const ARENA_DIABLO = { radio: 256, brasero: 170 };

type Rect = [number, number, number, number];
/** Las piezas (rectángulos en cuadros, x0 y0 x1 y1 sin incluir el final), en orden: lo de después pisa. */
const PIEZAS: [number, Rect][] = [
  // ---------- 1. La Escalera Helada: la llegada arriba, la escalera de hielo y el descanso; al oeste, el vacío ----------
  [VOID, [2, 2, 7, 31]],
  [STONE, [8, 3, 24, 10]],
  [STAIRS, [12, 10, 20, 17]],
  [SNOW, [7, 17, 27, 33]],
  // ---------- 2. El Lago de los Gigantes: la orilla de nieve (el lago de hielo negro se arma aparte) ----------
  [SNOW, [29, 3, 83, 33]],
  // ---------- 3. Las Catacumbas de Hielo: pasillos en la roca y criptas ----------
  [CATA, [84, 8, 117, 11]], [CATA, [86, 20, 117, 23]], [CATA, [86, 32, 111, 35]],
  [CATA, [88, 8, 91, 35]], [CATA, [101, 8, 104, 35]], [CATA, [113, 8, 116, 26]],
  [CATA, [93, 13, 100, 19]], [CATA, [105, 25, 116, 31]], [CATA, [92, 25, 100, 31]], [CATA, [105, 13, 112, 18]],
  [CATA, [91, 15, 93, 18]], [CATA, [91, 26, 92, 29]], [CATA, [100, 27, 101, 29]],
  // ---------- 4. El Bosque de Escarcha ----------
  [SNOW, [3, 36, 39, 69]],
  // ---------- 5. La Ciudadela Congelada: la nieve, el patio de piedra y las torres en ruinas ----------
  [SNOW, [41, 36, 83, 69]],
  [STONE, [47, 41, 77, 65]],
  [ROCK, [43, 38, 47, 42]], [ROCK, [77, 38, 81, 42]], [ROCK, [43, 64, 47, 68]], [ROCK, [77, 64, 81, 68]],
  [ROCK, [52, 44, 54, 50]], [ROCK, [70, 44, 72, 50]], [ROCK, [52, 57, 54, 62]], [ROCK, [70, 57, 72, 62]],
  // ---------- 6. El Puente de las Cadenas: el vacío, el desembarco del oeste, las islas y el puente largo ----------
  [VOID, [2, 72, 66, 108]],
  [CHAINB, [16, 79, 25, 83]], [CHAINB, [34, 79, 43, 83]], [CHAINB, [55, 79, 66, 83]],
  [CHAINB, [28, 89, 32, 95]],
  // ---------- 7. La Puerta del Trono: el patio del Guardián ----------
  [GATE, [66, 72, 83, 106]],
  [ROCK, [66, 72, 68, 78]], [ROCK, [66, 84, 68, 106]],
  // ---------- 8. El Corazón Helado: el vacío al norte, el piso de hielo negro con brasas y la arena ----------
  [VOID, [84, 40, 118, 63]],
  [ARENA, [86, 63, 117, 106]],
  // ---------- las paredes entre zonas, con sus pasos ----------
  [ROCK, [27, 2, 29, 34]], [SNOW, [27, 20, 29, 25]],
  [ROCK, [83, 2, 84, 40]], [ROCK, [82, 2, 84, 34]], [CATA, [82, 8, 84, 12]],
  [ROCK, [2, 33, 84, 36]], [SNOW, [11, 33, 15, 36]], [SNOW, [50, 33, 55, 36]], [CATA, [80, 34, 88, 37]], [CATA, [86, 34, 88, 35]],
  [ROCK, [39, 34, 41, 70]], [SNOW, [39, 48, 41, 53]],
  [ROCK, [2, 69, 84, 72]], [SNOW, [8, 69, 12, 73]], [CHAINB, [47, 69, 51, 74]],
  [ROCK, [83, 63, 86, 108]], [GATE, [83, 88, 87, 94]],
  // los secretos: la guarida del lobo (rincón del bosque) y la cripta sellada (al fondo de las catacumbas)
  [ROCK, [3, 61, 9, 62]], [ROCK, [9, 61, 10, 69]], [SNOW, [9, 64, 10, 65]],
  [ROCK, [105, 31, 118, 32]], [CATA, [112, 32, 118, 36]], [ROCK, [111, 32, 112, 36]], [CATA, [111, 33, 112, 34]],
];

/** Las zonas: [x0, y0, x1, y1] en cuadros, con sus propiedades y su primer plano. */
const ZONAS: { nombre: string; rect: Rect; props: Record<string, Prop>; frente: string[] }[] = [
  { nombre: 'La Escalera Helada', rect: [2, 2, 28, 34], props: { luz: '#9ab8d8', oscuridad: 0.9, niebla: 0.4, particulas: 'nieve', ambiente: 'hielo' }, frente: ['carambanos_frente_0', 'nieve_frente_0'] },
  { nombre: 'El Lago de los Gigantes', rect: [28, 2, 83, 34], props: { luz: '#9ab8d8', oscuridad: 0.95, niebla: 0.45, particulas: 'nieve', ambiente: 'lago', musica_pelea: 'reina_escarcha' }, frente: ['nieve_frente_1', 'carambanos_frente_1'] },
  { nombre: 'Las Catacumbas de Hielo', rect: [83, 2, 118, 40], props: { luz: '#6a8aac', oscuridad: 0.97, niebla: 0.6, particulas: 'ceniza', ambiente: 'catacumbas' }, frente: ['carambanos_frente_0', 'cadena_helada_1'] },
  { nombre: 'El Bosque de Escarcha', rect: [2, 34, 40, 70], props: { luz: '#9ab8d8', oscuridad: 0.95, niebla: 0.55, particulas: 'nieve', ambiente: 'bosque_hielo' }, frente: ['nieve_frente_0', 'cadena_helada_0'] },
  { nombre: 'La Ciudadela Congelada', rect: [40, 34, 83, 70], props: { luz: '#9ab8d8', oscuridad: 0.95, niebla: 0.5, particulas: 'nieve', ambiente: 'ciudadela' }, frente: ['cadena_helada_2', 'nieve_frente_1'] },
  { nombre: 'El Puente de las Cadenas', rect: [2, 70, 66, 108], props: { luz: '#b8d0ea', oscuridad: 0.95, niebla: 0.65, particulas: 'ventisca', ambiente: 'puente', ventisca: 'siempre' }, frente: ['nieve_frente_0', 'cadena_helada_0'] },
  { nombre: 'La Puerta del Trono', rect: [66, 70, 84, 108], props: { luz: '#ff5a3a', oscuridad: 0.95, niebla: 0.45, particulas: 'ceniza', ambiente: 'puerta', musica_pelea: 'guardian' }, frente: ['cadena_helada_1', 'carambanos_frente_1'] },
  { nombre: 'El Corazón Helado', rect: [84, 40, 118, 108], props: { luz: '#ff3a20', oscuridad: 0.95, niebla: 0.35, particulas: 'ceniza', ambiente: 'trono', musica: 'diablo_1', musica_fases: 'diablo_1,diablo_2,diablo_3,diablo_final' }, frente: ['cadena_helada_2', 'nieve_frente_1'] },
];

/** El lago: una elipse grande de hielo negro, con agujeros de agua negra y un claro para la Reina. */
function lakeShape(x: number, y: number): number {
  const [lx, ly] = LC.lago;
  const d = Math.hypot((x + 0.5 - lx) / 24, (y + 0.5 - ly) / 13.5) + (hash(Math.floor(x / 3), Math.floor(y / 3), 901) - 0.5) * 0.12;
  return d;
}
const ISLAS: [number, number, number, number][] = [[9.5, 78, 7, 7], [29.5, 81.5, 5.2, 8.2], [49, 81, 6.6, 8.6], [30, 100, 7, 5.6]];
const HOLES: [number, number, number, number][] = [[42, 12, 2.8, 1.9], [64, 9, 3, 1.7], [49, 25, 2.4, 1.7], [67, 28, 2, 1.5], [58, 13, 1.9, 1.5]];

function makeDesign(): Uint8Array {
  const W = CORAZON_W, H = CORAZON_H, t = new Uint8Array(W * H).fill(ROCK);
  for (const [v, [x0, y0, x1, y1]] of PIEZAS) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (x >= 0 && y >= 0 && x < W && y < H) t[y * W + x] = v;
  // el lago de hielo negro y sus agujeros de agua
  for (let y = 3; y < 33; y++) for (let x = 29; x < 83; x++) {
    if (t[y * W + x] !== SNOW) continue;
    if (lakeShape(x, y) < 1) t[y * W + x] = ICE;
    for (const [hx, hy, rx, ry] of HOLES) if (Math.hypot((x + 0.5 - hx) / rx, (y + 0.5 - hy) / ry) < 1) t[y * W + x] = WATER;
  }
  // las islas del puente: redondas y quebradas (el desembarco del oeste, la isla de las columnas, la de la hoguera y la de abajo)
  for (const [ix, iy, rx, ry] of ISLAS) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (Math.hypot((x + 0.5 - ix) / rx, (y + 0.5 - iy) / ry) + (hash(x, y, 905) - 0.5) * 0.12 < 1 && t[y * W + x] === VOID) t[y * W + x] = SNOW;
  }
  // el claro de la Reina: hielo firme alrededor (sin agujeros)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.hypot(x - LC.reina[0], y - LC.reina[1]) < 4.5 && t[y * W + x] === WATER) t[y * W + x] = ICE;
  organic(t, W, H, 707);
  // el borde del mapa es roca (o vacío)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x < 2 || y < 2 || x >= W - 2 || y >= H - 1) t[y * W + x] = t[y * W + x] === VOID ? VOID : ROCK;
  return t;
}

/**
 * La cueva no es de cajitas: las esquinas de las salas se redondean y las paredes hacen bultos. Nunca se toca un paso
 * entre paredes, un puente, la escalera, la arena, el patio, las catacumbas ni los secretos.
 */
function organic(t: Uint8Array, W: number, H: number, seed: number) {
  const walk = (v: number) => v === SNOW || v === ICE;
  const T = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? ROCK : t[y * W + x]);
  const prot = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = T(x, y), k = y * W + x;
    const side = (dx: number, dy: number) => { for (let r = 1; r <= 5; r++) if (T(x + dx * r, y + dy * r) === ROCK) return true; return false; };
    if (walk(v) && ((side(-1, 0) && side(1, 0)) || (side(0, -1) && side(0, 1)))) prot[k] = 1;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const q = T(x + dx, y + dy); if (q === CHAINB || q === STAIRS || q === STONE || q === CATA || q === VOID || q === GATE) prot[k] = 1; }
    if (x < 11 && y > 59 && y < 70) prot[k] = 1;
    if (Math.hypot(x - LC.portal[0], y - LC.portal[1]) < 4) prot[k] = 1;
  }
  const o = Uint8Array.from(t);
  const O = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? ROCK : o[y * W + x]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x, v = o[k];
    if (prot[k] || !walk(v)) continue;
    let rock = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (O(x + dx, y + dy) === ROCK) rock++;
    const n4r = [O(x - 1, y), O(x + 1, y), O(x, y - 1), O(x, y + 1)].filter((q) => q === ROCK).length;
    if (rock >= 13 || (n4r && vnoise(x * TILE, y * TILE, 96, seed) > 0.58)) t[k] = ROCK;
  }
}

/** Ruido de valor suave. */
function vnoise(x: number, y: number, cell: number, seed: number): number {
  const gx = x / cell, gy = y / cell, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0, seed), b = hash(x0 + 1, y0, seed), c = hash(x0, y0 + 1, seed), d = hash(x0 + 1, y0 + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

const RGB = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const PH = HIELO.hielo.map(RGB), PE = HIELO.escarcha.map(RGB), PN = HIELO.nieve.map(RGB), PR = HIELO.roca.map(RGB), PB = HIELO.brasa.map(RGB), PG = HIELO.gigante.map(RGB), PF = HIELO.hierro.map(RGB);
const PS = ['#1a1e28', '#262c38', '#343c4a', '#46505e', '#5a6676'].map(RGB);
const pick = (pal: number[][], l: number) => pal[Math.max(0, Math.min(pal.length - 1, Math.round(l * (pal.length - 1))))];

/** Gigantes debajo del hielo del lago: dónde están (pixeles) y hacia dónde mira la cara. */
const UNDER: { x: number; y: number; s: number; a: number }[] = [
  { x: 54 * TILE, y: 20 * TILE, s: 1, a: 0.3 }, { x: 62 * TILE, y: 16 * TILE, s: 0.75, a: -0.6 }, { x: 44 * TILE, y: 18 * TILE, s: 0.6, a: 1.2 }, { x: 74 * TILE, y: 17 * TILE, s: 0.7, a: 2.6 },
];

/**
 * El pintor del piso: nieve sucia con rayas de viento y motas de ceniza (la nieve negra), el hielo negro del lago con
 * grietas claras por dentro y los gigantes que se ven abajo mirando hacia arriba, las losas de la ciudadela con nieve
 * en las juntas, las baldosas de las catacumbas, la escalera de hielo, los puentes de tablas heladas sobre cadenas, el
 * piso del corazón (hielo negro con brasas en las grietas y el círculo de la arena tallado), la roca con su cara al
 * sur y el filo de escarcha, el agua negra transparente (abajo va la capa de agua) y el vacío transparente.
 */
function paintCorazon(t: Uint8Array, seed: number): PaintedTerrain {
  const W = CORAZON_W, H = CORAZON_H, PWX = W * TILE, PHX = H * TILE, N = PWX * PHX;
  const img = createRaster(PWX, PHX);
  const kind = new Uint8Array(N), high = new Uint8Array(N);
  const T = (tx: number, ty: number) => (tx < 0 || ty < 0 || tx >= W || ty >= H ? ROCK : t[ty * W + tx]);
  // por pixel: 0 piso, 1 roca, 2 agua, 3 vacío. La roca tiene el borde quebrado con ruido
  const cls = new Uint8Array(N), own = new Uint8Array(N);
  for (let y = 0; y < PHX; y++) for (let x = 0; x < PWX; x++) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE), i = y * PWX + x;
    let v = T(tx, ty);
    const nz = (vnoise(x, y, 18, seed + 1) - 0.5) * 20;
    const jx = Math.floor((x + nz) / TILE), jy = Math.floor((y - nz * 0.6) / TILE), w2 = T(jx, jy);
    if (v !== ROCK && v !== WATER && v !== VOID && w2 === ROCK && v !== CHAINB && v !== STAIRS) v = ROCK;
    else if (v === ROCK && w2 !== ROCK && w2 !== VOID && w2 !== WATER) v = w2;
    else if (v === WATER && w2 !== WATER && w2 !== ROCK && w2 !== VOID) v = w2;
    // el lago tiene la orilla curva (por pixel, no por cuadro) y los agujeros de agua son redondos
    if (v === SNOW || v === ICE) {
      const dd = Math.hypot((x / TILE - LC.lago[0]) / 24, (y / TILE - LC.lago[1]) / 13.5) + (vnoise(x, y, 40, seed + 2) - 0.5) * 0.14;
      if (tx > 28 && tx < 83 && ty > 2 && ty < 33) v = dd < 1 ? (T(tx, ty) === ICE || dd < 0.94 ? ICE : SNOW) : T(tx, ty) === ICE && dd < 1.06 ? ICE : v === ICE && dd >= 1.06 ? SNOW : v;
    }
    if (v === WATER) {
      let inHole = false;
      for (const [hx, hy, rx, ry] of HOLES) if (Math.hypot((x / TILE - hx) / rx, (y / TILE - hy) / ry) + (vnoise(x, y, 14, seed + 3) - 0.5) * 0.3 < 0.8) inHole = true;
      if (!inHole) v = ICE;
    }
    own[i] = v;
    cls[i] = v === VOID ? 3 : v === WATER ? 2 : v === ROCK ? 1 : 0;
  }
  const below = new Uint16Array(N).fill(999);
  for (let x = 0; x < PWX; x++) { let run = 999; for (let y = PHX - 1; y >= 0; y--) { const i = y * PWX + x; if (cls[i] !== 1) run = 0; else run = Math.min(999, run + 1); below[i] = run; } }
  const ledge = new Uint16Array(N).fill(999);
  for (let x = 0; x < PWX; x++) { let run = 999; for (let y = 0; y < PHX; y++) { const i = y * PWX + x; if (cls[i] <= 1) run = 0; else if (cls[i] === 3) run = Math.min(999, run + 1); else run = 999; ledge[i] = run; } }
  const voidM = new Uint8Array(N), rockM = new Uint8Array(N), waterM = new Uint8Array(N);
  for (let i = 0; i < N; i++) { voidM[i] = cls[i] === 3 ? 1 : 0; rockM[i] = cls[i] === 1 ? 1 : 0; waterM[i] = cls[i] === 2 ? 1 : 0; }
  const dVoid = distTo(voidM, PWX, PHX), dRock = distTo(rockM, PWX, PHX), dWater = distTo(waterM, PWX, PHX);
  const set = (i: number, c: number[], a = 255) => { img.data[i * 4] = c[0]; img.data[i * 4 + 1] = c[1]; img.data[i * 4 + 2] = c[2]; img.data[i * 4 + 3] = a; };
  const mix = (p: number[], q: number[], k: number) => p.map((v, j) => Math.round(v + (q[j] - v) * Math.max(0, Math.min(1, k))));
  const FACE = 44, LEDGE = 40;
  const [acx, acy] = [(LC.arena[0] + 0.5) * TILE, (LC.arena[1] + 0.5) * TILE];
  // hacia dónde corre cada puente: el tramo más largo de cuadros de puente que pasa por el cuadro
  const horizB = new Uint8Array(W * H);
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    if (T(tx, ty) !== CHAINB) continue;
    let h = 1, v = 1;
    for (let k = 1; T(tx - k, ty) === CHAINB; k++) h++;
    for (let k = 1; T(tx + k, ty) === CHAINB; k++) h++;
    for (let k = 1; T(tx, ty - k) === CHAINB; k++) v++;
    for (let k = 1; T(tx, ty + k) === CHAINB; k++) v++;
    horizB[ty * W + tx] = h >= v ? 1 : 0;
  }
  for (let y = 0; y < PHX; y++) for (let x = 0; x < PWX; x++) {
    const i = y * PWX + x, v = own[i];
    // ---------- la roca: hielo negro y piedra, con la cara al sur en estratos y el filo de escarcha arriba ----------
    if (cls[i] === 1) {
      high[i] = 1;
      const b = below[i];
      if (b <= FACE) {
        kind[i] = 3;
        const strata = Math.floor((y + vnoise(x, 0, 40, seed + 6) * 16 + x * 0.12) / 8);
        let l = 0.55 + (hash(strata, x >> 4, seed + 7) - 0.5) * 0.22 - (1 - b / FACE) * 0.32;
        if ((y + Math.floor(vnoise(x, 0, 40, seed + 6) * 16)) % 8 === 0) l -= 0.2;
        let c = pick(PH, l);
        // carámbanos que cuelgan de la cara (rayas claras verticales que se afinan)
        const ic = hash(x >> 1, 0, seed + 8);
        if (ic > 0.86 && b > FACE - 2 - ic * 18) c = mix(c, PE[1], 0.6);
        if (b <= 2) c = [4, 6, 10];
        set(i, c);
      } else {
        kind[i] = 6;
        const n = vnoise(x, y, 9, seed + 11);
        let c = n > 0.72 ? PR[2] : n < 0.2 ? PR[0] : PR[1];
        if (b - FACE <= 2) c = PE[2]; else if (b - FACE <= 5) c = PN[3];
        else if (hash(x >> 2, y >> 2, seed + 12) > 0.97) c = PN[1];
        set(i, c);
      }
      continue;
    }
    // ---------- el agua negra: transparente (abajo va la capa de agua) ----------
    if (cls[i] === 2) { kind[i] = 4; set(i, [0, 0, 0], 0); continue; }
    // ---------- el vacío: transparente; arriba la cara de la roca que baja con escarcha ----------
    if (cls[i] === 3) {
      kind[i] = 6;
      const l0 = ledge[i];
      if (l0 <= LEDGE) {
        const row = Math.floor(l0 / 9), off = row % 2 ? 9 : 0, joint = l0 % 9 === 0 || (x + off) % 18 === 0;
        const k = 1 - l0 / LEDGE;
        let c = joint ? PH[0] : pick(PH, 0.5 + (hash(Math.floor((x + off) / 18), row, seed + 13) - 0.5) * 0.14 - (1 - k) * 0.3);
        if (l0 < 3) c = PE[1];
        set(i, c, Math.round(255 * Math.min(1, k * 1.6)));
      } else set(i, [0, 0, 0], 0);
      continue;
    }
    // ---------- los pisos ----------
    let c: number[];
    if (v === SNOW) {
      kind[i] = 1;
      // nieve sucia: suave, con rayas de viento de lado y motas de ceniza (la nieve negra)
      const n = vnoise(x, y, 26, seed + 20) * 0.55 + vnoise(x, y, 7, seed + 21) * 0.3 + vnoise(x * 0.25, y * 2, 10, seed + 22) * 0.25;
      c = pick(PN, 0.08 + n * 0.5);
      if (Math.abs(vnoise(x * 0.3, y * 3, 14, seed + 23) - 0.5) < 0.025) c = mix(c, PN[4], 0.5);
      if (hash(x, y, seed + 24) > 0.965) c = PN[0];
      if (hash(x, y, seed + 25) > 0.996) c = PE[4];
    } else if (v === ICE) {
      // el hielo negro del lago: oscuro y hondo, con grietas claras por dentro, rayones blancos y los gigantes de abajo
      kind[i] = 2;
      const n = vnoise(x, y, 60, seed + 30) * 0.6 + vnoise(x, y, 16, seed + 31) * 0.4;
      let l = 0.22 + n * 0.3;
      const cd = crackDist(x, y, 70, seed + 32), cd2 = crackDist(x + 33, y + 17, 23, seed + 33);
      if (cd < 1.3) l += 0.42; else if (cd < 3) l += 0.12;
      if (cd2 < 0.8 && hash(x >> 3, y >> 3, seed + 34) > 0.5) l += 0.22;
      c = pick(PH, l);
      // los gigantes de abajo: caras enormes y borrosas que miran hacia arriba
      for (const g of UNDER) {
        const dx = (x - g.x) / g.s, dy = (y - g.y) / g.s, ca = Math.cos(g.a), sa = Math.sin(g.a);
        const u = dx * ca + dy * sa, w = -dx * sa + dy * ca;
        const head = Math.hypot(u / 92, w / 74);
        if (head > 1.15) continue;
        let gl = head < 1 ? 0.45 - head * 0.25 : -1;
        // los ojos abiertos (pálidos) y la boca (una sombra)
        for (const ey of [-26, 26]) { const e = Math.hypot((u - 18) / 13, (w - ey) / 9); if (e < 1) gl = e < 0.45 ? 0.95 : 0.1; }
        if (Math.hypot((u + 34) / 10, w / 24) < 1) gl = 0.05;
        // la mano abierta de un costado, apoyada contra el hielo
        if (gl >= 0) c = mix(c, gl > 0.9 ? PE[1] : pick(PG, gl + 0.15), 0.62 * (1 - Math.max(0, head - 0.85) * 3));
      }
      // la orilla: escarcha blanca donde el hielo toca la nieve, y alrededor de los agujeros
      if (dWater[i] <= 4) c = mix(c, PE[3], (1 - dWater[i] / 5) * 0.8);
      if (hash(x, y, seed + 35) > 0.997) c = PE[4];
    } else if (v === STONE) {
      // el patio: losas grandes desparejas de piedra gris azul, con nieve juntada en las juntas y charcos de hielo
      kind[i] = 2;
      const gxs = x / 40, gys = y / 30, cx0 = Math.floor(gxs), cy0 = Math.floor(gys);
      let d1 = 9, d2 = 9, best = 0;
      for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
        const qx = cx0 + k, qy = cy0 + j;
        const px = qx + 0.5 + (hash(qx, qy, seed + 40) - 0.5) * 0.5, py = qy + 0.5 + (hash(qy, qx, seed + 41) - 0.5) * 0.5;
        const dd = Math.max(Math.abs(gxs - px), Math.abs(gys - py) * 1.05) * 0.7 + Math.hypot(gxs - px, gys - py) * 0.3;
        if (dd < d1) { d2 = d1; d1 = dd; best = qx * 7919 + qy; } else if (dd < d2) d2 = dd;
      }
      const edge = d2 - d1, st = hash(best, 0, seed + 42);
      let l = 0.45 + st * 0.2 + vnoise(x, y, 60, seed + 43) * 0.12 - d1 * 0.1;
      if (edge < 0.035) l = 0.05; else if (edge < 0.07) l -= 0.14;
      c = pick(PS, l);
      if (edge < 0.08 && vnoise(x, y, 8, seed + 44) > 0.42) c = PN[3];
      if (st > 0.88 && edge > 0.1) c = mix(c, PH[3], 0.6);
      if (st > 0.94 && edge > 0.06 && crackDist(x, y, 14, seed + 45) < 0.8) c = PS[0];
    } else if (v === CATA) {
      // las catacumbas: baldosas grandes, gastadas y desparejas, con escarcha en las juntas y algunas quebradas
      kind[i] = 2;
      const row = Math.floor(y / 32), off = row % 2 ? 16 : 0, gx = (x + off) % 32, gy = y % 32, cell = Math.floor((x + off) / 32) * 31 + row;
      let l = 0.3 + (hash(cell, 0, seed + 50) - 0.5) * 0.22 + vnoise(x, y, 30, seed + 51) * 0.12;
      if (gx === 0 || gy === 0) l = 0.06; else if (gx === 1 || gy === 1) l += 0.12;
      c = pick(PH, l);
      if ((gx <= 1 || gy <= 1) && vnoise(x, y, 6, seed + 52) > 0.55) c = PE[0];
      if (hash(cell, 2, seed + 54) > 0.85 && crackDist(x, y, 11, seed + 55) < 0.7) c = PH[0];
      if (hash(cell, 1, seed + 53) > 0.92 && Math.abs(gx - 16) < 7 && Math.abs(gy - 16) < 1.2) c = PH[4];
    } else if (v === STAIRS) {
      // la escalera de hielo: la pisada clara con escarcha, el canto oscuro
      kind[i] = 5;
      const s = y % 10;
      let l = s < 2 ? 0.9 : s < 7 ? 0.55 : 0.18;
      l += (hash(x >> 3, y >> 3, seed + 60) - 0.5) * 0.1;
      c = pick(PH, l);
      if (s < 2 && hash(x, y, seed + 61) > 0.5) c = PE[2];
      if (x % 26 === 0) c = PH[0];
    } else if (v === CHAINB) {
      // el puente de cadenas: tablas viejas cubiertas de escarcha, con el vacío negro entre tabla y tabla
      kind[i] = 2;
      const horiz = horizB[Math.floor(y / TILE) * W + Math.floor(x / TILE)] === 1;
      const a = horiz ? x : y, b = horiz ? y : x;
      const gap = a % 12 >= 10;
      if (gap) { set(i, [0, 0, 0], 0); kind[i] = 6; continue; }
      const l = 0.7 - (a % 12) * 0.035 + (hash(Math.floor(a / 12), 0, seed + 70) - 0.5) * 0.2 + (vnoise(a, b, 6, seed + 72) - 0.5) * 0.15;
      c = pick(['#1a1410', '#2a2018', '#3a2c22', '#4e3c30', '#62503e', '#76624c'].map(RGB), l);
      if (a % 12 <= 1 && vnoise(a, b, 5, seed + 71) > 0.35) c = mix(c, PE[2], 0.7);
      // las cadenas de los costados (los pasamanos)
      const sx = Math.floor(x / TILE), sy = Math.floor(y / TILE);
      const lo = horiz ? T(sx, sy - 1) !== CHAINB : T(sx - 1, sy) !== CHAINB, hi2 = horiz ? T(sx, sy + 1) !== CHAINB : T(sx + 1, sy) !== CHAINB;
      const side = horiz ? y % TILE : x % TILE;
      if ((lo && side < 3) || (hi2 && side > 28)) c = (b + a) % 6 < 3 ? PF[3] : PF[1];
    } else if (v === GATE) {
      // la Puerta del Trono: losas negras enormes con runas rojas apagadas y una alfombra vieja, congelada, por el medio
      kind[i] = 2;
      const gx = x % 64, gy = y % 64, cell = Math.floor(x / 64) * 37 + Math.floor(y / 64);
      let l = 0.22 + (hash(cell, 0, seed + 62) - 0.5) * 0.16 + vnoise(x, y, 40, seed + 63) * 0.12;
      if (gx < 2 || gy < 2) l = 0.02; else if (gx < 4 || gy < 4) l += 0.1;
      c = pick(PH, l);
      if ((gx < 3 || gy < 3) && vnoise(x, y, 7, seed + 64) > 0.6) c = mix(c, PE[0], 0.5);
      // la runa de cada losa: un cuerno en V tallado que brilla rojo apagado
      const rx = gx - 32, ry = gy - 32;
      if (Math.abs(Math.abs(rx) * 0.8 + ry) < 1.2 && ry > -14 && ry < 4 && hash(cell, 1, seed + 65) > 0.3) c = PB[1];
      // la alfombra: una franja roja vieja de este a oeste, del puente a la puerta del Corazón
      const cy2 = 91 * TILE, w = Math.abs(y - cy2);
      if (w < 30 + Math.sin(x * 0.05) * 2) { const t2 = w / 30; c = t2 > 0.9 ? [70, 50, 30] : t2 > 0.8 ? [40, 12, 10] : mix(pick(['#2a0a0a', '#3e100e', '#561814', '#6a2018'].map(RGB), 0.55 + (hash(x >> 2, y >> 3, seed + 66) - 0.5) * 0.2 - t2 * 0.3 + ((x >> 1) % 6 === 0 ? -0.15 : 0)), PE[1], hash(x, y, seed + 67) > 0.985 ? 0.6 : 0); }
    } else {
      // el piso del Corazón: hielo negro con brasas en las grietas, y el círculo de la arena tallado
      kind[i] = 2;
      const n = vnoise(x, y, 50, seed + 80) * 0.6 + vnoise(x, y, 12, seed + 81) * 0.4;
      c = pick(PH, 0.15 + n * 0.28);
      const cd = crackDist(x, y, 54, seed + 82);
      const near = Math.hypot(x - acx, y - acy) / ARENA_DIABLO.radio;
      // las grietas con brasa: más calientes cerca del trono y de la arena
      const heat = Math.max(0, 1 - Math.abs(near - 0.6) * 0.9);
      if (cd < 1.1 && hash(Math.floor(x / 20), Math.floor(y / 20), seed + 83) > 0.4) c = mix(PB[1], PB[3], heat);
      else if (cd < 2.4) c = mix(c, PB[0], 0.5 * heat);
      // el círculo tallado: dos anillos y runas en forma de cuerno
      const rr = Math.hypot(x - acx, y - acy);
      if (Math.abs(rr - ARENA_DIABLO.radio * 0.92) < 2 || Math.abs(rr - ARENA_DIABLO.radio * 0.86) < 1) c = mix(PB[1], PB[2], 0.5 + 0.5 * Math.sin(Math.atan2(y - acy, x - acx) * 12));
      if (rr > ARENA_DIABLO.radio * 0.86 && rr < ARENA_DIABLO.radio * 0.92) { const ang = ((Math.atan2(y - acy, x - acx) / (Math.PI * 2)) * 24 + 24) % 1; if (Math.abs(ang - 0.5) < 0.05) c = PB[2]; }
      if (rr < 30 && rr > 27) c = PB[1];
      if (hash(x, y, seed + 84) > 0.9996) c = PB[4];
    }
    // al pie de la roca: la sombra de contacto (oclusión) y la nieve juntada contra la pared
    {
      let up = 0;
      for (let k = 1; k <= 12; k++) { const j = (y - k) * PWX + x; if (y - k >= 0 && cls[j] === 1) { up = 13 - k; break; } }
      if (up) c = mix(c, [2, 3, 6], (up / 12) * 0.55);
      if (dRock[i] < 6 && v !== CHAINB && hash(x, y, seed + 90) > 0.62 + dRock[i] * 0.05) c = mix(c, PN[4], 0.7);
    }
    // el borde del piso sobre el vacío: el canto de hielo
    if (dVoid[i] <= 2 && v !== CHAINB) c = PE[1];
    set(i, c);
  }
  // por cuadro
  const solid = new Uint8Array(W * H), waterTiles = new Uint8Array(W * H), tileKind = new Uint8Array(W * H), tileHigh = new Uint8Array(W * H);
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    const k = ty * W + tx, v = t[k];
    tileHigh[k] = v === ROCK ? 1 : 0;
    tileKind[k] = v === ROCK || v === VOID ? 6 : v === WATER ? 4 : v === STAIRS ? 5 : v === SNOW ? 1 : 2;
    solid[k] = SOLIDS.has(v) ? 1 : 0;
    waterTiles[k] = v === WATER ? 1 : 0;
  }
  return { img, kind, high, solid, waterTiles, tileKind, tileHigh };
}

/** Variante espejada con otro tono: la utilería no se repite igual en una pantalla. */
function variantB(o: WorldObject, tint: [number, number, number]): WorldObject {
  const flip = (fr: Raster) => {
    const r = createRaster(fr.w, fr.h);
    for (let y = 0; y < fr.h; y++) for (let x = 0; x < fr.w; x++) {
      const si = (y * fr.w + x) * 4, di = (y * fr.w + (fr.w - 1 - x)) * 4;
      for (let c = 0; c < 3; c++) r.data[di + c] = Math.max(0, Math.min(255, Math.round(fr.data[si + c] * tint[c])));
      r.data[di + 3] = fr.data[si + 3];
    }
    return r;
  };
  const anims: WorldObject['anims'] = {};
  for (const [k, a] of Object.entries(o.anims)) anims[k] = { ...a, frames: a.frames.map(flip) };
  const mirrorBox = (b: [number, number, number, number]): [number, number, number, number] => [-(b[0] + b[2]) + (o.w - 2 * o.anchor[0]), b[1], b[2], b[3]];
  return { ...o, name: `${o.name}_b`, anchor: [o.w - 1 - o.anchor[0], o.anchor[1]], solid: o.solid ? mirrorBox(o.solid) : null, ...(o.solids ? { solids: o.solids.map(mirrorBox) } : {}), anims, ...(o.shadow ? { shadow: flip(o.shadow) } : {}) };
}

const VARIANTES: Record<string, [number, number, number]> = {
  columna_hielo_0: [0.94, 0.96, 1], columna_hielo_1: [0.95, 0.95, 0.98], columna_hielo_2: [0.92, 0.95, 1], columna_hielo_3: [0.96, 0.96, 0.98],
  gigante_congelado_0: [0.94, 0.95, 1], gigante_congelado_1: [0.95, 0.96, 0.98], gigante_congelado_2: [0.93, 0.95, 1],
  arbol_hielo_0: [0.94, 0.96, 1], arbol_hielo_1: [0.95, 0.95, 0.98], arbol_hielo_2: [0.92, 0.95, 1], arbol_hielo_3: [0.96, 0.96, 0.98],
  arma_congelada_0: [0.94, 0.95, 1], arma_congelada_1: [0.95, 0.95, 0.98], escudo_roto_0: [0.95, 0.94, 0.96], escudo_roto_1: [0.94, 0.95, 0.98],
  calavera_demonio_0: [0.94, 0.95, 1], calavera_demonio_1: [0.95, 0.95, 0.98], bandera_helada_0: [0.95, 0.94, 0.96], bandera_helada_1: [0.94, 0.95, 0.98],
  lapida_hielo_0: [0.94, 0.95, 1], lapida_hielo_1: [0.95, 0.95, 0.98], sarcofago_hielo: [0.94, 0.95, 1], estalagmita_hielo_0: [0.94, 0.95, 1], estalagmita_hielo_1: [0.95, 0.95, 0.98],
  roca_hielo_0: [0.94, 0.95, 1], roca_hielo_1: [0.95, 0.95, 0.98], armadura_caida: [0.95, 0.95, 0.98],
};

/** Los objetos que usa el Mundo 7: los suyos, los portales y lo prestado. */
export function corazonMapObjects(): WorldObject[] {
  const prestados = new Set(['cartel', 'aviso_jefe']);
  const base = [...corazonObjectsA(), ...corazonObjectsB()];
  return [
    ...base, ...base.filter((o) => VARIANTES[o.name]).map((o) => variantB(o, VARIANTES[o.name])),
    ...[...forestObjects(), ...landmarkObjects()].filter((o) => prestados.has(o.name)),
    ...premiumPortals(['azul', 'rojo', 'hielo']),
  ];
}

export interface CorazonReport {
  ramas: { id: string; nombre: string; medio: TP; tapar: TP[] }[];
  secretos: string[];
  pantallas: { nombre: string; x: number; y: number; objetos: string[] }[];
}

import { vidaAbyss, type InformeAbyss } from './abyss/index';
import { RECETA_CORAZON } from './abyss/recetas';

export function corazonMap(seed = 777, opts: { abyss?: boolean } = {}): BigMap & { premium: CorazonReport; abyss?: InformeAbyss } {
  const W = CORAZON_W, H = CORAZON_H;
  const d = makeDesign();
  const terrain = paintCorazon(d, seed);
  const objects = corazonMapObjects();
  const byName = new Map(objects.map((o) => [o.name, o]));
  const solid = new Uint8Array(terrain.solid);
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : y * W + x);
  const T = (t: number) => t * TILE + TILE / 2;
  const decos: Deco[] = [], entities: Ent[] = [];
  const occ = new Uint8Array(W * H);
  const bodies = new Set<number>();
  const GW = Math.ceil((W * TILE) / CELL);
  const fps = new Map<string, ReturnType<typeof footprint>>();
  const fpOf = (s: string) => { let f = fps.get(s); if (!f) { f = footprint(byName.get(s)!); fps.set(s, f); } return f; };
  const cellsOf = (s: string, px: number, py: number) => fpOf(s).body.map(([cx, cy]) => (Math.floor(py / CELL) + cy) * GW + Math.floor(px / CELL) + cx);
  const solidBox = (s: string, px: number, py: number, fn: (k: number) => void) => {
    const o = byName.get(s)!;
    for (const b of [o.solid, ...(o.solids ?? [])]) {
      if (!b) continue;
      const x0 = Math.floor((px + b[0]) / TILE), x1 = Math.floor((px + b[0] + b[2] - 1) / TILE), y0 = Math.floor((py + b[1]) / TILE), y1 = Math.floor((py + b[1] + b[3] - 1) / TILE);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (at(x, y) >= 0) fn(at(x, y));
    }
  };
  const place = (sprite: string, px: number, py: number) => {
    const o = byName.get(sprite);
    if (!o) throw new Error(`objeto desconocido: ${sprite}`);
    decos.push({ sprite, x: Math.round(px), y: Math.round(py) });
    solidBox(sprite, px, py, (k) => { solid[k] = 1; });
    if (o.layer !== 'suelo') for (const c of cellsOf(sprite, Math.round(px), Math.round(py))) bodies.add(c);
    const tx = Math.floor(px / TILE), ty = Math.floor((py - 1) / TILE);
    if (at(tx, ty) >= 0) occ[at(tx, ty)] = 1;
  };
  const placeT = (sprite: string, tx: number, ty: number, dx = 0) => place(sprite, T(tx) + dx, ty * TILE + TILE - 4);
  /** la primera variante (o su espejo) que no esté ya en la misma pantalla */
  const variant = (pool: string[], px: number, py: number) => {
    const all = pool.flatMap((q) => [q, `${q}_b`]).filter((q) => byName.has(q));
    const start = Math.floor(hash(Math.round(px), Math.round(py), seed + 3) * all.length);
    for (let k = 0; k < all.length; k++) { const s = all[(start + k) % all.length]; if (!decos.some((q) => q.sprite === s && Math.abs(q.x - px) < 960 && Math.abs(q.y - py) < 540)) return s; }
    return all[start];
  };
  const open = (x: number, y: number) => at(x, y) >= 0 && !solid[at(x, y)] && !occ[at(x, y)];
  const near = (tx: number, ty: number, maxR = 6): [number, number] => {
    for (let rad = 0; rad <= maxR; rad++) for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== rad) continue;
      if (open(tx + dx, ty + dy)) return [tx + dx, ty + dy];
    }
    return [tx, ty];
  };
  const ent = (tipo: string, tx: number, ty: number, props?: Record<string, Prop>) => {
    const [x, y] = near(tx, ty);
    entities.push({ tipo, x: T(x), y: T(y), ...(props ? { props } : {}) });
    occ[at(x, y)] = 1;
    return [x, y] as [number, number];
  };
  const reserve = (tx: number, ty: number, rad: number) => { for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) if (at(tx + dx, ty + dy) >= 0) occ[at(tx + dx, ty + dy)] = 1; };
  const zonaDe = (tx: number, ty: number) => ZONAS.find((z) => tx >= z.rect[0] && tx < z.rect[2] && ty >= z.rect[1] && ty < z.rect[3])!.nombre;
  const chest = (tx: number, ty: number, nivel: string, extra: Record<string, Prop> = {}) => { const [x, y] = ent('cofre', tx, ty, { nivel, ...extra }); solid[at(x, y)] = 1; };
  const enemy = (id: string, nombre: string, tx: number, ty: number, extra: Record<string, Prop> = {}) => ent('enemigo', tx, ty, { enemigo: id, nombre, ...extra });
  /** un grupo: varios del mismo alrededor de un punto (los lobos en manada, los diablillos en banda) */
  let nGrupo = 0;
  const group = (id: string, nombre: string, tx: number, ty: number, n: number, extra: Record<string, Prop> = {}) => {
    const g = `grupo_${nGrupo++}`;
    for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + hash(k, nGrupo, seed + 5) * 0.6, rr = k ? 1.6 + (k % 2) : 0; enemy(id, nombre, Math.round(tx + Math.cos(a) * rr), Math.round(ty + Math.sin(a) * rr), { grupo: g, ...extra }); }
  };
  /** la hoguera de hueso: la fogata del piso (guarda, cura, calienta y es la tienda) */
  const hoguera = (tx: number, ty: number, id: string, extra: Record<string, Prop> = {}) => {
    placeT('hoguera_hueso', tx, ty);
    reserve(tx, ty, 1);
    const [x, y] = near(tx, ty + 2, 3);
    entities.push({ tipo: 'punto_guardado', x: T(x), y: T(y), props: { id, nombre: zonaDe(tx, ty), hoguera: true, objeto: 'hoguera_hueso', ...extra } });
    reserve(x, y, 1);
  };
  /** un refugio de la ventisca: el objeto (sólido) y la entidad en el centro de su base sólida */
  let nRefugio = 0;
  const refugio = (tipo: 'columna_hielo' | 'gigante', tx: number, ty: number) => {
    const pool = tipo === 'columna_hielo' ? ['columna_hielo_0', 'columna_hielo_1', 'columna_hielo_2', 'columna_hielo_3'] : ['gigante_congelado_0', 'gigante_congelado_1', 'gigante_congelado_2'];
    const px = T(tx), py = ty * TILE + TILE - 4, s = variant(pool, px, py), o = byName.get(s)!;
    place(s, px, py);
    const b = o.solid!;
    entities.push({ tipo, x: Math.round(px + b[0] + b[2] / 2), y: Math.round(py + b[1] + b[3] / 2), props: { id: `refugio_${nRefugio++}`, zona: zonaDe(tx, ty), objeto: s, ancho: b[2] } });
  };
  /** un parche de hielo fino: rectángulo caminable sobre el lago (múltiplos de 32) */
  let nFino = 0;
  const fino = (tx: number, ty: number, w: number, h: number) => {
    for (let y = ty; y < ty + h; y++) for (let x = tx; x < tx + w; x++) if (d[at(x, y)] !== ICE || solid[at(x, y)]) throw new Error(`hielo fino fuera del hielo firme en ${x},${y}`);
    entities.push({ tipo: 'hielo_fino', x: tx * TILE, y: ty * TILE, props: { id: `hielo_fino_${nFino++}`, width: w * TILE, height: h * TILE, zona: zonaDe(tx, ty) } });
  };

  // ---------- 1. La Escalera Helada: el portal arriba, la escalera de hielo y la primera hoguera ----------
  const [px0, py0] = LC.portal;
  entities.push({ tipo: 'portal_llegada', x: T(px0), y: T(py0), props: { color: 'hielo', portal: 'portal_hielo' } });
  entities.push({ tipo: 'portal_volver', x: T(px0), y: T(py0 + 1), props: { destino: 'mundo6' } });
  reserve(px0, py0, 1);
  entities.push({ tipo: 'jugador_inicio', x: T(px0 + 3), y: T(py0) });
  entities.push({ tipo: 'thor_inicio', x: T(px0 + 3), y: T(py0 + 1) });
  reserve(px0 + 3, py0, 1);
  refugio('columna_hielo', 9, 9); refugio('columna_hielo', 22, 9);
  placeT('bandera_helada_0', 10, 4); placeT('bandera_helada_1', 21, 4);
  hoguera(17, 23, 'escalera', { tutorial: true });
  chest(24, 31, 'madera');
  placeT('calavera_demonio_0', 9, 30); placeT('arma_congelada_0', 23, 19); placeT('roca_hielo_0', 11, 19);
  refugio('columna_hielo', 9, 26);
  group('lobo_escarcha', 'Lobo de Escarcha', 13, 29, 4);
  group('diablillo', 'Diablillo', 22, 27, 5);

  // ---------- 2. El Lago de los Gigantes (rama): el hielo negro, los gigantes, el hielo fino y la Reina Escarcha ----------
  refugio('gigante', 47, 15); refugio('gigante', 64, 24); refugio('gigante', 40, 24); refugio('gigante', 70, 9);
  refugio('columna_hielo', 33, 13); refugio('columna_hielo', 53, 5); refugio('columna_hielo', 80, 20); refugio('columna_hielo', 57, 24);
  for (const [x, y, w, h] of [[38, 15, 3, 2], [45, 20, 2, 3], [52, 11, 3, 2], [55, 16, 2, 2], [61, 14, 3, 2], [44, 27, 2, 2], [67, 17, 2, 3], [60, 27, 3, 2], [70, 12, 2, 2], [46, 8, 2, 2]] as [number, number, number, number][]) fino(x, y, w, h);
  enemy('reina_escarcha', 'La Reina Escarcha', LC.reina[0], LC.reina[1], { elite: true });
  reserve(LC.reina[0], LC.reina[1], 2);
  chest(79, 28, 'dorado', { guardado_por: 'reina_escarcha' });
  group('lobo_escarcha', 'Lobo de Escarcha', 34, 7, 5);
  group('espectro_helado', 'Espectro Helado', 50, 14, 2);
  group('espectro_helado', 'Espectro Helado', 65, 22, 3);
  group('lobo_escarcha', 'Lobo de Escarcha', 72, 6, 4);
  ent('figura', 58, 6, { id: 'lago', zona: 'El Lago de los Gigantes' });

  // ---------- 3. Las Catacumbas de Hielo (rama): los pasillos, las criptas, el mural y la cripta sellada ----------
  place('mural_7', LC.mural[0] * TILE, LC.mural[1] * TILE - 2);
  entities.push({ tipo: 'mural', x: LC.mural[0] * TILE, y: (LC.mural[1] + 1) * TILE, props: { pieza: 7 } });
  reserve(LC.mural[0], LC.mural[1], 1);
  placeT('sarcofago_hielo', 96, 18); placeT('sarcofago_hielo_b', 108, 30); placeT('lapida_hielo_0', 94, 14); placeT('lapida_hielo_1', 99, 14); placeT('lapida_hielo_0_b', 93, 30); placeT('lapida_hielo_1_b', 106, 17);
  refugio('gigante', 108, 17);
  group('sombra_devoradora', 'Sombra Devoradora', 89, 22, 2);
  group('sombra_devoradora', 'Sombra Devoradora', 109, 21, 2);
  group('sombra_devoradora', 'Sombra Devoradora', 97, 33, 3);
  group('espectro_helado', 'Espectro Helado', 114, 12, 2);
  group('diablillo', 'Diablillo', 108, 28, 5);
  chest(96, 28, 'reforzado');
  chest(LC.cripta[0], LC.cripta[1], 'dorado', { secreto: true, pista: 'cripta_sellada' });

  // ---------- 4. El Bosque de Escarcha: árboles de hielo, manadas de lobos y la guarida (secreto) ----------
  {
    const spots: [number, number][] = [[6, 39], [14, 38], [25, 39], [34, 40], [9, 46], [20, 45], [30, 47], [5, 53], [15, 53], [26, 55], [35, 58], [12, 60], [22, 64], [32, 66]];
    for (const [x, y] of spots) { const px = T(x), py = y * TILE + TILE - 4; place(variant(['arbol_hielo_0', 'arbol_hielo_1', 'arbol_hielo_2', 'arbol_hielo_3'], px, py), px, py); }
  }
  hoguera(20, 58, 'bosque');
  refugio('columna_hielo', 28, 42); refugio('columna_hielo', 11, 56);
  group('lobo_escarcha', 'Lobo de Escarcha', 10, 42, 5);
  group('lobo_escarcha', 'Lobo de Escarcha', 28, 52, 6);
  group('lobo_escarcha', 'Lobo de Escarcha', 33, 63, 4);
  group('espectro_helado', 'Espectro Helado', 17, 66, 2);
  chest(36, 37, 'reforzado');
  chest(LC.guarida[0], LC.guarida[1], 'dorado', { secreto: true, pista: 'guarida_lobo' });

  // ---------- 5. La Ciudadela Congelada: caballeros congelados y brujas de escarcha en el patio ----------
  hoguera(59, 55, 'ciudadela');
  refugio('columna_hielo', 49, 44); refugio('columna_hielo', 75, 44); refugio('columna_hielo', 49, 62); refugio('columna_hielo', 75, 62);
  placeT('bandera_helada_0_b', 56, 42); placeT('bandera_helada_1_b', 68, 42); placeT('armadura_caida', 58, 58); placeT('escudo_roto_0', 66, 58);
  group('caballero_congelado', 'Caballero Congelado', 58, 47, 3);
  group('caballero_congelado', 'Caballero Congelado', 67, 60, 2);
  group('bruja_escarcha', 'Bruja de Escarcha', 62, 45, 2);
  group('bruja_escarcha', 'Bruja de Escarcha', 46, 55, 1);
  group('diablillo', 'Diablillo', 78, 54, 6);
  group('lobo_escarcha', 'Lobo de Escarcha', 46, 38, 4);
  chest(80, 66, 'reforzado');
  ent('figura', 74, 37, { id: 'ciudadela', zona: 'La Ciudadela Congelada' });

  // ---------- 6. El Puente de las Cadenas: islas con columnas (refugios) sobre el vacío, en la ventisca ----------
  refugio('columna_hielo', 6, 76); refugio('columna_hielo', 13, 83);
  refugio('columna_hielo', 27, 77); refugio('columna_hielo', 32, 86); refugio('gigante', 30, 101);
  refugio('columna_hielo', 45, 76); refugio('columna_hielo', 53, 86);
  hoguera(49, 84, 'puente');
  group('espectro_helado', 'Espectro Helado', 38, 81, 2);
  group('diablillo', 'Diablillo', 29, 82, 6);
  group('espectro_helado', 'Espectro Helado', 60, 81, 3);
  group('lobo_escarcha', 'Lobo de Escarcha', 9, 79, 4);
  group('diablillo', 'Diablillo', 47, 78, 5);
  chest(26, 98, 'dorado');
  placeT('estalagmita_hielo_0', 35, 97); placeT('roca_hielo_1', 24, 103);

  // ---------- 7. La Puerta del Trono: el Guardián en su patio ----------
  enemy('guardian_puerta', 'El Guardián de la Puerta', LC.guardian[0], LC.guardian[1], { elite: true });
  reserve(LC.guardian[0], LC.guardian[1], 2);
  chest(81, 104, 'dorado', { guardado_por: 'guardian_puerta' });
  refugio('columna_hielo', 70, 75); refugio('columna_hielo', 80, 75); refugio('columna_hielo', 70, 103); refugio('gigante', 79, 86);
  placeT('calavera_demonio_1', 81, 79); placeT('bandera_helada_0', 72, 86); placeT('bandera_helada_1', 81, 98);
  group('diablillo', 'Diablillo', 74, 100, 5);
  group('sombra_devoradora', 'Sombra Devoradora', 78, 83, 2);

  // ---------- 8. El Corazón Helado: la última hoguera, la arena del Diablo, los braseros, el trono y la Ladrona ----------
  hoguera(89, 102, 'corazon');
  const [ax, ay] = LC.arena, acx = T(ax), acy = T(ay);
  place('trono_diablo', T(LC.trono[0]), (LC.trono[1] + 1) * TILE - 4);
  entities.push({ tipo: 'trono_diablo', x: T(LC.trono[0]), y: (LC.trono[1] + 1) * TILE - 4, props: { id: 'trono', objeto: 'trono_diablo' } });
  entities.push({ tipo: 'figura', x: T(LC.trono[0]) + 140, y: (LC.trono[1] + 1) * TILE - 8, props: { id: 'trono', zona: 'El Corazón Helado', alto: true, objeto: 'figura_ultima_llama' } });
  entities.push({ tipo: 'arena_jefe', x: acx, y: acy, props: { radio: ARENA_DIABLO.radio, braseros: 4 } });
  entities.push({ tipo: 'jefe', x: acx, y: acy, props: { enemigo: 'diablo', nombre: 'El Diablo', titulo: 'El que se come la luz para no apagarse' } });
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy], k) => {
    const u = Math.SQRT1_2, x = Math.round(acx + sx * u * ARENA_DIABLO.brasero), y = Math.round(acy + sy * u * ARENA_DIABLO.brasero);
    place('brasero_hueso', x, y);
    entities.push({ tipo: 'brasero_hueso', x, y, props: { id: `brasero_${k}`, objeto: 'brasero_hueso' } });
  });
  entities.push({ tipo: 'portal_jefe', x: acx, y: T(104), props: { color: 'hielo', portal: 'portal_hielo', destino: 'fin' } });
  chest(113, 104, 'dorado', { tras_jefe: true });
  refugio('gigante', 93, 70); refugio('columna_hielo', 113, 70); refugio('columna_hielo', 88, 76); refugio('columna_hielo', 114, 96);
  placeT('calavera_demonio_0_b', 112, 80); placeT('arma_congelada_1_b', 90, 95);
  // la arena queda libre para pelear (nada de utilería adentro)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.hypot(x + 0.5 - acx / TILE, y + 0.5 - acy / TILE) * TILE < ARENA_DIABLO.radio + 16) occ[at(x, y)] = 1;

  // ---------- la utilería de cada zona: sin montarse, sin repetir en una pantalla, sin cortar pasos ----------
  {
    let rs = (seed * 7919) >>> 0;
    const rnd = () => { rs = (rs + 0x6d2b79f5) >>> 0; let t = Math.imul(rs ^ (rs >>> 15), rs | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const avoid = new Uint8Array(W * H);
    for (const e of entities) { const tx = Math.floor(e.x / TILE), ty = Math.floor(e.y / TILE); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(tx + dx, ty + dy) >= 0) avoid[at(tx + dx, ty + dy)] = 1; }
    // el hielo fino tampoco lleva utilería encima
    for (const e of entities) if (e.tipo === 'hielo_fino') for (let y = e.y / TILE - 1; y <= e.y / TILE + Number(e.props!.height) / TILE; y++) for (let x = e.x / TILE - 1; x <= e.x / TILE + Number(e.props!.width) / TILE; x++) if (at(x, y) >= 0) avoid[at(x, y)] = 1;
    const start = entities.find((e) => e.tipo === 'jugador_inicio')!;
    const s0 = at(Math.floor(start.x / TILE), Math.floor(start.y / TILE));
    const count = () => { const seen = new Uint8Array(W * H), q = [s0]; seen[s0] = 1; for (let i = 0; i < q.length; i++) { const k = q[i], x = k % W, y = Math.floor(k / W); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = at(x + dx, y + dy); if (j < 0 || seen[j] || solid[j]) continue; seen[j] = 1; q.push(j); } } return q.length; };
    let alcanzados = count();
    const dress = (rect: Rect, pool0: string[], n: number) => {
      const [X0, Y0, X1, Y1] = rect;
      const pool = [...pool0, ...pool0.map((q) => `${q}_b`).filter((q) => byName.has(q))];
      for (let k = 0; k < n; k++) {
        for (let t = 0; t < 120; t++) {
          const sprite = pool[Math.floor(rnd() * pool.length)], o = byName.get(sprite)!;
          const px = Math.round((X0 + rnd() * (X1 - X0)) * TILE), py = Math.round((Y0 + rnd() * (Y1 - Y0)) * TILE);
          const tx = Math.floor(px / TILE), ty = Math.floor((py - 1) / TILE), i = at(tx, ty);
          if (i < 0 || solid[i] || occ[i] || avoid[i] || d[i] === STAIRS || d[i] === CHAINB) continue;
          if (decos.some((q) => q.sprite === sprite && Math.abs(q.x - px) < 960 && Math.abs(q.y - py) < 540)) continue;
          const box: number[] = [];
          let bad = false;
          solidBox(sprite, px, py, (kk) => { box.push(kk); if (solid[kk] || occ[kk] || avoid[kk]) bad = true; });
          if (bad) continue;
          if (cellsOf(sprite, px, py).some((cc) => bodies.has(cc))) continue;
          const fx0 = Math.floor((px - o.anchor[0] + 4) / TILE), fx1 = Math.floor((px - o.anchor[0] + o.w - 5) / TILE);
          let onFloor = true;
          for (let x = fx0; x <= fx1; x++) { const j = at(x, ty); if (j < 0 || SOLIDS.has(d[j]) || d[j] === CHAINB) onFloor = false; }
          if (!onFloor) continue;
          for (const kk of box) solid[kk] = 1;
          const now = count();
          for (const kk of box) solid[kk] = 0;
          if (now < alcanzados - box.length) continue;
          place(sprite, px, py);
          for (let dy = -1; dy <= 0; dy++) for (let dx = -1; dx <= 1; dx++) if (at(tx + dx, ty + dy) >= 0) occ[at(tx + dx, ty + dy)] = 1;
          alcanzados = count();
          break;
        }
      }
    };
    dress([8, 18, 26, 32], ['escudo_roto_0', 'escudo_roto_1', 'calavera_demonio_1', 'estalagmita_hielo_0', 'roca_hielo_1', 'arma_congelada_1'], 5);
    dress([30, 4, 82, 32], ['estalagmita_hielo_0', 'estalagmita_hielo_1', 'roca_hielo_0', 'roca_hielo_1', 'arma_congelada_0', 'escudo_roto_1', 'calavera_demonio_0'], 14);
    dress([85, 8, 117, 35], ['lapida_hielo_0', 'lapida_hielo_1', 'calavera_demonio_0', 'calavera_demonio_1', 'estalagmita_hielo_0', 'armadura_caida'], 10);
    dress([4, 37, 38, 68], ['estalagmita_hielo_0', 'estalagmita_hielo_1', 'roca_hielo_0', 'roca_hielo_1', 'calavera_demonio_1', 'escudo_roto_0'], 12);
    dress([42, 37, 82, 68], ['armadura_caida', 'escudo_roto_0', 'escudo_roto_1', 'arma_congelada_0', 'arma_congelada_1', 'calavera_demonio_0', 'roca_hielo_0', 'estalagmita_hielo_1'], 14);
    dress([3, 72, 56, 105], ['roca_hielo_0', 'roca_hielo_1', 'estalagmita_hielo_0', 'estalagmita_hielo_1', 'calavera_demonio_0', 'escudo_roto_1'], 9);
    dress([68, 73, 83, 105], ['armadura_caida', 'escudo_roto_0', 'arma_congelada_0', 'roca_hielo_1', 'estalagmita_hielo_0'], 6);
    dress([86, 64, 117, 106], ['calavera_demonio_1', 'arma_congelada_0', 'escudo_roto_1', 'estalagmita_hielo_1', 'roca_hielo_0', 'armadura_caida'], 9);
  }

  // ---------- zonas y postales ----------
  const zones: MapZone[] = [];
  for (const z of ZONAS) {
    const [x0, y0, x1, y1] = z.rect;
    zones.push({ nombre: z.nombre, x: x0 * TILE, y: y0 * TILE, w: (x1 - x0) * TILE, h: (y1 - y0) * TILE, props: { musica: 'ninguna', descubrir: true, ...z.props, frente: z.frente.join(',') } });
  }
  zones.push({ nombre: 'La Guarida del Lobo', x: 2 * TILE, y: 62 * TILE, w: 7 * TILE, h: 7 * TILE, props: { musica: 'ninguna', ambiente: 'bosque_hielo', luz: '#9ab8d8', oscuridad: 0.92, niebla: 0.4, particulas: 'nieve', secreto: true, descubrir: true } });
  zones.push({ nombre: 'La Cripta Sellada', x: 112 * TILE, y: 31 * TILE, w: 6 * TILE, h: 5 * TILE, props: { musica: 'ninguna', ambiente: 'catacumbas', luz: '#6a8aac', oscuridad: 0.95, niebla: 0.5, particulas: 'ceniza', secreto: true, descubrir: true } });
  const postales: Postal[] = [
    { nombre: 'escalera_helada', x: T(16), y: T(19) },
    { nombre: 'bosque_de_escarcha', x: T(20), y: T(50) },
    { nombre: 'lago_de_los_gigantes', x: T(54), y: T(19) },
    { nombre: 'catacumbas_de_hielo', x: T(101), y: T(19) },
    { nombre: 'ciudadela_congelada', x: T(63), y: T(51) },
    { nombre: 'puente_de_las_cadenas', x: T(38), y: T(81) },
    { nombre: 'puerta_del_trono', x: T(75), y: T(88) },
    { nombre: 'corazon_helado', x: T(101), y: T(79) },
  ];

  // cada postal centrada en un cuadro que se camina (ahí va la heroína)
  for (const p of postales) { const [x, y] = near(Math.floor(p.x / TILE), Math.floor(p.y / TILE), 4); if (solid[at(x, y)]) continue; p.x = T(x); p.y = T(y); }
  const map: BigMap & { premium: CorazonReport } = {
    name: 'mundo7_corazon', w: W, h: H, terrain, solid, decos, entities, zones, postales, objects,
    meta: { bioma: 'corazon', musica: 'ninguna', nombre: 'El Corazón Helado', agua: AGUA_HELADA.base, aguaBrillo: AGUA_HELADA.brillo, espuma: AGUA_HELADA.espuma, fondo: CORAZON_PARALAJE.map((p, k) => ({ id: `fondo_hielo_lejos_${k}`, paralaje: p })) },
    premium: {
      ramas: [
        { id: 'lago', nombre: 'El Lago de los Gigantes (de la escalera a la ciudadela)', medio: [56, 6], tapar: [[27, 20], [27, 21], [27, 22], [27, 23], [27, 24], [28, 20], [28, 21], [28, 22], [28, 23], [28, 24]] },
        { id: 'catacumbas', nombre: 'Las Catacumbas de Hielo (del lago a la ciudadela)', medio: [102, 20], tapar: [[82, 8], [82, 9], [82, 10], [82, 11], [83, 8], [83, 9], [83, 10], [83, 11]] },
        { id: 'puente_viejo', nombre: 'El Puente Viejo (del bosque a la primera isla)', medio: [10, 78], tapar: [[8, 69], [9, 69], [10, 69], [11, 69], [8, 70], [9, 70], [10, 70], [11, 70]] },
      ],
      secretos: ['guarida_lobo', 'cripta_sellada'],
      pantallas: [],
    },
  };
  poblar(map, d, { solid, at, seed, byName });
  // lo que no se alcanza de ninguna forma (adentro de la roca) se cierra en la colisión
  {
    const reach = new Uint8Array(W * H);
    const start = entities.find((e) => e.tipo === 'jugador_inicio')!;
    const q = [at(Math.floor(start.x / TILE), Math.floor(start.y / TILE))];
    reach[q[0]] = 1;
    for (let i = 0; i < q.length; i++) { const k = q[i], x = k % W, y = Math.floor(k / W); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = at(x + dx, y + dy); if (j < 0 || reach[j] || solid[j]) continue; reach[j] = 1; q.push(j); } }
    for (let k = 0; k < W * H; k++) if (!reach[k]) solid[k] = 1;
  }
  // abyss premium: piso con vida, un monumento por zona, criaturas nuevas y la luz de cada zona
  return opts.abyss === false ? map : vidaAbyss(map, RECETA_CORAZON);
}

/** Paralaje de los tres fondos del abismo helado (de lejos a cerca). */
export const CORAZON_PARALAJE = [0.25, 0.4, 0.55];

/** Calcomanías por tipo de piso */
const DECAL_NIEVE = ['nieve_acumulada_0', 'nieve_acumulada_1', 'huellas_lobo_0', 'huellas_lobo_1', 'ceniza_negra_0', 'ceniza_negra_1', 'escarcha_0'];
const DECAL_HIELO = ['grieta_hielo_0', 'grieta_hielo_1', 'escarcha_0', 'escarcha_1', 'ceniza_negra_0', 'nieve_acumulada_1'];

/** Calcomanías en cada pantalla (sin repetir la misma cerca) y la agenda de lo que se ve en cada postal. */
function poblar(m: BigMap & { premium: CorazonReport }, d: Uint8Array, c: { solid: Uint8Array; at: (x: number, y: number) => number; seed: number; byName: Map<string, WorldObject> }) {
  const W = m.w, H = m.h;
  let s = c.seed >>> 0;
  const r = () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const used: { s: string; x: number; y: number }[] = [];
  const PWX = m.terrain.img.w;
  const arena = m.entities.find((e) => e.tipo === 'arena_jefe')!;
  const finos = m.entities.filter((e) => e.tipo === 'hielo_fino');
  for (let sy = 0; sy < H; sy += 6) for (let sx = 0; sx < W; sx += 8) {
    for (let k = 0; k < 4; k++) {
      for (let t = 0; t < 30; t++) {
        const tx = sx + Math.floor(r() * 8), ty = sy + Math.floor(r() * 6), i = c.at(tx, ty);
        if (i < 0 || c.solid[i] || d[i] === STAIRS || d[i] === CHAINB) continue;
        const px = tx * TILE + 4 + Math.floor(r() * 24), py = ty * TILE + 4 + Math.floor(r() * 24);
        if (Math.hypot(px - arena.x, py - arena.y) < ARENA_DIABLO.radio) continue;
        if (finos.some((f) => px > f.x - 40 && px < f.x + Number(f.props!.width) + 40 && py > f.y - 24 && py < f.y + Number(f.props!.height) + 24)) continue;
        const kd = m.terrain.kind[py * PWX + px];
        if (kd !== 1 && kd !== 2) continue;
        const pool = kd === 1 ? DECAL_NIEVE : DECAL_HIELO;
        const name = pool[Math.floor(r() * pool.length)];
        if (used.some((u) => u.s === name && Math.abs(u.x - px) < 500 && Math.abs(u.y - py) < 300)) continue;
        m.decos.push({ sprite: name, x: px, y: py });
        used.push({ s: name, x: px, y: py });
        break;
      }
    }
  }
  for (const p of m.postales) {
    const inside = (x: number, y: number) => Math.abs(x - p.x) < 480 && Math.abs(y - p.y) < 270;
    m.premium.pantallas.push({ nombre: p.nombre, x: p.x, y: p.y, objetos: m.decos.filter((q) => inside(q.x, q.y) && c.byName.get(q.sprite)?.layer !== 'suelo').map((q) => q.sprite) });
  }
}

export { ROCK, SNOW, ICE, STONE, CATA, CHAINB, STAIRS, VOID, WATER, ARENA, GATE };
