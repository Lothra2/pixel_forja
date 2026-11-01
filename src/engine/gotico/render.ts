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
/** Componente de una masa: hueso (cono redondeado entre a y b) o bulto (elipsoide orientado). */
export type Comp =
  | { f: 'hueso'; a: V3; b: V3; r0: number; r1: number; mat?: string; tono?: number; k?: number; sc: V3; sr: number; pre: number[] }
  | { f: 'bulto'; c: V3; ex: V3; ey: V3; ez: V3; r: V3; mat?: string; tono?: number; k?: number; sc: V3; sr: number };
/** Masa orgánica: componentes que se funden con unión suave (cuerpos, músculos, troncos, raíces). */
interface Masa extends Base { k: 'masa'; comps: Comp[]; suave: number; esf: [number, number, number, number] }
export type Pieza = Conv | Cono | Elip | Masa;

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

/** Opciones de un componente de masa: material propio, tono y suavidad propia de la unión. */
export interface OpcComp { mat?: string; tono?: number; k?: number }
/** Hueso de una masa: cono redondeado de `a` (radio r0) a `b` (radio r1). */
export function hueso(a: V3, b: V3, r0: number, r1 = r0, o: OpcComp = {}): Comp {
  const sc: V3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], l2 = bx * bx + by * by + bz * bz, rr = r0 - r1;
  return { f: 'hueso', a, b, r0, r1, ...o, sc, sr: Math.sqrt(l2) / 2 + Math.max(r0, r1), pre: [bx, by, bz, l2, rr, l2 - rr * rr, l2 > 1e-9 ? 1 / l2 : 0] };
}
/**
 * Bulto de una masa: elipsoide con centro `c` y radios. `eje` lo orienta (el radio x va a lo largo de ese eje, el z
 * queda lo más vertical posible); sin eje, `giro` en grados alrededor de la vertical.
 */
export function bulto(c: V3, r: V3, o: OpcComp & { eje?: V3; ejes?: [V3, V3, V3]; giro?: number; incl?: number; inclEje?: 'x' | 'y' } = {}): Comp {
  let ex: V3, ey: V3, ez: V3;
  if (o.ejes) [ex, ey, ez] = o.ejes;
  else if (o.eje) {
    ex = norm(o.eje);
    const up: V3 = Math.abs(ex[2]) > 0.95 ? [1, 0, 0] : [0, 0, 1];
    ey = norm(cross(up, ex)); ez = cross(ex, ey);
  } else [ex, ey, ez] = ejes(o.giro, o.incl, o.inclEje);
  return { f: 'bulto', c, ex, ey, ez, r, mat: o.mat, tono: o.tono, k: o.k, sc: c, sr: Math.max(r[0], r[1], r[2]) };
}
/** Une los componentes en una sola masa con unión suave `suave` (unidades: 1.5 a 4 se ve orgánico). */
export function masa(comps: Comp[], o: Opc & { suave?: number }): Pieza {
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (const c of comps) { x0 = Math.min(x0, c.sc[0] - c.sr); y0 = Math.min(y0, c.sc[1] - c.sr); z0 = Math.min(z0, c.sc[2] - c.sr); x1 = Math.max(x1, c.sc[0] + c.sr); y1 = Math.max(y1, c.sc[1] + c.sr); z1 = Math.max(z1, c.sc[2] + c.sr); }
  const cc: V3 = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
  let R = 0; for (const c of comps) R = Math.max(R, Math.hypot(c.sc[0] - cc[0], c.sc[1] - cc[1], c.sc[2] - cc[2]) + c.sr);
  const suave = o.suave ?? 2.5;
  return { k: 'masa', comps, suave, esf: [cc[0], cc[1], cc[2], R + suave * 0.3 + 0.05], mat: o.mat, tono: o.tono };
}

// ---- distancias con signo
function dHueso(c: Extract<Comp, { f: 'hueso' }>, p: V3): number {
  // cono redondeado (fórmula de Íñigo Quílez), sin crear arreglos
  const [bx, by, bz, l2, rr, a2, il2] = c.pre;
  const px = p[0] - c.a[0], py = p[1] - c.a[1], pz = p[2] - c.a[2];
  if (l2 < 1e-9) return Math.sqrt(px * px + py * py + pz * pz) - Math.max(c.r0, c.r1);
  const y = px * bx + py * by + pz * bz, z = y - l2;
  const qx = px * l2 - bx * y, qy = py * l2 - by * y, qz = pz * l2 - bz * y, x2 = qx * qx + qy * qy + qz * qz;
  const y2 = y * y * l2, z2 = z * z * l2, k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - c.r1;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - c.r0;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - c.r0;
}
function dBulto(c: Extract<Comp, { f: 'bulto' }>, p: V3): number {
  const qx = p[0] - c.c[0], qy = p[1] - c.c[1], qz = p[2] - c.c[2];
  const lx = (qx * c.ex[0] + qy * c.ex[1] + qz * c.ex[2]) / c.r[0], ly = (qx * c.ey[0] + qy * c.ey[1] + qz * c.ey[2]) / c.r[1], lz = (qx * c.ez[0] + qy * c.ez[1] + qz * c.ez[2]) / c.r[2];
  const k0 = Math.sqrt(lx * lx + ly * ly + lz * lz), mx = lx / c.r[0], my = ly / c.r[1], mz = lz / c.r[2], k1 = Math.sqrt(mx * mx + my * my + mz * mz);
  return k1 < 1e-9 ? -Math.min(c.r[0], c.r[1], c.r[2]) : (k0 * (k0 - 1)) / k1;
}
/** Distancia a la masa y el componente más cercano (el que pone el material); `sub` limita a esos componentes. */
function dMasa(m: Masa, p: V3, sub?: Int16Array, nsub = 0): [number, number] {
  let d = Infinity, mejor = 0, md = Infinity;
  const n = sub ? nsub : m.comps.length;
  for (let j = 0; j < n; j++) {
    const i = sub ? sub[j] : j;
    const c = m.comps[i], k = c.k ?? m.suave;
    const ux = p[0] - c.sc[0], uy = p[1] - c.sc[1], uz = p[2] - c.sc[2];
    const lb = Math.sqrt(ux * ux + uy * uy + uz * uz) - c.sr;
    if (lb > d + k && lb > md) continue;
    const di = c.f === 'hueso' ? dHueso(c, p) : dBulto(c, p);
    if (di < md) { md = di; mejor = i; }
    if (d === Infinity) d = di;
    else if (k <= 0) d = Math.min(d, di);
    else { const h = Math.max(k - Math.abs(d - di), 0) / k; d = Math.min(d, di) - h * h * k * 0.25; }
  }
  return [d, mejor];
}
const SUB = new Int16Array(512);
function normalMasa(m: Masa, p: V3, sub?: Int16Array, ns = 0): V3 {
  const e = 0.04;
  const a = dMasa(m, [p[0] + e, p[1] - e, p[2] - e], sub, ns)[0], b = dMasa(m, [p[0] - e, p[1] - e, p[2] + e], sub, ns)[0];
  const c = dMasa(m, [p[0] - e, p[1] + e, p[2] - e], sub, ns)[0], d = dMasa(m, [p[0] + e, p[1] + e, p[2] + e], sub, ns)[0];
  return norm([a - b - c + d, -a - b + c + d, -a + b - c + d]);
}

// ------------------------------------------------------------------ intersección (cada pieza es convexa: entrada y salida)
interface Tramo { t0: number; t1: number; n0: V3; n1: V3; p: Pieza; i: number; mat?: string; tono?: number }
const toLocal = (v: V3, ex: V3, ey: V3, ez: V3): V3 => [dot(v, ex), dot(v, ey), dot(v, ez)];
const toWorld = (v: V3, ex: V3, ey: V3, ez: V3): V3 => [ex[0] * v[0] + ey[0] * v[1] + ez[0] * v[2], ex[1] * v[0] + ey[1] * v[1] + ez[1] * v[2], ex[2] * v[0] + ey[2] * v[1] + ez[2] * v[2]];

function tramo(p: Pieza, o: V3, d: V3, tdesde = -Infinity, thasta = Infinity): Tramo | null {
  if (p.k === 'masa') {
    // solo los componentes cuya esfera (más la unión suave) cruza el rayo, y la marcha entre su primera entrada y su última salida
    let ns = 0, ta = Infinity, tb = -Infinity;
    for (let i = 0; i < p.comps.length && ns < 512; i++) {
      const c = p.comps[i], R = c.sr + Math.max(0, c.k ?? p.suave) * 0.5 + 0.05;
      const wx = c.sc[0] - o[0], wy = c.sc[1] - o[1], wz = c.sc[2] - o[2];
      const tc = wx * d[0] + wy * d[1] + wz * d[2], q = wx * wx + wy * wy + wz * wz - tc * tc;
      if (q > R * R) continue;
      const hw = Math.sqrt(R * R - q);
      SUB[ns++] = i; if (tc - hw < ta) ta = tc - hw; if (tc + hw > tb) tb = tc + hw;
    }
    if (!ns) return null;
    let t = Math.max(ta, tdesde);
    const tfin = Math.min(tb, thasta);
    for (let n = 0; n < 160 && t < tfin; n++) {
      const pt: V3 = [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t];
      const [dd, ci] = dMasa(p, pt, SUB, ns);
      if (dd < 0.02) { const c = p.comps[ci]; const nn = normalMasa(p, pt, SUB, ns); return { t0: t, t1: tb, n0: nn, n1: [-nn[0], -nn[1], -nn[2]], p, i: 0, mat: c.mat, tono: c.tono }; }
      t += Math.max(dd * 0.9, 0.01);
    }
    return null;
  }
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
  if (p.k === 'masa') { envolvente.set(p, p.esf); return p.esf; }
  if (p.k === 'conv') pts = p.pts;
  else if (p.k === 'elip') { const R = Math.max(...p.r); e = [p.c[0], p.c[1], p.c[2], R]; envolvente.set(p, e); return e; }
  else { const R = Math.max(p.r0, p.r1); const top = add(p.o, p.ez, p.h); const c: V3 = [(p.o[0] + top[0]) / 2, (p.o[1] + top[1]) / 2, (p.o[2] + top[2]) / 2]; e = [c[0], c[1], c[2], Math.hypot(p.h / 2, R) + 0.01]; envolvente.set(p, e); return e; }
  const c: V3 = [0, 0, 0]; for (const q of pts) { c[0] += q[0] / pts.length; c[1] += q[1] / pts.length; c[2] += q[2] / pts.length; }
  let r = 0; for (const q of pts) r = Math.max(r, Math.hypot(q[0] - c[0], q[1] - c[1], q[2] - c[2]));
  e = [c[0], c[1], c[2], r + 0.01]; envolvente.set(p, e); return e;
}
export function numerar(ps: Pieza[]) { ps.forEach((p, i) => orden.set(p, i)); }
interface Golpe { t: number; n: V3; p: Pieza; mat?: string; tono?: number }
function impacto(ps: Pieza[], o: V3, d: V3, tmin = 0): Golpe | null {
  const pos: Tramo[] = [], neg: Tramo[] = [];
  let masas: [number, Masa][] | null = null;
  for (const p of ps) {
    // descarte: el rayo pasa lejos de la esfera que envuelve la pieza (d es unitario)
    const e = esferaDe(p), wx = e[0] - o[0], wy = e[1] - o[1], wz = e[2] - o[2];
    const tc = wx * d[0] + wy * d[1] + wz * d[2];
    if (tc + e[3] < tmin) continue;
    const q = wx * wx + wy * wy + wz * wz - tc * tc;
    if (q > e[3] * e[3]) continue;
    // las masas (caras de trazar) van después, de la más cercana a la más lejana, y solo si pueden tapar lo encontrado
    if (p.k === 'masa') { (masas ??= []).push([tc - Math.sqrt(e[3] * e[3] - q), p]); continue; }
    const r = tramo(p, o, d); if (!r || r.t1 < tmin) continue; r.i = orden.get(p) ?? 0; (p.resta ? neg : pos).push(r);
  }
  let mejor: Golpe | null = null;
  const dentroNeg = (t: number, i: number) => neg.some((r) => r.i > i && t > r.t0 + 1e-6 && t < r.t1 - 1e-6);
  for (const r of pos) {
    const t = Math.max(r.t0, tmin);
    if (mejor && t >= mejor.t) continue;
    if (!dentroNeg(t, r.i)) { mejor = { t, n: r.n0, p: r.p, mat: r.mat, tono: r.tono }; continue; }
    // dentro de un hueco: la pared del hueco (salida de la pieza que resta) si cae dentro de esta pieza
    for (const q of neg) if (q.i > r.i && q.t1 > t && q.t1 < r.t1 && (!mejor || q.t1 < mejor.t) && !dentroNeg(q.t1 + 1e-5, r.i)) mejor = { t: q.t1, n: [-q.n1[0], -q.n1[1], -q.n1[2]], p: r.p };
  }
  if (masas) {
    if (masas.length > 1) masas.sort((a, b) => a[0] - b[0]);
    for (const [entra, m] of masas) {
      if (mejor && entra >= mejor.t) break;
      const r = tramo(m, o, d, Math.max(tmin, entra), mejor ? mejor.t : Infinity);
      if (!r || r.t0 < tmin) continue;
      const i = orden.get(m) ?? 0;
      if ((!mejor || r.t0 < mejor.t) && !dentroNeg(r.t0, i)) mejor = { t: r.t0, n: r.n0, p: m, mat: r.mat, tono: r.tono };
    }
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
export interface Escena {
  piezas: Pieza[];
  /** sin sombra en el piso (cosas que flotan o pisos) */
  sinSombra?: boolean;
  /** luz que tiñe (fuego cerca) */
  resplandor?: { c: V3; r: number; color: string };
  /** muestras por lado de cada pixel (1 a 3); si no está, la calidad global */
  ss?: number;
}
export interface Render { img: Raster; ancla: [number, number] }
export interface Ambiente { tinte?: [number, number, number]; luz?: number }

const rgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rampas = new Map<string, [number, number, number][]>();
function rampa(m: Material, id: string) { let r = rampas.get(id); if (!r) { r = m.rampa.map(rgb); rampas.set(id, r); } return r; }

/** Caja de pantalla de una pieza (para recortar la imagen y para no probar piezas lejos del pixel). */
function cajaPantalla(p: Pieza): [number, number, number, number] {
  let pts: V3[];
  if (p.k === 'masa') { const [cx, cy, cz, R] = p.esf; pts = []; for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) pts.push([cx + sx * R, cy + sy * R, cz + sz * R]); }
  else if (p.k === 'conv') pts = p.pts;
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
  for (const p of ps) { const c = p.k === 'masa' ? p.esf[2] + p.esf[3] : p.k === 'conv' ? Math.max(...p.pts.map((q) => q[2])) : p.k === 'elip' ? p.c[2] + Math.max(...p.r) : Math.max(p.o[2], p.o[2] + p.ez[2] * p.h) + Math.max(p.r0, p.r1); zmax = Math.max(zmax, c); }
  // la sombra se estira hacia abajo a la derecha de la luz
  if (!esc.sinSombra) { const off = aPantalla([-LUZ[0] / LUZ[2] * zmax, -LUZ[1] / LUZ[2] * zmax, 0]); X0 = Math.min(X0, X0 + off[0]); X1 = Math.max(X1, X1 + off[0]); Y1 = Math.max(Y1, Y1 + off[1]); Y0 = Math.min(Y0, Y0 + off[1]); X0 -= 6; X1 += 6; Y1 += 4; }
  return { x0: X0, y0: Y0, x1: X1, y1: Y1, zmax };
}

// ------------------------------------------------------------------ sombras suaves y oclusión
/**
 * Mapa de sombras desde la luz, como los renders previos de la época (3ds Max con mapa de sombras filtrado): se
 * tira un rayo por texel desde el lado de la luz y se guarda la profundidad del primer golpe. La consulta busca
 * bloqueadores alrededor y abre la penumbra según la distancia (la sombra es dura al pie y se ablanda lejos).
 */
interface MapaSombra { U: V3; W: V3; u0: number; w0: number; ts: number; nu: number; nw: number; prof: Float32Array; bloq: Float32Array; bu: number; bw: number }
const UPZ: V3 = [0, 0, 1];
const DISCO: [number, number][] = Array.from({ length: 16 }, (_, i) => { const r = Math.sqrt((i + 0.5) / 16), a = i * 2.39996; return [Math.cos(a) * r, Math.sin(a) * r]; });
function rejillaDe(ps: Pieza[], proy: (c: V3) => [number, number], u0: number, w0: number, paso: number, nu: number, nw: number): Pieza[][] {
  const g: Pieza[][] = Array.from({ length: nu * nw }, () => []);
  for (const p of ps) {
    const e = esferaDe(p), [cu, cw] = proy([e[0], e[1], e[2]]);
    for (let j = Math.max(0, Math.floor((cw - e[3] - w0) / paso)); j <= Math.min(nw - 1, Math.floor((cw + e[3] - w0) / paso)); j++)
      for (let i = Math.max(0, Math.floor((cu - e[3] - u0) / paso)); i <= Math.min(nu - 1, Math.floor((cu + e[3] - u0) / paso)); i++) g[j * nu + i].push(p);
  }
  return g;
}
function mapaSombra(sol: Pieza[]): MapaSombra | null {
  const solidas = sol.filter((p) => !p.resta);
  if (!solidas.length) return null;
  const U = norm(cross(UPZ, LUZ)), W = cross(LUZ, U);
  let u0 = Infinity, u1 = -Infinity, w0 = Infinity, w1 = -Infinity, dmax = -Infinity;
  for (const p of solidas) { const e = esferaDe(p), c: V3 = [e[0], e[1], e[2]]; const cu = dot(c, U), cw = dot(c, W); u0 = Math.min(u0, cu - e[3]); u1 = Math.max(u1, cu + e[3]); w0 = Math.min(w0, cw - e[3]); w1 = Math.max(w1, cw + e[3]); dmax = Math.max(dmax, dot(c, LUZ) + e[3]); }
  const ts = Math.min(1.2, Math.max(0.55, Math.max(u1 - u0, w1 - w0) / 420));
  const nu = Math.ceil((u1 - u0) / ts) + 1, nw = Math.ceil((w1 - w0) / ts) + 1;
  const B = 8 * ts, bu = Math.ceil(nu / 8), bw = Math.ceil(nw / 8);
  const grilla = rejillaDe(sol, (c) => [dot(c, U), dot(c, W)], u0, w0, B, bu, bw);
  const prof = new Float32Array(nu * nw).fill(-Infinity);
  const top = dmax + 5, menosL: V3 = [-LUZ[0], -LUZ[1], -LUZ[2]];
  for (let j = 0; j < nw; j++) for (let i = 0; i < nu; i++) {
    const cand = grilla[Math.floor(j / 8) * bu + Math.floor(i / 8)];
    if (!cand.length) continue;
    const u = u0 + i * ts, w = w0 + j * ts;
    const o: V3 = [U[0] * u + W[0] * w + LUZ[0] * top, U[1] * u + W[1] * w + LUZ[1] * top, U[2] * u + W[2] * w + LUZ[2] * top];
    const h = impacto(cand, o, menosL);
    if (h) prof[j * nu + i] = top - h.t;
  }
  return { U, W, u0, w0, ts, nu, nw, prof, ...maxDilatado(prof, nu, nw, Math.ceil(4.6 / ts / 8)) };
}
/** Máximo por bloque de 8×8 texeles, dilatado `rad` bloques: si ni eso tapa, no hace falta mirar el detalle. */
function maxDilatado(v: Float32Array, nu: number, nw: number, rad: number): { bloq: Float32Array; bu: number; bw: number } {
  const bu = Math.ceil(nu / 8), bw = Math.ceil(nw / 8), b = new Float32Array(bu * bw).fill(-Infinity);
  for (let j = 0; j < nw; j++) for (let i = 0; i < nu; i++) { const k = (j >> 3) * bu + (i >> 3); if (v[j * nu + i] > b[k]) b[k] = v[j * nu + i]; }
  const d = new Float32Array(bu * bw).fill(-Infinity);
  for (let j = 0; j < bw; j++) for (let i = 0; i < bu; i++) {
    let m = -Infinity;
    for (let y = Math.max(0, j - rad); y <= Math.min(bw - 1, j + rad); y++) for (let x = Math.max(0, i - rad); x <= Math.min(bu - 1, i + rad); x++) if (b[y * bu + x] > m) m = b[y * bu + x];
    d[j * bu + i] = m;
  }
  return { bloq: d, bu, bw };
}
/** Cuánta luz directa le llega a `q` (0 en sombra, 1 a pleno sol). `giro` rota el disco de muestras por pixel. */
function luzEn(m: MapaSombra | null, q: V3, giro: number, sesgo = 0.35): number {
  if (!m) return 1;
  const u = (dot(q, m.U) - m.u0) / m.ts, w = (dot(q, m.W) - m.w0) / m.ts, d = dot(q, LUZ);
  {
    const bi = Math.floor(u / 8), bj = Math.floor(w / 8);
    if (bi < 0 || bj < 0 || bi >= m.bu || bj >= m.bw) return 1;
    if (!(m.bloq[bj * m.bu + bi] > d + sesgo)) return 1;
  }
  const cs = Math.cos(giro), sn = Math.sin(giro);
  const toma = (du: number, dw: number) => {
    const i = Math.round(u + (du * cs - dw * sn) / m.ts), j = Math.round(w + (du * sn + dw * cs) / m.ts);
    if (i < 0 || j < 0 || i >= m.nu || j >= m.nw) return -Infinity;
    return m.prof[j * m.nu + i];
  };
  // bloqueadores en un radio de 3 unidades
  let nb = 0, sb = 0;
  for (let k = 0; k < 12; k++) { const z = toma(DISCO[k][0] * 3, DISCO[k][1] * 3); if (z > d + sesgo) { nb++; sb += z; } }
  const centro = toma(0, 0);
  if (!nb && !(centro > d + sesgo)) return 1;
  const prom = nb ? sb / nb : centro;
  const pen = Math.min(4.5, Math.max(0.45, (prom - d) * 0.075));
  let luz = 0;
  for (let k = 0; k < 16; k++) if (!(toma(DISCO[k][0] * pen, DISCO[k][1] * pen) > d + sesgo)) luz++;
  return luz / 16;
}
/** Mapa de alturas desde arriba: la oclusión de contacto (lo que se oscurece al pie de muros, cajas y personas). */
interface Alturas { x0: number; y0: number; ts: number; nx: number; ny: number; h: Float32Array; bloq: Float32Array; bu: number; bw: number }
function mapaAlturas(sol: Pieza[]): Alturas | null {
  const solidas = sol.filter((p) => !p.resta);
  if (!solidas.length) return null;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, zmax = 0;
  for (const p of solidas) { const e = esferaDe(p); x0 = Math.min(x0, e[0] - e[3]); x1 = Math.max(x1, e[0] + e[3]); y0 = Math.min(y0, e[1] - e[3]); y1 = Math.max(y1, e[1] + e[3]); zmax = Math.max(zmax, e[2] + e[3]); }
  x0 -= 10; y0 -= 10; x1 += 10; y1 += 10;
  const ts = Math.min(2, Math.max(1, Math.max(x1 - x0, y1 - y0) / 220));
  const nx = Math.ceil((x1 - x0) / ts) + 1, ny = Math.ceil((y1 - y0) / ts) + 1;
  const bx = Math.ceil(nx / 8), by = Math.ceil(ny / 8);
  const grilla = rejillaDe(sol, (c) => [c[0], c[1]], x0, y0, 8 * ts, bx, by);
  const h = new Float32Array(nx * ny);
  const abajo: V3 = [0, 0, -1];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const cand = grilla[Math.floor(j / 8) * bx + Math.floor(i / 8)];
    if (!cand.length) continue;
    const g = impacto(cand, [x0 + i * ts, y0 + j * ts, zmax + 5], abajo);
    if (g) h[j * nx + i] = Math.max(0, zmax + 5 - g.t);
  }
  return { x0, y0, ts, nx, ny, h, ...maxDilatado(h, nx, ny, Math.ceil(13.5 / ts / 8)) };
}
const DIRS8: [number, number][] = Array.from({ length: 8 }, (_, i) => [Math.cos((i * Math.PI) / 4), Math.sin((i * Math.PI) / 4)]);
function alturaEn(a: Alturas, x: number, y: number): number {
  const i = Math.round((x - a.x0) / a.ts), j = Math.round((y - a.y0) / a.ts);
  if (i < 0 || j < 0 || i >= a.nx || j >= a.ny) return 0;
  return a.h[j * a.nx + i];
}
/** Oclusión 0..1 en el punto `p` con normal `n` (horizonte del mapa de alturas en 8 rumbos). */
function oclusion(a: Alturas | null, p: V3, n: V3): number {
  if (!a) return 0;
  {
    const bi = Math.floor((p[0] - a.x0) / a.ts / 8), bj = Math.floor((p[1] - a.y0) / a.ts / 8);
    if (bi < 0 || bj < 0 || bi >= a.bu || bj >= a.bw || a.bloq[bj * a.bu + bi] <= p[2]) return 0;
  }
  const bx = p[0] + n[0] * 1.2, by = p[1] + n[1] * 1.2, plano = Math.abs(n[2]) > 0.7;
  let occ = 0, cuenta = 0;
  for (const [dx, dy] of DIRS8) {
    if (!plano && dx * n[0] + dy * n[1] < -0.35) continue;
    let o = 0;
    for (const r of [1.5, 3.5, 7, 12]) { const hh = alturaEn(a, bx + dx * r, by + dy * r) - p[2]; if (hh > 0) o = Math.max(o, Math.min(1, hh / r) * (1 - r / 16)); }
    occ += o; cuenta++;
  }
  let res = cuenta ? occ / cuenta : 0;
  // algo encima (debajo de una mesa, bajo un alero)
  if (alturaEn(a, bx, by) > p[2] + 3) res = Math.max(res, 0.5);
  return Math.min(1, res);
}

/**
 * Calidad por omisión. 0: borrador rápido para editar (sombra dura de un rayo, sin oclusión). 1: sombras suaves con
 * penumbra y oclusión de contacto. 2 o 3: además cuatro o nueve rayos por pixel promediados (más fino y más lento).
 */
let CALIDAD = 1;
export const fijarCalidad = (n: number) => { CALIDAD = Math.max(0, Math.min(3, Math.round(n))); };
export const calidad = () => CALIDAD;

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
  const sol = ps.filter((p) => !MATERIALES[p.mat]?.emite && !(p.k === 'masa' && p.comps.every((c) => MATERIALES[c.mat ?? p.mat]?.emite)));
  const borrador = (esc.ss ?? CALIDAD) === 0;
  const sombras = borrador ? null : mapaSombra(sol);
  const alturas = borrador ? null : mapaAlturas(sol);
  /** En borrador la luz es de un solo rayo (sombra dura) y no hay oclusión. */
  const luzDe = (q: V3, giro: number, sesgo: number) => (borrador ? (impacto(sol, q, LUZ) ? 0 : 1) : luzEn(sombras, q, giro, sesgo));
  const z0 = zmax + 40;
  const tin = amb.tinte ?? [1, 1, 1];
  const luzAmb = amb.luz ?? 1;
  const ss = Math.max(1, esc.ss ?? CALIDAD), n2 = ss * ss;
  const media = norm(add(LUZ, VISTA, -1));
  const rebote: V3 = norm([-LUZ[0], -LUZ[1], 0.15]);
  const resp = esc.resplandor ? { ...esc.resplandor, rgb: rgb(esc.resplandor.color) } : null;
  // por sub-muestra: material, brillo, punto
  const sm: { mat: string; s: number; p: V3 }[] = [];
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const cand = grilla[Math.floor(py / G) * gw + Math.floor(px / G)];
    const i = (py * W + px) * 4;
    const giro = trama(px, py) * Math.PI * 2;
    sm.length = 0;
    let sombraPiso = 0, pisos = 0;
    for (let k = 0; k < n2; k++) {
      const sx = px + ((k % ss) + 0.5) / ss - ax, sy = py + (Math.floor(k / ss) + 0.5) / ss - ay;
      const S = 2 * (sy + KZ * z0), D = sx;
      const o: V3 = [(S + D) / 2, (S - D) / 2, z0];
      const hit = cand.length ? impacto(cand, o, VISTA) : null;
      if (!hit) {
        if (esc.sinSombra) continue;
        const t = o[2] / -VISTA[2];
        const g = add(o, VISTA, t);
        const lz = luzDe([g[0], g[1], 0.6], giro, 0.25);
        const oc = oclusion(alturas, g, UPZ);
        sombraPiso += borrador ? (1 - lz) * 0.47 : Math.min(0.78, (1 - lz) * 0.62 + oc * 0.42); pisos++;
        continue;
      }
      const matId = hit.mat ?? hit.p.mat;
      const m = MATERIALES[matId] ?? MATERIALES.piedra;
      const p = add(o, VISTA, hit.t);
      const n = hit.n;
      const tono = (hit.tono ?? 0) + (hit.p.tono ?? 0);
      let s: number;
      if (m.emite) {
        s = 0.8 + (fbm(p[0] * m.escala, p[1] * m.escala, p[2] * m.escala) - 0.5) * m.ruido + tono;
      } else {
        const dif = Math.max(0, dot(n, LUZ));
        const lz = dif > 0 ? luzDe(add(p, n, borrador ? 0.8 : 0.55), giro, 0.3 + 0.6 * (1 - dif)) : 0;
        const oc = borrador ? Math.max(0, 1 - Math.max(0, p[2]) / 10) * 0.5 : oclusion(alturas, p, n);
        const arriba = Math.max(0, n[2]);
        s = 0.17 + 0.64 * dif * (0.22 + 0.78 * lz) + 0.12 * arriba + 0.06 * Math.max(0, dot(n, rebote));
        if (m.brillo) s += m.brillo * Math.pow(Math.max(0, dot(n, media)), 12) * lz;
        s += (fbm(p[0] * m.escala, p[1] * m.escala, p[2] * m.escala) - 0.5) * m.ruido;
        if (m.patron) s += m.patron(p, n);
        s += tono;
        s *= 1 - 0.42 * oc;
        s *= luzAmb;
        if (resp) { const dd = Math.hypot(p[0] - resp.c[0], p[1] - resp.c[1], p[2] - resp.c[2]); s += Math.max(0, 1 - dd / resp.r) * 0.25; }
      }
      sm.push({ mat: matId, s, p });
    }
    if (sm.length * 2 < n2 || (n2 === 1 && !sm.length)) {
      if (pisos) { const a = Math.round((sombraPiso / n2) * 255); if (a > 6) { img.data[i] = 8; img.data[i + 1] = 6; img.data[i + 2] = 12; img.data[i + 3] = Math.min(200, a); } }
      continue;
    }
    // material mayoritario y brillo promedio de sus muestras
    let matId = sm[0].mat;
    if (sm.length > 1) { const cuenta = new Map<string, number>(); let best = 0; for (const q of sm) { const c = (cuenta.get(q.mat) ?? 0) + 1; cuenta.set(q.mat, c); if (c > best) { best = c; matId = q.mat; } } }
    let s = 0, nn = 0, p: V3 = sm[0].p;
    for (const q of sm) if (q.mat === matId) { s += q.s; if (!nn) p = q.p; nn++; }
    s /= nn;
    const m = MATERIALES[matId] ?? MATERIALES.piedra;
    const R = rampa(m, matId);
    // la rampa con 3 tonos intermedios entre cada par de colores (paleta de 256 de la época) y trama suave
    const SUB = 3, pos = Math.max(0, Math.min(0.999, s)) * (R.length - 1) * SUB + (trama(px, py) - 0.5) * 0.9;
    const kk = Math.max(0, Math.min((R.length - 1) * SUB, Math.round(pos))), k0 = Math.floor(kk / SUB), fr = (kk - k0 * SUB) / SUB;
    const ca = R[k0], cb = R[Math.min(R.length - 1, k0 + 1)];
    let r = ca[0] + (cb[0] - ca[0]) * fr, g = ca[1] + (cb[1] - ca[1]) * fr, b = ca[2] + (cb[2] - ca[2]) * fr;
    if (resp && !m.emite) { const dd = Math.hypot(p[0] - resp.c[0], p[1] - resp.c[1], p[2] - resp.c[2]); const f = Math.max(0, 1 - dd / resp.r) * 0.35; r += (resp.rgb[0] - r) * f; g += (resp.rgb[1] - g) * f; b += (resp.rgb[2] - b) * f; }
    if (!m.emite) { r *= tin[0]; g *= tin[1]; b *= tin[2]; }
    img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
  }
  return { img, ancla: [ax, ay] };
}
