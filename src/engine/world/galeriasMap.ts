import { premiumPortals } from './portales';
import { TILE } from './tiles';
import { paintTerrain, distTo, smoothPath, type TerrainDesign, type TerrainPalette, type TP } from './paint';
import { galeriasObjects, GAL, MINA_PARALAJE } from './galeriasObjects';
import { forestObjects, type WorldObject } from './objects';
import { landmarkObjects } from './landmarks';
import { catedralPremiumObjects } from './catedralPremium';
import { withReactions, reactiveObjects } from './reactions';
import { createPlacer, SCREEN } from './premium/placer';
import type { BigMap, Cristal, Deco, Ent, MapZone, Postal, Prop } from './bosqueMap';

/**
 * Mundo 3: Las Galerías del Eco (encargo 3.1). Minas de cristal abandonadas debajo de la Catedral. Mucho más oscuro,
 * con el misterio subiendo. La luz es el progreso: los cristales se prenden al pegarles y quedan prendidos.
 *
 * Es un interior como la Catedral, pero de cuevas: el piso sale de una grilla por cuadro (salas con borde que respira,
 * túneles y recovecos) y el pintor le pone pared de roca orgánica. El camino principal baja así:
 *
 *   Boca de la Mina > Los Rieles > Sala del Eco > Puente Colgante (sobre el abismo) > Lago de Cristal >
 *   Campamento Abandonado > Cueva de la Reina
 *
 * Ramas que vuelven al camino: la vía muerta debajo de los rieles, la orilla norte del lago, el desvío alto del
 * campamento y el atajo del carrito (del lago a los rieles). Secretos para el olfato de Thor: la Veta Escondida
 * (arriba de los rieles) y el Nicho del Minero (con el tercer pedazo del mural).
 */

export const GALERIAS_W = 100;
export const GALERIAS_H = 80;

/** Lugares (en cuadros) */
export const LG = {
  llegada: [10, 9] as TP,
  boca: [12, 10] as TP,
  rieles: [44, 11] as TP,
  veta: [48, 3.6] as TP,
  eco: [81, 16] as TP,
  puente: [57, 40] as TP,
  lago: [21, 40] as TP,
  campamento: [21, 65] as TP,
  nicho: [11, 55] as TP,
  reina: [80, 64] as TP,
};

type Blob = { c: TP; rx: number; ry: number; seed: number; bumps?: number };
type Tunnel = { pts: TP[]; w: number };

/** Las salas (borde que respira) */
const SALAS: Record<string, Blob> = {
  boca: { c: LG.boca, rx: 8, ry: 6, seed: 1, bumps: 3 },
  veta: { c: LG.veta, rx: 4, ry: 2.5, seed: 2 },
  eco: { c: LG.eco, rx: 12, ry: 11, seed: 3, bumps: 5 },
  puente: { c: LG.puente, rx: 15, ry: 8, seed: 4, bumps: 2 },
  lago: { c: LG.lago, rx: 13, ry: 9, seed: 5, bumps: 4 },
  campamento: { c: LG.campamento, rx: 13, ry: 7.5, seed: 6, bumps: 3 },
  nicho: { c: LG.nicho, rx: 3.4, ry: 3, seed: 7 },
  reina: { c: LG.reina, rx: 14, ry: 11, seed: 8, bumps: 4 },
};

/** Túneles del camino principal */
const CAMINO: Record<string, Tunnel> = {
  boca_rieles: { pts: [[18, 10], [23, 11.5], [28, 11]], w: 5 },
  rieles: { pts: [[26, 11], [33, 10.2], [40, 10.4], [48, 11], [56, 12], [62, 11.4]], w: 6 },
  rieles_eco: { pts: [[60, 11.4], [65, 12.5], [71, 13]], w: 5 },
  eco_puente: { pts: [[80, 25], [78.5, 31], [75, 36], [70.5, 39.5]], w: 4.4 },
  puente_lago: { pts: [[43, 41], [38, 41.5], [32, 41]], w: 5 },
  lago_campamento: { pts: [[22, 47], [21.5, 53], [21, 59]], w: 4 },
  campamento_reina: { pts: [[32, 66], [40, 67.5], [48, 67.6], [57, 66.6], [67, 65]], w: 5 },
};
/** Ramas opcionales: vuelven al camino principal por los dos lados */
const RAMAS: Record<string, Tunnel & { nombre: string; medio: TP }> = {
  via_muerta: { nombre: 'La vía muerta', pts: [[37, 13], [38, 20], [46, 20.8], [54, 20], [55, 13]], w: 5.2, medio: [46, 21] },
  // la orilla norte del lago: el camino pasa por el sur, y por el norte se da la vuelta (no hace falta túnel)
  orilla_norte: { nombre: 'La orilla norte del lago', pts: [], w: 0, medio: [20, 35] },
  desvio_alto: { nombre: 'El desvío alto del campamento', pts: [[31, 61], [35, 57], [44, 56.5], [52, 58], [55, 64]], w: 4.4, medio: [44, 56.5] },
  atajo: { nombre: 'El atajo del carrito', pts: [[30.5, 14], [30.5, 22], [30.5, 33]], w: 3.8, medio: [30, 24] },
};
/** Grietas angostas de los secretos (verticales: así la cara de la pared no las tapa) */
const GRIETAS: Tunnel[] = [
  { pts: [[48.5, 9.5], [48.5, 4.5]], w: 3 },
  { pts: [[12.5, 61], [12.5, 56.5]], w: 3 },
];

/** El abismo del puente: una franja de norte a sur que parte la caverna en dos (en cuadros) */
const ABISMO_X0 = 48.5, ABISMO_X1 = 65.5, PUENTE_Y = 40;

/** El lago de cristal: agua quieta */
const LAGO = { c: [21, 40.5] as TP, rx: 6.2, ry: 3.4 };
/** La arena de la reina */
const ARENA = { c: LG.reina, r: 9 };

/** Piedra azul gris fría, madera vieja de mina, cristales cian, violeta y ámbar. */
export const GALERIAS_PALETTE: TerrainPalette = {
  grass: ['#0e121a', '#121722', '#161c28', '#1a212e', '#1f2734', '#242d3b', '#2a3342', '#303a4a', '#364152', '#3d485a', '#444f62', '#4c586c'],
  dirt: ['#17140f', '#1e1a15', '#26211b', '#2e2820', '#372f26', '#40372c'],
  cobble: ['#1a2030', '#222a3a', '#2c3546', '#374154', '#434e62', '#515d72'],
  sandstone: ['#1a1f2a', '#222834', '#2b3240', '#353d4c', '#404959', '#4c5668'],
  bluestone: ['#182030', '#20293a', '#2a3446', '#354054', '#414d62', '#505c72'],
  rock: ['#0b0f17', '#151b26', '#202836', '#2c3646', '#3a4658', '#4a586c', '#5a6a7e'],
  flowers: ['#24404c', '#2a4a5a', '#2e2a48', '#3a3458', '#3a3024', '#463a2a'],
  leaves: ['#0a0d14', '#1a2030', '#262e3e', '#121620'],
  shore: ['#4a5a6a', '#2a3a4a', '#16222e', '#010306'],
  wetEarth: ['#10120f', '#161814'],
  edgeDark: '#05070c',
  holeDark: '#080a10',
  runes: ['#1e1030', '#5a2a8a', '#140a20', '#2e1a46'],
  pebbles: ['#3a4658', '#4a586c', '#5a6a7e', '#2c3646'],
  flowerHeart: '#5a6a7e',
};

/** El agua del lago: azul verdoso muy oscuro */
export const AGUA_GALERIAS = '#0a1a24';

function hash(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** La grilla del piso: salas, túneles, ramas y grietas. Lo que quede suelto (sin llegar desde la entrada) se cierra. */
export function galeriasCave(seed = 333): Uint8Array {
  const W = GALERIAS_W, H = GALERIAS_H, cave = new Uint8Array(W * H);
  const set = (x: number, y: number) => { if (x >= 1 && y >= 1 && x < W - 1 && y < H - 1) cave[y * W + x] = 1; };
  for (const b of Object.values(SALAS)) {
    // el borde respira: el radio cambia con el ángulo (ruido suave) y le salen unos recovecos
    const n = 7, amp = Array.from({ length: n }, (_, k) => (hash(k, b.seed, seed) - 0.5) * 0.36);
    const rad = (a: number) => { const u = ((a / (2 * Math.PI)) * n + n) % n, k0 = Math.floor(u), f = u - k0, s = f * f * (3 - 2 * f); return 1 + amp[k0] * (1 - s) + amp[(k0 + 1) % n] * s; };
    for (let y = Math.floor(b.c[1] - b.ry - 2); y <= b.c[1] + b.ry + 2; y++) for (let x = Math.floor(b.c[0] - b.rx - 2); x <= b.c[0] + b.rx + 2; x++) {
      const dx = (x + 0.5 - b.c[0]) / b.rx, dy = (y + 0.5 - b.c[1]) / b.ry;
      if (Math.hypot(dx, dy) < rad(Math.atan2(dy, dx))) set(x, y);
    }
    for (let k = 0; k < (b.bumps ?? 0); k++) {
      const a = hash(k, b.seed, seed + 1) * Math.PI * 2, r = 2 + hash(b.seed, k, seed + 2) * 1.6;
      const cx = b.c[0] + Math.cos(a) * b.rx * 0.95, cy = b.c[1] + Math.sin(a) * b.ry * 0.95;
      for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if (Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.2) < r) set(x, y);
    }
  }
  const stroke = (t: Tunnel) => {
    if (!t.pts.length) return;
    // con dos puntos smoothPath no rellena el tramo: se densifica primero
    const dense: TP[] = [];
    t.pts.forEach((p, i) => { if (i) { const q = t.pts[i - 1], n = Math.ceil(Math.hypot(p[0] - q[0], p[1] - q[1]) / 0.5); for (let k = 1; k <= n; k++) dense.push([q[0] + ((p[0] - q[0]) * k) / n, q[1] + ((p[1] - q[1]) * k) / n]); } else dense.push(p); });
    const pts = t.pts.length > 2 ? smoothPath(t.pts, 0.25) : dense;
    for (const [px, py] of pts) {
      const r = t.w / 2;
      for (let y = Math.floor(py - r - 1); y <= py + r + 1; y++) for (let x = Math.floor(px - r - 1); x <= px + r + 1; x++)
        if (Math.abs(x + 0.5 - px) <= r && Math.abs(y + 0.5 - py) <= r && Math.hypot((x + 0.5 - px) / (r + 0.3), (y + 0.5 - py) / (r + 0.3)) < 1.25) set(x, y);
    }
  };
  for (const t of Object.values(CAMINO)) stroke(t);
  for (const t of Object.values(RAMAS)) stroke(t);
  for (const t of GRIETAS) stroke(t);
  // lo que no se alcanza desde la llegada vuelve a ser roca
  const seen = new Uint8Array(W * H), q = [LG.llegada[1] * W + LG.llegada[0]];
  seen[q[0]] = 1;
  for (let i = 0; i < q.length; i++) { const k = q[i]; for (const d of [1, -1, W, -W]) { const j = k + d; if (cave[j] && !seen[j]) { seen[j] = 1; q.push(j); } } }
  for (let k = 0; k < W * H; k++) if (!seen[k]) cave[k] = 0;
  return cave;
}

export function galeriasDesign(seed = 333): TerrainDesign {
  return {
    w: GALERIAS_W, h: GALERIAS_H, seed,
    cave: galeriasCave(seed),
    plateaus: [],
    stairs: [],
    rivers: [],
    lakes: [{ c: LAGO.c, rx: LAGO.rx, ry: LAGO.ry }],
    roads: [],
    plazas: [],
    arenas: [{ c: ARENA.c, r: ARENA.r }],
    meadows: [],
    // lo más hondo es lo más oscuro
    dark: [{ c: LG.eco, r: 12 }, { c: LG.puente, r: 12 }, { c: LG.reina, r: 15 }, { c: [46, 20], r: 6 }],
  };
}

/** Los objetos que usa el Mundo 3: los suyos, unas calcomanías de la Catedral y lo prestado del Bosque. */
export function galeriasMapObjects(): WorldObject[] {
  const prestados = new Set(['cartel', 'aviso_jefe', 'aviso_carga']);
  const catedral = /^(escombro_chico_\d|charco_negro_\d)$/;
  return withReactions([
    ...galeriasObjects(),
    ...catedralPremiumObjects().filter((o) => catedral.test(o.name)),
    ...reactiveObjects().filter((o) => /^(palanca|piedra_empujable)$/.test(o.name)),
    ...[...forestObjects(), ...landmarkObjects()].filter((o) => prestados.has(o.name)),
    ...premiumPortals(['azul', 'rojo', 'ambar']),
  ]);
}

export interface GaleriasReport {
  ramas: { id: string; nombre: string; medio: TP }[];
  secretos: string[];
  muebles: Record<string, number>;
  pantallas: { x: number; y: number; focal: string[]; calcomanias: number }[];
  quitadosPorPaso: number;
}

/** Qué va en cada zona: cristales (cuántos y de qué color), utilería y primer plano. */
const ZONAS: { nombre: string; rect: [number, number, number, number]; props: Record<string, Prop>; cristales: [number, number, number]; muebles: [string, number][]; frente: string[] }[] = [
  { nombre: 'La Boca de la Mina', rect: [2, 2, 24, 18], props: { luz: '#9ab8d8', oscuridad: 0.6, niebla: 0.3, particulas: 'polvo', ambiente: 'galerias' }, cristales: [4, 0, 1], muebles: [['cajon_mina', 2], ['barril_mina', 1], ['roca_mina_0', 1], ['roca_mina_2', 1]], frente: ['estalactitas_frente_0'] },
  { nombre: 'Los Rieles', rect: [24, 2, 64, 24], props: { luz: '#c8a070', oscuridad: 0.75, niebla: 0.35, particulas: 'polvo', ambiente: 'galerias' }, cristales: [1, 1, 6], muebles: [['cajon_mina', 3], ['barril_mina', 2], ['roca_mina_1', 2], ['roca_mina_0', 2]], frente: ['estalactitas_frente_1'] },
  { nombre: 'La Sala del Eco', rect: [66, 2, 98, 30], props: { luz: '#a88aff', oscuridad: 0.8, niebla: 0.4, particulas: 'brillos', ambiente: 'eco' }, cristales: [4, 6, 0], muebles: [['roca_mina_1', 5], ['roca_mina_0', 4], ['roca_mina_2', 4]], frente: ['cristales_techo_frente_0', 'cristales_techo_frente_1'] },
  { nombre: 'El Puente Colgante', rect: [41, 30, 74, 50], props: { luz: '#6a8ad8', oscuridad: 0.8, niebla: 0.7, particulas: 'brasas_frias', ambiente: 'viento' }, cristales: [0, 4, 0], muebles: [['roca_mina_0', 1], ['roca_mina_2', 1]], frente: ['estalactitas_frente_0'] },
  { nombre: 'El Lago de Cristal', rect: [6, 28, 41, 50], props: { luz: '#5ae8ff', oscuridad: 0.7, niebla: 0.6, particulas: 'brillos', ambiente: 'agua' }, cristales: [7, 1, 0], muebles: [['roca_mina_1', 2], ['roca_mina_0', 2], ['roca_mina_2', 2]], frente: ['estalactitas_frente_1'] },
  { nombre: 'El Campamento Abandonado', rect: [6, 56, 36, 76], props: { luz: '#ffb35a', oscuridad: 0.65, niebla: 0.3, particulas: 'humo', ambiente: 'galerias' }, cristales: [0, 0, 5], muebles: [['cajon_mina', 3], ['barril_mina', 2], ['roca_mina_0', 1]], frente: ['estalactitas_frente_0'] },
  { nombre: 'La Cueva de la Reina', rect: [64, 50, 98, 78], props: { musica: 'jefe', luz: '#b07aff', oscuridad: 0.85, niebla: 0.5, particulas: 'ceniza', ambiente: 'jefe' }, cristales: [0, 4, 0], muebles: [['roca_mina_1', 2], ['roca_mina_2', 2]], frente: ['estalactitas_frente_1'] },
];

export function galeriasMap(seed = 333): BigMap & { premium: GaleriasReport } {
  const W = GALERIAS_W, H = GALERIAS_H, r = rng(seed);
  const design = galeriasDesign(seed);
  const terrain = paintTerrain(design, GALERIAS_PALETTE);
  const objects = galeriasMapObjects();
  const byName = new Map(objects.map((o) => [o.name, o]));
  const img = terrain.img, PW = img.w, PH = img.h, kind = terrain.kind, high = terrain.high;
  const set = (i: number, c: number[], a = 255) => { img.data[i * 4] = c[0]; img.data[i * 4 + 1] = c[1]; img.data[i * 4 + 2] = c[2]; img.data[i * 4 + 3] = a; };
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : y * W + x);
  const P = GAL.piedra.map(rgb);

  // ---------- la roca: el techo de las paredes es piedra oscura con su canto, y no se pisa ----------
  const low = new Uint8Array(PW * PH);
  for (let i = 0; i < low.length; i++) low[i] = high[i] ? 0 : 1;
  const dLow = distTo(low, PW, PH);
  for (let i = 0; i < PW * PH; i++) {
    if (!high[i]) continue;
    const x = i % PW, y = (i / PW) | 0, dl = dLow[i];
    kind[i] = 6;
    // canto con luz, después roca que se apaga hacia adentro con vetas y algún brillo de cristal metido en la piedra
    let c: number[];
    if (dl <= 1) c = rgb('#05070c');
    else if (dl <= 3) c = P[3];
    else if (dl <= 5) c = P[2];
    else {
      // roca quieta: manchas grandes y suaves, apenas visibles (que no compita con el piso), y algún cristal metido
      const v = hash(x >> 4, y >> 4, seed + 9) * 0.6 + hash(x >> 3, y >> 3, seed + 10) * 0.4;
      c = dl < 12 ? P[1] : v > 0.78 ? P[1] : P[0];
      if (hash(x, y, seed + 11) > 0.9994 && dl > 10) c = rgb([GAL.cian, GAL.violeta, GAL.ambar][Math.floor(hash(y, x, seed + 12) * 3)]).map((q, k) => Math.round(q * 0.45 + P[1][k] * 0.55));
    }
    set(i, c);
  }

  // ---------- el abismo del puente: una franja sin piso; la pared de enfrente baja y se pierde en lo oscuro ----------
  const chasm = new Uint8Array(PW * PH);
  {
    const x0 = ABISMO_X0 * TILE, x1 = ABISMO_X1 * TILE, top = 30 * TILE, bottom = 50 * TILE;
    for (let y = top; y < bottom; y++) for (let x = Math.floor(x0 - 24); x < x1 + 24; x++) {
      // bordes quebrados: entrantes grandes y dientes chicos, distintos a cada lado
      const wl = Math.sin(y * 0.031 + 1.3) * 14 + Math.sin(y * 0.11 + 4) * 6 + (hash(0, y >> 3, seed + 21) - 0.5) * 8;
      const wr = Math.sin(y * 0.027 + 3.1) * 14 + Math.sin(y * 0.13 + 1) * 6 + (hash(1, y >> 3, seed + 21) - 0.5) * 8;
      if (x > x0 + wl && x < x1 + wr && !high[y * PW + x]) chasm[y * PW + x] = 1;
    }
  }
  // cuánto bajó cada pixel del abismo desde el borde de arriba (el piso o la pared que lo mira)
  for (let x = 0; x < PW; x++) {
    let run = 0;
    for (let y = 0; y < PH; y++) {
      const i = y * PW + x;
      if (!chasm[i]) { run = 0; continue; }
      run++;
      kind[i] = 6;
      if (run <= 30) {
        // la pared del abismo: roca con estratos que se apaga hacia abajo
        const t = run / 30, strata = (Math.floor((y + hash(x >> 3, 0, seed + 22) * 6) / 5) % 2) ? 0 : 1;
        const base = run <= 2 ? P[4] : P[Math.max(0, 3 - Math.floor(t * 3.2)) - (strata && run > 3 ? 0 : 0)];
        const k = Math.min(1, t * 1.1);
        set(i, base.map((c) => Math.round(c * (1 - k * 0.6))), run > 24 ? Math.round(255 * (1 - (run - 24) / 7)) : 255);
      } else set(i, [0, 0, 0], 0);
    }
  }
  // el canto de abajo del abismo (el borde del piso que da al vacío, mirado desde arriba) y los costados
  // el borde del piso que da al vacío: canto con luz (2 px) y una línea oscura justo antes de caer
  const isFloor = new Uint8Array(PW * PH);
  for (let i = 0; i < isFloor.length; i++) isFloor[i] = chasm[i] || high[i] ? 0 : 1;
  const dFloor = distTo(isFloor, PW, PH); // en el abismo: distancia al piso
  const notChasm = new Uint8Array(PW * PH);
  for (let i = 0; i < notChasm.length; i++) notChasm[i] = chasm[i] ? 0 : 1;
  const dChasm = distTo(chasm, PW, PH); // en el piso: distancia al abismo
  for (let i = 0; i < PW * PH; i++) {
    if (isFloor[i] && dChasm[i] <= 3) set(i, dChasm[i] <= 1 ? P[1] : dChasm[i] <= 2 ? P[5] : P[4]);
    // adentro del abismo, pegado a los costados: la pared que baja, oscura y que se pierde
    else if (chasm[i] && dFloor[i] <= 12) {
      const a = img.data[i * 4 + 3];
      const k = 1 - dFloor[i] / 12, rock = P[dFloor[i] <= 3 ? 2 : 1];
      const t = a / 255;
      set(i, rock.map((c, q) => Math.round(c * k + img.data[i * 4 + q] * t * (1 - k))), Math.max(a, Math.round(255 * k)));
    }
  }
  void notChasm;

  // ---------- colisión: la roca, el abismo y el borde no se pasan ----------
  const solid = new Uint8Array(terrain.solid);
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    const k = at(tx, ty);
    if (terrain.tileHigh[k]) solid[k] = 1;
    let ch = 0;
    for (let y = ty * TILE; y < ty * TILE + TILE; y += 4) for (let x = tx * TILE; x < tx * TILE + TILE; x += 4) if (chasm[y * PW + x]) ch++;
    if (ch > 6) { solid[k] = 1; terrain.tileKind[k] = 6; }
    if (tx < 1 || ty < 1 || tx >= W - 1 || ty >= H - 1) solid[k] = 1;
  }

  const occ = new Uint8Array(W * H);
  const decos: Deco[] = [], entities: Ent[] = [], cristales: Cristal[] = [];
  const T = (t: number) => t * TILE + TILE / 2;
  const isWaterT = (x: number, y: number) => at(x, y) >= 0 && terrain.waterTiles[at(x, y)] === 1;
  const open = (x: number, y: number) => at(x, y) >= 0 && !solid[at(x, y)] && !occ[at(x, y)] && !isWaterT(x, y);
  const place = (sprite: string, px: number, py: number) => {
    const o = byName.get(sprite);
    if (!o) throw new Error(`objeto desconocido: ${sprite}`);
    decos.push({ sprite, x: Math.round(px), y: Math.round(py) });
    for (const s of [o.solid, ...(o.solids ?? [])]) {
      if (!s) continue;
      const x0 = Math.floor((px + s[0]) / TILE), x1 = Math.floor((px + s[0] + s[2] - 1) / TILE);
      const y0 = Math.floor((py + s[1]) / TILE), y1 = Math.floor((py + s[1] + s[3] - 1) / TILE);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (at(x, y) >= 0) solid[at(x, y)] = 1;
    }
    const tx = Math.floor(px / TILE), ty = Math.floor((py - 1) / TILE);
    if (at(tx, ty) >= 0) occ[at(tx, ty)] = 1;
  };
  const placeT = (sprite: string, tx: number, ty: number) => place(sprite, T(tx), ty * TILE + TILE - 4);
  const near = (tx: number, ty: number, maxR = 8): [number, number] => {
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
  const chest = (tx: number, ty: number, nivel: string, extra: Record<string, Prop> = {}) => { const [x, y] = ent('cofre', tx, ty, { nivel, ...extra }); solid[at(x, y)] = 1; };
  const reserve = (tx: number, ty: number, rad: number) => { for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) if (at(tx + dx, ty + dy) >= 0) occ[at(tx + dx, ty + dy)] = 1; };
  /** el farol de minero: la fogata del Mundo 3 (guarda, cura y es la tienda) */
  const farol = (tx: number, ty: number, id: string, nombre: string) => {
    // el lugar de guardar primero (libre y pisable), y el farol en el cuadro de arriba o al costado
    const [x, y] = near(tx, ty + 1);
    occ[at(x, y)] = 1;
    const [fx, fy] = open(x, y - 1) ? [x, y - 1] : near(x + 1, y);
    placeT('farol_minero', fx, fy);
    entities.push({ tipo: 'punto_guardado', x: T(x), y: T(y), props: { id, nombre, farol: true } });
    reserve(x, y, 1);
  };

  // ---------- 1. la Boca de la Mina: el portal, el primer farol y el primer cristal ----------
  const [lx, ly] = LG.llegada;
  entities.push({ tipo: 'portal_llegada', x: T(lx - 4), y: T(ly), props: { color: 'rojo' } });
  entities.push({ tipo: 'portal_volver', x: T(lx - 4), y: T(ly + 1), props: { destino: 'mundo2' } });
  reserve(lx - 4, ly, 1);
  entities.push({ tipo: 'jugador_inicio', x: T(lx), y: T(ly + 1) });
  entities.push({ tipo: 'thor_inicio', x: T(lx - 1), y: T(ly + 1) });
  reserve(lx, ly + 1, 1);
  farol(15, 13, 'boca', 'La Boca de la Mina');
  // el marco de la galería donde empieza la mina de verdad
  place('viga_mina', T(19.5), 13.6 * TILE);
  for (let x = 18; x <= 21; x++) for (let y = 9; y <= 13; y++) occ[at(x, y)] = 1;
  chest(6, 13, 'madera');

  // ---------- 2. Los Rieles: la vía que se pierde en lo oscuro, la vía muerta y la Veta Escondida ----------
  // la vía de la galería: de la boca hasta el fondo, donde se corta (un tramo roto y después nada)
  for (let x = 25; x <= 59; x++) {
    if (x === 52 || x === 53) continue; // tramo arrancado
    const ty = 12;
    if (open(x, ty) || !solid[at(x, ty)]) { decos.push({ sprite: 'rieles_h', x: T(x), y: T(ty) }); occ[at(x, ty)] = 1; }
  }
  for (const x of [27, 36, 45, 58]) place('viga_mina', T(x), 13.2 * TILE);
  ent('enemigo', 41, 9, { enemigo: 'polilla_ceniza', nombre: 'Polilla de Ceniza' });
  ent('enemigo', 56, 10, { enemigo: 'minero_piedra', nombre: 'Minero de Piedra' });
  // la vía muerta: un cofre y un minero de piedra dormido
  chest(46, 20, 'reforzado');
  ent('enemigo', 41, 20, { enemigo: 'minero_piedra', nombre: 'Minero de Piedra' });
  // la Veta Escondida: arriba de la galería, por una grieta que Thor huele
  chest(48, 4, 'dorado', { secreto: true, pista: 'veta_escondida' });

  // ---------- 3. el atajo del carrito: del lago a los rieles ----------
  // la vía del atajo (vertical) y su carrito al pie, del lado del lago: Thor lo empuja y abre el camino corto
  {
    const tx = 30;
    for (let y = 14; y <= 32; y++) if (!solid[at(tx, y)]) { decos.push({ sprite: 'rieles_v', x: T(tx), y: T(y) }); occ[at(tx, y)] = 1; }
    entities.push({ tipo: 'carrito', x: T(tx), y: 32 * TILE + TILE - 4, props: { id: 'atajo', ruta: `${tx},32;${tx},14`, empuja: 'thor' } });
  }

  // ---------- 4. la Sala del Eco: cristales enormes en el techo, el segundo farol ----------
  farol(78, 21, 'eco', 'La Sala del Eco');
  ent('enemigo', 86, 12, { enemigo: 'polilla_ceniza', nombre: 'Polilla de Ceniza' });
  ent('enemigo', 74, 10, { enemigo: 'polilla_ceniza', nombre: 'Polilla de Ceniza' });
  ent('enemigo', 88, 20, { enemigo: 'sombra', nombre: 'Sombra' });
  chest(90, 16, 'reforzado');

  // ---------- 5. el Puente Colgante: tablas sobre el abismo ----------
  {
    let x0 = 99, x1 = -1;
    for (let x = 40; x <= 74; x++) if (terrain.tileKind[at(x, PUENTE_Y)] === 6 && !terrain.tileHigh[at(x, PUENTE_Y)]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      decos.push({ sprite: 'puente_colgante_h', x: T(x), y: T(PUENTE_Y) });
      solid[at(x, PUENTE_Y)] = 0; occ[at(x, PUENTE_Y)] = 1;
    }
    // los postes donde se atan las sogas, a los dos lados de cada punta
    for (const x of [x0 - 1, x1 + 1]) for (const dy of [-13, 15]) decos.push({ sprite: 'poste_puente', x: T(x) + (x < x0 ? -6 : 6), y: T(PUENTE_Y) + dy });
    reserve(x0 - 2, PUENTE_Y, 1); reserve(x1 + 2, PUENTE_Y, 1);
    // la figura de los ojos rojos mira desde la otra punta (del lado del lago): se va si te acercas
    ent('figura', x0 - 4, PUENTE_Y - 2, { id: 'puente' });
  }
  ent('enemigo', 70, 37, { enemigo: 'sombra', nombre: 'Sombra' });
  ent('enemigo', 44, 44, { enemigo: 'sombra', nombre: 'Sombra' });

  // ---------- 6. el Lago de Cristal: agua quieta con los cristales que se reflejan ----------
  ent('enemigo', 14, 35, { enemigo: 'polilla_ceniza', nombre: 'Polilla de Ceniza' });
  ent('enemigo', 27, 46, { enemigo: 'polilla_ceniza', nombre: 'Polilla de Ceniza' });
  chest(12, 46, 'reforzado');

  // ---------- 7. el Campamento Abandonado: carpas, la olla fría, el tercer farol y el Nicho del Minero ----------
  place('carpa_minero', T(16), 64 * TILE);
  place('carpa_minero', T(27), 62.4 * TILE);
  placeT('olla_fria', 21, 65);
  farol(25, 68, 'campamento', 'El Campamento Abandonado');
  for (const [x, y, s] of [[18, 67, 'casco_minero'], [23, 61, 'pico_tirado'], [29, 67, 'linterna_rota'], [12, 68, 'pico_tirado']] as [number, number, string][]) { decos.push({ sprite: s, x: T(x), y: T(y) }); occ[at(x, y)] = 1; }
  chest(31, 70, 'madera');
  ent('enemigo', 33, 64, { enemigo: 'minero_piedra', nombre: 'Minero de Piedra' });
  // el Nicho del Minero: el pedazo escondido del mural, por una grieta arriba del campamento
  {
    // el mural va en la cara de la pared de arriba del nicho
    let fy = 0;
    for (let y = Math.floor((LG.nicho[1] - 3) * TILE); y < LG.nicho[1] * TILE + TILE; y++) if (kind[y * PW + Math.round(T(LG.nicho[0]))] === 3) fy = y;
    decos.push({ sprite: 'mural_3', x: T(LG.nicho[0]), y: fy || Math.round((LG.nicho[1] - 0.6) * TILE) });
    entities.push({ tipo: 'mural', x: T(LG.nicho[0]), y: T(LG.nicho[1]), props: { pieza: 3 } });
    reserve(LG.nicho[0], LG.nicho[1], 1);
    chest(10, 56, 'dorado', { secreto: true, pista: 'nicho_minero' });
  }
  // el desvío alto: un cofre y polillas
  chest(44, 56, 'reforzado');
  place('viga_mina', T(39), 58.9 * TILE);
  ent('enemigo', 40, 57, { enemigo: 'polilla_ceniza', nombre: 'Polilla de Ceniza' });
  ent('enemigo', 48, 68, { enemigo: 'sombra', nombre: 'Sombra' });

  // ---------- 8. la Cueva de la Reina: la arena con los cuatro cristales grandes ----------
  const [rx, ry] = LG.reina;
  entities.push({ tipo: 'arena_jefe', x: T(rx), y: T(ry), props: { radio: (ARENA.r - 0.5) * TILE } });
  entities.push({ tipo: 'jefe', x: T(rx), y: T(ry - 1), props: { enemigo: 'polilla_reina', nombre: 'Polilla Reina', titulo: 'Reina de las Galerías' } });
  entities.push({ tipo: 'portal_jefe', x: T(rx), y: T(ry + 7), props: { color: 'rojo', destino: 'mundo4' } });
  chest(rx + 4, ry + 7, 'dorado', { tras_jefe: true });
  reserve(rx, ry, 2);
  let gid = 0;
  for (const [dx, dy] of [[-6, -4], [6, -4], [-6, 5], [6, 5]]) {
    const x = rx + dx, y = ry + dy;
    const px = T(x), py = y * TILE + TILE - 6;
    decos.push({ sprite: 'cristal_grande_apagado', x: px, y: py });
    decos.pop(); // los cristales los dibuja el juego (prendidos o apagados): van en su capa, no como objetos
    cristales.push({ id: `g${++gid}`, x: px, y: py, color: 'cian', forma: 0, grande: true });
    for (let k = -1; k <= 0; k++) solid[at(x + k, y)] = 1;
    solid[at(x, y)] = 1; occ[at(x, y)] = 1;
  }

  // ---------- zonas y postales ----------
  const zones: MapZone[] = [];
  for (const z of ZONAS) {
    const [x0, y0, x1, y1] = z.rect;
    zones.push({ nombre: z.nombre, x: x0 * TILE, y: y0 * TILE, w: (x1 - x0) * TILE, h: (y1 - y0) * TILE, props: { musica: 'galerias', ambiente: 'galerias', descubrir: true, ...z.props, frente: z.frente.join(',') } });
  }
  zones.push({ nombre: 'La Veta Escondida', x: 43 * TILE, y: 1 * TILE, w: 10 * TILE, h: 6 * TILE, props: { musica: 'galerias', ambiente: 'galerias', luz: '#ffb35a', oscuridad: 0.7, niebla: 0.2, particulas: 'brillos', secreto: true, descubrir: true } });
  zones.push({ nombre: 'El Nicho del Minero', x: 7 * TILE, y: 51 * TILE, w: 9 * TILE, h: 7 * TILE, props: { musica: 'galerias', ambiente: 'galerias', luz: '#ffb35a', oscuridad: 0.6, niebla: 0.2, particulas: 'polvo', secreto: true, descubrir: true } });
  const postales: Postal[] = [
    { nombre: 'boca_de_la_mina', x: T(13), y: T(10) },
    { nombre: 'los_rieles', x: T(40), y: T(13) },
    { nombre: 'sala_del_eco', x: T(81), y: T(15) },
    { nombre: 'puente_colgante', x: T(57), y: T(PUENTE_Y) },
    { nombre: 'lago_de_cristal', x: T(21), y: T(40) },
    { nombre: 'campamento_abandonado', x: T(21), y: T(65) },
    { nombre: 'cueva_de_la_reina', x: T(rx), y: T(ry) },
  ];
  const quieta = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.hypot((x + 0.5 - LAGO.c[0]) / (LAGO.rx + 1), (y + 0.5 - LAGO.c[1]) / (LAGO.ry + 1)) < 1) quieta[at(x, y)] = 1;

  const map: BigMap & { premium: GaleriasReport } = {
    name: 'mundo3_galerias', w: W, h: H, terrain, solid, decos, entities, zones, postales, objects, quieta, cristales,
    meta: { bioma: 'galerias', musica: 'galerias', nombre: 'Las Galerías del Eco', agua: AGUA_GALERIAS, fondo: MINA_PARALAJE.map((p, k) => ({ id: `fondo_mina_${k}`, paralaje: p })) },
    premium: { ramas: Object.entries(RAMAS).map(([id, b]) => ({ id, nombre: b.nombre, medio: b.medio })), secretos: ['veta_escondida', 'nicho_minero'], muebles: {}, pantallas: [], quitadosPorPaso: 0 },
  };
  poblar(map, r, seed);
  return map;
}

const DECALS = ['grava_mina_0', 'grava_mina_1', 'grava_mina_2', 'astillas_0', 'astillas_1', 'esquirlas_cristal_0', 'esquirlas_cristal_1', 'esquirlas_cristal_2', 'escombro_chico_0', 'escombro_chico_1', 'escombro_chico_2', 'charco_negro_0', 'charco_negro_1'];
const COLORES = ['cian', 'violeta', 'ambar'] as const;

/**
 * Lo que va encima del mapa armado, con el motor de nada montado: los cristales (contra las paredes, que es donde
 * crecen), la utilería de cada zona, las calcomanías y un punto focal por pantalla. Después se revisa que todo lo que
 * se alcanzaba se siga alcanzando.
 */
function poblar(m: BigMap & { premium: GaleriasReport }, r: () => number, seed: number) {
  const W = m.w, H = m.h, PW = m.terrain.img.w;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : y * W + x);
  const byName = new Map(m.objects.map((o) => [o.name, o]));
  const special = new Uint8Array(W * H), clear = new Uint8Array(W * H);
  for (const e of m.entities) {
    const tx = Math.floor(e.x / TILE), ty = Math.floor(e.y / TILE);
    if (e.tipo === 'cofre') special[at(tx, ty)] = 1;
    if (e.tipo === 'arena_jefe') { const R = Number(e.props?.radio ?? 160) / TILE + 1, n = Math.ceil(R); for (let y = -n; y <= n; y++) for (let x = -n; x <= n; x++) if (x * x + y * y <= R * R && at(tx + x, ty + y) >= 0) clear[at(tx + x, ty + y)] = 1; }
    for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) if (at(tx + x, ty + y) >= 0) clear[at(tx + x, ty + y)] = 1;
  }
  // los rieles, el puente y la vía del atajo quedan libres (y un cuadro a cada lado)
  for (const d of m.decos) if (/^(rieles|puente_colgante)/.test(d.sprite)) { const tx = Math.floor(d.x / TILE), ty = Math.floor(d.y / TILE); for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) if (at(tx + x, ty + y) >= 0) clear[at(tx + x, ty + y)] = 1; }
  // las grietas de los secretos y los túneles angostos tampoco se tapan
  for (const t of GRIETAS) for (const [x, y] of smoothPath(t.pts, 0.5)) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(Math.floor(x) + dx, Math.floor(y) + dy) >= 0) clear[at(Math.floor(x) + dx, Math.floor(y) + dy)] = 1;
  // el eje de todos los túneles (camino y ramas) queda libre: nada sólido corta un paso, aunque haya otra vuelta
  for (const t of [...Object.values(CAMINO), ...Object.values(RAMAS)].filter((q) => q.pts.length)) for (const [x, y] of (t.pts.length > 2 ? smoothPath(t.pts, 0.5) : t.pts)) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(Math.floor(x) + dx, Math.floor(y) + dy) >= 0) clear[at(Math.floor(x) + dx, Math.floor(y) + dy)] = 1;
  const keep = [...m.decos];
  const designed = keep.filter((d) => byName.get(d.sprite)?.layer !== 'suelo');
  const darkAt = (tx: number, ty: number) => { const z = m.zones.find((q) => tx * TILE >= q.x && tx * TILE < q.x + q.w && ty * TILE >= q.y && ty * TILE < q.y + q.h); return Number(z?.props.oscuridad ?? 0.6); };
  const decalPool = (road: boolean, wet: boolean) => (road ? ['grava_mina_0', 'grava_mina_1', 'astillas_0', 'astillas_1'] : DECALS.filter((d) => wet || !d.startsWith('charco')));
  const solidBefore = new Uint8Array(m.solid);
  const Pl = createPlacer({ m, t2: m.terrain, byName, keep, solid: m.solid, special, clear, designed, darkOf: darkAt, decalPool, floorKind: 0, roadKinds: [1] });
  const rep = m.premium;
  // distancia (en px) de cada pixel del piso a la roca: los cristales crecen al pie de las paredes
  const rock = new Uint8Array(m.terrain.img.w * m.terrain.img.h);
  for (let i = 0; i < rock.length; i++) rock[i] = m.terrain.kind[i] === 3 || m.terrain.kind[i] === 6 ? 1 : 0;
  const dRock = distTo(rock, PW, m.terrain.img.h);
  const start = m.entities.find((e) => e.tipo === 'jugador_inicio')!;
  const sx0 = Math.floor(start.x / TILE), sy0 = Math.floor(start.y / TILE);
  const bfs = (blocked: (k: number) => boolean) => {
    const seen = new Uint8Array(W * H), q = [at(sx0, sy0)];
    seen[q[0]] = 1;
    for (let qi = 0; qi < q.length; qi++) { const k = q[qi], x = k % W, y = Math.floor(k / W); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = at(x + dx, y + dy); if (j < 0 || seen[j] || blocked(j)) continue; seen[j] = 1; q.push(j); } }
    return seen;
  };
  // un cristal tiene que tener al lado un cuadro al que se llega (para pegarle)
  const reach0 = bfs((k) => m.solid[k] === 1);
  let alcanzados = 0;
  for (let k = 0; k < W * H; k++) if (reach0[k]) alcanzados++;
  const besideReach = (px: number, py: number) => { const tx = Math.floor(px / TILE), ty = Math.floor((py - 1) / TILE); return [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => reach0[at(tx + dx, ty + dy)] === 1).length >= 2; };
  let cid = 0;
  for (const z of ZONAS) {
    const [X0, Y0, X1, Y1] = z.rect;
    Pl.setAllowed((tx, ty) => tx >= X0 && tx < X1 && ty >= Y0 && ty < Y1);
    // cristales: de a uno o en pares, contra la pared, repartidos por la zona
    const mine: { x: number; y: number }[] = [];
    { const now = bfs((k) => m.solid[k] === 1); alcanzados = 0; for (let k = 0; k < W * H; k++) if (now[k]) alcanzados++; }
    z.cristales.forEach((n, color) => {
      for (let k = 0; k < n; k++) {
        let ok = false;
        for (let t = 0; t < 900 && !ok; t++) {
          const px = Math.round((X0 + 1 + r() * (X1 - X0 - 2)) * TILE), py = Math.round((Y0 + 1 + r() * (Y1 - Y0 - 2)) * TILE);
          const i = py * PW + px;
          if (i < 0 || i >= dRock.length || m.terrain.kind[i] !== 0 || dRock[i] > 26 - (t > 600 ? -30 : 0)) continue;
          if (!besideReach(px, py) || mine.some((q) => Math.hypot(q.x - px, q.y - py) < 3 * TILE)) continue;
          if (m.cristales!.some((q) => Math.hypot(q.x - px, q.y - py) < 2.5 * TILE)) continue;
          // la forma va con el color (cada color tiene su dibujo): 0 cian, 1 violeta, 2 ámbar
          const forma = color, name = `cristal_apagado_${forma}`;
          if (!Pl.fits(name, px, py, { roadGap: 6, maxOverlap: 0, edge: 6 })) continue;
          // su base no tapa el lado libre de otro cristal ni un paso
          let tapa = false;
          const box: number[] = [];
          Pl.boxTiles(name, px, py, (kk) => { if (clear[kk] || m.solid[kk]) tapa = true; box.push(kk); });
          if (tapa) continue;
          // y no corta ningún paso: lo que se alcanzaba se sigue alcanzando (salvo su propia base)
          for (const kk of box) m.solid[kk] = 1;
          const now = bfs((k) => m.solid[k] === 1);
          let cuenta = 0;
          for (let k = 0; k < W * H; k++) if (now[k]) cuenta++;
          for (const kk of box) m.solid[kk] = 0;
          if (cuenta < alcanzados - box.length) continue;
          alcanzados = cuenta;
          Pl.register(name, px, py);
          Pl.boxTiles(name, px, py, (kk) => { m.solid[kk] = 1; });
          m.cristales!.push({ id: `c${++cid}`, x: px, y: py, color: COLORES[color], forma, grande: false });
          // los cuadros de al lado quedan libres: siempre se llega a pegarle
          { const tx = Math.floor(px / TILE), ty = Math.floor((py - 1) / TILE); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (at(tx + dx, ty + dy) >= 0) clear[at(tx + dx, ty + dy)] = 1; }
          mine.push({ x: px, y: py });
          ok = true;
        }
      }
    });
    // la utilería de la zona
    const props: { s: string; x: number; y: number }[] = [];
    for (const [sprite, n] of z.muebles) for (let k = 0; k < n; k++) {
      for (let t = 0; t < 400; t++) {
        const px = Math.round((X0 + 0.5 + r() * (X1 - X0 - 1)) * TILE), py = Math.round((Y0 + 0.8 + r() * (Y1 - Y0 - 1)) * TILE);
        if (props.some((q) => Math.hypot(q.x - px, q.y - py) < (q.s === sprite ? 4 : 2) * TILE)) continue;
        if (!Pl.fits(sprite, px, py, { roadGap: 10, maxOverlap: 0, edge: 10 })) continue;
        Pl.place(sprite, px, py);
        props.push({ s: sprite, x: px, y: py });
        rep.muebles[sprite] = (rep.muebles[sprite] ?? 0) + 1;
        break;
      }
    }
  }
  Pl.setAllowed(() => true);
  // calcomanías y punto focal en cada pantalla que tenga piso
  const FOCAL = /^(farol_minero|viga_mina|carpa_minero|olla_fria|puente_colgante|mural_3|roca_mina_1|cajon_mina|barril_mina)/;
  for (let sy = 0; sy + SCREEN.h / 2 <= H; sy += SCREEN.h) for (let sx = 0; sx < W; sx += SCREEN.w) {
    let floor = 0, total = 0;
    for (let ty = sy; ty < Math.min(H, sy + SCREEN.h); ty++) for (let tx = sx; tx < Math.min(W, sx + SCREEN.w); tx++) { total++; if (!m.solid[at(tx, ty)] && m.terrain.tileKind[at(tx, ty)] === 0) floor++; }
    if (floor < total * 0.25) continue;
    const n = Pl.decalsFor(r, { x: sx, y: sy }, 9, sx * TILE, sy * TILE, (sx + SCREEN.w) * TILE, (sy + SCREEN.h) * TILE);
    rep.pantallas.push({ x: sx, y: sy, focal: [], calcomanias: n });
  }
  m.decos.push(...Pl.decos);

  // todo lo que se alcanzaba se sigue alcanzando: se quita lo colocado que corte un paso
  const before = bfs((k) => solidBefore[k] === 1), after = bfs((k) => m.solid[k] === 1);
  const lost = new Set<number>();
  for (let k = 0; k < W * H; k++) if (before[k] && !after[k] && !m.solid[k]) lost.add(k);
  if (lost.size) {
    const removed = new Set<Deco>();
    for (const p of Pl.placed) {
      let hit = false;
      Pl.boxTiles(p.d.sprite, p.d.x, p.d.y, (k) => { for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) if (lost.has(k + dx + dy * W)) hit = true; });
      if (hit) removed.add(p.d);
    }
    m.decos = m.decos.filter((d) => !removed.has(d));
    m.solid.set(solidBefore);
    for (const p of Pl.placed) if (!removed.has(p.d)) Pl.boxTiles(p.d.sprite, p.d.x, p.d.y, (k) => { m.solid[k] = 1; });
    for (const c of m.cristales!) if (!c.grande) Pl.boxTiles(`cristal_apagado_${c.forma}`, c.x, c.y, (k) => { m.solid[k] = 1; });
    rep.quitadosPorPaso = removed.size;
  }
  for (const p of rep.pantallas) {
    const inside = (x: number, y: number) => x >= p.x * TILE && x < (p.x + SCREEN.w) * TILE && y >= p.y * TILE && y < (p.y + SCREEN.h) * TILE;
    p.focal = [
      ...m.decos.filter((d) => FOCAL.test(d.sprite) && inside(d.x, d.y)).map((d) => d.sprite),
      ...m.cristales!.filter((c) => inside(c.x, c.y)).map((c) => (c.grande ? 'cristal_grande' : 'cristal')),
    ];
  }
  void seed;
}
