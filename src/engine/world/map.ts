import { createRaster, blit, type Raster } from '../core/raster';
import { TILE, tilesetSheet, cornerMask, type Biome, type TilesetLayout } from './tiles';
import { forestObjects, type WorldObject } from './objects';
import { over } from '../loot/canvas';

/**
 * Mapa del Mundo 1 (Bosque GG) en formato Tiled (JSON, ortogonal, cuadros de 32 px).
 * Capas: suelo (pasto, flores, camino, agua animada), colision (cuadros sólidos), objetos (decorado con su sprite)
 * y entidades (inicio del jugador y de Thor, enemigos, cofres, jefe, portal, carteles).
 * Se arma con una semilla: el mismo número da el mismo mapa.
 */

export interface MapEntity { tipo: string; x: number; y: number; props?: Record<string, string | number | boolean> }
export interface MapDeco { sprite: string; x: number; y: number }

export interface WorldMap {
  name: string;
  biome: Biome;
  w: number;
  h: number;
  /** índice de cuadro (en el tileset) por celda */
  ground: number[];
  /** 1 = no se puede pasar */
  solid: number[];
  decos: MapDeco[];
  entities: MapEntity[];
  layout: TilesetLayout;
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Bosque GG: inicio abajo a la izquierda, camino que serpentea, laguna, claros con enemigos y la arena del minotauro arriba a la derecha. */
export function forestMap(seed = 7, W = 48, H = 32): WorldMap {
  const r = rng(seed);
  const { layout } = tilesetSheet('bosque');
  // camino: una curva por puntos de control (en vértices de la grilla)
  const ctrl: [number, number][] = [[4, H - 5], [12, H - 8], [18, H - 12], [16, H - 18], [24, H - 21], [32, H - 17], [38, H - 22], [40, 9]];
  const pathV = new Set<string>();
  const key = (x: number, y: number) => `${x},${y}`;
  for (let i = 0; i < ctrl.length - 1; i++) {
    const [ax, ay] = ctrl[i], [bx, by] = ctrl[i + 1];
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) * 2);
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const x = Math.round(ax + (bx - ax) * t + Math.sin(t * Math.PI) * (r() - 0.5) * 2), y = Math.round(ay + (by - ay) * t);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (Math.abs(dx) + Math.abs(dy) <= 1) pathV.add(key(x + dx, y + dy));
    }
  }
  // claros: inicio, dos de pelea y la arena del jefe
  const arena: [number, number] = [40, 7];
  const clearings: [number, number, number][] = [[5, H - 5, 4], [14, H - 14, 3.5], [30, H - 15, 4], [arena[0], arena[1], 6]];
  const inClearing = (x: number, y: number) => clearings.some(([cx, cy, cr]) => (x - cx) ** 2 + (y - cy) ** 2 <= cr * cr);
  // laguna
  const pond: [number, number] = [8, 9];
  const waterV = (x: number, y: number) => ((x - pond[0]) / 5.2) ** 2 + ((y - pond[1]) / 3.6) ** 2 <= 1 || ((x - 26) / 3) ** 2 + ((y - 6) / 2.2) ** 2 <= 1;
  const isPath = (x: number, y: number) => pathV.has(key(x, y)) && !waterV(x, y);
  const ground: number[] = [], solid: number[] = [];
  for (let ty = 0; ty < H; ty++)
    for (let tx = 0; tx < W; tx++) {
      const wm = cornerMask(waterV, tx, ty), pm = cornerMask(isPath, tx, ty);
      let t: number;
      if (wm) t = layout.water[0][wm];
      else if (pm) t = layout.path[pm];
      else t = r() < 0.07 ? layout.flowers[Math.floor(r() * layout.flowers.length)] : layout.ground[Math.floor(r() * 4)];
      ground.push(t);
      // agua: sólida si 3 o 4 esquinas son agua (se puede pisar la orilla)
      const wc = [1, 2, 4, 8].filter((b) => wm & b).length;
      solid.push(wc >= 3 ? 1 : 0);
    }
  const decos: MapDeco[] = [];
  const entities: MapEntity[] = [];
  const occupied = new Set<string>();
  const free = (tx: number, ty: number, rad = 1) => {
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      const x = tx + dx, y = ty + dy;
      if (x < 0 || y < 0 || x >= W || y >= H) return false;
      if (occupied.has(key(x, y)) || solid[y * W + x] || isPath(x, y) || isPath(x + 1, y + 1) || waterV(x, y) || waterV(x + 1, y + 1)) return false;
    }
    return true;
  };
  const mark = (tx: number, ty: number, rad = 1, isSolid = false) => {
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) occupied.add(key(tx + dx, ty + dy));
    if (isSolid) solid[ty * W + tx] = 1;
  };
  const px = (t: number) => t * TILE + TILE / 2;
  // lugar caminable más cercano (en espiral): nada aparece dentro del agua o de un árbol
  const walkable = (x: number, y: number) => x > 0 && y > 0 && x < W - 1 && y < H - 1 && !solid[y * W + x] && !waterV(x, y) && !waterV(x + 1, y + 1) && !waterV(x + 1, y) && !waterV(x, y + 1) && !occupied.has(key(x, y));
  const near = (tx: number, ty: number): [number, number] => {
    for (let rad = 0; rad < 8; rad++) for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== rad) continue;
      if (walkable(tx + dx, ty + dy)) return [tx + dx, ty + dy];
    }
    return [tx, ty];
  };
  // borde: muro de árboles (no se puede salir del mapa)
  for (let tx = 0; tx < W; tx += 2) for (const ty of [0, H - 1]) { decos.push({ sprite: r() < 0.5 ? 'arbol_pino_0' : 'arbol_roble_0', x: px(tx), y: ty === 0 ? px(ty) + 8 : px(ty) }); mark(tx, ty, 0, true); solid[ty * W + tx + 1] = 1; }
  for (let ty = 0; ty < H; ty += 2) for (const tx of [0, W - 1]) { decos.push({ sprite: r() < 0.5 ? 'arbol_pino_1' : 'arbol_roble_1', x: px(tx), y: px(ty) }); mark(tx, ty, 0, true); if (ty + 1 < H) solid[(ty + 1) * W + tx] = 1; }
  // arena del jefe: anillo de piedras paradas y la cueva detrás (el camino hacia abajo)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const tx = Math.round(arena[0] + Math.cos(a) * 5), ty = Math.round(arena[1] + Math.sin(a) * 4);
    if (tx > 1 && ty > 1 && tx < W - 2 && ty < H - 2 && !isPath(tx, ty)) { decos.push({ sprite: 'piedra_arena', x: px(tx), y: px(ty) }); mark(tx, ty, 0, true); }
  }
  decos.push({ sprite: 'cueva', x: px(arena[0]), y: px(arena[1] - 4) + 12 });
  for (let dx = -1; dx <= 1; dx++) { solid[(arena[1] - 4) * W + arena[0] + dx] = 1; occupied.add(key(arena[0] + dx, arena[1] - 4)); occupied.add(key(arena[0] + dx, arena[1] - 5)); }
  entities.push({ tipo: 'jefe', x: px(arena[0]), y: px(arena[1] + 1), props: { enemigo: 'minotauro', nombre: 'Minotauro del Bosque' } });
  entities.push({ tipo: 'portal_jefe', x: px(arena[0]), y: px(arena[1] - 2), props: { color: 'azul', destino: 'mundo2' } });
  entities.push({ tipo: 'cofre', x: px(arena[0] + 3), y: px(arena[1] - 2), props: { nivel: 'legendario', tras_jefe: true } });
  mark(arena[0], arena[1], 5);
  // inicio: fogata, cartel y el portal de llegada
  const start: [number, number] = [5, H - 5];
  entities.push({ tipo: 'jugador_inicio', x: px(start[0]), y: px(start[1]) });
  entities.push({ tipo: 'thor_inicio', x: px(start[0] - 1), y: px(start[1] + 1) });
  entities.push({ tipo: 'portal_llegada', x: px(start[0] - 2), y: px(start[1] - 1), props: { color: 'azul' } });
  decos.push({ sprite: 'fogata', x: px(start[0] + 2), y: px(start[1]) }); solid[start[1] * W + start[0] + 2] = 1;
  decos.push({ sprite: 'cartel', x: px(start[0] + 3), y: px(start[1] - 2) });
  entities.push({ tipo: 'cartel', x: px(start[0] + 3), y: px(start[1] - 2), props: { texto: '¡Bienvenida al Bosque GG! El minotauro te espera al norte.' } });
  mark(start[0], start[1], 3);
  // enemigos por zonas: ratas cerca del inicio, calabazas al medio, goblins antes del jefe
  const groups: [string, number, number, number][] = [['rata', 14, H - 14, 3], ['rata', 20, H - 7, 2], ['calabaza', 30, H - 15, 3], ['calabaza', 22, H - 22, 2], ['goblin_arquero', 34, 13, 3], ['goblin_arquero', 28, 8, 2], ['rata', 10, 16, 2]];
  for (const [kind, cx, cy, n] of groups) for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = 0.5 + r() * 1.6;
    const [ex, ey] = near(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d));
    occupied.add(key(ex, ey));
    entities.push({ tipo: 'enemigo', x: px(ex), y: px(ey), props: { enemigo: kind } });
  }
  // cofres y cosas que se rompen
  const chests: [number, number, string][] = [[14, H - 16, 'madera'], [30, H - 12, 'reforzado'], [12, 13, 'dorado'], [44, 26, 'madera']];
  for (const [cx, cy, nivel] of chests) { const [tx, ty] = near(cx, cy); entities.push({ tipo: 'cofre', x: px(tx), y: px(ty), props: { nivel } }); mark(tx, ty, 0, true); }
  for (const [cx, cy, k] of [[17, H - 9, 'barril'], [18, H - 9, 'caja'], [31, H - 18, 'vasija'], [33, H - 18, 'caja'], [36, 15, 'barril']] as [number, number, string][]) {
    const [tx, ty] = near(cx, cy);
    entities.push({ tipo: 'rompible', x: px(tx), y: px(ty), props: { objeto: k } }); mark(tx, ty, 0, true);
  }
  // decorado: árboles, arbustos, rocas, hongos y pasto alto por todo el resto
  const pool: [string, number, boolean][] = [['arbol_roble_0', 0.16, true], ['arbol_roble_1', 0.12, true], ['arbol_roble_2', 0.06, true], ['arbol_pino_0', 0.12, true], ['arbol_pino_1', 0.06, true], ['arbusto', 0.1, true], ['arbusto_moras', 0.05, true], ['roca', 0.07, true], ['roca_grande', 0.04, true], ['tocon', 0.04, true], ['troncos', 0.03, true], ['hongos', 0.06, false], ['pasto_alto', 0.09, false]];
  const pick = () => { let x = r(); for (const [s, p, so] of pool) { if ((x -= p) <= 0) return [s, so] as const; } return ['arbusto', true] as const; };
  // bosquecitos: grupos de árboles alrededor de unos centros, y decorado suelto en el resto
  const groves: [number, number][] = Array.from({ length: 9 }, () => [2 + Math.floor(r() * (W - 4)), 2 + Math.floor(r() * (H - 4))]);
  for (const [gx, gy] of groves) for (let i = 0; i < 14; i++) {
    const tx = Math.round(gx + (r() - 0.5) * 7), ty = Math.round(gy + (r() - 0.5) * 5);
    if (tx < 1 || ty < 1 || tx >= W - 1 || ty >= H - 1 || inClearing(tx, ty) || !free(tx, ty, 1)) continue;
    const s = r() < 0.55 ? `arbol_roble_${Math.floor(r() * 3)}` : `arbol_pino_${Math.floor(r() * 2)}`;
    decos.push({ sprite: s, x: px(tx), y: px(ty) });
    mark(tx, ty, 1, true);
  }
  for (let i = 0; i < W * H * 0.14; i++) {
    const tx = 1 + Math.floor(r() * (W - 2)), ty = 1 + Math.floor(r() * (H - 2));
    if (inClearing(tx, ty) || !free(tx, ty, 1)) continue;
    const [s, so] = pick();
    decos.push({ sprite: s, x: px(tx), y: px(ty) });
    mark(tx, ty, s.startsWith('arbol') ? 1 : 0, so);
  }
  // antorchas a la entrada de la arena
  decos.push({ sprite: 'antorcha', x: px(arena[0] - 2), y: px(arena[1] + 6) }, { sprite: 'antorcha', x: px(arena[0] + 2), y: px(arena[1] + 6) });
  return { name: 'mundo1_bosque', biome: 'bosque', w: W, h: H, ground, solid, decos, entities, layout };
}

/** El mapa en formato Tiled JSON (cargable con this.load.tilemapTiledJSON en Phaser). */
export function toTiledJson(m: WorldMap, tilesetImage: string, tilesetW: number, tilesetH: number): Record<string, unknown> {
  const cols = 8;
  const tilecount = (tilesetW / TILE) * (tilesetH / TILE);
  const solidGid = tilecount + 1; // cuadro extra del tileset de colisión
  // animación del agua: cada cuadro de agua del cuadro 0 pasa por los 4
  const tiles: Record<string, unknown>[] = [];
  for (let m4 = 0; m4 < 16; m4++) tiles.push({ id: m.layout.water[0][m4], animation: [0, 1, 2, 3].map((f) => ({ tileid: m.layout.water[f][m4], duration: 260 })) });
  let oid = 1;
  return {
    type: 'map', version: '1.10', tiledversion: '1.10.2', orientation: 'orthogonal', renderorder: 'right-down', infinite: false,
    width: m.w, height: m.h, tilewidth: TILE, tileheight: TILE, nextlayerid: 5, nextobjectid: m.decos.length + m.entities.length + 1,
    properties: [{ name: 'bioma', type: 'string', value: m.biome }, { name: 'musica', type: 'string', value: 'bosque' }],
    tilesets: [
      { firstgid: 1, name: 'mundo1_tiles', image: tilesetImage, imagewidth: tilesetW, imageheight: tilesetH, tilewidth: TILE, tileheight: TILE, columns: cols, tilecount, margin: 0, spacing: 0, tiles },
      { firstgid: solidGid, name: 'colision', image: 'colision.png', imagewidth: TILE, imageheight: TILE, tilewidth: TILE, tileheight: TILE, columns: 1, tilecount: 1, margin: 0, spacing: 0 },
    ],
    layers: [
      { id: 1, name: 'suelo', type: 'tilelayer', width: m.w, height: m.h, x: 0, y: 0, opacity: 1, visible: true, data: m.ground.map((t) => t + 1) },
      { id: 2, name: 'colision', type: 'tilelayer', width: m.w, height: m.h, x: 0, y: 0, opacity: 0.4, visible: false, data: m.solid.map((s) => (s ? solidGid : 0)) },
      { id: 3, name: 'objetos', type: 'objectgroup', x: 0, y: 0, opacity: 1, visible: true, draworder: 'topdown', objects: m.decos.map((d) => ({ id: oid++, name: d.sprite, type: 'deco', x: d.x, y: d.y, width: 0, height: 0, rotation: 0, visible: true, point: true, properties: [{ name: 'sprite', type: 'string', value: d.sprite }] })) },
      { id: 4, name: 'entidades', type: 'objectgroup', x: 0, y: 0, opacity: 1, visible: true, draworder: 'topdown', objects: m.entities.map((e) => ({ id: oid++, name: e.tipo, type: e.tipo, x: e.x, y: e.y, width: 0, height: 0, rotation: 0, visible: true, point: true, properties: Object.entries(e.props ?? {}).map(([name, value]) => ({ name, type: typeof value === 'number' ? 'float' : typeof value === 'boolean' ? 'bool' : 'string', value })) })) },
    ],
  };
}

/** Vista previa del mapa: suelo, decorado ordenado por profundidad y marcas de entidades. */
export function renderMapPreview(m: WorldMap, tileset: Raster, objects: WorldObject[] = forestObjects()): Raster {
  const out = createRaster(m.w * TILE, m.h * TILE);
  for (let i = 0; i < m.ground.length; i++) {
    const t = m.ground[i], tx = (i % m.w) * TILE, ty = Math.floor(i / m.w) * TILE;
    const sx = (t % 8) * TILE, sy = Math.floor(t / 8) * TILE;
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const s = ((sy + y) * tileset.w + sx + x) * 4, d = ((ty + y) * out.w + tx + x) * 4;
      for (let c = 0; c < 4; c++) out.data[d + c] = tileset.data[s + c];
    }
  }
  const byName = new Map(objects.map((o) => [o.name, o]));
  const drawn = [...m.decos].sort((a, b) => a.y - b.y);
  for (const d of drawn) {
    const o = byName.get(d.sprite);
    if (!o) continue;
    const anim = o.anims.idle ?? Object.values(o.anims)[0];
    over(out, anim.frames[0], Math.round(d.x - o.anchor[0]), Math.round(d.y - o.anchor[1]));
  }
  const dot = (x: number, y: number, hex: string) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) if (dx * dx + dy * dy <= 16) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= out.w || Y >= out.h) continue; const i = (Y * out.w + X) * 4; out.data[i] = parseInt(hex.slice(1, 3), 16); out.data[i + 1] = parseInt(hex.slice(3, 5), 16); out.data[i + 2] = parseInt(hex.slice(5, 7), 16); out.data[i + 3] = 255; } };
  const col: Record<string, string> = { enemigo: '#ff3a3a', jefe: '#ff00ff', cofre: '#ffd84a', jugador_inicio: '#3aff6a', thor_inicio: '#b5713a', portal_jefe: '#6cb4ff', portal_llegada: '#6cb4ff', rompible: '#c09460', cartel: '#ffffff' };
  for (const e of m.entities) dot(Math.round(e.x), Math.round(e.y), col[e.tipo] ?? '#ffffff');
  void blit;
  return out;
}
