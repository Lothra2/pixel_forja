import { registrar } from '../objeto';
import { MATERIALES } from '../materiales';
import { DIRS, type Dir } from '../figura';
import { ruido, cilindro, elipsoide, esfera, palo, poliedro, caja, masa, hueso, bulto, girarPiezas, type Comp, type Pieza, type V3, type Escena, type OpcComp } from '../render';
import { transformar } from '../actos45';

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
M.j2_piel_ahogada = { rampa: ['#0e0e12', '#1a1a20', '#28282f', '#383840', '#4a4952', '#5e5c65', '#74717a', '#8b8790', '#a49fa5'], ruido: 0.16, escala: 0.45, brillo: 0.5, patron: (p) => { const v = ruido(p[0] * 0.22, p[1] * 0.22, p[2] * 0.22); return Math.abs(v - 0.5) < 0.02 ? -0.12 : ruido(p[0] * 0.6, p[1] * 0.6, p[2] * 0.6) > 0.7 ? -0.06 : 0; } };
M.j2_piel_sombra = { rampa: ['#0a0d0e', '#121819', '#1c2424', '#273131', '#333e3d', '#404b49'], ruido: 0.2, escala: 0.5, brillo: 0.4 };
M.j2_bronce = { rampa: ['#060908', '#0b110f', '#111a16', '#18241f', '#203028', '#2a3d33', '#364b3f', '#455a4c', '#57695a'], ruido: 0.3, escala: 0.22, brillo: 0.55, patron: (p) => { const v = ruido(p[0] * 0.12, p[1] * 0.12, p[2] * 0.35); return v > 0.66 ? -0.14 : v < 0.28 ? 0.08 : 0; } };
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
M.j2_marmol = { rampa: ['#161514', '#25231f', '#36332e', '#4a4640', '#605b53', '#777168', '#8f887d', '#a69e92', '#bbb3a5', '#cdc5b6'], ruido: 0.14, escala: 0.08, brillo: 0.45, patron: (p) => { const v = ruido(p[0] * 0.05 + p[2] * 0.08, p[1] * 0.05, p[2] * 0.03); return (Math.abs(v - 0.5) < 0.018 ? -0.14 : 0) + (ruido(p[0] * 0.04, p[1] * 0.04, p[2] * 0.04) > 0.62 ? -0.08 : 0); } };
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
/** Cuánto dobla el golpe en cada cuadro de 'herido': impacto, máximo, vuelta y un poco pasado adelante (como jefes.ts). */
const GOLPE = [0.8, 1, 0.42, -0.1];
/**
 * Línea de tiempo de 'atacar': estos ataques se armaron con el contacto en el cuadro 5 (el 4 era medio barrido), pero el
 * juego muestra el cuadro 4 en el instante del golpe. Se leen las poses en estos tiempos para que el 4 sea el contacto,
 * el arma quede arriba en 2 y 3 (y subiendo en 1) y la salida pesada vaya de 5 a 7.
 */
const TIEMPO_ATAQUE = [0, 1.5, 2.5, 3, 5, 5.6, 6.3, 7];
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
        const r = armar(acc, acc === 'atacar' ? TIEMPO_ATAQUE[f] : f), g = RUMBO[v as Dir], c = Math.cos(rad(g)), s = Math.sin(rad(g));
        const res = r.resplandor ? { ...r.resplandor, c: [r.resplandor.c[0] * c - r.resplandor.c[1] * s, r.resplandor.c[0] * s + r.resplandor.c[1] * c, r.resplandor.c[2]] as V3 } : undefined;
        return { piezas: girarPiezas(r.piezas, g), resplandor: res, sinSombra: r.sinSombra };
      },
    });
  }
}
/** Corta lo que quedó bajo el piso (se arma al final). */
const bajoPiso = () => caja(0, 0, -200, 1200, 1200, 200, { mat: 'j2_agua', resta: true });

// ================================================================== 1. LA CAMPANA QUE AHOGA
/**
 * 120 de alto. De la cintura para abajo es una campana de bronce verdoso de 62 de boca, con percebes, anémonas que
 * brillan y dos vueltas de cadena; la carne de las caderas se funde con la corona de la campana. Arriba, el torso
 * hinchado y pálido de una sacerdotisa con jirones de hábito y la estola, la cabeza con los ojos cerrados, la boca
 * entreabierta que canta, una corona de espinas de pescado y el pelo de algas que cae sobre el bronce. Brazos de 72
 * con dedos largos, grilletes y cadenas que se arrastran. Adentro de la campana vive una luz de mar.
 */
function campanaAhoga(acc: Acc, f: number): Res {
  const n = CUADROS[acc], ph = f / n, w = ph * TAU;
  const R = 31, H = R * 1.25;
  let px = 0, zb = 4, tilt = 0, roll = 0, tp = 6, ty = 0, cab = 12, cabR = 0, hund = 0, raja = 0, glow = 0.5, orbe = 0, viento = 0.25, labio = 0.15, golpe = 0;
  const mano: V3[] = [[14, -40, 10], [12, 40, 12]];
  const ondas: number[] = [];
  if (acc === 'quieto') {
    const b = Math.sin(w);
    zb = 4 + b * 1.5; tilt = b * 2; cab = 12 + b * 2; tp = 6 - b * 2; glow = 0.5 + 0.15 * b;
    mano[0] = [14 + Math.sin(w) * 3, -40, 10 + b * 2]; mano[1] = [12 + Math.sin(w + 1.3) * 3, 40, 12 - b * 2];
  } else if (acc === 'caminar') {
    // se desliza: la campana se inclina adelante, las manos se arrastran atrás y el pelo vuela
    zb = 6 + Math.sin(w * 2) * 1.5; tilt = 9 + Math.sin(w * 2) * 2; roll = Math.sin(w) * 3; px = Math.sin(w) * 1.5; viento = 1; tp = 14; cab = 6;
    mano[0] = [-8 + Math.sin(w) * 8, -42, 6 + Math.abs(Math.sin(w)) * 4]; mano[1] = [-8 - Math.sin(w) * 8, 42, 6 + Math.abs(Math.cos(w)) * 4];
    glow = 0.5 + 0.2 * Math.sin(w * 2);
  } else if (acc === 'atacar') {
    // el brazo derecho sube por detrás y cae de golpe adelante con los dedos abiertos
    ty = K([0, 12, 20, 22, -16, -22, -10, 0], f); tp = K([6, 0, -6, -6, 18, 24, 14, 6], f); tilt = K([0, -3, -5, -5, 6, 8, 4, 0], f); cab = K([12, 6, 0, 0, 16, 20, 14, 12], f);
    mano[0] = [K([14, 0, -10, -6, 50, 66, 42, 14], f), K([-40, -46, -42, -36, -20, -12, -30, -40], f), K([10, 62, 100, 112, 50, 12, 10, 10], f)];
    mano[1] = [K([12, 18, 22, 22, 6, 2, 8, 12], f), 40, K([12, 20, 26, 26, 14, 10, 12, 12], f)];
    golpe = K([0, 0, 0, 0, 0.6, 1, 0.4, 0], f); labio = K([0.15, 0.3, 0.5, 0.6, 0.9, 0.7, 0.4, 0.15], f);
  } else if (acc === 'lanzar') {
    // junta las manos adelante: entre ellas crece una esfera de agua que brilla y sale empujada
    orbe = K([0, 0.25, 0.5, 0.8, 1, 0.7, 0.2, 0], f); glow = 0.5 + orbe * 0.8; labio = 0.2 + orbe * 0.6;
    for (const [i, s] of [[0, -1], [1, 1]] as [number, number][]) mano[i] = [K([14, 22, 28, 32, 34, 54, 44, 14], f), s * K([40, 30, 18, 11, 9, 12, 26, 40], f), K([10, 36, 54, 62, 64, 58, 32, 10], f)];
    tp = K([6, 2, -2, -4, -4, 16, 12, 6], f); cab = K([12, 6, 2, 0, 0, 16, 14, 12], f);
  } else if (acc === 'herido') {
    const k = GOLPE[f % 4];
    tilt = -10 * k; tp = 6 - 16 * k; cab = 12 - 26 * k; cabR = 8 * k; glow = 0.5 + k * 0.6; labio = 0.15 + k * 0.7;
    for (const [i, s] of [[0, -1], [1, 1]] as [number, number][]) mano[i] = [14 - 12 * k, s * (40 + 12 * k), 10 + 22 * k];
    if (k > 0.5) ondas.push(k * 0.35);
  } else if (acc === 'morir') {
    // grita al cielo, la campana se raja, se ladea y se hunde en el agua; los brazos quedan tendidos en la superficie
    hund = K([0, 0, 3, 8, 14, 20, 24, 26], f); raja = K([0, 0.35, 0.7, 1, 1, 1, 1, 1], f);
    tilt = K([0, -6, -4, 4, 10, 14, 16, 16], f); roll = K([0, 2, 5, 9, 12, 14, 16, 16], f);
    tp = K([6, -12, -8, 14, 30, 42, 50, 54], f); cab = K([12, -24, -12, 20, 34, 40, 44, 46], f); glow = K([1, 1.6, 1.1, 0.6, 0.3, 0.1, 0, 0], f); labio = K([0.2, 1, 0.9, 0.5, 0.3, 0.2, 0.15, 0.15], f);
    for (const [i, s] of [[0, -1], [1, 1]] as [number, number][]) mano[i] = [K([14, 4, 12, 30, 44, 50, 54, 56], f), s * K([40, 54, 58, 52, 48, 46, 46, 46], f), K([10, 74, 62, 30, 8, 2, 1.5, 1.5], f)];
    if (f >= 1 && f <= 3) ondas.push((f - 1) / 3);
  } else if (acc === 'especial') {
    // el tañido: la campana se mece de un lado al otro, ella se arquea con los brazos abiertos y canta; en el golpe
    // salen dos ondas de luz de mar que se abren por el piso y por el aire
    tilt = K([0, -12, -20, 16, 22, -10, -6, 0], f); tp = K([6, -4, -12, -18, -20, -14, -4, 4], f); cab = K([12, 0, -14, -26, -28, -20, -6, 8], f);
    glow = K([0.5, 0.8, 1.2, 2.2, 2, 1.6, 1.1, 0.7], f); labio = K([0.15, 0.3, 0.6, 1, 1, 0.8, 0.4, 0.2], f);
    for (const [i, s] of [[0, -1], [1, 1]] as [number, number][]) mano[i] = [K([14, 6, 0, -4, -4, 0, 8, 14], f), s * K([40, 52, 64, 72, 72, 66, 54, 42], f), K([10, 30, 56, 80, 84, 70, 40, 14], f)];
    if (f >= 3) ondas.push((f - 2.6) / 5.4);
    if (f >= 5) ondas.push((f - 4.6) / 5.4);
  }
  const ps: Pieza[] = [];
  const Tb: Tr = T([px, 0, zb + H * 0.5 - hund], Ry(tilt), Rx(roll));
  const up = nor(Tb.m[2]), bu = nor(Tb.m[0]), bw = nor(Tb.m[1]);
  const A = (t: number): V3 => ap(Tb, [0, 0, -H * 0.5 + t * H]);
  const rprof = (t: number) => (t < 0.14 ? lerp(R * 0.98, R * 0.8, t / 0.14) : t < 0.35 ? lerp(R * 0.8, R * 0.66, (t - 0.14) / 0.21) : t < 0.72 ? lerp(R * 0.66, R * 0.6, (t - 0.35) / 0.37) : lerp(R * 0.6, R * 0.45, (t - 0.72) / 0.2));
  const sobre = (t: number, a: number, fuera = 0): V3 => add(add(A(t), bu, Math.cos(a) * (rprof(t) + fuera)), bw, Math.sin(a) * (rprof(t) + fuera));
  const tor = cmp(Tb, T([0, 0, H * 0.42], Ry(tp), Rz(ty)));
  const skin = 'j2_piel_ahogada', m: OpcComp = { mat: skin }, BZ = 'j2_bronce';
  const pul = (k: number) => 0.5 + 0.5 * Math.sin(w * (acc === 'quieto' ? 1 : 2) + k * 2.1);

  // ---- la campana y las caderas: una sola masa, el bronce se vuelve carne en la corona
  const cs: Comp[] = [
    hueso(A(0.06), A(0.14), R * 0.92, R * 0.8, { mat: BZ }), hueso(A(0.14), A(0.35), R * 0.8, R * 0.66, { mat: BZ }), hueso(A(0.35), A(0.72), R * 0.66, R * 0.6, { mat: BZ }),
    hueso(A(0.72), A(0.86), R * 0.6, R * 0.48, { mat: BZ }), bulto(A(0.86), [R * 0.48, R * 0.48, R * 0.2], { ejes: [bu, bw, up], mat: BZ }),
    bT(tor, [0, 0, -2], [13, 15, 7], m), bT(tor, [0, 0, 4], [10, 12, 8], m),
  ];
  ps.push(masa(cs, { mat: BZ, suave: 3.2 }));
  // la boca plana, el labio grueso y lo hueco
  ps.push(cilindro(...add(A(0), up, -R * 1.5), R * 1.7, R * 1.5, { mat: BZ, eje: up, resta: true }));
  ps.push(cilindro(...A(0), R * 1.03, H * 0.1, { mat: BZ, r1: R * 0.9, eje: up, tono: 0.05 }));
  ps.push(cilindro(...add(A(0), up, -1), R * 0.84, H * 0.78, { mat: BZ, r1: R * 0.45, eje: up, resta: true }));
  ps.push(cilindro(...A(0.35), R * 0.5, H * 0.3, { mat: 'j2_bio', r1: R * 0.36, eje: up, tono: -0.25 + glow * 0.2 }));
  // franjas en relieve con la inscripción (dientes de bronce claro)
  for (const t of [0.3, 0.66]) {
    ps.push(cilindro(...A(t), rprof(t) + 0.8, H * 0.04, { mat: BZ, eje: up, tono: 0.07 }));
    for (let k = 0; k < 20; k++) { const a = (k / 20) * TAU; ps.push(elipE(sobre(t + 0.06, a, 0.3), up, [1.6, 0.9, 0.5], 'j2_bronce_vivo', -0.1, add(esc(bu, -Math.sin(a)), bw, Math.cos(a)))); }
  }
  // la grieta: sube del labio en zigzag y al final abre el bronce
  if (raja > 0) {
    // la grieta baja de la corona hacia el labio, y otra se abre de costado
    for (const [a0, t0, t1] of [[rad(35), 0.92, 0.1], [rad(-40), 0.8, 0.35]] as [number, number, number][]) {
      const nt = Math.ceil(raja * 6);
      let p0 = sobre(t0, a0, 0.5);
      for (let k = 1; k <= nt; k++) { const q = sobre(t0 + ((t1 - t0) * k) / 6, a0 + (k % 2 ? 0.08 : -0.07), 0.5); ps.push(palo(p0, q, 1 + (1 - k / 7) * 0.9, { mat: 'j2_vacio' })); p0 = q; }
    }
    if (raja >= 1) {
      const a0 = rad(35);
      ps.push({ ...elipE(sobre(0.62, a0, 0), up, [H * 0.32, 2.4, 3.2], BZ, 0, add(esc(bu, -Math.sin(a0)), bw, Math.cos(a0))), resta: true } as Pieza, elipE(sobre(0.62, a0, -2.4), up, [H * 0.26, 1.2, 1.8], 'j2_bio', 0.05));
      // pedazos de bronce que se soltaron y flotan en el agua
      for (let k = 0; k < 4; k++) { const a = a0 + (hr(k) - 0.5) * 1.2, d = R + 6 + hr(k * 3) * 14; ps.push(elipsoide(px + Math.cos(a) * d, Math.sin(a) * d, 0.8, 3 + hr(k) * 3, 2 + hr(k + 1) * 2, 1, { mat: BZ, giro: hr(k * 7) * 180 })); }
    }
  }
  // percebes en racimos y anémonas que laten con luz de mar
  for (let k = 0; k < 16; k++) {
    const t = 0.08 + hr(k * 3.1) * 0.6, a = hr(k * 5.7) * TAU, nrm = nor(add(add(esc(bu, Math.cos(a)), bw, Math.sin(a)), up, 0.25)), c0 = sobre(t, a, -0.3), u2 = lat(nrm), w2 = cruz(nrm, u2);
    for (let j = 0; j < 4; j++) { const b = add(add(c0, u2, (hr(k * 11 + j) - 0.5) * 6), w2, (hr(k * 13 + j) - 0.5) * 6), r0 = 0.9 + hr(k + j * 7) * 0.9; ps.push(cilindro(...b, r0, 1.3 + hr(k * 2 + j) * 1.4, { mat: 'j2_percebe', r1: r0 * 0.5, eje: nrm })); }
  }
  for (let k = 0; k < 6; k++) { const t = 0.15 + hr(k * 9.1) * 0.55, a = hr(k * 4.3 + 1) * TAU, kk = pul(k); ps.push(esfera(...sobre(t, a, 0.6), 1.1 + kk * 0.6, { mat: 'j2_bio', tono: -0.3 + kk * 0.35 * glow + 0.1 })); }
  // dos vueltas de cadena alrededor del bronce, y una que se arrastra atrás
  for (const [t, inc] of [[0.25, 0.04], [0.55, -0.05]] as [number, number][]) {
    const pts: V3[] = [];
    for (let k = 0; k <= 26; k++) { const a = (k / 26) * TAU; pts.push(add(sobre(t + Math.sin(a) * inc, a, 1.2), [0, 0, 0])); }
    ps.push(...cadena(pts, 4.4, 1.1, 'j2_hierro'));
  }
  ps.push(...cadena(colgar(sobre(0.25, PI, 1.5), [px - R - 30, -10, 0.8], 8, 6), 4.4, 1.1, 'j2_hierro'));

  // ---- el torso hinchado, los jirones del hábito y la estola
  const cuerpo: Comp[] = [
    hT(tor, [0, 0, 6], [1, 0, 24], 10, 13, m), bT(tor, [1, 0, 24], [10, 15, 10], m), bT(tor, [-2, 0, 30], [8, 13, 6], m),
    hT(tor, [0, 0, 33], [2, 0, 44], 5, 4.6, m),
  ];
  for (const s of [1, -1]) cuerpo.push(bT(tor, [3.5, s * 6.5, 22], [5, 5.5, 5], m), bT(tor, [-1, s * 13, 31], [6, 6, 5], m), hT(tor, [1, s * 3, 35], [-1, s * 14, 34], 3, 3.6, m), bT(tor, [5, s * 9, 12], [4, 5, 7], { ...m, k: 2 }));
  ps.push(masa(cuerpo, { mat: skin, suave: 2.4 }));
  // venas oscuras bajo la piel
  for (let k = 0; k < 5; k++) { const a = hr(k * 3) * 2 - 1, p0 = ap(tor, [9.5, a * 8, 10 + k * 3.5]), p1 = ap(tor, [10.5, a * 8 + (hr(k) - 0.5) * 8, 16 + k * 3]); ps.push(elipE(mez(p0, p1, 0.5), sub(p1, p0), [len(sub(p1, p0)) * 0.55, 0.45, 0.45], 'j2_piel_sombra', -0.05)); }
  /** Tira que cuelga desde `p` y se acuesta sobre la campana (no la atraviesa); se mece con el cuadro. */
  const local = (p: V3): V3 => { const d = sub(p, Tb.o); return [pto(d, bu), pto(d, bw), pto(d, up)]; };
  const caer = (p: V3, L: number, nseg: number, sem: number, amp: number, afuera: V3): V3[] => {
    const pts: V3[] = [p];
    let q = p;
    for (let i = 1; i <= nseg; i++) {
      const t = i / nseg, sw = Math.sin(w + sem * 1.7 + t * 2.4) * amp * t;
      let d = nor(add(add(add([0, 0, -1], afuera, 0.35 + t * 0.2), mv(tor.m, [-1, 0, 0]), viento * (0.3 + t * 0.6)), lat(afuera), sw * 0.08));
      let nq = add(q, d, L / nseg);
      // sobre la campana: se empuja afuera del perfil
      const l = local(nq), tz = (l[2] + H * 0.5) / H;
      if (tz > -0.05 && tz < 1) { const rr = Math.hypot(l[0], l[1]), need = (tz < 0.95 ? rprof(clamp(tz, 0, 0.92)) : R * 0.4) + 1.6; if (rr < need) { const k = need / Math.max(0.01, rr); nq = ap(Tb, [l[0] * k, l[1] * k, l[2]]); } }
      d = nor(sub(nq, q)); q = nq; pts.push([q[0], q[1], Math.max(0.6, q[2])]);
    }
    return pts;
  };
  for (let k = 0; k < 9; k++) {
    // jirones del hábito: tiras chatas que caen del pecho y los hombros
    const a = -PI * 0.75 + (k / 8) * PI * 1.5, base = ap(tor, [Math.cos(a) * 11, Math.sin(a) * 14, 24 + hr(k) * 6]), af = nor(mv(tor.m, [Math.cos(a), Math.sin(a), 0]));
    const pts = caer(base, 30 + hr(k * 3) * 22, 5, k, 3, af);
    for (let i = 0; i < pts.length - 1; i++) { const t = i / (pts.length - 1); ps.push(elipE(mez(pts[i], pts[i + 1], 0.5), sub(pts[i + 1], pts[i]), [len(sub(pts[i + 1], pts[i])) * 0.62, 3.2 * (1 - t * 0.5), 0.7], 'j2_tela', -t * 0.08, mv(tor.m, [-Math.sin(a), Math.cos(a), 0]))); }
  }
  for (const s of [1, -1]) {
    const pts = caer(ap(tor, [6, s * 5, 36]), 46, 6, 20 + s, 1.5, nor(mv(tor.m, [1, s * 0.3, 0])));
    for (let i = 0; i < pts.length - 1; i++) ps.push(elipE(mez(pts[i], pts[i + 1], 0.5), sub(pts[i + 1], pts[i]), [len(sub(pts[i + 1], pts[i])) * 0.6, 2.4, 0.6], 'j2_estola', 0, mv(tor.m, [0, 1, 0])));
  }

  // ---- la cabeza: hinchada, serena, los ojos cerrados y la boca entreabierta
  const cabT = cmp(tor, T([3, 0, 48], Ry(cab), Rx(cabR)));
  const cc: Comp[] = [
    bT(cabT, [0, 0, 0], [8, 7, 8.5], m), bT(cabT, [3.5, 0, -3.5], [5.5, 6, 5.5], m), bT(cabT, [7, 0, -6.5], [3, 3.6, 2.4], m), bT(cabT, [7.8, 0, -0.6], [1.5, 1.1, 2.2], m), bT(cabT, [6.4, 0, 2.6], [2, 6, 1.7], m),
  ];
  for (const s of [1, -1]) cc.push(bT(cabT, [5, s * 3.9, -2.6], [3.6, 3.1, 3.1], m));
  ps.push(masa(cc, { mat: skin, suave: 1.4 }));
  for (const s of [1, -1]) ps.push(elipE(ap(cabT, [7.2, s * 2.7, 0.9]), mv(cabT.m, [1, 0, 0]), [1.2, 2.2, 1.3], 'j2_piel_sombra', 0, mv(cabT.m, [0, 1, 0])), elipE(ap(cabT, [7.9, s * 2.7, 0.7]), mv(cabT.m, [1, 0, 0]), [0.8, 2, 1.1], skin, 0.06, mv(cabT.m, [0, 1, 0])));
  ps.push(elipE(ap(cabT, [8.6, 0, -4.4]), mv(cabT.m, [1, 0, 0]), [0.9, 2.3, 0.5 + labio * 1.7], 'j2_labio', 0, mv(cabT.m, [0, 1, 0])));
  // corona de espinas de pescado
  const corona: Comp[] = [];
  for (let k = 0; k < 9; k++) { const a = PI * 0.25 + (k / 8) * PI * 1.5, b = ap(cabT, [Math.cos(a) * 6.2 - 0.5, Math.sin(a) * 6.2, 5.5]), tip = add(b, nor(mv(cabT.m, [Math.cos(a) * 0.5 - 0.3, Math.sin(a) * 0.5, 1])), 7 + hr(k) * 5); corona.push(hueso(b, tip, 1, 0.15, { mat: 'j2_hueso' })); }
  ps.push(masa(corona, { mat: 'j2_hueso', suave: 0.4 }));
  // el pelo de algas: hebras que salen del cráneo y caen por la espalda sobre la campana
  const pelo: Comp[][] = [[], []];
  for (let k = 0; k < 13; k++) {
    const a = PI * 0.45 + (k / 12) * PI * 1.1, raiz = ap(cabT, [Math.cos(a) * 6.8 - 1, Math.sin(a) * 6.6, 3 - Math.abs(Math.sin(a)) * 3]);
    const pts = caer(raiz, 52 + hr(k * 7) * 30, 7, k + 30, 4, nor(mv(tor.m, [Math.cos(a), Math.sin(a), 0])));
    for (let i = 0; i < pts.length - 1; i++) { const t = i / (pts.length - 1); pelo[k % 2].push(hueso(pts[i], pts[i + 1], 1.9 * (1 - t * 0.6), 1.9 * (1 - (t + 0.14) * 0.6), { mat: hr(k) < 0.3 ? 'j2_tela' : 'j2_alga', tono: -t * 0.05 })); }
  }
  for (const pl of pelo) ps.push(masa(pl, { mat: 'j2_alga', suave: 1.1 }));

  // ---- los brazos larguísimos, con grilletes y cadenas
  for (const [i, s] of [[0, -1], [1, 1]] as [number, number][]) {
    const sh = ap(tor, [-1, s * 17, 33]), meta: V3 = [mano[i][0] + px, mano[i][1], Math.max(1.5, mano[i][2])];
    const [codo, mun] = ik(sh, meta, 37, 37, mv(tor.m, [-0.5, s * 0.85, -0.2]));
    const ua = nor(sub(codo, sh)), fa = nor(sub(mun, codo)), lt = nor(cruz(fa, [0, 0, 1])), ab = nor(cruz(lt, fa));
    const br: Comp[] = [hT(tor, [0, s * 9, 33], [-1, s * 15, 33], 4, 4.6, m), bulto(add(sh, ua, 3), [7, 5.4, 5], { ...m, eje: ua }), hueso(sh, codo, 4, 3, m), bulto(mez(sh, codo, 0.4), [9, 4.2, 4], { ...m, eje: ua }), hueso(codo, mun, 3, 2.2, m), bulto(mez(codo, mun, 0.28), [8, 3.4, 3.2], { ...m, eje: fa }), bulto(add(mun, fa, 3.5), [5, 4, 1.8], { ...m, eje: fa })];
    // dedos largos y huesudos que se abren cuando golpea o canta
    const abre = 0.35 + golpe * 0.6 + (acc === 'especial' ? 0.5 : 0);
    for (const k of [-1.5, -0.5, 0.5, 1.5]) {
      const b = add(add(mun, fa, 7), lt, k * 2.2), d = nor(add(add(fa, lt, k * 0.18 * abre), ab, 0.25 * (1 - abre))), mid = add(b, d, 7.5), d2 = nor(add(d, ab, 0.6 * (1 - abre) + 0.15)), tip = add(mid, d2, 7);
      br.push(hueso(b, mid, 1.2, 0.95, m), hueso(mid, tip, 0.95, 0.3, m));
      ps.push(elipE(add(tip, d2, -0.6), d2, [1.2, 0.5, 0.4], 'j2_labio'));
    }
    br.push(hueso(add(add(mun, fa, 3), lt, s * 3.5), add(add(add(mun, fa, 8), lt, s * 7), ab, 2), 1.3, 0.4, m));
    ps.push(masa(br, { mat: skin, suave: 1.8 }));
    // grillete y cadena que cuelga hasta el piso y se arrastra
    ps.push(cilindro(...add(mun, fa, -2.4), 3.6, 3, { mat: 'j2_hierro', eje: fa }));
    const piso: V3 = [meta[0] - 18 - hr(i) * 10, meta[1] + s * 8, 0.8];
    ps.push(...cadena(colgar(add(mun, fa, -1), piso, 16, 7, 1), 3.6, 1.2, 'j2_hierro'));
  }
  // ---- la esfera de agua que crece entre las manos (lanzar)
  if (orbe > 0.02) {
    const c = acc === 'lanzar' && f >= 5 ? add(mez([mano[0][0] + px, mano[0][1], mano[0][2]], [mano[1][0] + px, mano[1][1], mano[1][2]], 0.5), [(f - 4) * 16, 0, 2]) : mez([mano[0][0] + px, mano[0][1], mano[0][2]], [mano[1][0] + px, mano[1][1], mano[1][2]], 0.5);
    ps.push(esfera(...c, 3 + orbe * 7, { mat: 'j2_bio', tono: 0.1 }), esfera(...add(c, [1.5, 0, 1.5]), 1.5 + orbe * 3, { mat: 'j2_espuma', tono: 0.15 }));
    ps.push(...aro(c, 5 + orbe * 9, nor([Math.cos(w), Math.sin(w), 0.6]), 'j2_bio', -0.1, 0.7, 0.3));
  }
  // ---- gotas de luz que caen del labio de la campana
  for (let k = 0; k < 6; k++) { const a = hr(k * 2.3) * TAU, u = (ph + hr(k * 9)) % 1, r0 = sobre(0.04, a, 0.8); ps.push(esfera(r0[0], r0[1], r0[2] - u * Math.max(1, r0[2] - 0.6), 0.7 * (1 - u * 0.5), { mat: 'j2_bio', tono: -0.15 - u * 0.3 })); }
  // ---- las ondas del tañido: aros de luz de mar que se abren por el piso y por el aire
  for (const u of ondas) {
    if (u <= 0 || u > 1.05) continue;
    const rr = R + 6 + u * 120;
    ps.push(...aro([px, 0, 1], rr, [0, 0, 1], 'j2_bio', 0.12 - u * 0.5, 2.2 - u * 1.2, u * 0.35));
    ps.push(...aro(A(0.5), rr * 0.75, nor(add(up, bu, 0.15)), 'j2_bio', 0.05 - u * 0.5, 1.4 - u * 0.7, 0.2 + u * 0.4));
    ps.push(...aro([px, 0, 0.8], rr * 0.86, [0, 0, 1], 'j2_espuma', -0.1 - u * 0.3, 1 - u * 0.5, 0.4));
  }
  ps.push(bajoPiso());
  // el agua donde se apoya (y donde se hunde)
  ps.push(elipsoide(px, 0, 0, R * 1.55 + hund * 0.4, R * 1.45 + hund * 0.4, 0.5, { mat: 'j2_agua' }));
  ps.push(...aro([px, 0, 0.6], R * 1.05 + hund * 0.25, [0, 0, 1], 'j2_bio', -0.2 + glow * 0.18, 1.6, 0.25));
  if (hund > 0) for (let k = 0; k < 2; k++) { const u = ((f / 8) + k * 0.5) % 1; ps.push(...aro([px, 0, 0.7], R + 8 + u * 30, [0, 0, 1], 'j2_espuma', -u * 0.4, 1.2 - u * 0.6, 0.3)); }
  const luz = glow <= 0.02 ? undefined : { c: add(A(0.05), [0, 0, 2]) as V3, r: (R * 1.1 + glow * 14) * (1 + 0.1 * Math.sin(w * 2 + 0.7)), color: '#38bfae' };
  return { piezas: ps, resplandor: luz };
}
jefe('campana_ahoga', ['La Campana que Ahoga', 'The Drowning Bell'], 120, 4, ['tañido de las ondas', 'tolling waves'], campanaAhoga);

// ================================================================== 2. AUN-SAAR, EL DIOS SEDIENTO
/**
 * Mano de oro que flota sola: palma, cuatro dedos largos en dos falanges y el pulgar, todo en una masa; la muñeca
 * termina cortada en el vacío. `dir` es hacia donde apuntan los dedos, `nrm` la normal de la palma (afuera del
 * dorso), `abre` de 0 (puño) a 1 (abierta).
 */
function manoOro(c: V3, dir: V3, nrm: V3, s: number, abre: number, sem: number): Pieza[] {
  const ex = nor(dir), ez0 = nor(sub(nrm, esc(ex, pto(nrm, ex)))), ey = cruz(ez0, ex), ez = ez0, OR = 'j2_oro';
  const P = (x: number, y: number, z: number): V3 => add(add(add(c, ex, x * s), ey, y * s), ez, z * s);
  const cs: Comp[] = [bulto(P(0, 0, 0), [7 * s, 6 * s, 2.6 * s], { ejes: [ex, ey, ez], mat: OR }), hueso(P(-9, 0, 0), P(-1, 0, 0), 3.4 * s, 3.8 * s, { mat: OR }), bulto(P(-4, 0, 0.6), [4 * s, 4.2 * s, 3 * s], { ejes: [ex, ey, ez], mat: 'j2_oro_viejo' })];
  for (const k of [-1.5, -0.5, 0.5, 1.5]) {
    const b = P(6.2, k * 2.8, 0.3), cerr = 1 - abre;
    const d1 = nor(add(add(ex, ey, k * 0.14 * abre), ez, -cerr * 0.9)), m1 = add(b, d1, (7.2 - Math.abs(k) * 0.8) * s);
    const d2 = nor(add(d1, ez, -cerr * 1.3 - 0.15)), tip = add(m1, d2, (6 - Math.abs(k) * 0.6) * s);
    cs.push(hueso(b, m1, 1.6 * s, 1.3 * s, { mat: OR }), hueso(m1, tip, 1.3 * s, 0.55 * s, { mat: OR }), bulto(m1, [1.6 * s, 1.6 * s, 1.6 * s], { mat: OR }));
  }
  const sg = hr(sem) < 0.5 ? 1 : -1, tb = P(1, sg * 5.5, -0.5), tm = add(tb, nor(add(esc(ey, sg), ex, 0.8)), 5 * s), tt = add(tm, nor(add(add(ex, ey, sg * 0.2), ez, -0.4 * (1 - abre))), 4.5 * s);
  cs.push(hueso(tb, tm, 1.8 * s, 1.4 * s, { mat: OR }), hueso(tm, tt, 1.4 * s, 0.6 * s, { mat: OR }));
  const ps: Pieza[] = [masa(cs, { mat: OR, suave: 1.1 * s })];
  // el corte de la muñeca: el vacío y unas esquirlas de oro
  ps.push(elipE(P(-9.3, 0, 0), ex, [0.9 * s, 3.3 * s, 3 * s], 'j2_vacio', 0, ey));
  for (let k = 0; k < 3; k++) { const a = hr(sem * 3 + k) * TAU; ps.push(elipE(add(P(-10.5 - hr(k + sem) * 3, 0, 0), add(esc(ey, Math.cos(a)), ez, Math.sin(a)), 3.4 * s), ex, [1.2 * s, 0.7 * s, 0.6 * s], OR, 0.05)); }
  // una grieta de vacío en el dorso
  ps.push(elipE(P(0, 1, 2.5), add(ex, ey, 0.5), [4 * s, 0.5 * s, 0.6 * s], 'j2_vacio'));
  return ps;
}
/** Grietas del vacío sobre un elipsoide (en el marco `t`): tramos quebrados de negro con el borde morado. */
function grietasVacio(t: Tr, c: V3, r: V3, n: number, sem: number, brillo: number, o: { frente?: number; grueso?: number; largo?: number } = {}): Pieza[] {
  const ps: Pieza[] = [];
  for (let k = 0; k < n; k++) {
    const q = sem * 31 + k * 7;
    let u = (o.frente ?? 0) + (hr(q) - 0.5) * 2.6, v = (hr(q + 2) - 0.5) * 1.6;
    const du = (hr(q + 3) - 0.5) * 0.5, dv = (hr(q + 4) < 0.5 ? 1 : -1) * 0.3;
    let prev: V3 | null = null;
    const pasos = o.largo ?? 5;
    for (let i = 0; i <= pasos; i++) {
      const cv = Math.cos(v), p: V3 = [c[0] + r[0] * cv * Math.cos(u) * 1.01, c[1] + r[1] * cv * Math.sin(u) * 1.01, c[2] + r[2] * Math.sin(v) * 1.01];
      const wp = ap(t, p);
      if (prev) { const g = (o.grueso ?? 1.4) * (1 - i / (pasos + 2)), d = sub(wp, prev); ps.push(elipE(mez(prev, wp, 0.5), d, [len(d) * 0.58 + g * 0.5, g * 1.9, g * 1.5], 'j2_oro', 0.05), elipE(mez(prev, wp, 0.5), d, [len(d) * 0.6 + g * 0.3, g * 0.95, g * 1.9], 'j2_vacio'), elipE(mez(prev, wp, 0.5), d, [len(d) * 0.4, g * 0.4, g * 2], 'j2_borde_vacio', brillo * 0.3 - 0.3)); }
      prev = wp;
      u += du + (hr(q + 10 + i) - 0.5) * 0.5; v += dv + (hr(q + 20 + i) - 0.5) * 0.45;
    }
  }
  return ps;
}
/**
 * El Dios Sediento: 255 de alto hasta la coronilla (los halos llegan a 330). Flota: de la cintura le cae un faldón de
 * mármol que se afina en punta y no toca el piso. Torso inmenso de mármol con placas de oro fundidas en la piel,
 * agrietado, y en las grietas el vacío negro con un borde morado. Los brazos están rotos a la altura del codo; en su
 * lugar, seis manos de oro flotan a su alrededor. La cabeza es larga y lisa, sin ojos, con una cicatriz de vacío
 * donde deberían estar. En el pecho, una boca vertical con labios de oro y dientes que se abre para beber.
 */
function aunSaar(acc: Acc, f: number): Res {
  const n = CUADROS[acc], ph = f / n, w = ph * TAU;
  let px = 0, py = 0, pz = 0, tp = 4, ty = 0, tr = 0, cab = 6, boca = 0.35, sed = 0, frag = 0, caer = 0, cola = 0, brillo = 0.4, halo = ph * 30, orbe = 0, golpe = 0;
  // las seis manos: posición en el marco del cuerpo (x adelante, y izquierda), hacia dónde apuntan los dedos, cuánto se abren
  const MANOS0: [V3, V3, number][] = [
    [[40, -86, 150], [0.4, 0.1, -1], 0.6], [[40, 86, 150], [0.4, -0.1, -1], 0.6], [[-10, -104, 196], [0.2, -0.3, 1], 0.9],
    [[-10, 104, 196], [0.2, 0.3, 1], 0.9], [[54, -66, 92], [0.6, 0.2, -0.6], 0.4], [[54, 66, 92], [0.6, -0.2, -0.6], 0.4],
  ];
  const manos: [V3, V3, number][] = MANOS0.map(([p, d, a], i) => [add(p, [Math.sin(w + i * 1.1) * 3, Math.cos(w * 1 + i) * 2, Math.sin(w + i * 2.3) * 4]), d, a]);
  if (acc === 'quieto') {
    pz = Math.sin(w) * 3; tp = 4 + Math.sin(w) * 1.5; cab = 6 - Math.sin(w) * 2; boca = 0.3 + 0.08 * Math.sin(w); cola = Math.sin(w) * 3;
  } else if (acc === 'caminar') {
    // avanza flotando: se inclina, el faldón queda atrás y las manos lo siguen con retraso
    pz = Math.sin(w * 2) * 3 + 2; tp = 12; cola = -14 + Math.sin(w * 2) * 4; ty = Math.sin(w) * 4; tr = Math.sin(w) * 2;
    manos.forEach((m, i) => { m[0] = add(m[0], [-12 - Math.sin(w + i) * 6, 0, Math.sin(w * 2 + i) * 4]); });
  } else if (acc === 'atacar') {
    // dos manos derechas suben y bajan juntas sobre lo que tiene adelante; el cuerpo acompaña
    tp = K([4, -4, -10, -10, 16, 22, 12, 4], f); ty = K([0, 10, 16, 16, -10, -14, -6, 0], f); boca = K([0.3, 0.4, 0.6, 0.7, 1, 0.8, 0.5, 0.3], f); golpe = K([0, 0, 0, 0, 0.7, 1, 0.4, 0], f);
    manos[0] = [[K([40, 20, 4, 8, 96, 118, 80, 40], f), K([-86, -76, -60, -52, -30, -24, -50, -86], f), K([150, 230, 280, 290, 120, 26, 60, 150], f)], [K([0.4, 0.2, 0, 0.3, 1, 1, 0.8, 0.4], f), 0, K([-1, 0.6, 1, 0.8, -1, -1, -1, -1], f)], K([0.6, 0.8, 1, 1, 0.3, 0.1, 0.4, 0.6], f)];
    manos[4] = [[K([54, 30, 14, 18, 100, 124, 86, 54], f), K([-66, -40, -28, -22, -4, 0, -30, -66], f), K([92, 210, 262, 272, 110, 20, 50, 92], f)], [K([0.6, 0.2, 0, 0.3, 1, 1, 0.8, 0.6], f), 0, K([-0.6, 0.6, 1, 0.8, -1, -1, -1, -0.6], f)], K([0.4, 0.8, 1, 1, 0.3, 0.1, 0.4, 0.4], f)];
  } else if (acc === 'lanzar') {
    // las seis manos se juntan en un círculo adelante del pecho y entre ellas nace una esfera de luz que sale
    orbe = K([0, 0.15, 0.4, 0.7, 1, 1.2, 0.4, 0], f); boca = 0.35 + orbe * 0.4; brillo = 0.4 + orbe * 0.7; tp = K([4, 0, -4, -6, -6, 10, 8, 4], f);
    const cOrb: V3 = [K([90, 92, 96, 100, 104, 150, 200, 90], f), 0, 160];
    manos.forEach((m, i) => { const a = (i / 6) * TAU + w * 0.5, k = K([0, 0.4, 0.8, 1, 1, 0.7, 0.3, 0], f); const p: V3 = add([cOrb[0] - 8, 0, cOrb[2]], [0, Math.cos(a) * 34, Math.sin(a) * 34]); m[0] = mez(MANOS0[i][0], p, k); m[1] = nor(mez(MANOS0[i][1], nor(sub(cOrb, p)), k)); m[2] = lerp(m[2], 1, k); });
  } else if (acc === 'herido') {
    const k = GOLPE[f % 4];
    tp = 4 - 14 * k; cab = 6 - 20 * k; px = -8 * k; pz = 4 * k; boca = 0.3 + 0.6 * k; brillo = 0.4 + 0.8 * k;
    manos.forEach((m, i) => { m[0] = add(m[0], esc(nor([m[0][0], m[0][1], 0]), 18 * k)); m[2] = 1; void i; });
  } else if (acc === 'morir') {
    // grita sin voz con la boca abierta, las grietas se encienden, se parte: los pedazos quedan en el aire y caen
    boca = K([0.4, 1.2, 1.5, 1.5, 1.2, 0.9, 0.7, 0.7], f); brillo = K([0.6, 1.4, 2, 1.8, 1.2, 0.6, 0.3, 0.1], f); tp = K([4, -12, -16, -14, -10, -6, -4, -4], f); cab = K([6, -20, -26, -24, -20, -16, -12, -10], f);
    frag = K([0, 0, 0.35, 0.75, 1, 1, 1, 1], f); caer = K([0, 0, 0, 0, 0, 0.35, 0.8, 1], f);
  } else if (acc === 'especial') {
    // la sed: abre la boca del pecho de par en par, las manos se abren hacia afuera y todo lo que brilla alrededor
    // (luz y ceniza) se arremolina hacia la boca
    sed = K([0.2, 0.5, 0.8, 1, 1, 1, 0.8, 0.5], f); boca = 0.35 + sed * 1.25; brillo = 0.5 + sed * 1.2; tp = K([4, -2, -8, -12, -12, -10, -6, 0], f); cab = K([6, 0, -10, -18, -20, -18, -10, 0], f);
    manos.forEach((m, i) => { const s = MANOS0[i][0][1] > 0 ? 1 : -1; m[0] = mez(m[0], add(MANOS0[i][0], [-20, s * 30, 20]), sed); m[1] = nor(mez(m[1], [0, s, 0.4], sed)); m[2] = lerp(m[2], 1, sed); });
  }
  halo += ph * 20;
  const trozos: { ps: Pieza[]; c: V3; sem: number }[] = [];
  const nuevo = (c: V3, sem: number) => { const t = { ps: [] as Pieza[], c, sem }; trozos.push(t); return t.ps; };
  const MB = 'j2_marmol', OR = 'j2_oro', mM: OpcComp = { mat: MB }, mO: OpcComp = { mat: OR };
  const cuerpoT = T([px, py, 30 + pz], Rz(ty * 0.4), Ry(tp * 0.3), Rx(tr * 0.5));
  const tor = cmp(cuerpoT, T([0, 0, 92], Rz(ty * 0.6), Ry(tp * 0.7), Rx(tr)));
  const cabT0 = cmp(tor, T([8, 0, 120], Ry(cab - tp * 0.4))), cabT: Tr = { o: cabT0.o, m: [esc(cabT0.m[0], 1.3), esc(cabT0.m[1], 1.3), esc(cabT0.m[2], 1.3)] };
  const fz = (k: number) => 0.5 + 0.5 * Math.sin(w * 2 + k * 2.3);

  // ---- el faldón de mármol: cae de la cintura en pliegues y se afina en punta (no toca el piso)
  {
    const ps = nuevo(ap(cuerpoT, [0, 0, 50]), 1);
    const cs: Comp[] = [];
    for (let i = 0; i <= 5; i++) { const t = i / 5, r = lerp(34, 6, Math.pow(t, 0.9)), z = 92 - t * 84, x = cola * t * t; cs.push(bT(cuerpoT, [x, 0, z], [r * 0.95, r * 1.08, 14 - t * 6], mM)); }
    for (let k = 0; k < 9; k++) {
      // pliegues: huesos que bajan por la superficie y se juntan en la punta
      const a = (k / 9) * TAU + 0.2, pts: V3[] = [];
      for (let i = 0; i <= 4; i++) { const t = i / 4, r = lerp(37, 5, Math.pow(t, 0.85)), z = 96 - t * 86, x = cola * t * t; pts.push(ap(cuerpoT, [x + Math.cos(a) * r, Math.sin(a) * r * 1.1, z])); }
      for (let i = 0; i < 4; i++) cs.push(hueso(pts[i], pts[i + 1], 5.5 - i, 4.8 - i, { mat: k % 3 === 0 ? OR : MB }));
    }
    ps.push(masa(cs, { mat: MB, suave: 6.5 }));
    // al partirse, la cara del corte muestra el vacío
    if (frag > 0) ps.push(elipE(ap(cuerpoT, [0, 0, 100]), cuerpoT.m[0], [30, 32, 5], 'j2_vacio', 0, cuerpoT.m[1]), elipE(ap(cuerpoT, [0, 0, 99]), cuerpoT.m[0], [33, 35, 4], 'j2_borde_vacio', brillo * 0.2 - 0.2, cuerpoT.m[1]));
    ps.push(...grietasVacio(cuerpoT, [cola * 0.3, 0, 60], [26, 29, 30], 4, 3, brillo, { frente: 0.6, grueso: 1.9 }));
    // esquirlas que flotan bajo la punta, girando
    for (let k = 0; k < 5; k++) { const a = hr(k) * TAU + w * 0.5, z = 10 + hr(k * 3) * 14 + Math.sin(w + k) * 3; const c = ap(cuerpoT, [cola + Math.cos(a) * 10, Math.sin(a) * 10, z - 30]); ps.push(poliedro([add(c, [3, 0, 0]), add(c, [-2, 2.5, 0.5]), add(c, [-1, -2.5, -0.5]), add(c, [0, 0, 4.5]), add(c, [0.5, 0, -3.5])], { mat: k % 2 ? OR : MB })); }
  }
  // ---- el torso: vientre, costillar inmenso, espalda y hombros, con placas de oro fundidas en el mármol
  {
    const ps = nuevo(ap(tor, [0, 0, 50]), 2);
    const cs: Comp[] = [
      bT(cuerpoT, [0, 0, 92], [30, 36, 16], mM), bT(tor, [2, 0, 14], [26, 32, 18], mM), bT(tor, [4, 0, 50], [32, 46, 30], mM), bT(tor, [-8, 0, 76], [28, 48, 20], mM),
      hT(tor, [0, 0, 92], [6, 0, 118], 14, 12, mM), bT(tor, [12, 0, 32], [16, 24, 12], mO), bT(tor, [-24, 0, 60], [10, 30, 24], mO), bT(tor, [-30, 0, 42], [10, 42, 44], mM),
    ];
    // al partirse, cada hombro con su muñón y su hombrera es un trozo aparte
    const lado = new Map<number, Comp[]>([[1, []], [-1, []]]), psL = new Map<number, Pieza[]>();
    for (const s of [1, -1]) psL.set(s, frag > 0 ? nuevo(ap(tor, [-2, s * 56, 72]), s > 0 ? 21 : 22) : ps);
    for (const s of [1, -1]) {
      const cl = frag > 0 ? lado.get(s)! : cs;
      cl.push(bT(tor, [-2, s * 50, 78], [17, 16, 18], mM), hT(tor, [-4, s * 50, 78], [2, s * 64, 52], 13, 10, mM));
      cs.push(hT(tor, [-4, s * 12, 92], [-4, s * 42, 86], 12, 13, mM), bT(tor, [20, s * 18, 64], [12, 16, 10], mM), hT(tor, [16, s * 6, 88], [4, s * 40, 87], 5, 5, mM), hT(tor, [-2, s * 10, 90], [6, s * 6, 116], 8, 6, mM));
      // el manto de mármol que cae de los hombros por la espalda
      cs.push(hT(tor, [-16, s * 38, 84], [-28, s * 44, 20], 8, 12, mM));
      cs.push(bT(tor, [-10, s * 30, 30], [14, 14, 20], mM));
    }
    ps.push(masa(cs, { mat: MB, suave: 4 }));
    if (frag > 0) for (const s of [1, -1]) psL.get(s)!.push(masa(lado.get(s)!, { mat: MB, suave: 4 }));
    // hombreras de oro: placas chatas y curvas, agrietadas
    for (const s of [1, -1]) for (let k = 0; k < 2; k++) { const n0 = nor(mv(tor.m, [0, s * (0.5 + k * 0.35), 1 - k * 0.25])), e0 = nor(sub(tor.m[0], esc(n0, pto(tor.m[0], n0)))); psL.get(s)!.push({ k: 'elip', c: ap(tor, [-2, s * (50 + k * 6), 92 - k * 8]), ex: e0, ey: cruz(n0, e0), ez: n0, r: [20 - k * 3, 15 - k * 2, 3.4], mat: OR, tono: k * 0.04 } as Pieza); }
    // la boca vertical: se cava el pecho, adentro el vacío; labios de oro y dientes que miran adentro
    const ab = 3 + boca * 9, bz = 52, bx = 30;
    ps.push({ ...elipE(ap(tor, [bx + 4, 0, bz]), tor.m[2], [30, ab + 2, 12], MB, 0, tor.m[1]), resta: true } as Pieza);
    ps.push(elipE(ap(tor, [bx - 7, 0, bz]), tor.m[2], [28, ab + 1, 9], 'j2_vacio', 0, tor.m[1]));
    const lab: Comp[] = [];
    for (const s of [1, -1]) {
      let prev: V3 | null = null;
      for (let i = 0; i <= 8; i++) { const t = -1 + i / 4, z = bz + t * 30, y = s * (ab + 3) * Math.sqrt(Math.max(0, 1 - t * t)) + s * 1.5, q = ap(tor, [bx + 6 - Math.abs(t) * 4, y, z]); if (prev) lab.push(hueso(prev, q, 3.4, 3.4, mO)); prev = q; }
      // dientes: conos que salen de los labios hacia adentro y abajo
      for (let i = 1; i < 8; i++) { const t = -1 + i / 4, z = bz + t * 30, y = s * (ab + 2) * Math.sqrt(Math.max(0, 1 - t * t)), b = ap(tor, [bx + 3 - Math.abs(t) * 4, y, z]), tip = ap(tor, [bx + 1 - Math.abs(t) * 4, y - s * (3 + boca * 4), z - 2]); ps.push(palo(b, tip, 1.5, { mat: 'j2_diente', r1: 0.2 })); }
    }
    ps.push(masa(lab, { mat: OR, suave: 1.6 }));
    // el corazón de la sed: una luz chica al fondo de la boca que late
    ps.push(esfera(...ap(tor, [bx - 10, 0, bz]), 2 + brillo * 2.5 * fz(0), { mat: 'j2_luz', tono: -0.2 + brillo * 0.2 }));
    ps.push(...grietasVacio(tor, [4, 0, 50], [32, 46, 30], 8, 11, brillo, { frente: 0, grueso: 2.2, largo: 6 }));
    ps.push(...grietasVacio(tor, [-2, 0, 78], [24, 50, 18], 3, 19, brillo, { frente: 1.2, grueso: 1.8 }));
    ps.push(...grietasVacio(tor, [-8, 0, 76], [28, 48, 20], 3, 13, brillo, { frente: PI, grueso: 1.3 }));
    // los cortes de los muñones: vacío y lascas de mármol
    for (const s of [1, -1]) { const e = ap(tor, [2, s * 64, 52]), d = nor(sub(e, ap(tor, [-4, s * 50, 78]))), ps = psL.get(s)!; ps.push(elipE(add(e, d, 0.5), d, [1.4, 9.5, 9.5], 'j2_vacio'), elipE(add(e, d, 0.2), d, [1.2, 10.5, 10.5], 'j2_borde_vacio', brillo * 0.2 - 0.2)); for (let k = 0; k < 3; k++) { const a = hr(k + s) * TAU; ps.push(poliedro([add(e, lat(d), 0), add(add(e, lat(d), 9 * Math.cos(a)), cruz(d, lat(d)), 9 * Math.sin(a)), add(add(add(e, lat(d), 7 * Math.cos(a + 0.6)), cruz(d, lat(d)), 7 * Math.sin(a + 0.6)), d, 5 + hr(k) * 6), add(e, d, 2)], { mat: MB })); } }
  }
  // ---- la cabeza larga, lisa y ciega
  {
    const ps = nuevo(ap(cabT, [0, 0, 6]), 3);
    const cs: Comp[] = [bT(cabT, [0, 0, 6], [15, 13, 19], mM), hT(cabT, [-4, 0, 12], [-18, 0, 22], 11, 6, mM), bT(cabT, [10, 0, 4], [8, 11, 10], mM), bT(cabT, [12, 0, -8], [6, 8, 6], mM), bT(cabT, [-2, 0, -10], [10, 11, 6], mM)];
    for (const s of [1, -1]) cs.push(bT(cabT, [8, s * 8, -2], [6, 4, 8], mM));
    ps.push(masa(cs, { mat: MB, suave: 2.6 }));
    // donde estarían los ojos, una cicatriz de vacío de lado a lado
    let prev = ap(cabT, [13, -13, 6]);
    for (let i = 1; i <= 6; i++) { const t = -1 + (i / 6) * 2, q = ap(cabT, [17.5 - t * t * 6, t * 13, 6 + Math.sin(i * 1.7) * 1.2]); ps.push(elipE(mez(prev, q, 0.5), sub(q, prev), [len(sub(q, prev)) * 0.6, 1.6, 2.4], 'j2_borde_vacio', brillo * 0.2 - 0.2), elipE(add(mez(prev, q, 0.5), mv(cabT.m, [0.5, 0, 0]), 1), sub(q, prev), [len(sub(q, prev)) * 0.62, 1, 1.6], 'j2_vacio')); prev = q; }
    ps.push(...grietasVacio(cabT, [0, 0, 6], [15, 13, 19], 2, 17, brillo, { frente: 0.4, grueso: 0.9, largo: 4 }));
    // la corona: hojas de oro que salen de la frente hacia atrás
    for (let k = 0; k < 7; k++) { const a = -0.9 + (k / 6) * 1.8, b = ap(cabT, [Math.cos(a) * 12, Math.sin(a) * 12, 18]), tip = ap(cabT, [Math.cos(a) * 15 - 10, Math.sin(a) * 17, 36 + (k % 2) * 8]); ps.push(masa([hueso(b, tip, 2.4, 0.3, mO)], { mat: OR, suave: 0.5 })); }
  }
  // ---- la corona de halos rotos: tres aros de oro y luz, inclinados, que giran lento y les faltan pedazos
  {
    const ps = nuevo(ap(cabT, [-18, 0, 30]), 4);
    const centro = ap(cabT, [-22, 0, 30]);
    const aros: [number, number, number, number][] = [[46, 12, 0, 0.18], [64, -8, 25, 0.25], [84, 20, -15, 0.32]];
    aros.forEach(([R, inc, gir, falta], j) => {
      const m0: M3 = mm(mm(Rz(gir + ty), Ry(-12 + tp * 0.5)), Rx(inc));
      const nn = nor(mv(m0, [1, 0, 0])), u = nor(mv(m0, [0, 1, 0])), v = cruz(nn, u), giro = rad(halo * (j % 2 ? -1 : 1) * (1 + j * 0.4) + j * 40), N = 30;
      for (let i = 0; i < N; i++) {
        if (hr(j * 31 + i) < falta) continue;
        const a0 = (i / N) * TAU + giro, a1 = ((i + 1) / N) * TAU + giro, p0 = add(add(centro, u, Math.cos(a0) * R), v, Math.sin(a0) * R), p1 = add(add(centro, u, Math.cos(a1) * R), v, Math.sin(a1) * R);
        ps.push(palo(p0, p1, 2.3 - j * 0.3, { mat: OR, tono: (hr(i) - 0.5) * 0.1 }), palo(add(p0, nn, 1.6), add(p1, nn, 1.6), 0.9, { mat: 'j2_luz_oro', tono: -0.2 + brillo * 0.15 }));
        if (j === 2 && i % 3 === 0) ps.push(palo(add(add(centro, u, Math.cos(a0) * (R + 2)), v, Math.sin(a0) * (R + 2)), add(add(centro, u, Math.cos(a0) * (R + 14 + (i % 2) * 8)), v, Math.sin(a0) * (R + 14 + (i % 2) * 8)), 1.4, { mat: OR, r1: 0.2 }));
      }
    });
  }
  // ---- las seis manos de oro
  manos.forEach(([p, d, abre], i) => {
    const c = ap(cuerpoT, p), dd = nor(mv(cuerpoT.m, d)), nrm = nor(cruz(dd, mv(cuerpoT.m, [0, p[1] > 0 ? -1 : 1, 0.2])));
    const ps = nuevo(c, 10 + i);
    ps.push(...manoOro(c, dd, len(nrm) > 0.1 ? nrm : [0, 0, 1], 1.45, abre, i + 1));
    // una estela de polvo de oro bajo cada mano
    for (let k = 0; k < 2; k++) { const u = (ph + hr(i * 3 + k)) % 1; ps.push(esfera(c[0] + (hr(i + k) - 0.5) * 6, c[1] + (hr(i * 2 + k) - 0.5) * 6, c[2] - 8 - u * 26, 0.8 * (1 - u * 0.5), { mat: 'j2_luz_oro', tono: -0.2 - u * 0.4 })); }
  });
  // ---- la muerte: los trozos se separan y flotan, después caen al piso
  let ps: Pieza[] = [];
  const centroCuerpo = ap(tor, [0, 0, 30]);
  for (const t of trozos) {
    if (frag <= 0 && caer <= 0) { ps.push(...t.ps); continue; }
    const fuera = nor(add(sub(t.c, centroCuerpo), [hr(t.sem) - 0.5, hr(t.sem + 1) - 0.5, 0.3])), sep = 22 + hr(t.sem * 3) * 30;
    const eje = nor([hr(t.sem * 5) - 0.5, hr(t.sem * 7) - 0.5, hr(t.sem * 9) - 0.5]), ang = (t.sem === 1 ? 12 : 16 + hr(t.sem * 11) * 24) * frag * (hr(t.sem) < 0.5 ? 1 : -1);
    let c1 = add(add(t.c, fuera, sep * frag), [0, 0, 14 * frag + Math.sin(w + t.sem) * 3 * frag]);
    // al caer: cada trozo baja hasta apoyarse (los más grandes quedan más altos) y se acuesta
    const piso = t.sem === 2 ? 30 : t.sem === 1 ? 22 : t.sem === 3 ? 18 : t.sem === 4 ? 6 : t.sem > 20 ? 18 : 8;
    c1 = [c1[0] + fuera[0] * caer * 20, c1[1] + fuera[1] * caer * 20, lerp(c1[2], piso, caer * caer)];
    const giro = rotM3(eje, ang + caer * (t.sem === 1 ? 70 : 30) * (hr(t.sem * 13) < 0.5 ? 1 : -1));
    ps.push(...transformar(transformar(t.ps, I3, esc(t.c, -1)), giro, c1));
  }
  // ---- la sed: luz y ceniza que se arremolinan hacia la boca desde todo alrededor
  const bocaW = ap(tor, [36, 0, 52]);
  if (sed > 0.05) {
    for (let i = 0; i < 46; i++) {
      const u = (ph + hr(i * 1.7)) % 1, a0 = hr(i * 3.1) * TAU, r0 = 110 + hr(i * 5.3) * 70, z0 = hr(i * 7.7) * 200, a = a0 + u * 2.6, r = r0 * Math.pow(1 - u, 1.3) + 4;
      const p: V3 = add(bocaW, [Math.cos(a) * r, Math.sin(a) * r, (z0 - bocaW[2]) * Math.pow(1 - u, 1.1)]);
      const vel = nor(sub(bocaW, p)), mat = i % 3 === 0 ? 'j2_ceniza' : i % 3 === 1 ? 'j2_luz_oro' : 'j2_luz';
      ps.push(elipE(p, vel, [1.2 + u * 3 * sed, 0.7, 0.7], mat, mat === 'j2_ceniza' ? 0 : -0.15 + u * 0.2));
    }
    // un embudo de luz pegado a la boca que gira
    for (let k = 0; k < 3; k++) ps.push(...aro(add(bocaW, mv(tor.m, [6 + k * 9, 0, 0])), 8 + k * 9 * sed, tor.m[0], 'j2_luz_oro', -0.1 - k * 0.15, 1.3 - k * 0.3, 0.3 + k * 0.15));
  }
  // ---- la esfera de luz que nace entre las manos (lanzar)
  if (orbe > 0.02) { const c = ap(cuerpoT, [K([90, 92, 96, 100, 104, 150, 200, 90], f), 0, 160]); ps.push(esfera(...c, 4 + orbe * 12, { mat: 'j2_luz', tono: 0.1 }), ...aro(c, 8 + orbe * 16, nor([Math.cos(w), Math.sin(w), 0.5]), 'j2_luz_oro', 0, 1.2, 0.3)); }
  // ---- el golpe de las manos contra el piso
  if (golpe > 0.2) { const c: V3 = [px + 118, -12, 1]; ps.push(...aro(c, 10 + golpe * 26, [0, 0, 1], 'j2_luz_oro', -0.1 - golpe * 0.2, 1.4, 0.3)); for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU; ps.push(esfera(c[0] + Math.cos(a) * 14 * golpe, c[1] + Math.sin(a) * 14 * golpe, 2 + golpe * 8 * hr(k), 1.6, { mat: 'j2_marmol' })); } }
  // ---- en la muerte, ceniza dorada que cae de los trozos
  if (frag > 0) for (let k = 0; k < 16; k++) { const u = (ph + hr(k * 2.1)) % 1; ps.push(esfera(px + (hr(k) - 0.5) * 160, py + (hr(k * 3) - 0.5) * 160, 220 - u * 200, 0.9, { mat: k % 2 ? 'j2_ceniza' : 'j2_luz_oro', tono: -u * 0.3 })); }
  const luzC = acc === 'morir' && caer > 0.5 ? undefined : { c: add(bocaW, [10 + Math.sin(w) * 3, 0, Math.cos(w * 2) * 4]) as V3, r: (34 + brillo * 30) * (1 + 0.12 * Math.sin(w * 2 + 0.7)), color: sed > 0.3 ? '#fff0c8' : '#e8dcc0' };
  return { piezas: ps, resplandor: luzC };
}
/** Matriz de giro alrededor de un eje (grados). */
function rotM3(k: V3, g: number): M3 { return [rotar([1, 0, 0], k, g), rotar([0, 1, 0], k, g), rotar([0, 0, 1], k, g)]; }
jefe('aun_saar', ['Aun-Saar, el Dios Sediento', 'Aun-Saar, the Thirsting God'], 255, 7, ['la sed', 'the thirst'], aunSaar);
