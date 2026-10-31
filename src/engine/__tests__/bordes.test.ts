import { describe, it, expect } from 'vitest';
import type { Raster } from '../core/raster';
import { piezasBordes } from '../ui/bordes';
import { UI_PARTS } from '../ui/retro';

const alpha = (r: Raster, x: number, y: number) => r.data[(y * r.w + x) * 4 + 3];
const llenosEn = (r: Raster, y0: number, y1: number) => { let n = 0; for (let y = y0; y < y1; y++) for (let x = 0; x < r.w; x++) if (alpha(r, x, y)) n++; return n; };

describe('los bordes de las canchas (lote BORDES)', () => {
  const piezas = piezasBordes();
  it('son 5, de 800 x 360, transparentes, con su corte', () => {
    expect(piezas.map((p) => p.name)).toEqual(['borde_margarita', 'borde_cancha_maracaibo', 'borde_barranquilla', 'borde_tao_dan', 'borde_liceo_patio']);
    for (const p of piezas) {
      expect([p.w, p.h, p.frames.length], p.name).toEqual([800, 360, 1]);
      expect(typeof p.extra?.corte, p.name).toBe('number');
      // arriba del todo no hay nada (ahí va el escenario) y en la franja de adelante sí
      expect(llenosEn(p.frames[0], 0, 200), p.name).toBe(0);
      expect(llenosEn(p.frames[0], 320, 360), p.name).toBeGreaterThan(800);
    }
  });
  it('lo de atrás queda arriba del corte y lo de adelante abajo, sin cruzarlo', () => {
    for (const p of piezas) {
      const c = p.extra!.corte as number;
      // en la fila del corte y las dos de al lado no hay nada: la imagen se parte limpia
      expect(llenosEn(p.frames[0], c - 1, c + 2), p.name).toBe(0);
    }
  });
  it('la parte "bordes" existe y es determinista', () => {
    expect(UI_PARTS).toContain('bordes');
    const a = piezasBordes()[1].frames[0], b = piezasBordes()[1].frames[0];
    expect(Buffer.from(a.data).equals(Buffer.from(b.data))).toBe(true);
  });
});
