import { TILE } from '../tiles';
import { distTo, type PaintedTerrain } from '../paint';
import type { BigMap, Deco } from '../bosqueMap';
import type { WorldObject } from '../objects';

/**
 * El motor de colocación de los mundos premium: mira la forma real de cada dibujo en celdas de 4 px y decide si un
 * objeto entra sin quedar montado. Lo usan el Bosque (premium/zone.ts) y la Catedral (premium/catedral.ts).
 *
 * - El pie de un objeto nunca queda tapado y su cuerpo nunca tapa el pie de otro (en el dosel, entre árboles del
 *   dosel sí).
 * - Dos cuerpos se pisan como mucho un 12 % del más chico (en el dosel, la mitad).
 * - Nada tapa la cara de un acantilado o muro ni una rampa o escalera. Lo de abajo no se mete arriba de una meseta.
 * - Lo de arriba de una meseta queda lejos del borde y su sombra cae sobre la meseta.
 * - El pie no va en el camino ni pegado a las entidades, y nada sólido va en lo que el diseño deja libre.
 */

/** Celda de la grilla de colocación (px). */
export const CELL = 4;

/** La forma de un objeto en celdas de 4 px, relativa a su apoyo: cuerpo, pie y sombra. */
export interface Footprint { body: [number, number][]; foot: [number, number][]; shadow: [number, number][] }

export function footprint(o: WorldObject): Footprint {
  const f = (o.anims.idle ?? Object.values(o.anims)[0]).frames[0];
  const [ax, ay] = o.anchor;
  const cnt = new Map<string, number>(), sh = new Map<string, number>();
  const key = (cx: number, cy: number) => `${cx},${cy}`;
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
    const k = key(Math.floor((x - ax) / CELL), Math.floor((y - ay) / CELL));
    if (f.data[(y * f.w + x) * 4 + 3] > 128) cnt.set(k, (cnt.get(k) ?? 0) + 1);
    if (o.shadow && o.shadow.data[(y * f.w + x) * 4 + 3] > 50) sh.set(k, (sh.get(k) ?? 0) + 1);
  }
  const cells = (m: Map<string, number>, min: number) => [...m].filter(([, n]) => n >= min).map(([k]) => k.split(',').map(Number) as [number, number]);
  const body = cells(cnt, 4);
  // el pie: lo que toca el piso (las 2 filas de celdas de arriba del apoyo y la de abajo)
  // (el punto de apoyo cuenta siempre, aunque el dibujo sea fino como un poste)
  const foot = body.filter(([, cy]) => cy >= -2 && cy <= 0);
  for (const c of [[0, -1], [-1, -1]] as [number, number][]) if (!foot.some((q) => q[0] === c[0] && q[1] === c[1])) foot.push(c);
  for (const c of foot) if (!body.some((q) => q[0] === c[0] && q[1] === c[1])) body.push(c);
  return { body, foot, shadow: cells(sh, 6) };
}

interface Rules { maxOverlap?: number; roadGap?: number; maxRoad?: number; edge?: number; onlyHigh?: boolean; onlyLow?: boolean; dosel?: boolean }

/** Pantalla del juego en cuadros (para los puntos focales y las calcomanías). */
export const SCREEN = { w: 20, h: 11 };

export interface PlacerArgs {
  m: BigMap;
  /** el terreno sobre el que se coloca (ya pintado) */
  t2: PaintedTerrain;
  byName: Map<string, WorldObject>;
  /** lo que ya está y se queda (cuenta para no montar nada encima) */
  keep: Deco[];
  /** colisión del mundo (se le suma lo que se coloca) */
  solid: Uint8Array;
  /** cuadros de cofres y rompibles: nada sólido encima */
  special: Uint8Array;
  /** cuadros que el diseño deja libres: nada sólido encima */
  clear: Uint8Array;
  /** lo hecho a mano: los grupos focales no se le arriman */
  designed: Deco[];
  /** oscuridad del lugar (0 a 1) por cuadro */
  darkOf: (tx: number, ty: number) => number;
  /** calcomanías posibles según el piso (camino o no) y si el lugar es húmedo y oscuro */
  decalPool: (road: boolean, wet: boolean) => string[];
}

export type Placer = ReturnType<typeof createPlacer>;

export function createPlacer({ m, t2, byName, keep, solid, special, clear, designed, darkOf, decalPool }: PlacerArgs) {
  const W = m.w, H = m.h;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : y * W + x);
  const tileOf = (px: number, py: number) => at(Math.floor(px / TILE), Math.floor((py - 1) / TILE));
  const IW = t2.img.w, IH = t2.img.h;
  const pix = (x: number, y: number) => (x < 0 || y < 0 || x >= IW || y >= IH ? -1 : y * IW + x);
  const boxTiles = (sprite: string, px: number, py: number, fn: (k: number) => void) => {
    const o = byName.get(sprite);
    if (!o) return;
    for (const b of [o.solid, ...(o.solids ?? [])]) {
      if (!b) continue;
      for (let ty = Math.floor((py + b[1]) / TILE); ty <= Math.floor((py + b[1] + b[3] - 1) / TILE); ty++) for (let tx = Math.floor((px + b[0]) / TILE); tx <= Math.floor((px + b[0] + b[2] - 1) / TILE); tx++) { const k = at(tx, ty); if (k >= 0) fn(k); }
    }
  };

  const GW = Math.ceil(IW / CELL), GH = Math.ceil(IH / CELL);
  // body: de quién es cada celda (-1 nadie); foot: 1 pie de un objeto, 2 pie de un árbol del dosel
  // cuerpos por celda: una lista (en el dosel una celda puede tener varios dueños)
  const head = new Int32Array(GW * GH).fill(-1), foot = new Uint8Array(GW * GH), decal = new Uint8Array(GW * GH);
  let nodeId = new Int32Array(1 << 20), nodeNext = new Int32Array(1 << 20), nodes = 0;
  const addOwner = (g: number, id: number) => {
    if (nodes === nodeId.length) { const a = new Int32Array(nodes * 2), b = new Int32Array(nodes * 2); a.set(nodeId); b.set(nodeNext); nodeId = a; nodeNext = b; }
    nodeId[nodes] = id; nodeNext[nodes] = head[g]; head[g] = nodes++;
  };
  const areas: number[] = [], isDosel: boolean[] = [];
  const fps = new Map<string, Footprint>();
  const fpOf = (n: string) => { let f = fps.get(n); if (!f) { f = footprint(byName.get(n)!); fps.set(n, f); } return f; };
  const gAt = (px: number, py: number, c: [number, number]) => { const gx = Math.floor(px / CELL) + c[0], gy = Math.floor(py / CELL) + c[1]; return gx < 0 || gy < 0 || gx >= GW || gy >= GH ? -1 : gy * GW + gx; };
  const kindAtG = (g: number) => t2.kind[pix((g % GW) * CELL + 2, Math.floor(g / GW) * CELL + 2)];
  const highAtG = (g: number) => t2.high[pix((g % GW) * CELL + 2, Math.floor(g / GW) * CELL + 2)];
  const roadMask = new Uint8Array(IW * IH), lowMask = new Uint8Array(IW * IH);
  for (let i = 0; i < IW * IH; i++) { roadMask[i] = t2.kind[i] === 1 || t2.kind[i] === 5 || t2.kind[i] === 2 ? 1 : 0; lowMask[i] = t2.high[i] ? 0 : 1; }
  const dRoad = distTo(roadMask, IW, IH), dEdge = distTo(lowMask, IW, IH);
  const register = (sprite: string, px: number, py: number, dosel = false) => {
    const o = byName.get(sprite);
    if (!o || o.layer === 'suelo' || o.layer === 'frente' || o.layer === 'fondo') return;
    const f = fpOf(sprite);
    const id = areas.length;
    areas.push(f.body.length); isDosel.push(dosel);
    for (const c of f.body) { const g = gAt(px, py, c); if (g >= 0) addOwner(g, id); }
    for (const c of f.foot) { const g = gAt(px, py, c); if (g >= 0 && foot[g] !== 1) foot[g] = dosel ? 2 : 1; }
  };
  for (const d of keep) register(d.sprite, d.x, d.y);
  const ents = m.entities;

  let allowed: (tx: number, ty: number) => boolean = () => true;
  const fits = (sprite: string, px: number, py: number, ru: Rules = {}): boolean => {
    px = Math.round(px); py = Math.round(py);
    const f = fpOf(sprite);
    const ai = pix(px, py - 1);
    if (ai < 0) return false;
    const tk = tileOf(px, py);
    if (!allowed(tk % W, Math.floor(tk / W))) return false;
    const hi = t2.high[ai];
    if ((ru.onlyHigh && !hi) || (ru.onlyLow && hi)) return false;
    if (t2.kind[ai] !== 0) return false;
    if (hi && dEdge[ai] < (ru.edge ?? 12)) return false;
    if (dRoad[ai] < (ru.roadGap ?? 10)) return false;
    for (const e of ents) if (Math.abs(e.x - px) < 22 && Math.abs(e.y - py) < 18) return false;
    const o = byName.get(sprite)!;
    if (o.solid || o.solids) { let bad = false; boxTiles(sprite, px, py, (k) => { if (clear[k] || special[k]) bad = true; }); if (bad || clear[tk]) return false; }
    for (const c of f.foot) {
      const g = gAt(px, py, c);
      if (g < 0 || foot[g]) return false;
      // nadie encima del pie (en el dosel, solo otros árboles del dosel)
      for (let q = head[g]; q >= 0; q = nodeNext[q]) if (!(ru.dosel && isDosel[nodeId[q]])) return false;
      if (kindAtG(g) !== 0 || highAtG(g) !== hi) return false;
    }
    let road = 0, cross = 0;
    const ov = new Map<number, number>();
    for (const c of f.body) {
      const g = gAt(px, py, c);
      if (g < 0) continue;
      if (foot[g] === 1 || (foot[g] === 2 && !ru.dosel)) return false; // nunca tapa el pie de otro
      for (let q = head[g]; q >= 0; q = nodeNext[q]) ov.set(nodeId[q], (ov.get(nodeId[q]) ?? 0) + 1);
      const k = kindAtG(g);
      if (k === 3 || k === 5) return false; // la cara del acantilado y la rampa siempre se ven
      if (k === 1 || k === 2) road++;
      if (!hi && highAtG(g)) cross++;
    }
    const n = f.body.length;
    for (const [id, k] of ov) {
      // con cada vecino por separado: lo que se pisan no pasa del 12 % del más chico (en el dosel, la mitad)
      const lim = ru.dosel && isDosel[id] ? 0.5 : (ru.maxOverlap ?? 0.12);
      if (k > Math.min(n, areas[id]) * lim) return false;
    }
    if (road > n * (ru.maxRoad ?? 0.2)) return false;
    if (cross > n * 0.02) return false;
    if (f.shadow.length && !ru.dosel) {
      let off = 0;
      for (const c of f.shadow) { const g = gAt(px, py, c); if (g < 0) continue; const k = kindAtG(g); if (k === 3 || k === 5 || highAtG(g) !== hi) off++; }
      if (off > f.shadow.length * (hi ? 0.2 : 0.15)) return false;
    }
    return true;
  };
  const decos: Deco[] = [];
  const trunk = new Uint8Array(W * H);
  const placed: { d: Deco; dosel: boolean; tree: boolean }[] = [];
  const place = (sprite: string, px: number, py: number, opts: { dosel?: boolean; tree?: boolean } = {}) => {
    px = Math.round(px); py = Math.round(py);
    const d = { sprite, x: px, y: py };
    decos.push(d);
    placed.push({ d, dosel: !!opts.dosel, tree: !!opts.tree });
    register(sprite, px, py, opts.dosel);
    boxTiles(sprite, px, py, (k) => { solid[k] = 1; });
    if (opts.tree) trunk[tileOf(px, py)] = 1;
  };
  const hv = (x: number, y: number, s: number) => { let v = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; v = Math.imul(v ^ (v >>> 13), 1274126177); return ((v ^ (v >>> 16)) >>> 0) / 4294967296; };
  const noise = (px: number, py: number, C: number, s: number) => {
    const gx = px / C, gy = py / C, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = hv(x0, y0, s), b = hv(x0 + 1, y0, s), c = hv(x0, y0 + 1, s), d = hv(x0 + 1, y0 + 1, s);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
  const recent: { name: string; x: number; y: number }[] = [];
  const pickTree = (r: () => number, tx: number, ty: number, dark: number, hi: number, size: number): string => {
    const species = dark > 0.35 || hi ? (r() < 0.6 ? 'pino' : 'roble') : r() < 0.4 ? 'pino' : 'roble';
    // la especie y el tamaño que tocan primero; si las 3 formas ya están cerca, la otra especie; si no, nada
    const s0 = Math.floor(r() * 3);
    for (const sp of [species, species === 'pino' ? 'roble' : 'pino']) for (let k = 0; k < 3; k++) {
      const name = `${sp}_t${size}_${(s0 + k) % 3}`;
      if (!recent.some((q) => q.name === name && Math.abs(q.x - tx) <= 3 && Math.abs(q.y - ty) <= 3)) return name;
    }
    return '';
  };
  const plantTree = (name: string, px: number, py: number) => { place(name, px, py, { tree: true }); recent.push({ name, x: Math.floor(px / TILE), y: Math.floor((py - 1) / TILE) }); };

  // calcomanías de una pantalla: sin pisarse y a la vista
  const decalFits = (name: string, px: number, py: number, road: boolean, X0: number, Y0: number, X1: number, Y1: number) => {
    const o = byName.get(name)!, f = o.anims.idle.frames[0];
    for (let y = 0; y < f.h; y += 2) for (let x = 0; x < f.w; x += 2) {
      if (f.data[(y * f.w + x) * 4 + 3] < 128) continue;
      const X = Math.round(px - o.anchor[0] + x), Y = Math.round(py - o.anchor[1] + y), i = pix(X, Y);
      if (i < 0 || X < X0 || Y < Y0 || X >= X1 || Y >= Y1) return false;
      const k = t2.kind[i];
      if (road ? k !== 1 : k !== 0) return false;
      const g = Math.floor(Y / CELL) * GW + Math.floor(X / CELL);
      if (head[g] >= 0 || decal[g]) return false;
    }
    return true;
  };
  const decalsFor = (r: () => number, sc: { x: number; y: number }, want: number, X0: number, Y0: number, X1: number, Y1: number) => {
    let n = 0, tries = 0;
    while (n < want && tries++ < 700) {
      const px = (sc.x + r() * SCREEN.w) * TILE, py = (sc.y + r() * SCREEN.h) * TILE;
      const i = pix(Math.round(px), Math.round(py));
      if (i < 0) continue;
      const road = t2.kind[i] === 1;
      const wet = darkOf(Math.floor(px / TILE), Math.floor(py / TILE)) > 0.3;
      const pool = decalPool(road, wet);
      const name = pool[Math.floor(r() * pool.length)];
      if (!decalFits(name, px, py, road, X0, Y0, X1, Y1)) continue;
      const o = byName.get(name)!;
      for (let y = 0; y < o.h; y += CELL) for (let x = 0; x < o.w; x += CELL) { const g = Math.floor((py - o.anchor[1] + y) / CELL) * GW + Math.floor((px - o.anchor[0] + x) / CELL); if (g >= 0 && g < decal.length) decal[g] = 1; }
      decos.push({ sprite: name, x: Math.round(px), y: Math.round(py) });
      n++;
    }
    return n;
  };
  const focalGroup = (g: string, sc: { x: number; y: number }, x1: number, y1: number) => {
    const cx = ((Math.min(x1 + 1, sc.x + SCREEN.w) + sc.x) / 2) * TILE, cy = ((Math.min(y1 + 1, sc.y + SCREEN.h) + sc.y) / 2) * TILE;
    // primero en lo bajo y lejos del camino; si no hay lugar, también arriba y un poco más cerca del camino
    for (const ru of [{ roadGap: 24, onlyLow: true, maxOverlap: 0 }, { roadGap: 14, maxOverlap: 0 }] as Rules[])
      for (let rad = 0; rad <= 9 * TILE; rad += 6) for (let a = 0; a < 16; a++) {
        const px = cx + Math.cos((a / 16) * Math.PI * 2) * rad, py = cy + Math.sin((a / 16) * Math.PI * 2) * rad * 0.7;
        if (Math.floor(px / TILE) < sc.x || Math.floor(px / TILE) >= sc.x + SCREEN.w || Math.floor(py / TILE) < sc.y || Math.floor(py / TILE) >= sc.y + SCREEN.h) continue;
        if (designed.some((d) => Math.abs(d.x - px) < 4 * TILE && Math.abs(d.y - py) < 4 * TILE)) continue;
        if (fits(g, px, py, ru)) { place(g, px, py); return true; }
      }
    return false;
  };
  const undergrowthNear = (r: () => number, list: string[], trees: Deco[], tries: number) => {
    for (let t = 0; t < tries; t++) {
      const base = trees[Math.floor(r() * trees.length)];
      if (!base) break;
      const a = r() * Math.PI * 2, d = 18 + r() * 34;
      const px = base.x + Math.cos(a) * d, py = base.y + Math.sin(a) * d * 0.6;
      const name = list[Math.floor(r() * list.length)];
      if (r() < 0.55 && fits(name, px, py, { roadGap: 8, maxOverlap: 0.1, edge: 10 })) place(name, px, py);
    }
  };

  return {
    fits, place, register, boxTiles, fpOf, hv, noise, pickTree, plantTree, decalsFor, focalGroup, undergrowthNear,
    setAllowed: (fn: (tx: number, ty: number) => boolean) => { allowed = fn; },
    placed, decos, trunk, recent, at, tileOf, pix,
  };
}
