import { createRaster, type Raster } from '../core/raster';
import { TILE } from './tiles';
import { distTo, type PaintedTerrain, type TP } from './paint';
import { hash } from './puertoObjects';
import { fraguaObjectsA, FRAGUA, LUZ_IDS, JAULA_CANDADO, type LuzId } from './fraguaObjects';
import { fraguaObjectsB, FRAGUA_PARALAJE } from './fraguaObjectsB';
import { galeriasObjects } from './galeriasObjects';
import { forestObjects, type WorldObject } from './objects';
import { landmarkObjects } from './landmarks';
import { premiumPortals } from './portales';
import { footprint, CELL } from './premium/placer';
import type { BigMap, Deco, Ent, MapZone, Postal, Prop } from './bosqueMap';

/**
 * Mundo 6: La Fragua de las Luces (encargo F12, parte 1). Detrás de la puerta con fuego del mural 5, una fragua del
 * tamaño de una montaña: ríos lentos de lava que no se caminan, puentes de obsidiana y de cadenas, escaleras de
 * basalto, y el techo lleno de jaulitas con las luces robadas que no se ve entero. Por los huecos del abismo se ve la
 * fragua que sigue lejos (`fondo_fragua_lejos_*`).
 *
 * El camino principal:
 *
 *   La Escalera de Ceniza > El Río de Lava > Las Jaulas Colgantes > Los Fuelles > El Horno > El Corazón de la Fragua
 *
 * Ramas que vuelven al camino: El Bosque de Ceniza (de la escalera al horno), La Cárcel de las Luces (del río a los
 * fuelles, con El Carcelero) y el Pasadizo de los Moldes (entre el bosque y la cárcel). Secretos para el olfato de
 * Thor: El Nido de Ceniza (en el bosque) y La Alacena del Herrero (en los fuelles).
 *
 * La lava va en la capa `agua` (con su hoja propia, `meta.lava`) y es la luz grande del piso. Las fuentes frías son la
 * fogata: ahí se enfría la heroína y se moja Thor.
 */

export const FRAGUA_W = 110;
export const FRAGUA_H = 100;

/** Tipos de cuadro del diseño. */
const ROCK = 0, FLOOR = 1, OBS = 2, LAVA = 3, BRIDGE = 4, CHAINB = 5, STAIRS = 6, ASH = 7, VOID = 8, IRON = 9;
const SOLIDS = new Set([ROCK, LAVA, VOID]);

/** Lugares (en cuadros). */
export const LF = {
  portal: [14, 5] as TP,
  arena: [88, 83] as TP,
  puerta: [88, 73] as TP,
  horno: [34, 70] as TP,
  mural: [78, 5] as TP,
  carcelero: [45, 47] as TP,
  nido: [4, 58] as TP,
  alacena: [105, 37] as TP,
};

/** La arena de la Dragona: radio 224, los surtidores a 130 del centro y cada palanca 48 más afuera. */
export const ARENA_DRAGONA = { radio: 224, surtidor: 130, palanca: 48 };

type Rect = [number, number, number, number];
/** Las piezas de la fragua (rectángulos en cuadros, x0 y0 x1 y1 sin incluir el final), en orden: lo de después pisa. */
const PIEZAS: [number, Rect][] = [
  // ---------- 1. La Escalera de Ceniza: la llegada arriba, la escalera de basalto y el descanso; al oeste, el abismo ----------
  [VOID, [2, 2, 8, 33]],
  [OBS, [8, 3, 25, 10]],
  [STAIRS, [11, 10, 21, 17]],
  [FLOOR, [8, 17, 25, 33]],
  // ---------- 2. El Río de Lava: el río de norte a sur con un puente de obsidiana y uno de cadenas ----------
  [FLOOR, [27, 2, 61, 33]],
  [LAVA, [39, 2, 47, 33]],
  [BRIDGE, [39, 20, 47, 24]],
  [CHAINB, [39, 6, 47, 8]],
  [LAVA, [53, 24, 60, 31]],
  // ---------- 3. Las Jaulas Colgantes: el techo de jaulas, el lago de lava y el abismo al este ----------
  [FLOOR, [63, 5, 108, 33]],
  [OBS, [68, 9, 88, 30]],
  [ROCK, [63, 2, 100, 5]],
  [VOID, [100, 2, 108, 17]],
  [LAVA, [93, 19, 107, 31]],
  // ---------- 4. Los Fuelles: dos fosas de lava donde soplan los fuelles ----------
  [FLOOR, [61, 35, 108, 61]],
  [OBS, [76, 44, 92, 58]],
  [LAVA, [74, 40, 80, 46]],
  [LAVA, [86, 51, 93, 56]],
  // ---------- 5. El Bosque de Ceniza (rama) ----------
  [ASH, [3, 35, 29, 61]],
  // ---------- 6. La Cárcel de las Luces (rama): piso de rejas ----------
  [IRON, [31, 35, 59, 61]],
  // ---------- 7. El Horno: la boca, el lago de fuego con dos puentes de cadena y la salida al corazón ----------
  [FLOOR, [3, 63, 65, 98]],
  [ROCK, [20, 63, 48, 67]],
  [LAVA, [7, 76, 65, 84]],
  [CHAINB, [22, 76, 24, 84]],
  [CHAINB, [46, 76, 48, 84]],
  // ---------- 8. El Corazón de la Fragua: la arena, la Puerta Negra detrás y la lava a los costados ----------
  [FLOOR, [67, 66, 107, 98]],
  [LAVA, [67, 66, 78, 85]],
  [LAVA, [67, 92, 78, 98]],
  [LAVA, [100, 66, 107, 98]],
  // ---------- las paredes entre zonas, con sus pasos ----------
  [ROCK, [25, 2, 27, 33]], [FLOOR, [25, 20, 27, 24]],
  [ROCK, [61, 2, 63, 33]], [FLOOR, [61, 14, 63, 18]],
  [ROCK, [2, 33, 108, 35]], [FLOOR, [11, 33, 15, 35]], [IRON, [48, 33, 52, 35]], [FLOOR, [84, 33, 88, 35]],
  [ROCK, [29, 35, 31, 61]], [ASH, [29, 50, 31, 52]],
  [ROCK, [59, 35, 61, 61]], [IRON, [59, 44, 61, 48]],
  [ROCK, [2, 61, 108, 63]], [ASH, [14, 61, 18, 63]], [FLOOR, [61, 61, 65, 63]],
  [ROCK, [65, 63, 67, 99]], [FLOOR, [65, 86, 67, 91]], [FLOOR, [65, 63, 67, 66]],
  [ROCK, [67, 63, 108, 66]],
  // los secretos: el nido de ceniza (un rincón tapado por el bosque) y la alacena del herrero
  [ROCK, [3, 55, 8, 56]], [ROCK, [7, 56, 8, 61]], [ASH, [7, 58, 8, 59]],
  [ROCK, [102, 35, 103, 40]], [ROCK, [103, 40, 108, 41]], [FLOOR, [102, 37, 103, 38]],
];

/** Las zonas: [x0, y0, x1, y1] en cuadros, con sus propiedades y su primer plano. */
const ZONAS: { nombre: string; rect: Rect; props: Record<string, Prop>; frente: string[] }[] = [
  { nombre: 'La Escalera de Ceniza', rect: [2, 2, 26, 34], props: { luz: '#ff8a40', oscuridad: 0.8, niebla: 0.35, particulas: 'brasas', ambiente: 'fragua' }, frente: ['humo_frente_0', 'cadena_colgante_0'] },
  { nombre: 'El Río de Lava', rect: [26, 2, 62, 34], props: { luz: '#ff7020', oscuridad: 0.88, niebla: 0.4, particulas: 'brasas', ambiente: 'lava' }, frente: ['cadena_colgante_1', 'humo_frente_1'] },
  { nombre: 'Las Jaulas Colgantes', rect: [62, 2, 108, 34], props: { luz: '#ffc070', oscuridad: 0.9, niebla: 0.45, particulas: 'brasas', ambiente: 'jaulas' }, frente: ['jaulas_frente_0', 'jaulas_frente_1'] },
  { nombre: 'Los Fuelles', rect: [60, 34, 108, 62], props: { luz: '#ff7020', oscuridad: 0.88, niebla: 0.5, particulas: 'brasas', ambiente: 'fuelles' }, frente: ['cadena_colgante_2', 'humo_frente_0'] },
  { nombre: 'El Bosque de Ceniza', rect: [2, 34, 30, 62], props: { luz: '#c86a3a', oscuridad: 0.92, niebla: 0.55, particulas: 'ceniza', ambiente: 'bosque_ceniza' }, frente: ['humo_frente_1'] },
  { nombre: 'La Cárcel de las Luces', rect: [30, 34, 60, 62], props: { luz: '#ffc070', oscuridad: 0.9, niebla: 0.45, particulas: 'brasas', ambiente: 'carcel', musica_pelea: 'carcelero' }, frente: ['jaulas_frente_1', 'cadena_colgante_0'] },
  { nombre: 'El Horno', rect: [2, 62, 66, 99], props: { luz: '#ff7020', oscuridad: 0.88, niebla: 0.55, particulas: 'brasas', ambiente: 'horno' }, frente: ['humo_frente_0', 'cadena_colgante_1'] },
  { nombre: 'El Corazón de la Fragua', rect: [66, 62, 108, 99], props: { luz: '#ff7020', oscuridad: 0.9, niebla: 0.4, particulas: 'brasas', ambiente: 'jefe', musica: 'jefe_dragona', musica_victoria: 'liberacion' }, frente: ['cadena_colgante_2', 'jaulas_frente_0'] },
];

function makeDesign(): Uint8Array {
  const W = FRAGUA_W, H = FRAGUA_H, t = new Uint8Array(W * H).fill(ROCK);
  for (const [v, [x0, y0, x1, y1]] of PIEZAS) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (x >= 0 && y >= 0 && x < W && y < H) t[y * W + x] = v;
  // la arena de la Dragona: un disco de obsidiana pulida
  const [ax, ay] = LF.arena;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.hypot(x + 0.5 - ax - 0.5, y + 0.5 - ay - 0.5) < 9.2 && t[y * W + x] === FLOOR) t[y * W + x] = OBS;
  organic(t, W, H, 701); organic(t, W, H, 711);
  // el borde del mapa es roca (o abismo)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x < 2 || y < 2 || x >= W - 2 || y >= H - 1) t[y * W + x] = t[y * W + x] === VOID ? VOID : ROCK;
  return t;
}

/**
 * La caverna no es de cajitas: se redondean las esquinas de las salas, las paredes de roca hacen bultos y la lava
 * tiene la orilla quebrada. Nunca se toca un paso entre paredes, un puente, la escalera, la arena ni los secretos.
 */
function organic(t: Uint8Array, W: number, H: number, seed: number) {
  const walk = (v: number) => v === FLOOR || v === OBS || v === ASH || v === IRON;
  const T = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? ROCK : t[y * W + x]);
  const prot = new Uint8Array(W * H);
  const [ax, ay] = LF.arena;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = T(x, y), k = y * W + x;
    // los pasos: roca a los dos lados (o arriba y abajo) a menos de 5 cuadros
    const side = (dx: number, dy: number) => { for (let r = 1; r <= 5; r++) if (T(x + dx * r, y + dy * r) === ROCK) return true; return false; };
    if (walk(v) && ((side(-1, 0) && side(1, 0)) || (side(0, -1) && side(0, 1)))) prot[k] = 1;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const q = T(x + dx, y + dy); if (q === BRIDGE || q === CHAINB || q === STAIRS) prot[k] = 1; }
    if (Math.hypot(x - ax, y - ay) < 11) prot[k] = 1;
    if ((x < 9 && y > 53 && y < 62) || (x > 100 && y > 33 && y < 42)) prot[k] = 1;
    if (Math.hypot(x - LF.portal[0], y - LF.portal[1]) < 4) prot[k] = 1;
  }
  const o = Uint8Array.from(t);
  const O = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? ROCK : o[y * W + x]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x, v = o[k];
    if (prot[k]) continue;
    if (walk(v)) {
      let rock = 0, lava = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const q = O(x + dx, y + dy); if (q === ROCK) rock++; if (q === LAVA) lava++; }
      const n4r = [O(x - 1, y), O(x + 1, y), O(x, y - 1), O(x, y + 1)].filter((q) => q === ROCK).length;
      const n4l = [O(x - 1, y), O(x + 1, y), O(x, y - 1), O(x, y + 1)].filter((q) => q === LAVA).length;
      // las esquinas se redondean y las paredes hacen bultos
      if (rock >= 13 || (n4r && vnoise(x * TILE, y * TILE, 96, seed) > 0.56)) t[k] = ROCK;
      // la lava se come un poco de orilla
      else if (n4l && lava < 12 && vnoise(x * TILE, y * TILE, 80, seed + 2) > 0.64) t[k] = LAVA;
    } else if (v === LAVA) {
      const n4w = [O(x - 1, y), O(x + 1, y), O(x, y - 1), O(x, y + 1)].filter(walk).length;
      let lava = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (O(x + dx, y + dy) === LAVA) lava++;
      // y la tierra entra en la lava en puntas
      if (n4w && (lava <= 11 || vnoise(x * TILE, y * TILE, 80, seed + 4) > 0.66)) t[k] = FLOOR;
    }
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
const PR = FRAGUA.roca.map(RGB), PO = FRAGUA.obsidiana.map(RGB), PL = FRAGUA.lava.map(RGB), PI = FRAGUA.hierro.map(RGB), PC = FRAGUA.carbon.map(RGB);
const ASHC = ['#2a2624', '#3a3532', '#4e4844', '#625a54', '#7a726a'].map(RGB);
const pick = (pal: number[][], l: number) => pal[Math.max(0, Math.min(pal.length - 1, Math.round(l * (pal.length - 1))))];

/**
 * El pintor de la fragua: piso de roca volcánica en lajas irregulares con ceniza en las juntas, obsidiana pulida en
 * las plazas con brillos violeta, ceniza en el bosque, rejas de hierro en la cárcel, escalones de basalto, los puentes
 * de obsidiana con su canto y los de cadenas (planchas de hierro con el fuego que se ve entre las tablas), la roca de
 * la montaña con su cara al sur y el filo naranja de la lava abajo, la orilla de la lava como costra negra que brilla,
 * la lava transparente (abajo va la capa de lava animada) y el abismo transparente (abajo va la fragua lejana).
 */
function paintFragua(t: Uint8Array, seed: number): PaintedTerrain {
  const W = FRAGUA_W, H = FRAGUA_H, PWX = W * TILE, PHX = H * TILE, N = PWX * PHX;
  const img = createRaster(PWX, PHX);
  const kind = new Uint8Array(N), high = new Uint8Array(N);
  const T = (tx: number, ty: number) => (tx < 0 || ty < 0 || tx >= W || ty >= H ? ROCK : t[ty * W + tx]);
  // por pixel: 0 piso, 1 roca, 2 lava, 3 abismo. La roca y el abismo tienen el borde quebrado con ruido; la lava solo
  // se achica (la tierra se come la orilla, nunca al revés: un cuadro que no es lava no tiene lava)
  const cls = new Uint8Array(N), own = new Uint8Array(N);
  for (let y = 0; y < PHX; y++) for (let x = 0; x < PWX; x++) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE), i = y * PWX + x;
    let v = T(tx, ty);
    const nz = (vnoise(x, y, 18, seed + 1) - 0.5) * 22;
    const jx = Math.floor((x + nz) / TILE), jy = Math.floor((y - nz * 0.6) / TILE), w2 = T(jx, jy);
    if (v !== ROCK && v !== LAVA && w2 === ROCK && v !== BRIDGE && v !== CHAINB && v !== STAIRS) v = ROCK;
    else if (v === ROCK && w2 !== ROCK && w2 !== VOID && w2 !== LAVA) v = w2;
    else if (v === LAVA && w2 !== LAVA && w2 !== ROCK && w2 !== VOID && w2 !== BRIDGE && w2 !== CHAINB) v = w2;
    own[i] = v;
    cls[i] = v === VOID ? 3 : v === LAVA ? 2 : v === ROCK ? 1 : 0;
  }
  const below = new Uint16Array(N).fill(999);
  for (let x = 0; x < PWX; x++) { let run = 999; for (let y = PHX - 1; y >= 0; y--) { const i = y * PWX + x; if (cls[i] !== 1) run = 0; else run = Math.min(999, run + 1); below[i] = run; } }
  const ledge = new Uint16Array(N).fill(999);
  for (let x = 0; x < PWX; x++) { let run = 999; for (let y = 0; y < PHX; y++) { const i = y * PWX + x; if (cls[i] <= 1) run = 0; else if (cls[i] === 3) run = Math.min(999, run + 1); else run = 999; ledge[i] = run; } }
  const voidM = new Uint8Array(N), rockM = new Uint8Array(N), lavaM = new Uint8Array(N);
  for (let i = 0; i < N; i++) { voidM[i] = cls[i] === 3 ? 1 : 0; rockM[i] = cls[i] === 1 ? 1 : 0; lavaM[i] = cls[i] === 2 ? 1 : 0; }
  const dVoid = distTo(voidM, PWX, PHX), dRock = distTo(rockM, PWX, PHX), dLava = distTo(lavaM, PWX, PHX);
  const set = (i: number, c: number[], a = 255) => { img.data[i * 4] = c[0]; img.data[i * 4 + 1] = c[1]; img.data[i * 4 + 2] = c[2]; img.data[i * 4 + 3] = a; };
  const mix = (p: number[], q: number[], k: number) => p.map((v, j) => Math.round(v + (q[j] - v) * Math.max(0, Math.min(1, k))));
  const FACE = 46, LEDGE = 40;
  for (let y = 0; y < PHX; y++) for (let x = 0; x < PWX; x++) {
    const i = y * PWX + x, v = own[i];
    // ---------- la roca de la montaña ----------
    if (cls[i] === 1) {
      high[i] = 1;
      const b = below[i];
      if (b <= FACE) {
        kind[i] = 3;
        // estratos de roca volcánica que se quiebran, con vetas de obsidiana y el rebote naranja abajo
        const strata = Math.floor((y + vnoise(x, 0, 40, seed + 6) * 18 + x * 0.1) / 9);
        let l = 0.55 + (hash(strata, x >> 4, seed + 7) - 0.5) * 0.2 - (1 - b / FACE) * 0.3;
        if ((y + Math.floor(vnoise(x, 0, 40, seed + 6) * 18)) % 9 === 0) l -= 0.18;
        let c = pick(PR, l);
        if (hash(strata, x >> 3, seed + 8) > 0.9) c = pick(PO, l + 0.15);
        if (b < 10) c = mix(c, PL[2], (1 - b / 10) * 0.35);
        if (b <= 2) c = [24, 8, 4];
        set(i, c);
      } else {
        kind[i] = 6;
        const n = vnoise(x, y, 48, seed + 10) * 0.6 + vnoise(x, y, 12, seed + 11) * 0.4;
        let c = n > 0.62 ? PR[1] : PR[0];
        if (b - FACE <= 2) c = PR[4]; else if (b - FACE <= 4) c = PR[2];
        set(i, c);
      }
      continue;
    }
    // ---------- la lava: transparente (va la capa de lava animada debajo) ----------
    if (cls[i] === 2) { kind[i] = 4; set(i, [0, 0, 0], 0); continue; }
    // ---------- el abismo: transparente; arriba la cara de la roca que baja con un resplandor rojo hondo ----------
    if (cls[i] === 3) {
      kind[i] = 6;
      const l0 = ledge[i];
      if (l0 <= LEDGE) {
        const row = Math.floor(l0 / 9), off = row % 2 ? 9 : 0, joint = l0 % 9 === 0 || (x + off) % 18 === 0;
        const k = 1 - l0 / LEDGE;
        let c = joint ? PR[1] : pick(PR, 0.45 + (hash(Math.floor((x + off) / 18), row, seed + 12) - 0.5) * 0.14 - (1 - k) * 0.25);
        if (l0 < 3) c = PR[5];
        set(i, c, Math.round(255 * Math.min(1, k * 1.6)));
      } else set(i, [0, 0, 0], 0);
      continue;
    }
    // ---------- pisos ----------
    let c: number[];
    if (v === FLOOR || v === OBS) {
      kind[i] = 2;
      if (v === OBS) {
        // obsidiana pulida en losas hexagonales, con brillos violeta y alguna veta
        const hx = x / 26, hy = y / 22.5, row = Math.floor(hy), off = row % 2 ? 0.5 : 0, col = Math.floor(hx + off);
        const fx = hx + off - col, fy = hy - row, edge = Math.min(fx, 1 - fx, fy, 1 - fy);
        let l = 0.42 + (hash(col, row, seed + 23) - 0.5) * 0.12 + vnoise(x, y, 60, seed + 24) * 0.1;
        if (edge < 0.04) l = 0.12; else if (fy < 0.14 && fx < 0.5) l += 0.14;
        c = pick(PO, l);
        if (edge > 0.1 && hash(x, y, seed + 25) > 0.993) c = [184, 150, 220];
        if (Math.abs(fx - fy * 0.6 - 0.2) < 0.02 && hash(col, row, seed + 26) > 0.7) c = PO[5];
      } else {
        // roca volcánica en lajas irregulares, con ceniza en las juntas
        const gxs = x / 22, gys = y / 18, cx0 = Math.floor(gxs), cy0 = Math.floor(gys);
        let d1 = 9, d2 = 9, best = 0;
        for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
          const qx = cx0 + k, qy = cy0 + j;
          const px = qx + 0.5 + (hash(qx, qy, seed + 18) - 0.5) * 0.7, py = qy + 0.5 + (hash(qy, qx, seed + 19) - 0.5) * 0.7;
          const dd = Math.hypot(gxs - px, (gys - py) * 1.1);
          if (dd < d1) { d2 = d1; d1 = dd; best = qx * 7919 + qy; } else if (dd < d2) d2 = dd;
        }
        const edge = d2 - d1, st = hash(best, 0, seed + 20);
        let l = 0.5 + st * 0.18 + vnoise(x, y, 70, seed + 21) * 0.12 - d1 * 0.12;
        if (edge < 0.05) l = 0.1;
        else if (edge < 0.1) l -= 0.15;
        c = pick(PR, l);
        if (edge < 0.08 && vnoise(x, y, 9, seed + 22) > 0.55) c = ASHC[2];
        if (st > 0.93 && edge > 0.12) c = pick(PR, 0.25);
      }
    } else if (v === ASH) {
      // ceniza del bosque: gris y suave, con motas de carbón y alguna brasita
      kind[i] = 1;
      const n = vnoise(x, y, 20, seed + 31) * 0.6 + vnoise(x, y, 5, seed + 32) * 0.4;
      c = pick(ASHC, 0.15 + n * 0.55);
      if (hash(x, y, seed + 33) > 0.94) c = PC[1];
      if (hash(x, y, seed + 34) > 0.9992) c = PL[3];
    } else if (v === IRON) {
      // rejas de hierro de la cárcel: planchas con agujeros cuadrados, oscuro abajo
      kind[i] = 2;
      const gx = x % 16, gy = y % 16, plate = Math.floor(x / 64) + Math.floor(y / 64);
      if (gx >= 5 && gx <= 10 && gy >= 5 && gy <= 10) c = gx === 5 || gy === 5 ? [10, 6, 6] : [22, 8, 6];
      else { let l = 0.5 + (hash(plate, 0, seed + 35) - 0.5) * 0.15 + (gx < 2 || gy < 2 ? 0.15 : 0) - (gx > 13 || gy > 13 ? 0.15 : 0); c = pick(PI, l); }
      if (x % 64 === 0 || y % 64 === 0) c = PI[0];
      if ((x % 64 === 3 || x % 64 === 60) && (y % 64 === 3 || y % 64 === 60)) c = PI[4];
    } else if (v === STAIRS) {
      // escalones de basalto: la pisada clara, el canto oscuro, en columnas hexagonales cortadas
      kind[i] = 5;
      const s = y % 10;
      let l = s < 2 ? 0.8 : s < 7 ? 0.55 : 0.2;
      l += (hash(x >> 3, y >> 3, seed + 35) - 0.5) * 0.1;
      c = pick(PO, l);
      if (x % 24 === 0) c = PO[0];
    } else if (v === BRIDGE) {
      // el puente de obsidiana: lajas largas a lo largo, con el canto claro y gruesas cadenas a los costados
      kind[i] = 2;
      const along = T(Math.floor(x / TILE) - 1, Math.floor(y / TILE)) === BRIDGE || T(Math.floor(x / TILE) + 1, Math.floor(y / TILE)) === BRIDGE;
      const a = along ? x : y, b = along ? y : x;
      const plank = Math.floor(b / 16), w2 = (a + plank * 13) % 48;
      let l = 0.48 + (hash(plank, Math.floor((a + plank * 13) / 48), seed + 36) - 0.5) * 0.14;
      if (b % 16 === 0 || w2 === 0) l = 0.15;
      c = pick(PO, l);
      if (dLava[i] <= 3) c = dLava[i] <= 1 ? PO[5] : PO[4];
    } else {
      // el puente de cadenas: planchas de hierro sobre cadenas, con el fuego que se ve rojo entre las planchas
      kind[i] = 2;
      const along = T(Math.floor(x / TILE), Math.floor(y / TILE) - 1) === CHAINB || T(Math.floor(x / TILE), Math.floor(y / TILE) + 1) === CHAINB;
      const a = along ? y : x, b = along ? x : y;
      const gap = a % 12 >= 10;
      if (gap) c = mix(PL[1], PL[3], 0.5 + 0.5 * Math.sin(b * 0.3));
      else { const l = 0.55 - (a % 12) * 0.03 + (hash(Math.floor(a / 12), 0, seed + 37) - 0.5) * 0.15; c = pick(PI, l); if (a % 12 === 0) c = PI[4]; }
      const side = along ? (x % TILE) : (y % TILE);
      const sx = Math.floor(x / TILE), sy = Math.floor(y / TILE), other = along ? T(sx - 1, sy) === CHAINB : T(sx, sy - 1) === CHAINB, other2 = along ? T(sx + 1, sy) === CHAINB : T(sx, sy + 1) === CHAINB;
      if ((!other && side < 3) || (!other2 && side > 28)) c = (a % 6) < 3 ? PI[3] : PI[1];
    }
    // al pie de la roca: la sombra de contacto (oclusión) y la ceniza juntada
    {
      let up = 0;
      for (let k = 1; k <= 12; k++) { const j = (y - k) * PWX + x; if (y - k >= 0 && cls[j] === 1) { up = 13 - k; break; } }
      if (up) c = mix(c, [6, 3, 3], (up / 12) * 0.6);
      if (dRock[i] < 7 && hash(x, y, seed + 38) > 0.68 + dRock[i] * 0.04) c = mix(c, ASHC[3], 0.7);
    }
    // la orilla de la lava: costra negra que brilla naranja en las grietas, más caliente cuanto más cerca
    if (v !== BRIDGE && v !== CHAINB && dLava[i] <= 9) {
      const k = 1 - dLava[i] / 10;
      c = mix(c, [16, 6, 4], k * 0.7);
      if (vnoise(x, y, 5, seed + 39) > 0.62 - k * 0.12 && dLava[i] <= 7) c = mix(c, PL[dLava[i] <= 2 ? 4 : 3], k);
    }
    // el borde del piso sobre el abismo: el canto de la roca
    if (dVoid[i] <= 2) c = PR[5];
    if (hash(x, y, seed + 40) > 0.9988) c = PL[3];
    set(i, c);
  }
  // por cuadro
  const solid = new Uint8Array(W * H), waterTiles = new Uint8Array(W * H), tileKind = new Uint8Array(W * H), tileHigh = new Uint8Array(W * H);
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    const k = ty * W + tx, v = t[k];
    tileHigh[k] = v === ROCK ? 1 : 0;
    tileKind[k] = v === ROCK || v === VOID ? 6 : v === LAVA ? 4 : v === STAIRS ? 5 : v === ASH ? 1 : 2;
    solid[k] = SOLIDS.has(v) ? 1 : 0;
    waterTiles[k] = v === LAVA ? 1 : 0;
  }
  return { img, kind, high, solid, waterTiles, tileKind, tileHigh };
}

/** Variante espejada con otro tono (como en el Puerto y la Ciudad): la utilería no se repite igual en una pantalla. */
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
  arbol_ceniza_0: [0.92, 0.94, 0.96], arbol_ceniza_1: [0.95, 0.94, 0.92], arbol_ceniza_2: [0.9, 0.92, 0.96], arbol_ceniza_3: [0.96, 0.93, 0.92],
  brasero_0: [0.95, 0.94, 0.96], brasero_1: [0.94, 0.93, 0.95], brasero_2: [0.96, 0.94, 0.92],
  pila_carbon_0: [0.94, 0.94, 0.96], pila_carbon_1: [0.96, 0.95, 0.94], yunque: [0.95, 0.94, 0.96], crisol: [0.96, 0.94, 0.92],
  molde_0: [0.94, 0.94, 0.96], molde_1: [0.95, 0.94, 0.95], carretilla_fragua: [0.94, 0.93, 0.95],
  pila_jaulas_0: [0.95, 0.94, 0.96], pila_jaulas_1: [0.94, 0.95, 0.96],
  columna_basalto_0: [0.94, 0.92, 0.98], columna_basalto_1: [0.96, 0.94, 0.98], columna_basalto_2: [0.92, 0.92, 0.96],
  celda_jaula_0: [0.95, 0.94, 0.96], celda_jaula_1: [0.94, 0.94, 0.95], fuelle_gigante_0: [0.95, 0.93, 0.92],
};

/** Los objetos que usa el Mundo 6: los suyos, los portales y lo prestado. */
export function fraguaMapObjects(): WorldObject[] {
  const prestados = new Set(['cartel', 'aviso_jefe']);
  const base = [...fraguaObjectsA(), ...fraguaObjectsB()];
  return [
    ...base, ...base.filter((o) => VARIANTES[o.name]).map((o) => variantB(o, VARIANTES[o.name])),
    galeriasObjects().find((o) => o.name === 'figura_ojos')!,
    ...[...forestObjects(), ...landmarkObjects()].filter((o) => prestados.has(o.name)),
    ...premiumPortals(['azul', 'rojo', 'brasa']),
  ];
}

export interface FraguaReport {
  ramas: { id: string; nombre: string; medio: TP; tapar: TP[] }[];
  secretos: string[];
  pantallas: { nombre: string; x: number; y: number; objetos: string[] }[];
}

export function fraguaMap(seed = 666): BigMap & { premium: FraguaReport } {
  const W = FRAGUA_W, H = FRAGUA_H;
  const d = makeDesign();
  const terrain = paintFragua(d, seed);
  const objects = fraguaMapObjects();
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
  /** la fuente fría: la fogata del piso (guarda, cura, enfría y es la tienda) */
  let nFuente = 0;
  const fuente = (tx: number, ty: number, id: string, extra: Record<string, Prop> = {}) => {
    placeT('fuente_fria', tx, ty);
    reserve(tx, ty, 1);
    const [x, y] = near(tx, ty + 2, 3);
    entities.push({ tipo: 'punto_guardado', x: T(x), y: T(y), props: { id, nombre: zonaDe(tx, ty), fuente_fria: true, objeto: 'fuente_fria', ...extra } });
    reserve(x, y, 1);
    nFuente++;
  };
  /** un charco frío: el objeto (capa suelo) y la entidad en el mismo punto */
  let nCharco = 0;
  const charco = (px: number, py: number) => {
    place('charco_frio', px, py);
    entities.push({ tipo: 'charco_frio', x: Math.round(px), y: Math.round(py), props: { id: `charco_${nCharco++}`, zona: zonaDe(Math.floor(px / TILE), Math.floor(py / TILE)) } });
  };
  /** un fuelle gigante: el objeto y la entidad en el mismo punto (el juego los hace soplar a todos juntos) */
  let nFuelle = 0;
  const fuelle = (sprite: string, tx: number, ty: number) => {
    placeT(sprite, tx, ty);
    entities.push({ tipo: 'fuelle', x: T(tx), y: ty * TILE + TILE - 4, props: { id: `fuelle_${nFuelle++}`, zona: zonaDe(tx, ty), objeto: sprite } });
  };

  // ---------- 1. La Escalera de Ceniza: el portal arriba, la escalera de basalto y la primera fuente fría ----------
  const [px0, py0] = LF.portal;
  entities.push({ tipo: 'portal_llegada', x: T(px0), y: T(py0), props: { color: 'brasa', portal: 'portal_brasa' } });
  entities.push({ tipo: 'portal_volver', x: T(px0), y: T(py0 + 1), props: { destino: 'mundo5' } });
  reserve(px0, py0, 1);
  entities.push({ tipo: 'jugador_inicio', x: T(px0 + 3), y: T(py0) });
  entities.push({ tipo: 'thor_inicio', x: T(px0 + 3), y: T(py0 + 1) });
  reserve(px0 + 3, py0, 1);
  placeT('brasero_1', 9, 4); placeT('brasero_1_b', 23, 4);
  placeT('columna_basalto_0', 9, 9); placeT('columna_basalto_2_b', 23, 9);
  fuente(16, 22, 'escalera', { tutorial: true });
  charco(T(11), T(27)); charco(T(21), T(30));
  chest(23, 31, 'madera');
  placeT('pila_carbon_0', 10, 31); placeT('yunque', 20, 26); placeT('pila_jaulas_0', 23, 13); placeT('brasero_2', 9, 20); placeT('carretilla_fragua', 19, 31);
  enemy('hollin', 'Hollín', 12, 29); enemy('hollin', 'Hollín', 22, 19);

  // ---------- 2. El Río de Lava: dos puentes, las primeras grietas y las primeras jaulas ----------
  fuente(52, 9, 'rio');
  charco(T(31), T(12)); charco(T(56), T(17)); charco(T(32), T(30));
  placeT('brasero_0', 37, 18); placeT('brasero_2', 49, 25);
  placeT('crisol', 34, 4); placeT('molde_0', 57, 4); placeT('carretilla_fragua', 30, 26);
  chest(58, 20, 'reforzado');
  enemy('hollin', 'Hollín', 33, 16); enemy('hollin', 'Hollín', 50, 15); enemy('hollin', 'Hollín', 55, 30);
  enemy('salamandra_brasa', 'Salamandra de Brasa', 51, 21); enemy('salamandra_brasa', 'Salamandra de Brasa', 32, 8);
  ent('figura', 57, 12, { id: 'rio', zona: 'El Río de Lava' });

  // ---------- 3. Las Jaulas Colgantes: el mural, el lago de lava y los faroleros cargando sus jaulas ----------
  place('mural_6', LF.mural[0] * TILE, (LF.mural[1]) * TILE - 2);
  entities.push({ tipo: 'mural', x: LF.mural[0] * TILE, y: (LF.mural[1] + 1) * TILE, props: { pieza: 6 } });
  reserve(LF.mural[0], LF.mural[1], 1);
  placeT('brasero_0', 74, 6);
  fuente(72, 23, 'jaulas');
  charco(T(66), T(10)); charco(T(90), T(14)); charco(T(84), T(31));
  placeT('pila_jaulas_0', 66, 30); placeT('pila_jaulas_1', 95, 9); placeT('brasero_1', 88, 7); placeT('brasero_2_b', 66, 18);
  placeT('columna_basalto_1', 92, 16);
  chest(96, 8, 'madera');
  enemy('farolero_cadenas', 'Farolero de Cadenas', 80, 14, { jaula: true, luz: 'catedral', zona: 'Las Jaulas Colgantes' });
  enemy('farolero_cadenas', 'Farolero de Cadenas', 86, 26, { jaula: true, luz: 'faro', zona: 'Las Jaulas Colgantes' });
  enemy('hollin', 'Hollín', 70, 12); enemy('hollin', 'Hollín', 98, 12); enemy('hollin', 'Hollín', 76, 28);
  ent('figura', 83, 8, { id: 'jaulas', zona: 'Las Jaulas Colgantes' });

  // ---------- 4. Los Fuelles: los dos fuelles gigantes que marcan el ritmo y muchas grietas ----------
  fuelle('fuelle_gigante_0', 70, 46);
  fuelle('fuelle_gigante_1', 96, 56);
  fuente(83, 51, 'fuelles');
  charco(T(64), T(38)); charco(T(98), T(42)); charco(T(70), T(58));
  placeT('brasero_0_b', 79, 43); placeT('brasero_2', 90, 47); placeT('yunque_b', 86, 59); placeT('pila_carbon_1', 104, 46); placeT('molde_1', 64, 52);
  enemy('salamandra_brasa', 'Salamandra de Brasa', 75, 50); enemy('salamandra_brasa', 'Salamandra de Brasa', 94, 40); enemy('salamandra_brasa', 'Salamandra de Brasa', 88, 58);
  enemy('farolero_cadenas', 'Farolero de Cadenas', 98, 47, { jaula: true, luz: 'ciudad', zona: 'Los Fuelles' });
  enemy('farolero_cadenas', 'Farolero de Cadenas', 68, 55);
  // la alacena del herrero (secreto): un rincón detrás de la pared con un cofre dorado
  chest(LF.alacena[0], LF.alacena[1], 'dorado', { secreto: true, pista: 'alacena_herrero' });

  // ---------- 5. El Bosque de Ceniza (rama): árboles de carbón con brasas por hojas, hollines y el nido de Thor ----------
  {
    const spots: [number, number, string][] = [[6, 39, 'arbol_ceniza_0'], [14, 37, 'arbol_ceniza_1'], [24, 39, 'arbol_ceniza_2_b'], [9, 46, 'arbol_ceniza_3'], [19, 45, 'arbol_ceniza_0_b'], [26, 50, 'arbol_ceniza_1_b'], [5, 52, 'arbol_ceniza_2'], [13, 53, 'arbol_ceniza_3_b'], [22, 57, 'arbol_ceniza_1'], [11, 59, 'arbol_ceniza_0']];
    for (const [x, y, s] of spots) placeT(s, x, y);
  }
  charco(T(17), T(41)); charco(T(8), T(56));
  enemy('hollin', 'Hollín', 11, 42); enemy('hollin', 'Hollín', 21, 50); enemy('hollin', 'Hollín', 16, 57); enemy('hollin', 'Hollín', 26, 44);
  chest(LF.nido[0], LF.nido[1], 'dorado', { secreto: true, pista: 'nido_ceniza' });
  chest(25, 59, 'madera');

  // ---------- 6. La Cárcel de las Luces (rama): las celdas y la sala del Carcelero con sus jaulas ----------
  placeT('celda_jaula_0', 35, 42); placeT('celda_jaula_1', 55, 42); placeT('celda_jaula_1_b', 35, 57); placeT('celda_jaula_0_b', 55, 57);
  placeT('brasero_1', 40, 37); placeT('brasero_1_b', 50, 37);
  enemy('carcelero', 'El Carcelero', LF.carcelero[0], LF.carcelero[1], { elite: true });
  reserve(LF.carcelero[0], LF.carcelero[1], 1);
  chest(45, 57, 'dorado', { guardado_por: 'carcelero' });
  charco(T(33), T(48)); charco(T(57), T(52));
  enemy('farolero_cadenas', 'Farolero de Cadenas', 38, 53);
  enemy('farolero_cadenas', 'Farolero de Cadenas', 53, 44, { jaula: true, luz: 'bosque', zona: 'La Cárcel de las Luces' });

  // ---------- 7. El Horno: la boca enorme, el lago de fuego con los puentes de cadena y un fuelle ----------
  place('boca_horno', T(LF.horno[0]), (LF.horno[1] + 1) * TILE - 4);
  fuelle('fuelle_gigante_0_b', 54, 71);
  placeT('brasero_1', 28, 71); placeT('brasero_1_b', 40, 71); placeT('pila_jaulas_1_b', 45, 70); placeT('columna_basalto_1', 21, 70);
  fuente(56, 91, 'horno');
  charco(T(8), T(68)); charco(T(14), T(94)); charco(T(40), T(92));
  placeT('brasero_2', 12, 72); placeT('brasero_0', 60, 88); placeT('carretilla_fragua_b', 8, 89); placeT('pila_carbon_0_b', 30, 95); placeT('crisol_b', 50, 95); placeT('molde_1_b', 20, 87);
  chest(4, 96, 'reforzado');
  enemy('salamandra_brasa', 'Salamandra de Brasa', 30, 73); enemy('salamandra_brasa', 'Salamandra de Brasa', 36, 89);
  enemy('hollin', 'Hollín', 12, 66); enemy('hollin', 'Hollín', 26, 92); enemy('hollin', 'Hollín', 48, 88);
  enemy('farolero_cadenas', 'Farolero de Cadenas', 58, 68, { jaula: true, luz: 'galerias', zona: 'El Horno' });
  ent('figura', 40, 72, { id: 'horno', zona: 'El Horno' });

  // ---------- 8. El Corazón de la Fragua: la arena de la Dragona y la Puerta Negra detrás ----------
  const [ax, ay] = LF.arena, acx = T(ax), acy = T(ay);
  place('puerta_negra', T(LF.puerta[0]), (LF.puerta[1] + 1) * TILE - 4);
  entities.push({ tipo: 'puerta_negra', x: T(LF.puerta[0]), y: (LF.puerta[1] + 1) * TILE - 4, props: { id: 'puerta_negra', objeto: 'puerta_negra', cerrada: true, destino: 'mundo7' } });
  entities.push({ tipo: 'figura', x: T(LF.puerta[0]), y: (LF.puerta[1] + 1) * TILE - 70, props: { id: 'puerta_negra', zona: 'El Corazón de la Fragua', alto: true } });
  entities.push({ tipo: 'arena_jefe', x: acx, y: acy, props: { radio: ARENA_DRAGONA.radio, surtidores: 4 } });
  entities.push({ tipo: 'jefe', x: acx, y: acy, props: { enemigo: 'dragona_brasa', nombre: 'La Dragona de Brasa', titulo: 'La que guarda el fuego hecho de luces' } });
  // los cuatro surtidores en diagonal, cada uno con su palanca más afuera
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy], k) => {
    const u = Math.SQRT1_2, x = acx + sx * u * ARENA_DRAGONA.surtidor, y = acy + sy * u * ARENA_DRAGONA.surtidor;
    const lx = acx + sx * u * (ARENA_DRAGONA.surtidor + ARENA_DRAGONA.palanca), ly = acy + sy * u * (ARENA_DRAGONA.surtidor + ARENA_DRAGONA.palanca);
    place('surtidor', Math.round(x), Math.round(y));
    entities.push({ tipo: 'surtidor', x: Math.round(x), y: Math.round(y), props: { id: `surtidor_${k}`, objeto: 'surtidor' } });
    place('palanca', Math.round(lx), Math.round(ly));
    entities.push({ tipo: 'palanca', x: Math.round(lx), y: Math.round(ly), props: { id: `palanca_${k}`, surtidor: `surtidor_${k}`, objeto: 'palanca' } });
  });
  // las cadenas de la Dragona: del borde de la arena (norte, sur, este y oeste) hasta ella
  [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([sx, sy], k) => {
    entities.push({ tipo: 'cadena', x: acx + sx * (ARENA_DRAGONA.radio - 8), y: acy + sy * (ARENA_DRAGONA.radio - 8), props: { id: `cadena_${k}`, hacia_x: acx, hacia_y: acy, objeto: 'cadena_dragona' } });
  });
  // charcos fríos en el borde de la arena
  charco(acx - 168, acy + 96); charco(acx + 170, acy + 92);
  entities.push({ tipo: 'portal_jefe', x: acx, y: T(95), props: { color: 'brasa', portal: 'portal_brasa', destino: 'mundo7' } });
  chest(96, 95, 'dorado', { tras_jefe: true });
  placeT('brasero_1', 80, 70); placeT('brasero_1_b', 96, 70); placeT('crisol', 98, 73); placeT('columna_basalto_2', 98, 80); placeT('pila_jaulas_1', 79, 77); placeT('yunque', 80, 73); placeT('columna_basalto_0_b', 82, 96); placeT('columna_basalto_1_b', 98, 92);
  charco(T(70), T(88));
  // la arena queda libre para pelear (nada de utilería adentro)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.hypot(x + 0.5 - acx / TILE, y + 0.5 - acy / TILE) * TILE < ARENA_DRAGONA.radio + 16) occ[at(x, y)] = 1;

  // ---------- la utilería de cada zona: sin montarse, sin repetir en una pantalla, sin cortar pasos ----------
  {
    let rs = (seed * 7919) >>> 0;
    const rnd = () => { rs = (rs + 0x6d2b79f5) >>> 0; let t = Math.imul(rs ^ (rs >>> 15), rs | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const avoid = new Uint8Array(W * H);
    for (const e of entities) { const tx = Math.floor(e.x / TILE), ty = Math.floor(e.y / TILE); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(tx + dx, ty + dy) >= 0) avoid[at(tx + dx, ty + dy)] = 1; }
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
          if (i < 0 || solid[i] || occ[i] || avoid[i] || d[i] === STAIRS || d[i] === BRIDGE || d[i] === CHAINB) continue;
          if (decos.some((q) => q.sprite === sprite && Math.abs(q.x - px) < 960 && Math.abs(q.y - py) < 540)) continue;
          const box: number[] = [];
          let bad = false;
          solidBox(sprite, px, py, (kk) => { box.push(kk); if (solid[kk] || occ[kk] || avoid[kk]) bad = true; });
          if (bad) continue;
          if (cellsOf(sprite, px, py).some((cc) => bodies.has(cc))) continue;
          const fx0 = Math.floor((px - o.anchor[0] + 4) / TILE), fx1 = Math.floor((px - o.anchor[0] + o.w - 5) / TILE);
          let onFloor = true;
          for (let x = fx0; x <= fx1; x++) { const j = at(x, ty); if (j < 0 || SOLIDS.has(d[j])) onFloor = false; }
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
    dress([9, 18, 24, 32], ['pila_carbon_1', 'molde_0', 'crisol', 'pila_jaulas_1', 'columna_basalto_1'], 4);
    dress([28, 3, 60, 32], ['pila_carbon_0', 'pila_carbon_1', 'yunque', 'molde_1', 'pila_jaulas_0', 'columna_basalto_0', 'columna_basalto_2', 'brasero_1'], 12);
    dress([64, 6, 106, 32], ['pila_carbon_0', 'yunque', 'molde_0', 'crisol', 'carretilla_fragua', 'columna_basalto_0', 'columna_basalto_2', 'brasero_0', 'pila_jaulas_1'], 12);
    dress([62, 36, 106, 60], ['pila_carbon_0', 'yunque', 'molde_0', 'crisol', 'carretilla_fragua', 'columna_basalto_1', 'columna_basalto_2', 'brasero_1', 'pila_jaulas_0'], 12);
    dress([3, 36, 28, 60], ['pila_carbon_0', 'pila_carbon_1', 'columna_basalto_0', 'columna_basalto_2'], 5);
    dress([32, 36, 58, 60], ['pila_jaulas_0', 'pila_jaulas_1', 'molde_0', 'brasero_2', 'yunque', 'carretilla_fragua'], 8);
    dress([4, 64, 64, 97], ['pila_carbon_1', 'yunque', 'molde_0', 'crisol', 'columna_basalto_0', 'columna_basalto_2', 'brasero_1', 'pila_jaulas_0', 'pila_jaulas_1'], 14);
  }

  // ---------- las jaulas con las luces robadas: al menos 4 por zona, mezcladas, con el candado al alcance ----------
  const walkable = (x: number, y: number) => at(x, y) >= 0 && !solid[at(x, y)];
  let nJaula = 0;
  const luzDe = (k: number): LuzId => LUZ_IDS[(k * 3 + Math.floor(hash(k, 7, seed + 81) * 5)) % 5];
  const jaula = (tx: number, ty: number, extra: Record<string, Prop> = {}) => {
    const luz = luzDe(nJaula);
    entities.push({ tipo: 'jaula', x: T(tx), y: T(ty), props: { id: `jaula_${nJaula}`, luz, zona: zonaDe(tx, ty), objeto: `jaula_luz_${luz}`, ...extra } });
    occ[at(tx, ty)] = 1;
    nJaula++;
  };
  // libre para una jaula: el cuadro y los 8 de alrededor se caminan, nadie lo ocupa, y no tapa un puente
  const freeCage = (x: number, y: number) => {
    if (occ[at(x, y)] || d[at(x, y)] === BRIDGE || d[at(x, y)] === CHAINB) return false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!walkable(x + dx, y + dy)) return false;
    // ni pegada al cuerpo de un objeto (se vería metida adentro)
    for (const q of decos) { const o = byName.get(q.sprite)!; if (o.layer === 'suelo') continue; if (Math.abs(q.x - T(x)) < o.w / 2 + 8 && T(y) - (q.y - o.h) > -8 && T(y) - q.y < 12) return false; }
    return true;
  };
  const CUANTAS: Record<string, number> = { 'La Escalera de Ceniza': 5, 'El Río de Lava': 6, 'Las Jaulas Colgantes': 9, 'Los Fuelles': 5, 'El Bosque de Ceniza': 4, 'La Cárcel de las Luces': 4, 'El Horno': 6, 'El Corazón de la Fragua': 4 };
  for (const z of ZONAS) {
    const cand: [number, number][] = [];
    for (let y = z.rect[1]; y < z.rect[3]; y++) for (let x = z.rect[0]; x < z.rect[2]; x++) {
      if (z.nombre === 'El Corazón de la Fragua' && Math.hypot(T(x) - acx, T(y) - acy) < ARENA_DRAGONA.radio + 24) continue;
      if (z.nombre === 'La Cárcel de las Luces' && Math.hypot(x - LF.carcelero[0], y - LF.carcelero[1]) < 7) continue;
      if (freeCage(x, y)) cand.push([x, y]);
    }
    const chosen: [number, number][] = [];
    for (let t = 0; t < cand.length * 3 && chosen.length < CUANTAS[z.nombre]; t++) {
      const c = cand[Math.floor(hash(t, chosen.length, seed + 83 + z.nombre.length) * cand.length)];
      if (chosen.some((q) => Math.hypot(q[0] - c[0], q[1] - c[1]) < 4)) continue;
      chosen.push(c);
    }
    for (const [x, y] of chosen) jaula(x, y);
  }
  // las jaulas de la cárcel: ocho alrededor de la sala del Carcelero (se abren todas juntas al vencerlo)
  {
    const [cx, cy] = LF.carcelero;
    let k = 0;
    for (let a = 0; a < 16 && k < 8; a++) {
      const ang = (a / 8) * Math.PI * 2 + (a >= 8 ? Math.PI / 8 : 0), rr = a >= 8 ? 6 : 5;
      const x = Math.round(cx + Math.cos(ang) * rr), y = Math.round(cy + Math.sin(ang) * rr * 0.8);
      if (!freeCage(x, y)) continue;
      jaula(x, y, { carcel: true });
      k++;
    }
  }

  // ---------- las grietas que respiran: parches de 2 o 3 cuadros, siempre caminables, con su fase ----------
  {
    let nG = 0;
    const PARCHES: Record<string, number> = { 'La Escalera de Ceniza': 2, 'El Río de Lava': 6, 'Las Jaulas Colgantes': 5, 'Los Fuelles': 10, 'El Bosque de Ceniza': 2, 'La Cárcel de las Luces': 3, 'El Horno': 7, 'El Corazón de la Fragua': 3 };
    const usado = new Uint8Array(W * H);
    for (const e of entities) { const tx = Math.floor(e.x / TILE), ty = Math.floor((e.y - 1) / TILE); if (at(tx, ty) >= 0) usado[at(tx, ty)] = 1; }
    for (const z of ZONAS) {
      let hechos = 0;
      for (let t = 0; t < 400 && hechos < PARCHES[z.nombre]; t++) {
        const gw = 2, gh = 2;
        const x0 = z.rect[0] + Math.floor(hash(t, 3, seed + 93 + hechos) * (z.rect[2] - z.rect[0] - gw)), y0 = z.rect[1] + Math.floor(hash(t, 4, seed + 95 + hechos) * (z.rect[3] - z.rect[1] - gh));
        let ok = true;
        for (let y = y0 - 1; y < y0 + gh + 1 && ok; y++) for (let x = x0 - 1; x < x0 + gw + 1 && ok; x++) {
          const i = at(x, y);
          if (i < 0 || solid[i] || usado[i]) ok = false;
          else if (d[i] === BRIDGE || d[i] === CHAINB || d[i] === STAIRS) ok = false;
        }
        if (!ok) continue;
        if (z.nombre === 'El Corazón de la Fragua' && Math.hypot(T(x0) - acx, T(y0) - acy) < ARENA_DRAGONA.radio + 80) continue;
        for (let y = y0 - 1; y < y0 + gh + 1; y++) for (let x = x0 - 1; x < x0 + gw + 1; x++) usado[at(x, y)] = 1;
        entities.push({ tipo: 'grieta', x: x0 * TILE, y: y0 * TILE, props: { id: `grieta_${nG}`, width: gw * TILE, height: gh * TILE, fase: Math.round(hash(nG, 5, seed + 97) * 100) / 100, zona: z.nombre } });
        nG++; hechos++;
      }
    }
  }

  // ---------- zonas y postales ----------
  const zones: MapZone[] = [];
  for (const z of ZONAS) {
    const [x0, y0, x1, y1] = z.rect;
    zones.push({ nombre: z.nombre, x: x0 * TILE, y: y0 * TILE, w: (x1 - x0) * TILE, h: (y1 - y0) * TILE, props: { musica: 'ninguna', descubrir: true, ...z.props, frente: z.frente.join(',') } });
  }
  zones.push({ nombre: 'El Nido de Ceniza', x: 2 * TILE, y: 56 * TILE, w: 5 * TILE, h: 5 * TILE, props: { musica: 'ninguna', ambiente: 'bosque_ceniza', luz: '#c86a3a', oscuridad: 0.85, niebla: 0.4, particulas: 'ceniza', secreto: true, descubrir: true } });
  zones.push({ nombre: 'La Alacena del Herrero', x: 103 * TILE, y: 35 * TILE, w: 5 * TILE, h: 5 * TILE, props: { musica: 'ninguna', ambiente: 'fuelles', luz: '#ffc070', oscuridad: 0.82, niebla: 0.3, particulas: 'brasas', secreto: true, descubrir: true } });
  const postales: Postal[] = [
    { nombre: 'escalera_de_ceniza', x: T(15), y: T(19) },
    { nombre: 'rio_de_lava', x: T(37), y: T(18) },
    { nombre: 'jaulas_colgantes', x: T(80), y: T(12) },
    { nombre: 'los_fuelles', x: T(80), y: T(48) },
    { nombre: 'bosque_de_ceniza', x: T(15), y: T(48) },
    { nombre: 'carcel_de_las_luces', x: T(45), y: T(48) },
    { nombre: 'el_horno', x: T(34), y: T(73) },
    { nombre: 'corazon_de_la_fragua', x: T(88), y: T(75) },
  ];

  const map: BigMap & { premium: FraguaReport } = {
    name: 'mundo6_fragua', w: W, h: H, terrain, solid, decos, entities, zones, postales, objects,
    meta: { bioma: 'fragua', musica: 'ninguna', nombre: 'La Fragua de las Luces', lava: true, espuma: '#ffc050', fondo: FRAGUA_PARALAJE.map((p, k) => ({ id: `fondo_fragua_lejos_${k}`, paralaje: p })) },
    premium: {
      ramas: [
        { id: 'bosque', nombre: 'El Bosque de Ceniza (de la escalera al horno)', medio: [16, 48], tapar: [[11, 33], [12, 33], [13, 33], [14, 33], [11, 34], [12, 34], [13, 34], [14, 34]] },
        { id: 'carcel', nombre: 'La Cárcel de las Luces (del río a los fuelles)', medio: [45, 41], tapar: [[48, 33], [49, 33], [50, 33], [51, 33], [48, 34], [49, 34], [50, 34], [51, 34]] },
        { id: 'pasadizo', nombre: 'El Pasadizo de los Moldes (del bosque a la cárcel)', medio: [29, 50], tapar: [[30, 50], [30, 51]] },
      ],
      secretos: ['nido_ceniza', 'alacena_herrero'],
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
  void JAULA_CANDADO;
  return map;
}

/** Calcomanías por tipo de piso */
const DECAL_ROCA = ['escoria_0', 'escoria_1', 'ceniza_0', 'ceniza_1', 'marcas_carretilla_0', 'metal_frio_0', 'metal_frio_1', 'eslabones_0', 'eslabones_1'];
const DECAL_CENIZA = ['ceniza_0', 'ceniza_1', 'escoria_0', 'eslabones_1'];

/** Calcomanías en cada pantalla (sin repetir la misma cerca) y la agenda de lo que se ve en cada postal. */
function poblar(m: BigMap & { premium: FraguaReport }, d: Uint8Array, c: { solid: Uint8Array; at: (x: number, y: number) => number; seed: number; byName: Map<string, WorldObject> }) {
  const W = m.w, H = m.h;
  let s = c.seed >>> 0;
  const r = () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const used: { s: string; x: number; y: number }[] = [];
  const PWX = m.terrain.img.w;
  const arena = m.entities.find((e) => e.tipo === 'arena_jefe')!;
  for (let sy = 0; sy < H; sy += 6) for (let sx = 0; sx < W; sx += 8) {
    for (let k = 0; k < 4; k++) {
      for (let t = 0; t < 30; t++) {
        const tx = sx + Math.floor(r() * 8), ty = sy + Math.floor(r() * 6), i = c.at(tx, ty);
        if (i < 0 || c.solid[i] || d[i] === STAIRS || d[i] === BRIDGE || d[i] === CHAINB) continue;
        const px = tx * TILE + 4 + Math.floor(r() * 24), py = ty * TILE + 4 + Math.floor(r() * 24);
        if (Math.hypot(px - arena.x, py - arena.y) < ARENA_DRAGONA.radio) continue;
        const kd = m.terrain.kind[py * PWX + px];
        if (kd !== 1 && kd !== 2) continue;
        const pool = kd === 2 ? DECAL_ROCA : DECAL_CENIZA;
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

export { ROCK, FLOOR, OBS, LAVA, BRIDGE, CHAINB, STAIRS, ASH, VOID, IRON };
