import { createRaster, type Raster } from '../core/raster';
import { MATERIALES, type Material } from './materiales';

/**
 * El renderizador del taller gótico: arma cada asset con piezas 3D (cajas y poliedros, cilindros y conos,
 * elipsoides), lo mira con la cámara isométrica de los juegos de rol oscuros de fines de los noventa (2:1, 30° de
 * elevación, el piso en rombos de 160×80) y lo pinta como un render previo: luz de arriba a la izquierda, sombra
 * propia y sombra en el piso, la textura de cada material y la paleta bajada a rampas cortas con trama ordenada.
 *
 * Unidades: una unidad del mundo es un pixel a lo largo del eje del piso; una celda de juego (32×16 en pantalla)
 * mide 16 unidades y un rombo de piso (160×80) mide 80. Un personaje adulto mide 75 px en pantalla, unas 61
 * unidades de alto (ALTO_PERSONA).
 */

export type V3 = [number, number, number];
/** Cuánto sube en pantalla una unidad de altura: cámara a 30° sobre el piso (√1.5). */
export const KZ = Math.sqrt(1.5);
export const CELDA = 16;
export const BALDOSA = 80;
export const ALTO_PERSONA = Math.round(75 / KZ);

const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];

/** Hacia dónde mira la cámara (del ojo a la escena) y de dónde viene la luz. */
export const VISTA: V3 = norm([-1, -1, -1 / KZ]);
export const LUZ: V3 = norm([-0.45, 0.3, 0.85]);

/** Pantalla relativa al ancla (el origen del mundo en el piso). */
export const aPantalla = (p: V3): [number, number] => [p[0] - p[1], (p[0] + p[1]) / 2 - p[2] * KZ];

// ------------------------------------------------------------------ piezas
interface Base { mat: string; resta?: boolean; tono?: number }
interface Conv extends Base { k: 'conv'; planos: [V3, number][]; pts: V3[] }
interface Cono extends Base { k: 'cono'; o: V3; ex: V3; ey: V3; ez: V3; h: number; r0: number; r1: number }
interface Elip extends Base { k: 'elip'; c: V3; ex: V3; ey: V3; ez: V3; r: V3 }
export type Pieza = Conv | Cono | Elip;

export interface Opc { mat: string; tono?: number; resta?: boolean }
/** Ejes de una pieza girada `giro` grados alrededor del eje vertical (y opcionalmente inclinada). */
function ejes(giro = 0, incl = 0, inclEje: 'x' | 'y' = 'x'): [V3, V3, V3] {
  const g = (giro * Math.PI) / 180, a = (incl * Math.PI) / 180;
  let ex: V3 = [Math.cos(g), Math.sin(g), 0], ey: V3 = [-Math.sin(g), Math.cos(g), 0], ez: V3 = [0, 0, 1];
  if (a) {
    if (inclEje === 'x') { const ey2 = add(ey.map((v) => v * Math.cos(a)) as V3, ez, Math.sin(a)); ez = add(ez.map((v) => v * Math.cos(a)) as V3, ey, -Math.sin(a)); ey = ey2; }
    else { const ex2 = add(ex.map((v) => v * Math.cos(a)) as V3, ez, Math.sin(a)); ez = add(ez.map((v) => v * Math.cos(a)) as V3, ex, -Math.sin(a)); ex = ex2; }
  }
  return [ex, ey, ez];
}
/** Caja: centro de la base en (x,y,z), medidas completas (an, pr, al), giro en grados. */
export function caja(x: number, y: number, z: number, an: number, pr: number, al: number, o: Opc & { giro?: number; incl?: number; inclEje?: 'x' | 'y' }): Pieza {
  const [ex, ey, ez] = ejes(o.giro, o.incl, o.inclEje);
  const c = add([x, y, z], ez, al / 2), hx = an / 2, hy = pr / 2, hz = al / 2;
  const planos: [V3, number][] = [];
  for (const [n, h] of [[ex, hx], [ey, hy], [ez, hz]] as [V3, number][]) { planos.push([n, dot(n, c) + h]); const m: V3 = [-n[0], -n[1], -n[2]]; planos.push([m, dot(m, c) + h]); }
  const pts: V3[] = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) pts.push(add(add(add(c, ex, sx * hx), ey, sy * hy), ez, sz * hz));
  return { k: 'conv', planos, pts, mat: o.mat, tono: o.tono, resta: o.resta };
}
/** Poliedro convexo desde sus vértices (se arman los planos de su cáscara: sirve para techos, cuñas y pirámides). */
export function poliedro(pts: V3[], o: Opc): Pieza {
  const planos: [V3, number][] = [];
  const n = pts.length;
  const c: V3 = [0, 0, 0]; for (const p of pts) { c[0] += p[0] / n; c[1] += p[1] / n; c[2] += p[2] / n; }
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) {
    let nn = cross(add(pts[j], pts[i], -1), add(pts[k], pts[i], -1));
    if (Math.hypot(...nn) < 1e-6) continue;
    nn = norm(nn);
    let d = dot(nn, pts[i]);
    if (dot(nn, c) > d) { nn = [-nn[0], -nn[1], -nn[2]]; d = -d; }
    if (pts.every((p) => dot(nn, p) <= d + 1e-4) && !planos.some(([m, e]) => dot(m, nn) > 0.9999 && Math.abs(e - d) < 1e-3)) planos.push([nn, d]);
  }
  return { k: 'conv', planos, pts, mat: o.mat, tono: o.tono, resta: o.resta };
}
/** Cilindro o cono truncado: base en (x,y,z), radio abajo r0, arriba r1, alto h; `incl` lo tumba (grados). */
export function cilindro(x: number, y: number, z: number, r0: number, h: number, o: Opc & { r1?: number; giro?: number; incl?: number; inclEje?: 'x' | 'y'; eje?: V3 }): Pieza {
  let [ex, ey, ez] = ejes(o.giro, o.incl, o.inclEje);
  if (o.eje) { ez = norm(o.eje); const t: V3 = Math.abs(ez[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]; ex = norm(cross(t, ez)); ey = cross(ez, ex); }
  return { k: 'cono', o: [x, y, z], ex, ey, ez, h, r0, r1: o.r1 ?? r0, mat: o.mat, tono: o.tono, resta: o.resta };
}
/** Cilindro entre dos puntos (ramas, palos, cadenas). */
export function palo(a: V3, b: V3, r0: number, o: Opc & { r1?: number }): Pieza {
  const d = add(b, a, -1);
  return cilindro(a[0], a[1], a[2], r0, Math.hypot(...d), { ...o, eje: d });
}
/** Elipsoide con centro (x,y,z) y radios. */
export function elipsoide(x: number, y: number, z: number, rx: number, ry: number, rz: number, o: Opc & { giro?: number; incl?: number; inclEje?: 'x' | 'y' }): Pieza {
  const [ex, ey, ez] = ejes(o.giro, o.incl, o.inclEje);
  return { k: 'elip', c: [x, y, z], ex, ey, ez, r: [rx, ry, rz], mat: o.mat, tono: o.tono, resta: o.resta };
}
export const esfera = (x: number, y: number, z: number, r: number, o: Opc) => elipsoide(x, y, z, r, r, r, o);

// ------------------------------------------------------------------ intersección (cada pieza es convexa: entrada y salida)
interface Tramo { t0: number; t1: number; n0: V3; n1: V3; p: Pieza; i: number }
const toLocal = (v: V3, ex: V3, ey: V3, ez: V3): V3 => [dot(v, ex), dot(v, ey), dot(v, ez)];
const toWorld = (v: V3, ex: V3, ey: V3, ez: V3): V3 => [ex[0] * v[0] + ey[0] * v[1] + ez[0] * v[2], ex[1] * v[0] + ey[1] * v[1] + ez[1] * v[2], ex[2] * v[0] + ey[2] * v[1] + ez[2] * v[2]];

function tramo(p: Pieza, o: V3, d: V3): Tramo | null {
  if (p.k === 'conv') {
    let t0 = -Infinity, t1 = Infinity, n0: V3 = [0, 0, 1], n1: V3 = [0, 0, 1];
    for (const [n, e] of p.planos) {
      const den = dot(n, d), dist = e - dot(n, o);
      if (Math.abs(den) < 1e-9) { if (dist < 0) return null; continue; }
      const t = dist / den;
      if (den < 0) { if (t > t0) { t0 = t; n0 = n; } } else if (t < t1) { t1 = t; n1 = n; }
      if (t0 > t1) return null;
    }
    return { t0, t1, n0, n1, p, i: 0 };
  }
  if (p.k === 'elip') {
    const lo = toLocal(add(o, p.c, -1), p.ex, p.ey, p.ez), ld = toLocal(d, p.ex, p.ey, p.ez);
    const so: V3 = [lo[0] / p.r[0], lo[1] / p.r[1], lo[2] / p.r[2]], sd: V3 = [ld[0] / p.r[0], ld[1] / p.r[1], ld[2] / p.r[2]];
    const a = dot(sd, sd), b = 2 * dot(so, sd), c = dot(so, so) - 1, disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    const q = Math.sqrt(disc), t0 = (-b - q) / (2 * a), t1 = (-b + q) / (2 * a);
    const nrm = (t: number): V3 => { const l = add(lo, ld, t); return norm(toWorld([l[0] / (p.r[0] * p.r[0]), l[1] / (p.r[1] * p.r[1]), l[2] / (p.r[2] * p.r[2])], p.ex, p.ey, p.ez)); };
    return { t0, t1, n0: nrm(t0), n1: nrm(t1), p, i: 0 };
  }
  // cono truncado
  const lo = toLocal(add(o, p.o, -1), p.ex, p.ey, p.ez), ld = toLocal(d, p.ex, p.ey, p.ez);
  const k = (p.r1 - p.r0) / p.h;
  const cands: [number, V3][] = [];
  const A = ld[0] * ld[0] + ld[1] * ld[1] - k * k * ld[2] * ld[2];
  const rB = p.r0 + k * lo[2];
  const B = 2 * (lo[0] * ld[0] + lo[1] * ld[1] - k * ld[2] * rB);
  const C = lo[0] * lo[0] + lo[1] * lo[1] - rB * rB;
  const lado = (t: number) => { const w = lo[2] + ld[2] * t; if (w < 0 || w > p.h) return; const x = lo[0] + ld[0] * t, y = lo[1] + ld[1] * t; const r = p.r0 + k * w; if (r < 0) return; cands.push([t, norm(toWorld([x, y, -r * k], p.ex, p.ey, p.ez))]); };
  if (Math.abs(A) > 1e-9) { const disc = B * B - 4 * A * C; if (disc >= 0) { const q = Math.sqrt(disc); lado((-B - q) / (2 * A)); lado((-B + q) / (2 * A)); } }
  else if (Math.abs(B) > 1e-9) lado(-C / B);
  if (Math.abs(ld[2]) > 1e-9) for (const [w, r, s] of [[0, p.r0, -1], [p.h, p.r1, 1]] as [number, number, number][]) {
    const t = (w - lo[2]) / ld[2], x = lo[0] + ld[0] * t, y = lo[1] + ld[1] * t;
    if (x * x + y * y <= r * r) cands.push([t, toWorld([0, 0, s], p.ex, p.ey, p.ez)]);
  }
  if (cands.length < 2) return null;
  cands.sort((a, b) => a[0] - b[0]);
  const a0 = cands[0], a1 = cands[cands.length - 1];
  return { t0: a0[0], t1: a1[0], n0: a0[1], n1: a1[1], p, i: 0 };
}

/**
 * El primer punto sólido de la escena en el rayo. Una pieza `resta` cava solo en las piezas que se armaron antes que
 * ella (así se talla la puerta en el muro y después se pone la hoja de madera dentro del hueco).
 */
const orden = new WeakMap<Pieza, number>();
const envolvente = new WeakMap<Pieza, [number, number, number, number]>();
function esferaDe(p: Pieza): [number, number, number, number] {
  let e = envolvente.get(p);
  if (e) return e;
  let pts: V3[];
  if (p.k === 'conv') pts = p.pts;
  else if (p.k === 'elip') { const R = Math.max(...p.r); e = [p.c[0], p.c[1], p.c[2], R]; envolvente.set(p, e); return e; }
  else { const R = Math.max(p.r0, p.r1); const top = add(p.o, p.ez, p.h); const c: V3 = [(p.o[0] + top[0]) / 2, (p.o[1] + top[1]) / 2, (p.o[2] + top[2]) / 2]; e = [c[0], c[1], c[2], Math.hypot(p.h / 2, R) + 0.01]; envolvente.set(p, e); return e; }
  const c: V3 = [0, 0, 0]; for (const q of pts) { c[0] += q[0] / pts.length; c[1] += q[1] / pts.length; c[2] += q[2] / pts.length; }
  let r = 0; for (const q of pts) r = Math.max(r, Math.hypot(q[0] - c[0], q[1] - c[1], q[2] - c[2]));
  e = [c[0], c[1], c[2], r + 0.01]; envolvente.set(p, e); return e;
}
export function numerar(ps: Pieza[]) { ps.forEach((p, i) => orden.set(p, i)); }
function impacto(ps: Pieza[], o: V3, d: V3, tmin = 0): { t: number; n: V3; p: Pieza } | null {
  const pos: Tramo[] = [], neg: Tramo[] = [];
  for (const p of ps) {
    // descarte: el rayo pasa lejos de la esfera que envuelve la pieza (d es unitario)
    const e = esferaDe(p), wx = e[0] - o[0], wy = e[1] - o[1], wz = e[2] - o[2];
    const tc = wx * d[0] + wy * d[1] + wz * d[2];
    if (tc + e[3] < tmin) continue;
    const q = wx * wx + wy * wy + wz * wz - tc * tc;
    if (q > e[3] * e[3]) continue;
    const r = tramo(p, o, d); if (!r || r.t1 < tmin) continue; r.i = orden.get(p) ?? 0; (p.resta ? neg : pos).push(r);
  }
  if (!pos.length) return null;
  let mejor: { t: number; n: V3; p: Pieza } | null = null;
  const dentroNeg = (t: number, i: number) => neg.some((r) => r.i > i && t > r.t0 + 1e-6 && t < r.t1 - 1e-6);
  for (const r of pos) {
    const t = Math.max(r.t0, tmin);
    if (mejor && t >= mejor.t) continue;
    if (!dentroNeg(t, r.i)) { mejor = { t, n: r.n0, p: r.p }; continue; }
    // dentro de un hueco: la pared del hueco (salida de la pieza que resta) si cae dentro de esta pieza
    for (const q of neg) if (q.i > r.i && q.t1 > t && q.t1 < r.t1 && (!mejor || q.t1 < mejor.t) && !dentroNeg(q.t1 + 1e-5, r.i)) mejor = { t: q.t1, n: [-q.n1[0], -q.n1[1], -q.n1[2]], p: r.p };
  }
  return mejor;
}

// ------------------------------------------------------------------ ruido y trama
function hash3(x: number, y: number, z: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** Ruido de valor 3D suave (0..1). */
export function ruido(x: number, y: number, z: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const s = (t: number) => t * t * (3 - 2 * t), u = s(xf), v = s(yf), w = s(zf);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  return l(l(l(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), u), l(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), u), v),
    l(l(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), u), l(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), u), v), w);
}
export const fbm = (x: number, y: number, z: number) => ruido(x, y, z) * 0.6 + ruido(x * 2.1, y * 2.1, z * 2.1) * 0.3 + ruido(x * 4.3, y * 4.3, z * 4.3) * 0.1;
export { hash3 };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const trama = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)];

// ------------------------------------------------------------------ pintar
export interface Escena { piezas: Pieza[]; /** sin sombra en el piso (cosas que flotan o pisos) */ sinSombra?: boolean; /** luz que tiñe (fuego cerca) */ resplandor?: { c: V3; r: number; color: string } }
export interface Render { img: Raster; ancla: [number, number] }
export interface Ambiente { tinte?: [number, number, number]; luz?: number }

const rgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rampas = new Map<string, [number, number, number][]>();
function rampa(m: Material, id: string) { let r = rampas.get(id); if (!r) { r = m.rampa.map(rgb); rampas.set(id, r); } return r; }

/** Caja de pantalla de una pieza (para recortar la imagen y para no probar piezas lejos del pixel). */
function cajaPantalla(p: Pieza): [number, number, number, number] {
  let pts: V3[];
  if (p.k === 'conv') pts = p.pts;
  else if (p.k === 'elip') { const R = Math.max(...p.r); pts = []; for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) pts.push([p.c[0] + sx * R, p.c[1] + sy * R, p.c[2] + sz * R]); }
  else { const R = Math.max(p.r0, p.r1); const top = add(p.o, p.ez, p.h); pts = []; for (const c of [p.o, top]) for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) pts.push([c[0] + sx * R, c[1] + sy * R, c[2] + sz * R]); }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const q of pts) { const [sx, sy] = aPantalla(q); x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); }
  return [x0, y0, x1, y1];
}

/**
 * Pinta la escena. Devuelve la imagen recortada y el ancla (dónde cae el origen del mundo en el piso).
 * `margen` deja aire para la sombra; `fijo` fuerza el tamaño (para cuadros de una misma animación).
 */
/** Lo que ocupa la escena en pantalla (con su sombra), relativo al ancla. */
export function medirEscena(esc: Escena): { x0: number; y0: number; x1: number; y1: number; zmax: number } | null {
  const ps = esc.piezas;
  let X0 = Infinity, Y0 = Infinity, X1 = -Infinity, Y1 = -Infinity;
  for (const p of ps) { if (p.resta) continue; const c = cajaPantalla(p); X0 = Math.min(X0, c[0]); Y0 = Math.min(Y0, c[1]); X1 = Math.max(X1, c[2]); Y1 = Math.max(Y1, c[3]); }
  if (!isFinite(X0)) return null;
  let zmax = 0;
  for (const p of ps) { const c = p.k === 'conv' ? Math.max(...p.pts.map((q) => q[2])) : p.k === 'elip' ? p.c[2] + Math.max(...p.r) : Math.max(p.o[2], p.o[2] + p.ez[2] * p.h) + Math.max(p.r0, p.r1); zmax = Math.max(zmax, c); }
  // la sombra se estira hacia abajo a la derecha de la luz
  if (!esc.sinSombra) { const off = aPantalla([-LUZ[0] / LUZ[2] * zmax, -LUZ[1] / LUZ[2] * zmax, 0]); X0 = Math.min(X0, X0 + off[0]); X1 = Math.max(X1, X1 + off[0]); Y1 = Math.max(Y1, Y1 + off[1]); Y0 = Math.min(Y0, Y0 + off[1]); }
  return { x0: X0, y0: Y0, x1: X1, y1: Y1, zmax };
}

export function pintarEscena(esc: Escena, amb: Ambiente = {}, fijo?: { w: number; h: number; ax: number; ay: number }): Render {
  const ps = esc.piezas;
  numerar(ps);
  const cajas = ps.map(cajaPantalla);
  const med = medirEscena(esc);
  if (!med) return { img: createRaster(1, 1), ancla: [0, 0] };
  const { x0: X0, y0: Y0, x1: X1, y1: Y1, zmax } = med;
  const W = fijo?.w ?? Math.ceil(X1 - X0) + 4, H = fijo?.h ?? Math.ceil(Y1 - Y0) + 4;
  const ax = fijo?.ax ?? Math.floor(-X0) + 2, ay = fijo?.ay ?? Math.floor(-Y0) + 2;
  const img = createRaster(W, H);
  // rejilla de 16 px con las piezas que la tocan
  const G = 16, gw = Math.ceil(W / G), gh = Math.ceil(H / G);
  const grilla: Pieza[][] = Array.from({ length: gw * gh }, () => []);
  ps.forEach((p, i) => {
    const c = cajas[i];
    for (let gy = Math.max(0, Math.floor((c[1] + ay) / G)); gy <= Math.min(gh - 1, Math.floor((c[3] + ay) / G)); gy++)
      for (let gx = Math.max(0, Math.floor((c[0] + ax) / G)); gx <= Math.min(gw - 1, Math.floor((c[2] + ax) / G)); gx++) grilla[gy * gw + gx].push(p);
  });
  const sol = ps.filter((p) => !MATERIALES[p.mat]?.emite);
  const z0 = zmax + 40;
  const tin = amb.tinte ?? [1, 1, 1];
  const luzAmb = amb.luz ?? 1;
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const sx = px + 0.5 - ax, sy = py + 0.5 - ay;
    const S = 2 * (sy + KZ * z0), D = sx;
    const o: V3 = [(S + D) / 2, (S - D) / 2, z0];
    const cand = grilla[Math.floor(py / G) * gw + Math.floor(px / G)];
    const hit = cand.length ? impacto(cand, o, VISTA) : null;
    const i = (py * W + px) * 4;
    if (!hit) {
      if (esc.sinSombra) continue;
      // el piso: ¿le cae sombra?
      const t = (o[2] - 0) / -VISTA[2];
      const g = add(o, VISTA, t);
      if (impacto(sol, add(g, LUZ, 0.6), LUZ)) { img.data[i] = 8; img.data[i + 1] = 6; img.data[i + 2] = 10; img.data[i + 3] = 120; }
      continue;
    }
    const m = MATERIALES[hit.p.mat] ?? MATERIALES.piedra;
    const p = add(o, VISTA, hit.t);
    const n = hit.n;
    let s: number;
    if (m.emite) {
      s = 0.55 + 0.45 * (1 - Math.abs(dot(n, VISTA))) * 0 + (fbm(p[0] * m.escala, p[1] * m.escala, p[2] * m.escala) - 0.5) * m.ruido + (hit.p.tono ?? 0) + 0.25;
    } else {
      const dif = Math.max(0, dot(n, LUZ));
      const enSombra = dif > 0 && impacto(sol, add(p, n, 0.8), LUZ) ? 1 : 0;
      const arriba = Math.max(0, n[2]);
      s = 0.2 + 0.62 * dif * (1 - enSombra * 0.75) + 0.12 * arriba;
      if (m.brillo) { const h = norm(add(LUZ, VISTA, -1)); s += m.brillo * Math.pow(Math.max(0, dot(n, h)), 12) * (1 - enSombra); }
      s += (fbm(p[0] * m.escala, p[1] * m.escala, p[2] * m.escala) - 0.5) * m.ruido;
      if (m.patron) s += m.patron(p, n);
      s += hit.p.tono ?? 0;
      // los pies en el piso: un poco de oclusión
      s *= 0.78 + 0.22 * Math.min(1, Math.max(0, p[2]) / 10);
      s *= luzAmb;
      if (esc.resplandor) { const dd = Math.hypot(p[0] - esc.resplandor.c[0], p[1] - esc.resplandor.c[1], p[2] - esc.resplandor.c[2]); s += Math.max(0, 1 - dd / esc.resplandor.r) * 0.25; }
    }
    const R = rampa(m, hit.p.mat);
    const k = Math.max(0, Math.min(R.length - 1, Math.floor(Math.max(0, Math.min(0.999, s)) * R.length + trama(px, py) - 0.5)));
    let [r, g, b] = R[k];
    if (esc.resplandor && !m.emite) { const dd = Math.hypot(p[0] - esc.resplandor.c[0], p[1] - esc.resplandor.c[1], p[2] - esc.resplandor.c[2]); const f = Math.max(0, 1 - dd / esc.resplandor.r) * 0.35; const c = rgb(esc.resplandor.color); r += (c[0] - r) * f; g += (c[1] - g) * f; b += (c[2] - b) * f; }
    if (!m.emite) { r *= tin[0]; g *= tin[1]; b *= tin[2]; }
    img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
  }
  return { img, ancla: [ax, ay] };
}
