import { describe, it, expect } from 'vitest';
import { PEZ_FAROL_SPEC, biteWarning, waveWarning, wave } from '../boss/pez';
import { renderBossSheets } from '../boss/sheet';

/** El jefe del Mundo 4 (parte 5): el Pez Farol. */
describe('Mundo 4: el Pez Farol', () => {
  it('sus animaciones, celda 128, la mordida y el salto avisan 6 cuadros o más', () => {
    expect(PEZ_FAROL_SPEC.cell).toBe(128);
    expect(PEZ_FAROL_SPEC.anims.map((a) => a.name).sort()).toEqual(['attack', 'attack_heavy', 'aturdido', 'die', 'emerger', 'hit', 'hundirse', 'idle', 'walk', 'warcry']);
    for (const n of ['attack', 'attack_heavy']) {
      const a = PEZ_FAROL_SPEC.anims.find((q) => q.name === n)!;
      expect(a.windup![1] - a.windup![0] + 1, n).toBeGreaterThanOrEqual(6);
      expect(a.events!.some((e) => e.type === 'impacto'), n).toBe(true);
    }
    // el salto sube con `elevacion` (no se dibuja en la celda)
    expect(Math.max(...PEZ_FAROL_SPEC.anims.find((q) => q.name === 'attack_heavy')!.rise!)).toBeGreaterThan(20);
    // se libera: la luz se le va, se achica y queda libre (azul y dorado)
    const die = PEZ_FAROL_SPEC.anims.find((q) => q.name === 'die')!;
    const last = die.keys[die.keys.length - 1].pose;
    expect(last.freed).toBe(1);
    expect(last.extra!.lure).toBe(0);
    expect(last.extra!.small).toBeLessThan(0.5);
  });

  it('quieto: solo se ve la luz sobre el agua y la sombra del cuerpo debajo (translúcida)', () => {
    const idle = { ...PEZ_FAROL_SPEC, anims: PEZ_FAROL_SPEC.anims.filter((a) => a.name === 'idle').map((a) => ({ ...a, frames: 2 })) };
    const { clips } = renderBossSheets(idle);
    const f = clips[0].frames[0][0];
    let bright = 0, opaque = 0, trans = 0;
    for (let i = 0; i < f.w * f.h; i++) {
      const a = f.data[i * 4 + 3];
      if (!a) continue;
      if (f.data[i * 4] > 230 && f.data[i * 4 + 1] > 200) bright++;
      if (a === 255) opaque++; else trans++;
    }
    expect(bright).toBeGreaterThanOrEqual(6); // la luz robada
    expect(trans).toBeGreaterThan(opaque); // el cuerpo, bajo el agua
  });

  it('los avisos y la ola, a su medida', () => {
    const b = biteWarning(), w = waveWarning(), o = wave();
    expect([b.length, b[0].w, b[0].h]).toEqual([8, 128, 64]);
    expect([w.length, w[0].w, w[0].h]).toEqual([6, 32, 32]);
    expect([o.length, o[0].w, o[0].h]).toEqual([8, 128, 64]);
  });
}, 600_000);
