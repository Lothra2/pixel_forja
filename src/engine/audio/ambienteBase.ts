import { RATE } from './sfx';

/**
 * Las piezas de los ambientes: ruido rosa, filtros, tonos con barrido, voces con armónicos para aves y animales y el
 * fundido que cierra el bucle. Las usan los ambientes de las zonas (`ambience.ts`) y los de los mundos del olímpico
 * (`ambienteMundos.ts`).
 */

export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

/** Ruido rosa aproximado (Paul Kellet, versión corta). */
export function pink(n: number, r: () => number): Float32Array {
  const out = new Float32Array(n);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < n; i++) {
    const w = r() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0527;
    out[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
  }
  return out;
}

/** Filtro de estado variable (pasa banda) con corte que cambia en el tiempo. */
export function bandpass(x: Float32Array, cutoff: (i: number) => number, q = 0.6): Float32Array {
  const out = new Float32Array(x.length);
  let low = 0, band = 0;
  for (let i = 0; i < x.length; i++) {
    const f = 2 * Math.sin((Math.PI * Math.min(cutoff(i), RATE / 6)) / RATE);
    const high = x[i] - low - q * band;
    band += f * high; low += f * band;
    out[i] = band;
  }
  return out;
}
export function lowpass(x: Float32Array, k: number): Float32Array {
  const out = new Float32Array(x.length);
  let y = 0;
  for (let i = 0; i < x.length; i++) { y += (x[i] - y) * k; out[i] = y; }
  return out;
}

/** Tono corto con barrido y caída exponencial, sumado en `buf` a partir de `t0` segundos. */
export function blip(buf: Float32Array, t0: number, dur: number, f0: number, f1: number, vol: number, decay = 6) {
  const s = Math.floor(t0 * RATE), n = Math.floor(dur * RATE);
  let ph = 0;
  for (let i = 0; i < n && s + i < buf.length; i++) {
    const t = i / n;
    ph += (f0 + (f1 - f0) * t) / RATE;
    const env = Math.min(1, i / (RATE * 0.004)) * Math.exp(-t * decay);
    buf[s + i] += Math.sin(ph * Math.PI * 2) * env * vol;
  }
}

/** Un highpass de un polo: deja el siseo y quita lo grave. */
export function highpass(x: Float32Array, k: number): Float32Array {
  const out = new Float32Array(x.length);
  let y = 0;
  for (let i = 0; i < x.length; i++) { y += (x[i] - y) * k; out[i] = x[i] - y; }
  return out;
}

/** Una voz con armónicos: la altura va de f0 a f1 (con vibrato) y la envolvente sube rápido y cae. Para aves y animales. */
export function voz(buf: Float32Array, t0: number, dur: number, f0: number, f1: number, vol: number, armonicos: number[], vib = 0, vibHz = 0, ataque = 0.01) {
  const s = Math.floor(t0 * RATE), n = Math.floor(dur * RATE);
  let ph = 0;
  for (let i = 0; i < n && s + i < buf.length; i++) {
    const t = i / n, tt = i / RATE;
    const f = (f0 + (f1 - f0) * t) * (1 + vib * Math.sin(tt * vibHz * Math.PI * 2));
    ph += f / RATE;
    const env = Math.min(1, tt / ataque) * Math.pow(1 - t, 1.5);
    let v = 0;
    armonicos.forEach((a, h) => { v += Math.sin(ph * Math.PI * 2 * (h + 1)) * a; });
    buf[s + i] += v * env * vol;
  }
}
/** Un graznido áspero (loro): ruido en banda que tiembla rápido, en dos o tres golpes. */
export function graznido(buf: Float32Array, t0: number, r: () => number, vol: number) {
  const golpes = 2 + Math.floor(r() * 2);
  for (let g = 0; g < golpes; g++) {
    const s = Math.floor((t0 + g * 0.16) * RATE), n = Math.floor((0.09 + r() * 0.04) * RATE), f = 1500 + r() * 700;
    let low = 0, band = 0;
    const fc = 2 * Math.sin((Math.PI * f) / RATE);
    for (let i = 0; i < n && s + i < buf.length; i++) {
      const w = r() * 2 - 1, high = w - low - 0.25 * band;
      band += fc * high; low += fc * band;
      const t = i / n, am = 0.6 + 0.4 * Math.sin((i / RATE) * 95 * Math.PI * 2);
      buf[s + i] += band * am * Math.sin(Math.PI * t) * vol;
    }
  }
}

/** Funde el final sobre el principio para que el bucle no se note. */
export function loopify(x: Float32Array, len: number): Float32Array {
  const out = x.slice(0, len);
  const fade = x.length - len;
  for (let i = 0; i < fade; i++) {
    const t = i / fade;
    out[i] = out[i] * Math.sqrt(t) + x[len + i] * Math.sqrt(1 - t);
  }
  return out;
}

