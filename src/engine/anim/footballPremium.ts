import { type Pose, type PropState } from '../rig/pose';
import { type AnimDef, type Ctx, P, feet } from './types';
import { slide as slideClassic } from './football';

/**
 * Fútbol premium. Las patadas tienen la mecánica de verdad: último paso largo, pie de apoyo al costado de la pelota,
 * la pierna que pega se carga atrás (talón al glúteo), baja con la rodilla adelante, pega con el empeine sobre la
 * pelota y sigue arriba; los brazos se abren para equilibrar. Cada contacto trae su evento (impacto) en el cuadro justo
 * y el punto exacto del pie, así el juego saca la pelota de ahí.
 *
 * Pega siempre la pierna de cerca (la que se ve). El balón se dibuja en la vista previa; el juego usa el suyo.
 */

const ball = (x: number, y = 0): PropState => ({ kind: 'soccer', at: 'ground', x, y });
const inHands: PropState = { kind: 'soccer', at: 'handNear', x: 0, y: 0 };
const angry = { eyes: 'angry' as const, mouth: 'line' as const };

/** De pie, atento: rodillas flojas, peso adelante, brazos sueltos y abiertos. */
function stance(c: Ctx, bob = 0): Pose {
  return P(c, {
    torso: 12, legs: feet(c, 0.35 + bob * 0.08, 0.26),
    arms: { near: { shoulder: 20, elbow: 50, spread: 22 }, far: { shoulder: 10, elbow: 50, spread: 22 } }, support: 'both',
  });
}

export const readyP: AnimDef = {
  name: 'ready', pack: 'football', fps: 8, loop: true, steady: true,
  build: (c) => [0, 0, 1, 1, 0, 0, 1, 1].map((b, i) => ({ ...stance(c, b), face: { eyes: i === 5 ? 'closed' as const : 'open' as const, mouth: 'line' as const } })),
};

interface KickSpec {
  /** carga atrás de la pierna (0 a 1) */
  load: number;
  /** pie al pegar: toe (+ empeine abajo, - punta arriba para levantar la pelota) y altura */
  toe: number;
  /** cuánto sube la pierna después */
  follow: number;
  /** tronco al pegar: + sobre la pelota (tiro bajo), - atrás (vaselina, volea) */
  lean: number;
  /** camino de la pelota desde el contacto: [adelante, alto] en largos de pierna y pixeles */
  flight: [number, number][];
}

/**
 * Patada en 10 cuadros: zancada, apoyo, carga, bajada, contacto (impacto en el 4), seguimiento, aterriza sobre la
 * pierna que pegó y vuelve a la guardia.
 */
function kick(c: Ctx, k: KickSpec): Pose[] {
  const L = c.L, u = c.u;
  const bx = 0.62 * L;
  // zancada: la de lejos se estira adelante para apoyar, la de cerca empuja atrás
  const stride = P(c, { torso: 10, legs: { far: { x: 0.45 * L, y: L - 0.5, toe: 0 }, near: { x: -0.45 * L, y: L - 0.9, toe: 35 } },
    arms: { near: { shoulder: 35, elbow: 70 }, far: { shoulder: -35, elbow: 70 } }, face: angry, support: 'far' });
  const plant = { x: 0.2 * L, y: L - 0.4, toe: 0 };
  // apoyo al lado de la pelota y la pierna se carga atrás; el brazo de lejos se abre adelante para equilibrar
  const cock = P(c, { torso: 6, legs: { far: plant, near: { x: (-0.45 - 0.15 * k.load) * L, y: (0.62 - 0.12 * k.load) * L, toe: 45 + 15 * k.load } },
    arms: { near: { shoulder: -45 - 15 * k.load, elbow: 30 }, far: { shoulder: 75, elbow: 25, spread: 55 } }, face: angry, support: 'far' });
  const swing = P(c, { torso: 6 + k.lean * 0.3, legs: { far: plant, near: { x: -0.1 * L, y: 0.82 * L, toe: 35 } },
    arms: { near: { shoulder: -20, elbow: 30 }, far: { shoulder: 55, elbow: 25, spread: 55 } }, face: angry, support: 'far' });
  const contact = P(c, { torso: 6 + k.lean, legs: { far: plant, near: { x: 0.38 * L, y: 0.9 * L, toe: k.toe } },
    arms: { near: { shoulder: 10, elbow: 30, spread: 20 }, far: { shoulder: 25, elbow: 30, spread: 55 } }, face: { eyes: 'angry', mouth: 'open' }, support: 'far' });
  // seguimiento: la pierna sigue arriba, el cuerpo atrás para compensar, el talón de apoyo se levanta
  const follow = P(c, { torso: 6 + k.lean - 10 * k.follow, legs: { far: { ...plant, toe: 25 }, near: { x: (0.45 + 0.15 * k.follow) * L, y: (0.75 - 0.4 * k.follow) * L, toe: 15 } },
    arms: { near: { shoulder: 45, elbow: 30, spread: 20 }, far: { shoulder: -35, elbow: 30, spread: 45 } }, face: { eyes: 'angry', mouth: 'open' }, support: 'far' });
  // aterriza adelante sobre la pierna que pegó y la otra se arrastra
  const landK = P(c, { torso: 8, legs: { near: { x: 0.35 * L, y: L - 0.5, toe: 0 }, far: { x: -0.3 * L, y: 0.78 * L, toe: 40 } },
    arms: { near: { shoulder: 20, elbow: 40 }, far: { shoulder: -10, elbow: 40, spread: 25 } }, face: { mouth: 'open' }, support: 'near' });
  const settle = P(c, { torso: 10, legs: feet(c, 0.3, 0.24), arms: { near: { shoulder: 15, elbow: 45, spread: 15 }, far: { shoulder: 10, elbow: 45, spread: 15 } }, support: 'both' });
  const seq = [stride, cock, cock, swing, contact, follow, follow, landK, settle, stance(c)];
  return seq.map((p, i) => {
    // la pelota quieta al lado del pie de apoyo hasta el contacto; después vuela
    const f = i >= 4 ? k.flight[Math.min(i - 4, k.flight.length - 1)] : null;
    return { ...p, props: f ? (f[0] < 4 ? [ball(bx + f[0] * L, f[1] * u)] : undefined) : [ball(bx, 0)] };
  });
}

const kickDef = (name: string, fps: number, spec: KickSpec): AnimDef => ({
  name, pack: 'football', fps, loop: false,
  events: [{ type: 'paso', phase: 0, foot: 'far' }, { type: 'paso', phase: 1 / 10, foot: 'far' }, { type: 'impacto', phase: 4 / 10 }, { type: 'paso', phase: 7 / 10, foot: 'near' }],
  travel: { ref: 'run', k: [0.6, 0.15, 0, 0.1, 0.15, 0.2, 0.2, 0.25, 0.1] },
  build: (c) => kick(c, spec),
});

/** Tiro: carga completa, empeine sobre la pelota y seguimiento alto. */
export const shotP = kickDef('shot', 14, { load: 1, toe: 40, follow: 1, lean: 4, flight: [[0.4, 1], [1.4, 3], [2.6, 4], [4, 5]] });
/** "patear" del básico: el mismo tiro. */
export const kickP: AnimDef = { ...shotP, name: 'kick', pack: 'basic' };
/** Pase: carga corta, cara interna, la pierna barre bajo y casi sin seguir. */
export const passP = kickDef('pass', 14, { load: 0.35, toe: -5, follow: 0.25, lean: 2, flight: [[0.4, 0], [1.2, 0], [2.0, 0], [3, 0]] });
/** Vaselina: carga media, la punta abajo de la pelota y el cuerpo atrás: la pelota sube alto. */
export const chipP = kickDef('chip', 14, { load: 0.6, toe: -25, follow: 0.6, lean: -10, flight: [[0.3, 3], [0.8, 9], [1.3, 13], [1.8, 15]] });

/** Control: estira la pierna hacia la pelota que llega, la amortigua (impacto) y la deja muerta adelante. */
export const trapP: AnimDef = {
  name: 'trap', pack: 'football', fps: 10, loop: false,
  events: [{ type: 'impacto', phase: 2 / 7 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const reach = P(c, { torso: 6, legs: { far: { x: -0.1 * L, y: L - 0.5 }, near: { x: 0.45 * L, y: 0.6 * L, toe: -20 } },
      arms: { near: { shoulder: 55, elbow: 30, spread: 45 }, far: { shoulder: 45, elbow: 30, spread: 45 } }, face: { eyes: 'open', mouth: 'line' }, support: 'far' });
    const meet = P(c, { ...reach, legs: { far: { x: -0.1 * L, y: L - 0.6 }, near: { x: 0.38 * L, y: 0.66 * L, toe: -15 } } });
    // amortigua: la pierna cede hacia atrás con la pelota
    const cushion = P(c, { torso: 10, legs: { far: { x: -0.1 * L, y: L - 0.8 }, near: { x: 0.2 * L, y: 0.78 * L, toe: -5 } },
      arms: { near: { shoulder: 40, elbow: 40, spread: 40 }, far: { shoulder: 30, elbow: 40, spread: 40 } }, face: { eyes: 'open', mouth: 'line' }, support: 'far' });
    const down = P(c, { torso: 12, legs: feet(c, 0.35, 0.24), arms: { near: { shoulder: 20, elbow: 45, spread: 20 }, far: { shoulder: 15, elbow: 45, spread: 20 } }, support: 'both' });
    const seq = [stance(c), reach, meet, cushion, cushion, down, stance(c)];
    const bx = [2.2, 1.4, 0.95, 0.75, 0.65, 0.62, 0.62].map((k) => k * L);
    const by = [7, 4, 2.5, 1, 0, 0, 0].map((k) => k * u);
    return seq.map((p, i) => ({ ...p, props: [ball(bx[i], by[i])] }));
  },
};

/** Volea: la pelota viene alta; carga la pierna doblada, se tira atrás y pega con la pierna estirada a la altura de la cadera. */
export const volleyP: AnimDef = {
  name: 'volley', pack: 'football', fps: 14, loop: false,
  events: [{ type: 'impacto', phase: 3 / 8 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const chamber = P(c, { torso: -8, legs: { far: { x: 0, y: L - 0.5 }, near: { x: -0.2 * L, y: 0.45 * L, toe: 50 } },
      arms: { near: { shoulder: -40, elbow: 30 }, far: { shoulder: 85, elbow: 15, spread: 55 } }, face: angry, support: 'far' });
    const whip = P(c, { torso: -16, legs: { far: { x: -0.05 * L, y: L - 0.6 }, near: { x: 0.35 * L, y: 0.4 * L, toe: 20 } },
      arms: { near: { shoulder: 30, elbow: 20, spread: 30 }, far: { shoulder: 100, elbow: 10, spread: 55 } }, face: angry, support: 'far' });
    const strike = P(c, { torso: -24, legs: { far: { x: -0.05 * L, y: L - 0.6, toe: 20 }, near: { x: 0.8 * L, y: 0.3 * L, toe: 0 } },
      arms: { near: { shoulder: 95, elbow: 10, spread: 50 }, far: { shoulder: 110, elbow: 10, spread: 55 } }, face: { eyes: 'angry', mouth: 'open' }, support: 'far' });
    const back = P(c, { torso: -10, legs: { far: { x: 0, y: L - 0.5 }, near: { x: 0.4 * L, y: 0.7 * L, toe: 20 } },
      arms: { near: { shoulder: 40, elbow: 30, spread: 30 }, far: { shoulder: 60, elbow: 30, spread: 40 } }, support: 'far' });
    const seq = [stance(c), chamber, whip, strike, strike, back, stance(c), stance(c)];
    const bx = [2.2, 1.6, 1.1, 0.9, 2.0, 3.2, 9, 9].map((k) => k * L);
    const by = [13, 11, 9, 8, 9, 10, 0, 0].map((k) => k * u);
    return seq.map((p, i) => ({ ...p, props: bx[i] < 4 * L ? [ball(bx[i], by[i])] : undefined }));
  },
};

/** Cabezazo: se agacha, salta, se arquea atrás con los brazos abiertos y mete la frente (impacto) cayendo. */
export const headerP: AnimDef = {
  name: 'header', pack: 'football', fps: 12, loop: false,
  events: [{ type: 'despegue', phase: 2 / 8 }, { type: 'impacto', phase: 4 / 8 }, { type: 'aterriza', phase: 6 / 8 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const top = Math.max(3, Math.round(5 * u));
    const crouch = P(c, { torso: 14, legs: feet(c, 0.8, 0.2), arms: { near: { shoulder: -40, elbow: 20 }, far: { shoulder: -35, elbow: 20 } }, face: angry, support: 'both' });
    const rise = P(c, { air: Math.round(top / 2), torso: -6, legs: { near: { x: 0.05 * L, y: 0.85 * L, toe: 40 }, far: { x: -0.15 * L, y: 0.8 * L, toe: 50 } },
      arms: { near: { shoulder: 90, elbow: 40, spread: 45 }, far: { shoulder: 80, elbow: 40, spread: 45 } }, face: angry });
    const arch = P(c, { air: top, torso: -18, head: { tilt: -14 }, legs: { near: { x: -0.1 * L, y: 0.65 * L, toe: 50 }, far: { x: -0.3 * L, y: 0.6 * L, toe: 60 } },
      arms: { near: { shoulder: 75, elbow: 50, spread: 55 }, far: { shoulder: 65, elbow: 50, spread: 55 } }, face: angry });
    const snap = P(c, { air: top, torso: 18, head: { tilt: 8 }, legs: { near: { x: -0.15 * L, y: 0.8 * L, toe: 50 }, far: { x: -0.35 * L, y: 0.75 * L, toe: 50 } },
      arms: { near: { shoulder: 15, elbow: 50, spread: 45 }, far: { shoulder: 5, elbow: 50, spread: 45 } }, face: { eyes: 'closed', mouth: 'line' } });
    const fall = P(c, { air: Math.round(top / 2), torso: 10, legs: { near: { x: 0.15 * L, y: 0.9 * L, toe: 20 }, far: { x: -0.1 * L, y: 0.88 * L, toe: 20 } },
      arms: { near: { shoulder: 30, elbow: 30, spread: 25 }, far: { shoulder: 20, elbow: 30, spread: 25 } } });
    const land = P(c, { torso: 14, legs: feet(c, 0.6, 0.24), arms: { near: { shoulder: 20, elbow: 40, spread: 20 }, far: { shoulder: 15, elbow: 40, spread: 20 } }, support: 'both' });
    const seq = [stance(c), crouch, rise, arch, snap, fall, land, stance(c)];
    // la pelota llega a la frente en el cuadro del golpe (sale de las medidas del cuerpo)
    const d = c.d;
    const brow = d.footH + L + d.torsoH + 0.55 * d.headW;
    const front = 0.5 * d.headW + 2 * u;
    const bx = [front + 1.8 * L, front + 1.4 * L, front + 0.9 * L, front + 0.4 * L, front, front + 1.0 * L, front + 2.2 * L, 99];
    const by = [brow + 8 * u, brow + 6 * u, brow + top + 3 * u, brow + top + u, brow + top, brow + top - u, brow, 0];
    return seq.map((p, i) => ({ ...p, props: bx[i] < 50 ? [ball(bx[i], by[i])] : undefined }));
  },
};

/**
 * Conducción: corre con la pelota pegada al pie. Toca la pelota con el empeine de cerca una vez por ciclo (impacto),
 * la pelota se adelanta y el jugador la alcanza. Mismo paso y avance que correr, el tronco un poco más sobre la pelota.
 */
function swapSides(p: Pose): Pose {
  return {
    ...p,
    legs: { near: { ...p.legs.far }, far: { ...p.legs.near } },
    arms: { near: { ...p.arms.far }, far: { ...p.arms.near } },
    support: p.support === 'near' ? 'far' : p.support === 'far' ? 'near' : p.support,
  };
}

/** Trote con pelota: zancada un poco más corta que correr (la pelota tiene que quedar cerca). */
function dribbleKeys(c: Ctx): Pose[] {
  const L = c.L;
  const heavy = Math.max(0.8, c.build);
  const S = (0.5 * L) / heavy;
  const flight = Math.max(1, Math.round((1.2 * c.u) / heavy));
  const back = -c.u;
  const keys: Pose[] = [
    P(c, { x: back, torso: 11, legs: { near: { x: S * 0.7, y: L - 0.35, toe: 0 }, far: { x: -S * 0.85, y: L - 0.35 - 0.34 * L, toe: 30 } },
      arms: { near: { shoulder: -45, elbow: 90 }, far: { shoulder: 35, elbow: 85 } }, support: 'near' }),
    P(c, { x: back, torso: 11, legs: { near: { x: S * 0.15, y: L - 0.95, toe: 0 }, far: { x: -S * 0.35, y: L - 0.95 - 0.5 * L, toe: 40 } },
      arms: { near: { shoulder: -30, elbow: 90 }, far: { shoulder: 25, elbow: 85 } }, support: 'near' }),
    P(c, { x: back, torso: 11, legs: { near: { x: -S * 0.6, y: L - 0.75, toe: 8 }, far: { x: S * 0.55, y: L - 0.75 - 0.42 * L, toe: 10 } },
      arms: { near: { shoulder: 30, elbow: 85 }, far: { shoulder: -40, elbow: 90 } }, support: 'near' }),
    P(c, { x: back, torso: 11, air: flight, legs: { near: { x: -S * 0.9, y: 0.78 * L, toe: 40 }, far: { x: S * 0.8, y: 0.74 * L, toe: 5 } },
      arms: { near: { shoulder: 36, elbow: 85 }, far: { shoulder: -50, elbow: 90 } } }),
  ];
  return [...keys, ...keys.map(swapSides)];
}

export const dribbleP: AnimDef = {
  name: 'run_ball', pack: 'football', fps: 14, loop: true, steady: true, hairTrail: -1, views: ['side', 'front', 'back'],
  events: [{ type: 'paso', phase: 0, foot: 'near' }, { type: 'impacto', phase: 2 / 8 }, { type: 'paso', phase: 0.5, foot: 'far' }],
  build: (c) => {
    const L = c.L;
    // la pelota en el marco del jugador: tocada en el 2, se adelanta y vuelve a quedar a la altura del pie
    const bx = [0.7, 0.6, 0.55, 0.9, 1.15, 1.1, 0.95, 0.8].map((k) => k * L);
    return dribbleKeys(c).map((p, i) => ({ ...p, props: [ball(bx[i], 0)] }));
  },
};

/** Entrada de pie: se tira sobre la pierna de lejos y estira la de cerca para robar (impacto) y vuelve. */
export const tackleP: AnimDef = {
  name: 'tackle', pack: 'football', fps: 14, loop: false,
  events: [{ type: 'paso', phase: 1 / 8, foot: 'far' }, { type: 'impacto', phase: 3 / 8 }],
  travel: { ref: 'run', k: [0.4, 0.5, 0.3, 0, 0, 0, 0] },
  build: (c) => {
    const L = c.L;
    const lunge = P(c, { torso: 18, legs: { far: { x: 0.35 * L, y: L - 1.6, toe: 0 }, near: { x: -0.4 * L, y: L - 1.2, toe: 30 } },
      arms: { near: { shoulder: 40, elbow: 50, spread: 30 }, far: { shoulder: -30, elbow: 40, spread: 20 } }, face: angry, support: 'far' });
    const poke = P(c, { torso: 14, legs: { far: { x: 0.1 * L, y: L - 1.8, toe: 0 }, near: { x: 0.85 * L, y: 0.85 * L, toe: 10 } },
      arms: { near: { shoulder: -20, elbow: 40, spread: 30 }, far: { shoulder: 60, elbow: 30, spread: 45 } }, face: { eyes: 'angry', mouth: 'open' }, support: 'far' });
    const back = P(c, { torso: 12, legs: { far: { x: 0, y: L - 1.2, toe: 0 }, near: { x: 0.35 * L, y: L - 0.9, toe: 0 } },
      arms: { near: { shoulder: 15, elbow: 45, spread: 20 }, far: { shoulder: 20, elbow: 45, spread: 20 } }, support: 'both' });
    const seq = [stance(c), lunge, lunge, poke, poke, back, stance(c), stance(c)];
    const bx = [1.6, 1.4, 1.3, 1.2, 1.5, 2.0, 2.4, 2.6].map((k) => k * L);
    return seq.map((p, i) => ({ ...p, props: [ball(bx[i], 0)] }));
  },
};

/** Barrida: la clásica con su golpe a la pelota y el envión del deslizamiento. */
export const slideP: AnimDef = {
  ...slideClassic,
  events: [{ type: 'despegue', phase: 1 / 8 }, { type: 'impacto', phase: 3 / 8 }],
  travel: { ref: 'run', k: [0.8, 0.8, 0.6, 0.4, 0.2, 0.05, 0] },
};

/** Saque de banda: la pelota atrás de la cabeza con las dos manos, se arquea, la tira adelante (suelta) y sigue. */
export const throwInP: AnimDef = {
  name: 'throw_in', pack: 'football', fps: 10, loop: false,
  events: [{ type: 'suelta', phase: 4 / 8 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const hold = P(c, { torso: 4, legs: feet(c, 0.2, 0.24), arms: { near: { shoulder: 100, elbow: 70 }, far: { shoulder: 100, elbow: 70 } }, face: { eyes: 'open', mouth: 'line' }, support: 'both' });
    // carga: la pelota detrás de la cabeza, el cuerpo arqueado, un pie adelante
    const load = P(c, { torso: -14, head: { tilt: -8 }, legs: { near: { x: 0.35 * L, y: L - 0.5 }, far: { x: -0.25 * L, y: L - 0.6, toe: 20 } },
      arms: { near: { shoulder: 150, elbow: 100 }, far: { shoulder: 150, elbow: 100 } }, face: angry, support: 'both' });
    const throwP = P(c, { torso: 10, legs: { near: { x: 0.35 * L, y: L - 0.6 }, far: { x: -0.3 * L, y: L - 0.6, toe: 40 } },
      arms: { near: { shoulder: 120, elbow: 10 }, far: { shoulder: 120, elbow: 10 } }, face: { eyes: 'angry', mouth: 'open' }, support: 'both' });
    const follow = P(c, { torso: 16, legs: { near: { x: 0.35 * L, y: L - 0.6 }, far: { x: -0.3 * L, y: L - 0.5, toe: 50 } },
      arms: { near: { shoulder: 70, elbow: 10 }, far: { shoulder: 70, elbow: 10 } }, face: { mouth: 'open' }, support: 'both' });
    const seq = [hold, load, load, throwP, follow, follow, stance(c), stance(c)];
    return seq.map((p, i) => ({ ...p, props: i < 4 ? [{ ...inHands, y: -2 * u }] : i === 4 ? [ball(1.5 * L, 18 * u)] : undefined }));
  },
};

// ---------- arquero ----------

/** Arquero listo: agachado, sobre las puntas, las manos adelante en W, rebotando. */
export const keeperReadyP: AnimDef = {
  name: 'keeper_ready', pack: 'keeper', fps: 8, loop: true, steady: true, views: ['side', 'front'],
  build: (c) => [0, 0, 1, 1, 0, 0, 1, 1].map((b) => P(c, {
    torso: 18, legs: feet(c, 0.55 + b * 0.08, 0.3),
    arms: { near: { shoulder: 70, elbow: 50, spread: 50 }, far: { shoulder: 65, elbow: 50, spread: 50 } }, face: { eyes: 'open', mouth: 'line' }, support: 'both',
  })),
};

/** Estirada: carga, se lanza estirado con las palmas adelante, ataja (impacto) en el aire y cae de costado. */
export const keeperDiveP: AnimDef = {
  name: 'keeper_dive', pack: 'keeper', fps: 12, loop: false,
  events: [{ type: 'despegue', phase: 1 / 8 }, { type: 'impacto', phase: 3 / 8 }, { type: 'atrapa', phase: 3 / 8, joint: 'handNear' }, { type: 'aterriza', phase: 5 / 8 }],
  travel: { ref: 'run', k: [0.3, 0.9, 0.9, 0.7, 0.4, 0.1, 0] },
  build: (c) => {
    const L = c.L, u = c.u;
    const top = Math.max(3, Math.round(6 * u));
    const load = P(c, { torso: 24, legs: feet(c, 0.85, 0.3), arms: { near: { shoulder: 60, elbow: 40, spread: 45 }, far: { shoulder: 50, elbow: 40, spread: 45 } }, face: angry, support: 'both' });
    const launch = P(c, { air: Math.round(top / 2), torso: 55, legs: { near: { x: -0.55 * L, y: 0.6 * L, toe: 50 }, far: { x: -0.7 * L, y: 0.75 * L, toe: 60 } },
      arms: { near: { shoulder: 160, elbow: 10 }, far: { shoulder: 155, elbow: 10 } }, face: { eyes: 'wide', mouth: 'open' } });
    const stretch = P(c, { air: top, torso: 78, legs: { near: { x: -0.75 * L, y: 0.2 * L, toe: 70 }, far: { x: -0.85 * L, y: 0.4 * L, toe: 70 } },
      arms: { near: { shoulder: 175, elbow: 0 }, far: { shoulder: 170, elbow: 0 } }, face: { eyes: 'wide', mouth: 'open' }, flat: true, freeArms: true });
    const save = P(c, { ...stretch, air: Math.round(top * 0.7), arms: { near: { shoulder: 168, elbow: 25 }, far: { shoulder: 162, elbow: 30 } }, face: { eyes: 'angry', mouth: 'grin' } });
    const ground = P(c, { torso: 86, legs: { near: { x: -0.9 * L, y: 0, toe: 80 }, far: { x: -0.8 * L, y: 0.2 * L, toe: 80 } },
      arms: { near: { shoulder: 160, elbow: 50 }, far: { shoulder: 150, elbow: 55 } }, face: { eyes: 'closed', mouth: 'grin' }, flat: true, freeArms: true });
    const seq = [load, launch, stretch, save, save, ground, ground, ground];
    const bx = [3.0, 2.6, 2.1, 0, 0, 0, 0, 0].map((k) => k * L);
    const by = [11, 10, 9, 0, 0, 0, 0, 0].map((k) => k * u);
    return seq.map((p, i) => ({ ...p, props: i >= 3 ? [inHands] : [ball(bx[i], by[i])] }));
  },
};

/** Atajada alta: salta, agarra la pelota arriba (impacto), la trae al pecho y cae. */
export const keeperCatchP: AnimDef = {
  name: 'keeper_catch', pack: 'keeper', fps: 10, loop: false,
  events: [{ type: 'despegue', phase: 1 / 7 }, { type: 'impacto', phase: 2 / 7 }, { type: 'atrapa', phase: 2 / 7, joint: 'handNear' }, { type: 'aterriza', phase: 4 / 7 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const top = Math.max(2, Math.round(4 * u));
    const crouch = P(c, { torso: 16, legs: feet(c, 0.7, 0.26), arms: { near: { shoulder: 40, elbow: 40, spread: 40 }, far: { shoulder: 35, elbow: 40, spread: 40 } }, face: angry, support: 'both' });
    const up = P(c, { air: top, torso: -4, legs: { near: { x: 0.1 * L, y: 0.85 * L, toe: 40 }, far: { x: -0.1 * L, y: 0.8 * L, toe: 50 } },
      arms: { near: { shoulder: 150, elbow: 20 }, far: { shoulder: 145, elbow: 25 } }, face: { eyes: 'wide', mouth: 'open' } });
    const pull = P(c, { air: Math.round(top / 2), torso: 8, legs: { near: { x: 0.1 * L, y: 0.85 * L, toe: 30 }, far: { x: -0.1 * L, y: 0.85 * L, toe: 30 } },
      arms: { near: { shoulder: 90, elbow: 90 }, far: { shoulder: 85, elbow: 95 } }, face: angry });
    const hug = P(c, { torso: 12, legs: feet(c, 0.4, 0.24), arms: { near: { shoulder: 55, elbow: 95 }, far: { shoulder: 50, elbow: 100 } }, face: { eyes: 'happy', mouth: 'smile' }, support: 'both' });
    const seq = [crouch, up, up, pull, hug, hug, hug];
    return seq.map((p, i) => ({ ...p, props: i === 0 ? [ball(2.4 * L, 16 * u)] : i === 1 ? [ball(1.2 * L, 15 * u)] : [inHands] }));
  },
};

/** Saque con la mano: carga atrás el brazo con la pelota y la lanza por arriba (suelta). */
export const keeperThrowP: AnimDef = {
  name: 'keeper_throw', pack: 'keeper', fps: 12, loop: false,
  events: [{ type: 'paso', phase: 2 / 8, foot: 'far' }, { type: 'suelta', phase: 4 / 8 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const hold = P(c, { torso: 6, arms: { near: { shoulder: 50, elbow: 90 }, far: { shoulder: 45, elbow: 95 } }, face: { eyes: 'open', mouth: 'line' }, support: 'both' });
    const back = P(c, { torso: -10, legs: { far: { x: 0.35 * L, y: L - 0.5 }, near: { x: -0.3 * L, y: L - 0.6, toe: 20 } },
      arms: { near: { shoulder: -70, elbow: 10 }, far: { shoulder: 70, elbow: 20, spread: 40 } }, face: angry, support: 'far' });
    const over = P(c, { torso: 6, legs: { far: { x: 0.35 * L, y: L - 0.6 }, near: { x: -0.3 * L, y: L - 0.6, toe: 40 } },
      arms: { near: { shoulder: 130, elbow: 10 }, far: { shoulder: 10, elbow: 30, spread: 30 } }, face: { eyes: 'angry', mouth: 'open' }, support: 'far' });
    const follow = P(c, { torso: 18, legs: { far: { x: 0.35 * L, y: L - 0.7 }, near: { x: -0.15 * L, y: 0.8 * L, toe: 50 } },
      arms: { near: { shoulder: 50, elbow: 10 }, far: { shoulder: -20, elbow: 30, spread: 30 } }, face: { mouth: 'open' }, support: 'far' });
    const seq = [hold, back, back, over, follow, follow, stance(c), stance(c)];
    return seq.map((p, i) => ({ ...p, props: i < 4 ? [inHands] : i === 4 ? [ball(1.6 * L, 20 * u)] : undefined }));
  },
};

/** Despeje de volea: suelta la pelota de las manos y la patea en el aire con la pierna estirada (impacto). */
export const keeperPuntP: AnimDef = {
  name: 'keeper_punt', pack: 'keeper', fps: 12, loop: false,
  events: [{ type: 'paso', phase: 1 / 9, foot: 'far' }, { type: 'impacto', phase: 4 / 9 }],
  travel: { ref: 'walk', k: [0.6, 0.6, 0.3, 0.2, 0.2, 0.3, 0.1, 0] },
  build: (c) => {
    const L = c.L, u = c.u;
    const hold = P(c, { torso: 8, arms: { near: { shoulder: 55, elbow: 70 }, far: { shoulder: 50, elbow: 70 } }, face: { eyes: 'open', mouth: 'line' }, support: 'both' });
    const step = P(c, { torso: 6, legs: { far: { x: 0.3 * L, y: L - 0.5 }, near: { x: -0.4 * L, y: L - 0.9, toe: 35 } },
      arms: { near: { shoulder: 70, elbow: 20 }, far: { shoulder: 60, elbow: 20 } }, face: angry, support: 'far' });
    const drop = P(c, { torso: 2, legs: { far: { x: 0.1 * L, y: L - 0.5 }, near: { x: -0.5 * L, y: 0.6 * L, toe: 55 } },
      arms: { near: { shoulder: 40, elbow: 10, spread: 40 }, far: { shoulder: 70, elbow: 15, spread: 50 } }, face: angry, support: 'far' });
    const hit = P(c, { torso: -14, legs: { far: { x: 0, y: L - 0.5, toe: 20 }, near: { x: 0.7 * L, y: 0.45 * L, toe: 0 } },
      arms: { near: { shoulder: -30, elbow: 20, spread: 30 }, far: { shoulder: 95, elbow: 15, spread: 55 } }, face: { eyes: 'angry', mouth: 'open' }, support: 'far' });
    const high = P(c, { torso: -22, legs: { far: { x: 0, y: L - 0.5, toe: 40 }, near: { x: 0.6 * L, y: 0.15 * L, toe: 0 } },
      arms: { near: { shoulder: 20, elbow: 20, spread: 30 }, far: { shoulder: 110, elbow: 15, spread: 55 } }, face: { mouth: 'open' }, support: 'far' });
    const seq = [hold, step, drop, drop, hit, high, high, stance(c), stance(c)];
    const props = (i: number): PropState[] | undefined =>
      i < 2 ? [inHands] : i === 2 ? [ball(0.6 * L, 7 * u)] : i === 3 ? [ball(0.7 * L, 4 * u)] : i === 4 ? [ball(0.9 * L, 4 * u)] : i === 5 ? [ball(2.2 * L, 12 * u)] : undefined;
    return seq.map((p, i) => ({ ...p, props: props(i) }));
  },
};

export const FOOTBALL_PREMIUM: AnimDef[] = [
  readyP, trapP, passP, chipP, shotP, kickP, headerP, volleyP, slideP, dribbleP, tackleP, throwInP,
  keeperReadyP, keeperDiveP, keeperCatchP, keeperThrowP, keeperPuntP,
];
/** las que no existían en el paquete clásico */
export const FOOTBALL_NEW: AnimDef[] = [dribbleP, tackleP, throwInP, keeperThrowP, keeperPuntP];
