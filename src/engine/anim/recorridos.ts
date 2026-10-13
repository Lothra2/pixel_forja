import type { Pose, PropState } from '../rig/pose';
import { type AnimDef, type Ctx, P, feet, TAU } from './types';
import { street, strain, fierce, hurt, down, spark } from './brawl';
import { reachArm } from '../render/human';
import { bikeU, bikeDrop } from '../render/props';

/**
 * Recorridos y trepar (lotes B2 y B3): escalera de mano, muro bajo, colgarse del borde y subir, la viga (caminar,
 * tambalearse y caerse), correr agachado, la bici rápida y las caídas de bici y patineta; el poste (trepar, quieto,
 * golpear hacia arriba, deslizarse, patear hacia abajo) y lo que se hace desde abajo (sacudir el poste y jalar del pie).
 *
 * Todo con las 3 vistas (de lado, de frente y de espalda): el kit arma las diagonales y los datos por cuadro. Lo que
 * se trepa (escalera, muro, poste, viga) lo dibuja el juego: las manos y los pies del manifiesto dicen dónde agarran.
 * Las que suben el cuerpo (subir el muro, salir del borde) traen `elevacion`: cuánto sube el juego el sprite.
 */

const R = (c: Ctx, v: number) => Math.max(1, Math.round(v * c.u));
const effort = { eyes: 'angry' as const, mouth: 'line' as const };
const scared = { eyes: 'wide' as const, mouth: 'o' as const };

/** De los pies a las manos con los brazos arriba: la altura del borde del que cuelga (y la del muro que sube). */
export const alcance = (c: Ctx) => Math.round(c.L + c.d.torsoH + c.A + c.d.u * 2);

/** Brazo arriba agarrado: k = 1 bien estirado, 0 doblado (la mano a la altura de la cabeza). */
const up = (k: number) => ({ shoulder: 158 + 22 * k, elbow: 70 - 65 * k });

// ---------------------------------------------------------------- B2: recorridos

/**
 * Escalera de mano, de espaldas a la cámara si el juego usa la fila de arriba: mano y rodilla contrarias suben
 * juntas (la derecha arriba con la rodilla izquierda) y bajan las otras. En bucle: el juego sube el sprite.
 * Un `paso` por cada mano que agarra el peldaño, con su `punto`.
 */
export const ladder: AnimDef = {
  name: 'ladder', pack: 'climb', fps: 10, loop: true, views: ['side', 'front', 'back'],
  events: [{ type: 'paso', phase: 0, joint: 'handNear' }, { type: 'paso', phase: 0.5, joint: 'handFar' }],
  build: (c) => {
    const L = c.L;
    const foot = (k: number) => ({ x: 0.16 * L, y: L - 0.3 - 0.36 * L * (k + 1) / 2, toe: 0 });
    return Array.from({ length: 8 }, (_, i) => {
      const s = Math.cos((i / 8) * TAU);
      // s = 1: la mano cercana arriba y la rodilla lejana arriba
      return P(c, {
        torso: 5, head: { tilt: -8, dx: 0, dy: 0 },
        legs: { near: foot(-s), far: foot(s) },
        arms: { near: up((s + 1) / 2), far: up((1 - s) / 2) },
        face: effort, support: s > 0.05 ? 'near' : s < -0.05 ? 'far' : 'both',
      });
    });
  },
};

/**
 * Subir un muro bajo: se agacha, salta con los brazos arriba, agarra el borde (impacto), se jala con los pies contra
 * el muro, apoya la rodilla arriba y se para encima. `elevacion` lleva el cuerpo hasta arriba del muro (la altura
 * del muro es `alcance` menos un poco: lo que llega con los brazos arriba).
 */
export const climbWall: AnimDef = {
  name: 'climb_wall', pack: 'climb', fps: 10, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 2 / 8, joint: 'handNear' }],
  build: (c) => {
    const L = c.L, W = Math.round(alcance(c) * 0.8);
    const agacha = P(c, { torso: 18, legs: feet(c, 0.55, 0.2), arms: { near: { shoulder: -45, elbow: 20 }, far: { shoulder: -40, elbow: 20 } }, face: effort, support: 'both' });
    const salta = P(c, { torso: 2, air: R(c, 3), legs: { near: { x: 0.1 * L, y: L - 0.4, toe: 30 }, far: { x: -0.1 * L, y: L - 0.6, toe: 35 } }, arms: { near: up(1), far: up(0.95) }, face: { eyes: 'open', mouth: 'open' } });
    // agarra: cuelga del borde con los pies contra el muro
    const agarra = P(c, { torso: 6, rise: Math.round(W * 0.2), legs: { near: { x: 0.3 * L, y: L - 0.5, toe: -10 }, far: { x: 0.2 * L, y: L - 0.3, toe: 0 } }, arms: { near: up(1), far: up(1) }, face: strain });
    const jala = P(c, { torso: 10, rise: Math.round(W * 0.45), legs: { near: { x: 0.35 * L, y: 0.55 * L, toe: -10 }, far: { x: 0.2 * L, y: L - 0.4 } }, arms: { near: up(0.3), far: up(0.35) }, face: strain });
    // los codos pasan por encima del borde y empuja hacia abajo
    const empuja = P(c, { torso: 24, rise: Math.round(W * 0.7), legs: { near: { x: 0.4 * L, y: 0.45 * L, toe: 0 }, far: { x: 0.05 * L, y: L - 0.3, toe: 20 } }, arms: { near: { shoulder: 35, elbow: 70 }, far: { shoulder: 30, elbow: 70 } }, face: strain });
    // la rodilla arriba del muro
    const rodilla = P(c, { torso: 30, rise: Math.round(W * 0.85), legs: { near: { x: 0.35 * L, y: 0.35 * L, toe: 10 }, far: { x: -0.05 * L, y: L - 0.2, toe: 30 } }, arms: { near: { shoulder: 5, elbow: 10 }, far: { shoulder: 0, elbow: 10 } }, face: effort });
    const sube = P(c, { torso: 16, rise: W, legs: feet(c, 0.45, 0.2), arms: { near: { shoulder: 20, elbow: 30 }, far: { shoulder: 15, elbow: 30 } }, face: effort, support: 'both' });
    const arriba = { ...street(c), rise: W };
    return [agacha, salta, agarra, jala, empuja, rodilla, sube, arriba];
  },
};

/** Colgado del borde: los dos brazos arriba, el cuerpo se mece un poco y los pies cuelgan con la punta abajo. */
export const ledgeHang: AnimDef = {
  name: 'ledge_hang', pack: 'climb', fps: 6, loop: true, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L;
    return [0, 1, 0, -1].map((s) => P(c, {
      torso: 2 + 3 * s, head: { tilt: -10, dx: 0, dy: 0 },
      legs: { near: { x: (0.08 + 0.06 * s) * L, y: L - 0.2, toe: 25 }, far: { x: (-0.04 + 0.06 * s) * L, y: L - 0.5, toe: 30 } },
      arms: { near: up(1), far: up(1) }, face: s === 0 ? strain : effort,
    }));
  },
};

/**
 * Subir desde colgado: dobla los codos, la barbilla pasa el borde, los codos se apoyan arriba, empuja con los brazos
 * estirados, sube una rodilla y se para. `elevacion` lleva el cuerpo de colgado a parado encima del borde.
 */
export const pullUp: AnimDef = {
  name: 'pull_up', pack: 'climb', fps: 12, loop: false, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L, W = alcance(c);
    const colgado = P(c, { torso: 2, head: { tilt: -10, dx: 0, dy: 0 }, legs: { near: { x: 0.08 * L, y: L - 0.2, toe: 25 }, far: { x: -0.04 * L, y: L - 0.5, toe: 30 } }, arms: { near: up(1), far: up(1) }, face: strain });
    const dobla = P(c, { ...colgado, rise: Math.round(W * 0.15), arms: { near: up(0.55), far: up(0.55) } });
    const barbilla = P(c, { torso: 4, rise: Math.round(W * 0.35), legs: { near: { x: 0.15 * L, y: L - 0.5, toe: 20 }, far: { x: 0, y: L - 0.3, toe: 25 } }, arms: { near: up(0), far: up(0) }, face: strain });
    const codos = P(c, { torso: 14, rise: Math.round(W * 0.5), legs: { near: { x: 0.25 * L, y: 0.65 * L, toe: 10 }, far: { x: 0, y: L - 0.3, toe: 25 } }, arms: { near: { shoulder: 60, elbow: 110 }, far: { shoulder: 55, elbow: 110 } }, face: strain });
    const empuja = P(c, { torso: 22, rise: Math.round(W * 0.68), legs: { near: { x: 0.35 * L, y: 0.5 * L, toe: 0 }, far: { x: 0.05 * L, y: L - 0.3, toe: 20 } }, arms: { near: { shoulder: 15, elbow: 30 }, far: { shoulder: 12, elbow: 30 } }, face: strain });
    const rodilla = P(c, { torso: 30, rise: Math.round(W * 0.82), legs: { near: { x: 0.35 * L, y: 0.35 * L, toe: 10 }, far: { x: -0.05 * L, y: L - 0.2, toe: 30 } }, arms: { near: { shoulder: 5, elbow: 10 }, far: { shoulder: 0, elbow: 10 } }, face: effort });
    const sube = P(c, { torso: 16, rise: W, legs: feet(c, 0.45, 0.2), arms: { near: { shoulder: 20, elbow: 30 }, far: { shoulder: 15, elbow: 30 } }, face: effort, support: 'both' });
    return [colgado, dobla, barbilla, codos, empuja, rodilla, sube, { ...street(c), rise: W }];
  },
};

/** Los pies en una sola línea (sobre la viga): de frente se juntan bajo el centro del cuerpo. */
const enLinea = (c: Ctx) => -Math.floor(c.d.hipSpread / 2);
/** Brazos abiertos a los costados para el equilibrio: de frente en cruz, de lado un poco adelante y atrás. */
const cruz = (a: number) => ({ near: { shoulder: 80 + a, elbow: 10, spread: 75 }, far: { shoulder: 80 - a, elbow: 10, spread: 75 } });

/**
 * Caminar por la viga: pasos cortos con un pie delante del otro (en línea), los brazos abiertos en cruz que suben y
 * bajan con cada paso y la mirada abajo. Un `paso` por pie.
 */
export const balanceWalk: AnimDef = {
  name: 'balance_walk', pack: 'climb', fps: 8, loop: true, steady: true, views: ['side', 'front', 'back'],
  events: [{ type: 'paso', phase: 0, foot: 'near' }, { type: 'paso', phase: 0.5, foot: 'far' }],
  build: (c) => {
    const L = c.L, S = 0.24 * L, z = enLinea(c);
    const keys: Pose[] = [
      P(c, { torso: 6, head: { tilt: 10, dx: 0, dy: 0 }, roll: 3, legs: { near: { x: S, y: L - 0.2, z, toe: 0 }, far: { x: -S, y: L - 0.3, z, toe: 8 } }, arms: cruz(8), face: effort, support: 'near' }),
      P(c, { torso: 7, head: { tilt: 10, dx: 0, dy: 0 }, roll: 5, legs: { near: { x: S * 0.5, y: L - 0.5, z, toe: 0 }, far: { x: -S * 0.9, y: L - 0.5 - 0.12 * L, z, toe: 15 } }, arms: cruz(14), face: effort, support: 'near' }),
      P(c, { torso: 6, head: { tilt: 10, dx: 0, dy: 0 }, roll: 4, legs: { near: { x: 0, y: L - 0.3, z, toe: 0 }, far: { x: 0, y: L - 0.3 - 0.2 * L, z, toe: 10 } }, arms: cruz(6), face: effort, support: 'near' }),
      P(c, { torso: 5, head: { tilt: 10, dx: 0, dy: 0 }, roll: 1, legs: { near: { x: -S * 0.5, y: L - 0.2, z, toe: 0 }, far: { x: S * 0.7, y: L - 0.2 - 0.08 * L, z, toe: 0 } }, arms: cruz(-4), face: effort, support: 'near' }),
    ];
    const swap = (p: Pose): Pose => ({ ...p, roll: -(p.roll ?? 0), legs: { near: { ...p.legs.far }, far: { ...p.legs.near } }, arms: { near: { ...p.arms.far }, far: { ...p.arms.near } }, support: 'far' });
    return [...keys, ...keys.map(swap)];
  },
};

/** Tambalearse en la viga: los pies quietos en línea y el cuerpo que se va de un lado al otro con los brazos en molinete. */
export const balanceWobble: AnimDef = {
  name: 'balance_wobble', pack: 'climb', fps: 10, loop: true, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L, z = enLinea(c);
    return Array.from({ length: 8 }, (_, i) => {
      const s = Math.sin((i / 8) * TAU);
      return P(c, {
        torso: 6 + 8 * s, roll: 14 * s, x: Math.round(s * c.u * 0.5), head: { tilt: 6 * s, dx: 0, dy: 0 },
        legs: { near: { x: 0.12 * L, y: L - 0.5, z, toe: 0 }, far: { x: -0.12 * L, y: L - 0.5, z, toe: 10 } },
        arms: { near: { shoulder: 85 + 55 * s, elbow: 10, spread: 70 }, far: { shoulder: 85 - 55 * s, elbow: 10, spread: 70 } },
        face: scared, support: 'both',
      });
    });
  },
};

/**
 * Caerse de la viga: se va de lado, levanta una pierna buscando el equilibrio, los brazos al aire, y cae (de frente se
 * ve caer de lado; de lado, hacia adelante). Los últimos cuadros quedan cayendo: el juego baja el sprite.
 */
export const balanceFall: AnimDef = {
  name: 'balance_fall', pack: 'climb', fps: 12, loop: false, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L, z = enLinea(c);
    const ladea = P(c, { torso: 12, roll: 22, legs: { near: { x: 0.1 * L, y: L - 0.5, z }, far: { x: -0.1 * L, y: L - 0.5, z, toe: 10 } }, arms: { near: { shoulder: 150, elbow: 10, spread: 70 }, far: { shoulder: 40, elbow: 10, spread: 70 } }, face: scared, support: 'near' });
    const pierna = P(c, { torso: 18, roll: 34, legs: { near: { x: 0.1 * L, y: L - 0.5, z }, far: { x: -0.35 * L, y: 0.6 * L, toe: 30 } }, arms: { near: { shoulder: 175, elbow: 10, spread: 70 }, far: { shoulder: 120, elbow: 20, spread: 70 } }, face: { eyes: 'wide', mouth: 'open' }, support: 'near' });
    const pierde = P(c, { torso: 34, roll: 50, air: R(c, 1), legs: { near: { x: 0.05 * L, y: L - 0.6, toe: 20 }, far: { x: -0.4 * L, y: 0.55 * L, toe: 40 } }, arms: { near: { shoulder: 180, elbow: 5, spread: 60 }, far: { shoulder: 160, elbow: 10, spread: 60 } }, face: { eyes: 'wide', mouth: 'open' }, fit: true });
    const cae = P(c, { torso: 60, roll: 72, legs: { near: { x: -0.2 * L, y: 0.75 * L, toe: 40 }, far: { x: -0.45 * L, y: 0.55 * L, toe: 50 } }, arms: { near: { shoulder: 185, elbow: 10, spread: 50 }, far: { shoulder: 170, elbow: 10, spread: 50 } }, face: { eyes: 'wide', mouth: 'open' }, fit: true });
    const cae2 = { ...cae, torso: 75, roll: 85, face: { eyes: 'closed' as const, mouth: 'o' as const } };
    return [ladea, pierna, pierde, cae, cae2, { ...cae2, torso: 82, roll: 90 }];
  },
};

/**
 * Correr agachado bajo cables y toldos: el cuerpo doblado hacia adelante, la cabeza gacha, las rodillas dobladas
 * todo el ciclo y los brazos cortos. Mismos contactos que correr: un `paso` por pie. Más bajo que de pie: el juego
 * puede usar la caja del cuadro para pasar por debajo.
 */
export const duckRun: AnimDef = {
  name: 'duck_run', pack: 'climb', fps: 14, loop: true, hairTrail: -1, views: ['side', 'front', 'back'],
  events: [{ type: 'paso', phase: 0, foot: 'near' }, { type: 'paso', phase: 0.5, foot: 'far' }],
  build: (c) => {
    const L = c.L;
    const heavy = Math.max(0.8, c.build);
    const S = (0.46 * L) / heavy, low = 0.42 * L;
    const back = c.u < 0.8 ? -4 : -2 * c.u;
    const face = { eyes: 'angry' as const, mouth: 'open' as const };
    const keys: Pose[] = [
      // el pie de apoyo siempre a la misma altura y el torso igual: la altura del cuerpo no salta
      P(c, { x: back, torso: 39, head: { tilt: 14, dx: 0, dy: 0 }, legs: { near: { x: S * 0.7, y: L - low, toe: 0 }, far: { x: -S * 0.8, y: L - low - 0.25 * L, toe: 30 } }, arms: { near: { shoulder: -40, elbow: 80 }, far: { shoulder: 30, elbow: 80 } }, face, support: 'near' }),
      P(c, { x: back, torso: 39, head: { tilt: 14, dx: 0, dy: 0 }, legs: { near: { x: S * 0.15, y: L - low, toe: 0 }, far: { x: -S * 0.35, y: L - low - 0.4 * L, toe: 40 } }, arms: { near: { shoulder: -25, elbow: 80 }, far: { shoulder: 20, elbow: 80 } }, face, support: 'near' }),
      P(c, { x: back, torso: 39, head: { tilt: 14, dx: 0, dy: 0 }, legs: { near: { x: -S * 0.6, y: L - low, toe: 8 }, far: { x: S * 0.5, y: L - low - 0.3 * L, toe: 10 } }, arms: { near: { shoulder: 28, elbow: 80 }, far: { shoulder: -38, elbow: 80 } }, face, support: 'near' }),
      P(c, { x: back, torso: 39, head: { tilt: 14, dx: 0, dy: 0 }, legs: { near: { x: -S * 0.85, y: L - low - 0.1 * L, toe: 30 }, far: { x: S * 0.75, y: L - low, toe: 5 } }, arms: { near: { shoulder: 35, elbow: 80 }, far: { shoulder: -45, elbow: 80 } }, face, support: 'far' }),
    ];
    // con el cuerpo tan inclinado, la cadera de atrás queda más baja que la de adelante: el pie que apoya con la pierna de
    // atrás se sube un poco para que el cuerpo no baje en la segunda mitad del ciclo
    const dy = 1.5 * c.u;
    const swap = (p: Pose): Pose => {
      const legs = { near: { ...p.legs.far }, far: { ...p.legs.near } };
      if (p.support === 'near') legs.far.y += dy;
      return { ...p, legs, arms: { near: { ...p.arms.far }, far: { ...p.arms.near } }, support: p.support === 'near' ? 'far' : 'near' };
    };
    return [...keys, ...keys.map(swap)];
  },
};

/** La bici: dónde van la cadera, el pedal y el manubrio (las mismas medidas que `bike`). */
function bici(c: Ctx) {
  const u = bikeU(c.u), Rw = Math.round(7 * u), seatH = Rw * 2.3 + 1;
  return { u, seatH, crank: [3 * u, seatH - Rw] as [number, number], crankR: Math.max(2, Math.round(3 * u)), bar: [Math.round(17 * u) / 2 - 1 * u + 3 * u, -(Rw * 2.5) + seatH] as [number, number] };
}
const bike = (c: Ctx, angle: number, extra: Partial<PropState> = {}): PropState => ({ kind: 'bike', at: 'ground', x: 3 * bikeU(c.u), angle, behind: false, ...extra });

/** Pedalear el cuadro i de 8 con el torso t y la cadera a h sobre el asiento (parado en los pedales). */
function pedalea(c: Ctx, i: number, torso: number, h0: number, face?: Pose['face']): Pose {
  const g = bici(c);
  // a 32 px un pixel más abajo y, con un cuerpo alto, lo que haga falta para que la cabeza quepa
  const h = h0 + Math.min(c.u < 0.8 ? -1 : 0, bikeDrop(c.d, g.seatH + h0));
  const a = (i / 8) * TAU, hs = Math.floor(c.d.hipSpread / 2);
  const near = { x: g.crank[0] + Math.cos(a) * g.crankR - hs, y: g.crank[1] + Math.sin(a) * g.crankR + 1 + h };
  const far = { x: g.crank[0] - Math.cos(a) * g.crankR - (hs - c.d.hipSpread), y: g.crank[1] - Math.sin(a) * g.crankR + 1 + h };
  const arm = reachArm(c.d, torso, [g.bar[0], g.bar[1] - 1 + h]);
  // a 32 px el cuerpo inclinado se corre un poco atrás para caber en la celda
  return P(c, { x: c.u < 0.8 ? -2 : 0, hipH: Math.round(g.seatH + h), torso, head: { tilt: -Math.round(torso / 3), dx: 0, dy: 0 }, legs: { near: { ...near, toe: 10 }, far: { ...far, toe: 10 } }, arms: { near: arm, far: { ...arm } }, ...(face ? { face } : {}), props: [bike(c, i / 8)] });
}

/**
 * Bici rápida: el cuerpo bien adelante, casi pegado al manubrio, la cabeza levantada mirando el camino y la cara de
 * esfuerzo, al doble de cadencia que `bike`. Va sentado: parado en los pedales, un chibi alto no cabe en la celda.
 */
export const bikeFast: AnimDef = {
  name: 'bike_fast', pack: 'bike', fps: 14, loop: true, hairTrail: -1,
  build: (c) => Array.from({ length: 8 }, (_, i) => pedalea(c, i, 44, 0, { eyes: 'angry', mouth: 'grin' })),
};

/**
 * Caerse de la bici: la rueda se va de lado, la bici se acuesta en el piso y el ciclista sale rodando por encima
 * (aterriza) y queda tirado al lado de la bici, que se queda en el cuadro.
 */
export const bikeCrash: AnimDef = {
  name: 'bike_crash', pack: 'bike', fps: 14, loop: false, hairTrail: -1,
  events: [{ type: 'aterriza', phase: 4 / 8 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const p0 = pedalea(c, 0, 34, 0, effort);
    const p1 = { ...pedalea(c, 1, 44, c.u < 0.8 ? 0 : R(c, 1), scared), props: [bike(c, 1 / 8, { lay: 0.25 })] };
    // el ciclista sale por encima del manubrio, la bici se acuesta
    const vuela = P(c, { torso: 80, air: R(c, 5), x: R(c, 3), legs: { near: { x: -0.4 * L, y: 0.55 * L, toe: 40 }, far: { x: -0.55 * L, y: 0.4 * L, toe: 50 } }, arms: { near: { shoulder: 150, elbow: 10 }, far: { shoulder: 140, elbow: 20 } }, face: scared, fit: true, props: [bike(c, 1 / 8, { lay: 0.6, x: -R(c, 2) })] });
    const cae = P(c, { torso: 100, air: R(c, 2), x: R(c, 4), legs: { near: { x: -0.5 * L, y: 0.3 * L, toe: 50 }, far: { x: -0.6 * L, y: 0.15 * L, toe: 50 } }, arms: { near: { shoulder: 170, elbow: 30 }, far: { shoulder: 160, elbow: 30 } }, face: hurt, fit: true, props: [bike(c, 1 / 8, { lay: 0.7, x: -R(c, 3) })] });
    const tirado = { ...down(c, 0, 'hurt'), props: [bike(c, 1 / 8, { lay: 0.8, x: -Math.round(1.1 * L) })] };
    const rebota = { ...tirado, air: R(c, 1) };
    void u;
    return [p0, p1, vuela, cae, tirado, rebota, tirado, { ...tirado, face: { eyes: 'closed' as const, mouth: 'o' as const } }];
  },
};

/** La patineta en el piso, delante o detrás de la cadera; con `flip` va de canto (salió volando). */
const tabla = (x: number, y = 0): PropState => ({ kind: 'skate', at: 'ground', x, y });

/**
 * Caerse de la patineta: la tabla se va para adelante, el cuerpo se va para atrás con los brazos al aire y cae de
 * espalda (aterriza). La tabla sigue rodando y sale del cuadro.
 */
export const skateCrash: AnimDef = {
  name: 'skate_crash', pack: 'skate', fps: 14, loop: false, hairTrail: -1,
  events: [{ type: 'aterriza', phase: 4 / 8 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const deck = Math.max(2, Math.round(2 * u)) + Math.max(1, Math.round(u));
    const monta = P(c, { torso: 10, air: deck, legs: { near: { x: 0.35 * L, y: L - 1, z: 1 }, far: { x: -0.3 * L, y: L - 1, z: 1 } }, arms: { near: { shoulder: 50, elbow: 20, spread: 40 }, far: { shoulder: -30, elbow: 20, spread: 40 } }, props: [tabla(0.05 * L)] });
    const tropieza = P(c, { torso: -12, air: deck, legs: { near: { x: 0.5 * L, y: L - 1.5, toe: -20 }, far: { x: -0.2 * L, y: L - 1.2, z: 1 } }, arms: { near: { shoulder: 110, elbow: 10, spread: 50 }, far: { shoulder: 140, elbow: 10, spread: 50 } }, face: scared, props: [tabla(0.25 * L)] });
    const atras = P(c, { torso: -35, air: R(c, 4), legs: { near: { x: 0.6 * L, y: 0.6 * L, toe: -20 }, far: { x: 0.3 * L, y: 0.75 * L, toe: -10 } }, arms: { near: { shoulder: 160, elbow: 10, spread: 50 }, far: { shoulder: 175, elbow: 10, spread: 50 } }, face: { eyes: 'wide', mouth: 'open' }, fit: true, props: [tabla(0.6 * L, 0)] });
    const cae = P(c, { torso: -65, air: R(c, 2), legs: { near: { x: 0.75 * L, y: 0.35 * L, toe: -30 }, far: { x: 0.55 * L, y: 0.45 * L, toe: -20 } }, arms: { near: { shoulder: 150, elbow: 20 }, far: { shoulder: 165, elbow: 20 } }, face: hurt, fit: true, props: [tabla(0.95 * L)] });
    const tirado = down(c, 0, 'hurt');
    void u;
    return [monta, tropieza, atras, cae, tirado, { ...tirado, air: R(c, 1) }, tirado, { ...tirado, face: { eyes: 'closed' as const, mouth: 'o' as const } }];
  },
};

// ---------------------------------------------------------------- B3: el poste

/**
 * Agarrado del poste (que dibuja el juego, delante del cuerpo): las manos una sobre otra adelante y arriba, las
 * rodillas dobladas abrazando el poste y los pies juntos. k = 0 encogido (las rodillas arriba), 1 estirado.
 */
function enPoste(c: Ctx, k: number, manoArriba: 'near' | 'far', face: Pose['face'] = effort): Pose {
  const L = c.L;
  const alta = { shoulder: 168, elbow: 20 }, baja = { shoulder: 140, elbow: 55 };
  return P(c, {
    torso: 8 - 4 * k, head: { tilt: -10, dx: 0, dy: 0 },
    legs: { near: { x: 0.32 * L, y: L - 0.35 * L * (1 - k) - 0.6, toe: 20 }, far: { x: 0.28 * L, y: L - 0.35 * L * (1 - k) - 0.3, toe: 25 } },
    arms: manoArriba === 'near' ? { near: alta, far: baja } : { near: baja, far: alta },
    face, support: 'both',
  });
}

/**
 * Trepar el poste: como un gusano medidor. Sube una mano, sube la otra, encoge las piernas abrazando el poste y se
 * estira. Un `paso` por cada mano que agarra más arriba, con su `punto`. En bucle: el juego sube el sprite.
 */
export const climbPole: AnimDef = {
  name: 'climb_pole', pack: 'climb', fps: 10, loop: true, views: ['side', 'front', 'back'],
  events: [{ type: 'paso', phase: 0, joint: 'handNear' }, { type: 'paso', phase: 0.5, joint: 'handFar' }],
  build: (c) => [
    enPoste(c, 1, 'near'), enPoste(c, 0.75, 'near'), enPoste(c, 0.4, 'near', strain), enPoste(c, 0.1, 'near', strain),
    enPoste(c, 1, 'far'), enPoste(c, 0.75, 'far'), enPoste(c, 0.4, 'far', strain), enPoste(c, 0.1, 'far', strain),
  ],
};

/** Quieto en el poste: respira, la cabeza mira para arriba y para abajo. */
export const poleIdle: AnimDef = {
  name: 'pole_idle', pack: 'climb', fps: 6, loop: true, views: ['side', 'front', 'back'],
  build: (c) => [0, 1, 2, 1].map((i) => {
    const p = enPoste(c, 0.5, 'near', { eyes: 'open', mouth: 'line' });
    return { ...p, head: { tilt: -10 + i * 6, dx: 0, dy: 0 }, torso: p.torso + (i === 2 ? 1 : 0) };
  }),
};

/**
 * Golpe hacia arriba desde el poste: la mano de arriba se queda agarrada, la otra se carga abajo y pega por encima de
 * la cabeza (impacto con `punto` en esa mano, arriba) al que trepa más arriba.
 */
export const polePunch: AnimDef = {
  name: 'pole_punch', pack: 'climb', fps: 14, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 3 / 6, joint: 'handNear' }],
  build: (c) => {
    const base = enPoste(c, 0.5, 'far');
    const carga = { ...base, torso: 14, head: { tilt: -16, dx: 0, dy: 0 }, arms: { ...base.arms, near: { shoulder: 70, elbow: 120 } }, face: fierce };
    const sube = { ...carga, torso: 6, arms: { ...base.arms, near: { shoulder: 140, elbow: 70 } } };
    const pega = { ...carga, torso: 0, head: { tilt: -22, dx: 0, dy: 0 }, arms: { ...base.arms, near: { shoulder: 182, elbow: 0 } }, face: { eyes: 'angry' as const, mouth: 'grin' as const }, props: [spark('handNear', -90)] };
    const queda = { ...pega, props: [], face: fierce };
    return [base, carga, sube, pega, queda, { ...base, face: fierce }];
  },
};

/** Deslizarse por el poste: las manos sueltas arriba, las piernas apretando, el cuerpo un poco atrás y el pelo para arriba. */
export const poleSlide: AnimDef = {
  name: 'pole_slide', pack: 'climb', fps: 12, loop: true, views: ['side', 'front', 'back'],
  build: (c) => [0, 1, 0, 1].map((i) => {
    const p = enPoste(c, 0.7, i ? 'near' : 'far', { eyes: 'wide', mouth: i ? 'o' : 'open' });
    return { ...p, torso: p.torso - 4, arms: { near: { shoulder: 160, elbow: 40 + i * 6 }, far: { shoulder: 150, elbow: 50 - i * 6 } }, hair: { dx: 0, dy: -1 } };
  }),
};

/**
 * Patada hacia abajo desde el poste: agarrado con las dos manos, recoge la rodilla y la estira hacia abajo con el
 * talón (impacto en el pie) al que viene trepando. Al estirar, el pie que patea pasa a ser lo más bajo.
 */
export const poleKickDown: AnimDef = {
  name: 'pole_kick_down', pack: 'climb', fps: 14, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 3 / 6, joint: 'footNear' }],
  build: (c) => {
    const L = c.L;
    const base = enPoste(c, 0.3, 'near', fierce);
    const recoge = { ...base, torso: 2, legs: { ...base.legs, near: { x: 0.35 * L, y: 0.3 * L, toe: 0 } } };
    const patea = { ...base, torso: -6, head: { tilt: 18, dx: 0, dy: 0 }, legs: { near: { x: 0.05 * L, y: L + 0.2 * L, toe: -40 }, far: base.legs.far }, face: { eyes: 'angry' as const, mouth: 'grin' as const }, props: [spark('footNear', 90)] };
    const queda = { ...patea, props: [], face: fierce };
    return [base, recoge, { ...recoge, torso: 4 }, patea, queda, base];
  },
};

/** Sacudir el poste desde abajo: lo agarra con las dos manos a la altura del pecho y lo sacude adelante y atrás (impacto). */
export const poleShake: AnimDef = {
  name: 'pole_shake', pack: 'climb', fps: 12, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 2 / 6, joint: 'handNear' }],
  build: (c) => {
    const L = c.L;
    const k = (torso: number, x: number, sh: number, face: Pose['face']) => P(c, { torso, x: R(c, x), legs: { near: { x: 0.3 * L, y: L - 0.9 }, far: { x: -0.3 * L, y: L - 0.7 } }, arms: { near: { shoulder: sh, elbow: 40 }, far: { shoulder: sh + 4, elbow: 40 } }, face, support: 'both' });
    return [k(6, 0, 90, fierce), k(-10, -1, 100, strain), k(18, 1, 80, strain), k(-12, -1, 102, strain), k(16, 1, 82, strain), k(4, 0, 90, fierce)];
  },
};

/**
 * Jalar del pie al que trepa: estira los brazos bien arriba, agarra (impacto, con las manos arriba) y jala hacia
 * abajo con todo el cuerpo, doblando las rodillas.
 */
export const grabLegUp: AnimDef = {
  name: 'grab_leg_up', pack: 'climb', fps: 12, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 2 / 6, joint: 'handNear' }],
  build: (c) => {
    const L = c.L;
    const mira = P(c, { torso: -6, head: { tilt: -18, dx: 0, dy: 0 }, legs: feet(c, 0.2, 0.2), arms: { near: { shoulder: 100, elbow: 50 }, far: { shoulder: 95, elbow: 50 } }, face: fierce, support: 'both' });
    const estira = P(c, { torso: -8, air: R(c, 1), head: { tilt: -22, dx: 0, dy: 0 }, legs: { near: { x: 0.1 * L, y: L - 0.3, toe: 30 }, far: { x: -0.1 * L, y: L - 0.3, toe: 30 } }, arms: { near: up(1), far: up(0.95) }, face: { eyes: 'angry', mouth: 'open' } });
    const agarra = P(c, { torso: -6, head: { tilt: -20, dx: 0, dy: 0 }, legs: feet(c, 0.1, 0.2), arms: { near: up(1), far: up(1) }, face: strain, support: 'both' });
    const jala = P(c, { torso: 18, head: { tilt: 6, dx: 0, dy: 0 }, legs: feet(c, 0.6, 0.26), arms: { near: { shoulder: 120, elbow: 60 }, far: { shoulder: 115, elbow: 60 } }, face: strain, support: 'both' });
    const abajo = P(c, { torso: 26, head: { tilt: 10, dx: 0, dy: 0 }, legs: feet(c, 0.7, 0.28), arms: { near: { shoulder: 70, elbow: 70 }, far: { shoulder: 65, elbow: 70 } }, face: strain, support: 'both' });
    return [mira, estira, agarra, jala, abajo, { ...mira, face: fierce }];
  },
};

export const RECORRIDOS: AnimDef[] = [ladder, climbWall, ledgeHang, pullUp, balanceWalk, balanceWobble, balanceFall, duckRun, bikeFast, bikeCrash, skateCrash];
export const TREPAR: AnimDef[] = [climbPole, poleIdle, polePunch, poleSlide, poleKickDown, poleShake, grabLegUp];
