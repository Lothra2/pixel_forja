import { describe, it, expect } from 'vitest';
import { GifReader } from 'omggif';
import { unzipSync, unzlibSync } from 'fflate';
import { sampleFicha, thorFicha } from './helpers';
import { renderClip, encodeGif, packSheet, encodePng, decodePng, exportFiles, renderPlan, type ExportPlan } from '../index';

const plan: ExportPlan = { cell: 32, anims: ['idle', 'walk', 'shot'], views: ['side'], props: true };
const text = (b: Uint8Array) => new TextDecoder().decode(b);

describe('exportadores', () => {
  it('hoja PNG + JSON tipo Phaser: abre y trae los mismos pixeles', () => {
    const f = sampleFicha('sofi');
    const { clips } = renderPlan(f, plan);
    const { png, json } = packSheet(clips, 's.png');
    const back = decodePng(encodePng(png));
    expect(back.w).toBe(json.meta.size.w);
    expect(Buffer.from(back.data).equals(Buffer.from(png.data))).toBe(true);
    expect(json.frames.walk_0.frame).toEqual({ x: 0, y: 32, w: 32, h: 32 });
    expect(json.animations.walk).toHaveLength(8);
  });

  it('GIF: abre, 8 cuadros, tamaño ampliado y colores exactos', () => {
    const clip = renderClip(sampleFicha('gabo'), 48, 'walk');
    const g = new GifReader(Buffer.from(encodeGif(clip.frames, clip.fps, { scale: 3, background: [10, 20, 30] })));
    expect(g.numFrames()).toBe(8);
    expect(g.width).toBe(144);
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

  it('Aseprite: cabecera, un cuadro por cuadro, etiquetas por animación y cuadros que descomprimen', () => {
    const files = exportFiles(sampleFicha('gabo'), 'aseprite', plan);
    const ase = files.find((x) => x.name.endsWith('.aseprite'))!.bytes;
    const dv = new DataView(ase.buffer, ase.byteOffset, ase.byteLength);
    expect(dv.getUint32(0, true)).toBe(ase.length);
    expect(dv.getUint16(4, true)).toBe(0xa5e0);
    const nFrames = dv.getUint16(6, true);
    expect(nFrames).toBe(8 + 8 + 8);
    expect(dv.getUint16(8, true)).toBe(32);
    let off = 128, tags: string[] = [], cels = 0;
    for (let fi = 0; fi < nFrames; fi++) {
      const size = dv.getUint32(off, true);
      expect(dv.getUint16(off + 4, true)).toBe(0xf1fa);
      const n = dv.getUint32(off + 12, true);
      let c = off + 16;
      for (let k = 0; k < n; k++) {
        const cs = dv.getUint32(c, true), type = dv.getUint16(c + 4, true);
        if (type === 0x2018) {
          const count = dv.getUint16(c + 6, true);
          let t = c + 6 + 2 + 8;
          for (let j = 0; j < count; j++) {
            t += 2 + 2 + 1 + 2 + 6 + 3 + 1;
            const len = dv.getUint16(t, true);
            tags.push(text(ase.slice(t + 2, t + 2 + len)));
            t += 2 + len;
          }
        }
        if (type === 0x2005) {
          cels++;
          const w = dv.getUint16(c + 6 + 16, true), h = dv.getUint16(c + 6 + 18, true);
          const raw = unzlibSync(ase.slice(c + 6 + 20, c + cs));
          expect(raw.length).toBe(w * h * 4);
        }
        c += cs;
      }
      off += size;
    }
    expect(off).toBe(ase.length);
    expect(tags).toEqual(['idle', 'walk', 'shot']);
    expect(cels).toBe(nFrames);
    const json = JSON.parse(text(files.find((x) => x.name.endsWith('.aseprite.json'))!.bytes));
    expect(json.meta.frameTags.map((t: { name: string }) => t.name)).toEqual(['idle', 'walk', 'shot']);
  });

  it('Godot 4: SpriteFrames con un AtlasTexture por cuadro y una animación por nombre', () => {
    const files = exportFiles(sampleFicha('gabo'), 'godot', plan);
    const tres = text(files.find((x) => x.name.endsWith('.tres'))!.bytes);
    expect(tres.startsWith('[gd_resource type="SpriteFrames"')).toBe(true);
    expect(tres.match(/\[sub_resource type="AtlasTexture"/g)).toHaveLength(24);
    expect(tres).toContain('"name": &"walk"');
    expect(tres).toContain('region = Rect2(0, 32, 32, 32)');
  });

  it('Unity: .meta en modo múltiple con un recorte por cuadro, y contado desde abajo', () => {
    const files = exportFiles(sampleFicha('gabo'), 'unity', plan);
    const meta = text(files.find((x) => x.name.endsWith('.png.meta'))!.bytes);
    expect(meta).toContain('spriteMode: 2');
    expect(meta).toContain('filterMode: 0');
    expect(meta.match(/      name: /g)).toHaveLength(24);
    // la primera fila (idle) en Unity queda arriba: y = alto - 32
    expect(meta).toMatch(/name: idle_0\n\s+rect:\n\s+serializedVersion: 2\n\s+x: 0\n\s+y: 64/);
  });

  it('zip de cuadros: un PNG por cuadro en una carpeta por animación', () => {
    const z = unzipSync(exportFiles(sampleFicha('gabo'), 'frames', plan)[0].bytes);
    expect(Object.keys(z)).toHaveLength(24);
    expect(decodePng(z['walk/walk_03.png']).w).toBe(32);
  });

  it('paquete del personaje: la ficha en JSON', () => {
    const f = thorFicha();
    const back = JSON.parse(text(exportFiles(f, 'ficha', plan)[0].bytes));
    expect(back).toEqual(JSON.parse(JSON.stringify(f)));
  });

  it('si el control de calidad falla, no exporta y dice qué falló', () => {
    const f = sampleFicha('gabo');
    const bad = { ...f, body: { ...f.body, proportions: { ...f.body.proportions, height: 2.5, legs: 2 } } };
    expect(() => exportFiles(bad, 'sheet', { cell: 32, anims: ['idle'], views: ['side'], props: false })).toThrow(/Control de calidad/);
  });
});
