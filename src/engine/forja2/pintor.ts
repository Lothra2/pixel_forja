import { createRaster, type Raster } from '../core/raster';
import { hexToRgb } from '../color/oklab';
import { type V3, type Piece, add, dot, norm, mv, sub, sdShape, shapeBounds, smin, fbm3, noise3 } from '../boss/sdf';
import { outlineHex } from '../boss/render';
import type { Acabado } from './estilo';

/**
 * El pintor de Forja 2. Toma las piezas SDF de un cuerpo (cuerpo.ts) y las pinta a `ss` veces la celda (2 o 4), y
 * después baja a la celda: cada pixel final toma el material que más cubre y el promedio de la luz de sus
 * submuestras, y recién ahí se cuantiza a la rampa. Así los bordes y los cambios de tono salen limpios en vez de
 * ruidosos, y la paleta queda fija (solo los tonos de las rampas y sus contornos).
 *
 * En la celda, a 1 pixel de verdad: oclusión donde una pieza pasa delante de otra, línea de adentro entre grupos,
 * limpieza de pixeles sueltos y contorno de afuera del tono más oscuro de la pieza de al lado (contorno selectivo).
 *
 * El piso (y = 0) corta: lo que quedaría debajo no se pinta.
 *
 * Cámara de lado y sin inclinación (como SF2): x de la pantalla = x del mundo, y hacia arriba, z hacia la cámara.
 */
export interface Material {
  /** tonos de oscuro a claro */
  ramp: string[];
  superficie?: 'piel' | 'tela' | 'cuero' | 'pelo' | 'metal';
  /** cuánto pesa la textura (0 a 1) */
  tex?: number;
  /** escala de la textura (pixeles por celda de ruido) */
  escala?: number;
}

export interface Escena {
  piezas: Piece[];
  materiales: Record<string, Material>;
  suave: Record<number, number>;
}

export interface OpcionesPintor {
  /** celda de referencia del estilo (decide grosores de línea y textura) */
  cell: number;
  /** lienzo de salida [ancho, alto] (si no, la celda cuadrada) */
  lienzo?: [number, number];
  /** submuestras por lado */
  ss: number;
  pivot: [number, number];
  acabado: Acabado;
  /** luz (hacia la fuente) */
  luz?: V3;
}

export interface Pintado {
  raster: Raster;
  /** por pixel de la celda: material (índice en `mats`, -1 vacío), grupo (-1 vacío) y profundidad (z, hacia la cámara) */
  mat: Int16Array;
  grp: Int16Array;
  z: Float32Array;
  mats: string[];
  /** pixeles que se salieron de la celda */
  overflow: number;
}

const LUZ: V3 = norm([-0.25, 0.8, 0.55]);

/** Tonos de cada acabado. */
export const TONOS: Record<Acabado, number> = { retro3: 3, sf2: 6, suave: 7 };
/**
 * Dónde corta cada tono (luz de 0 a 1): el corte entre luz y sombra va al medio, así el volumen se lee (sombra propia
 * marcada), y los tonos de los extremos son angostos (el brillo y la sombra honda son toques, no manchas).
 */
const CORTES: Record<Acabado, number[]> = {
  retro3: [0.4, 0.78],
  sf2: [0.26, 0.42, 0.6, 0.82, 0.95],
  suave: [0.22, 0.34, 0.46, 0.6, 0.78, 0.93],
};

interface Cand { p: Piece; lo: V3; hi: V3 }

export function pintar(esc: Escena, op: OpcionesPintor): Pintado {
  const { cell, ss } = op;
  const [LW, LH] = op.lienzo ?? [cell, cell];
  const L = op.luz ? norm(op.luz) : LUZ;
  const HALF = norm(add(L, [0, 0, 1]));
  // margen para medir lo que se sale
  const M = Math.round(cell / 4);
  const W = LW + 2 * M, H = LH + 2 * M;
  const SW = W * ss, SH = H * ss;
  const ox = M + op.pivot[0], oy = M + op.pivot[1];
  const mats = Object.keys(esc.materiales);
  const matIdx = new Map(mats.map((m, i) => [m, i]));

  const cands: Cand[] = esc.piezas.map((p) => {
    const pad = (p.bump ?? 0) + (esc.suave[p.g] ?? 0) * 0.5 + 0.3;
    const b = shapeBounds(p.shape, pad);
    return { p, lo: b.lo, hi: b.hi };
  });
  const escena = (q: V3, cs: number[]): { d: number; best: number } => {
    let best = -1, bestD = Infinity;
    const byG = new Map<number, number>();
    for (const i of cs) {
      const c = cands[i].p, d = sdShape(q, c.shape);
      if (d < bestD) { bestD = d; best = i; }
      const prev = byG.get(c.g);
      byG.set(c.g, prev === undefined ? d : smin(prev, d, esc.suave[c.g] ?? 0));
    }
    let D = Infinity;
    for (const v of byG.values()) D = Math.min(D, v);
    return { d: D, best };
  };
  // punto en el marco de la pieza (la textura viaja pegada a ella)
  const local = (p: Piece, q: V3): V3 => (p.frame ? mv(p.frame, sub(q, p.o ?? [0, 0, 0])) : sub(q, p.o ?? [0, 0, 0]));

  // paso de la oclusión: unos 2 pixeles en un luchador de 160
  const aoPaso = Math.max(0.8, cell * 0.013);
  // ---------- submuestras ----------
  const sMat = new Int16Array(SW * SH).fill(-1);
  const sGrp = new Int16Array(SW * SH).fill(-1);
  const sV = new Float32Array(SW * SH);
  const sZ = new Float32Array(SW * SH);
  for (let sy = 0; sy < SH; sy++) {
    const y = oy - (sy + 0.5) / ss;
    // el piso corta: nada del cuerpo se pinta debajo (la planta del pie queda plana sobre el pivote)
    if (y < 0) continue;
    const fila = cands.map((c, i) => (y >= c.lo[1] && y <= c.hi[1] ? i : -1)).filter((i) => i >= 0);
    if (!fila.length) continue;
    for (let sx = 0; sx < SW; sx++) {
      const x = (sx + 0.5) / ss - ox;
      const cs = fila.filter((i) => x >= cands[i].lo[0] && x <= cands[i].hi[0]);
      if (!cs.length) continue;
      let zTop = -Infinity, zBot = Infinity;
      for (const i of cs) { zTop = Math.max(zTop, cands[i].hi[2]); zBot = Math.min(zBot, cands[i].lo[2]); }
      let z = zTop, hit = -1;
      for (let k = 0; k < 120 && z > zBot; k++) {
        const s = escena([x, y, z], cs);
        if (s.d < 0.03) { hit = s.best; break; }
        z -= Math.max(0.03, s.d * 0.9);
      }
      if (hit < 0) continue;
      const e = 0.25, dd = (q: V3) => escena(q, cs).d;
      const n = norm([dd([x + e, y, z]) - dd([x - e, y, z]), dd([x, y + e, z]) - dd([x, y - e, z]), dd([x, y, z + e]) - dd([x, y, z - e])]);
      const p = cands[hit].p, m = esc.materiales[p.mat];
      const i = sy * SW + sx;
      sMat[i] = matIdx.get(p.mat) ?? -1;
      sGrp[i] = p.g;
      sZ[i] = z;
      // oclusión de verdad (3D): si a un paso de la superficie, hacia afuera, ya hay otra forma cerca, es un pliegue
      // (axila, entrepierna, debajo de la barbilla) y le llega menos luz
      let occ = 0;
      for (const a of [aoPaso, aoPaso * 2.5]) { const d = escena([x + n[0] * a, y + n[1] * a, z + n[2] * a], cs).d; occ += Math.max(0, (a - d) / a); }
      sV[i] = Math.max(0, luz(m, n, local(p, [x, y, z]), L, HALF) - occ * 0.22);
    }
  }

  // ---------- a la celda: el material que más cubre y la luz promedio ----------
  const N = W * H;
  const mat = new Int16Array(N).fill(-1), grp = new Int16Array(N).fill(-1);
  const tone = new Int16Array(N), dep = new Float32Array(N).fill(-Infinity);
  const umbral = Math.ceil(ss * ss * 0.4);
  for (let py = 0; py < H; py++)
    for (let px = 0; px < W; px++) {
      const cuenta = new Map<number, { n: number; v: number; z: number; g: number; m: number }>();
      let cubre = 0;
      for (let dy = 0; dy < ss; dy++)
        for (let dx = 0; dx < ss; dx++) {
          const i = (py * ss + dy) * SW + px * ss + dx;
          if (sMat[i] < 0) continue;
          cubre++;
          const key = sMat[i] * 64 + sGrp[i];
          const c = cuenta.get(key) ?? { n: 0, v: 0, z: -Infinity, g: sGrp[i], m: sMat[i] };
          c.n++; c.v += sV[i]; c.z = Math.max(c.z, sZ[i]);
          cuenta.set(key, c);
        }
      if (cubre < umbral) continue;
      let best: { n: number; v: number; z: number; g: number; m: number } | null = null;
      for (const c of cuenta.values()) if (!best || c.n > best.n || (c.n === best.n && c.z > best.z)) best = c;
      const j = py * W + px, def = esc.materiales[mats[best!.m]];
      mat[j] = best!.m; grp[j] = best!.g; dep[j] = best!.z;
      tone[j] = cuantizar(best!.v / best!.n, def.ramp.length, op.acabado);
    }

  // ---------- en la celda ----------
  const prof = Math.max(1.5, cell * 0.018);
  // oclusión: al lado del borde de una pieza que pasa por delante, la de atrás se oscurece un tono
  const ao = new Int8Array(N);
  for (let py = 1; py < H - 1; py++)
    for (let px = 1; px < W - 1; px++) {
      const i = py * W + px;
      if (mat[i] < 0) continue;
      let occ = 0;
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) {
          const X = px + dx, Y = py + dy;
          if ((!dx && !dy) || X < 0 || Y < 0 || X >= W || Y >= H) continue;
          const j = Y * W + X;
          if (mat[j] >= 0 && grp[j] !== grp[i] && dep[j] - dep[i] > prof) occ += Math.abs(dx) + Math.abs(dy) <= 2 ? 2 : 1;
        }
      ao[i] = occ >= 4 ? 1 : 0;
    }
  for (let i = 0; i < N; i++) if (ao[i]) tone[i] = Math.max(0, tone[i] - 1);
  // línea de adentro: la pieza de atrás lleva su contorno donde otra de otro grupo pasa por delante
  const linea: number[] = [];
  for (let py = 1; py < H - 1; py++)
    for (let px = 1; px < W - 1; px++) {
      const i = py * W + px;
      if (mat[i] < 0 || mat[i - 1] < 0 || mat[i + 1] < 0 || mat[i - W] < 0 || mat[i + W] < 0) continue;
      for (const j of [i - 1, i + 1, i - W, i + W]) if (grp[j] !== grp[i] && dep[j] - dep[i] > prof * 1.6) { linea.push(i); break; }
    }
  for (const i of linea) tone[i] = -1;
  // limpieza: un tono solo, sin nadie igual al lado, se pasa al de la mayoría
  for (let pass = 0; pass < 2; pass++)
    for (let py = 1; py < H - 1; py++)
      for (let px = 1; px < W - 1; px++) {
        const i = py * W + px;
        if (mat[i] < 0 || tone[i] < 0) continue;
        const nb = [i - 1, i + 1, i - W, i + W];
        if (nb.some((j) => mat[j] === mat[i] && tone[j] === tone[i])) continue;
        const same = nb.filter((j) => mat[j] === mat[i] && tone[j] >= 0);
        if (same.length < 3) continue;
        const cnt = new Map<number, number>();
        for (const j of same) cnt.set(tone[j], (cnt.get(tone[j]) ?? 0) + 1);
        const [t, c] = [...cnt.entries()].sort((a, b) => b[1] - a[1])[0];
        if (c >= 2) tone[i] = t;
      }

  // ---------- a color, con el contorno de afuera ----------
  const big = createRaster(W, H);
  const put = (i: number, hex: string) => { const [r, g, b] = hexToRgb(hex); big.data.set([r, g, b, 255], i * 4); };
  const contorno = (m: number) => outlineHex(esc.materiales[mats[m]].ramp[0]);
  for (let i = 0; i < N; i++) {
    if (mat[i] < 0) continue;
    const ramp = esc.materiales[mats[mat[i]]].ramp;
    put(i, tone[i] < 0 ? contorno(mat[i]) : ramp[Math.min(ramp.length - 1, tone[i])]);
  }
  const borde: [number, string][] = [];
  for (let py = 0; py < H; py++)
    for (let px = 0; px < W; px++) {
      const i = py * W + px;
      if (mat[i] >= 0) continue;
      let best = -1, bz = -Infinity;
      for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
        const X = px + dx, Y = py + dy;
        if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const j = Y * W + X;
        if (mat[j] >= 0 && dep[j] > bz) { bz = dep[j]; best = j; }
      }
      if (best >= 0) borde.push([i, contorno(mat[best])]);
    }
  for (const [i, hex] of borde) put(i, hex);

  // ---------- recorte a la celda ----------
  const out = createRaster(LW, LH);
  const cMat = new Int16Array(LW * LH).fill(-1), cGrp = new Int16Array(LW * LH).fill(-1), cZ = new Float32Array(LW * LH).fill(-Infinity);
  let overflow = 0;
  for (let py = 0; py < H; py++)
    for (let px = 0; px < W; px++) {
      const s = py * W + px;
      if (!big.data[s * 4 + 3]) continue;
      const X = px - M, Y = py - M;
      if (X < 0 || Y < 0 || X >= LW || Y >= LH) { overflow++; continue; }
      const t = Y * LW + X;
      out.data.set(big.data.subarray(s * 4, s * 4 + 4), t * 4);
      cMat[t] = mat[s]; cGrp[t] = grp[s]; cZ[t] = dep[s];
    }
  return { raster: out, mat: cMat, grp: cGrp, z: cZ, mats, overflow };
}

/** Luz de un punto (0 a 1) según la normal, el material y su textura. */
function luz(m: Material | undefined, n: V3, l: V3, L: V3, HALF: V3): number {
  const diff = dot(n, L);
  // lambert con poca envoltura: la sombra propia se marca (el volumen se lee), sin irse a negro
  let v = 0.18 + 0.82 * Math.max(0, Math.min(1, (diff + 0.15) / 1.15));
  // rebote frío desde el piso
  if (n[1] < -0.5) v += 0.04;
  const k = m?.tex ?? 0.5, s = m?.escala ?? 3;
  switch (m?.superficie) {
    case 'tela': {
      // pliegues: franjas largas a lo largo del hueso (el eje x de la pieza), no manchas
      const f = fbm3(l[0] / (s * 3.2), l[1] / s, l[2] / s, 2);
      v += (f - 0.5) * 0.42 * k;
      break;
    }
    case 'cuero': {
      v += (noise3(l[0] / s, l[1] / s, l[2] / s) - 0.5) * 0.1 * k;
      if (dot(n, HALF) > 0.95) v = Math.max(v, 0.97);
      break;
    }
    case 'pelo': v += (fbm3(l[0] / (s * 2.5), l[1] / s, l[2] / s, 2) - 0.5) * 0.4 * k; break;
    case 'metal': v = 0.3 + 0.62 * diff + (dot(n, HALF) > 0.965 ? 0.4 : 0); break;
    default: v += (noise3(l[0] / s, l[1] / s, l[2] / s) - 0.5) * 0.06 * k;
  }
  return Math.max(0, Math.min(1, v));
}

/** De la luz (0 a 1) al tono de la rampa. El acabado decide cuántos tonos y qué tan duro es el corte. */
export function cuantizar(v: number, n: number, acabado: Acabado): number {
  const t = TONOS[acabado];
  const k = CORTES[acabado].filter((c) => v >= c).length;
  // el acabado puede usar menos tonos que la rampa: se toman repartidos de punta a punta
  return Math.round((k * (n - 1)) / Math.max(1, t - 1));
}
