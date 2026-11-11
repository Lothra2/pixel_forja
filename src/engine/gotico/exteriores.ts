import { MATERIALES } from './materiales';
import { ruido, hueso, bulto, masa, girarPiezas, type Comp, type Pieza, type V3 } from './render';
import type { Arma } from './objeto';
import './cuerpo';

/**
 * Herramientas compartidas por los exteriores de los actos 1 a 3 (páramo, desierto y selva): suelo orgánico con matas
 * y guijarros, peñas de masa con musgo fundido, agua con gotas de lluvia, fuego, velas y humo, cadáveres tumbados
 * (los cuerpos articulados en el último cuadro de morir), cuervos y buitres de masa, cráneos, costillares, tablas
 * gastadas y telas que ondean. Todo se arma con la semilla del elemento (`a.r()`), así ninguna copia sale igual.
 */

// ------------------------------------------------------------------ materiales de los exteriores
const M = MATERIALES;
/** Grieta: el ruido "de cresta" (|ruido - 0.5| chico) traza líneas finas que se cortan como piedra partida. */
const grieta = (p: V3, k: number, ancho = 0.035) => Math.abs(ruido(p[0] * k + p[2] * k * 0.3, p[1] * k - p[2] * k * 0.2, p[2] * k * 0.25 + 3.3) - 0.5) < ancho * 0.8 && ruido(p[0] * k * 0.4 + 9, p[1] * k * 0.4, p[2] * k * 0.4) > 0.5;
M.ext_roca = {
  rampa: ['#0f0f0e', '#1c1b19', '#2b2926', '#3c3934', '#4f4b44', '#635e55', '#787166', '#8d8576'], ruido: 0.4, escala: 0.16,
  patron: (p) => (grieta(p, 0.11) ? -0.32 : 0) + (grieta(p, 0.27, 0.03) ? -0.16 : 0) + (ruido(p[0] * 0.05, p[1] * 0.05, p[2] * 0.05) - 0.5) * 0.3 + (ruido(p[0] * 0.9, p[1] * 0.9, p[2] * 0.9) > 0.8 ? 0.1 : 0),
};
M.ext_roca_fria = {
  rampa: ['#0c0d0e', '#16181a', '#212427', '#2d3133', '#3a3f41', '#484d4f', '#575c5d', '#676b6b'], ruido: 0.42, escala: 0.16,
  patron: (p) => (grieta(p, 0.12) ? -0.3 : 0) + (ruido(p[0] * 0.05, p[1] * 0.05, p[2] * 0.06) - 0.5) * 0.32 + (ruido(p[0] * 1.1, p[1] * 1.1, p[2] * 1.1) > 0.82 ? 0.12 : 0),
};
/** Arenisca erosionada: estratos horizontales que ondulan, con vetas más claras y grietas. */
M.ext_estratos = {
  rampa: ['#1d120b', '#2f1e12', '#442c1a', '#5b3c24', '#734e2f', '#8b613b', '#a37549', '#b98a5a'], ruido: 0.3, escala: 0.18,
  patron: (p) => { const z = p[2] + (ruido(p[0] * 0.06, p[1] * 0.06, 3) - 0.5) * 8; const b = ruido(z * 0.4, p[1] * 0.02, 9); return (b > 0.7 ? 0.1 : b < 0.25 ? -0.12 : 0) + (grieta(p, 0.12) ? -0.22 : 0); },
};
M.ext_estratos_rojos = {
  rampa: ['#150b08', '#24130e', '#351d15', '#47281d', '#593426', '#6b4131', '#7e4f3c', '#905e48'], ruido: 0.32, escala: 0.18,
  patron: (p) => { const z = p[2] + (ruido(p[0] * 0.05, p[1] * 0.05, 7) - 0.5) * 9; const b = ruido(z * 0.35, p[0] * 0.02, 4); return (b > 0.7 ? 0.08 : b < 0.25 ? -0.1 : 0) + (grieta(p, 0.1) ? -0.22 : 0); },
};
/** Musgo húmedo en matas: manchas claras y huecos oscuros. */
M.ext_musgo = {
  rampa: ['#0a0f08', '#131c0f', '#1d2915', '#28371c', '#344623', '#41552b', '#4f6434'], ruido: 0.55, escala: 0.6,
  patron: (p) => (ruido(p[0] * 0.45, p[1] * 0.45, p[2] * 0.45) > 0.66 ? 0.12 : 0) + (ruido(p[0] * 1.3, p[1] * 1.3, p[2] * 1.3) < 0.28 ? -0.18 : 0),
};
M.ext_liquen = { rampa: ['#24251c', '#383929', '#4d4e37', '#626245', '#787654', '#8d8a65'], ruido: 0.5, escala: 0.9, patron: (p) => (ruido(p[0] * 1.6, p[1] * 1.6, p[2] * 1.6) > 0.6 ? 0.15 : -0.05) };
M.ext_tierra = {
  rampa: ['#0b0a08', '#15130f', '#201c16', '#2b261e', '#373027', '#433b30', '#50473a'], ruido: 0.5, escala: 0.3,
  patron: (p) => (ruido(p[0] * 0.12, p[1] * 0.12, 1) - 0.5) * 0.3 + (ruido(p[0] * 1.4, p[1] * 1.4, 2) > 0.78 ? 0.12 : 0),
};
/** Barro mojado: oscuro y con brillo de lluvia. */
M.ext_barro = { rampa: ['#0a0806', '#14100c', '#1f1812', '#2a2118', '#362b1f', '#433527'], ruido: 0.35, escala: 0.25, brillo: 0.55, patron: (p) => (ruido(p[0] * 0.2, p[1] * 0.2, 4) - 0.5) * 0.3 };
M.ext_agua_lluvia = { rampa: ['#050607', '#0a0d10', '#101519', '#171e23', '#1f272d', '#283138', '#343d44', '#48525a'], ruido: 0.18, escala: 0.12, brillo: 0.9, patron: (p) => (ruido(p[0] * 0.15, p[1] * 0.15, 9) - 0.5) * 0.25 };
M.ext_espuma = { rampa: ['#262b2e', '#394044', '#4e575b', '#657074', '#7e898c', '#99a2a4'], ruido: 0.4, escala: 0.6, brillo: 0.4 };
M.ext_sangre = { rampa: ['#0b0202', '#160404', '#230706', '#310b09', '#3f100c', '#4e1610'], ruido: 0.3, escala: 0.4, brillo: 0.45 };
M.ext_pasto = {
  rampa: ['#0c1009', '#151c0f', '#1f2915', '#2a361b', '#364322', '#43512a', '#516033'], ruido: 0.45, escala: 0.8,
  patron: (p) => (ruido(p[0] * 0.3, p[1] * 0.3, p[2] * 0.6) - 0.5) * 0.3,
};
M.ext_pasto_seco = { rampa: ['#17120b', '#271f12', '#3a2e1a', '#4d3e23', '#614e2d', '#755f38', '#8a7144'], ruido: 0.45, escala: 0.8, patron: (p) => (ruido(p[0] * 0.3, p[1] * 0.3, p[2] * 0.6) - 0.5) * 0.3 };
M.ext_brezo = { rampa: ['#0f0a0f', '#1a111a', '#271a27', '#352335', '#432d43', '#523852', '#614461'], ruido: 0.6, escala: 0.9, patron: (p) => (ruido(p[0] * 0.8, p[1] * 0.8, p[2] * 0.8) > 0.65 ? 0.14 : 0) };
M.ext_brezo_flor = { rampa: ['#170e18', '#241626', '#332035', '#422a44', '#523553', '#624163', '#724e72'], ruido: 0.55, escala: 1.1, patron: (p) => (ruido(p[0] * 1.2, p[1] * 1.2, p[2] * 1.2) > 0.6 ? 0.12 : -0.04) };
M.ext_aulaga = { rampa: ['#2a1f06', '#43320a', '#5e4710', '#7a5d17', '#94731f', '#ab8829'], ruido: 0.55, escala: 1.2 };
M.ext_madera_gris = {
  rampa: ['#100f0d', '#1c1a17', '#2a2722', '#39352e', '#49443b', '#5a5449', '#6b6457', '#7c7465'], ruido: 0.22, escala: 0.35,
  patron: (p, n) => { const u = Math.abs(n[2]) > 0.7 ? p[0] + p[1] : p[2]; const v = Math.abs(n[0]) > Math.abs(n[1]) ? p[1] : p[0]; return (ruido(v * 0.6, u * 0.06, 3) - 0.5) * 0.35 + (grieta([v, u * 0.15, 1], 0.5, 0.03) ? -0.25 : 0); },
};
M.ext_madera_podrida = {
  rampa: ['#0c0907', '#16110c', '#221a12', '#2e2318', '#3b2e20', '#493928', '#574531'], ruido: 0.4, escala: 0.4,
  patron: (p) => (ruido(p[0] * 0.5, p[1] * 0.5, p[2] * 0.12) - 0.5) * 0.4 + (ruido(p[0] * 0.2, p[1] * 0.2, p[2] * 0.2) > 0.72 ? -0.2 : 0),
};
M.ext_carbon = {
  rampa: ['#050404', '#0c0a09', '#141110', '#1d1917', '#27221f', '#322c28'], ruido: 0.45, escala: 0.4,
  patron: (p) => (grieta(p, 0.35, 0.05) ? -0.3 : 0) + (ruido(p[0] * 0.6, p[1] * 0.6, p[2] * 0.6) > 0.75 ? 0.15 : 0),
};
/** Brasas en las grietas del carbón (brillan solas). */
M.ext_brasa = { rampa: ['#3a0804', '#6a1606', '#a02c0a', '#d04e12', '#f07e22'], ruido: 0.5, escala: 0.4, emite: true };
/** Humo: brilla apenas por sí mismo (no se sombrea ni hace sombra), gris oscuro con ruido. */
M.ext_humo = { rampa: ['#141312', '#1d1c1a', '#272523', '#312f2c', '#3c3936', '#47443f'], ruido: 0.5, escala: 0.25, emite: true };
M.ext_ceniza = { rampa: ['#141312', '#201e1c', '#2d2a27', '#3b3733', '#4a4540', '#59534d'], ruido: 0.5, escala: 0.4 };
M.ext_pluma = { rampa: ['#040405', '#08080b', '#0e0e13', '#15151c', '#1e1e27', '#2a2a35', '#383a46'], ruido: 0.3, escala: 1.2, brillo: 0.55 };
M.ext_pluma_parda = { rampa: ['#0b0806', '#16100b', '#221811', '#2f2118', '#3d2b1f', '#4c3727', '#5c4431'], ruido: 0.4, escala: 1.1, brillo: 0.2 };
M.ext_piel_buitre = { rampa: ['#1d0e0c', '#331813', '#4a231b', '#623025', '#7a3e30', '#93503e'], ruido: 0.3, escala: 0.7 };
M.ext_pico = { rampa: ['#141008', '#2a2212', '#45381d', '#62512b', '#7f6b3a', '#9c864b'], ruido: 0.2, escala: 0.6, brillo: 0.3 };
M.ext_hueso = {
  rampa: ['#1c1a15', '#2f2b22', '#454030', '#5e5741', '#787055', '#928a6c', '#aaa285', '#bfb89e'], ruido: 0.25, escala: 0.6,
  patron: (p) => (ruido(p[0] * 0.5, p[1] * 0.5, p[2] * 0.5) > 0.7 ? -0.12 : 0) + (grieta(p, 0.6, 0.025) ? -0.2 : 0),
};
M.ext_cuero_seco = { rampa: ['#120a07', '#20120c', '#2f1b12', '#3e2519', '#4e3021', '#5f3c2a', '#704a35'], ruido: 0.4, escala: 0.5, brillo: 0.15, patron: (p) => (grieta(p, 0.4, 0.04) ? -0.2 : 0) };
M.ext_carne_seca = { rampa: ['#140505', '#240a09', '#36100d', '#491712', '#5c1f18', '#6f291f'], ruido: 0.45, escala: 0.6, brillo: 0.3 };
M.ext_tela_sucia = { rampa: ['#15120f', '#221e19', '#312b23', '#40382e', '#50463a', '#615546', '#726453'], ruido: 0.3, escala: 0.25, patron: (p) => (ruido(p[0] * 0.15, p[1] * 0.15, p[2] * 0.15) > 0.68 ? -0.18 : 0) };
M.ext_hierro = { rampa: ['#0b0a09', '#171513', '#25211d', '#342e28', '#453c33', '#574b3f', '#6a5b4c'], ruido: 0.45, escala: 0.5, brillo: 0.25, patron: (p) => (ruido(p[0] * 0.7, p[1] * 0.7, p[2] * 0.7) > 0.68 ? 0.12 : 0) };

// ------------------------------------------------------------------ vectores y azar
export type V = V3;
export const PI2 = Math.PI * 2;
export const az = (a: Arma, k = 1) => (a.r() - 0.5) * 2 * k;
export const entre = (a: Arma, x: number, y: number) => x + (y - x) * a.r();
export const elegir = <T,>(a: Arma, xs: T[]): T => xs[Math.floor(a.r() * xs.length) % xs.length];
export const mas = (p: V, q: V, k = 1): V => [p[0] + q[0] * k, p[1] + q[1] * k, p[2] + q[2] * k];
export const mez = (p: V, q: V, t: number): V => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
export const nrm = (v: V): V => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
export const cruz = (p: V, q: V): V => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
export const dist = (p: V, q: V) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
export const grad = (r: number) => (r * 180) / Math.PI;
export const rad = (g: number) => (g * Math.PI) / 180;
/** Punto en el plano a `d` del centro hacia el ángulo `g` (radianes). */
export const polar = (g: number, d: number, z = 0, c: V = [0, 0, 0]): V => [c[0] + Math.cos(g) * d, c[1] + Math.sin(g) * d, c[2] + z];
/** Dirección al azar en la media esfera de arriba (z >= zmin). */
export function dirAzar(a: Arma, zmin = 0): V {
  const g = a.r() * PI2, z = zmin + (1 - zmin) * a.r(), s = Math.sqrt(1 - z * z);
  return [Math.cos(g) * s, Math.sin(g) * s, z];
}
/** Ejes ortonormales con x a lo largo de `d` (para bultos girados a mano). */
export function ejesDe(d: V, giro = 0): [V, V, V] {
  const x = nrm(d), up: V = Math.abs(x[2]) > 0.95 ? [1, 0, 0] : [0, 0, 1];
  let y = nrm(cruz(up, x)), z = cruz(x, y);
  if (giro) { const c = Math.cos(giro), s = Math.sin(giro); const y2: V = mas(mas([0, 0, 0], y, c), z, s), z2: V = mas(mas([0, 0, 0], z, c), y, -s); y = y2; z = z2; }
  return [x, y, z];
}

// ------------------------------------------------------------------ mover piezas
function trasladar(p: Pieza, d: V): Pieza {
  const T = (v: V): V => [v[0] + d[0], v[1] + d[1], v[2] + d[2]];
  if (p.k === 'conv') return { ...p, planos: p.planos.map(([n, k]) => [n, k + n[0] * d[0] + n[1] * d[1] + n[2] * d[2]] as [V, number]), pts: p.pts.map(T) };
  if (p.k === 'cono') return { ...p, o: T(p.o) };
  if (p.k === 'elip') return { ...p, c: T(p.c) };
  const comps = p.comps.map((q): Comp => (q.f === 'hueso' ? hueso(T(q.a), T(q.b), q.r0, q.r1, { mat: q.mat, tono: q.tono, k: q.k, rx: q.rx }) : { ...q, c: T(q.c), sc: T(q.sc) }));
  return masa(comps, { mat: p.mat, tono: p.tono, suave: p.suave });
}
/** Las piezas giradas `giro` grados alrededor de la vertical y corridas a `d`. */
export function mover(ps: Pieza[], d: V, giro = 0): Pieza[] {
  const r = giro ? girarPiezas(ps, giro) : ps;
  return d[0] || d[1] || d[2] ? r.map((p) => trasladar(p, d)) : r;
}
/** Centro en el piso de un grupo de piezas (promedio de sus centros). */
export function centroDe(ps: Pieza[]): V {
  let x = 0, y = 0, n = 0;
  for (const p of ps) {
    const c: V = p.k === 'masa' ? [p.esf[0], p.esf[1], 0] : p.k === 'elip' ? p.c : p.k === 'cono' ? p.o : p.pts.reduce((s, q) => mas(s, q, 1 / p.pts.length), [0, 0, 0] as V);
    const w = p.k === 'masa' ? 4 : 1;
    x += c[0] * w; y += c[1] * w; n += w;
  }
  return n ? [x / n, y / n, 0] : [0, 0, 0];
}

// ------------------------------------------------------------------ suelo
export interface OpcSuelo { mat?: string; matas?: number; pasto?: string; piedras?: number; matPiedra?: string; giro?: number; manchas?: number; alto?: number; hojas?: string }
/** Mancha de suelo irregular (varias capas chatas con tonos distintos), con matas de pasto y guijarros. */
export function suelo(a: Arma, ps: Pieza[], rx: number, ry: number, o: OpcSuelo = {}) {
  const mat = o.mat ?? 'ext_tierra', g = o.giro ?? a.r() * 180, h = o.alto ?? 1.3;
  ps.push(a.elipsoide(az(a, rx * 0.06), az(a, ry * 0.06), -0.4, rx, ry, h, { mat, giro: g, tono: -0.03 }));
  const n = o.manchas ?? 3;
  for (let i = 0; i < n; i++) {
    const t = a.r() * PI2, d = 0.35 + a.r() * 0.45;
    ps.push(a.elipsoide(Math.cos(t) * rx * d, Math.sin(t) * ry * d, -0.3, rx * (0.3 + a.r() * 0.25), ry * (0.3 + a.r() * 0.25), h * (0.9 + a.r() * 0.3), { mat, giro: a.r() * 180, tono: az(a, 0.07) }));
  }
  const nm = o.matas ?? 3;
  for (let i = 0; i < nm; i++) { const t = a.r() * PI2, d = 0.55 + a.r() * 0.45; mata(a, ps, Math.cos(t) * rx * d, Math.sin(t) * ry * d, 4 + Math.floor(a.r() * 4), 4 + a.r() * 5, o.pasto ?? 'ext_pasto'); }
  const np = o.piedras ?? 2;
  for (let i = 0; i < np; i++) { const t = a.r() * PI2, d = 0.4 + a.r() * 0.6, s = 1.2 + a.r() * 2.2; guijarro(a, ps, Math.cos(t) * rx * d, Math.sin(t) * ry * d, s, o.matPiedra ?? 'ext_roca'); }
  if (o.hojas) for (let i = 0; i < 5; i++) { const t = a.r() * PI2, d = a.r(); ps.push(a.elipsoide(Math.cos(t) * rx * d, Math.sin(t) * ry * d, 0.5, 2 + a.r() * 1.5, 1.4, 0.5, { mat: o.hojas, giro: a.r() * 180, tono: az(a, 0.1) })); }
}
/** Mata de pasto: hojas finas (conos) que se abren desde un punto. */
export function mata(a: Arma, ps: Pieza[], x: number, y: number, n: number, alto: number, mat = 'ext_pasto', z = 0) {
  for (let i = 0; i < n; i++) {
    const g = a.r() * PI2, inc = 0.2 + a.r() * 0.55, h = alto * (0.55 + a.r() * 0.6);
    ps.push(a.cilindro(x + az(a, 1.5), y + az(a, 1.5), z - 0.3, 0.75 + a.r() * 0.35, h, { mat, r1: 0, eje: [Math.cos(g) * inc, Math.sin(g) * inc, 1], tono: az(a, 0.12) }));
  }
}
/** Guijarro: cáscara de unos pocos puntos (barato). */
export function guijarro(a: Arma, ps: Pieza[], x: number, y: number, s: number, mat = 'ext_roca', z = -0.3) {
  const pts: V[] = [];
  for (let i = 0; i < 7; i++) { const t = (i / 7) * PI2 + az(a, 0.3), k = 0.75 + a.r() * 0.3; pts.push([x + Math.cos(t) * s * k, y + Math.sin(t) * s * 0.8 * k, z]); }
  for (let i = 0; i < 4; i++) { const t = a.r() * PI2, k = a.r() * 0.6; pts.push([x + Math.cos(t) * s * k, y + Math.sin(t) * s * k * 0.8, z + s * (0.45 + a.r() * 0.35)]); }
  ps.push(a.poliedro(pts, { mat, tono: az(a, 0.06) }));
}

// ------------------------------------------------------------------ peñas orgánicas
export interface OpcPena { mat?: string; musgo?: number; matMusgo?: string; liquen?: number; giro?: number; suave?: number; n?: number; losa?: number; hunde?: number; tono?: number; extra?: Comp[] }
/**
 * Peña: masa de un núcleo y lajas (bultos aplastados en direcciones al azar) que se funden con unión corta, así salen
 * caras casi planas y pliegues; el musgo y el liquen son componentes de la misma masa con su material y crecen en lo
 * alto (donde cae la lluvia). Devuelve los componentes por si hay que agregar algo.
 */
export function pena(a: Arma, ps: Pieza[], c: V, r: V, o: OpcPena = {}): Comp[] {
  const g = o.giro ?? a.r() * 360, cg = Math.cos(rad(g)), sg = Math.sin(rad(g));
  const L = (x: number, y: number, z: number): V => [c[0] + x * cg - y * sg, c[1] + x * sg + y * cg, c[2] + z];
  const R = (d: V): V => [d[0] * cg - d[1] * sg, d[0] * sg + d[1] * cg, d[2]];
  const hunde = o.hunde ?? 0.25, z0 = -r[2] * hunde;
  // núcleo chico y torcido: lo que manda en la silueta son las lajas
  const comps: Comp[] = [bulto(L(az(a, r[0] * 0.1), az(a, r[1] * 0.1), z0 + r[2] * 0.45), [r[0] * 0.62, r[1] * 0.6, r[2] * 0.5], { giro: g + az(a, 25), incl: az(a, 10) })];
  const n = o.n ?? 6, losa = o.losa ?? 0.38;
  // la cara de arriba: una laja casi horizontal que deja el tope plano y algo inclinado
  {
    const d = nrm([az(a, 0.35), az(a, 0.35), 1]);
    comps.push(bulto(L(az(a, r[0] * 0.15), az(a, r[1] * 0.15), z0 + r[2] * 0.82), [r[0] * 0.62, r[1] * 0.58, r[2] * losa * 0.55], { ejes: [R(nrm(cruz(d, [0, 1, 0]))), R(nrm(cruz([1, 0, 0], d))), R(d)], tono: 0.03 }));
  }
  for (let i = 0; i < n; i++) {
    const t = (i / n) * PI2 + az(a, 0.5), el = -0.05 + a.r() * 0.7, ce = Math.cos(el);
    const d: V = [Math.cos(t) * ce, Math.sin(t) * ce, Math.sin(el)];
    const k = 0.5 + a.r() * 0.12;
    const p = L(d[0] * r[0] * k, d[1] * r[1] * k, z0 + r[2] * 0.4 + d[2] * r[2] * 0.45);
    const s = 0.5 + a.r() * 0.3;
    // la laja: aplastada a lo largo de su normal (cara casi plana hacia afuera), alta y ancha
    const dn = nrm(R([d[0] + az(a, 0.3), d[1] + az(a, 0.3), d[2] * 0.6 + az(a, 0.2)]));
    const [ex, ey, ez] = ejesDe(dn, az(a, 0.5));
    comps.push(bulto(p, [Math.min(r[0], r[1]) * losa * s, Math.max(r[0], r[1]) * s * 0.75, r[2] * s * 0.75], { ejes: [ex, ey, ez], tono: az(a, 0.06) }));
  }
  if (o.extra) comps.push(...o.extra);
  const top = z0 + r[2] * 0.95;
  // musgo y liquen: arriba y del lado de la lluvia
  const nm = Math.round((o.musgo ?? 0) * 6);
  for (let i = 0; i < nm; i++) {
    const t = a.r() * PI2, d = a.r() * 0.55;
    const p = L(Math.cos(t) * d * r[0], Math.sin(t) * d * r[1], top - d * d * r[2] * 0.9);
    comps.push(bulto(p, [r[0] * (0.22 + a.r() * 0.2), r[1] * (0.2 + a.r() * 0.18), Math.max(1, r[2] * 0.1)], { mat: o.matMusgo ?? 'ext_musgo', giro: a.r() * 180, incl: az(a, 20), k: 0.9, tono: az(a, 0.06) }));
  }
  const nl = Math.round((o.liquen ?? 0) * 7);
  for (let i = 0; i < nl; i++) {
    const t = a.r() * PI2, el = a.r() * 0.9;
    const p = L(Math.cos(t) * Math.cos(el) * r[0] * 0.7, Math.sin(t) * Math.cos(el) * r[1] * 0.7, z0 + r[2] * 0.4 + Math.sin(el) * r[2] * 0.5);
    comps.push(bulto(p, [1.4 + a.r() * 2.2, 1.4 + a.r() * 2.2, 0.8], { mat: 'ext_liquen', eje: R([Math.cos(t), Math.sin(t), 0]), k: 0.4 }));
  }
  ps.push(masa(comps, { mat: o.mat ?? 'ext_roca', suave: o.suave ?? 1.4, tono: o.tono }));
  return comps;
}
/** Grupo de peñas con piedras chicas alrededor: la grande primero y las otras arrimadas. */
export function grupoPenas(a: Arma, ps: Pieza[], R: number, n: number, o: OpcPena & { alto?: number } = {}) {
  const alto = o.alto ?? 0.8;
  pena(a, ps, [0, 0, 0], [R, R * (0.7 + a.r() * 0.25), R * alto * (0.8 + a.r() * 0.4)], o);
  for (let i = 1; i < n; i++) {
    const t = a.r() * PI2, d = R * (0.8 + a.r() * 0.5), s = R * (0.3 + a.r() * 0.35);
    pena(a, ps, [Math.cos(t) * d, Math.sin(t) * d, 0], [s, s * (0.7 + a.r() * 0.3), s * alto * (0.7 + a.r() * 0.5)], { ...o, n: 3, musgo: (o.musgo ?? 0) * 0.6, liquen: (o.liquen ?? 0) * 0.6 });
  }
}

// ------------------------------------------------------------------ agua
/** Disco plano de borde irregular (agua, barro, sangre): un prisma bajo, sin el bulto de un elipsoide. */
export function disco(a: Arma, ps: Pieza[], x: number, y: number, z: number, rx: number, ry: number, h: number, mat: string, o: { giro?: number; tono?: number; ruido?: number; n?: number } = {}) {
  const g = rad(o.giro ?? 0), n = o.n ?? 14, pts: V[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * PI2, k = 1 + az(a, o.ruido ?? 0.1), lx = Math.cos(t) * rx * k, ly = Math.sin(t) * ry * k;
    const px = x + lx * Math.cos(g) - ly * Math.sin(g), py = y + lx * Math.sin(g) + ly * Math.cos(g);
    pts.push([px, py, z], [x + (px - x) * 0.96, y + (py - y) * 0.96, z + h]);
  }
  ps.push(a.poliedro(pts, { mat, tono: o.tono }));
}
/**
 * Charco con borde de barro y gotas de lluvia: anillos que se abren y se apagan con el cuadro (de `n` cuadros). Los
 * anillos son un óvalo claro con el agua encima, así queda solo el borde.
 */
export function charco(a: Arma, ps: Pieza[], rx: number, ry: number, f: number, n: number, o: { mat?: string; gotas?: number; borde?: string; giro?: number; z?: number } = {}) {
  const g = o.giro ?? a.r() * 180, mat = o.mat ?? 'ext_agua_lluvia', z = o.z ?? 0.2;
  disco(a, ps, 0, 0, -0.4, rx + 3.5, ry + 3, 0.9 + z, o.borde ?? 'ext_barro', { giro: g, ruido: 0.14 });
  disco(a, ps, az(a, 1), az(a, 1), -0.3, rx, ry, 1 + z, mat, { giro: g, ruido: 0.12, n: 16 });
  const top = 0.7 + z;
  const k = o.gotas ?? 3;
  for (let i = 0; i < k; i++) {
    // cada gota con su fase y su lugar (fijo para la semilla)
    const t = a.r() * PI2, d = Math.sqrt(a.r()) * 0.65, fase = a.r();
    const x = Math.cos(t) * rx * d, y = Math.sin(t) * ry * d;
    const u = ((f / n + fase) % 1), R = 0.6 + u * 4.5;
    if (u > 0.85) continue;
    ps.push(a.elipsoide(x, y, top, R + 0.55, (R + 0.55) * 0.9, 0.12, { mat: 'ext_espuma', tono: -0.1 - u * 0.35 }));
    ps.push(a.elipsoide(x, y, top + 0.06, R, R * 0.9, 0.12, { mat, tono: 0.04 }));
    if (u < 0.2) ps.push(a.esfera(x, y, top + 0.6 + (0.2 - u) * 6, 0.45, { mat: 'ext_espuma', tono: 0.1 }));
  }
}

// ------------------------------------------------------------------ fuego, velas, humo
/** Lenguas de fuego que cambian con el cuadro (de `n` cuadros). */
export function llamas(a: Arma, ps: Pieza[], f: number, nc: number, x: number, y: number, z: number, rad0: number, alto: number, grosor: number, mat = 'fuego', k = 5) {
  for (let i = 0; i < k; i++) {
    const g = (i / k) * PI2 + f * 0.7, d = i === 0 ? 0 : rad0;
    const h = alto * (0.65 + 0.35 * Math.sin((f / nc) * PI2 + i * 2.3)) * (i === 0 ? 1.25 : 1);
    ps.push(a.cilindro(x + Math.cos(g) * d, y + Math.sin(g) * d, z, grosor * (i === 0 ? 1.3 : 1), h, { mat, r1: 0.3, tono: i === 0 ? 0.1 : -0.05 }));
  }
  ps.push(a.elipsoide(x, y, z + 1, rad0 + grosor, rad0 + grosor, grosor * 0.7, { mat, tono: 0.15 }));
}
/** Chispas que suben y se apagan. */
export function chispas(a: Arma, ps: Pieza[], f: number, nc: number, x: number, y: number, z: number, alto: number, k = 4, mat = 'fuego') {
  for (let i = 0; i < k; i++) {
    const u = (f / nc + i / k) % 1, g = i * 2.4 + a.r() * 0.01;
    ps.push(a.esfera(x + Math.cos(g) * (1.5 + u * 5), y + Math.sin(g) * (1.5 + u * 5), z + u * alto, 0.75, { mat, tono: 0.2 - u * 0.45 }));
  }
}
/** Vela de cera con chorreado y llama que tiembla. */
export function vela(a: Arma, ps: Pieza[], x: number, y: number, z: number, h: number, f: number, nc: number, r = 1.1) {
  const fase = a.r() * PI2;
  ps.push(a.cilindro(x, y, z, r, h, { mat: 'cera', r1: r * 0.92, tono: az(a, 0.06) }));
  ps.push(a.cilindro(x + r * 0.5, y + r * 0.3, z, r * 0.4, h * (0.4 + a.r() * 0.4), { mat: 'cera', r1: r * 0.15, tono: 0.05 }));
  ps.push(a.cilindro(x, y, z, r * 1.6, 0.5, { mat: 'cera', r1: r * 1.1, tono: -0.05 }));
  ps.push(a.cilindro(x, y, z + h, 0.22, 0.9, { mat: 'negro' }));
  const t = Math.sin((f / nc) * PI2 + fase), hf = 2.3 + t * 0.6;
  ps.push(a.elipsoide(x + t * 0.15, y, z + h + 0.7 + hf / 2, 0.75, 0.75, hf / 2, { mat: 'luz_vela', tono: t * 0.08 }));
}
/** Columna de humo: bocanadas que suben y se abren (no tapan la luz). */
export function humo(a: Arma, ps: Pieza[], f: number, nc: number, x: number, y: number, z: number, alto: number, k = 5, ancho = 4) {
  for (let i = 0; i < k; i++) {
    const u = (f / nc + i / k) % 1, r = ancho * (0.6 + u * 1.3);
    ps.push(a.elipsoide(x + u * alto * 0.25 + Math.sin(u * 6 + i) * 1.5, y - u * alto * 0.12, z + u * alto, r, r * 0.9, r * 0.75, { mat: 'ext_humo', tono: 0.05 - u * 0.25 }));
  }
}

// ------------------------------------------------------------------ cuerpos
/** Lo que lleva puesto un cuerpo: material de la piel, la ropa de arriba, las mangas, las piernas, los pies y el pelo. */
export interface Ropa { piel: string; torso: string; mangas: string; piernas: string; pies: string; pelo: string; capucha?: string; casco?: string; cinto?: string }
export type TipoCadaver = 'campesino' | 'soldado' | 'mercader' | 'bandido' | 'nomada' | 'tribal' | 'explorador' | 'momia';
const PIELES = ['cu_piel', 'cu_piel_clara', 'cu_piel_palida', 'cu_piel_morena'];
const PELOS = ['cu_pelo_negro', 'cu_pelo_castano', 'cu_pelo_rubio', 'cu_pelo_rojo', 'cu_pelo_castano'];
export function ropaDe(a: Arma, tipo: TipoCadaver): Ropa {
  const piel = tipo === 'nomada' || tipo === 'tribal' ? elegir(a, ['cu_piel_morena', 'cu_piel']) : tipo === 'momia' ? 'ext_cuero_seco' : elegir(a, PIELES);
  const pelo = tipo === 'momia' ? 'ext_tela_sucia' : elegir(a, PELOS);
  const tela = elegir(a, ['cu_tela_parda', 'ext_tela_sucia', 'cu_tela_verde', 'cu_tela_roja', 'cu_tela_azul', 'cu_tela_negra']);
  switch (tipo) {
    case 'soldado': return { piel, pelo, torso: elegir(a, ['cu_malla', 'cu_tela_roja', 'cu_tela_azul']), mangas: 'cu_malla', piernas: 'cu_tela_parda', pies: 'cu_cuero', casco: a.r() < 0.6 ? 'hierro_oxido' : undefined, cinto: 'cu_cuero' };
    case 'mercader': return { piel, pelo, torso: elegir(a, ['cu_tela_morada', 'cu_tela_roja', 'cu_tela_verde']), mangas: 'cu_tela_blanca', piernas: 'cu_tela_parda', pies: 'cu_cuero', cinto: 'cu_oro' };
    case 'bandido': return { piel, pelo, torso: 'cu_cuero', mangas: 'cu_tela_negra', piernas: 'cu_tela_parda', pies: 'cu_cuero_negro', capucha: a.r() < 0.6 ? 'cu_tela_negra' : undefined, cinto: 'cu_cuero_negro' };
    case 'nomada': return { piel, pelo, torso: elegir(a, ['cu_tela_blanca', 'cu_tela_parda', 'cu_tela_azul']), mangas: 'cu_tela_blanca', piernas: elegir(a, ['cu_tela_blanca', 'cu_tela_parda']), pies: 'cu_cuero', capucha: elegir(a, ['cu_tela_blanca', 'cu_tela_azul', 'cu_tela_roja']) };
    case 'tribal': return { piel, pelo: 'cu_pelo_negro', torso: piel, mangas: piel, piernas: piel, pies: piel, cinto: 'cu_cuero' };
    case 'explorador': return { piel, pelo, torso: 'cu_tela_blanca', mangas: 'cu_tela_blanca', piernas: 'cu_tela_parda', pies: 'cu_cuero', cinto: 'cu_cuero' };
    case 'momia': return { piel, pelo, torso: 'ext_tela_sucia', mangas: 'ext_cuero_seco', piernas: 'ext_tela_sucia', pies: 'ext_cuero_seco' };
    default: return { piel, pelo, torso: tela, mangas: a.r() < 0.5 ? tela : piel, piernas: elegir(a, ['cu_tela_parda', 'ext_tela_sucia']), pies: elegir(a, ['cu_cuero', 'ext_cuero_seco']), capucha: a.r() < 0.3 ? tela : undefined, cinto: a.r() < 0.5 ? 'cuerda' : undefined };
  }
}
/** Pose de un cuerpo inerte: ángulos de brazos (180 pegado al cuerpo, 90 abierto, 20 sobre la cabeza), codos, piernas y rodillas. */
export interface PoseCuerpo { brazos: [number, number]; codos: [number, number]; piernas: [number, number]; rodillas: [number, number]; cabeza: number; ladea?: number }
export function poseAzar(a: Arma): PoseCuerpo {
  return {
    brazos: [a.r() < 0.6 ? entre(a, 130, 175) : entre(a, 50, 130), a.r() < 0.5 ? entre(a, 130, 175) : entre(a, 40, 120)], codos: [az(a, 60), az(a, 60)], piernas: [entre(a, 3, 24), entre(a, 3, 24)],
    rodillas: [a.r() < 0.35 ? entre(a, 20, 70) : entre(a, 0, 12), a.r() < 0.25 ? entre(a, 20, 60) : entre(a, 0, 12)], cabeza: az(a, 60),
  };
}
/** Puntos del cuerpo en el mundo (para clavarle flechas, atarle sogas o mancharlo). */
export interface Huesos { cabeza: V; pecho: V; pelvis: V; frente: V; manos: V[]; pies: V[] }
/**
 * Muñeco de masa en un marco: `T` lleva del marco del cuerpo (x a lo largo hacia la cabeza, y a la izquierda, z hacia
 * el frente; la pelvis en el origen) al mundo. Así el mismo cuerpo sirve tendido de espaldas, de bruces o colgado.
 * `huesos` lo arma como esqueleto (cráneo, costillar y huesos largos).
 */
export function muneco(a: Arma, ps: Pieza[], T: (p: V) => V, ropa: Ropa, pose: PoseCuerpo, o: { s?: number; huesos?: boolean; colgado?: boolean } = {}): Huesos {
  const s = o.s ?? 1, O = T([0, 0, 0]);
  const A = (v: V): V => mas(T(v), O, -1);
  const W = (x: number, y: number, z: number) => T([x * s, y * s, z * s]);
  const ej = (x: V, y: V): [V, V, V] => { const ex = nrm(A(x)), ey0 = nrm(A(y)); const ez = nrm(cruz(ex, ey0)); return [ex, cruz(ez, ex), ez]; };
  const EJ = ej([1, 0, 0], [0, 1, 0]);
  const cs: Comp[] = [];
  const B = (c: V, r: V, mat: string, ejes = EJ, tono?: number) => cs.push(bulto(c, [r[0] * s, r[1] * s, r[2] * s], { ejes, mat, tono }));
  const H = (p: V, q: V, r0: number, r1: number, mat: string) => cs.push(hueso(p, q, r0 * s, r1 * s, { mat }));
  // cabeza girada alrededor del eje del cuerpo
  const cg = Math.cos(rad(pose.cabeza)), sg = Math.sin(rad(pose.cabeza));
  const cl = Math.cos(rad(pose.ladea ?? 0)), sl = Math.sin(rad(pose.ladea ?? 0));
  const Hd = (x: number, y: number, z: number) => { const y1 = y * cg - z * sg, z1 = y * sg + z * cg, u = x - 19.5; return W(19.5 + u * cl - y1 * sl, u * sl + y1 * cl, z1); };
  const EJH = ej([cl, sl, 0], [-sl * cg, cl * cg, sg]);
  // brazos y piernas
  const manos: V[] = [], pies: V[] = [];
  const brazo = (sd: number, th: number, codo: number) => {
    const t = rad(th), S: V = [15.5, sd * 7, 0];
    const d: V = [Math.cos(t), sd * Math.sin(t), o.colgado ? 0.12 : 0];
    const E = mas(S, nrm(d), 11), t2 = t + rad(codo);
    const d2: V = nrm([Math.cos(t2), sd * Math.sin(t2), o.colgado ? 0.25 : Math.abs(codo) > 30 ? 0.35 : 0.05]);
    const Hn = mas(E, d2, 10), Mn = mas(Hn, d2, 1.8);
    return { S, E, Hn, Mn, d2 };
  };
  const pierna = (sd: number, ph: number, rod: number) => {
    const p = rad(ph), P: V = [-1.5, sd * 3.4, 0], d: V = [-Math.cos(p), sd * Math.sin(p), 0], k = rad(rod / 2);
    const K = mas(mas(P, d, 15 * Math.cos(k)), [0, 0, 1], 15 * Math.sin(k)), Ak = mas(mas(K, d, 14 * Math.cos(k)), [0, 0, 1], -14 * Math.sin(k));
    return { P, K, Ak, d };
  };
  const bz = [brazo(1, pose.brazos[0], pose.codos[0]), brazo(-1, pose.brazos[1], pose.codos[1])];
  const pn = [pierna(1, pose.piernas[0], pose.rodillas[0]), pierna(-1, pose.piernas[1], pose.rodillas[1])];
  const Wv = (v: V) => W(v[0], v[1], v[2]);
  if (o.huesos) {
    costillar(a, ps, W(1, 0, -1), W(17, 0, -0.5), 7, 5.2 * s, { abre: 0.1, r: 0.55 * s });
    ps.push(masa([bulto(W(-0.5, 0, -0.5), [3 * s, 5 * s, 2.2 * s], { ejes: EJ }), bulto(W(-1, 3, -0.5), [2.4 * s, 2.6 * s, 1.4 * s], { ejes: EJ }), bulto(W(-1, -3, -0.5), [2.4 * s, 2.6 * s, 1.4 * s], { ejes: EJ })], { mat: 'ext_hueso', suave: 1 }));
    const hc = Hd(22.5, 0, 0.5);
    craneo(a, ps, hc[0], hc[1], hc[2], 0.95 * s, Math.atan2(A([0, 0, 1])[1], A([0, 0, 1])[0]));
    for (const b of bz) { huesoLargo(ps, Wv(b.S), Wv(b.E), 0.7 * s); huesoLargo(ps, Wv(b.E), Wv(b.Hn), 0.55 * s); manos.push(Wv(b.Mn)); }
    for (const l of pn) { huesoLargo(ps, Wv(l.P), Wv(l.K), 0.95 * s); huesoLargo(ps, Wv(l.K), Wv(l.Ak), 0.75 * s); pies.push(Wv(l.Ak)); }
    return { cabeza: hc, pecho: W(12, 0, 2), pelvis: W(0, 0, 0), frente: nrm(A([0, 0, 1])), manos, pies };
  }
  // tronco
  B(W(0, 0, 0), [4.4, 5.8, 3.4], ropa.piernas);
  B(W(6, 0, 0.2), [4.6, 5.4, 3.3], ropa.torso);
  B(W(12.5, 0, 0.4), [5.2, 7, 3.9], ropa.torso);
  H(W(15.3, -6.6, 0), W(15.3, 6.6, 0), 2.6, 2.6, ropa.torso);
  if (ropa.cinto) H(W(2.6, -5.6, 0.3), W(2.6, 5.6, 0.3), 1.6, 1.6, ropa.cinto);
  H(W(17.5, 0, 0), W(20.2, 0, 0.3), 1.8, 1.7, ropa.piel);
  // cabeza: cráneo, nariz, mandíbula y pelo o capucha atrás y arriba
  B(Hd(23, 0, 0.3), [4.1, 3.3, 3.5], ropa.piel, EJH);
  B(Hd(22.2, 0, 3.4), [1, 0.8, 0.9], ropa.piel, EJH, -0.05);
  B(Hd(20.4, 0, 1.6), [1.6, 2.5, 1.6], ropa.piel, EJH, -0.03);
  if (ropa.casco) B(Hd(24.2, 0, -0.3), [3.5, 3.9, 3.9], ropa.casco, EJH);
  else if (ropa.capucha) { B(Hd(23.8, 0, -1), [4.6, 4.3, 3.9], ropa.capucha, EJH); B(Hd(19, 0, -1.5), [2.5, 5.5, 2.6], ropa.capucha, EJH); }
  else B(Hd(23.8, 0, -0.9), [3.9, 3.5, 3.2], ropa.pelo, EJH);
  for (const b of bz) {
    H(Wv(b.S), Wv(b.E), 2.4, 2, ropa.mangas);
    H(Wv(b.E), Wv(b.Hn), 2, 1.5, ropa.mangas === ropa.torso && ropa.mangas !== ropa.piel ? ropa.mangas : ropa.piel);
    cs.push(bulto(Wv(b.Mn), [2 * s, 1.5 * s, 0.9 * s], { eje: A(b.d2), mat: ropa.piel }));
    manos.push(Wv(b.Mn));
  }
  for (const l of pn) {
    H(Wv(l.P), Wv(l.K), 3.2, 2.5, ropa.piernas);
    H(Wv(l.K), Wv(mez(l.K, l.Ak, 0.5)), 2.5, 2.1, ropa.piernas);
    H(Wv(mez(l.K, l.Ak, 0.45)), Wv(l.Ak), 2.3, 1.9, ropa.pies);
    // el pie apunta al frente del cuerpo (arriba si está de espaldas, al piso si está de bruces, abajo si cuelga)
    const pf = o.colgado ? mas(l.Ak, [-1.5, 0, 0.6]) : mas(l.Ak, [0, 0, 2]);
    cs.push(bulto(Wv(mas(pf, l.d, 0.3)), [1.5 * s, 1.4 * s, 3 * s], { ejes: EJ, mat: ropa.pies }));
    pies.push(Wv(l.Ak));
  }
  ps.push(masa(cs, { mat: ropa.torso, suave: 1.3 * s }));
  return { cabeza: Hd(23, 0, 0.3), pecho: W(12.5, 0, 3.5), pelvis: W(0, 0, 0), frente: nrm(A([0, 0, 1])), manos, pies };
}
/** Marco de un cuerpo tendido en el piso con la pelvis en `p`, la cabeza hacia `giro` (grados): de espaldas o de bruces. */
export function tendido(p: V, giro: number, bruces = false, alto = 3.5): (q: V) => V {
  const c = Math.cos(rad(giro)), s = Math.sin(rad(giro));
  return (q) => { const y = bruces ? -q[1] : q[1]; return [p[0] + q[0] * c - y * s, p[1] + q[0] * s + y * c, p[2] + alto + (bruces ? -q[2] : q[2])]; };
}
/** Marco de un cuerpo colgado: la nuca en `p`, mirando hacia `giro` (grados). */
export function colgado(p: V, giro: number): (q: V) => V {
  const c = Math.cos(rad(giro)), s = Math.sin(rad(giro));
  return (q) => [p[0] + q[2] * c - q[1] * s, p[1] + q[2] * s + q[1] * c, p[2] + q[0] - 21];
}
/**
 * Cadáver tumbado con la pelvis cerca de `p`: de espaldas o de bruces, con la pose al azar, un charco de sangre si
 * `sangre` y flechas clavadas si `flechas`.
 */
export function cadaver(a: Arma, ps: Pieza[], tipo: TipoCadaver, p: V, giro: number, o: { sangre?: number; flechas?: number; bruces?: boolean; huesos?: boolean; pose?: Partial<PoseCuerpo>; s?: number } = {}): Huesos {
  const bruces = o.bruces ?? a.r() < 0.45;
  const ropa = ropaDe(a, tipo), pose = { ...poseAzar(a), ...o.pose };
  if (bruces) pose.rodillas = [Math.min(8, pose.rodillas[0]), Math.min(8, pose.rodillas[1])];
  if (o.sangre) disco(a, ps, p[0] + Math.cos(rad(giro)) * 8 + az(a, 3), p[1] + Math.sin(rad(giro)) * 8 + az(a, 3), p[2] - 0.2, 10 * o.sangre, 7 * o.sangre, 0.55, 'ext_sangre', { giro: giro + az(a, 30), ruido: 0.25 });
  const h = muneco(a, ps, tendido(p, giro, bruces, o.huesos ? 1.5 : 3.5), ropa, pose, { huesos: o.huesos, s: o.s });
  for (let i = 0; i < (o.flechas ?? 0); i++) {
    const q = mez(h.pecho, h.pelvis, a.r() * 0.6);
    flecha(a, ps, mas(q, [az(a, 2), az(a, 2), 0]), [az(a, 0.6) + (bruces ? 0 : 0), az(a, 0.6), 1], 12);
  }
  return h;
}
/** Flecha clavada (asta, plumas) desde `p` hacia afuera `d`. */
export function flecha(a: Arma, ps: Pieza[], p: V, d: V, L = 14) {
  const q = mas(p, nrm(d), L);
  ps.push(a.palo(mas(p, nrm(d), -2), q, 0.35, { mat: 'madera_lisa' }));
  const e = mas(p, nrm(d), L - 3.5);
  for (const s of [0, 2.1, 4.2]) { const u = ejesDe(d, s)[1]; ps.push(a.palo(e, mas(mas(e, nrm(d), 3), u, 0.9), 0.35, { mat: 'ext_tela_sucia', r1: 0.2, tono: 0.15 })); }
}

// ------------------------------------------------------------------ huesos
/** Cráneo humano mirando hacia `g` (radianes), con cuencas y mandíbula. */
export function craneo(a: Arma, ps: Pieza[], x: number, y: number, z: number, s = 1, g = 0, mat = 'ext_hueso') {
  const fx = Math.cos(g), fy = Math.sin(g);
  ps.push(masa([
    bulto([x, y, z], [3.6 * s, 3.1 * s, 3.2 * s], { giro: grad(g) }),
    bulto([x + fx * 2.4 * s, y + fy * 2.4 * s, z - 2.2 * s], [2 * s, 2.3 * s, 1.6 * s], { giro: grad(g) }),
    bulto([x + fx * 1.6 * s, y + fy * 1.6 * s, z - 3.3 * s], [1.7 * s, 2 * s, 0.9 * s], { giro: grad(g), tono: -0.06 }),
  ], { mat, suave: 1.2 * s }));
  for (const sd of [-1, 1]) ps.push(a.esfera(x + fx * 3 * s - fy * 1.3 * s * sd, y + fy * 3 * s + fx * 1.3 * s * sd, z - 0.6 * s, 1.05 * s, { mat: 'negro' }));
  ps.push(a.esfera(x + fx * 3.6 * s, y + fy * 3.6 * s, z - 1.9 * s, 0.55 * s, { mat: 'negro' }));
}
/** Hueso largo con cabezas en las puntas (fémur, húmero). */
export function huesoLargo(ps: Pieza[], p0: V, p1: V, r = 0.9, mat = 'ext_hueso') {
  ps.push(masa([hueso(p0, p1, r, r * 0.85), bulto(p0, [r * 1.6, r * 1.4, r * 1.3]), bulto(p1, [r * 1.5, r * 1.3, r * 1.3])], { mat, suave: r * 0.8 }));
}
/**
 * Costillar: columna de `n` vértebras de `p0` a `p1` y un par de costillas por vértebra que se curvan hacia el piso
 * (`abre` 0..1: cerradas como un barril o abiertas y caídas).
 */
export function costillar(a: Arma, ps: Pieza[], p0: V, p1: V, n: number, R: number, o: { abre?: number; mat?: string; rotas?: number; r?: number } = {}) {
  const mat = o.mat ?? 'ext_hueso', d = nrm(mas(p1, p0, -1)), lado = nrm(cruz(d, [0, 0, 1])), r = o.r ?? Math.max(0.6, R * 0.06);
  const vert: Comp[] = [hueso(p0, p1, r * 1.5, r * 1.1)];
  for (let i = 0; i < n; i++) vert.push(bulto(mez(p0, p1, (i + 0.5) / n), [r * 1.6, r * 2.1, r * 2.4], { eje: d }));
  ps.push(masa(vert, { mat, suave: r }));
  const abre = o.abre ?? 0.2;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, b = mez(p0, p1, t), Ri = R * (0.55 + Math.sin(Math.PI * Math.min(1, t * 1.2)) * 0.5);
    for (const s of [-1, 1]) {
      if (o.rotas && a.r() < o.rotas) continue;
      let q = b;
      const k = 4, tot = 2.6 + abre * 0.9;
      for (let j = 1; j <= k; j++) {
        const u = (j / k) * tot, c = Math.cos(u), si = Math.sin(u);
        // arco desde arriba hacia el costado y abajo
        const nq: V = mas(mas(b, lado, s * si * Ri), [0, 0, 1], (c - 1) * Ri * 0.75 + Ri * 0.05);
        nq[2] = Math.max(0.6, nq[2] - abre * Ri * 0.3 * (j / k));
        ps.push(a.palo(q, nq, r * (1 - j * 0.12), { mat, r1: r * (1 - (j + 1) * 0.12), tono: az(a, 0.05) }));
        q = nq;
      }
    }
  }
}

// ------------------------------------------------------------------ aves
M.ext_plumon = { rampa: ['#2c2820', '#443e32', '#5d5645', '#776f5a', '#918870', '#a9a087'], ruido: 0.5, escala: 1.4 };
/**
 * Buitre encorvado de masa: lomo alto, alas plegadas que lo envuelven, collar de plumón, cuello pelado en S y pico
 * ganchudo. `s` 1 mide unos 18 de alto; `come` baja el cuello hacia el piso (0..1).
 */
export function buitre(a: Arma, ps: Pieza[], p: V, g: number, s: number, come = 0) {
  const fx = Math.cos(g), fy = Math.sin(g), lx = -fy, ly = fx;
  const P = (fw: number, rt: number, up: number): V => [p[0] + (fx * fw + lx * rt) * s, p[1] + (fy * fw + ly * rt) * s, p[2] + up * s];
  const D = (fw: number, rt: number, up: number): V => [fx * fw + lx * rt, fy * fw + ly * rt, up];
  const cab = come ? P(8 + come * 2, 0, 12 - come * 10) : P(6.5, 0, 14.5);
  const cs: Comp[] = [
    bulto(P(0, 0, 9), [6.2 * s, 4.2 * s, 4.6 * s], { eje: D(0.8, 0, 0.55) }),
    bulto(P(-6.5, 0, 4.5), [3.8 * s, 2.4 * s, 0.7 * s], { eje: D(-1, 0, -0.45) }),
    bulto(P(2.6, 0, 12.6), [2.6 * s, 3.5 * s, 2.2 * s], { eje: D(1, 0, 0.3), mat: 'ext_plumon' }),
    hueso(P(3.5, 0, 13), come ? P(6 + come, 0, 12 - come * 4) : P(4.6, 0, 16), 1.3 * s, 1 * s, { mat: 'ext_piel_buitre' }),
    hueso(come ? P(6 + come, 0, 12 - come * 4) : P(4.6, 0, 16), cab, 1 * s, 1 * s, { mat: 'ext_piel_buitre' }),
    bulto(cab, [1.9 * s, 1.3 * s, 1.4 * s], { eje: D(1, 0, come ? -0.8 : -0.1), mat: 'ext_piel_buitre' }),
  ];
  for (const sd of [-1, 1]) cs.push(bulto(P(-1.5, sd * 3.3, 8.6), [7.4 * s, 1.5 * s, 4.2 * s], { eje: D(0.85, sd * 0.1, 0.35), tono: 0.05 }));
  ps.push(masa(cs, { mat: 'ext_pluma_parda', suave: 1.3 * s }));
  const pd = nrm(come ? D(0.5, 0, -1) : D(1, 0, -0.2)), b0 = mas(cab, pd, 1.6 * s), b1 = mas(b0, pd, 2.2 * s);
  ps.push(a.palo(b0, b1, 0.85 * s, { mat: 'ext_pico', r1: 0.55 * s }), a.palo(b1, mas(b1, [0, 0, -1.4 * s]), 0.55 * s, { mat: 'ext_pico', r1: 0.15 * s }));
  for (const sd of [-1, 1]) { const c = P(0.5, sd * 1.8, 5), pie = P(1, sd * 2.2, 0); ps.push(a.palo(c, pie, 0.7 * s, { mat: 'ext_pico', r1: 0.5 * s, tono: -0.2 }), a.palo(pie, mas(pie, [fx * 2.5 * s, fy * 2.5 * s, 0]), 0.45 * s, { mat: 'negro' })); }
}
/** Pose de un pájaro: posado, picando (cabeza al piso) o con las alas abiertas. */
export type PoseAve = 'posado' | 'picando' | 'alas';
/**
 * Cuervo o buitre de masa: cuerpo, cuello, cabeza, cola y alas plegadas (o abiertas), pico y patas. `s` es la escala
 * (1 = cuervo de unos 15 de largo). `g` hacia dónde mira (radianes).
 */
export function ave(a: Arma, ps: Pieza[], p: V, g: number, s: number, pose: PoseAve, o: { mat?: string; cuello?: string; f?: number; nc?: number; buitre?: boolean } = {}) {
  const mat = o.mat ?? 'ext_pluma', fx = Math.cos(g), fy = Math.sin(g), lx = -fy, ly = fx;
  const P = (fw: number, rt: number, up: number): V => [p[0] + (fx * fw + lx * rt) * s, p[1] + (fy * fw + ly * rt) * s, p[2] + up * s];
  const pica = pose === 'picando' ? 1 : 0;
  const bob = o.f !== undefined && o.nc ? Math.max(0, Math.sin((o.f / o.nc) * PI2)) : 0;
  const cabeza = pica ? P(5.2, 0, 2.5 - bob * 2) : P(3.6, 0, 8.6 + (o.buitre ? -1.5 : 0));
  const cuerpo: Comp[] = [
    bulto(P(0, 0, 5.2), [4.2 * s, 2.5 * s, 2.7 * s], { eje: [fx * Math.cos(rad(pica ? 25 : -28)), fy * Math.cos(rad(pica ? 25 : -28)), Math.sin(rad(pica ? -25 : 28))] }),
    hueso(P(2.4, 0, 6.6), cabeza, 1.5 * s, (o.buitre ? 0.9 : 1.25) * s, o.buitre ? { mat: o.cuello ?? 'ext_piel_buitre' } : {}),
    bulto(cabeza, [1.9 * s, 1.5 * s, 1.5 * s], { eje: [fx, fy, pica ? -0.8 : 0], mat: o.buitre ? o.cuello ?? 'ext_piel_buitre' : undefined }),
    // cola
    bulto(P(-5, 0, pica ? 7.4 : 2.8), [3.2 * s, 1.6 * s, 0.6 * s], { eje: [-fx, -fy, pica ? 0.5 : -0.35] }),
  ];
  if (o.buitre) cuerpo.push(bulto(P(1.6, 0, 7.2), [1.8 * s, 2.6 * s, 1.4 * s], { mat: 'ext_hueso', tono: -0.15 }));
  if (pose !== 'alas') for (const sd of [-1, 1]) cuerpo.push(bulto(P(-1, sd * 1.9, 5.6), [4.6 * s, 0.9 * s, 2.1 * s], { eje: [fx * 0.95, fy * 0.95, pica ? 0.35 : -0.3], tono: 0.04 }));
  ps.push(masa(cuerpo, { mat, suave: 1.1 * s }));
  if (pose === 'alas') {
    const ab = o.f !== undefined && o.nc ? Math.sin((o.f / o.nc) * PI2) * 0.5 : 0;
    for (const sd of [-1, 1]) {
      const hom = P(0.6, sd * 1.8, 6.6), codo = P(-0.5, sd * 8, 9 + ab * 4), pun = P(-3, sd * 14, 8 + ab * 7);
      ps.push(masa([hueso(hom, codo, 1.6 * s, 1.2 * s), hueso(codo, pun, 1.2 * s, 0.6 * s), bulto(mez(hom, pun, 0.55), [6.5 * s, 3.2 * s, 0.5 * s], { eje: mas(pun, hom, -1) })], { mat, suave: 0.8 * s }));
      for (let k = 0; k < 3; k++) { const b = mez(codo, pun, 0.3 + k * 0.3); ps.push(a.palo(b, mas(b, [-fx * 4 * s, -fy * 4 * s, -0.5 * s], 1), 0.7 * s, { mat, r1: 0.2 * s })); }
    }
  }
  // pico
  const pf: V = pica ? [fx * 0.6, fy * 0.6, -0.8] : [fx, fy, -0.15];
  const b0 = mas(cabeza, nrm(pf), 1.4 * s);
  ps.push(a.palo(b0, mas(b0, nrm(pf), (o.buitre ? 2.4 : 2.9) * s), 0.75 * s, { mat: o.buitre ? 'ext_pico' : 'negro', r1: 0.12 * s }));
  if (o.buitre) ps.push(a.palo(mas(b0, nrm(pf), 1.6 * s), mas(b0, [pf[0] * 1.8, pf[1] * 1.8, -1.6], s), 0.5 * s, { mat: 'ext_pico', r1: 0.1 * s }));
  // patas
  for (const sd of [-1, 1]) { const c = P(0.4, sd * 1, 3); const pie = P(0.8, sd * 1.3, 0); ps.push(a.palo(c, pie, 0.35 * s, { mat: 'negro' }), a.palo(pie, mas(pie, [fx * 1.8 * s, fy * 1.8 * s, 0]), 0.3 * s, { mat: 'negro' })); }
}

// ------------------------------------------------------------------ madera y tela
/** Tabla gastada entre dos puntos: caja a lo largo del tramo, con su ancho de lado y grosor hacia arriba. */
export function tabla(a: Arma, ps: Pieza[], p: V, q: V, ancho: number, grueso: number, mat = 'ext_madera_gris', tono = 0) {
  const dx = q[0] - p[0], dy = q[1] - p[1], dz = q[2] - p[2], h = Math.hypot(dx, dy), L = Math.hypot(h, dz);
  ps.push(a.caja((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2 - grueso / 2, L, ancho, grueso, { mat, giro: grad(Math.atan2(dy, dx)), incl: -grad(Math.atan2(dz, h)), inclEje: 'y', tono: tono + az(a, 0.06) }));
}
/** Rueda de carro con rayos (eje a lo largo de `e`). */
export function rueda(a: Arma, ps: Pieza[], c: V, e: V, r: number, o: { rotos?: number; mat?: string } = {}) {
  const [ez, u, w] = ejesDe(e), mat = o.mat ?? 'ext_madera_gris';
  ps.push(a.cilindro(c[0] - ez[0] * 1.2, c[1] - ez[1] * 1.2, c[2] - ez[2] * 1.2, r, 2.4, { mat, eje: ez }));
  ps.push(a.cilindro(c[0] - ez[0] * 1.4, c[1] - ez[1] * 1.4, c[2] - ez[2] * 1.4, r - 2.2, 2.8, { mat, eje: ez, resta: true }));
  ps.push(a.cilindro(c[0] - ez[0] * 1.3, c[1] - ez[1] * 1.3, c[2] - ez[2] * 1.3, r + 0.25, 0.7, { mat: 'ext_hierro', eje: ez }));
  ps.push(a.cilindro(c[0] - ez[0] * 1.8, c[1] - ez[1] * 1.8, c[2] - ez[2] * 1.8, 2, 3.6, { mat: 'ext_madera_podrida', eje: ez }));
  for (let i = 0; i < 8; i++) {
    if (o.rotos && a.r() < o.rotos) continue;
    const t = (i / 8) * PI2 + 0.2;
    ps.push(a.palo(c, mas(mas(c, u, Math.cos(t) * (r - 1.4)), w, Math.sin(t) * (r - 1.4)), 0.75, { mat, tono: az(a, 0.06) }));
  }
}
/**
 * Paño que cuelga de una barra de `p` a `q` (los dos arriba): tiras verticales que ondean con el cuadro; `jirones`
 * corta algunas tiras y `caida` cuánto cuelga.
 */
export function pano(a: Arma, ps: Pieza[], p: V, q: V, caida: number, mat: string, f: number, nc: number, o: { tiras?: number; jirones?: number; viento?: number; tono?: number } = {}) {
  const n = o.tiras ?? 7, L = dist(p, q), w = L / n, d = nrm(mas(q, p, -1)), nx = -d[1], ny = d[0];
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n, c = mez(p, q, t);
    const ola = Math.sin((f / nc) * PI2 - k * 0.9) * (o.viento ?? 1) * (0.4 + t * 1.2);
    let h = caida * (1 - t * 0.12);
    if (o.jirones && a.r() < o.jirones) h *= 0.35 + a.r() * 0.45; else a.r();
    const top: V = c, bot: V = [c[0] + nx * ola, c[1] + ny * ola, c[2] - h];
    const pts: V[] = [];
    for (const s of [-1, 1]) for (const e of [-0.45, 0.45]) { pts.push(mas(mas(top, d, s * w * 0.52), [nx, ny, 0], e)); pts.push(mas(mas(bot, d, s * w * 0.5), [nx, ny, 0], e)); }
    ps.push(a.poliedro(pts, { mat, tono: (o.tono ?? 0) + ola * 0.05 + az(a, 0.03) }));
  }
}

// ------------------------------------------------------------------ marcos girados en 3D
/** Marco rígido: lleva puntos y direcciones de un marco local (girado en los tres ejes) al mundo. */
export interface Marco { T: (p: V) => V; D: (v: V) => V }
/** Local → alabeo (alrededor de x) → cabeceo (alrededor de y) → giro (alrededor de z, grados) → corrido a `o`. */
export function marco(o: V, giro = 0, cabeceo = 0, alabeo = 0): Marco {
  const cz = Math.cos(rad(giro)), sz = Math.sin(rad(giro)), cy = Math.cos(rad(cabeceo)), sy = Math.sin(rad(cabeceo)), cx = Math.cos(rad(alabeo)), sx = Math.sin(rad(alabeo));
  const D = (v: V): V => {
    const y1 = v[1] * cx - v[2] * sx, z1 = v[1] * sx + v[2] * cx;
    const x2 = v[0] * cy + z1 * sy, z2 = -v[0] * sy + z1 * cy;
    return [x2 * cz - y1 * sz, x2 * sz + y1 * cz, z2];
  };
  return { D, T: (p) => mas(o, D(p)) };
}
/** Caja con la base centrada en (x,y,z) del marco: un poliedro de sus 8 esquinas (sirve girada en cualquier eje). */
export function cajaM(a: Arma, ps: Pieza[], m: Marco, x: number, y: number, z: number, an: number, pr: number, al: number, mat: string, tono?: number, resta?: boolean) {
  const pts: V[] = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [0, 1]) pts.push(m.T([x + sx * an / 2, y + sy * pr / 2, z + sz * al]));
  ps.push(a.poliedro(pts, { mat, tono, resta }));
}
export const paloM = (a: Arma, ps: Pieza[], m: Marco, p: V, q: V, r: number, mat: string, r1?: number, tono?: number) => ps.push(a.palo(m.T(p), m.T(q), r, { mat, r1, tono }));
/** Sillar: bloque de piedra tallado a mano (esquinas corridas al azar), con la base centrada en (x,y,z). */
export function sillar(a: Arma, ps: Pieza[], x: number, y: number, z: number, l: number, w: number, h: number, giro: number, mat = 'piedra_gris', o: { jit?: number; tono?: number; incl?: number } = {}) {
  const j = o.jit ?? Math.min(l, w, h) * 0.12, c = Math.cos(rad(giro)), s = Math.sin(rad(giro)), ti = rad(o.incl ?? 0);
  const pts: V[] = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [0, 1]) {
    const lx = sx * l / 2 + az(a, j), ly = sy * w / 2 + az(a, j), lz = sz * h + (sz ? az(a, j) : 0);
    const zz = lz + lx * Math.sin(ti);
    pts.push([x + lx * c - ly * s, y + lx * s + ly * c, z + zz]);
  }
  // arista gastada: un punto más adentro en el medio de la cara de arriba
  pts.push([x + az(a, l * 0.2) * c, y + az(a, w * 0.2), z + h + j * 0.5]);
  ps.push(a.poliedro(pts, { mat, tono: (o.tono ?? 0) + az(a, 0.07) }));
}
/**
 * Losa en pie (menhir, piedra de un círculo): masa de bultos apilados que se afinan, ancha de frente y angosta de
 * canto, mirando hacia `giro` (grados), con inclinación `incl` (grados, hacia su frente).
 */
export function losa(a: Arma, ps: Pieza[], p: V, H: number, w: number, d: number, giro: number, o: { incl?: number; mat?: string; musgo?: number; liquen?: number; ladeo?: number; tono?: number } = {}): Comp[] {
  const m = marco(p, giro, o.incl ?? 0, o.ladeo ?? 0), cs: Comp[] = [];
  const ej: [V, V, V] = [m.D([1, 0, 0]), m.D([0, 1, 0]), m.D([0, 0, 1])];
  const k = 4;
  for (let i = 0; i < k; i++) {
    const t = (i + 0.5) / k, af = 1 - t * 0.38 + az(a, 0.06);
    cs.push(bulto(m.T([az(a, d * 0.15), az(a, w * 0.08), H * (0.12 + t * 0.78)]), [d * af, w * af, H * 0.24], { ejes: ej, tono: az(a, 0.05) }));
  }
  cs.push(bulto(m.T([az(a, d * 0.2), az(a, w * 0.25), H * 0.92]), [d * 0.55, w * 0.5, H * 0.1], { ejes: ej }));
  for (let i = 0; i < Math.round((o.musgo ?? 0) * 4); i++) cs.push(bulto(m.T([d * 0.6 * (a.r() < 0.5 ? 1 : -1), az(a, w * 0.6), a.r() * H * 0.35]), [d * 0.35, w * (0.3 + a.r() * 0.3), H * (0.08 + a.r() * 0.1)], { ejes: ej, mat: 'ext_musgo', k: 0.8 }));
  for (let i = 0; i < Math.round((o.liquen ?? 0) * 6); i++) cs.push(bulto(m.T([d * 0.85 * (a.r() < 0.5 ? 1 : -1), az(a, w * 0.6), H * (0.2 + a.r() * 0.65)]), [0.8, 1.5 + a.r() * 2, 1.5 + a.r() * 2], { ejes: ej, mat: 'ext_liquen', k: 0.4 }));
  ps.push(masa(cs, { mat: o.mat ?? 'ext_roca', suave: Math.min(w, d) * 0.5, tono: o.tono }));
  return cs;
}

// ------------------------------------------------------------------ bestias muertas
export type TipoBestia = 'caballo' | 'buey' | 'camello' | 'ciervo' | 'jabali';
/**
 * Bestia muerta tendida de costado (masa): tronco, cuello, cabeza, patas tiesas. `podrida` 0..1 le abre el costado y
 * deja ver las costillas; con `carga` lleva fardos atados.
 */
export function bestiaMuerta(a: Arma, ps: Pieza[], tipo: TipoBestia, p: V, giro: number, o: { podrida?: number; carga?: boolean; s?: number } = {}) {
  const s = (o.s ?? 1) * (tipo === 'camello' ? 1.15 : tipo === 'jabali' ? 0.6 : tipo === 'ciervo' ? 0.8 : 1);
  const mat = tipo === 'caballo' ? elegir(a, ['ext_pelo_caballo', 'ext_pelo_negro']) : tipo === 'camello' ? 'ext_pelo_camello' : tipo === 'buey' ? elegir(a, ['ext_pelo_caballo', 'ext_pelo_negro']) : 'ext_pelo_caballo';
  const m = marco(p, giro);
  // tendido de costado: el lomo hacia -y, la panza y las patas hacia +y, el ancho del animal queda vertical
  const W = (x: number, y: number, z: number) => m.T([x * s, y * s, z * s]);
  const X = (v: V) => m.D(v);
  const cs: Comp[] = [];
  const cam = tipo === 'camello';
  cs.push(bulto(W(0, 0, 7.4), [19 * s, 9.6 * s, 7.4 * s], { eje: X([1, 0, 0]) }));
  cs.push(bulto(W(-11, -0.5, 7.8), [10 * s, 10.4 * s, 8 * s], { eje: X([1, 0, 0]) }));
  cs.push(bulto(W(10, 0.8, 7.2), [9 * s, 9.2 * s, 7.1 * s], { eje: X([1, 0.1, 0]) }));
  if (cam) cs.push(bulto(W(-1, -10, 7.6), [8.5 * s, 5.5 * s, 5.5 * s], { eje: X([1, 0, 0]) }));
  // cuello y cabeza tendidos en el piso
  const cu0: V = [16, -3, 7.6], cu1: V = cam ? [27, -14, 5.2] : [27, -6, 5.4], cab: V = cam ? [33, -5, 3.6] : [34, -3, 3.8];
  cs.push(hueso(W(...cu0), W(...cu1), 5.6 * s, (cam ? 3 : 4.4) * s));
  cs.push(hueso(W(...cu1), W(...cab), (cam ? 3 : 4.2) * s, 2.7 * s));
  const dc = nrm([cab[0] - cu1[0], cab[1] - cu1[1], 0]);
  cs.push(bulto(W(cab[0] + dc[0] * 2.5, cab[1] + dc[1] * 2.5, cab[2]), [(tipo === 'buey' ? 5.2 : 6) * s, (tipo === 'buey' ? 3.8 : 3.3) * s, 2.7 * s], { eje: X(dc) }));
  // patas tiesas: las de arriba despegadas del piso, las de abajo apoyadas
  const largo = cam ? 1.25 : tipo === 'buey' ? 0.85 : tipo === 'jabali' ? 0.7 : 1;
  const patas: [V, V][] = [[[11, 6, 10.5], [18, 27, 11]], [[11, 6, 4], [21, 25, 2.4]], [[-12, 6, 10.5], [-19, 28, 11.5]], [[-12, 6, 4], [-24, 24, 2.4]]];
  const finDe = (c0: V, c1: V): V => [c0[0] + (c1[0] - c0[0]) * largo, c0[1] + (c1[1] - c0[1]) * largo, c1[2]];
  for (const [c0, c1] of patas) {
    const fin = finDe(c0, c1), rod = mas(mez(c0, fin, 0.48), [az(a, 1.5), 0, 0]);
    cs.push(hueso(W(...c0), W(...rod), 3.8 * s, 2.3 * s), hueso(W(...rod), W(...fin), 2.2 * s, 1.5 * s));
  }
  ps.push(masa(cs, { mat, suave: 2.6 * s }));
  for (const [c0, c1] of patas) { const q = W(...finDe(c0, c1)); ps.push(a.esfera(q[0], q[1], q[2], 1.9 * s, { mat: cam ? 'ext_cuero_seco' : 'negro', tono: 0.15 })); }
  // orejas, cuernos, ojo, crin, cola
  const qc = W(cab[0] - dc[0] * 2, cab[1] - dc[1] * 2, cab[2]);
  if (tipo === 'buey') for (const sd of [-1, 1]) ps.push(a.palo(mas(qc, X([0, -2, sd * 2]), s), mas(qc, X([-2, -7, sd * 6]), s), 1.3 * s, { mat: 'ext_hueso', r1: 0.3 * s }));
  else if (tipo === 'ciervo') for (const sd of [-1, 1]) { const b0 = mas(qc, X([0, -2, sd * 2]), s), t = mas(qc, X([-6, -11, sd * 7]), s); ps.push(a.palo(b0, t, 0.75 * s, { mat: 'ext_hueso', r1: 0.4 * s }), a.palo(mez(b0, t, 0.5), mas(qc, X([0, -10, sd * 9]), s), 0.5 * s, { mat: 'ext_hueso', r1: 0.2 * s })); }
  else for (const sd of [-1, 1]) ps.push(a.palo(mas(qc, X([-1, -2, sd * 1.5]), s), mas(qc, X([-3, -5, sd * 2.5]), s), 1 * s, { mat, r1: 0.3 * s }));
  const ojo = mas(W(cab[0] + dc[0] * 2, cab[1] + dc[1] * 2, cab[2]), X([0, -1.5, 2.4]), s);
  ps.push(a.esfera(ojo[0], ojo[1], ojo[2], 0.7 * s, { mat: 'negro' }));
  if (tipo === 'caballo') for (let i = 0; i < 6; i++) { const q0 = W(17 + i * 1.8, -6 - i * 1.4, 6.5 - i * 0.3); ps.push(a.palo(q0, mas(q0, X([az(a, 1.5), -3.5, az(a, 1)]), s), 1.3 * s, { mat: 'cu_pelo_negro', r1: 0.4 * s })); }
  { const c0 = W(-20, -2, 6); ps.push(a.palo(c0, mas(c0, X([-6, 4 + az(a, 3), -4]), s), (tipo === 'caballo' ? 1.6 : 0.8) * s, { mat: tipo === 'caballo' ? 'cu_pelo_negro' : mat, r1: 0.4 * s })); }
  if (o.podrida) {
    // el costado de arriba abierto: carne seca, hueco oscuro y las costillas a la vista
    const c = W(-1, 1, 13.5), d = X([1, 0, 0]);
    ps.push(a.elipsoide(c[0], c[1], c[2], 11 * s * o.podrida, 7 * s, 2.5 * s, { mat: 'ext_carne_seca', giro: giro, tono: -0.05 }));
    ps.push(a.elipsoide(c[0], c[1], c[2] + 0.8 * s, 8.5 * s * o.podrida, 5 * s, 2 * s, { mat: 'negro', giro: giro }));
    for (let i = 0; i < 6; i++) { const q = mas(c, d, (i - 2.5) * 3.2 * s * o.podrida); const top = mas(q, X([0, -1, 4.2]), s); ps.push(a.palo(mas(q, X([0, -7, -1]), s), top, 0.65 * s, { mat: 'ext_hueso' }), a.palo(top, mas(q, X([0, 6, 0.5]), s), 0.6 * s, { mat: 'ext_hueso', r1: 0.4 * s })); }
  }
  if (o.carga) {
    // la carga se le cayó al costado del lomo: fardos, un tapete enrollado y la cuerda
    for (const [x, y] of [[-6, -17], [5, -16]] as [number, number][]) { const q = W(x, y, 4.5); ps.push(a.elipsoide(q[0], q[1], q[2], 6.5 * s, 4.8 * s, 4.5 * s, { mat: elegir(a, ['ext_tela_sucia', 'tela', 'cu_tela_parda']), giro: giro + az(a, 25), tono: az(a, 0.1) })); }
    const q = W(1, -12, 12); ps.push(a.cilindro(q[0], q[1], q[2], 3 * s, 22 * s, { mat: elegir(a, ['tela_roja', 'ext_tela_sucia', 'cu_tela_parda']), eje: X([1, 0.2, -0.1]) }));
    ps.push(a.palo(W(-12, -10, 9), W(10, -12, 10), 0.6 * s, { mat: 'cuerda' }));
  }
}
M.ext_pelo_caballo = { rampa: ['#0f0906', '#1c110b', '#2b1a10', '#3b2416', '#4c2f1c', '#5e3b24', '#70482d'], ruido: 0.35, escala: 0.9, brillo: 0.15, patron: (p) => (ruido(p[0] * 0.35, p[1] * 0.35, p[2] * 0.35) - 0.5) * 0.2 };
M.ext_pelo_negro = { rampa: ['#070707', '#0f0e0d', '#191715', '#23201d', '#2e2a26', '#3a3530'], ruido: 0.35, escala: 0.9, brillo: 0.2 };
M.ext_pelo_camello = { rampa: ['#17110b', '#271d13', '#38291b', '#4a3824', '#5c472e', '#6e5739', '#806745'], ruido: 0.4, escala: 0.9, patron: (p) => (ruido(p[0] * 0.3, p[1] * 0.3, p[2] * 0.3) - 0.5) * 0.22 };
