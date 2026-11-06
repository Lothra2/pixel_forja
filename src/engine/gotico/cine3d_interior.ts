import { objeto, herramientas as herr } from './objeto';
import { hash3, caja, palo, poliedro, cilindro, elipsoide, esfera, hueso, bulto, masa, baseCamara, proyectar, type Pieza, type V3, type Camara } from './render';
import { MATERIALES } from './materiales';
import { EscenaCine, Terreno, hexLin, mezclar, escalar, moverPiezas, giroEje, type Atmosfera, type C3, type Particula, type Pluma } from './cine3d';
import type { Armado } from './cine3d_toma';
import type { TipoFuego } from './cine3d_valle';
/** Una escena de adentro con sus fuegos de Doom (velas, la brasa): carteles en el mundo que el horneado anima. */
export type ArmadoFuego = Armado & { fuegos: { p: V3; ancho: number; alto: number; semilla: number; tipo: TipoFuego }[] };
import './catalogo/abadia_oria';
import './catalogo/jefes';
import './catalogo/nieve2';

/**
 * Los planos de la intro que no pasan en el valle abierto, cada uno su escena 3D con la misma cámara libre, UNA luz
 * principal y la misma bruma en todo el cuadro (cine3d.ts):
 * - i02 el campanario al alba: las campanas de bronce que se mecen en su yugo, los monjes que tiran de las sogas, todo
 *   a contraluz del cielo frío que entra por los arcos, con polvo en los rayos;
 * - i03 la cripta del pozo sellado: bóveda de arista húmeda, cadenas, la tapa de piedra con bandas de hierro y el sello
 *   de cera roja, velas en nichos como única luz y niebla baja en el piso;
 * - i07 el claustro: la galería de arcos fugando, el jardín muerto con nieve y la brasa caída que humea en el piso con
 *   su luz roja; las campanas de la torre se mecen solas a lo lejos;
 * - i11 el fondo del pozo: roca y lava apagada, Ozmaren (`jefe_ozmaren`) en silueta enorme, que solo aparece con los
 *   relámpagos de arriba y cuando se le encienden los ojos.
 * El camposanto (i08) va en el valle (cine3d_valle.ts), con la abadía ardiendo de verdad al fondo.
 * Medidas del taller: una persona mide 61 (una unidad ~3 cm). z hacia arriba.
 */

const TAU = Math.PI * 2;
const sat = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const suave = (a: number, b: number, v: number) => { const t = sat((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** Azar estable 0..1. */
const az = (i: number, k = 0) => hash3(i * 31 + 7, k * 17 + 3, 577);
/** Dirección desde el rumbo (grados desde +x, contra reloj) y la elevación en grados. */
export const dirAz = (a: number, e: number): V3 => { const A = (a * Math.PI) / 180, E = (e * Math.PI) / 180; return [Math.cos(A) * Math.cos(E), Math.sin(A) * Math.cos(E), Math.sin(E)]; };
function gradiente(paradas: [number, C3][], e: number): C3 {
  let k = 0; while (k < paradas.length - 2 && e > paradas[k + 1][0]) k++;
  const [a, ca] = paradas[k], [b, cb] = paradas[k + 1];
  return mezclar(ca, cb, suave(a, b, e));
}
/** Ruido de valor 2D rápido (el mismo del valle). */
function h2(x: number, y: number, s: number) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function r2(x: number, y: number, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), si = Math.round(s * 7) + 3;
  let u = x - xi, v = y - yi; u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
  const a = h2(xi, yi, si), b = h2(xi + 1, yi, si), c = h2(xi, yi + 1, si), d = h2(xi + 1, yi + 1, si);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm2(x: number, y: number, oct: number, s = 0) { let v = 0, a = 0.5, t = 0, f = 1; for (let i = 0; i < oct; i++) { v += r2(x * f, y * f, s + i) * a; t += a; a *= 0.5; f *= 2.03; } return v / t; }

/** Cámara que mira de `pos` a `obj` con el campo visual dicho para la pantalla base (la capa sale con su margen). */
export function camaraBase(pos: V3, obj: V3, fovBase: number, w = 1408, h = 792): Camara {
  const bh = (h * 720) / 792, th = Math.tan((fovBase * Math.PI) / 360) * (h / bh);
  return { pos, obj, fov: (Math.atan(th) * 360) / Math.PI, w, h };
}

// ================================================================== materiales del cine
const M = MATERIALES;
M.ci_bronce = { rampa: ['#070403', '#120a05', '#1f1309', '#2e1d0e', '#402914', '#55371b', '#6c4723', '#86592c', '#a06d37'], ruido: 0.22, escala: 0.25, brillo: 0.55, patron: (p) => (Math.abs(Math.sin(p[2] * 0.9)) < 0.06 ? 0.08 : 0) };
M.ci_viga = { rampa: ['#050403', '#0b0806', '#120e0a', '#1a140f', '#231b14', '#2d2319'], ruido: 0.35, escala: 0.25, patron: (p, n) => { const u = Math.abs(n[2]) > 0.7 ? p[0] + p[1] : p[2]; return Math.sin(u * 2.3 + Math.sin((p[0] + p[1]) * 0.1) * 3) > 0.85 ? -0.2 : 0; } };
M.ci_soga = { rampa: ['#0c0906', '#171109', '#22190f', '#2e2215', '#3b2d1c'], ruido: 0.4, escala: 1.2 };
M.ci_tela_roja = { rampa: ['#0e0202', '#1d0504', '#2e0807', '#420c0a', '#56100d'], ruido: 0.4, escala: 1.0 };
M.ci_habito = { rampa: ['#040404', '#080707', '#0d0b0b', '#131010', '#1a1615', '#221d1b'], ruido: 0.35, escala: 0.9, patron: (p) => (Math.sin(p[0] * 0.9 + p[1] * 0.7) > 0.8 ? -0.12 : 0) };
M.ci_piel = { rampa: ['#0e0806', '#1c110c', '#2c1c14', '#3e281d', '#523627'], ruido: 0.15, escala: 0.6 };
M.ci_cera_roja = { rampa: ['#120101', '#260303', '#3e0605', '#5a0b08', '#78120c', '#951c12', '#b02a18'], ruido: 0.15, escala: 0.5, brillo: 0.55, patron: (p) => { const r = Math.hypot(p[0], p[1]); return Math.abs(r % 2.4 - 1.2) < 0.25 ? -0.18 : 0; } };
M.ci_hierro = { rampa: ['#040404', '#0a0908', '#12100e', '#1b1714', '#251f1b', '#302722', '#3d3029'], ruido: 0.4, escala: 0.6, brillo: 0.35, patron: (p) => (Math.sin(p[0] * 0.3 + p[2] * 0.5) > 0.6 ? 0.06 : 0) };
M.ci_vela = { rampa: ['#2a2318', '#463b2a', '#66573f', '#887657', '#a99671', '#c8b58e'], ruido: 0.1, escala: 0.6, brillo: 0.25 };
M.ci_llama = { rampa: ['#ff8a28', '#ffb048', '#ffd27a', '#ffeab0'], ruido: 0.1, escala: 0.5, emite: true };
M.ci_lava = { rampa: ['#140301', '#2c0602', '#4a0c04', '#6e1606', '#952208'], ruido: 0.5, escala: 0.35, emite: true };
M.ci_ojo = { rampa: ['#ff5a10', '#ff8a28', '#ffb050', '#ffd890'], ruido: 0.1, escala: 0.5, emite: true };
M.ci_roca = { rampa: ['#030303', '#070606', '#0c0b0a', '#13110f', '#1b1815', '#24201c', '#2e2924'], ruido: 0.4, escala: 0.08, brillo: 0.2, patron: (p) => (Math.abs(Math.sin(p[2] * 0.12 + Math.sin(p[0] * 0.05) * 2)) < 0.08 ? -0.15 : 0) };
M.va_brasa = { rampa: ['#3a0602', '#6a0e04', '#9a1c06', '#c8320a', '#e84c10'], ruido: 0.4, escala: 0.3, emite: true };
M.ci_labra_lisa = { rampa: ['#0f100f', '#1f221d', '#2e322c', '#3e423b', '#4e524a', '#5f635a', '#70746a', '#82857a'], ruido: 0.18, escala: 0.04, brillo: 0.1, patron: (p) => { const j = Math.abs((((p[0] + p[1]) % 38) + 38) % 38 - 19) > 18.4; return j ? -0.3 : 0; } };
M.ci_relampago = { rampa: ['#9ab8ff', '#c6d8ff', '#eaf2ff', '#ffffff'], ruido: 0.1, escala: 0.5, emite: true };

// ================================================================== piezas comunes
/**
 * Arco apuntado (equilátero) de dovelas en su plano local: el vano mide `ancho`, arranca en z = 0, la rosca tiene
 * `rosca` de canto y `fondo` de espesor (a lo largo de y). Devuelve las dovelas y el contorno del intradós (x, z).
 */
export function arcoApuntado(ancho: number, rosca: number, fondo: number, mat: string, n = 7, tono = 0): { ps: Pieza[]; perfil: [number, number][] } {
  const a = ancho / 2, R = ancho, Ro = R + rosca, tmax = Math.PI / 3, tmo = Math.acos(a / Ro), ps: Pieza[] = [], perfil: [number, number][] = [];
  for (const s of [-1, 1]) for (let i = 0; i < n; i++) {
    const u0 = i / n, u1 = (i + 1) / n, P = (r: number, t: number): [number, number] => [s * (-a + r * Math.cos(t)), r * Math.sin(t)];
    const q = [P(R, u0 * tmax), P(Ro, u0 * tmo), P(Ro, u1 * tmo), P(R, u1 * tmax)], pts: V3[] = [];
    for (const [x, z] of q) for (const y of [-fondo / 2, fondo / 2]) pts.push([x, y, z]);
    ps.push(poliedro(pts, { mat, tono: tono + (az(i * 2 + (s > 0 ? 1 : 0), 77) - 0.5) * 0.12 }));
  }
  for (let i = 0; i <= 12; i++) perfil.push([a - R + R * Math.cos((i / 12) * tmax) - (a - R + R) + a, R * Math.sin((i / 12) * tmax)]);
  return { ps, perfil };
}
/** El hueco de un vano apuntado (para restar de un muro): el rectángulo de abajo y la cabeza del arco, convexa. */
export function huecoApuntado(ancho: number, alto: number, fondo: number, z0 = 0): Pieza[] {
  const a = ancho / 2, R = ancho, pts: V3[] = [];
  for (let i = 0; i <= 10; i++) { const t = (i / 10) * (Math.PI / 3), x = -a + R * Math.cos(t), z = R * Math.sin(t); for (const s of [-1, 1]) for (const y of [-fondo, fondo]) pts.push([s * x, y, alto + z]); }
  return [caja(0, 0, z0, ancho, fondo * 2, alto - z0 + 0.5, { mat: 'abo_sillar', resta: true }), poliedro(pts, { mat: 'abo_sillar', resta: true })];
}
/** Columna gótica: basa, fuste, capitel acampanado y ábaco. */
export function columna(x: number, y: number, z: number, alto: number, r: number, mat = 'abo_labra', tono = 0): Pieza[] {
  return [
    caja(x, y, z, r * 2.9, r * 2.9, r * 0.7, { mat, tono }), cilindro(x, y, z + r * 0.7, r * 1.25, r * 0.5, { mat, tono, r1: r }),
    cilindro(x, y, z + r * 1.2, r, alto - r * 3.4, { mat: 'abo_sillar', tono: tono - 0.04 }),
    cilindro(x, y, z + alto - r * 2.2, r * 1.05, r * 1.6, { mat, tono, r1: r * 1.6 }), caja(x, y, z + alto - r * 0.6, r * 3.6, r * 3.6, r * 0.6, { mat, tono }),
  ];
}
/** Cadena de eslabones de a a b que cuelga `comba` en el medio (eslabones alternados a 90 grados). */
export function cadena(a: V3, b: V3, comba: number, eslabon = 2.6, mat = 'ci_hierro'): Pieza[] {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), n = Math.max(2, Math.round(L / (eslabon * 1.15))), ps: Pieza[] = [];
  const pt = (t: number): V3 => { const p = lerp3(a, b, t); return [p[0], p[1], p[2] - comba * 4 * t * (1 - t)]; };
  for (let i = 0; i < n; i++) {
    const p0 = pt(i / n), p1 = pt((i + 1) / n), c = lerp3(p0, p1, 0.5), e = norm([p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]]);
    const up: V3 = Math.abs(e[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1], s1 = norm([e[1] * up[2] - e[2] * up[1], e[2] * up[0] - e[0] * up[2], e[0] * up[1] - e[1] * up[0]]), s2: V3 = [e[1] * s1[2] - e[2] * s1[1], e[2] * s1[0] - e[0] * s1[2], e[0] * s1[1] - e[1] * s1[0]];
    const ancho = i % 2 ? s1 : s2, finito = i % 2 ? s2 : s1;
    // el eslabón: dos varillas y dos cabezas (se lee como anillo a la distancia)
    // el eslabón: dos varillas y sus cabezas, que se meten en el anterior y el siguiente (se lee como anillo encadenado)
    for (const s of [-1, 1]) ps.push(palo(add(add(c, e, -eslabon * 0.75), ancho, s * eslabon * 0.34), add(add(c, e, eslabon * 0.75), ancho, s * eslabon * 0.34), eslabon * 0.16, { mat }));
    for (const s of [-1, 1]) ps.push(palo(add(add(c, e, s * eslabon * 0.78), ancho, -eslabon * 0.36), add(add(c, e, s * eslabon * 0.78), ancho, eslabon * 0.36), eslabon * 0.16, { mat }));
    void finito;
  }
  return ps;
}
/** Vela de cera con su pabilo y la llama (emite). Devuelve las piezas y el punto de la llama. */
export function vela(x: number, y: number, z: number, alto: number, r: number, s: number): { ps: Pieza[]; llama: V3 } {
  const lade = (az(s, 1) - 0.5) * 6, ps: Pieza[] = [cilindro(x, y, z, r, alto, { mat: 'ci_vela', tono: (az(s, 2) - 0.5) * 0.2 })];
  // chorreaduras de cera
  for (let k = 0; k < 3; k++) { const a = az(s, k + 5) * TAU, l = alto * (0.2 + az(s, k + 8) * 0.5); ps.push(cilindro(x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92, z + alto - l, r * 0.28, l, { mat: 'ci_vela', r1: r * 0.18, tono: 0.08 })); }
  const tope = z + alto, ll: V3 = [x, y, tope + r * 1.25];
  ps.push(palo([x, y, tope], [x, y, tope + r * 0.5], 0.18, { mat: 'ci_hierro' }));
  ps.push(elipsoide(ll[0], ll[1], ll[2] - r * 0.25, r * 0.24, r * 0.24, r * 0.55, { mat: 'ci_llama', giro: lade }));
  return { ps, llama: ll };
}

/**
 * Monje de hábito y capucha (masa orgánica, para leerse en silueta): mira hacia +x, pies en el origen. `manos` en
 * coordenadas propias (las dos sobre la soga); `atras` lo echa hacia atrás (grados) al tirar.
 */
export function monje(alto: number, manos: [V3, V3], atras = 0, s = 0): Pieza[] {
  const k = alto / 61, P = (x: number, y: number, z: number): V3 => [x * k, y * k, z * k];
  const cs = [
    bulto(P(0, 0, 9), [12.5 * k, 11 * k, 10 * k], { mat: 'ci_habito' }), bulto(P(0, 0, 24), [9 * k, 8.6 * k, 14 * k], { mat: 'ci_habito' }),
    bulto(P(-0.5, 0, 39), [7.8 * k, 8.6 * k, 10 * k], { mat: 'ci_habito' }), bulto(P(-1, 0, 47.5), [5.5 * k, 10 * k, 4 * k], { mat: 'ci_habito' }),
    // la capucha: redonda sobre la cabeza y caída en punta hacia la espalda
    bulto(P(0.8, 0, 55), [5.6 * k, 5.2 * k, 6.6 * k], { mat: 'ci_habito' }), hueso(P(-2, 0, 58.5), P(-7.5, 0, 53 + az(s, 1) * 2), 3.6 * k, 0.7 * k, { mat: 'ci_habito' }),
    hueso(P(-1, 0, 50), P(-4, 0, 44), 4.5 * k, 2.5 * k, { mat: 'ci_habito' }),
    // pliegues del ruedo (rompen el borde de la silueta)
    ...[0, 1, 2, 3, 4, 5].map((i) => { const a = (i / 6) * TAU + az(s, i) * 0.6; return hueso(P(Math.cos(a) * 8, Math.sin(a) * 7, 18), P(Math.cos(a) * 12, Math.sin(a) * 10.5, 1), 1.8 * k, 2.6 * k, { mat: 'ci_habito' }); }),
  ];
  // brazos con mangas que se abren hacia las manos
  for (const [i, sy] of [[0, -1], [1, 1]] as [number, number][]) {
    const hom = P(0, sy * 8, 47), mano = manos[i], codo: V3 = [(hom[0] + mano[0]) / 2 + 1.5 * k, (hom[1] + mano[1]) / 2 + sy * 3 * k, (hom[2] + mano[2]) / 2 - 3 * k];
    cs.push(hueso(hom, codo, 2.5 * k, 2.7 * k, { mat: 'ci_habito' }), hueso(codo, add(mano, [-1.5 * k, 0, -2.5 * k]), 2.7 * k, 3.4 * k, { mat: 'ci_habito' }));
  }
  const ps: Pieza[] = [masa(cs, { mat: 'ci_habito', suave: 2.4 * k })];
  for (const m of manos) ps.push(masa([bulto(m, [2.2 * k, 1.8 * k, 2.6 * k], { mat: 'ci_piel' })], { mat: 'ci_piel', suave: 0.6 }));
  return atras ? moverPiezas(ps, giroEje([0, 1, 0], (-atras * Math.PI) / 180)) : ps;
}

/**
 * Campana de bronce colgada de su yugo, con la rueda de la soga a un costado. En coordenadas propias: el eje de giro
 * es el eje x a la altura z = 0 (los muñones), la boca hacia abajo. `R` es el radio de la boca.
 */
export function campana(R: number, s: number): Pieza[] {
  const ps: Pieza[] = [], H = R * 1.8, z0 = -R * 0.5 - H;
  // el perfil clásico (h de la boca a la corona, r en radios de la boca): el labio grueso, la boca que se abre en
  // trompeta, la cintura recta y apenas cóncava, el hombro redondo y la corona chata
  const r = (h: number) => (h < 0.05 ? 1 + 0.025 * Math.sin((h / 0.05) * Math.PI) : 0.6 + 0.4 * Math.pow(Math.max(0, 1 - (h - 0.05) / 0.55), 2.2) - 0.025 * Math.sin(Math.min(1, h / 0.86) * Math.PI));
  const N = 22, hs = Array.from({ length: N + 1 }, (_, i) => (i / N) * 0.86);
  for (let i = 0; i < N; i++) ps.push(cilindro(0, 0, z0 + hs[i] * H, r(hs[i]) * R, (hs[i + 1] - hs[i]) * H + 0.25, { mat: 'ci_bronce', r1: r(hs[i + 1]) * R, tono: i < 2 ? 0.05 : 0 }));
  // el hombro: un casquete que redondea de la cintura a la corona
  ps.push(elipsoide(0, 0, z0 + 0.86 * H, r(0.86) * R, r(0.86) * R, 0.17 * H, { mat: 'ci_bronce' }));
  // la boca hueca: se ve oscura cuando la campana se levanta hacia el ojo
  ps.push(cilindro(0, 0, z0 - 1, R * 0.9, H * 0.5, { mat: 'ci_bronce', r1: R * 0.5, resta: true }), cilindro(0, 0, z0 + H * 0.49, R * 0.5, H * 0.32, { mat: 'ci_bronce', r1: R * 0.38, resta: true }));
  // los cordones en relieve (en la boca, la cintura y bajo el hombro) y el badajo
  for (const h of [0.035, 0.11, 0.62, 0.8]) ps.push(cilindro(0, 0, z0 + h * H, r(h) * R + 0.55, 1.1, { mat: 'ci_bronce', tono: 0.1 }));
  ps.push(palo([0, 0, z0 + H * 0.78], [0, 0, z0 + H * 0.1], R * 0.045, { mat: 'ci_hierro' }), esfera(0, 0, z0 + H * 0.1, R * 0.1, { mat: 'ci_hierro' }));
  // las asas de la corona: tres arcos de bronce
  const zc = z0 + 1.03 * H;
  for (const y of [-R * 0.12, 0, R * 0.12]) for (let k = 0; k < 6; k++) { const a0 = (k / 6) * Math.PI, a1 = ((k + 1) / 6) * Math.PI, q = R * 0.17; ps.push(palo([Math.cos(a0) * q, y, zc + Math.sin(a0) * q * 1.2], [Math.cos(a1) * q, y, zc + Math.sin(a1) * q * 1.2], R * 0.045, { mat: 'ci_bronce' })); }
  // el yugo: un madero en cuña a lo largo del eje (de frente se lee como un trapecio sobre la corona), con sus flejes
  // de hierro que abrazan las asas y los muñones que salen a las chumaceras
  const zy = zc + R * 0.02, L = R * 0.62;
  ps.push(poliedro([[-L, -R * 0.46, zy], [L, -R * 0.46, zy], [-L, R * 0.46, zy], [L, R * 0.46, zy], [-L * 0.95, -R * 0.3, zy + R * 0.36], [L * 0.95, -R * 0.3, zy + R * 0.36], [-L * 0.95, R * 0.3, zy + R * 0.36], [L * 0.95, R * 0.3, zy + R * 0.36]], { mat: 'ci_viga' }));
  for (const x of [-R * 0.42, R * 0.42]) for (const sy of [-1, 1]) ps.push(palo([x, sy * R * 0.3, zy - R * 0.22], [x, sy * R * 0.4, zy + R * 0.34], R * 0.035, { mat: 'ci_hierro' }));
  ps.push(palo([-L - R * 0.5, 0, 0], [L + R * 0.3, 0, 0], R * 0.06, { mat: 'ci_hierro' }), caja(0, 0, zy + R * 0.3, L * 1.9, R * 0.5, -zy - R * 0.3 + R * 0.06, { mat: 'ci_viga', tono: -0.04 }));
  // la rueda de la soga, en un extremo del eje: dos llantas, ocho rayos y el cubo
  const xr = L + R * 0.12, rr = R * 1.15, nr = 24;
  for (const dx of [-R * 0.07, R * 0.07]) for (let i = 0; i < nr; i++) {
    const a0 = (i / nr) * TAU, a1 = ((i + 1) / nr) * TAU;
    ps.push(palo([xr + dx, Math.cos(a0) * rr, Math.sin(a0) * rr], [xr + dx, Math.cos(a1) * rr, Math.sin(a1) * rr], R * 0.038, { mat: 'ci_viga' }));
  }
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + 0.2; ps.push(palo([xr, 0, 0], [xr, Math.cos(a) * rr, Math.sin(a) * rr], R * 0.03, { mat: 'ci_viga' })); }
  ps.push(cilindro(xr - R * 0.1, 0, 0, R * 0.12, R * 0.2, { mat: 'ci_viga', eje: [1, 0, 0] }));
  void s;
  return ps;
}

// ================================================================== i02: el campanario al alba
/**
 * La campana mayor da en 1.71, 4.0 y 6.29 s: un vaivén de período 37 / 8 s (4,625 s) con el extremo en 1.71 (suena en los
 * dos extremos: 1,71 / 4,02 / 6,34, a dos centésimas de los golpes, donde la campana está casi quieta).
 */
export const CAMPANAS_I02 = { cuadros: 37, fps: 8, golpe: 1.71, amp: 0.62 };
/** Ángulo de la campana (radianes) en el segundo t: coseno con los extremos donde suena. */
export function anguloCampana(t: number, c: { cuadros: number; fps: number; golpe: number; amp: number }, fase = 0): number {
  const T = c.cuadros / c.fps;
  return c.amp * Math.cos(((t - c.golpe) / T) * TAU + fase);
}
/** El sol del alba en el campanario: bajo, entrando por el arco de la derecha. */
const SOL_I02 = dirAz(67, 5.5);
// la cámara baja: el antepecho alto llena el tercio de abajo (ahí cae la narración, sobre piedra oscura) y los monjes
// asoman la cabeza, los brazos y las sogas contra el ventanal
const CAMP_I02: { pos: V3; obj: V3; fov: number } = { pos: [-6, -200, 10], obj: [0, 190, 153], fov: 46 };
/**
 * Las campanas: centro de los muñones (el eje va a lo largo de y: se mecen de lado en el cuadro), radio de la boca y
 * fase del vaivén (la chica va a contratiempo). La rueda queda detrás de cada campana, del lado del muro.
 */
const CAMPS_I02: { c: V3; R: number; fase: number; lado: number }[] = [{ c: [0, 44, 192], R: 40, fase: 0, lado: -1 }, { c: [150, 66, 196], R: 27, fase: Math.PI, lado: -1 }, { c: [-150, 66, 198], R: 22, fase: 1.9, lado: 1 }];
/** Los monjes: lugar, alto y a qué campana tiran (se paran junto a su soga, entre la campana y el arco). */
const MONJES_I02: { x: number; y: number; alto: number; c: number }[] = [{ x: -16, y: 58, alto: 64, c: 0 }, { x: 140, y: 70, alto: 61, c: 1 }, { x: -150, y: 70, alto: 62, c: 2 }];

function atmCampanario(): Atmosfera {
  const L = SOL_I02, solC = hexLin('#ffd2a0');
  // cielo frío del alba: gris azulado arriba, celeste pálido abajo y una franja tibia muy fina en el horizonte del sol
  const pars: [number, C3][] = [[-0.2, hexLin('#3c4a5c')], [0, hexLin('#7f93a8')], [0.04, hexLin('#9fb4c6')], [0.12, hexLin('#7d93ad')], [0.35, hexLin('#3e5274')], [0.9, hexLin('#141c33')]];
  const brillo = (d: V3, e: number) => { const g = Math.max(0, dot3(d, L)); return escalar(hexLin('#ffc89a'), (0.9 * Math.pow(g, 120) + 0.25 * Math.pow(g, 14) + 0.06 * Math.pow(g, 3)) * Math.exp(-Math.max(0, e) * 7)); };
  const aire = (d: V3): C3 => { const e = Math.min(0.03, Math.max(-0.2, d[2])), b = gradiente(pars, e), gl = brillo(norm([d[0], d[1], Math.max(0, e)]), e); return [b[0] * 0.75 + gl[0] * 0.6, b[1] * 0.75 + gl[1] * 0.6, b[2] * 0.75 + gl[2] * 0.6]; };
  const cielo = (d: V3): C3 => {
    const e = Math.asin(Math.max(-1, Math.min(1, d[2])));
    const b = gradiente(pars, e), gl = brillo(d, e), g = Math.max(0, dot3(d, L));
    let c: C3 = [b[0] + gl[0] + solC[0] * 22 * Math.pow(g, 5000), b[1] + gl[1] + solC[1] * 22 * Math.pow(g, 5000), b[2] + gl[2] + solC[2] * 22 * Math.pow(g, 5000)];
    // nubes altas, finas, con el borde encendido del lado del sol
    if (d[2] > 0.01) {
      const k = 2600 / d[2], u = (d[0] * k) / 5200, v = (d[1] * k) / 2600, n = fbm2(u + (fbm2(u * 0.7, v * 0.7, 3, 4) - 0.5) * 1.2, v, 5, 3);
      const a = suave(0.52, 0.62, n) * suave(0.01, 0.06, d[2]), lz = 0.15 + Math.pow(g, 8) * 1.6;
      c = mezclar(c, [b[0] * 0.55 + 0.9 * lz * 1.0, b[1] * 0.55 + 0.62 * lz * 1.0, b[2] * 0.6 + 0.45 * lz], a * 0.85);
    }
    return c;
  };
  return {
    sol: { dir: L, c: solC, k: 3.4, ancho: 0.012 }, cielo, aire,
    ambCielo: escalar(hexLin('#4a6488'), 0.42), ambSuelo: escalar(hexLin('#2a2a30'), 0.25),
    niebla: { densidad: 1 / 9000, baja: 1 / 2600, z0: -1400, H: 260, ruido: 0.6, escalaRuido: 0.002 },
    borde: { c: hexLin('#ffd6b0'), k: 2.6 }, nieve: { albedo: [0.62, 0.66, 0.74], desde: 0.6 }, oclusion: 0.92, oclusionLargo: 420,
  };
}

/** Afuera, abajo: el valle nevado y los montes lejos (un terreno simple: el campanario está a 1500 de altura). */
function terrenoLejano(base: number): Terreno {
  const alto = (x: number, y: number) => {
    const d = Math.hypot(x, y), lejos = suave(2500, 12000, d);
    const cr = 1 - Math.abs(2 * fbm2(x / 4200, y / 4200, 5, 31) - 1);
    return base + (fbm2(x / 1600, y / 1600, 4, 32) - 0.5) * 300 + lejos * (cr * cr * 2600 + fbm2(x / 9000, y / 9000, 3, 33) * 1800);
  };
  return new Terreno({
    alto, techo: base + 5000, grillas: [[-40000, -2000, 40000, 60000, 120]],
    superficie: (p, n) => { const roca = suave(0.35, 0.55, 1 - n[2] + (fbm2(p[0] / 300, p[1] / 300, 3, 34) - 0.5) * 0.3); return { albedo: mezclar([0.6, 0.64, 0.72], [0.03, 0.03, 0.035], roca), brillo: 0.05 }; },
  });
}

/** La sala de las campanas: muros de sillar, tres arcos al este hasta un antepecho bajo, el piso de tablones y las vigas. */
function salaCampanas(esc: EscenaCine) {
  // muro del fondo (y = 170) con tres vanos apuntados; muros laterales, techo y piso
  const muro: Pieza[] = [caja(0, 0, -40, 540, 46, 600, { mat: 'abo_sillar' })];
  for (const x of [-162, 0, 162]) muro.push(...huecoApuntado(132, 316, 40, 62).map((p) => moverPiezas([p], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [0, 0, 0], [x, 0, 0])[0]));
  esc.poner(muro, { x: 0, y: 190, z: 0 });
  for (const x of [-162, 0, 162]) {
    const { ps } = arcoApuntado(132, 13, 50, 'abo_labra', 8);
    esc.poner(ps, { x, y: 190, z: 316 });
    // antepecho con su remate y las jambas molduradas
    esc.poner([caja(0, 0, 0, 134, 52, 60, { mat: 'abo_sillar' }), caja(0, 0, 60, 140, 58, 4, { mat: 'abo_labra' }), caja(-68, 0, 64, 8, 52, 252, { mat: 'abo_labra' }), caja(68, 0, 64, 8, 52, 252, { mat: 'abo_labra' })], { x, y: 190, z: 0 });
  }
  esc.poner([caja(-290, 0, -40, 50, 520, 640, { mat: 'abo_sillar' }), caja(290, 0, -40, 50, 520, 640, { mat: 'abo_sillar' }), caja(0, -300, -40, 620, 40, 640, { mat: 'abo_sillar' })], { x: 0, y: 0, z: 0 });
  esc.poner([caja(0, 0, 540, 640, 560, 40, { mat: 'abo_sillar' })], { x: 0, y: 0, z: 0 });
  // piso de tablones con juntas
  const piso: Pieza[] = [];
  for (let i = -14; i <= 14; i++) piso.push(caja(i * 19, -40, -6, 18.4, 460, 6, { mat: 'ci_viga', tono: (az(i, 3) - 0.5) * 0.25 }));
  esc.ponerMundo(piso, { nieve: 0 });
  // el marco de las campanas: pies derechos, soleras y tornapuntas, y las vigas del techo que cruzan la luz
  const marco: Pieza[] = [];
  // el marco: dos soleras de muro a muro a la altura de los muñones (adelante y atrás de las campanas) y los pies derechos contra los muros
  // solo la solera de atrás (la de adelante cruzaría las campanas): los muñones descansan en sus chumaceras
  for (const y of [130]) marco.push(caja(0, y, 176, 560, 12, 14, { mat: 'ci_viga', tono: (az(y, 4) - 0.5) * 0.2 }));
  
  for (const x of [-252, 252]) for (const y of [130]) { marco.push(caja(x, y, 0, 15, 15, 190, { mat: 'ci_viga' })); marco.push(palo([x, y, 110], [x + (x < 0 ? 48 : -48), y, 176], 3.8, { mat: 'ci_viga' })); }
  for (const y of [-200, -110, 260]) marco.push(caja(0, y, 500, 580, 16, 18, { mat: 'ci_viga', tono: -0.05 }));
  esc.ponerMundo(marco, { nieve: 0 });
}

/** Dónde baja la soga de cada campana (de la rueda, tangente al costado) y cuánto bajó en el instante t. */
function sogaCampana(c: { c: V3; R: number; fase: number; lado: number }, t: number) {
  const ang = anguloCampana(t, CAMPANAS_I02, c.fase), rr = c.R * 1.15;
  return { ang, x: c.c[0] + c.lado * rr, y: c.c[1] + c.R * 0.74, zTope: c.c[2] - c.R * 0.05, baja: -c.lado * ang * rr };
}
/** Lo que se mueve en i02 en el instante t: las dos campanas en su vaivén o los monjes que tiran de sus sogas. */
function movilesCampanario(esc: EscenaCine, t: number, que: 'campanas' | 'monjes') {
  if (que === 'campanas') CAMPS_I02.forEach((c, i) => {
    const { ang } = sogaCampana(c, t), ps = moverPiezas(campana(c.R, i), giroEje([0, 0, 1], Math.PI / 2));
    esc.moviles.add(esc.ponerMundo(moverPiezas(ps, giroEje([0, 1, 0], ang), [0, 0, 0], c.c), { nieve: 0 }));
  });
  else MONJES_I02.forEach((m, i) => {
    const sg = sogaCampana(CAMPS_I02[m.c], t), k = m.alto / 61;
    // el monje mira a su soga; las manos sobre ella, arriba de la cabeza cuando la soga sube, al pecho cuando baja
    const ga = Math.atan2(sg.y - m.y, sg.x - m.x), dl = Math.hypot(sg.x - m.x, sg.y - m.y) / k, zm = 66 - sg.baja / k * 0.95 + (i === 2 ? -5 : 0);
    const atras = 4 + Math.max(0, sg.baja) * 0.35, loc = (z: number): V3 => [dl, 0, z];
    esc.moviles.add(esc.poner(monje(m.alto, [loc(zm + 8), loc(zm - 3)], atras, i), { x: m.x, y: m.y, z: 0, giro: (ga * 180) / Math.PI }));
    // la soga: de la rueda a las manos, con la empuñadura de lana y la cola que arrastra
    const zz = zm * k;
    esc.moviles.add(esc.ponerMundo([
      palo([sg.x, sg.y, 132], [sg.x, sg.y, zz + 14], 0.9, { mat: 'ci_soga' }),
      masa([hueso([sg.x, sg.y, zz + 20], [sg.x, sg.y, zz - 6], 2.1, 2.1, { mat: 'ci_tela_roja' })], { mat: 'ci_tela_roja', suave: 0.5 }),
      palo([sg.x, sg.y, zz - 6], [sg.x + 6, sg.y - 5, 1.5], 0.85, { mat: 'ci_soga' }),
    ], { nieve: 0 }));
  });
}

export function armarCampanario(w = 1408, h = 792, o: { t?: number; mover?: 'campanas' | 'monjes' } = {}): Armado {
  const esc = new EscenaCine(), t = o.t ?? CAMPANAS_I02.golpe;
  esc.terreno = terrenoLejano(-1500);
  salaCampanas(esc);
  // la soga de arriba (del tope de la rueda al techo de lo que se mueve) queda quieta: una soga que corre no se ve correr
  for (const c of CAMPS_I02) { const sg = sogaCampana(c, 0); esc.ponerMundo([palo([sg.x, sg.y, sg.zTope], [sg.x, sg.y, 96], 0.9, { mat: 'ci_soga' })], { nieve: 0 }); }
  // lo que se mueve: si no se pide, las dos cosas en su pose del instante t (para la vista quieta del fondo no cuentan)
  if (!o.mover || o.mover === 'campanas') movilesCampanario(esc, t, 'campanas');
  if (!o.mover || o.mover === 'monjes') movilesCampanario(esc, t, 'monjes');
  if (o.mover === 'campanas') { /* los monjes de la pose del cuadro no hacen falta en el recorte de las campanas */ }
  // polvo quieto en el aire: solo brilla el que está en la luz que entra por los arcos (se mira contra la escena)
  const polvo: Particula[] = [], L = SOL_I02, bvh = esc.bvh;
  for (let i = 0; i < 2400 && polvo.length < 260; i++) {
    const p: V3 = [-250 + az(i, 1) * 500, -150 + az(i, 2) * 320, 4 + az(i, 3) * 330];
    if (bvh.golpe(p, L, 0.1, 3000)) continue;
    polvo.push({ p, r: 0.12 + az(i, 4) * 0.14, c: escalar(hexLin('#ffdcb8'), 0.35 + az(i, 5) * 0.9), a: 1, suma: true });
  }
  // el sol que pega en el piso junto a los arcos rebota hacia arriba: apenas despega el bronce de la pared
  esc.luces.push({ p: [40, 150, 8], c: hexLin('#9aa4b8'), k: 0.12, r: 160, envuelve: 0.2 });
  const atm = atmCampanario(), C = CAMP_I02;
  return { esc, atm, cam: camaraBase(C.pos, C.obj, C.fov, w, h), polvo };
}
/** Los recortes de lo que se mueve en i02 (px de la capa de 1408 x 792): las campanas arriba, los monjes abajo. */
export const CAJAS_I02 = { campanas: [200, 40, 1330, 450] as [number, number, number, number], monjes: [180, 330, 1230, 792] as [number, number, number, number] };

// ================================================================== los muertos que se levantan (i08)
export type PoseMuerto = 'brazo' | 'medio' | 'arrastra' | 'parado' | 'encorvado';
/**
 * Un muerto seco y retorcido (masa de huesos finos: nada abultado), mirando hacia +x con el piso en z = 0. Según la
 * pose sale de la tierra (lo que queda bajo z = 0 lo tapa el terreno): un brazo y la cabeza, medio cuerpo arqueado,
 * arrastrándose, o ya parado y encorvado.
 */
export function muertoSeco(pose: PoseMuerto, s: number, alto = 61): Pieza[] {
  const k = alto / 61, r = (i: number) => az(s * 13 + i, 211) - 0.5, P = (x: number, y: number, z: number): V3 => [x * k, y * k, z * k];
  // puntos clave (en unidades de una persona de 61): pelvis, pecho, cuello, cabeza, hombros, codos, manos, rodillas y pies
  let pel = P(0, 0, 30), pec = P(2, 0, 47), cue = P(4, 0, 54), cab = P(6, 0, 58), cod: [V3, V3], man: [V3, V3], rod: [V3, V3], pie: [V3, V3];
  const hom = (lado: number): V3 => [pec[0] - 1 * k, lado * 7.5 * k, pec[2] + 3 * k];
  if (pose === 'brazo') {
    pel = P(0, 0, -26); pec = P(3, 0, -6); cue = P(6 + r(1) * 4, 2, 2); cab = P(8 + r(2) * 3, 3, 6);
    cod = [P(4, -10, 14), P(10, 9, -2)]; man = [P(2 + r(3) * 6, -13, 34 + r(4) * 6), P(16, 13, 3)]; rod = [P(0, -5, -40), P(0, 5, -40)]; pie = [P(0, -5, -58), P(0, 5, -58)];
  } else if (pose === 'medio') {
    pel = P(0, 0, -8); pec = P(-4, 0, 12); cue = P(-6, 0, 19); cab = P(-6 + r(1) * 3, r(2) * 3, 24);
    cod = [P(4, -14, 22), P(6, 15, 18)]; man = [P(14, -16, 34 + r(3) * 6), P(18, 18, 26 + r(4) * 8)]; rod = [P(8, -5, -22), P(8, 5, -22)]; pie = [P(0, -5, -38), P(0, 5, -38)];
  } else if (pose === 'arrastra') {
    pel = P(-14, 0, 1); pec = P(4, 0, 8); cue = P(11, 0, 12); cab = P(15, r(1) * 3, 15);
    cod = [P(14, -12, 4), P(4, 12, 14)]; man = [P(26, -14, 1), P(12, 16, 2)]; rod = [P(-26, -4, -4), P(-24, 6, -6)]; pie = [P(-38, -4, -10), P(-36, 6, -12)];
  } else if (pose === 'parado') {
    pel = P(0, 0, 30); pec = P(5, 0, 45); cue = P(10, 0, 50); cab = P(13, r(1) * 3, 52);
    cod = [P(6, -10, 30), P(10, 10, 32)]; man = [P(14, -10, 16 + r(2) * 6), P(18, 11, 20 + r(3) * 6)]; rod = [P(3, -5, 16), P(-2, 5, 15)]; pie = [P(-1, -6, 0), P(4, 6, 0)];
  } else {
    // encorvado: doblado hacia adelante, un brazo colgando hasta el suelo y el otro que se estira
    pel = P(0, 0, 27); pec = P(10, 0, 38); cue = P(16, 0, 40); cab = P(20, r(1) * 3, 39);
    cod = [P(14, -10, 26), P(22, 9, 40)]; man = [P(16, -11, 6), P(34, 12, 42 + r(2) * 6)]; rod = [P(4, -5, 14), P(-4, 5, 13)]; pie = [P(-2, -6, 0), P(2, 6, 0)];
  }
  const cs = [
    // columna torcida: tres tramos con un quiebre al costado, costillas marcadas por un pecho hundido
    hueso(pel, lerp3(pel, pec, 0.5), 3.6 * k, 2.4 * k), hueso(add(lerp3(pel, pec, 0.5), [0, r(5) * 3 * k, 0]), pec, 2.4 * k, 4.4 * k),
    bulto(pec, [3.6 * k, 6.2 * k, 4.6 * k], { eje: [pec[0] - pel[0], pec[1] - pel[1], pec[2] - pel[2]] }), hueso(pec, cue, 1.6 * k, 1.3 * k),
    // el cráneo con la quijada caída y el pelo ralo
    bulto(cab, [3.6 * k, 3.1 * k, 3.9 * k], { eje: [cab[0] - cue[0], cab[1] - cue[1], cab[2] - cue[2] + 0.001] }), hueso(cab, add(cab, P(2.5, 0, -3.5)), 1.4 * k, 0.9 * k),
    hueso(add(cab, P(-1.5, 0, 2)), add(cab, P(-6, r(6) * 4, -6)), 0.6 * k, 0.15 * k), hueso(add(cab, P(-1, 1, 2)), add(cab, P(-5, 4 + r(7) * 3, -8)), 0.5 * k, 0.12 * k),
    hueso(pel, add(pel, P(0, -3.5, -1)), 3 * k, 2.4 * k), hueso(pel, add(pel, P(0, 3.5, -1)), 3 * k, 2.4 * k),
  ];
  for (const i of [0, 1]) {
    const lado = i ? 1 : -1, h = hom(lado), m = man[i], c = cod[i];
    cs.push(hueso(pec, h, 2.4 * k, 1.8 * k), hueso(h, c, 1.7 * k, 1.3 * k), hueso(c, m, 1.3 * k, 0.9 * k));
    // dedos largos como garras
    const d = norm([m[0] - c[0], m[1] - c[1], m[2] - c[2]]);
    for (let f = 0; f < 4; f++) { const ab: V3 = [d[0] + r(10 + f + i * 4) * 0.9, d[1] + (f - 1.5) * 0.35 * lado, d[2] + r(20 + f + i * 4) * 0.9]; cs.push(hueso(m, add(m, norm(ab), 5.5 * k), 0.55 * k, 0.15 * k)); }
    const pc: V3 = add(pel, P(0, lado * 4, -1)), ro = rod[i], pi = pie[i];
    cs.push(hueso(pc, ro, 2.3 * k, 1.5 * k), hueso(ro, pi, 1.5 * k, 1.1 * k), hueso(pi, add(pi, P(5, 0, 0)), 1.2 * k, 0.8 * k));
  }
  // jirones de mortaja que cuelgan de la cintura y los hombros
  const ps: Pieza[] = [masa(cs, { mat: 'ci_muerto', suave: 1.1 * k })];
  for (let j = 0; j < 4; j++) { const o = lerp3(pel, pec, az(s, j + 40)), a = (j / 4) * TAU; ps.push(cilindro(o[0] + Math.cos(a) * 3 * k, o[1] + Math.sin(a) * 4 * k, o[2] - 10 * k, 0.5 * k, 10 * k, { mat: 'ci_mortaja', r1: 2.2 * k })); }
  return ps;
}
M.ci_muerto = { rampa: ['#050403', '#0b0907', '#13100c', '#1c1712', '#261f18', '#30271f'], ruido: 0.4, escala: 0.8, brillo: 0.2 };
M.ci_mortaja = { rampa: ['#0b0a09', '#151311', '#201d1a', '#2b2723', '#37322c'], ruido: 0.5, escala: 1.2 };
/** Lápida de remate redondo (o en punta), algo hundida y torcida; `rota` le saca un pedazo. */
export function lapida(s: number, alto: number, ancho: number, rota = false): Pieza[] {
  const g = 6 + az(s, 1) * 3, ps: Pieza[] = [caja(0, 0, -10, ancho, g, alto - ancho / 2 + 10, { mat: 'abo_sillar', tono: (az(s, 2) - 0.5) * 0.15 })];
  if (az(s, 3) < 0.6) ps.push(cilindro(0, -g / 2, alto - ancho / 2, ancho / 2, g, { mat: 'abo_sillar', eje: [0, 1, 0], tono: (az(s, 2) - 0.5) * 0.15 }));
  else ps.push(poliedro([[-ancho / 2, -g / 2, alto - ancho / 2], [ancho / 2, -g / 2, alto - ancho / 2], [-ancho / 2, g / 2, alto - ancho / 2], [ancho / 2, g / 2, alto - ancho / 2], [0, -g / 2, alto], [0, g / 2, alto]], { mat: 'abo_sillar' }));
  if (rota) ps.push(poliedro([[ancho * 0.1, -g, alto + 2], [ancho * 0.7, -g, alto * 0.55], [ancho * 0.7, -g, alto + 2], [ancho * 0.1, g, alto + 2], [ancho * 0.7, g, alto * 0.55], [ancho * 0.7, g, alto + 2]], { mat: 'abo_sillar', resta: true }));
  return moverPiezas(ps, giroEje([1, 0, 0], (az(s, 4) - 0.5) * 0.35));
}
/** Cruz de piedra (o de madera, más fina), inclinada. */
export function cruz(s: number, alto: number, madera = false): Pieza[] {
  const g = madera ? 3.5 : 6, mat = madera ? 'ci_viga' : 'abo_sillar', b = alto * 0.42;
  const ps: Pieza[] = [caja(0, 0, -12, g, g, alto + 12, { mat }), caja(0, 0, alto * 0.62, b, g, g, { mat })];
  if (!madera && az(s, 1) < 0.5) for (let i = 0; i < 8; i++) { const a0 = (i / 8) * TAU, a1 = ((i + 1) / 8) * TAU, R = b * 0.3, c: V3 = [0, 0, alto * 0.62 + g / 2]; ps.push(palo([Math.cos(a0) * R, 0, c[2] + Math.sin(a0) * R], [Math.cos(a1) * R, 0, c[2] + Math.sin(a1) * R], 1.3, { mat })); }
  if (!madera) ps.push(caja(0, 0, -4, g * 2.6, g * 2.6, 6, { mat: 'abo_labra' }));
  return moverPiezas(ps, giroEje(norm([az(s, 2) - 0.5, az(s, 3) - 0.5, 0.0001]), 0.08 + az(s, 4) * 0.22));
}

// ================================================================== i03: la cripta del pozo sellado
M.ci_losa = { rampa: ['#060606', '#0c0c0b', '#131312', '#1b1a18', '#24231f', '#2e2c27', '#393630'], ruido: 0.3, escala: 0.2, brillo: 0.3, patron: (p) => { const jx = Math.abs(((p[0] % 48) + 48) % 48 - 24) > 23.2, jy = Math.abs(((p[1] + (Math.floor(p[0] / 48) % 2) * 20) % 40 + 40) % 40 - 20) > 19.2; return (jx || jy ? -0.35 : 0) + (fbm2(p[0] / 30, p[1] / 30, 2, 5) - 0.5) * 0.25; } };
/** Arco de medio punto de dovelas (plano local xz, de x = -a a a, arranque en z = 0). */
export function arcoMedio(a: number, rosca: number, fondo: number, mat: string, n = 9): Pieza[] {
  const ps: Pieza[] = [];
  for (let i = 0; i < n; i++) {
    const t0 = Math.PI * (i / n), t1 = Math.PI * ((i + 1) / n), pts: V3[] = [];
    for (const [r, t] of [[a, t0], [a + rosca, t0], [a + rosca, t1], [a, t1]] as [number, number][]) for (const y of [-fondo / 2, fondo / 2]) pts.push([Math.cos(t) * r, y, Math.sin(t) * r]);
    ps.push(poliedro(pts, { mat, tono: (az(i, 88) - 0.5) * 0.12 }));
  }
  return ps;
}
const CRIPTA = { lado: 320, bahia: 107, arranque: 150, col: 13 };
/** El sello en el centro de la tapa (z de la cara de arriba de la tapa). */
const SELLO_I03: V3 = [0, 0, 43];
export function armarCripta(w = 1408, h = 792): ArmadoFuego {
  const esc = new EscenaCine(), fuegos: ArmadoFuego['fuegos'] = [], C = CRIPTA, B = C.bahia, Z = C.arranque;
  // piso de losas, muros con nichos, bóvedas de arista sobre nueve tramos (bloque macizo menos dos familias de cilindros)
  esc.ponerMundo([caja(0, 0, -20, C.lado * 2 + 80, C.lado * 2 + 80, 20, { mat: 'ci_losa' })], { nieve: 0 });
  const techo: Pieza[] = [caja(0, 0, Z, C.lado * 2 + 40, C.lado * 2 + 40, 260, { mat: 'abo_sillar' })];
  for (const k of [-2, 0, 2]) {
    techo.push(cilindro(-C.lado - 40, k * B, Z, B, C.lado * 2 + 80, { mat: 'abo_sillar', eje: [1, 0, 0], resta: true }));
    techo.push(cilindro(k * B, -C.lado - 40, Z, B, C.lado * 2 + 80, { mat: 'abo_sillar', eje: [0, 1, 0], resta: true }));
  }
  esc.ponerMundo(techo, { nieve: 0 });
  // arcos fajones sobre las líneas de columnas (lo que hace leer la bóveda)
  for (const k of [-1, 1]) for (const j of [-2, 0, 2]) {
    esc.poner(arcoMedio(B - 9, 9, 22, 'abo_labra'), { x: k * B, y: j * B, z: Z, giro: 90 });
    esc.poner(arcoMedio(B - 9, 9, 22, 'abo_labra'), { x: j * B, y: k * B, z: Z, giro: 0 });
  }
  // las cuatro columnas del tramo del pozo y medias columnas contra los muros
  for (const x of [-B, B]) for (const y of [-B, B]) esc.ponerMundo(columna(x, y, 0, Z, C.col), { nieve: 0 });
  // muros: macizos con nichos (vano de medio punto) donde arden las velas
  const nichos: { p: V3; giro: number }[] = [];
  for (const [nx, ny, giro] of [[1, 0, 0], [-1, 0, 180], [0, 1, 90], [0, -1, 270]] as [number, number, number][]) {
    const muro: Pieza[] = [caja(0, 0, -20, 40, C.lado * 2 + 40, Z + 280, { mat: 'abo_sillar' })];
    for (const j of [-2, 0, 2]) for (const dz of [0]) {
      // el nicho: rectángulo y cabeza de medio punto, hondo 18
      muro.push(caja(-2, j * B, 46 + dz, 38, 30, 40, { mat: 'abo_sillar', resta: true }), cilindro(-22, j * B, 86 + dz, 15, 38, { mat: 'abo_sillar', eje: [1, 0, 0], resta: true }));
      const a = (giro * Math.PI) / 180;
      nichos.push({ p: [nx * (C.lado + 8) - Math.sin(a) * j * B, ny * (C.lado + 8) + Math.cos(a) * j * B, 46], giro });
      void dz;
    }
    // el muro está en coordenadas propias mirando a +x (el interior); se gira y se pone a lado
    esc.poner(muro, { x: nx * (C.lado + 20) + (nx ? 0 : 0), y: ny * (C.lado + 20), z: 0, giro });
  }
  // el pozo: brocal de sillares, la tapa de piedra, las bandas de hierro remachadas y el sello de cera roja
  const pozo: Pieza[] = [cilindro(0, 0, 0, 62, 34, { mat: 'abo_sillar' }), cilindro(0, 0, 33, 64, 4, { mat: 'abo_labra' })];
  for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.6; pozo.push(caja(Math.cos(a) * 62, Math.sin(a) * 62, 10, 18, 22, 16, { mat: 'abo_sillar', giro: (a * 180) / Math.PI, resta: true })); }
  esc.ponerMundo(pozo, { nieve: 0 });
  const tapa: Pieza[] = [cilindro(0, 0, 37, 56, 5, { mat: 'abo_losa', r1: 54 })];
  for (const g of [20, 110]) {
    const a = (g * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
    tapa.push(caja(0, 0, 42, 118, 8, 1.6, { mat: 'ci_hierro', giro: g }));
    for (const s of [-1, 1]) {
      tapa.push(caja(s * 60 * ca, s * 60 * sa, 14, 1.8, 8, 28, { mat: 'ci_hierro', giro: g }));
      for (const d of [20, 38, 52]) tapa.push(esfera(s * d * ca, s * d * sa, 43.6, 1.2, { mat: 'ci_hierro' }));
      // argollas para las cadenas
      tapa.push(cilindro(s * 64 * ca, s * 64 * sa, 22, 4, 1.4, { mat: 'ci_hierro', eje: [-sa, ca, 0] }));
    }
  }
  // el sello: disco de cera con su escudo en relieve y chorreaduras sobre el hierro
  tapa.push(cilindro(0, 0, 43.4, 10, 2.4, { mat: 'ci_cera_roja', r1: 9.4 }), cilindro(0, 0, 45.6, 6.5, 0.8, { mat: 'ci_cera_roja', r1: 6, tono: 0.1 }));
  for (let i = 0; i < 5; i++) { const a = az(i, 120) * TAU, l = 6 + az(i, 121) * 10; tapa.push(elipsoide(Math.cos(a) * (9 + l / 2), Math.sin(a) * (9 + l / 2), 43, l / 2, 2 + az(i, 122) * 1.5, 1.1, { mat: 'ci_cera_roja', giro: (a * 180) / Math.PI })); }
  esc.ponerMundo(tapa, { nieve: 0 });
  // cadenas: de las columnas a las argollas de la tapa, y una gruesa que baja de la clave de la bóveda
  const anillas: V3[] = [];
  for (const g of [20, 110]) for (const s of [-1, 1]) { const a = (g * Math.PI) / 180; anillas.push([s * 66 * Math.cos(a), s * 66 * Math.sin(a), 22]); }
  const cols: V3[] = [[-B, -B, 120], [B, -B, 120], [B, B, 120], [-B, B, 120]];
  anillas.forEach((an, i) => { const c = cols.reduce((m, q) => (Math.hypot(q[0] - an[0], q[1] - an[1]) < Math.hypot(m[0] - an[0], m[1] - an[1]) ? q : m), cols[0]); esc.ponerMundo(cadena([c[0] - Math.sign(c[0]) * 12, c[1] - Math.sign(c[1]) * 12, c[2]], an, 22 + i * 4, 2.8), { nieve: 0 }); });
  esc.ponerMundo(cadena([0, 0, Z + B - 4], [0, 0, 47], 0.1, 3.4), { nieve: 0 });
  esc.ponerMundo([cilindro(0, 0, 44, 3.6, 2, { mat: 'ci_hierro', eje: [1, 0, 0] })], { nieve: 0 });
  // las velas: en cada nicho, y unas pocas metidas en los huecos del brocal (las que alumbran el sello de cerca)
  const luzVela = hexLin('#ffa458');
  const ponerVela = (x: number, y: number, z: number, alto: number, r: number, s: number, k: number) => {
    const v = vela(x, y, z, alto, r, s); esc.ponerMundo(v.ps, { nieve: 0 });
    esc.luces.push({ p: [v.llama[0], v.llama[1], v.llama[2] + 1.5], c: luzVela, k, r: 30, sombra: true, envuelve: 0.25, halo: 0.0007 });
    fuegos.push({ p: [v.llama[0], v.llama[1], v.llama[2] - r * 0.4], ancho: r * 1.5, alto: r * 4.2, semilla: 300 + s, tipo: 'vela' });
  };
  nichos.forEach((n, i) => { for (let j = 0; j < 2 + (i % 2); j++) { const a = (n.giro * Math.PI) / 180, lat = (j - 0.8) * 8; ponerVela(n.p[0] - Math.sin(a) * lat, n.p[1] + Math.cos(a) * lat, n.p[2], 10 + az(i * 3 + j, 130) * 14, 2.2, i * 3 + j, 0.9); } });
  for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.6; ponerVela(Math.cos(a) * 60, Math.sin(a) * 60, 3, 6 + az(i, 140) * 5, 2, 60 + i, 1.0); }
  // tres cabos de vela sobre la tapa, junto al sello, en su charco de cera: lo único que lo alumbra de cerca
  for (const [x, y, al, s] of [[-17, 8, 5, 70], [-13, -14, 3.5, 71], [16, 17, 7, 72]] as [number, number, number, number][]) { esc.ponerMundo([cilindro(x, y, 42, 4.2, 0.8, { mat: 'ci_vela', r1: 3.6 })], { nieve: 0 }); ponerVela(x, y, 42.5, al, 1.6, s, 0.7); }
  for (const [x, y, n] of [[-150, 60, 3], [140, -130, 4], [70, 170, 2]] as [number, number, number][]) for (let j = 0; j < n; j++) ponerVela(x + (az(j + x, 141) - 0.5) * 18, y + (az(j + y, 142) - 0.5) * 18, 0, 5 + az(j, 143) * 14, 2.3, 80 + j + x, 0.8);
  // aire de cripta: oscuro y quieto; la niebla se junta a ras del piso
  const aire: C3 = [0.011, 0.0095, 0.0085];
  const atm: Atmosfera = {
    sol: { dir: [0, 0, 1], c: [0, 0, 0], k: 0 }, cielo: () => [0, 0, 0], aire: () => aire,
    ambCielo: [0.0016, 0.0016, 0.002], ambSuelo: [0.001, 0.0009, 0.0008],
    niebla: { densidad: 1 / 5000, baja: 1 / 75, z0: 0, H: 8, ruido: 0.8, escalaRuido: 0.014 },
    borde: { c: luzVela, k: 0.8 }, oclusion: 0.95, oclusionLargo: 200,
  };
  const cam = camaraBase([-48, -262, 150], [SELLO_I03[0] + 4, SELLO_I03[1] + 10, SELLO_I03[2] - 18], 44, w, h);
  return { esc, atm, cam, fuegos };
}

// ================================================================== i07: el claustro
/** Las campanas de la torre suenan solas en 0.67, 3.33 y 6.0 s: vaivén de 64 / 12 s con el extremo en 0.67. */
export const CAMPANAS_I07 = { cuadros: 64, fps: 12, golpe: 0.67, amp: 0.5 };
const CLA = { g: 190, ancho: 124, alto: 214, bahia: 63.3 };
/** La brasa caída en el jardín, hundida en la nieve junto a la arcada. */
const BRASA_I07: V3 = [50, -14, 8];
/** La torre de las campanas (detrás de la galería del norte) y sus dos campanas. */
const TORRE_I07 = { x: 70, y: 330, ancho: 96, alto: 430, vano: 300 };
const CAMPS_I07: { c: V3; R: number; fase: number }[] = [{ c: [52, 330, 358], R: 17, fase: 0 }, { c: [94, 330, 358], R: 13, fase: 2.4 }];
const CAM_I07: { pos: V3; obj: V3; fov: number } = { pos: [30, -302, 70], obj: [44, 200, 150], fov: 70 };

/**
 * El par de columnillas de una arcada del claustro, con volumen: plinto, basa con su toro, fustes, capitel de hojas
 * que se enroscan (crochets) y un ábaco común a las dos.
 */
function columnillas(x: number, z: number, alto: number, r: number, s: number): Pieza[] {
  const ps: Pieza[] = [caja(x, 0, z, r * 7.4, r * 3.4, r * 0.9, { mat: 'abo_labra', tono: -0.04 })];
  for (const dx of [-r * 1.3, r * 1.3]) {
    const cx = x + dx, t = (az(s + Math.round(dx * 10), 9) - 0.5) * 0.08;
    ps.push(cilindro(cx, 0, z + r * 0.9, r * 1.45, r * 0.45, { mat: 'abo_labra', r1: r * 1.35, tono: t }), elipsoide(cx, 0, z + r * 1.55, r * 1.38, r * 1.38, r * 0.42, { mat: 'abo_labra', tono: t }));
    ps.push(cilindro(cx, 0, z + r * 1.8, r * 1.02, alto - r * 5.4, { mat: 'abo_labra', r1: r * 0.94, tono: t + 0.03 }));
    ps.push(cilindro(cx, 0, z + alto - r * 3.6, r * 1.12, r * 0.35, { mat: 'abo_labra', tono: t }));
    ps.push(cilindro(cx, 0, z + alto - r * 3.25, r * 0.95, r * 2.4, { mat: 'abo_labra', r1: r * 1.65, tono: t }));
    // las hojas del capitel, que se enroscan hacia afuera bajo el ábaco
    for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + az(s, k) * 0.3, rr = r * 1.45; ps.push(elipsoide(cx + Math.cos(a) * rr, Math.sin(a) * rr, z + alto - r * 1.25, r * 0.55, r * 0.55, r * 0.75, { mat: 'abo_labra', tono: t + 0.05 })); }
  }
  ps.push(poliedro([-1, 1].flatMap((sx) => [-1, 1].flatMap((sy) => [[x + sx * r * 4.4, sy * r * 2.1, z + alto - r * 0.85], [x + sx * r * 4.0, sy * r * 1.8, z + alto]] as V3[])), { mat: 'abo_labra' }));
  return ps;
}
/** Una panda del claustro (en coordenadas propias: la arcada corre a lo largo de x en y = 0, la galería hacia -y). */
function panda(largo: number, s: number): Pieza[] {
  const { ancho, alto, bahia } = CLA, n = Math.round(largo / bahia), ps: Pieza[] = [];
  // la arcada: muro de la arcada con vanos apuntados sobre el antepecho; entre vano y vano, dos columnillas con su capitel
  const muro: Pieza[] = [caja(0, 0, 0, largo + 16, 16, alto, { mat: 'abo_sillar' })];
  for (let i = 0; i < n; i++) { const x = -largo / 2 + (i + 0.5) * bahia; for (const p of huecoApuntado(bahia - 1.5, 122, 12, 34)) muro.push(moverPiezas([p], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [0, 0, 0], [x, 0, 0])[0]); }
  ps.push(...muro);
  for (let i = 0; i <= n; i++) {
    const x = -largo / 2 + i * bahia;
    ps.push(...columnillas(x, 34, 88, 3, s * 7 + i));
  }
  for (let i = 0; i < n; i++) { const x = -largo / 2 + (i + 0.5) * bahia, { ps: a } = arcoApuntado(bahia - 3, 4, 18, 'abo_labra', 6); ps.push(...moverPiezas(a, [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [0, 0, 0], [x, 0, 122])); }
  // la albardilla del antepecho: piedra lisa (los lunares de liquen de la labra, vistos al ras, se vuelven grano)
  ps.push(caja(0, 0, 32, largo + 16, 22, 4, { mat: 'ci_labra_lisa' }));
  // el piso de la galería, el muro de afuera, el techo de vigas y el tejado a un agua
  ps.push(caja(0, -ancho / 2, -6, largo + ancho * 2, ancho + 20, 6, { mat: 'ci_losa' }));
  ps.push(caja(0, -ancho - 14, 0, largo + ancho * 2 + 30, 28, alto + 90, { mat: 'abo_sillar' }));
  ps.push(caja(0, -ancho / 2, alto, largo + ancho * 2, ancho + 30, 10, { mat: 'ci_viga', tono: -0.08 }));
  for (let i = 0; i <= n + 3; i++) ps.push(caja(-largo / 2 - ancho + i * bahia, -ancho / 2, alto - 10, 9, ancho + 20, 10, { mat: 'ci_viga' }));
  ps.push(poliedro([[-largo / 2 - ancho, 12, alto + 10], [largo / 2 + ancho, 12, alto + 10], [-largo / 2 - ancho, -ancho - 28, alto + 82], [largo / 2 + ancho, -ancho - 28, alto + 82], [-largo / 2 - ancho, 12, alto + 18], [largo / 2 + ancho, 12, alto + 18], [-largo / 2 - ancho, -ancho - 28, alto + 90], [largo / 2 + ancho, -ancho - 28, alto + 90]], { mat: 'abo_madera' }));
  return ps;
}

function atmClaustro(): Atmosfera {
  // noche de ceniza: el cielo apenas rojo del lado de la iglesia que arde, todo lo demás azul de nieve
  const rojo = hexLin('#ff5020'), F = norm([0.25, 1, 0.35]);
  const pars: [number, C3][] = [[0, hexLin('#1e2030')], [0.08, hexLin('#161a28')], [0.3, hexLin('#0c0f1a')], [0.9, hexLin('#05060a')]];
  const resplandor = (d: V3) => { const g = Math.max(0, dot3(d, F)); return 0.025 * Math.pow(g, 8) + 0.08 * Math.pow(g, 40); };
  const aire = (d: V3): C3 => gradiente(pars, Math.min(0.03, Math.max(0, d[2])));
  const cielo = (d: V3): C3 => {
    const e = Math.asin(Math.max(-1, Math.min(1, d[2]))), b = gradiente(pars, Math.max(0, e)), rf = resplandor(d);
    let c: C3 = [b[0] + rojo[0] * rf, b[1] + rojo[1] * rf, b[2] + rojo[2] * rf];
    if (d[2] > 0.02) { const k = 1800 / d[2], n = fbm2((d[0] * k) / 1600, (d[1] * k) / 900, 5, 71); const a = suave(0.45, 0.62, n); c = mezclar(c, [0.012 + rojo[0] * rf * 1.8, 0.011 + rojo[1] * rf * 1.6, 0.014 + rojo[2] * rf], a * 0.85); }
    return c;
  };
  return {
    sol: { dir: norm([0.3, 1, 0.55]), c: hexLin('#8a9cc8'), k: 0.05, ancho: 0.025 }, cielo, aire,
    ambCielo: escalar(hexLin('#4a5a88'), 0.2), ambSuelo: escalar(hexLin('#1c1c24'), 0.05),
    niebla: { densidad: 1 / 4000, baja: 1 / 1600, z0: 0, H: 40, ruido: 0.6, escalaRuido: 0.006 },
    borde: { c: hexLin('#8a9cc8'), k: 0.35 }, nieve: { albedo: [0.62, 0.66, 0.74], desde: 0.55 }, oclusion: 0.92, oclusionLargo: 160,
  };
}

/** Lo que se mueve en i07: las dos campanas de la torre en su vaivén. */
function campanasTorre(esc: EscenaCine, t: number) {
  for (const c of CAMPS_I07) {
    const ang = anguloCampana(t, CAMPANAS_I07, c.fase), ps = moverPiezas(campana(c.R, 1), giroEje([0, 0, 1], Math.PI / 2));
    esc.moviles.add(esc.ponerMundo(moverPiezas(ps, giroEje([0, 1, 0], ang), [0, 0, 0], c.c), { nieve: 0 }));
  }
}
export function armarClaustro(w = 1408, h = 792, o: { t?: number; mover?: boolean } = {}): ArmadoFuego {
  const esc = new EscenaCine(), fuegos: ArmadoFuego['fuegos'] = [], plumas: Pluma[] = [], { g } = CLA, t = o.t ?? CAMPANAS_I07.golpe;
  // el jardín: nieve con lomas suaves; el cráter de la brasa la derrite y la ennegrece
  const B = BRASA_I07;
  esc.terreno = new Terreno({
    alto: (x, y) => (fbm2(x / 70, y / 70, 3, 72) - 0.5) * 8 + 6 + 10 * suave(150, 200, Math.max(Math.abs(x), Math.abs(y))),
    techo: 30, grillas: [[-800, -800, 800, 800, 3]],
    superficie: () => ({ albedo: [0.55, 0.58, 0.66], brillo: 0.1 }),
  });
  // las cuatro pandas
  for (const [x, y, giro] of [[0, -g, 0], [0, g, 180], [g, 0, 90], [-g, 0, 270]] as [number, number, number][]) esc.poner(panda(g * 2, x + y), { x, y, z: 0, giro }, { nieve: y === -g ? 0 : 0.25 });
  // la iglesia detrás de la panda norte: un muro alto con contrafuertes y la torre con su campanario abierto
  const T = TORRE_I07;
  esc.ponerMundo([caja(-200, g + 190, 0, 520, 60, 380, { mat: 'abo_sillar' }), ...[-380, -260, -140].map((x) => caja(x, g + 150, 0, 26, 40, 280, { mat: 'abo_sillar_grueso' }))], { nieve: 0.6 });
  const torre: Pieza[] = [caja(0, 0, 0, T.ancho, T.ancho, T.alto, { mat: 'abo_sillar' })];
  for (const [dx, dy, giro] of [[0, -1, 0], [0, 1, 0], [-1, 0, 90], [1, 0, 90]] as [number, number, number][]) for (const k of [-1, 1]) for (const p of huecoApuntado(34, T.vano + 50, 70, T.vano)) torre.push(moverPiezas([p], giroEje([0, 0, 1], (giro * Math.PI) / 180), [0, 0, 0], [dx * T.ancho / 2 + (dy ? k * 22 : 0), dy * T.ancho / 2 + (dx ? k * 22 : 0), 0])[0]);
  torre.push(poliedro([[-T.ancho / 2 - 4, -T.ancho / 2 - 4, T.alto], [T.ancho / 2 + 4, -T.ancho / 2 - 4, T.alto], [-T.ancho / 2 - 4, T.ancho / 2 + 4, T.alto], [T.ancho / 2 + 4, T.ancho / 2 + 4, T.alto], [0, 0, T.alto + 170]], { mat: 'abo_pizarra' in MATERIALES ? 'abo_pizarra' : 'abo_sillar' }));
  esc.poner(torre, { x: T.x, y: T.y, z: 0 }, { nieve: 0.6 });
  esc.ponerMundo([caja(T.x, T.y, T.vano + 50, T.ancho - 8, 10, 10, { mat: 'ci_viga' })], { nieve: 0 });
  if (o.mover) campanasTorre(esc, t);
  // los senderos de losas que cruzan el jardín (la brasa cayó donde se cruzan) y el brocal del medio
  esc.ponerMundo([caja(0, 0, 0, g * 2, 46, 8, { mat: 'ci_losa' }), caja(0, 0, 0, 46, g * 2, 8, { mat: 'ci_losa' }), caja(0, -g + 34, 0, g * 2 - 8, 52, 8, { mat: 'ci_losa' })], { nieve: 0.7 });
  // el árbol muerto del jardín y matas secas que asoman de la nieve
  const arbol = objeto('nie2_arbol_muerto').armar('retorcido', 0, herr(7));
  esc.poner((Array.isArray(arbol) ? arbol : arbol.piezas), { x: -96, y: 92, z: 4, giro: 30, k: 1.6 }, { nieve: 0.8 });
  for (let i = 0; i < 16; i++) { const a = az(i, 150) * TAU, r = 60 + az(i, 151) * 110, x = Math.cos(a) * r - 10, y = Math.sin(a) * r + 10; if (Math.hypot(x - B[0], y - B[1]) < 60) continue; for (let j = 0; j < 5; j++) { const b = az(i * 5 + j, 152) * TAU; esc.ponerMundo([palo([x, y, 0], [x + Math.cos(b) * 10, y + Math.sin(b) * 10, 10 + az(i * 5 + j, 153) * 14], 0.6, { mat: 'ci_viga', r1: 0.15 })], { nieve: 0.5 }); } }
  // la brasa: la roca que todavía arde, hundida en su cráter; su luz roja entra por los arcos y tira las columnas al piso
  const roca: Pieza[] = [];
  for (let k = 0; k < 4; k++) { const pts: V3[] = [], rr = 13 - k * 2; for (let i = 0; i < 11; i++) { const a = az(i + k * 20, 160) * TAU, z = (az(i + k * 20, 161) * 2 - 1) * rr, r = Math.sqrt(Math.max(0, rr * rr - z * z)) * (0.8 + az(i + k * 20, 162) * 0.4); pts.push([B[0] + Math.cos(a) * r + (k ? (az(k, 163) - 0.5) * 22 : 0), B[1] + Math.sin(a) * r + (k ? (az(k, 164) - 0.5) * 22 : 0), B[2] + z - 2]); } roca.push(poliedro(pts, { mat: k ? 'jf_obsidiana' : 'jf_obsidiana', tono: -0.05 })); }
  for (let i = 0; i < 12; i++) { const a = az(i, 165) * TAU, e = (az(i, 166) - 0.2) * 1.6; roca.push(elipsoide(B[0] + Math.cos(a) * Math.cos(e) * 12, B[1] + Math.sin(a) * Math.cos(e) * 12, B[2] + Math.sin(e) * 12 - 2, 1.4, 1.4, 6 + az(i, 167) * 6, { mat: 'va_brasa', giro: az(i, 168) * 180, incl: 50 + az(i, 169) * 70 })); }
  roca.push(esfera(B[0], B[1], B[2] + 2, 11, { mat: 'va_brasa' }));
  // las losas del piso partidas y levantadas alrededor del golpe, con el borde quemado
  for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU + az(i, 170) * 0.3, r = 20 + az(i, 171) * 16; roca.push(caja(B[0] + Math.cos(a) * r, B[1] + Math.sin(a) * r, B[2] - 3, 14 + az(i, 172) * 10, 10 + az(i, 173) * 8, 4, { mat: 'ci_losa', giro: (a * 180) / Math.PI, incl: 12 + az(i, 174) * 25, tono: -0.15 })); }
  roca.push(cilindro(B[0], B[1], B[2] - 0.5, 30, 0.8, { mat: 'jf_lava_fria' }));
  esc.ponerMundo(roca, { nieve: 0 });
  esc.emision.va_brasa = { k: 3.4, canal: 1 };
  esc.luces.push({ p: [B[0], B[1], B[2] + 20], c: hexLin('#ff4a18'), k: 9, r: 34, canal: 1, sombra: true, envuelve: 0.3, halo: 0.00006 });
  // el resplandor que sube: alcanza los capiteles y la cara de adentro de los arcos
  esc.luces.push({ p: [B[0], B[1], B[2] + 60], c: hexLin('#ff4a18'), k: 2.2, r: 70, canal: 1, sombra: true, envuelve: 0.1 });
  for (const [dx, dy, an, al, s] of [[0, 0, 12, 22, 401], [-6, 4, 8, 15, 402], [7, -4, 7, 13, 403]] as [number, number, number, number, number][]) fuegos.push({ p: [B[0] + dx, B[1] + dy, B[2] + 4], ancho: an, alto: al, semilla: s, tipo: 'brasa' });
  plumas.push({ base: [B[0], B[1], B[2] + 6], alto: 640, r0: 7, r1: 260, viento: [0.9, 0.5, 0], dens: 0.1, humo: [0.26, 0.26, 0.29], abajo: hexLin('#ff3a10'), kAbajo: 0.6, decaeAbajo: 16, semilla: 404, sube: 18, escala: 1 / 20, sol: 0.05 });
  // una vela en su repisa del muro de la galería, detrás del ojo: apenas despega del negro el lado de adentro de las columnas
  { const v = vela(-40, -309, 62, 9, 2, 410); esc.ponerMundo([...v.ps, caja(-40, -311, 58, 14, 8, 4, { mat: 'abo_labra' })], { nieve: 0 }); esc.luces.push({ p: [v.llama[0], v.llama[1] + 4, v.llama[2] + 2], c: hexLin('#ffa458'), k: 0.5, r: 60, sombra: true, envuelve: 0.3 }); }
  const atm = atmClaustro(), C = CAM_I07;
  return { esc, atm, cam: camaraBase(C.pos, C.obj, C.fov, w, h), plumas, fuegos };
}
/** El recorte de las campanas de la torre (px de la capa): se calcula proyectando el campanario. */
export function cajaCampanasI07(cam: Camara): [number, number, number, number] {
  const b = baseCamara(cam), T = TORRE_I07, q = [[-1, -1], [1, -1], [-1, 1], [1, 1]].flatMap(([sx, sy]) => [proyectar(b, [T.x + sx * T.ancho / 2, T.y + sy * T.ancho / 2, T.vano - 10]), proyectar(b, [T.x + sx * T.ancho / 2, T.y + sy * T.ancho / 2, T.vano + 80])]).filter((p): p is [number, number, number] => !!p);
  return [Math.min(...q.map((p) => p[0])) - 6, Math.min(...q.map((p) => p[1])) - 6, Math.max(...q.map((p) => p[0])) + 6, Math.max(...q.map((p) => p[1])) + 6];
}

// ================================================================== i11: los ojos de Ozmaren
/** Relámpagos (2.2, 3.1 y 6 s: cada uno con su réplica) y los ojos que se encienden a los 4.4 s y quedan. */
export const TIEMPOS_I11 = {
  relampago: [[0, 0], [2.14, 0], [2.2, 1], [2.27, 0.25], [2.33, 0.85], [2.62, 0], [3.04, 0], [3.1, 0.75], [3.18, 0.15], [3.24, 0.5], [3.5, 0], [5.94, 0], [6.0, 1], [6.07, 0.35], [6.13, 1], [6.22, 0.5], [6.75, 0]] as [number, number][],
  ojos: [[0, 0], [4.35, 0], [4.45, 0.55], [4.52, 0.15], [4.62, 0.8], [4.7, 0.5], [4.85, 1]] as [number, number][],
};
const POZO = { r: 440, alto: 640 };
/** Ozmaren en el fondo del pozo: el modelo del catálogo (quieto, sin sus llamas: la lava dormida), dos veces y pico su tamaño. */
const OZ = { x: 0, y: 150, k: 2.3 };
function ozmarenPiezas(): Pieza[] {
  const a = objeto('jefe_ozmaren_quieto').armar('se', 1, herr(5)), ps = Array.isArray(a) ? a : a.piezas;
  const sin = ps.filter((p) => p.mat !== 'fuego' && p.mat !== 'jf_humo');
  // solo los ojos se encienden: el resto de lo que brillaba (el corazón, la columna de luz) queda como brasa dormida
  const ojos = sin.filter((p) => p.mat === 'cu_ojo_brasa' && p.k === 'elip').map((p) => (p as { c: V3 }).c);
  const cerca = (c: V3) => ojos.some((o) => Math.hypot(o[0] - c[0], o[1] - c[1], o[2] - c[2]) < 6);
  return sin.map((p) => (p.mat === 'luz_vela' && !(p.k === 'elip' && cerca(p.c)) ? { ...p, mat: 'jf_brasa_honda' } : p));
}
function atmPozo(relampago: boolean): Atmosfera {
  const L = norm([0.05, 0.22, 1]), frio = hexLin('#b8ccff');
  // el cielo de tormenta que se ve por la boca del pozo: negro con nubes apenas marcadas; con el relámpago, blanco azulado con el rayo
  const cielo = (d: V3): C3 => {
    const e = Math.asin(Math.max(-1, Math.min(1, d[2]))), k = 2000 / Math.max(0.05, d[2]), n = fbm2((d[0] * k) / 900, (d[1] * k) / 900, 5, 181);
    if (!relampago) return escalar([0.004, 0.0045, 0.007], 0.6 + n);
    const u = (d[0] * k) / 600, v = (d[1] * k) / 600, eje = u * 0.6 + (fbm2(v * 1.5, 1, 4, 182) - 0.5) * 1.6, rayo = Math.exp(-Math.abs(eje) * 40) * suave(-2, 0.5, v);
    return [frio[0] * (0.35 + n * 1.1) + rayo * 9, frio[1] * (0.35 + n * 1.1) + rayo * 9, frio[2] * (0.45 + n * 1.3) + rayo * 11].map((c) => c * suave(0.4, 1.2, e)) as C3;
  };
  const aire: C3 = relampago ? [0.007, 0.009, 0.015] : [0.0006, 0.0005, 0.0005];
  return {
    sol: { dir: L, c: frio, k: relampago ? 5.5 : 0, ancho: 0.12 }, cielo, aire: () => aire,
    ambCielo: relampago ? escalar(frio, 0.05) : [0.0015, 0.0015, 0.002], ambSuelo: [0.002, 0.0015, 0.0012],
    niebla: { densidad: 1 / 2400, baja: 1 / 300, z0: 0, H: 30, ruido: 0.7, escalaRuido: 0.008 },
    borde: { c: relampago ? frio : hexLin('#ff5020'), k: relampago ? 3.2 : 0.6 }, oclusion: 0.95, oclusionLargo: 260,
  };
}
export function armarPozo(w = 1408, h = 792, o: { relampago?: boolean } = {}): Armado {
  const esc = new EscenaCine(), P = POZO;
  // el piso: roca partida con grietas donde la lava se enfrió (brilla apenas, rojo hondo)
  const grieta = (x: number, y: number) => 1 - Math.abs(2 * fbm2(x / 90, y / 90, 3, 191) - 1);
  esc.terreno = new Terreno({
    alto: (x, y) => (fbm2(x / 50, y / 50, 4, 190) - 0.5) * 16 - Math.pow(grieta(x, y), 12) * 6 + suave(P.r - 60, P.r + 40, Math.hypot(x, y)) * 120,
    techo: 200, grillas: [[-700, -700, 700, 700, 3]],
    superficie: (p) => { const g = Math.pow(grieta(p[0], p[1]), 14); return { albedo: mezclar([0.012, 0.011, 0.01], [0.25, 0.03, 0.01], g * 0.9), brillo: 0.25 }; },
  });
  // la pared del pozo: un macizo con el hueco cilíndrico y peñascos que sobresalen, y la boca arriba
  esc.ponerMundo([caja(0, 0, -50, 1500, 1500, P.alto + 50, { mat: 'ci_roca' }), cilindro(0, 0, -60, P.r, P.alto + 80, { mat: 'ci_roca', r1: P.r * 0.55, resta: true })], { nieve: 0 });
  for (let i = 0; i < 70; i++) {
    const a = az(i, 200) * TAU, z = i < 22 ? P.alto - 30 + az(i, 201) * 50 : az(i, 201) * P.alto, R = 26 + az(i, 202) * 60, rr = P.r * (1 - 0.45 * (z + 60) / (P.alto + 80)) - R * 0.35, pts: V3[] = [];
    for (let j = 0; j < 10; j++) { const b = az(i * 10 + j, 203) * TAU, c = (az(i * 10 + j, 204) * 2 - 1) * R * 0.8; pts.push([Math.cos(a) * rr + Math.cos(b) * R * 0.7, Math.sin(a) * rr + Math.sin(b) * R * 0.7, z + c]); }
    esc.ponerMundo([poliedro(pts, { mat: 'ci_roca', tono: (az(i, 205) - 0.5) * 0.2 })], { nieve: 0 });
  }
  // la lava dormida: vetas que apenas brillan en las grietas grandes y su luz roja baja, rasante
  esc.emision.ci_lava = { k: 0.9 };
  for (let i = 0; i < 26; i++) {
    const a = az(i, 210) * TAU, r = 40 + az(i, 211) * 220, x = Math.cos(a) * r, y = Math.sin(a) * r, b = az(i, 212) * Math.PI;
    esc.ponerMundo([elipsoide(x, y, -3, 26 + az(i, 213) * 30, 2.2, 3, { mat: 'ci_lava', giro: (b * 180) / Math.PI })], { nieve: 0 });
  }
  for (const [x, y] of [[-120, 40], [140, 80], [10, -90], [-60, 230], [120, 260]] as [number, number][]) esc.luces.push({ p: [x, y, 6], c: hexLin('#ff3410'), k: 0.5, r: 60, envuelve: 0.2 });
  // Ozmaren: enorme, de frente, con la lava apagada; los ojos van por el canal 1 (se encienden en su momento)
  const gz = esc.poner(ozmarenPiezas(), { x: OZ.x, y: OZ.y, z: -2, giro: -90, k: OZ.k }, { nieve: 0 });
  const ojos = esc.piezas.filter((p, i) => esc.grupoDe[i] === gz && p.mat === 'cu_ojo_brasa' && p.k === 'elip').map((p) => (p as { c: V3 }).c);
  esc.emision.cu_lava = { k: 0.035 }; esc.emision.lava = { k: 0.03 }; esc.emision.jf_hierro_rojo = { k: 0.03 }; esc.emision.jf_brasa_honda = { k: 0.04 };
  esc.emision.cu_ojo_brasa = { k: 7, canal: 1 }; esc.emision.luz_vela = { k: 9, canal: 1 };
  // la luz de los ojos sobre la cara y los cuernos (canal 1: llega con los ojos)
  const ojo: V3 = ojos.length ? ojos.reduce((m, c) => [m[0] + c[0] / ojos.length, m[1] + c[1] / ojos.length, m[2] + c[2] / ojos.length], [0, 0, 0] as V3) : [OZ.x, OZ.y, 190 * OZ.k];
  ojo[1] -= 14;
  esc.luces.push({ p: ojo, c: hexLin('#ff5a18'), k: 1.6, r: 30, canal: 1, envuelve: 0.3, halo: 0.0007 });
  const cam = camaraBase([36, -392, 10], [OZ.x, OZ.y, 320], 54, w, h);
  return { esc, atm: atmPozo(!!o.relampago), cam };
}
