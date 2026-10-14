import type { Pose } from '../rig/pose';
import { type AnimDef, type Ctx, P, feet } from './types';
import { strain, fierce, spark } from './brawl';

/**
 * Judo (lotes B4B6 y B4B6 bis): la guardia agarrado de la solapa, dos proyecciones con su rival cuadro a cuadro, el
 * ukemi (la palmada al tatami al caer) y el rei (el saludo).
 *
 * - **Seoi nage** (`judo_throw` y `judo_thrown`): quien proyecta se mete de espaldas. Esos cuadros vienen marcados
 *   `girado` y dibujados desde la pose girada: el juego espeja el sprite y sus datos justo ahí. Termina girado, mirando
 *   hacia donde cayó el rival, que pasó por encima de su hombro.
 * - **O-soto-gari** (`osoto_gari` y `osoto_gari_thrown`): la barrida grande por fuera. Se lee de lado sin girar: se
 *   pone al costado, empuja el pecho del rival hacia atrás y le barre la pierna; el rival cae de espalda delante.
 * - **Ukemi:** los dos proyectados caen de espalda con la palmada al tatami: los brazos bajan de golpe contra el piso
 *   al aterrizar, la barbilla al pecho y las piernas arriba. La palmada es un `impacto` de la mano en el mismo cuadro
 *   del `aterriza`, con su `punto`: ahí suena el golpe contra el tatami.
 * - **Rei** (`bow`): de pie, talones juntos y las manos en los muslos, se inclina y vuelve.
 *
 * El rival no va en el sprite de quien proyecta: el juego dibuja al otro con su animación, que tiene los mismos
 * cuadros y fps. En el seoi nage, mientras lo carga a la espalda, la `carga` dice dónde va la base del rival.
 */

const R = (c: Ctx, v: number) => Math.max(1, Math.round(v * c.u));
const scared = { eyes: 'wide' as const, mouth: 'o' as const };

/** Judogi en guardia: rodillas dobladas, la mano cercana en la solapa del rival y la lejana en su manga. */
export function kumikata(c: Ctx, t = 0, e = 0): Pose {
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
 * Ukemi: de espalda en el tatami con la palmada. `slap` = el cuadro del golpe (los brazos contra el piso, pegados al
 * cuerpo y abiertos hacia afuera); sin `slap`, los brazos quedan en el piso. La barbilla al pecho para no golpear la
 * cabeza y las piernas un poco arriba.
 */
function ukemi(c: Ctx, air = 0, slap = true, relax = false): Pose {
  const L = c.L;
  return P(c, {
    torso: -88, air,
    legs: relax
      ? { near: { x: 0.75 * L, y: 0.1 * L, toe: -30 }, far: { x: 0.7 * L, y: 0.2 * L, toe: -30 } }
      : { near: { x: 0.6 * L, y: -0.2 * L, toe: -20 }, far: { x: 0.55 * L, y: -0.05 * L, toe: -20 } },
    arms: { near: { shoulder: slap ? -6 : -2, elbow: 0, spread: 45 }, far: { shoulder: slap ? -6 : -2, elbow: 0, spread: 45 } },
    head: { dx: 0, dy: 0, tilt: relax ? 0 : 16 },
    face: { eyes: relax ? 'hurt' : 'closed', mouth: relax ? 'o' : 'line' }, fit: true,
    // la palmada: un destello en la mano contra el piso (de lado, la lejana; la cercana queda sobre el cuerpo)
    ...(slap ? { props: [spark('handFar', 90)] } : {}),
  });
}
/** Cayendo de espalda con los brazos arriba, listos para la palmada. */
function preUkemi(c: Ctx, torso: number, air: number): Pose {
  const L = c.L;
  return P(c, {
    torso, air, legs: { near: { x: 0.6 * L, y: -0.05 * L, toe: 0 }, far: { x: 0.5 * L, y: 0.15 * L, toe: 0 } },
    arms: { near: { shoulder: 110, elbow: 10, spread: 30 }, far: { shoulder: 100, elbow: 10, spread: 30 } },
    head: { dx: 0, dy: 0, tilt: 14 }, face: scared, fit: true,
  });
}

/**
 * Seoi nage: jala al rival para desequilibrarlo (kuzushi), gira y se mete de espaldas abajo de él (tsukuri), lo carga
 * a la espalda, se dobla adelante y lo pasa por encima del hombro (kake) hasta azotarlo contra el tatami (impacto).
 * Termina de pie, agarrado de la manga, mirando al rival en el piso.
 *
 * Del cuadro 2 al 9 está girado: cada pose se piensa mirando hacia donde mira después de darse vuelta, y el juego
 * espeja el sprite y sus datos en esos cuadros. Del 3 al 5 la `carga` va arriba de la espalda: el juego pone ahí la
 * base de `judo_thrown`, detrás de quien proyecta.
 */
export const judoThrow: AnimDef = {
  name: 'judo_throw', pack: 'martial', fps: 14, loop: false, lateral: true, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 6 / 10 }],
  build: (c) => {
    const L = c.L;
    const girado = (p: Pose): Pose => ({ ...p, girado: true });
    const grip = kumikata(c);
    // kuzushi: se echa atrás y jala hacia él, con el pie cercano que ya entra
    const pull = P(c, { torso: -6, x: -c.u, legs: { near: { x: 0.25 * L, y: L - 1.2 }, far: { x: -0.4 * L, y: L - 1.0, toe: 10 } },
      arms: { near: { shoulder: 80, elbow: 100 }, far: { shoulder: 50, elbow: 110 } }, face: strain, support: 'far' });
    // ya girado: de espaldas al rival, rodillas dobladas, jalando su brazo por encima del hombro hacia el pecho
    const turn = P(c, { torso: 12, legs: { near: { x: 0.15 * L, y: L - 1.6 }, far: { x: -0.22 * L, y: L - 1.4 } },
      arms: { near: { shoulder: 85, elbow: 110 }, far: { shoulder: 55, elbow: 120 } }, face: strain, support: 'both' });
    // lo carga: agachado a fondo, el rival sobre la espalda
    const load = P(c, { torso: 28, legs: feet(c, 0.9, 0.22), arms: { near: { shoulder: 60, elbow: 110 }, far: { shoulder: 45, elbow: 120 } }, face: strain, support: 'both', carryAt: 'back' });
    // estira las piernas y se dobla: el rival sube por la espalda
    const lift = P(c, { torso: 50, legs: feet(c, 0.45, 0.22), arms: { near: { shoulder: 40, elbow: 80 }, far: { shoulder: 30, elbow: 90 } }, face: strain, support: 'both', carryAt: 'back' });
    // lo pasa por encima del hombro: doblado del todo, los brazos tiran hacia abajo
    const over = P(c, { torso: 72, legs: feet(c, 0.25, 0.24), arms: { near: { shoulder: 20, elbow: 40 }, far: { shoulder: 10, elbow: 50 } }, face: { eyes: 'angry', mouth: 'open' }, support: 'both', carryAt: 'back' });
    // ¡ippon! el rival cae delante (impacto) y él sigue sobre la proyección, agarrado de la manga
    const slam = P(c, { torso: 45, legs: feet(c, 0.6, 0.26), arms: { near: { shoulder: 35, elbow: 0 }, far: { shoulder: 20, elbow: 40 } }, face: { eyes: 'angry', mouth: 'grin' }, support: 'both' });
    const hold = { ...slam, torso: 38 };
    const up = P(c, { torso: 18, legs: feet(c, 0.35, 0.24), arms: { near: { shoulder: 35, elbow: 10 }, far: { shoulder: 15, elbow: 30 } }, face: fierce, support: 'both' });
    const stand = P(c, { ...up, torso: 6, legs: feet(c, 0.15, 0.22), arms: { near: { shoulder: 30, elbow: 10 }, far: { shoulder: 5, elbow: 20 } } });
    return [grip, pull, ...[turn, load, lift, over, slam, hold, up, stand].map(girado)];
  },
};

/**
 * Proyectado por seoi nage: la otra mitad de `judo_throw`, cuadro a cuadro. Agarrado, lo jalan y queda sobre la
 * espalda del otro, pasa por encima de su hombro dando la vuelta hacia adelante, cae de espalda con la palmada al
 * tatami (aterriza, el mismo cuadro del impacto) y queda en ukemi. No se gira: siempre mira hacia quien lo proyecta
 * al empezar. Del 3 al 5 el juego lo pone con su base en la `carga` de quien proyecta.
 */
export const judoThrown: AnimDef = {
  name: 'judo_thrown', pack: 'martial', fps: 14, loop: false, lateral: true, views: ['side', 'front', 'back'],
  events: [{ type: 'aterriza', phase: 6 / 10 }, { type: 'impacto', phase: 6 / 10, joint: 'handLow' }],
  build: (c) => {
    const L = c.L;
    const grip = kumikata(c);
    // lo jalan: se va adelante en puntas, con los brazos todavía agarrados
    const pulled = P(c, { torso: 24, x: c.u, legs: { near: { x: 0.25 * L, y: L - 0.4, toe: 30 }, far: { x: -0.3 * L, y: L - 0.2, toe: 40 } },
      arms: { near: { shoulder: 100, elbow: 30 }, far: { shoulder: 85, elbow: 30 } }, face: scared, support: 'near' });
    const tip = { ...pulled, torso: 36, legs: { near: { x: 0.1 * L, y: L - 0.2, toe: 50 }, far: { x: -0.45 * L, y: L - 0.5, toe: 50 } } };
    // en el aire: sobre la espalda del otro boca abajo, de cabeza, y ya boca arriba con los brazos listos
    const air = (torso: number, nl: [number, number], fl: [number, number]): Pose => P(c, {
      torso, legs: { near: { x: nl[0] * L, y: nl[1] * L, toe: 20 }, far: { x: fl[0] * L, y: fl[1] * L, toe: 20 } },
      arms: { near: { shoulder: 150, elbow: 30, spread: 30 }, far: { shoulder: 130, elbow: 30, spread: 30 } }, face: scared, fit: true,
    });
    return [
      grip, pulled, tip,
      air(80, [-0.7, 0.2], [-0.6, 0.35]), air(150, [-0.3, -0.6], [-0.2, -0.5]), preUkemi(c, -110, R(c, 2)),
      // ukemi: la palmada al caer, el rebote con los brazos en el piso, la barbilla al pecho, y queda tendido
      ukemi(c, 0, true), ukemi(c, R(c, 1), false), ukemi(c, 0, false), ukemi(c, 0, false, true),
    ];
  },
};

/**
 * O-soto-gari: la barrida grande por fuera. Desde el agarre da el paso al costado del rival con el pie lejano, le
 * empuja el pecho hacia atrás y arriba, lleva la pierna cercana adelante pasando por fuera de la del rival y la barre
 * hacia atrás con todo el cuerpo inclinado adelante, como un sube y baja (impacto cuando el rival toca el tatami).
 * Termina agarrado de la manga. No gira: se lee de lado tal cual.
 */
export const osotoGari: AnimDef = {
  name: 'osoto_gari', pack: 'martial', fps: 14, loop: false, lateral: true, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 6 / 10 }],
  build: (c) => {
    const L = c.L;
    const push = { near: { shoulder: 105, elbow: 25 }, far: { shoulder: 60, elbow: 80 } };
    // el paso al costado con el pie de apoyo, empujando el pecho del rival hacia atrás
    const step = P(c, { torso: 8, legs: { near: { x: -0.1 * L, y: L - 0.6, toe: 20 }, far: { x: 0.35 * L, y: L - 0.9 } }, arms: push, face: fierce, support: 'far' });
    // la pierna cercana viene adelante con la rodilla arriba, pecho contra pecho
    const swing = P(c, { torso: 4, legs: { near: { x: 0.45 * L, y: 0.4 * L, toe: 20 }, far: { x: 0.3 * L, y: L - 1.0 } }, arms: push, face: strain, support: 'far' });
    // estirada adelante, por fuera de la pierna del rival
    const reach = P(c, { torso: 0, legs: { near: { x: 0.6 * L, y: 0.2 * L, toe: 10 }, far: { x: 0.28 * L, y: L - 1.0 } }, arms: push, face: strain, support: 'far' });
    // la barre hacia atrás: la pierna se va atrás y arriba y el cuerpo se inclina adelante
    const reap = P(c, { torso: 25, legs: { near: { x: -0.2 * L, y: 0.35 * L, toe: 40 }, far: { x: 0.28 * L, y: L - 1.2 } },
      arms: { near: { shoulder: 80, elbow: 10 }, far: { shoulder: 50, elbow: 70 } }, face: { eyes: 'angry', mouth: 'open' }, support: 'far' });
    const high = P(c, { torso: 45, legs: { near: { x: -0.6 * L, y: 0.25 * L, toe: 50 }, far: { x: 0.28 * L, y: L - 1.4 } },
      arms: { near: { shoulder: 60, elbow: 0 }, far: { shoulder: 40, elbow: 60 } }, face: { eyes: 'angry', mouth: 'open' }, support: 'far' });
    // ¡waza-ari! el rival toca el tatami
    const slam = P(c, { torso: 50, legs: { near: { x: -0.7 * L, y: 0.2 * L, toe: 50 }, far: { x: 0.28 * L, y: L - 1.5 } },
      arms: { near: { shoulder: 40, elbow: 0 }, far: { shoulder: 30, elbow: 40 } }, face: { eyes: 'angry', mouth: 'grin' }, support: 'far' });
    const down = P(c, { torso: 40, legs: { near: { x: -0.45 * L, y: L - 1.6, toe: 20 }, far: { x: 0.28 * L, y: L - 1.6 } },
      arms: { near: { shoulder: 35, elbow: 0 }, far: { shoulder: 25, elbow: 40 } }, face: fierce, support: 'both' });
    const up = P(c, { torso: 20, legs: feet(c, 0.4, 0.24), arms: { near: { shoulder: 35, elbow: 10 }, far: { shoulder: 15, elbow: 30 } }, face: fierce, support: 'both' });
    const stand = P(c, { ...up, torso: 8, legs: feet(c, 0.15, 0.22), arms: { near: { shoulder: 30, elbow: 10 }, far: { shoulder: 5, elbow: 20 } } });
    return [kumikata(c), step, swing, reach, reap, high, slam, down, up, stand];
  },
};

/**
 * Barrido por o-soto-gari: la otra mitad de `osoto_gari`, cuadro a cuadro. Lo empujan hacia atrás sobre los talones,
 * le barren la pierna (que sale disparada hacia adelante y arriba), cae de espalda con la palmada al tatami
 * (aterriza, el mismo cuadro del impacto) y queda en ukemi. Cae en su lugar, de espalda: no necesita `carga`.
 */
export const osotoGariThrown: AnimDef = {
  name: 'osoto_gari_thrown', pack: 'martial', fps: 14, loop: false, lateral: true, views: ['side', 'front', 'back'],
  events: [{ type: 'aterriza', phase: 6 / 10 }, { type: 'impacto', phase: 6 / 10, joint: 'handLow' }],
  build: (c) => {
    const L = c.L;
    const flail = { near: { shoulder: 130, elbow: 30, spread: 30 }, far: { shoulder: 110, elbow: 40, spread: 30 } };
    // empujado: sobre los talones, el pecho hacia atrás, todavía agarrado
    const pushed = P(c, { torso: -14, legs: { near: { x: 0.25 * L, y: L - 0.4, toe: -20 }, far: { x: -0.3 * L, y: L - 0.5 } },
      arms: { near: { shoulder: 85, elbow: 40 }, far: { shoulder: 70, elbow: 50 } }, face: scared, support: 'both' });
    const back = P(c, { torso: -26, legs: { near: { x: 0.3 * L, y: L - 0.3, toe: -30 }, far: { x: -0.2 * L, y: L - 0.6 } },
      arms: { near: { shoulder: 95, elbow: 30 }, far: { shoulder: 80, elbow: 40 } }, face: scared, support: 'near' });
    // sin pie: la pierna barrida sale adelante y arriba, la otra en puntas
    const swept = P(c, { torso: -40, legs: { near: { x: 0.6 * L, y: 0.15 * L, toe: 0 }, far: { x: 0.05 * L, y: L - 0.3, toe: 30 } }, arms: flail, face: scared, support: 'far' });
    const flying = P(c, { torso: -62, air: R(c, 2), legs: { near: { x: 0.6 * L, y: -0.05 * L, toe: 0 }, far: { x: 0.45 * L, y: 0.2 * L, toe: 10 } }, arms: flail, face: scared, fit: true });
    return [
      kumikata(c), pushed, back, swept, flying, preUkemi(c, -80, R(c, 1)),
      ukemi(c, 0, true), ukemi(c, R(c, 1), false), ukemi(c, 0, false), ukemi(c, 0, false, true),
    ];
  },
};

/**
 * Rei: el saludo de pie. Talones juntos y las manos en los muslos; se inclina unos 30 grados (un poco más en el chibi, para que se lea) con la mirada al piso
 * (las manos bajan por los muslos hacia las rodillas), se queda un instante y vuelve. Al empezar, en cada ¡hajime! y
 * al terminar.
 */
export const rei: AnimDef = {
  name: 'bow', pack: 'martial', fps: 8, loop: false, views: ['side', 'front', 'back'],
  build: (c) => {
    const k = (torso: number, sh: number, dy: number, eyes: 'open' | 'closed'): Pose => P(c, {
      torso, legs: feet(c, 0, 0.06), head: { dx: 0, dy: Math.round(dy * c.u), tilt: torso > 0 ? 6 : 0 },
      arms: { near: { shoulder: sh, elbow: 0 }, far: { shoulder: sh, elbow: 0 } }, face: { eyes, mouth: 'line' }, support: 'both',
    });
    return [k(0, 6, 0, 'open'), k(16, 14, 1.5, 'open'), k(34, 28, 3, 'closed'), k(34, 28, 3, 'closed'), k(16, 14, 1.5, 'open'), k(0, 6, 0, 'open')];
  },
};

/** El judo completo: la guardia, las dos proyecciones con sus rivales y el saludo. */
export const JUDO: AnimDef[] = [judoGrip, judoThrow, judoThrown, osotoGari, osotoGariThrown, rei];
/** Lo que suma el lote B4B6 bis (las otras tres ya estaban en `PRUEBAS`). */
export const JUDO_NUEVAS: AnimDef[] = [osotoGari, osotoGariThrown, rei];
