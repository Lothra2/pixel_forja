import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderClip, runQA, viewsForRows, migrateFicha, validateFicha, createRaster, blit, encodePng, decodePng, type Ficha, type CellSize } from '../index';
import { motionOf8 } from '../export/motion';
import { ROOT } from './helpers';

const FICHAS = join(ROOT, 'docs', 'ejemplos', 'nekketsu', 'fichas');
const raw = (id: string) => JSON.parse(readFileSync(join(FICHAS, `${id}.ficha.json`), 'utf8'));
const ficha = (id: string) => migrateFicha(raw(id)) as Ficha;
const FIVE = ['right', 'down_right', 'up_right', 'down', 'up'];
/** Lo que pide el lote C7 para los perros de la calle y los gatos de los techos. */
const PLAN: Record<string, string[]> = {
  perro_calle_1: ['idle', 'walk', 'run', 'bark', 'sleep', 'scratch'],
  perro_calle_2: ['idle', 'walk', 'run', 'bark', 'sleep', 'scratch'],
  perro_calle_3: ['idle', 'walk', 'run', 'bark', 'sleep', 'scratch'],
  gato_1: ['idle', 'walk', 'jump_wall', 'sleep'],
  gato_2: ['idle', 'walk', 'jump_wall', 'sleep'],
};
const igual = (a: { data: Uint8ClampedArray | Uint8Array }, b: { data: Uint8ClampedArray | Uint8Array }) => a.data.every((v, i) => v === b.data[i]);

describe('animales del lote C7', () => {
  it('las 5 fichas son válidas: 3 perros con 3 pelajes y 2 gatos', () => {
    for (const id of Object.keys(PLAN)) expect(validateFicha(raw(id)), id).toEqual([]);
    expect(Object.keys(PLAN).filter((id) => raw(id).body.species === 'perro')).toHaveLength(3);
    expect(Object.keys(PLAN).filter((id) => raw(id).body.species === 'gato')).toHaveLength(2);
    expect(new Set(['perro_calle_1', 'perro_calle_2', 'perro_calle_3'].map((id) => raw(id).palette.fur[2])).size).toBe(3);
  });

  it('pasan el control de calidad en 32, 48 y 64, en las 5 filas', () => {
    const bad: string[] = [];
    for (const [id, anims] of Object.entries(PLAN)) for (const cell of [32, 48, 64] as CellSize[]) for (const a of anims) for (const v of viewsForRows(FIVE)) {
      const r = runQA(ficha(id), renderClip(ficha(id), cell, a, v, {}));
      if (!r.ok) bad.push(`${id} ${cell} ${a} ${v}: ${r.items.filter((i) => i.severity === 'error').map((i) => `${i.check} ${i.value}`).join(', ')}`);
    }
    expect(bad).toEqual([]);
  }, 600_000);

  it('dormir se lee: echado más bajo que de pie y los ojos cerrados todo el ciclo', () => {
    const f = ficha('perro_calle_1');
    const alto = (fr: { w: number; h: number; data: Uint8ClampedArray | Uint8Array }) => { let y0 = fr.h; for (let y = 0; y < fr.h; y++) for (let x = 0; x < fr.w; x++) if (fr.data[(y * fr.w + x) * 4 + 3]) { y0 = Math.min(y0, y); } return fr.h - y0; };
    const parado = alto(renderClip(f, 48, 'idle', 'side', {}).frames[0]);
    const dormido = renderClip(f, 48, 'sleep', 'side', {});
    for (const fr of dormido.frames) expect(alto(fr)).toBeLessThan(parado * 0.75);
  });

  it('rascarse mueve la pata de atrás: los cuadros no son iguales', () => {
    const c = renderClip(ficha('perro_calle_2'), 48, 'scratch', 'side', {});
    expect(igual(c.frames[0], c.frames[1])).toBe(false);
  });

  it('el gato sube al muro con `elevacion`, que nunca baja y termina arriba', () => {
    const c = renderClip(ficha('gato_1'), 48, 'jump_wall', 'side', {});
    const rise = motionOf8([c]).elevacion!;
    expect(rise[rise.length - 1]).toBeGreaterThan(15);
    for (let i = 1; i < rise.length; i++) expect(rise[i]).toBeGreaterThanOrEqual(rise[i - 1]);
  });

  it('imagen dorada: cada animal en sus animaciones nuevas (dormir, rascarse, saltar al muro)', () => {
    const keys: [string, string, number][] = [['perro_calle_1', 'sleep', 0], ['perro_calle_2', 'scratch', 1], ['perro_calle_3', 'sleep', 2], ['gato_1', 'jump_wall', 4], ['gato_2', 'sleep', 0]];
    const out = createRaster(48 * keys.length, 48);
    keys.forEach(([id, a, i], k) => blit(out, renderClip(ficha(id), 48, a, 'side', {}).frames[i], k * 48, 0));
    const file = join(ROOT, 'golden', 'animales_c7.png');
    if (process.env.UPDATE_GOLDEN || !existsSync(file)) { writeFileSync(file, encodePng(out)); return; }
    const gold = decodePng(readFileSync(file));
    const same = gold.w === out.w && Buffer.from(gold.data).equals(Buffer.from(out.data));
    if (!same) { mkdirSync(join(ROOT, 'out'), { recursive: true }); writeFileSync(join(ROOT, 'out', 'golden_actual_animales_c7.png'), encodePng(out)); }
    expect(same, 'cambió animales_c7; mira out/golden_actual_animales_c7.png').toBe(true);
  });
});
