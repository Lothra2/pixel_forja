import type { Pose, PropState } from '../rig/pose';
import { type AnimDef, type Ctx, P, feet } from './types';

/**
 * Voleibol y tenis premium. La pelota se dibuja hasta el contacto (después la mueve el juego) y el evento "impacto"
 * marca el cuadro exacto del golpe. En los remates y saques en salto el juego sube el sprite (rise).
 * La raqueta lleva su ángulo por vista y una estela en el cuadro del golpe.
 *
 * Regla del chibi: la cabeza ocupa casi media altura y los brazos son cortos. Una pelota a la altura de la cara va
 * claramente adelante (x > 1.4 L) o encima de la cabeza; nunca en el medio, porque tapa la cara y no se lee.
 */

const ball = (kind: 'volleyball' | 'tennisball', x: number, y: number): PropState => ({ kind, at: 'ground', x, y });

function stance(c: Ctx, bounce = 0): Pose {
  const L = c.L;
  return P(c, {
    torso: 14, legs: { near: { x: 0.3 * L, y: L - 1.6 + bounce }, far: { x: -0.3 * L, y: L - 1.6 + bounce } },
    arms: { near: { shoulder: 35, elbow: 70, spread: 15 }, far: { shoulder: 30, elbow: 70, spread: 15 } }, face: { eyes: 'open', mouth: 'line' }, support: 'both',
  });
}

// ---------- vóley ----------

/** Posición de espera: bajo, el peso adelante, rebotando sobre las puntas. */
export const vbReady: AnimDef = {
  name: 'vb_ready', pack: 'volley', fps: 6, loop: true, steady: true, views: ['side', 'front', 'back'],
  build: (c) => [stance(c), stance(c), stance(c, 1), stance(c, 1)],
};

/** Recepción: los antebrazos juntos como una tabla, las piernas empujan y la pelota rebota en la plataforma. */
export const vbBump: AnimDef = {
  name: 'vb_bump', pack: 'volley', fps: 10, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 3 / 7 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const platform = { near: { shoulder: 45, elbow: 0, spread: 8 }, far: { shoulder: 45, elbow: 0, spread: 8 } };
    const ready = stance(c);
    const low = P(c, { torso: 22, legs: { near: { x: 0.35 * L, y: L - 2.2 }, far: { x: -0.3 * L, y: L - 2 } }, arms: platform, face: { eyes: 'open', mouth: 'line' }, support: 'both' });
    // contacto: las piernas se estiran un poco y la plataforma sube apenas (no se hace swing con los brazos)
    const hit = P(c, { torso: 14, legs: { near: { x: 0.3 * L, y: L - 1.4 }, far: { x: -0.3 * L, y: L - 1.2, toe: 10 } },
      arms: { near: { shoulder: 60, elbow: 0, spread: 8 }, far: { shoulder: 60, elbow: 0, spread: 8 } }, face: { eyes: 'angry', mouth: 'line' }, support: 'both' });
    const hold = P(c, { ...hit, torso: 10, arms: { near: { shoulder: 65, elbow: 0, spread: 8 }, far: { shoulder: 65, elbow: 0, spread: 8 } } });
    const seq = [ready, low, low, hit, hold, hold, ready];
    // la pelota llega de adelante y arriba hasta la plataforma de los antebrazos
    const bx = [2.0, 1.6, 1.35, 1.2], by = [22, 15, 11, 10];
    return seq.map((p, i) => ({ ...p, props: i <= 3 ? [{ ...ball('volleyball', bx[i] * L, by[i] * u), front: true } as PropState] : undefined }));
  },
};

/** Colocación: debajo de la pelota, las manos en la frente como un triángulo, empuja con piernas y brazos. */
export const vbSet: AnimDef = {
  name: 'vb_set', pack: 'volley', fps: 10, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 3 / 7 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const under = P(c, { torso: 0, head: { tilt: -18 }, legs: feet(c, 0.6, 0.2), arms: { near: { shoulder: 150, elbow: 90 }, far: { shoulder: 145, elbow: 90 } }, face: { eyes: 'open', mouth: 'line' }, support: 'both' });
    const load = P(c, { ...under, legs: feet(c, 0.8, 0.2), arms: { near: { shoulder: 145, elbow: 110 }, far: { shoulder: 140, elbow: 110 } } });
    const push = P(c, { torso: -4, head: { tilt: -20 }, legs: { near: { x: 0.1 * L, y: L - 0.1, toe: 30 }, far: { x: -0.1 * L, y: L - 0.1, toe: 30 } },
      arms: { near: { shoulder: 170, elbow: 10 }, far: { shoulder: 168, elbow: 10 } }, face: { eyes: 'open', mouth: 'o' }, support: 'both' });
    const seq = [stance(c), under, load, push, push, under, stance(c)];
    // la pelota baja hasta quedar justo encima de la frente (sobre el pelo), donde la reciben las manos
    const bx = [1.0, 0.8, 0.6, 0.55], by = [40, 39, 38, 38];
    return seq.map((p, i) => ({ ...p, props: i <= 3 ? [{ ...ball('volleyball', bx[i] * L, by[i] * u), front: true } as PropState] : undefined }));
  },
};

/**
 * Remate: tres pasos de carrera, el último largo con los dos brazos atrás, salto con los brazos arriba, el brazo
 * de golpe se arma atrás como un arco, latigazo sobre la pelota, cae con las dos piernas.
 */
export const spike: AnimDef = {
  name: 'spike', pack: 'volley', fps: 12, loop: false, views: ['side', 'front', 'back'], lateral: true,
  events: [{ type: 'paso', phase: 0 }, { type: 'despegue', phase: 3 / 11 }, { type: 'impacto', phase: 6 / 11 }, { type: 'aterriza', phase: 8 / 11 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const R = (v: number) => Math.round(v * u);
    const face = { eyes: 'angry' as const, mouth: 'line' as const };
    const step = P(c, { torso: 14, legs: { near: { x: 0.35 * L, y: L - 0.5 }, far: { x: -0.4 * L, y: L - 0.6, toe: 30 } }, arms: { near: { shoulder: -30, elbow: 40 }, far: { shoulder: 30, elbow: 40 } }, face, support: 'near' });
    // último paso: largo, los dos brazos bien atrás
    const plant = P(c, { torso: 24, legs: { near: { x: 0.45 * L, y: L - 1.8 }, far: { x: -0.2 * L, y: L - 1.6 } }, arms: { near: { shoulder: -75, elbow: 10 }, far: { shoulder: -70, elbow: 10 } }, face, support: 'both' });
    // despegue: los brazos suben con fuerza
    const take = P(c, { torso: 4, rise: R(3), legs: { near: { x: 0.05 * L, y: L - 0.1, toe: 50 }, far: { x: -0.05 * L, y: L - 0.1, toe: 50 } },
      arms: { near: { shoulder: 150, elbow: 10 }, far: { shoulder: 150, elbow: 10 } }, face });
    // armado: el brazo de golpe atrás con el codo alto, el otro apunta a la pelota, el cuerpo arqueado
    const cock = P(c, { torso: -12, rise: R(12), legs: { near: { x: -0.15 * L, y: 0.75 * L, toe: 40 }, far: { x: -0.3 * L, y: 0.65 * L, toe: 40 } },
      arms: { near: { shoulder: -120, elbow: 100 }, far: { shoulder: 150, elbow: 10 } }, face });
    const cock2 = { ...cock, rise: R(14), torso: -14 };
    // golpe: el brazo se estira arriba y adelante y baja con todo el cuerpo
    // golpe: el brazo latiguea al frente (delante de la cara: así se ve) y el cuerpo se cierra sobre la pelota
    const hit = P(c, { torso: 20, rise: R(13), legs: { near: { x: 0.2 * L, y: 0.7 * L, toe: 40 }, far: { x: -0.1 * L, y: 0.75 * L, toe: 40 } },
      arms: { near: { shoulder: 100, elbow: 0 }, far: { shoulder: 30, elbow: 40 } }, face: { eyes: 'angry', mouth: 'grin' } });
    const follow = P(c, { torso: 26, rise: R(7), legs: { near: { x: 0.2 * L, y: 0.8 * L, toe: 30 }, far: { x: 0, y: 0.8 * L, toe: 30 } },
      arms: { near: { shoulder: 20, elbow: 20 }, far: { shoulder: 10, elbow: 30 } }, face });
    const land = P(c, { torso: 22, legs: feet(c, 0.85, 0.24), arms: { near: { shoulder: 30, elbow: 30 }, far: { shoulder: 20, elbow: 30 } }, face, support: 'both' });
    const rec = P(c, { torso: 14, legs: feet(c, 0.5, 0.22), arms: { near: { shoulder: 20, elbow: 40 }, far: { shoulder: 15, elbow: 40 } }, face: { eyes: 'happy', mouth: 'grin' }, support: 'both' });
    const seq = [step, { ...step, ...swapLegs(step) }, plant, take, cock, cock2, hit, follow, land, rec, stance(c)];
    // la pelota baja hacia el punto de golpe (por encima y adelante) y se va con el golpe
    const bx = [0, 0, 0, 2.0, 1.9, 1.8, 1.75], by = [0, 0, 0, 36, 33, 30, 27];
    return seq.map((p, i) => ({ ...p, props: i >= 3 && i <= 6 ? [{ ...ball('volleyball', bx[i] * L, by[i] * u), front: true } as PropState] : undefined }));
  },
};

function swapLegs(p: Pose): Pick<Pose, 'legs' | 'arms' | 'support'> {
  return { legs: { near: { ...p.legs.far }, far: { ...p.legs.near } }, arms: { near: { ...p.arms.far }, far: { ...p.arms.near } }, support: p.support === 'near' ? 'far' : 'near' };
}

/** Bloqueo: en la red con las manos a la altura de los hombros, salta, mete las manos sobre la red y cae. */
export const block: AnimDef = {
  name: 'block', pack: 'volley', fps: 10, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'despegue', phase: 2 / 8 }, { type: 'impacto', phase: 4 / 8 }, { type: 'aterriza', phase: 6 / 8 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const R = (v: number) => Math.round(v * u);
    const face = { eyes: 'angry' as const, mouth: 'line' as const };
    const ready = P(c, { torso: 4, legs: feet(c, 0.4, 0.22), arms: { near: { shoulder: 100, elbow: 100 }, far: { shoulder: 100, elbow: 100 } }, face, support: 'both' });
    const load = P(c, { ...ready, legs: feet(c, 0.85, 0.22) });
    const up = P(c, { torso: 6, rise: R(6), legs: { near: { x: 0.05 * L, y: L - 0.1, toe: 50 }, far: { x: -0.05 * L, y: L - 0.1, toe: 50 } },
      arms: { near: { shoulder: 160, elbow: 0, spread: 10 }, far: { shoulder: 158, elbow: 0, spread: 10 } }, face });
    // manos adentro: la muñeca se dobla sobre la red, el tronco se cierra
    const press = P(c, { ...up, rise: R(10), torso: 14, arms: { near: { shoulder: 140, elbow: 20, spread: 10 }, far: { shoulder: 138, elbow: 20, spread: 10 } }, face: { eyes: 'angry', mouth: 'grin' } });
    const down = P(c, { ...up, rise: R(4), torso: 8, arms: { near: { shoulder: 120, elbow: 30 }, far: { shoulder: 118, elbow: 30 } } });
    const land = P(c, { torso: 10, legs: feet(c, 0.8, 0.22), arms: { near: { shoulder: 80, elbow: 60 }, far: { shoulder: 80, elbow: 60 } }, face, support: 'both' });
    return [ready, load, up, press, press, down, land, ready];
  },
};

/** Saque flotado: lanza la pelota con la mano libre, arma el brazo, golpea arriba con la palma firme y sigue. */
export const serve: AnimDef = {
  name: 'serve', pack: 'volley', fps: 10, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'suelta', phase: 2 / 9 }, { type: 'impacto', phase: 5 / 9 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const face = { eyes: 'angry' as const, mouth: 'line' as const };
    const hold = P(c, { torso: 4, legs: { near: { x: 0.25 * L, y: L - 0.5 }, far: { x: -0.25 * L, y: L - 0.4 } }, arms: { near: { shoulder: 20, elbow: 40 }, far: { shoulder: 80, elbow: 30 } }, face: { eyes: 'open', mouth: 'line' }, support: 'both' });
    const toss = P(c, { torso: 0, legs: { near: { x: 0.25 * L, y: L - 0.4 }, far: { x: -0.25 * L, y: L - 0.4 } }, arms: { near: { shoulder: -40, elbow: 60 }, far: { shoulder: 150, elbow: 0 } }, face, support: 'both' });
    const cock = P(c, { torso: -10, legs: { near: { x: 0.35 * L, y: L - 0.6 }, far: { x: -0.25 * L, y: L - 0.5, toe: 20 } }, arms: { near: { shoulder: -130, elbow: 110 }, far: { shoulder: 120, elbow: 10 } }, face, support: 'far' });
    const hit = P(c, { torso: 12, legs: { near: { x: 0.35 * L, y: L - 0.6 }, far: { x: -0.3 * L, y: L - 0.4, toe: 40 } }, arms: { near: { shoulder: 110, elbow: 0 }, far: { shoulder: 20, elbow: 30 } }, face: { eyes: 'angry', mouth: 'open' }, support: 'near' });
    // flotado: el brazo frena después del golpe (no sigue de largo)
    const stop = P(c, { ...hit, torso: 14, arms: { near: { shoulder: 120, elbow: 0 }, far: { shoulder: 10, elbow: 30 } } });
    const walk = P(c, { torso: 10, legs: { near: { x: 0.15 * L, y: L - 0.5 }, far: { x: -0.3 * L, y: L - 0.6, toe: 30 } }, arms: { near: { shoulder: 30, elbow: 40 }, far: { shoulder: 10, elbow: 40 } }, face: { eyes: 'open', mouth: 'line' }, support: 'near' });
    const seq = [hold, hold, toss, cock, cock, hit, stop, walk, stance(c)];
    // en la mano libre, sube por encima de la cabeza y baja adelante, donde la palma la golpea
    const bx = [0.35, 0.35, 0.6, 0.8, 1.15, 1.45], by = [12, 12, 34, 40, 36, 30];
    return seq.map((p, i) => ({ ...p, props: i <= 5 ? [{ ...ball('volleyball', bx[i] * L, by[i] * u), front: true } as PropState] : undefined }));
  },
};

/** Plancha: se lanza al frente, estira los brazos para salvar la pelota y se desliza sobre el pecho. */
export const vbDive: AnimDef = {
  name: 'vb_dive', pack: 'volley', fps: 12, loop: false, views: ['side', 'front', 'back'], lateral: true,
  events: [{ type: 'impacto', phase: 3 / 9 }, { type: 'aterriza', phase: 4 / 9 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const face = { eyes: 'angry' as const, mouth: 'open' as const };
    const push = P(c, { torso: 40, legs: { near: { x: 0.5 * L, y: L - 2 }, far: { x: -0.4 * L, y: L - 1.2, toe: 40 } }, arms: { near: { shoulder: 60, elbow: 10 }, far: { shoulder: 50, elbow: 10 } }, face, support: 'near' });
    const fly = P(c, { torso: 80, air: Math.max(1, Math.round(2 * u)), legs: { near: { x: -0.8 * L, y: 0.3 * L, toe: 70 }, far: { x: -0.85 * L, y: 0.25 * L, toe: 70 } },
      arms: { near: { shoulder: 170, elbow: 0 }, far: { shoulder: 165, elbow: 0 } }, face, flat: true, freeArms: true });
    // salva: una mano por debajo de la pelota
    const save = { ...fly, air: Math.max(1, Math.round(u)), arms: { near: { shoulder: 160, elbow: 0 }, far: { shoulder: 175, elbow: 0 } } };
    const slide = P(c, { torso: 88, legs: { near: { x: -0.85 * L, y: 0.1 * L, toe: 80 }, far: { x: -0.9 * L, y: 0.05 * L, toe: 80 } },
      arms: { near: { shoulder: 170, elbow: 10 }, far: { shoulder: 165, elbow: 10 } }, face: { eyes: 'closed', mouth: 'line' }, flat: true, freeArms: true });
    const getUp = P(c, { torso: 50, legs: { near: { x: 0.3 * L, y: 0.5 * L }, far: { x: -0.3 * L, y: 0.45 * L, toe: 40 } }, arms: { near: { shoulder: 80, elbow: 20 }, far: { shoulder: 75, elbow: 20 } }, face: { eyes: 'open', mouth: 'line' } });
    const seq = [stance(c), push, fly, save, slide, slide, slide, getUp, stance(c)];
    return seq.map((p, i) => ({ ...p, ...(i >= 2 && i <= 6 ? { fit: true } : {}), props: i === 3 ? [ball('volleyball', 1.5 * L, 5 * u)] : undefined }));
  },
};

// ---------- tenis ----------

/** Raqueta con el ángulo de lado (y sus diagonales); de frente y de espalda la orienta el motor. */
const racket = (a: number, smear?: [number, number]): PropState => ({
  kind: 'racket', at: 'handNear', angles: { side: a, se: a + 8, ne: a - 8 },
  ...(smear ? { smear: { side: smear, se: [smear[0] + 8, smear[1] + 8], ne: [smear[0] - 8, smear[1] - 8] } } : {}),
});

/** Espera con split step: la raqueta al frente con las dos manos, un saltito al leer el golpe del rival. */
export const tnReady: AnimDef = {
  name: 'tn_ready', pack: 'tennis', fps: 8, loop: true, steady: true, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L;
    const base = (b: number) => P(c, { torso: 10, x: -2 * c.u, legs: { near: { x: 0.32 * L, y: L - 1.4 + b }, far: { x: -0.32 * L, y: L - 1.4 + b } },
      arms: { near: { shoulder: 50, elbow: 60 }, far: { shoulder: 45, elbow: 70 } }, face: { eyes: 'open', mouth: 'line' }, support: 'both', props: [racket(-40)] });
    return [base(0), base(0), base(1), base(1)];
  },
};

/** Derecha: giro de hombros con la raqueta atrás, paso, golpe de abajo hacia arriba delante del cuerpo y final sobre el hombro. */
export const forehand: AnimDef = {
  name: 'forehand', pack: 'tennis', fps: 12, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 4 / 9 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const face = { eyes: 'angry' as const, mouth: 'line' as const };
    const ready = P(c, { torso: 12, legs: feet(c, 0.5, 0.25), arms: { near: { shoulder: 50, elbow: 60 }, far: { shoulder: 45, elbow: 70 } }, face, support: 'both' });
    // giro: la raqueta atrás y alta, la mano libre señala la pelota
    const turn = P(c, { torso: 4, legs: feet(c, 0.6, 0.26), arms: { near: { shoulder: -80, elbow: 30 }, far: { shoulder: 80, elbow: 20 } }, face, support: 'far' });
    // la raqueta cae por debajo de la pelota (el "lazo") y el paso adelante
    const drop = P(c, { torso: 6, legs: { near: { x: 0.4 * L, y: L - 1.2 }, far: { x: -0.3 * L, y: L - 1 } }, arms: { near: { shoulder: -50, elbow: 20 }, far: { shoulder: 60, elbow: 30 } }, face, support: 'both' });
    const hit = P(c, { torso: 14, legs: { near: { x: 0.4 * L, y: L - 1 }, far: { x: -0.3 * L, y: L - 0.8, toe: 30 } }, arms: { near: { shoulder: 70, elbow: 10 }, far: { shoulder: 20, elbow: 40 } }, face: { eyes: 'angry', mouth: 'open' }, support: 'near' });
    const thru = P(c, { torso: 16, legs: { near: { x: 0.4 * L, y: L - 0.9 }, far: { x: -0.25 * L, y: L - 0.6, toe: 50 } }, arms: { near: { shoulder: 130, elbow: 80 }, far: { shoulder: 10, elbow: 40 } }, face, support: 'near' });
    const rec = P(c, { torso: 10, legs: feet(c, 0.45, 0.25), arms: { near: { shoulder: 40, elbow: 60 }, far: { shoulder: 35, elbow: 60 } }, face, support: 'both' });
    const seq: [Pose, PropState][] = [
      [ready, racket(-40)], [turn, racket(-150)], [turn, racket(-160)], [drop, racket(150)],
      [hit, racket(-10, [120, 350])], [thru, racket(-120)], [thru, racket(-140)], [rec, racket(-50)], [ready, racket(-40)],
    ];
    // la pelota llega por delante hasta la cabeza de la raqueta (nunca por encima del cuerpo)
    return seq.map(([p, r], i) => ({ ...p, props: [r, ...(i <= 4 ? [ball('tennisball', (2.7 - i * 0.22) * L, (14 - i) * u)] : [])] }));
  },
};

/** Revés a dos manos: la raqueta atrás del otro lado, las dos manos empujan y el final queda arriba con los dos brazos. */
export const backhand: AnimDef = {
  name: 'backhand', pack: 'tennis', fps: 12, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 4 / 9 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const face = { eyes: 'angry' as const, mouth: 'line' as const };
    const ready = P(c, { torso: 12, legs: feet(c, 0.5, 0.25), arms: { near: { shoulder: 50, elbow: 60 }, far: { shoulder: 45, elbow: 70 } }, face, support: 'both' });
    // las dos manos juntas en la raqueta, cruzadas detrás del cuerpo
    const turn = P(c, { torso: 0, legs: feet(c, 0.6, 0.26), arms: { near: { shoulder: -30, elbow: 90 }, far: { shoulder: -40, elbow: 80 } }, face, support: 'near' });
    const drop = P(c, { torso: 4, legs: { near: { x: 0.4 * L, y: L - 1.2 }, far: { x: -0.3 * L, y: L - 1 } }, arms: { near: { shoulder: -10, elbow: 60 }, far: { shoulder: -20, elbow: 60 } }, face, support: 'both' });
    const hit = P(c, { torso: 10, legs: { near: { x: 0.4 * L, y: L - 1 }, far: { x: -0.3 * L, y: L - 0.8, toe: 30 } }, arms: { near: { shoulder: 70, elbow: 20 }, far: { shoulder: 65, elbow: 30 } }, face: { eyes: 'angry', mouth: 'grin' }, support: 'near' });
    const thru = P(c, { torso: 6, legs: { near: { x: 0.4 * L, y: L - 0.9 }, far: { x: -0.25 * L, y: L - 0.6, toe: 50 } }, arms: { near: { shoulder: 140, elbow: 60 }, far: { shoulder: 135, elbow: 70 } }, face, support: 'near' });
    const rec = P(c, { torso: 10, legs: feet(c, 0.45, 0.25), arms: { near: { shoulder: 40, elbow: 60 }, far: { shoulder: 35, elbow: 60 } }, face, support: 'both' });
    const seq: [Pose, PropState][] = [
      [ready, racket(-40)], [turn, racket(200)], [turn, racket(195)], [drop, racket(160)],
      [hit, racket(-5, [140, 355])], [thru, racket(-110)], [thru, racket(-120)], [rec, racket(-50)], [ready, racket(-40)],
    ];
    return seq.map(([p, r], i) => ({ ...p, props: [r, ...(i <= 4 ? [ball('tennisball', (2.7 - i * 0.22) * L, (12 - i) * u)] : [])] }));
  },
};

/**
 * Saque: lanza la pelota alto con la mano libre, posición de trofeo (rodillas dobladas, raqueta caída detrás de la
 * espalda), salta a buscar la pelota, golpe arriba con el brazo estirado y cae adentro de la cancha.
 */
export const tennisServe: AnimDef = {
  name: 'tennis_serve', pack: 'tennis', fps: 12, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'suelta', phase: 2 / 11 }, { type: 'impacto', phase: 6 / 11 }, { type: 'aterriza', phase: 8 / 11 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const R = (v: number) => Math.round(v * u);
    const face = { eyes: 'angry' as const, mouth: 'line' as const };
    const stand = P(c, { torso: 4, legs: { near: { x: 0.25 * L, y: L - 0.4 }, far: { x: -0.25 * L, y: L - 0.4 } }, arms: { near: { shoulder: 30, elbow: 40 }, far: { shoulder: 60, elbow: 40 } }, face: { eyes: 'open', mouth: 'line' }, support: 'both' });
    const toss = P(c, { torso: -4, legs: { near: { x: 0.25 * L, y: L - 0.6 }, far: { x: -0.25 * L, y: L - 0.6 } }, arms: { near: { shoulder: -50, elbow: 30 }, far: { shoulder: 160, elbow: 0 } }, face, support: 'both' });
    // trofeo: rodillas dobladas, pecho arriba, la raqueta cae detrás de la espalda
    const trophy = P(c, { torso: -14, legs: { near: { x: 0.25 * L, y: L - 1.6 }, far: { x: -0.25 * L, y: L - 1.6 } }, arms: { near: { shoulder: -140, elbow: 120 }, far: { shoulder: 150, elbow: 0 } }, face, support: 'both' });
    const drop = { ...trophy, torso: -10, arms: { near: { shoulder: -160, elbow: 140 }, far: { shoulder: 130, elbow: 10 } } };
    // golpe: salta a la pelota con el brazo estirado arriba
    const hit = P(c, { torso: 8, rise: R(4), legs: { near: { x: 0.1 * L, y: L - 0.1, toe: 50 }, far: { x: -0.15 * L, y: L - 0.2, toe: 50 } },
      arms: { near: { shoulder: 165, elbow: 0 }, far: { shoulder: 40, elbow: 40 } }, face: { eyes: 'angry', mouth: 'open' } });
    const pron = P(c, { torso: 22, rise: R(2), legs: { near: { x: 0.25 * L, y: L - 0.4, toe: 30 }, far: { x: -0.3 * L, y: 0.6 * L, toe: 50 } },
      arms: { near: { shoulder: 70, elbow: 0 }, far: { shoulder: 10, elbow: 40 } }, face, support: 'near' });
    const land = P(c, { torso: 20, legs: { near: { x: 0.35 * L, y: L - 1 }, far: { x: -0.5 * L, y: 0.6 * L, toe: 40 } }, arms: { near: { shoulder: -20, elbow: 40 }, far: { shoulder: 30, elbow: 40 } }, face, support: 'near' });
    const rec = P(c, { torso: 12, legs: feet(c, 0.45, 0.25), arms: { near: { shoulder: 50, elbow: 60 }, far: { shoulder: 45, elbow: 70 } }, face, support: 'both' });
    const seq: [Pose, PropState][] = [
      [stand, racket(-30)], [stand, racket(-30)], [toss, racket(-120)], [trophy, racket(-60)], [drop, racket(165)], [drop, racket(170)],
      [hit, { ...racket(-80, [100, 280]), front: true }], [pron, racket(40)], [land, racket(90)], [rec, racket(-40)], [rec, racket(-40)],
    ];
    const by = [12, 12, 26, 36, 40, 40, 40];
    return seq.map(([p, r], i) => ({ ...p, props: [r, ...(i <= 6 ? [{ ...ball('tennisball', 0.35 * L, by[i] * u), front: true } as PropState] : [])] }));
  },
};

/** Volea: sin swing, un golpe corto delante con la raqueta firme y un paso adelante. */
export const tnVolley: AnimDef = {
  name: 'tn_volley', pack: 'tennis', fps: 12, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 3 / 6 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const face = { eyes: 'angry' as const, mouth: 'line' as const };
    const ready = P(c, { torso: 12, legs: feet(c, 0.5, 0.25), arms: { near: { shoulder: 50, elbow: 60 }, far: { shoulder: 45, elbow: 70 } }, face, support: 'both' });
    const set = P(c, { torso: 10, legs: feet(c, 0.6, 0.25), arms: { near: { shoulder: 40, elbow: 50 }, far: { shoulder: 70, elbow: 30 } }, face, support: 'far' });
    const punch = P(c, { torso: 16, legs: { near: { x: 0.45 * L, y: L - 1.2 }, far: { x: -0.3 * L, y: L - 0.8, toe: 30 } }, arms: { near: { shoulder: 75, elbow: 10 }, far: { shoulder: 40, elbow: 40 } }, face: { eyes: 'angry', mouth: 'grin' }, support: 'near' });
    const seq: [Pose, PropState][] = [[ready, racket(-40)], [set, racket(-70)], [set, racket(-75)], [punch, racket(-50, [250, 320])], [punch, racket(-45)], [ready, racket(-40)]];
    return seq.map(([p, r], i) => ({ ...p, props: [r, ...(i <= 3 ? [ball('tennisball', (2.3 - i * 0.15) * L, 16 * u)] : [])] }));
  },
};

/** Remate (smash): se pone de lado, señala la pelota con la mano libre, salta y la baja con fuerza. */
export const tnSmash: AnimDef = {
  name: 'tn_smash', pack: 'tennis', fps: 12, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'despegue', phase: 3 / 9 }, { type: 'impacto', phase: 4 / 9 }, { type: 'aterriza', phase: 6 / 9 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const R = (v: number) => Math.round(v * u);
    const face = { eyes: 'angry' as const, mouth: 'line' as const };
    const ready = P(c, { torso: 12, legs: feet(c, 0.5, 0.25), arms: { near: { shoulder: 50, elbow: 60 }, far: { shoulder: 45, elbow: 70 } }, face, support: 'both' });
    const point = P(c, { torso: -8, legs: { near: { x: 0.2 * L, y: L - 0.8 }, far: { x: -0.35 * L, y: L - 1 } }, arms: { near: { shoulder: -130, elbow: 120 }, far: { shoulder: 155, elbow: 0 } }, face, support: 'far' });
    const jump = P(c, { torso: -10, rise: R(8), legs: { near: { x: 0.2 * L, y: 0.7 * L, toe: 40 }, far: { x: -0.3 * L, y: 0.8 * L, toe: 50 } }, arms: { near: { shoulder: -150, elbow: 130 }, far: { shoulder: 150, elbow: 0 } }, face });
    const hit = P(c, { torso: 18, rise: R(8), legs: { near: { x: 0.15 * L, y: 0.75 * L, toe: 40 }, far: { x: -0.2 * L, y: 0.8 * L, toe: 40 } }, arms: { near: { shoulder: 160, elbow: 0 }, far: { shoulder: 20, elbow: 40 } }, face: { eyes: 'angry', mouth: 'grin' } });
    const down = P(c, { torso: 28, rise: R(3), legs: { near: { x: 0.25 * L, y: 0.85 * L, toe: 30 }, far: { x: -0.1 * L, y: 0.8 * L, toe: 30 } }, arms: { near: { shoulder: 40, elbow: 10 }, far: { shoulder: 0, elbow: 40 } }, face });
    const land = P(c, { torso: 20, legs: feet(c, 0.8, 0.24), arms: { near: { shoulder: 20, elbow: 30 }, far: { shoulder: 20, elbow: 40 } }, face, support: 'both' });
    const seq: [Pose, PropState][] = [[ready, racket(-40)], [point, racket(100)], [point, racket(105)], [jump, racket(110)], [hit, { ...racket(-80, [110, 280]), front: true }], [down, racket(60)], [land, racket(70)], [ready, racket(-40)], [ready, racket(-40)]];
    return seq.map(([p, r], i) => ({ ...p, props: [r, ...(i <= 4 ? [{ ...ball('tennisball', 0.45 * L, [44, 40, 38, 36, 34][i] * u), front: true } as PropState] : [])] }));
  },
};

export const NET_NEW: AnimDef[] = [vbReady, vbBump, vbSet, vbDive, tnReady, tnVolley, tnSmash];
export const NET_PREMIUM: AnimDef[] = [vbReady, vbBump, vbSet, spike, block, serve, vbDive, tnReady, forehand, backhand, tennisServe, tnVolley, tnSmash];
