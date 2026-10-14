import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { SFX_ATLETISMO } from '../audio/atletismo';
import { SONIDOS, renderSound } from '../audio/catalogo';
import { RATE } from '../audio/sfx';
import { buildCustomKit, validateKitConfig, type KitConfig } from '../kit/custom';
import { humanAnim } from '../anim/registry';
import type { AnimEvent } from '../anim/types';
import { SWIM_PREMIUM } from '../anim/swim';

/** Lo que pide el lote H5: los efectos de la natación y la garrocha. */
const EFECTOS = ['chapuzon', 'brazada', 'salida_natacion', 'garrocha'];

const rms = (b: ArrayLike<number>, from = 0, to = b.length) => { let s = 0; for (let i = from; i < to; i++) s += b[i] * b[i]; return Math.sqrt(s / Math.max(1, to - from)); };
const peak = (b: Float32Array) => { let p = 0; for (const v of b) p = Math.max(p, Math.abs(v)); return p; };
const hash = (b: Float32Array) => createHash('sha256').update(Buffer.from(b.buffer, b.byteOffset, b.byteLength)).digest('hex');
/** Cuántas veces cruza el cero por segundo: lo brillante u opaco de un sonido. */
const cruces = (s: Float32Array) => { let n = 0; for (let i = 1; i < s.length; i++) if ((s[i - 1] < 0) !== (s[i] < 0)) n++; return (n / s.length) * RATE; };
/** La diferencia entre muestras: se queda con lo agudo (el latigazo, las gotas) y baja lo grave. */
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

describe('efectos de la natación y la garrocha (lote H5)', () => {
  const efectos = Object.fromEntries(EFECTOS.map((n) => [n, renderSound('sfx', n).samples]));

  it('los cuatro están en el catálogo del motor y ninguno pisa un nombre que ya existía', () => {
    expect(Object.keys(SFX_ATLETISMO)).toEqual(EFECTOS);
    for (const n of EFECTOS) expect(SONIDOS.sfx, n).toContain(n);
    expect(new Set(SONIDOS.sfx).size).toBe(SONIDOS.sfx.length);
    for (const n of EFECTOS) expect(renderSound('sfx', n).loop, n).toBe(false);
  });

  it('son cortos, arrancan de una, no saturan, no tienen huecos mudos y no arrastran silencio', () => {
    const largo: Record<string, [number, number]> = { chapuzon: [0.7, 1], brazada: [0.25, 0.45], salida_natacion: [0.5, 0.7], garrocha: [0.6, 0.9] };
    for (const n of EFECTOS) {
      const s = efectos[n], d = s.length / RATE;
      expect(d, n).toBeGreaterThanOrEqual(largo[n][0]);
      expect(d, n).toBeLessThanOrEqual(largo[n][1]);
      expect(peak(s), n).toBeLessThanOrEqual(0.9);
      expect(rms(s), n).toBeGreaterThan(0.1);
      expect(peak(s.subarray(0, ms(0.01))), `${n}: arranque`).toBeGreaterThan(0.1);
      expect(rms(s, s.length - ms(0.02)), `${n}: cola`).toBeLessThan(0.05);
      const W = ms(0.05);
      for (let i = 0; i + W <= s.length - ms(0.08); i += W) expect(rms(s, i, i + W), `${n} en ${(i / RATE).toFixed(2)} s`).toBeGreaterThan(0.005);
    }
  });

  it('cada uno tiene su forma: la bocina es un tono fijo, la garrocha sube y suelta, el chapuzón se queda burbujeando', () => {
    // la bocina: un tono fijo y claro (415 Hz con sus armónicos), igual al principio y al final, y fuerte todo el rato
    const [f0, c0] = altura(efectos.salida_natacion, 0.1, 300, 1500), [f1, c1] = altura(efectos.salida_natacion, 0.4, 300, 1500);
    expect(c0).toBeGreaterThan(0.9); expect(c1).toBeGreaterThan(0.9);
    expect(f0).toBeGreaterThan(380); expect(f0).toBeLessThan(460);
    expect(Math.abs(f1 - f0)).toBeLessThan(5);
    expect(rms(efectos.salida_natacion, ms(0.1), ms(0.4))).toBeGreaterThan(0.3);
    // la garrocha: la pértiga que se dobla sube de tono (grave y clara), y al soltarse viene el latigazo agudo
    const g = efectos.garrocha, alt = [0.08, 0.14, 0.2, 0.26].map((t) => altura(g, t, 50, 400));
    for (const [, c] of alt) expect(c).toBeGreaterThan(0.9);
    for (let i = 1; i < alt.length; i++) expect(alt[i][0]).toBeGreaterThan(alt[i - 1][0]);
    expect(alt[0][0]).toBeLessThan(100); expect(alt[3][0]).toBeGreaterThan(alt[0][0] * 1.4);
    // el latigazo cae en `suelta` de pole_vault: 4 cuadros a 12 fps después de `despegue`, donde va el sonido
    const pv = humanAnim('pole_vault')!, ev = (t: string) => pv.events!.find((e: AnimEvent) => e.type === t)!.phase, d = ev('despegue'), su = ev('suelta');
    // 14 cuadros: despegue en el 3 y suelta en el 7
    const suelta = ((su - d) * 14) / pv.fps;
    expect(suelta).toBeCloseTo(1 / 3, 3);
    expect(rms(agudo(g), ms(suelta), ms(suelta + 0.12))).toBeGreaterThan(rms(agudo(g), ms(0.12), ms(0.3)) * 3);
    expect(rms(agudo(g), ms(suelta - 0.04), ms(suelta - 0.005))).toBeLessThan(rms(agudo(g), ms(suelta), ms(suelta + 0.04)) / 3);
    // el chapuzón: el golpe fuerte y después el agua que sigue sonando (burbujas y gotas), mucho más largo que la brazada
    const ch = efectos.chapuzon;
    expect(rms(ch, ms(0.3), ms(0.6))).toBeGreaterThan(0.02);
    expect(rms(ch, 0, ms(0.1))).toBeGreaterThan(rms(ch, ms(0.3), ms(0.6)) * 4);
    expect(ch.length).toBeGreaterThan(efectos.brazada.length * 2);
  });

  it('cada efecto es distinto, también de los que el juego usa hoy en esas jugadas', () => {
    // hoy Natacion.ts usa `esquiva` para el chapuzón, la base un blip para el ¡YA! y Azoteas.ts `golpe` y `esquiva`
    const todos = [...EFECTOS, 'esquiva', 'golpe', 'pistola', 'silbato', 'romper', 'paso_agua_0', 'red_voley', 'chapa'];
    const f = Object.fromEntries(todos.map((n) => { const s = renderSound('sfx', n).samples; return [n, { d: s.length / RATE, z: cruces(s), r: rms(s) }]; }));
    for (let i = 0; i < todos.length; i++) for (let j = i + 1; j < todos.length; j++) {
      const a = f[todos[i]], b = f[todos[j]];
      const dif = Math.max(Math.abs(Math.log(a.d / b.d)), Math.abs(Math.log(a.z / b.z)), Math.abs(Math.log(a.r / b.r)));
      expect(dif, `${todos[i]} y ${todos[j]} se parecen demasiado`).toBeGreaterThan(Math.log(1.25));
    }
  });

  it('los nados dicen en qué cuadro entra la mano al agua (evento brazada), y llega al manifiesto del kit', () => {
    const nado = (a: string) => SWIM_PREMIUM.find((d) => d.name === a)!;
    const fases = (a: string) => nado(a).events!.filter((e: AnimEvent) => e.type === 'brazada').map((e: AnimEvent) => e.phase);
    expect(fases('swim')).toEqual([0, 0.5]);
    expect(fases('swim_back')).toEqual([0, 0.5]);
    expect(fases('swim_breast')).toEqual([5 / 8]);
    expect(fases('swim_fly')).toEqual([0]);
    // una brazada cabe entre dos manos del crol (10 fps, 4 cuadros entre una y otra) sin taparse
    expect(efectos.brazada.length / RATE).toBeLessThan(4 / nado('swim').fps);
    const cfg: KitConfig = { juego: 'Prueba', personajes_incluidos: ['familia'], packs: { crol: ['swim', 'swim_back'], otros: ['swim_breast', 'swim_fly'], clavado: ['dive'] } };
    // el modo rápido dibuja las dos últimas de cada pack: por eso van de a dos
    const { files } = buildCustomKit(cfg, {}, { quick: true, solo: ['atletas'] });
    const m = JSON.parse(new TextDecoder().decode(files.find((x) => x.name === 'manifest.json')!.bytes));
    const p = m.atletas.rick.packs, an = { ...p.crol.anims, ...p.otros.anims, ...p.clavado.anims }, ev = (a: string) => an[a].eventos.map((e: { tipo: string; cuadro: number }) => `${e.tipo} ${e.cuadro}`);
    expect(ev('swim')).toEqual(['brazada 0', 'brazada 4']);
    expect(ev('swim_back')).toEqual(['brazada 0', 'brazada 4']);
    expect(ev('swim_breast')).toEqual(['brazada 5']);
    expect(ev('swim_fly')).toEqual(['brazada 0']);
    // el chapuzón va en el impacto del clavado, que sigue igual
    expect(ev('dive')).toEqual(['despegue 3', 'impacto 6']);
  });

  it('determinista: sale igual siempre, se pida solo o después de otros', () => {
    for (const n of [...EFECTOS].reverse()) expect(hash(renderSound('sfx', n).samples), n).toBe(hash(efectos[n]));
  });

  it('el kit los exporta, sin pendientes, y escuchar.html los toca', () => {
    const cfg: KitConfig = { juego: 'Prueba', personajes_incluidos: ['familia'], packs: { base: ['idle'] }, audio: { sfx: EFECTOS } };
    expect(validateKitConfig(cfg)).toEqual([]);
    const { files, warnings } = buildCustomKit(cfg, {}, { quick: true, solo: ['audio'] });
    expect(warnings).toEqual([]);
    const m = JSON.parse(new TextDecoder().decode(files.find((f) => f.name === 'manifest.json')!.bytes));
    expect(m.pendiente).toBeUndefined();
    for (const n of EFECTOS) expect(m.audio.sfx[n], n).toMatchObject({ archivo: `audio/sfx/${n}.wav` });
    const html = new TextDecoder().decode(files.find((f) => f.name === 'audio/escuchar.html')!.bytes);
    for (const n of EFECTOS) expect(html, n).toContain(`"n":"${n}"`);
  });
});
