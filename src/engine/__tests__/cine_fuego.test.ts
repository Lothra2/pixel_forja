import { describe, it, expect } from 'vitest';
import { pintarPlano, capasFinales, hojasFx } from '../gotico/cinematicas';
import { pintarPortada } from '../gotico/portada';

const suma = (d: ArrayLike<number>) => { let s = 0; for (let i = 0; i < d.length; i++) s += d[i]; return s; };

describe('fuego de Doom en cinemáticas y portada', () => {
  it('la hoja de fuego conserva su formato (8 cuadros de 64 x 128) y los cuadros cambian', () => {
    const h = hojasFx().fuego;
    expect([h.img.w, h.img.h, h.w, h.h, h.columnas, h.cuadros, h.pivote]).toEqual([512, 128, 64, 128, 8, 8, [32, 120]]);
    const c0 = h.img.data.subarray(0, 64 * 4), q = (n: number) => { let s = 0; for (let y = 0; y < 128; y++) for (let x = 0; x < 64; x++) s += h.img.data[(y * 512 + n * 64 + x) * 4 + 3]; return s; };
    expect(c0.length).toBe(256);
    expect(q(0)).toBeGreaterThan(1000);
    expect(q(0)).not.toBe(q(3));
  });

  it('los vitrales de Ysmeral arden: una tira con anim cuadros en el lugar de la catedral', () => {
    const capas = capasFinales(pintarPlano('acto_5', 'p4_ysmeral'));
    const f = capas.find((c) => c.id === 'catedral_fuego')!;
    expect(f).toBeDefined();
    expect(f.mezcla).toBe('sumar');
    expect(f.paralaje).toBe(capas.find((c) => c.id === 'catedral')!.paralaje);
    const a = f.anim as { tipo: string; columnas: number; cuadros: number; fps: number; w: number; h: number };
    expect(a.tipo).toBe('cuadros');
    expect([f.w, f.h]).toEqual([a.w, a.h]);
    expect(f.img!.w).toBe(a.w * a.columnas);
    expect(Math.max(f.img!.w, f.img!.h)).toBeLessThanOrEqual(4096);
    expect(suma(f.img!.d)).toBeGreaterThan(100);
  }, 120_000);

  it('la portada trae la capa del fuego de los vitrales y la puerta (tira con x, y)', () => {
    const p = pintarPortada({ rapida: true });
    const f = p.capas.find((c) => c.id === 'catedral_fuego')!;
    expect(f).toBeDefined();
    const a = f.anim as { tipo: string; columnas: number; cuadros: number; w: number; h: number };
    expect(a.tipo).toBe('cuadros');
    expect(f.x).toBeGreaterThanOrEqual(0);
    expect(f.img.w).toBe(a.w * a.columnas);
    expect(f.z).toBeGreaterThan(p.capas.find((c) => c.id === 'catedral_luz')!.z);
  }, 120_000);
});
