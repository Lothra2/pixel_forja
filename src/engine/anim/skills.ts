import { keyed, type Pose, type PropState } from '../rig/pose';
import { type AnimDef, P, feet, hold } from './types';
import { walk, run } from './basic';
import { die } from './rpg';

/**
 * Habilidades de RPG de acción (estilo Diablo). Las armas salen del equipo de la ficha:
 * la espada de las poses se cambia por el arma elegida. Se pueden exportar en 8 direcciones.
 */
const eight = ['side', 'front', 'back'] as const;

/** Lanzar un hechizo con una mano (bola de fuego, rayo): junta energía atrás y la suelta al frente. */
export const cast: AnimDef = {
  name: 'cast', pack: 'skills', fps: 12, loop: false, views: [...eight],
  build: (c) => {
    const L = c.L;
    const ready = P(c, { torso: 4, legs: feet(c, 0.25, 0.22), arms: { near: { shoulder: 20, elbow: 70 }, far: { shoulder: 10, elbow: 50 } } });
    const gather = P(c, { torso: -8, legs: feet(c, 0.3, 0.24), arms: { near: { shoulder: -35, elbow: 90 }, far: { shoulder: 60, elbow: 80, spread: 20 } }, face: { eyes: 'angry', mouth: 'line' } });
    const release = P(c, { torso: 14, legs: { near: { x: 0.45 * L, y: L - 1 }, far: { x: -0.3 * L, y: L - 0.6 } }, arms: { near: { shoulder: 95, elbow: 0 }, far: { shoulder: -20, elbow: 40 } }, face: { eyes: 'angry', mouth: 'open' } });
    return keyed(7, [[0, ready], [2, gather, 'in'], [3, release, 'out'], [5, release], [6, ready]]);
  },
};

/** Nova: se agacha, sube los brazos y descarga la energía alrededor. */
export const nova: AnimDef = {
  name: 'nova', pack: 'skills', fps: 12, loop: false, views: [...eight],
  build: (c) => {
    const u = c.u;
    const crouch = P(c, { legs: feet(c, 0.6, 0.25), torso: 12, head: { tilt: 10 }, arms: { near: { shoulder: 30, elbow: 90, spread: 30 }, far: { shoulder: 30, elbow: 90, spread: 30 } }, face: { eyes: 'closed', mouth: 'line' } });
    const rise = P(c, { air: Math.max(1, Math.round(2 * u)), legs: feet(c, 0, 0.2), head: { tilt: -15 }, arms: { near: { shoulder: 170, elbow: 10, spread: 30 }, far: { shoulder: 170, elbow: 10, spread: 30 } }, face: { eyes: 'angry', mouth: 'open' } });
    const slam = P(c, { legs: feet(c, 0.5, 0.32), torso: 18, arms: { near: { shoulder: 70, elbow: 0, spread: 70 }, far: { shoulder: 70, elbow: 0, spread: 70 } }, face: { eyes: 'angry', mouth: 'grin' } });
    return keyed(8, [[0, P(c)], [2, crouch, 'in'], [4, rise, 'out'], [5, slam, 'in'], [6, slam], [7, P(c)]]);
  },
};

/** Canalizar: los brazos al frente, sosteniendo un rayo o un chorro de energía (en bucle). */
export const channel: AnimDef = {
  name: 'channel', pack: 'skills', fps: 10, loop: true, steady: true, views: [...eight],
  build: (c) =>
    [0, 1, 0, -1, 0, 1].map((k) => P(c, {
      torso: 8 + k, legs: feet(c, 0.3, 0.3),
      arms: { near: { shoulder: 86 + k * 3, elbow: 4, spread: 12 }, far: { shoulder: 84 - k * 3, elbow: 6, spread: 12 } },
      face: { eyes: 'angry', mouth: k ? 'open' : 'line' },
    })),
};

/** Torbellino: gira con el arma afuera. Cada cuadro mira a una de las 8 direcciones. */
export const whirlwind: AnimDef = {
  name: 'whirlwind', pack: 'skills', fps: 16, loop: true, spin: true, views: [...eight],
  build: (c) =>
    Array.from({ length: 8 }, (_, i) => P(c, {
      torso: 6, legs: feet(c, 0.35, 0.3),
      arms: { near: { shoulder: 92, elbow: 0, spread: 80 }, far: { shoulder: 92, elbow: 0, spread: 80 } },
      face: { eyes: 'angry', mouth: i % 2 ? 'grin' : 'line' },
    })),
};

/** Salto de ataque: se agacha, salta con el arma arriba y cae golpeando. En el sitio (el juego mueve al personaje). */
export const leap: AnimDef = {
  name: 'leap', pack: 'skills', fps: 12, loop: false, views: [...eight],
  build: (c) => {
    const L = c.L, u = c.u;
    const crouch = P(c, { legs: feet(c, 0.7, 0.25), torso: 20, arms: { near: { shoulder: -40, elbow: 30 }, far: { shoulder: -30, elbow: 30 } } });
    const up = P(c, { air: Math.round(6 * u), torso: -10, legs: { near: { x: 0.2 * L, y: 0.6 * L, toe: 40 }, far: { x: -0.3 * L, y: 0.6 * L, toe: 50 } }, arms: { near: { shoulder: 175, elbow: 20 }, far: { shoulder: 160, elbow: 20 } }, face: { eyes: 'angry', mouth: 'open' } });
    const top = { ...up, air: Math.round(8 * u) };
    const slam = P(c, { legs: feet(c, 0.65, 0.3), torso: 30, arms: { near: { shoulder: 80, elbow: 0 }, far: { shoulder: 40, elbow: 20 } }, face: { eyes: 'angry', mouth: 'grin' } });
    return keyed(9, [[0, P(c)], [1, crouch], [3, up, 'out'], [4, top], [6, slam, 'in'], [7, slam], [8, P(c)]]);
  },
};

/** Carga: corre agachado con el escudo y el arma al frente (en bucle). */
export const charge: AnimDef = {
  name: 'charge', pack: 'skills', fps: 14, loop: true, hairTrail: -1, views: [...eight],
  build: (c) => run.build(c).map((p) => ({
    ...p, torso: 26,
    arms: { near: { shoulder: 70, elbow: 20 }, far: { shoulder: 85, elbow: 40 } },
    face: { eyes: 'angry' as const, mouth: 'line' as const },
  })),
};

/** Esquivar: un salto corto hacia atrás, agachado. */
export const dodge: AnimDef = {
  name: 'dodge', pack: 'skills', fps: 14, loop: false, views: [...eight],
  build: (c) => {
    const L = c.L, u = c.u;
    const load = P(c, { legs: feet(c, 0.6, 0.2), torso: 14, arms: { near: { shoulder: 40, elbow: 60 }, far: { shoulder: 30, elbow: 60 } } });
    const hop = P(c, { air: Math.round(3 * u), torso: -18, legs: { near: { x: 0.25 * L, y: 0.65 * L, toe: 30 }, far: { x: 0.05 * L, y: 0.7 * L, toe: 30 } }, arms: { near: { shoulder: 60, elbow: 40, spread: 30 }, far: { shoulder: 50, elbow: 40, spread: 30 } } });
    const land = P(c, { legs: feet(c, 0.55, 0.3), torso: 10, arms: { near: { shoulder: 30, elbow: 60 }, far: { shoulder: 20, elbow: 60 } } });
    return keyed(6, [[0, load], [2, hop, 'out'], [4, land, 'in'], [5, P(c)]]);
  },
};

/** Disparar con arco: tensa la cuerda hasta el pecho y suelta. */
export const shootBow: AnimDef = {
  name: 'shoot_bow', pack: 'skills', fps: 12, loop: false, views: [...eight],
  build: (c) => {
    const bow: PropState = { kind: 'bow', at: 'handFar', angle: 0 };
    const arrow: PropState = { kind: 'arrow', at: 'handNear', angle: 0, x: 3 * c.u };
    const aim = P(c, { legs: feet(c, 0.2, 0.32), torso: 2, arms: { far: { shoulder: 90, elbow: 0 }, near: { shoulder: 80, elbow: 100 } }, face: { eyes: 'angry', mouth: 'line' } });
    const draw = P(c, { ...aim, arms: { far: { shoulder: 90, elbow: 0 }, near: { shoulder: 55, elbow: 140 } } });
    const release = P(c, { ...aim, arms: { far: { shoulder: 92, elbow: 0 }, near: { shoulder: -15, elbow: 40 } }, face: { eyes: 'angry', mouth: 'open' } });
    const seq = keyed(7, [[0, P(c)], [1, aim, 'in'], [3, draw], [4, release, 'out'], [5, release], [6, P(c)]]);
    return seq.map((p, i) => ({ ...p, props: i === 0 || i === 6 ? [] : i <= 3 ? [bow, arrow] : [bow] }));
  },
};

/** Invocar: rodilla al piso, brazos arriba y se levanta (esqueletos, espíritus, golems). */
export const summon: AnimDef = {
  name: 'summon', pack: 'skills', fps: 10, loop: false, views: [...eight],
  build: (c) => {
    const L = c.L;
    const kneel = P(c, { torso: 18, legs: { near: { x: 0.45 * L, y: 0.5 * L }, far: { x: -0.35 * L, y: 0.45 * L, toe: 60 } }, arms: { near: { shoulder: 60, elbow: 40 }, far: { shoulder: 40, elbow: 40 } }, head: { tilt: 12 }, face: { eyes: 'closed', mouth: 'line' } });
    const call = P(c, { torso: -6, legs: feet(c, 0.2, 0.25), head: { tilt: -18 }, arms: { near: { shoulder: 165, elbow: 10, spread: 40 }, far: { shoulder: 165, elbow: 10, spread: 40 } }, face: { eyes: 'angry', mouth: 'open' } });
    return keyed(8, [[0, P(c)], [2, kneel, 'in'], [4, kneel], [6, call, 'out'], [7, call]]);
  },
};

/** Grito de guerra (aura, mejora): saca el pecho y flexiona los brazos. */
export const warcry: AnimDef = {
  name: 'warcry', pack: 'skills', fps: 10, loop: false, views: [...eight],
  build: (c) => {
    const load = P(c, { legs: feet(c, 0.45, 0.28), torso: 14, arms: { near: { shoulder: 20, elbow: 100 }, far: { shoulder: 20, elbow: 100 } }, head: { tilt: 10 } });
    const roar = P(c, { legs: feet(c, 0.2, 0.32), torso: -12, head: { tilt: -22 }, arms: { near: { shoulder: 60, elbow: 120, spread: 50 }, far: { shoulder: 60, elbow: 120, spread: 50 } }, face: { eyes: 'angry', mouth: 'open' } });
    return keyed(7, [[0, P(c)], [2, load, 'in'], [3, roar, 'out'], [5, roar], [6, P(c)]]);
  },
};

/** Golpe pesado a dos manos: arma por encima de la cabeza y la baja de golpe. */
export const attackHeavy: AnimDef = {
  name: 'attack_heavy', pack: 'skills', fps: 12, loop: false, views: [...eight],
  build: (c) => {
    const L = c.L;
    const wind = P(c, { torso: -14, legs: feet(c, 0.3, 0.26), arms: { near: { shoulder: 175, elbow: 30 }, far: { shoulder: 170, elbow: 35 } }, face: { eyes: 'angry', mouth: 'line' } });
    const smash = P(c, { torso: 28, legs: { near: { x: 0.45 * L, y: L - 1.6 }, far: { x: -0.35 * L, y: L - 1 } }, arms: { near: { shoulder: 70, elbow: 0 }, far: { shoulder: 65, elbow: 5 } }, face: { eyes: 'angry', mouth: 'grin' } });
    return keyed(7, [[0, P(c)], [2, wind, 'in'], [3, smash, 'out'], [5, smash], [6, P(c)]]);
  },
};

/** Estocada: un paso al frente con el brazo estirado (lanza, daga, estoque). */
export const attackThrust: AnimDef = {
  name: 'attack_thrust', pack: 'skills', fps: 14, loop: false, views: [...eight],
  build: (c) => {
    const L = c.L;
    const back = P(c, { torso: -6, legs: feet(c, 0.3, 0.24), arms: { near: { shoulder: 60, elbow: 100 }, far: { shoulder: 30, elbow: 60 } }, face: { eyes: 'angry', mouth: 'line' } });
    const stab = P(c, { torso: 18, legs: { near: { x: 0.55 * L, y: L - 1.2 }, far: { x: -0.35 * L, y: L - 0.6 } }, arms: { near: { shoulder: 88, elbow: 0 }, far: { shoulder: -10, elbow: 40 } }, face: { eyes: 'angry', mouth: 'grin' } });
    const seq = keyed(6, [[0, P(c)], [1, back, 'in'], [2, stab, 'out'], [4, stab], [5, P(c)]]);
    // el arma apunta al frente mientras pincha
    return seq.map((p, i) => (i >= 2 && i <= 4 ? { ...p, props: [{ kind: 'sword', at: 'handNear', angle: 0 } as PropState] } : p));
  },
};

export const SKILLS: AnimDef[] = [cast, nova, channel, whirlwind, leap, charge, dodge, shootBow, summon, warcry, attackHeavy, attackThrust];

// ---------- enemigos ----------

/** Zombi: camina lento, arrastrando, con los brazos estirados al frente. */
export const zombieWalk: AnimDef = {
  name: 'zombie_walk', pack: 'enemy', fps: 7, loop: true, views: [...eight],
  build: (c) => walk.build(c).map((p, i) => ({
    ...p, torso: 12, head: { ...p.head, tilt: 14 },
    arms: { near: { shoulder: 84 + (i % 2) * 4, elbow: 6 }, far: { shoulder: 80 - (i % 2) * 4, elbow: 8 } },
  })),
};

/** Zarpazo: barre con las dos manos (lobos, bestias, demonios). */
export const claw: AnimDef = {
  name: 'claw', pack: 'enemy', fps: 14, loop: false, views: [...eight],
  build: (c) => {
    const L = c.L;
    const up = P(c, { torso: -10, legs: feet(c, 0.35, 0.26), arms: { near: { shoulder: 160, elbow: 40, spread: 20 }, far: { shoulder: 150, elbow: 40, spread: 20 } }, face: { eyes: 'angry', mouth: 'open' } });
    const swipe = P(c, { torso: 24, legs: { near: { x: 0.45 * L, y: L - 1.2 }, far: { x: -0.3 * L, y: L - 0.6 } }, arms: { near: { shoulder: 50, elbow: 10, spread: 10 }, far: { shoulder: 70, elbow: 10, spread: 10 } }, face: { eyes: 'angry', mouth: 'grin' } });
    return keyed(6, [[0, P(c)], [1, up, 'in'], [3, swipe, 'out'], [4, swipe], [5, P(c)]]);
  },
};

/** Embestida o mordida: se lanza con la cabeza por delante. */
export const lunge: AnimDef = {
  name: 'lunge', pack: 'enemy', fps: 14, loop: false, views: [...eight],
  build: (c) => {
    const L = c.L;
    const coil = P(c, { torso: 10, legs: feet(c, 0.55, 0.22), arms: { near: { shoulder: 20, elbow: 70 }, far: { shoulder: 10, elbow: 70 } }, head: { tilt: 10 } });
    const strike = P(c, { torso: 40, legs: { near: { x: 0.6 * L, y: L - 1.5 }, far: { x: -0.45 * L, y: L - 0.4, toe: 40 } }, head: { tilt: -20, dx: 1 }, arms: { near: { shoulder: 70, elbow: 20 }, far: { shoulder: 60, elbow: 20 } }, face: { eyes: 'angry', mouth: 'open' } });
    return keyed(6, [[0, P(c)], [1, coil, 'in'], [3, strike, 'out'], [4, strike], [5, P(c)]]);
  },
};

/** Levantarse del piso (esqueletos y no muertos que se arman al aparecer). */
export const rise: AnimDef = {
  name: 'rise', pack: 'enemy', fps: 8, loop: false, views: [...eight],
  build: (c) => [...hold([die.build(c)[7]], 2), ...die.build(c).slice(1, 6).reverse(), P(c)] as Pose[],
};

export const ENEMY: AnimDef[] = [zombieWalk, claw, lunge, rise];
