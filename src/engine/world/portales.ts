import { createRaster, type Raster } from '../core/raster';
import type { WorldObject } from './objects';
import { contactShadow } from './premium/contact';

/**
 * Portales premium (#40): 96 x 128, apoyo abajo al centro. Un arco de piedra con runas que brillan (quieto) y adentro
 * el remolino que gira en espiral hacia el centro, con chispas que salen del borde.
 *
 * - `girar` (12 cuadros a 12 fps, en bucle): arco con las runas prendidas y el remolino.
 * - `abrir` (8 cuadros): las runas se prenden una por una y el remolino nace en el centro.
 * - `cerrar` (6 cuadros): el remolino se cierra hacia el centro y las runas se apagan.
 * - `arco` (1 cuadro) y `remolino` (12 cuadros): las dos capas por separado, por si el juego quiere dibujar el arco
 *   delante y el remolino detrás (o teñir solo uno). `apagado`: el arco con las runas apagadas.
 *
 * Uno por mundo: `portal_verde` (verde y dorado, el Bosque), `portal_violeta` (la Catedral), `portal_ambar` (las
 * Galerías), `portal_rojo` (rojo que gotea, el Mundo 4) y `portal_azul` (el de siempre). La piedra del arco toma algo
 * de cada mundo: musgo en el Bosque, piedra clara en la Catedral, piedra azul en las Galerías y piedra mojada en el
 * Mundo 4. La luz trae radio 160.
 */

export type PortalColor = 'azul' | 'rojo' | 'verde' | 'violeta' | 'ambar';

interface Look {
  /** remolino: de lo más hondo (0) a lo más claro (4) */
  swirl: string[];
  /** runas prendidas y chispas */
  rune: string;
  spark: string;
  /** piedra del arco, de oscuro a claro (5 tonos) */
  stone: string[];
  /** algo de cada mundo sobre la piedra */
  extra?: 'musgo' | 'gotea';
  light: string;
}

const LOOKS: Record<PortalColor, Look> = {
  azul: { swirl: ['#060c2a', '#12286a', '#2450c8', '#5a9aff', '#d8f0ff'], rune: '#8ac8ff', spark: '#e0f4ff', stone: ['#14161e', '#252a36', '#3a4150', '#565e70', '#7a8496'], light: '#6cb4ff' },
  rojo: { swirl: ['#1a0206', '#4a0810', '#9a1a22', '#e8483a', '#ffd0a0'], rune: '#ff5a3a', spark: '#ffb07a', stone: ['#0b1210', '#18221f', '#2a3632', '#3f4e48', '#5c6e68'], extra: 'gotea', light: '#ff4a32' },
  verde: { swirl: ['#04180c', '#0e4220', '#22883a', '#7ad85a', '#f0ffc0'], rune: '#ffd27a', spark: '#ffe8a0', stone: ['#14140f', '#26261c', '#3c3a2c', '#57543f', '#7a7458'], extra: 'musgo', light: '#8ae86a' },
  violeta: { swirl: ['#10061e', '#2e1258', '#6a32c0', '#b07aff', '#f0dcff'], rune: '#c8a0ff', spark: '#f0e0ff', stone: ['#1c1a20', '#322e36', '#4c4652', '#6c6574', '#958d9c'], light: '#b07aff' },
  ambar: { swirl: ['#1e0c02', '#5a2806', '#b86412', '#ffb35a', '#fff0c0'], rune: '#ffc070', spark: '#fff0c0', stone: ['#0b0f17', '#151b26', '#2c3646', '#4a586c', '#6a7a90'], light: '#ffb35a' },
};

const W = 96, H = 128;
/** el hueco del arco: semicírculo de radio RI con centro (CX, CY) y las jambas hasta el piso */
const CX = 47.5, CY = 50, RI = 25, RO = 39, FLOOR = 123;

const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function hash(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function put(r: Raster, x: number, y: number, c: number[] | string, a = 255) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= r.w || y >= r.h) return;
  const k = (y * r.w + x) * 4, v = typeof c === 'string' ? hex(c) : c;
  if (a >= 255 || !r.data[k + 3]) { r.data[k] = v[0]; r.data[k + 1] = v[1]; r.data[k + 2] = v[2]; r.data[k + 3] = Math.max(a, r.data[k + 3]); return; }
  const t = a / 255;
  for (let i = 0; i < 3; i++) r.data[k + i] = Math.round(r.data[k + i] * (1 - t) + v[i] * t);
  r.data[k + 3] = Math.max(r.data[k + 3], a);
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const tone = (pal: string[], l: number, x: number, y: number, dither = true) => {
  const t = Math.max(0, Math.min(1, l)) * (pal.length - 1), b = Math.floor(t);
  return pal[Math.min(pal.length - 1, t - b > (dither ? BAYER[(y & 3) * 4 + (x & 3)] : 0.5) ? b + 1 : b)];
};

/** ¿El pixel está en el hueco del arco? */
const inOpening = (x: number, y: number) => (y + 0.5 <= CY ? Math.hypot(x + 0.5 - CX, y + 0.5 - CY) < RI : Math.abs(x + 0.5 - CX) < RI && y < FLOOR);

/** Las piedras del arco: dovelas en el semicírculo, sillares en las jambas, la clave arriba y los zócalos. */
function stoneAt(x: number, y: number): { id: number; u: number; v: number; rune: boolean } | null {
  const px = x + 0.5, py = y + 0.5;
  if (py <= CY) {
    const d = Math.hypot(px - CX, py - CY);
    if (d < RI || d > RO) return null;
    // 9 dovelas de 20 grados; la del medio (la clave) un poco más alta
    const a = Math.atan2(CY - py, px - CX), k = Math.min(8, Math.floor(((Math.PI - a) / Math.PI) * 9));
    if (k === 4 && d > RO - 0.5) return null;
    const a0 = Math.PI - (k * Math.PI) / 9, a1 = Math.PI - ((k + 1) * Math.PI) / 9;
    const u = (a0 - a) / (a0 - a1), v = (d - RI) / (RO - RI);
    return { id: k, u, v, rune: true };
  }
  // jambas y zócalo
  const left = px < CX;
  const xi = left ? px - (CX - RO) : CX + RO - px; // 0 afuera, 14 adentro
  if (py > FLOOR + 4) return null;
  const plinth = py > FLOOR - 12;
  const wide = plinth ? 3 : 0;
  if (xi < -wide || xi > RO - RI) return null;
  if (plinth) return { id: 30 + (left ? 0 : 1), u: (xi + wide) / (RO - RI + wide), v: (py - (FLOOR - 12)) / 16, rune: false };
  const row = Math.floor((py - CY) / 12.2);
  const u = xi / (RO - RI), v = ((py - CY) / 12.2) % 1;
  return { id: 10 + row * 2 + (left ? 0 : 1), u: left ? u : u, v, rune: row % 2 === 0 };
}

/** Las runas: un glifo de 3 x 5 por piedra (sin letras: rombos, ganchos y flechas). */
const GLYPHS = [
  ['.#.', '#.#', '#.#', '.#.', '...'],
  ['.#.', '###', '.#.', '...', '.#.'],
  ['#.#', '.#.', '...', '.#.', '#.#'],
  ['.#.', '.#.', '###', '.#.', '.#.'],
  ['..#', '.#.', '#..', '.#.', '..#'],
  ['.#.', '#.#', '...', '#.#', '.#.'],
];

/** El orden en que se prenden las runas al abrir: de abajo a la izquierda, por arriba, hasta abajo a la derecha. */
const RUNE_ORDER = [14, 10, 0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 15];

function runeSpots(): { id: number; x: number; y: number; g: number }[] {
  const out: { id: number; x: number; y: number; g: number }[] = [];
  for (let k = 0; k < 9; k++) {
    const a = Math.PI - ((k + 0.5) * Math.PI) / 9, d = (RI + RO) / 2;
    out.push({ id: k, x: Math.round(CX + Math.cos(a) * d - 1), y: Math.round(CY - Math.sin(a) * d - 2), g: k % GLYPHS.length });
  }
  for (const row of [0, 2]) for (const left of [true, false]) {
    const y = Math.round(CY + row * 12.2 + 4);
    out.push({ id: 10 + row * 2 + (left ? 0 : 1), x: Math.round(left ? CX - (RI + RO) / 2 - 1 : CX + (RI + RO) / 2 - 1), y, g: (row + (left ? 1 : 4)) % GLYPHS.length });
  }
  return out;
}

/** El arco con sus runas: `lit` dice cuánto brilla cada runa (por id de piedra, 0 a 1). */
function arch(L: Look, lit: (id: number) => number, f: number): Raster {
  const r = createRaster(W, H);
  const S = L.stone;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = stoneAt(x, y);
    if (!s) continue;
    // bisel de cada piedra: arriba e izquierda con luz, abajo y derecha en sombra, juntas oscuras
    const edgeU = Math.min(s.u, 1 - s.u), edgeV = Math.min(s.v, 1 - s.v);
    const joint = s.id < 9 ? s.u < 0.06 || s.u > 0.94 : s.id < 30 ? s.v < 0.09 : s.v < 0.05;
    // cara pareja de cada piedra (un tono propio por piedra) con poquito grano: se lee la piedra, no ruido
    let l = 0.5 + (hash(s.id, 0, 5) - 0.5) * 0.16 + (hash(x >> 2, y >> 2, s.id + 3) - 0.5) * 0.1;
    if (s.id < 9) { if (s.v > 0.9) l += 0.25; if (s.v < 0.1) l -= 0.25; if (s.u < 0.14) l += 0.12; if (s.u > 0.86) l -= 0.15; }
    else { if (s.v < 0.18) l += 0.2; if (s.v > 0.82) l -= 0.2; if ((x < CX ? s.u < 0.1 : s.u > 0.9) && s.id < 30) l += 0.12; }
    // la cara de adentro del arco (mira al remolino) es más oscura; el borde de afuera tiene canto
    void edgeU; void edgeV;
    let c = joint ? S[0] : tone(S, l, x, y, false);
    // grietas y desgaste
    if (!joint && hash(x, y, 77) > 0.985) c = S[0];
    put(r, x, y, c);
  }
  // contorno de 1 pixel por fuera, el tono más oscuro
  const a0 = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) a0[i] = r.data[i * 4 + 3];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (a0[y * W + x]) continue;
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < W && Y < H && a0[Y * W + X]; });
    if (n && !inOpening(x, y)) put(r, x, y, '#06070a');
  }
  // lo de cada mundo
  if (L.extra === 'musgo') for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!a0[y * W + x]) continue;
    const s = stoneAt(x, y);
    if (!s) continue;
    // musgo arriba de cada piedra y en los zócalos
    const top = s.id < 9 ? s.v > 0.75 : s.v < 0.25 || s.id >= 30;
    if (top && hash(x >> 2, y >> 1, 91) > 0.62) put(r, x, y, hash(x >> 1, y, 92) > 0.4 ? '#3a6a2a' : '#5a9a3a');
  }
  if (L.extra === 'gotea') for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    // piedra mojada: brillos verdes fríos sueltos
    if (a0[y * W + x] && hash(x, y, 93) > 0.975) put(r, x, y, '#6fb8a8', 150);
  }
  // las runas
  for (const sp of runeSpots()) {
    const k = lit(sp.id);
    const g = GLYPHS[sp.g];
    for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) {
      if (g[j][i] !== '#') continue;
      if (k <= 0) { put(r, sp.x + i, sp.y + j, S[0]); continue; }
      const flick = 0.85 + 0.15 * Math.sin(f * 1.7 + sp.id);
      put(r, sp.x + i, sp.y + j, L.rune, Math.round(255 * Math.min(1, k * flick)));
      // halo suave alrededor de cada trazo
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = sp.x + i + dx, Y = sp.y + j + dy; if (X >= 0 && Y >= 0 && X < W && Y < H && !(g[j + dy]?.[i + dx] === '#')) put(r, X, Y, L.rune, Math.round(70 * k)); }
    }
  }
  return r;
}

/**
 * El remolino: espiral de 3 brazos que gira hacia el centro. `open` (0 a 1) es cuánto del hueco ocupa (nace en el
 * centro), `f` el cuadro del ciclo de 12 (un giro de 120 grados: el bucle cierra).
 */
function swirl(L: Look, open: number, f: number): Raster {
  const r = createRaster(W, H);
  if (open <= 0) return r;
  const cy = 76, ry = 47, rx = RI;
  const P = L.swirl;
  const phase = (f / 12) * ((Math.PI * 2) / 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!inOpening(x, y)) continue;
    const dx = (x + 0.5 - CX) / rx, dy = (y + 0.5 - cy) / ry, d = Math.hypot(dx, dy);
    // el borde del remolino que crece desde el centro (ondulado)
    const a = Math.atan2(dy, dx);
    const edge = open * 1.45 + Math.sin(a * 5 + f) * 0.03;
    if (d > edge) continue;
    // espiral logarítmica: los brazos se enroscan y corren hacia el centro con la fase
    const s = a * 3 + Math.log(d + 0.04) * 4.2 + phase * 3 * 3;
    const arm = 0.5 + 0.5 * Math.sin(s);
    // más claro en el centro y en los brazos; hondo cerca del borde de piedra
    let l = arm * 0.55 + Math.max(0, 1 - d * 1.6) * 0.65 - Math.max(0, d - 0.85) * 0.5;
    l += (hash(x >> 1, (y + f * 2) >> 1, 5) - 0.5) * 0.12;
    let c = tone(P, l, x, y);
    // el ojo del remolino: blanco tibio
    if (d < 0.07 * open + 0.02) c = P[4];
    // el borde del hueco se hunde (la piedra le hace sombra)
    const bd = y + 0.5 <= CY ? RI - Math.hypot(x + 0.5 - CX, y + 0.5 - CY) : Math.min(RI - Math.abs(x + 0.5 - CX), FLOOR - y);
    if (bd < 1.6 && open >= 1) c = P[0];
    put(r, x, y, c);
  }
  // chispas que salen del borde: cada una nace en el borde del hueco y se aleja (ciclo de 12 cuadros)
  if (open >= 0.6) for (let i = 0; i < 14; i++) {
    const t = ((f + i * 5) % 12) / 12;
    const a = hash(i, 1, 41) * Math.PI * 2, rr = 1 + t * 0.35;
    const sx = CX + Math.cos(a) * rx * rr * open, sy = cy + Math.sin(a) * ry * rr * 0.98 * open;
    if (sy > FLOOR - 1 || sy < 4) continue;
    put(r, sx, sy, L.spark, Math.round(255 * (1 - t)));
    if (t < 0.4) put(r, sx - Math.cos(a), sy - Math.sin(a), L.swirl[3], Math.round(200 * (1 - t)));
  }
  // el rojo del Mundo 4 gotea: gotas que bajan por el borde del hueco y caen al piso
  if (L.extra === 'gotea' && open >= 0.8) {
    // el charco al pie del remolino, quieto
    for (let x = Math.round(CX - RI + 2); x <= CX + RI - 2; x++) { const w = Math.sin(((x - (CX - RI)) / (RI * 2)) * Math.PI); if (w > 0.2) { put(r, x, FLOOR, '#5a0a12', 230); if (w > 0.55) put(r, x, FLOOR + 1, '#3a060c', 200); } }
    for (let i = 0; i < 5; i++) {
      const x0 = Math.round(CX - RI + 5 + hash(i, 2, 43) * (RI * 2 - 10));
      const t = ((f + i * 7) % 12) / 12;
      // la gota se estira colgando del remolino, se suelta y cae
      if (t < 0.5) { const len = 2 + Math.round(t * 8); for (let k = 0; k < len; k++) put(r, x0, FLOOR - 14 + k, k === len - 1 ? '#ff6a4a' : '#c01a22'); }
      else { const y = Math.round(FLOOR - 10 + (t - 0.5) * 2 * 11); put(r, x0, y, '#ff6a4a'); put(r, x0, y + 1, '#c01a22'); put(r, x0, y - 1, '#9a1a22', 150); }
      if (t > 0.9) { put(r, x0 - 1, FLOOR, '#e8483a'); put(r, x0 + 1, FLOOR, '#e8483a'); }
    }
  }
  return r;
}

function compose(a: Raster, b: Raster): Raster {
  const out = createRaster(W, H);
  out.data.set(b.data);
  for (let i = 0; i < W * H; i++) if (a.data[i * 4 + 3]) { const k = i * 4, t = a.data[k + 3] / 255; for (let c = 0; c < 3; c++) out.data[k + c] = Math.round(out.data[k + c] * (1 - t) + a.data[k + c] * t); out.data[k + 3] = Math.max(out.data[k + 3], a.data[k + 3]); }
  return out;
}

export function premiumPortal(color: PortalColor): WorldObject {
  const L = LOOKS[color];
  const all = () => 1;
  const girar = Array.from({ length: 12 }, (_, f) => compose(arch(L, all, f), swirl(L, 1, f)));
  // abrir: 8 cuadros; las runas se prenden de a dos y el remolino nace en el centro en los últimos
  const abrir = Array.from({ length: 8 }, (_, f) => {
    const n = Math.round(((f + 1) / 7) * RUNE_ORDER.length);
    const lit = (id: number) => { const i = RUNE_ORDER.indexOf(id); return i < 0 ? 0 : i < n - 1 ? 1 : i < n ? 0.6 : 0; };
    const open = f < 3 ? 0 : [0.12, 0.3, 0.55, 0.8, 1][f - 3];
    return compose(arch(L, lit, f), swirl(L, open, f));
  });
  const cerrar = [1, 0.7, 0.42, 0.2, 0.06, 0].map((o, f) => compose(arch(L, () => (f < 4 ? 1 : f === 4 ? 0.5 : 0), f), swirl(L, o, f)));
  const arco = arch(L, all, 0);
  const o: WorldObject = {
    name: `portal_${color}`, w: W, h: H, anchor: [48, 124], solid: null,
    light: { color: L.light, radius: 160, pulse: true, dy: 50 },
    anims: {
      girar: { frames: girar, fps: 12, loop: true },
      abrir: { frames: abrir, fps: 12, loop: false },
      cerrar: { frames: cerrar, fps: 12, loop: false },
      arco: { frames: [arco], fps: 1, loop: true },
      remolino: { frames: Array.from({ length: 12 }, (_, f) => swirl(L, 1, f)), fps: 12, loop: true },
      apagado: { frames: [arch(L, () => 0, 0)], fps: 1, loop: true },
    },
  };
  o.shadow = contactShadow(arco, o.anchor);
  return o;
}

/** El portal de cada mundo (el que se usa en `portal_llegada` y `portal_jefe` de ese mundo). */
export const PORTAL_MUNDO: Record<string, PortalColor> = { mundo1: 'verde', mundo2: 'violeta', mundo3: 'ambar', mundo4: 'rojo' };

export function premiumPortals(colors: PortalColor[] = ['azul', 'rojo', 'verde', 'violeta', 'ambar']): WorldObject[] {
  return colors.map(premiumPortal);
}
