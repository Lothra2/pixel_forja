import type { BossPose, BossLeg } from './rig';
import { type BossAnimDef, type BossKey, over } from './anim';

/**
 * Animaciones del minotauro grande. Mismos nombres y mismos fps que el de antes (el juego no cambia sus tiempos):
 * idle 6, walk 10, attack 14, hit 12, die 8, attack_heavy 12, charge 14, warcry 10, leap 12.
 *
 * - Golpe fuerte, salto y grito: el aviso se sostiene 4 cuadros (con temblor de esfuerzo) antes de pegar.
 * - Morir: no cae como un cuerpo tirado. Se le va el encantamiento (chispas violetas que suben), suelta el mazo,
 *   se arrodilla y termina tranquilo, con los ojos tibios y una sonrisa: liberado.
 * - Todo cabe en la celda de 128 en las 8 direcciones. En la vista de arriba lo que va hacia la cámara baja en
 *   pantalla y lo que va lejos sube: por eso el mazo descansa al costado, se carga a la altura del hombro y no por
 *   encima de la cabeza, y el salto no sube el dibujo (la altura va en `elevacion` para que el juego lo levante).
 */

/** Guardia: el mazo apoyado en el piso al costado, agarrado del mango. */
export const GUARD: BossPose = {
  root: { y: -3, lean: 1 }, spine: { bend: 3 }, head: { pitch: -14 },
  arms: { near: { pitch: 14, spread: 16, elbow: 24 }, far: { pitch: 12, spread: 14, elbow: 28 } },
  legs: { near: { x: 6, y: 0, z: 2 }, far: { x: -6, y: 0, z: 2 } },
  weapon: { angle: 172, yaw: -30 }, face: { eyes: 'angry' },
};

const k = (f: number, pose: BossPose, ease?: BossKey['ease']): BossKey => ({ f, pose, ease });

const idle: BossAnimDef = {
  name: 'idle', fps: 6, loop: true, frames: 8,
  keys: [
    k(0, GUARD),
    k(4, over(GUARD, { root: { y: -4.6 }, spine: { bend: 10 }, head: { pitch: -2 }, arms: { near: { pitch: 15, elbow: 26 }, far: { pitch: 15, elbow: 32 } } })),
  ],
};

/** Paso pesado: el pie apoyado va de +S a -S mientras el otro pasa alto. */
function gait(S: number, lift: number, duty: number, n: number): BossLeg[] {
  const out: BossLeg[] = [];
  for (let f = 0; f < n; f++) {
    const t = f / n;
    if (t < duty) out.push({ x: S - (2 * S * t) / duty, y: 0, z: 2 });
    else {
      const u = (t - duty) / (1 - duty);
      out.push({ x: -S + 2 * S * (u * u * (3 - 2 * u)) * 1.04, y: Math.sin(u * Math.PI) * lift, z: 2.5 });
    }
  }
  return out;
}

function walkDef(): BossAnimDef {
  const n = 8, S = 10, duty = 0.5;
  const near = gait(S, 8, duty, n);
  const keys: BossKey[] = [];
  for (let f = 0; f < n; f++) {
    const far = near[(f + n / 2) % n];
    const ph = (f / n) * Math.PI * 2;
    // la cadera baja cuando recibe el peso (justo después del contacto) y sube al pasar
    const bob = -3 - 2.2 * Math.cos(ph * 2 - 0.9);
    keys.push(k(f, over(GUARD, {
      root: { y: bob, roll: 3 * Math.sin(ph), lean: 6 },
      spine: { bend: 9, twist: -7 * Math.cos(ph) },
      head: { pitch: -6 + 2 * Math.cos(ph * 2) },
      legs: { near: near[f], far },
      // el mazo se lleva colgando al costado, un poco despegado del piso, y se balancea con el paso
      arms: { near: { pitch: 18 - 8 * Math.cos(ph), spread: 16, elbow: 22 }, far: { pitch: 12 + 22 * Math.cos(ph), elbow: 28 + 10 * Math.max(0, Math.cos(ph)) } },
      weapon: { angle: 158 - 8 * Math.cos(ph), yaw: -30 },
    }), 'linear'));
  }
  return {
    name: 'walk', fps: 10, loop: true, frames: n, keys,
    events: [{ type: 'paso', frame: 0, foot: 'near' }, { type: 'paso', frame: 4, foot: 'far' }],
    stride: (2 * S) / duty,
  };
}

// barrida con el mazo: lo levanta al hombro de atrás, un respiro, y lo pasa bajo por delante hacia el otro lado
const SHOULDER = over(GUARD, {
  root: { y: -6, lean: 0 }, spine: { bend: 2, twist: -28 }, head: { pitch: -8 },
  arms: { near: { pitch: 70, spread: 30, elbow: 95 } }, weapon: { angle: -70, yaw: 20 }, face: { mouth: 0.4 },
});
const attack: BossAnimDef = {
  name: 'attack', fps: 14, loop: false, frames: 6,
  keys: [
    k(0, GUARD),
    k(1, SHOULDER, 'out'),
    k(2, over(SHOULDER, { spine: { twist: -32 }, weapon: { angle: -76 } })),
    k(3, over(GUARD, { root: { y: -11, lean: 12 }, spine: { bend: 16, twist: 26 }, arms: { near: { pitch: 30, spread: 6, elbow: 6 }, far: { pitch: -15 } }, legs: { near: { x: 9 } }, weapon: { angle: 160, yaw: 50 }, face: { mouth: 0.8 } }), 'in'),
    k(4, over(GUARD, { root: { y: -11, lean: 13 }, spine: { bend: 17, twist: 30 }, arms: { near: { pitch: 28, spread: 4, elbow: 6 }, far: { pitch: -18 } }, legs: { near: { x: 9 } }, weapon: { angle: 162, yaw: 60 }, face: { mouth: 0.6 } })),
    k(5, over(GUARD, { root: { y: -6, lean: 8 }, spine: { bend: 12, twist: 10 }, legs: { near: { x: 8 } } })),
  ],
  events: [{ type: 'impacto', frame: 3 }],
};

// mazazo a dos manos: carga con el mazo atrás a la altura de los hombros (aviso de 4 cuadros que tiembla) y lo
// clava al frente, cerca de los pies
const RAISED = over(GUARD, {
  root: { y: -12, lean: 4 }, spine: { bend: 2, twist: -16 }, head: { pitch: 6 },
  arms: { near: { pitch: 96, spread: 14, elbow: 80 }, far: { pitch: 90, spread: 14, elbow: 82 } },
  legs: { near: { x: 11, z: 3 }, far: { x: -11, z: 3 } }, weapon: { angle: -128, yaw: 0, twoHand: true }, face: { mouth: 0.5 },
});
const SLAM = over(GUARD, {
  root: { y: -17, lean: 12, x: -5 }, spine: { bend: 14, twist: 6 }, head: { pitch: -14 },
  arms: { near: { pitch: 24, spread: 8, elbow: 6 }, far: { pitch: 22, spread: 8, elbow: 10 } },
  legs: { near: { x: 9, z: 3 }, far: { x: -15, z: 3 } }, weapon: { angle: 155, yaw: 0, twoHand: true }, face: { mouth: 0.9 },
});
const attackHeavy: BossAnimDef = {
  name: 'attack_heavy', fps: 12, loop: false, frames: 11, windup: [1, 4], shake: 1,
  keys: [
    k(0, GUARD),
    k(1, RAISED, 'out'),
    k(4, over(RAISED, { root: { y: -14 }, spine: { bend: 0 }, weapon: { angle: -132 }, face: { mouth: 0.6 } })),
    k(5, over(GUARD, { root: { y: -10, lean: 6 }, spine: { bend: 4 }, arms: { near: { pitch: 58, elbow: 92 }, far: { pitch: 54, elbow: 94 } }, legs: { near: { x: 12, z: 3 }, far: { x: -12, z: 3 } }, weapon: { angle: 58, yaw: 0, twoHand: true }, face: { mouth: 0.8 } }), 'in'),
    k(6, SLAM, 'in'),
    k(7, over(SLAM, { root: { y: -18 } })),
    k(8, over(SLAM, { root: { y: -16 }, spine: { bend: 12 } })),
    k(10, over(GUARD, { root: { y: -4 } })),
  ],
  events: [{ type: 'impacto', frame: 6 }],
};

// embestida: cabeza abajo con los cuernos al frente, el mazo colgando atrás, galope pesado
function chargeDef(): BossAnimDef {
  const n = 8, S = 13, duty = 0.375;
  const near = gait(S, 10, duty, n);
  const keys: BossKey[] = [];
  for (let f = 0; f < n; f++) {
    const far = near[(f + n / 2) % n];
    const ph = (f / n) * Math.PI * 2;
    keys.push(k(f, over(GUARD, {
      root: { y: -7 - 2.5 * Math.cos(ph * 2 - 0.6), lean: 24, roll: 2 * Math.sin(ph) },
      spine: { bend: 12, twist: -6 * Math.cos(ph) },
      head: { pitch: 24 },
      arms: { near: { pitch: -6 + 10 * Math.cos(ph), spread: 18, elbow: 30 }, far: { pitch: 20 + 34 * Math.cos(ph), elbow: 50 } },
      legs: { near: near[f], far },
      weapon: { angle: -150 + 6 * Math.cos(ph), yaw: -20 },
      face: { mouth: 0.3 },
    }), 'linear'));
  }
  return {
    name: 'charge', fps: 14, loop: true, frames: n, keys,
    events: [{ type: 'paso', frame: 0, foot: 'near' }, { type: 'paso', frame: 4, foot: 'far' }],
    stride: (2 * S) / duty,
  };
}

// grito de guerra: se encoge, se para alto con los brazos abiertos y ruge (4 cuadros), y pisotea
const ROAR = over(GUARD, {
  root: { y: 0, lean: -10 }, spine: { bend: -14 }, head: { pitch: -30 },
  arms: { near: { pitch: 75, spread: 62, elbow: 40 }, far: { pitch: 80, spread: 62, elbow: 40 } },
  legs: { near: { x: 8, z: 4 }, far: { x: -8, z: 4 } }, weapon: { angle: -60, yaw: -60 }, face: { mouth: 1 },
});
const warcry: BossAnimDef = {
  name: 'warcry', fps: 10, loop: false, frames: 10, windup: [3, 6], shake: 1,
  keys: [
    k(0, GUARD),
    k(2, over(GUARD, { root: { y: -10, lean: 12 }, spine: { bend: 18 }, head: { pitch: 10 }, arms: { far: { pitch: 30, elbow: 70 } }, face: { mouth: 0.2 } })),
    k(3, ROAR, 'out'),
    k(6, over(ROAR, { head: { pitch: -34 }, arms: { far: { spread: 66 } } })),
    k(7, over(GUARD, { root: { y: -4, lean: 6 }, legs: { near: { x: 9, y: 10 } }, face: { mouth: 0.6 } })),
    k(8, over(GUARD, { root: { y: -8, lean: 10 }, legs: { near: { x: 9 } }, face: { mouth: 0.5 } }), 'in'),
    k(9, GUARD),
  ],
  events: [{ type: 'grito', frame: 3 }, { type: 'paso', frame: 8, foot: 'near' }],
};

// salto con mazazo: se agacha (aviso), salta con el mazo atrás y cae clavándolo. La altura del salto no se dibuja:
// va en `elevacion` (pixeles por cuadro) para que el juego suba el sprite sobre su sombra
const CROUCH = over(GUARD, {
  root: { y: -17, lean: 16 }, spine: { bend: 14 }, head: { pitch: -10 },
  arms: { near: { pitch: 4, spread: 14, elbow: 34 }, far: { pitch: 0, spread: 14, elbow: 34 } },
  legs: { near: { x: 9, z: 3 }, far: { x: -9, z: 3 } }, weapon: { angle: -150, yaw: 0, twoHand: true }, face: { mouth: 0.4 },
});
const leap: BossAnimDef = {
  name: 'leap', fps: 12, loop: false, frames: 12, windup: [1, 4], shake: 1,
  keys: [
    k(0, GUARD),
    k(1, CROUCH, 'out'),
    k(4, over(CROUCH, { root: { y: -19 } })),
    k(5, over(GUARD, { root: { y: -5, lean: 4 }, spine: { bend: 2 }, head: { pitch: 4 }, arms: { near: { pitch: 100, elbow: 70 }, far: { pitch: 94, elbow: 72 } }, legs: { near: { x: 4, y: 5 }, far: { x: -10, y: 9 } }, weapon: { angle: -110, yaw: 0, twoHand: true }, face: { mouth: 0.8 } }), 'out'),
    k(6, over(GUARD, { root: { y: -7, lean: 2 }, spine: { bend: 0 }, head: { pitch: 4 }, arms: { near: { pitch: 98, elbow: 80 }, far: { pitch: 92, elbow: 82 } }, legs: { near: { x: 8, y: 14 }, far: { x: -4, y: 12 } }, weapon: { angle: -122, yaw: 0, twoHand: true }, face: { mouth: 0.9 } })),
    k(7, over(GUARD, { root: { y: -6, lean: 8 }, spine: { bend: 4 }, arms: { near: { pitch: 58, elbow: 92 }, far: { pitch: 54, elbow: 94 } }, legs: { near: { x: 12, y: 6 }, far: { x: -10, y: 4 } }, weapon: { angle: 58, yaw: 0, twoHand: true }, face: { mouth: 1 } }), 'in'),
    k(8, SLAM, 'in'),
    k(9, over(SLAM, { root: { y: -18 } })),
    k(11, GUARD),
  ],
  events: [{ type: 'despegue', frame: 5 }, { type: 'aterriza', frame: 8 }, { type: 'impacto', frame: 8 }],
  // cuánto sube el juego el sprite en cada cuadro del salto
  rise: [0, 0, 0, 0, 0, 18, 30, 16, 0, 0, 0, 0],
};

const hit: BossAnimDef = {
  name: 'hit', fps: 12, loop: false, frames: 5,
  keys: [
    k(0, GUARD),
    k(1, over(GUARD, { root: { x: -4, lean: -10, y: -4 }, spine: { bend: -8 }, head: { pitch: -20 }, arms: { far: { pitch: 26, spread: 30 } }, face: { eyes: 'closed', mouth: 0.4 } }), 'out'),
    k(2, over(GUARD, { root: { x: -5, lean: -12, y: -5 }, spine: { bend: -10 }, head: { pitch: -24 }, arms: { far: { pitch: 30, spread: 34 } }, face: { eyes: 'closed', mouth: 0.5 } })),
    k(3, over(GUARD, { root: { x: -2, lean: -2, y: -4 }, spine: { bend: 2 }, head: { pitch: -8 } })),
    k(4, GUARD),
  ],
};

// liberarse: se tambalea, el encantamiento se le va en chispas, suelta el mazo, se arrodilla y queda en paz
const KNEEL: BossPose = {
  root: { y: -24, lean: 6, x: -2 }, spine: { bend: 10 }, head: { pitch: 14 },
  arms: { near: { pitch: 20, spread: 18, elbow: 40 }, far: { pitch: 18, spread: 18, elbow: 42 } },
  legs: { near: { x: -14, y: 0, z: 2, toe: 60 }, far: { x: 12, y: 0, z: 3 } },
  weapon: { angle: 0, drop: true }, face: { eyes: 'closed', mouth: 0 }, aura: 1,
};
const die: BossAnimDef = {
  name: 'die', fps: 8, loop: false, frames: 16,
  keys: [
    k(0, over(GUARD, { aura: 0.4 })),
    k(2, over(GUARD, { root: { x: -4, lean: -10, y: -5 }, spine: { bend: -10 }, head: { pitch: -26 }, arms: { far: { pitch: 36, spread: 30 } }, face: { eyes: 'closed', mouth: 0.6 }, aura: 1, extra: { t: 1 } }), 'out'),
    k(4, over(GUARD, { root: { x: -2, lean: 4, y: -10 }, spine: { bend: 6 }, head: { pitch: -6 }, arms: { near: { pitch: 26, elbow: 30 }, far: { pitch: 20 } }, face: { eyes: 'dizzy', mouth: 0.3 }, aura: 1, extra: { t: 2 } })),
    k(5, over(KNEEL, { root: { y: -18 }, face: { eyes: 'dizzy' }, extra: { t: 3 } }), 'in'),
    k(7, over(KNEEL, { extra: { t: 5 } })),
    k(9, over(KNEEL, { head: { pitch: 4 }, aura: 0.4, extra: { t: 7 } })),
    k(10, over(KNEEL, { head: { pitch: -4 }, aura: 0, freed: 1, face: { eyes: 'open' }, extra: { t: 8 } })),
    k(12, over(KNEEL, { head: { pitch: -8 }, aura: 0, freed: 1, face: { eyes: 'happy' } })),
    k(15, over(KNEEL, { root: { y: -23 }, head: { pitch: -6 }, aura: 0, freed: 1, face: { eyes: 'happy' } })),
  ],
  events: [{ type: 'suelta', frame: 5 }],
};

export const MINO_ANIMS: BossAnimDef[] = [idle, walkDef(), attack, hit, die, attackHeavy, chargeDef(), warcry, leap];
