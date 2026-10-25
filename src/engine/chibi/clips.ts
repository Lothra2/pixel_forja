import type { Pose, Parte } from './body';
import type { Vista } from './head';
import { clipsVideo } from './video';

/**
 * Las animaciones del chibi. Cada cuadro trae su pose (a 32 px, mirando a la derecha), cuántos ticks dura a 60 por
 * segundo, cuánto avanza la raíz (dx), a qué altura del piso va (dy, para saltos y patadas voladoras), qué parte pega
 * y qué efecto suelta. Los tiempos de pelea salen del video cuadro a cuadro: reposo que respira cada 10 ticks,
 * golpes con arranque corto y pose que se sostiene, el poder con la pose de empuje sostenida medio segundo.
 */

export type Grupo = 'pelea' | 'beat' | 'arriba' | 'deporte';
export type Punto = 'manoD' | 'manoT' | 'pieD' | 'pieT' | 'cabeza' | 'centro' | 'util';

export interface Cuadro {
  p: Pose;
  t: number;
  dx?: number;
  dy?: number;
  golpe?: Parte;
  fx?: { id: string; en: Punto; dx?: number; dy?: number };
  sonido?: string;
  /** Apoyar en el piso: baja o sube el cuadro para que lo más bajo toque el piso (poses giradas). */
  apoyar?: boolean;
}

export interface Clip {
  id: string;
  nombre: [string, string];
  grupo: Grupo;
  loop: boolean;
  cuadros: Cuadro[];
  /** En la vista desde arriba: la dirección. */
  dir?: Direccion;
}

export type Direccion = 's' | 'se' | 'e' | 'ne' | 'n';
export const DIRECCIONES: Direccion[] = ['s', 'se', 'e', 'ne', 'n'];
export const VISTA_DIR: Record<Direccion, Vista> = { s: 'frente', se: 'frente34', e: 'lado', ne: 'espalda34', n: 'espalda' };
export const NOMBRE_DIR: Record<Direccion, [string, string]> = { s: ['abajo', 'down'], se: ['abajo derecha', 'down right'], e: ['derecha', 'right'], ne: ['arriba derecha', 'up right'], n: ['arriba', 'up'] };

const clip = (id: string, es: string, en: string, grupo: Grupo, loop: boolean, cuadros: Cuadro[], dir?: Direccion): Clip => ({ id, nombre: [es, en], grupo, loop, cuadros, ...(dir ? { dir } : {}) });

// ---------------------------------------------------------------- poses base
/** Guardia de pelea: piernas abiertas, puño de adelante a la altura del mentón (como Ryu en el video). */
export const GUARDIA: Pose = { cad: [0, 1], incl: 5, pieD: [3, 0], pieT: [-3, 0], manoD: [3, -0.5], manoT: [2, 0.5] };
const g = (o: Pose = {}): Pose => ({ ...GUARDIA, ...o });
/** Parado normal, brazos al lado. */
export const PARADO: Pose = { pieD: [1.5, 0], pieT: [-1.5, 0], manoD: [0.8, 5.6], manoT: [-0.6, 5.6] };
const n = (o: Pose = {}): Pose => ({ ...PARADO, ...o });
const AGACHADO: Pose = g({ cad: [0, 4], incl: 10, pieD: [3, 0], pieT: [-2.5, 0], manoD: [3, -0.5], manoT: [2, 0.5] });
const a = (o: Pose = {}): Pose => ({ ...AGACHADO, ...o });
/** Bolita en el aire (salto). */
const BOLITA: Pose = { cad: [0, -1], incl: 15, pieD: [2.5, 4], pieT: [0.5, 3.5], manoD: [3, 1], manoT: [2, 2] };
const b = (o: Pose = {}): Pose => ({ ...BOLITA, ...o });

/** Arco de un salto: alturas por cuadro para `n` cuadros de subida y bajada. */
const arco = (alto: number, pasos: number) => Array.from({ length: pasos }, (_, i) => Math.round(Math.sin(((i + 1) / (pasos + 1)) * Math.PI) * alto));

// ---------------------------------------------------------------- pelea (motor por piezas, queda de respaldo)
export function peleaPiezas(): Clip[] {
  const out: Clip[] = [];
  out.push(clip('reposo', 'Reposo', 'Idle', 'pelea', true, [
    { p: g(), t: 10 }, { p: g({ cad: [0, 1.6], manoD: [3, 0], manoT: [2, 1] }), t: 10 },
    { p: g({ cad: [0, 2], manoD: [3, 0.4], manoT: [2, 1.3] }), t: 10 }, { p: g({ cad: [0, 1.6], manoD: [3, 0], manoT: [2, 1] }), t: 10 },
  ]));
  const paso = (d: number) => [
    { p: g({ pieD: [4, 0], pieT: [-2.5, 0] }), t: 6, dx: d },
    { p: g({ cad: [0.5, 1.8], pieD: [3.5, 0], pieT: [-1, 1.2] }), t: 6, dx: d },
    { p: g({ cad: [1, 1], pieD: [3, 0], pieT: [1.5, 1.5] }), t: 6, dx: d },
    { p: g({ cad: [1, 1], pieD: [1, 0], pieT: [3.5, 0.6] }), t: 6, dx: d },
    { p: g({ cad: [0.5, 1.8], pieD: [-1, 1.2], pieT: [3, 0] }), t: 6, dx: d },
    { p: g({ cad: [0, 1], pieD: [1.5, 1.5], pieT: [-2.5, 0] }), t: 6, dx: d },
  ];
  out.push(clip('caminar', 'Caminar', 'Walk forward', 'pelea', true, paso(2)));
  out.push(clip('retroceder', 'Retroceder', 'Walk back', 'pelea', true, paso(-1.6).reverse().map((c) => ({ ...c, t: 7, p: { ...c.p, incl: -3 } }))));
  out.push(clip('agacharse', 'Agacharse', 'Crouch', 'pelea', false, [{ p: g({ cad: [0, 2.5], incl: 8 }), t: 3 }, { p: a(), t: 6 }]));
  out.push(clip('agachado', 'Agachado', 'Crouching', 'pelea', true, [{ p: a(), t: 12 }, { p: a({ cad: [0, 4.4] }), t: 12 }]));
  const alto = arco(26, 6);
  out.push(clip('saltar', 'Saltar', 'Jump', 'pelea', false, [
    { p: g({ cad: [0, 3], incl: 10 }), t: 4 },
    { p: n({ incl: 0, pieD: [1.5, 0.5], pieT: [-1, 0.5], manoD: [2, 0], manoT: [1, 1] }), t: 4, dy: alto[0] },
    { p: b(), t: 6, dy: alto[1] }, { p: b({ incl: 10 }), t: 6, dy: alto[2] }, { p: b({ incl: 10 }), t: 6, dy: alto[3] },
    { p: b({ pieD: [2, 2], pieT: [-0.5, 1.5] }), t: 5, dy: alto[4] },
    { p: g({ pieD: [2.5, 1], pieT: [-2, 1], cad: [0, -0.5] }), t: 4, dy: alto[5] },
    { p: g({ cad: [0, 3], incl: 12 }), t: 5, sonido: 'aterrizar', fx: { id: 'polvo', en: 'pieD' } },
  ]));
  out.push(clip('saltar_adelante', 'Salto adelante', 'Forward jump', 'pelea', false, [
    { p: g({ cad: [0, 3], incl: 10 }), t: 4 },
    { p: n({ incl: 12, pieD: [1.5, 0.5], pieT: [-1.5, 1], manoD: [3, -1], manoT: [2, 0] }), t: 4, dy: alto[0], dx: 3 },
    { p: b({ rot: 45 }), t: 5, dy: alto[1], dx: 4 }, { p: b({ rot: 135 }), t: 5, dy: alto[2], dx: 4 },
    { p: b({ rot: 225 }), t: 5, dy: alto[3], dx: 4 }, { p: b({ rot: 315 }), t: 5, dy: alto[4], dx: 4 },
    { p: g({ pieD: [2.5, 1], pieT: [-2, 1] }), t: 4, dy: alto[5], dx: 3 },
    { p: g({ cad: [0, 3], incl: 12 }), t: 5, fx: { id: 'polvo', en: 'pieD' } },
  ]));
  out.push(clip('golpe_debil', 'Golpe débil', 'Jab', 'pelea', false, [
    { p: g({ manoD: [4, -0.6], incl: 7 }), t: 2 },
    { p: g({ manoD: [6.4, -0.6], incl: 10, cad: [0.5, 1], gesto: 'golpe' }), t: 4, golpe: 'manoD', sonido: 'whoosh' },
    { p: g({ manoD: [4.5, -0.5], incl: 8 }), t: 5 },
  ]));
  out.push(clip('golpe_fuerte', 'Golpe fuerte', 'Strong punch', 'pelea', false, [
    { p: g({ manoD: [1, 0.5], incl: -4, cad: [-0.5, 1] }), t: 4 },
    { p: g({ manoD: [5, -1], incl: 10, cad: [1, 1.5], pieD: [4, 0], manoT: [-1, 2] }), t: 2 },
    { p: g({ manoD: [6.5, -1.2], incl: 16, cad: [1.5, 1.5], pieD: [4.5, 0], manoT: [-2, 2], gesto: 'golpe' }), t: 6, golpe: 'manoD', sonido: 'whoosh_fuerte' },
    { p: g({ manoD: [4, 0], incl: 10, cad: [1, 1.2], pieD: [4, 0] }), t: 8 },
  ]));
  out.push(clip('patada_debil', 'Patada débil', 'Short kick', 'pelea', false, [
    { p: g({ pieD: [3, 3], incl: -5 }), t: 3 },
    { p: g({ pieD: [6.5, 3.5, 5], incl: -10, pieT: [-2, 0], gesto: 'golpe' }), t: 5, golpe: 'pieD', sonido: 'whoosh' },
    { p: g({ pieD: [3, 2.5], incl: -5 }), t: 5 },
  ]));
  out.push(clip('patada_fuerte', 'Patada fuerte', 'Roundhouse', 'pelea', false, [
    { p: g({ pieD: [2, 5], incl: -8, cad: [-0.5, 1] }), t: 4 },
    { p: g({ pieD: [4, 9, 30], incl: -22, cad: [-1, 0.5], pieT: [-2, 0], manoD: [1, 0] }), t: 3 },
    { p: g({ pieD: [6.5, 12.5, 45], incl: -34, cad: [-1.5, 0], pieT: [-2.5, 0], manoD: [0.5, 1], manoT: [-1, 2], gesto: 'golpe' }), t: 6, golpe: 'pieD', sonido: 'whoosh_fuerte' },
    { p: g({ pieD: [5, 6, 10], incl: -15, cad: [-1, 0.5], pieT: [-2, 0] }), t: 5 },
    { p: g({ pieD: [3, 2], incl: -5 }), t: 6 },
  ]));
  out.push(clip('golpe_agachado', 'Golpe agachado', 'Crouching jab', 'pelea', false, [
    { p: a({ manoD: [4, 0] }), t: 2 }, { p: a({ manoD: [6.3, 0.3], incl: 14, gesto: 'golpe' }), t: 4, golpe: 'manoD', sonido: 'whoosh' }, { p: a({ manoD: [4, 0] }), t: 5 },
  ]));
  out.push(clip('patada_agachado', 'Patada agachado', 'Crouching kick', 'pelea', false, [
    { p: a({ pieD: [4, 1] }), t: 3 }, { p: a({ pieD: [7, 0.5, 0], incl: 5, gesto: 'golpe' }), t: 5, golpe: 'pieD', sonido: 'whoosh' }, { p: a({ pieD: [4, 0.5] }), t: 6 },
  ]));
  out.push(clip('barrida', 'Barrida', 'Sweep', 'pelea', false, [
    { p: a({ cad: [-0.5, 4.5], incl: 18, pieD: [3, 0.5], manoT: [1, 5] }), t: 4 },
    { p: a({ cad: [-1, 5], incl: 25, pieD: [6, 0.5, -5], pieT: [-2.5, 0], manoT: [2, 6], manoD: [3, 1] }), t: 3 },
    { p: a({ cad: [-1, 5], incl: 28, pieD: [8.5, 0.3, -8], pieT: [-2.5, 0], manoT: [2.5, 6.2], manoD: [3, 1.5], gesto: 'golpe' }), t: 8, golpe: 'pieD', sonido: 'whoosh_fuerte', fx: { id: 'polvo', en: 'pieD' } },
    { p: a({ cad: [-0.5, 4.5], incl: 18, pieD: [5, 0.5], manoT: [1, 5] }), t: 8 },
  ]));
  // la patada de cabeza para abajo del video (Ryu a Ken en el aire): todo el cuerpo gira hacia atrás y la pierna sube
  out.push(clip('antiaereo', 'Patada antiaérea', 'Anti-air kick', 'pelea', false, [
    { p: a({ cad: [0, 4], manoT: [1, 5] }), t: 3 },
    { p: g({ rot: -60, pieD: [4, 5], pieT: [-1, 1], manoD: [-2, 3], manoT: [-3, 4], gesto: 'esfuerzo' }), t: 3, apoyar: true },
    { p: g({ rot: -105, pieD: [6, 5, 20], pieT: [-1, 2], manoD: [-1, 5], manoT: [-2, 6], gesto: 'golpe' }), t: 9, apoyar: true, golpe: 'pieD', sonido: 'whoosh_fuerte' },
    { p: g({ rot: -95, pieD: [5, 3], pieT: [0, 3], manoD: [-1, 5], manoT: [-2, 6] }), t: 6, apoyar: true },
    { p: a({ cad: [0, 4] }), t: 6 },
  ]));
  out.push(clip('patada_aerea', 'Patada voladora', 'Jump kick', 'pelea', false, [
    { p: b(), t: 3 }, { p: b({ pieD: [6.5, 2, -10], pieT: [0, 4], incl: -12, gesto: 'golpe' }), t: 12, golpe: 'pieD', sonido: 'whoosh' }, { p: b(), t: 4 },
  ]));
  out.push(clip('golpe_aereo', 'Golpe en el aire', 'Jump punch', 'pelea', false, [
    { p: b(), t: 3 }, { p: b({ manoD: [5, 3.5], incl: 20, gesto: 'golpe' }), t: 10, golpe: 'manoD', sonido: 'whoosh' }, { p: b(), t: 4 },
  ]));
  out.push(clip('poder', 'Poder', 'Fireball', 'pelea', false, [
    { p: g({ cad: [-0.5, 2], incl: -6, manoD: [-2, 2.5], manoT: [-2.6, 3], formaD: 'abierta', formaT: 'abierta', pieD: [4, 0], gesto: 'esfuerzo' }), t: 7 },
    { p: g({ cad: [-1, 2.5], incl: -12, manoD: [-2.5, 2], manoT: [-3, 2.4], formaD: 'palma', formaT: 'palma', pieD: [4.5, 0], gesto: 'esfuerzo' }), t: 6 },
    { p: g({ cad: [1.5, 3], incl: 12, manoD: [6, 0.6], manoT: [5.5, 1.6], formaD: 'palma', formaT: 'palma', pieD: [5, 0], pieT: [-3.5, 0], gesto: 'golpe' }), t: 3, fx: { id: 'poder', en: 'manoD', dx: 2 }, sonido: 'poder' },
    { p: g({ cad: [1.5, 3], incl: 12, manoD: [6, 0.6], manoT: [5.5, 1.6], formaD: 'palma', formaT: 'palma', pieD: [5, 0], pieT: [-3.5, 0], gesto: 'golpe' }), t: 24 },
    { p: g({ cad: [0.5, 2], incl: 6, manoD: [4, 0], manoT: [3, 1], pieD: [4, 0] }), t: 10 },
  ]));
  const sube = [4, 14, 24, 30, 26, 16, 6];
  out.push(clip('uppercut', 'Uppercut volador', 'Rising uppercut', 'pelea', false, [
    { p: a({ cad: [0, 4.5], manoD: [2.5, 4], incl: 14 }), t: 3 },
    { p: g({ cad: [0.5, 0], manoD: [3.5, -3], incl: 6, pieD: [2, 1], pieT: [-1.5, 0.5], gesto: 'golpe' }), t: 3, dy: sube[0], dx: 1, golpe: 'manoD', sonido: 'poder_corto' },
    { p: n({ manoD: [1.5, -6.5], manoT: [-1, 2], pieT: [0.5, 4], pieD: [1, 0.5], incl: -4, gesto: 'golpe' }), t: 4, dy: sube[1], dx: 2, golpe: 'manoD', fx: { id: 'estela', en: 'manoD' } },
    { p: n({ manoD: [1.2, -6.6], manoT: [-1, 2], pieT: [0.5, 4], pieD: [1, 0.5], incl: -6, gesto: 'golpe' }), t: 6, dy: sube[2], dx: 1 },
    { p: n({ manoD: [1, -6.6], manoT: [-1, 2], pieT: [0.5, 3.5], pieD: [1, 0.5], incl: -6 }), t: 6, dy: sube[3] },
    { p: b({ incl: 5 }), t: 6, dy: sube[4] }, { p: b({ pieD: [2, 2], pieT: [-0.5, 1.5] }), t: 5, dy: sube[5] },
    { p: g({ pieD: [2.5, 1], pieT: [-2, 1] }), t: 4, dy: sube[6] },
    { p: a({ cad: [0, 3.5] }), t: 8, fx: { id: 'polvo', en: 'pieD' } },
  ]));
  // el torbellino: la pierna estirada y el cuerpo girando (de lado, de espaldas, al revés, de frente)
  const giro = (i: number): Cuadro => {
    const k = i % 4;
    const pierna: Pose = { pieD: [7, 7.5, 0], pieT: [-0.5, 4.5], manoD: [2, -1], manoT: [-1, 0], incl: -4, gesto: 'golpe' };
    const p: Pose = k === 0 ? pierna : k === 1 ? { ...pierna, vista: 'espalda', pieD: [3.5, 6], pieT: [-2, 5], manoD: [3, 1], manoT: [-3, 1] } : k === 2 ? { ...pierna, espejo: true } : { ...pierna, vista: 'frente', pieD: [3.5, 6], pieT: [-2, 5], manoD: [3, 1], manoT: [-3, 1] };
    return { p, t: 3, dy: 12, dx: 3, golpe: k === 0 ? 'pieD' : undefined };
  };
  out.push(clip('torbellino', 'Patada torbellino', 'Hurricane kick', 'pelea', false, [
    { p: b({ pieD: [2, 3], pieT: [-1, 3] }), t: 4, dy: 6 },
    ...Array.from({ length: 12 }, (_, i) => giro(i)),
    { p: b(), t: 4, dy: 6 }, { p: a({ cad: [0, 3] }), t: 6, fx: { id: 'polvo', en: 'pieD' } },
  ]));
  out.push(clip('recibir_alto', 'Recibe golpe arriba', 'Hit high', 'pelea', false, [
    { p: g({ incl: -16, cab: [-1, 0], manoD: [1.5, 3], manoT: [-2, 3], cad: [-1, 1], gesto: 'dolor' }), t: 4, dx: -1, sonido: 'golpe' },
    { p: g({ incl: -10, cab: [-1, 0], manoD: [2, 2], manoT: [-1, 2.5], cad: [-0.5, 1], gesto: 'dolor' }), t: 12, dx: -1 },
  ]));
  out.push(clip('recibir_bajo', 'Recibe golpe al cuerpo', 'Hit body', 'pelea', false, [
    { p: g({ incl: 24, cab: [1, 1], manoD: [1.5, 4], manoT: [1, 4], cad: [-1, 2], gesto: 'dolor' }), t: 4, dx: -1, sonido: 'golpe' },
    { p: g({ incl: 16, cab: [1, 1], manoD: [2, 3], manoT: [1.5, 3.5], cad: [-0.5, 1.5], gesto: 'dolor' }), t: 12, dx: -1 },
  ]));
  out.push(clip('bloquear', 'Bloquear', 'Block', 'pelea', true, [{ p: g({ incl: -6, cad: [-0.5, 1.5], manoD: [2.4, -2.6], manoT: [2.8, -1.2], gesto: 'bravo' }), t: 30 }]));
  out.push(clip('bloquear_agachado', 'Bloquear agachado', 'Crouch block', 'pelea', true, [{ p: a({ incl: 2, manoD: [2.4, -2.4], manoT: [2.8, -1], gesto: 'bravo' }), t: 30 }]));
  const caida = (ko: boolean): Cuadro[] => [
    { p: g({ incl: -20, rot: -15, manoD: [2, -2], manoT: [-2, -1], pieD: [3, 1], gesto: 'dolor' }), t: 4, dy: 4, dx: -2, sonido: 'golpe_fuerte' },
    { p: n({ rot: -45, manoD: [2, -3], manoT: [-1, -3], pieD: [3, 2], pieT: [-1, 0], gesto: 'dolor' }), t: 6, dy: 14, dx: -3 },
    { p: n({ rot: -70, manoD: [1, -4], manoT: [-1, -4], pieD: [3, 2], gesto: 'dolor' }), t: 6, dy: 12, dx: -3 },
    { p: n({ rot: -90, manoD: [2, 3], manoT: [-2, 4], pieD: [1.5, 0], pieT: [-1, 0], gesto: 'dolor' }), t: 3, apoyar: true, dx: -2, sonido: 'caer', fx: { id: 'polvo', en: 'centro' } },
    { p: n({ rot: -90, manoD: [2, 2], manoT: [-2, 3], pieD: [2.5, 1.5], pieT: [-0.5, 1], gesto: 'dolor' }), t: 6, apoyar: true, dy: 5, dx: -1 },
    { p: n({ rot: -90, manoD: [2, 3], manoT: [-2, 4], pieD: [1.5, 0], pieT: [-1, 0], gesto: ko ? 'ko' : 'dolor' }), t: ko ? 90 : 24, apoyar: true, fx: ko ? undefined : undefined },
  ];
  out.push(clip('caer', 'Caer', 'Knockdown', 'pelea', false, caida(false)));
  out.push(clip('levantarse', 'Levantarse', 'Get up', 'pelea', false, [
    { p: n({ rot: -55, manoD: [2, 6], manoT: [0, 6], pieD: [3, 3], pieT: [1, 2] }), t: 8, apoyar: true },
    { p: a({ cad: [0, 4.5], incl: 25, manoT: [1, 5] }), t: 8 },
    { p: g({ cad: [0, 2.5] }), t: 6 },
  ]));
  out.push(clip('ko', 'KO', 'KO', 'pelea', false, caida(true)));
  out.push(clip('mareado', 'Mareado', 'Dizzy', 'pelea', true, [
    { p: n({ incl: -8, cab: [-1, 0], manoD: [1, 5], manoT: [-1, 5], gesto: 'ko' }), t: 10, fx: { id: 'mareo', en: 'cabeza', dy: -8 } },
    { p: n({ incl: 0, cab: [0, 1], manoD: [1, 5.5], manoT: [-1, 5.5], gesto: 'ko' }), t: 10 },
    { p: n({ incl: 8, cab: [1, 0], manoD: [1.5, 5], manoT: [-0.5, 5], gesto: 'ko' }), t: 10 },
    { p: n({ incl: 0, cab: [0, 1], manoD: [1, 5.5], manoT: [-1, 5.5], gesto: 'ko' }), t: 10 },
  ]));
  out.push(clip('agarrar', 'Agarrar y lanzar', 'Throw', 'pelea', false, [
    { p: g({ manoD: [5, 0.5], manoT: [4.5, 1.5], formaD: 'abierta', formaT: 'abierta', incl: 12 }), t: 4 },
    { p: g({ manoD: [3, 0], manoT: [2.5, 1], formaD: 'agarra', incl: 4, gesto: 'esfuerzo' }), t: 8 },
    { p: g({ manoD: [0.5, -6], manoT: [-0.5, -6], incl: -14, cad: [0, 1.5], gesto: 'esfuerzo' }), t: 6 },
    { p: g({ manoD: [-4, -3], manoT: [-4, -2], incl: -26, cad: [-1, 1.5], pieT: [-4, 0], gesto: 'golpe' }), t: 8, sonido: 'lanzar' },
    { p: g(), t: 10 },
  ]));
  out.push(clip('lanzado', 'Lo lanzan', 'Thrown', 'pelea', false, [
    { p: n({ rot: -30, gesto: 'dolor', manoD: [2, -2], manoT: [-2, -2] }), t: 5, dy: 10, dx: -2 },
    { p: n({ rot: -120, gesto: 'dolor', manoD: [2, -2], manoT: [-2, -2] }), t: 5, dy: 20, dx: -4 },
    { p: n({ rot: -210, gesto: 'dolor', manoD: [2, -2], manoT: [-2, -2] }), t: 5, dy: 22, dx: -4 },
    { p: n({ rot: -270, gesto: 'dolor', manoD: [2, -2], manoT: [-2, -2] }), t: 5, dy: 12, dx: -4 },
    { p: n({ rot: -90, manoD: [2, 3], manoT: [-2, 4], gesto: 'dolor' }), t: 20, apoyar: true, sonido: 'caer', fx: { id: 'polvo', en: 'centro' } },
  ]));
  out.push(clip('victoria', 'Victoria', 'Victory', 'pelea', false, [
    { p: a({ cad: [0, 3], gesto: 'feliz' }), t: 6 },
    { p: n({ manoD: [1, -6.5], manoT: [-1, 2], pieD: [1.5, 1], pieT: [-1.5, 1.5], gesto: 'feliz' }), t: 8, dy: 6 },
    { p: n({ manoD: [1, -6.5], manoT: [-1, 2], gesto: 'feliz' }), t: 60 },
  ]));
  out.push(clip('victoria_saludo', 'Victoria con saludo', 'Victory wave', 'pelea', true, [
    { p: n({ manoD: [3, -4], formaD: 'palma', gesto: 'feliz', vista: 'frente' }), t: 10 },
    { p: n({ manoD: [4, -3.5], formaD: 'palma', gesto: 'feliz', vista: 'frente' }), t: 10 },
  ]));
  out.push(clip('presentacion', 'Presentación', 'Intro bow', 'pelea', false, [
    { p: n({ manoD: [2, 3], manoT: [2, 3.5], formaD: 'palma' }), t: 20 },
    { p: n({ incl: 30, cab: [1, 1], manoD: [2.5, 3], manoT: [2, 3.5], formaD: 'palma', gesto: 'parpadeo' }), t: 30 },
    { p: g({ cad: [0, 2] }), t: 8 }, { p: g({ gesto: 'bravo' }), t: 30 },
  ]));
  out.push(clip('burla', 'Burla', 'Taunt', 'pelea', true, [
    { p: n({ manoD: [4.5, 1], formaD: 'palma', gesto: 'feliz', incl: -4 }), t: 10 },
    { p: n({ manoD: [3, -0.5], formaD: 'abierta', gesto: 'feliz', incl: -4 }), t: 10 },
  ]));
  out.push(clip('esquivar', 'Esquivar atrás', 'Back dash', 'pelea', false, [
    { p: g({ incl: -12, pieD: [2, 1.5], pieT: [-2, 1] }), t: 4, dy: 4, dx: -5 },
    { p: g({ incl: -8, pieD: [2, 1], pieT: [-2, 0.5] }), t: 4, dy: 3, dx: -4 },
    { p: g({ cad: [0, 2] }), t: 6 },
  ]));
  return out;
}

// ---------------------------------------------------------------- beat'em up y plataformas
function beat(): Clip[] {
  const out: Clip[] = [];
  const corre = (o: Pose = {}): Pose => ({ incl: 14, cad: [0, 0.5], ...o });
  out.push(clip('correr', 'Correr', 'Run', 'beat', true, [
    { p: corre({ pieD: [4, 1], pieT: [-4, 2], manoD: [-2.5, 3], manoT: [3, 0] }), t: 4, dx: 3, dy: 1 },
    { p: corre({ pieD: [2, 0], pieT: [-3, 3], cad: [0, 1.5], manoD: [-1, 4], manoT: [2, 2] }), t: 4, dx: 3 },
    { p: corre({ pieD: [-1, 0], pieT: [1.5, 3.5], manoD: [1, 4], manoT: [0, 4] }), t: 4, dx: 3 },
    { p: corre({ pieT: [4, 1], pieD: [-4, 2], manoT: [-2.5, 3], manoD: [3, 0] }), t: 4, dx: 3, dy: 1 },
    { p: corre({ pieT: [2, 0], pieD: [-3, 3], cad: [0, 1.5], manoT: [-1, 4], manoD: [2, 2] }), t: 4, dx: 3 },
    { p: corre({ pieT: [-1, 0], pieD: [1.5, 3.5], manoT: [1, 4], manoD: [0, 4] }), t: 4, dx: 3 },
  ]));
  out.push(clip('caminar_lado', 'Caminar normal', 'Walk', 'beat', true, [
    { p: n({ pieD: [3, 0], pieT: [-2.5, 0], manoD: [-1, 5], manoT: [2, 4.5] }), t: 7, dx: 1.5 },
    { p: n({ cad: [0, 0.8], pieD: [2, 0], pieT: [-1, 1], manoD: [0, 5.5], manoT: [1, 5] }), t: 7, dx: 1.5 },
    { p: n({ pieD: [0.5, 0], pieT: [1.5, 1.5], manoD: [1, 5.5], manoT: [0, 5.5] }), t: 7, dx: 1.5 },
    { p: n({ pieT: [3, 0], pieD: [-2.5, 0], manoT: [-1, 5], manoD: [2, 4.5] }), t: 7, dx: 1.5 },
    { p: n({ cad: [0, 0.8], pieT: [2, 0], pieD: [-1, 1], manoT: [0, 5.5], manoD: [1, 5] }), t: 7, dx: 1.5 },
    { p: n({ pieT: [0.5, 0], pieD: [1.5, 1.5], manoT: [1, 5.5], manoD: [0, 5.5] }), t: 7, dx: 1.5 },
  ]));
  out.push(clip('quieto_lado', 'Quieto', 'Stand', 'beat', true, [{ p: n(), t: 20 }, { p: n({ cad: [0, 0.6], manoD: [0.8, 5.8], manoT: [-0.6, 5.8] }), t: 20 }, { p: n({ gesto: 'parpadeo' }), t: 6 }, { p: n(), t: 20 }]));
  const s2 = arco(22, 5);
  out.push(clip('salto_plataforma', 'Salto de plataforma', 'Platform jump', 'beat', false, [
    { p: n({ cad: [0, 2.5], incl: 10, manoD: [-1, 4], manoT: [-1.5, 4] }), t: 3 },
    { p: n({ pieD: [2, 2], pieT: [-2, 0.5], manoD: [2, -5], manoT: [-1, 2], incl: 5 }), t: 6, dy: s2[0], dx: 2 },
    { p: n({ pieD: [2.5, 3.5], pieT: [-1, 2], manoD: [2, -5.5], manoT: [-1, 1], incl: 5 }), t: 8, dy: s2[1], dx: 2 },
    { p: n({ pieD: [2.5, 3], pieT: [-1, 2.5], manoD: [2.5, -4], manoT: [-1, 1] }), t: 8, dy: s2[2], dx: 2 },
    { p: n({ pieD: [2, 1.5], pieT: [-1.5, 1], manoD: [3, -2], manoT: [-2, 0] }), t: 6, dy: s2[3], dx: 2 },
    { p: n({ pieD: [2, 0.5], pieT: [-1.5, 0.5], manoD: [3, 0], manoT: [-2, 1] }), t: 5, dy: s2[4], dx: 2 },
    { p: n({ cad: [0, 2.5], incl: 8 }), t: 5, fx: { id: 'polvo', en: 'pieD' } },
  ]));
  out.push(clip('caer_plataforma', 'Cayendo', 'Falling', 'beat', true, [
    { p: n({ pieD: [2, 1.5], pieT: [-1.5, 1], manoD: [3, -3], manoT: [-2, -2], gesto: 'sorpresa' }), t: 6 },
    { p: n({ pieD: [2, 1], pieT: [-1.5, 1.5], manoD: [3.5, -2], manoT: [-2.5, -3], gesto: 'sorpresa' }), t: 6 },
  ]));
  out.push(clip('agarrar_cuello', 'Agarrar', 'Grab', 'beat', true, [{ p: g({ manoD: [4.5, 0], manoT: [4, 1], formaD: 'agarra', formaT: 'agarra', incl: 8, gesto: 'bravo' }), t: 30 }]));
  out.push(clip('rodillazo', 'Rodillazo', 'Knee strike', 'beat', false, [
    { p: g({ manoD: [4.5, 1], manoT: [4, 2], formaD: 'agarra', pieD: [2, 2], incl: 10 }), t: 3 },
    { p: g({ manoD: [4.5, 2], manoT: [4, 3], formaD: 'agarra', pieD: [3, 6, 40], incl: 16, gesto: 'golpe' }), t: 6, golpe: 'pieD', sonido: 'golpe' },
    { p: g({ manoD: [4.5, 1], manoT: [4, 2], formaD: 'agarra', pieD: [2.5, 2], incl: 10 }), t: 6 },
  ]));
  out.push(clip('combo', 'Combo de tres', 'Three-hit combo', 'beat', false, [
    { p: g({ manoD: [6.4, -0.6], incl: 10, gesto: 'golpe' }), t: 5, golpe: 'manoD', sonido: 'whoosh' }, { p: g(), t: 3 },
    { p: g({ manoT: [6.2, 0], manoD: [1, 1], incl: 14, cad: [1, 1], gesto: 'golpe' }), t: 5, golpe: 'manoT', sonido: 'whoosh' }, { p: g(), t: 3 },
    { p: g({ pieD: [7, 6, 20], incl: -18, pieT: [-2, 0], gesto: 'golpe' }), t: 8, golpe: 'pieD', sonido: 'whoosh_fuerte' }, { p: g(), t: 8 },
  ]));
  out.push(clip('patada_correr', 'Patada en carrera', 'Dash kick', 'beat', false, [
    { p: b({ incl: 5 }), t: 3, dy: 6, dx: 4 },
    { p: b({ pieD: [7, 2, -5], pieT: [-0.5, 4], incl: -14, gesto: 'golpe' }), t: 12, dy: 8, dx: 4, golpe: 'pieD', sonido: 'whoosh_fuerte' },
    { p: b(), t: 4, dy: 4, dx: 3 }, { p: a({ cad: [0, 3] }), t: 6, fx: { id: 'polvo', en: 'pieD' } },
  ]));
  out.push(clip('levantar', 'Levantar objeto', 'Lift', 'beat', false, [
    { p: a({ cad: [0, 4], incl: 22, manoD: [4, 5], manoT: [3.5, 5.5], formaD: 'abierta', formaT: 'abierta', gesto: 'esfuerzo' }), t: 8 },
    { p: n({ cad: [0, 1.5], manoD: [2.5, 0], manoT: [2, 0.5], formaD: 'abierta', gesto: 'esfuerzo' }), t: 6 },
    { p: n({ manoD: [1, -6.3], manoT: [0.5, -6.3], formaD: 'abierta', formaT: 'abierta', gesto: 'esfuerzo' }), t: 10 },
  ]));
  const cargaPose = (o: Pose = {}): Pose => n({ manoD: [1, -6.3], manoT: [0.5, -6.3], formaD: 'abierta', formaT: 'abierta', ...o });
  out.push(clip('cargar', 'Caminar cargando', 'Carry walk', 'beat', true, [
    { p: cargaPose({ pieD: [2.5, 0], pieT: [-2, 0] }), t: 8, dx: 1.2 }, { p: cargaPose({ cad: [0, 0.8], pieD: [1, 0], pieT: [0.5, 1.2] }), t: 8, dx: 1.2 },
    { p: cargaPose({ pieT: [2.5, 0], pieD: [-2, 0] }), t: 8, dx: 1.2 }, { p: cargaPose({ cad: [0, 0.8], pieT: [1, 0], pieD: [0.5, 1.2] }), t: 8, dx: 1.2 },
  ]));
  out.push(clip('lanzar_objeto', 'Lanzar objeto', 'Throw object', 'beat', false, [
    { p: cargaPose({ manoD: [-1, -6], manoT: [-1.5, -5.5], incl: -12 }), t: 6 },
    { p: n({ manoD: [5, -3], manoT: [4.5, -2.5], formaD: 'palma', formaT: 'palma', incl: 14, pieD: [3.5, 0], gesto: 'golpe' }), t: 8, sonido: 'lanzar' },
    { p: n({ manoD: [3, 2], manoT: [2.5, 2.5], incl: 6 }), t: 8 },
  ]));
  out.push(clip('recoger', 'Recoger', 'Pick up', 'beat', false, [
    { p: a({ cad: [0, 3.5], incl: 30, manoD: [4, 6], manoT: [1, 3], formaD: 'abierta' }), t: 8 },
    { p: a({ cad: [0, 3.5], incl: 30, manoD: [3.5, 6], manoT: [1, 3], formaD: 'agarra' }), t: 6 },
    { p: n({ manoD: [3, 1], formaD: 'agarra', gesto: 'feliz' }), t: 10 },
  ]));
  out.push(clip('trepar', 'Trepar', 'Climb', 'beat', true, [
    { p: n({ vista: 'espalda', manoD: [0.5, -5.5], manoT: [-0.5, -3], pieD: [1.5, 2.5], pieT: [-1.5, 0] }), t: 8, dy: 2 },
    { p: n({ vista: 'espalda', manoD: [0.5, -4.5], manoT: [-0.5, -4.5], pieD: [1.5, 1.5], pieT: [-1.5, 1] }), t: 6, dy: 2 },
    { p: n({ vista: 'espalda', manoD: [0.5, -3], manoT: [-0.5, -5.5], pieD: [1.5, 0], pieT: [-1.5, 2.5] }), t: 8, dy: 2 },
    { p: n({ vista: 'espalda', manoD: [0.5, -4.5], manoT: [-0.5, -4.5], pieD: [1.5, 1], pieT: [-1.5, 1.5] }), t: 6, dy: 2 },
  ]));
  out.push(clip('colgar', 'Colgando', 'Hang', 'beat', true, [
    { p: n({ manoD: [1.5, -6.5], manoT: [1, -6.5], pieD: [1.5, -1], pieT: [-0.5, -1], formaD: 'agarra', formaT: 'agarra' }), t: 14 },
    { p: n({ manoD: [1.5, -6.5], manoT: [1, -6.5], pieD: [2, -0.5], pieT: [0, -1.5], formaD: 'agarra', formaT: 'agarra' }), t: 14 },
  ]));
  out.push(clip('empujar', 'Empujar', 'Push', 'beat', true, [
    { p: n({ incl: 28, cad: [1, 1], manoD: [4, 1], manoT: [3.5, 2], formaD: 'palma', formaT: 'palma', pieD: [2, 0], pieT: [-4, 0], gesto: 'esfuerzo' }), t: 10, dx: 0.6 },
    { p: n({ incl: 28, cad: [1, 1.5], manoD: [4, 1], manoT: [3.5, 2], formaD: 'palma', formaT: 'palma', pieD: [-1, 0.5], pieT: [-3, 0], gesto: 'esfuerzo' }), t: 10, dx: 0.6 },
  ]));
  out.push(clip('deslizar', 'Deslizarse', 'Slide', 'beat', false, [
    { p: n({ cad: [-1, 4.5], incl: -35, pieD: [7, 0.5, 10], pieT: [1, 0], manoD: [1, 2], manoT: [-3, 5] }), t: 16, dx: 4, fx: { id: 'polvo', en: 'pieD' } },
    { p: a({ cad: [0, 3] }), t: 6 },
  ]));
  return out;
}

// ---------------------------------------------------------------- vista desde arriba (4 y 8 direcciones)
function arriba(): Clip[] {
  const out: Clip[] = [];
  for (const dir of DIRECCIONES) {
    const vista = VISTA_DIR[dir];
    const lado = vista === 'lado';
    const fr = !lado;
    const P = (o: Pose = {}): Pose => (lado ? n(o) : { pieD: [1.5, 0], pieT: [-1.5, 0], manoD: [0.6, 5.4], manoT: [-0.6, 5.4], vista, ...o });
    const tag = `_${dir}`;
    const [es] = (({ s: ['abajo'], se: ['abajo derecha'], e: ['derecha'], ne: ['arriba derecha'], n: ['arriba'] }) as Record<Direccion, [string]>)[dir];
    out.push(clip('quieto' + tag, `Quieto (${es})`, `Idle (${dir})`, 'arriba', true, [{ p: P(), t: 24 }, { p: P({ cad: [0, 0.7] }), t: 24 }, ...(vista !== 'espalda' ? [{ p: P({ gesto: 'parpadeo' }), t: 6 } as Cuadro] : [])], dir));
    if (lado) {
      out.push(clip('caminar' + tag, `Caminar (${es})`, `Walk (${dir})`, 'arriba', true, [
        { p: n({ pieD: [2.5, 0], pieT: [-2, 0], manoD: [-1, 5], manoT: [1.5, 4.6] }), t: 8, dx: 1.5 },
        { p: n({ cad: [0, 0.8], pieD: [0.5, 0], pieT: [0.5, 1.4] }), t: 8, dx: 1.5 },
        { p: n({ pieT: [2.5, 0], pieD: [-2, 0], manoT: [-1, 5], manoD: [1.5, 4.6] }), t: 8, dx: 1.5 },
        { p: n({ cad: [0, 0.8], pieT: [0.5, 0], pieD: [0.5, 1.4] }), t: 8, dx: 1.5 },
      ], dir));
      out.push(clip('correr' + tag, `Correr (${es})`, `Run (${dir})`, 'arriba', true, [
        { p: n({ incl: 12, pieD: [3.5, 1], pieT: [-3, 1.5], manoD: [-2, 3], manoT: [2.5, 1] }), t: 5, dx: 3, dy: 1 },
        { p: n({ incl: 12, cad: [0, 1], pieD: [0.5, 0], pieT: [0.5, 2.5], manoD: [0.5, 4], manoT: [0.5, 4] }), t: 5, dx: 3 },
        { p: n({ incl: 12, pieT: [3.5, 1], pieD: [-3, 1.5], manoT: [-2, 3], manoD: [2.5, 1] }), t: 5, dx: 3, dy: 1 },
        { p: n({ incl: 12, cad: [0, 1], pieT: [0.5, 0], pieD: [0.5, 2.5], manoD: [0.5, 4], manoT: [0.5, 4] }), t: 5, dx: 3 },
      ], dir));
    } else {
      // de frente y de espaldas: los pies suben uno y otro, los brazos se mecen y el cuerpo rebota
      out.push(clip('caminar' + tag, `Caminar (${es})`, `Walk (${dir})`, 'arriba', true, [
        { p: P({ pieD: [1.5, 1.2], pieT: [-1.5, 0], manoD: [0.6, 4.6], manoT: [-0.6, 5.6] }), t: 8 },
        { p: P({ cad: [0, 0.8] }), t: 8 },
        { p: P({ pieT: [-1.5, 1.2], pieD: [1.5, 0], manoT: [-0.6, 4.6], manoD: [0.6, 5.6] }), t: 8 },
        { p: P({ cad: [0, 0.8] }), t: 8 },
      ], dir));
      out.push(clip('correr' + tag, `Correr (${es})`, `Run (${dir})`, 'arriba', true, [
        { p: P({ pieD: [1.5, 2.2], pieT: [-1.5, 0], manoD: [1, 3], manoT: [-0.6, 5.6], cad: [0, -0.5] }), t: 5, dy: 1 },
        { p: P({ cad: [0, 1] }), t: 5 },
        { p: P({ pieT: [-1.5, 2.2], pieD: [1.5, 0], manoT: [-1, 3], manoD: [0.6, 5.6], cad: [0, -0.5] }), t: 5, dy: 1 },
        { p: P({ cad: [0, 1] }), t: 5 },
      ], dir));
    }
    if (vista !== 'espalda' && vista !== 'espalda34') {
      out.push(clip('hablar' + tag, `Hablar (${es})`, `Talk (${dir})`, 'arriba', true, [{ p: P({ gesto: 'hablar' }), t: 8 }, { p: P(), t: 8 }, { p: P({ gesto: 'hablar', manoD: lado ? [3, 2] : [1.5, 3], formaD: 'palma' }), t: 8 }, { p: P(), t: 8 }], dir));
    }
    out.push(clip('usar' + tag, `Usar (${es})`, `Use (${dir})`, 'arriba', false, [
      { p: P({ manoD: lado ? [4.5, 1.5] : [1.5, 2], formaD: 'abierta' }), t: 8 }, { p: P({ manoD: lado ? [5.5, 1] : [1.5, 1], formaD: 'palma' }), t: 10 }, { p: P(), t: 6 },
    ], dir));
    out.push(clip('saludar' + tag, `Saludar (${es})`, `Wave (${dir})`, 'arriba', true, [
      { p: P({ manoD: lado ? [2.5, -4.5] : [2.5, -4.5], formaD: 'palma', gesto: fr ? 'feliz' : undefined }), t: 8 },
      { p: P({ manoD: lado ? [3.5, -3.5] : [3.5, -3.5], formaD: 'palma', gesto: fr ? 'feliz' : undefined }), t: 8 },
    ], dir));
    out.push(clip('atacar' + tag, `Atacar (${es})`, `Attack (${dir})`, 'arriba', false, lado ? [
      { p: n({ manoD: [-2, -3], incl: -8, util: -40 }), t: 5 }, { p: n({ manoD: [5, 1], incl: 14, util: 110, gesto: 'golpe' }), t: 6, golpe: 'util', sonido: 'whoosh' }, { p: n({ manoD: [3, 3], util: 160 }), t: 8 },
    ] : [
      { p: P({ manoD: [1.5, -4], util: 0, gesto: vista === 'espalda' ? undefined : 'bravo' }), t: 5 }, { p: P({ manoD: [1.2, 3], util: 170, cad: [0, 1], gesto: vista === 'espalda' ? undefined : 'golpe' }), t: 6, golpe: 'util', sonido: 'whoosh' }, { p: P(), t: 8 },
    ], dir));
  }
  // gestos de ánimo (de frente)
  const F = (o: Pose = {}): Pose => ({ pieD: [1.5, 0], pieT: [-1.5, 0], manoD: [0.6, 5.4], manoT: [-0.6, 5.4], vista: 'frente', ...o });
  out.push(clip('celebrar_frente', 'Celebrar', 'Cheer', 'arriba', true, [
    { p: F({ cad: [0, 2], manoD: [1.5, 2], manoT: [-1.5, 2], gesto: 'feliz' }), t: 6 },
    { p: F({ manoD: [1.5, -6], manoT: [-1.5, -6], formaD: 'palma', formaT: 'palma', gesto: 'feliz', pieD: [1.5, 0.5], pieT: [-1.5, 0.5] }), t: 10, dy: 6 },
  ]));
  out.push(clip('triste_frente', 'Triste', 'Sad', 'arriba', true, [{ p: F({ cab: [0, 1], cad: [0, 0.5], gesto: 'triste' }), t: 30 }, { p: F({ cab: [0, 1.5], cad: [0, 1], gesto: 'triste' }), t: 30 }]));
  out.push(clip('sorpresa_frente', 'Sorpresa', 'Surprised', 'arriba', false, [
    { p: F({ gesto: 'sorpresa', manoD: [2, -1], manoT: [-2, -1], formaD: 'palma', formaT: 'palma' }), t: 6, dy: 3, fx: { id: 'emote_exclamacion', en: 'cabeza', dy: -10 } },
    { p: F({ gesto: 'sorpresa', manoD: [1.5, 1], manoT: [-1.5, 1], formaD: 'palma', formaT: 'palma' }), t: 24 },
  ]));
  out.push(clip('bravo_frente', 'Bravo', 'Angry', 'arriba', true, [
    { p: F({ gesto: 'bravo', manoD: [1.5, 3], manoT: [-1.5, 3], cad: [0, 0.5] }), t: 6, fx: { id: 'emote_enojo', en: 'cabeza', dy: -10 } },
    { p: F({ gesto: 'bravo', manoD: [1.5, 3.5], manoT: [-1.5, 3.5], pieD: [1.5, 1] }), t: 6 },
  ]));
  out.push(clip('sentado_frente', 'Sentado', 'Sitting', 'arriba', true, [
    { p: F({ cad: [0, 4.5], pieD: [2, 0], pieT: [-2, 0], manoD: [1.5, 4], manoT: [-1.5, 4] }), t: 30 },
    { p: F({ cad: [0, 4.5], pieD: [2, 0], pieT: [-2, 0], manoD: [1.5, 4], manoT: [-1.5, 4], gesto: 'parpadeo' }), t: 6 },
  ]));
  out.push(clip('dormir_frente', 'Dormir', 'Sleep', 'arriba', true, [
    { p: F({ cad: [0, 4.5], pieD: [2, 0], pieT: [-2, 0], manoD: [1.5, 4], manoT: [-1.5, 4], cab: [0, 1], gesto: 'dormido' }), t: 30, fx: { id: 'emote_zzz', en: 'cabeza', dy: -10 } },
    { p: F({ cad: [0, 4.8], pieD: [2, 0], pieT: [-2, 0], manoD: [1.5, 4.2], manoT: [-1.5, 4.2], cab: [0, 1.4], gesto: 'dormido' }), t: 30 },
  ]));
  return out;
}

// ---------------------------------------------------------------- deportes y minijuegos
function deporte(): Clip[] {
  const out: Clip[] = [];
  out.push(clip('patear', 'Patear el balón', 'Kick the ball', 'deporte', false, [
    { p: n({ incl: 10, pieD: [3, 0], pieT: [-2, 1], manoD: [-1.5, 4], manoT: [2, 3] }), t: 5, dx: 2 },
    { p: n({ incl: 4, pieT: [0.5, 0], pieD: [-4, 3, -20], manoD: [3, 0], manoT: [-2, 2] }), t: 5, dx: 1 },
    { p: n({ incl: -12, pieT: [0.5, 0], pieD: [6.5, 3, 15], manoD: [-2, 2], manoT: [3, -1], gesto: 'golpe' }), t: 4, golpe: 'pieD', sonido: 'patada_balon' },
    { p: n({ incl: -16, pieT: [0.5, 0], pieD: [5, 7, 30], manoD: [-2, 1], manoT: [3, -2], gesto: 'golpe' }), t: 6 },
    { p: n({ pieD: [3, 0.5] }), t: 8 },
  ]));
  out.push(clip('cabezazo', 'Cabezazo', 'Header', 'deporte', false, [
    { p: n({ cad: [0, 2.5], incl: 8, manoD: [-2, 4], manoT: [-2.5, 4] }), t: 5 },
    { p: n({ incl: -10, manoD: [-2, 2], manoT: [-2.5, 2.5], pieD: [1, 1.5], pieT: [-1.5, 1] }), t: 6, dy: 8 },
    { p: n({ incl: 26, cab: [2, 0], manoD: [-3, 3], manoT: [-3.5, 3], pieD: [0, 2], pieT: [-2.5, 2], gesto: 'golpe' }), t: 6, dy: 10, golpe: 'cabeza', sonido: 'cabezazo' },
    { p: n({ incl: 8, pieD: [1.5, 1], pieT: [-1.5, 1] }), t: 6, dy: 5 }, { p: n({ cad: [0, 2], incl: 6 }), t: 5 },
  ]));
  out.push(clip('portero', 'Portero se lanza', 'Goalkeeper dive', 'deporte', false, [
    { p: n({ cad: [0, 2.5], incl: 12, pieD: [2.5, 0], pieT: [-2.5, 0], manoD: [3, 1], manoT: [-1, 1], formaD: 'abierta', formaT: 'abierta' }), t: 6 },
    { p: n({ rot: 55, manoD: [1, -6.3], manoT: [0, -6.3], formaD: 'palma', formaT: 'palma', pieD: [1, 0], pieT: [-1, 0.5], gesto: 'esfuerzo' }), t: 6, dy: 8, dx: 4 },
    { p: n({ rot: 85, manoD: [1, -6.5], manoT: [0, -6.5], formaD: 'palma', formaT: 'palma', pieD: [0.5, 0], pieT: [-1, 1], gesto: 'esfuerzo' }), t: 10, dy: 8, dx: 4, golpe: 'manoD' },
    { p: n({ rot: 90, manoD: [1, -6], manoT: [0, -6], pieD: [0.5, 0], pieT: [-1, 0.5], gesto: 'dolor' }), t: 16, apoyar: true, fx: { id: 'polvo', en: 'centro' } },
  ]));
  out.push(clip('celebrar', 'Celebrar gol', 'Goal celebration', 'deporte', true, [
    { p: n({ cad: [0, 2], manoD: [2, 1], manoT: [1, 1.5], gesto: 'feliz' }), t: 6 },
    { p: n({ manoD: [1.5, -6.4], manoT: [0.5, -6.4], formaD: 'puno', gesto: 'feliz', pieD: [1.5, 1], pieT: [-1.5, 1.5] }), t: 10, dy: 8 },
    { p: n({ manoD: [1.5, -6.4], manoT: [0.5, -6.4], gesto: 'feliz' }), t: 6, dy: 2 },
  ]));
  out.push(clip('baile', 'Baile', 'Dance', 'deporte', true, [
    { p: { vista: 'frente', cad: [1, 1], pieD: [2, 0], pieT: [-1.5, 0], manoD: [2, -5], manoT: [-1, 4], formaD: 'palma', gesto: 'feliz' }, t: 8 },
    { p: { vista: 'frente', cad: [0, 0], pieD: [1.5, 0], pieT: [-1.5, 0.8], manoD: [2, 1], manoT: [-2, 1], gesto: 'feliz' }, t: 8 },
    { p: { vista: 'frente', cad: [-1, 1], pieD: [1.5, 0], pieT: [-2, 0], manoD: [1, 4], manoT: [-2, -5], formaT: 'palma', gesto: 'feliz' }, t: 8 },
    { p: { vista: 'frente', cad: [0, 0], pieD: [1.5, 0.8], pieT: [-1.5, 0], manoD: [2, 1], manoT: [-2, 1], gesto: 'feliz' }, t: 8 },
  ]));
  out.push(clip('nadar', 'Nadar', 'Swim', 'deporte', true, [
    { p: n({ rot: 90, manoD: [0.5, -6.3], manoT: [0, 5.5], formaD: 'palma', pieD: [0.5, 0.6], pieT: [-0.5, -0.3] }), t: 7, dx: 1.5, dy: 2 },
    { p: n({ rot: 90, manoD: [2.5, -3], manoT: [-2, -2], formaD: 'palma', pieD: [0.5, -0.3], pieT: [-0.5, 0.6] }), t: 7, dx: 1.5, dy: 2, fx: { id: 'salpica', en: 'manoD' } },
    { p: n({ rot: 90, manoT: [0.5, -6.3], manoD: [0, 5.5], formaT: 'palma', pieD: [0.5, 0.6], pieT: [-0.5, -0.3] }), t: 7, dx: 1.5, dy: 2 },
    { p: n({ rot: 90, manoT: [2.5, -3], manoD: [-2, -2], formaT: 'palma', pieD: [0.5, -0.3], pieT: [-0.5, 0.6] }), t: 7, dx: 1.5, dy: 2, fx: { id: 'salpica', en: 'manoT' } },
  ]));
  out.push(clip('clavado', 'Clavado', 'Dive', 'deporte', false, [
    { p: n({ cad: [0, 2.5], incl: 20, manoD: [1, -6], manoT: [0.5, -6], formaD: 'palma', formaT: 'palma' }), t: 8 },
    { p: n({ rot: 30, manoD: [1, -6.3], manoT: [0.5, -6.3], formaD: 'palma', formaT: 'palma', pieD: [0.5, 0], pieT: [-0.5, 0] }), t: 6, dy: 10, dx: 3 },
    { p: n({ rot: 90, manoD: [1, -6.3], manoT: [0.5, -6.3], formaD: 'palma', formaT: 'palma', pieD: [0.5, 0], pieT: [-0.5, 0] }), t: 6, dy: 12, dx: 4 },
    { p: n({ rot: 150, manoD: [1, -6.3], manoT: [0.5, -6.3], formaD: 'palma', formaT: 'palma', pieD: [0.5, 0], pieT: [-0.5, 0] }), t: 6, dy: 4, dx: 3, fx: { id: 'salpica', en: 'manoD' } },
  ]));
  out.push(clip('lanzar', 'Lanzar la pelota', 'Throw ball', 'deporte', false, [
    { p: n({ manoD: [-3, -4], manoT: [3, 0], incl: -10, pieD: [3.5, 0], pieT: [-2.5, 0] }), t: 8 },
    { p: n({ manoD: [5, -2.5], manoT: [-1, 3], incl: 16, pieD: [4, 0], pieT: [-2, 1], formaD: 'palma', gesto: 'golpe' }), t: 4, sonido: 'lanzar', fx: { id: 'poder', en: 'manoD' } },
    { p: n({ manoD: [3, 4], manoT: [-1, 4], incl: 18, pieD: [4, 0], pieT: [-1, 2] }), t: 10 },
  ]));
  out.push(clip('batear', 'Batear', 'Bat swing', 'deporte', false, [
    { p: n({ cad: [0, 1], pieD: [3, 0], pieT: [-2.5, 0], manoD: [-0.5, 0], manoT: [-1, 0.5], util: -35, incl: -4 }), t: 20 },
    { p: n({ cad: [0, 1], pieD: [3.5, 0], pieT: [-2.5, 0], manoD: [-1.5, -0.5], manoT: [-2, 0], util: -60, incl: -8 }), t: 6 },
    { p: n({ cad: [0.5, 1.2], pieD: [4, 0], pieT: [-2.5, 0], manoD: [4, 2], manoT: [3.5, 2.5], util: 90, incl: 12, gesto: 'golpe' }), t: 4, golpe: 'util', sonido: 'batazo' },
    { p: n({ cad: [0.5, 1], pieD: [4, 0], pieT: [-2, 0.8], manoD: [1, -2], manoT: [0.5, -1.5], util: 210, incl: 6 }), t: 12 },
  ]));
  out.push(clip('raquetazo', 'Raquetazo', 'Racket swing', 'deporte', false, [
    { p: n({ manoD: [-3, 2], util: -60, incl: -6, pieD: [2.5, 0], pieT: [-2.5, 0] }), t: 8 },
    { p: n({ manoD: [5, 1], util: 80, incl: 12, pieD: [3, 0], pieT: [-2.5, 0], gesto: 'golpe' }), t: 4, golpe: 'util', sonido: 'raquetazo' },
    { p: n({ manoD: [2, -3], util: 160, incl: 8, pieD: [3, 0], pieT: [-2, 0.5] }), t: 10 },
  ]));
  out.push(clip('dominadas', 'Dominadas', 'Keepie-uppie', 'deporte', true, [
    { p: n({ pieD: [2.5, 3.5, 10], manoD: [2, 3], manoT: [-2, 3] }), t: 8, golpe: 'pieD', sonido: 'toque' },
    { p: n({ manoD: [1.5, 4], manoT: [-1.5, 4] }), t: 8 },
    { p: n({ pieT: [2.5, 3.5, 10], manoD: [2, 3], manoT: [-2, 3] }), t: 8, golpe: 'pieT', sonido: 'toque' },
    { p: n({ manoD: [1.5, 4], manoT: [-1.5, 4] }), t: 8 },
  ]));
  out.push(clip('sprint', 'Sprint de pista', 'Track sprint', 'deporte', true, [
    { p: n({ incl: 20, pieD: [4.5, 2], pieT: [-4.5, 2], manoD: [-3, 2], manoT: [3.5, -1] }), t: 4, dx: 4, dy: 2 },
    { p: n({ incl: 20, cad: [0, 1], pieD: [1.5, 0], pieT: [-2, 4.5], manoD: [-1, 4], manoT: [2, 2] }), t: 4, dx: 4 },
    { p: n({ incl: 20, pieD: [-1, 0], pieT: [2.5, 4.5], manoD: [1.5, 3], manoT: [0, 4] }), t: 4, dx: 4 },
    { p: n({ incl: 20, pieT: [4.5, 2], pieD: [-4.5, 2], manoT: [-3, 2], manoD: [3.5, -1] }), t: 4, dx: 4, dy: 2 },
    { p: n({ incl: 20, cad: [0, 1], pieT: [1.5, 0], pieD: [-2, 4.5], manoT: [-1, 4], manoD: [2, 2] }), t: 4, dx: 4 },
    { p: n({ incl: 20, pieT: [-1, 0], pieD: [2.5, 4.5], manoT: [1.5, 3], manoD: [0, 4] }), t: 4, dx: 4 },
  ]));
  out.push(clip('salida', 'Salida agachada', 'Sprint start', 'deporte', false, [
    { p: n({ cad: [0, 5], incl: 70, pieD: [2, 0], pieT: [-3, 0], manoD: [2.5, 6], manoT: [2, 6], formaD: 'palma', formaT: 'palma' }), t: 30 },
    { p: n({ cad: [0, 3], incl: 45, pieD: [2.5, 0], pieT: [-2, 2], manoD: [-2, 4], manoT: [3, 1] }), t: 6, dx: 3 },
  ]));
  out.push(clip('meta', 'Llegar a la meta', 'Finish line', 'deporte', false, [
    { p: n({ incl: -12, manoD: [3, -5], manoT: [-2, -5], formaD: 'palma', formaT: 'palma', gesto: 'feliz', pieD: [2, 0], pieT: [-2, 1] }), t: 40, dx: 1 },
  ]));
  out.push(clip('ataja', 'Atajar arriba', 'High catch', 'deporte', false, [
    { p: n({ cad: [0, 2], manoD: [2, 0], manoT: [1, 0.5], formaD: 'abierta', formaT: 'abierta' }), t: 5 },
    { p: n({ manoD: [1, -6.5], manoT: [0, -6.5], formaD: 'palma', formaT: 'palma', pieD: [1, 1], pieT: [-1, 1.5], gesto: 'esfuerzo' }), t: 10, dy: 8, golpe: 'manoD' },
    { p: n({ manoD: [3, 1], manoT: [2.5, 1.5], formaD: 'agarra', gesto: 'feliz' }), t: 12 },
  ]));
  return out;
}

let cache: Clip[] | null = null;
/** Todas las animaciones del humano. */
export function clipsHumano(): Clip[] {
  // la pelea sale toda del video (calcada); lo demás, del motor por piezas con la cabeza y el cuerpo del video
  if (!cache) {
    const video = clipsVideo();
    const ids = new Set(video.map((c) => c.id));
    cache = [...video, ...[...beat(), ...arriba(), ...deporte()].filter((c) => !ids.has(c.id))];
  }
  return cache;
}
export function clipHumano(id: string): Clip {
  const c = clipsHumano().find((x) => x.id === id);
  if (!c) throw new Error(`No hay animación "${id}"`);
  return c;
}
/** Ticks totales de un clip. */
export const duracion = (c: Clip) => c.cuadros.reduce((s, q) => s + q.t, 0);
