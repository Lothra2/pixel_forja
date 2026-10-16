import { createRaster, type Raster } from '../core/raster';
import { hexToRgb } from '../color/oklab';
import { type V3, type Articulaciones, type Pose, medidas, resolver, add, mul, dot, norm, enBase } from './esqueleto';
import { type Prim, type Grupo, type Material, type MatRes, LEJOS, piezas, sdPrim } from './volumen';
import { type LuchadorFicha, type Ropa, rampa6, TRAJES } from './ficha';

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
  /** otro traje (o el mismo con otros colores) */
  ropa?: Ropa;
}

/** La luz: de arriba y desde la cámara, un poco desde adelante. */
const LUZ = norm([-0.35, 0.78, 0.52]);
/** El medio entre la luz y la cámara, para el brillo. */
const MEDIO = norm([LUZ[0], LUZ[1], LUZ[2] + 1]);

/** La suavidad de la unión dentro de cada grupo: el torso más duro, para que se marquen pectorales y abdominales. */
const SUAVE: Partial<Record<Grupo, number>> = { torso: 0.9, cinto: 0.6, cintillo: 0.6, cola: 1.0 };
/** Los accesorios se separan con línea aunque estén casi pegados a lo de atrás. */
const ACCESORIO: ReadonlySet<Grupo> = new Set(['cinto', 'cintillo', 'cola']);

const smin = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};

/** El traje que se pinta: el de las opciones, el de la ficha, o el casual armado con los colores viejos de la ficha. */
export function ropaDe(f: LuchadorFicha, col: LuchadorFicha['colores'], o?: Ropa): Ropa {
  if (o) return o;
  if (f.ropa) return f.ropa;
  return { ...TRAJES.casual, colores: { ...TRAJES.casual.colores, torso: col.camisa, piernas: col.short, pies: col.zapato, suela: col.suela, guantes: null } };
}

function colorMat(col: LuchadorFicha['colores'], ropa: Ropa, m: Material): string {
  const r = ropa.colores;
  switch (m) {
    case 'piel': case 'pliegue': return col.piel;
    case 'tela': return r.torso;
    case 'ribete': return r.ribete ?? rampa6(r.torso)[2];
    case 'cuello': return rampa6(r.torso)[2];
    case 'tela2': return r.piernas;
    case 'bolsillo': return rampa6(r.piernas)[2];
    case 'calzado': return ropa.pies === 'descalzo' ? col.piel : r.pies;
    case 'suela': return r.suela ?? '#3a3a40';
    case 'cinturon': return r.cinturon ?? '#1e1a22';
    case 'cintillo': return r.cintillo ?? '#f2efe8';
    case 'guante': return r.guantes ?? col.muñequera ?? col.piel;
    case 'venda': return r.vendas ?? '#efe9dc';
    case 'lazo': return col.lazo ?? '#ff5c9a';
    case 'pelo': return col.pelo;
    case 'canas': return col.canas;
    case 'barba': return col.barba;
    case 'barbaCanas': return col.barbaCanas;
  }
  return col.piel;
}

/** Pinta al luchador en una pose. */
export function pintarLuchador(f: LuchadorFicha, pose: Pose, o: OpcionesPintar): CuadroLuchador {
  const col = { ...f.colores, ...(o.colores ?? {}) };
  const ropa = ropaDe(f, col, o.ropa);
  const m = medidas(f);
  const art = resolver(m, pose);
  const prims = piezas(f, m, art, pose.viento ?? 0, ropa);
  const { w: W, h: Hh, ox, oy } = o;
  const N = W * Hh;
  const zbuf = new Float32Array(N).fill(-1e9);
  const grp: (Grupo | null)[] = new Array(N).fill(null);
  const mat: (Material | null)[] = new Array(N).fill(null);
  const banda = new Int8Array(N);
  const K = 1.6; // la suavidad de la unión dentro de un grupo (si el grupo no dice otra)

  const evalua = (p: V3, cand: Prim[]) => {
    const dg = new Map<Grupo, number>();
    for (const q of cand) {
      const d = sdPrim(p, q);
      const v = dg.get(q.g);
      dg.set(q.g, v === undefined ? d : smin(v, d, SUAVE[q.g] ?? K));
    }
    let best = Infinity, bg: Grupo | null = null;
    for (const [g, d] of dg) if (d < best) { best = d; bg = g; }
    return { d: best, g: bg };
  };
  const evalGrupo = (p: V3, cand: Prim[], g: Grupo) => {
    let v = Infinity;
    for (const q of cand) if (q.g === g) { const d = sdPrim(p, q); v = v === Infinity ? d : smin(v, d, SUAVE[g] ?? K); }
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
      const res: MatRes = typeof mb.mat === 'function' ? mb.mat(p) : mb.mat;
      const material = Array.isArray(res) ? res[0] : res, corre = Array.isArray(res) ? res[1] : 0;
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
      let v = (0.08 + 0.92 * lam) * (0.5 + 0.5 * ao);
      // el brillo de la piel, el de los músculos de SF2
      if (material === 'piel') v += 0.4 * Math.pow(Math.max(0, dot(n, MEDIO)), 14) * ao;
      // el brillo del pelo de anime: una franja clara arriba
      if (material === 'pelo') v += 0.55 * Math.pow(Math.max(0, dot(n, MEDIO)), 22);
      let b = v > 0.84 ? 5 : v > 0.62 ? 4 : v > 0.4 ? 3 : v > 0.2 ? 2 : 1;
      // la tela con 4 tonos, como en SF2: el brillo queda para la piel, el pelo y los accesorios
      if (b === 5 && (material === 'tela' || material === 'tela2' || material === 'calzado' || material === 'ribete')) b = 4;
      // los pliegues de la tela no van en la parte más oscura
      if (corre && b >= 2) b = Math.max(1, Math.min(5, b + corre));
      if (LEJOS.has(hit.g)) b = Math.max(1, b - 1);
      zbuf[i] = hit.z; grp[i] = hit.g; mat[i] = material; banda[i] = b;
    }

  // limpieza: un pixel suelto de otro tono en medio de su material pasa al tono de sus vecinos (menos ruido de render)
  for (let py = 1; py < Hh - 1; py++)
    for (let px = 1; px < W - 1; px++) {
      const i = py * W + px;
      if (!mat[i]) continue;
      const vec = [i - 1, i + 1, i - W, i + W];
      if (vec.some((q) => mat[q] !== mat[i] || grp[q] !== grp[i])) continue;
      const b0 = banda[vec[0]];
      if (banda[i] !== b0 && vec.every((q) => banda[q] === b0)) banda[i] = b0;
    }

  const out = createRaster(W, Hh);
  const put = (i: number, hex: string) => { const [r, g, b] = hexToRgb(hex); out.data[i * 4] = r; out.data[i * 4 + 1] = g; out.data[i * 4 + 2] = b; out.data[i * 4 + 3] = 255; };
  const ramp = (mm: Material) => rampa6(colorMat(col, ropa, mm));
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
        if (grp[j] !== grp[i] && (dz > 2.2 || (ACCESORIO.has(grp[j]!) && dz > 0.3))) { put(i, ramp(mat[j]!)[0]); linea[i] = 1; break; }
        if (grp[j] === grp[i] && mat[j] !== mat[i] && dz > 0.7) { put(i, ramp(mat[j]!)[1]); linea[i] = 1; break; }
      }
    }

  cara(f, col, pose, art, out, { W, ox, oy, grp, linea, zbuf });

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

/** Los rasgos de la cara, a pixel: ojo, ceja, lentes, boca. Solo donde se ve la cabeza de frente (no si está de espaldas). */
function cara(f: LuchadorFicha, col: LuchadorFicha['colores'], pose: Pose, j: Articulaciones, out: Raster,
  c: { W: number; ox: number; oy: number; grp: (Grupo | null)[]; linea: Uint8Array; zbuf: Float32Array }) {
  const hs = medidas(f).cabeza / 13.9;
  const H = j.cabeza, b = j.baseCabeza;
  let zRasgo = 0;
  const pt = (x: number, y: number, z: number): [number, number] => {
    const p = enBase(H, b, x * hs, y * hs, z * hs);
    zRasgo = p[2];
    return [Math.floor(c.ox + p[0]), Math.floor(c.oy - p[1])];
  };
  // la cara se ve solo si la cabeza mira hacia la cámara
  if (b.f[2] < -0.55) return;
  const set = (px: number, py: number, hex: string, sobreLinea = false) => {
    if (px < 0 || py < 0 || px >= c.W || py >= out.h) return;
    const i = py * c.W + px;
    if (c.grp[i] !== 'cabeza') return;
    if (c.linea[i] && !sobreLinea) return;
    if (c.zbuf[i] - zRasgo > 3) return;
    const [r, g, bb] = hexToRgb(hex);
    out.data[i * 4] = r; out.data[i * 4 + 1] = g; out.data[i * 4 + 2] = bb; out.data[i * 4 + 3] = 255;
  };
  const pr = rampa6(col.pelo), sk = rampa6(col.piel);
  const oscuro = pr[0];
  if (f.cabeza.forma === 'niña') {
    // ojos grandes de anime: pestañas arriba, el blanco atrás, el iris adelante con su brillo
    const [ex, ey] = pt(4.7, -0.6, 2.5);
    const iris = col.ojos, irisO = rampa6(col.ojos)[1];
    if (pose.cara === 'dolor' || pose.cara === 'feliz') {
      // cerrados: > < o ^ ^
      set(ex - 1, ey, oscuro); set(ex, ey + (pose.cara === 'feliz' ? -1 : 1), oscuro); set(ex + 1, ey, oscuro);
    } else {
      for (let dx = -2; dx <= 1; dx++) set(ex + dx, ey - 1, oscuro);
      set(ex - 1, ey, '#ffffff'); set(ex, ey, iris); set(ex + 1, ey, oscuro);
      set(ex - 1, ey + 1, '#e8e4ee'); set(ex, ey + 1, '#ffffff'); set(ex + 1, ey + 1, irisO);
      if (pose.cara === 'grito') set(ex - 2, ey - 2, oscuro);
    }
    const [fx, fy] = pt(5.6, -0.6, -1.5);
    set(fx, fy - 1, oscuro); set(fx, fy, pose.cara === 'dolor' || pose.cara === 'feliz' ? oscuro : iris);
    // los cachetes rosados
    const [cx, cy] = pt(3.6, -2.0, 3.6);
    set(cx, cy, '#f39c9c'); set(cx + 1, cy, '#f39c9c');
    const [mx, my] = pt(5.6, -2.7, 0.8);
    if (pose.cara === 'serio') set(mx, my, sk[1]);
    else if (pose.cara === 'feliz') { set(mx - 1, my, '#9a3040'); set(mx, my + 1, '#9a3040'); set(mx + 1, my, '#9a3040'); }
    else { set(mx, my, '#5a1422'); set(mx - 1, my, '#5a1422'); set(mx, my + 1, '#d0485a'); set(mx - 1, my + 1, '#5a1422'); }
    return;
  }
  // el ojo de la cámara y la ceja encima
  const [ex, ey] = pt(4.4, 0.3, 2.2);
  if (pose.cara === 'dolor' || pose.cara === 'feliz') {
    set(ex - 1, ey, oscuro); set(ex, ey, oscuro); set(ex + 1, ey + (pose.cara === 'dolor' ? 1 : -1), oscuro);
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
  else if (pose.cara === 'feliz') { set(mx - 1, my, '#2a1214'); set(mx, my, '#f4f0ea'); set(mx + 1, my - 1, '#2a1214'); }
  else {
    set(mx - 1, my, '#2a1214'); set(mx, my, '#2a1214'); set(mx - 1, my + 1, '#2a1214'); set(mx, my + 1, '#5a1e22');
    if (pose.cara === 'dolor') set(mx - 1, my - 1, '#f4f0ea');
  }
  // los lentes: el marco claro alrededor del ojo, el puente y la patilla hasta la oreja
  if (col.lentes) {
    const lr = rampa6(col.lentes);
    // el marco fino: arriba claro, los lados y abajo más oscuros, y un brillo en la esquina
    for (let dx = -1; dx <= 1; dx++) set(ex + dx, ey - 1, lr[2], true);
    set(ex - 2, ey, lr[1], true); set(ex + 2, ey, lr[1], true);
    set(ex - 1, ey + 1, lr[1], true); set(ex + 1, ey + 1, lr[1], true);
    set(ex + 1, ey - 1, lr[5], true);
    const [ox2, oy2] = pt(-0.4, 0.5, 5.2);
    const x0 = ex - 3, n = Math.max(1, Math.abs(x0 - ox2));
    for (let s = 0; s <= n; s++) set(Math.round(x0 + ((ox2 - x0) * s) / n), Math.round(ey + ((oy2 - ey) * s) / n), lr[1], true);
    const [bx, by] = pt(5.7, 0.5, -1.4);
    set(bx, by - 1, lr[2], true); set(bx + 1, by, lr[1], true);
  }
}
