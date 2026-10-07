import type { CellSize, Proportions } from '../sheet/ficha';

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
  /** cuánto se mueven pies y brazos: escala de los ciclos */
  u: number;
}

const BASE: Record<CellSize, Omit<Dims, 'cell' | 'groundY' | 'pivot' | 'u'>> = {
  32: { headW: 14, torsoW: 7, torsoH: 6, pantsRows: 2, legUpper: 3, legLower: 2, legT: 2, hipSpread: 3, armUpper: 3, armLower: 2, armT: 2, hand: 2, footLen: 3, footH: 1 },
  48: { headW: 20, torsoW: 10, torsoH: 9, pantsRows: 3, legUpper: 4, legLower: 4, legT: 3, hipSpread: 4, armUpper: 4, armLower: 3, armT: 2, hand: 3, footLen: 4, footH: 2 },
  64: { headW: 26, torsoW: 13, torsoH: 12, pantsRows: 4, legUpper: 6, legLower: 5, legT: 4, hipSpread: 5, armUpper: 5, armLower: 4, armT: 3, hand: 4, footLen: 6, footH: 3 },
};

export function dimsFor(cell: CellSize, p: Proportions): Dims {
  const b = BASE[cell];
  const r = (v: number, k: number, min = 1) => Math.max(min, Math.round(v * k));
  return {
    ...b,
    cell,
    groundY: cell - 2,
    pivot: [cell / 2, cell - 2],
    u: cell / 48,
    headW: r(b.headW, p.head, 8),
    torsoW: r(b.torsoW, p.build * p.shoulders, 4),
    torsoH: r(b.torsoH, p.height, 4),
    legUpper: r(b.legUpper, p.legs * p.height),
    legLower: r(b.legLower, p.legs * p.height),
    hipSpread: r(b.hipSpread, p.hips),
    armUpper: r(b.armUpper, p.arms),
    armLower: r(b.armLower, p.arms),
  };
}
