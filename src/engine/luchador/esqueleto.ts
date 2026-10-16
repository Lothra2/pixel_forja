import type { LuchadorFicha } from './ficha';

/**
 * El esqueleto del luchador en 3D. Ejes: x hacia adelante (mira a la derecha de la pantalla), y hacia arriba, z hacia la
 * cámara. El piso es y = 0 y el pivote del personaje es x = 0. La cámara mira de lado y sin inclinación, como en SF2: lo
 * que da el aire de 3/4 es que la cadera y el pecho giran hacia la cámara (`giro`).
 *
 * "cerca" es el lado de la cámara (el lado derecho del luchador cuando mira a la derecha). En guardia, el brazo y la
 * pierna de adelante son los de lejos, como Ryu.
 */
export type V3 = [number, number, number];

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Una base ortonormal: f adelante, u arriba, r a la derecha del luchador (hacia la cámara cuando mira de lado). */
export interface Base { f: V3; u: V3; r: V3 }

const rad = (g: number) => (g * Math.PI) / 180;

/**
 * La base de un segmento del cuerpo: `giro` lo voltea hacia la cámara (0 de perfil, 90 de frente), `inclina` echa el
 * eje de arriba hacia adelante (+) o hacia atrás (-), y `ladeo` lo inclina hacia el lado de la cámara (+).
 */
export function base(giro: number, inclina = 0, ladeo = 0): Base {
  const y = rad(giro), l = rad(inclina), s = rad(ladeo);
  const f0: V3 = [Math.cos(y), 0, Math.sin(y)], r0: V3 = [-Math.sin(y), 0, Math.cos(y)], u0: V3 = [0, 1, 0];
  const u1 = add(mul(u0, Math.cos(l)), mul(f0, Math.sin(l))), f1 = add(mul(f0, Math.cos(l)), mul(u0, -Math.sin(l)));
  const u = norm(add(mul(u1, Math.cos(s)), mul(r0, Math.sin(s)))), r = norm(add(mul(r0, Math.cos(s)), mul(u1, -Math.sin(s))));
  return { f: f1, u, r };
}

/** Pasa un punto de la base a coordenadas del mundo. */
export const enBase = (o: V3, b: Base, x: number, y: number, z: number): V3 => add(o, add(mul(b.f, x), add(mul(b.u, y), mul(b.r, z))));

/** Las medidas del luchador, sacadas del alto y la contextura. */
export interface Medidas {
  H: number;
  cabeza: number;
  tobillo: number;
  muslo: number;
  canilla: number;
  brazo: number;
  antebrazo: number;
  pie: number;
  /** de la cadera al centro del pecho */
  columna: number;
  hombros: number;
  caderas: number;
  /** cuánto más gruesos los músculos (1 = atlético) */
  grosor: number;
}

export function medidas(f: LuchadorFicha): Medidas {
  const H = f.altura, c = f.contextura;
  return {
    H,
    cabeza: H / 7,
    tobillo: H * 0.035,
    canilla: H * 0.245,
    muslo: H * 0.245,
    brazo: H * 0.2,
    antebrazo: H * 0.175,
    pie: H * 0.135,
    columna: H * 0.19,
    hombros: H * (0.11 + 0.035 * c),
    caderas: H * 0.05,
    grosor: 0.9 + 0.45 * c,
  };
}

/** Un brazo: dónde va la mano (el centro del puño) y hacia dónde apunta el codo. */
export interface BrazoPose { mano: V3; codo: V3; puño?: boolean; /** giro del puño sobre el antebrazo, grados */ muñeca?: number }
/** Una pierna: dónde va el tobillo, hacia dónde apunta la rodilla, y el pie. */
export interface PiernaPose { tobillo: V3; rodilla: V3; /** hacia dónde mira el pie (grados, 0 adelante, + hacia la cámara) */ pie?: number; /** la punta baja (+) o sube (-), grados */ punta?: number }

export type Cara = 'serio' | 'grito' | 'dolor';

/** Una pose completa. Todo en pixeles: x adelante, y arriba desde el piso, z hacia la cámara. */
export interface Pose {
  /** centro de la cadera */
  cadera: V3;
  giroCadera: number;
  giroPecho: number;
  /** inclinación de la columna: + hacia adelante */
  inclina: number;
  /** ladeo del pecho hacia la cámara */
  ladeo?: number;
  cabeza: { giro: number; inclina: number };
  cerca: { brazo: BrazoPose; pierna: PiernaPose };
  lejos: { brazo: BrazoPose; pierna: PiernaPose };
  cara: Cara;
  /** el viento en la tela suelta (las puntas del cinturón y las colas del cintillo), una fase en radianes */
  viento?: number;
}

/** Las articulaciones ya resueltas, en el mundo. */
export interface Articulaciones {
  pelvis: V3;
  basePelvis: Base;
  pecho: V3;
  basePecho: Base;
  cuello: V3;
  cabeza: V3;
  baseCabeza: Base;
  hombro: { cerca: V3; lejos: V3 };
  codo: { cerca: V3; lejos: V3 };
  muñeca: { cerca: V3; lejos: V3 };
  puño: { cerca: V3; lejos: V3 };
  cadera: { cerca: V3; lejos: V3 };
  rodilla: { cerca: V3; lejos: V3 };
  tobillo: { cerca: V3; lejos: V3 };
  punta: { cerca: V3; lejos: V3 };
  talon: { cerca: V3; lejos: V3 };
}

/** IK de dos huesos en 3D: el punto del medio, doblado hacia `polo`. */
export function ik2(a: V3, t: V3, l1: number, l2: number, polo: V3): { medio: V3; fin: V3 } {
  let d = sub(t, a);
  let dl = len(d);
  const max = l1 + l2 - 0.01, min = Math.abs(l1 - l2) + 0.01;
  if (dl > max) { d = mul(d, max / dl); dl = max; }
  if (dl < min) { d = mul(norm(d), min); dl = min; }
  const dir = norm(d);
  const cosA = (l1 * l1 + dl * dl - l2 * l2) / (2 * l1 * dl);
  const A = Math.acos(Math.max(-1, Math.min(1, cosA)));
  const p = sub(polo, a);
  let perp = sub(p, mul(dir, dot(p, dir)));
  if (len(perp) < 1e-4) perp = cross(dir, [0, 0, 1]);
  perp = norm(perp);
  const medio = add(a, add(mul(dir, l1 * Math.cos(A)), mul(perp, l1 * Math.sin(A))));
  return { medio, fin: add(a, d) };
}

/** Resuelve la pose: de la cadera al pecho, la cabeza, y los brazos y las piernas por IK. */
export function resolver(m: Medidas, p: Pose): Articulaciones {
  const bp = base(p.giroCadera, p.inclina * 0.35);
  const bc = base(p.giroPecho, p.inclina, p.ladeo ?? 0);
  const pelvis = p.cadera;
  const pecho = add(pelvis, mul(bc.u, m.columna));
  const cuello = enBase(pecho, bc, 0.4, m.H * 0.125, 0);
  const bh = base(p.giroPecho * 0.35 + p.cabeza.giro, p.inclina * 0.3 + p.cabeza.inclina);
  const cabeza = enBase(cuello, bh, 0.8, m.cabeza * 0.56, 0);
  const hombro = {
    cerca: enBase(pecho, bc, -0.5, m.H * 0.085, m.hombros),
    lejos: enBase(pecho, bc, -0.5, m.H * 0.085, -m.hombros),
  };
  const caderaJ = { cerca: enBase(pelvis, bp, 0, -m.H * 0.01, m.caderas), lejos: enBase(pelvis, bp, 0, -m.H * 0.01, -m.caderas) };
  const brazo = (lado: 'cerca' | 'lejos') => {
    const b = p[lado].brazo;
    const sol = ik2(hombro[lado], b.mano, m.brazo, m.antebrazo + m.H * 0.03, b.codo);
    const dirAnte = norm(sub(sol.fin, sol.medio));
    const muñeca = sub(sol.fin, mul(dirAnte, m.H * 0.03));
    return { codo: sol.medio, muñeca, puño: sol.fin };
  };
  const pierna = (lado: 'cerca' | 'lejos') => {
    const q = p[lado].pierna;
    const pt = rad(q.punta ?? 0);
    // con el talón arriba, el pie gira sobre la punta: el tobillo sube para que la punta siga en el piso
    const tob = add(q.tobillo, [0, pt > 0 ? Math.sin(pt) * m.pie * 0.78 : 0, 0]);
    const sol = ik2(caderaJ[lado], tob, m.muslo, m.canilla, q.rodilla);
    const fb = base(q.pie ?? p.giroCadera * 0.5, 0);
    const dir = norm(add(mul(fb.f, Math.cos(pt)), mul([0, -1, 0], Math.sin(pt))));
    const punta = add(sol.fin, add(mul(dir, m.pie * 0.78), [0, -m.tobillo * 0.75, 0]));
    const talon = add(sol.fin, add(mul(dir, -m.pie * 0.22), [0, -m.tobillo * 0.75, 0]));
    return { rodilla: sol.medio, tobillo: sol.fin, punta, talon };
  };
  const bc_ = brazo('cerca'), bl = brazo('lejos'), pc = pierna('cerca'), pl = pierna('lejos');
  return {
    pelvis, basePelvis: bp, pecho, basePecho: bc, cuello, cabeza, baseCabeza: bh, hombro,
    codo: { cerca: bc_.codo, lejos: bl.codo }, muñeca: { cerca: bc_.muñeca, lejos: bl.muñeca }, puño: { cerca: bc_.puño, lejos: bl.puño },
    cadera: caderaJ, rodilla: { cerca: pc.rodilla, lejos: pl.rodilla }, tobillo: { cerca: pc.tobillo, lejos: pl.tobillo },
    punta: { cerca: pc.punta, lejos: pl.punta }, talon: { cerca: pc.talon, lejos: pl.talon },
  };
}
