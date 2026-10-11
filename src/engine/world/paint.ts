import { createRaster, type Raster } from '../core/raster';
import { TILE, pnoise, shade as shadeRaw } from './tiles';

/**
 * Pintor de terreno: el suelo de un mundo grande pintado pixel por pixel (no cuadros repetidos).
 * Bordes orgánicos, mesetas con acantilado y escaleras, ríos y lagos con orilla, caminos de tierra, plazas de piedra,
 * praderas con flores y bosque oscuro con hojas caídas. Sale una imagen grande (que se corta en trozos) con el agua
 * transparente (debajo va el agua animada) y la grilla de colisión por cuadro.
 *
 * Todas las medidas del diseño van en cuadros de 32 px.
 */

export type TP = [number, number];

export interface TerrainDesign {
  /** ancho y alto en cuadros */
  w: number;
  h: number;
  seed: number;
  /** mesetas (nivel 1): polígonos. El borde de abajo muestra el acantilado */
  plateaus: TP[][];
  /** escaleras talladas en el acantilado: centro x y fila del borde, ancho en cuadros. `tierra`: rampa de tierra pisada */
  stairs: { x: number; y: number; w: number; style?: 'piedra' | 'tierra' }[];
  /** ríos: polilínea y ancho en cuadros */
  rivers: { pts: TP[]; w: number }[];
  lakes: { c: TP; rx: number; ry: number }[];
  /** caminos de tierra */
  roads: { pts: TP[]; w: number }[];
  /** plazas de piedra (ruinas) */
  plazas: TP[][];
  /** arenas circulares de piedra (anillos y círculo de runas al centro) */
  arenas?: { c: TP; r: number }[];
  /** praderas: pasto claro con muchas flores */
  meadows: { c: TP; r: number }[];
  /** bosque profundo: suelo oscuro con hojas caídas */
  dark: { c: TP; r: number }[];
  /** claros (para el pintor solo aclaran un poco el pasto) */
  clearings?: { c: TP; r: number }[];
  /**
   * Interior (la Catedral): todo empieza como muro (meseta) y estas salas se tallan a nivel del piso. Las mesetas de
   * arriba vuelven a levantar lo que haga falta adentro de una sala (un descanso alto, un bloque de muro). El muro de
   * arriba de cada sala muestra su cara, igual que un acantilado.
   */
  rooms?: TP[][];
  /**
   * Cuevas (Mundo 3): como `rooms`, pero el piso sale de una grilla por cuadro (1 = piso, `w` x `h`) y el borde es
   * roca orgánica (el ruido mueve la pared hasta un tercio de cuadro).
   */
  cave?: Uint8Array;
  /**
   * Hundidos: el piso baja un nivel adentro del polígono (el Anillo de las Hadas). Se ve la cara de roca debajo del
   * borde norte, paredes angostas a los lados, el canto del borde sur y una bajada de tierra en `entry` (centro x y
   * ancho en cuadros, sobre el borde sur). El borde no se pasa, salvo por la bajada.
   */
  pits?: { poly: TP[]; entry: { x: number; w: number } }[];
}

export interface PaintedTerrain {
  img: Raster;
  /** por pixel: 0 pasto, 1 camino, 2 plaza, 3 acantilado, 4 agua, 5 escalera, 6 techo de muro o abismo (Catedral) */
  kind: Uint8Array;
  /** por pixel: 1 = meseta */
  high: Uint8Array;
  /** por cuadro: 1 = no se pasa */
  solid: Uint8Array;
  /** por cuadro: 1 = hay agua (va el cuadro de agua animada debajo) */
  waterTiles: Uint8Array;
  /** por cuadro: tipo dominante (para ubicar objetos): mismos códigos que kind */
  tileKind: Uint8Array;
  /** por cuadro: 1 = meseta */
  tileHigh: Uint8Array;
}

export const FACE = 64;

// ---------- utilidades ----------

function hash(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** tabla de valores al azar para el ruido rápido (512 x 512, se repite cada 512 celdas: no se nota) */
const NT = 512, NM = NT - 1;
const NTAB = (() => { const t = new Float32Array(NT * NT); for (let i = 0; i < t.length; i++) t[i] = hash(i % NT, (i / NT) | 0, 4242); return t; })();
/** ruido suave rápido (valor interpolado con curva suave). La semilla corre el origen. */
function vn(x: number, y: number, cell: number, seed: number): number {
  const gx = x / cell + seed * 17.31, gy = y / cell + seed * 7.77;
  const x0 = Math.floor(gx), y0 = Math.floor(gy);
  const fx = gx - x0, fy = gy - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const ax = x0 & NM, bx = (x0 + 1) & NM, ay = (y0 & NM) * NT, by = ((y0 + 1) & NM) * NT;
  const a = NTAB[ay + ax], b = NTAB[ay + bx], c = NTAB[by + ax], d = NTAB[by + bx];
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
const fbm = (x: number, y: number, seed: number) => vn(x, y, 64, seed) * 0.5 + vn(x, y, 24, seed + 3) * 0.3 + vn(x, y, 9, seed + 7) * 0.2;

const shadeCache = new Map<string, string>();
const shade = (hex: string, d: number) => { const k = hex + d; let v = shadeCache.get(k); if (!v) { v = shadeRaw(hex, d); shadeCache.set(k, v); } return v; };

const rgb = (hex: string): [number, number, number] => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const cache = new Map<string, [number, number, number]>();
const RGB = (hex: string) => { let v = cache.get(hex); if (!v) { v = rgb(hex); cache.set(hex, v); } return v; };

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0;
  const ex = px - ax - t * dx, ey = py - ay - t * dy;
  return Math.sqrt(ex * ex + ey * ey);
}

export function inPoly(x: number, y: number, poly: TP[]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
/** distancia con signo al borde del polígono (negativa adentro), en las mismas unidades */
function polySd(x: number, y: number, poly: TP[]): number {
  let d = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) d = Math.min(d, segDist(x, y, poly[j][0], poly[j][1], poly[i][0], poly[i][1]));
  return inPoly(x, y, poly) ? -d : d;
}

/** Curva suave (Catmull-Rom) por los puntos de control, muestreada cada `step` unidades. */
export function smoothPath(pts: TP[], step = 0.5): TP[] {
  if (pts.length < 3) return pts;
  const out: TP[] = [];
  const P = [pts[0], ...pts, pts[pts.length - 1]];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** Máscara de "cerca de una polilínea gruesa" con borde ruidoso. Rápida: distancia mínima por tramo y ruido una vez. */
function strokeMask(W: number, H: number, pts: TP[], width: number, wobble: number, seed: number, out: Uint8Array, val = 1) {
  const s = smoothPath(pts.map(([x, y]) => [x * TILE, y * TILE] as TP), 8);
  const half = (width * TILE) / 2, pad = half + wobble + 2;
  let bx0 = W, by0 = H, bx1 = 0, by1 = 0;
  for (const [x, y] of s) { bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y); }
  bx0 = Math.max(0, Math.floor(bx0 - pad)); by0 = Math.max(0, Math.floor(by0 - pad)); bx1 = Math.min(W - 1, Math.ceil(bx1 + pad)); by1 = Math.min(H - 1, Math.ceil(by1 + pad));
  const bw = bx1 - bx0 + 1, bh = by1 - by0 + 1;
  const dist = new Float32Array(bw * bh).fill(1e9);
  for (let i = 0; i < s.length - 1; i++) {
    const [ax, ay] = s[i], [cx, cy] = s[i + 1];
    const x0 = Math.max(bx0, Math.floor(Math.min(ax, cx) - pad)), x1 = Math.min(bx1, Math.ceil(Math.max(ax, cx) + pad));
    const y0 = Math.max(by0, Math.floor(Math.min(ay, cy) - pad)), y1 = Math.min(by1, Math.ceil(Math.max(ay, cy) + pad));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const k = (y - by0) * bw + (x - bx0);
      const dd = segDist(x, y, ax, ay, cx, cy);
      if (dd < dist[k]) dist[k] = dd;
    }
  }
  for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
    const dd = dist[(y - by0) * bw + (x - bx0)];
    if (dd > pad) continue;
    if (dd < half + (fbm(x, y, seed) - 0.5) * 2 * wobble) out[y * W + x] = val;
  }
}

/** Distancia (en px, tope 255) al pixel más cercano con mask = 1. Chaflán de dos pasadas. */
export function distTo(mask: Uint8Array, W: number, H: number, want = 1): Uint16Array {
  const INF = 255 * 3;
  const d = new Uint16Array(W * H);
  for (let i = 0; i < d.length; i++) d[i] = mask[i] === want ? 0 : INF;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; let v = d[i];
    if (!v) continue;
    if (x > 0) v = Math.min(v, d[i - 1] + 3);
    if (y > 0) { v = Math.min(v, d[i - W] + 3); if (x > 0) v = Math.min(v, d[i - W - 1] + 4); if (x < W - 1) v = Math.min(v, d[i - W + 1] + 4); }
    d[i] = v;
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    const i = y * W + x; let v = d[i];
    if (!v) continue;
    if (x < W - 1) v = Math.min(v, d[i + 1] + 3);
    if (y < H - 1) { v = Math.min(v, d[i + W] + 3); if (x < W - 1) v = Math.min(v, d[i + W + 1] + 4); if (x > 0) v = Math.min(v, d[i + W - 1] + 4); }
    d[i] = v;
  }
  for (let i = 0; i < d.length; i++) d[i] = Math.min(255, Math.round(d[i] / 3));
  return d;
}

// ---------- paletas ----------

/** Pasto: de bosque oscuro (0) a pradera clara (11). */
/** Paleta sombría (bosque hechizado): verdes fríos y apagados, sombras azuladas. */
export const GRASS = ['#0f1c1c', '#142422', '#192c27', '#1f352c', '#253f31', '#2c4a36', '#34553b', '#3d6140', '#476d45', '#52794a', '#5e8550', '#6c9158'];
const DIRT = ['#2a2220', '#352a25', '#41332b', '#4e3d32', '#5c4839', '#6b5442'];
const COBBLE = ['#252630', '#30313c', '#3c3e4a', '#4a4c58', '#5a5c68', '#6e707c'];
const SANDSTONE = ['#2c2826', '#38322e', '#463e38', '#544a42', '#64584e', '#76695c'];
const BLUESTONE = ['#22283a', '#2c3446', '#384254', '#465062', '#566072', '#686f80'];
const ROCK = ['#16151c', '#1e1d26', '#272630', '#31303b', '#3c3b47', '#494755', '#585666'];
const FLOWERS = ['#c8b84a', '#b06a9a', '#cfd2e4', '#7a8ee0', '#c87a5a', '#9a7ad8'];
const LEAVES = ['#7a4a26', '#5e3a20', '#8e6a34', '#4a2e1a'];

/**
 * Los colores de un mundo. El Bosque usa los de arriba; otro mundo (la Catedral) trae los suyos y el pintor hace
 * lo mismo con otra paleta: "pasto" es el suelo base, "camino" el sendero, "plaza" las losas y "roca" los muros.
 */
export interface TerrainPalette {
  grass: string[];
  dirt: string[];
  cobble: string[];
  sandstone: string[];
  bluestone: string[];
  rock: string[];
  flowers: string[];
  leaves: string[];
  /** orilla del agua: espuma, banda clara, poco hondo y fondo */
  shore: [string, string, string, string];
  /** tierra mojada de la orilla (pegada y a dos pixeles) */
  wetEarth: [string, string];
  /** borde de arriba de la meseta y junta de las piedras que faltan */
  edgeDark: string;
  holeDark: string;
  /** runas de la arena: anillo, glifos y el centro */
  runes: [string, string, string, string];
  /** piedritas y guijarros sueltos */
  pebbles: [string, string, string, string];
  /** el centro de cada florcita */
  flowerHeart: string;
  /**
   * Losas de obra en vez de piedras sueltas: rectángulos en hileras trabadas (ancho y alto en px). Sin esto las plazas
   * son de piedras irregulares (las ruinas del Bosque).
   */
  slabs?: { w: number; h: number };
}

export const BOSQUE_PALETTE: TerrainPalette = {
  grass: GRASS, dirt: DIRT, cobble: COBBLE, sandstone: SANDSTONE, bluestone: BLUESTONE, rock: ROCK, flowers: FLOWERS, leaves: LEAVES,
  shore: ['#a8c8d0', '#7aa4b0', '#3e7a92', '#04101c'],
  wetEarth: ['#1c1814', '#262019'],
  edgeDark: '#0a1212',
  holeDark: '#141614',
  runes: ['#2a1418', '#5a1e24', '#1e1418', '#3a2228'],
  pebbles: ['#7b7066', '#93826d', '#9a948c', '#7a746e'],
  flowerHeart: '#fff2a0',
};

/** Pinta el terreno completo. */
export function paintTerrain(d: TerrainDesign, pal: TerrainPalette = BOSQUE_PALETTE): PaintedTerrain {
  const { grass: GRASS, dirt: DIRT, cobble: COBBLE, sandstone: SANDSTONE, bluestone: BLUESTONE, rock: ROCK, flowers: FLOWERS, leaves: LEAVES } = pal;
  const W = d.w * TILE, H = d.h * TILE, N = W * H, S = d.seed;
  const img = createRaster(W, H);
  const kind = new Uint8Array(N);
  const high = new Uint8Array(N);
  const water = new Uint8Array(N);
  const road = new Uint8Array(N);
  const plaza = new Uint8Array(N);

  // ---- máscaras ----
  if (d.rooms?.length) {
    high.fill(1);
    for (const poly of d.rooms) {
      const pp = poly.map(([x, y]) => [x * TILE, y * TILE] as TP);
      const xs = pp.map((p) => p[0]), ys = pp.map((p) => p[1]);
      const x0 = Math.max(0, Math.floor(Math.min(...xs) - 24)), x1 = Math.min(W - 1, Math.ceil(Math.max(...xs) + 24));
      const y0 = Math.max(0, Math.floor(Math.min(...ys) - 24)), y1 = Math.min(H - 1, Math.ceil(Math.max(...ys) + 24));
      // muro con tramos rectos y algún bloque salido: poco ruido, que se lea como obra y no como roca
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++)
        if (polySd(x, y, pp) + (vn(x, y, 40, S + 111) - 0.5) * 10 + (vn(x, y, 8, S + 113) - 0.5) * 3 < 0) high[y * W + x] = 0;
    }
  }
  if (d.cave) {
    const cv = d.cave, cw = d.w, ch = d.h;
    const cell = (tx: number, ty: number) => (tx < 0 || ty < 0 || tx >= cw || ty >= ch ? 0 : cv[ty * cw + tx]);
    high.fill(1);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      // valor suave entre los centros de los cuadros: la pared queda cerca del borde del cuadro, y el ruido la quiebra
      const gx = x / TILE - 0.5, gy = y / TILE - 0.5, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
      const a = cell(x0, y0), b = cell(x0 + 1, y0), c = cell(x0, y0 + 1), e = cell(x0 + 1, y0 + 1);
      if (a === b && b === c && c === e) { if (a) high[y * W + x] = 0; continue; }
      const v = a + (b - a) * fx + (c - a) * fy + (a - b - c + e) * fx * fy + (vn(x, y, 26, S + 121) - 0.5) * 0.5 + (vn(x, y, 8, S + 123) - 0.5) * 0.2;
      if (v > 0.5) high[y * W + x] = 0;
    }
  }
  for (const poly of d.plateaus) {
    const pp = poly.map(([x, y]) => [x * TILE, y * TILE] as TP);
    const xs = pp.map((p) => p[0]), ys = pp.map((p) => p[1]);
    const x0 = Math.max(0, Math.floor(Math.min(...xs) - 40)), x1 = Math.min(W - 1, Math.ceil(Math.max(...xs) + 40));
    const y0 = Math.max(0, Math.floor(Math.min(...ys) - 40)), y1 = Math.min(H - 1, Math.ceil(Math.max(...ys) + 40));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const sd = polySd(x, y, pp);
      if (sd > 40) continue;
      // borde de roca: irregular pero con tramos rectos (ruido grueso + fino)
      if (sd + (vn(x, y, 48, S + 101) - 0.5) * 34 + (vn(x, y, 12, S + 103) - 0.5) * 8 < 0) high[y * W + x] = 1;
    }
  }
  for (const r of d.rivers) strokeMask(W, H, r.pts, r.w, 10, S + 201, water);
  for (const l of d.lakes) {
    const cx = l.c[0] * TILE, cy = l.c[1] * TILE, rx = l.rx * TILE, ry = l.ry * TILE;
    for (let y = Math.max(0, Math.floor(cy - ry - 30)); y < Math.min(H, cy + ry + 30); y++)
      for (let x = Math.max(0, Math.floor(cx - rx - 30)); x < Math.min(W, cx + rx + 30); x++) {
        const v = Math.hypot((x - cx) / rx, (y - cy) / ry) - 1 + (fbm(x, y, S + 211) - 0.5) * 0.35;
        if (v < 0) water[y * W + x] = 1;
      }
  }
  for (const r of d.roads) strokeMask(W, H, r.pts, r.w, 7, S + 301, road);
  const arena = new Uint8Array(N);
  for (const a of d.arenas ?? []) {
    const cx = a.c[0] * TILE, cy = a.c[1] * TILE, R = a.r * TILE;
    for (let y = Math.max(0, Math.floor(cy - R - 4)); y < Math.min(H, cy + R + 4); y++) for (let x = Math.max(0, Math.floor(cx - R - 4)); x < Math.min(W, cx + R + 4); x++)
      if (Math.hypot(x - cx, y - cy) < R + (vn(x, y, 6, S + 405) - 0.5) * 3) { plaza[y * W + x] = 1; arena[y * W + x] = 1; }
  }
  for (const poly of d.plazas) {
    const pp = poly.map(([x, y]) => [x * TILE, y * TILE] as TP);
    const xs = pp.map((p) => p[0]), ys = pp.map((p) => p[1]);
    for (let y = Math.max(0, Math.floor(Math.min(...ys) - 24)); y < Math.min(H, Math.max(...ys) + 24); y++)
      for (let x = Math.max(0, Math.floor(Math.min(...xs) - 24)); x < Math.min(W, Math.max(...xs) + 24); x++)
        if (polySd(x, y, pp) + (fbm(x, y, S + 401) - 0.5) * 52 < 0) plaza[y * W + x] = 1; // borde roto, no una mancha de borde duro
  }

  // acantilado: pixels bajos justo debajo de una meseta (cuenta cuántos pixeles bajó desde el borde)
  const run = new Uint16Array(N);
  for (let x = 0; x < W; x++) {
    let r = 9999;
    for (let y = 0; y < H; y++) { const i = y * W + x; if (high[i]) r = 0; else { r++; run[i] = r; } }
  }
  const faceH = new Uint8Array(W);
  for (let x = 0; x < W; x++) faceH[x] = FACE - Math.floor(vn(x, 0, 9, S + 65) * 7) - Math.floor(vn(x, 0, 40, S + 66) * 8);
  // la rampa de tierra se abre hacia abajo (angosta arriba, ancha al pie): se lee como talud y no como caja
  const stairHalf = (s: TerrainDesign['stairs'][number], r: number) => (s.style === 'tierra' ? ((s.w * TILE) / 2) * (0.78 + 0.42 * Math.min(1, r / FACE)) : (s.w * TILE) / 2);
  const stairAt = (x: number, y: number, r = 0) => d.stairs.some((s) => Math.abs(x - s.x * TILE) < stairHalf(s, r) && y > s.y * TILE - 70 && y < s.y * TILE + FACE + 40);
  // al pie de la rampa de tierra: un abanico de tierra pisada que se junta con el pasto (y con el camino si está cerca)
  for (const s of d.stairs) {
    if (s.style !== 'tierra') continue;
    const cx = s.x * TILE, hw = stairHalf(s, FACE);
    for (let y = Math.floor(s.y * TILE); y < Math.min(H, s.y * TILE + FACE + 70); y++) for (let x = Math.max(0, Math.floor(cx - hw - 20)); x < Math.min(W, cx + hw + 20); x++) {
      const i = y * W + x;
      if (high[i] || run[i] <= faceH[x] || run[i] > faceH[x] + 34) continue;
      const k = (run[i] - faceH[x]) / 34;
      if (Math.abs(x - cx) < hw * (1 - k * k * 0.7) + (vn(x, y, 7, S + 79) - 0.5) * 10) road[i] = 1;
    }
  }
  // clasificación final (prioridad: acantilado/escalera > agua > plaza > camino > pasto)
  for (let i = 0; i < N; i++) {
    const x = i % W, y = (i / W) | 0;
    if (!high[i] && run[i] <= faceH[x]) kind[i] = stairAt(x, y, run[i]) ? 5 : 3;
    else if (water[i]) kind[i] = 4;
    else if (plaza[i]) kind[i] = 2;
    else if (road[i]) kind[i] = 1;
  }
  // paredes de los lados: roca angosta pegada a la meseta donde no hay acantilado de frente
  const dHigh = distTo(high, W, H);
  const sideWall = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (high[i] || kind[i] !== 0 && kind[i] !== 4 || dHigh[i] > 11) continue;
    const x = i % W;
    if (run[i] <= faceH[x] + 2) continue;
    if (dHigh[i] <= 6 + Math.floor(vn(x, (i / W) | 0, 10, S + 67) * 5)) { kind[i] = 3; sideWall[i] = 1; }
  }
  const lowMask = new Uint8Array(N);
  for (let i = 0; i < N; i++) lowMask[i] = high[i] ? 0 : 1;
  const dLow = distTo(lowMask, W, H); // en la meseta: distancia al borde
  const isWater = new Uint8Array(N); for (let i = 0; i < N; i++) isWater[i] = kind[i] === 4 ? 1 : 0;
  const dWater = distTo(isWater, W, H); // en tierra: distancia al agua
  const isLand = new Uint8Array(N); for (let i = 0; i < N; i++) isLand[i] = kind[i] === 4 ? 0 : 1;
  const dLand = distTo(isLand, W, H); // en el agua: distancia a la orilla
  const notRoad = new Uint8Array(N); for (let i = 0; i < N; i++) notRoad[i] = kind[i] === 1 ? 0 : 1;
  // pixeles de rampa de tierra (las escaleras de piedra no cambian)
  const earthRamp = new Uint8Array(N);
  for (const s of d.stairs) {
    if (s.style !== 'tierra') continue;
    const hw = stairHalf(s, FACE) + 2;
    for (let y = Math.max(0, Math.floor(s.y * TILE - 70)); y < Math.min(H, s.y * TILE + FACE + 40); y++) for (let x = Math.max(0, Math.floor(s.x * TILE - hw)); x < Math.min(W, s.x * TILE + hw); x++) if (kind[y * W + x] === 5) earthRamp[y * W + x] = 1;
  }
  // la rampa de tierra sigue el camino: entre los dos no hay borde
  for (let i = 0; i < N; i++) if (earthRamp[i]) notRoad[i] = 0;
  const dRoadEdge = distTo(notRoad, W, H); // en el camino: distancia al pasto

  // ---- campos suaves de zona ----
  // campos de zona en una grilla de 4 px (suaves, no hace falta más detalle)
  const ZS = 4, ZW = Math.ceil(W / ZS), ZH = Math.ceil(H / ZS);
  const field = (list: { c: TP; r: number }[]) => {
    const f = new Float32Array(ZW * ZH);
    for (const z of list) {
      const cx = z.c[0] * TILE, cy = z.c[1] * TILE, rr = z.r * TILE, ext = rr * 1.3;
      for (let gy = Math.max(0, Math.floor((cy - ext) / ZS)); gy < Math.min(ZH, Math.ceil((cy + ext) / ZS)); gy++)
        for (let gx = Math.max(0, Math.floor((cx - ext) / ZS)); gx < Math.min(ZW, Math.ceil((cx + ext) / ZS)); gx++) {
          const dx = gx * ZS - cx, dy = gy * ZS - cy;
          const dd = Math.sqrt(dx * dx + dy * dy) / rr;
          if (dd >= 1.3) continue;
          const w = 1 - Math.max(0, Math.min(1, (dd - 0.6) / 0.7));
          const k = gy * ZW + gx;
          if (w > f[k]) f[k] = w;
        }
    }
    return f;
  };
  const fMeadow = field(d.meadows), fDark = field(d.dark), fClear = field(d.clearings ?? []);
  const zone = (f: Float32Array, x: number, y: number) => f[((y / ZS) | 0) * ZW + ((x / ZS) | 0)];

  const set = (i: number, hex: string, a = 255) => { const [r, g, b] = RGB(hex); const k = i * 4; img.data[k] = r; img.data[k + 1] = g; img.data[k + 2] = b; img.data[k + 3] = a; };
  const grassIdx = new Uint8Array(N);

  // ---- 1. pasto ----
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const m = zone(fMeadow, x, y), dk = zone(fDark, x, y), cl = zone(fClear, x, y);
    // valor base por zona + variación grande (manchas de pasto) + textura fina en grupitos
    let v = 6.2 + m * 2.4 - dk * 3.6 + cl * 0.6 + (high[i] ? 0.9 : 0);
    v += (vn(x, y, 96, S + 11) - 0.5) * 2.2 + (vn(x, y, 7, S + 13) - 0.5) * 1.6 + (vn(x, y, 3, S + 17) - 0.5) * 0.9;
    // sombra al pie del acantilado
    if (!high[i] && run[i] > faceH[x] && run[i] < faceH[x] + 12) v -= (faceH[x] + 12 - run[i]) * 0.3;
    if (!high[i] && dHigh[i] > 0 && dHigh[i] < 14 && run[i] > faceH[x]) v -= (14 - dHigh[i]) * 0.12;
    // orilla: pasto más oscuro y húmedo
    if (dWater[i] < 6) v -= (6 - dWater[i]) * 0.35;
    const t = Math.max(0, Math.min(GRASS.length - 1, Math.round(v)));
    grassIdx[i] = t;
    set(i, GRASS[t]);
  }

  // ---- 2. detalles del pasto: briznas, flores, hojas caídas, tréboles ----
  const grassAt = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && kind[y * W + x] === 0;
  const dot = (x: number, y: number, hex: string) => { if (grassAt(x, y)) set(y * W + x, hex); };
  for (let cy = 0; cy < H; cy += 5) for (let cx = 0; cx < W; cx += 5) {
    const x = cx + Math.floor(hash(cx, cy, S + 21) * 5), y = cy + Math.floor(hash(cx, cy, S + 22) * 5);
    if (!grassAt(x, y) || !grassAt(x, y + 2)) continue;
    const i = y * W + x, g = grassIdx[i], m = zone(fMeadow, x, y), dk = zone(fDark, x, y);
    const roll = hash(cx, cy, S + 23);
    if (roll < 0.42) {
      // brizna en "v" con luz arriba y sombra abajo
      const hi = GRASS[Math.min(GRASS.length - 1, g + 2)], lo = GRASS[Math.max(0, g - 2)];
      dot(x - 1, y, hi); dot(x + 1, y, hi); dot(x, y + 1, GRASS[Math.min(GRASS.length - 1, g + 1)]); dot(x, y + 2, lo);
      if (hash(cx, cy, S + 24) < 0.4) { dot(x - 2, y - 1, hi); dot(x + 2, y - 1, hi); }
    } else if ((m > 0.3 && vn(x, y, 30, S + 81) > 0.72 - m * 0.12 && roll < 0.7) || roll > 0.998) {
      // ramito de flores (en la pradera muchas, del mismo color)
      const col = FLOWERS[Math.floor(vn(x, y, 80, S + 25) * FLOWERS.length * 0.999)];
      const n = 1 + Math.floor(hash(cx, cy, S + 26) * 3);
      for (let k = 0; k < n; k++) {
        const fx = x + Math.floor((hash(k, cx, cy) - 0.5) * 5), fy = y + Math.floor((hash(cy, k, cx) - 0.5) * 4);
        dot(fx - 1, fy, col); dot(fx + 1, fy, col); dot(fx, fy - 1, col); dot(fx, fy + 1, shade(col, -0.14)); dot(fx, fy, pal.flowerHeart); dot(fx, fy + 2, GRASS[Math.max(0, g - 2)]);
      }
    } else if (dk > 0.25 && roll < 0.42 + dk * 0.4) {
      // hojas caídas y ramitas en el bosque oscuro
      const col = LEAVES[Math.floor(hash(cx, cy, S + 27) * LEAVES.length)];
      dot(x, y, col); dot(x + 1, y, shade(col, -0.08)); if (hash(cx, cy, S + 28) < 0.5) dot(x, y + 1, shade(col, -0.15));
    } else if (roll < 0.56) {
      // trébol o piedrita
      if (hash(cx, cy, S + 29) < 0.6) { const c = GRASS[Math.min(GRASS.length - 1, g + 1)]; dot(x, y, c); dot(x + 1, y, c); dot(x, y + 1, c); dot(x + 1, y + 1, GRASS[Math.max(0, g - 1)]); }
      else { dot(x, y, pal.pebbles[2]); dot(x + 1, y, pal.pebbles[3]); }
    }
  }

  // ---- 3. caminos de tierra ----
  for (let i = 0; i < N; i++) {
    if (kind[i] !== 1) continue;
    const x = i % W, y = (i / W) | 0;
    let v = 3.2 + (vn(x, y, 40, S + 31) - 0.5) * 1.4 + (vn(x, y, 4, S + 33) - 0.5) * 1.4 + (vn(x, y, 2, S + 35) - 0.5) * 0.6;
    const e = dRoadEdge[i];
    if (e <= 1) v = 0.6; else if (e <= 3) v -= 1.1; else if (e <= 5) v -= 0.4;
    // huellas: dos surcos suaves dentro del camino
    let c = DIRT[Math.max(0, Math.min(DIRT.length - 1, Math.round(v)))];
    // piedritas: pocas y de poco contraste (en tablet, muchas y claras se ven como estática)
    if (hash(x >> 1, y >> 1, S + 37) > 0.9925) c = pal.pebbles[0];
    else if (hash(x, y, S + 38) > 0.9965) c = pal.pebbles[1];
    set(i, c);
  }
  // pasto que invade el borde del camino
  for (let i = 0; i < N; i++) {
    if (kind[i] !== 1 || dRoadEdge[i] > 3) continue;
    const x = i % W, y = (i / W) | 0;
    if (hash(x, y >> 1, S + 39) < 0.22 - dRoadEdge[i] * 0.05) set(i, GRASS[Math.max(0, grassIdx[i] - (y % 2))]);
  }

  // ---- 4. plazas de piedra con musgo ----
  const dPlazaEdge = (() => { const m = new Uint8Array(N); for (let i = 0; i < N; i++) m[i] = kind[i] === 2 ? 0 : 1; return distTo(m, W, H); })();
  // losas irregulares (Voronoi): cada celda es una piedra; junta oscura, canto claro arriba a la izquierda,
  // sombra abajo a la derecha, musgo en algunas juntas y piedras enteras que faltan cerca del borde.
  // En las arenas: anillos concéntricos de piedra y un círculo de runas al centro.
  const cellAt = (x: number, y: number, size: number) => {
    const gx = Math.floor(x / size), gy = Math.floor(y / size);
    let d1 = 1e9, d2 = 1e9, id = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const X = gx + i, Y = gy + j;
      const px = (X + 0.2 + hash(X, Y, S + 501) * 0.6) * size, py = (Y + 0.2 + hash(X, Y, S + 502) * 0.6) * size;
      const dd = (x - px) ** 2 + (y - py) ** 2;
      if (dd < d1) { d2 = d1; d1 = dd; id = (X * 7919 + Y) | 0; } else if (dd < d2) d2 = dd;
    }
    return { id, edge: Math.sqrt(d2) - Math.sqrt(d1) };
  };
  const arenaInfo = (x: number, y: number) => {
    const a = (d.arenas ?? []).find((q) => Math.hypot(x - q.c[0] * TILE, y - q.c[1] * TILE) < q.r * TILE + 6)!;
    const dx = x - a.c[0] * TILE, dy = y - a.c[1] * TILE, rr = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
    const ring = Math.floor(rr / 13), segs = Math.max(6, Math.round((ring + 0.5) * 13 * 2 * Math.PI / 20));
    const u = ((ang / (2 * Math.PI)) + 1 + ring * 0.37) % 1 * segs;
    const seg = Math.floor(u);
    const edge = Math.min(rr - ring * 13, (ring + 1) * 13 - rr, (u - seg) * (rr * 2 * Math.PI / segs), (1 - (u - seg)) * (rr * 2 * Math.PI / segs));
    return { id: ring * 1000 + seg, edge, rr, ring, ang, R: a.r * TILE };
  };
  // losas de obra: hileras de alto fijo, cada hilera corrida y con largos que varían un poco
  const slabAt = (x: number, y: number, sw: number, sh: number) => {
    const row = Math.floor(y / sh), ly = y - row * sh;
    const off = Math.floor(hash(row, 3, S + 505) * sw);
    const u = x + off, col0 = Math.floor(u / sw);
    // cada losa puede ser una y media de larga: se juntan de a pares según la hilera
    const join = hash(col0 >> 1, row, S + 506) < 0.3;
    const col = join ? col0 >> 1 : col0 * 2 + 1;
    const x0 = join ? (col0 >> 1) * 2 * sw : col0 * sw, x1 = join ? x0 + 2 * sw : x0 + sw;
    return { id: (row * 7919 + col * 31 + (join ? 1 : 0)) | 0, edge: Math.min(ly + 0.5, sh - ly - 0.5, u - x0 + 0.5, x1 - u - 0.5) };
  };
  const plazaCell = new Int32Array(N), plazaEdge = new Float32Array(N), missing = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (kind[i] !== 2) continue;
    const x = i % W, y = (i / W) | 0;
    const c = arena[i] ? arenaInfo(x, y) : pal.slabs ? slabAt(x, y, pal.slabs.w, pal.slabs.h) : cellAt(x, y, 15);
    plazaCell[i] = c.id; plazaEdge[i] = c.edge;
    // piedra que falta: la decide la celda entera (no manchas), más probable cerca del borde
    // en las ruinas el pasto se come el borde: cerca de la orilla faltan casi todas las losas
    const gone = hash(c.id, 7, S + 503) < (arena[i] ? 0.05 + Math.max(0, 0.5 - dPlazaEdge[i] / 36) : 0.12 + Math.max(0, 0.8 - dPlazaEdge[i] / 34));
    if (gone) missing[i] = 1;
  }
  for (let i = 0; i < N; i++) {
    if (kind[i] !== 2 || missing[i]) continue;
    const x = i % W, y = (i / W) | 0;
    const id = plazaCell[i], e = plazaEdge[i];
    const sid = hash(id, 3, S + 41);
    const piedra = arena[i] ? (sid < 0.5 ? COBBLE : BLUESTONE) : pal.slabs ? (sid < 0.07 ? SANDSTONE : sid < 0.55 ? BLUESTONE : COBBLE) : sid < 0.3 ? SANDSTONE : sid < 0.45 ? BLUESTONE : COBBLE;
    // las losas de obra varían poco de una a otra: el piso se lee entero y los personajes se despegan
    let t = pal.slabs && !arena[i] ? 2 + Math.floor(hash(id, 5, S + 507) * 1.9) : 2 + Math.floor(sid * 2.6);
    // canto: luz arriba a la izquierda, sombra abajo a la derecha (mirando la celda vecina)
    const up = i - W >= 0 && plazaCell[i - W] !== id, left = x > 0 && plazaCell[i - 1] !== id;
    const down = i + W < N && plazaCell[i + W] !== id, right = x < W - 1 && plazaCell[i + 1] !== id;
    if (e < 1.1) t = 0;
    else if (up || left) t = Math.min(5, t + 1);
    else if (down || right) t = Math.max(1, t - 1);
    if (t > 0 && vn(x, y, 3, S + 44) > 0.82) t = Math.max(1, t - 1);
    let c = piedra[t];
    if (t === 0 && vn(x, y, 10, S + 45) > 0.58) c = GRASS[Math.max(2, grassIdx[i] - 1)]; // musgo en la junta
    // runas talladas en el círculo central de la arena
    if (arena[i]) {
      const info = arenaInfo(x, y);
      if (Math.abs(info.rr - info.R * 0.42) < 2.2) c = pal.runes[0];
      const glyph = Math.floor(((info.ang + Math.PI) / (2 * Math.PI)) * 12);
      const mid = ((info.ang + Math.PI) / (2 * Math.PI)) * 12 - glyph;
      if (Math.abs(info.rr - info.R * 0.5) < 4 && Math.abs(mid - 0.5) < 0.18 && (glyph + Math.floor(info.rr)) % 2 === 0) c = pal.runes[1];
      if (info.rr < info.R * 0.16) c = info.rr < info.R * 0.12 ? pal.runes[2] : pal.runes[3];
    }
    set(i, c);
  }
  // borde de las piedras que faltan: tierra oscura con sombra (se lee como hueco, no como mancha)
  for (let i = 0; i < N; i++) {
    if (kind[i] !== 2 || !missing[i]) continue;
    const x = i % W;
    const nearStone = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const j = i + dy * W + dx; return j >= 0 && j < N && kind[j] === 2 && !missing[j] && (dx === 0 || Math.abs((j % W) - x) === 1); });
    if (nearStone) set(i, pal.holeDark);
    else if (hash(x >> 1, (i / W) >> 1, S + 504) < 0.3) set(i, DIRT[1]);
  }

  // ---- 5. mesetas: borde de arriba, acantilado, escaleras ----
  for (let i = 0; i < N; i++) {
    if (!high[i] || kind[i] !== 0) continue;
    const dl = dLow[i];
    // arriba de la rampa no hay canto: el pasto de la meseta sigue de largo hacia la tierra
    if (dl <= 4 && earthRamp[i + dl * W]) continue;
    if (dl === 1) set(i, pal.edgeDark);
    else if (dl === 2) set(i, GRASS[Math.min(GRASS.length - 1, grassIdx[i] + 3)]);
    else if (dl === 3) set(i, GRASS[Math.min(GRASS.length - 1, grassIdx[i] + 1)]);
  }
  for (let x = 0; x < W; x++) {
    // largo del pasto que cuelga sobre la roca, por columna
    const hang = 1 + Math.floor(vn(x, 0, 5, S + 51) * 4);
    for (let y = 0; y < H; y++) {
      const i = y * W + x;
      if (kind[i] !== 3 && kind[i] !== 5) continue;
      const r = run[i];
      if (kind[i] === 5) {
        const s = d.stairs.find((s2) => Math.abs(x - s2.x * TILE) < stairHalf(s2, r))!;
        const ex = Math.abs(x - s.x * TILE) - stairHalf(s, r);
        if (s.style === 'tierra') {
          // rampa de tierra pisada: más clara arriba (le da la luz) y en sombra abajo, pisadas suaves y rotas,
          // taludes a los costados (el izquierdo con luz, el derecho en sombra) y el pasto de la meseta que cuelga arriba
          const fh = faceH[x], side = x < s.x * TILE ? -1 : 1;
          let t = 4.9 - Math.min(1, r / fh) * 2.4 + (vn(x, y, 6, S + 71) - 0.5) * 0.8;
          if ((r + Math.floor(vn(x, 0, 12, S + 74) * 4)) % 9 === 0 && hash(x >> 1, r, S + 75) > 0.3) t -= 0.9;
          if (ex > -8) t -= (ex + 8) * (side < 0 ? 0.12 : 0.32);
          let c = DIRT[Math.max(0, Math.min(DIRT.length - 1, Math.round(t)))];
          if (ex > -2) c = side < 0 ? ROCK[3] : ROCK[0];
          else if (ex > -3) c = side < 0 ? ROCK[4] : ROCK[1];
          const hang = 2 + Math.floor(vn(x, 0, 5, S + 76) * 4);
          if (r <= hang) c = GRASS[Math.max(0, grassIdx[i] - (r === hang ? 2 : 0))];
          else if (ex > -7 && ex < -2 && vn(x, y, 4, S + 77) > 0.7) c = GRASS[Math.max(0, grassIdx[i] - 2)];
          if (hash(x >> 1, y >> 1, S + 73) > 0.988) c = pal.pebbles[0];
          set(i, c);
          continue;
        }
        // escalones de piedra: franjas horizontales con borde claro
        const step = Math.floor((r - 1) / 7), ly = (r - 1) % 7;
        let c = ly === 0 ? COBBLE[5] : ly === 1 ? COBBLE[4] : ly >= 5 ? COBBLE[1] : COBBLE[3 - (step % 2)];
        if (ex > -3) c = ROCK[2]; // muros de los lados
        set(i, c);
        continue;
      }
      if (sideWall[i]) {
        // pared lateral: más clara cerca del borde de arriba
        let t = 4.2 - dHigh[i] * 0.45 + (vn(x, y, 5, S + 69) - 0.5) * 1.6;
        if (dHigh[i] <= 1) t = 5.5;
        set(i, ROCK[Math.max(0, Math.min(ROCK.length - 1, Math.round(t)))]);
        continue;
      }
      const fh = faceH[x];
      if (r <= hang) { set(i, GRASS[Math.max(0, grassIdx[i] - 1 + (r === hang ? -2 : 0))]); continue; }
      // columnas de roca (anchos variables): lado izquierdo con luz, derecho en sombra
      const cw = 11 + Math.floor(vn(x, 0, 60, S + 62) * 8);
      const cx = (x + Math.floor(vn(x, 0, 30, S + 63) * 14)) % cw;
      let t = 4 + (vn(x, y * 0.3, 6, S + 53) - 0.5) * 1.8 - (r / fh) * 2.4;
      if (cx <= 1) t += 1.4; else if (cx <= 3) t += 0.6; else if (cx >= cw - 2) t -= 1.5;
      if (vn(x, y, 3, S + 55) > 0.8) t -= 1;
      if (Math.floor((r + vn(x, 0, 20, S + 57) * 6) / 11) !== Math.floor((r - 1 + vn(x, 0, 20, S + 57) * 6) / 11)) t -= 1.3; // estrato
      if (r <= hang + 3) t += 1.2; // canto de arriba con luz
      let c = ROCK[Math.max(0, Math.min(ROCK.length - 1, Math.round(t)))];
      if (r < hang + 9 && vn(x, y, 7, S + 61) > 0.58) c = GRASS[Math.max(1, grassIdx[i] - 2)]; // musgo
      if (r >= fh - 1) c = ROCK[0];
      else if (r >= fh - 3 && hash(x >> 1, 7, S + 64) > 0.6) c = ROCK[1]; // piedritas al pie
      set(i, c);
    }
  }

  // ---- 6. agua y orillas ----
  for (let i = 0; i < N; i++) {
    const x = i % W, y = (i / W) | 0;
    if (kind[i] === 4) {
      // agua: transparente (debajo va el cuadro animado) con espuma, banda clara y fondo más oscuro
      const dl = dLand[i];
      img.data[i * 4 + 3] = 0;
      if (dl <= 1) set(i, pal.shore[0], 210);
      else if (dl <= 2 && hash(x >> 1, y, S + 71) > 0.3) set(i, pal.shore[1], 160);
      else if (dl <= 6) set(i, pal.shore[2], dl <= 4 ? 110 : 60);
      else if (dl > 14) {
        const a = Math.min(110, (dl - 14) * 9);
        if ((x + y) % 2 === 0 || a > 60) set(i, pal.shore[3], Math.min(150, a * 1.3));
      }
    } else if (kind[i] === 0 && dWater[i] <= 2) {
      // tierra mojada de la orilla
      set(i, dWater[i] === 1 ? pal.wetEarth[0] : pal.wetEarth[1]);
    }
  }
  // juncos de la orilla quedan para los objetos

  // ---- hundidos (solo si el diseño los trae: el resto sale igual) ----
  const pitLip = new Uint8Array(d.pits?.length ? N : 0);
  for (const pit of d.pits ?? []) {
    const pp = pit.poly.map(([x, y]) => [x * TILE, y * TILE] as TP);
    const xs = pp.map((p) => p[0]), ys = pp.map((p) => p[1]);
    const x0 = Math.max(1, Math.floor(Math.min(...xs) - 24)), x1 = Math.min(W - 2, Math.ceil(Math.max(...xs) + 24));
    const y0 = Math.max(1, Math.floor(Math.min(...ys) - 24)), y1 = Math.min(H - 2, Math.ceil(Math.max(...ys) + 24));
    const inPit = (x: number, y: number) => polySd(x, y, pp) + (vn(x, y, 24, S + 501) - 0.5) * 14 < 0;
    const ex0 = (pit.entry.x - pit.entry.w / 2) * TILE, ex1 = (pit.entry.x + pit.entry.w / 2) * TILE;
    for (let x = x0; x <= x1; x++) {
      // primera fila del hundido en esta columna: debajo va la cara de roca
      let top = -1, bottom = -1;
      for (let y = y0; y <= y1; y++) if (inPit(x, y)) { if (top < 0) top = y; bottom = y; }
      if (top < 0) continue;
      const faceH = 34 + Math.floor(vn(x, 0, 9, S + 503) * 8);
      const hang = 1 + Math.floor(vn(x, 0, 5, S + 505) * 3);
      for (let y = top; y <= bottom; y++) {
        const i = y * W + x;
        if (!inPit(x, y) || kind[i] === 4) continue;
        const r = y - top;
        // en la bajada no hay pared: tierra que baja hasta el piso del hundido
        const entry = x >= ex0 && x <= ex1 && bottom - y < 26;
        if (entry) { kind[i] = 1; set(i, DIRT[Math.max(0, Math.min(DIRT.length - 1, 2 + Math.round((y - (bottom - 26)) / 13)))]); continue; }
        const side = !inPit(x - 5, y) || !inPit(x + 5, y);
        if (r <= faceH) {
          kind[i] = 3;
          if (r <= hang) { set(i, GRASS[Math.max(0, grassIdx[i] - 1)]); continue; }
          const cw = 11 + Math.floor(vn(x, 0, 60, S + 507) * 7), cx = (x + Math.floor(vn(x, 0, 30, S + 509) * 14)) % cw;
          let t = 4 - (r / faceH) * 2.6 + (vn(x, y * 0.3, 6, S + 511) - 0.5) * 1.6;
          if (cx <= 1) t += 1.2; else if (cx >= cw - 2) t -= 1.4;
          if (r >= faceH - 1) t = 0;
          set(i, ROCK[Math.max(0, Math.min(ROCK.length - 1, Math.round(t)))]);
        } else if (side) {
          kind[i] = 3;
          set(i, ROCK[!inPit(x - 5, y) ? 4 : 2]);
        } else if (kind[i] === 0) {
          // el piso del hundido: un tono más oscuro, y más todavía pegado a las paredes (oclusión)
          const near = !inPit(x, y - faceH - 6) || !inPit(x - 9, y) || !inPit(x + 9, y) || !inPit(x, y + 4);
          set(i, GRASS[Math.max(0, grassIdx[i] - (near ? 3 : 1))]);
        }
      }
      // el canto del borde sur (el piso de arriba termina): oscuro y con luz, y no se pasa salvo por la bajada
      for (let y = bottom + 1; y <= Math.min(H - 1, bottom + 3); y++) {
        const i = y * W + x;
        if (x >= ex0 && x <= ex1) { if (kind[i] === 0) { kind[i] = 1; set(i, DIRT[3]); } continue; }
        if (kind[i] !== 0) continue;
        set(i, y === bottom + 1 ? pal.edgeDark : GRASS[Math.min(GRASS.length - 1, grassIdx[i] + 2)]);
        pitLip[i] = 1;
      }
    }
  }

  // ---- grillas por cuadro ----
  const TW = d.w, TH = d.h;
  const solid = new Uint8Array(TW * TH), waterTiles = new Uint8Array(TW * TH), tileKind = new Uint8Array(TW * TH), tileHigh = new Uint8Array(TW * TH);
  for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) {
    const cnt = [0, 0, 0, 0, 0, 0];
    let hi = 0, lo = 0, lip = 0;
    for (let y = ty * TILE; y < ty * TILE + TILE; y += 2) for (let x = tx * TILE; x < tx * TILE + TILE; x += 2) {
      const i = y * W + x;
      cnt[kind[i]]++;
      if (pitLip.length && (pitLip[i] || pitLip[i + W])) lip++;
      if (high[i]) hi++; else lo++;
    }
    const t = ty * TW + tx, total = (TILE / 2) ** 2;
    waterTiles[t] = cnt[4] > 0 ? 1 : 0;
    tileHigh[t] = hi > lo ? 1 : 0;
    tileKind[t] = cnt.indexOf(Math.max(...cnt));
    // no se pasa: mucha agua, roca del acantilado o el borde de la meseta (menos en las escaleras)
    const stairs = cnt[5] > total * 0.2;
    if (cnt[4] > total * 0.45) solid[t] = 1;
    if (cnt[3] > total * 0.12 && !stairs) solid[t] = 1;
    if (hi > 0 && lo > 0 && !stairs && cnt[3] + cnt[5] > 0) solid[t] = 1;
    if (hi > total * 0.15 && lo > total * 0.15 && !stairs) solid[t] = 1;
    if (lip > 0) solid[t] = 1;
  }
  return { img, kind, high, solid, waterTiles, tileKind, tileHigh };
}

/** Cuadro de agua profunda que pega por todos lados, 4 cuadros de animación (onditas que se corren). */
export function waterTile(frame: number, base = '#1d4a6a'): Raster {
  const r = createRaster(TILE, TILE);
  const lo = shade(base, -0.05), hi = shade(base, 0.05), sparkle = shade(base, 0.2);
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    const n = pnoise(x + frame * 2, y, 8, TILE, 91) * 0.6 + pnoise(x, y + frame, 4, TILE, 93) * 0.4;
    let c = n < 0.38 ? lo : n < 0.66 ? base : hi;
    const row = Math.floor(y / 4), seg = Math.floor((((x + frame * 3 + row * 7) % TILE) + TILE) % TILE / 5);
    if (y % 4 === 1 && hash(seg, row, 97 + (row % 3)) > 0.74) c = sparkle;
    const [R, G, B] = RGB(c); const k = (y * TILE + x) * 4;
    r.data[k] = R; r.data[k + 1] = G; r.data[k + 2] = B; r.data[k + 3] = 255;
  }
  return r;
}

/** Corta la imagen grande en trozos (para que ninguna textura sea enorme). */
export function chunks(img: Raster, size: number): { x: number; y: number; img: Raster }[] {
  const out: { x: number; y: number; img: Raster }[] = [];
  for (let y = 0; y < img.h; y += size) for (let x = 0; x < img.w; x += size) {
    const w = Math.min(size, img.w - x), h = Math.min(size, img.h - y);
    const c = createRaster(w, h);
    for (let yy = 0; yy < h; yy++) c.data.set(img.data.subarray(((y + yy) * img.w + x) * 4, ((y + yy) * img.w + x + w) * 4), yy * w * 4);
    out.push({ x, y, img: c });
  }
  return out;
}

/**
 * Suelo de bosque: oscurece el pasto bajo las masas de árboles y le pone hojarasca, ramitas y manchas de musgo.
 * density: por cuadro, 0 (abierto) a 1 (bosque cerrado), ya suavizada.
 */
export function forestFloor(t: PaintedTerrain, wTiles: number, hTiles: number, density: Float32Array, seed: number, litter?: (x: number, y: number) => number) {
  const img = t.img, W = img.w, H = img.h;
  const idx = new Map<number, number>();
  GRASS.forEach((h, i) => idx.set(parseInt(h.slice(1), 16), i));
  const G = GRASS.map((h) => RGB(h));
  const dAt = (x: number, y: number) => {
    const gx = x / TILE - 0.5, gy = y / TILE - 0.5, x0 = Math.max(0, Math.min(wTiles - 1, Math.floor(gx))), y0 = Math.max(0, Math.min(hTiles - 1, Math.floor(gy)));
    const x1 = Math.min(wTiles - 1, x0 + 1), y1 = Math.min(hTiles - 1, y0 + 1), fx = Math.max(0, Math.min(1, gx - x0)), fy = Math.max(0, Math.min(1, gy - y0));
    const a = density[y0 * wTiles + x0], b = density[y0 * wTiles + x1], c = density[y1 * wTiles + x0], d = density[y1 * wTiles + x1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (t.kind[i] !== 0) continue;
    const d = dAt(x, y);
    if (d < 0.08) continue;
    const k = i * 4;
    const key = (img.data[k] << 16) | (img.data[k + 1] << 8) | img.data[k + 2];
    const gi = idx.get(key);
    // un poco de ruido para que el borde de la sombra no sea una línea
    const shift = Math.round(d * 3.4 + (vn(x, y, 6, seed + 5) - 0.5) * 1.2);
    if (gi !== undefined) { const c = G[Math.max(0, gi - shift)]; img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; }
    else { const m = 1 - d * 0.45; img.data[k] *= m; img.data[k + 1] *= m; img.data[k + 2] *= m; }
  }
  // hojarasca y musgo
  for (let cy = 0; cy < H; cy += 4) for (let cx = 0; cx < W; cx += 4) {
    const x = cx + Math.floor(hash(cx, cy, seed + 31) * 4), y = cy + Math.floor(hash(cx, cy, seed + 32) * 4);
    if (x >= W || y >= H || t.kind[y * W + x] !== 0) continue;
    const d = dAt(x, y), roll = hash(cx, cy, seed + 33);
    if (d < 0.3 || roll > d * 0.55 * (litter ? litter(x, y) : 1)) continue;
    const pick = hash(cx, cy, seed + 34);
    const put = (px: number, py: number, h: string) => { if (px < W && py < H && t.kind[py * W + px] === 0) { const c = RGB(h), k = (py * W + px) * 4; img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; } };
    if (pick < 0.55) { const c = LEAVES[Math.floor(hash(cx, cy, seed + 35) * LEAVES.length)]; put(x, y, c); put(x + 1, y, shade(c, -0.06)); if (pick < 0.25) put(x, y + 1, shade(c, -0.12)); }
    else if (pick < 0.8) { const c = GRASS[5 + Math.floor(hash(cx, cy, seed + 36) * 3)]; put(x, y, c); put(x + 1, y, c); put(x, y + 1, GRASS[3]); put(x - 1, y + 1, c); }
    else { put(x, y, '#3a2e24'); put(x + 1, y + 1, '#3a2e24'); put(x + 2, y + 1, '#2a221c'); }
  }
}