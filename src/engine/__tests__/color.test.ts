import { describe, it, expect } from 'vitest';
import { rgbToLab, labToRgb, hexToLab, deltaE, makeRamp, kmeans, type Lab } from '../index';

describe('color', () => {
  it('OKLab ida y vuelta conserva el color', () => {
    for (const c of [[0, 0, 0], [255, 255, 255], [216, 35, 42], [63, 143, 90], [17, 99, 200]] as const) {
      const [L, a, b] = rgbToLab(c[0], c[1], c[2]);
      expect(labToRgb(L, a, b)).toEqual([...c]);
    }
  });

  it('la rampa va de oscuro a claro y el contorno es el más oscuro', () => {
    for (const base of ['#d8232a', '#f2f2f2', '#17171c', '#f1c7a5', '#3f8f5a']) {
      const r = makeRamp(base).map((h) => hexToLab(h)[0]);
      expect(r[0]).toBeLessThan(r[1]);
      expect(r[1]).toBeLessThan(r[2]);
      expect(r[2]).toBeLessThanOrEqual(r[3]);
    }
  });

  it('la sombra de un rojo no se vuelve marrón: gira hacia frío', () => {
    const [, shadow, base] = makeRamp('#d8232a').map(hexToLab);
    const hue = (l: Lab) => Math.atan2(l[2], l[1]);
    expect(hue(shadow)).toBeLessThan(hue(base));
  });

  it('k-means es determinista', () => {
    const pts: Lab[] = Array.from({ length: 500 }, (_, i) => [((i * 37) % 100) / 100, ((i * 13) % 50) / 500 - 0.05, ((i * 7) % 30) / 300]);
    const a = kmeans(pts, 5, 3), b = kmeans(pts, 5, 3);
    expect(a.centers).toEqual(b.centers);
    expect(Array.from(a.assign)).toEqual(Array.from(b.assign));
    expect(deltaE(a.centers[0], b.centers[0])).toBe(0);
  });
});
