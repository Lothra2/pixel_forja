import type { EyeExpr, MouthExpr } from '../head/stamps';

/**
 * Pose del esqueleto humano. Una sola pose sirve para las tres vistas:
 * se piensa de lado (mirando a la derecha) y el render la proyecta de frente o de espalda.
 *
 * Unidades: pixeles del tamaño actual. y crece hacia abajo.
 * - Pies: objetivo del tobillo respecto a la articulación de la cadera de esa pierna (IK).
 *   x = hacia adelante, y = hacia abajo, z = hacia afuera (solo se ve de frente).
 * - Brazos: ángulos en grados respecto al torso. 0 = colgando, 90 = al frente, 180 = arriba, -45 = atrás.
 *   spread abre el brazo hacia el costado (solo se ve de frente).
 */
export interface Foot {
  x: number;
  y: number;
  z?: number;
  /** punta del pie: 0 plano, + apunta hacia abajo (patada, salto) */
  toe?: number;
}

export interface Arm {
  shoulder: number;
  /** flexión del codo (grados, + dobla hacia adelante) */
  elbow: number;
  spread?: number;
}

export type PropKind =
  | 'soccer' | 'basketball' | 'volleyball' | 'tennisball' | 'baseball'
  | 'racket' | 'bat' | 'skate' | 'bike' | 'sword' | 'shield' | 'potion' | 'glove' | 'hurdle'
  | WeaponKind | OffhandKind | 'arrow';

/** Armas de mano (RPG). */
export type WeaponKind =
  | 'sword' | 'dagger' | 'greatsword' | 'axe' | 'mace' | 'hammer' | 'spear' | 'scythe'
  | 'staff' | 'wand' | 'bow' | 'claws' | 'club';
/** Mano libre: escudos, orbe mágico, libro de hechizos. */
export type OffhandKind = 'shield' | 'shield_round' | 'shield_kite' | 'shield_tower' | 'orb' | 'tome';
export const WEAPON_KINDS: WeaponKind[] = ['sword', 'dagger', 'greatsword', 'axe', 'mace', 'hammer', 'spear', 'scythe', 'staff', 'wand', 'bow', 'claws', 'club'];
export const OFFHAND_KINDS: OffhandKind[] = ['shield', 'shield_round', 'shield_kite', 'shield_tower', 'orb', 'tome'];

export interface PropState {
  kind: PropKind;
  /** dónde va enganchado. ground = x respecto a la cadera, y = altura sobre el piso */
  at: 'handNear' | 'handFar' | 'footNear' | 'footFar' | 'ground' | 'body';
  x?: number;
  y?: number;
  /** grados (raqueta, bate, espada) */
  angle?: number;
  /**
   * Ángulo en pantalla por vista (premium): así un arma apunta adonde tiene que apuntar también de frente, de espalda
   * y en diagonal, no solo de lado. Las vistas de la izquierda usan el espejo de su par de la derecha.
   */
  angles?: Partial<Record<'side' | 'front' | 'back' | 'se' | 'ne', number>>;
  /** detrás del cuerpo */
  behind?: boolean;
  /**
   * Estela del golpe (premium): un arco claro que el filo dibuja en el cuadro del impacto, de un ángulo a otro en
   * pantalla, por vista. Es el "smear" de los animadores: en un solo cuadro se lee todo el recorrido.
   */
  smear?: Partial<Record<'side' | 'front' | 'back' | 'se' | 'ne', [number, number]>>;
  /** delante de todo, también de la cabeza (un escudo que se levanta para bloquear). Con lista: solo en esas vistas */
  front?: boolean | ('side' | 'front' | 'back' | 'se' | 'ne')[];
}

export interface Pose {
  /** corrimiento horizontal de todo el cuerpo */
  x: number;
  /** inclinación del torso en grados: + hacia adelante. 90 = acostado boca abajo hacia adelante */
  torso: number;
  /** yaw: giro extra de la cabeza en grados (+ hacia la cámara de lado, para mirar al frente) */
  head: { dx: number; dy: number; tilt: number; yaw?: number };
  legs: { near: Foot; far: Foot };
  arms: { near: Arm; far: Arm };
  face: { eyes: EyeExpr; mouth?: MouthExpr };
  /** pixeles que el punto más bajo queda sobre el piso. 0 = pisando */
  air: number;
  /** qué pie carga el peso (premium): ese pie queda en el piso y el resto del cuerpo se apoya en él */
  support?: 'near' | 'far' | 'both';
  /** giro de lado a lado (solo de frente o de espalda; morir en RPG = 90) */
  roll?: number;
  /** altura fija de la cadera sobre el piso (bici): ignora el apoyo de los pies */
  hipH?: number;
  /** acostado (premium): el cuerpo se centra en la celda midiendo lo dibujado (la cabeza grande no cabe si no) */
  fit?: boolean;
  /** vaivén del pelo largo (lo calcula el clip a partir del movimiento) */
  hair?: { dx: number; dy: number };
  props?: PropState[];
}

export interface AnimClip {
  name: string;
  fps: number;
  loop: boolean;
  frames: Pose[];
}

/** IK de dos huesos en el plano. bend = +1 la rodilla va hacia +x, -1 hacia -x. */
export function solveTwoBone(upper: number, lower: number, tx: number, ty: number, bend = 1): { mid: [number, number]; end: [number, number] } {
  let d = Math.hypot(tx, ty);
  const maxD = upper + lower - 1e-3;
  if (d > maxD) { tx = (tx / d) * maxD; ty = (ty / d) * maxD; d = maxD; }
  const minD = Math.abs(upper - lower) + 1e-3;
  if (d < minD) { const s = minD / Math.max(d, 1e-6); tx *= s; ty *= s; d = minD; if (!isFinite(tx)) { tx = 0; ty = minD; } }
  const base = Math.atan2(ty, tx);
  const cos = (upper * upper + d * d - lower * lower) / (2 * upper * d);
  const a = Math.acos(Math.max(-1, Math.min(1, cos)));
  const ang = base - a * bend;
  return { mid: [upper * Math.cos(ang), upper * Math.sin(ang)], end: [tx, ty] };
}

/** Compatibilidad: IK de pierna (rodilla hacia adelante). */
export function solveLeg(upper: number, lower: number, foot: Foot): { knee: [number, number]; ankle: [number, number] } {
  const r = solveTwoBone(upper, lower, foot.x, foot.y, 1);
  return { knee: r.mid, ankle: r.end };
}

/** Puntos del brazo en el plano del torso: x adelante, y abajo. */
export function armPoints(upper: number, lower: number, a: Arm): { elbow: [number, number]; hand: [number, number] } {
  const r = Math.PI / 180;
  const a1 = a.shoulder * r, a2 = (a.shoulder + a.elbow) * r;
  const elbow: [number, number] = [upper * Math.sin(a1), upper * Math.cos(a1)];
  return { elbow, hand: [elbow[0] + lower * Math.sin(a2), elbow[1] + lower * Math.cos(a2)] };
}

/** Pose neutral de pie. */
export function standPose(L: number): Pose {
  return {
    x: 0,
    torso: 0,
    head: { dx: 0, dy: 0, tilt: 0 },
    legs: { near: { x: 0.4, y: L - 0.2 }, far: { x: -0.4, y: L - 0.2 } },
    arms: { near: { shoulder: -4, elbow: 10 }, far: { shoulder: 4, elbow: 10 } },
    face: { eyes: 'open' },
    air: 0,
  };
}

// ---------- interpolación y mezcla ----------

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends (infer U)[] ? U[] : T[K] extends object ? DeepPartial<T[K]> : T[K] };
export type PosePatch = DeepPartial<Pose>;

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Mezcla profunda: los parches pisan a la base. Los arreglos (props) se reemplazan completos. */
export function merge<T>(base: T, ...patches: DeepPartial<T>[]): T {
  const out = structuredClone(base) as Record<string, unknown>;
  for (const p of patches) {
    if (!p) continue;
    for (const [k, v] of Object.entries(p)) {
      if (v === undefined) continue;
      if (isObj(v) && isObj(out[k])) out[k] = merge(out[k], v as never);
      else out[k] = structuredClone(v);
    }
  }
  return out as T;
}

function lerpAny(a: unknown, b: unknown, t: number): unknown {
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * t;
  if (isObj(a) && isObj(b)) {
    const o: Record<string, unknown> = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!(k in a)) o[k] = t < 0.5 ? undefined : b[k];
      else if (!(k in b)) o[k] = t < 0.5 ? a[k] : undefined;
      else o[k] = lerpAny(a[k], b[k], t);
    }
    return o;
  }
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => isObj(x) && isObj(b[i]) && x.kind === b[i].kind))
    return a.map((x, i) => lerpAny(x, b[i], t));
  return t < 0.5 ? a : b;
}

export function tween(a: Pose, b: Pose, t: number): Pose {
  return lerpAny(a, b, t) as Pose;
}

export type Ease = 'linear' | 'in' | 'out' | 'inout' | 'hold';
export function ease(t: number, e: Ease = 'inout'): number {
  switch (e) {
    case 'linear': return t;
    case 'in': return t * t;
    case 'out': return 1 - (1 - t) * (1 - t);
    case 'hold': return 0;
    default: return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
  }
}

/**
 * Secuencia desde poses clave: [cuadro, pose, curva hacia la siguiente].
 * Si loop, el último tramo vuelve a la primera pose.
 */
export function keyed(n: number, keys: [number, Pose, Ease?][], loop = false): Pose[] {
  const ks = [...keys].sort((p, q) => p[0] - q[0]);
  const out: Pose[] = [];
  for (let f = 0; f < n; f++) {
    let i = ks.length - 1;
    while (i > 0 && ks[i][0] > f) i--;
    const [f0, p0, e] = ks[i];
    const next = ks[i + 1] ?? (loop ? [ks[0][0] + n, ks[0][1]] as [number, Pose] : null);
    if (!next || f === f0) { out.push(structuredClone(p0)); continue; }
    const t = (f - f0) / (next[0] - f0);
    out.push(tween(p0, next[1], ease(t, e)));
  }
  return out;
}
