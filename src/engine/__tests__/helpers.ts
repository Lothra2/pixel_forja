import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { decodePng, buildFicha, type Ficha, type Raster } from '../index';

export const ROOT = join(import.meta.dirname, '..', '..', '..');
export const SAMPLES = ['sofi', 'gabo', 'papa'] as const;

const cache = new Map<string, Ficha>();
export function loadSample(name: string): Raster {
  return decodePng(readFileSync(join(ROOT, 'samples', `${name}.png`)));
}
export function sampleFicha(name: string): Ficha {
  let f = cache.get(name);
  if (!f) {
    f = buildFicha(loadSample(name), { name }).ficha;
    cache.set(name, f);
  }
  return f;
}
