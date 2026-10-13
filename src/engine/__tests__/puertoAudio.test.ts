import { describe, it, expect } from 'vitest';
import { SFX, MUSIC, RATE } from '../audio/sfx';
import { ambience, AMBIENCE_NAMES } from '../audio/ambience';

/** El audio del Mundo 4 (parte 6): casi sin música, todo bajito, nada de gritos ni sustos de golpe. */
describe('Mundo 4: el audio del puerto', () => {
  const pk = (b: Float32Array) => { let x = 0; for (const v of b) x = Math.max(x, Math.abs(v)); return x; };
  const dur = (b: Float32Array) => b.length / RATE;

  it('efectos con pico de 0.5 o menos y sin golpe de susto (el arranque no es lo más fuerte)', () => {
    const efectos = ['campana_lejos', 'campana_cerca', 'marea_sube', 'farol_prender', 'farol_apagar', 'thor_alza_farol', 'marinero_se_deshace', 'cangrejo_tenaza', 'medusa_toca', 'ancla_golpe', 'pez_emerge', 'pez_mordida', 'ola', 'faro_prende'] as const;
    for (const n of efectos) expect(pk(SFX[n]()), n).toBeLessThanOrEqual(0.501);
    expect(dur(SFX.marea_sube())).toBeCloseTo(6, 1);
    // la ola, el pez que emerge y la marea crecen: lo más fuerte no está en los primeros 50 ms
    for (const n of ['ola', 'pez_emerge', 'marea_sube'] as const) {
      const b = SFX[n](), p = pk(b);
      expect(pk(b.subarray(0, Math.floor(RATE * 0.05))), n).toBeLessThan(p * 0.8);
    }
  });

  it('ambientes de 20 s (el puerto) y 12 s (la campana) en bucle, con pico de 0.5', () => {
    expect(AMBIENCE_NAMES).toEqual(expect.arrayContaining(['puerto', 'campana']));
    const p = ambience('puerto'), c = ambience('campana');
    expect(dur(p)).toBeCloseTo(20, 1);
    expect(dur(c)).toBeCloseTo(12, 1);
    for (const b of [p, c]) expect(pk(b)).toBeLessThanOrEqual(0.501);
  });

  it('la música del jefe y del capitán en bucle, y la del faro de 30 s que se calma', () => {
    expect(dur(MUSIC.jefe_pez())).toBeGreaterThan(30);
    expect(dur(MUSIC.capitan())).toBeGreaterThan(25);
    const f = MUSIC.faro();
    expect(dur(f)).toBeCloseTo(30, 1);
    // se calma: el final es mucho más bajito que el medio
    expect(pk(f.subarray(Math.floor(RATE * 28)))).toBeLessThan(pk(f.subarray(Math.floor(RATE * 5), Math.floor(RATE * 15))) * 0.3);
  });
}, 120_000);
