import { type V3, type Base, type Articulaciones, type Medidas, add, sub, mul, dot, norm, cross, lerp3, enBase } from './esqueleto';
import type { LuchadorFicha } from './ficha';

/**
 * Las piezas del cuerpo como volúmenes con distancia (SDF): conos redondeados para brazos y piernas, elipsoides para el
 * pecho, la cadera, la cabeza y los músculos. Las piezas del mismo grupo se funden suave entre sí (el deltoides con el
 * brazo, el pecho con el abdomen), y los grupos distintos se cortan en seco: ahí el render dibuja la línea de adentro,
 * como en los sprites de Capcom.
 */
export type Grupo =
  | 'torso' | 'cabeza'
  | 'brazoC' | 'antebrazoC' | 'brazoL' | 'antebrazoL'
  | 'musloC' | 'piernaC' | 'musloL' | 'piernaL';

/** Los grupos del lado lejano van un tono más oscuros. */
export const LEJOS: ReadonlySet<Grupo> = new Set(['brazoL', 'antebrazoL', 'musloL', 'piernaL']);

export type Material = 'piel' | 'pliegue' | 'camisa' | 'cuello' | 'short' | 'zapato' | 'suela' | 'pelo' | 'canas' | 'barba' | 'barbaCanas' | 'muñequera';

export interface Prim {
  t: 'cono' | 'eli';
  /** cono: de a a b, con radios ra y rb */
  a?: V3; b?: V3; ra?: number; rb?: number;
  /** elipsoide: centro, radios sobre la base (f, u, r) */
  c?: V3; rad?: V3; base?: Base;
  mat: Material | ((p: V3) => Material);
  g: Grupo;
  /** para descartar rápido: caja en x e y */
  caja?: [number, number, number, number];
  zMax?: number;
  zMin?: number;
}

/** Distancia a un cono redondeado (Inigo Quilez). */
export function sdCono(p: V3, a: V3, b: V3, r1: number, r2: number): number {
  const ba = sub(b, a), l2 = dot(ba, ba);
  if (l2 < 1e-6) return Math.hypot(p[0] - a[0], p[1] - a[1], p[2] - a[2]) - Math.max(r1, r2);
  const rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const pa = sub(p, a), y = dot(pa, ba), z = y - l2;
  const x = sub(mul(pa, l2), mul(ba, y)), x2 = dot(x, x), y2 = y * y * l2, z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}

/** Distancia (aproximada, la cota de Quilez) a un elipsoide con base propia. */
export function sdEli(p: V3, c: V3, r: V3, b: Base): number {
  const q = sub(p, c);
  const l: V3 = [dot(q, b.f), dot(q, b.u), dot(q, b.r)];
  const k0 = Math.hypot(l[0] / r[0], l[1] / r[1], l[2] / r[2]);
  const k1 = Math.hypot(l[0] / (r[0] * r[0]), l[1] / (r[1] * r[1]), l[2] / (r[2] * r[2]));
  return k1 < 1e-6 ? -Math.min(r[0], r[1], r[2]) : (k0 * (k0 - 1)) / k1;
}

export function sdPrim(p: V3, q: Prim): number {
  return q.t === 'cono' ? sdCono(p, q.a!, q.b!, q.ra!, q.rb!) : sdEli(p, q.c!, q.rad!, q.base!);
}

/** Una base con f en una dirección dada y u lo más parecido posible a `arriba`. */
export function baseDe(f: V3, arriba: V3 = [0, 1, 0]): Base {
  const ff = norm(f);
  let r = cross(ff, arriba);
  if (Math.hypot(...r) < 1e-4) r = cross(ff, [1, 0, 0]);
  r = norm(r);
  return { f: ff, u: norm(cross(r, ff)), r };
}

const cono = (a: V3, b: V3, ra: number, rb: number, mat: Prim['mat'], g: Grupo): Prim => ({ t: 'cono', a, b, ra, rb, mat, g });
const eli = (c: V3, rad: V3, base: Base, mat: Prim['mat'], g: Grupo): Prim => ({ t: 'eli', c, rad, base, mat, g });

/** Las coordenadas de un punto en la base de la cabeza (desde su centro). */
export function enCabeza(j: Articulaciones, p: V3): V3 {
  const q = sub(p, j.cabeza), b = j.baseCabeza;
  return [dot(q, b.f), dot(q, b.u), dot(q, b.r)];
}

/** Arma las piezas de un luchador en una pose ya resuelta. */
export function piezas(f: LuchadorFicha, m: Medidas, j: Articulaciones): Prim[] {
  const P: Prim[] = [];
  const s = m.grosor, k = m.H / 104, hs = m.cabeza / 13.9;
  void hs;
  const bc = j.basePecho, bp = j.basePelvis, bh = j.baseCabeza;

  // ---- el torso con la camisa y el short
  P.push(eli(enBase(j.pecho, bc, -0.3 * k, 1.5 * k, 0), [6.3 * s * k, 9.6 * k, 8.6 * s * k], bc, 'camisa', 'torso'));
  P.push(eli(enBase(j.pecho, bc, 2.2 * k, 3.2 * k, 0), [4.2 * s * k, 4.6 * k, 7.6 * s * k], bc, 'camisa', 'torso'));
  P.push(eli(lerp3(j.pelvis, j.pecho, 0.42), [5.4 * s * k, 7.8 * k, 7.6 * s * k], bc, 'camisa', 'torso'));
  P.push(eli(enBase(j.pelvis, bp, 0, 0.6 * k, 0), [5.8 * k, 5.6 * k, 7.9 * s * k], bp, 'short', 'torso'));
  for (const lado of ['cerca', 'lejos'] as const) {
    const tr = enBase(j.pecho, bc, -0.8 * k, 8.4 * k, (lado === 'cerca' ? 1 : -1) * 3 * k);
    P.push(cono(tr, j.hombro[lado], 3.3 * s * k, 3.6 * s * k, 'camisa', 'torso'));
  }
  // el cuello de la camisa (el del polo)
  P.push(eli(enBase(j.cuello, bc, 0.4 * k, -0.6 * k, 0), [3.9 * k, 1.5 * k, 4.4 * k], bc, 'cuello', 'torso'));

  // ---- los brazos
  for (const lado of ['cerca', 'lejos'] as const) {
    const gB: Grupo = lado === 'cerca' ? 'brazoC' : 'brazoL', gA: Grupo = lado === 'cerca' ? 'antebrazoC' : 'antebrazoL';
    const h = j.hombro[lado], c = j.codo[lado], w = j.muñeca[lado], pu = j.puño[lado];
    const dirB = norm(sub(c, h));
    P.push(eli(add(h, mul(dirB, 1.2 * k)), [4.3 * s * k, 4.5 * s * k, 4.3 * s * k], baseDe(dirB, bc.u), 'camisa', gB));
    P.push(cono(h, lerp3(h, c, 0.52), 4.5 * s * k, 4.1 * s * k, 'camisa', gB));
    P.push(cono(h, c, 3.7 * s * k, 3.0 * s * k, 'piel', gB));
    // el bíceps, hacia el lado de adentro del codo
    P.push(eli(lerp3(h, c, 0.6), [5.0 * k, 3.1 * s * k, 2.9 * s * k], baseDe(dirB, bc.f), 'piel', gB));
    const dirA = norm(sub(w, c));
    P.push(cono(c, w, 3.2 * s * k, 2.4 * k, 'piel', gA));
    P.push(eli(lerp3(c, w, 0.28), [4.8 * k, 3.6 * s * k, 3.3 * s * k], baseDe(dirA, bc.u), 'piel', gA));
    if (f.colores.muñequera) P.push(cono(lerp3(c, w, 0.86), add(w, mul(dirA, 0.6 * k)), 2.85 * k, 2.8 * k, 'muñequera', gA));
    // el puño
    const bPu = baseDe(dirA, [0, 1, 0]);
    // los dedos doblados: surcos de lado a lado en la parte de adelante del puño
    const dedos = (p: V3): Material => {
      const q = sub(p, pu), fx = dot(q, bPu.f) / k, uy = dot(q, bPu.u) / k;
      return fx > 0.4 && uy < 2.2 && (((uy + 8) % 1.9) + 1.9) % 1.9 < 0.42 ? 'pliegue' : 'piel';
    };
    P.push(eli(pu, [4.3 * k, 3.9 * k, 3.5 * k], bPu, dedos, gA));
  }

  // ---- las piernas
  for (const lado of ['cerca', 'lejos'] as const) {
    const gM: Grupo = lado === 'cerca' ? 'musloC' : 'musloL', gP: Grupo = lado === 'cerca' ? 'piernaC' : 'piernaL';
    const ca = j.cadera[lado], ro = j.rodilla[lado], to = j.tobillo[lado], pt = j.punta[lado], ta = j.talon[lado];
    P.push(cono(ca, lerp3(ca, ro, 0.5), 5.9 * s * k, 5.2 * s * k, 'short', gM));
    P.push(cono(ca, ro, 4.9 * s * k, 3.3 * k, 'piel', gM));
    const pieF = norm(sub(pt, ta));
    const atras = norm(sub(mul(pieF, -1), mul(norm(sub(to, ro)), dot(mul(pieF, -1), norm(sub(to, ro))))));
    P.push(cono(ro, to, 3.2 * k, 2.1 * k, 'piel', gP));
    P.push(eli(add(lerp3(ro, to, 0.3), mul(atras, 1.1 * k)), [5.4 * k, 2.9 * s * k, 2.7 * s * k], baseDe(norm(sub(ro, to)), atras), 'piel', gP));
    // la zapatilla y la suela
    P.push(cono(add(ta, [0, 2.0 * k, 0]), add(pt, [0, 1.4 * k, 0]), 2.7 * k, 2.1 * k, 'zapato', gP));
    P.push(cono(add(to, [0, 0.4 * k, 0]), add(lerp3(ta, pt, 0.35), [0, 2.6 * k, 0]), 2.5 * k, 2.6 * k, 'zapato', gP));
    P.push(cono(add(ta, [0, 0.9 * k, 0]), add(pt, [0, 0.7 * k, 0]), 1.25 * k, 1.1 * k, 'suela', gP));
  }

  // ---- la cabeza
  const H = j.cabeza;
  const matCabeza = (p: V3): Material => {
    const [x, y, z] = enCabeza(j, p).map((v) => v / hs) as V3;
    const az = Math.abs(z);
    const entr = f.cabeza.entradas;
    // el pelo: la frente con entradas, los lados sobre la oreja y la nuca
    const frente = 4.1 + entr * 1.4 * Math.min(1, Math.max(0, (az - 1.2) / 2.6));
    const pelo = x > 1.6 ? y > frente - (x > 3.6 ? 0 : 0.6) : x > -1.2 ? y > 1.3 : y > -2.6;
    if (pelo) return az > 3.6 && y < 2.8 && y > -1.6 && x > -2.6 ? 'canas' : 'pelo';
    if (f.cabeza.barba > 0) {
      const bigote = x > 3.4 && y < -1.2 && y > -2.4;
      const patilla = x > -1.0 && x < 1.8 && y > -1.4 && y < 1.4 && az > 3.6;
      const mandibula = y < -1.5 && x > -1.2;
      if (bigote || patilla || mandibula) return y < -4.1 && x > 2.2 ? 'barbaCanas' : 'barba';
    }
    return 'piel';
  };
  P.push(eli(enBase(H, bh, -0.3 * hs, 0.9 * hs, 0), [5.9 * hs, 6.5 * hs, 5.0 * hs], bh, matCabeza, 'cabeza'));
  P.push(eli(enBase(H, bh, 2.0 * hs, -2.5 * hs, 0), [4.0 * hs, 3.7 * hs, 4.0 * hs], bh, matCabeza, 'cabeza'));
  P.push(eli(enBase(H, bh, 3.7 * hs, -4.5 * hs, 0), [2.1 * hs, 1.8 * hs, 2.3 * hs], bh, matCabeza, 'cabeza'));
  // la ceja (el hueso de la frente, marcado como en SF2)
  P.push(eli(enBase(H, bh, 4.7 * hs, 1.5 * hs, 0), [1.3 * hs, 1.1 * hs, 3.5 * hs], bh, 'piel', 'cabeza'));
  // la nariz
  P.push(cono(enBase(H, bh, 4.9 * hs, 0.6 * hs, 0), enBase(H, bh, 6.3 * hs, -1.4 * hs, 0), 0.9 * hs, 1.05 * hs, 'piel', 'cabeza'));
  // la oreja del lado de la cámara
  P.push(eli(enBase(H, bh, -0.6 * hs, -0.3 * hs, 5.3 * hs), [1.5 * hs, 2.3 * hs, 1.1 * hs], bh, 'piel', 'cabeza'));
  // el volumen del pelo, arriba y atrás
  P.push(eli(enBase(H, bh, -0.7 * hs, (2.4 + f.cabeza.volumen) * hs, 0), [6.1 * hs, (4.4 + f.cabeza.volumen * 1.2) * hs, 5.1 * hs], bh, matCabeza, 'cabeza'));
  // el cuello
  P.push(cono(enBase(j.cuello, bc, 0, -1 * k, 0), enBase(H, bh, -0.2 * hs, -3.4 * hs, 0), 3.4 * s * k, 3.0 * k, 'piel', 'cabeza'));

  for (const q of P) cajaDe(q);
  return P;
}

function cajaDe(q: Prim) {
  if (q.t === 'cono') {
    const R = Math.max(q.ra!, q.rb!) + 1;
    q.caja = [Math.min(q.a![0], q.b![0]) - R, Math.max(q.a![0], q.b![0]) + R, Math.min(q.a![1], q.b![1]) - R, Math.max(q.a![1], q.b![1]) + R];
    q.zMax = Math.max(q.a![2], q.b![2]) + R;
    q.zMin = Math.min(q.a![2], q.b![2]) - R;
  } else {
    const R = Math.max(...q.rad!) + 1;
    q.caja = [q.c![0] - R, q.c![0] + R, q.c![1] - R, q.c![1] + R];
    q.zMax = q.c![2] + R;
    q.zMin = q.c![2] - R;
  }
}
