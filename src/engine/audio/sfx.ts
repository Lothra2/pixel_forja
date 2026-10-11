/**
 * Sonidos y música del juego, sintetizados con código (estilo 8/16 bits): nada se graba ni se descarga.
 * Salen como WAV de 16 bits mono a 22050 Hz, que Phaser y cualquier navegador cargan directo.
 */

export const RATE = 22050;

type Wave = 'sine' | 'square' | 'saw' | 'triangle' | 'noise';

let seed = 1;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

function osc(w: Wave, phase: number, duty = 0.5): number {
  const p = phase - Math.floor(phase);
  switch (w) {
    case 'sine': return Math.sin(p * Math.PI * 2);
    case 'square': return p < duty ? 0.8 : -0.8;
    case 'saw': return p * 2 - 1;
    case 'triangle': return p < 0.5 ? p * 4 - 1 : 3 - p * 4;
    default: return rnd() * 2 - 1;
  }
}

interface Voice {
  wave: Wave;
  /** frecuencia al empezar y al terminar (Hz): desliza */
  f0: number;
  f1?: number;
  dur: number;
  /** ataque y caída (s) */
  a?: number;
  vol?: number;
  /** empieza a los t segundos */
  at?: number;
  duty?: number;
  /** vibrato (Hz, profundidad en semitonos) */
  vib?: [number, number];
  /** filtro pasa bajos simple (0..1, 1 = sin filtro) */
  lp?: number;
}

/** Mezcla voces en un buffer. */
function mix(voices: Voice[], extra = 0.05): Float32Array {
  const len = Math.ceil((Math.max(...voices.map((v) => (v.at ?? 0) + v.dur)) + extra) * RATE);
  const buf = new Float32Array(len);
  for (const v of voices) {
    const start = Math.floor((v.at ?? 0) * RATE), n = Math.floor(v.dur * RATE);
    let ph = 0, lp = 0, hold = 0;
    const a = Math.max(1, Math.floor((v.a ?? 0.005) * RATE));
    for (let i = 0; i < n; i++) {
      const t = i / n;
      let f = v.f0 + ((v.f1 ?? v.f0) - v.f0) * t;
      if (v.vib) f *= Math.pow(2, (Math.sin((i / RATE) * v.vib[0] * Math.PI * 2) * v.vib[1]) / 12);
      ph += f / RATE;
      // ruido: se "sostiene" según la frecuencia (más grave = más granulado)
      let s: number;
      if (v.wave === 'noise') { if (ph >= 1) { ph -= 1; hold = rnd() * 2 - 1; } s = hold; } else s = osc(v.wave, ph, v.duty);
      if (v.lp !== undefined) { lp += (s - lp) * v.lp; s = lp; }
      const env = Math.min(1, i / a) * Math.pow(1 - t, 1.6);
      buf[start + i] += s * env * (v.vol ?? 0.5);
    }
  }
  return buf;
}

/** Arma un WAV de 16 bits mono. */
/** loop = true no apaga el final (para sonidos en bucle que ya vienen fundidos). */
export function encodeWav(samples: Float32Array, rate = RATE, loop = false): Uint8Array {
  const n = samples.length;
  const out = new Uint8Array(44 + n * 2);
  const dv = new DataView(out.buffer);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) out[o + i] = s.charCodeAt(i); };
  str(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, rate, true);
  dv.setUint32(28, rate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); str(36, 'data'); dv.setUint32(40, n * 2, true);
  // normaliza con margen y evita clics al final
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  const k = peak > 0.9 ? 0.9 / peak : 1;
  for (let i = 0; i < n; i++) {
    const fade = !loop && i > n - 200 ? (n - i) / 200 : 1;
    dv.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i] * k * fade)) * 32767, true);
  }
  return out;
}

const NOTE = (n: string): number => {
  const m = /^([A-G])(#|b)?(\d)$/.exec(n)!;
  const base = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1] as 'C'] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 440 * Math.pow(2, (base + (Number(m[3]) - 4) * 12) / 12);
};

export type SfxName =
  | 'espadazo' | 'golpe' | 'critico' | 'enemigo_dolor' | 'enemigo_muere' | 'jefe_rugido' | 'jefe_pisoton' | 'moneda' | 'oro_mucho'
  | 'pocion' | 'curar' | 'cofre_abrir' | 'romper' | 'portal' | 'subir_nivel' | 'paso' | 'ladrido' | 'aullido' | 'mordida'
  | 'recoger' | 'legendario' | 'click' | 'abrir_inventario' | 'error' | 'jugador_dolor' | 'magia'
  | 'descubrir' | 'secreto' | 'elegir' | 'guardado' | 'arco' | 'esquiva' | 'bloqueo' | 'thor_rescate'
  | `paso_${'pasto' | 'tierra' | 'piedra' | 'madera' | 'agua'}_${0 | 1 | 2}`;

/** Efectos de sonido. */
export const SFX: Record<SfxName, () => Float32Array> = {
  espadazo: () => mix([{ wave: 'noise', f0: 9000, f1: 2500, dur: 0.16, a: 0.02, vol: 0.4, lp: 0.5 }]),
  golpe: () => mix([{ wave: 'noise', f0: 4000, f1: 800, dur: 0.12, vol: 0.6 }, { wave: 'square', f0: 160, f1: 60, dur: 0.12, vol: 0.5 }]),
  critico: () => mix([{ wave: 'noise', f0: 6000, f1: 1000, dur: 0.18, vol: 0.6 }, { wave: 'square', f0: 220, f1: 50, dur: 0.2, vol: 0.5 }, { wave: 'square', f0: NOTE('E6'), dur: 0.12, at: 0.03, vol: 0.25 }]),
  enemigo_dolor: () => mix([{ wave: 'square', f0: 520, f1: 260, dur: 0.14, vol: 0.35, duty: 0.3 }]),
  enemigo_muere: () => mix([{ wave: 'square', f0: 400, f1: 60, dur: 0.45, vol: 0.4, duty: 0.25 }, { wave: 'noise', f0: 2000, f1: 300, dur: 0.4, vol: 0.25 }]),
  jefe_rugido: () => mix([{ wave: 'saw', f0: 95, f1: 55, dur: 1.1, a: 0.1, vol: 0.6, vib: [7, 1.2], lp: 0.25 }, { wave: 'noise', f0: 900, f1: 200, dur: 1.0, a: 0.1, vol: 0.35, lp: 0.3 }]),
  jefe_pisoton: () => mix([{ wave: 'sine', f0: 90, f1: 30, dur: 0.5, vol: 0.9 }, { wave: 'noise', f0: 1200, f1: 100, dur: 0.45, vol: 0.5, lp: 0.4 }]),
  moneda: () => mix([{ wave: 'square', f0: NOTE('B5'), dur: 0.07, vol: 0.3, duty: 0.25 }, { wave: 'square', f0: NOTE('E6'), dur: 0.22, at: 0.07, vol: 0.3, duty: 0.25 }]),
  oro_mucho: () => mix(['E6', 'G#6', 'B6', 'E7'].flatMap((n, i) => [{ wave: 'square' as Wave, f0: NOTE(n), dur: 0.12, at: i * 0.05, vol: 0.22, duty: 0.25 }, { wave: 'noise' as Wave, f0: 8000, dur: 0.04, at: i * 0.05, vol: 0.06 }])),
  pocion: () => mix(Array.from({ length: 6 }, (_, i) => ({ wave: 'sine' as Wave, f0: 300 + i * 70, f1: 600 + i * 90, dur: 0.07, at: i * 0.06, vol: 0.35 }))),
  curar: () => mix(['C5', 'E5', 'G5', 'C6'].map((n, i) => ({ wave: 'triangle' as Wave, f0: NOTE(n), dur: 0.35, at: i * 0.08, vol: 0.35, vib: [6, 0.2] as [number, number] }))),
  cofre_abrir: () => mix([{ wave: 'saw', f0: 120, f1: 180, dur: 0.35, a: 0.05, vol: 0.25, lp: 0.15, vib: [18, 1.5] }, ...['C6', 'E6', 'G6', 'C7'].map((n, i) => ({ wave: 'square' as Wave, f0: NOTE(n), dur: 0.15, at: 0.32 + i * 0.06, vol: 0.2, duty: 0.25 }))]),
  romper: () => mix([{ wave: 'noise', f0: 3000, f1: 500, dur: 0.25, vol: 0.6 }, { wave: 'noise', f0: 1500, f1: 300, dur: 0.18, at: 0.06, vol: 0.4 }, { wave: 'square', f0: 140, f1: 70, dur: 0.1, vol: 0.3 }]),
  portal: () => mix([{ wave: 'sine', f0: 200, f1: 900, dur: 1.0, a: 0.2, vol: 0.4, vib: [9, 1] }, { wave: 'triangle', f0: 300, f1: 1200, dur: 1.0, a: 0.25, vol: 0.25, vib: [6, 2] }, { wave: 'noise', f0: 4000, dur: 0.9, a: 0.3, vol: 0.08, lp: 0.2 }]),
  subir_nivel: () => mix(['C5', 'E5', 'G5', 'C6', 'E6', 'G6'].map((n, i) => ({ wave: 'square' as Wave, f0: NOTE(n), dur: i === 5 ? 0.5 : 0.1, at: i * 0.08, vol: 0.25, duty: 0.5 }))),
  paso: () => mix([{ wave: 'noise', f0: 800, f1: 300, dur: 0.06, vol: 0.18, lp: 0.3 }]),
  ladrido: () => mix([0, 0.22].flatMap((at) => [{ wave: 'saw' as Wave, f0: 520, f1: 300, dur: 0.12, at, vol: 0.45, lp: 0.35 }, { wave: 'noise' as Wave, f0: 2200, f1: 900, dur: 0.1, at, vol: 0.2, lp: 0.4 }])),
  aullido: () => mix([{ wave: 'triangle', f0: 380, f1: 620, dur: 1.2, a: 0.25, vol: 0.45, vib: [5, 0.6] }, { wave: 'sine', f0: 760, f1: 1240, dur: 1.2, a: 0.3, vol: 0.12 }]),
  mordida: () => mix([{ wave: 'noise', f0: 5000, f1: 1500, dur: 0.07, vol: 0.5 }, { wave: 'square', f0: 300, f1: 120, dur: 0.08, at: 0.04, vol: 0.35 }]),
  recoger: () => mix([{ wave: 'square', f0: NOTE('G5'), dur: 0.06, vol: 0.25, duty: 0.25 }, { wave: 'square', f0: NOTE('D6'), dur: 0.12, at: 0.06, vol: 0.25, duty: 0.25 }]),
  legendario: () => mix([...['C5', 'G5', 'C6', 'E6', 'G6', 'C7'].map((n, i) => ({ wave: 'square' as Wave, f0: NOTE(n), dur: 0.4, at: i * 0.07, vol: 0.16, duty: 0.4, vib: [6, 0.15] as [number, number] })), { wave: 'noise', f0: 9000, dur: 0.8, at: 0.1, vol: 0.05, lp: 0.6 }]),
  click: () => mix([{ wave: 'square', f0: 900, dur: 0.03, vol: 0.2, duty: 0.25 }]),
  abrir_inventario: () => mix([{ wave: 'noise', f0: 1500, f1: 600, dur: 0.12, vol: 0.25, lp: 0.3 }, { wave: 'square', f0: 220, f1: 180, dur: 0.08, vol: 0.15 }]),
  error: () => mix([{ wave: 'square', f0: 180, dur: 0.12, vol: 0.3 }, { wave: 'square', f0: 140, dur: 0.18, at: 0.12, vol: 0.3 }]),
  jugador_dolor: () => mix([{ wave: 'square', f0: 330, f1: 180, dur: 0.18, vol: 0.35, duty: 0.4 }, { wave: 'noise', f0: 2500, f1: 600, dur: 0.1, vol: 0.2 }]),
  magia: () => mix([{ wave: 'sine', f0: 600, f1: 1400, dur: 0.35, vol: 0.35, vib: [12, 1] }, { wave: 'triangle', f0: 1200, f1: 2400, dur: 0.3, at: 0.05, vol: 0.15 }]),
  // descubrir una zona: campanitas que suben (1.5 s)
  descubrir: () => mix([...['G5', 'C6', 'E6', 'G6', 'C7'].map((n, i) => ({ wave: 'triangle' as Wave, f0: NOTE(n), dur: 0.7, at: i * 0.13, vol: 0.28, vib: [5, 0.12] as [number, number] })), ...['G6', 'C7'].map((n, i) => ({ wave: 'sine' as Wave, f0: NOTE(n), dur: 0.8, at: 0.65 + i * 0.12, vol: 0.12 }))]),
  // secreto: más mágico, acorde que se abre y brillo al final (2 s)
  secreto: () => mix([
    ...['A4', 'C5', 'E5', 'A5'].map((n, i) => ({ wave: 'sine' as Wave, f0: NOTE(n), dur: 1.6, at: i * 0.1, a: 0.15, vol: 0.18, vib: [4, 0.3] as [number, number] })),
    ...['E6', 'A6', 'C7', 'E7', 'A7'].map((n, i) => ({ wave: 'triangle' as Wave, f0: NOTE(n), dur: 0.35, at: 0.9 + i * 0.09, vol: 0.14 })),
    { wave: 'noise', f0: 10000, dur: 0.6, at: 1.3, a: 0.05, vol: 0.05, lp: 0.7 },
  ]),
  // elegir jugadora: alegre y corto (0.6 s)
  elegir: () => mix(['C5', 'G5', 'C6'].map((n, i) => ({ wave: 'square' as Wave, f0: NOTE(n), dur: i === 2 ? 0.32 : 0.1, at: i * 0.09, vol: 0.24, duty: 0.4 })).concat([{ wave: 'triangle' as Wave, f0: NOTE('E6'), dur: 0.3, at: 0.2, vol: 0.18, duty: 0.5 }])),
  // guardado en la fogata: suave, dos notas cálidas (0.8 s)
  guardado: () => mix([{ wave: 'triangle', f0: NOTE('E5'), dur: 0.5, a: 0.03, vol: 0.3, vib: [5, 0.15] }, { wave: 'triangle', f0: NOTE('A5'), dur: 0.6, at: 0.18, a: 0.03, vol: 0.28, vib: [5, 0.15] }, { wave: 'sine', f0: NOTE('A6'), dur: 0.4, at: 0.3, vol: 0.08 }]),
  // arco: cuerda que suelta y la flecha que silba (0.3 s)
  arco: () => mix([{ wave: 'triangle', f0: 220, f1: 140, dur: 0.12, vol: 0.4, vib: [40, 1.5] }, { wave: 'noise', f0: 6000, f1: 2500, dur: 0.22, at: 0.04, vol: 0.2, lp: 0.5 }]),
  // esquiva: whoosh (0.3 s)
  esquiva: () => mix([{ wave: 'noise', f0: 1500, f1: 5000, dur: 0.14, a: 0.06, vol: 0.35, lp: 0.35 }, { wave: 'noise', f0: 5000, f1: 1200, dur: 0.16, at: 0.12, vol: 0.25, lp: 0.35 }]),
  // bloqueo: clang de escudo (0.4 s)
  bloqueo: () => mix([{ wave: 'square', f0: 880, f1: 860, dur: 0.35, vol: 0.22, vib: [30, 0.3], duty: 0.3 }, { wave: 'square', f0: 1320, f1: 1300, dur: 0.3, vol: 0.12, duty: 0.3 }, { wave: 'noise', f0: 7000, f1: 2000, dur: 0.08, vol: 0.4 }]),
  // Thor te salvó: aullido corto y alegre que termina en ladrido (1.2 s)
  thor_rescate: () => mix([{ wave: 'triangle', f0: 420, f1: 700, dur: 0.75, a: 0.12, vol: 0.42, vib: [6, 0.5] }, { wave: 'sine', f0: 840, f1: 1400, dur: 0.75, a: 0.15, vol: 0.1 }, { wave: 'saw', f0: 560, f1: 330, dur: 0.12, at: 0.85, vol: 0.4, lp: 0.35 }, { wave: 'saw', f0: 600, f1: 360, dur: 0.12, at: 1.03, vol: 0.38, lp: 0.35 }]),
  ...pasos(),
};

/** Pasos por superficie, 3 variantes cada uno (tono y largo un poco distintos). */
function pasos() {
  const out: Record<string, () => Float32Array> = {};
  const recipe: Record<string, (k: number) => Voice[]> = {
    pasto: (k) => [{ wave: 'noise', f0: 2600 + k * 300, f1: 900, dur: 0.11 + k * 0.01, a: 0.02, vol: 0.16, lp: 0.45 }],
    tierra: (k) => [{ wave: 'noise', f0: 700 + k * 90, f1: 250, dur: 0.08, vol: 0.22, lp: 0.25 }, { wave: 'sine', f0: 110 - k * 8, f1: 70, dur: 0.06, vol: 0.18 }],
    piedra: (k) => [{ wave: 'noise', f0: 3800 + k * 400, f1: 1500, dur: 0.05, vol: 0.22, lp: 0.6 }, { wave: 'square', f0: 260 + k * 30, f1: 180, dur: 0.04, vol: 0.1, duty: 0.2 }],
    madera: (k) => [{ wave: 'triangle', f0: 190 + k * 18, f1: 140, dur: 0.1, vol: 0.35 }, { wave: 'noise', f0: 1600, f1: 600, dur: 0.05, vol: 0.12, lp: 0.4 }],
    agua: (k) => [{ wave: 'noise', f0: 1800 + k * 200, f1: 600, dur: 0.14, a: 0.01, vol: 0.2, lp: 0.35 }, { wave: 'sine', f0: 500 + k * 80, f1: 1100 + k * 100, dur: 0.06, at: 0.04, vol: 0.12 }],
  };
  for (const [sup, f] of Object.entries(recipe)) for (const k of [0, 1, 2]) out[`paso_${sup}_${k}`] = () => mix(f(k));
  return out as Record<`paso_${'pasto' | 'tierra' | 'piedra' | 'madera' | 'agua'}_${0 | 1 | 2}`, () => Float32Array>;
}

export const SFX_NAMES = Object.keys(SFX) as SfxName[];

// ---------- música ----------

/** Pista: notas por pulso ('-' sigue la anterior, '.' silencio). */
interface Track { wave: Wave; notes: string[]; vol: number; duty?: number; oct?: number; vib?: [number, number] }

function song(bpm: number, steps: number, tracks: Track[], drums: string, loops = 1): Float32Array {
  const beat = 60 / bpm / 2; // corcheas
  const voices: Voice[] = [];
  for (let L = 0; L < loops; L++) {
    for (const tr of tracks) {
      for (let i = 0; i < tr.notes.length; i++) {
        const n = tr.notes[i];
        if (n === '-' || n === '.') continue;
        let len = 1;
        while (tr.notes[i + len] === '-') len++;
        voices.push({ wave: tr.wave, f0: NOTE(n), dur: beat * len * 0.95, at: (L * steps + i) * beat, vol: tr.vol, duty: tr.duty, a: 0.01, vib: tr.vib });
      }
    }
    // batería: k bombo, s caja, h platillo
    [...drums].forEach((d, i) => {
      const at = (L * steps + i) * beat;
      if (d === 'k') voices.push({ wave: 'sine', f0: 120, f1: 40, dur: 0.14, at, vol: 0.5 });
      if (d === 's') voices.push({ wave: 'noise', f0: 5000, f1: 2000, dur: 0.12, at, vol: 0.22 });
      if (d === 'h') voices.push({ wave: 'noise', f0: 11000, dur: 0.04, at, vol: 0.07 });
    });
  }
  return mix(voices, 0);
}

const rep = (s: string[], n: number) => Array.from({ length: n }, () => s).flat();

/** Música del bosque: tranquila, en Do mayor, para explorar. */
export function musicBosque(): Float32Array {
  const lead = [
    'E5', '-', 'G5', '-', 'A5', '-', 'G5', 'E5', 'D5', '-', 'E5', '-', 'C5', '-', '-', '-',
    'E5', '-', 'G5', '-', 'C6', '-', 'B5', 'A5', 'G5', '-', '-', '-', '.', '.', '.', '.',
    'A5', '-', 'G5', '-', 'E5', '-', 'D5', 'E5', 'F5', '-', 'E5', '-', 'D5', '-', '-', '-',
    'E5', '-', 'D5', '-', 'C5', '-', 'D5', 'E5', 'C5', '-', '-', '-', '.', '.', '.', '.',
  ];
  const bass = rep(['C3', '-', 'G3', '-', 'C3', '-', 'G3', '-'], 2).concat(rep(['A2', '-', 'E3', '-', 'A2', '-', 'E3', '-'], 2), rep(['F2', '-', 'C3', '-', 'F2', '-', 'C3', '-'], 2), rep(['G2', '-', 'D3', '-', 'G2', '-', 'D3', '-'], 2));
  const arp = rep(['C5', 'E5', 'G5', 'E5'], 4).concat(rep(['A4', 'C5', 'E5', 'C5'], 4), rep(['F4', 'A4', 'C5', 'A4'], 4), rep(['G4', 'B4', 'D5', 'B4'], 4));
  const drums = rep(['k', '.', 'h', '.', 's', '.', 'h', '.'], 8).join('');
  return song(100, 64, [
    { wave: 'square', notes: lead, vol: 0.18, duty: 0.5, vib: [5, 0.15] },
    { wave: 'triangle', notes: bass, vol: 0.32 },
    { wave: 'square', notes: arp, vol: 0.06, duty: 0.25 },
  ], drums, 2);
}

/** Música del jefe: rápida y tensa, en La menor. */
export function musicJefe(): Float32Array {
  const lead = [
    'A5', '-', 'A5', 'C6', 'B5', '-', 'A5', 'G#5', 'A5', '-', 'E5', '-', '.', '.', 'E5', 'F5',
    'G5', '-', 'F5', 'E5', 'D5', '-', 'E5', 'F5', 'E5', '-', '-', '-', '.', '.', '.', '.',
    'A5', '-', 'C6', '-', 'E6', '-', 'D6', 'C6', 'B5', '-', 'G#5', '-', 'E5', '-', '-', '-',
    'F5', '-', 'E5', '-', 'D5', '-', 'C5', 'B4', 'A4', '-', '-', '-', '.', '.', '.', '.',
  ];
  const bass = rep(['A2', 'A2', 'A3', 'A2', 'A2', 'A3', 'A2', 'G2'], 2).concat(rep(['F2', 'F2', 'F3', 'F2', 'G2', 'G2', 'G3', 'G2'], 2), rep(['A2', 'A2', 'A3', 'A2', 'E2', 'E2', 'E3', 'E2'], 2), rep(['F2', 'F2', 'F3', 'F2', 'E2', 'E2', 'G#2', 'E2'], 2));
  const drums = rep(['k', 'h', 's', 'h', 'k', 'k', 's', 'h'], 8).join('');
  return song(150, 64, [
    { wave: 'square', notes: lead, vol: 0.17, duty: 0.25 },
    { wave: 'saw', notes: bass, vol: 0.18 },
  ], drums, 2);
}

/** Fanfarria de victoria (al derrotar al jefe). */
export function musicVictoria(): Float32Array {
  const lead = ['C5', 'C5', 'C5', '-', 'G4', '-', 'A4', '-', 'C5', '-', 'A4', 'C5', 'E5', '-', '-', '-', '-', '-'];
  const bass = ['C3', '-', '-', '-', 'G2', '-', 'A2', '-', 'F2', '-', '-', '-', 'C3', '-', '-', '-', '-', '-'];
  return song(130, 18, [{ wave: 'square', notes: lead, vol: 0.22, duty: 0.5, vib: [6, 0.2] }, { wave: 'triangle', notes: bass, vol: 0.35 }], 'k...k...s...k.....');
}

/**
 * Música del título: misteriosa y suave, en Re menor, 72 pulsos (unos 40 s en bucle). Sin batería: un bajo largo,
 * un arpegio de cristal muy bajito, la melodía en triángulo con vibrato y campanitas sueltas arriba.
 */
export function musicTitulo(): Float32Array {
  const hold = (n: string, len: number) => [n, ...Array.from({ length: len - 1 }, () => '-')];
  const lead = [
    'D5', '-', '-', '-', 'F5', '-', 'A5', '-', 'G5', '-', '-', '-', 'F5', '-', 'E5', '-', 'D5', '-', '-', '-', '-', '-', '.', '.', 'A4', '-', 'C5', '-', 'D5', '-', '-', '-',
    'F5', '-', '-', '-', 'A5', '-', 'C6', '-', 'A#5', '-', '-', '-', 'A5', '-', 'G5', '-', 'A5', '-', '-', '-', '-', '-', '.', '.', 'E5', '-', 'F5', '-', 'E5', '-', '-', '-',
    'D5', '-', 'F5', '-', 'E5', '-', 'C5', '-', 'D5', '-', '-', '-', 'A4', '-', '-', '-', 'A#4', '-', 'C5', '-', 'D5', '-', '-', '-', '-', '-', '-', '-', '.', '.', '.', '.',
  ];
  const chords: [string, string[]][] = [['D3', ['D4', 'F4', 'A4', 'F4']], ['A#2', ['A#3', 'D4', 'F4', 'D4']], ['F2', ['F4', 'A4', 'C5', 'A4']], ['C3', ['C4', 'E4', 'G4', 'E4']], ['G2', ['G3', 'A#3', 'D4', 'A#3']], ['A2', ['A3', 'C#4', 'E4', 'C#4']]];
  const bass = chords.flatMap(([b]) => hold(b, 16));
  const arp = chords.flatMap(([, a]) => rep(a, 4));
  const bells = Array.from({ length: 96 }, (_, i) => ({ 6: 'A6', 22: 'F6', 38: 'E6', 54: 'C6', 70: 'D6', 86: 'A5' } as Record<number, string>)[i] ?? '.');
  return song(72, 96, [
    { wave: 'triangle', notes: lead, vol: 0.2, vib: [4.5, 0.25] },
    { wave: 'triangle', notes: bass, vol: 0.26 },
    { wave: 'square', notes: arp, vol: 0.035, duty: 0.125 },
    { wave: 'sine', notes: bells, vol: 0.09 },
  ], '', 1);
}

/**
 * Amenaza: hay enemigos que vieron a la heroína. Pulso bajo y lento en Mi menor, sin melodía larga: avisa sin asustar.
 * 64 pulsos a 96 bpm (unos 20 s en bucle).
 */
export function musicAmenaza(): Float32Array {
  const bass = rep(['E2', '.', 'E2', '.', '.', '.', 'E2', '.'], 4).concat(rep(['C2', '.', 'C2', '.', '.', '.', 'D2', '.'], 4));
  const pad = rep(['B3', '-', '-', '-', '-', '-', '-', '-'], 4).concat(rep(['G3', '-', '-', '-', '-', '-', 'A3', '-'], 4));
  const pinchos = Array.from({ length: 64 }, (_, i) => ({ 6: 'E5', 14: 'G5', 30: 'F#5', 38: 'E5', 54: 'D5', 62: 'B4' } as Record<number, string>)[i] ?? '.');
  const drums = rep(['k', '.', '.', '.', '.', '.', 'h', '.'], 8).join('');
  return song(96, 64, [
    { wave: 'triangle', notes: bass, vol: 0.34 },
    { wave: 'square', notes: pad, vol: 0.05, duty: 0.125, vib: [3, 0.2] },
    { wave: 'triangle', notes: pinchos, vol: 0.12 },
  ], drums, 1);
}

/** Combate: una pelea de verdad (élite o varios a la vez). Más empuje que la amenaza, menos que el jefe. En Mi menor. */
export function musicCombate(): Float32Array {
  const lead = [
    'E5', '-', 'G5', '-', 'F#5', 'E5', 'D5', '-', 'E5', '-', 'B4', '-', '.', '.', 'D5', 'E5',
    'G5', '-', 'A5', '-', 'G5', 'F#5', 'E5', '-', 'F#5', '-', '-', '-', '.', '.', '.', '.',
    'E5', '-', 'G5', '-', 'B5', '-', 'A5', 'G5', 'F#5', '-', 'D5', '-', 'E5', '-', '-', '-',
    'C5', '-', 'D5', '-', 'E5', '-', 'D5', 'C5', 'B4', '-', '-', '-', '.', '.', '.', '.',
  ];
  const bass = rep(['E2', 'E2', 'E3', 'E2', 'E2', 'E3', 'E2', 'D2'], 2).concat(rep(['C2', 'C2', 'C3', 'C2', 'D2', 'D2', 'D3', 'D2'], 2), rep(['E2', 'E2', 'E3', 'E2', 'B1', 'B1', 'B2', 'B1'], 2), rep(['C2', 'C2', 'C3', 'C2', 'B1', 'B1', 'D#2', 'B1'], 2));
  const drums = rep(['k', 'h', 's', 'h', 'k', 'h', 's', 'h'], 8).join('');
  return song(128, 64, [
    { wave: 'square', notes: lead, vol: 0.15, duty: 0.25 },
    { wave: 'triangle', notes: bass, vol: 0.3 },
  ], drums, 2);
}

/** Descanso en la fogata: cálida y lenta, en Fa mayor, guitarra de triángulos y campanitas. */
export function musicFogata(): Float32Array {
  const hold = (n: string, len: number) => [n, ...Array.from({ length: len - 1 }, () => '-')];
  const lead = [
    'A4', '-', 'C5', '-', 'F5', '-', '-', '-', 'E5', '-', 'D5', '-', 'C5', '-', '-', '-',
    'D5', '-', 'F5', '-', 'A5', '-', '-', '-', 'G5', '-', 'F5', '-', 'E5', '-', '-', '-',
    'F5', '-', 'E5', '-', 'D5', '-', 'C5', '-', 'A#4', '-', 'C5', '-', 'D5', '-', '-', '-',
    'C5', '-', 'A4', '-', 'G4', '-', 'A4', '-', 'F4', '-', '-', '-', '.', '.', '.', '.',
  ];
  const chords: [string, string[]][] = [['F2', ['F3', 'A3', 'C4', 'A3']], ['D2', ['D3', 'F3', 'A3', 'F3']], ['A#1', ['A#2', 'D3', 'F3', 'D3']], ['C2', ['C3', 'E3', 'G3', 'E3']]];
  const bass = chords.flatMap(([b]) => hold(b, 16));
  const arp = chords.flatMap(([, a]) => rep(a, 4));
  return song(76, 64, [
    { wave: 'triangle', notes: lead, vol: 0.2, vib: [4, 0.2] },
    { wave: 'triangle', notes: bass, vol: 0.24 },
    { wave: 'triangle', notes: arp, vol: 0.08 },
  ], '', 1);
}

/**
 * La Catedral de las Raíces (mundo 2): misterio y belleza, en Re menor (dórico), lenta. Un órgano suave de triángulos,
 * una melodía que vuelve con eco (la misma pista repetida más bajo y corrida: la catedral responde) y una campana honda
 * cada tanto. Sin batería: se camina despacio.
 */
export function musicCatedral(): Float32Array {
  const hold = (n: string, len: number) => [n, ...Array.from({ length: len - 1 }, () => '-')];
  const lead = [
    'D5', '-', '-', '-', 'F5', '-', 'E5', '-', 'D5', '-', '-', '-', 'A4', '-', '-', '-',
    'C5', '-', 'D5', '-', 'E5', '-', 'G5', '-', 'F5', '-', '-', '-', '.', '.', '.', '.',
    'A5', '-', '-', '-', 'G5', '-', 'F5', '-', 'E5', '-', '-', '-', 'C5', '-', '-', '-',
    'D5', '-', 'E5', '-', 'F5', '-', 'E5', '-', 'D5', '-', '-', '-', '.', '.', '.', '.',
  ];
  // eco: la misma frase tres corcheas después y a un tercio del volumen
  const eco = ['.', '.', '.', ...lead.slice(0, lead.length - 3)];
  const chords: [string, string[]][] = [['D2', ['D3', 'F3', 'A3', 'C4']], ['C2', ['C3', 'E3', 'G3', 'B3']], ['A#1', ['A#2', 'D3', 'F3', 'A3']], ['A1', ['A2', 'C#3', 'E3', 'G3']]];
  const organ = chords.flatMap(([b]) => hold(b, 16));
  const pad = chords.flatMap(([, a]) => hold(a[1]!, 8).concat(hold(a[2]!, 8)));
  const bell = chords.flatMap(([b]) => [b.replace(/\d/, (d) => String(Number(d) + 2)), ...Array.from({ length: 15 }, () => '.')]);
  return song(60, 64, [
    { wave: 'triangle', notes: lead, vol: 0.19, vib: [4, 0.25] },
    { wave: 'triangle', notes: eco, vol: 0.07, vib: [4, 0.25] },
    { wave: 'triangle', notes: organ, vol: 0.26 },
    { wave: 'square', notes: pad, vol: 0.035, duty: 0.5 },
    { wave: 'sine', notes: bell, vol: 0.16 },
  ], '', 1);
}

export const MUSIC = { catedral: musicCatedral, bosque: musicBosque, jefe: musicJefe, victoria: musicVictoria, titulo: musicTitulo, amenaza: musicAmenaza, combate: musicCombate, fogata: musicFogata };
