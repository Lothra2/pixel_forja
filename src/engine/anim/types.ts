import type { Dims } from '../rig/dims';
import { type Pose, type PosePatch, standPose, merge } from '../rig/pose';
import type { View } from '../render/head';

export type Pack =
  | 'basic' | 'football' | 'keeper' | 'basket' | 'volley' | 'tennis' | 'baseball'
  | 'swim' | 'athletics' | 'martial' | 'brawl' | 'climb' | 'skate' | 'bike' | 'rpg' | 'skills' | 'enemy' | 'animal' | 'pet' | 'custom';

export const PACKS: Pack[] = ['basic', 'football', 'keeper', 'basket', 'volley', 'tennis', 'baseball', 'swim', 'athletics', 'martial', 'brawl', 'climb', 'skate', 'bike', 'rpg', 'skills', 'enemy'];

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
  /**
   * Eventos para el juego, en fase del ciclo (0 a 1): cuándo pisa cada pie (sonido de paso, polvo), cuándo pega
   * el golpe (daño, sacudida) y cuándo suelta (flecha, hechizo). near/far = pie de adelante o de atrás de la pose.
   */
  events?: AnimEvent[];
  /** de pie y con altura estable: aplica el control de altura y de temblor */
  steady?: boolean;
  /**
   * Solo se lee de lado y en diagonal (giros de cabeza, garrocha): de frente se usa la diagonal de abajo y de
   * espalda la de arriba, así la hoja sigue teniendo 8 direcciones y ninguna se ve rota.
   */
  lateral?: boolean;
  /** avanza hacia atrás de lado (espalda en natación): se dibuja con la vista espejo para que vaya cabeza primero */
  backward?: boolean;
  /** vistas donde se usa (para exportar paquetes de 4 direcciones) */
  views?: View[];
  /** el pelo largo se va hacia atrás (correr) */
  hairTrail?: number;
  /** giro: cada cuadro mira a la dirección siguiente de las 8 (torbellino) */
  spin?: boolean;
  /** ciclos sin pie que mida el avance (nadar, vallas): cuánto avanza el cuerpo en un ciclo, en largos de pierna */
  strideL?: number;
  /**
   * Acciones de un disparo que se desplazan (salto largo, clavado): velocidad del cuerpo entre cada cuadro y el
   * siguiente, como fracción de la velocidad de `ref` (la carrera del mismo personaje). El juego mueve el sprite con esto.
   */
  travel?: { ref: 'walk' | 'run' | 'sprint'; k: number[] };
  build: (c: Ctx) => Pose[];
}

/** paso, golpe, suelta (proyectil, efecto), despegue y aterriza (saltos) */
export interface AnimEvent {
  type: 'paso' | 'impacto' | 'suelta' | 'despegue' | 'aterriza';
  phase: number;
  foot?: 'near' | 'far';
  /**
   * Qué pega en un impacto (o qué suelta). Sin esto, la mano o el pie que llega más adelante. Con esto, esa
   * articulación: la frente en un cabezazo, el pie de abajo en un pisotón, el codo en un codazo hacia atrás.
   * En un paso: la mano que agarra (escalera, poste); el kit exporta `mano` y su `punto`.
   */
  joint?: 'handNear' | 'handFar' | 'footNear' | 'footFar' | 'elbowNear' | 'elbowFar' | 'frente' | 'head';
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
