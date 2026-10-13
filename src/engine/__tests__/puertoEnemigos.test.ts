import { describe, it, expect } from 'vitest';
import { MARINERO_NIEBLA_SPEC, CANGREJO_CENIZA_SPEC, MEDUSA_NEGRA_SPEC, CAPITAN_AHOGADO_SPEC } from '../boss/puerto';
import { renderBossSheets } from '../boss/sheet';

/** Los enemigos del Mundo 4 (parte 4). */
describe('Mundo 4: los enemigos del puerto', () => {
  const names = (s: typeof MARINERO_NIEBLA_SPEC) => s.anims.map((a) => a.name).sort();

  it('sus animaciones y su celda, como pide el encargo', () => {
    expect(names(MARINERO_NIEBLA_SPEC)).toEqual(['attack', 'die', 'hit', 'idle', 'walk']);
    expect(names(CANGREJO_CENIZA_SPEC)).toEqual(['attack', 'die', 'hit', 'idle', 'walk']);
    expect(names(MEDUSA_NEGRA_SPEC)).toEqual(['die', 'hit', 'idle', 'walk']);
    expect(names(CAPITAN_AHOGADO_SPEC)).toEqual(['attack', 'attack_heavy', 'die', 'hit', 'idle', 'walk', 'warcry']);
    expect([MARINERO_NIEBLA_SPEC.cell, CANGREJO_CENIZA_SPEC.cell, MEDUSA_NEGRA_SPEC.cell, CAPITAN_AHOGADO_SPEC.cell]).toEqual([48, 48, 48, 64]);
    // el golpe fuerte del capitán avisa 6 cuadros o más; el grito llama la ola
    const heavy = CAPITAN_AHOGADO_SPEC.anims.find((a) => a.name === 'attack_heavy')!;
    expect(heavy.windup![1] - heavy.windup![0] + 1).toBeGreaterThanOrEqual(6);
    expect(CAPITAN_AHOGADO_SPEC.anims.find((a) => a.name === 'warcry')!.events!.some((e) => e.type === 'grito')).toBe(true);
    // se libera: termina sin niebla (freed 1) y de espaldas, yéndose
    const die = CAPITAN_AHOGADO_SPEC.anims.find((a) => a.name === 'die')!;
    const last = die.keys[die.keys.length - 1].pose;
    expect(last.freed).toBe(1);
    expect(Math.abs(last.root.yaw ?? 0)).toBeGreaterThanOrEqual(150);
    // la medusa no ataca
    expect(MEDUSA_NEGRA_SPEC.anims.some((a) => a.name === 'attack')).toBe(false);
  });

  it('caben en su celda, y el marinero es niebla translúcida con sus linternitas verdes', () => {
    for (const s of [MARINERO_NIEBLA_SPEC, CANGREJO_CENIZA_SPEC, MEDUSA_NEGRA_SPEC]) {
      const { clips } = renderBossSheets(s);
      for (const c of clips) expect(c.overflow, `${s.id} ${c.def.name}`).toBe(0);
      if (s === MARINERO_NIEBLA_SPEC) {
        const f = clips[0].frames[0][0];
        let trans = 0, green = 0;
        for (let i = 0; i < f.w * f.h; i++) {
          const a = f.data[i * 4 + 3];
          if (a > 0 && a < 255) trans++;
          if (a === 255 && f.data[i * 4 + 1] > 200 && f.data[i * 4] < 200) green++;
        }
        expect(trans).toBeGreaterThan(100);
        expect(green).toBeGreaterThan(1);
        // al morir se deshace: el último cuadro casi no tiene nada
        const die = clips.find((c) => c.def.name === 'die')!;
        const lastF = die.frames[0][die.frames[0].length - 1];
        let solid = 0;
        for (let i = 0; i < lastF.w * lastF.h; i++) if (lastF.data[i * 4 + 3] > 150) solid++;
        expect(solid).toBeLessThan(40);
      }
    }
  });
}, 600_000);
