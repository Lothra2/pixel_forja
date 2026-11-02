import { registrar } from '../objeto';
import { MATERIALES } from '../materiales';
import { DIRS, type Dir } from '../figura';
import { ruido, cilindro, elipsoide, esfera, palo, poliedro, caja, masa, hueso, bulto, girarPiezas, type Comp, type Pieza, type V3, type Escena, type OpcComp } from '../render';

/**
 * Jefes de los actos 6 y 7 (Réquiem de Ceniza), con el mismo sistema que catalogo/jefes.ts:
 *
 * - La Campana que Ahoga (acto 6, Ysmeral): una sacerdotisa ahogada fundida con una campana de bronce gigante que es
 *   su cuerpo de la cintura para abajo. Cabello de algas, la cara hinchada y serena con los ojos cerrados, brazos
 *   larguísimos con grilletes y cadenas, percebes en el bronce y una luz de mar que le sale de adentro. El especial
 *   es un tañido: la campana se mece y suelta ondas que se abren por el piso y el aire. Al morir se hunde en el agua
 *   y la campana se raja.
 * - Aun-Saar, el Dios Sediento (acto 7, el jefe final): un coloso de mármol y oro agrietado, con el vacío negro en las
 *   grietas, sin ojos, una boca vertical enorme en el pecho, manos de oro que flotan a su alrededor y una corona de
 *   halos rotos. El especial es la sed: chupa hacia la boca la luz y la ceniza de todo alrededor. Al morir se parte:
 *   los pedazos quedan flotando y después caen.
 *
 * Cada uno se arma en un marco local (x adelante, y a la izquierda, z arriba, origen en el piso bajo el centro)
 * mirando al sureste y se gira entero al rumbo de cada dirección. Acciones: quieto (4 cuadros), caminar, atacar,
 * lanzar, herido (4), morir y especial (8). Ids: jefe_<id>_<accion>. Escala: una persona mide 61 (75 px).
 */

// ------------------------------------------------------------------ materiales propios
const M = MATERIALES;
M.j2_piel_ahogada = { rampa: ['#0d1112', '#182020', '#253030', '#344140', '#455352', '#586664', '#6d7976', '#848d88', '#9da39c'], ruido: 0.16, escala: 0.45, brillo: 0.5, patron: (p) => { const v = ruido(p[0] * 0.22, p[1] * 0.22, p[2] * 0.22); return Math.abs(v - 0.5) < 0.02 ? -0.12 : ruido(p[0] * 0.6, p[1] * 0.6, p[2] * 0.6) > 0.7 ? -0.06 : 0; } };
M.j2_piel_sombra = { rampa: ['#0a0d0e', '#121819', '#1c2424', '#273131', '#333e3d', '#404b49'], ruido: 0.2, escala: 0.5, brillo: 0.4 };
M.j2_bronce = { rampa: ['#070c0b', '#0c1513', '#121f1b', '#1a2b25', '#233930', '#2f483d', '#3d594b', '#4f6c5b', '#68836f'], ruido: 0.3, escala: 0.22, brillo: 0.55, patron: (p) => { const v = ruido(p[0] * 0.12, p[1] * 0.12, p[2] * 0.35); return v > 0.66 ? -0.14 : v < 0.28 ? 0.08 : 0; } };
M.j2_bronce_vivo = { rampa: ['#140d06', '#24170b', '#382410', '#4e3317', '#66441f', '#7f5729', '#986b35', '#b08345'], ruido: 0.2, escala: 0.3, brillo: 0.9 };
M.j2_percebe = { rampa: ['#1a1c18', '#2e302a', '#45463d', '#5d5e52', '#777767', '#90907d', '#a7a692'], ruido: 0.4, escala: 1.2 };
M.j2_alga = { rampa: ['#040705', '#091009', '#0f190d', '#152312', '#1c2e16', '#253a1b', '#2f4721'], ruido: 0.35, escala: 0.8, brillo: 0.55, patron: (p) => (Math.sin(p[2] * 1.4 + p[0] * 0.5 + p[1] * 0.3) > 0.7 ? -0.07 : 0) };
M.j2_tela = { rampa: ['#08090a', '#0f1112', '#171a1b', '#202425', '#2a2f2f', '#353a39', '#424745'], ruido: 0.3, escala: 0.7, patron: (p) => (ruido(p[0] * 0.25, p[1] * 0.25, p[2] * 0.12) > 0.66 ? -0.1 : 0) };
M.j2_estola = { rampa: ['#120d06', '#20170a', '#30230f', '#423115', '#56411c', '#6b5225'], ruido: 0.25, escala: 0.8, brillo: 0.4, patron: (p) => (Math.sin(p[2] * 2.2) > 0.6 ? 0.08 : 0) };
M.j2_hierro = { rampa: ['#0a0908', '#141110', '#1e1a17', '#2a231e', '#372d25', '#46392e'], ruido: 0.35, escala: 0.5, brillo: 0.3 };
M.j2_hueso = { rampa: ['#2a2620', '#443e33', '#615848', '#7f745f', '#9c9077', '#b6aa90'], ruido: 0.2, escala: 0.8 };
M.j2_labio = { rampa: ['#0c0a0d', '#151217', '#201b22', '#2c252e', '#38303a'], ruido: 0.2, escala: 0.8, brillo: 0.5 };
M.j2_bio = { rampa: ['#08403e', '#0e6660', '#18908a', '#38bcae', '#7ae2cc', '#c8fbec'], ruido: 0.35, escala: 0.35, emite: true };
M.j2_agua = { rampa: ['#020506', '#040a0d', '#071014', '#0b171b', '#101f23', '#16282c', '#1f3437'], ruido: 0.2, escala: 0.07, brillo: 0.8 };
M.j2_espuma = { rampa: ['#2e3c3e', '#465859', '#617474', '#7e9090', '#9cacaa'], ruido: 0.5, escala: 0.6 };
M.j2_marmol = { rampa: ['#1c1b1a', '#2f2d2b', '#46433f', '#605c56', '#7c776f', '#98928a', '#b3aca2', '#cbc4b8', '#e0d9cc'], ruido: 0.1, escala: 0.08, brillo: 0.4, patron: (p) => { const v = ruido(p[0] * 0.05 + p[2] * 0.08, p[1] * 0.05, p[2] * 0.03); return Math.abs(v - 0.5) < 0.018 ? -0.14 : 0; } };
M.j2_oro = { rampa: ['#1e1307', '#33220c', '#4d3512', '#6b4b19', '#8a6322', '#a97d2e', '#c69a3e', '#ddb758', '#f0d688', '#fcefc4'], ruido: 0.1, escala: 0.25, brillo: 1.1 };
M.j2_oro_viejo = { rampa: ['#150e07', '#25190c', '#392712', '#4f3818', '#674a21', '#805d2b', '#987237'], ruido: 0.25, escala: 0.35, brillo: 0.7 };
M.j2_vacio = { rampa: ['#000000', '#020104', '#06030c', '#0c0618', '#140a26', '#1e1036'], ruido: 0.7, escala: 0.5, emite: true };
M.j2_borde_vacio = { rampa: ['#1a0e30', '#2c1850', '#46287a', '#6a48a8', '#9a80d0'], ruido: 0.4, escala: 0.6, emite: true };
M.j2_luz = { rampa: ['#8c8676', '#b8b09c', '#dcd4c0', '#f2ecdc', '#fcf8ee', '#ffffff'], ruido: 0.3, escala: 0.3, emite: true };
M.j2_luz_oro = { rampa: ['#7a5418', '#a87a26', '#d2a440', '#ecc868', '#fae4a4', '#fff6dc'], ruido: 0.3, escala: 0.3, emite: true };
M.j2_ceniza = { rampa: ['#1f1b15', '#332c22', '#493f30', '#615440', '#7a6a51', '#948265'], ruido: 0.5, escala: 0.3 };
M.j2_diente = { rampa: ['#2a2418', '#463c28', '#66583c', '#8a7a56', '#ad9c74', '#cbbb94'], ruido: 0.15, escala: 0.8, brillo: 0.6 };

// ------------------------------------------------------------------ vectores y marcos (los mismos de jefes.ts)
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
const TAU = Math.PI * 2, PI = Math.PI;
/** Azar fijo por número (igual en todos los cuadros). */
const hr = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
/** Valor de una tabla de cuadros clave (admite cuadros fraccionarios). */
const K = (v: number[], f: number) => { const i = Math.floor(f), t = f - i; return lerp(v[Math.min(i, v.length - 1)], v[Math.min(i + 1, v.length - 1)], t); };
type M3 = [V3, V3, V3];
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
const lat = (d: V3): V3 => nor(Math.abs(d[2]) > 0.9 ? cruz(d, [1, 0, 0]) : cruz(d, [0, 0, 1]));
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
/** Gira `v` alrededor del eje `k` (unitario) `g` grados. */
function rotar(v: V3, k: V3, g: number): V3 { const a = rad(g), c = Math.cos(a), s = Math.sin(a); return add(add(esc(v, c), cruz(k, v), s), k, pto(k, v) * (1 - c)); }
/** Curva que cuelga entre dos puntos (cadena, soga). */
const colgar = (a: V3, b: V3, caida: number, n: number, piso = 0.8): V3[] => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, p = mez(a, b, t); return [p[0], p[1], Math.max(piso, p[2] - caida * 4 * t * (1 - t))] as V3; });
/** Eslabones de una cadena a lo largo de una polilínea (se remuestrea al paso del eslabón). */
function cadena(pts: V3[], paso: number, grueso: number, mat: string, hueco = false): Pieza[] {
  const ps: Pieza[] = [];
  const largos = [0];
  for (let i = 1; i < pts.length; i++) largos.push(largos[i - 1] + len(sub(pts[i], pts[i - 1])));
  const total = largos[largos.length - 1], n = Math.max(2, Math.floor(total / paso));
  let j = 0;
  for (let i = 0; i < n; i++) {
    const s = (i + 0.5) * (total / n);
    while (j < pts.length - 2 && largos[j + 1] < s) j++;
    const t = (s - largos[j]) / Math.max(1e-6, largos[j + 1] - largos[j]), c = mez(pts[j], pts[j + 1], t), dir = nor(sub(pts[j + 1], pts[j]));
    const lado = i % 2 ? lat(dir) : cruz(dir, lat(dir));
    ps.push(elipE(c, dir, [paso * 0.66, grueso * 0.45 + paso * 0.2, grueso], mat, (i % 2 ? 0.04 : -0.04), lado));
    if (hueco) ps.push({ ...elipE(c, dir, [paso * 0.4, paso * 0.12, grueso * 1.6], mat, 0, lado), resta: true } as Pieza);
  }
  return ps;
}
/** Anillo de ondas chatas en el piso o en el aire (centro, radio, normal), que se apaga con `apaga`. */
function aro(c: V3, r: number, n: V3, mat: string, tono: number, grueso: number, hueco = 0): Pieza[] {
  const nn = nor(n), u = lat(nn), w = cruz(nn, u), m = clamp(Math.round(r * 0.45), 8, 56), ps: Pieza[] = [];
  for (let i = 0; i < m; i++) {
    if (hueco && hr(i * 7.3 + r) < hueco) continue;
    const a = (i / m) * TAU, d = add(esc(u, Math.cos(a)), w, Math.sin(a)), t = add(esc(u, -Math.sin(a)), w, Math.cos(a));
    ps.push({ k: 'elip', c: add(c, d, r), ex: t, ey: d, ez: nn, r: [(TAU * r) / m * 0.56, grueso, grueso * 0.5], mat, tono } as Pieza);
  }
  return ps;
}

// ------------------------------------------------------------------ registro
type Acc = 'quieto' | 'caminar' | 'atacar' | 'lanzar' | 'herido' | 'morir' | 'especial';
const ACCIONES: Acc[] = ['quieto', 'caminar', 'atacar', 'lanzar', 'herido', 'morir', 'especial'];
const CUADROS: Record<Acc, number> = { quieto: 4, caminar: 8, atacar: 8, lanzar: 8, herido: 4, morir: 8, especial: 8 };
const NOMBRES: Record<Acc, [string, string]> = { quieto: ['quieto', 'idle'], caminar: ['camina', 'walk'], atacar: ['ataca', 'attack'], lanzar: ['lanza', 'cast'], herido: ['recibe golpe', 'get hit'], morir: ['muere', 'death'], especial: ['especial', 'special'] };
const RUMBO: Record<Dir, number> = { se: 0, s: 45, so: 90, o: 135, no: 180, n: 225, ne: 270, e: 315 };
interface Res { piezas: Pieza[]; resplandor?: Escena['resplandor']; sinSombra?: boolean }
type Armado = (acc: Acc, f: number) => Res;

/** Los jefes de los actos 6 y 7: id, nombre, alto en unidades del mundo (sin corona ni efectos) y huella en celdas. */
export const JEFES2: { id: string; nombre: [string, string]; alto: number; huella: number }[] = [];

function jefe(id: string, nombre: [string, string], alto: number, huella: number, especial: [string, string], armar: Armado) {
  JEFES2.push({ id, nombre, alto, huella });
  for (const acc of ACCIONES) {
    const [es, en] = acc === 'especial' ? especial : NOMBRES[acc];
    registrar({
      id: `jefe_${id}_${acc}`, nombre: [`${nombre[0]} · ${es}`, `${nombre[1]} · ${en}`], tema: 'monstruos',
      variantes: [...DIRS], cuadros: CUADROS[acc], t: acc === 'quieto' ? 6 : 3, huella: [huella, huella], bloquea: true,
      armar: (v, f) => {
        const r = armar(acc, f), g = RUMBO[v as Dir], c = Math.cos(rad(g)), s = Math.sin(rad(g));
        const res = r.resplandor ? { ...r.resplandor, c: [r.resplandor.c[0] * c - r.resplandor.c[1] * s, r.resplandor.c[0] * s + r.resplandor.c[1] * c, r.resplandor.c[2]] as V3 } : undefined;
        return { piezas: girarPiezas(r.piezas, g), resplandor: res, sinSombra: r.sinSombra };
      },
    });
  }
}
/** Corta lo que quedó bajo el piso (se arma al final). */
const bajoPiso = () => caja(0, 0, -200, 1200, 1200, 200, { mat: 'j2_agua', resta: true });
