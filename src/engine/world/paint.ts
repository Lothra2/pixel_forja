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
  /** escaleras talladas en el acantilado: centro x y fila del borde, ancho en cuadros */
  stairs: { x: number; y: number; w: number }[];
  /** ríos: polilínea y ancho en cuadros */
  rivers: { pts: TP[]; w: number }[];
  lakes: { c: TP; rx: number; ry: number }[];
  /** caminos de tierra */
  roads: { pts: TP[]; w: number }[];
  /** plazas de piedra (ruinas) */
  plazas: TP[][];
  /** praderas: pasto claro con muchas flores */
  meadows: { c: TP; r: number }[];
  /** bosque profundo: suelo oscuro con hojas caídas */
  dark: { c: TP; r: number }[];
  /** claros (para el pintor solo aclaran un poco el pasto) */
  clearings?: { c: TP; r: number }[];
}

export interface PaintedTerrain {
  img: Raster;
  /** por pixel: 0 pasto, 1 camino, 2 plaza, 3 acantilado, 4 agua, 5 escalera */
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

function inPoly(x: number, y: number, poly: TP[]): boolean {
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
const GRASS = ['#1c3424', '#22402a', '#2a4e2e', '#335e32', '#3d6f35', '#487f38', '#558f3b', '#629e3e', '#71ad44', '#82bb4b', '#94c855', '#a8d462'];
const DIRT = ['#5e4430', '#715239', '#866343', '#99744f', '#ab855c', '#bf9a6c'];
const COBBLE = ['#4a4652', '#5c5764', '#6e6876', '#827c88', '#98929c', '#b0aab2'];
const SANDSTONE = ['#4e4640', '#6a5e52', '#80725f', '#968670', '#ad9c82', '#c4b496'];
const BLUESTONE = ['#3e4652', '#505a68', '#626e7c', '#768492', '#8c9aa8', '#a6b2be'];
const ROCK = ['#2e2934', '#3a3440', '#47404d', '#554d5a', '#655c69', '#776e7a', '#8a8290'];
const FLOWERS = ['#f2e05a', '#f08ab4', '#ffffff', '#9ab8ff', '#ff8a5a', '#c89aff'];
const LEAVES = ['#c8742a', '#a85a24', '#d8a03a', '#8a4a20'];

/** Pinta el terreno completo. */
export function paintTerrain(d: TerrainDesign): PaintedTerrain {
  const W = d.w * TILE, H = d.h * TILE, N = W * H, S = d.seed;
  const img = createRaster(W, H);
  const kind = new Uint8Array(N);
  const high = new Uint8Array(N);
  const water = new Uint8Array(N);
  const road = new Uint8Array(N);
  const plaza = new Uint8Array(N);

  // ---- máscaras ----
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
  for (const poly of d.plazas) {
    const pp = poly.map(([x, y]) => [x * TILE, y * TILE] as TP);
    const xs = pp.map((p) => p[0]), ys = pp.map((p) => p[1]);
    for (let y = Math.max(0, Math.floor(Math.min(...ys) - 24)); y < Math.min(H, Math.max(...ys) + 24); y++)
      for (let x = Math.max(0, Math.floor(Math.min(...xs) - 24)); x < Math.min(W, Math.max(...xs) + 24); x++)
        if (polySd(x, y, pp) + (fbm(x, y, S + 401) - 0.5) * 30 < 0) plaza[y * W + x] = 1;
  }

  // acantilado: pixels bajos justo debajo de una meseta (cuenta cuántos pixeles bajó desde el borde)
  const run = new Uint16Array(N);
  for (let x = 0; x < W; x++) {
    let r = 9999;
    for (let y = 0; y < H; y++) { const i = y * W + x; if (high[i]) r = 0; else { r++; run[i] = r; } }
  }
  const faceH = new Uint8Array(W);
  for (let x = 0; x < W; x++) faceH[x] = FACE - Math.floor(vn(x, 0, 9, S + 65) * 7) - Math.floor(vn(x, 0, 40, S + 66) * 8);
  const stairAt = (x: number, y: number) => d.stairs.some((s) => Math.abs(x - s.x * TILE) < (s.w * TILE) / 2 && y > s.y * TILE - 70 && y < s.y * TILE + FACE + 40);
  // clasificación final (prioridad: acantilado/escalera > agua > plaza > camino > pasto)
  for (let i = 0; i < N; i++) {
    const x = i % W, y = (i / W) | 0;
    if (!high[i] && run[i] <= faceH[x]) kind[i] = stairAt(x, y) ? 5 : 3;
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
    } else if ((m > 0.12 && vn(x, y, 30, S + 81) > 0.62 - m * 0.2 && roll < 0.95) || roll > 0.995) {
      // ramito de flores (en la pradera muchas, del mismo color)
      const col = FLOWERS[Math.floor(vn(x, y, 80, S + 25) * FLOWERS.length * 0.999)];
      const n = 1 + Math.floor(hash(cx, cy, S + 26) * 3);
      for (let k = 0; k < n; k++) {
        const fx = x + Math.floor((hash(k, cx, cy) - 0.5) * 5), fy = y + Math.floor((hash(cy, k, cx) - 0.5) * 4);
        dot(fx - 1, fy, col); dot(fx + 1, fy, col); dot(fx, fy - 1, col); dot(fx, fy + 1, shade(col, -0.14)); dot(fx, fy, '#fff2a0'); dot(fx, fy + 2, GRASS[Math.max(0, g - 2)]);
      }
    } else if (dk > 0.25 && roll < 0.42 + dk * 0.4) {
      // hojas caídas y ramitas en el bosque oscuro
      const col = LEAVES[Math.floor(hash(cx, cy, S + 27) * LEAVES.length)];
      dot(x, y, col); dot(x + 1, y, shade(col, -0.08)); if (hash(cx, cy, S + 28) < 0.5) dot(x, y + 1, shade(col, -0.15));
    } else if (roll < 0.56) {
      // trébol o piedrita
      if (hash(cx, cy, S + 29) < 0.6) { const c = GRASS[Math.min(GRASS.length - 1, g + 1)]; dot(x, y, c); dot(x + 1, y, c); dot(x, y + 1, c); dot(x + 1, y + 1, GRASS[Math.max(0, g - 1)]); }
      else { dot(x, y, '#9a948c'); dot(x + 1, y, '#7a746e'); }
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
    if (hash(x >> 1, y >> 1, S + 37) > 0.985) c = '#a8a29a';
    else if (hash(x, y, S + 38) > 0.993) c = '#d8c8a8';
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
  // losas irregulares: filas de alto variable, piedras de ancho variable, junta oscura y luz arriba a la izquierda
  const rowOf = new Int32Array(H), rowTop = new Int32Array(H);
  for (let y = 0, r = 0; y < H; r++) { const h = 9 + Math.floor(hash(r, 0, S + 48) * 6); for (let k = 0; k < h && y < H; k++, y++) { rowOf[y] = r; rowTop[y] = y - k; } }
  for (let y = 0; y < H; y++) {
    const row = rowOf[y], ly = y - rowTop[y];
    const rh = (() => { let k = y; while (k + 1 < H && rowOf[k + 1] === row) k++; return k - rowTop[y] + 1; })();
    let sx = -Math.floor(hash(row, 1, S + 49) * 20), sw = 12 + Math.floor(hash(row, 0, S + 50) * 14), col = 0;
    for (let x = 0; x < W; x++) {
      while (x >= sx + sw) { sx += sw; col++; sw = 12 + Math.floor(hash(row, col, S + 50) * 14); }
      const i = y * W + x;
      if (kind[i] !== 2) continue;
      const lx = x - sx;
      // piedras que faltan (sale pasto), más hacia el borde de la plaza
      if (vn(x, y, 18, S + 43) < 0.22 + Math.max(0, 0.45 - dPlazaEdge[i] / 40)) continue;
      const sid = hash(col, row, S + 41);
      let t = 2 + Math.floor(sid * 3);
      if (lx === 0 || ly === 0) t = 0;
      else if (lx === 1 || ly === 1) t = Math.min(5, t + 1);
      else if (lx === sw - 1 || ly === rh - 1) t = Math.max(1, t - 1);
      if (t > 0 && vn(x, y, 3, S + 44) > 0.8) t = Math.max(1, t - 1);
      const pal = sid < 0.3 ? SANDSTONE : sid < 0.45 ? BLUESTONE : COBBLE;
      let c = pal[t];
      if (t === 0 && vn(x, y, 14, S + 45) > 0.52) c = GRASS[Math.max(2, grassIdx[i] - 2)]; // musgo en las juntas
      if (sid > 0.9 && lx > 2 && lx < sw - 2 && ly > 1 && ly < rh - 1 && (lx * 3 + ly) % 5 === 0) c = COBBLE[0]; // grieta
      set(i, c);
    }
  }

  // ---- 5. mesetas: borde de arriba, acantilado, escaleras ----
  for (let i = 0; i < N; i++) {
    if (!high[i] || kind[i] !== 0) continue;
    const dl = dLow[i];
    if (dl === 1) set(i, '#1a2a1e');
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
        // escalones de piedra: franjas horizontales con borde claro
        const step = Math.floor((r - 1) / 7), ly = (r - 1) % 7;
        let c = ly === 0 ? COBBLE[5] : ly === 1 ? COBBLE[4] : ly >= 5 ? COBBLE[1] : COBBLE[3 - (step % 2)];
        const s = d.stairs.find((s2) => Math.abs(x - s2.x * TILE) < (s2.w * TILE) / 2)!;
        const ex = Math.abs(x - s.x * TILE) - (s.w * TILE) / 2;
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
      if (dl <= 1) set(i, '#e8f6ff', 230);
      else if (dl <= 2 && hash(x >> 1, y, S + 71) > 0.3) set(i, '#cfeaff', 170);
      else if (dl <= 6) set(i, '#7cc0ec', dl <= 4 ? 120 : 70);
      else if (dl > 14) {
        const a = Math.min(110, (dl - 14) * 9);
        if ((x + y) % 2 === 0 || a > 60) set(i, '#10345e', a);
      }
    } else if (kind[i] === 0 && dWater[i] <= 2) {
      // tierra mojada de la orilla
      set(i, dWater[i] === 1 ? '#4a3e2e' : '#5e5038');
    }
  }
  // juncos de la orilla quedan para los objetos

  // ---- grillas por cuadro ----
  const TW = d.w, TH = d.h;
  const solid = new Uint8Array(TW * TH), waterTiles = new Uint8Array(TW * TH), tileKind = new Uint8Array(TW * TH), tileHigh = new Uint8Array(TW * TH);
  for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) {
    const cnt = [0, 0, 0, 0, 0, 0];
    let hi = 0, lo = 0;
    for (let y = ty * TILE; y < ty * TILE + TILE; y += 2) for (let x = tx * TILE; x < tx * TILE + TILE; x += 2) {
      const i = y * W + x;
      cnt[kind[i]]++;
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
  }
  return { img, kind, high, solid, waterTiles, tileKind, tileHigh };
}

/** Cuadro de agua profunda que pega por todos lados, 4 cuadros de animación (onditas que se corren). */
export function waterTile(frame: number, base = '#2a66ad'): Raster {
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
