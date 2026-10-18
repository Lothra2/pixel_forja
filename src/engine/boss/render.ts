import { createRaster, type Raster } from '../core/raster';
import { hexToRgb, hexToLab, labToHex } from '../color/oklab';
import {
  type V3, type M3, type Piece, type Shape, add, sub, dot, norm, mv, mt, mm, sdShape, shapeBounds, transformShape, smin,
  fbm3, voronoiEdge, noise3,
} from './sdf';

/**
 * Pintor de jefes grandes. Arma el cuerpo con formas 3D (sdf.ts), lo mira desde arriba en 3/4 como el resto del
 * juego y lo pinta pixel por pixel a su tamaño final, sin agrandar nada:
 *
 * - Luz única de arriba a la izquierda (la misma del kit), de 5 a 7 tonos por material, con la luz tirando a amarillo
 *   cálido y la sombra a azul violeta (rampas de color, no de brillo).
 * - Textura pegada a cada pieza: mechones en el pelo, grietas en la piedra, poros en el cuero, brillo duro en el metal.
 * - Oclusión: donde una pieza tapa a otra, la de atrás se oscurece al lado del borde (eso asienta los volúmenes).
 * - Contorno de 1 pixel a la resolución nativa, del tono más oscuro de cada material.
 */

export interface BossMaterial {
  /** tonos de oscuro a claro (5 a 7) */
  ramp: string[];
  /** tipo de superficie: cambia la textura y el brillo */
  surface?: 'fur' | 'skin' | 'leather' | 'metal' | 'stone' | 'wood' | 'horn' | 'cloth' | 'glow' | 'eye' | 'crack';
  /**
   * 'crack' (el Diablo): piel con grietas de brasa. Los dos últimos tonos de la rampa son la brasa (tibia y al rojo);
   * la piel usa los de abajo. `heat` (0 a 1.5) es cuánto se abren las grietas (0: piel fría, sin brasa).
   */
  heat?: number;
  /** cuánto pesa la textura (0 a 1) */
  tex?: number;
  /** escala de la textura (pixeles por celda de ruido) */
  scale?: number;
  /** contorno propio (si no, el tono más oscuro un poco más oscuro) */
  outline?: string;
  /** una segunda capa que aparece con ruido (verdín sobre el cobre, musgo): material y cuánto cubre (0 a 1) */
  patch?: { mat: string; amount: number; scale?: number; below?: number };
}

export interface BossScene {
  pieces: Piece[];
  materials: Record<string, BossMaterial>;
  /** suavidad de la unión por grupo (pixeles). Los que no figuran se unen duro */
  smooth?: Record<number, number>;
  /**
   * Agua (el Pez Farol): lo que queda debajo de esta altura (pixeles sobre el piso, el piso es la superficie) se ve a
   * través del agua: teñido del color del agua y semitransparente, con la línea del agua clara donde la corta.
   */
  water?: { level: number; color: string; alpha: number; line: string; /** más hondo que esto ya no se ve (pixeles bajo la superficie) */ cut?: number };
}

export interface BossView {
  /** hacia dónde mira el cuerpo: 0 derecha, 90 hacia la cámara (abajo), 180 izquierda, 270 de espaldas */
  yaw: number;
  /** elevación de la cámara en grados (cuánto se ve desde arriba) */
  elev?: number;
}

export interface BossFrame {
  raster: Raster;
  /** pixeles que quedaron fuera de la celda (0 = cabe) */
  overflow: number;
  /** caja de lo dibujado dentro de la celda */
  body: { x0: number; y0: number; x1: number; y1: number } | null;
  /** todo lo dibujado (también lo que se sale), en pixeles respecto del pivote */
  extent: { x0: number; y0: number; x1: number; y1: number } | null;
  /** el lienzo completo con margen y dónde cae el pivote en él (para recortar con otro pivote sin volver a pintar) */
  full: Raster;
  origin: [number, number];
}

const LIGHT: V3 = norm([-0.62, 0.78, 0.55]);
/** medio vector entre la luz y la cámara (brillo especular del metal) */
const HALF: V3 = norm(add(LIGHT, [0, 0, 1]));

interface Cam { piece: Piece; shape: Shape; lo: V3; hi: V3; Mc: M3 }

/** Matriz del personaje a la cámara: giro (yaw) y luego elevación. */
export function camMatrix(view: BossView): M3 {
  const f = (view.yaw * Math.PI) / 180, e = ((view.elev ?? 30) * Math.PI) / 180;
  const Y: M3 = [[Math.cos(f), 0, -Math.sin(f)], [0, 1, 0], [Math.sin(f), 0, Math.cos(f)]];
  const E: M3 = [[1, 0, 0], [0, Math.cos(e), -Math.sin(e)], [0, Math.sin(e), Math.cos(e)]];
  return mm(E, Y);
}

/**
 * Pinta una escena en una celda. El apoyo (el origen del personaje, el centro de su sombra) cae en `pivot`.
 * Se pinta con margen para saber si algo se sale; lo de afuera se cuenta en `overflow`.
 */
export function renderBoss(scene: BossScene, cell: number, view: BossView, pivot: [number, number] = [cell / 2, cell - 2]): BossFrame {
  const C = camMatrix(view), Ci = mt(C);
  const M = Math.round(cell / 2);
  const W = cell + 2 * M, H = cell + 2 * M;
  const ox = M + pivot[0], oy = M + pivot[1];
  const cams: Cam[] = scene.pieces.map((p) => {
    const shape = transformShape(p.shape, C, [0, 0, 0]);
    const pad = (p.bump ?? 0) + (scene.smooth?.[p.g] ?? 0) * 0.5 + 0.5;
    const b = shapeBounds(shape, pad);
    return { piece: p, shape, lo: b.lo, hi: b.hi, Mc: C };
  });
  const groups = new Map<number, number[]>();
  cams.forEach((c, i) => { const g = groups.get(c.piece.g) ?? []; g.push(i); groups.set(c.piece.g, g); });

  // textura: el punto en el marco local de la pieza (pegado a ella aunque el cuerpo se mueva)
  // la veta va primero: l[0] es siempre la dirección en que corre el pelo o la madera
  const local = (p: Piece, pc: V3): V3 => {
    const ch = mv(Ci, pc);
    const l = p.frame ? mv(p.frame, sub(ch, p.o ?? [0, 0, 0])) : sub(ch, p.o ?? [0, 0, 0]);
    return p.grain === 1 ? [l[1], l[0], l[2]] : p.grain === 2 ? [l[2], l[1], l[0]] : l;
  };
  const bumpOf = (c: Cam, pc: V3): number => {
    const b = c.piece.bump;
    if (!b) return 0;
    const l = local(c.piece, pc);
    const mat = scene.materials[c.piece.mat];
    const s = mat?.scale ?? 3;
    // pelo: mechones alargados a lo largo del eje x local; piedra: rugosa pareja
    if (mat?.surface === 'fur') return b * (fbm3(l[0] / (s * 2.6), l[1] / s, l[2] / s, 2) - 0.5) * 2;
    return b * (fbm3(l[0] / s, l[1] / s, l[2] / s, 2) - 0.5) * 2;
  };
  // distancia de la escena (solo las piezas candidatas de este pixel) y qué pieza es la más cercana
  const sceneAt = (pc: V3, cand: number[]): { d: number; best: number } => {
    let D = Infinity, best = -1, bestD = Infinity;
    const byG = new Map<number, number>();
    for (const i of cand) {
      const c = cams[i];
      const raw = sdShape(pc, c.shape);
      // el relieve solo importa cerca de la superficie: lejos se salta el ruido (es lo que más tarda)
      const d = c.piece.bump && raw < c.piece.bump * 1.5 + 0.5 ? raw - bumpOf(c, pc) : raw;
      if (d < bestD) { bestD = d; best = i; }
      const g = c.piece.g, k = scene.smooth?.[g] ?? 0;
      const prev = byG.get(g);
      byG.set(g, prev === undefined ? d : smin(prev, d, k));
    }
    for (const v of byG.values()) D = Math.min(D, v);
    return { d: D, best };
  };

  const N = W * H;
  const mat: (string | null)[] = new Array(N).fill(null);
  const tone = new Int16Array(N);
  const depth = new Float32Array(N).fill(-Infinity);
  const grp = new Int32Array(N).fill(-1);
  const pid = new Int32Array(N).fill(-1);
  const nrm: (V3 | null)[] = new Array(N).fill(null);
  // altura en el mundo de cada pixel dibujado (solo si la escena trae agua)
  const wy = scene.water ? new Float32Array(N).fill(Infinity) : null;

  // candidatas por columna de pixeles para no recorrer todas en cada pixel
  for (let py = 0; py < H; py++) {
    const y = oy - (py + 0.5);
    const rowC = cams.map((c, i) => (y >= c.lo[1] && y <= c.hi[1] ? i : -1)).filter((i) => i >= 0);
    if (!rowC.length) continue;
    for (let px = 0; px < W; px++) {
      const x = px + 0.5 - ox;
      const cand = rowC.filter((i) => x >= cams[i].lo[0] && x <= cams[i].hi[0]);
      if (!cand.length) continue;
      let zTop = -Infinity, zBot = Infinity;
      for (const i of cand) { zTop = Math.max(zTop, cams[i].hi[2]); zBot = Math.min(zBot, cams[i].lo[2]); }
      // marcha del rayo de adelante hacia atrás (la cámara mira hacia -z)
      let z = zTop, hit = -1;
      for (let step = 0; step < 90 && z > zBot; step++) {
        const s = sceneAt([x, y, z], cand);
        if (s.d < 0.06) { hit = s.best; break; }
        z -= Math.max(0.05, s.d * 0.85);
      }
      if (hit < 0) continue;
      const i = py * W + px;
      const p: V3 = [x, y, z];
      const e = 0.5;
      const dd = (q: V3) => sceneAt(q, cand).d;
      const n = norm([dd([x + e, y, z]) - dd([x - e, y, z]), dd([x, y + e, z]) - dd([x, y - e, z]), dd([x, y, z + e]) - dd([x, y, z - e])]);
      const pc = cams[hit].piece;
      mat[i] = pc.mat;
      depth[i] = z;
      grp[i] = pc.g;
      pid[i] = hit;
      nrm[i] = n;
      if (wy) wy[i] = mv(Ci, p)[1];
      tone[i] = shade(scene, pc, local(pc, p), n);
      // segunda capa (verdín, musgo): cambia de material donde el ruido lo dice
      const m = scene.materials[pc.mat];
      if (m?.patch) {
        const l = local(pc, p), s = m.patch.scale ?? 6;
        const k = fbm3(l[0] / s + 11, l[1] / s, l[2] / s + 5, 3);
        const below = m.patch.below === undefined ? 0 : (m.patch.below - n[1]) * 0.25;
        if (k + below > 1 - m.patch.amount) { mat[i] = m.patch.mat; tone[i] = shade(scene, { ...pc, mat: m.patch.mat }, l, n); }
      }
    }
  }

  // oclusión: lo que queda detrás de una pieza que pasa por delante se oscurece pegado al borde
  const ao = new Int8Array(N);
  for (let py = 1; py < H - 1; py++)
    for (let px = 1; px < W - 1; px++) {
      const i = py * W + px;
      if (!mat[i] || scene.materials[mat[i]!]?.surface === 'glow') continue;
      let occ = 0;
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) {
          if (!dx && !dy) continue;
          const X = px + dx, Y = py + dy;
          if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
          const j = Y * W + X;
          if (mat[j] && grp[j] !== grp[i] && depth[j] - depth[i] > 2.5) occ += Math.abs(dx) + Math.abs(dy) <= 2 ? 2 : 1;
        }
      ao[i] = occ >= 6 ? 2 : occ >= 2 ? 1 : 0;
    }
  for (let i = 0; i < N; i++) if (ao[i]) tone[i] = Math.max(0, tone[i] - ao[i]);

  // líneas de adentro: donde una pieza pasa delante de otra de otro grupo, la de atrás lleva su tono más oscuro
  const inner: number[] = [];
  for (let py = 1; py < H - 1; py++)
    for (let px = 1; px < W - 1; px++) {
      const i = py * W + px;
      if (!mat[i]) continue;
      // en el borde de afuera no: ahí va el contorno y quedaría una raya de 2 pixeles
      if (!mat[i - 1] || !mat[i + 1] || !mat[i - W] || !mat[i + W]) continue;
      for (const j of [i - 1, i + 1, i - W, i + W]) {
        if (mat[j] && grp[j] !== grp[i] && depth[j] - depth[i] > 3.5) { inner.push(i); break; }
      }
    }
  for (const i of inner) if (scene.materials[mat[i]!]?.surface !== 'glow') tone[i] = -1;

  // limpieza: un pixel de un tono que no tiene a nadie igual alrededor se pasa al tono de la mayoría
  for (let pass = 0; pass < 2; pass++)
    for (let py = 1; py < H - 1; py++)
      for (let px = 1; px < W - 1; px++) {
        const i = py * W + px;
        if (!mat[i] || tone[i] < 0) continue;
        const nb = [i - 1, i + 1, i - W, i + W];
        if (nb.some((j) => mat[j] === mat[i] && tone[j] === tone[i])) continue;
        const same = nb.filter((j) => mat[j] === mat[i] && tone[j] >= 0);
        if (same.length < 3) continue;
        const count = new Map<number, number>();
        for (const j of same) count.set(tone[j], (count.get(tone[j]) ?? 0) + 1);
        const [t, c] = [...count.entries()].sort((a, b) => b[1] - a[1])[0];
        if (c >= 2) tone[i] = t;
      }

  // a color
  const big = createRaster(W, H);
  const put = (i: number, hex: string) => { const [r, g, b] = hexToRgb(hex); big.data[i * 4] = r; big.data[i * 4 + 1] = g; big.data[i * 4 + 2] = b; big.data[i * 4 + 3] = 255; };
  // el contorno es más oscuro que la sombra más oscura: si fuera igual, la sombra del borde lo engorda a 2 px
  const outlineOf = (m: string) => scene.materials[m]?.outline ?? outlineHex(scene.materials[m]?.ramp[0] ?? '#1a1220');
  for (let i = 0; i < N; i++) {
    const m = mat[i];
    if (!m) continue;
    const def = scene.materials[m];
    if (!def) continue;
    put(i, tone[i] < 0 ? outlineOf(m) : def.ramp[Math.min(def.ramp.length - 1, tone[i])]);
  }
  // contorno de afuera: 1 pixel del oscuro de la pieza vecina
  const edge: [number, string][] = [];
  for (let py = 0; py < H; py++)
    for (let px = 0; px < W; px++) {
      const i = py * W + px;
      if (mat[i]) continue;
      let best: string | null = null, bestD = -Infinity;
      for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
        const X = px + dx, Y = py + dy;
        if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const j = Y * W + X;
        if (mat[j] && depth[j] > bestD) { bestD = depth[j]; best = mat[j]; }
      }
      if (best) edge.push([i, scene.materials[best]?.surface === 'glow' ? scene.materials[best].ramp[Math.max(0, scene.materials[best].ramp.length - 3)] : outlineOf(best)]);
    }
  for (const [i, hex] of edge) put(i, hex);
  // lo que está debajo del agua: teñido y translúcido, y la línea donde el agua lo corta
  if (wy && scene.water) {
    const w = scene.water, [wr, wg, wb] = hexToRgb(w.color), [lr, lg, lb] = hexToRgb(w.line);
    const under = (i: number) => wy[i] < w.level;
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      const i = py * W + px;
      if (!big.data[i * 4 + 3]) continue;
      // el contorno toma el estado del pixel dibujado de al lado
      let u = mat[i] ? under(i) : false;
      let depN = 0;
      if (!mat[i]) for (const j of [i - 1, i + 1, i - W, i + W]) if (j >= 0 && j < N && mat[j] && under(j)) { u = true; depN = Math.max(depN, w.level - wy[j]); }
      if (!u) continue;
      const k = i * 4;
      // la línea del agua: el primer pixel sumergido debajo de uno que no lo está
      const above = py > 0 && mat[i - W] && !under(i - W);
      if (above) { big.data[k] = lr; big.data[k + 1] = lg; big.data[k + 2] = lb; big.data[k + 3] = 230; continue; }
      // lo muy hondo se pierde en lo negro del agua
      const dep = mat[i] ? w.level - wy[i] : depN;
      if (w.cut !== undefined && dep > w.cut) { big.data[k + 3] = 0; continue; }
      big.data[k] = Math.round(big.data[k] * 0.35 + wr * 0.65);
      big.data[k + 1] = Math.round(big.data[k + 1] * 0.35 + wg * 0.65);
      big.data[k + 2] = Math.round(big.data[k + 2] * 0.35 + wb * 0.65);
      big.data[k + 3] = w.cut !== undefined ? Math.round(w.alpha * (1 - Math.min(0.7, dep / w.cut))) : w.alpha;
    }
  }

  // recorte a la celda y conteo de lo que se sale
  const out = createRaster(cell, cell);
  let overflow = 0, x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  let ex0 = Infinity, ey0 = Infinity, ex1 = -Infinity, ey1 = -Infinity;
  for (let py = 0; py < H; py++)
    for (let px = 0; px < W; px++) {
      const s = (py * W + px) * 4;
      if (!big.data[s + 3]) continue;
      ex0 = Math.min(ex0, px - ox); ex1 = Math.max(ex1, px - ox); ey0 = Math.min(ey0, py - oy); ey1 = Math.max(ey1, py - oy);
      const X = px - M, Y = py - M;
      if (X < 0 || Y < 0 || X >= cell || Y >= cell) { overflow++; continue; }
      const t = (Y * cell + X) * 4;
      for (let c = 0; c < 4; c++) out.data[t + c] = big.data[s + c];
      x0 = Math.min(x0, X); y0 = Math.min(y0, Y); x1 = Math.max(x1, X); y1 = Math.max(y1, Y);
    }
  return { raster: out, overflow, body: y1 < 0 ? null : { x0, y0, x1, y1 }, extent: ex1 < ex0 ? null : { x0: ex0, y0: ey0, x1: ex1, y1: ey1 }, full: big, origin: [ox, oy] };
}

/** Tono (índice en la rampa) de un punto según la luz, la textura y el material. */
function shade(scene: BossScene, p: Piece, l: V3, n: V3): number {
  const m = scene.materials[p.mat];
  if (!m) return 0;
  const T = m.ramp.length - 1;
  // brillo: el color saturado, con el centro (lo que mira a la cámara) casi blanco
  if (m.surface === 'glow') return n[2] > 0.82 ? T : Math.max(0, T - 1);
  const diff = dot(n, LIGHT);
  // luz envolvente: el lado de la sombra no se va a negro (rebote del suelo), la luz directa sube rápido
  let v = 0.42 + 0.5 * diff;
  // rebote frío desde abajo en las caras que miran al piso (más volumen)
  if (n[1] < -0.55) v += 0.05;
  const k = m.tex ?? 0.5, s = m.scale ?? 3;
  switch (m.surface) {
    case 'fur': {
      // mechones: franjas largas a lo largo del eje de la pieza, cortadas cada tanto
      // mechones: franjas largas a lo largo de la veta; entre mechón y mechón una raya más oscura
      const strand = fbm3(l[0] / (s * 3.5), l[1] / s, l[2] / s, 2);
      v += (strand - 0.5) * 0.5 * k;
      if (Math.abs(strand - 0.5) < 0.035) v -= 0.12 * k;
      break;
    }
    case 'stone': {
      const e = voronoiEdge(l[0] / (s * 2.2), l[1] / (s * 2.2), l[2] / (s * 2.2));
      v += (fbm3(l[0] / s, l[1] / s, l[2] / s, 2) - 0.5) * 0.3 * k;
      if (e < 0.07) return Math.max(0, Math.round(v * T) - 2);
      break;
    }
    case 'leather': v += (noise3(l[0] / s, l[1] / s, l[2] / s) - 0.5) * 0.18 * k; break;
    case 'wood': v += (fbm3(l[0] / (s * 4), l[1] / (s * 0.6), l[2] / (s * 0.6), 2) - 0.5) * 0.4 * k; break;
    case 'horn': v += (noise3(l[0] / (s * 0.7), 0, 0) - 0.5) * 0.25 * k; break;
    case 'cloth': v += (fbm3(l[0] / s, l[1] / s, l[2] / s, 2) - 0.5) * 0.15 * k; break;
    case 'metal': {
      // metal: contraste duro y un brillo de 1 o 2 pixeles donde rebota la luz
      v = 0.3 + 0.62 * diff;
      if (dot(n, HALF) > 0.965) return T;
      v += (noise3(l[0] / s, l[1] / s, l[2] / s) - 0.5) * 0.12 * k;
      return Math.max(0, Math.min(T - 1, Math.round(v * (T - 1))));
    }
    case 'eye': return dot(n, HALF) > 0.9 ? T : 0;
    case 'crack': {
      // piel gruesa con poros, partida en placas por grietas de brasa (pegadas a la pieza, no se resbalan)
      v += (noise3(l[0] / s, l[1] / s, l[2] / s) - 0.5) * 0.2 * k;
      const heat = m.heat ?? 1;
      const e = voronoiEdge(l[0] / (s * 4.2), l[1] / (s * 4.2), l[2] / (s * 4.2));
      if (heat > 0.05 && e < 0.028 * heat) return T;
      if (heat > 0.05 && e < 0.052 * heat) return T - 1;
      if (e < 0.07) return Math.max(0, Math.round(v * (T - 2)) - 1);
      return Math.max(0, Math.min(T - 2, Math.round(v * (T - 2))));
    }
    default: v += (noise3(l[0] / s, l[1] / s, l[2] / s) - 0.5) * 0.1 * k;
  }
  return Math.max(0, Math.min(T, Math.round(v * T)));
}

/** Arma una rampa de n tonos desde un color base: sombras frías, luces cálidas (oklab). */
export { makeBossRamp } from './ramp';

const outlineCache = new Map<string, string>();
/** Un tono más oscuro que el más oscuro de la rampa (para el contorno). */
export function outlineHex(darkest: string): string {
  let o = outlineCache.get(darkest);
  if (!o) {
    const [L, a, b] = hexToLab(darkest);
    // bien oscuro y algo frío, como el contorno del resto del kit: la silueta se tiene que leer sobre cualquier suelo
    o = labToHex([Math.max(0.05, Math.min(0.2, L * 0.5)), a * 0.6, b * 0.6 - 0.015]);
    outlineCache.set(darkest, o);
  }
  return o;
}
