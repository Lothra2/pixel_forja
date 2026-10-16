import type { Pose, V3 } from './esqueleto';

/**
 * Las animaciones del luchador, cuadro por cuadro como en SF2: cada cuadro es una pose dibujada y cuánto dura en
 * ticks de 60 por segundo. Los golpes marcan la fase de cada cuadro (inicio, activo, recuperación) y qué puño pega,
 * así salen solas las cajas que pegan y los datos para el juego.
 */
export type Fase = 'inicio' | 'activo' | 'recuperacion' | 'neutral' | 'golpeado';

export interface CuadroAnim {
  pose: Pose;
  /** cuánto dura, en ticks de 60 por segundo */
  ticks: number;
  fase: Fase;
  /** el lado que pega en los cuadros activos */
  pega?: 'cerca' | 'lejos';
  /** con qué pega: el puño (si no se dice) o el pie */
  con?: 'puño' | 'pie';
  /** la estela del golpe: desde dónde viene el puño en este cuadro (un borrón de velocidad) */
  estela?: boolean;
}

export interface AnimLuchador {
  nombre: string;
  /** en bucle (la guardia) o una vez */
  bucle: boolean;
  cuadros: CuadroAnim[];
  /** daño y aturdimiento de referencia, para el juego (se pueden cambiar allá) */
  golpe?: { daño: number; parada: number; retroceso: number; aturde: number };
}

/** Una pose entre dos, para los cuadros intermedios: mezcla cada número y cada punto (t de 0 a 1). */
export function entre(a: Pose, b: Pose, t: number): Pose {
  const mezcla = (x: unknown, y: unknown): unknown => {
    if (typeof x === 'number' && typeof y === 'number') return x + (y - x) * t;
    if (Array.isArray(x) && Array.isArray(y)) return x.map((v, i) => (v as number) + ((y[i] as number) - (v as number)) * t);
    if (x && y && typeof x === 'object' && typeof y === 'object') {
      const o: Record<string, unknown> = {};
      for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) o[k] = mezcla((x as Record<string, unknown>)[k], (y as Record<string, unknown>)[k]);
      return o;
    }
    return t < 0.5 ? (x ?? y) : (y ?? x);
  };
  return mezcla(a, b) as Pose;
}

type Parcial<T> = { [K in keyof T]?: T[K] extends V3 ? V3 : T[K] extends object ? Parcial<T[K]> : T[K] };

/** Una pose a partir de otra, cambiando solo lo que se dice. */
export function con(base: Pose, cambio: Parcial<Pose>): Pose {
  const mezcla = (a: unknown, b: unknown): unknown => {
    if (b === undefined) return a;
    if (Array.isArray(b) || typeof b !== 'object' || b === null) return b;
    const o: Record<string, unknown> = { ...(a as Record<string, unknown>) };
    for (const [k, v] of Object.entries(b)) o[k] = mezcla((a as Record<string, unknown>)[k], v);
    return o;
  };
  return mezcla(base, cambio) as Pose;
}

/**
 * La guardia de SF2: de lado, el pecho abierto a la cámara, rodillas bien dobladas y la base ancha, el puño de lejos
 * adelante a la altura del mentón y el de cerca guardando el pecho. El mentón abajo.
 */
export const GUARDIA: Pose = {
  cadera: [0, 44, 0], giroCadera: 42, giroPecho: 30, inclina: 7, cabeza: { giro: 16, inclina: 8 },
  cerca: { brazo: { mano: [13, 66, 10], codo: [-1, 48, 17] }, pierna: { tobillo: [-21, 3.6, 7], rodilla: [-2, 29, 24], pie: 48 } },
  lejos: { brazo: { mano: [29, 74, -2], codo: [16, 54, -12] }, pierna: { tobillo: [20, 3.6, -6], rodilla: [33, 29, -7], pie: 8 } },
  cara: 'serio',
  viento: 0,
};

/** La guardia respira: baja la cadera, los hombros y los puños, y vuelve (6 cuadros en bucle, como Ryu). El cintillo y el cinturón se mueven. */
export function animGuardia(): AnimLuchador {
  const paso = (t: number, i: number): Pose => con(GUARDIA, {
    cadera: [0, 44 - 2 * t, 0],
    inclina: 7 + 2 * t,
    cerca: { brazo: { mano: [13, 66 - 2.2 * t, 10], codo: [-1, 48, 17] } },
    lejos: { brazo: { mano: [29 - 0.6 * t, 74 - 2 * t, -2], codo: [16, 54, -12] } },
    viento: (i / 6) * Math.PI * 2,
  });
  const ts = [0, 0.33, 0.7, 1, 0.66, 0.3];
  return { nombre: 'guardia', bucle: true, cuadros: ts.map((t, i) => ({ pose: paso(t, i), ticks: 7, fase: 'neutral' as const })) };
}

/**
 * El puño fuerte de pie: el puño de atrás (el de la cámara) sale recto a la altura de la cara con todo el giro de la
 * cadera y el hombro, el cuerpo se tira adelante, la pierna de atrás se estira con el talón arriba y el otro puño se
 * recoge al mentón. Grita. Inicio 5, activo 4, recuperación 14 (como un puño fuerte de SF2).
 */
export function animPuñoFuerte(): AnimLuchador {
  const carga = con(GUARDIA, {
    cadera: [-3, 43, 0], giroCadera: 50, giroPecho: 54, inclina: 2, cabeza: { giro: 6, inclina: 10 },
    cerca: { brazo: { mano: [2, 68, 14], codo: [-11, 54, 18] } },
    lejos: { brazo: { mano: [25, 76, -5], codo: [13, 56, -12] } },
    viento: 0.4,
  });
  const sale = con(GUARDIA, {
    cadera: [5, 43, 0], giroCadera: 24, giroPecho: 4, inclina: 14, cabeza: { giro: 20, inclina: 4 },
    cerca: { brazo: { mano: [38, 78, 8], codo: [16, 72, 18] }, pierna: { tobillo: [-21, 3.6, 7], rodilla: [0, 29, 24], pie: 40, punta: 12 } },
    lejos: { brazo: { mano: [18, 74, -5], codo: [7, 54, -12] } },
    cara: 'grito', viento: 1.2,
  });
  const pega = con(GUARDIA, {
    cadera: [11, 42, 0], giroCadera: 8, giroPecho: -18, inclina: 21, cabeza: { giro: 28, inclina: 2 },
    cerca: { brazo: { mano: [70, 80, 2], codo: [38, 83, 12] }, pierna: { tobillo: [-19, 3.6, 7], rodilla: [4, 28, 22], pie: 28, punta: 34 } },
    lejos: { brazo: { mano: [15, 74, -7], codo: [3, 56, -14] }, pierna: { tobillo: [20, 3.6, -6], rodilla: [36, 28, -7], pie: 8 } },
    cara: 'grito', viento: 2.2,
  });
  const vuelve1 = con(GUARDIA, {
    cadera: [8, 42.5, 0], giroCadera: 16, giroPecho: -4, inclina: 17, cabeza: { giro: 24, inclina: 4 },
    cerca: { brazo: { mano: [52, 77, 5], codo: [26, 72, 16] }, pierna: { tobillo: [-20, 3.6, 7], rodilla: [2, 28, 23], pie: 34, punta: 22 } },
    lejos: { brazo: { mano: [17, 74, -6], codo: [5, 55, -13] } },
    cara: 'grito', viento: 3.0,
  });
  const vuelve2 = con(GUARDIA, {
    cadera: [3, 43.5, 0], giroCadera: 32, giroPecho: 18, inclina: 10, cabeza: { giro: 18, inclina: 6 },
    cerca: { brazo: { mano: [22, 70, 9], codo: [5, 52, 17] }, pierna: { tobillo: [-21, 3.6, 7], rodilla: [-1, 29, 24], pie: 44, punta: 6 } },
    lejos: { brazo: { mano: [24, 74, -3], codo: [12, 54, -12] } },
    viento: 3.8,
  });
  return {
    nombre: 'puño_fuerte', bucle: false,
    golpe: { daño: 22, parada: 13, retroceso: 10, aturde: 18 },
    cuadros: [
      { pose: carga, ticks: 3, fase: 'inicio' },
      { pose: sale, ticks: 2, fase: 'inicio', estela: true },
      { pose: pega, ticks: 4, fase: 'activo', pega: 'cerca', estela: true },
      { pose: vuelve1, ticks: 6, fase: 'recuperacion' },
      { pose: vuelve2, ticks: 8, fase: 'recuperacion' },
    ],
  };
}

/**
 * Recibir un golpe arriba: la cabeza se va para atrás de golpe, el pecho se abre, el cuerpo se dobla hacia atrás y los
 * brazos se sueltan. El primer cuadro es el del impacto, el segundo se sostiene lo que dure el aturdimiento (lo pone
 * el juego), el tercero vuelve a la guardia.
 */
export function animRecibeAlto(): AnimLuchador {
  const golpe = con(GUARDIA, {
    cadera: [-4, 44, 0], giroCadera: 50, giroPecho: 56, inclina: -16, ladeo: 5, cabeza: { giro: 4, inclina: -30 },
    cerca: { brazo: { mano: [0, 58, 17], codo: [-12, 54, 18] }, pierna: { tobillo: [-21, 3.6, 7], rodilla: [-4, 29, 24], pie: 50 } },
    lejos: { brazo: { mano: [22, 84, -8], codo: [7, 68, -15] }, pierna: { tobillo: [20, 3.6, -6], rodilla: [30, 29, -7], pie: 8 } },
    cara: 'dolor', viento: 1.6,
  });
  const atras = con(golpe, {
    cadera: [-7, 43, 0], inclina: -22, cabeza: { giro: 2, inclina: -36 },
    cerca: { brazo: { mano: [-5, 55, 18], codo: [-15, 52, 18] } },
    lejos: { brazo: { mano: [17, 86, -9], codo: [3, 70, -15] } },
    viento: 2.6,
  });
  const vuelve = con(GUARDIA, {
    cadera: [-3, 43.5, 0], giroPecho: 40, inclina: -2, cabeza: { giro: 10, inclina: -6 },
    cerca: { brazo: { mano: [9, 64, 12], codo: [-3, 48, 17] } },
    lejos: { brazo: { mano: [24, 74, -4], codo: [12, 54, -12] } },
    cara: 'dolor', viento: 3.6,
  });
  return {
    nombre: 'recibe_alto', bucle: false,
    cuadros: [
      { pose: golpe, ticks: 3, fase: 'golpeado' },
      { pose: atras, ticks: 12, fase: 'golpeado' },
      { pose: vuelve, ticks: 6, fase: 'golpeado' },
    ],
  };
}

/**
 * La victoria: se para, abre el pecho a la cámara y levanta el puño de cerca bien alto, con el otro cerrado a la
 * cintura. Grita, y el cintillo y el cinturón vuelan. Los dos últimos cuadros se alternan en bucle.
 */
export function animVictoria(): AnimLuchador {
  const sube = con(GUARDIA, {
    cadera: [0, 47, 0], giroCadera: 50, giroPecho: 58, inclina: -2, cabeza: { giro: 20, inclina: -6 },
    cerca: { brazo: { mano: [-4, 90, 18], codo: [-10, 76, 24] }, pierna: { tobillo: [-15, 3.6, 7], rodilla: [-4, 30, 22], pie: 50 } },
    lejos: { brazo: { mano: [12, 60, -10], codo: [0, 62, -18] }, pierna: { tobillo: [14, 3.6, -6], rodilla: [22, 30, -8], pie: 10 } },
    cara: 'serio', viento: 0.5,
  });
  const arriba = (v: number): Pose => con(sube, {
    cadera: [0, 48, 0], inclina: -6, cabeza: { giro: 22, inclina: -12 },
    cerca: { brazo: { mano: [-8, 114, 12], codo: [-12, 96, 22] } },
    cara: 'grito', viento: v,
  });
  return {
    nombre: 'victoria', bucle: false,
    cuadros: [
      { pose: sube, ticks: 6, fase: 'neutral' },
      { pose: arriba(1.4), ticks: 10, fase: 'neutral' },
      { pose: arriba(2.6), ticks: 10, fase: 'neutral' },
      { pose: arriba(3.8), ticks: 10, fase: 'neutral' },
    ],
  };
}

/** Camina hacia adelante sin soltar la guardia: un pie se desliza y el otro lo alcanza. 6 cuadros en bucle, avanza 18 px por vuelta. */
export function animAvanza(): AnimLuchador {
  const paso = (t: number, i: number): Pose => {
    const a = t * Math.PI * 2;
    const lev = (s: number) => Math.max(0, Math.sin(s)) * 4;
    return con(GUARDIA, {
      cadera: [0, 44 + Math.cos(a * 2) * 0.8, 0],
      cerca: { brazo: { mano: [13, 66 + Math.cos(a * 2) * 0.8, 10], codo: [-1, 48, 17] }, pierna: { tobillo: [-21 + 6 * Math.sin(a), 3.6 + lev(a), 7], rodilla: [-2, 29, 24], pie: 48 } },
      lejos: { brazo: { mano: [29, 74 + Math.cos(a * 2) * 0.8, -2], codo: [16, 54, -12] }, pierna: { tobillo: [20 - 6 * Math.sin(a), 3.6 + lev(a + Math.PI), -6], rodilla: [33, 29, -7], pie: 8 } },
      viento: (i / 6) * Math.PI * 2,
    });
  };
  return { nombre: 'avanza', bucle: true, cuadros: [0, 1, 2, 3, 4, 5].map((i) => ({ pose: paso(i / 6, i), ticks: 6, fase: 'neutral' as const })) };
}

/**
 * La onda de energía (el especial de Rick): junta los puños atrás en la cadera mientras carga, los empuja adelante
 * con todo el cuerpo y suelta la bola, que sale de las manos en el tercer cuadro. Inicio 10, activo 3, recuperación 22.
 */
export function animOnda(): AnimLuchador {
  const carga = con(GUARDIA, {
    cadera: [-4, 42, 0], giroCadera: 62, giroPecho: 74, inclina: 4, cabeza: { giro: -6, inclina: 8 },
    cerca: { brazo: { mano: [-12, 56, 12], codo: [-8, 52, 22] }, pierna: { tobillo: [-23, 3.6, 7], rodilla: [-4, 28, 24], pie: 50 } },
    lejos: { brazo: { mano: [-10, 58, 4], codo: [-2, 60, -10] } },
    viento: 0.5,
  });
  const empuja = (v: number): Pose => con(GUARDIA, {
    cadera: [6, 41, 0], giroCadera: 18, giroPecho: 4, inclina: 16, cabeza: { giro: 22, inclina: 4 },
    cerca: { brazo: { mano: [44, 46, 4], codo: [22, 52, 14] }, pierna: { tobillo: [-22, 3.6, 7], rodilla: [0, 28, 24], pie: 40, punta: 20 } },
    lejos: { brazo: { mano: [44, 50, -2], codo: [22, 58, -12] } },
    cara: 'grito', viento: v,
  });
  return {
    nombre: 'onda', bucle: false,
    golpe: { daño: 16, parada: 8, retroceso: 12, aturde: 16 },
    cuadros: [
      { pose: entre(GUARDIA, carga, 0.5), ticks: 4, fase: 'inicio' },
      { pose: carga, ticks: 6, fase: 'inicio' },
      { pose: empuja(1.4), ticks: 3, fase: 'activo', estela: true },
      { pose: empuja(2.2), ticks: 14, fase: 'recuperacion' },
      { pose: entre(empuja(3), GUARDIA, 0.5), ticks: 8, fase: 'recuperacion' },
    ],
  };
}

/** Se cubre arriba: los antebrazos cruzados delante de la cara, el cuerpo un poco atrás. */
export function animBloqueo(): AnimLuchador {
  const cubre = con(GUARDIA, {
    cadera: [-3, 43, 0], giroPecho: 38, inclina: -4, cabeza: { giro: 10, inclina: 12 },
    cerca: { brazo: { mano: [16, 84, 10], codo: [10, 64, 18] } },
    lejos: { brazo: { mano: [18, 80, -2], codo: [16, 60, -12] } },
  });
  return { nombre: 'bloqueo', bucle: false, cuadros: [{ pose: cubre, ticks: 4, fase: 'neutral' }, { pose: con(cubre, { cadera: [-4, 43, 0] }), ticks: 8, fase: 'neutral' }] };
}

/**
 * Cae: el golpe lo levanta y lo tira de espaldas. Sale volando hacia atrás, queda acostado en el piso, rebota y se
 * queda tendido (el KO). Gira todo el cuerpo con `rueda`.
 */
export function animCae(): AnimLuchador {
  const vuela = (y: number, giro: number, v: number): Pose => ({
    ...con(GUARDIA, {
      cadera: [0, y, 0], giroCadera: 50, giroPecho: 56, inclina: -10, cabeza: { giro: 4, inclina: -30 },
      cerca: { brazo: { mano: [-6, y + 34, 16], codo: [-10, y + 22, 18] }, pierna: { tobillo: [10, y - 34, 7], rodilla: [10, y - 16, 20], pie: 50 } },
      lejos: { brazo: { mano: [14, y + 38, -10], codo: [6, y + 26, -16] }, pierna: { tobillo: [18, y - 30, -6], rodilla: [16, y - 14, -8], pie: 8 } },
      cara: 'dolor', viento: v,
    }),
    rueda: giro,
  });
  const piso = (y: number, v: number): Pose => ({ ...vuela(y, -90, v), cara: 'dolor' });
  return {
    nombre: 'cae', bucle: false,
    cuadros: [
      { pose: vuela(52, -30, 1), ticks: 6, fase: 'golpeado' },
      { pose: vuela(48, -60, 2), ticks: 6, fase: 'golpeado' },
      { pose: vuela(30, -80, 3), ticks: 6, fase: 'golpeado' },
      { pose: piso(22, 3.5), ticks: 4, fase: 'golpeado' },
      { pose: piso(27, 4), ticks: 4, fase: 'golpeado' },
      { pose: piso(22, 4.4), ticks: 30, fase: 'golpeado' },
    ],
  };
}

export const ANIMS_PILOTO = { guardia: animGuardia, puño_fuerte: animPuñoFuerte, recibe_alto: animRecibeAlto, victoria: animVictoria };
export const ANIMS_RICK = { ...ANIMS_PILOTO, avanza: animAvanza, onda: animOnda, bloqueo: animBloqueo, cae: animCae };
