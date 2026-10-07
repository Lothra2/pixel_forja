import type { Dims } from '../rig/dims';
import { type Pose, type PosePatch, standPose, merge } from '../rig/pose';
import type { View } from '../render/head';

export type Pack =
  | 'basic' | 'football' | 'keeper' | 'basket' | 'volley' | 'tennis' | 'baseball'
  | 'swim' | 'athletics' | 'martial' | 'skate' | 'bike' | 'rpg' | 'animal' | 'custom';

export const PACKS: Pack[] = ['basic', 'football', 'keeper', 'basket', 'volley', 'tennis', 'baseball', 'swim', 'athletics', 'martial', 'skate', 'bike', 'rpg'];

export interface Ctx {
  d: Dims;
  /** largo de pierna */
  L: number;
  /** largo de brazo */
  A: number;
  /** escala (1 a 48 px) */
  u: number;
  /** contextura: más pesado = pasos más cortos, menos vuelo */
  build: number;
  view: View;
}

export interface AnimDef {
  name: string;
  pack: Pack;
  fps: number;
  loop: boolean;
  /** de pie y con altura estable: aplica el control de altura y de temblor */
  steady?: boolean;
  /** vistas donde se usa (para exportar paquetes de 4 direcciones) */
  views?: View[];
  /** el pelo largo se va hacia atrás (correr) */
  hairTrail?: number;
  build: (c: Ctx) => Pose[];
}

export function makeCtx(d: Dims, build: number, view: View): Ctx {
  return { d, L: d.legUpper + d.legLower, A: d.armUpper + d.armLower, u: d.u, build, view };
}

/** pose de pie con cambios */
export function P(c: Ctx, ...patches: PosePatch[]): Pose {
  return merge(standPose(c.L), ...patches);
}

/** repite cada pose n veces (sostener) */
export function hold(poses: Pose[], n: number): Pose[] {
  return poses.flatMap((p) => Array.from({ length: n }, () => structuredClone(p)));
}

export const TAU = Math.PI * 2;

/** altura de la cadera con agachada c (0 de pie, 1 muy agachado) */
export function hipY(c: Ctx, crouch: number): number {
  return c.L - 0.2 - crouch * c.L * 0.38;
}

/** los dos pies apoyados, separados s, con agachada */
export function feet(c: Ctx, crouch: number, spread = 0.18): PosePatch['legs'] {
  const y = hipY(c, crouch);
  return { near: { x: c.L * spread, y, toe: 0 }, far: { x: -c.L * spread, y, toe: 0 } };
}
