import { RATE } from './sfx';

/**
 * Sintetizador de 8/16 bits para música y efectos: notas con envolvente (ataque, caída, sostén y cola), vibrato,
 * glissando, cuerdas punteadas con "nhấn" (doblar la cuerda, como el đàn tranh), batería de banda, eco y bucle sin
 * corte: lo que pasa del final vuelve a sonar al principio. Todo determinista: cada pieza tiene su semilla.
 */

export type Wave = 'square' | 'triangle' | 'saw' | 'sine' | 'noise' | 'pluck';

export interface Note {
  /** empieza en el segundo t */
  t: number;
  /** cuánto se sostiene (s), antes de la cola */
  dur: number;
  f: number;
  wave: Wave;
  vol: number;
  /** ataque, caída, nivel de sostén (0..1) y cola (s) */
  a?: number; d?: number; s?: number; r?: number;
  duty?: number;
  /** vibrato: [Hz, semitonos, desde el segundo] */
  vib?: [number, number, number?];
  /** glissando: de f a f * 2^(semis/12) en `len` segundos, empezando en `at` (s desde el inicio de la nota) */
  bend?: { semis: number; at?: number; len: number };
  /** pasa bajos de un polo (0..1, 1 = sin filtro) */
  lp?: number;
  /** pasa altos de un polo (0..1, 0 = sin filtro) */
  hp?: number;
}

export function rng(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return (s >>> 8) / 16777216; };
}

const NAMES: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
/** Frecuencia de una nota: "A4" = 440, "Bb3", "F#5". */
export function hz(n: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(n);
  if (!m) throw new Error(`nota inválida: ${n}`);
  return 440 * Math.pow(2, (NAMES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) - 4) * 12) / 12);
}

export class Mixer {
  readonly buf: Float32Array;
  readonly n: number;
  private rand: () => number;
  constructor(readonly seconds: number, readonly loop: boolean, seed = 1) {
    this.n = Math.ceil(seconds * RATE);
    // sin bucle, un poco de cola extra al final
    this.buf = new Float32Array(loop ? this.n : this.n + Math.ceil(1.5 * RATE));
    this.rand = rng(seed);
  }
  private put(i: number, v: number) {
    if (this.loop) this.buf[((i % this.n) + this.n) % this.n] += v;
    else if (i >= 0 && i < this.buf.length) this.buf[i] += v;
  }
  add(no: Note) {
    const a = no.a ?? 0.005, d = no.d ?? 0.08, s = no.s ?? 0.7, r = no.r ?? 0.06;
    const total = no.dur + r, len = Math.ceil(total * RATE), start = Math.round(no.t * RATE);
    let ph = 0, lp = 0, hpPrev = 0, hpOut = 0, hold = 0;
    // la cuerda punteada: armónicos que se apagan más rápido cuanto más agudos
    const pl = no.wave === 'pluck' ? [1, 0.5, 0.33, 0.22, 0.12].map((amp, h) => ({ amp, h: h + 1, k: 2.2 + h * 2.4 })) : null;
    for (let i = 0; i < len; i++) {
      const t = i / RATE;
      let f = no.f;
      if (no.bend) {
        const b0 = no.bend.at ?? 0, u = Math.min(1, Math.max(0, (t - b0) / no.bend.len));
        f *= Math.pow(2, (no.bend.semis * (t >= b0 ? u : 0)) / 12);
      }
      if (no.vib && t >= (no.vib[2] ?? 0)) f *= Math.pow(2, (Math.sin(t * no.vib[0] * Math.PI * 2) * no.vib[1]) / 12);
      ph += f / RATE;
      const p = ph - Math.floor(ph);
      let v: number;
      switch (no.wave) {
        case 'square': v = p < (no.duty ?? 0.5) ? 0.8 : -0.8; break;
        case 'triangle': v = p < 0.5 ? p * 4 - 1 : 3 - p * 4; break;
        case 'saw': v = p * 2 - 1; break;
        case 'sine': v = Math.sin(p * Math.PI * 2); break;
        case 'noise': if (ph >= 1) { ph -= Math.floor(ph); hold = this.rand() * 2 - 1; } v = hold; break;
        default: v = 0; for (const o of pl!) v += o.amp * Math.sin(ph * o.h * Math.PI * 2) * Math.exp(-t * o.k);
      }
      if (no.lp !== undefined) { lp += (v - lp) * no.lp; v = lp; }
      if (no.hp) { hpOut = no.hp * (hpOut + v - hpPrev); hpPrev = v; v = hpOut; }
      // envolvente: la cuerda punteada ya trae su caída
      let env: number;
      if (pl) env = Math.min(1, t / 0.002) * (t > no.dur ? Math.max(0, 1 - (t - no.dur) / r) : 1);
      else if (t < a) env = t / a;
      else if (t < a + d) env = 1 - (1 - s) * ((t - a) / d);
      else if (t < no.dur) env = s;
      else env = s * Math.max(0, 1 - (t - no.dur) / r);
      this.put(start + i, v * env * no.vol);
    }
  }
  /** Golpes de batería. */
  drum(kind: 'bombo' | 'bombo_banda' | 'caja' | 'caja_banda' | 'charles' | 'platillo' | 'tom' | 'madera' | 'palmas', t: number, vol = 1) {
    const V = (n: Note) => this.add({ ...n, t, vol: n.vol * vol });
    switch (kind) {
      case 'bombo': V({ t, dur: 0.02, f: 110, wave: 'sine', vol: 0.9, s: 1, r: 0.16, bend: { semis: -14, len: 0.12 } }); break;
      case 'bombo_banda': V({ t, dur: 0.05, f: 72, wave: 'sine', vol: 0.9, s: 1, r: 0.3, bend: { semis: -6, len: 0.2 } }); V({ t, dur: 0.01, f: 400, wave: 'noise', vol: 0.25, s: 1, r: 0.06, lp: 0.2 }); break;
      case 'caja': V({ t, dur: 0.01, f: 6000, wave: 'noise', vol: 0.5, s: 1, r: 0.12, hp: 0.6 }); V({ t, dur: 0.01, f: 190, wave: 'triangle', vol: 0.35, s: 1, r: 0.07 }); break;
      case 'caja_banda': V({ t, dur: 0.005, f: 8000, wave: 'noise', vol: 0.45, s: 1, r: 0.07, hp: 0.75 }); V({ t, dur: 0.005, f: 230, wave: 'triangle', vol: 0.2, s: 1, r: 0.04 }); break;
      case 'charles': V({ t, dur: 0.005, f: 11000, wave: 'noise', vol: 0.18, s: 1, r: 0.03, hp: 0.9 }); break;
      case 'platillo': V({ t, dur: 0.02, f: 9000, wave: 'noise', vol: 0.3, s: 1, r: 1.1, hp: 0.85 }); break;
      case 'tom': V({ t, dur: 0.02, f: 180, wave: 'sine', vol: 0.6, s: 1, r: 0.2, bend: { semis: -5, len: 0.15 } }); break;
      case 'madera': V({ t, dur: 0.005, f: 950, wave: 'sine', vol: 0.35, s: 1, r: 0.05 }); V({ t, dur: 0.005, f: 1420, wave: 'sine', vol: 0.15, s: 1, r: 0.03 }); break;
      case 'palmas': for (const dt of [0, 0.008, 0.017]) this.add({ t: t + dt, dur: 0.004, f: 7000, wave: 'noise', vol: 0.3 * vol, s: 1, r: 0.05, hp: 0.7 }); break;
    }
  }
  /** Eco simple (dos repeticiones); en bucle, la cola vuelve al principio. */
  echo(delay = 0.18, fb = 0.28, mixAmt = 0.5) {
    const D = Math.round(delay * RATE), src = Float32Array.from(this.buf), L = this.buf.length;
    for (let k = 1; k <= 3; k++) {
      const g = Math.pow(fb, k) * mixAmt;
      for (let i = 0; i < L; i++) {
        const j = i + D * k;
        if (this.loop) this.buf[j % L] += src[i] * g; else if (j < L) this.buf[j] += src[i] * g;
      }
    }
  }
  out(): Float32Array { return this.buf; }
}

/**
 * Secuencia de notas en texto: "Bb4/2 D5 F5 r/2" (nota/duración en unidades, r = silencio). Devuelve las notas con
 * su tiempo, a partir de `t0`, con la unidad en segundos.
 */
export function seq(text: string, t0: number, unit: number): { t: number; dur: number; f: number; n: string; units: number }[] {
  const out: { t: number; dur: number; f: number; n: string; units: number }[] = [];
  let t = t0;
  for (const tok of text.trim().split(/[\s|]+/).filter(Boolean)) {
    const [n, l] = tok.split('/');
    const units = l ? Number(l) : 1;
    if (n !== 'r') out.push({ t, dur: units * unit, f: hz(n), n, units });
    t += units * unit;
  }
  return out;
}

/** Normaliza a un pico de 0.9 (encodeWav ya lo hace, pero sirve para mezclar piezas). */
export function normalize(b: Float32Array, peak = 0.9): Float32Array {
  let m = 0;
  for (const v of b) m = Math.max(m, Math.abs(v));
  if (m > 0) for (let i = 0; i < b.length; i++) b[i] *= peak / m;
  return b;
}

/** Quita el silencio del final (deja 20 ms): los efectos sueltos no arrastran la cola vacía del mezclador. */
export function trimTail(b: Float32Array, thr = 0.002): Float32Array {
  let end = b.length;
  while (end > 0 && Math.abs(b[end - 1]) < thr) end--;
  return b.slice(0, Math.min(b.length, end + Math.round(0.02 * RATE)));
}
