import type { Pose } from '../rig/pose';
import { type AnimDef, type Ctx, P, TAU } from './types';

/**
 * Natación premium. El cuerpo flota a una altura fija (hipH): las patadas no lo hacen rebotar. La superficie del agua
 * (water) tiñe lo que queda abajo, pone espuma y gotas donde entran las manos y los pies.
 *
 * Ángulos del brazo con el cuerpo acostado boca abajo (tronco a ~85°): 180 = estirado al frente pasando la cabeza,
 * 90 = hacia el fondo de la piscina, 0 = pegado al muslo, -90 = hacia el cielo (el recobro por encima del agua).
 */

/** Altura de la cadera y de la superficie: el nadador va con la espalda justo en la línea del agua. */
function float(c: Ctx) {
  const hip = Math.max(3, Math.round(0.62 * c.L));
  // acostado de verdad, brazos libres y un solo corrimiento para todo el ciclo (centrado en la celda)
  return { hipH: hip, water: hip + Math.max(1, Math.round(0.5 * c.u)), flat: true, freeArms: true, fit: 'shared' as const };
}

// ---------- crol ----------

export const swim: AnimDef = {
  name: 'swim', pack: 'swim', fps: 10, loop: true, strideL: 2, lateral: true, views: ['side', 'front', 'back'],
  // la mano de adelante entra al agua en el cuadro 0 y la otra en el 4
  events: [{ type: 'brazada', phase: 0 }, { type: 'brazada', phase: 4 / 8 }],
  build: (c) => {
    const L = c.L;
    const fl = float(c);
    const out: Pose[] = [];
    for (let i = 0; i < 8; i++) {
      // brazo de adelante: entra, tira por debajo hasta el muslo, sale con el codo alto y vuelve a entrar
      const arm = (k: number) => {
        const a = 180 - ((i + k) % 8) * 45;
        const under = a > 0;
        // tirón con el codo doblado (agarre), recobro con el codo alto y la mano relajada
        return { shoulder: a, elbow: under ? (a === 90 || a === 135 ? 40 : 15) : a === -90 ? 95 : 60 };
      };
      // patada de seis tiempos: piernas casi estiradas, rápidas y cortas
      const kick = Math.sin((i / 8) * TAU * 3) * 0.1 * L;
      // respira de lado cuando el brazo de este lado termina de tirar
      const breathe = i === 4 || i === 5;
      out.push(P(c, {
        torso: 86, x: -0.45 * L, ...fl,
        head: { tilt: breathe ? -30 : -18, yaw: breathe ? 70 : 0 },
        legs: { near: { x: -0.97 * L, y: 0.1 * L + kick, toe: 85 }, far: { x: -0.97 * L, y: 0.1 * L - kick, toe: 85 } },
        arms: { near: arm(0), far: arm(4) },
        face: { eyes: breathe ? 'open' : 'closed', mouth: breathe ? 'o' : 'line' },
      }));
    }
    return out;
  },
};

// ---------- espalda ----------

/** Espalda: boca arriba, brazos estirados como aspas que entran detrás de la cabeza. Avanza con la cabeza primero. */
export const swimBack: AnimDef = {
  name: 'swim_back', pack: 'swim', fps: 9, loop: true, strideL: 1.8, lateral: true, backward: true, views: ['side', 'front', 'back'],
  // cada mano entra detrás de la cabeza: la de lejos en el cuadro 0 y la de cerca en el 4
  events: [{ type: 'brazada', phase: 0 }, { type: 'brazada', phase: 4 / 8 }],
  build: (c) => {
    const L = c.L;
    const fl = float(c);
    const out: Pose[] = [];
    for (let i = 0; i < 8; i++) {
      // con el tronco boca arriba, 90 apunta al cielo: el brazo sube estirado, entra detrás de la cabeza y tira abajo
      const arm = (k: number) => {
        const a = ((i + k) % 8) * 45;
        return { shoulder: a, elbow: a > 180 && a < 315 ? 55 : 0 };
      };
      const kick = Math.sin((i / 8) * TAU * 3) * 0.1 * L;
      out.push(P(c, {
        torso: -86, x: 0.45 * L, ...fl,
        head: { tilt: 8 },
        legs: { near: { x: 0.97 * L, y: 0.1 * L + kick, toe: -80 }, far: { x: 0.97 * L, y: 0.1 * L - kick, toe: -80 } },
        arms: { near: arm(0), far: arm(4) },
        face: { eyes: 'open', mouth: 'line' },
      }));
    }
    return out;
  },
};

// ---------- pecho ----------

/**
 * Pecho: se desliza estirado, abre los brazos, los junta bajo la cara mientras saca la cabeza a respirar, recoge las
 * piernas (talones al glúteo) y patea como rana estirando todo de nuevo.
 */
export const swimBreast: AnimDef = {
  name: 'swim_breast', pack: 'swim', fps: 9, loop: true, strideL: 1.5, lateral: true, views: ['side', 'front', 'back'],
  // la patada: los brazos se estiran y la cabeza vuelve al agua (cuadro 5)
  events: [{ type: 'brazada', phase: 5 / 8 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const fl = float(c);
    const up = Math.max(1, Math.round(1.5 * u));
    const glide = P(c, { torso: 88, x: -0.45 * L, ...fl, head: { tilt: -10 },
      legs: { near: { x: -0.97 * L, y: 0.08 * L, toe: 85 }, far: { x: -0.97 * L, y: 0.1 * L, toe: 85 } },
      arms: { near: { shoulder: 172, elbow: 12 }, far: { shoulder: 170, elbow: 12 } }, face: { eyes: 'closed', mouth: 'line' } });
    // abre: las manos se separan hacia afuera
    const out = P(c, { ...glide, arms: { near: { shoulder: 160, elbow: 10, spread: 45 }, far: { shoulder: 160, elbow: 10, spread: 45 } } });
    // tira y respira: los codos se doblan, las manos van bajo el mentón y la cabeza sale
    const pull = P(c, { ...glide, torso: 72, hipH: fl.hipH + up, head: { tilt: -55 },
      arms: { near: { shoulder: 110, elbow: 100, spread: 30 }, far: { shoulder: 110, elbow: 100, spread: 30 } }, face: { eyes: 'open', mouth: 'o' } });
    // recoge: manos juntas al pecho que salen al frente, talones al glúteo con las rodillas abiertas
    const tuck = P(c, { ...pull, torso: 78, head: { tilt: -40 },
      legs: { near: { x: -0.45 * L, y: -0.15 * L, toe: 30, z: 2 }, far: { x: -0.45 * L, y: -0.1 * L, toe: 30, z: -2 } },
      arms: { near: { shoulder: 150, elbow: 80 }, far: { shoulder: 150, elbow: 80 } }, face: { eyes: 'open', mouth: 'line' } });
    // patada: las piernas empujan hacia atrás y afuera, los brazos se estiran y la cabeza vuelve al agua
    const kick = P(c, { ...glide, torso: 86, head: { tilt: -15 },
      legs: { near: { x: -0.85 * L, y: 0.3 * L, toe: 70, z: 2 }, far: { x: -0.85 * L, y: 0.3 * L, toe: 70, z: -2 } },
      arms: { near: { shoulder: 175, elbow: 10 }, far: { shoulder: 175, elbow: 10 } }, face: { eyes: 'closed', mouth: 'line' } });
    return [glide, glide, out, pull, tuck, kick, glide, glide];
  },
};

// ---------- mariposa ----------

/**
 * Mariposa: ondulación de delfín y los dos brazos juntos. Las manos entran al frente (salpican), tiran por debajo hasta
 * la cadera, salen atrás y vuelven barriendo bajo y abierto sobre el agua (como alas) mientras el pecho sale a respirar.
 * Dos patadas por brazada: una al entrar las manos y otra al terminar de tirar. La cadera sube cuando el pecho baja.
 *
 * Los ángulos de los brazos se piensan en el mundo (w): 90 = al frente sobre el agua, 0 = hacia el fondo, -90 = atrás.
 * El recobro va abierto (spread) y bajo: por encima de la cabeza el chibi lo taparía.
 */
export const swimFly: AnimDef = {
  name: 'swim_fly', pack: 'swim', fps: 10, loop: true, strideL: 2, lateral: true, views: ['side', 'front', 'back'],
  // las dos manos entran juntas al frente y salpican (cuadro 0)
  events: [{ type: 'brazada', phase: 0 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const fl = float(c);
    const R = (v: number) => Math.round(v * u);
    // cuadro a cuadro: tronco, brazo (mundo), apertura, codo, cabeza, cadera, piernas y si salpica
    const keys: { t: number; w: number; s: number; e: number; tilt: number; hip: number; kick: number; splash?: boolean; breathe?: boolean }[] = [
      { t: 96, w: 92, s: 15, e: 0, tilt: -8, hip: 1, kick: 0.28, splash: true }, // entran las manos, primera patada
      { t: 100, w: 78, s: 25, e: 15, tilt: -6, hip: 1.5, kick: -0.04 }, // el pecho presiona, la cadera arriba
      { t: 92, w: 38, s: 30, e: 70, tilt: -20, hip: 0.5, kick: 0.04 }, // agarre: codos altos bajo el agua
      { t: 78, w: -15, s: 15, e: 30, tilt: -40, hip: 0, kick: 0.3 }, // empuje hasta la cadera, segunda patada
      { t: 64, w: -75, s: 35, e: 10, tilt: -62, hip: -1.5, kick: 0.08, breathe: true }, // salen atrás, respira
      { t: 62, w: 145, s: 45, e: 5, tilt: -55, hip: -1.5, kick: 0.02, breathe: true }, // recobro abierto como alas
      { t: 74, w: 112, s: 30, e: 0, tilt: -25, hip: -0.5, kick: -0.04 }, // los brazos vienen al frente, la cabeza baja
      { t: 88, w: 98, s: 30, e: 0, tilt: -10, hip: 0.5, kick: -0.04 }, // listos para entrar
    ];
    return keys.map((k) => {
      const arm = { shoulder: k.w + k.t, elbow: k.e, spread: k.s };
      return P(c, {
        torso: k.t, x: -0.45 * L, ...fl, hipH: fl.hipH + R(k.hip), splash: !!k.splash,
        head: { tilt: k.tilt },
        // patada de delfín: las dos piernas juntas, el pie de lejos apenas atrás
        legs: { near: { x: -0.95 * L, y: (0.1 + k.kick) * L, toe: 80 }, far: { x: -0.93 * L, y: (0.12 + k.kick) * L, toe: 80 } },
        arms: { near: arm, far: { ...arm, spread: k.s + 5 } },
        face: { eyes: k.breathe ? 'open' : 'closed', mouth: k.breathe ? 'o' : 'line' },
      });
    });
  },
};

// ---------- flotar ----------

/** Flotar parado: el agua al pecho, los brazos remando a los lados y las piernas en batidora. */
export const treadWater: AnimDef = {
  name: 'tread_water', pack: 'swim', fps: 8, loop: true, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L, u = c.u;
    const hip = Math.max(3, Math.round(0.95 * L));
    const out: Pose[] = [];
    for (let i = 0; i < 8; i++) {
      const t = (i / 8) * TAU;
      out.push(P(c, {
        torso: 6, hipH: hip + Math.round(Math.sin(t * 2) * 0.5 * u), water: hip + Math.round(c.d.torsoH * 0.75),
        head: { tilt: -4 },
        // batidora: cada pierna dibuja un círculo, la otra a contratiempo
        legs: { near: { x: 0.3 * L + Math.cos(t) * 0.2 * L, y: 0.6 * L + Math.sin(t) * 0.15 * L, toe: 20 },
          far: { x: -0.1 * L + Math.cos(t + Math.PI) * 0.2 * L, y: 0.6 * L + Math.sin(t + Math.PI) * 0.15 * L, toe: 20 } },
        // remada: las manos barren a los lados, palmas abajo
        arms: { near: { shoulder: 50 + Math.sin(t) * 18, elbow: 40, spread: 50 }, far: { shoulder: 50 - Math.sin(t) * 18, elbow: 40, spread: 50 } },
        face: { eyes: i === 6 ? 'closed' : 'open', mouth: 'line' },
      }));
    }
    return out;
  },
};

// ---------- clavado ----------

/**
 * Salida de natación: en el banco se agacha y agarra el borde, se impulsa con los brazos al frente, vuela estirado,
 * entra al agua de cabeza (salpicadura grande) y se desliza debajo del agua antes de empezar a nadar.
 */
export const dive: AnimDef = {
  name: 'dive', pack: 'swim', fps: 12, loop: false, travel: { ref: 'run', k: [0, 0, 0.4, 1, 1, 0.9, 0.6, 0.4, 0.3, 0.2] }, lateral: true, views: ['side', 'front', 'back'],
  events: [{ type: 'despegue', phase: 3 / 11 }, { type: 'impacto', phase: 6 / 11 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const R = (v: number) => Math.round(v * u);
    const fl = float(c);
    const block = R(10);
    const ready = P(c, { rise: block, head: { tilt: 0 }, arms: { near: { shoulder: 10, elbow: 10 }, far: { shoulder: 10, elbow: 10 } }, face: { eyes: 'open', mouth: 'line' } });
    // en sus marcas: agachado, las manos agarran el borde del banco
    const grab = P(c, { rise: block, torso: 70, x: -0.3 * L, head: { tilt: 15 }, legs: { near: { x: 0.25 * L, y: 0.6 * L }, far: { x: -0.25 * L, y: 0.55 * L, toe: 40 } },
      arms: { near: { shoulder: 75, elbow: 0 }, far: { shoulder: 80, elbow: 0 } }, face: { eyes: 'open', mouth: 'line' } });
    // impulso: las piernas empujan, los brazos se tiran al frente
    const push = P(c, { rise: block, torso: 60, x: -0.2 * L, legs: { near: { x: -0.45 * L, y: 0.85 * L, toe: 50 }, far: { x: -0.5 * L, y: 0.8 * L, toe: 50 } },
      arms: { near: { shoulder: 170, elbow: 0 }, far: { shoulder: 175, elbow: 0 } }, face: { eyes: 'angry', mouth: 'line' } });
    // vuelo: todo estirado como una flecha, un poco de cabeza
    const fly = P(c, { rise: block + R(6), torso: 95, x: -0.4 * L, legs: { near: { x: -0.97 * L, y: -0.05 * L, toe: 85 }, far: { x: -0.97 * L, y: 0, toe: 85 } },
      arms: { near: { shoulder: 180, elbow: 0 }, far: { shoulder: 180, elbow: 0 } }, face: { eyes: 'closed', mouth: 'line' }, fit: true });
    const fly2 = { ...fly, rise: block + R(2), torso: 115 };
    // entrada: de cabeza, el agua a la altura de la cintura y salpicadura grande
    const entry = P(c, { torso: 135, x: -0.2 * L, hipH: fl.hipH + R(6), water: fl.water, splash: true, legs: { near: { x: -0.7 * L, y: -0.7 * L, toe: 85 }, far: { x: -0.7 * L, y: -0.65 * L, toe: 85 } },
      arms: { near: { shoulder: 180, elbow: 0 }, far: { shoulder: 180, elbow: 0 } }, face: { eyes: 'closed', mouth: 'line' }, fit: true });
    // debajo del agua: deslizamiento en flecha, todo azul
    const under = P(c, { torso: 90, x: -0.45 * L, hipH: Math.max(1, fl.hipH - R(4)), water: fl.water, legs: { near: { x: -0.9 * L, y: 0.1 * L, toe: 80 }, far: { x: -0.9 * L, y: 0.14 * L, toe: 80 } },
      arms: { near: { shoulder: 160, elbow: 30 }, far: { shoulder: 158, elbow: 30 } }, face: { eyes: 'closed', mouth: 'line' }, fit: true });
    const rising = { ...under, hipH: fl.hipH - R(1) };
    const first = swim.build(c)[0];
    // en el aire y en el agua el cuerpo va acostado de verdad (también en diagonal) con los brazos libres
    const lie = (p: Pose): Pose => ({ ...p, flat: true, freeArms: true });
    return [ready, grab, grab, push, lie(fly), lie(fly2), lie(entry), lie(under), lie(under), lie(rising), first];
  },
};

// ---------- salida del agua ----------

/**
 * Salir de la piscina por el borde: flotando contra la pared estira los brazos, apoya las manos en el borde, empuja
 * hasta la cintura con los brazos bien estirados, sube una rodilla y queda agachado en el borde, se para y se sacude.
 * Mientras está en el agua el juego alinea la superficie (agua); el último cuadro en el agua deja los pies en la línea
 * del agua, así al pasar al borde (sin agua, alineado por los pies) no da un salto.
 */
export const swimExit: AnimDef = {
  name: 'swim_exit', pack: 'swim', fps: 10, loop: false, lateral: true, views: ['side', 'front', 'back'],
  travel: { ref: 'walk', k: [0, 0, 0.1, 0.2, 0.3, 0.6, 0.4, 0.3, 0, 0] },
  events: [{ type: 'paso', phase: 5 / 10, foot: 'near' }, { type: 'paso', phase: 7 / 10, foot: 'far' }],
  build: (c) => {
    const L = c.L, u = c.u;
    const hip = Math.max(3, Math.round(0.95 * L));
    const W = hip + Math.round(c.d.torsoH * 0.75);
    const R = (v: number) => Math.round(v * u);
    const wet = { water: W };
    // contra la pared: el agua al pecho, los brazos se estiran hacia el borde
    const reach = P(c, { torso: 8, hipH: hip, ...wet, head: { tilt: -10 },
      legs: { near: { x: 0.1 * L, y: 0.65 * L, toe: 20 }, far: { x: -0.1 * L, y: 0.6 * L, toe: 20 } },
      arms: { near: { shoulder: 150, elbow: 25 }, far: { shoulder: 148, elbow: 25 } }, face: { eyes: 'open', mouth: 'line' } });
    // las manos en el borde, los codos doblados
    const grab = P(c, { ...reach, torso: 12, arms: { near: { shoulder: 115, elbow: 75 }, far: { shoulder: 112, elbow: 75 } } });
    // impulso: patea y tira, los codos suben
    const pull = P(c, { ...grab, torso: 20, hipH: hip + Math.round(0.3 * L), head: { tilt: -5 },
      legs: { near: { x: -0.1 * L, y: 0.85 * L, toe: 40 }, far: { x: -0.2 * L, y: 0.8 * L, toe: 40 } },
      arms: { near: { shoulder: 70, elbow: 85 }, far: { shoulder: 68, elbow: 85 } }, face: { eyes: 'angry', mouth: 'line' } });
    // empuja con los brazos estirados: sale hasta la cintura, chorreando
    const press = P(c, { ...pull, torso: 32, hipH: hip + Math.round(0.5 * L),
      legs: { near: { x: -0.05 * L, y: 0.95 * L, toe: 30 }, far: { x: -0.12 * L, y: 0.92 * L, toe: 30 } },
      arms: { near: { shoulder: 25, elbow: 15 }, far: { shoulder: 24, elbow: 15 } } });
    const top = P(c, { ...press, torso: 45, hipH: hip + Math.round(0.7 * L), arms: { near: { shoulder: 6, elbow: 0 }, far: { shoulder: 5, elbow: 0 } } });
    // sube la rodilla al borde: el último cuadro en el agua, con los pies en la línea del agua
    const knee = P(c, { torso: 48, hipH: W + Math.round(0.4 * L), ...wet, head: { tilt: 8 },
      legs: { near: { x: 0.35 * L, y: 0.4 * L, toe: 0 }, far: { x: -0.25 * L, y: 0.38 * L, toe: 50 } },
      arms: { near: { shoulder: 12, elbow: 25 }, far: { shoulder: 10, elbow: 25 } }, face: { eyes: 'open', mouth: 'line' } });
    // en el borde, agachado (ya sin agua: el juego lo apoya por los pies)
    const crouch = P(c, { torso: 40, head: { tilt: 8 }, legs: { near: { x: 0.35 * L, y: 0.45 * L, toe: 0 }, far: { x: -0.25 * L, y: 0.42 * L, toe: 50 } },
      arms: { near: { shoulder: 20, elbow: 30 }, far: { shoulder: 18, elbow: 30 } }, face: { eyes: 'open', mouth: 'line' }, support: 'both' });
    const rising = P(c, { torso: 15, legs: { near: { x: 0.18 * L, y: 0.85 * L }, far: { x: -0.18 * L, y: 0.82 * L } },
      arms: { near: { shoulder: 10, elbow: 20 }, far: { shoulder: 8, elbow: 20 } }, face: { eyes: 'open', mouth: 'line' }, support: 'both' });
    // de pie: se sacude el agua de los brazos y sonríe
    const shake = P(c, { head: { tilt: -6, dx: R(0.5) }, arms: { near: { shoulder: 25, elbow: 10, spread: 30 }, far: { shoulder: 25, elbow: 10, spread: 30 } },
      face: { eyes: 'happy', mouth: 'grin' }, support: 'both' });
    const shake2 = P(c, { ...shake, head: { tilt: -6, dx: -R(0.5) }, arms: { near: { shoulder: 15, elbow: 10, spread: 15 }, far: { shoulder: 15, elbow: 10, spread: 15 } } });
    const stand = P(c, { face: { eyes: 'happy', mouth: 'grin' }, support: 'both' });
    // al salir el cuerpo sube y la cabeza no cabe en la celda: se bajan juntos el cuerpo y la superficie (el juego alinea
    // por la superficie, así que en pantalla se ve igual)
    const lower = (p: Pose, k: number): Pose => ({ ...p, hipH: (p.hipH ?? 0) - k, water: (p.water ?? 0) - k });
    const floor = Math.max(1, R(2));
    return [reach, grab, lower(pull, R(3)), lower(press, Math.round(0.4 * L)), lower(top, Math.round(0.6 * L)), lower(knee, W - floor), crouch, rising, shake, shake2, stand];
  },
};

export const SWIM_NEW: AnimDef[] = [swimBack, swimBreast, swimFly, treadWater, swimExit];
export const SWIM_PREMIUM: AnimDef[] = [swim, swimBack, swimBreast, swimFly, treadWater, dive, swimExit];
