import '../cuerpo';
import { registrar } from '../objeto';
import { MATERIALES } from '../materiales';
import { DIRS, type Dir } from '../figura';
import { ruido, cilindro, elipsoide, esfera, palo, poliedro, caja, masa, hueso, bulto, type Comp, type Pieza, type V3, type Escena, type OpcComp } from '../render';

/**
 * Bestias y jefes: monstruos que no son humanoides (perros del infierno, lobos, jabalíes, arañas, escorpiones, un
 * gusano de arena, un gólem de piedra, gárgolas, un dragón de huesos, un demonio alado y murciélagos). Cada uno
 * tiene su propio esqueleto: cuadrúpedos con pares diagonales al trotar, arañas con marcha de tetrápodo
 * alternado, un gusano con ondas que suben por los anillos, bípedos pesados y voladores que baten las alas. La
 * carne es masa (huesos y bultos fundidos con unión suave, cada uno con su material) y lo duro (púas, dientes,
 * grietas de lava, membranas) va en piezas aparte.
 *
 * Todo se arma en un marco local de la bestia (x adelante, y a la derecha, z arriba, origen en el piso bajo el
 * centro) y se lleva al mundo con el rumbo de la dirección. Escala: una persona mide 61 (75 px).
 */

// ------------------------------------------------------------------ materiales propios
const M = MATERIALES;
M.be_carbon = { rampa: ['#060505', '#0d0b0a', '#161211', '#1f1a17', '#29221e', '#342b26', '#40352f', '#4d4039', '#5b4c43'], ruido: 0.4, escala: 0.55, brillo: 0.12 };
M.be_brasa = { rampa: ['#1c0604', '#330b06', '#4d1208', '#6a1b0b', '#86270f'], ruido: 0.3, escala: 0.5 };
M.be_cuerno = { rampa: ['#070505', '#110d0b', '#1d1712', '#2b221b', '#3b3025', '#4e4031', '#64533f'], ruido: 0.2, escala: 0.9, brillo: 0.35 };
M.be_jabali = { rampa: ['#0b0706', '#160e0b', '#231711', '#312118', '#402c20', '#503829', '#614533', '#73533e'], ruido: 0.55, escala: 1.5, patron: (p) => (Math.sin(p[2] * 2.2 + p[0] * 0.9) > 0.55 ? -0.08 : 0) };
M.be_hocico = { rampa: ['#140a09', '#26130f', '#3a1e17', '#4f2a20', '#65372a', '#7b4535'], ruido: 0.12, escala: 0.6, brillo: 0.15 };
M.be_marca = { rampa: ['#1e0303', '#380706', '#560c0a', '#76140f', '#962016', '#b2301f'], ruido: 0.12, escala: 0.6, brillo: 0.4 };
M.be_seda = { rampa: ['#2c2a26', '#45423c', '#605c54', '#7c776d', '#989287', '#b1ab9f', '#c7c2b6'], ruido: 0.45, escala: 1.3 };
M.be_quitina_parda = { rampa: ['#0a0705', '#150f0a', '#211810', '#2e2217', '#3c2d1f', '#4b3a28', '#5c4832'], ruido: 0.18, escala: 0.7, brillo: 0.4 };
M.be_ambar = { rampa: ['#080504', '#110b07', '#1c130b', '#281b10', '#352415', '#432e1b', '#523a22', '#62462a'], ruido: 0.2, escala: 0.7, brillo: 0.45 };
M.be_veneno = { rampa: ['#205010', '#3a8a18', '#68c030', '#b0f060', '#e8ffb0'], ruido: 0.3, escala: 0.5, emite: true };
M.be_gusano = { rampa: ['#120d0c', '#211816', '#322421', '#44322d', '#57413a', '#6b5148', '#7f6257', '#937467'], ruido: 0.25, escala: 0.5, patron: (p) => (Math.sin(p[0] * 0.7 + p[1] * 0.5 + Math.sin(p[2] * 0.3) * 3) > 0.7 ? -0.06 : 0) };
M.be_gusano_placa = { rampa: ['#080605', '#100c0a', '#1a1410', '#251d17', '#31271f', '#3e3128', '#4c3c31'], ruido: 0.35, escala: 0.6, brillo: 0.35 };
M.be_garganta = { rampa: ['#060101', '#140303', '#280706', '#3f0d0a', '#58150f', '#701f16'], ruido: 0.25, escala: 0.6, brillo: 0.3 };
M.be_piedra_garg = { rampa: ['#0f100f', '#1b1d1b', '#292c29', '#383c37', '#484d47', '#5a6058', '#6d736a', '#81877d'], ruido: 0.4, escala: 0.55 };
M.be_membrana = { rampa: ['#0b0809', '#151012', '#1f181b', '#2b2125', '#382b30', '#46363c'], ruido: 0.45, escala: 0.7 };
M.be_membrana_roja = { rampa: ['#0a0303', '#140605', '#1f0a08', '#2b0f0b', '#38150f', '#461b13'], ruido: 0.45, escala: 0.6 };
M.be_demonio = { rampa: ['#070303', '#0f0605', '#180908', '#220d0b', '#2d120e', '#3a1812', '#481e17', '#57261d', '#672f24'], ruido: 0.28, escala: 0.45, brillo: 0.2 };
M.be_murcielago = { rampa: ['#0d0a09', '#1a1411', '#281f19', '#372b22', '#47382c', '#584637', '#6a5543'], ruido: 0.5, escala: 1.6 };
M.be_membrana_murc = { rampa: ['#100b0b', '#1c1314', '#2a1c1d', '#3a2627', '#4b3132', '#5d3d3d'], ruido: 0.35, escala: 0.8 };
M.be_piedra_ala = { rampa: ['#0b0c0b', '#151715', '#20231f', '#2c302b', '#393e38', '#474d45'], ruido: 0.4, escala: 0.55 };
M.be_lobo = { rampa: ['#08090b', '#101216', '#191c21', '#23272d', '#2e333a', '#3a4048', '#474e57', '#565e68'], ruido: 0.45, escala: 1.5, patron: (p) => (ruido(p[0] * 3, p[1] * 3, p[2] * 1.2) - 0.5) * 0.25 };
M.be_quitina_negra = { rampa: ['#050505', '#0b0a0a', '#131110', '#1c1917', '#26221f', '#312c28', '#3e3832', '#4c453e'], ruido: 0.22, escala: 0.8, brillo: 0.45 };
M.be_junta = { rampa: ['#0a0403', '#160807', '#240d0a', '#33120d', '#431810'], ruido: 0.2, escala: 0.8, brillo: 0.3 };
M.be_caparazon = { rampa: ['#0d0c0b', '#1a1815', '#29251f', '#39342b', '#4a4337', '#5c5344', '#6e6452', '#807561'], ruido: 0.3, escala: 0.7, brillo: 0.3 };
M.be_lava_fria = { rampa: ['#100403', '#200806', '#360d08', '#4e140b', '#661c0e'], ruido: 0.3, escala: 0.5 };
M.be_hueso_viejo = { rampa: ['#141210', '#24201b', '#38322a', '#4e463a', '#665c4c', '#7f735f', '#978a73', '#ada087', '#c2b69c'], ruido: 0.28, escala: 0.8 };

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
/** Marco rígido: origen y matriz (columnas: adónde van x adelante, y derecha, z arriba). */
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
/** El marco del mundo para una dirección del juego (se = 0°, s = 45°, ... e = 315°). */
const RUMBO: Record<Dir, number> = { se: 0, s: 45, so: 90, o: 135, no: 180, n: 225, ne: 270, e: 315 };
const mundo = (d: Dir): Tr => { const th = rad(RUMBO[d]); return { o: [0, 0, 0], m: [[Math.cos(th), Math.sin(th), 0], [Math.sin(th), -Math.cos(th), 0], [0, 0, 1]] }; };
const ejesDe = (t: Tr): [V3, V3, V3] => [nor(t.m[0]), nor(t.m[1]), nor(t.m[2])];
/** Bulto en un marco: centro local y radios a lo largo de los ejes del marco. */
const bT = (t: Tr, c: V3, r: V3, o: OpcComp = {}) => bulto(ap(t, c), r, { ...o, ejes: ejesDe(t) });
/** Bulto girado dentro del marco (cabeceo, guiñada, alabeo locales). */
const bG = (t: Tr, c: V3, r: V3, giros: M3[], o: OpcComp = {}) => bulto(ap(t, c), r, { ...o, ejes: ejesDe(cmp(t, T([0, 0, 0], ...giros))) });
const hT = (t: Tr, a: V3, b: V3, r0: number, r1: number, o: OpcComp = {}) => hueso(ap(t, a), ap(t, b), r0, r1, o);

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
/** Grietas que brillan sobre la superficie de un elipsoide (en el marco `t`): polilíneas quebradas. */
function grietas(t: Tr, c: V3, r: V3, n: number, semilla: number, mat: string, o: { lado?: number; arriba?: number; grueso?: number; largo?: number } = {}): Pieza[] {
  const ps: Pieza[] = [];
  for (let k = 0; k < n; k++) {
    const q = semilla * 31 + k * 7;
    let u = (o.lado ?? (hr(q) < 0.5 ? 1 : -1)) * (Math.PI / 2) + (hr(q + 1) - 0.5) * 2.2, v = (hr(q + 2) - 0.5) * 1.6 + (o.arriba ?? 0);
    const du = (hr(q + 3) - 0.5) * 0.7, dv = (hr(q + 4) < 0.5 ? 1 : -1) * 0.35;
    let prev: V3 | null = null;
    const pasos = o.largo ?? 4;
    for (let i = 0; i <= pasos; i++) {
      const cv = Math.cos(v), p: V3 = [c[0] + r[0] * cv * Math.cos(u) * 1.01, c[1] + r[1] * cv * Math.sin(u) * 1.01, c[2] + r[2] * Math.sin(v) * 1.01];
      const w = ap(t, p);
      if (prev) ps.push(palo(prev, w, (o.grueso ?? 0.55) * (1 - i / (pasos + 2)), { mat }));
      prev = w;
      u += du + (hr(q + 10 + i) - 0.5) * 0.5; v += dv + (hr(q + 20 + i) - 0.5) * 0.4;
    }
  }
  return ps;
}
/** Diente o garra: cono de `a` hacia `b`. */
const pua = (a: V3, b: V3, r: number, mat = 'cu_hueso', tono = 0) => palo(a, b, r, { mat, r1: r * 0.12, tono });

// ------------------------------------------------------------------ registro
type Acc = 'quieto' | 'caminar' | 'atacar' | 'morir' | 'especial';
const CUADROS: Record<Acc, number> = { quieto: 4, caminar: 8, atacar: 8, morir: 8, especial: 8 };
const NOMBRES: Record<Acc, [string, string]> = { quieto: ['quieto', 'idle'], caminar: ['camina', 'walk'], atacar: ['ataca', 'attack'], morir: ['muere', 'death'], especial: ['especial', 'special'] };
type Armado = (d: Dir, acc: Acc, f: number) => Pieza[] | Escena;
export const BESTIAS: { id: string; nombre: [string, string]; huella: [number, number]; jefe: boolean }[] = [];
function bestia(id: string, nombre: [string, string], huella: [number, number], armar: Armado, especial?: [string, string]) {
  BESTIAS.push({ id, nombre, huella, jefe: !!especial });
  const acciones: Acc[] = ['quieto', 'caminar', 'atacar', 'morir', ...(especial ? ['especial' as Acc] : [])];
  for (const acc of acciones) {
    const [es, en] = acc === 'especial' && especial ? especial : NOMBRES[acc];
    registrar({
      id: `mon_${id}_${acc}`, nombre: [`${nombre[0]} · ${es}`, `${nombre[1]} · ${en}`], tema: 'monstruos',
      variantes: [...DIRS], cuadros: CUADROS[acc], t: acc === 'quieto' ? 6 : 3, huella, bloquea: true,
      armar: (v, f) => armar(v as Dir, acc, f),
    });
  }
}

// ------------------------------------------------------------------ cuadrúpedos (perro del infierno, lobo, jabalí)
interface Cuad {
  /** Escala general (1 = 30 a la cruz), largo de patas, corpulencia del tronco. */
  S: number; pata: number; gordo: number;
  piel: string; vientre?: string; hocico: string; ojos: string;
  cabeza: 'perro' | 'lobo' | 'jabali';
  cola: number; colaGruesa?: number;
  ataque: 'mordida' | 'embestida';
  /** Lo propio de cada especie (cuernos, púas, grietas, colmillos, melena). */
  deco: (c: CtxCuad) => Pieza[];
}
interface CtxCuad { q: Cuad; W: Tr; cuerpo: Tr; cab: Tr; mand: Tr; S: number; g: number; acc: Acc; f: number; muerte: number; abre: number; comps: Comp[]; resplandor?: Escena['resplandor'] }

/** Pose del tronco y de la cabeza de un cuadrúpedo para una acción y un cuadro. */
function poseCuad(q: Cuad, acc: Acc, f: number) {
  const S = q.S, ph = f / CUADROS[acc];
  const p = { av: 0, z: 0, lado: 0, pitch: 0, roll: 0, yaw: 0, cab: 6, cabYaw: 0, mand: 4, cola: 0, colaAlza: 0, flojo: 0, adel: [0, 0], alza: [0, 0], atrasX: 0, muerte: 0 };
  if (acc === 'quieto') {
    const b = Math.sin(ph * TAU);
    p.z = b * 0.35 * S; p.pitch = -b * 0.6; p.cab = 6 + b * 2.5; p.cabYaw = Math.sin(ph * TAU + 1) * 3; p.mand = 7 + b * 4; p.cola = Math.sin(ph * TAU) * 0.6;
  } else if (acc === 'caminar') {
    p.z = -Math.cos(ph * TAU * 2) * 0.55 * S - 0.3 * S; p.pitch = Math.sin(ph * TAU * 2) * 1.6; p.roll = Math.sin(ph * TAU) * 2; p.yaw = Math.sin(ph * TAU) * 2.5;
    p.cab = 8 - Math.sin(ph * TAU * 2) * 3; p.cabYaw = -Math.sin(ph * TAU) * 4; p.mand = 8; p.cola = Math.sin(ph * TAU) * 1.2;
  } else if (acc === 'atacar') {
    if (q.ataque === 'mordida') {
      // se agacha, salta, muerde en lo alto del salto, cae y vuelve
      p.av = K([0, -3, -4, 5, 13, 11, 5, 1.5], f) * S; p.z = K([0, -3, -4.5, 2.5, 1.5, -2.5, -1.2, 0], f) * S;
      p.pitch = K([0, 7, 9, -14, 2, 9, 4, 1], f); p.cab = K([6, 18, 22, -4, 14, 20, 10, 6], f); p.mand = K([5, 2, 2, 42, 48, 4, 10, 6], f);
      p.adel = [K([0, 0, 0, 7, 4, -1, 0, 0], f) * S, 0]; p.alza = [K([0, 0, 0, 9, 7, 0, 0, 0], f) * S, 0]; p.cola = K([0, 0.3, 0.5, 1, 0.8, 0.2, 0, 0], f);
      p.colaAlza = K([0, 0.3, 0.4, 0.8, 0.7, 0.3, 0.1, 0], f);
    } else {
      // embiste: baja la cabeza, carga, cornea hacia arriba con los colmillos
      p.av = K([0, -2.5, -3.5, 4, 10, 9, 4, 1], f) * S; p.z = K([0, -1.5, -2.5, -1, 1.2, 0.8, 0, 0], f) * S;
      p.pitch = K([0, 4, 7, 6, -10, -8, -2, 0], f); p.cab = K([8, 20, 28, 30, -22, -18, 0, 6], f); p.mand = K([4, 6, 8, 10, 22, 14, 6, 4], f);
      p.adel = [K([0, 0, 0, 3, 5, 2, 0, 0], f) * S, 0]; p.alza = [K([0, 0, 0, 5, 3, 0, 0, 0], f) * S, 0]; p.yaw = K([0, 0, 0, 0, 8, 6, 2, 0], f); p.cola = K([0, 0.4, 0.6, 0.5, 0.8, 0.4, 0, 0], f);
    }
  } else if (acc === 'morir') {
    // un respingo, se le doblan las patas, cae de costado y queda tendido
    p.av = K([0, -1, -1.5, -1.5, -1.5, -1.5, -1.5, -1.5], f) * S; p.z = K([0, 0.5, -3, -6.5, -9.5, -11.5, -12.3, -12], f) * S;
    p.roll = K([0, -3, -5, -14, -42, -72, -88, -86], f); p.pitch = K([0, -9, -3, 4, 5, 3, 2, 2], f); p.lado = K([0, 0, 0, 1, 3, 5, 6, 6], f) * S;
    p.cab = K([6, -32, -14, 8, 18, 22, 24, 24], f); p.mand = K([5, 38, 26, 14, 18, 22, 22, 22], f); p.flojo = K([0, 0, 0.12, 0.38, 0.72, 0.95, 1, 1], f);
    p.cola = K([0, 1, 0.5, 0.2, 0, 0, 0, 0], f); p.muerte = K([0, 0, 0.1, 0.3, 0.55, 0.8, 1, 1], f);
  }
  return p;
}

/** Trote al caminar: cada pata retrocede PASO_CUAD × S × pata apoyada durante APOYO_CUAD del ciclo (pares en diagonal). */
const PASO_CUAD = 14, APOYO_CUAD = 0.56;
function cuadrupedo(q: Cuad, d: Dir, acc: Acc, f: number): Pieza[] | Escena {
  const S = q.S, g = q.gordo, pt = q.pata;
  const W = mundo(d);
  const P = poseCuad(q, acc, f);
  const zc = (8 + 13 * pt) * S;
  const cuerpo = cmp(W, T([P.av, P.lado, zc + P.z], Rz(P.yaw), Ry(P.pitch), Rx(P.roll)));
  const B = (x: number, y: number, z: number): V3 => [x * S, y * S, z * S];
  const comps: Comp[] = [];
  const piel = { mat: q.piel }, vientre = { mat: q.vientre ?? q.piel };
  // ---- tronco: pecho hondo, costillar, cintura recogida, grupa, escápulas, cruz y muslos
  const jab = q.cabeza === 'jabali';
  comps.push(bT(cuerpo, B(9, 0, jab ? 0 : -1), B(10.5, 7.6 * g, (jab ? 10.5 : 9.6) * g), vientre));
  comps.push(bT(cuerpo, B(0, 0, 0.6), B(12.5, 8 * g, 8.2 * g), piel));
  comps.push(bT(cuerpo, B(-8, 0, 1.6), B(7.5, 5.8 * g, (jab ? 7.5 : 6) * g), piel));
  comps.push(bT(cuerpo, B(-14, 0, 1.4), B(7.6, 7 * g, 7 * g), piel));
  comps.push(bT(cuerpo, B(10, 0, 6.5), B(8, 4.2 * g, jab ? 6 : 3.4), piel));
  for (const s of [1, -1]) {
    comps.push(bG(cuerpo, B(12, s * 4.8 * g, 3.2), B(6.6, 2.7 * g, 4.6), [Ry(-28)], piel));
    comps.push(bG(cuerpo, B(11.6, s * 5.6 * g, -5), B(4.6, 3 * g, 6.6), [Ry(10)], piel));
    comps.push(bG(cuerpo, B(-14.5, s * 5.2 * g, -3.2), B(7.6, 3.6 * g, 9), [Ry(18)], piel));
  }
  // ---- cuello y cabeza
  const nuca = B(jab ? 18 : 20.5, 0, jab ? 5 : 10);
  comps.push(hT(cuerpo, B(12, 0, 2.5), nuca, (jab ? 8 : 6.4) * g * S, (jab ? 6.5 : 4.4) * S, piel));
  comps.push(hT(cuerpo, B(9, 0, 7), add(nuca, B(-1, 0, 2.5)), 4 * S * g, 3 * S, piel));
  const cab = cmp(cuerpo, T(nuca, Rz(P.cabYaw), Ry(P.cab)));
  const H = (x: number, y: number, z: number) => B(x, y, z);
  if (q.cabeza === 'jabali') {
    comps.push(bT(cab, H(1, 0, 1.5), H(6.5, 5.2, 5.6), piel));
    comps.push(hT(cab, H(4, 0, 0), H(14.5, 0, -3), 4.4 * S, 2.6 * S, piel));
    comps.push(bT(cab, H(5.5, 0, 3.5), H(3, 4.4, 2), piel));
    for (const s of [1, -1]) comps.push(bT(cab, H(2.5, s * 3.8, -1.8), H(4, 2, 3.4), piel));
    comps.push(bG(cab, H(15, 0, -3.1), H(0.9, 2.7, 2.2), [Ry(15)], { mat: q.hocico }));
  } else {
    const lobo = q.cabeza === 'lobo';
    comps.push(bT(cab, H(1.5, 0, 1.5), H(5.5, lobo ? 4 : 4.4, 4.4), piel));
    comps.push(hT(cab, H(4, 0, -0.4), H(lobo ? 13.5 : 12.5, 0, -1.4), 3.2 * S, (lobo ? 1.9 : 2.3) * S, piel));
    comps.push(bT(cab, H(5, 0, 2.6), H(2.2, 4, 1.6), piel));
    for (const s of [1, -1]) comps.push(bT(cab, H(2.6, s * 3.1, -1), H(3.4, 1.6, 2.6), piel));
    comps.push(bT(cab, H(lobo ? 13.7 : 12.8, 0, -0.7), H(1.3, 1.5, 1.2), { mat: q.hocico }));
  }
  const mand = cmp(cab, T(H(1, 0, jab ? -3.5 : -2.6), Ry(P.mand)));
  // ---- patas: dos huesos con IK al tobillo y la mano o pezuña en el piso (o colgando al morir)
  const piezas: Pieza[] = [];
  const pasoL = PASO_CUAD * S * pt, alzaL = 6 * S;
  for (const del of [true, false]) for (const s of [1, -1]) {
    const raiz = ap(cuerpo, del ? B(12.5, s * 5.6 * g, -3) : B(-13.6, s * 5 * g, -1.5));
    const l1 = (del ? 10 : 10.8) * S * pt, l2 = (del ? 10.5 : 11.6) * S * pt, l3 = (del ? 3.6 : 7) * S * pt;
    const fase = acc === 'caminar' ? f / 8 + (del ? 0 : 0.5) + (s > 0 ? 0.5 : 0) : 0;
    const st = acc === 'caminar' ? paso(fase, pasoL, alzaL, APOYO_CUAD) : { x: 0, z: 0, vuelo: 0 };
    let pie: V3 = [(del ? 14.5 : -14.5) * S * (0.6 + 0.4 * pt) + st.x + (del ? P.adel[0] : P.atrasX), s * 5.8 * g * S, st.z + (del ? P.alza[0] : 0)];
    let vuelo = st.vuelo + (del && P.alza[0] > 0 ? 0.8 : 0);
    if (P.flojo > 0) {
      const colg = ap(cuerpo, del ? B(16, s * 6.5 * g, -zc / S + 2) : B(-11, s * 6 * g, -zc / S + 3));
      pie = mez(ap(W, pie), colg, P.flojo); pie = mv(transp(W.m), sub(pie, W.o));
      vuelo = P.flojo * 0.7;
    }
    const pieW = ap(W, pie);
    pieW[2] = Math.max(pieW[2], 1.2 * S);
    const fw = ap(W, [1, 0, 0]), atrasW = mv(cuerpo.m, [-1, 0, 0]), adelW = mv(cuerpo.m, [1, 0, 0]);
    void fw;
    const tob = add(pieW, mv(cuerpo.m, del ? [(-0.6 + 2.6 * vuelo) * S, 0, (3.4 - 0.6 * vuelo) * S * pt] : [(-3 - 1.5 * vuelo) * S * pt, 0, (6.6 - 1.2 * vuelo) * S * pt]));
    tob[2] = Math.max(tob[2], 1.5 * S);
    const [rod, tob2] = ik(raiz, tob, l1, l2, del ? atrasW : adelW);
    const pz = add(tob2, sub(pieW, tob), Math.min(1.2, l3 / Math.max(0.1, len(sub(pieW, tob)))));
    const rM = q.cabeza === 'jabali' ? 1.15 : 1;
    comps.push(hueso(raiz, rod, (del ? 3.5 : 4) * S * rM * g, (del ? 2.5 : 2.7) * S * rM, piel));
    const baja: Comp[] = [
      hueso(rod, tob2, (del ? 2.3 : 2.4) * S * rM, 1.5 * S * rM, piel),
      hueso(tob2, pz, 1.45 * S * rM, 1.25 * S * rM, piel),
      bulto(add(pz, adelW, 0.9 * S), [2.3 * S * rM, 1.6 * S * rM, 1.25 * S], { eje: adelW, mat: jab ? 'be_cuerno' : q.piel }),
    ];
    if (!del) baja.push(bulto(mez(rod, tob2, 0.3), [3.6 * S, 1.9 * S * rM, 1.9 * S * rM], { eje: sub(tob2, rod), mat: q.piel }));
    piezas.push(masa(baja, { mat: q.piel, suave: 1.3 * S }));
    if (!jab && q.cabeza !== 'lobo') for (const k of [-1, 0, 1]) piezas.push(pua(add(add(pz, adelW, 2.4 * S), cruz(adelW, [0, 0, 1]), k * 0.8 * S), add(add(add(pz, adelW, 3.6 * S), cruz(adelW, [0, 0, 1]), k * 0.9 * S), [0, 0, -1 * S]), 0.45 * S, 'be_cuerno'));
  }
  // ---- cola
  const cb = ap(cuerpo, B(-20, 0, 3));
  const cq: Comp[] = [];
  let prev = cb;
  const nC = 4;
  for (let i = 1; i <= nC; i++) {
    const t = i / nC, onda = Math.sin(f / CUADROS[acc] * TAU - t * 2.2) * q.cola * 3 * t;
    const pp = ap(cuerpo, B(-20 - t * 13 * q.cola, onda * (acc === 'morir' ? 0.3 : 1), 3 + (P.colaAlza * 9 - 6) * t - (acc === 'morir' ? 3 * t : 0) + (q.cabeza === 'lobo' ? -3 * t : 0)));
    cq.push(hueso(prev, pp, (q.colaGruesa ?? 1.6) * S * (1.1 - t * 0.6), (q.colaGruesa ?? 1.6) * S * (1.1 - t * 0.75), piel));
    prev = pp;
  }
  piezas.push(masa(cq, { mat: q.piel, suave: 1.2 * S }));
  const ctx: CtxCuad = { q, W, cuerpo, cab, mand, S, g, acc, f, muerte: P.muerte, abre: P.mand, comps };
  const extra = q.deco(ctx);
  piezas.unshift(masa(comps, { mat: q.piel, suave: 2.2 * S }));
  return { piezas: [...piezas, ...extra], resplandor: ctx.resplandor };
}
const transp = (m: M3): M3 => [[m[0][0], m[1][0], m[2][0]], [m[0][1], m[1][1], m[2][1]], [m[0][2], m[1][2], m[2][2]]];

/** Mandíbula con lengua, dientes de arriba y de abajo y los ojos (lo común de las cabezas de cuadrúpedo). */
function bocaYOjos(c: CtxCuad, o: { largo: number; lengua: string; ojoX: number; ojoY: number; ojoZ: number; ojoR: number; colmillo?: number }): Pieza[] {
  const { cab, mand, S } = c;
  const ps: Pieza[] = [];
  const L = o.largo;
  ps.push(masa([hT(mand, [0, 0, 0], [L * S, 0, -0.6 * S], 2.4 * S, 1.6 * S, { mat: c.q.piel }), bT(mand, [2.5 * S, 0, -0.6 * S], [3.6 * S, 2.6 * S, 1.9 * S], { mat: c.q.piel })], { mat: c.q.piel, suave: 1.2 * S }));
  ps.push(masa([bT(mand, [L * 0.5 * S, 0, 1.0 * S], [L * 0.42 * S, 1.5 * S, 0.7 * S], { mat: o.lengua })], { mat: o.lengua }));
  for (const s of [1, -1]) {
    for (let i = 0; i < 3; i++) {
      const x = (L - 0.6 - i * 2.2) * S;
      ps.push(pua(ap(mand, [x, s * 1.35 * S, 0.6 * S]), ap(mand, [x + 0.2 * S, s * 1.3 * S, (i === 0 ? 2.4 : 1.6) * S]), (i === 0 ? 0.6 : 0.42) * S));
      ps.push(pua(ap(cab, [x + 1.6 * S, s * 1.6 * S, -2.4 * S]), ap(cab, [x + 1.8 * S, s * 1.55 * S, (i === 0 ? -4.4 - (o.colmillo ?? 0) : -3.7) * S]), (i === 0 ? 0.65 : 0.42) * S));
    }
    ps.push(elipsoide(...ap(cab, [o.ojoX * S, s * o.ojoY * S, o.ojoZ * S]), o.ojoR * S, o.ojoR * 1.2 * S, o.ojoR * 0.75 * S, { mat: c.muerte > 0.7 ? 'cu_ojo' : c.q.ojos }));
  }
  return ps;
}

const PERRO: Cuad = {
  S: 0.95, pata: 1.28, gordo: 0.92, piel: 'be_carbon', hocico: 'be_cuerno', ojos: 'cu_ojo_brasa', cabeza: 'perro', cola: 1, ataque: 'mordida',
  deco: (c) => {
    const { cuerpo, cab, S } = c;
    const lava = c.muerte > 0.85 ? 'be_lava_fria' : 'cu_lava';
    const ps = bocaYOjos(c, { largo: 10.5, lengua: lava, ojoX: 5.1, ojoY: 2.5, ojoZ: 1.6, ojoR: 0.95, colmillo: 0.6 });
    // cuernos hacia atrás en lugar de orejas
    for (const s of [1, -1]) {
      const a = ap(cab, [0, s * 2.6 * S, 4 * S]), b = ap(cab, [-4 * S, s * 4.4 * S, 7.2 * S]), e = ap(cab, [-8.5 * S, s * 4.4 * S, 6.4 * S]);
      ps.push(masa([hueso(a, b, 1.5 * S, 1.05 * S, { mat: 'be_cuerno' }), hueso(b, e, 1.05 * S, 0.2 * S, { mat: 'be_cuerno' })], { mat: 'be_cuerno', suave: 0.6 }));
    }
    // cresta de púas por el lomo
    const lomo: [number, number, number][] = [[17, 9.5, 2.6], [12.5, 10.4, 3.4], [7, 9.5, 3.8], [1.5, 9.4, 3.4], [-4, 8.8, 3], [-9.5, 8.6, 2.8], [-15, 9.3, 2.6], [-20, 8, 2]];
    for (const [x, z, h] of lomo) ps.push(pua(ap(cuerpo, [x * S, 0, (z - 1.5) * S]), ap(cuerpo, [(x - 2.6) * S, 0, (z + h) * S]), 1.25 * S, 'be_cuerno'));
    // grietas de lava en el costillar, la grupa, las escápulas y el cuello
    ps.push(...grietas(cuerpo, [0, 0, 0.6 * S], [12.5 * S, 8 * S, 8.2 * S], 6, 3, lava, { largo: 5 }));
    ps.push(...grietas(cuerpo, [-14 * S, 0, 1.4 * S], [7.6 * S, 7 * S, 7 * S], 4, 5, lava));
    ps.push(...grietas(cuerpo, [9 * S, 0, -1 * S], [10.5 * S, 7.6 * S, 9.6 * S], 4, 9, lava, { arriba: -0.4 }));
    if (c.muerte < 0.85 && c.abre > 15) c.resplandor = { c: ap(c.mand, [7 * S, 0, 1.5 * S]), r: 9 * S, color: '#ff6a20' };
    return ps;
  },
};

const LOBO: Cuad = {
  S: 0.86, pata: 1.34, gordo: 0.8, piel: 'be_lobo', vientre: 'be_lobo', hocico: 'cu_tela_negra', ojos: 'cu_ojo_hielo', cabeza: 'lobo', cola: 1.1, colaGruesa: 2.6, ataque: 'mordida',
  deco: (c) => {
    const { cuerpo, cab, S } = c;
    const ps = bocaYOjos(c, { largo: 11.5, lengua: 'be_garganta', ojoX: 5.2, ojoY: 2.3, ojoZ: 1.8, ojoR: 0.75 });
    // orejas paradas
    for (const s of [1, -1]) ps.push(masa([hT(cab, [0, s * 2.4 * S, 3.6 * S], [-1.6 * S, s * 3.4 * S, 9 * S], 2 * S, 0.3 * S, { mat: 'be_lobo' })], { mat: 'be_lobo' }));
    // gorguera de pelo en el cuello y la cruz, y mechones de punta por el lomo
    const pel: Comp[] = [];
    pel.push(hT(cuerpo, [12 * S, 0, 3 * S], [19 * S, 0, 9 * S], 7.2 * S, 5.6 * S, { mat: 'be_lobo' }));
    for (let i = 0; i < 9; i++) {
      const a = (i / 8) * Math.PI - Math.PI / 2, x = (11 + hr(i) * 6) * S;
      const base: V3 = [x, Math.sin(a) * 6.5 * S, (4 + Math.cos(a) * 5.5) * S], punta = add(base, [-4.5 * S, Math.sin(a) * 2.6 * S, (Math.cos(a) * 2.4 - 0.6) * S]);
      pel.push(hT(cuerpo, base, punta, 2.2 * S, 0.35 * S, { mat: 'be_lobo', k: 1 }));
    }
    for (let i = 0; i < 6; i++) { const x = (6 - i * 4.5) * S; pel.push(hT(cuerpo, [x, 0, 7.4 * S], [x - 4 * S, 0, 9.4 * S], 1.8 * S, 0.3 * S, { mat: 'be_lobo', k: 0.8 })); }
    ps.push(masa(pel, { mat: 'be_lobo', suave: 1.4 * S }));
    return ps;
  },
};
const JABALI: Cuad = {
  S: 1.08, pata: 0.92, gordo: 1.18, piel: 'be_jabali', hocico: 'be_hocico', ojos: 'cu_ojo_brasa', cabeza: 'jabali', cola: 0.45, colaGruesa: 1.1, ataque: 'embestida',
  deco: (c) => {
    const { cuerpo, cab, mand, S } = c;
    const ps: Pieza[] = [];
    ps.push(masa([hT(mand, [0, 0, 0], [11 * S, 0, -0.4 * S], 3 * S, 2 * S, { mat: 'be_jabali' })], { mat: 'be_jabali', suave: 1 }));
    // colmillos que salen de la mandíbula y se curvan hacia arriba y atrás
    for (const s of [1, -1]) {
      const a = ap(mand, [9 * S, s * 2.2 * S, 0.6 * S]), b = ap(mand, [11.5 * S, s * 3.8 * S, 4.5 * S]), e = ap(mand, [10 * S, s * 4.6 * S, 8 * S]);
      ps.push(masa([hueso(a, b, 1.1 * S, 0.8 * S, { mat: 'cu_hueso' }), hueso(b, e, 0.8 * S, 0.12 * S, { mat: 'cu_hueso' })], { mat: 'cu_hueso', suave: 0.5 }));
      ps.push(elipsoide(...ap(cab, [6.4 * S, s * 3.4 * S, 2.4 * S]), 0.7 * S, 0.8 * S, 0.55 * S, { mat: c.muerte > 0.7 ? 'cu_ojo' : 'cu_ojo_brasa' }));
      ps.push(masa([hT(cab, [-1 * S, s * 4 * S, 4 * S], [-3 * S, s * 6.8 * S, 7 * S], 1.8 * S, 0.4 * S, { mat: 'be_jabali' })], { mat: 'be_jabali' }));
    }
    // púas de hueso por el lomo (las más altas en la joroba) y la crin de cerdas
    const lomo: [number, number, number][] = [[14, 12, 6], [9, 13.2, 9], [3.5, 12.4, 8], [-2, 10.6, 6.5], [-7.5, 9.6, 5], [-13, 9.6, 4], [-18, 8.6, 3]];
    lomo.forEach(([x, z, h], i) => {
      const inc = (hr(i + 40) - 0.5) * 2.4;
      ps.push(pua(ap(cuerpo, [x * S, 0, (z - 2.5) * S]), ap(cuerpo, [(x - h * 0.45) * S, inc * S, (z + h) * S]), 1.6 * S, 'be_hueso_viejo'));
      for (const s of [1, -1]) if (i < 5) ps.push(pua(ap(cuerpo, [(x - 1) * S, s * 3.2 * S, (z - 3) * S]), ap(cuerpo, [(x - 1 - h * 0.3) * S, s * 5.8 * S, (z + h * 0.45) * S]), 1 * S, 'be_hueso_viejo', -0.05));
    });
    const crin: Comp[] = [];
    for (let i = 0; i < 7; i++) { const x = (16 - i * 4) * S; crin.push(hT(cuerpo, [x, 0, (10.5 - i * 0.4) * S], [x - 3.5 * S, 0, (13 - i * 0.6) * S], 1.6 * S, 0.3 * S, { mat: 'be_jabali', tono: -0.06, k: 0.8 })); }
    crin.push(hT(cab, [-1 * S, 0, 5 * S], [-5 * S, 0, 8 * S], 1.6 * S, 0.4 * S, { mat: 'be_jabali', tono: -0.06 }));
    ps.push(masa(crin, { mat: 'be_jabali', suave: 1.2 }));
    return ps;
  },
};

bestia('lobo_sombrio', ['Lobo sombrío', 'Shadow wolf'], [3, 2], (d, acc, f) => cuadrupedo(LOBO, d, acc, f));
bestia('jabali_demonio', ['Jabalí demonio', 'Demon boar'], [3, 2], (d, acc, f) => cuadrupedo(JABALI, d, acc, f));
bestia('perro_infernal', ['Perro del infierno', 'Hellhound'], [3, 2], (d, acc, f) => cuadrupedo(PERRO, d, acc, f));

// ------------------------------------------------------------------ arácnidos (araña reina, araña de cueva, escorpión)
interface Pata { cadera: V3; reposo: V3; l1: number; l2: number; fase: number; r: number; alzaExtra?: V3 }
/**
 * Patas articuladas de arácnido: la cadera sigue al cuerpo, la punta se apoya en el piso (marcha de tetrápodo: dos
 * grupos de cuatro que alternan), la rodilla sube por encima del cuerpo y el último tramo baja curvado a la punta.
 * `rizo` (0..1) las encoge hacia el vientre como una araña muerta.
 */
/** Marcha de los arácnidos: cada grupo de patas apoya la mitad del ciclo; el paso de la araña es PASO_ARANA × S. */
const APOYO_ARAC = 0.5, PASO_ARANA = 15, PASO_CANGREJO = 10;
function patasArac(W: Tr, cuerpo: Tr, patas: Pata[], o: { paso: number; alza: number; mat: string; junta: string; caminar: boolean; ph: number; rizo: number; espinas?: boolean; deLado?: boolean }): Pieza[] {
  const ps: Pieza[] = [];
  for (const pa of patas) {
    const cad = ap(cuerpo, pa.cadera);
    const st = o.caminar ? paso(o.ph + pa.fase, o.paso, o.alza, APOYO_ARAC) : { x: 0, z: 0, vuelo: 0 };
    let tip = ap(W, o.deLado ? [pa.reposo[0], pa.reposo[1] + st.x, pa.reposo[2] + st.z] : [pa.reposo[0] + st.x, pa.reposo[1], pa.reposo[2] + st.z]);
    if (pa.alzaExtra) tip = add(tip, mv(W.m, pa.alzaExtra));
    const afuera = nor([tip[0] - cad[0], tip[1] - cad[1], 0]);
    if (o.rizo > 0) {
      // encogida: la punta va bajo el vientre, la rodilla queda arriba
      const enc = ap(cuerpo, [pa.cadera[0] * 0.55 + (pa.cadera[0] > 0 ? (pa.l1 + pa.l2) * 0.12 : 0), pa.cadera[1] * 2.6, pa.cadera[2] + (pa.l1 + pa.l2) * 0.2]);
      tip = mez(tip, enc, o.rizo);
    }
    tip[2] = Math.max(tip[2], pa.r * 0.5);
    const arriba = nor(add(mv(cuerpo.m, [0, 0, 1]), afuera, 0.35));
    const [rod, fin] = ik(cad, tip, pa.l1, pa.l2, arriba);
    const medio = add(mez(rod, fin, 0.5), add(esc(afuera, 0.4), [0, 0, 0.9]), pa.l2 * 0.07);
    const r = pa.r;
    ps.push(masa([
      bulto(cad, [r * 1.5, r * 1.3, r * 1.3], { eje: sub(rod, cad), mat: o.mat }),
      hueso(cad, rod, r * 1.15, r * 0.95, { mat: o.mat }),
      bulto(rod, [r * 1.1, r * 1.1, r * 1.1], { mat: o.junta }),
      hueso(rod, medio, r * 0.92, r * 0.72, { mat: o.mat }),
      bulto(medio, [r * 0.8, r * 0.8, r * 0.8], { mat: o.junta }),
      hueso(medio, fin, r * 0.66, r * 0.22, { mat: o.mat }),
    ], { mat: o.mat, suave: r * 0.45 }));
    if (o.espinas) for (const t of [0.3, 0.65]) { const b = mez(cad, rod, t); ps.push(pua(b, add(add(b, [0, 0, r * 2.2]), afuera, r * 0.8), r * 0.35, o.mat)); }
  }
  return ps;
}

interface Arana { S: number; quitina: string; marca: string; junta: string; ojos: string; saco: boolean }
function arana(q: Arana, d: Dir, acc: Acc, f: number, crias = true): Pieza[] | Escena {
  const S = q.S, W = mundo(d), n = CUADROS[acc], ph = f / n;
  let av = 0, z = 0, pitch = 0, roll = 0, quel = 0, abd = 0, rizo = 0, alzaDel = 0, adelDel = 0, muerte = 0;
  if (acc === 'quieto') { const b = Math.sin(ph * TAU); z = b * 0.5; abd = b * 3; quel = 4 + b * 4; }
  else if (acc === 'caminar') {
    // el cuerpo baja una vez por cada grupo de patas que apoya (dos por ciclo), no en cuadros alternos
    z = -Math.abs(Math.cos(ph * TAU)) * 0.8 + 0.4; roll = Math.sin(ph * TAU * 2) * 1.5; pitch = Math.sin(ph * TAU * 2) * 1.2; abd = Math.sin(ph * TAU * 2) * 3; quel = 6; }
  else if (acc === 'atacar') {
    // se alza con las patas delanteras arriba, cae hacia adelante y clava los quelíceros
    av = K([0, -2, -4, -4, 7, 9, 4, 1], f); z = K([0, 2, 5, 6, 0, -2, -1, 0], f); pitch = K([0, -10, -22, -26, 10, 15, 6, 1], f);
    alzaDel = K([0, 10, 22, 26, 5, 0, 0, 0], f); adelDel = K([0, 2, 4, 6, 12, 10, 4, 0], f); quel = K([4, 14, 30, 34, 26, -6, 0, 4], f); abd = K([0, -4, -8, -8, 6, 8, 3, 0], f);
  } else if (acc === 'morir') {
    z = K([0, 3, 1, -4, -9, -12, -13, -13], f); pitch = K([0, -12, -6, 2, 5, 4, 3, 3], f); roll = K([0, 4, -2, -6, -9, -10, -10, -10], f);
    rizo = K([0, 0.15, 0.35, 0.6, 0.82, 0.95, 1, 1], f); quel = K([4, 30, 20, 10, 6, 4, 4, 4], f); abd = K([0, -6, -4, 2, 5, 6, 6, 6], f); muerte = K([0, 0, 0.1, 0.3, 0.6, 0.85, 1, 1], f);
  } else {
    // escupe veneno: se echa atrás, bombea el abdomen y lanza un chorro; las crías salen del saco
    av = K([0, -3, -5, -2, 2, 1, 0, 0], f); pitch = K([0, -8, -14, -6, 4, 2, 0, 0], f); z = K([0, 2, 4, 2, 0, 0, 0, 0], f); quel = K([4, 12, 26, 36, 34, 22, 10, 4], f); abd = K([0, -10, -14, 8, 6, 2, 0, 0], f);
    alzaDel = K([0, 4, 8, 4, 0, 0, 0, 0], f);
  }
  const zb = 20 * S;
  const cuerpo = cmp(W, T([av * S, 0, zb + z * S], Ry(pitch), Rx(roll)));
  const ps: Pieza[] = [];
  const Q = { mat: q.quitina };
  // ---- cefalotórax, pedicelo y abdomen
  const cef: Comp[] = [bT(cuerpo, [14 * S, 0, 0], [13 * S, 11 * S, 7 * S], Q), bT(cuerpo, [21 * S, 0, 3.5 * S], [7 * S, 7.5 * S, 5 * S], Q), bT(cuerpo, [8 * S, 0, 3 * S], [6 * S, 6 * S, 4 * S], Q)];
  for (const s of [1, -1]) {
    cef.push(bT(cuerpo, [14 * S, s * 4 * S, 5.6 * S], [8 * S, 2.6 * S, 1.6 * S], { mat: q.marca, k: 0.6 * S }));
    // quelíceros gruesos que se abren a los lados
    const qq = cmp(cuerpo, T([24 * S, s * 3.2 * S, 1 * S], Rz(s * quel * 0.5), Ry(20 + quel * 0.6)));
    cef.push(hT(qq, [0, 0, 0], [6 * S, 0, -3 * S], 3.4 * S, 2.4 * S, Q));
    ps.push(pua(ap(qq, [6 * S, 0, -3.4 * S]), ap(qq, [5 * S, -s * 2.2 * S, -8.5 * S]), 1.5 * S, 'be_cuerno', 0.1));
    // pedipalpos
    const pp0 = ap(cuerpo, [24 * S, s * 6 * S, -1 * S]), pp1 = ap(cuerpo, [(31 + Math.sin(ph * TAU + s) * 1.5) * S, s * 9 * S, 2 * S]), pp2 = add(ap(W, [(av + 35) * S, s * 9 * S, 0]), [0, 0, (3 + alzaDel * 0.4) * S]);
    ps.push(masa([hueso(pp0, pp1, 1.6 * S, 1.3 * S, Q), hueso(pp1, pp2, 1.3 * S, 1.1 * S, Q), bulto(pp2, [1.8 * S, 1.4 * S, 1.4 * S], { mat: q.junta })], { mat: q.quitina, suave: 0.8 * S }));
  }
  ps.push(masa(cef, { mat: q.quitina, suave: 2 * S }));
  // ojos: dos grandes adelante y seis en filas arriba
  const ojo = muerte > 0.6 ? 'cu_ojo' : q.ojos;
  for (const s of [1, -1]) {
    ps.push(esfera(...ap(cuerpo, [26.3 * S, s * 2.2 * S, 5.4 * S]), 1.5 * S, { mat: ojo }));
    ps.push(esfera(...ap(cuerpo, [25 * S, s * 5 * S, 6.2 * S]), 1.05 * S, { mat: ojo }));
    ps.push(esfera(...ap(cuerpo, [23 * S, s * 2.8 * S, 8 * S]), 1.1 * S, { mat: ojo }));
    ps.push(esfera(...ap(cuerpo, [21 * S, s * 5.6 * S, 7.6 * S]), 0.8 * S, { mat: ojo }));
  }
  const ab = cmp(cuerpo, T([-21 * S, 0, 6 * S], Ry(-12 + abd)));
  const abC: Comp[] = [hT(cuerpo, [3 * S, 0, 1 * S], [-4 * S, 0, 3 * S], 3.5 * S, 3.5 * S, Q), bT(ab, [0, 0, 0], [24 * S, 19 * S, 16.5 * S], Q), bT(ab, [-20 * S, 0, -4 * S], [6 * S, 9 * S, 8 * S], Q)];
  // marcas: una calavera de cheurones rojos sobre el lomo del abdomen
  const sup = (x: number, y: number) => 16.5 * Math.sqrt(Math.max(0, 1 - (x / 24) ** 2 - (y / 19) ** 2));
  const marcas: [number, number, number, number][] = [[12, 0, 5.5, 4], [5, 0, 2.2, 4.5], [-2, 0, 5, 3.4], [-9, 0, 2, 3.5], [-15, 0, 3.6, 2.6]];
  for (const [x, y, ry, rx] of marcas) abC.push(bT(ab, [x * S, y * S, (sup(x, y) - 1.1) * S], [rx * S, ry * S, 1.5 * S], { mat: q.marca, k: 0.3 * S }));
  for (const s of [1, -1]) for (const [x, zz] of [[8, 7], [-1, 8], [-10, 6.5]]) abC.push(bG(ab, [x * S, s * 15.2 * S, zz * S], [3 * S, 1.4 * S, 4.4 * S], [Rx(s * 45), Rz(s * 25)], { mat: q.marca, k: 0.3 * S }));
  abC.push(bT(ab, [-24 * S, 0, -3 * S], [2.6 * S, 2.6 * S, 2.6 * S], { mat: q.junta }));
  ps.push(masa(abC, { mat: q.quitina, suave: 1.8 * S }));
  // saco de huevos colgado de las hileras
  if (q.saco) {
    const c0 = ap(ab, [-29 * S, 0, -9 * S]);
    const sc: Comp[] = [bulto(c0, [11 * S, 10 * S, 9.5 * S], { mat: 'be_seda' })];
    for (let i = 0; i < 9; i++) { const a = i * 2.4, b = (hr(i + 7) - 0.3) * 1.4; sc.push(bulto(add(c0, [Math.cos(a) * Math.cos(b) * 9 * S, Math.sin(a) * Math.cos(b) * 8.5 * S, Math.sin(b) * 8 * S]), [3.2 * S, 3.2 * S, 3.2 * S], { mat: 'be_seda', tono: 0.06, k: 0.6 * S })); }
    if (acc === 'especial' && f >= 3) sc.push(bulto(add(c0, mv(W.m, [-6 * S, 4 * S, 6 * S])), [5 * S, 5 * S, 3 * S], { mat: 'be_garganta' }));
    ps.push(masa(sc, { mat: 'be_seda', suave: 1.5 * S }));
    ps.push(palo(ap(ab, [-23 * S, 0, -5 * S]), c0, 2.4 * S, { mat: 'be_seda' }));
  }
  // ---- 8 patas: grupos A (I1, D2, I3, D4) y B (D1, I2, D3, I4)
  const angs = [38, 72, 108, 146], largos = [1.12, 0.95, 0.95, 1.06];
  const patas: Pata[] = [];
  for (const s of [1, -1]) for (let i = 0; i < 4; i++) {
    const a = rad(angs[i]), R = 50 * S * largos[i];
    const grupo = (i % 2 === 0) === (s < 0) ? 0 : 0.5;
    const del = i === 0;
    patas.push({
      cadera: [(21 - i * 4.6) * S, s * (7.5 + (i === 0 || i === 3 ? 0 : 1.6)) * S, -1 * S], reposo: [14 * S + Math.cos(a) * R * 0.95 + av * S * (del ? 0 : 0.4), s * Math.sin(a) * R, 0],
      l1: 27 * S * largos[i], l2: 38 * S * largos[i], fase: grupo + i * 0.04, r: 2.3 * S,
      alzaExtra: del ? [adelDel * S, 0, alzaDel * S] : i === 1 ? [adelDel * 0.4 * S, 0, alzaDel * 0.3 * S] : undefined,
    });
  }
  ps.push(...patasArac(W, cuerpo, patas, { paso: PASO_ARANA * S, alza: 9 * S, mat: q.quitina, junta: q.junta, caminar: acc === 'caminar', ph, rizo, espinas: S > 0.6 }));
  // ---- especial: chorro de veneno en arco y crías que salen del saco
  let resplandor: Escena['resplandor'];
  if (acc === 'especial') {
    const boca = ap(cuerpo, [30 * S, 0, -2 * S]);
    if (f >= 3 && f <= 6) {
      const t0 = (f - 3) / 3;
      for (let k = 0; k < 7; k++) {
        const u = t0 * 0.6 + k * 0.09, dist = u * 120 * S;
        const p = add(boca, mv(W.m, [dist, Math.sin(k * 1.7) * 2 * S, Math.sin(u * Math.PI) * 18 * S - u * u * 20 * S]));
        if (p[2] < 1) continue;
        ps.push(esfera(...p, (3.4 - k * 0.3) * S * (1 - u * 0.3), { mat: 'be_veneno' }));
      }
      resplandor = { c: boca, r: 30 * S, color: '#80ff40' };
    } else if (f === 2) ps.push(esfera(...add(boca, mv(W.m, [3 * S, 0, 0])), 2.6 * S, { mat: 'be_veneno' }));
    if (q.saco && crias && f >= 3) for (let k = 0; k < 3; k++) {
      const u = (f - 3) / 4;
      const c0 = ap(W, [(-58 - u * 22 * (k === 1 ? 1.3 : 1)) * S, (k - 1) * (14 + u * 24) * S, 0]);
      const cria = arana(CRIA, d, 'caminar', (f + k * 3) % 8, false) as Pieza[];
      ps.push(...cria.map((p) => desplazar(p, c0)));
    }
  }
  return resplandor ? { piezas: ps, resplandor } : ps;
}
/** Corre una pieza (para poner varias criaturas chicas en una escena). */
function desplazar(p: Pieza, v: V3): Pieza {
  if (p.k === 'conv') return { ...p, pts: p.pts.map((q) => add(q, v)), planos: p.planos.map(([n, e]) => [n, e + pto(n, v)] as [V3, number]) };
  if (p.k === 'cono') return { ...p, o: add(p.o, v) };
  if (p.k === 'elip') return { ...p, c: add(p.c, v) };
  return masa(p.comps.map((c) => c.f === 'hueso' ? hueso(add(c.a, v), add(c.b, v), c.r0, c.r1, { mat: c.mat, tono: c.tono, k: c.k }) : bulto(add(c.c, v), c.r, { ejes: [c.ex, c.ey, c.ez], mat: c.mat, tono: c.tono, k: c.k })), { mat: p.mat, tono: p.tono, suave: p.suave });
}
const REINA: Arana = { S: 1.5, quitina: 'be_quitina_negra', marca: 'be_marca', junta: 'be_junta', ojos: 'be_veneno', saco: true };
const CUEVA: Arana = { S: 0.34, quitina: 'be_quitina_parda', marca: 'be_seda', junta: 'be_quitina_parda', ojos: 'cu_ojo_brasa', saco: false };
const CRIA: Arana = { S: 0.16, quitina: 'be_quitina_negra', marca: 'be_marca', junta: 'be_junta', ojos: 'be_veneno', saco: false };
bestia('arana_reina', ['Araña reina', 'Spider queen'], [6, 6], (d, acc, f) => arana(REINA, d, acc, f), ['escupe y cría', 'spit and brood']);
bestia('arana_cueva', ['Araña de cueva', 'Cave spider'], [2, 2], (d, acc, f) => arana(CUEVA, d, acc, f));

/** Escorpión gigante: pinzas que se abren, ocho patas en tetrápodo y la cola de seis anillos que se arquea y pica. */
function escorpion(d: Dir, acc: Acc, f: number): Pieza[] | Escena {
  const S = 1.15, W = mundo(d), ph = f / CUADROS[acc];
  let av = 0, z = 0, pitch = 0, roll = 0, rizo = 0, muerte = 0;
  let pinza = 0.3, brazo = 0, cola = 0, colaAlza = 0;
  if (acc === 'quieto') { const b = Math.sin(ph * TAU); z = b * 0.4; pinza = 0.3 + b * 0.25; cola = b * 4; brazo = b * 3; }
  else if (acc === 'caminar') { z = -Math.abs(Math.cos(ph * TAU * 2)) * 0.5; roll = Math.sin(ph * TAU * 2) * 1.2; pinza = 0.25; cola = Math.sin(ph * TAU) * 6; brazo = Math.sin(ph * TAU) * 6; }
  else if (acc === 'atacar') {
    // las pinzas atrapan (0-3) y la cola descarga el aguijón por encima del cuerpo (3-5)
    av = K([0, 1, 2, 2, 4, 5, 2, 0], f); pitch = K([0, 2, 4, 2, 6, 8, 3, 0], f); pinza = K([0.3, 0.9, 1, 0.05, 0, 0.1, 0.3, 0.3], f);
    brazo = K([0, 14, 22, 8, 4, 2, 0, 0], f); cola = K([0, -10, -16, -20, 10, 14, 6, 0], f); colaAlza = K([0, -8, -14, -18, 30, 42, 16, 0], f);
  } else if (acc === 'morir') {
    z = K([0, 2, 0, -3, -6, -7.5, -8, -8], f); roll = K([0, 6, -4, -12, -20, -24, -25, -25], f); pitch = K([0, -6, -2, 3, 4, 4, 4, 4], f); rizo = K([0, 0.2, 0.4, 0.65, 0.85, 1, 1, 1], f);
    pinza = K([0.3, 1, 0.8, 0.5, 0.4, 0.4, 0.4, 0.4], f); brazo = K([0, 20, 10, -5, -15, -20, -20, -20], f); cola = K([0, -10, 6, 0, 0, 0, 0, 0], f); colaAlza = K([0, 8, 4, 0, 0, 0, 0, 0], f); muerte = K([0, 0, 0.1, 0.3, 0.6, 0.85, 1, 1], f);
  }
  const zb = 11 * S;
  const cuerpo = cmp(W, T([av * S, 0, zb + z * S], Ry(pitch), Rx(roll)));
  const Q = { mat: 'be_ambar' };
  const ps: Pieza[] = [];
  // prosoma (escudo de la cabeza) y siete placas del mesosoma
  const tr: Comp[] = [bT(cuerpo, [14 * S, 0, 0.5 * S], [10.5 * S, 8.4 * S, 4.4 * S], Q), bT(cuerpo, [21 * S, 0, -0.5 * S], [5 * S, 6 * S, 3.2 * S], Q)];
  for (let i = 0; i < 7; i++) {
    const x = (5 - i * 4.2) * S, ancho = (9.8 - Math.abs(i - 2) * 0.55 - (i > 4 ? (i - 4) * 1.2 : 0)) * S;
    tr.push(bT(cuerpo, [x, 0, 0.6 * S], [3.1 * S, ancho, 4.4 * S], { mat: 'be_ambar', k: 0.5 * S, tono: i % 2 ? -0.03 : 0.02 }));
  }
  tr.push(bT(cuerpo, [-6 * S, 0, -1.6 * S], [16 * S, 7.5 * S, 3.4 * S], { mat: 'be_quitina_parda' }));
  ps.push(masa(tr, { mat: 'be_ambar', suave: 1.1 * S }));
  // ojos medianos sobre el prosoma
  for (const s of [1, -1]) { ps.push(esfera(...ap(cuerpo, [17.5 * S, s * 1.4 * S, 4.7 * S]), 0.9 * S, { mat: muerte > 0.6 ? 'cu_ojo' : 'cu_ojo_brasa' })); ps.push(esfera(...ap(cuerpo, [23 * S, s * 4.6 * S, 1.6 * S]), 0.6 * S, { mat: muerte > 0.6 ? 'cu_ojo' : 'cu_ojo_brasa' })); }
  // pinzas: brazo, antebrazo, mano gruesa, dedo fijo y dedo móvil
  for (const s of [1, -1]) {
    const h0 = ap(cuerpo, [22 * S, s * 5 * S, 0]);
    const br = cmp(cuerpo, T([22 * S, s * 5 * S, 0], Rz(s * (35 - brazo * 0.6)), Ry(-8 - brazo * 0.4)));
    const codo = ap(br, [11 * S, 0, 0]);
    const ant = cmp(br, T([11 * S, 0, 0], Rz(-s * (70 - brazo * 1.2)), Ry(-6)));
    const mun = ap(ant, [9 * S, 0, 0]);
    const mano = cmp(ant, T([9 * S, 0, 0], Rz(-s * (12 + brazo * 0.3))));
    const ab = pinza * 34;
    const dFijo = cmp(mano, T([10 * S, -s * 1.4 * S, 0], Rz(s * 6)));
    const dMov = cmp(mano, T([10 * S, s * 1.6 * S, 0], Rz(s * (ab - 4))));
    ps.push(masa([
      hueso(h0, codo, 2.8 * S, 2.6 * S, Q), bulto(codo, [2.9 * S, 2.9 * S, 2.9 * S], Q), hueso(codo, mun, 2.8 * S, 3.4 * S, Q),
      bT(mano, [4.5 * S, 0, 0.4 * S], [7.5 * S, 4.8 * S, 4.4 * S], Q),
      hT(dFijo, [0, 0, 0], [9 * S, s * 0.8 * S, 0], 2.4 * S, 0.3 * S, { mat: 'be_quitina_parda' }),
      hT(dMov, [0, 0, 0], [9 * S, -s * 0.8 * S, 0.2 * S], 2.3 * S, 0.3 * S, { mat: 'be_quitina_parda' }),
    ], { mat: 'be_ambar', suave: 0.9 * S }));
  }
  // cola: seis anillos que se arquean sobre el lomo; el aguijón brilla de veneno
  const angs = [38, 66, 92, 118, 146, 172], carga = [26, 58, 94, 130, 166, 204], golpe = [96, 108, 122, 138, 158, 196];
  const wC = acc === 'atacar' ? K([0, 0.4, 0.8, 1, 0, 0, 0.3, 0], f) : 0, wG = acc === 'atacar' ? K([0, 0, 0, 0, 0.85, 1, 0.4, 0], f) : 0;
  let p0: V3 = [-24 * S, 0, 1.5 * S], ang = 0;
  const cc: Comp[] = [];
  let prev = ap(cuerpo, p0);
  for (let i = 0; i < 6; i++) {
    const base = angs[i] * (1 - wC - wG) + carga[i] * wC + golpe[i] * wG;
    ang = lerp(base + (acc === 'atacar' ? 0 : cola * i * 0.25 + colaAlza), 4 + i * 3 + Math.sin(i * 2.1) * 5, muerte);
    const Lg = (7.4 + (i === 5 ? 0.6 : 0)) * S;
    const onda = acc === 'caminar' ? Math.sin(ph * TAU - i * 0.6) * 1.2 * S : 0;
    p0 = add(p0, [-Math.cos(rad(ang)) * Lg, onda * 0.3, Math.sin(rad(ang)) * Lg]);
    const p = ap(cuerpo, p0);
    const r = (3.5 - i * 0.22) * S;
    cc.push(hueso(prev, p, r, r * 0.92, { mat: 'be_ambar', tono: i % 2 ? -0.02 : 0.03 }), bulto(p, [r * 0.8, r * 0.8, r * 0.8], { mat: 'be_quitina_parda', k: 0.4 * S }));
    prev = p;
  }
  // telson: bulbo y aguijón curvo
  const dirC: V3 = [-Math.cos(rad(ang + 30)), 0, Math.sin(rad(ang + 30))];
  const bulbo = ap(cuerpo, add(p0, dirC, 3.6 * S));
  cc.push(bulto(bulbo, [4.4 * S, 3 * S, 3.2 * S], { eje: mv(cuerpo.m, dirC), mat: 'be_ambar', tono: 0.05 }));
  ps.push(masa(cc, { mat: 'be_ambar', suave: 0.8 * S }));
  const dirA: V3 = [-Math.cos(rad(ang + 75)), 0, Math.sin(rad(ang + 75))];
  const punta = ap(cuerpo, add(add(p0, dirC, 7 * S), dirA, 5 * S));
  ps.push(masa([hueso(ap(cuerpo, add(p0, dirC, 6 * S)), punta, 1.5 * S, 0.15 * S, { mat: 'be_cuerno' })], { mat: 'be_cuerno' }));
  if (muerte < 0.5) ps.push(esfera(...punta, 0.9 * S, { mat: 'be_veneno' }));
  // patas
  const patas: Pata[] = [];
  const pAng = [62, 88, 112, 136];
  for (const s of [1, -1]) for (let i = 0; i < 4; i++) {
    const a = rad(pAng[i]), R = 25 * S;
    patas.push({ cadera: [(9 - i * 4.6) * S, s * 7 * S, -1.5 * S], reposo: [(4 - i * 2) * S + Math.cos(a) * R + av * S * 0.3, s * Math.sin(a) * R, 0], l1: 11 * S, l2: 15 * S, fase: ((i % 2 === 0) === (s < 0) ? 0 : 0.5) + i * 0.04, r: 1.6 * S });
  }
  ps.push(...patasArac(W, cuerpo, patas, { paso: 9 * S, alza: 5 * S, mat: 'be_ambar', junta: 'be_quitina_parda', caminar: acc === 'caminar', ph, rizo }));
  return acc === 'atacar' && f >= 3 && f <= 5 ? { piezas: ps, resplandor: { c: punta, r: 10 * S, color: '#90ff50' } } : ps;
}
bestia('escorpion_gigante', ['Escorpión gigante', 'Giant scorpion'], [4, 3], escorpion);

// ------------------------------------------------------------------ gusano de arena (jefe)
/**
 * Un gusano enorme que sale de un agujero: la columna se integra tramo a tramo con un ángulo que se curva hacia
 * adelante arriba y ondas que suben por el cuerpo; cada tramo es carne con un anillo de placa encima. La boca es un
 * hueco redondo tallado en la punta con tres coronas de dientes hacia adentro. Lo que queda bajo el piso se corta.
 */
function gusano(d: Dir, acc: Acc, f: number): Pieza[] | Escena {
  const W = mundo(d), n = CUADROS[acc], ph = f / n;
  const N = 18, Lt = 240, ls = Lt / N;
  let base = -40, curva = 78, lado = 9, frente = 4, inclina = 0, boca = 0.15, polvo = 0, muerte = 0;
  const onda = (A: number, k: number, s: number) => A * Math.sin(ph * TAU - s * k);
  if (acc === 'caminar') { lado = 16; frente = 8; curva = 74; }
  if (acc === 'atacar') {
    // se echa atrás (carga), se lanza hacia adelante y abajo con la boca abierta, y vuelve
    inclina = K([0, -10, -20, -24, 18, 30, 14, 4], f); curva = K([78, 70, 58, 52, 120, 138, 104, 84], f); boca = K([0.15, 0.4, 0.75, 0.9, 1, 0.35, 0.2, 0.15], f); lado = 4;
  } else if (acc === 'morir') {
    inclina = K([0, -12, 10, -6, 0, 0, 0, 0], f); curva = K([78, 50, 100, 70, 60, 50, 40, 40], f); boca = K([0.15, 1, 0.7, 0.9, 0.6, 0.4, 0.3, 0.3], f); lado = K([9, 22, 26, 14, 8, 4, 2, 2], f);
    base = K([-40, -40, -45, -70, -115, -165, -215, -250], f); polvo = K([0, 0, 0.3, 0.6, 0.8, 0.9, 0.7, 0.4], f); muerte = K([0, 0, 0.2, 0.5, 0.8, 1, 1, 1], f);
  } else if (acc === 'especial') {
    // sale del suelo reventando la tierra
    base = K([-250, -220, -175, -130, -90, -60, -44, -40], f); curva = K([10, 20, 30, 40, 55, 72, 84, 78], f); boca = K([0, 0, 0.3, 0.6, 1, 1, 0.6, 0.2], f); polvo = K([0.6, 1, 1, 0.9, 0.7, 0.5, 0.3, 0.1], f); lado = 6;
  }
  // columna
  const pts: V3[] = [[0, 0, base]], tans: V3[] = [];
  let p: V3 = [0, 0, base];
  for (let i = 0; i < N; i++) {
    const s = (i + 0.5) / N;
    const th = rad(inclina * s + curva * Math.pow(Math.max(0, (s - 0.25) / 0.75), 1.6) + onda(frente, 5, s) * s);
    const fi = rad(onda(lado, 4.5, s) * Math.min(1, s * 2.2));
    const t: V3 = nor([Math.sin(th) * Math.cos(fi), Math.sin(fi), Math.cos(th) * Math.cos(fi)]);
    p = add(p, t, ls); pts.push(p); tans.push(t);
  }
  const rad0 = (s: number) => 22 + 5 * Math.sin(Math.min(1, s * 2.5) * Math.PI * 0.6) - 4 * Math.max(0, s - 0.6) * 2.2;
  const L = (q: V3) => ap(W, q);
  const ps: Pieza[] = [];
  const atras: V3 = [-1, 0, 0];
  // carne y placas en masas de tres tramos (las uniones quedan bajo un anillo)
  const G = 3;
  for (let g = 0; g < N / G; g++) {
    const cs: Comp[] = [];
    for (let i = g * G; i < Math.min(N, g * G + G + 1); i++) {
      const s = i / N, a = pts[i], b = pts[i + 1] ?? pts[i], r = rad0(s), rb = rad0((i + 1) / N);
      if (Math.max(a[2], b[2]) < -r - 2) continue;
      if (i < g * G + G && i < N - 1) cs.push(hueso(L(a), L(b), r, rb, { mat: 'be_gusano' }));
      const t = tans[Math.min(i, N - 1)];
      cs.push(bulto(L(a), [4.6, r + 2.6, r + 2.6], { eje: mv(W.m, t), mat: 'be_gusano_placa', k: 0.8, tono: (i % 2) * -0.04 }));
    }
    if (cs.length) ps.push(masa(cs, { mat: 'be_gusano', suave: 2 }));
  }
  // púas dorsales sobre los anillos
  for (let i = 3; i < N - 1; i++) {
    const a = pts[i], t = tans[i], r = rad0(i / N) + 2;
    if (a[2] < 2) continue;
    const dorso = nor(sub(atras, esc(t, pto(atras, t))));
    for (const k of [-1, 0, 1]) {
      const lat = nor(cruz(t, dorso)), dirp = nor(add(dorso, lat, k * 0.7));
      const b0 = add(a, dirp, r - 1);
      ps.push(pua(L(b0), L(add(add(b0, dirp, 7 - Math.abs(k) * 2), t, -4)), 2.2 - Math.abs(k) * 0.5, 'be_cuerno'));
    }
  }
  // cabeza: reborde, boca tallada, dientes en tres coronas y ojos de brasa alrededor
  const hd = pts[N], th = tans[N - 1], rH = rad0(1) + 3;
  const u0 = nor(cruz(th, Math.abs(th[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1])), v0 = cruz(th, u0);
  if (hd[2] > -rH) {
    const ab = 0.55 + boca * 0.25;
    ps.push(masa([bulto(L(add(hd, th, -2)), [5, rH, rH], { eje: mv(W.m, th), mat: 'be_gusano_placa' }), bulto(L(add(hd, th, -9)), [9, rH - 2, rH - 2], { eje: mv(W.m, th), mat: 'be_gusano' })], { mat: 'be_gusano_placa', suave: 2 }));
    ps.push(cilindro(...L(add(hd, th, -16)), rH * ab, 40, { mat: 'be_garganta', eje: mv(W.m, th), resta: true }));
    ps.push(bulto2(L(add(hd, th, -13)), [3, rH * ab, rH * ab], mv(W.m, th), 'be_garganta'));
    for (let ring = 0; ring < 3; ring++) {
      const dep = 1.5 + ring * 4, rr = rH * ab * (1 - ring * 0.12), nT = 12 - ring * 2;
      for (let k = 0; k < nT; k++) {
        const a = (k / nT) * TAU + ring * 0.4, u = add(esc(u0, Math.cos(a)), v0, Math.sin(a));
        const b0 = add(add(hd, th, -dep), u, rr), tip = add(add(hd, th, -dep - 3.5), u, rr * (0.35 + 0.25 * (1 - boca)));
        ps.push(pua(L(b0), L(tip), 2.1 - ring * 0.4, 'cu_hueso', -ring * 0.08));
      }
    }
    // ganchos del borde que se abren con la boca
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + 0.4, u = add(esc(u0, Math.cos(a)), v0, Math.sin(a));
      const b0 = add(add(hd, th, -1), u, rH - 1), punta = add(add(b0, th, 9 - boca * 2), u, -3 + boca * 9);
      ps.push(masa([hueso(L(b0), L(punta), 2.6, 0.5, { mat: 'be_cuerno' })], { mat: 'be_cuerno' }));
    }
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU, u = add(esc(u0, Math.cos(a)), v0, Math.sin(a));
      ps.push(esfera(...L(add(add(hd, th, -9), u, rH - 2.2)), 1.5, { mat: muerte > 0.6 ? 'cu_ojo' : 'cu_ojo_brasa' }));
    }
  }
  // lo que está bajo el piso no se ve
  ps.push(caja(0, 0, -400, 2000, 2000, 400, { mat: 'tierra', resta: true }));
  // el agujero: borde de tierra levantada, piedras y polvo que salta
  const bordo: Comp[] = [];
  for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU + hr(k) * 0.3, R = 33 + hr(k + 5) * 5; bordo.push(bulto([Math.cos(a) * R, Math.sin(a) * R, 0], [11 + hr(k + 9) * 4, 7 + hr(k + 2) * 3, 4.5 + hr(k + 3) * 3], { giro: (a * 180) / Math.PI + 90, mat: 'tierra' })); }
  ps.push(masa(bordo, { mat: 'tierra', suave: 4 }));
  ps.push(elipsoide(0, 0, 0.3, 29, 29, 0.6, { mat: 'negro' }));
  for (let k = 0; k < 7; k++) { const a = hr(k + 30) * TAU, R = 38 + hr(k + 31) * 12; ps.push(elipsoide(Math.cos(a) * R, Math.sin(a) * R, 1.2, 3 + hr(k) * 3, 2.5 + hr(k + 1) * 2, 2 + hr(k + 2) * 2, { mat: 'cu_roca', giro: hr(k + 3) * 180 })); }
  if (polvo > 0) for (let k = 0; k < 14; k++) {
    const a = hr(k + 50) * TAU, v = 0.5 + hr(k + 51), t = polvo;
    const q: V3 = [Math.cos(a) * (30 + 40 * t * v), Math.sin(a) * (30 + 40 * t * v), 4 + (60 * v * t - 50 * t * t * v) * (1 + hr(k + 52))];
    if (q[2] > 1) ps.push(elipsoide(...q, 2 + hr(k + 53) * 3, 2 + hr(k + 54) * 2.5, 1.6 + hr(k) * 2, { mat: k % 3 ? 'tierra' : 'cu_roca', giro: k * 40 }));
  }
  return ps;
}
const bulto2 = (c: V3, r: V3, eje: V3, mat: string) => masa([bulto(c, r, { eje, mat })], { mat });
bestia('gusano_de_arena', ['Gusano de arena', 'Sand worm'], [5, 5], gusano, ['emerge', 'emerge']);

// ------------------------------------------------------------------ gólem de piedra
interface Roca { c: V3; r: V3; e: [V3, V3, V3]; mat: string; tono: number; parte: number }
/** Una pieza elipsoide con ejes libres (para rocas sueltas que caen girando). */
const elipEjes = (c: V3, r: V3, e: [V3, V3, V3], mat: string, tono = 0): Pieza => ({ k: 'elip', c, ex: e[0], ey: e[1], ez: e[2], r, mat, tono });
/** Ejes de un marco girados por cabeceo/alabeo extra (para que las rocas no queden alineadas). */
const PHI = (1 + Math.sqrt(5)) / 2;
const ICO: V3[] = ([[0, 1, PHI], [0, -1, PHI], [0, 1, -PHI], [0, -1, -PHI], [1, PHI, 0], [-1, PHI, 0], [1, -PHI, 0], [-1, -PHI, 0], [PHI, 0, 1], [-PHI, 0, 1], [PHI, 0, -1], [-PHI, 0, -1]] as V3[]).map(nor);
/** Roca facetada: un icosaedro con los vértices corridos al azar, estirado con radios `r` sobre los ejes `e`. */
function roca(c: V3, r: V3, e: [V3, V3, V3], mat: string, semilla: number, tono = 0, mella = 0.22): Pieza {
  const pts = ICO.map((v, i) => { const k = 1 - hr(semilla * 13 + i) * mella; return add(add(add(c, e[0], v[0] * r[0] * k), e[1], v[1] * r[1] * k), e[2], v[2] * r[2] * k); });
  return poliedro(pts, { mat, tono });
}
const ejesGiro = (t: Tr, a: number, b: number, c = 0): [V3, V3, V3] => ejesDe(cmp(t, T([0, 0, 0], Rz(c), Ry(a), Rx(b))));

function golem(d: Dir, acc: Acc, f: number): Pieza[] | Escena {
  const W = mundo(d), ph = f / CUADROS[acc];
  // pose: cadera, torso, pies y manos (en el marco local de la bestia)
  let px = 0, py = 0, pz = 0, tp = 0, tr = 0, ty = 0, cab = 0;
  const pie: V3[] = [[2, 13, 0], [2, -13, 0]];
  const mano: V3[] = [[6, 31, 30], [6, -31, 30]];
  let derrumbe = -1, apaga = 0, golpe = 0;
  if (acc === 'quieto') {
    const b = Math.sin(ph * TAU); pz = b * 0.6; tp = 2 + b * 0.8; mano[0][2] += b * 0.8; mano[1][2] += b * 0.8;
  } else if (acc === 'caminar') {
    // paso pesado: el peso pasa al pie de apoyo, el otro se levanta alto y pisa de golpe
    for (const [i, s] of [[0, 1], [1, -1]] as [number, number][]) {
      const st = paso(ph + (i ? 0.5 : 0), 30, 13, 0.6);
      pie[i] = [2 + st.x, s * 13, st.z];
      mano[i] = [6 - st.x * 0.6, s * 31, 30 + st.vuelo * 3];
    }
    py = Math.sin(ph * TAU) * 4.5; tr = -Math.sin(ph * TAU) * 4; ty = Math.sin(ph * TAU) * 7; pz = -Math.abs(Math.sin(ph * TAU * 2 + 0.6)) * 3; tp = 4;
  } else if (acc === 'atacar') {
    // sube los dos puños sobre la cabeza y los descarga contra el suelo
    const mx = [6, 8, -2, -6, 36, 40, 24, 8], mz = [30, 72, 122, 128, 14, 9, 20, 28], my = [31, 26, 18, 16, 13, 14, 24, 30];
    for (const s of [1, -1]) mano[s > 0 ? 0 : 1] = [K(mx, f), s * K(my, f), K(mz, f)];
    tp = K([2, -6, -16, -18, 26, 32, 14, 4], f); pz = K([0, 1, 2, 2, -6, -8, -4, -1], f); px = K([0, -1, -3, -3, 3, 4, 2, 0], f); cab = K([0, -8, -14, -14, 10, 14, 6, 0], f);
    pie[0] = [K([2, 2, 2, 2, 8, 8, 5, 2], f), 14, 0];
    golpe = K([0, 0, 0, 0, 0.6, 1, 0.6, 0.2], f);
  } else if (acc === 'morir') {
    // se tambalea, cae de rodillas y se desmorona: cada roca cae por su cuenta
    tp = K([2, -12, 10, 18, 18, 18, 18, 18], f); pz = K([0, 0, -12, -16, -16, -16, -16, -16], f); cab = K([0, -20, 15, 20, 20, 20, 20, 20], f);
    mano[0] = [12, 30, K([30, 40, 18, 14, 14, 14, 14, 14], f)]; mano[1] = [12, -30, K([30, 34, 16, 12, 12, 12, 12, 12], f)];
    derrumbe = f >= 3 ? (f - 2) / 5 : -1; apaga = K([0, 0.3, 0.5, 0.8, 1, 1, 1, 1], f);
  }
  const zc = 42 + pz;
  const pel = cmp(W, T([px, py, zc], Rz(ty * 0.4)));
  const tor = cmp(pel, T([0, 0, 6], Rz(ty * 0.6), Ry(tp), Rx(tr)));
  const cabT = cmp(tor, T([14, 0, 45], Ry(cab + 10)));
  const rocas: Roca[] = [];
  const R = (t: Tr, c: V3, r: V3, parte: number, mat = 'cu_roca', k = 0) => { const q = rocas.length; rocas.push({ c: ap(t, c), r, e: ejesGiro(t, (hr(q) - 0.5) * 30, (hr(q + 9) - 0.5) * 30, (hr(q + 4) - 0.5) * 40), mat, tono: (hr(q + 2) - 0.5) * 0.14 + k, parte }); };
  // tronco: pelvis, vientre, pecho enorme, joroba y hombros
  R(pel, [0, 0, 2], [12, 15, 9], 0);
  R(tor, [3, 0, 12], [12, 16, 10], 0);
  R(tor, [3, 0, 30], [15, 23, 14], 0);
  for (const s of [1, -1]) { R(tor, [9, s * 11, 31], [9, 11, 10], 0, 'cu_roca', 0.04); R(tor, [-7, s * 10, 40], [11, 13, 11], 0); R(tor, [0, s * 26, 40], [12, 12, 11.5], 0, 'cu_roca', 0.03); R(tor, [-3, s * 25, 50.5], [5, 6, 1.8], 0, 'musgo'); }
  R(tor, [-8, 0, 44], [11, 14, 10], 0);
  // cabeza chica hundida entre los hombros
  R(cabT, [0, 0, 0], [8, 8, 7.5], 1); R(cabT, [4.5, 0, 3.4], [4, 8.5, 3], 1, 'cu_roca', -0.05);
  // brazos: IK del hombro a la mano con el codo atrás y afuera
  const brazos: [V3, V3, V3][] = [];
  for (const [i, s] of [[0, 1], [1, -1]] as [number, number][]) {
    const h = ap(tor, [-1, s * 27, 38]);
    const m = ap(W, mano[i]);
    const [codo, mm2] = ik(h, m, 27, 27, add(mv(tor.m, [-1, s * 0.6, 0]), [0, 0, 0]));
    brazos.push([h, codo, mm2]);
    const ta = cmp(W, T(mez(h, codo, 0.5), I3)), tb = cmp(W, T(mez(codo, mm2, 0.5), I3));
    void ta; void tb;
    const brazoT = (a: V3, b: V3, t: number, r: V3, k = 0) => { const q = rocas.length; rocas.push({ c: mez(a, b, t), r, e: ejesGiro({ o: [0, 0, 0], m: marcoEje(sub(b, a)) }, (hr(q) - 0.5) * 30, (hr(q + 3) - 0.5) * 30), mat: 'cu_roca', tono: (hr(q + 1) - 0.5) * 0.14 + k, parte: 2 + i }); };
    brazoT(h, codo, 0.25, [10, 9, 9]); brazoT(h, codo, 0.72, [9, 8, 8]);
    brazoT(codo, mm2, 0.2, [8, 8, 8]); brazoT(codo, mm2, 0.65, [11, 10, 10], 0.03);
    brazoT(codo, mm2, 1.02, [10, 11, 9.5], 0.05);
  }
  // piernas cortas y gruesas
  const piernas: [V3, V3, V3][] = [];
  for (const [i, s] of [[0, 1], [1, -1]] as [number, number][]) {
    const c = ap(pel, [0, s * 12, -2]);
    const tob = add(ap(W, pie[i]), [0, 0, 7]);
    const [rod, t2] = ik(c, tob, 22, 20, mv(pel.m, [1, 0, 0]));
    piernas.push([c, rod, t2]);
    const pT = (a: V3, b: V3, t: number, r: V3) => { const q = rocas.length; rocas.push({ c: mez(a, b, t), r, e: ejesGiro({ o: [0, 0, 0], m: marcoEje(sub(b, a)) }, (hr(q) - 0.5) * 24, (hr(q + 3) - 0.5) * 24), mat: 'cu_roca', tono: (hr(q + 1) - 0.5) * 0.14, parte: 4 + i }); };
    pT(c, rod, 0.4, [12, 10.5, 10.5]); pT(c, rod, 1, [7, 7, 7]); pT(rod, t2, 0.5, [11, 9, 9]);
    rocas.push({ c: add(t2, mv(W.m, [3, 0, -3])), r: [11, 8, 5], e: ejesDe(cmp(W, T([0, 0, 0], Rz(ty * 0.3)))), mat: 'cu_roca', tono: -0.04, parte: 4 + i });
  }
  const ps: Pieza[] = [];
  const brilla = apaga > 0.7 ? 'be_lava_fria' : 'runa';
  if (derrumbe < 0) {
    // cada parte es una masa de rocas apenas fundidas
    rocas.forEach((r, q) => ps.push(r.mat === 'musgo' ? elipEjes(r.c, r.r, r.e, r.mat, -0.32) : roca(r.c, r.r.map((x) => x * 1.08) as V3, r.e, r.mat, q, r.tono)));
    // ojos y runas que brillan
    for (const s of [1, -1]) ps.push(elipsoide(...ap(cabT, [7.4, s * 3, 0.8]), 1.5, 1.9, 1, { mat: apaga > 0.5 ? 'cu_ojo' : 'runa' }));
    const glifo: [number, number][][] = [[[8, 36], [0, 30], [-8, 36], [0, 42], [8, 36]], [[0, 26], [0, 44]], [[-6, 22], [6, 22]], [[-11, 30], [-13, 24]], [[11, 30], [13, 24]]];
    for (const linea of glifo) for (let k = 0; k < linea.length - 1; k++) {
      const a = linea[k], b = linea[k + 1];
      const pt = (q: [number, number]): V3 => { const yy = q[0], zz = q[1]; const fx = 3 + 15 * Math.sqrt(Math.max(0, 1 - (yy / 23) ** 2 - ((zz - 30) / 14) ** 2)); return ap(tor, [fx + 0.4, yy, zz]); };
      ps.push(palo(pt(a), pt(b), 0.8, { mat: brilla }));
    }
    for (const [h, codo, m] of brazos) for (let k = 0; k < 3; k++) { const c0 = mez(codo, m, 0.35 + k * 0.15); ps.push(palo(add(c0, [0, 0, 8.6]), add(c0, [0, 0, 10.2]), 0.7, { mat: brilla })); void h; }
  } else {
    // desmoronarse: cada roca cae con gravedad desde donde estaba, rueda un poco y queda en el piso
    const t = derrumbe;
    rocas.forEach((r, q) => {
      const afuera = nor([r.c[0] - px + (hr(q + 70) - 0.5) * 20, r.c[1] - py + (hr(q + 71) - 0.5) * 20, 0]);
      const v = 10 + hr(q + 72) * 18, caida = r.c[2] - Math.min(...r.r) * 0.75;
      const tt = Math.min(1, t * (1.1 + hr(q + 73) * 0.6));
      const c: V3 = [r.c[0] + afuera[0] * v * tt, r.c[1] + afuera[1] * v * tt, Math.max(Math.min(...r.r) * 0.75, r.c[2] + 6 * tt - (caida + 6) * tt * tt)];
      const gira = ejesGiro({ o: [0, 0, 0], m: r.e }, tt * (hr(q + 74) - 0.5) * 120, tt * (hr(q + 75) - 0.5) * 120);
      ps.push(r.mat === 'musgo' ? elipEjes(c, r.r, gira, r.mat, -0.15) : roca(c, r.r.map((x) => x * (q % 3 === 0 ? 1 : 1.08)) as V3, gira, r.mat, q, r.tono - 0.04));
    });
    for (let k = 0; k < 14; k++) { const a = hr(k + 90) * TAU, R0 = 10 + hr(k + 91) * 40 * t; ps.push(elipsoide(px + Math.cos(a) * R0, py + Math.sin(a) * R0, 1.5, 2 + hr(k) * 2.5, 1.6 + hr(k + 1) * 2, 1.4 + hr(k + 2) * 1.5, { mat: 'cu_roca', giro: k * 37, tono: -0.05 })); }
  }
  // golpe contra el suelo: lascas que saltan y la tierra rajada
  if (golpe > 0) {
    const c0 = ap(W, [40, 0, 0]);
    for (let k = 0; k < 12; k++) {
      const a = hr(k + 110) * TAU, R0 = 8 + golpe * (16 + hr(k + 111) * 24), h = golpe * (4 + hr(k + 112) * 22) * (1.2 - golpe * 0.5);
      ps.push(elipsoide(c0[0] + Math.cos(a) * R0, c0[1] + Math.sin(a) * R0, 1 + h, 1.6 + hr(k) * 2.4, 1.4 + hr(k + 1) * 1.8, 1.2 + hr(k + 2) * 1.6, { mat: k % 2 ? 'cu_roca' : 'tierra', giro: k * 47 }));
    }
    for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + 0.3; ps.push(caja(c0[0] + Math.cos(a) * 9, c0[1] + Math.sin(a) * 9, -0.2, 16 * golpe, 1.4, 0.6, { mat: 'negro', giro: (a * 180) / Math.PI })); }
  }
  return derrumbe < 0 && apaga < 0.5 ? { piezas: ps, resplandor: { c: ap(tor, [20, 0, 32]), r: 10, color: '#60c0ff' } } : ps;
}
/** Matriz con el eje x a lo largo de `v` y el z lo más vertical posible. */
function marcoEje(v: V3): M3 { const ex = nor(v); const up: V3 = Math.abs(ex[2]) > 0.95 ? [1, 0, 0] : [0, 0, 1]; const ey = nor(cruz(up, ex)); return [ex, ey, cruz(ex, ey)]; }
bestia('golem_de_piedra', ['Gólem de piedra', 'Stone golem'], [3, 3], golem);

// ------------------------------------------------------------------ alas (gárgola, murciélago, demonio, dragón)
interface Ala {
  /** Raíz del ala en el mundo, eje adelante del cuerpo (mundo) y lado (+1 derecha, -1 izquierda; `der` es la derecha del cuerpo en el mundo). */
  raiz: V3; adel: V3; der: V3; arriba: V3; lado: number;
  /** Largos del brazo, antebrazo y dedos. */
  L1: number; L2: number; Ld: number;
  /** 0 plegada, 1 abierta; ángulo de batido (grados, + arriba); retraso de la punta. */
  abre: number; bate: number; lag?: number;
  hueso: string; membrana: string; grueso: number;
  rota?: number; semilla?: number; dedos?: number; garra?: string; carne?: boolean;
}
/**
 * Ala de murciélago o de dragón: húmero, antebrazo y dedos que salen de la muñeca; la membrana se tiende en
 * triángulos finos entre los dedos con el borde de fuga recortado en festones (y rasgado si `rota` > 0). El batido
 * gira el plano del ala sobre el eje del cuerpo y la punta llega un poco después (seguimiento).
 */
function ala(a: Ala): Pieza[] {
  const ps: Pieza[] = [];
  const nd = a.dedos ?? 4;
  // forma en el plano del ala: u hacia afuera, v hacia atrás
  const ab = clamp(a.abre, 0, 1);
  const uv = (abierta: [number, number], plegada: [number, number]): [number, number] => [lerp(plegada[0], abierta[0], ab), lerp(plegada[1], abierta[1], ab)];
  const codo = uv([a.L1 * 0.92, -a.L1 * 0.12], [a.L1 * 0.45, a.L1 * 0.55]);
  const muneca = uv([a.L1 * 0.92 + a.L2 * 0.98, a.L1 * 0.05], [a.L1 * 0.62, -a.L1 * 0.25]);
  const giro = (g: number): [V3, V3] => {
    const c = Math.cos(rad(g)), s = Math.sin(rad(g));
    return [add(esc(a.der, a.lado * c), a.arriba, s), esc(a.adel, -1)];
  };
  const [U1, V1] = giro(a.bate), [U2, V2] = giro(a.bate + (a.lag ?? 0));
  const P = (q: [number, number], ext = false): V3 => { const [U, V] = ext ? [U2, V2] : [U1, V1]; return add(add(a.raiz, U, q[0]), V, q[1]); };
  const pC = P(codo), pM = P(muneca, true);
  const tips: V3[] = [];
  for (let k = 0; k < nd; k++) {
    const angA = lerp(-18, 112, k / (nd - 1)), angP = lerp(-70, 10, k / (nd - 1));
    const an = rad(lerp(angP, angA, ab)), Lk = a.Ld * [1, 1.08, 0.95, 0.78, 0.62][Math.min(4, k)] * lerp(0.75, 1, ab);
    tips.push(P([muneca[0] + Math.cos(an) * Lk, muneca[1] + Math.sin(an) * Lk], true));
  }
  const cola = P([a.L1 * 0.15, a.L1 * lerp(0.4, 0.95, ab)]);
  // huesos
  const g = a.grueso;
  if (a.carne) ps.push(masa([hueso(a.raiz, pC, g * 2.2, g * 1.5, { mat: a.hueso }), hueso(pC, pM, g * 1.5, g * 1.1, { mat: a.hueso }), bulto(pC, [g * 1.7, g * 1.7, g * 1.7], { mat: a.hueso })], { mat: a.hueso, suave: g }));
  else ps.push(palo(a.raiz, pC, g * 1.6, { mat: a.hueso, r1: g * 1.2 }), palo(pC, pM, g * 1.2, { mat: a.hueso, r1: g }), esfera(...pC, g * 1.5, { mat: a.hueso }), esfera(...pM, g * 1.25, { mat: a.hueso }));
  for (const t of tips) ps.push(palo(pM, t, g * 0.8, { mat: a.hueso, r1: g * 0.25 }));
  ps.push(pua(pM, add(add(pM, a.arriba, g * 3), a.adel, g * 2.5), g * 0.7, a.garra ?? 'be_cuerno'));
  // membrana: triángulos finos con festones entre las puntas
  const nrm = (p: V3, q: V3, r: V3) => nor(cruz(sub(q, p), sub(r, p)));
  const tri = (p: V3, q: V3, r: V3) => { const n = nrm(p, q, r), e = 0.35; if (!isFinite(n[0])) return; ps.push(poliedro([add(p, n, e), add(q, n, e), add(r, n, e), add(p, n, -e), add(q, n, -e), add(r, n, -e)], { mat: a.membrana })); };
  const rota = a.rota ?? 0, sem = a.semilla ?? 1;
  for (let k = 0; k < nd - 1; k++) {
    const roto = rota > 0 && hr(sem * 7 + k) < rota;
    const fest = mez(mez(tips[k], tips[k + 1], 0.5), pM, roto ? 0.62 : 0.24);
    tri(pM, tips[k], fest); tri(pM, fest, tips[k + 1]);
    if (roto) { const desg = mez(tips[k + 1], pM, 0.4); ps.pop(); tri(pM, fest, desg); }
  }
  const ult = tips[nd - 1];
  const fest2 = mez(mez(ult, cola, 0.5), pM, rota > 0 ? 0.3 : 0.18);
  tri(pM, ult, fest2); tri(pM, fest2, pC); tri(pC, fest2, cola); tri(a.raiz, pC, cola);
  return ps;
}

// ------------------------------------------------------------------ gárgola
/** Gárgola de piedra agazapada: quieta en cuclillas sobre los nudillos; al caminar se alza y vuela batiendo las alas. */
function gargola(d: Dir, acc: Acc, f: number): Pieza[] | Escena {
  const W = mundo(d), ph = f / CUADROS[acc], P = 'be_piedra_garg';
  let z = 0, av = 0, pitch = 30, roll = 0, cab = -20, abre = 0.3, bate = 20, lag = 0, vuela = 0, mand = 4, caida = 0, muerte = 0;
  let manoD: V3 = [17, 11, 0], manoI: V3 = [17, -11, 0];
  if (acc === 'quieto') { const b = Math.sin(ph * TAU); z = b * 0.4; bate = 22 + b * 4; abre = 0.32 + b * 0.03; cab = -20 + b * 3; }
  else if (acc === 'caminar') {
    // vuelo bajo: un aletazo por ciclo; el cuerpo sube con el golpe hacia abajo
    const c = Math.cos(ph * TAU);
    vuela = 1; z = 15 + Math.sin(ph * TAU) * 3; abre = 0.95; bate = c * 42 + 4; lag = -Math.sin(ph * TAU) * 18; pitch = 22; cab = -12;
    manoD = [20, 12, 12 + z * 0.4]; manoI = [20, -12, 12 + z * 0.4];
  } else if (acc === 'atacar') {
    // abre las alas, se echa atrás y se lanza con las dos garras por delante
    z = K([0, 3, 6, 8, 5, 2, 1, 0], f); av = K([0, -3, -5, 6, 12, 10, 4, 0], f); pitch = K([30, 14, 4, 34, 46, 40, 34, 30], f);
    abre = K([0.3, 0.8, 1, 0.9, 0.7, 0.5, 0.35, 0.3], f); bate = K([20, 50, 62, -10, -30, -10, 10, 20], f); lag = K([0, -10, -16, 14, 20, 8, 0, 0], f); vuela = K([0, 0.4, 0.8, 1, 0.7, 0.3, 0, 0], f);
    cab = K([-20, -30, -34, -10, 0, -6, -14, -20], f); mand = K([4, 10, 20, 28, 30, 10, 6, 4], f);
    manoD = [K([17, 10, 6, 34, 40, 34, 24, 17], f), 12, K([0, 18, 26, 16, 6, 2, 0, 0], f)]; manoI = [K([17, 12, 8, 30, 38, 32, 22, 17], f), -12, K([0, 16, 24, 18, 8, 2, 0, 0], f)];
  } else if (acc === 'morir') {
    z = K([0, 4, 2, -2, -5, -7, -8, -8], f); pitch = K([30, 0, 20, 45, 60, 70, 74, 74], f); roll = K([0, 0, -10, -30, -55, -75, -85, -85], f); cab = K([-20, -45, -10, 10, 20, 25, 25, 25], f);
    abre = K([0.3, 0.9, 0.7, 0.5, 0.35, 0.25, 0.2, 0.2], f); bate = K([20, 50, 20, 0, -10, -20, -25, -25], f); mand = K([4, 30, 20, 12, 10, 10, 10, 10], f); caida = K([0, 0, 0.2, 0.5, 0.8, 1, 1, 1], f); muerte = K([0, 0, 0.2, 0.4, 0.7, 1, 1, 1], f);
    manoD = [K([17, 8, 12, 14, 14, 14, 14, 14], f), 16, K([0, 20, 10, 4, 2, 2, 2, 2], f)]; manoI = [K([17, 8, 14, 18, 18, 18, 18, 18], f), -14, K([0, 16, 6, 2, 2, 2, 2, 2], f)];
  }
  const zc = 17 + z;
  const pel = cmp(W, T([av, caida * 6, zc - caida * 8], Rx(roll), Ry(pitch * 0.25)));
  const tor = cmp(pel, T([1, 0, 3], Ry(pitch * 0.75)));
  const ps: Pieza[] = [];
  const cs: Comp[] = [];
  const m = { mat: P };
  // tronco encorvado
  cs.push(bT(pel, [0, 0, 0], [7, 7, 6], m), bT(tor, [1, 0, 8], [7, 8, 8], m), bT(tor, [2, 0, 16], [8, 10.5, 7.5], m));
  for (const s of [1, -1]) cs.push(bG(tor, [2, s * 6, 19], [5, 4, 4.5], [Ry(-20)], m), bT(tor, [6, s * 4.5, 14], [3.5, 4, 4], m));
  cs.push(bT(tor, [-4, 0, 18], [6, 7, 5], m));
  // cuello y cabeza con cuernos hacia atrás
  const nuca: V3 = [8, 0, 22];
  const cabT = cmp(tor, T(nuca, Ry(cab - pitch * 0.6)));
  cs.push(hT(tor, [3, 0, 18], nuca, 4.5, 3.4, m));
  cs.push(bT(cabT, [2.5, 0, 1], [4.2, 3.8, 3.8], m), bT(cabT, [5.5, 0, -0.6], [3.4, 2.6, 2.4], m), bT(cabT, [4, 0, 2.6], [1.8, 3.6, 1.3], m));
  const mandT = cmp(cabT, T([2.5, 0, -2], Ry(mand)));
  // brazos largos a los nudillos y piernas de corvejón
  const brazos: [V3, V3, V3][] = [];
  for (const [s, mano] of [[1, manoD], [-1, manoI]] as [number, V3][]) {
    const h = ap(tor, [3, s * 9, 18]);
    const mw = ap(W, mano); mw[2] = Math.max(mw[2], 1.5);
    const [codo, m2] = ik(h, mw, 13, 14, mv(tor.m, [-1, s * 0.8, 0]));
    brazos.push([h, codo, m2]);
    cs.push(hueso(h, codo, 2.8, 2.2, m), bulto(mez(h, codo, 0.35), [5, 3.2, 3.2], { eje: sub(codo, h), mat: P }), hueso(codo, m2, 2.2, 1.7, m), bulto(mez(codo, m2, 0.3), [4, 2.6, 2.4], { eje: sub(m2, codo), mat: P }));
  }
  const piernas: V3[][] = [];
  for (const s of [1, -1]) {
    const cad = ap(pel, [0, s * 5.5, 0]);
    let pie: V3 = ap(W, [4 + av, s * 7.5, 0]);
    if (vuela > 0) pie = mez(pie, ap(pel, [-4, s * 7, -11]), vuela);
    if (caida > 0) pie = mez(pie, ap(pel, [6, s * 8, -12]), caida);
    pie[2] = Math.max(pie[2], 1.2);
    const tob = add(pie, mv(pel.m, [-5, 0, 5]));
    const [rod, t2] = ik(cad, tob, 11, 10, mv(pel.m, [1, 0, 0.3]));
    piernas.push([cad, rod, t2, pie]);
    cs.push(hueso(cad, rod, 3.6, 2.6, m), bulto(mez(cad, rod, 0.4), [6, 3.6, 3.8], { eje: sub(rod, cad), mat: P }), hueso(rod, t2, 2.4, 1.6, m));
  }
  ps.push(masa(cs, { mat: P, suave: 1.8 }));
  // manos, pies, garras, mandíbula, cuernos, ojos, cola
  for (const [, codo, m2] of brazos) {
    const fw = nor(sub(m2, codo));
    ps.push(masa([hueso(m2, add(m2, fw, 2.5), 2, 1.8, m)], m));
    for (const k of [-1, 0, 1]) { const lat = nor(cruz(fw, [0, 0, 1])); ps.push(pua(add(add(m2, fw, 3), lat, k * 1.4), add(add(add(m2, fw, 6), lat, k * 1.8), [0, 0, -1.6]), 0.7, 'be_cuerno')); }
  }
  for (const [, , t2, pie] of piernas) {
    const fw = mv(pel.m, [1, 0, 0]);
    ps.push(masa([hueso(t2, pie, 1.6, 1.5, m), bulto(add(pie, fw, 1.5), [3.2, 2.2, 1.5], { eje: fw, mat: P })], { mat: P, suave: 1 }));
    for (const k of [-1, 0, 1]) { const lat = nor(cruz(fw, [0, 0, 1])); ps.push(pua(add(add(pie, fw, 3.5), lat, k * 1.2), add(add(pie, fw, 6), lat, k * 1.6), 0.65, 'be_cuerno')); }
  }
  ps.push(masa([hT(mandT, [0, 0, 0], [6, 0, -0.5], 2.3, 1.4, m)], m));
  for (const s of [1, -1]) {
    ps.push(pua(ap(mandT, [5, s * 1, 0.4]), ap(mandT, [5.2, s * 1, 2.4]), 0.55));
    const a = ap(cabT, [1, s * 2.6, 3.4]), b = ap(cabT, [-3, s * 5, 7]), e = ap(cabT, [-8, s * 5.4, 6]);
    ps.push(masa([hueso(a, b, 1.5, 1, { mat: 'be_cuerno' }), hueso(b, e, 1, 0.15, { mat: 'be_cuerno' })], { mat: 'be_cuerno', suave: 0.5 }));
    ps.push(elipsoide(...ap(cabT, [5.6, s * 2, 1.6]), 0.8, 1, 0.6, { mat: muerte > 0.6 ? 'cu_ojo' : 'cu_ojo_brasa' }));
    // alas de piedra
    ps.push(...ala({ raiz: ap(tor, [-2, s * 5, 19]), adel: nor(mv(tor.m, [1, 0, 0.3])), der: mv(W.m, [0, 1, 0]), arriba: [0, 0, 1], lado: s, L1: 13, L2: 14, Ld: 20, abre, bate, lag, hueso: P, membrana: 'be_piedra_ala', grueso: 1.3, carne: true, dedos: 4, semilla: s > 0 ? 3 : 4 }).map((pz) => pz));
  }
  const cola: Comp[] = [];
  let prev = ap(pel, [-5, 0, -1]);
  for (let i = 1; i <= 4; i++) { const t = i / 4; const q = ap(W, [av - 8 - t * 14, Math.sin(ph * TAU - t * 2) * 3 * t, Math.max(1.2, (zc - caida * 8) * (1 - t) * 0.8 + 1.2)]); cola.push(hueso(prev, q, 2.2 - t * 1.2, 2 - t * 1.3, m)); prev = q; }
  ps.push(masa(cola, { mat: P, suave: 1 }));
  ps.push(pua(prev, add(prev, mv(W.m, [-3, 0, 2])), 1.2, P));
  // al morir se le quiebran las puntas de las alas y caen esquirlas
  if (muerte > 0.9) for (let k = 0; k < 6; k++) { const a = hr(k + 3) * TAU, R = 14 + hr(k + 4) * 14; ps.push(roca(ap(W, [Math.cos(a) * R, Math.sin(a) * R, 1.5]), [2 + hr(k) * 2, 1.6 + hr(k + 1) * 1.5, 1.4 + hr(k + 2)], ejesDe(T([0, 0, 0], Rz(k * 50))), P, k)); }
  return ps;
}
bestia('gargola', ['Gárgola', 'Gargoyle'], [2, 2], gargola);

// ------------------------------------------------------------------ murciélago gigante
function murcielago(d: Dir, acc: Acc, f: number): Pieza[] | Escena {
  const W = mundo(d), ph = f / CUADROS[acc], P = 'be_murcielago';
  let z = 28, av = 0, pitch = 10, roll = 0, abre = 1, bate = 0, lag = 0, mand = 6, muerte = 0;
  if (acc === 'quieto') { bate = Math.cos(ph * TAU) * 50 + 5; lag = -Math.sin(ph * TAU) * 22; z = 30 + Math.sin(ph * TAU) * 2.5; }
  else if (acc === 'caminar') { bate = Math.cos(ph * TAU * 2) * 55 + 5; lag = -Math.sin(ph * TAU * 2) * 24; z = 30 + Math.sin(ph * TAU * 2) * 3; pitch = 22; }
  else if (acc === 'atacar') {
    // recoge las alas y se tira en picada a morder, después remonta
    z = K([30, 33, 30, 20, 14, 18, 24, 29], f); av = K([0, -3, -1, 8, 15, 12, 6, 1], f); pitch = K([10, -10, 20, 45, 30, 0, -5, 5], f);
    abre = K([1, 1, 0.65, 0.5, 0.7, 1, 1, 1], f); bate = K([30, 60, 40, -20, -40, 40, 60, 10], f); lag = K([0, -10, 15, 25, 10, -20, -10, 0], f); mand = K([6, 10, 25, 40, 5, 4, 6, 6], f);
  } else if (acc === 'morir') {
    // pierde el vuelo y cae dando vueltas hasta quedar boca arriba
    z = K([30, 33, 28, 20, 11, 5, 3.2, 3.2], f); roll = K([0, 15, 60, 110, 150, 175, 180, 180], f); pitch = K([10, -10, 10, 20, 15, 5, 0, 0], f);
    abre = K([1, 1, 0.8, 0.6, 0.5, 0.6, 0.7, 0.7], f); bate = K([0, 50, 20, -20, 30, -5, -18, -18], f); mand = K([6, 30, 20, 15, 15, 15, 15, 15], f); muerte = K([0, 0, 0.3, 0.6, 0.8, 1, 1, 1], f);
  }
  const cu = cmp(W, T([av, 0, z], Rx(roll), Ry(pitch)));
  const m = { mat: P };
  const ps: Pieza[] = [];
  const cab = cmp(cu, T([5, 0, 1.5], Ry(-pitch * 0.4)));
  const cs: Comp[] = [bT(cu, [0, 0, 0], [6.2, 4.4, 4.6], m), bT(cu, [-5, 0, -0.8], [4, 3.4, 3.4], m), bT(cu, [2.8, 0, 0.6], [3.4, 4.8, 3.6], m)];
  cs.push(bT(cab, [0.8, 0, 0], [2.8, 2.6, 2.6], m), hT(cab, [1.5, 0, -0.4], [4.2, 0, -0.9], 1.5, 0.9, { mat: 'be_hocico' }));
  for (const s of [1, -1]) cs.push(hT(cab, [-0.5, s * 1.6, 1.8], [-0.8, s * 3.6, 6.5], 1.6, 0.2, m));
  ps.push(masa(cs, { mat: P, suave: 1.4 }));
  const mandT = cmp(cab, T([1.5, 0, -1.4], Ry(mand)));
  ps.push(masa([hT(mandT, [0, 0, 0], [2.6, 0, -0.2], 0.9, 0.6, { mat: 'be_hocico' })], { mat: 'be_hocico' }));
  for (const s of [1, -1]) {
    ps.push(pua(ap(cab, [3.6, s * 0.6, -1.2]), ap(cab, [3.7, s * 0.6, -2.8]), 0.38));
    ps.push(esfera(...ap(cab, [2.9, s * 1.2, 0.8]), 0.6, { mat: muerte > 0.6 ? 'cu_ojo' : 'cu_ojo_brasa' }));
    // patas que cuelgan atrás
    const c0 = ap(cu, [-4, s * 2, -2]), p1 = ap(cu, [-8, s * 2.4, -4]);
    ps.push(palo(c0, p1, 0.6, { mat: 'be_hocico', r1: 0.4 }));
    ps.push(...ala({ raiz: ap(cu, [1.5, s * 3, 1.2]), adel: nor(mv(cu.m, [1, 0, 0])), der: mv(cu.m, [0, 1, 0]), arriba: mv(cu.m, [0, 0, 1]), lado: s, L1: 6.5, L2: 7.5, Ld: 10.5, abre, bate, lag, hueso: 'be_hocico', membrana: 'be_membrana_murc', grueso: 0.55, dedos: 4, rota: 0.2, semilla: s > 0 ? 2 : 5 }));
  }
  return ps;
}
bestia('murcielago_gigante', ['Murciélago gigante', 'Giant bat'], [2, 2], murcielago);

// ------------------------------------------------------------------ demonio alado (jefe)
/**
 * Un demonio de 150 de alto: patas de corvejón con pezuñas, tronco enorme con grietas de lava, cuernos que se
 * abren hacia adelante, brazos largos con garras, cola con punta de pala y alas de 230 de envergadura.
 */
function demonio(d: Dir, acc: Acc, f: number): Pieza[] | Escena {
  const W = mundo(d), ph = f / CUADROS[acc], P = 'be_demonio';
  let px = 0, py = 0, pz = 0, tp = 8, tr = 0, ty = 0, cab = 0, mand = 6, abre = 0.45, bate = 18, lag = 0, flojo = 0, muerte = 0, ruge = 0;
  const pie: V3[] = [[4, 15, 0], [-4, -15, 0]];
  let mano: V3[] = [[18, 34, 62], [16, -34, 60]];
  if (acc === 'quieto') {
    const b = Math.sin(ph * TAU); pz = b * 0.8; tp = 8 + b; bate = 24 + b * 6; abre = 0.62 + b * 0.04; mand = 6 + b * 3;
    mano = [[18, 34, 62 + b], [16, -34, 60 + b]];
  } else if (acc === 'caminar') {
    for (const [i, s] of [[0, 1], [1, -1]] as [number, number][]) { const st = paso(ph + (i ? 0.5 : 0), 44, 16, 0.58); pie[i] = [st.x, s * 15, st.z]; mano[i] = [16 - st.x * 0.55, s * 34, 60 + st.vuelo * 4]; }
    py = Math.sin(ph * TAU) * 3; tr = -Math.sin(ph * TAU) * 3; ty = Math.sin(ph * TAU) * 8; pz = -Math.abs(Math.sin(ph * TAU * 2 + 0.5)) * 3.5; tp = 12; bate = 16 + Math.sin(ph * TAU * 2) * 8; abre = 0.4;
  } else if (acc === 'atacar') {
    // zarpazo: el brazo derecho se carga atrás y arriba, barre en diagonal y sigue de largo
    ty = K([0, 14, 26, 30, -20, -34, -18, 0], f); tp = K([8, 4, 0, 0, 20, 26, 16, 8], f); pz = K([0, 0, -2, -3, -7, -8, -4, 0], f); px = K([0, -2, -4, -4, 6, 9, 4, 0], f);
    mano[0] = [K([18, 4, -10, -14, 50, 44, 24, 18], f), K([34, 44, 44, 40, 4, -24, 6, 34], f), K([62, 96, 128, 134, 70, 44, 50, 62], f)];
    mano[1] = [K([16, 22, 26, 26, 8, 0, 8, 16], f), K([-34, -30, -28, -28, -38, -40, -36, -34], f), K([60, 66, 72, 74, 60, 54, 56, 60], f)];
    abre = K([0.45, 0.6, 0.8, 0.85, 0.7, 0.6, 0.5, 0.45], f); bate = K([18, 30, 40, 42, 0, -8, 8, 18], f); mand = K([6, 10, 18, 22, 30, 24, 12, 6], f); cab = K([0, -6, -10, -10, 6, 8, 4, 0], f);
    pie[0] = [K([4, 4, 4, 4, 18, 20, 12, 4], f), 16, 0];
  } else if (acc === 'especial') {
    // rugido: se encoge, abre los brazos y las alas de golpe, echa la cabeza atrás y ruge con la garganta encendida
    ruge = K([0, 0, 0.2, 0.8, 1, 1, 0.7, 0.2], f);
    tp = K([8, 18, 22, -10, -16, -14, -6, 4], f); pz = K([0, -6, -9, 2, 3, 3, 1, 0], f); cab = K([0, 14, 18, -24, -32, -30, -18, -4], f); mand = K([6, 4, 4, 40, 46, 44, 30, 10], f);
    abre = K([0.45, 0.3, 0.25, 1, 1, 1, 0.85, 0.55], f); bate = K([18, 0, -6, 52, 58, 54, 40, 22], f); lag = K([0, 0, 0, -20, -8, 0, 4, 0], f);
    for (const [i, s] of [[0, 1], [1, -1]] as [number, number][]) mano[i] = [K([18, 24, 26, 10, 4, 4, 10, 16], f), s * K([34, 22, 20, 64, 72, 70, 56, 38], f), K([62, 70, 72, 118, 126, 124, 104, 70], f)];
  } else if (acc === 'morir') {
    // trastabilla atrás, cae de rodillas y se desploma hacia adelante con las alas sobre el cuerpo
    tp = K([8, -14, 10, 30, 55, 74, 82, 82], f); pz = K([0, 2, -14, -30, -42, -50, -52, -52], f); px = K([0, -6, -6, -2, 6, 12, 14, 14], f); cab = K([0, -30, 0, 15, 18, 10, 6, 6], f); mand = K([6, 40, 30, 20, 16, 14, 14, 14], f);
    abre = K([0.45, 0.9, 0.8, 0.6, 0.55, 0.6, 0.65, 0.65], f); bate = K([18, 50, 30, 10, -5, -18, -26, -26], f); flojo = K([0, 0, 0.3, 0.6, 0.8, 1, 1, 1], f); muerte = K([0, 0, 0.2, 0.4, 0.6, 0.85, 1, 1], f);
    mano[0] = [K([18, 6, 30, 50, 66, 74, 76, 76], f), K([34, 44, 36, 32, 34, 36, 38, 38], f), K([62, 90, 40, 20, 8, 4, 3, 3], f)];
    mano[1] = [K([16, 4, 26, 46, 60, 68, 70, 70], f), K([-34, -44, -36, -30, -30, -32, -34, -34], f), K([60, 86, 40, 18, 7, 4, 3, 3], f)];
    pie[0] = [K([4, 0, -2, -10, -24, -34, -38, -38], f), 16, K([0, 0, 0, 0, 0, 1, 2, 2], f)]; pie[1] = [K([-4, -8, -10, -16, -28, -36, -40, -40], f), -16, K([0, 0, 0, 0, 0, 1, 2, 2], f)];
  }
  const zc = 62 + pz;
  const pel = cmp(W, T([px, py, zc], Rz(ty * 0.35), Ry(tp * 0.3 + flojo * 10)));
  const tor = cmp(pel, T([0, 0, 6], Rz(ty * 0.65), Ry(tp * 0.7), Rx(tr)));
  const cabT = cmp(tor, T([12, 0, 50], Ry(cab + 6 - tp * 0.4)));
  const m = { mat: P };
  const ps: Pieza[] = [];
  const cs: Comp[] = [];
  const resp = 1 + ruge * 0.06;
  // tronco: pelvis, cintura, costillar enorme, pectorales, abdominales, trapecios, joroba y deltoides
  cs.push(bT(pel, [0, 0, 0], [11, 15, 10], m), bT(tor, [2, 0, 12], [9.5, 12.5, 9], m), bT(tor, [2, 0, 28], [15 * resp, 22 * resp, 15], m));
  for (const s of [1, -1]) {
    cs.push(bT(tor, [11, s * 9.5, 32], [7.5, 11, 8], m), bT(tor, [-4, s * 11, 42], [9, 10, 7], m), bT(tor, [0, s * 25, 41], [11, 10.5, 10.5], m));
    for (let i = 0; i < 3; i++) cs.push(bT(tor, [10, s * 4, 8 + i * 6], [3, 3.6, 3], { mat: P, k: 1.5 }));
  }
  cs.push(bT(tor, [-9, 0, 34], [12, 18, 14], m));
  cs.push(hT(tor, [2, 0, 40], [10, 0, 50], 7.5, 6, m));
  // cabeza: cráneo, frente pesada, pómulos y hocico
  cs.push(bT(cabT, [1, 0, 2], [7.5, 6.5, 7.5], m), bT(cabT, [6, 0, 5], [3, 6.8, 2.6], m), bT(cabT, [6.5, 0, -1], [4.5, 4.5, 4], m));
  for (const s of [1, -1]) cs.push(bT(cabT, [5, s * 4.5, 0.5], [3, 2.4, 3], m));
  const mandT = cmp(cabT, T([3, 0, -3.5], Ry(mand)));
  // brazos con bíceps y antebrazos gruesos (IK del hombro a la mano)
  const manos: [V3, V3][] = [];
  for (const [i, s] of [[0, 1], [1, -1]] as [number, number][]) {
    const h = ap(tor, [0, s * 27, 40]);
    const mw = ap(W, mano[i]); mw[2] = Math.max(mw[2], 3);
    const [codo, m2] = ik(h, mw, 30, 30, add(mv(tor.m, [-1, s * 0.5, -0.4]), [0, 0, 0]));
    manos.push([codo, m2]);
    ps.push(masa([bT(tor, [0, s * 25, 41], [11, 10.5, 10.5], m), hueso(h, codo, 7, 5.4, m), bulto(mez(h, codo, 0.45), [11, 7.4, 7.6], { eje: sub(codo, h), mat: P }), hueso(codo, m2, 5.6, 4, m), bulto(mez(codo, m2, 0.3), [10, 6.8, 6.4], { eje: sub(m2, codo), mat: P })], { mat: P, suave: 3 }));
  }
  // piernas de corvejón con muslos y pantorrillas
  const pezu: [V3, V3, V3, V3][] = [];
  for (const [i, s] of [[0, 1], [1, -1]] as [number, number][]) {
    const cad = ap(pel, [0, s * 10, -2]);
    let suelo: V3 = ap(W, pie[i]);
    const tob = add(suelo, mv(cmp(W, T([0, 0, 0], Rz(ty * 0.3))).m, [-7 - flojo * 6, 0, 15 - flojo * 10]));
    const [rod, t2] = ik(cad, tob, 31, 30, mv(pel.m, [1, 0, 0.1]));
    if (len(sub(t2, tob)) > 0.5) suelo = add(suelo, sub(t2, tob));
    pezu.push([cad, rod, t2, suelo]);
    ps.push(masa([bT(pel, [-2, s * 8, -1], [9, 8, 9], m), hueso(cad, rod, 9.5, 6.4, m), bulto(mez(cad, rod, 0.42), [15, 9.5, 9.5], { eje: sub(rod, cad), mat: P }), hueso(rod, t2, 5.8, 3.8, m), bulto(mez(rod, t2, 0.3), [10, 6, 5.8], { eje: sub(t2, rod), mat: P })], { mat: P, suave: 3 }));
  }
  ps.push(masa(cs, { mat: P, suave: 3 }));
  for (const [, , t2, suelo] of pezu) {
    const fw = nor([mv(pel.m, [1, 0, 0])[0], mv(pel.m, [1, 0, 0])[1], 0]);
    ps.push(masa([hueso(t2, add(suelo, [0, 0, 4]), 3.4, 3, m), bulto(add(add(suelo, fw, 2.5), [0, 0, 3]), [5.4, 4.4, 3.4], { eje: fw, mat: 'be_cuerno' })], { mat: P, suave: 1.5 }));
  }
  // manos con garras
  for (const [codo, m2] of manos) {
    const fw = nor(sub(m2, codo)), lat = nor(cruz(fw, [0, 0, 1]));
    ps.push(masa([bulto(add(m2, fw, 3), [5, 3.6, 2.6], { eje: fw, mat: P })], m));
    for (const k of [-1.5, -0.5, 0.5, 1.5]) { const b0 = add(add(m2, fw, 6.5), lat, k * 2.1); ps.push(pua(b0, add(add(add(b0, fw, 8), lat, k * 1.4), [0, 0, -3]), 1.1, 'be_cuerno')); }
  }
  // mandíbula, colmillos, garganta encendida, ojos y cuernos
  ps.push(masa([hT(mandT, [0, 0, 0], [8, 0, -1], 4.2, 3, m), bT(mandT, [2, 0, -1], [5, 5, 3], m)], { mat: P, suave: 1.5 }));
  const lava = muerte > 0.85 ? 'be_lava_fria' : 'cu_lava';
  ps.push(masa([bT(mandT, [4.5, 0, 1.6], [4.5, 3, 1.4], { mat: lava })], { mat: lava }));
  for (const s of [1, -1]) {
    ps.push(pua(ap(mandT, [7, s * 2.2, 1.2]), ap(mandT, [7.2, s * 2.2, 5.5]), 1));
    ps.push(pua(ap(cabT, [9.5, s * 2.4, -2.6]), ap(cabT, [9.8, s * 2.4, -6.8]), 0.95));
    ps.push(elipsoide(...ap(cabT, [8.2, s * 3, 3.2]), 1.3, 1.8, 0.9, { mat: muerte > 0.6 ? 'cu_ojo' : 'cu_ojo_brasa' }));
    const c0 = ap(cabT, [2, s * 5, 7]), c1 = ap(cabT, [0, s * 13, 12]), c2 = ap(cabT, [6, s * 20, 20]), c3 = ap(cabT, [16, s * 21, 30]);
    ps.push(masa([hueso(c0, c1, 3.4, 2.8, { mat: 'be_cuerno' }), hueso(c1, c2, 2.8, 1.8, { mat: 'be_cuerno' }), hueso(c2, c3, 1.8, 0.3, { mat: 'be_cuerno' })], { mat: 'be_cuerno', suave: 1 }));
    // alas enormes
    ps.push(...ala({ raiz: ap(tor, [-11, s * 9, 42]), adel: nor(mv(tor.m, [1, 0, 0.2])), der: mv(cmp(W, T([0, 0, 0], Rz(ty * 0.6))).m, [0, 1, 0]), arriba: [0, 0, 1], lado: s, L1: 30, L2: 34, Ld: 50, abre, bate, lag, hueso: P, membrana: 'be_membrana_roja', grueso: 2.6, carne: true, dedos: 5, rota: 0.25, semilla: s > 0 ? 7 : 8 }));
  }
  // grietas de lava en el pecho, la espalda, los muslos y los antebrazos
  ps.push(...grietas(tor, [2, 0, 28], [15 * resp, 22 * resp, 15], 10, 11, lava, { largo: 6, grueso: 1.15 }));
  ps.push(...grietas(tor, [-9, 0, 34], [12, 18, 14], 5, 13, lava, { lado: 1, grueso: 1.1 }));
  ps.push(...grietas(tor, [-4, 0, 42], [9, 21, 7], 4, 19, lava, { grueso: 1 }));
  for (const [cad, rod] of pezu) ps.push(...grietas({ o: mez(cad, rod, 0.42), m: marcoEje(sub(rod, cad)) }, [0, 0, 0], [15, 9.5, 9.5], 3, 17, lava, { grueso: 1 }));
  // cola con punta de pala
  const cola: Comp[] = [];
  let prev = ap(pel, [-9, 0, 2]);
  for (let i = 1; i <= 5; i++) {
    const t = i / 5, q = ap(W, [px - 10 - t * 50, py + Math.sin(ph * TAU - t * 2.4) * 8 * t, Math.max(2.5, (zc - 2) * (1 - t * 0.95) - flojo * 20 * t)]);
    cola.push(hueso(prev, q, 5 - t * 3.2, 4.6 - t * 3.4, m)); prev = q;
  }
  ps.push(masa(cola, { mat: P, suave: 1.6 }));
  const dirC = nor(sub(prev, cola[cola.length - 1].f === 'hueso' ? (cola[cola.length - 1] as Extract<Comp, { f: 'hueso' }>).a : prev));
  ps.push(poliedro([add(prev, [0, 0, 0.8]), add(prev, [0, 0, -0.8]), add(add(prev, dirC, 9), [0, 0, 0]), add(add(prev, dirC, 3), nor(cruz(dirC, [0, 0, 1])), 4.5), add(add(prev, dirC, 3), nor(cruz(dirC, [0, 0, 1])), -4.5)], { mat: 'be_cuerno' }));
  const garganta = ap(mandT, [6, 0, 3]);
  if (muerte > 0.85) return ps;
  return { piezas: ps, resplandor: { c: ruge > 0.3 ? garganta : ap(tor, [16, 0, 28]), r: ruge > 0.3 ? 40 : 20, color: '#ff5a18' } };
}
bestia('demonio_alado', ['Demonio alado', 'Winged demon'], [4, 4], demonio, ['ruge', 'roar']);

// ------------------------------------------------------------------ dragón de huesos (jefe)
/** Cadena de tramos desde `o`: cada tramo con su cabeceo (+ arriba) y guiñada en grados; `atras` la tiende hacia -x. */
function cadena(o: V3, n: number, L: (t: number) => number, cab: (t: number) => number, gui: (t: number) => number, atras = false): V3[] {
  const pts = [o];
  let p = o;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, a = rad(cab(t)), b = rad(gui(t));
    p = add(p, [(atras ? -1 : 1) * Math.cos(a) * Math.cos(b), Math.sin(b) * Math.cos(a), Math.sin(a)], L(t));
    pts.push(p);
  }
  return pts;
}
/**
 * Un dragón muerto que sigue andando: cráneo largo con cuernos, cuello y cola de vértebras con ondas que viajan,
 * costillar abierto con un corazón de ectoplasma, patas de hueso y alas de dedos largos con la membrana rota.
 */
function dragon(d: Dir, acc: Acc, f: number): Pieza[] | Escena {
  const W = mundo(d), ph = f / CUADROS[acc];
  const H = 'be_hueso_viejo';
  let av = 0, z = 0, pitch = -3, roll = 0, cuello = 0, cabP = 0, mand = 8, abre = 0.55, bate = 22, lag = 0, flojo = 0, muerte = 0, aliento = 0, onda = 1, colaAlza = 0;
  if (acc === 'quieto') { const b = Math.sin(ph * TAU); z = b * 0.8; cuello = b * 3; mand = 8 + b * 4; bate = 22 + b * 5; }
  else if (acc === 'caminar') { z = -Math.abs(Math.sin(ph * TAU * 2)) * 2.5; roll = Math.sin(ph * TAU) * 3; pitch = -3 + Math.sin(ph * TAU * 2) * 1.5; onda = 1.8; bate = 18 + Math.sin(ph * TAU * 2) * 6; abre = 0.45; }
  else if (acc === 'atacar') {
    cuello = K([0, -14, -22, 18, 30, 24, 8, 0], f); cabP = K([0, -10, -16, 20, 30, 18, 6, 0], f); mand = K([8, 14, 26, 50, 52, 4, 6, 8], f); av = K([0, -4, -8, 6, 14, 12, 5, 0], f); pitch = K([-3, -8, -12, 4, 8, 6, 0, -3], f);
    abre = K([0.55, 0.7, 0.9, 0.8, 0.6, 0.5, 0.5, 0.55], f); bate = K([22, 40, 55, 0, -10, 5, 18, 22], f);
  } else if (acc === 'especial') {
    // aliento de ectoplasma: alza la cabeza, toma aire y escupe un chorro que barre el suelo
    cuello = K([0, -20, -28, 10, 16, 16, 12, 2], f); cabP = K([0, -22, -30, 14, 20, 22, 16, 2], f); mand = K([8, 20, 30, 58, 62, 62, 50, 12], f); pitch = K([-3, -12, -16, 0, 2, 2, 0, -3], f);
    abre = K([0.55, 0.95, 1, 0.9, 0.8, 0.8, 0.7, 0.55], f); bate = K([22, 50, 60, 10, 20, 15, 18, 22], f); aliento = K([0, 0, 0.1, 0.55, 1, 1, 0.6, 0], f); lag = K([0, -10, -16, 20, 10, 0, 0, 0], f);
  } else if (acc === 'morir') {
    // las patas ceden, el cuerpo cae de costado, el cuello y la cola se desploman y los ojos se apagan
    z = K([0, 2, -8, -18, -26, -30, -31, -31], f); roll = K([0, 0, -8, -25, -48, -62, -66, -66], f); pitch = K([-3, -10, 2, 6, 6, 4, 3, 3], f); cuello = K([0, -18, 10, 30, 42, 48, 50, 50], f); cabP = K([0, -15, 10, 20, 26, 28, 28, 28], f);
    mand = K([8, 50, 30, 24, 30, 34, 34, 34], f); abre = K([0.55, 1, 0.8, 0.6, 0.5, 0.45, 0.42, 0.42], f); bate = K([22, 55, 30, 0, -20, -36, -42, -42], f); flojo = K([0, 0, 0.2, 0.5, 0.8, 1, 1, 1], f); muerte = K([0, 0, 0.2, 0.45, 0.7, 0.9, 1, 1], f); onda = K([1, 1, 0.6, 0.3, 0, 0, 0, 0], f); colaAlza = K([0, 0, -8, -16, -24, -30, -32, -32], f);
  }
  const zb = 56;
  const cuerpo = cmp(W, T([av, 0, zb + z], Ry(pitch), Rx(roll)));
  const ps: Pieza[] = [];
  const bone = (a: V3, b: V3, r0: number, r1: number, mat = H) => ps.push(palo(a, b, r0, { mat, r1 }));
  const nudo = (p: V3, r: number, mat = H) => ps.push(esfera(...p, r, { mat }));
  // columna con espinas dorsales
  const columna: V3[] = [];
  for (let i = 0; i <= 10; i++) {
    const x = 30 - i * 6.4, zz = 4 + Math.sin((i / 10) * Math.PI) * 4;
    columna.push(ap(cuerpo, [x, 0, zz]));
    ps.push(elipEjes(ap(cuerpo, [x, 0, zz]), [2.8, 3.4, 3], ejesDe(cuerpo), H, (i % 2) * -0.05));
    ps.push(pua(ap(cuerpo, [x, 0, zz + 2]), ap(cuerpo, [x - 4, 0, zz + 10 - Math.abs(i - 4) * 0.6]), 1.4, H));
  }
  for (let i = 0; i < 10; i++) bone(columna[i], columna[i + 1], 1.6, 1.6);
  // costillar: siete pares que bajan curvos hasta el esternón
  for (let i = 0; i < 7; i++) {
    const x = 22 - i * 6.2, prof = 34 - Math.abs(i - 2.5) * 3.2, ancho = 21 - Math.abs(i - 2.5) * 1.6;
    for (const s of [1, -1]) {
      const p0 = ap(cuerpo, [x, s * 2.5, 6]), p1 = ap(cuerpo, [x - 3, s * ancho, -2]), p2 = ap(cuerpo, [x - 3, s * ancho * 0.85, -prof * 0.6]), p3 = ap(cuerpo, [x - 1, s * 4.5, -prof]);
      bone(p0, p1, 1.5, 1.4); bone(p1, p2, 1.4, 1.2); if (i < 5) bone(p2, p3, 1.2, 0.9);
      nudo(p1, 1.5); nudo(p2, 1.3);
    }
  }
  ps.push(masa([hT(cuerpo, [20, 0, -32], [-6, 0, -30], 3, 2, { mat: H }), bT(cuerpo, [14, 0, -33], [8, 3, 4], { mat: H })], { mat: H, suave: 2 }));
  // corazón de ectoplasma (se apaga al morir)
  const corazon = ap(cuerpo, [6, 0, -14]);
  if (muerte < 0.95) ps.push(esfera(...corazon, 7 * (1 - muerte * 0.6) * (1 + Math.sin(ph * TAU * 2) * 0.08), { mat: 'cu_ectoplasma', tono: -muerte * 0.4 }));
  // pelvis y escápulas
  ps.push(masa([bT(cuerpo, [-32, 0, 2], [9, 13, 6], { mat: H }), bG(cuerpo, [-28, 10, -2], [7, 3, 9], [Rx(30)], { mat: H }), bG(cuerpo, [-28, -10, -2], [7, 3, 9], [Rx(-30)], { mat: H })], { mat: H, suave: 2.5 }));
  for (const s of [1, -1]) ps.push(masa([bG(cuerpo, [20, s * 14, 2], [10, 2, 7], [Ry(-25), Rx(s * 25)], { mat: H })], { mat: H }));
  // patas: húmero, radio, metacarpos y garras (adelante); fémur, tibia, metatarso (atrás)
  const fases = { dI: 0.25, dD: 0.75, tI: 0, tD: 0.5 };
  for (const del of [true, false]) for (const s of [1, -1]) {
    const raiz = ap(cuerpo, del ? [22, s * 16, -6] : [-32, s * 14, -4]);
    const fase = ph * (acc === 'caminar' ? 1 : 0) + (del ? (s < 0 ? fases.dI : fases.dD) : (s < 0 ? fases.tI : fases.tD));
    const st = acc === 'caminar' ? paso(fase, 40, 13, 0.62) : { x: 0, z: 0, vuelo: 0 };
    let pie: V3 = ap(W, [(del ? 30 : -30) + st.x + av * (del ? 0.6 : 0.2), s * 24, st.z]);
    if (flojo > 0) pie = mez(pie, ap(cuerpo, del ? [34, s * 30, -40] : [-22, s * 30, -40]), flojo);
    pie[2] = Math.max(pie[2], 2);
    const tob = add(pie, mv(cuerpo.m, del ? [-3 + st.vuelo * 4, 0, 10] : [-9, 0, 15]));
    const [rod, t2] = ik(raiz, tob, del ? 30 : 32, del ? 28 : 30, mv(cuerpo.m, del ? [-1, 0.2 * s, 0] : [1, 0.2 * s, 0]));
    bone(raiz, rod, 3.2, 2.4); bone(rod, t2, 2.4, 1.8); bone(t2, pie, 1.7, 1.4);
    nudo(raiz, 4); nudo(rod, 3.2); nudo(t2, 2.4);
    const fw = nor([mv(cuerpo.m, [1, 0, 0])[0], mv(cuerpo.m, [1, 0, 0])[1], 0]), lat = nor(cruz(fw, [0, 0, 1]));
    for (const k of [-1, 0, 1]) { const b0 = add(pie, lat, k * 2.2); ps.push(pua(b0, add(add(add(b0, fw, 8), lat, k * 2.4), [0, 0, -1.5]), 1.2, 'be_cuerno')); }
  }
  // cuello de nueve vértebras y cráneo
  const t0 = ph * TAU;
  const base = ap(cuerpo, [30, 0, 6]);
  const ncu = cadena([0, 0, 0], 9, () => 7.6, (t) => lerp(52, -6, t) - cuello * (0.3 + t) + (acc === 'morir' ? -muerte * 60 * t : 0), (t) => Math.sin(t0 - t * 3) * 8 * onda * t);
  const npts = ncu.map((q) => add(base, mv(cuerpo.m, q)));
  for (let i = 0; i < 9; i++) { bone(npts[i], npts[i + 1], 2.2, 1.9); ps.push(elipEjes(npts[i + 1], [2.6, 3, 2.8], ejesDe({ o: [0, 0, 0], m: marcoEje(sub(npts[i + 1], npts[i])) }), H)); ps.push(pua(npts[i + 1], add(add(npts[i + 1], [0, 0, 6 - i * 0.3]), sub(npts[i], npts[i + 1]), 0.5), 1, H)); }
  const ult = nor(sub(npts[9], npts[8]));
  const yawC = (Math.atan2(ult[1], ult[0]) * 180) / Math.PI, pitC = (Math.atan2(ult[2], Math.hypot(ult[0], ult[1])) * 180) / Math.PI;
  const cr = T(npts[9], Rz(yawC), Ry(-pitC + 18 + cabP));
  const cab = { o: cr.o, m: cr.m };
  // ojo: el marco del cráneo ya está en el mundo (rumbo incluido en la columna)
  const crC: Comp[] = [bT(cab, [3, 0, 2], [8, 7, 6.5], { mat: H }), hT(cab, [6, 0, 0], [26, 0, -3], 5, 2.8, { mat: H }), bT(cab, [10, 0, 4], [4, 7, 2.4], { mat: H })];
  for (const s of [1, -1]) crC.push(bT(cab, [14, s * 4.2, 0.5], [6, 1.6, 2.6], { mat: H }));
  ps.push(masa(crC, { mat: H, suave: 2 }));
  const ojoM = muerte > 0.7 ? 'negro' : 'cu_ojo_hielo';
  for (const s of [1, -1]) {
    ps.push(elipsoide(...ap(cab, [9.5, s * 5.6, 3.4]), 2.4, 1.6, 1.8, { mat: 'negro' }));
    ps.push(esfera(...ap(cab, [10.4, s * 6, 3.4]), 1.2, { mat: ojoM }));
    const c0 = ap(cab, [2, s * 5, 6]), c1 = ap(cab, [-8, s * 9, 9]), c2 = ap(cab, [-18, s * 10, 6]);
    ps.push(masa([hueso(c0, c1, 2.4, 1.7, { mat: 'be_cuerno' }), hueso(c1, c2, 1.7, 0.2, { mat: 'be_cuerno' })], { mat: 'be_cuerno', suave: 0.8 }));
    ps.push(pua(ap(cab, [-2, s * 3, 5]), ap(cab, [-12, s * 4, 2]), 1.4, 'be_cuerno'));
    for (let k = 0; k < 4; k++) ps.push(pua(ap(cab, [24 - k * 4, s * 2.4, -4.8]), ap(cab, [24 - k * 4, s * 2.4, -8]), 0.7, 'cu_hueso'));
  }
  const mandT = cmp(cab, T([4, 0, -3], Ry(mand)));
  ps.push(masa([hT(mandT, [0, 3.5, 0], [21, 1.5, -1.2], 2, 1.4, { mat: H }), hT(mandT, [0, -3.5, 0], [21, -1.5, -1.2], 2, 1.4, { mat: H })], { mat: H, suave: 1.5 }));
  for (const s of [1, -1]) for (let k = 0; k < 4; k++) ps.push(pua(ap(mandT, [19 - k * 4, s * 1.8, 0]), ap(mandT, [19 - k * 4, s * 1.8, 3.2]), 0.65, 'cu_hueso'));
  // cola de dieciséis vértebras con la onda que viaja hacia la punta
  const cbase = ap(cuerpo, [-36, 0, 4]);
  const ccu = cadena([0, 0, 0], 16, (t) => 7.4 - t * 2.4, (t) => -14 - t * 10 + colaAlza * t, (t) => Math.sin(t0 * (acc === 'caminar' ? 1 : 1) - t * 4.5) * 16 * onda * t, true);
  const cpts = ccu.map((q) => { const w = add(cbase, mv(cuerpo.m, q)); w[2] = Math.max(w[2], 2.4 - 0.1); return w; });
  for (let i = 0; i < 16; i++) { const r = 2.4 - i * 0.11; bone(cpts[i], cpts[i + 1], r * 0.7, r * 0.65); ps.push(elipEjes(cpts[i + 1], [r * 1.2, r * 1.3, r * 1.2], ejesDe({ o: [0, 0, 0], m: marcoEje(sub(cpts[i + 1], cpts[i])) }), H)); if (i % 2 === 0) ps.push(pua(cpts[i + 1], add(cpts[i + 1], [0, 0, 5 - i * 0.25]), r * 0.6, H)); }
  ps.push(pua(cpts[16], add(cpts[16], mv(cuerpo.m, [-10, 0, 0])), 2, 'be_cuerno'));
  // alas de dedos largos con la membrana rota
  for (const s of [1, -1]) ps.push(...ala({ raiz: ap(cuerpo, [18, s * 8, 10]), adel: nor(mv(cuerpo.m, [1, 0, 0.15])), der: mv(cuerpo.m, [0, 1, 0]), arriba: mv(cuerpo.m, [0, 0, 1]), lado: s, L1: 40, L2: 44, Ld: 66, abre, bate, lag, hueso: H, membrana: 'be_membrana', grueso: 2.2, dedos: 5, rota: 0.4, semilla: s > 0 ? 11 : 12 }));
  // aliento: un chorro de ectoplasma que sale de la boca y se abre al tocar el suelo
  const boca = ap(mandT, [16, 0, 2]);
  if (aliento > 0) {
    const dirB = nor(add(W.m[0], [0, 0, -0.32]));
    for (let k = 0; k < 20; k++) {
      const u = k / 19, dist = u * 150 * aliento;
      const q = add(boca, dirB, dist);
      q[2] = Math.max(q[2], 5 + u * 8);
      const r = (3 + u * 11) * (0.7 + 0.3 * hr(k + f * 3));
      ps.push(esfera(...add(q, [(hr(k + 40) - 0.5) * u * 10, (hr(k + 41) - 0.5) * u * 10, 0]), r, { mat: 'cu_ectoplasma', tono: -u * 0.25 }));
      if (k > 6 && k % 2) for (const s of [1, -1]) ps.push(esfera(...add(add(q, W.m[1], s * u * 16 * (0.6 + hr(k + s) * 0.6)), [0, 0, -u * 3]), r * 0.6, { mat: 'cu_ectoplasma', tono: -0.15 - u * 0.2 }));
    }
    return { piezas: ps, resplandor: { c: add(boca, mv(W.m, [40, 0, -20])), r: 90, color: '#80e0ff' } };
  }
  return muerte > 0.9 ? ps : { piezas: ps, resplandor: { c: corazon, r: 34, color: '#70d0f0' } };
}
bestia('dragon_oseo', ['Dragón de huesos', 'Bone dragon'], [6, 6], dragon, ['aliento', 'breath']);

// ------------------------------------------------------------------ cangrejo de cripta
/** Cangrejo pálido de las criptas: caparazón ancho con una calavera grabada, ojos en pedúnculos, una pinza enorme y anda de costado. */
function cangrejo(d: Dir, acc: Acc, f: number): Pieza[] | Escena {
  const W = mundo(d), ph = f / CUADROS[acc], C = 'be_caparazon', Q = { mat: C };
  let z = 0, roll = 0, pitch = 0, lado = 0, pinza = 0.3, brazo = 0, rizo = 0, muerte = 0;
  if (acc === 'quieto') { const b = Math.sin(ph * TAU); z = b * 0.4; pinza = 0.3 + b * 0.25; brazo = b * 4; }
  else if (acc === 'caminar') { z = -Math.abs(Math.cos(ph * TAU)) * 0.6; roll = Math.sin(ph * TAU * 2) * 3; lado = Math.sin(ph * TAU) * 1.2; }
  else if (acc === 'atacar') { pinza = K([0.3, 0.9, 1, 1, 0, 0, 0.2, 0.3], f); brazo = K([0, 18, 30, 34, -6, -10, -2, 0], f); pitch = K([0, -4, -8, -8, 6, 8, 3, 0], f); }
  else if (acc === 'morir') { z = K([0, 2, 0, -2, -4, -5, -5.5, -5.5], f); roll = K([0, 10, 40, 90, 140, 170, 180, 180], f); rizo = K([0, 0.2, 0.4, 0.6, 0.8, 1, 1, 1], f); pinza = 0.6; brazo = K([0, 20, 10, 0, -10, -20, -20, -20], f); muerte = K([0, 0, 0.2, 0.5, 0.8, 1, 1, 1], f); }
  const zb = 13 + (acc === 'morir' ? K([0, 3, 4, 3, 1, 0, 0, 0], f) : 0);
  const cuerpo = cmp(W, T([0, lado, zb + z], Ry(pitch), Rx(roll)));
  const ps: Pieza[] = [];
  const cs: Comp[] = [bT(cuerpo, [0, 0, 0], [14, 20, 6.5], Q), bT(cuerpo, [3, 0, 3], [9, 14, 4], { mat: C, tono: 0.05 }), bT(cuerpo, [-4, 0, -3], [10, 15, 4], { mat: 'be_quitina_parda' })];
  // calavera grabada en el lomo: cuencas y nariz hundidas en tono oscuro
  for (const s of [1, -1]) cs.push(bT(cuerpo, [3, s * 4, 6.4], [2.6, 2.4, 1], { mat: 'be_junta', k: 0.4 }));
  cs.push(bT(cuerpo, [-1, 0, 6.6], [1.4, 1.2, 0.8], { mat: 'be_junta', k: 0.4 }));
  for (let k = -2; k <= 2; k++) cs.push(bT(cuerpo, [-4.5, k * 1.9, 6], [1, 0.8, 0.8], { mat: 'be_junta', k: 0.3 }));
  for (const s of [1, -1]) for (let k = 0; k < 4; k++) cs.push(bT(cuerpo, [8 - k * 5, s * 18.5, 1], [2.2, 2, 2], { mat: C, k: 0.6 }));
  ps.push(masa(cs, { mat: C, suave: 1.6 }));
  for (const s of [1, -1]) {
    // ojos en pedúnculos
    const p0 = ap(cuerpo, [12, s * 3, 4]), p1 = ap(cuerpo, [14, s * 4, 10]);
    ps.push(palo(p0, p1, 0.8, { mat: C }), esfera(...p1, 1.4, { mat: muerte > 0.6 ? 'cu_ojo' : 'cu_ojo_verde' }));
    // pinzas: la derecha enorme
    const g = s > 0 ? 1.6 : 1, h0 = ap(cuerpo, [12, s * 12, 0]);
    const br = cmp(cuerpo, T([12, s * 12, 0], Rz(s * (25 - brazo * 0.4)), Ry(-20 - brazo * 0.8)));
    const codo = ap(br, [8 * g, 0, 0]);
    const ant = cmp(br, T([8 * g, 0, 0], Rz(-s * 55), Ry(30 + brazo * 0.5)));
    const mano = cmp(ant, T([5 * g, 0, 0], Ry(-15)));
    const dMov = cmp(mano, T([7 * g, s * 1.2 * g, 1 * g], Ry(-pinza * 35)));
    ps.push(masa([hueso(h0, codo, 2.2 * g, 2 * g, Q), bulto(codo, [2.2 * g, 2.2 * g, 2.2 * g], Q), hueso(codo, ap(ant, [5 * g, 0, 0]), 2 * g, 2.6 * g, Q),
      bT(mano, [3 * g, 0, 0], [5.5 * g, 3.4 * g, 3.8 * g], Q), hT(mano, [6 * g, 0, -1.2 * g], [12 * g, 0, -1.6 * g], 1.6 * g, 0.4 * g, { mat: 'be_quitina_parda' }),
      hT(dMov, [0, 0, 0], [6 * g, 0, -0.4 * g], 1.4 * g, 0.3 * g, { mat: 'be_quitina_parda' })], { mat: C, suave: 0.9 }));
  }
  const patas: Pata[] = [];
  for (const s of [1, -1]) for (let i = 0; i < 4; i++) {
    const a = rad(60 + i * 25), R = 32;
    patas.push({ cadera: [(7 - i * 4.5), s * 15, -1], reposo: [Math.cos(a) * R * 0.7, s * Math.sin(a) * R, 0], l1: 14, l2: 18, fase: (i % 2 === 0) === (s < 0) ? 0 : 0.5, r: 1.6 });
  }
  // las patas dan el paso en el sentido de la marcha (el juego lo mueve hacia donde mira): de costado patinaban de lado
  ps.push(...patasArac(W, cuerpo, patas, { paso: PASO_CANGREJO, alza: 5, mat: C, junta: 'be_quitina_parda', caminar: acc === 'caminar', ph, rizo }));
  return ps;
}
bestia('cangrejo_cripta', ['Cangrejo de cripta', 'Crypt crab'], [3, 3], cangrejo);

/**
 * Zancada de caminar de las bestias que pisan: unidades del mundo que avanza el cuerpo en un ciclo de 8 cuadros (lo que
 * retrocede el pie apoyado dividido por la parte del ciclo que apoya), a escala 1. Así el juego mueve la animación a
 * velocidad / zancada y las patas no patinan (como `zancada()` de figura.ts para los humanoides).
 */
export const ZANCADA_BESTIA: Record<string, number> = {
  lobo_sombrio: (PASO_CUAD * LOBO.S * LOBO.pata) / APOYO_CUAD,
  jabali_demonio: (PASO_CUAD * JABALI.S * JABALI.pata) / APOYO_CUAD,
  perro_infernal: (PASO_CUAD * PERRO.S * PERRO.pata) / APOYO_CUAD,
  arana_reina: (PASO_ARANA * REINA.S) / APOYO_ARAC,
  arana_cueva: (PASO_ARANA * CUEVA.S) / APOYO_ARAC,
  cangrejo_cripta: PASO_CANGREJO / APOYO_ARAC,
};
