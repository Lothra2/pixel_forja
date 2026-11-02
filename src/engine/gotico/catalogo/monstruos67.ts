import { registrar } from '../objeto';
import { MATERIALES } from '../materiales';
import { DIRS, CUADROS, type Accion, type Dir } from '../figura';
import { personajeEscena, esqueleto, armaduraDeLinea, type Cuerpo, type Equipo, type Esqueleto } from '../cuerpo';
import { ruido, cilindro, esfera, palo, poliedro, masa, hueso, bulto, type Comp, type Pieza, type V3, type Escena, type OpcComp } from '../render';
import { transformar, ejeAng, ap, ID, add, sub, esc, len, nor, cruz, mez, dot, rad, TAU, PI } from '../actos45';
import type { Monstruo } from './personajes';

/**
 * Monstruos de los actos 6 y 7 de Réquiem de Ceniza, todos de diseño propio.
 *
 * Acto 6, Ysmeral, la Ciudad Ahogada (bronce verdoso, algas, percebes, sal y luz bioluminiscente):
 * - ahogado_campanero: hinchado y pálido, con la soga de la campana al cuello y una campanita de mano con la que pega.
 * - marinero_percebe: esqueleto con costra de percebes y mejillones, algas y un garfio de abordaje con su cabo.
 * - sirena_hueca: torso de mujer descarnado sobre una cola de peces muertos y algas; flota, chilla y lanza agua negra.
 * - cangrejo_relicario (bestia): cangrejo enorme que lleva un relicario de iglesia por caparazón, con una vela encendida.
 * - sacerdote_marea: clérigo ahogado con la mitra rota y un báculo con farol de luz de mar; invoca manos del agua.
 *
 * Acto 7, La Corona del Dios Sediento (mármol, oro agrietado con el vacío negro y luz blanca):
 * - suplicante_animado: estatua de los que intentaron antes, con grietas de vacío; se mueve soltando lascas.
 * - angel_sediento: ángel de mármol sin ojos, alas de piedra rotas y una boca vertical en el pecho; vuela bajo.
 * - mano_dorada (bestia): mano de oro cortada que flota, agarra y aplasta (una menor de las de Aun-Saar).
 * - guardian_halo: caballero de oro blanco con el halo roto y una lanza de luz.
 * - sediento: humano consumido, la piel pegada al hueso y polvo de oro que le cae de la boca; rápido, en enjambre.
 *
 * Los humanoides usan el cuerpo de cuerpo.ts (`personajeEscena`) con piezas propias que siguen su esqueleto, y
 * se registran como MONSTRUOS (mon_<id>_<accion>: quieto, caminar, correr si no es jefe ni esqueleto, atacar, lanzar
 * si hace magia, herido y morir; especial si lo tiene). Las bestias se arman en su marco propio como en bestias.ts.
 * Escala: una persona mide 61 (75 px).
 */

// ------------------------------------------------------------------ materiales
const M = MATERIALES;
// acto 6
M.m67_piel_ahogada = { rampa: ['#0c1011', '#171e20', '#242d30', '#343e41', '#465153', '#5a6566', '#707a79', '#88918d', '#a1a7a0'], ruido: 0.12, escala: 0.4, brillo: 0.4, patron: (p) => { const v = ruido(p[0] * 0.45, p[1] * 0.45, p[2] * 0.45); return v > 0.7 ? -0.1 : v < 0.25 ? 0.05 : 0; } };
M.m67_lividez = { rampa: ['#0f0b11', '#1c1520', '#2a1f2f', '#392a3f', '#48364f', '#58435e'], ruido: 0.2, escala: 0.5, brillo: 0.3 };
M.m67_piel_hueca = { rampa: ['#0b0e10', '#151b1e', '#212a2e', '#2e393e', '#3d4a4f', '#4e5c60', '#617072', '#768484', '#8e9a98'], ruido: 0.14, escala: 0.45, brillo: 0.45, patron: (p) => (ruido(p[0] * 0.6, p[1] * 0.6, p[2] * 0.6) > 0.68 ? -0.09 : 0) };
M.m67_hueso_mar = { rampa: ['#121309', '#212314', '#33351f', '#47492d', '#5d5f3c', '#74754e', '#8b8b61', '#a2a076', '#b7b48c'], ruido: 0.25, escala: 0.7, patron: (p) => (ruido(p[0] * 0.5, p[1] * 0.5, p[2] * 0.5) > 0.62 ? -0.1 : 0) };
M.m67_percebe = { rampa: ['#191917', '#2f2e2a', '#48463f', '#636058', '#7f7b71', '#9b968b', '#b5b0a5', '#cbc7bd'], ruido: 0.55, escala: 1.6 };
M.m67_mejillon = { rampa: ['#040509', '#090c13', '#10151f', '#18202d', '#222c3d', '#2e3a4f'], ruido: 0.1, escala: 0.6, brillo: 0.8, patron: (p) => (Math.sin((p[0] + p[1] + p[2]) * 4.2) > 0.7 ? 0.06 : 0) };
M.m67_alga = { rampa: ['#040805', '#091109', '#0f1b0e', '#162513', '#1e3118', '#283e1f', '#344c27'], ruido: 0.35, escala: 0.8, brillo: 0.55, patron: (p) => (Math.sin(p[2] * 1.6 + p[0] * 0.6 + p[1] * 0.4) > 0.72 ? -0.08 : 0) };
M.m67_bio = { rampa: ['#0a4644', '#116c66', '#1c958a', '#3cc2ae', '#84e8d0', '#d2fff0'], ruido: 0.35, escala: 0.35, emite: true };
M.m67_bio_tenue = { rampa: ['#082c2b', '#0d4643', '#14625d', '#1e8078', '#2fa094'], ruido: 0.3, escala: 0.4, emite: true };
M.m67_ojo_mar = { rampa: ['#2a7470', '#4caca2', '#94e6d6', '#e4fff6'], ruido: 0, escala: 1, emite: true };
M.m67_bronce = { rampa: ['#050a09', '#0b1512', '#12211c', '#1a2f27', '#243e33', '#304f40', '#40614e', '#56745c', '#73886b', '#93a07c'], ruido: 0.12, escala: 0.5, brillo: 0.55, patron: (p) => { const v = ruido(p[0] * 0.35, p[1] * 0.35, p[2] * 0.35); return v > 0.64 ? 0.08 : v < 0.3 ? -0.1 : 0; } };
M.m67_bronce_vivo = { rampa: ['#120b05', '#22160a', '#35220f', '#4a3115', '#61421c', '#7a5525', '#946a31', '#ad8241'], ruido: 0.15, escala: 0.4, brillo: 0.85 };
M.m67_tela_ahogada = { rampa: ['#060809', '#0d1112', '#151a1b', '#1d2425', '#262f2f', '#303a39', '#3b4644'], ruido: 0.3, escala: 0.7, brillo: 0.3, patron: (p) => (ruido(p[0] * 0.3, p[1] * 0.3, p[2] * 0.08) > 0.64 ? -0.1 : 0) };
M.m67_tela_sacerdote = { rampa: ['#05090a', '#0a1213', '#101c1c', '#172726', '#1f3331', '#283f3c', '#334c48'], ruido: 0.3, escala: 0.7, brillo: 0.3, patron: (p) => (ruido(p[0] * 0.3, p[1] * 0.3, p[2] * 0.08) > 0.64 ? -0.09 : 0) };
M.m67_estola = { rampa: ['#110c05', '#1f1709', '#30240f', '#433315', '#58431d', '#6e5626', '#866b33', '#9e8243'], ruido: 0.2, escala: 0.6, brillo: 0.55, patron: (p) => (Math.sin(p[2] * 2.4) > 0.6 ? 0.08 : Math.sin(p[0] * 2 + p[1] * 2) > 0.85 ? -0.06 : 0) };
M.m67_soga = { rampa: ['#110d09', '#1f1810', '#2f2418', '#403221', '#52412b', '#645036'], ruido: 0.3, escala: 0.7, brillo: 0.25, patron: (p) => (Math.sin((p[0] + p[1]) * 2.6 + p[2] * 3.4) > 0.4 ? 0.07 : -0.04) };
M.m67_agua_negra = { rampa: ['#010203', '#03070a', '#071016', '#0c1920', '#13242d', '#1e3540'], ruido: 0.2, escala: 0.25, brillo: 1.1 };
M.m67_escama_muerta = { rampa: ['#0d0f10', '#181c1e', '#252a2c', '#33393b', '#43494a', '#555b5b', '#6a706e', '#828783', '#9da09a'], ruido: 0.1, escala: 0.5, brillo: 0.7, patron: (p) => { const u = Math.sin(p[0] * 2.6 + Math.sin(p[2] * 2.1) * 1.5) * Math.sin(p[2] * 2.6 + p[1] * 1.3); return u > 0.55 ? -0.12 : u < -0.7 ? 0.06 : 0; } };
M.m67_aleta = { rampa: ['#0c0b0a', '#181614', '#26221f', '#35302b', '#453f38', '#575047'], ruido: 0.3, escala: 0.6, brillo: 0.3, patron: (p) => (Math.sin((p[0] - p[1]) * 3 + p[2] * 0.5) > 0.5 ? -0.07 : 0) };
M.m67_oro_reliquia = { rampa: ['#100b05', '#1f1609', '#33240e', '#493414', '#61461b', '#7c5b25', '#977331', '#b08c42', '#c8a65a'], ruido: 0.2, escala: 0.4, brillo: 0.85, patron: (p) => { const v = ruido(p[0] * 0.5, p[1] * 0.5, p[2] * 0.5); return v > 0.7 ? -0.16 : 0; } };
M.m67_caparazon = { rampa: ['#090504', '#140a08', '#21110d', '#2f1913', '#3e2219', '#4f2c20', '#613829', '#754633', '#89563f'], ruido: 0.25, escala: 0.6, brillo: 0.5, patron: (p) => (ruido(p[0] * 0.8, p[1] * 0.8, p[2] * 0.8) > 0.7 ? -0.1 : 0) };
M.m67_pinza = { rampa: ['#060404', '#0e0908', '#18100d', '#231813', '#30211a', '#3e2b22'], ruido: 0.15, escala: 0.6, brillo: 0.6 };
M.m67_tejas = { rampa: ['#0a0c08', '#141810', '#1f2418', '#2b3221', '#39412b', '#4a5236', '#5d6342'], ruido: 0.2, escala: 0.5, brillo: 0.45, patron: (p) => { const f = Math.floor(p[2] * 0.55), u = p[0] * 0.5 + (f & 1 ? 0.5 : 0); const d = p[2] * 0.55 - f, fu = u - Math.floor(u) - 0.5; return d - 0.6 * (2 * fu) * (2 * fu) < 0.12 ? -0.14 : 0.03; } };
M.m67_humo = { rampa: ['#121212', '#1e1e1d', '#2c2b29', '#3b3936', '#4a4743'], ruido: 0.5, escala: 0.4 };
// acto 7
M.m67_marmol = { rampa: ['#151418', '#232227', '#343238', '#47454b', '#5d5a60', '#747177', '#8d8a8f', '#a6a3a7', '#bfbcbe', '#d6d3d3'], ruido: 0.1, escala: 0.15, brillo: 0.45, patron: (p) => { const v = ruido(p[0] * 0.16 + p[2] * 0.22, p[1] * 0.16, p[2] * 0.09); return (Math.abs(v - 0.5) < 0.025 ? -0.13 : 0) + (ruido(p[0] * 0.1, p[1] * 0.1, p[2] * 0.1) > 0.66 ? -0.06 : 0); } };
M.m67_marmol_gris = { rampa: ['#121114', '#1e1d21', '#2c2a2f', '#3c3a3f', '#4e4b51', '#615e64', '#767378', '#8b888c', '#a19ea1'], ruido: 0.12, escala: 0.15, brillo: 0.35, patron: (p) => { const v = ruido(p[0] * 0.14, p[1] * 0.14 + p[2] * 0.2, p[2] * 0.08); return Math.abs(v - 0.5) < 0.025 ? -0.12 : 0; } };
M.m67_oro = { rampa: ['#1e1307', '#33220c', '#4d3512', '#6b4b19', '#8a6322', '#a97d2e', '#c69a3e', '#ddb758', '#f0d688', '#fcefc4'], ruido: 0.08, escala: 0.3, brillo: 1.1 };
M.m67_oro_viejo = { rampa: ['#150e07', '#25190c', '#392712', '#4f3818', '#674a21', '#805d2b', '#987237'], ruido: 0.2, escala: 0.4, brillo: 0.75 };
M.m67_vacio = { rampa: ['#000000', '#020104', '#05030a', '#0a0614', '#110a20'], ruido: 0.6, escala: 0.5, emite: true };
M.m67_borde_vacio = { rampa: ['#1a0e30', '#2c1850', '#46287a', '#6a48a8', '#9a80d0'], ruido: 0.4, escala: 0.6, emite: true };
M.m67_luz = { rampa: ['#9c988e', '#c4bfb2', '#e2ddd0', '#f4f1e8', '#fdfcf8', '#ffffff'], ruido: 0.25, escala: 0.3, emite: true };
M.m67_luz_oro = { rampa: ['#7a5418', '#a87a26', '#d2a440', '#ecc868', '#fae4a4', '#fff6dc'], ruido: 0.3, escala: 0.3, emite: true };
M.m67_lanza = { rampa: ['#b0a888', '#d4cdb0', '#ece6d0', '#faf6e8', '#ffffff'], ruido: 0.2, escala: 0.25, emite: true };
M.m67_piel_seca = { rampa: ['#100d0a', '#1d1813', '#2c251d', '#3c3328', '#4e4334', '#615442', '#756651', '#8a7961', '#9e8c72'], ruido: 0.3, escala: 0.45, patron: (p) => (Math.sin(p[2] * 4.2 + ruido(p[0] * 0.8, p[1] * 0.8, p[2] * 0.3) * 4) > 0.8 ? -0.1 : 0) };
M.m67_tela_ceniza = { rampa: ['#0e0d0b', '#1a1815', '#28251f', '#37332b', '#474238', '#585246'], ruido: 0.4, escala: 0.8, patron: (p) => (ruido(p[0] * 0.4, p[1] * 0.4, p[2] * 0.1) > 0.66 ? -0.12 : 0) };
M.m67_ojo_hundido = { rampa: ['#030202', '#0a0806', '#14100b'], ruido: 0, escala: 1 };
M.m67_diente = { rampa: ['#2a2418', '#463c28', '#66583c', '#8a7a56', '#ad9c74', '#cbbb94'], ruido: 0.15, escala: 0.8, brillo: 0.6 };
M.m67_polvo_marmol = { rampa: ['#3a383c', '#535156', '#6c6a6f', '#858388', '#9e9ca0'], ruido: 0.5, escala: 0.4 };

// ------------------------------------------------------------------ utilidades
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const suav = (t: number) => { const u = clamp(t, 0, 1); return u * u * (3 - 2 * u); };
/** Azar fijo por número (igual en todos los cuadros). */
const hr = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
/** Valor de una tabla de cuadros clave (admite cuadros fraccionarios). */
const K = (v: number[], f: number) => { const i = Math.floor(f), t = f - i; return lerp(v[Math.min(i, v.length - 1)], v[Math.min(i + 1, v.length - 1)], t); };
/** Un vector cualquiera perpendicular a `d`. */
const lat = (d: V3): V3 => nor(Math.abs(d[2]) > 0.9 ? cruz(d, [1, 0, 0]) : cruz(d, [0, 0, 1]));
/** Elipsoide orientado a mano (eje x a lo largo de `ex`; `ey0` orienta el segundo eje). */
function elipE(c: V3, ex: V3, r: V3, mat: string, tono?: number, ey0?: V3): Pieza {
  const x = nor(ex);
  let y = ey0 ? sub(ey0, esc(x, dot(ey0, x))) : cruz([0, 0, 1], x);
  if (len(y) < 1e-4) y = cruz([0, 1, 0], x);
  y = nor(y);
  return { k: 'elip', c, ex: x, ey: y, ez: cruz(x, y), r, mat, tono } as Pieza;
}
/** Anillo de piezas chatas (centro, radio, normal); `hueco` saltea una parte de los tramos. */
function aro(c: V3, r: number, n: V3, mat: string, tono: number, grueso: number, hueco = 0, sem = 0): Pieza[] {
  const nn = nor(n), u = lat(nn), w = cruz(nn, u), m = clamp(Math.round(r * 0.9), 8, 40), ps: Pieza[] = [];
  for (let i = 0; i < m; i++) {
    if (hueco && hr(i * 7.3 + sem) < hueco) continue;
    const a = (i / m) * TAU, d = add(esc(u, Math.cos(a)), w, Math.sin(a)), t = add(esc(u, -Math.sin(a)), w, Math.cos(a));
    ps.push({ k: 'elip', c: add(c, d, r), ex: t, ey: d, ez: nn, r: [(TAU * r) / m * 0.6, grueso, grueso * 0.6], mat, tono } as Pieza);
  }
  return ps;
}
/** Percebe: cono de placas con el opérculo oscuro arriba. */
function percebe(c: V3, n: V3, s: number, sem: number): Pieza[] {
  const h = (1.1 + hr(sem) * 0.7) * s, nn = nor(add(n, [hr(sem + 1) - 0.5, hr(sem + 2) - 0.5, hr(sem + 3) - 0.5], 0.5));
  const ps: Pieza[] = [cilindro(...c, 1.15 * s, h, { mat: 'm67_percebe', r1: 0.55 * s, eje: nn, tono: (hr(sem + 4) - 0.5) * 0.12 })];
  ps.push(elipE(add(c, nn, h), lat(nn), [0.42 * s, 0.32 * s, 0.25 * s], 'm67_mejillon'));
  return ps;
}
/** Racimo de percebes (y algún mejillón) sobre una superficie de normal `n`. */
function costra(c: V3, n: V3, s: number, k: number, sem: number, mejillones = 0): Pieza[] {
  const u = lat(n), w = cruz(nor(n), u), ps: Pieza[] = [];
  for (let i = 0; i < k; i++) {
    const a = hr(sem * 3 + i) * TAU, d = (i === 0 ? 0 : 0.8 + hr(sem * 5 + i) * 1.4) * s;
    ps.push(...percebe(add(add(c, u, Math.cos(a) * d), w, Math.sin(a) * d), n, s * (0.75 + hr(sem + i * 2) * 0.5), sem * 11 + i));
  }
  for (let i = 0; i < mejillones; i++) {
    const a = hr(sem * 7 + i) * TAU, p = add(add(add(c, u, Math.cos(a) * 1.6 * s), w, Math.sin(a) * 1.6 * s), n, 0.4 * s);
    ps.push(elipE(p, add(esc(u, Math.cos(a + 1)), w, Math.sin(a + 1)), [1.6 * s, 0.75 * s, 0.6 * s], 'm67_mejillon', (hr(i + sem) - 0.5) * 0.1, n));
  }
  return ps;
}
/** Hebra de alga que cuelga de `a` (cae con el peso, se mece con la fase) y a veces brilla en la punta. */
function alga(a: V3, dir: V3, largo: number, r: number, fase: number, sem: number, brilla = false, piso = 0.6): Pieza[] {
  const n = 4, pts: V3[] = [a];
  let p = a;
  for (let i = 1; i <= n; i++) {
    const t = i / n, mece = Math.sin(fase + i * 0.9 + sem) * 0.35 * t;
    const d = nor(add(add(esc(nor(dir), 1 - t * 0.8), [0, 0, -1], t * 1.2), [mece, Math.cos(fase * 0.7 + sem + i) * 0.25 * t, 0]));
    p = add(p, d, largo / n);
    p = [p[0], p[1], Math.max(piso, p[2])];
    pts.push(p);
  }
  const cs: Comp[] = [];
  for (let i = 0; i < n; i++) cs.push(hueso(pts[i], pts[i + 1], r * (1 - i * 0.18), r * (0.82 - i * 0.18), { mat: 'm67_alga' }));
  const ps: Pieza[] = [masa(cs, { mat: 'm67_alga', suave: r * 0.6 })];
  if (brilla) ps.push(esfera(...pts[n - 1], r * 0.7, { mat: 'm67_bio' }));
  return ps;
}
/** Grieta de vacío a lo largo de una polilínea: el canto de oro, el vacío negro y el borde que brilla. */
function grieta(pts: V3[], g: number, o: { oro?: boolean; luz?: number } = {}): Pieza[] {
  const ps: Pieza[] = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], d = sub(b, a), L = len(d), gg = g * (1 - (i / pts.length) * 0.45), c = mez(a, b, 0.5);
    if (o.oro !== false) ps.push(elipE(c, d, [L * 0.56 + gg * 0.4, gg * 1.9, gg * 1.3], 'm67_oro', 0.05));
    ps.push(elipE(c, d, [L * 0.58 + gg * 0.3, gg * 1.0, gg * 1.6], 'm67_vacio'));
    if (o.luz && i === Math.ceil(pts.length / 2)) ps.push(elipE(c, d, [L * 0.4, gg * 0.45, gg * 1.8], 'm67_luz', o.luz - 0.5));
    else ps.push(elipE(c, d, [L * 0.42, gg * 0.4, gg * 1.75], 'm67_borde_vacio', -0.25));
  }
  return ps;
}
/** Polilínea quebrada sobre un miembro (de `a` a `b`, radio `r`), girando alrededor del eje. */
function surcoMiembro(a: V3, b: V3, r: number, sem: number, t0 = 0.15, t1 = 0.85, n = 4): V3[] {
  const d = nor(sub(b, a)), u = lat(d), w = cruz(d, u), pts: V3[] = [];
  let ang = hr(sem) * TAU;
  for (let i = 0; i <= n; i++) {
    const t = lerp(t0, t1, i / n);
    ang += (hr(sem + i * 3) - 0.5) * 1.3;
    pts.push(add(add(mez(a, b, t), u, Math.cos(ang) * r), w, Math.sin(ang) * r));
  }
  return pts;
}
/** Partícula que cae desde `c`: el cuadro corre la fase (0..1) y la caída llega al piso. */
const cae = (c: V3, u: number, alto: number, deriva: V3 = [0, 0, 0]): V3 => [c[0] + deriva[0] * u, c[1] + deriva[1] * u, Math.max(0.6, c[2] - alto * u * u)];

// ------------------------------------------------------------------ humanoides: cuerpo de cuerpo.ts + piezas propias
type Res = { piezas: Pieza[]; resplandor?: Escena['resplandor'] };
interface Ctx {
  e: Esqueleto; cu: Cuerpo; eq: Equipo; dir: Dir;
  /** La acción y el cuadro reales (la pose puede venir de otra acción). */
  acc: Accion; f: number; n: number; ph: number; w: number;
  S: number; A: number; H: number;
  /** 0..1 cuánto se murió (morir), para apagar luces. */
  muerte: number;
}
export interface Monstruo67 extends Monstruo {
  /** Piezas propias sobre el esqueleto (el resplandor que devuelva reemplaza al del arma). */
  extra?: (c: Ctx) => Res;
  /** La pose que usa el cuerpo para una acción (los que flotan se deslizan con la pose de quieto). */
  pose?: (acc: Accion, f: number) => [Accion, number];
  /** Cuánto se eleva del piso y cuánto se inclina hacia adelante (grados), por acción y cuadro. */
  vuelo?: (acc: Accion, f: number) => number;
  inclina?: (acc: Accion, f: number) => number;
  /** Saca los muslos de la carne (la cola los reemplaza). */
  sinMuslos?: boolean;
  /** Acción especial y su nombre. */
  especial?: [string, string];
  descripcion: [string, string];
}

/** La carne sin los muslos: componentes de la primera masa que quedan cerca del muslo y lejos de la cadera. */
function sacarMuslos(ps: Pieza[], e: Esqueleto): Pieza[] {
  const p0 = ps[0];
  if (!p0 || p0.k !== 'masa') return ps;
  const dSeg = (c: V3, a: V3, b: V3): [number, number] => { const ab = sub(b, a), t = clamp(dot(sub(c, a), ab) / Math.max(1e-6, dot(ab, ab)), 0, 1); return [len(sub(c, add(a, ab, t))), t]; };
  const comps = p0.comps.filter((q) => {
    const c = q.f === 'hueso' ? mez(q.a, q.b, 0.5) : q.c;
    for (const p of e.piernas) { const [d, t] = dSeg(c, p.cad, p.rod); if (d < 5 * e.S && t > 0.3) return false; }
    return true;
  });
  return [masa(comps, { mat: p0.mat, tono: p0.tono, suave: p0.suave }), ...ps.slice(1)];
}

function escenaMonstruo(m: Monstruo67, dir: Dir, acc: Accion, f: number): Res {
  const [accP, fP] = m.pose ? m.pose(acc, f) : [acc, f];
  const tipo = m.equipo.arma?.tipo ?? 'nada';
  const e = esqueleto(m.cuerpo, dir, accP, fP, tipo, m.equipo.izq?.tipo);
  const base = personajeEscena(m.cuerpo, m.equipo, dir, accP, fP);
  let piezas = m.sinMuslos ? sacarMuslos(base.piezas, e) : base.piezas;
  let resplandor = base.resplandor;
  const n = CUADROS[acc], ph = f / n;
  if (m.extra) {
    const S = e.S, A = e.A, H = (m.cuerpo.cabeza ?? 1) * S;
    const r = m.extra({ e, cu: m.cuerpo, eq: m.equipo, dir, acc, f, n, ph, w: ph * TAU, S, A, H, muerte: acc === 'morir' ? clamp(f / 6, 0, 1) : 0 });
    piezas = [...piezas, ...r.piezas];
    if (r.resplandor) resplandor = r.resplandor;
  }
  // inclinación hacia adelante (alrededor de la cadera) y vuelo
  const inc = m.inclina?.(acc, f) ?? 0, dz = m.vuelo?.(acc, f) ?? 0;
  if (inc || dz) {
    const piv: V3 = [0, 0, e.zc], mr = inc ? ejeAng(esc(e.R, -1), inc) : ID;
    piezas = transformar(transformar(piezas, ID, esc(piv, -1)), mr, add(piv, [0, 0, dz]));
    if (resplandor) resplandor = { ...resplandor, c: add(ap(mr, sub(resplandor.c, piv)), add(piv, [0, 0, dz])) };
  }
  return { piezas, resplandor };
}

const ACCIONES: [Accion, [string, string]][] = [
  ['quieto', ['quieto', 'idle']], ['caminar', ['camina', 'walk']], ['correr', ['corre', 'run']], ['atacar', ['ataca', 'attack']],
  ['lanzar', ['lanza hechizo', 'cast']], ['herido', ['recibe golpe', 'get hit']], ['morir', ['muere', 'death']],
];

// ------------------------------------------------------------------ piezas que se repiten en los humanoides
/** Cuello: entre la base del cuello y la mandíbula. */
const cuello = (c: Ctx, t = 0.5): V3 => mez(c.e.T(0, 0, c.e.hombroZ + 1.2 * c.S), c.e.cab(-0.6 * c.H, 0, c.e.cz - 4.2 * c.H), t);
/** Punto en la superficie del torso: ángulo (0 adelante, 90 a la derecha), alto sobre la cadera y cuánto sale. */
const enTorso = (c: Ctx, ang: number, z: number, fuera = 0): [V3, V3] => {
  const a = rad(ang), rf = (z > 8 ? 4.1 : 3.7) * c.A + fuera, rr = (z > 8 ? 5.2 : 4.6) * c.A + fuera;
  const p = c.e.T(Math.cos(a) * rf, Math.sin(a) * rr, c.e.zc + z * c.S), o = c.e.T(0, 0, c.e.zc + z * c.S);
  return [p, nor(sub(p, o))];
};
/** Punto en la superficie de la cabeza: ángulo horizontal, alto relativo al centro (en H) y su normal. */
const enCabeza = (c: Ctx, ang: number, alto: number, r = 4): [V3, V3] => {
  const a = rad(ang), k = Math.sqrt(Math.max(0.05, 1 - (alto / 4.6) ** 2));
  const p = c.e.cab(Math.cos(a) * r * k * c.H, Math.sin(a) * r * 0.92 * k * c.H, c.e.cz + alto * c.H), o = c.e.cab(0, 0, c.e.cz);
  return [p, nor(sub(p, o))];
};
/** Eje de un objeto empuñado en la derecha: el antebrazo girado hacia el pulgar `g` grados. */
function ejeMano(c: Ctx, g: number): V3 {
  const b = c.e.brazos[0], d2 = b.d2, F = c.e.F;
  let pul = sub(F, esc(d2, dot(F, d2)));
  if (len(pul) < 0.25) pul = sub([0, 0, 1], esc(d2, d2[2]));
  pul = nor(pul);
  return nor(add(esc(d2, Math.cos(rad(g))), pul, Math.sin(rad(g))));
}
/** Gotas de luz de mar que caen de un punto (en bucle con el cuadro). */
function gotas(c: Ctx, p: V3, k: number, sem: number, r = 0.55): Pieza[] {
  const ps: Pieza[] = [];
  for (let i = 0; i < k; i++) { const u = (c.ph * 2 + hr(sem + i)) % 1; ps.push(esfera(...cae(add(p, [(hr(sem + i * 3) - 0.5) * 2, (hr(sem + i * 5) - 0.5) * 2, 0]), u, p[2]), r * c.S * (1 - u * 0.3), { mat: u > 0.85 ? 'm67_bio_tenue' : 'm67_bio' })); }
  return ps;
}

// ================================================================== 1. AHOGADO CAMPANERO
function campanero(c: Ctx): Res {
  const { e, S, A, H, acc, f, w } = c;
  const ps: Pieza[] = [];
  // ---- la soga de la campana: un lazo al cuello con el nudo al costado y el cabo que cuelga hasta las rodillas
  const nc = cuello(c, 0.35), [fw, , up] = e.ejesT;
  const izq = e.ejesT[1];
  const lazo: Comp[] = [];
  const pts: V3[] = [];
  for (let i = 0; i <= 12; i++) { const a = (i / 12) * TAU; pts.push(add(add(add(nc, fw, Math.cos(a) * 3.5 * A + 0.4), izq, Math.sin(a) * 3.3 * A), up, -Math.cos(a) * 0.8 * S)); }
  for (let i = 0; i < 12; i++) lazo.push(hueso(pts[i], pts[i + 1], 0.95 * S, 0.95 * S, { mat: 'm67_soga' }));
  const nudo = add(add(nc, fw, 2.6 * A), izq, 2.6 * A);
  lazo.push(bulto(nudo, [1.9 * S, 1.6 * S, 2.1 * S], { mat: 'm67_soga' }), hueso(nudo, add(nudo, up, -3 * S), 1.4 * S, 1.1 * S, { mat: 'm67_soga' }));
  // el cabo: péndulo con el cuerpo (al caminar se mece, al pegar se va atrás, al morir queda en el piso)
  const mece = acc === 'caminar' || acc === 'correr' ? Math.sin(w) * 3 : acc === 'atacar' ? K([0, -2, -4, -3, 4, 6, 3, 1], f) : acc === 'herido' ? -3 : Math.sin(w) * 0.8;
  let p = add(nudo, up, -3 * S);
  const cabo: V3[] = [p];
  for (let i = 1; i <= 5; i++) { p = add(p, nor(add(add([0, 0, -1], fw, (mece * 0.08 + 0.12) * (i / 5)), izq, 0.05)), 5.2 * S); p = [p[0], p[1], Math.max(1 * S, p[2])]; cabo.push(p); }
  for (let i = 0; i < 5; i++) lazo.push(hueso(cabo[i], cabo[i + 1], 1 * S, 0.9 * S, { mat: 'm67_soga' }));
  ps.push(masa(lazo, { mat: 'm67_soga', suave: 0.6 }));
  // la punta deshilachada, con algas enredadas
  const fin = cabo[5];
  for (const k of [-1, 0, 1]) ps.push(palo(fin, add(add(fin, [0, 0, -2.6 * S]), lat(fw), k * 1.4 * S), 0.55 * S, { mat: 'm67_soga', r1: 0.15 * S }));
  ps.push(...alga(cabo[3], add(fw, [0, 0, -1]), 7 * S, 0.7 * S, w, 3, true));
  // ---- la campanita en la derecha: el mango en el puño y la campana más allá de los nudillos
  const b = e.brazos[0], ax = ejeMano(c, acc === 'atacar' ? 10 : 18), so = lat(ax), so2 = cruz(ax, so);
  const at = (k: number) => add(b.mano, ax, k * S);
  ps.push(palo(at(-2.6), at(2.4), 0.75 * S, { mat: 'madera_vieja' }), esfera(...at(-2.9), 1.1 * S, { mat: 'm67_bronce' }));
  const bell: Comp[] = [bulto(at(3.6), [1.3 * S, 1.8 * S, 1.8 * S], { eje: ax, mat: 'm67_bronce' }), hueso(at(4), at(7.4), 2.6 * S, 3.3 * S, { mat: 'm67_bronce' }), hueso(at(7.4), at(9.4), 3.3 * S, 4.4 * S, { mat: 'm67_bronce' }), bulto(at(9.3), [0.9 * S, 4.7 * S, 4.7 * S], { eje: ax, mat: 'm67_bronce', tono: 0.06 })];
  ps.push(masa(bell, { mat: 'm67_bronce', suave: 0.9 }));
  ps.push(elipE(at(9.9), ax, [2.2 * S, 3.6 * S, 3.6 * S], 'm67_bronce', 0, so));
  ps[ps.length - 1] = { ...ps[ps.length - 1], resta: true } as Pieza;
  // el badajo que golpea adentro
  const bad = (acc === 'atacar' ? K([0, 0, 0.5, 1, -1, -0.6, 0.3, 0], f) : Math.sin(w * 2)) * 1.6 * S;
  ps.push(palo(at(5), add(at(8.6), so, bad), 0.4 * S, { mat: 'm67_hierro_mar' }), esfera(...add(at(8.8), so, bad), 1.15 * S, { mat: 'm67_bronce_vivo' }));
  ps.push(...costra(add(at(6.6), so2, 3.1 * S), so2, 0.8 * S, 3, 41));
  ps.push(esfera(...add(at(7.8), so, -3.6 * S), 0.8 * S, { mat: 'm67_bio' }), esfera(...add(at(6.2), so2, -3 * S), 0.65 * S, { mat: 'm67_bio' }));
  // ---- percebes en el hombro izquierdo y la espalda; ampollas de ahogado; agua de mar que gotea
  const hi = e.brazos[1].hom;
  ps.push(...costra(add(hi, up, 1.6 * S), nor(add(up, sub(hi, e.T(0, 0, e.hombroZ)), 0.1)), 0.95 * S, 5, 7, 2));
  const [pe, ne] = enTorso(c, 200, 12, 1.2);
  ps.push(...costra(pe, ne, 1 * S, 6, 13, 3));
  for (const [ang, z] of [[30, 6], [-40, 3], [160, 4]] as [number, number][]) { const [q, nq] = enTorso(c, ang, z, 0.8); ps.push(elipE(q, nq, [0.9 * S, 1.3 * S, 1.3 * S], 'm67_piel_ahogada', 0.12)); }
  ps.push(...gotas(c, e.cab(3 * H, 0, e.cz - 4.4 * H), 2, 5), ...gotas(c, at(10), 2, 9));
  // ---- el tañido: al pegar la campana suelta ondas de luz de mar
  let resplandor: Res['resplandor'] = c.muerte < 0.8 ? { c: e.cab(4 * H, 0, e.cz), r: 12 * S, color: '#58d0b8' } : undefined;
  if (acc === 'atacar' && f >= 4 && f <= 6) {
    const k = (f - 3) / 3;
    for (let j = 0; j < 2; j++) ps.push(...aro(at(10), (4 + k * 10 + j * 5) * S, ax, 'm67_bio', -0.1 - k * 0.3 - j * 0.15, 0.7 * S, 0.25, j * 9));
    resplandor = { c: at(10), r: 26 * S, color: '#6ae8cc' };
  }
  return { piezas: ps, resplandor };
}
M.m67_hierro_mar = { rampa: ['#0a0908', '#141110', '#1f1916', '#2b221d', '#382c24', '#47372c', '#574333'], ruido: 0.45, escala: 0.6, brillo: 0.25, patron: (p) => (ruido(p[0] * 0.9, p[1] * 0.9, p[2] * 0.9) > 0.62 ? 0.08 : 0) };

// ================================================================== 2. MARINERO PERCEBE
function marinero(c: Ctx): Res {
  const { e, S, A, H, w } = c;
  const ps: Pieza[] = [];
  const up = e.ejesT[2];
  // ---- la costra: cráneo, costillar, hombros, pelvis, fémures, antebrazo y rodillas
  const [cr, ncr] = enCabeza(c, 140, 2.6, 3.9);
  ps.push(...costra(cr, ncr, 0.9 * S, 6, 1, 2));
  const [cr2, ncr2] = enCabeza(c, -60, 1.5, 3.9);
  ps.push(...costra(cr2, ncr2, 0.75 * S, 3, 2));
  for (const [ang, z, k, mj, sem] of [[30, 13, 5, 2, 3], [-70, 10, 4, 1, 4], [170, 14, 6, 2, 5], [100, 6, 3, 0, 6]] as [number, number, number, number, number][]) {
    const [q, nq] = enTorso(c, ang, z, -0.6);
    ps.push(...costra(q, nq, 0.9 * S, k, sem, mj));
  }
  for (const b of e.brazos) ps.push(...costra(add(b.hom, up, 1.4 * S), nor(add(up, sub(b.hom, e.T(0, 0, e.hombroZ)), 0.6)), 0.85 * S, 4, 8 + b.s, b.s > 0 ? 1 : 2));
  const bi = e.brazos[1];
  ps.push(...costra(mez(bi.codo, bi.mun, 0.5), lat(bi.d2), 0.75 * S, 3, 12, 1));
  for (const p of e.piernas) {
    ps.push(...costra(mez(p.cad, p.rod, 0.45), nor(add(e.F, lat(sub(p.rod, p.cad)), 0.3)), 0.8 * S, 4, 20 + p.s, 1));
    ps.push(...costra(add(p.rod, e.F, 1.2 * S), e.F, 0.7 * S, 2, 24 + p.s, 1));
  }
  ps.push(...costra(e.W(0, 0, e.zc + 0.6 * S), nor(add(e.F, up)), 0.85 * S, 4, 30, 2));
  // ---- algas: del costillar, del cráneo y del brazo
  ps.push(...alga(enTorso(c, 60, 9, -0.4)[0], e.F, 9 * S, 0.65 * S, w, 1, true));
  ps.push(...alga(enTorso(c, -20, 12, -0.4)[0], e.F, 11 * S, 0.7 * S, w, 2, false));
  ps.push(...alga(enTorso(c, 190, 10, -0.4)[0], esc(e.F, -1), 10 * S, 0.7 * S, w, 3, true));
  ps.push(...alga(enCabeza(c, 180, 1, 3.6)[0], esc(e.F, -1), 9 * S, 0.8 * S, w, 4, false));
  ps.push(...alga(mez(bi.codo, bi.mun, 0.3), bi.d2, 7 * S, 0.55 * S, w, 5, true));
  // ---- el garfio de abordaje (la hoz de hierro) con su cabo atado al pomo y al cinto
  const b = e.brazos[0], pomo = add(b.mano, b.eje, -3.2 * S), cinto = e.W(1.5 * S, -4.2 * A, e.zc + 1 * S);
  const cuelga = mez(pomo, cinto, 0.5);
  const cab: V3[] = [pomo, add(cuelga, [0, 0, -7 * S]), cinto];
  const cs: Comp[] = [];
  for (let i = 0; i <= 6; i++) { const t = i / 6, q: V3 = [lerp(pomo[0], cinto[0], t), lerp(pomo[1], cinto[1], t), Math.max(1 * S, lerp(pomo[2], cinto[2], t) - Math.sin(t * PI) * 8 * S)]; cab.push(q); }
  for (let i = 3; i < cab.length - 1; i++) cs.push(hueso(cab[i], cab[i + 1], 0.55 * S, 0.55 * S, { mat: 'm67_soga' }));
  cs.push(bulto(pomo, [1.2 * S, 1.2 * S, 1.2 * S], { mat: 'm67_soga' }));
  ps.push(masa(cs, { mat: 'm67_soga', suave: 0.4 }));
  ps.push(...costra(add(b.mano, b.eje, 6 * S), lat(b.eje), 0.6 * S, 2, 50));
  // ---- un pañuelo de marinero podrido al cuello
  const nc = cuello(c, 0.2);
  ps.push(masa([bulto(add(nc, e.F, 1.8 * S), [2.4 * S, 3.4 * A, 1.4 * S], { eje: e.F, mat: 'm67_tela_ahogada' }), hueso(add(nc, e.F, 2.6 * S), add(add(nc, e.F, 3.6 * S), [0, 0, -6 * S]), 1.3 * S, 0.5 * S, { mat: 'm67_tela_ahogada' })], { mat: 'm67_tela_ahogada', suave: 0.8 }));
  ps.push(...gotas(c, add(nc, e.F, 3.6 * S), 1, 7));
  return { piezas: ps, resplandor: c.muerte < 0.8 ? { c: e.cab(4 * H, 0, e.cz), r: 9 * S, color: '#58d0b8' } : undefined };
}

// ================================================================== 3. SIRENA HUECA
/** La cola de peces muertos y algas: sale de la cadera, pasa por las rodillas, baja al piso y se enrosca atrás. */
function colaSirena(c: Ctx, ps: Pieza[]): void {
  const { e, S, A, acc, w, f } = c;
  const cad = mez(e.piernas[0].cad, e.piernas[1].cad, 0.5), rod = mez(e.piernas[0].rod, e.piernas[1].rod, 0.5);
  const atras = esc(e.F, -1), der = e.R;
  const caido = e.caida > 0.3;
  const amp = acc === 'caminar' || acc === 'correr' ? 1.6 : acc === 'atacar' ? 1.1 : 0.7;
  const pts: V3[] = [add(cad, [0, 0, 1.5 * S]), add(rod, [0, 0, 1 * S])];
  let d = nor(add(sub(rod, cad), atras, 0.5)), p = pts[1];
  const N = 7;
  for (let i = 0; i < N; i++) {
    const t = (i + 1) / N;
    // baja hasta el piso y se curva hacia atrás; la punta sube un poco
    const meta = caido ? nor(add(sub(rod, cad), [0, 0, 0])) : nor(add(add(esc(atras, 0.5 + t * 1.1), [0, 0, t < 0.45 ? -1.2 : 0.25 + (t - 0.45) * 1.6]), der, Math.sin(w + t * 3.4) * amp * 0.6 * t));
    d = nor(mez(d, meta, 0.55));
    p = add(p, d, (7.2 - t * 2.4) * S);
    p = [p[0], p[1], Math.max((5.4 - t * 4) * S, p[2])];
    pts.push(p);
  }
  const rC = (i: number) => (i === 0 ? 7 * A : i === 1 ? 6.2 * A : Math.max(1.2, 5.6 - (i - 1) * 0.68) * S);
  const cs: Comp[] = [];
  for (let i = 0; i < pts.length - 1; i++) cs.push(hueso(pts[i], pts[i + 1], rC(i), rC(i + 1), { mat: 'm67_escama_muerta' }));
  // bultos de algas pegadas a la cola
  for (let i = 1; i < pts.length - 2; i += 2) cs.push(bulto(add(mez(pts[i], pts[i + 1], 0.5), lat(sub(pts[i + 1], pts[i])), rC(i) * 0.6), [rC(i) * 0.9, rC(i) * 0.6, rC(i) * 0.6], { eje: sub(pts[i + 1], pts[i]), mat: 'm67_alga' }));
  ps.push(masa(cs, { mat: 'm67_escama_muerta', suave: 2 }));
  // peces muertos fundidos en la cola: cuerpo, cola, ojo blanco y la boca abierta; algunos salen de lado
  for (let k = 0; k < 11; k++) {
    const i = 1 + Math.floor(hr(k * 3.3) * (pts.length - 2.2)), t = hr(k * 5.1), a = pts[i], bb = pts[i + 1], tg = nor(sub(bb, a));
    const u = lat(tg), v = cruz(tg, u), ang = hr(k * 7.7) * TAU, nrm = add(esc(u, Math.cos(ang)), v, Math.sin(ang));
    const r = rC(i) * (1 - t) + rC(i + 1) * t, L = (4.2 + hr(k) * 2.6) * S, sale = hr(k * 9) < 0.35;
    const dirPez = nor(add(add(tg, nrm, sale ? 0.9 : 0.15), lat(tg), hr(k * 4) - 0.5));
    const c0 = add(mez(a, bb, t), nrm, r * (sale ? 0.9 : 0.75));
    ps.push(elipE(c0, dirPez, [L * 0.5, 1.15 * S, 1.6 * S], 'm67_escama_muerta', (hr(k * 2) - 0.5) * 0.25, nrm));
    const colaP = add(c0, dirPez, -L * 0.5);
    ps.push(poliedro([colaP, add(add(colaP, dirPez, -2.2 * S), nrm, 1.6 * S), add(add(colaP, dirPez, -2.2 * S), nrm, -1.6 * S), add(colaP, cruz(dirPez, nrm), 0.3 * S)], { mat: 'm67_aleta' }));
    ps.push(esfera(...add(add(c0, dirPez, L * 0.32), nrm, 0.9 * S), 0.55 * S, { mat: k % 3 ? 'm67_percebe' : 'm67_bio' }));
  }
  // la aleta del final: rayos rotos en abanico
  const fin = pts[pts.length - 1], tgf = nor(sub(fin, pts[pts.length - 2])), uf = nor(add(lat(tgf), [0, 0, 0.6]));
  for (let k = -2; k <= 2; k++) {
    const dk = nor(add(tgf, uf, k * 0.42)), Lk = (7 - Math.abs(k) * 0.6 - hr(k + 5) * 2.2) * S;
    const q0 = add(fin, uf, k * 0.6 * S), q1 = add(q0, dk, Lk), q2 = add(add(q0, dk, Lk * 0.8), uf, 1.4 * S);
    ps.push(poliedro([q0, q1, q2, add(q0, cruz(dk, uf), 0.35 * S), add(q1, cruz(dk, uf), 0.2 * S)], { mat: 'm67_aleta', tono: (k % 2) * 0.05 }));
    ps.push(palo(q0, q1, 0.35 * S, { mat: 'm67_hueso_mar', r1: 0.1 }));
  }
  // faldón de algas que cuelga de la cadera, con puntas que brillan
  for (let k = 0; k < 7; k++) {
    const a = -110 + k * 36, q = add(e.W(Math.cos(rad(a)) * 5.4 * A, Math.sin(rad(a)) * 5.6 * A, 0), [0, 0, cad[2] + 1 * S]);
    ps.push(...alga(q, sub(q, add(cad, [0, 0, 1 * S])), (8 + hr(k) * 5) * S, 0.8 * S, w + k, k * 2, k % 2 === 0));
  }
  void f;
}
function sirena(c: Ctx): Res {
  const { e, S, A, H, acc, f, w } = c;
  const ps: Pieza[] = [];
  colaSirena(c, ps);
  // costillas y clavículas que asoman, jirones de algas por los hombros
  const up = e.ejesT[2];
  for (const s of [1, -1]) ps.push(...alga(add(e.brazos[s > 0 ? 0 : 1].hom, up, 1 * S), add(esc(e.F, 0.3), e.R, s), 9 * S, 0.7 * S, w, 10 + s, s > 0));
  ps.push(...costra(enTorso(c, 150, 6, 0.4)[0], enTorso(c, 150, 6)[1], 0.8 * S, 4, 3, 1));
  ps.push(...costra(enCabeza(c, 120, 2, 3.9)[0], enCabeza(c, 120, 2)[1], 0.7 * S, 3, 4));
  // la boca: en el chillido se abre de par en par
  const grita = acc === 'lanzar' ? K([0, 0.2, 0.4, 0.6, 1, 0.8, 0.5, 0.2], f) : acc === 'herido' ? 0.7 : acc === 'atacar' ? K([0, 0.3, 0.6, 0.8, 1, 0.6, 0.3, 0], f) : 0.15;
  ps.push(elipE(e.cab(3.4 * H, 0, e.cz - 2.4 * H - grita * 0.8 * H), e.ejesCab[1], [1.4 * H, 0.8 * H, (0.8 + grita * 1.7) * H], 'm67_vacio', 0, e.ejesCab[2]));
  let resplandor: Res['resplandor'] = c.muerte < 0.8 ? { c: e.cab(5 * H, 0, e.cz), r: 12 * S, color: '#58d0b8' } : undefined;
  // lanzar: agua negra que se junta en la mano y sale en chorro
  if (acc === 'lanzar') {
    const b = e.brazos[0], m0 = add(b.mano, b.d2, 2 * S);
    if (f >= 1 && f <= 4) {
      const k = (f) / 4, rr = (1.6 + k * 2.6) * S;
      ps.push(esfera(...m0, rr, { mat: 'm67_agua_negra' }));
      for (let i = 0; i < 6; i++) { const a = i * 1.05 + w * 2, q = add(m0, [Math.cos(a) * (rr + 2.4 * S), Math.sin(a) * (rr + 2.4 * S), Math.sin(a * 1.7) * 2 * S]); ps.push(elipE(q, [-Math.sin(a), Math.cos(a), 0], [1.4 * S, 0.5 * S, 0.5 * S], 'm67_agua_negra', 0.1)); }
      ps.push(esfera(...add(m0, [0, 0, rr * 0.5]), 0.7 * S, { mat: 'm67_bio' }));
      resplandor = { c: m0, r: 14 * S, color: '#4ab8a8' };
    }
    if (f >= 4) {
      const k = (f - 3) / 4, F = e.F;
      for (let i = 0; i < 9; i++) {
        const u = i / 8, dist = (6 + u * 40 * k + k * 8) * S, q = add(add(m0, F, dist), [0, 0, (Math.sin(u * PI) * 4 - u * u * 6 * k) * S]);
        ps.push(elipE(q, F, [(2.6 - u) * S, (1.5 - u * 0.6) * S, (1.5 - u * 0.6) * S], 'm67_agua_negra', u * 0.1));
        if (i % 3 === 1) ps.push(esfera(...add(q, [0, 0, 1.3 * S]), 0.55 * S, { mat: 'm67_bio' }));
      }
    }
  }
  // el chillido (herido y al lanzar): ondas pálidas que salen de la boca
  if (grita > 0.55) {
    const boca = e.cab(4.2 * H, 0, e.cz - 2.6 * H);
    for (let j = 0; j < 2; j++) { const r = (3 + (grita * 6 + j * 5)) * S; ps.push(...aro(add(boca, e.ejesCab[0], (2 + j * 3) * S), r, e.ejesCab[0], 'm67_ojo_mar', -0.3 - j * 0.25, 0.5 * S, 0.35, j + f)); }
  }
  void A;
  return { piezas: ps, resplandor };
}

// ================================================================== 4. SACERDOTE DE LA MAREA
/** Donde va la vara del báculo (lo mismo que hace cuerpo.ts): pie, tope y eje. */
function varaDe(e: Esqueleto, m: V3, lg: number): [V3, V3, V3] {
  const S = e.S;
  if (e.varaPie && e.vara) { const L = len(sub(m, e.varaPie)); return [e.varaPie, add(m, e.vara, Math.max(12 * S, 64 * S * lg - L)), e.vara]; }
  if (!e.vara) return [add([m[0], m[1], Math.max(0.5, m[2] - 24 * S * lg)], e.F, 1.2), add([m[0], m[1], m[2] + 26 * S * lg], e.F, 2.4), [0, 0, 1]];
  const v = e.vara, pie = add(m, v, -24 * S * lg);
  if (pie[2] < 0.5) { const k = (m[2] - 0.5) / Math.max(0.01, m[2] - pie[2]); pie[0] = m[0] + (pie[0] - m[0]) * k; pie[1] = m[1] + (pie[1] - m[1]) * k; pie[2] = 0.5; }
  return [pie, add(m, v, 26 * S * lg), v];
}
/** Una mano ahogada que sale del agua del piso, con la palma arriba y los dedos que se cierran. */
function manoAhogada(c0: V3, alto: number, s: number, cierra: number, sem: number, F: V3): Pieza[] {
  const up: V3 = [0, 0, 1], u = nor(add(F, [hr(sem) - 0.5, hr(sem + 1) - 0.5, 0], 0.8)), v = cruz(up, u);
  const mun = add(c0, [0, 0, alto]), codo = add(c0, [0, 0, Math.max(0, alto - 9 * s)]);
  const cs: Comp[] = [hueso(add(c0, [0, 0, -2]), codo, 1.9 * s, 1.7 * s, { mat: 'm67_piel_ahogada' }), hueso(codo, mun, 1.7 * s, 1.3 * s, { mat: 'm67_piel_ahogada' }), bulto(add(mun, up, 1.6 * s), [1.2 * s, 2.2 * s, 2 * s], { eje: u, mat: 'm67_piel_ahogada' })];
  for (let k = -1.5; k <= 1.5; k += 1) {
    const b = add(add(mun, up, 3.2 * s), v, k * 0.95 * s), d1 = nor(add(up, u, cierra * 0.9 + 0.1)), m1 = add(b, d1, 2.6 * s), d2 = nor(add(d1, u, cierra * 1.6)), t = add(m1, d2, 2.2 * s);
    cs.push(hueso(b, m1, 0.6 * s, 0.5 * s), hueso(m1, t, 0.5 * s, 0.3 * s));
  }
  cs.push(hueso(add(add(mun, up, 1.4 * s), v, -2 * s), add(add(add(mun, up, 3.6 * s), v, -2.6 * s), u, cierra * 1.6 * s), 0.6 * s, 0.35 * s));
  return [masa(cs, { mat: 'm67_piel_ahogada', suave: 0.8 * s })];
}
function sacerdote(c: Ctx): Res {
  const { e, S, A, H, acc, f, w } = c;
  const ps: Pieza[] = [];
  const cz = e.cz, fwC = e.ejesCab[0];
  // ---- la mitra rota: banda, dos hojas (la de adelante quebrada), la franja de bronce y las ínfulas atrás
  const band: Comp[] = [];
  for (let i = 0; i < 12; i++) { const a0 = (i / 12) * TAU, a1 = ((i + 1) / 12) * TAU; band.push(hueso(e.cab(Math.cos(a0) * 3.9 * H, Math.sin(a0) * 3.6 * H, cz + 2.4 * H), e.cab(Math.cos(a1) * 3.9 * H, Math.sin(a1) * 3.6 * H, cz + 2.4 * H), 0.9 * H, 0.9 * H, { mat: 'm67_bronce' })); }
  ps.push(masa(band, { mat: 'm67_bronce', suave: 0.4 }));
  const hoja = (x0: number, pts2: [number, number][], tono: number) => {
    const g = 0.45 * H, P: V3[] = [];
    for (const [y, z] of pts2) for (const dx of [-g, g]) P.push(e.cab(x0 * H + dx - (z - 2.4) * 0.12 * H * Math.sign(x0), y * H, cz + z * H));
    return poliedro(P, { mat: 'm67_estola', tono });
  };
  // atrás entera, en punta
  ps.push(hoja(-1.6, [[-3.4, 2.6], [3.4, 2.6], [-2.6, 7.5], [2.6, 7.5], [0, 11.5]], -0.04));
  // adelante quebrada: el canto roto en zigzag
  ps.push(hoja(1.8, [[-3.4, 2.6], [3.4, 2.6], [-2.8, 6.6], [2.6, 6.2], [-1.4, 8.4], [0.6, 7.2], [1.6, 7.8]], 0.03));
  ps.push(palo(e.cab(2.3 * H, 0, cz + 2.6 * H), e.cab(1.75 * H, 0, cz + 7.4 * H), 0.55 * H, { mat: 'm67_bronce' }));
  ps.push(palo(e.cab(-2.1 * H, 0, cz + 2.6 * H), e.cab(-1.4 * H, 0, cz + 11 * H), 0.55 * H, { mat: 'm67_bronce' }));
  ps.push(...costra(e.cab(2.3 * H, 1.6 * H, cz + 4.4 * H), fwC, 0.6 * S, 3, 5));
  for (const s of [1, -1]) ps.push(...alga(e.cab(-3.4 * H, s * 1.6 * H, cz + 2.2 * H), add(esc(fwC, -1), [0, 0, -1]), 11 * S, 0.8 * S, w, s, s > 0));
  // ---- el báculo de bronce con su voluta y el farol que cuelga
  const [pie, tope, upV] = varaDe(e, e.brazos[0].mano, 1);
  let sd = nor(cruz(upV, [0, 0, 1])); if (len(cruz(upV, [0, 0, 1])) < 0.2) sd = nor(cruz(upV, e.R)); else sd = nor(add(e.F, esc(upV, -dot(e.F, upV))));
  if (!isFinite(sd[0])) sd = e.F;
  const vol: V3[] = [];
  const cen = add(add(tope, upV, 6.2 * S), sd, 3.4 * S);
  for (let i = 0; i <= 9; i++) { const a = PI + (i / 9) * PI * 1.55, r = (3.6 - i * 0.12) * S; vol.push(add(add(cen, sd, Math.cos(a) * r), upV, Math.sin(a) * -r)); }
  vol.unshift(add(tope, upV, 1.5 * S));
  const vc: Comp[] = [];
  for (let i = 0; i < vol.length - 1; i++) vc.push(hueso(vol[i], vol[i + 1], 0.75 * S, 0.68 * S, { mat: 'm67_bronce' }));
  ps.push(masa(vc, { mat: 'm67_bronce', suave: 0.4 }));
  ps.push(...costra(add(tope, upV, -6 * S), sd, 0.55 * S, 3, 21));
  // el farol: cadena corta, tapa, jaula de cuatro barras y la luz de mar adentro; se mece
  const gancho = vol[vol.length - 1], oscila = (acc === 'caminar' || acc === 'correr' ? Math.sin(w) * 0.35 : acc === 'lanzar' ? 0.25 : Math.sin(w) * 0.12);
  const colg = nor(add([0, 0, -1], e.F, oscila)), fz = add(gancho, colg, 3.2 * S);
  ps.push(palo(gancho, fz, 0.3 * S, { mat: 'm67_hierro_mar' }));
  const fc = add(fz, colg, 4.4 * S), fu = lat(colg), fv = cruz(colg, fu);
  ps.push(cilindro(...fz, 2.6 * S, 1.6 * S, { mat: 'm67_bronce', r1: 0.8 * S, eje: esc(colg, -1) }));
  ps.push(cilindro(...add(fc, colg, 3.6 * S), 2.4 * S, 1.2 * S, { mat: 'm67_bronce', r1: 2.7 * S, eje: esc(colg, -1) }));
  for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + 0.4, o = add(esc(fu, Math.cos(a) * 2.3 * S), fv, Math.sin(a) * 2.3 * S); ps.push(palo(add(add(fz, colg, 0.4 * S), o), add(add(fc, colg, 3.6 * S), o), 0.32 * S, { mat: 'm67_bronce' })); }
  const brilla = acc === 'lanzar' ? K([0.4, 0.6, 0.9, 1, 1, 0.9, 0.7, 0.5], f) : 0.45 + Math.sin(w * 2) * 0.08;
  const vivo = c.muerte < 0.85;
  if (vivo) { ps.push(elipE(fc, colg, [2.6 * S, 1.8 * S, 1.8 * S], 'm67_bio', brilla * 0.3 - 0.15)); ps.push(esfera(...fc, 1 * S, { mat: 'm67_ojo_mar' })); }
  else ps.push(elipE(fc, colg, [2.4 * S, 1.6 * S, 1.6 * S], 'm67_agua_negra'));
  void pie;
  // ---- estola con conchas, algas del cinto y gotas
  for (const s of [1, -1]) { const [q, nq] = enTorso(c, s * 24, 13, 1.4); ps.push(elipE(q, [0, 0, 1], [1.4 * S, 1.2 * S, 0.6 * S], 'cu_concha', 0, nq)); }
  ps.push(...alga(e.W(4 * A, 3 * A, e.zc + 1 * S), e.F, 9 * S, 0.7 * S, w, 31, true), ...alga(e.W(1 * A, -4.6 * A, e.zc + 1 * S), e.R, 8 * S, 0.7 * S, w, 32));
  ps.push(...gotas(c, add(fc, colg, 4 * S), 2, 13, 0.6));
  // ---- la invocación: un círculo de luz de mar en el piso y manos ahogadas que salen del agua
  let resplandor: Res['resplandor'] = vivo ? { c: fc, r: (16 + brilla * 14) * S, color: '#5ad8c0' } : undefined;
  if (acc === 'lanzar') {
    const k = K([0, 0.15, 0.35, 0.6, 0.85, 1, 1, 0.9], f), cen2 = add([0, 0, 0.6], e.F, 22 * S);
    ps.push(...aro(cen2, (8 + k * 9) * S, [0, 0, 1], 'm67_bio', -0.2 + k * 0.2, 0.8 * S, 0.2, 3), ...aro(cen2, (4 + k * 5) * S, [0, 0, 1], 'm67_bio_tenue', 0, 0.6 * S, 0.35, 5));
    ps.push(elipE(add(cen2, [0, 0, -0.2]), e.F, [(9 + k * 8) * S, (9 + k * 8) * S, 0.5], 'm67_agua_negra'));
    for (let j = 0; j < 3; j++) {
      const a = (j / 3) * TAU + 0.6, q = add(cen2, [Math.cos(a) * 7 * S, Math.sin(a) * 7 * S, 0]), sube = clamp(k * 1.4 - j * 0.2, 0, 1);
      if (sube > 0.05) ps.push(...manoAhogada(q, sube * 14 * S, S, 0.2 + sube * 0.6, j * 7, e.F));
    }
    for (let i = 0; i < 6; i++) { const u = (c.ph + hr(i)) % 1; ps.push(esfera(cen2[0] + (hr(i * 3) - 0.5) * 18 * S, cen2[1] + (hr(i * 5) - 0.5) * 18 * S, (2 + u * 26) * S, 0.6 * S, { mat: 'm67_bio' })); }
    resplandor = { c: lerp(0, 1, k) > 0.5 ? add(cen2, [0, 0, 8 * S]) : fc, r: (22 + k * 12) * S, color: '#5ad8c0' };
  }
  void A;
  return { piezas: ps, resplandor };
}

// ================================================================== 5. SUPLICANTE ANIMADO
function suplicante(c: Ctx): Res {
  const { e, S, A, H, acc, f, w } = c;
  const ps: Pieza[] = [];
  const brillo = acc === 'herido' ? 1 : acc === 'morir' ? K([0.4, 1, 1.4, 1.2, 0.9, 0.5, 0.2, 0], f) : acc === 'atacar' ? K([0.3, 0.4, 0.6, 0.8, 1, 0.7, 0.5, 0.3], f) : 0.35 + 0.1 * Math.sin(w);
  const luz = brillo > 0.15 ? 0.4 + brillo * 0.6 : 0;
  // ---- grietas de vacío con canto de oro: la cara (por el ojo), el pecho, la espalda, los brazos y una pierna
  const caraP: V3[] = [];
  for (let i = 0; i <= 5; i++) { const t = i / 5; caraP.push(e.cab((3.7 - Math.abs(t - 0.4) * 1.2) * H, (-2.6 + t * 4.2) * H, e.cz + (3.2 - t * 6) * H + Math.sin(i * 2.1) * 0.5 * H)); }
  ps.push(...grieta(caraP, 0.42 * S, { luz }));
  const pecho: V3[] = [];
  for (let i = 0; i <= 6; i++) { const t = i / 6, [q] = enTorso(c, -30 + t * 55 + Math.sin(i * 2.7) * 10, 17 - t * 13, 1.1); pecho.push(q); }
  ps.push(...grieta(pecho, 0.55 * S, { luz }));
  const esp: V3[] = [];
  for (let i = 0; i <= 5; i++) { const t = i / 5, [q] = enTorso(c, 160 + t * 40 + Math.sin(i * 1.9) * 12, 16 - t * 12, 1.1); esp.push(q); }
  ps.push(...grieta(esp, 0.5 * S));
  for (const b of e.brazos) ps.push(...grieta(surcoMiembro(b.hom, b.codo, 2.5 * A, 7 + b.s * 3, 0.15, 0.95, 4), 0.42 * S, { luz: b.s > 0 ? luz : 0 }));
  const bi = e.brazos[1];
  ps.push(...grieta(surcoMiembro(bi.codo, bi.mun, 2.1 * A, 19, 0.1, 0.9, 3), 0.38 * S));
  const pd = e.piernas[0];
  ps.push(...grieta(surcoMiembro(pd.cad, pd.rod, 3.4 * A, 23, 0.2, 1, 4), 0.45 * S));
  // un trozo que ya se cayó del hombro izquierdo: el hueco muestra el vacío
  const [hq, hn] = enTorso(c, -95, 16.5, 0.6);
  ps.push(elipE(hq, hn, [0.8 * S, 2.6 * S, 2 * S], 'm67_vacio', 0, [0, 0, 1]), elipE(add(hq, hn, -0.3 * S), hn, [0.9 * S, 3 * S, 2.4 * S], 'm67_oro', 0, [0, 0, 1]));
  // ---- lascas y polvo de mármol cuando se mueve (crujidos)
  const suelta = acc === 'caminar' || acc === 'correr' ? 2 : acc === 'atacar' ? 3 : acc === 'herido' ? 5 : acc === 'morir' ? 6 : 0;
  for (let i = 0; i < suelta; i++) {
    const u = (c.ph * (acc === 'herido' ? 1 : 2) + hr(i * 3.1)) % 1, o = [e.brazos[0].codo, e.brazos[1].hom, enTorso(c, 40, 14, 1)[0], e.cab(2 * H, 2 * H, e.cz + 2 * H), pd.rod, enTorso(c, -60, 6, 1)[0]][i % 6];
    const q = cae(o, u, o[2], [(hr(i) - 0.5) * 6 * S, (hr(i * 7) - 0.5) * 6 * S, 0]), sz = (0.7 + hr(i * 5) * 0.6) * S;
    ps.push(poliedro([add(q, [sz, 0, 0]), add(q, [-sz * 0.6, sz * 0.8, 0.2]), add(q, [-0.3 * sz, -sz, -0.3 * sz]), add(q, [0, 0, sz * 1.2])], { mat: 'm67_marmol', tono: 0.05 }));
  }
  if (acc === 'caminar' || acc === 'correr') for (const p of e.piernas) if (p.tob[2] < 3 * S) for (let i = 0; i < 3; i++) { const a = hr(i + p.s * 4) * TAU; ps.push(esfera(p.punta[0] + Math.cos(a) * 2.4 * S, p.punta[1] + Math.sin(a) * 2.4 * S, 0.8 * S, (1 + hr(i) * 0.6) * S, { mat: 'm67_polvo_marmol' })); }
  // ---- morir: se parte; el brazo izquierdo cae suelto y las grietas se apagan
  if (acc === 'morir' && f >= 3) {
    const k = clamp((f - 3) / 3, 0, 1), o = add(e.W(6 * S, -10 * S, 0), [0, 0, lerp(14, 2.2, k * k) * S]);
    const brazoC: Comp[] = [hueso(o, add(o, nor([0.8, -0.3, -0.2 * (1 - k)]), 10 * S), 2.3 * A, 1.9 * A, { mat: 'm67_marmol' }), hueso(add(o, nor([0.8, -0.3, -0.2 * (1 - k)]), 10 * S), add(o, nor([0.9, 0.4, 0]), 18 * S), 1.9 * A, 1.4 * A, { mat: 'm67_marmol' })];
    ps.push(masa(brazoC, { mat: 'm67_marmol', suave: 1 }));
    ps.push(elipE(o, [0.8, -0.3, 0], [0.6 * S, 2.2 * S, 2.2 * S], 'm67_vacio'));
  }
  const vivo = c.muerte < 0.9;
  return { piezas: ps, resplandor: vivo ? { c: enTorso(c, 0, 12, 4)[0], r: (8 + brillo * 10) * S, color: '#ece8ff' } : undefined };
}

// ================================================================== 6. ÁNGEL SEDIENTO
/** Un ala de piedra rota: hueso del brazo con el borde de oro, plumas largas en capas y una rotura con el vacío. */
function alaPiedra(c: Ctx, s: number, bate: number, rota: number, abre: number, caida: number): Pieza[] {
  const { e, S, A } = c;
  const ps: Pieza[] = [];
  const raiz = e.T(-3.4 * A, s * 2.8 * A, e.hombroZ - 1.5 * S);
  const codo = e.T((-9 - abre * 2) * S, s * (9 + abre * 6 + bate * 2) * S, e.hombroZ + (11 + bate * 5 + abre * 2) * S);
  const mun = e.T((-11 - abre * 3) * S, s * (18 + abre * 9 + bate * 3) * S, e.hombroZ + (17 + bate * 7 + abre * 3) * S);
  const punta = e.T((-14 - abre * 2) * S, s * (25 + abre * 10 + bate * 3) * S, e.hombroZ + (12 + bate * 9) * S);
  // el plano del ala y hacia dónde caen las plumas (abajo y atrás)
  const nrm = nor(cruz(sub(mun, raiz), sub(codo, raiz)));
  const cuelga = nor(add(add([0, 0, -1], esc(e.F, -1), 0.35), esc(e.R, s), 0.15 * (1 - abre)));
  // hasta dónde llega el ala (la derecha se quebró en la muñeca)
  const huesoA: [V3, V3][] = [[raiz, codo], [codo, mun]];
  if (!rota) huesoA.push([mun, punta]);
  const hs: Comp[] = [];
  for (const [a, b] of huesoA) hs.push(hueso(a, b, 1.9 * S, 1.4 * S, { mat: 'm67_marmol' }));
  ps.push(masa(hs, { mat: 'm67_marmol', suave: 0.9 }));
  for (const [a, b] of huesoA) ps.push(palo(add(a, [0, 0, 1.3 * S]), add(b, [0, 0, 1.2 * S]), 0.5 * S, { mat: 'm67_oro' }));
  // plumas: primarias desde la muñeca (si el ala está entera), secundarias del codo a la muñeca y cobertoras arriba
  const filas: { a: V3; b: V3; n: number; L0: number; L1: number; tono: number }[] = [
    { a: raiz, b: codo, n: 5, L0: 8, L1: 12, tono: 0.03 }, { a: codo, b: mun, n: 6, L0: 13, L1: 17, tono: 0 },
  ];
  if (!rota) filas.push({ a: mun, b: punta, n: 5, L0: 19, L1: 14, tono: -0.03 });
  let idx = 0;
  for (const fl of filas) for (let i = 0; i < fl.n; i++) {
    idx++;
    if (hr(idx * 3.3 + s) < 0.12) continue; // faltan plumas
    const t = (i + 0.5) / fl.n, base = mez(fl.a, fl.b, t), L = lerp(fl.L0, fl.L1, t) * S * (0.85 + hr(idx) * 0.3);
    const d = nor(add(cuelga, sub(fl.b, fl.a), 0.12 + i * 0.02));
    const rotaP = hr(idx * 7.1 + s) < 0.22 ? 0.55 : 1;
    const cc = add(add(base, d, L * 0.5 * rotaP), [0, 0, -caida * base[2] * 0.0]);
    ps.push(elipE(cc, d, [L * 0.5 * rotaP, 2.1 * S, 0.7 * S], 'm67_marmol', fl.tono + (hr(idx) - 0.5) * 0.08, cruz(nrm, d)));
    if (rotaP < 1) ps.push(elipE(add(cc, d, L * 0.5 * rotaP), d, [0.4 * S, 1.6 * S, 0.5 * S], 'm67_vacio', 0, cruz(nrm, d)));
  }
  // cobertoras: escamas de piedra sobre el hueso
  for (let i = 0; i < 6; i++) { const t = (i + 0.5) / 6, q = mez(raiz, mun, t), d = nor(add(cuelga, sub(mun, raiz), 0.3)); ps.push(elipE(add(q, d, 2.4 * S), d, [3.6 * S, 2.2 * S, 0.9 * S], 'm67_marmol', 0.05, cruz(nrm, d))); }
  // la rotura: el vacío en la muñeca y lascas
  if (rota) {
    const d = nor(sub(mun, codo));
    ps.push(elipE(add(mun, d, 0.6 * S), d, [0.8 * S, 2.4 * S, 2.4 * S], 'm67_vacio'), elipE(add(mun, d, 0.2 * S), d, [0.7 * S, 2.8 * S, 2.8 * S], 'm67_borde_vacio', -0.2));
    for (let k = 0; k < 3; k++) { const a = hr(k + 3) * TAU, u = lat(d), v = cruz(d, u), q = add(add(mun, u, Math.cos(a) * 2 * S), v, Math.sin(a) * 2 * S); ps.push(poliedro([q, add(q, d, (2 + hr(k) * 2) * S), add(q, u, 1.2 * S), add(q, v, 1.2 * S)], { mat: 'm67_marmol' })); }
  }
  ps.push(...grieta(surcoMiembro(raiz, mun, 1.9 * S, 30 + s, 0.1, 0.8, 3), 0.35 * S));
  return ps;
}
function angel(c: Ctx): Res {
  const { e, S, A, H, acc, f, w } = c;
  const ps: Pieza[] = [];
  // alas: baten lento (piedra), se abren al atacar y se rompen al morir
  const bate = acc === 'quieto' ? Math.sin(w) * 0.5 : acc === 'caminar' || acc === 'correr' ? Math.sin(w * 2) * 0.9 : acc === 'herido' ? -0.6 : 0;
  const abre = acc === 'atacar' ? K([0, 0.4, 0.8, 1, 0.9, 0.6, 0.3, 0], f) : acc === 'herido' ? 0.6 : acc === 'morir' ? K([0, 0.6, 0.4, 0.1, 0, 0, 0, 0], f) : 0.1;
  for (const s of [1, -1]) ps.push(...alaPiedra(c, s, bate - (acc === 'morir' ? c.muerte * 1.2 : 0), s > 0 ? 1 : 0, abre, 0));
  // ---- ciego: una cicatriz de vacío donde irían los ojos
  const cic: V3[] = [];
  for (let i = 0; i <= 5; i++) { const t = -1 + (i / 5) * 2; cic.push(e.cab((3.75 - t * t * 0.8) * H, t * 2.4 * H, e.cz + 0.3 * H + Math.sin(i * 1.7) * 0.25 * H)); }
  ps.push(...grieta(cic, 0.4 * S, { oro: true }));
  // ---- la boca vertical del pecho: se cava, adentro el vacío y la luz; labios de oro y dientes hacia adentro
  const abreB = acc === 'atacar' ? K([0.2, 0.4, 0.7, 1, 1.2, 1, 0.6, 0.3], f) : acc === 'herido' ? 0.9 : acc === 'morir' ? K([0.3, 1.2, 1, 0.8, 0.6, 0.4, 0.3, 0.3], f) : 0.2 + 0.08 * Math.sin(w);
  const [, , upT] = e.ejesT, fwT = e.ejesT[0], izqT = e.ejesT[1];
  const bc = e.T(4.2 * A, 0, e.zc + 11.5 * S), alto = 7.4 * S, ab = (0.8 + abreB * 2.2) * S;
  ps.push({ ...elipE(add(bc, fwT, 1.4 * S), upT, [alto, ab + 0.4 * S, 3.6 * S], 'm67_marmol', 0, izqT), resta: true } as Pieza);
  ps.push(elipE(add(bc, fwT, -1.2 * S), upT, [alto * 0.95, ab + 0.2 * S, 2.4 * S], 'm67_vacio', 0, izqT));
  ps.push(esfera(...add(bc, fwT, -1.6 * S), (0.9 + abreB * 0.8) * S, { mat: 'm67_luz', tono: -0.2 + abreB * 0.2 }));
  const lab: Comp[] = [];
  for (const s of [1, -1]) {
    let prev: V3 | null = null;
    for (let i = 0; i <= 8; i++) {
      const t = -1 + i / 4, q = add(add(add(bc, upT, t * alto), izqT, s * (ab + 0.5 * S) * Math.sqrt(Math.max(0, 1 - t * t)) + s * 0.3 * S), fwT, (0.6 - Math.abs(t) * 0.6) * S);
      if (prev) lab.push(hueso(prev, q, 0.75 * S, 0.75 * S, { mat: 'm67_oro' }));
      if (i > 0 && i < 8) ps.push(palo(q, add(add(q, izqT, -s * (1.1 + abreB * 0.7) * S), fwT, -0.4 * S), 0.35 * S, { mat: 'm67_diente', r1: 0.06 }));
      prev = q;
    }
  }
  ps.push(masa(lab, { mat: 'm67_oro', suave: 0.5 }));
  ps.push(...grieta(surcoMiembro(e.T(0, 0, e.zc + 4 * S), e.T(0, 0, e.zc + 17 * S), 4.4 * A, 41, 0.05, 0.95, 4).map((q) => q), 0.4 * S));
  // ---- polvo de luz que sube alrededor (vuela bajo)
  if (c.muerte < 0.6) for (let i = 0; i < 6; i++) { const u = (c.ph + hr(i * 1.3)) % 1, a = hr(i * 4.1) * TAU; ps.push(esfera(Math.cos(a) * 9 * S, Math.sin(a) * 9 * S, (1 + u * 22) * S - 12 * S, 0.5 * S, { mat: 'm67_luz', tono: -0.2 - u * 0.4 })); }
  // ---- al morir, plumas de piedra en el piso
  if (acc === 'morir' && f >= 3) for (let i = 0; i < 8; i++) { const a = hr(i * 2.2) * TAU, r = (8 + hr(i) * 14) * S, k = clamp((f - 3) / 3, 0, 1); ps.push(elipE([Math.cos(a) * r, Math.sin(a) * r, lerp(26, 1, k) * S - 12 * S * (1 - k)], [Math.cos(a + 1), Math.sin(a + 1), 0], [5 * S, 1.8 * S, 0.6 * S], 'm67_marmol', (hr(i) - 0.5) * 0.1, [Math.cos(a + 2.6), Math.sin(a + 2.6), 0])); }
  return { piezas: ps, resplandor: c.muerte < 0.8 ? { c: add(bc, fwT, 3 * S), r: (10 + abreB * 10) * S, color: '#f2eee2' } : undefined };
}

// ================================================================== 7. GUARDIÁN DEL HALO
function guardian(c: Ctx): Res {
  const { e, S, A, H, acc, f, w } = c;
  const ps: Pieza[] = [];
  // ---- el halo roto: aro de oro blanco atrás de la cabeza con un tramo que falta, la luz adentro y un trozo suelto
  const centro = e.cab(-4.2 * H, 0, e.cz + 3.4 * H), nn = nor(add(e.ejesCab[0], [0, 0, 0.45])), u = nor(cruz([0, 0, 1], nn)), v = cruz(nn, u);
  const R = 7.6 * H, N = 26, gira = (acc === 'herido' ? 0.4 : 0) + Math.sin(w) * 0.04, apaga = c.muerte;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU + gira, a1 = ((i + 1) / N) * TAU + gira;
    if (a0 % TAU > 0.55 * PI && a0 % TAU < 0.9 * PI) continue; // el pedazo que falta
    const p0 = add(add(centro, u, Math.cos(a0) * R), v, Math.sin(a0) * R), p1 = add(add(centro, u, Math.cos(a1) * R), v, Math.sin(a1) * R);
    ps.push(palo(p0, p1, 0.85 * S, { mat: 'cu_oro_blanco', tono: (hr(i) - 0.5) * 0.08 }));
    if (apaga < 0.7) ps.push(palo(add(p0, nn, -0.7 * S), add(p1, nn, -0.7 * S), 0.45 * S, { mat: 'm67_luz', tono: -0.15 }));
  }
  // el trozo roto que flota fuera de lugar, y la grieta de vacío en el canto
  const a = 0.72 * PI + Math.sin(w) * 0.05, q0 = add(add(centro, u, Math.cos(a) * (R + 2.2 * S)), v, Math.sin(a) * (R + 2.2 * S)), q1 = add(add(centro, u, Math.cos(a + 0.22) * (R + 2.6 * S)), v, Math.sin(a + 0.22) * (R + 2.6 * S));
  ps.push(palo(q0, add(q1, [0, 0, Math.sin(w * 2) * 0.6 * S]), 0.8 * S, { mat: 'cu_oro_blanco' }));
  for (const aa of [0.55 * PI, 0.9 * PI]) { const q = add(add(centro, u, Math.cos(aa + gira) * R), v, Math.sin(aa + gira) * R); ps.push(elipE(q, nn, [0.6 * S, 1.1 * S, 1.1 * S], 'm67_vacio')); }
  // ---- la luz que sale por la visera
  if (apaga < 0.8) ps.push(elipE(e.cab(4.3 * H, 0, e.cz + 0.4 * H), e.ejesCab[1], [2.2 * H, 0.35 * H, 0.45 * H], 'm67_luz', 0, e.ejesCab[2]));
  // ---- el oro blanco del peto agrietado con el vacío
  const g1: V3[] = [];
  for (let i = 0; i <= 5; i++) { const t = i / 5, [q] = enTorso(c, -20 + t * 50 + Math.sin(i * 2.3) * 8, 16 - t * 9, 2.1); g1.push(q); }
  ps.push(...grieta(g1, 0.45 * S, { oro: false, luz: 0.8 }));
  const g2: V3[] = [];
  for (let i = 0; i <= 3; i++) { const t = i / 3, [q] = enTorso(c, 40 - t * 25, 10 - t * 5, 2.1); g2.push(q); }
  ps.push(...grieta(g2, 0.4 * S, { oro: false }));
  // ---- motas de luz que caen de la lanza
  const b = e.brazos[0];
  for (let i = 0; i < 4; i++) { const t = 0.3 + hr(i) * 0.6, u2 = (c.ph * 2 + hr(i * 3)) % 1, o = add(b.mano, b.eje, (8 + t * 24) * S); ps.push(esfera(...cae(o, u2, 10 * S), 0.45 * S, { mat: 'm67_luz_oro', tono: -u2 * 0.4 })); }
  void f; void A;
  return { piezas: ps, resplandor: apaga < 0.8 ? { c: add(b.mano, b.eje, 22 * S), r: 20 * S, color: '#fff4d8' } : undefined };
}

// ================================================================== 8. SEDIENTO
function sediento(c: Ctx): Res {
  const { e, S, A, H, acc, f, w } = c;
  const ps: Pieza[] = [];
  // ---- el hueso bajo la piel: vértebras, omóplatos, crestas de la cadera, pómulos y rótulas
  const piel = c.cu.piel, hs: Comp[] = [];
  for (let i = 0; i < 8; i++) hs.push(bulto(e.T(-3.3 * A - 0.2, 0, e.zc + (2 + i * 2.1) * S), [1 * S, 0.9 * S, 0.8 * S], { mat: piel }));
  for (const s of [1, -1]) {
    hs.push(bulto(e.T(-3 * A, s * 3 * A, e.zc + 14 * S), [1 * S, 2.2 * S, 3 * S], { mat: piel }));
    hs.push(hueso(e.W(1.5 * S, s * 3.8 * A, e.zc + 2.4 * S), e.W(-1.5 * S, s * 4.4 * A, e.zc + 3 * S), 0.9 * S, 0.9 * S, { mat: piel }));
    hs.push(bulto(e.cab(2.6 * H, s * 2.4 * H, e.cz - 0.9 * H), [1.1 * H, 0.8 * H, 0.7 * H], { mat: piel }));
  }
  ps.push(masa(hs, { mat: piel, suave: 0.6 }));
  for (const p of e.piernas) ps.push(esfera(...add(p.rod, e.F, 1 * S), 1.2 * S, { mat: piel }));
  // ---- el polvo de oro que le cae de la boca (al correr queda atrás)
  const boca = e.cab(3.8 * H, 0, e.cz - 2.6 * H), atras = acc === 'correr' ? 12 : acc === 'caminar' ? 6 : acc === 'atacar' ? 2 : 1;
  const sale = c.muerte > 0.85 ? 0 : acc === 'atacar' ? 14 : acc === 'herido' ? 12 : 10;
  for (let i = 0; i < sale; i++) {
    const u = (c.ph * (acc === 'correr' ? 2 : 1) + hr(i * 2.7)) % 1, deriva = add(esc(e.F, -atras * S * (0.4 + hr(i) * 0.8)), [(hr(i * 5) - 0.5) * 3 * S, (hr(i * 3) - 0.5) * 3 * S, 0]);
    const q = cae(add(boca, e.F, 0.6 * S), u, boca[2] + 1, deriva);
    ps.push(esfera(...q, (0.75 - u * 0.25) * S, { mat: 'm67_luz_oro', tono: -0.05 - u * 0.35 }));
  }
  // el hilo de polvo pegado a la barbilla y el pecho, y el montoncito en el piso cuando está quieto
  ps.push(elipE(e.cab(3.6 * H, 0, e.cz - 3.8 * H), e.ejesCab[2], [1.4 * H, 0.6 * H, 0.5 * H], 'm67_oro', 0.05, e.ejesCab[1]));
  for (let i = 0; i < 4; i++) { const [q, nq] = enTorso(c, (hr(i) - 0.5) * 50, 9 + i * 2.3, 0.2); ps.push(elipE(q, [0, 0, 1], [0.8 * S, 0.6 * S, 0.3 * S], 'm67_oro', (hr(i * 3) - 0.5) * 0.2, cruz(nq, [0, 0, 1]))); }
  if (acc === 'quieto' || acc === 'lanzar') ps.push(elipE(add(e.W(5 * S, 0, 0), [0, 0, 0.5]), e.F, [2.6 * S, 2.2 * S, 0.9 * S], 'm67_oro', -0.05));
  void f;
  return { piezas: ps, resplandor: c.muerte < 0.85 ? { c: add(boca, [0, 0, -4 * S]), r: 7 * S, color: '#e8b850' } : undefined };
}

// ------------------------------------------------------------------ el catálogo de humanoides
const deslizar = (acc: Accion, f: number): [Accion, number] => (acc === 'caminar' || acc === 'correr' ? ['quieto', (f / 2) % 4] : [acc, f]);
const guardianEq: Equipo = (() => {
  const eq = armaduraDeLinea('celestial', 4);
  eq.cabeza = { tipo: 'gran_yelmo', mat: 'cu_oro_blanco', mat2: 'm67_oro' };
  eq.arma = { tipo: 'lanza', mat: 'm67_lanza', mango: 'm67_lanza', encanto: 'sagrado' };
  eq.capa = { mat: 'cu_tela_blanca', largo: 0.9 };
  return eq;
})();

export const MONSTRUOS67: Monstruo67[] = [
  {
    id: 'ahogado_campanero', nombre: ['Ahogado campanero', 'Drowned bell-ringer'], descripcion: ['Hinchado y pálido, con la soga de la campana al cuello; pega con una campanita de mano.', 'Bloated and pale, the bell rope still round its neck; strikes with a hand bell.'],
    cuerpo: { alto: 1.04, ancho: 1.24, musculo: 0.15, grasa: 1, piel: 'm67_piel_ahogada', parches: 'm67_lividez', ojos: 'm67_ojo_mar', boca: 'fauces', joroba: 0.45, cabeza: 1.12, pelo: 'm67_alga', peinado: 'largo' },
    equipo: { torso: { tipo: 'sin_mangas', mat: 'm67_tela_ahogada' }, piernas: { tipo: 'faldon', mat: 'm67_tela_ahogada', mat2: 'm67_tela_ahogada' }, cinturon: { mat: 'm67_soga', hebilla: 'm67_bronce' }, arma: { tipo: 'puno' } },
    extra: campanero,
  },
  {
    id: 'marinero_percebe', nombre: ['Marinero percebe', 'Barnacled sailor'], descripcion: ['Esqueleto con costra de percebes y mejillones; tira el garfio de abordaje.', 'A skeleton crusted with barnacles and mussels; swings a boarding hook.'],
    cuerpo: { oseo: true, alto: 1.02, piel: 'm67_hueso_mar', ojos: 'm67_ojo_mar' },
    equipo: { cinturon: { mat: 'm67_soga', hebilla: 'm67_bronce' }, cabeza: { tipo: 'gorro', mat: 'm67_tela_ahogada', mat2: 'm67_tela_ahogada' }, arma: { tipo: 'hoz', mat: 'm67_hierro_mar', mango: 'madera_vieja' } },
    extra: marinero,
  },
  {
    id: 'sirena_hueca', nombre: ['Sirena hueca', 'Hollow siren'], magia: true, descripcion: ['Torso de mujer descarnado sobre una cola de peces muertos; flota, chilla y lanza agua negra.', 'A fleshless woman’s torso on a tail of dead fish; floats, shrieks and hurls black water.'],
    cuerpo: { genero: 'm', flota: true, demacrado: true, garras: true, alto: 1.06, ancho: 0.86, musculo: 0, joroba: 0.3, piel: 'm67_piel_hueca', parches: 'm67_hueso_mar', ojos: 'm67_ojo_mar', pelo: 'm67_alga', peinado: 'melena' },
    equipo: { arma: { tipo: 'puno' } },
    extra: sirena, sinMuslos: true, pose: deslizar,
    vuelo: (acc, f) => (acc === 'morir' ? lerp(8, 0, clamp(f / 5, 0, 1)) : 8 + Math.sin((f / CUADROS[acc]) * TAU) * 1.5),
    inclina: (acc) => (acc === 'caminar' ? 12 : acc === 'correr' ? 20 : 0),
  },
  {
    id: 'sacerdote_marea', nombre: ['Sacerdote de la marea', 'Tide priest'], magia: true, descripcion: ['Clérigo ahogado con la mitra rota y un báculo con farol; invoca manos del agua.', 'A drowned cleric with a broken mitre and a lantern crosier; calls hands out of the water.'],
    cuerpo: { alto: 1.08, musculo: 0.1, demacrado: true, joroba: 0.35, piel: 'm67_piel_ahogada', ojos: 'm67_ojo_mar', pelo: 'm67_alga', peinado: 'largo', barba: 'larga' },
    equipo: { torso: { tipo: 'tunica', mat: 'm67_tela_sacerdote' }, piernas: { tipo: 'tunica_larga', mat: 'm67_tela_sacerdote' }, tabardo: { mat: 'm67_estola', borde: 'm67_bronce' }, capa: { mat: 'm67_tela_ahogada', largo: 0.85 }, cinturon: { mat: 'm67_soga', hebilla: 'm67_bronce' }, arma: { tipo: 'baculo', mango: 'm67_bronce', gema: 'm67_bronce' } },
    extra: sacerdote,
  },
  {
    id: 'suplicante_animado', nombre: ['Suplicante animado', 'Animated supplicant'], descripcion: ['Estatua de los que intentaron antes; cruje al moverse y el vacío asoma por sus grietas.', 'A statue of those who tried before; it creaks as it moves and the void shows through its cracks.'],
    cuerpo: { alto: 1.06, ancho: 1.04, musculo: 0.45, joroba: 0.35, piel: 'm67_marmol', ojos: 'm67_marmol', peinado: 'calvo' },
    equipo: { torso: { tipo: 'tunica', mat: 'm67_marmol_gris' }, piernas: { tipo: 'faldon', mat: 'm67_marmol_gris', mat2: 'm67_marmol_gris' }, cabeza: { tipo: 'capucha', mat: 'm67_marmol_gris' }, cinturon: { mat: 'm67_oro', hebilla: 'm67_oro' } },
    extra: suplicante,
  },
  {
    id: 'angel_sediento', nombre: ['Ángel sediento', 'Thirsting angel'], descripcion: ['Ángel de mármol sin ojos, con alas de piedra rotas y una boca vertical en el pecho; vuela bajo.', 'An eyeless marble angel with broken stone wings and a vertical mouth in its chest; flies low.'],
    cuerpo: { alto: 1.5, ancho: 1, musculo: 0.55, cabeza: 0.95, piel: 'm67_marmol', ojos: 'm67_marmol', pelo: 'm67_marmol', peinado: 'corto' },
    equipo: { piernas: { tipo: 'tunica_larga', mat: 'm67_marmol_gris' }, cinturon: { mat: 'm67_oro', hebilla: 'm67_oro' }, manos: { tipo: 'brazales', mat: 'm67_oro' }, arma: { tipo: 'garras', mat: 'm67_oro' } },
    extra: angel, pose: deslizar, huella: 2,
    vuelo: (acc, f) => (acc === 'morir' ? lerp(12, 0, clamp(f / 4, 0, 1)) : 12 + Math.sin((f / CUADROS[acc]) * TAU) * 2),
    inclina: (acc) => (acc === 'caminar' ? 10 : acc === 'correr' ? 18 : 0),
  },
  {
    id: 'guardian_halo', nombre: ['Guardián del halo', 'Halo warden'], descripcion: ['Caballero de oro blanco con el halo roto y una lanza de luz.', 'A white-gold knight with a broken halo and a spear of light.'],
    cuerpo: { alto: 1.22, ancho: 1.1, musculo: 0.7, piel: 'm67_marmol', ojos: 'm67_luz' },
    equipo: guardianEq,
    extra: guardian,
  },
  {
    id: 'sediento', nombre: ['Sediento', 'Thirster'], descripcion: ['Humano consumido, la piel pegada al hueso y polvo de oro que le cae de la boca; corre en enjambre.', 'A wasted human, skin stuck to bone and gold dust falling from its mouth; runs in swarms.'],
    cuerpo: { alto: 0.92, ancho: 0.8, musculo: 0.05, demacrado: true, garras: true, boca: 'fauces', joroba: 0.75, cabeza: 1.05, piel: 'm67_piel_seca', ojos: 'm67_ojo_hundido', peinado: 'calvo' },
    equipo: { piernas: { tipo: 'taparrabo', mat: 'm67_tela_ceniza' }, arma: { tipo: 'puno' } },
    extra: sediento,
  },
];

for (const m of MONSTRUOS67) for (const [acc, [aes, aen]] of ACCIONES) {
  if (acc === 'lanzar' && !m.magia) continue;
  if (acc === 'correr' && (m.jefe || m.cuerpo.oseo)) continue;
  const h = m.huella ?? 1;
  registrar({
    id: `mon_${m.id}_${acc}`, nombre: [`${m.nombre[0]} · ${aes}`, `${m.nombre[1]} · ${aen}`], tema: 'monstruos',
    variantes: [...DIRS], cuadros: CUADROS[acc], t: acc === 'quieto' ? 6 : 3, huella: [h, h], bloquea: true,
    armar: (v, f) => escenaMonstruo(m, v as Dir, acc, f),
  });
}
export const BESTIAS67: { id: string; nombre: [string, string]; huella: [number, number]; jefe: boolean }[] = [];
