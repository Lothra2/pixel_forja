import { createRaster, type Raster } from '../core/raster';
import { hexToRgb } from '../color/oklab';
import { type V3, type Articulaciones, type Pose, medidas, resolver, add, mul, dot, norm, enBase } from './esqueleto';
import { type Prim, type Grupo, type Material, LEJOS, piezas, sdPrim } from './volumen';
import { type LuchadorFicha, rampa6 } from './ficha';

/** Un cuadro del luchador: la imagen, el pivote (los pies en el piso) y lo que hace falta para las cajas y los efectos. */
export interface CuadroLuchador {
  r: Raster;
  /** el pivote en la imagen: el punto del piso bajo el centro de la cadera en guardia */
  ox: number;
  oy: number;
  art: Articulaciones;
  /** el grupo de cada pixel (o null), para las cajas que reciben */
  grupos: (Grupo | null)[];
}

export interface OpcionesPintar {
  w: number;
  h: number;
  ox: number;
  oy: number;
  /** colores cambiados (el traje alterno, como el segundo jugador de SF2) */
  colores?: Partial<LuchadorFicha['colores']>;
}

/** La luz: de arriba y desde la cámara, un poco desde adelante. */
const LUZ = norm([-0.35, 0.78, 0.52]);

const smin = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};

function colorMat(f: LuchadorFicha, col: LuchadorFicha['colores'], m: Material): string {
  switch (m) {
    case 'piel': case 'pliegue': return col.piel;
    case 'camisa': return col.camisa;
    case 'cuello': return rampa6(col.camisa)[2];
    case 'short': return col.short;
    case 'zapato': return col.zapato;
    case 'suela': return col.suela;
    case 'pelo': return col.pelo;
    case 'canas': return col.canas;
    case 'barba': return col.barba;
    case 'barbaCanas': return col.barbaCanas;
    case 'muñequera': return col.muñequera ?? col.piel;
  }
  void f;
  return col.piel;
}

/** Pinta al luchador en una pose. */
export function pintarLuchador(f: LuchadorFicha, pose: Pose, o: OpcionesPintar): CuadroLuchador {
  const col = { ...f.colores, ...(o.colores ?? {}) };
  const m = medidas(f);
  const art = resolver(m, pose);
  const prims = piezas(f, m, art);
  const { w: W, h: Hh, ox, oy } = o;
  const N = W * Hh;
  const zbuf = new Float32Array(N).fill(-1e9);
  const grp: (Grupo | null)[] = new Array(N).fill(null);
  const mat: (Material | null)[] = new Array(N).fill(null);
  const banda = new Int8Array(N);
  const K = 1.6; // la suavidad de la unión dentro de un grupo

  const evalua = (p: V3, cand: Prim[]) => {
    const dg = new Map<Grupo, number>();
    for (const q of cand) {
      const d = sdPrim(p, q);
      const v = dg.get(q.g);
      dg.set(q.g, v === undefined ? d : smin(v, d, K));
    }
    let best = Infinity, bg: Grupo | null = null;
    for (const [g, d] of dg) if (d < best) { best = d; bg = g; }
    return { d: best, g: bg };
  };
  const evalGrupo = (p: V3, cand: Prim[], g: Grupo) => {
    let v = Infinity;
    for (const q of cand) if (q.g === g) { const d = sdPrim(p, q); v = v === Infinity ? d : smin(v, d, K); }
    return v;
  };

  for (let py = 0; py < Hh; py++)
    for (let px = 0; px < W; px++) {
      const x = px + 0.5 - ox, y = oy - (py + 0.5);
      const cand = prims.filter((q) => x >= q.caja![0] && x <= q.caja![1] && y >= q.caja![2] && y <= q.caja![3]);
      if (!cand.length) continue;
      let z = Math.max(...cand.map((q) => q.zMax!)) + 0.5;
      const zMin = Math.min(...cand.map((q) => q.zMin!)) - 0.5;
      let hit: { g: Grupo; z: number } | null = null;
      for (let it = 0; it < 90 && z > zMin; it++) {
        const e = evalua([x, y, z], cand);
        if (e.d < 0.04) { hit = { g: e.g!, z }; break; }
        z -= Math.max(e.d * 0.9, 0.04);
      }
      if (!hit) continue;
      const i = py * W + px;
      const p: V3 = [x, y, hit.z];
      const gq = cand.filter((q) => q.g === hit!.g);
      // el material: la pieza más cercana del grupo
      let mb: Prim = gq[0], md = Infinity;
      for (const q of gq) { const d = sdPrim(p, q); if (d < md) { md = d; mb = q; } }
      const material = typeof mb.mat === 'function' ? mb.mat(p) : mb.mat;
      // la normal del grupo
      const e = 0.3;
      const n = norm([
        evalGrupo([x + e, y, hit.z], gq, hit.g) - evalGrupo([x - e, y, hit.z], gq, hit.g),
        evalGrupo([x, y + e, hit.z], gq, hit.g) - evalGrupo([x, y - e, hit.z], gq, hit.g),
        evalGrupo([x, y, hit.z + e], gq, hit.g) - evalGrupo([x, y, hit.z - e], gq, hit.g),
      ]);
      // oclusión: cuánto tapan las otras piezas cerca de la superficie
      const d1 = evalua(add(p, mul(n, 1.4)), cand).d, d2 = evalua(add(p, mul(n, 3.0)), cand).d;
      const ao = Math.max(0, Math.min(1, 1 - ((1.4 - d1) * 0.55 + (3.0 - d2) * 0.22)));
      const lam = Math.max(0, dot(n, LUZ));
      const v = (0.08 + 0.92 * lam) * (0.5 + 0.5 * ao);
      let b = v > 0.84 ? 5 : v > 0.62 ? 4 : v > 0.4 ? 3 : v > 0.2 ? 2 : 1;
      if (LEJOS.has(hit.g)) b = Math.max(1, b - 1);
      zbuf[i] = hit.z; grp[i] = hit.g; mat[i] = material; banda[i] = b;
    }

  const out = createRaster(W, Hh);
  const put = (i: number, hex: string) => { const [r, g, b] = hexToRgb(hex); out.data[i * 4] = r; out.data[i * 4 + 1] = g; out.data[i * 4 + 2] = b; out.data[i * 4 + 3] = 255; };
  const ramp = (mm: Material) => rampa6(colorMat(f, col, mm));
  for (let i = 0; i < N; i++) if (mat[i]) put(i, ramp(mat[i]!)[mat[i] === 'pliegue' ? Math.max(1, banda[i] - 2) : banda[i]]);

  // las líneas de adentro: donde una pieza pasa por delante de otra, el pixel de atrás se vuelve contorno
  const linea = new Uint8Array(N);
  for (let py = 0; py < Hh; py++)
    for (let px = 0; px < W; px++) {
      const i = py * W + px;
      if (!mat[i]) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const qx = px + dx, qy = py + dy;
        if (qx < 0 || qy < 0 || qx >= W || qy >= Hh) continue;
        const j = qy * W + qx;
        if (!mat[j]) continue;
        const dz = zbuf[j] - zbuf[i];
        if (grp[j] !== grp[i] && dz > 2.2) { put(i, ramp(mat[j]!)[0]); linea[i] = 1; break; }
        if (grp[j] === grp[i] && mat[j] !== mat[i] && dz > 0.7) { put(i, ramp(mat[j]!)[1]); linea[i] = 1; break; }
      }
    }

  cara(f, col, pose, art, out, { W, ox, oy, grp, linea });

  // el contorno de afuera: un pixel alrededor, del color más oscuro de la pieza de al lado
  const borde: [number, string][] = [];
  for (let py = 0; py < Hh; py++)
    for (let px = 0; px < W; px++) {
      const i = py * W + px;
      if (mat[i]) continue;
      let bz = -1e9, bm: Material | null = null;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const qx = px + dx, qy = py + dy;
        if (qx < 0 || qy < 0 || qx >= W || qy >= Hh) continue;
        const j = qy * W + qx;
        if (mat[j] && zbuf[j] > bz) { bz = zbuf[j]; bm = mat[j]; }
      }
      if (bm) borde.push([i, ramp(bm)[0]]);
    }
  for (const [i, c] of borde) { put(i, c); }
  return { r: out, ox, oy, art, grupos: grp };
}

/** Los rasgos de la cara, a pixel: ojo, ceja, lentes, boca. Solo donde se ve la cabeza. */
function cara(f: LuchadorFicha, col: LuchadorFicha['colores'], pose: Pose, j: Articulaciones, out: Raster,
  c: { W: number; ox: number; oy: number; grp: (Grupo | null)[]; linea: Uint8Array }) {
  const hs = medidas(f).cabeza / 13.9;
  const H = j.cabeza, b = j.baseCabeza;
  const pt = (x: number, y: number, z: number): [number, number] => {
    const p = enBase(H, b, x * hs, y * hs, z * hs);
    return [Math.floor(c.ox + p[0]), Math.floor(c.oy - p[1])];
  };
  const set = (px: number, py: number, hex: string, sobreLinea = false) => {
    if (px < 0 || py < 0 || px >= c.W || py >= out.h) return;
    const i = py * c.W + px;
    if (c.grp[i] !== 'cabeza') return;
    if (c.linea[i] && !sobreLinea) return;
    const [r, g, bb] = hexToRgb(hex);
    out.data[i * 4] = r; out.data[i * 4 + 1] = g; out.data[i * 4 + 2] = bb; out.data[i * 4 + 3] = 255;
  };
  const pr = rampa6(col.pelo), sk = rampa6(col.piel);
  const oscuro = pr[0];
  // el ojo de la cámara y la ceja encima
  const [ex, ey] = pt(4.4, 0.3, 2.2);
  if (pose.cara === 'dolor') {
    set(ex - 1, ey, oscuro); set(ex, ey, oscuro); set(ex + 1, ey + 1, oscuro);
  } else {
    set(ex, ey, '#f4f0ea'); set(ex + 1, ey, col.ojos); set(ex + 1, ey + 1, oscuro);
  }
  set(ex - 1, ey - 2, oscuro); set(ex, ey - 2, oscuro); set(ex + 1, ey - 2, oscuro); set(ex + 2, ey - 1, oscuro);
  // el ojo de lejos, detrás de la nariz
  const [fx, fy] = pt(5.6, 0.4, -1.4);
  set(fx, fy, pose.cara === 'dolor' ? oscuro : col.ojos); set(fx, fy - 2, oscuro);
  // la boca
  const [mx, my] = pt(5.3, -2.9, 0.9);
  if (pose.cara === 'serio') { set(mx - 1, my, sk[0]); set(mx, my, sk[0]); }
  else {
    set(mx - 1, my, '#2a1214'); set(mx, my, '#2a1214'); set(mx - 1, my + 1, '#2a1214'); set(mx, my + 1, '#5a1e22');
    if (pose.cara === 'dolor') set(mx - 1, my - 1, '#f4f0ea');
  }
  // los lentes: el marco claro alrededor del ojo, el puente y la patilla hasta la oreja
  if (col.lentes) {
    const lr = rampa6(col.lentes);
    for (let dx = -1; dx <= 2; dx++) set(ex + dx, ey - 1, lr[2], true);
    set(ex - 2, ey, lr[1], true); set(ex - 2, ey + 1, lr[1], true); set(ex + 3, ey, lr[3], true);
    set(ex - 1, ey + 2, lr[1], true); set(ex, ey + 2, lr[2], true); set(ex + 1, ey + 2, lr[2], true); set(ex + 2, ey + 1, lr[2], true);
    set(ex + 2, ey - 1, lr[5], true);
    const [ox2, oy2] = pt(-0.4, 0.5, 5.2);
    const x0 = ex - 3, n = Math.max(1, Math.abs(x0 - ox2));
    for (let s = 0; s <= n; s++) set(Math.round(x0 + ((ox2 - x0) * s) / n), Math.round(ey + ((oy2 - ey) * s) / n), lr[1], true);
    const [bx, by] = pt(5.7, 0.5, -1.4);
    set(bx, by - 1, lr[2], true); set(bx + 1, by, lr[1], true);
  }
}
