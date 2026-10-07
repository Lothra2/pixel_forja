import type { MouthStyle } from '../sheet/ficha';

/**
 * Pose del esqueleto humano en vista lateral 3/4 (mirando a la derecha).
 * Origen en el centro de la cadera, y crece hacia abajo, unidades = pixeles del tamaño actual.
 * Los pies se dan como objetivo (IK) y los brazos como ángulos (desde la vertical, + es hacia adelante).
 */
export interface Pose {
  /** desplazamiento de los hombros hacia adelante (inclinación del torso) */
  lean: number;
  /** desplazamiento de la cabeza respecto al cuello (movimiento secundario) */
  head: { dx: number; dy: number };
  legs: { near: Foot; far: Foot };
  arms: { near: Arm; far: Arm };
  face: { eyes: 'open' | 'closed'; mouth?: MouthStyle };
  /** pixeles que el pie más bajo queda sobre el piso (saltos). 0 = pisando */
  air: number;
}

export interface Foot {
  /** posición del tobillo respecto a la articulación de la cadera de esa pierna */
  x: number;
  y: number;
}

export interface Arm {
  /** ángulo del brazo (grados) */
  shoulder: number;
  /** flexión del codo (grados, + dobla hacia adelante) */
  elbow: number;
}

export interface AnimClip {
  name: string;
  fps: number;
  loop: boolean;
  frames: Pose[];
}

/** IK de dos huesos. La rodilla dobla hacia adelante (+x). */
export function solveLeg(upper: number, lower: number, foot: Foot): { knee: [number, number]; ankle: [number, number] } {
  const dx = foot.x, dy = foot.y;
  let d = Math.hypot(dx, dy);
  const maxD = upper + lower - 1e-3;
  let tx = dx, ty = dy;
  if (d > maxD) { tx = (dx / d) * maxD; ty = (dy / d) * maxD; d = maxD; }
  const minD = Math.abs(upper - lower) + 1e-3;
  if (d < minD) { const s = minD / Math.max(d, 1e-6); tx *= s; ty *= s; d = minD; }
  const base = Math.atan2(ty, tx);
  const cos = (upper * upper + d * d - lower * lower) / (2 * upper * d);
  const a = Math.acos(Math.max(-1, Math.min(1, cos)));
  // y crece hacia abajo: restar el ángulo lleva la rodilla hacia +x cuando la pierna apunta abajo
  const ang = base - a;
  return { knee: [upper * Math.cos(ang), upper * Math.sin(ang)], ankle: [tx, ty] };
}

export function armPoints(upper: number, lower: number, a: Arm): { elbow: [number, number]; hand: [number, number] } {
  const r = Math.PI / 180;
  const a1 = a.shoulder * r, a2 = (a.shoulder + a.elbow) * r;
  const elbow: [number, number] = [upper * Math.sin(a1), upper * Math.cos(a1)];
  return { elbow, hand: [elbow[0] + lower * Math.sin(a2), elbow[1] + lower * Math.cos(a2)] };
}
