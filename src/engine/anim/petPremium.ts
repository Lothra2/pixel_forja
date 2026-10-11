import { type AnimalDims, type QPose, type QFoot, standQ } from '../rig/animal';
import { merge, type DeepPartial } from '../rig/pose';
import { A_LIE, A_WAG, A_HURT, A_DIG, type AnimalAnimDef } from './animal';

/**
 * Thor premium: andares de verdad (paso en cuatro tiempos, trote en diagonales, galope con vuelo y el lomo que se
 * estira y se encoge), patas que se ven trabajar, y eventos para el juego (cada pisada, la mordida, el ladrido).
 * El avance sale de la pata apoyada: lo que retrocede en el ciclo es lo que el cuerpo avanza.
 */

const TAU = Math.PI * 2;
const Q = (d: AnimalDims, ...p: DeepPartial<QPose>[]) => merge(standQ(d), ...p);
const legL = (d: AnimalDims) => d.legUpper + d.legLower;
/** la mascota se dibuja un poco más grande que su esqueleto (como en el render 3D): el avance va en pixeles de celda */
const drawK = (d: AnimalDims) => (d.cell >= 48 ? 1.22 : 1);

/** Una pata en el ciclo: apoyada retrocede de +S a -S; en el aire vuelve adelante levantándose. */
function foot(p: number, stance: number, S: number, lift: number, h: number): QFoot {
  p = ((p % 1) + 1) % 1;
  if (p < stance) return { x: S - (2 * S * p) / stance, y: h };
  const q = (p - stance) / (1 - stance);
  // recoge la pata: sube rápido y baja estirándose adelante
  return { x: -S + 2 * S * (q * q * (3 - 2 * q)), y: h - lift * Math.sin(Math.PI * Math.pow(q, 0.8)) };
}

const inStance = (p: number, stance: number) => ((p % 1) + 1) % 1 < stance;

interface Gait { fn: number; ff: number; rn: number; rf: number }

function gaitPoses(d: AnimalDims, ph: Gait, stance: number, strideK: number, liftK: number, frames: number, extra: (i: number, p: number) => DeepPartial<QPose>): QPose[] {
  const L = legL(d);
  const S = strideK * L, lift = liftK * L;
  const h = L - 0.3;
  return Array.from({ length: frames }, (_, i) => {
    const p = i / frames;
    return Q(d, {
      legs: { fn: foot(p + ph.fn, stance, S, lift, h), ff: foot(p + ph.ff, stance, S, lift, h), rn: foot(p + ph.rn, stance, S, lift, h), rf: foot(p + ph.rf, stance, S, lift, h) },
    }, extra(i, p));
  });
}

/** cuándo pisa cada pata (fase del ciclo): cuando empieza su apoyo */
const contact = (phase: number) => ((1 - phase) % 1 + 1) % 1;

// ---------- andares ----------

/** Paso: cuatro tiempos (atrás, adelante del mismo lado, después el otro lado), cabeza que acompaña. */
const WALK_PH: Gait = { rn: 0, fn: 0.25, rf: 0.5, ff: 0.75 };
export const P_WALK: AnimalAnimDef = {
  name: 'walk', fps: 9, loop: true, steady: true,
  events: [
    { type: 'paso', phase: contact(WALK_PH.rn), foot: 'near' }, { type: 'paso', phase: contact(WALK_PH.fn), foot: 'near' },
    { type: 'paso', phase: contact(WALK_PH.rf), foot: 'far' }, { type: 'paso', phase: contact(WALK_PH.ff), foot: 'far' },
  ].sort((a, b) => a.phase - b.phase) as AnimalAnimDef['events'],
  stride: (d) => ((2 * 0.42 * legL(d)) / 0.65) * drawK(d),
  build: (d) => gaitPoses(d, WALK_PH, 0.65, 0.42, 0.42, 8, (_i, p) => ({ tail: 30 + Math.sin(p * TAU) * 14 })),
};

/** Trote: diagonales juntas, la lengua afuera. Sin vuelo: así la altura no salta y el juego lo mueve parejo. */
const TROT_PH: Gait = { fn: 0, rf: 0, ff: 0.5, rn: 0.5 };
const TROT_STANCE = 0.52;
export const P_TROT: AnimalAnimDef = {
  name: 'trot', fps: 11, loop: true, steady: true,
  events: [{ type: 'paso', phase: 0, foot: 'near' }, { type: 'paso', phase: 0.5, foot: 'far' }],
  stride: (d) => ((2 * 0.5 * legL(d)) / TROT_STANCE) * drawK(d),
  build: (d) => gaitPoses(d, TROT_PH, TROT_STANCE, 0.5, 0.48, 8, (_i, p) => ({ mouth: 'tongue', tail: 28 + Math.sin(p * TAU * 2) * 10 })),
};

/**
 * Galope (rotatorio): pisan las de atrás casi juntas, después las de adelante, y vuela recogido. El lomo se estira al
 * empujar y se encoge en el vuelo; la cabeza baja al apoyar las de adelante.
 */
const RUN_PH: Gait = { rf: 0, rn: 0.1, ff: 0.38, fn: 0.48 };
const RUN_STANCE = 0.32;
export const P_RUN: AnimalAnimDef = {
  name: 'run', fps: 14, loop: true,
  events: [
    { type: 'paso', phase: contact(RUN_PH.rf), foot: 'far' }, { type: 'paso', phase: contact(RUN_PH.ff), foot: 'far' },
    { type: 'paso', phase: contact(RUN_PH.fn), foot: 'near' }, { type: 'despegue', phase: 0.75 },
  ].sort((a, b) => a.phase - b.phase) as AnimalAnimDef['events'],
  stride: (d) => ((2 * 0.62 * legL(d)) / RUN_STANCE) * drawK(d),
  build: (d) => {
    const air = Math.max(1, Math.round(2 * d.u));
    return gaitPoses(d, RUN_PH, RUN_STANCE, 0.62, 0.5, 8, (_i, p) => {
      const any = (['fn', 'ff', 'rn', 'rf'] as const).some((k) => inStance(p + RUN_PH[k], RUN_STANCE));
      // estirado al empujar (frente arriba), recogido en el vuelo
      const flex = Math.sin((p - 0.1) * TAU);
      return { pitch: flex * 7, air: any ? 0 : air, mouth: 'tongue', tail: 12 + flex * 8, head: { angle: 4 - flex * 6, dy: Math.round(Math.max(0, -flex)) } };
    });
  },
};

/** Galope con la pelota en la boca. */
export const P_FETCH: AnimalAnimDef = { ...P_RUN, name: 'fetch', build: (d) => P_RUN.build(d).map((p) => ({ ...p, ball: true, mouth: 'closed' as const })) };

/** Respira, mueve la cola despacio, para una oreja (la cabeza se ladea) y parpadea. */
export const P_IDLE: AnimalAnimDef = {
  name: 'idle', fps: 6, loop: true, steady: true,
  build: (d) => [0, 0, 1, 1, 1, 1, 0, 0].map((b, i) => Q(d, {
    head: { dy: b }, tail: 28 + Math.sin((i / 8) * TAU) * 10,
    eyes: i === 6 ? 'closed' : 'open', mouth: i >= 2 && i <= 5 ? 'tongue' : 'closed',
  })),
};

/** Sentado: mueve la cola y parpadea (sin balancear la cabeza: con casco la altura temblaría). */
export const P_SIT: AnimalAnimDef = {
  name: 'sit', fps: 6, loop: true, steady: true,
  build: (d) => {
    const L = legL(d);
    return Array.from({ length: 8 }, (_, i) => Q(d, {
      pitch: -32,
      legs: { rn: { x: 0.55 * L, y: 0.15 * L }, rf: { x: 0.45 * L, y: 0.15 * L }, fn: { x: 0.25 * L, y: L - 0.2 }, ff: { x: 0.05 * L, y: L - 0.2 } },
      head: { angle: 28 }, tail: -10 + Math.sin((i / 8) * TAU) * 8, eyes: i === 5 ? 'closed' : 'open', mouth: i >= 2 && i <= 4 ? 'tongue' : 'closed',
    }));
  },
};

// ---------- saltos y festejo ----------

export const P_JUMP: AnimalAnimDef = {
  name: 'jump', fps: 12, loop: false,
  events: [{ type: 'despegue', phase: 2 / 9 }, { type: 'aterriza', phase: 6 / 9 }],
  build: (d) => {
    const L = legL(d);
    const top = Math.max(3, Math.round(8 * d.u));
    const crouch = Q(d, { pitch: 8, legs: { rn: { x: 0.35 * L, y: 0.55 * L }, rf: { x: 0.25 * L, y: 0.55 * L }, fn: { x: 0.05 * L, y: 0.65 * L }, ff: { x: -0.05 * L, y: 0.65 * L } }, tail: 10, head: { angle: 8 } });
    const launch = Q(d, { pitch: -24, air: Math.round(top / 3), legs: { rn: { x: -0.75 * L, y: 0.85 * L }, rf: { x: -0.85 * L, y: 0.8 * L }, fn: { x: 0.55 * L, y: 0.45 * L }, ff: { x: 0.45 * L, y: 0.45 * L } }, tail: 40 });
    const fly = Q(d, { pitch: -4, air: top, legs: { rn: { x: -0.65 * L, y: 0.55 * L }, rf: { x: -0.75 * L, y: 0.5 * L }, fn: { x: 0.7 * L, y: 0.45 * L }, ff: { x: 0.6 * L, y: 0.5 * L } }, tail: 30, mouth: 'open', eyes: 'happy' });
    const fall = Q(d, { pitch: 16, air: Math.round(top / 2), legs: { rn: { x: -0.45 * L, y: 0.6 * L }, rf: { x: -0.55 * L, y: 0.55 * L }, fn: { x: 0.45 * L, y: L - 0.4 }, ff: { x: 0.35 * L, y: L - 0.4 } }, tail: 45 });
    const land = Q(d, { pitch: 10, legs: { rn: { x: 0, y: 0.7 * L }, rf: { x: -0.1 * L, y: 0.7 * L }, fn: { x: 0.25 * L, y: 0.62 * L }, ff: { x: 0.15 * L, y: 0.62 * L } }, tail: 20 });
    return [standQ(d), crouch, launch, fly, fly, fall, land, Q(d, { tail: 30 }), standQ(d)];
  },
};

export const P_CELEBRATE: AnimalAnimDef = {
  name: 'celebrate', fps: 10, loop: true,
  events: [{ type: 'despegue', phase: 3 / 8 }, { type: 'aterriza', phase: 5 / 8 }],
  build: (d) => {
    const L = legL(d);
    // reverencia de juego (pecho abajo, cola arriba) y saltito
    const bow = Q(d, { pitch: 20, legs: { fn: { x: 0.5 * L, y: 0.35 * L }, ff: { x: 0.4 * L, y: 0.35 * L }, rn: { x: 0, y: L - 0.3 }, rf: { x: -0.1 * L, y: L - 0.3 } }, tail: 65, mouth: 'tongue', eyes: 'happy', head: { angle: -22 } });
    const hop = Q(d, { pitch: -16, air: Math.max(2, Math.round(4 * d.u)), legs: { fn: { x: 0.45 * L, y: 0.5 * L }, ff: { x: 0.35 * L, y: 0.55 * L }, rn: { x: -0.2 * L, y: 0.85 * L }, rf: { x: -0.3 * L, y: 0.85 * L } }, tail: 45, mouth: 'open', eyes: 'happy' });
    return [bow, bow, Q(d, { tail: 55, mouth: 'tongue', eyes: 'happy' }), hop, hop, Q(d, { tail: 30, mouth: 'tongue', eyes: 'happy' }), bow, bow];
  },
};

// ---------- de RPG ----------

/** Mordida: se agacha, se lanza estirado, muerde (golpe), sacude la cabeza tirando y vuelve. */
export const P_BITE: AnimalAnimDef = {
  name: 'bite', fps: 14, loop: false,
  events: [{ type: 'impacto', phase: 4 / 10 }],
  build: (d) => {
    const L = legL(d);
    const crouch = Q(d, { pitch: 10, x: -1, legs: { rn: { x: 0.45 * L, y: 0.65 * L }, rf: { x: 0.35 * L, y: 0.65 * L }, fn: { x: 0.1 * L, y: 0.72 * L }, ff: { x: 0, y: 0.72 * L } }, tail: 5, head: { angle: 10 }, eyes: 'open' });
    const lunge = Q(d, { pitch: -8, x: 2, air: 1, legs: { rn: { x: -0.6 * L, y: 0.85 * L }, rf: { x: -0.7 * L, y: 0.8 * L }, fn: { x: 0.55 * L, y: 0.65 * L }, ff: { x: 0.45 * L, y: 0.7 * L } }, mouth: 'open', tail: 20, head: { angle: -12, dx: 1 } });
    const planted = { rn: { x: -0.3 * L, y: L - 0.3 }, rf: { x: -0.4 * L, y: L - 0.3 }, fn: { x: 0.45 * L, y: L - 0.3 }, ff: { x: 0.35 * L, y: L - 0.3 } };
    const snap = Q(d, { pitch: 5, x: 2, legs: planted, mouth: 'closed', tail: 15, head: { angle: 14, dx: 1 } });
    // sacude: la cabeza va de un lado a otro tirando
    const shake = (a: number) => Q(d, { pitch: 3, x: 2, legs: planted, mouth: 'closed', tail: 25, head: { angle: a, dx: 1 } });
    return [standQ(d), crouch, crouch, lunge, snap, shake(4), shake(20), shake(4), Q(d, { x: 1, tail: 25 }), standQ(d)];
  },
};

/** Ladrido: el cuerpo empuja adelante, la cabeza sube y la boca se abre dos veces (cada ladrido es una suelta). */
export const P_BARK: AnimalAnimDef = {
  name: 'bark', fps: 10, loop: true,
  events: [{ type: 'suelta', phase: 1 / 6 }, { type: 'suelta', phase: 3 / 6 }],
  build: (d) => [0, 1, 0, 1, 0, 0].map((open, i) => Q(d, {
    pitch: open ? -6 : 0, x: open ? 1 : 0, head: { angle: open ? -16 : -4, dy: open ? -1 : 0 }, mouth: open ? 'open' : 'closed', tail: 35 + (i % 2) * 15,
  })),
};

/** Aullido: se sienta, levanta la cabeza y aúlla (el escudo de su dueño sale en la suelta). */
export const P_HOWL: AnimalAnimDef = {
  name: 'howl', fps: 8, loop: false,
  events: [{ type: 'suelta', phase: 3 / 8 }],
  build: (d) => {
    const L = legL(d);
    const sit = (head: number, mouth: QPose['mouth'], eyes: QPose['eyes']) => Q(d, {
      pitch: -30, legs: { rn: { x: 0.55 * L, y: 0.15 * L }, rf: { x: 0.45 * L, y: 0.15 * L }, fn: { x: 0.25 * L, y: L - 0.2 }, ff: { x: 0.05 * L, y: L - 0.2 } },
      head: { angle: head, dy: 0 }, tail: -5, mouth, eyes,
    });
    return [standQ(d), sit(10, 'closed', 'open'), sit(-20, 'closed', 'open'), sit(-48, 'open', 'closed'), sit(-54, 'open', 'closed'), sit(-54, 'open', 'closed'), sit(-30, 'closed', 'happy'), sit(0, 'tongue', 'happy')];
  },
};

/** Recoger botín: baja la cabeza al piso, agarra (golpe) y sube contento con la moneda. */
export const P_PICKUP: AnimalAnimDef = {
  name: 'pickup', fps: 10, loop: false,
  events: [{ type: 'impacto', phase: 3 / 8 }],
  build: (d) => {
    const L = legL(d);
    const down = (coin: boolean) => Q(d, { pitch: 18, legs: { fn: { x: 0.4 * L, y: 0.58 * L }, ff: { x: 0.3 * L, y: 0.58 * L }, rn: { x: 0, y: L - 0.3 }, rf: { x: -0.1 * L, y: L - 0.3 } }, head: { angle: 32, dy: 2 }, tail: 40, coin });
    return [standQ(d), down(false), down(false), down(true), Q(d, { coin: true, head: { angle: -8 }, tail: 50, eyes: 'happy' }), Q(d, { coin: true, head: { angle: -8 }, tail: 20, eyes: 'happy' }), Q(d, { coin: true, tail: 50, eyes: 'happy' }), Q(d, { coin: true, tail: 30 })];
  },
};

/** Cae rendido: se le aflojan las patas, se tumba de costado (golpe contra el piso) y queda quieto. */
export const P_DIE: AnimalAnimDef = {
  name: 'die', fps: 8, loop: false,
  events: [{ type: 'impacto', phase: 2 / 5 }],
  build: (d) => {
    const L = legL(d);
    const lie = (b: number) => Q(d, {
      legs: { fn: { x: 0.9 * L, y: 0.15 * L }, ff: { x: 0.75 * L, y: 0.15 * L }, rn: { x: 0.5 * L, y: 0.12 * L }, rf: { x: 0.35 * L, y: 0.12 * L } },
      head: { angle: 30 + b, dy: 2 }, tail: -20, eyes: 'closed',
    });
    return [A_HURT.build(d)[0], Q(d, { pitch: 12, eyes: 'closed', tail: -10, legs: { fn: { x: 0.5 * L, y: 0.5 * L }, ff: { x: 0.4 * L, y: 0.5 * L }, rn: { x: 0, y: L - 0.5 }, rf: { x: -0.1 * L, y: L - 0.5 } } }), lie(0), lie(6), lie(6)];
  },
};

/** Cava: con un rasguño por cada pata (pasos), igual que el clásico. */
export const P_DIG: AnimalAnimDef = { ...A_DIG, events: [{ type: 'paso', phase: 0, foot: 'near' }, { type: 'paso', phase: 0.5, foot: 'far' }] };

export const PET_PREMIUM: AnimalAnimDef[] = [P_IDLE, P_WALK, P_TROT, P_RUN, P_JUMP, P_SIT, A_LIE, A_WAG, P_CELEBRATE, P_FETCH, P_BITE, P_BARK, P_HOWL, P_PICKUP, A_HURT, P_DIE, P_DIG];
const byName = new Map(PET_PREMIUM.map((a) => [a.name, a]));
export const petPremiumAnim = (name: string) => byName.get(name);
