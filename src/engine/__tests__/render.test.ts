import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, SAMPLES, sampleFicha, thorFicha } from './helpers';
import {
  renderClip, runQA, packSheet, encodePng, decodePng, CELL_SIZES, validateFicha, migrateFicha, solveLeg, toFfgg, FFGG_ANIMS,
  HUMAN_ANIMS, ANIMAL_ANIMS, renderPlan, FFGG_PLAN, rotSprite, uniqueColors, type Ficha, type ViewName, type CellSize,
} from '../index';

const errorsOf = (f: Ficha, cell: CellSize, name: string, view: ViewName = 'side') => {
  const qa = runQA(f, renderClip(f, cell, name, view));
  return qa.items.filter((i) => i.severity === 'error').map((i) => `${name}@${cell}/${view}: ${i.check} ${i.value} ${i.where ?? ''}`);
};

describe('IK y RotSprite', () => {
  it('la rodilla dobla hacia adelante y el tobillo llega al objetivo', () => {
    const { knee, ankle } = solveLeg(4, 4, { x: 1, y: 7 });
    expect(knee[0]).toBeGreaterThan(0);
    expect(ankle).toEqual([1, 7]);
  });
  it('RotSprite rota sin inventar colores', () => {
    const idx = new Int16Array([0, 1, 1, 2, 0, 1, 1, 2, -1, 3, 3, -1]);
    const r = rotSprite({ w: 4, h: 3, idx }, 90, 2, 1.5);
    expect(r.img.w).toBeGreaterThanOrEqual(3);
    const used = new Set(r.img.idx);
    for (const v of used) expect([-1, 0, 1, 2, 3]).toContain(v);
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
    for (const n of SAMPLES) expect(validateFicha(JSON.parse(JSON.stringify(sampleFicha(n))))).toEqual([]);
    expect(validateFicha(JSON.parse(JSON.stringify(thorFicha())))).toEqual([]);
  });

  it('una ficha v1 se migra a v2 y se dibuja igual', () => {
    const f = sampleFicha('sofi');
    const v1 = { ...structuredClone(f), version: 1, heads: Object.fromEntries(Object.entries(f.heads).map(([k, s]) => [k, s!.front])) };
    expect(validateFicha(v1)).toEqual([]);
    const m = migrateFicha(v1);
    const a = renderClip(m, 48, 'idle').frames[0], b = renderClip(f, 48, 'idle').frames[0];
    expect(Buffer.from(a.data).equals(Buffer.from(b.data))).toBe(true);
  });

  it('el pelo de la cabeza usa varios tonos (25 a 30 colores en total, como el piloto)', () => {
    const counts = SAMPLES.map((n) => uniqueColors(renderClip(sampleFicha(n), 48, 'walk').frames));
    expect(Math.max(...counts)).toBeGreaterThanOrEqual(18);
  });
});

describe('control de calidad de todas las animaciones', () => {
  for (const n of SAMPLES)
    it(`${n}: todas las animaciones humanas a 48 px, de lado`, () => {
      const f = sampleFicha(n);
      expect(HUMAN_ANIMS.flatMap((a) => errorsOf(f, 48, a.name))).toEqual([]);
    });
  for (const cell of [32, 64] as CellSize[])
    it(`gabo y sofi: preajuste del juego a ${cell} px`, () => {
      for (const n of ['gabo', 'sofi']) expect(FFGG_ANIMS.flatMap((a) => errorsOf(sampleFicha(n), cell, a))).toEqual([]);
    });
  for (const preset of ['juvenil', 'realista'] as const)
    it(`preajuste ${preset}: básicas y fútbol en los 3 tamaños`, () => {
      const f = sampleFicha('papa', preset);
      for (const cell of CELL_SIZES) expect(FFGG_ANIMS.flatMap((a) => errorsOf(f, cell, a))).toEqual([]);
    });
  it('RPG en 4 direcciones (frente, espalda, lado y espejo)', () => {
    const f = sampleFicha('sofi');
    const rpg = HUMAN_ANIMS.filter((a) => a.pack === 'rpg' || a.name === 'walk' || a.name === 'idle');
    for (const v of ['front', 'back', 'side', 'left'] as ViewName[]) expect(rpg.flatMap((a) => errorsOf(f, 48, a.name, v))).toEqual([]);
  });
  it('Thor: todas las animaciones de animal en los 3 tamaños', () => {
    const f = thorFicha();
    for (const cell of CELL_SIZES) expect(ANIMAL_ANIMS.flatMap((a) => errorsOf(f, cell, a.name))).toEqual([]);
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
  const golden = (name: string, f: Ficha, anims: string[]) => {
    const { clips } = renderPlan(f, { ...FFGG_PLAN, anims });
    const { png } = packSheet(clips, 'x.png');
    const file = join(ROOT, 'golden', `${name}.png`);
    if (process.env.UPDATE_GOLDEN || !existsSync(file)) { writeFileSync(file, encodePng(png)); return; }
    const gold = decodePng(readFileSync(file));
    const same = gold.w === png.w && gold.h === png.h && Buffer.from(gold.data).equals(Buffer.from(png.data));
    if (!same) {
      mkdirSync(join(ROOT, 'out'), { recursive: true });
      writeFileSync(join(ROOT, 'out', `golden_actual_${name}.png`), encodePng(png));
    }
    expect(same, `cambió ${name}; mira out/golden_actual_${name}.png`).toBe(true);
  };
  for (const n of SAMPLES) it(`${n}: preajuste del juego a 48 px`, () => golden(`${n}_ffgg_48`, sampleFicha(n), [...FFGG_ANIMS]));
  it('thor a 48 px', () => golden('thor_48', thorFicha(), ANIMAL_ANIMS.map((a) => a.name)));
});

describe('preajuste Fútbol Familia GG', () => {
  it('las 33 animaciones, celda 48, apoyo [24, 46], sin balón', () => {
    const f = sampleFicha('gabo');
    const { clips } = renderPlan(f, FFGG_PLAN);
    const { json } = packSheet(clips, 'g.png');
    const { json: ff, missing } = toFfgg(json);
    expect(missing).toEqual([]);
    expect(Object.keys(ff.anims)).toHaveLength(33);
    expect(ff.cell).toEqual([48, 48]);
    expect(ff.pivot).toEqual([24, 46]);
    expect(ff.anims.idle).toEqual({ start: 0, frames: 8, fps: 6, loop: true });
    for (const a of Object.values(ff.anims)) expect(a.start % 8).toBe(0);
  });
});
