import { type Pose, keyed } from '../rig/pose';
import { type AnimDef, type Ctx, P, feet } from './types';
import { run } from './premium';
import { shotP } from './footballPremium';

/**
 * Fútbol Nekketsu. Los gestos del pack de fútbol son los de un partido de verdad, medidos y cortos. Estos son los de
 * Kunio y de Nintendo World Cup: todo se exagera para que se lea a 30 px en la cancha. El que festeja corre con los
 * dos brazos arriba y la boca abierta, el que carga mete el hombro con el cuerpo entero, el puñetazo sale de atrás de
 * la oreja y termina con el brazo estirado, el cabezazo se arquea y se dobla, el tiro fuerte despega del piso.
 * Los brazos van libres (`freeArms`) para que pasen la cabeza, que en el chibi normal no pasan.
 */

const joy = { eyes: 'happy' as const, mouth: 'grin' as const };
const fury = { eyes: 'angry' as const, mouth: 'open' as const };
/** Los dos brazos arriba en V, con las palmas abiertas: adelante de la cara de lado y a los costados de la cabeza de frente, que si no la cabeza del chibi los tapa. */
const up = (w: number): Pose['arms'] => ({ near: { shoulder: 168 + w, elbow: 0, spread: 24 }, far: { shoulder: 172 - w, elbow: 0, spread: 24 } }) as Pose['arms'];
const palms = { near: 'palma' as const, far: 'palma' as const };

/** El festejo de Nintendo World Cup: corre con los dos brazos arriba, el pecho afuera y gritando. */
export const nkGoalRun: AnimDef = {
  name: 'nk_goal_run', pack: 'football', fps: 14, loop: true, steady: true, hairTrail: -1,
  events: run.events,
  build: (c) => run.build(c).map((p, i) => ({
    ...p, torso: -8, load: true, arms: up(i % 4 < 2 ? 8 : -8), hands: palms,
    head: { ...p.head, tilt: -10 }, face: i % 4 < 2 ? joy : { eyes: 'happy' as const, mouth: 'open' as const },
  })),
};

/** ¡Banzai! Salta en el sitio con los brazos arriba y las piernas recogidas, una y otra vez. */
export const nkGoalJump: AnimDef = {
  name: 'nk_goal_jump', pack: 'football', fps: 12, loop: true,
  events: [{ type: 'despegue', phase: 1 / 8 }, { type: 'aterriza', phase: 6 / 8 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const crouch = P(c, { torso: 14, legs: feet(c, 0.6, 0.26), arms: { near: { shoulder: -35, elbow: 30, spread: 20 }, far: { shoulder: -35, elbow: 30, spread: 20 } }, face: joy, support: 'both' });
    const rise = P(c, { torso: -6, air: 5 * u, load: true, legs: { near: { x: 0.1 * L, y: L - 0.4, toe: 40 }, far: { x: -0.1 * L, y: L - 0.4, toe: 40 } }, arms: up(0), hands: palms, face: { eyes: 'happy', mouth: 'open' } });
    const apex = P(c, { torso: -10, air: 10 * u, load: true, legs: { near: { x: 0.32 * L, y: 0.52 * L, toe: 20 }, far: { x: -0.3 * L, y: 0.58 * L, toe: 50 } },
      arms: up(8), hands: palms, head: { dx: 0, dy: 0, tilt: -12 }, face: { eyes: 'happy', mouth: 'open' } });
    const fall = P(c, { torso: -2, air: 4 * u, load: true, legs: { near: { x: 0.12 * L, y: L - 0.5, toe: 25 }, far: { x: -0.12 * L, y: L - 0.5, toe: 25 } }, arms: up(-6), hands: palms, face: joy });
    return keyed(8, [[0, crouch], [1, crouch, 'out'], [2, rise], [3, apex, 'hold'], [4, apex], [5, fall], [6, crouch, 'out'], [7, crouch]], true);
  },
};

/** Parado con los dos brazos arriba, gritando el gol: se balancea en las rodillas y abre y cierra la boca (el juego lo hace saltar). */
export const nkBanzai: AnimDef = {
  name: 'nk_banzai', pack: 'football', fps: 10, loop: true,
  build: (c) => [0, 1, 0, 1].map((b, i) => P(c, { torso: -6 + b * 2, load: true, legs: feet(c, 0.12 + b * 0.22, 0.24), arms: up(i < 2 ? 6 : -6), hands: palms,
    head: { dx: 0, dy: 0, tilt: i < 2 ? -6 : 6 }, face: b ? joy : { eyes: 'happy' as const, mouth: 'open' as const }, support: 'both' })),
};

/** La carga con el hombro (el codazo de Kunio): se tira con el cuerpo entero, el antebrazo por delante. */
export const nkShoulder: AnimDef = {
  name: 'nk_shoulder', pack: 'football', fps: 16, loop: false, hairTrail: -1,
  events: [{ type: 'impacto', phase: 2 / 7, joint: 'elbowNear' }],
  travel: { ref: 'run', k: [0.4, 1.5, 1.6, 0.9, 0.3, 0.1] },
  build: (c) => {
    const L = c.L;
    const wind = P(c, { torso: -10, legs: { near: { x: -0.25 * L, y: L - 0.6, toe: 0 }, far: { x: 0.3 * L, y: L - 0.9, toe: 0 } },
      arms: { near: { shoulder: -55, elbow: 95, spread: 10 }, far: { shoulder: 60, elbow: 70, spread: 30 } }, face: fury, support: 'near' });
    const ram = P(c, { torso: 42, x: 0.1 * L, freeArms: true, legs: { near: { x: 0.62 * L, y: L - 0.7, toe: -10 }, far: { x: -0.78 * L, y: 0.8 * L, toe: 55 } },
      arms: { near: { shoulder: 78, elbow: 100, spread: 4 }, far: { shoulder: -70, elbow: 15, spread: 20 } }, head: { dx: 0, dy: 0, tilt: 14 }, face: fury, support: 'near' });
    const through = P(c, { ...ram, torso: 34, legs: { near: { x: 0.5 * L, y: L - 0.6, toe: 0 }, far: { x: -0.6 * L, y: 0.84 * L, toe: 45 } } });
    const back = P(c, { torso: 14, legs: feet(c, 0.4, 0.3), arms: { near: { shoulder: 40, elbow: 70, spread: 15 }, far: { shoulder: -10, elbow: 50, spread: 15 } }, face: { eyes: 'angry', mouth: 'line' }, support: 'both' });
    return keyed(7, [[0, wind], [1, wind, 'out'], [2, ram, 'hold'], [3, ram], [4, through], [6, back]]);
  },
};

/** El puñetazo de pelea callejera: lo trae desde atrás de la oreja y lo suelta con el brazo entero y el cuerpo encima. */
export const nkPunch: AnimDef = {
  name: 'nk_punch', pack: 'football', fps: 16, loop: false,
  events: [{ type: 'impacto', phase: 3 / 8, joint: 'handNear' }],
  build: (c) => {
    const L = c.L;
    const wind = P(c, { torso: -20, legs: { near: { x: -0.3 * L, y: L - 0.5, toe: 0 }, far: { x: 0.35 * L, y: L - 0.7, toe: 0 } },
      arms: { near: { shoulder: -75, elbow: 110, spread: 12 }, far: { shoulder: 70, elbow: 60, spread: 25 } }, head: { dx: 0, dy: 0, tilt: -8 }, face: fury, support: 'near' });
    const hit = P(c, { torso: 36, x: 0.08 * L, freeArms: true, legs: { near: { x: 0.6 * L, y: L - 0.7, toe: -5 }, far: { x: -0.66 * L, y: 0.86 * L, toe: 50 } },
      arms: { near: { shoulder: 92, elbow: 0, spread: 2 }, far: { shoulder: -60, elbow: 70, spread: 18 } }, head: { dx: 0, dy: 0, tilt: 10 }, face: fury, support: 'near' });
    const drag = P(c, { ...hit, torso: 28, arms: { near: { shoulder: 70, elbow: 20, spread: 2 }, far: { shoulder: -40, elbow: 60, spread: 18 } } });
    const back = P(c, { torso: 10, legs: feet(c, 0.35, 0.28), arms: { near: { shoulder: 30, elbow: 80, spread: 14 }, far: { shoulder: 20, elbow: 80, spread: 14 } }, face: { eyes: 'angry', mouth: 'line' }, support: 'both' });
    return keyed(8, [[0, wind], [2, wind, 'out'], [3, hit, 'hold'], [4, hit], [5, drag], [7, back]]);
  },
};

/** El cabezazo de Nekketsu: salta, se arquea hacia atrás con los brazos abiertos y se dobla entero sobre el balón. */
export const nkHeader: AnimDef = {
  name: 'nk_header', pack: 'football', fps: 14, loop: false,
  events: [{ type: 'despegue', phase: 1 / 8 }, { type: 'impacto', phase: 4 / 8, joint: 'frente' }, { type: 'aterriza', phase: 6 / 8 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const crouch = P(c, { torso: 16, legs: feet(c, 0.55, 0.24), arms: { near: { shoulder: -40, elbow: 30 }, far: { shoulder: -40, elbow: 30 } }, face: { eyes: 'angry', mouth: 'line' }, support: 'both' });
    const arch = P(c, { torso: -30, air: 7 * u, freeArms: true, legs: { near: { x: -0.2 * L, y: 0.8 * L, toe: 50 }, far: { x: -0.4 * L, y: 0.7 * L, toe: 60 } },
      arms: { near: { shoulder: 120, elbow: 30, spread: 60 }, far: { shoulder: 110, elbow: 30, spread: 60 } }, head: { dx: 0, dy: 0, tilt: -18 }, face: fury });
    const snap = P(c, { torso: 46, air: 8 * u, freeArms: true, legs: { near: { x: 0.35 * L, y: 0.62 * L, toe: 10 }, far: { x: -0.1 * L, y: 0.7 * L, toe: 30 } },
      arms: { near: { shoulder: -80, elbow: 20, spread: 30 }, far: { shoulder: -95, elbow: 20, spread: 30 } }, head: { dx: 1.5 * u, dy: 1 * u, tilt: 22 }, face: { eyes: 'closed', mouth: 'open' } });
    const fall = P(c, { torso: 24, air: 3 * u, legs: { near: { x: 0.2 * L, y: L - 0.6, toe: 20 }, far: { x: -0.15 * L, y: L - 0.6, toe: 20 } }, arms: { near: { shoulder: -40, elbow: 30, spread: 20 }, far: { shoulder: -50, elbow: 30, spread: 20 } }, face: fury });
    const land = P(c, { torso: 18, legs: feet(c, 0.5, 0.26), arms: { near: { shoulder: 20, elbow: 50, spread: 20 }, far: { shoulder: 10, elbow: 50, spread: 20 } }, face: { eyes: 'angry', mouth: 'line' }, support: 'both' });
    return keyed(8, [[0, crouch], [1, crouch, 'out'], [2, arch, 'hold'], [3, arch], [4, snap, 'hold'], [5, snap], [6, fall], [7, land]]);
  },
};

/** El pique de Kunio: el cuerpo echado adelante, los brazos bombeando de lado a lado y la zancada larga. */
export const nkSprint: AnimDef = {
  name: 'nk_sprint', pack: 'football', fps: 16, loop: true, steady: true, hairTrail: -1,
  events: run.events,
  build: (c) => run.build(c).map((p) => ({
    ...p, torso: 28, freeArms: true,
    arms: { near: { ...p.arms.near, shoulder: p.arms.near.shoulder * 1.5, elbow: 100 }, far: { ...p.arms.far, shoulder: p.arms.far.shoulder * 1.5, elbow: 100 } },
    legs: { near: { ...p.legs.near, x: p.legs.near.x * 1.18 }, far: { ...p.legs.far, x: p.legs.far.x * 1.18 } },
    head: { ...p.head, tilt: 8 }, face: { eyes: 'angry' as const, mouth: 'line' as const },
  })),
};

/** El tiro fuerte: abre los brazos al cargar, y al pegar el cuerpo se va atrás, la pierna sube sobre la cabeza y despega del piso. */
export const nkShot: AnimDef = {
  name: 'nk_power_shot', pack: 'football', fps: 14, loop: false,
  events: shotP.events, travel: shotP.travel,
  build: (c) => {
    const L = c.L, u = c.u, base = shotP.build(c);
    return base.map((p, i) => {
      if (i === 1 || i === 2) return { ...p, torso: -16, freeArms: true, arms: { near: { shoulder: -70, elbow: 20, spread: 30 }, far: { shoulder: 100, elbow: 10, spread: 70 } }, face: fury };
      if (i === 4) return { ...p, torso: -6, face: fury };
      if (i === 5 || i === 6) return { ...p, torso: -26, air: (i === 5 ? 4 : 6) * u, freeArms: true, legs: { far: { ...p.legs.far, toe: 40 }, near: { x: 0.8 * L, y: 0.14 * L, toe: 5 } },
        arms: { near: { shoulder: -50, elbow: 20, spread: 40 }, far: { shoulder: 130, elbow: 10, spread: 60 } }, head: { dx: 0, dy: 0, tilt: -10 }, face: fury };
      return p;
    });
  },
};

/**
 * La versión Nekketsu de una animación que ya existe: cada cuadro se aleja de la pose media del ciclo más de lo que se
 * alejaba. El tronco se inclina más, los brazos barren más ángulo, la zancada es más larga y el salto más alto. Es lo que
 * hace un animador cuando "exagera": la misma acción, con más recorrido. `lean` echa el cuerpo adelante todo el ciclo.
 */
interface Amp { t?: number; a?: number; l?: number; air?: number; lean?: number; head?: number }
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
function exaggerate(poses: Pose[], k: Amp): Pose[] {
  const n = poses.length || 1, mean = (f: (p: Pose) => number): number => poses.reduce((s, p) => s + f(p), 0) / n;
  const mt = mean((p) => p.torso), mh = mean((p) => p.head.tilt);
  const ms = { near: mean((p) => p.arms.near.shoulder), far: mean((p) => p.arms.far.shoulder) }, me = { near: mean((p) => p.arms.near.elbow), far: mean((p) => p.arms.far.elbow) };
  const kt = k.t ?? 1, ka = k.a ?? 1, kl = k.l ?? 1;
  return poses.map((p) => ({
    ...p,
    torso: clamp(mt + (p.torso - mt) * kt + (k.lean ?? 0), -80, 85),
    head: { ...p.head, tilt: clamp(mh + (p.head.tilt - mh) * (k.head ?? kt), -35, 35) },
    arms: {
      near: { ...p.arms.near, shoulder: ms.near + (p.arms.near.shoulder - ms.near) * ka, elbow: clamp(me.near + (p.arms.near.elbow - me.near) * Math.min(ka, 1.4), 0, 150) },
      far: { ...p.arms.far, shoulder: ms.far + (p.arms.far.shoulder - ms.far) * ka, elbow: clamp(me.far + (p.arms.far.elbow - me.far) * Math.min(ka, 1.4), 0, 150) },
    },
    legs: { near: { ...p.legs.near, x: p.legs.near.x * kl }, far: { ...p.legs.far, x: p.legs.far.x * kl } },
    air: p.air * (k.air ?? 1),
  }));
}

/** Qué se exagera de cada animación del juego. La nueva se llama `nk_` más el nombre de la original. */
const AMP: Record<string, Amp> = {
  idle: { t: 2.2, a: 2.4, head: 2 }, walk: { t: 1.4, a: 1.7, l: 1.1 }, run: { t: 1.4, a: 1.55, l: 1.15, lean: 6 }, run_ball: { t: 1.3, a: 1.55, l: 1.1, lean: 8 },
  pass: { t: 1.7, a: 1.7, l: 1.15 }, chip: { t: 1.7, a: 1.7, l: 1.12 }, shot: { t: 1.8, a: 1.8, l: 1.15 }, volley: { t: 1.4, a: 1.7, l: 1.1 }, chilena: { t: 1.2, a: 1.7, l: 1.1, air: 1.25 },
  trap: { t: 1.9, a: 1.9 }, slide: { t: 1.2, a: 1.9, l: 1.1 }, tackle: { t: 1.6, a: 1.7, l: 1.15 }, throw_in: { t: 1.9, a: 1.3 }, run_kick: { t: 1.5, a: 1.7, l: 1.12 },
  hit: { t: 2.2, a: 2.2, head: 2.5 }, stagger: { t: 2, a: 2 }, knockout: { t: 1.15, a: 1.8, air: 1.5 }, fall_getup: { t: 1.2, a: 1.6 }, dizzy: { t: 2.4, a: 2.2, head: 2.5 }, ko_bounce: { a: 1.8, air: 1.6 }, slip_wet: { t: 1.2, a: 2, air: 1.4 },
  sad: { t: 1.7, a: 1.5, head: 2 }, laugh: { t: 2.2, a: 2, head: 2.2 }, taunt: { t: 1.7, a: 1.7 }, celebrate: { t: 1.5, a: 1.4, air: 1.5 }, victory: { t: 1.6, a: 1.5, air: 1.4 },
  jump_rise: { t: 1.5, a: 1.7, air: 1.15 }, jump_apex: { t: 1.5, a: 1.7, air: 1.15 }, jump_fall: { t: 1.5, a: 1.7, air: 1.15 }, land: { t: 1.8, a: 1.6 },
  keeper_ready: { t: 1.6, a: 1.9, l: 1.25 }, keeper_dive: { t: 1.1, a: 1.5, l: 1.1, air: 1.25 }, keeper_catch: { t: 1.5, a: 1.5, air: 1.3 }, keeper_throw: { t: 1.7, a: 1.5, l: 1.1 }, keeper_punt: { t: 1.7, a: 1.7, l: 1.12 },
  kick_martial: { t: 1.6, a: 1.7, l: 1.12 }, air_kick: { t: 1.3, a: 1.7, l: 1.12 }, flying_kick: { t: 1.2, a: 1.6, l: 1.15, air: 1.2 }, uppercut: { t: 1.5, a: 1.3, air: 1.5 }, run_punch: { t: 1.6, a: 1.6, l: 1.15 },
  guard: { t: 1.6, a: 1.6, l: 1.15 }, point: { t: 1.7, a: 1.3 }, call: { t: 1.7, a: 1.3 }, skid: { t: 1.5, a: 1.6, l: 1.1 }, power: { t: 1.8, a: 1.9 }, ready: { t: 1.7, a: 1.9, l: 1.25 },
  shuttle_kick_back_nekketsu: { a: 1.6, l: 1.1, air: 1.2 }, vb_dive: { t: 1.1, a: 1.4, l: 1.1 }, clap: { t: 1.8, a: 1.5 }, goal_knee: { t: 1.5, a: 1.4 },
};

/**
 * Las animaciones de Nekketsu que salen de exagerar las del motor. `find` da la animación original por su nombre (la que
 * usa el kit), así ninguna queda copiada: si la original mejora, esta mejora con ella.
 */
export function nekketsuFrom(find: (name: string) => AnimDef | undefined): AnimDef[] {
  const out: AnimDef[] = [];
  for (const [name, k] of Object.entries(AMP)) {
    const src = find(name);
    if (!src) continue;
    out.push({ ...src, name: 'nk_' + name, pack: 'football', build: (c) => exaggerate(src.build(c), k) });
  }
  return out;
}

export const NEKKETSU_FUTBOL: AnimDef[] = [nkGoalRun, nkGoalJump, nkBanzai, nkShoulder, nkPunch, nkHeader, nkSprint, nkShot];

// ---------- Propuesta (nkx_): las acciones que más flojas se veían, dibujadas de cero ----------

const hurt = { eyes: 'hurt' as const, mouth: 'o' as const };
/**
 * De frente y de espalda el tronco no se inclina (se vería igual): lo que se ve es el giro de lado. Una pose acostada o
 * que se va de lado se dibuja ahí girada lo mismo que se inclina de costado, así la caída, la barrida y la estirada del
 * arquero también se leen cuando el jugador mira a la cámara o le da la espalda.
 */
const sideways = (c: Ctx, poses: Pose[], k = 1): Pose[] => (c.view === 'front' || c.view === 'back' ? poses.map((p) => ({ ...p, roll: p.torso * k * (c.view === 'back' ? -1 : 1) })) : poses);

/** La barrida de Nintendo World Cup: salta, cae de costado casi acostado con una pierna estirada adelante y el brazo apuntando, y resbala. */
export const nkxSlide: AnimDef = {
  name: 'nkx_slide', pack: 'football', fps: 14, loop: false, hairTrail: -1,
  events: [{ type: 'despegue', phase: 1 / 8 }, { type: 'impacto', phase: 3 / 8, joint: 'footNear' }],
  build: (c) => {
    const L = c.L, u = c.u;
    const dip = P(c, { torso: 22, legs: feet(c, 0.75, 0.3), arms: { near: { shoulder: -60, elbow: 40 }, far: { shoulder: 60, elbow: 40 } }, face: fury, support: 'both' });
    const leap = P(c, { torso: -40, air: 4 * u, x: 0.1 * L, freeArms: true, legs: { near: { x: 0.9 * L, y: 0.4 * L, toe: -20 }, far: { x: -0.1 * L, y: 0.6 * L, toe: 40 } },
      arms: { near: { shoulder: 80, elbow: 10, spread: 20 }, far: { shoulder: -80, elbow: 20, spread: 40 } }, face: fury, fit: true });
    const low = (k: number) => P(c, { torso: -80, x: (0.15 + k * 0.06) * L, freeArms: true, legs: { near: { x: 1.15 * L, y: 0.04 * L, toe: -30 }, far: { x: 0.2 * L, y: (0.28 - k * 0.06) * L, toe: 30 } },
      arms: { near: { shoulder: 66 + k * 8, elbow: 0, spread: 10 }, far: { shoulder: -110, elbow: 30, spread: 40 } }, hands: { near: 'dedo' as const }, head: { dx: 0, dy: 0, tilt: 26 }, face: fury, fit: true });
    const sit = P(c, { torso: -30, legs: { near: { x: 0.85 * L, y: 0.18 * L, toe: -20 }, far: { x: 0.45 * L, y: 0.3 * L, toe: 0 } }, arms: { near: { shoulder: -40, elbow: 30 }, far: { shoulder: -50, elbow: 30 } }, face: { eyes: 'angry', mouth: 'line' }, fit: true });
    return sideways(c, [dip, leap, low(0), low(1), low(2), low(1), sit, sit], 0.9);
  },
};

/** El pase de Kunio: abre los brazos, gira el cuerpo entero y barre con la pierna de lado a lado con un saltito. */
export const nkxPass: AnimDef = {
  name: 'nkx_pass', pack: 'football', fps: 16, loop: false,
  events: [{ type: 'impacto', phase: 3 / 8 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const wind = P(c, { torso: -22, legs: { far: { x: 0.2 * L, y: L - 0.4, toe: 0 }, near: { x: -0.8 * L, y: 0.42 * L, toe: 60 } },
      arms: { near: { shoulder: -80, elbow: 20, spread: 30 }, far: { shoulder: 100, elbow: 10, spread: 65 } }, face: fury, support: 'far' });
    const hit = P(c, { torso: 26, air: 3 * u, legs: { far: { x: 0.1 * L, y: L - 0.6, toe: 20 }, near: { x: 0.8 * L, y: 0.6 * L, toe: -15 } },
      arms: { near: { shoulder: 80, elbow: 20, spread: 30 }, far: { shoulder: -70, elbow: 20, spread: 50 } }, face: fury });
    const through = P(c, { torso: -6, air: 5 * u, legs: { far: { x: -0.1 * L, y: L - 0.7, toe: 30 }, near: { x: 0.9 * L, y: 0.35 * L, toe: -5 } },
      arms: { near: { shoulder: 110, elbow: 10, spread: 40 }, far: { shoulder: -90, elbow: 10, spread: 50 } }, face: { eyes: 'angry', mouth: 'grin' } });
    const land = P(c, { torso: 14, legs: { near: { x: 0.4 * L, y: L - 0.5, toe: 0 }, far: { x: -0.35 * L, y: 0.8 * L, toe: 40 } }, arms: { near: { shoulder: 30, elbow: 50 }, far: { shoulder: -20, elbow: 50 } }, face: { eyes: 'angry', mouth: 'line' }, support: 'near' });
    return [wind, wind, hit, hit, through, through, land, P(c, { torso: 8, legs: feet(c, 0.3, 0.24) })];
  },
};

/** Lo mandaron a volar: la cabeza se va atrás, sale por el aire de espaldas con brazos y piernas abiertos, cae, rebota y queda tendido. */
export const nkxFly: AnimDef = {
  name: 'nkx_fly', pack: 'football', fps: 12, loop: false,
  events: [{ type: 'aterriza', phase: 6 / 10 }],
  build: (c) => {
    const L = c.L, u = c.u, dir = c.view === 'back' ? 1 : -1;
    const snap = P(c, { torso: -30, x: -2 * u, head: { tilt: -30, dx: -u, dy: 0 }, legs: { near: { x: -0.4 * L, y: L - 0.6 }, far: { x: 0.25 * L, y: L - 0.5 } },
      arms: { near: { shoulder: 60, elbow: 20, spread: 60 }, far: { shoulder: 80, elbow: 20, spread: 60 } }, face: hurt, support: 'both' });
    const air = (h: number, t: number, k: number) => P(c, { torso: t, air: h * u, x: -dir * 0.2 * L, freeArms: true,
      legs: { near: { x: (0.75 + k * 0.15) * L, y: (0.3 - k * 0.2) * L, toe: -20 }, far: { x: (0.35 - k * 0.2) * L, y: (0.55 + k * 0.15) * L, toe: 10 } },
      arms: { near: { shoulder: 150 - k * 30, elbow: 15, spread: 55 }, far: { shoulder: 120 + k * 40, elbow: 15, spread: 55 } }, head: { dx: 0, dy: 0, tilt: -20 }, face: hurt, fit: true });
    const down = P(c, { torso: -88, legs: { near: { x: 0.8 * L, y: 0.1 * L, toe: -30 }, far: { x: 0.7 * L, y: 0.22 * L, toe: -30 } },
      arms: { near: { shoulder: 130, elbow: 30, spread: 40 }, far: { shoulder: 150, elbow: 30, spread: 40 } }, face: { eyes: 'closed', mouth: 'o' }, fit: true });
    return sideways(c, [snap, air(5, -50, 1), air(10, -72, -1), air(12, -92, 1), air(9, -100, -1), air(4, -92, 1), down, { ...down, air: 3 * u }, down, down]);
  },
};

/** Mareado: se va de lado a lado con todo el cuerpo, la cabeza dando vueltas y los brazos colgando. */
export const nkxDizzy: AnimDef = {
  name: 'nkx_dizzy', pack: 'football', fps: 9, loop: true,
  build: (c) => {
    const u = c.u, L = c.L;
    return sideways(c, [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
      const a = (i / 8) * Math.PI * 2, s = Math.sin(a), co = Math.cos(a);
      return P(c, { torso: s * 18, x: s * 2.5 * u, head: { tilt: s * 26 + co * 8, dx: co * 2 * u, dy: Math.abs(s) * u },
        legs: { near: { x: (0.3 + s * 0.12) * L, y: L - 0.8 - Math.abs(co), toe: 0 }, far: { x: (-0.3 + s * 0.12) * L, y: L - 0.8 - Math.abs(co), toe: 0 } },
        arms: { near: { shoulder: -s * 34 + 6, elbow: 14, spread: 18 }, far: { shoulder: -s * 34 - 6, elbow: 14, spread: 18 } },
        face: { eyes: i % 4 < 2 ? 'hurt' as const : 'closed' as const, mouth: 'o' as const }, support: 'both' });
    }));
  },
};

/** Se levanta de un salto, como Kunio: las piernas al cielo, se impulsa, vuela recogido y cae en guardia con el puño cerrado. */
export const nkxGetup: AnimDef = {
  name: 'nkx_getup', pack: 'football', fps: 14, loop: false,
  events: [{ type: 'despegue', phase: 2 / 8 }, { type: 'aterriza', phase: 5 / 8 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const down = P(c, { torso: -88, legs: { near: { x: 0.8 * L, y: 0.1 * L, toe: -30 }, far: { x: 0.7 * L, y: 0.22 * L, toe: -30 } }, arms: { near: { shoulder: 130, elbow: 30 }, far: { shoulder: 150, elbow: 30 } }, face: { eyes: 'angry', mouth: 'line' }, fit: true });
    const curl = P(c, { torso: -70, legs: { near: { x: 0.2 * L, y: -0.3 * L, toe: -30 }, far: { x: 0.1 * L, y: -0.15 * L, toe: -30 } }, arms: { near: { shoulder: 170, elbow: 60 }, far: { shoulder: 170, elbow: 60 } }, face: fury, fit: true });
    const kip = P(c, { torso: -30, air: 6 * u, legs: { near: { x: 0.6 * L, y: 0.4 * L, toe: 0 }, far: { x: 0.4 * L, y: 0.5 * L, toe: 0 } }, arms: { near: { shoulder: 60, elbow: 40, spread: 40 }, far: { shoulder: 70, elbow: 40, spread: 40 } }, face: fury });
    const tuck = P(c, { torso: 10, air: 8 * u, legs: { near: { x: 0.3 * L, y: 0.5 * L, toe: 20 }, far: { x: -0.2 * L, y: 0.55 * L, toe: 40 } }, arms: { near: { shoulder: 40, elbow: 80, spread: 20 }, far: { shoulder: 30, elbow: 80, spread: 20 } }, face: fury });
    const land = P(c, { torso: 22, legs: feet(c, 0.7, 0.3), arms: { near: { shoulder: 20, elbow: 60, spread: 30 }, far: { shoulder: 10, elbow: 60, spread: 30 } }, face: { eyes: 'angry', mouth: 'line' }, support: 'both' });
    const fist = P(c, { torso: 4, legs: feet(c, 0.25, 0.28), arms: { near: { shoulder: 60, elbow: 120, spread: 10 }, far: { shoulder: 10, elbow: 80, spread: 10 } }, face: { eyes: 'angry', mouth: 'grin' }, support: 'both' });
    return [...sideways(c, [down, curl]), kip, tuck, tuck, land, fist, fist];
  },
};

/** La estirada del arquero: se agacha hasta el piso y vuela acostado en el aire, entero, el doble de alto, con los brazos por delante. */
export const nkxKeeperDive: AnimDef = {
  name: 'nkx_keeper_dive', pack: 'football', fps: 12, loop: false,
  events: [{ type: 'despegue', phase: 1 / 8 }, { type: 'atrapa', phase: 3 / 8, joint: 'handNear' }, { type: 'aterriza', phase: 6 / 8 }],
  travel: { ref: 'run', k: [0.3, 1.1, 1.1, 0.9, 0.6, 0.2, 0] },
  build: (c) => {
    const L = c.L, u = c.u;
    const load = P(c, { torso: 30, legs: feet(c, 0.95, 0.34), arms: { near: { shoulder: -50, elbow: 30, spread: 40 }, far: { shoulder: -40, elbow: 30, spread: 40 } }, face: fury, support: 'both' });
    const launch = P(c, { air: 5 * u, torso: 58, freeArms: true, legs: { near: { x: -0.6 * L, y: 0.6 * L, toe: 55 }, far: { x: -0.78 * L, y: 0.78 * L, toe: 65 } }, arms: { near: { shoulder: 165, elbow: 8 }, far: { shoulder: 158, elbow: 8 } }, face: { eyes: 'wide', mouth: 'open' } });
    const fly = (h: number, k: number) => P(c, { air: h * u, torso: 84 + k * 8, flat: true, freeArms: true, legs: { near: { x: -0.98 * L, y: (0.04 + k * 0.1) * L, toe: 80 }, far: { x: -0.9 * L, y: (0.22 - k * 0.1) * L, toe: 80 } },
      arms: { near: { shoulder: 178, elbow: 0 }, far: { shoulder: 172, elbow: 0 } }, hands: palms, face: { eyes: 'wide', mouth: 'open' } });
    const ground = P(c, { torso: 86, flat: true, freeArms: true, legs: { near: { x: -0.9 * L, y: 0, toe: 80 }, far: { x: -0.8 * L, y: 0.2 * L, toe: 80 } }, arms: { near: { shoulder: 160, elbow: 50 }, far: { shoulder: 150, elbow: 55 } }, face: { eyes: 'closed', mouth: 'grin' } });
    return sideways(c, [load, launch, fly(11, 0), fly(14, 1), fly(13, 0), fly(7, 1), ground, ground]);
  },
};

/** El arquero esperando: las piernas muy abiertas, agachado, los brazos abiertos con las palmas, y se balancea de un lado al otro. */
export const nkxKeeperReady: AnimDef = {
  name: 'nkx_keeper_ready', pack: 'football', fps: 10, loop: true,
  build: (c) => [0, 1, 2, 1, 0, -1, -2, -1].map((s) => P(c, { torso: 22, x: s * 1.5 * c.u, legs: feet(c, 0.6 + Math.abs(s) * 0.06, 0.52),
    arms: { near: { shoulder: 62 + s * 6, elbow: 18, spread: 78 }, far: { shoulder: 62 - s * 6, elbow: 18, spread: 78 } }, hands: palms,
    head: { dx: 0, dy: 0, tilt: s * 4 }, face: { eyes: 'angry', mouth: 'line' }, support: 'both' })),
};

/** La baja con el pecho: salta, saca el pecho con los brazos abiertos y cae con el balón muerto. */
export const nkxTrap: AnimDef = {
  name: 'nkx_trap', pack: 'football', fps: 12, loop: false,
  events: [{ type: 'impacto', phase: 2 / 7 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const up = P(c, { torso: -8, air: 3 * u, legs: { near: { x: 0.15 * L, y: L - 0.5, toe: 30 }, far: { x: -0.15 * L, y: L - 0.5, toe: 30 } }, arms: { near: { shoulder: 50, elbow: 20, spread: 70 }, far: { shoulder: 50, elbow: 20, spread: 70 } }, face: { eyes: 'open', mouth: 'line' } });
    const chest = P(c, { torso: -32, air: 5 * u, legs: { near: { x: 0.3 * L, y: 0.75 * L, toe: 10 }, far: { x: -0.25 * L, y: 0.8 * L, toe: 40 } }, arms: { near: { shoulder: 70, elbow: 10, spread: 85 }, far: { shoulder: 70, elbow: 10, spread: 85 } }, hands: palms, head: { dx: 0, dy: 0, tilt: -14 }, face: { eyes: 'closed', mouth: 'line' } });
    const give = P(c, { torso: -10, air: 2 * u, legs: { near: { x: 0.2 * L, y: L - 0.5, toe: 20 }, far: { x: -0.2 * L, y: L - 0.5, toe: 20 } }, arms: { near: { shoulder: 40, elbow: 30, spread: 60 }, far: { shoulder: 40, elbow: 30, spread: 60 } }, face: { eyes: 'open', mouth: 'line' } });
    const land = P(c, { torso: 18, legs: feet(c, 0.55, 0.28), arms: { near: { shoulder: 20, elbow: 50, spread: 25 }, far: { shoulder: 15, elbow: 50, spread: 25 } }, support: 'both' });
    return [P(c, { torso: 10, legs: feet(c, 0.5, 0.24) }), up, chest, chest, give, land, P(c, { torso: 8, legs: feet(c, 0.3, 0.24) })];
  },
};

/** La carcajada de Kunio: se echa atrás, señala al caído con el dedo y se agarra la barriga, saltando de la risa. */
export const nkxLaugh: AnimDef = {
  name: 'nkx_laugh', pack: 'football', fps: 10, loop: true,
  build: (c) => [0, 1, 0, 1, 0, 1, 0, 1].map((b, i) => P(c, { torso: -24 + b * 12, air: b ? 0 : 2 * c.u, legs: feet(c, 0.2 + b * 0.25, 0.3),
    arms: { near: { shoulder: 86 - b * 10, elbow: 0, spread: 6 }, far: { shoulder: 28, elbow: 115, spread: 8 } }, hands: { near: 'dedo' as const },
    head: { dx: 0, dy: 0, tilt: -22 + b * 10 }, face: { eyes: 'happy' as const, mouth: i % 2 ? 'grin' as const : 'open' as const }, support: 'both' })),
};

/** Les metieron un gol: de rodillas, doblado hacia el piso, y le pega al pasto con el puño. */
export const nkxSad: AnimDef = {
  name: 'nkx_sad', pack: 'football', fps: 8, loop: true,
  build: (c) => {
    const L = c.L;
    return [0, 0, 1, 2, 2, 1, 0, 0].map((b) => P(c, { torso: 50 + b * 8, legs: { near: { x: 0.45 * L, y: 0.5 * L, toe: 0 }, far: { x: -0.55 * L, y: 0.42 * L, toe: 70 } },
      arms: { near: { shoulder: 95 - b * 40, elbow: 30 - b * 12, spread: 10 }, far: { shoulder: 20, elbow: 20, spread: 20 } },
      head: { dx: 0, dy: b * 0.5 * c.u, tilt: 26 + b * 5 }, face: { eyes: 'closed' as const, mouth: b === 2 ? 'o' as const : 'line' as const } }));
  },
};

/** Esperando, como Kunio: en guardia, rebota de verdad en las puntas (baja y sube medio cuerpo) y bombea los puños. */
export const nkxIdle: AnimDef = {
  name: 'nkx_idle', pack: 'football', fps: 9, loop: true,
  build: (c) => [0, 1, 2, 1, 0, 1, 2, 1].map((b, i) => P(c, { torso: 6 + b * 6, air: b === 0 ? Math.round(1.5 * c.u) : 0, legs: feet(c, 0.15 + b * 0.22, 0.32),
    arms: { near: { shoulder: 30 + b * 18 + (i < 4 ? 10 : -6), elbow: 110, spread: 16 }, far: { shoulder: 18 + b * 18 + (i < 4 ? -6 : 10), elbow: 110, spread: 16 } },
    head: { dx: 0, dy: 0, tilt: i < 4 ? 3 : -3 }, face: { eyes: i === 5 ? 'closed' as const : 'angry' as const, mouth: 'line' as const }, support: 'both' })),
};

/** La carrera de Kunio: el cuerpo adelante, los codos doblados barriendo de adelante a atrás y las rodillas bien arriba, con vuelo. */
export const nkxRun: AnimDef = {
  name: 'nkx_run', pack: 'football', fps: 14, loop: true, steady: true, hairTrail: -1,
  events: run.events,
  build: (c) => exaggerate(run.build(c), { t: 1.5, a: 2.1, l: 1.28, lean: 14 }).map((p, i) => ({ ...p, air: i % 4 === 1 || i % 4 === 2 ? Math.round(1.5 * c.u) : 0,
    arms: { near: { ...p.arms.near, elbow: 105 }, far: { ...p.arms.far, elbow: 105 } }, face: { eyes: 'angry' as const, mouth: 'line' as const } })),
};

export const NEKKETSU_PROPUESTA: AnimDef[] = [nkxSlide, nkxPass, nkxFly, nkxDizzy, nkxGetup, nkxKeeperDive, nkxKeeperReady, nkxTrap, nkxLaugh, nkxSad, nkxIdle, nkxRun];
