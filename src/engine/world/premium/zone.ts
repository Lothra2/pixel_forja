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
  /** decos que se quedan como están (carteles, fogatas, lugares). Todo lo demás de la zona se vuelve a colocar */
  keep: (sprite: string) => boolean;
  /** lugares que se colocan con el mismo cuidado que los árboles (hongos gigantes, árboles hechizados...) */
  landmarks: { sprite: string; n: number }[];
  /** monte bajo que va al pie de los árboles */
  undergrowth: string[];
  /** primer plano de la zona: el juego lo pega a los bordes de la pantalla (no va en el mapa) */
  frente: string[];
  /** campo de bosque oscuro (0 a 1) por cuadro: dónde van más árboles */
  darkAt: (tx: number, ty: number) => number;
}

/** Tamaño de una pantalla del juego en cuadros (para los puntos focales y la densidad de calcomanías). */
export const SCREEN = { w: 20, h: 11 };

function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export interface ZoneReport {
  arboles: number;
  grupos: string[];
  calcomanias: number;
  /** primer plano declarado para la zona (va a los bordes de la pantalla) */
  frente: string[];
  /** lugares que no entraron (se avisa: no se encajan a la fuerza) */
  sinLugar: string[];
  pantallas: { x: number; y: number; focal: string[]; calcomanias: number }[];
}

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
  const foot = body.filter(([, cy]) => cy >= -2 && cy <= 0);
  return { body, foot: foot.length ? foot : [[0, -1]], shadow: cells(sh, 6) };
}

/**
 * Aplica la zona premium a un mapa ya armado. `design` es el diseño del terreno del mundo (se le suman la meseta y
 * la rampa de la zona), `objects` los objetos del mundo (con los premium adentro).
 *
 * Todo lo que se para en el piso se coloca con las mismas reglas (para que nada quede "montado"):
 * - el pie de un objeto nunca queda tapado por otro, y su cuerpo nunca tapa el pie de otro;
 * - dos cuerpos se pisan como mucho un 12 % (las copas se rozan, los troncos se ven);
 * - nada tapa la cara del acantilado ni la rampa, y lo de abajo no se mete arriba de la meseta;
 * - lo de arriba de la meseta queda a 12 px del borde y su sombra cae sobre la meseta;
 * - el pie no va en el camino ni pegado a las entidades.
 */
export function applyPremiumZone(m: BigMap, design: TerrainDesign, z: PremiumZone, objects: WorldObject[]): ZoneReport {
  const W = m.w, H = m.h, r = rng(z.seed);
  const [rx0, ry0, rx1, ry1] = z.rect;
  const inRect = (tx: number, ty: number) => tx >= rx0 && tx <= rx1 && ty >= ry0 && ty <= ry1;
  const byName = new Map(objects.map((o) => [o.name, o]));
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : y * W + x);

  // ---------- 1. terreno con meseta y rampa ----------
  const t2 = paintTerrain({ ...design, plateaus: [...design.plateaus, ...z.plateaus], stairs: [...design.stairs, ...z.ramps.map((s) => ({ ...s, style: 'tierra' as const }))] });
  const PX0 = rx0 * TILE, PY0 = ry0 * TILE, PX1 = (rx1 + 1) * TILE, PY1 = (ry1 + 1) * TILE, IW = m.terrain.img.w, IH = m.terrain.img.h;
  const pix = (x: number, y: number) => (x < 0 || y < 0 || x >= IW || y >= IH ? -1 : y * IW + x);

  // ---------- 2. decos: se quita todo lo que se para en el piso, menos lo que la zona guarda ----------
  const keep: Deco[] = [];
  const inZone = (d: Deco) => inRect(Math.floor(d.x / TILE), Math.floor((d.y - 1) / TILE));
  for (const d of m.decos) if (!inZone(d) || z.keep(d.sprite)) keep.push(d);
  m.decos = keep;
  const solid = m.solid;
  for (let ty = ry0; ty <= ry1; ty++) for (let tx = rx0; tx <= rx1; tx++) solid[at(tx, ty)] = t2.solid[at(tx, ty)];

  // ---------- 3. la grilla de colocación ----------
  const GW = Math.ceil(IW / CELL), GH = Math.ceil(IH / CELL);
  // body: de quién es cada celda (-1 nadie); areas: cuántas celdas tiene cada cuerpo
  const body = new Int32Array(GW * GH).fill(-1), foot = new Uint8Array(GW * GH), decal = new Uint8Array(GW * GH);
  const areas: number[] = [];
  const fps = new Map<string, Footprint>();
  const fpOf = (n: string) => { let f = fps.get(n); if (!f) { f = footprint(byName.get(n)!); fps.set(n, f); } return f; };
  const gAt = (px: number, py: number, c: [number, number]) => { const gx = Math.floor(px / CELL) + c[0], gy = Math.floor(py / CELL) + c[1]; return gx < 0 || gy < 0 || gx >= GW || gy >= GH ? -1 : gy * GW + gx; };
  // terreno por celda (en el centro de la celda)
  const kindAtG = (g: number) => t2.kind[pix((g % GW) * CELL + 2, Math.floor(g / GW) * CELL + 2)];
  const highAtG = (g: number) => t2.high[pix((g % GW) * CELL + 2, Math.floor(g / GW) * CELL + 2)];
  // distancia al camino y al borde de la meseta (px)
  const roadMask = new Uint8Array(IW * IH), lowMask = new Uint8Array(IW * IH);
  for (let i = 0; i < IW * IH; i++) { roadMask[i] = t2.kind[i] === 1 || t2.kind[i] === 5 ? 1 : 0; lowMask[i] = t2.high[i] ? 0 : 1; }
  const dRoad = distTo(roadMask, IW, IH), dEdge = distTo(lowMask, IW, IH);

  const solidBox = (sprite: string, px: number, py: number) => {
    const o = byName.get(sprite);
    if (!o) return;
    for (const s of [o.solid, ...(o.solids ?? [])]) {
      if (!s) continue;
      const x0 = Math.floor((px + s[0]) / TILE), x1 = Math.floor((px + s[0] + s[2] - 1) / TILE);
      const y0 = Math.floor((py + s[1]) / TILE), y1 = Math.floor((py + s[1] + s[3] - 1) / TILE);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (at(x, y) >= 0 && inRect(x, y)) solid[at(x, y)] = 1;
    }
  };
  const register = (sprite: string, px: number, py: number) => {
    const o = byName.get(sprite);
    if (!o || o.layer === 'suelo' || o.layer === 'frente' || o.layer === 'fondo') return;
    const f = fpOf(sprite);
    const id = areas.length;
    areas.push(f.body.length);
    for (const c of f.body) { const g = gAt(px, py, c); if (g >= 0) body[g] = id; }
    for (const c of f.foot) { const g = gAt(px, py, c); if (g >= 0) foot[g] = 1; }
  };
  // lo que ya está (afuera cerca del borde y lo que se guardó adentro) también cuenta
  for (const d of keep) {
    const tx = Math.floor(d.x / TILE), ty = Math.floor((d.y - 1) / TILE);
    if (tx < rx0 - 6 || tx > rx1 + 6 || ty < ry0 - 6 || ty > ry1 + 8) continue;
    register(d.sprite, d.x, d.y);
    if (inRect(tx, ty)) solidBox(d.sprite, d.x, d.y);
  }
  // la subida queda libre: la rampa, 2 cuadros arriba de ella (la entrada a la meseta) y 1 abajo
  const clear = new Uint8Array(W * H);
  for (const rp of z.ramps) for (let ty = Math.floor(rp.y) - 2; ty <= Math.floor(rp.y) + 2; ty++) for (let tx = Math.floor(rp.x - rp.w / 2); tx < Math.ceil(rp.x + rp.w / 2); tx++) if (at(tx, ty) >= 0) clear[at(tx, ty)] = 1;
  const ents = m.entities.filter((e) => e.x >= PX0 - 64 && e.x < PX1 + 64 && e.y >= PY0 - 64 && e.y < PY1 + 64);

  interface Rules { maxOverlap?: number; roadGap?: number; maxRoad?: number; edge?: number; onlyHigh?: boolean; onlyLow?: boolean }
  const fits = (sprite: string, px: number, py: number, ru: Rules = {}): boolean => {
    // se mira en el mismo lugar donde va a quedar (redondeado)
    px = Math.round(px); py = Math.round(py);
    const f = fpOf(sprite);
    const ai = pix(Math.round(px), Math.round(py) - 1);
    if (ai < 0 || !inRect(Math.floor(px / TILE), Math.floor((py - 1) / TILE))) return false;
    const hi = t2.high[ai];
    if ((ru.onlyHigh && !hi) || (ru.onlyLow && hi)) return false;
    if (t2.kind[ai] !== 0) return false;
    // arriba de la meseta: lejos del borde
    if (hi && dEdge[ai] < (ru.edge ?? 12)) return false;
    if (dRoad[ai] < (ru.roadGap ?? 10)) return false;
    for (const e of ents) if (Math.abs(e.x - px) < 22 && Math.abs(e.y - py) < 18) return false;
    // ni el pie ni la caja sólida en la subida
    const o = byName.get(sprite)!;
    for (const b of [o.solid, ...(o.solids ?? [])]) {
      if (!b) continue;
      for (let ty = Math.floor((py + b[1]) / TILE); ty <= Math.floor((py + b[1] + b[3] - 1) / TILE); ty++) for (let tx = Math.floor((px + b[0]) / TILE); tx <= Math.floor((px + b[0] + b[2] - 1) / TILE); tx++) if (clear[at(tx, ty)]) return false;
    }
    if (clear[at(Math.floor(px / TILE), Math.floor((py - 1) / TILE))] && o.solid) return false;
    // el pie: piso libre, nadie encima
    for (const c of f.foot) {
      const g = gAt(px, py, c);
      if (g < 0 || body[g] >= 0 || foot[g]) return false;
      const k = kindAtG(g);
      if (k !== 0 || highAtG(g) !== hi) return false;
    }
    let road = 0, cross = 0;
    const ov = new Map<number, number>();
    for (const c of f.body) {
      const g = gAt(px, py, c);
      if (g < 0) continue;
      if (foot[g]) return false; // nunca tapa el pie de otro
      if (body[g] >= 0) ov.set(body[g], (ov.get(body[g]) ?? 0) + 1);
      const k = kindAtG(g);
      // la cara del acantilado y la rampa siempre se ven
      if (k === 3 || k === 5) return false;
      if (k === 1) road++;
      if (!hi && highAtG(g)) cross++;
    }
    const n = f.body.length;
    // con cada vecino por separado: lo que se pisan no pasa del 12 % del más chico de los dos
    for (const [id, k] of ov) if (k > Math.min(n, areas[id]) * (ru.maxOverlap ?? 0.12)) return false;
    if (road > n * (ru.maxRoad ?? 0.2)) return false;
    // lo de abajo no se mete encima de la meseta
    if (cross > n * 0.02) return false;
    // la sombra cae en el mismo nivel del objeto
    if (f.shadow.length) {
      let off = 0;
      for (const c of f.shadow) { const g = gAt(px, py, c); if (g < 0) continue; const k = kindAtG(g); if (k === 3 || k === 5 || highAtG(g) !== hi) off++; }
      if (off > f.shadow.length * (hi ? 0.2 : 0.15)) return false;
    }
    return true;
  };
  const decos: Deco[] = [];
  const trunk = new Uint8Array(W * H);
  const place = (sprite: string, px: number, py: number) => {
    px = Math.round(px); py = Math.round(py);
    decos.push({ sprite, x: px, y: py });
    register(sprite, px, py);
    solidBox(sprite, px, py);
  };
  // candidatos: puntos al azar dentro del rectángulo
  const randPt = (): [number, number] => [PX0 + 8 + r() * (PX1 - PX0 - 16), PY0 + 12 + r() * (PY1 - PY0 - 16)];

  const report: ZoneReport = { arboles: 0, grupos: [], calcomanias: 0, frente: [...z.frente], sinLugar: [], pantallas: [] };
  const screens: { x: number; y: number }[] = [];
  for (let sy = ry0; sy <= ry1; sy += SCREEN.h) for (let sx = rx0; sx <= rx1; sx += SCREEN.w) screens.push({ x: sx, y: sy });

  // ---------- 4. un punto focal por pantalla (en el medio, lejos del camino) ----------
  const GROUPS = ['claro_tronco_hongos', 'rocas_musgo_grupo', 'raices_expuestas', 'arbusto_flores_grupo'];
  let gi = Math.floor(r() * GROUPS.length);
  for (const sc of screens) {
    const g = GROUPS[gi++ % GROUPS.length];
    const cx = (Math.min(rx1 + 1, sc.x + SCREEN.w) + sc.x) / 2 * TILE, cy = (Math.min(ry1 + 1, sc.y + SCREEN.h) + sc.y) / 2 * TILE;
    let done = false;
    for (let rad = 0; rad <= 9 * TILE && !done; rad += 6) for (let a = 0; a < 16 && !done; a++) {
      const px = cx + Math.cos((a / 16) * Math.PI * 2) * rad, py = cy + Math.sin((a / 16) * Math.PI * 2) * rad * 0.7;
      if (Math.floor(px / TILE) < sc.x || Math.floor(px / TILE) >= sc.x + SCREEN.w || Math.floor(py / TILE) < sc.y || Math.floor(py / TILE) >= sc.y + SCREEN.h) continue;
      if (fits(g, px, py, { roadGap: 24, onlyLow: true, maxOverlap: 0 })) { place(g, px, py); report.grupos.push(g); done = true; }
    }
  }

  // ---------- 5. lugares (hongos gigantes, árboles hechizados, troncos...) ----------
  const lm: { x: number; y: number; fam: string }[] = [];
  for (const L of z.landmarks) for (let k = 0; k < L.n; k++) {
    let ok = false;
    for (let t = 0; t < 600 && !ok; t++) {
      const [px, py] = randPt();
      // los lugares se reparten: a 4 cuadros uno de otro, y a 7 si son de la misma familia
      const fam = L.sprite.startsWith('arbol_') ? 'arbol' : L.sprite.replace(/_\d.*$|_(azul|morado).*$/, '');
      if (lm.some((q) => Math.hypot(q.x - px, q.y - py) < (q.fam === fam ? 7 : 4) * TILE)) continue;
      if (fits(L.sprite, px, py, { roadGap: 14, maxOverlap: 0.04 })) { place(L.sprite, px, py); lm.push({ x: px, y: py, fam }); trunk[at(Math.floor(px / TILE), Math.floor((py - 1) / TILE))] = 1; ok = true; }
    }
    if (!ok) report.sinLugar.push(L.sprite);
  }

  // ---------- 6. árboles: variedad de tamaño y forma, nunca dos iguales a menos de 3 cuadros ----------
  const recent: { name: string; x: number; y: number }[] = [];
  const pickTree = (tx: number, ty: number, dark: number, hi: number, size: number): string => {
    const species = dark > 0.35 || hi ? (r() < 0.6 ? 'pino' : 'roble') : r() < 0.4 ? 'pino' : 'roble';
    for (let k = 0; k < 6; k++) {
      const name = `${species}_t${size}_${Math.floor(r() * 3)}`;
      if (!recent.some((q) => q.name === name && Math.abs(q.x - tx) <= 3 && Math.abs(q.y - ty) <= 3)) return name;
    }
    return `${species === 'pino' ? 'roble' : 'pino'}_t${size}_${Math.floor(r() * 3)}`;
  };
  const hv = (x: number, y: number) => { let v = (x * 374761393 + y * 668265263 + z.seed * 2147483647) | 0; v = Math.imul(v ^ (v >>> 13), 1274126177); return ((v ^ (v >>> 16)) >>> 0) / 4294967296; };
  const grove = (px: number, py: number) => {
    const C = 5 * TILE, gx = px / C, gy = py / C, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = hv(x0, y0), b = hv(x0 + 1, y0), c = hv(x0, y0 + 1), d = hv(x0 + 1, y0 + 1);
    const v = a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    return Math.max(0, Math.min(1, (v - 0.3) / 0.45));
  };
  // la meseta primero: es el lugar alto de la pantalla y se lee mejor con su bosquecillo arriba
  for (let t = 0; t < 500; t++) {
    const [px, py] = randPt();
    const i = pix(Math.round(px), Math.round(py) - 1);
    if (i < 0 || !t2.high[i]) continue;
    const tx = Math.floor(px / TILE), ty = Math.floor((py - 1) / TILE);
    const name = pickTree(tx, ty, 0.5, 1, t % 3 === 0 ? 1 : 0);
    if (!fits(name, px, py, { roadGap: 18, onlyHigh: true })) continue;
    place(name, px, py);
    recent.push({ name, x: tx, y: ty });
    trunk[at(tx, ty)] = 1;
    report.arboles++;
  }
  // primero los grandes (ocupan más), después los medianos y los chicos rellenan
  for (const [size, tries] of [[2, 260], [1, 900], [0, 1400]] as const) {
    for (let t = 0; t < tries; t++) {
      const [px, py] = randPt();
      const tx = Math.floor(px / TILE), ty = Math.floor((py - 1) / TILE);
      const dark = z.darkAt(tx, ty), hi = t2.high[pix(Math.round(px), Math.round(py) - 1)] ?? 0;
      // bosquecillos y claros: un ruido grande decide dónde se juntan los árboles (no salpicados parejo)
      if (r() > (0.12 + grove(px, py) * 0.75) * (0.5 + dark * 0.7) + (hi ? 0.3 : 0)) continue;
      const name = pickTree(tx, ty, dark, hi, size);
      if (!fits(name, px, py, { roadGap: 18 })) continue;
      place(name, px, py);
      recent.push({ name, x: tx, y: ty });
      trunk[at(tx, ty)] = 1;
      report.arboles++;
    }
  }

  // ---------- 7. monte bajo: al pie de los árboles, nunca en el medio de la nada ----------
  const trees = decos.filter((d) => /^(pino|roble)_t/.test(d.sprite) || lm.some((q) => Math.round(q.x) === d.x && Math.round(q.y) === d.y));
  for (let t = 0; t < 900; t++) {
    const base = trees[Math.floor(r() * trees.length)];
    if (!base) break;
    const a = r() * Math.PI * 2, d = 18 + r() * 34;
    const px = base.x + Math.cos(a) * d, py = base.y + Math.sin(a) * d * 0.6;
    const name = z.undergrowth[Math.floor(r() * z.undergrowth.length)];
    if (r() < 0.55 && fits(name, px, py, { roadGap: 8, maxOverlap: 0.1, edge: 10 })) place(name, px, py);
  }

  // ---------- 8. calcomanías: al menos 6 por pantalla, sin pisarse y a la vista ----------
  const DECALS = ['hojas_caidas_0', 'hojas_caidas_1', 'hojas_caidas_2', 'hojas_caidas_3', 'raiz_suelo_0', 'raiz_suelo_1', 'raiz_suelo_2', 'grieta_0', 'grieta_1', 'grieta_2', 'charco_chico_0', 'charco_chico_1', 'flores_suelo_0', 'flores_suelo_1', 'flores_suelo_2', 'flores_suelo_3', 'piedritas_0', 'piedritas_1', 'piedritas_2'];
  const decalFits = (name: string, px: number, py: number, road: boolean) => {
    const o = byName.get(name)!, f = o.anims.idle.frames[0];
    for (let y = 0; y < f.h; y += 2) for (let x = 0; x < f.w; x += 2) {
      if (f.data[(y * f.w + x) * 4 + 3] < 128) continue;
      const X = Math.round(px - o.anchor[0] + x), Y = Math.round(py - o.anchor[1] + y), i = pix(X, Y);
      if (i < 0 || X < PX0 || Y < PY0 || X >= PX1 || Y >= PY1) return false;
      const k = t2.kind[i];
      if (road ? k !== 1 : k !== 0) return false;
      const g = Math.floor(Y / CELL) * GW + Math.floor(X / CELL);
      if (body[g] >= 0 || decal[g]) return false;
    }
    return true;
  };
  for (const sc of screens) {
    let n = 0, tries = 0;
    while (n < 9 && tries++ < 600) {
      const px = (sc.x + r() * SCREEN.w) * TILE, py = (sc.y + r() * SCREEN.h) * TILE;
      const i = pix(Math.round(px), Math.round(py));
      if (i < 0) continue;
      const road = t2.kind[i] === 1;
      const pool = road ? DECALS.filter((d) => d.startsWith('piedritas') || d.startsWith('grieta')) : DECALS;
      const name = pool[Math.floor(r() * pool.length)];
      if (!decalFits(name, px, py, road)) continue;
      const o = byName.get(name)!;
      for (let y = 0; y < o.h; y += CELL) for (let x = 0; x < o.w; x += CELL) { const g = Math.floor((py - o.anchor[1] + y) / CELL) * GW + Math.floor((px - o.anchor[0] + x) / CELL); if (g >= 0 && g < decal.length) decal[g] = 1; }
      decos.push({ sprite: name, x: Math.round(px), y: Math.round(py) });
      n++;
    }
    report.calcomanias += n;
    report.pantallas.push({ x: sc.x, y: sc.y, focal: [], calcomanias: n });
  }
  m.decos.push(...decos);

  // ---------- 9. primer plano: no va en el mapa, la zona lo declara y el juego lo pega a los bordes de la pantalla ----------
  const zone = m.zones.find((q) => q.nombre === z.nombre);
  if (zone && z.frente.length) zone.props = { ...zone.props, frente: z.frente.join(',') };

  // puntos focales por pantalla: grupos y lugares
  for (const p of report.pantallas) {
    p.focal = m.decos.filter((d) => {
      const tx = Math.floor(d.x / TILE), ty = Math.floor(d.y / TILE);
      return tx >= p.x && tx < p.x + SCREEN.w && ty >= p.y && ty < p.y + SCREEN.h && (GROUPS.includes(d.sprite) || /^hongo_gigante|^arbol_hechizado/.test(d.sprite) || d.sprite === 'anillo_hadas');
    }).map((d) => d.sprite);
  }

  // ---------- 10. suelo de bosque con los troncos nuevos, raíces que cuelgan y caminos gastados ----------
  const dd = new Float32Array(W * H);
  for (let ty = ry0; ty <= ry1; ty++) for (let tx = rx0; tx <= rx1; tx++) {
    let n = 0, c = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const j = at(tx + dx, ty + dy); if (j < 0) continue; c++; n += trunk[j]; }
    dd[at(tx, ty)] = Math.min(1, (n / c) * 3.2 + z.darkAt(tx, ty) * 0.5);
  }
  // hojarasca más calma adentro (el detalle lo ponen las calcomanías), igual que afuera cerca del borde
  forestFloor(t2, W, H, dd, z.seed, (x, y) => 0.35 + 0.65 * Math.max(0, 1 - Math.min(x - PX0, PX1 - 1 - x, y - PY0, PY1 - 1 - y) / (2 * TILE)));
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
      const c = GRASS[Math.min(GRASS.length - 1, gi + 1)];
      d[i * 4] = parseInt(c.slice(1, 3), 16); d[i * 4 + 1] = parseInt(c.slice(3, 5), 16); d[i * 4 + 2] = parseInt(c.slice(5, 7), 16);
    }
  }
  calmSpeckles(t2.img.data, t2.kind, t2.img.w, PX0, PY0, PX1, PY1);
  hangingRoots(t2, PX0, PY0, PX1, PY1, z.seed);

  // ---------- 11. pegar la zona en la imagen del mundo, con borde suave (2 cuadros) ----------
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
  return report;
}

/**
 * Suelo calmo: un pixel de pasto suelto que no se parece a ninguno de sus 8 vecinos toma el color que más se repite
 * alrededor (el ruido de pixeles sueltos es lo que hace que el piso se vea "sucio").
 */
function calmSpeckles(data: Uint8ClampedArray, kind: Uint8Array, W: number, x0: number, y0: number, x1: number, y1: number) {
  const src = new Uint8ClampedArray(data.subarray(0, data.length));
  const col = (i: number) => (src[i * 4] << 16) | (src[i * 4 + 1] << 8) | src[i * 4 + 2];
  for (let y = y0 + 1; y < y1 - 1; y++) for (let x = x0 + 1; x < x1 - 1; x++) {
    const i = y * W + x;
    if (kind[i] !== 0) continue;
    const c = col(i), votes = new Map<number, number>();
    let same = 0;
    for (const j of [i - W - 1, i - W, i - W + 1, i - 1, i + 1, i + W - 1, i + W, i + W + 1]) {
      if (kind[j] !== 0) continue;
      const v = col(j);
      if (v === c) same++;
      votes.set(v, (votes.get(v) ?? 0) + 1);
    }
    if (same > 0) continue;
    let best = c, bn = 0;
    for (const [v, n] of votes) if (n > bn) { bn = n; best = v; }
    if (bn < 4) continue;
    data[i * 4] = best >> 16; data[i * 4 + 1] = (best >> 8) & 255; data[i * 4 + 2] = best & 255;
  }
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
