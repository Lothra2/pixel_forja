import type { Dims } from '../rig/dims';
import type { AnimClip, Pose } from '../rig/pose';

/**
 * Animaciones humanas, escritas una sola vez para cualquier personaje y tamaño.
 * Todo se expresa en función del largo de la pierna: alguien con piernas más largas da zancadas más largas.
 */
export interface BodyParams {
  /** 1 = contextura normal. Más pesado = pasos más cortos y menos rebote */
  build: number;
}

const TAU = Math.PI * 2;

function legLen(d: Dims) {
  return d.legUpper + d.legLower;
}

function neutral(d: Dims): Pose {
  const L = legLen(d);
  return {
    lean: 0,
    head: { dx: 0, dy: 0 },
    legs: { near: { x: 0.4, y: L - 0.2 }, far: { x: -0.4, y: L - 0.2 } },
    arms: { near: { shoulder: -4, elbow: 10 }, far: { shoulder: 4, elbow: 10 } },
    face: { eyes: 'open' },
    air: 0,
  };
}

/** Reposo: respiración en la cabeza y brazos, parpadeo en un cuadro. 8 cuadros. */
export function idle(d: Dims): AnimClip {
  const frames: Pose[] = [];
  const breath = [0, 0, 0, 1, 1, 1, 1, 0];
  for (let i = 0; i < 8; i++) {
    const p = neutral(d);
    p.head.dy = breath[i];
    const sway = Math.sin((i / 8) * TAU) * 3;
    p.arms.near.shoulder += sway;
    p.arms.far.shoulder -= sway;
    if (i === 6) p.face.eyes = 'closed';
    frames.push(p);
  }
  return { name: 'idle', fps: 6, loop: true, frames };
}

/**
 * Caminar: ciclo de 8 cuadros. Los pies van por una trayectoria: apoyo (pegado al piso, hacia atrás)
 * y vuelo (arco hacia adelante). La cadera sube cuando las piernas se cruzan.
 * La cabeza llega un cuadro tarde (movimiento secundario).
 */
export function walk(d: Dims, b: BodyParams = { build: 1 }): AnimClip {
  const L = legLen(d);
  const S = (0.36 * L) / Math.max(0.8, b.build); // media zancada
  const lift = 0.28 * L;
  const low = L - 1.0, high = L - 0.1;
  const hip = (p: number) => low + (high - low) * (1 - Math.cos(2 * TAU * p)) / 2;
  const foot = (p: number) => {
    p = ((p % 1) + 1) % 1;
    if (p < 0.5) {
      const q = p / 0.5;
      return { x: S * Math.cos(Math.PI * q), y: hip(p) };
    }
    const q = (p - 0.5) / 0.5;
    return { x: -S * Math.cos(Math.PI * q), y: hip(p) - lift * Math.sin(Math.PI * q) };
  };
  const frames: Pose[] = [];
  const A = 30;
  for (let i = 0; i < 8; i++) {
    const p = i / 8;
    const swing = Math.cos(TAU * p);
    const prev = Math.round(hip(p - 1 / 8));
    frames.push({
      lean: 0.4,
      head: { dx: 0, dy: Math.round(hip(p)) - prev },
      legs: { near: foot(p), far: foot(p + 0.5) },
      arms: {
        near: { shoulder: -A * swing, elbow: 18 + Math.max(0, -swing) * 25 },
        far: { shoulder: A * swing, elbow: 18 + Math.max(0, swing) * 25 },
      },
      face: { eyes: 'open' },
      air: 0,
    });
  }
  return { name: 'walk', fps: 10, loop: true, frames };
}

export const HUMAN_ANIMS = { idle, walk } as const;
export type HumanAnimName = keyof typeof HUMAN_ANIMS;
