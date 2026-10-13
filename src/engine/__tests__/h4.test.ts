import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { MUSIC_ATLETISMO } from '../audio/atletismo';
import { SONIDOS, renderSound } from '../audio/catalogo';
import { RATE } from '../audio/sfx';
import { buildCustomKit, validateKitConfig, type KitConfig } from '../kit/custom';

/** Lo que pide el lote H4: un tema para cada mundo de las pruebas que seguían con la música del chip. */
const TEMAS = ['champeta_murallas', 'cafe_neblina', 'halong_remos', 'pajarillo_llano'];
/** Duración exacta de cada tema: compases por lo que dura cada uno. */
const DURACION: Record<string, number> = {
  champeta_murallas: 20 * 8 * (60 / 132 / 2),
  cafe_neblina: 32 * 6 * (60 / 124 / 3),
  halong_remos: 16 * 8 * (60 / 108 / 2),
  pajarillo_llano: 40 * 6 * (60 / 196 / 2),
};

const rms = (b: ArrayLike<number>, from = 0, to = b.length) => { let s = 0; for (let i = from; i < to; i++) s += b[i] * b[i]; return Math.sqrt(s / Math.max(1, to - from)); };
const peak = (b: Float32Array) => { let p = 0; for (const v of b) p = Math.max(p, Math.abs(v)); return p; };
const hash = (b: Float32Array) => createHash('sha256').update(Buffer.from(b.buffer, b.byteOffset, b.byteLength)).digest('hex');
/** Cuántas veces cruza el cero por segundo: lo brillante u opaco de un sonido. */
const cruces = (s: Float32Array) => { let n = 0; for (let i = 1; i < s.length; i++) if ((s[i - 1] < 0) !== (s[i] < 0)) n++; return (n / s.length) * RATE; };
/** La parte de la energía que va por debajo de unos 200 Hz (el bombo y el bajo). */
const graves = (s: Float32Array) => { const a = Math.exp((-2 * Math.PI * 200) / RATE); let y = 0, el = 0, et = 0; for (const v of s) { y = a * y + (1 - a) * v; el += y * y; et += v * v; } return el / et; };

describe('audio de los mundos de atletismo y natación (lote H4)', () => {
  const temas = Object.fromEntries(TEMAS.map((n) => [n, renderSound('musica', n)]));

  it('trae un tema por mundo, en el catálogo del motor, y cafe_neblina con el nombre del pedido', () => {
    expect(Object.keys(MUSIC_ATLETISMO)).toEqual(TEMAS);
    for (const n of TEMAS) expect(SONIDOS.musica, n).toContain(n);
    expect(new Set(SONIDOS.musica).size).toBe(SONIDOS.musica.length);
  });

  it('cada tema dura sus compases exactos, entre 29 y 42 s, va en bucle y suena todo el tiempo', () => {
    for (const n of TEMAS) {
      const { samples: s, loop } = temas[n];
      expect(loop, n).toBe(true);
      expect(s.length / RATE, n).toBeCloseTo(DURACION[n], 3);
      expect(s.length / RATE, n).toBeGreaterThanOrEqual(29);
      expect(s.length / RATE, n).toBeLessThanOrEqual(42);
      for (let i = 0; i + RATE / 2 <= s.length; i += RATE / 2) {
        const r = rms(s, i, i + RATE / 2);
        expect(r, `${n} en ${i / RATE} s`).toBeGreaterThan(0.03);
        expect(r, `${n} en ${i / RATE} s`).toBeLessThan(0.5);
      }
    }
  });

  it('no saturan: el pico queda en 0.9, casi nada llega cerca del tope y no hay componente continua', () => {
    for (const n of TEMAS) {
      const s = temas[n].samples;
      expect(peak(s), n).toBeLessThanOrEqual(0.9 + 1e-6);
      let cerca = 0; for (const v of s) if (Math.abs(v) > 0.85) cerca++;
      expect(cerca / s.length, n).toBeLessThan(0.001);
      let dc = 0; for (const v of s) dc += v;
      expect(Math.abs(dc / s.length), n).toBeLessThan(0.005);
    }
  });

  it('el bucle empalma sin corte: el final sigue en el principio sin salto ni cambio de volumen', () => {
    for (const n of TEMAS) {
      const s = temas[n].samples;
      const saltos: number[] = [];
      for (let i = 1; i < s.length; i++) saltos.push(Math.abs(s[i] - s[i - 1]));
      saltos.sort((a, b) => a - b);
      expect(Math.abs(s[0] - s[s.length - 1]), n).toBeLessThanOrEqual(saltos[Math.floor(saltos.length * 0.99)]);
      const seg = Array.from({ length: Math.floor(s.length / RATE) }, (_, k) => rms(s, k * RATE, (k + 1) * RATE)).sort((a, b) => a - b);
      const mediana = seg[Math.floor(seg.length / 2)];
      expect(rms(s, s.length - RATE) / mediana, `${n}: final`).toBeGreaterThan(0.5);
      expect(rms(s, 0, RATE) / mediana, `${n}: principio`).toBeGreaterThan(0.5);
    }
  });

  it('cada tema es distinto de todos los del catálogo: otro largo y otra pieza', () => {
    const otros = SONIDOS.musica.filter((n) => !TEMAS.includes(n));
    const largo = (n: string) => (renderSound('musica', n).samples.length / RATE).toFixed(1);
    const deOtros = new Set(otros.map(largo));
    for (const n of TEMAS) expect(deOtros.has(largo(n)), `${n} dura lo mismo que otro tema`).toBe(false);
    expect(new Set(TEMAS.map(largo)).size).toBe(TEMAS.length);
    expect(new Set(TEMAS.map((n) => hash(temas[n].samples))).size).toBe(TEMAS.length);
    // sintetiza los 22 temas del catálogo: con la suite completa al lado tarda más de los 30 s de siempre
  }, 120_000);

  it('cada uno tiene su carácter: la champeta con el bajo adelante y el pajarillo el más brillante, más que el joropo de Caracas', () => {
    const g = Object.fromEntries(TEMAS.map((n) => [n, graves(temas[n].samples)]));
    // la champeta suena como en un picó: más de la mitad de la energía va en el bombo y el bajo; los otros tres son de cuerdas punteadas
    expect(g.champeta_murallas).toBeGreaterThan(0.5);
    for (const n of TEMAS.filter((x) => x !== 'champeta_murallas')) expect(g[n], n).toBeLessThan(g.champeta_murallas * 0.6);
    // el pajarillo es recio: con las maracas escobilladas y la bandola, el más brillante de los cuatro y más que pana_dale
    const z = Object.fromEntries([...TEMAS, 'pana_dale'].map((n) => [n, cruces(renderSound('musica', n).samples)]));
    for (const n of [...TEMAS.filter((x) => x !== 'pajarillo_llano'), 'pana_dale']) expect(z.pajarillo_llano, n).toBeGreaterThan(z[n] * 1.1);
  });

  it('determinista: sale igual siempre, se pida solo o después de otros', () => {
    for (const n of TEMAS) expect(hash(renderSound('musica', n).samples), n).toBe(hash(temas[n].samples));
  });

  it('el kit los exporta, sin pendientes, y escuchar.html los toca', () => {
    const cfg: KitConfig = { juego: 'Prueba', personajes_incluidos: ['familia'], packs: { base: ['idle'] }, audio: { musica: TEMAS } };
    expect(validateKitConfig(cfg)).toEqual([]);
    const { files, warnings } = buildCustomKit(cfg, {}, { quick: true, solo: ['audio'] });
    expect(warnings).toEqual([]);
    const m = JSON.parse(new TextDecoder().decode(files.find((f) => f.name === 'manifest.json')!.bytes));
    expect(m.pendiente).toBeUndefined();
    for (const n of TEMAS) {
      expect(m.audio.musica[n], n).toMatchObject({ archivo: `audio/musica/${n}.wav`, bucle: true });
      expect(m.audio.musica[n].duracion, n).toBeCloseTo(DURACION[n], 1);
    }
    const html = new TextDecoder().decode(files.find((f) => f.name === 'audio/escuchar.html')!.bytes);
    for (const n of TEMAS) expect(html, n).toContain(`"n":"${n}"`);
  });
});
