import type { Pose, PropState } from '../rig/pose';
import { type AnimDef, P, feet } from './types';

/**
 * Animaciones premium: poses clave pensadas como las haría un animador, no fórmulas.
 *
 * - Caminar: contacto, bajada (el peso cae en la pierna de adelante), paso (la otra pasa con la rodilla arriba) y
 *   subida (empuja con la punta). Brazos al revés que las piernas, el codo se dobla más cuando el brazo va adelante.
 * - Correr: contacto, bajada profunda, impulso y vuelo con las dos piernas abiertas.
 * - Atacar: guardia, anticipación sostenida (todo el peso atrás), golpe en un cuadro, sobrepaso y recuperación.
 * - Golpe: el impacto empuja hacia atrás, se aguanta y se recupera pasándose un poco hacia adelante.
 * - Bloquear: sube el escudo, se afirma, aguanta la sacudida y suelta.
 * - Respirar: el pecho sube, los hombros acompañan y parpadea.
 *
 * Cada cuadro declara qué pie carga el peso (support): así se mide cuánto avanza el cuerpo sin patinar y el juego
 * recibe los pasos como eventos. Todas caben en la celda con el pivote fijo y pasan el control de altura (±1 px).
 */

const sword: PropState = { kind: 'sword', at: 'handNear' };
/** Espada con el ángulo pensado para cada vista (0 = hacia la derecha, 90 = hacia abajo; las de la izquierda son espejo). */
const swordAt = (angles: PropState['angles'], front?: PropState['front']): PropState => ({ ...sword, angles, ...(front ? { front } : {}) });

/** Cambia la pierna de adelante por la de atrás (y los brazos): la segunda mitad de un ciclo es la primera espejada. */
function swapSides(p: Pose): Pose {
  return {
    ...p,
    legs: { near: { ...p.legs.far }, far: { ...p.legs.near } },
    arms: { near: { ...p.arms.far }, far: { ...p.arms.near } },
    support: p.support === 'near' ? 'far' : p.support === 'far' ? 'near' : p.support,
  };
}

// ---------- caminar ----------

export const walk: AnimDef = {
  name: 'walk', pack: 'basic', fps: 10, loop: true, steady: true, views: ['side', 'front', 'back'],
  events: [{ type: 'paso', phase: 0, foot: 'near' }, { type: 'paso', phase: 0.5, foot: 'far' }],
  build: (c) => {
    const L = c.L;
    const heavy = Math.max(0.8, c.build);
    const S = (0.44 * L) / heavy; // media zancada
    const up = 0.3 * L; // cuánto sube el pie que pasa
    // la altura del pie de apoyo marca la cadera: casi estirado en el contacto y la subida, doblado en la bajada.
    // Las puntas de los pies que no apoyan apenas bajan: si no, la punta pasa a ser lo más bajo y levanta el cuerpo
    const stepKeys: Pose[] = [
      // contacto: talón adelante, punta atrás, brazos al máximo
      P(c, { torso: 3, legs: { near: { x: S, y: L - 0.15, toe: 0 }, far: { x: -S, y: L - 0.35, toe: 10 } },
        arms: { near: { shoulder: -30, elbow: 12 }, far: { shoulder: 30, elbow: 30 } }, support: 'near' }),
      // bajada: la pierna de adelante recibe el peso, el pie de atrás despega
      P(c, { torso: 5, legs: { near: { x: S * 0.45, y: L - 0.75, toe: 0 }, far: { x: -S * 1.05, y: L - 0.75 - 0.2 * L, toe: 20 } },
        arms: { near: { shoulder: -34, elbow: 16 }, far: { shoulder: 34, elbow: 38 } }, support: 'near' }),
      // paso: el pie que vuela pasa con la rodilla arriba, los brazos pasan por el costado
      P(c, { torso: 4, legs: { near: { x: 0, y: L - 0.45, toe: 0 }, far: { x: S * 0.05, y: L - 0.45 - up, toe: 15 } },
        arms: { near: { shoulder: -8, elbow: 14 }, far: { shoulder: 8, elbow: 20 } }, support: 'near' }),
      // subida: el cuerpo pasa por arriba, el otro pie se estira hacia adelante
      P(c, { torso: 2, legs: { near: { x: -S * 0.5, y: L - 0.1, toe: 0 }, far: { x: S * 0.8, y: L - 0.1 - 0.12 * L, toe: 0 } },
        arms: { near: { shoulder: 18, elbow: 26 }, far: { shoulder: -18, elbow: 12 } }, support: 'near' }),
    ];
    return [...stepKeys, ...stepKeys.map(swapSides)];
  },
};

/** Armas cortas que se balancean con el brazo al andar (las largas, el arco y el báculo van como siempre). */
const SWINGS = new Set(['sword', 'dagger', 'axe', 'mace', 'club', 'hammer', 'claws', 'wand']);

/**
 * El arma del equipo se balancea con el brazo al caminar y correr (si no, cuelga quieta y el paso se ve muerto):
 * de lado y en diagonal su ángulo sigue al hombro. Se aplica después de poner el equipo, cuando se sabe qué arma es.
 */
export function swingWeapon(name: string, poses: Pose[], weapon: string | null | undefined): Pose[] {
  const k = name === 'walk' ? { base: 30, k: 0.5 } : name === 'run' ? { base: 25, k: 0.35 } : null;
  if (!k || !weapon || !SWINGS.has(weapon)) return poses;
  return poses.map((p) => {
    const a = Math.round(k.base + p.arms.near.shoulder * k.k);
    return { ...p, props: p.props?.map((q) => (q.at === 'handNear' && !q.angles ? { ...q, angles: { side: a, se: a + 10, ne: a - 10 } } : q)) };
  });
}

// ---------- correr ----------

export const run: AnimDef = {
  name: 'run', pack: 'basic', fps: 14, loop: true, steady: true, hairTrail: -1, views: ['side', 'front', 'back'],
  events: [{ type: 'paso', phase: 0, foot: 'near' }, { type: 'paso', phase: 0.5, foot: 'far' }],
  build: (c) => {
    const L = c.L;
    const heavy = Math.max(0.8, c.build);
    const S = (0.56 * L) / heavy;
    const flight = Math.max(1, Math.round((1.5 * c.u) / heavy));
    // el cuerpo inclinado va un poco atrás del pivote: así el brazo que va adelante no se sale de la celda
    const back = -c.u;
    const stepKeys: Pose[] = [
      // contacto: cae sobre la pierna de adelante, la de atrás todavía arriba
      P(c, { x: back, torso: 9, legs: { near: { x: S * 0.7, y: L - 0.35, toe: 0 }, far: { x: -S * 0.85, y: L - 0.35 - 0.34 * L, toe: 30 } },
        arms: { near: { shoulder: -55, elbow: 95 }, far: { shoulder: 40, elbow: 90 } }, face: { mouth: 'open' }, support: 'near' }),
      // bajada: la rodilla absorbe (un pixel, a esta escala es lo que se lee), el talón de atrás sube hacia la cola
      P(c, { x: back, torso: 11, legs: { near: { x: S * 0.15, y: L - 0.95, toe: 0 }, far: { x: -S * 0.35, y: L - 0.95 - 0.5 * L, toe: 40 } },
        arms: { near: { shoulder: -35, elbow: 95 }, far: { shoulder: 30, elbow: 90 } }, face: { mouth: 'open' }, support: 'near' }),
      // impulso: la pierna de apoyo se estira atrás (casi plana, la punta apenas), la otra sube la rodilla adelante
      P(c, { x: back, torso: 11, legs: { near: { x: -S * 0.6, y: L - 0.75, toe: 8 }, far: { x: S * 0.55, y: L - 0.75 - 0.42 * L, toe: 10 } },
        arms: { near: { shoulder: 36, elbow: 85 }, far: { shoulder: -50, elbow: 95 } }, face: { mouth: 'open' }, support: 'near' }),
      // vuelo: las dos en el aire, abiertas
      P(c, { x: back, torso: 10, air: flight, legs: { near: { x: -S * 0.9, y: 0.78 * L, toe: 40 }, far: { x: S * 0.8, y: 0.74 * L, toe: 5 } },
        arms: { near: { shoulder: 42, elbow: 85 }, far: { shoulder: -60, elbow: 95 } }, face: { mouth: 'open' } }),
    ];
    return [...stepKeys, ...stepKeys.map(swapSides)];
  },
};

// ---------- atacar ----------

/**
 * Tajo horizontal (como en los Zelda chibi): la espada se carga atrás a la altura de la cadera y barre hacia adelante.
 * En un chibi el brazo no pasa por encima de la cabeza grande, así que un golpe de arriba hacia abajo se pierde;
 * el barrido se lee en todas las vistas.
 */
export const attack: AnimDef = {
  name: 'attack', pack: 'rpg', fps: 14, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 3 / 7 }],
  build: (c) => {
    const L = c.L;
    const angry = { eyes: 'angry' as const, mouth: 'line' as const };
    const guard = P(c, { torso: 4, legs: feet(c, 0.25, 0.22), arms: { near: { shoulder: 40, elbow: 70 }, far: { shoulder: 30, elbow: 60 } }, face: angry, support: 'both' });
    // anticipación: el peso atrás, el hombro gira y la espada se va para atrás
    const wind = P(c, { torso: -6, legs: { near: { x: 0.3 * L, y: L - 0.9 }, far: { x: -0.3 * L, y: L - 0.9 } },
      arms: { near: { shoulder: -70, elbow: 30 }, far: { shoulder: 40, elbow: 40 } }, face: angry, support: 'far' });
    const windHold = P(c, { ...wind, torso: -8, arms: { near: { shoulder: -82, elbow: 24 }, far: { shoulder: 45, elbow: 40 } } });
    // golpe: paso adelante, brazo estirado al frente, todo el cuerpo detrás de la espada
    const strike = P(c, { torso: 16, x: c.u, legs: { near: { x: 0.45 * L, y: L - 1.1 }, far: { x: -0.35 * L, y: L - 0.5, toe: 30 } },
      arms: { near: { shoulder: 88, elbow: 0 }, far: { shoulder: -30, elbow: 40 } }, head: { dx: c.u }, face: { eyes: 'angry', mouth: 'grin' }, support: 'near' });
    // sobrepaso: la espada sigue de largo y baja
    const follow = P(c, { ...strike, torso: 18, arms: { near: { shoulder: 62, elbow: 6 }, far: { shoulder: -24, elbow: 40 } } });
    const recover = P(c, { torso: 10, legs: feet(c, 0.35, 0.24), arms: { near: { shoulder: 35, elbow: 55 }, far: { shoulder: 15, elbow: 50 } }, face: angry, support: 'both' });
    // ángulo de la hoja por vista: atrás y un poco arriba al cargar, al frente al pegar, bajando al seguir
    // de frente y de espalda el barrido cruza el cuerpo de un lado al otro
    const rest = swordAt({ back: 70 });
    const back1 = swordAt({ side: 196, se: 200, ne: 205, front: -35, back: -145 });
    const back2 = swordAt({ side: 200, se: 205, ne: 210, front: -45, back: -135 });
    // en el cuadro del golpe, la estela: el filo dio la vuelta por detrás (arriba en la vista 3/4) hasta el frente
    const hit1: PropState = { ...swordAt({ side: 0, se: 18, ne: -18, front: 140, back: 40 }), smear: { side: [262, 360], se: [270, 378], ne: [250, 342], front: [30, 140], back: [-80, 40] } };
    const hit2 = swordAt({ side: 34, se: 48, ne: 14, front: 160, back: 20 });
    const props = [rest, back1, back2, hit1, hit2, rest, rest];
    return [guard, wind, windHold, strike, follow, recover, guard].map((p, i) => ({ ...p, props: [props[i]] }));
  },
};

// ---------- golpe recibido ----------

export const hit: AnimDef = {
  name: 'hit', pack: 'basic', fps: 12, loop: false, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L;
    const ouch = { eyes: 'hurt' as const, mouth: 'o' as const };
    const impact = P(c, { torso: -14, x: -c.u, head: { tilt: -12, dx: -c.u }, legs: { near: { x: 0.2 * L, y: L - 0.6 }, far: { x: -0.25 * L, y: L - 0.6 } },
      arms: { near: { shoulder: -40, elbow: 50, spread: 30 }, far: { shoulder: 15, elbow: 40, spread: 30 } }, face: ouch, support: 'both' });
    const recoil = P(c, { ...impact, torso: -17, x: -2 * c.u, head: { tilt: -14, dx: -c.u }, legs: { near: { x: 0.15 * L, y: L - 0.8 }, far: { x: -0.35 * L, y: L - 0.8 } } });
    const catchUp = P(c, { torso: 6, legs: feet(c, 0.3, 0.2), arms: { near: { shoulder: 20, elbow: 30 }, far: { shoulder: 15, elbow: 30 } }, face: { eyes: 'angry', mouth: 'line' }, support: 'both' });
    const settle = P(c, { torso: 2, arms: { near: { shoulder: 5, elbow: 15 }, far: { shoulder: 5, elbow: 15 } }, support: 'both' });
    return [impact, recoil, recoil, catchUp, settle, P(c, { support: 'both' })];
  },
};

// ---------- bloquear con escudo ----------

export const block: AnimDef = {
  name: 'block_shield', pack: 'rpg', fps: 10, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 3 / 7 }],
  build: (c) => {
    const firm = { eyes: 'angry' as const, mouth: 'line' as const };
    const guard = P(c, { torso: 3, legs: feet(c, 0.2, 0.22), arms: { near: { shoulder: 20, elbow: 40 }, far: { shoulder: 35, elbow: 50 } }, support: 'both' });
    const raise = P(c, { torso: 6, legs: feet(c, 0.35, 0.24), arms: { near: { shoulder: 25, elbow: 60 }, far: { shoulder: 60, elbow: 40 } }, face: firm, support: 'both' });
    const brace = P(c, { torso: 10, legs: feet(c, 0.5, 0.26), arms: { near: { shoulder: 30, elbow: 60 }, far: { shoulder: 75, elbow: 35 } }, face: firm, support: 'both' });
    // la sacudida: el golpe empuja un pixel atrás y cierra los ojos
    const jolt = P(c, { ...brace, x: -c.u, torso: 6, head: { dy: 1 }, face: { eyes: 'closed', mouth: 'line' } });
    // el escudo levantado va delante de todo (si no, la cabeza grande del chibi lo tapa)
    const shield = (front: boolean): PropState => ({ kind: 'shield', at: 'handFar', front });
    return [guard, raise, brace, jolt, brace, raise, guard].map((p, i) => ({ ...p, props: [sword, shield(i > 0 && i < 6)] }));
  },
};

// ---------- respirar ----------

export const idle: AnimDef = {
  name: 'idle', pack: 'basic', fps: 6, loop: true, steady: true, views: ['side', 'front', 'back'],
  build: (c) => {
    // inhala (sube el pecho y abre un poco los hombros), sostiene, exhala; parpadea al final
    const breath = [0, 0, -1, -1, -1, 0, 0, 0];
    const shoulders = [0, 2, 4, 4, 3, 1, 0, 0];
    return breath.map((b, i) => P(c, {
      torso: 2, head: { dy: b },
      arms: { near: { shoulder: -3 + shoulders[i], elbow: 12 }, far: { shoulder: 3 - shoulders[i] * 0.5, elbow: 12 } },
      face: { eyes: i === 6 ? 'closed' : 'open' }, support: 'both',
    }));
  },
};

export const PREMIUM: AnimDef[] = [idle, walk, run, attack, hit, block];
const byName = new Map(PREMIUM.map((a) => [a.name, a]));

/** La versión premium de una animación, si existe. */
export function premiumAnim(name: string): AnimDef | undefined {
  return byName.get(name);
}
