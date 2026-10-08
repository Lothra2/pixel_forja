import { type Pose, type PropState, keyed } from '../rig/pose';
import { type AnimDef, type Ctx, P, TAU, feet } from './types';
import { celebrate, sad, idle, walk, run, jumpTakeoff, jumpRise, jumpApex, jumpFall, land } from './basic';

/**
 * Fútbol. Los nombres son los del preajuste de Fútbol Familia GG.
 * El balón se dibuja solo en la vista previa: al exportar para el juego va apagado, porque el juego tiene su balón.
 */
const ball = (x: number, y = 0): PropState => ({ kind: 'soccer', at: 'ground', x, y });

function ready(c: Ctx, bob = 0): Pose {
  return P(c, {
    torso: 14,
    legs: feet(c, 0.45 + bob * 0.1, 0.24),
    arms: { near: { shoulder: 25, elbow: 55, spread: 15 }, far: { shoulder: -10, elbow: 50, spread: 15 } },
  });
}

/** Patada genérica: preparación, contacto y seguimiento. power 0..1 */
function kickSeq(c: Ctx, power: number, follow: number, lean: number, ballPath: [number, number][]): Pose[] {
  const L = c.L;
  const plant = { x: 0.15 * L, y: L - 0.5, toe: 0 };
  const back = P(c, {
    torso: 8, legs: { far: plant, near: { x: -0.35 * L - power * 0.15 * L, y: 0.75 * L - power * 0.2 * L, toe: 30 } },
    arms: { near: { shoulder: -40, elbow: 30 }, far: { shoulder: 60, elbow: 30, spread: 30 } },
    face: { eyes: 'angry', mouth: 'line' },
  });
  const contact = P(c, {
    torso: 4 + lean * 0.3, legs: { far: plant, near: { x: 0.3 * L, y: 0.9 * L, toe: 20 + power * 20 } },
    arms: { near: { shoulder: 10, elbow: 30 }, far: { shoulder: -20, elbow: 30, spread: 30 } },
    face: { eyes: 'angry', mouth: 'open' },
  });
  const through = P(c, {
    torso: lean, legs: { far: { ...plant, toe: 30 }, near: { x: (0.45 + follow * 0.25) * L, y: (0.75 - follow * 0.45) * L, toe: 40 } },
    arms: { near: { shoulder: 40, elbow: 30 }, far: { shoulder: -40, elbow: 30, spread: 30 } },
    face: { mouth: 'open' },
  });
  const seq = keyed(8, [[0, ready(c)], [2, back, 'in'], [3, contact, 'out'], [5, through], [7, ready(c)]]);
  return seq.map((p, i) => ({ ...p, props: ballPath[i] ? [ball(ballPath[i][0], ballPath[i][1])] : undefined }));
}

export const readyAnim: AnimDef = {
  name: 'ready', pack: 'football', fps: 8, loop: true, steady: true,
  build: (c) => [0, 0, 1, 1, 0, 0, 1, 1].map((b) => ready(c, b)),
};

export const trap: AnimDef = {
  name: 'trap', pack: 'football', fps: 10, loop: false,
  build: (c) => {
    const L = c.L, u = c.u;
    const lift = P(c, { torso: 6, legs: { far: { x: -0.1 * L, y: L - 0.4 }, near: { x: 0.35 * L, y: 0.62 * L, toe: -15 } }, arms: { near: { shoulder: 60, elbow: 30, spread: 40 }, far: { shoulder: 40, elbow: 30, spread: 40 } } });
    const cushion = P(c, { torso: 10, legs: { far: { x: -0.1 * L, y: L - 0.7 }, near: { x: 0.3 * L, y: 0.72 * L, toe: -10 } }, arms: { near: { shoulder: 50, elbow: 40, spread: 40 }, far: { shoulder: 30, elbow: 40, spread: 40 } } });
    const poses = keyed(6, [[0, ready(c)], [1, lift], [3, cushion], [5, ready(c)]]);
    const bx = [2.0, 1.6, 1.0, 0.9, 0.9, 0.9].map((k) => k * L);
    const by = [6, 4, 2, 0, 0, 0].map((k) => k * u);
    return poses.map((p, i) => ({ ...p, props: [ball(bx[i], by[i])] }));
  },
};

export const pass: AnimDef = {
  name: 'pass', pack: 'football', fps: 12, loop: false,
  build: (c) => kickSeq(c, 0.3, 0.2, 2, [[0.7 * c.L, 0], [0.7 * c.L, 0], [0.7 * c.L, 0], [0.9 * c.L, 0], [1.5 * c.L, 0], [2.0 * c.L, 0]]),
};

export const chip: AnimDef = {
  name: 'chip', pack: 'football', fps: 12, loop: false,
  build: (c) => {
    const L = c.L, u = c.u;
    const seq = kickSeq(c, 0.5, 0.9, -10, [[0.7 * L, 0], [0.7 * L, 0], [0.7 * L, 0], [0.9 * L, 3 * u], [1.3 * L, 8 * u], [1.7 * L, 11 * u]]);
    return seq;
  },
};

export const shot: AnimDef = {
  name: 'shot', pack: 'football', fps: 12, loop: false,
  build: (c) => kickSeq(c, 1, 0.8, -6, [[0.7 * c.L, 0], [0.7 * c.L, 0], [0.7 * c.L, 0], [1.2 * c.L, 2 * c.u], [2.0 * c.L, 4 * c.u]]),
};

/** "patear" del paquete básico: el mismo tiro, con preparación, contacto y seguimiento. */
export const kick: AnimDef = { ...shot, name: 'kick', pack: 'basic' };

export const header: AnimDef = {
  name: 'header', pack: 'football', fps: 12, loop: false,
  build: (c) => {
    const L = c.L, u = c.u;
    const top = Math.max(2, Math.round(4 * u));
    const crouch = P(c, { torso: 10, legs: feet(c, 0.7, 0.2), arms: { near: { shoulder: -30, elbow: 20 }, far: { shoulder: -20, elbow: 20 } } });
    const cock = P(c, { air: top, torso: -14, head: { tilt: -12 }, legs: { near: { x: 0, y: 0.75 * L, toe: 40 }, far: { x: -0.25 * L, y: 0.7 * L, toe: 50 } }, arms: { near: { shoulder: 70, elbow: 50, spread: 40 }, far: { shoulder: 60, elbow: 50, spread: 40 } }, face: { eyes: 'angry', mouth: 'line' } });
    const snap = P(c, { air: top, torso: 16, head: { tilt: 6 }, legs: { near: { x: -0.1 * L, y: 0.8 * L, toe: 50 }, far: { x: -0.3 * L, y: 0.75 * L, toe: 50 } }, arms: { near: { shoulder: 20, elbow: 50, spread: 40 }, far: { shoulder: 10, elbow: 50, spread: 40 } }, face: { eyes: 'closed', mouth: 'line' } });
    const down = P(c, { air: Math.round(top / 2), torso: 8, legs: { near: { x: 0.1 * L, y: 0.9 * L }, far: { x: -0.1 * L, y: 0.9 * L } }, arms: { near: { shoulder: 30, elbow: 30 }, far: { shoulder: 20, elbow: 30 } } });
    const seq = [crouch, cock, cock, snap, down, P(c, { legs: feet(c, 0.4) })];
    // la pelota llega a la frente: altura y adelanto salen de las medidas del cuerpo, no de números fijos
    const d = c.d;
    const brow = d.footH + L + d.torsoH + 0.55 * d.headW;
    const front = 0.5 * d.headW + 2 * u;
    const bx = [front + 0.9 * L, front + 0.6 * L, front + 0.3 * L, front, front + 0.5 * L, front + 0.9 * L];
    const by = [brow + 3 * u, brow + top, brow + top, brow + top - 2 * u, brow + 2 * u, brow + 5 * u];
    return seq.map((p, i) => ({ ...p, props: [ball(bx[i], by[i])] }));
  },
};

export const volley: AnimDef = {
  name: 'volley', pack: 'football', fps: 12, loop: false,
  build: (c) => {
    const L = c.L, u = c.u;
    const chamber = P(c, { torso: -10, legs: { far: { x: 0, y: L - 0.5 }, near: { x: 0.1 * L, y: 0.45 * L, toe: 10 } }, arms: { near: { shoulder: 60, elbow: 20, spread: 50 }, far: { shoulder: 80, elbow: 20, spread: 50 } }, face: { eyes: 'angry' } });
    const strike = P(c, { torso: -24, legs: { far: { x: -0.05 * L, y: L - 0.6, toe: 20 }, near: { x: 0.85 * L, y: 0.25 * L, toe: 0 } }, arms: { near: { shoulder: 100, elbow: 10, spread: 50 }, far: { shoulder: 110, elbow: 10, spread: 50 } }, face: { eyes: 'angry', mouth: 'open' } });
    const seq = keyed(7, [[0, ready(c)], [2, chamber], [3, strike, 'hold'], [4, strike], [6, ready(c)]]);
    const bx = [2.0, 1.7, 1.4, 1.1, 1.5, 1.9, 2.2].map((k) => k * L);
    const by = [12, 10, 8, 7, 8, 9, 10].map((k) => k * u);
    return seq.map((p, i) => ({ ...p, props: [ball(bx[i], by[i])] }));
  },
};

export const chilena: AnimDef = {
  name: 'chilena', pack: 'football', fps: 12, loop: false,
  build: (c) => {
    const L = c.L, u = c.u;
    const top = Math.max(3, Math.round(7 * u));
    const crouch = P(c, { torso: 10, legs: feet(c, 0.8, 0.2), arms: { near: { shoulder: -30, elbow: 20 }, far: { shoulder: -30, elbow: 20 } } });
    const leap = P(c, { air: top, torso: -45, legs: { near: { x: 0.3 * L, y: 0.3 * L, toe: 10 }, far: { x: 0.1 * L, y: 0.7 * L, toe: 30 } }, arms: { near: { shoulder: 100, elbow: 10, spread: 50 }, far: { shoulder: 110, elbow: 10, spread: 50 } }, face: { eyes: 'wide', mouth: 'open' } });
    const flip = P(c, { air: top, torso: -110, legs: { near: { x: 0.6 * L, y: -0.75 * L, toe: 0 }, far: { x: 0.45 * L, y: 0.1 * L, toe: 20 } }, arms: { near: { shoulder: 60, elbow: 10, spread: 60 }, far: { shoulder: 80, elbow: 10, spread: 60 } }, face: { eyes: 'angry', mouth: 'open' } });
    const scissor = P(c, { air: top, torso: -120, legs: { near: { x: -0.2 * L, y: -0.9 * L, toe: 0 }, far: { x: 0.7 * L, y: -0.3 * L, toe: 20 } }, arms: { near: { shoulder: 60, elbow: 10, spread: 60 }, far: { shoulder: 70, elbow: 10, spread: 60 } }, face: { eyes: 'angry', mouth: 'open' } });
    const fall = P(c, { air: Math.round(top / 2), torso: -95, legs: { near: { x: 0.5 * L, y: -0.4 * L }, far: { x: 0.7 * L, y: -0.1 * L } }, arms: { near: { shoulder: 40, elbow: 20, spread: 60 }, far: { shoulder: 30, elbow: 20, spread: 60 } } });
    const ground = P(c, { torso: -88, legs: { near: { x: 0.8 * L, y: -0.2 * L }, far: { x: 0.7 * L, y: 0.1 * L } }, arms: { near: { shoulder: 20, elbow: 20 }, far: { shoulder: 10, elbow: 20 } }, face: { eyes: 'happy', mouth: 'smile' } });
    // rueda sobre el centro del cuerpo, no sobre la cadera
    const hc = (c.d.torsoH + c.d.headW * 0.5) * 0.5;
    const seq = [crouch, leap, flip, scissor, scissor, fall, ground, ground].map((p) => ({ ...p, x: p.x - Math.sin((p.torso * Math.PI) / 180) * hc }));
    const bx = [-0.5, -0.3, -0.2, -0.4, -1.0, -1.5, -1.8, -1.8].map((k) => k * L);
    const by = [24, 24, 23, 22, 23, 24, 26, 26].map((k) => k * u);
    return seq.map((p, i) => ({ ...p, props: [ball(bx[i], by[i])] }));
  },
};

export const slide: AnimDef = {
  name: 'slide', pack: 'football', fps: 12, loop: false,
  build: (c) => {
    const L = c.L;
    const drop = P(c, { torso: -25, legs: { near: { x: 0.6 * L, y: 0.6 * L, toe: 0 }, far: { x: -0.2 * L, y: 0.6 * L } }, arms: { near: { shoulder: 60, elbow: 20, spread: 30 }, far: { shoulder: -40, elbow: 10 } }, face: { eyes: 'angry', mouth: 'line' } });
    const sliding = P(c, { torso: -62, legs: { near: { x: 1.0 * L, y: 0.25 * L, toe: -10 }, far: { x: 0.35 * L, y: 0.45 * L, toe: 20 } }, arms: { near: { shoulder: 70, elbow: 20, spread: 30 }, far: { shoulder: -10, elbow: 0 } }, face: { eyes: 'angry', mouth: 'open' } });
    const up = P(c, { torso: -20, legs: { near: { x: 0.6 * L, y: 0.55 * L }, far: { x: 0.1 * L, y: 0.6 * L } }, arms: { near: { shoulder: 30, elbow: 30 }, far: { shoulder: -40, elbow: 0 } } });
    return keyed(8, [[0, ready(c)], [1, drop, 'in'], [2, sliding, 'hold'], [5, sliding], [6, up], [7, ready(c)]]);
  },
};

export const bump: AnimDef = {
  name: 'bump', pack: 'football', fps: 12, loop: false,
  build: (c) => {
    const L = c.L;
    const brace = P(c, { torso: 18, legs: { near: { x: 0.35 * L, y: L - 1 }, far: { x: -0.3 * L, y: L - 0.8 } }, arms: { near: { shoulder: 20, elbow: 100 }, far: { shoulder: -20, elbow: 60 } }, face: { eyes: 'angry', mouth: 'line' } });
    const hitPose = P(c, { torso: 24, x: 1, legs: { near: { x: 0.45 * L, y: L - 1.2 }, far: { x: -0.4 * L, y: L - 0.8 } }, arms: { near: { shoulder: 10, elbow: 110 }, far: { shoulder: -30, elbow: 60 } }, face: { eyes: 'angry', mouth: 'grin' } });
    return keyed(6, [[0, ready(c)], [2, brace], [3, hitPose, 'hold'], [4, hitPose], [5, ready(c)]]);
  },
};

export const stagger: AnimDef = {
  name: 'stagger', pack: 'football', fps: 10, loop: false,
  build: (c) => {
    const L = c.L;
    const a = P(c, { torso: -16, head: { tilt: -10 }, legs: { near: { x: 0.1 * L, y: L - 0.5 }, far: { x: -0.4 * L, y: L - 0.6 } }, arms: { near: { shoulder: 110, elbow: 20, spread: 50 }, far: { shoulder: 70, elbow: 20, spread: 50 } }, face: { eyes: 'wide', mouth: 'o' } });
    const b = P(c, { torso: -8, head: { tilt: 6 }, legs: { near: { x: -0.35 * L, y: L - 0.6 }, far: { x: -0.05 * L, y: L - 0.5 } }, arms: { near: { shoulder: 60, elbow: 30, spread: 50 }, far: { shoulder: 120, elbow: 30, spread: 50 } }, face: { eyes: 'hurt', mouth: 'o' } });
    return keyed(8, [[0, P(c)], [1, a], [3, b], [5, a], [7, P(c, { face: { eyes: 'sad' } })]]);
  },
};

export const tumble: AnimDef = {
  name: 'tumble', pack: 'football', fps: 12, loop: false,
  build: (c) => {
    const L = c.L, u = c.u;
    const out: Pose[] = [];
    const angles = [0, 30, 70, 120, 180, 240, 300, 340, 360, 360];
    angles.forEach((a, i) => {
      const t = a % 360;
      const tuck = i > 0 && i < 8;
      // rueda sobre el centro del cuerpo, no sobre la cadera
      const rad = (t * Math.PI) / 180;
      const hc = (c.d.torsoH + c.d.headW * 0.5) * 0.5;
      out.push(P(c, {
        torso: t,
        x: -Math.sin(rad) * hc,
        air: tuck && i > 2 && i < 7 ? Math.round(1 * u) : 0,
        legs: tuck ? { near: { x: 0.35 * L, y: 0.35 * L, toe: 30 }, far: { x: 0.2 * L, y: 0.4 * L, toe: 30 } } : feet(c, i === 8 ? 0.5 : 0, 0.2),
        arms: tuck ? { near: { shoulder: 60, elbow: 90 }, far: { shoulder: 40, elbow: 90 } } : { near: { shoulder: 20, elbow: 20 }, far: { shoulder: 0, elbow: 20 } },
        face: { eyes: tuck ? 'hurt' : 'wide', mouth: 'o' },
      }));
    });
    return out;
  },
};

export const dance: AnimDef = {
  name: 'dance', pack: 'football', fps: 8, loop: true,
  build: (c) => {
    const L = c.L;
    const out: Pose[] = [];
    for (let i = 0; i < 8; i++) {
      const s = i < 4 ? 1 : -1;
      const beat = i % 2 === 0;
      out.push(P(c, {
        torso: 6 * s,
        head: { tilt: 8 * s, dy: beat ? 0 : 1 },
        legs: beat ? { near: { x: 0.25 * L, y: L - 0.4 }, far: { x: -0.25 * L, y: L - 0.4 } } : { near: { x: 0.15 * L, y: s > 0 ? 0.7 * L : L - 0.8, toe: 20 }, far: { x: -0.15 * L, y: s < 0 ? 0.7 * L : L - 0.8, toe: 20 } },
        arms: {
          near: { shoulder: s > 0 ? 150 : 40, elbow: s > 0 ? 30 : 80, spread: 30 },
          far: { shoulder: s < 0 ? 150 : 40, elbow: s < 0 ? 30 : 80, spread: 30 },
        },
        face: { eyes: 'happy', mouth: beat ? 'grin' : 'smile' },
      }));
    }
    return out;
  },
};

export const lose: AnimDef = {
  name: 'lose', pack: 'football', fps: 6, loop: true,
  build: (c) =>
    [0, 0, 1, 1, 1, 1, 0, 0].map((b, i) => P(c, {
      torso: 10,
      head: { dy: 1 + b, tilt: 6 },
      legs: feet(c, 0.1, 0.18),
      arms: { near: { shoulder: 150, elbow: 120, spread: 30 }, far: { shoulder: 140, elbow: 125, spread: 30 } },
      face: { eyes: i % 4 === 3 ? 'closed' : 'sad', mouth: 'frown' },
    })),
};

export const win: AnimDef = {
  name: 'win', pack: 'football', fps: 8, loop: true,
  build: (c) => {
    const u = c.u;
    return [0, 1, 2, 1, 0, 1, 2, 1].map((h) => P(c, {
      air: Math.round(h * u),
      legs: h ? { near: { x: 0.1 * c.L, y: 0.85 * c.L, toe: 30 }, far: { x: -0.1 * c.L, y: 0.85 * c.L, toe: 30 } } : feet(c, 0.1),
      arms: { near: { shoulder: 165, elbow: 5, spread: 25 }, far: { shoulder: 165, elbow: 5, spread: 25 } },
      face: { eyes: 'happy', mouth: 'grin' },
    }));
  },
};

export const laugh: AnimDef = {
  name: 'laugh', pack: 'football', fps: 10, loop: true,
  build: (c) =>
    [0, 1, 0, 1, 0, 1, 2, 1].map((k, i) => P(c, {
      torso: k === 2 ? -10 : 4 + k * 6,
      head: { dy: k, tilt: k === 2 ? -12 : 4 },
      arms: { near: { shoulder: 25, elbow: 110 }, far: { shoulder: 10, elbow: 100 } },
      face: { eyes: 'happy', mouth: i % 2 ? 'open' : 'grin' },
    })),
};

export const point: AnimDef = {
  name: 'point', pack: 'football', fps: 8, loop: false,
  build: (c) => {
    const pt = P(c, { torso: 4, arms: { near: { shoulder: 100, elbow: 0 }, far: { shoulder: -5, elbow: 15 } }, face: { mouth: 'open' } });
    return keyed(6, [[0, P(c)], [2, pt, 'hold'], [5, pt]]);
  },
};

export const call: AnimDef = {
  name: 'call', pack: 'football', fps: 8, loop: true,
  build: (c) =>
    [0, 1, 0, 1, 0, 1].map((k) => P(c, {
      torso: -4,
      arms: { near: { shoulder: k ? 175 : 150, elbow: k ? 0 : 30, spread: 15 }, far: { shoulder: 0, elbow: 20 } },
      face: { eyes: 'open', mouth: 'open' },
    })),
};

export const clap: AnimDef = {
  name: 'clap', pack: 'football', fps: 10, loop: true,
  build: (c) =>
    [0, 1, 0, 1, 0, 1, 0, 1].map((k) => P(c, {
      arms: { near: { shoulder: 70, elbow: k ? 70 : 40, spread: k ? 0 : 25 }, far: { shoulder: 70, elbow: k ? 75 : 40, spread: k ? 0 : 25 } },
      face: { eyes: 'happy', mouth: 'smile' },
    })),
};

export const goalKnee: AnimDef = {
  name: 'goal_knee', pack: 'football', fps: 10, loop: false,
  build: (c) => {
    const L = c.L;
    const kneel = P(c, {
      torso: -16,
      legs: { near: { x: 0.45 * L, y: 0.5 * L, toe: 0 }, far: { x: -0.55 * L, y: 0.42 * L, toe: 70 } },
      arms: { near: { shoulder: 150, elbow: 10, spread: 40 }, far: { shoulder: 140, elbow: 10, spread: 40 } },
      face: { eyes: 'happy', mouth: 'grin' },
    });
    const roar = P(c, { ...kneel, head: { dx: 0, dy: 0, tilt: -10 }, arms: { near: { shoulder: 120, elbow: 60, spread: 40 }, far: { shoulder: 110, elbow: 60, spread: 40 } }, face: { eyes: 'closed', mouth: 'grin' } });
    return keyed(10, [[0, P(c, { torso: 12, legs: feet(c, 0.6) })], [2, kneel, 'hold'], [5, kneel], [7, roar], [9, kneel]]);
  },
};

export const goalPlane: AnimDef = {
  name: 'goal_plane', pack: 'football', fps: 12, loop: true, hairTrail: -1,
  build: (c) => {
    const base = run.build(c);
    return base.map((p, i) => ({
      ...p,
      torso: 18,
      arms: { near: { shoulder: 80, elbow: 0, spread: 70 }, far: { shoulder: -80, elbow: 0, spread: 70 } },
      head: { ...p.head, tilt: i < 4 ? -6 : 6 },
      face: { eyes: 'happy', mouth: 'grin' },
    }));
  },
};

export const skid: AnimDef = {
  name: 'skid', pack: 'football', fps: 12, loop: false,
  build: (c) => {
    const L = c.L;
    const brake = P(c, { torso: -22, legs: { near: { x: 0.65 * L, y: 0.85 * L, toe: -20 }, far: { x: -0.15 * L, y: 0.65 * L } }, arms: { near: { shoulder: 70, elbow: 20, spread: 40 }, far: { shoulder: 100, elbow: 20, spread: 40 } }, face: { eyes: 'wide', mouth: 'line' } });
    return keyed(6, [[0, run.build(c)[0]], [1, brake, 'hold'], [3, brake], [5, ready(c)]]);
  },
};

export const power: AnimDef = {
  name: 'power', pack: 'football', fps: 12, loop: true,
  build: (c) =>
    [0, 1, 0, -1, 0, 1, 0, -1].map((k) => P(c, {
      x: k * 0.5,
      torso: 12,
      legs: feet(c, 0.6, 0.26),
      arms: { near: { shoulder: -20, elbow: 100 }, far: { shoulder: -15, elbow: 100 } },
      face: { eyes: 'angry', mouth: 'grin' },
    })),
};

// ---------- portero ----------

export const keeperReady: AnimDef = {
  name: 'keeper_ready', pack: 'keeper', fps: 8, loop: true, steady: true, views: ['side', 'front'],
  build: (c) =>
    [0, 0, 1, 1, 0, 0, 1, 1].map((b) => P(c, {
      torso: 16,
      legs: { near: { x: 0.3 * c.L, y: c.L * 0.8 + b * 0.3, z: 1 }, far: { x: -0.3 * c.L, y: c.L * 0.8 + b * 0.3, z: 1 } },
      arms: { near: { shoulder: 50, elbow: 40, spread: 45 }, far: { shoulder: 40, elbow: 40, spread: 45 } },
    })),
};

export const keeperDive: AnimDef = {
  name: 'keeper_dive', pack: 'keeper', fps: 12, loop: false,
  build: (c) => {
    const L = c.L, u = c.u;
    const top = Math.max(3, Math.round(6 * u));
    const load = P(c, { torso: 20, legs: feet(c, 0.8, 0.25), arms: { near: { shoulder: 40, elbow: 40, spread: 40 }, far: { shoulder: 30, elbow: 40, spread: 40 } } });
    const stretch = P(c, { air: top, torso: 70, legs: { near: { x: -0.7 * L, y: 0.2 * L, toe: 60 }, far: { x: -0.8 * L, y: 0.45 * L, toe: 60 } }, arms: { near: { shoulder: 175, elbow: 0 }, far: { shoulder: 170, elbow: 0 } }, face: { eyes: 'wide', mouth: 'open' } });
    const save = P(c, { ...stretch, air: Math.round(top * 0.6), arms: { near: { shoulder: 165, elbow: 20 }, far: { shoulder: 160, elbow: 25 } }, face: { eyes: 'angry', mouth: 'grin' } });
    const ground = P(c, { torso: 85, legs: { near: { x: -0.9 * L, y: 0, toe: 80 }, far: { x: -0.8 * L, y: 0.2 * L, toe: 80 } }, arms: { near: { shoulder: 160, elbow: 40 }, far: { shoulder: 150, elbow: 45 } }, face: { eyes: 'closed', mouth: 'grin' } });
    const seq = [load, stretch, stretch, save, ground, ground];
    const bx = [2.2, 2.0, 1.9, 1.7, 1.6, 1.6].map((k) => k * L);
    const by = [10, 10, 10, 8, 3, 3].map((k) => k * u);
    return seq.map((p, i) => ({ ...p, props: i >= 3 ? [{ kind: 'soccer', at: 'handNear', x: 0, y: 0 }] : [{ kind: 'soccer', at: 'ground', x: bx[i], y: by[i] }] }));
  },
};

export const keeperCatch: AnimDef = {
  name: 'keeper_catch', pack: 'keeper', fps: 10, loop: false,
  build: (c) => {
    const L = c.L, u = c.u;
    const top = Math.max(2, Math.round(4 * u));
    const up = P(c, { air: top, legs: { near: { x: 0.1 * L, y: 0.85 * L, toe: 40 }, far: { x: -0.1 * L, y: 0.85 * L, toe: 40 } }, arms: { near: { shoulder: 160, elbow: 20 }, far: { shoulder: 155, elbow: 25 } }, face: { eyes: 'wide', mouth: 'open' } });
    const hug = P(c, { torso: 10, legs: feet(c, 0.3), arms: { near: { shoulder: 60, elbow: 90 }, far: { shoulder: 50, elbow: 95 } }, face: { eyes: 'happy', mouth: 'smile' } });
    const seq = [keeperReady.build(c)[0], up, up, hug, hug, hug];
    const hand: PropState = { kind: 'soccer', at: 'handNear', x: 1, y: -2 * u };
    return seq.map((p, i) => ({ ...p, props: i === 0 ? [{ kind: 'soccer', at: 'ground', x: 2 * L, y: 14 * u }] : i < 3 ? [hand] : [{ kind: 'soccer', at: 'handNear', x: 0, y: 0 }] }));
  },
};

export const FOOTBALL: AnimDef[] = [
  readyAnim, trap, pass, chip, shot, header, volley, chilena, slide, bump, stagger, tumble, dance, lose, win, laugh, point, call, clap,
  goalKnee, goalPlane, skid, power, keeperReady, keeperDive, keeperCatch,
];

// para el preajuste del juego también cuentan las básicas
export const FOOTBALL_SHARED = { idle, walk, run, jumpTakeoff, jumpRise, jumpApex, jumpFall, land, celebrate, sad };
void TAU;
