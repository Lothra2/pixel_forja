import '../cuerpo';
import { registrar } from '../objeto';
import { MATERIALES } from '../materiales';
import { DIRS, type Dir } from '../figura';
import { cilindro, esfera, palo, poliedro, masa, hueso, bulto, ruido, type Comp, type Pieza, type V3, type Escena, type OpcComp } from '../render';

/**
 * Thor, el bóxer de la familia GG: perro compañero del héroe en Réquiem de Ceniza.
 *
 * Es un cuadrúpedo propio (no el `cuadrupedo` de bestias.ts, que da lobos y jabalíes): cabeza cuadrada con hocico
 * corto y chato, mandíbula de abajo que asoma apenas, belfos, máscara oscura, orejas caídas, frente con arrugas,
 * cuello grueso, pecho hondo con la mancha blanca, cintura recogida, hombros y muslos marcados, patas largas con
 * calcetines blancos y cola corta. El tronco tiene dos mitades (pecho y grupa) que se doblan sobre la columna para
 * el galope. Paleta de `thorFicha` (src/engine/rpg/family.ts): pelo #b5713a, blanco #f0ece4, máscara #573e2b,
 * ojos #3a2414 y collar #225fd4.
 *
 * Escala: un bóxer llega a la cintura de la persona: 60 cm a la cruz con 1.75 m de humano, unas 21 unidades
 * (la persona mide 61 = 75 px).
 *
 * Registro: seis monstruos, uno por tramo de armadura (THOR_MONSTRUOS, ids de monstruo thor_0 a thor_5), con los
 * ids de objeto de los monstruos de bestias.ts y personajes.ts: mon_thor_<nivel>_<accion> (el juego los lee como
 * thor_<nivel>/<accion>/<dir>); nivel 0..5 (THOR_NIVELES), acciones en THOR_ACCIONES, variantes = las 8 direcciones.
 * Íconos 3D para su casilla de equipo: thor_icono_collar (icono, suelo) y thor_icono_barda (icono).
 * Acciones: quieto 4 cuadros (jadea y menea la cola), caminar 8 (trote alegre), correr 8 (galope con la columna que
 * se dobla), atacar 8 (salta y muerde), especial 8 (ladrido protector con onda: aura de escudo), herido 4 y morir 8
 * (se echa, apoya la cabeza en las patas y se apaga, sin sangre). Tema 'monstruos', huella 1×1 y no bloquea (es un
 * compañero que sigue al héroe y no le cierra el paso). `thorEscena(nivel, dir, accion, cuadro)` da la escena suelta.
 */

// ------------------------------------------------------------------ materiales
const M = MATERIALES;
const pelo = (p: V3) => (ruido(p[0] * 2.2, p[1] * 2.2, p[2] * 0.9) - 0.5) * 0.12;
M.th_pelo = { rampa: ['#170b05', '#2a150a', '#40210f', '#592f16', '#733f1e', '#8d5027', '#a56132', '#b5713a', '#c6874f', '#d69f68'], ruido: 0.1, escala: 1.2, brillo: 0.14, patron: pelo };
M.th_blanco = { rampa: ['#2c2925', '#47433d', '#67625a', '#8a847a', '#aca59a', '#c9c3b8', '#ded9cf', '#f0ece4'], ruido: 0.08, escala: 1.2, brillo: 0.1, patron: pelo };
M.th_mascara = { rampa: ['#0a0705', '#140e0a', '#21170f', '#2e2016', '#3d2b1e', '#4d3626', '#573e2b', '#6a4e38'], ruido: 0.1, escala: 1.4, brillo: 0.2 };
M.th_trufa = { rampa: ['#040303', '#0b0908', '#151110', '#211b19', '#302824', '#443a34'], ruido: 0.15, escala: 2.5, brillo: 0.8 };
M.th_ojo = { rampa: ['#080402', '#160c06', '#2a1a0e', '#3a2414', '#5a3c24', '#9a8070'], ruido: 0, escala: 1, brillo: 1 };
M.th_lengua = { rampa: ['#2e0a12', '#4e1420', '#72222e', '#93343e', '#b04a52', '#c86468', '#da8484'], ruido: 0.08, escala: 1, brillo: 0.55 };
M.th_boca = { rampa: ['#0a0203', '#170507', '#25090c', '#350e12'], ruido: 0.1, escala: 1, brillo: 0.3 };
M.th_diente = { rampa: ['#3a3630', '#6a645a', '#9c9588', '#cbc4b6', '#ece6da'], ruido: 0, escala: 1, brillo: 0.5 };
M.th_collar = { rampa: ['#040a1a', '#081630', '#0e234c', '#14336c', '#1b4590', '#225fd4', '#4a80e6', '#7ea6f0'], ruido: 0.12, escala: 1.6, brillo: 0.25 };
M.th_panuelo = { rampa: ['#1c0505', '#320a0a', '#4c1210', '#681a16', '#84241d', '#9e3226', '#b54432'], ruido: 0.1, escala: 1, patron: (p) => (Math.sin(p[0] * 3.1 + p[2] * 2.3) * Math.sin(p[1] * 3.1 - p[2] * 1.7) > 0.72 ? 0.35 : 0) };
M.th_acero = { rampa: ['#0a0b0d', '#15181c', '#22262c', '#31363e', '#424852', '#555c67', '#6b737e', '#858d97', '#a3aab2'], ruido: 0.05, escala: 0.6, brillo: 0.5 };
M.th_esmalte = { rampa: ['#030816', '#06102a', '#0b1a42', '#12285e', '#1a387c', '#24499a', '#305cb4', '#4674cc', '#6c96e0', '#a4c0f0'], ruido: 0.04, escala: 0.6, brillo: 0.7 };
M.th_capa = { rampa: ['#040816', '#081028', '#0e1a3c', '#152652', '#1e346a', '#284482', '#34559a', '#4468b0'], ruido: 0.12, escala: 1.2, patron: (p) => (Math.sin((p[0] - p[1]) * 1.4) > 0.8 ? -0.06 : 0) };
M.th_oro_vivo = { rampa: ['#7a5410', '#a8781c', '#d4a232', '#f0c858', '#ffe69a', '#fff8d8'], ruido: 0.2, escala: 0.8, emite: true };
M.th_onda = { rampa: ['#123070', '#1e4ab0', '#3070e0', '#5c98f8', '#9cc4ff', '#dcecff', '#ffffff'], ruido: 0.35, escala: 0.4, emite: true };
M.th_onda_oro = { rampa: ['#6a4a10', '#a07420', '#d0a238', '#f0cc60', '#fff0b0', '#fffbe8'], ruido: 0.3, escala: 0.5, emite: true };

// ------------------------------------------------------------------ vectores y marcos (como en bestias.ts)
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
/** Valor de una tabla de cuadros clave (admite cuadros fraccionarios). */
const K = (v: number[], f: number) => { const i = Math.floor(f), t = f - i; return lerp(v[Math.min(i, v.length - 1)], v[Math.min(i + 1, v.length - 1)], t); };

type M3 = [V3, V3, V3];
interface Tr { o: V3; m: M3 }
const I3: M3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const mv = (m: M3, p: V3): V3 => [m[0][0] * p[0] + m[1][0] * p[1] + m[2][0] * p[2], m[0][1] * p[0] + m[1][1] * p[1] + m[2][1] * p[2], m[0][2] * p[0] + m[1][2] * p[1] + m[2][2] * p[2]];
const mm = (a: M3, b: M3): M3 => [mv(a, b[0]), mv(a, b[1]), mv(a, b[2])];
const ap = (t: Tr, p: V3): V3 => add(t.o, mv(t.m, p));
const cmp = (a: Tr, b: Tr): Tr => ({ o: ap(a, b.o), m: mm(a.m, b.m) });
/** Alabeo: la derecha sube con g > 0. */
const Rx = (g: number): M3 => { const c = Math.cos(rad(g)), s = Math.sin(rad(g)); return [[1, 0, 0], [0, c, s], [0, -s, c]]; };
/** Cabeceo: la nariz baja con g > 0. */
const Ry = (g: number): M3 => { const c = Math.cos(rad(g)), s = Math.sin(rad(g)); return [[c, 0, -s], [0, 1, 0], [s, 0, c]]; };
/** Guiñada: gira hacia la derecha con g > 0. */
const Rz = (g: number): M3 => { const c = Math.cos(rad(g)), s = Math.sin(rad(g)); return [[c, s, 0], [-s, c, 0], [0, 0, 1]]; };
const T = (o: V3, ...ms: M3[]): Tr => ({ o, m: ms.reduce(mm, I3) });
const RUMBO: Record<Dir, number> = { se: 0, s: 45, so: 90, o: 135, no: 180, n: 225, ne: 270, e: 315 };
const mundo = (d: Dir): Tr => { const th = rad(RUMBO[d]); return { o: [0, 0, 0], m: [[Math.cos(th), Math.sin(th), 0], [Math.sin(th), -Math.cos(th), 0], [0, 0, 1]] }; };
const ejesDe = (t: Tr): [V3, V3, V3] => [nor(t.m[0]), nor(t.m[1]), nor(t.m[2])];
const bT = (t: Tr, c: V3, r: V3, o: OpcComp = {}) => bulto(ap(t, c), r, { ...o, ejes: ejesDe(t) });
const bG = (t: Tr, c: V3, r: V3, giros: M3[], o: OpcComp = {}) => bulto(ap(t, c), r, { ...o, ejes: ejesDe(cmp(t, T([0, 0, 0], ...giros))) });
const hT = (t: Tr, a: V3, b: V3, r0: number, r1: number, o: OpcComp = {}) => hueso(ap(t, a), ap(t, b), r0, r1, o);
const una = (c: Comp, mat: string, suaveK = 0.5) => masa([c], { mat, suave: suaveK });

/** Dos huesos que llegan de `a` a `t` doblando hacia `doblez`: la articulación del medio y el punto alcanzado. */
function ik(a: V3, t: V3, l1: number, l2: number, doblez: V3): [V3, V3] {
  const d = sub(t, a), L = len(d), dn = L > 1e-6 ? esc(d, 1 / L) : [0, 0, -1] as V3;
  const Lc = clamp(L, Math.abs(l1 - l2) + 0.05, (l1 + l2) * 0.998);
  const ca = (l1 * l1 + Lc * Lc - l2 * l2) / (2 * l1 * Lc), sa = Math.sqrt(Math.max(0, 1 - ca * ca));
  let pp = sub(doblez, esc(dn, pto(doblez, dn)));
  if (len(pp) < 1e-6) pp = [0, 0, 1];
  pp = nor(pp);
  return [add(add(a, dn, l1 * ca), pp, l1 * sa), add(a, dn, Lc)];
}
/** Pie en un ciclo: en apoyo va de adelante hacia atrás por el piso, en vuelo sube y vuelve adelante. */
function paso(fase: number, largo: number, alto: number, apoyo = 0.55): { x: number; z: number; vuelo: number } {
  const p = ((fase % 1) + 1) % 1;
  if (p < apoyo) return { x: largo / 2 - largo * (p / apoyo), z: 0, vuelo: 0 };
  const u = (p - apoyo) / (1 - apoyo);
  return { x: -largo / 2 + largo * suave(u), z: alto * Math.sin(Math.PI * u), vuelo: Math.sin(Math.PI * u) };
}

// ------------------------------------------------------------------ acciones
export type AccThor = 'quieto' | 'caminar' | 'correr' | 'atacar' | 'especial' | 'herido' | 'morir';
/** Acciones de Thor: cuadros, ticks por cuadro (a 25 cuadros por segundo) y nombre. */
export const THOR_ACCIONES: { acc: AccThor; cuadros: number; t: number; nombre: [string, string] }[] = [
  { acc: 'quieto', cuadros: 4, t: 3, nombre: ['jadea', 'idle'] },
  { acc: 'caminar', cuadros: 8, t: 3, nombre: ['trota', 'walk'] },
  { acc: 'correr', cuadros: 8, t: 2, nombre: ['galopa', 'run'] },
  { acc: 'atacar', cuadros: 8, t: 3, nombre: ['salta y muerde', 'leap bite'] },
  { acc: 'especial', cuadros: 8, t: 3, nombre: ['ladrido protector', 'guardian bark'] },
  { acc: 'herido', cuadros: 4, t: 3, nombre: ['recibe golpe', 'get hit'] },
  { acc: 'morir', cuadros: 8, t: 4, nombre: ['se echa', 'lies down'] },
];
const NC: Record<AccThor, number> = Object.fromEntries(THOR_ACCIONES.map((a) => [a.acc, a.cuadros])) as Record<AccThor, number>;

/** Niveles de armadura de compañero (progresión en el juego). */
export const THOR_NIVELES: { nivel: number; nombre: [string, string]; armadura: [string, string] }[] = [
  { nivel: 0, nombre: ['Thor', 'Thor'], armadura: ['collar azul', 'blue collar'] },
  { nivel: 1, nombre: ['Thor de la casa', 'House Thor'], armadura: ['collar con placa y pañuelo', 'tagged collar and bandana'] },
  { nivel: 2, nombre: ['Thor explorador', 'Scout Thor'], armadura: ['peto de cuero', 'leather vest'] },
  { nivel: 3, nombre: ['Thor guardián', 'Guardian Thor'], armadura: ['peto de malla y hombreras', 'mail coat and pauldrons'] },
  { nivel: 4, nombre: ['Thor caballero', 'Knight Thor'], armadura: ['barda de placas y casco abierto', 'plate barding and open helm'] },
  { nivel: 5, nombre: ['Thor de la Casa GG', 'Thor of House GG'], armadura: ['barda legendaria azul y oro con capa', 'legendary blue and gold barding with cape'] },
];

interface Pose {
  /** Tronco: avance, lado, altura, cabeceo, alabeo, guiñada, flexión de la columna y meneo de la grupa. */
  av: number; lado: number; z: number; pitch: number; roll: number; yaw: number; arco: number; meneo: number;
  /** Cuello (grados sobre la horizontal), cabeza (cabeceo, guiñada, alabeo) y mandíbula abierta (grados). */
  cuello: number; cab: number; cabYaw: number; cabRoll: number; mand: number;
  lengua: number; jadeo: number; cola: number; colaAlza: number; oreja: number; ojos: number;
  /** Patas: las de adelante avanzan/suben/se abren, las de atrás se corren/suben. */
  adel: number; alzaDel: number; abre: number; atras: number; alzaTra: number;
  /** Echado: 0 de pie, 1 adelante apoyado en los codos / atrás plegadas. */
  echDel: number; echTra: number;
  apaga: number; onda: number;
}
function poseThor(acc: AccThor, f: number): Pose {
  const ph = f / NC[acc];
  const p: Pose = { av: 0, lado: 0, z: 0, pitch: 0, roll: 0, yaw: 0, arco: 0, meneo: 0, cuello: 66, cab: -7, cabYaw: 0, cabRoll: 0, mand: 3, lengua: 0, jadeo: 0, cola: 0, colaAlza: 30, oreja: 0, ojos: 1, adel: 0, alzaDel: 0, abre: 0, atras: 0, alzaTra: 0, echDel: 0, echTra: 0, apaga: 0, onda: -1 };
  const s1 = Math.sin(ph * TAU);
  if (acc === 'quieto') {
    // jadea con la lengua afuera: el pecho sube y baja, la boca se abre y cierra; la cola corta menea y la grupa con ella
    p.jadeo = 0.5 + 0.5 * s1; p.z = s1 * 0.22; p.pitch = -s1 * 0.5; p.mand = 20 + s1 * 7; p.lengua = 1; p.cab = -7 + s1 * 1.8;
    p.cabRoll = 4; p.cabYaw = 3; p.cola = Math.sin(ph * TAU + 0.6) * 34; p.meneo = Math.sin(ph * TAU + 0.6) * 2.4; p.colaAlza = 36; p.oreja = 0.08 + 0.04 * s1;
  } else if (acc === 'caminar') {
    // trote alegre: rebota dos veces por ciclo, la cabeza alta, boca abierta, cola y grupa que menean
    const s2 = Math.sin(ph * TAU * 2), c2 = Math.cos(ph * TAU * 2);
    p.z = -c2 * 0.55 - 0.15; p.pitch = s2 * 1.2; p.roll = s1 * 1.6; p.yaw = s1 * 1.5; p.cuello = 58 + c2 * 2;
    p.cab = 3 - s2 * 2.5; p.cabYaw = -s1 * 3; p.mand = 16 + c2 * 3; p.lengua = 0.75; p.cola = Math.sin(ph * TAU * 2 + 0.8) * 26; p.meneo = s1 * 2.6; p.colaAlza = 38;
    p.oreja = 0.22 + 0.16 * Math.sin(ph * TAU * 2 + 1.2);
  } else if (acc === 'correr') {
    // galope: la columna se recoge (patas bajo el cuerpo) y se estira (patas lejos); el pecho cabecea con los apoyos
    p.arco = Math.cos(TAU * (ph - 0.9)) * 11; p.pitch = -Math.cos(TAU * (ph - 0.17)) * 5.5; p.z = -Math.cos(2 * TAU * (ph - 0.17)) * 1.0 - 0.5 + Math.max(0, p.arco) * 0.1;
    p.cuello = 40 + Math.cos(TAU * (ph - 0.6)) * 6; p.cab = 14 - Math.cos(TAU * (ph - 0.6)) * 4; p.mand = 22; p.lengua = 0.9; p.oreja = 0.75 + 0.25 * Math.sin(TAU * ph * 2);
    p.colaAlza = 22 + Math.sin(TAU * ph) * 8; p.cola = Math.sin(TAU * ph) * 8;
  } else if (acc === 'atacar') {
    // se agacha, salta con las manos adelante, muerde en lo alto del salto, cae y vuelve
    p.av = K([0, -1.2, -2, 4, 10, 10, 5.5, 1.5], f); p.z = K([0, -2, -3.2, 3.5, 5.5, 0.5, -1, 0], f); p.pitch = K([0, 5, 7, -22, -12, 6, 4, 1], f);
    p.cuello = K([56, 44, 40, 52, 46, 50, 54, 56], f); p.cab = K([4, 14, 18, -2, 10, 14, 8, 4], f); p.mand = K([4, 6, 10, 46, 8, 6, 8, 4], f);
    p.adel = K([0, 0, 0, 7, 9, 4, 1.5, 0], f); p.alzaDel = K([0, 0, 0, 11, 9, 0, 0, 0], f); p.atras = K([0, 0, 0, 2, 5, 6, 4, 1], f); p.alzaTra = K([0, 0, 0, 0, 2.5, 0.5, 0, 0], f);
    p.oreja = K([0, 0.1, 0.15, 0.9, 1, 0.5, 0.2, 0], f); p.colaAlza = K([42, 30, 26, 50, 55, 45, 42, 42], f); p.cola = K([0, 0, 0, 10, -8, 6, 0, 0], f);
  } else if (acc === 'especial') {
    // ladrido protector: se planta abierto, toma aire, ladra dos veces hacia adelante y la onda abre el escudo
    p.abre = K([0, 0.6, 0.8, 0.8, 0.8, 0.8, 0.6, 0.2], f); p.adel = K([0, 1.2, 1.6, 1.6, 1.6, 1.6, 1.2, 0.4], f);
    p.z = K([0, -0.9, -0.2, -1, -0.8, -1, -0.8, -0.3], f); p.pitch = K([0, 3, -3, 2, 1, 2, 1, 0], f); p.av = K([0, -0.6, -1, 1.2, 0.4, 1.2, 0.4, 0], f);
    p.cuello = K([56, 46, 60, 50, 54, 50, 54, 56], f); p.cab = K([4, 14, -6, -4, 2, -4, 2, 4], f); p.mand = K([4, 4, 10, 40, 12, 36, 10, 4], f);
    p.jadeo = K([0, 0.3, 1, 0.2, 0.6, 0.2, 0.4, 0], f); p.oreja = K([0, 0.1, 0.2, 0.75, 0.4, 0.7, 0.3, 0.1], f); p.colaAlza = K([42, 50, 55, 58, 56, 58, 54, 46], f);
    p.onda = f >= 3 ? (f - 3) / 4 : -1;
  } else if (acc === 'herido') {
    // un respingo: se encoge hacia atrás y al costado, gime con los ojos apretados y la cola baja
    p.av = K([-1.8, -2.4, -1.1, -0.3], f); p.z = K([-0.6, -1.3, -0.6, 0], f); p.roll = K([7, 10, 4, 1], f); p.yaw = K([-6, -8, -3, -1], f); p.pitch = K([-3, -2, 0, 0], f);
    p.cuello = K([50, 44, 50, 55], f); p.cab = K([12, 16, 8, 5], f); p.cabYaw = K([-22, -26, -10, -3], f); p.cabRoll = K([-8, -10, -4, 0], f); p.mand = K([16, 12, 6, 4], f);
    p.oreja = K([0.7, 0.55, 0.3, 0.1], f); p.ojos = K([0.25, 0.2, 0.7, 1], f); p.colaAlza = K([10, 4, 20, 36], f);
  } else if (acc === 'morir') {
    // recibe el golpe, se sienta, baja el pecho, se echa como esfinge, apoya la cabeza en las patas y se apaga
    p.av = K([-1.5, -1.5, -1.2, -0.6, 0, 0, 0, 0], f); p.z = K([-0.6, -2.2, -4.2, -6.6, -8.4, -8.6, -8.7, -8.7], f);
    p.pitch = K([-2, -9, -17, -8, 0, 1, 2, 2], f); p.roll = K([5, 3, 0, 0, 0, 2, 6, 9], f);
    p.echTra = K([0, 0.45, 0.9, 1, 1, 1, 1, 1], f); p.echDel = K([0, 0, 0, 0.55, 1, 1, 1, 1], f);
    p.cuello = K([48, 54, 60, 52, 40, 14, -12, -16], f); p.cab = K([12, 4, -2, 2, 6, 16, 14, 12], f); p.cabYaw = K([-18, -6, 0, 0, 0, 6, 10, 12], f); p.cabRoll = K([-6, 0, 0, 0, 0, 4, 8, 10], f);
    p.mand = K([14, 6, 6, 4, 3, 2, 2, 2], f); p.ojos = K([0.3, 0.75, 0.85, 0.8, 0.65, 0.45, 0.15, 0], f); p.oreja = K([0.5, 0.2, 0.1, 0.05, 0, 0, 0, 0], f);
    p.colaAlza = K([14, 10, 2, -8, -14, -18, -20, -20], f); p.apaga = K([0, 0, 0, 0.1, 0.25, 0.45, 0.75, 1], f);
  }
  return p;
}

// ------------------------------------------------------------------ el perro
interface Ctx { W: Tr; fr: Tr; cu: Tr; tr: Tr; cab: Tr; mand: Tr; P: Pose; acc: AccThor; f: number; ph: number; cuelloA: V3; cuelloB: V3; cuelloR: [number, number] }

/** Escala del perro (1 = 21 unidades a la cruz, la cintura de la persona). */
const S = 1;
const B = (x: number, y: number, z: number): V3 => [x * S, y * S, z * S];
/** La cabeza va un poco más grande que el resto: el bóxer tiene la cabeza fuerte y se tiene que leer a 1x. */
const SH = S * 1.12;
const HB = (x: number, y: number, z: number): V3 => [x * SH, y * SH, z * SH];
const PIEL = 'th_pelo', BLANCO = 'th_blanco', MASC = 'th_mascara';

function boxer(nivel: number, d: Dir, acc: AccThor, f: number): Escena {
  const P = poseThor(acc, f);
  const ph = f / NC[acc];
  const W = mundo(d);
  const zc = 16.2 * S + P.z * S;
  const cu = cmp(W, T([P.av * S, P.lado * S, zc], Rz(P.yaw), Ry(P.pitch), Rx(P.roll)));
  const fr = cmp(cu, T([0, 0, 0], Ry(P.arco)));
  const tr = cmp(cu, T([0, 0, 0], Rz(P.meneo), Ry(-P.arco)));
  const pel = { mat: PIEL }, bla = { mat: BLANCO }, mas = { mat: MASC };
  const cs: Comp[] = [];
  const ps: Pieza[] = [];
  const resp = 1 + P.jadeo * 0.045;
  // ---- tronco: pecho hondo y ancho, cruz, costillar, cintura recogida, grupa, escápulas y muslos marcados
  cs.push(bT(fr, B(4.2, 0, 0.3), B(6.2, 4.9 * resp, 5.1 * resp), pel));
  cs.push(bT(fr, B(5.0, 0, 4.0), B(4.2, 3.2, 2.0), pel));
  cs.push(bT(fr, B(8.7, 0, -0.9), B(2.7, 3.9 * resp, 3.6), bla));
  cs.push(bT(fr, B(5.2, 0, -3.9 * resp), B(4.3, 2.4, 1.6), bla));
  cs.push(bT(cu, B(0, 0, 1.1), B(5.4, 4.4, 4.0), pel));
  cs.push(bT(cu, B(-3.4, 0, 2.0), B(4.0, 3.4, 2.9), pel));
  cs.push(bT(tr, B(-7.0, 0, 1.6), B(4.1, 4.0, 4.0), pel));
  cs.push(bT(tr, B(-9.4, 0, 0.8), B(2.3, 3.3, 3.2), pel));
  for (const s of [1, -1]) {
    cs.push(bG(fr, B(6.6, s * 3.8, 1.8), B(4.0, 1.7, 4.2), [Ry(-26)], pel));
    cs.push(bG(fr, B(6.9, s * 3.9, -2.0), B(2.6, 1.8, 2.7), [Ry(14)], pel));
    cs.push(bG(tr, B(-7.4, s * 3.3, -0.4), B(4.0, 2.0, 4.4), [Ry(16)], pel));
    cs.push(bG(tr, B(-5.4, s * 3.0, 2.2), B(2.8, 1.5, 2.2), [Ry(-10)], pel));
  }
  // ---- cuello grueso (con la garganta blanca) hacia la nuca
  const ca = rad(P.cuello);
  const cDir: V3 = [Math.cos(ca), 0, Math.sin(ca)], cUp: V3 = [-Math.sin(ca), 0, Math.cos(ca)], cFr: V3 = esc(cUp, -1);
  const base = B(7.9, 0, 2.4), nucaL = add(base, cDir, 7.0 * S);
  const neckR: [number, number] = [4.0 * S, 3.1 * S];
  cs.push(hT(fr, base, nucaL, neckR[0], neckR[1], pel));
  cs.push(hT(fr, add(add(base, cUp, 1.7 * S), cDir, -1.6 * S), add(nucaL, cUp, 1.0 * S), 2.7 * S, 2.3 * S, pel));
  cs.push(hT(fr, add(add(base, cFr, 2.0 * S), cDir, 0.4 * S), add(add(nucaL, cFr, 1.45 * S), cDir, -1.2 * S), 2.15 * S, 1.75 * S, bla));
  // ---- cabeza cuadrada: cráneo, mejillas, frente plana con arrugas, hocico corto y chato con máscara y belfos
  const cab = cmp(fr, T(nucaL, Rz(P.cabYaw), Ry(P.cab), Rx(P.cabRoll)));
  const hc: Comp[] = [];
  hc.push(bT(cab, HB(2.0, 0, 1.6), HB(3.3, 3.0, 2.6), pel));
  hc.push(bT(cab, HB(0.4, 0, 0.4), HB(2.4, 2.4, 2.4), pel));
  hc.push(bT(cab, HB(4.15, 0, 2.35), HB(1.5, 2.7, 1.5), pel));
  for (const s of [1, -1]) {
    hc.push(bT(cab, HB(2.9, s * 2.15, 0.4), HB(2.3, 1.35, 1.9), pel));
    hc.push(bT(cab, HB(4.85, s * 1.45, 2.55), HB(0.9, 0.95, 0.55), pel));
    hc.push(bT(cab, HB(6.15, s * 1.0, 0.45), HB(1.75, 1.5, 1.75), mas));
    hc.push(bG(cab, HB(6.3, s * 1.75, -0.95), HB(1.55, 0.8, 1.45), [Rx(s * 8)], mas));
  }
  hc.push(bT(cab, HB(5.8, 0, 1.55), HB(1.8, 1.5, 0.75), mas));
  hc.push(bT(cab, HB(6.0, 0, -1.15), HB(1.7, 1.15, 0.35), { mat: 'th_boca', k: 0.3 * SH }));
  // arrugas de la frente: surcos finos un poco más oscuros
  hc.push(bT(cab, HB(4.75, 0, 3.55), HB(0.55, 1.5, 0.28), { mat: PIEL, tono: -0.2, k: 0.3 * SH }));
  hc.push(bT(cab, HB(4.2, 0, 3.85), HB(0.5, 1.2, 0.26), { mat: PIEL, tono: -0.18, k: 0.3 * SH }));
  hc.push(bT(cab, HB(5.2, 0, 2.8), HB(0.5, 0.35, 0.9), { mat: MASC, tono: -0.05, k: 0.3 * SH }));
  ps.push(masa(hc, { mat: PIEL, suave: 1.25 * SH }));
  ps.push(una(bT(cab, HB(7.85, 0, 1.45), HB(0.7, 1.2, 0.8), { mat: 'th_trufa' }), 'th_trufa'));
  // mandíbula de abajo (prognata), dientes y lengua
  const mand = cmp(cab, T(HB(4.3, 0, -1.1), Ry(P.mand)));
  ps.push(masa([hT(mand, [0, 0, 0], HB(3.4, 0, -0.2), 1.3 * SH, 1.15 * SH, mas), bT(mand, HB(3.65, 0, -0.1), HB(0.85, 1.4, 0.95), mas), bT(mand, HB(2.4, 0, 0.55), HB(1.6, 1.0, 0.3), { mat: 'th_boca', k: 0.3 * SH })], { mat: MASC, suave: 0.9 * SH }));
  for (const s of [1, -1]) {
    ps.push(palo(ap(mand, HB(3.9, s * 0.95, 0.5)), ap(mand, HB(4.0, s * 0.95, 1.4)), 0.34 * SH, { mat: 'th_diente', r1: 0.08 * SH }));
    if (P.mand > 12) ps.push(palo(ap(cab, HB(6.7, s * 1.1, -1.1)), ap(cab, HB(6.8, s * 1.1, -2.0)), 0.3 * SH, { mat: 'th_diente', r1: 0.07 * SH }));
  }
  if (P.lengua > 0 && P.mand > 7) {
    const l = P.lengua;
    const a0 = ap(mand, HB(1.2, 0, 0.55)), a1 = ap(mand, HB(3.3 + 1.0 * l, 0.25 * l, 0.6)), a2 = ap(mand, HB(3.8 + 1.0 * l, 0.45 * l, -0.2 - 1.3 * l));
    ps.push(masa([hueso(a0, a1, 0.95 * SH, 0.9 * SH, { mat: 'th_lengua' }), hueso(a1, a2, 0.9 * SH, 0.72 * SH, { mat: 'th_lengua' })], { mat: 'th_lengua', suave: 0.6 * SH }));
  }
  // ojos (se cierran al morir y al recibir el golpe)
  const ojoZ = Math.max(0.12, P.ojos);
  for (const s of [1, -1]) {
    if (P.ojos > 0.08) ps.push(una(bT(cab, HB(5.25, s * 1.72, 1.32), HB(0.5, 0.66, 0.6 * ojoZ), { mat: 'th_ojo' }), 'th_ojo'));
    if (P.ojos < 0.95) ps.push(una(bT(cab, HB(5.12, s * 1.74, 1.32 + 0.38 * ojoZ), HB(0.56, 0.74, 0.34 + 0.2 * (1 - ojoZ)), { mat: MASC, tono: 0.05 }), MASC));
  }
  // orejas caídas: un colgajo que se dobla hacia adelante sobre la mejilla y vuela al correr
  for (const s of [1, -1]) {
    const E = cmp(cab, T(HB(1.7, s * 2.35, 3.0), Rx(s * (12 + P.oreja * 60)), Ry(-22 + P.oreja * 40)));
    ps.push(masa([bT(E, HB(0.1, s * 0.2, -0.2), HB(1.0, 0.5, 0.8), { mat: PIEL, tono: -0.08 }), bT(E, HB(0.45, s * 0.35, -1.45), HB(1.35, 0.38, 1.75), { mat: PIEL, tono: -0.13 })], { mat: PIEL, suave: 0.6 * SH }));
  }
  // ---- patas: dos huesos con IK al tobillo y la mano en el piso; calcetines blancos
  const fwd = nor([mv(cu.m, [1, 0, 0])[0], mv(cu.m, [1, 0, 0])[1], 0]);
  for (const del of [true, false]) for (const s of [1, -1]) {
    const marco = del ? fr : tr;
    const raiz = ap(marco, del ? B(7.4, s * 3.2, -1.6) : B(-7.8, s * 3.0, -0.4));
    const l1 = (del ? 6.3 : 6.8) * S, l2 = (del ? 7.4 : 7.2) * S;
    let st = { x: 0, z: 0, vuelo: 0 };
    if (acc === 'caminar') st = paso(f / 8 + (del ? 0 : 0.5) + (s > 0 ? 0.5 : 0), 9 * S, 3.2 * S, 0.52);
    else if (acc === 'correr') st = paso(ph - (del ? 0.47 + (s > 0 ? 0 : 0.07) : (s > 0 ? 0.07 : 0)), 17 * S, 3.8 * S, 0.36);
    const x0 = del ? 7.7 + P.adel : -8.6 + P.atras;
    let pieW = ap(W, [x0 * S + st.x, s * (del ? 3.3 + P.abre * 1.6 : 3.1 + P.abre * 0.8) * S, st.z + (del ? P.alzaDel : P.alzaTra) * S]);
    const vuelo = clamp(st.vuelo + (del ? P.alzaDel / 8 : P.alzaTra / 4), 0, 1);
    let tob = add(pieW, mv(cu.m, del ? [(-0.4 + 2.2 * vuelo) * S, 0, (1.85 - 0.3 * vuelo) * S] : [(-1.7 - 1.3 * vuelo) * S, 0, (4.3 - 1.0 * vuelo) * S]));
    // echado: las manos adelante en el piso con el codo atrás, las patas de atrás plegadas al costado
    const ech = del ? P.echDel : P.echTra;
    if (ech > 0) {
      const pL = ap(W, del ? [(P.av + 14.2) * S, s * 2.5 * S, 0.85 * S] : [(P.av - 3.8) * S, s * 4.7 * S, 0.85 * S]);
      const tL = ap(W, del ? [(P.av + 12.0) * S, s * 2.7 * S, 1.05 * S] : [(P.av - 8.3) * S, s * 5.0 * S, 1.25 * S]);
      pieW = mez(pieW, pL, ech); tob = mez(tob, tL, ech);
    }
    pieW[2] = Math.max(pieW[2], 0.85 * S); tob[2] = Math.max(tob[2], 1.05 * S);
    const doblez = mv(cu.m, del ? [-1, 0, 0] : [1, 0, 0.15]);
    const [rod, tob2] = ik(raiz, tob, l1, l2, doblez);
    const pz = add(tob2, sub(pieW, tob));
    pz[2] = Math.max(pz[2], 0.85 * S);
    cs.push(hueso(raiz, rod, (del ? 1.8 : 2.6) * S, (del ? 1.3 : 1.6) * S, pel));
    const pie = add(pz, fwd, 0.55 * S);
    const baja: Comp[] = del ? [
      hueso(rod, tob2, 1.2 * S, 0.92 * S, pel),
      bulto(mez(rod, tob2, 0.28), [2.3 * S, 1.4 * S, 1.45 * S], { eje: sub(tob2, rod), mat: PIEL }),
      hueso(mez(rod, tob2, 0.6), tob2, 1.2 * S, 1.07 * S, bla),
      hueso(tob2, pz, 1.07 * S, 0.98 * S, bla),
      bulto(pie, [1.45 * S, 1.15 * S, 0.85 * S], { eje: fwd, mat: BLANCO }),
    ] : [
      hueso(rod, tob2, 1.85 * S, 1.05 * S, pel),
      bulto(mez(rod, tob2, 0.3), [2.7 * S, 1.65 * S, 1.65 * S], { eje: sub(tob2, rod), mat: PIEL }),
      hueso(mez(rod, tob2, 0.86), tob2, 1.12 * S, 1.07 * S, bla),
      hueso(tob2, pz, 1.02 * S, 0.92 * S, bla),
      bulto(pie, [1.4 * S, 1.1 * S, 0.85 * S], { eje: fwd, mat: BLANCO }),
    ];
    ps.push(masa(baja, { mat: PIEL, suave: 0.9 * S }));
  }
  // ---- cola corta, gruesa en la base, alta y que menea
  const cb = B(-10.0, 0, 3.2), al = rad(P.colaAlza), wg = rad(P.cola);
  const cdir: V3 = [-Math.cos(al) * Math.cos(wg), Math.sin(wg) * Math.cos(al), Math.sin(al)];
  cs.push(hT(tr, cb, add(cb, cdir, 2.0 * S), 1.25 * S, 1.0 * S, pel));
  ps.push(una(hT(tr, add(cb, cdir, 1.6 * S), add(cb, cdir, 3.0 * S), 1.0 * S, 0.62 * S, pel), PIEL, 0.4));
  ps.unshift(masa(cs, { mat: PIEL, suave: 1.6 * S }));
  // ---- equipo del nivel, onda del ladrido
  const ctx: Ctx = { W, fr, cu, tr, cab, mand, P, acc, f, ph, cuelloA: base, cuelloB: nucaL, cuelloR: neckR };
  const eq = equipo(nivel, ctx);
  ps.push(...eq.piezas);
  let resplandor: Escena['resplandor'] = eq.resplandor;
  if (P.onda >= 0) {
    const o = onda(ctx, nivel);
    ps.push(...o.piezas);
    resplandor = o.resplandor;
  }
  // se apaga con dignidad: todo baja de tono despacio
  if (P.apaga > 0) for (const p of ps) p.tono = (p.tono ?? 0) - P.apaga * 0.12;
  return { piezas: ps, resplandor };
}

// ------------------------------------------------------------------ equipo por nivel
/** Punto del cuello (marco del pecho) a la altura t (0 base, 1 nuca) y su radio. */
function enCuello(c: Ctx, t: number): { p: V3; r: number; dir: V3 } {
  const p = mez(c.cuelloA, c.cuelloB, t);
  return { p, r: lerp(c.cuelloR[0], c.cuelloR[1], t), dir: nor(sub(c.cuelloB, c.cuelloA)) };
}
/** Anillo alrededor del cuello (collar, golas): puntos en el mundo y su "abajo" (el lado de la garganta). */
function anillo(c: Ctx, t: number, extra: number, n = 12): { pts: V3[]; garganta: V3; centro: V3; afuera: V3; r: number } {
  const { p, r, dir } = enCuello(c, t);
  const u0 = nor(sub([0, 0, -1], esc(dir, pto([0, 0, -1], dir))));
  const v0 = cruz(dir, u0);
  const R = r + extra;
  const pts: V3[] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU; pts.push(ap(c.fr, add(add(p, u0, Math.cos(a) * R), v0, Math.sin(a) * R))); }
  return { pts, garganta: ap(c.fr, add(p, u0, R)), centro: ap(c.fr, p), afuera: nor(mv(c.fr.m, u0)), r: R };
}
function collar(c: Ctx, mat: string, placa: string | null, grueso = 0.62): Pieza[] {
  const ps: Pieza[] = [];
  const an = anillo(c, 0.32, 0.2 * S);
  const cs: Comp[] = [];
  an.pts.forEach((p, i) => cs.push(hueso(p, an.pts[(i + 1) % an.pts.length], grueso * S, grueso * S, { mat })));
  ps.push(masa(cs, { mat, suave: 0.35 * S }));
  if (placa) {
    const ar = add(an.garganta, an.afuera, 0.5 * S);
    const cuelga = add(add(ar, [0, 0, -1.25 * S]), an.afuera, 0.25 * S);
    ps.push(palo(ar, cuelga, 0.22 * S, { mat: 'cu_placa' }));
    const eje = nor(add(an.afuera, [0, 0, -0.2]));
    ps.push(cilindro(...add(cuelga, eje, -0.15 * S), 0.95 * S, 0.32 * S, { mat: placa, eje }));
  }
  return ps;
}
/** Pañuelo: un triángulo de tela que cuelga del collar sobre el pecho. */
function panuelo(c: Ctx): Pieza[] {
  const an = anillo(c, 0.3, 0.5 * S, 16);
  const n = an.pts.length;
  const iz = an.pts[Math.round(n * 0.22)], de = an.pts[Math.round(n * 0.78)];
  const pecho = nor(mv(c.fr.m, [1, 0, -0.2]));
  const punta = add(add(an.garganta, [0, 0, -4.2 * S]), pecho, 1.6 * S);
  const g = an.garganta;
  const e = 0.3 * S, out = an.afuera;
  const tri = (a: V3, b: V3, q: V3) => poliedro([add(a, out, e), add(b, out, e), add(q, out, e), add(a, out, -e), add(b, out, -e), add(q, out, -e)], { mat: 'th_panuelo' });
  const mid = add(mez(g, punta, 0.45), out, 0.35 * S);
  return [tri(iz, g, mid), tri(g, de, mid), tri(iz, mid, punta), tri(mid, de, punta), una(bulto(add(g, out, 0.3 * S), [0.8 * S, 0.8 * S, 0.8 * S], { mat: 'th_panuelo' }), 'th_panuelo')];
}

function equipo(nivel: number, c: Ctx): { piezas: Pieza[]; resplandor?: Escena['resplandor'] } {
  const ps: Pieza[] = [];
  const { fr, cu, tr, cab } = c;
  const resp = 1 + c.P.jadeo * 0.045;
  if (nivel === 0) return { piezas: collar(c, 'th_collar', null) };
  if (nivel === 1) return { piezas: [...collar(c, 'th_collar', 'cu_oro'), ...panuelo(c)] };
  if (nivel === 2) {
    // peto de cuero: pechera acolchada, manta sobre el lomo, cincha detrás de los codos y remaches de bronce
    const L = 'cu_cuero';
    ps.push(masa([bT(fr, B(9.0, 0, -0.7), B(2.95, 4.25 * resp, 3.85), { mat: L, tono: -0.06 }), bT(fr, B(6.8, 0, -3.3), B(3.2, 3.5, 1.9), { mat: L, tono: -0.06 })], { mat: L, suave: 0.8 * S }));
    ps.push(masa([bT(fr, B(9.2, 0, -0.7), B(2.6, 4.45 * resp, 4.05), { mat: 'cu_cuero_negro' })], { mat: 'cu_cuero_negro' }));
    ps.push(masa([bT(fr, B(4.4, 0, 4.0), B(5.4, 4.3 * resp, 2.7), { mat: L }), bT(cu, B(-0.6, 0, 3.8), B(4.8, 4.3, 2.4), { mat: L })], { mat: L, suave: 1 * S }));
    ps.push(masa([bT(fr, B(4.4, 0, 3.7), B(5.65, 4.55 * resp, 2.55), { mat: 'cu_cuero_negro', tono: 0.05 }), bT(cu, B(-0.6, 0, 3.5), B(5.05, 4.55, 2.25), { mat: 'cu_cuero_negro' })], { mat: 'cu_cuero_negro', suave: 1 * S }));
    for (const x of [2.6]) {
      const cs: Comp[] = [];
      for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU, b = ((i + 1) / 12) * TAU; cs.push(hT(fr, B(x, Math.cos(a) * 5.1 * resp, 0.4 + Math.sin(a) * 5.6 * resp), B(x, Math.cos(b) * 5.1 * resp, 0.4 + Math.sin(b) * 5.6 * resp), 0.45 * S, 0.45 * S, { mat: 'cu_cuero_negro' })); }
      ps.push(masa(cs, { mat: 'cu_cuero_negro', suave: 0.3 * S }));
    }
    // tirantes de la pechera a la manta y remaches de bronce
    const tir: Comp[] = [];
    for (const s of [1, -1]) {
      tir.push(hT(fr, B(9.2, s * 3.8, 2.4), B(5.0, s * 5.0, 3.2), 0.42 * S, 0.42 * S, { mat: 'cu_cuero_negro' }));
      for (const [x, y, z] of [[11.4, 1.7, 0.4], [11.0, 1.7, -2.2], [6.0, 4.6, 4.0], [1.0, 4.4, 4.0]] as V3[]) ps.push(esfera(...ap(fr, B(x, s * y, z)), 0.42 * S, { mat: 'cu_bronce' }));
    }
    ps.push(masa(tir, { mat: 'cu_cuero_negro', suave: 0.3 * S }));
    ps.push(...collar(c, 'th_collar', 'cu_oro'));
    return { piezas: ps };
  }
  if (nivel === 3) {
    // peto de malla sobre el lomo y los costados, gola de malla, hombreras de acero con remaches y cincha de cuero
    const Ma = 'cu_malla';
    ps.push(masa([
      bT(fr, B(4.2, 0, 1.0), B(6.55, 5.25 * resp, 4.9), { mat: Ma }), bT(fr, B(8.9, 0, -0.6), B(3.0, 4.25 * resp, 3.9), { mat: Ma }),
      bT(cu, B(-0.5, 0, 1.7), B(5.4, 4.75, 3.9), { mat: Ma }), bT(cu, B(-4.0, 0, 2.6), B(3.4, 3.75, 2.8), { mat: Ma }),
    ], { mat: Ma, suave: 1.2 * S }));
    const gola = anillo(c, 0.5, 0.35 * S, 14);
    ps.push(masa(gola.pts.map((p) => bulto(p, [1.1 * S, 1.1 * S, 1.6 * S], { eje: mv(fr.m, enCuello(c, 0.5).dir), mat: Ma })), { mat: Ma, suave: 0.9 * S }));
    for (const s of [1, -1]) {
      const H = cmp(fr, T(B(6.6, s * 4.1, 2.6), Ry(-24), Rx(s * 22)));
      ps.push(masa([bT(H, [0, 0, 0], B(3.6, 2.3, 3.4), { mat: 'cu_placa' }), bT(H, B(0, s * 0.5, -2.4), B(3.3, 1.9, 1.4), { mat: 'cu_placa', tono: -0.05 })], { mat: 'cu_placa', suave: 0.5 * S }));
      ps.push(masa([bT(H, B(0, s * 0.35, -0.2), B(3.85, 2.4, 3.55), { mat: 'cu_cuero_negro' })], { mat: 'cu_cuero_negro' }));
      for (const k of [-1, 0, 1]) ps.push(esfera(...ap(H, B(k * 2.0, s * 2.1, 0.6)), 0.38 * S, { mat: 'cu_bronce' }));
    }
    const cs: Comp[] = [];
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU, b = ((i + 1) / 12) * TAU; cs.push(hT(fr, B(2.4, Math.cos(a) * 5.45 * resp, 0.6 + Math.sin(a) * 5.65 * resp), B(2.4, Math.cos(b) * 5.45 * resp, 0.6 + Math.sin(b) * 5.65 * resp), 0.5 * S, 0.5 * S, { mat: 'cu_cuero' })); }
    ps.push(masa(cs, { mat: 'cu_cuero', suave: 0.3 * S }));
    ps.push(...collar(c, 'th_collar', 'cu_oro'));
    return { piezas: ps };
  }
  // ---- 4 y 5: barda de placas (pechera, gola de láminas, flancos, lomo y grupera) y casco abierto
  const leg = nivel === 5;
  const PL = leg ? 'th_esmalte' : 'th_acero', RIB = leg ? 'cu_oro' : 'cu_bronce';
  const pulso = 0.5 + 0.5 * Math.sin(c.ph * TAU);
  const viva = leg ? (c.P.apaga > 0.5 ? 'cu_oro' : 'th_oro_vivo') : RIB;
  // malla debajo (se ve en las juntas)
  ps.push(masa([bT(fr, B(4.2, 0, 0.7), B(6.4, 5.1 * resp, 5.0 * resp), { mat: 'cu_malla' }), bT(cu, B(-0.4, 0, 1.5), B(5.3, 4.6, 3.8), { mat: 'cu_malla' })], { mat: 'cu_malla', suave: 1.2 * S }));
  // pechera con arista y su ribete
  ps.push(masa([bT(fr, B(9.1, 0, -0.5), B(3.05, 4.35 * resp, 4.05), { mat: PL }), bT(fr, B(10.3, 0, -0.4), B(1.6, 1.2, 3.5), { mat: PL, tono: 0.06, k: 0.4 * S })], { mat: PL, suave: 0.7 * S }));
  {
    const cs: Comp[] = [];
    for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + (i / 8) * Math.PI; cs.push(bT(fr, B(8.6 + Math.cos(a) * 1.6, Math.sin(a) * 4.5 * resp, 3.5 - Math.cos(a) * 0.6), B(0.6, 0.6, 0.6), { mat: RIB })); }
    ps.push(masa(cs, { mat: RIB, suave: 1.1 * S }));
  }
  // flancos (un plato por lado), placa del lomo y grupera, cada una con ribete
  for (const s of [1, -1]) {
    ps.push(masa([bG(fr, B(3.4, s * 4.2, 0.3), B(4.8, 1.5, 4.1), [Rx(s * 6)], { mat: PL })], { mat: PL, suave: 0.5 * S }));
    ps.push(masa([bG(fr, B(3.4, s * 4.1, -3.5), B(4.8, 1.45, 0.75), [Rx(s * 6)], { mat: RIB })], { mat: RIB }));
    ps.push(masa([bG(tr, B(-7.2, s * 3.6, 0.8), B(4.0, 1.4, 3.7), [Rx(s * 6)], { mat: PL })], { mat: PL, suave: 0.5 * S }));
    ps.push(masa([bG(tr, B(-7.2, s * 3.5, -2.7), B(3.9, 1.35, 0.7), [Rx(s * 6)], { mat: RIB })], { mat: RIB }));
    for (const x of [6.1, 3.4, 0.7]) ps.push(esfera(...ap(fr, B(x, s * 5.5, 1.8)), 0.4 * S, { mat: RIB }));
  }
  ps.push(masa([bT(fr, B(4.4, 0, 4.0), B(5.6, 4.25 * resp, 2.5), { mat: PL }), bT(cu, B(-0.6, 0, 3.8), B(4.6, 4.15, 2.0), { mat: PL, tono: -0.03 })], { mat: PL, suave: 0.7 * S }));
  ps.push(masa([bT(tr, B(-7.0, 0, 2.9), B(4.4, 4.25, 3.0), { mat: PL })], { mat: PL, suave: 0.6 * S }));
  ps.push(masa([hT(cu, B(-3.6, -4.2, 3.9), B(-3.6, 4.2, 3.9), 0.55 * S, 0.55 * S, { mat: RIB }), hT(fr, B(8.6, -3.5, 4.4), B(8.6, 3.5, 4.4), 0.55 * S, 0.55 * S, { mat: RIB })], { mat: RIB, suave: 0.2 * S }));
  // gola de láminas sobre la nuca (tres bandas que se solapan)
  for (let k = 0; k < 3; k++) {
    const t = 0.18 + k * 0.27;
    const { p, r, dir } = enCuello(c, t);
    const up = nor(sub([0, 0, 1], esc(dir, pto([0, 0, 1], dir))));
    const ce = add(p, up, r * 0.35);
    ps.push(una(bulto(ap(fr, ce), [1.7 * S, (r + 0.55 * S) * 1.02, (r * 0.85 + 0.4 * S)], { ejes: [nor(mv(fr.m, dir)), nor(mv(fr.m, cruz(up, dir))), nor(mv(fr.m, up))], mat: PL, tono: -k * 0.03 }), PL, 0.4));
    ps.push(una(bulto(ap(fr, add(ce, dir, -1.2 * S)), [0.45 * S, (r + 0.65 * S) * 1.02, (r * 0.85 + 0.5 * S)], { ejes: [nor(mv(fr.m, dir)), nor(mv(fr.m, cruz(up, dir))), nor(mv(fr.m, up))], mat: RIB }), RIB, 0.3));
  }
  // casco abierto: gorro sobre el cráneo con visera de frente y nasal corto; la cara queda libre
  ps.push(masa([bT(cab, HB(1.6, 0, 2.5), HB(3.3, 3.0, 2.3), { mat: PL }), bT(cab, HB(3.9, 0, 3.0), HB(1.2, 2.6, 0.9), { mat: PL, tono: 0.05 })], { mat: PL, suave: 0.6 * SH }));
  ps.push(masa([bT(cab, HB(1.6, 0, 1.15), HB(3.45, 3.15, 0.55), { mat: RIB }), hT(cab, HB(4.2, 0, 3.3), HB(5.4, 0, 2.6), 0.5 * SH, 0.4 * SH, { mat: RIB })], { mat: RIB, suave: 0.4 * SH }));
  if (leg) {
    // cresta dorada, emblema de la casa en la pechera, filigrana que respira y capa corta
    ps.push(masa([hT(cab, HB(-0.8, 0, 4.5), HB(3.4, 0, 4.9), 0.55 * SH, 0.45 * SH, { mat: 'cu_oro' }), bT(cab, HB(1.2, 0, 5.0), HB(2.3, 0.35, 0.9), { mat: 'cu_oro' })], { mat: 'cu_oro', suave: 0.4 * SH }));
    const emb = ap(fr, B(11.6, 0, -0.2)), eje = nor(mv(fr.m, [1, 0, -0.1]));
    ps.push(cilindro(...add(emb, eje, -0.35 * S), 1.35 * S, 0.5 * S, { mat: 'cu_oro', eje }));
    ps.push(esfera(...add(emb, eje, 0.25 * S), 0.7 * S, { mat: viva, tono: -0.1 + 0.2 * pulso }));
    for (const s of [1, -1]) {
      const fil: V3[] = [B(6.0, s * 5.5, 2.6), B(4.2, s * 5.65, 1.0), B(2.4, s * 5.6, 2.2), B(0.8, s * 5.5, 0.8)];
      for (let k = 0; k < fil.length - 1; k++) ps.push(palo(ap(fr, fil[k]), ap(fr, fil[k + 1]), 0.32 * S, { mat: viva, tono: -0.15 + 0.25 * pulso }));
    }
    ps.push(...capa(c));
    ps.push(...collar(c, 'cu_oro', 'th_esmalte', 0.68));
    const brillo = c.P.apaga > 0.5 ? undefined : { c: ap(cu, B(3, 0, 9)), r: (9 + 4 * pulso) * S, color: '#c89a48' };
    return { piezas: ps, resplandor: brillo };
  }
  ps.push(...collar(c, 'th_collar', 'cu_oro'));
  return { piezas: ps };
}

/** Capa corta azul con ribete de oro: cae de la cruz sobre el lomo y se mece con el paso. */
function capa(c: Ctx): Pieza[] {
  const { fr, cu, P, ph } = c;
  const vuela = c.acc === 'correr' ? 1 : c.acc === 'caminar' ? 0.45 : c.acc === 'atacar' ? 0.7 : 0.1;
  const ondea = Math.sin(ph * TAU * 2) * vuela;
  const L = cmp(cu, T([0, 0, 0], Rx(P.roll * 0.5)));
  const cs: Comp[] = [];
  const filas = 4;
  for (let i = 0; i < filas; i++) {
    const t = i / (filas - 1);
    const x = lerp(5.5, -6.5, t), lev = vuela * t * 2.2 + ondea * t * 0.8;
    const marco = i === 0 ? fr : L;
    cs.push(bT(marco, B(x, 0, 4.4 + lev - t * 0.5), B(3.4, lerp(5.0, 5.7, t), 1.9 - t * 0.3), { mat: 'th_capa' }));
  }
  const ribete: Comp[] = [];
  for (let i = 0; i < filas; i++) {
    const t = i / (filas - 1), x = lerp(5.5, -6.5, t), lev = vuela * t * 2.2 + ondea * t * 0.8;
    for (const s of [1, -1]) ribete.push(bT(L, B(x, s * lerp(5.3, 6.0, t), 3.2 + lev - t * 0.9), B(2.8, 0.5, 0.5), { mat: 'cu_oro' }));
  }
  ribete.push(bT(L, B(-6.5 - 2.8, 0, 3.2 + vuela * 2.2 + ondea * 0.8), B(0.5, 5.0, 0.6), { mat: 'cu_oro' }));
  return [masa(cs, { mat: 'th_capa', suave: 1.6 * S }), masa(ribete, { mat: 'cu_oro', suave: 1.2 * S })];
}

// ------------------------------------------------------------------ onda del ladrido y aura de escudo
function onda(c: Ctx, nivel: number): { piezas: Pieza[]; resplandor: Escena['resplandor'] } {
  const { W, mand, P } = c;
  const t = clamp(P.onda, 0, 1);
  const ps: Pieza[] = [];
  const mat = nivel === 5 ? 'th_onda_oro' : 'th_onda';
  const boca = ap(mand, HB(3.4, 0, 0.6));
  // anillos de sonido que salen de la boca hacia adelante y se abren (dos ladridos)
  const fw = nor(mv(c.cab.m, [1, 0, 0])), u = nor(cruz(fw, [0, 0, 1])), v = cruz(u, fw);
  const lazo = (pts: V3[], r: number, tono: number, cerrado = true) => { for (let i = 0; i < pts.length - (cerrado ? 0 : 1); i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if (a[2] > 0.2 && b[2] > 0.2) ps.push(palo(a, b, r, { mat, tono })); } };
  for (let k = 0; k < 2; k++) {
    const tt = t - k * 0.5;
    if (tt < 0 || tt > 0.95) continue;
    const cen = add(boca, fw, (1.5 + tt * 13) * S), R = (1.4 + tt * 6.5) * S, n = 14;
    lazo(Array.from({ length: n }, (_, i) => { const a = (i / n) * TAU; return add(add(cen, u, Math.cos(a) * R), v, Math.sin(a) * R); }), (0.42 - tt * 0.15) * S, -tt * 0.3);
  }
  // aura de escudo: círculo en el piso que se abre, runas y una cúpula de meridianos que crece alrededor del perro
  const Rs = (12 + 9 * suave(t * 1.4)) * S, Hs = Rs * 0.9;
  const cen = ap(W, [P.av * S + 1 * S, 0, 0]);
  const enCupula = (a: number, b: number): V3 => [cen[0] + Math.cos(a) * Math.cos(b) * Rs, cen[1] + Math.sin(a) * Math.cos(b) * Rs, Math.sin(b) * Hs + 0.4];
  lazo(Array.from({ length: 32 }, (_, i) => enCupula((i / 32) * TAU, 0)), 0.5 * S, -0.05);
  lazo(Array.from({ length: 28 }, (_, i) => { const a = (i / 28) * TAU; return [cen[0] + Math.cos(a) * Rs * 0.82, cen[1] + Math.sin(a) * Rs * 0.82, 0.3] as V3; }), 0.28 * S, -0.25);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.3, r0 = Rs * 0.91;
    const p0: V3 = [cen[0] + Math.cos(a) * r0, cen[1] + Math.sin(a) * r0, 0.3], p1: V3 = [cen[0] + Math.cos(a + 0.12) * r0, cen[1] + Math.sin(a + 0.12) * r0, 0.3];
    ps.push(palo(p0, p1, 0.55 * S, { mat, tono: -0.1 }), esfera(...mez(p0, p1, 0.5), 0.7 * S, { mat }));
  }
  if (t > 0.15) {
    // los meridianos suben desde el piso y se cierran arriba; un paralelo a media altura
    const sube = suave((t - 0.15) * 1.6) * (Math.PI / 2) * 0.96;
    for (let m = 0; m < 8; m++) {
      const a = (m / 8) * TAU + 0.2;
      lazo(Array.from({ length: 7 }, (_, j) => enCupula(a, (j / 6) * sube)), 0.3 * S, -0.2, false);
    }
    if (sube > 0.7) lazo(Array.from({ length: 24 }, (_, i) => enCupula((i / 24) * TAU, 0.62)), 0.28 * S, -0.25);
  }
  return { piezas: ps, resplandor: { c: add(boca, fw, (5 + t * 10) * S), r: (8 + 6 * t) * S, color: nivel === 5 ? '#b08a40' : '#3a62b8' } };
}

// ------------------------------------------------------------------ registro
/** La escena de Thor para un nivel de armadura (0..5), una dirección, una acción y un cuadro. */
export function thorEscena(nivel: number, d: Dir, acc: AccThor, f: number): Escena {
  return boxer(clamp(Math.round(nivel), 0, 5), d, acc, f);
}
/** Los seis Thor como monstruos (uno por tramo de armadura): id de monstruo thor_<nivel>, como en BESTIAS. */
export const THOR_MONSTRUOS: { id: string; nombre: [string, string]; nivel: number; huella: [number, number] }[] = THOR_NIVELES.map((n) => ({ id: `thor_${n.nivel}`, nombre: n.nombre, nivel: n.nivel, huella: [1, 1] }));
for (const n of THOR_NIVELES) for (const a of THOR_ACCIONES) {
  registrar({
    id: `mon_thor_${n.nivel}_${a.acc}`, nombre: [`${n.nombre[0]} · ${a.nombre[0]}`, `${n.nombre[1]} · ${a.nombre[1]}`], tema: 'monstruos',
    variantes: [...DIRS], cuadros: a.cuadros, t: a.t, huella: [1, 1], bloquea: false,
    armar: (v, f) => boxer(n.nivel, v as Dir, a.acc, f),
  });
}

// ------------------------------------------------------------------ íconos 3D para la casilla de equipo del perro
/** Marco de ícono: de pie, de frente a la cámara (que mira hacia -x -y), o tendido en el piso. */
const marcoIcono = (pose: string, alto: number): Tr => (pose === 'suelo' ? T([0, 0, 1.2], Rz(-45), Ry(-80)) : T([0, 0, alto], Rz(-135)));
/** Collar azul con su placa dorada, más grande que en el perro para que se lea en la casilla. */
function iconoCollar(pose: string, f: number): Escena {
  const E = 2.2, k = marcoIcono(pose, 11.5 * E);
  const ps: Pieza[] = [];
  const R = 4.2 * E, n = 16, cs: Comp[] = [];
  const pt = (i: number): V3 => { const a = (i / n) * TAU; return ap(k, [0, Math.cos(a) * R, Math.sin(a) * R * 0.92]); };
  for (let i = 0; i < n; i++) cs.push(hueso(pt(i), pt(i + 1), 0.95 * E, 0.95 * E, { mat: 'th_collar' }));
  ps.push(masa(cs, { mat: 'th_collar', suave: 0.4 }));
  // hebilla arriba y argolla con la placa abajo; la placa gira despacio y brilla
  ps.push(masa([bT(k, [0, 0, R * 0.92], [0.9 * E, 1.5 * E, 1.25 * E], { mat: 'cu_placa' })], { mat: 'cu_placa', suave: 0.3 }));
  ps.push(masa([bT(k, [0, 0, R * 0.92], [1.2 * E, 0.6 * E, 0.7 * E], { mat: 'th_collar', tono: -0.1 })], { mat: 'th_collar' }));
  const arg = ap(k, [0, 0, -R * 0.92 - 0.8 * E]);
  ps.push(masa([bT(k, [0, 0, -R * 0.92 - 0.9 * E], [0.35 * E, 0.7 * E, 0.7 * E], { mat: 'cu_placa' })], { mat: 'cu_placa' }));
  const g = Math.sin((f / 8) * TAU) * 18;
  const pk = cmp(k, T([0.3 * E, 0, -R * 0.92 - 3.0 * E], Rz(g)));
  ps.push(cilindro(...ap(pk, [-0.25 * E, 0, 0]), 1.75 * E, 0.5 * E, { mat: 'cu_oro', eje: nor(mv(pk.m, [1, 0, 0])) }));
  ps.push(masa([bT(pk, [0.3 * E, 0, 0], [0.12 * E, 1.0 * E, 1.0 * E], { mat: 'cu_oro', tono: -0.12 })], { mat: 'cu_oro' }));
  ps.push(palo(arg, ap(pk, [0, 0, 1.6 * E]), 0.3 * E, { mat: 'cu_placa' }));
  return { piezas: ps, resplandor: { c: ap(pk, [2 * E, 0, 0]), r: 9 * E, color: '#ffe2a0' } };
}
/** Barda de la Casa GG plegada: la capa azul doblada, la pechera esmaltada encima y el casco abierto coronando. */
function iconoBarda(pose: string, f: number): Escena {
  const E = 1.6, k = T([0, 0, 0], Rz(pose === 'suelo' ? 30 : 45));
  const ps: Pieza[] = [];
  const pulso = 0.5 + 0.5 * Math.sin((f / 8) * TAU);
  // capa doblada en tres pliegues con ribete de oro
  for (let i = 0; i < 3; i++) {
    const z = (1.4 + i * 2.1) * E, w = (9 - i * 0.6) * E;
    ps.push(masa([bT(k, [0, 0, z], [w, 6.4 * E - i * 0.3 * E, 1.15 * E], { mat: 'th_capa', tono: -i * 0.03 })], { mat: 'th_capa', suave: 0.5 }));
    ps.push(masa([bT(k, [w * 0.92, 0, z], [0.6 * E, 6.3 * E - i * 0.3 * E, 1.1 * E], { mat: 'cu_oro' })], { mat: 'cu_oro', suave: 0.3 }));
  }
  // pechera esmaltada con arista, ribete y el emblema de la casa
  const pe = cmp(k, T([2.2 * E, 0, 10.2 * E], Ry(58)));
  ps.push(masa([bT(pe, [0, 0, 0], [5.4 * E, 5.6 * E, 2.0 * E], { mat: 'th_esmalte' }), bT(pe, [0, 0, 1.4 * E], [4.8 * E, 1.3 * E, 0.9 * E], { mat: 'th_esmalte', tono: 0.06 })], { mat: 'th_esmalte', suave: 0.6 }));
  const rib: Comp[] = [];
  for (let i = 0; i <= 10; i++) { const a = (i / 10) * TAU; rib.push(bT(pe, [Math.cos(a) * 5.2 * E, Math.sin(a) * 5.4 * E, 0.2 * E], [0.7 * E, 0.7 * E, 0.6 * E], { mat: 'cu_oro' })); }
  ps.push(masa(rib, { mat: 'cu_oro', suave: 1.2 }));
  const emb = ap(pe, [0, 0, 2.05 * E]), ej = nor(mv(pe.m, [0, 0, 1]));
  ps.push(cilindro(...emb, 1.9 * E, 0.45 * E, { mat: 'cu_oro', eje: ej }));
  ps.push(esfera(...add(emb, ej, 0.5 * E), 1.0 * E, { mat: 'th_oro_vivo', tono: -0.1 + 0.2 * pulso }));
  // casco abierto con cresta dorada apoyado al costado
  const ca = cmp(k, T([-4.2 * E, -2.6 * E, 10.4 * E], Rz(-20), Ry(-6)));
  ps.push(masa([bT(ca, [0, 0, 0], [3.4 * E, 3.0 * E, 2.4 * E], { mat: 'th_esmalte' }), bT(ca, [2.4 * E, 0, 0.3 * E], [1.1 * E, 2.6 * E, 0.9 * E], { mat: 'th_esmalte', tono: 0.05 })], { mat: 'th_esmalte', suave: 0.6 }));
  ps.push(masa([bT(ca, [0, 0, -1.5 * E], [3.55 * E, 3.15 * E, 0.55 * E], { mat: 'cu_oro' }), hT(ca, [-2.6 * E, 0, 2.0 * E], [2.4 * E, 0, 2.5 * E], 0.6 * E, 0.45 * E, { mat: 'cu_oro' }), bT(ca, [0, 0, 2.6 * E], [2.2 * E, 0.35 * E, 0.9 * E], { mat: 'cu_oro' })], { mat: 'cu_oro', suave: 0.4 }));
  return { piezas: ps, resplandor: { c: add(emb, ej, 3 * E), r: (12 + 5 * pulso) * E, color: '#ffcf6a' } };
}
registrar(
  { id: 'thor_icono_collar', nombre: ['Collar de Thor', "Thor's collar"], tema: 'armas', variantes: ['icono', 'suelo'], cuadros: 8, t: 3, huella: [1, 1], bloquea: false, armar: (v, f) => iconoCollar(v, f) },
  { id: 'thor_icono_barda', nombre: ['Barda de la Casa GG', 'House GG barding'], tema: 'armas', variantes: ['icono'], cuadros: 8, t: 3, huella: [1, 1], bloquea: false, armar: (v, f) => iconoBarda(v, f) },
);
