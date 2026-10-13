import { createRaster } from '../core/raster';
import { TILE } from './tiles';
import { distTo, type PaintedTerrain, type TP } from './paint';
import { puertoObjectsA, PUERTO, hash } from './puertoObjects';
import { puertoObjectsB, MAR_PARALAJE, wetFigure, marinerEyes } from './puertoObjectsB';
import { forestObjects, type WorldObject } from './objects';
import { landmarkObjects } from './landmarks';
import { galeriasObjects } from './galeriasObjects';
import { premiumPortals } from './portales';
import { footprint, CELL } from './premium/placer';
import type { BigMap, Deco, Ent, MapZone, Postal, Prop } from './bosqueMap';

/**
 * Mundo 4: El Puerto Ahogado (encargo F12, parte 1). Un mar negro bajo tierra con un pueblo de pescadores medio
 * hundido, el faro apagado al fondo y ceniza que cae siempre. Es exterior bajo tierra: agua negra con orillas, muelles
 * de madera, calles de piedra mojada entre casas y el acantilado de roca alrededor (el techo de la caverna no se ve).
 *
 * El camino principal:
 *
 *   Muelle de Llegada > Calle de las Redes > Mercado Hundido > Iglesia de la Campana Ahogada > Los Botes Volteados >
 *   el rompeolas > El Faro (la arena del Pez Farol, en el agua de al lado)
 *
 * Ramas que vuelven al camino: el callejón de la orilla (detrás de las casas de la calle), la pasarela del mercado
 * hundido, la ruta del Astillero (con el Capitán Ahogado) que sigue por la Cueva de las Medusas hasta el Faro (el
 * atajo de vuelta) y el banco de arena de los botes (por el barro con la marea baja o por los muelles flotantes con la
 * marea alta). Secretos para el olfato de Thor: el Patio de las Redes (entre dos casas de la calle) y la Gruta del
 * Ancla (arriba de la cueva).
 *
 * Mareas: la capa `marea_baja` marca los cuadros que solo se caminan con la marea baja (el barro del banco de arena) y
 * `marea_alta` los que solo se caminan con la marea alta (los muelles flotantes que suben). En la capa `colision` los
 * dos van libres: el juego suma uno u otro según la marea. Ninguna zona queda sin salida con ninguna de las dos.
 */

export const PUERTO_W = 110;
export const PUERTO_H = 90;

/** Tipos de cuadro del diseño */
/** LAND: adoquines (calles). SLAB: lajas grandes (plazas). DIRT: tierra y barro firme (astillero, la punta del faro). */
const ROCK = 0, LAND = 1, SAND = 2, WATER = 3, VOID = 4, MUD = 5, SLAB = 6, DIRT = 7;

/** Lugares (en cuadros) */
export const LP = {
  llegada: [9, 13] as TP,
  farolLlegada: [14, 16] as TP,
  calle: [34, 14] as TP,
  patio: [36.5, 5] as TP,
  mercado: [57, 12] as TP,
  farolMercado: [57, 9] as TP,
  iglesia: [84, 12] as TP, // el pie de la pared de atrás: la nave son las filas 12 y 13, la puerta los cuadros 83 y 84
  botes: [90, 44] as TP,
  farolBotes: [93, 40] as TP,
  banco: [66, 47] as TP,
  astillero: [16, 46] as TP,
  cueva: [47, 72] as TP,
  gruta: [47, 59.5] as TP,
  faro: [96, 68] as TP,
  farolFaro: [88, 62] as TP,
  arena: [84, 73] as TP,
};

type Poly = TP[];

/** El diseño por cuadro: qué es cada cuadro, antes de pintar. */
interface Design {
  t: Uint8Array;
  /** muelles: cuadros de agua que se pisan (tablas encima) */
  dock: Uint8Array;
  /** marea: 1 = solo con marea baja (barro), 2 = solo con marea alta (muelle flotante) */
  tide: Uint8Array;
  /** agua quieta (reflejo) */
  still: Uint8Array;
  /** la poza de la arena del Pez Farol (agua negra, honda) */
  pool: Uint8Array;
}

function inPoly(x: number, y: number, poly: Poly): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** Las tierras del puerto (polígonos en cuadros), en orden: lo de después pisa lo de antes. */
const TIERRAS: { t: number; poly: Poly }[] = [
  // el mar entero (después se recortan las tierras)
  { t: WATER, poly: [[3, 20], [107, 20], [107, 88], [3, 88]] },
  // el mar que se pierde a lo lejos (donde se ve el fondo): el sur, más allá del faro
  { t: VOID, poly: [[58, 84.5], [70, 83], [86, 84], [100, 82.5], [107, 78], [107, 89], [58, 89]] },
  // la llegada: el muelle de piedra (lajas) con la orilla
  { t: SLAB, poly: [[4, 8.6], [12, 7.4], [20.6, 8], [21, 22.4], [17, 23.4], [12.4, 23], [8, 23.6], [4, 23.2]] },
  { t: DIRT, poly: [[4, 23], [8, 23.4], [8.6, 26.4], [4, 26.4]] },
  // la calle de las redes: angosta, con las casas contra el acantilado
  { t: LAND, poly: [[20.4, 8.2], [47, 8], [47, 23], [38, 23.4], [30, 22.6], [24, 23.2], [20.4, 22.6]] },
  // la rendija entre dos casas y el patio de las redes (secreto)
  { t: LAND, poly: [[35.9, 3], [38, 3], [38, 8.4], [35.9, 8.4]] },
  { t: LAND, poly: [[33.6, 2.4], [40, 2.4], [40.2, 5.2], [33.4, 5.2]] },
  // el mercado hundido: una plaza de lajas que se hunde al sur
  { t: SLAB, poly: [[46.4, 7.6], [56, 7.2], [67.6, 7.6], [68.4, 23.4], [62, 22.6], [56, 23], [49, 22.4], [46.4, 25.6]] },
  // la iglesia: el atrio de lajas y la calle que sigue al este
  { t: LAND, poly: [[67.6, 7.6], [80, 7.4], [80, 27], [70, 26], [68, 23.4]] },
  { t: SLAB, poly: [[79.4, 5], [89, 5], [89, 17.4], [79.4, 17.4]] },
  { t: LAND, poly: [[88.6, 7.6], [104.6, 7.8], [105, 27.5], [99, 29], [92, 27.6], [86, 28], [80, 27], [79.4, 17]] },
  // peñascos del pueblo: separan el atrio de la iglesia de la calle del este y del mercado
  { t: ROCK, poly: [[68.6, 7.4], [74, 7.2], [75, 11.4], [72, 13], [69, 11.6]] },
  { t: ROCK, poly: [[97.6, 18.6], [101.6, 17.6], [103, 21.4], [99.6, 23.2], [97, 21.6]] },
  // el camino de la costa del oeste, de la llegada al astillero
  { t: DIRT, poly: [[4, 26], [10, 26], [10.6, 30], [9.4, 35], [4, 35]] },
  // el astillero: tierra y barro firme
  { t: DIRT, poly: [[4, 34], [12, 33.6], [22, 35], [30, 37], [31.4, 44], [30.2, 52], [27, 58.6], [18, 60], [8, 59.6], [4, 58]] },
  // la bajada del este, de la iglesia a los botes
  { t: DIRT, poly: [[94, 27], [105, 27], [105, 36], [96, 36]] },
  // la playa de los botes volteados (arena y barro)
  { t: SAND, poly: [[76, 35], [105, 34], [105, 52], [98, 54.6], [90, 55], [82, 54.6], [77.2, 54.2], [75.6, 43]] },
  // el banco de arena (siempre seco) con su cofre
  { t: SAND, poly: [[63.6, 44.2], [68.6, 44.4], [69.4, 54], [64, 53.6]] },
  // el rompeolas: piedra que baja de la playa al faro
  { t: SLAB, poly: [[86.4, 54], [91, 54], [91, 60], [86.4, 60]] },
  // el faro: la punta de roca (tierra) con la plataforma de lajas de la arena
  { t: DIRT, poly: [[78, 59.4], [100, 57.6], [105.4, 62], [105, 72], [100, 77], [92, 80], [84, 80.4], [77.6, 78.4], [76.4, 70], [77, 63]] },
  { t: SLAB, poly: [[78.4, 67], [88, 66.4], [91, 72], [88.6, 79], [80, 79.4], [77.6, 74]] },
  // la isla de roca de la cueva de las medusas (encierra la cueva)
  { t: ROCK, poly: [[33, 59], [44, 56], [60, 57], [64, 64], [63, 80], [52, 83.6], [38, 82.4], [32.6, 74]] },
  // la cueva por dentro
  { t: DIRT, poly: [[36, 66], [41, 63.4], [51, 63], [58, 64.4], [61, 68.6], [60, 76], [54, 79.6], [42, 79.6], [36.4, 75.6], [35, 70]] },
  // la gruta del ancla (secreto, arriba de la cueva) y su grieta
  { t: DIRT, poly: [[45.4, 58.4], [49, 58.4], [49.4, 61], [45, 61]] },
  { t: DIRT, poly: [[46.6, 60.8], [47.8, 60.8], [47.8, 63.6], [46.6, 63.6]] },
  // la entrada de la cueva desde el astillero (oeste) y la salida al faro (este)
  { t: DIRT, poly: [[32.4, 68], [36.4, 68], [36.4, 72], [32.4, 72]] },
  { t: DIRT, poly: [[60, 66.4], [64.6, 66.4], [64.6, 70.4], [60, 70.4]] },
  // peñascos que rompen las explanadas (se ve su cara de acantilado)
  { t: ROCK, poly: [[24.6, 39], [28, 38.4], [28.6, 42], [25, 42.6]] },
  { t: ROCK, poly: [[5, 44], [8, 43.4], [8.6, 46.6], [5, 47]] },
  { t: ROCK, poly: [[100, 62], [104.4, 62], [104.6, 67], [101, 66.6]] },
  { t: ROCK, poly: [[96.4, 74], [100.4, 72.6], [101, 76], [97, 77]] },
  { t: ROCK, poly: [[101, 38], [104.6, 37.4], [104.6, 42], [101.4, 42]] },
  { t: ROCK, poly: [[78.6, 36.4], [83.4, 35.4], [84, 38.6], [79.4, 39.4]] },
];

/** Muelles: tramos de tablas sobre el agua (en cuadros, ancho 2) */
const MUELLES: TP[][] = [
  // el muelle de la llegada: una T que entra al agua
  [[15, 26], [15, 33]],
  [[11, 33], [19, 33]],
  // la pasarela del mercado hundido (rama): baja, cruza los puestos y vuelve a subir
  [[50, 22], [50, 28]],
  [[50, 28], [64, 28]],
  [[64, 28], [64, 22]],
  // del astillero a la cueva
  [[28, 57], [28, 69]],
  [[28, 69], [33, 69]],
  // de la cueva al faro (el atajo de vuelta)
  [[64, 67], [71, 67]],
  [[71, 67], [71, 62]],
  [[71, 62], [78, 62]],
];

/** El barro de la marea baja (del borde de la playa al banco de arena) y los muelles flotantes de la marea alta. */
const BARRO: Poly = [[69, 44.4], [76, 43.6], [76.4, 49.4], [69.4, 49.6]];
const FLOTANTES: TP[] = [[69, 52], [71, 52], [73, 52], [75, 52]];

/** El agua quieta de la cueva (reflejo) */
const POZA = { c: [47.5, 72] as TP, rx: 7.6, ry: 3.6 };
/**
 * La arena del Pez Farol: una poza de agua negra de 4 cuadros de radio en el centro (ahí nada el pez, no se entra) y
 * alrededor un anillo que se camina hasta el radio de la arena, con un muelle redondo de tablas, pilotes y sogas.
 */
export const ARENA_POZA = { c: [84.5, 73.5] as TP, r: 4, anillo: 6.6 };

function makeDesign(): Design {
  const W = PUERTO_W, H = PUERTO_H, t = new Uint8Array(W * H).fill(ROCK);
  const dock = new Uint8Array(W * H), tide = new Uint8Array(W * H), still = new Uint8Array(W * H), pool = new Uint8Array(W * H);
  for (const { t: v, poly } of TIERRAS) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inPoly(x + 0.5, y + 0.5, poly)) t[y * W + x] = v;
  }
  // la poza de la cueva
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.hypot((x + 0.5 - POZA.c[0]) / POZA.rx, (y + 0.5 - POZA.c[1]) / POZA.ry) < 1) { t[y * W + x] = WATER; still[y * W + x] = 1; }
  // la arena del Pez Farol: la poza en el centro y el anillo que se camina alrededor
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dd = Math.hypot(x + 0.5 - ARENA_POZA.c[0], y + 0.5 - ARENA_POZA.c[1]), k = y * W + x;
    if (dd < ARENA_POZA.r) { t[k] = WATER; still[k] = 1; pool[k] = 1; }
    else if (dd < ARENA_POZA.anillo) t[k] = SLAB;
  }
  // el barro de la marea baja
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inPoly(x + 0.5, y + 0.5, BARRO) && t[y * W + x] === WATER) { t[y * W + x] = MUD; tide[y * W + x] = 1; }
  // los muelles (ancho 2)
  for (const seg of MUELLES) {
    const [[x0, y0], [x1, y1]] = seg;
    const hor = y0 === y1;
    for (let k = 0; k <= Math.abs(hor ? x1 - x0 : y1 - y0); k++) {
      const x = hor ? Math.min(x0, x1) + k : x0, y = hor ? y0 : Math.min(y0, y1) + k;
      for (const [dx, dy] of hor ? [[0, 0], [0, 1]] : [[0, 0], [1, 0]]) { const i = (y + dy) * W + x + dx; if (t[i] === WATER) dock[i] = 1; }
    }
  }
  // los muelles flotantes (2 x 1 cuadros cada uno, en dos filas)
  for (const [x, y] of FLOTANTES) for (const dy of [0, 1]) for (const dx of [0, 1]) { const i = (y + dy) * W + x + dx; if (t[i] === WATER) tide[i] = 2; }
  // el borde del mapa es roca
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x < 2 || y < 2 || x >= W - 2 || y >= H - 1) t[y * W + x] = t[y * W + x] === VOID ? VOID : ROCK;
  return { t, dock, tide, still, pool };
}

/** Ruido de valor suave (para los bordes y las texturas del piso). */
function vnoise(x: number, y: number, cell: number, seed: number): number {
  const gx = x / cell, gy = y / cell, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0, seed), b = hash(x0 + 1, y0, seed), c = hash(x0, y0 + 1, seed), d = hash(x0 + 1, y0 + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

const RGB = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const PS = PUERTO.piedra.map(RGB), PM = ['#0e0c0a', '#16130f', '#1e1a15', '#28231c', '#322b22', '#3c3428'].map(RGB), PW = PUERTO.agua.map(RGB);
const BRILLO = RGB(PUERTO.brillo);

/**
 * El pintor del puerto: piedra mojada en las calles (adoquines redondeados con brillo), barro y arena oscura en la
 * playa, la orilla mojada con su filo de luz verde, el acantilado de roca con estratos y chorretes que gotean, y el
 * agua transparente (debajo va el agua animada) que se oscurece hacia lo hondo y se pierde en lo negro hacia el sur.
 */
function paintPuerto(d: Design, seed: number): PaintedTerrain {
  const W = PUERTO_W, H = PUERTO_H, PWX = W * TILE, PHX = H * TILE, N = PWX * PHX;
  const img = createRaster(PWX, PHX);
  const kind = new Uint8Array(N), high = new Uint8Array(N);
  const T = (tx: number, ty: number) => (tx < 0 || ty < 0 || tx >= W || ty >= H ? ROCK : d.t[ty * W + tx]);
  // por pixel: roca, agua (o el vacío) o tierra. El borde entre tipos se quiebra con ruido (hasta un tercio de cuadro)
  const isRock = (v: number) => (v === ROCK ? 1 : 0), isWet = (v: number) => (v === WATER || v === VOID ? 1 : 0);
  const cls = new Uint8Array(N); // 0 tierra, 1 roca, 2 agua, 3 vacío
  for (let y = 0; y < PHX; y++) for (let x = 0; x < PWX; x++) {
    const gx = x / TILE - 0.5, gy = y / TILE - 0.5, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
    const a = T(x0, y0), b = T(x0 + 1, y0), c = T(x0, y0 + 1), e = T(x0 + 1, y0 + 1);
    const i = y * PWX + x;
    const bil = (f: (v: number) => number) => f(a) + (f(b) - f(a)) * fx + (f(c) - f(a)) * fy + (f(a) - f(b) - f(c) + f(e)) * fx * fy;
    const nz = (vnoise(x, y, 22, seed + 1) - 0.5) * 0.5 + (vnoise(x, y, 7, seed + 2) - 0.5) * 0.18;
    const own = T(Math.floor(x / TILE), Math.floor(y / TILE));
    if (a === b && b === c && c === e) cls[i] = a === ROCK ? 1 : a === WATER ? 2 : a === VOID ? 3 : 0;
    else if (bil(isRock) + nz > 0.5) cls[i] = 1;
    else if (bil(isWet) + nz * 0.8 > 0.5) cls[i] = own === VOID || (own !== WATER && bil((v) => (v === VOID ? 1 : 0)) > 0.5) ? 3 : 2;
    else cls[i] = 0;
  }
  // distancias: de la tierra al agua (orilla mojada), del agua a la tierra (lo hondo), de la roca al piso (la cara)
  const water = new Uint8Array(N), land = new Uint8Array(N);
  for (let i = 0; i < N; i++) { water[i] = cls[i] >= 2 ? 1 : 0; land[i] = cls[i] === 0 ? 1 : 0; }
  const dWater = distTo(water, PWX, PHX), dLand = distTo(land, PWX, PHX);
  const voidM = new Uint8Array(N);
  for (let i = 0; i < N; i++) voidM[i] = cls[i] === 3 ? 1 : 0;
  const dVoid = distTo(voidM, PWX, PHX);
  // cuánto le falta a cada pixel de roca para llegar a un piso de abajo (la cara del acantilado mira al sur)
  const below = new Uint16Array(N).fill(999);
  for (let x = 0; x < PWX; x++) { let run = 999; for (let y = PHX - 1; y >= 0; y--) { const i = y * PWX + x; if (cls[i] !== 1) run = 0; else run = Math.min(999, run + 1); below[i] = run; } }
  const FACE = 44;
  const set = (i: number, c: number[], a = 255) => { img.data[i * 4] = c[0]; img.data[i * 4 + 1] = c[1]; img.data[i * 4 + 2] = c[2]; img.data[i * 4 + 3] = a; };
  const mix = (p: number[], q: number[], t: number) => p.map((v, k) => Math.round(v + (q[k] - v) * t));
  for (let y = 0; y < PHX; y++) for (let x = 0; x < PWX; x++) {
    const i = y * PWX + x, tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    let own = T(tx, ty);
    if (cls[i] === 1) {
      high[i] = 1;
      const b = below[i];
      if (b <= FACE) {
        // la cara del acantilado: estratos inclinados, quebrados, que se oscurecen hacia abajo; chorretes que brillan
        kind[i] = 3;
        const strata = Math.floor((y + vnoise(x, 0, 40, seed + 3) * 18 + x * 0.12) / 7);
        let l = 0.62 - (b < 3 ? -0.15 : 0) - ((FACE - b) / FACE) * 0.0 + (hash(strata, x >> 4, seed + 4) - 0.5) * 0.18 - (b / FACE) * 0.0;
        l -= (1 - b / FACE) * 0.35; // la parte baja de la cara, más oscura
        if ((y + Math.floor(vnoise(x, 0, 40, seed + 3) * 18)) % 7 === 0) l -= 0.18;
        let c = PS[Math.max(0, Math.min(6, Math.round(l * 6)))];
        // chorretes de agua que bajan por la piedra
        if (hash(x >> 1, 0, seed + 5) > 0.93 && hash(x >> 1, y >> 3, seed + 6) > 0.3) c = mix(c, BRILLO, 0.35);
        if (b <= 2) c = [4, 7, 8]; // donde la roca toca el piso
        set(i, c);
      } else {
        // la roca de arriba (techo del acantilado): oscura, con manchas grandes apenas visibles y su canto con luz
        kind[i] = 6;
        const n = vnoise(x, y, 48, seed + 7) * 0.6 + vnoise(x, y, 12, seed + 8) * 0.4;
        let c = n > 0.62 ? PS[1] : PS[0];
        // el canto de arriba de la cara (donde empieza a bajar), con luz
        if (b - FACE <= 2) c = PS[4];
        else if (b - FACE <= 4) c = PS[2];
        if (hash(x, y, seed + 9) > 0.9994) c = BRILLO.map((v) => Math.round(v * 0.5));
        set(i, c);
      }
      continue;
    }
    if (cls[i] >= 2) {
      // agua: transparente (el agua animada va debajo), oscurecida hacia lo hondo y hacia el vacío del sur
      kind[i] = 4;
      const deep = Math.min(1, dLand[i] / 120);
      let a = Math.round(deep * 150);
      if (cls[i] === 3) { kind[i] = 6; set(i, [0, 0, 0], 0); continue; }
      if (dVoid[i] < 160) a = Math.max(a, Math.round((1 - dVoid[i] / 160) * 235));
      // la poza de la cueva es quieta y un poco más clara en el medio
      if (d.still[ty * W + tx]) a = Math.round(40 + deep * 60);
      // la poza del Pez Farol: tan negra como el mar hondo (la luz del pez es lo único que brilla ahí)
      if (d.pool[ty * W + tx]) a = Math.max(160, Math.round(150 + deep * 60));
      set(i, [1, 4, 5], a);
      continue;
    }
    // ---------- tierra ----------
    // el material del piso no cambia en una línea recta: el borde entre adoquines, lajas y tierra se mezcla con ruido
    const isLand = (v: number) => v === LAND || v === SLAB || v === DIRT || v === SAND;
    if (isLand(own)) {
      const jx = (vnoise(x, y, 18, seed + 50) - 0.5) * 36, jy = (vnoise(x, y, 18, seed + 51) - 0.5) * 36;
      const oj = T(Math.floor((x + jx) / TILE), Math.floor((y + jy) / TILE));
      if (isLand(oj)) own = oj;
    }
    const wet = dWater[i];
    const sand = own === SAND || own === MUD || own === DIRT;
    let c: number[];
    if (own === MUD) {
      // el barro de la marea: liso, brillante y con charquitos
      kind[i] = 1;
      const n = vnoise(x, y, 16, seed + 10);
      c = mix(PM[2], PW[3], 0.35 + n * 0.3);
      if (vnoise(x, y, 9, seed + 11) > 0.72) c = mix(PW[2], BRILLO, 0.12);
      if (hash(x, y, seed + 12) > 0.995) c = [120, 116, 104];
    } else if (own === DIRT) {
      // tierra firme y barro: grava fina, manchas de ceniza y alguna tabla hundida
      kind[i] = 1;
      const n = vnoise(x, y, 24, seed + 30) * 0.6 + vnoise(x, y, 8, seed + 31) * 0.4;
      c = mix(PM[2], PS[2], 0.35 + n * 0.3);
      if (n > 0.62) c = mix(c, PS[3], 0.4);
      if (hash(x, y, seed + 32) > 0.97) c = PS[4];
      if (hash(x >> 1, y >> 1, seed + 33) > 0.985) c = [70, 72, 70];
      if (vnoise(x, y, 30, seed + 34) > 0.7) c = mix(c, PW[2], 0.4);
    } else if (sand) {
      // arena y barro oscuro de la playa, con piedritas y conchas
      kind[i] = 1;
      const n = vnoise(x, y, 20, seed + 13) * 0.6 + vnoise(x, y, 6, seed + 14) * 0.4;
      c = PM[Math.max(1, Math.min(5, Math.round(1.6 + n * 3)))];
      if (hash(x, y, seed + 15) > 0.985) c = PS[4];
      if (hash(x, y, seed + 16) > 0.997) c = [150, 146, 130];
      // las marcas que dejó el agua al bajar (ondas)
      if (Math.sin(y * 0.5 + vnoise(x, y, 30, seed + 17) * 8) > 0.93) c = mix(c, PM[0], 0.5);
    } else if (own === SLAB) {
      // lajas grandes de piedra mojada (plazas): hiladas corridas, juntas finas, alguna rota o hundida
      kind[i] = 2;
      const row = Math.floor(y / 18), off = (row % 2) * 13 + Math.floor(hash(row, 0, seed + 40) * 9);
      const col = Math.floor((x + off) / 26), lx = (x + off) % 26, ly = y % 18;
      const st = hash(col, row, seed + 41);
      let l = 0.36 + st * 0.12 + vnoise(x, y, 80, seed + 42) * 0.12;
      if (lx === 0 || ly === 0) l = 0.12;
      else if (lx === 1 || ly === 1) l += 0.08;
      else if (lx === 25 || ly === 17) l -= 0.07;
      if (st > 0.86 && Math.abs((lx - 13) * 0.7 - (ly - 9)) < 0.7) l = 0.14; // laja partida
      c = PS[Math.max(0, Math.min(6, Math.round(l * 6)))];
      if (st < 0.12 && lx > 1 && ly > 1) c = mix(c, PW[2], 0.55); // laja hundida con agua
      if (vnoise(x, y, 34, seed + 43) > 0.76) c = mix(c, PW[2], 0.3);
      if (hash(x, y, seed + 44) > 0.996) c = mix(c, BRILLO, 0.4);
    } else {
      // adoquines de piedra mojada: piedras redondeadas, juntas oscuras y brillo arriba a la izquierda
      kind[i] = 2;
      const gxs = x / 12, gys = y / 9;
      const cx0 = Math.floor(gxs), cy0 = Math.floor(gys);
      let d1 = 9, d2 = 9, best = 0;
      for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
        const qx = cx0 + k, qy = cy0 + j;
        const px = qx + 0.5 + (hash(qx, qy, seed + 18) - 0.5) * 0.5 + (qy % 2 ? 0.5 : 0), py = qy + 0.5 + (hash(qy, qx, seed + 19) - 0.5) * 0.4;
        const dd = Math.hypot((gxs - px) * 1.0, (gys - py) * 1.1);
        if (dd < d1) { d2 = d1; d1 = dd; best = qx * 7919 + qy; } else if (dd < d2) d2 = dd;
      }
      const edge = d2 - d1;
      const st = hash(best, 0, seed + 20);
      let l = 0.34 + st * 0.1 + vnoise(x, y, 64, seed + 21) * 0.1;
      if (edge < 0.08) l = 0.14;
      else if (edge < 0.16) l -= 0.08;
      // brillo de agua sobre la piedra (arriba a la izquierda de cada adoquín)
      const hl = edge > 0.3 && hash(best, 1, seed + 22) > 0.6 && ((x / 12) % 1) < 0.45 && ((y / 9) % 1) < 0.4;
      c = PS[Math.max(0, Math.min(6, Math.round(l * 6)))];
      if (hl) c = mix(c, BRILLO, 0.18);
      // charcos entre las piedras
      if (vnoise(x, y, 26, seed + 23) > 0.74) c = mix(c, PW[2], edge < 0.22 ? 0.7 : 0.35);
    }
    // la orilla: más mojada y oscura, con un filo de luz verde justo donde toca el agua
    if (wet < 10) c = mix(c, PW[1], (1 - wet / 10) * 0.55);
    if (wet <= 1.5) c = mix(c, BRILLO, 0.32);
    // al pie de la cara del acantilado, la sombra de contacto de la roca (oclusión)
    {
      let up = 0;
      for (let k = 1; k <= 14; k++) { const j = (y - k) * PWX + x; if (y - k >= 0 && cls[j] === 1) { up = 15 - k; break; } }
      if (up) c = mix(c, [2, 4, 5], (up / 14) * 0.6);
    }
    set(i, c);
  }
  // por cuadro
  const solid = new Uint8Array(W * H), waterTiles = new Uint8Array(W * H), tileKind = new Uint8Array(W * H), tileHigh = new Uint8Array(W * H);
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    const k = ty * W + tx, v = d.t[k];
    let wcount = 0, rockC = 0;
    for (let y = ty * TILE; y < ty * TILE + TILE; y += 2) for (let x = tx * TILE; x < tx * TILE + TILE; x += 2) { const c = cls[y * PWX + x]; if (c === 2) wcount++; if (c === 1) rockC++; }
    if (wcount) waterTiles[k] = 1;
    tileHigh[k] = v === ROCK ? 1 : 0;
    tileKind[k] = v === ROCK ? 6 : v === WATER ? 4 : v === VOID ? 6 : v === LAND || v === SLAB ? 2 : 1;
    solid[k] = v === ROCK || v === VOID || (v === WATER && !d.dock[k] && d.tide[k] !== 2) ? 1 : 0;
    void rockC;
  }
  return { img, kind, high, solid, waterTiles, tileKind, tileHigh };
}

/** Los objetos que usa el Mundo 4: los suyos, la figura de las Galerías (y su versión mojada) y lo prestado. */
export function puertoMapObjects(): WorldObject[] {
  const prestados = new Set(['cartel', 'aviso_jefe', 'aviso_carga']);
  const fig = galeriasObjects().find((o) => o.name === 'figura_ojos')!;
  return [
    ...puertoObjectsA(), ...puertoObjectsB(), fig, wetFigure(fig),
    ...[...forestObjects(), ...landmarkObjects()].filter((o) => prestados.has(o.name)),
    ...premiumPortals(['azul', 'rojo']),
  ];
}

export { marinerEyes };

export interface PuertoReport {
  ramas: { id: string; nombre: string; medio: TP; tapar: TP[] }[];
  secretos: string[];
  pantallas: { nombre: string; x: number; y: number; objetos: string[] }[];
}

/** Las zonas: [x0, y0, x1, y1] en cuadros, oscuridad, bruma, partículas, ambiente y su primer plano. */
const ZONAS: { nombre: string; rect: [number, number, number, number]; props: Record<string, Prop>; frente: string[] }[] = [
  { nombre: 'El Muelle de Llegada', rect: [2, 2, 22, 34], props: { luz: '#6fb8a8', oscuridad: 0.7, niebla: 0.4, particulas: 'ceniza', ambiente: 'puerto' }, frente: ['vigas_frente_0', 'rocas_frente_0'] },
  { nombre: 'La Calle de las Redes', rect: [22, 2, 46, 28], props: { luz: '#5a8a80', oscuridad: 0.8, niebla: 0.45, particulas: 'ceniza', ambiente: 'puerto' }, frente: ['red_colgando_0', 'red_colgando_1'] },
  { nombre: 'El Mercado Hundido', rect: [46, 2, 68, 32], props: { luz: '#5a8a80', oscuridad: 0.8, niebla: 0.5, particulas: 'ceniza', ambiente: 'puerto' }, frente: ['vigas_frente_1', 'red_colgando_1'] },
  { nombre: 'La Iglesia de la Campana Ahogada', rect: [68, 2, 106, 27], props: { luz: '#7a8aa0', oscuridad: 0.85, niebla: 0.55, particulas: 'ceniza', ambiente: 'campana' }, frente: ['rocas_frente_1'] },
  { nombre: 'Los Botes Volteados', rect: [62, 27, 106, 56], props: { luz: '#6fb8a8', oscuridad: 0.8, niebla: 0.6, particulas: 'ceniza', ambiente: 'puerto' }, frente: ['rocas_frente_0', 'vigas_frente_1'] },
  { nombre: 'El Astillero', rect: [2, 34, 32, 62], props: { luz: '#8a7a5a', oscuridad: 0.85, niebla: 0.5, particulas: 'ceniza', ambiente: 'puerto', musica_pelea: 'capitan' }, frente: ['vigas_frente_0', 'vigas_frente_1'] },
  { nombre: 'La Cueva de las Medusas', rect: [26, 56, 64, 88], props: { luz: '#8a5aff', oscuridad: 0.85, niebla: 0.6, particulas: 'brillos', ambiente: 'agua' }, frente: ['rocas_frente_1'] },
  { nombre: 'El Faro', rect: [64, 56, 108, 89], props: { luz: '#ffd890', oscuridad: 0.9, niebla: 0.5, particulas: 'ceniza', ambiente: 'jefe', musica: 'jefe_pez', musica_victoria: 'faro' }, frente: ['rocas_frente_0'] },
];

export function puertoMap(seed = 444): BigMap & { premium: PuertoReport } {
  const W = PUERTO_W, H = PUERTO_H;
  const d = makeDesign();
  const terrain = paintPuerto(d, seed);
  const objects = puertoMapObjects();
  const byName = new Map(objects.map((o) => [o.name, o]));
  const solid = new Uint8Array(terrain.solid);
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : y * W + x);
  const T = (t: number) => t * TILE + TILE / 2;
  const decos: Deco[] = [], entities: Ent[] = [];
  const occ = new Uint8Array(W * H);
  // los cuerpos de lo que ya está (celdas de 4 px): nada se monta encima de nada
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
  const open = (x: number, y: number) => at(x, y) >= 0 && !solid[at(x, y)] && !occ[at(x, y)] && !d.tide[at(x, y)] && !d.dock[at(x, y)];
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
  /** el farol del muelle: la fogata del Mundo 4 (guarda, cura y es la tienda). Arranca apagado: lo prende Thor */
  const farol = (tx: number, ty: number, id: string, nombre: string, extra: Record<string, Prop> = {}) => {
    const [x, y] = near(tx, ty + 1);
    occ[at(x, y)] = 1;
    const [fx, fy] = open(x, y - 1) ? [x, y - 1] : near(x + 1, y);
    placeT('farol_muelle_apagado', fx, fy);
    entities.push({ tipo: 'punto_guardado', x: T(x), y: T(y), props: { id, nombre, farol: true, objeto: 'farol_muelle', ...extra } });
    entities.push({ tipo: 'farol_muelle', x: T(fx), y: fy * TILE + TILE - 4, props: { id, punto: id } });
    reserve(x, y, 1);
  };

  // ---------- los muelles: la tabla que toca según dónde está el agua ----------
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = at(x, y);
    if (!d.dock[k]) continue;
    const walk = (X: number, Y: number) => { const j = at(X, Y); return j >= 0 && (d.dock[j] || (d.t[j] !== WATER && d.t[j] !== ROCK && d.t[j] !== VOID)); };
    const n = !walk(x, y - 1), s = !walk(x, y + 1), w = !walk(x - 1, y), e = !walk(x + 1, y);
    let sprite = 'muelle_ancho';
    if (n && s) sprite = 'muelle_h';
    else if (e && w) sprite = 'muelle_v';
    else if (n && w) sprite = 'muelle_esquina_no';
    else if (n && e) sprite = 'muelle_esquina_ne';
    else if (s && w) sprite = 'muelle_esquina_so';
    else if (s && e) sprite = 'muelle_esquina_se';
    else if (n) sprite = 'muelle_borde_n';
    else if (s) sprite = 'muelle_borde_s';
    else if (w) sprite = 'muelle_borde_o';
    else if (e) sprite = 'muelle_borde_e';
    decos.push({ sprite, x: T(x), y: T(y) });
    occ[k] = 1;
  }
  // los muelles flotantes (marea alta): arrancan abajo; el juego los sube con la marea
  for (const [x, y] of FLOTANTES) for (const dy of [0, 1]) { decos.push({ sprite: 'muelle_flotante', x: (x + 1) * TILE, y: T(y + dy) }); occ[at(x, y + dy)] = occ[at(x + 1, y + dy)] = 1; }

  // ---------- 1. el Muelle de Llegada: el portal, el primer farol (Thor lo prende y se enseña el farol) ----------
  const [lx, ly] = LP.llegada;
  entities.push({ tipo: 'portal_llegada', x: T(lx - 3), y: T(ly), props: { color: 'rojo' } });
  entities.push({ tipo: 'portal_volver', x: T(lx - 3), y: T(ly + 1), props: { destino: 'mundo3' } });
  reserve(lx - 3, ly, 1);
  entities.push({ tipo: 'jugador_inicio', x: T(lx + 1), y: T(ly + 1) });
  entities.push({ tipo: 'thor_inicio', x: T(lx), y: T(ly + 2) });
  reserve(lx + 1, ly + 1, 1);
  farol(LP.farolLlegada[0], LP.farolLlegada[1], 'llegada', 'El Muelle de Llegada', { tutorial: true });
  chest(6, 22, 'madera');
  place('casa_pescador_5', T(9.5), 9 * TILE + 26);
  place('bote_hundido', T(21), 29 * TILE);
  ent('enemigo', 18, 30, { enemigo: 'cangrejo_ceniza', nombre: 'Cangrejo de Ceniza' });

  // ---------- 2. la Calle de las Redes: casas hombro a hombro a los dos lados, redes colgando, el patio escondido ----------
  // la fila de arriba se apoya en el acantilado; la de abajo da la espalda a la calle y el frente a la orilla. Entre la
  // 4 y la 5 de arriba queda la rendija del patio secreto; en la de abajo, dos pasos al callejón de la orilla
  const HOUSE_W = [92, 104, 80, 98, 86, 100, 76, 108, 90, 84].map((w) => (w + 12) / TILE);
  const fila = (ids: (number | 'paso')[], x0: number, baseY: number) => {
    let cur = x0;
    for (const id of ids) {
      if (id === 'paso') { cur = Math.ceil(cur) + 2.4; continue; }
      const w = HOUSE_W[id];
      place(`casa_pescador_${id}`, Math.round((cur + w / 2) * TILE), baseY * TILE + 26);
      cur += w + 0.1;
    }
  };
  fila([0, 1, 2, 9], 22.6, 10);
  fila([3, 6], 38.2, 10);
  fila([4, 7, 'paso', 8], 21, 18);
  for (let y = 3; y <= 10; y++) for (const x of [36, 37]) { solid[at(x, y)] = 0; occ[at(x, y)] = 1; }
  place('red_colgando_2', T(43), 15 * TILE + 8);
  ent('enemigo', 33, 14, { enemigo: 'marinero_niebla', nombre: 'Marinero de Niebla' });
  ent('enemigo', 44, 15, { enemigo: 'marinero_niebla', nombre: 'Marinero de Niebla' });
  ent('figura', 46, 12, { id: 'calle' });
  // el callejón de la orilla (rama): detrás de las casas de abajo, con un cofre
  chest(36, 21, 'reforzado');
  ent('enemigo', 26, 21, { enemigo: 'cangrejo_ceniza', nombre: 'Cangrejo de Ceniza' });
  // el patio de las redes (secreto)
  chest(36, 3, 'dorado', { secreto: true, pista: 'patio_redes' });

  // ---------- 3. el Mercado Hundido: puestos volteados, la mitad bajo el agua ----------
  farol(LP.farolMercado[0], LP.farolMercado[1], 'mercado', 'El Mercado Hundido');
  place('bote_hundido', T(58), 26 * TILE + 10);
  ent('enemigo', 54, 17, { enemigo: 'cangrejo_ceniza', nombre: 'Cangrejo de Ceniza' });
  ent('enemigo', 55, 18, { enemigo: 'cangrejo_ceniza', nombre: 'Cangrejo de Ceniza' });
  ent('enemigo', 60, 18, { enemigo: 'cangrejo_ceniza', nombre: 'Cangrejo de Ceniza' });
  ent('enemigo', 63, 11, { enemigo: 'marinero_niebla', nombre: 'Marinero de Niebla' });
  // casas del mercado (fila de arriba, contra el acantilado) y de la calle del este
  fila([1, 0], 51.6, 10);
  fila([4, 7, 2], 89.6, 11);
  fila([9, 'paso', 3], 70.2, 25);
  // la pasarela de los puestos hundidos (rama) con su cofre en la punta
  { const k = at(57, 29); entities.push({ tipo: 'cofre', x: T(57), y: T(29), props: { nivel: 'reforzado' } }); solid[k] = 1; occ[k] = 1; }
  ent('figura', 66, 6, { id: 'mercado' });

  // ---------- 4. la Iglesia de la Campana Ahogada: la campana que suena sola y el mural adentro ----------
  {
    const [ix, iy] = LP.iglesia;
    const px = ix * TILE, py = iy * TILE;
    place('iglesia_ruina', px, py);
    // la campana adentro de la nave y el mural en la pared de atrás (la cara que se ve es la de adentro)
    place('campana_iglesia', px + 50, py + 54);
    entities.push({ tipo: 'campana_iglesia', x: px + 50, y: py + 54, props: { id: 'iglesia', suena_sola: true } });
    decos.push({ sprite: 'mural_4', x: px, y: py + 1 });
    entities.push({ tipo: 'mural', x: px - 16, y: py + 16, props: { pieza: 4 } });
    // la nave por dentro queda libre
    for (let y = iy; y <= iy + 2; y++) for (let x = ix - 2; x <= ix + 2; x++) occ[at(x, y)] = 1;
  }
  ent('enemigo', 76, 16, { enemigo: 'marinero_niebla', nombre: 'Marinero de Niebla' });
  ent('enemigo', 96, 18, { enemigo: 'marinero_niebla', nombre: 'Marinero de Niebla' });

  // ---------- 5. los Botes Volteados: la playa, la marea, el banco de arena ----------
  farol(LP.farolBotes[0], LP.farolBotes[1], 'botes', 'Los Botes Volteados');
  place('bote_volteado_0', T(84), 39 * TILE + 20); place('bote_volteado_1', T(98), 47 * TILE + 20); place('bote_volteado_2', T(81), 49 * TILE + 20);
  chest(LP.banco[0], LP.banco[1], 'reforzado');
  ent('enemigo', 86, 45, { enemigo: 'cangrejo_ceniza', nombre: 'Cangrejo de Ceniza' });
  ent('enemigo', 87, 46, { enemigo: 'cangrejo_ceniza', nombre: 'Cangrejo de Ceniza' });
  ent('enemigo', 85, 47, { enemigo: 'cangrejo_ceniza', nombre: 'Cangrejo de Ceniza' });
  ent('enemigo', 100, 43, { enemigo: 'marinero_niebla', nombre: 'Marinero de Niebla' });

  // ---------- 6. el Astillero: el Capitán Ahogado y su cofre dorado ----------
  // la grada del astillero: tablas sobre la tierra que bajan al agua, con un bote a medio hacer encima
  for (let x = 19; x <= 29; x++) for (const y of [50, 51]) { const k = at(x, y); if (k >= 0 && d.t[k] !== WATER) { decos.push({ sprite: y === 50 ? 'muelle_borde_n' : 'muelle_borde_s', x: T(x), y: T(y) }); occ[k] = 1; } }
  place('bote_volteado_1', T(23), 51 * TILE + 18);
  ent('enemigo', LP.astillero[0] + 2, LP.astillero[1], { enemigo: 'capitan_ahogado', elite: true, nombre: 'El Capitán Ahogado' });
  chest(8, 56, 'dorado', { guardado_por: 'capitan_ahogado' });
  ent('enemigo', 24, 46, { enemigo: 'cangrejo_ceniza', nombre: 'Cangrejo de Ceniza' });
  ent('enemigo', 25, 47, { enemigo: 'cangrejo_ceniza', nombre: 'Cangrejo de Ceniza' });

  // ---------- 7. la Cueva de las Medusas: agua quieta, medusas negras flotando y la gruta escondida ----------
  ent('enemigo', 40, 68, { enemigo: 'medusa_negra', nombre: 'Medusa Negra' });
  ent('enemigo', 55, 68, { enemigo: 'medusa_negra', nombre: 'Medusa Negra' });
  ent('enemigo', 47, 78, { enemigo: 'medusa_negra', nombre: 'Medusa Negra' });
  chest(39, 76, 'madera');
  chest(LP.gruta[0], 59, 'dorado', { secreto: true, pista: 'gruta_ancla' });
  placeT('ancla_vieja', 46, 59);

  // ---------- 8. El Faro: la base del faro y la arena del Pez Farol en el agua de al lado ----------
  farol(LP.farolFaro[0], LP.farolFaro[1], 'faro', 'El Faro');
  placeT('faro', LP.faro[0], LP.faro[1]);
  for (let y = LP.faro[1] - 1; y <= LP.faro[1]; y++) for (let x = LP.faro[0] - 2; x <= LP.faro[0] + 2; x++) occ[at(x, y)] = 1;
  const [ax, ay] = LP.arena;
  entities.push({ tipo: 'arena_jefe', x: T(ax), y: T(ay), props: { radio: 6.5 * TILE, agua: true, poza: ARENA_POZA.r * TILE } });
  // el pez nada en la poza del centro; la heroína pelea en el anillo de alrededor
  entities.push({ tipo: 'jefe', x: T(ax), y: T(ay), props: { enemigo: 'pez_farol', nombre: 'El Pez Farol', titulo: 'El que se robó la luz del faro', en_agua: true } });
  decos.push({ sprite: 'anillo_poza', x: T(ax), y: T(ay) });
  entities.push({ tipo: 'portal_jefe', x: T(LP.faro[0]), y: T(LP.faro[1] + 2), props: { color: 'rojo', destino: 'mundo5' } });
  chest(LP.faro[0] + 3, LP.faro[1] + 2, 'dorado', { tras_jefe: true });
  entities.push({ tipo: 'figura', x: T(LP.faro[0]), y: LP.faro[1] * TILE + TILE - 4 - 300, props: { id: 'faro', alto: true } });
  reserve(ax, ay, 2);

  // ---------- la utilería de cada zona: densa, sin montarse, sin repetir lo mismo en una pantalla, sin cortar pasos ----------
  {
    let rs = (seed * 7919) >>> 0;
    const rnd = () => { rs = (rs + 0x6d2b79f5) >>> 0; let t = Math.imul(rs ^ (rs >>> 15), rs | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    // cerca de las entidades no va nada (se pelea, se abre un cofre, se prende un farol)
    const avoid = new Uint8Array(W * H);
    // el anillo de la arena queda libre para pelear
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.hypot(x + 0.5 - ARENA_POZA.c[0], y + 0.5 - ARENA_POZA.c[1]) < ARENA_POZA.anillo + 1) avoid[at(x, y)] = 1;
    for (const e of entities) { const tx = Math.floor(e.x / TILE), ty = Math.floor(e.y / TILE); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(tx + dx, ty + dy) >= 0) avoid[at(tx + dx, ty + dy)] = 1; }
    const start = entities.find((e) => e.tipo === 'jugador_inicio')!;
    const s0 = at(Math.floor(start.x / TILE), Math.floor(start.y / TILE));
    const count = () => { const seen = new Uint8Array(W * H), q = [s0]; seen[s0] = 1; for (let i = 0; i < q.length; i++) { const k = q[i], x = k % W, y = Math.floor(k / W); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = at(x + dx, y + dy); if (j < 0 || seen[j] || solid[j]) continue; seen[j] = 1; q.push(j); } } return q.length; };
    let alcanzados = count();
    const dress = (rect: [number, number, number, number], pool0: string[], n: number) => {
      const [X0, Y0, X1, Y1] = rect;
      const pool = [...pool0, ...pool0.map((q) => `${q}_b`).filter((q) => byName.has(q))];
      for (let k = 0; k < n; k++) {
        for (let t = 0; t < 120; t++) {
          const sprite = pool[Math.floor(rnd() * pool.length)], o = byName.get(sprite)!;
          const px = Math.round((X0 + rnd() * (X1 - X0)) * TILE), py = Math.round((Y0 + rnd() * (Y1 - Y0)) * TILE);
          const tx = Math.floor(px / TILE), ty = Math.floor((py - 1) / TILE), i = at(tx, ty);
          if (i < 0 || solid[i] || occ[i] || avoid[i] || d.dock[i] || d.tide[i] || d.t[i] === WATER) continue;
          // ninguna pantalla repite el mismo objeto
          if (decos.some((q) => q.sprite === sprite && Math.abs(q.x - px) < 960 && Math.abs(q.y - py) < 540)) continue;
          // su caja sólida, en cuadros libres
          const box: number[] = [];
          let bad = false;
          solidBox(sprite, px, py, (kk) => { box.push(kk); if (solid[kk] || occ[kk] || avoid[kk] || d.dock[kk] || d.tide[kk]) bad = true; });
          if (bad) continue;
          // el pie y el cuerpo no se montan con nada
          const cells = cellsOf(sprite, px, py);
          if (cells.some((cc) => bodies.has(cc))) continue;
          // todo el dibujo sobre piso (que no cuelgue sobre el agua ni sobre la roca)
          const fx0 = Math.floor((px - o.anchor[0] + 4) / TILE), fx1 = Math.floor((px - o.anchor[0] + o.w - 5) / TILE);
          let onFloor = true;
          for (let x = fx0; x <= fx1; x++) { const j = at(x, ty); if (j < 0 || d.t[j] === WATER || d.t[j] === ROCK || d.t[j] === VOID) onFloor = false; }
          if (!onFloor) continue;
          // y no corta ningún paso
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
    const pequeños = ['cajon_puerto', 'barril_pescado', 'nasa_rota', 'cuerda_enrollada', 'boya_vieja', 'pilote_muelle', 'remos_tirados'];
    dress([3, 9, 21, 24], ['cajon_puerto', 'boya_vieja', 'cuerda_enrollada', 'pilote_muelle', 'nasa_rota', 'remos_tirados', 'barril_pescado', 'roca_puerto_0'], 16);
    dress([21, 11, 47, 22], ['barril_pescado', 'nasa_rota', 'cajon_puerto', 'remos_tirados', 'cuerda_enrollada', 'boya_vieja', 'cajones_mercado'], 12);
    dress([46, 6, 68, 23], ['puesto_volteado', 'cajones_mercado', 'barril_pescado', 'cajon_puerto', 'ancla_vieja', 'cuerda_enrollada', 'nasa_rota', 'remos_tirados'], 18);
    dress([68, 6, 105, 27], ['cajon_puerto', 'ancla_vieja', 'cuerda_enrollada', 'boya_vieja', 'roca_puerto_0', 'roca_puerto_1', 'barril_pescado', 'nasa_rota'], 18);
    dress([75, 35, 105, 54], ['nasa_rota', 'boya_vieja', 'remos_tirados', 'red_colgando_2', 'ancla_vieja', 'pilote_muelle', 'roca_puerto_1', 'roca_puerto_2', 'cuerda_enrollada'], 16);
    dress([4, 34, 31, 60], ['bote_volteado_0', 'bote_volteado_2', 'ancla_vieja', 'cuerda_enrollada', 'barril_pescado', 'cajones_mercado', 'red_colgando_2', 'remos_tirados', 'roca_puerto_1', 'roca_puerto_2', ...pequeños], 22);
    dress([35, 63, 61, 80], ['roca_puerto_0', 'roca_puerto_1', 'roca_puerto_2', 'ancla_vieja', 'nasa_rota'], 12);
    dress([76, 57, 105, 80], ['roca_puerto_0', 'roca_puerto_1', 'roca_puerto_2', 'boya_vieja', 'pilote_muelle', 'ancla_vieja', 'cuerda_enrollada'], 14);
  }

  // ---------- zonas y postales ----------
  const zones: MapZone[] = [];
  for (const z of ZONAS) {
    const [x0, y0, x1, y1] = z.rect;
    zones.push({ nombre: z.nombre, x: x0 * TILE, y: y0 * TILE, w: (x1 - x0) * TILE, h: (y1 - y0) * TILE, props: { musica: 'ninguna', descubrir: true, ...z.props, frente: z.frente.join(',') } });
  }
  zones.push({ nombre: 'El Patio de las Redes', x: 33 * TILE, y: 2 * TILE, w: 7 * TILE, h: 6 * TILE, props: { musica: 'ninguna', ambiente: 'puerto', luz: '#ffc070', oscuridad: 0.8, niebla: 0.3, particulas: 'ceniza', secreto: true, descubrir: true } });
  zones.push({ nombre: 'La Gruta del Ancla', x: 44 * TILE, y: 57 * TILE, w: 6 * TILE, h: 5 * TILE, props: { musica: 'ninguna', ambiente: 'agua', luz: '#8a5aff', oscuridad: 0.8, niebla: 0.4, particulas: 'brillos', secreto: true, descubrir: true } });
  const postales: Postal[] = [
    { nombre: 'muelle_de_llegada', x: T(13), y: T(17) },
    { nombre: 'calle_de_las_redes', x: T(34), y: T(15) },
    { nombre: 'mercado_hundido', x: T(57), y: T(18) },
    { nombre: 'iglesia_campana_ahogada', x: T(84), y: T(13) },
    { nombre: 'botes_volteados', x: T(85), y: T(46) },
    { nombre: 'astillero', x: T(17), y: T(48) },
    { nombre: 'cueva_de_las_medusas', x: T(47), y: T(72) },
    { nombre: 'el_faro', x: T(88), y: T(70) },
  ];

  const map: BigMap & { premium: PuertoReport } = {
    name: 'mundo4_puerto', w: W, h: H, terrain, solid, decos, entities, zones, postales, objects, quieta: d.still,
    marea: { baja: Uint8Array.from(d.tide, (v) => (v === 1 ? 1 : 0)), alta: Uint8Array.from(d.tide, (v) => (v === 2 ? 1 : 0)) },
    meta: { bioma: 'puerto', musica: 'ninguna', nombre: 'El Puerto Ahogado', agua: '#0a1a1a', aguaBrillo: PUERTO.brillo, espuma: '#3a6a62', fondo: MAR_PARALAJE.map((p, k) => ({ id: `fondo_mar_lejos_${k}`, paralaje: p })) },
    premium: {
      ramas: [
        { id: 'callejon', nombre: 'El callejón de la orilla', medio: [36, 21], tapar: [] },
        { id: 'pasarela', nombre: 'La pasarela del mercado hundido', medio: [57, 28], tapar: [[55, 28], [55, 29], [56, 28], [56, 29]] },
        { id: 'astillero_cueva', nombre: 'El astillero y la cueva (el atajo de vuelta)', medio: [28, 63], tapar: [[28, 63], [29, 63], [28, 64], [29, 64]] },
        { id: 'banco', nombre: 'El banco de arena de los botes', medio: [72, 47], tapar: [] },
      ],
      secretos: ['patio_redes', 'gruta_ancla'],
      pantallas: [],
    },
  };
  poblar(map, d, { solid, occ, bodies, place, byName, cellsOf, at, seed });
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

interface PoblarCtx {
  solid: Uint8Array; occ: Uint8Array; bodies: Set<number>;
  place: (s: string, x: number, y: number) => void;
  byName: Map<string, WorldObject>;
  cellsOf: (s: string, x: number, y: number) => number[];
  at: (x: number, y: number) => number;
  seed: number;
}

/** Calcomanías por tipo de piso */
const DECAL_PIEDRA = ['charco_puerto_0', 'charco_puerto_1', 'charco_puerto_2', 'ceniza_suelo_0', 'ceniza_suelo_1', 'escamas_conchas_0', 'tablas_sueltas_0', 'algas_0'];
const DECAL_ARENA = ['algas_0', 'algas_1', 'algas_2', 'escamas_conchas_0', 'escamas_conchas_1', 'piedras_mojadas_0', 'piedras_mojadas_1', 'piedras_mojadas_2', 'tablas_sueltas_1', 'ceniza_suelo_0'];

/**
 * Lo que va encima del mapa armado: calcomanías en cada pantalla (sin repetir la misma dos veces cerca) y la agenda
 * de lo que se ve en cada postal (para el control de calidad: ningún objeto repetido igual en una pantalla).
 */
function poblar(m: BigMap & { premium: PuertoReport }, d: Design, c: PoblarCtx) {
  const W = m.w, H = m.h;
  let s = c.seed >>> 0;
  const r = () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const used: { s: string; x: number; y: number }[] = [];
  const PWX = m.terrain.img.w;
  // calcomanías: un puñado por pantalla, en piso libre, lejos de otra igual
  for (let sy = 0; sy < H; sy += 6) for (let sx = 0; sx < W; sx += 8) {
    for (let k = 0; k < 4; k++) {
      for (let t = 0; t < 30; t++) {
        const tx = sx + Math.floor(r() * 8), ty = sy + Math.floor(r() * 6), i = c.at(tx, ty);
        if (i < 0 || c.solid[i] || d.dock[i] || d.tide[i] || d.t[i] === WATER) continue;
        if (Math.hypot(tx + 0.5 - ARENA_POZA.c[0], ty + 0.5 - ARENA_POZA.c[1]) < ARENA_POZA.anillo) continue;
        const px = tx * TILE + 4 + Math.floor(r() * 24), py = ty * TILE + 4 + Math.floor(r() * 24);
        const kd = m.terrain.kind[py * PWX + px];
        if (kd !== 1 && kd !== 2) continue;
        const pool = kd === 2 ? DECAL_PIEDRA : DECAL_ARENA;
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
  void c.place; void c.cellsOf; void c.bodies; void c.occ;
}
