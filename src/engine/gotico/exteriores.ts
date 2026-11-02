import { MATERIALES } from './materiales';
import { ruido, hueso, bulto, masa, girarPiezas, type Comp, type Pieza, type V3 } from './render';
import type { Arma } from './objeto';
import { personaje, type Cuerpo, type Equipo } from './cuerpo';
import type { Dir } from './figura';

/**
 * Herramientas compartidas por los exteriores de los actos 1 a 3 (páramo, desierto y selva): suelo orgánico con matas
 * y guijarros, peñas de masa con musgo fundido, agua con gotas de lluvia, fuego, velas y humo, cadáveres tumbados
 * (los cuerpos articulados en el último cuadro de morir), cuervos y buitres de masa, cráneos, costillares, tablas
 * gastadas y telas que ondean. Todo se arma con la semilla del elemento (`a.r()`), así ninguna copia sale igual.
 */

// ------------------------------------------------------------------ materiales de los exteriores
const M = MATERIALES;
/** Grieta: el ruido "de cresta" (|ruido - 0.5| chico) traza líneas finas que se cortan como piedra partida. */
const grieta = (p: V3, k: number, ancho = 0.035) => Math.abs(ruido(p[0] * k, p[1] * k, p[2] * k) - 0.5) < ancho;
M.ext_roca = {
  rampa: ['#0f0f0e', '#1c1b19', '#2b2926', '#3c3934', '#4f4b44', '#635e55', '#787166', '#8d8576'], ruido: 0.4, escala: 0.16,
  patron: (p) => (grieta(p, 0.11) ? -0.32 : 0) + (grieta(p, 0.27, 0.03) ? -0.16 : 0) + (ruido(p[0] * 0.05, p[1] * 0.05, p[2] * 0.05) - 0.5) * 0.3 + (ruido(p[0] * 0.9, p[1] * 0.9, p[2] * 0.9) > 0.8 ? 0.1 : 0),
};
M.ext_roca_fria = {
  rampa: ['#0d0f10', '#181b1d', '#25292c', '#343a3d', '#454c4f', '#586063', '#6c7477', '#82898b'], ruido: 0.4, escala: 0.16,
  patron: (p) => (grieta(p, 0.12) ? -0.3 : 0) + (ruido(p[0] * 0.05, p[1] * 0.05, p[2] * 0.06) - 0.5) * 0.32 + (ruido(p[0] * 1.1, p[1] * 1.1, p[2] * 1.1) > 0.82 ? 0.12 : 0),
};
/** Arenisca erosionada: estratos horizontales que ondulan, con vetas más claras y grietas. */
M.ext_estratos = {
  rampa: ['#1d120b', '#2f1e12', '#442c1a', '#5b3c24', '#734e2f', '#8b613b', '#a37549', '#b98a5a'], ruido: 0.3, escala: 0.18,
  patron: (p) => { const z = p[2] + (ruido(p[0] * 0.06, p[1] * 0.06, 3) - 0.5) * 8; const b = Math.sin(z * 0.9) * 0.5 + 0.5; return (b > 0.82 ? 0.13 : b < 0.12 ? -0.2 : 0) + (Math.sin(z * 0.23 + 1) * 0.08) + (grieta(p, 0.12) ? -0.25 : 0); },
};
M.ext_estratos_rojos = {
  rampa: ['#170908', '#29110d', '#3d1a13', '#52241a', '#6a3122', '#813f2c', '#994f38', '#b06246'], ruido: 0.3, escala: 0.18,
  patron: (p) => { const z = p[2] + (ruido(p[0] * 0.05, p[1] * 0.05, 7) - 0.5) * 9; const b = Math.sin(z * 0.75) * 0.5 + 0.5; return (b > 0.85 ? 0.12 : b < 0.1 ? -0.22 : 0) + (grieta(p, 0.1) ? -0.25 : 0); },
};
/** Musgo húmedo en matas: manchas claras y huecos oscuros. */
M.ext_musgo = {
  rampa: ['#0a0f08', '#131c0f', '#1d2915', '#28371c', '#344623', '#41552b', '#4f6434'], ruido: 0.55, escala: 0.6,
  patron: (p) => (ruido(p[0] * 0.45, p[1] * 0.45, p[2] * 0.45) > 0.66 ? 0.12 : 0) + (ruido(p[0] * 1.3, p[1] * 1.3, p[2] * 1.3) < 0.28 ? -0.18 : 0),
};
M.ext_liquen = { rampa: ['#24251c', '#383929', '#4d4e37', '#626245', '#787654', '#8d8a65'], ruido: 0.5, escala: 0.9, patron: (p) => (ruido(p[0] * 1.6, p[1] * 1.6, p[2] * 1.6) > 0.6 ? 0.15 : -0.05) };
M.ext_tierra = {
  rampa: ['#0d0a07', '#18120d', '#241b13', '#30251a', '#3d3021', '#4b3b29', '#5a4732'], ruido: 0.5, escala: 0.3,
  patron: (p) => (ruido(p[0] * 0.12, p[1] * 0.12, 1) - 0.5) * 0.3 + (ruido(p[0] * 1.4, p[1] * 1.4, 2) > 0.78 ? 0.12 : 0),
};
/** Barro mojado: oscuro y con brillo de lluvia. */
M.ext_barro = { rampa: ['#0a0806', '#14100c', '#1f1812', '#2a2118', '#362b1f', '#433527'], ruido: 0.35, escala: 0.25, brillo: 0.55, patron: (p) => (ruido(p[0] * 0.2, p[1] * 0.2, 4) - 0.5) * 0.3 };
M.ext_agua_lluvia = { rampa: ['#05080b', '#0a1117', '#111b24', '#192632', '#223240', '#2d4050', '#3c5162'], ruido: 0.18, escala: 0.12, brillo: 1.1, patron: (p) => (ruido(p[0] * 0.15, p[1] * 0.15, 9) - 0.5) * 0.25 };
M.ext_espuma = { rampa: ['#2c3438', '#435054', '#5d6b70', '#7a888c', '#98a4a6', '#b8c2c3'], ruido: 0.4, escala: 0.6, brillo: 0.4 };
M.ext_pasto = {
  rampa: ['#0c1009', '#151c0f', '#1f2915', '#2a361b', '#364322', '#43512a', '#516033'], ruido: 0.45, escala: 0.8,
  patron: (p) => (ruido(p[0] * 0.3, p[1] * 0.3, p[2] * 0.6) - 0.5) * 0.3,
};
M.ext_pasto_seco = { rampa: ['#17120b', '#271f12', '#3a2e1a', '#4d3e23', '#614e2d', '#755f38', '#8a7144'], ruido: 0.45, escala: 0.8, patron: (p) => (ruido(p[0] * 0.3, p[1] * 0.3, p[2] * 0.6) - 0.5) * 0.3 };
M.ext_brezo = { rampa: ['#0f0a0f', '#1a111a', '#271a27', '#352335', '#432d43', '#523852', '#614461'], ruido: 0.6, escala: 0.9, patron: (p) => (ruido(p[0] * 0.8, p[1] * 0.8, p[2] * 0.8) > 0.65 ? 0.14 : 0) };
M.ext_brezo_flor = { rampa: ['#1d0f1f', '#2e1832', '#422346', '#572e5c', '#6c3a71', '#814886', '#965799'], ruido: 0.55, escala: 1.1, patron: (p) => (ruido(p[0] * 1.2, p[1] * 1.2, p[2] * 1.2) > 0.6 ? 0.12 : -0.04) };
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
  const comps = p.comps.map((q): Comp => (q.f === 'hueso' ? hueso(T(q.a), T(q.b), q.r0, q.r1, { mat: q.mat, tono: q.tono, k: q.k }) : { ...q, c: T(q.c), sc: T(q.sc) }));
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
  const hunde = o.hunde ?? 0.3;
  const comps: Comp[] = [bulto(L(0, 0, r[2] * (0.45 - hunde * 0.5)), [r[0] * 0.82, r[1] * 0.82, r[2] * 0.62], { giro: g + az(a, 15), incl: az(a, 8) })];
  const n = o.n ?? 5, losa = o.losa ?? 0.45;
  const caps: { p: V; d: V; s: number }[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * PI2 + az(a, 0.6), el = -0.15 + a.r() * 0.95, ce = Math.cos(el);
    const d: V = [Math.cos(t) * ce, Math.sin(t) * ce, Math.sin(el)];
    const p = L(d[0] * r[0] * 0.48, d[1] * r[1] * 0.48, r[2] * (0.42 - hunde * 0.4) + d[2] * r[2] * 0.5);
    const s = 0.42 + a.r() * 0.22;
    // la laja: aplastada a lo largo de su normal (cara casi plana hacia afuera)
    const dn = nrm([d[0] * cg - d[1] * sg + az(a, 0.25), d[0] * sg + d[1] * cg + az(a, 0.25), d[2] + az(a, 0.2)]);
    const [ex, ey, ez] = ejesDe(dn, a.r() * PI2);
    comps.push(bulto(p, [Math.min(r[0], r[1], r[2]) * s * losa * 1.4, Math.max(r[0], r[1]) * s, r[2] * s * 0.95], { ejes: [ex, ey, ez], tono: az(a, 0.05) }));
    caps.push({ p, d: dn, s });
  }
  if (o.extra) comps.push(...o.extra);
  // musgo y liquen: arriba y del lado de la lluvia
  const nm = Math.round((o.musgo ?? 0) * 6);
  for (let i = 0; i < nm; i++) {
    const t = a.r() * PI2, el = 0.45 + a.r() * 0.5, ce = Math.cos(el);
    const p = L(Math.cos(t) * ce * r[0] * 0.62, Math.sin(t) * ce * r[1] * 0.62, r[2] * (0.42 - hunde * 0.4) + Math.sin(el) * r[2] * 0.62);
    comps.push(bulto(p, [r[0] * (0.25 + a.r() * 0.2), r[1] * (0.22 + a.r() * 0.18), Math.max(1, r[2] * 0.12)], { mat: o.matMusgo ?? 'ext_musgo', giro: a.r() * 180, incl: grad(Math.cos(el)) * 0.5 * (a.r() < 0.5 ? 1 : -1), k: 0.9, tono: az(a, 0.06) }));
  }
  const nl = Math.round((o.liquen ?? 0) * 7);
  for (let i = 0; i < nl; i++) {
    const t = a.r() * PI2, el = a.r() * 1.2, ce = Math.cos(el);
    const p = L(Math.cos(t) * ce * r[0] * 0.78, Math.sin(t) * ce * r[1] * 0.78, r[2] * (0.42 - hunde * 0.4) + Math.sin(el) * r[2] * 0.6);
    comps.push(bulto(p, [1.4 + a.r() * 2.2, 1.4 + a.r() * 2.2, 0.8], { mat: 'ext_liquen', eje: [Math.cos(t), Math.sin(t), 0], k: 0.4 }));
  }
  ps.push(masa(comps, { mat: o.mat ?? 'ext_roca', suave: o.suave ?? 1.8, tono: o.tono }));
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
const PIEL = ['cu_piel', 'cu_piel_clara', 'cu_piel_morena', 'cu_piel_palida'];
const PELO = ['cu_pelo_negro', 'cu_pelo_castano', 'cu_pelo_rubio', 'cu_pelo_rojo', 'cu_pelo_blanco'];
export type TipoCadaver = 'campesino' | 'soldado' | 'mercader' | 'bandido' | 'nomada' | 'tribal' | 'explorador' | 'momificado';
/** Quién era: cuerpo y ropa del cadáver (la piel y el pelo salen de la semilla). */
export function vestido(a: Arma, tipo: TipoCadaver): [Cuerpo, Equipo] {
  const piel = tipo === 'nomada' ? elegir(a, ['cu_piel_morena', 'cu_piel']) : tipo === 'tribal' ? 'cu_piel_morena' : tipo === 'momificado' ? 'cu_piel_gris' : elegir(a, PIEL);
  const cu: Cuerpo = { piel, pelo: elegir(a, PELO), peinado: elegir(a, ['corto', 'largo', 'rapado', 'calvo', 'cola'] as const), musculo: a.r() * 0.6, grasa: a.r() * 0.4, ojos: 'cu_ojo', demacrado: tipo === 'momificado', parches: tipo === 'momificado' ? 'ext_cuero_seco' : undefined, heridas: tipo !== 'momificado' && a.r() < 0.6 };
  if (a.r() < 0.4 && tipo !== 'tribal') cu.barba = elegir(a, ['corta', 'larga', 'bigote'] as const);
  // cómo cayó: de espaldas, de costado o de bruces
  cu.presentacion = elegir(a, ['conjuro', 'apunta', 'kata', 'rugido'] as const);
  const tela = elegir(a, ['cu_tela_parda', 'cu_tela_negra', 'cu_tela_verde', 'cu_tela_roja', 'cu_tela_azul']);
  const eq: Equipo = {};
  if (tipo === 'campesino') { eq.torso = { tipo: elegir(a, ['camisa', 'tunica', 'harapos'] as const), mat: tela }; eq.piernas = { tipo: 'pantalon', mat: 'cu_tela_parda' }; eq.pies = { tipo: 'botas', mat: 'cu_cuero' }; if (a.r() < 0.4) eq.cabeza = { tipo: 'capucha', mat: tela }; }
  if (tipo === 'soldado') { eq.torso = { tipo: elegir(a, ['malla', 'cuero_tachonado'] as const), mat: 'cu_malla', mat2: 'cu_cuero' }; eq.piernas = { tipo: 'pantalon', mat: 'cu_tela_parda' }; eq.pies = { tipo: 'botas_altas', mat: 'cu_cuero' }; eq.tabardo = { mat: elegir(a, ['cu_tela_roja', 'cu_tela_azul']) }; if (a.r() < 0.6) eq.cabeza = { tipo: 'casco', mat: 'hierro_oxido' }; eq.cinturon = { mat: 'cu_cuero' }; }
  if (tipo === 'mercader') { eq.torso = { tipo: 'tunica', mat: elegir(a, ['cu_tela_morada', 'cu_tela_roja', 'cu_tela_verde']) }; eq.piernas = { tipo: 'tunica_larga', mat: 'cu_tela_parda' }; eq.pies = { tipo: 'botas', mat: 'cu_cuero' }; eq.cinturon = { mat: 'cu_cuero', hebilla: 'cu_oro' }; if (a.r() < 0.5) eq.cabeza = { tipo: 'gorro', mat: tela }; }
  if (tipo === 'bandido') { eq.torso = { tipo: 'cuero', mat: 'cu_cuero' }; eq.piernas = { tipo: 'pantalon', mat: 'cu_tela_parda' }; eq.pies = { tipo: 'botas', mat: 'cu_cuero' }; eq.cabeza = { tipo: 'capucha', mat: 'cu_tela_negra' }; }
  if (tipo === 'nomada') { eq.torso = { tipo: 'tunica', mat: elegir(a, ['cu_tela_blanca', 'cu_tela_parda', 'cu_tela_azul']) }; eq.piernas = { tipo: 'tunica_larga', mat: elegir(a, ['cu_tela_blanca', 'cu_tela_parda']) }; eq.pies = { tipo: 'sandalias', mat: 'cu_cuero' }; eq.cabeza = { tipo: 'turbante', mat: elegir(a, ['cu_tela_blanca', 'cu_tela_azul', 'cu_tela_roja']) }; }
  if (tipo === 'tribal') { eq.piernas = { tipo: 'taparrabo', mat: 'cu_cuero' }; eq.hombros = a.r() < 0.5 ? { tipo: 'huesos', mat: 'cu_hueso' } : undefined; cu.peinado = elegir(a, ['trenzas', 'cresta', 'largo'] as const); }
  if (tipo === 'explorador') { eq.torso = { tipo: 'camisa', mat: 'cu_tela_blanca' }; eq.piernas = { tipo: 'pantalon', mat: 'cu_tela_parda' }; eq.pies = { tipo: 'botas_altas', mat: 'cu_cuero' }; eq.cinturon = { mat: 'cu_cuero' }; eq.hombros = { tipo: 'cuero', mat: 'cu_cuero' }; }
  if (tipo === 'momificado') { eq.torso = { tipo: 'harapos', mat: 'ext_tela_sucia' }; eq.piernas = { tipo: 'pantalon', mat: 'ext_tela_sucia' }; }
  return [cu, eq];
}
/**
 * Cadáver tumbado: el cuerpo articulado en el último cuadro de morir, corrido para que su centro quede en `p` y
 * girado. Con charco de sangre debajo si `sangre`.
 */
export function cadaver(a: Arma, ps: Pieza[], tipo: TipoCadaver, p: V, giro: number, o: { sangre?: number; arma?: Equipo['arma'] } = {}) {
  const [cu, eq] = vestido(a, tipo);
  if (o.arma) eq.arma = o.arma;
  const dir = elegir(a, ['s', 'so', 'o', 'no', 'n', 'ne', 'e', 'se'] as Dir[]);
  const cuerpo = personaje(cu, eq, dir, 'morir', 7);
  const c = centroDe(cuerpo.filter((q) => q.k === 'masa').slice(0, 1));
  if (o.sangre) disco(a, ps, p[0] + az(a, 3), p[1] + az(a, 3), p[2] - 0.1, 9 * o.sangre, 7 * o.sangre, 0.5, 'sangre', { giro: a.r() * 180, ruido: 0.22 });
  ps.push(...mover(mover(cuerpo, [-c[0], -c[1], 0]), p, giro));
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
