import type { CellSize, EyeStyle, MouthStyle } from '../sheet/ficha';

/**
 * Librería de sellos de pixel art hechos a mano. A tamaño chico la cara no se reduce, se diseña.
 * Claves: o = oscuro del ojo, i = iris, w = brillo, m = línea de boca, r = interior de boca,
 * b = rubor, h = ceja. '.' no pinta.
 */
export type Stamp = string[];

type EyeSet = Record<EyeStyle | 'closed', Stamp>;

export const EYES: Record<CellSize, EyeSet> = {
  32: {
    round: ['o', 'i'],
    big: ['ow', 'oi'],
    small: ['o'],
    closed: ['.', 'o'],
  },
  48: {
    round: ['ow', 'oo', 'ii'],
    big: ['oow', 'ooo', 'iii'],
    small: ['o', 'o', 'i'],
    closed: ['..', '..', 'oo'],
  },
  64: {
    round: ['.oo', 'oow', 'ooo', 'ii.'],
    big: ['ooo', 'oow', 'ooi', 'iii'],
    small: ['oo', 'ow', 'ii', '..'],
    closed: ['...', '...', 'ooo', '...'],
  },
};

export const MOUTHS: Record<CellSize, Record<MouthStyle, Stamp>> = {
  32: { smile: ['mm'], line: ['m'], open: ['r'] },
  48: { smile: ['m..m', '.mm.'], line: ['mm'], open: ['mmm', '.r.'] },
  64: { smile: ['m...m', '.mmm.'], line: ['mmm'], open: ['mmmm', '.rr.'] },
};

export const BLUSH: Record<CellSize, Stamp> = { 32: ['b'], 48: ['bb'], 64: ['bb'] };
export const BROW: Record<CellSize, Stamp> = { 32: ['h'], 48: ['hh'], 64: ['hhh'] };

export function stampOrigin(cx: number, cy: number, s: Stamp): [number, number] {
  return [Math.round(cx - (s[0].length - 1) / 2), Math.round(cy - (s.length - 1) / 2)];
}
