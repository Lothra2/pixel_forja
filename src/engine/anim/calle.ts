import type { Pose } from '../rig/pose';
import { type AnimDef, type Ctx, P, TAU } from './types';

/**
 * La gente de la calle (lote C6a): los NPC que el juego pone en los escenarios y que reaccionan cuando pasa un atleta.
 * Bailarines de break (toprock, molino y reclama), pelados que juegan fútbol (espera, patear y perdón), el grafitero
 * (pintar y mirar), los músicos (tocar y animar) y el vendedor (llamar y ofrecer).
 *
 * Se leen de frente o en 3/4 hacia la calle: así los dibuja el kit. No se mueven de su sitio: el juego los pone y, si
 * hace falta, los lleva (la ronda de los bailarines). La pierna de la patada y los brazos se abren hacia los lados con
 * `z` y `spread`, que es lo que se ve de frente.
 */

const happy = { eyes: 'happy' as const, mouth: 'grin' as const };
const angry = { eyes: 'angry' as const, mouth: 'open' as const };
const sorry = { eyes: 'sad' as const, mouth: 'smirk' as const };

/** Los dos pies apoyados, abiertos `ancho` a los lados (en largos de pierna), con agachada `k`. */
function pies(c: Ctx, ancho: number, k = 0, adelante = 0): Pose['legs'] {
  const y = c.L - 0.2 - k * c.L * 0.3;
  return { near: { x: adelante * c.L, y, z: ancho * c.L }, far: { x: -adelante * c.L, y, z: ancho * c.L } };
}

/** Un brazo abierto hacia el costado: `abre` grados de abertura, `codo` doblado. */
const brazo = (shoulder: number, elbow: number, spread: number) => ({ shoulder, elbow, spread });

// ---------------------------------------------------------------- bailarines de break

/**
 * Toprock: el paso de pie del break. Cruza un pie por delante del otro con un rebote, los brazos abiertos que van y
 * vienen y el cuerpo que se mece. Bucle de 8 a 10 fps.
 */
export const toprock: AnimDef = {
  name: 'toprock', pack: 'calle', fps: 10, loop: true, views: ['front', 'side', 'back'],
  build: (c) => Array.from({ length: 8 }, (_, i) => {
    const t = (i / 8) * TAU, s = Math.sin(t), rebote = Math.abs(Math.cos(t));
    const cruza = s > 0;
    return P(c, {
      roll: Math.round(s * 7), air: Math.round(rebote * 1.5 * c.u),
      legs: {
        near: { x: 0.12 * c.L, y: c.L - 0.4 - (cruza ? 0.18 * c.L : 0), z: (cruza ? -0.12 : 0.22) * c.L, toe: cruza ? 20 : 0 },
        far: { x: -0.05 * c.L, y: c.L - 0.4 - (!cruza ? 0.12 * c.L : 0), z: (!cruza ? -0.05 : 0.2) * c.L },
      },
      arms: { near: brazo(40 + s * 50, 70, 45 + s * 25), far: brazo(40 - s * 50, 70, 45 - s * 25) },
      head: { tilt: Math.round(-s * 8), dx: 0, dy: 0 }, face: happy, support: cruza ? 'far' : 'near',
    });
  }),
};

/**
 * Molino (windmill): en el piso, el cuerpo gira sobre la espalda y los hombros con las piernas abiertas en V que dan
 * la vuelta en el aire. 8 cuadros en bucle: el giro se lee por las piernas, que pasan por arriba.
 */
export const molino: AnimDef = {
  name: 'molino', pack: 'calle', fps: 12, loop: true, views: ['front', 'side', 'back'],
  build: (c) => Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * 360;
    // las piernas abiertas en V, apuntando hacia arriba y girando con el cuerpo
    const v = 0.55 * c.L;
    return P(c, {
      roll: Math.round(90 + a) % 360 - 180, flat: true, fit: true, air: 0,
      legs: { near: { x: 0, y: 0.15 * c.L, z: v }, far: { x: 0, y: 0.15 * c.L, z: v } },
      arms: { near: brazo(10, 20, 30), far: brazo(170, 10, 60) },
      face: { eyes: 'closed', mouth: 'grin' },
    });
  }),
};

/** Reclama: se para de golpe, abre los brazos y le grita al que lo atropelló. 4 cuadros, sin bucle. */
export const reclama: AnimDef = {
  name: 'reclama', pack: 'calle', fps: 8, loop: false, views: ['front', 'side', 'back'],
  build: (c) => [
    P(c, { legs: pies(c, 0.15), arms: { near: brazo(20, 30, 20), far: brazo(20, 30, 20) }, face: { eyes: 'wide', mouth: 'o' } }),
    P(c, { roll: -4, legs: pies(c, 0.18), arms: { near: brazo(70, 80, 70), far: brazo(70, 80, 70) }, face: angry }),
    P(c, { roll: 4, legs: pies(c, 0.18), arms: { near: brazo(110, 40, 80), far: brazo(60, 90, 60) }, head: { tilt: 6, dx: 0, dy: 0 }, face: angry }),
    P(c, { legs: pies(c, 0.16), arms: { near: brazo(60, 100, 40), far: brazo(60, 100, 40) }, face: { eyes: 'angry', mouth: 'frown' } }),
  ],
};

// ---------------------------------------------------------------- pelados del fútbol

/** Espera: el pelado listo para recibir, agachadito, rebotando en las puntas. Bucle de 4. */
export const espera: AnimDef = {
  name: 'espera', pack: 'calle', fps: 6, loop: true, views: ['front', 'side', 'back'],
  build: (c) => [0, 1, 2, 1].map((k) => P(c, {
    air: k === 1 ? Math.round(c.u) : 0, legs: pies(c, 0.16, 0.25 - k * 0.06),
    arms: { near: brazo(15, 40, 25), far: brazo(15, 40, 25) }, face: { eyes: 'open', mouth: 'smile' },
  })),
};

/**
 * Patear: echa la pierna al costado y le pega a la pelota hacia el lado (la pelota cruza el callejón). 5 cuadros; en
 * el 3ro (índice 2) el pie toca la pelota: ahí el juego la suelta.
 */
export const patear: AnimDef = {
  name: 'patear', pack: 'calle', fps: 12, loop: false, views: ['front', 'side', 'back'],
  events: [{ type: 'impacto', phase: 2 / 5, joint: 'footNear' }],
  build: (c) => {
    const L = c.L;
    const apoyo = (r: number, near: { x: number; y: number; z: number; toe?: number }, brazos: number): Pose => P(c, {
      roll: r, legs: { near, far: { x: 0, y: L - 0.2, z: 0.05 * L } },
      arms: { near: brazo(20 + brazos, 40, 40 + brazos), far: brazo(20 + brazos, 40, 50 + brazos) },
      face: { eyes: 'open', mouth: 'open' }, support: 'far',
    });
    return [
      apoyo(0, { x: 0, y: L - 0.2, z: 0.12 * L }, 0),
      apoyo(-8, { x: 0, y: L - 0.25 * L, z: -0.25 * L, toe: 20 }, 15),
      apoyo(10, { x: 0, y: L - 0.35 * L, z: 0.55 * L, toe: 40 }, 35),
      apoyo(6, { x: 0, y: L - 0.2 * L, z: 0.4 * L, toe: 20 }, 20),
      P(c, { legs: pies(c, 0.14), arms: { near: brazo(10, 30, 20), far: brazo(10, 30, 20) }, face: happy }),
    ];
  },
};

/** Perdón: le pegó a alguien con la pelota. Se encoge, junta las manos y pone cara de "no fue a propósito". 4 cuadros. */
export const perdon: AnimDef = {
  name: 'perdon', pack: 'calle', fps: 8, loop: false, views: ['front', 'side', 'back'],
  build: (c) => [
    P(c, { legs: pies(c, 0.14), arms: { near: brazo(30, 60, 20), far: brazo(30, 60, 20) }, face: { eyes: 'wide', mouth: 'o' } }),
    P(c, { legs: pies(c, 0.12, 0.1), arms: { near: brazo(60, 110, 5), far: brazo(60, 110, 5) }, head: { tilt: 8, dx: 0, dy: 1 }, face: sorry }),
    P(c, { legs: pies(c, 0.12, 0.12), arms: { near: brazo(65, 115, 5), far: brazo(65, 115, 5) }, head: { tilt: -6, dx: 0, dy: 1 }, face: sorry }),
    P(c, { legs: pies(c, 0.12, 0.1), arms: { near: brazo(140, 10, 70), far: brazo(10, 20, 20) }, face: { eyes: 'happy', mouth: 'smirk' } }),
  ],
};

// ---------------------------------------------------------------- el grafitero

const spray = (angle = -60) => ({ kind: 'spray' as const, at: 'handNear' as const, angle, front: true });

/** Pintar: el brazo con la lata sube y baja trazando, el otro en la cintura. Bucle de 6 (de espaldas, contra el muro). */
export const pintar: AnimDef = {
  name: 'pintar', pack: 'calle', fps: 8, loop: true, views: ['back', 'front', 'side'],
  build: (c) => Array.from({ length: 6 }, (_, i) => {
    const t = (i / 6) * TAU;
    return P(c, {
      legs: pies(c, 0.18), roll: Math.round(Math.sin(t) * 4),
      arms: { near: brazo(120 + Math.sin(t) * 30, 20 + Math.cos(t) * 15, 30 + Math.cos(t) * 25), far: brazo(-20, 100, 30) },
      face: { eyes: 'open', mouth: 'line' }, props: [spray(-80)],
    });
  }),
};

/** Mirar: se voltea con la lata en la mano a ver quién pasa. 3 cuadros, sin bucle. */
export const mirar: AnimDef = {
  name: 'mirar', pack: 'calle', fps: 6, loop: false, views: ['front', 'side', 'back'],
  build: (c) => [
    P(c, { legs: pies(c, 0.18), arms: { near: brazo(60, 70, 20), far: brazo(-20, 100, 30) }, face: { eyes: 'open', mouth: 'line' }, props: [spray(-70)] }),
    P(c, { legs: pies(c, 0.18), head: { tilt: 8, dx: 0, dy: 0 }, arms: { near: brazo(40, 90, 15), far: brazo(-20, 100, 30) }, face: { eyes: 'wide', mouth: 'o' }, props: [spray(-50)] }),
    P(c, { legs: pies(c, 0.18), head: { tilt: 4, dx: 0, dy: 0 }, arms: { near: brazo(30, 100, 10), far: brazo(-20, 100, 30) }, face: { eyes: 'happy', mouth: 'smirk' }, props: [spray(-40)] }),
  ],
};

// ---------------------------------------------------------------- los músicos

/** Tocar el rap: el que tiene el micrófono rebota con el brazo libre marcando el ritmo. Bucle de 8 a 8 fps. */
export const rapear: AnimDef = {
  name: 'rapear', pack: 'calle', fps: 8, loop: true, views: ['front', 'side', 'back'],
  build: (c) => Array.from({ length: 8 }, (_, i) => {
    const b = i % 2 === 0, t = (i / 8) * TAU;
    return P(c, {
      legs: pies(c, 0.2, b ? 0.12 : 0.02), roll: Math.round(Math.sin(t) * 5),
      arms: { near: brazo(95, 120, 10), far: brazo(60 + Math.sin(t) * 40, 50, 60 + Math.cos(t) * 20) },
      face: { eyes: b ? 'closed' : 'open', mouth: b ? 'open' : 'grin' },
      props: [{ kind: 'microfono', at: 'handNear', angle: -100, front: true }],
    });
  }),
};

/** Tocar el tambor: la tambora colgada adelante y las dos manos que pegan una y otra. Bucle de 8 a 8 fps. */
export const tamborear: AnimDef = {
  name: 'tamborear', pack: 'calle', fps: 8, loop: true, views: ['front', 'side', 'back'],
  build: (c) => Array.from({ length: 8 }, (_, i) => {
    const a = i % 2 === 0;
    return P(c, {
      legs: pies(c, 0.2, i % 4 < 2 ? 0.08 : 0),
      arms: { near: brazo(a ? 70 : 30, a ? 60 : 80, 25), far: brazo(a ? 30 : 70, a ? 80 : 60, 25) },
      face: { eyes: a ? 'happy' : 'open', mouth: 'grin' },
      props: [{ kind: 'tambor', at: 'body', x: 0, y: 0, front: true }],
    });
  }),
};

/** Animar: los dos brazos arriba gritando, con un saltito. 4 cuadros. */
export const animar: AnimDef = {
  name: 'animar', pack: 'calle', fps: 8, loop: false, views: ['front', 'side', 'back'],
  build: (c) => [
    P(c, { legs: pies(c, 0.2, 0.2), arms: { near: brazo(60, 90, 30), far: brazo(60, 90, 30) }, face: happy }),
    P(c, { air: Math.round(3 * c.u), legs: pies(c, 0.18), arms: { near: brazo(170, 10, 60), far: brazo(170, 10, 60) }, face: { eyes: 'happy', mouth: 'open' } }),
    P(c, { air: Math.round(1 * c.u), legs: pies(c, 0.2), arms: { near: brazo(160, 20, 70), far: brazo(150, 30, 50) }, face: { eyes: 'happy', mouth: 'open' } }),
    P(c, { legs: pies(c, 0.2, 0.08), arms: { near: brazo(120, 50, 50), far: brazo(40, 60, 30) }, face: happy }),
  ],
};

// ---------------------------------------------------------------- el vendedor de paletas

/** Llamar: sacude la campanita en alto, pregonando. Bucle de 4. */
export const llamar: AnimDef = {
  name: 'llamar', pack: 'calle', fps: 8, loop: true, views: ['front', 'side', 'back'],
  build: (c) => [0, 1, 2, 1].map((k) => P(c, {
    legs: pies(c, 0.16),
    arms: { near: brazo(140 + (k - 1) * 12, 30, 40), far: brazo(-10, 20, 15) },
    face: { eyes: 'happy', mouth: k === 1 ? 'open' : 'grin' },
    props: [{ kind: 'campana', at: 'handNear', angle: -90 + (k - 1) * 30, front: true }],
  })),
};

/** Ofrecer: estira el brazo con una paleta hacia el que pasa. 3 cuadros, sin bucle. */
export const ofrecer: AnimDef = {
  name: 'ofrecer', pack: 'calle', fps: 8, loop: false, views: ['front', 'side', 'back'],
  build: (c) => [
    P(c, { legs: pies(c, 0.16), arms: { near: brazo(30, 60, 20), far: brazo(-10, 20, 15) }, face: { eyes: 'open', mouth: 'smile' }, props: [{ kind: 'paleta', at: 'handNear', angle: -90, front: true }] }),
    P(c, { legs: pies(c, 0.16), arms: { near: brazo(70, 30, 40), far: brazo(-10, 20, 15) }, face: { eyes: 'happy', mouth: 'grin' }, props: [{ kind: 'paleta', at: 'handNear', angle: -60, front: true }] }),
    P(c, { roll: 4, legs: pies(c, 0.16), arms: { near: brazo(85, 10, 55), far: brazo(-10, 20, 15) }, face: { eyes: 'happy', mouth: 'open' }, props: [{ kind: 'paleta', at: 'handNear', angle: -40, front: true }] }),
  ],
};

/** Las animaciones de la gente de la calle. */
export const CALLE: AnimDef[] = [toprock, molino, reclama, espera, patear, perdon, pintar, mirar, rapear, tamborear, animar, llamar, ofrecer];
