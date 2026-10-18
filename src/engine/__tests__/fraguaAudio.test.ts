import { describe, it, expect } from 'vitest';
import { SFX, MUSIC, RATE } from '../audio/sfx';
import { ambience, AMBIENTES_GG_ABYSS } from '../audio/ambience';

/** El audio del Mundo 6 (parte 5): el piso respira, casi sin música, todo bajito, sin gritos ni sustos de golpe. */
describe('Mundo 6: el audio de la fragua', () => {
  const pk = (b: Float32Array) => { let x = 0; for (const v of b) x = Math.max(x, Math.abs(v)); return x; };
  const dur = (b: Float32Array) => b.length / RATE;
  const efectos = ['fuelle_sopla', 'grieta_rojo', 'calor_sube', 'acalorada', 'jaula_abre', 'luz_libre', 'luz_libre_bosque', 'luz_libre_catedral', 'luz_libre_galerias', 'luz_libre_faro', 'luz_libre_ciudad', 'thor_mojarse', 'thor_sacude', 'hollin_pega', 'hollin_suelta', 'salamandra_escupe', 'salamandra_piedra', 'cadena_gira', 'farolero_paso', 'carcelero_llaves', 'carcelero_portazo', 'dragona_ruge', 'dragona_aliento', 'surtidor_chorro', 'palanca', 'dragona_apagada', 'cadenas_rompen', 'puerta_negra'] as const;

  it('efectos con pico de 0.5 o menos, y los fuertes se ven venir (el arranque no es lo más fuerte)', () => {
    for (const n of efectos) expect(pk(SFX[n]()), n).toBeLessThanOrEqual(0.501);
    for (const n of ['fuelle_sopla', 'dragona_ruge', 'dragona_aliento', 'luz_libre']) { const b = SFX[n as 'fuelle_sopla'](), p = pk(b); expect(pk(b.subarray(0, Math.floor(RATE * 0.05))), n).toBeLessThan(p * 0.8); }
    // la Puerta Negra, muy bajito
    expect(pk(SFX.puerta_negra())).toBeLessThanOrEqual(0.301);
  });

  it('ambientes: la fragua de 20 s, las jaulas, el bosque de ceniza, el horno y los de la tabla, en bucle con pico de 0.5', () => {
    const nuevos = ['fragua', 'lava', 'jaulas', 'fuelles', 'bosque_ceniza', 'carcel', 'horno'] as const;
    expect(AMBIENTES_GG_ABYSS).toEqual(expect.arrayContaining([...nuevos]));
    expect(dur(ambience('fragua'))).toBeCloseTo(20, 1);
    for (const n of nuevos) expect(pk(ambience(n)), n).toBeLessThanOrEqual(0.501);
  });

  it('la música de la Dragona y del Carcelero en bucle, y la liberación de 30 a 40 s que se calma', () => {
    const d = MUSIC.jefe_dragona(), c = MUSIC.carcelero(), l = MUSIC.liberacion();
    expect(dur(d)).toBeGreaterThan(30);
    expect(dur(c)).toBeGreaterThan(8); expect(dur(c)).toBeLessThan(25);
    expect(dur(l)).toBeGreaterThanOrEqual(30); expect(dur(l)).toBeLessThanOrEqual(40);
    expect(pk(l.subarray(Math.floor(RATE * (dur(l) - 0.5))))).toBeLessThan(pk(l.subarray(Math.floor(RATE * 20), Math.floor(RATE * 28))) * 0.3);
    for (const b of [d, c, l]) expect(pk(b)).toBeLessThanOrEqual(0.501);
  });
}, 120_000);
