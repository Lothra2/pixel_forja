import { type Pose, keyed } from '../rig/pose';
import { type AnimDef, type Ctx, P, TAU, feet, hipY } from './types';

/**
 * Animaciones básicas. Caminar y correr son ciclos procedurales: se calculan con fórmulas
 * que dependen del largo de la pierna y de la contextura. Lo demás son poses clave interpoladas.
 */

/** Trayectoria de un pie en un ciclo: apoyo pegado al piso y vuelo en arco. */
function cycleFoot(p: number, stance: number, S: number, lift: number, hip: (p: number) => number, back = 0) {
  p = ((p % 1) + 1) % 1;
  if (p < stance) {
    const q = p / stance;
    return { x: S - 2 * S * q, y: hip(p), toe: 0 };
  }
  const q = (p - stance) / (1 - stance);
  const e = q < 0.5 ? 2 * q * q : 1 - 2 * (1 - q) * (1 - q);
  return { x: -S + 2 * S * e - back * Math.sin(Math.PI * q), y: hip(p) - lift * Math.pow(Math.sin(Math.PI * q), 0.8), toe: q < 0.3 ? 25 : 0 };
}

export const idle: AnimDef = {
  name: 'idle', pack: 'basic', fps: 6, loop: true, steady: true, views: ['side', 'front', 'back'],
  build: (c) => {
    const breath = [0, 0, 0, 1, 1, 1, 1, 0];
    return breath.map((b, i) => {
      const sway = Math.sin((i / 8) * TAU) * 3;
      return P(c, {
        head: { dy: b },
        arms: { near: { shoulder: -4 + sway, elbow: 10 }, far: { shoulder: 4 - sway, elbow: 10 } },
        face: { eyes: i === 6 ? 'closed' : 'open' },
      });
    });
  },
};

export const walk: AnimDef = {
  name: 'walk', pack: 'basic', fps: 10, loop: true, steady: true, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L;
    const S = (0.36 * L) / Math.max(0.8, c.build);
    const lift = 0.28 * L;
    const low = L - 1.0, high = L - 0.1;
    const hip = (p: number) => low + (high - low) * (1 - Math.cos(2 * TAU * p)) / 2;
    const out: Pose[] = [];
    for (let i = 0; i < 8; i++) {
      const p = i / 8;
      const swing = Math.cos(TAU * p);
      const prev = Math.round(hip(p - 1 / 8));
      out.push(P(c, {
        torso: 4,
        head: { dy: Math.round(hip(p)) - prev },
        legs: { near: cycleFoot(p, 0.5, S, lift, hip), far: cycleFoot(p + 0.5, 0.5, S, lift, hip) },
        arms: {
          near: { shoulder: -30 * swing, elbow: 18 + Math.max(0, -swing) * 25 },
          far: { shoulder: 30 * swing, elbow: 18 + Math.max(0, swing) * 25 },
        },
      }));
    }
    return out;
  },
};

export const run: AnimDef = {
  name: 'run', pack: 'basic', fps: 14, loop: true, steady: true, hairTrail: -1, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L;
    const heavy = Math.max(0.8, c.build);
    const S = (0.5 * L) / heavy;
    const lift = (0.5 * L) / heavy;
    const low = L - 1.2, high = L - 0.6;
    const hip = (p: number) => low + (high - low) * (1 - Math.cos(2 * TAU * p)) / 2;
    const flight = Math.max(1, Math.round(c.u / heavy));
    const out: Pose[] = [];
    for (let i = 0; i < 8; i++) {
      const p = i / 8;
      const swing = Math.cos(TAU * p);
      const air = i === 3 || i === 7 ? flight : 0;
      out.push(P(c, {
        torso: 10,
        legs: { near: cycleFoot(p, 0.36, S, lift, hip, 0.25 * L), far: cycleFoot(p + 0.5, 0.36, S, lift, hip, 0.25 * L) },
        arms: {
          near: { shoulder: -55 * swing, elbow: 85 },
          far: { shoulder: 55 * swing, elbow: 85 },
        },
        face: { mouth: 'open' },
        air,
      }));
    }
    return out;
  },
};

// ---------- salto, en partes (el juego las encadena) ----------

function jumpKeys(c: Ctx) {
  const u = c.u, L = c.L;
  const crouch = P(c, { torso: 18, legs: feet(c, 0.9, 0.2), arms: { near: { shoulder: -50, elbow: 20 }, far: { shoulder: -40, elbow: 20 } } });
  const push = P(c, { torso: 5, legs: { near: { x: 0.1 * L, y: L - 0.1, toe: 45 }, far: { x: -0.15 * L, y: L - 0.1, toe: 45 } }, arms: { near: { shoulder: 150, elbow: 20 }, far: { shoulder: 140, elbow: 20 } } });
  const rise = (air: number) => P(c, { air, torso: 0, legs: { near: { x: 0.1 * L, y: 0.85 * L, toe: 40 }, far: { x: -0.2 * L, y: 0.8 * L, toe: 50 } }, arms: { near: { shoulder: 160, elbow: 15 }, far: { shoulder: 150, elbow: 15 } }, face: { mouth: 'open' } });
  const apex = (air: number) => P(c, { air, torso: -4, legs: { near: { x: 0.35 * L, y: 0.6 * L, toe: 20 }, far: { x: 0.05 * L, y: 0.55 * L, toe: 30 } }, arms: { near: { shoulder: 120, elbow: 30, spread: 30 }, far: { shoulder: 100, elbow: 30, spread: 30 } }, face: { mouth: 'open' } });
  const fall = (air: number) => P(c, { air, torso: 4, legs: { near: { x: 0.2 * L, y: 0.85 * L, toe: 15 }, far: { x: -0.1 * L, y: 0.9 * L, toe: 15 } }, arms: { near: { shoulder: 140, elbow: 20, spread: 30 }, far: { shoulder: 130, elbow: 20, spread: 30 } } });
  const impact = P(c, { torso: 20, legs: feet(c, 1, 0.22), arms: { near: { shoulder: 50, elbow: 30 }, far: { shoulder: 40, elbow: 30 } }, head: { dy: 1 } });
  const recover = P(c, { torso: 8, legs: feet(c, 0.4, 0.2), arms: { near: { shoulder: 20, elbow: 20 }, far: { shoulder: 10, elbow: 20 } } });
  const top = Math.max(3, Math.round(6 * u));
  return { crouch, push, rise, apex, fall, impact, recover, top, stand: P(c) };
}

export const jumpTakeoff: AnimDef = {
  name: 'jump_takeoff', pack: 'basic', fps: 12, loop: false,
  build: (c) => { const k = jumpKeys(c); return [k.stand, k.crouch, k.push]; },
};
export const jumpRise: AnimDef = {
  name: 'jump_rise', pack: 'basic', fps: 12, loop: false,
  build: (c) => { const k = jumpKeys(c); return [k.rise(Math.round(k.top * 0.45)), k.rise(Math.round(k.top * 0.8))]; },
};
export const jumpApex: AnimDef = {
  name: 'jump_apex', pack: 'basic', fps: 10, loop: true,
  build: (c) => { const k = jumpKeys(c); return [k.apex(k.top), k.apex(k.top)]; },
};
export const jumpFall: AnimDef = {
  name: 'jump_fall', pack: 'basic', fps: 12, loop: true,
  build: (c) => { const k = jumpKeys(c); return [k.fall(Math.round(k.top * 0.7)), k.fall(Math.round(k.top * 0.35))]; },
};
export const land: AnimDef = {
  name: 'land', pack: 'basic', fps: 12, loop: false,
  build: (c) => { const k = jumpKeys(c); return [k.impact, k.recover, k.stand]; },
};
export const jump: AnimDef = {
  name: 'jump', pack: 'basic', fps: 12, loop: false,
  build: (c) => {
    const k = jumpKeys(c);
    return [k.crouch, k.push, k.rise(Math.round(k.top * 0.45)), k.rise(Math.round(k.top * 0.8)), k.apex(k.top), k.apex(k.top), k.fall(Math.round(k.top * 0.7)), k.fall(Math.round(k.top * 0.35)), k.impact, k.recover];
  },
};

// ---------- reacciones y emociones ----------

export const hit: AnimDef = {
  name: 'hit', pack: 'basic', fps: 12, loop: false,
  build: (c) => {
    const L = c.L;
    const hurt = P(c, { torso: -14, head: { dx: -1, tilt: -10 }, legs: { near: { x: 0.25 * L, y: L - 0.6 }, far: { x: -0.35 * L, y: L - 0.4 } }, arms: { near: { shoulder: 40, elbow: 40, spread: 25 }, far: { shoulder: 60, elbow: 30, spread: 25 } }, face: { eyes: 'hurt', mouth: 'o' } });
    const back = P(c, { torso: -8, legs: feet(c, 0.3, 0.25), arms: { near: { shoulder: 20, elbow: 30 }, far: { shoulder: 10, elbow: 30 } }, face: { eyes: 'hurt', mouth: 'frown' } });
    return [hurt, hurt, back, back, P(c, { face: { eyes: 'sad' } })];
  },
};

export const fallGetUp: AnimDef = {
  name: 'fall_getup', pack: 'basic', fps: 10, loop: false,
  build: (c) => {
    const L = c.L;
    const tip = P(c, { torso: -30, legs: { near: { x: 0.5 * L, y: 0.8 * L, toe: 20 }, far: { x: 0.3 * L, y: 0.9 * L } }, arms: { near: { shoulder: 110, elbow: 20, spread: 30 }, far: { shoulder: 120, elbow: 20, spread: 30 } }, face: { eyes: 'wide', mouth: 'o' } });
    const down = P(c, { torso: -85, x: 0.6 * L, legs: { near: { x: 0.9 * L, y: -0.2 * L, toe: 0 }, far: { x: 0.7 * L, y: 0.1 * L } }, arms: { near: { shoulder: 160, elbow: 10 }, far: { shoulder: 170, elbow: 10 } }, face: { eyes: 'hurt', mouth: 'frown' } });
    const sit = P(c, { torso: -20, x: 0.3 * L, legs: { near: { x: 0.8 * L, y: 0.3 * L }, far: { x: 0.5 * L, y: 0.35 * L } }, arms: { near: { shoulder: -30, elbow: 0 }, far: { shoulder: -40, elbow: 0 } }, face: { eyes: 'closed', mouth: 'line' } });
    const kneel = P(c, { torso: 15, legs: { near: { x: 0.4 * L, y: 0.6 * L }, far: { x: -0.6 * L, y: 0.45 * L, toe: 60 } }, arms: { near: { shoulder: 40, elbow: 40 }, far: { shoulder: 10, elbow: 30 } } });
    return keyed(12, [[0, P(c)], [1, tip, 'in'], [3, down, 'hold'], [5, down], [7, sit], [9, kneel], [11, P(c)]]);
  },
};

export const celebrate: AnimDef = {
  name: 'celebrate', pack: 'basic', fps: 10, loop: true, views: ['side', 'front', 'back'],
  build: (c) => {
    const u = c.u;
    const out: Pose[] = [];
    for (let i = 0; i < 8; i++) {
      const up = i % 4 < 2;
      const air = i % 4 === 1 ? Math.max(1, Math.round(3 * u)) : i % 4 === 0 ? Math.max(1, Math.round(1.5 * u)) : 0;
      out.push(P(c, {
        air,
        legs: air ? { near: { x: 0.2 * c.L, y: 0.85 * c.L, toe: 30 }, far: { x: -0.15 * c.L, y: 0.8 * c.L, toe: 40 } } : feet(c, 0.25),
        // de lado los brazos arriba quedan tapados por la cabeza: puño al frente, que se lee mejor
        arms: c.view === 'side'
          ? { near: { shoulder: up ? 95 : 70, elbow: up ? 80 : 95 }, far: { shoulder: up ? -25 : -10, elbow: 40 } }
          : {
            near: { shoulder: up ? 170 : 150, elbow: up ? 5 : 40, spread: 20 },
            far: { shoulder: up ? 160 : 170, elbow: up ? 40 : 5, spread: 20 },
          },
        face: { eyes: 'happy', mouth: 'grin' },
      }));
    }
    return out;
  },
};

export const sad: AnimDef = {
  name: 'sad', pack: 'basic', fps: 5, loop: true, steady: true, views: ['side', 'front', 'back'],
  build: (c) =>
    [0, 0, 1, 1, 1, 1, 0, 0].map((b, i) => P(c, {
      torso: 8,
      head: { dy: 1 + b, tilt: 8 },
      arms: { near: { shoulder: 5, elbow: 5 }, far: { shoulder: -5, elbow: 5 } },
      face: { eyes: i === 5 ? 'closed' : 'sad', mouth: 'frown' },
    })),
};

export const crawl: AnimDef = {
  name: 'crawl', pack: 'basic', fps: 8, loop: true,
  build: (c) => {
    const L = c.L;
    const out: Pose[] = [];
    for (let i = 0; i < 8; i++) {
      const s = Math.sin((i / 8) * TAU);
      const lift = (v: number) => Math.max(0, v) * 0.12 * L;
      // a gatas: rodillas y manos en el piso, la cabeza derecha mirando al frente
      out.push(P(c, {
        torso: 62,
        x: -0.6 * L,
        head: { tilt: -56 },
        legs: { near: { x: -0.15 * L + s * 0.14 * L, y: 0.5 * L - lift(-s), toe: 75 }, far: { x: -0.15 * L - s * 0.14 * L, y: 0.5 * L - lift(s), toe: 75 } },
        arms: { near: { shoulder: 66 + 16 * s, elbow: -8 }, far: { shoulder: 66 - 16 * s, elbow: -8 } },
      }));
    }
    return out;
  },
};

export const swim: AnimDef = {
  name: 'swim', pack: 'swim', fps: 10, loop: true,
  build: (c) => {
    const L = c.L;
    const out: Pose[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * 360;
      const kick = Math.sin((i / 8) * TAU * 2);
      out.push(P(c, {
        torso: 84,
        x: -0.5 * L,
        head: { tilt: -50 + (i < 4 ? 10 : 0) },
        legs: { near: { x: -0.95 * L, y: 0.15 * L + kick * 0.15 * L, toe: 80 }, far: { x: -0.95 * L, y: 0.15 * L - kick * 0.15 * L, toe: 80 } },
        arms: { near: { shoulder: 180 - a, elbow: 15 }, far: { shoulder: 0 - a, elbow: 15 } },
        face: { mouth: i % 4 === 0 ? 'o' : 'line' },
      }));
    }
    return out;
  },
};

export const BASIC: AnimDef[] = [idle, walk, run, jumpTakeoff, jumpRise, jumpApex, jumpFall, land, jump, hit, fallGetUp, celebrate, sad, crawl];

export { hipY };
