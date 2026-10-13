import { Mixer, seq, hz, rng, normalize, trimTail, type Note } from './synth';
import { RATE } from './sfx';

/**
 * Música, efectos y voces para juegos de deporte y de pelea de barrio: una marcha de banda escolar, un tema con
 * đàn tranh, un tema de pelea, fanfarria y derrota, golpes, objetos, público y voces en "blips" con tono y timbre
 * por personaje. Sintetizado con código, determinista.
 */

// ---------- utilidades de armonía ----------
const SCALES: Record<string, string[]> = {
  Bb: ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'],
  Eb: ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'],
};
const midi = (n: string) => Math.round(12 * Math.log2(hz(n) / 440)) + 69;
/** La nota una tercera diatónica abajo, en la escala dada (3 o 4 semitonos más grave). */
export function thirdBelow(n: string, key: string): string {
  const m = /^([A-G][b#]?)(-?\d)$/.exec(n)!;
  const sc = SCALES[key], i = sc.indexOf(m[1]);
  if (i < 0) return n;
  const name = sc[(i + 5) % 7], o = Number(m[2]), top = midi(n);
  for (const oct of [o, o - 1]) { const d = top - midi(`${name}${oct}`); if (d === 3 || d === 4) return `${name}${oct}`; }
  return n;
}

// ---------- marcha de banda escolar ----------
/**
 * Marcha de banda escolar en Si bemol, 132 bpm, 33 compases: 60 s exactos en bucle sin corte. Trompeta en onda
 * cuadrada con la segunda voz en terceras, tuba con "um-pa", contratiempos de metales, redoblante con ruido (con
 * redobles al cierre de cada frase), bombo y platillos, y glockenspiel en la última vuelta.
 */
export function marchaBanda(): Float32Array {
  const bpm = 132, e = 60 / bpm / 2, bar = e * 8;
  const m = new Mixer(33 * bar, true, 132);
  const A = [
    'F4/2 Bb4 r Bb4 C5 D5/2', 'Eb5/2 D5 C5 Bb4/2 F4/2', 'G4/2 C5 r C5 D5 Eb5/2', 'F5/4 D5/2 r/2',
    'F5/2 Eb5 D5 Eb5/2 C5/2', 'D5/2 C5 Bb4 C5/2 A4/2', 'Bb4 C5 D5 Eb5 F5/2 A4/2', 'Bb4/4 r/2 F4 F4',
  ];
  const A2 = [...A.slice(0, 6), 'Bb4 C5 D5 Eb5 F5 G5 A5/2', 'Bb5/4 r/4'];
  const B = [
    'G5/3 F5 Eb5/2 Bb4/2', 'C5/2 Eb5/2 G5/4', 'Ab5/3 G5 F5/2 D5/2', 'Eb5/6 r/2',
    'G5/3 F5 Eb5/2 G5/2', 'Bb5/2 Ab5/2 G5/2 F5/2', 'Eb5/2 G5/2 F5/2 D5/2', 'Eb5/4 F5/2 F5 F5',
  ];
  const A3 = [...A.slice(0, 7), 'Bb4/2 D5/2 F5/2 Bb5/2'];
  const melody = [...A, ...A2, ...B, ...A3];
  const chordsA = ['Bb', 'Eb', 'C', 'F', 'F', 'Bb', 'F', 'Bb'], chordsB = ['Eb', 'C', 'Bb', 'Eb', 'Eb', 'Bb', 'Bb', 'F'];
  const chords = [...chordsA, ...chordsA, ...chordsB, ...chordsA];
  const TRIAD: Record<string, string[]> = { Bb: ['Bb3', 'D4', 'F4'], Eb: ['Eb4', 'G4', 'Bb4'], C: ['C4', 'Eb4', 'G4'], F: ['F3', 'A3', 'C4'] };
  const ROOT: Record<string, [string, string]> = { Bb: ['Bb1', 'F2'], Eb: ['Eb2', 'Bb1'], C: ['C2', 'G2'], F: ['F2', 'C2'] };
  // compás 0: redoble que crece
  for (let k = 0; k < 16; k++) m.drum('caja_banda', k * (bar / 16), 0.35 + (k / 16) * 0.6);
  melody.forEach((txt, b) => {
    const t0 = (b + 1) * bar, key = b >= 16 && b < 24 ? 'Eb' : 'Bb', last = b >= 24;
    for (const n of seq(txt, t0, e)) {
      const sus = n.units >= 3;
      m.add({ t: n.t, dur: n.dur * 0.88, f: n.f, wave: 'square', duty: 0.5, vol: 0.2, a: 0.012, d: 0.06, s: 0.75, r: 0.05, vib: sus ? [5.5, 0.18, 0.12] : undefined, lp: 0.55 });
      const h = thirdBelow(n.n, key);
      m.add({ t: n.t, dur: n.dur * 0.86, f: hz(h), wave: 'square', duty: 0.25, vol: 0.09, a: 0.012, s: 0.7, r: 0.05, lp: 0.5 });
      if (last) m.add({ t: n.t, dur: 0.05, f: n.f * 2, wave: 'sine', vol: 0.12, s: 0.6, r: 0.35 });
    }
    // tuba: um (raíz) en 1, pa (quinta) en 3
    const [r1, r5] = ROOT[chords[b]];
    m.add({ t: t0, dur: e * 1.6, f: hz(r1), wave: 'triangle', vol: 0.42, a: 0.01, s: 0.8, r: 0.05 });
    m.add({ t: t0 + 4 * e, dur: e * 1.6, f: hz(r5), wave: 'triangle', vol: 0.38, a: 0.01, s: 0.8, r: 0.05 });
    // contratiempos de los metales en 2 y 4
    for (const at of [2, 6]) for (const c of TRIAD[chords[b]]) m.add({ t: t0 + at * e, dur: e * 0.5, f: hz(c), wave: 'square', duty: 0.25, vol: 0.045, s: 0.6, r: 0.03, lp: 0.4 });
    // batería
    m.drum('bombo_banda', t0, 0.8); m.drum('bombo_banda', t0 + 4 * e, 0.7);
    for (const [k, v] of [[0, 0.7], [2, 0.45], [3, 0.35], [4, 0.6], [6, 0.45], [7, 0.4]] as const) m.drum('caja_banda', t0 + k * e, v);
    if (b % 8 === 0) m.drum('platillo', t0, 0.7);
    else m.drum('platillo', t0 + 2 * e, 0.12);
    // redoble al cierre de cada frase
    if (b % 8 === 7) for (let k = 0; k < 8; k++) m.drum('caja_banda', t0 + 4 * e + k * (e / 2), 0.3 + k * 0.06);
  });
  m.echo(0.11, 0.2, 0.35);
  return normalize(m.out());
}

// ---------- tema con đàn tranh ----------
/**
 * Tema vietnamita en Re pentatónico (Re, Fa, Sol, La, Do), 116 bpm, 16 compases en bucle (33 s): đàn tranh
 * punteado con "nhấn" (la cuerda se dobla al subir a la nota y vibra en las largas), arpegio punteado, bajo,
 * sáo (flauta de bambú) en la segunda vuelta, bloque de madera y tambor chico.
 */
export function temaDanTranh(): Float32Array {
  const bpm = 116, e = 60 / bpm / 2, bar = e * 8;
  const m = new Mixer(16 * bar, true, 116);
  const melody = [
    'A4/2 C5 D5 C5/2 A4/2', 'G4/2 A4 C5 A4/4', 'D5/2 F5 D5 C5/2 A4 G4', 'A4/6 r/2',
    'C5/2 D5 F5 G5/2 F5 D5', 'C5/2 D5 C5 A4/2 G4/2', 'F4/2 G4 A4 C5/2 A4 G4', 'D4/6 r/2',
    'D5/2 F5/2 G5/2 A5/2', 'G5/2 F5 G5 D5/4', 'C5/2 D5 F5 D5/2 C5/2', 'A4/6 r/2',
    'D5/2 F5/2 G5/2 A5 C6', 'A5/2 G5 F5 D5/4', 'C5/2 D5 C5 A4/2 G4/2', 'D5/4 A4/2 C5/2',
  ];
  const roots = ['D3', 'G2', 'D3', 'A2', 'C3', 'F2', 'G2', 'D3', 'D3', 'G2', 'C3', 'A2', 'D3', 'G2', 'C3', 'D3'];
  const R = rng(7);
  melody.forEach((txt, b) => {
    const t0 = b * bar;
    seq(txt, t0, e).forEach((n, i) => {
      // nhấn: algunas notas se tocan un tono abajo y la cuerda sube; las largas vibran
      const slide = n.units >= 2 && R() < 0.4;
      m.add({ t: n.t, dur: n.dur, f: slide ? n.f / Math.pow(2, 2 / 12) : n.f, wave: 'pluck', vol: 0.32, r: 0.25, bend: slide ? { semis: 2, at: 0.03, len: 0.09 } : undefined, vib: n.units >= 4 ? [5, 0.35, 0.25] : undefined });
      // la sáo dobla la melodía en la segunda vuelta, una octava arriba y con soplo
      if (b >= 8) {
        m.add({ t: n.t, dur: n.dur * 0.92, f: n.f * 2, wave: 'sine', vol: 0.07, a: 0.04, s: 0.85, r: 0.08, vib: [5.5, 0.12, 0.15] });
        m.add({ t: n.t, dur: 0.04, f: 3000, wave: 'noise', vol: 0.02, s: 1, r: 0.04, lp: 0.3 });
      }
      void i;
    });
    // arpegio punteado: raíz, quinta, octava, quinta
    const root = hz(roots[b]) * 2;
    [1, 1.5, 2, 1.5, 1, 1.5, 2, 3].forEach((k, j) => m.add({ t: t0 + j * e, dur: e * 0.9, f: root * k, wave: 'pluck', vol: 0.09, r: 0.15 }));
    // bajo en 1 y 3
    m.add({ t: t0, dur: e * 3, f: hz(roots[b]), wave: 'triangle', vol: 0.3, a: 0.01, s: 0.6, r: 0.1 });
    m.add({ t: t0 + 4 * e, dur: e * 3, f: hz(roots[b]) * 1.5, wave: 'triangle', vol: 0.24, a: 0.01, s: 0.6, r: 0.1 });
    // percusión: madera en los contratiempos, tambor chico en 1 y 3, adorno al final de cada 4 compases
    for (const k of [1, 3, 5, 7]) m.drum('madera', t0 + k * e, 0.5);
    m.drum('tom', t0, 0.6); m.drum('tom', t0 + 4 * e, 0.45);
    if (b % 4 === 3) for (const k of [5, 5.5, 6, 6.5, 7]) m.drum('tom', t0 + k * e, 0.35);
  });
  m.echo(0.17, 0.25, 0.4);
  return normalize(m.out());
}

// ---------- tema de pelea ----------
/** Tema de pelea en Mi menor, 160 bpm, 16 compases en bucle (24 s): bajo en corcheas, riff en cuadrada y batería de rock. */
export function temaPelea(): Float32Array {
  const bpm = 160, e = 60 / bpm / 2, bar = e * 8;
  const m = new Mixer(16 * bar, true, 160);
  const half = [
    'E5 E5 G5 E5 B5/2 A5 G5', 'F#5/2 G5 F#5 E5/4', 'E5 E5 G5 E5 C6/2 B5 A5', 'G5/2 A5 G5 E5/4',
    'D5 D5 F#5 D5 A5/2 G5 F#5', 'E5/2 F#5 G5 A5/4',
  ];
  const melody = [...half, 'B5/2 A5 G5 F#5/2 D#5/2', 'B4/4 D#5/2 F#5/2', ...half, 'B5 C6 B5 A5 G5 F#5 E5 D#5', 'E5/4 B4/4'];
  const roots = ['E2', 'E2', 'C2', 'C2', 'D2', 'D2', 'B1', 'B1'];
  melody.forEach((txt, b) => {
    const t0 = b * bar;
    for (const n of seq(txt, t0, e)) m.add({ t: n.t, dur: n.dur * 0.85, f: n.f, wave: 'square', duty: 0.25, vol: 0.17, a: 0.005, s: 0.8, r: 0.04, vib: n.units >= 4 ? [6, 0.2, 0.15] : undefined });
    const root = hz(roots[b % 8]);
    for (let k = 0; k < 8; k++) m.add({ t: t0 + k * e, dur: e * 0.8, f: k % 4 === 3 ? root * 2 : root, wave: 'saw', vol: 0.2, s: 0.8, r: 0.03, lp: 0.25 });
    for (let k = 0; k < 8; k++) m.drum('charles', t0 + k * e, k % 2 ? 0.5 : 0.8);
    m.drum('bombo', t0, 1); m.drum('bombo', t0 + 3 * e, 0.7); m.drum('bombo', t0 + 4 * e, 0.9);
    m.drum('caja', t0 + 2 * e, 0.9); m.drum('caja', t0 + 6 * e, 0.9);
    if (b % 4 === 0) m.drum('platillo', t0, 0.6);
    if (b % 4 === 3) { m.drum('caja', t0 + 7 * e, 0.6); m.drum('caja', t0 + 7.5 * e, 0.7); }
  });
  m.echo(0.09, 0.15, 0.25);
  return normalize(m.out());
}

/** Fanfarria de victoria (4 s): trompetas en Si bemol, tuba, redoble y platillo. */
export function fanfarria(): Float32Array {
  const e = 60 / 140 / 2, m = new Mixer(4.2, false, 140);
  for (let k = 0; k < 6; k++) m.drum('caja_banda', k * (e / 2), 0.3 + k * 0.08);
  const t0 = e * 3;
  for (const n of seq('F4 Bb4 D5 F5/3 D5 F5 Bb5/8', t0, e)) {
    m.add({ t: n.t, dur: n.dur * 0.9, f: n.f, wave: 'square', vol: 0.22, a: 0.01, s: 0.8, r: 0.12, vib: n.units > 3 ? [5.5, 0.2, 0.2] : undefined, lp: 0.6 });
    m.add({ t: n.t, dur: n.dur * 0.9, f: hz(thirdBelow(n.n, 'Bb')), wave: 'square', duty: 0.25, vol: 0.1, a: 0.01, s: 0.8, r: 0.12, lp: 0.5 });
  }
  for (const [t, n] of [[t0, 'Bb1'], [t0 + 3 * e, 'F2'], [t0 + 6 * e, 'Bb1']] as const) m.add({ t, dur: e * 2, f: hz(n), wave: 'triangle', vol: 0.4, s: 0.8, r: 0.1 });
  m.add({ t: t0 + 9 * e, dur: e * 7, f: hz('Bb1'), wave: 'triangle', vol: 0.4, s: 0.8, r: 0.4 });
  m.drum('bombo_banda', t0 + 9 * e, 1); m.drum('platillo', t0 + 9 * e, 0.9);
  m.echo(0.12, 0.25, 0.4);
  return trimTail(normalize(m.out()));
}

/** Derrota (3.5 s): trombón de caricatura que baja, "guau guau guau guaaa". */
export function derrota(): Float32Array {
  const m = new Mixer(3.4, false, 99);
  const notes = [['G3', 0, 0.42], ['F#3', 0.5, 0.42], ['F3', 1.0, 0.42], ['E3', 1.5, 1.4]] as const;
  for (const [n, t, d] of notes) {
    const last = n === 'E3';
    m.add({ t, dur: d, f: hz(n), wave: 'saw', vol: 0.3, a: 0.03, s: 0.85, r: 0.15, lp: 0.12, vib: last ? [6, 0.5, 0.3] : undefined, bend: last ? { semis: -1.5, at: 0.9, len: 0.5 } : { semis: -0.4, at: 0.25, len: 0.15 } });
    m.add({ t, dur: d, f: hz(n) / 2, wave: 'triangle', vol: 0.2, a: 0.03, s: 0.8, r: 0.15 });
  }
  return trimTail(normalize(m.out()));
}

export const MUSIC_DEPORTE = { marcha_nekketsu: marchaBanda, saigon_chay: temaDanTranh, azotea_final: temaPelea, victoria_banda: fanfarria, derrota: derrota };

// ---------- efectos ----------
function one(seconds: number, seed: number, notes: Omit<Note, 'vol'>[] & { vol: number }[]): Float32Array {
  const m = new Mixer(seconds, false, seed);
  for (const n of notes) m.add(n as Note);
  return trimTail(normalize(m.out(), 0.85));
}
const golpe = (k: number) => () => one(0.25, 10 + k, [
  { t: 0, dur: 0.01, f: 3000 + k * 600, wave: 'noise', vol: 0.6, s: 1, r: 0.07, lp: 0.45 },
  { t: 0, dur: 0.02, f: 150 - k * 15, wave: 'sine', vol: 0.8, s: 1, r: 0.12, bend: { semis: -10, len: 0.1 } },
  { t: 0.005, dur: 0.01, f: 900 + k * 120, wave: 'square', duty: 0.3, vol: 0.18, s: 1, r: 0.04, lp: 0.3 },
]);

/** Muchas voces desafinadas: el público. */
function crowd(seconds: number, seed: number, vowel: 'grito' | 'ooh'): Float32Array {
  const m = new Mixer(seconds, false, seed), R = rng(seed);
  for (let i = 0; i < 28; i++) {
    const base = vowel === 'grito' ? 260 + R() * 340 : 190 + R() * 140;
    const start = R() * (vowel === 'grito' ? 0.25 : 0.12);
    m.add({ t: start, dur: seconds * (0.55 + R() * 0.25), f: base, wave: R() < 0.5 ? 'saw' : 'square', duty: 0.3, vol: 0.05, a: vowel === 'grito' ? 0.15 : 0.25, d: 0.3, s: 0.7, r: 0.5, lp: vowel === 'grito' ? 0.18 : 0.08,
      vib: [4 + R() * 3, 0.4 + R() * 0.4, 0], bend: vowel === 'ooh' ? { semis: -3 - R() * 2, at: 0.25, len: seconds * 0.6 } : { semis: 1 + R() * 2, at: 0, len: 0.3 } });
  }
  m.add({ t: 0, dur: seconds * 0.7, f: 2500, wave: 'noise', vol: vowel === 'grito' ? 0.25 : 0.1, a: 0.2, s: 0.7, r: 0.5, lp: 0.25 });
  if (vowel === 'grito') for (let k = 0; k < 10; k++) m.drum('palmas', 0.3 + R() * (seconds - 0.8), 0.3 + R() * 0.3);
  return trimTail(normalize(m.out(), 0.85));
}

export const SFX_DEPORTE = {
  pistola: () => one(0.9, 1, [
    { t: 0, dur: 0.01, f: 9000, wave: 'noise', vol: 1, s: 1, r: 0.05, hp: 0.5 },
    { t: 0, dur: 0.02, f: 95, wave: 'sine', vol: 0.9, s: 1, r: 0.25, bend: { semis: -8, len: 0.2 } },
    { t: 0.02, dur: 0.02, f: 1800, wave: 'noise', vol: 0.35, s: 1, r: 0.6, lp: 0.15 },
  ]),
  silbato: () => one(0.9, 2, [
    { t: 0, dur: 0.14, f: 2900, wave: 'sine', vol: 0.5, a: 0.01, s: 1, r: 0.03, vib: [32, 0.45, 0] },
    { t: 0.24, dur: 0.48, f: 2900, wave: 'sine', vol: 0.55, a: 0.01, s: 1, r: 0.05, vib: [32, 0.45, 0] },
    { t: 0, dur: 0.14, f: 6000, wave: 'noise', vol: 0.06, s: 1, r: 0.03, hp: 0.6 },
    { t: 0.24, dur: 0.48, f: 6000, wave: 'noise', vol: 0.06, s: 1, r: 0.05, hp: 0.6 },
  ]),
  golpe_1: golpe(0), golpe_2: golpe(1), golpe_3: golpe(2),
  golpe_pesado: () => one(0.55, 20, [
    { t: 0, dur: 0.02, f: 90, wave: 'sine', vol: 1, s: 1, r: 0.32, bend: { semis: -12, len: 0.25 } },
    { t: 0, dur: 0.02, f: 2500, wave: 'noise', vol: 0.7, s: 1, r: 0.15, lp: 0.35 },
    { t: 0.03, dur: 0.02, f: 600, wave: 'noise', vol: 0.4, s: 1, r: 0.2, lp: 0.12 },
    { t: 0, dur: 0.01, f: 220, wave: 'square', vol: 0.3, s: 1, r: 0.08, lp: 0.3 },
  ]),
  chancleta: () => one(0.25, 21, [
    { t: 0, dur: 0.005, f: 7000, wave: 'noise', vol: 0.9, s: 1, r: 0.05, hp: 0.4 },
    { t: 0, dur: 0.01, f: 1200, wave: 'noise', vol: 0.5, s: 1, r: 0.07, lp: 0.5 },
    { t: 0.002, dur: 0.01, f: 320, wave: 'triangle', vol: 0.3, s: 1, r: 0.04 },
  ]),
  silla: () => one(0.6, 22, [
    { t: 0, dur: 0.01, f: 420, wave: 'triangle', vol: 0.6, s: 1, r: 0.09 },
    { t: 0, dur: 0.01, f: 690, wave: 'triangle', vol: 0.35, s: 1, r: 0.07 },
    { t: 0, dur: 0.01, f: 3000, wave: 'noise', vol: 0.4, s: 1, r: 0.05, lp: 0.4 },
    { t: 0.12, dur: 0.01, f: 470, wave: 'triangle', vol: 0.35, s: 1, r: 0.07 },
    { t: 0.21, dur: 0.01, f: 440, wave: 'triangle', vol: 0.2, s: 1, r: 0.06 },
  ]),
  pote: () => one(1.2, 23, [
    ...[540, 1213, 1880, 2650].map((f, i) => ({ t: 0, dur: 0.01, f, wave: 'sine' as const, vol: 0.4 / (i + 1), s: 1, r: 0.9 - i * 0.15, vib: [9, 0.08, 0] as [number, number, number] })),
    { t: 0, dur: 0.01, f: 5000, wave: 'noise', vol: 0.5, s: 1, r: 0.08, hp: 0.4 },
  ]),
  levantar: () => one(0.55, 24, [
    { t: 0, dur: 0.3, f: 600, wave: 'noise', vol: 0.25, a: 0.15, s: 0.8, r: 0.1, lp: 0.08, bend: { semis: 14, len: 0.35 } },
    { t: 0.05, dur: 0.2, f: 140, wave: 'saw', vol: 0.25, a: 0.03, s: 0.8, r: 0.08, lp: 0.12, bend: { semis: 4, len: 0.2 } },
  ]),
  lanzar: () => one(0.5, 25, [
    { t: 0, dur: 0.2, f: 900, wave: 'noise', vol: 0.4, a: 0.1, s: 0.8, r: 0.15, lp: 0.15, bend: { semis: 18, len: 0.18 } },
    { t: 0.18, dur: 0.05, f: 2500, wave: 'noise', vol: 0.3, s: 0.8, r: 0.12, lp: 0.2, bend: { semis: -12, len: 0.15 } },
  ]),
  caer_plano: () => one(0.65, 26, [
    { t: 0, dur: 0.02, f: 80, wave: 'sine', vol: 1, s: 1, r: 0.25, bend: { semis: -8, len: 0.2 } },
    { t: 0, dur: 0.01, f: 4000, wave: 'noise', vol: 0.6, s: 1, r: 0.08, hp: 0.3 },
    { t: 0.22, dur: 0.01, f: 95, wave: 'sine', vol: 0.4, s: 1, r: 0.15, bend: { semis: -6, len: 0.1 } },
    { t: 0.22, dur: 0.01, f: 1500, wave: 'noise', vol: 0.2, s: 1, r: 0.05, lp: 0.3 },
  ]),
  mareo: () => one(1.2, 27, [
    { t: 0, dur: 1.0, f: 900, wave: 'sine', vol: 0.35, a: 0.05, s: 1, r: 0.15, vib: [7, 4, 0] },
    { t: 0.08, dur: 0.92, f: 1350, wave: 'triangle', vol: 0.15, a: 0.05, s: 1, r: 0.15, vib: [7, 4, 0] },
  ]),
  ko: () => one(1.6, 28, [
    { t: 0, dur: 0.02, f: 70, wave: 'sine', vol: 1, s: 1, r: 0.4, bend: { semis: -10, len: 0.3 } },
    { t: 0, dur: 0.02, f: 3000, wave: 'noise', vol: 0.6, s: 1, r: 0.2, lp: 0.3 },
    { t: 0.12, dur: 0.02, f: 1320, wave: 'sine', vol: 0.45, s: 1, r: 1.2 },
    { t: 0.12, dur: 0.02, f: 2640, wave: 'sine', vol: 0.18, s: 1, r: 0.9 },
    { t: 0.12, dur: 0.02, f: 3960, wave: 'sine', vol: 0.08, s: 1, r: 0.6 },
  ]),
  publico_grito: () => crowd(2.2, 31, 'grito'),
  publico_ooh: () => crowd(1.6, 32, 'ooh'),
};

// ---------- voces en blips ----------
export type Timbre = 'cuadrada' | 'aguda' | 'triangulo' | 'sierra';
export const TIMBRES: Timbre[] = ['cuadrada', 'aguda', 'triangulo', 'sierra'];
export interface Voz { tono: number; timbre: Timbre }
/** Cuántos blips trae cada voz: el juego elige uno al azar por letra. */
export const BLIPS = 4;

/** Un blip de diálogo (60 ms): el tono 1 es 220 Hz; cada variante sube o baja un poco. */
export function blip(v: Voz, k = 0): Float32Array {
  const f = 220 * v.tono * [1, 1.12, 0.94, 1.06][k % 4];
  const wave = v.timbre === 'triangulo' ? 'triangle' : v.timbre === 'sierra' ? 'saw' : 'square';
  const m = new Mixer(0.075, false, 5 + k);
  m.add({ t: 0, dur: 0.05, f, wave, duty: v.timbre === 'aguda' ? 0.2 : 0.5, vol: 0.5, a: 0.004, d: 0.02, s: 0.7, r: 0.02, bend: { semis: -0.6, len: 0.05 }, lp: v.timbre === 'sierra' ? 0.35 : undefined });
  const out = normalize(m.out(), 0.7);
  return out.slice(0, Math.round(0.075 * RATE));
}

/**
 * La voz de un personaje: chicos más agudos, adultos según el cuerpo, gigantes más graves. El timbre sale del id
 * (estable). El juego puede pisarla con la suya en la configuración.
 */
export function vozDe(id: string, o: { edad?: string; cuerpo?: string; celda?: number; femenina?: boolean } = {}): Voz {
  let h = 0;
  for (const c of id) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0;
  const kid = o.edad === 'child' || o.edad === 'kid' || o.edad === 'nino';
  let tono = kid ? 1.55 : o.femenina ? 1.25 : 0.9;
  if (o.celda && o.celda >= 64) tono *= 0.75;
  tono *= 0.95 + ((h % 11) / 10) * 0.1;
  return { tono: Math.round(tono * 100) / 100, timbre: TIMBRES[h % TIMBRES.length] };
}
