import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { moto, xichLo, vehiculosD2 } from '../world/oblique/vehiculos';
import { renderClip, migrateFicha, type HumanFicha } from '../index';
import { ROOT } from './helpers';

type R = { w: number; h: number; data: Uint8ClampedArray | Uint8Array };
const lleno = (r: R, x: number, y: number) => r.data[(y * r.w + x) * 4 + 3] > 0;
/** La fila más alta con algo pintado. */
const arriba = (r: R) => { for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (lleno(r, x, y)) return y; return r.h; };
/** El alto de un atleta de 48 parado, de la coronilla al piso. */
const altoAtleta = () => {
  const f = { ...(migrateFicha(JSON.parse(readFileSync(join(ROOT, 'docs', 'ejemplos', 'nekketsu', 'fichas', 'rick.ficha.json'), 'utf8'))) as HumanFicha), movementProfile: 'premium' as const };
  const fr = renderClip(f, 48, 'idle', 'side', { props: true }).frames[0];
  return 47 - arriba(fr);
};

describe('los vehículos a escala de atleta (lote D3)', () => {
  it('la moto mide 52 de largo y el xích lô 68, con el mismo ancla y mirando a la izquierda', () => {
    const m = moto('rojo'), x = xichLo();
    expect([m.huella.w, m.huella.d, m.dir]).toEqual([52, 12, -1]);
    expect([x.huella.w, x.huella.d, x.dir]).toEqual([68, 20, -1]);
    // el ancla: la esquina de atrás a la izquierda de la huella, en el piso (justo encima, la cara izquierda)
    for (const h of [m, x]) expect(h.cuadros.some((c) => lleno(c, h.ancla[0] + 2, h.ancla[1] - 2)), h.id).toBe(true);
  });

  it('el que maneja es del alto de un atleta: la moto con su conductor llega más arriba que un atleta parado', () => {
    const atleta = altoAtleta();
    expect(atleta).toBeGreaterThanOrEqual(40);
    for (const h of [moto('azul'), xichLo()]) {
      // de la coronilla del conductor al piso del vehículo (el ancla), en el primer cuadro
      const alto = h.ancla[1] - arriba(h.cuadros[0]);
      expect(alto, h.id).toBeGreaterThan(atleta);
      // y nada se sale del cuadro: hay un pixel libre arriba
      expect(arriba(h.cuadros[0]), h.id).toBeGreaterThan(0);
    }
  });

  it('las 4 motos llevan el casco de su color y el conductor rebota al andar', () => {
    const color = (c: R) => { const s = new Set<string>(); for (let i = 0; i < c.data.length; i += 4) if (c.data[i + 3]) s.add(`${c.data[i]},${c.data[i + 1]},${c.data[i + 2]}`); return s; };
    const roja = color(moto('rojo').cuadros[0]), verde = color(moto('verde').cuadros[0]);
    expect([...roja].filter((c) => !verde.has(c)).length).toBeGreaterThan(5);
    const m = moto('rojo');
    expect(arriba(m.cuadros[0])).not.toBe(arriba(m.cuadros[1]));
  });

  it('el xích lô pedalea: los cuatro cuadros de andando son distintos', () => {
    const x = xichLo(), [a, b, c, d] = x.cuadros;
    const igual = (p: R, q: R) => Buffer.from(p.data).equals(Buffer.from(q.data));
    expect([igual(a, b), igual(a, c), igual(b, d)]).toEqual([false, false, false]);
    expect(vehiculosD2().find((h) => h.id === 'xich_lo')!.anims).toEqual({ andando: { desde: 0, cuadros: 4, fps: 10, loop: true } });
  });
});
