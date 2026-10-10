import type { Pose, PropState } from '../rig/pose';
import { type AnimDef, type Ctx, P, feet } from './types';

/**
 * Atletismo premium: poses clave de cada prueba como las vería un entrenador, en 8 direcciones.
 *
 * Las pruebas de campo se leen de lado y en diagonal (lateral): de frente y de espalda usan la diagonal más cercana.
 * Los saltos que no caben en la celda (garrocha, salto largo) se dibujan cerca del piso y cada cuadro dice cuánto
 * sube el juego el sprite sobre su sombra (rise). Los eventos marcan los pasos, el despegue, la suelta del
 * implemento y el aterrizaje, para sonidos, polvo y el momento exacto en que sale la bala o la jabalina.
 */

/** Cambia la pierna y el brazo de adelante por los de atrás: la segunda mitad de una zancada. */
function swap(p: Pose): Pose {
  return {
    ...p,
    legs: { near: { ...p.legs.far }, far: { ...p.legs.near } },
    arms: { near: { ...p.arms.far }, far: { ...p.arms.near } },
    support: p.support === 'near' ? 'far' : p.support === 'far' ? 'near' : p.support,
  };
}

/** Zancada de velocista: más rodilla, más inclinación y brazos a 90° que bombean de la cadera a la cara. */
function sprintKeys(c: Ctx, lean = 14): Pose[] {
  const L = c.L, u = c.u;
  const S = (0.62 * L) / Math.max(0.8, c.build);
  const back = -c.u;
  const face = { eyes: 'angry' as const, mouth: 'grin' as const };
  return [
    // contacto: el pie cae casi debajo de la cadera (un velocista no frena con el talón)
    P(c, { x: back, torso: lean, legs: { near: { x: S * 0.45, y: L - 0.3, toe: 10 }, far: { x: -S * 0.9, y: L - 0.3 - 0.36 * L, toe: 20 } },
      arms: { near: { shoulder: -50, elbow: 80 }, far: { shoulder: 55, elbow: 95 } }, face, support: 'near' }),
    // bajada corta: el talón de atrás ya va hacia el glúteo
    P(c, { x: back, torso: lean + 2, legs: { near: { x: S * 0.05, y: L - 0.75, toe: 0 }, far: { x: -S * 0.3, y: L - 0.75 - 0.6 * L, toe: 30 } },
      arms: { near: { shoulder: -30, elbow: 85 }, far: { shoulder: 35, elbow: 95 } }, face, support: 'near' }),
    // impulso: pierna de apoyo estirada atrás, rodilla de la otra arriba al frente (muslo casi horizontal)
    P(c, { x: back, torso: lean + 2, legs: { near: { x: -S * 0.7, y: L - 0.45, toe: 8 }, far: { x: S * 0.55, y: L - 0.45 - 0.55 * L, toe: 10 } },
      arms: { near: { shoulder: 45, elbow: 90 }, far: { shoulder: -55, elbow: 80 } }, face, support: 'near' }),
    // vuelo: las dos en el aire, la rodilla de adelante sigue arriba
    P(c, { x: back, torso: lean + 1, air: Math.max(1, Math.round(1.5 * u)), legs: { near: { x: -S * 0.95, y: 0.7 * L, toe: 40 }, far: { x: S * 0.75, y: 0.62 * L, toe: 5 } },
      arms: { near: { shoulder: 55, elbow: 90 }, far: { shoulder: -60, elbow: 80 } }, face }),
  ];
}

export const sprint: AnimDef = {
  name: 'sprint', pack: 'athletics', fps: 16, loop: true, steady: true, hairTrail: -1, views: ['side', 'front', 'back'],
  events: [{ type: 'paso', phase: 0, foot: 'near' }, { type: 'paso', phase: 0.5, foot: 'far' }],
  build: (c) => {
    const k = sprintKeys(c);
    // la pierna de atrás llega un pixel menos (su cadera está un pixel más abajo de lado, y estirada no da más):
    // la de adelante se dobla ese pixel también, así las dos mitades del ciclo quedan a la misma altura
    const near = k.map((p) => (p.support === 'near' ? { ...p, legs: { ...p.legs, near: { ...p.legs.near, y: p.legs.near.y - 1 } } } : p));
    return [...near, ...k.map(swap)];
  },
};

// ---------- salida de tacos ----------

export const sprintStart: AnimDef = {
  name: 'sprint_start', pack: 'athletics', lateral: true, fps: 12, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'despegue', phase: 4 / 10 }, { type: 'paso', phase: 5 / 10, foot: 'far' }, { type: 'paso', phase: 7 / 10, foot: 'near' }],
  build: (c) => {
    const L = c.L;
    // "a sus marcas": rodilla de atrás en el piso, manos en la línea, mirada abajo
    // el ángulo del hombro es respecto al tronco: con el tronco a 72° adelante, +75 deja las manos en la pista
    const marks = P(c, { torso: 72, x: -L, head: { tilt: 20 }, legs: { near: { x: 0.25 * L, y: 0.5 * L, toe: 0 }, far: { x: -0.55 * L, y: 0.35 * L, toe: 70 } },
      arms: { near: { shoulder: 75, elbow: 0 }, far: { shoulder: 80, elbow: 0 } }, face: { eyes: 'open', mouth: 'line' }, support: 'both' });
    // "listos": la cadera sube por encima de los hombros, todo el peso en las manos y el pie de adelante
    const set = P(c, { ...marks, torso: 58, head: { tilt: 12 }, legs: { near: { x: 0.22 * L, y: 0.7 * L, toe: 0 }, far: { x: -0.62 * L, y: 0.62 * L, toe: 55 } } });
    const setHold = P(c, { ...set, head: { tilt: 10, dy: 1 } });
    // disparo: empuja con las dos piernas, la de atrás sale con la rodilla al pecho, brazos opuestos grandes
    const go = P(c, { torso: 45, x: -0.6 * L, legs: { near: { x: -0.6 * L, y: 0.78 * L, toe: 40 }, far: { x: 0.35 * L, y: 0.35 * L, toe: 10 } },
      arms: { near: { shoulder: 70, elbow: 70 }, far: { shoulder: -70, elbow: 40 } }, face: { eyes: 'angry', mouth: 'grin' }, support: 'near' });
    // aceleración: el cuerpo se va enderezando paso a paso
    const k = sprintKeys(c, 32), k2 = sprintKeys(c, 24), k3 = sprintKeys(c, 16);
    return [marks, marks, set, setHold, go, swap(k[0]), swap(k[2]), k2[0], k2[2], k3[0]];
  },
};

// ---------- vallas ----------

export const hurdles: AnimDef = {
  name: 'hurdles', pack: 'athletics', lateral: true, fps: 14, loop: true, hairTrail: -1, views: ['side', 'front', 'back'],
  events: [{ type: 'despegue', phase: 2 / 8 }, { type: 'aterriza', phase: 5 / 8, foot: 'near' }],
  build: (c) => {
    const L = c.L, u = c.u;
    const k = sprintKeys(c, 14);
    const hi = Math.max(2, Math.round(4 * u));
    const face = { eyes: 'angry' as const, mouth: 'line' as const };
    // ataque: la pierna de ataque sube estirada, el tronco se dobla sobre ella, el brazo contrario la busca
    const attack = P(c, { torso: 34, x: -u, air: Math.round(hi / 2), legs: { near: { x: 0.9 * L, y: 0.25 * L, toe: 0 }, far: { x: -0.65 * L, y: 0.6 * L, toe: 40 } },
      arms: { near: { shoulder: -45, elbow: 60 }, far: { shoulder: 95, elbow: 10 } }, face });
    // sobre la valla: la pierna de atrás pasa abierta de costado, con la rodilla alta
    const over = P(c, { torso: 36, x: -u, air: hi, legs: { near: { x: 0.85 * L, y: 0.35 * L, toe: 0 }, far: { x: -0.35 * L, y: 0.15 * L, toe: 60, z: 2 } },
      arms: { near: { shoulder: -40, elbow: 60 }, far: { shoulder: 80, elbow: 20 } }, face });
    // bajada: la de ataque baja rápido a buscar la pista, la de atrás cruza al frente
    const snap = P(c, { torso: 24, air: Math.round(hi / 2), legs: { near: { x: 0.2 * L, y: 0.9 * L, toe: 10 }, far: { x: 0.15 * L, y: 0.35 * L, toe: 30, z: 1 } },
      arms: { near: { shoulder: 20, elbow: 70 }, far: { shoulder: 30, elbow: 60 } }, face });
    const seq: Pose[] = [k[0], k[2], attack, over, snap, k[0], swap(k[2]), swap(k[0])];
    // la valla queda en la pista y el atleta pasa: se corre hacia atrás cuadro a cuadro
    return seq.map((p, i) => ({ ...p, props: [{ kind: 'hurdle', at: 'ground', x: (1.3 - i * 0.42) * L, behind: i > 3 } as PropState] }));
  },
};

// ---------- salto largo ----------

export const longJump: AnimDef = {
  name: 'long_jump', pack: 'athletics', lateral: true, fps: 12, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'despegue', phase: 3 / 12 }, { type: 'aterriza', phase: 8 / 12 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const k = sprintKeys(c, 12);
    const R = (v: number) => Math.round(v * u);
    // penúltimo paso: baja la cadera para poder subir
    const pen = P(c, { torso: 6, legs: { near: { x: 0.35 * L, y: L - 1.6, toe: 0 }, far: { x: -0.5 * L, y: L - 1.2, toe: 30 } },
      arms: { near: { shoulder: -40, elbow: 60 }, far: { shoulder: 40, elbow: 70 } }, face: { eyes: 'angry', mouth: 'line' }, support: 'near' });
    // pique: pierna de pique estirada debajo, la otra rodilla al frente y arriba, brazo contrario arriba
    const take = P(c, { torso: -2, legs: { near: { x: -0.15 * L, y: L - 0.1, toe: 40 }, far: { x: 0.45 * L, y: 0.35 * L, toe: 10 } },
      arms: { near: { shoulder: 110, elbow: 30 }, far: { shoulder: -40, elbow: 30 } }, face: { eyes: 'angry', mouth: 'open' }, support: 'near' });
    // vuelo "colgado": el cuerpo se estira, piernas atrás, brazos atrás y arriba
    const hang = P(c, { torso: -12, rise: R(8), legs: { near: { x: -0.3 * L, y: 0.75 * L, toe: 40 }, far: { x: -0.1 * L, y: 0.8 * L, toe: 40 } },
      arms: { near: { shoulder: -60, elbow: 20 }, far: { shoulder: -50, elbow: 20 } }, face: { mouth: 'open' } });
    const hang2 = P(c, { ...hang, rise: R(11), torso: -14 });
    // navaja: todo se cierra hacia adelante, piernas al frente y brazos que bajan a buscarlas
    const sail = P(c, { torso: 30, rise: R(8), legs: { near: { x: 0.8 * L, y: 0.4 * L, toe: 0 }, far: { x: 0.75 * L, y: 0.45 * L, toe: 0 } },
      arms: { near: { shoulder: 70, elbow: 10 }, far: { shoulder: 75, elbow: 10 } }, face: { eyes: 'closed', mouth: 'o' } });
    const reach = P(c, { ...sail, rise: R(3), torso: 38, arms: { near: { shoulder: 40, elbow: 10 }, far: { shoulder: 45, elbow: 10 } } });
    // cae en la arena sentado, las rodillas absorben y el cuerpo se va adelante para no caer atrás
    const sand = P(c, { torso: 40, x: -u, legs: { near: { x: 0.65 * L, y: 0.4 * L, toe: 0 }, far: { x: 0.6 * L, y: 0.45 * L, toe: 0 } },
      arms: { near: { shoulder: 50, elbow: 20 }, far: { shoulder: 45, elbow: 20 } }, face: { eyes: 'closed', mouth: 'o' }, support: 'both' });
    const fold = P(c, { ...sand, torso: 48, head: { tilt: 8 } });
    const up = P(c, { torso: 20, legs: feet(c, 0.6, 0.2), arms: { near: { shoulder: 20, elbow: 30 }, far: { shoulder: 20, elbow: 30 } }, face: { eyes: 'happy', mouth: 'grin' }, support: 'both' });
    const proud = P(c, { torso: 2, arms: { near: { shoulder: 60, elbow: 100, spread: 30 }, far: { shoulder: 60, elbow: 100, spread: 30 } }, face: { eyes: 'happy', mouth: 'grin' }, support: 'both' });
    return [k[0], k[2], pen, take, hang, hang2, sail, reach, sand, fold, up, proud];
  },
};

// ---------- salto con garrocha ----------

/**
 * Garrocha: carrera con la garrocha, clavada, despegue, péndulo, se pone de cabeza, se empuja, pasa la varilla
 * de espaldas y cae de espalda en la colchoneta. La garrocha se dobla al cargar y se suelta arriba.
 */
export const poleVault: AnimDef = {
  name: 'pole_vault', pack: 'athletics', lateral: true, fps: 12, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'paso', phase: 0, foot: 'near' }, { type: 'despegue', phase: 3 / 14 }, { type: 'suelta', phase: 7 / 14 }, { type: 'aterriza', phase: 11 / 14 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const R = (v: number) => Math.round(v * u);
    // la garrocha va siempre en la capa de implementos: es larga y sale de la celda, no cuenta como cuerpo
    const pole = (side: number, bend = 0): PropState => ({ kind: 'pole', at: 'handNear', angles: { side, se: side, ne: side, front: side + 90, back: side - 90 }, bend, front: true });
    const face = { eyes: 'angry' as const, mouth: 'line' as const };
    const k = sprintKeys(c, 10);
    // carrera con la garrocha: las dos manos atrás de la cadera y al pecho, la punta alta adelante
    const carryArms = { near: { shoulder: -20, elbow: 70 }, far: { shoulder: 60, elbow: 80 } };
    const run1 = { ...k[0], arms: carryArms, props: [pole(-28)] };
    const run2 = { ...k[2], arms: carryArms, props: [pole(-22)] };
    // clavada: la punta baja al cajón, los brazos suben la garrocha por encima de la cabeza
    const plant = P(c, { torso: 4, legs: { near: { x: 0.3 * L, y: L - 0.6 }, far: { x: -0.45 * L, y: L - 0.8, toe: 30 } },
      arms: { near: { shoulder: 150, elbow: 20 }, far: { shoulder: 125, elbow: 30 } }, face, support: 'near', props: [pole(28)] });
    // despegue: pierna de pique estirada, la otra rodilla arriba, la garrocha empieza a doblarse
    const take = P(c, { torso: -4, rise: R(4), legs: { near: { x: -0.35 * L, y: L - 0.1, toe: 50 }, far: { x: 0.4 * L, y: 0.35 * L, toe: 10 } },
      arms: { near: { shoulder: 165, elbow: 10 }, far: { shoulder: 140, elbow: 20 } }, face: { eyes: 'angry', mouth: 'open' }, props: [pole(48, 5)] });
    // péndulo: cuelga de la garrocha doblada y las piernas suben al frente
    const swing = P(c, { torso: -45, rise: R(12), legs: { near: { x: 0.55 * L, y: 0.35 * L, toe: 0 }, far: { x: 0.5 * L, y: 0.45 * L, toe: 0 } },
      arms: { near: { shoulder: 170, elbow: 5 }, far: { shoulder: 160, elbow: 10 } }, face, props: [pole(72, 8)] });
    // vuelta atrás: queda boca arriba con las piernas hacia el cielo
    const rock = P(c, { torso: -110, rise: R(22), legs: { near: { x: 0.25 * L, y: -0.75 * L, toe: 0 }, far: { x: 0.15 * L, y: -0.7 * L, toe: 0 } },
      arms: { near: { shoulder: 175, elbow: 5 }, far: { shoulder: 170, elbow: 5 } }, face, props: [pole(88, 5)] });
    // de cabeza: todo estirado sobre la garrocha que se endereza y lo lanza
    // de cabeza las piernas van casi estiradas (estiradas del todo no cabe un adulto robusto en la celda)
    const invert = P(c, { torso: 180, rise: R(32), legs: { near: { x: 0.15 * L, y: -0.6 * L, toe: 0 }, far: { x: 0.05 * L, y: -0.6 * L, toe: 0 } },
      arms: { near: { shoulder: 160, elbow: 10 }, far: { shoulder: 158, elbow: 10 } }, face, props: [pole(90, 0)] });
    // empuje y suelta: gira, se empuja con los brazos y la garrocha se va
    const push = P(c, { torso: 150, rise: R(38), legs: { near: { x: 0.25 * L, y: -0.8 * L, toe: 0 }, far: { x: 0.15 * L, y: -0.85 * L, toe: 0 } },
      arms: { near: { shoulder: 120, elbow: 0 }, far: { shoulder: 115, elbow: 0 } }, face: { eyes: 'angry', mouth: 'grin' } });
    // sobre la varilla: boca abajo, se arquea y quita los brazos
    const arch = P(c, { torso: 100, rise: R(38), legs: { near: { x: -0.3 * L, y: 0.6 * L, toe: 60 }, far: { x: -0.35 * L, y: 0.55 * L, toe: 60 } },
      arms: { near: { shoulder: 170, elbow: 20 }, far: { shoulder: 165, elbow: 20 } }, face: { eyes: 'open', mouth: 'o' } });
    // caída de espalda hacia la colchoneta
    const fall = P(c, { torso: -70, rise: R(26), legs: { near: { x: 0.6 * L, y: 0.2 * L, toe: 0 }, far: { x: 0.55 * L, y: 0.3 * L, toe: 0 } },
      arms: { near: { shoulder: 140, elbow: 30 }, far: { shoulder: 150, elbow: 30 } }, face: { eyes: 'happy', mouth: 'open' } });
    const fall2 = { ...fall, rise: R(12) };
    // en la colchoneta: de espalda, piernas arriba que rebotan
    const mat = P(c, { torso: -88, roll: 0, legs: { near: { x: 0.55 * L, y: -0.1 * L, toe: 0 }, far: { x: 0.5 * L, y: 0, toe: 0 } },
      arms: { near: { shoulder: 150, elbow: 20 }, far: { shoulder: 160, elbow: 20 } }, face: { eyes: 'happy', mouth: 'grin' }, fit: true });
    const bounce = { ...mat, air: Math.max(1, Math.round(u)) };
    const sit = P(c, { torso: -20, legs: { near: { x: 0.6 * L, y: 0.4 * L }, far: { x: 0.55 * L, y: 0.45 * L } },
      arms: { near: { shoulder: 150, elbow: 30, spread: 30 }, far: { shoulder: 150, elbow: 30, spread: 30 } }, face: { eyes: 'happy', mouth: 'grin' }, support: 'both' });
    // en el aire el cuerpo da la vuelta alrededor de la garrocha: se centra en la celda (el juego lo sube con rise)
    const air = (p: Pose): Pose => ({ ...p, fit: true });
    return [run1, run2, plant, take, air(swing), air(rock), air(invert), air(push), air(arch), air(fall), air(fall2), mat, bounce, sit];
  },
};

// ---------- lanzamiento de bala ----------

/**
 * Bala: con la bala pegada al cuello, se agacha sobre la pierna de atrás, desliza, llega a la posición de fuerza
 * (peso atrás, piernas abiertas), empuja de abajo hacia arriba sin lanzar con el brazo y hace el cambio de pies.
 */
export const shotPut: AnimDef = {
  name: 'shot_put', pack: 'athletics', lateral: true, fps: 12, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'suelta', phase: 6 / 11 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const neck = { shoulder: 110, elbow: 150 };
    const shot: PropState = { kind: 'shot', at: 'handNear', front: true };
    const face = { eyes: 'angry' as const, mouth: 'line' as const };
    const ready = P(c, { torso: 0, legs: feet(c, 0.2, 0.25), arms: { near: neck, far: { shoulder: 95, elbow: 20 } }, face, support: 'both' });
    // agachado sobre la pierna de atrás, el tronco encima de la rodilla
    const crouch = P(c, { torso: 30, x: u, legs: { near: { x: 0.15 * L, y: L - 2.2 }, far: { x: -0.25 * L, y: L - 1.6, toe: 30 } },
      arms: { near: neck, far: { shoulder: 60, elbow: 30 } }, face, support: 'near' });
    // deslizamiento: la pierna libre patea hacia la tabla, el cuerpo se queda atrás
    const glide = P(c, { torso: 25, legs: { near: { x: -0.2 * L, y: L - 1.6 }, far: { x: 0.65 * L, y: L - 1.6, toe: 0 } },
      arms: { near: neck, far: { shoulder: 70, elbow: 20 } }, face, support: 'near' });
    // posición de fuerza: piernas abiertas, peso atrás, el hombro libre adelante
    const power = P(c, { torso: -10, x: -u, legs: { near: { x: -0.4 * L, y: L - 1.6 }, far: { x: 0.45 * L, y: L - 0.6, toe: 0 } },
      arms: { near: neck, far: { shoulder: 100, elbow: 10 } }, face, support: 'both' });
    // empuje: cadera adelante, el codo alto detrás de la bala
    const drive = P(c, { torso: 0, legs: { near: { x: -0.4 * L, y: L - 0.6, toe: 40 }, far: { x: 0.35 * L, y: L - 0.2 } },
      arms: { near: { shoulder: 120, elbow: 100 }, far: { shoulder: 40, elbow: 40 } }, face: { eyes: 'angry', mouth: 'grin' }, support: 'far' });
    // suelta: el brazo termina estirado arriba y adelante, los dedos empujan
    const release = P(c, { torso: 12, legs: { near: { x: -0.35 * L, y: L - 0.2, toe: 60 }, far: { x: 0.3 * L, y: L - 0.1 } },
      arms: { near: { shoulder: 140, elbow: 0 }, far: { shoulder: -20, elbow: 30 } }, face: { eyes: 'angry', mouth: 'open' }, support: 'far' });
    // cambio de pies: la de atrás pasa adelante para no pisar fuera del círculo
    const reverse = P(c, { torso: 30, legs: { near: { x: 0.3 * L, y: L - 1 }, far: { x: -0.5 * L, y: L - 1.2, toe: 30 } },
      arms: { near: { shoulder: 70, elbow: 10 }, far: { shoulder: -30, elbow: 40 } }, face: { eyes: 'open', mouth: 'o' }, support: 'near' });
    const balance = P(c, { ...reverse, torso: 24, legs: { near: { x: 0.2 * L, y: L - 0.8 }, far: { x: -0.6 * L, y: 0.6 * L, toe: 40 } } });
    const settle = P(c, { torso: 6, legs: feet(c, 0.3, 0.22), arms: { near: { shoulder: 20, elbow: 20 }, far: { shoulder: 10, elbow: 20 } }, face: { eyes: 'open', mouth: 'line' }, support: 'both' });
    const seq = [ready, crouch, crouch, glide, power, drive, release, reverse, balance, settle, P(c, { support: 'both' })];
    return seq.map((p, i) => ({ ...p, props: i <= 6 ? [shot] : undefined }));
  },
};

// ---------- lanzamiento de jabalina ----------

/**
 * Jabalina: carrera con la jabalina sobre el hombro, retira el brazo atrás bien estirado, pasos cruzados con el
 * cuerpo echado atrás, bloqueo con la pierna de adelante, latigazo por encima del hombro y freno.
 */
export const javelin: AnimDef = {
  name: 'javelin', pack: 'athletics', lateral: true, fps: 14, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'paso', phase: 0, foot: 'near' }, { type: 'paso', phase: 6 / 12, foot: 'far' }, { type: 'suelta', phase: 7 / 12 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const jav = (side: number, front = true): PropState => ({ kind: 'javelin', at: 'handNear', angles: { side, se: side + 6, ne: side - 6, front: 90 + side * 0.4, back: -90 - side * 0.4 }, ...(front ? { front: true } : {}) });
    const face = { eyes: 'angry' as const, mouth: 'line' as const };
    const k = sprintKeys(c, 8);
    // carrera: la mano a la altura de la oreja, la jabalina horizontal apuntando un poco arriba
    const carry = { near: { shoulder: 130, elbow: 135 }, far: { shoulder: 30, elbow: 70 } };
    const run1 = { ...k[0], arms: carry, props: [jav(-12)] };
    const run2 = { ...k[2], arms: { ...carry, far: { shoulder: -20, elbow: 70 } }, props: [jav(-12)] };
    // retiro: el brazo se va atrás estirado, el pecho se abre
    const withdraw = P(c, { torso: -6, legs: { near: { x: 0.35 * L, y: L - 0.5 }, far: { x: -0.4 * L, y: L - 0.6, toe: 20 } },
      arms: { near: { shoulder: -95, elbow: 5 }, far: { shoulder: 80, elbow: 30 } }, face, support: 'near', props: [jav(-20)] });
    // pasos cruzados: el tronco atrás, la pierna de atrás cruza por delante
    const cross1 = P(c, { torso: -16, legs: { near: { x: -0.3 * L, y: L - 0.7 }, far: { x: 0.35 * L, y: 0.55 * L, toe: 10 } },
      arms: { near: { shoulder: -100, elbow: 0 }, far: { shoulder: 85, elbow: 20 } }, face, support: 'near', props: [jav(-24)] });
    const impulse = P(c, { torso: -22, air: Math.max(1, Math.round(u)), legs: { near: { x: -0.5 * L, y: 0.75 * L, toe: 30 }, far: { x: 0.55 * L, y: 0.6 * L, toe: 0 } },
      arms: { near: { shoulder: -100, elbow: 0 }, far: { shoulder: 90, elbow: 15 } }, face, props: [jav(-26)] });
    // bloqueo: la pierna de adelante clava estirada, todo el cuerpo se frena y el brazo queda atrás
    const block = P(c, { torso: -20, legs: { near: { x: -0.45 * L, y: L - 1.2, toe: 20 }, far: { x: 0.55 * L, y: L - 0.1, toe: 0 } },
      arms: { near: { shoulder: -105, elbow: 5 }, far: { shoulder: 70, elbow: 20 } }, face: { eyes: 'angry', mouth: 'grin' }, support: 'far', props: [jav(-28)] });
    // latigazo: cadera, pecho, hombro y codo, en ese orden; suelta arriba y adelante
    const whip = P(c, { torso: 14, legs: { near: { x: -0.3 * L, y: L - 0.6, toe: 50 }, far: { x: 0.45 * L, y: L - 0.1 } },
      arms: { near: { shoulder: 150, elbow: 30 }, far: { shoulder: -30, elbow: 40 } }, face: { eyes: 'angry', mouth: 'open' }, support: 'far', props: [jav(-36)] });
    // freno: el cuerpo cae sobre la pierna de adelante, el brazo termina abajo
    const follow = P(c, { torso: 34, legs: { near: { x: -0.2 * L, y: L - 1, toe: 40 }, far: { x: 0.4 * L, y: L - 1.2 } },
      arms: { near: { shoulder: 50, elbow: 10 }, far: { shoulder: -40, elbow: 40 } }, face: { eyes: 'open', mouth: 'o' }, support: 'far' });
    const step = P(c, { torso: 20, legs: { near: { x: 0.35 * L, y: L - 0.8 }, far: { x: -0.2 * L, y: L - 0.6, toe: 30 } },
      arms: { near: { shoulder: 20, elbow: 30 }, far: { shoulder: 10, elbow: 30 } }, face: { eyes: 'open', mouth: 'line' }, support: 'near' });
    const watch = P(c, { torso: 4, head: { tilt: -10 }, legs: feet(c, 0.2, 0.22), arms: { near: { shoulder: 10, elbow: 20 }, far: { shoulder: 10, elbow: 20 } }, face: { eyes: 'open', mouth: 'o' }, support: 'both' });
    return [run1, run2, run1, withdraw, cross1, impulse, block, whip, follow, step, watch, watch];
  },
};

/** Las que son nuevas (no existían en el clásico). */
export const ATHLETICS_NEW: AnimDef[] = [sprint, poleVault, shotPut, javelin];
/** Todas las de atletismo con calidad premium (las que ya existían se reemplazan en el perfil premium). */
export const ATHLETICS_PREMIUM: AnimDef[] = [sprint, sprintStart, hurdles, longJump, poleVault, shotPut, javelin];
