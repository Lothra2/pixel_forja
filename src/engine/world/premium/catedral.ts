import { TILE } from '../tiles';
import { distTo, inPoly, type TP } from '../paint';
import type { BigMap, Deco } from '../bosqueMap';
import { brickTile, BRICK_RAMP, ABISMO_PARALAJE } from '../catedralPremium';
import { CAT } from '../catedralObjects';
import { createPlacer, SCREEN } from './placer';
import { ramp6 } from '../../loot/canvas';
import type { Raster } from '../../core/raster';

/**
 * La Catedral premium (encargo 2.1, 2.2, 2.3, 2.5, 2.6 y 2.8), sobre el mapa ya armado:
 *
 * 1. Las caras de los muros pasan a ladrillo (6 variantes, con musgo, rotos y con raíces), con el canto de arriba
 *    con luz y la oclusión al pie. Los desniveles (los descansos altos) en piedra labrada con baranda arriba.
 * 2. Donde hoy hay negro va el abismo: el techo de los muros queda con un canto y, más allá, el suelo es transparente
 *    y el juego dibuja ahí los fondos de abismo (capa fondo, con paralaje).
 * 3. Vitrales en las caras de los muros de arriba de cada sala, con su charco de luz en el piso y a veces el haz de
 *    polvo.
 * 4. Mobiliario roto con el mismo motor del Bosque (nada montado): bancas, candelabros, estatuas, libros. Calcomanías
 *    de losa en cada pantalla. Todo lo que se alcanzaba se sigue alcanzando.
 */

export interface CatedralReport {
  vitrales: number;
  muebles: Record<string, number>;
  pantallas: { x: number; y: number; focal: string[]; calcomanias: number }[];
  quitadosPorPaso: number;
}

const LIP = '#1c2130';

/** Qué va en cada sala: muebles (cuántos) y el color de sus vitrales. */
const RECETAS: Record<string, { muebles: [string, number][]; vitral: number; vitrales: number; frente: string[] }> = {
  'La Escalera Hundida': { muebles: [['candelabro_pie', 2], ['libros_tirados', 1], ['estatua_santo_rota', 1]], vitral: 0, vitrales: 2, frente: ['frente_columna'] },
  'El Atrio de las Luciérnagas': { muebles: [['banca_rota', 6], ['candelabro_pie', 3], ['libros_tirados', 2], ['estatua_santo_rota', 2]], vitral: 2, vitrales: 3, frente: ['frente_columna'] },
  'Los Claustros Quebrados': { muebles: [['estatua_santo_rota', 3], ['campana_chica', 1], ['banca_rota', 2], ['candelabro_pie', 2], ['libros_tirados', 1]], vitral: 1, vitrales: 3, frente: ['frente_raices_colgantes'] },
  'La Capilla Escondida': { muebles: [['candelabro_pie', 2], ['libros_tirados', 1]], vitral: 2, vitrales: 1, frente: ['frente_raices_colgantes'] },
  'La Nave Inundada': { muebles: [['banca_rota', 5], ['candelabro_pie', 3], ['campana_chica', 1], ['estatua_santo_rota', 2], ['libros_tirados', 1]], vitral: 0, vitrales: 2, frente: ['frente_columna', 'frente_raices_colgantes'] },
  'La Forja Apagada': { muebles: [['candelabro_pie', 3], ['banca_rota', 1], ['estatua_santo_rota', 1], ['libros_tirados', 1]], vitral: 0, vitrales: 2, frente: ['frente_columna'] },
  'El Campanario Invertido': { muebles: [['candelabro_pie', 4], ['estatua_santo_rota', 2]], vitral: 1, vitrales: 2, frente: ['frente_raices_colgantes'] },
};

const DECALS = ['musgo_losa_0', 'musgo_losa_1', 'musgo_losa_2', 'musgo_losa_3', 'grieta_losa_0', 'grieta_losa_1', 'grieta_losa_2', 'grieta_losa_3', 'escombro_chico_0', 'escombro_chico_1', 'escombro_chico_2', 'cera_derretida_0', 'cera_derretida_1', 'charco_negro_0', 'charco_negro_1'];

function hash(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

export function premiumCatedral(m: BigMap, info: { descansos: TP[][]; seed: number; darkAt: (tx: number, ty: number) => number }): CatedralReport {
  const W = m.w, H = m.h, img = m.terrain.img, PW = img.w, PH = img.h, kind = m.terrain.kind, high = m.terrain.high;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : y * W + x);
  const enDescanso = (px: number, py: number) => info.descansos.some((d) => inPoly(px / TILE, py / TILE, d));
  const set = (i: number, c: number[]) => { img.data[i * 4] = c[0]; img.data[i * 4 + 1] = c[1]; img.data[i * 4 + 2] = c[2]; img.data[i * 4 + 3] = 255; };
  const tiles = new Map<string, Raster>();
  const tile = (k: 'base' | 'musgo' | 'roto' | 'raiz', v: number) => { const key = `${k}${v}`; let t = tiles.get(key); if (!t) { t = brickTile(k, v); tiles.set(key, t); } return t; };
  const LAB = ramp6(CAT.piedraClara, 'stone').map(rgb);

  // ---------- 1. caras de los muros: ladrillo, y piedra labrada con baranda en los desniveles ----------
  const faces: { x: number; top: number; bottom: number; descanso: boolean }[] = [];
  for (let x = 0; x < PW; x++) {
    let y = 1;
    while (y < PH) {
      const i = y * PW + x;
      if (kind[i] !== 3 || kind[i - PW] === 3) { y++; continue; }
      let b = y;
      while (b + 1 < PH && kind[(b + 1) * PW + x] === 3) b++;
      const descanso = high[(y - 1) * PW + x] === 1 && enDescanso(x, y - 1);
      faces.push({ x, top: y, bottom: b, descanso });
      for (let yy = y; yy <= b; yy++) {
        const j = yy * PW + x, d = yy - y, fromBottom = b - yy;
        let c: number[];
        if (descanso) {
          // sillares de 32 x 16 trabados, junta fina, canto de arriba moldurado
          const course = d >> 4, ly = d & 15, lx = (x + (course % 2) * 16) & 31;
          let t = 3 + Math.round((hash((x + (course % 2) * 16) >> 5, course, 41) - 0.5) * 1.2);
          if (ly === 0) t = 5; else if (ly === 15 || lx === 31) t = 1; else if (lx === 0) t = 4;
          if (d < 3) t = d === 0 ? 5 : 4;
          c = LAB[Math.max(0, Math.min(5, t))];
        } else {
          const row = d >> 5, h0 = hash(x >> 5, row + (y >> 3), info.seed);
          const v = Math.floor(hash(x >> 5, row, info.seed + 1) * 6);
          const k = h0 < 0.55 ? 'base' : h0 < 0.72 + (row >= 1 ? 0.06 : 0) ? 'musgo' : h0 < 0.87 ? 'raiz' : 'roto';
          const t = tile(k, k === 'base' ? v : v % 3), p = ((d & 31) * 32 + (x & 31)) * 4;
          c = [t.data[p], t.data[p + 1], t.data[p + 2]];
          if (d < 2) c = rgb(BRICK_RAMP[d === 0 ? 5 : 4]); // canto de arriba con luz
        }
        // oclusión al pie del muro: los últimos 4 px se oscurecen hacia el azul
        if (fromBottom < 4) { const k2 = (4 - fromBottom) * 0.12; c = [c[0] * (1 - k2) + 8 * k2, c[1] * (1 - k2) + 10 * k2, c[2] * (1 - k2) + 20 * k2]; }
        set(j, c);
      }
      y = b + 1;
    }
  }
  // baranda arriba de cada desnivel (no en las escaleras)
  for (const f of faces) {
    if (!f.descanso) continue;
    const stairNear = [-3, 0, 3].some((dx) => kind[f.top * PW + Math.min(PW - 1, Math.max(0, f.x + dx))] === 5);
    if (stairNear) continue;
    for (let yy = f.top - 10; yy < f.top; yy++) {
      if (yy < 0) continue;
      const i = yy * PW + f.x;
      if (!high[i] || !enDescanso(f.x, yy)) continue;
      const ly = yy - (f.top - 10);
      const post = f.x % 6 < 2;
      if (ly <= 1) set(i, LAB[ly === 0 ? 5 : 3]); // pasamanos
      else if (ly === 9) set(i, LAB[1]); // base de la baranda
      else if (post) set(i, LAB[f.x % 6 === 0 ? 4 : 2]); // balaustre: luz a la izquierda
    }
  }

  // ---------- 2. el abismo: más allá del canto del techo de los muros no hay suelo ----------
  const low = new Uint8Array(PW * PH);
  for (let i = 0; i < low.length; i++) low[i] = high[i] ? 0 : 1;
  const dLow = distTo(low, PW, PH);
  let abismo = 0;
  for (let i = 0; i < PW * PH; i++) {
    if (!high[i]) continue;
    const x = i % PW, y = (i / PW) | 0;
    if (enDescanso(x, y)) continue;
    // el techo de los muros y el abismo no se pisan: tipo 6 (así el motor no pone nada arriba)
    kind[i] = 6;
    const dl = dLow[i];
    if (dl > 36) { img.data[i * 4 + 3] = 0; abismo++; }
    else if (dl > 33) set(i, rgb(LIP));
  }
  // el agua que se metía en el muro (el río nace y muere adentro de la piedra) no va en el abismo
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    const k = at(tx, ty);
    if (m.terrain.waterTiles[k] && m.terrain.tileHigh[k]) m.terrain.waterTiles[k] = 0;
  }
  m.meta = { ...(m.meta ?? { bioma: 'catedral', musica: 'catedral', nombre: 'La Catedral de las Raíces' }), fondo: ABISMO_PARALAJE.map((p, k) => ({ id: `fondo_abismo_${k}`, paralaje: p })) };
  void abismo;

  // ---------- 3. vitrales en las caras de arriba de las salas ----------
  const byName = new Map(m.objects.map((o) => [o.name, o]));
  const zoneAt = (px: number, py: number) => m.zones.find((z) => px >= z.x && px < z.x + z.w && py >= z.y && py < z.y + z.h);
  const decos: Deco[] = [];
  const report: CatedralReport = { vitrales: 0, muebles: {}, pantallas: [], quitadosPorPaso: 0 };
  const wallDecos = m.decos.filter((d) => /^(raices_muro|columna|arco_roto|haz_luz)/.test(d.sprite));
  const windows: { x: number; y: number }[] = [];
  const perZone = new Map<string, number>();
  const cand = faces.filter((f) => !f.descanso && f.bottom - f.top >= 54 && f.x % 8 === 0).sort((a, b) => hash(a.x, a.top, 51) - hash(b.x, b.top, 51));
  for (const f of cand) {
    const below = (f.bottom + 6) * PW + f.x;
    if (kind[below] !== 2 && kind[below] !== 0) continue;
    // la cara tiene que seguir entera a los dos lados (el vitral no cuelga de una esquina)
    if (![-22, 22].every((dx) => faces.some((g) => g.x === f.x + dx && Math.abs(g.bottom - f.bottom) < 6 && !g.descanso))) continue;
    const z = zoneAt(f.x, f.bottom + 8);
    if (!z) continue;
    const rec = RECETAS[z.nombre];
    if (!rec || (perZone.get(z.nombre) ?? 0) >= rec.vitrales) continue;
    if (wallDecos.some((d) => Math.abs(d.x - f.x) < 56 && Math.abs(d.y - f.bottom) < 120)) continue;
    if (windows.some((w) => Math.abs(w.x - f.x) < 7 * TILE && Math.abs(w.y - f.bottom) < 4 * TILE)) continue;
    if (m.entities.some((e) => Math.abs(e.x - f.x) < 40 && e.y - f.bottom < 70 && e.y > f.bottom - 10)) continue;
    const v = rec.vitral;
    decos.push({ sprite: `vitral_${v}`, x: f.x, y: f.bottom - 1 });
    // el charco de luz cae abajo a la derecha, sobre el piso
    const lx = f.x + 34, ly = f.bottom + 62;
    if (kind[Math.min(PH - 1, ly - 30) * PW + Math.min(PW - 1, lx)] === 2) {
      decos.push({ sprite: `luz_vitral_${v}`, x: lx, y: ly });
      if (windows.length % 2 === 0) decos.push({ sprite: 'haz_polvo', x: f.x + 34, y: f.bottom + 44 });
    }
    windows.push({ x: f.x, y: f.bottom });
    perZone.set(z.nombre, (perZone.get(z.nombre) ?? 0) + 1);
    report.vitrales++;
  }

  // ---------- 4. mobiliario, con el motor de nada montado ----------
  const special = new Uint8Array(W * H), clear = new Uint8Array(W * H);
  for (const e of m.entities) {
    const tx = Math.floor(e.x / TILE), ty = Math.floor(e.y / TILE);
    if (e.tipo === 'cofre' || e.tipo === 'rompible') special[at(tx, ty)] = 1;
    // compuertas, arena del jefe y el agua peligrosa quedan libres
    if (e.tipo === 'compuerta_raices') { const p = e.props as Record<string, number>; for (let y = p.y0 - 1; y <= p.y1 + 1; y++) for (let x = p.x0 - 1; x <= p.x1 + 1; x++) if (at(x, y) >= 0) clear[at(x, y)] = 1; }
    if (e.tipo === 'arena_jefe') { const R = Number(e.props?.radio ?? 160) / TILE + 1, n = Math.ceil(R); for (let y = -n; y <= n; y++) for (let x = -n; x <= n; x++) if (x * x + y * y <= R * R && at(tx + x, ty + y) >= 0) clear[at(tx + x, ty + y)] = 1; }
    for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) if (at(tx + x, ty + y) >= 0) clear[at(tx + x, ty + y)] = 1;
  }
  const keep = [...m.decos, ...decos];
  const designed = keep.filter((d) => byName.get(d.sprite)?.layer !== 'suelo');
  const darkOf = info.darkAt;
  const decalPool = (road: boolean, wet: boolean) => (road ? [] : DECALS.filter((d) => wet || !d.startsWith('charco')));
  const solidBefore = new Uint8Array(m.solid);
  const P = createPlacer({ m, t2: m.terrain, byName, keep, solid: m.solid, special, clear, designed, darkOf, decalPool, floorKind: 2, roadKinds: [5] });
  const r = rng(info.seed);
  for (const z of m.zones) {
    const rec = RECETAS[z.nombre];
    if (!rec) continue;
    const X0 = z.x, Y0 = z.y, X1 = z.x + z.w, Y1 = z.y + z.h;
    P.setAllowed((tx, ty) => tx * TILE >= X0 && (tx + 1) * TILE <= X1 && ty * TILE >= Y0 && (ty + 1) * TILE <= Y1);
    const mine: { s: string; x: number; y: number }[] = [];
    for (const [sprite, n] of rec.muebles) {
      for (let k = 0; k < n; k++) {
        let ok = false;
        for (let t = 0; t < 400 && !ok; t++) {
          const px = Math.round(X0 + 16 + r() * (z.w - 32)), py = Math.round(Y0 + 24 + r() * (z.h - 32));
          // los de la misma familia se reparten (a 4 cuadros), los demás a 2
          if (mine.some((q) => Math.hypot(q.x - px, q.y - py) < (q.s === sprite ? 4 : 2) * TILE)) continue;
          if (P.fits(sprite, px, py, { roadGap: 10, maxOverlap: 0, edge: 14 }) || P.fits(sprite, px, py, { roadGap: 10, maxOverlap: 0, edge: 14, onlyHigh: true })) {
            P.place(sprite, px, py);
            mine.push({ s: sprite, x: px, y: py });
            report.muebles[sprite] = (report.muebles[sprite] ?? 0) + 1;
            ok = true;
          }
        }
      }
    }
    if (rec.frente.length) z.props = { ...z.props, frente: rec.frente.join(',') };
  }

  // ---------- 5. calcomanías y punto focal en cada pantalla con piso ----------
  P.setAllowed(() => true);
  const FOCAL = /^(vitral|estatua_santo|banca_rota|candelabro_pie|brasero|columna|arco_roto|puente_piedra|haz_luz)/;
  const focalTipos = new Set(['forja', 'pedestal_brasas', 'campana', 'brasero_brasa', 'punto_guardado']);
  for (let sy = 0; sy + SCREEN.h / 2 <= H; sy += SCREEN.h) for (let sx = 0; sx < W; sx += SCREEN.w) {
    let floor = 0, total = 0;
    for (let ty = sy; ty < Math.min(H, sy + SCREEN.h); ty++) for (let tx = sx; tx < Math.min(W, sx + SCREEN.w); tx++) { total++; if (!m.solid[at(tx, ty)] && !m.terrain.tileHigh[at(tx, ty)] && m.terrain.tileKind[at(tx, ty)] === 2) floor++; }
    if (floor < total * 0.25) continue;
    const sc = { x: sx, y: sy };
    const n = P.decalsFor(r, sc, 8, sx * TILE, sy * TILE, (sx + SCREEN.w) * TILE, (sy + SCREEN.h) * TILE);
    report.pantallas.push({ x: sx, y: sy, focal: [], calcomanias: n });
  }
  m.decos.push(...decos, ...P.decos);

  // ---------- 6. todo lo que se alcanzaba se sigue alcanzando ----------
  const start = m.entities.find((e) => e.tipo === 'jugador_inicio');
  if (start) {
    const sx = Math.floor(start.x / TILE), sy = Math.floor(start.y / TILE);
    const bfs = (blocked: (k: number) => boolean) => {
      const prev = new Int32Array(W * H).fill(-2), q = [at(sx, sy)];
      prev[q[0]] = -1;
      for (let qi = 0; qi < q.length; qi++) { const k = q[qi], x = k % W, y = Math.floor(k / W); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = at(x + dx, y + dy); if (j < 0 || prev[j] !== -2 || blocked(j)) continue; prev[j] = k; q.push(j); } }
      return prev;
    };
    const before = bfs((k) => solidBefore[k] === 1), after = bfs((k) => m.solid[k] === 1);
    const lost = new Set<number>();
    // un cuadro libre que antes se alcanzaba y ahora quedó encerrado (el cuadro del mueble mismo no cuenta)
    for (let k = 0; k < W * H; k++) if (before[k] !== -2 && after[k] === -2 && !m.solid[k]) lost.add(k);
    if (lost.size) {
      // se quita lo colocado que corta un paso (lo que antes se alcanzaba y ahora no)
      const removed = new Set<Deco>();
      for (const p of P.placed) {
        let hit = false;
        P.boxTiles(p.d.sprite, p.d.x, p.d.y, (k) => { for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) if (lost.has(k + dx + dy * W)) hit = true; });
        if (hit) removed.add(p.d);
      }
      m.decos = m.decos.filter((d) => !removed.has(d));
      m.solid.set(solidBefore);
      for (const p of P.placed) if (!removed.has(p.d)) P.boxTiles(p.d.sprite, p.d.x, p.d.y, (k) => { m.solid[k] = 1; });
      report.quitadosPorPaso = removed.size;
    }
  }
  for (const p of report.pantallas) {
    p.focal = [
      ...m.decos.filter((d) => FOCAL.test(d.sprite) && d.x >= p.x * TILE && d.x < (p.x + SCREEN.w) * TILE && d.y >= p.y * TILE && d.y < (p.y + SCREEN.h) * TILE).map((d) => d.sprite),
      ...m.entities.filter((e) => focalTipos.has(e.tipo) && e.x >= p.x * TILE && e.x < (p.x + SCREEN.w) * TILE && e.y >= p.y * TILE && e.y < (p.y + SCREEN.h) * TILE).map((e) => e.tipo),
    ];
  }
  return report;
}
