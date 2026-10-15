import { describe, it, expect } from 'vitest';
import { EFFECTS, EFFECT_NAMES, renderEffect, expandEffects } from '../fx/catalog';
import type { Raster } from '../index';

const def = EFFECTS.find((e) => e.id === 'rayo_cielo')!;
const { w, h, frames } = renderEffect(def);
const lleno = (r: Raster, x: number, y: number) => r.data[(y * r.w + x) * 4 + 3] > 0;
/** La fila más baja con algo pintado. */
const fondo = (r: Raster) => { for (let y = r.h - 1; y >= 0; y--) for (let x = 0; x < r.w; x++) if (lleno(r, x, y)) return y; return -1; };
const arriba = (r: Raster) => Array.from({ length: r.w }, (_, x) => x).some((x) => lleno(r, x, 0));

describe('el rayo que baja del cielo (rayo_cielo)', () => {
  it('está en el catálogo de técnicas, de 48 x 256, con el ancla abajo en el medio', () => {
    expect(EFFECT_NAMES).toContain('rayo_cielo');
    expect(expandEffects(['tecnica']).map((e) => e.id)).toContain('rayo_cielo');
    expect([w, h, frames.length, def.fps, def.loop]).toEqual([48, 256, 8, 16, false]);
    expect(def.ancla).toEqual([24, 255]);
  });

  it('la guía baja del cielo en el 0 y el 1 sin llegar, y del 2 al 7 llega al punto del ancla', () => {
    for (const k of [0, 1]) { expect(arriba(frames[k]), `${k}`).toBe(true); expect(fondo(frames[k]), `${k}`).toBeLessThan(h * 0.8); }
    expect(fondo(frames[0])).toBeLessThan(fondo(frames[1]));
    for (let k = 2; k < 8; k++) {
      expect(arriba(frames[k]), `${k}`).toBe(true);
      expect(fondo(frames[k]), `${k}`).toBeGreaterThanOrEqual(h - 3);
      expect(lleno(frames[k], 24, h - 3), `${k}`).toBe(true);
    }
  });

  it('el golpe del 2 es el más gordo, y del 3 al 6 parpadea con dos caminos', () => {
    const n = (r: Raster) => { let c = 0; for (let i = 3; i < r.data.length; i += 4) if (r.data[i]) c++; return c; };
    for (let k = 3; k < 8; k++) expect(n(frames[2]), `${k}`).toBeGreaterThan(n(frames[k]));
    const igual = (a: Raster, b: Raster) => Buffer.from(a.data).equals(Buffer.from(b.data));
    expect(igual(frames[3], frames[4])).toBe(false);
    expect(igual(frames[3], frames[5])).toBe(false);
  });
});
