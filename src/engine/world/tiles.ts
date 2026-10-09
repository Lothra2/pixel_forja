import { createRaster, type Raster } from '../core/raster';
import { hexToLab, labToHex, labToLch, lchToLab } from '../color/oklab';

/**
 * Tileset del mundo, vista de arriba tipo Stardew (cuadros de 32 px).
 * El pasto, la tierra y el agua usan ruido periódico (se repite cada 32 px), así los cuadros pegan sin costuras.
 * Camino y agua se ponen sobre el pasto con autotile de esquinas (Wang de 2 esquinas): 16 cuadros por terreno,
 * el índice sale de qué esquinas son camino o agua (TL=1, TR=2, BR=4, BL=8). El borde es orgánico, no recto.
 */

export const TILE = 32;

export type Biome = 'bosque' | 'cueva' | 'infierno';

interface Pal { base: string; dark: string; light: string; accent: string }

/** Paletas por mundo (el pasto del bosque, el piso de la cueva, la ceniza del infierno). */
export const BIOMES: Record<Biome, { ground: Pal; path: Pal; water: Pal; flowers: string[] }> = {
  bosque: {
    ground: { base: '#5f9e3c', dark: '#3f7432', light: '#86bf4a', accent: '#a8d65a' },
    path: { base: '#b08a5a', dark: '#8a6a44', light: '#cfac78', accent: '#9a9488' },
    water: { base: '#3a86c8', dark: '#22578f', light: '#6cb4e4', accent: '#d8f0ff' },
    flowers: ['#f2e05a', '#f08ab4', '#ffffff', '#9ab8ff'],
  },
  cueva: {
    ground: { base: '#5a5560', dark: '#3e3a46', light: '#76707c', accent: '#8a8490' },
    path: { base: '#7a6a58', dark: '#5a4c3e', light: '#98866e', accent: '#6a6470' },
    water: { base: '#2e6a8a', dark: '#1a4460', light: '#5a98b8', accent: '#c8ecff' },
    flowers: ['#7ad8ff', '#b48cff', '#7aff9a', '#ffffff'],
  },
  infierno: {
    ground: { base: '#5a2e2a', dark: '#3a1a1c', light: '#7a3e32', accent: '#9a5a3a' },
    path: { base: '#3a3036', dark: '#24202a', light: '#544a50', accent: '#6a5a5a' },
    water: { base: '#e2551e', dark: '#a8261a', light: '#ffa03a', accent: '#fff0a0' },
    flowers: ['#ff8a1e', '#ffd84a', '#ff4a3a', '#ffe0a0'],
  },
};

const rgb = (hex: string): [number, number, number] => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];

/** Tono más claro u oscuro con giro de tono (sombra fría, luz cálida). */
export function shade(hex: string, dL: number): string {
  const [L, C, h] = labToLch(hexToLab(hex));
  const target = dL < 0 ? (275 * Math.PI) / 180 : (85 * Math.PI) / 180;
  let d = target - h;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  const nh = C < 0.02 ? h : h + Math.sign(d) * Math.min(Math.abs(d), Math.abs(dL) * 0.9);
  return labToHex(lchToLab([Math.max(0.05, Math.min(0.98, L + dL)), C * (dL < 0 ? 1.05 : 0.95), nh]));
}

// ---------- ruido periódico (se repite cada `period` px) ----------

function hash(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Ruido suave que se repite cada `period` pixeles (para que los cuadros peguen). */
export function pnoise(x: number, y: number, cell: number, period: number, seed: number): number {
  const n = period / cell;
  const gx = x / cell, gy = y / cell;
  const x0 = Math.floor(gx), y0 = Math.floor(gy);
  const fx = gx - x0, fy = gy - y0;
  const w = (v: number) => ((v % n) + n) % n;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(w(x0), w(y0), seed), b = hash(w(x0 + 1), w(y0), seed), c = hash(w(x0), w(y0 + 1), seed), d = hash(w(x0 + 1), w(y0 + 1), seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

const fbm = (x: number, y: number, seed: number) => (pnoise(x, y, 16, TILE, seed) * 0.55 + pnoise(x, y, 8, TILE, seed + 7) * 0.3 + pnoise(x, y, 4, TILE, seed + 13) * 0.15);

const put = (r: Raster, x: number, y: number, hex: string, a = 255) => { const i = (y * r.w + x) * 4; const [R, G, B] = rgb(hex); r.data[i] = R; r.data[i + 1] = G; r.data[i + 2] = B; r.data[i + 3] = a; };

/** Pasto (o piso) con textura fina y poco contraste (para que no se note la repetición), briznas y flores. */
export function groundTile(biome: Biome, variant = 0, flowers = false): Raster {
  const P = BIOMES[biome].ground;
  const r = createRaster(TILE, TILE);
  const lo = shade(P.base, -0.035), hi = shade(P.base, 0.03);
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      const n = pnoise(x, y, 8, TILE, 11 + variant * 5) * 0.6 + pnoise(x, y, 4, TILE, 17 + variant * 3) * 0.4;
      put(r, x, y, n < 0.36 ? lo : n < 0.68 ? P.base : hi);
    }
  // matas de briznas: una "v" clara con su sombra abajo (luz de arriba)
  for (let i = 0; i < 9; i++) {
    const x = 1 + Math.floor(hash(i, variant, 3) * (TILE - 2)), y = 1 + Math.floor(hash(i, variant, 4) * (TILE - 3));
    const c = hash(i, variant, 5) > 0.5 ? P.light : P.accent;
    put(r, x - 1, y, c); put(r, x + 1, y, c); put(r, x, y + 1, c);
    put(r, x, y + 2, P.dark); put(r, x - 1, y + 1, lo); put(r, x + 1, y + 1, lo);
  }
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(hash(i, variant, 6) * TILE), y = Math.floor(hash(i, variant, 7) * TILE);
    put(r, x, y, hash(i, variant, 8) > 0.5 ? hi : lo);
  }
  if (flowers) {
    const cols = BIOMES[biome].flowers;
    for (let i = 0; i < 5; i++) {
      const x = 2 + Math.floor(hash(i, variant, 9) * (TILE - 4)), y = 2 + Math.floor(hash(i, variant, 10) * (TILE - 5));
      const c = cols[Math.floor(hash(i, variant, 11) * cols.length)];
      put(r, x - 1, y, c); put(r, x + 1, y, c); put(r, x, y - 1, c); put(r, x, y + 1, shade(c, -0.12));
      put(r, x, y, '#fff2a0'); put(r, x, y + 2, P.dark);
    }
  }
  return r;
}

/** Valor del terreno (0 pasto, 1 camino/agua) en un pixel del cuadro según sus 4 esquinas. */
function cornerValue(mask: number, x: number, y: number): number {
  const tl = mask & 1 ? 1 : 0, tr = mask & 2 ? 1 : 0, br = mask & 4 ? 1 : 0, bl = mask & 8 ? 1 : 0;
  const u = (x + 0.5) / TILE, v = (y + 0.5) / TILE;
  const top = tl + (tr - tl) * u, bot = bl + (br - bl) * u;
  return top + (bot - top) * v;
}

/**
 * Cuadro de terreno sobre el pasto con autotile de 2 esquinas. mask: TL=1, TR=2, BR=4, BL=8 (bits en 1 = camino o agua).
 * frame anima el agua (4 cuadros).
 */
export function terrainTile(biome: Biome, kind: 'path' | 'water', mask: number, frame = 0): Raster {
  const base = groundTile(biome, mask % 3);
  if (mask === 0) return base;
  const P = kind === 'path' ? BIOMES[biome].path : BIOMES[biome].water;
  const G = BIOMES[biome].ground;
  const r = base;
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      // borde orgánico: el umbral se mueve con ruido periódico (igual en el cuadro vecino)
      const v = cornerValue(mask, x, y) + (fbm(x, y, kind === 'path' ? 31 : 41) - 0.5) * 0.42;
      if (v < 0.5) {
        // sombra del pasto sobre el agua o el camino (un pixel de borde)
        if (v > 0.44) put(r, x, y, shade(G.dark, -0.04));
        continue;
      }
      const depth = v - 0.5;
      if (kind === 'path') {
        const n = pnoise(x, y, 4, TILE, 53) * 0.6 + pnoise(x, y, 2, TILE, 59) * 0.4;
        let c = n < 0.3 ? shade(P.base, -0.04) : n < 0.74 ? P.base : shade(P.base, 0.03);
        if (depth < 0.06) c = P.dark;
        else if (depth < 0.1) c = shade(P.base, -0.05);
        // piedritas
        if (hash(x, y, 77) > 0.975) c = P.accent;
        put(r, x, y, c);
      } else {
        // agua: orilla con espuma, más oscura al centro, destellos que se mueven
        let c = depth < 0.05 ? P.accent : depth < 0.11 ? P.light : depth < 0.3 ? P.base : P.dark;
        // onditas: rayitas horizontales claras que se corren con el cuadro
        if (depth >= 0.14) {
          const row = Math.floor(y / 4), seg = Math.floor(((x + frame * 2 + row * 5) % TILE) / 6);
          if (y % 4 === 1 && hash(seg, row, 19 + (row % 3)) > 0.72) c = depth < 0.3 ? P.light : P.base;
        }
        put(r, x, y, c);
      }
    }
  return r;
}

/** Orden de los cuadros en el tileset del mundo (índice = posición en la hoja, de a 8 por fila). */
export interface TilesetLayout {
  cols: number;
  /** pasto: 4 variantes */
  ground: number[];
  /** pasto con flores: 2 variantes */
  flowers: number[];
  /** camino: 16 cuadros por máscara de esquinas */
  path: number[];
  /** agua: 4 cuadros de animación x 16 máscaras: water[frame][mask] */
  water: number[][];
}

/** Hoja con todo el tileset de un mundo. */
export function tilesetSheet(biome: Biome): { png: Raster; layout: TilesetLayout } {
  const tiles: Raster[] = [];
  const layout: TilesetLayout = { cols: 8, ground: [], flowers: [], path: [], water: [[], [], [], []] };
  for (let v = 0; v < 4; v++) { layout.ground.push(tiles.length); tiles.push(groundTile(biome, v)); }
  for (let v = 0; v < 2; v++) { layout.flowers.push(tiles.length); tiles.push(groundTile(biome, v + 4, true)); }
  // completa la fila
  while (tiles.length % 8) { layout.ground.push(tiles.length); tiles.push(groundTile(biome, tiles.length)); }
  for (let m = 0; m < 16; m++) { layout.path.push(tiles.length); tiles.push(terrainTile(biome, 'path', m)); }
  for (let f = 0; f < 4; f++) for (let m = 0; m < 16; m++) { layout.water[f].push(tiles.length); tiles.push(terrainTile(biome, 'water', m, f)); }
  const rows = Math.ceil(tiles.length / 8);
  const png = createRaster(8 * TILE, rows * TILE);
  tiles.forEach((t, i) => {
    const ox = (i % 8) * TILE, oy = Math.floor(i / 8) * TILE;
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const s = (y * TILE + x) * 4, d = ((oy + y) * png.w + ox + x) * 4;
      for (let c = 0; c < 4; c++) png.data[d + c] = t.data[s + c];
    }
  });
  return { png, layout };
}

/** Máscara de esquinas de un cuadro a partir de una grilla de vértices (true = camino/agua). */
export function cornerMask(v: (x: number, y: number) => boolean, tx: number, ty: number): number {
  return (v(tx, ty) ? 1 : 0) | (v(tx + 1, ty) ? 2 : 0) | (v(tx + 1, ty + 1) ? 4 : 0) | (v(tx, ty + 1) ? 8 : 0);
}
