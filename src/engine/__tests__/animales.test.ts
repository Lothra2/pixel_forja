import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildCustomKit } from '../kit/custom';
import { renderClip, runQA, viewsForRows, migrateFicha, validateFicha, createRaster, blit, encodePng, decodePng, type Ficha, type CellSize } from '../index';
import { motionOf8 } from '../export/motion';
import { ROOT } from './helpers';

const FICHAS = join(ROOT, 'docs', 'ejemplos', 'nekketsu', 'fichas');
const raw = (id: string) => JSON.parse(readFileSync(join(FICHAS, `${id}.ficha.json`), 'utf8'));
const ficha = (id: string) => migrateFicha(raw(id)) as Ficha;
const FIVE = ['right', 'down_right', 'up_right', 'down', 'up'];
/** Lo que pide el lote C7 para los perros de la calle y los gatos de los techos (con pounce y wake del lote C7c). */
const PLAN: Record<string, string[]> = {
  perro_calle_1: ['idle', 'walk', 'run', 'bark', 'sleep', 'scratch', 'pounce', 'wake'],
  perro_calle_2: ['idle', 'walk', 'run', 'bark', 'sleep', 'scratch', 'pounce', 'wake'],
  perro_calle_3: ['idle', 'walk', 'run', 'bark', 'sleep', 'scratch', 'pounce', 'wake'],
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

describe('el perro que embiste y despierta, y el muro medido (lote C7c)', () => {
  it('pounce: se agacha, despega, pega con las patas en el aire y aterriza', () => {
    const c = renderClip(ficha('perro_calle_1'), 48, 'pounce', 'side', {});
    expect(c.loop).toBe(false);
    expect(c.frames).toHaveLength(8);
    const ev = motionOf8([c]).eventos!.map((e) => `${e.tipo}:${e.cuadro}`);
    expect(ev).toEqual(['despegue:2', 'impacto:4', 'aterriza:6']);
    // entre el despegue y el aterrizaje va en el aire; antes y después, pisando
    expect(c.airborne.map((a) => (a ? 1 : 0))).toEqual([0, 0, 0, 1, 1, 1, 0, 0]);
    // en el aire el dibujo se despega del piso: la fila de las patas queda vacía
    const abajo = (fr: { w: number; h: number; data: Uint8ClampedArray | Uint8Array }) => { let y1 = -1; for (let y = 0; y < fr.h; y++) for (let x = 0; x < fr.w; x++) if (fr.data[(y * fr.w + x) * 4 + 3]) y1 = Math.max(y1, y); return y1; };
    for (const i of [3, 4, 5]) expect(abajo(c.frames[i]), `cuadro ${i}`).toBeLessThan(abajo(c.frames[0]));
    expect(igual(c.frames[4], c.frames[3])).toBe(false);
  });

  it('wake: arranca igual que el último cuadro de sleep y termina de pie', () => {
    const f = ficha('perro_calle_2');
    const w = renderClip(f, 48, 'wake', 'side', {}), z = renderClip(f, 48, 'sleep', 'side', {});
    expect(w.loop).toBe(false);
    expect(igual(w.frames[0], z.frames[z.frames.length - 1])).toBe(true);
    const alto = (fr: { w: number; h: number; data: Uint8ClampedArray | Uint8Array }) => { let y0 = fr.h; for (let y = 0; y < fr.h; y++) for (let x = 0; x < fr.w; x++) if (fr.data[(y * fr.w + x) * 4 + 3]) y0 = Math.min(y0, y); return fr.h - y0; };
    const parado = alto(renderClip(f, 48, 'idle', 'side', {}).frames[0]);
    expect(alto(w.frames[0])).toBeLessThan(parado * 0.75);
    expect(Math.abs(alto(w.frames[w.frames.length - 1]) - parado)).toBeLessThanOrEqual(1);
  });

  it('jump_wall medido: subida de 0 a 1 que llega a 1 cuando las patas tocan arriba, con muro_min y muro_max', () => {
    for (const id of ['gato_1', 'gato_2']) for (const cell of [32, 48, 64] as CellSize[]) {
      const m = motionOf8([renderClip(ficha(id), cell, 'jump_wall', 'side', {})]);
      const sub = m.subida!, el = m.elevacion!, toca = m.eventos!.find((e) => e.tipo === 'aterriza')!.cuadro;
      expect(sub, `${id} ${cell}`).toHaveLength(el.length);
      expect(sub[0]).toBe(0);
      for (let i = 1; i < sub.length; i++) expect(sub[i]).toBeGreaterThanOrEqual(sub[i - 1]);
      // exactamente 1 en el cuadro donde las patas tocan arriba, y se queda en 1
      expect(sub.indexOf(1), `${id} ${cell}`).toBe(toca);
      for (let i = toca; i < sub.length; i++) expect(sub[i]).toBe(1);
      // elevacion sigue en pixeles: es la subida por el alto que se dibujó
      const alto = Math.max(...el);
      for (let i = 0; i < sub.length; i++) expect(Math.abs(sub[i] * alto - el[i])).toBeLessThanOrEqual(0.02 * alto);
      expect(m.muro_min!).toBeLessThan(alto);
      expect(m.muro_max!).toBeGreaterThan(alto);
    }
    // los saltos que no son a un muro no traen subida
    expect(motionOf8([renderClip(ficha('perro_calle_1'), 48, 'pounce', 'side', {})]).subida).toBeUndefined();
  });

  it('en el kit: pounce y wake en el atlas de los perros, y jump_wall con subida, muro_min y muro_max', () => {
    const fichas = Object.fromEntries(['perro_calle_1', 'gato_1'].map((id) => [id, raw(id)]));
    const { files } = buildCustomKit({ juego: 'Prueba', personajes_incluidos: ['familia'], filas: FIVE, packs: { base: ['idle'] }, animales: ['perro_calle_1', 'gato_1'] }, { fichas }, { quick: true, solo: ['animales'] });
    const m = JSON.parse(new TextDecoder().decode(files.find((x) => x.name === 'manifest.json')!.bytes));
    expect(m.animales.perro_calle_1.anims.pounce.eventos.map((e: { tipo: string }) => e.tipo)).toEqual(['despegue', 'impacto', 'aterriza']);
    expect(m.animales.perro_calle_1.anims.wake).toMatchObject({ loop: false });
    expect(m.animales.gato_1.anims.jump_wall).toMatchObject({ subida: expect.any(Array), muro_min: expect.any(Number), muro_max: expect.any(Number), elevacion: expect.any(Array) });
  });
});
