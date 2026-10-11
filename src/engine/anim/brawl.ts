import type { Pose } from '../rig/pose';
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

export const BRAWL: AnimDef[] = [lift, carryIdle, carryWalk, carryRun, throwOverhead, carried, thrownSpin];
