import { rng } from '../core/rng';
import type { Proportions, PresetName, EyeStyle, MouthStyle, HumanFicha } from './ficha';

export interface Variant {
  proportions: Proportions;
  face: Partial<HumanFicha['face']>;
}

/**
 * "Sorpréndeme": variaciones de proporciones y estilo, deterministas por semilla.
 * keepHead = la ficha no tiene imagen de origen, así que no se puede cambiar el tamaño de la cabeza.
 */
export function surprise(seed: number, n: number, base: Proportions, keepHead = false): Variant[] {
  const r = rng(seed);
  const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)];
  const range = (lo: number, hi: number) => Math.round((lo + r() * (hi - lo)) * 100) / 100;
  const out: Variant[] = [];
  for (let i = 0; i < n; i++) {
    const preset: PresetName = keepHead ? base.preset : i === 0 ? base.preset : pick(['chibi', 'chibi', 'juvenil', 'realista']);
    out.push({
      proportions: {
        preset,
        height: range(0.9, 1.1),
        build: range(0.85, 1.25),
        legs: range(0.85, 1.2),
        arms: range(0.9, 1.15),
        head: keepHead ? base.head : range(0.92, 1.08),
        shoulders: range(0.9, 1.15),
        hips: range(0.85, 1.2),
      },
      face: { eyes: pick<EyeStyle>(['round', 'big', 'small']), mouth: pick<MouthStyle>(['smile', 'smile', 'line', 'open']), blush: r() > 0.3, brows: r() > 0.6 },
    });
  }
  return out;
}
