import { type V3, type M3, add, sub, mul, dot, cross, len, norm, mv, mm, rotX, rotY, rotZ } from './sdf';

/**
 * Esqueleto de jefe bípedo en 3D. A diferencia del de las heroínas (que se piensa de lado y se proyecta), este vive
 * en 3D de verdad: se mira desde cualquier dirección sin trucos, y el arma queda en la misma mano en las 8.
 *
 * Ejes del personaje: x adelante, y arriba, z hacia su lado cercano (el que ve la cámara cuando mira a la derecha).
 * Unidades: pixeles de un jefe de celda 128. A otro tamaño todo se multiplica por cell / 128.
 */

export interface BossArm {
  /** 0 colgando, 90 al frente, 180 arriba, -40 atrás */
  pitch: number;
  /** abre el brazo hacia afuera (grados) */
  spread?: number;
  /** flexión del codo (grados, + hacia adelante y arriba) */
  elbow: number;
  /** puño cerrado (0) o mano abierta (1) */
  open?: number;
}

export interface BossLeg {
  /** pie respecto del origen (el apoyo): x adelante, y altura sobre el piso, z hacia afuera */
  x: number;
  y: number;
  z?: number;
  /** punta del pie: + apunta hacia abajo */
  toe?: number;
}

export interface BossPose {
  /** cadera: corrimiento y cuánto baja o sube (y) respecto a la altura de pie */
  root: { x?: number; y?: number; z?: number; yaw?: number; lean?: number; roll?: number };
  spine?: { bend?: number; twist?: number; side?: number };
  head?: { pitch?: number; yaw?: number; roll?: number };
  arms: { near: BossArm; far: BossArm };
  legs: { near: BossLeg; far: BossLeg };
  /** arma en la mano cercana: ángulo en el plano del cuerpo (0 arriba, 90 adelante, 180 abajo) y giro */
  weapon?: { angle: number; yaw?: number; twoHand?: boolean; drop?: boolean };
  face?: { mouth?: number; eyes?: 'open' | 'closed' | 'angry' | 'happy' | 'dizzy' };
  /** de encantado (0) a libre (1) */
  freed?: number;
  /** cuánto brilla el encantamiento (0 a 1) */
  aura?: number;
  /** pixeles que el cuerpo queda en el aire (salto) */
  air?: number;
  /** otras cosas propias de cada jefe (la campana, las alas) */
  extra?: Record<string, number>;
}

export interface BossDims {
  s: number;
  hipH: number; hipW: number; legU: number; legL: number; foot: number;
  spine: number; shW: number; armU: number; armL: number; hand: number;
  neck: number; head: number;
  /** arma: largo de la empuñadura a la cabeza y medio alto de la cabeza (para que apoye en el piso y no lo atraviese) */
  weaponLen?: number; weaponR?: number;
}

/** Medidas de un bípedo grande a una celda (base 128). */
export function bipedDims(cell: number, base: Omit<BossDims, 's'>): BossDims {
  const s = cell / 128;
  const o = { s } as BossDims;
  for (const [k, v] of Object.entries(base)) (o as unknown as Record<string, number>)[k] = v * s;
  return o;
}

export interface Joints {
  /** marcos (filas = ejes locales en el marco del personaje) */
  body: M3; chest: M3; headM: M3;
  pelvis: V3; hips: { near: V3; far: V3 };
  knees: { near: V3; far: V3 }; ankles: { near: V3; far: V3 }; toes: { near: V3; far: V3 };
  chestTop: V3; neck: V3; headC: V3;
  shoulders: { near: V3; far: V3 }; elbows: { near: V3; far: V3 }; hands: { near: V3; far: V3 };
  /** dirección del arma (de la empuñadura a la cabeza) y empuñadura */
  weapon: { grip: V3; dir: V3 } | null;
}

/** Aplica un marco (columnas = ejes) a un vector local. */
export const inFrame = (m: M3, v: V3): V3 => mv(m, v);

/** IK de dos huesos en 3D: rodilla o codo hacia `pole`. */
export function ik2(a: V3, target: V3, u: number, l: number, pole: V3): { mid: V3; end: V3 } {
  let d = sub(target, a);
  let dl = len(d);
  const maxD = u + l - 0.01, minD = Math.abs(u - l) + 0.01;
  if (dl > maxD) { d = mul(d, maxD / dl); dl = maxD; }
  if (dl < minD) { d = mul(norm(d), minD); dl = minD; }
  const dir = norm(d);
  let p = sub(pole, mul(dir, dot(pole, dir)));
  if (len(p) < 1e-4) p = norm(cross(dir, [0, 0, 1]));
  p = norm(p);
  const x = (u * u - l * l + dl * dl) / (2 * dl);
  const h = Math.sqrt(Math.max(0, u * u - x * x));
  const mid = add(add(a, mul(dir, x)), mul(p, h));
  return { mid, end: add(a, d) };
}

/** Resuelve el esqueleto para una pose. */
export function solveBiped(d: BossDims, pose: BossPose): Joints {
  const s = d.s;
  const r = pose.root;
  // marco del cuerpo: giro, inclinación hacia adelante (la parte de arriba va a +x) y ladeo
  const body: M3 = mm(mm(rotY(r.yaw ?? 0), rotZ(-(r.lean ?? 0))), rotX(r.roll ?? 0));
  const sp = pose.spine ?? {};
  const chest: M3 = mm(mm(mm(body, rotY(sp.twist ?? 0)), rotZ(-(sp.bend ?? 0))), rotX(sp.side ?? 0));
  const hp = pose.head ?? {};
  const headM: M3 = mm(mm(mm(chest, rotY(hp.yaw ?? 0)), rotZ(-(hp.pitch ?? 0))), rotX(hp.roll ?? 0));
  const air = (pose.air ?? 0) * s;
  const pelvis: V3 = [(r.x ?? 0) * s, d.hipH + (r.y ?? 0) * s + air, (r.z ?? 0) * s];
  const hips = { near: add(pelvis, mv(body, [0, -2 * s, d.hipW])), far: add(pelvis, mv(body, [0, -2 * s, -d.hipW])) };
  const fwd = mv(body, [1, 0, 0]);
  const leg = (side: 'near' | 'far') => {
    const L = pose.legs[side], zs = side === 'near' ? 1 : -1;
    const ankle: V3 = [L.x * s + pelvis[0], L.y * s + d.foot * 0.45 + air, zs * d.hipW + (L.z ?? 0) * s * zs + pelvis[2]];
    const k = ik2(hips[side], ankle, d.legU, d.legL, add(fwd, [0, 0.05, zs * 0.08]));
    const t = ((L.toe ?? 0) * Math.PI) / 180;
    const toe = add(k.end, mv(rotY(r.yaw ?? 0), [Math.cos(t) * d.foot, -Math.sin(t) * d.foot - d.foot * 0.25, 0]));
    return { knee: k.mid, ankle: k.end, toe };
  };
  const ln = leg('near'), lf = leg('far');
  const chestTop = add(pelvis, mv(chest, [0, d.spine, 0]));
  const neck = add(chestTop, mv(chest, [d.neck * 0.3, d.neck * 0.85, 0]));
  const headC = add(neck, mv(headM, [d.head * 0.45, d.head * 0.7, 0]));
  const shoulders = { near: add(chestTop, mv(chest, [0, -3 * s, d.shW])), far: add(chestTop, mv(chest, [0, -3 * s, -d.shW])) };
  const arm = (side: 'near' | 'far') => {
    const A = pose.arms[side], zs = side === 'near' ? 1 : -1;
    const spread = -(A.spread ?? 8) * zs;
    const up = mv(mm(chest, mm(rotZ(A.pitch), rotX(spread))), [0, -1, 0]);
    const lo = mv(mm(chest, mm(rotZ(A.pitch + A.elbow), rotX(spread))), [0, -1, 0]);
    const elbow = add(shoulders[side], mul(up, d.armU));
    return { elbow, hand: add(elbow, mul(lo, d.armL)) };
  };
  const an = arm('near');
  let af = arm('far');
  let weapon: Joints['weapon'] = null;
  if (pose.weapon && !pose.weapon.drop) {
    // el ángulo del arma es respecto al mundo (no se suma la inclinación del cuerpo): 90 es horizontal al frente
    const turn = rotY((r.yaw ?? 0) + (pose.weapon.yaw ?? 0));
    let a = (pose.weapon.angle * Math.PI) / 180;
    let dir = norm(mv(turn, [Math.sin(a), Math.cos(a), 0]));
    // la cabeza del arma apoya en el piso: si lo atravesaría, el arma sube hasta quedar encima
    if (d.weaponLen) {
      const L = d.weaponLen, rr = d.weaponR ?? 0;
      const y = an.hand[1] + dir[1] * L;
      if (y < rr) {
        const c = Math.max(-1, Math.min(1, (rr - an.hand[1]) / L));
        const a2 = Math.acos(c);
        a = a > 0 ? Math.min(a, a2) : Math.max(a, -a2);
        dir = norm(mv(turn, [Math.sin(a), Math.cos(a), 0]));
      }
    }
    weapon = { grip: an.hand, dir };
    if (pose.weapon.twoHand) {
      // la otra mano va al mango, un poco más abajo
      const target = sub(an.hand, mul(dir, d.hand * 2.6));
      const k = ik2(shoulders.far, target, d.armU, d.armL, mv(chest, [-0.3, -1, -0.6]));
      af = { elbow: k.mid, hand: k.end };
    }
  }
  return {
    body, chest, headM, pelvis, hips,
    knees: { near: ln.knee, far: lf.knee }, ankles: { near: ln.ankle, far: lf.ankle }, toes: { near: ln.toe, far: lf.toe },
    chestTop, neck, headC, shoulders, elbows: { near: an.elbow, far: af.elbow }, hands: { near: an.hand, far: af.hand }, weapon,
  };
}
