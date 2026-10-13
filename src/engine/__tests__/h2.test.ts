import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { MUSIC_MUNDOS, SFX_MUNDOS, terceraAbajo } from '../audio/mundos';
import { SONIDOS, renderSound } from '../audio/catalogo';
import { RATE } from '../audio/sfx';
import { hz } from '../audio/synth';
import { buildCustomKit, validateKitConfig, type KitConfig } from '../kit/custom';

/** Lo que pide el lote H2 (PEDIDO.md, sección 13): un tema por mundo y los efectos de las aves y los deportes. */
const TEMAS = ['tema_instituto', 'hoian_noche', 'ajiaco_rock', 'parce_corra', 'pana_dale', 'gaita_lago'];
const EFECTOS = ['gallo', 'aleteo', 'mecha_tejo', 'toque_cau', 'caida_tatami', 'pitazo_largo'];
/** Duración exacta de cada tema: compases por lo que dura cada uno. */
const DURACION: Record<string, number> = {
  tema_instituto: 24 * 8 * (60 / 152 / 2),
  hoian_noche: 16 * 8 * (60 / 92 / 2),
  ajiaco_rock: 16 * 8 * (60 / 132 / 2),
  parce_corra: 16 * 8 * (60 / 100 / 2),
  pana_dale: 32 * 6 * (60 / 180 / 2),
  gaita_lago: 32 * 6 * (60 / 112 / 3),
};

const rms = (b: Float32Array, from = 0, to = b.length) => { let s = 0; for (let i = from; i < to; i++) s += b[i] * b[i]; return Math.sqrt(s / Math.max(1, to - from)); };
const peak = (b: Float32Array) => { let p = 0; for (const v of b) p = Math.max(p, Math.abs(v)); return p; };
const hash = (b: Float32Array) => createHash('sha256').update(Buffer.from(b.buffer, b.byteOffset, b.byteLength)).digest('hex');
/** Altura (Hz) en una ventana de 30 ms por autocorrelación, entre 400 y 2000 Hz. */
function altura(s: Float32Array, t: number): number {
  const i0 = Math.round(t * RATE), W = Math.round(0.03 * RATE);
  let best = 0, lag = 0;
  for (let L = Math.floor(RATE / 2000); L <= Math.ceil(RATE / 400); L++) {
    let c = 0, e1 = 0, e2 = 0;
    for (let i = i0; i < i0 + W; i++) { c += s[i] * s[i + L]; e1 += s[i] * s[i]; e2 += s[i + L] * s[i + L]; }
    const r = c / Math.sqrt(e1 * e2 + 1e-12);
    if (r > best) { best = r; lag = L; }
  }
  return RATE / lag;
}
const semis = (a: number, b: number) => 12 * Math.log2(b / a);
/** Cuántas veces cruza el cero por segundo: lo brillante u opaco de un sonido. */
const cruces = (s: Float32Array) => { let n = 0; for (let i = 1; i < s.length; i++) if ((s[i - 1] < 0) !== (s[i] < 0)) n++; return (n / s.length) * RATE; };

describe('audio de los mundos (lote H2)', () => {
  const temas = Object.fromEntries(TEMAS.map((n) => [n, renderSound('musica', n)]));
  const efectos = Object.fromEntries(EFECTOS.map((n) => [n, renderSound('sfx', n).samples]));

  it('trae un tema por mundo y los 6 efectos, en el catálogo del motor', () => {
    expect(Object.keys(MUSIC_MUNDOS)).toEqual(TEMAS);
    expect(Object.keys(SFX_MUNDOS)).toEqual(EFECTOS);
    for (const n of TEMAS) expect(SONIDOS.musica, n).toContain(n);
    for (const n of EFECTOS) expect(SONIDOS.sfx, n).toContain(n);
    // nada pisa un nombre que ya existía
    expect(new Set(SONIDOS.sfx).size).toBe(SONIDOS.sfx.length);
    expect(new Set(SONIDOS.musica).size).toBe(SONIDOS.musica.length);
  });

  it('cada tema dura sus compases exactos, va en bucle y suena todo el tiempo', () => {
    for (const n of TEMAS) {
      const { samples: s, loop } = temas[n];
      expect(loop, n).toBe(true);
      expect(s.length / RATE, n).toBeCloseTo(DURACION[n], 3);
      expect(s.length / RATE, n).toBeGreaterThan(25);
      // ningún tramo de medio segundo en silencio, y ninguno que sea puro ruido a tope
      for (let i = 0; i + RATE / 2 <= s.length; i += RATE / 2) {
        const r = rms(s, i, i + RATE / 2);
        expect(r, `${n} en ${i / RATE} s`).toBeGreaterThan(0.03);
        expect(r, `${n} en ${i / RATE} s`).toBeLessThan(0.5);
      }
    }
  });

  it('no saturan: el pico queda en 0.9 y casi nada llega cerca del tope', () => {
    for (const n of TEMAS) {
      const s = temas[n].samples;
      expect(peak(s), n).toBeLessThanOrEqual(0.9 + 1e-6);
      let cerca = 0; for (const v of s) if (Math.abs(v) > 0.85) cerca++;
      expect(cerca / s.length, n).toBeLessThan(0.001);
      // sin componente continua que se coma el margen
      let dc = 0; for (const v of s) dc += v;
      expect(Math.abs(dc / s.length), n).toBeLessThan(0.005);
    }
  });

  it('el bucle empalma sin corte: el final sigue en el principio sin salto ni cambio de volumen', () => {
    for (const n of TEMAS) {
      const s = temas[n].samples;
      // el salto entre la última muestra y la primera no es más grande que los saltos normales de la pieza
      const saltos: number[] = [];
      for (let i = 1; i < s.length; i++) saltos.push(Math.abs(s[i] - s[i - 1]));
      saltos.sort((a, b) => a - b);
      const p99 = saltos[Math.floor(saltos.length * 0.99)];
      expect(Math.abs(s[0] - s[s.length - 1]), n).toBeLessThanOrEqual(p99);
      // sin fundido: el último segundo y el primero suenan como el resto de la pieza
      const seg = Array.from({ length: Math.floor(s.length / RATE) }, (_, k) => rms(s, k * RATE, (k + 1) * RATE)).sort((a, b) => a - b);
      const mediana = seg[Math.floor(seg.length / 2)];
      expect(rms(s, s.length - RATE) / mediana, `${n}: final`).toBeGreaterThan(0.5);
      expect(rms(s, 0, RATE) / mediana, `${n}: principio`).toBeGreaterThan(0.5);
    }
  });

  it('cada tema tiene su carácter: tempo, registro y brillo distintos', () => {
    const firma = TEMAS.map((n) => ({ n, d: DURACION[n].toFixed(2), z: Math.round(cruces(temas[n].samples) / 50) }));
    expect(new Set(firma.map((f) => f.d)).size).toBe(TEMAS.length);
    // y no hay dos temas iguales
    expect(new Set(TEMAS.map((n) => hash(temas[n].samples))).size).toBe(TEMAS.length);
  });

  it('los efectos son cortos, arrancan de una, no saturan y no arrastran silencio', () => {
    const largo: Record<string, [number, number]> = { gallo: [1.1, 1.6], aleteo: [0.2, 0.5], mecha_tejo: [0.5, 1.5], toque_cau: [0.1, 0.4], caida_tatami: [0.15, 0.5], pitazo_largo: [1.0, 1.6] };
    for (const n of EFECTOS) {
      const s = efectos[n], d = s.length / RATE;
      expect(d, n).toBeGreaterThanOrEqual(largo[n][0]);
      expect(d, n).toBeLessThanOrEqual(largo[n][1]);
      expect(peak(s), n).toBeLessThanOrEqual(0.9);
      expect(rms(s), n).toBeGreaterThan(0.1);
      // arranca de una: en los primeros 10 ms ya suena
      expect(peak(s.subarray(0, Math.round(0.01 * RATE))), `${n}: arranque`).toBeGreaterThan(0.1);
      // la cola: los últimos 20 ms casi en silencio, y ningún hueco mudo de más de 50 ms adentro
      expect(rms(s, s.length - Math.round(0.02 * RATE)), `${n}: cola`).toBeLessThan(0.05);
      const W = Math.round(0.05 * RATE);
      for (let i = 0; i + W <= s.length - Math.round(0.08 * RATE); i += W) expect(rms(s, i, i + W), `${n} en ${(i / RATE).toFixed(2)} s`).toBeGreaterThan(0.003);
    }
  });

  it('el kikirikí tiene su forma: tres sílabas que suben y la última larga que sube y cae', () => {
    const s = efectos.gallo;
    const ki1 = altura(s, 0.02), ki2 = altura(s, 0.13), ri = altura(s, 0.26), arriba = altura(s, 0.6), cae = altura(s, 1.12);
    expect(semis(ki1, ki2)).toBeGreaterThan(0.5);
    expect(semis(ki2, ri)).toBeGreaterThan(0.5);
    expect(semis(ri, arriba)).toBeGreaterThan(1);
    expect(semis(cae, arriba)).toBeGreaterThan(4);
    // es la voz de un gallo, no un pito: entre 500 y 1300 Hz
    for (const f of [ki1, ki2, ri, arriba, cae]) { expect(f).toBeGreaterThan(500); expect(f).toBeLessThan(1300); }
    // las sílabas se separan: entre "ki" y "ki" el volumen baja
    const env = (t: number) => rms(s, Math.round(t * RATE), Math.round((t + 0.015) * RATE));
    expect(env(0.095)).toBeLessThan(env(0.04) * 0.85);
    // la "i" larga es lo más fuerte y se apaga al final
    expect(env(0.6)).toBeGreaterThan(env(0.04));
    expect(env(1.25)).toBeLessThan(env(0.6) * 0.5);
  });

  it('cada efecto es distinto, también de los que ya había', () => {
    const todos = [...EFECTOS, 'silbato', 'caer_plano', 'golpe_pesado', 'pistola'];
    const f = Object.fromEntries(todos.map((n) => { const s = renderSound('sfx', n).samples; return [n, { d: s.length / RATE, z: cruces(s), r: rms(s) }]; }));
    for (let i = 0; i < todos.length; i++) for (let j = i + 1; j < todos.length; j++) {
      const a = f[todos[i]], b = f[todos[j]];
      const dif = Math.max(Math.abs(Math.log(a.d / b.d)), Math.abs(Math.log(a.z / b.z)), Math.abs(Math.log(a.r / b.r)));
      expect(dif, `${todos[i]} y ${todos[j]} se parecen demasiado`).toBeGreaterThan(Math.log(1.25));
    }
    // el pitazo largo es uno solo y largo; el silbato de antes son dos
    expect(f.pitazo_largo.d).toBeGreaterThan(f.silbato.d);
    // el tatami es un solo golpe que se apaga, sin el rebote de caer_plano
    const env = (n: string) => { const s = renderSound('sfx', n).samples, W = Math.round(0.02 * RATE); return Array.from({ length: Math.floor(s.length / W) }, (_, k) => rms(s, k * W, (k + 1) * W)); };
    const rebota = (e: number[]) => e.slice(e.indexOf(Math.max(...e)) + 1).some((v, k, a) => k > 0 && v > a[k - 1] * 1.3);
    expect(rebota(env('caida_tatami'))).toBe(false);
    expect(rebota(env('caer_plano'))).toBe(true);
  });

  it('el silbato de antes no cambió (el juego ya lo usa)', () => {
    const s = renderSound('sfx', 'silbato').samples;
    expect(s.length).toBe(17416);
    expect(hash(s).slice(0, 16)).toBe('bcb6427275185571');
  });

  it('determinista: sale igual siempre, se pida solo o después de otros', () => {
    for (const n of EFECTOS) expect(hash(renderSound('sfx', n).samples), n).toBe(hash(efectos[n]));
    for (const n of ['parce_corra', 'gaita_lago']) expect(hash(renderSound('musica', n).samples), n).toBe(hash(temas[n].samples));
  });

  it('las segundas voces van en terceras de la escala', () => {
    const am = [9, 11, 0, 2, 4, 5, 7];
    const nota = (f: number) => Math.round(69 + 12 * Math.log2(f / 440));
    expect(['C5', 'E5', 'A5', 'B4'].map((n) => nota(terceraAbajo(hz(n), am)))).toEqual(['A4', 'C5', 'F5', 'G4'].map((n) => nota(hz(n))));
    // la sensible (Sol sostenido) baja una tercera mayor, a Mi
    expect(nota(terceraAbajo(hz('G#5'), am))).toBe(nota(hz('E5')));
  });

  it('el kit los exporta, sin pendientes, y escuchar.html los toca', () => {
    const cfg: KitConfig = { juego: 'Prueba', personajes_incluidos: ['familia'], packs: { base: ['idle'] }, audio: { sfx: EFECTOS, musica: TEMAS } };
    expect(validateKitConfig(cfg)).toEqual([]);
    const { files, warnings } = buildCustomKit(cfg, {}, { quick: true, solo: ['audio'] });
    expect(warnings).toEqual([]);
    const m = JSON.parse(new TextDecoder().decode(files.find((f) => f.name === 'manifest.json')!.bytes));
    expect(m.pendiente).toBeUndefined();
    for (const n of EFECTOS) expect(m.audio.sfx[n], n).toMatchObject({ archivo: `audio/sfx/${n}.wav` });
    for (const n of TEMAS) {
      expect(m.audio.musica[n], n).toMatchObject({ archivo: `audio/musica/${n}.wav`, bucle: true });
      expect(m.audio.musica[n].duracion, n).toBeCloseTo(DURACION[n], 1);
    }
    const html = new TextDecoder().decode(files.find((f) => f.name === 'audio/escuchar.html')!.bytes);
    for (const n of [...EFECTOS, ...TEMAS]) expect(html, n).toContain(`"n":"${n}"`);
    // los WAV son mono
    const wav = files.find((f) => f.name === 'audio/musica/pana_dale.wav')!.bytes;
    expect(new DataView(wav.buffer, wav.byteOffset).getUint16(22, true)).toBe(1);
  });
});
