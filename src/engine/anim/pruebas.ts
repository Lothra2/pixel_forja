import type { Pose, PropState } from '../rig/pose';
import { type AnimDef, type Ctx, P, feet } from './types';
import { strain, fierce, spark, down } from './brawl';

/**
 * Lo que faltaba de las pruebas del olímpico (lotes B4, B5 y B6 del pedido): la garrocha que no llega, el salto para
 * esquivar del Quemado, la Chapita con el palo de escoba a dos manos, el tejo y el judo (la guardia agarrado de la
 * solapa, la proyección y el que sale proyectado).
 *
 * Lo que se agarra o se lanza no va en el sprite, como en la pelea callejera:
 * - el palo de la Chapita es el arma del piso (`escoba`): el kit exporta `arma` por cuadro y el juego lo dibuja;
 * - el tejo también es un arma del piso (`tejo`): va en `arma` hasta la `suelta` y sale volando desde su `punto`;
 * - al rival del judo lo dibuja el juego con `judo_thrown`, con su base en la `carga` de quien lo proyecta.
 * La garrocha sí va dibujada, como en `pole_vault`.
 */

const R = (c: Ctx, v: number) => Math.max(1, Math.round(v * c.u));
const scared = { eyes: 'wide' as const, mouth: 'o' as const };

// ---------------------------------------------------------------- B4: la garrocha que no llega

/** La garrocha, igual que en `pole_vault`: sale de la mano cercana hasta el cajón, y se dobla con `bend`. */
const pole = (side: number, bend = 0): PropState => ({ kind: 'pole', at: 'handNear', angles: { side, se: side, ne: side, front: side + 90, back: side - 90 }, bend, front: true });

/**
 * La garrocha no llega: clava y despega como en `pole_vault`, pero la garrocha se queda corta. Se para casi derecha con
 * él colgado arriba, se le devuelve, él la suelta manoteando, cae de espalda (aterriza) y queda tirado viendo el
 * cielo. Sube con `elevacion` como la garrocha: el juego levanta el sprite sobre su sombra.
 */
export const vaultFail: AnimDef = {
  name: 'vault_fail', pack: 'athletics', lateral: true, fps: 12, loop: false, travel: { ref: 'sprint', k: [0.6, 0.3, 0.15, 0.05, 0, 0, 0, 0, 0, 0] }, views: ['side', 'front', 'back'],
  events: [{ type: 'aterriza', phase: 8 / 10 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const Rr = (v: number) => Math.round(v * u);
    const face = { eyes: 'angry' as const, mouth: 'line' as const };
    // clavada y despegue, los de `pole_vault`
    const plant = P(c, { torso: 4, legs: { near: { x: 0.3 * L, y: L - 0.6 }, far: { x: -0.45 * L, y: L - 0.8, toe: 30 } },
      arms: { near: { shoulder: 150, elbow: 20 }, far: { shoulder: 125, elbow: 30 } }, face, support: 'near', props: [pole(28)] });
    const take = P(c, { torso: -4, rise: Rr(4), legs: { near: { x: -0.35 * L, y: L - 0.1, toe: 50 }, far: { x: 0.4 * L, y: 0.35 * L, toe: 10 } },
      arms: { near: { shoulder: 165, elbow: 10 }, far: { shoulder: 140, elbow: 20 } }, face: { eyes: 'angry', mouth: 'open' }, props: [pole(48, 5)] });
    // péndulo con poca fuerza: las piernas suben menos que en un salto bueno
    const swing = P(c, { torso: -30, rise: Rr(10), legs: { near: { x: 0.5 * L, y: 0.5 * L, toe: 0 }, far: { x: 0.45 * L, y: 0.6 * L, toe: 0 } },
      arms: { near: { shoulder: 170, elbow: 5 }, far: { shoulder: 160, elbow: 10 } }, face, props: [pole(66, 6)] });
    // se queda: la garrocha casi derecha y él colgado, las piernas que cuelgan y la cara de "uy"
    const stall = P(c, { torso: -8, rise: Rr(16), legs: { near: { x: 0.15 * L, y: L - 0.5, toe: 30 }, far: { x: 0.05 * L, y: L - 0.3, toe: 30 } },
      arms: { near: { shoulder: 175, elbow: 5 }, far: { shoulder: 172, elbow: 5 } }, face: scared, props: [pole(80, 1)] });
    const wobble = { ...stall, torso: -4, rise: Rr(17), props: [pole(84)] };
    // se le devuelve: la garrocha se va para atrás y él con ella
    const back = P(c, { torso: -24, rise: Rr(13), legs: { near: { x: 0.3 * L, y: L - 1.5, toe: 20 }, far: { x: 0.2 * L, y: L - 1.0, toe: 20 } },
      arms: { near: { shoulder: 168, elbow: 10 }, far: { shoulder: 160, elbow: 15 } }, face: scared, props: [pole(62)] });
    // la suelta manoteando y cae de espalda
    const flail = P(c, { torso: -50, rise: Rr(9), legs: { near: { x: 0.6 * L, y: 0.3 * L, toe: 10 }, far: { x: 0.45 * L, y: 0.5 * L, toe: 10 } },
      arms: { near: { shoulder: 150, elbow: 30, spread: 30 }, far: { shoulder: 120, elbow: 40, spread: 30 } }, face: scared, fit: true });
    const fall = P(c, { ...flail, torso: -72, rise: Rr(4), arms: { near: { shoulder: 165, elbow: 30, spread: 30 }, far: { shoulder: 140, elbow: 30, spread: 30 } } });
    return [plant, take, { ...swing, fit: true }, { ...stall, fit: true }, { ...wobble, fit: true }, { ...back, fit: true }, flail, fall, down(c, 0, 'hurt'), down(c)];
  },
};

// ---------------------------------------------------------------- B4: judo

/** Judogi en guardia: rodillas dobladas, la mano cercana en la solapa del rival y la lejana en su manga. */
function kumikata(c: Ctx, t = 0, e = 0): Pose {
  const L = c.L;
  return P(c, {
    torso: 10 + t, x: Math.round((t / 4) * c.u),
    legs: { near: { x: 0.3 * L, y: L - 1.6 }, far: { x: -0.32 * L, y: L - 1.4, toe: 10 } },
    // solapa a la altura del pecho del rival (mano arriba y adelante); manga más abajo, a la altura del codo
    arms: { near: { shoulder: 100, elbow: 45 + e }, far: { shoulder: 70, elbow: 55 + e } },
    face: fierce, support: 'both',
  });
}

/**
 * Agarre de solapa: la guardia del judo con las dos manos en el judogi del rival. Tironea un poco adelante y atrás,
 * buscando el desequilibrio. El rival hace lo mismo enfrente.
 */
export const judoGrip: AnimDef = {
  name: 'judo_grip', pack: 'martial', fps: 10, loop: true, steady: true, views: ['side', 'front', 'back'],
  build: (c) => [kumikata(c, 0, 0), kumikata(c, 3, 10), kumikata(c, 1, 5), kumikata(c, -3, -5)],
};

/**
 * Proyección (seoi nage, en la vista de lado): desde el agarre jala al rival (lo desequilibra), se mete abajo de él
 * agachado, lo carga sobre el hombro, se endereza y lo azota adelante contra el tatami (impacto). Termina de pie
 * todavía agarrado de la manga, como se hace en el judo.
 *
 * El rival no va en el sprite: desde que lo carga hasta que cae, la `carga` de cada cuadro dice dónde va su base, y el
 * juego dibuja ahí a `judo_thrown`, que tiene los mismos 10 cuadros. En el seoi nage de verdad quien proyecta gira de
 * espaldas; de lado eso no se puede dibujar, así que se mete por debajo y lo pasa por encima del hombro.
 */
export const judoThrow: AnimDef = {
  name: 'judo_throw', pack: 'martial', fps: 14, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 6 / 10 }],
  build: (c) => {
    const L = c.L;
    const grip = kumikata(c);
    // kuzushi: se echa atrás y jala hacia él
    const pull = P(c, { torso: -6, x: -c.u, legs: { near: { x: 0.25 * L, y: L - 1.2 }, far: { x: -0.4 * L, y: L - 1.0, toe: 10 } },
      arms: { near: { shoulder: 80, elbow: 100 }, far: { shoulder: 50, elbow: 110 } }, face: strain, support: 'far' });
    // se mete: agachado a fondo, la espalda contra el pecho del rival
    const dip = P(c, { torso: 26, legs: feet(c, 0.95, 0.22), arms: { near: { shoulder: 140, elbow: 80 }, far: { shoulder: 120, elbow: 70 } }, face: strain, support: 'both' });
    // lo carga: el rival ya está encima del hombro
    const load = P(c, { torso: 18, legs: feet(c, 0.7, 0.24), arms: { near: { shoulder: 165, elbow: -5 }, far: { shoulder: 160, elbow: -5 } }, face: strain, support: 'both', load: true });
    // se endereza con él arriba
    const rise = P(c, { torso: 4, legs: feet(c, 0.3, 0.24), arms: { near: { shoulder: 172, elbow: -15 }, far: { shoulder: 170, elbow: -15 } }, face: strain, support: 'both', load: true });
    // lo pasa por encima y lo baja adelante con todo el cuerpo
    const over = P(c, { torso: 24, legs: { near: { x: 0.4 * L, y: L - 1.6 }, far: { x: -0.35 * L, y: L - 0.8, toe: 20 } },
      arms: { near: { shoulder: 95, elbow: 0 }, far: { shoulder: 92, elbow: 0 } }, face: { eyes: 'angry', mouth: 'open' }, support: 'near', load: true });
    // ¡tatami! el rival cae (impacto) y él sigue agachado sobre la proyección, agarrado de la manga
    const slam = P(c, { torso: 34, x: -c.u, legs: { near: { x: 0.42 * L, y: L - 2.2 }, far: { x: -0.35 * L, y: L - 1.0, toe: 30 } },
      arms: { near: { shoulder: 60, elbow: 0 }, far: { shoulder: 50, elbow: 10 } }, face: { eyes: 'angry', mouth: 'grin' }, support: 'near', props: [spark('handNear', 60)] });
    const hold = { ...slam, torso: 30, props: [] };
    const up = P(c, { torso: 14, legs: feet(c, 0.4, 0.24), arms: { near: { shoulder: 40, elbow: 10 }, far: { shoulder: 20, elbow: 20 } }, face: fierce, support: 'both' });
    return [grip, pull, dip, load, rise, over, slam, hold, up, P(c, { ...up, torso: 6, legs: feet(c, 0.15, 0.22) })];
  },
};

/**
 * Proyectado: la otra mitad de `judo_throw`, cuadro a cuadro. Agarrado y desequilibrado, sale de los pies, pasa por
 * el aire acostado y de cabeza, cae de espalda sobre el tatami (aterriza, junto con el impacto de quien lo proyecta),
 * rebota y queda tendido. Del cuadro 3 al 5 el juego lo pone con su base en la `carga` de quien lo proyecta.
 */
export const judoThrown: AnimDef = {
  name: 'judo_thrown', pack: 'martial', fps: 14, loop: false, lateral: true, views: ['side', 'front', 'back'],
  events: [{ type: 'aterriza', phase: 6 / 10 }],
  build: (c) => {
    const L = c.L;
    const grip = kumikata(c);
    // lo jalan: se va adelante en puntas, con los brazos todavía agarrados
    const pulled = P(c, { torso: 24, x: c.u, legs: { near: { x: 0.25 * L, y: L - 0.4, toe: 30 }, far: { x: -0.3 * L, y: L - 0.2, toe: 40 } },
      arms: { near: { shoulder: 100, elbow: 30 }, far: { shoulder: 85, elbow: 30 } }, face: scared, support: 'near' });
    const tip = { ...pulled, torso: 36, legs: { near: { x: 0.1 * L, y: L - 0.2, toe: 50 }, far: { x: -0.45 * L, y: L - 0.5, toe: 50 } } };
    // en el aire: acostado boca abajo, después boca arriba con las piernas arriba (pasa por encima)
    const air = (torso: number, nl: [number, number], fl: [number, number]): Pose => P(c, {
      torso, legs: { near: { x: nl[0] * L, y: nl[1] * L, toe: 20 }, far: { x: fl[0] * L, y: fl[1] * L, toe: 20 } },
      arms: { near: { shoulder: 150, elbow: 30, spread: 30 }, far: { shoulder: 130, elbow: 30, spread: 30 } }, face: scared, fit: true,
    });
    return [
      grip, pulled, tip,
      air(80, [-0.7, 0.2], [-0.6, 0.35]), air(150, [-0.3, -0.6], [-0.2, -0.5]), air(-120, [0.3, -0.7], [0.2, -0.6]),
      down(c, 0, 'hurt'), down(c, R(c, 2), 'hurt'), down(c, 0, 'hurt'), down(c),
    ];
  },
};

// ---------------------------------------------------------------- B5: Quemado

/**
 * Salto para esquivar (Quemado): se agacha, salta recogiendo las rodillas al pecho para que el balón pase por debajo
 * (despegue), se queda arriba un cuadro y cae amortiguando (aterriza). Sube con `elevacion`.
 */
export const dodgeJump: AnimDef = {
  name: 'dodge_jump', pack: 'basic', fps: 14, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'despegue', phase: 2 / 8 }, { type: 'aterriza', phase: 6 / 8 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const Rr = (v: number) => Math.round(v * u);
    const ready = P(c, { torso: 8, legs: feet(c, 0.35, 0.22), arms: { near: { shoulder: 40, elbow: 70 }, far: { shoulder: 50, elbow: 70 } }, face: { eyes: 'open', mouth: 'line' }, support: 'both' });
    const crouch = P(c, { torso: 18, legs: feet(c, 0.85, 0.22), arms: { near: { shoulder: -30, elbow: 30 }, far: { shoulder: -20, elbow: 30 } }, face: { eyes: 'angry', mouth: 'line' }, support: 'both' });
    const push = P(c, { torso: 0, rise: Rr(4), legs: { near: { x: 0.05 * L, y: L - 0.1, toe: 50 }, far: { x: -0.05 * L, y: L - 0.1, toe: 50 } }, arms: { near: { shoulder: 150, elbow: 20 }, far: { shoulder: 140, elbow: 20 } }, face: { eyes: 'angry', mouth: 'open' } });
    // bolita en el aire: rodillas al pecho, brazos arriba para no dejar nada abajo
    const tuck = P(c, { torso: 6, rise: Rr(12), legs: { near: { x: 0.3 * L, y: 0.3 * L, toe: 30 }, far: { x: 0.2 * L, y: 0.38 * L, toe: 30 } }, arms: { near: { shoulder: 160, elbow: 30 }, far: { shoulder: 150, elbow: 30 } }, face: { eyes: 'wide', mouth: 'grin' } });
    const tuck2 = { ...tuck, rise: Rr(13) };
    const drop = P(c, { torso: 4, rise: Rr(6), legs: { near: { x: 0.15 * L, y: L - 1.0, toe: 30 }, far: { x: -0.1 * L, y: L - 0.8, toe: 30 } }, arms: { near: { shoulder: 110, elbow: 30 }, far: { shoulder: 100, elbow: 30 } }, face: { eyes: 'open', mouth: 'o' } });
    const land = P(c, { torso: 16, legs: feet(c, 0.8, 0.24), arms: { near: { shoulder: 30, elbow: 60 }, far: { shoulder: 40, elbow: 60 } }, face: { eyes: 'happy', mouth: 'grin' }, support: 'both' });
    return [ready, crouch, push, tuck, tuck2, drop, land, ready];
  },
};

// ---------------------------------------------------------------- B6: Chapita y tejo

/**
 * El palo de escoba a dos manos: el agarre va entre las dos manos, como el arma pesada. `side` = ángulo de lado
 * (0 adelante, 90 abajo, -90 arriba). Detrás del cuerpo mientras está atrás del hombro.
 */
const palo = (side: number, extra: Partial<PropState> = {}): PropState => ({ kind: 'held', at: 'hands', angles: { side, se: side + 8, ne: side - 8 }, ...extra });
const twoHands = (sh: number, el: number, d = 6) => ({ near: { shoulder: sh, elbow: el }, far: { shoulder: sh - d, elbow: el + 10 } });

/** Bateador de Chapita en guardia: de lado, rodillas dobladas, el palo sobre el hombro de atrás. Lo menea esperando. */
function stance(c: Ctx, k = 0): Pose {
  const L = c.L;
  return P(c, {
    torso: 8, legs: { near: { x: 0.32 * L, y: L - 1.4 }, far: { x: -0.34 * L, y: L - 1.6, toe: 10 } },
    arms: twoHands(28 + k * 4, 125 - k * 4), head: { dx: 0, dy: 0, tilt: 0, yaw: 10 }, face: fierce, support: 'both',
    props: [palo(-148 + k * 5, { behind: true })],
  });
}

export const batStance: AnimDef = {
  name: 'bat_stance', pack: 'baseball', fps: 6, loop: true, steady: true, views: ['side', 'front', 'back'],
  build: (c) => [stance(c, 0), stance(c, 1), stance(c, 2), stance(c, 1)],
};

/**
 * Batazo de Chapita con el palo de escoba a dos manos: carga el peso atrás, da el paso, barre el palo plano a la
 * altura de la chapa (impacto, con la estela) y lo enrolla sobre el otro hombro al terminar.
 */
export const batSwing: AnimDef = {
  name: 'bat_swing', pack: 'baseball', fps: 14, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 3 / 6 }],
  build: (c) => {
    const L = c.L;
    const load = P(c, { ...stance(c), torso: 2, x: -c.u, legs: { near: { x: 0.2 * L, y: L - 0.9, toe: 20 }, far: { x: -0.38 * L, y: L - 1.8 } }, arms: twoHands(12, 120), support: 'far', props: [palo(-165, { behind: true })] });
    const stride = P(c, { torso: 6, legs: { near: { x: 0.45 * L, y: L - 1.3 }, far: { x: -0.35 * L, y: L - 1.4, toe: 10 } }, arms: twoHands(55, 80), face: fierce, support: 'both', props: [palo(-125, { behind: true })] });
    const hit = P(c, { torso: 14, legs: { near: { x: 0.45 * L, y: L - 1.2 }, far: { x: -0.3 * L, y: L - 0.8, toe: 40 } }, arms: twoHands(88, 5, 4), face: { eyes: 'angry', mouth: 'grin' }, support: 'near',
      props: [palo(0, { smear: { side: [-120, 0], se: [-110, 8], ne: [-130, -8] } }), spark('handNear', 0)] });
    const wrap = P(c, { torso: 10, legs: { near: { x: 0.42 * L, y: L - 1.0 }, far: { x: -0.2 * L, y: L - 0.6, toe: 50 } }, arms: twoHands(125, 60), face: { eyes: 'angry', mouth: 'grin' }, support: 'near', props: [palo(-170, { behind: true })] });
    return [stance(c), load, stride, hit, wrap, stance(c)];
  },
};

/**
 * Lanzar el tejo: por debajo, con un paso adelante. Lleva el tejo atrás con el brazo estirado, da el paso largo y lo
 * suelta adelante y arriba (suelta, con la mano a la altura del pecho para que haga la parábola hasta la cancha),
 * y queda mirando dónde cae.
 */
export const tejoThrow: AnimDef = {
  name: 'tejo_throw', pack: 'athletics', fps: 12, loop: false, lateral: true, views: ['side', 'front', 'back'],
  events: [{ type: 'suelta', phase: 4 / 8, joint: 'handNear' }],
  build: (c) => {
    const L = c.L;
    const aim = P(c, { torso: 6, legs: feet(c, 0.2, 0.18), arms: { near: { shoulder: 60, elbow: 40 }, far: { shoulder: 30, elbow: 30 } }, face: { eyes: 'open', mouth: 'line' }, support: 'both' });
    const swingBack = P(c, { torso: 14, x: -c.u, legs: { near: { x: 0.15 * L, y: L - 1.0 }, far: { x: -0.25 * L, y: L - 1.2 } }, arms: { near: { shoulder: -45, elbow: 5 }, far: { shoulder: 50, elbow: 20 } }, face: fierce, support: 'far' });
    const far = { ...swingBack, torso: 18, arms: { near: { shoulder: -60, elbow: 0 }, far: { shoulder: 60, elbow: 20 } } };
    const step = P(c, { torso: 16, legs: { near: { x: 0.55 * L, y: L - 1.6 }, far: { x: -0.35 * L, y: L - 0.9, toe: 20 } }, arms: { near: { shoulder: 10, elbow: 0 }, far: { shoulder: 40, elbow: 20 } }, face: fierce, support: 'near' });
    const release = P(c, { torso: 12, legs: { near: { x: 0.55 * L, y: L - 1.7 }, far: { x: -0.4 * L, y: L - 0.6, toe: 40 } }, arms: { near: { shoulder: 75, elbow: 0 }, far: { shoulder: -10, elbow: 20 } }, face: { eyes: 'angry', mouth: 'open' }, support: 'near' });
    const follow = { ...release, torso: 8, arms: { near: { shoulder: 110, elbow: 0 }, far: { shoulder: -20, elbow: 20 } } };
    const watch = P(c, { torso: 10, legs: { near: { x: 0.5 * L, y: L - 1.4 }, far: { x: -0.3 * L, y: L - 0.4, toe: 40 } }, arms: { near: { shoulder: 90, elbow: 20 }, far: { shoulder: 0, elbow: 30 } }, head: { dx: 0, dy: 0, tilt: -6 }, face: { eyes: 'open', mouth: 'o' }, support: 'near' });
    // el tejo en la mano hasta la suelta: plano en la palma, como se agarra
    const conTejo = (p: Pose, side: number): Pose => ({ ...p, props: [{ kind: 'held', at: 'handNear', angles: { side, se: side + 8, ne: side - 8 } }] });
    return [conTejo(aim, 10), conTejo(swingBack, -40), conTejo(far, -50), conTejo(step, 20), release, follow, watch, { ...watch, face: { eyes: 'happy', mouth: 'grin' } }];
  },
};

/** Las del lote B4B6, en el orden del pedido. */
export const PRUEBAS: AnimDef[] = [vaultFail, judoGrip, judoThrow, judoThrown, dodgeJump, batStance, batSwing, tejoThrow];
