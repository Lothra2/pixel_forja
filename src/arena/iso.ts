/**
 * Isométrica 2:1. El mundo es el piso (x, y) y la altura z. En pantalla: sx = x - y, sy = (x + y) / 2 - z.
 * Moverse a la derecha de la pantalla es ir por (1, -1) en el mundo: un paso de mundo se ve √2 pixeles de ancho.
 * El avance del kit está medido de lado (pixeles de pantalla); en el mundo vale avance / √2 en cualquier dirección.
 */

export const SQRT2 = Math.SQRT2;

export interface Vec { x: number; y: number }

export const toScreen = (x: number, y: number, z = 0): Vec => ({ x: x - y, y: (x + y) / 2 - z });
export const fromScreen = (sx: number, sy: number): Vec => ({ x: sy + sx / 2, y: sy - sx / 2 });

/** Las 8 direcciones del kit y hacia dónde va cada una en el mundo (vector unitario). */
export const DIRECTIONS = ['down', 'down_left', 'left', 'up_left', 'up', 'up_right', 'right', 'down_right'] as const;
export type Direction = (typeof DIRECTIONS)[number];
const r = Math.SQRT1_2;
export const DIR_WORLD: Record<Direction, Vec> = {
  down: { x: r, y: r }, down_left: { x: 0, y: 1 }, left: { x: -r, y: r }, up_left: { x: -1, y: 0 },
  up: { x: -r, y: -r }, up_right: { x: 0, y: -1 }, right: { x: r, y: -r }, down_right: { x: 1, y: 0 },
};

/** Lo que pide el jugador en pantalla (flechas o palanca) llevado al mundo. */
export function screenIntentToWorld(ix: number, iy: number): Vec {
  const x = ix + iy, y = iy - ix;
  const m = Math.hypot(x, y);
  return m ? { x: x / m, y: y / m } : { x: 0, y: 0 };
}

/** La dirección del kit más cercana a un vector del mundo. */
export function nearestDirection(v: Vec): Direction {
  let best: Direction = 'down', bd = -Infinity;
  for (const d of DIRECTIONS) {
    const w = DIR_WORLD[d];
    const dot = v.x * w.x + v.y * w.y;
    if (dot > bd) { bd = dot; best = d; }
  }
  return best;
}

export const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
