import { TILE } from './tiles';
import { paintTerrain, distTo, inPoly, type TerrainDesign, type TerrainPalette, type TP } from './paint';
import { catedralObjects, CAT } from './catedralObjects';
import { forestObjects, type WorldObject } from './objects';
import { landmarkObjects } from './landmarks';
import type { BigMap, Deco, Ent, MapZone, Postal, Prop } from './bosqueMap';

/**
 * Mundo 2: La Catedral de las Raíces (PLAN.md F8). Debajo del bosque, una catedral atravesada por raíces.
 *
 * Es un interior: todo es muro y las salas se tallan (`rooms` del pintor). El muro de arriba de cada sala muestra su
 * cara de piedra. La escalera hundida es un descanso alto (meseta que se pisa) con escalones hacia el atrio.
 *
 * Esta primera entrega (la rebanada) trae la geometría de las seis zonas, pero solo están pobladas la escalera, el
 * atrio y la entrada de los claustros con el primer guardián. La nave y la forja quedan cerradas por raíces hasta la
 * próxima entrega.
 */

export const CATEDRAL_W = 80;
export const CATEDRAL_H = 64;

/** Lugares (en cuadros) de la catedral */
export const LC = {
  llegada: [15, 6] as TP,
  escalera: [16, 10] as TP,
  atrio: [18, 26] as TP,
  pozo: [9, 30] as TP,
  pedestal: [24, 22] as TP,
  pasoClaustro: [35, 25] as TP,
  claustro: [50, 22] as TP,
  guardian: [41, 22] as TP,
  nave: [22, 47] as TP,
  forja: [54, 46] as TP,
  campanario: [72, 52] as TP,
};

const rect = (x0: number, y0: number, x1: number, y1: number): TP[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

/** Las salas: el piso. Lo que no está acá es muro. */
const SALAS: TP[][] = [
  rect(6, 2.5, 26, 19), // la escalera hundida (arriba el descanso, abajo el pie)
  [[4, 18], [32, 18], [33, 22], [33, 30], [31, 35], [5, 35], [4, 30]], // el atrio
  rect(31, 22, 40, 28.5), // el paso al claustro
  rect(38, 9, 63, 35), // el claustro (con el bloque del jardín en el medio)
  rect(15.5, 34, 22.5, 39), // el paso a la nave
  rect(5, 38, 41, 57), // la nave inundada
  rect(40, 43, 45, 49), // de la nave a la forja
  rect(48, 34, 52, 39), // el atajo del claustro a la forja
  rect(44, 37.5, 64, 55), // la forja
  rect(63, 45, 67, 49), // de la forja al campanario
  rect(65, 40, 79, 62), // el campanario
];

/** Descansos altos que se pisan (el resto de las mesetas es muro). Van primero en `plateaus`. */
const DESCANSOS: TP[][] = [rect(6, 2.5, 26, 9.4)];
/** Bloques de muro dentro de una sala */
const BLOQUES: TP[][] = [rect(44.5, 15, 56.5, 28.5)];

export const catedralDesign: TerrainDesign = {
  w: CATEDRAL_W, h: CATEDRAL_H, seed: 777,
  rooms: SALAS,
  plateaus: [...DESCANSOS, ...BLOQUES],
  stairs: [{ x: 16, y: 9.4, w: 4 }],
  rivers: [],
  lakes: [
    { c: LC.pozo, rx: 3, ry: 1.8 }, // agua quieta del atrio
    { c: [16, 48], rx: 9, ry: 6 }, { c: [31, 46], rx: 7, ry: 7 }, // la nave inundada
  ],
  roads: [],
  // losas en casi todo el piso: donde faltan se ve la tierra con raíces
  plazas: [rect(6.5, 3, 25.5, 9), rect(6.5, 10.5, 25.5, 18.5), [[5, 19], [31, 19], [32, 30], [30, 34], [6, 34], [5, 30]], rect(31.5, 22.6, 39.5, 27.8), rect(38.5, 9.6, 62.5, 34.5), rect(44.5, 38, 63.5, 54.5)],
  arenas: [{ c: LC.campanario, r: 6 }],
  meadows: [],
  dark: [{ c: [22, 48], r: 18 }, { c: [72, 52], r: 10 }],
};

/** Piedra azul grisácea, tierra oscura, cobre viejo y agua casi negra. Turquesa en los brotes, violeta en las runas. */
export const CATEDRAL_PALETTE: TerrainPalette = {
  grass: ['#101218', '#151820', '#1a1e26', '#20242d', '#262b34', '#2c313b', '#323843', '#39404b', '#404753', '#474f5b', '#4f5763', '#575f6b'],
  dirt: ['#1e1a18', '#262120', '#2e2826', '#37302c', '#403833', '#4a413a'],
  cobble: ['#232836', '#2c3242', '#363d4e', '#41495a', '#4e5668', '#5e6678'],
  sandstone: ['#1f2624', '#27302d', '#303a36', '#3a4540', '#45514b', '#526058'],
  bluestone: ['#1f2533', '#283040', '#323b4c', '#3e4859', '#4b5667', '#5b6677'],
  rock: ['#0c0d13', '#12141c', '#191c26', '#212532', '#2a2f3e', '#343a4b', '#40475a'],
  flowers: ['#3fa89a', '#2f8a80', '#5ac8b8', '#3a7a8a', '#6a4a9a', '#4a8a7a'],
  leaves: ['#3a281c', '#2c1e14', '#4a3424', '#221810'],
  shore: ['#5a6a78', '#3a4a58', '#1e2c38', '#010306'],
  wetEarth: ['#14120f', '#1a1714'],
  edgeDark: '#05060a',
  holeDark: '#0a0b0e',
  runes: ['#2a1438', '#5a2a8a', '#1a0e24', '#3a1e4e'],
  pebbles: ['#5a6070', '#6a7080', '#707888', '#555b68'],
  flowerHeart: '#8affe8',
  slabs: { w: 40, h: 24 },
};

/** El agua de la catedral: casi negra */
export const AGUA_CATEDRAL = '#0a141c';

function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function hash(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Los objetos que usa la catedral: los suyos y unos pocos del bosque (cartel, juncos). */
export function catedralMapObjects(): WorldObject[] {
  const prestados = new Set(['cartel', 'portal_azul', 'portal_rojo', 'aviso_jefe', 'aviso_carga']);
  return [...catedralObjects(), ...[...forestObjects(), ...landmarkObjects()].filter((o) => prestados.has(o.name))];
}

export function catedralMap(seed = 777): BigMap {
  const W = CATEDRAL_W, H = CATEDRAL_H, r = rng(seed);
  const terrain = paintTerrain(catedralDesign, CATEDRAL_PALETTE);
  const objects = catedralMapObjects();
  const byName = new Map(objects.map((o) => [o.name, o]));
  const img = terrain.img, PW = img.w, PH = img.h;

  // ---- los muros: la parte alta que no es descanso no se pisa, y su techo es oscuridad ----
  const enDescanso = (px: number, py: number) => DESCANSOS.some((d) => inPoly(px / TILE, py / TILE, d));
  const low = new Uint8Array(PW * PH);
  for (let i = 0; i < low.length; i++) low[i] = terrain.high[i] ? 0 : 1;
  const dLow = distTo(low, PW, PH);
  const pinta = (i: number, hex: string) => { const k = i * 4; img.data[k] = parseInt(hex.slice(1, 3), 16); img.data[k + 1] = parseInt(hex.slice(3, 5), 16); img.data[k + 2] = parseInt(hex.slice(5, 7), 16); img.data[k + 3] = 255; };
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
    const i = y * PW + x;
    if (!terrain.high[i] || enDescanso(x, y)) continue;
    const dl = dLow[i];
    // canto del muro (se lee la obra), después techo negro con un poco de textura de piedra
    if (dl <= 1) pinta(i, '#05060a');
    else if (dl <= 3) pinta(i, CAT.piedraOscura);
    else if (dl <= 5) pinta(i, '#232836');
    else pinta(i, hash(x >> 2, y >> 2, 9) > 0.9 ? '#0c0e14' : '#07080c');
  }
  // el descanso: canto oscuro donde se junta con el muro (para que no parezca que sigue)
  for (let y = 1; y < PH - 1; y++) for (let x = 1; x < PW - 1; x++) {
    const i = y * PW + x;
    if (!terrain.high[i] || !enDescanso(x, y)) continue;
    const vecinoMuro = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => terrain.high[i + dy * PW + dx] && !enDescanso(x + dx, y + dy));
    if (vecinoMuro) pinta(i, '#05060a');
  }

  const solid = new Uint8Array(terrain.solid);
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    if (!terrain.tileHigh[ty * W + tx]) continue;
    if (!DESCANSOS.some((d) => inPoly(tx + 0.5, ty + 0.5, d))) solid[ty * W + tx] = 1;
  }

  const occ = new Uint8Array(W * H);
  const decos: Deco[] = [], entities: Ent[] = [];
  const T = (t: number) => t * TILE + TILE / 2;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : y * W + x);
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

  // borde del mapa: nunca se sale
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) solid[at(x, y)] = 1;

  // ---------- 1. la escalera hundida ----------
  const [lx, ly] = LC.llegada;
  // el portal azul por el que se llega del Bosque: tocarlo lleva de vuelta
  entities.push({ tipo: 'portal_llegada', x: T(lx - 5), y: T(ly), props: { color: 'azul' } });
  entities.push({ tipo: 'portal_volver', x: T(lx - 5), y: T(ly + 1), props: { destino: 'mundo1' } });
  reserve(lx - 5, ly, 1);
  entities.push({ tipo: 'jugador_inicio', x: T(lx), y: T(ly + 1) });
  entities.push({ tipo: 'thor_inicio', x: T(lx - 1), y: T(ly + 1) });
  occ[at(lx, ly + 1)] = 1; occ[at(lx - 1, ly + 1)] = 1;
  // la luz de afuera entra por arriba de la escalera y se apaga hacia abajo
  place('haz_luz', T(LC.escalera[0]), T(LC.escalera[1] + 3));
  // columnas a los lados del descanso y raíces sobre el muro de arriba
  for (const [x, y] of [[8, 5], [24, 5]] as TP[]) placeT('columna_raiz', x, y);
  for (const x of [9, 15, 21]) place('raices_muro', T(x), 2.5 * TILE + 60);
  for (const [x, y] of [[8, 16], [24, 16]] as TP[]) placeT(r() < 0.5 ? 'columna_rota' : 'columna_raiz', x, y);
  for (const x of [8, 23]) place('raices_muro', T(x), 10.3 * TILE + 60);

  // ---------- 2. el atrio de las luciérnagas: el primer refugio ----------
  const [ax, ay] = LC.atrio;
  // el refugio: el brasero de cobre encendido es la fogata de guardado (y la tienda)
  place('brasero_cobre', T(ax), ay * TILE + 28);
  entities.push({ tipo: 'punto_guardado', x: T(ax), y: T(ay + 1), props: { id: 'atrio', nombre: 'Atrio de las Luciérnagas' } });
  reserve(ax, ay, 2);
  // la misión sin palabras: el pedestal con las tres brasas vacías
  placeT('pedestal_brasas_0', LC.pedestal[0], LC.pedestal[1]);
  entities.push({ tipo: 'pedestal_brasas', x: T(LC.pedestal[0]), y: T(LC.pedestal[1] + 1), props: { brasas: 3 } });
  reserve(LC.pedestal[0], LC.pedestal[1], 1);
  // dos filas de columnas guían hacia el claustro (la luz turquesa del atrio sale de las luciérnagas)
  for (const x of [8, 13, 23, 28]) { placeT('columna_raiz', x, 20); placeT(x === 13 ? 'columna_rota' : 'columna_raiz', x, 33); }
  // un cofre de bienvenida junto al agua
  chest(LC.pozo[0] + 4, LC.pozo[1] - 2, 'madera');
  // braseros apagados: se prenden con las brasas (próxima entrega)
  for (const [x, y] of [[6, 21], [30, 21]] as TP[]) placeT('brasero_apagado', x, y);

  // ---------- 3. el paso y la entrada de los claustros: el primer guardián ----------
  place('arco_roto', T(LC.pasoClaustro[0]), 28 * TILE + 10);
  for (const x of [33, 38]) place('raices_muro', T(x), 22 * TILE + 60);
  // el guardián de cobre: pesado y lento, avisa su golpe (hay que mirarlo y salirse)
  ent('enemigo', LC.guardian[0], LC.guardian[1], { enemigo: 'guardian_cobre', nombre: 'Guardián de Cobre' });
  // la recompensa del encuentro
  chest(42, 31, 'reforzado');
  // columnas rotas a lo largo del claustro
  for (const [x, y] of [[40, 12], [60, 12], [60, 32], [40, 33]] as TP[]) placeT('columna_rota', x, y);
  for (const [x, y] of [[42, 14], [58, 14]] as TP[]) placeT('brasero_apagado', x, y);

  // ---------- lo que todavía no se abre: raíces gruesas cierran la nave y el atajo ----------
  place('raices_cortina', T(19), 36 * TILE + 26);
  for (let x = 16; x <= 22; x++) solid[at(x, 36)] = 1;
  place('raices_cortina', T(50), 36 * TILE + 26);
  for (let x = 48; x <= 51; x++) solid[at(x, 36)] = 1;

  // ---------- zonas y postales ----------
  const zones: MapZone[] = [];
  const zone = (nombre: string, x0: number, y0: number, x1: number, y1: number, props: Record<string, Prop>) =>
    zones.push({ nombre, x: x0 * TILE, y: y0 * TILE, w: (x1 - x0) * TILE, h: (y1 - y0) * TILE, props: { musica: 'catedral', ambiente: 'catedral', descubrir: true, ...props } });
  zone('La Escalera Hundida', 5, 2, 27, 18, { luz: '#dfe8ff', oscuridad: 0.25, particulas: 'polvo', niebla: 0.2 });
  zone('El Atrio de las Luciérnagas', 4, 18, 33, 36, { luz: '#8affe8', oscuridad: 0.4, particulas: 'luciernagas_turquesa,gotas', niebla: 0.35 });
  zone('Los Claustros Quebrados', 31, 9, 64, 36, { luz: '#9aa8c8', oscuridad: 0.5, particulas: 'polvo,gotas', niebla: 0.4 });
  const postales: Postal[] = [
    { nombre: 'escalera_hundida', x: T(LC.escalera[0]), y: T(LC.escalera[1]) },
    { nombre: 'atrio_luciernagas', x: T(ax - 2), y: T(ay - 1) },
    { nombre: 'claustros_quebrados', x: T(LC.guardian[0] + 2), y: T(LC.guardian[1]) },
  ];
  return {
    name: 'mundo2_catedral', w: W, h: H, terrain, solid, decos, entities, zones, postales, objects,
    meta: { bioma: 'catedral', musica: 'catedral', nombre: 'La Catedral de las Raíces', agua: AGUA_CATEDRAL },
  };
}
