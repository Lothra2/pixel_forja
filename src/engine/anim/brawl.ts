import type { Pose, PropState } from '../rig/pose';
import { type AnimDef, type Ctx, P, feet } from './types';

/**
 * Pelea callejera (beat 'em up): levantar, llevar y lanzar, a un rival o a un objeto del piso.
 *
 * Lo levantado no es parte del sprite: es otro sprite (el rival con `carried` o el objeto del piso) que el juego dibuja
 * detrás de quien carga. Cada cuadro dice dónde apoya su base con la articulación `carry` (`carga` en el kit): entre
 * las dos manos, en el borde de arriba de las palmas. Con chibi los brazos no pasan la cabeza, así que lo cargado baja
 * hasta apoyarse en las manos (no al revés): los brazos suben a los costados de la cabeza, por delante, con las palmas
 * contra la carga, y la cabeza de quien carga queda delante de lo cargado.
 */

const strain = { eyes: 'angry' as const, mouth: 'grin' as const };
const fierce = { eyes: 'angry' as const, mouth: 'line' as const };

/** Brazos arriba sosteniendo la carga (el render los abre a los costados de la cabeza, por delante). */
const up = (s = 170, e = -10) => ({ near: { shoulder: s, elbow: e }, far: { shoulder: s, elbow: e } });

/** De pie con la carga arriba: piernas firmes y un poco abiertas, el cuerpo apenas hacia atrás. */
function overhead(c: Ctx, crouch = 0.08, torso = -3): Pose {
  return P(c, { torso, legs: feet(c, crouch, 0.2), arms: up(), face: fierce, support: 'both', load: true });
}

/**
 * Levantar: se agacha con la espalda recta, agarra con las dos manos (impacto: lo agarrado sigue en el piso, todavía
 * sin `carga`), lo sube por delante del cuerpo hasta los costados de la cabeza y, cuando llega arriba, el peso lo
 * aplasta un cuadro (rodillas dobladas, cuerpo hundido) antes de afirmarse.
 */
export const lift: AnimDef = {
  name: 'lift', pack: 'brawl', fps: 12, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 1 / 6 }],
  build: (c) => {
    const reach = P(c, { torso: 22, x: -c.u, legs: feet(c, 0.6, 0.26), arms: { near: { shoulder: 40, elbow: 10 }, far: { shoulder: 45, elbow: 10 } }, face: fierce, support: 'both' });
    // sentadilla a fondo con la espalda inclinada: las manos bajan lo más cerca del piso que deja el chibi
    const grab = P(c, { torso: 28, x: -3 * c.u, legs: feet(c, 1.0, 0.3), arms: { near: { shoulder: 42, elbow: 0 }, far: { shoulder: 46, elbow: 0 } }, face: strain, support: 'both' });
    const heave = P(c, { torso: 12, legs: feet(c, 0.45, 0.24), arms: { near: { shoulder: 95, elbow: 40 }, far: { shoulder: 100, elbow: 40 } }, face: strain, support: 'both', load: true });
    const press = P(c, { torso: 2, legs: feet(c, 0.25, 0.22), arms: up(150, 10), face: strain, support: 'both', load: true });
    // aplaste: la carga llega arriba y el peso hunde todo el cuerpo un cuadro
    const squash = P(c, { ...overhead(c, 0.42, 2), head: { dx: 0, dy: Math.max(1, Math.round(c.u)), tilt: 6 }, face: { eyes: 'closed', mouth: 'grin' } });
    return [reach, grab, heave, press, squash, overhead(c)];
  },
};

/**
 * Llevar caminando: pasos cortos y pesados con las rodillas dobladas, los brazos quietos arriba y un hundimiento en
 * cada apoyo. Medio paso de 0.28 piernas (el andar normal usa 0.44).
 */
export const carryWalk: AnimDef = {
  name: 'carry_walk', pack: 'brawl', fps: 10, loop: true, steady: true, views: ['side', 'front', 'back'],
  events: [{ type: 'paso', phase: 0, foot: 'near' }, { type: 'paso', phase: 0.5, foot: 'far' }],
  build: (c) => {
    const L = c.L;
    const S = (0.28 * L) / Math.max(0.8, c.build);
    const lift = 0.2 * L;
    const keys = (near: 'near' | 'far'): Pose[] => {
      const leg = (x: number, y: number, toe = 0) => ({ x, y, toe });
      const step = (a: ReturnType<typeof leg>, b: ReturnType<typeof leg>, torso: number, s: number): Pose =>
        P(c, { torso, legs: near === 'near' ? { near: a, far: b } : { near: b, far: a }, arms: up(s), face: fierce, support: near, load: true });
      return [
        // contacto: el pie de adelante llega con la rodilla doblada
        step(leg(S, L - 0.6), leg(-S, L - 0.8, 10), -3, 170),
        // bajada: el peso cae y las rodillas se doblan más (la carga empuja para abajo)
        step(leg(S * 0.4, L - 1.2), leg(-S * 1.05, L - 1.2 - 0.12 * L, 15), -2, 166),
        // paso: el otro pie pasa bajo, casi arrastrando
        step(leg(0, L - 0.9), leg(S * 0.05, L - 0.9 - lift, 10), -3, 168),
        // subida: empuja con el pie de atrás
        step(leg(-S * 0.5, L - 0.5), leg(S * 0.75, L - 0.5 - 0.08 * L), -4, 172),
      ];
    };
    return [...keys('near'), ...keys('far')];
  },
};

/** Quieto con la carga arriba: respira con el peso, las rodillas ceden un poco y vuelven. */
export const carryIdle: AnimDef = {
  name: 'carry_idle', pack: 'brawl', fps: 6, loop: true, steady: true, views: ['side', 'front', 'back'],
  build: (c) => [overhead(c, 0.08), overhead(c, 0.14, -2), overhead(c, 0.18, -2), overhead(c, 0.12)],
};

/** Correr con la carga: zancada corta y rápida, cuerpo inclinado adelante, sin vuelo (el peso no deja despegar). */
export const carryRun: AnimDef = {
  name: 'carry_run', pack: 'brawl', fps: 14, loop: true, steady: true, views: ['side', 'front', 'back'],
  events: [{ type: 'paso', phase: 0, foot: 'near' }, { type: 'paso', phase: 0.5, foot: 'far' }],
  build: (c) => {
    const L = c.L;
    const S = (0.38 * L) / Math.max(0.8, c.build);
    const keys = (near: 'near' | 'far'): Pose[] => {
      const leg = (x: number, y: number, toe = 0) => ({ x, y, toe });
      const step = (a: ReturnType<typeof leg>, b: ReturnType<typeof leg>, torso: number): Pose =>
        P(c, { torso, legs: near === 'near' ? { near: a, far: b } : { near: b, far: a }, arms: up(165), face: strain, support: near, load: true });
      return [
        step(leg(S, L - 0.8), leg(-S, L - 1.0, 20), 6),
        step(leg(S * 0.3, L - 1.5), leg(-S * 1.1, L - 1.3 - 0.2 * L, 30), 8),
        step(leg(-0.05 * L, L - 1.0), leg(S * 0.2, L - 1.0 - 0.3 * L, 10), 7),
        step(leg(-S * 0.6, L - 0.6, 20), leg(S * 0.85, L - 0.7 - 0.1 * L), 5),
      ];
    };
    return [...keys('near'), ...keys('far')];
  },
};

/**
 * Lanzar desde arriba: lleva la carga atrás arqueando la espalda, da un paso y la tira hacia adelante con todo el
 * cuerpo. La carga sale (suelta) en el cuadro 3: la `carga` de ese cuadro es de donde sale volando; después no hay.
 */
export const throwOverhead: AnimDef = {
  name: 'throw_overhead', pack: 'brawl', fps: 14, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'suelta', phase: 3 / 6 }],
  build: (c) => {
    const L = c.L;
    const hold = overhead(c);
    const wind = P(c, { torso: -14, x: -c.u, legs: { near: { x: 0.25 * L, y: L - 0.7 }, far: { x: -0.3 * L, y: L - 1.0 } }, arms: up(178, -20), face: strain, support: 'far', load: true });
    const heave = P(c, { torso: 8, legs: { near: { x: 0.35 * L, y: L - 0.9 }, far: { x: -0.3 * L, y: L - 0.6, toe: 20 } }, arms: up(150, 0), face: strain, support: 'near', load: true });
    const release = P(c, { torso: 22, x: -c.u, legs: { near: { x: 0.4 * L, y: L - 1.1 }, far: { x: -0.35 * L, y: L - 0.4, toe: 40 } }, arms: { near: { shoulder: 110, elbow: 0 }, far: { shoulder: 115, elbow: 0 } }, face: { eyes: 'angry', mouth: 'open' }, support: 'near', load: true });
    const follow = P(c, { torso: 24, x: -c.u, legs: { near: { x: 0.4 * L, y: L - 1.2 }, far: { x: -0.35 * L, y: L - 0.5, toe: 30 } }, arms: { near: { shoulder: 70, elbow: 10 }, far: { shoulder: 75, elbow: 10 } }, face: fierce, support: 'near' });
    const recover = P(c, { torso: 10, legs: feet(c, 0.2, 0.22), arms: { near: { shoulder: 20, elbow: 20 }, far: { shoulder: 25, elbow: 20 } }, face: fierce, support: 'both' });
    return [hold, wind, heave, release, follow, recover];
  },
};

/**
 * Levantado: acostado boca arriba, pataleando y manoteando. Su base (la espalda) queda en el piso de la celda, así
 * el juego pone su pivote justo en la `carga` de quien lo levanta. Se lee de lado y en diagonal.
 */
export const carried: AnimDef = {
  name: 'carried', pack: 'brawl', fps: 6, loop: true, lateral: true, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L;
    const k = (a: number, b: number, s1: number, s2: number, eyes: 'wide' | 'hurt'): Pose => P(c, {
      torso: -86,
      legs: { near: { x: (0.7 + a * 0.3) * L, y: a * L, toe: 10 }, far: { x: (0.7 + b * 0.3) * L, y: b * L, toe: 10 } },
      arms: { near: { shoulder: s1, elbow: 30 }, far: { shoulder: s2, elbow: 30 } },
      face: { eyes, mouth: 'o' }, fit: 'shared',
    });
    // pataleo: una pierna sube mientras la otra baja, y los brazos manotean al revés
    return [k(-0.45, 0.1, 140, 50, 'wide'), k(-0.15, -0.2, 95, 95, 'wide'), k(0.1, -0.45, 50, 140, 'hurt'), k(-0.2, -0.15, 95, 95, 'wide')];
  },
};

/** Gira (x, y) en grados, en pantalla con y hacia abajo (+ = horario, como `torso`). */
function turn([x, y]: [number, number], deg: number): [number, number] {
  const r = (deg * Math.PI) / 180;
  return [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)];
}

/**
 * Lanzado: hecho bolita, rueda en el aire una vuelta entera en 8 cuadros. El juego lo mueve por la parábola desde el
 * `punto` de la suelta de quien lo tira; cada cuadro va centrado en la celda.
 */
export const thrownSpin: AnimDef = {
  name: 'thrown_spin', pack: 'brawl', fps: 16, loop: true, lateral: true, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L;
    return Array.from({ length: 8 }, (_, i) => {
      // arranca acostada como en `carried` (sale de las manos así) y rueda hacia adelante
      const a = i * 45 - 90;
      // bolita apretada: rodillas al pecho y brazos abrazándolas, así entra entera en la celda en cualquier ángulo
      const [nx, ny] = turn([0.22 * L, 0.2 * L], a), [fx, fy] = turn([0.16 * L, 0.26 * L], a);
      return P(c, {
        // sin aire en la celda: el juego la mueve por la parábola, y así la bolita usa todo el alto de la celda
        torso: a, air: 0,
        legs: { near: { x: nx, y: ny, toe: 30 }, far: { x: fx, y: fy, toe: 30 } },
        arms: { near: { shoulder: 55, elbow: 130 }, far: { shoulder: 65, elbow: 130 } },
        face: { eyes: i % 4 < 2 ? 'hurt' : 'wide', mouth: 'o' }, fit: true,
      });
    });
  },
};


// ---------- caer, agarrar, marearse, burlarse, golpes corriendo y en el aire ----------

const hurt = { eyes: 'hurt' as const, mouth: 'o' as const };
const spark = (at: PropState['at'], angle = 0): PropState => ({ kind: 'spark', at, angles: { side: angle, se: angle + 10, ne: angle - 10 }, front: true });

/** Guardia de pelea callejera: más suelta que la de artes marciales, puños a la altura del pecho. */
function street(c: Ctx, b = 0): Pose {
  const L = c.L;
  return P(c, {
    torso: 6, legs: { near: { x: 0.28 * L, y: L - 1.0 + b * 0.6 }, far: { x: -0.3 * L, y: L - 1.0 + b * 0.6, toe: 10 } },
    arms: { near: { shoulder: 60, elbow: 110 }, far: { shoulder: 70, elbow: 100 } }, face: fierce, support: 'both',
  });
}

/** Tirado boca arriba (para caídas y rebotes). */
function down(c: Ctx, air = 0, eyes: 'closed' | 'hurt' = 'closed'): Pose {
  const L = c.L;
  return P(c, {
    torso: -88, air, legs: { near: { x: 0.75 * L, y: 0.1 * L, toe: -30 }, far: { x: 0.7 * L, y: 0.2 * L, toe: -30 } },
    arms: { near: { shoulder: 120, elbow: 40 }, far: { shoulder: 140, elbow: 30 } }, face: { eyes, mouth: 'o' }, fit: true,
  });
}

/** Caer de plano: pega contra el piso, rebota un poco y queda. */
export const landFlat: AnimDef = {
  name: 'land_flat', pack: 'brawl', fps: 12, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'aterriza', phase: 0 }],
  build: (c) => [down(c, 0, 'hurt'), down(c, Math.max(1, Math.round(2 * c.u)), 'hurt'), down(c), down(c)],
};

/** Agarrar de la ropa: estira las dos manos y cierra adelante, a la altura del pecho del rival (impacto). */
export const grab: AnimDef = {
  name: 'grab', pack: 'brawl', fps: 14, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 2 / 4 }],
  build: (c) => {
    const L = c.L, s = street(c);
    const lunge = P(c, { torso: 14, legs: { near: { x: 0.4 * L, y: L - 0.9 }, far: { x: -0.3 * L, y: L - 0.5, toe: 20 } }, arms: { near: { shoulder: 85, elbow: 20 }, far: { shoulder: 90, elbow: 20 } }, face: fierce, support: 'near' });
    const shut = { ...lunge, torso: 12, arms: { near: { shoulder: 88, elbow: 60 }, far: { shoulder: 92, elbow: 60 } }, face: strain };
    return [s, lunge, shut, { ...shut, torso: 8, x: -c.u }];
  },
};

/** Sostener el agarre: tironea un poco adelante y atrás. */
export const grabHold: AnimDef = {
  name: 'grab_hold', pack: 'brawl', fps: 8, loop: true, steady: true, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L;
    const k = (t: number, e: number): Pose => P(c, { torso: 8 + t, x: (t / 4) * c.u, legs: { near: { x: 0.35 * L, y: L - 0.9 }, far: { x: -0.3 * L, y: L - 0.7, toe: 15 } }, arms: { near: { shoulder: 88, elbow: e }, far: { shoulder: 92, elbow: e } }, face: strain, support: 'both' });
    return [k(0, 60), k(3, 70), k(4, 75), k(1, 65)];
  },
};

/** Agarrado: echado para atrás, los brazos manoteando y los pies arrastrando. */
export const grabbed: AnimDef = {
  name: 'grabbed', pack: 'brawl', fps: 8, loop: true, steady: true, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L;
    const k = (t: number, a: number): Pose => P(c, { torso: -10 - t, x: -c.u, head: { tilt: -8 - t, dx: 0, dy: 0 }, legs: { near: { x: 0.2 * L, y: L - 0.6, toe: -10 }, far: { x: -0.25 * L, y: L - 0.5 } }, arms: { near: { shoulder: 40 + a, elbow: 50, spread: 20 }, far: { shoulder: 60 - a, elbow: 50, spread: 20 } }, face: hurt, support: 'both' });
    return [k(0, 0), k(3, 25), k(4, 10), k(1, -15)];
  },
};

/** Rodillazo en agarre: tira del rival hacia abajo y sube la rodilla al cuerpo (impacto). */
export const kneeGrab: AnimDef = {
  name: 'knee_grab', pack: 'brawl', fps: 14, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 2 / 5 }],
  build: (c) => {
    const L = c.L;
    const hold = P(c, { torso: 10, legs: { near: { x: 0.3 * L, y: L - 0.9 }, far: { x: -0.3 * L, y: L - 0.7 } }, arms: { near: { shoulder: 85, elbow: 70 }, far: { shoulder: 90, elbow: 70 } }, face: strain, support: 'both' });
    const pull = { ...hold, torso: 18, arms: { near: { shoulder: 70, elbow: 80 }, far: { shoulder: 75, elbow: 80 } } };
    const knee = P(c, { torso: 14, legs: { near: { x: 0.45 * L, y: 0.35 * L, toe: 40 }, far: { x: -0.1 * L, y: L - 0.4, toe: 20 } }, arms: { near: { shoulder: 65, elbow: 85 }, far: { shoulder: 70, elbow: 85 } }, face: { eyes: 'angry', mouth: 'grin' }, support: 'far', props: [spark('footNear', -40)] });
    return [hold, pull, knee, { ...knee, props: [] }, hold];
  },
};

/** Zafarse: se encoge, gira y abre los brazos de golpe, y da un paso atrás. */
export const breakFree: AnimDef = {
  name: 'break_free', pack: 'brawl', fps: 14, loop: false, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L;
    const curl = P(c, { torso: 18, legs: feet(c, 0.4, 0.22), arms: { near: { shoulder: 20, elbow: 130 }, far: { shoulder: 25, elbow: 130 } }, face: strain, support: 'both' });
    const burst = P(c, { torso: -6, legs: feet(c, 0.15, 0.25), arms: { near: { shoulder: 100, elbow: 10, spread: 60 }, far: { shoulder: 110, elbow: 10, spread: 60 } }, face: { eyes: 'angry', mouth: 'open' }, support: 'both' });
    const back = P(c, { torso: 2, x: -c.u, legs: { near: { x: 0.1 * L, y: L - 0.6 }, far: { x: -0.4 * L, y: L - 0.8 } }, arms: { near: { shoulder: 50, elbow: 60 }, far: { shoulder: 55, elbow: 60 } }, face: fierce, support: 'far' });
    return [curl, curl, burst, back, street(c)];
  },
};

/**
 * Mareado: se tambalea en círculo, la cabeza cae de un lado al otro y los brazos cuelgan. `cabeza` dice dónde van
 * los pajaritos.
 */
export const dizzy: AnimDef = {
  name: 'dizzy', pack: 'brawl', fps: 8, loop: true, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L;
    return Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2, sw = Math.sin(a), cw = Math.cos(a);
      return P(c, {
        torso: 6 * sw, x: Math.round(sw * c.u), head: { tilt: 12 * sw, dx: 0, dy: 0 },
        legs: { near: { x: (0.2 + 0.06 * cw) * L, y: L - 0.9 }, far: { x: (-0.2 + 0.06 * cw) * L, y: L - 0.9 } },
        arms: { near: { shoulder: 10 + 10 * cw, elbow: 20, spread: 15 }, far: { shoulder: 10 - 10 * cw, elbow: 20, spread: 15 } },
        face: { eyes: i % 4 < 2 ? 'hurt' : 'closed', mouth: 'o' }, support: 'both',
      });
    });
  },
};

/** Nocaut con rebote: el golpe lo levanta, cae, rebota (dos aterrizajes) y queda tirado. Más exagerado que `knockout`. */
export const koBounce: AnimDef = {
  name: 'ko_bounce', pack: 'brawl', fps: 12, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'aterriza', phase: 3 / 8 }, { type: 'aterriza', phase: 5 / 8 }],
  build: (c) => {
    const L = c.L, u = c.u, R = (v: number) => Math.max(1, Math.round(v * u));
    const snap = P(c, { torso: -22, x: -u, head: { tilt: -22, dx: 0, dy: 0 }, legs: { near: { x: -0.4 * L, y: L - 0.6 }, far: { x: 0.2 * L, y: L - 0.5 } }, arms: { near: { shoulder: -20, elbow: 30, spread: 40 }, far: { shoulder: 10, elbow: 30, spread: 40 } }, face: hurt, support: 'both' });
    const fly = P(c, { torso: -65, air: R(6), legs: { near: { x: 0.6 * L, y: 0.2 * L, toe: 20 }, far: { x: 0.5 * L, y: 0.35 * L, toe: 20 } }, arms: { near: { shoulder: 150, elbow: 30 }, far: { shoulder: 165, elbow: 30 } }, face: hurt, fit: true });
    const flat = P(c, { ...fly, torso: -82, air: R(5) });
    return [snap, fly, flat, down(c, 0, 'hurt'), down(c, R(4), 'hurt'), down(c, 0, 'hurt'), down(c), down(c)];
  },
};

/** Burla: mano en la cadera y la otra llamando "ven, ven", con la cabeza ladeada y sonrisa. */
export const taunt: AnimDef = {
  name: 'taunt', pack: 'brawl', fps: 8, loop: false, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L;
    const k = (e: number, tilt: number): Pose => P(c, { torso: -4, head: { tilt, dx: 0, dy: 0 }, legs: { near: { x: 0.25 * L, y: L - 0.4 }, far: { x: -0.25 * L, y: L - 0.4 } }, arms: { near: { shoulder: 85, elbow: e }, far: { shoulder: -30, elbow: 110 } }, face: { eyes: 'happy', mouth: 'grin' }, support: 'both' });
    return [street(c), k(10, 4), k(80, 8), k(10, 4), k(80, 8), k(10, 6), k(70, 6), street(c)];
  },
};

/** Puñetazo corriendo: llega a la carrera y el puño sale adelante con todo el cuerpo (impacto). */
export const runPunch: AnimDef = {
  name: 'run_punch', pack: 'brawl', fps: 16, loop: false, views: ['side', 'front', 'back'], travel: { ref: 'run', k: [1, 0.9, 0.7, 0.4, 0.15, 0] },
  events: [{ type: 'impacto', phase: 2 / 6 }],
  build: (c) => {
    const L = c.L;
    const run = P(c, { torso: 16, legs: { near: { x: 0.35 * L, y: L - 0.6 }, far: { x: -0.4 * L, y: L - 0.7, toe: 30 } }, arms: { near: { shoulder: 40, elbow: 110 }, far: { shoulder: -30, elbow: 70 } }, face: fierce, support: 'near' });
    const hit = P(c, { torso: 20, legs: { near: { x: 0.45 * L, y: L - 1.0 }, far: { x: -0.4 * L, y: L - 0.4, toe: 40 } }, arms: { near: { shoulder: 90, elbow: 0 }, far: { shoulder: 30, elbow: 100 } }, face: { eyes: 'angry', mouth: 'grin' }, support: 'near' });
    return [run, { ...run, arms: { near: { shoulder: 20, elbow: 120 }, far: run.arms.far } }, { ...hit, props: [spark('handNear')] }, hit, { ...hit, torso: 12, arms: { near: { shoulder: 60, elbow: 60 }, far: hit.arms.far } }, street(c)];
  },
};

/** Patada voladora corriendo: corre, despega, estira la pierna en el aire (impacto) y aterriza. Con elevación y desplazamiento. */
export const runKick: AnimDef = {
  name: 'run_kick', pack: 'brawl', fps: 14, loop: false, lateral: true, views: ['side', 'front', 'back'], travel: { ref: 'run', k: [1, 1, 0.95, 0.9, 0.85, 0.6, 0.2, 0] },
  events: [{ type: 'despegue', phase: 2 / 8 }, { type: 'impacto', phase: 4 / 8 }, { type: 'aterriza', phase: 6 / 8 }],
  build: (c) => {
    const L = c.L, u = c.u, R = (v: number) => Math.round(v * u);
    const run = P(c, { torso: 14, legs: { near: { x: 0.35 * L, y: L - 0.5 }, far: { x: -0.4 * L, y: L - 0.6, toe: 30 } }, arms: { near: { shoulder: -40, elbow: 80 }, far: { shoulder: 50, elbow: 80 } }, face: fierce, support: 'near' });
    const take = P(c, { torso: 4, rise: R(6), legs: { near: { x: 0.4 * L, y: 0.35 * L, toe: 20 }, far: { x: -0.15 * L, y: L - 0.2, toe: 50 } }, arms: { near: { shoulder: 60, elbow: 100 }, far: { shoulder: 70, elbow: 100 } }, face: fierce });
    const kick = P(c, { torso: -28, x: -2 * u, rise: R(12), legs: { near: { x: 1.0 * L, y: 0.2 * L, toe: 0 }, far: { x: -0.2 * L, y: 0.5 * L, toe: 40 } }, arms: { near: { shoulder: -50, elbow: 30, spread: 30 }, far: { shoulder: 80, elbow: 90 } }, face: { eyes: 'angry', mouth: 'grin' } });
    const fall = P(c, { torso: -8, rise: R(5), legs: { near: { x: 0.4 * L, y: 0.6 * L, toe: 20 }, far: { x: -0.2 * L, y: 0.7 * L, toe: 30 } }, arms: { near: { shoulder: 30, elbow: 90 }, far: { shoulder: 60, elbow: 100 } }, face: fierce });
    const land = P(c, { torso: 14, legs: { near: { x: 0.35 * L, y: L - 1.8 }, far: { x: -0.35 * L, y: L - 1.8 } }, arms: { near: { shoulder: 40, elbow: 100 }, far: { shoulder: 60, elbow: 100 } }, face: fierce, support: 'both' });
    return [run, run, take, { ...kick, rise: R(11), props: [] }, { ...kick, props: [spark('footNear', 10)] }, fall, land, street(c)];
  },
};

/** Patada en el aire desde un salto normal: recoge las piernas, estira una (impacto) y la vuelve a recoger. */
export const airKick: AnimDef = {
  name: 'air_kick', pack: 'brawl', fps: 14, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 1 / 4 }],
  build: (c) => {
    const L = c.L, u = c.u, air = Math.max(2, Math.round(3 * u));
    const tuck = P(c, { torso: -6, air, legs: { near: { x: 0.35 * L, y: 0.35 * L, toe: 20 }, far: { x: 0.1 * L, y: 0.45 * L, toe: 30 } }, arms: { near: { shoulder: 50, elbow: 110 }, far: { shoulder: 60, elbow: 110 } }, face: fierce });
    const kick = P(c, { torso: -24, x: -u, air, legs: { near: { x: 0.95 * L, y: 0.3 * L, toe: 0 }, far: { x: -0.1 * L, y: 0.5 * L, toe: 40 } }, arms: { near: { shoulder: -40, elbow: 30, spread: 30 }, far: { shoulder: 80, elbow: 90 } }, face: { eyes: 'angry', mouth: 'grin' } });
    return [tuck, { ...kick, props: [spark('footNear', 10)] }, kick, tuck];
  },
};

/** Resbalón en piso mojado: el pie se va adelante, los brazos aletean, cae de espalda (aterriza) y queda viendo estrellas. */
export const slipWet: AnimDef = {
  name: 'slip_wet', pack: 'brawl', fps: 14, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'aterriza', phase: 4 / 8 }],
  build: (c) => {
    const L = c.L, u = c.u, R = (v: number) => Math.max(1, Math.round(v * u));
    const step = P(c, { torso: 4, legs: { near: { x: 0.4 * L, y: L - 0.2 }, far: { x: -0.3 * L, y: L - 0.4, toe: 10 } }, arms: { near: { shoulder: -20, elbow: 15 }, far: { shoulder: 20, elbow: 20 } }, face: { eyes: 'open', mouth: 'line' }, support: 'near' });
    const slide = P(c, { torso: -18, legs: { near: { x: 0.85 * L, y: L - 0.9, toe: -20 }, far: { x: -0.2 * L, y: L - 0.5 } }, arms: { near: { shoulder: 120, elbow: 20, spread: 30 }, far: { shoulder: 130, elbow: 20, spread: 30 } }, face: { eyes: 'wide', mouth: 'o' }, support: 'far' });
    const air1 = P(c, { torso: -45, air: R(5), legs: { near: { x: 0.7 * L, y: -0.1 * L, toe: 0 }, far: { x: 0.5 * L, y: 0.2 * L } }, arms: { near: { shoulder: 160, elbow: 20 }, far: { shoulder: 150, elbow: 30 } }, face: { eyes: 'wide', mouth: 'o' }, fit: true });
    const air2 = P(c, { ...air1, torso: -72, air: R(3) });
    return [step, slide, air1, air2, down(c, 0, 'hurt'), down(c, R(2), 'hurt'), down(c), down(c)];
  },
};

// ---------- armas del piso ----------

/**
 * El arma del piso en la mano cercana: `held` no dibuja nada en el kit (el juego dibuja la que el personaje recogió,
 * con el dato `arma`); en el estudio se ve la que se elija. side = ángulo de lado (0 = adelante, 90 = abajo).
 */
const held = (side: number, extra: Partial<PropState> = {}): PropState => ({ kind: 'held', at: 'handNear', angles: { side, se: side + 8, ne: side - 8 }, ...extra });
const heldNear = held;

/** Recoger del piso: se agacha, agarra (impacto) y se levanta con el arma en la mano. */
export const weaponPick: AnimDef = {
  name: 'weapon_pick', pack: 'brawl', fps: 12, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 2 / 4 }],
  build: (c) => {
    const L = c.L;
    const bend = P(c, { torso: 30, x: -c.u, legs: { near: { x: 0.3 * L, y: L - 1.6 }, far: { x: -0.3 * L, y: L - 1.2, toe: 20 } }, arms: { near: { shoulder: 40, elbow: 10 }, far: { shoulder: 10, elbow: 30 } }, face: fierce, support: 'both' });
    const take = { ...bend, torso: 32, arms: { near: { shoulder: 35, elbow: 5 }, far: bend.arms.far }, props: [held(20)] };
    const up = P(c, { ...street(c), arms: { near: { shoulder: 50, elbow: 70 }, far: { shoulder: 60, elbow: 100 } }, props: [held(-50)] });
    return [street(c), bend, take, up];
  },
};

/** Batazo: lleva el arma atrás por encima del hombro, la descarga en arco (impacto, con la estela) y sigue de largo. */
export const weaponSwing: AnimDef = {
  name: 'weapon_swing', pack: 'brawl', fps: 14, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 3 / 6 }],
  build: (c) => {
    const L = c.L;
    const ready = P(c, { ...street(c), arms: { near: { shoulder: 60, elbow: 80 }, far: { shoulder: 60, elbow: 100 } }, props: [held(-60)] });
    const wind = P(c, { torso: -6, x: -c.u, legs: { near: { x: 0.25 * L, y: L - 0.8 }, far: { x: -0.35 * L, y: L - 1.0 } }, arms: { near: { shoulder: 150, elbow: 60 }, far: { shoulder: 70, elbow: 90 } }, face: fierce, support: 'far', props: [held(-150)] });
    const hit = P(c, { torso: 16, legs: { near: { x: 0.4 * L, y: L - 1.0 }, far: { x: -0.35 * L, y: L - 0.5, toe: 30 } }, arms: { near: { shoulder: 90, elbow: 0 }, far: { shoulder: 50, elbow: 80 } }, face: { eyes: 'angry', mouth: 'grin' }, support: 'near' });
    const through = { ...hit, torso: 20, arms: { near: { shoulder: 40, elbow: 0 }, far: hit.arms.far }, props: [held(60)] };
    return [ready, wind, { ...wind, torso: 2, arms: { near: { shoulder: 130, elbow: 30 }, far: wind.arms.far }, props: [held(-100)] }, { ...hit, props: [held(0, { smear: { side: [-120, 0], se: [-110, 8], ne: [-130, -8] } }), spark('handNear', 0)] }, through, { ...street(c), props: [held(-60)] }];
  },
};

/**
 * Golpe pesado a dos manos (pote, silla, llanta): lo sube sobre la cabeza (con los brazos estirados de la carga), lo
 * sostiene y lo estrella adelante (impacto). Los pesados cuelgan de su agarre (el borde de arriba): el ángulo de `held`
 * es el giro del objeto desde su postura de piso, así 180 lo pone de cabeza encima de las manos.
 */
export const weaponSwingHeavy: AnimDef = {
  name: 'weapon_swing_heavy', pack: 'brawl', fps: 12, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 4 / 8 }],
  build: (c) => {
    const L = c.L;
    const two = (sh: number, el: number) => ({ near: { shoulder: sh, elbow: el }, far: { shoulder: sh + 4, elbow: el } });
    // a dos manos: el agarre va entre las manos
    const held = (side: number) => ({ ...heldNear(side), at: 'hands' as const });
    const hold = P(c, { torso: 8, legs: feet(c, 0.25, 0.24), arms: two(80, 50), face: strain, support: 'both', props: [held(-30)] });
    const raise = P(c, { torso: -6, x: -c.u, legs: feet(c, 0.1, 0.24), arms: two(170, -10), face: strain, support: 'both', load: true, props: [held(180)] });
    const slam = P(c, { torso: 28, legs: { near: { x: 0.4 * L, y: L - 1.3 }, far: { x: -0.35 * L, y: L - 0.6, toe: 20 } }, arms: two(80, 0), face: { eyes: 'angry', mouth: 'open' }, support: 'near' });
    return [hold, raise, raise, { ...raise, torso: -10, props: [held(200)] }, { ...slam, props: [held(-70), spark('handNear', 30)] }, { ...slam, props: [held(-40)] }, { ...hold, torso: 14 }, hold];
  },
};

/** Lanzar el arma (chancleta, piedra, nón lá, termo): la lleva atrás de la cabeza y la suelta hacia adelante (suelta). */
export const weaponThrow: AnimDef = {
  name: 'weapon_throw', pack: 'brawl', fps: 14, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'suelta', phase: 3 / 6 }],
  build: (c) => {
    const L = c.L;
    const ready = P(c, { ...street(c), props: [held(-40)] });
    const back = P(c, { torso: -10, x: -c.u, legs: { near: { x: 0.3 * L, y: L - 0.7 }, far: { x: -0.35 * L, y: L - 1.0 } }, arms: { near: { shoulder: 160, elbow: 90 }, far: { shoulder: 80, elbow: 30 } }, face: fierce, support: 'far', props: [held(-170)] });
    const out = P(c, { torso: 20, legs: { near: { x: 0.4 * L, y: L - 1.0 }, far: { x: -0.35 * L, y: L - 0.5, toe: 30 } }, arms: { near: { shoulder: 110, elbow: 0 }, far: { shoulder: 30, elbow: 60 } }, face: { eyes: 'angry', mouth: 'open' }, support: 'near' });
    return [ready, back, { ...back, torso: 0, arms: { near: { shoulder: 150, elbow: 40 }, far: back.arms.far }, props: [held(-120)] }, out, { ...out, torso: 24, arms: { near: { shoulder: 60, elbow: 10 }, far: out.arms.far } }, street(c)];
  },
};

/** Bloquear con el paraguas: lo abre adelante como escudo y aguanta detrás de él. */
export const umbrellaBlock: AnimDef = {
  name: 'umbrella_block', pack: 'brawl', fps: 12, loop: false, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L;
    const brace = P(c, { torso: 10, x: -c.u, legs: { near: { x: 0.3 * L, y: L - 1.2 }, far: { x: -0.35 * L, y: L - 1.0 } }, arms: { near: { shoulder: 75, elbow: 40 }, far: { shoulder: 70, elbow: 90 } }, face: fierce, support: 'both' });
    return [
      P(c, { ...street(c), props: [held(-50)] }),
      { ...brace, props: [held(30, { open: true })] },
      { ...brace, props: [held(90, { open: true, front: true })] },
      { ...brace, torso: 12, props: [held(90, { open: true, front: true })] },
    ];
  },
};

/** Abanicazo: abre el abanico, lo lleva atrás y lo barre hacia adelante soltando la ráfaga (suelta). */
export const fanGust: AnimDef = {
  name: 'fan_gust', pack: 'brawl', fps: 12, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'suelta', phase: 3 / 6 }],
  build: (c) => {
    const L = c.L;
    const open = P(c, { torso: 0, legs: feet(c, 0.15, 0.24), arms: { near: { shoulder: 120, elbow: 40 }, far: { shoulder: 60, elbow: 100 } }, face: fierce, support: 'both', props: [held(-80, { open: true })] });
    const back = P(c, { torso: -12, x: -c.u, legs: { near: { x: 0.25 * L, y: L - 0.7 }, far: { x: -0.35 * L, y: L - 1.0 } }, arms: { near: { shoulder: 150, elbow: 80 }, far: { shoulder: 70, elbow: 90 } }, face: fierce, support: 'far', props: [held(-150, { open: true })] });
    const sweep = P(c, { torso: 18, legs: { near: { x: 0.4 * L, y: L - 1.0 }, far: { x: -0.35 * L, y: L - 0.5, toe: 30 } }, arms: { near: { shoulder: 90, elbow: 0 }, far: { shoulder: 40, elbow: 80 } }, face: { eyes: 'angry', mouth: 'open' }, support: 'near', props: [held(90, { open: true })] });
    return [P(c, { ...street(c), props: [held(-50)] }), open, back, sweep, { ...sweep, torso: 22, props: [held(120, { open: true })] }, P(c, { ...street(c), props: [held(-50)] })];
  },
};

export const BRAWL: AnimDef[] = [
  lift, carryIdle, carryWalk, carryRun, throwOverhead, carried, thrownSpin, landFlat,
  grab, grabHold, grabbed, kneeGrab, breakFree, dizzy, koBounce, taunt, runPunch, runKick, airKick, slipWet,
  weaponPick, weaponSwing, weaponSwingHeavy, weaponThrow, umbrellaBlock, fanGust,
];
