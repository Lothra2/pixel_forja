import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Raster } from '../core/raster';
import { medallas, cintas, cinta, TELA_CINTA, METALES } from '../ui/envoltorio';
import { buildCustomKit, type KitConfig } from '../kit/custom';
import { ROOT } from './helpers';

const alpha = (r: Raster, x: number, y: number) => r.data[(y * r.w + x) * 4 + 3];
const hex = (r: Raster, x: number, y: number) => { const i = (y * r.w + x) * 4; return '#' + [r.data[i], r.data[i + 1], r.data[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join(''); };
/** La caja de lo pintado: [x0, y0, x1, y1]. */
const caja = (r: Raster) => { let x0 = r.w, y0 = r.h, x1 = -1, y1 = -1; for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (alpha(r, x, y)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return [x0, y0, x1, y1]; };

describe('la cinta de participación del cuarto puesto', () => {
  it('cinta_16 y cinta_32: del tamaño de las medallas, con la misma huella y sin un solo color de metal', () => {
    const cs = cintas(), ms = medallas();
    expect(cs.map((c) => [c.name, c.w, c.h, c.frames.length])).toEqual([['cinta_16', 16, 16, 1], ['cinta_32', 32, 32, 1]]);
    for (const [i, s] of [16, 32].entries()) {
      const c = cs[i].frames[0], oro = ms[i].frames[0];
      expect([c.w, c.h]).toEqual([s, s]);
      // la misma huella que la medalla de oro: lo pintado ocupa casi la misma caja
      const [a, b] = [caja(c), caja(oro)];
      for (let k = 0; k < 4; k++) expect(Math.abs(a[k] - b[k]), `${s} borde ${k}`).toBeLessThanOrEqual(s === 16 ? 1 : 2);
      // de tela: ningún pixel es de los metales ni de la cinta roja, y la tela turquesa manda
      const metal = new Set<string>([...Object.values(METALES).flat(), '#7a1424', '#c8283c']);
      let tela = 0, n = 0;
      for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
        if (!alpha(c, x, y)) continue;
        n++;
        expect(metal.has(hex(c, x, y)), `${s} ${x},${y}`).toBe(false);
        if ((TELA_CINTA as readonly string[]).includes(hex(c, x, y))) tela++;
      }
      expect(tela / n).toBeGreaterThan(0.6);
      // opaca o transparente, sin mezcla
      for (let q = 3; q < c.data.length; q += 4) expect([0, 255]).toContain(c.data[q]);
      // siempre igual
      expect(Buffer.from(cinta(s).r.data).equals(Buffer.from(c.data))).toBe(true);
    }
  });

  it('sale en el kit con las medallas, sin tocar las medallas', () => {
    const D = join(ROOT, 'node_modules', '@fontsource', 'silkscreen', 'files');
    const ab = (p: string) => { const b = readFileSync(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length) as ArrayBuffer; };
    const SILK = { regular: ab(join(D, 'silkscreen-latin-400-normal.woff')), bold: ab(join(D, 'silkscreen-latin-700-normal.woff')) };
    const cfg: KitConfig = { juego: 'Prueba', personajes_incluidos: ['familia'], packs: { base: ['idle'] }, ui: { interfaz: ['medallas'] } };
    const { files } = buildCustomKit(cfg, { fuentes: SILK }, { quick: true, solo: ['interfaz'] });
    const m = JSON.parse(new TextDecoder().decode(files.find((f) => f.name === 'manifest.json')!.bytes));
    expect(Object.keys(m.ui.interfaz)).toEqual(['medallas_16', 'medallas_32', 'medallas_64', 'cinta_16', 'cinta_32']);
    expect(m.ui.interfaz.cinta_32).toMatchObject({ archivo: 'ui/cinta_32.png', w: 32, h: 32, puesto: 4 });
    expect(m.ui.interfaz.medallas_32).toMatchObject({ w: 32, h: 32, cuadros: 3, orden: ['oro', 'plata', 'bronce'] });
    for (const id of ['cinta_16', 'cinta_32']) expect(files.some((f) => f.name === `ui/${id}.png`)).toBe(true);
  }, 120_000);
});
