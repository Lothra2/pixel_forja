import type { EstiloDef, Medidas } from './estilo';
import type { Lado } from './esqueleto';
import { POSE_NEUTRA, sobre, type PoseMov, type PoseCompleta, type Extras } from './pose';

/**
 * Un movimiento de Forja 2 es un archivo de datos: poses clave con sus ticks (60 por segundo), la curva de cada tramo,
 * cuántos intermedios, la fase y los eventos. El motor lo convierte en cuadros y le aplica los principios de animación
 * (principios.ts) sin que el que lo escribe tenga que acordarse de ellos.
 *
 * Cada clave es una pose parcial encima de la pose base del movimiento (no encima de la clave anterior): se lee sola.
 */
export type Curva = 'lineal' | 'inout' | 'golpe' | 'freno';
export type Fase = 'inicio' | 'activo' | 'recuperacion' | 'neutral' | 'golpeado';
export interface Impacto { miembro: 'mano' | 'pie'; lado: Lado }

export interface Clave {
  pose?: PoseMov;
  /** ticks que dura la clave más su tramo hasta la siguiente */
  ticks: number;
  fase: Fase;
  /** curva del tramo hacia la siguiente (por defecto inout) */
  curva?: Curva;
  /** cuadros intermedios hacia la siguiente (por defecto 0) */
  intermedios?: number;
  /** es el recogido antes del golpe: el motor lo agranda según la fuerza y el estilo */
  anticipa?: boolean;
  /** es el cuadro del impacto: qué pega */
  impacto?: Impacto;
  eventos?: string[];
}

export interface Golpe { daño: number; nivel: 'debil' | 'fuerte' | 'poder' | 'super'; tipo: 'alto' | 'medio' | 'bajo'; tumba: boolean; pausa: number; aturde: number; multi: boolean }

export interface Movimiento {
  nombre: string;
  pack: string;
  bucle: boolean;
  /** de 0 a 1: cuánto pesa el golpe (agranda la anticipación y el sobrepaso) */
  fuerza?: number;
  /** pose base, de la biblioteca de poses del pack */
  base?: string;
  claves: Clave[];
  golpe?: Golpe;
  notas?: string;
}

/** Un cuadro ya muestreado: la pose normalizada, lo que el motor le agrega, sus ticks y su fase. */
export interface Cuadro {
  pose: PoseCompleta;
  extras: Extras;
  ticks: number;
  fase: Fase;
  eventos: string[];
  /** índice de la clave si es una clave, -1 si es un intermedio o un cuadro que agregó el motor */
  clave: number;
  /** qué principio lo agregó (sobrepaso) */
  agregado?: string;
  impacto?: Impacto;
}

// ---------- curvas ----------

export function curva(c: Curva, t: number): number {
  switch (c) {
    case 'lineal': return t;
    case 'inout': return t * t * (3 - 2 * t);
    // el golpe arranca lento y llega de golpe
    case 'golpe': return t * t * t;
    // el freno sale rápido y se asienta
    case 'freno': return 1 - (1 - t) ** 3;
  }
}

// ---------- mezcla de poses ----------

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixAng = (a: number, b: number, t: number) => { let d = b - a; while (d > 180) d -= 360; while (d < -180) d += 360; return a + d * t; };

/**
 * Mezcla dos poses. Las manos ya van en esféricas (alcance y ángulos): mezclarlas da un arco alrededor del hombro.
 * Los pies que están en el aire se mezclan en polares alrededor de la cadera (arco); los que están en el piso y se
 * mueven levantan un poco a mitad de camino (un paso, no un patinazo); los que no se mueven quedan donde están.
 * `tc` es el avance de la cabeza (lidera el giro).
 */
export function mezclar(a: PoseCompleta, b: PoseCompleta, t: number, caderaAltaN: number, tobN: number, tc = t): PoseCompleta {
  const cadera = { x: mix(a.cadera.x, b.cadera.x, t), baja: mix(a.cadera.baja, b.cadera.baja, t), z: mix(a.cadera.z, b.cadera.z, t) };
  const hip = (p: PoseCompleta) => [p.cadera.x, caderaAltaN - p.cadera.baja];
  const [hx, hy] = [cadera.x, caderaAltaN - cadera.baja];
  const pie = (l: Lado) => {
    const A = a.pies[l], B = b.pies[l];
    const base = { punta: mix(A.punta, B.punta, t), giro: mixAng(A.giro, B.giro, t), z: mix(A.z, B.z, t),
      rodilla: [0, 1, 2].map((i) => mix(A.rodilla[i], B.rodilla[i], t)) as [number, number, number] };
    const quieto = A.alto === B.alto && A.x === B.x;
    if (quieto) return { ...base, x: A.x, alto: A.alto };
    const enPiso = A.alto <= 0.001 && B.alto <= 0.001;
    if (enPiso) return { ...base, x: mix(A.x, B.x, t), alto: Math.sin(Math.PI * t) * Math.min(0.12, Math.abs(B.x - A.x) * 0.4) };
    // en el aire: arco alrededor de la cadera
    const [ax, ay] = hip(a), [bx, by] = hip(b);
    const ra = Math.hypot(A.x - ax, A.alto + tobN - ay), rb = Math.hypot(B.x - bx, B.alto + tobN - by);
    const ta = Math.atan2(A.alto + tobN - ay, A.x - ax), tb = Math.atan2(B.alto + tobN - by, B.x - bx);
    let d = tb - ta; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    const r = mix(ra, rb, t), th = ta + d * t;
    return { ...base, x: hx + r * Math.cos(th), alto: Math.max(0, hy + r * Math.sin(th) - tobN) };
  };
  const mano = (l: Lado) => {
    const A = a.manos[l], B = b.manos[l];
    return {
      alcance: mix(A.alcance, B.alcance, t), alto: mixAng(A.alto, B.alto, t), abre: mixAng(A.abre, B.abre, t),
      codo: [0, 1, 2].map((i) => mix(A.codo[i], B.codo[i], t)) as [number, number, number],
      forma: t < 0.5 ? A.forma : B.forma,
    };
  };
  return {
    cadera,
    giroCadera: mixAng(a.giroCadera, b.giroCadera, t), giroPecho: mixAng(a.giroPecho, b.giroPecho, t),
    inclina: mix(a.inclina, b.inclina, t), ladeo: mix(a.ladeo, b.ladeo, t),
    cabeza: { giro: mixAng(a.cabeza.giro, b.cabeza.giro, tc), inclina: mix(a.cabeza.inclina, b.cabeza.inclina, tc) },
    manos: { cerca: mano('cerca'), lejos: mano('lejos') },
    pies: { cerca: pie('cerca'), lejos: pie('lejos') },
    cara: t < 0.5 ? a.cara : b.cara,
  };
}

/** Extrapola: la pose b llevada más allá desde a (k > 1). Para la anticipación y el sobrepaso. */
export function exagerar(a: PoseCompleta, b: PoseCompleta, k: number): PoseCompleta {
  const lin = (x: number, y: number) => x + (y - x) * k;
  const mano = (l: Lado) => ({ ...b.manos[l], alcance: Math.max(0.15, Math.min(1, lin(a.manos[l].alcance, b.manos[l].alcance))), alto: lin(a.manos[l].alto, b.manos[l].alto), abre: lin(a.manos[l].abre, b.manos[l].abre) });
  return {
    ...b,
    cadera: { x: lin(a.cadera.x, b.cadera.x), baja: Math.max(0, lin(a.cadera.baja, b.cadera.baja)), z: lin(a.cadera.z, b.cadera.z) },
    giroCadera: lin(a.giroCadera, b.giroCadera), giroPecho: lin(a.giroPecho, b.giroPecho),
    inclina: lin(a.inclina, b.inclina), ladeo: lin(a.ladeo, b.ladeo),
    cabeza: { giro: lin(a.cabeza.giro, b.cabeza.giro), inclina: lin(a.cabeza.inclina, b.cabeza.inclina) },
    manos: { cerca: mano('cerca'), lejos: mano('lejos') },
  };
}

/** La pose completa de cada clave: la neutra, la base del movimiento y la clave encima. */
export function posesClave(mov: Movimiento, poses: Record<string, PoseMov>): PoseCompleta[] {
  if (mov.base && !poses[mov.base]) throw new Error(`${mov.nombre}: no existe la pose base ${mov.base}`);
  const base = sobre(POSE_NEUTRA, mov.base ? poses[mov.base] : undefined);
  return mov.claves.map((c) => sobre(base, c.pose));
}

const FASES: Fase[] = ['inicio', 'activo', 'recuperacion', 'neutral', 'golpeado'];
const CURVAS: Curva[] = ['lineal', 'inout', 'golpe', 'freno'];

/** Revisa un movimiento escrito a mano: devuelve los errores (vacío si está bien). */
export function validarMovimiento(mov: Movimiento, poses: Record<string, PoseMov>): string[] {
  const e: string[] = [];
  const n = mov.nombre || '(sin nombre)';
  if (!mov.claves?.length) e.push(`${n}: no tiene claves`);
  if (mov.base && !poses[mov.base]) e.push(`${n}: no existe la pose base ${mov.base}`);
  if (mov.fuerza !== undefined && (mov.fuerza < 0 || mov.fuerza > 1)) e.push(`${n}: fuerza va de 0 a 1`);
  (mov.claves ?? []).forEach((c, i) => {
    if (!Number.isInteger(c.ticks) || c.ticks < 1) e.push(`${n}, clave ${i}: ticks tiene que ser un entero de 1 para arriba`);
    if (!FASES.includes(c.fase)) e.push(`${n}, clave ${i}: fase "${c.fase}" no existe (${FASES.join(', ')})`);
    if (c.curva && !CURVAS.includes(c.curva)) e.push(`${n}, clave ${i}: curva "${c.curva}" no existe (${CURVAS.join(', ')})`);
    if (c.intermedios !== undefined && (!Number.isInteger(c.intermedios) || c.intermedios < 0)) e.push(`${n}, clave ${i}: intermedios es un entero de 0 para arriba`);
    if (c.impacto && c.fase !== 'activo') e.push(`${n}, clave ${i}: el impacto va en una clave activa`);
  });
  if ((mov.claves ?? []).filter((c) => c.impacto).length > 1) e.push(`${n}: un movimiento tiene un solo impacto`);
  if (mov.golpe && !(mov.claves ?? []).some((c) => c.impacto)) e.push(`${n}: tiene golpe pero ninguna clave marca el impacto`);
  return e;
}

export { type Medidas, type EstiloDef };
