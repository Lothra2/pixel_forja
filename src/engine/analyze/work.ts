import { type Raster, downscaleForAnalysis } from '../core/raster';
import { rgbToLab } from '../color/oklab';

/** Imagen de trabajo: la entrada reducida a un tamaño fijo, con su OKLab precalculado. */
export interface WorkImage {
  raster: Raster;
  lab: Float32Array; // L,a,b por pixel
  /** factor desde la imagen original a la de trabajo */
  scale: number;
}

export const WORK_MAX_SIDE = 640;

export function makeWorkImage(input: Raster, maxSide = WORK_MAX_SIDE): WorkImage {
  const { raster, scale } = downscaleForAnalysis(input, maxSide);
  const lab = new Float32Array(raster.w * raster.h * 3);
  const cache = new Map<number, [number, number, number]>();
  for (let i = 0; i < raster.w * raster.h; i++) {
    const r = raster.data[i * 4], g = raster.data[i * 4 + 1], b = raster.data[i * 4 + 2];
    const key = (r << 16) | (g << 8) | b;
    let v = cache.get(key);
    if (!v) { v = rgbToLab(r, g, b); cache.set(key, v); }
    lab[i * 3] = v[0]; lab[i * 3 + 1] = v[1]; lab[i * 3 + 2] = v[2];
  }
  return { raster, lab, scale };
}

export function labAt(w: WorkImage, i: number): [number, number, number] {
  return [w.lab[i * 3], w.lab[i * 3 + 1], w.lab[i * 3 + 2]];
}
