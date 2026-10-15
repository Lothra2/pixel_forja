import type { Pose, PropState } from '../rig/pose';
import { type AnimDef, type Ctx, P, feet, hipY } from './types';
import { fierce, spark, down, street } from './brawl';
import { pedalea } from './recorridos';

/**
 * Las técnicas de equipo de la pelea (lote B7 del pedido) y lo que faltaba de B5 y B6 que el juego usa hoy.
 *
 * Una técnica por equipo, con la barra llena. Lo que se agarra es un arma del piso y va en `arma`, como en la pelea
 * callejera: el furro, el palo de escoba, la silla plástica y la chancleta. El juego las dibuja con el atlas de
 * objetos. Lo que sale volando (la silla, las chancletas) sale en la `suelta`, desde su `punto`, igual que
 * `weapon_throw`. La bici y el peine sí van en el sprite.
 *
 * El que recibe la ciclovía tiene su animación (`bike_charged`), cuadro a cuadro con quien la tira: el choque dura
 * varios cuadros. A los otros golpes el rival responde con lo de siempre (`fight_hit`, `ko_bounce`, `thrown_spin`),
 * cuando le llega el golpe o lo que le tiraron.
 */

const R = (c: Ctx, v: number) => Math.round(v * c.u);
const yell = { eyes: 'angry' as const, mouth: 'open' as const };
const grin = { eyes: 'angry' as const, mouth: 'grin' as const };
const smug = { eyes: 'happy' as const, mouth: 'grin' as const };
const hurtF = { eyes: 'hurt' as const, mouth: 'o' as const };

/** El arma del piso en la mano cercana, o entre las dos manos (`hands`): `side` es su ángulo de lado. */
const held = (side: number, at: PropState['at'] = 'handNear', extra: Partial<PropState> = {}): PropState => ({ kind: 'held', at, angles: { side, se: side + 8, ne: side - 8 }, ...extra });
const twoHands = (sh: number, el: number, d = 6) => ({ near: { shoulder: sh, elbow: el }, far: { shoulder: sh - d, elbow: el + 10 } });

// ---------------------------------------------------------------- Familia GG: el chancletazo

/**
 * El Chancletazo Supremo (`slipper_storm`, Familia GG): la chancleta de mamá, tres veces seguidas. Arma el brazo por
 * encima del hombro y la suelta (suelta 3), saca otra del bolsillo de atrás y la suelta (suelta 6), y la tercera con
 * todo, dando el paso (suelta 9). Termina con la mano en la cintura: "¿y ahora qué?". La chancleta va en `arma`
 * hasta cada suelta.
 */
export const slipperStorm: AnimDef = {
  name: 'slipper_storm', pack: 'brawl', fps: 14, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'suelta', phase: 3 / 12, joint: 'handNear' }, { type: 'suelta', phase: 6 / 12, joint: 'handNear' }, { type: 'suelta', phase: 9 / 12, joint: 'handNear' }],
  build: (c) => {
    const L = c.L;
    const ready = P(c, { ...street(c), props: [held(-40)] });
    const back = (t = -10): Pose => P(c, { torso: t, x: -c.u, legs: { near: { x: 0.3 * L, y: L - 0.7 }, far: { x: -0.35 * L, y: L - 1.0 } },
      arms: { near: { shoulder: 160, elbow: 90 }, far: { shoulder: 80, elbow: 30 } }, face: fierce, support: 'far', props: [held(-170, 'handNear', { behind: true })] });
    const whip = (t = 0): Pose => ({ ...back(t), arms: { near: { shoulder: 150, elbow: 40 }, far: { shoulder: 70, elbow: 30 } }, props: [held(-120, 'handNear', { behind: true })] });
    const out = (t = 20): Pose => P(c, { torso: t, legs: { near: { x: 0.4 * L, y: L - 1.0 }, far: { x: -0.35 * L, y: L - 0.5, toe: 30 } },
      arms: { near: { shoulder: 110, elbow: 0 }, far: { shoulder: 30, elbow: 60 } }, face: yell, support: 'near' });
    // la mano al bolsillo de atrás por otra
    const pocket = P(c, { torso: 6, legs: feet(c, 0.25, 0.24), arms: { near: { shoulder: -40, elbow: 30 }, far: { shoulder: 50, elbow: 60 } }, face: fierce, support: 'both', props: [held(60)] });
    const stride = P(c, { torso: 26, legs: { near: { x: 0.55 * L, y: L - 1.4 }, far: { x: -0.4 * L, y: L - 0.5, toe: 40 } },
      arms: { near: { shoulder: 115, elbow: 0 }, far: { shoulder: 20, elbow: 60 } }, face: { eyes: 'angry', mouth: 'open' }, support: 'near' });
    // la mano en la cintura y el dedo que apunta
    const hips = P(c, { torso: -4, legs: feet(c, 0.2, 0.26), arms: { near: { shoulder: 90, elbow: 0 }, far: { shoulder: 30, elbow: 130, spread: 30 } }, face: grin, support: 'both' });
    return [ready, back(), whip(), out(), pocket, back(-6), out(22), pocket, { ...back(-14), x: -2 * c.u }, stride, hips, { ...hips, face: smug }];
  },
};

// ---------------------------------------------------------------- Instituto Nekketsu: el copete

/** El peine en la mano: va en el sprite, no es un arma del piso. */
const peine = (side: number): PropState => ({ kind: 'peine', at: 'handNear', angles: { side, se: side + 8, ne: side - 8 }, front: true });

/**
 * El Copetazo (`comb_hair`, Instituto Nekketsu): saca el peine del bolsillo de atrás, se peina el copete dos veces,
 * muy creído, tira el peine, baja la cabeza y embiste de cabeza (impacto, con la cabeza). Se arregla el pelo al
 * terminar. Con `desplazamiento`.
 */
export const combHair: AnimDef = {
  name: 'comb_hair', pack: 'brawl', fps: 12, loop: false, lateral: true, views: ['side', 'front', 'back'],
  travel: { ref: 'run', k: [0, 0, 0, 0, 0, 0.6, 1.6, 1.8, 0, 0, 0, 0] },
  events: [{ type: 'impacto', phase: 8 / 12, joint: 'head' }],
  build: (c) => {
    const L = c.L;
    const cocky = P(c, { torso: -4, legs: feet(c, 0.15, 0.24), arms: { near: { shoulder: -10, elbow: 20 }, far: { shoulder: -15, elbow: 20 } }, face: fierce, support: 'both' });
    const pull = P(c, { ...cocky, arms: { near: { shoulder: -50, elbow: 30 }, far: { shoulder: -15, elbow: 20 } }, props: [peine(80)] });
    // el peine pasa por el copete de adelante hacia atrás
    const combA = P(c, { ...cocky, head: { dx: 0, dy: 0, tilt: -8 }, arms: { near: { shoulder: 150, elbow: 110 }, far: { shoulder: -15, elbow: 20 } }, face: smug, props: [peine(-60)] });
    const combB = P(c, { ...cocky, head: { dx: 0, dy: 0, tilt: -10 }, arms: { near: { shoulder: 175, elbow: 50 }, far: { shoulder: -15, elbow: 20 } }, face: smug, props: [peine(-150)] });
    // baja la cabeza, el cuerpo adelante y los brazos atrás
    const lower = P(c, { torso: 38, legs: { near: { x: 0.4 * L, y: L - 1.6 }, far: { x: -0.4 * L, y: L - 1.0, toe: 30 } },
      arms: { near: { shoulder: -60, elbow: 20 }, far: { shoulder: -50, elbow: 20 } }, face: yell, support: 'near' });
    const dash = P(c, { torso: 58, legs: { near: { x: 0.5 * L, y: L - 1.2 }, far: { x: -0.55 * L, y: L - 0.6, toe: 40 } },
      arms: { near: { shoulder: -80, elbow: 10 }, far: { shoulder: -70, elbow: 10 } }, face: yell, support: 'near' });
    const hit = { ...dash, torso: 64, face: grin };
    const recoil = P(c, { torso: -8, x: -c.u, legs: feet(c, 0.3, 0.26), arms: { near: { shoulder: 40, elbow: 40 }, far: { shoulder: 30, elbow: 40 } }, face: fierce, support: 'both' });
    const fix = P(c, { ...cocky, arms: { near: { shoulder: 165, elbow: 100 }, far: { shoulder: -15, elbow: 20 } }, face: smug });
    return [cocky, pull, combA, combB, combA, { ...combB, face: grin }, lower, dash, hit, recoil, fix, cocky];
  },
};

// ---------------------------------------------------------------- Los Panas de Caracas: el jonrón

/** El palo de escoba a dos manos (arma del piso), como en `bat_swing`. */
const palo = (side: number, extra: Partial<PropState> = {}): PropState => held(side, 'hands', extra);

/**
 * El Batazo de Jonrón (`cap_bat_power`, Los Panas de Caracas): primero anuncia el jonrón apuntando con el palo al
 * cielo, después levanta la pierna con el palo bien atrás, da el paso largo y le pega con todo (impacto, con la
 * estela y la chispa). Lo enrolla sobre el otro hombro y se queda mirando cómo se va. El palo va en `arma`.
 */
export const capBatPower: AnimDef = {
  name: 'cap_bat_power', pack: 'baseball', fps: 14, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 6 / 12 }],
  build: (c) => {
    const L = c.L;
    // el anuncio: el palo apuntando al cielo con la mano cercana, la otra en la cintura
    const call = P(c, { torso: -6, legs: feet(c, 0.2, 0.28), head: { dx: 0, dy: 0, tilt: -14 }, arms: { near: { shoulder: 160, elbow: 10 }, far: { shoulder: 30, elbow: 130, spread: 30 } }, face: grin, support: 'both', props: [held(-70)] });
    const stance = P(c, { torso: 8, legs: { near: { x: 0.34 * L, y: L - 1.5 }, far: { x: -0.36 * L, y: L - 1.7, toe: 10 } }, arms: twoHands(28, 125), face: fierce, support: 'both', props: [palo(-148, { behind: true })] });
    const kick = P(c, { torso: -4, x: -c.u, legs: { near: { x: 0.18 * L, y: 0.45 * L, toe: 20 }, far: { x: -0.32 * L, y: L - 1.7 } }, arms: twoHands(8, 125), face: fierce, support: 'far', props: [palo(-180, { behind: true })] });
    const stride = P(c, { torso: 4, legs: { near: { x: 0.6 * L, y: L - 1.9 }, far: { x: -0.4 * L, y: L - 1.6, toe: 10 } }, arms: twoHands(45, 90), face: yell, support: 'both', props: [palo(-135, { behind: true })] });
    const whip = P(c, { torso: 12, legs: { near: { x: 0.58 * L, y: L - 1.8 }, far: { x: -0.36 * L, y: L - 1.1, toe: 30 } }, arms: twoHands(75, 30, 4), face: yell, support: 'near', props: [palo(-55)] });
    const hit = P(c, { torso: 18, legs: { near: { x: 0.58 * L, y: L - 1.7 }, far: { x: -0.3 * L, y: L - 0.8, toe: 50 } }, arms: twoHands(92, 0, 4), face: grin, support: 'near',
      props: [palo(0, { smear: { side: [-150, 0], se: [-140, 8], ne: [-160, -8] } }), spark('handNear', 0)] });
    const wrap = P(c, { torso: 8, legs: { near: { x: 0.5 * L, y: L - 1.4 }, far: { x: -0.15 * L, y: L - 0.5, toe: 60 } }, arms: twoHands(100, 60), face: grin, support: 'near',
      props: [palo(-175, { smear: { side: [10, 185], se: [18, 193], ne: [2, 177] }, behind: true })] });
    // mirando cómo se va la bola, el palo colgando de la mano cercana y la otra de visera
    const watch = P(c, { torso: -6, legs: feet(c, 0.25, 0.3), head: { dx: 0, dy: 0, tilt: -16 }, arms: { near: { shoulder: 15, elbow: 10 }, far: { shoulder: 150, elbow: 120 } }, face: smug, support: 'both', props: [held(100)] });
    return [call, call, stance, kick, stride, whip, hit, wrap, wrap, watch, watch, { ...watch, face: grin }];
  },
};

// ---------------------------------------------------------------- Rồng Sài Gòn: la silla plástica

/**
 * La Silla Plástica Voladora (`chair_spin_throw`, Rồng Sài Gòn, la técnica de Bà Hoa): agarra la silla con las dos
 * manos, la levanta y da dos vueltas con los brazos estirados (los cuadros 3 y 5 vienen `girado`: el juego los
 * espeja), y la suelta adelante con todo (suelta 7). Queda mareada un momento y se compone. La silla va en `arma`
 * hasta la suelta.
 */
export const chairSpinThrow: AnimDef = {
  name: 'chair_spin_throw', pack: 'brawl', fps: 14, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'suelta', phase: 7 / 12 }],
  build: (c) => {
    const L = c.L;
    const grab = P(c, { torso: 24, legs: feet(c, 0.6, 0.26), arms: twoHands(60, 20), face: fierce, support: 'both', props: [held(-20, 'hands')] });
    const lift = P(c, { torso: 4, legs: feet(c, 0.3, 0.26), arms: twoHands(95, 40), face: fierce, support: 'both', props: [held(-60, 'hands')] });
    // la vuelta: los brazos estirados al frente y la silla afuera, el cuerpo echado atrás para hacer contrapeso
    const spin = (t: number, gir: boolean): Pose => ({ ...P(c, { torso: -12 + t, legs: { near: { x: 0.22 * L, y: L - 1.1, toe: 10 }, far: { x: -0.25 * L, y: L - 1.2 } },
      arms: twoHands(88, 0, 2), face: yell, support: gir ? 'far' : 'near', props: [held(-4, 'hands')] }), ...(gir ? { girado: true } : {}) });
    const wind = P(c, { torso: -18, x: -c.u, legs: { near: { x: 0.3 * L, y: L - 0.9 }, far: { x: -0.4 * L, y: L - 1.4 } }, arms: twoHands(165, 10), face: yell, support: 'far', props: [held(-160, 'hands', { behind: true })] });
    const release = P(c, { torso: 22, legs: { near: { x: 0.5 * L, y: L - 1.4 }, far: { x: -0.35 * L, y: L - 0.6, toe: 30 } }, arms: twoHands(100, 0), face: grin, support: 'near' });
    // mareada: se tambalea y se compone
    const dizzy = (t: number, tilt: number): Pose => P(c, { torso: t, legs: feet(c, 0.25, 0.3), head: { dx: 0, dy: 0, tilt }, arms: { near: { shoulder: 60, elbow: 60, spread: 30 }, far: { shoulder: 50, elbow: 60, spread: 30 } }, face: hurtF, support: 'both' });
    return [grab, lift, spin(0, false), spin(4, true), spin(0, false), spin(4, true), wind, release, dizzy(-14, 14), dizzy(10, -14), dizzy(-6, 8), { ...street(c), face: grin }];
  },
};

// ---------------------------------------------------------------- Rolos de Chapinero: la ciclovía

/**
 * La Ciclovía Infernal (`bike_charge`, Rolos de Chapinero, la técnica de Camila): pedalea a fondo cada vez más
 * agachada, se tira sobre el manubrio y embiste (impacto, adelante de la bici), frena derrapando y se endereza. La
 * bici va en el sprite. Con `desplazamiento`. El rival responde con `bike_charged`, cuadro a cuadro.
 */
export const bikeCharge: AnimDef = {
  name: 'bike_charge', pack: 'bike', fps: 14, loop: false, hairTrail: -1,
  travel: { ref: 'run', k: [1.2, 1.3, 1.4, 1.5, 1.6, 1.4, 0.8, 0.4, 0.2, 0] },
  events: [{ type: 'impacto', phase: 5 / 10, joint: 'handNear' }],
  build: (c) => {
    const f = [36, 44, 50, 54].map((t, i) => pedalea(c, i * 2, t, 0, yell));
    const tuck = pedalea(c, 0, 58, 0, yell);
    const ram = { ...pedalea(c, 2, 60, 0, grin) };
    ram.props = [...(ram.props ?? []), spark('handNear', 0)];
    const skid = pedalea(c, 4, 30, 0, fierce);
    const coast = pedalea(c, 4, 22, 0, grin);
    return [...f, tuck, ram, skid, skid, coast, coast];
  },
};

/**
 * El que se come la ciclovía (`bike_charged`), cuadro a cuadro con `bike_charge`: en guardia, ve venir la bici (abre
 * los ojos), el golpe en el 5 lo levanta para atrás, vuela de espaldas y cae (aterriza en el 7). Queda tirado.
 */
export const bikeCharged: AnimDef = {
  name: 'bike_charged', pack: 'brawl', fps: 14, loop: false, lateral: true, views: ['side', 'front', 'back'],
  events: [{ type: 'aterriza', phase: 7 / 10 }],
  build: (c) => {
    const L = c.L;
    const guard = street(c);
    const see = { ...guard, face: { eyes: 'wide' as const, mouth: 'o' as const } };
    const brace = P(c, { torso: -10, legs: feet(c, 0.3, 0.26), arms: { near: { shoulder: 100, elbow: 20, spread: 20 }, far: { shoulder: 110, elbow: 20, spread: 20 } }, face: { eyes: 'wide', mouth: 'o' }, support: 'both' });
    const snap = P(c, { torso: -32, x: -c.u, head: { dx: 0, dy: 0, tilt: -20 }, legs: { near: { x: 0.35 * L, y: L - 0.6, toe: 30 }, far: { x: 0.1 * L, y: L - 0.4 } },
      arms: { near: { shoulder: 150, elbow: 30, spread: 40 }, far: { shoulder: 160, elbow: 30, spread: 40 } }, face: hurtF });
    const fly = P(c, { torso: -70, rise: R(c, 10), x: -2 * c.u, legs: { near: { x: 0.6 * L, y: 0.25 * L, toe: 20 }, far: { x: 0.45 * L, y: 0.4 * L, toe: 20 } },
      arms: { near: { shoulder: 150, elbow: 30 }, far: { shoulder: 165, elbow: 30 } }, face: hurtF, fit: true });
    const fly2 = P(c, { ...fly, torso: -82, rise: R(c, 6) });
    return [guard, guard, see, see, brace, snap, fly, { ...fly2, rise: 0, ...down(c, 0, 'hurt') }, down(c, 0, 'hurt'), down(c)];
  },
};

// ---------------------------------------------------------------- Maracuchos del Lago: el furro

/**
 * El Furrazo (`play_drum`, Maracuchos del Lago, la técnica de Ender): con el furro entre las manos frota la vara
 * para arriba y para abajo al ritmo de la gaita, meneándose, lo levanta por encima de la cabeza y lo descarga
 * adelante con todo (impacto, con la chispa: ahí sale el retumbo). El furro es el arma del piso `furro`, en `arma`.
 */
export const playDrum: AnimDef = {
  name: 'play_drum', pack: 'brawl', fps: 12, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 7 / 10, joint: 'handNear' }],
  build: (c) => {
    // tocando: el furro a la cintura, una mano lo sostiene y la otra frota la vara (sube y baja)
    const play = (k: number): Pose => P(c, { torso: 6 + (k % 2) * 4, legs: feet(c, 0.3 + (k % 2) * 0.12, 0.28), head: { dx: 0, dy: 0, tilt: k % 2 ? 6 : -4 },
      arms: { near: { shoulder: 40 + (k % 2) * 30, elbow: 90 - (k % 2) * 30 }, far: { shoulder: 35, elbow: 70 } }, face: k % 2 ? grin : smug, support: 'both', props: [held(90, 'hands')] });
    const raise = P(c, { torso: -8, x: -c.u, legs: feet(c, 0.15, 0.28), arms: twoHands(168, -10, 2), face: yell, support: 'both', load: true, props: [held(180, 'hands')] });
    const slam = P(c, { torso: 30, legs: { near: { x: 0.45 * (c.L), y: c.L - 1.4 }, far: { x: -0.35 * c.L, y: c.L - 0.6, toe: 20 } }, arms: twoHands(80, 0, 2), face: grin, support: 'near', props: [held(90, 'hands'), spark('handNear', 40)] });
    const hold = P(c, { torso: 14, legs: feet(c, 0.3, 0.28), arms: twoHands(60, 40), face: grin, support: 'both', props: [held(90, 'hands')] });
    return [play(0), play(1), play(0), play(1), play(0), play(1), raise, slam, hold, hold];
  },
};

// ---------------------------------------------------------------- Quemado, Vóley y Cross

/** El balón de goma del Quemado, del tamaño del de vóley (sale en `objetos` como `voley`, igual que en `dodge_throw`). */
const goma = (x: number, y: number, at: PropState['at'] = 'ground'): PropState => ({ kind: 'volleyball', at, x, y });

/**
 * Atrapar el balonazo del Quemado (`dodge_catch`): agachado con los brazos adelante, el balón le llega al pecho, lo
 * abraza (impacto y atrapa en el 2, el golpe lo echa un poco atrás) y se endereza con el balón, sonriendo. El balón
 * va en `objetos` de principio a fin.
 */
export const dodgeCatch: AnimDef = {
  name: 'dodge_catch', pack: 'baseball', fps: 12, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 2 / 6, joint: 'handNear' }, { type: 'atrapa', phase: 2 / 6, joint: 'handNear' }],
  build: (c) => {
    const L = c.L, u = c.u;
    const ready = P(c, { torso: 16, legs: feet(c, 0.45, 0.26), arms: { near: { shoulder: 75, elbow: 40 }, far: { shoulder: 70, elbow: 40 } }, face: fierce, support: 'both' });
    const reach = P(c, { ...ready, torso: 12, arms: { near: { shoulder: 85, elbow: 20 }, far: { shoulder: 80, elbow: 20 } } });
    // el golpe contra el pecho: lo abraza y se va un poco atrás
    const hug = P(c, { torso: -8, x: -u, legs: feet(c, 0.4, 0.28), arms: { near: { shoulder: 50, elbow: 110 }, far: { shoulder: 45, elbow: 110 } }, face: { eyes: 'closed', mouth: 'line' }, support: 'both' });
    const stand = P(c, { torso: 4, legs: feet(c, 0.2, 0.26), arms: { near: { shoulder: 45, elbow: 110 }, far: { shoulder: 40, elbow: 110 } }, face: smug, support: 'both' });
    const ball = [goma(2.6 * L, 12 * u), goma(1.7 * L, 12 * u), goma(2 * u, 0, 'hands'), goma(2 * u, 0, 'hands'), goma(2 * u, 0, 'hands'), goma(2 * u, 0, 'hands')];
    return [ready, reach, hug, hug, stand, stand].map((p, i) => ({ ...p, props: [{ ...ball[i], front: true }] }));
  },
};

/**
 * Correr en la arena (`beach_run`, el Vóley de playa): más pesado que `run`. Las rodillas suben más porque el pie se
 * hunde, el cuerpo va adelante, los brazos bracean ancho y el paso es más corto. Dos pasos por vuelta (`paso` en el
 * 0 y el 4): ahí el juego levanta la arena.
 */
export const beachRun: AnimDef = {
  name: 'beach_run', pack: 'basic', fps: 12, loop: true, views: ['side', 'front', 'back'],
  events: [{ type: 'paso', phase: 0, foot: 'near' }, { type: 'paso', phase: 4 / 8, foot: 'far' }],
  build: (c) => {
    const L = c.L;
    const ground = hipY(c, 0.35);
    const frames: Pose[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      // la pierna de apoyo atrás en la arena (con la punta hundida), la otra sube alta adelante
      const leg = (ph: number) => {
        const s = Math.sin(ph), x = Math.cos(ph) * 0.36 * L;
        return s > 0 ? { x, y: ground - s * 0.5 * L, toe: 20 } : { x, y: ground, toe: -15 };
      };
      const arm = (ph: number) => ({ shoulder: 20 + Math.cos(ph) * 55, elbow: 80, spread: 20 });
      frames.push(P(c, {
        torso: 20, legs: { near: leg(a + Math.PI / 2), far: leg(a - Math.PI / 2) },
        arms: { near: arm(a + Math.PI), far: arm(a) }, face: { eyes: 'angry', mouth: 'open' },
        support: Math.sin(a + Math.PI / 2) > 0 ? 'far' : 'near',
      }));
    }
    return frames;
  },
};

/**
 * Esquivar una moto (`traffic_dodge`, el Cross): se asusta con los brazos arriba, salta de lado recogiendo las
 * piernas (despegue en el 1, `elevacion`), cae agachado (aterriza en el 4) y le reclama con el puño a la moto que
 * pasó. El juego lo mueve de carril mientras está en el aire.
 */
export const trafficDodge: AnimDef = {
  name: 'traffic_dodge', pack: 'basic', fps: 14, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'despegue', phase: 1 / 6 }, { type: 'aterriza', phase: 4 / 6 }],
  build: (c) => {
    const L = c.L;
    const scared = { eyes: 'wide' as const, mouth: 'o' as const };
    const startle = P(c, { torso: -10, legs: feet(c, 0.3, 0.26), arms: { near: { shoulder: 140, elbow: 40, spread: 40 }, far: { shoulder: 150, elbow: 40, spread: 40 } }, face: scared, support: 'both' });
    const push = P(c, { torso: 0, rise: R(c, 4), legs: { near: { x: 0.05 * L, y: L - 0.1, toe: 50 }, far: { x: -0.05 * L, y: L - 0.1, toe: 50 } }, arms: { near: { shoulder: 160, elbow: 30, spread: 50 }, far: { shoulder: 150, elbow: 30, spread: 50 } }, face: scared });
    const tuck = P(c, { torso: 8, rise: R(c, 11), legs: { near: { x: 0.25 * L, y: 0.35 * L, toe: 30 }, far: { x: 0.1 * L, y: 0.45 * L, toe: 30 } }, arms: { near: { shoulder: 130, elbow: 60, spread: 60 }, far: { shoulder: 120, elbow: 60, spread: 60 } }, face: scared });
    const drop = P(c, { ...tuck, rise: R(c, 6), legs: { near: { x: 0.2 * L, y: L - 1.0, toe: 30 }, far: { x: -0.05 * L, y: L - 0.8, toe: 30 } } });
    const land = P(c, { torso: 18, legs: feet(c, 0.85, 0.3), arms: { near: { shoulder: 40, elbow: 60, spread: 30 }, far: { shoulder: 30, elbow: 60, spread: 30 } }, face: fierce, support: 'both' });
    // el puño a la moto, mirando hacia donde se fue
    const shake = P(c, { torso: -6, legs: feet(c, 0.3, 0.26), head: { dx: 0, dy: 0, tilt: -6, yaw: -20 }, arms: { near: { shoulder: 150, elbow: 80 }, far: { shoulder: 20, elbow: 40 } }, face: yell, support: 'both' });
    return [startle, push, tuck, drop, land, shake];
  },
};

/** Las del lote B7, en el orden del pedido: las técnicas de equipo y lo de B5 y B6 que el juego usa hoy. */
export const TECNICAS: AnimDef[] = [playDrum, bikeCharge, bikeCharged, capBatPower, chairSpinThrow, slipperStorm, combHair, dodgeCatch, beachRun, trafficDodge];

