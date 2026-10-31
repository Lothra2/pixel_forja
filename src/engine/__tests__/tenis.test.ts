import { describe, it, expect } from 'vitest';
import type { Raster } from '../core/raster';
import { fondoTenis, redTenis, piezasTenis, pant, ESQUINAS, RED, TENIS_V } from '../ui/tenis';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildCustomKit, type KitConfig } from '../kit/custom';
import { ROOT } from './helpers';

const alpha = (r: Raster, x: number, y: number) => r.data[(y * r.w + x) * 4 + 3];
const rgb = (r: Raster, x: number, y: number) => [r.data[(y * r.w + x) * 4], r.data[(y * r.w + x) * 4 + 1], r.data[(y * r.w + x) * 4 + 2]];
const opaca = (r: Raster) => { for (let q = 3; q < r.data.length; q += 4) if (r.data[q] !== 255) return false; return true; };
const llenos = (r: Raster) => { let n = 0; for (let q = 3; q < r.data.length; q += 4) if (r.data[q]) n++; return n; };

describe('la cancha de tenis vista desde atrás (lote TENIS_V)', () => {
  it('la proyección es la del juego: tu fondo en la fila 322, el de ellos en la 114 y la red en la 187', () => {
    expect(Math.round(pant(0, 0)[1])).toBe(322);
    expect(Math.round(pant(0, TENIS_V.largo)[1])).toBe(114);
    expect(RED.fila).toBe(187);
    // las esquinas: tu fondo de 265 a 535 (640 centrado: de 185 a 455) y el de ellos de 326 a 474
    expect(ESQUINAS).toEqual([[265, 322], [535, 322], [474, 114], [326, 114]]);
    // la red es simétrica y mide lo que le toca por la escala
    expect(RED.x0 + RED.x1).toBe(800);
    expect(RED.alto).toBe(Math.round(TENIS_V.redAlto * 480 / 680));
  });

  it('el fondo mide 800 x 360, es opaco, con arcilla en la cancha y pasto afuera', () => {
    const p = fondoTenis();
    expect([p.name, p.w, p.h, p.frames.length]).toEqual(['tenis_fondo', 800, 360, 1]);
    const f = p.frames[0];
    expect(opaca(f)).toBe(true);
    // en la mitad de la cancha hay arcilla (rojiza); en la esquina de abajo a la izquierda, pasto (verde)
    const [r, g] = rgb(f, 400, 250);
    expect(r).toBeGreaterThan(g + 30);
    const [r2, g2] = rgb(f, 20, 350);
    expect(g2).toBeGreaterThan(r2);
    // la línea de fondo nuestra es clara en la fila 322, entre las esquinas
    const [lr, lg, lb] = rgb(f, 400, 322);
    expect(lr + lg + lb).toBeGreaterThan(600);
    expect(p.extra).toMatchObject({ cancha: ESQUINAS, red: RED, proyeccion: { d0: 480, cx: 400, kx: 1.35, ky: 457.6, hor: -135.6 } });
  });

  it('la red va aparte, transparente, solo entre sus palos', () => {
    const p = redTenis();
    expect([p.name, p.w, p.h]).toEqual(['tenis_red', 800, 360]);
    const f = p.frames[0];
    // la cinta blanca de arriba es seguida; la malla de abajo tiene sus huecos, pero algo hay
    expect(alpha(f, 400, RED.fila - RED.alto + 1)).toBe(255);
    expect(llenos(f)).toBeGreaterThan((RED.x1 - RED.x0) * 3);
    expect(alpha(f, 400, 300)).toBe(0);
    expect(alpha(f, 100, RED.fila - 5)).toBe(0);
    expect(alpha(f, 400, RED.fila - RED.alto - 8)).toBe(0);
    expect(llenos(f)).toBeLessThan((RED.x1 - RED.x0 + 12) * (RED.alto + 8));
    expect(p.extra).toMatchObject({ fila: RED.fila, x0: RED.x0, x1: RED.x1, alto: RED.alto });
  });

  it('el mismo dibujo dos veces (es determinista) y en el kit a medida sale con la parte "tenis"', () => {
    const a = fondoTenis(), b = fondoTenis();
    expect(Buffer.from(a.frames[0].data).equals(Buffer.from(b.frames[0].data))).toBe(true);
    expect(piezasTenis().map((p) => p.name)).toEqual(['tenis_fondo', 'tenis_red']);
    const D = join(ROOT, 'node_modules', '@fontsource', 'silkscreen', 'files');
    const ab = (p: string) => { const b = readFileSync(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length) as ArrayBuffer; };
    const SILK = { regular: ab(join(D, 'silkscreen-latin-400-normal.woff')), bold: ab(join(D, 'silkscreen-latin-700-normal.woff')) };
    const cfg: KitConfig = { juego: 'Prueba', personajes_incluidos: ['familia'], packs: { base: ['idle'] }, ui: { interfaz: ['tenis'] } };
    const { files } = buildCustomKit(cfg, { fuentes: SILK }, { quick: true, solo: ['interfaz'] });
    const nombres = files.map((f) => f.name);
    expect(nombres).toContain('ui/tenis_fondo.png');
    expect(nombres).toContain('ui/tenis_red.png');
    const m = JSON.parse(new TextDecoder().decode(files.find((f) => f.name === 'manifest.json')!.bytes));
    expect(m.ui.interfaz.tenis_fondo).toMatchObject({ archivo: 'ui/tenis_fondo.png', w: 800, h: 360, cancha: ESQUINAS });
    expect(m.ui.interfaz.tenis_red).toMatchObject({ archivo: 'ui/tenis_red.png', fila: RED.fila });
  });
});
