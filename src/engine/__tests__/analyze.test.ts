import { describe, it, expect } from 'vitest';
import { loadSample, sampleFicha } from './helpers';
import { analyzeImage, maskBBox, ZONE_ID, createRaster, fill, makeWorkImage, removeBackground } from '../index';

describe('fondo', () => {
  it('quita un fondo liso aunque el personaje toque el borde de abajo', () => {
    const r = createRaster(40, 40);
    fill(r, [200, 230, 250, 255]);
    for (let y = 10; y < 40; y++) for (let x = 15; x < 25; x++) r.data.set([200, 30, 30, 255], (y * 40 + x) * 4);
    const w = makeWorkImage(r);
    const m = removeBackground(w, { tolerance: 0.06 });
    expect(m[0]).toBe(0);
    expect(m[39 * 40 + 20]).toBe(1);
    expect(m[20 * 40 + 20]).toBe(1);
  });

  it('el pincel corrige el fondo', () => {
    const r = createRaster(20, 20);
    fill(r, [255, 255, 255, 255]);
    const m = removeBackground(makeWorkImage(r), { tolerance: 0.06, strokes: [{ x: 10, y: 10, r: 2, mode: 'fg' }] });
    expect(m[10 * 20 + 10]).toBe(1);
  });
});

describe('zonas en las imágenes de prueba', () => {
  const at = (name: string) => {
    const img = loadSample(name);
    const a = analyzeImage(img, {});
    const s = a.work.raster.w / img.w;
    return { a, z: (px: number, py: number) => a.zone[Math.round(py * s) * a.work.raster.w + Math.round(px * s)] };
  };

  it('Gabo: camisa roja arriba, medias rojas abajo, pelo negro y guayos negros separados', () => {
    const { z } = at('gabo');
    expect(z(200, 400)).toBe(ZONE_ID.top);
    expect(z(176, 680)).toBe(ZONE_ID.socks);
    expect(z(200, 130)).toBe(ZONE_ID.hair);
    expect(z(170, 748)).toBe(ZONE_ID.shoes);
    expect(z(200, 300)).not.toBe(ZONE_ID.hair);
  });

  it('Sofi: cabeza hasta la barbilla y ojos en su sitio', () => {
    const { a } = at('sofi');
    const s = 640 / 800;
    const { box, eyes } = a.zones.head;
    expect(box.y + box.h).toBeGreaterThan(320 * s);
    expect(box.y + box.h).toBeLessThan(360 * s);
    expect(Math.abs(eyes[0].x - 160 * s)).toBeLessThan(8);
    expect(Math.abs(eyes[1].x - 240 * s)).toBeLessThan(8);
  });

  it('Papá (proporción realista, fondo transparente): la cabeza no se come el torso', () => {
    const { a } = at('papa');
    const s = 640 / 900;
    expect(a.zones.head.box.y + a.zones.head.box.h).toBeLessThan(200 * s);
    const bb = maskBBox(a.mask, a.work.raster.w, a.work.raster.h);
    expect(bb.y1 - bb.y0).toBeGreaterThan(500);
  });

  it('detecta ropa y lentes', () => {
    expect(sampleFicha('gabo').outfit).toEqual({ sleeves: 'short', bottom: 'shorts', socks: 'knee' });
    expect(sampleFicha('papa').outfit).toMatchObject({ sleeves: 'long', bottom: 'pants' });
    expect(sampleFicha('papa').face.glasses).toBeTruthy();
    expect(sampleFicha('sofi').face.glasses).toBeNull();
  });
});
