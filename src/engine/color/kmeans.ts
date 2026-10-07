import { type Lab, deltaE } from './oklab';
import { rng } from '../core/rng';

export interface KMeansResult {
  centers: Lab[];
  /** índice de centro para cada punto de entrada */
  assign: Int32Array;
  counts: number[];
}

/** k-means en OKLab con arranque k-means++ y semilla fija: siempre el mismo resultado. */
export function kmeans(points: Lab[], k: number, seed = 1, iters = 25): KMeansResult {
  const n = points.length;
  if (n === 0) return { centers: [], assign: new Int32Array(0), counts: [] };
  k = Math.min(k, n);
  const rand = rng(seed);
  // muestra para inicializar rápido en imágenes grandes
  const sampleIdx: number[] = [];
  const step = Math.max(1, Math.floor(n / 4000));
  for (let i = 0; i < n; i += step) sampleIdx.push(i);
  const centers: Lab[] = [points[sampleIdx[Math.floor(rand() * sampleIdx.length)]].slice() as Lab];
  const d2 = new Float64Array(sampleIdx.length).fill(Infinity);
  while (centers.length < k) {
    const c = centers[centers.length - 1];
    let sum = 0;
    for (let j = 0; j < sampleIdx.length; j++) {
      const d = deltaE(points[sampleIdx[j]], c) ** 2;
      if (d < d2[j]) d2[j] = d;
      sum += d2[j];
    }
    if (sum === 0) break;
    let r = rand() * sum;
    let pick = 0;
    for (let j = 0; j < sampleIdx.length; j++) {
      r -= d2[j];
      if (r <= 0) { pick = j; break; }
    }
    centers.push(points[sampleIdx[pick]].slice() as Lab);
  }
  const assign = new Int32Array(n);
  const kk = centers.length;
  for (let it = 0; it < iters; it++) {
    let changed = 0;
    for (let i = 0; i < n; i++) {
      let best = 0, bd = Infinity;
      for (let c = 0; c < kk; c++) {
        const d = deltaE(points[i], centers[c]);
        if (d < bd) { bd = d; best = c; }
      }
      if (assign[i] !== best || it === 0) { changed++; assign[i] = best; }
    }
    const sums = Array.from({ length: kk }, () => [0, 0, 0, 0]);
    for (let i = 0; i < n; i++) {
      const s = sums[assign[i]];
      s[0] += points[i][0]; s[1] += points[i][1]; s[2] += points[i][2]; s[3]++;
    }
    for (let c = 0; c < kk; c++)
      if (sums[c][3] > 0) centers[c] = [sums[c][0] / sums[c][3], sums[c][1] / sums[c][3], sums[c][2] / sums[c][3]];
    if (changed === 0 && it > 0) break;
  }
  const counts = new Array(kk).fill(0);
  for (let i = 0; i < n; i++) counts[assign[i]]++;
  return { centers, assign, counts };
}
