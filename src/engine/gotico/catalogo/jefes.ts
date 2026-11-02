import { registrar } from '../objeto';
import { MATERIALES } from '../materiales';
import { DIRS, type Dir } from '../figura';
import { encantar } from '../cuerpo';
import { ruido, cilindro, elipsoide, esfera, palo, poliedro, caja, masa, hueso, bulto, girarPiezas, type Comp, type Pieza, type V3, type Escena, type OpcComp } from '../render';

/**
 * Jefes: seis monstruos hechos a mano, cada uno con su propia anatomía (no un personaje escalado): Ozmaren, el
 * demonio de obsidiana y lava del final; la abadesa que flota con su máscara de porcelana; el rey momia de la
 * máscara de oro que no tiene sombra; la madre del pantano echada en su montículo de barro; el rey gigante de la
 * escarcha con su hacha de hielo; y el verdugo con su cuchilla y su cadena de garfios.
 *
 * Cada uno se arma en un marco local (x adelante, y a la izquierda, z arriba, origen en el piso bajo el centro)
 * mirando al sureste y se gira entero al rumbo de cada dirección. Acciones: quieto (4 cuadros), caminar, atacar,
 * lanzar, herido (4), morir y especial (8). Ids: jefe_<id>_<accion>. Escala: una persona mide 61 (75 px).
 */

// ------------------------------------------------------------------ materiales propios
const M = MATERIALES;
M.jf_obsidiana = { rampa: ['#020202', '#060506', '#0b090b', '#110e11', '#181418', '#201b20', '#2a242a', '#383038', '#4c434c', '#665a64'], ruido: 0.18, escala: 0.45, brillo: 0.75, patron: (p) => { const v = ruido(p[0] * 0.22, p[1] * 0.22, p[2] * 0.22); return Math.abs(v - 0.5) < 0.025 ? -0.22 : ruido(p[0] * 0.9, p[1] * 0.9, p[2] * 0.9) > 0.72 ? 0.06 : 0; } };
M.jf_cuerno = { rampa: ['#060404', '#0f0b09', '#1b1410', '#2a2018', '#3b2e22', '#4f3f2e', '#66533d', '#7e6a50'], ruido: 0.25, escala: 0.8, brillo: 0.35, patron: (p) => (Math.sin(p[2] * 1.6 + p[0] * 0.4) > 0.6 ? -0.1 : 0) };
M.jf_garra = { rampa: ['#0b0807', '#1a1411', '#2c241d', '#41372d', '#5a4e40', '#776a58', '#978a74', '#b8ab92'], ruido: 0.15, escala: 0.8, brillo: 0.5 };
M.jf_hueso_negro = { rampa: ['#020202', '#070606', '#0e0c0b', '#171412', '#221d1a', '#2e2823', '#3c342d', '#4e443a', '#62574a'], ruido: 0.14, escala: 0.8, brillo: 0.7, patron: (p) => (Math.sin(p[0] * 1.7 + p[1] * 1.3 + p[2] * 2.1) > 0.75 ? -0.06 : 0) };
M.jf_piel_fuego = { rampa: ['#0a0202', '#160403', '#230605', '#320806', '#430b07', '#560f08', '#6b150a', '#841d0c', '#a02a10', '#bc3e14', '#d65a1c'], ruido: 0.14, escala: 0.5, brillo: 0.45, patron: (p) => { const v = ruido(p[0] * 0.3, p[1] * 0.3, p[2] * 0.3); return (v > 0.66 ? -0.07 : 0) + (Math.sin(p[2] * 1.3 + v * 9) > 0.9 ? -0.05 : 0); } };
M.jf_piel_ascua = { rampa: ['#160403', '#2a0705', '#420c06', '#5c1308', '#781c0a', '#94280d', '#b03810', '#c84c14', '#de661c', '#f08a2c'], ruido: 0.16, escala: 0.5, brillo: 0.35, patron: (p) => (ruido(p[0] * 0.3, p[1] * 0.3, p[2] * 0.3) > 0.62 ? 0.06 : 0) };
M.jf_membrana_fuego = { rampa: ['#070202', '#100403', '#1a0604', '#260805', '#340b06', '#440f08', '#58150a', '#6e1c0c'], ruido: 0.4, escala: 0.5, patron: (p) => { const v = ruido(p[0] * 0.16, p[1] * 0.16, p[2] * 0.16); return Math.abs(v - 0.5) < 0.035 ? 0.12 : v > 0.7 ? -0.08 : 0; } };
M.jf_una_negra = { rampa: ['#030303', '#080707', '#100e0d', '#1a1716', '#262220', '#35302c', '#4a443e'], ruido: 0.08, escala: 0.9, brillo: 0.8 };
M.jf_vaho = { rampa: ['#262422', '#36332f', '#48443f', '#5c5752', '#716b65', '#87807a'], ruido: 0.6, escala: 0.5 };
M.jf_costilla = { rampa: ['#0c0908', '#1a1311', '#2a201b', '#3c2f27', '#504034', '#665343', '#7d6853'], ruido: 0.25, escala: 0.7, brillo: 0.3 };
M.jf_membrana = { rampa: ['#080303', '#120605', '#1e0a08', '#2c100b', '#3c160f', '#4e1d13', '#622618', '#78301e'], ruido: 0.55, escala: 0.6, patron: (p) => (ruido(p[0] * 0.5, p[1] * 0.5, p[2] * 0.5) > 0.64 ? -0.15 : 0) };
M.jf_ceniza = { rampa: ['#090807', '#121010', '#1b1817', '#25211f', '#302b28', '#3c3632', '#49423d'], ruido: 0.35, escala: 0.5, patron: (p) => (Math.abs(ruido(p[0] * 0.22, p[1] * 0.22, p[2] * 0.22) - 0.5) < 0.03 ? -0.25 : 0) };
M.jf_humo = { rampa: ['#0a0909', '#141212', '#1e1b1a', '#292524', '#35302e', '#423c39'], ruido: 0.6, escala: 0.3 };
M.jf_brasa_honda = { rampa: ['#2a0602', '#4a0c04', '#6e1606', '#952408', '#b8360c'], ruido: 0.5, escala: 0.4, emite: true };
M.jf_lava_fria = { rampa: ['#0e0403', '#1a0705', '#2a0c07', '#3c110a', '#4e170c'], ruido: 0.3, escala: 0.5 };
M.jf_hierro_rojo = { rampa: ['#3a0804', '#6a1206', '#a0240a', '#d04410', '#f07a20'], ruido: 0.3, escala: 0.6, emite: true };
M.jf_porcelana = { rampa: ['#24211f', '#3e3a37', '#5c5753', '#7d7872', '#9f9a92', '#bfbab1', '#d9d4cb', '#ece8e0'], ruido: 0.05, escala: 0.6, brillo: 0.6 };
M.jf_habito = { rampa: ['#050505', '#0a0909', '#110f10', '#181517', '#201c1e', '#2a2427', '#352e31', '#433a3d'], ruido: 0.35, escala: 0.9, patron: (p) => (ruido(p[0] * 0.25, p[1] * 0.25, p[2] * 0.12) > 0.66 ? -0.12 : (Math.sin(p[0] * 1.3 + p[1] * 1.1) > 0.8 ? -0.05 : 0)) };
M.jf_toca = { rampa: ['#141312', '#252321', '#3a3734', '#524e4a', '#6c6762', '#87827b', '#a29c94', '#bab4ab'], ruido: 0.25, escala: 0.9, patron: (p) => (ruido(p[0] * 0.3, p[1] * 0.3, p[2] * 0.3) > 0.64 ? -0.3 : 0) };
M.jf_cera_negra = { rampa: ['#050404', '#0b0909', '#131010', '#1c1817', '#26211f', '#312b28'], ruido: 0.1, escala: 0.5, brillo: 0.45 };
M.jf_cera_palida = { rampa: ['#2e281f', '#4a4234', '#695e4b', '#8a7d65', '#a89a80', '#c2b59a', '#d8ccb2'], ruido: 0.1, escala: 0.5, brillo: 0.3 };
M.jf_lapis = { rampa: ['#05081a', '#0b1230', '#121d48', '#1c2b60', '#283b78', '#36508e'], ruido: 0.15, escala: 0.6, brillo: 0.4 };
M.jf_venda_vieja = { rampa: ['#1e1912', '#332b20', '#4b4130', '#655842', '#807156', '#9a8a6c', '#b1a183', '#c4b598'], ruido: 0.35, escala: 1.1, patron: (p) => ((Math.floor(p[2] * 0.9 + p[0] * 0.3 + p[1] * 0.25) % 2) ? -0.1 : 0.03) };
M.jf_barro = { rampa: ['#070604', '#100d08', '#1a150d', '#251e13', '#312818', '#3e331f', '#4c3f27'], ruido: 0.5, escala: 0.3, brillo: 0.35 };
M.jf_piel_sapo = { rampa: ['#090a08', '#131510', '#1e2119', '#2a2e23', '#373b2e', '#45483a', '#555847', '#686a57', '#7e7f6a'], ruido: 0.3, escala: 0.5, brillo: 0.45, patron: (p) => (ruido(p[0] * 0.3, p[1] * 0.3, p[2] * 0.3) > 0.62 ? -0.2 : ruido(p[0] * 1.3, p[1] * 1.3, p[2] * 1.3) > 0.74 ? 0.08 : 0) };
M.jf_vientre_sapo = { rampa: ['#1a1810', '#2e2a1c', '#46402b', '#5f573b', '#79704d', '#938a62', '#aaa178'], ruido: 0.25, escala: 0.6, brillo: 0.35 };
M.jf_enredadera = { rampa: ['#070805', '#0e110a', '#161b0f', '#1f2614', '#29321a', '#343f20'], ruido: 0.45, escala: 0.7, patron: (p) => (Math.sin(p[2] * 2.2 + p[0] + p[1]) > 0.5 ? -0.08 : 0) };
M.jf_pelo_cienaga = { rampa: ['#080806', '#11120c', '#1b1c13', '#26271a', '#323322', '#3f402b'], ruido: 0.5, escala: 1.4, patron: (p) => (ruido(p[0] * 2.5, p[1] * 2.5, p[2] * 0.3) - 0.5) * 0.3 };
M.jf_cuero_sangre = { rampa: ['#0a0504', '#150a08', '#22100c', '#311710', '#401f15', '#50281b'], ruido: 0.3, escala: 0.6, brillo: 0.3, patron: (p) => (ruido(p[0] * 0.3, p[1] * 0.3, p[2] * 0.2) > 0.6 ? -0.12 : 0) };
M.jf_hielo_azul = { rampa: ['#0c1a2a', '#16304a', '#21486a', '#2f628a', '#4280a8', '#5f9fc2', '#88c0da', '#bfe2f0', '#eef8fc'], ruido: 0.15, escala: 0.15, brillo: 0.85 };
M.jf_escarcha = { rampa: ['#1d2630', '#2f3c4a', '#435466', '#5a6e82', '#73899c', '#8fa5b6', '#adc2cf', '#d0e0e8'], ruido: 0.45, escala: 1.2, patron: (p) => (ruido(p[0] * 2.4, p[1] * 2.4, p[2] * 0.5) - 0.5) * 0.3 };
M.jf_piel_escarcha = { rampa: ['#0b0e12', '#151a20', '#20262e', '#2c343e', '#3a434f', '#4a5461', '#5c6774', '#717c89', '#8994a0', '#a3adb7'], ruido: 0.14, escala: 0.4, brillo: 0.25, patron: (p) => (ruido(p[0] * 0.5, p[1] * 0.5, p[2] * 0.5) > 0.7 ? 0.07 : 0) };
M.jf_piel_verdugo = { rampa: ['#120d0c', '#201715', '#302321', '#42302c', '#553f39', '#694e46', '#7d5f55', '#917165', '#a48478'], ruido: 0.18, escala: 0.45, brillo: 0.3, patron: (p) => (ruido(p[0] * 0.35, p[1] * 0.35, p[2] * 0.35) > 0.66 ? -0.1 : ruido(p[0] * 0.8, p[1] * 0.8, p[2] * 0.8) > 0.78 ? -0.06 : 0) };
M.jf_niebla = { rampa: ['#103010', '#1a501a', '#2a7a24', '#46a838', '#7ad860'], ruido: 0.6, escala: 0.25, emite: true };
M.jf_niebla_densa = { rampa: ['#0c240c', '#163c14', '#225a1c', '#367a2a', '#509a3c'], ruido: 0.6, escala: 0.2, emite: true };

// ------------------------------------------------------------------ vectores y marcos
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const esc = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const nor = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cruz = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const pto = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const mez = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const suave = (t: number) => { const u = clamp(t, 0, 1); return u * u * (3 - 2 * u); };
const rad = (g: number) => (g * Math.PI) / 180;
const TAU = Math.PI * 2;
/** Azar fijo por número (igual en todos los cuadros). */
const hr = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
/** Valor de una tabla de cuadros clave (admite cuadros fraccionarios). */
const K = (v: number[], f: number) => { const i = Math.floor(f), t = f - i; return lerp(v[Math.min(i, v.length - 1)], v[Math.min(i + 1, v.length - 1)], t); };

type M3 = [V3, V3, V3];
/** Marco rígido: origen y matriz (columnas: adónde van x adelante, y izquierda, z arriba). */
interface Tr { o: V3; m: M3 }
const I3: M3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const mv = (m: M3, p: V3): V3 => [m[0][0] * p[0] + m[1][0] * p[1] + m[2][0] * p[2], m[0][1] * p[0] + m[1][1] * p[1] + m[2][1] * p[2], m[0][2] * p[0] + m[1][2] * p[1] + m[2][2] * p[2]];
const mm = (a: M3, b: M3): M3 => [mv(a, b[0]), mv(a, b[1]), mv(a, b[2])];
const ap = (t: Tr, p: V3): V3 => add(t.o, mv(t.m, p));
const cmp = (a: Tr, b: Tr): Tr => ({ o: ap(a, b.o), m: mm(a.m, b.m) });
/** Alabeo: el lado izquierdo baja con g > 0. */
const Rx = (g: number): M3 => { const c = Math.cos(rad(g)), s = Math.sin(rad(g)); return [[1, 0, 0], [0, c, s], [0, -s, c]]; };
/** Cabeceo: la nariz baja con g > 0. */
const Ry = (g: number): M3 => { const c = Math.cos(rad(g)), s = Math.sin(rad(g)); return [[c, 0, -s], [0, 1, 0], [s, 0, c]]; };
/** Guiñada: gira hacia la izquierda con g > 0. */
const Rz = (g: number): M3 => { const c = Math.cos(rad(g)), s = Math.sin(rad(g)); return [[c, s, 0], [-s, c, 0], [0, 0, 1]]; };
const T = (o: V3, ...ms: M3[]): Tr => ({ o, m: ms.reduce(mm, I3) });
const ejesDe = (t: Tr): [V3, V3, V3] => [nor(t.m[0]), nor(t.m[1]), nor(t.m[2])];
const bT = (t: Tr, c: V3, r: V3, o: OpcComp = {}) => bulto(ap(t, c), r, { ...o, ejes: ejesDe(t) });
const hT = (t: Tr, a: V3, b: V3, r0: number, r1: number, o: OpcComp = {}) => hueso(ap(t, a), ap(t, b), r0, r1, o);
/** Matriz con el eje x a lo largo de `v` y el z lo más vertical posible. */
function marcoEje(v: V3): M3 { const ex = nor(v); const up: V3 = Math.abs(ex[2]) > 0.95 ? [1, 0, 0] : [0, 0, 1]; const ey = nor(cruz(up, ex)); return [ex, ey, cruz(ex, ey)]; }
/** Elipsoide orientado a mano (eje x a lo largo de `ex`). */
function elipE(c: V3, ex: V3, r: V3, mat: string, tono?: number, ey0?: V3): Pieza {
  const x = nor(ex);
  let y = ey0 ? sub(ey0, esc(x, pto(ey0, x))) : cruz([0, 0, 1], x);
  if (len(y) < 1e-4) y = cruz([0, 1, 0], x);
  y = nor(y);
  return { k: 'elip', c, ex: x, ey: y, ez: cruz(x, y), r, mat, tono } as Pieza;
}
/** Dos huesos que llegan de `a` a `t` doblando hacia `doblez`: devuelve la articulación del medio y el punto alcanzado. */
function ik(a: V3, t: V3, l1: number, l2: number, doblez: V3): [V3, V3] {
  const d = sub(t, a), L = len(d), dn = L > 1e-6 ? esc(d, 1 / L) : [0, 0, -1] as V3;
  const Lc = clamp(L, Math.abs(l1 - l2) + 0.05, (l1 + l2) * 0.998);
  const ca = (l1 * l1 + Lc * Lc - l2 * l2) / (2 * l1 * Lc), sa = Math.sqrt(Math.max(0, 1 - ca * ca));
  let pp = sub(doblez, esc(dn, pto(doblez, dn)));
  if (len(pp) < 1e-6) pp = [0, 0, 1];
  pp = nor(pp);
  return [add(add(a, dn, l1 * ca), pp, l1 * sa), add(a, dn, Lc)];
}
/** Pie en un ciclo de marcha: en apoyo va de adelante hacia atrás por el piso, en vuelo sube y vuelve adelante. */
function paso(fase: number, largo: number, alto: number, apoyo = 0.55): { x: number; z: number; vuelo: number } {
  const p = ((fase % 1) + 1) % 1;
  if (p < apoyo) return { x: largo / 2 - largo * (p / apoyo), z: 0, vuelo: 0 };
  const u = (p - apoyo) / (1 - apoyo);
  return { x: -largo / 2 + largo * suave(u), z: alto * Math.sin(Math.PI * u), vuelo: Math.sin(Math.PI * u) };
}
/** Diente, garra o púa: cono de `a` hacia `b`. */
const pua = (a: V3, b: V3, r: number, mat = 'cu_hueso', tono = 0) => palo(a, b, r, { mat, r1: r * 0.1, tono });
/** Esquirla de piedra o cristal: pirámide irregular de base triangular que sale de `base` hacia `dir`. */
function esquirla(base: V3, dir: V3, largo: number, ancho: number, sem: number, mat: string, tono = 0): Pieza {
  const d = nor(dir), u = nor(Math.abs(d[2]) > 0.9 ? cruz(d, [1, 0, 0]) : cruz(d, [0, 0, 1])), v = cruz(d, u);
  const pts: V3[] = [];
  for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU + hr(sem) * 2, r = ancho * (0.7 + 0.5 * hr(sem + k + 1)); pts.push(add(add(add(base, u, Math.cos(a) * r), v, Math.sin(a) * r), d, -ancho * 0.4)); }
  pts.push(add(add(add(base, d, largo), u, (hr(sem + 5) - 0.5) * ancho * 0.6), v, (hr(sem + 6) - 0.5) * ancho * 0.6));
  pts.push(add(base, d, largo * 0.35));
  return poliedro(pts, { mat, tono });
}
/**
 * Venas de lava sobre la superficie de un elipsoide (en el marco `t`): tramos de elipsoides finos y quebrados que se
 * afinan, a medio hundir en la piel (sin aristas). `tono` es el brillo del cuadro (para que laten).
 */
function grietas(t: Tr, c: V3, r: V3, n: number, semilla: number, mat: string, tono: number, o: { lado?: number; arriba?: number; grueso?: number; largo?: number; frente?: number } = {}): Pieza[] {
  const ps: Pieza[] = [];
  for (let k = 0; k < n; k++) {
    const q = semilla * 31 + k * 7;
    let u = (o.frente !== undefined ? o.frente : (o.lado ?? (hr(q) < 0.5 ? 1 : -1)) * (Math.PI / 2)) + (hr(q + 1) - 0.5) * 2.2, v = (hr(q + 2) - 0.5) * 1.6 + (o.arriba ?? 0);
    const du = (hr(q + 3) - 0.5) * 0.7, dv = (hr(q + 4) < 0.5 ? 1 : -1) * 0.35;
    let prev: V3 | null = null;
    const pasos = o.largo ?? 4;
    for (let i = 0; i <= pasos; i++) {
      const cv = Math.cos(v), p: V3 = [c[0] + r[0] * cv * Math.cos(u) * 1.01, c[1] + r[1] * cv * Math.sin(u) * 1.01, c[2] + r[2] * Math.sin(v) * 1.01];
      const w = ap(t, p);
      // de a dos pasos (mismo recorrido, la mitad de las piezas)
      if (prev && (i % 2 === 0 || i === pasos)) { const g = (o.grueso ?? 0.55) * (1 - i / (pasos + 2)); ps.push(elipE(mez(prev, w, 0.5), sub(w, prev), [len(sub(w, prev)) * 0.6 + g * 0.5, g, g], mat, tono + (hr(q + i) - 0.5) * 0.1)); prev = w; }
      if (!prev) prev = w;
      u += du + (hr(q + 10 + i) - 0.5) * 0.5; v += dv + (hr(q + 20 + i) - 0.5) * 0.4;
    }
  }
  return ps;
}
/** Lengua de fuego que sube desde `base`: dos o tres elipsoides que se afinan y tiemblan con el cuadro. */
function llama(base: V3, alto: number, ancho: number, f: number, sem: number, mat = 'fuego', arriba: V3 = [0, 0, 1], tono = 0): Pieza[] {
  const ps: Pieza[] = [];
  const u = ((f * 0.37 + hr(sem)) % 1), fl = 0.75 + 0.35 * Math.sin((f / 4 + hr(sem + 1)) * TAU);
  const h = alto * fl, lat = cruz(nor(arriba), [hr(sem + 2) - 0.5, hr(sem + 3) - 0.5, 0.01]);
  const w = nor(lat), sway = Math.sin((f / 8) * TAU * 2 + sem) * ancho * 0.5;
  const p1 = add(add(base, arriba, h * 0.3), w, sway * 0.3), p2 = add(add(base, arriba, h * 0.72), w, sway);
  ps.push(elipE(p1, arriba, [h * 0.36, ancho, ancho], mat, -0.12 + tono));
  ps.push(elipE(p2, arriba, [h * 0.3, ancho * 0.55, ancho * 0.55], mat, 0.1 + tono));
  if (u < 0.5) ps.push(esfera(...add(add(base, arriba, h * (1.05 + u)), w, sway * 1.6), ancho * 0.25, { mat }));
  return ps;
}
/**
 * Lengua de fuego orgánica: una masa de bultos que se afinan a lo largo de una curva y terminan en punta. La forma,
 * el largo y la inclinación salen de un ruido que recorre un círculo con el cuadro (así el ciclo cierra sin salto) y
 * cambian en cada cuadro. La base arde amarilla y la punta se enfría a rojo. `n` es el largo del ciclo en cuadros.
 */
function llamaOrg(base: V3, dir: V3, alto: number, ancho: number, f: number, n: number, sem: number, o: { viento?: V3; tono?: number; tramos?: number } = {}): Pieza {
  const ph = (f / n) * TAU, cx = Math.cos(ph) * 1.4, cy = Math.sin(ph) * 1.4;
  const R = (i: number, c: number) => ruido(sem * 3.7 + cx + c * 5.3, sem * 1.9 + cy + i * 0.83, c * 2.9 + i * 0.31) - 0.5;
  const N = o.tramos ?? 5, tono = o.tono ?? 0, viento = o.viento ?? [0, 0, 0];
  const d = nor(dir), lat = nor(Math.abs(d[2]) > 0.9 ? cruz(d, [1, 0, 0]) : cruz(d, [0, 0, 1])), lat2 = cruz(d, lat);
  const comps: Comp[] = [];
  /** Una lengua: tramos de hueso que se afinan hasta la punta, cada uno torcido un poco más que el anterior. */
  const tira = (p0: V3, d0: V3, h: number, w: number, nt: number, c0: number, t0: number) => {
    let p = p0, dd = d0;
    for (let i = 0; i < nt; i++) {
      const t = i / nt, r = w * Math.pow(1 - t, 0.85) * (0.85 + 0.4 * (R(i + c0, 1) + 0.5)), r1 = w * Math.pow(1 - (i + 1) / nt, 0.85) * 0.9 + 0.1;
      dd = nor(add(add(add(add(dd, lat, R(i + c0, 2) * (0.5 + t)), lat2, R(i + c0, 3) * (0.5 + t)), viento, 0.1 + t * 0.25), d, 0.45));
      const q = add(p, dd, h / nt);
      comps.push(hueso(p, q, r, r1, { mat: 'fuego', tono: tono + t0 - 0.05 - t * 0.5 }));
      p = q;
    }
  };
  const h = alto * (0.75 + 0.6 * (R(0, 0) + 0.5));
  tira(base, d, h, ancho, N, 0, 0);
  // dos lenguas menores que se abren de la base, cada una con su propio baile
  for (const sg of [1, -1]) {
    const hl = h * (0.4 + 0.3 * (R(7, sg + 4) + 0.5)), dl = nor(add(add(d, lat, sg * (0.45 + 0.3 * R(8, sg + 4))), lat2, R(9, sg + 4) * 0.6));
    tira(add(add(base, d, h * 0.12), lat, sg * ancho * 0.5), dl, hl, ancho * 0.62, Math.max(2, N - 3), 10 + sg * 5, -0.08);
  }
  return masa(comps, { mat: 'fuego', suave: Math.max(1, ancho * 0.7) });
}
/**
 * Columna de fuego continua que se afina hacia arriba: tres lenguas de masa anidadas que comparten la base y se
 * tuercen con fases distintas, así las de adentro rompen la de afuera en vetas. Afuera y abajo lava, después naranja
 * y en el alma y la punta amarillo; arriba se abre en tres lenguas. `k` (0..1) la hace crecer.
 */
function columnaFuego(b0: V3, arriba: V3, L: number, ancho: number, f: number, n: number, k: number): Pieza[] {
  const ps: Pieza[] = [];
  const up = nor(arriba), lat = nor(Math.abs(up[2]) > 0.9 ? cruz(up, [1, 0, 0]) : cruz(up, [0, 0, 1])), lat2 = cruz(up, lat);
  const w = (f / n) * TAU;
  const capas: [string, number, number, number, number, number][] = [
    // material, tono, largo, ancho, fase, amplitud de la torsión
    ['lava', -0.28, 0.6, 1, 0, 0.5], ['fuego', -0.3, 0.9, 0.78, 2.1, 0.5], ['fuego', 0.14, 0.93, 0.5, 4.3, 0.8],
  ];
  const N = 6;
  for (const [mat, tono, lk, ak, fase, amp] of capas) {
    const Lc = L * lk * k * (0.94 + 0.06 * Math.sin(w * 2 + fase)), A = ancho * amp;
    const P = (t: number): V3 => add(add(add(b0, up, Lc * t), lat, Math.sin(t * 3.4 - w + fase) * A * Math.pow(t, 0.6)), lat2, Math.cos(t * 2.6 - w + fase * 1.3) * A * 0.6 * Math.pow(t, 0.6));
    const R = (t: number) => Math.max(0.2, ancho * ak * (0.55 + 0.45 * k) * Math.pow(1 - t, 0.8) * (1 + 0.13 * Math.sin(t * 9 - w * 2 + fase)));
    const cs: Comp[] = [];
    for (let i = 0; i < N; i++) { const t0 = i / N, t1 = (i + 1) / N; cs.push(hueso(P(t0), P(t1), R(t0), R(t1), { mat, tono: tono + (1 - t0) * 0.05 })); }
    ps.push(masa(cs, { mat, suave: 3 }));
  }
  for (let j = 0; j < 2; j++) {
    const t = 0.74 + 0.06 * j, sd = add(esc(lat, Math.cos(j * 3.1 + w)), lat2, Math.sin(j * 3.1 + w));
    ps.push(llamaOrg(add(add(b0, up, L * k * t), sd, ancho * 0.12), add(up, sd, 0.3), (36 + 14 * hr(j + 31)) * k, ancho * 0.18, f, n, 900 + j, { tono: -0.08 }));
  }
  for (let j = 0; j < 1; j++) {
    // una lengua que se desprende del costado y lame hacia arriba
    const t = 0.2 + 0.25 * j, a = hr(j * 11 + 5) * TAU + w * 0.5 + j * 3, sd = add(esc(lat, Math.cos(a)), lat2, Math.sin(a));
    ps.push(llamaOrg(add(add(b0, up, L * 0.6 * k * t), sd, ancho * Math.pow(1 - t, 0.8) * 0.8), add(up, sd, 0.5), (22 + 14 * hr(j + 9)) * k, 4 * (1 - t * 0.4), f, n, 880 + j, { tono: -0.1, tramos: 4 }));
  }
  return ps;
}
/** Eslabones de una cadena a lo largo de una polilínea (se remuestrea al paso del eslabón). */
function cadena(pts: V3[], paso: number, grueso: number, mat: (i: number) => string): Pieza[] {
  const ps: Pieza[] = [];
  const largos = [0];
  for (let i = 1; i < pts.length; i++) largos.push(largos[i - 1] + len(sub(pts[i], pts[i - 1])));
  const total = largos[largos.length - 1], n = Math.max(2, Math.floor(total / paso));
  let j = 0;
  for (let i = 0; i < n; i++) {
    const s = (i + 0.5) * (total / n);
    while (j < pts.length - 2 && largos[j + 1] < s) j++;
    const t = (s - largos[j]) / Math.max(1e-6, largos[j + 1] - largos[j]), c = mez(pts[j], pts[j + 1], t), dir = nor(sub(pts[j + 1], pts[j]));
    const lado = i % 2 ? cruz(dir, [0, 0, 1]) : [0, 0, 1] as V3;
    ps.push(elipE(c, dir, [paso * 0.62, grueso * 0.4, grueso], mat(i), 0, lado));
  }
  return ps;
}
/** Curva de Bézier cuadrática muestreada. */
const bezier = (a: V3, c: V3, b: V3, n: number): V3[] => Array.from({ length: n + 1 }, (_, i) => { const t = i / n; return add(add(esc(a, (1 - t) * (1 - t)), c, 2 * t * (1 - t)), b, t * t); });
/** Curva que cuelga entre dos puntos (cadena, soga). */
const colgar = (a: V3, b: V3, caida: number, n: number, piso = 0.8): V3[] => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, p = mez(a, b, t); return [p[0], p[1], Math.max(piso, p[2] - caida * 4 * t * (1 - t))] as V3; });
/** Brasas que suben alrededor de un punto (cambian con el cuadro). */
function brasas(c: V3, r: number, alto: number, n: number, f: number, sem: number, mat = 'fuego', tam = 0.7): Pieza[] {
  const ps: Pieza[] = [];
  for (let i = 0; i < n; i++) {
    const u = ((f / 8) + hr(sem + i)) % 1, a = hr(sem + i * 3) * TAU + u * 1.5, rr = r * (0.3 + 0.7 * hr(sem + i * 5));
    ps.push(esfera(c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr, c[2] + u * alto, tam * (1 - u * 0.6), { mat }));
  }
  return ps;
}

// ------------------------------------------------------------------ alas
interface Ala {
  raiz: V3; adel: V3; afuera: V3; arriba: V3;
  L1: number; L2: number; Ld: number;
  abre: number; bate: number; lag?: number;
  hueso: string; membrana: string; grueso: number; tono?: number;
  rota?: number; semilla?: number; dedos?: number;
}
/**
 * Ala de murciélago orgánica: los huesos (húmero, antebrazo y dedos curvos) son una sola masa; la membrana son hojas
 * aplanadas que se estiran a lo largo de cada dedo y se solapan entre ellos, así el borde entre las puntas queda en
 * festones redondos, más cortos y con jirones donde el ala está rota (`rota`), y con agujeros (piezas que restan).
 * Devuelve también las puntas y los festones (para soltar brasas) y la muñeca.
 */
function ala(a: Ala): { piezas: Pieza[]; borde: V3[]; muneca: V3 } {
  const ps: Pieza[] = [];
  const nd = a.dedos ?? 4, ab = clamp(a.abre, 0, 1), g = a.grueso, rota = a.rota ?? 0, sem = a.semilla ?? 1;
  const uv = (abierta: [number, number], plegada: [number, number]): [number, number] => [lerp(plegada[0], abierta[0], ab), lerp(plegada[1], abierta[1], ab)];
  const codo = uv([a.L1 * 0.92, -a.L1 * 0.12], [a.L1 * 0.45, a.L1 * 0.55]);
  const muneca = uv([a.L1 * 0.92 + a.L2 * 0.98, a.L1 * 0.05], [a.L1 * 0.62, -a.L1 * 0.25]);
  const giro = (gr: number): [V3, V3] => { const c = Math.cos(rad(gr)), s = Math.sin(rad(gr)); return [add(esc(a.afuera, c), a.arriba, s), esc(a.adel, -1)]; };
  const [U1, V1] = giro(a.bate), [U2, V2] = giro(a.bate + (a.lag ?? 0));
  const P = (q: [number, number], ext = false): V3 => { const [U, V] = ext ? [U2, V2] : [U1, V1]; return add(add(a.raiz, U, q[0]), V, q[1]); };
  const pC = P(codo), pM = P(muneca, true);
  const n1 = nor(cruz(U1, V1)), n2 = nor(cruz(U2, V2));
  const tips: V3[] = [];
  for (let k = 0; k < nd; k++) {
    const angA = lerp(-22, 108, k / (nd - 1)), angP = lerp(-70, 10, k / (nd - 1));
    const an = rad(lerp(angP, angA, ab) + (hr(sem * 5 + k) - 0.5) * 6), Lk = a.Ld * [1, 1.08, 0.95, 0.78, 0.62][Math.min(4, k)] * lerp(0.75, 1, ab);
    tips.push(P([muneca[0] + Math.cos(an) * Lk, muneca[1] + Math.sin(an) * Lk], true));
  }
  const cola = P([a.L1 * 0.15, a.L1 * lerp(0.4, 0.95, ab)]);
  // ---- membrana: hojas de 0.6 de grueso (elipsoides aplanados en el plano del ala)
  const hoja = (c: V3, ex: V3, rx: number, ry: number, nn: V3, tono = 0) => { const x = nor(sub(ex, esc(nn, pto(ex, nn)))), y = nor(cruz(nn, x)); ps.push({ k: 'elip', c, ex: x, ey: y, ez: cruz(x, y), r: [rx, ry, 0.6], mat: a.membrana, tono } as Pieza); };
  const borde: V3[] = [...tips];
  const festones: [V3, V3, number][] = [];
  for (let k = 0; k < nd - 1; k++) {
    // el paño entre dos dedos: una hoja que cubre de sobra el triángulo entre la muñeca y las dos puntas; después se le
    // cava un festón cóncavo entre las puntas (más hondo si está roto)
    const roto = rota > 0 && hr(sem * 7 + k) < rota, mt = mez(tips[k], tips[k + 1], 0.5), L = len(sub(mt, pM)), gap = len(sub(tips[k + 1], tips[k]));
    hoja(mez(pM, mt, 0.58), sub(mt, pM), L * 0.56, gap * 0.56, n2, (hr(sem + k) - 0.5) * 0.08 - 0.03);
    const hondo = roto ? 0.05 + 0.15 * hr(sem + k * 3) : 0.3 + 0.1 * hr(sem + k * 3);
    festones.push([add(mt, nor(sub(mt, pM)), gap * hondo), nor(sub(tips[k + 1], tips[k])), gap * 0.56]);
    borde.push(add(mt, nor(sub(mt, pM)), gap * (hondo - 0.56)));
  }
  // el paño de adentro: de la última punta a la cola y del codo al cuerpo, en elipses que cubren cada triángulo
  const tri = (p: V3, q: V3, r: V3, nn: V3, enc = 1) => { const c = esc(add(add(p, q), r), 1 / 3), e = sub(q, p), l = len(e), h = len(sub(sub(r, p), esc(nor(e), pto(sub(r, p), nor(e))))); hoja(c, e, l * 0.5 * enc, h * 0.62 * enc, nn); };
  const ult = tips[nd - 1];
  tri(ult, cola, pM, n2, 1.05); tri(pC, cola, pM, n1, 1.05); tri(a.raiz, cola, pC, n1, 1.1);
  borde.push(cola);
  {
    const ult2 = tips[nd - 1], mc2 = mez(ult2, cola, 0.5), g2 = len(sub(cola, ult2)), fuera = nor(sub(mc2, mez(pM, pC, 0.5)));
    festones.push([add(mc2, fuera, g2 * 0.3), nor(sub(cola, ult2)), g2 * 0.5]);
  }
  for (const [c, e, r] of festones) { const x = nor(sub(e, esc(n2, pto(e, n2)))), y = nor(cruz(n2, x)); ps.push({ k: 'elip', c, ex: x, ey: y, ez: cruz(x, y), r: [r, r * 0.9, 6], mat: a.membrana, resta: true } as Pieza); }
  // agujeros que la atraviesan (cavan solo las hojas, que se armaron antes)
  const nag = rota > 0 ? 2 + Math.floor(rota * 2) : 0;
  for (let k = 0; k < nag; k++) {
    const i = Math.floor(hr(sem * 13 + k) * (nd - 1)), c = mez(pM, mez(tips[i], tips[i + 1], 0.5), 0.35 + 0.3 * hr(sem * 17 + k)), e = sub(tips[i], pM);
    const x = nor(sub(e, esc(n2, pto(e, n2)))), y = nor(cruz(n2, x));
    ps.push({ k: 'elip', c, ex: x, ey: y, ez: cruz(x, y), r: [2.5 + 3 * hr(sem + k * 5), 1.6 + 1.5 * hr(sem + k * 7), 3], mat: a.membrana, resta: true } as Pieza);
  }
  // ---- huesos: husos alargados que se solapan (las juntas quedan como nudillos), los dedos curvos hacia el borde de
  // fuga, y una garra en el pulgar
  const tn = a.tono ?? 0;
  const huso = (p: V3, q: V3, r0: number, r1: number, tono = 0) => { const L = len(sub(q, p)); ps.push(elipE(mez(p, q, 0.5), sub(q, p), [L * 0.56 + Math.max(r0, r1) * 0.3, (r0 + r1) * 0.55, (r0 + r1) * 0.55], a.hueso, tn + tono)); };
  huso(a.raiz, mez(a.raiz, pC, 0.55), g * 2.3, g * 1.9); huso(mez(a.raiz, pC, 0.45), pC, g * 1.9, g * 1.5);
  huso(pC, mez(pC, pM, 0.55), g * 1.6, g * 1.3); huso(mez(pC, pM, 0.45), pM, g * 1.3, g * 1.1);
  ps.push(esfera(...pC, g * 1.8, { mat: a.hueso, tono: tn }), esfera(...pM, g * 1.45, { mat: a.hueso, tono: tn }));
  for (const t of tips) {
    const d = sub(t, pM), L = len(d), mid = add(mez(pM, t, 0.5), nor(cruz(n2, d)), -L * 0.07);
    huso(pM, mid, g * 0.9, g * 0.65); huso(mid, t, g * 0.65, g * 0.2, -0.04);
    ps.push(esfera(...mid, g * 0.72, { mat: a.hueso, tono: tn }));
  }
  ps.push(masa([hueso(pM, add(add(pM, a.arriba, g * 4.5), a.adel, g * 3), g * 0.9, 0.2, { mat: 'jf_garra', k: 0.5 })], { mat: 'jf_garra' }));
  return { piezas: ps, borde, muneca: pM };
}

// ------------------------------------------------------------------ registro
type Acc = 'quieto' | 'caminar' | 'atacar' | 'lanzar' | 'herido' | 'morir' | 'especial';
const ACCIONES: Acc[] = ['quieto', 'caminar', 'atacar', 'lanzar', 'herido', 'morir', 'especial'];
const CUADROS: Record<Acc, number> = { quieto: 4, caminar: 8, atacar: 8, lanzar: 8, herido: 4, morir: 8, especial: 8 };
const NOMBRES: Record<Acc, [string, string]> = { quieto: ['quieto', 'idle'], caminar: ['camina', 'walk'], atacar: ['ataca', 'attack'], lanzar: ['lanza', 'cast'], herido: ['recibe golpe', 'get hit'], morir: ['muere', 'death'], especial: ['especial', 'special'] };
const RUMBO: Record<Dir, number> = { se: 0, s: 45, so: 90, o: 135, no: 180, n: 225, ne: 270, e: 315 };
/** Lo que arma cada jefe en su marco local (mirando a +x). */
interface Res { piezas: Pieza[]; resplandor?: Escena['resplandor']; sinSombra?: boolean }
type Armado = (acc: Acc, f: number) => Res;

/** Los jefes: id, nombre, alto en unidades del mundo (sin cuernos ni efectos) y huella en celdas. */
export const JEFES: { id: string; nombre: [string, string]; alto: number; huella: number }[] = [];

/** Masas de tronco de los jefes que caen tendidos: al morir, si se meten en el piso, se alza el cuerpo entero. */
const TRONCO = new WeakSet<Pieza>();
const tronco = (p: Pieza) => { TRONCO.add(p); return p; };
/** Lo más bajo de una masa (cota por componentes: cada bulto por su extensión vertical y cada hueso por sus puntas). */
function fondoMasa(p: Pieza): number {
  if (p.k !== 'masa') return Infinity;
  let lo = Infinity;
  for (const c of p.comps) {
    if (c.f === 'hueso') lo = Math.min(lo, c.a[2] - c.r0, c.b[2] - c.r1);
    else lo = Math.min(lo, c.c[2] - Math.hypot(c.r[0] * c.ex[2], c.r[1] * c.ey[2], c.r[2] * c.ez[2]));
  }
  return lo;
}
/** Una pieza corrida `dz` hacia arriba. */
function alzar(p: Pieza, dz: number): Pieza {
  const up = (v: V3): V3 => [v[0], v[1], v[2] + dz];
  if (p.k === 'conv') return { ...p, pts: p.pts.map(up), planos: p.planos.map(([n, d]) => [n, d + n[2] * dz] as [V3, number]) };
  if (p.k === 'cono') return { ...p, o: up(p.o) };
  if (p.k === 'elip') return { ...p, c: up(p.c) };
  const comps = p.comps.map((q): Comp => (q.f === 'hueso' ? hueso(up(q.a), up(q.b), q.r0, q.r1, { mat: q.mat, tono: q.tono, k: q.k }) : { ...q, c: up(q.c), sc: up(q.sc) }));
  return masa(comps, { mat: p.mat, tono: p.tono, suave: p.suave });
}
/** Lo más alto de una pieza (para no alzar lo que está pintado en el piso: charcos, grietas, manchas). */
const techo = (p: Pieza) => (p.k === 'masa' ? p.esf[2] + p.esf[3] : p.k === 'conv' ? Math.max(...p.pts.map((q) => q[2])) : p.k === 'elip' ? p.c[2] + Math.max(...p.r) : Math.max(p.o[2], p.o[2] + p.ez[2] * p.h) + Math.max(p.r0, p.r1));

function jefe(id: string, nombre: [string, string], alto: number, huella: number, especial: [string, string], armar: Armado) {
  JEFES.push({ id, nombre, alto, huella });
  for (const acc of ACCIONES) {
    const [es, en] = acc === 'especial' ? especial : NOMBRES[acc];
    registrar({
      id: `jefe_${id}_${acc}`, nombre: [`${nombre[0]} · ${es}`, `${nombre[1]} · ${en}`], tema: 'monstruos',
      variantes: [...DIRS], cuadros: CUADROS[acc], t: acc === 'quieto' ? 6 : 3, huella: [huella, huella], bloquea: true,
      armar: (v, f) => {
        const r = armar(acc, f), g = RUMBO[v as Dir], c = Math.cos(rad(g)), s = Math.sin(rad(g));
        if (acc === 'morir') {
          // tendido: el tronco no se mete en el piso (se alza todo el cuerpo, salvo lo que ya está pintado en el piso)
          let lo = Infinity;
          for (const p of r.piezas) if (TRONCO.has(p)) lo = Math.min(lo, fondoMasa(p));
          if (lo < -0.2) { const dz = -lo + 0.4; r.piezas = r.piezas.map((p) => (techo(p) < 2.5 ? p : alzar(p, dz))); if (r.resplandor) r.resplandor = { ...r.resplandor, c: [r.resplandor.c[0], r.resplandor.c[1], r.resplandor.c[2] + dz] }; }
        }
        const res = r.resplandor ? { ...r.resplandor, c: [r.resplandor.c[0] * c - r.resplandor.c[1] * s, r.resplandor.c[0] * s + r.resplandor.c[1] * c, r.resplandor.c[2]] as V3 } : undefined;
        return { piezas: girarPiezas(r.piezas, g), resplandor: res, sinSombra: r.sinSombra };
      },
    });
  }
}

// ================================================================== 1. OZMAREN, LA SED QUE ARDE
/**
 * El señor del final: 195 de alto hasta la coronilla (cuernos y halo hasta 240), piel de obsidiana resquebrajada
 * con lava viva en las grietas, corona de cuernos retorcidos con un halo que arde, costillar hueco con un corazón
 * de fuego preso, cuatro brazos (los de arriba con garras como hojas, los de abajo con una cadena de eslabones al
 * rojo), patas de corvejón con pezuñas que rajan el piso, alas rotas que arden en el borde y una mandíbula que se
 * parte en dos con hileras de dientes.
 */
function ozmaren(acc: Acc, f: number): Res {
  const ph = f / CUADROS[acc];
  let px = 0, py = 0, pz = 0, tp = 12, ty = 0, tr = 0, cab = 4, mand = 0.42, alaAbre = 0.8, alaBate = 16, alaLag = 0, flojo = 0;
  let pecho = 0, columna = 0, latido = 0.5, frio = 0, ruge = 0, roto = 0, latigo = 0, humo = 0;
  // pies [derecho, izquierdo] (y < 0 es la derecha), manos de arriba (garras) y de abajo (cadena)
  const pie: V3[] = [[-3, -25, 0], [5, 25, 0]];
  const garra: V3[] = [[22, -64, 76], [18, 64, 78]];
  const baja: V3[] = [[36, -24, 94], [32, 24, 98]];
  let cadC: V3 = [0, 0, 0], cadB: V3 = [0, 0, 0];
  if (acc === 'quieto') {
    const b = Math.sin(ph * TAU);
    pz = b * 1.2; tp = 12 + b * 1.5; cab = 4 - b * 2; mand = 0.42 + b * 0.12; alaBate = 16 + b * 4; alaAbre = 0.8 + b * 0.03; latido = 0.5 + 0.5 * Math.cos(ph * TAU);
    garra[0] = [22, -64, 76 + b * 2]; garra[1] = [18, 64, 78 - b * 2];
  } else if (acc === 'caminar') {
    for (const [i, s] of [[0, -1], [1, 1]] as [number, number][]) {
      const st = paso(ph + (i ? 0.5 : 0), 56, 20, 0.58);
      pie[i] = [st.x, s * 25, st.z];
      garra[i] = [20 - st.x * 0.5, s * 64, 76 + st.vuelo * 6];
      baja[i] = [34 - st.x * 0.25, s * 24, 96];
    }
    py = Math.sin(ph * TAU) * 4; tr = Math.sin(ph * TAU) * 3; ty = Math.sin(ph * TAU) * 7; pz = -Math.abs(Math.sin(ph * TAU * 2 + 0.4)) * 5;
    tp = 16; alaBate = 14 + Math.sin(ph * TAU * 2) * 5; alaAbre = 0.75; latido = 0.5 + 0.5 * Math.cos(ph * TAU * 2);
  } else if (acc === 'atacar') {
    // zarpazo: carga atrás y arriba, barre en diagonal con la garra derecha y remata con la izquierda
    ty = K([0, 16, 28, 30, -22, -34, -14, 0], f); tp = K([12, 6, 0, 0, 24, 30, 20, 12], f); pz = K([0, 0, -2, -4, -9, -10, -5, 0], f); px = K([0, -2, -5, -5, 8, 12, 6, 0], f);
    garra[0] = [K([22, 4, -12, -16, 66, 58, 32, 22], f), K([-64, -68, -66, -62, -10, 22, -20, -64], f), K([76, 120, 160, 168, 92, 60, 64, 76], f)];
    garra[1] = [K([18, 24, 30, 32, 20, 48, 42, 18], f), K([64, 60, 58, 58, 62, 20, 40, 64], f), K([78, 86, 92, 94, 90, 72, 74, 78], f)];
    mand = K([0.3, 0.5, 0.8, 0.9, 1, 0.8, 0.5, 0.3], f); cab = K([4, -2, -6, -8, 8, 10, 6, 4], f); alaBate = K([12, 20, 28, 30, 4, 0, 6, 12], f); alaAbre = K([0.55, 0.65, 0.8, 0.82, 0.7, 0.6, 0.55, 0.55], f);
    pie[1] = [K([5, 5, 5, 5, 22, 26, 16, 5], f), 25, 0];
  } else if (acc === 'lanzar') {
    // latigazo de la cadena ardiente: la mano baja derecha sube atrás y la cadena restalla adelante contra el piso
    latigo = K([0, 0.1, 0.3, 0.6, 1, 1, 0.5, 0.1], f);
    ty = K([0, 18, 30, 26, -18, -26, -12, 0], f); tp = K([12, 6, 2, 4, 22, 26, 18, 12], f); pz = K([0, -1, -2, -2, -7, -8, -4, 0], f);
    baja[0] = [K([36, 10, -6, 10, 58, 56, 46, 36], f), K([-24, -40, -44, -40, -18, -10, -20, -24], f), K([94, 130, 150, 146, 104, 92, 94, 94], f)];
    mand = K([0.3, 0.4, 0.6, 0.7, 1, 0.9, 0.5, 0.3], f); cab = K([4, -2, -6, -6, 8, 10, 6, 4], f);
    garra[0] = [K([22, 16, 10, 12, 32, 32, 26, 22], f), -66, K([76, 84, 90, 88, 82, 78, 76, 76], f)];
    alaBate = K([12, 18, 26, 24, 4, 2, 8, 12], f); alaAbre = K([0.55, 0.6, 0.7, 0.7, 0.65, 0.6, 0.55, 0.55], f);
  } else if (acc === 'herido') {
    const k = [0.6, 1, 0.7, 0.3][f % 4];
    tp = 12 - 22 * k; cab = 4 - 26 * k; px = -6 * k; pz = -3 * k; ty = 10 * k; mand = 0.3 + 0.7 * k; alaBate = 12 + 18 * k; alaAbre = 0.55 + 0.25 * k; latido = 1;
    garra[0] = [22 - 10 * k, -68 - 8 * k, 76 + 34 * k]; garra[1] = [18 - 8 * k, 68 + 8 * k, 78 + 30 * k];
  } else if (acc === 'morir') {
    // ruge al cielo con el pecho reventando en fuego, cae de rodillas y se apaga hecho piedra, la cabeza gacha
    tp = K([12, -24, -16, 10, 22, 18, 14, 12], f); cab = K([4, -30, -22, 0, 18, 28, 32, 34], f); mand = K([0.3, 1, 1, 0.8, 0.6, 0.55, 0.5, 0.5], f);
    pz = K([0, 2, -6, -24, -40, -44, -46, -46], f); px = K([0, -4, -6, -2, 4, 6, 6, 6], f); flojo = K([0, 0, 0.2, 0.5, 0.8, 1, 1, 1], f);
    ruge = K([0, 1, 1, 0.6, 0.3, 0, 0, 0], f); pecho = K([0, 0.5, 1, 0.9, 0.7, 0.5, 0.4, 0.4], f); columna = K([0, 0.5, 1, 0.55, 0.2, 0, 0, 0], f);
    frio = K([0, 0, 0, 0.2, 0.45, 0.7, 0.9, 1], f); roto = K([0, 0, 0.2, 0.5, 0.75, 1, 1, 1], f); latido = K([1, 1, 1, 0.6, 0.3, 0, 0, 0], f); humo = K([0, 0, 0, 0.2, 0.5, 0.8, 1, 1], f);
    alaAbre = K([0.55, 1, 1, 0.8, 0.6, 0.45, 0.35, 0.3], f); alaBate = K([12, 30, 26, 6, -14, -30, -40, -44], f);
    garra[0] = [K([22, 0, -4, 24, 40, 36, 30, 28], f), K([-64, -80, -82, -70, -66, -64, -62, -62], f), K([76, 150, 156, 80, 34, 12, 5, 4], f)];
    garra[1] = [K([18, -4, -6, 22, 38, 34, 30, 28], f), K([64, 80, 82, 70, 66, 64, 62, 62], f), K([78, 146, 152, 78, 32, 12, 5, 4], f)];
    baja[0] = [K([36, 22, 18, 30, 36, 36, 34, 34], f), -30, K([94, 112, 112, 80, 56, 46, 42, 40], f)];
    baja[1] = [K([32, 20, 16, 28, 34, 34, 32, 32], f), 30, K([98, 114, 114, 82, 58, 48, 44, 42], f)];
    pie[0] = [K([-3, -6, -10, -20, -34, -42, -46, -46], f), -27, 0]; pie[1] = [K([5, 2, -4, -16, -30, -40, -44, -44], f), 27, 0];
  } else if (acc === 'especial') {
    // el pecho se abre como dos puertas y sale una columna de fuego al cielo; las alas se despliegan enteras
    pecho = K([0, 0.15, 0.5, 1, 1, 1, 0.7, 0.25], f); columna = K([0, 0, 0.25, 0.75, 1, 1, 0.6, 0.15], f); ruge = K([0, 0.2, 0.6, 1, 1, 1, 0.6, 0.2], f);
    tp = K([12, 22, 10, -10, -14, -12, -4, 6], f); cab = K([4, 18, 8, -4, -8, -6, 0, 4], f); pz = K([0, -8, -6, 2, 4, 3, 1, 0], f); mand = K([0.3, 0.3, 0.6, 1, 1, 1, 0.6, 0.35], f);
    alaAbre = K([0.55, 0.45, 0.75, 1, 1, 1, 0.85, 0.6], f); alaBate = K([12, 6, 10, 22, 26, 24, 18, 12], f); alaLag = K([0, 0, -12, -16, -4, 4, 6, 0], f); latido = 1;
    for (const [i, s] of [[0, -1], [1, 1]] as [number, number][]) {
      garra[i] = [K([22, 32, 20, 2, -4, -2, 8, 18], f), s * K([64, 48, 72, 98, 104, 102, 88, 68], f), K([76, 72, 104, 150, 160, 158, 130, 86], f)];
      baja[i] = [K([36, 38, 30, 16, 12, 14, 22, 32], f), s * K([24, 20, 38, 54, 58, 56, 44, 28], f), K([94, 90, 102, 114, 118, 116, 106, 96], f)];
    }
  }
  // ---- la piel arde: rojo sangre en la sombra, carmesí y naranja en las crestas; al morir se enfría hasta ceniza
  const ceniza = frio > 0.75, vivo = frio < 0.5, arde = frio < 0.3;
  const PF = ceniza ? 'jf_ceniza' : 'jf_piel_fuego', PA = ceniza ? 'jf_ceniza' : 'jf_piel_ascua', CU = ceniza ? 'jf_ceniza' : 'jf_cuerno';
  const enf = ceniza ? 0 : -frio * 0.3;
  const m: OpcComp = { mat: PF, tono: enf }, ma: OpcComp = { mat: PA, tono: enf }, mc: OpcComp = { mat: CU };
  const nC = CUADROS[acc], fz = (f / nC) * TAU;
  /** Brillo de las venas de una zona: late con su propia fase. */
  const pulso = (zona: number) => (vivo ? -0.32 + 0.34 * (0.5 + 0.5 * Math.sin(fz * (acc === 'quieto' ? 1 : 2) + zona * 2.39)) + latido * 0.06 : -0.3);
  const lava = ceniza ? 'jf_lava_fria' : frio > 0.5 ? 'jf_brasa_honda' : 'cu_lava';
  const ojo = frio > 0.6 ? 'cu_ojo' : 'cu_ojo_brasa';
  const zc = 95 + pz;
  const pel: Tr = T([px, py, zc], Rz(ty * 0.3), Ry(tp * 0.3 + flojo * 12), Rx(tr * 0.5));
  const tor = cmp(pel, T([0, 0, 8], Rz(ty * 0.7), Ry(tp * 0.7), Rx(tr)));
  // la cabeza va alta y un poco atrás: así no tapa la caja del pecho desde la cámara alta
  const cabT = cmp(tor, T([18, 0, 83], Ry(cab - tp * 0.6)));
  const hs = 1.55, HP = (q: V3) => ap(cabT, esc(q, hs)), bH = (c: V3, r: V3, o: OpcComp = m) => bT(cabT, esc(c, hs), esc(r, hs), o);
  const ps: Pieza[] = [];
  const resp = 1 + latido * 0.025;
  const viento = nor(mv(tor.m, [-1, 0, 0.25]));

  // ---- alas (primero: sus agujeros cavan solo la membrana)
  const bordes: V3[] = [];
  for (const s of [1, -1]) {
    const w = ala({ raiz: ap(tor, [-22, s * 18, 60]), adel: nor(mv(tor.m, [0.6, 0, -0.8])), afuera: nor(mv(tor.m, [-0.45, s, 0])), arriba: nor(mv(tor.m, [-0.3, 0, 1])), L1: 44, L2: 50, Ld: 80, abre: alaAbre, bate: alaBate, lag: alaLag, hueso: PF, tono: enf - 0.06, membrana: ceniza ? 'jf_ceniza' : 'jf_membrana_fuego', grueso: 3, rota: 0.45 + roto * 0.4, semilla: s > 0 ? 3 : 4, dedos: 5 });
    ps.push(...w.piezas);
    bordes.push(...w.borde);
  }

  // ---- tronco: pelvis, cintura de avispa, costillar enorme, pectorales, abdomen, serratos, trapecios altos y joroba
  const cs: Comp[] = [
    bT(pel, [0, 0, 0], [18, 24, 14], m), bT(tor, [3, 0, 10], [16, 21, 14], ma), bT(tor, [5, 0, 38], [25 * resp, 36 * resp, 25], m),
    bT(tor, [-15, 0, 48], [18, 31, 20], m), hT(tor, [2, 0, 54], [16, 0, 76], 18, 13.5, m), bT(tor, [6, 0, 60], [14, 22, 10], m),
  ];
  for (const s of [1, -1]) {
    cs.push(bT(pel, [-3, s * 13, -2], [13, 12, 13], m), bT(tor, [19, s * 16, 45], [11, 16, 10], ma), bT(tor, [-6, s * 20, 64], [15, 15, 11], m));
    cs.push(hT(tor, [-4, s * 9, 64], [-2, s * 40, 58], 13, 11, m), bT(tor, [-1, s * 44, 56], [16, 15, 15], m), bT(tor, [9, s * 31, 32], [10, 10, 10], m));
    cs.push(bT(tor, [8, s * 28, 22], [7, 5, 10], { ...ma, k: 2 }), bT(tor, [-22, s * 14, 46], [7, 10, 14], { ...m, k: 2 }));
    for (let i = 0; i < 3; i++) cs.push(bT(tor, [16, s * 6, 4 + i * 7.5], [4, 5.5, 3.8], { ...ma, k: 2 }));
  }
  // espinas del lomo: huesos que salen de la columna, fundidos en la carne
  const espinas: Comp[] = [];
  for (let k = 0; k < 4; k++) { const s = k % 2 ? 1 : -1, b: V3 = [-27 + k * 1.6, s * 3, 28 + k * 10]; espinas.push(hT(tor, b, add(b, esc(nor([-1, s * 0.3, 0.75]), 21 - Math.abs(k - 1.5) * 3)), 3.8, 0.35, { ...mc, k: 1.2 })); }
  ps.push(masa(cs, { mat: PF, suave: 2.5 }), masa(espinas, { mat: CU, suave: 1 }));

  // ---- la caja del pecho: un hueco hondo con un núcleo de lava viva y costillas de hueso negro separadas por
  // delante (entre ellas se ve el fuego); al abrir el pecho las medias costillas giran hacia afuera
  const ejeH = nor(mv(tor.m, [1, 0, 0.55])), centroH = ap(tor, [31, 0, 37]);
  ps.push({ ...elipE(centroH, ejeH, [21, 18.5, 18.5], PF, 0, tor.m[1]), resta: true } as Pieza);
  const cora = ap(tor, [23, 0, 35]);
  const lt = 1.25 + latido * 0.2;
  const fondo = ceniza ? 'jf_lava_fria' : frio > 0.5 ? 'jf_brasa_honda' : 'lava';
  ps.push(elipE(ap(tor, [16, 0, 24]), tor.m[0], [11, 14, 10], fondo, vivo ? -0.18 : 0, tor.m[1]));
  ps.push(elipE(ap(tor, [14, 0, 35]), tor.m[0], [13, 18, 20], fondo, vivo ? -0.12 + latido * 0.06 : 0, tor.m[1]));
  if (vivo) for (let k = 0; k < 7; k++) {
    // remolinos más claros en la lava del fondo, que giran con el cuadro
    const a = hr(k * 7 + 3) * TAU + fz * 0.5, q = ap(tor, [25 - Math.abs(Math.sin(a)) * 3, Math.cos(a) * (4 + hr(k) * 8), 36 + Math.sin(a) * (4 + hr(k + 2) * 9)]);
    ps.push(elipE(q, mv(tor.m, [0, Math.cos(a + 1.3), Math.sin(a + 1.3)]), [3 + hr(k + 4) * 3, 1.2, 1.4], 'fuego', 0.05 + latido * 0.1, tor.m[0]));
  }
  if (frio < 0.9) {
    // el núcleo: un corazón de lava que late, con el centro casi blanco y venas al rojo que lo atan a las paredes
    ps.push(elipE(cora, mv(tor.m, [0.3, 0, 1]), [6 * lt, 5 * lt, 6 * lt], vivo ? 'cu_lava' : 'jf_brasa_honda', 0.1, tor.m[1]));
    ps.push(esfera(...add(cora, mv(tor.m, [3, 0, 0.6])), 3 * lt, { mat: vivo ? 'luz_vela' : 'jf_brasa_honda', tono: 0.1 }));
    for (let k = 0; k < 6; k++) { const a = k * 1.05 + 0.3, q = add(cora, mv(tor.m, [-3, Math.cos(a) * 14, Math.sin(a) * 15])); ps.push(elipE(mez(cora, q, 0.5), sub(q, cora), [len(sub(q, cora)) * 0.55, 1.2, 1.2], vivo ? 'jf_hierro_rojo' : 'jf_lava_fria', pulso(k))); }
    if (arde) for (let k = 0; k < 2; k++) ps.push(llamaOrg(add(cora, mv(tor.m, [2, (k - 0.5) * 5, 4])), mv(tor.m, [0.4, (k - 0.5) * 0.6, 1]), 10 + latido * 5, 2.6, f, nC, 40 + k));
  }
  {
    const hn = ceniza ? 'jf_ceniza' : 'jf_hueso_negro', rib: Comp[] = [];
    for (let k = 0; k < 4; k++) for (const s of [1, -1]) {
      // media costilla: sale de la pared del costado, se arquea hacia adelante y se cierra en el esternón
      const z = 20.5 + k * 7.6, w = 17.5 - Math.abs(k - 1.5) * 1.3;
      const ancla: V3 = [22, s * w, z + 1.5], g = rad(s * pecho * 105);
      const rot = (q: V3): V3 => { const d = sub(q, ancla); return add(ancla, [d[0] * Math.cos(g) - d[1] * Math.sin(g), d[0] * Math.sin(g) + d[1] * Math.cos(g), d[2]]); };
      const a = ap(tor, ancla), b = ap(tor, rot([35.5, s * w * 0.68, z])), c = ap(tor, rot([40, s * 2.2, z - 2]));
      rib.push(hueso(a, b, 2.2, 1.75), hueso(b, c, 1.75, 1.3));
      if (pecho > 0.3) rib.push(hueso(c, add(c, mv(tor.m, [s * 0.2, s * 0.6, -0.4]), 5), 1.2, 0.15, { k: 0.4 }));
    }
    if (pecho < 0.3) rib.push(hT(tor, [39.5, 0, 17], [41, 0, 47], 2, 2.6), hT(tor, [39.5, 0, 18], [41, 0, 9], 1.8, 0.2, { k: 0.4 }), hT(tor, [40.5, 0, 46], [45, 0, 50], 1.5, 0.2, { k: 0.4 }));
    ps.push(masa(rib, { mat: hn, suave: 1.2 }));
  }

  // ---- brazos de arriba: hombro con placas de hueso fundidas, bíceps, antebrazo con espolones y garras
  for (const [i, s] of [[0, -1], [1, 1]] as [number, number][]) {
    const h = ap(tor, [-1, s * 46, 56]);
    const mw: V3 = [...garra[i]]; mw[2] = Math.max(mw[2], 4);
    const [codo, mano] = ik(h, mw, 46, 46, mv(tor.m, [-1, s * 0.7, -0.3]));
    const ua = nor(sub(codo, h)), fa = nor(sub(mano, codo)), fuera = nor(cruz(fa, [0, 0, 1])), lat = fuera, aba = nor(cruz(lat, fa));
    const c: Comp[] = [
      bT(tor, [-1, s * 44, 56], [16, 15, 15], m), hueso(h, codo, 12, 9.5, m), bulto(mez(h, codo, 0.42), [17, 12.5, 12.5], { eje: ua, ...m }),
      bulto(add(mez(h, codo, 0.5), mv(tor.m, [-1, 0, 0]), 4), [14, 10, 10], { eje: ua, ...m, k: 1.6 }),
      hueso(codo, mano, 10.5, 7, m), bulto(mez(codo, mano, 0.22), [14, 12.5, 11.5], { eje: fa, ...m }), bulto(codo, [9, 9, 9], m),
      bulto(add(mez(codo, mano, 0.3), fuera, -s * 5), [11, 6, 6], { eje: fa, ...m, k: 1.6 }),
      bulto(add(mano, fa, 5), [10, 8.5, 5], { eje: fa, ...m }), bulto(add(mano, fa, 1), [5, 7, 4.5], { eje: fa, ...m }),
    ];
    const pu: Comp[] = [], mn: Comp[] = [];
    // hombrera: tres placas de hueso aplanadas, fundidas al deltoides, con dos cuernos cortos hacia atrás
    for (let k = 0; k < 3; k++) {
      const n0 = nor(mv(tor.m, [0, s * (0.55 + k * 0.25), 1 - k * 0.2])), e0 = nor(sub(tor.m[0], esc(n0, pto(tor.m[0], n0)))), c0 = ap(tor, [-2, s * (44 + k * 5), 72 - k * 7]);
      // (elipsoides exactos y no bultos de la masa: una placa tan chata obliga a la marcha a pasos muy cortos)
      ps.push({ k: 'elip', c: add(c0, n0, -1), ex: e0, ey: cruz(n0, e0), ez: n0, r: [19 - k * 2, 15 - k * 2, 4.6], mat: CU, tono: k * 0.03 } as Pieza);
      if (k < 1) pu.push(hueso(add(c0, e0, -4 - k * 6), add(add(c0, n0, 18 - k * 4), mv(tor.m, [-0.6, s * 0.3, 0]), 8), 3.6, 0.3, { ...mc, k: 1.2 }));
    }
    // espolones del antebrazo y del codo
    for (let k = 0; k < 1; k++) { const b0 = add(mez(codo, mano, 0.2 + k * 0.3), fuera, -s * 8); pu.push(hueso(b0, add(add(b0, fa, -10 + k * 2), fuera, -s * 7), 2.6 - k * 0.5, 0.25, { ...mc, k: 1 })); }
    pu.push(hueso(codo, add(codo, add(esc(ua, 0.3), esc(fa, -1), 1), 14), 3, 0.25, { ...mc, k: 1 }));
    // dedos: un nudillo de carne y una garra larga en dos tramos, y la garra del pulgar
    for (const k of [-1.5, -0.5, 0.5, 1.5]) {
      const n0 = add(add(mano, fa, 8), lat, k * 3.6), b0 = add(add(mano, fa, 12), lat, k * 4.2), cu = add(add(b0, fa, 12 - Math.abs(k) * 2), aba, 4), tip = add(add(add(cu, fa, 13 - Math.abs(k) * 2.5), aba, 9), lat, k * 1.5);
      mn.push(hueso(n0, b0, 3, 2.6, m), hueso(b0, cu, 2.5, 1.8, { mat: 'jf_garra', k: 0.8 }), hueso(cu, tip, 1.8, 0.15, { mat: 'jf_garra', k: 0.5 }));
    }
    mn.push(bulto(add(mano, fa, 6), [7, 7, 4], { eje: fa, ...m }), hueso(add(add(mano, fa, 5), lat, s * 5), add(add(add(mano, fa, 14), lat, s * 10), aba, 6), 2.2, 0.15, { mat: 'jf_garra', k: 0.6 }));
    // tres masas: el músculo (que funde suave), los espolones y la mano con las garras (más chicas, se trazan rápido)
    ps.push(masa(c, { mat: PF, suave: 2.1 }), masa(pu, { mat: CU, suave: 1 }), masa(mn, { mat: PF, suave: 1.2 }));
    ps.push(...grietas({ o: mez(h, codo, 0.42), m: marcoEje(ua) }, [0, 0, 0], [16, 11.5, 11.5], 3, 20 + i, lava, pulso(1 + i), { grueso: 1.2, largo: 5 }));
    ps.push(...grietas({ o: mez(codo, mano, 0.25), m: marcoEje(fa) }, [0, 0, 0], [13, 11, 10], 2, 30 + i, lava, pulso(3 + i), { grueso: 1.1, largo: 5 }));
    // fuego que sale de la hombrera
    if (arde) ps.push(llamaOrg(ap(tor, [-6, s * 50, 74]), mv(tor.m, [-0.35, s * 0.35, 1]), 34 + ruge * 12 + columna * 10, 4.4, f, nC, 60 + i, { viento }));
  }
  // ---- brazos de abajo: más cortos, con la cadena
  const manosB: V3[] = [];
  for (const [i, s] of [[0, -1], [1, 1]] as [number, number][]) {
    const h = ap(tor, [10, s * 32, 32]);
    const [codo, mano] = ik(h, baja[i], 34, 32, mv(tor.m, [-1, s * 0.8, -0.2]));
    manosB.push(mano);
    const fa = nor(sub(mano, codo)), lat = nor(cruz(fa, [0, 0, 1])), aba = nor(cruz(lat, fa));
    // músculo en husos que se solapan (son brazos de atrás, casi siempre tapados: no hace falta fundirlos)
    const ua = nor(sub(codo, h)), L1 = len(sub(codo, h)), L2 = len(sub(mano, codo));
    ps.push(elipE(ap(tor, [10, s * 32, 32]), tor.m[0], [10, 10, 10], PF, enf), elipE(mez(h, codo, 0.45), ua, [L1 * 0.55, 9.5, 9.5], PF, enf, tor.m[2]), elipE(mez(h, codo, 0.4), ua, [L1 * 0.4, 12, 9], PF, enf + 0.02, tor.m[2]));
    ps.push(elipE(codo, ua, [7.5, 7, 7], PF, enf), elipE(mez(codo, mano, 0.45), fa, [L2 * 0.55, 7, 7], PF, enf), elipE(mez(codo, mano, 0.25), fa, [L2 * 0.32, 9.5, 8], PF, enf + 0.02), elipE(mano, fa, [6.5, 5.6, 5.6], PF, enf));
    const c: Comp[] = [hueso(codo, add(codo, nor(sub(codo, mano)), 10), 2.4, 0.25, { ...mc, k: 1 })];
    for (const k of [-1, 0, 1]) c.push(hueso(add(add(mano, fa, 4), lat, k * 3), add(add(add(mano, fa, 12), lat, k * 4), aba, 5), 1.7, 0.15, { mat: 'jf_garra', k: 0.6 }));
    ps.push(masa(c, { mat: CU, suave: 0.8 }));
    ps.push(...grietas({ o: mez(h, codo, 0.45), m: marcoEje(sub(codo, h)) }, [0, 0, 0], [12, 9, 9], 2, 50 + i, lava, pulso(5 + i), { grueso: 1 }));
  }
  // la cadena de eslabones al rojo: cuelga entre las dos manos bajas y la punta se arrastra; en el latigazo restalla
  const eslabon = (i: number) => (frio > 0.75 ? 'hierro' : i % 3 === 0 ? 'jf_hierro_rojo' : 'hierro');
  let tramo: V3[];
  const cadA = manosB[0];
  if (latigo > 0) {
    cadB = [K([60, 20, -40, -20, 150, 150, 110, 70], f), K([-40, -60, -70, -60, -24, -20, -30, -40], f), K([20, 60, 120, 170, 40, 2, 2, 10], f)];
    cadC = [K([50, 10, -30, 20, 110, 100, 80, 50], f), K([-36, -54, -60, -50, -24, -22, -28, -34], f), K([60, 110, 160, 190, 90, 40, 30, 40], f)];
    tramo = bezier(cadA, cadC, cadB, 18);
  } else if (acc === 'morir' && f >= 4) {
    tramo = colgar(cadA, [cadA[0] + 30, cadA[1] - 30, 0.8], 20, 10);
  } else {
    const B = manosB[1];
    tramo = [...colgar(cadA, B, 44 + Math.sin(ph * TAU) * 3, 14).slice(0, -1), ...bezier(B, add(B, [18, 14, -40]), [54 + Math.sin(ph * TAU) * 4, 46, 0.9], 8), [76, 40, 0.9], [84, 26, 0.9]];
  }
  ps.push(...cadena(tramo, 5.4, 2.4, eslabon));
  if (latigo > 0.9 && cadB[2] < 10) {
    // donde pega la punta revienta el piso en fuego
    for (let k = 0; k < 4; k++) ps.push(llamaOrg(add(cadB, [Math.cos(k * 1.6) * 9, Math.sin(k * 1.6) * 9, 0]), [Math.cos(k * 1.6) * 0.3, Math.sin(k * 1.6) * 0.3, 1], 30 - (k % 2) * 8, 5.5, f, nC, 120 + k));
    ps.push(...brasas(cadB, 18, 40, 10, f, 140, 'fuego', 1.2));
  }

  // ---- piernas de corvejón con pantorrilla, rodillera de hueso y pezuña fundida
  for (const [i, s] of [[0, -1], [1, 1]] as [number, number][]) {
    const cad = ap(pel, [0, s * 20, -2]);
    let suelo: V3 = [...pie[i]];
    const tob = add(suelo, mv(T([0, 0, 0], Rz(ty * 0.3)).m, [-11 + flojo * 25, s * 1, 30 - flojo * 24]));
    const [rod, t2] = ik(cad, tob, 46, 44, mv(pel.m, [1, s * 0.15, 0.1]));
    if (len(sub(t2, tob)) > 0.5) suelo = add(suelo, sub(t2, tob));
    const muslo = nor(sub(rod, cad)), canilla = nor(sub(t2, rod));
    const fw = nor([Math.cos(rad(ty * 0.3)), Math.sin(rad(ty * 0.3)), 0]), lat: V3 = [-fw[1], fw[0], 0];
    const c: Comp[] = [
      bT(pel, [-2, s * 18, -1], [15, 14, 15], m), hueso(cad, rod, 16, 11, m), bulto(mez(cad, rod, 0.4), [24, 16.5, 17], { eje: muslo, ...m }),
      bulto(add(mez(cad, rod, 0.55), mv(pel.m, [1, 0, 0]), 5), [14, 9, 9], { eje: muslo, ...m, k: 1.5 }), bulto(rod, [9, 9, 9], m),
      hueso(rod, t2, 11, 7.5, m), bulto(add(mez(rod, t2, 0.3), mv(pel.m, [-1, 0, 0]), 4), [16, 11, 11], { eje: canilla, ...m }), hueso(t2, add(suelo, [2, 0, 7]), 7.4, 6.6, m), bulto(t2, [7.5, 7.5, 7.5], m),
      // rodillera y espolón del talón
      bulto(add(rod, mv(pel.m, [1, 0, 0.2]), 6), [7, 8, 9], { ejes: ejesDe(pel), ...mc, k: 2 }),
      // pezuña hendida
      bulto(add(add(suelo, fw, 5), lat, 3.6), [9.5, 5, 6], { eje: fw, ...mc, k: 1 }), bulto(add(add(suelo, fw, 5), lat, -3.6), [9.5, 5, 6], { eje: fw, ...mc, k: 1 }), bulto(add(suelo, [0, 0, 6]), [8, 8.5, 5], { ...mc, k: 1.5 }),
    ];
    ps.push(masa(c, { mat: PF, suave: 2.4 }), masa([hueso(add(rod, mv(pel.m, [1, 0, 0]), 8), add(add(rod, muslo, -4), mv(pel.m, [1.4, s * 0.2, 0.3]), 14), 3.4, 0.3)], { mat: CU, suave: 1 }));
    ps.push(...grietas({ o: mez(cad, rod, 0.4), m: marcoEje(muslo) }, [0, 0, 0], [24, 16.5, 17], 4, 60 + i, lava, pulso(7 + i), { grueso: 1.3, largo: 6 }));
    if (suelo[2] < 1.5) for (let k = 0; k < 5; k++) {
      // grietas del piso: vetas de lava aplastadas que salen de la pezuña
      const a = hr(k * 13 + s * 7) * TAU, r0 = 9, r1 = 18 + hr(k * 3 + s) * 16, q0 = add(suelo, [Math.cos(a) * r0, Math.sin(a) * r0, 0]), mid = add(suelo, [Math.cos(a + 0.25) * (r0 + r1) / 2, Math.sin(a + 0.25) * (r0 + r1) / 2, 0]), q1 = add(suelo, [Math.cos(a - 0.1) * r1, Math.sin(a - 0.1) * r1, 0]);
      q0[2] = mid[2] = q1[2] = 0;
      const mt = frio > 0.75 ? 'negro' : 'cu_lava';
      ps.push(elipE(mez(q0, mid, 0.5), sub(mid, q0), [len(sub(mid, q0)) * 0.6, 1.2, 0.4], mt, pulso(9 + k)), elipE(mez(mid, q1, 0.5), sub(q1, mid), [len(sub(q1, mid)) * 0.6, 0.8, 0.3], mt, pulso(9 + k) - 0.1));
    }
  }

  // ---- cabeza alargada: cráneo, cejas pesadas, pómulos, hocico de calavera, cuernitos y colmillos de arriba
  const ch: Comp[] = [
    bH([-2, 0, 4], [10.5, 9, 9.5]), bH([9, 4.6, 7], [5, 4.6, 3.2]), bH([9, -4.6, 7], [5, 4.6, 3.2]), bH([13, 0, -0.5], [10, 5.6, 5]),
    bH([15, 0, 4], [8, 2.6, 2.6]), bH([8, 6.8, 0.5], [5.5, 3.2, 3.6]), bH([8, -6.8, 0.5], [5.5, 3.2, 3.6]), bH([21, 0, 0.5], [3.6, 3.8, 3.6]), bH([-9, 0, -5], [8, 9, 8]),
  ];
  const dientes: Comp[] = [];
  for (const s of [1, -1]) {
    for (let k = 0; k < 3; k++) ch.push(hueso(HP([-6 - k * 4, s * (4 + k * 2.5), 11 - k * 2]), HP([-10 - k * 6, s * (7 + k * 4.5), 26 - k * 4]), (2.4 - k * 0.4) * hs, 0.3, { ...mc, k: 1 }));
    for (let k = 0; k < 5; k++) {
      const x = 9 + k * 3, y = s * (5.4 - k * 0.7), lar = k === 1 ? 10 : k === 4 ? 7 : 4 + (k % 2) * 1.5;
      dientes.push(hueso(HP([x, y, -3.2]), HP([x + 0.9, y * 0.9, -3.2 - lar]), (k === 1 || k === 4 ? 1.25 : 0.95) * hs, 0.18, { mat: 'cu_hueso', k: 0.35 }));
    }
  }
  ch.push(hueso(HP([-4, 0, 12]), HP([-10, 0, 28]), 2.6 * hs, 0.3, { ...mc, k: 1 }));
  ps.push(masa(ch, { mat: PF, suave: 1.8 }), masa(dientes, { mat: 'cu_hueso', suave: 0.3 }));
  for (const s of [1, -1]) {
    ps.push(elipE(HP([13.4, s * 4.8, 3.2]), mv(cabT.m, [1, s * 0.4, 0]), [1.6 * hs, 3 * hs, 2 * hs], 'negro', 0, mv(cabT.m, [0, s, 0.5])));
    ps.push(elipE(HP([22.5, s * 1.4, 1.2]), cabT.m[0], [0.8 * hs, 0.6 * hs, 1.2 * hs], 'negro'));
  }
  ps.push(...grietas({ o: HP([-2, 0, 4]), m: cabT.m }, [0, 0, 0], [10.5 * hs, 9 * hs, 9.5 * hs], 3, 70, lava, pulso(11), { grueso: 1, arriba: 0.6 }));
  // garganta encendida
  ps.push(elipE(HP([11, 0, -5]), cabT.m[0], [10 * hs, 5 * hs, (2.5 + mand * 5) * hs], frio > 0.75 ? 'jf_lava_fria' : 'jf_brasa_honda', 0.15 + ruge * 0.3, cabT.m[1]));
  // la mandíbula: una sola pieza pesada que baja entera, con colmillos que suben y púas en el mentón
  {
    const mj = cmp(cabT, T(esc([2, 0, -4], hs), Ry(mand * 40)));
    const J = (q: V3) => ap(mj, esc(q, hs)), bJ = (c: V3, r: V3, o: OpcComp = m) => bT(mj, esc(c, hs), esc(r, hs), o);
    const cj: Comp[] = [bJ([18, 0, -3], [4.5, 5.5, 3.6]), bJ([10, 0, -3.4], [8, 4.5, 2.2])];
    for (const s of [1, -1]) {
      cj.push(hueso(J([0, s * 6.5, 0]), J([17, s * 3.6, -2.6]), 4.4 * hs, 3.4 * hs, m), bJ([5, s * 6.6, -1.8], [6, 3.4, 4.2]));
      for (let k = 0; k < 4; k++) { const x = 6 + k * 3.2, y = s * (4.8 - k * 0.45), lar = k === 3 ? 10 : 3.5 + (k % 2) * 1.6; cj.push(hueso(J([x, y, 0.8]), J([x + 0.6, y * 1.04, 0.8 + lar]), (k === 3 ? 1.5 : 0.95) * hs, 0.18, { mat: 'cu_hueso', k: 0.35 })); }
      cj.push(hueso(J([17, s * 3, -4.5]), J([20, s * 4.5, -11]), 1.6 * hs, 0.25, { ...mc, k: 0.8 }));
    }
    ps.push(masa(cj, { mat: PF, suave: 1.6 }));
  }
  // ojos de brasa: rajas encendidas que suben hacia afuera, con el centro casi blanco (y dos chicos encima)
  for (const s of [1, -1]) {
    ps.push(elipE(HP([15, s * 4.8, 4.2]), mv(cabT.m, [1, s * 0.4, 0.35]), [1.4 * hs, 3.2 * hs, 1.15 * hs], ojo, 0.35, mv(cabT.m, [0, s, 0.55])));
    ps.push(elipE(HP([15.6, s * 4.6, 4.3]), mv(cabT.m, [1, s * 0.4, 0.35]), [0.7 * hs, 1.6 * hs, 0.55 * hs], frio > 0.6 ? 'cu_ojo' : 'luz_vela', 0.2, mv(cabT.m, [0, s, 0.55])));
    ps.push(elipE(HP([12.6, s * 2.6, 9]), mv(cabT.m, [1, s * 0.3, 0.4]), [0.9 * hs, 1.5 * hs, 0.7 * hs], ojo, 0.25, mv(cabT.m, [0, s, 0.6])));
  }
  // cuernos mayores: salen de la sien, abren, suben retorcidos y la punta vuelve adelante; anillos de estrías
  for (const s of [1, -1]) {
    const pts: V3[] = [[0, s * 8, 8], [-8, s * 21, 14], [-10, s * 33, 27], [-3, s * 38, 43], [10, s * 35, 55], [18, s * 28, 58]].map((q) => HP(q as V3));
    const rr = [6.4, 5.6, 4.4, 3.1, 1.6, 0.3].map((r) => r * hs);
    // en dos masas (la base y la punta) que se tocan en una junta redonda: así cada una envuelve menos aire
    const hc: Comp[] = [], hp: Comp[] = [];
    for (let i = 0; i < 5; i++) (i < 3 ? hc : hp).push(hueso(pts[i], pts[i + 1], rr[i], rr[i + 1]));
    for (let i = 0; i < 4; i++) { const r = lerp(rr[i], rr[i + 1], 0.5); (i < 3 ? hc : hp).push(bulto(mez(pts[i], pts[i + 1], 0.5), [r * 0.62, r * 1.1, r * 1.1], { eje: sub(pts[i + 1], pts[i]), mat: CU, k: 1 })); }
    ps.push(masa(hc, { mat: CU, suave: 1.3 }), masa(hp, { mat: CU, suave: 1.3 }));
    if (arde) ps.push(llamaOrg(mez(pts[2], pts[3], 0.4), [0, 0, 1], 28 + ruge * 10 + columna * 10, 3.4, f, nC, 80 + s, { viento }));
  }
  // fuego grande que sale de la espalda, entre los omóplatos
  if (arde) ps.push(llamaOrg(ap(tor, [-30, 0, 62]), mv(tor.m, [-0.45, 0, 1]), 50 + ruge * 16, 6.5, f, nC, 95, { viento, tramos: 6 }));

  // el fuego del especial: del pecho abierto salen lenguas cortas hacia adelante y detrás de los cuernos sube una
  // columna de fuego desde la espalda, que nunca tapa la cabeza
  if (columna > 0.02) {
    const o0 = ap(tor, [34, 0, 36]);
    for (let k = 0; k < 2; k++) { const a = (k / 2) * TAU + 0.4 + fz * 0.3; ps.push(llamaOrg(add(add(o0, tor.m[1], Math.cos(a) * 6), tor.m[2], Math.sin(a) * 7), add(mv(tor.m, [1, 0, 0.5]), add(esc(tor.m[1], Math.cos(a)), tor.m[2], Math.sin(a)), 0.5), (18 + hr(k) * 10) * columna, 4, f, nC, 650 + k)); }
    ps.push(esfera(...o0, 6 * columna, { mat: 'luz_vela' }));
    const b0 = ap(tor, [-30, 0, 58]), arriba = nor([-0.12, 0, 1]);
    ps.push(...columnaFuego(b0, arriba, 150, 27, f, nC, columna));
    ps.push(...brasas(add(b0, arriba, 150 * columna * 0.45), 45, 80, 10, f, 77, 'fuego', 1.3));
  }
  // venas de lava que laten por zona: pecho, espalda, vientre, pelvis y hombros
  {
    const fuera = (q: V3) => { const d = sub(q, centroH), e3 = nor(cruz(ejeH, tor.m[1])); return (pto(d, ejeH) / 23) ** 2 + (pto(d, tor.m[1]) / 21) ** 2 + (pto(d, e3) / 21) ** 2 > 1; };
    ps.push(...grietas(tor, [5, 0, 38], [25 * resp, 36 * resp, 25], 8, 11, lava, pulso(13), { largo: 6, grueso: 1.6 }).filter((q) => q.k !== 'elip' || fuera(q.c)));
    ps.push(...grietas(tor, [-15, 0, 48], [18, 31, 20], 4, 13, lava, pulso(14), { lado: 1, grueso: 1.5, largo: 6 }));
    ps.push(...grietas(tor, [3, 0, 10], [16, 21, 14], 4, 15, lava, pulso(15), { grueso: 1.3, largo: 5 }));
    ps.push(...grietas(pel, [0, 0, 0], [18, 24, 14], 3, 17, lava, pulso(16), { grueso: 1.3 }));
    ps.push(...grietas(tor, [-6, 0, 64], [15, 30, 11], 4, 19, lava, pulso(17), { grueso: 1.3, arriba: 0.6 }));
  }
  // brasas que suben de los hombros, de la espalda y del borde de las alas; al morir, humo que sube de la piedra
  if (frio < 0.8) {
    ps.push(...brasas([px, py, 70], 70, 120, 9, f, 500, 'fuego', 0.9));
    for (let k = 0; k < 4; k++) { const b = bordes[Math.floor(hr(k * 3 + 1) * bordes.length)], u = ((f / nC) + hr(k + 40)) % 1; ps.push(esfera(b[0] + Math.sin(u * 5 + k) * 3, b[1] + Math.cos(u * 4 + k) * 3, b[2] + u * 30, 0.9 * (1 - u * 0.6), { mat: 'fuego', tono: -0.1 })); }
  }
  if (humo > 0) for (let k = 0; k < 4; k++) {
    const u = ((f / 8) + hr(k + 3)) % 1, b = ap(tor, [(hr(k) - 0.5) * 30, (hr(k + 1) - 0.5) * 56, 30 + hr(k + 2) * 20]);
    for (let j = 0; j < 3; j++) { const v = u + j * 0.33, w = (1.4 + v * 2.6) * humo; ps.push(elipsoide(b[0] + Math.sin(v * 6 + k) * 4, b[1] + Math.cos(v * 5 + k) * 3, b[2] + 10 + v * 46, w, w, w * 2.2, { mat: 'jf_humo' })); }
    ps.push(esfera(b[0], b[1], b[2] + 4 + u * 20, 0.8, { mat: 'fuego', tono: -0.3 }));
  }
  // la luz del fuego respira con el cuadro: el centro se mece y el radio crece y se encoge
  const luz = frio > 0.8 ? undefined : { c: add(ap(tor, [6, 0, 28]), [Math.sin(fz) * 4, Math.cos(fz * 2) * 3, Math.sin(fz * 2 + 1) * 5]), r: (34 + columna * 34 + ruge * 10) * (1 + 0.12 * Math.sin(fz * 2 + 0.7)) * (1 - frio * 0.4), color: '#e04010' };
  return { piezas: ps, resplandor: luz };
}
jefe('ozmaren', ['Ozmaren, la Sed que Arde', 'Ozmaren, the Burning Thirst'], 195, 5, ['abre el pecho', 'opens the chest'], ozmaren);

// ================================================================== 2. LA ABADESA ILVARA
/**
 * Una abadesa corrompida de 100 de alto que flota sobre el piso: hábito quemado con el ruedo hecho jirones que
 * todavía tienen brasas, toca y velo, una máscara de porcelana sin cara y rajada (por una raja se ve la luz de
 * adentro), brazos demasiado largos con dedos de cera que arden como velas, un incensario de bronce con fuego y
 * un halo de velas negras detrás de la cabeza.
 */
function abadesa(acc: Acc, f: number): Res {
  const ph = f / CUADROS[acc], H = 'jf_habito', m = { mat: H };
  let px = 0, py = 0, zf = 11, tp = 6, ty = 0, cab = 8, cabR = 10, ardor = 0.35, sube = 0, colapso = 0, mascaraRota = 0, apaga = 0, ruedo = 0, bola = 0, golpe = 0;
  // manos [derecha (incensario), izquierda] y ángulo del incensario (grados, + adelante)
  const mano: V3[] = [[10, -15, 44], [12, 14, 42]];
  let incienso = 0, giroInc = 0;
  if (acc === 'quieto') {
    const b = Math.sin(ph * TAU); zf = 11 + b * 1.6; cabR = 10 + b * 3; incienso = b * 22; mano[1] = [12, 14, 42 + b];
  } else if (acc === 'caminar') {
    const b = Math.sin(ph * TAU); zf = 11 + Math.sin(ph * TAU * 2) * 1.5; tp = 14; ruedo = 1; incienso = -18 + b * 26; cabR = 8 + b * 3; px = 0;
    mano[0] = [8 - b * 3, -15, 44]; mano[1] = [10 + b * 3, 14, 43];
  } else if (acc === 'atacar') {
    // el incensario sube por detrás y cae por encima de la cabeza contra el piso, que revienta en fuego
    ty = K([0, 14, 26, 24, -10, -20, -10, 0], f); tp = K([6, 0, -6, -4, 16, 22, 14, 6], f);
    mano[0] = [K([10, 0, -8, 0, 26, 30, 22, 10], f), K([-15, -18, -16, -10, -8, -10, -14, -15], f), K([44, 62, 84, 94, 66, 52, 50, 44], f)];
    giroInc = 1; incienso = K([0, -60, -130, -190, -280, -300, -330, -360], f);
    golpe = K([0, 0, 0, 0, 0.6, 1, 0.5, 0], f); cab = K([8, 4, 0, 0, 14, 18, 12, 8], f);
  } else if (acc === 'lanzar') {
    // levanta la mano izquierda: los dedos arden y entre ellos crece una bola de fuego que sale adelante
    bola = K([0, 0.2, 0.45, 0.7, 1, 1.4, 1.9, 2.4], f); ardor = K([0.35, 0.6, 0.8, 1, 1, 0.8, 0.5, 0.35], f);
    mano[1] = [K([12, 18, 24, 28, 32, 34, 28, 14], f), K([14, 12, 10, 8, 6, 6, 10, 14], f), K([42, 52, 60, 64, 66, 64, 56, 44], f)];
    tp = K([6, 2, 0, 2, 10, 14, 10, 6], f); cab = K([8, 4, 2, 2, 8, 10, 8, 8], f); incienso = K([0, -10, -20, -20, 30, 40, 20, 0], f);
  } else if (acc === 'herido') {
    const k = [0.6, 1, 0.7, 0.3][f % 4];
    tp = 6 - 20 * k; cab = 8 - 22 * k; cabR = 10 + 20 * k; px = -5 * k; zf = 11 + 3 * k; incienso = 50 * k;
    mano[0] = [10 - 8 * k, -18 - 6 * k, 44 + 14 * k]; mano[1] = [12 - 8 * k, 18 + 6 * k, 42 + 16 * k];
  } else if (acc === 'morir') {
    // se alza con los brazos abiertos, las velas se apagan, la máscara se raja y el hábito se desploma vacío
    zf = K([11, 18, 22, 16, 8, 4, 2, 0], f); tp = K([6, -14, -20, -6, 10, 20, 26, 30], f); cab = K([8, -30, -36, -10, 20, 30, 30, 30], f); cabR = K([10, 0, -10, 20, 34, 40, 40, 40], f);
    ardor = K([0.35, 1, 0.5, 0, 0, 0, 0, 0], f); apaga = K([0, 0, 0.6, 1, 1, 1, 1, 1], f); mascaraRota = K([0, 0.3, 0.6, 1, 1, 1, 1, 1], f); colapso = K([0, 0, 0, 0.15, 0.4, 0.7, 0.9, 1], f);
    for (const [i, s] of [[0, -1], [1, 1]] as [number, number][]) mano[i] = [K([10, 0, -4, 6, 16, 20, 24, 26], f), s * K([15, 34, 38, 26, 22, 22, 22, 22], f), K([44, 84, 90, 50, 26, 14, 6, 3], f)];
    incienso = K([0, 70, 90, 40, 0, 0, 0, 0], f);
  } else if (acc === 'especial') {
    // alza los brazos: el halo de velas negras estalla en llamas y un anillo de fuego se prende en el piso
    sube = K([0, 0.2, 0.6, 1, 1, 1, 0.6, 0.2], f); ardor = K([0.35, 0.5, 0.9, 1.6, 2, 2, 1.4, 0.7], f);
    zf = 11 + sube * 12; tp = K([6, 0, -8, -12, -14, -14, -8, 2], f); cab = K([8, 0, -14, -24, -28, -28, -18, 0], f); cabR = K([10, 6, 2, 0, 0, 0, 4, 8], f);
    for (const [i, s] of [[0, -1], [1, 1]] as [number, number][]) mano[i] = [K([10, 8, 6, 6, 6, 6, 8, 10], f), s * K([15, 20, 24, 26, 26, 26, 22, 17], f), K([44, 62, 92, 108, 112, 112, 96, 60], f) + 0];
    incienso = K([0, 20, 40, 10, -10, 10, 20, 0], f);
  }
  const ps: Pieza[] = [];
  const hund = colapso * 46;
  const tor: Tr = T([px, py, zf + 52 - hund], Rz(ty), Ry(tp), Rx(colapso * 12));
  const cabT0 = cmp(tor, T([3, 0, 30], Ry(cab), Rx(cabR))), cabT: Tr = { o: cabT0.o, m: [esc(cabT0.m[0], 1.3), esc(cabT0.m[1], 1.3), esc(cabT0.m[2], 1.3)] };
  const rastro = ruedo * 7 + colapso * 6;
  // ---- hábito: pecho hundido, cintura, falda acampanada con pliegues que flota; el ruedo se arrastra atrás al andar
  const hem: V3 = [px - rastro, py, Math.max(0.5, zf - 1 - colapso * 10)];
  const radH = 17 + colapso * 9 + sube * 4;
  if (colapso < 0.95) {
    const cs: Comp[] = [bT(tor, [0, 0, 15], [6, 9, 11], m), bT(tor, [0, 0, 1], [6, 8, 8], m), hueso(ap(tor, [0, 0, 0]), add(hem, [0, 0, 3]), 8, radH - 3, m)];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU + 0.2, rr = radH - 1 + (k % 2) * 1.5;
      cs.push(hueso(ap(tor, [Math.cos(a) * 6, Math.sin(a) * 7, -2]), add(hem, [Math.cos(a) * rr, Math.sin(a) * rr, 1 + (k % 3)]), 2, 3.4, m));
    }
    for (const s of [1, -1]) cs.push(bT(tor, [-1, s * 8.5, 24], [4.2, 4.2, 4], m), bT(tor, [-3, s * 4, 22], [5, 5, 4], m));
    ps.push(masa(cs, { mat: H, suave: 2.6 }));
    // jirones quemados del ruedo, algunos con brasa en la punta
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * TAU + hr(k) * 0.3, rr = radH - 1, b0 = add(hem, [Math.cos(a) * rr, Math.sin(a) * rr, 2.5]);
      const lar = 5 + hr(k + 3) * 9, sw = Math.sin(ph * TAU + k) * 2 - ruedo * 3;
      const tip = add(b0, [Math.cos(a) * 2 + sw, Math.sin(a) * 2, -lar]);
      ps.push(poliedro([add(b0, [-Math.sin(a) * 2.6, Math.cos(a) * 2.6, 0]), add(b0, [Math.sin(a) * 2.6, -Math.cos(a) * 2.6, 0]), add(b0, [Math.cos(a) * 0.8, Math.sin(a) * 0.8, 0.5]), tip], { mat: H, tono: -0.05 }));
      if (hr(k + 7) < 0.45 && apaga < 0.5) ps.push(esfera(...tip, 0.7, { mat: 'cu_lava', tono: -0.2 }));
    }
    // brasas que comen la tela (agujeros quemados que todavía brillan)
    if (apaga < 0.8) for (let k = 0; k < 9; k++) { const a = hr(k * 5) * TAU, z = hr(k * 7); const c = mez(add(hem, [Math.cos(a) * radH * 0.98, Math.sin(a) * radH * 0.98, 4]), ap(tor, [Math.cos(a) * 7, Math.sin(a) * 8.5, 4]), z * 0.8); ps.push(elipE(c, [Math.cos(a), Math.sin(a), 0.3], [0.5, 1.4, 1.1], 'cu_lava', -0.25)); }
    // escapulario: la tira de tela del frente con un borde
    ps.push(masa([hueso(ap(tor, [6.2, 0, 22]), ap(tor, [8, 0, -2]), 2.6, 3, { mat: 'cu_tela_roja' }), hueso(ap(tor, [8, 0, -2]), add(hem, [radH * 0.88, 0, 7]), 3, 3.8, { mat: 'cu_tela_roja' })], { mat: 'cu_tela_roja', suave: 1.5, tono: -0.12 }));
    ps.push(...[0, 1, 2].map((k) => elipE(ap(tor, [8.8 + k * 0.2, 0, 14 - k * 9]), tor.m[0], [0.4, 2, 0.3], 'cu_sangre_viva', -0.2)));
    // rosario de cuentas negras con una cruz invertida
    const ros = colgar(ap(tor, [7.5, 5, 23]), ap(tor, [7.5, -5, 23]), 22, 10);
    ros.forEach((q, k) => k % 1 === 0 && ps.push(esfera(...q, 0.75, { mat: 'jf_cera_negra' })));
    const bajo = ros[5];
    ps.push(caja(bajo[0], bajo[1], bajo[2] - 7, 0.9, 0.9, 7, { mat: 'hierro_oxido', giro: ty }), caja(bajo[0], bajo[1], bajo[2] - 6, 0.9, 4.5, 0.9, { mat: 'hierro_oxido', giro: ty }));
  } else {
    // el hábito vacío caído: un montón de tela quemada en el piso
    ps.push(masa([bulto([px + 4, py, 3], [22, 20, 5], m), bulto([px - 6, py + 6, 5], [12, 10, 6], m), bulto([px + 14, py - 8, 3], [10, 12, 4], m), bulto([px - 14, py - 10, 2.5], [9, 8, 3], m)], { mat: H, suave: 3 }));
    for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; ps.push(poliedro([[px + Math.cos(a) * 20, py + Math.sin(a) * 18, 0.2], [px + Math.cos(a + 0.2) * 20, py + Math.sin(a + 0.2) * 18, 0.2], [px + Math.cos(a + 0.1) * (28 + hr(k) * 8), py + Math.sin(a + 0.1) * (26 + hr(k) * 8), 0.2], [px + Math.cos(a + 0.1) * 21, py + Math.sin(a + 0.1) * 19, 1.6]], { mat: H })); }
    ps.push(masa([bulto([px + 18, py + 2, 3], [4, 3, 1.4], { mat: 'jf_toca' }), hueso([px + 10, py - 4, 2], [px + 24, py + 6, 1.5], 2.6, 2.2, { mat: 'jf_toca' })], { mat: 'jf_toca' }));
  }
  // ---- brazos demasiado largos: mangas acampanadas, antebrazo de hueso y manos con dedos de cera que arden
  const finger: V3[] = [];
  const manosW: [V3, V3, number][] = [];
  for (const [i, s] of [[0, -1], [1, 1]] as [number, number][]) {
    if (colapso > 0.95) break;
    const h = ap(tor, [-1, s * 9.5, 24]);
    const mw: V3 = [...mano[i]]; mw[2] = Math.max(mw[2] - hund * 0.5, 2) + (zf - 11);
    const [codo, mu] = ik(h, mw, 24, 25, mv(tor.m, [-0.6, s * 0.8, -0.3]));
    const fa = nor(sub(mu, codo)), man = mez(codo, mu, 0.6);
    ps.push(masa([hueso(h, codo, 3, 3.4, m), hueso(codo, man, 3.4, 5.2, m), bulto(h, [4, 4, 4], m)], { mat: H, suave: 1.6 }));
    // borde rasgado de la manga
    for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; const lat = nor(cruz(fa, [0, 0, 1])), up2 = cruz(lat, fa); const b0 = add(add(man, lat, Math.cos(a) * 4.8), up2, Math.sin(a) * 4.8); ps.push(pua(b0, add(add(b0, fa, 3), [0, 0, -4 - hr(k + i) * 4]), 1.3, H)); }
    ps.push(masa([hueso(mez(codo, mu, 0.5), mu, 1.6, 1.2, { mat: 'cu_piel_palida' }), bulto(add(mu, fa, 1.6), [2.4, 1.5, 2.1], { eje: fa, mat: 'cu_piel_palida' })], { mat: 'cu_piel_palida', suave: 1 }));
    manosW.push([mu, fa, s]);
  }
  for (const [mu, fa, s] of manosW) {
    const lat = nor(cruz(fa, [0, 0, 1])), up2 = nor(cruz(lat, fa));
    for (let k = 0; k < 5; k++) {
      // dedo de cera: dos falanges largas que se curvan, gotas y una llamita en la punta
      const off = (k - 2) * 1.1, b0 = add(add(mu, fa, 3), lat, off * s), dobla = k === 4 ? 0.3 : 0.6;
      const m1 = add(add(add(b0, fa, 5), up2, -dobla * 1.5), lat, off * 0.5 * s), tip = add(add(add(m1, fa, k === 4 ? 3.5 : 5.5), up2, -dobla * 3.5), lat, off * 0.4 * s);
      ps.push(palo(b0, m1, 0.75, { mat: 'jf_cera_palida', r1: 0.65 }), palo(m1, tip, 0.65, { mat: 'jf_cera_palida', r1: 0.55 }));
      if (k % 2 === 0) ps.push(elipsoide(...mez(b0, m1, 0.6), 0.6, 0.6, 1.3, { mat: 'jf_cera_palida', tono: 0.1 }));
      finger.push(tip);
      if (apaga < 0.5) ps.push(...llama(add(tip, [0, 0, 0.4]), (2.2 + ardor * 2.5), 0.5 + ardor * 0.25, f, 30 + k * 3 + s, ardor > 1 ? 'fuego' : 'luz_vela'));
      else if (apaga < 1 || acc === 'morir') ps.push(elipsoide(tip[0], tip[1], tip[2] + 2 + apaga * 4, 0.6, 0.6, 1.6, { mat: 'jf_humo' }));
    }
  }
  // ---- incensario: cadena desde la mano derecha, bronce calado con fuego adentro y humo que lo sigue
  {
    const mu = manosW.length ? manosW[0][0] : [px + 24, py - 14, 3] as V3;
    const a = rad(incienso), L = 22;
    let cen: V3;
    if (colapso > 0.6) cen = [px + 26, py - 18, 4];
    else if (giroInc) cen = add(mu, mv(T([0, 0, 0], Rz(ty)).m, [Math.sin(a) * L, 0, -Math.cos(a) * L]));
    else cen = add(mu, [Math.sin(a) * L * 0.9, -Math.sin(a) * 3, -Math.cos(a) * L]);
    if (colapso <= 0.6) ps.push(...cadena(colgar(mu, add(cen, [0, 0, 4.6]), 1, 8), 2, 0.9, () => 'bronce'));
    const ca = colapso > 0.6 ? 70 : 0;
    ps.push(esfera(...cen, 4.6, { mat: 'bronce' }), cilindro(cen[0], cen[1], cen[2] + 2.5, 3.6, 4, { mat: 'bronce', r1: 0.8, incl: ca }), cilindro(cen[0], cen[1], cen[2] - 5.6, 2, 1.8, { mat: 'bronce', r1: 3, incl: ca }));
    for (let k = 0; k < 8; k++) { const t = (k / 8) * TAU, d: V3 = [Math.cos(t), Math.sin(t), 0.15]; ps.push(elipE(add(cen, d, 4.5), d, [0.4, 1, 1.4], apaga > 0.9 ? 'negro' : 'fuego', -0.1)); }
    if (apaga < 0.9) {
      ps.push(...llama(add(cen, [0, 0, 6]), 6 + ardor * 4 + golpe * 6, 2 + golpe, f, 70, 'fuego'));
      for (let k = 0; k < 5; k++) { const u = ((f / 8) + k / 5) % 1; ps.push(esfera(cen[0] - Math.sin(a) * u * 14 + Math.sin(u * 7) * 2, cen[1] + Math.cos(u * 5) * 2, cen[2] + 6 + u * 22, 1.6 + u * 3.4, { mat: 'jf_humo' })); }
    } else ps.push(elipsoide(cen[0], cen[1], cen[2] + 9, 2, 2, 5, { mat: 'jf_humo' }));
    if (golpe > 0.3) { for (let k = 0; k < 7; k++) ps.push(...llama(add([cen[0], cen[1], 0.5], [Math.cos(k) * 10 * golpe, Math.sin(k) * 10 * golpe, 0]), 14 * golpe, 3.5, f, 80 + k)); ps.push(...brasas([cen[0], cen[1], 2], 14, 30, 8, f, 88)); }
  }
  // ---- cabeza: toca, velo negro, máscara de porcelana sin cara y rajada
  const maskC = colapso > 0.85 ? null : cabT;
  if (maskC) {
    // velo negro sobre la coronilla y la espalda, toca blanca quemada enmarcando la máscara y bajo el mentón
    ps.push(masa([bT(maskC, [-2, 0, 2.4], esc([6.4, 6.8, 7.6], 1.3), m), bT(maskC, [-6, 0, -6], esc([4.5, 9, 9], 1.3), m), hueso(ap(maskC, [-6, 0, -6]), ap(tor, [-7, 0, 8]), 7.8, 6, m), bT(maskC, [-0.5, 0, 7.6], esc([5.4, 7.2, 2.2], 1.3), m)], { mat: H, suave: 2.5 }));
    ps.push(masa([bT(maskC, [1.2, 0, 0.4], esc([5, 6.1, 7.1], 1.3), { mat: 'jf_toca' }), bT(maskC, [0.8, 0, -6.4], esc([5, 6.4, 3], 1.3), { mat: 'jf_toca' }), hT(maskC, [-0.5, 0, -6], [-0.5, 0, -11], 3.9, 4.2, { mat: 'jf_toca' })], { mat: 'jf_toca', suave: 1.8 }));
  }
  // la máscara: un óvalo liso de porcelana; al morir se parte y cae
  if (colapso < 0.85) {
    const C = (q: V3) => ap(cabT, q);
    ps.push(elipE(C([5.2, 0, 0.5]), cabT.m[0], [3.4, 5.6, 7.8], 'jf_porcelana', 0.05, cabT.m[1]));
    // lágrimas negras donde irían los ojos, rajas, y una raja por la que sale luz
    for (const s of [1, -1]) ps.push(palo(C([7.8, s * 1.8, 1.8]), C([7.6, s * 2, -2.5]), 0.45, { mat: 'negro', r1: 0.2 }), palo(C([7.6, s * 2, -2.5]), C([6.9, s * 2.3, -4.6]), 0.3, { mat: 'negro', r1: 0.1 }));
    const raja: V3[] = [[7.9, 0.6, 5.6], [8.0, -0.4, 3.4], [8.1, 0.5, 1.2], [8.0, -0.6, -1], [7.8, 0.2, -3], [7.4, -0.6, -5]];
    const nR = 3 + Math.round(mascaraRota * 2);
    for (let k = 0; k < nR; k++) ps.push(palo(C(raja[k]), C(raja[k + 1]), 0.45 + mascaraRota * 0.2, { mat: apaga > 0.9 ? 'negro' : 'luz_vela', r1: 0.35 }));
    ps.push(palo(C([7.9, 0.6, 3.4]), C([7.5, 2.6, 4.6]), 0.25, { mat: 'negro' }), palo(C([7.8, -0.6, 0]), C([7.4, -2.8, -1.2]), 0.25, { mat: 'negro' }));
  } else {
    // pedazos de la máscara en el piso
    ps.push(elipE([px + 22, py + 8, 1.6], [0.3, 1, 0.2], [1.6, 3.6, 3], 'jf_porcelana'), elipE([px + 27, py + 3, 1.2], [1, -0.4, 0.3], [1.3, 2.4, 2.2], 'jf_porcelana'), elipE([px + 19, py + 15, 0.8], [1, 1, 0], [1, 1.6, 1.2], 'jf_porcelana'));
  }
  // ---- halo de velas negras sobre un aro de hierro detrás de la cabeza
  {
    const hc = colapso > 0.5 ? null : ap(cabT, [-7, 0, 5]);
    const hy = nor(cabT.m[1]), hz = nor(cabT.m[2]), R = 15;
    const n = 11;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU + 0.15, d = add(esc(hy, Math.cos(a)), hz, Math.sin(a));
      let base: V3, dir: V3;
      if (hc) { base = add(hc, d, R); dir = nor(add(d, [0, 0, 0.6])); }
      else { base = [px - 18 + Math.cos(a) * 22, py + Math.sin(a) * 26, 1.2]; dir = nor([Math.cos(a * 3), Math.sin(a * 3), 0.05]); }
      const alto = 5 + hr(k * 3) * 5;
      if (hc) ps.push(palo(add(hc, add(esc(hy, Math.cos(a - TAU / n)), hz, Math.sin(a - TAU / n)), R), base, 0.7, { mat: 'hierro' }));
      ps.push(palo(base, add(base, dir, alto), 1.1, { mat: 'jf_cera_negra', r1: 1 }));
      ps.push(elipsoide(...add(add(base, dir, alto * 0.5), [0.6, 0, -1]), 0.5, 0.5, 1.6, { mat: 'jf_cera_negra', tono: 0.1 }));
      const tip = add(base, dir, alto + 0.4);
      if (apaga < 0.5 && hc) ps.push(...llama(tip, 2.6 + ardor * 4, 0.6 + ardor * 0.45, f, 100 + k, ardor > 1 ? 'fuego' : 'luz_vela'));
      else if (hc || acc === 'morir') ps.push(elipsoide(tip[0], tip[1], tip[2] + 3, 0.6, 0.6, 2, { mat: 'jf_humo' }));
    }
  }
  // ---- especial: un anillo de llamas en el piso; lanzar: la bola de fuego entre los dedos
  if (sube > 0.4) for (let k = 0; k < 14; k++) { const a = (k / 14) * TAU; ps.push(...llama([px + Math.cos(a) * 34, py + Math.sin(a) * 34, 0.3], 10 + sube * 12 * (0.6 + hr(k) * 0.6), 3.4, f, 140 + k, 'fuego', [0, 0, 1], -0.25)); }
  if (bola > 0.1 && manosW.length > 1) {
    const [mu, fa] = manosW[1];
    const c = bola <= 1 ? add(mu, fa, 9) : add(add(mu, fa, 9), mv(T([0, 0, 0], Rz(ty)).m, [1, 0, -0.1]), (bola - 1) * 40);
    const r = Math.min(1, bola) * 4.5;
    ps.push(esfera(...c, r, { mat: 'fuego', tono: 0.1 }), esfera(...c, r * 0.55, { mat: 'luz_vela' }));
    for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + f; ps.push(...llama(add(c, [Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8, 0]), r * 1.4, r * 0.35, f, 160 + k)); }
    if (bola > 1) ps.push(...brasas(add(c, mv(T([0, 0, 0], Rz(ty)).m, [-8, 0, 0])), 5, 6, 6, f, 170, 'fuego', 0.6));
  }
  const luzC = colapso > 0.5 ? undefined : ap(cabT, [-9, 0, 9]);
  return { piezas: ps, resplandor: luzC && apaga < 0.6 ? { c: luzC, r: 14 + ardor * 14, color: '#ffc060' } : undefined };
}
jefe('abadesa', ['La Abadesa Ilvara', 'Abbess Ilvara'], 100, 3, ['alza las velas', 'raises the candles'], abadesa);

// ------------------------------------------------------------------ esqueleto de bípedo grande (rey momia, gigante, verdugo)
/** Proporciones: S escala (1 = persona de 61), A ancho, brazo largo de los brazos. */
interface Bip { S: number; A: number; brazo?: number }
/**
 * Pose en unidades de persona (se multiplican por S): pelvis corrida (px, py), bajada (pz), inclinación (tp),
 * giro (ty) y alabeo (tr) del torso, cabeza (cab adelante, cabR de costado), manos y pies en el marco del jefe
 * ([derecha, izquierda]) y caída entera (0..1, `atras` la tumba de espaldas).
 */
interface PoseB { px: number; py: number; pz: number; tp: number; ty: number; tr: number; cab: number; cabR: number; mano: [V3, V3]; pie: [V3, V3]; caida: number; atras: boolean }
const poseB = (): PoseB => ({ px: 0, py: 0, pz: 0, tp: 6, ty: 0, tr: 0, cab: 0, cabR: 0, mano: [[3, -9, 24], [3, 9, 24]], pie: [[0, -4.4, 0], [1, 4.4, 0]], caida: 0, atras: false });
interface Rig { S: number; A: number; raiz: Tr; pel: Tr; tor: Tr; cab: Tr; hom: V3[]; codo: V3[]; mun: V3[]; fa: V3[]; cad: V3[]; rod: V3[]; tob: V3[]; suelo: V3[] }
function rigB(b: Bip, p: PoseB): Rig {
  const S = b.S, A = b.A * S, L = b.brazo ?? 1;
  // la caída gira todo el cuerpo sobre un eje del piso (detrás de los talones o delante de las puntas)
  const piv = (p.atras ? -1 : 8) * S, ang = (p.atras ? -1 : 1) * 84 * suave(p.caida);
  const raiz = cmp(T([piv, 0, suave(p.caida) * (p.atras ? 3.6 : 5) * S]), cmp(T([0, 0, 0], Ry(ang)), T([-piv, 0, 0])));
  const pel = cmp(raiz, T([p.px * S, p.py * S, (31 - p.pz) * S], Rz(p.ty * 0.35), Ry(p.tp * 0.3), Rx(p.tr * 0.5)));
  const tor = cmp(pel, T([0, 0, 4 * S], Rz(p.ty * 0.65), Ry(p.tp * 0.7), Rx(p.tr)));
  const cab = cmp(tor, T([0.8 * S, 0, 20 * S], Ry(p.cab), Rx(p.cabR)));
  const r: Rig = { S, A, raiz, pel, tor, cab, hom: [], codo: [], mun: [], fa: [], cad: [], rod: [], tob: [], suelo: [] };
  for (const [i, s] of [[0, -1], [1, 1]] as [number, number][]) {
    const h = ap(tor, [-0.5 * S, s * 6.6 * A, 12.6 * S]);
    const t = ap(raiz, esc(p.mano[i], S));
    const [c, m] = ik(h, t, 11.5 * S * L, 12 * S * L, mv(tor.m, [-1, s * 0.6, -0.4]));
    r.hom.push(h); r.codo.push(c); r.mun.push(m); r.fa.push(nor(sub(m, c)));
    const cad = ap(pel, [0, s * 3.8 * A, -0.5 * S]);
    let suelo = ap(raiz, esc(p.pie[i], S));
    const tob = add(suelo, mv(cmp(raiz, T([0, 0, 0], Rz(p.ty * 0.2))).m, [-1.2 * S, 0, 3 * S]));
    const [rod, t2] = ik(cad, tob, 14.5 * S, 14 * S, mv(pel.m, [1, s * 0.1, 0]));
    if (len(sub(t2, tob)) > 0.3) suelo = add(suelo, sub(t2, tob));
    r.cad.push(cad); r.rod.push(rod); r.tob.push(t2); r.suelo.push(suelo);
  }
  return r;
}
/** La carne del bípedo como componentes de masa: tronco, brazos y piernas por separado (cada uno su masa). */
function carneB(r: Rig, mat: string, mus = 0.5, gra = 0, demacrado = false): { tronco: Comp[]; brazos: Comp[][]; piernas: Comp[][] } {
  const { S, A, pel, tor, cab } = r, m = { mat };
  const tronco: Comp[] = [
    bT(pel, [0, 0, 0.5 * S], [3.9 * A, 5.2 * A, 4.2 * S], m), bT(tor, [0.6 * S + gra * 2.2 * S, 0, 2.6 * S], [3.6 * A + gra * 3.4 * A, 4.6 * A + gra * 1.6 * A, 4.8 * S + gra * 1.2 * S], m),
    bT(tor, [0.2 * S, 0, 8.6 * S], [4.2 * A + gra * A, (demacrado ? 5.6 : 6.2) * A, 5.6 * S], m), bT(tor, [-1.6 * S, 0, 10.6 * S], [3.6 * A, 5.6 * A, 4.6 * S], m),
  ];
  tronco.push(hueso(ap(tor, [-0.3 * S, 0, 12.9 * S]), ap(cab, [0.2 * S, 0, -2.8 * S]), (2.1 + mus * 0.6) * S, 1.8 * S, m));
  for (const s of [1, -1]) {
    const i = s < 0 ? 0 : 1, h = r.hom[i];
    tronco.push(bT(pel, [-2.4 * A, s * 2.5 * A, -0.8 * S], [2.8 * A, 2.9 * A, 3.3 * S], m));
    if (!demacrado) tronco.push(bT(tor, [2.8 * A + gra * A, s * 2.7 * A, 9.6 * S], [(1.6 + mus * 0.9) * A, (2.6 + mus * 0.7) * A, (2.2 + mus * 0.6) * S], { mat, k: 1.6 * S }));
    tronco.push(hueso(ap(tor, [-0.8 * S, s * 1.4 * A, 15.4 * S]), ap(tor, [-0.4 * S, s * 5.8 * A, 13.2 * S]), (1.8 + mus * 0.8) * A, (1.5 + mus * 0.5) * A, m));
    tronco.push(bulto(add(h, nor(sub(r.codo[i], h)), 1.3 * S), [(3.0 + mus * 0.8) * A, (2.6 + mus * 0.6) * A, (2.6 + mus * 0.6) * A], { eje: sub(r.codo[i], h), mat }));
    if (demacrado) for (let k = 0; k < 5; k++) tronco.push(hueso(ap(tor, [-0.6 * S, s * (5.6 - Math.abs(k - 2) * 0.3) * A, (6 + k * 2) * S]), ap(tor, [3.6 * A, s * 1.3 * A, (4.6 + k * 2) * S]), 0.6 * S, 0.5 * S, { mat, k: 0.5 * S }));
  }
  const brazos: Comp[][] = [], piernas: Comp[][] = [];
  for (let i = 0; i < 2; i++) {
    const h = r.hom[i], c = r.codo[i], w = r.mun[i], ua = nor(sub(c, h)), fa = r.fa[i], f2 = demacrado ? 0.75 : 1;
    brazos.push([
      hueso(h, c, 2.4 * A * f2, 1.85 * A * f2, m), bulto(mez(h, c, 0.5), [(3.4 + mus) * S, (1.4 + mus) * A * f2, (1.4 + mus) * A * f2], { eje: ua, mat }),
      hueso(c, w, 1.95 * A * f2, 1.3 * A * f2, m), bulto(mez(c, w, 0.3), [3.2 * S, (1.6 + mus * 0.6) * A * f2, (1.5 + mus * 0.5) * A * f2], { eje: fa, mat }),
      bulto(add(w, fa, 1.4 * S), [2 * S, 1.2 * A, 1.7 * S], { eje: fa, mat }),
    ]);
    const cd = r.cad[i], rd = r.rod[i], tb = r.tob[i], sl = r.suelo[i], mu = nor(sub(rd, cd)), ca = nor(sub(tb, rd));
    const fw = nor(mv(pel.m, [1, 0, 0])), fwp: V3 = nor([fw[0], fw[1], 0]);
    piernas.push([
      hueso(cd, rd, (3.6 + gra) * A * f2, 2.4 * A * f2, m), bulto(mez(cd, rd, 0.45), [6.2 * S, (2.7 + mus * 0.6) * A * f2, (3 + mus * 0.6) * A * f2], { eje: mu, mat }),
      bulto(rd, [1.9 * A, 2.1 * A, 2.1 * A], m), hueso(rd, tb, 2.3 * A * f2, 1.4 * A * f2, m),
      bulto(add(mez(rd, tb, 0.3), fw, -0.6 * A), [4.4 * S, (2.1 + mus * 0.4) * A * f2, (2.2 + mus * 0.4) * A * f2], { eje: ca, mat }),
      hueso(add(sl, [fwp[0] * -1.2 * S, fwp[1] * -1.2 * S, 1.6 * S]), add(sl, [fwp[0] * 4.6 * S, fwp[1] * 4.6 * S, 1.1 * S]), 1.7 * A, 1.3 * A, m),
    ]);
  }
  return { tronco, brazos, piernas };
}
/** Tira de tela suelta (venda, jirón) que cuelga de `a` y flamea con el cuadro. */
function tira(a: V3, dir: V3, largo: number, ancho: number, f: number, sem: number, mat: string, viento: V3 = [0, 0, 0]): Pieza[] {
  const ps: Pieza[] = [];
  const n = Math.max(2, Math.round(largo / 4));
  let p = a;
  for (let i = 0; i < n; i++) {
    const t = (i + 1) / n, ond = Math.sin(f * 0.8 + i * 1.3 + sem) * 1.6 * t;
    const d = nor(add(add(dir, viento, t), [ond * 0.3, ond * 0.3, 0]));
    const q = add(p, d, largo / n);
    ps.push(elipE(mez(p, q, 0.5), sub(q, p), [largo / n * 0.62, ancho * (1 - t * 0.3), 0.35], mat, (hr(sem + i) - 0.5) * 0.1, cruz(d, [Math.sin(sem), Math.cos(sem), 0.2])));
    p = q;
  }
  return ps;
}
/** Tela en lámina: una grilla de puntos (filas de arriba abajo) hecha triángulos finos con grosor `e`. */
function lamina(g: V3[][], mat: string, e = 0.5, tono = 0): Pieza[] {
  const ps: Pieza[] = [];
  const tri = (p: V3, q: V3, r: V3, t: number) => { const n = nor(cruz(sub(q, p), sub(r, p))); if (!isFinite(n[0]) || len(cruz(sub(q, p), sub(r, p))) < 1e-3) return; ps.push(poliedro([add(p, n, e), add(q, n, e), add(r, n, e), add(p, n, -e), add(q, n, -e), add(r, n, -e)], { mat, tono: tono + t })); };
  for (let i = 0; i < g.length - 1; i++) for (let j = 0; j < g[i].length - 1; j++) {
    const t = (hr(i * 7 + j) - 0.5) * 0.08;
    tri(g[i][j], g[i + 1][j], g[i][j + 1], t); tri(g[i][j + 1], g[i + 1][j], g[i + 1][j + 1], t);
  }
  return ps;
}
/** Caminar genérico de bípedo pesado (en unidades de persona). */
function marcha(p: PoseB, ph: number, largo = 18, alto = 5) {
  for (const [i, s] of [[0, -1], [1, 1]] as [number, number][]) {
    const st = paso(ph + (i ? 0.5 : 0), largo, alto, 0.58);
    p.pie[i] = [st.x, s * 4.4, st.z];
    p.mano[i] = [3 - st.x * 0.45, s * 9, 24 + st.vuelo * 1.5];
  }
  p.py = Math.sin(ph * TAU) * 1.2; p.tr = Math.sin(ph * TAU) * 3; p.ty = Math.sin(ph * TAU) * 6; p.pz = 0.4 + Math.abs(Math.cos(ph * TAU * 2)) * 0.9; p.tp = 9;
}

// ================================================================== 3. KHAMER-UL, EL REY SIN SOMBRA
/**
 * Un rey momia de 120 de alto que no echa sombra: vendas viejas que se desenrollan y flamean, carne seca en los
 * huecos, máscara funeraria de oro con ojos de lapislázuli y una brasa verde en cada uno, una cresta de oro en
 * abanico detrás de la cabeza, un pectoral ancho con un escarabajo de gema, un cetro con llama verde y una niebla
 * venenosa que se arrastra a sus pies. El especial levanta una tormenta de arena que gira alrededor.
 */
function reySinSombra(acc: Acc, f: number): Res {
  const ph = f / CUADROS[acc], V = 'jf_venda_vieja', G = 'cu_oro', S = 2;
  /** Cuadro llevado a fase para que las vendas se mezan en un ciclo que cierra. */
  const fV = (f / CUADROS[acc]) * TAU / 0.8;
  const p = poseB();
  p.tp = 10; p.cab = 4; p.mano = [[5, -9, 26], [6, 9, 24]];
  let llamaV = 1, tormenta = 0, polvo = 0, alza = 0, rayo = 0, golpe = 0, garraK = 0.6;
  if (acc === 'quieto') {
    const b = Math.sin(ph * TAU); p.pz = 0.3 + b * 0.3; p.cab = 4 + b * 2; p.cabR = b * 4; p.mano = [[9, -14, 24 + b * 0.6], [10, 10.5, 20 - b * 0.6]]; llamaV = 1 + b * 0.2; garraK = 0.5 + 0.3 * b;
  } else if (acc === 'caminar') {
    marcha(p, ph, 16, 4); p.tp = 14; p.mano[0] = [10 - p.pie[0][0] * 0.2, -14, 24]; p.mano[1] = [10 - p.pie[1][0] * 0.35, 10.5, 19 + Math.sin(ph * TAU) * 1.2]; p.cab = 6;
  } else if (acc === 'atacar') {
    // alza el cetro con las dos manos y lo baja como un mazo
    p.ty = K([0, 10, 18, 20, -6, -12, -6, 0], f); p.tp = K([10, 2, -6, -8, 18, 24, 16, 10], f); p.pz = K([0, 0, 0, 0, 1.5, 2.5, 1.5, 0], f);
    const mz = K([26, 38, 48, 52, 32, 20, 22, 26], f), mx = K([5, 4, 0, -1, 12, 16, 10, 5], f);
    p.mano = [[mx, -4, mz], [mx - 1, 3, mz - 2]]; golpe = K([0, 0, 0, 0, 0.6, 1, 0.6, 0], f); p.cab = K([4, 0, -4, -4, 8, 10, 6, 4], f);
    p.pie[1] = [K([1, 1, 1, 1, 6, 7, 4, 1], f), 4.4, 0];
  } else if (acc === 'lanzar') {
    // levanta el cetro, la llama verde crece y la mano izquierda escupe un rayo de veneno
    alza = K([0, 0.4, 0.8, 1, 1, 0.8, 0.4, 0], f); rayo = K([0, 0, 0.2, 0.6, 1, 1, 0.5, 0], f); llamaV = 1 + alza * 1.2;
    p.mano = [[K([5, 6, 7, 8, 8, 8, 7, 5], f), -9, K([26, 34, 40, 42, 42, 40, 34, 26], f)], [K([6, 10, 14, 16, 17, 16, 12, 6], f), K([9, 7, 5, 4, 4, 4, 6, 9], f), K([24, 30, 34, 36, 36, 35, 30, 24], f)]];
    p.tp = K([10, 6, 2, 0, 4, 6, 8, 10], f); p.cab = K([4, 0, -4, -4, 0, 2, 4, 4], f);
  } else if (acc === 'herido') {
    const k = [0.6, 1, 0.7, 0.3][f % 4];
    p.tp = 10 - 18 * k; p.cab = 4 - 18 * k; p.px = -2 * k; p.ty = 8 * k; p.mano = [[5 - 5 * k, -10 - 2 * k, 26 + 5 * k], [6 - 6 * k, 10 + 3 * k, 24 + 6 * k]]; polvo = k;
  } else if (acc === 'morir') {
    // se arquea, alza los brazos y se deshace en arena: el cuerpo se hunde en el montón y la máscara queda encima
    polvo = K([0, 0.3, 0.6, 0.8, 1, 1, 0.8, 0.5], f); llamaV = K([1, 1.4, 0.8, 0.4, 0.1, 0, 0, 0], f);
    p.tp = K([10, -10, -14, -4, 8, 16, 20, 20], f); p.cab = K([4, -20, -26, -10, 10, 20, 24, 24], f); p.pz = K([0, 0, 2, 7, 13, 19, 25, 30], f);
    p.mano = [[K([5, 2, 0, 6, 10, 12, 12, 12], f), K([-9, -12, -13, -12, -11, -10, -10, -10], f), K([26, 44, 48, 36, 24, 16, 10, 6], f)], [K([6, 2, 0, 6, 10, 12, 12, 12], f), K([9, 12, 13, 12, 11, 10, 10, 10], f), K([24, 44, 48, 36, 24, 16, 10, 6], f)]];
  } else if (acc === 'especial') {
    // tormenta de arena: alza el cetro y la arena gira alrededor, cada vez más alta
    tormenta = K([0, 0.2, 0.5, 0.8, 1, 1, 0.7, 0.3], f); alza = K([0, 0.5, 1, 1, 1, 1, 0.6, 0.2], f); llamaV = 1 + alza * 0.8;
    p.mano = [[K([5, 6, 6, 6, 6, 6, 6, 5], f), -8, K([26, 40, 50, 52, 52, 52, 44, 30], f)], [K([6, 8, 9, 9, 9, 9, 8, 6], f), K([9, 13, 16, 17, 17, 17, 14, 10], f), K([24, 30, 36, 38, 38, 38, 32, 26], f)]];
    p.tp = K([10, 4, -4, -8, -8, -8, -2, 8], f); p.cab = K([4, -4, -12, -14, -14, -14, -8, 2], f);
  }
  // encorvado y amenazante: el torso se vence adelante, la cabeza se levanta para mirar de frente y las rodillas se
  // doblan (se va enderezando al alzar el cetro y al deshacerse en arena)
  const corva = acc === 'morir' ? 12 * (1 - K([0, 1, 1, 1, 1, 1, 1, 1], f)) : acc === 'especial' ? 12 * (1 - alza * 0.7) : 12;
  p.tp += corva; p.cab -= corva * 1.15; if (acc !== 'morir') p.pz += corva * 0.12;
  const r = rigB({ S, A: 1.14, brazo: 1.1 }, p);
  const { tor, pel } = r;
  const ps: Pieza[] = [];
  const hundido = clamp((p.pz - 6) / 24, 0, 1);
  // ---- cuerpo vendado con huecos de carne seca
  const c = carneB(r, V, 0.25, 0, true);
  const nBase = { tronco: c.tronco.length, brazo: c.brazos[0].length, pierna: c.piernas[0].length };
  // hombros anchos: joroba, trapecios gruesos y deltoides que sobresalen
  c.tronco.push(bT(tor, [-2.8 * S, 0, 12 * S], [3.6 * r.A, 6.2 * r.A, 4.2 * S], { mat: V }));
  for (let i = 0; i < 2; i++) {
    const s = i ? 1 : -1, h = r.hom[i];
    c.tronco.push(hueso(ap(tor, [-1 * S, s * 1.2 * r.A, 15 * S]), ap(tor, [-0.4 * S, s * 6.4 * r.A, 13.4 * S]), 2.9 * r.A, 2.4 * r.A, { mat: V }), bulto(add(h, [0, 0, 0.6 * S]), [3.6 * r.A, 3.1 * r.A, 3.1 * r.A], { mat: V }));
    // antebrazo y muslo más gruesos (la carne seca tensa bajo las vendas)
    const cd = r.cad[i], rd = r.rod[i], tb = r.tob[i];
    c.brazos[i].push(bulto(mez(r.codo[i], r.mun[i], 0.32), [3.4 * S, 1.9 * r.A, 1.8 * r.A], { eje: r.fa[i], mat: V }), bulto(mez(h, r.codo[i], 0.45), [3.4 * S, 2.1 * r.A, 2 * r.A], { eje: sub(r.codo[i], h), mat: V }));
    c.piernas[i].push(bulto(mez(cd, rd, 0.42), [6 * S, 3.2 * r.A, 3.4 * r.A], { eje: sub(rd, cd), mat: V }), bulto(add(mez(rd, tb, 0.32), mv(pel.m, [-1, 0, 0]), 0.5 * S), [4 * S, 2.2 * r.A, 2.3 * r.A], { eje: sub(tb, rd), mat: V }));
    // la mano en garra: cuatro dedos vendados, largos y curvos, que terminan en uñas negras
    const w = r.mun[i], fa = r.fa[i], lat = nor(sub(tor.m[1], esc(fa, pto(tor.m[1], fa)))), aba = nor(cruz(fa, lat));
    const cierra = i === 0 && acc !== 'lanzar' ? 0.9 : garraK + golpe * 0.3;
    for (let k = 0; k < 4; k++) {
      const o = (k - 1.5) * 0.85 * S, l1 = (3 - Math.abs(k - 1.5) * 0.35) * S;
      const b0 = add(add(w, fa, 2.6 * S), lat, o), d1 = nor(add(add(fa, aba, 0.35 + cierra * 0.3), lat, o * 0.06)), m1 = add(b0, d1, l1);
      const d2 = nor(add(d1, aba, 0.9 + cierra * 0.7)), m2 = add(m1, d2, l1 * 0.9), d3 = nor(add(d2, aba, 0.8 + cierra * 0.5));
      c.brazos[i].push(hueso(b0, m1, 0.62 * S, 0.5 * S, { mat: V, k: 0.4 * S }), hueso(m1, m2, 0.5 * S, 0.4 * S, { mat: V, k: 0.3 * S }), hueso(m2, add(m2, d3, 2.2 * S), 0.42 * S, 0.06, { mat: 'jf_una_negra', k: 0.15 * S }));
    }
    // el pulgar
    const pb = add(add(w, fa, 1.4 * S), lat, -s * 1.6 * S), pd = nor(add(add(fa, lat, -s * 0.7), aba, 0.6)), pm = add(pb, pd, 2.4 * S);
    c.brazos[i].push(hueso(pb, pm, 0.6 * S, 0.45 * S, { mat: V, k: 0.3 * S }), hueso(pm, add(pm, nor(add(pd, aba, 1.2)), 1.8 * S), 0.4 * S, 0.06, { mat: 'jf_una_negra', k: 0.15 * S }));
  }
  // los huecos de carne seca salen solo en las piezas de la carne base (no en el bulto ni en las garras agregadas)
  const parche = (cs: Comp[], cada: number, n = 999) => cs.map((q, i) => (i < n && i % cada === cada - 1 ? { ...q, mat: 'cu_piel_morena', tono: -0.05 } : q));
  ps.push(masa(parche(c.tronco, 4, nBase.tronco), { mat: V, suave: 1.6 * S }));
  c.brazos.forEach((b) => ps.push(masa(parche(b, 3, nBase.brazo), { mat: V, suave: 1.4 * S })));
  c.piernas.forEach((b) => ps.push(masa(parche(b, 4, nBase.pierna), { mat: V, suave: 1.4 * S })));
  // faldón de lino oscuro con cinturón de oro
  ps.push(masa([bT(pel, [0.5 * S, 0, -1 * S], [4.6 * r.A, 5.8 * r.A, 4 * S], { mat: 'cu_tela_negra' }), hT(pel, [0, 0, -2 * S], [1.5 * S, 0, -12 * S], 5.6 * r.A, 7 * r.A, { mat: 'cu_tela_negra' })], { mat: 'cu_tela_negra', suave: 2 }));
  ps.push(elipE(ap(pel, [0, 0, 2.6 * S]), pel.m[0], [4.6 * r.A, 5.9 * r.A, 1.1 * S], G, 0, pel.m[1]));
  ps.push(elipE(ap(pel, [4.6 * r.A, 0, -2 * S]), pel.m[2], [6 * S, 1.6 * S, 0.5 * S], G, 0, pel.m[1]), elipE(ap(pel, [4.7 * r.A, 0, -2 * S]), pel.m[2], [5 * S, 0.7 * S, 0.6 * S], 'jf_lapis', 0, pel.m[1]));
  // pectoral ancho de oro y lapislázuli con el escarabajo
  for (let k = 0; k < 3; k++) {
    const rr = 1 - k * 0.18;
    ps.push(elipE(ap(tor, [1.6 * S - k * 0.2 * S, 0, (14 - k * 1.3) * S]), mv(tor.m, [0.4, 0, 1]), [0.35 * S, 7.2 * r.A * rr, 4.4 * S * rr], k % 2 ? 'jf_lapis' : G, 0, tor.m[1]));
  }
  const esc0 = ap(tor, [4.6 * r.A, 0, 10.5 * S]);
  ps.push(elipE(esc0, tor.m[0], [1.3 * S, 2 * S, 2.4 * S], G, 0.05, tor.m[1]), elipE(add(esc0, mv(tor.m, [0.8, 0, 0.2]), S), tor.m[0], [0.9 * S, 1.3 * S, 1.6 * S], 'cu_ojo_verde', -0.1, tor.m[1]));
  for (const s of [1, -1]) ps.push(elipE(add(esc0, mv(tor.m, [0.2, s * 2.6, 0.6]), S), mv(tor.m, [0, s, 0.4]), [2.6 * S, 0.8 * S, 1.5 * S], G, -0.05, tor.m[0]));
  // brazaletes de oro y vendas que se desenrollan
  for (let i = 0; i < 2; i++) {
    ps.push(elipE(mez(r.codo[i], r.mun[i], 0.75), r.fa[i], [1.8 * S, 1.75 * r.A, 1.75 * r.A], G, 0, [0, 0, 1]));
    // vendas sueltas que cuelgan y se mecen: de los antebrazos, los brazos, las muñecas, los muslos y las rodillas
    ps.push(...tira(mez(r.codo[i], r.mun[i], 0.4), [0, 0, -1], 20 + i * 6, 1.4 * S, fV, 3 + i, V, [-0.6, 0, 0]));
    ps.push(...tira(mez(r.codo[i], r.mun[i], 0.8), [0.2, 0, -1], 14 + i * 4, 1.1 * S, fV, 5.5 + i, V, [-0.4, 0.3, 0]));
    ps.push(...tira(mez(r.hom[i], r.codo[i], 0.6), [0, 0, -1], 16, 1.2 * S, fV, 7 + i, V, [-0.5, 0.2, 0]));
    ps.push(...tira(mez(r.rod[i], r.tob[i], 0.2), [0, 0, -1], 14, 1.2 * S, fV, 11 + i, V, [-0.8, 0, 0]));
    ps.push(...tira(mez(r.cad[i], r.rod[i], 0.5), [-0.2, 0, -1], 20, 1.3 * S, fV, 13 + i, V, [-0.7, 0.2, 0]));
  }
  ps.push(...tira(ap(pel, [-3 * S, 2 * S, 1 * S]), [-0.3, 0, -1], 38, 1.6 * S, fV, 21, V, [-1.2, 0, 0.2]));
  ps.push(...tira(ap(pel, [-2 * S, -3 * S, 0.5 * S]), [-0.2, -0.2, -1], 32, 1.4 * S, fV, 22, V, [-1, -0.2, 0.2]));
  ps.push(...tira(ap(tor, [-3 * S, -3 * S, 12 * S]), [-0.4, 0, -1], 34, 1.4 * S, fV, 23, V, [-1, 0.2, 0.1]));
  ps.push(...tira(ap(tor, [-3.4 * S, 2.6 * S, 13 * S]), [-0.5, 0.2, -1], 28, 1.2 * S, fV, 24, V, [-1.1, -0.1, 0.2]));
  for (let k = 0; k < 4; k++) ps.push(...tira(ap(pel, [(2.8 - k * 0.4) * S, (k - 1.5) * 2.6 * S, -2.6 * S]), [0.15, 0, -1], 12 + hr(k + 50) * 10, 1.1 * S, fV, 26 + k, V, [-0.6, 0, 0]));
  // ---- la cabeza: cráneo vendado, máscara de oro, barba trenzada y una cresta de rayos de oro detrás
  const cab = r.cab, SH = S * 1.18, C = (q: V3) => ap(cab, esc(q, SH)), bc = (q: V3, rr: V3, mt: string, t = 0) => bulto(C(q), esc(rr, SH), { ejes: ejesDe(cab), mat: mt, tono: t });
  ps.push(masa([bc([-0.4, 0, 0.8], [4, 3.6, 4.4], V), bc([1.4, 0, -2], [2.8, 2.8, 2.4], V)], { mat: V, suave: S }));
  ps.push(masa([bc([2.5, 0, 0.4], [2.2, 3.4, 4.2], G), bc([3.9, 0, 1.6], [0.8, 3, 0.7], G, 0.05), bc([4.3, 0, -0.4], [1.2, 0.9, 2], G, 0.1), bc([3.7, 0, -2.6], [1, 2, 0.6], G)], { mat: G, suave: 0.6 * S }));
  for (const s of [1, -1]) {
    ps.push(elipE(C([4.15, s * 1.45, 0.7]), mv(cab.m, [1, s * 0.4, 0]), [0.4 * S, 1.2 * S, 0.55 * S], 'jf_lapis', 0, mv(cab.m, [0, s, 0.12])));
    // ojos verdes que arden detrás de la máscara: un halo de niebla y el centro casi blanco
    if (hundido > 0.6) ps.push(esfera(...C([4.45, s * 1.45, 0.7]), 0.42 * S, { mat: 'negro' }));
    else ps.push(elipE(C([4.4, s * 1.45, 0.7]), mv(cab.m, [1, s * 0.4, 0]), [0.45 * S, 0.95 * S, 0.5 * S], 'jf_niebla', 0.1, mv(cab.m, [0, s, 0.12])), esfera(...C([4.62, s * 1.45, 0.72]), 0.4 * S, { mat: 'cu_ojo_verde', tono: 0.35 }));
    ps.push(palo(C([4.2, s * 2.6, 0.5]), C([3.6, s * 3.4, 0.2]), 0.25 * S, { mat: 'jf_lapis' }));
  }
  // barba de oro trenzada
  for (let k = 0; k < 4; k++) ps.push(elipE(C([3.6, 0, -3.6 - k * 1.1]), mv(cab.m, [0.15, 0, -1]), [0.6 * S, 0.7 * S, 0.6 * S], k % 2 ? 'jf_lapis' : G));
  // tocado: paños a rayas que caen sobre los hombros y la cresta en abanico
  for (const s of [1, -1]) for (let k = 0; k < 4; k++) {
    const a0 = C([0.6 - k * 0.4, s * 3.8, 2 - k * 2.4]), a1 = C([0.6 - (k + 1) * 0.4, s * (4.2 + k * 0.2), 2 - (k + 1) * 2.4]);
    ps.push(elipE(mez(a0, a1, 0.5), sub(a1, a0), [len(sub(a1, a0)) * 0.55, 1.9 * S, 0.7 * S], k % 2 ? 'jf_lapis' : G, 0, cab.m[0]));
  }
  ps.push(masa([bc([-0.6, 0, 2.4], [4.4, 4.2, 3], G), bc([-1.6, 0, 0], [3.6, 4.4, 3.6], 'jf_lapis')], { mat: G, suave: 0.6 * S }));
  // corona alta de oro con anillo de lapislázuli, gema verde y rayos finos detrás como una corona de espinas
  const cz = cab.m[2], c0 = C([-0.8, 0, 4.2]);
  ps.push(cilindro(...c0, 3.1 * S, 7 * S, { mat: G, r1: 1.3 * S, eje: cz }), cilindro(...add(c0, cz, 1.2 * S), 3.12 * S, 1.1 * S, { mat: 'jf_lapis', r1: 2.92 * S, eje: cz }));
  ps.push(esfera(...add(c0, cz, 7.2 * S), 1.1 * S, { mat: G }), esfera(...C([1.5, 0, 6.6]), 0.75 * S, { mat: 'cu_ojo_verde' }));
  for (let k = 0; k < 9; k++) {
    const a = rad(-72 + k * 18), b0 = C([-2.6, Math.sin(a) * 2.6, 6 + Math.cos(a) * 1.4]), tip = C([-3.6, Math.sin(a) * 9.5, 6 + Math.cos(a) * 7.5]);
    ps.push(palo(b0, tip, 0.42 * S, { mat: k % 2 ? 'jf_lapis' : G, r1: 0.05 }));
  }
  // hombreras de oro como élitros de escarabajo y un manto real rasgado que cae a la espalda
  for (let i = 0; i < 2; i++) {
    const s = i ? 1 : -1, h = r.hom[i], ua = nor(sub(r.codo[i], h));
    ps.push(elipE(add(add(h, [0, 0, 1.4 * S]), ua, 1 * S), mv(tor.m, [0, s, -0.5]), [3.4 * S, 2.6 * S, 1.2 * S], G, 0, tor.m[0]));
    ps.push(elipE(add(add(h, [0, 0, 1.6 * S]), ua, 1.6 * S), mv(tor.m, [0, s, -0.5]), [2.6 * S, 1.7 * S, 1.25 * S], 'jf_lapis', 0, tor.m[0]));
  }
  {
    const lag = acc === 'caminar' ? 8 : acc === 'especial' ? 16 * tormenta : 2;
    const ondea = Math.sin(ph * TAU) * 2;
    // el manto: cinco columnas de los hombros al piso con pliegues, la de afuera más corta, el ruedo hecho jirones
    if (hundido < 0.4) {
      const g: V3[][] = [];
      for (let i = 0; i <= 4; i++) {
        const t = i / 4, fila: V3[] = [];
        for (let j = 0; j <= 4; j++) {
          const u = j / 4 * 2 - 1, pl = Math.sin(j * 2.2 + t * 2) * 1.6 * t;
          const arriba = ap(tor, [-3.4 * S, u * 6.4 * r.A, 13.4 * S - Math.abs(u) * 1.6 * S]);
          const abajo = ap(r.raiz, [-11 * S - lag + p.px * S - Math.abs(u) * 2, u * 11 * r.A + ondea * t, 1.2 + Math.abs(u) * 2]);
          const q = mez(arriba, abajo, t);
          fila.push(add(q, [-Math.sin(t * Math.PI) * 4 + pl, 0, 0]));
        }
        g.push(fila);
      }
      ps.push(...lamina(g, 'cu_tela_azul', 0.6, -0.12));
      for (let k = 0; k < 4; k++) { const b0 = mez(g[4][k], g[4][k + 1], 0.5); ps.push(poliedro([add(g[4][k], [0, 0, 0.6]), add(g[4][k + 1], [0, 0, 0.6]), add(b0, [-3, 0, 2]), add(b0, [-3 - hr(k) * 5, (hr(k + 1) - 0.5) * 3, -0.6])], { mat: 'cu_tela_azul', tono: -0.18 })); }
      ps.push(...[0, 1].map((i) => esfera(...ap(tor, [-2.4 * S, (i ? 1 : -1) * 6.2 * r.A, 13.6 * S]), 1.3 * S, { mat: G })));
    }
  }
  // ---- el cetro: vara de oro con anillos de lapislázuli, garra de tres dedos en la punta y llama verde
  {
    const mu = r.mun[0], fa = r.fa[0];
    let eje: V3 = acc === 'atacar' ? nor(add(fa, [0, 0, 0.3])) : nor(add([0, 0, 1], esc(fa, 0.15)));
    if (acc === 'atacar') eje = nor(add(sub(r.mun[0], r.hom[0]), [0, 0, 0.2]));
    if (hundido > 0.2) eje = nor([0.9, -0.3, 0.12 + (1 - hundido) * 0.5]);
    const base0 = hundido > 0.2 ? ap(T([0, 0, 0]), [10 * S, -6 * S, 1]) : add(mu, eje, -14);
    const top = add(base0, eje, 56);
    ps.push(palo(base0, top, 1.3, { mat: G, r1: 1.1 }));
    for (let k = 0; k < 5; k++) ps.push(cilindro(...add(base0, eje, 8 + k * 10), 1.6, 2, { mat: 'jf_lapis', eje }));
    const lat = nor(cruz(eje, [0.3, 0.7, 0.1]));
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * TAU, d = add(esc(lat, Math.cos(a)), cruz(eje, lat), Math.sin(a));
      const m1 = add(add(top, d, 3.4), eje, 3), m2 = add(add(top, d, 1.6), eje, 8);
      ps.push(palo(top, m1, 1, { mat: G, r1: 0.8 }), palo(m1, m2, 0.8, { mat: G, r1: 0.1 }));
    }
    const fl = add(top, eje, 4);
    if (llamaV > 0.05) {
      ps.push(esfera(...fl, 2.4 * Math.min(1, llamaV), { mat: 'luz_vela', tono: -0.1 }));
      for (let k = 0; k < 4; k++) ps.push(...llama(add(fl, [Math.cos(k * 1.7) * 1.6, Math.sin(k * 1.7) * 1.6, 0]), (7 + k * 1.5) * llamaV, 1.8 * Math.min(1.4, llamaV), f, 40 + k, 'fuego_verde'));
    }
    if (golpe > 0.5) { const g: V3 = [top[0], top[1], 0.4]; for (let k = 0; k < 8; k++) ps.push(...llama(add(g, [Math.cos(k) * 9, Math.sin(k) * 9, 0]), 14 * golpe, 3, f, 60 + k, 'fuego_verde')); ps.push(...brasas(g, 14, 26, 8, f, 70, 'jf_niebla', 0.9)); }
    if (rayo > 0.1) {
      // el rayo de veneno sale de la mano izquierda: una culebra de luz verde que se retuerce adelante
      const m2 = r.mun[1], dir = nor(mv(T([0, 0, 0], Rz(p.ty)).m, [1, 0, -0.05]));
      let prev = add(m2, r.fa[1], 3);
      for (let k = 1; k <= 10; k++) {
        const q = add(add(m2, dir, k * 9 * rayo), [0, Math.sin(k * 1.4 + f) * 3, Math.cos(k * 1.1 + f) * 2.4]);
        ps.push(palo(prev, q, 1.4 * (1 - k / 14), { mat: 'fuego_verde' }));
        if (k % 3 === 0) ps.push(esfera(...q, 2, { mat: 'jf_niebla' }));
        prev = q;
      }
    }
  }
  // ---- niebla venenosa a ras del piso: bocanadas chicas que se arrastran, y hebras que salen de los ojos
  for (let k = 0; k < 22; k++) {
    const u = ((f / CUADROS[acc]) + hr(k + 40)) % 1, a = k * 2.39 + u * 0.9, rr = 8 + hr(k) * 30;
    const c0: V3 = [Math.cos(a) * rr + p.px * S, Math.sin(a) * rr, 1 + hr(k + 3) * 5 + u * 9];
    const w = (1.6 + hr(k + 1) * 2.6) * (1 - u * 0.4);
    ps.push(elipsoide(...c0, w * 1.5, w, w * 0.8, { mat: k % 5 ? 'jf_niebla_densa' : 'jf_niebla', tono: -0.25 - u * 0.25 - hr(k + 5) * 0.15, giro: a * 57 }));
  }
  if (hundido < 0.5) for (const s of [1, -1]) for (let k = 0; k < 3; k++) {
    const u = ((f / CUADROS[acc]) + k / 3) % 1, o0 = C([4.6, s * 1.45, 0.7]);
    ps.push(esfera(o0[0] - u * 8, o0[1] + s * u * 2, o0[2] + u * 5, 0.6 + u * 1.2, { mat: 'jf_niebla', tono: -0.1 - u * 0.3 }));
  }
  // ---- tormenta de arena (especial) y polvo al deshacerse (morir)
  if (tormenta > 0.05) {
    // un embudo de arena: bandas en espiral (angostas abajo, anchas arriba) con huecos, polvo oscuro y piedras
    for (let k = 0; k < 150; k++) {
      const v = k / 150, banda = k % 3, an = v * TAU * 6 + banda * 2.1 + f * 0.85, h = (4 + v * 150) * tormenta, rr = (20 + Math.pow(v, 0.8) * 62 + hr(k) * 8) * (0.55 + 0.45 * tormenta);
      if (hr(k * 7 + 3) < 0.18) continue;
      const c0: V3 = [Math.cos(an) * rr, Math.sin(an) * rr, h];
      const tg: V3 = [-Math.sin(an), Math.cos(an), 0.2];
      ps.push(elipE(c0, tg, [9 + hr(k + 4) * 10, 0.9 + hr(k + 5) * 0.8, 0.9], banda === 1 ? 'tierra' : 'arena', -0.05 - hr(k + 9) * 0.22 + (banda === 2 ? 0.12 : 0), [0, 0, 1]));
      if (k % 2 === 0) ps.push(esfera(c0[0] + tg[0] * 12, c0[1] + tg[1] * 12, c0[2], 0.9, { mat: 'arena', tono: 0.1 }));
      if (k % 9 === 0) ps.push(esfera(c0[0] * 0.92, c0[1] * 0.92, c0[2] + 3, 1.4 + hr(k) * 1.4, { mat: 'roca' }));
    }
    for (let k = 0; k < 14; k++) { const an = k * 0.45 + f * 0.9; ps.push(elipE([Math.cos(an) * 24, Math.sin(an) * 24, 2], [-Math.sin(an), Math.cos(an), 0], [11, 4, 2], k % 2 ? 'arena' : 'tierra', -0.15, [0, 0, 1])); }
  }
  if (polvo > 0.05) {
    for (let k = 0; k < 24; k++) { const u = ((f / 8) + hr(k)) % 1, an = hr(k + 1) * TAU; ps.push(esfera(Math.cos(an) * (8 + u * 30) + p.px * S, Math.sin(an) * (8 + u * 30), 30 + hr(k + 2) * 70 - u * 30, (1 + hr(k + 3) * 1.6) * polvo, { mat: 'arena' })); }
  }
  if (acc === 'morir' && f >= 2) {
    // el montón de arena que crece y se traga el cuerpo; la máscara rueda encima al final
    const g = clamp((f - 2) / 5, 0, 1);
    ps.push(masa([bulto([p.px * S + 4, 0, 0], [30 * g + 6, 28 * g + 6, 26 * g + 2], { mat: 'arena' }), bulto([p.px * S - 10, 10, 0], [16 * g + 2, 14 * g + 2, 12 * g + 1], { mat: 'arena' }), bulto([p.px * S + 18, -12, 0], [12 * g + 2, 12 * g + 2, 8 * g + 1], { mat: 'arena' })], { mat: 'arena', suave: 6 }));
    if (f === 7) {
      ps.length = 0;
      // el montón de arena con ondas, la máscara apoyada mirando al cielo, el cetro y las vendas sueltas
      ps.push(masa([bulto([2, 0, 0], [30, 28, 16], { mat: 'arena' }), bulto([-12, 12, 0], [18, 16, 11], { mat: 'arena' }), bulto([20, -14, 0], [14, 14, 7], { mat: 'arena' }), bulto([-6, -20, 0], [12, 10, 6], { mat: 'arena' }), bulto([0, 2, 10], [14, 13, 10], { mat: 'arena' })], { mat: 'arena', suave: 6 }));
      for (let k = 0; k < 5; k++) { const a = k * 1.3; ps.push(elipE([Math.cos(a) * 24, Math.sin(a) * 22, 4 + (k % 2) * 3], [-Math.sin(a), Math.cos(a), 0], [12, 2, 1.2], 'arena', -0.15, [0, 0, 1])); }
      const mt: Tr = T([20, 4, 11], Rz(20), Ry(-55)), MS = S * 1.25;
      ps.push(masa([bT(mt, [0, 0, 0], esc([2.2, 3.4, 4.2], MS), { mat: G }), bT(mt, [1.4 * MS, 0, 1.2 * MS], esc([0.8, 3, 0.7], MS), { mat: G }), bT(mt, [1.8 * MS, 0, -0.8 * MS], esc([1.2, 0.9, 2], MS), { mat: G })], { mat: G, suave: 0.6 * MS }));
      for (const s of [1, -1]) { ps.push(elipE(ap(mt, esc([1.75, s * 1.45, 0.3], MS)), mt.m[0], [0.4 * MS, 1.2 * MS, 0.55 * MS], 'jf_lapis', 0, mv(mt.m, [0, 1, 0]))); ps.push(esfera(...ap(mt, esc([2, s * 1.45, 0.3], MS)), 0.4 * MS, { mat: 'negro' })); }
      for (let k = 0; k < 4; k++) ps.push(elipE(ap(mt, esc([1.2, 0, -4 - k * 1.1], MS)), mt.m[2], [0.6 * MS, 0.7 * MS, 0.6 * MS], k % 2 ? 'jf_lapis' : G));
      ps.push(palo([-34, -22, 2], [26, -40, 3], 1.3, { mat: G }), cilindro(-14, -28, 2.3, 1.6, 2, { mat: 'jf_lapis', eje: [1, -0.3, 0] }), cilindro(4, -34, 2.6, 1.6, 2, { mat: 'jf_lapis', eje: [1, -0.3, 0] }));
      for (let k = 0; k < 6; k++) ps.push(...tira([-14 + k * 7, 18 - k * 7, 8 + (k % 3) * 3], [Math.cos(k * 1.7), Math.sin(k * 1.7), -0.25], 18, 2.4, 0, 31 + k, V, [0, 0, -0.35]));
      for (let k = 0; k < 10; k++) { const a = k * 0.7; ps.push(elipsoide(Math.cos(a) * 34, Math.sin(a) * 30, 2, 6, 5, 2, { mat: 'jf_niebla_densa', tono: -0.35 - hr(k) * 0.2 })); }
    }
  }
  const brillo = llamaV > 0.1 ? { c: add(r.mun[0], [0, 0, 46]), r: 10 + llamaV * 4, color: '#60e040' } : undefined;
  return { piezas: ps, resplandor: brillo, sinSombra: true };
}
jefe('rey_sin_sombra', ['Khamer-Ul, el Rey sin Sombra', 'Khamer-Ul, the Shadowless King'], 120, 3, ['tormenta de arena', 'sandstorm'], reySinSombra);

// ================================================================== 4. MADRE CIÉNAGA
/** Gira `v` alrededor del eje `k` (unitario) `g` grados. */
function rotar(v: V3, k: V3, g: number): V3 { const a = rad(g), c = Math.cos(a), s = Math.sin(a); return add(add(esc(v, c), cruz(k, v), s), k, pto(k, v) * (1 - c)); }
/** Tentáculo o enredadera: puntos desde `base` hacia `dir`, que se curva `curva(t)` grados hacia arriba y `lado(t)` de costado. */
function tentaculo(base: V3, dir: V3, L: number, n: number, curva: (t: number) => number, lado: (t: number) => number): V3[] {
  const pts = [base];
  let d = nor(dir), p = base;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, side = nor(cruz(d, [0, 0, 1]));
    d = nor(rotar(rotar(d, len(side) > 0.1 ? side : [1, 0, 0], -curva(t)), [0, 0, 1], lado(t)));
    p = add(p, d, L / n); pts.push(p);
  }
  return pts;
}
/**
 * La madre del pantano: 140 de alto, echada sobre un montículo de barro y raíces del que no se separa. Un vientre
 * de sapo hinchado con verrugas y ojos que se abren en la piel, un torso de vieja encorvado con el pelo como
 * algas, una boca de rana que le parte la cara de lado a lado, ojos verdes saltones, dos brazos flacos con garras
 * y seis enredaderas con espinas que se retuercen. El especial infla el buche y eructa una nube de veneno.
 */
function madreCienaga(acc: Acc, f: number): Res {
  const ph = f / CUADROS[acc], P = 'jf_piel_sapo', m = { mat: P };
  let px = 0, hincha = 0, boca = 0.25, tp = 18, cab = 6, ty = 0, latigo = 0, escupe = 0, nube = 0, muerte = 0, sacude = 0, avance = 0;
  const b = Math.sin(ph * TAU);
  // las manos flacas [derecha, izquierda] en el marco del jefe
  const mano: V3[] = [[46, -30, 52], [44, 30, 54]];
  if (acc === 'quieto') { hincha = 0.1 + b * 0.08; boca = 0.25 + b * 0.08; cab = 6 + b * 2; mano[0][2] += b * 2; mano[1][2] -= b * 2; }
  else if (acc === 'caminar') { avance = ph; px = Math.sin(ph * TAU) * 3; hincha = 0.1 + Math.abs(b) * 0.06; tp = 22; ty = b * 5; mano[0] = [50, -30, 30 + Math.max(0, b) * 14]; mano[1] = [50, 30, 30 + Math.max(0, -b) * 14]; }
  else if (acc === 'atacar') {
    // las enredaderas de adelante se echan atrás y azotan; las garras rastrillan
    latigo = K([0, -0.4, -0.8, -1, 0.6, 1, 0.6, 0.1], f); tp = K([18, 12, 6, 4, 30, 34, 26, 18], f); boca = K([0.25, 0.4, 0.7, 0.8, 1, 0.8, 0.5, 0.3], f); ty = K([0, 6, 10, 10, -6, -10, -4, 0], f);
    mano[0] = [K([46, 36, 30, 30, 70, 74, 60, 46], f), K([-30, -36, -40, -40, -20, -10, -24, -30], f), K([52, 70, 84, 88, 40, 26, 36, 52], f)];
    mano[1] = [K([44, 36, 30, 30, 66, 72, 58, 44], f), K([30, 36, 40, 40, 22, 12, 24, 30], f), K([54, 72, 86, 90, 42, 28, 38, 54], f)];
  } else if (acc === 'lanzar') {
    // echa la cabeza atrás y escupe una bola de veneno
    escupe = K([0, 0, 0, 0.3, 0.6, 1, 1.6, 2.2], f); boca = K([0.25, 0.6, 0.9, 1, 1, 0.7, 0.4, 0.3], f); cab = K([6, -10, -20, -6, 20, 24, 14, 6], f); tp = K([18, 12, 8, 14, 30, 30, 24, 18], f); hincha = K([0.1, 0.25, 0.35, 0.3, 0.1, 0.05, 0.05, 0.1], f);
  } else if (acc === 'herido') {
    const k = [0.6, 1, 0.7, 0.3][f % 4]; tp = 18 - 18 * k; cab = 6 - 20 * k; boca = 0.25 + 0.6 * k; sacude = k; px = -4 * k;
  } else if (acc === 'morir') {
    // chilla, se desinfla, las enredaderas caen y se hunde en el barro
    muerte = K([0, 0.1, 0.25, 0.45, 0.65, 0.8, 0.92, 1], f); boca = K([0.3, 1, 1, 0.8, 0.6, 0.5, 0.45, 0.45], f); cab = K([6, -24, -20, 10, 26, 34, 38, 40], f); tp = K([18, 4, 8, 24, 36, 44, 48, 50], f);
    hincha = K([0.1, 0.3, 0.1, -0.15, -0.35, -0.5, -0.6, -0.65], f);
    mano[0] = [K([46, 40, 46, 56, 62, 64, 66, 66], f), -34, K([52, 80, 60, 36, 18, 10, 6, 5], f)]; mano[1] = [K([44, 40, 46, 56, 62, 64, 66, 66], f), 34, K([54, 82, 62, 38, 20, 10, 6, 5], f)];
  } else if (acc === 'especial') {
    // se infla el buche, abre la boca de rana y suelta una nube de veneno que rueda adelante
    hincha = K([0.1, 0.4, 0.7, 0.8, 0.3, 0.1, 0.05, 0.1], f); boca = K([0.25, 0.2, 0.3, 0.9, 1, 1, 0.8, 0.4], f); nube = K([0, 0, 0, 0.15, 0.4, 0.65, 0.85, 1], f);
    cab = K([6, -6, -12, 0, 14, 16, 12, 8], f); tp = K([18, 10, 6, 20, 32, 32, 26, 20], f);
    mano[0] = [K([46, 40, 36, 44, 52, 52, 50, 46], f), K([-30, -40, -46, -44, -40, -38, -34, -30], f), K([52, 64, 72, 66, 56, 54, 54, 52], f)]; mano[1] = [mano[0][0], -mano[0][1], mano[0][2] + 2];
  }
  const ps: Pieza[] = [];
  const hund = muerte * 26, sv = 1 + hincha + sacude * 0.05 * Math.sin(f * 3);
  // ---- el montículo de barro, las raíces que salen al piso y burbujas
  ps.push(elipsoide(0, 0, 0, 74, 68, 0.8, { mat: 'agua_sucia' }));
  ps.push(masa([bulto([0, 0, 0], [52, 48, 18], { mat: 'jf_barro' }), bulto([-14, 12, 4], [30, 26, 16], { mat: 'jf_barro' }), bulto([16, -10, 2], [26, 24, 12], { mat: 'jf_barro' }), bulto([-6, -20, 10], [16, 14, 10], { mat: 'musgo' }), bulto([8, 22, 8], [14, 12, 8], { mat: 'musgo' })], { mat: 'jf_barro', suave: 8 }));
  for (let k = 0; k < 7; k++) {
    // raíces gruesas y nudosas que se clavan en el piso (al andar se levantan y se vuelven a clavar)
    const a = (k / 7) * TAU + 0.3, ond = acc === 'caminar' ? Math.max(0, Math.sin(avance * TAU * 2 + k * 1.3)) * 22 : 0;
    const pts = tentaculo([Math.cos(a) * 30, Math.sin(a) * 28, 12], [Math.cos(a), Math.sin(a), 0.1], 34 + hr(k) * 18, 5, (t) => (t < 0.5 ? 10 + ond * 0.5 : -26 - ond * 0.3), (t) => Math.sin(t * 4 + k) * 14);
    const hs = pts.slice(1).map((q, i) => hueso(pts[i], [q[0], q[1], Math.max(-1, q[2])], 5.4 - i * 0.9, 4.6 - i * 0.9, { mat: 'corteza' }));
    hs.push(bulto(pts[2], [4.6, 4.6, 4.6], { mat: 'corteza' }));
    ps.push(masa(hs, { mat: 'corteza', suave: 1.5 }));
  }
  for (let k = 0; k < 6; k++) { const u = ((f / CUADROS[acc]) + hr(k)) % 1, a = hr(k + 1) * TAU, rr = 20 + hr(k + 2) * 26; ps.push(esfera(Math.cos(a) * rr, Math.sin(a) * rr, 10 + u * 4, 1.6 + u * 2.4, { mat: 'baba', tono: 0.1 })); }
  // ---- el vientre de sapo hinchado (sobre el montículo)
  const vien: Tr = T([px + 4, 0, 52 - hund], Rz(ty * 0.5), Ry(tp * 0.3));
  const R: V3 = [27 * sv, 31 * sv, 30 * (1 + hincha * 0.6)];
  ps.push(masa([
    bT(vien, [0, 0, 0], R, m), bT(vien, [12 * sv, 0, -10], [16 * sv, 22 * sv, 18], { mat: 'jf_vientre_sapo' }), bT(vien, [-6, 0, -26 + hund * 0.4], [32, 34, 12], m),
    bT(vien, [8, 0, 26], [16, 22, 12], m), bT(vien, [-10, 14, 10], [16, 14, 16], m), bT(vien, [-8, -16, -6], [14, 14, 14], m), bT(vien, [16 * sv, 0, -18], [12 * sv, 20 * sv, 8], { mat: 'jf_vientre_sapo' }),
  ], { mat: P, suave: 6 }));
  for (let k = 0; k < 6; k++) { const a = rad(-140 + k * 56), q = ap(vien, [Math.cos(a) * R[0] * 0.8, Math.sin(a) * R[1] * 0.8, R[2] * 0.55]); ps.push(...tira(q, [Math.cos(a) * 0.4, Math.sin(a) * 0.4, -1], 20 + hr(k) * 14, 3.2, f, 80 + k, 'musgo')); }
  // verrugas y ojos que se abren en la piel del vientre
  for (let k = 0; k < 16; k++) {
    const u = hr(k * 3) * TAU, v = (hr(k * 3 + 1) - 0.3) * 1.4, q: V3 = [Math.cos(v) * Math.cos(u) * R[0], Math.cos(v) * Math.sin(u) * R[1], Math.sin(v) * R[2]];
    ps.push(esfera(...ap(vien, q), 1.6 + hr(k) * 2, { mat: k % 3 ? P : 'jf_vientre_sapo', tono: 0.06 }));
  }
  for (let k = 0; k < 5; k++) {
    const u = (hr(k + 50) - 0.5) * 2.4, v = (hr(k + 60) - 0.5) * 1, q: V3 = [Math.cos(v) * Math.cos(u) * R[0], Math.cos(v) * Math.sin(u) * R[1], Math.sin(v) * R[2]];
    const n0 = nor([q[0] / (R[0] * R[0]), q[1] / (R[1] * R[1]), q[2] / (R[2] * R[2])]), c = ap(vien, q);
    ps.push(elipE(c, mv(vien.m, n0), [1.6, 3.2, 2.2], P, 0.05), elipE(add(c, mv(vien.m, n0), 0.9), mv(vien.m, n0), [0.9, 2.2, 1.2], muerte > 0.7 ? 'cu_ojo' : 'cu_ojo_verde', 0));
  }
  // ---- torso de vieja encorvado que sale de arriba del vientre, pelo de algas, boca de rana, ojos saltones
  const tor = cmp(vien, T([8, 0, 24], Ry(tp), Rz(ty * 0.5)));
  const cabT = cmp(tor, T([12, 0, 40], Ry(cab - tp * 0.7)));
  const H = (q: V3) => ap(cabT, q);
  ps.push(masa([bT(tor, [0, 0, 8], [9, 14, 12], m), bT(tor, [1, 0, 24], [9, 15, 11], m), hT(tor, [4, 0, 30], [10, 0, 38], 6, 5, m), bT(tor, [-5, 0, 30], [10, 14, 9], m), hT(tor, [-4, 0, 6], [-4, 0, 30], 6, 5, m)], { mat: P, suave: 4 }));
  for (let k = 0; k < 4; k++) for (const s of [1, -1]) ps.push(palo(ap(tor, [6, s * 13, 16 + k * 3.6]), ap(tor, [9.8, s * 4, 14 + k * 3.6]), 1.2, { mat: P, r1: 0.9, tono: 0.1 }));
  // cabeza: cráneo largo y caído, cejas pesadas, pómulos hundidos, nariz ganchuda, la boca de rana de oreja a oreja
  const ab = boca;
  ps.push(masa([
    bT(cabT, [-2, 0, 6], [10, 11, 9], m), bT(cabT, [8, 0, 8], [4.5, 10.5, 3.2], m), bT(cabT, [4, 0, 0], [11, 14.5, 4.6], m),
    hueso(H([11, 0, 7]), H([19, 0, -1]), 2.6, 1.1, m), bulto(H([18.4, 0, -1.4]), [1.6, 1.4, 2.2], m), bT(cabT, [8, 7, 3], [4, 3, 3], m), bT(cabT, [8, -7, 3], [4, 3, 3], m),
  ], { mat: P, suave: 2.2 }));
  const mand = cmp(cabT, T([-2, 0, -3], Ry(ab * 42)));
  ps.push(masa([bT(mand, [6, 0, -2], [11, 15, 4.5], m), bT(mand, [2, 0, -5], [10, 13, 4], { mat: 'jf_vientre_sapo' }), bT(mand, [6, 0, -7], [8, 12, 4 + hincha * 8], { mat: 'jf_vientre_sapo' })], { mat: P, suave: 2 }));
  // la boca: labios, garganta oscura, lengua y dientes de aguja
  ps.push(elipE(H([5, 0, -3 - ab * 4]), cabT.m[0], [9, 13.5, 1 + ab * 5], 'be_garganta' in MATERIALES ? 'be_garganta' : 'sangre', 0, cabT.m[1]));
  ps.push(elipE(H([5, 0, -3.5 - ab * 4]), cabT.m[0], [8.5, 13, 0.6 + ab * 4.5], 'negro', 0, cabT.m[1]));
  for (let k = 0; k < 13; k++) {
    const a = rad(-80 + k * (160 / 12)), x = 4 + Math.cos(a) * 10, y = Math.sin(a) * 14.5;
    ps.push(pua(H([x, y, -2.2]), H([x + 0.4, y * 0.97, -5.6 - (k % 2) * 1.4]), 0.85, 'cu_hueso'));
    ps.push(pua(ap(mand, [x + 2, y, -0.4]), ap(mand, [x + 2.2, y * 0.97, 3 + (k % 2) * 1.2]), 0.75, 'cu_hueso'));
  }
  const lengua = tentaculo(ap(mand, [2, 0, -1.5]), mv(mand.m, [1, 0, 0.1]), 12 + ab * 10 + escupe * 8, 5, (t) => -10 + t * 30, (t) => Math.sin(t * 5 + f) * 10);
  ps.push(masa(lengua.slice(1).map((q, i) => hueso(lengua[i], q, 3 - i * 0.4, 2.6 - i * 0.4, { mat: 'carne' })), { mat: 'carne', suave: 1.2 }));
  // ojos saltones bajo las cejas, con la pupila rajada, y dos chicos más arriba
  for (const s of [1, -1]) {
    const o0 = H([9.5, s * 5.6, 4.6]);
    ps.push(elipE(o0, mv(cabT.m, [1, s * 0.5, 0]), [2.6, 3.2, 2.6], muerte > 0.7 ? 'cu_ojo' : 'cu_ojo_verde', 0.15));
    ps.push(elipE(add(o0, mv(cabT.m, [1, s * 0.5, 0]), 2.4), mv(cabT.m, [1, s * 0.5, 0]), [0.5, 0.5, 2.2], 'negro'));
    ps.push(elipE(H([8.6, s * 3, 10]), mv(cabT.m, [1, s * 0.3, 0.3]), [1, 1.3, 0.9], muerte > 0.7 ? 'cu_ojo' : 'cu_ojo_verde', 0));
  }
  // pelo de algas: mechones largos y lacios que caen desde la coronilla
  ps.push(masa([bT(cabT, [-3, 0, 9], [10, 11.5, 6.5], { mat: 'jf_pelo_cienaga' }), bT(cabT, [3, 0, 12], [5, 9, 3], { mat: 'jf_pelo_cienaga' })], { mat: 'jf_pelo_cienaga', suave: 2 }));
  for (let k = 0; k < 10; k++) {
    const a = rad(55 + k * 25 + hr(k) * 8), b0 = H([-2 + Math.cos(a) * 9, Math.sin(a) * 11.5, 10]), sw = Math.sin(f * 0.8 + k) * 2;
    const lar = 22 + hr(k + 4) * 26;
    const pts = [b0, add(b0, [-3 + sw, Math.sin(a) * 5, -lar * 0.4]), add(b0, [-5 + sw * 1.4, Math.sin(a) * 8, -lar])];
    pts[2][2] = Math.max(pts[2][2], 6);
    ps.push(masa([hueso(pts[0], pts[1], 3.6 + hr(k) * 1.4, 2.6, { mat: 'jf_pelo_cienaga' }), hueso(pts[1], pts[2], 2.6, 0.6, { mat: 'jf_pelo_cienaga' })], { mat: 'jf_pelo_cienaga', suave: 1.4 }));
  }
  // ---- dos brazos flacos y largos con garras negras
  for (const [i, s] of [[0, -1], [1, 1]] as [number, number][]) {
    const h = ap(tor, [0, s * 15, 28]);
    const [codo, mu] = ik(h, add(mano[i], [0, 0, -hund]), 36, 36, mv(tor.m, [-0.6, s, 0.3]));
    const fa = nor(sub(mu, codo));
    ps.push(masa([bT(tor, [0, s * 15, 28], [6, 6, 6], m), hueso(h, codo, 3.6, 2.8, m), hueso(codo, mu, 2.8, 2, m), bulto(add(mu, fa, 2.5), [4, 2.6, 3.4], { eje: fa, mat: P })], { mat: P, suave: 2 }));
    const lat = nor(cruz(fa, [0, 0, 1]));
    for (let k = 0; k < 4; k++) { const b0 = add(add(mu, fa, 5), lat, (k - 1.5) * 1.6); ps.push(pua(b0, add(add(b0, fa, 9), [0, 0, -3]), 0.9, 'jf_cuerno')); }
  }
  // ---- seis enredaderas con espinas que salen del vientre y se retuercen; las dos de adelante azotan
  for (let k = 0; k < 6; k++) {
    const s = k % 2 ? 1 : -1, fila = Math.floor(k / 2), a = s * (40 + fila * 38);
    const base = ap(vien, [Math.cos(rad(a)) * R[0] * 0.85, Math.sin(rad(a)) * R[1] * 0.85, -4 + fila * 8]);
    let dir: V3 = [Math.cos(rad(a)), Math.sin(rad(a)), 0.5 - fila * 0.15];
    const ataca = fila === 0 && latigo !== 0;
    const L = ataca ? 70 + Math.max(0, latigo) * 40 : 62 - fila * 6;
    const fase = f / CUADROS[acc] * TAU + k * 1.7;
    let curva = (t: number) => 18 * Math.sin(fase + t * 4) - 6 + t * 8, lado = (t: number) => s * (10 + 14 * Math.sin(fase * 0.7 + t * 3));
    if (ataca) { dir = latigo < 0 ? [-0.4, s * 0.6, 1] : [1, s * 0.15, 0.25 - latigo * 0.5]; curva = (t) => (latigo < 0 ? 12 : -6 * latigo) + Math.sin(t * 3) * 6; lado = (t) => -s * 4 * t; }
    if (muerte > 0.3) { dir = [Math.cos(rad(a)), Math.sin(rad(a)), 0.4 - muerte]; curva = (t) => -10 * muerte - t * 6; lado = (t) => s * 6 * t; }
    if (nube > 0 && fila === 0) { dir = [0.3, s * 0.9, 0.8]; }
    const pts = tentaculo(base, dir, L, 8, curva, lado);
    for (const q of pts) q[2] = Math.max(q[2], 1.5);
    ps.push(masa(pts.slice(1).map((q, i) => hueso(pts[i], q, 4.8 - i * 0.5, 4.3 - i * 0.5, { mat: 'jf_enredadera' })), { mat: 'jf_enredadera', suave: 1.6 }));
    for (let i = 1; i < pts.length - 1; i++) {
      const d = nor(sub(pts[i + 1], pts[i])), o = nor(cruz(d, [hr(i + k) - 0.5, hr(i + k + 1) - 0.5, 0.8]));
      ps.push(pua(pts[i], add(add(pts[i], o, 4.6 - i * 0.4), d, 1.5), 1.1 - i * 0.08, 'jf_cuerno'));
      if (i % 2 === 0) ps.push(elipE(add(pts[i], o, -2.5), add(o, d, -0.6), [3, 1.6, 0.5], 'hojas_selva' in MATERIALES ? 'hojas_selva' : 'musgo', -0.1));
    }
  }
  // ---- escupitajo (lanzar) y nube de veneno (especial)
  if (escupe > 0.25) {
    const o0 = H([16, 0, -5]), c = add(o0, mv(T([0, 0, 0], Rz(ty)).m, [1, 0, -0.08]), (escupe - 0.25) * 40);
    ps.push(esfera(...c, 5, { mat: 'jf_niebla' }), esfera(...c, 3, { mat: 'luz_vela', tono: -0.3 }));
    for (let k = 0; k < 6; k++) ps.push(esfera(c[0] - (k + 1) * 4, c[1] + Math.sin(k + f) * 2, c[2] + Math.cos(k * 2) * 2 + k * 0.6, 3 - k * 0.4, { mat: 'jf_niebla_densa', tono: -0.1 - k * 0.05 }));
  }
  if (nube > 0) {
    const o0 = H([16, 0, -6]), dir = mv(T([0, 0, 0], Rz(ty)).m, [1, 0, -0.25]);
    for (let k = 0; k < 44; k++) {
      const t = (k / 44) * nube, c = add(add(o0, dir, 12 + t * 120), [(hr(k) - 0.5) * 50 * t, (hr(k + 1) - 0.5) * 70 * t, (hr(k + 2) - 0.3) * 34 * t]);
      c[2] = Math.max(c[2], 4);
      const w = (3.5 + t * 11) * (0.5 + hr(k + 3) * 0.8);
      ps.push(elipsoide(...c, w, w * 0.9, w * 0.75, { mat: k % 4 ? 'jf_niebla_densa' : 'jf_niebla', tono: -0.1 - t * 0.35 }));
    }
    for (let k = 0; k < 12; k++) { const t = hr(k + 30) * nube; const c = add(add(o0, dir, 16 + t * 120), [(hr(k) - 0.5) * 50 * t, (hr(k + 4) - 0.5) * 60 * t, 10 + hr(k + 5) * 20]); ps.push(esfera(...c, 1.2, { mat: 'fuego_verde' })); }
  }
  const brillo = muerte > 0.7 ? undefined : { c: nube > 0.2 ? H([50, 0, -10]) : H([14, 0, 4]), r: 12 + nube * 40, color: '#50c040' };
  return { piezas: ps, resplandor: brillo };
}
jefe('madre_cienaga', ['Madre Ciénaga', 'Mother Mire'], 140, 6, ['eructo de veneno', 'venom belch'], madreCienaga);

// ================================================================== 5. HJALDUR, EL REY DE ESCARCHA
/**
 * Un rey gigante de 150 de alto: piel azul de hielo viejo, armadura de cristales de hielo que le crecen en los
 * hombros, el pecho y los antebrazos, corona de carámbanos, barba de escarcha trenzada con cuentas de hielo, manto
 * de pieles y una gran hacha de hielo vivo (escarcha que destella sobre el filo). El especial golpea el piso con
 * las dos manos y levanta una corona de púas de hielo.
 */
function reyEscarcha(acc: Acc, f: number): Res {
  const ph = f / CUADROS[acc], S = 2.45, Z = 'jf_piel_escarcha', I = 'jf_hielo_azul', Fz = 'jf_escarcha';
  const p = poseB();
  p.tp = 8; p.cab = 2; p.mano = [[8, -4, 20], [7, 4, 29]];
  let puas = 0, golpe = 0, rompe = 0, apaga = 0, frio = 0, vaho = 1;
  if (acc === 'quieto') {
    const b = Math.sin(ph * TAU); p.pz = 0.4 + b * 0.35; p.tp = 8 + b; p.cab = 2 - b * 2; p.mano = [[8, -4, 20 + b * 0.4], [7, 4, 29 + b * 0.4]];
  } else if (acc === 'caminar') {
    marcha(p, ph, 17, 4.5); p.tp = 12; p.mano = [[9, -4, 21 + Math.sin(ph * TAU) * 0.6], [8, 4, 30 + Math.sin(ph * TAU) * 0.6]];
  } else if (acc === 'atacar' || acc === 'especial') {
    // el hachazo: carga el hacha por encima de la cabeza y la baja de lleno contra el piso
    const esp = acc === 'especial';
    p.ty = K([0, 10, 16, 14, -4, -8, -4, 0], f) * (esp ? 0.4 : 1); p.tp = K([8, -2, -12, -16, 22, 34, 26, 12], f) + (esp ? K([0, 0, 0, 0, 6, 10, 8, 2], f) : 0);
    p.pz = K([0.4, 0, -0.5, -0.5, 3, 5, 4, 1], f) + (esp ? K([0, 1, 2, 2, 3, 4, 3, 1], f) : 0); p.cab = K([2, -6, -12, -14, 10, 16, 10, 4], f);
    const z = K([20, 36, 52, 58, 30, 14, 16, 20], f), x = K([8, 4, -2, -4, 16, 20, 16, 9], f);
    p.mano = [[x, -3, z], [x + 1, 4, z + 8 * Math.cos(rad(K([60, 30, 0, -20, 40, 80, 70, 60], f)))]];
    p.pie[1] = [K([1, 2, 3, 3, 8, 9, 6, 2], f), 5, 0]; p.pie[0] = [-2, -5, 0];
    golpe = K([0, 0, 0, 0, 0.6, 1, 0.6, 0.2], f); puas = esp ? K([0, 0, 0, 0, 0.35, 0.75, 1, 0.9], f) : 0;
  } else if (acc === 'lanzar') {
    // clava el hacha y abre la mano izquierda: un cono de esquirlas de hielo sale disparado
    frio = K([0, 0, 0.2, 0.5, 0.9, 1, 0.7, 0.3], f);
    p.mano = [[8, -5, K([20, 18, 17, 17, 17, 17, 18, 20], f)], [K([7, 10, 13, 16, 18, 18, 14, 8], f), K([4, 7, 8, 7, 6, 6, 6, 4], f), K([29, 32, 33, 32, 31, 31, 30, 29], f)]];
    p.tp = K([8, 4, 2, 6, 12, 14, 10, 8], f); p.ty = K([0, 8, 10, 6, -8, -10, -4, 0], f);
  } else if (acc === 'herido') {
    const k = [0.6, 1, 0.7, 0.3][f % 4];
    p.tp = 8 - 16 * k; p.cab = 2 - 18 * k; p.px = -1.6 * k; p.ty = 10 * k; p.mano = [[8 - 3 * k, -5, 20 + 6 * k], [7 - 3 * k, 5, 29 + 6 * k]]; rompe = 0.15 * k;
  } else if (acc === 'morir') {
    // trastabilla, se le quiebra la armadura y cae de espaldas como un árbol; el hielo de los ojos se apaga
    p.pz = K([0.4, 1.5, 2.5, 2, 1, 0.5, 0.4, 0.4], f); p.tp = K([8, -12, -6, -4, -2, 0, 0, 0], f); p.cab = K([2, -24, -16, -10, -6, -4, -6, -8], f); p.px = K([0, -1, -2, -2, -2, -2, -2, -2], f);
    p.caida = K([0, 0, 0.12, 0.3, 0.55, 0.82, 1, 1], f); p.atras = true; rompe = K([0, 0.2, 0.4, 0.6, 0.75, 0.9, 1, 1], f); apaga = K([0, 0, 0, 0.2, 0.4, 0.7, 1, 1], f);
    p.mano = [[K([8, 2, 0, -2, -2, -2, -2, -2], f), K([-4, -14, -17, -19, -20, -21, -21, -21], f), K([20, 34, 36, 36, 34, 32, 32, 32], f)], [K([7, 2, 0, -2, -2, -2, -2, -2], f), K([4, 14, 17, 19, 20, 21, 21, 21], f), K([29, 36, 38, 38, 36, 34, 34, 34], f)]];
    p.pie = [[K([0, 1, 2, 2, 2, 2, 2, 2], f), -5.5, 0], [K([1, 3, 4, 4, 4, 4, 4, 4], f), 5.5, 0]];
  }
  const r = rigB({ S, A: 1.18 }, p);
  const { tor, pel } = r;
  const ps: Pieza[] = [];
  // ---- cuerpo de gigante
  const c = carneB(r, Z, 0.95, 0.15);
  // músculo marcado (la unión más corta para que cada uno se lea): bíceps, tríceps, flexores del antebrazo,
  // cuádriceps con la gota sobre la rodilla, isquiotibiales y gemelos de dos cabezas
  for (const [i, s] of [[0, -1], [1, 1]] as [number, number][]) {
    const h = r.hom[i], cd0 = r.codo[i], w = r.mun[i], ua = nor(sub(cd0, h)), fa = r.fa[i], km = { mat: Z, k: 0.8 * S };
    const fr = nor(sub(tor.m[0], esc(ua, pto(tor.m[0], ua)))), la = nor(cruz(ua, fr)), lf = nor(sub(tor.m[1], esc(fa, pto(tor.m[1], fa))));
    c.brazos[i].push(bulto(add(mez(h, cd0, 0.52), fr, 1.05 * r.A), [3 * S, 1.55 * r.A, 1.5 * r.A], { eje: ua, ...km }), bulto(add(mez(h, cd0, 0.42), fr, -1.05 * r.A), [3.5 * S, 1.5 * r.A, 1.6 * r.A], { eje: ua, ...km }));
    c.brazos[i].push(bulto(add(mez(h, cd0, 0.2), la, s * -0.9 * r.A), [2.4 * S, 1.6 * r.A, 1.6 * r.A], { eje: ua, ...km }));
    c.brazos[i].push(bulto(add(mez(cd0, w, 0.25), lf, s * 0.75 * r.A), [2.6 * S, 1.35 * r.A, 1.3 * r.A], { eje: fa, ...km }), bulto(add(mez(cd0, w, 0.3), lf, -s * 0.8 * r.A), [2.4 * S, 1.25 * r.A, 1.2 * r.A], { eje: fa, ...km }));
    const cd = r.cad[i], rd = r.rod[i], tb = r.tob[i], mu = nor(sub(rd, cd)), ca = nor(sub(tb, rd));
    const fw = nor(sub(pel.m[0], esc(mu, pto(pel.m[0], mu)))), ld = nor(cruz(mu, fw)), fwc = nor(sub(pel.m[0], esc(ca, pto(pel.m[0], ca)))), ldc = nor(cruz(ca, fwc));
    c.piernas[i].push(bulto(add(mez(cd, rd, 0.45), fw, 1.5 * r.A), [4.8 * S, 1.6 * r.A, 1.6 * r.A], { eje: mu, ...km }), bulto(add(mez(cd, rd, 0.55), ld, s * 1.4 * r.A), [4.4 * S, 1.7 * r.A, 1.9 * r.A], { eje: mu, ...km }));
    c.piernas[i].push(bulto(add(add(mez(cd, rd, 0.8), ld, -s * 1.1 * r.A), fw, 0.7 * r.A), [2.4 * S, 1.4 * r.A, 1.5 * r.A], { eje: mu, ...km }), bulto(add(mez(cd, rd, 0.5), fw, -1.5 * r.A), [4.6 * S, 1.7 * r.A, 1.8 * r.A], { eje: mu, ...km }));
    for (const g of [1, -1]) c.piernas[i].push(bulto(add(add(mez(rd, tb, 0.27), fwc, -1.35 * r.A), ldc, g * 0.75 * r.A), [3 * S, 1.3 * r.A, 1.45 * r.A], { eje: ca, ...km }));
  }
  ps.push(tronco(masa(c.tronco, { mat: Z, suave: 1.8 * S })));
  c.brazos.forEach((b) => ps.push(masa(b, { mat: Z, suave: 1.5 * S })));
  c.piernas.forEach((b) => ps.push(masa(b, { mat: Z, suave: 1.5 * S })));
  // calzas de piel, botas envueltas, taparrabo de piel y cinturón con hebilla de hielo
  for (let i = 0; i < 2; i++) {
    ps.push(masa([hueso(mez(r.rod[i], r.tob[i], 0.25), r.tob[i], 2.9 * r.A, 2.2 * r.A, { mat: 'cu_pelaje_gris' }), hueso(r.tob[i], r.suelo[i], 2.4 * r.A, 2.2 * r.A, { mat: 'cu_pelaje_gris' })], { mat: 'cu_pelaje_gris', suave: S }));
    for (let k = 0; k < 3; k++) ps.push(elipE(mez(r.rod[i], r.tob[i], 0.35 + k * 0.22), sub(r.tob[i], r.rod[i]), [0.8 * S, 2.6 * r.A, 2.6 * r.A], 'cu_cuero_negro', 0, [0, 0, 1]));
  }
  ps.push(masa([bT(pel, [0.4 * S, 0, 0], [4.5 * r.A, 5.9 * r.A, 4.2 * S], { mat: 'cu_pelaje_gris' }), hT(pel, [1 * S, 0, -1 * S], [2.6 * S, 0, -11 * S], 4.2 * r.A, 3 * r.A, { mat: 'cu_pelaje_gris' }), hT(pel, [-1.5 * S, 0, -1 * S], [-3 * S, 0, -10 * S], 4.6 * r.A, 3 * r.A, { mat: 'cu_pelaje_gris' })], { mat: 'cu_pelaje_gris', suave: 1.4 * S }));
  ps.push(elipE(ap(pel, [0, 0, 2.6 * S]), pel.m[0], [4.6 * r.A, 6 * r.A, 1.3 * S], 'cu_cuero_negro', 0, pel.m[1]));
  ps.push(esquirla(ap(pel, [4.6 * r.A, 0, 2.6 * S]), mv(pel.m, [1, 0, 0.2]), 5 * S, 2.2 * S, 3, I, 0.1));
  // ---- armadura de cristales: el pecho, los hombros, los antebrazos (se quiebra y cae al morir)
  const cris = (base: V3, dir: V3, largo: number, ancho: number, sem: number) => {
    if (rompe > 0 && hr(sem * 3.1) < rompe * 0.7) {
      // el cristal cae al piso
      const q: V3 = [base[0] + (hr(sem) - 0.5) * 50, base[1] + (hr(sem + 1) - 0.5) * 50, 0.5];
      if (rompe > 0.5) ps.push(esquirla(q, [hr(sem + 2) - 0.5, hr(sem + 3) - 0.5, 0.15], largo * 0.6, ancho * 0.8, sem, I, 0.05));
      return;
    }
    ps.push(esquirla(base, dir, largo, ancho, sem, I, (hr(sem) - 0.5) * 0.2));
  };
  /**
   * Placa de hielo facetada pegada al miembro: un anillo de puntos apenas hundido en la piel y tres puntos alzados
   * que forman una cresta; la cáscara convexa queda como una gema chata. `n` sale de la piel, `u` corre a lo largo
   * del miembro y `prof` es el radio del miembro en ese punto.
   */
  const placa = (c0: V3, n: V3, u: V3, largo: number, ancho: number, prof: number, alto: number, sem: number) => {
    if (rompe > 0 && hr(sem * 3.1) < rompe * 0.8) return;
    const v = nor(cruz(n, u)), c1 = add(c0, n, prof), pts: V3[] = [];
    for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU + hr(sem + k) * 0.5, rr = 0.8 + 0.3 * hr(sem + k + 9); pts.push(add(add(add(c1, u, Math.cos(a) * largo * 0.5 * rr), v, Math.sin(a) * ancho * 0.5 * rr), n, -0.35 * alto - Math.abs(Math.sin(a)) * 0.25 * alto)); }
    for (const t of [-0.3, 0.05, 0.35]) pts.push(add(add(add(c1, u, t * largo + (hr(sem + t * 10) - 0.5) * 0.15 * largo), v, (hr(sem + t * 7) - 0.5) * 0.3 * ancho), n, alto * (1 - Math.abs(t) * 0.9)));
    ps.push(poliedro(pts, { mat: I, tono: (hr(sem) - 0.5) * 0.15 }));
  };
  for (const [i, s] of [[0, -1], [1, 1]] as [number, number][]) {
    const h = r.hom[i], ua = nor(sub(r.codo[i], h));
    const out = nor(mv(tor.m, [0, s, 0]));
    ps.push(masa([bulto(add(add(h, [0, 0, 1.4 * S]), ua, 0.4 * S), [4.2 * S, 3.8 * S, 2.6 * S], { eje: out, mat: 'cu_pelaje' }), bulto(add(add(h, [0, 0, 2.6 * S]), ua, 0.2 * S), [3.4 * S, 3 * S, 1.6 * S], { eje: out, mat: 'hielo' })], { mat: 'cu_pelaje', suave: S }));
    for (let k = 0; k < 6; k++) cris(add(add(h, [0, 0, (2.4 + (k % 3)) * S]), out, (k - 2) * 0.9 * S), nor(add(add(out, [0, 0, 1.4 - k * 0.15]), mv(tor.m, [(hr(k + i * 9) - 0.6), 0, 0]))), (8 + hr(k + i) * 9) * S * 0.9, 1.8 * S, 20 + k + i * 10);
    // brazales de hielo
    ps.push(masa([hueso(mez(r.codo[i], r.mun[i], 0.35), mez(r.codo[i], r.mun[i], 0.92), 2.4 * r.A, 1.9 * r.A, { mat: 'cu_cuero_negro' })], { mat: 'cu_cuero_negro' }));
    for (let k = 0; k < 3; k++) cris(mez(r.codo[i], r.mun[i], 0.35 + k * 0.2), nor(add(esc(r.fa[i], -0.6), out, 1)), (4.2 - k * 0.6) * S, 1.1 * S, 40 + k + i * 5);
    // placas de hielo facetadas sobre el brazal: por afuera y por arriba del antebrazo
    const fa = r.fa[i], nOut = nor(sub(out, esc(fa, pto(out, fa)))), nArr = nor(sub([0, 0, 1], esc(fa, pto([0, 0, 1], fa))));
    placa(mez(r.codo[i], r.mun[i], 0.55), nOut, fa, 4.6 * S, 2.6 * S, 2.3 * r.A, 1.5 * S, 80 + i * 7);
    placa(mez(r.codo[i], r.mun[i], 0.6), nor(add(nArr, nOut, 0.4)), fa, 3.8 * S, 2.2 * S, 2.2 * r.A, 1.3 * S, 83 + i * 7);
    // y en las espinillas, sobre las pieles de la bota y arriba de ellas
    const ca = nor(sub(r.tob[i], r.rod[i])), fwc = nor(sub(pel.m[0], esc(ca, pto(pel.m[0], ca)))), ldc = nor(cruz(ca, fwc));
    placa(mez(r.rod[i], r.tob[i], 0.36), fwc, ca, 4.8 * S, 2.6 * S, 2.9 * r.A, 1.5 * S, 90 + i * 7);
    placa(mez(r.rod[i], r.tob[i], 0.66), nor(add(fwc, ldc, s * 0.7)), ca, 3.6 * S, 2.2 * S, 2.8 * r.A, 1.3 * S, 93 + i * 7);
    placa(r.rod[i], nor(add(fwc, [0, 0, 0.4])), ca, 2.8 * S, 2.6 * S, 2.1 * r.A, 1.4 * S, 96 + i * 7);
  }
  // peto: placas de hielo sobre los pectorales y cristales que salen del esternón
  for (const s of [1, -1]) ps.push(elipE(ap(tor, [3.4 * r.A, s * 2.9 * r.A, 9.6 * S]), mv(tor.m, [1, s * 0.3, 0.1]), [1.4 * S, 3.8 * r.A, 3.2 * S], 'hielo', 0, mv(tor.m, [0, 1, 0])));
  for (let k = 0; k < 5; k++) cris(ap(tor, [4.6 * r.A, (k - 2) * 1.4 * S, (11 - Math.abs(k - 2)) * S]), mv(tor.m, [1, (k - 2) * 0.35, 0.9]), (4 + (2 - Math.abs(k - 2)) * 1.6) * S, 1.1 * S, 60 + k);
  // ---- manto de pieles desde los hombros
  {
    const lag = acc === 'caminar' ? 6 : 2, ondea = Math.sin(ph * TAU) * 2;
    const g: V3[][] = [];
    for (let i = 0; i <= 3; i++) {
      const t = i / 3, fila: V3[] = [];
      for (let j = 0; j <= 4; j++) {
        const u = (j / 4) * 2 - 1, arriba = ap(tor, [-3.6 * S, u * 6.8 * r.A, 14 * S - Math.abs(u) * 1.4 * S]);
        const abajo = ap(r.raiz, [-9 * S - lag + p.px * S, u * 10 * r.A + ondea, 9 * S + Math.abs(u) * 3]);
        fila.push(add(mez(arriba, abajo, t), [-Math.sin(t * Math.PI) * 5 + Math.sin(j * 2 + t * 3) * 1.6, 0, 0]));
      }
      g.push(fila);
    }
    ps.push(...lamina(g, 'cu_pelaje', 0.9, -0.08));
    ps.push(masa([hT(tor, [-1.6 * S, 6.6 * r.A, 14.4 * S], [-1.6 * S, -6.6 * r.A, 14.4 * S], 3.4 * S, 3.4 * S, { mat: 'cu_pelaje' })], { mat: 'cu_pelaje' }));
  }
  // ---- cabeza: cráneo, mandíbula pesada, ojos de hielo, barba de escarcha trenzada, pelo blanco y corona de carámbanos
  const cab = r.cab, SH = S * 1.08, C = (q: V3) => ap(cab, esc(q, SH)), bc = (q: V3, rr: V3, mt = Z) => bulto(C(q), esc(rr, SH), { ejes: ejesDe(cab), mat: mt });
  ps.push(masa([bc([-0.3, 0, 0.8], [4, 3.6, 4.2]), bc([1.6, 0, -2], [3, 3.1, 2.4]), bc([3.1, 0, 1.2], [1, 3.1, 0.9]), bc([2.7, 2, -0.3], [1.3, 1.2, 1]), bc([2.7, -2, -0.3], [1.3, 1.2, 1]), bc([4, 0, -0.2], [1.1, 0.8, 1.6])], { mat: Z, suave: 0.9 * SH }));
  for (const s of [1, -1]) ps.push(elipE(C([3.7, s * 1.45, 0.45]), mv(cab.m, [1, s * 0.4, 0.2]), [0.55 * SH, 1.05 * SH, 0.5 * SH], apaga > 0.6 ? 'cu_ojo' : 'cu_ojo_hielo', 0.3, mv(cab.m, [0, s, 0.3])));
  // barba: una masa larga que cae al pecho y dos trenzas con cuentas de hielo; bigote
  ps.push(masa([bc([2.8, 0, -2.6], [2, 3.4, 2.2], Fz), hueso(C([2.8, 0, -3]), C([3.6, 0, -9]), 2.6 * SH, 1.8 * SH, { mat: Fz }), bc([2.4, 0, -6], [2.2, 3, 3], Fz), bc([3.4, 0, -0.9], [0.9, 2.6, 0.6], Fz)], { mat: Fz, suave: 0.8 * SH }));
  for (const s of [1, -1]) {
    const a0 = C([3.2, s * 1.4, -8]), a1 = C([3.6, s * 1.6, -13]);
    ps.push(masa([hueso(a0, a1, 0.9 * SH, 0.6 * SH, { mat: Fz })], { mat: Fz }));
    ps.push(esfera(...a1, 0.9 * SH, { mat: I }), pua(a1, add(a1, [0, 0, -3 * SH]), 0.5 * SH, I));
  }
  for (let k = 0; k < 4; k++) { const b0 = C([3.7, (k - 1.5) * 1.2, -9.5]); ps.push(pua(b0, add(b0, [0, 0, -(2 + hr(k) * 2.4) * SH]), 0.35 * SH, I)); }
  // pelo blanco largo hacia atrás
  for (let k = 0; k < 7; k++) {
    const a = rad(-90 + k * 30), b0 = C([-1.6 + Math.cos(a) * 1.6, Math.sin(a) * 3.4, 3]), sw = Math.sin(f * 0.6 + k) * 1.2;
    ps.push(masa([hueso(b0, add(C([-4.4, Math.sin(a) * 3.4, -3]), [sw, 0, 0]), 1.3 * SH, 1 * SH, { mat: Fz }), hueso(add(C([-4.4, Math.sin(a) * 3.4, -3]), [sw, 0, 0]), add(C([-4.8, Math.sin(a) * 4.2, -10]), [sw * 2, 0, 0]), 1 * SH, 0.3 * SH, { mat: Fz })], { mat: Fz, suave: 0.6 * SH }));
  }
  // corona de carámbanos sobre un aro de hielo
  {
    const cz = cab.m[2], c0 = C([-0.3, 0, 3.6]);
    ps.push(cilindro(...c0, 3.9 * SH, 1.3 * SH, { mat: I, r1: 4.1 * SH, eje: cz }));
    for (let k = 0; k < 11; k++) {
      const a = (k / 11) * TAU, d = add(esc(nor(cab.m[0]), Math.cos(a)), nor(cab.m[1]), Math.sin(a)), b0 = add(add(c0, d, 4 * SH), cz, 1 * SH);
      const alto = (k % 2 ? 3 : 5.5) * SH * (1 + 0.3 * Math.cos(a)) * (rompe > 0.6 && k % 3 === 0 ? 0.4 : 1);
      ps.push(esquirla(b0, add(cz, d, 0.15), alto, 0.75 * SH, 80 + k, I, 0.1));
    }
    ps.push(esfera(...add(add(c0, nor(cab.m[0]), 4.1 * SH), cz, 0.7 * SH), 0.8 * SH, { mat: apaga > 0.6 ? I : 'cu_ojo_hielo' }));
  }
  // vaho de la boca
  if (vaho && apaga < 0.6) for (let k = 0; k < 3; k++) { const u = ((f / CUADROS[acc]) + k / 3) % 1; const q = add(C([4.6, 0, -1.6]), mv(cab.m, [1, 0, 0.3]), u * 12); ps.push(esfera(...q, (1 + u * 2.4), { mat: Fz, tono: -0.1 - u * 0.15 })); }
  // ---- la gran hacha de hielo: asta de hierro negro forrada en cuero, cabeza de hielo en media luna
  {
    let mA = r.mun[0], mB = r.mun[1];
    let eje = nor(sub(mB, mA));
    if (acc === 'lanzar') eje = nor(add([0, 0, 1], mv(tor.m, [0.25, -0.2, 0])));
    if (acc === 'morir' && f >= 4) { mA = [16 * S, -18 * S, 2]; eje = nor([0.8, 0.6, 0.02]); }
    else if (acc === 'morir' && f >= 2) { mA = add(r.mun[0], [0, 0, 0]); eje = nor([0.5, -0.3, 0.8]); }
    const base = add(mA, eje, -16), cabeza = add(mA, eje, 84);
    ps.push(palo(base, cabeza, 1.7, { mat: 'hierro', r1: 1.5 }));
    for (let k = 0; k < 4; k++) ps.push(cilindro(...add(mA, eje, 10 + k * 7), 2.1, 3.2, { mat: 'cu_cuero_negro', eje }));
    ps.push(esquirla(base, esc(eje, -1), 8, 1.6, 90, I, 0.1));
    // la hoja: un lado al frente (media luna) y una púa atrás
    const fwd0 = nor(sub(mv(tor.m, [1, 0, 0]), esc(eje, pto(mv(tor.m, [1, 0, 0]), eje)))), fwd = acc === 'atacar' || acc === 'especial' ? nor(sub(esc(fwd0, 1), [0, 0, 0])) : fwd0;
    const lado = nor(cruz(eje, fwd));
    // la hoja: un bloque de hielo tallado con el filo en dientes, gruesa en el centro y fina en el borde
    const Q = (v: number, u: number): V3 => add(add(cabeza, eje, v), fwd, u);
    const cen = Q(-9, 9);
    const borde: [number, number][] = [[2, 1], [10, 9], [7, 21], [1, 27], [-7, 24], [-14, 29], [-21, 24], [-30, 22], [-36, 15], [-24, 5], [-18, 1]];
    for (let k = 0; k < borde.length; k++) {
      const pA = Q(...borde[k]), pB = Q(...borde[(k + 1) % borde.length]);
      ps.push(poliedro([add(cen, lado, 2.6), add(cen, lado, -2.6), add(pA, lado, 0.6), add(pA, lado, -0.6), add(pB, lado, 0.6), add(pB, lado, -0.6)], { mat: k % 2 ? 'hielo' : I, tono: -0.12 + (k % 3) * 0.04 }));
      if (k >= 2 && k <= 8) ps.push(palo(pA, pB, 0.8, { mat: I, tono: 0.18 }));
    }
    ps.push(esquirla(Q(-12, 12), add(fwd, lado, 0.9), 5, 1.6, 97, I, 0.1), esquirla(Q(-4, 14), add(fwd, lado, -0.9), 4, 1.4, 98, I, 0.1));
    ps.push(masa([bulto(add(cabeza, eje, -8), [11, 3.4, 3.4], { eje, mat: 'hierro' })], { mat: 'hierro' }));
    const filoA = Q(1, 27), filoB = Q(-30, 22), filoM = Q(-14, 29);
    ps.push(esquirla(cabeza, eje, 12, 1.6, 91, I, 0.12));
    if (apaga < 0.8) ps.push(...encantar(filoA, filoM, 'hielo', f, S * 0.7, 5), ...encantar(filoM, filoB, 'hielo', f, S * 0.7, 6));
    if (golpe > 0.5 && acc === 'atacar') { const g0: V3 = [filoM[0], filoM[1], 0.3]; for (let k = 0; k < 9; k++) { const a = (k / 9) * TAU; ps.push(esquirla(add(g0, [Math.cos(a) * 6, Math.sin(a) * 6, 0]), [Math.cos(a), Math.sin(a), 1.2], 8 + hr(k) * 10 * golpe, 2, 100 + k, I, 0.1)); } ps.push(...brasas(g0, 14, 20, 8, f, 110, 'cu_ojo_hielo', 0.7)); }
  }
  // ---- lanzar: un cono de esquirlas que sale de la mano izquierda
  if (frio > 0.05) {
    const m2 = r.mun[1], dir = nor(mv(T([0, 0, 0], Rz(p.ty)).m, [1, 0, -0.15]));
    for (let k = 0; k < 18; k++) { const t = hr(k) * frio, c0 = add(add(m2, dir, 8 + t * 70), [(hr(k + 1) - 0.5) * 30 * t, (hr(k + 2) - 0.5) * 30 * t, (hr(k + 3) - 0.5) * 20 * t]); ps.push(esquirla(c0, dir, 6 + hr(k + 4) * 5, 1, 120 + k, I, 0.2)); }
    for (let k = 0; k < 10; k++) { const t = hr(k + 30) * frio; ps.push(esfera(...add(add(m2, dir, 6 + t * 60), [(hr(k + 31) - 0.5) * 26 * t, (hr(k + 32) - 0.5) * 26 * t, 0]), 2 + t * 4, { mat: Fz, tono: -0.1 })); }
    ps.push(esfera(...add(m2, dir, 4), 3, { mat: 'cu_ojo_hielo' }));
  }
  // ---- especial: la corona de púas de hielo que revienta del piso hacia afuera
  if (puas > 0) {
    for (let anillo = 0; anillo < 3; anillo++) {
      const rr = 30 + anillo * 26, n = 9 + anillo * 4, crece = clamp(puas * 3 - anillo, 0, 1);
      if (crece <= 0) continue;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU + anillo * 0.4, b0: V3 = [Math.cos(a) * rr + p.px * S, Math.sin(a) * rr, -2];
        ps.push(esquirla(b0, [Math.cos(a) * 0.35, Math.sin(a) * 0.35, 1], (26 + hr(k + anillo * 20) * 26 - anillo * 4) * crece, 5.4 - anillo * 0.8, 140 + k + anillo * 20, k % 3 ? I : 'hielo', 0.05));
        if (k % 2 === 0) ps.push(esquirla(add(b0, [Math.cos(a + 0.2) * 5, Math.sin(a + 0.2) * 5, 0]), [Math.cos(a) * 0.7, Math.sin(a) * 0.7, 1], (12 + hr(k + 7) * 10) * crece, 3, 170 + k + anillo * 20, I, 0.1));
      }
    }
    for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU + 0.2, d = 20 + hr(k) * 50 * Math.min(1, puas * 1.4); ps.push(palo([Math.cos(a) * 12, Math.sin(a) * 12, 0.3], [Math.cos(a + 0.15) * d, Math.sin(a + 0.15) * d, 0.3], 1.2, { mat: 'cu_ojo_hielo', r1: 0.4 })); }
    ps.push(...brasas([p.px * S, 0, 4], 70, 40, 16, f, 160, 'cu_ojo_hielo', 0.8));
  }
  // copos que caen alrededor
  for (let k = 0; k < 10; k++) { const u = ((f / CUADROS[acc]) + hr(k)) % 1, a = hr(k + 1) * TAU, rr = 20 + hr(k + 2) * 50; ps.push(esfera(Math.cos(a) * rr, Math.sin(a) * rr, 150 * (1 - u) + 2, 0.7, { mat: 'nieve' })); }
  const luz = apaga > 0.7 ? undefined : { c: add(r.mun[1], [0, 0, 50]), r: 18 + puas * 50, color: '#a0d0ff' };
  return { piezas: ps, resplandor: luz };
}
jefe('rey_escarcha', ['Hjaldur, el Rey de Escarcha', 'Hjaldur, the Frost King'], 150, 4, ['corona de púas', 'spike crown'], reyEscarcha);

// ================================================================== 6. EL VERDUGO DE VELMORA
/** Garfio de carnicero: anillo, vástago y una curva en J con punta, colgando de `a` hacia `abajo`. */
function garfio(a: V3, abajo: V3, t: number, giro: number, mat = 'hierro_oxido'): Pieza[] {
  const d = nor(abajo), u = nor(cruz(d, [Math.cos(giro), Math.sin(giro), 0.01])), ps: Pieza[] = [];
  const q0 = add(a, d, 2 * t), q1 = add(q0, d, 6 * t);
  ps.push(elipE(a, u, [1.4 * t, 0.5 * t, 1.4 * t], mat, 0, d), palo(q0, q1, 0.55 * t, { mat }));
  let prev = q1;
  for (let k = 1; k <= 5; k++) { const an = (k / 5) * Math.PI * 1.1; const q = add(add(q1, d, Math.sin(an) * 2.6 * t), u, (1 - Math.cos(an)) * 2.6 * t); ps.push(palo(prev, q, (0.55 - k * 0.07) * t, { mat, r1: (0.5 - k * 0.08) * t })); prev = q; }
  ps.push(elipE(add(prev, d, -0.6 * t), add(esc(d, -1), u, 0.3), [0.5 * t, 0.2 * t, 0.2 * t], 'cu_sangre_viva', -0.2));
  return ps;
}
/**
 * El verdugo: 110 de alto, una mole de grasa y músculo pálido cosida de cicatrices, capucha de cuero negro en
 * punta con dos agujeros donde brillan los ojos, delantal de cuero empapado en sangre, cadenas cruzadas con
 * garfios de carnicero colgando del cinto y una cuchilla enorme que gotea sangre. El especial hace girar la cadena
 * con el garfio alrededor, a ras del piso.
 */
function verdugo(acc: Acc, f: number): Res {
  const ph = f / CUADROS[acc], S = 1.85, Pl = 'jf_piel_verdugo', Cn = 'cu_cuero_negro';
  const p = poseB();
  // en guardia: piernas abiertas con la izquierda adelante, la cuchilla amartillada a la altura del pecho y la otra
  // mano baja y adelante con la cadena
  p.tp = 10; p.cab = 6; p.mano = [[9, -12.5, 39], [8, 11.5, 20]]; p.pie = [[-3, -6.2, 0], [4, 6.2, 0]];
  let gira = -1, tiro = 0, golpe = 0, charco = 0, respira = 0;
  if (acc === 'quieto') {
    // la respiración se ve: el pecho y la panza se inflan, los hombros suben y al soltar el aire sale vaho
    const b = Math.sin(ph * TAU); respira = 0.5 + 0.5 * b; p.pz = 0.5 + b * 0.5; p.tp = 10 + b * 2; p.cab = 6 - b * 2; p.mano = [[7, -14.5, 39 + b * 1.2], [8, 11.8, 20 - b * 0.5]];
  } else if (acc === 'caminar') {
    marcha(p, ph, 15, 4); p.tp = 14; p.mano[0] = [7 - p.pie[0][0] * 0.15, -14.5, 39 + Math.sin(ph * TAU * 2) * 1]; p.mano[1] = [8 - p.pie[1][0] * 0.3, 11.8, 20]; respira = 0.5 + 0.5 * Math.sin(ph * TAU * 2);
    p.pie[0][1] = -5.6; p.pie[1][1] = 5.6;
  } else if (acc === 'atacar') {
    // la cuchilla sube por encima del hombro y baja en diagonal con todo el peso
    p.ty = K([0, 12, 24, 28, -10, -22, -12, 0], f); p.tp = K([10, 2, -8, -10, 20, 30, 22, 12], f); p.pz = K([0.5, 0, 0, 0, 2, 3.5, 2.5, 1], f); p.px = K([0, -1, -2, -2, 2, 4, 2, 0], f);
    p.mano[0] = [K([4, 0, -4, -5, 14, 18, 12, 5], f), K([-11, -12, -10, -8, -4, 2, -6, -11], f), K([22, 36, 48, 52, 32, 14, 16, 22], f)];
    p.mano[1] = [K([4, 6, 8, 8, 4, 2, 4, 4], f), K([11, 12, 13, 13, 12, 12, 12, 11], f), K([22, 26, 28, 28, 24, 22, 22, 22], f)];
    p.cab = K([6, 2, -4, -6, 10, 16, 12, 6], f); golpe = K([0, 0, 0, 0, 0.5, 1, 0.6, 0.2], f);
    p.pie[1] = [K([1, 1, 2, 2, 7, 8, 5, 1], f), 4.4, 0];
  } else if (acc === 'lanzar') {
    // arroja el garfio con la izquierda: la cadena sale recta y vuelve
    tiro = K([0, 0, 0, 0.4, 1, 1, 0.6, 0.2], f);
    p.mano[1] = [K([4, -2, -6, 6, 16, 16, 12, 6], f), K([11, 14, 16, 12, 8, 8, 10, 11], f), K([22, 32, 40, 34, 28, 27, 25, 23], f)];
    p.ty = K([0, -14, -24, -6, 18, 22, 12, 0], f); p.tp = K([10, 6, 2, 10, 18, 18, 14, 10], f);
  } else if (acc === 'herido') {
    const k = [0.6, 1, 0.7, 0.3][f % 4];
    p.tp = 10 - 18 * k; p.cab = 6 - 22 * k; p.px = -2 * k; p.ty = -8 * k; p.mano = [[4 - 4 * k, -13 - 2 * k, 22 + 6 * k], [4 - 4 * k, 13 + 2 * k, 22 + 6 * k]];
  } else if (acc === 'morir') {
    // se tambalea, cae de rodillas y se desploma de bruces sobre un charco de sangre
    p.pz = K([0.5, 2, 9, 12, 16, 20, 22, 22], f); p.tp = K([10, -6, 8, 18, 40, 62, 74, 76], f); p.cab = K([6, -20, 10, 20, 10, -10, -24, -26], f); p.px = K([0, -1, 0, 2, 6, 10, 12, 12], f);
    charco = K([0, 0, 0, 0, 0.2, 0.5, 0.8, 1], f);
    p.mano = [[K([4, 0, 8, 14, 22, 28, 30, 30], f), K([-11, -14, -13, -14, -16, -18, -20, -20], f), K([22, 30, 18, 12, 8, 4, 2, 2], f)], [K([4, 0, 8, 14, 22, 28, 30, 30], f), K([11, 14, 13, 14, 16, 18, 20, 20], f), K([22, 30, 18, 12, 8, 4, 2, 2], f)]];
    p.pie = [[K([0, -2, -6, -10, -14, -20, -23, -24], f), -5, 0], [K([1, 0, -5, -9, -13, -19, -22, -23], f), 5, 0]];
  } else if (acc === 'especial') {
    // hace girar la cadena con el garfio sobre la cabeza y a ras del piso: un remolino de hierro y sangre
    gira = f / 8; p.ty = Math.sin(ph * TAU) * 22; p.tp = 4; p.pz = 1.4;
    p.mano[1] = [4 + Math.cos(ph * TAU) * 4, 10 + Math.sin(ph * TAU) * 4, 40];
    p.mano[0] = [6, -12, 24];
  }
  // inclinado adelante, la cabeza levantada para mirar de frente y las rodillas dobladas, listo para embestir
  const agr = acc === 'morir' ? 14 * (1 - K([0, 1, 1, 1, 1, 1, 1, 1], f)) : acc === 'herido' ? 6 : 14;
  p.tp += agr; p.cab -= agr * 1.1; if (acc !== 'morir') p.pz += agr * 0.1;
  const r = rigB({ S, A: 1.42 }, p);
  const { tor, pel } = r;
  const ps: Pieza[] = [];
  // ---- la mole: grasa, músculo, cicatrices cosidas y sangre seca
  const c = carneB(r, Pl, 0.8, 0.85);
  c.tronco.push(bT(tor, [-1.5 * S, 0, 12 * S], [4.4 * r.A, 6.6 * r.A, 4 * S], { mat: Pl }));
  // el aire que entra: pecho y panza que se inflan, y trapecios que suben
  c.tronco.push(bT(tor, [1.6 * S, 0, 9.6 * S + respira * 0.4 * S], [3.2 * r.A * (1 + respira * 0.07), 5.2 * r.A * (1 + respira * 0.04), 4.2 * S], { mat: Pl }), bT(tor, [2.6 * S, 0, 3.4 * S], [3.4 * r.A * (1 + respira * 0.08), 4.4 * r.A, 3.6 * S], { mat: Pl }));
  for (const s of [1, -1]) c.tronco.push(hueso(ap(tor, [-1 * S, s * 1.4 * r.A, (15.6 + respira * 0.5) * S]), ap(tor, [-0.6 * S, s * 5.6 * r.A, (13.6 + respira * 0.4) * S]), 2.6 * r.A, 2.2 * r.A, { mat: Pl }));
  ps.push(tronco(masa(c.tronco, { mat: Pl, suave: 1.8 * S })));
  c.brazos.forEach((b) => ps.push(masa(b, { mat: Pl, suave: 1.5 * S })));
  c.piernas.forEach((b) => ps.push(masa(b, { mat: Pl, suave: 1.5 * S })));
  const T2 = (q: V3) => ap(tor, esc(q, S));
  for (const [a, b] of [[[6.6, -5, 10], [7.6, 1, 4]], [[5.2, 6.5, 13], [6.4, 2, 9]], [[3, -7.5, 15], [4.6, -4, 12.5]]] as [V3, V3][]) {
    const pa = T2(a), pb = T2(b);
    ps.push(palo(pa, pb, 0.45 * S, { mat: 'sangre' }));
    for (let k = 1; k < 5; k++) { const q = mez(pa, pb, k / 5), n = nor(cruz(sub(pb, pa), mv(tor.m, [1, 0, 0]))); ps.push(palo(add(q, n, 0.9 * S), add(q, n, -0.9 * S), 0.18 * S, { mat: 'negro' })); }
  }
  for (let k = 0; k < 7; k++) ps.push(elipE(T2([5.2 + hr(k) * 2, (hr(k + 1) - 0.5) * 12, 6 + hr(k + 2) * 10]), mv(tor.m, [1, 0, 0]), [0.3 * S, (0.8 + hr(k + 3)) * S, (1 + hr(k + 4) * 1.5) * S], 'sangre', 0, mv(tor.m, [0, 1, 0.4])));
  // pantalón de cuero, botas, guantes y brazaletes
  for (let i = 0; i < 2; i++) {
    ps.push(masa([hueso(r.cad[i], r.rod[i], 4.2 * r.A, 2.9 * r.A, { mat: Cn }), hueso(r.rod[i], mez(r.rod[i], r.tob[i], 0.5), 2.9 * r.A, 2.4 * r.A, { mat: Cn })], { mat: Cn, suave: S }));
    ps.push(masa([hueso(mez(r.rod[i], r.tob[i], 0.45), r.tob[i], 2.7 * r.A, 2.2 * r.A, { mat: 'cu_cuero' }), hueso(r.tob[i], add(r.suelo[i], mv(pel.m, [3 * S, 0, 1 * S])), 2.3 * r.A, 1.8 * r.A, { mat: 'cu_cuero' })], { mat: 'cu_cuero', suave: S }));
    ps.push(masa([hueso(mez(r.codo[i], r.mun[i], 0.45), r.mun[i], 2.2 * r.A, 1.7 * r.A, { mat: Cn }), bulto(add(r.mun[i], r.fa[i], 1.5 * S), [2.3 * S, 1.5 * r.A, 1.9 * S], { eje: r.fa[i], mat: Cn })], { mat: Cn, suave: S }));
    for (let k = 0; k < 3; k++) ps.push(esfera(...add(mez(r.codo[i], r.mun[i], 0.55 + k * 0.15), nor(cruz(r.fa[i], [0, 0, 1])), (i ? 1 : -1) * 2.2 * r.A), 0.6 * S, { mat: 'hierro' }));
  }
  ps.push(masa([bT(pel, [0.6 * S, 0, 0.5 * S], [4.6 * r.A, 5.8 * r.A, 4.2 * S], { mat: Cn })], { mat: Cn }));
  ps.push(elipE(ap(pel, [0.8 * S, 0, 3.6 * S]), pel.m[0], [5.4 * r.A, 6.6 * r.A, 1.2 * S], 'cu_cuero', -0.1, pel.m[1]), caja(...ap(pel, [5.6 * r.A, 0, 2.6 * S]), 0.8 * S, 2.6 * S, 2.4 * S, { mat: 'hierro_oxido', giro: p.ty * 0.35 }));
  // ---- el delantal: lámina de cuero desde el pecho hasta las rodillas, empapada de sangre
  {
    const g: V3[][] = [];
    for (let i = 0; i <= 3; i++) {
      const t = i / 3, fila: V3[] = [];
      for (let j = 0; j <= 3; j++) {
        const u = j / 3 * 2 - 1;
        const arriba = T2([4.7 + Math.abs(u) * -0.8 + 0.85 * 0.85, u * 4.2, 12.5]);
        const medio = ap(pel, [(5 + 0.85 * 2.2) * r.A / 1.42 * 1.15, u * 5.4 * r.A, 1 * S]);
        const abajo = add(mez(r.rod[0], r.rod[1], 0.5 + u * 0.42), mv(pel.m, [3.6 * S + Math.sin(ph * TAU + j) * 0.6, 0, -2 * S]), 1);
        fila.push(t < 0.5 ? mez(arriba, medio, t * 2) : mez(medio, abajo, (t - 0.5) * 2));
      }
      g.push(fila);
    }
    ps.push(...lamina(g, 'jf_cuero_sangre', 0.5, 0));
    const nrm = nor(mv(pel.m, [1, 0, 0.1]));
    for (let k = 0; k < 9; k++) { const q = mez(mez(g[1][0], g[1][3], hr(k + 20)), mez(g[3][0], g[3][3], hr(k + 21)), hr(k + 22)); ps.push(elipE(add(q, nrm, 0.7), nrm, [0.3, (1 + hr(k) * 2) * S * 0.7, (1.4 + hr(k + 1) * 3) * S * 0.7], k % 3 ? 'sangre' : 'cu_sangre_viva', k % 3 ? 0 : -0.35, [0, 0, 1])); }
    for (let k = 0; k < 4; k++) { const q = mez(g[3][0], g[3][3], 0.15 + k * 0.23); const u = ((f / CUADROS[acc]) + hr(k)) % 1; ps.push(elipsoide(q[0], q[1], q[2] - 1 - u * 10, 0.5, 0.5, 1.1, { mat: 'cu_sangre_viva', tono: -0.2 })); }
    ps.push(palo(g[0][0], T2([0.5, 3.4, 15.6]), 0.5 * S, { mat: 'cu_cuero' }), palo(g[0][3], T2([0.5, -3.4, 15.6]), 0.5 * S, { mat: 'cu_cuero' }));
  }
  // ---- cadenas cruzadas al pecho y garfios colgando del cinto
  {
    const banda = [T2([-0.6, 6.6, 16]), T2([4.8, 4.4, 14]), T2([6.8, 0, 9.5]), T2([6.6, -4.4, 5]), T2([4.6, -6.8, 1.5])];
    ps.push(...cadena(banda, 2.2, 1.1, () => 'hierro_oxido'));
    for (let k = 0; k < 3; k++) {
      // péndulo: la cadena se balancea con fase propia y el garfio sigue la cadena
      const a0 = ap(pel, [(4.6 - k * 1.2) * r.A, (k - 1) * 4.6 * r.A - 2.4 * r.A, 3 * S]), L = 9 + k * 5, an = Math.sin(ph * TAU + k * 1.9) * (acc === 'caminar' ? 0.5 : 0.3), an2 = Math.cos(ph * TAU + k * 1.3) * 0.18;
      const dir: V3 = nor([Math.sin(an), Math.sin(an2), -Math.cos(an)]), b0 = add(a0, dir, L);
      ps.push(...cadena([a0, mez(a0, b0, 0.5), b0], 2.2, 1.1, () => 'hierro_oxido'), ...garfio(b0, dir, 1.6, k * 1.7 + an * 2));
    }
    // dos cadenas más que cuelgan del cuello de cuero con garfios grandes, mecidas al revés que las del cinto
    for (const s of [1, -1]) {
      const a0 = T2([2.6, s * 6.4, 13.6]), L = 22 + (s > 0 ? 6 : 0), an = -Math.sin(ph * TAU + s) * (acc === 'caminar' ? 0.45 : 0.25);
      const dir: V3 = nor(add(mv(tor.m, [0.25, s * 0.15, 0]), [Math.sin(an), 0, -Math.cos(an)])), b0 = add(a0, dir, L);
      ps.push(...cadena(colgar(a0, b0, 2, 4, -99), 2.4, 1.2, () => 'hierro_oxido'), ...garfio(b0, dir, 2.2, s + an * 2));
    }
  }
  // ---- capucha de cuero negro en punta, agujeros de los ojos con brasa, costura y una capa corta sobre los hombros
  const cab = r.cab, SH = S * 1.05, C = (q: V3) => ap(cab, esc(q, SH)), bc = (q: V3, rr: V3) => bulto(C(q), esc(rr, SH), { ejes: ejesDe(cab), mat: Cn });
  ps.push(masa([bc([0, 0, 0.6], [4.8, 4.5, 5.2]), bc([1.4, 0, -2.4], [3.8, 4, 2.8]), hueso(C([-0.6, 0, 3.6]), C([-4.6, 0, 13.5]), 3.6 * SH, 0.3 * SH, { mat: Cn }), hueso(ap(tor, [-0.5 * S, 0, 13 * S]), C([0, 0, -3]), 3.6 * S, 3 * S, { mat: Cn })], { mat: Cn, suave: 1.2 * SH }));
  ps.push(masa([bT(tor, [-0.5 * S, 0, 14 * S], [6 * r.A, 8.4 * r.A, 3.4 * S], { mat: Cn }), bT(tor, [1.5 * S, 0, 15.5 * S], [4.4 * r.A, 5.4 * r.A, 2.6 * S], { mat: Cn })], { mat: Cn, suave: S }));
  for (let k = 0; k < 6; k++) { const a = rad(-140 + k * 56); ps.push(poliedro([T2([Math.cos(a) * 5.8 - 0.4, Math.sin(a) * 8.6, 13.2]), T2([Math.cos(a + 0.4) * 5.8 - 0.4, Math.sin(a + 0.4) * 8.6, 13.2]), T2([Math.cos(a + 0.2) * 6.6 - 0.4, Math.sin(a + 0.2) * 9.4, 10 - hr(k) * 2.6]), T2([Math.cos(a + 0.2) * 5.4 - 0.4, Math.sin(a + 0.2) * 8, 14.4])], { mat: Cn })); }
  for (const s of [1, -1]) {
    ps.push(elipE(C([4.3, s * 1.5, 0.6]), mv(cab.m, [1, s * 0.3, 0]), [0.8 * SH, 1.2 * SH, 0.75 * SH], 'negro', 0, mv(cab.m, [0, s, 0.25])));
    ps.push(esfera(...C([4.65, s * 1.5, 0.55]), 0.52 * SH, { mat: acc === 'morir' && f > 4 ? 'cu_ojo' : 'cu_ojo_brasa', tono: 0.15 }));
  }
  ps.push(palo(C([4.6, 0, 3.6]), C([4.4, 0, -3.4]), 0.18 * SH, { mat: 'cu_cuero' }));
  if (acc === 'quieto' || acc === 'caminar') {
    // vaho: al largar el aire salen bocanadas de la boca de la capucha que avanzan, crecen y se deshacen
    const sale = acc === 'quieto' ? clamp(1 - respira * 1.4 + 0.3, 0, 1) : 0.5;
    for (let k = 0; k < 3; k++) { const u = (k + (acc === 'quieto' ? 1 - respira : (f % 2) * 0.5)) / 3, q = add(C([5.2 + u * 6, 0, -2.6 - u * 1.2]), mv(cab.m, [0, Math.sin(u * 4) * 1.2, 0]), 1); const w = (0.8 + u * 2.4) * sale; if (w > 0.3) ps.push(elipsoide(q[0], q[1], q[2], w * 1.3, w * 1.3, w, { mat: 'jf_vaho', tono: -0.05 - u * 0.15 })); }
  }
  ps.push(elipE(C([4.3, 0, -2.6]), cab.m[0], [0.4 * SH, 1.8 * SH, 0.5 * SH], 'negro'));
  // ---- la cuchilla: hoja rectangular enorme con un agujero, filo claro y sangre que chorrea
  {
    const mu = acc === 'morir' && f >= 5 ? null : r.mun[0];
    let eje: V3, filoD: V3, base: V3;
    if (mu) {
      const fa = r.fa[0], fw = nor(mv(tor.m, [1, 0, 0]));
      let pul = sub(fw, esc(fa, pto(fw, fa))); if (len(pul) < 0.2) pul = [0, 0, 1]; pul = nor(pul);
      eje = nor(add(esc(fa, Math.cos(rad(62))), pul, Math.sin(rad(62))));
      filoD = nor(sub(fa, esc(eje, pto(fa, eje))));
      base = add(mu, fa, 1.6 * S);
      if (acc === 'quieto' || acc === 'caminar') {
        // amartillada: la hoja sube junto a la cabeza, un poco hacia atrás y afuera, con el filo hacia adelante
        eje = nor(mv(tor.m, [-0.5, -0.55, 1])); filoD = mv(tor.m, [1, 0, 0.15]); filoD = nor(sub(filoD, esc(eje, pto(filoD, eje))));
        base = add(mu, eje, 1.2 * S);
      }
    } else { base = [26 * S, -14 * S, 1.2]; eje = nor([0.7, -0.7, 0]); filoD = [0, 0, 1]; if (len(cruz(eje, filoD)) < 0.1) filoD = [1, 0, 0]; filoD = nor(sub(filoD, esc(eje, pto(filoD, eje)))); }
    const lado = nor(cruz(eje, filoD));
    const h0 = add(base, eje, -5), h1 = add(base, eje, 9);
    ps.push(palo(h0, h1, 1.5, { mat: 'madera_vieja' }), esfera(...h0, 2, { mat: 'hierro_oxido' }));
    for (let k = 0; k < 3; k++) ps.push(cilindro(...add(base, eje, -3 + k * 4), 1.75, 1.6, { mat: 'cu_cuero_negro', eje }));
    const L = 58, Wd = 28, a0 = add(h1, filoD, -3), a1 = add(a0, eje, L), b0 = add(a0, filoD, Wd), b1 = add(add(a1, filoD, Wd + 3), eje, 2);
    ps.push(poliedro([add(a0, lado, 1.6), add(a0, lado, -1.6), add(a1, lado, 1.4), add(a1, lado, -1.4), add(b0, lado, 0.35), add(b0, lado, -0.35), add(b1, lado, 0.35), add(b1, lado, -0.35)], { mat: 'hierro', tono: -0.06 }));
    for (let k = 0; k < 4; k++) ps.push(elipE(add(add(mez(a0, a1, 0.2 + hr(k + 40) * 0.6), filoD, Wd * hr(k + 41) * 0.5), lado, (k % 2 ? 1 : -1) * 1.1), eje, [3 + hr(k) * 3, 2.4, 0.3], 'hierro_oxido', 0, filoD));
    ps.push(cilindro(...add(add(a1, eje, -7), filoD, 5), 2.6, 6, { mat: 'negro', eje: lado, resta: true }));
    ps.push(cilindro(...add(add(add(a1, eje, -7), filoD, 5), lado, -3), 2.6, 6, { mat: 'negro', eje: lado }));
    ps.push(palo(add(b0, filoD, -0.6), add(b1, filoD, -0.6), 0.75, { mat: 'cu_placa', r1: 0.75 }));
    for (let k = 0; k < 5; k++) ps.push(elipE(add(add(mez(a0, a1, 0.15 + hr(k) * 0.7), filoD, Wd * (0.5 + hr(k + 1) * 0.45)), lado, (k % 2 ? 1 : -1) * 0.5), eje, [(2 + hr(k + 2) * 4), 1.2 + hr(k + 3) * 2, 0.3], 'sangre', 0, filoD));
    ps.push(...encantar(add(b0, filoD, 0.3), add(b1, filoD, 0.3), 'sangre', f, 1.6, 9));
    // la sangre gotea del filo: gotas que se forman en el borde más bajo, se estiran y caen hasta el piso
    if (mu) {
      const nC = CUADROS[acc];
      for (let k = 0; k < 5; k++) {
        const q0 = mez(b0, b1, 0.12 + k * 0.19), q = q0[2] < mez(a0, a1, 0.12 + k * 0.19)[2] ? q0 : mez(a0, a1, 0.12 + k * 0.19), u = ((f / nC) + hr(k + 70)) % 1;
        ps.push(elipsoide(q[0], q[1], q[2] - 0.8 - u * 0.6, 0.7, 0.7, 1 + u * 0.8, { mat: 'cu_sangre_viva', tono: -0.15 }));
        const zc = q[2] * (1 - u * u);
        if (u > 0.15 && zc > 1) ps.push(elipsoide(q[0], q[1], zc, 0.55, 0.55, 1 + u * 1.6, { mat: 'cu_sangre_viva', tono: -0.1 }));
        if (k % 2 === 0) ps.push(elipsoide(q[0] + (hr(k) - 0.5) * 3, q[1] + (hr(k + 1) - 0.5) * 3, 0.25, 1.6 + hr(k + 2) * 1.6, 1.4 + hr(k + 3) * 1.4, 0.3, { mat: 'sangre' }));
      }
      // el charco que se junta debajo de la cuchilla
      const qm = mez(b0, b1, 0.5); ps.push(elipsoide(qm[0], qm[1], 0.3, 9, 7, 0.5, { mat: 'sangre', giro: 30 }), elipsoide(qm[0] + 2, qm[1] - 1, 0.45, 4.5, 3.5, 0.5, { mat: 'cu_sangre_viva', tono: -0.4 }));
    }
    if (golpe > 0.5) { const g: V3 = [b1[0], b1[1], 0.4]; for (let k = 0; k < 10; k++) { const a = hr(k) * TAU, d = 4 + hr(k + 1) * 16 * golpe; ps.push(elipsoide(g[0] + Math.cos(a) * d, g[1] + Math.sin(a) * d, 0.4 + hr(k + 2) * 10 * golpe, 1.3, 1.3, 1.3, { mat: 'cu_sangre_viva', tono: -0.2 })); } ps.push(elipsoide(g[0], g[1], 0.3, 14 * golpe, 11 * golpe, 0.5, { mat: 'sangre' })); }
  }
  // ---- la cadena con garfio en la mano izquierda: cuelga, se arroja (lanzar) o gira (especial)
  {
    const mu = r.mun[1];
    let pts: V3[];
    if (gira >= 0) {
      // remolino: la cadena gira a la altura de la cadera; garfios fantasma marcan la estela
      const a = gira * TAU * 1.25, R = 70, h = 26;
      const punta: V3 = [Math.cos(a) * R, Math.sin(a) * R, h];
      pts = bezier(mu, add(mez(mu, punta, 0.5), [0, 0, 6]), punta, 14);
      for (let k = 1; k <= 3; k++) { const a2 = a - k * 0.4; ps.push(...cadena(bezier(mu, [Math.cos(a2) * R * 0.5, Math.sin(a2) * R * 0.5, h + 4], [Math.cos(a2) * R, Math.sin(a2) * R, h], 6).slice(3), 4.4, 1.8, () => 'hierro')); ps.push(...garfio([Math.cos(a2) * R, Math.sin(a2) * R, h], [Math.cos(a2 - 1.2), Math.sin(a2 - 1.2), -0.3], 2.6 - k * 0.4, a2, 'hierro')); }
      for (let k = 0; k < 14; k++) { const a2 = a - (k / 14) * 2.4; ps.push(elipE([Math.cos(a2) * R, Math.sin(a2) * R, h], [-Math.sin(a2), Math.cos(a2), 0], [5.4, 0.9, 0.9], 'cu_placa', -0.05 - k * 0.03)); if (k % 3 === 0) ps.push(esfera(Math.cos(a2) * (R + 6), Math.sin(a2) * (R + 6), h - 3 - k, 0.9, { mat: 'cu_sangre_viva', tono: -0.2 })); }
      ps.push(...garfio(punta, [Math.cos(a - 1.2), Math.sin(a - 1.2), -0.3], 3, a, 'hierro'));
      ps.push(...brasas([0, 0, 2], 60, 10, 12, f, 230, 'sangre', 1.2));
    } else if (tiro > 0) {
      const dir = nor(mv(T([0, 0, 0], Rz(p.ty)).m, [1, 0, -0.05])), punta = add(add(mu, dir, 20 + tiro * 90), [0, 0, -tiro * 6]);
      pts = bezier(mu, add(mez(mu, punta, 0.5), [0, 0, 8 * (1 - tiro)]), punta, 16);
      ps.push(...garfio(punta, add(dir, [0, 0, -0.4]), 2.2, 0.4));
    } else {
      const punta = add(mu, [Math.sin(ph * TAU) * 3, 0, -26]);
      punta[2] = Math.max(punta[2], 4);
      pts = [mu, mez(mu, punta, 0.5), punta];
      ps.push(...garfio(punta, [0, 0, -1], 2, ph * 2));
    }
    ps.push(...cadena(pts, 3.6, 1.6, () => 'hierro'));
  }
  if (charco > 0) ps.push(elipsoide(14 * S, 0, 0.3, 40 * charco, 32 * charco, 0.6, { mat: 'sangre' }), elipsoide(18 * S, 4, 0.5, 18 * charco, 14 * charco, 0.6, { mat: 'cu_sangre_viva', tono: -0.4 }));
  return { piezas: ps };
}
jefe('verdugo', ['El Verdugo de Velmora', 'The Headsman of Velmora'], 110, 3, ['remolino de cadena', 'chain whirl'], verdugo);
