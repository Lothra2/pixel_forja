import type { Pose, PropState } from '../rig/pose';
import { type AnimDef, type Ctx, P } from './types';

/**
 * Peleas premium (estilo juego de pelea): guardia que rebota, desplazamiento, jab, directo, gancho, uppercut,
 * patada baja, patada alta, patada voladora, bloqueo, esquiva, golpe recibido, nocaut y victoria.
 *
 * Cada golpe tiene anticipación (se carga), un cuadro de contacto con chispa de impacto y el evento "impacto" (para
 * el hitstop, el sonido y el daño), y una recuperación más larga que el golpe: así se siente el peso.
 * En el chibi el brazo lejano queda escondido detrás del cuerpo y de la cabeza grande: todos los golpes salen con el
 * brazo cercano (el que se ve) y se distinguen por el cuerpo: el jab casi sin girar, el directo con todo el giro,
 * el gancho en curva y el uppercut de abajo hacia arriba.
 */

const spark = (at: PropState['at'], angle = 0): PropState => ({ kind: 'spark', at, angles: { side: angle, se: angle + 10, ne: angle - 10 }, front: true });
const fierce = { eyes: 'angry' as const, mouth: 'line' as const };
const shout = { eyes: 'angry' as const, mouth: 'grin' as const };

/** Guardia de pelea: de perfil, el pie de adelante y las manos arriba cerca de la cara. b = rebote (0 o 1). */
function stance(c: Ctx, b = 0): Pose {
  const L = c.L;
  return P(c, {
    torso: 8, x: -c.u, head: { tilt: 6 },
    legs: { near: { x: -0.3 * L, y: L - 1.1 + b * 0.8, toe: 20 }, far: { x: 0.35 * L, y: L - 1.1 + b * 0.8 } },
    arms: { near: { shoulder: 55, elbow: 125 }, far: { shoulder: 75, elbow: 105 } },
    face: fierce, support: 'both',
  });
}

export const guard: AnimDef = {
  name: 'guard', pack: 'martial', fps: 8, loop: true, steady: true, views: ['side', 'front', 'back'],
  build: (c) => [0, 0, 1, 1, 0, 0, 1, 1].map((b, i) => ({ ...stance(c, b), arms: { near: { shoulder: 55 - (b ? 4 : 0), elbow: 125 }, far: { shoulder: 75 + (i % 4 === 1 ? 4 : 0), elbow: 105 } } })),
};

/** Desplazamiento en guardia: el pie de adelante avanza y el de atrás lo sigue, sin cruzar las piernas. */
export const fightStep: AnimDef = {
  name: 'fight_step', pack: 'martial', fps: 10, loop: true, steady: true, views: ['side', 'front', 'back'],
  events: [{ type: 'paso', phase: 0, foot: 'far' }, { type: 'paso', phase: 0.5, foot: 'near' }],
  build: (c) => {
    const L = c.L;
    const s = stance(c);
    const lead = (k: number): Pose => ({ ...s, legs: { near: { ...s.legs.near, x: (-0.3 - 0.12 * k) * L }, far: { ...s.legs.far, x: (0.35 + 0.15 * k) * L, y: s.legs.far.y - (k > 0 && k < 1 ? 0.15 * L : 0) } }, support: 'near' });
    const trail = (k: number): Pose => ({ ...s, legs: { near: { ...s.legs.near, x: (-0.42 + 0.12 * k) * L, y: s.legs.near.y - (k > 0 && k < 1 ? 0.15 * L : 0) }, far: { ...s.legs.far, x: (0.5 - 0.15 * k) * L } }, support: 'far' });
    return [lead(0), lead(0.5), lead(1), lead(1), trail(0), trail(0.5), trail(1), trail(1)];
  },
};

/** Jab: rápido y corto con la mano de adelante, sin cargar; vuelve enseguida a la guardia. */
export const jab: AnimDef = {
  name: 'jab', pack: 'martial', fps: 16, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 2 / 6 }],
  build: (c) => {
    const s = stance(c);
    // sin cargar ni girar: solo el brazo sale y vuelve
    const ext = P(c, { ...s, torso: 11, arms: { near: { shoulder: 88, elbow: 0 }, far: s.arms.far }, face: shout });
    return [s, { ...ext, arms: { near: { shoulder: 80, elbow: 60 }, far: s.arms.far } }, { ...ext, props: [spark('handNear')] }, ext, { ...s, arms: { near: { shoulder: 70, elbow: 90 }, far: s.arms.far } }, s];
  },
};

/** Directo: la mano de atrás cruza con giro de cadera; el peso pasa al pie de adelante y el talón de atrás sube. */
export const punch: AnimDef = {
  name: 'punch', pack: 'martial', fps: 14, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 3 / 8 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const s = stance(c);
    // carga: el hombro de atrás se va un poco atrás, la mano baja a la mejilla
    const load = P(c, { ...s, torso: 2, x: -2 * u, arms: { near: { shoulder: 40, elbow: 135 }, far: { shoulder: 80, elbow: 100 } } });
    const hit = P(c, { torso: 20, x: u, head: { tilt: 0 }, legs: { near: { x: -0.4 * L, y: L - 0.6, toe: 50 }, far: { x: 0.4 * L, y: L - 1.3 } },
      arms: { near: { shoulder: 90, elbow: 0 }, far: { shoulder: 50, elbow: 120 } }, face: shout, support: 'far' });
    const over = { ...hit, torso: 22 };
    const back = P(c, { ...s, torso: 12, arms: { near: { shoulder: 70, elbow: 90 }, far: { shoulder: 70, elbow: 110 } } });
    return [s, load, load, { ...hit, props: [spark('handNear')] }, over, back, s, s];
  },
};

/** Gancho: con el codo a 90 grados la mano de adelante barre en curva; el cuerpo gira detrás del brazo. */
export const hook: AnimDef = {
  name: 'hook', pack: 'martial', fps: 14, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 3 / 8 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const s = stance(c);
    // carga: el codo se abre hacia atrás y afuera, el cuerpo gira para atrás
    const load = P(c, { ...s, torso: 0, x: -2 * u, arms: { near: { shoulder: 20, elbow: 100, spread: 40 }, far: s.arms.far } });
    // el gancho: el brazo doblado a 90 grados barre en curva y cierra adelante, el cuerpo gira detrás
    const hit = P(c, { torso: 18, x: 0, legs: { near: { x: -0.35 * L, y: L - 0.9, toe: 30 }, far: { x: 0.35 * L, y: L - 1.2 } },
      arms: { near: { shoulder: 80, elbow: 90, spread: 10 }, far: s.arms.far }, face: shout, support: 'far' });
    const through = { ...hit, torso: 20, arms: { near: { shoulder: 85, elbow: 100, spread: -15 }, far: s.arms.far } };
    return [s, load, load, { ...hit, props: [spark('handNear', 20)] }, through, through, s, s];
  },
};

/** Uppercut: baja el cuerpo, la mano de atrás sube desde la cadera hasta arriba y todo el cuerpo se estira con ella. */
export const uppercut: AnimDef = {
  name: 'uppercut', pack: 'martial', fps: 14, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 3 / 9 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const s = stance(c);
    const dip = P(c, { torso: 18, x: -u, legs: { near: { x: -0.35 * L, y: L - 2.2 }, far: { x: 0.35 * L, y: L - 2.2 } },
      arms: { near: { shoulder: 10, elbow: 100 }, far: { shoulder: 70, elbow: 110 } }, face: fierce, support: 'both' });
    const rise = P(c, { torso: -4, x: u, legs: { near: { x: -0.3 * L, y: L - 0.5, toe: 50 }, far: { x: 0.3 * L, y: L - 0.4 } },
      arms: { near: { shoulder: 120, elbow: 70 }, far: { shoulder: 60, elbow: 120 } }, face: shout, support: 'far' });
    const top = P(c, { ...rise, torso: -8, air: Math.max(1, Math.round(u)), arms: { near: { shoulder: 135, elbow: 50 }, far: { shoulder: 50, elbow: 120 } } });
    return [s, dip, dip, { ...rise, props: [spark('handNear', -60)] }, top, top, { ...s, torso: 12 }, s, s];
  },
};

/** Patada baja: corta a la pierna del rival con la canilla, el cuerpo inclinado atrás para equilibrar. */
export const lowKick: AnimDef = {
  name: 'low_kick', pack: 'martial', fps: 14, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 3 / 8 }],
  build: (c) => {
    const L = c.L;
    const s = stance(c);
    const lift = P(c, { torso: -4, legs: { near: { x: 0.1 * L, y: 0.55 * L, toe: 30 }, far: { x: 0.2 * L, y: L - 0.6 } },
      arms: { near: { shoulder: 50, elbow: 120 }, far: { shoulder: 60, elbow: 110 } }, face: fierce, support: 'far' });
    const hit = P(c, { torso: -14, legs: { near: { x: 0.9 * L, y: 0.6 * L, toe: 10 }, far: { x: 0.1 * L, y: L - 0.4 } },
      arms: { near: { shoulder: -30, elbow: 40 }, far: { shoulder: 70, elbow: 110 } }, face: shout, support: 'far' });
    return [s, lift, lift, { ...hit, props: [spark('footNear')] }, hit, lift, s, s];
  },
};

/** Patada alta: rodilla arriba, giro y la pierna se estira a la cabeza; los brazos se abren para equilibrar. */
export const kickMartial: AnimDef = {
  name: 'kick_martial', pack: 'martial', fps: 14, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 4 / 9 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const s = stance(c);
    const chamber = P(c, { torso: -10, legs: { near: { x: 0.35 * L, y: 0.25 * L, toe: 30 }, far: { x: -0.05 * L, y: L - 0.5 } },
      arms: { near: { shoulder: 50, elbow: 110 }, far: { shoulder: 60, elbow: 110 } }, face: fierce, support: 'far' });
    const ext = P(c, { torso: -32, x: -u, legs: { near: { x: 1.0 * L, y: -0.25 * L, toe: 0 }, far: { x: -0.1 * L, y: L - 0.6, toe: 20 } },
      arms: { near: { shoulder: -40, elbow: 30, spread: 30 }, far: { shoulder: 70, elbow: 100 } }, face: shout, support: 'far' });
    return [s, chamber, chamber, { ...ext, torso: -26 }, { ...ext, props: [spark('footNear', -20)] }, ext, chamber, s, s];
  },
};

/** Patada voladora: corre dos pasos, salta con la rodilla al pecho y estira la pierna en el aire. */
export const flyingKick: AnimDef = {
  name: 'flying_kick', pack: 'martial', fps: 14, loop: false, views: ['side', 'front', 'back'], lateral: true,
  events: [{ type: 'despegue', phase: 2 / 10 }, { type: 'impacto', phase: 4 / 10 }, { type: 'aterriza', phase: 7 / 10 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const R = (v: number) => Math.round(v * u);
    const s = stance(c);
    const run = P(c, { torso: 14, legs: { near: { x: 0.35 * L, y: L - 0.5 }, far: { x: -0.4 * L, y: L - 0.6, toe: 30 } }, arms: { near: { shoulder: -40, elbow: 80 }, far: { shoulder: 50, elbow: 80 } }, face: fierce, support: 'near' });
    const take = P(c, { torso: 0, rise: R(4), legs: { near: { x: 0.4 * L, y: 0.3 * L, toe: 20 }, far: { x: -0.1 * L, y: L - 0.2, toe: 50 } }, arms: { near: { shoulder: 60, elbow: 100 }, far: { shoulder: 70, elbow: 100 } }, face: fierce });
    const tuck = P(c, { torso: -10, rise: R(12), legs: { near: { x: 0.4 * L, y: 0.2 * L, toe: 20 }, far: { x: 0.1 * L, y: 0.35 * L, toe: 30 } }, arms: { near: { shoulder: 50, elbow: 110 }, far: { shoulder: 60, elbow: 110 } }, face: fierce });
    const kick = P(c, { torso: -30, x: -2 * u, rise: R(10), legs: { near: { x: 1.0 * L, y: 0.15 * L, toe: 0 }, far: { x: -0.2 * L, y: 0.5 * L, toe: 40 } }, arms: { near: { shoulder: -50, elbow: 30, spread: 30 }, far: { shoulder: 80, elbow: 90 } }, face: shout });
    const fall = P(c, { torso: -10, rise: R(4), legs: { near: { x: 0.4 * L, y: 0.6 * L, toe: 20 }, far: { x: -0.2 * L, y: 0.7 * L, toe: 30 } }, arms: { near: { shoulder: 30, elbow: 90 }, far: { shoulder: 60, elbow: 100 } }, face: fierce });
    const land = P(c, { torso: 14, legs: { near: { x: 0.35 * L, y: L - 1.8 }, far: { x: -0.35 * L, y: L - 1.8 } }, arms: { near: { shoulder: 40, elbow: 100 }, far: { shoulder: 60, elbow: 100 } }, face: fierce, support: 'both' });
    return [run, run, take, tuck, { ...kick, props: [spark('footNear', 10)] }, kick, fall, land, s, s];
  },
};

/** Bloqueo: los antebrazos se cierran delante de la cara, el golpe lo empuja un pixel y vuelve a la guardia. */
export const fightBlock: AnimDef = {
  name: 'fight_block', pack: 'martial', fps: 12, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 2 / 6 }],
  build: (c) => {
    const u = c.u;
    const s = stance(c);
    const cover = P(c, { ...s, torso: 14, head: { tilt: 14 }, arms: { near: { shoulder: 85, elbow: 140 }, far: { shoulder: 95, elbow: 135 } }, face: { eyes: 'closed', mouth: 'line' } });
    const jolt = { ...cover, x: cover.x - u, torso: 10, props: [spark('handNear', 0)] };
    return [s, cover, jolt, cover, cover, s];
  },
};

/** Esquiva: se agacha y se inclina hacia atrás para que el golpe pase por arriba (un "slip"). */
export const slip: AnimDef = {
  name: 'slip', pack: 'martial', fps: 14, loop: false, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L, u = c.u;
    const s = stance(c);
    const duck = P(c, { torso: 24, x: -2 * u, head: { tilt: 10 }, legs: { near: { x: -0.35 * L, y: L - 2.2 }, far: { x: 0.35 * L, y: L - 2 } },
      arms: { near: { shoulder: 70, elbow: 130 }, far: { shoulder: 80, elbow: 120 } }, face: fierce, support: 'both' });
    return [s, duck, duck, duck, { ...s, torso: 14 }, s];
  },
};

/** Golpe recibido: la cabeza se va para atrás, los brazos se abren y recupera la guardia. */
export const fightHit: AnimDef = {
  name: 'fight_hit', pack: 'martial', fps: 12, loop: false, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L, u = c.u;
    const s = stance(c);
    const snap = P(c, { torso: -16, x: -2 * u, head: { tilt: -16, dx: -u }, legs: { near: { x: -0.45 * L, y: L - 0.8 }, far: { x: 0.25 * L, y: L - 0.6 } },
      arms: { near: { shoulder: 20, elbow: 60, spread: 30 }, far: { shoulder: 40, elbow: 50, spread: 30 } }, face: { eyes: 'hurt', mouth: 'o' }, support: 'both' });
    return [snap, snap, { ...snap, torso: -10, head: { ...snap.head, tilt: -8, dx: 0 } }, { ...s, torso: 4 }, s, s];
  },
};

/** Nocaut: el golpe lo hace girar, las piernas se aflojan y cae de espalda, con un rebote. */
export const knockout: AnimDef = {
  name: 'knockout', pack: 'martial', fps: 10, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 6 / 10 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const dir = c.view === 'back' ? 1 : -1;
    const snap = P(c, { torso: -22, x: -2 * u, head: { tilt: -24, dx: -u }, legs: { near: { x: -0.45 * L, y: L - 0.6 }, far: { x: 0.2 * L, y: L - 0.5 } },
      arms: { near: { shoulder: -20, elbow: 30, spread: 40 }, far: { shoulder: 10, elbow: 30, spread: 40 } }, face: { eyes: 'hurt', mouth: 'o' }, support: 'both' });
    const wobble = P(c, { torso: -8, x: -u, head: { tilt: 12 }, legs: { near: { x: -0.2 * L, y: L - 1.4 }, far: { x: 0.25 * L, y: L - 1.2 } },
      arms: { near: { shoulder: 0, elbow: 10 }, far: { shoulder: 5, elbow: 10 } }, face: { eyes: 'closed', mouth: 'o' }, support: 'both' });
    // cae de espalda: tronco hacia atrás, las piernas se van al frente
    const fall = P(c, { torso: -55, x: -dir * 0.3 * L, legs: { near: { x: 0.5 * L, y: 0.5 * L, toe: 0 }, far: { x: 0.45 * L, y: 0.55 * L, toe: 0 } },
      arms: { near: { shoulder: 150, elbow: 30 }, far: { shoulder: 160, elbow: 30 } }, face: { eyes: 'closed', mouth: 'o' }, fit: true });
    const down = P(c, { torso: -88, legs: { near: { x: 0.75 * L, y: 0.1 * L, toe: -30 }, far: { x: 0.7 * L, y: 0.2 * L, toe: -30 } },
      arms: { near: { shoulder: 120, elbow: 40 }, far: { shoulder: 140, elbow: 30 } }, face: { eyes: 'closed', mouth: 'line' }, fit: true });
    const bounce = { ...down, air: Math.max(1, Math.round(u)) };
    return [snap, snap, wobble, wobble, fall, fall, down, bounce, down, down];
  },
};

/** Victoria: suelta la guardia, levanta el puño de atrás, festeja con un saltito y vuelve a mirar al rival. */
export const victory: AnimDef = {
  name: 'victory', pack: 'martial', fps: 8, loop: false, views: ['side', 'front', 'back'],
  build: (c) => {
    const u = c.u;
    const s = stance(c);
    const relax = P(c, { torso: 2, arms: { near: { shoulder: 20, elbow: 40 }, far: { shoulder: 15, elbow: 40 } }, face: { eyes: 'happy', mouth: 'smile' }, support: 'both' });
    const fist = P(c, { torso: -6, arms: { near: { shoulder: 150, elbow: 30, spread: 30 }, far: { shoulder: 20, elbow: 60 } }, face: { eyes: 'happy', mouth: 'grin' }, support: 'both' });
    const hop = { ...fist, air: Math.max(1, Math.round(2 * u)), arms: { near: { shoulder: 160, elbow: 10, spread: 40 }, far: { shoulder: 150, elbow: 20, spread: 40 } } };
    return [s, relax, fist, fist, hop, fist, fist, relax, s];
  },
};

export const FIGHT_NEW: AnimDef[] = [fightStep, jab, hook, uppercut, lowKick, flyingKick, fightBlock, slip, fightHit, knockout, victory];
export const FIGHT_PREMIUM: AnimDef[] = [guard, fightStep, jab, punch, hook, uppercut, lowKick, kickMartial, flyingKick, fightBlock, slip, fightHit, knockout, victory];
