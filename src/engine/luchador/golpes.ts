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
  /** el puño que pega en los cuadros activos */
  pega?: 'cerca' | 'lejos';
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

/** La guardia de SF2: de lado, el pecho abierto a la cámara, rodillas dobladas, la mano de lejos adelante a la altura del mentón. */
export const GUARDIA: Pose = {
  cadera: [0, 46, 0], giroCadera: 40, giroPecho: 32, inclina: 6, cabeza: { giro: 16, inclina: 4 },
  cerca: { brazo: { mano: [12, 64, 8], codo: [0, 45, 14] }, pierna: { tobillo: [-19, 3.6, 6], rodilla: [0, 30, 22], pie: 45 } },
  lejos: { brazo: { mano: [26, 72, -2], codo: [14, 50, -10] }, pierna: { tobillo: [18, 3.6, -5], rodilla: [30, 30, -6], pie: 8 } },
  cara: 'serio',
};

/** La guardia respira: baja la cadera, los hombros y los puños, y vuelve (5 cuadros en ida y vuelta, como Ryu). */
export function animGuardia(): AnimLuchador {
  const paso = (t: number): Pose => con(GUARDIA, {
    cadera: [0, 46 - 2 * t, 0],
    inclina: 6 + 2 * t,
    cerca: { brazo: { mano: [12, 64 - 2.2 * t, 8], codo: [0, 45, 14] } },
    lejos: { brazo: { mano: [26 - 0.6 * t, 72 - 2 * t, -2], codo: [14, 50, -10] } },
  });
  const ts = [0, 0.33, 0.7, 1, 0.66, 0.3];
  return { nombre: 'guardia', bucle: true, cuadros: ts.map((t) => ({ pose: paso(t), ticks: 7, fase: 'neutral' as const })) };
}

/**
 * El puño fuerte de pie: el puño de atrás (el de la cámara) sale recto a la altura de la cara con todo el giro de la
 * cadera y el hombro, el talón de atrás se levanta y el otro puño se recoge al mentón. Grita.
 * Inicio 5, activo 4, recuperación 14 (como un puño fuerte de SF2).
 */
export function animPuñoFuerte(): AnimLuchador {
  const carga = con(GUARDIA, {
    cadera: [-1.5, 45, 0], giroCadera: 46, giroPecho: 44, inclina: 3, cabeza: { giro: 10, inclina: 6 },
    cerca: { brazo: { mano: [5, 66, 11], codo: [-8, 52, 16] } },
    lejos: { brazo: { mano: [22, 74, -4], codo: [12, 52, -10] } },
  });
  const sale = con(GUARDIA, {
    cadera: [4, 45, 0], giroCadera: 26, giroPecho: 8, inclina: 12, cabeza: { giro: 18, inclina: 2 },
    cerca: { brazo: { mano: [34, 76, 7], codo: [14, 70, 16] }, pierna: { tobillo: [-19, 3.6, 6], rodilla: [2, 30, 22], pie: 40, punta: 10 } },
    lejos: { brazo: { mano: [16, 72, -4], codo: [6, 52, -10] } },
    cara: 'grito',
  });
  const pega = con(GUARDIA, {
    cadera: [8, 44, 0], giroCadera: 10, giroPecho: -14, inclina: 17, cabeza: { giro: 26, inclina: 0 },
    cerca: { brazo: { mano: [62, 78, 2], codo: [34, 81, 12] }, pierna: { tobillo: [-17, 3.6, 6], rodilla: [4, 30, 22], pie: 30, punta: 28 } },
    lejos: { brazo: { mano: [12, 72, -6], codo: [2, 54, -12] } },
    cara: 'grito',
  });
  const vuelve1 = con(GUARDIA, {
    cadera: [6, 44.5, 0], giroCadera: 18, giroPecho: 0, inclina: 14, cabeza: { giro: 22, inclina: 2 },
    cerca: { brazo: { mano: [46, 75, 5], codo: [22, 70, 15] }, pierna: { tobillo: [-17.5, 3.6, 6], rodilla: [3, 30, 22], pie: 34, punta: 18 } },
    lejos: { brazo: { mano: [14, 72, -5], codo: [4, 53, -11] } },
    cara: 'grito',
  });
  const vuelve2 = con(GUARDIA, {
    cadera: [1, 45.5, 0], giroCadera: 32, giroPecho: 20, inclina: 8, cabeza: { giro: 18, inclina: 3 },
    cerca: { brazo: { mano: [20, 68, 8], codo: [4, 50, 15] }, pierna: { tobillo: [-19, 3.6, 6], rodilla: [1, 30, 22], pie: 42, punta: 6 } },
    lejos: { brazo: { mano: [22, 72, -3], codo: [11, 51, -10] } },
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
 * Recibir un golpe arriba: la cabeza se va para atrás, el pecho se abre, los brazos se sueltan y la cara es de dolor.
 * El primer cuadro es el del impacto, el segundo se sostiene lo que dure el aturdimiento (lo pone el juego), el
 * tercero vuelve a la guardia.
 */
export function animRecibeAlto(): AnimLuchador {
  const golpe = con(GUARDIA, {
    cadera: [-3, 46, 0], giroCadera: 48, giroPecho: 52, inclina: -12, ladeo: 4, cabeza: { giro: 6, inclina: -24 },
    cerca: { brazo: { mano: [2, 58, 14], codo: [-10, 52, 16] }, pierna: { tobillo: [-19, 3.6, 6], rodilla: [-2, 30, 22], pie: 48 } },
    lejos: { brazo: { mano: [20, 80, -8], codo: [6, 64, -14] }, pierna: { tobillo: [18, 3.6, -5], rodilla: [28, 30, -6], pie: 8 } },
    cara: 'dolor',
  });
  const atras = con(golpe, {
    cadera: [-5, 45, 0], inclina: -17, cabeza: { giro: 4, inclina: -30 },
    cerca: { brazo: { mano: [-2, 56, 15], codo: [-12, 50, 16] } },
    lejos: { brazo: { mano: [16, 82, -9], codo: [3, 66, -14] } },
  });
  const vuelve = con(GUARDIA, {
    cadera: [-2, 45, 0], giroPecho: 40, inclina: -2, cabeza: { giro: 10, inclina: -6 },
    cerca: { brazo: { mano: [8, 62, 10], codo: [-3, 46, 15] } },
    lejos: { brazo: { mano: [22, 72, -4], codo: [11, 52, -11] } },
    cara: 'dolor',
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

export const ANIMS_PILOTO = { guardia: animGuardia, puño_fuerte: animPuñoFuerte, recibe_alto: animRecibeAlto };
