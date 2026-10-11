import { TILE } from '../tiles';
import { paintTerrain, forestFloor, distTo, inPoly, GRASS, type TerrainDesign, type TP, type PaintedTerrain } from '../paint';
import { createPlacer, CELL, footprint, SCREEN, type Footprint } from './placer';

export { CELL, footprint, SCREEN, type Footprint };
import type { BigMap, Deco } from '../bosqueMap';
import type { WorldObject } from '../objects';

/**
 * Mundo premium: rehace la vegetación y el suelo de un mundo entero con las reglas de realismo, sin mover lo que el
 * diseño puso a propósito (lugares, campamentos, ruinas, carteles, puentes, cofres, enemigos).
 *
 * 1. Relieve: el terreno se vuelve a pintar una sola vez para todo el mundo, con las mesetas y rampas nuevas de las
 *    zonas premium (el pintor hace la cara del acantilado, el pasto que cuelga, las grietas y la sombra al pie).
 * 2. Zonas premium (el piloto: el Bosque Profundo): su propia receta de lugares, meseta y bosquecillos.
 * 3. El resto del mundo: la densidad de bosque del diseño decide dónde va bosque. En el interior de las masas cerradas
 *    los árboles van en filas escalonadas (dosel), por manchas de una especie. En los bordes y en lo que se camina,
 *    con las reglas estrictas (troncos a la vista, nada montado).
 * 4. Los lugares de vegetación (hechizados, secos, sauces, hongos gigantes, robles de otoño, tocones, rocas) se mudan
 *    cerca de donde estaban, con su sombra.
 * 5. Un punto focal y calcomanías en cada pantalla, monte bajo al pie de los árboles, telarañas en el bosque oscuro.
 * 6. Todo lo que se alcanzaba caminando se sigue alcanzando (si un árbol tapa el paso, se quita).
 * 7. Suelo de bosque con los troncos nuevos, caminos gastados, raíces que cuelgan y piso calmo.
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

/** El resto del mundo (todo lo que no es zona premium con receta propia). */
export interface WorldPass {
  seed: number;
  darkAt: (tx: number, ty: number) => number;
  /** vegetación: se quita y se vuelve a plantar */
  vegetation: RegExp;
  /** de la vegetación, lo que se muda cerca de donde estaba (con su copia `_p`) */
  relocate: RegExp;
  /** de la vegetación, lo que se queda donde está (con su copia `_p` si la hay) */
  stay: RegExp;
  undergrowth: string[];
  /** primer plano por zona del mapa (nombre de la zona: ids) */
  frente: Record<string, string[]>;
}


function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export interface ScreenReport { x: number; y: number; focal: string[]; calcomanias: number }

export interface ZoneReport {
  arboles: number;
  grupos: string[];
  calcomanias: number;
  /** primer plano declarado para la zona (va a los bordes de la pantalla) */
  frente: string[];
  /** lugares que no entraron (se avisa: no se encajan a la fuerza) */
  sinLugar: string[];
  pantallas: ScreenReport[];
}

export interface WorldReport {
  arboles: number;
  /** árboles del dosel (interior de las masas): se pueden tapar el tronco entre ellos */
  dosel: { x: number; y: number }[];
  mudados: number;
  sinLugar: string[];
  /** árboles que se quitaron porque tapaban el paso a algo */
  quitadosPorPaso: number;
  pantallas: ScreenReport[];
}

const GROUPS = ['claro_tronco_hongos', 'rocas_musgo_grupo', 'raices_expuestas', 'arbusto_flores_grupo'];
const DECALS = ['hojas_caidas_0', 'hojas_caidas_1', 'hojas_caidas_2', 'hojas_caidas_3', 'raiz_suelo_0', 'raiz_suelo_1', 'raiz_suelo_2', 'grieta_0', 'grieta_1', 'grieta_2', 'charco_chico_0', 'charco_chico_1', 'flores_suelo_0', 'flores_suelo_1', 'flores_suelo_2', 'flores_suelo_3', 'piedritas_0', 'piedritas_1', 'piedritas_2'];
const TREE_P = /^(pino|roble)_t\d_\d$/;


/**
 * Pasa un mundo entero a premium. `zones` son las zonas con receta propia (el piloto), `world` el resto. Devuelve el
 * informe de cada zona y el del resto del mundo.
 */
export function premiumWorld(m: BigMap, design: TerrainDesign, zones: PremiumZone[], world: WorldPass | null, objects: WorldObject[]): { zonas: ZoneReport[]; mundo: WorldReport | null } {
  const W = m.w, H = m.h;
  const byName = new Map(objects.map((o) => [o.name, o]));
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : y * W + x);
  const tileOf = (px: number, py: number) => at(Math.floor(px / TILE), Math.floor((py - 1) / TILE));
  const inZoneRect = (tx: number, ty: number) => zones.some((z) => tx >= z.rect[0] && tx <= z.rect[2] && ty >= z.rect[1] && ty <= z.rect[3]);
  const copy = (n: string) => (byName.has(`${n}_p`) ? `${n}_p` : n);

  // ---------- 1. terreno nuevo, una sola vez para todo el mundo ----------
  const t2: PaintedTerrain = paintTerrain({ ...design, plateaus: [...design.plateaus, ...zones.flatMap((z) => z.plateaus)], stairs: [...design.stairs, ...zones.flatMap((z) => z.ramps.map((s) => ({ ...s, style: 'tierra' as const })))] });
  const IW = t2.img.w, IH = t2.img.h;
  const pix = (x: number, y: number) => (x < 0 || y < 0 || x >= IW || y >= IH ? -1 : y * IW + x);
  const baseTerrainSolid = m.terrain.solid;

  // ---------- 2. qué se queda, qué se va ----------
  const ojos = m.entities.filter((e) => e.tipo === 'criatura' && e.props?.especie === 'ojos');
  const keep: Deco[] = [], removed: Deco[] = [], moving: Deco[] = [];
  for (const d of m.decos) {
    const t = tileOf(d.x, d.y), tx = t % W, ty = Math.floor(t / W);
    const z = zones.find((q) => tx >= q.rect[0] && tx <= q.rect[2] && ty >= q.rect[1] && ty <= q.rect[3]);
    if (z) { if (z.keep(d.sprite)) keep.push(d); else removed.push(d); continue; }
    if (!world || !world.vegetation.test(d.sprite)) { keep.push(d); continue; }
    // los arbustos donde viven los ojos y lo que el diseño dejó fijo se quedan (con su sombra)
    if (world.stay.test(d.sprite) || (/^arbusto_/.test(d.sprite) && ojos.some((e) => Math.abs(e.x - d.x) < 28 && Math.abs(e.y - d.y) < 28))) { keep.push({ ...d, sprite: copy(d.sprite) }); removed.push(d); continue; }
    removed.push(d);
    if (world.relocate.test(d.sprite)) moving.push(d);
  }
  m.decos = keep;

  // colisión: lo que ponían las decos que se fueron vuelve a ser lo del terreno, y el relieve nuevo manda
  const solid = m.solid;
  const special = new Uint8Array(W * H);
  for (const e of m.entities) if (e.tipo === 'cofre' || e.tipo === 'rompible') special[at(Math.floor(e.x / TILE), Math.floor(e.y / TILE))] = 1;
  const boxTiles = (sprite: string, px: number, py: number, fn: (k: number) => void) => {
    const o = byName.get(sprite);
    if (!o) return;
    for (const b of [o.solid, ...(o.solids ?? [])]) {
      if (!b) continue;
      for (let ty = Math.floor((py + b[1]) / TILE); ty <= Math.floor((py + b[1] + b[3] - 1) / TILE); ty++) for (let tx = Math.floor((px + b[0]) / TILE); tx <= Math.floor((px + b[0] + b[2] - 1) / TILE); tx++) { const k = at(tx, ty); if (k >= 0) fn(k); }
    }
  };
  const keptSolid = new Uint8Array(W * H);
  for (const d of keep) boxTiles(d.sprite, d.x, d.y, (k) => { keptSolid[k] = 1; });
  for (const d of removed) boxTiles(d.sprite, d.x, d.y, (k) => { const x = k % W, y = Math.floor(k / W); if (!keptSolid[k] && !special[k] && !(x < 2 || y < 1 || x >= W - 2 || y >= H - 2)) solid[k] = baseTerrainSolid[k]; });
  for (let k = 0; k < W * H; k++) if (t2.solid[k] !== baseTerrainSolid[k]) solid[k] = t2.solid[k] || keptSolid[k] || special[k];
  // en las zonas con receta propia la colisión es la del terreno nuevo más lo que se quedó
  for (const z of zones) for (let ty = z.rect[1]; ty <= z.rect[3]; ty++) for (let tx = z.rect[0]; tx <= z.rect[2]; tx++) { const k = at(tx, ty); solid[k] = t2.solid[k] || keptSolid[k] || special[k]; }
  // un cofre o rompible que quedó adentro del relieve nuevo (la cara de un hundido) se corre al piso libre más cercano
  for (const e of m.entities) {
    if (e.tipo !== 'cofre' && e.tipo !== 'rompible') continue;
    const tx = Math.floor(e.x / TILE), ty = Math.floor(e.y / TILE), k0 = at(tx, ty);
    if (!t2.solid[k0] || baseTerrainSolid[k0]) continue;
    // primero adentro del hundido (el secreto es del lugar), si no, el piso libre más cercano
    const inPits = (x: number, y: number) => (design.pits ?? []).some((p) => inPoly(x + 0.5, y + 0.5, p.poly));
    let best = -1, bestD = 1e9;
    for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
      const k = at(tx + dx, ty + dy);
      if (k < 0 || t2.solid[k] || solid[k] || t2.waterTiles[k] || special[k] || ![0, 1].includes(t2.tileKind[k])) continue;
      const d = Math.hypot(dx, dy) + (inPits(tx + dx, ty + dy) ? 0 : 20);
      if (d < bestD) { bestD = d; best = k; }
    }
    if (best < 0) continue;
    special[k0] = 0; solid[k0] = t2.solid[k0];
    special[best] = 1; solid[best] = 1;
    e.x = (best % W) * TILE + TILE / 2; e.y = Math.floor(best / W) * TILE + TILE / 2;
  }
  const keptSolidSnapshot = new Uint8Array(solid);

  // ---------- 3. el motor de colocación ----------
  // la subida de las rampas nuevas y lo que el diseño deja libre: ahí no va nada sólido
  const clear = new Uint8Array(W * H);
  if (m.libre) clear.set(m.libre);
  // la bajada de cada hundido también queda libre
  for (const pit of design.pits ?? []) {
    const yb = Math.max(...pit.poly.map((q) => q[1]));
    for (let ty = Math.floor(yb) - 3; ty <= Math.floor(yb) + 2; ty++) for (let tx = Math.floor(pit.entry.x - pit.entry.w / 2) - 1; tx <= Math.ceil(pit.entry.x + pit.entry.w / 2); tx++) if (at(tx, ty) >= 0) clear[at(tx, ty)] = 1;
  }
  for (const z of zones) for (const rp of z.ramps) for (let ty = Math.floor(rp.y) - 2; ty <= Math.floor(rp.y) + 2; ty++) for (let tx = Math.floor(rp.x - rp.w / 2); tx < Math.ceil(rp.x + rp.w / 2); tx++) if (at(tx, ty) >= 0) clear[at(tx, ty)] = 1;
  const darkOf = (tx: number, ty: number) => { const z = zones.find((q) => tx >= q.rect[0] && tx <= q.rect[2] && ty >= q.rect[1] && ty <= q.rect[3]); return z ? z.darkAt(tx, ty) : world ? world.darkAt(tx, ty) : 0; };
  // lo que el diseño puso a mano (campamentos, granja, ruinas): los grupos focales no se le arriman
  const designed = keep.filter((d) => byName.get(d.sprite)?.layer !== 'suelo' && !/^(pasto_alto|flores_grandes|juncos|nenufar)/.test(d.sprite) && !(world && world.vegetation.test(d.sprite.replace(/_p$/, ''))));
  // charquitos solo en el bosque oscuro (en la pradera se leen como huecos)
  const decalPool = (road: boolean, wet: boolean) => (road ? DECALS.filter((d) => d.startsWith('piedritas') || d.startsWith('grieta')) : wet ? DECALS : DECALS.filter((d) => !d.startsWith('charco')));
  const P = createPlacer({ m, t2, byName, keep, solid, special, clear, designed, darkOf, decalPool });
  const { fits, place, pickTree, plantTree, decalsFor, focalGroup, undergrowthNear, hv, noise, placed, decos, trunk, recent } = P;
  const setAllowed = P.setAllowed;
  const ents = m.entities;

  // ---------- 4. zonas con receta propia ----------
  const zonas: ZoneReport[] = [];
  for (const z of zones) {
    const r = rng(z.seed);
    const [rx0, ry0, rx1, ry1] = z.rect;
    setAllowed((tx, ty) => tx >= rx0 && tx <= rx1 && ty >= ry0 && ty <= ry1);
    const PX0 = rx0 * TILE, PY0 = ry0 * TILE, PX1 = (rx1 + 1) * TILE, PY1 = (ry1 + 1) * TILE;
    const randPt = (): [number, number] => [Math.round(PX0 + 8 + r() * (PX1 - PX0 - 16)), Math.round(PY0 + 12 + r() * (PY1 - PY0 - 16))];
    const report: ZoneReport = { arboles: 0, grupos: [], calcomanias: 0, frente: [...z.frente], sinLugar: [], pantallas: [] };
    const screens: { x: number; y: number }[] = [];
    for (let sy = ry0; sy <= ry1; sy += SCREEN.h) for (let sx = rx0; sx <= rx1; sx += SCREEN.w) screens.push({ x: sx, y: sy });
    let gi = Math.floor(r() * GROUPS.length);
    for (const sc of screens) { const g = GROUPS[gi++ % GROUPS.length]; if (focalGroup(g, sc, rx1, ry1)) report.grupos.push(g); }
    // lugares: pocos y repartidos (a 4 cuadros uno de otro, a 7 si son de la misma familia)
    const lm: { x: number; y: number; fam: string }[] = [];
    for (const L of z.landmarks) for (let k = 0; k < L.n; k++) {
      let ok = false;
      for (let t = 0; t < 600 && !ok; t++) {
        const [px, py] = randPt();
        const fam = L.sprite.startsWith('arbol_') ? 'arbol' : L.sprite.replace(/_\d.*$|_(azul|morado).*$/, '');
        if (lm.some((q) => Math.hypot(q.x - px, q.y - py) < (q.fam === fam ? 7 : 4) * TILE)) continue;
        if (fits(L.sprite, px, py, { roadGap: 14, maxOverlap: 0.04 })) { place(L.sprite, px, py, { tree: true }); lm.push({ x: px, y: py, fam }); ok = true; }
      }
      if (!ok) report.sinLugar.push(L.sprite);
    }
    // la meseta primero: es el lugar alto de la pantalla y se lee mejor con su bosquecillo arriba
    for (let t = 0; t < 500; t++) {
      const [px, py] = randPt();
      const i = pix(Math.round(px), Math.round(py) - 1);
      if (i < 0 || !t2.high[i]) continue;
      const name = pickTree(r, Math.floor(px / TILE), Math.floor((py - 1) / TILE), 0.5, 1, t % 3 === 0 ? 1 : 0);
      if (name && fits(name, px, py, { roadGap: 18, onlyHigh: true })) plantTree(name, px, py);
    }
    report.pantallas = screens.map((sc) => ({ x: sc.x, y: sc.y, focal: [], calcomanias: 0 }));
    const mz = m.zones.find((q) => q.nombre === z.nombre);
    if (mz && z.frente.length) mz.props = { ...mz.props, frente: z.frente.join(',') };
    zonas.push(report);
  }

  // ---------- 5. el resto del mundo ----------
  let mundo: WorldReport | null = null;
  if (world) {
    const r = rng(world.seed);
    setAllowed((tx, ty) => !inZoneRect(tx, ty));
    mundo = { arboles: 0, dosel: [], mudados: 0, sinLugar: [], quitadosPorPaso: 0, pantallas: [] };
    const dens = m.densidad ?? new Float32Array(W * H);
    const D = (tx: number, ty: number) => { const k = at(tx, ty); return k < 0 ? 1 : dens[k]; };

    // 5a. los lugares de vegetación se mudan cerca de donde estaban
    for (const d of moving) {
      const name = copy(d.sprite);
      let ok = false;
      for (let rad = 0; rad <= 2.5 * TILE && !ok; rad += 4) for (let a = 0; a < (rad ? 12 : 1) && !ok; a++) {
        const px = d.x + Math.cos((a / 12) * Math.PI * 2) * rad, py = d.y + Math.sin((a / 12) * Math.PI * 2) * rad * 0.7;
        if (fits(name, px, py, { roadGap: 6, maxOverlap: 0.04 })) { place(name, px, py, { tree: /^(arbol_|sauce|roble_otono)/.test(d.sprite) }); ok = true; }
      }
      if (ok) mundo.mudados++; else mundo.sinLugar.push(d.sprite);
    }

    // 5b. un punto focal por pantalla (donde haya lugar)
    const screens: { x: number; y: number }[] = [];
    // (la última fila de pantallas, si queda cortada a menos de la mitad, no cuenta: es el borde del mapa)
    for (let sy = 0; sy + SCREEN.h / 2 <= H; sy += SCREEN.h) for (let sx = 0; sx < W; sx += SCREEN.w) if (!inZoneRect(sx + SCREEN.w / 2, sy + SCREEN.h / 2)) screens.push({ x: sx, y: sy });
    let gi = Math.floor(r() * GROUPS.length);
    for (const sc of screens) focalGroup(GROUPS[gi++ % GROUPS.length], sc, W - 1, H - 1);

    // 5c. el dosel: interior de las masas cerradas, en filas escalonadas y por manchas de una especie
    const open = new Uint8Array(W * H);
    for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
      const k = at(tx, ty);
      if (t2.tileKind[k] !== 0 || t2.waterTiles[k] || D(tx, ty) < 0.45 || keptSolid[k] || special[k]) open[k] = 1;
    }
    for (const e of ents) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const k = at(Math.floor(e.x / TILE) + dx, Math.floor(e.y / TILE) + dy); if (k >= 0) open[k] = 1; }
    const dOpen = new Uint16Array(W * H).fill(999);
    { const q: number[] = []; for (let k = 0; k < W * H; k++) if (open[k]) { dOpen[k] = 0; q.push(k); }
      for (let qi = 0; qi < q.length; qi++) { const k = q[qi], x = k % W, y = Math.floor(k / W); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = at(x + dx, y + dy); if (j >= 0 && dOpen[j] > dOpen[k] + 1) { dOpen[j] = dOpen[k] + 1; q.push(j); } } } }
    // los árboles van en todo el mundo con la misma regla (también en las zonas con receta propia)
    setAllowed(() => true);
    const isDoselTile = (tx: number, ty: number) => { const k = at(tx, ty); return k >= 0 && dOpen[k] >= 2 && D(tx, ty) >= 0.6 - world.darkAt(tx, ty) * 0.15; };
    const ROW = 40, COL = 54;
    for (let row = 0, y = ROW; y < IH; y += ROW, row++) for (let col = 0, x0 = (row % 2) * (COL / 2); x0 < IW; x0 += COL, col++) {
      const px = Math.round(x0 + (hv(row, col, world.seed + 1) - 0.5) * 12), py = Math.round(y + (hv(col, row, world.seed + 2) - 0.5) * 10);
      const tx = Math.floor(px / TILE), ty = Math.floor((py - 1) / TILE);
      if (!isDoselTile(tx, ty)) continue;
      const dark = world.darkAt(tx, ty);
      const species = noise(px, py, 7 * TILE, world.seed + 3) + dark * 0.35 > 0.62 ? 'pino' : 'roble';
      const sizeN = noise(px, py, 5 * TILE, world.seed + 4);
      const size = sizeN > 0.68 ? 2 : sizeN > 0.25 ? 1 : 0;
      // la forma cambia de vecino a vecino: nunca dos iguales a menos de 3 cuadros
      const s0 = Math.floor(hv(col, row, world.seed + 6) * 3);
      let name = '';
      for (let k = 0; k < 6 && !name; k++) {
        const cand = `${species}_t${k < 3 ? size : (size + 1) % 3}_${(s0 + k) % 3}`;
        if (!recent.some((q) => q.name === cand && Math.abs(q.x - tx) <= 3 && Math.abs(q.y - ty) <= 3)) name = cand;
      }
      if (name && fits(name, px, py, { roadGap: 14, dosel: true })) { place(name, px, py, { dosel: true, tree: true }); recent.push({ name, x: tx, y: ty }); mundo.dosel.push({ x: Math.round(px), y: Math.round(py) }); }
    }

    // 5d. bordes y lo que se camina: reglas estrictas, bosquecillos y claros según la densidad del diseño
    for (const [size, per] of [[2, 0.5], [1, 2.2], [0, 3]] as const) {
      const tries = Math.round(W * H * per);
      for (let t = 0; t < tries; t++) {
        const px = Math.round(8 + r() * (IW - 16)), py = Math.round(12 + r() * (IH - 16));
        const tx = Math.floor(px / TILE), ty = Math.floor((py - 1) / TILE);
        const dark = world.darkAt(tx, ty), hi = t2.high[pix(Math.round(px), Math.round(py) - 1)] ?? 0;
        // en el bosque oscuro hay más árboles aunque el diseño lo marque como claro
        const dd = D(tx, ty) + dark * 0.45;
        if (dd <= 0) continue;
        const grove = Math.max(0, Math.min(1, (noise(px, py, 5 * TILE, world.seed + 5) - 0.25) / 0.5));
        if (r() > Math.min(1, dd) * (0.35 + grove * 0.65)) continue;
        const name = pickTree(r, tx, ty, dark, hi, size);
        if (name && fits(name, px, py, { roadGap: 18 })) plantTree(name, px, py);
      }
    }
    mundo.arboles = placed.filter((p) => TREE_P.test(p.d.sprite) && !inZoneRect(Math.floor(p.d.x / TILE), Math.floor((p.d.y - 1) / TILE))).length;

    // 5e. monte bajo al pie de los árboles del borde (no adentro del dosel)
    setAllowed((tx, ty) => !inZoneRect(tx, ty));
    const edgeTrees = placed.filter((p) => p.tree && !p.dosel && !inZoneRect(Math.floor(p.d.x / TILE), Math.floor((p.d.y - 1) / TILE))).map((p) => p.d);
    undergrowthNear(r, world.undergrowth, edgeTrees, edgeTrees.length * 4);

    // 5f. telarañas en los troncos del bosque oscuro
    for (const p of placed) if (p.tree && TREE_P.test(p.d.sprite) && world.darkAt(Math.floor(p.d.x / TILE), Math.floor(p.d.y / TILE)) > 0.35 && r() < 0.06) decos.push({ sprite: 'telarana', x: p.d.x + 4, y: p.d.y - 18 });

    // 5g. calcomanías
    for (const sc of screens) {
      const n = decalsFor(r, sc, 9, 0, 0, IW, IH);
      mundo.pantallas.push({ x: sc.x, y: sc.y, focal: [], calcomanias: n });
    }
    for (const [zn, list] of Object.entries(world.frente)) { const mz = m.zones.find((q) => q.nombre === zn); if (mz && list.length) mz.props = { ...mz.props, frente: list.join(',') }; }
  }
  // las zonas con receta propia: árboles contados, monte bajo y calcomanías (después de que el mundo plantó)
  zones.forEach((z, zi) => {
    const r = rng(z.seed + 1);
    const [rx0, ry0, rx1, ry1] = z.rect;
    setAllowed((tx, ty) => tx >= rx0 && tx <= rx1 && ty >= ry0 && ty <= ry1);
    const rep = zonas[zi];
    const inRect = (tx: number, ty: number) => tx >= rx0 && tx <= rx1 && ty >= ry0 && ty <= ry1;
    const inside = placed.filter((p) => inRect(Math.floor(p.d.x / TILE), Math.floor((p.d.y - 1) / TILE)));
    rep.arboles = inside.filter((p) => TREE_P.test(p.d.sprite)).length;
    undergrowthNear(r, z.undergrowth, inside.filter((p) => p.tree && !p.dosel).map((p) => p.d), 900);
    for (const p of rep.pantallas) { p.calcomanias = decalsFor(r, p, 9, rx0 * TILE, ry0 * TILE, (rx1 + 1) * TILE, (ry1 + 1) * TILE); rep.calcomanias += p.calcomanias; }
  });
  m.decos.push(...decos);

  // ---------- 6. todo lo que se alcanzaba se sigue alcanzando ----------
  const start = m.entities.find((e) => e.tipo === 'jugador_inicio');
  if (start) {
    const sx = Math.floor(start.x / TILE), sy = Math.floor(start.y / TILE);
    const bfs = (blocked: (k: number) => boolean) => {
      const prev = new Int32Array(W * H).fill(-2);
      const q = [at(sx, sy)]; prev[q[0]] = -1;
      for (let qi = 0; qi < q.length; qi++) { const k = q[qi], x = k % W, y = Math.floor(k / W); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = at(x + dx, y + dy); if (j < 0 || prev[j] !== -2 || blocked(j)) continue; prev[j] = k; q.push(j); } }
      return prev;
    };
    const target = (e: { x: number; y: number }) => { const tx = Math.floor(e.x / TILE), ty = Math.floor(e.y / TILE); return [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => at(tx + dx, ty + dy)).filter((k) => k >= 0); };
    const removedSet = new Set<Deco>();
    for (let round = 0; round < 8; round++) {
      const seen = bfs((k) => solid[k] === 1);
      const lost = m.entities.filter((e) => e.tipo !== 'criatura' && !target(e).some((k) => seen[k] !== -2));
      if (!lost.length) break;
      // camino ignorando lo plantado: lo plantado que pisa ese camino se quita
      const free = bfs((k) => keptSolidSnapshot[k] === 1);
      const pathTiles = new Set<number>();
      for (const e of lost) {
        const end = target(e).find((k) => free[k] !== -2);
        for (let k = end ?? -1; k >= 0; k = free[k]) pathTiles.add(k);
      }
      let n = 0;
      for (const p of placed) {
        if (removedSet.has(p.d)) continue;
        let hit = false;
        boxTiles(p.d.sprite, p.d.x, p.d.y, (k) => { if (pathTiles.has(k)) hit = true; });
        if (hit) { removedSet.add(p.d); n++; }
      }
      if (!n) break;
      // rehacer la colisión sin lo quitado
      solid.set(keptSolidSnapshot);
      for (const p of placed) if (!removedSet.has(p.d)) boxTiles(p.d.sprite, p.d.x, p.d.y, (k) => { solid[k] = 1; });
    }
    if (removedSet.size) {
      m.decos = m.decos.filter((d) => !removedSet.has(d));
      if (mundo) mundo.quitadosPorPaso = removedSet.size;
    }
  }

  // puntos focales por pantalla: grupos y lugares
  const focalOf = (p: ScreenReport) => m.decos.filter((d) => {
    const tx = Math.floor(d.x / TILE), ty = Math.floor(d.y / TILE);
    return tx >= p.x && tx < p.x + SCREEN.w && ty >= p.y && ty < p.y + SCREEN.h && (GROUPS.includes(d.sprite) || /^(hongo_gigante|arbol_hechizado|abuelo_roble|estatua|anillo_hadas|campamento|cueva|arco_ruina|pozo|cascada|puente|carpa|cristales|espantapajaros|tronco_caido|tocon_hongos|sauce_v3|roble_otono)/.test(d.sprite));
  }).map((d) => d.sprite);
  for (const z of zonas) for (const p of z.pantallas) p.focal = focalOf(p);
  if (mundo) for (const p of mundo.pantallas) p.focal = focalOf(p);

  // ---------- 7. suelo de bosque con los troncos nuevos, caminos gastados, raíces y piso calmo ----------
  const dd = new Float32Array(W * H);
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    let n = 0, c = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const j = at(tx + dx, ty + dy); if (j < 0) continue; c++; n += trunk[j]; }
    // oscuro bajo las copas: el bosque oscuro oscurece más, pero un claro sin árboles no queda negro
    const td = n / c;
    dd[at(tx, ty)] = Math.min(1, td * 3.2 + darkOf(tx, ty) * 0.5 * Math.min(1, td * 6));
  }
  const seed = zones[0]?.seed ?? world?.seed ?? 1;
  forestFloor(t2, W, H, dd, seed, () => 0.35);
  wornPaths(t2.img.data, t2.kind, IW, IH, 0, 0, IW, IH, seed);
  // arriba de las mesetas llega más luz: el pasto sube un tono (así la altura se lee también de lejos)
  {
    const idx = new Map(GRASS.map((h, i) => [parseInt(h.slice(1), 16), i]));
    const G = GRASS.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
    const d = t2.img.data;
    for (let i = 0; i < IW * IH; i++) {
      if (!t2.high[i] || t2.kind[i] !== 0) continue;
      const gi = idx.get((d[i * 4] << 16) | (d[i * 4 + 1] << 8) | d[i * 4 + 2]);
      if (gi === undefined) continue;
      const c = G[Math.min(G.length - 1, gi + 1)];
      d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2];
    }
  }
  calmSpeckles(t2.img.data, t2.kind, IW, 0, 0, IW, IH);
  hangingRoots(t2, 0, 0, IW, IH, seed);

  // ---------- 8. el terreno nuevo pasa al mundo entero (sin costuras: es una sola pintura) ----------
  m.terrain.img.data.set(t2.img.data);
  m.terrain.kind.set(t2.kind); m.terrain.high.set(t2.high);
  m.terrain.tileKind.set(t2.tileKind); m.terrain.tileHigh.set(t2.tileHigh); m.terrain.waterTiles.set(t2.waterTiles); m.terrain.solid.set(t2.solid);
  // entidades que quedaron sobre algo sólido: al cuadro libre más cercano
  for (const e of m.entities) {
    const tx = Math.floor(e.x / TILE), ty = Math.floor(e.y / TILE);
    if (!solid[at(tx, ty)] || e.tipo === 'cofre' || e.tipo === 'rompible') continue;
    let done = false;
    for (let rad = 1; rad <= 6 && !done; rad++) for (let dy = -rad; dy <= rad && !done; dy++) for (let dx = -rad; dx <= rad && !done; dx++) {
      const k = at(tx + dx, ty + dy);
      if (k >= 0 && !solid[k] && !m.terrain.waterTiles[k]) { e.x = (tx + dx) * TILE + TILE / 2; e.y = (ty + dy) * TILE + TILE / 2; done = true; }
    }
  }
  return { zonas, mundo };
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
    const c = col(i), nb = [i - W - 1, i - W, i - W + 1, i - 1, i + 1, i + W - 1, i + W, i + W + 1];
    // lo común (algún vecino igual) se decide rápido, sin contar votos
    if (nb.some((j) => kind[j] === 0 && col(j) === c)) continue;
    const votes = new Map<number, number>();
    for (const j of nb) {
      if (kind[j] !== 0) continue;
      const v = col(j);
      votes.set(v, (votes.get(v) ?? 0) + 1);
    }
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
