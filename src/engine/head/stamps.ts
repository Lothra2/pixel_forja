import type { EyeStyle } from '../sheet/ficha';
import type { StampClass } from '../rig/dims';

/**
 * Librería de sellos de pixel art hechos a mano. A tamaño chico la cara no se reduce, se diseña.
 * Claves: o = oscuro del ojo, i = iris, w = brillo, m = línea de boca, r = interior de boca,
 * b = rubor, h = ceja, g = marco de lentes. '.' no pinta.
 * El juego de sellos depende del ancho de la cabeza (ver stampClass), no del tamaño del cuadro.
 */
export type Stamp = string[];

export type EyeExpr = 'open' | 'closed' | 'happy' | 'sad' | 'angry' | 'wide' | 'hurt';
export type MouthExpr = 'smile' | 'line' | 'open' | 'frown' | 'grin' | 'o';

export const EYE_EXPRS: EyeExpr[] = ['open', 'closed', 'happy', 'sad', 'angry', 'wide', 'hurt'];
export const MOUTH_EXPRS: MouthExpr[] = ['smile', 'line', 'open', 'frown', 'grin', 'o'];

type EyeSet = Record<EyeStyle, Stamp> & Record<Exclude<EyeExpr, 'open'>, Stamp>;

/** Todos los ojos de un juego miden lo mismo, así la cara no salta al cambiar de expresión. */
export const EYES: Record<StampClass, EyeSet> = {
  32: {
    round: ['o', 'i'],
    big: ['o', 'o'],
    small: ['.', 'o'],
    closed: ['.', 'o'],
    happy: ['o', '.'],
    sad: ['.', 'o'],
    angry: ['o', 'i'],
    wide: ['o', 'o'],
    hurt: ['.', 'o'],
  },
  48: {
    round: ['ow', 'oo', 'ii'],
    big: ['ow', 'oo', 'oi'],
    small: ['..', 'o.', 'o.'],
    closed: ['..', '..', 'oo'],
    happy: ['..', 'oo', 'o.'],
    sad: ['o.', 'oo', 'ii'],
    angry: ['.o', 'ow', 'ii'],
    wide: ['oo', 'ow', 'oo'],
    hurt: ['o.', '.o', 'o.'],
  },
  64: {
    round: ['.oo', 'oow', 'ooo', 'ii.'],
    big: ['ooo', 'oow', 'ooi', 'iii'],
    small: ['...', 'oo.', 'ow.', 'ii.'],
    closed: ['...', '...', 'ooo', '...'],
    happy: ['...', '.o.', 'o.o', '...'],
    sad: ['o..', 'ooo', 'oow', '.ii'],
    angry: ['..o', '.oo', 'oow', 'iii'],
    wide: ['ooo', 'oww', 'ooo', 'iii'],
    hurt: ['o..', '.o.', 'o..', '...'],
  },
};

export const MOUTHS: Record<StampClass, Record<MouthExpr, Stamp>> = {
  32: { smile: ['mm'], line: ['m'], open: ['r'], frown: ['mm'], grin: ['rr'], o: ['r'] },
  48: { smile: ['m..m', '.mm.'], line: ['mm'], open: ['mmm', '.r.'], frown: ['.mm.', 'm..m'], grin: ['mmmm', '.rr.'], o: ['mm', 'rr'] },
  64: { smile: ['m...m', '.mmm.'], line: ['mmm'], open: ['mmmm', '.rr.'], frown: ['.mmm.', 'm...m'], grin: ['mmmmm', '.rrr.'], o: ['.m.', 'mrm', '.m.'] },
};

export const BLUSH: Record<StampClass, Stamp> = { 32: ['b'], 48: ['bb'], 64: ['bb'] };
export const BROW: Record<StampClass, Stamp> = { 32: ['h'], 48: ['hh'], 64: ['hhh'] };
/** cejas gruesas (detectadas en la foto): más anchas y, a 64, de dos filas */
export const BROW_THICK: Record<StampClass, Stamp> = { 32: ['hh'], 48: ['hhh'], 64: ['hhhh', '.hhh'] };
/** cejas inclinadas para bravo y triste (ojo izquierdo; el derecho se espeja) */
export const BROW_ANGRY: Record<StampClass, Stamp> = { 32: ['h'], 48: ['h.', '.h'], 64: ['h..', '.hh'] };
export const BROW_SAD: Record<StampClass, Stamp> = { 32: ['h'], 48: ['.h', 'h.'], 64: ['..h', 'hh.'] };

export function stampOrigin(cx: number, cy: number, s: Stamp): [number, number] {
  return [Math.round(cx - (s[0].length - 1) / 2), Math.round(cy - (s.length - 1) / 2)];
}

export function mirrorStamp(s: Stamp): Stamp {
  return s.map((r) => [...r].reverse().join(''));
}
