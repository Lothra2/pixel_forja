import { describe, it, expect } from 'vitest';
import { renderFx, projectile8, FX_ELEMENTS, FX_KINDS, FX_PALETTES } from '../index';

describe('poderes (efectos)', () => {
  it('cada tipo y elemento da cuadros con pixeles solo de su rampa', () => {
    for (const element of FX_ELEMENTS)
      for (const kind of FX_KINDS) {
        const c = renderFx({ kind, element, cell: 48 });
        expect(c.frames.length, `${kind} ${element}`).toBeGreaterThanOrEqual(5);
        const pal = new Set(FX_PALETTES[element].map((h) => parseInt(h.slice(1), 16)));
        let lit = 0;
        for (const fr of c.frames)
          for (let i = 0; i < fr.w * fr.h; i++) {
            if (!fr.data[i * 4 + 3]) continue;
            lit++;
            expect(pal.has((fr.data[i * 4] << 16) | (fr.data[i * 4 + 1] << 8) | fr.data[i * 4 + 2])).toBe(true);
          }
        expect(lit, `${kind} ${element}`).toBeGreaterThan(40);
      }
  });
  it('es determinista y el proyectil sale en 8 direcciones', () => {
    const a = renderFx({ kind: 'impact', element: 'fuego', cell: 48, seed: 3 }), b = renderFx({ kind: 'impact', element: 'fuego', cell: 48, seed: 3 });
    expect(Buffer.from(a.frames[2].data).equals(Buffer.from(b.frames[2].data))).toBe(true);
    const dirs = projectile8({ element: 'hielo', cell: 32 });
    expect(dirs.map((d) => d.dir)).toEqual(['right', 'down_right', 'down', 'down_left', 'left', 'up_left', 'up', 'up_right']);
    expect(Buffer.from(dirs[0].clip.frames[0].data).equals(Buffer.from(dirs[2].clip.frames[0].data))).toBe(false);
  });
});

import { renderItem, itemName, ITEM_KINDS, RARITIES } from '../index';
describe('objetos (íconos)', () => {
  it('cada objeto se dibuja en 32 px, con y sin casillero, y cambia con la rareza', () => {
    for (const kind of ITEM_KINDS) {
      const a = renderItem({ kind });
      let lit = 0;
      for (let i = 0; i < 32 * 32; i++) if (a.data[i * 4 + 3]) lit++;
      expect(lit, kind).toBeGreaterThan(30);
      const framed = renderItem({ kind, rarity: 'unique', frame: true });
      expect(Buffer.from(framed.data).equals(Buffer.from(a.data)), kind).toBe(false);
    }
    expect(renderItem({ kind: 'ring', px: 64 }).w).toBe(64);
    expect(itemName({ kind: 'gem', gem: 'emerald', size: 'large' })).toBe('gem_emerald_perfect');
    expect(itemName({ kind: 'w_axe', rarity: 'unique' })).toBe('w_axe_unique');
    expect(RARITIES.length).toBe(5);
  });
});
