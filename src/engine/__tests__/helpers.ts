import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { decodePng, buildFicha, buildAnimalFicha, DEFAULT_PROPORTIONS, type HumanFicha, type AnimalFicha, type Raster, type PresetName } from '../index';

export const ROOT = join(import.meta.dirname, '..', '..', '..');
/** Imágenes de prueba: la familia y el fútbol (sintéticas, dibujadas en SVG). */
export const SAMPLES = ['sofi', 'gabo', 'papa', 'mama', 'nena', 'portero'] as const;

const cache = new Map<string, HumanFicha>();
export function loadSample(name: string): Raster {
  return decodePng(readFileSync(join(ROOT, 'samples', `${name}.png`)));
}
export function sampleFicha(name: string, preset: PresetName = 'chibi'): HumanFicha {
  const key = `${name}:${preset}`;
  let f = cache.get(key);
  if (!f) {
    f = buildFicha(loadSample(name), { name, proportions: { ...DEFAULT_PROPORTIONS, preset } }).ficha;
    cache.set(key, f);
  }
  return f;
}
let thor: AnimalFicha | null = null;
export function thorFicha(): AnimalFicha {
  thor ??= buildAnimalFicha(loadSample('thor'), { name: 'thor', species: 'boxer' }).ficha;
  return thor;
}
