import { describe, expect, it } from 'vitest';
import { nesSheet, nesDogSheet, nesFrame, NES_ANIMS, NES_DIRS, NES_CELL, NES_FOOT, NES_INK, IDLE, type NesLook } from '../index';

const L: NesLook = { piel: '#e0a070', pelo: '#241814', peinado: 'raya', marcas: ['barba'], camisa: '#d8202a', short: '#ffffff', medias: '#d8202a', zapatos: '#181010' };
const opaque = (r: { w: number; h: number; data: Uint8ClampedArray }): number[] => { const ys: number[] = []; for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (r.data[(y * r.w + x) * 4 + 3]) ys.push(y); return ys; };

describe('estilo Nekketsu', () => {
  it('cada animación sale en las cinco filas y la hoja trae su JSON para Phaser', () => {
    const { png, meta } = nesSheet(L, { keeper: true });
    for (const a of Object.keys(NES_ANIMS)) for (const d of Object.keys(NES_DIRS)) expect(meta.anims[`${a}_${d}`], `${a}_${d}`).toBeDefined();
    expect(meta.cell).toEqual([NES_CELL, NES_CELL]); expect(meta.pivot).toEqual([16, NES_FOOT]); expect(meta.mirror.left).toBe('right');
    expect(png.w).toBe(16 * NES_CELL);
  });
  it('los pies tocan el piso, la figura mide entre 24 y 30 px y tiene el contorno oscuro de la NES', () => {
    const f = nesFrame(L, 'side', IDLE[0]), ys = opaque(f);
    expect(Math.max(...ys)).toBeGreaterThanOrEqual(NES_FOOT); expect(Math.max(...ys)).toBeLessThanOrEqual(NES_FOOT + 1);
    const h = Math.max(...ys) - Math.min(...ys) + 1; expect(h).toBeGreaterThanOrEqual(24); expect(h).toBeLessThanOrEqual(30);
    let ink = 0; for (let i = 0; i < f.data.length; i += 4) if (f.data[i] === NES_INK[0] && f.data[i + 1] === NES_INK[1] && f.data[i + 2] === NES_INK[2] && f.data[i + 3]) ink++;
    expect(ink).toBeGreaterThan(40);
  });
  it('pocos colores, como en la NES (no más de 16 por personaje)', () => {
    const { png } = nesSheet(L), set = new Set<number>();
    for (let i = 0; i < png.data.length; i += 4) if (png.data[i + 3]) set.add((png.data[i] << 16) | (png.data[i + 1] << 8) | png.data[i + 2]);
    expect(set.size).toBeLessThanOrEqual(16);
  });
  it('el perro tiene sus animaciones de mascota', () => {
    const { meta } = nesDogSheet({ pelo: '#b06a2c', pecho: '#f4ece0' });
    for (const a of ['idle', 'run', 'jump', 'celebrate', 'lie', 'wag']) expect(meta.anims[`${a}_right`]).toBeDefined();
  });
  it('es determinista: la misma ficha da los mismos pixeles', () => {
    const a = nesSheet(L).png.data, b = nesSheet(L).png.data;
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });
});
