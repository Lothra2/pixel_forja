import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { AMBIENCE_NAMES } from '../audio/ambience';
import { SONIDOS, renderSound } from '../audio/catalogo';
import { RATE } from '../audio/sfx';
import { buildCustomKit, validateKitConfig, type KitConfig } from '../kit/custom';

/** Lo que pide el lote H6: los ambientes de 12 s de los mundos que ya tienen escenario. */
const NUEVOS = ['mar', 'cafetal', 'llano'];
const ANTES = ['bosque', 'agua', 'noche', 'viento', 'cueva', 'magia'];

const rms = (b: ArrayLike<number>, from = 0, to = b.length) => { let s = 0; for (let i = from; i < to; i++) s += b[i] * b[i]; return Math.sqrt(s / Math.max(1, to - from)); };
const peak = (b: Float32Array) => { let p = 0; for (const v of b) p = Math.max(p, Math.abs(v)); return p; };
const hash = (b: Float32Array) => createHash('sha256').update(Buffer.from(b.buffer, b.byteOffset, b.byteLength)).digest('hex');
const cruces = (s: Float32Array) => { let n = 0; for (let i = 1; i < s.length; i++) if ((s[i - 1] < 0) !== (s[i] < 0)) n++; return (n / s.length) * RATE; };
const agudo = (s: Float32Array) => { const d = new Float32Array(s.length); for (let i = 1; i < s.length; i++) d[i] = s[i] - s[i - 1]; return d; };
const ms = (t: number) => Math.round(t * RATE);
/** Altura (Hz) y qué tan clara es (0..1) en una ventana de `W` s, por autocorrelación entre `lo` y `hi`. */
function altura(s: Float32Array, t: number, lo: number, hi: number, W = 0.08): [number, number] {
  const i0 = ms(t), N = ms(W);
  let best = 0, lag = 0;
  for (let L = Math.floor(RATE / hi); L <= Math.ceil(RATE / lo); L++) {
    let c = 0, e1 = 0, e2 = 0;
    for (let i = i0; i < i0 + N; i++) { c += s[i] * s[i + L]; e1 += s[i] * s[i]; e2 += s[i + L] * s[i + L]; }
    const r = c / Math.sqrt(e1 * e2 + 1e-12);
    if (r > best) { best = r; lag = L; }
  }
  return [RATE / lag, best];
}
/** El volumen en ventanas de `w` s a lo largo de los 12 s. */
const ventanas = (s: Float32Array, w: number) => { const o: number[] = []; for (let t = 0; t + w <= 12 + 1e-9; t += w) o.push(rms(s, ms(t), ms(t + w))); return o; };

describe('ambientes de los mundos del olímpico (lote H6)', () => {
  const amb = Object.fromEntries([...NUEVOS, ...ANTES].map((n) => [n, renderSound('ambientes', n)]));

  it('los tres están en el catálogo, junto a los seis de antes, y ninguno pisa un nombre', () => {
    expect(AMBIENCE_NAMES).toEqual([...ANTES, ...NUEVOS]);
    for (const n of NUEVOS) expect(SONIDOS.ambientes, n).toContain(n);
    expect(new Set(SONIDOS.ambientes).size).toBe(SONIDOS.ambientes.length);
  });

  it('duran 12 s exactos, van en bucle, suenan todo el tiempo, no saturan y no tienen componente continua', () => {
    for (const n of NUEVOS) {
      const { samples: s, loop } = amb[n];
      expect(loop, n).toBe(true);
      expect(s.length, n).toBe(12 * RATE);
      expect(peak(s), n).toBeCloseTo(0.5, 3);
      expect(rms(s), n).toBeGreaterThan(0.05);
      for (const [k, v] of ventanas(s, 0.5).entries()) expect(v, `${n} en ${k * 0.5} s`).toBeGreaterThan(0.015);
      let m = 0; for (const v of s) m += v; expect(Math.abs(m / s.length), n).toBeLessThan(0.002);
    }
  });

  it('el bucle empalma sin corte: el salto del final al principio es como cualquier otro y el volumen sigue igual', () => {
    for (const n of NUEVOS) {
      const s = amb[n].samples, saltos: number[] = [];
      for (let i = 1; i < s.length; i++) saltos.push(Math.abs(s[i] - s[i - 1]));
      saltos.sort((a, b) => a - b);
      expect(Math.abs(s[0] - s[s.length - 1]), n).toBeLessThan(saltos[Math.floor(saltos.length * 0.99)]);
      const v = ventanas(s, 1), med = [...v].sort((a, b) => a - b)[6];
      expect(v[0] / med, `${n} primer segundo`).toBeGreaterThan(0.5); expect(v[0] / med, `${n} primer segundo`).toBeLessThan(2);
      expect(v[11] / med, `${n} último segundo`).toBeGreaterThan(0.4); expect(v[11] / med, `${n} último segundo`).toBeLessThan(2);
    }
  });

  it('el mar: tres olas que revientan (cada una más del doble de fuerte que la calma de antes de la siguiente)', () => {
    const v = ventanas(amb.mar.samples, 0.25), en = (a: number, b: number) => v.slice(Math.round(a / 0.25), Math.round(b / 0.25));
    for (const [rompe, calma] of [[[0.25, 1.75], [2.75, 4]], [[4.25, 5.75], [6.5, 8]], [[8, 9.5], [10.5, 12]]] as [number[], number[]][]) {
      expect(Math.max(...en(rompe[0], rompe[1])), `ola en ${rompe[0]} s`).toBeGreaterThan(Math.min(...en(calma[0], calma[1])) * 2);
    }
  });

  it('el cafetal trae la vaca a lo lejos; el llano el ganado, el alcaraván y las chicharras que no se callan', () => {
    // la vaca de Cocora: un mugido grave y claro (unos 150 Hz que bajan)
    const [fv, cv] = altura(amb.cafetal.samples, 6.6, 80, 400);
    expect(cv).toBeGreaterThan(0.5); expect(fv).toBeGreaterThan(120); expect(fv).toBeLessThan(170);
    // el ganado del llano: más grave
    const [fg, cg] = altura(amb.llano.samples, 5.5, 80, 400);
    expect(cg).toBeGreaterThan(0.5); expect(fg).toBeGreaterThan(115); expect(fg).toBeLessThan(150);
    expect(fg).toBeLessThan(fv);
    // el alcaraván, dos veces: golpes de 1100 a 1400 Hz
    for (const t of [2.62, 8.92]) { const [f, c] = altura(amb.llano.samples, t, 800, 2000, 0.04); expect(c, `alcaraván en ${t}`).toBeGreaterThan(0.45); expect(f).toBeGreaterThan(1100); expect(f).toBeLessThan(1400); }
    // las chicharras: en cada segundo del llano hay agudo, más que en cualquier segundo del cafetal o del mar
    const ag = (s: Float32Array) => Array.from({ length: 12 }, (_, k) => rms(agudo(s), ms(k), ms(k + 1)) / rms(s, ms(k), ms(k + 1)));
    expect(Math.min(...ag(amb.llano.samples))).toBeGreaterThan(Math.min(...ag(amb.cafetal.samples)) * 1.6);
    expect(Math.min(...ag(amb.llano.samples))).toBeGreaterThan(Math.min(...ag(amb.mar.samples)) * 1.6);
  });

  it('cada ambiente nuevo es distinto de los otros y de los seis de antes', () => {
    const rasgos = (n: string) => {
      const s = amb[n].samples, v = ventanas(s, 0.5), m = v.reduce((a, b) => a + b) / v.length;
      const ag = Array.from({ length: 12 }, (_, k) => rms(agudo(s), ms(k), ms(k + 1)) / rms(s, ms(k), ms(k + 1)));
      return [cruces(s), Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length) / m, rms(s), Math.min(...ag)];
    };
    const f = Object.fromEntries([...NUEVOS, ...ANTES].map((n) => [n, rasgos(n)]));
    for (const a of NUEVOS) for (const b of [...NUEVOS, ...ANTES]) {
      if (a === b) continue;
      const dif = Math.max(...f[a].map((x, k) => Math.abs(Math.log(x / f[b][k]))));
      expect(dif, `${a} y ${b} se parecen demasiado`).toBeGreaterThan(Math.log(1.2));
    }
  });

  it('determinista: sale igual siempre, se pida solo o después de otros', () => {
    for (const n of [...NUEVOS].reverse()) expect(hash(renderSound('ambientes', n).samples), n).toBe(hash(amb[n].samples));
  });

  it('el kit los exporta en audio/ambiente, en bucle, sin pendientes, y escuchar.html los toca', () => {
    const cfg: KitConfig = { juego: 'Prueba', personajes_incluidos: ['familia'], packs: { base: ['idle'] }, audio: { ambientes: NUEVOS } };
    expect(validateKitConfig(cfg)).toEqual([]);
    const { files, warnings } = buildCustomKit(cfg, {}, { quick: true, solo: ['audio'] });
    expect(warnings).toEqual([]);
    const m = JSON.parse(new TextDecoder().decode(files.find((f) => f.name === 'manifest.json')!.bytes));
    expect(m.pendiente).toBeUndefined();
    for (const n of NUEVOS) {
      expect(m.audio.ambientes[n], n).toMatchObject({ archivo: `audio/ambiente/${n}.wav`, bucle: true });
      expect(m.audio.ambientes[n].duracion, n).toBeCloseTo(12, 2);
    }
    const html = new TextDecoder().decode(files.find((f) => f.name === 'audio/escuchar.html')!.bytes);
    for (const n of NUEVOS) expect(html, n).toContain(`"n":"${n}"`);
  });
});
