import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { migrateFicha, type HumanFicha } from '../index';
import type { Raster } from '../core/raster';
import { azotea, espaldas, bogota, lluvia, maracaibo, desayuno, desayunoMesa, DESAYUNO, AZOTEA } from '../ui/intro';
import { buildCustomKit, type KitConfig } from '../kit/custom';
import { ROOT } from './helpers';

const alpha = (r: Raster, x: number, y: number) => r.data[(y * r.w + x) * 4 + 3];
const igual = (a: Raster, b: Raster) => Buffer.from(a.data).equals(Buffer.from(b.data));
const opaca = (r: Raster) => { for (let q = 3; q < r.data.length; q += 4) if (r.data[q] !== 255) return false; return true; };
const llenos = (r: Raster) => { let n = 0; for (let q = 3; q < r.data.length; q += 4) if (r.data[q]) n++; return n; };
const KENJI = migrateFicha(JSON.parse(readFileSync(join(ROOT, 'docs', 'ejemplos', 'nekketsu', 'fichas', 'kenji.ficha.json'), 'utf8'))) as HumanFicha;

describe('las escenas de la intro', () => {
  it('los fondos miden 800 x 360 y no tienen huecos', () => {
    for (const p of [azotea(), bogota(), maracaibo(), desayuno()]) {
      expect([p.w, p.h], p.name).toEqual([800, 360]);
      for (const f of p.frames) {
        expect([f.w, f.h]).toEqual([800, 360]);
        expect(opaca(f), p.name).toBe(true);
      }
      expect(p.extra).toMatchObject({ margen: 80 });
    }
  });

  it('el atleta de espaldas: redibujado a 3, el gakuran ondea y los pies caen en el ancla', () => {
    const e = espaldas(KENJI);
    expect([e.name, e.frames.length, e.fps, e.loop]).toEqual(['intro_espaldas', 4, 6, true]);
    // un cuerpo de 64 redibujado a 3: más de 120 de alto
    expect(e.h).toBeGreaterThan(120);
    for (const f of e.frames) expect([f.w, f.h]).toEqual([e.w, e.h]);
    // los cuatro cuadros son distintos: la tela se mueve
    for (let i = 1; i < 4; i++) expect(igual(e.frames[0], e.frames[i])).toBe(false);
    const [ax, ay] = e.extra!.ancla as [number, number];
    expect(ay).toBeGreaterThan(e.h - 12);
    // el pie toca el ancla: hay pixeles en esa fila cerca de ella, y nada más abajo
    let pie = 0;
    for (let x = ax - 20; x <= ax + 20; x++) if (alpha(e.frames[0], x, ay)) pie++;
    expect(pie).toBeGreaterThan(6);
    for (let y = ay + 1; y < e.h; y++) for (let x = 0; x < e.w; x++) expect(alpha(e.frames[0], x, y)).toBe(0);
    // la tela vuela a la derecha del cuerpo
    for (const f of e.frames) { let der = 0; for (let y = 0; y < f.h; y++) for (let x = ax + 40; x < f.w; x++) if (alpha(f, x, y)) der++; expect(der).toBeGreaterThan(60); }
    // y el ancla de la azotea queda en el piso, en la parte de 640
    expect(AZOTEA.pie[0] > 80 && AZOTEA.pie[0] < 720 && AZOTEA.pie[1] > 250).toBe(true);
  });

  it('la lluvia de Bogotá: 4 cuadros transparentes en bucle, finos', () => {
    const l = lluvia();
    expect([l.name, l.frames.length, l.loop]).toEqual(['intro_bogota_lluvia', 4, true]);
    for (const f of l.frames) { const n = llenos(f); expect(n).toBeGreaterThan(800 * 360 * 0.01); expect(n).toBeLessThan(800 * 360 * 0.12); }
    expect(igual(l.frames[0], l.frames[1])).toBe(false);
  });

  it('Maracaibo: 4 cuadros donde reverberan el horizonte y la calle, y el cielo de arriba a la izquierda queda quieto', () => {
    const m = maracaibo();
    expect([m.frames.length, m.loop]).toEqual([4, true]);
    expect(igual(m.frames[0], m.frames[2])).toBe(false);
    const quieto = (f: Raster) => { const b: number[] = []; for (let y = 0; y < 40; y++) for (let x = 0; x < 400; x++) b.push(f.data[(y * 800 + x) * 4]); return b.join(','); };
    for (const f of m.frames) expect(quieto(f)).toBe(quieto(m.frames[0]));
  });

  it('el desayuno: 4 huecos de 96 en la parte de 640, la mesa les tapa los hombros y arriba es transparente', () => {
    const d = desayuno(), me = desayunoMesa();
    expect(DESAYUNO.huecos).toHaveLength(4);
    expect(d.extra!.huecos).toEqual(DESAYUNO.huecos);
    for (const [x, y, w, h] of DESAYUNO.huecos) {
      expect([w, h]).toEqual([96, 96]);
      expect(x >= 80 && x + w <= 720).toBe(true);
      // la mesa empieza antes del borde de abajo del retrato: le tapa los hombros
      expect(y + h - DESAYUNO.mesa).toBeGreaterThanOrEqual(8);
      // y deja la cara: arriba de la mesa, la capa de adelante es transparente
      for (const f of me.frames) for (let yy = y; yy < DESAYUNO.mesa - 24; yy++) for (let xx = x; xx < x + w; xx++) expect(alpha(f, xx, yy)).toBe(0);
    }
    expect([me.frames.length, me.loop]).toEqual([4, true]);
    expect(igual(me.frames[0], me.frames[1])).toBe(false);
    // la mesa tapa todo lo de abajo en el medio
    for (const f of me.frames) expect(alpha(f, 400, DESAYUNO.mesa + 30)).toBe(255);
  });

  it('en el kit a medida: la parte "intro", con y sin el atleta de espaldas', () => {
    const D = join(ROOT, 'node_modules', '@fontsource', 'silkscreen', 'files');
    const ab = (p: string) => { const b = readFileSync(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length) as ArrayBuffer; };
    const SILK = { regular: ab(join(D, 'silkscreen-latin-400-normal.woff')), bold: ab(join(D, 'silkscreen-latin-700-normal.woff')) };
    const base: KitConfig = { juego: 'Prueba', personajes_incluidos: ['familia'], packs: { base: ['idle'] }, ui: { interfaz: ['intro'], intro: { espaldas: 'rick' } } };
    const leer = (cfg: KitConfig) => { const { files } = buildCustomKit(cfg, { fuentes: SILK }, { quick: true, solo: ['interfaz'] }); return { files, m: JSON.parse(new TextDecoder().decode(files.find((f) => f.name === 'manifest.json')!.bytes)) }; };
    const { files, m } = leer(base);
    expect(Object.keys(m.ui.interfaz)).toEqual(['intro_azotea', 'intro_espaldas', 'intro_bogota', 'intro_bogota_lluvia', 'intro_maracaibo', 'intro_desayuno', 'intro_desayuno_mesa']);
    expect(m.ui.interfaz.intro_espaldas).toMatchObject({ cuadros: 4, fps: 6, loop: true });
    expect(m.ui.interfaz.intro_desayuno).toMatchObject({ w: 800, h: 360, huecos: DESAYUNO.huecos, mesa: DESAYUNO.mesa });
    for (const e of Object.values<{ archivo: string }>(m.ui.interfaz)) expect(files.some((f) => f.name === e.archivo), e.archivo).toBe(true);
    expect(Object.keys(leer({ ...base, ui: { interfaz: ['intro'] } }).m.ui.interfaz)).not.toContain('intro_espaldas');
    expect(() => leer({ ...base, ui: { interfaz: ['intro'], intro: { espaldas: 'rik' } } })).toThrowError(/ui\.intro\.espaldas.*"rik".*rick/);
  }, 120_000);
});
