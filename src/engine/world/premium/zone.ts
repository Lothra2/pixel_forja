import { TILE } from '../tiles';
import { paintTerrain, forestFloor, distTo, GRASS, type TerrainDesign, type TP } from '../paint';
import type { BigMap, Deco } from '../bosqueMap';
import type { WorldObject } from '../objects';

/**
 * Zona premium: rehace una parte de un mundo con las reglas de realismo (piloto: el Bosque Profundo) sin tocar el
 * resto. El mundo se arma igual que siempre y después, solo adentro del rectángulo de la zona:
 *
 * 1. Relieve: el terreno se vuelve a pintar con una meseta y su rampa (el pintor ya sabe hacer la cara del
 *    acantilado, el pasto que cuelga, las grietas y la sombra al pie). Raíces que cuelgan de la cara.
 * 2. Árboles nuevos: 3 tamaños y 3 formas por especie, sin dos iguales cerca, con su sombra horneada.
 * 3. Un punto focal en cada pantalla (grupo armado: tronco con hongos, rocas con musgo, raíces, arbusto con flores).
 * 4. Calcomanías del suelo (al menos 6 por pantalla), caminos gastados (claros al centro, piedritas en el borde).
 * 5. Primer plano: ramas que cuelgan cerca de la cámara.
 *
 * Fuera del rectángulo no cambia ni un pixel ni un objeto: las decos, entidades y el suelo de afuera son los mismos.
 */

export interface PremiumZone {
  nombre: string;
  /** rectángulo en cuadros [x0, y0, x1, y1] (x1, y1 incluidos) */
  rect: [number, number, number, number];
  plateaus: TP[][];
  ramps: { x: number; y: number; w: number }[];
  seed: number;
  /** decos que se quedan como están (lugares, enemigos, secretos) */
  keep: (sprite: string) => boolean;
  /** campo de bosque oscuro (0 a 1) por cuadro: dónde van más árboles */
  darkAt: (tx: number, ty: number) => number;
}

/** Tamaño de una pantalla del juego en cuadros (para los puntos focales y la densidad de calcomanías). */
export const SCREEN = { w: 20, h: 11 };

function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const TREE = /^(pino_|roble_|arbol_seco_|arbol_hechizado_|sauce)/;
const SMALL = /^(arbusto_|roca$|roca_grande|tocon$|hongos$|telarana)/;

export interface ZoneReport { arboles: number; grupos: string[]; calcomanias: number; frente: number; pantallas: { x: number; y: number; focal: string[]; calcomanias: number }[] }

/**
 * Aplica la zona premium a un mapa ya armado. `design` es el diseño del terreno del mundo (se le suman la meseta y
 * la rampa de la zona), `objects` los objetos del mundo (con los premium adentro).
 */
export function applyPremiumZone(m: BigMap, design: TerrainDesign, z: PremiumZone, objects: WorldObject[]): ZoneReport {
  const W = m.w, H = m.h, r = rng(z.seed);
  const [rx0, ry0, rx1, ry1] = z.rect;
  const inRect = (tx: number, ty: number) => tx >= rx0 && tx <= rx1 && ty >= ry0 && ty <= ry1;
  const byName = new Map(objects.map((o) => [o.name, o]));
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : y * W + x);

  // ---------- 1. terreno con meseta y rampa ----------
  const t2 = paintTerrain({ ...design, plateaus: [...design.plateaus, ...z.plateaus], stairs: [...design.stairs, ...z.ramps.map((s) => ({ ...s, style: 'tierra' as const }))] });
  const PX0 = rx0 * TILE, PY0 = ry0 * TILE, PX1 = (rx1 + 1) * TILE, PY1 = (ry1 + 1) * TILE, IW = m.terrain.img.w;

  // ---------- 2. decos: se quitan los árboles y lo chico de la zona, se queda lo que importa ----------
  const keep: Deco[] = [], removed: Deco[] = [];
  for (const d of m.decos) {
    const tx = Math.floor(d.x / TILE), ty = Math.floor((d.y - 1) / TILE);
    if (inRect(tx, ty) && !z.keep(d.sprite) && (TREE.test(d.sprite) || SMALL.test(d.sprite))) removed.push(d);
    else keep.push(d);
  }
  m.decos = keep;
  // colisión de la zona: la del terreno nuevo más lo que se quedó
  const solid = m.solid;
  for (let ty = ry0; ty <= ry1; ty++) for (let tx = rx0; tx <= rx1; tx++) solid[at(tx, ty)] = t2.solid[at(tx, ty)];
  const occ = new Uint8Array(W * H);
  const mark = (sprite: string, px: number, py: number) => {
    const o = byName.get(sprite);
    if (!o) return;
    for (const s of [o.solid, ...(o.solids ?? [])]) {
      if (!s) continue;
      const x0 = Math.floor((px + s[0]) / TILE), x1 = Math.floor((px + s[0] + s[2] - 1) / TILE);
      const y0 = Math.floor((py + s[1]) / TILE), y1 = Math.floor((py + s[1] + s[3] - 1) / TILE);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (at(x, y) >= 0 && inRect(x, y)) solid[at(x, y)] = 1;
    }
    occ[at(Math.floor(px / TILE), Math.floor((py - 1) / TILE))] = 1;
  };
  for (const d of keep) if (inRect(Math.floor(d.x / TILE), Math.floor((d.y - 1) / TILE))) mark(d.sprite, d.x, d.y);
  // los caminos y las entidades no se tapan
  const kindT = (tx: number, ty: number) => t2.tileKind[at(tx, ty)];
  for (const e of m.entities) { const tx = Math.floor(e.x / TILE), ty = Math.floor(e.y / TILE); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(tx + dx, ty + dy) >= 0) occ[at(tx + dx, ty + dy)] = 1; }
  const freeGround = (tx: number, ty: number) => inRect(tx, ty) && at(tx, ty) >= 0 && !solid[at(tx, ty)] && !occ[at(tx, ty)] && !t2.waterTiles[at(tx, ty)] && kindT(tx, ty) === 0;
  const decos: Deco[] = [];
  const place = (sprite: string, px: number, py: number) => { decos.push({ sprite, x: Math.round(px), y: Math.round(py) }); mark(sprite, px, py); };
  const placeT = (sprite: string, tx: number, ty: number, jitter = 0) => place(sprite, tx * TILE + TILE / 2 + Math.round((r() - 0.5) * jitter), ty * TILE + TILE - 4 + Math.round((r() - 0.5) * jitter * 0.5));
  // camino: a menos de 2 cuadros no va nada alto
  const roadNear = (tx: number, ty: number, d = 2) => { for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) { const k = at(tx + dx, ty + dy); if (k >= 0 && (t2.tileKind[k] === 1 || t2.tileKind[k] === 5)) return true; } return false; };

  // ---------- 3. un punto focal por pantalla ----------
  const report: ZoneReport = { arboles: 0, grupos: [], calcomanias: 0, frente: 0, pantallas: [] };
  const GROUPS = ['claro_tronco_hongos', 'rocas_musgo_grupo', 'raices_expuestas', 'arbusto_flores_grupo'];
  const screens: { x: number; y: number }[] = [];
  for (let sy = ry0; sy <= ry1; sy += SCREEN.h) for (let sx = rx0; sx <= rx1; sx += SCREEN.w) screens.push({ x: sx, y: sy });
  let gi = Math.floor(r() * GROUPS.length);
  for (const sc of screens) {
    // en el medio de la pantalla, lejos del camino, donde entre el grupo (3 x 2 cuadros)
    const cx = Math.min(rx1 - 2, sc.x + Math.floor(SCREEN.w / 2)), cy = Math.min(ry1 - 1, sc.y + Math.floor(SCREEN.h / 2));
    let spot: [number, number] | null = null;
    for (let rad = 0; rad <= 6 && !spot; rad++) for (let dy = -rad; dy <= rad && !spot; dy++) for (let dx = -rad; dx <= rad && !spot; dx++) {
      const x = cx + dx, y = cy + dy;
      if ([-2, -1, 0, 1, 2].every((ox) => freeGround(x + ox, y) && freeGround(x + ox, y - 1) && !t2.tileHigh[at(x + ox, y)]) && !roadNear(x, y, 2)) spot = [x, y];
    }
    if (!spot) continue;
    const g = GROUPS[gi++ % GROUPS.length];
    placeT(g, spot[0], spot[1]);
    for (let dy = -2; dy <= 1; dy++) for (let dx = -3; dx <= 3; dx++) if (at(spot[0] + dx, spot[1] + dy) >= 0) occ[at(spot[0] + dx, spot[1] + dy)] = 1;
    report.grupos.push(g);
  }

  // ---------- 4. árboles: variedad de tamaño y forma, nunca dos iguales a menos de 3 cuadros ----------
  const trunk = new Uint8Array(W * H);
  const recent: { name: string; x: number; y: number }[] = [];
  const pickTree = (tx: number, ty: number, dark: number, hi: number): string => {
    const species = dark > 0.35 || hi ? (r() < 0.62 ? 'pino' : 'roble') : r() < 0.4 ? 'pino' : 'roble';
    // los viejos donde el bosque es más cerrado; los jóvenes en los bordes
    const sizeRoll = r() + dark * 0.35;
    const size = sizeRoll > 0.95 ? 2 : sizeRoll > 0.45 ? 1 : 0;
    for (let k = 0; k < 6; k++) {
      const name = `${species}_t${size}_${Math.floor(r() * 3)}`;
      if (!recent.some((q) => q.name === name && Math.abs(q.x - tx) <= 3 && Math.abs(q.y - ty) <= 3)) return name;
    }
    return `${species}_t${(size + 1) % 3}_${Math.floor(r() * 3)}`;
  };
  const order: number[] = [];
  for (let ty = ry0; ty <= ry1; ty++) for (let tx = rx0; tx <= rx1; tx++) order.push(at(tx, ty));
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  for (const i of order) {
    const tx = i % W, ty = Math.floor(i / W);
    if (!freeGround(tx, ty) || !freeGround(tx, ty + 1) || roadNear(tx, ty)) continue;
    const dark = z.darkAt(tx, ty);
    if (r() > 0.25 + dark * 0.5 + (t2.tileHigh[i] ? 0.25 : 0)) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => trunk[at(tx + dx, ty + dy)])) continue;
    // al pie de un acantilado no (la copa taparía la cara)
    if (!t2.tileHigh[i] && [1, 2].some((d) => t2.tileKind[at(tx, ty - d)] === 3)) continue;
    const name = pickTree(tx, ty, dark, t2.tileHigh[i]);
    placeT(name, tx, ty, 12);
    recent.push({ name, x: tx, y: ty });
    trunk[i] = 1; occ[i] = 1;
    report.arboles++;
  }
  // monte bajo en los bordes de la masa: arbustos y helechos
  for (const i of order) {
    const tx = i % W, ty = Math.floor(i / W);
    if (!freeGround(tx, ty) || roadNear(tx, ty, 1)) continue;
    let n = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (trunk[at(tx + dx, ty + dy)]) n++;
    if (n >= 2 && n <= 5 && r() < 0.22) { placeT(r() < 0.5 ? 'helecho' : `arbusto_verde_${r() < 0.5 ? 0 : 1}`, tx, ty, 10); occ[i] = 1; }
  }

  // ---------- 5. calcomanías: al menos 6 por pantalla ----------
  const DECALS = ['hojas_caidas_0', 'hojas_caidas_1', 'hojas_caidas_2', 'hojas_caidas_3', 'raiz_suelo_0', 'raiz_suelo_1', 'raiz_suelo_2', 'grieta_0', 'grieta_1', 'grieta_2', 'charco_chico_0', 'charco_chico_1', 'flores_suelo_0', 'flores_suelo_1', 'flores_suelo_2', 'flores_suelo_3', 'piedritas_0', 'piedritas_1', 'piedritas_2'];
  for (const sc of screens) {
    let n = 0, tries = 0;
    const want = 9;
    while (n < want && tries++ < 200) {
      const tx = sc.x + Math.floor(r() * SCREEN.w), ty = sc.y + Math.floor(r() * SCREEN.h);
      if (!inRect(tx, ty) || at(tx, ty) < 0 || t2.waterTiles[at(tx, ty)] || solid[at(tx, ty)]) continue;
      const k = t2.tileKind[at(tx, ty)];
      if (k !== 0 && k !== 1) continue;
      // en el camino: piedritas y grietas; en el pasto: todo
      const pool = k === 1 ? DECALS.filter((d) => d.startsWith('piedritas') || d.startsWith('grieta')) : DECALS;
      const name = pool[Math.floor(r() * pool.length)];
      decos.push({ sprite: name, x: tx * TILE + Math.floor(r() * TILE), y: ty * TILE + Math.floor(r() * TILE) });
      n++;
    }
    report.calcomanias += n;
    report.pantallas.push({ x: sc.x, y: sc.y, focal: [], calcomanias: n });
  }

  // ---------- 6. primer plano: ramas que cuelgan sobre la parte más cerrada del bosque de cada pantalla ----------
  // (lejos del camino: así con el paralaje se leen como ramas cercanas y no tapan por dónde se camina)
  for (const sc of screens) {
    let best: [number, number] | null = null, bestN = -1;
    for (let ty = sc.y; ty < Math.min(ry1, sc.y + SCREEN.h); ty++) for (let tx = sc.x + 3; tx < Math.min(rx1 - 3, sc.x + SCREEN.w - 3); tx++) {
      if (roadNear(tx, ty, 3)) continue;
      let n = 0;
      for (let dy = -2; dy <= 1; dy++) for (let dx = -4; dx <= 4; dx++) if (at(tx + dx, ty + dy) >= 0 && trunk[at(tx + dx, ty + dy)]) n++;
      if (n > bestN) { bestN = n; best = [tx, ty]; }
    }
    if (!best || bestN < 3) continue;
    decos.push({ sprite: ['frente_ramas_0', 'frente_ramas_1', 'frente_ramas_2'][Math.floor(r() * 3)], x: best[0] * TILE, y: Math.max(ry0 * TILE + 1, (best[1] - 4) * TILE) });
    report.frente++;
  }
  m.decos.push(...decos);
  // puntos focales por pantalla: grupos y lugares que ya estaban (hongos gigantes, el anillo)
  for (const p of report.pantallas) {
    p.focal = m.decos.filter((d) => {
      const tx = Math.floor(d.x / TILE), ty = Math.floor(d.y / TILE);
      return tx >= p.x && tx < p.x + SCREEN.w && ty >= p.y && ty < p.y + SCREEN.h && (GROUPS.includes(d.sprite) || d.sprite.startsWith('hongo_gigante') || d.sprite === 'anillo_hadas');
    }).map((d) => d.sprite);
  }

  // ---------- 7. suelo de bosque con los troncos nuevos, raíces que cuelgan y caminos gastados ----------
  const dd = new Float32Array(W * H);
  for (let ty = ry0; ty <= ry1; ty++) for (let tx = rx0; tx <= rx1; tx++) {
    let n = 0, c = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const j = at(tx + dx, ty + dy); if (j < 0) continue; c++; n += trunk[j]; }
    dd[at(tx, ty)] = Math.min(1, (n / c) * 3.2 + z.darkAt(tx, ty) * 0.5);
  }
  forestFloor(t2, W, H, dd, z.seed);
  wornPaths(t2.img.data, t2.kind, t2.img.w, t2.img.h, PX0, PY0, PX1, PY1, z.seed);
  // arriba de la meseta llega más luz: el pasto sube un tono (así la altura se lee también de lejos)
  {
    const idx = new Map(GRASS.map((h, i) => [parseInt(h.slice(1), 16), i]));
    const d = t2.img.data;
    for (let y = PY0; y < PY1; y++) for (let x = PX0; x < PX1; x++) {
      const i = y * t2.img.w + x;
      if (!t2.high[i] || t2.kind[i] !== 0) continue;
      const gi = idx.get((d[i * 4] << 16) | (d[i * 4 + 1] << 8) | d[i * 4 + 2]);
      if (gi === undefined) continue;
      const c = GRASS[Math.min(GRASS.length - 1, gi + 2)];
      d[i * 4] = parseInt(c.slice(1, 3), 16); d[i * 4 + 1] = parseInt(c.slice(3, 5), 16); d[i * 4 + 2] = parseInt(c.slice(5, 7), 16);
    }
  }
  hangingRoots(t2, PX0, PY0, PX1, PY1, z.seed);

  // ---------- 8. pegar la zona en la imagen del mundo, con borde suave (2 cuadros) ----------
  const F = 2 * TILE;
  const img = m.terrain.img.data, src = t2.img.data;
  for (let y = PY0; y < PY1; y++) for (let x = PX0; x < PX1; x++) {
    const edge = Math.min(x - PX0, PX1 - 1 - x, y - PY0, PY1 - 1 - y);
    const i = y * IW + x;
    // el relieve nuevo no se mezcla: donde el terreno cambia de tipo manda el nuevo
    const changed = t2.kind[i] !== m.terrain.kind[i] || t2.high[i] !== m.terrain.high[i];
    const t = changed ? 1 : Math.min(1, edge / F);
    // mezcla con tramado (no se promedian colores: el pixel art no tiene colores intermedios)
    const dith = ((x * 7 + y * 13) % 16) / 16;
    if (t >= 1 || dith < t) for (let c = 0; c < 4; c++) img[i * 4 + c] = src[i * 4 + c];
    m.terrain.kind[i] = t2.kind[i]; m.terrain.high[i] = t2.high[i];
  }
  for (let ty = ry0; ty <= ry1; ty++) for (let tx = rx0; tx <= rx1; tx++) {
    const k = at(tx, ty);
    m.terrain.tileKind[k] = t2.tileKind[k]; m.terrain.tileHigh[k] = t2.tileHigh[k]; m.terrain.waterTiles[k] = t2.waterTiles[k]; m.terrain.solid[k] = t2.solid[k];
  }
  // entidades que quedaron sobre el relieve nuevo: al cuadro libre más cercano
  for (const e of m.entities) {
    const tx = Math.floor(e.x / TILE), ty = Math.floor(e.y / TILE);
    if (!inRect(tx, ty) || !solid[at(tx, ty)]) continue;
    let done = false;
    for (let rad = 1; rad <= 6 && !done; rad++) for (let dy = -rad; dy <= rad && !done; dy++) for (let dx = -rad; dx <= rad && !done; dx++) {
      const k = at(tx + dx, ty + dy);
      if (k >= 0 && !solid[k] && !m.terrain.waterTiles[k]) { e.x = (tx + dx) * TILE + TILE / 2; e.y = (ty + dy) * TILE + TILE / 2; done = true; }
    }
  }
  void removed;
  return report;
}

/** Caminos gastados: más claros al centro (donde más se pisa) y piedritas sueltas en los bordes. */
function wornPaths(data: Uint8ClampedArray, kind: Uint8Array, W: number, H: number, x0: number, y0: number, x1: number, y1: number, seed: number) {
  const notRoad = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) notRoad[i] = kind[i] === 1 ? 0 : 1;
  const d = distTo(notRoad, W, H);
  const h = (x: number, y: number) => { let v = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0; v = Math.imul(v ^ (v >>> 13), 1274126177); return ((v ^ (v >>> 16)) >>> 0) / 4294967296; };
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = y * W + x;
    if (kind[i] !== 1) continue;
    const e = d[i], k = i * 4;
    // centro gastado: un poco más claro y cálido
    if (e >= 5) { data[k] = Math.min(255, data[k] + 10); data[k + 1] = Math.min(255, data[k + 1] + 8); data[k + 2] = Math.min(255, data[k + 2] + 4); }
    // piedritas en el borde, con su sombra abajo
    if (e >= 1 && e <= 3 && h(x >> 1, y >> 1) > 0.965) {
      data[k] = 0x93; data[k + 1] = 0x86; data[k + 2] = 0x74;
      const j = (i + W) * 4; if (y + 1 < H && kind[i + W] === 1) { data[j] = 0x26; data[j + 1] = 0x20; data[j + 2] = 0x1a; }
    }
  }
}

/** Raíces que cuelgan de la cara del acantilado (en el bosque las mesetas tienen árboles arriba). */
function hangingRoots(t: ReturnType<typeof paintTerrain>, x0: number, y0: number, x1: number, y1: number, seed: number) {
  const W = t.img.w, data = t.img.data;
  const h = (x: number, y: number) => { let v = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0; v = Math.imul(v ^ (v >>> 13), 1274126177); return ((v ^ (v >>> 16)) >>> 0) / 4294967296; };
  const ROOT = [[0x1e, 0x17, 0x16], [0x3c, 0x2d, 0x24], [0x4e, 0x3c, 0x2e]];
  for (let x = x0; x < x1; x += 1) {
    if (h(x >> 2, 1) < 0.86) continue;
    // primer pixel de cara de acantilado bajando por la columna
    for (let y = y0; y < y1; y++) {
      const i = y * W + x;
      if (t.kind[i] !== 3 || t.kind[i - W] === 3) continue;
      const len = 10 + Math.floor(h(x, 3) * 22);
      let cx = x;
      for (let k = 2; k < len && y + k < y1; k++) {
        if (h(x, k) > 0.8) cx += h(k, x) < 0.5 ? -1 : 1;
        const j = (y + k) * W + cx;
        if (t.kind[j] !== 3) break;
        const c = ROOT[k < 3 ? 2 : 1];
        data[j * 4] = c[0]; data[j * 4 + 1] = c[1]; data[j * 4 + 2] = c[2];
        const s = j + 1; if (t.kind[s] === 3) { data[s * 4] = ROOT[0][0]; data[s * 4 + 1] = ROOT[0][1]; data[s * 4 + 2] = ROOT[0][2]; }
      }
      break;
    }
  }
}
