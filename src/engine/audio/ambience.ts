import { RATE } from './sfx';

/**
 * Sonidos de ambiente por zona, en bucle sin corte (el final se funde con el principio).
 * bosque (viento suave y pájaros), agua (arroyo), noche (grillos), viento (ráfagas), cueva (eco y gotas),
 * magia (campanitas y un colchón brillante). Todo sintetizado.
 */

export type AmbienceName = 'bosque' | 'agua' | 'noche' | 'viento' | 'cueva' | 'magia' | 'catedral' | 'galerias' | 'eco' | 'puerto' | 'campana';

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

/** Ruido rosa aproximado (Paul Kellet, versión corta). */
function pink(n: number, r: () => number): Float32Array {
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
function bandpass(x: Float32Array, cutoff: (i: number) => number, q = 0.6): Float32Array {
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
function lowpass(x: Float32Array, k: number): Float32Array {
  const out = new Float32Array(x.length);
  let y = 0;
  for (let i = 0; i < x.length; i++) { y += (x[i] - y) * k; out[i] = y; }
  return out;
}

/** Tono corto con barrido y caída exponencial, sumado en `buf` a partir de `t0` segundos. */
function blip(buf: Float32Array, t0: number, dur: number, f0: number, f1: number, vol: number, decay = 6) {
  const s = Math.floor(t0 * RATE), n = Math.floor(dur * RATE);
  let ph = 0;
  for (let i = 0; i < n && s + i < buf.length; i++) {
    const t = i / n;
    ph += (f0 + (f1 - f0) * t) / RATE;
    const env = Math.min(1, i / (RATE * 0.004)) * Math.exp(-t * decay);
    buf[s + i] += Math.sin(ph * Math.PI * 2) * env * vol;
  }
}

/** Funde el final sobre el principio para que el bucle no se note. */
function loopify(x: Float32Array, len: number): Float32Array {
  const out = x.slice(0, len);
  const fade = x.length - len;
  for (let i = 0; i < fade; i++) {
    const t = i / fade;
    out[i] = out[i] * Math.sqrt(t) + x[len + i] * Math.sqrt(1 - t);
  }
  return out;
}

const SECONDS = 12, FADE = 1.5;

/** El puerto dura 20 s (el encargo lo pide más largo: el agua contra los muelles necesita tiempo para no repetirse). */
const LARGO: Partial<Record<AmbienceName, number>> = { puerto: 20 };

export function ambience(name: AmbienceName): Float32Array {
  const secs = LARGO[name] ?? SECONDS;
  const total = Math.floor((secs + FADE) * RATE), len = Math.floor(secs * RATE);
  const r = rng(name.length * 7919 + name.charCodeAt(0));
  let buf: Float32Array = new Float32Array(total);
  const add = (x: Float32Array, k: number) => { for (let i = 0; i < total; i++) buf[i] += x[i] * k; };
  const lfo = (i: number, hz: number, ph = 0) => 0.5 + 0.5 * Math.sin((i / RATE) * hz * Math.PI * 2 + ph);

  if (name === 'bosque' || name === 'viento' || name === 'noche') {
    // viento: ruido rosa por un filtro que respira
    const wind = bandpass(pink(total, r), (i) => 300 + 500 * lfo(i, 0.07) + 300 * lfo(i, 0.23, 1), 0.9);
    const gust = name === 'viento' ? 1 : 0.35;
    for (let i = 0; i < total; i++) buf[i] += wind[i] * (0.25 + 0.75 * lfo(i, 0.11, 2) * lfo(i, 0.05)) * gust;
  }
  if (name === 'bosque') {
    // pájaros: frases de 3 a 6 notas con barrido
    for (let k = 0; k < 9; k++) {
      let t = r() * (SECONDS + FADE - 1.2);
      const base = 2200 + r() * 1800, notes = 3 + Math.floor(r() * 4), up = r() < 0.5;
      for (let j = 0; j < notes; j++) {
        const f = base * (1 + (r() - 0.5) * 0.2);
        blip(buf, t, 0.05 + r() * 0.06, up ? f * 0.8 : f * 1.2, up ? f * 1.25 : f * 0.85, 0.11, 4);
        t += 0.07 + r() * 0.08;
      }
    }
  }
  if (name === 'agua') {
    const rush = lowpass(pink(total, r), 0.18);
    add(bandpass(rush, (i) => 700 + 250 * lfo(i, 0.3), 1.2), 1.4);
    add(lowpass(pink(total, r), 0.05), 1.1);
    // burbujas: tonitos que suben
    for (let k = 0; k < 140; k++) blip(buf, r() * (SECONDS + FADE), 0.03 + r() * 0.04, 300 + r() * 500, 700 + r() * 900, 0.05, 5);
  }
  if (name === 'noche') {
    // grillos: un tono agudo cortado en pulsos (grupos de 3) que se repiten
    for (const [f, every, off] of [[4400, 0.9, 0.1], [5200, 1.3, 0.5]] as [number, number, number][]) {
      for (let t = off; t < SECONDS + FADE; t += every * (0.9 + r() * 0.2))
        for (let p = 0; p < 3; p++) blip(buf, t + p * 0.035, 0.022, f, f, 0.06, 1);
    }
    // ranita a lo lejos
    for (let t = 1; t < SECONDS + FADE; t += 2.3 + r()) blip(buf, t, 0.12, 180, 140, 0.08, 3);
  }
  if (name === 'cueva') {
    add(lowpass(pink(total, r), 0.015), 2.2);
    // gotas con eco
    for (let k = 0; k < 9; k++) {
      const t = r() * (SECONDS + FADE - 1), f = 1100 + r() * 900;
      for (let e = 0; e < 4; e++) blip(buf, t + e * 0.18, 0.06, f, f * 0.6, 0.12 * Math.pow(0.45, e), 8);
    }
  }
  if (name === 'magia') {
    // colchón: acorde agudo con trémolo lento
    const chord = [523.25, 659.25, 783.99, 987.77];
    for (let i = 0; i < total; i++) {
      let s = 0;
      for (let c = 0; c < chord.length; c++) s += Math.sin((i / RATE) * chord[c] * Math.PI * 2) * (0.5 + 0.5 * Math.sin((i / RATE) * (0.2 + c * 0.07) * Math.PI * 2));
      buf[i] += s * 0.025;
    }
    // campanitas
    for (let k = 0; k < 22; k++) { const f = [1568, 1760, 2093, 2349, 2637][Math.floor(r() * 5)]; blip(buf, r() * (SECONDS + FADE), 0.6, f, f, 0.06, 7); }
  }
  if (name === 'catedral') {
    // la nave: un zumbido hondo que respira, gotas que caen de lejos con eco largo y raíces que crujen despacio
    const hum = lowpass(pink(total, r), 0.01);
    for (let i = 0; i < total; i++) buf[i] += hum[i] * 2.4 * (0.7 + 0.3 * lfo(i, 0.06));
    for (let k = 0; k < 7; k++) {
      const t = r() * (SECONDS + FADE - 2), f = 900 + r() * 700;
      for (let e = 0; e < 6; e++) blip(buf, t + e * 0.32, 0.07, f, f * 0.55, 0.1 * Math.pow(0.55, e), 8);
    }
    for (let k = 0; k < 3; k++) blip(buf, r() * (SECONDS + FADE - 1.5), 0.9, 90 + r() * 40, 60 + r() * 20, 0.05, 2);
  }
  if (name === 'galerias') {
    // la mina: aire quieto muy grave, viento lejano que entra por los túneles, goteo y una piedra que cae a lo lejos
    const hum = lowpass(pink(total, r), 0.012);
    for (let i = 0; i < total; i++) buf[i] += hum[i] * 1.8;
    const far = bandpass(pink(total, r), (i) => 180 + 120 * lfo(i, 0.05), 1.1);
    for (let i = 0; i < total; i++) buf[i] += far[i] * 0.5 * lfo(i, 0.083, 1) ** 2;
    for (let k = 0; k < 11; k++) {
      const t = r() * (SECONDS + FADE - 1), f = 1300 + r() * 900;
      for (let e = 0; e < 3; e++) blip(buf, t + e * 0.22, 0.05, f, f * 0.62, 0.1 * Math.pow(0.4, e), 9);
    }
    // la piedra lejana: un golpe sordo y unas piedritas que ruedan después
    const tp = 5 + r() * 3;
    blip(buf, tp, 0.5, 110, 55, 0.12, 4);
    for (let j = 0; j < 6; j++) blip(buf, tp + 0.18 + j * (0.07 + r() * 0.06), 0.04, 600 + r() * 500, 400, 0.035 * (1 - j / 7), 10);
  }
  if (name === 'eco') {
    // la Sala del Eco: casi silencio, y cada gota vuelve muchas veces, cada vez más lejos
    const hum = lowpass(pink(total, r), 0.008);
    for (let i = 0; i < total; i++) buf[i] += hum[i] * 1.2;
    for (let k = 0; k < 6; k++) {
      const t = r() * (SECONDS + FADE - 3), f = 1500 + r() * 800;
      for (let e = 0; e < 9; e++) blip(buf, t + e * 0.38, 0.08, f * (1 - e * 0.015), f * 0.6, 0.12 * Math.pow(0.68, e), 7);
    }
    // un cristal que canta apenas
    for (let k = 0; k < 3; k++) { const f = [1975.5, 2349.3, 2637][k]; blip(buf, 1 + k * 4 + r(), 2.2, f, f, 0.025, 2.5); }
  }
  if (name === 'puerto') {
    // el puerto: agua que golpea despacio contra los muelles, madera que cruje, viento bajo y, muy lejos, la campana
    const sea = lowpass(pink(total, r), 0.02);
    for (let i = 0; i < total; i++) buf[i] += sea[i] * 1.6 * (0.6 + 0.4 * lfo(i, 0.09));
    // cada golpe del agua contra los pilotes: un ruido grave que sube y se corta, con chapoteo
    for (let t = 0.4; t < len / RATE + FADE - 1; t += 2.6 + r() * 1.4) {
      const s = Math.floor(t * RATE), n = Math.floor((0.7 + r() * 0.3) * RATE);
      const lap = bandpass(pink(n, r), (i) => 300 + 500 * (i / n), 1.4);
      for (let i = 0; i < n && s + i < total; i++) buf[s + i] += lap[i] * 0.9 * Math.sin((i / n) * Math.PI) ** 2;
      for (let j = 0; j < 3; j++) blip(buf, t + 0.4 + j * 0.06 + r() * 0.05, 0.04, 600 + r() * 500, 1100 + r() * 400, 0.025, 6);
    }
    // madera que cruje: un roce grave con vibrato
    for (let k = 0; k < 4; k++) {
      const t = r() * (len / RATE - 1), s = Math.floor(t * RATE), n = Math.floor(0.6 * RATE), f0 = 90 + r() * 60;
      let ph = 0;
      for (let i = 0; i < n && s + i < total; i++) { ph += (f0 * (1 + 0.15 * Math.sin(i / 300))) / RATE; buf[s + i] += ((ph % 1) * 2 - 1) * 0.02 * Math.sin((i / n) * Math.PI); }
    }
    const wind = bandpass(pink(total, r), (i) => 200 + 160 * lfo(i, 0.05), 1);
    for (let i = 0; i < total; i++) buf[i] += wind[i] * 0.35;
    // la campana, muy lejos (dos veces en el bucle): parciales graves y apagados
    for (const t of [3.5, 13.2]) for (const [m, v] of [[0.5, 0.03], [1, 0.045], [1.19, 0.02], [1.56, 0.012]] as [number, number][]) blip(buf, t, 3.2, 293.66 * m, 293.66 * m, v, 2.2);
  }
  if (name === 'campana') {
    // la iglesia por dentro: hueca, eco largo, gotas que caen y la campana que vibra apenas sola
    const hum = lowpass(pink(total, r), 0.01);
    for (let i = 0; i < total; i++) buf[i] += hum[i] * 2 * (0.75 + 0.25 * lfo(i, 0.07));
    for (let k = 0; k < 8; k++) {
      const t = r() * (SECONDS + FADE - 3), f = 1000 + r() * 700;
      for (let e = 0; e < 7; e++) blip(buf, t + e * 0.42, 0.07, f, f * 0.58, 0.1 * Math.pow(0.6, e), 8);
    }
    for (const [m, v] of [[0.5, 0.02], [1, 0.03], [2, 0.01]] as [number, number][]) blip(buf, 2, 9, 293.66 * m, 293.66 * m, v, 1.2);
  }
  buf = loopify(buf, len);
  // nivel parejo (todos los ambientes suenan parecido de fuerte)
  let peak = 0;
  for (const s of buf) peak = Math.max(peak, Math.abs(s));
  const k = peak ? 0.5 / peak : 1;
  for (let i = 0; i < buf.length; i++) buf[i] *= k;
  return buf;
}

export const AMBIENCE_NAMES: AmbienceName[] = ['bosque', 'agua', 'noche', 'viento', 'cueva', 'magia', 'catedral', 'galerias', 'eco', 'puerto', 'campana'];
