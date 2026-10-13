import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRaster, blit, encodePng, decodePng } from '../index';
import { vehiculosD2, ferry, moto, VEHICULOS_D2, K_INCLINACION } from '../world/oblique/vehiculos';
import { ROOT } from './helpers';

const opaco = (r: { w: number; h: number; data: Uint8ClampedArray | Uint8Array }, x: number, y: number) => r.data[(y * r.w + x) * 4 + 3] > 0;

describe('vehículos en la vista inclinada (lote D2)', () => {
  it('están los del pedido de esta noche, cada uno con sus cuadros del mismo tamaño y sus animaciones', () => {
    const hs = vehiculosD2();
    expect(hs.map((h) => h.id)).toEqual([...VEHICULOS_D2]);
    for (const h of hs) {
      for (const c of h.cuadros) expect([c.w, c.h], h.id).toEqual([h.w, h.h]);
      const total = Object.values(h.anims).reduce((s, a) => s + a.cuadros, 0);
      expect(total, h.id).toBe(h.cuadros.length);
      // el contorno del motor en todos los cuadros
      for (const c of h.cuadros) { let ink = false; for (let i = 0; i < c.data.length && !ink; i += 4) ink = c.data[i] === 0x1e && c.data[i + 1] === 0x14 && c.data[i + 2] === 0x18 && c.data[i + 3] > 0; expect(ink, h.id).toBe(true); }
    }
    const nombres = Object.fromEntries(hs.map((h) => [h.id, Object.keys(h.anims)]));
    expect(nombres.ferry).toEqual(['andando', 'atracado']);
    expect(nombres.moto_rojo).toEqual(['andando', 'frenando', 'corneta']);
    expect(nombres.xich_lo).toEqual(['andando']);
    expect(nombres.bote_bambu).toEqual(['meciendo']);
  });

  it('el ferry tiene la huella del gris del juego (110 x 40 y 12 de alto) y su cubierta cae donde la proyección dice', () => {
    const f = ferry();
    expect(f.huella).toEqual({ w: 110, d: 40, z: 12 });
    const c = f.cuadros[4]; // atracado
    // la esquina de adelante a la derecha de la cubierta: (x + K d, d - z) desde el ancla
    const x = f.ancla[0] + 110 - 6 + Math.round(K_INCLINACION * 40), y = f.ancla[1] + 40 - 12 - 2;
    expect(opaco(c, x, y)).toBe(true);
    // y el ancla queda en el borde de la cara izquierda, en el piso
    expect(opaco(c, f.ancla[0], f.ancla[1] - 1)).toBe(true);
  });

  it('la moto frena distinto de como anda, y las 4 son de colores distintos', () => {
    const m = moto('rojo');
    const a = m.cuadros[0], fr = m.cuadros[m.anims.frenando.desde];
    expect(a.data.every((v, i) => v === fr.data[i])).toBe(false);
    const color = (id: 'rojo' | 'azul' | 'amarillo' | 'verde') => { const c = moto(id).cuadros[0]; const s = new Set<string>(); for (let i = 0; i < c.data.length; i += 4) if (c.data[i + 3]) s.add(`${c.data[i]},${c.data[i + 1]},${c.data[i + 2]}`); return s; };
    const rojo = color('rojo'), azul = color('azul');
    expect([...rojo].filter((c) => !azul.has(c)).length).toBeGreaterThan(3);
  });

  it('imagen dorada: el primer cuadro de cada uno', () => {
    const hs = vehiculosD2();
    const out = createRaster(hs.reduce((s, h) => s + h.w, 0), Math.max(...hs.map((h) => h.h)));
    let x = 0;
    for (const h of hs) { blit(out, h.cuadros[0], x, 0); x += h.w; }
    const file = join(ROOT, 'golden', 'vehiculos_d2.png');
    if (process.env.UPDATE_GOLDEN || !existsSync(file)) { writeFileSync(file, encodePng(out)); return; }
    const gold = decodePng(readFileSync(file));
    const same = gold.w === out.w && Buffer.from(gold.data).equals(Buffer.from(out.data));
    if (!same) { mkdirSync(join(ROOT, 'out'), { recursive: true }); writeFileSync(join(ROOT, 'out', 'golden_actual_vehiculos_d2.png'), encodePng(out)); }
    expect(same, 'cambió vehiculos_d2; mira out/golden_actual_vehiculos_d2.png').toBe(true);
  });
});
