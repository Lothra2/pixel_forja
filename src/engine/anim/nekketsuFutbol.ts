import { type Pose, keyed } from '../rig/pose';
import { type AnimDef, P, feet } from './types';
import { run } from './premium';
import { shotP } from './footballPremium';

/**
 * Fútbol Nekketsu. Los gestos del pack de fútbol son los de un partido de verdad, medidos y cortos. Estos son los de
 * Kunio y de Nintendo World Cup: todo se exagera para que se lea a 30 px en la cancha. El que festeja corre con los
 * dos brazos arriba y la boca abierta, el que carga mete el hombro con el cuerpo entero, el puñetazo sale de atrás de
 * la oreja y termina con el brazo estirado, el cabezazo se arquea y se dobla, el tiro fuerte despega del piso.
 * Los brazos van libres (`freeArms`) para que pasen la cabeza, que en el chibi normal no pasan.
 */

const joy = { eyes: 'happy' as const, mouth: 'grin' as const };
const fury = { eyes: 'angry' as const, mouth: 'open' as const };
/** Los dos brazos arriba en V, con las palmas abiertas: adelante de la cara de lado y a los costados de la cabeza de frente, que si no la cabeza del chibi los tapa. */
const up = (w: number): Pose['arms'] => ({ near: { shoulder: 168 + w, elbow: 0, spread: 24 }, far: { shoulder: 172 - w, elbow: 0, spread: 24 } }) as Pose['arms'];
const palms = { near: 'palma' as const, far: 'palma' as const };

/** El festejo de Nintendo World Cup: corre con los dos brazos arriba, el pecho afuera y gritando. */
export const nkGoalRun: AnimDef = {
  name: 'nk_goal_run', pack: 'football', fps: 14, loop: true, steady: true, hairTrail: -1,
  events: run.events,
  build: (c) => run.build(c).map((p, i) => ({
    ...p, torso: -8, load: true, arms: up(i % 4 < 2 ? 8 : -8), hands: palms,
    head: { ...p.head, tilt: -10 }, face: i % 4 < 2 ? joy : { eyes: 'happy' as const, mouth: 'open' as const },
  })),
};

/** ¡Banzai! Salta en el sitio con los brazos arriba y las piernas recogidas, una y otra vez. */
export const nkGoalJump: AnimDef = {
  name: 'nk_goal_jump', pack: 'football', fps: 12, loop: true,
  events: [{ type: 'despegue', phase: 1 / 8 }, { type: 'aterriza', phase: 6 / 8 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const crouch = P(c, { torso: 14, legs: feet(c, 0.6, 0.26), arms: { near: { shoulder: -35, elbow: 30, spread: 20 }, far: { shoulder: -35, elbow: 30, spread: 20 } }, face: joy, support: 'both' });
    const rise = P(c, { torso: -6, air: 5 * u, load: true, legs: { near: { x: 0.1 * L, y: L - 0.4, toe: 40 }, far: { x: -0.1 * L, y: L - 0.4, toe: 40 } }, arms: up(0), hands: palms, face: { eyes: 'happy', mouth: 'open' } });
    const apex = P(c, { torso: -10, air: 10 * u, load: true, legs: { near: { x: 0.32 * L, y: 0.52 * L, toe: 20 }, far: { x: -0.3 * L, y: 0.58 * L, toe: 50 } },
      arms: up(8), hands: palms, head: { dx: 0, dy: 0, tilt: -12 }, face: { eyes: 'happy', mouth: 'open' } });
    const fall = P(c, { torso: -2, air: 4 * u, load: true, legs: { near: { x: 0.12 * L, y: L - 0.5, toe: 25 }, far: { x: -0.12 * L, y: L - 0.5, toe: 25 } }, arms: up(-6), hands: palms, face: joy });
    return keyed(8, [[0, crouch], [1, crouch, 'out'], [2, rise], [3, apex, 'hold'], [4, apex], [5, fall], [6, crouch, 'out'], [7, crouch]], true);
  },
};

/** Parado con los dos brazos arriba, gritando el gol: se balancea en las rodillas y abre y cierra la boca (el juego lo hace saltar). */
export const nkBanzai: AnimDef = {
  name: 'nk_banzai', pack: 'football', fps: 10, loop: true,
  build: (c) => [0, 1, 0, 1].map((b, i) => P(c, { torso: -6 + b * 2, load: true, legs: feet(c, 0.12 + b * 0.22, 0.24), arms: up(i < 2 ? 6 : -6), hands: palms,
    head: { dx: 0, dy: 0, tilt: i < 2 ? -6 : 6 }, face: b ? joy : { eyes: 'happy' as const, mouth: 'open' as const }, support: 'both' })),
};

/** La carga con el hombro (el codazo de Kunio): se tira con el cuerpo entero, el antebrazo por delante. */
export const nkShoulder: AnimDef = {
  name: 'nk_shoulder', pack: 'football', fps: 16, loop: false, hairTrail: -1,
  events: [{ type: 'impacto', phase: 2 / 7, joint: 'elbowNear' }],
  travel: { ref: 'run', k: [0.4, 1.5, 1.6, 0.9, 0.3, 0.1] },
  build: (c) => {
    const L = c.L;
    const wind = P(c, { torso: -10, legs: { near: { x: -0.25 * L, y: L - 0.6, toe: 0 }, far: { x: 0.3 * L, y: L - 0.9, toe: 0 } },
      arms: { near: { shoulder: -55, elbow: 95, spread: 10 }, far: { shoulder: 60, elbow: 70, spread: 30 } }, face: fury, support: 'near' });
    const ram = P(c, { torso: 42, x: 0.1 * L, freeArms: true, legs: { near: { x: 0.62 * L, y: L - 0.7, toe: -10 }, far: { x: -0.78 * L, y: 0.8 * L, toe: 55 } },
      arms: { near: { shoulder: 78, elbow: 100, spread: 4 }, far: { shoulder: -70, elbow: 15, spread: 20 } }, head: { dx: 0, dy: 0, tilt: 14 }, face: fury, support: 'near' });
    const through = P(c, { ...ram, torso: 34, legs: { near: { x: 0.5 * L, y: L - 0.6, toe: 0 }, far: { x: -0.6 * L, y: 0.84 * L, toe: 45 } } });
    const back = P(c, { torso: 14, legs: feet(c, 0.4, 0.3), arms: { near: { shoulder: 40, elbow: 70, spread: 15 }, far: { shoulder: -10, elbow: 50, spread: 15 } }, face: { eyes: 'angry', mouth: 'line' }, support: 'both' });
    return keyed(7, [[0, wind], [1, wind, 'out'], [2, ram, 'hold'], [3, ram], [4, through], [6, back]]);
  },
};

/** El puñetazo de pelea callejera: lo trae desde atrás de la oreja y lo suelta con el brazo entero y el cuerpo encima. */
export const nkPunch: AnimDef = {
  name: 'nk_punch', pack: 'football', fps: 16, loop: false,
  events: [{ type: 'impacto', phase: 3 / 8, joint: 'handNear' }],
  build: (c) => {
    const L = c.L;
    const wind = P(c, { torso: -20, legs: { near: { x: -0.3 * L, y: L - 0.5, toe: 0 }, far: { x: 0.35 * L, y: L - 0.7, toe: 0 } },
      arms: { near: { shoulder: -75, elbow: 110, spread: 12 }, far: { shoulder: 70, elbow: 60, spread: 25 } }, head: { dx: 0, dy: 0, tilt: -8 }, face: fury, support: 'near' });
    const hit = P(c, { torso: 36, x: 0.08 * L, freeArms: true, legs: { near: { x: 0.6 * L, y: L - 0.7, toe: -5 }, far: { x: -0.66 * L, y: 0.86 * L, toe: 50 } },
      arms: { near: { shoulder: 92, elbow: 0, spread: 2 }, far: { shoulder: -60, elbow: 70, spread: 18 } }, head: { dx: 0, dy: 0, tilt: 10 }, face: fury, support: 'near' });
    const drag = P(c, { ...hit, torso: 28, arms: { near: { shoulder: 70, elbow: 20, spread: 2 }, far: { shoulder: -40, elbow: 60, spread: 18 } } });
    const back = P(c, { torso: 10, legs: feet(c, 0.35, 0.28), arms: { near: { shoulder: 30, elbow: 80, spread: 14 }, far: { shoulder: 20, elbow: 80, spread: 14 } }, face: { eyes: 'angry', mouth: 'line' }, support: 'both' });
    return keyed(8, [[0, wind], [2, wind, 'out'], [3, hit, 'hold'], [4, hit], [5, drag], [7, back]]);
  },
};

/** El cabezazo de Nekketsu: salta, se arquea hacia atrás con los brazos abiertos y se dobla entero sobre el balón. */
export const nkHeader: AnimDef = {
  name: 'nk_header', pack: 'football', fps: 14, loop: false,
  events: [{ type: 'despegue', phase: 1 / 8 }, { type: 'impacto', phase: 4 / 8, joint: 'frente' }, { type: 'aterriza', phase: 6 / 8 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const crouch = P(c, { torso: 16, legs: feet(c, 0.55, 0.24), arms: { near: { shoulder: -40, elbow: 30 }, far: { shoulder: -40, elbow: 30 } }, face: { eyes: 'angry', mouth: 'line' }, support: 'both' });
    const arch = P(c, { torso: -30, air: 7 * u, freeArms: true, legs: { near: { x: -0.2 * L, y: 0.8 * L, toe: 50 }, far: { x: -0.4 * L, y: 0.7 * L, toe: 60 } },
      arms: { near: { shoulder: 120, elbow: 30, spread: 60 }, far: { shoulder: 110, elbow: 30, spread: 60 } }, head: { dx: 0, dy: 0, tilt: -18 }, face: fury });
    const snap = P(c, { torso: 46, air: 8 * u, freeArms: true, legs: { near: { x: 0.35 * L, y: 0.62 * L, toe: 10 }, far: { x: -0.1 * L, y: 0.7 * L, toe: 30 } },
      arms: { near: { shoulder: -80, elbow: 20, spread: 30 }, far: { shoulder: -95, elbow: 20, spread: 30 } }, head: { dx: 1.5 * u, dy: 1 * u, tilt: 22 }, face: { eyes: 'closed', mouth: 'open' } });
    const fall = P(c, { torso: 24, air: 3 * u, legs: { near: { x: 0.2 * L, y: L - 0.6, toe: 20 }, far: { x: -0.15 * L, y: L - 0.6, toe: 20 } }, arms: { near: { shoulder: -40, elbow: 30, spread: 20 }, far: { shoulder: -50, elbow: 30, spread: 20 } }, face: fury });
    const land = P(c, { torso: 18, legs: feet(c, 0.5, 0.26), arms: { near: { shoulder: 20, elbow: 50, spread: 20 }, far: { shoulder: 10, elbow: 50, spread: 20 } }, face: { eyes: 'angry', mouth: 'line' }, support: 'both' });
    return keyed(8, [[0, crouch], [1, crouch, 'out'], [2, arch, 'hold'], [3, arch], [4, snap, 'hold'], [5, snap], [6, fall], [7, land]]);
  },
};

/** El pique de Kunio: el cuerpo echado adelante, los brazos bombeando de lado a lado y la zancada larga. */
export const nkSprint: AnimDef = {
  name: 'nk_sprint', pack: 'football', fps: 16, loop: true, steady: true, hairTrail: -1,
  events: run.events,
  build: (c) => run.build(c).map((p) => ({
    ...p, torso: 28, freeArms: true,
    arms: { near: { ...p.arms.near, shoulder: p.arms.near.shoulder * 1.5, elbow: 100 }, far: { ...p.arms.far, shoulder: p.arms.far.shoulder * 1.5, elbow: 100 } },
    legs: { near: { ...p.legs.near, x: p.legs.near.x * 1.18 }, far: { ...p.legs.far, x: p.legs.far.x * 1.18 } },
    head: { ...p.head, tilt: 8 }, face: { eyes: 'angry' as const, mouth: 'line' as const },
  })),
};

/** El tiro fuerte: abre los brazos al cargar, y al pegar el cuerpo se va atrás, la pierna sube sobre la cabeza y despega del piso. */
export const nkShot: AnimDef = {
  name: 'nk_shot', pack: 'football', fps: 14, loop: false,
  events: shotP.events, travel: shotP.travel,
  build: (c) => {
    const L = c.L, u = c.u, base = shotP.build(c);
    return base.map((p, i) => {
      if (i === 1 || i === 2) return { ...p, torso: -16, freeArms: true, arms: { near: { shoulder: -70, elbow: 20, spread: 30 }, far: { shoulder: 100, elbow: 10, spread: 70 } }, face: fury };
      if (i === 4) return { ...p, torso: -6, face: fury };
      if (i === 5 || i === 6) return { ...p, torso: -26, air: (i === 5 ? 4 : 6) * u, freeArms: true, legs: { far: { ...p.legs.far, toe: 40 }, near: { x: 0.8 * L, y: 0.14 * L, toe: 5 } },
        arms: { near: { shoulder: -50, elbow: 20, spread: 40 }, far: { shoulder: 130, elbow: 10, spread: 60 } }, head: { dx: 0, dy: 0, tilt: -10 }, face: fury };
      return p;
    });
  },
};

export const NEKKETSU_FUTBOL: AnimDef[] = [nkGoalRun, nkGoalJump, nkBanzai, nkShoulder, nkPunch, nkHeader, nkSprint, nkShot];
