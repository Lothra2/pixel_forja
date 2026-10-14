import { describe, it, expect } from 'vitest';
import { SFX, MUSIC, RATE } from '../audio/sfx';
import { ambience, AMBIENCE_NAMES } from '../audio/ambience';

/** El audio del Mundo 7 (parte 5): viento helado siempre, un latido grave cerca del trono, pico de 0.6 y nada de golpe. */
describe('Mundo 7: el audio del Corazón Helado', () => {
  const pk = (b: Float32Array) => { let x = 0; for (const v of b) x = Math.max(x, Math.abs(v)); return x; };
  const dur = (b: Float32Array) => b.length / RATE;
  const efectos = ['ventisca_viene', 'viento_fuerte', 'frio_sube', 'congelada', 'hielo_cruje', 'hielo_rompe', 'agua_helada', 'hoguera_prender', 'luz_comida', 'luz_vuelve', 'lobo_aullido', 'lobo_mordida', 'espectro_rayo', 'diablillo_risa', 'diablillo_fuego', 'escudo_bloquea', 'bruja_muro', 'bruja_cura', 'reina_lanzas', 'reina_ventisca', 'guardian_cruz', 'guardian_carga', 'diablo_ruge', 'diablo_paso', 'diablo_nova', 'diablo_rayo', 'diablo_pilares', 'diablo_oscuridad', 'jaula_huesos', 'jaula_rompe', 'brasero_hueso_prender', 'brasero_congela', 'diablo_cae'] as const;

  it('los efectos, con pico de 0.6 o menos; el rugido y la ventisca crecen de a poco (nunca de golpe)', () => {
    for (const n of efectos) { expect(SFX[n], n).toBeTruthy(); expect(pk(SFX[n]()), n).toBeLessThanOrEqual(0.601); }
    for (const n of ['diablo_ruge', 'ventisca_viene', 'diablo_nova', 'diablo_cae', 'lobo_aullido'] as const) { const b = SFX[n](), p = pk(b); expect(pk(b.subarray(0, Math.floor(RATE * 0.1))), n).toBeLessThan(p * 0.6); }
    // la risa del diablillo, bajita
    expect(pk(SFX.diablillo_risa())).toBeLessThanOrEqual(0.351);
    // el viento fuerte va en bucle: 3 s exactos y el final empalma con el principio
    const v = SFX.viento_fuerte();
    expect(dur(v)).toBeCloseTo(3, 2);
    expect(Math.abs(v[v.length - 1] - v[0])).toBeLessThan(0.2);
  });

  it('los ambientes del piso: hielo de 20 s y los de cada zona, en bucle con pico de 0.5', () => {
    const nuevos = ['hielo', 'bosque_hielo', 'lago', 'catacumbas', 'ciudadela', 'puente', 'puerta', 'trono'] as const;
    expect(AMBIENCE_NAMES).toEqual(expect.arrayContaining([...nuevos]));
    expect(dur(ambience('hielo'))).toBeCloseTo(20, 1);
    for (const n of nuevos) expect(pk(ambience(n)), n).toBeLessThanOrEqual(0.501);
  });

  it('las músicas: la Reina y el Guardián cortas en bucle, y las cuatro del Diablo cada vez más fuertes y más rápidas', () => {
    for (const n of ['reina_escarcha', 'guardian'] as const) { const b = MUSIC[n](); expect(dur(b), n).toBeGreaterThan(8); expect(dur(b), n).toBeLessThan(30); expect(pk(b), n).toBeLessThanOrEqual(0.501); }
    const d = (['diablo_1', 'diablo_2', 'diablo_3', 'diablo_final'] as const).map((n) => MUSIC[n]());
    for (let i = 1; i < 4; i++) { expect(pk(d[i])).toBeGreaterThan(pk(d[i - 1])); expect(dur(d[i])).toBeLessThan(dur(d[i - 1])); }
    expect(pk(d[3])).toBeLessThanOrEqual(0.601);
    // todas son 64 corcheas: el juego pasa de una a otra al terminar la frase
    expect(Math.round(dur(d[0]) / (60 / 76 / 2))).toBe(64);
    expect(Math.round(dur(d[3]) / (60 / 132 / 2))).toBe(64);
  });
}, 300_000);
