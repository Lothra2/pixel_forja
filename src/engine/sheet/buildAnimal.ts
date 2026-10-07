import type { Raster } from '../core/raster';
import { makeWorkImage, labAt } from '../analyze/work';
import { removeBackground, type BrushStroke } from '../analyze/background';
import { kmeans } from '../color/kmeans';
import { type Lab, labToHex, labToLch, deltaE } from '../color/oklab';
import { makeRamp } from '../color/ramp';
import { type AnimalFicha, type Species, FICHA_FORMAT, FICHA_VERSION } from './ficha';

export interface AnimalInput {
  name: string;
  species: Species;
  bgTolerance?: number;
  bgStrokes?: BrushStroke[];
}

/**
 * Ficha de animal desde una imagen: de la foto o dibujo se sacan los colores (pelaje, manchas claras,
 * máscara oscura, collar). La forma sale de la plantilla de la especie: de lado, en pixel art, por código.
 */
export function buildAnimalFicha(image: Raster, input: AnimalInput): { ficha: AnimalFicha; report: { colors: number } } {
  const work = makeWorkImage(image);
  const mask = removeBackground(work, { tolerance: input.bgTolerance ?? 0.06, strokes: input.bgStrokes });
  const pts: Lab[] = [];
  for (let i = 0; i < work.raster.w * work.raster.h; i++) if (mask[i]) pts.push(labAt(work, i));
  const km = kmeans(pts, 7, 3);
  const total = pts.length || 1;
  const cl = km.centers.map((c, i) => ({ c, n: km.counts[i], lch: labToLch(c) })).filter((x) => x.n > total * 0.01);
  // línea del dibujo: muy oscura y gris
  const solid = cl.filter((x) => !(x.lch[0] < 0.25 && x.lch[1] < 0.04));
  const sorted = [...solid].sort((p, q) => q.n - p.n);
  const fur = sorted[0] ?? { c: [0.55, 0.06, 0.08] as Lab, n: 1, lch: [0.55, 0.1, 1] as Lab };
  // collar: lo más saturado, chico, con tono distinto al pelaje
  const hueDist = (a: Lab, b: Lab) => { let d = Math.abs(a[2] - b[2]); if (d > Math.PI) d = 2 * Math.PI - d; return d; };
  const collar = solid
    .filter((x) => x !== fur && x.lch[1] > 0.09 && x.n < total * 0.2 && hueDist(x.lch, fur.lch) > 0.8)
    .sort((p, q) => q.lch[1] - p.lch[1])[0];
  const light = solid.filter((x) => x !== fur && x !== collar && x.lch[0] > Math.max(0.75, fur.lch[0] + 0.15) && x.n > total * 0.025).sort((p, q) => q.n - p.n)[0];
  const darkC = solid.filter((x) => x !== fur && x !== collar && x.lch[0] < fur.lch[0] - 0.15 && x.n > total * 0.015).sort((p, q) => q.n - p.n)[0];
  const furHex = labToHex(fur.c);
  const fur2Hex = light ? labToHex(light.c) : labToHex([Math.min(0.95, fur.c[0] + 0.25), fur.c[1] * 0.4, fur.c[2] * 0.4]);
  const darkHex = darkC ? labToHex(darkC.c) : labToHex([Math.max(0.15, fur.c[0] - 0.3), fur.c[1] * 0.6, fur.c[2] * 0.6]);
  void deltaE;
  const ficha: AnimalFicha = {
    format: FICHA_FORMAT,
    version: FICHA_VERSION,
    name: input.name,
    body: { skeleton: 'quadruped', species: input.species, size: 1 },
    palette: {
      fur: makeRamp(furHex),
      fur2: makeRamp(fur2Hex),
      dark: makeRamp(darkHex),
      eyes: '#3a2414',
      collar: collar ? makeRamp(labToHex(collar.c)) : null,
    },
    markings: { chest: !!light, paws: !!light, mask: !!darkC },
  };
  return { ficha, report: { colors: solid.length } };
}
