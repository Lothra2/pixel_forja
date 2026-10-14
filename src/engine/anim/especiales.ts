import type { Pose, PropState } from '../rig/pose';
import { type AnimDef, type Ctx, P, feet, hipY } from './types';
import { fierce, spark, street } from './brawl';

/**
 * Los súper golpes de cada deporte (el golpe con la barra llena) y lo que faltaba de B4 a B6: el Quemado, la Chapita,
 * el đá cầu y la patada tijera del vovinam.
 *
 * Cada súper golpe trae un `impacto` o una `suelta` en el cuadro donde sale el golpe. El aura y el fuego los pone el
 * juego encima: el sprite trae el cuerpo, la chispa del contacto y, cuando hace falta, la pelota o el implemento.
 * Las pelotas van como en sus deportes (`sin_props` las quita y salen en `objetos`), y el palo de la Chapita es el arma
 * del piso, que va en `arma`.
 */

const R = (c: Ctx, v: number) => Math.round(v * c.u);
const yell = { eyes: 'angry' as const, mouth: 'open' as const };
const grin = { eyes: 'angry' as const, mouth: 'grin' as const };

/** Gira la pose alrededor del centro del cuerpo y no de la cadera (vueltas en el aire), como en la chilena. */
function centered(c: Ctx, p: Pose): Pose {
  const hc = (c.d.torsoH + c.d.headW * 0.5) * 0.5;
  return { ...p, x: p.x - Math.sin((p.torso * Math.PI) / 180) * hc };
}

/** Corriendo, un paso de cada lado. */
function runStep(c: Ctx, side: 0 | 1, torso = 16): Pose {
  const L = c.L;
  const a = { x: 0.38 * L, y: L - 0.6 }, b = { x: -0.42 * L, y: L - 0.7, toe: 30 };
  return P(c, {
    torso, legs: side ? { near: b, far: a } : { near: a, far: b },
    arms: side ? { near: { shoulder: 50, elbow: 80 }, far: { shoulder: -40, elbow: 80 } } : { near: { shoulder: -40, elbow: 80 }, far: { shoulder: 50, elbow: 80 } },
    face: fierce, support: side ? 'far' : 'near',
  });
}

// ---------------------------------------------------------------- básquet

const bball = (x: number, y: number, at: PropState['at'] = 'handNear'): PropState => ({ kind: 'basketball', at, x, y });

/**
 * La clavada Nekketsu (`dunk_big`): se agacha con el balón, despega, sube altísimo dando el molino con el brazo (el
 * balón baja por detrás, pasa por encima de la cabeza) y lo clava con todo (impacto, donde se rompe el tablero). Se
 * queda colgado del aro con las piernas sueltas, se suelta y aterriza agachado, y se para rugiendo. Sube con
 * `elevacion` (mucho más que `dunk`): el juego levanta el sprite sobre su sombra.
 */
export const dunkBig: AnimDef = {
  name: 'dunk_big', pack: 'basket', fps: 14, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'despegue', phase: 2 / 12 }, { type: 'impacto', phase: 6 / 12, joint: 'handNear' }, { type: 'aterriza', phase: 9 / 12 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const hold = P(c, { torso: 12, legs: feet(c, 0.4, 0.22), arms: { near: { shoulder: 40, elbow: 60 }, far: { shoulder: 45, elbow: 60 } }, face: fierce, support: 'both' });
    const load = P(c, { torso: 26, legs: feet(c, 0.95, 0.24), arms: { near: { shoulder: 10, elbow: 40 }, far: { shoulder: 15, elbow: 40 } }, face: fierce, support: 'both' });
    const take = P(c, { torso: 2, rise: R(c, 6), legs: { near: { x: 0.08 * L, y: L - 0.1, toe: 55 }, far: { x: -0.1 * L, y: L - 0.2, toe: 55 } },
      arms: { near: { shoulder: 120, elbow: 20 }, far: { shoulder: 110, elbow: 30 } }, face: yell });
    // el molino: el brazo con el balón baja por delante y se va atrás, las rodillas recogidas
    const wind1 = P(c, { torso: -6, rise: R(c, 15), legs: { near: { x: 0.3 * L, y: 0.55 * L, toe: 30 }, far: { x: -0.15 * L, y: 0.75 * L, toe: 40 } },
      arms: { near: { shoulder: -70, elbow: 10 }, far: { shoulder: 100, elbow: 30, spread: 20 } }, face: fierce });
    const wind2 = P(c, { ...wind1, torso: -14, rise: R(c, 21), arms: { near: { shoulder: -150, elbow: 10 }, far: { shoulder: 120, elbow: 30, spread: 20 } } });
    // arriba del todo: el balón sobre la cabeza, el cuerpo arqueado como un arco
    const top = P(c, { torso: -18, rise: R(c, 24), legs: { near: { x: -0.1 * L, y: 0.6 * L, toe: 50 }, far: { x: -0.3 * L, y: 0.55 * L, toe: 50 } },
      arms: { near: { shoulder: 195, elbow: 30 }, far: { shoulder: 140, elbow: 20, spread: 20 } }, face: yell });
    // ¡la clava! el brazo baja con todo el cuerpo, el balón contra el aro
    const slam = P(c, { torso: 22, rise: R(c, 23), legs: { near: { x: 0.25 * L, y: 0.65 * L, toe: 30 }, far: { x: 0, y: 0.8 * L, toe: 40 } },
      arms: { near: { shoulder: 125, elbow: 0 }, far: { shoulder: 150, elbow: 20, spread: 20 } }, face: grin });
    // colgado del aro: los dos brazos arriba, las piernas sueltas
    const hang = P(c, { torso: 4, rise: R(c, 20), legs: { near: { x: 0.12 * L, y: L - 0.2, toe: 40 }, far: { x: -0.05 * L, y: L - 0.4, toe: 40 } },
      arms: { near: { shoulder: 168, elbow: 5 }, far: { shoulder: 165, elbow: 5 } }, face: grin });
    const drop = P(c, { ...hang, rise: R(c, 11), torso: 8, arms: { near: { shoulder: 120, elbow: 30 }, far: { shoulder: 110, elbow: 30 } }, face: fierce });
    const land = P(c, { torso: 24, legs: feet(c, 0.95, 0.26), arms: { near: { shoulder: 30, elbow: 60 }, far: { shoulder: 40, elbow: 60 } }, face: fierce, support: 'both' });
    // ruge: los puños cerrados a los lados, el pecho afuera
    const roar = P(c, { torso: -6, legs: feet(c, 0.35, 0.3), arms: { near: { shoulder: 60, elbow: 120, spread: 30 }, far: { shoulder: 60, elbow: 120, spread: 30 } }, face: { eyes: 'angry', mouth: 'open' }, support: 'both' });
    const seq = [hold, load, take, wind1, wind2, top, { ...slam, props: [spark('handNear', 70)] }, hang, drop, land, roar, { ...roar, face: grin }];
    // el balón en la mano hasta la clavada (después va por el aro). El molino se ve adelante abajo y atrás: con chibi la
    // mano no pasa por encima de la cabeza, así que arriba el balón asoma por detrás del pelo y nunca tapa la cara
    const ball: (PropState | undefined)[] = [bball(1, -2 * u), bball(1, -2 * u), bball(1, -3 * u), bball(2 * u, 3 * u), { ...bball(-9 * u, -2 * u), behind: true }, { ...bball(-7 * u, -14 * u), behind: true }, bball(4 * u, 2 * u)];
    return seq.map((p, i) => (ball[i] ? { ...p, props: [...(p.props ?? []), ball[i]!] } : p));
  },
};

/**
 * La tacleada Nekketsu (`tackle_nekketsu`): corre, se lanza en plancha con los brazos adelante como un clavado,
 * vuela horizontal (impacto, el choque contra el que tiene el balón), cae de barriga y se desliza, y se levanta. Con
 * `elevacion` y `desplazamiento`. De lado: en las filas de frente y de espalda sale en la diagonal.
 */
export const tackleNekketsu: AnimDef = {
  name: 'tackle_nekketsu', pack: 'basket', fps: 14, loop: false, lateral: true, views: ['side', 'front', 'back'],
  travel: { ref: 'run', k: [1, 1, 1.2, 1.4, 1.2, 0.8, 0.5, 0.3, 0, 0] },
  events: [{ type: 'despegue', phase: 2 / 10 }, { type: 'impacto', phase: 4 / 10, joint: 'head' }, { type: 'aterriza', phase: 6 / 10 }],
  build: (c) => {
    const L = c.L;
    const dive = (torso: number, rise: number, sh: number): Pose => centered(c, P(c, {
      torso, rise, legs: { near: { x: -0.25 * L, y: 0.85 * L, toe: 60 }, far: { x: -0.45 * L, y: 0.7 * L, toe: 60 } },
      arms: { near: { shoulder: sh, elbow: 5 }, far: { shoulder: sh - 8, elbow: 10 } }, face: yell, fit: true, freeArms: true,
    }));
    // agachado a fondo, listo para lanzarse
    const coil = P(c, { torso: 40, legs: { near: { x: 0.45 * L, y: L - 1.8 }, far: { x: -0.4 * L, y: L - 1.2, toe: 40 } },
      arms: { near: { shoulder: -40, elbow: 30 }, far: { shoulder: -30, elbow: 30 } }, face: fierce, support: 'near' });
    const launch = { ...dive(55, R(c, 5), 140), face: fierce };
    const fly = dive(82, R(c, 9), 168);
    const hit = { ...dive(86, R(c, 8), 172), face: grin, props: [spark('handNear', 0)] };
    const fall = dive(90, R(c, 3), 160);
    // de barriga en el piso, los brazos adelante, y se desliza
    const belly = P(c, { torso: 90, legs: { near: { x: -0.8 * L, y: 0.05 * L, toe: 40 }, far: { x: -0.75 * L, y: 0.15 * L, toe: 40 } },
      arms: { near: { shoulder: 165, elbow: 10 }, far: { shoulder: 160, elbow: 10 } }, face: { eyes: 'angry', mouth: 'grin' }, fit: true, freeArms: true });
    const push = P(c, { torso: 50, legs: { near: { x: 0.1 * L, y: L - 2.0 }, far: { x: -0.5 * L, y: L - 1.0, toe: 40 } },
      arms: { near: { shoulder: 60, elbow: 20 }, far: { shoulder: 70, elbow: 20 } }, face: fierce, support: 'both' });
    return [runStep(c, 0, 22), coil, launch, fly, hit, fall, belly, { ...belly, face: { eyes: 'happy', mouth: 'grin' } }, push, street(c)];
  },
};

// ---------------------------------------------------------------- vóley

const vball = (c: Ctx, x: number, y: number): PropState => ({ kind: 'volleyball', at: 'ground', x: x * c.L, y: y * c.u, front: true });

/**
 * El remate de fuego (`spike_fuego`): carrera, último paso largo, despega mucho más alto que `spike`, da una vuelta
 * entera hacia adelante en el aire hecho bolita, sale arqueado con el brazo armado por encima de la pelota y la mata
 * de arriba hacia abajo (impacto). Cae con las dos piernas. Con `elevacion` y `desplazamiento`.
 */
export const spikeFuego: AnimDef = {
  name: 'spike_fuego', pack: 'volley', fps: 14, loop: false, lateral: true, views: ['side', 'front', 'back'],
  travel: { ref: 'run', k: [0.8, 0.8, 0.5, 0.3, 0.25, 0.25, 0.25, 0.2, 0.2, 0.1, 0, 0, 0] },
  events: [{ type: 'paso', phase: 0 }, { type: 'despegue', phase: 3 / 13 }, { type: 'impacto', phase: 8 / 13, joint: 'handNear' }, { type: 'aterriza', phase: 10 / 13 }],
  build: (c) => {
    const L = c.L;
    const plant = P(c, { torso: 26, legs: { near: { x: 0.45 * L, y: L - 1.9 }, far: { x: -0.2 * L, y: L - 1.6 } }, arms: { near: { shoulder: -80, elbow: 10 }, far: { shoulder: -75, elbow: 10 } }, face: fierce, support: 'both' });
    const take = P(c, { torso: 6, rise: R(c, 5), legs: { near: { x: 0.05 * L, y: L - 0.1, toe: 55 }, far: { x: -0.05 * L, y: L - 0.1, toe: 55 } },
      arms: { near: { shoulder: 160, elbow: 10 }, far: { shoulder: 158, elbow: 10 } }, face: yell });
    // la vuelta: bolita, las rodillas al pecho y los brazos abrazándolas
    const tuck = (torso: number, rise: number): Pose => centered(c, P(c, {
      torso, rise, legs: { near: { x: 0.3 * L, y: 0.3 * L, toe: 30 }, far: { x: 0.22 * L, y: 0.38 * L, toe: 30 } },
      arms: { near: { shoulder: 55, elbow: 120 }, far: { shoulder: 65, elbow: 120 } }, face: fierce, fit: true,
    }));
    // armado arriba: arqueado, el brazo de golpe atrás con el codo alto y el otro apuntando a la pelota
    const cock = P(c, { torso: -18, rise: R(c, 25), legs: { near: { x: -0.2 * L, y: 0.7 * L, toe: 50 }, far: { x: -0.35 * L, y: 0.62 * L, toe: 50 } },
      arms: { near: { shoulder: -130, elbow: 100 }, far: { shoulder: 150, elbow: 10 } }, face: yell });
    // la mata: el brazo latiguea de arriba hacia abajo, todo el cuerpo se cierra sobre la pelota
    const hit = P(c, { torso: 28, rise: R(c, 23), legs: { near: { x: 0.25 * L, y: 0.65 * L, toe: 40 }, far: { x: -0.05 * L, y: 0.72 * L, toe: 40 } },
      arms: { near: { shoulder: 110, elbow: 0 }, far: { shoulder: 20, elbow: 40 } }, face: grin, props: [spark('handNear', 60)] });
    const follow = P(c, { torso: 30, rise: R(c, 12), legs: { near: { x: 0.2 * L, y: 0.8 * L, toe: 30 }, far: { x: 0, y: 0.8 * L, toe: 30 } },
      arms: { near: { shoulder: 15, elbow: 20 }, far: { shoulder: 10, elbow: 30 } }, face: fierce });
    const land = P(c, { torso: 24, legs: feet(c, 0.9, 0.24), arms: { near: { shoulder: 30, elbow: 30 }, far: { shoulder: 20, elbow: 30 } }, face: fierce, support: 'both' });
    const rec = P(c, { torso: 10, legs: feet(c, 0.45, 0.22), arms: { near: { shoulder: 60, elbow: 110, spread: 20 }, far: { shoulder: 20, elbow: 40 } }, face: { eyes: 'happy', mouth: 'grin' }, support: 'both' });
    const seq = [runStep(c, 0), runStep(c, 1), plant, take, tuck(80, R(c, 14)), tuck(170, R(c, 20)), tuck(265, R(c, 24)), cock, hit, follow, land, rec, rec];
    // la pelota arriba y adelante; baja hasta el punto del golpe y se va con él
    const bx = [0, 0, 0, 2.2, 2.1, 2.0, 1.2, 1.6, 1.7], by = [0, 0, 0, 40, 38, 36, 34, 31, 26];
    return seq.map((p, i) => (i >= 3 && i <= 8 ? { ...p, props: [...(p.props ?? []), vball(c, bx[i], by[i])] } : p));
  },
};

// ---------------------------------------------------------------- Chapita

/** El palo de escoba a dos manos (arma del piso): como en `bat_swing`. */
const palo = (side: number, extra: Partial<PropState> = {}): PropState => ({ kind: 'held', at: 'hands', angles: { side, se: side + 8, ne: side - 8 }, ...extra });
const twoHands = (sh: number, el: number, d = 6) => ({ near: { shoulder: sh, elbow: el }, far: { shoulder: sh - d, elbow: el + 10 } });

/**
 * El batazo Nekketsu (`bat_nekketsu`): levanta la pierna de adelante con el palo bien atrás, da el paso, barre el palo
 * con todo (impacto, con la estela) y la fuerza lo hace dar la vuelta completa: los cuadros 6 y 7 vienen `girado`
 * (de espaldas a la chapa, el juego los espeja) y vuelve de frente con el palo arriba. Termina mirando hacia el mismo
 * lado que empezó.
 */
export const batNekketsu: AnimDef = {
  name: 'bat_nekketsu', pack: 'baseball', fps: 14, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 4 / 10 }],
  build: (c) => {
    const L = c.L;
    const stance = P(c, { torso: 8, legs: { near: { x: 0.32 * L, y: L - 1.4 }, far: { x: -0.34 * L, y: L - 1.6, toe: 10 } },
      arms: twoHands(28, 125), face: fierce, support: 'both', props: [palo(-148, { behind: true })] });
    // la pierna de adelante arriba, el palo bien atrás: se carga como un resorte
    const kick = P(c, { torso: -2, x: -c.u, legs: { near: { x: 0.15 * L, y: 0.5 * L, toe: 20 }, far: { x: -0.3 * L, y: L - 1.6 } },
      arms: twoHands(10, 125), face: { eyes: 'angry', mouth: 'line' }, support: 'far', props: [palo(-178, { behind: true })] });
    const stride = P(c, { torso: 6, legs: { near: { x: 0.5 * L, y: L - 1.6 }, far: { x: -0.38 * L, y: L - 1.5, toe: 10 } }, arms: twoHands(50, 85), face: yell, support: 'both', props: [palo(-130, { behind: true })] });
    const whip = P(c, { torso: 12, legs: { near: { x: 0.5 * L, y: L - 1.5 }, far: { x: -0.32 * L, y: L - 1.0, toe: 30 } }, arms: twoHands(75, 30, 4), face: yell, support: 'near', props: [palo(-50)] });
    const hit = P(c, { torso: 16, legs: { near: { x: 0.5 * L, y: L - 1.4 }, far: { x: -0.28 * L, y: L - 0.8, toe: 50 } }, arms: twoHands(90, 5, 4), face: grin, support: 'near',
      props: [palo(0, { smear: { side: [-140, 0], se: [-130, 8], ne: [-150, -8] } }), spark('handNear', 0)] });
    const wrap = P(c, { torso: 10, legs: { near: { x: 0.42 * L, y: L - 1.2 }, far: { x: -0.15 * L, y: L - 0.5, toe: 60 } }, arms: twoHands(120, 60), face: grin, support: 'near',
      props: [palo(-150, { smear: { side: [10, 200], se: [18, 208], ne: [2, 192] }, behind: true })] });
    // la vuelta: de espaldas a la chapa (girado), el palo sigue barriendo
    const spin1: Pose = { ...P(c, { torso: 8, legs: { near: { x: 0.1 * L, y: L - 1.0, toe: 30 }, far: { x: -0.3 * L, y: L - 1.2 } }, arms: twoHands(60, 20), face: grin, support: 'far',
      props: [palo(-20, { smear: { side: [-160, -20], se: [-150, -12], ne: [-170, -28] } })] }), girado: true };
    const spin2: Pose = { ...P(c, { torso: 6, legs: { near: { x: 0.3 * L, y: L - 1.3 }, far: { x: -0.25 * L, y: L - 1.1, toe: 20 } }, arms: twoHands(130, 40), face: grin, support: 'both',
      props: [palo(-160, { behind: true })] }), girado: true };
    // de vuelta de frente: el palo arriba, triunfal
    const pose = P(c, { torso: -4, legs: feet(c, 0.3, 0.3), arms: { near: { shoulder: 170, elbow: 5 }, far: { shoulder: 40, elbow: 90 } }, face: { eyes: 'happy', mouth: 'grin' }, support: 'both',
      props: [{ kind: 'held', at: 'handNear', angles: { side: -80, se: -72, ne: -88 } }] });
    return [stance, kick, stride, whip, hit, wrap, spin1, spin2, pose, { ...pose, face: grin }];
  },
};

// ---------------------------------------------------------------- jabalina

/**
 * La lanza del Catatumbo (`javelin_rayo`): corre con la jabalina en alto, apuntando al cielo con el brazo estirado; se
 * planta y la sostiene arriba dos cuadros mientras carga el rayo (ahí el juego pone el relámpago); la baja, cruza los
 * pasos, bloquea y la suelta con todo (suelta, con su `punto`). La jabalina va dibujada hasta la suelta, como en
 * `javelin`. Con `desplazamiento`. De lado: de frente y de espalda sale en la diagonal.
 */
export const javelinRayo: AnimDef = {
  name: 'javelin_rayo', pack: 'athletics', lateral: true, fps: 14, loop: false, views: ['side', 'front', 'back'],
  travel: { ref: 'sprint', k: [0.6, 0.6, 0.15, 0, 0.4, 0.6, 0.5, 0.25, 0.15, 0.1, 0.1, 0] },
  events: [{ type: 'paso', phase: 0, foot: 'near' }, { type: 'suelta', phase: 8 / 12 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const jav = (side: number, front = true): PropState => ({ kind: 'javelin', at: 'handNear', angles: { side, se: side + 6, ne: side - 6, front: 90 + side * 0.4, back: -90 - side * 0.4 }, ...(front ? { front: true } : {}) });
    const up = { near: { shoulder: 172, elbow: 0 }, far: { shoulder: 40, elbow: 70 } };
    const run1 = { ...runStep(c, 0, 12), arms: up, props: [jav(-84)] };
    const run2 = { ...runStep(c, 1, 12), arms: { ...up, far: { shoulder: -20, elbow: 70 } }, props: [jav(-84)] };
    // plantado: las piernas firmes, la jabalina apuntando al cielo, gritando
    const charge = P(c, { torso: -8, legs: feet(c, 0.35, 0.32), arms: { near: { shoulder: 176, elbow: 0 }, far: { shoulder: 120, elbow: 40, spread: 30 } }, head: { dx: 0, dy: 0, tilt: -14 }, face: yell, support: 'both', props: [jav(-88)] });
    const charge2 = P(c, { ...charge, torso: -10, legs: feet(c, 0.45, 0.32), face: { eyes: 'closed', mouth: 'open' }, props: [jav(-90)] });
    const withdraw = P(c, { torso: -6, legs: { near: { x: 0.35 * L, y: L - 0.5 }, far: { x: -0.4 * L, y: L - 0.6, toe: 20 } },
      arms: { near: { shoulder: -95, elbow: 5 }, far: { shoulder: 80, elbow: 30 } }, face: fierce, support: 'near', props: [jav(-22)] });
    const cross = P(c, { torso: -16, legs: { near: { x: -0.3 * L, y: L - 0.7 }, far: { x: 0.35 * L, y: 0.55 * L, toe: 10 } },
      arms: { near: { shoulder: -100, elbow: 0 }, far: { shoulder: 85, elbow: 20 } }, face: fierce, support: 'near', props: [jav(-26)] });
    const impulse = P(c, { torso: -24, air: Math.max(1, Math.round(u)), legs: { near: { x: -0.5 * L, y: 0.75 * L, toe: 30 }, far: { x: 0.55 * L, y: 0.6 * L, toe: 0 } },
      arms: { near: { shoulder: -102, elbow: 0 }, far: { shoulder: 90, elbow: 15 } }, face: fierce, props: [jav(-28)] });
    const block = P(c, { torso: -22, legs: { near: { x: -0.45 * L, y: L - 1.2, toe: 20 }, far: { x: 0.55 * L, y: L - 0.1, toe: 0 } },
      arms: { near: { shoulder: -108, elbow: 5 }, far: { shoulder: 70, elbow: 20 } }, face: grin, support: 'far', props: [jav(-30)] });
    const whip = P(c, { torso: 16, legs: { near: { x: -0.3 * L, y: L - 0.6, toe: 50 }, far: { x: 0.45 * L, y: L - 0.1 } },
      arms: { near: { shoulder: 152, elbow: 25 }, far: { shoulder: -30, elbow: 40 } }, face: yell, support: 'far', props: [jav(-38)] });
    const follow = P(c, { torso: 36, legs: { near: { x: -0.2 * L, y: L - 1, toe: 40 }, far: { x: 0.4 * L, y: L - 1.2 } },
      arms: { near: { shoulder: 50, elbow: 10 }, far: { shoulder: -40, elbow: 40 } }, face: yell, support: 'far' });
    const watch = P(c, { torso: 2, head: { dx: 0, dy: 0, tilt: -12 }, legs: feet(c, 0.25, 0.24), arms: { near: { shoulder: 150, elbow: 30 }, far: { shoulder: 10, elbow: 20 } }, face: grin, support: 'both' });
    return [run1, run2, charge, charge2, withdraw, cross, impulse, block, whip, follow, watch, watch];
  },
};

// ---------------------------------------------------------------- Quemado

/** El balón de goma del Quemado: del tamaño del de vóley, en la mano. Sale en `objetos` con la clase `voley`. */
const goma = (x: number, y: number, at: PropState['at'] = 'handNear'): PropState => ({ kind: 'volleyball', at, x, y });

/**
 * Tiro del Quemado (`dodge_throw`): agarra el balón con las dos manos, levanta la rodilla de adelante con el balón
 * atrás por encima del hombro (el impulso), da el paso largo y lo suelta con todo por arriba (suelta, con su `punto`).
 * Sigue de largo con la pierna de atrás arriba.
 */
export const dodgeThrow: AnimDef = {
  name: 'dodge_throw', pack: 'baseball', fps: 14, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'suelta', phase: 3 / 6, joint: 'handNear' }],
  build: (c) => {
    const L = c.L, u = c.u;
    const hold = P(c, { torso: 8, legs: feet(c, 0.4, 0.24), arms: { near: { shoulder: 50, elbow: 70 }, far: { shoulder: 55, elbow: 70 } }, face: fierce, support: 'both' });
    // la rodilla arriba, el balón atrás y arriba, el otro brazo apuntando
    const knee = P(c, { torso: -10, x: -u, legs: { near: { x: 0.35 * L, y: 0.22 * L, toe: 20 }, far: { x: -0.2 * L, y: L - 0.4 } },
      arms: { near: { shoulder: -140, elbow: 70 }, far: { shoulder: 90, elbow: 10 } }, face: fierce, support: 'far' });
    const stride = P(c, { torso: -4, legs: { near: { x: 0.55 * L, y: L - 1.4 }, far: { x: -0.4 * L, y: L - 0.9, toe: 20 } },
      arms: { near: { shoulder: -150, elbow: 90 }, far: { shoulder: 60, elbow: 20 } }, face: yell, support: 'both' });
    const release = P(c, { torso: 18, legs: { near: { x: 0.5 * L, y: L - 1.5 }, far: { x: -0.4 * L, y: L - 0.5, toe: 50 } },
      arms: { near: { shoulder: 120, elbow: 0 }, far: { shoulder: -20, elbow: 30 } }, face: grin, support: 'near' });
    // sigue de largo: el cuerpo sobre la pierna de adelante y la de atrás arriba
    const follow = P(c, { torso: 34, legs: { near: { x: 0.35 * L, y: L - 1.6 }, far: { x: -0.7 * L, y: 0.55 * L, toe: 30 } },
      arms: { near: { shoulder: 30, elbow: 20 }, far: { shoulder: -40, elbow: 30 } }, face: grin, support: 'near' });
    const rec = P(c, { torso: 12, legs: feet(c, 0.4, 0.24), arms: { near: { shoulder: 40, elbow: 90 }, far: { shoulder: 30, elbow: 90 } }, face: fierce, support: 'both' });
    // atrás de la cabeza mientras se arma: asoma por detrás del pelo y no tapa la cara
    const ball = [goma(2 * u, -2 * u, 'hands'), { ...goma(-9 * u, -6 * u), behind: true }, { ...goma(-9 * u, -5 * u), behind: true }, goma(2 * u, 0)];
    return [hold, knee, stride, release, follow, rec].map((p, i) => (ball[i] ? { ...p, props: [ball[i]] } : p));
  },
};

/**
 * El que recibe el balonazo del Quemado (`dodge_hit`): el golpe le echa la cabeza atrás, sale disparado de espaldas
 * por el aire, cae sentado (aterriza) y queda viendo pajaritos. El juego lo mueve hacia atrás mientras vuela.
 */
export const dodgeHit: AnimDef = {
  name: 'dodge_hit', pack: 'baseball', fps: 12, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'aterriza', phase: 3 / 6 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const hurtF = { eyes: 'hurt' as const, mouth: 'o' as const };
    const snap = P(c, { torso: -24, x: -u, head: { dx: 0, dy: 0, tilt: -24 }, legs: { near: { x: -0.25 * L, y: L - 0.5 }, far: { x: 0.25 * L, y: L - 0.6 } },
      arms: { near: { shoulder: 40, elbow: 20, spread: 40 }, far: { shoulder: 60, elbow: 20, spread: 40 } }, face: hurtF, support: 'both' });
    const fly = P(c, { torso: -50, x: -2 * u, rise: R(c, 7), legs: { near: { x: 0.45 * L, y: 0.45 * L, toe: 20 }, far: { x: 0.3 * L, y: 0.6 * L, toe: 20 } },
      arms: { near: { shoulder: 130, elbow: 30, spread: 40 }, far: { shoulder: 150, elbow: 30, spread: 40 } }, face: { eyes: 'wide', mouth: 'o' }, fit: true });
    const fly2 = P(c, { ...fly, torso: -42, rise: R(c, 4), x: -3 * u });
    // sentado de golpe, las piernas adelante
    const sit = P(c, { torso: -20, x: -3 * u, hipH: Math.round(c.d.u * 3), legs: { near: { x: 0.75 * L, y: 0.15 * L, toe: -20 }, far: { x: 0.65 * L, y: 0.2 * L, toe: -20 } },
      arms: { near: { shoulder: -30, elbow: 10 }, far: { shoulder: -20, elbow: 10 } }, face: hurtF });
    const daze = P(c, { ...sit, torso: -10, head: { dx: 0, dy: 0, tilt: 10 }, face: { eyes: 'hurt', mouth: 'line' } });
    return [snap, fly, fly2, sit, daze, { ...daze, head: { dx: 0, dy: 0, tilt: -6 } }];
  },
};

// ---------------------------------------------------------------- Chapita: el lanzador

/**
 * Lanzamiento de la Chapita (`cap_pitch`): de lado, la chapa entre los dedos; lleva el brazo atrás a la altura de la
 * cintura, da el paso y la suelta de lado con el brazo bajo y un golpe de muñeca (suelta, con su `punto`), y el brazo
 * cruza por delante. La chapa va como la pelota de béisbol: `sin_props` la quita y sale en `objetos` (clase `beisbol`).
 */
export const capPitch: AnimDef = {
  name: 'cap_pitch', pack: 'baseball', fps: 14, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'suelta', phase: 3 / 6, joint: 'handNear' }],
  build: (c) => {
    const L = c.L, u = c.u;
    const set = P(c, { torso: 10, legs: feet(c, 0.35, 0.24), arms: { near: { shoulder: 40, elbow: 100 }, far: { shoulder: 30, elbow: 70 } }, face: fierce, support: 'both' });
    // atrás y abajo, el tronco girado atrás
    const back = P(c, { torso: 20, x: -u, legs: { near: { x: 0.2 * L, y: L - 1.2 }, far: { x: -0.3 * L, y: L - 1.4 } },
      arms: { near: { shoulder: -70, elbow: 20, spread: 30 }, far: { shoulder: 60, elbow: 30 } }, face: fierce, support: 'far' });
    const step = P(c, { torso: 24, legs: { near: { x: 0.5 * L, y: L - 1.7 }, far: { x: -0.35 * L, y: L - 1.2 } },
      arms: { near: { shoulder: -20, elbow: 30, spread: 40 }, far: { shoulder: 30, elbow: 40 } }, face: fierce, support: 'both' });
    // de lado y abajo: el brazo barre a la altura de la cintura y la muñeca suelta la chapa adelante
    const flick = P(c, { torso: 26, legs: { near: { x: 0.5 * L, y: L - 1.7 }, far: { x: -0.4 * L, y: L - 0.8, toe: 30 } },
      arms: { near: { shoulder: 75, elbow: 15, spread: 20 }, far: { shoulder: -10, elbow: 40 } }, face: { eyes: 'angry', mouth: 'open' }, support: 'near' });
    const across = P(c, { torso: 28, legs: { near: { x: 0.45 * L, y: L - 1.5 }, far: { x: -0.3 * L, y: L - 0.5, toe: 50 } },
      arms: { near: { shoulder: 110, elbow: 60 }, far: { shoulder: -20, elbow: 40 } }, face: grin, support: 'near' });
    const rec = P(c, { torso: 12, legs: feet(c, 0.4, 0.24), arms: { near: { shoulder: 30, elbow: 60 }, far: { shoulder: 20, elbow: 60 } }, face: fierce, support: 'both' });
    const cap = (x: number, y: number): PropState => ({ kind: 'baseball', at: 'handNear', x, y });
    const caps = [cap(0, 0), cap(0, 0), cap(0, 0), cap(2 * u, 0)];
    return [set, back, step, flick, across, rec].map((p, i) => (caps[i] ? { ...p, props: [caps[i]] } : p));
  },
};

// ---------------------------------------------------------------- đá cầu

const cau = (c: Ctx, x: number, y: number): PropState => ({ kind: 'soccer', at: 'ground', x: x * c.L, y: y * c.u });

/**
 * Dominar el cầu (`shuttle_juggle`): en el sitio, lo patea hacia arriba con el borde interno del pie, un pie y después
 * el otro. Dos toques por vuelta (impacto en el 0 con el pie cercano y en el 4 con el lejano). Sirve para el saque y
 * para mantenerlo en el aire. El cầu sale en `objetos` como la pelota de fútbol.
 */
export const shuttleJuggle: AnimDef = {
  name: 'shuttle_juggle', pack: 'football', fps: 12, loop: true, views: ['side', 'front', 'back'],
  events: [{ type: 'impacto', phase: 0, joint: 'footNear' }, { type: 'impacto', phase: 4 / 8, joint: 'footFar' }],
  build: (c) => {
    const L = c.L;
    const arms = { near: { shoulder: 30, elbow: 40, spread: 35 }, far: { shoulder: 25, elbow: 40, spread: 35 } };
    // el pie que patea sube doblado hacia adentro: la planta mirando arriba, a la altura de la rodilla del otro
    const touch = (nearKicks: boolean): Pose => {
      // la pierna de apoyo a la misma altura que en la espera: la cabeza no sube ni baja entre toques
      const kick = { x: 0.38 * L, y: 0.42 * L, toe: -40 }, stand = { x: -0.05 * L, y: hipY(c, 0.3) };
      return P(c, { torso: 10, legs: nearKicks ? { near: kick, far: stand } : { near: stand, far: kick }, arms, face: { eyes: 'open', mouth: 'line' }, support: nearKicks ? 'far' : 'near' });
    };
    const wait = P(c, { torso: 10, legs: feet(c, 0.3, 0.2), arms, face: { eyes: 'open', mouth: 'line' }, support: 'both' });
    const seq = [touch(true), wait, wait, wait, touch(false), wait, wait, wait];
    // el cầu sube y baja delante: toca el pie en el 0 y en el 4
    // (sube un poco hacia adelante: a la altura de la cara va bien adelante y no la tapa)
    // (x en pixeles de 48 y no en largos de pierna: la cara de los chicos es igual de grande)
    const h = [7, 20, 32, 20, 7, 20, 32, 20], x = [8, 17, 20, 17, 7, 17, 20, 17];
    return seq.map((p, i) => ({ ...p, props: [{ kind: 'soccer', at: 'ground', x: x[i] * c.u, y: h[i] * c.u } as PropState] }));
  },
};

/**
 * Chilena del đá cầu (`shuttle_kick_back`): se echa atrás, despega, la pierna de patear pasa por encima de la cabeza
 * en tijera y le pega al cầu arriba con el empeine (impacto), y cae de espalda amortiguando con las manos.
 */
export const shuttleKickBack: AnimDef = {
  name: 'shuttle_kick_back', pack: 'football', fps: 14, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'despegue', phase: 2 / 8 }, { type: 'impacto', phase: 4 / 8, joint: 'footNear' }, { type: 'aterriza', phase: 6 / 8 }],
  build: (c) => {
    const L = c.L;
    const ready = P(c, { torso: 6, legs: feet(c, 0.4, 0.22), arms: { near: { shoulder: 30, elbow: 40, spread: 35 }, far: { shoulder: 25, elbow: 40, spread: 35 } }, head: { dx: 0, dy: 0, tilt: -10 }, face: fierce, support: 'both' });
    const lean = P(c, { torso: -20, legs: { near: { x: 0.3 * L, y: 0.6 * L, toe: 20 }, far: { x: -0.05 * L, y: L - 0.8 } }, arms: { near: { shoulder: 60, elbow: 20, spread: 40 }, far: { shoulder: 70, elbow: 20, spread: 40 } }, face: fierce, support: 'far' });
    const pose = (torso: number, rise: number, nearLeg: [number, number], farLeg: [number, number], face = fierce as Pose['face']): Pose => centered(c, P(c, {
      torso, rise, legs: { near: { x: nearLeg[0] * L, y: nearLeg[1] * L, toe: 0 }, far: { x: farLeg[0] * L, y: farLeg[1] * L, toe: 20 } },
      arms: { near: { shoulder: 70, elbow: 10, spread: 60 }, far: { shoulder: 80, elbow: 10, spread: 60 } }, face, fit: true,
    }));
    const take = pose(-50, R(c, 6), [0.3, 0.3], [0.1, 0.7]);
    const up = pose(-100, R(c, 11), [0.6, -0.6], [0.4, 0.15]);
    const kick = { ...pose(-125, R(c, 12), [-0.25, -0.9], [0.7, -0.25], yell), props: [spark('footNear', -90)] };
    const fall = pose(-95, R(c, 5), [0.5, -0.4], [0.7, -0.1]);
    const land = P(c, { torso: -70, legs: { near: { x: 0.7 * L, y: 0.15 * L, toe: 10 }, far: { x: 0.6 * L, y: 0.35 * L, toe: 10 } },
      arms: { near: { shoulder: -10, elbow: 10 }, far: { shoulder: 0, elbow: 10 } }, face: fierce, fit: true });
    const sitUp = P(c, { torso: -20, hipH: Math.round(c.d.u * 3), legs: { near: { x: 0.7 * L, y: 0.2 * L, toe: -20 }, far: { x: 0.55 * L, y: 0.3 * L, toe: -20 } },
      arms: { near: { shoulder: -20, elbow: 20 }, far: { shoulder: -10, elbow: 20 } }, face: { eyes: 'happy', mouth: 'grin' } });
    const seq = [ready, lean, take, up, kick, fall, land, sitUp];
    // el cầu cae de arriba por encima de la cabeza; le pega en el 4
    const bx = [0.6, 0.55, 0.5, 0.45, 0.5], by = [44, 43, 40, 35, 31];
    return seq.map((p, i) => (i <= 4 ? { ...p, props: [...(p.props ?? []), cau(c, bx[i], by[i])] } : p));
  },
};

/**
 * La chilena Nekketsu del đá cầu (`shuttle_kick_back_nekketsu`): igual pero desde mucho más alto y con una vuelta
 * entera hacia atrás antes del golpe. Le pega arriba de todo (impacto, con la chispa) y aterriza de pie. Con
 * `elevacion`: el juego pone el fuego.
 */
export const shuttleKickBackNekketsu: AnimDef = {
  name: 'shuttle_kick_back_nekketsu', pack: 'football', fps: 14, loop: false, views: ['side', 'front', 'back'],
  events: [{ type: 'despegue', phase: 2 / 10 }, { type: 'impacto', phase: 5 / 10, joint: 'footNear' }, { type: 'aterriza', phase: 8 / 10 }],
  build: (c) => {
    const L = c.L;
    const ready = P(c, { torso: 6, legs: feet(c, 0.4, 0.22), arms: { near: { shoulder: 30, elbow: 40, spread: 35 }, far: { shoulder: 25, elbow: 40, spread: 35 } }, head: { dx: 0, dy: 0, tilt: -10 }, face: fierce, support: 'both' });
    const crouch = P(c, { torso: 14, legs: feet(c, 0.95, 0.24), arms: { near: { shoulder: -50, elbow: 20 }, far: { shoulder: -40, elbow: 20 } }, face: yell, support: 'both' });
    const take = P(c, { torso: -10, rise: R(c, 6), legs: { near: { x: 0.05 * L, y: L - 0.1, toe: 55 }, far: { x: -0.05 * L, y: L - 0.1, toe: 55 } },
      arms: { near: { shoulder: 165, elbow: 10 }, far: { shoulder: 160, elbow: 10 } }, face: yell });
    const tuck = (torso: number, rise: number): Pose => centered(c, P(c, {
      torso, rise, legs: { near: { x: 0.3 * L, y: 0.3 * L, toe: 30 }, far: { x: 0.22 * L, y: 0.38 * L, toe: 30 } },
      arms: { near: { shoulder: 55, elbow: 120 }, far: { shoulder: 65, elbow: 120 } }, face: fierce, fit: true,
    }));
    // de cabeza arriba de todo: la pierna de patear por encima, la otra abajo como tijera
    const kick = { ...centered(c, P(c, { torso: -150, rise: R(c, 24), legs: { near: { x: -0.2 * L, y: -0.95 * L, toe: 0 }, far: { x: 0.7 * L, y: -0.2 * L, toe: 20 } },
      arms: { near: { shoulder: 60, elbow: 10, spread: 60 }, far: { shoulder: 70, elbow: 10, spread: 60 } }, face: grin, fit: true })), props: [spark('footNear', -90)] };
    const unroll = tuck(-250, R(c, 18));
    const drop = P(c, { torso: 6, rise: R(c, 8), legs: { near: { x: 0.15 * L, y: L - 1.0, toe: 30 }, far: { x: -0.1 * L, y: L - 0.8, toe: 30 } },
      arms: { near: { shoulder: 110, elbow: 20, spread: 30 }, far: { shoulder: 100, elbow: 20, spread: 30 } }, face: fierce });
    const land = P(c, { torso: 20, legs: feet(c, 0.9, 0.26), arms: { near: { shoulder: 60, elbow: 30, spread: 40 }, far: { shoulder: 50, elbow: 30, spread: 40 } }, face: fierce, support: 'both' });
    const pose = P(c, { torso: -4, legs: feet(c, 0.3, 0.3), arms: { near: { shoulder: 160, elbow: 20 }, far: { shoulder: 40, elbow: 100 } }, face: { eyes: 'happy', mouth: 'grin' }, support: 'both' });
    const seq = [ready, crouch, take, tuck(-60, R(c, 15)), tuck(-110, R(c, 21)), kick, unroll, drop, land, pose];
    const bx = [0.5, 0.45, 0.4, 0.35, 0.3, 0.25], by = [44, 44, 43, 42, 40, 38];
    return seq.map((p, i) => (i <= 5 ? { ...p, props: [...(p.props ?? []), cau(c, bx[i], by[i])] } : p));
  },
};

// ---------------------------------------------------------------- vovinam

/**
 * La patada tijera del vovinam (`vovinam_scissor`, đòn chân): corre, salta de lado, abre las piernas en el aire a la
 * altura del cuello del rival (la de adelante por delante de él, la de atrás por detrás), las cierra como una tijera
 * (impacto), gira el cuerpo y los dos caen (aterriza). Se incorpora y queda de rodilla junto al rival. El rival es `vovinam_scissored`, con los
 * mismos cuadros: el juego lo pone de pie delante, a media celda, y ahí lo atrapan las piernas. Con `elevacion` y
 * `desplazamiento`. De lado: de frente y de espalda sale en la diagonal.
 */
export const vovinamScissor: AnimDef = {
  name: 'vovinam_scissor', pack: 'martial', fps: 14, loop: false, lateral: true, views: ['side', 'front', 'back'],
  travel: { ref: 'run', k: [1.4, 1.4, 1.2, 1, 0.6, 0.2, 0, 0, 0, 0] },
  events: [{ type: 'despegue', phase: 2 / 10 }, { type: 'impacto', phase: 4 / 10, joint: 'footNear' }, { type: 'aterriza', phase: 6 / 10 }],
  build: (c) => {
    const L = c.L;
    const air = (torso: number, rise: number, near: [number, number, number], far: [number, number, number], face = yell as Pose['face']): Pose => centered(c, P(c, {
      torso, rise, legs: { near: { x: near[0] * L, y: near[1] * L, toe: near[2] }, far: { x: far[0] * L, y: far[1] * L, toe: far[2] } },
      arms: { near: { shoulder: 120, elbow: 30, spread: 30 }, far: { shoulder: 140, elbow: 30, spread: 30 } }, face, fit: true, freeArms: true,
    }));
    const take = P(c, { torso: -6, rise: R(c, 5), legs: { near: { x: 0.4 * L, y: 0.4 * L, toe: 20 }, far: { x: -0.1 * L, y: L - 0.2, toe: 50 } },
      arms: { near: { shoulder: 120, elbow: 40 }, far: { shoulder: 140, elbow: 40 } }, face: yell });
    // tijera abierta: el cuerpo casi acostado, una pierna arriba y la otra abajo, a la altura del cuello del rival
    const open = air(-65, R(c, 13), [0.75, -0.95, 0], [1.05, 0.55, 0]);
    // la cierra: las dos piernas juntas sobre el cuello, el cuerpo gira
    const shut = { ...air(-80, R(c, 12), [1.05, -0.2, 0], [1.05, 0.2, 0], grin), props: [spark('footNear', 0)] };
    const twist = air(-110, R(c, 6), [0.9, -0.2, 10], [0.85, 0.05, 10], fierce);
    // en el piso de lado, las piernas todavía cerradas
    const floor = P(c, { torso: -88, legs: { near: { x: 0.85 * L, y: 0.05 * L, toe: 0 }, far: { x: 0.8 * L, y: 0.2 * L, toe: 0 } },
      arms: { near: { shoulder: -20, elbow: 20 }, far: { shoulder: 10, elbow: 20 } }, face: fierce, fit: true });
    const roll = P(c, { torso: -40, hipH: Math.round(c.d.u * 3), legs: { near: { x: 0.5 * L, y: 0.3 * L, toe: 20 }, far: { x: 0.2 * L, y: 0.5 * L, toe: 20 } },
      arms: { near: { shoulder: 20, elbow: 30 }, far: { shoulder: 30, elbow: 30 } }, face: fierce });
    const kneel = P(c, { torso: 20, legs: { near: { x: 0.4 * L, y: L - 1.8 }, far: { x: -0.4 * L, y: L - 0.9, toe: 50 } }, arms: { near: { shoulder: 70, elbow: 100 }, far: { shoulder: 40, elbow: 90 } }, face: fierce, support: 'both' });
    // termina de rodilla junto al rival, con el puño cerrado sobre el pecho: de ahí el juego sigue con la guardia
    const kneel2 = P(c, { ...kneel, torso: 10, arms: { near: { shoulder: 70, elbow: 120 }, far: { shoulder: 30, elbow: 130 } }, face: { eyes: 'angry', mouth: 'grin' } });
    return [runStep(c, 0), runStep(c, 1), take, open, shut, twist, floor, roll, kneel, kneel2];
  },
};

/**
 * El rival de la patada tijera (`vovinam_scissored`), cuadro a cuadro con `vovinam_scissor`: de pie en guardia, lo
 * atrapan por el cuello (cuadro 4), lo tuercen de lado y cae de espalda (aterriza, el mismo cuadro), y queda tirado.
 */
export const vovinamScissored: AnimDef = {
  name: 'vovinam_scissored', pack: 'martial', fps: 14, loop: false, lateral: true, views: ['side', 'front', 'back'],
  events: [{ type: 'aterriza', phase: 6 / 10 }],
  build: (c) => {
    const L = c.L, u = c.u;
    const hurtF = { eyes: 'hurt' as const, mouth: 'o' as const };
    const guard = P(c, { torso: 6, legs: { near: { x: 0.3 * L, y: L - 1.0 }, far: { x: -0.3 * L, y: L - 1.0, toe: 10 } }, arms: { near: { shoulder: 60, elbow: 110 }, far: { shoulder: 70, elbow: 100 } }, face: fierce, support: 'both' });
    const surprise = P(c, { ...guard, torso: -4, face: { eyes: 'wide', mouth: 'o' } });
    // agarrado del cuello: la cabeza se va de lado, los brazos manotean
    const caught = P(c, { torso: -12, head: { dx: 0, dy: 0, tilt: -16 }, legs: { near: { x: 0.2 * L, y: L - 0.6 }, far: { x: -0.2 * L, y: L - 0.5, toe: 20 } },
      arms: { near: { shoulder: 120, elbow: 40, spread: 30 }, far: { shoulder: 140, elbow: 40, spread: 30 } }, face: hurtF, support: 'both' });
    const tip = P(c, { torso: -45, x: -u, legs: { near: { x: 0.45 * L, y: 0.5 * L, toe: 20 }, far: { x: 0.2 * L, y: L - 0.5, toe: 20 } },
      arms: { near: { shoulder: 150, elbow: 30, spread: 40 }, far: { shoulder: 160, elbow: 30, spread: 40 } }, face: hurtF, fit: true });
    const fallen = P(c, { torso: -88, legs: { near: { x: 0.75 * L, y: 0.1 * L, toe: -30 }, far: { x: 0.7 * L, y: 0.2 * L, toe: -30 } },
      arms: { near: { shoulder: 120, elbow: 40 }, far: { shoulder: 140, elbow: 30 } }, face: hurtF, fit: true });
    const ko = { ...fallen, face: { eyes: 'closed' as const, mouth: 'o' as const } };
    return [guard, guard, surprise, surprise, caught, tip, fallen, fallen, ko, ko];
  },
};

/** Las del lote B7H8, en el orden del pedido. */
export const ESPECIALES: AnimDef[] = [
  dunkBig, spikeFuego, shuttleKickBack, shuttleKickBackNekketsu, tackleNekketsu, batNekketsu, javelinRayo,
  dodgeThrow, dodgeHit, capPitch, shuttleJuggle, vovinamScissor, vovinamScissored,
];
