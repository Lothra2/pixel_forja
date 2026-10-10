import { type Pose, type PropState, keyed } from '../rig/pose';
import { type AnimDef, type Ctx, P, TAU, feet } from './types';
import { swim, run } from './basic';
import { reachArm } from '../render/human';

/** Paquetes deportivos. Los implementos se enganchan a manos, pies o al piso. */

const withProps = (poses: Pose[], props: (i: number) => PropState[] | undefined): Pose[] => poses.map((p, i) => ({ ...p, props: props(i) }));

function athletic(c: Ctx, crouch = 0.45): Pose {
  return P(c, { torso: 12, legs: feet(c, crouch, 0.24), arms: { near: { shoulder: 30, elbow: 60, spread: 15 }, far: { shoulder: 10, elbow: 60, spread: 15 } } });
}

// ---------- básquet ----------

export const dribble: AnimDef = {
  name: 'dribble', pack: 'basket', fps: 10, loop: true, steady: true,
  build: (c) => {
    const L = c.L, u = c.u;
    const hands = [30, 35, 45, 50, 45, 35, 30, 28];
    const hy = [11, 8, 5, 1, 0, 3, 7, 10];
    return [...Array(8)].map((_, i) => ({
      ...athletic(c, 0.45),
      arms: { near: { shoulder: hands[i], elbow: 40 }, far: { shoulder: 20, elbow: 70, spread: 20 } },
      props: [{ kind: 'basketball', at: 'ground', x: 0.85 * L, y: hy[i] * u } as PropState],
    }));
  },
};

export const shootBasket: AnimDef = {
  name: 'shoot', pack: 'basket', fps: 10, loop: false,
  build: (c) => {
    const L = c.L, u = c.u;
    const top = Math.max(2, Math.round(4 * u));
    const set = P(c, { torso: 6, legs: feet(c, 0.6), arms: { near: { shoulder: 140, elbow: 110 }, far: { shoulder: 130, elbow: 120 } } });
    const rise = P(c, { air: top, torso: -2, legs: { near: { x: 0.05 * L, y: 0.9 * L, toe: 45 }, far: { x: -0.1 * L, y: 0.9 * L, toe: 45 } }, arms: { near: { shoulder: 165, elbow: 40 }, far: { shoulder: 150, elbow: 60 } } });
    const release = P(c, { ...rise, arms: { near: { shoulder: 160, elbow: 0 }, far: { shoulder: 140, elbow: 40 } }, face: { eyes: 'open', mouth: 'line' } });
    const seq = [athletic(c), set, rise, release, release, P(c, { legs: feet(c, 0.4) })];
    return withProps(seq, (i) => (i < 2 ? [{ kind: 'basketball', at: 'handNear', x: 0, y: -3 * u }] : i < 3 ? [{ kind: 'basketball', at: 'handNear', x: 7 * u, y: -4 * u }] : [{ kind: 'basketball', at: 'ground', x: (1 + i - 3) * 0.6 * L, y: (24 + (i - 3) * 4) * u }]));
  },
};

export const dunk: AnimDef = {
  name: 'dunk', pack: 'basket', fps: 12, loop: false,
  build: (c) => {
    const L = c.L, u = c.u;
    const top = Math.max(3, Math.round(7 * u));
    const load = P(c, { torso: 20, legs: feet(c, 0.9, 0.22), arms: { near: { shoulder: -40, elbow: 30 }, far: { shoulder: -30, elbow: 30 } } });
    const fly = P(c, { air: top, torso: -6, legs: { near: { x: 0.3 * L, y: 0.6 * L, toe: 40 }, far: { x: -0.3 * L, y: 0.8 * L, toe: 50 } }, arms: { near: { shoulder: 190, elbow: 30 }, far: { shoulder: 120, elbow: 20, spread: 30 } }, face: { eyes: 'angry', mouth: 'open' } });
    const slam = P(c, { ...fly, torso: 14, arms: { near: { shoulder: 120, elbow: 10 }, far: { shoulder: 100, elbow: 20, spread: 30 } }, face: { eyes: 'angry', mouth: 'grin' } });
    const seq = [athletic(c), load, fly, fly, slam, { ...slam, air: Math.round(top / 2) }, P(c, { torso: 18, legs: feet(c, 0.9) }), athletic(c)];
    // el balón levantado asoma por delante de la cabeza (los brazos del chibi no la pasan)
    return withProps(seq, (i) => (i < 2 ? [{ kind: 'basketball', at: 'handNear', x: 1, y: -2 * u }] : i < 4 ? [{ kind: 'basketball', at: 'handNear', x: 7 * u, y: -3 * u }] : i === 4 ? [{ kind: 'basketball', at: 'handNear', x: 3 * u, y: 3 * u }] : undefined));
  },
};

export const blockAnim: AnimDef = {
  name: 'block', pack: 'volley', fps: 10, loop: false,
  build: (c) => {
    const L = c.L, u = c.u;
    const top = Math.max(2, Math.round(5 * u));
    const up = P(c, { air: top, legs: { near: { x: 0.05 * L, y: 0.9 * L, toe: 40 }, far: { x: -0.05 * L, y: 0.9 * L, toe: 40 } }, arms: { near: { shoulder: 172, elbow: 0, spread: 12 }, far: { shoulder: 168, elbow: 0, spread: 12 } }, face: { eyes: 'angry', mouth: 'line' } });
    return keyed(8, [[0, athletic(c)], [1, P(c, { torso: 10, legs: feet(c, 0.8) })], [2, up, 'hold'], [4, up], [6, P(c, { legs: feet(c, 0.6) })], [7, athletic(c)]]);
  },
};

// ---------- vóley ----------

export const serve: AnimDef = {
  name: 'serve', pack: 'volley', fps: 10, loop: false,
  build: (c) => {
    const L = c.L, u = c.u;
    const toss = P(c, { arms: { near: { shoulder: -30, elbow: 30 }, far: { shoulder: 160, elbow: 5 } }, legs: { near: { x: 0.25 * L, y: L - 0.4 }, far: { x: -0.25 * L, y: L - 0.4 } } });
    const cock = P(c, { torso: -12, arms: { near: { shoulder: 200, elbow: 90 }, far: { shoulder: 120, elbow: 10 } }, legs: { near: { x: 0.3 * L, y: L - 0.5 }, far: { x: -0.25 * L, y: L - 0.3, toe: 30 } }, face: { eyes: 'angry' } });
    const hitp = P(c, { torso: 16, arms: { near: { shoulder: 150, elbow: 0 }, far: { shoulder: 30, elbow: 30 } }, legs: { near: { x: 0.3 * L, y: L - 0.6 }, far: { x: -0.3 * L, y: L - 0.5, toe: 40 } }, face: { mouth: 'open' } });
    const seq = keyed(8, [[0, P(c)], [2, toss], [4, cock, 'in'], [5, hitp], [7, P(c)]]);
    const by = [0, 3, 10, 16, 18, 17, 19, 21];
    return withProps(seq, (i) => [i < 1 ? { kind: 'volleyball', at: 'handFar', x: 0, y: -3 * u } : { kind: 'volleyball', at: 'ground', x: (i < 5 ? 0.4 : 0.4 + (i - 4) * 0.9) * L, y: (14 + by[i]) * u }]);
  },
};

export const spike: AnimDef = {
  name: 'spike', pack: 'volley', fps: 12, loop: false,
  build: (c) => {
    const L = c.L, u = c.u;
    const top = Math.max(3, Math.round(6 * u));
    const load = P(c, { torso: 24, legs: feet(c, 0.9, 0.22), arms: { near: { shoulder: -60, elbow: 20 }, far: { shoulder: -50, elbow: 20 } } });
    const arch = P(c, { air: top, torso: -16, legs: { near: { x: -0.2 * L, y: 0.7 * L, toe: 50 }, far: { x: -0.35 * L, y: 0.6 * L, toe: 50 } }, arms: { near: { shoulder: 210, elbow: 80 }, far: { shoulder: 140, elbow: 10 } }, face: { eyes: 'angry', mouth: 'line' } });
    const strike = P(c, { ...arch, torso: 18, arms: { near: { shoulder: 120, elbow: 0 }, far: { shoulder: 60, elbow: 30 } }, face: { eyes: 'angry', mouth: 'grin' } });
    const seq = [athletic(c), load, arch, arch, strike, { ...strike, air: Math.round(top / 2) }, P(c, { torso: 16, legs: feet(c, 0.8) }), athletic(c)];
    return withProps(seq, (i) => (i >= 2 && i <= 6 ? [{ kind: 'volleyball', at: 'ground', x: (i < 4 ? 0.7 : 0.7 + (i - 3) * 0.8) * L, y: (i < 4 ? 30 : 30 - (i - 3) * 7) * u }] : undefined));
  },
};

// ---------- tenis ----------

const racket = (angle?: number): PropState => ({ kind: 'racket', at: 'handNear', angle });

export const tennisServe: AnimDef = {
  name: 'tennis_serve', pack: 'tennis', fps: 10, loop: false,
  build: (c) => {
    const L = c.L, u = c.u;
    const toss = P(c, { arms: { near: { shoulder: -40, elbow: 20 }, far: { shoulder: 165, elbow: 5 } }, legs: { near: { x: 0.3 * L, y: L - 0.4 }, far: { x: -0.2 * L, y: L - 0.4 } } });
    const trophy = P(c, { torso: -14, arms: { near: { shoulder: 190, elbow: 110 }, far: { shoulder: 150, elbow: 10 } }, legs: feet(c, 0.5, 0.22), face: { eyes: 'angry' } });
    const hitp = P(c, { torso: 18, air: Math.round(1 * u), arms: { near: { shoulder: 160, elbow: 0 }, far: { shoulder: 20, elbow: 40 } }, legs: { near: { x: 0.2 * L, y: 0.95 * L, toe: 40 }, far: { x: -0.25 * L, y: 0.9 * L, toe: 50 } }, face: { mouth: 'open' } });
    const finish = P(c, { torso: 20, arms: { near: { shoulder: -20, elbow: 40 }, far: { shoulder: 40, elbow: 40 } }, legs: { near: { x: 0.4 * L, y: L - 0.8 }, far: { x: -0.3 * L, y: L - 0.5 } } });
    const seq = keyed(10, [[0, P(c)], [2, toss], [4, trophy, 'in'], [6, hitp, 'out'], [8, finish], [9, P(c)]]);
    return withProps(seq, (i) => [racket(), ...(i <= 6 ? [{ kind: 'tennisball', at: 'ground', x: 0.9 * L, y: [12, 18, 28, 36, 40, 39, 37][i] * u } as PropState] : [])]);
  },
};

export const forehand: AnimDef = {
  name: 'forehand', pack: 'tennis', fps: 12, loop: false,
  build: (c) => {
    const L = c.L;
    const back = P(c, { torso: -6, arms: { near: { shoulder: -70, elbow: 30 }, far: { shoulder: 60, elbow: 40 } }, legs: feet(c, 0.5, 0.25) });
    const hitp = P(c, { torso: 12, arms: { near: { shoulder: 70, elbow: 10 }, far: { shoulder: 20, elbow: 40 } }, legs: { near: { x: 0.35 * L, y: L - 0.9 }, far: { x: -0.25 * L, y: L - 0.7, toe: 20 } }, face: { mouth: 'open' } });
    const through = P(c, { torso: 14, arms: { near: { shoulder: 140, elbow: 70 }, far: { shoulder: -10, elbow: 40 } }, legs: { near: { x: 0.35 * L, y: L - 0.8 }, far: { x: -0.2 * L, y: L - 0.6, toe: 40 } } });
    return withProps(keyed(8, [[0, athletic(c)], [2, back, 'in'], [4, hitp, 'out'], [6, through], [7, athletic(c)]]), () => [racket()]);
  },
};

export const backhand: AnimDef = {
  name: 'backhand', pack: 'tennis', fps: 12, loop: false,
  build: (c) => {
    const L = c.L;
    const back = P(c, { torso: -10, arms: { near: { shoulder: 70, elbow: 120 }, far: { shoulder: 60, elbow: 100 } }, legs: feet(c, 0.5, 0.25) });
    const hitp = P(c, { torso: 6, arms: { near: { shoulder: 60, elbow: 0 }, far: { shoulder: 40, elbow: 60 } }, legs: { near: { x: 0.35 * L, y: L - 0.9 }, far: { x: -0.25 * L, y: L - 0.7 } }, face: { mouth: 'line' } });
    const through = P(c, { torso: -4, arms: { near: { shoulder: 150, elbow: -30 }, far: { shoulder: 20, elbow: 40 } }, legs: { near: { x: 0.35 * L, y: L - 0.8 }, far: { x: -0.2 * L, y: L - 0.6, toe: 30 } } });
    return withProps(keyed(8, [[0, athletic(c)], [2, back, 'in'], [4, hitp, 'out'], [6, through], [7, athletic(c)]]), () => [racket()]);
  },
};

// ---------- béisbol ----------

export const bat: AnimDef = {
  name: 'bat', pack: 'baseball', fps: 12, loop: false,
  build: (c) => {
    const L = c.L;
    const stance = P(c, { torso: 6, legs: feet(c, 0.45, 0.28), arms: { near: { shoulder: 110, elbow: 140 }, far: { shoulder: 90, elbow: 130 } } });
    const load = P(c, { ...stance, torso: -4, legs: { near: { x: 0.2 * L, y: 0.8 * L, toe: 20 }, far: { x: -0.3 * L, y: L - 0.9 } } });
    const swing = P(c, { torso: 10, legs: { near: { x: 0.4 * L, y: L - 0.9 }, far: { x: -0.3 * L, y: L - 0.8, toe: 40 } }, arms: { near: { shoulder: 85, elbow: 5 }, far: { shoulder: 80, elbow: 10 } }, face: { eyes: 'angry', mouth: 'grin' } });
    const finish = P(c, { torso: 6, legs: { near: { x: 0.4 * L, y: L - 0.8 }, far: { x: -0.2 * L, y: L - 0.6, toe: 60 } }, arms: { near: { shoulder: 150, elbow: 110 }, far: { shoulder: 140, elbow: 110 } } });
    return withProps(keyed(8, [[0, stance], [2, load], [4, swing, 'out'], [6, finish, 'hold'], [7, finish]]), () => [{ kind: 'bat', at: 'handNear' }]);
  },
};

export const pitch: AnimDef = {
  name: 'pitch', pack: 'baseball', fps: 12, loop: false,
  build: (c) => {
    const L = c.L, u = c.u;
    const knee = P(c, { torso: -8, legs: { far: { x: 0, y: L - 0.3 }, near: { x: 0.25 * L, y: 0.4 * L, toe: 20 } }, arms: { near: { shoulder: 40, elbow: 100 }, far: { shoulder: 40, elbow: 100 } } });
    const cock = P(c, { torso: -12, legs: { near: { x: 0.5 * L, y: L - 0.9 }, far: { x: -0.3 * L, y: L - 0.5 } }, arms: { near: { shoulder: -120, elbow: 40 }, far: { shoulder: 90, elbow: 20 } }, face: { eyes: 'angry' } });
    const release = P(c, { torso: 26, legs: { near: { x: 0.5 * L, y: L - 1.2 }, far: { x: -0.4 * L, y: L - 0.6, toe: 50 } }, arms: { near: { shoulder: 100, elbow: 10 }, far: { shoulder: -20, elbow: 40 } }, face: { eyes: 'angry', mouth: 'open' } });
    const seq = keyed(8, [[0, P(c)], [2, knee], [4, cock, 'in'], [5, release, 'out'], [7, P(c, { torso: 10, legs: feet(c, 0.3) })]]);
    return withProps(seq, (i) => (i <= 5 ? [{ kind: 'baseball', at: 'handNear', x: 0, y: 0 }] : [{ kind: 'baseball', at: 'ground', x: (1.2 + (i - 5) * 1.2) * L, y: 16 * u }]));
  },
};

export const catchBall: AnimDef = {
  name: 'catch', pack: 'baseball', fps: 10, loop: false,
  build: (c) => {
    const L = c.L, u = c.u;
    const reach = P(c, { torso: 6, legs: feet(c, 0.4, 0.25), arms: { near: { shoulder: 110, elbow: 20 }, far: { shoulder: 20, elbow: 40 } } });
    const got = P(c, { torso: 8, legs: feet(c, 0.5, 0.25), arms: { near: { shoulder: 70, elbow: 70 }, far: { shoulder: 40, elbow: 70 } }, face: { eyes: 'happy', mouth: 'smile' } });
    const seq = keyed(6, [[0, athletic(c)], [2, reach, 'hold'], [3, reach], [5, got]]);
    return withProps(seq, (i) => [{ kind: 'glove', at: 'handNear' }, ...(i < 3 ? [{ kind: 'baseball', at: 'ground', x: (2.8 - i * 0.6) * L, y: 18 * u } as PropState] : [])]);
  },
};

// ---------- natación y atletismo ----------

export const dive: AnimDef = {
  name: 'dive', pack: 'swim', fps: 10, loop: false,
  build: (c) => {
    const L = c.L, u = c.u;
    const top = Math.max(2, Math.round(5 * u));
    const arms = P(c, { arms: { near: { shoulder: 175, elbow: 0 }, far: { shoulder: 175, elbow: 0 } } });
    const crouch = P(c, { torso: 50, legs: feet(c, 0.8, 0.1), arms: { near: { shoulder: 150, elbow: 0 }, far: { shoulder: 150, elbow: 0 } } });
    const launch = P(c, { air: top, torso: 60, legs: { near: { x: -0.5 * L, y: 0.7 * L, toe: 70 }, far: { x: -0.55 * L, y: 0.7 * L, toe: 70 } }, arms: { near: { shoulder: 180, elbow: 0 }, far: { shoulder: 180, elbow: 0 } }, face: { eyes: 'closed', mouth: 'line' } });
    const entry = P(c, { ...launch, air: Math.round(top / 2), torso: 120, legs: { near: { x: -0.4 * L, y: -0.8 * L, toe: 80 }, far: { x: -0.45 * L, y: -0.75 * L, toe: 80 } } });
    return [P(c), arms, crouch, launch, launch, entry, entry, swim.build(c)[0]];
  },
};

export const hurdles: AnimDef = {
  name: 'hurdles', pack: 'athletics', fps: 12, loop: true, hairTrail: -1,
  build: (c) => {
    const L = c.L, u = c.u;
    const r = run.build(c);
    const clear = P(c, { air: Math.max(2, Math.round(5 * u)), torso: 30, legs: { near: { x: 0.95 * L, y: 0.15 * L, toe: 0 }, far: { x: -0.7 * L, y: 0.3 * L, toe: 60, z: 2 } }, arms: { near: { shoulder: -40, elbow: 60 }, far: { shoulder: 100, elbow: 10 } }, face: { eyes: 'angry', mouth: 'line' } });
    const seq = [r[0], r[1], r[2], clear, clear, r[5], r[6], r[7]];
    return withProps(seq, (i) => [{ kind: 'hurdle', at: 'ground', x: (1.4 - i * 0.4) * L, behind: i > 3 }]);
  },
};

export const longJump: AnimDef = {
  name: 'long_jump', pack: 'athletics', fps: 12, loop: false,
  build: (c) => {
    const L = c.L, u = c.u;
    const r = run.build(c);
    const top = Math.max(3, Math.round(6 * u));
    const take = P(c, { torso: 6, legs: { near: { x: 0.4 * L, y: 0.6 * L, toe: 20 }, far: { x: -0.1 * L, y: L - 0.1, toe: 50 } }, arms: { near: { shoulder: 160, elbow: 10 }, far: { shoulder: -40, elbow: 20 } } });
    const hang = P(c, { air: top, torso: -8, legs: { near: { x: 0.5 * L, y: 0.5 * L, toe: 10 }, far: { x: 0.3 * L, y: 0.55 * L, toe: 10 } }, arms: { near: { shoulder: 170, elbow: 10 }, far: { shoulder: 165, elbow: 10 } }, face: { mouth: 'open' } });
    const reachP = P(c, { air: Math.round(top / 2), torso: 30, legs: { near: { x: 0.85 * L, y: 0.45 * L, toe: 0 }, far: { x: 0.8 * L, y: 0.5 * L, toe: 0 } }, arms: { near: { shoulder: 60, elbow: 0 }, far: { shoulder: 60, elbow: 0 } } });
    const sand = P(c, { torso: 40, legs: { near: { x: 0.6 * L, y: 0.45 * L }, far: { x: 0.55 * L, y: 0.45 * L } }, arms: { near: { shoulder: 30, elbow: 20 }, far: { shoulder: 20, elbow: 20 } }, face: { eyes: 'happy', mouth: 'smile' } });
    return [r[0], r[2], r[4], take, hang, hang, reachP, sand, sand];
  },
};

export const sprintStart: AnimDef = {
  name: 'sprint_start', pack: 'athletics', fps: 10, loop: false,
  build: (c) => {
    const L = c.L;
    const onMarks = P(c, { torso: 75, legs: { near: { x: 0.3 * L, y: 0.55 * L }, far: { x: -0.55 * L, y: 0.4 * L, toe: 60 } }, arms: { near: { shoulder: -70, elbow: 0 }, far: { shoulder: -75, elbow: 0 } }, head: { tilt: -30 } });
    const set = P(c, { ...onMarks, torso: 62, legs: { near: { x: 0.25 * L, y: 0.7 * L }, far: { x: -0.6 * L, y: 0.6 * L, toe: 50 } } });
    const go = P(c, { torso: 45, legs: { near: { x: 0.5 * L, y: 0.5 * L, toe: 20 }, far: { x: -0.6 * L, y: 0.8 * L, toe: 50 } }, arms: { near: { shoulder: -60, elbow: 80 }, far: { shoulder: 80, elbow: 80 } }, face: { eyes: 'angry', mouth: 'grin' } });
    const step = P(c, { torso: 30, legs: { near: { x: 0.2 * L, y: L - 0.8 }, far: { x: -0.3 * L, y: 0.5 * L, toe: 30 } }, arms: { near: { shoulder: 60, elbow: 80 }, far: { shoulder: -60, elbow: 80 } } });
    return [onMarks, onMarks, set, set, go, step, run.build(c)[0]];
  },
};

// ---------- artes marciales ----------

function guardPose(c: Ctx, b = 0): Pose {
  return P(c, {
    torso: 8,
    legs: { near: { x: 0.35 * c.L, y: c.L - 0.9 + b * 0.4 }, far: { x: -0.3 * c.L, y: c.L - 0.9 + b * 0.4 } },
    arms: { near: { shoulder: 60, elbow: 110 }, far: { shoulder: 45, elbow: 120 } },
    face: { eyes: 'angry', mouth: 'line' },
  });
}

export const guard: AnimDef = {
  name: 'guard', pack: 'martial', fps: 8, loop: true, steady: true,
  build: (c) => [0, 0, 1, 1, 0, 0, 1, 1].map((b) => guardPose(c, b)),
};

export const punch: AnimDef = {
  name: 'punch', pack: 'martial', fps: 14, loop: false,
  build: (c) => {
    const L = c.L;
    const hitp = P(c, { torso: 16, x: 1, legs: { near: { x: 0.45 * c.L, y: L - 1.1 }, far: { x: -0.35 * L, y: L - 0.8 } }, arms: { near: { shoulder: 90, elbow: 0 }, far: { shoulder: 45, elbow: 125 } }, face: { eyes: 'angry', mouth: 'grin' } });
    return keyed(6, [[0, guardPose(c)], [2, hitp, 'hold'], [3, hitp], [5, guardPose(c)]]);
  },
};

export const kickMartial: AnimDef = {
  name: 'kick_martial', pack: 'martial', fps: 12, loop: false,
  build: (c) => {
    const L = c.L;
    const chamber = P(c, { torso: -10, legs: { far: { x: -0.05 * L, y: L - 0.5 }, near: { x: 0.3 * L, y: 0.35 * L, toe: 30 } }, arms: { near: { shoulder: 60, elbow: 110 }, far: { shoulder: 45, elbow: 120 } }, face: { eyes: 'angry', mouth: 'line' } });
    const ext = P(c, { torso: -28, legs: { far: { x: -0.1 * L, y: L - 0.6, toe: 20 }, near: { x: 1.0 * L, y: -0.05 * L, toe: 0 } }, arms: { near: { shoulder: 50, elbow: 110 }, far: { shoulder: 30, elbow: 120 } }, face: { eyes: 'angry', mouth: 'grin' } });
    return keyed(8, [[0, guardPose(c)], [2, chamber], [3, ext, 'hold'], [5, ext], [6, chamber], [7, guardPose(c)]]);
  },
};

// ---------- skate y bici ----------

export const skate: AnimDef = {
  name: 'skate', pack: 'skate', fps: 10, loop: true, hairTrail: -1,
  build: (c) => {
    const L = c.L, u = c.u;
    const deck = Math.max(2, Math.round(2 * u)) + Math.max(1, Math.round(u));
    const ride = (b: number) => P(c, { torso: 10, air: deck, legs: { near: { x: 0.35 * L, y: L - 1 + b * 0.3, z: 1 }, far: { x: -0.3 * L, y: L - 1 + b * 0.3, z: 1 } }, arms: { near: { shoulder: 50, elbow: 20, spread: 40 }, far: { shoulder: -30, elbow: 20, spread: 40 } } });
    const push = (k: number) => P(c, { torso: 18, legs: { near: { x: 0.25 * L, y: L - 1.2 - deck }, far: { x: (-0.2 - k * 0.5) * L, y: L - 1.0, toe: k > 0.5 ? 40 : 0 } }, arms: { near: { shoulder: 40, elbow: 20, spread: 40 }, far: { shoulder: -20, elbow: 20, spread: 40 } } });
    const seq = [ride(0), ride(1), ride(1), ride(0), push(0), push(0.6), push(1), push(0.3)];
    return withProps(seq, () => [{ kind: 'skate', at: 'ground', x: 0.05 * L }]);
  },
};

export const bike: AnimDef = {
  name: 'bike', pack: 'bike', fps: 10, loop: true, hairTrail: -1,
  build: (c) => {
    const L = c.L, u = c.u;
    const R = Math.round(7 * u);
    const seatH = R * 2.3 + 1;
    const hipH = Math.round(seatH);
    const torso = 28;
    const crankRel: [number, number] = [3 * u, seatH - R];
    const crankR = Math.max(2, Math.round(3 * u));
    const bar: [number, number] = [Math.round(17 * u) / 2 - 1 * u + 3 * u, -(R * 2.5) + seatH];
    const out: Pose[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const near = { x: crankRel[0] + Math.cos(a) * crankR - (Math.floor(c.d.hipSpread / 2)), y: crankRel[1] + Math.sin(a) * crankR + 1 };
      const far = { x: crankRel[0] - Math.cos(a) * crankR - (Math.floor(c.d.hipSpread / 2) - c.d.hipSpread), y: crankRel[1] - Math.sin(a) * crankR + 1 };
      const arm = reachArm(c.d, torso, [bar[0], bar[1] - 1]);
      out.push(P(c, {
        hipH, torso,
        legs: { near: { ...near, toe: 10 }, far: { ...far, toe: 10 } },
        arms: { near: arm, far: { ...arm } },
        props: [{ kind: 'bike', at: 'ground', x: 3 * u, angle: i / 8, behind: false }],
      }));
    }
    void L;
    return out;
  },
};

export const SPORTS: AnimDef[] = [dribble, shootBasket, dunk, blockAnim, serve, spike, tennisServe, forehand, backhand, bat, pitch, catchBall, swim, dive, hurdles, longJump, sprintStart, guard, punch, kickMartial, skate, bike];
