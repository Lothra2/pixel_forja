import { type AnimalDims, type QPose, type QFoot, standQ } from '../rig/animal';
import { merge, type DeepPartial } from '../rig/pose';
import type { AnimEvent } from './types';

/**
 * Animaciones de cuatro patas. Los andares son ciclos con la fase de cada pata:
 * paso (4 tiempos), trote (diagonales juntas) y galope (con vuelo).
 */
export interface AnimalAnimDef {
  name: string;
  fps: number;
  loop: boolean;
  steady?: boolean;
  /** premium: pisadas, mordida (impacto), ladrido (suelta), saltos */
  events?: AnimEvent[];
  /** premium: pixeles de celda que avanza el cuerpo en un ciclo (la pata apoyada no patina) */
  stride?: (d: AnimalDims) => number;
  /**
   * Saltos a un muro: entre qué alturas de muro se ve bien, como fracción de la subida dibujada. El kit exporta
   * `subida` (0 a 1 por cuadro), `muro_min` y `muro_max` en pixeles, para que el juego lo ajuste a cada muro
   */
  muro?: { min: number; max: number };
  build: (d: AnimalDims) => QPose[];
}

const TAU = Math.PI * 2;
const Q = (d: AnimalDims, ...p: DeepPartial<QPose>[]) => merge(standQ(d), ...p);

function gaitFoot(p: number, stance: number, S: number, lift: number, h: number): QFoot {
  p = ((p % 1) + 1) % 1;
  if (p < stance) return { x: S - (2 * S * p) / stance, y: h };
  const q = (p - stance) / (1 - stance);
  return { x: -S + 2 * S * q, y: h - lift * Math.sin(Math.PI * q) };
}

function gait(d: AnimalDims, phases: { fn: number; ff: number; rn: number; rf: number }, stance: number, strideK: number, liftK: number, frames = 8, extra?: (i: number) => DeepPartial<QPose>): QPose[] {
  const L = d.legUpper + d.legLower;
  const S = strideK * L, lift = liftK * L;
  const out: QPose[] = [];
  for (let i = 0; i < frames; i++) {
    const p = i / frames;
    const h = L - 0.4 - 0.4 * (1 - Math.cos(2 * TAU * p)) / 2;
    out.push(Q(d, {
      legs: {
        fn: gaitFoot(p + phases.fn, stance, S, lift, h), ff: gaitFoot(p + phases.ff, stance, S, lift, h),
        rn: gaitFoot(p + phases.rn, stance, S, lift, h), rf: gaitFoot(p + phases.rf, stance, S, lift, h),
      },
      tail: 25 + Math.sin(p * TAU * 2) * 12,
    }, extra ? extra(i) : {}));
  }
  return out;
}

export const A_IDLE: AnimalAnimDef = {
  name: 'idle', fps: 6, loop: true, steady: true,
  build: (d) => [0, 0, 1, 1, 1, 1, 0, 0].map((b, i) => Q(d, {
    head: { dy: b }, tail: 25 + (i % 4 < 2 ? 8 : -4), eyes: i === 6 ? 'closed' : 'open',
  })),
};

export const A_WALK: AnimalAnimDef = {
  name: 'walk', fps: 8, loop: true, steady: true,
  build: (d) => gait(d, { rf: 0, ff: 0.25, rn: 0.5, fn: 0.75 }, 0.62, 0.32, 0.3),
};

export const A_TROT: AnimalAnimDef = {
  name: 'trot', fps: 10, loop: true, steady: true,
  build: (d) => gait(d, { fn: 0, rf: 0, ff: 0.5, rn: 0.5 }, 0.5, 0.4, 0.4, 8, () => ({ mouth: 'tongue' })),
};

export const A_RUN: AnimalAnimDef = {
  name: 'run', fps: 14, loop: true,
  build: (d) => {
    const L = d.legUpper + d.legLower;
    const out: QPose[] = [];
    // galope: atrás juntas empujan, adelante juntas reciben; el lomo se estira y se encoge
    const rearX = [-0.2, -0.5, -0.7, -0.3, 0.4, 0.7, 0.6, 0.2];
    const rearY = [1, 1, 0.85, 0.7, 0.65, 0.8, 1, 1];
    const frontX = [0.6, 0.2, -0.3, -0.6, -0.4, 0.3, 0.8, 0.9];
    const frontY = [1, 1, 1, 0.8, 0.65, 0.65, 0.8, 0.95];
    const air = [0, 0, 0, 1, 1, 0, 0, 0];
    for (let i = 0; i < 8; i++) {
      out.push(Q(d, {
        pitch: [2, 0, -3, -5, -2, 3, 5, 4][i],
        legs: {
          rn: { x: rearX[i] * L * 0.6, y: rearY[i] * (L - 0.5) }, rf: { x: rearX[(i + 1) % 8] * L * 0.6, y: rearY[(i + 1) % 8] * (L - 0.5) },
          fn: { x: frontX[i] * L * 0.6, y: frontY[i] * (L - 0.5) }, ff: { x: frontX[(i + 1) % 8] * L * 0.6, y: frontY[(i + 1) % 8] * (L - 0.5) },
        },
        air: air[i] ? Math.max(1, Math.round(2 * d.u)) : 0,
        tail: 10, mouth: 'tongue', head: { angle: 6 },
      }));
    }
    return out;
  },
};

export const A_JUMP: AnimalAnimDef = {
  name: 'jump', fps: 12, loop: false,
  build: (d) => {
    const L = d.legUpper + d.legLower;
    const top = Math.max(3, Math.round(7 * d.u));
    const crouch = Q(d, { pitch: 6, legs: { rn: { x: 0.3 * L, y: 0.6 * L }, rf: { x: 0.2 * L, y: 0.6 * L }, fn: { x: 0, y: 0.7 * L }, ff: { x: -0.1 * L, y: 0.7 * L } }, tail: 10 });
    const launch = Q(d, { pitch: -22, air: Math.round(top / 2), legs: { rn: { x: -0.6 * L, y: 0.8 * L }, rf: { x: -0.7 * L, y: 0.75 * L }, fn: { x: 0.5 * L, y: 0.5 * L }, ff: { x: 0.4 * L, y: 0.5 * L } }, tail: 40 });
    const fly = Q(d, { pitch: 0, air: top, legs: { rn: { x: -0.7 * L, y: 0.55 * L }, rf: { x: -0.8 * L, y: 0.5 * L }, fn: { x: 0.8 * L, y: 0.5 * L }, ff: { x: 0.7 * L, y: 0.55 * L } }, tail: 30, mouth: 'open', eyes: 'happy' });
    const fall = Q(d, { pitch: 18, air: Math.round(top / 2), legs: { rn: { x: -0.4 * L, y: 0.6 * L }, rf: { x: -0.5 * L, y: 0.55 * L }, fn: { x: 0.4 * L, y: L - 0.5 }, ff: { x: 0.3 * L, y: L - 0.5 } }, tail: 45 });
    const landP = Q(d, { pitch: 8, legs: { rn: { x: 0, y: 0.75 * L }, rf: { x: -0.1 * L, y: 0.75 * L }, fn: { x: 0.2 * L, y: 0.7 * L }, ff: { x: 0.1 * L, y: 0.7 * L } }, tail: 20 });
    return [standQ(d), crouch, launch, fly, fly, fall, landP, standQ(d)];
  },
};

export const A_SIT: AnimalAnimDef = {
  name: 'sit', fps: 6, loop: true, steady: true,
  build: (d) => {
    const L = d.legUpper + d.legLower;
    const sit = (b: number, i: number) => Q(d, {
      pitch: -32,
      legs: { rn: { x: 0.55 * L, y: 0.15 * L }, rf: { x: 0.45 * L, y: 0.15 * L }, fn: { x: 0.25 * L, y: L - 0.2 }, ff: { x: 0.05 * L, y: L - 0.2 } },
      head: { angle: 28, dy: b }, tail: -10, eyes: i === 5 ? 'closed' : 'open',
    });
    return [0, 0, 1, 1, 1, 1, 0, 0].map(sit);
  },
};

export const A_LIE: AnimalAnimDef = {
  name: 'lie', fps: 5, loop: true, steady: true,
  build: (d) => {
    const L = d.legUpper + d.legLower;
    return [0, 0, 0, 1, 1, 1, 0, 0].map((b, i) => Q(d, {
      legs: { fn: { x: 0.9 * L, y: 0.15 * L }, ff: { x: 0.75 * L, y: 0.15 * L }, rn: { x: 0.5 * L, y: 0.12 * L }, rf: { x: 0.35 * L, y: 0.12 * L } },
      head: { angle: 12, dy: b }, tail: -5, eyes: i >= 4 && i <= 6 ? 'closed' : 'open',
    }));
  },
};

export const A_WAG: AnimalAnimDef = {
  name: 'wag', fps: 12, loop: true,
  build: (d) => [0, 1, 2, 1, 0, 1, 2, 1].map((k, i) => Q(d, {
    x: k === 2 ? 0.5 : 0, tail: [55, 30, 5, 30, 55, 30, 5, 30][i], mouth: 'tongue', eyes: 'happy', head: { angle: -6 },
  })),
};

export const A_CELEBRATE: AnimalAnimDef = {
  name: 'celebrate', fps: 10, loop: true,
  build: (d) => {
    const L = d.legUpper + d.legLower;
    const bow = Q(d, { pitch: 20, legs: { fn: { x: 0.6 * L, y: 0.35 * L }, ff: { x: 0.5 * L, y: 0.35 * L }, rn: { x: 0, y: L - 0.3 }, rf: { x: -0.1 * L, y: L - 0.3 } }, tail: 60, mouth: 'tongue', eyes: 'happy', head: { angle: -20 } });
    const hop = Q(d, { pitch: -14, air: Math.max(2, Math.round(3 * d.u)), legs: { fn: { x: 0.4 * L, y: 0.55 * L }, ff: { x: 0.3 * L, y: 0.6 * L }, rn: { x: -0.2 * L, y: 0.85 * L }, rf: { x: -0.3 * L, y: 0.85 * L } }, tail: 45, mouth: 'open', eyes: 'happy' });
    return [bow, bow, Q(d, { tail: 50, mouth: 'tongue', eyes: 'happy' }), hop, hop, Q(d, { tail: 30, mouth: 'tongue', eyes: 'happy' }), bow, bow];
  },
};

export const A_FETCH: AnimalAnimDef = {
  name: 'fetch', fps: 14, loop: true,
  build: (d) => A_RUN.build(d).map((p) => ({ ...p, ball: true, mouth: 'closed' as const })),
};

// ---------- mascota de RPG: atacar, ladrar, aullar (escudo), recoger botín, golpe y caída ----------

/** Mordida: se agacha, se lanza con la boca abierta y vuelve. */
export const A_BITE: AnimalAnimDef = {
  name: 'bite', fps: 14, loop: false,
  build: (d) => {
    const L = d.legUpper + d.legLower;
    const crouch = Q(d, { pitch: 8, x: -1, legs: { rn: { x: 0.4 * L, y: 0.7 * L }, rf: { x: 0.3 * L, y: 0.7 * L }, fn: { x: 0.1 * L, y: 0.75 * L }, ff: { x: 0, y: 0.75 * L } }, tail: 5, head: { angle: 8 } });
    const lunge = Q(d, { pitch: -6, x: 3, air: 1, legs: { rn: { x: -0.6 * L, y: 0.85 * L }, rf: { x: -0.7 * L, y: 0.8 * L }, fn: { x: 0.6 * L, y: 0.7 * L }, ff: { x: 0.5 * L, y: 0.75 * L } }, mouth: 'open', tail: 20, head: { angle: -10, dx: 1 } });
    const snap = Q(d, { pitch: 4, x: 3, legs: { rn: { x: -0.3 * L, y: L - 0.3 }, rf: { x: -0.4 * L, y: L - 0.3 }, fn: { x: 0.5 * L, y: L - 0.3 }, ff: { x: 0.4 * L, y: L - 0.3 } }, mouth: 'closed', tail: 15, head: { angle: 12, dx: 1 } });
    return [standQ(d), crouch, crouch, lunge, snap, snap, Q(d, { x: 1, tail: 20 }), standQ(d)];
  },
};

/** Ladrido: la cabeza sube y la boca se abre dos veces. */
export const A_BARK: AnimalAnimDef = {
  name: 'bark', fps: 10, loop: true,
  build: (d) => [0, 1, 0, 1, 0, 0].map((open, i) => Q(d, {
    pitch: open ? -4 : 0, head: { angle: open ? -14 : -4, dy: open ? -1 : 0 }, mouth: open ? 'open' : 'closed', tail: 35 + (i % 2) * 15,
  })),
};

/** Aullido: se sienta, levanta la cabeza y aúlla (para dar el escudo a su dueño). */
export const A_HOWL: AnimalAnimDef = {
  name: 'howl', fps: 8, loop: false,
  build: (d) => {
    const L = d.legUpper + d.legLower;
    const sit = (head: number, mouth: QPose['mouth'], eyes: QPose['eyes']) => Q(d, {
      pitch: -30, legs: { rn: { x: 0.55 * L, y: 0.15 * L }, rf: { x: 0.45 * L, y: 0.15 * L }, fn: { x: 0.25 * L, y: L - 0.2 }, ff: { x: 0.05 * L, y: L - 0.2 } },
      head: { angle: head, dy: 0 }, tail: -5, mouth, eyes,
    });
    return [standQ(d), sit(10, 'closed', 'open'), sit(-20, 'closed', 'open'), sit(-45, 'open', 'closed'), sit(-50, 'open', 'closed'), sit(-50, 'open', 'closed'), sit(-30, 'closed', 'happy'), sit(0, 'tongue', 'happy')];
  },
};

/** Recoger botín: baja la cabeza al piso y sube con la moneda en la boca. */
export const A_PICKUP: AnimalAnimDef = {
  name: 'pickup', fps: 10, loop: false,
  build: (d) => {
    const L = d.legUpper + d.legLower;
    const down = (coin: boolean) => Q(d, { pitch: 16, legs: { fn: { x: 0.35 * L, y: 0.62 * L }, ff: { x: 0.25 * L, y: 0.62 * L }, rn: { x: 0, y: L - 0.3 }, rf: { x: -0.1 * L, y: L - 0.3 } }, head: { angle: 30, dy: 2 }, tail: 40, coin });
    return [standQ(d), down(false), down(false), down(true), Q(d, { coin: true, head: { angle: -6 }, tail: 50, eyes: 'happy' }), Q(d, { coin: true, head: { angle: -6 }, tail: 20, eyes: 'happy' }), Q(d, { coin: true, tail: 50, eyes: 'happy' }), Q(d, { coin: true, tail: 30 })];
  },
};

/** Golpe recibido: retrocede y cierra los ojos. */
export const A_HURT: AnimalAnimDef = {
  name: 'hurt', fps: 12, loop: false,
  build: (d) => [Q(d, { x: -2, pitch: -6, eyes: 'closed', mouth: 'open', tail: 5, head: { angle: -12 } }), Q(d, { x: -3, pitch: -4, eyes: 'closed', tail: 0 }), Q(d, { x: -1, eyes: 'open', tail: 10 }), standQ(d)],
};

/** Cae rendido (se acuesta y no se levanta). */
export const A_DIE: AnimalAnimDef = {
  name: 'die', fps: 8, loop: false,
  build: (d) => {
    const L = d.legUpper + d.legLower;
    const lie = (b: number, eyes: QPose['eyes']) => Q(d, {
      legs: { fn: { x: 0.9 * L, y: 0.15 * L }, ff: { x: 0.75 * L, y: 0.15 * L }, rn: { x: 0.5 * L, y: 0.12 * L }, rf: { x: 0.35 * L, y: 0.12 * L } },
      head: { angle: 30 + b, dy: 2 }, tail: -20, eyes,
    });
    return [A_HURT.build(d)[0], Q(d, { pitch: 12, eyes: 'closed', tail: -10, legs: { fn: { x: 0.5 * L, y: 0.5 * L }, ff: { x: 0.4 * L, y: 0.5 * L }, rn: { x: 0, y: L - 0.5 }, rf: { x: -0.1 * L, y: L - 0.5 } } }), lie(0, 'closed'), lie(6, 'closed'), lie(6, 'closed')];
  },
};

/** Cava: agachado adelante, las patas de adelante rascan la tierra una y otra (en bucle) y la cola feliz arriba. */
export const A_DIG: AnimalAnimDef = {
  name: 'dig', fps: 10, loop: true,
  build: (d) => {
    const L = d.legUpper + d.legLower;
    return [0, 1, 2, 3, 4, 5].map((i) => {
      const p = (i / 6) * TAU;
      // cada pata delantera va adelante pegada al piso y vuelve hacia atrás levantada (tira la tierra)
      const scratch = (ph: number): QFoot => ({ x: 0.2 * L + Math.cos(p + ph) * 0.38 * L, y: 0.68 * L - Math.max(0, -Math.sin(p + ph)) * 0.22 * L });
      return Q(d, {
        pitch: 14, legs: { fn: scratch(0), ff: scratch(Math.PI), rn: { x: 0.1 * L, y: L - 0.3 }, rf: { x: -0.1 * L, y: L - 0.3 } },
        head: { angle: 24, dy: 2 }, tail: 45 + Math.sin(p * 2) * 12, mouth: i % 3 === 0 ? 'tongue' : 'closed',
      });
    });
  },
};

/**
 * Dormir enroscado (lote C7): echado bien bajo, la cabeza apoyada sobre las patas de adelante, los ojos cerrados y la
 * cola enrollada hacia adelante, alrededor del cuerpo. El lomo sube y baja despacio. Se lee dormido desde lejos;
 * la "Z" la pone el juego.
 */
export const A_SLEEP: AnimalAnimDef = {
  name: 'sleep', fps: 4, loop: true,
  build: (d) => {
    const L = d.legUpper + d.legLower;
    return [0, 0, 1, 1].map((b) => Q(d, {
      pitch: 4,
      legs: { fn: { x: 0.85 * L, y: 0.08 * L }, ff: { x: 0.7 * L, y: 0.08 * L }, rn: { x: 0.35 * L, y: 0.06 * L }, rf: { x: 0.2 * L, y: 0.06 * L } },
      head: { angle: 38, dx: 0, dy: 2 + b }, tail: -150, eyes: 'closed', mouth: 'closed',
    }));
  },
};

/**
 * Rascarse (lote C7): sentado, la pata de atrás de afuera sube a la oreja y rasca rápido, con la cabeza ladeada hacia
 * la pata y la lengua afuera.
 */
export const A_SCRATCH: AnimalAnimDef = {
  name: 'scratch', fps: 14, loop: true,
  build: (d) => {
    const L = d.legUpper + d.legLower;
    return [0, 1, 0, 1, 0, 1, 2, 2].map((k) => Q(d, {
      pitch: -30,
      legs: {
        // la pata de atrás cercana patea hacia adelante y arriba, al cuello, dos veces por cuadro par
        rn: k === 2 ? { x: 0.55 * L, y: 0.15 * L } : { x: (0.75 - k * 0.35) * L, y: (0.45 + k * 0.15) * L },
        rf: { x: 0.45 * L, y: 0.15 * L }, fn: { x: 0.25 * L, y: L - 0.2 }, ff: { x: 0.05 * L, y: L - 0.2 },
      },
      head: { angle: k === 2 ? 20 : 34, dx: 0, dy: k === 1 ? 1 : 0 }, tail: -10,
      eyes: k === 2 ? 'open' : 'happy', mouth: k === 2 ? 'closed' : 'tongue',
    }));
  },
};

/**
 * Saltar a un muro (lote C7, el gato de los techos): se agacha meneando la cola, salta estirado, llega con las patas
 * de adelante al borde y sube las de atrás. `elevacion` lleva el cuerpo hasta arriba del muro (dos veces su alzada).
 * Lote C7c: `subida` de 0 a 1 por cuadro y el rango de muros (`muro_min`, `muro_max`) donde se ve bien. Para otro muro,
 * el juego sube el sprite `subida * alto_del_muro`.
 */
export const A_JUMP_WALL: AnimalAnimDef = {
  name: 'jump_wall', fps: 12, loop: false, muro: { min: 0.5, max: 1.5 },
  events: [{ type: 'despegue', phase: 2 / 8 }, { type: 'aterriza', phase: 5 / 8 }],
  build: (d) => {
    const L = d.legUpper + d.legLower;
    const H = Math.round(2 * (L + d.chest));
    const agacha = Q(d, { pitch: 8, legs: { rn: { x: 0.3 * L, y: 0.55 * L }, rf: { x: 0.2 * L, y: 0.55 * L }, fn: { x: 0, y: 0.65 * L }, ff: { x: -0.1 * L, y: 0.65 * L } }, tail: 5 });
    const menea = { ...agacha, tail: 25 };
    const impulso = Q(d, { pitch: -35, air: Math.max(2, Math.round(3 * d.u)), rise: Math.round(H * 0.2), legs: { rn: { x: -0.6 * L, y: 0.85 * L }, rf: { x: -0.7 * L, y: 0.8 * L }, fn: { x: 0.6 * L, y: 0.3 * L }, ff: { x: 0.5 * L, y: 0.35 * L } }, tail: 35 });
    const vuela = Q(d, { pitch: -28, air: Math.max(2, Math.round(3 * d.u)), rise: Math.round(H * 0.6), legs: { rn: { x: -0.75 * L, y: 0.6 * L }, rf: { x: -0.85 * L, y: 0.55 * L }, fn: { x: 0.8 * L, y: 0.2 * L }, ff: { x: 0.7 * L, y: 0.25 * L } }, tail: 20, eyes: 'open' });
    // la subida llega a 1 justo cuando las patas de adelante tocan arriba (lo acordado con el juego), y se queda en 1
    const engancha = Q(d, { pitch: -20, rise: H, legs: { rn: { x: 0.1 * L, y: 0.9 * L }, rf: { x: 0, y: L - 0.2 }, fn: { x: 0.6 * L, y: 0.15 * L }, ff: { x: 0.5 * L, y: 0.2 * L } }, tail: 10 });
    const sube = Q(d, { pitch: 6, rise: H, legs: { rn: { x: 0.3 * L, y: 0.6 * L }, rf: { x: 0.2 * L, y: 0.6 * L }, fn: { x: 0.2 * L, y: L - 0.4 }, ff: { x: 0.1 * L, y: L - 0.4 } }, tail: 30 });
    return [standQ(d), agacha, menea, impulso, vuela, engancha, sube, { ...standQ(d), rise: H }];
  },
};

/**
 * Embestida (lote C7c, el perro que tumba): se agacha con el trasero arriba, salta estirado con las patas de adelante
 * por delante y la boca abierta, pega con las patas (el `impacto`, ahí el juego tumba al atleta) y cae plantado. No
 * avanza solo: el juego lo mueve entre el `despegue` y el `aterriza`.
 */
export const A_POUNCE: AnimalAnimDef = {
  name: 'pounce', fps: 12, loop: false,
  events: [{ type: 'despegue', phase: 2 / 8 }, { type: 'impacto', phase: 4 / 8 }, { type: 'aterriza', phase: 6 / 8 }],
  build: (d) => {
    const L = d.legUpper + d.legLower, a = Math.max(2, Math.round(3 * d.u));
    const acecha = (t: number) => Q(d, { pitch: 14, legs: { fn: { x: 0.45 * L, y: 0.62 * L }, ff: { x: 0.3 * L, y: 0.62 * L }, rn: { x: 0.05 * L, y: L - 0.3 }, rf: { x: -0.1 * L, y: L - 0.3 } }, head: { angle: 10, dy: 1 }, tail: t, eyes: 'open' });
    const salta = Q(d, { pitch: -18, air: a, legs: { rn: { x: -0.7 * L, y: 0.8 * L }, rf: { x: -0.8 * L, y: 0.75 * L }, fn: { x: 0.6 * L, y: 0.5 * L }, ff: { x: 0.5 * L, y: 0.55 * L } }, head: { angle: -6 }, tail: 40, mouth: 'open' });
    const pega = Q(d, { x: 1, pitch: -10, air: a, legs: { rn: { x: -0.5 * L, y: 0.85 * L }, rf: { x: -0.6 * L, y: 0.8 * L }, fn: { x: 0.95 * L, y: 0.45 * L }, ff: { x: 0.85 * L, y: 0.5 * L } }, head: { angle: 0 }, tail: 45, mouth: 'open' });
    const cae = Q(d, { x: 1, pitch: 10, legs: { fn: { x: 0.55 * L, y: L - 0.3 }, ff: { x: 0.45 * L, y: L - 0.3 }, rn: { x: -0.2 * L, y: 0.75 * L }, rf: { x: -0.3 * L, y: 0.7 * L } }, head: { angle: 8 }, tail: 35, mouth: 'open' });
    return [standQ(d), acecha(50), acecha(20), salta, pega, pega, cae, Q(d, { x: 1, tail: 40, mouth: 'tongue', eyes: 'happy' })];
  },
};

/**
 * Despertar (lote C7c): sale del `sleep` enroscado. Abre los ojos, levanta la cabeza de golpe, se para con las de
 * adelante, después con las de atrás, y queda alerta con la cola arriba. El primer cuadro es el último del `sleep`.
 */
export const A_WAKE: AnimalAnimDef = {
  name: 'wake', fps: 8, loop: false,
  build: (d) => {
    const L = d.legUpper + d.legLower;
    const echado = { fn: { x: 0.85 * L, y: 0.08 * L }, ff: { x: 0.7 * L, y: 0.08 * L }, rn: { x: 0.35 * L, y: 0.06 * L }, rf: { x: 0.2 * L, y: 0.06 * L } };
    const duerme = A_SLEEP.build(d)[3];
    const abre = Q(d, { pitch: 4, legs: echado, head: { angle: 30, dx: 0, dy: 3 }, tail: -150, eyes: 'open', mouth: 'closed' });
    const alza = Q(d, { pitch: 2, legs: echado, head: { angle: -14, dx: 0, dy: 0 }, tail: -60, eyes: 'open', mouth: 'closed' });
    const adelante = Q(d, { pitch: -24, legs: { fn: { x: 0.25 * L, y: L - 0.3 }, ff: { x: 0.1 * L, y: L - 0.3 }, rn: { x: 0.45 * L, y: 0.15 * L }, rf: { x: 0.3 * L, y: 0.15 * L } }, head: { angle: -10 }, tail: 0, eyes: 'open' });
    const atras = Q(d, { pitch: 6, legs: { fn: { x: 0.2 * L, y: L - 0.3 }, ff: { x: 0.05 * L, y: L - 0.3 }, rn: { x: 0, y: 0.8 * L }, rf: { x: -0.15 * L, y: 0.8 * L } }, head: { angle: -8 }, tail: 20, eyes: 'open' });
    const alerta = Q(d, { head: { angle: -10 }, tail: 50, eyes: 'open', mouth: 'closed' });
    return [duerme, abre, alza, adelante, atras, alerta, { ...alerta, tail: 40 }];
  },
};

export const ANIMAL_ANIMS: AnimalAnimDef[] = [A_IDLE, A_WALK, A_TROT, A_RUN, A_JUMP, A_SIT, A_LIE, A_WAG, A_CELEBRATE, A_FETCH, A_BITE, A_BARK, A_HOWL, A_PICKUP, A_HURT, A_DIE, A_DIG, A_SLEEP, A_SCRATCH, A_JUMP_WALL, A_POUNCE, A_WAKE];
/** Animaciones de la mascota de un RPG, en el orden en que suelen pedirse. */
export const PET_RPG_ANIMS = ['idle', 'walk', 'run', 'bite', 'bark', 'howl', 'pickup', 'hurt', 'die', 'sit', 'wag', 'dig'];
