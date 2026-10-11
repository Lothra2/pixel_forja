import { createRaster, type Raster } from '../core/raster';
import { over } from '../loot/canvas';
import { TILE } from './tiles';
import { paintTerrain, waterTile, chunks, forestFloor, type PaintedTerrain, type TP } from './paint';
import { floraV3, gloomGrade } from './flora';
import { cobweb } from './atmosphere';
import { bosqueDesign, LUGARES as L, BOSQUE_W, BOSQUE_H } from './bosque';
import { forestObjects, type WorldObject } from './objects';
import { landmarkObjects, fittedWaterfall, type WaterfallCol } from './landmarks';
import { treesPremium } from './premium/trees';
import { withShadow, drawShadow } from './premium/shadow';
import { forestDecals, forestGroups, forestFront } from './premium/details';
import { premiumWorld, type PremiumZone, type ZoneReport, type WorldPass, type WorldReport } from './premium/zone';

/**
 * El Bosque GG armado: terreno pintado + lugares + bosque lleno + enemigos, cofres (varios secretos), fogatas de guardado,
 * zonas con nombre (para "¡Descubriste...!", música, sonido de ambiente, luz y partículas) y postales para la cámara.
 * Sale en formato Tiled: el suelo como capas de imagen en trozos, el agua animada como cuadros debajo y la colisión por cuadro.
 */

export type Prop = string | number | boolean;
export interface Deco { sprite: string; x: number; y: number }
export interface Ent { tipo: string; x: number; y: number; props?: Record<string, Prop> }
export interface MapZone { nombre: string; x: number; y: number; w: number; h: number; props: Record<string, Prop> }
export interface Postal { nombre: string; x: number; y: number }

export interface BigMap {
  name: string;
  w: number;
  h: number;
  terrain: PaintedTerrain;
  /** 1 = no se pasa (terreno + objetos) */
  solid: Uint8Array;
  decos: Deco[];
  entities: Ent[];
  zones: MapZone[];
  postales: Postal[];
  objects: WorldObject[];
  /** datos del mundo para Tiled y el agua (el Bosque no los trae: usa los de siempre) */
  meta?: { bioma: string; musica: string; nombre: string; agua?: string; fondo?: { id: string; paralaje: number }[] };
  /** cuadros que el diseño deja libres (claros de los lugares, puentes, vado, camino secreto): ahí no se planta nada */
  libre?: Uint8Array;
  /** cuánto bosque quiere el diseño en cada cuadro (menos de 0 nada, 1 o más bosque cerrado) */
  densidad?: Float32Array;
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Todos los objetos que usa el mundo grande. */
export function bosqueObjects(): WorldObject[] {
  // los objetos de la paleta vieja pasan por la corrección sombría; la flora v3 ya viene sombría
  const graded = [...forestObjects(), ...landmarkObjects()].map((o) => ({
    ...o, anims: Object.fromEntries(Object.entries(o.anims).map(([k, a]) => [k, { ...a, frames: a.frames.map((f) => gloomGrade(f)) }])),
  }));
  const web: WorldObject = { name: 'telarana', w: 40, h: 36, anchor: [6, 35], solid: null, anims: { idle: { frames: [cobweb()], fps: 1, loop: true } } };
  const base = [...graded, ...floraV3(), web];
  // premium (piloto del Bosque Profundo): árboles por tamaño y forma, grupos armados, calcomanías y primer plano.
  // Los que se paran en el piso traen su sombra horneada
  const byName = new Map(base.map((o) => [o.name, o]));
  const premium = [
    ...treesPremium().map((t) => withShadow(t)),
    ...forestGroups(byName).map((g) => withShadow(g, { length: 0.5, drop: 0.25 })),
    // lo de la paleta vieja que usa el mundo premium, con su sombra horneada (`_p`). El original queda en el kit
    // por si otro mundo lo usa
    ...PREMIUM_COPIES.map((n) => { const o = byName.get(n)!; return withShadow({ ...o, name: `${n}_p`, base: n }, n.startsWith('arbusto') || n === 'helecho' || n === 'hongos' || n.startsWith('roca') ? { length: 0.5, drop: 0.25 } : {}); }),
    ...forestDecals(), ...forestFront(),
  ];
  return [...base, ...premium];
}

/** Objetos de siempre que el mundo premium usa con sombra horneada. */
const PREMIUM_COPIES = ['hongo_gigante_azul', 'hongo_gigante_morado', 'arbol_hechizado_0', 'arbol_hechizado_1', 'arbol_hechizado_2', 'arbol_seco_0', 'arbol_seco_1', 'tronco_caido', 'arbusto_verde_0', 'arbusto_verde_1', 'arbusto_moras_0', 'arbusto_espinas_0', 'hongos', 'roca', 'roca_grande', 'sauce_v3', 'roble_otono_1', 'tocon', 'tocon_hongos'];

/** El piloto premium: el Bosque Profundo con meseta, rampa, árboles variados, puntos focales y primer plano. */
export const ZONA_PILOTO: Omit<PremiumZone, 'darkAt'> = {
  nombre: 'Bosque Profundo',
  rect: [2, 29, 30, 47],
  // meseta al noreste del sendero, con su rampa de tierra en la punta suroeste
  plateaus: [[[19.5, 29.6], [28.5, 29.6], [29.6, 33.5], [27.5, 36.2], [23.5, 35.4], [19.6, 33.4]]],
  ramps: [{ x: 21.6, y: 34.1, w: 2.4 }],
  seed: 3407,
  // se quedan los carteles, fogatas, juncos y lugares que no son vegetación; lo demás se vuelve a colocar
  keep: (s) => !/^(pino_|roble_|arbol_|arbusto_|roca|tocon|hongos|hongo_gigante|tronco_caido|telarana|helecho)/.test(s),
  // pocos y repartidos: un lugar se nota cuando no compite con otro igual al lado
  landmarks: [
    { sprite: 'arbol_hechizado_2_p', n: 1 }, { sprite: 'arbol_hechizado_1_p', n: 1 },
    { sprite: 'hongo_gigante_azul_p', n: 2 }, { sprite: 'hongo_gigante_morado_p', n: 1 },
    { sprite: 'arbol_seco_0_p', n: 1 },
  ],
  // monte bajo (la lista pesa: más helechos y arbustos, pocos hongos; las piedras van en los grupos)
  undergrowth: ['arbusto_verde_0_p', 'arbusto_verde_1_p', 'arbusto_moras_0_p', 'helecho', 'helecho', 'arbusto_verde_0_p', 'helecho', 'arbusto_verde_1_p', 'helecho', 'hongos_p'],
  frente: ['frente_ramas_0', 'frente_ramas_1', 'frente_hojas_0'],
};

/** El resto del Bosque: misma receta para todo lo que no es el piloto. */
export const BOSQUE_PREMIUM: Omit<WorldPass, 'darkAt'> = {
  seed: 5113,
  vegetation: /^(pino_\d|roble_\d|roble_grande|roble_otono|arbol_hechizado|arbol_seco|sauce_v3|arbusto_|hongos$|hongo_gigante|tocon|roca$|roca_grande|telarana|tronco_caido)/,
  // lo que el diseño puso con intención (y los descubrimientos de las praderas) se muda cerca, no se pierde
  relocate: /^(arbol_hechizado|arbol_seco|sauce_v3|roble_otono|hongo_gigante|tocon|roca$|roca_grande|tronco_caido)/,
  stay: /^arbusto_espinas/,
  undergrowth: ['arbusto_verde_0_p', 'arbusto_verde_1_p', 'arbusto_moras_0_p', 'helecho', 'helecho', 'arbusto_verde_0_p', 'helecho', 'arbusto_verde_1_p', 'helecho', 'hongos_p'],
  frente: { 'Claro Escondido': ['frente_ramas_2', 'frente_hojas_1'], 'Anillo de las Hadas': ['frente_hojas_0', 'frente_hojas_1'] },
};

export function bosqueMap(seed = 2024, opts: { premium?: boolean } = {}): BigMap & { piloto?: ZoneReport; mundo?: WorldReport } {
  const m = bosqueMapBase(seed);
  if (opts.premium === false) return m;
  const darkAt = (tx: number, ty: number) => bosqueDesign.dark.reduce((mx, z) => Math.max(mx, 1 - Math.hypot(tx - z.c[0], ty - z.c[1]) / z.r), 0);
  const { zonas, mundo } = premiumWorld(m, bosqueDesign, [{ ...ZONA_PILOTO, darkAt }], { ...BOSQUE_PREMIUM, darkAt }, m.objects);
  return { ...m, piloto: zonas[0], mundo: mundo ?? undefined };
}

function bosqueMapBase(seed = 2024): BigMap {
  const W = BOSQUE_W, H = BOSQUE_H, r = rng(seed);
  const terrain = paintTerrain(bosqueDesign);
  const objects = bosqueObjects();
  const byName = new Map(objects.map((o) => [o.name, o]));
  const solid = new Uint8Array(terrain.solid);
  const occ = new Uint8Array(W * H); // lugar ya usado (no poner árboles encima)
  const libre = new Uint8Array(W * H); // lo que el diseño deja libre a propósito
  const decos: Deco[] = [], entities: Ent[] = [];
  const T = (t: number) => t * TILE + TILE / 2;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : y * W + x);
  const kindAt = (x: number, y: number) => terrain.tileKind[at(x, y)] ?? 3;
  const isWaterT = (x: number, y: number) => at(x, y) >= 0 && terrain.waterTiles[at(x, y)] === 1;
  const open = (x: number, y: number) => at(x, y) >= 0 && !solid[at(x, y)] && !occ[at(x, y)] && !isWaterT(x, y);

  // objeto en coordenadas de pixel del apoyo: marca su colisión y lo ocupado
  const place = (sprite: string, px: number, py: number, reserve = 0) => {
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
    for (let dy = -reserve; dy <= reserve; dy++) for (let dx = -reserve; dx <= reserve; dx++) if (at(tx + dx, ty + dy) >= 0) occ[at(tx + dx, ty + dy)] = 1;
  };
  const placeT = (sprite: string, tx: number, ty: number, reserve = 0) => place(sprite, T(tx), ty * TILE + TILE - 4, reserve);
  const reserve = (tx: number, ty: number, rad: number) => { for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) if (dx * dx + dy * dy <= rad * rad + 1 && at(tx + dx, ty + dy) >= 0) { occ[at(tx + dx, ty + dy)] = 1; libre[at(tx + dx, ty + dy)] = 1; } };
  /** lugar libre más cercano en espiral */
  const near = (tx: number, ty: number, maxR = 8): [number, number] => {
    for (let rad = 0; rad <= maxR; rad++) for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== rad) continue;
      const x = tx + dx, y = ty + dy;
      if (open(x, y) && kindAt(x, y) !== 3) return [x, y];
    }
    return [tx, ty];
  };
  const ent = (tipo: string, tx: number, ty: number, props?: Record<string, Prop>, mark = true) => {
    const [x, y] = near(tx, ty);
    entities.push({ tipo, x: T(x), y: T(y), ...(props ? { props } : {}) });
    if (mark) occ[at(x, y)] = 1;
    return [x, y] as [number, number];
  };
  const chest = (tx: number, ty: number, nivel: string, extra: Record<string, Prop> = {}) => { const [x, y] = ent('cofre', tx, ty, { nivel, ...extra }); solid[at(x, y)] = 1; };
  const breakable = (tx: number, ty: number, objeto: string) => { const [x, y] = ent('rompible', tx, ty, { objeto }); solid[at(x, y)] = 1; };
  const enemies = (kind: string, tx: number, ty: number, n: number, extra: Record<string, Prop> = {}) => {
    for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, d = 0.6 + r() * 2.2; ent('enemigo', Math.round(tx + Math.cos(a) * d), Math.round(ty + Math.sin(a) * d), { enemigo: kind, ...extra }); }
  };
  const checkpoint = (id: string, nombre: string, tx: number, ty: number) => {
    const [x, y] = near(tx, ty);
    place('campamento_fogata', T(x), y * TILE + 28);
    entities.push({ tipo: 'punto_guardado', x: T(x), y: T(y + 1), props: { id, nombre } });
    reserve(x, y, 2);
  };
  const sign = (tx: number, ty: number, texto: string, icono: string) => { const [x, y] = near(tx, ty); place('cartel', T(x), y * TILE + 29); entities.push({ tipo: 'cartel', x: T(x), y: T(y), props: { texto, icono } }); };

  // ---------- el agua: dónde cruza cada fila y cada columna ----------
  const riverSpan = (ty: number, hint: number): [number, number] => {
    let x0 = hint, x1 = hint;
    while (x0 > 0 && isWaterT(x0 - 1, ty)) x0--;
    while (x1 < W - 1 && isWaterT(x1 + 1, ty)) x1++;
    if (!isWaterT(hint, ty)) { for (let d = 1; d < 8; d++) { if (isWaterT(hint + d, ty)) return riverSpan(ty, hint + d); if (isWaterT(hint - d, ty)) return riverSpan(ty, hint - d); } }
    return [x0, x1];
  };
  const bridgeAt = (ty0: number, hint: number) => {
    // la fila donde el camino toca las dos orillas (así el puente queda justo en el cruce)
    let ty = ty0, best = -1;
    for (let d = 0; d <= 5; d++) for (const t of d ? [ty0 - d, ty0 + d] : [ty0]) {
      const [a0, a1] = riverSpan(t, hint);
      let score = 0;
      for (const x of [a0 - 1, a0 - 2, a1 + 1, a1 + 2]) if (kindAt(x, t) === 1) score++;
      if (score > best) { best = score; ty = t; }
    }
    const [x0, x1] = riverSpan(ty, hint);
    const cx = ((x0 + x1 + 1) / 2) * TILE;
    place('puente', cx, ty * TILE + TILE / 2 + 2);
    // el puente se camina: libre de este a oeste, con un cuadro de orilla a cada lado
    for (let x = x0 - 1; x <= x1 + 1; x++) { solid[at(x, ty)] = 0; occ[at(x, ty)] = 1; occ[at(x, ty - 1)] = 1; occ[at(x, ty + 1)] = 1; libre[at(x, ty)] = libre[at(x, ty - 1)] = libre[at(x, ty + 1)] = 1; }
    return [x0, x1] as [number, number];
  };

  // ---------- borde: muralla de bosque (no se sale del mapa) ----------
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x < 2 || y < 1 || x >= W - 2 || y >= H - 2) solid[at(x, y)] = 1;

  // ---------- Claro de la Llegada ----------
  const [lx, ly] = L.llegada;
  entities.push({ tipo: 'portal_llegada', x: T(lx - 4), y: T(ly + 1), props: { color: 'azul' } });
  reserve(lx - 4, ly + 1, 2);
  entities.push({ tipo: 'jugador_inicio', x: T(lx - 2), y: T(ly + 2) });
  entities.push({ tipo: 'thor_inicio', x: T(lx - 3), y: T(ly + 3) });
  reserve(lx - 2, ly + 2, 2);
  placeT('carpa_familia', lx - 3, ly - 3, 2);
  checkpoint('llegada', 'Claro de la Llegada', lx + 1, ly - 1);
  placeT('troncos', lx + 3, ly - 3, 1);
  placeT('farol', lx + 3, ly + 2, 0);
  sign(lx + 5, ly - 1, '¡Bienvenida al Bosque GG! Sigue el camino. Al norte, en Las Alturas, vive el minotauro.', 'flecha_norte');
  breakable(lx - 5, ly - 2, 'caja'); breakable(lx - 5, ly - 1, 'barril');
  chest(lx - 7, ly + 3, 'madera', { tutorial: true });

  // ---------- puentes, vado y cascada ----------
  const [pb0, pb1] = bridgeAt(L.puente[1], L.puente[0]);
  ent('enemigo', pb1 + 2, L.puente[1], { enemigo: 'trol', elite: true, nombre: 'Trol del Puente' });
  sign(pb0 - 3, L.puente[1] - 2, 'Puente del Trol. Dicen que cobra peaje en abrazos.', 'peligro');
  // la guarida del trol bajo el puente: cama de paja, la olla al fuego y los restos de la cena, en la orilla
  { const [x, y] = near(pb1 + 2, L.puente[1] + 2, 3); placeT('cama_trol', x, y, 1); }
  { const [x, y] = near(pb1 + 4, L.puente[1] + 1, 3); placeT('olla_trol', x, y, 1); solid[at(x, y)] = 1; }
  for (const [dx, dy] of [[1, 3], [5, 3], [3, 4]]) { const [x, y] = near(pb1 + dx, L.puente[1] + dy, 2); placeT('huesos_pescado', x, y); occ[at(x, y)] = 1; }
  bridgeAt(L.puenteSur[1], L.puenteSur[0]);
  bridgeAt(12, 52); // en Las Alturas: lleva al estanque alto (lado oeste)
  {
    // vado: piedras para saltar de orilla a orilla
    const ty = L.vado[1];
    const [x0, x1] = riverSpan(ty, L.vado[0]);
    for (let x = x0; x <= x1; x++) { place(`piedra_vado_${x % 2}`, T(x), ty * TILE + 22); solid[at(x, ty)] = 0; occ[at(x, ty)] = 1; libre[at(x, ty)] = 1; }
    occ[at(x0 - 1, ty)] = 1; occ[at(x1 + 1, ty)] = 1; solid[at(x0 - 1, ty)] = 0; solid[at(x1 + 1, ty)] = 0; libre[at(x0 - 1, ty)] = libre[at(x1 + 1, ty)] = 1;
  }
  {
    // cascada donde el río cae del acantilado
    const hint = L.cascada[0];
    const [x0, x1] = riverSpan(L.cascada[1] - 4, hint);
    const cx = Math.round(((x0 + x1 + 1) / 2) * TILE);
    let edge = 0;
    for (let y = (L.cascada[1] - 8) * TILE; y < (L.cascada[1] + 6) * TILE; y++) if (terrain.high[(y - 1) * W * TILE + cx] && !terrain.high[y * W * TILE + cx]) { edge = y; break; }
    // la cascada se hace a la medida de este acantilado: cada columna del río cae del labio real al pie real de la roca
    const PW = W * TILE;
    const cols: WaterfallCol[] = [];
    for (let x = cx - 90; x <= cx + 90; x++) {
      let lip = -1;
      for (let y = (L.cascada[1] - 8) * TILE; y < (L.cascada[1] + 6) * TILE; y++) if (terrain.high[(y - 1) * PW + x] && !terrain.high[y * PW + x]) { lip = y; break; }
      if (lip < 0 || terrain.kind[(lip - 3) * PW + x] !== 4) { if (cols.length && x > cx) break; cols.length = 0; continue; }
      let base = lip;
      while (base < lip + 140 && terrain.kind[base * PW + x] === 3) base++;
      cols.push({ x, lip, base });
    }
    const pixelWater = (x: number, y: number) => x >= 0 && y >= 0 && x < PW && terrain.kind[y * PW + x] === 4 && !terrain.high[y * PW + x];
    const fall = fittedWaterfall(cols, pixelWater);
    objects[objects.findIndex((o) => o.name === 'cascada')] = fall.obj;
    byName.set('cascada', fall.obj);
    // se agrega directo y reserva el mismo cuadro que la cascada vieja: así el resto del bosque (árboles, cofres,
    // enemigos) queda exactamente donde estaba y no se pierden los cofres abiertos de las partidas guardadas
    decos.push({ sprite: 'cascada', x: fall.x, y: fall.y });
    occ[at(Math.floor(cx / TILE), Math.floor((edge + 97) / TILE))] = 1;
    // detrás de la cascada, en la orilla de abajo: cofre secreto
    chest(x1 + 2, Math.floor(edge / TILE) + 3, 'reforzado', { secreto: true, pista: 'tras_la_cascada' });
  }
  // orillas: juncos, nenúfares y sauces
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = at(x, y);
    if (terrain.waterTiles[i] && solid[i] && !occ[i]) {
      const shore = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !isWaterT(x + dx, y + dy));
      if (!shore && r() < 0.05) { place(r() < 0.3 ? 'nenufar_flor' : 'nenufar', T(x) + (r() - 0.5) * 12, y * TILE + 18); occ[i] = 1; }
      continue;
    }
    if (terrain.waterTiles[i] || !open(x, y) || kindAt(x, y) !== 0) continue;
    const nextToWater = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isWaterT(x + dx, y + dy));
    if (nextToWater && r() < 0.22) { place('juncos', T(x) + (r() - 0.5) * 10, y * TILE + 30); occ[i] = 1; }
  }

  // ---------- El Abuelo Roble ----------
  const [ax, ay] = L.abuelo;
  place('abuelo_roble_v3', T(ax), ay * TILE + 8, 3);
  reserve(ax, ay + 2, 3);
  checkpoint('abuelo', 'El Abuelo Roble', ax + 4, ay + 3);
  chest(ax - 4, ay + 2, 'reforzado');
  for (const [dx, dy] of [[-3, -2], [3, -3], [-5, 1]]) { const [x, y] = near(ax + dx, ay + dy, 2); placeT('hongos', x, y); occ[at(x, y)] = 1; }
  sign(ax + 2, ay + 5, 'El Abuelo Roble cuida el bosque desde hace mil años. Si lo abrazas, te sonríe.', 'corazon');

  // ---------- Bosque Profundo, Anillo de las Hadas y Claro Escondido ----------
  const [hx, hy] = L.hadas;
  place('anillo_hadas', T(hx), hy * TILE + 30);
  reserve(hx, hy, 3);
  chest(hx, hy, 'dorado', { secreto: true, pista: 'anillo_hadas' });
  for (const [dx, dy, c] of [[-3, -3, 'azul'], [4, 2, 'morado'], [-4, 3, 'azul']] as [number, number, string][]) { const [x, y] = near(hx + dx, hy + dy, 2); placeT(`hongo_gigante_${c}`, x, y, 1); }
  const [px0, py0] = L.profundo;
  for (const [dx, dy, c] of [[-6, -4, 'azul'], [5, -6, 'morado'], [7, 3, 'azul'], [-3, 6, 'morado'], [10, -1, 'azul'], [-9, 2, 'morado']] as [number, number, string][]) { const [x, y] = near(px0 + dx, py0 + dy, 3); placeT(`hongo_gigante_${c}`, x, y, 1); }
  { const [x, y] = near(px0 + 3, py0 + 4, 3); placeT('tronco_caido', x, y, 1); }
  enemies('rata', px0 + 2, py0 - 2, 3);
  // camino escondido al Claro Escondido: angosto, sin árboles, entre bosque cerrado
  const [ex, ey] = L.escondido;
  const secretPath: TP[] = [[11, 27], [12, 24], [14, 21], [13, 17], [11, 14], [ex, ey + 2]];
  for (let i = 0; i < secretPath.length - 1; i++) {
    const [a0, a1] = secretPath[i], [b0, b1] = secretPath[i + 1];
    const n = Math.ceil(Math.hypot(b0 - a0, b1 - a1) * 2);
    for (let k = 0; k <= n; k++) { const x = Math.round(a0 + ((b0 - a0) * k) / n), y = Math.round(a1 + ((b1 - a1) * k) / n); occ[at(x, y)] = 1; solid[at(x, y)] = 0; libre[at(x, y)] = 1; }
  }
  reserve(ex, ey, 4);
  chest(ex, ey - 1, 'dorado', { secreto: true, pista: 'claro_escondido' });
  placeT('cristales', ex - 3, ey - 2, 0); placeT('cristales', ex + 3, ey - 1, 0);
  placeT('hongo_gigante_morado', ex + 2, ey + 2, 0); placeT('hongo_gigante_azul', ex - 3, ey + 2, 0);
  placeT('pasto_alto', 12, 26); placeT('pasto_alto', 13, 23); // tapan un poco la entrada

  // ---------- Pradera de las Mariposas ----------
  const [mx, my] = L.pradera;
  for (let i = 0; i < 26; i++) { const [x, y] = near(mx + Math.round((r() - 0.5) * 18), my + Math.round((r() - 0.5) * 12), 2); if (kindAt(x, y) === 0) { placeT('pasto_alto', x, y); occ[at(x, y)] = 1; } }
  chest(mx - 6, my - 4, 'madera', { secreto: true, pista: 'pasto_alto' });
  for (let i = 0; i < 6; i++) { const [x, y] = near(mx + Math.round((r() - 0.5) * 20), my + Math.round((r() - 0.5) * 14), 2); placeT(r() < 0.5 ? 'arbusto_moras_0' : `arbusto_verde_${r() < 0.5 ? 0 : 1}`, x, y); occ[at(x, y)] = 1; }
  enemies('rata', mx + 5, my - 3, 3);
  enemies('rata', mx - 4, my + 4, 2);
  sign(36, 64, 'Al este: el Arroyo Cristalino. Al norte: el Abuelo Roble.', 'cruce');

  // ---------- Lago Espejo ----------
  const [lgx, lgy] = L.lago;
  for (const [dx, dy] of [[-11, -2], [10, -3], [-7, 6], [11, 4]]) { const [x, y] = near(lgx + dx, lgy + dy, 3); placeT('sauce_v3', x, y, 1); }
  { const [x, y] = near(lgx - 4, lgy - 7, 3); placeT('farol', x, y); }

  // ---------- Ruinas del Viejo Reino ----------
  const [rx, ry] = L.ruinas;
  place('estatua_thor', T(rx), ry * TILE + 20, 3);
  sign(rx - 2, ry + 3, 'Thor, el Guardián. Cuentan que su ladrido espantó a la oscuridad del reino.', 'estrella');
  chest(rx - 4, ry - 2, 'dorado');
  // arco sobre el camino de entrada (oeste) y pilares alrededor
  place('arco_ruina', T(rx - 9), (ry + 2) * TILE + 2, 0);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.3, x = Math.round(rx + Math.cos(a) * 7), y = Math.round(ry + Math.sin(a) * 5);
    if (!open(x, y) || kindAt(x, y) === 1) continue;
    placeT(i % 3 === 1 ? 'pilar_roto' : i % 3 === 2 ? 'pilar_alto' : 'pilar', x, y, 0); // alturas distintas
  }
  for (const [dx, dy] of [[5, -6], [-7, -5], [8, 5]]) { const [x, y] = near(rx + dx, ry + dy, 2); placeT('muro_ruina', x, y, 1); }
  { const [x, y] = near(rx + 5, ry + 3, 2); placeT('pozo', x, y, 1); }
  breakable(rx + 3, ry - 4, 'vasija'); breakable(rx - 4, ry + 4, 'vasija'); breakable(rx + 6, ry - 1, 'vasija');
  enemies('calabaza', rx + 4, ry + 1, 3);
  enemies('goblin_arquero', rx - 2, ry - 7, 2);

  // ---------- Escalera a Las Alturas ----------
  const [sx, sy] = L.escalera;
  checkpoint('escalera', 'Pie de la Escalera', sx + 3, sy + 4);
  sign(sx - 3, sy + 3, 'Arriba están Las Alturas. El minotauro duerme en su arena. ¡Prepárate!', 'peligro');
  placeT('farol', sx - 2, sy + 2); placeT('farol', sx + 2, sy - 3);

  // ---------- Las Alturas y la Arena del Minotauro ----------
  const [bx, by] = L.arena;
  place('cueva', T(bx), (by - 6) * TILE + 20, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const x = Math.round(bx + Math.cos(a) * 6.5), y = Math.round(by + Math.sin(a) * 4.6);
    placeT('piedra_arena', x, y, 0);
  }
  reserve(bx, by, 5);
  entities.push({ tipo: 'jefe', x: T(bx), y: T(by), props: { enemigo: 'minotauro', nombre: 'Minotauro del Bosque' } });
  entities.push({ tipo: 'portal_jefe', x: T(bx), y: T(by - 3), props: { color: 'azul', destino: 'mundo2' } });
  entities.push({ tipo: 'cofre', x: T(bx + 3), y: T(by - 3), props: { nivel: 'legendario', tras_jefe: true } });
  entities.push({ tipo: 'arena_jefe', x: T(bx), y: T(by), props: { radio: 6 * TILE } });
  placeT('antorcha', bx - 3, by + 6); placeT('antorcha', bx + 3, by + 6);
  for (const [dx, dy] of [[-9, -3], [9, -4], [-8, 4], [10, 3]]) { const [x, y] = near(bx + dx, by + dy, 2); placeT('cristales', x, y, 0); }
  enemies('goblin_arquero', 90, 15, 3);
  enemies('goblin_arquero', 70, 17, 2);
  chest(42, 12, 'reforzado', { secreto: true, pista: 'estanque_alto' });

  // ---------- Colina de los Goblins ----------
  const [gx, gy] = L.goblins;
  placeT('carpa_goblin', gx - 3, gy - 2, 1); placeT('carpa_goblin', gx + 3, gy - 3, 1); placeT('carpa_goblin', gx + 4, gy + 3, 1);
  placeT('fogata', gx, gy);
  placeT('estandarte_goblin', gx - 5, gy + 3); placeT('estandarte_goblin', gx + 6, gy - 1);
  { const [x, y] = near(gx - 5, gy - 4, 2); placeT('carpa_goblin', x, y, 1); }
  { const [x, y] = near(gx + 1, gy - 5, 2); placeT('tarima', x, y, 1); }
  for (const [dx, dy] of [[-6, 0], [6, 2], [-2, -5]]) { const [x, y] = near(gx + dx, gy + dy, 2); placeT('barriles', x, y, 0); occ[at(x, y)] = 1; }
  // campo de práctica: dianas en fila al este del campamento
  for (let k = 0; k < 3; k++) { const [x, y] = near(gx + 11, gy - 3 + k * 3, 2); placeT('diana', x, y, 0); occ[at(x, y)] = 1; }
  // empalizada continua alrededor del campamento, con la entrada al suroeste (donde llega el sendero)
  const done = new Set<number>();
  for (let k = 0; k < 120; k++) {
    const a = (k / 120) * Math.PI * 2, x = Math.round(gx + Math.cos(a) * 8.5), y = Math.round(gy + Math.sin(a) * 6.5);
    if (a > 1.9 && a < 2.9) continue;
    const j = at(x, y);
    if (done.has(j) || !open(x, y) || kindAt(x, y) !== 0) continue;
    done.add(j);
    placeT('empalizada', x, y, 0);
    occ[j] = 1;
  }
  reserve(gx, gy, 4);
  breakable(gx - 2, gy + 2, 'barril'); breakable(gx + 1, gy + 3, 'barril'); breakable(gx + 2, gy - 4, 'caja');
  chest(gx + 1, gy - 2, 'reforzado');
  enemies('goblin_arquero', gx, gy + 1, 4);
  enemies('goblin_arquero', L.escaleraGoblin[0] + 3, L.escaleraGoblin[1] - 5, 2);

  // ---------- Campo de Calabazas ----------
  const [cx0, cy0] = L.calabazas;
  for (let x = cx0 - 6; x <= cx0 + 6; x++) for (const y of [cy0 - 5, cy0 + 4]) if (open(x, y) && kindAt(x, y) !== 1) placeT('cerca_h', x, y);
  placeT('espantapajaros', cx0, cy0 - 1, 0);
  for (let i = 0; i < 12; i++) { const x = cx0 - 5 + (i % 6) * 2, y = cy0 - 3 + Math.floor(i / 6) * 4; if (open(x, y) && kindAt(x, y) === 0) { placeT('calabazas_deco', x, y); occ[at(x, y)] = 1; } }
  enemies('calabaza', cx0 + 2, cy0, 4);
  chest(cx0 + 5, cy0 - 3, 'madera');

  // ---------- praderas: algo para descubrir cada media pantalla (15 x 8 cuadros) ----------
  const DISCOVER = ['tocon_hongos', 'charco', 'roca', 'roca_grande', 'tronco_caido', 'flores_grandes_0', 'flores_grandes_1', 'flores_grandes_2'];
  for (const [x0, y0, x1, y1] of [[17, 61, 43, 79], [36, 1, 104, 23]] as [number, number, number, number][]) {
    for (let cy = y0; cy < y1; cy += 8) for (let cx = x0; cx < x1; cx += 15) {
      const tx = cx + 2 + Math.floor(r() * 11), ty = cy + 1 + Math.floor(r() * 6);
      if (!open(tx, ty) || kindAt(tx, ty) !== 0 || terrain.waterTiles[at(tx, ty)]) continue;
      const pick = DISCOVER[Math.floor(r() * DISCOVER.length)];
      placeT(pick, tx, ty, pick === 'tronco_caido' ? 1 : 0); occ[at(tx, ty)] = 1;
      // y matas de flores grandes alrededor (no estorban: se camina entre ellas)
      for (let k = 0; k < 2; k++) {
        const fx = tx + Math.round((r() - 0.5) * 8), fy = ty + Math.round((r() - 0.5) * 5);
        if (open(fx, fy) && kindAt(fx, fy) === 0 && !terrain.waterTiles[at(fx, fy)]) { placeT(`flores_grandes_${Math.floor(r() * 3)}`, fx, fy); occ[at(fx, fy)] = 1; }
      }
    }
  }

  // ---------- sendas: el camino más corto desde el inicio hasta cada cosa queda sin árboles ----------
  {
    const sx0 = Math.floor(entities[1].x / TILE), sy0 = Math.floor(entities[1].y / TILE);
    const prev = new Int32Array(W * H).fill(-1);
    const q = [sy0 * W + sx0]; prev[q[0]] = q[0];
    for (let h = 0; h < q.length; h++) {
      const i = q[h], x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const j = at(x + dx, y + dy);
        if (j < 0 || prev[j] >= 0 || solid[j]) continue;
        prev[j] = i; q.push(j);
      }
    }
    for (const e of entities) {
      let i = at(Math.floor(e.x / TILE), Math.floor(e.y / TILE));
      if (prev[i] < 0) { const k = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => at(Math.floor(e.x / TILE) + dx, Math.floor(e.y / TILE) + dy)).find((j) => j >= 0 && prev[j] >= 0); if (k === undefined) continue; i = k; }
      while (prev[i] !== i && prev[i] >= 0) { occ[i] = 1; i = prev[i]; }
    }
  }

  // ---------- el bosque: masas de árboles con caminos tallados, arbustos en los bordes ----------
  const zoneW = (list: { c: TP; r: number }[], x: number, y: number) => list.reduce((m, z) => Math.max(m, 1 - Math.hypot(x - z.c[0], y - z.c[1]) / z.r), 0);
  const roadDist = new Uint8Array(W * H).fill(9);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = kindAt(x, y);
    if (k === 1 || k === 2 || k === 5) for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const j = at(x + dx, y + dy); if (j >= 0) roadDist[j] = Math.min(roadDist[j], Math.max(Math.abs(dx), Math.abs(dy))); }
  }
  const clearings = bosqueDesign.clearings ?? [];
  // masa del bosque: ruido grande (manchas de bosque cerrado y claros naturales)
  const blob = (x: number, y: number) => { let v = 0, a = 1, f = 1 / 14, tot = 0; for (let o = 0; o < 3; o++) { const X = x * f, Y = y * f, x0 = Math.floor(X), y0 = Math.floor(Y), fx = X - x0, fy = Y - y0; const hh = (i: number, j: number) => { let h = (i * 374761393 + j * 668265263 + o * 1013) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }; const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy); const a0 = hh(x0, y0), b0 = hh(x0 + 1, y0), c0 = hh(x0, y0 + 1), d0 = hh(x0 + 1, y0 + 1); v += a * (a0 + (b0 - a0) * sx + (c0 - a0) * sy + (a0 - b0 - c0 + d0) * sx * sy); tot += a; a *= 0.5; f *= 2; } return v / tot; };
  const dens = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = at(x, y);
    const dark = zoneW(bosqueDesign.dark, x, y), meadow = zoneW(bosqueDesign.meadows, x, y), clear = zoneW(clearings, x, y);
    let d = (blob(x, y) - 0.36) * 3.4 + dark * 1.1 - meadow * 1.2 - clear * 2.2;
    const rd = roadDist[i];
    if (rd <= 1) d = -1; else if (rd === 2) d -= 0.9; else if (rd === 3) d -= 0.35;
    if (x < 4 || y < 3 || x >= W - 4 || y >= H - 4) d = 1.5;
    dens[i] = d;
  }
  const trunk = new Uint8Array(W * H);
  const order = Array.from({ length: W * H }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const okGround = (x: number, y: number) => at(x, y) >= 0 && !terrain.waterTiles[at(x, y)] && kindAt(x, y) === 0;
  for (const i of order) {
    const x = i % W, y = Math.floor(i / W);
    if (occ[i] || !okGround(x, y) || r() > dens[i]) continue;
    // tronco: sin otro tronco al lado (las copas se tocan y forman la masa)
    // en diagonal sí se puede: así las copas se enciman y forman bosque cerrado
    const crowd = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => at(x + dx, y + dy) >= 0 && trunk[at(x + dx, y + dy)] === 1);
    if (crowd || !okGround(x, y + 1) || kindAt(x, y - 1) === 3 || kindAt(x, y - 2) === 3) continue;
    const dark = zoneW(bosqueDesign.dark, x, y), hi = terrain.tileHigh[i];
    const roll = r();
    const pine = () => `pino_${Math.floor(r() * 3)}`, oak = () => `roble_${Math.floor(r() * 3)}`;
    const nearWater = [[2, 0], [-2, 0], [0, 2], [0, -2]].some(([dx, dy]) => at(x + dx, y + dy) >= 0 && terrain.waterTiles[at(x + dx, y + dy)]);
    let tree: string;
    if (nearWater && roll < 0.35) tree = 'sauce_v3';
    else if (dark > 0.45 && roll < 0.08) tree = `arbol_hechizado_${Math.floor(r() * 3)}`;
    else if (dark > 0.3 && roll < 0.16) tree = `arbol_seco_${r() < 0.5 ? 0 : 1}`;
    else if (dark > 0.35 || hi) tree = roll < 0.6 ? pine() : oak();
    else tree = roll < 0.05 ? 'roble_grande_0' : roll < 0.09 ? 'roble_otono_1' : roll < 0.7 ? oak() : pine();
    place(tree, T(x) + Math.round((r() - 0.5) * 14), y * TILE + TILE - 4 + Math.round((r() - 0.5) * 8));
    trunk[i] = 1; occ[i] = 1;
  }
  // borde del bosque: arbustos, helechos y alguna piedra donde termina la masa
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    const i = at(x, y);
    if (occ[i] || trunk[i] || !okGround(x, y)) continue;
    let trees = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (trunk[at(x + dx, y + dy)]) trees++;
    const meadow = zoneW(bosqueDesign.meadows, x, y), dark = zoneW(bosqueDesign.dark, x, y);
    const roll = r();
    if (trees >= 2 && trees <= 6 && roll < 0.3) { placeT(dark > 0.3 && r() < 0.35 ? (r() < 0.5 ? 'hongos' : 'arbusto_espinas_0') : r() < 0.2 ? 'arbusto_moras_0' : `arbusto_verde_${r() < 0.5 ? 0 : 1}`, x, y); occ[i] = 1; }
    else if (trees === 0 && meadow > 0.2 && roll < 0.05) { placeT('pasto_alto', x, y); occ[i] = 1; }
    else if (trees <= 1 && roll < 0.012) { placeT(r() < 0.6 ? 'roca' : r() < 0.5 ? 'roca_grande' : 'tocon', x, y); occ[i] = 1; }
  }

  // suelo de bosque: oscuro bajo las masas de árboles (densidad de troncos suavizada)
  {
    const dd = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let n = 0, c = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const j = at(x + dx, y + dy); if (j < 0) continue; c++; n += trunk[j]; }
      dd[at(x, y)] = Math.min(1, (n / c) * 3.2 + zoneW(bosqueDesign.dark, x, y) * 0.5);
    }
    forestFloor(terrain, W, H, dd, seed);
  }

  // ---------- vida: telarañas en troncos del bosque oscuro, cuervos en los claros, ojos en los arbustos ----------
  const trees = decos.filter((d) => d.sprite.startsWith('pino_') || d.sprite.startsWith('roble_') || d.sprite.startsWith('arbol_seco'));
  for (const d of trees) {
    const tx = Math.floor(d.x / TILE), ty = Math.floor(d.y / TILE);
    if (zoneW(bosqueDesign.dark, tx, ty) > 0.35 && r() < 0.07) decos.push({ sprite: 'telarana', x: d.x + 4, y: d.y - 18 });
  }
  const critter = (especie: string, tx: number, ty: number) => { const [x, y] = near(tx, ty, 3); entities.push({ tipo: 'criatura', x: T(x) + Math.round((r() - 0.5) * 16), y: T(y), props: { especie } }); };
  for (const [cx2, cy2, n] of [[L.pradera[0], L.pradera[1], 4], [L.ruinas[0], L.ruinas[1] - 3, 3], [L.arena[0] - 6, L.arena[1] + 5, 3], [L.llegada[0] + 6, L.llegada[1] - 4, 2], [L.calabazas[0], L.calabazas[1], 3], [L.abuelo[0] + 3, L.abuelo[1] + 4, 2]] as [number, number, number][])
    for (let k = 0; k < n; k++) critter('cuervo', cx2 + Math.round((r() - 0.5) * 6), cy2 + Math.round((r() - 0.5) * 4));
  const bushes = decos.filter((d) => d.sprite.startsWith('arbusto_'));
  for (const d of bushes) {
    const tx = Math.floor(d.x / TILE), ty = Math.floor(d.y / TILE);
    if (zoneW(bosqueDesign.dark, tx, ty) > 0.3 && r() < 0.22) entities.push({ tipo: 'criatura', x: d.x, y: d.y - 14, props: { especie: 'ojos' } });
  }

  // ---------- zonas y postales ----------
  const zones: MapZone[] = [];
  const zone = (nombre: string, c: TP, rw: number, rh: number, props: Record<string, Prop>) => zones.push({ nombre, x: (c[0] - rw) * TILE, y: (c[1] - rh) * TILE, w: rw * 2 * TILE, h: rh * 2 * TILE, props: { musica: 'bosque', descubrir: true, ...props } });
  zone('Claro de la Llegada', L.llegada, 9, 7, { ambiente: 'bosque', luz: '#ffe2b0', particulas: 'polen' , niebla: 0.25});
  zone('Pradera de las Mariposas', L.pradera, 13, 9, { ambiente: 'bosque', luz: '#fff0c0', particulas: 'mariposas,polen' , niebla: 0.15});
  zone('El Abuelo Roble', L.abuelo, 7, 6, { ambiente: 'bosque', luz: '#ffe8b8', particulas: 'hojas,luciernagas' , niebla: 0.3});
  zone('Bosque Profundo', L.profundo, 14, 13, { ambiente: 'noche', luz: '#7a8ab8', oscuridad: 0.4, particulas: 'luciernagas,esporas,fuegos_fatuos,murcielagos' , niebla: 0.75});
  zone('Anillo de las Hadas', L.hadas, 4, 4, { ambiente: 'magia', luz: '#a8fff0', oscuridad: 0.4, particulas: 'luciernagas,brillos,fuegos_fatuos' , niebla: 0.55});
  zone('Claro Escondido', L.escondido, 6, 5, { ambiente: 'magia', luz: '#d8b8ff', oscuridad: 0.3, particulas: 'brillos,luciernagas', secreto: true , niebla: 0.45});
  zone('Arroyo Cristalino', [55, 42], 6, 20, { ambiente: 'agua', luz: '#d8f0ff', particulas: 'luciernagas' , niebla: 0.5});
  zone('Lago Espejo', L.lago, 12, 8, { ambiente: 'agua', luz: '#d8f0ff', particulas: 'luciernagas,mariposas' , niebla: 0.65});
  zone('Ruinas del Viejo Reino', L.ruinas, 10, 8, { ambiente: 'viento', luz: '#ffe0c0', particulas: 'polvo' , niebla: 0.4});
  zone('Colina de los Goblins', L.goblins, 12, 17, { ambiente: 'viento', luz: '#ffd0a0', particulas: 'humo' , niebla: 0.25});
  zone('Campo de Calabazas', L.calabazas, 9, 7, { ambiente: 'bosque', luz: '#ffd8a0', particulas: 'hojas' , niebla: 0.5});
  zone('Las Alturas', [70, 12], 34, 11, { ambiente: 'viento', luz: '#fff4d8', particulas: 'polen,hojas' , niebla: 0.2});
  zone('Arena del Minotauro', L.arena, 9, 8, { ambiente: 'cueva', musica: 'jefe', luz: '#ffb08a', oscuridad: 0.4, particulas: 'brasas' , niebla: 0.55});
  const postales: Postal[] = [
    { nombre: 'llegada', x: T(L.llegada[0] - 1), y: T(L.llegada[1] - 1) },
    { nombre: 'abuelo_roble', x: T(L.abuelo[0]), y: T(L.abuelo[1] - 1) },
    { nombre: 'cascada_y_vado', x: T(L.cascada[0] + 1), y: T(L.cascada[1] + 5) },
    { nombre: 'puente_del_trol', x: T(L.puente[0]), y: T(L.puente[1]) },
    { nombre: 'ruinas_y_estatua', x: T(L.ruinas[0] - 2), y: T(L.ruinas[1]) },
    { nombre: 'anillo_de_hadas', x: T(L.hadas[0] + 2), y: T(L.hadas[1]) },
    { nombre: 'arena_del_minotauro', x: T(L.arena[0]), y: T(L.arena[1] - 1) },
    { nombre: 'colina_goblin', x: T(L.escaleraGoblin[0] + 4), y: T(L.escaleraGoblin[1] - 6) }, // el borde de la colina y la escalera
    { nombre: 'bosque_profundo', x: T(L.profundo[0]), y: T(L.profundo[1]) },
    { nombre: 'claro_escondido', x: T(L.escondido[0]), y: T(L.escondido[1]) },
    { nombre: 'lago_espejo', x: T(L.lago[0]), y: T(L.lago[1] - 1) },
    { nombre: 'campo_calabazas', x: T(L.calabazas[0]), y: T(L.calabazas[1]) },
    { nombre: 'las_alturas', x: T(L.alturas[0]), y: T(L.alturas[1]) },
  ];
  return { name: 'mundo1_bosque', w: W, h: H, terrain, solid, decos, entities, zones, postales, objects, libre, densidad: dens };
}

/** Desde dónde se puede llegar caminando (4 vecinos), empezando en un cuadro. */
export function reachable(m: BigMap, sx: number, sy: number): Uint8Array {
  const seen = new Uint8Array(m.w * m.h);
  const q = [sy * m.w + sx];
  seen[q[0]] = 1;
  while (q.length) {
    const i = q.pop()!, x = i % m.w, y = Math.floor(i / m.w);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const X = x + dx, Y = y + dy;
      if (X < 0 || Y < 0 || X >= m.w || Y >= m.h) continue;
      const j = Y * m.w + X;
      if (seen[j] || m.solid[j]) continue;
      seen[j] = 1; q.push(j);
    }
  }
  return seen;
}

// ---------- Tiled y vistas ----------

export const CHUNK = 960;

export interface BigMapFiles {
  json: Record<string, unknown>;
  chunks: { name: string; x: number; y: number; img: Raster }[];
  aguaPng: Raster;
}

/** Exporta a Tiled: capas de imagen del suelo (trozos), agua animada, colisión, objetos, entidades, zonas y postales. */
/** Valores de la capa `superficie` (qué paso suena en cada cuadro). */
export const SUPERFICIES = ['', 'pasto', 'tierra', 'piedra', 'madera', 'agua'] as const;

/**
 * Superficie de cada cuadro para los pasos: 1 pasto, 2 tierra (caminos), 3 piedra (plazas, acantilados, escaleras),
 * 4 madera (puentes) y 5 agua (vado y orillas).
 */
export function surfaceTiles(m: BigMap): Uint8Array {
  const byKind = [1, 2, 3, 3, 5, 3]; // pasto, camino, plaza, acantilado, agua, escalera
  const out = Uint8Array.from(m.terrain.tileKind, (k) => byKind[k] ?? 1);
  const objs = new Map(m.objects.map((o) => [o.name, o]));
  for (const d of m.decos) {
    if (d.sprite !== 'puente') continue;
    const o = objs.get(d.sprite)!;
    // el tablero del puente: todo el ancho y la franja del medio del alto
    const x0 = Math.floor((d.x - o.anchor[0]) / TILE), x1 = Math.floor((d.x - o.anchor[0] + o.w - 1) / TILE);
    const y0 = Math.floor((d.y - o.anchor[1] + 12) / TILE), y1 = Math.floor((d.y - o.anchor[1] + o.h - 13) / TILE);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x >= 0 && y >= 0 && x < m.w && y < m.h) out[y * m.w + x] = 4;
  }
  return out;
}

export function bigMapToTiled(m: BigMap, dir = 'suelo'): BigMapFiles {
  const parts = chunks(m.terrain.img, CHUNK).map((c, i) => ({ name: `${dir}/${m.name}_${i}.png`, ...c }));
  // agua: 4 cuadros en una tira; el cuadro 0 se anima por los 4
  const agua = createRaster(TILE * 5, TILE);
  for (let f = 0; f < 4; f++) over(agua, waterTile(f, m.meta?.agua), f * TILE, 0);
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) { const k = (y * agua.w + 4 * TILE + x) * 4; agua.data[k] = 255; agua.data[k + 1] = 0; agua.data[k + 2] = 255; agua.data[k + 3] = 110; }
  const solidGid = 5; // el 5to cuadro de la tira es la marca de colisión
  let oid = 1, lid = 1;
  const props = (p?: Record<string, Prop>) => Object.entries(p ?? {}).map(([name, value]) => ({ name, type: typeof value === 'number' ? 'float' : typeof value === 'boolean' ? 'bool' : 'string', value }));
  const point = (name: string, type: string, x: number, y: number, p?: Record<string, Prop>) => ({ id: oid++, name, type, x, y, width: 0, height: 0, rotation: 0, visible: true, point: true, properties: props(p) });
  const json = {
    type: 'map', version: '1.10', tiledversion: '1.10.2', orientation: 'orthogonal', renderorder: 'right-down', infinite: false,
    width: m.w, height: m.h, tilewidth: TILE, tileheight: TILE,
    properties: props({ bioma: m.meta?.bioma ?? 'bosque', musica: m.meta?.musica ?? 'bosque', nombre: m.meta?.nombre ?? 'Bosque GG', trozo: CHUNK, ...(m.meta?.fondo ? { fondo: m.meta.fondo.map((f) => `${f.id}:${f.paralaje}`).join(',') } : {}) }),
    tilesets: [{
      firstgid: 1, name: 'agua', image: 'agua.png', imagewidth: agua.w, imageheight: TILE, tilewidth: TILE, tileheight: TILE, columns: 5, tilecount: 5, margin: 0, spacing: 0,
      tiles: [{ id: 0, animation: [0, 1, 2, 3].map((f) => ({ tileid: f, duration: 220 })) }],
    }],
    layers: [
      { id: lid++, name: 'agua', type: 'tilelayer', width: m.w, height: m.h, x: 0, y: 0, opacity: 1, visible: true, data: Array.from(m.terrain.waterTiles, (v) => (v ? 1 : 0)) },
      { id: lid++, name: 'suelo', type: 'group', opacity: 1, visible: true, layers: parts.map((p, i) => ({ id: 100 + i, name: `suelo_${i}`, type: 'imagelayer', image: p.name.split('/').pop() ? `${p.name}` : p.name, offsetx: p.x, offsety: p.y, x: 0, y: 0, opacity: 1, visible: true })) },
      { id: lid++, name: 'colision', type: 'tilelayer', width: m.w, height: m.h, x: 0, y: 0, opacity: 0.5, visible: false, data: Array.from(m.solid, (v) => (v ? solidGid : 0)) },
      // pasos: un valor por cuadro (no es un gráfico, se lee directo de data)
      { id: lid++, name: 'superficie', type: 'tilelayer', width: m.w, height: m.h, x: 0, y: 0, opacity: 0.4, visible: false, data: Array.from(surfaceTiles(m)), properties: props({ valores: SUPERFICIES.map((n, i) => (i ? `${i} ${n}` : '')).filter(Boolean).join(', ') }) },
      { id: lid++, name: 'objetos', type: 'objectgroup', draworder: 'topdown', opacity: 1, visible: true, x: 0, y: 0, objects: m.decos.map((d) => point(d.sprite, 'deco', d.x, d.y, { sprite: d.sprite })) },
      { id: lid++, name: 'entidades', type: 'objectgroup', draworder: 'topdown', opacity: 1, visible: true, x: 0, y: 0, objects: m.entities.map((e) => point(e.tipo, e.tipo, e.x, e.y, e.props)) },
      { id: lid++, name: 'zonas', type: 'objectgroup', draworder: 'topdown', opacity: 0.3, visible: false, x: 0, y: 0, objects: m.zones.map((z) => ({ id: oid++, name: z.nombre, type: 'zona', x: z.x, y: z.y, width: z.w, height: z.h, rotation: 0, visible: true, properties: props(z.props) })) },
      { id: lid++, name: 'postales', type: 'objectgroup', draworder: 'topdown', opacity: 1, visible: false, x: 0, y: 0, objects: m.postales.map((p) => point(p.nombre, 'postal', p.x, p.y)) },
    ],
  };
  (json as Record<string, unknown>).nextlayerid = 200;
  (json as Record<string, unknown>).nextobjectid = oid;
  return { json, chunks: parts, aguaPng: agua };
}

/** Vista completa: agua, suelo, objetos de suelo y luego el resto ordenado por profundidad (sin entidades). */
export function renderBigMap(m: BigMap, opts: { entities?: boolean; frame?: number } = {}): Raster {
  const img = m.terrain.img, W = img.w, H = img.h;
  const out = createRaster(W, H);
  const water = waterTile(opts.frame ?? 0, m.meta?.agua);
  const byName = new Map(m.objects.map((o) => [o.name, o]));
  // el abismo: los fondos (sin paralaje en la foto) donde no hay suelo ni agua
  const fondos = (m.meta?.fondo ?? []).map((f) => byName.get(f.id)?.anims.idle.frames[0]).filter((f): f is Raster => !!f);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, a = img.data[i + 3] / 255, w = ((y % TILE) * TILE + (x % TILE)) * 4;
    let under = [water.data[w], water.data[w + 1], water.data[w + 2]];
    if (fondos.length && a < 1 && !m.terrain.waterTiles[Math.floor(y / TILE) * m.w + Math.floor(x / TILE)]) {
      under = [4, 6, 12];
      for (const f of fondos) { const k = ((y % f.h) * f.w + (x % f.w)) * 4, fa = f.data[k + 3] / 255; for (let c = 0; c < 3; c++) under[c] = under[c] * (1 - fa) + f.data[k + c] * fa; }
    }
    for (let c = 0; c < 3; c++) out.data[i + c] = img.data[i + c] * a + under[c] * (1 - a);
    out.data[i + 3] = 255;
  }
  const frameOf = (o: WorldObject) => { const a = o.anims.idle ?? o.anims.girar ?? Object.values(o.anims)[0]; return a.frames[Math.min(a.frames.length - 1, opts.frame ?? 0)]; };
  const ground = m.decos.filter((d) => byName.get(d.sprite)?.layer === 'suelo');
  const front = m.decos.filter((d) => byName.get(d.sprite)?.layer === 'frente');
  const rest = m.decos.filter((d) => { const l = byName.get(d.sprite)?.layer; return l !== 'suelo' && l !== 'frente'; }).sort((a, b) => a.y - b.y);
  for (const d of ground) { const o = byName.get(d.sprite)!; over(out, frameOf(o), Math.round(d.x - o.anchor[0]), Math.round(d.y - o.anchor[1])); }
  // sombras horneadas: sobre el suelo y debajo de todo lo que se para en él (como las dibuja el juego)
  for (const d of rest) { const o = byName.get(d.sprite)!; if (o.shadow) drawShadow(out, o.shadow, Math.round(d.x - o.anchor[0]), Math.round(d.y - o.anchor[1])); }
  for (const d of rest) {
    const o = byName.get(d.sprite)!;
    over(out, frameOf(o), Math.round(d.x - o.anchor[0]), Math.round(d.y - o.anchor[1]));
  }
  // primer plano: encima de todo
  for (const d of front) { const o = byName.get(d.sprite)!; over(out, frameOf(o), Math.round(d.x - o.anchor[0]), Math.round(d.y - o.anchor[1])); }
  if (opts.entities) {
    const col: Record<string, string> = { enemigo: '#ff3a3a', jefe: '#ff00ff', cofre: '#ffd84a', jugador_inicio: '#3aff6a', thor_inicio: '#b5713a', portal_jefe: '#6cb4ff', portal_llegada: '#6cb4ff', rompible: '#c09460', cartel: '#ffffff', punto_guardado: '#ff8a1e' };
    for (const e of m.entities) {
      const hex = col[e.tipo] ?? '#ffffff', R = parseInt(hex.slice(1, 3), 16), G = parseInt(hex.slice(3, 5), 16), B = parseInt(hex.slice(5, 7), 16);
      for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
        const dd = dx * dx + dy * dy; if (dd > 36) continue;
        const X = e.x + dx, Y = e.y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const k = (Y * W + X) * 4; const edge = dd > 20;
        out.data[k] = edge ? 0 : R; out.data[k + 1] = edge ? 0 : G; out.data[k + 2] = edge ? 0 : B;
      }
    }
  }
  return out;
}

/** Recorte de la vista (una "pantalla" del juego) centrado en un punto. */
export function cropView(img: Raster, cx: number, cy: number, w = 960, h = 540): Raster {
  const x0 = Math.max(0, Math.min(img.w - w, Math.round(cx - w / 2))), y0 = Math.max(0, Math.min(img.h - h, Math.round(cy - h / 2)));
  const c = createRaster(w, h);
  for (let y = 0; y < h; y++) c.data.set(img.data.subarray(((y0 + y) * img.w + x0) * 4, ((y0 + y) * img.w + x0 + w) * 4), y * w * 4);
  return c;
}
