import { createRaster, type Raster } from '../core/raster';
import { TILE } from './tiles';
import { distTo, type PaintedTerrain, type TP } from './paint';
import { hash } from './puertoObjects';
import { ciudadObjectsA, CIUDAD } from './ciudadObjects';
import { ciudadObjectsB, CIUDAD_PARALAJE } from './ciudadObjectsB';
import { statueObjects } from './ciudadEstatuas';
import { galeriasObjects } from './galeriasObjects';
import { forestObjects, type WorldObject } from './objects';
import { landmarkObjects } from './landmarks';
import { premiumPortals } from './portales';
import { footprint, CELL } from './premium/placer';
import type { BigMap, Deco, Ent, MapZone, Postal, Prop } from './bosqueMap';

/**
 * Mundo 5: La Ciudad Dormida (encargo F12, parte 1). Debajo del puerto, una ciudad de piedra enorme con toda la gente
 * dormida en medio de lo que hacía. Es exterior bajo tierra: calles empedradas, plazas con rosetones, escaleras entre
 * niveles, puentes de piedra sobre el abismo y la caverna arriba, que no se ve. Por los huecos del abismo se ve la
 * ciudad que sigue lejos (`fondo_ciudad_lejos_*`).
 *
 * El camino principal:
 *
 *   La Puerta de la Ciudad > La Calle de los Panaderos > La Plaza de la Fuente > El Barrio de los Músicos >
 *   El Puente de los Faroles > El Palacio Dormido (el patio y la sala del trono)
 *
 * Ramas que vuelven al camino: el callejón de los hornos (debajo de la calle, de la explanada de la puerta a la
 * escalera de la calle), Los Jardines de Piedra (de la puerta al laberinto y de ahí a la Torre del Reloj, que sube
 * por la escalinata a la plaza) y el Puentecito del Reloj (de la torre a la cabecera del puente, el atajo de vuelta).
 * Secretos para el olfato de Thor: El Corazón del Jardín (en el medio del laberinto) y El Desván del Organillero
 * (entre dos casas del barrio de los músicos).
 *
 * La luz la roban: cada barrio grande tiene su farol de plaza apagado (la fogata del piso). Los puntos `chispa` son
 * donde pueden caer las tres chispas de la luz robada, y los `figura` donde aparece la Ladrona.
 */

export const CIUDAD_W = 110;
export const CIUDAD_H = 100;

/** Tipos de cuadro del diseño. */
const ROCK = 0, WALL = 1, STREET = 2, PLAZA = 3, GARDEN = 4, HEDGE = 5, STAIRS = 6, BRIDGE = 7, MARBLE = 8, VOID = 9;
const SOLIDS = new Set([ROCK, WALL, HEDGE, VOID]);

/** Lugares (en cuadros). */
export const LC = {
  portal: [6, 26] as TP,
  puerta: [13, 21] as TP, // el pie de la muralla: el hueco del arco son los cuadros 12 y 13
  farolPuerta: [18, 25] as TP,
  calle: [35, 11] as TP,
  fuente: [64, 20] as TP,
  farolPlaza: [56, 24] as TP,
  musicos: [94, 19] as TP,
  farolMusicos: [101, 27] as TP,
  mural: [86, 7] as TP,
  desvan: [101, 3] as TP,
  jardin: [18, 49] as TP,
  torre: [44, 41] as TP,
  relojero: [45, 50] as TP,
  cabecera: [80, 58] as TP,
  farolPuente: [74, 58] as TP,
  patio: [83, 71] as TP,
  farolPalacio: [70, 70] as TP,
  trono: [84, 83] as TP,
  arena: [84, 89] as TP,
};

/** La sala del trono: la arena del Rey de Piedra (radio 208 px) con las cuatro lámparas en diagonal a 150 px. */
export const ARENA_REY = { radio: 208, lampara: 150 };

interface Design {
  t: Uint8Array;
  /** rosetones de las plazas: centro y radio en cuadros */
  rosettes: { c: TP; r: number }[];
}

type Rect = [number, number, number, number];
/** Las piezas de la ciudad (rectángulos en cuadros, x0 y0 x1 y1 sin incluir el final), en orden: lo de después pisa. */
const PIEZAS: [number, Rect][] = [
  // ---------- la franja norte: la puerta, la calle, la plaza y el barrio de los músicos ----------
  [PLAZA, [3, 3, 23, 18]], // la plazoleta de adentro de la puerta
  [WALL, [2, 18, 25, 21]], // la muralla
  [STREET, [12, 18, 14, 21]], // el hueco del arco
  [PLAZA, [3, 21, 23, 31]], // la explanada de afuera (llega el portal)
  [STREET, [8, 31, 12, 36]], // la bajada a los jardines
  [STREET, [23, 2, 48, 15]], // la calle de los panaderos (y lo de atrás de las casas)
  [WALL, [23, 15, 47, 17]], // el borde de la calle: abajo queda el callejón
  [STREET, [23, 17, 47, 22]], // el callejón de los hornos
  [STREET, [21, 21, 27, 24]], // del callejón a la explanada
  [STAIRS, [43, 15, 47, 17]], // la escalerita del callejón a la calle
  [STREET, [48, 2, 80, 7]], // detrás de las casas de la plaza
  [PLAZA, [48, 7, 80, 31]], // la plaza de la fuente
  [WALL, [48, 31, 80, 35]], // el borde sur de la plaza
  [STAIRS, [52, 31, 56, 35]], // la escalinata a la torre
  [STREET, [80, 2, 107, 34]], // el barrio de los músicos
  [WALL, [84, 2, 88, 7]], // la pared del mural (entre dos casas)
  // ---------- el oeste: los jardines de piedra y la plaza de la torre ----------
  [GARDEN, [3, 35, 33, 63]],
  [PLAZA, [33, 35, 57, 62]],
  // ---------- el abismo, el puente de los faroles y su cabecera ----------
  [VOID, [57, 35, 109, 54]],
  [VOID, [57, 54, 66, 63]],
  [VOID, [2, 63, 60, 99]],
  [VOID, [105, 54, 109, 99]],
  [BRIDGE, [86, 34, 90, 54]],
  [PLAZA, [66, 54, 105, 62]], // la cabecera del puente
  [BRIDGE, [57, 57, 66, 59]], // el puentecito del reloj
  // ---------- el palacio: la muralla del frente, el patio, la pared de la sala y la sala del trono ----------
  [WALL, [60, 62, 105, 65]],
  [STREET, [82, 62, 86, 65]], // la puerta del palacio
  [MARBLE, [60, 65, 105, 77]],
  [WALL, [60, 77, 105, 80]],
  [STAIRS, [70, 77, 73, 80]],
  [STAIRS, [95, 77, 98, 80]],
  [MARBLE, [63, 80, 104, 98]],
];

/** El laberinto de los jardines: bloques de 2 x 2 cuadros, los pares son seto. */
const MAZE = { x: 3, y: 36, bw: 15, bh: 13 };

/** El laberinto (perfecto, cada cuarto se alcanza por un solo camino) con la entrada arriba y la salida a la torre. */
function mazeBlocks(seed: number): Uint8Array {
  const { bw, bh } = MAZE, cw = (bw - 1) / 2, ch = (bh - 1) / 2;
  const wall = new Uint8Array(bw * bh).fill(1);
  let s = seed >>> 0;
  const rnd = () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const seen = new Uint8Array(cw * ch), stack: [number, number][] = [[3, 2]];
  seen[2 * cw + 3] = 1; wall[(2 * 2 + 1) * bw + 3 * 2 + 1] = 0;
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const nb = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]).map(([dx, dy]) => [cx + dx, cy + dy] as [number, number]).filter(([x, y]) => x >= 0 && y >= 0 && x < cw && y < ch && !seen[y * cw + x]);
    if (!nb.length) { stack.pop(); continue; }
    const [nx, ny] = nb[Math.floor(rnd() * nb.length)];
    seen[ny * cw + nx] = 1;
    wall[(ny * 2 + 1) * bw + nx * 2 + 1] = 0;
    wall[(cy + ny + 1) * bw + cx + nx + 1] = 0;
    stack.push([nx, ny]);
  }
  // la entrada (arriba, debajo de la bajada de la puerta) y la salida (a la derecha, a la plaza de la torre)
  wall[0 * bw + 3] = 0;
  wall[7 * bw + (bw - 1)] = 0;
  // dos huecos de más en las paredes de adentro: el laberinto tiene vueltas y no es un solo pasillo
  wall[4 * bw + 6] = 0; wall[8 * bw + 10] = 0;
  return wall;
}

function makeDesign(seed: number): Design & { maze: Uint8Array } {
  const W = CIUDAD_W, H = CIUDAD_H, t = new Uint8Array(W * H).fill(ROCK);
  for (const [v, [x0, y0, x1, y1]] of PIEZAS) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (x >= 0 && y >= 0 && x < W && y < H) t[y * W + x] = v;
  const maze = mazeBlocks(seed);
  for (let by = 0; by < MAZE.bh; by++) for (let bx = 0; bx < MAZE.bw; bx++) {
    if (!maze[by * MAZE.bw + bx]) continue;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) t[(MAZE.y + by * 2 + dy) * W + MAZE.x + bx * 2 + dx] = HEDGE;
  }
  // el borde del mapa es roca (o abismo, que también corta)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x < 2 || y < 2 || x >= W - 2 || y >= H - 1) t[y * W + x] = t[y * W + x] === VOID ? VOID : ROCK;
  return { t, maze, rosettes: [{ c: [63.5, 19.5], r: 6.5 }, { c: [85.5, 58], r: 3 }, { c: [83, 70.5], r: 4.5 }, { c: [13, 10.5], r: 4 }, { c: [45, 50.5], r: 5 }] };
}

/** Ruido de valor suave. */
function vnoise(x: number, y: number, cell: number, seed: number): number {
  const gx = x / cell, gy = y / cell, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0, seed), b = hash(x0 + 1, y0, seed), c = hash(x0, y0 + 1, seed), d = hash(x0 + 1, y0 + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

const RGB = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const PS = CIUDAD.piedra.map(RGB), PE = CIUDAD.estatua.map(RGB), MUSGO = RGB(CIUDAD.musgo), LILA = RGB(CIUDAD.lila), ORO = CIUDAD.oro.map(RGB);
const pick = (pal: number[][], l: number) => pal[Math.max(0, Math.min(pal.length - 1, Math.round(l * (pal.length - 1))))];

/**
 * El pintor de la ciudad: adoquines gris azulados con musgo plateado en las juntas, lajas grandes en las plazas con
 * rosetones alrededor de las fuentes, grava clara en los jardines, escalones, los puentes de lajas con su baranda,
 * mármol en el palacio, las murallas de sillares (cara al sur y la tapa de arriba con su cornisa), la roca de la
 * caverna en las orillas, y el abismo transparente (abajo va la ciudad lejana) con la cara de la piedra que baja.
 * Polvo de sueño lila juntado contra las paredes.
 */
function paintCiudad(d: Design, seed: number): PaintedTerrain {
  const W = CIUDAD_W, H = CIUDAD_H, PWX = W * TILE, PHX = H * TILE, N = PWX * PHX;
  const img = createRaster(PWX, PHX);
  const kind = new Uint8Array(N), high = new Uint8Array(N);
  const T = (tx: number, ty: number) => (tx < 0 || ty < 0 || tx >= W || ty >= H ? ROCK : d.t[ty * W + tx]);
  // por pixel: 0 piso, 1 bloque (muralla, roca, seto), 3 vacío. La roca de la caverna y el abismo tienen el borde
  // quebrado con ruido; las murallas y los pisos de la ciudad, rectos (están hechos a mano)
  const cls = new Uint8Array(N), own = new Uint8Array(N);
  for (let y = 0; y < PHX; y++) for (let x = 0; x < PWX; x++) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE), i = y * PWX + x;
    let v = T(tx, ty);
    // la roca de la caverna se come un poco del piso (y al revés) con ruido
    const nz = (vnoise(x, y, 18, seed + 1) - 0.5) * 22;
    if (v !== WALL && v !== HEDGE) {
      const jx = Math.floor((x + nz) / TILE), jy = Math.floor((y - nz * 0.6) / TILE), w2 = T(jx, jy);
      if (w2 === ROCK && v !== BRIDGE && v !== STAIRS) v = ROCK;
      else if (v === ROCK && w2 !== WALL && w2 !== VOID && w2 !== HEDGE && w2 !== ROCK) v = w2;
    }
    own[i] = v;
    cls[i] = v === VOID ? 3 : v === ROCK || v === WALL ? 1 : 0;
  }
  // cuánto le falta a cada pixel de bloque para llegar a un piso de abajo (la cara mira al sur)
  const below = new Uint16Array(N).fill(999);
  for (let x = 0; x < PWX; x++) { let run = 999; for (let y = PHX - 1; y >= 0; y--) { const i = y * PWX + x; if (cls[i] !== 1) run = 0; else run = Math.min(999, run + 1); below[i] = run; } }
  // cuánto hace que se terminó el piso arriba (la cara de la piedra que baja al abismo)
  const ledge = new Uint16Array(N).fill(999);
  for (let x = 0; x < PWX; x++) { let run = 999; for (let y = 0; y < PHX; y++) { const i = y * PWX + x; if (cls[i] === 0 || cls[i] === 1) run = 0; else run = Math.min(999, run + 1); ledge[i] = run; } }
  const voidM = new Uint8Array(N), wallM = new Uint8Array(N);
  for (let i = 0; i < N; i++) { voidM[i] = cls[i] === 3 ? 1 : 0; wallM[i] = cls[i] === 1 ? 1 : 0; }
  const dVoid = distTo(voidM, PWX, PHX), dWall = distTo(wallM, PWX, PHX);
  const set = (i: number, c: number[], a = 255) => { img.data[i * 4] = c[0]; img.data[i * 4 + 1] = c[1]; img.data[i * 4 + 2] = c[2]; img.data[i * 4 + 3] = a; };
  const mix = (p: number[], q: number[], t: number) => p.map((v, k) => Math.round(v + (q[k] - v) * t));
  const FACE_WALL = 40, FACE_ROCK = 46, LEDGE = 40;
  for (let y = 0; y < PHX; y++) for (let x = 0; x < PWX; x++) {
    const i = y * PWX + x, v = own[i];
    // ---------- bloques ----------
    if (cls[i] === 1) {
      high[i] = 1;
      const b = below[i];
      if (v === WALL) {
        if (b <= FACE_WALL) {
          // la cara de la muralla: sillares de piedra azulada con juntas, más oscura abajo, musgo plateado
          kind[i] = 3;
          const row = Math.floor((FACE_WALL - b) / 10), off = row % 2 ? 11 : 0;
          const col = Math.floor((x + off) / 22), joint = (FACE_WALL - b) % 10 === 0 || (x + off) % 22 === 0;
          let l = 0.62 + (hash(col, row + Math.floor(y / 40) * 7, seed + 3) - 0.5) * 0.16 - (1 - b / FACE_WALL) * 0.3;
          if (b > FACE_WALL - 3) l += 0.18; // el canto de arriba
          let c = joint ? PS[2] : pick(PS, l);
          if (!joint && b < 14 && vnoise(x, y, 6, seed + 4) > 0.72) c = mix(c, MUSGO, 0.45);
          if (b <= 2) c = [8, 10, 16];
          set(i, c);
        } else {
          // la tapa de la muralla: lajas de la cornisa (vista de arriba), un poco más claras en el borde
          kind[i] = 6;
          const lx = x % 24, ly = (y + Math.floor(x / 24) * 7) % 16;
          let l = 0.4 + (hash(Math.floor(x / 24), Math.floor(y / 16), seed + 5) - 0.5) * 0.1;
          if (lx === 0 || ly === 0) l = 0.18;
          if (b - FACE_WALL <= 3) l += 0.2;
          set(i, pick(PS, l));
        }
      } else {
        if (b <= FACE_ROCK) {
          // la roca de la caverna: estratos que se quiebran, fríos, que se oscurecen hacia abajo
          kind[i] = 3;
          const strata = Math.floor((y + vnoise(x, 0, 40, seed + 6) * 18 + x * 0.1) / 8);
          let l = 0.5 + (hash(strata, x >> 4, seed + 7) - 0.5) * 0.18 - (1 - b / FACE_ROCK) * 0.32;
          if ((y + Math.floor(vnoise(x, 0, 40, seed + 6) * 18)) % 8 === 0) l -= 0.15;
          let c = pick(PS, l);
          if (hash(x >> 1, 0, seed + 8) > 0.95 && hash(x >> 1, y >> 3, seed + 9) > 0.4) c = mix(c, MUSGO, 0.25);
          if (b <= 2) c = [5, 6, 10];
          set(i, c);
        } else {
          // el techo de la roca: casi negro, con manchas apenas visibles y su canto
          kind[i] = 6;
          const n = vnoise(x, y, 48, seed + 10) * 0.6 + vnoise(x, y, 12, seed + 11) * 0.4;
          let c = n > 0.62 ? PS[1] : PS[0];
          if (b - FACE_ROCK <= 2) c = PS[4]; else if (b - FACE_ROCK <= 4) c = PS[2];
          set(i, c);
        }
      }
      continue;
    }
    // ---------- el abismo: transparente; arriba, la cara de la piedra que baja y se pierde ----------
    if (cls[i] === 3) {
      kind[i] = 6;
      const l0 = ledge[i];
      if (l0 <= LEDGE) {
        const row = Math.floor(l0 / 9), off = row % 2 ? 9 : 0, joint = l0 % 9 === 0 || (x + off) % 18 === 0;
        const k = 1 - l0 / LEDGE;
        let c = joint ? PS[1] : pick(PS, 0.42 + (hash(Math.floor((x + off) / 18), row, seed + 12) - 0.5) * 0.14 - (1 - k) * 0.25);
        if (l0 < 3) c = PS[5];
        set(i, c, Math.round(255 * Math.min(1, k * 1.6)));
      } else set(i, [0, 0, 0], 0);
      continue;
    }
    // ---------- pisos ----------
    let c: number[];
    if (v === STREET) {
      // adoquines redondeados: piedra gris azulada, juntas oscuras con musgo plateado
      kind[i] = 2;
      const gxs = x / 11, gys = y / 8.5, cx0 = Math.floor(gxs), cy0 = Math.floor(gys);
      let d1 = 9, d2 = 9, best = 0;
      for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
        const qx = cx0 + k, qy = cy0 + j;
        const px = qx + 0.5 + (hash(qx, qy, seed + 18) - 0.5) * 0.45 + (qy % 2 ? 0.5 : 0), py = qy + 0.5 + (hash(qy, qx, seed + 19) - 0.5) * 0.35;
        const dd = Math.hypot(gxs - px, (gys - py) * 1.1);
        if (dd < d1) { d2 = d1; d1 = dd; best = qx * 7919 + qy; } else if (dd < d2) d2 = dd;
      }
      const edge = d2 - d1, st = hash(best, 0, seed + 20);
      let l = 0.56 + st * 0.14 + vnoise(x, y, 70, seed + 21) * 0.12;
      if (edge < 0.08) l = 0.2;
      else if (edge < 0.16) l -= 0.1;
      else if (((x / 11) % 1) < 0.4 && ((y / 8.5) % 1) < 0.35 && edge > 0.3) l += 0.06;
      c = pick(PS, l);
      if (edge < 0.1 && vnoise(x, y, 9, seed + 22) > 0.62) c = mix(c, MUSGO, 0.55);
      if (st > 0.94 && edge > 0.14) c = pick(PS, 0.3); // adoquín hundido
    } else if (v === PLAZA || v === MARBLE) {
      kind[i] = 2;
      const tx = x / TILE, ty = y / TILE;
      const ros = d.rosettes.find((q) => Math.hypot(tx - q.c[0], ty - q.c[1]) < q.r);
      if (ros) {
        // el rosetón: lajas en abanico alrededor del centro (dos tonos apenas distintos), un borde de piedra clara y
        // en el medio una estrella de ocho puntas de piedra clara con el centro lila
        const rr = Math.hypot(tx - ros.c[0], ty - ros.c[1]), a = Math.atan2(ty - ros.c[1], tx - ros.c[0]);
        const ring = Math.floor(rr * 1.25), n = 8 + ring * 6, seg = ((a + Math.PI) / (Math.PI * 2)) * n;
        const joint = Math.abs(rr * 1.25 - Math.round(rr * 1.25)) < 0.04 || Math.abs(seg - Math.round(seg)) < 0.06 * (1 + 2 / (ring + 1));
        let l = (ring % 2 ? 0.62 : 0.68) + (hash(Math.floor(seg), ring, seed + 23) - 0.5) * 0.12;
        if (joint) l = 0.3;
        c = pick(PS, l);
        const star = rr < ros.r * 0.42 * (0.55 + 0.45 * Math.abs(Math.cos(a * 4)) ** 3);
        if (star) c = pick(PE, rr < 0.5 ? 0.25 : 0.62 - rr * 0.04);
        if (rr < 0.35) c = LILA;
        if (rr > ros.r - 0.4) c = pick(PE, rr > ros.r - 0.12 ? 0.3 : 0.62);
        else if (Math.abs(rr - ros.r * 0.5) < 0.12) c = pick(PE, 0.5);
      } else if (v === MARBLE) {
        // mármol del palacio: damero en rombos de piedra clara y oscura con un filete de oro
        const u = (x + y) / 46, w = (x - y) / 46, fu = u - Math.floor(u), fw = w - Math.floor(w);
        const dark = (Math.floor(u) + Math.floor(w)) % 2 === 0;
        const vein = vnoise(x, y, 14, seed + 24) > 0.7 && vnoise(x * 2, y, 5, seed + 25) > 0.6;
        let l = (dark ? 0.6 : 0.42) + (vnoise(x, y, 30, seed + 26) - 0.5) * 0.1 + (vein ? 0.08 : 0);
        c = dark ? pick(PS, l) : pick(PE, l);
        if (fu < 0.03 || fw < 0.03) c = ORO[1];
        else if (fu < 0.06 || fw < 0.06) c = pick(PS, 0.22);
      } else {
        // lajas grandes en hiladas corridas, alguna partida
        const row = Math.floor(y / 20), off = (row % 2) * 14 + Math.floor(hash(row, 0, seed + 27) * 9);
        const col = Math.floor((x + off) / 28), lx = (x + off) % 28, ly = y % 20, st = hash(col, row, seed + 28);
        let l = 0.6 + st * 0.12 + vnoise(x, y, 80, seed + 29) * 0.1;
        if (lx === 0 || ly === 0) l = 0.22;
        else if (lx === 1 || ly === 1) l += 0.08;
        else if (lx === 27 || ly === 19) l -= 0.08;
        if (st > 0.88 && Math.abs((lx - 14) * 0.7 - (ly - 10)) < 0.7) l = 0.24;
        c = pick(PS, l);
        if ((lx === 0 || ly === 0) && vnoise(x, y, 7, seed + 30) > 0.6) c = mix(c, MUSGO, 0.5);
      }
    } else if (v === GARDEN || v === HEDGE) {
      // grava clara de los jardines, con musgo plateado y alguna laja de paso
      kind[i] = 1;
      const n = vnoise(x, y, 18, seed + 31) * 0.6 + vnoise(x, y, 5, seed + 32) * 0.4;
      c = pick(PE, 0.18 + n * 0.25);
      if (hash(x, y, seed + 33) > 0.9) c = pick(PE, 0.55);
      if (vnoise(x, y, 26, seed + 34) > 0.68) c = mix(c, MUSGO, 0.35);
      if (v === HEDGE) c = mix(c, [10, 12, 18], 0.4);
    } else if (v === STAIRS) {
      // escalones: la pisada clara y el canto oscuro, de muralla a muralla
      kind[i] = 5;
      const s = y % 8;
      let l = s < 2 ? 0.78 : s < 6 ? 0.58 : 0.3;
      l += (hash(x >> 3, y >> 3, seed + 35) - 0.5) * 0.08;
      c = pick(PE, l);
      const sideL = T(Math.floor((x - 4) / TILE), Math.floor(y / TILE)) === WALL, sideR = T(Math.floor((x + 4) / TILE), Math.floor(y / TILE)) === WALL;
      if (sideL || sideR) c = pick(PS, 0.5);
    } else {
      // el puente: lajas largas a lo largo, baranda de piedra clara en los bordes
      kind[i] = 2;
      const along = T(Math.floor(x / TILE), Math.floor(y / TILE) - 1) === BRIDGE || T(Math.floor(x / TILE), Math.floor(y / TILE) + 1) === BRIDGE;
      const a = along ? y : x, b = along ? x : y;
      const plank = Math.floor(b / 16), u = b % 16, w2 = (a + plank * 11) % 40;
      let l = 0.6 + (hash(plank, Math.floor((a + plank * 11) / 40), seed + 36) - 0.5) * 0.14;
      if (u === 0 || w2 === 0) l = 0.24;
      c = pick(PS, l);
      if (dVoid[i] <= 5) {
        // la baranda: balaustres claros con su sombra
        const k = along ? y : x;
        c = dVoid[i] <= 2 ? pick(PE, 0.85) : k % 8 < 4 ? pick(PE, 0.62) : pick(PS, 0.3);
      }
    }
    // al pie de las murallas: polvo de sueño juntado y la sombra de contacto (oclusión)
    {
      let up = 0;
      for (let k = 1; k <= 12; k++) { const j = (y - k) * PWX + x; if (y - k >= 0 && cls[j] === 1) { up = 13 - k; break; } }
      if (up) c = mix(c, [6, 8, 14], (up / 12) * 0.55);
      if (dWall[i] < 8 && hash(x, y, seed + 37) > 0.7 + dWall[i] * 0.03) c = mix(c, LILA, 0.6);
    }
    // el borde del piso sobre el abismo: un canto claro (la piedra termina)
    if (v !== BRIDGE && dVoid[i] <= 2) c = pick(PE, 0.7);
    if (hash(x, y, seed + 38) > 0.9985) c = LILA;
    set(i, c);
  }
  // por cuadro
  const solid = new Uint8Array(W * H), waterTiles = new Uint8Array(W * H), tileKind = new Uint8Array(W * H), tileHigh = new Uint8Array(W * H);
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    const k = ty * W + tx, v = d.t[k];
    tileHigh[k] = v === ROCK || v === WALL ? 1 : 0;
    tileKind[k] = v === ROCK || v === WALL || v === VOID ? 6 : v === STAIRS ? 5 : v === GARDEN || v === HEDGE ? 1 : 2;
    solid[k] = SOLIDS.has(v) ? 1 : 0;
  }
  return { img, kind, high, solid, waterTiles, tileKind, tileHigh };
}

/** Variante espejada con otro tono (como en el Puerto): la utilería no se repite igual en una pantalla. */
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
  banco_piedra: [0.92, 0.95, 1.02], maceta_piedra_0: [0.95, 0.95, 1.04], maceta_piedra_1: [0.9, 0.94, 1.04], carretilla_pan: [0.94, 0.96, 1.02], cajon_pan: [0.92, 0.95, 1.03], cantaro: [0.95, 0.96, 1.05],
  flor_piedra_0: [0.95, 0.95, 1.05], flor_piedra_1: [0.92, 0.94, 1.04], flor_piedra_2: [0.96, 0.95, 1.05], flor_piedra_3: [0.93, 0.95, 1.03],
  farol_puente_0: [0.9, 0.95, 1.05], farol_puente_1: [0.92, 0.94, 1.04], farol_puente_2: [0.9, 0.93, 1.03], farol_puente_3: [0.94, 0.95, 1.05],
  columna_palacio_0: [0.95, 0.96, 1.04], columna_palacio_1: [0.93, 0.95, 1.03],
  arbol_piedra_0: [0.93, 0.95, 1.03], arbol_piedra_1: [0.95, 0.96, 1.04], arbol_piedra_2: [0.92, 0.95, 1.02],
  seto_piedra_0: [0.92, 0.95, 1.02], seto_piedra_1: [0.94, 0.96, 1.03], seto_piedra_2: [0.9, 0.94, 1.02], seto_piedra_3: [0.95, 0.96, 1.04],
};

/** Los objetos que usa el Mundo 5: los suyos, las estatuas, los portales y lo prestado. */
export function ciudadMapObjects(): WorldObject[] {
  const prestados = new Set(['cartel', 'aviso_jefe']);
  const base = [...ciudadObjectsA(), ...ciudadObjectsB()];
  return [
    ...base, ...base.filter((o) => VARIANTES[o.name]).map((o) => variantB(o, VARIANTES[o.name])), ...statueObjects(),
    galeriasObjects().find((o) => o.name === 'figura_ojos')!,
    ...[...forestObjects(), ...landmarkObjects()].filter((o) => prestados.has(o.name)),
    ...premiumPortals(['azul', 'rojo', 'plata']),
  ];
}

export interface CiudadReport {
  ramas: { id: string; nombre: string; medio: TP; tapar: TP[] }[];
  secretos: string[];
  pantallas: { nombre: string; x: number; y: number; objetos: string[] }[];
}

/** Las zonas: [x0, y0, x1, y1] en cuadros, con sus propiedades y su primer plano. */
const ZONAS: { nombre: string; rect: Rect; props: Record<string, Prop>; frente: string[] }[] = [
  { nombre: 'La Puerta de la Ciudad', rect: [2, 2, 23, 35], props: { luz: '#ffd890', oscuridad: 0.75, niebla: 0.4, particulas: 'polvo_sueno', ambiente: 'ciudad' }, frente: ['arco_calle_0', 'lampara_colgante_0'] },
  { nombre: 'La Calle de los Panaderos', rect: [23, 2, 48, 30], props: { luz: '#ffd890', oscuridad: 0.85, niebla: 0.45, particulas: 'polvo_sueno', ambiente: 'ciudad' }, frente: ['banderines_rotos_0', 'arco_calle_1'] },
  { nombre: 'La Plaza de la Fuente', rect: [48, 2, 80, 35], props: { luz: '#ffd890', oscuridad: 0.85, niebla: 0.45, particulas: 'polvo_sueno', ambiente: 'ciudad' }, frente: ['banderines_rotos_1', 'lampara_colgante_1'] },
  { nombre: 'El Barrio de los Músicos', rect: [80, 2, 108, 35], props: { luz: '#b89aff', oscuridad: 0.85, niebla: 0.5, particulas: 'polvo_sueno', ambiente: 'cajita' }, frente: ['lampara_colgante_0', 'banderines_rotos_0'] },
  { nombre: 'Los Jardines de Piedra', rect: [2, 35, 33, 64], props: { luz: '#9aa8b8', oscuridad: 0.85, niebla: 0.55, particulas: 'polvo_sueno', ambiente: 'jardin' }, frente: ['arco_calle_0'] },
  { nombre: 'La Torre del Reloj', rect: [33, 35, 57, 64], props: { luz: '#9aa8b8', oscuridad: 0.85, niebla: 0.45, particulas: 'polvo_sueno', ambiente: 'reloj', musica_pelea: 'relojero' }, frente: ['lampara_colgante_1'] },
  { nombre: 'El Puente de los Faroles', rect: [57, 35, 108, 62], props: { luz: '#b89aff', oscuridad: 0.85, niebla: 0.6, particulas: 'polvo_sueno', ambiente: 'abismo' }, frente: ['banderines_rotos_1'] },
  { nombre: 'El Palacio Dormido', rect: [57, 62, 108, 99], props: { luz: '#ffd890', oscuridad: 0.9, niebla: 0.4, particulas: 'polvo_sueno', ambiente: 'jefe', musica: 'jefe_rey', musica_victoria: 'despertar' }, frente: ['arco_calle_1', 'lampara_colgante_1'] },
];

/** Los barrios con farol de plaza (cada uno con su punto de guardado, sus chispas y su Ladrona). */
const BARRIOS = ['La Puerta de la Ciudad', 'La Plaza de la Fuente', 'El Barrio de los Músicos', 'El Puente de los Faroles', 'El Palacio Dormido'];

export function ciudadMap(seed = 555): BigMap & { premium: CiudadReport } {
  const W = CIUDAD_W, H = CIUDAD_H;
  const d = makeDesign(seed);
  const terrain = paintCiudad(d, seed);
  const objects = ciudadMapObjects();
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
  const chest = (tx: number, ty: number, nivel: string, extra: Record<string, Prop> = {}) => { const [x, y] = ent('cofre', tx, ty, { nivel, ...extra }); solid[at(x, y)] = 1; };
  const enemy = (id: string, nombre: string, tx: number, ty: number, extra: Record<string, Prop> = {}) => ent('enemigo', tx, ty, { enemigo: id, nombre, ...extra });
  /** un ciudadano dormido: el objeto en la capa de objetos y la entidad `estatua` en el mismo punto */
  let nEst = 0;
  const statue = (v: number, tx: number, ty: number, dx = 0) => {
    const px = T(tx) + dx, py = ty * TILE + TILE - 4;
    place(`estatua_ciudadano_${v}`, px, py);
    entities.push({ tipo: 'estatua', x: Math.round(px), y: Math.round(py), props: { id: `estatua_${nEst++}`, variante: v, objeto: `estatua_ciudadano_${v}` } });
    reserve(tx, ty, 0);
  };
  /** el farol de plaza: la fogata del piso (guarda, cura y es la tienda). Arranca apagado: lo prende la heroína */
  const farol = (tx: number, ty: number, id: string, barrio: string, extra: Record<string, Prop> = {}) => {
    const [x, y] = near(tx, ty + 1);
    occ[at(x, y)] = 1;
    const [fx, fy] = open(x, y - 1) ? [x, y - 1] : near(x + 1, y);
    placeT('farol_plaza_apagado', fx, fy);
    entities.push({ tipo: 'punto_guardado', x: T(x), y: T(y), props: { id, nombre: barrio, farol_plaza: true, objeto: 'farol_plaza', ...extra } });
    entities.push({ tipo: 'farol_plaza', x: T(fx), y: fy * TILE + TILE - 4, props: { id, punto: id, barrio } });
    reserve(x, y, 1);
    return [fx, fy] as [number, number];
  };
  /** una fila de casas pegadas, con el pie en la fila `baseY`; lo que tapan las fachadas queda sólido */
  const CASA_W = [112, 100, 120, 94, 116, 104, 90, 122, 98, 108].map((w) => (w + 8) / TILE);
  const fila = (ids: (number | 'paso' | number[])[], x0: number, baseY: number) => {
    let cur = x0;
    for (const id of ids) {
      if (id === 'paso') { cur = Math.ceil(cur) + 2; continue; }
      if (Array.isArray(id)) { cur += id[0]; continue; }
      const w = CASA_W[id], px = Math.round((cur + w / 2) * TILE);
      place(`casa_ciudad_${id}`, px, baseY * TILE - 4);
      // la fachada tapa lo de atrás: sólido hasta el techo (no se camina por detrás de las casas)
      for (let y = baseY - 5; y < baseY; y++) for (let x = Math.floor(cur); x < Math.ceil(cur + w) - (Math.ceil(cur + w) - (cur + w) > 0.5 ? 1 : 0); x++) if (at(x, y) >= 0) solid[at(x, y)] = 1;
      cur += w;
    }
  };

  // ---------- 1. La Puerta de la Ciudad: el portal, la muralla con su puerta, los dos guardias dormidos y el primer farol ----------
  const [px0, py0] = LC.portal;
  entities.push({ tipo: 'portal_llegada', x: T(px0), y: T(py0), props: { color: 'plata', portal: 'portal_plata' } });
  entities.push({ tipo: 'portal_volver', x: T(px0), y: T(py0 + 1), props: { destino: 'mundo4' } });
  reserve(px0, py0, 1);
  entities.push({ tipo: 'jugador_inicio', x: T(px0 + 3), y: T(py0) });
  entities.push({ tipo: 'thor_inicio', x: T(px0 + 3), y: T(py0 + 1) });
  reserve(px0 + 3, py0, 1);
  place('puerta_ciudad', LC.puerta[0] * TILE, LC.puerta[1] * TILE - 1);
  for (let y = 17; y <= 21; y++) for (const x of [12, 13]) { solid[at(x, y)] = 0; occ[at(x, y)] = 1; }
  statue(6, 10, 22); statue(8, 15, 22, 8);
  farol(LC.farolPuerta[0], LC.farolPuerta[1], 'puerta', 'La Puerta de la Ciudad', { tutorial: true });
  statue(7, 7, 8);
  place('banco_piedra', T(9), 9 * TILE + 26);
  chest(4, 4, 'madera');
  fila([3, [0.6], 6], 4.4, 6);
  enemy('duende_sueno', 'Duende del Sueño', 19, 12);
  ent('figura', 20, 28, { id: 'puerta', barrio: 'La Puerta de la Ciudad' });

  // ---------- 2. La Calle de los Panaderos: angosta, casas hombro a hombro, el panadero y la señora de la canasta ----------
  fila([0, 1, 9, 5], 23, 7);
  statue(0, 30, 10); statue(1, 40, 12);
  placeT('carretilla_pan', 34, 13); placeT('cajon_pan', 28, 8);
  place('puesto_dormido_2', T(27), 14 * TILE + 26); place('puesto_dormido_0', T(42), 14 * TILE + 26);
  enemy('sonambulo_piedra', 'Sonámbulo de Piedra', 33, 12);
  enemy('sonambulo_piedra', 'Sonámbulo de Piedra', 45, 10);
  ent('figura', 46, 9, { id: 'calle', barrio: 'La Plaza de la Fuente' });
  // el callejón de los hornos (rama): debajo de la calle, con un cofre y un duende
  chest(33, 20, 'reforzado');
  enemy('duende_sueno', 'Duende del Sueño', 38, 19);

  // ---------- 3. La Plaza de la Fuente: la fuente seca, los puestos dormidos y la ronda de los niños ----------
  fila([2, 4, 7, 8], 48.6, 7);
  // la fila de abajo, de espaldas al borde de la plaza (deja libre la escalinata)
  fila([0, [1.2], 9, [2.2], 6, [1.4], 3], 57.4, 31);
  { const [fx, fy] = LC.fuente; place('fuente_plaza', T(fx) - 16, fy * TILE + TILE - 4 + 8); reserve(fx, fy - 1, 1); entities.push({ tipo: 'fuente', x: T(fx) - 16, y: fy * TILE + 36, props: { id: 'fuente', objeto: 'fuente_plaza', corre_al_final: true } }); }
  farol(LC.farolPlaza[0], LC.farolPlaza[1], 'plaza', 'La Plaza de la Fuente');
  place('puesto_dormido_0', T(53), 12 * TILE + 26); place('puesto_dormido_1', T(75), 12 * TILE + 26); place('puesto_dormido_2', T(73), 27 * TILE + 26);
  // la ronda: dos niños de la mano, uno frente al otro, y la rayuela de tiza al lado
  statue(2, 68, 26); statue(3, 70, 26, 4);
  decos.push({ sprite: 'rayuela_0', x: T(62), y: T(27) });
  statue(7, 52, 18);
  enemy('sonambulo_piedra', 'Sonámbulo de Piedra', 58, 17);
  enemy('sonambulo_piedra', 'Sonámbulo de Piedra', 71, 17);
  enemy('sonambulo_piedra', 'Sonámbulo de Piedra', 64, 28);
  enemy('duende_sueno', 'Duende del Sueño', 77, 22);
  chest(78, 9, 'madera');
  ent('figura', 66, 10, { id: 'plaza', barrio: 'La Plaza de la Fuente' });

  // ---------- 4. El Barrio de los Músicos: la cajita que toca sola, los músicos dormidos y el mural ----------
  fila([6, [0.4], 3], 80.2, 7);
  fila([1, 'paso', 8], 88.4, 7);
  fila([5], 80.6, 34); fila([2, [0.6], 7, [0.4], 4], 91, 34);
  place('mural_5', LC.mural[0] * TILE, LC.mural[1] * TILE - 2);
  entities.push({ tipo: 'mural', x: LC.mural[0] * TILE, y: (LC.mural[1] + 1) * TILE, props: { pieza: 5 } });
  reserve(LC.mural[0], LC.mural[1], 0);
  place('glorieta_musica', T(94), 17 * TILE);
  { const [cx, cy] = LC.musicos; placeT('cajita_musica', cx, cy); entities.push({ tipo: 'cajita_musica', x: T(cx), y: cy * TILE + TILE - 4, props: { id: 'cajita', suena_sola: true } }); reserve(cx, cy, 1); }
  statue(4, 89, 18); statue(5, 99, 18); statue(9, 84, 25);
  placeT('banco_piedra_b', 94, 23);
  farol(LC.farolMusicos[0], LC.farolMusicos[1], 'musicos', 'El Barrio de los Músicos');
  enemy('sonambulo_piedra', 'Sonámbulo de Piedra', 85, 12);
  enemy('sonambulo_piedra', 'Sonámbulo de Piedra', 102, 15);
  enemy('gargola_dormida', 'Gárgola Dormida', 96, 30);
  ent('figura', 104, 22, { id: 'musicos', barrio: 'El Barrio de los Músicos' });
  ent('figura', 82, 30, { id: 'musicos_b', barrio: 'El Barrio de los Músicos' });
  // el desván del organillero (secreto): entre dos casas, un rincón con un cofre
  for (let y = 2; y <= 7; y++) for (const x of [99, 100]) if (d.t[at(x, y)] === STREET) { solid[at(x, y)] = 0; occ[at(x, y)] = 1; }
  for (let y = 2; y <= 3; y++) for (let x = 97; x <= 103; x++) solid[at(x, y)] = 0;
  chest(LC.desvan[0], LC.desvan[1] - 1, 'dorado', { secreto: true, pista: 'desvan_organillero' });

  // ---------- 5. Los Jardines de Piedra: el laberinto de setos con flores de piedra y el corazón escondido ----------
  {
    let k = 0;
    const trees = new Set<string>();
    for (let by = 0; by < MAZE.bh; by++) for (let bx = 0; bx < MAZE.bw; bx++) {
      if (!d.maze[by * MAZE.bw + bx]) continue;
      // de vez en cuando, en vez del seto, un árbol de piedra tallado en la pared del laberinto
      const h = hash(bx, by, seed + 61), tree = hash(by, bx, seed + 63) < 0.14 && bx % 2 === 0 && by % 2 === 0;
      const v = Math.floor(h * 8), tn = `arbol_piedra_${v % 3}${v >= 4 ? '_b' : ''}`;
      // cada árbol una sola vez (el laberinto entra casi entero en una pantalla)
      const name = tree && !trees.has(tn) ? tn : `seto_piedra_${v % 4}${v >= 4 ? '_b' : ''}`;
      trees.add(name);
      decos.push({ sprite: name, x: (MAZE.x + bx * 2 + 1) * TILE, y: (MAZE.y + by * 2 + 2) * TILE - 4 });
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) occ[at(MAZE.x + bx * 2 + dx, MAZE.y + by * 2 + dy)] = 1;
      k++;
    }
    void k;
  }
  // el corazón del jardín (secreto): el cuarto del medio del laberinto, con su cofre dorado
  chest(MAZE.x + 7 * 2 + 1, MAZE.y + 7 * 2 + 1, 'dorado', { secreto: true, pista: 'corazon_jardin' });
  statue(9, 6, 37);
  enemy('duende_sueno', 'Duende del Sueño', 10, 40);
  enemy('duende_sueno', 'Duende del Sueño', 22, 46);
  enemy('duende_sueno', 'Duende del Sueño', 14, 58);
  chest(5, 58, 'madera');

  // ---------- 6. La Torre del Reloj: el Relojero y su cofre dorado ----------
  fila([8, [0.4], 2], 34, 40); fila([1, [0.4], 7], 46.4, 40);
  placeT('torre_reloj', LC.torre[0], LC.torre[1]);
  for (let y = LC.torre[1] - 1; y <= LC.torre[1]; y++) for (let x = LC.torre[0] - 2; x <= LC.torre[0] + 2; x++) occ[at(x, y)] = 1;
  entities.push({ tipo: 'torre_reloj', x: T(LC.torre[0]), y: LC.torre[1] * TILE + TILE - 4, props: { id: 'torre', objeto: 'torre_reloj' } });
  enemy('relojero', 'El Relojero', LC.relojero[0], LC.relojero[1], { elite: true });
  chest(38, 59, 'dorado', { guardado_por: 'relojero' });
  statue(5, 36, 45); statue(0, 54, 47);
  enemy('sonambulo_piedra', 'Sonámbulo de Piedra', 50, 56);
  enemy('sonambulo_piedra', 'Sonámbulo de Piedra', 37, 53);

  // ---------- 7. El Puente de los Faroles: el puente largo con los faroles muertos y las gárgolas posadas ----------
  ['farol_puente_2', 'farol_puente_3_b', 'farol_puente_1', 'farol_puente_0_b', 'farol_puente_3'].forEach((n, k) => { const y = 36 + k * 4; placeT(n, k % 2 ? 89 : 86, y, k % 2 ? 6 : -6); });
  enemy('gargola_dormida', 'Gárgola Dormida', 87, 39);
  enemy('gargola_dormida', 'Gárgola Dormida', 88, 45);
  enemy('gargola_dormida', 'Gárgola Dormida', 87, 50);
  farol(LC.farolPuente[0], LC.farolPuente[1], 'puente', 'El Puente de los Faroles');
  statue(1, 96, 56); statue(6, 69, 60);
  chest(103, 60, 'reforzado');
  enemy('duende_sueno', 'Duende del Sueño', 92, 59);
  enemy('duende_sueno', 'Duende del Sueño', 99, 58);
  ent('figura', 90, 56, { id: 'puente', barrio: 'El Puente de los Faroles' });

  // ---------- 8. El Palacio Dormido: el patio y la sala del trono ----------
  farol(LC.farolPalacio[0], LC.farolPalacio[1], 'palacio', 'El Palacio Dormido');
  statue(8, 79, 66); statue(6, 89, 66, -4);
  statue(4, 66, 74); statue(3, 99, 73);
  for (const [x, y, v] of [[64, 68, '0'], [102, 68, '1']] as [number, number, string][]) placeT(`columna_palacio_${v}`, x, y);
  placeT('seto_piedra_1', 75, 73); placeT('seto_piedra_2_b', 92, 73);
  placeT('flor_piedra_0', 77, 75); placeT('flor_piedra_3_b', 90, 75); placeT('maceta_piedra_1', 74, 66);
  chest(102, 71, 'madera');
  enemy('sonambulo_piedra', 'Sonámbulo de Piedra', 76, 70);
  enemy('sonambulo_piedra', 'Sonámbulo de Piedra', 92, 70);
  enemy('gargola_dormida', 'Gárgola Dormida', 96, 67);
  ent('figura', 87, 74, { id: 'patio', barrio: 'El Palacio Dormido' });
  // la sala del trono: el trono contra la pared, la arena alrededor, las cuatro lámparas en diagonal y las columnas
  const [ax, ay] = LC.arena, acx = T(ax), acy = T(ay);
  place('trono_rey', T(LC.trono[0]) - 16, LC.trono[1] * TILE - 4);
  entities.push({ tipo: 'arena_jefe', x: acx, y: acy, props: { radio: ARENA_REY.radio, trono: true, lamparas: 4 } });
  entities.push({ tipo: 'jefe', x: acx, y: acy, props: { enemigo: 'rey_de_piedra', nombre: 'El Rey de Piedra', titulo: 'El que se durmió con la luz de todos' } });
  const lo = Math.round(ARENA_REY.lampara / Math.SQRT2);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy], k) => {
    const lx = acx + sx * lo, ly = acy + sy * lo;
    place('lampara_trono_apagada', lx, ly);
    entities.push({ tipo: 'lampara_trono', x: lx, y: ly, props: { id: `lampara_${k}`, objeto: 'lampara_trono' } });
  });
  for (let y = 85; y <= 97; y += 2) decos.push({ sprite: 'alfombra_palacio', x: acx, y: y * TILE });
  for (const [x, y, v] of [[72, 84, '0'], [96, 84, '1_b'], [72, 93, '1'], [96, 93, '0_b']] as [number, number, string][]) placeT(`columna_palacio_${v}`, x, y);
  place('balcon_palacio', T(76), 80 * TILE - 2);
  placeT('maceta_piedra_0', 70, 81); placeT('maceta_piedra_1_b', 98, 81); placeT('arbol_piedra_1', 70, 89); placeT('arbol_piedra_2_b', 98, 89); placeT('banco_piedra', 75, 97); placeT('cantaro_b', 93, 97);
  entities.push({ tipo: 'figura', x: T(76), y: 80 * TILE - 4 - 70, props: { id: 'balcon', barrio: 'El Palacio Dormido', alto: true } });
  entities.push({ tipo: 'portal_jefe', x: acx, y: T(96), props: { color: 'plata', portal: 'portal_plata', destino: 'mundo6' } });
  chest(91, 96, 'dorado', { tras_jefe: true });
  // la arena queda libre para pelear (nada de utilería adentro)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.hypot(x + 0.5 - acx / TILE, y + 0.5 - acy / TILE) * TILE < ARENA_REY.radio + 16) occ[at(x, y)] = 1;

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
          if (i < 0 || solid[i] || occ[i] || avoid[i] || d.t[i] === STAIRS || d.t[i] === BRIDGE) continue;
          if (decos.some((q) => q.sprite === sprite && Math.abs(q.x - px) < 960 && Math.abs(q.y - py) < 540)) continue;
          const box: number[] = [];
          let bad = false;
          solidBox(sprite, px, py, (kk) => { box.push(kk); if (solid[kk] || occ[kk] || avoid[kk]) bad = true; });
          if (bad) continue;
          if (cellsOf(sprite, px, py).some((cc) => bodies.has(cc))) continue;
          const fx0 = Math.floor((px - o.anchor[0] + 4) / TILE), fx1 = Math.floor((px - o.anchor[0] + o.w - 5) / TILE);
          let onFloor = true;
          for (let x = fx0; x <= fx1; x++) { const j = at(x, ty); if (j < 0 || SOLIDS.has(d.t[j])) onFloor = false; }
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
    dress([4, 4, 22, 17], ['arbol_piedra_0', 'arbol_piedra_1', 'arbol_piedra_2', 'maceta_piedra_0', 'maceta_piedra_1', 'cantaro', 'flor_piedra_1', 'aljibe'], 7);
    dress([4, 22, 22, 30], ['arbol_piedra_1', 'maceta_piedra_0', 'cantaro', 'banco_piedra', 'flor_piedra_2'], 6);
    dress([24, 8, 47, 14], ['cajon_pan', 'cantaro', 'maceta_piedra_1', 'banco_piedra'], 7);
    dress([24, 18, 46, 22], ['cajon_pan', 'cantaro', 'maceta_piedra_0'], 5);
    dress([49, 8, 79, 30], ['arbol_piedra_0', 'arbol_piedra_1', 'arbol_piedra_2', 'farol_puente_0', 'banco_piedra', 'maceta_piedra_0', 'maceta_piedra_1', 'cantaro', 'cajon_pan', 'carretilla_pan'], 18);
    dress([81, 8, 106, 33], ['arbol_piedra_0', 'arbol_piedra_1', 'arbol_piedra_2', 'farol_puente_1', 'banco_piedra', 'maceta_piedra_0', 'maceta_piedra_1', 'cantaro', 'aljibe'], 16);
    dress([34, 42, 56, 61], ['arbol_piedra_0', 'arbol_piedra_1', 'arbol_piedra_2', 'banco_piedra', 'maceta_piedra_0', 'maceta_piedra_1', 'aljibe', 'cantaro', 'flor_piedra_0'], 14);
    dress([67, 55, 104, 61], ['arbol_piedra_0', 'arbol_piedra_1', 'arbol_piedra_2', 'banco_piedra', 'maceta_piedra_0', 'cantaro', 'maceta_piedra_1'], 7);
    dress([61, 65, 104, 76], ['arbol_piedra_0', 'arbol_piedra_2', 'maceta_piedra_0', 'cantaro', 'flor_piedra_2'], 5);
    // flores de piedra en los pasillos del laberinto
    dress([4, 36, 32, 62], ['flor_piedra_0', 'flor_piedra_1', 'flor_piedra_2', 'flor_piedra_3'], 18);
  }

  // ---------- zonas y postales ----------
  const zones: MapZone[] = [];
  for (const z of ZONAS) {
    const [x0, y0, x1, y1] = z.rect;
    zones.push({ nombre: z.nombre, x: x0 * TILE, y: y0 * TILE, w: (x1 - x0) * TILE, h: (y1 - y0) * TILE, props: { musica: 'ninguna', descubrir: true, ...z.props, frente: z.frente.join(',') } });
  }
  zones.push({ nombre: 'El Corazón del Jardín', x: (MAZE.x + 12) * TILE, y: (MAZE.y + 12) * TILE, w: 8 * TILE, h: 8 * TILE, props: { musica: 'ninguna', ambiente: 'jardin', luz: '#b89aff', oscuridad: 0.8, niebla: 0.5, particulas: 'polvo_sueno', secreto: true, descubrir: true } });
  zones.push({ nombre: 'El Desván del Organillero', x: 97 * TILE, y: 2 * TILE, w: 7 * TILE, h: 4 * TILE, props: { musica: 'ninguna', ambiente: 'cajita', luz: '#ffc070', oscuridad: 0.8, niebla: 0.3, particulas: 'polvo_sueno', secreto: true, descubrir: true } });
  const postales: Postal[] = [
    { nombre: 'puerta_de_la_ciudad', x: T(13), y: T(20) },
    { nombre: 'calle_de_los_panaderos', x: T(35), y: T(10) },
    { nombre: 'plaza_de_la_fuente', x: T(64), y: T(13) },
    { nombre: 'barrio_de_los_musicos', x: T(93), y: T(12) },
    { nombre: 'jardines_de_piedra', x: T(17), y: T(46) },
    { nombre: 'torre_del_reloj', x: T(45), y: T(42) },
    { nombre: 'puente_de_los_faroles', x: T(84), y: T(52) },
    { nombre: 'palacio_dormido', x: T(84), y: T(84) },
  ];

  // ---------- chispas y figuras: donde caen las chispas de la luz robada, lejos de las paredes ----------
  const walkable = (x: number, y: number) => at(x, y) >= 0 && !solid[at(x, y)];
  for (const barrio of BARRIOS) {
    const z = ZONAS.find((q) => q.nombre === barrio)!;
    const f = entities.find((e) => e.tipo === 'farol_plaza' && e.props?.barrio === barrio)!;
    const fx = Math.floor(f.x / TILE), fy = Math.floor((f.y - 1) / TILE);
    const cand: [number, number][] = [];
    for (let y = z.rect[1]; y < z.rect[3]; y++) for (let x = z.rect[0]; x < z.rect[2]; x++) {
      let ok = !occ[at(x, y)];
      for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1 && ok; dx++) if (!walkable(x + dx, y + dy)) ok = false;
      if (ok && Math.hypot(x - fx, y - fy) > 3) cand.push([x, y]);
    }
    const chosen: [number, number][] = [];
    for (let t = 0; t < cand.length * 3 && chosen.length < 8; t++) {
      const c = cand[Math.floor(hash(t, chosen.length, seed + 71 + barrio.length) * cand.length)];
      if (chosen.some((q) => Math.hypot(q[0] - c[0], q[1] - c[1]) < 4.5)) continue;
      chosen.push(c);
    }
    chosen.forEach(([x, y], k) => entities.push({ tipo: 'chispa', x: T(x), y: T(y), props: { id: `${f.props!.id}_${k}`, barrio } }));
  }

  const map: BigMap & { premium: CiudadReport } = {
    name: 'mundo5_ciudad', w: W, h: H, terrain, solid, decos, entities, zones, postales, objects,
    meta: { bioma: 'ciudad', musica: 'ninguna', nombre: 'La Ciudad Dormida', fondo: CIUDAD_PARALAJE.map((p, k) => ({ id: `fondo_ciudad_lejos_${k}`, paralaje: p })) },
    premium: {
      ramas: [
        { id: 'callejon', nombre: 'El callejón de los hornos', medio: [33, 20], tapar: [[43, 15], [44, 15], [45, 15], [46, 15], [43, 16], [44, 16], [45, 16], [46, 16]] },
        { id: 'jardines', nombre: 'Los Jardines de Piedra (de la puerta a la torre)', medio: LC.jardin, tapar: [[8, 32], [9, 32], [10, 32], [11, 32]] },
        { id: 'puentecito', nombre: 'El Puentecito del Reloj (el atajo de vuelta)', medio: [61, 57], tapar: [[61, 57], [61, 58], [62, 57], [62, 58]] },
      ],
      secretos: ['corazon_jardin', 'desvan_organillero'],
      pantallas: [],
    },
  };
  poblar(map, d, { solid, at, seed, byName });
  // lo que no se alcanza de ninguna forma (detrás de las casas, adentro de la roca) se cierra en la colisión
  {
    const reach = new Uint8Array(W * H);
    const start = entities.find((e) => e.tipo === 'jugador_inicio')!;
    const q = [at(Math.floor(start.x / TILE), Math.floor(start.y / TILE))];
    reach[q[0]] = 1;
    for (let i = 0; i < q.length; i++) { const k = q[i], x = k % W, y = Math.floor(k / W); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = at(x + dx, y + dy); if (j < 0 || reach[j] || solid[j]) continue; reach[j] = 1; q.push(j); } }
    for (let k = 0; k < W * H; k++) if (!reach[k]) solid[k] = 1;
  }
  return map;
}

/** Calcomanías por tipo de piso */
const DECAL_PIEDRA = ['adoquines_rotos_0', 'adoquines_rotos_1', 'adoquines_rotos_2', 'polvo_sueno_0', 'polvo_sueno_1', 'polvo_sueno_2', 'charco_seco_0', 'charco_seco_1', 'petalos_piedra_0'];
const DECAL_JARDIN = ['petalos_piedra_0', 'petalos_piedra_1', 'polvo_sueno_0', 'polvo_sueno_2', 'charco_seco_1'];

/** Calcomanías en cada pantalla (sin repetir la misma cerca) y la agenda de lo que se ve en cada postal. */
function poblar(m: BigMap & { premium: CiudadReport }, d: Design, c: { solid: Uint8Array; at: (x: number, y: number) => number; seed: number; byName: Map<string, WorldObject> }) {
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
        if (i < 0 || c.solid[i] || d.t[i] === STAIRS || d.t[i] === BRIDGE || d.t[i] === MARBLE) continue;
        const px = tx * TILE + 4 + Math.floor(r() * 24), py = ty * TILE + 4 + Math.floor(r() * 24);
        if (Math.hypot(px - arena.x, py - arena.y) < ARENA_REY.radio) continue;
        const kd = m.terrain.kind[py * PWX + px];
        if (kd !== 1 && kd !== 2) continue;
        const pool = kd === 2 ? DECAL_PIEDRA : DECAL_JARDIN;
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

export { ROCK, WALL, STREET, PLAZA, GARDEN, HEDGE, STAIRS, BRIDGE, MARBLE, VOID };
