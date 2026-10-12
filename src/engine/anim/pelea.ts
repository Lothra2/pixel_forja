import type { Pose } from '../rig/pose';
import { type AnimDef, type Ctx, P, feet } from './types';
import { street, spark, hurt, strain, fierce } from './brawl';

/**
 * La pelea del Kachinuki (lote P1): pisotón, lanzar desde el agarre, recibir el rodillazo, codazo hacia atrás, amague,
 * cabezazo, comer del piso, borde de la azotea y la burla y la victoria propias de cada atleta.
 *
 * Todo con las 3 vistas (de lado, de frente y de espalda): el kit arma las 8 direcciones y los datos por cuadro
 * (cajas, cuerpo, manos, cabeza, pies). Los golpes dicen qué pega con `joint`, así el `punto` del impacto cae en el
 * pie que pisa, en el codo o en la frente, y no en la mano que va más adelante.
 */

const R = (c: Ctx, v: number) => Math.max(1, Math.round(v * c.u));
const happy = { eyes: 'happy' as const, mouth: 'grin' as const };

// ---------------------------------------------------------------- golpes

/**
 * Pisotón al que está en el piso: sube la rodilla bien alto con el cuerpo hacia atrás, baja el pie de golpe con todo
 * el peso (impacto en el pie, abajo y adelante), aprieta un cuadro y vuelve a la guardia.
 */
export const stomp: AnimDef = {
  name: 'stomp', pack: 'brawl', fps: 14, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 3 / 6, joint: 'footNear' }],
  build: (c) => {
    const L = c.L;
    const knee = P(c, { torso: -8, legs: { near: { x: 0.4 * L, y: 0.52 * L, toe: -10 }, far: { x: -0.1 * L, y: L - 0.5 } }, arms: { near: { shoulder: 50, elbow: 70 }, far: { shoulder: 95, elbow: 40, spread: 20 } }, face: fierce, support: 'far' });
    const high = P(c, { torso: -14, x: -R(c, 1), legs: { near: { x: 0.45 * L, y: 0.38 * L, toe: -15 }, far: { x: -0.1 * L, y: L - 0.4 } }, arms: { near: { shoulder: 75, elbow: 60 }, far: { shoulder: 115, elbow: 30, spread: 30 } }, face: { eyes: 'angry', mouth: 'open' }, support: 'far' });
    const pisa = P(c, { torso: 16, x: R(c, 1), legs: { near: { x: 0.42 * L, y: L - 0.3, toe: 0 }, far: { x: -0.22 * L, y: L - 1.1, toe: 15 } }, arms: { near: { shoulder: -25, elbow: 40 }, far: { shoulder: -10, elbow: 50 } }, face: { eyes: 'angry', mouth: 'grin' }, support: 'near', props: [spark('footNear', 90)] });
    const aprieta = { ...pisa, torso: 13, props: [], legs: { near: { x: 0.42 * L, y: L - 0.5 }, far: { x: -0.22 * L, y: L - 1.3, toe: 15 } }, face: strain };
    return [street(c), knee, high, pisa, aprieta, street(c)];
  },
};

/**
 * Lanzar desde el agarre por encima del hombro, como en los Kunio: se agacha con el rival agarrado, lo sube por
 * delante, lo pasa por encima de la cabeza arqueando la espalda y lo suelta hacia atrás. La `carga` dice dónde va la
 * base del rival (el juego lo dibuja con `carried` hasta la suelta y con `thrown_spin` después).
 */
export const grabThrow: AnimDef = {
  name: 'grab_throw', pack: 'brawl', fps: 12, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'suelta', phase: 4 / 8 }],
  build: (c) => {
    const L = c.L;
    const hold = P(c, { torso: 8, legs: { near: { x: 0.35 * L, y: L - 0.9 }, far: { x: -0.3 * L, y: L - 0.7, toe: 15 } }, arms: { near: { shoulder: 88, elbow: 60 }, far: { shoulder: 92, elbow: 60 } }, face: strain, support: 'both' });
    const dip = P(c, { torso: 20, x: -R(c, 1), legs: feet(c, 0.6, 0.26), arms: { near: { shoulder: 70, elbow: 30 }, far: { shoulder: 74, elbow: 30 } }, face: strain, support: 'both', load: true });
    const sube = P(c, { torso: 4, legs: feet(c, 0.3, 0.24), arms: { near: { shoulder: 125, elbow: 20 }, far: { shoulder: 130, elbow: 20 } }, face: strain, support: 'both', load: true });
    const arriba = P(c, { torso: -18, x: -R(c, 1), legs: { near: { x: 0.3 * L, y: L - 0.7 }, far: { x: -0.25 * L, y: L - 0.9 } }, arms: { near: { shoulder: 172, elbow: -5 }, far: { shoulder: 176, elbow: -5 } }, face: { eyes: 'angry', mouth: 'open' }, support: 'both', load: true });
    const suelta = P(c, { torso: -30, x: -R(c, 2), legs: { near: { x: 0.35 * L, y: L - 0.6, toe: 10 }, far: { x: -0.2 * L, y: L - 1.0 } }, arms: { near: { shoulder: 196, elbow: -10 }, far: { shoulder: 200, elbow: -10 } }, face: { eyes: 'angry', mouth: 'open' }, support: 'far', load: true });
    const sigue = P(c, { torso: -20, x: -R(c, 2), legs: { near: { x: 0.3 * L, y: L - 0.6 }, far: { x: -0.25 * L, y: L - 1.0 } }, arms: { near: { shoulder: -40, elbow: 30 }, far: { shoulder: -30, elbow: 30 } }, face: fierce, support: 'far' });
    const vuelve = P(c, { torso: -4, x: -R(c, 1), legs: feet(c, 0.25, 0.22), arms: { near: { shoulder: 20, elbow: 40 }, far: { shoulder: 15, elbow: 40 } }, face: fierce, support: 'both' });
    return [hold, dip, sube, arriba, suelta, sigue, vuelve, street(c)];
  },
};

/**
 * El agarrado recibe el rodillazo: se dobla de golpe con las manos a la panza, la cabeza baja y los pies se le
 * despegan un poco, y vuelve a forcejear. Va con `knee_grab` del que agarra (el impacto lo marca ese).
 */
export const kneeHitReact: AnimDef = {
  name: 'knee_hit_react', pack: 'brawl', fps: 14, loop: false, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L;
    const tira = P(c, { torso: -8, x: -R(c, 1), head: { tilt: -8, dx: 0, dy: 0 }, legs: { near: { x: 0.2 * L, y: L - 0.6, toe: -10 }, far: { x: -0.25 * L, y: L - 0.5 } }, arms: { near: { shoulder: 50, elbow: 50, spread: 20 }, far: { shoulder: 60, elbow: 50, spread: 20 } }, face: hurt, support: 'both' });
    const dobla = P(c, { torso: 38, x: -R(c, 1), air: R(c, 1), head: { tilt: 18, dx: 0, dy: 0 }, legs: { near: { x: 0.12 * L, y: L - 1.6, toe: 20 }, far: { x: -0.12 * L, y: L - 1.4, toe: 20 } }, arms: { near: { shoulder: 25, elbow: 120 }, far: { shoulder: 30, elbow: 115 } }, face: { eyes: 'closed', mouth: 'o' }, support: 'both' });
    const aguanta = { ...dobla, air: 0, torso: 32, head: { tilt: 12, dx: 0, dy: 0 }, face: { eyes: 'hurt' as const, mouth: 'open' as const } };
    const sube = P(c, { torso: 14, x: -R(c, 1), legs: { near: { x: 0.15 * L, y: L - 0.9 }, far: { x: -0.2 * L, y: L - 0.8 } }, arms: { near: { shoulder: 35, elbow: 90 }, far: { shoulder: 40, elbow: 80 } }, face: hurt, support: 'both' });
    return [tira, dobla, aguanta, sube, tira];
  },
};

/**
 * Codazo hacia atrás, para cuando te rodean: mira por encima del hombro, carga el brazo adelante y lo clava atrás con
 * un paso corto hacia el que está detrás. El impacto es en el codo, que queda atrás del cuerpo.
 */
export const backElbow: AnimDef = {
  name: 'back_elbow', pack: 'brawl', fps: 14, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 3 / 6, joint: 'elbowNear' }],
  build: (c) => {
    const L = c.L;
    const mira = P(c, { torso: 4, head: { tilt: -6, dx: 0, dy: 0, yaw: -40 }, legs: feet(c, 0.25, 0.22), arms: { near: { shoulder: 60, elbow: 110 }, far: { shoulder: 70, elbow: 100 } }, face: fierce, support: 'both' });
    const carga = P(c, { torso: 12, head: { tilt: -4, dx: 0, dy: 0, yaw: -40 }, legs: feet(c, 0.3, 0.22), arms: { near: { shoulder: 95, elbow: 150 }, far: { shoulder: 60, elbow: 100 } }, face: fierce, support: 'both' });
    const clava = P(c, { torso: -22, x: -R(c, 3), head: { tilt: -12, dx: 0, dy: 0, yaw: -40 }, legs: { near: { x: 0.2 * L, y: L - 0.6, toe: -10 }, far: { x: -0.5 * L, y: L - 1.2 } }, arms: { near: { shoulder: -95, elbow: 110 }, far: { shoulder: 70, elbow: 120 } }, face: { eyes: 'angry', mouth: 'open' }, support: 'far', props: [spark('elbowNear', 180)] });
    const queda = { ...clava, props: [], torso: -18, x: -R(c, 3), face: strain };
    return [mira, carga, carga, clava, queda, street(c)];
  },
};

/**
 * Amague: un paso rápido y rasante hacia adelante, el cuerpo inclinado y los pies casi sin despegar, 6 cuadros. El
 * juego lo mueve con `desplazamiento`; para atrás, `dash_back`.
 */
export const dash: AnimDef = {
  name: 'dash', pack: 'brawl', fps: 16, loop: false, views: ['side', 'front', 'back'],
  travel: { ref: 'run', k: [0.6, 1.4, 1.6, 1.2, 0.5, 0.1] },
  events: [{ type: 'paso', phase: 4 / 6, foot: 'near' }],
  build: (c) => {
    const L = c.L;
    const arranca = P(c, { torso: 18, legs: { near: { x: 0.2 * L, y: L - 1.1 }, far: { x: -0.4 * L, y: L - 0.9, toe: 30 } }, arms: { near: { shoulder: 55, elbow: 110 }, far: { shoulder: 65, elbow: 100 } }, face: fierce, support: 'near' });
    const vuela = P(c, { torso: 24, air: R(c, 1), legs: { near: { x: 0.35 * L, y: L - 1.2, toe: 10 }, far: { x: -0.5 * L, y: L - 1.0, toe: 40 } }, arms: { near: { shoulder: 50, elbow: 115 }, far: { shoulder: 60, elbow: 105 } }, face: { eyes: 'angry', mouth: 'line' }, support: 'both' });
    const estira = { ...vuela, torso: 22, legs: { near: { x: 0.45 * L, y: L - 1.0 }, far: { x: -0.45 * L, y: L - 1.1, toe: 40 } } };
    const pisa = P(c, { torso: 14, legs: { near: { x: 0.35 * L, y: L - 1.3 }, far: { x: -0.35 * L, y: L - 1.0, toe: 20 } }, arms: { near: { shoulder: 60, elbow: 110 }, far: { shoulder: 70, elbow: 100 } }, face: fierce, support: 'near' });
    const frena = { ...pisa, torso: 8, legs: { near: { x: 0.3 * L, y: L - 1.1 }, far: { x: -0.3 * L, y: L - 1.0, toe: 10 } } };
    return [arranca, vuela, estira, pisa, frena, street(c)];
  },
};

/** Amague hacia atrás: el cuerpo se echa para atrás y salta bajito alejándose, con la guardia arriba. */
export const dashBack: AnimDef = {
  name: 'dash_back', pack: 'brawl', fps: 16, loop: false, views: ['side', 'front', 'back'],
  travel: { ref: 'run', k: [-0.5, -1.3, -1.5, -1.0, -0.4, 0] },
  events: [{ type: 'paso', phase: 4 / 6, foot: 'far' }],
  build: (c) => {
    const L = c.L;
    const empuja = P(c, { torso: -12, legs: { near: { x: 0.5 * L, y: L - 1.0, toe: -10 }, far: { x: -0.1 * L, y: L - 1.3 } }, arms: { near: { shoulder: 85, elbow: 120 }, far: { shoulder: 95, elbow: 110 } }, face: fierce, support: 'far' });
    const atras = P(c, { torso: -22, x: -R(c, 2), air: R(c, 2), legs: { near: { x: 0.45 * L, y: L - 1.6, toe: -20 }, far: { x: -0.2 * L, y: L - 1.2, toe: 20 } }, arms: { near: { shoulder: 100, elbow: 120 }, far: { shoulder: 110, elbow: 110 } }, face: { eyes: 'angry', mouth: 'open' }, support: 'both' });
    const cae = P(c, { torso: -10, x: -R(c, 1), legs: { near: { x: 0.35 * L, y: L - 1.2 }, far: { x: -0.35 * L, y: L - 1.5 } }, arms: { near: { shoulder: 80, elbow: 115 }, far: { shoulder: 90, elbow: 105 } }, face: fierce, support: 'far' });
    return [empuja, atras, atras, cae, { ...cae, torso: 2 }, street(c)];
  },
};

/**
 * Cabezazo corto: echa la cabeza y el cuerpo para atrás tomando impulso y los clava adelante. Impacto en la frente.
 */
export const headbutt: AnimDef = {
  name: 'headbutt', pack: 'brawl', fps: 14, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 3 / 6, joint: 'frente' }],
  build: (c) => {
    const L = c.L;
    const atras = P(c, { torso: -14, x: -R(c, 1), head: { tilt: -14, dx: 0, dy: 0 }, legs: { near: { x: 0.25 * L, y: L - 0.8 }, far: { x: -0.3 * L, y: L - 1.0 } }, arms: { near: { shoulder: 70, elbow: 90 }, far: { shoulder: 80, elbow: 85 } }, face: { eyes: 'angry', mouth: 'grin' }, support: 'far' });
    const mas = { ...atras, torso: -20, head: { tilt: -18, dx: 0, dy: 0 } };
    const clava = P(c, { torso: 26, x: R(c, 2), head: { tilt: 20, dx: R(c, 1), dy: 0 }, legs: { near: { x: 0.42 * L, y: L - 1.1 }, far: { x: -0.3 * L, y: L - 0.6, toe: 30 } }, arms: { near: { shoulder: 30, elbow: 60 }, far: { shoulder: 20, elbow: 60 } }, face: { eyes: 'closed', mouth: 'grin' }, support: 'near', props: [spark('body', 0)] });
    const rebota = { ...clava, props: [], torso: 14, x: R(c, 1), head: { tilt: 8, dx: 0, dy: 0 }, face: { eyes: 'hurt' as const, mouth: 'line' as const } };
    return [street(c), atras, mas, clava, rebota, street(c)];
  },
};

// ---------------------------------------------------------------- comer

/**
 * Comer lo que está en el piso: se agacha, lo agarra con la mano de adelante, se endereza, muerde dos veces con los
 * cachetes llenos y termina feliz (¡ÑAM!). El kit no dibuja la comida: el juego la pone en `manos` (la de adelante)
 * desde el cuadro 2 hasta el 5, y la saca cuando el atleta queda feliz.
 */
export const eat: AnimDef = {
  name: 'eat', pack: 'brawl', fps: 10, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 2 / 8, joint: 'handNear' }],
  build: (c) => {
    const agacha = P(c, { torso: 24, legs: feet(c, 0.7, 0.22), arms: { near: { shoulder: 35, elbow: 10 }, far: { shoulder: 20, elbow: 30 } }, face: { eyes: 'wide', mouth: 'o' }, support: 'both' });
    const agarra = P(c, { torso: 30, legs: feet(c, 0.95, 0.24), arms: { near: { shoulder: 40, elbow: 0 }, far: { shoulder: 15, elbow: 40 } }, face: { eyes: 'happy', mouth: 'o' }, support: 'both' });
    const sube = P(c, { torso: 4, legs: feet(c, 0.2, 0.2), arms: { near: { shoulder: 110, elbow: 120 }, far: { shoulder: 10, elbow: 40 } }, face: { eyes: 'happy', mouth: 'open' }, support: 'both' });
    const muerde = P(c, { torso: 6, head: { tilt: 8, dx: 0, dy: 0 }, legs: feet(c, 0.15, 0.2), arms: { near: { shoulder: 120, elbow: 130 }, far: { shoulder: 10, elbow: 40 } }, face: { eyes: 'closed', mouth: 'line' }, support: 'both' });
    const mastica = { ...muerde, head: { tilt: 2, dx: 0, dy: 0 }, face: { eyes: 'happy' as const, mouth: 'o' as const } };
    const nam = P(c, { torso: -6, air: R(c, 1), legs: feet(c, 0.1, 0.2), arms: { near: { shoulder: 150, elbow: 40, spread: 20 }, far: { shoulder: 140, elbow: 40, spread: 20 } }, face: happy, support: 'both' });
    return [agacha, agarra, agarra, sube, muerde, mastica, muerde, nam];
  },
};

// ---------------------------------------------------------------- el borde de la azotea

/**
 * Tambalearse en el borde: inclinado hacia el vacío, molinete con los brazos y el pie de atrás que no se despega.
 * En bucle, hasta que el juego decida si cae o recupera.
 */
export const edgeTeeter: AnimDef = {
  name: 'edge_teeter', pack: 'brawl', fps: 10, loop: true, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L;
    return Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2, s = Math.sin(a);
      return P(c, {
        torso: 14 + 8 * s, x: Math.round(s * c.u * 0.5), head: { tilt: 6 + 6 * s, dx: 0, dy: 0 },
        legs: { near: { x: 0.12 * L, y: L - 0.6, toe: -10 }, far: { x: -0.25 * L, y: L - 0.7, toe: 30 } },
        arms: { near: { shoulder: 90 + 60 * Math.sin(a), elbow: 10, spread: 30 }, far: { shoulder: 90 + 60 * Math.sin(a + Math.PI), elbow: 10, spread: 30 } },
        face: { eyes: 'wide', mouth: i % 4 < 2 ? 'o' : 'open' }, support: 'near',
      });
    });
  },
};

/**
 * Caerse de la azotea: pierde el equilibrio hacia adelante, se va de cabeza con los brazos arriba y las piernas
 * atrás, y queda cayendo (los últimos cuadros en bucle si el juego quiere seguir la caída). El juego baja el sprite.
 */
export const fallOff: AnimDef = {
  name: 'fall_off', pack: 'brawl', fps: 10, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'despegue', phase: 2 / 8 }],
  build: (c) => {
    const L = c.L;
    const pierde = P(c, { torso: 32, legs: { near: { x: 0.15 * L, y: L - 0.5, toe: -20 }, far: { x: -0.3 * L, y: L - 0.6, toe: 40 } }, arms: { near: { shoulder: 140, elbow: 10, spread: 30 }, far: { shoulder: 40, elbow: 10, spread: 30 } }, face: { eyes: 'wide', mouth: 'o' }, support: 'near' });
    const se_va = P(c, { torso: 55, air: R(c, 1), legs: { near: { x: -0.1 * L, y: 0.85 * L, toe: 30 }, far: { x: -0.35 * L, y: 0.7 * L, toe: 50 } }, arms: { near: { shoulder: 170, elbow: 10, spread: 40 }, far: { shoulder: 150, elbow: 10, spread: 40 } }, face: { eyes: 'wide', mouth: 'open' }, fit: true });
    const cabeza = P(c, { torso: 80, legs: { near: { x: -0.3 * L, y: 0.7 * L, toe: 40 }, far: { x: -0.45 * L, y: 0.5 * L, toe: 50 } }, arms: { near: { shoulder: 180, elbow: 5, spread: 40 }, far: { shoulder: 165, elbow: 10, spread: 40 } }, face: { eyes: 'wide', mouth: 'open' }, fit: true });
    const cae1 = { ...cabeza, torso: 95, legs: { near: { x: -0.35 * L, y: 0.5 * L, toe: 60 }, far: { x: -0.5 * L, y: 0.3 * L, toe: 60 } }, arms: { near: { shoulder: 195, elbow: 10, spread: 40 }, far: { shoulder: 175, elbow: 20, spread: 40 } } };
    const cae2 = { ...cae1, torso: 100, arms: { near: { shoulder: 170, elbow: 20, spread: 40 }, far: { shoulder: 195, elbow: 10, spread: 40 } }, face: { eyes: 'closed' as const, mouth: 'o' as const } };
    return [P(c, { ...pierde, torso: 22 }), pierde, se_va, cabeza, cae1, cae2, cae1, cae2];
  },
};

// ---------------------------------------------------------------- burlas propias

/** Las burlas y victorias propias de cada atleta: `taunt_<id>` y `victory_<id>`. El kit solo las dibuja para su dueño. */
export const PROPIAS = ['rick', 'steph', 'sophie', 'alana', 'kenji', 'ryu', 'goro', 'tetsu'] as const;

/** Rick: "pana, tranquilo". Las dos palmas hacia abajo, bajando despacio, con la cabeza ladeada y media sonrisa. */
const tauntRick: AnimDef = {
  name: 'taunt_rick', pack: 'brawl', fps: 8, loop: false, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L;
    const k = (s: number, tilt: number, mouth: 'smirk' | 'smile'): Pose => P(c, { torso: -2, head: { tilt, dx: 0, dy: 0 }, legs: { near: { x: 0.2 * L, y: L - 0.4 }, far: { x: -0.2 * L, y: L - 0.4 } }, arms: { near: { shoulder: s, elbow: 30, spread: 25 }, far: { shoulder: s - 8, elbow: 30, spread: 25 } }, face: { eyes: 'happy', mouth }, support: 'both' });
    return [street(c), k(95, 4, 'smirk'), k(80, 8, 'smirk'), k(65, 8, 'smile'), k(95, 6, 'smirk'), k(80, 10, 'smirk'), k(60, 10, 'smile'), k(60, 10, 'smile')];
  },
};

/** Steph: se cruza de brazos, ladea la cabeza y golpea el piso con la punta del pie, aburrida. */
const tauntSteph: AnimDef = {
  name: 'taunt_steph', pack: 'brawl', fps: 8, loop: false, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L;
    const k = (toe: number, tilt: number): Pose => P(c, { torso: -4, head: { tilt, dx: 0, dy: 0 }, legs: { near: { x: 0.22 * L, y: L - 0.4 - (toe ? 0.1 * L : 0), toe }, far: { x: -0.12 * L, y: L - 0.3 } }, arms: { near: { shoulder: 55, elbow: 125, spread: 10 }, far: { shoulder: 50, elbow: 130, spread: 10 } }, face: { eyes: 'closed', mouth: 'smirk' }, support: 'far' });
    return [street(c), k(0, -4), k(-35, -8), k(0, -8), k(-35, -8), k(0, -8), k(-35, -10), { ...k(0, -10), face: { eyes: 'happy', mouth: 'smirk' } }];
  },
};

/** Sophie: pistolita con los dedos, dispara dos veces con retroceso y sopla el humo del dedo. */
const tauntSophie: AnimDef = {
  name: 'taunt_sophie', pack: 'brawl', fps: 10, loop: false, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L;
    const k = (s: number, torso: number, face: Pose['face']): Pose => P(c, { torso, legs: { near: { x: 0.28 * L, y: L - 0.6 }, far: { x: -0.22 * L, y: L - 0.5 } }, arms: { near: { shoulder: s, elbow: 0 }, far: { shoulder: -20, elbow: 100 } }, face, support: 'both' });
    const apunta = k(92, 2, { eyes: 'angry', mouth: 'smirk' });
    const pum = k(110, -6, { eyes: 'happy', mouth: 'open' });
    const sopla = P(c, { torso: -4, head: { tilt: 6, dx: 0, dy: 0 }, legs: { near: { x: 0.2 * L, y: L - 0.4 }, far: { x: -0.2 * L, y: L - 0.4 } }, arms: { near: { shoulder: 130, elbow: 135 }, far: { shoulder: -20, elbow: 100 } }, face: { eyes: 'closed', mouth: 'o' }, support: 'both' });
    return [street(c), apunta, pum, apunta, pum, apunta, sopla, sopla, { ...sopla, face: { eyes: 'happy', mouth: 'grin' } }];
  },
};

/** Alana: se mete los dedos a la boca y silba llamando a Thor, después lo llama con la mano. */
const tauntAlana: AnimDef = {
  name: 'taunt_alana', pack: 'brawl', fps: 8, loop: false, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L;
    const silba = P(c, { torso: -8, head: { tilt: -10, dx: 0, dy: 0 }, legs: { near: { x: 0.2 * L, y: L - 0.4 }, far: { x: -0.2 * L, y: L - 0.4 } }, arms: { near: { shoulder: 140, elbow: 150 }, far: { shoulder: 135, elbow: 150 } }, face: { eyes: 'closed', mouth: 'o' }, support: 'both' });
    const fuerte = { ...silba, torso: -12, air: R(c, 1), head: { tilt: -14, dx: 0, dy: 0 } };
    const llama = (e: number): Pose => P(c, { torso: 2, legs: { near: { x: 0.25 * L, y: L - 0.4 }, far: { x: -0.2 * L, y: L - 0.4 } }, arms: { near: { shoulder: 100, elbow: e }, far: { shoulder: -10, elbow: 30 } }, face: happy, support: 'both' });
    return [street(c), silba, fuerte, silba, fuerte, llama(10), llama(90), llama(10), llama(90)];
  },
};

/** Kenji: se arregla el copete con la mano, la otra en el bolsillo, y sonríe de lado. */
const tauntKenji: AnimDef = {
  name: 'taunt_kenji', pack: 'brawl', fps: 8, loop: false, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L;
    const k = (s: number, e: number, tilt: number): Pose => P(c, { torso: -6, head: { tilt, dx: 0, dy: 0 }, legs: { near: { x: 0.18 * L, y: L - 0.4 }, far: { x: -0.22 * L, y: L - 0.4 } }, arms: { near: { shoulder: s, elbow: e }, far: { shoulder: -15, elbow: 70 } }, face: { eyes: 'angry', mouth: 'smirk' }, support: 'both' });
    return [street(c), k(150, 150, -6), k(165, 120, -10), k(160, 90, -12), k(150, 150, -6), k(165, 120, -10), k(160, 90, -12), { ...k(20, 30, -4), face: { eyes: 'happy', mouth: 'smirk' } }];
  },
};

/** Ryu: se ríe tapándose la boca con la mano, encogiendo los hombros en cada carcajada. */
const tauntRyu: AnimDef = {
  name: 'taunt_ryu', pack: 'brawl', fps: 10, loop: false, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L;
    const k = (dy: number, torso: number): Pose => P(c, { torso, head: { tilt: torso / 2, dx: 0, dy }, legs: { near: { x: 0.15 * L, y: L - 0.4 }, far: { x: -0.18 * L, y: L - 0.4 } }, arms: { near: { shoulder: 125, elbow: 145 }, far: { shoulder: 30, elbow: 110 } }, face: { eyes: 'happy', mouth: 'line' }, support: 'both' });
    return [street(c), k(0, 4), k(1, 10), k(0, 4), k(1, 12), k(0, 6), k(1, 12), k(0, 4), { ...k(0, -2), face: { eyes: 'happy', mouth: 'smirk' } }];
  },
};

/** Goro: se golpea la panza con las dos manos, una y otra, y se ríe con la boca abierta. */
const tauntGoro: AnimDef = {
  name: 'taunt_goro', pack: 'brawl', fps: 8, loop: false, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L;
    const k = (n: number, f: number, torso: number): Pose => P(c, { torso, legs: { near: { x: 0.28 * L, y: L - 0.7 }, far: { x: -0.28 * L, y: L - 0.7 } }, arms: { near: { shoulder: n, elbow: 90, spread: 20 }, far: { shoulder: f, elbow: 90, spread: 20 } }, face: { eyes: 'happy', mouth: 'open' }, support: 'both' });
    return [street(c), k(60, 20, -6), k(25, 60, -8), k(60, 20, -6), k(25, 60, -8), k(60, 20, -10), k(25, 60, -10), { ...k(40, 40, -12), face: happy }];
  },
};

/** Tetsu: saca la lengua con las manos en las orejas, moviendo los dedos, y salta de un pie al otro. */
const tauntTetsu: AnimDef = {
  name: 'taunt_tetsu', pack: 'brawl', fps: 10, loop: false, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L;
    const k = (pie: 'near' | 'far', e: number): Pose => P(c, { torso: 4, air: pie === 'near' ? R(c, 1) : 0, legs: pie === 'near' ? { near: { x: 0.2 * L, y: L - 0.7, toe: 20 }, far: { x: -0.18 * L, y: L - 0.5 } } : { near: { x: 0.18 * L, y: L - 0.5 }, far: { x: -0.2 * L, y: L - 0.7, toe: 20 } }, arms: { near: { shoulder: 150, elbow: e, spread: 30 }, far: { shoulder: 145, elbow: e, spread: 30 } }, face: { eyes: 'closed', mouth: 'tongue' }, support: pie === 'near' ? 'far' : 'near' });
    return [street(c), k('near', 150), k('far', 135), k('near', 150), k('far', 135), k('near', 150), k('far', 135), { ...k('far', 140), face: { eyes: 'happy', mouth: 'tongue' } }];
  },
};

// ---------------------------------------------------------------- victorias propias

/** Rick: puño al cielo y después los dos pulgares arriba, con una sonrisa enorme. */
const victoryRick: AnimDef = {
  name: 'victory_rick', pack: 'brawl', fps: 8, loop: false, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L;
    const puño = P(c, { torso: -6, legs: feet(c, 0.15, 0.22), arms: { near: { shoulder: 165, elbow: 20, spread: 20 }, far: { shoulder: 20, elbow: 70 } }, face: happy, support: 'both' });
    const salta = { ...puño, air: R(c, 2), legs: { near: { x: 0.2 * L, y: L - 1.2, toe: 30 }, far: { x: -0.15 * L, y: L - 1.0, toe: 30 } } };
    const pulgares = P(c, { torso: -2, legs: feet(c, 0.1, 0.22), arms: { near: { shoulder: 85, elbow: 70 }, far: { shoulder: 80, elbow: 70 } }, face: { eyes: 'happy', mouth: 'smile' }, support: 'both' });
    return [street(c), puño, salta, puño, pulgares, pulgares, { ...pulgares, head: { tilt: 6, dx: 0, dy: 0 } }, pulgares];
  },
};

/** Steph: se echa el pelo para atrás con la mano y queda con la mano en la cintura, segura. */
const victorySteph: AnimDef = {
  name: 'victory_steph', pack: 'brawl', fps: 8, loop: false, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L;
    const k = (s: number, e: number, tilt: number, face: Pose['face']): Pose => P(c, { torso: -4, head: { tilt, dx: 0, dy: 0 }, legs: { near: { x: 0.18 * L, y: L - 0.35 }, far: { x: -0.2 * L, y: L - 0.45, toe: 15 } }, arms: { near: { shoulder: s, elbow: e }, far: { shoulder: -30, elbow: 110 } }, face, support: 'far' });
    return [street(c), k(150, 140, -4, happy), k(175, 80, -12, { eyes: 'closed', mouth: 'smile' }), k(150, 30, -14, { eyes: 'closed', mouth: 'smile' }), k(-30, 110, -6, { eyes: 'happy', mouth: 'smirk' }), k(-30, 110, -6, { eyes: 'happy', mouth: 'smirk' }), k(-30, 110, -8, { eyes: 'happy', mouth: 'smile' })];
  },
};

/** Sophie: salta con un brazo arriba y la pierna doblada, cae y hace la V con los dedos. */
const victorySophie: AnimDef = {
  name: 'victory_sophie', pack: 'brawl', fps: 10, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'despegue', phase: 1 / 8 }, { type: 'aterriza', phase: 4 / 8 }],
  build: (c) => {
    const L = c.L;
    const agacha = P(c, { torso: 10, legs: feet(c, 0.5, 0.2), arms: { near: { shoulder: -10, elbow: 30 }, far: { shoulder: -15, elbow: 30 } }, face: happy, support: 'both' });
    const sube = P(c, { torso: -8, air: R(c, 4), legs: { near: { x: 0.25 * L, y: 0.55 * L, toe: 30 }, far: { x: -0.1 * L, y: L - 0.4, toe: 40 } }, arms: { near: { shoulder: 170, elbow: 5, spread: 20 }, far: { shoulder: 60, elbow: 60 } }, face: happy, support: 'both' });
    const arriba = { ...sube, air: R(c, 5) };
    const v = P(c, { torso: -2, legs: feet(c, 0.1, 0.22), arms: { near: { shoulder: 95, elbow: 120 }, far: { shoulder: -20, elbow: 100 } }, face: { eyes: 'closed', mouth: 'grin' }, support: 'both' });
    return [street(c), agacha, sube, arriba, agacha, v, v, { ...v, face: happy }];
  },
};

/** Alana: brinca de alegría una y otra vez con los dos brazos arriba, sacudiendo las manos. */
const victoryAlana: AnimDef = {
  name: 'victory_alana', pack: 'brawl', fps: 10, loop: false, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L;
    const k = (air: number, s: number): Pose => P(c, { torso: -4, air: R(c, air), legs: air ? { near: { x: 0.15 * L, y: L - 1.0, toe: 30 }, far: { x: -0.15 * L, y: L - 1.0, toe: 30 } } : feet(c, 0.3, 0.2), arms: { near: { shoulder: s, elbow: 20, spread: 35 }, far: { shoulder: s - 10, elbow: 20, spread: 35 } }, face: happy, support: 'both' });
    return [street(c), k(0, 150), k(3, 170), k(0, 150), k(3, 170), k(0, 150), k(3, 170), k(0, 160)];
  },
};

/** Kenji: brazos cruzados, mentón arriba, mirando al que perdió por encima del hombro. */
const victoryKenji: AnimDef = {
  name: 'victory_kenji', pack: 'brawl', fps: 6, loop: false, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L;
    const k = (tilt: number, face: Pose['face']): Pose => P(c, { torso: -8, head: { tilt, dx: 0, dy: 0 }, legs: { near: { x: 0.25 * L, y: L - 0.35 }, far: { x: -0.25 * L, y: L - 0.35 } }, arms: { near: { shoulder: 55, elbow: 125, spread: 10 }, far: { shoulder: 50, elbow: 130, spread: 10 } }, face, support: 'both' });
    return [street(c), k(-6, { eyes: 'angry', mouth: 'line' }), k(-12, { eyes: 'angry', mouth: 'smirk' }), k(-14, { eyes: 'closed', mouth: 'smirk' }), k(-14, { eyes: 'closed', mouth: 'smirk' }), k(-12, { eyes: 'angry', mouth: 'smirk' })];
  },
};

/** Ryu: reverencia burlona con una mano en el pecho y la otra atrás, y se endereza riéndose bajito. */
const victoryRyu: AnimDef = {
  name: 'victory_ryu', pack: 'brawl', fps: 8, loop: false, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L;
    const k = (torso: number, face: Pose['face']): Pose => P(c, { torso, head: { tilt: torso / 3, dx: 0, dy: 0 }, legs: { near: { x: 0.12 * L, y: L - 0.35 }, far: { x: -0.2 * L, y: L - 0.45, toe: 20 } }, arms: { near: { shoulder: 70, elbow: 130 }, far: { shoulder: -45, elbow: 60 } }, face, support: 'both' });
    return [street(c), k(10, { eyes: 'closed', mouth: 'smirk' }), k(35, { eyes: 'closed', mouth: 'smirk' }), k(42, { eyes: 'closed', mouth: 'smirk' }), k(42, { eyes: 'happy', mouth: 'smirk' }), k(10, { eyes: 'happy', mouth: 'line' }), k(-4, { eyes: 'happy', mouth: 'smirk' })];
  },
};

/** Goro: saca músculo con los dos brazos, se hincha y pega un grito. */
const victoryGoro: AnimDef = {
  name: 'victory_goro', pack: 'brawl', fps: 8, loop: false, views: ['side', 'front', 'back'],
  build: (c) => {
    const k = (s: number, e: number, torso: number, face: Pose['face']): Pose => P(c, { torso, legs: feet(c, 0.35, 0.28), arms: { near: { shoulder: s, elbow: e, spread: 50 }, far: { shoulder: s, elbow: e, spread: 50 } }, face, support: 'both' });
    return [street(c), k(60, 100, 6, { eyes: 'angry', mouth: 'grin' }), k(95, 140, -4, { eyes: 'angry', mouth: 'grin' }), k(100, 150, -8, { eyes: 'closed', mouth: 'open' }), k(100, 150, -10, { eyes: 'closed', mouth: 'open' }), k(95, 140, -6, { eyes: 'angry', mouth: 'grin' })];
  },
};

/** Tetsu: la V con los dedos al lado del ojo, guiña y saca la lengua, con un saltito. */
const victoryTetsu: AnimDef = {
  name: 'victory_tetsu', pack: 'brawl', fps: 10, loop: false, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L;
    const k = (air: number, face: Pose['face']): Pose => P(c, { torso: -6, air: R(c, air), head: { tilt: -8, dx: 0, dy: 0 }, legs: air ? { near: { x: 0.18 * L, y: L - 1.0, toe: 30 }, far: { x: -0.1 * L, y: L - 0.8, toe: 40 } } : { near: { x: 0.18 * L, y: L - 0.4 }, far: { x: -0.15 * L, y: L - 0.4 } }, arms: { near: { shoulder: 140, elbow: 140 }, far: { shoulder: -15, elbow: 60 } }, face, support: 'both' });
    return [street(c), k(2, { eyes: 'happy', mouth: 'grin' }), k(0, { eyes: 'happy', mouth: 'tongue' }), k(0, { eyes: 'closed', mouth: 'tongue' }), k(0, { eyes: 'happy', mouth: 'tongue' }), k(2, { eyes: 'happy', mouth: 'grin' }), k(0, { eyes: 'closed', mouth: 'tongue' })];
  },
};

export const TAUNTS_PROPIOS: AnimDef[] = [tauntRick, tauntSteph, tauntSophie, tauntAlana, tauntKenji, tauntRyu, tauntGoro, tauntTetsu];
export const VICTORIAS_PROPIAS: AnimDef[] = [victoryRick, victorySteph, victorySophie, victoryAlana, victoryKenji, victoryRyu, victoryGoro, victoryTetsu];

/** Todo el lote P1, en el orden en que va al kit. */
export const PELEA: AnimDef[] = [stomp, grabThrow, kneeHitReact, backElbow, dash, dashBack, headbutt, eat, edgeTeeter, fallOff, ...TAUNTS_PROPIOS, ...VICTORIAS_PROPIAS];

/**
 * Si una animación es propia de un atleta (`taunt_kenji`, `victory_rick`): el id del dueño. El kit solo la dibuja para
 * él. Sirve para cualquier juego: `<animación>_<id>` con un id de los atletas del kit.
 */
export function duenoDe(anim: string, ids: readonly string[]): string | null {
  for (const id of ids) if (anim.endsWith(`_${id}`) && anim.length > id.length + 1) return id;
  return null;
}


