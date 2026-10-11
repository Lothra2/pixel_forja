/**
 * Geometría de los jefes grandes: formas con distancia con signo (SDF). Cada pieza sabe a qué distancia está de un
 * punto, y la escena es la unión de todas. Dentro de un grupo (la carne de un brazo con el hombro) la unión es suave,
 * así los músculos se funden como en un cuerpo de verdad. Entre grupos (el arma, una correa) es dura.
 *
 * Unidades: pixeles de la celda final. Ejes del personaje: x adelante, y arriba, z hacia su lado cercano a la cámara
 * cuando mira a la derecha.
 */

export type V3 = [number, number, number];

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Matriz 3x3 por filas. */
export type M3 = [V3, V3, V3];
export const mv = (m: M3, v: V3): V3 => [dot(m[0], v), dot(m[1], v), dot(m[2], v)];
export const mt = (m: M3): M3 => [[m[0][0], m[1][0], m[2][0]], [m[0][1], m[1][1], m[2][1]], [m[0][2], m[1][2], m[2][2]]];
export const mm = (a: M3, b: M3): M3 => { const bt = mt(b); return [[dot(a[0], bt[0]), dot(a[0], bt[1]), dot(a[0], bt[2])], [dot(a[1], bt[0]), dot(a[1], bt[1]), dot(a[1], bt[2])], [dot(a[2], bt[0]), dot(a[2], bt[1]), dot(a[2], bt[2])]]; };
export const I3: M3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const R = Math.PI / 180;
/** Giro alrededor de x, y o z (grados, regla de la mano derecha). */
export const rotX = (d: number): M3 => { const c = Math.cos(d * R), s = Math.sin(d * R); return [[1, 0, 0], [0, c, -s], [0, s, c]]; };
export const rotY = (d: number): M3 => { const c = Math.cos(d * R), s = Math.sin(d * R); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; };
export const rotZ = (d: number): M3 => { const c = Math.cos(d * R), s = Math.sin(d * R); return [[c, -s, 0], [s, c, 0], [0, 0, 1]]; };
/** Giro alrededor de un eje cualquiera. */
export function rotAxis(axis: V3, d: number): M3 {
  const [x, y, z] = norm(axis), c = Math.cos(d * R), s = Math.sin(d * R), t = 1 - c;
  return [[t * x * x + c, t * x * y - s * z, t * x * z + s * y], [t * x * y + s * z, t * y * y + c, t * y * z - s * x], [t * x * z - s * y, t * y * z + s * x, t * z * z + c]];
}

/** Ruido de valor 3D suave y determinista (sin azar: el mismo punto da siempre lo mismo). */
function hash3(x: number, y: number, z: number): number {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}
export function noise3(x: number, y: number, z: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz);
  return l(l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v), l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w);
}
export function fbm3(x: number, y: number, z: number, oct = 3): number {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * noise3(x * f, y * f, z * f); n += a; a *= 0.5; f *= 2.03; }
  return s / n;
}
/** Celdas de Voronoi: distancia al borde más cercano entre celdas (grietas de piedra). */
export function voronoiEdge(x: number, y: number, z: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let d1 = 9, d2 = 9;
  for (let k = -1; k <= 1; k++) for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = xi + i + hash3(xi + i, yi + j, zi + k), cy = yi + j + hash3(yi + j, zi + k, xi + i), cz = zi + k + hash3(zi + k, xi + i, yi + j);
    const d = Math.hypot(x - cx, y - cy, z - cz);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return d2 - d1;
}

// ---------- piezas ----------

export type Shape =
  | { kind: 'ell'; c: V3; r: V3; m?: M3 }
  | { kind: 'cone'; a: V3; b: V3; ra: number; rb: number }
  | { kind: 'box'; c: V3; h: V3; m?: M3; round?: number }
  | { kind: 'torus'; c: V3; R: number; r: number; m?: M3 }
  /**
   * Banda pegada a otra forma: la forma de base inflada, cortada por una lámina (plano con normal n a distancia d,
   * de ancho 2w). Así una correa o un cinturón abrazan el pecho o la cintura en vez de atravesarlos.
   */
  | { kind: 'band'; base: Shape; inflate: number; n: V3; d: number; w: number; within?: { n: V3; d: number } };

/**
 * Una pieza: su forma, su material y su grupo. `frame` es el marco local de la pieza (origen y ejes) para que la
 * textura viaje pegada a ella cuando el cuerpo se mueve, y no se resbale por encima.
 */
export interface Piece {
  shape: Shape;
  mat: string;
  /** grupo: dentro de un grupo la unión es suave */
  g: number;
  /** relieve (pelo en mechones, piedra rugosa): pixeles que la superficie sube y baja con ruido */
  bump?: number;
  /** marco de la textura: origen y matriz (filas = ejes locales) */
  o?: V3;
  frame?: M3;
  /** eje local por donde corre la veta (el pelo cae a lo largo de él): 0 x, 1 y, 2 z */
  grain?: 0 | 1 | 2;
  tag?: string;
}

function sdEll(p: V3, s: { c: V3; r: V3; m?: M3 }): number {
  let q = sub(p, s.c);
  if (s.m) q = mv(s.m, q);
  const r = s.r;
  const k0 = Math.hypot(q[0] / r[0], q[1] / r[1], q[2] / r[2]);
  const k1 = Math.hypot(q[0] / (r[0] * r[0]), q[1] / (r[1] * r[1]), q[2] / (r[2] * r[2]));
  return k1 === 0 ? -Math.min(r[0], r[1], r[2]) : (k0 * (k0 - 1)) / k1;
}

function sdCone(p: V3, a: V3, b: V3, r1: number, r2: number): number {
  const ba = sub(b, a);
  const l2 = dot(ba, ba);
  if (l2 < 1e-6) return len(sub(p, a)) - Math.max(r1, r2);
  const rr = r1 - r2;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  const pa = sub(p, a);
  const y = dot(pa, ba);
  const z = y - l2;
  const xv = sub(mul(pa, l2), mul(ba, y));
  const x2 = dot(xv, xv);
  const y2 = y * y * l2;
  const z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}

function sdBox(p: V3, s: { c: V3; h: V3; m?: M3; round?: number }): number {
  let q = sub(p, s.c);
  if (s.m) q = mv(s.m, q);
  const r = s.round ?? 0;
  const dx = Math.abs(q[0]) - s.h[0] + r, dy = Math.abs(q[1]) - s.h[1] + r, dz = Math.abs(q[2]) - s.h[2] + r;
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0), Math.max(dz, 0)) + Math.min(Math.max(dx, dy, dz), 0) - r;
}

function sdTorus(p: V3, s: { c: V3; R: number; r: number; m?: M3 }): number {
  let q = sub(p, s.c);
  if (s.m) q = mv(s.m, q);
  // anillo en el plano local x-y (el eje es z)
  const a = Math.hypot(q[0], q[1]) - s.R;
  return Math.hypot(a, q[2]) - s.r;
}

export function sdShape(p: V3, s: Shape): number {
  switch (s.kind) {
    case 'ell': return sdEll(p, s);
    case 'cone': return sdCone(p, s.a, s.b, s.ra, s.rb);
    case 'box': return sdBox(p, s);
    case 'torus': return sdTorus(p, s);
    case 'band': {
      let d = Math.max(sdShape(p, s.base) - s.inflate, Math.abs(dot(p, s.n) - s.d) - s.w);
      // solo de un lado de otro plano (una correa que va por delante y no da toda la vuelta)
      if (s.within) d = Math.max(d, dot(p, s.within.n) - s.within.d);
      return d;
    }
  }
}

/** Caja que contiene la pieza (en el mismo marco que sus puntos). */
export function shapeBounds(s: Shape, pad = 0): { lo: V3; hi: V3 } {
  const sphere = (c: V3, r: number) => ({ lo: [c[0] - r - pad, c[1] - r - pad, c[2] - r - pad] as V3, hi: [c[0] + r + pad, c[1] + r + pad, c[2] + r + pad] as V3 });
  switch (s.kind) {
    case 'ell': return sphere(s.c, Math.max(...s.r));
    case 'box': return sphere(s.c, Math.hypot(...s.h));
    case 'torus': return sphere(s.c, s.R + s.r);
    case 'cone': {
      const a = sphere(s.a, s.ra), b = sphere(s.b, s.rb);
      return { lo: [Math.min(a.lo[0], b.lo[0]), Math.min(a.lo[1], b.lo[1]), Math.min(a.lo[2], b.lo[2])], hi: [Math.max(a.hi[0], b.hi[0]), Math.max(a.hi[1], b.hi[1]), Math.max(a.hi[2], b.hi[2])] };
    }
    case 'band': return shapeBounds(s.base, pad + s.inflate);
  }
}

/** Mueve y gira una pieza con una matriz (filas) y un corrimiento: p' = M p + t. */
export function transformShape(s: Shape, M: M3, t: V3): Shape {
  const P = (v: V3): V3 => add(mv(M, v), t);
  // las formas guardan la matriz que lleva del mundo al marco local: la nueva es la vieja por la inversa (transpuesta) de M
  const Mi = mt(M);
  switch (s.kind) {
    case 'ell': return { ...s, c: P(s.c), m: s.m ? mm(s.m, Mi) : Mi };
    case 'box': return { ...s, c: P(s.c), m: s.m ? mm(s.m, Mi) : Mi };
    case 'torus': return { ...s, c: P(s.c), m: s.m ? mm(s.m, Mi) : Mi };
    case 'cone': return { ...s, a: P(s.a), b: P(s.b) };
    case 'band': {
      // los planos giran con M: n' = M n, d' = d + n'·t
      const n = mv(M, s.n);
      const w = s.within ? { n: mv(M, s.within.n), d: s.within.d + dot(mv(M, s.within.n), t) } : undefined;
      return { ...s, base: transformShape(s.base, M, t), n, d: s.d + dot(n, t), within: w };
    }
  }
}

/** Punto de la superficie de un elipsoide (girado por m) en una dirección local desde su centro. */
export function ellSurface(c: V3, r: V3, m: M3 | undefined, dirLocal: V3, out = 0): V3 {
  const d = norm(dirLocal);
  const t = 1 / Math.hypot(d[0] / r[0], d[1] / r[1], d[2] / r[2]);
  const p = mul(d, t + out);
  return add(c, m ? mv(mt(m), p) : p);
}

/** Mínimo suave (unión que funde las formas): k en pixeles. */
export function smin(a: number, b: number, k: number): number {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
