import type { CellSize, Proportions, PresetName } from '../sheet/ficha';

/**
 * Medidas del cuerpo en pixeles para cada tamaño de cuadro. No es una escala ciega:
 * a 32 px los grosores se fijan a mano porque 2.67 px no existe.
 */
export interface Dims {
  cell: CellSize;
  groundY: number;
  pivot: [number, number];
  headW: number;
  torsoW: number;
  torsoH: number;
  pantsRows: number;
  legUpper: number;
  legLower: number;
  legT: number;
  hipSpread: number;
  armUpper: number;
  armLower: number;
  armT: number;
  hand: number;
  footLen: number;
  footH: number;
  /** escala general (1 a 48 px) para movimientos */
  u: number;
}

type Base = Omit<Dims, 'cell' | 'groundY' | 'pivot' | 'u'>;

const PRESETS: Record<PresetName, Record<CellSize, Base>> = {
  // cabezón: la cabeza es casi la mitad de la altura
  chibi: {
    32: { headW: 14, torsoW: 7, torsoH: 6, pantsRows: 2, legUpper: 3, legLower: 2, legT: 2, hipSpread: 3, armUpper: 3, armLower: 2, armT: 2, hand: 2, footLen: 3, footH: 1 },
    48: { headW: 20, torsoW: 10, torsoH: 9, pantsRows: 3, legUpper: 4, legLower: 4, legT: 3, hipSpread: 4, armUpper: 4, armLower: 3, armT: 2, hand: 3, footLen: 4, footH: 2 },
    64: { headW: 26, torsoW: 13, torsoH: 12, pantsRows: 4, legUpper: 6, legLower: 5, legT: 4, hipSpread: 5, armUpper: 5, armLower: 4, armT: 3, hand: 4, footLen: 6, footH: 3 },
  },
  // cabeza de un cuarto de la altura, piernas más largas
  juvenil: {
    32: { headW: 11, torsoW: 6, torsoH: 7, pantsRows: 2, legUpper: 4, legLower: 4, legT: 2, hipSpread: 3, armUpper: 4, armLower: 3, armT: 2, hand: 2, footLen: 3, footH: 1 },
    48: { headW: 15, torsoW: 9, torsoH: 11, pantsRows: 3, legUpper: 6, legLower: 6, legT: 3, hipSpread: 4, armUpper: 5, armLower: 5, armT: 2, hand: 3, footLen: 4, footH: 2 },
    64: { headW: 20, torsoW: 12, torsoH: 14, pantsRows: 4, legUpper: 8, legLower: 8, legT: 4, hipSpread: 5, armUpper: 7, armLower: 6, armT: 3, hand: 4, footLen: 6, footH: 2 },
  },
  // cabeza de un sexto de la altura
  realista: {
    32: { headW: 8, torsoW: 6, torsoH: 8, pantsRows: 2, legUpper: 5, legLower: 5, legT: 2, hipSpread: 3, armUpper: 4, armLower: 4, armT: 2, hand: 2, footLen: 3, footH: 1 },
    48: { headW: 11, torsoW: 9, torsoH: 13, pantsRows: 3, legUpper: 8, legLower: 8, legT: 3, hipSpread: 4, armUpper: 7, armLower: 6, armT: 2, hand: 2, footLen: 4, footH: 2 },
    64: { headW: 15, torsoW: 12, torsoH: 17, pantsRows: 4, legUpper: 11, legLower: 10, legT: 4, hipSpread: 5, armUpper: 9, armLower: 8, armT: 3, hand: 3, footLen: 6, footH: 2 },
  },
};

export function dimsFor(cell: CellSize, p: Proportions): Dims {
  const b = PRESETS[p.preset ?? 'chibi'][cell];
  const r = (v: number, k: number, min = 1) => Math.max(min, Math.round(v * k));
  return {
    ...b,
    cell,
    groundY: cell - 2,
    pivot: [cell / 2, cell - 2],
    u: cell / 48,
    headW: r(b.headW, p.head, 7),
    torsoW: r(b.torsoW, p.build * p.shoulders, 4),
    torsoH: r(b.torsoH, p.height, 4),
    legUpper: r(b.legUpper, p.legs * p.height),
    legLower: r(b.legLower, p.legs * p.height),
    legT: r(b.legT, Math.sqrt(p.build), 2),
    hipSpread: r(b.hipSpread, p.hips),
    armUpper: r(b.armUpper, p.arms),
    armLower: r(b.armLower, p.arms),
  };
}

/** Altura de la cabeza en pixeles que espera cada tamaño de sello (ojos y boca). */
export type StampClass = 32 | 48 | 64;
export function stampClass(headW: number): StampClass {
  return headW >= 24 ? 64 : headW >= 17 ? 48 : 32;
}

// ---------- cuerpos por edad y contextura (para el creador de avatar) ----------

export type BodyAge = 'nino' | 'adolescente' | 'adulto' | 'mayor';
export type BodyBuild = 'delgado' | 'medio' | 'robusto';
export type BodyShape = 'recto' | 'curvas';
export interface BodyType { age: BodyAge; build: BodyBuild; shape: BodyShape }
export const DEFAULT_BODY: BodyType = { age: 'adulto', build: 'medio', shape: 'recto' };

type Mult = Partial<Omit<Proportions, 'preset'>>;
const AGE: Record<BodyAge, Mult> = {
  nino: { height: 0.75, legs: 0.82, arms: 0.85, shoulders: 0.85, hips: 0.9, build: 0.9, head: 1.05 },
  adolescente: { height: 0.9, legs: 0.95, arms: 0.95, shoulders: 0.92, build: 0.92 },
  adulto: {},
  mayor: { height: 0.96, shoulders: 0.95, build: 1.05 },
};
const BUILD: Record<BodyBuild, Mult> = {
  delgado: { build: 0.85, shoulders: 0.95, hips: 0.95 },
  medio: {},
  robusto: { build: 1.22, shoulders: 1.08, hips: 1.08 },
};
const SHAPE: Record<BodyShape, Mult> = { recto: {}, curvas: { hips: 1.14, shoulders: 0.94 } };

/** Proporciones de un tipo de cuerpo, dentro de los límites de los controles finos. */
export function bodyProportions(preset: PresetName, b: BodyType): Proportions {
  const keys = ['height', 'build', 'legs', 'arms', 'head', 'shoulders', 'hips'] as const;
  const out = { preset } as Proportions;
  for (const k of keys) {
    const v = (AGE[b.age][k] ?? 1) * (BUILD[b.build][k] ?? 1) * (SHAPE[b.shape][k] ?? 1);
    out[k] = k === 'head' ? Math.max(0.85, Math.min(1.15, v)) : Math.max(0.75, Math.min(1.35, v));
  }
  return out;
}
