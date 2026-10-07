import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, SAMPLES, sampleFicha } from './helpers';
import {
  renderClip, ANIM_NAMES, runQA, packSheet, encodePng, decodePng, CELL_SIZES, validateFicha, solveLeg, toFfgg, FFGG_ANIMS,
} from '../index';

describe('IK', () => {
  it('la rodilla dobla hacia adelante y el tobillo llega al objetivo', () => {
    const { knee, ankle } = solveLeg(4, 4, { x: 1, y: 7 });
    expect(knee[0]).toBeGreaterThan(0);
    expect(ankle).toEqual([1, 7]);
  });
});

describe('render', () => {
  it('la misma ficha da exactamente los mismos pixeles', () => {
    const f = sampleFicha('gabo');
    const a = renderClip(f, 48, 'walk').frames[3];
    const b = renderClip(structuredClone(f), 48, 'walk').frames[3];
    expect(Buffer.from(a.data).equals(Buffer.from(b.data))).toBe(true);
  });

  it('la ficha generada es válida y sobrevive a JSON', () => {
    for (const n of SAMPLES) {
      const f = JSON.parse(JSON.stringify(sampleFicha(n)));
      expect(validateFicha(f)).toEqual([]);
    }
  });

  for (const n of SAMPLES)
    for (const cell of CELL_SIZES)
      it(`control de calidad sin errores: ${n} ${cell}px`, () => {
        const f = sampleFicha(n);
        for (const a of ANIM_NAMES) {
          const qa = runQA(f, renderClip(f, cell, a));
          const errs = qa.items.filter((i) => i.severity === 'error');
          expect(errs, JSON.stringify(errs)).toEqual([]);
        }
      });

  it('el control de calidad detecta un pixel suelto', () => {
    const f = sampleFicha('sofi');
    const clip = renderClip(f, 48, 'idle');
    clip.frames[0].data.set([255, 0, 0, 255], (2 * 48 + 2) * 4);
    const qa = runQA(f, clip);
    expect(qa.ok).toBe(false);
    expect(qa.items.find((i) => i.check === 'orphans')!.where).toContain('(2, 2)');
  });
});

/**
 * Imágenes doradas: si un cambio altera un personaje que ya estaba bien, esta prueba falla.
 * Para aceptar el cambio a propósito: UPDATE_GOLDEN=1 npx vitest run
 */
describe('imágenes doradas', () => {
  for (const n of SAMPLES)
    it(`hoja de ${n} a 48 px`, () => {
      const f = sampleFicha(n);
      const { png } = packSheet(ANIM_NAMES.map((a) => renderClip(f, 48, a)), 'x.png');
      const file = join(ROOT, 'golden', `${n}_48.png`);
      if (process.env.UPDATE_GOLDEN || !existsSync(file)) {
        writeFileSync(file, encodePng(png));
        return;
      }
      const gold = decodePng(readFileSync(file));
      const same = gold.w === png.w && gold.h === png.h && Buffer.from(gold.data).equals(Buffer.from(png.data));
      if (!same) {
        mkdirSync(join(ROOT, 'out'), { recursive: true });
        writeFileSync(join(ROOT, 'out', `golden_actual_${n}_48.png`), encodePng(png));
      }
      expect(same, `cambió la hoja de ${n}; mira out/golden_actual_${n}_48.png`).toBe(true);
    });
});

describe('preajuste Fútbol Familia GG', () => {
  it('celda 48, apoyo [24, 46] y animaciones con start, frames, fps, loop', () => {
    const f = sampleFicha('gabo');
    const { json } = packSheet(ANIM_NAMES.map((a) => renderClip(f, 48, a)), 'g.png');
    const { json: ff, missing } = toFfgg(json);
    expect(ff.cell).toEqual([48, 48]);
    expect(ff.pivot).toEqual([24, 46]);
    expect(ff.anims.idle).toEqual({ start: 0, frames: 8, fps: 6, loop: true });
    expect(ff.anims.walk.start).toBe(8);
    expect(missing.length + Object.keys(ff.anims).length).toBe(FFGG_ANIMS.length);
  });
});
