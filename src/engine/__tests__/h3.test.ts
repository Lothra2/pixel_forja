import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { MUSIC_PELOTA, SFX_PELOTA } from '../audio/pelota';
import { MUSIC_MUNDOS } from '../audio/mundos';
import { SONIDOS, renderSound } from '../audio/catalogo';
import { RATE } from '../audio/sfx';
import { buildCustomKit, validateKitConfig, type KitConfig } from '../kit/custom';

/** Lo que pide el lote H3: un tema por mundo de pelota nuevo y los efectos de la red, el balón, el aro y la chapa. */
const TEMAS = ['carnaval_quilla', 'playa_margarita', 'dalat_niebla'];
const EFECTOS = ['red_voley', 'rebote_balon', 'aro_basket', 'aro_fallo', 'chapa'];
/** Duración exacta de cada tema: compases por lo que dura cada uno. */
const DURACION: Record<string, number> = {
  carnaval_quilla: 16 * 8 * (60 / 116 / 2),
  playa_margarita: 32 * 6 * (60 / 144 / 2),
  dalat_niebla: 20 * 6 * (60 / 96 / 2),
};

const rms = (b: ArrayLike<number>, from = 0, to = b.length) => { let s = 0; for (let i = from; i < to; i++) s += b[i] * b[i]; return Math.sqrt(s / Math.max(1, to - from)); };
const peak = (b: Float32Array) => { let p = 0; for (const v of b) p = Math.max(p, Math.abs(v)); return p; };
const hash = (b: Float32Array) => createHash('sha256').update(Buffer.from(b.buffer, b.byteOffset, b.byteLength)).digest('hex');
/** Cuántas veces cruza el cero por segundo: lo brillante u opaco de un sonido. */
const cruces = (s: Float32Array) => { let n = 0; for (let i = 1; i < s.length; i++) if ((s[i - 1] < 0) !== (s[i] < 0)) n++; return (n / s.length) * RATE; };
/** La diferencia entre muestras: se queda con lo agudo (el roce, el swish) y baja lo grave. */
const agudo = (s: Float32Array) => { const d = new Float32Array(s.length); for (let i = 1; i < s.length; i++) d[i] = s[i] - s[i - 1]; return d; };
const ms = (t: number) => Math.round(t * RATE);
/** Altura (Hz) y qué tan clara es (0..1) en una ventana de 40 ms, por autocorrelación entre `lo` y `hi`. */
function altura(s: Float32Array, t: number, lo: number, hi: number): [number, number] {
  const i0 = ms(t), W = ms(0.04);
  let best = 0, lag = 0;
  for (let L = Math.floor(RATE / hi); L <= Math.ceil(RATE / lo); L++) {
    let c = 0, e1 = 0, e2 = 0;
    for (let i = i0; i < i0 + W; i++) { c += s[i] * s[i + L]; e1 += s[i] * s[i]; e2 += s[i + L] * s[i + L]; }
    const r = c / Math.sqrt(e1 * e2 + 1e-12);
    if (r > best) { best = r; lag = L; }
  }
  return [RATE / lag, best];
}

describe('audio de los mundos de pelota (lote H3)', () => {
  const temas = Object.fromEntries(TEMAS.map((n) => [n, renderSound('musica', n)]));
  const efectos = Object.fromEntries(EFECTOS.map((n) => [n, renderSound('sfx', n).samples]));

  it('trae un tema por mundo nuevo y los efectos, en el catálogo del motor', () => {
    expect(Object.keys(MUSIC_PELOTA)).toEqual(TEMAS);
    expect(Object.keys(SFX_PELOTA)).toEqual(EFECTOS);
    for (const n of TEMAS) expect(SONIDOS.musica, n).toContain(n);
    for (const n of EFECTOS) expect(SONIDOS.sfx, n).toContain(n);
    // nada pisa un nombre que ya existía
    expect(new Set(SONIDOS.sfx).size).toBe(SONIDOS.sfx.length);
    expect(new Set(SONIDOS.musica).size).toBe(SONIDOS.musica.length);
  });

  it('cada tema dura sus compases exactos, entre 29 y 42 s, va en bucle y suena todo el tiempo', () => {
    for (const n of TEMAS) {
      const { samples: s, loop } = temas[n];
      expect(loop, n).toBe(true);
      expect(s.length / RATE, n).toBeCloseTo(DURACION[n], 3);
      expect(s.length / RATE, n).toBeGreaterThanOrEqual(29);
      expect(s.length / RATE, n).toBeLessThanOrEqual(42);
      // ningún medio segundo en silencio, y ninguno que sea puro ruido a tope
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
      // sin fundido: el último segundo y el primero suenan como el resto
      const seg = Array.from({ length: Math.floor(s.length / RATE) }, (_, k) => rms(s, k * RATE, (k + 1) * RATE)).sort((a, b) => a - b);
      const mediana = seg[Math.floor(seg.length / 2)];
      expect(rms(s, s.length - RATE) / mediana, `${n}: final`).toBeGreaterThan(0.5);
      expect(rms(s, 0, RATE) / mediana, `${n}: principio`).toBeGreaterThan(0.5);
    }
  });

  it('cada tema es distinto, también de los de H2: otro largo y otra pieza', () => {
    const todos = [...TEMAS, ...Object.keys(MUSIC_MUNDOS)];
    const largo = todos.map((n) => (renderSound('musica', n).samples.length / RATE).toFixed(1));
    expect(new Set(largo).size).toBe(todos.length);
    expect(new Set(TEMAS.map((n) => hash(temas[n].samples))).size).toBe(TEMAS.length);
    // Đà Lạt es el tranquilo: el más opaco de los tres
    const z = Object.fromEntries(TEMAS.map((n) => [n, cruces(temas[n].samples)]));
    expect(z.dalat_niebla).toBeLessThan(Math.min(z.carnaval_quilla, z.playa_margarita));
  });

  it('los efectos son cortos, arrancan de una, no saturan y no arrastran silencio', () => {
    const largo: Record<string, [number, number]> = { red_voley: [0.3, 0.6], rebote_balon: [0.15, 0.4], aro_basket: [0.55, 0.9], aro_fallo: [0.4, 0.6], chapa: [0.15, 0.4] };
    for (const n of EFECTOS) {
      const s = efectos[n], d = s.length / RATE;
      expect(d, n).toBeGreaterThanOrEqual(largo[n][0]);
      expect(d, n).toBeLessThanOrEqual(largo[n][1]);
      expect(peak(s), n).toBeLessThanOrEqual(0.9);
      expect(rms(s), n).toBeGreaterThan(0.1);
      expect(peak(s.subarray(0, ms(0.01))), `${n}: arranque`).toBeGreaterThan(0.1);
      expect(rms(s, s.length - ms(0.02)), `${n}: cola`).toBeLessThan(0.05);
      const W = ms(0.05);
      for (let i = 0; i + W <= s.length - ms(0.08); i += W) expect(rms(s, i, i + W), `${n} en ${(i / RATE).toFixed(2)} s`).toBeGreaterThan(0.003);
    }
  });

  it('cada uno tiene su forma: el balón suena hueco, la red tiembla, el aro canta y la chapa brilla', () => {
    // el rebote: el "pung" del balón, una nota grave y clara que baja un poco
    const [f0, c0] = altura(efectos.rebote_balon, 0.02, 60, 600), [f1, c1] = altura(efectos.rebote_balon, 0.1, 60, 600);
    expect(c0).toBeGreaterThan(0.85); expect(c1).toBeGreaterThan(0.85);
    expect(f0).toBeGreaterThan(140); expect(f0).toBeLessThan(230);
    expect(f1).toBeLessThan(f0);
    // la red: la cuerda de arriba vibra grave (90 a 110 Hz) y la red dura más que el rebote seco
    const [fr, cr] = altura(efectos.red_voley, 0.1, 60, 600);
    expect(cr).toBeGreaterThan(0.9); expect(fr).toBeGreaterThan(85); expect(fr).toBeLessThan(115);
    expect(efectos.red_voley.length).toBeGreaterThan(efectos.rebote_balon.length * 1.25);
    // el aro: la canasta y el fallo empiezan igual (tablero y aro)...
    const a = efectos.aro_basket, f = efectos.aro_fallo, L = ms(0.15);
    let c = 0, ea = 0, ef = 0; for (let i = 0; i < L; i++) { c += a[i] * f[i]; ea += a[i] * a[i]; ef += f[i] * f[i]; }
    expect(c / Math.sqrt(ea * ef)).toBeGreaterThan(0.9);
    // ...y el hierro sigue sonando después del golpe
    expect(rms(f, ms(0.3), ms(0.35))).toBeGreaterThan(rms(f, 0, ms(0.1)) * 0.2);
    // la canasta trae el swish de la red: mucho más agudo que el fallo después del golpe
    expect(rms(agudo(a), ms(0.25), ms(0.45))).toBeGreaterThan(rms(agudo(f), ms(0.25), ms(0.45)) * 2);
    // el fallo trae el segundo toque del balón en el aro: ahí suena más que la canasta, que no lo tiene
    expect(rms(f, ms(0.17), ms(0.23))).toBeGreaterThan(rms(a, ms(0.17), ms(0.23)) * 1.1);
    // la chapa: la lata es lo más brillante de todo, más que el toque de đá cầu
    const z = Object.fromEntries([...EFECTOS, 'toque_cau'].map((n) => [n, cruces(renderSound('sfx', n).samples)]));
    for (const n of [...EFECTOS.filter((x) => x !== 'chapa'), 'toque_cau']) expect(z.chapa, n).toBeGreaterThan(z[n] * 1.25);
  });

  it('cada efecto es distinto, también de los golpes y los que el juego usa hoy en esas jugadas', () => {
    const todos = [...EFECTOS, 'golpe', 'bloqueo', 'romper', 'toque_cau', 'caida_tatami', 'caer_plano', 'golpe_pesado', 'mecha_tejo', 'pistola', 'silbato'];
    const f = Object.fromEntries(todos.map((n) => { const s = renderSound('sfx', n).samples; return [n, { d: s.length / RATE, z: cruces(s), r: rms(s) }]; }));
    for (let i = 0; i < todos.length; i++) for (let j = i + 1; j < todos.length; j++) {
      const a = f[todos[i]], b = f[todos[j]];
      const dif = Math.max(Math.abs(Math.log(a.d / b.d)), Math.abs(Math.log(a.z / b.z)), Math.abs(Math.log(a.r / b.r)));
      expect(dif, `${todos[i]} y ${todos[j]} se parecen demasiado`).toBeGreaterThan(Math.log(1.25));
    }
  });

  it('determinista: sale igual siempre, se pida solo o después de otros', () => {
    for (const n of EFECTOS) expect(hash(renderSound('sfx', n).samples), n).toBe(hash(efectos[n]));
    for (const n of TEMAS) expect(hash(renderSound('musica', n).samples), n).toBe(hash(temas[n].samples));
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
    const wav = files.find((f) => f.name === 'audio/musica/dalat_niebla.wav')!.bytes;
    expect(new DataView(wav.buffer, wav.byteOffset).getUint16(22, true)).toBe(1);
  });
});
