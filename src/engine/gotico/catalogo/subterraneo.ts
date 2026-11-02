import type { Arma } from '../objeto';
import { MATERIALES } from '../materiales';
import { masa, hueso as huesoM, bulto, ruido, type Comp, type Pieza, type V3 } from '../render';
import { personaje, type Cuerpo, type Equipo } from '../cuerpo';
import type { Dir } from '../figura';

/**
 * Piezas y materiales que comparten los mundos de abajo (cueva2, mina y abismo). Este archivo no registra objetos:
 * solo arma rocas orgánicas, espeleotemas, cristales, cadenas, cuerdas, vigas labradas a mano, faroles, cadáveres
 * y la transformación de un grupo de piezas (girar, tumbar y mover un conjunto entero).
 */

// ------------------------------------------------------------------ materiales comunes
const M = MATERIALES;
/** Caliza húmeda: bandas de colada que corren hacia abajo y brillo de agua. */
M.sub_caliza = { rampa: ['#100f0d', '#1d1b17', '#2c2923', '#3d3930', '#504a3f', '#655d4f', '#7b7261', '#928874'], ruido: 0.38, escala: 0.15, brillo: 0.32, patron: (p) => Math.sin(p[2] * 0.55 + ruido(p[0] * 0.12, p[1] * 0.12, 5) * 7) * 0.05 + (ruido(p[0] * 0.5, p[1] * 0.5, p[2] * 0.06) - 0.5) * 0.12 };
/** Roca de cueva con estratos. */
M.sub_roca = { rampa: ['#0d0b09', '#191512', '#26201b', '#352d25', '#463b30', '#594b3d', '#6d5d4b'], ruido: 0.55, escala: 0.14, patron: (p) => (ruido(p[0] * 0.07, p[1] * 0.07, p[2] * 0.45) - 0.5) * 0.2 + (Math.sin(p[2] * 0.9 + ruido(p[0] * 0.05, p[1] * 0.05, 1) * 4) > 0.82 ? -0.08 : 0) };
M.sub_roca_humeda = { rampa: ['#0a0a0a', '#151514', '#22211e', '#302e29', '#403c35', '#524d43', '#665f52'], ruido: 0.5, escala: 0.15, brillo: 0.4, patron: (p) => (ruido(p[0] * 0.08, p[1] * 0.08, p[2] * 0.35) - 0.5) * 0.18 };
M.sub_tierra = { rampa: ['#0c0907', '#16110d', '#221a14', '#2f241b', '#3d2f23', '#4b3a2c'], ruido: 0.55, escala: 0.3 };
M.sub_cristal_azul = { rampa: ['#06101c', '#0c1d32', '#14304e', '#20476c', '#30628c', '#4a82ac', '#72a8ca', '#a8d0e6', '#e0f2fa'], ruido: 0.18, escala: 0.12, brillo: 0.95 };
M.sub_cristal_verde = { rampa: ['#05120b', '#0b2216', '#133522', '#1e4c31', '#2c6643', '#418459', '#62a678', '#94c8a0', '#d0f0d6'], ruido: 0.18, escala: 0.12, brillo: 0.95 };
M.sub_cristal_rojo = { rampa: ['#160406', '#2a070b', '#430c12', '#5e131a', '#7c1c23', '#9c2c30', '#c04a48', '#e08478', '#f8c8b8'], ruido: 0.18, escala: 0.12, brillo: 0.95 };
M.sub_luz_azul = { rampa: ['#0c2a4a', '#164476', '#2466a0', '#3c8ec8', '#6ab6e4', '#a8daf4', '#e4f6fe'], ruido: 0.35, escala: 0.25, emite: true };
M.sub_luz_verde = { rampa: ['#0a3220', '#125034', '#1e7048', '#369462', '#62bc86', '#a4e0b8', '#e2faea'], ruido: 0.35, escala: 0.25, emite: true };
M.sub_luz_roja = { rampa: ['#3a0608', '#600c0e', '#901818', '#c02c24', '#e45a40', '#f8987a', '#ffd8c8'], ruido: 0.35, escala: 0.25, emite: true };
M.sub_luz_ambar = { rampa: ['#4a2806', '#74420c', '#a06416', '#c88a26', '#e8b244', '#f8d880', '#fff4cc'], ruido: 0.35, escala: 0.25, emite: true };
M.sub_luz_violeta = { rampa: ['#1c0830', '#30104e', '#4a1a72', '#6a2c98', '#9050c0', '#bc88e0', '#e8ccfa'], ruido: 0.35, escala: 0.25, emite: true };
M.sub_hierro_viejo = { rampa: ['#0b0a09', '#171513', '#25211d', '#352f29', '#463e36', '#5a4f44', '#6f6253'], ruido: 0.45, escala: 0.45, brillo: 0.25 };
M.sub_madera_mina = { rampa: ['#110c08', '#1e150e', '#2d2015', '#3d2c1d', '#4f3a26', '#614931', '#74583d'], ruido: 0.22, escala: 0.35, patron: (p, n) => {
  // vetas a lo largo de la viga y nudos sueltos
  const u = Math.abs(n[2]) > 0.7 ? p[0] + p[1] : p[2];
  return (ruido(p[0] * 0.9 + p[1] * 0.9, u * 0.06, 2) - 0.5) * 0.28 + (ruido(p[0] * 0.25, p[1] * 0.25, p[2] * 0.25) > 0.8 ? -0.18 : 0);
} };
M.sub_cuerda = { rampa: ['#1c160d', '#2f2515', '#45371f', '#5c4a2b', '#745e38', '#8c7247'], ruido: 0.45, escala: 1.1, patron: (p) => (Math.sin((p[0] + p[1] + p[2]) * 2.2) > 0.3 ? 0.06 : -0.06) };
M.sub_telarana = { rampa: ['#3a3935', '#53514c', '#6d6a63', '#88847b', '#a39e94', '#bdb8ad'], ruido: 0.25, escala: 0.8 };
M.sub_vapor = { rampa: ['#2c2c30', '#3c3c42', '#505058', '#68686e', '#828288', '#a0a0a4'], ruido: 0.55, escala: 0.22, emite: true };

// ------------------------------------------------------------------ vectores
export const PI = Math.PI;
export const rad = (g: number) => (g * PI) / 180;
export const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
export const mez = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
/** Ciclo 0..1 y onda -1..1 de una animación de n cuadros. */
export const onda = (f: number, n: number, fase = 0) => Math.sin(((f % n) / n) * 2 * PI + fase);
/** Un azar entre lo y hi. */
export const entre = (a: Arma, lo: number, hi: number) => lo + a.r() * (hi - lo);
/** Una forma de entre n según la semilla (siempre el primer azar del armado para que todo lo demás varíe con ella). */
export const forma = (a: Arma, n: number) => Math.min(n - 1, Math.floor(a.r() * n));

/** Todo lo que quede bajo el piso no se ve (va al final: cava lo de antes). */
export const suelo = (a: Arma) => a.caja(0, 0, -80, 900, 900, 80, { mat: 'roca', resta: true });

// ------------------------------------------------------------------ transformar grupos de piezas
/** Matriz de giro (grados alrededor de z), luego tumbado `incl` grados alrededor del eje x local. */
export function giroMat(giro = 0, incl = 0, inclEje: 'x' | 'y' = 'x'): [V3, V3, V3] {
  const g = rad(giro), t = rad(incl), c = Math.cos(t), s = Math.sin(t);
  let ex: V3 = [Math.cos(g), Math.sin(g), 0], ey: V3 = [-Math.sin(g), Math.cos(g), 0], ez: V3 = [0, 0, 1];
  if (t) {
    if (inclEje === 'x') { const n = add(ey.map((v) => v * c) as V3, ez, s); ez = add(ez.map((v) => v * c) as V3, ey, -s); ey = n; }
    else { const n = add(ex.map((v) => v * c) as V3, ez, s); ez = add(ez.map((v) => v * c) as V3, ex, -s); ex = n; }
  }
  return [ex, ey, ez];
}
/** Mueve un grupo de piezas: cada punto local p va a o + ex*p.x + ey*p.y + ez*p.z. */
export function xform(ps: Pieza[], m: [V3, V3, V3], o: V3 = [0, 0, 0]): Pieza[] {
  const D = (v: V3): V3 => [m[0][0] * v[0] + m[1][0] * v[1] + m[2][0] * v[2], m[0][1] * v[0] + m[1][1] * v[1] + m[2][1] * v[2], m[0][2] * v[0] + m[1][2] * v[1] + m[2][2] * v[2]];
  const P = (v: V3): V3 => add(o, D(v));
  return ps.map((p): Pieza => {
    if (p.k === 'conv') return { ...p, pts: p.pts.map(P), planos: p.planos.map(([n, d]) => { const nn = D(n); return [nn, d + nn[0] * o[0] + nn[1] * o[1] + nn[2] * o[2]] as [V3, number]; }) };
    if (p.k === 'cono') return { ...p, o: P(p.o), ex: D(p.ex), ey: D(p.ey), ez: D(p.ez) };
    if (p.k === 'elip') return { ...p, c: P(p.c), ex: D(p.ex), ey: D(p.ey), ez: D(p.ez) };
    const comps = p.comps.map((q): Comp => (q.f === 'hueso' ? huesoM(P(q.a), P(q.b), q.r0, q.r1, { mat: q.mat, tono: q.tono, k: q.k }) : { ...q, c: P(q.c), sc: P(q.sc), ex: D(q.ex), ey: D(q.ey), ez: D(q.ez) }));
    return masa(comps, { mat: p.mat, tono: p.tono, suave: p.suave });
  });
}
export const mover = (ps: Pieza[], o: V3, giro = 0, incl = 0, inclEje: 'x' | 'y' = 'x') => xform(ps, giroMat(giro, incl, inclEje), o);

// ------------------------------------------------------------------ roca
/** Peña facetada: cáscara de puntos sobre un elipsoide (roca con caras, no una bola lisa). */
export function pena(a: Arma, x: number, y: number, z: number, rx: number, ry: number, rz: number, o: { mat: string; giro?: number; tono?: number; n?: number }): Pieza {
  const g = rad(o.giro ?? a.r() * 360), c = Math.cos(g), s = Math.sin(g);
  const loc: V3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (let i = 0; i < (o.n ?? 8); i++) { const th = a.r() * 2 * PI, w = a.r() * 2 - 1, q = Math.sqrt(1 - w * w); loc.push([Math.cos(th) * q, Math.sin(th) * q, w]); }
  const pts: V3[] = loc.map(([lx, ly, lz]) => { const k = 0.82 + a.r() * 0.18; const px = lx * rx * k, py = ly * ry * k; return [x + px * c - py * s, y + px * s + py * c, z + Math.max(-0.85, Math.min(0.75, lz)) * rz * k]; });
  return a.poliedro(pts, { mat: o.mat, tono: o.tono });
}
/** Piedritas sueltas alrededor de (x,y) en un radio R. */
export function piedras(a: Arma, ps: Pieza[], n: number, R: number, mat = 'sub_roca', x = 0, y = 0, s = 1) {
  for (let i = 0; i < n; i++) { const t = a.r() * 2 * PI, d = R * (0.4 + a.r() * 0.6), r = (1.3 + a.r() * 2.2) * s; ps.push(pena(a, x + Math.cos(t) * d, y + Math.sin(t) * d * 0.9, r * 0.25, r, r * 0.85, r * 0.65, { mat, tono: (a.r() - 0.5) * 0.14, n: 6 })); }
}
/**
 * Roca orgánica: bultos que se funden (sin facetas), un núcleo y lóbulos alrededor. `aplast` < 1 la achata; el
 * material pone el ruido y los estratos. Devuelve los componentes para fundirlos con otras cosas.
 */
export function rocaComps(a: Arma, c: V3, r: V3, o: { mat?: string; n?: number; tono?: number } = {}): Comp[] {
  const cs: Comp[] = [bulto(c, [r[0] * 0.8, r[1] * 0.8, r[2] * 0.8], { mat: o.mat, tono: o.tono, giro: a.r() * 360 })];
  const n = o.n ?? 5;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * 2 * PI + a.r() * 0.8, w = (a.r() - 0.35) * 0.9;
    const d: V3 = [Math.cos(t) * r[0] * 0.5, Math.sin(t) * r[1] * 0.5, w * r[2] * 0.55];
    const k = 0.45 + a.r() * 0.3;
    cs.push(bulto(add(c, d), [r[0] * k * (0.8 + a.r() * 0.4), r[1] * k * (0.8 + a.r() * 0.4), r[2] * k * (0.7 + a.r() * 0.4)], { mat: o.mat, tono: (o.tono ?? 0) + (a.r() - 0.5) * 0.08, giro: a.r() * 360 }));
  }
  return cs;
}
export const roca = (a: Arma, c: V3, r: V3, o: { mat: string; n?: number; tono?: number; suave?: number }) => masa(rocaComps(a, c, r, o), { mat: o.mat, suave: o.suave ?? Math.min(r[0], r[2]) * 0.35 + 1.5 });

/**
 * Espeleotema orgánico (estalagmita si `dir` = 1, estalactita colgando si `dir` = -1): huesos encadenados que se
 * afinan, con anillos de colada (bultos chatos) y una base derramada. Devuelve componentes para fundir en un grupo.
 */
export function espeleo(a: Arma, base: V3, h: number, r: number, o: { mat?: string; dir?: 1 | -1; curva?: number; anillos?: boolean; rota?: number } = {}): Comp[] {
  const dir = o.dir ?? 1, cs: Comp[] = [], mat = o.mat;
  const n = h > 45 ? 5 : h > 20 ? 4 : 3;
  const cx = (a.r() - 0.5) * (o.curva ?? 0.3), cy = (a.r() - 0.5) * (o.curva ?? 0.3);
  const corte = o.rota ? 1 - o.rota : 1;
  // la colada al pie (o la raíz en el techo)
  cs.push(bulto([base[0], base[1], base[2] + dir * r * 0.15], [r * 1.9, r * 1.7, r * 0.55], { mat, giro: a.r() * 180 }));
  let p: V3 = base, rp = r;
  for (let i = 1; i <= n; i++) {
    const f = (i / n) * corte, q: V3 = [base[0] + cx * h * f * f + (a.r() - 0.5) * r * 0.3, base[1] + cy * h * f * f + (a.r() - 0.5) * r * 0.3, base[2] + dir * h * f];
    const rq = Math.max(0.35, r * Math.pow(1 - f, 0.9) + (i === n && o.rota ? r * 0.25 : 0));
    cs.push(huesoM(p, q, rp, rq, { mat }));
    if (o.anillos !== false && i < n && rq > 1.6 && a.r() < 0.75) cs.push(bulto(q, [rq * 1.3, rq * 1.25, rq * 0.45], { mat, giro: a.r() * 180, k: 1.2 }));
    p = q; rp = rq;
  }
  return cs;
}
/** Prisma de cristal (seis caras y punta) desde `base` hacia `dir`. */
export function prisma(a: Arma, base: V3, dir: V3, largo: number, r: number, mat: string, tono = 0): Pieza {
  const d = norm(dir), t: V3 = Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0], u = norm(cross(t, d)), w = cross(d, u);
  const rot = a.r() * PI, pts: V3[] = [], ach = 0.75 + a.r() * 0.5;
  for (let k = 0; k < 6; k++) {
    const an = rot + (k * PI) / 3, ro = r * (k % 3 === 0 ? ach : 1), ox = (u[0] * Math.cos(an) + w[0] * Math.sin(an)) * ro, oy = (u[1] * Math.cos(an) + w[1] * Math.sin(an)) * ro, oz = (u[2] * Math.cos(an) + w[2] * Math.sin(an)) * ro;
    pts.push([base[0] + ox - d[0] * 2, base[1] + oy - d[1] * 2, base[2] + oz - d[2] * 2]);
    pts.push([base[0] + ox * 0.92 + d[0] * largo * 0.7, base[1] + oy * 0.92 + d[1] * largo * 0.7, base[2] + oz * 0.92 + d[2] * largo * 0.7]);
  }
  const off = (a.r() - 0.5) * r * 0.6;
  pts.push([base[0] + d[0] * largo + u[0] * off, base[1] + d[1] * largo + u[1] * off, base[2] + d[2] * largo + u[2] * off]);
  return a.poliedro(pts, { mat, tono });
}

// ------------------------------------------------------------------ madera, cuerda, cadena
/** Viga labrada a hacha entre dos puntos: sección de 8 lados irregulares (no una caja). */
export function viga(a: Arma, p: V3, q: V3, w: number, h = w, mat = 'sub_madera_mina', tono = 0): Pieza {
  const d = norm([q[0] - p[0], q[1] - p[1], q[2] - p[2]]);
  const t: V3 = Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0], u = norm(cross(t, d)), v = cross(d, u);
  const pts: V3[] = [];
  for (const e of [p, q]) for (let k = 0; k < 8; k++) {
    const an = (k / 8) * 2 * PI + PI / 8, ch = k % 2 ? 0.86 : 1;
    const su = Math.sign(Math.cos(an)) * w * 0.5 * (Math.abs(Math.cos(an)) > 0.5 ? 1 : 0.62) * ch * (0.92 + a.r() * 0.12);
    const sv = Math.sign(Math.sin(an)) * h * 0.5 * (Math.abs(Math.sin(an)) > 0.5 ? 1 : 0.62) * ch * (0.92 + a.r() * 0.12);
    pts.push([e[0] + u[0] * su + v[0] * sv, e[1] + u[1] * su + v[1] * sv, e[2] + u[2] * su + v[2] * sv]);
  }
  return a.poliedro(pts, { mat, tono: tono + (a.r() - 0.5) * 0.08 });
}
/** Cuerda que cuelga entre dos puntos con su comba. */
export function cuerda(a: Arma, ps: Pieza[], p: V3, q: V3, r = 0.6, comba = 4, n = 6, mat = 'sub_cuerda') {
  let prev = p;
  for (let i = 1; i <= n; i++) { const t = i / n, c = mez(p, q, t); c[2] -= Math.sin(t * PI) * comba; ps.push(a.palo(prev, c, r, { mat })); prev = c; }
}
/** Punto de una catenaria simple entre p y q (t 0..1). */
export const combaEn = (p: V3, q: V3, t: number, comba: number): V3 => { const c = mez(p, q, t); c[2] -= Math.sin(t * PI) * comba; return c; };
/**
 * Cadena de eslabones ovalados alternados (cada uno, seis barras con nudos) de p a q con comba. `L` es el largo del
 * eslabón; sirve igual para la cadena de una jaula que para las gigantes del abismo.
 */
export function cadena(a: Arma, ps: Pieza[], p: V3, q: V3, L: number, r: number, o: { mat?: string; comba?: number; desde?: number; hasta?: number } = {}) {
  const mat = o.mat ?? 'sub_hierro_viejo', comba = o.comba ?? 0;
  const largo = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
  const n = Math.max(1, Math.round(largo / (L * 0.78)));
  for (let i = Math.floor((o.desde ?? 0) * n); i < Math.ceil((o.hasta ?? 1) * n); i++) {
    const t0 = i / n, t1 = (i + 1) / n, c0 = combaEn(p, q, t0, comba), c1 = combaEn(p, q, t1, comba);
    const d = norm([c1[0] - c0[0], c1[1] - c0[1], c1[2] - c0[2]]), cen = mez(c0, c1, 0.5);
    const t: V3 = Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    let u = norm(cross(t, d));
    if (i % 2) u = cross(d, u);
    const W = L * 0.36, H = L * 0.5;
    const anillo: V3[] = [];
    for (let k = 0; k < 6; k++) { const an = (k / 6) * 2 * PI; anillo.push(add(add(cen, d, Math.cos(an) * H), u, Math.sin(an) * W)); }
    for (let k = 0; k < 6; k++) { ps.push(a.palo(anillo[k], anillo[(k + 1) % 6], r, { mat, tono: (a.r() - 0.5) * 0.1 })); ps.push(a.esfera(...anillo[k], r * 1.02, { mat })); }
  }
}

// ------------------------------------------------------------------ huesos y muertos
/** Calavera mirando hacia `giro` (45 = a la cámara). */
export function calavera(a: Arma, ps: Pieza[], x: number, y: number, z: number, s = 1, giro = 45, mat = 'hueso') {
  const g = rad(giro), fx = Math.cos(g), fy = Math.sin(g), sx = -fy, sy = fx;
  ps.push(masa([bulto([x, y, z + 3.6 * s], [3.9 * s, 3.3 * s, 3.4 * s], { giro }), bulto([x + fx * 2.3 * s, y + fy * 2.3 * s, z + 1.6 * s], [1.9 * s, 2.3 * s, 1.6 * s], { giro })], { mat, suave: 1.2 * s }));
  for (const l of [-1, 1]) ps.push(a.esfera(x + fx * 3 * s + sx * l * 1.4 * s, y + fy * 3 * s + sy * l * 1.4 * s, z + 4 * s, 1.15 * s, { mat: 'negro' }));
  ps.push(a.esfera(x + fx * 3.7 * s, y + fy * 3.7 * s, z + 2.4 * s, 0.65 * s, { mat: 'negro' }));
}
/** Hueso largo con sus nudos. */
export function huesoL(a: Arma, ps: Pieza[], p: V3, q: V3, r = 1.1, mat = 'hueso') {
  ps.push(masa([huesoM(p, q, r, r * 0.9), bulto(p, [r * 1.6, r * 1.3, r * 1.3], { eje: [q[0] - p[0], q[1] - p[1], q[2] - p[2]] }), bulto(q, [r * 1.5, r * 1.25, r * 1.25], { eje: [q[0] - p[0], q[1] - p[1], q[2] - p[2]] })], { mat, suave: r * 0.8, tono: (a.r() - 0.5) * 0.1 }));
}
/** Llama de antorcha o farol (tres lenguas que se mueven con el cuadro). */
export function llama(a: Arma, ps: Pieza[], x: number, y: number, z: number, f: number, n: number, e = 1, mat = 'fuego') {
  for (let k = 0; k < 3; k++) {
    const an = (k / 3) * 2 * PI + f * 0.9, fr = Math.sin((f / n) * 2 * PI + k * 2.1);
    ps.push(a.cilindro(x + Math.cos(an) * 1.1 * e, y + Math.sin(an) * 1.1 * e, z, (2.6 - k * 0.5) * e, (7 + fr * 2 + k * 2) * e, { mat, r1: 0.25 }));
  }
  ps.push(a.elipsoide(x, y, z + 1.2 * e, 3 * e, 3 * e, 2.2 * e, { mat, tono: 0.2 }));
}
/**
 * Farol de hierro colgado de su asa en `top` (lo de arriba del asa): jaula de cuatro barrotes, techito y la luz
 * adentro que tiembla con el cuadro. Devuelve el centro de la luz.
 */
export function farol(a: Arma, ps: Pieza[], top: V3, f: number, o: { luz?: string; apagado?: boolean; s?: number; mat?: string } = {}): V3 {
  const s = o.s ?? 1, mat = o.mat ?? 'sub_hierro_viejo', [x, y, z] = top;
  ps.push(a.palo([x, y, z], [x, y, z - 2.5 * s], 0.35 * s, { mat }));
  ps.push(a.cilindro(x, y, z - 5.4 * s, 3.4 * s, 2.6 * s, { mat, r1: 0.7 * s }));
  ps.push(a.cilindro(x, y, z - 13.2 * s, 3 * s, 1.2 * s, { mat, r1: 2.8 * s }));
  for (let k = 0; k < 4; k++) { const an = (k / 4) * 2 * PI + PI / 4; ps.push(a.palo([x + Math.cos(an) * 2.4 * s, y + Math.sin(an) * 2.4 * s, z - 12 * s], [x + Math.cos(an) * 2.6 * s, y + Math.sin(an) * 2.6 * s, z - 5.3 * s], 0.42 * s, { mat })); }
  const c: V3 = [x, y, z - 8.6 * s];
  if (o.apagado) ps.push(a.cilindro(x, y, z - 12 * s, 1.1 * s, 2.5 * s, { mat: 'cera', tono: -0.2 }));
  else {
    const t = Math.sin(f * 2.3) * 0.08;
    ps.push(a.elipsoide(x, y, z - 8.8 * s, 2.1 * s, 2.1 * s, 3 * s, { mat: o.luz ?? 'luz_vela', tono: t }));
    ps.push(a.cilindro(x, y, z - 12 * s, 0.9 * s, 1.8 * s, { mat: 'cera' }));
  }
  return c;
}
/** Cadáver de alguien que murió aquí: el cuerpo de cuerpo.ts en el último cuadro de morir, girado y movido. */
export function cadaver(cu: Cuerpo, eq: Equipo, dir: Dir, o: V3 = [0, 0, 0], giro = 0, cuadro = 7): Pieza[] {
  return mover(personaje(cu, eq, dir, 'morir', cuadro), o, giro);
}
