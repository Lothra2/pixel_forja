import type { Medidas } from './estilo';
import { resolver, type PoseEsq, type Lado, type FormaMano, type V3 } from './esqueleto';

/**
 * La pose de un movimiento (Forja 2), sin pixeles: sirve igual en un cabezón de 48 y en un luchador de 160. Es lo que
 * se escribe en los archivos de datos de los movimientos.
 *
 * - La cadera y los pies van en el mundo, desde el pivote, en largos de pierna (P = muslo + canilla). Un pie que no se
 *   mueve entre dos claves queda en el mismo punto: no patina.
 * - Las manos van desde el hombro, en esféricas: `alcance` (0 a 1 del brazo estirado), `alto` (grados sobre la
 *   horizontal, + arriba) y `abre` (grados hacia la cámara). Interpolar en esféricas ya da arcos.
 * - Los giros en grados: `giroCadera` y `giroPecho` vuelven el cuerpo hacia la cámara (0 de perfil, 90 de frente).
 */
export interface ManoMov { alcance?: number; alto?: number; abre?: number; /** hacia dónde dobla el codo (dirección desde el hombro) */ codo?: [number, number, number]; forma?: FormaMano }
export interface PieMov {
  x?: number;
  /** alto del tobillo sobre el piso (largos de pierna) */
  alto?: number;
  z?: number;
  /** la punta baja (+) o sube (-), grados */
  punta?: number;
  /** hacia dónde mira el pie (grados, + hacia la cámara) */
  giro?: number;
  /** hacia dónde dobla la rodilla (dirección desde la cadera) */
  rodilla?: [number, number, number];
}
export type Cara = 'serio' | 'grito' | 'dolor' | 'feliz';

export interface PoseMov {
  cadera?: { x?: number; baja?: number; z?: number };
  giroCadera?: number;
  giroPecho?: number;
  inclina?: number;
  ladeo?: number;
  cabeza?: { giro?: number; inclina?: number };
  manos?: Partial<Record<Lado, ManoMov>>;
  pies?: Partial<Record<Lado, PieMov>>;
  cara?: Cara;
}

/** Una pose completa: todos los campos con valor. */
export type PoseCompleta = {
  cadera: Required<NonNullable<PoseMov['cadera']>>;
  giroCadera: number; giroPecho: number; inclina: number; ladeo: number;
  cabeza: Required<NonNullable<PoseMov['cabeza']>>;
  manos: Record<Lado, Required<ManoMov>>;
  pies: Record<Lado, Required<PieMov>>;
  cara: Cara;
};

/** Parado de perfil, brazos abajo: lo que falta en una pose se toma de acá. */
export const POSE_NEUTRA: PoseCompleta = {
  cadera: { x: 0, baja: 0, z: 0 },
  giroCadera: 20, giroPecho: 20, inclina: 0, ladeo: 0,
  cabeza: { giro: 0, inclina: 0 },
  manos: {
    cerca: { alcance: 0.95, alto: -80, abre: 10, codo: [-0.3, -0.2, 1], forma: 'abierta' },
    lejos: { alcance: 0.95, alto: -80, abre: -10, codo: [-0.3, -0.2, -1], forma: 'abierta' },
  },
  pies: {
    cerca: { x: 0, alto: 0, z: 0.12, punta: 0, giro: 0, rodilla: [1, 0, 0.2] },
    lejos: { x: 0, alto: 0, z: -0.12, punta: 0, giro: 0, rodilla: [1, 0, -0.2] },
  },
  cara: 'serio',
};

/** Pone una pose parcial encima de otra (campo por campo, también adentro de manos y pies). */
export function sobre(baseP: PoseCompleta, p: PoseMov | undefined): PoseCompleta {
  if (!p) return baseP;
  const lado = <T extends object>(b: Record<Lado, T>, q: Partial<Record<Lado, Partial<T>>> | undefined): Record<Lado, T> =>
    ({ cerca: { ...b.cerca, ...(q?.cerca ?? {}) }, lejos: { ...b.lejos, ...(q?.lejos ?? {}) } });
  return {
    cadera: { ...baseP.cadera, ...(p.cadera ?? {}) },
    giroCadera: p.giroCadera ?? baseP.giroCadera, giroPecho: p.giroPecho ?? baseP.giroPecho,
    inclina: p.inclina ?? baseP.inclina, ladeo: p.ladeo ?? baseP.ladeo,
    cabeza: { ...baseP.cabeza, ...(p.cabeza ?? {}) },
    manos: lado(baseP.manos, p.manos),
    pies: lado(baseP.pies, p.pies),
    cara: p.cara ?? baseP.cara,
  };
}

/** Extras que el motor le pone a un cuadro (no se escriben en los datos): impacto, respiración, estiramiento. */
export interface Extras {
  respira?: number;
  /** escala de la mano o del pie que pega en el impacto */
  escala?: Partial<Record<'mano' | 'pie', Partial<Record<Lado, number>>>>;
  /** cuánto más largo el miembro que pega (fracción) */
  estira?: Partial<Record<'mano' | 'pie', Partial<Record<Lado, number>>>>;
  /** cuánto baja la cadera por aplastarse (fracción de H) */
  aplasta?: number;
}

const R = Math.PI / 180;

/** Dirección de una mano en el mundo desde sus esféricas. */
export function dirMano(alto: number, abre: number): V3 {
  return [Math.cos(alto * R) * Math.cos(abre * R), Math.sin(alto * R), Math.cos(alto * R) * Math.sin(abre * R)];
}

/** De la pose normalizada a la del esqueleto, en pixeles, con las medidas del estilo. */
export function aEsqueleto(m: Medidas, p: PoseCompleta, x: Extras = {}): PoseEsq {
  const P = m.pierna;
  const cadera: V3 = [p.cadera.x * P, m.caderaAlta - p.cadera.baja * P - (x.aplasta ?? 0) * m.H, p.cadera.z * P];
  const pies = {} as PoseEsq['pies'];
  for (const l of ['cerca', 'lejos'] as Lado[]) {
    const q = p.pies[l];
    const tob: V3 = [q.x * P, m.tobillo + q.alto * P, q.z * P];
    const rod: V3 = [cadera[0] + q.rodilla[0] * P * 2, cadera[1] + q.rodilla[1] * P * 2, cadera[2] + q.rodilla[2] * P * 2];
    pies[l] = { tobillo: tob, rodilla: rod, punta: q.punta, giro: q.giro, escala: x.escala?.pie?.[l] ?? 1, largo: 1 + (x.estira?.pie?.[l] ?? 0) };
  }
  // los hombros dependen del pecho: se resuelve una vez sin brazos para saber dónde quedan
  const esq0: PoseEsq = {
    cadera, giroCadera: p.giroCadera, giroPecho: p.giroPecho, inclina: p.inclina, ladeo: p.ladeo, cabeza: p.cabeza,
    manos: { cerca: { mano: [0, 0, 0], codo: [0, 0, 0], forma: 'puno', escala: 1 }, lejos: { mano: [0, 0, 0], codo: [0, 0, 0], forma: 'puno', escala: 1 } },
    pies, respira: x.respira ?? 0,
  };
  const hombros = resolver(m, esq0).hombro;
  const manos = {} as PoseEsq['manos'];
  for (const l of ['cerca', 'lejos'] as Lado[]) {
    const q = p.manos[l], h = hombros[l];
    const d = dirMano(q.alto, q.abre);
    const largo = m.alcance * (1 + (x.estira?.mano?.[l] ?? 0));
    const mano: V3 = [h[0] + d[0] * q.alcance * largo, h[1] + d[1] * q.alcance * largo, h[2] + d[2] * q.alcance * largo];
    const codo: V3 = [h[0] + q.codo[0] * m.alcance * 2, h[1] + q.codo[1] * m.alcance * 2, h[2] + q.codo[2] * m.alcance * 2];
    manos[l] = { mano, codo, forma: q.forma, escala: x.escala?.mano?.[l] ?? 1, largo: 1 + (x.estira?.mano?.[l] ?? 0) };
  }
  return { ...esq0, manos };
}
