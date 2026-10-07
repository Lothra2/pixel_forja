import { describe, it, expect } from 'vitest';
import { GifReader } from 'omggif';
import { sampleFicha } from './helpers';
import { renderClip, encodeGif, packSheet, encodePng, decodePng, ANIM_NAMES } from '../index';

describe('exportadores', () => {
  it('el PNG de la hoja abre y trae los mismos pixeles', () => {
    const f = sampleFicha('sofi');
    const { png, json } = packSheet(ANIM_NAMES.map((a) => renderClip(f, 32, a)), 's.png');
    const back = decodePng(encodePng(png));
    expect(back.w).toBe(json.meta.size.w);
    expect(Buffer.from(back.data).equals(Buffer.from(png.data))).toBe(true);
    // atlas estilo Phaser: cada cuadro con su recorte
    expect(Object.keys(json.frames)).toHaveLength(16);
    expect(json.frames.walk_0.frame).toEqual({ x: 0, y: 32, w: 32, h: 32 });
    expect(json.animations.walk).toHaveLength(8);
  });

  it('el GIF abre, tiene 8 cuadros, el tamaño ampliado y los colores exactos', () => {
    const f = sampleFicha('gabo');
    const clip = renderClip(f, 48, 'walk');
    const bytes = encodeGif(clip.frames, clip.fps, { scale: 3, background: [10, 20, 30] });
    const g = new GifReader(Buffer.from(bytes));
    expect(g.numFrames()).toBe(8);
    expect(g.width).toBe(144);
    expect(g.loopCount()).toBe(0);
    const px = new Uint8Array(g.width * g.height * 4);
    g.decodeAndBlitFrameRGBA(2, px);
    const src = clip.frames[2];
    for (let y = 0; y < 48; y += 5)
      for (let x = 0; x < 48; x += 3) {
        const i = (y * 48 + x) * 4, j = (y * 3 * 144 + x * 3) * 4;
        if (src.data[i + 3]) expect([px[j], px[j + 1], px[j + 2]]).toEqual([src.data[i], src.data[i + 1], src.data[i + 2]]);
        else expect([px[j], px[j + 1], px[j + 2]]).toEqual([10, 20, 30]);
      }
  });

  it('el GIF transparente también abre', () => {
    const f = sampleFicha('papa');
    const clip = renderClip(f, 32, 'idle');
    const g = new GifReader(Buffer.from(encodeGif(clip.frames, clip.fps)));
    expect(g.numFrames()).toBe(8);
    expect(g.frameInfo(0).transparent_index).toBe(0);
  });
});
