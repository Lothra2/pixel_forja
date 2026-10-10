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
 * Mariposa: los dos brazos a la vez por encima del agua, el cuerpo ondula como un delfín (pecho y cadera suben y
 * bajan alternados) y dos patadas por brazada. Respira levantando la cabeza al terminar de tirar.
 */
export const swimFly: AnimDef = {
  name: 'swim_fly', pack: 'swim', fps: 10, loop: true, strideL: 2, lateral: true, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L, u = c.u;
    const fl = float(c);
    const out: Pose[] = [];
    const arms = [180, 140, 95, 45, 0, -60, -110, -160];
    for (let i = 0; i < 8; i++) {
      const a = arms[i];
      // ondulación: el pecho sube cuando los brazos salen y baja al entrar
      const wave = Math.sin((i / 8) * TAU);
      const breathe = i === 4 || i === 5;
      const kick = Math.sin((i / 8) * TAU * 2);
      out.push(P(c, {
        torso: 86 - wave * 14, x: -0.45 * L, ...fl, hipH: fl.hipH + Math.round(-wave * u),
        head: { tilt: breathe ? -55 : -20 + wave * 10 },
        legs: { near: { x: -0.95 * L, y: 0.1 * L + kick * 0.22 * L, toe: 80 }, far: { x: -0.95 * L, y: 0.12 * L + kick * 0.22 * L, toe: 80 } },
        arms: { near: { shoulder: a, elbow: a > 0 && a < 180 ? 35 : 10 }, far: { shoulder: a, elbow: a > 0 && a < 180 ? 35 : 10, spread: 10 } },
        face: { eyes: breathe ? 'open' : 'closed', mouth: breathe ? 'o' : 'line' },
      }));
    }
    return out;
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

export const SWIM_NEW: AnimDef[] = [swimBack, swimBreast, swimFly, treadWater];
export const SWIM_PREMIUM: AnimDef[] = [swim, swimBack, swimBreast, swimFly, treadWater, dive];
