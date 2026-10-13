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

/** Deja el pico en `p` (los sonidos del mundo que reacciona van a 0.5, como los ambientes). */
function pico(b: Float32Array, p = 0.5): Float32Array {
  let m = 0;
  for (const v of b) m = Math.max(m, Math.abs(v));
  if (m > 0) for (let i = 0; i < b.length; i++) b[i] *= p / m;
  return b;
}
/**
 * Los sonidos nuevos usan su propia semilla y después dejan la de siempre como estaba: así agregar uno no cambia el
 * ruido de los que ya estaban (ni la música, que se genera después).
 */
function aparte(s: number, fn: () => Float32Array, p = 0.5): Float32Array {
  const keep = seed;
  seed = s;
  try { return pico(fn(), p); } finally { seed = keep; }
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
  | 'arbusto_sacudir' | 'hongo_rebote' | 'charco_pisar' | 'rana_salto' | 'palanca' | 'puerta_abrir' | 'reja_abrir' | 'piedra_arrastrar' | 'campana_chica' | 'telarana_romper'
  | 'cristal_prender' | 'cristal_apagar' | 'polilla_aleteo' | 'minero_golpe' | 'sombra_aparece' | 'carrito_rodar' | 'figura_irse'
  | 'latido'
  | 'campana_lejos' | 'campana_cerca' | 'marea_sube' | 'farol_prender' | 'farol_apagar' | 'thor_alza_farol' | 'marinero_se_deshace' | 'cangrejo_tenaza' | 'medusa_toca'
  | 'ancla_golpe' | 'pez_emerge' | 'pez_mordida' | 'ola' | 'faro_prende'
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
  // ---- el mundo que reacciona (2.9): cortos, de 0.2 a 0.8 s, con pico de 0.5 ----
  // arbusto que se sacude: hojas que rozan (0.35 s)
  arbusto_sacudir: () => aparte(1037, () => mix([{ wave: 'noise', f0: 3200, f1: 1400, dur: 0.18, a: 0.02, vol: 0.4, lp: 0.45 }, { wave: 'noise', f0: 2600, f1: 1100, dur: 0.16, at: 0.12, a: 0.02, vol: 0.32, lp: 0.4 }])),
  // hongo que rebota: boing blandito (0.35 s)
  hongo_rebote: () => aparte(1074, () => mix([{ wave: 'sine', f0: 180, f1: 420, dur: 0.14, vol: 0.6 }, { wave: 'sine', f0: 420, f1: 260, dur: 0.2, at: 0.12, vol: 0.4, vib: [14, 0.6] }])),
  // pisar un charco: plaf con gotitas (0.4 s)
  charco_pisar: () => aparte(1111, () => mix([{ wave: 'noise', f0: 1600, f1: 500, dur: 0.16, a: 0.01, vol: 0.5, lp: 0.35 }, ...[0.08, 0.15, 0.24].map((at, i) => ({ wave: 'sine' as Wave, f0: 900 + i * 250, f1: 1500 + i * 300, dur: 0.05, at, vol: 0.25 }))])),
  // rana que salta: croac corto y el salto (0.35 s)
  rana_salto: () => aparte(1148, () => mix([{ wave: 'square', f0: 140, f1: 110, dur: 0.12, vol: 0.4, duty: 0.3, vib: [30, 2] }, { wave: 'noise', f0: 1200, f1: 600, dur: 0.08, at: 0.18, vol: 0.3, lp: 0.4 }])),
  // palanca: clac de madera y metal (0.4 s)
  palanca: () => aparte(1185, () => mix([{ wave: 'noise', f0: 2400, f1: 900, dur: 0.06, vol: 0.5 }, { wave: 'square', f0: 220, f1: 160, dur: 0.1, vol: 0.35, duty: 0.25 }, { wave: 'square', f0: 330, f1: 300, dur: 0.12, at: 0.18, vol: 0.3, duty: 0.25 }])),
  // puerta de madera que se abre: crujido de bisagra (0.8 s)
  puerta_abrir: () => aparte(1222, () => mix([{ wave: 'saw', f0: 260, f1: 380, dur: 0.6, a: 0.05, vol: 0.35, lp: 0.12, vib: [22, 1.8] }, { wave: 'noise', f0: 700, f1: 300, dur: 0.12, at: 0.62, vol: 0.4, lp: 0.3 }])),
  // reja de la Catedral: hierro que sube con cadena (0.8 s)
  reja_abrir: () => aparte(1259, () => mix([...Array.from({ length: 6 }, (_, i) => ({ wave: 'square' as Wave, f0: 760 + (i % 2) * 90, dur: 0.05, at: i * 0.1, vol: 0.22, duty: 0.2 })), { wave: 'noise', f0: 3000, f1: 1200, dur: 0.7, a: 0.05, vol: 0.12, lp: 0.5 }])),
  // piedra que arrastra Thor: roce grave (0.7 s)
  piedra_arrastrar: () => aparte(1296, () => mix([{ wave: 'noise', f0: 500, f1: 300, dur: 0.65, a: 0.08, vol: 0.6, lp: 0.15 }, { wave: 'sine', f0: 70, f1: 55, dur: 0.6, vol: 0.3 }])),
  // campana chica: ding de bronce con eco corto (0.8 s)
  campana_chica: () => aparte(1333, () => mix([{ wave: 'sine', f0: NOTE('E6'), dur: 0.75, vol: 0.5 }, { wave: 'sine', f0: NOTE('E6') * 2.4, dur: 0.4, vol: 0.18 }, { wave: 'triangle', f0: NOTE('B5'), dur: 0.6, at: 0.02, vol: 0.2 }])),
  // telaraña que se rompe: hilos finos que se cortan (0.3 s)
  telarana_romper: () => aparte(1370, () => mix([...[0, 0.06, 0.13].map((at, i) => ({ wave: 'noise' as Wave, f0: 7000 - i * 800, f1: 4000, dur: 0.05, at, vol: 0.35, lp: 0.7 })), { wave: 'sine', f0: 1800, f1: 2600, dur: 0.08, at: 0.16, vol: 0.12 }])),
  // ---- el Mundo 3 (3.5): todo bajito, pico de 0.5, nada que asuste de golpe ----
  // cristal que se prende: brillo que sube (0.8 s), tres notas de vidrio que se encienden en orden
  cristal_prender: () => aparte(2101, () => mix([...['E6', 'B6', 'E7'].map((n, i) => ({ wave: 'sine' as Wave, f0: NOTE(n), dur: 0.8 - i * 0.12, at: i * 0.1, a: 0.05, vol: 0.32 - i * 0.06, vib: [7, 0.3] as [number, number] })), { wave: 'triangle', f0: 600, f1: 1800, dur: 0.5, a: 0.2, vol: 0.12 }])),
  // cristal que se apaga: brillo que baja (0.6 s)
  cristal_apagar: () => aparte(2203, () => mix([{ wave: 'sine', f0: NOTE('B6'), f1: NOTE('E5'), dur: 0.55, a: 0.02, vol: 0.32 }, { wave: 'triangle', f0: 1400, f1: 300, dur: 0.45, vol: 0.12 }])),
  // aleteo de polilla: tres batidas de aire blando (0.4 s)
  polilla_aleteo: () => aparte(2309, () => mix([0, 0.12, 0.24].map((at) => ({ wave: 'noise' as Wave, f0: 900, f1: 400, dur: 0.09, at, a: 0.03, vol: 0.45, lp: 0.12 })))),
  // minero de piedra: piedra contra piedra, sordo (0.45 s)
  minero_golpe: () => aparte(2411, () => mix([{ wave: 'noise', f0: 1600, f1: 300, dur: 0.18, vol: 0.6, lp: 0.25 }, { wave: 'sine', f0: 95, f1: 45, dur: 0.35, vol: 0.55 }, { wave: 'noise', f0: 3000, f1: 1500, dur: 0.05, at: 0.06, vol: 0.2 }])),
  // la sombra aparece: un soplido suave que sube (0.7 s), nada de gritos
  sombra_aparece: () => aparte(2503, () => mix([{ wave: 'noise', f0: 500, f1: 1100, dur: 0.6, a: 0.3, vol: 0.4, lp: 0.08 }, { wave: 'sine', f0: NOTE('D4'), f1: NOTE('F4'), dur: 0.6, a: 0.3, vol: 0.08 }])),
  // carrito que rueda: 3 s en bucle, traqueteo de las ruedas en las juntas del riel y un roce grave parejo
  carrito_rodar: () => aparte(2609, () => mix([{ wave: 'noise', f0: 400, f1: 400, dur: 3, vol: 0.25, lp: 0.08 }, ...Array.from({ length: 12 }, (_, i) => ({ wave: 'noise' as Wave, f0: 2200, f1: 900, dur: 0.05, at: i * 0.25, vol: 0.32 })), ...Array.from({ length: 12 }, (_, i) => ({ wave: 'sine' as Wave, f0: 160, f1: 120, dur: 0.07, at: i * 0.25 + 0.04, vol: 0.25 }))], 0)),
  // la figura se va: humo (soplido que baja) y un "plin" agudo (0.8 s)
  figura_irse: () => aparte(2707, () => mix([{ wave: 'noise', f0: 1200, f1: 300, dur: 0.6, a: 0.05, vol: 0.32, lp: 0.15 }, { wave: 'sine', f0: NOTE('A6'), dur: 0.35, at: 0.42, vol: 0.28 }, { wave: 'sine', f0: NOTE('E7'), dur: 0.25, at: 0.45, vol: 0.1 }])),
  // ---- el intro (parte 4) ----
  // latido grave para el momento de los ojos (1.2 s): dos golpes sordos, el segundo más suave
  latido: () => aparte(4101, () => mix([{ wave: 'sine', f0: 70, f1: 40, dur: 0.28, vol: 0.9 }, { wave: 'noise', f0: 300, f1: 120, dur: 0.1, vol: 0.12, lp: 0.08 }, { wave: 'sine', f0: 62, f1: 38, dur: 0.32, at: 0.24, vol: 0.6 }, { wave: 'sine', f0: 30, dur: 0.01, at: 1.19, vol: 0 }], 0)),
  // Mundo 4, el Puerto Ahogado: todo bajito, sin gritos ni golpes de susto
  campana_lejos: () => aparte(5101, () => campana(NOTE('D4'), 2.6, true)),
  campana_cerca: () => aparte(5203, () => campana(NOTE('D4'), 3.2, false)),
  marea_sube: () => aparte(5309, () => mix([
    { wave: 'noise', f0: 300, f1: 500, dur: 6, a: 2.2, vol: 0.5, lp: 0.05 },
    ...[0.6, 1.9, 3.1, 4.2, 5.0].map((at, i) => ({ wave: 'noise' as Wave, f0: 1400 - i * 80, f1: 400, dur: 0.9, at, a: 0.35, vol: 0.16 + i * 0.04, lp: 0.12 })),
    { wave: 'sine', f0: 55, f1: 70, dur: 6, a: 2.5, vol: 0.22 },
  ], 0)),
  farol_prender: () => aparte(5401, () => mix([
    { wave: 'noise', f0: 6000, f1: 2500, dur: 0.06, vol: 0.4, lp: 0.7 },
    { wave: 'noise', f0: 900, f1: 1600, dur: 0.45, at: 0.05, a: 0.15, vol: 0.28, lp: 0.2 },
    ...['A5', 'E6'].map((n, i) => ({ wave: 'sine' as Wave, f0: NOTE(n), dur: 0.7 - i * 0.1, at: 0.25 + i * 0.08, a: 0.03, vol: 0.22 - i * 0.06, vib: [5, 0.12] as [number, number] })),
  ])),
  farol_apagar: () => aparte(5503, () => mix([{ wave: 'noise', f0: 1800, f1: 500, dur: 0.5, a: 0.05, vol: 0.35, lp: 0.15 }, { wave: 'sine', f0: NOTE('E5'), f1: NOTE('A4'), dur: 0.45, at: 0.05, vol: 0.14 }])),
  thor_alza_farol: () => aparte(5607, () => mix([
    { wave: 'triangle', f0: 400, f1: 680, dur: 0.75, a: 0.08, vol: 0.45, vib: [6, 0.5] },
    { wave: 'sine', f0: 800, f1: 1360, dur: 0.75, a: 0.1, vol: 0.1 },
    { wave: 'triangle', f0: 680, f1: 640, dur: 0.35, at: 0.72, vol: 0.3, vib: [6, 0.4] },
  ])),
  marinero_se_deshace: () => aparte(5701, () => mix([{ wave: 'noise', f0: 600, f1: 2400, dur: 0.9, a: 0.1, vol: 0.4, lp: 0.1 }, { wave: 'sine', f0: NOTE('E5'), f1: NOTE('B5'), dur: 0.8, at: 0.1, a: 0.2, vol: 0.12, vib: [4, 0.3] }])),
  cangrejo_tenaza: () => aparte(5803, () => mix([0, 0.09].flatMap((at) => [{ wave: 'noise' as Wave, f0: 5000, f1: 2500, dur: 0.035, at, vol: 0.5, lp: 0.8 }, { wave: 'square' as Wave, f0: 900, f1: 700, dur: 0.03, at, vol: 0.2, duty: 0.2 }]))),
  medusa_toca: () => aparte(5903, () => mix([{ wave: 'sine', f0: 360, f1: 140, dur: 0.28, a: 0.01, vol: 0.5, vib: [18, 0.8] }, { wave: 'sine', f0: 720, f1: 400, dur: 0.12, at: 0.05, vol: 0.12 }])),
  ancla_golpe: () => aparte(6007, () => mix([{ wave: 'sine', f0: 85, f1: 38, dur: 0.6, vol: 0.8 }, { wave: 'noise', f0: 1500, f1: 200, dur: 0.4, vol: 0.4, lp: 0.25 }, { wave: 'square', f0: NOTE('C#6'), dur: 0.5, at: 0.02, vol: 0.06, duty: 0.3 }, { wave: 'sine', f0: NOTE('C#6') * 2.7, dur: 0.4, at: 0.02, vol: 0.05 }])),
  pez_emerge: () => aparte(6109, () => mix([
    { wave: 'noise', f0: 900, f1: 2600, dur: 0.5, a: 0.12, vol: 0.45, lp: 0.2 },
    { wave: 'noise', f0: 2200, f1: 500, dur: 0.7, at: 0.4, vol: 0.35, lp: 0.3 },
    ...Array.from({ length: 7 }, (_, i) => ({ wave: 'sine' as Wave, f0: 260 + i * 70, f1: 700 + i * 90, dur: 0.06, at: 0.55 + i * 0.07, vol: 0.12 })),
    { wave: 'sine', f0: 70, f1: 50, dur: 0.6, vol: 0.3 },
  ])),
  pez_mordida: () => aparte(6203, () => mix([{ wave: 'noise', f0: 3000, f1: 900, dur: 0.12, vol: 0.4, lp: 0.5 }, { wave: 'sine', f0: 140, f1: 60, dur: 0.22, at: 0.05, vol: 0.6 }, { wave: 'noise', f0: 1600, f1: 400, dur: 0.4, at: 0.1, vol: 0.25, lp: 0.2 }])),
  ola: () => aparte(6301, () => mix([{ wave: 'noise', f0: 500, f1: 1800, dur: 0.6, a: 0.3, vol: 0.5, lp: 0.12 }, { wave: 'noise', f0: 2400, f1: 400, dur: 1.2, at: 0.5, vol: 0.45, lp: 0.25 }, { wave: 'sine', f0: 60, f1: 40, dur: 1.2, at: 0.4, vol: 0.3 }])),
  faro_prende: () => aparte(6409, () => mix([
    { wave: 'triangle', f0: 200, f1: 400, dur: 1.4, a: 0.6, vol: 0.25, vib: [3, 0.2] },
    ...['D5', 'F#5', 'A5', 'D6'].map((n, i) => ({ wave: 'sine' as Wave, f0: NOTE(n), dur: 1.4 - i * 0.15, at: 0.3 + i * 0.12, a: 0.08, vol: 0.18, vib: [5, 0.1] as [number, number] })),
    { wave: 'noise', f0: 8000, dur: 1.2, at: 0.4, a: 0.4, vol: 0.04, lp: 0.6 },
  ])),
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

/** Deja `len` segundos justos: lo que suena después del final vuelve al principio (para que el bucle no corte). */
function loopTo(x: Float32Array, seconds: number): Float32Array {
  const n = Math.round(seconds * RATE), out = new Float32Array(n);
  for (let i = 0; i < x.length; i++) out[i % n] += x[i];
  return out;
}
/** Con su propia semilla, como los sonidos nuevos: no cambia el ruido de lo que se genera después. */
function conSemilla(s: number, fn: () => Float32Array): Float32Array {
  const keep = seed;
  seed = s;
  try { return fn(); } finally { seed = keep; }
}

/**
 * Las Galerías del Eco (90 s en bucle): lenta y misteriosa, con mucho espacio. Bajo grave que casi no se mueve,
 * campanitas de cristal sueltas que vuelven con eco, y una melodía en Mi menor que aparece y se va.
 */
export function musicGalerias(): Float32Array {
  return conSemilla(3101, () => {
    const hold = (n: string, len: number) => [n, ...Array.from({ length: len - 1 }, () => '-')];
    const rest = (len: number) => Array.from({ length: len }, () => '.');
    // 192 corcheas a 64 bpm = 90 s: cuatro partes de 48
    const bass = [...hold('E2', 24), ...hold('C2', 24), ...hold('A1', 24), ...hold('B1', 24), ...hold('E2', 24), ...hold('G1', 24), ...hold('A1', 24), ...hold('B1', 24)];
    const lead = [
      ...rest(16), 'B4', '-', '-', '-', 'E5', '-', '-', '-', 'G5', '-', 'F#5', '-', 'E5', '-', '-', '-', '-', '-', '-', '-', ...rest(16),
      ...rest(8), 'D5', '-', '-', '-', 'E5', '-', 'B4', '-', '-', '-', '-', '-', ...rest(28),
      ...rest(16), 'G5', '-', '-', '-', 'A5', '-', 'B5', '-', '-', '-', 'A5', '-', 'G5', '-', 'F#5', '-', 'E5', '-', '-', '-', '-', '-', '-', '-', ...rest(8),
      ...rest(48),
    ];
    const eco = ['.', '.', '.', '.', ...lead.slice(0, lead.length - 4)];
    // campanitas de cristal: notas altas sueltas, nunca en el pulso esperado
    const bells = Array.from({ length: 192 }, (_, i) => ([5, 19, 29, 43, 61, 70, 88, 101, 117, 131, 150, 163, 177, 186].includes(i) ? ['E6', 'B6', 'G6', 'D7', 'F#6', 'E7'][i % 6] : '.'));
    const pad = [...hold('G3', 48), ...hold('E3', 48), ...hold('G3', 48), ...hold('F#3', 48)];
    const buf = song(64, 192, [
      { wave: 'sine', notes: bass, vol: 0.34 },
      { wave: 'triangle', notes: pad, vol: 0.05 },
      { wave: 'triangle', notes: lead, vol: 0.15, vib: [4, 0.3] },
      { wave: 'triangle', notes: eco, vol: 0.05, vib: [4, 0.3] },
      { wave: 'sine', notes: bells, vol: 0.13 },
    ], '', 1);
    return loopTo(buf, 90);
  });
}

/**
 * La Polilla Reina: más rítmica (118 bpm), en Mi menor, con el aleteo en la percusión (batidas de aire en
 * semicorcheas que suben y bajan). 32 corcheas por vuelta, cuatro vueltas.
 */
export function musicJefePolilla(): Float32Array {
  return conSemilla(3203, () => {
    const lead = [
      'E5', '-', 'G5', '-', 'B5', '-', 'A5', 'G5', 'F#5', '-', 'E5', '-', 'D5', '-', 'E5', '-',
      'G5', '-', 'F#5', 'E5', 'D5', '-', 'B4', '-', 'C5', '-', 'D5', '-', 'E5', '-', '-', '-',
    ];
    const lead2 = lead.map((n) => (n === '-' || n === '.' ? n : n.replace(/\d/, (d) => String(Number(d) + 1))));
    const bass = rep(['E2', '.', 'E2', 'E3', 'C2', '.', 'C2', 'C3', 'A1', '.', 'A1', 'A2', 'B1', '.', 'B1', 'B2'], 2);
    const arp = rep(['E4', 'G4', 'B4', 'G4', 'C4', 'E4', 'G4', 'E4', 'A3', 'C4', 'E4', 'C4', 'B3', 'D#4', 'F#4', 'D#4'], 2);
    const drums = rep(['k', 'h', 's', 'h', 'k', 'k', 's', 'h'], 4).join('');
    const parts: Float32Array[] = [];
    for (const [l, withArp] of [[lead, false], [lead, true], [lead2, true], [lead, true]] as [string[], boolean][]) {
      parts.push(song(118, 32, [
        { wave: 'square', notes: l, vol: 0.13, duty: 0.25, vib: [6, 0.2] },
        { wave: 'triangle', notes: bass, vol: 0.3 },
        ...(withArp ? [{ wave: 'square' as Wave, notes: arp, vol: 0.05, duty: 0.125 }] : []),
      ], drums, 1));
    }
    const beat = 60 / 118 / 2, seg = Math.round(32 * beat * RATE);
    const out = new Float32Array(seg * 4);
    parts.forEach((p, k) => { for (let i = 0; i < p.length; i++) out[(k * seg + i) % out.length] += p[i]; });
    // el aleteo: batidas de aire en semicorcheas, en grupos de cuatro que crecen
    const flutter = mix(Array.from({ length: 128 * 2 }, (_, i) => ({ wave: 'noise' as Wave, f0: 1400, f1: 500, dur: beat / 2 * 0.8, at: i * (beat / 2), vol: 0.05 + 0.05 * ((i % 4) / 3), lp: 0.15 })), 0);
    for (let i = 0; i < flutter.length; i++) out[i % out.length] += flutter[i];
    // al nivel de las otras músicas
    let m = 0;
    for (const v of out) m = Math.max(m, Math.abs(v));
    if (m > 0) for (let i = 0; i < out.length; i++) out[i] *= 0.6 / m;
    return out;
  });
}

/**
 * La música del intro (27 s, sin bucle), sincronizada con GUION_INTRO del juego: épica y grave, con un coro sin
 * palabras. Golpes en 9 s (los ojos), 13 s (los guardianes) y 23 s (el título), y medio segundo de silencio justo
 * antes del título. Los golpes son graves y redondos: impresionan sin asustar.
 */
export function musicIntro(): Float32Array {
  return conSemilla(3307, () => {
    const len = Math.round(27 * RATE), buf = new Float32Array(len);
    const N = (n: string) => NOTE(n);
    /** colchón sostenido (el coro): varias voces desafinadas apenas, con vibrato lento y un filtro que respira */
    const pad = (t0: number, t1: number, notes: string[], vol: number, att = 1.2, rel = 1.2, bright = 0.12) => {
      const s0 = Math.floor(t0 * RATE), s1 = Math.min(len, Math.floor(t1 * RATE));
      notes.forEach((n, k) => {
        for (const det of [-0.12, 0.1]) {
          let ph = 0, lp = 0;
          const f0 = N(n) * Math.pow(2, det / 12);
          for (let i = s0; i < s1; i++) {
            const t = (i - s0) / RATE, rest = (s1 - i) / RATE;
            const f = f0 * Math.pow(2, (Math.sin(t * (4.8 + k * 0.3) * Math.PI * 2) * 0.12) / 12);
            ph += f / RATE;
            const p = ph - Math.floor(ph);
            // un "aah": triángulo con un poco de diente de sierra, pasado por un pasa bajos
            const raw = (p < 0.5 ? p * 4 - 1 : 3 - p * 4) * 0.8 + (p * 2 - 1) * 0.2;
            lp += (raw - lp) * (bright + 0.04 * Math.sin(t * 0.7));
            const env = Math.min(1, t / att) * Math.min(1, rest / rel);
            buf[i] += lp * env * vol;
          }
        }
      });
    };
    /** el golpe: un tambor grande (seno que baja) con un poco de aire, y su eco */
    const boom = (t: number, vol: number) => {
      for (const [dt, k] of [[0, 1], [0.32, 0.25]] as [number, number][]) {
        const s0 = Math.floor((t + dt) * RATE), n = Math.floor(1.6 * RATE);
        let ph = 0, lp = 0;
        for (let i = 0; i < n && s0 + i < len; i++) {
          const u = i / RATE;
          const f = 38 + 60 * Math.exp(-u * 9);
          ph += f / RATE;
          const env = Math.min(1, i / (RATE * 0.004)) * Math.exp(-u * 3.2);
          lp += ((rnd() * 2 - 1) - lp) * 0.06;
          buf[s0 + i] += (Math.sin(ph * Math.PI * 2) * 0.9 + lp * Math.exp(-u * 14) * 0.6) * env * vol * k;
        }
      }
    };
    /** tambores del medio (taiko chicos) */
    const drum = (t: number, vol: number) => {
      const s0 = Math.floor(t * RATE), n = Math.floor(0.5 * RATE);
      let ph = 0;
      for (let i = 0; i < n && s0 + i < len; i++) { const u = i / RATE; ph += (70 + 50 * Math.exp(-u * 20)) / RATE; buf[s0 + i] += Math.sin(ph * Math.PI * 2) * Math.exp(-u * 8) * vol; }
    };
    // 0 a 9 s: el bajo grave que crece y el coro que entra de a poco (Re menor)
    pad(0, 9.2, ['D2', 'A2'], 0.16, 3, 0.6, 0.05);
    pad(2.5, 9.2, ['D4', 'F4', 'A4'], 0.05, 3, 0.6, 0.08);
    // 9 s: los ojos. Golpe, y el coro sube
    boom(9, 0.9);
    pad(9, 13.2, ['A#1', 'F2'], 0.18, 0.3, 0.5, 0.05);
    pad(9, 13.2, ['A#3', 'D4', 'F4'], 0.07, 0.6, 0.5, 0.1);
    // 13 s: los guardianes. Golpe más fuerte, tambores y el coro arriba
    boom(13, 1);
    for (let t = 13.75; t < 22; t += 0.75) { drum(t, 0.32); if ((t * 4) % 3 < 0.5) drum(t + 0.375, 0.18); }
    pad(13, 17.6, ['C2', 'G2'], 0.18, 0.3, 0.4, 0.05);
    pad(13, 17.6, ['C4', 'E4', 'G4'], 0.08, 0.5, 0.4, 0.12);
    pad(17.6, 22.5, ['A1', 'E2'], 0.18, 0.4, 0.15, 0.05);
    pad(17.6, 22.5, ['A3', 'C#4', 'E4', 'A4'], 0.085, 0.6, 0.15, 0.14);
    // 22.5 a 23 s: silencio. 23 s: el título, el acorde grande en Re mayor que se queda sonando
    boom(23, 1);
    pad(23, 27, ['D2', 'A2'], 0.2, 0.05, 2.2, 0.06);
    pad(23, 27, ['D4', 'F#4', 'A4', 'D5'], 0.08, 0.15, 2.2, 0.16);
    // el silencio de verdad antes del título (con fundidos de 30 ms)
    const a = Math.floor(22.5 * RATE), b = Math.floor(23 * RATE), fade = Math.floor(0.03 * RATE);
    for (let i = a - fade; i < b; i++) buf[i] *= i < a ? (a - i) / fade : 0;
    let m = 0;
    for (const v of buf) m = Math.max(m, Math.abs(v));
    if (m > 0) for (let i = 0; i < len; i++) buf[i] *= 0.6 / m;
    return buf;
  });
}


/** Campana grave: parciales de bronce que no son armónicos y se apagan despacio. Lejos: sin los agudos y con eco. */
function campana(f: number, dur: number, far: boolean): Float32Array {
  const parts: [number, number][] = [[0.5, 0.35], [1, 0.5], [1.19, 0.22], [1.56, 0.16], [2.0, 0.12], [2.74, 0.07]];
  const voices: Voice[] = [];
  (far ? [0, 0.42, 0.9] : [0]).forEach((at, e) => {
    for (const [m, v] of parts) {
      if (far && m > 2) continue;
      voices.push({ wave: 'sine', f0: f * m, dur: dur * (1.1 - m * 0.12), at, a: far ? 0.04 : 0.005, vol: v * Math.pow(0.4, e), ...(far ? { lp: 0.3 } : {}) });
    }
  });
  if (!far) voices.push({ wave: 'noise', f0: 5000, f1: 2000, dur: 0.05, vol: 0.12, lp: 0.6 });
  return mix(voices);
}

/**
 * El Pez Farol (en bucle): grave y marina, en Re menor a 84. Bajo que se mece como el agua, una melodía oscura y la
 * percusión de olas (ruido que crece y rompe en cada compás).
 */
export function musicJefePez(): Float32Array {
  return conSemilla(6501, () => {
    const lead = [
      'D4', '-', '-', 'F4', 'E4', '-', 'D4', '-', 'A3', '-', '-', '-', 'C4', '-', 'D4', '-',
      'F4', '-', '-', 'G4', 'A4', '-', 'G4', 'F4', 'E4', '-', '-', '-', 'C#4', '-', '-', '-',
    ];
    const high = lead.map((n) => (n === '-' || n === '.' ? n : n.replace(/\d/, (d) => String(Number(d) + 1))));
    const bass = rep(['D2', '-', '.', 'D2', 'A1', '-', '.', 'A1', 'Bb1', '-', '.', 'Bb1', 'A1', '-', 'C2', 'C#2'], 2);
    const drums = rep(['k', '.', '.', '.', '.', '.', 'k', '.', '.', '.', '.', '.', '.', '.', '.', '.'], 2).join('');
    const beat = 60 / 84 / 2, seg = Math.round(32 * beat * RATE);
    const out = new Float32Array(seg * 4);
    [lead, lead, high, lead].forEach((l, k) => {
      const p = song(84, 32, [
        { wave: 'square', notes: l, vol: 0.12, duty: 0.125, vib: [4, 0.25] },
        { wave: 'triangle', notes: bass, vol: 0.34 },
        ...(k > 0 ? [{ wave: 'triangle' as Wave, notes: l.map((n) => (n === '-' || n === '.' ? n : n.replace(/\d/, (d) => String(Number(d) - 1)))), vol: 0.08 }] : []),
      ], drums, 1);
      for (let i = 0; i < p.length; i++) out[(k * seg + i) % out.length] += p[i];
    });
    // las olas: un ruido grave que crece en cada compás y rompe
    const olas = mix(Array.from({ length: 8 }, (_, i) => ({ wave: 'noise' as Wave, f0: 500, f1: 1300, dur: beat * 14, at: i * beat * 16, a: beat * 10, vol: 0.12, lp: 0.07 })), 0);
    for (let i = 0; i < olas.length; i++) out[i % out.length] += olas[i];
    let m = 0;
    for (const v of out) m = Math.max(m, Math.abs(v));
    if (m > 0) for (let i = 0; i < out.length; i++) out[i] *= 0.6 / m;
    return out;
  });
}

/**
 * El Capitán Ahogado (en bucle): un acordeón triste en La menor, de vals lento, que se vuelve tenso (más rápido, con
 * el bajo que late y la caja). El acordeón son dos voces cuadradas apenas desafinadas entre sí.
 */
export function musicCapitan(): Float32Array {
  return conSemilla(6603, () => {
    const vals = [
      'A4', '-', 'C5', '-', 'E5', '-', 'D5', '-', '-', '-', 'C5', '-', 'B4', '-', 'G#4', '-', 'A4', '-', 'B4', '-', '-', '-', '.', '.',
      'C5', '-', 'E5', '-', 'A5', '-', 'G5', '-', 'F5', '-', 'E5', '-', 'D5', '-', 'B4', '-', 'G#4', '-', 'A4', '-', '-', '-', '-', '-',
    ];
    const valsBass = rep(['A2', '.', 'E3', '.', 'E3', '.', 'E2', '.', 'B2', '.', 'B2', '.', 'A2', '.', 'E3', '.', 'E3', '.', 'E2', '.', 'G#2', '.', 'G#2', '.'], 2);
    const accordion = (notes: string[], vol: number) => [
      { wave: 'square' as Wave, notes, vol, duty: 0.42, vib: [5.5, 0.18] as [number, number] },
      { wave: 'square' as Wave, notes, vol: vol * 0.6, duty: 0.3, vib: [6.3, 0.26] as [number, number] },
    ];
    const a = song(72, 48, [...accordion(vals, 0.1), { wave: 'triangle', notes: valsBass, vol: 0.28 }], '', 1);
    // tenso: más rápido, el bajo en corcheas, caja en el contratiempo y la melodía una octava más arriba a veces
    const tenseBass = rep(['A2', 'A2', 'A2', 'A2', 'E2', 'E2', 'F2', 'F2', 'E2', 'E2', 'G#2', 'G#2'], 4);
    const tense = vals.map((n, i) => (n === '-' || n === '.' || i % 12 > 5 ? n : n.replace(/\d/, (d) => String(Number(d) + 1))));
    const drums = rep(['k', '.', 's', '.', 'k', 's'], 8).join('');
    const b = song(104, 48, [...accordion(tense, 0.11), { wave: 'triangle', notes: tenseBass, vol: 0.3 }], drums, 1);
    const la = Math.round(48 * (60 / 72 / 2) * RATE), lb = Math.round(48 * (60 / 104 / 2) * RATE);
    const out = new Float32Array(la + lb);
    for (let i = 0; i < a.length; i++) out[i % out.length] += a[i];
    for (let i = 0; i < b.length; i++) out[(la + i) % out.length] += b[i];
    let m = 0;
    for (const v of out) m = Math.max(m, Math.abs(v));
    if (m > 0) for (let i = 0; i < out.length; i++) out[i] *= 0.6 / m;
    return out;
  });
}

/** El faro se prende (30 s, no es bucle): victoria cálida en Re mayor que después se calma y se apaga despacio. */
export function musicFaro(): Float32Array {
  return conSemilla(6707, () => {
    const lead = [
      'D5', '-', 'F#5', '-', 'A5', '-', '-', '-', 'B5', '-', 'A5', '-', 'F#5', '-', '-', '-', 'G5', '-', 'F#5', '-', 'E5', '-', 'D5', '-', 'E5', '-', '-', '-', '-', '-', '.', '.',
      'D5', '-', 'F#5', '-', 'A5', '-', 'D6', '-', 'C#6', '-', 'B5', '-', 'A5', '-', '-', '-', 'G5', '-', 'E5', '-', 'F#5', '-', 'E5', '-', 'D5', '-', '-', '-', '-', '-', '-', '-',
      'A4', '-', '-', '-', 'D5', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-',
    ];
    const bass = rep(['D3', '-', 'A3', '-', 'G3', '-', 'A3', '-'], 8).concat(['D3', '-', '-', '-', '-', '-', '-', '-', 'D3', '-', '-', '-', '-', '-', '-', '-']);
    const arp = rep(['D5', 'F#5', 'A5', 'F#5', 'G4', 'B4', 'D5', 'B4'], 4).concat(rep(['.'], 16)).concat(rep(['D5', 'A5', 'D6', 'A5'], 4));
    const buf = song(80, 80, [
      { wave: 'triangle', notes: lead, vol: 0.2, vib: [5, 0.15] },
      { wave: 'triangle', notes: bass, vol: 0.28 },
      { wave: 'sine', notes: arp, vol: 0.07 },
    ], '', 1);
    const out = new Float32Array(Math.round(30 * RATE));
    for (let i = 0; i < Math.min(out.length, buf.length); i++) out[i] = buf[i];
    // se calma: desde los 20 s baja hasta el silencio
    for (let i = 0; i < out.length; i++) { const t = i / RATE; if (t > 20) out[i] *= Math.max(0, 1 - (t - 20) / 10); }
    let m = 0;
    for (const v of out) m = Math.max(m, Math.abs(v));
    if (m > 0) for (let i = 0; i < out.length; i++) out[i] *= 0.55 / m;
    return out;
  });
}

export const MUSIC = { catedral: musicCatedral, bosque: musicBosque, jefe: musicJefe, victoria: musicVictoria, titulo: musicTitulo, amenaza: musicAmenaza, combate: musicCombate, fogata: musicFogata, galerias: musicGalerias, jefe_polilla: musicJefePolilla, intro: musicIntro, jefe_pez: musicJefePez, capitan: musicCapitan, faro: musicFaro };
