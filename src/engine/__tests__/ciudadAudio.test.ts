import { describe, it, expect } from 'vitest';
import { SFX, MUSIC, RATE } from '../audio/sfx';
import { ambience, AMBIENCE_NAMES } from '../audio/ambience';

/** El audio del Mundo 5 (parte 5): casi silencio en el piso, todo bajito, nada de gritos ni sustos de golpe. */
describe('Mundo 5: el audio de la ciudad dormida', () => {
  const pk = (b: Float32Array) => { let x = 0; for (const v of b) x = Math.max(x, Math.abs(v)); return x; };
  const dur = (b: Float32Array) => b.length / RATE;

  it('efectos con pico de 0.5 o menos, y los golpes se ven venir (el arranque no es lo más fuerte)', () => {
    const efectos = ['farol_plaza_prender', 'luz_robada', 'chispa_recoger', 'estatua_paso', 'estatua_quieta', 'gargola_despierta', 'gargola_picada', 'arena_sueno', 'bostezo', 'reloj_campanada', 'aguja_barre', 'rey_puno', 'rey_pisoton', 'rey_canta', 'corona_rompe', 'ciudad_despierta'] as const;
    for (const n of efectos) { expect(pk(SFX[n]()), n).toBeLessThanOrEqual(0.501); expect(pk(SFX[n]()), n).toBeGreaterThan(0.3); }
    for (const n of ['rey_puno', 'rey_pisoton', 'gargola_picada', 'farol_plaza_prender', 'luz_robada', 'bostezo'] as const) {
      const b = SFX[n](), p = pk(b);
      expect(pk(b.subarray(0, Math.floor(RATE * 0.05))), n).toBeLessThan(p * 0.8);
    }
    // el de las Galerías sirve para cuando la Ladrona se va
    expect(SFX.figura_irse).toBeTruthy();
  });

  it('ambientes: la ciudad de 20 s, la cajita, el jardín, el reloj y el abismo, en bucle, con pico de 0.5', () => {
    expect(AMBIENCE_NAMES).toEqual(expect.arrayContaining(['ciudad', 'cajita', 'jardin', 'reloj', 'abismo']));
    expect(dur(ambience('ciudad'))).toBeCloseTo(20, 1);
    for (const n of ['ciudad', 'cajita', 'jardin', 'reloj', 'abismo'] as const) expect(pk(ambience(n)), n).toBeLessThanOrEqual(0.501);
  });

  it('la música del Rey y del Relojero en bucle, y la del despertar de 30 s que se calma', () => {
    expect(dur(MUSIC.jefe_rey())).toBeGreaterThan(30);
    const r = MUSIC.relojero();
    expect(dur(r)).toBeGreaterThan(10);
    expect(dur(r)).toBeLessThan(25);
    const d = MUSIC.despertar();
    expect(dur(d)).toBeCloseTo(30, 1);
    expect(pk(d.subarray(Math.floor(RATE * 29)))).toBeLessThan(pk(d.subarray(Math.floor(RATE * 5), Math.floor(RATE * 15))) * 0.3);
    for (const b of [MUSIC.jefe_rey(), r, d]) expect(pk(b)).toBeLessThanOrEqual(0.6);
  });
}, 120_000);
