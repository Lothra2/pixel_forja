import { TILE } from './tiles';
import { paintTerrain, distTo, inPoly, type TerrainDesign, type TerrainPalette, type TP } from './paint';
import { catedralObjects, CAT } from './catedralObjects';
import { forestObjects, type WorldObject } from './objects';
import { landmarkObjects } from './landmarks';
import type { BigMap, Deco, Ent, MapZone, Postal, Prop } from './bosqueMap';
import { catedralPremiumObjects } from './catedralPremium';
import { premiumCatedral, type CatedralReport } from './premium/catedral';

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
  rect(62.5, 20.5, 64.5, 25), // la rendija hacia la capilla
  rect(64, 18.5, 70, 26), // la capilla escondida (el secreto de Thor)
  rect(15.5, 34, 22.5, 39), // el paso a la nave
  rect(5, 38, 41, 57), // la nave inundada
  rect(40, 50, 45, 55), // de la nave a la forja (por la orilla de abajo)
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
  // la nave inundada: un río de agua casi negra la cruza de lado a lado; se pasa por el puente o saltando las losas
  rivers: [{ pts: [[3, 46.5], [14, 46], [27, 46.8], [43, 46.2]], w: 4.6 }],
  lakes: [
    { c: LC.pozo, rx: 3, ry: 1.8 }, // agua quieta del atrio
  ],
  roads: [],
  // losas en casi todo el piso: donde faltan se ve la tierra con raíces
  plazas: [rect(6.5, 3, 25.5, 9), rect(6.5, 10.5, 25.5, 18.5), [[5, 19], [31, 19], [32, 30], [30, 34], [6, 34], [5, 30]], rect(31.5, 22.6, 39.5, 27.8), rect(38.5, 9.6, 62.5, 34.5), rect(44.5, 38, 63.5, 54.5), rect(5.5, 38.5, 40.5, 56.5), rect(64.3, 19, 69.7, 25.5)],
  arenas: [{ c: LC.campanario, r: 6 }],
  meadows: [],
  dark: [{ c: [22, 48], r: 18 }, { c: [72, 52], r: 10 }],
};

/**
 * La nave premium tiene dos alturas: una galería alta al este (con su desnivel de piedra labrada, baranda y escalones
 * rotos) y el piso de abajo con el río, que se corre un poco al sur para dejar orilla debajo de la galería.
 */
const GALERIA: TP[] = rect(27, 38, 41, 41.2);
export const catedralDesignPremium: TerrainDesign = {
  ...catedralDesign,
  plateaus: [...DESCANSOS, GALERIA, ...BLOQUES],
  stairs: [...catedralDesign.stairs, { x: 33.5, y: 41.2, w: 3 }],
  rivers: [{ pts: [[3, 48], [14, 47.5], [27, 48.3], [43, 47.7]], w: 4.6 }],
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
  return [...catedralObjects(), ...catedralPremiumObjects(), ...[...forestObjects(), ...landmarkObjects()].filter((o) => prestados.has(o.name))];
}

export function catedralMap(seed = 777, opts: { premium?: boolean } = {}): BigMap & { premium?: CatedralReport } {
  const premium = opts.premium !== false;
  const W = CATEDRAL_W, H = CATEDRAL_H, r = rng(seed);
  const design = premium ? catedralDesignPremium : catedralDesign;
  const descansos = premium ? [...DESCANSOS, GALERIA] : DESCANSOS;
  const terrain = paintTerrain(design, CATEDRAL_PALETTE);
  const objects = catedralMapObjects();
  const byName = new Map(objects.map((o) => [o.name, o]));
  const img = terrain.img, PW = img.w, PH = img.h;

  // ---- los muros: la parte alta que no es descanso no se pisa, y su techo es oscuridad ----
  const enDescanso = (px: number, py: number) => descansos.some((d) => inPoly(px / TILE, py / TILE, d));
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
    if (!descansos.some((d) => inPoly(tx + 0.5, ty + 0.5, d))) solid[ty * W + tx] = 1;
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
  /** un brasero que se prende cuando vuelven `requiere` brasas: lo dibuja el juego (apagado o encendido) */
  const braseroBrasa = (tx: number, ty: number, requiere: number) => {
    entities.push({ tipo: 'brasero_brasa', x: T(tx), y: ty * TILE + TILE - 4, props: { requiere } });
    solid[at(tx, ty)] = 1; occ[at(tx, ty)] = 1;
  };
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
  // el juego lo dibuja con las brasas que ya volvieron (pedestal_brasas_0 a _3)
  entities.push({ tipo: 'pedestal_brasas', x: T(LC.pedestal[0]), y: LC.pedestal[1] * TILE + TILE - 4, props: { brasas: 3 } });
  solid[at(LC.pedestal[0], LC.pedestal[1])] = 1; solid[at(LC.pedestal[0] - 1, LC.pedestal[1])] = 1;
  reserve(LC.pedestal[0], LC.pedestal[1], 1);
  // dos filas de columnas guían hacia el claustro (la luz turquesa del atrio sale de las luciérnagas)
  for (const x of [8, 13, 23, 28]) { placeT('columna_raiz', x, 20); placeT(x === 13 ? 'columna_rota' : 'columna_raiz', x, 33); }
  // un cofre de bienvenida junto al agua
  chest(LC.pozo[0] + 4, LC.pozo[1] - 2, 'madera');
  // braseros apagados: se prenden con las brasas (próxima entrega)
  // los braseros del atrio se prenden con la primera brasa
  for (const [x, y] of [[6, 21], [30, 21]] as TP[]) braseroBrasa(x, y, 1);

  // ---------- 3. el paso y la entrada de los claustros: el primer guardián ----------
  place('arco_roto', T(LC.pasoClaustro[0]), 28 * TILE + 10);
  for (const x of [33, 38]) place('raices_muro', T(x), 22 * TILE + 60);
  // el guardián de cobre: pesado y lento, avisa su golpe (hay que mirarlo y salirse)
  ent('enemigo', LC.guardian[0], LC.guardian[1], { enemigo: 'guardian_cobre', nombre: 'Guardián de Cobre' });
  // la recompensa del encuentro
  chest(42, 31, 'reforzado');
  // columnas rotas a lo largo del claustro
  for (const [x, y] of [[40, 12], [60, 12], [60, 32], [40, 33]] as TP[]) placeT('columna_rota', x, y);
  // los del claustro con la segunda
  for (const [x, y] of [[42, 14], [58, 14]] as TP[]) braseroBrasa(x, y, 2);
  // una brasa en el pasillo de arriba del claustro
  entities.push({ tipo: 'brasa', x: T(51), y: T(11), props: { id: 'claustro' } }); occ[at(51, 11)] = 1;

  // ---------- 3b. el resto del claustro: raicitas que Thor distrae y la capilla escondida ----------
  // tres raicitas en el pasillo del este: saltan de un lado a otro y si Thor anda cerca lo persiguen a él
  for (const [x, y] of [[59, 18], [60, 23], [58, 28]] as TP[]) ent('enemigo', x, y, { enemigo: 'raicita', nombre: 'Raicita' });
  // la rendija de la capilla: raíces en el muro la disimulan, Thor la huele
  place('raices_muro', T(63), 20.5 * TILE + 60);
  chest(67, 22, 'dorado', { secreto: true, pista: 'capilla_escondida' });
  braseroBrasa(65, 20, 2);
  placeT('columna_rota', 69, 25);

  // ---------- 4. la nave inundada ----------
  // la orilla de arriba: se ve el agua negra antes de tocarla
  // (en la premium la galería ocupa el norte del este: ahí no van la columna ni las raíces del muro)
  for (const [x, y] of [[8, 41], [33, 41], [8, 55], [33, 55]] as TP[]) if (!premium || x < 27 || y > 45) placeT('columna_raiz', x, y);
  for (const x of [10, 22, 34]) if (!premium || x < 27) place('raices_muro', T(x), 38 * TILE + 60);
  // dónde cruza el río cada columna
  const cruce = (tx: number): [number, number] => {
    let y0 = 40, y1 = 40
    while (y0 < 56 && !isWaterT(tx, y0)) y0++
    y1 = y0
    while (y1 < 56 && isWaterT(tx, y1 + 1)) y1++
    return [y0, y1]
  };
  // el puente seguro (al oeste): se camina por encima
  {
    const tx = 11, [y0, y1] = cruce(tx);
    place('puente_piedra', T(tx), ((y0 + y1 + 1) / 2) * TILE);
    for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = tx - 1; x <= tx; x++) { solid[at(x, y)] = 0; occ[at(x, y)] = 1; }
  }
  // el vado de losas hundidas (al este): pisar fuera de las losas es caer al agua. Es seguro: Thor la saca a la orilla
  // y no se pierde nada. Se enseña acá, sin enemigos cerca, antes del vigía.
  {
    const tx = 25, [y0, y1] = cruce(tx);
    for (let y = y0; y <= y1; y++) {
      place(`losa_hundida_${y % 2}`, T(tx), y * TILE + 22);
      solid[at(tx, y)] = 0; occ[at(tx, y)] = 1;
      // a los lados de las losas el agua también se pisa, pero es agua: ahí se cae
      for (const dx of [-1, 1]) { solid[at(tx + dx, y)] = 0; occ[at(tx + dx, y)] = 1; entities.push({ tipo: 'peligro_agua', x: T(tx + dx), y: T(y) }); }
    }
    for (const y of [y0 - 1, y1 + 1]) { solid[at(tx, y)] = 0; occ[at(tx, y)] = 1; }
  }
  // el vigía de las raíces en la orilla de abajo: se queda quieto y tira bolas violetas que se ven venir
  ent('enemigo', 34, 51, { enemigo: 'vigia_raices', nombre: 'Vigía de las Raíces' });
  ent('enemigo', 15, 52, { enemigo: 'raicita', nombre: 'Raicita' });
  // la recompensa de la nave y un brasero apagado para la próxima entrega
  chest(7, 53, 'reforzado');
  braseroBrasa(21, 54, 1);
  // la brasa de la nave: en la orilla de abajo, cuidada por el vigía
  entities.push({ tipo: 'brasa', x: T(30), y: T(54), props: { id: 'nave' } }); occ[at(30, 54)] = 1;

  // ---------- 5. la forja apagada: el centro ----------
  // la forja (la dibuja el juego según las brasas: forja_0 a forja_3) y su lugar sólido
  entities.push({ tipo: 'forja', x: T(LC.forja[0]), y: LC.forja[1] * TILE + TILE - 6 });
  for (let y = LC.forja[1] - 1; y <= LC.forja[1]; y++) for (let x = LC.forja[0] - 2; x <= LC.forja[0] + 2; x++) { solid[at(x, y)] = 1; occ[at(x, y)] = 1; }
  reserve(LC.forja[0], LC.forja[1] + 1, 1);
  for (const [x, y] of [[46, 40], [62, 40], [46, 53], [62, 53]] as TP[]) braseroBrasa(x, y, 3);
  for (const [x, y] of [[48, 47], [60, 47]] as TP[]) placeT('columna_raiz', x, y);
  for (const x of [48, 56]) place('raices_muro', T(x), 37.5 * TILE + 60);
  // la tercera brasa está en la forja misma, en el rincón de abajo
  entities.push({ tipo: 'brasa', x: T(61), y: T(51), props: { id: 'forja' } }); occ[at(61, 51)] = 1;
  chest(46, 50, 'dorado');

  // ---------- 6. el campanario invertido: la arena del Guardián de la Campana ----------
  {
    const [cx, cy] = LC.campanario;
    entities.push({ tipo: 'arena_jefe', x: T(cx), y: T(cy), props: { radio: 5.5 * TILE } });
    entities.push({ tipo: 'jefe', x: T(cx), y: T(cy - 1), props: { enemigo: 'guardian_campana', nombre: 'Guardián de la Campana', titulo: 'Guardián de la Catedral' } });
    // la campana cuelga sobre la arena (el juego la cambia por la libre cuando el guardián se libera)
    entities.push({ tipo: 'campana', x: T(cx), y: T(cy - 5) });
    // la bajada todavía más honda: aparece al ganar (el kit no trae el mundo 3, el juego muestra Continuará)
    entities.push({ tipo: 'portal_jefe', x: T(cx), y: T(cy + 7), props: { color: 'rojo', destino: 'mundo3' } });
    chest(cx + 4, cy + 7, 'dorado', { tras_jefe: true });
    for (const [x, y] of [[67, 42], [77, 42], [67, 60], [77, 60]] as TP[]) braseroBrasa(x, y, 3);
    for (const x of [68, 76]) place('raices_muro', T(x), 40 * TILE + 60);
  }

  // ---------- las compuertas de raíces: se abren cuando vuelven las brasas (las dibuja y las cierra el juego) ----------
  // con 1 brasa la de la nave a la forja, con 2 el atajo del claustro y con 3 la del campanario
  const compuerta = (id: string, requiere: number, ax0: number, ay0: number, ax1: number, ay1: number) => {
    // se ajusta a los cuadros que se pisan de verdad (sin la cara del muro ni las paredes de los costados)
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = ay0; y <= ay1; y++) for (let x = ax0; x <= ax1; x++) if (!solid[at(x, y)]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    if (x1 < 0) throw new Error(`la compuerta ${id} no cubre ningún cuadro libre`);
    entities.push({ tipo: 'compuerta_raices', x: T((x0 + x1) / 2), y: (y1 + 1) * TILE - 6, props: { id, requiere, x0, y0, x1, y1 } });
  };
  compuerta('nave_forja', 1, 42, 50, 43, 54);
  compuerta('atajo', 2, 48, 36, 51, 36);
  compuerta('campanario', 3, 64, 45, 65, 49);

  // ---------- zonas y postales ----------
  const zones: MapZone[] = [];
  const zone = (nombre: string, x0: number, y0: number, x1: number, y1: number, props: Record<string, Prop>) =>
    zones.push({ nombre, x: x0 * TILE, y: y0 * TILE, w: (x1 - x0) * TILE, h: (y1 - y0) * TILE, props: { musica: 'catedral', ambiente: 'catedral', descubrir: true, ...props } });
  zone('La Escalera Hundida', 5, 2, 27, 18, { luz: '#dfe8ff', oscuridad: 0.25, particulas: 'polvo', niebla: 0.12 });
  zone('El Atrio de las Luciérnagas', 4, 18, 33, 36, { luz: '#8affe8', oscuridad: 0.45, particulas: 'luciernagas_turquesa,gotas', niebla: 0.15 });
  zone('Los Claustros Quebrados', 31, 9, 64, 36, { luz: '#9aa8c8', oscuridad: 0.5, particulas: 'polvo,gotas', niebla: 0.18 });
  zone('La Capilla Escondida', 64, 18, 70, 26, { luz: '#8affe8', oscuridad: 0.5, particulas: 'luciernagas_turquesa', niebla: 0.1, secreto: true });
  zone('La Nave Inundada', 5, 36, 41, 57, { luz: '#7a9ab8', oscuridad: 0.6, particulas: 'gotas', niebla: 0.2 });
  zone('La Forja Apagada', 43, 37, 64, 56, { luz: '#ffcf9a', oscuridad: 0.6, particulas: 'polvo', niebla: 0.15 });
  zone('El Campanario Invertido', 65, 39, 79, 63, { musica: 'jefe', luz: '#b08aff', oscuridad: 0.7, particulas: 'esporas,gotas', niebla: 0.2 });
  const postales: Postal[] = [
    { nombre: 'escalera_hundida', x: T(LC.escalera[0]), y: T(LC.escalera[1]) },
    { nombre: 'atrio_luciernagas', x: T(ax - 2), y: T(ay - 1) },
    { nombre: 'claustros_quebrados', x: T(LC.guardian[0] + 2), y: T(LC.guardian[1]) },
    { nombre: 'capilla_escondida', x: T(66), y: T(22) },
    { nombre: 'nave_inundada', x: T(22), y: T(47) },
    { nombre: 'forja_apagada', x: T(LC.forja[0]), y: T(LC.forja[1] + 1) },
    { nombre: 'campanario_invertido', x: T(LC.campanario[0]), y: T(LC.campanario[1] - 1) },
  ];
  // agua quieta: el pozo del atrio (el río de la nave corre)
  const quieta = new Uint8Array(W * H);
  for (const l of design.lakes) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.hypot((x + 0.5 - l.c[0]) / (l.rx + 1), (y + 0.5 - l.c[1]) / (l.ry + 1)) < 1) quieta[at(x, y)] = 1;
  const map: BigMap & { premium?: CatedralReport } = {
    name: 'mundo2_catedral', w: W, h: H, terrain, solid, decos, entities, zones, postales, objects, quieta,
    meta: { bioma: 'catedral', musica: 'catedral', nombre: 'La Catedral de las Raíces', agua: AGUA_CATEDRAL },
  };
  if (premium) {
    // la galería de la nave: los escalones rotos tapan la escalera que pintó el pintor
    decos.push({ sprite: 'escalones_rotos', x: Math.round(33.5 * TILE), y: Math.round(41.2 * TILE) + 62 });
    const darkAt = (tx: number, ty: number) => design.dark.reduce((mx, z) => Math.max(mx, 1 - Math.hypot(tx - z.c[0], ty - z.c[1]) / z.r), 0);
    map.premium = premiumCatedral(map, { descansos, seed: seed + 11, darkAt });
  }
  return map;
}
