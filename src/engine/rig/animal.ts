import type { CellSize, Species } from '../sheet/ficha';

/**
 * Esqueleto de cuatro patas, de lado, mirando a la derecha. Cada especie es una plantilla de datos:
 * sumar una criatura nueva (dragón, tiburón con patas) es sumar una plantilla y, si hace falta, una pieza.
 */
export interface SpeciesTemplate {
  /** medidas a 48 px; se escalan con el tamaño */
  bodyLen: number;
  chest: number;
  waist: number;
  legUpper: number;
  legLower: number;
  legT: number;
  neckLen: number;
  head: { size: number; muzzleLen: number; muzzleH: number };
  ear: 'fold' | 'up' | 'flop' | 'round';
  tail: { len: number; t: number; style: 'stub' | 'long' | 'fluffy' | 'thin' };
  /** máscara oscura en el hocico (boxer) o antifaz (mapache) */
  mask: 'muzzle' | 'eyes' | 'none';
}

export const SPECIES_T: Record<Species, SpeciesTemplate> = {
  boxer: { bodyLen: 19, chest: 11, waist: 7, legUpper: 5, legLower: 5, legT: 3, neckLen: 4, head: { size: 10, muzzleLen: 3, muzzleH: 6 }, ear: 'fold', tail: { len: 3, t: 3, style: 'stub' }, mask: 'muzzle' },
  perro: { bodyLen: 19, chest: 9, waist: 7, legUpper: 4, legLower: 5, legT: 3, neckLen: 4, head: { size: 9, muzzleLen: 5, muzzleH: 4 }, ear: 'flop', tail: { len: 9, t: 2, style: 'long' }, mask: 'none' },
  mapache: { bodyLen: 17, chest: 10, waist: 9, legUpper: 3, legLower: 3, legT: 3, neckLen: 2, head: { size: 10, muzzleLen: 4, muzzleH: 3 }, ear: 'round', tail: { len: 10, t: 4, style: 'fluffy' }, mask: 'eyes' },
  gato: { bodyLen: 16, chest: 8, waist: 6, legUpper: 4, legLower: 4, legT: 2, neckLen: 3, head: { size: 9, muzzleLen: 2, muzzleH: 3 }, ear: 'up', tail: { len: 12, t: 2, style: 'thin' }, mask: 'none' },
};

export interface AnimalDims extends SpeciesTemplate {
  cell: CellSize;
  u: number;
  groundY: number;
}

/**
 * Medidas a este tamaño. premium: lomo más corto y patas más largas (un bóxer es cuadrado y atlético; con el lomo
 * largo y las patas cortas se ve como un salchicha y las patas casi no se leen al correr).
 */
export function animalDims(species: Species, cell: CellSize, size = 1, premium = false): AnimalDims {
  const t0 = SPECIES_T[species];
  const t: SpeciesTemplate = premium
    ? { ...t0, bodyLen: t0.bodyLen * 0.84, chest: t0.chest * 0.95, legUpper: t0.legUpper * 1.25, legLower: t0.legLower * 1.2, neckLen: t0.neckLen * 1.1 }
    : t0;
  const u = (cell / 48) * size;
  const r = (v: number, min = 1) => Math.max(min, Math.round(v * u));
  return {
    ...t,
    cell, u, groundY: cell - 2,
    bodyLen: r(t.bodyLen, 8), chest: r(t.chest, 4), waist: r(t.waist, 3),
    legUpper: r(t.legUpper), legLower: r(t.legLower), legT: Math.max(2, Math.round(t.legT * Math.min(1, u * 1.05))),
    neckLen: r(t.neckLen), head: { size: r(t.head.size, 5), muzzleLen: r(t.head.muzzleLen), muzzleH: r(t.head.muzzleH, 2) },
    tail: { ...t.tail, len: r(t.tail.len), t: Math.max(1, Math.round(t.tail.t * Math.min(1, u))) },
  };
}

export interface QFoot { x: number; y: number }

export interface QPose {
  x: number;
  /** inclinación del cuerpo: + baja el frente (reverencia), - lo sube (sentado) */
  pitch: number;
  legs: { fn: QFoot; ff: QFoot; rn: QFoot; rf: QFoot };
  head: { angle: number; dx: number; dy: number };
  mouth: 'closed' | 'open' | 'tongue';
  eyes: 'open' | 'closed' | 'happy';
  /** ángulo de la cola: 0 horizontal hacia atrás, + hacia arriba */
  tail: number;
  air: number;
  /** pelota en la boca */
  ball?: boolean;
  /** moneda en la boca (recoger botín) */
  coin?: boolean;
}

export function standQ(d: AnimalDims): QPose {
  const L = d.legUpper + d.legLower;
  return {
    x: 0, pitch: 0,
    legs: { fn: { x: 0.5, y: L - 0.3 }, ff: { x: -0.5, y: L - 0.3 }, rn: { x: 0.5, y: L - 0.3 }, rf: { x: -0.5, y: L - 0.3 } },
    head: { angle: 0, dx: 0, dy: 0 },
    mouth: 'closed', eyes: 'open', tail: 25, air: 0,
  };
}
