import { keyed, type Pose, type PropState } from '../rig/pose';
import { type AnimDef, P, feet } from './types';

/**
 * Acción RPG en 4 direcciones (abajo = frente, arriba = espalda, derecha = lado, izquierda = lado espejado).
 * Mismas poses para las cuatro: el render las proyecta.
 */
const sword: PropState = { kind: 'sword', at: 'handNear' };
const shield: PropState = { kind: 'shield', at: 'handFar' };
const four = ['side', 'front', 'back'] as const;

const armed = (poses: Pose[], extra: PropState[] = [sword]): Pose[] => poses.map((p) => ({ ...p, props: [...extra, ...(p.props ?? [])] }));

export const attack: AnimDef = {
  name: 'attack', pack: 'rpg', fps: 14, loop: false, views: [...four],
  build: (c) => {
    const L = c.L;
    const wind = P(c, { torso: -8, legs: feet(c, 0.3, 0.22), arms: { near: { shoulder: 170, elbow: 40 }, far: { shoulder: 30, elbow: 60 } }, face: { eyes: 'angry', mouth: 'line' } });
    const strike = P(c, { torso: 16, legs: { near: { x: 0.4 * L, y: L - 1 }, far: { x: -0.3 * L, y: L - 0.7 } }, arms: { near: { shoulder: 60, elbow: 0 }, far: { shoulder: 10, elbow: 60 } }, face: { eyes: 'angry', mouth: 'grin' } });
    const follow = P(c, { ...strike, arms: { near: { shoulder: 20, elbow: 10 }, far: { shoulder: 0, elbow: 60 } } });
    return armed(keyed(6, [[0, P(c)], [1, wind, 'in'], [3, strike, 'out'], [4, follow], [5, P(c)]]));
  },
};

export const throwAnim: AnimDef = {
  name: 'throw', pack: 'rpg', fps: 12, loop: false, views: [...four],
  build: (c) => {
    const L = c.L, u = c.u;
    const cock = P(c, { torso: -10, legs: feet(c, 0.2, 0.25), arms: { near: { shoulder: -140, elbow: 50 }, far: { shoulder: 60, elbow: 20 } } });
    const rel = P(c, { torso: 18, legs: { near: { x: 0.4 * L, y: L - 1 }, far: { x: -0.3 * L, y: L - 0.6, toe: 30 } }, arms: { near: { shoulder: 100, elbow: 5 }, far: { shoulder: -20, elbow: 30 } }, face: { mouth: 'open' } });
    const seq = keyed(6, [[0, P(c)], [2, cock, 'in'], [3, rel, 'out'], [5, P(c)]]);
    return seq.map((p, i) => ({ ...p, props: i <= 3 ? [{ kind: 'potion', at: 'handNear' } as PropState] : [{ kind: 'potion', at: 'ground', x: (1.5 + i) * 0.6 * L, y: 16 * u } as PropState] }));
  },
};

export const block: AnimDef = {
  name: 'block_shield', pack: 'rpg', fps: 10, loop: false, views: [...four],
  build: (c) => {
    const up = P(c, { torso: 8, legs: feet(c, 0.45, 0.25), arms: { near: { shoulder: 30, elbow: 60 }, far: { shoulder: 80, elbow: 70 } }, face: { eyes: 'angry', mouth: 'line' } });
    return armed(keyed(6, [[0, P(c)], [2, up, 'hold'], [4, up], [5, P(c)]]), [sword, shield]);
  },
};

export const useItem: AnimDef = {
  name: 'use_item', pack: 'rpg', fps: 8, loop: false, views: [...four],
  build: (c) => {
    const lift = P(c, { arms: { near: { shoulder: 120, elbow: 110 }, far: { shoulder: 0, elbow: 10 } }, head: { tilt: -10 } });
    const drink = P(c, { ...lift, face: { eyes: 'closed', mouth: 'o' } });
    const glow = P(c, { arms: { near: { shoulder: 150, elbow: 10, spread: 30 }, far: { shoulder: 150, elbow: 10, spread: 30 } }, face: { eyes: 'happy', mouth: 'grin' } });
    const seq = [P(c), lift, drink, drink, glow, glow, P(c)];
    return seq.map((p, i) => ({ ...p, props: i >= 1 && i <= 3 ? [{ kind: 'potion', at: 'handNear', x: 0, y: -1 } as PropState] : undefined }));
  },
};

export const die: AnimDef = {
  name: 'die', pack: 'rpg', fps: 8, loop: false, views: [...four],
  build: (c) => {
    const L = c.L;
    const hurt = P(c, { torso: -12, head: { tilt: -10 }, arms: { near: { shoulder: 40, elbow: 40, spread: 30 }, far: { shoulder: 50, elbow: 30, spread: 30 } }, face: { eyes: 'hurt', mouth: 'o' } });
    const kneel = P(c, { torso: 20, roll: 20, legs: { near: { x: 0.3 * L, y: 0.55 * L }, far: { x: -0.5 * L, y: 0.45 * L, toe: 60 } }, arms: { near: { shoulder: 0, elbow: 10 }, far: { shoulder: 0, elbow: 10 } }, face: { eyes: 'hurt', mouth: 'frown' } });
    const down = P(c, { torso: 88, roll: 90, legs: { near: { x: -0.9 * L, y: 0.05 * L, toe: 80 }, far: { x: -0.85 * L, y: 0.2 * L, toe: 80 } }, arms: { near: { shoulder: 150, elbow: 20 }, far: { shoulder: 170, elbow: 10 } }, face: { eyes: 'closed', mouth: 'line' } });
    return [P(c), hurt, hurt, kneel, kneel, down, down, down];
  },
};

export const RPG: AnimDef[] = [attack, throwAnim, block, useItem, die];
