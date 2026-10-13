import { Mixer, seq, hz, rng, normalize, trimTail, type Note } from './synth';
import { RATE } from './sfx';

/**
 * Audio de los mundos (lote H2): un tema por mundo y los efectos de las aves y de los deportes tradicionales.
 * Rock japonés de los 80 para el Instituto, tambores de festival y sáo para Hội An, rock bogotano de los 90, cumbia
 * para la Comuna 13, joropo para Caracas y gaita zuliana para Maracaibo. Todo sintetizado con código, cada pieza con
 * su semilla: sale igual siempre. Los temas van en bucle sin corte (el mezclador da la vuelta) y en mono.
 */

// ---------- armonía ----------
const midiOf = (f: number) => Math.round(69 + 12 * Math.log2(f / 440));
const fOf = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const pc = (n: string) => (PC[n[0]] + (n[1] === '#' ? 1 : n[1] === 'b' ? -1 : 0) + 12) % 12;
/** Escala por sus notas, en clases de altura. */
const escala = (...ns: string[]) => ns.map(pc);
/** La tercera diatónica de abajo en la escala. Si la nota no está (una sensible), una tercera mayor abajo. */
export function terceraAbajo(f: number, sc: number[]): number {
  const m = midiOf(f), i = sc.indexOf(((m % 12) + 12) % 12);
  if (i < 0) return fOf(m - 4);
  const t = sc[(i - 2 + sc.length) % sc.length];
  return fOf(m - (((m - t) % 12) + 12) % 12);
}
const ACORDES: Record<string, string[]> = {
  Am: ['A', 'C', 'E'], Dm: ['D', 'F', 'A'], Em: ['E', 'G', 'B'], Bm: ['B', 'D', 'F#'],
  C: ['C', 'E', 'G'], D: ['D', 'F#', 'A'], E: ['E', 'G#', 'B'], F: ['F', 'A', 'C'], G: ['G', 'B', 'D'], A: ['A', 'C#', 'E'],
  A7: ['A', 'C#', 'E', 'G'], E7: ['E', 'G#', 'B', 'D'], G7: ['G', 'B', 'D', 'F'],
};
/** Las notas del acorde hacia arriba, desde la raíz en la octava dada. */
function acorde(name: string, oct: number): number[] {
  const ns = ACORDES[name], root = midiOf(hz(`${ns[0]}${oct}`));
  return ns.map((n) => { let m = root + ((pc(n) - (root % 12) + 12) % 12); if (m < root) m += 12; return fOf(m); });
}
const raiz = (name: string, oct: number) => acorde(name, oct)[0];
const quinta = (name: string, oct: number) => raiz(name, oct) * Math.pow(2, 7 / 12);

/**
 * Quita la componente continua (pasa altos de 20 Hz). Las cuadradas con ancho de pulso distinto de la mitad la traen,
 * y sin esto se come margen de volumen. En bucle da la vuelta dos veces para que el final empalme con el principio.
 */
export function sinDC(b: Float32Array, loop: boolean): Float32Array {
  const R = 1 - (2 * Math.PI * 20) / RATE, src = Float32Array.from(b);
  let x1 = loop ? src[src.length - 1] : 0, y = 0;
  for (let pass = loop ? 0 : 1; pass < 2; pass++) {
    for (let i = 0; i < src.length; i++) { y = src[i] - x1 + R * y; x1 = src[i]; if (pass === 1) b[i] = y; }
  }
  return b;
}

// ---------- instrumentos y percusión ----------
/** Raspado (guacharaca, charrasca): ruido filtrado en peines rápidos, como la vara que pasa por las ranuras. */
function raspa(m: Mixer, t: number, dur: number, vol: number, o: { paso?: number; hp?: number; lp?: number } = {}) {
  const paso = o.paso ?? 0.011, n = Math.max(1, Math.round(dur / paso));
  for (let k = 0; k < n; k++) {
    const u = k / n;
    m.add({ t: t + k * paso, dur: 0.003, f: 14000, wave: 'noise', vol: vol * (0.45 + 0.55 * u), s: 1, r: 0.01, hp: o.hp ?? 0.6, lp: o.lp ?? 0.7 });
  }
  m.add({ t, dur, f: 9000, wave: 'noise', vol: vol * 0.3, a: dur * 0.7, s: 1, r: 0.015, hp: o.hp ?? 0.6, lp: o.lp ?? 0.7 });
}
const maraca = (m: Mixer, t: number, vol: number) => m.add({ t, dur: 0.012, f: 16000, wave: 'noise', vol, a: 0.006, s: 1, r: 0.045, hp: 0.5 });
/** Tambora: el parche (grave) o el aro (los palitos contra la madera). */
function tambora(m: Mixer, t: number, vol: number, golpe: 'parche' | 'aro') {
  if (golpe === 'parche') {
    m.add({ t, dur: 0.02, f: 98, wave: 'sine', vol: vol * 0.9, s: 1, r: 0.24, bend: { semis: -5, len: 0.15 } });
    m.add({ t, dur: 0.01, f: 900, wave: 'noise', vol: vol * 0.3, s: 1, r: 0.05, lp: 0.15 });
  } else {
    m.add({ t, dur: 0.004, f: 1250, wave: 'sine', vol: vol * 0.45, s: 1, r: 0.035 });
    m.add({ t, dur: 0.004, f: 6000, wave: 'noise', vol: vol * 0.25, s: 1, r: 0.02, hp: 0.5 });
  }
}
/** Furro: el tambor de fricción de la gaita, un "rum" grave y áspero. */
function furro(m: Mixer, t: number, dur: number, vol: number, f = 62) {
  m.add({ t, dur, f, wave: 'saw', vol, a: 0.03, d: 0.08, s: 0.65, r: 0.07, lp: 0.07, vib: [23, 0.5, 0], bend: { semis: 2, len: 0.07 } });
  m.add({ t, dur, f: f * 2, wave: 'triangle', vol: vol * 0.35, a: 0.03, s: 0.6, r: 0.06, lp: 0.3, bend: { semis: 2, len: 0.07 } });
}
/** Rasgueo de cuatro: las cuerdas una tras otra en milisegundos. Apagado: corto y con el chasquido de la mano. */
function rasgueo(m: Mixer, t: number, notas: number[], vol: number, apagado = false) {
  notas.forEach((f, i) => m.add({ t: t + i * 0.007, dur: apagado ? 0.025 : 0.11, f, wave: 'pluck', vol: vol * (apagado ? 0.6 : 1), r: apagado ? 0.03 : 0.1 }));
  if (apagado) m.add({ t, dur: 0.006, f: 5000, wave: 'noise', vol: vol * 0.9, s: 1, r: 0.03, hp: 0.6, lp: 0.6 });
}
/** Acorde de guitarra eléctrica (raíz, quinta y octava): sierra y cuadrada filtradas, con el palm mute si es corto. */
function powerChord(m: Mixer, t: number, root: number, dur: number, vol: number, abierto = false) {
  for (const k of [1, 1.4983, 2]) {
    m.add({ t, dur, f: root * k, wave: 'saw', vol, a: 0.003, d: 0.06, s: abierto ? 0.75 : 0.45, r: 0.04, lp: abierto ? 0.32 : 0.2 });
    m.add({ t, dur, f: root * k * 1.004, wave: 'square', duty: 0.3, vol: vol * 0.45, a: 0.003, d: 0.06, s: abierto ? 0.7 : 0.4, r: 0.04, lp: 0.18 });
  }
}
/** Rasgueo de guitarra distorsionada con el acorde completo. */
function strum(m: Mixer, t: number, notas: number[], dur: number, vol: number) {
  notas.forEach((f, i) => {
    m.add({ t: t + i * 0.006, dur, f, wave: 'saw', vol, a: 0.004, d: 0.08, s: 0.55, r: 0.05, lp: 0.3 });
    m.add({ t: t + i * 0.006, dur, f: f * 1.005, wave: 'square', duty: 0.35, vol: vol * 0.4, a: 0.004, d: 0.08, s: 0.5, r: 0.05, lp: 0.22 });
  });
}
/** Sáo o flauta: seno con soplo al empezar y vibrato en las notas largas; algunas suben desde abajo (luyến). */
function flauta(m: Mixer, n: { t: number; dur: number; f: number; units: number }, vol: number, desdeAbajo = false) {
  m.add({ t: n.t, dur: n.dur * 0.94, f: desdeAbajo ? n.f / Math.pow(2, 2 / 12) : n.f, wave: 'sine', vol, a: 0.035, d: 0.1, s: 0.85, r: 0.09, vib: n.units >= 3 ? [5.2, 0.18, 0.18] : undefined, bend: desdeAbajo ? { semis: 2, len: 0.06 } : undefined });
  m.add({ t: n.t, dur: n.dur * 0.94, f: n.f * 2, wave: 'triangle', vol: vol * 0.08, a: 0.04, s: 0.8, r: 0.08 });
  m.add({ t: n.t, dur: 0.05, f: 6000, wave: 'noise', vol: vol * 0.22, a: 0.01, s: 1, r: 0.05, lp: 0.35 });
}
/** Acordeón: dos cuadradas un poco desafinadas que "baten", con el fuelle que entra suave. */
function acordeon(m: Mixer, t: number, dur: number, f: number, vol: number) {
  m.add({ t, dur, f, wave: 'square', duty: 0.5, vol, a: 0.015, d: 0.05, s: 0.85, r: 0.04, lp: 0.45, vib: [5.5, 0.06, 0.12] });
  m.add({ t, dur, f: f * 1.0045, wave: 'square', duty: 0.35, vol: vol * 0.7, a: 0.015, d: 0.05, s: 0.85, r: 0.04, lp: 0.4 });
}

/** Cuántos segundos dura cada compás y cada unidad (corchea) de un tema. */
const tiempo = (bpm: number, unidadesPorCompas: number, porNegra = 2) => { const e = 60 / bpm / porNegra; return { e, bar: e * unidadesPorCompas }; };

// ---------- Instituto: rock japonés de los 80 en menor ----------
/**
 * `tema_instituto`: rock japonés de los 80 en La menor, 152 bpm, 24 compases (37.9 s). Riff de guitarra, verso y un
 * coro con el "royal road" (Fa, Sol, Mi menor, La menor) que sube. Lead en cuadrada con la segunda voz en terceras,
 * guitarra rítmica con palm mute, bajo en corcheas, sintetizador de colchón en el coro y batería de rock con redobles.
 */
export function temaInstituto(): Float32Array {
  const { e, bar } = tiempo(152, 8);
  const m = new Mixer(24 * bar, true, 201);
  const sc = escala('A', 'B', 'C', 'D', 'E', 'F', 'G');
  const riff = ['A4 A4 C5 A4 D5 A4 E5 D5', 'C5 A4 G4 A4/2 r A4 G4', 'A4 A4 C5 A4 D5 A4 E5 G5', 'F5/2 E5/2 D5/2 E5/2'];
  const verso = ['E5/3 D5 C5/2 D5/2', 'E5/2 A4/2 r/2 A4 C5', 'D5/3 C5 B4/2 C5/2', 'B4/4 G4/2 r/2', 'E5/3 D5 C5/2 E5/2', 'A5/2 G5 F5 E5/2 D5/2', 'F5/2 E5 D5 C5/2 D5/2', 'E5/4 G#4/2 B4/2'];
  const coro = ['A5/2 A5 G5 A5/2 C6/2', 'B5/3 A5 G5/2 D5/2', 'G5/2 B5/2 A5/2 G5/2', 'E5/6 r/2', 'A5/2 A5 G5 A5/2 C6/2', 'D6/3 C6 B5/2 G5/2', 'G#5/2 B5/2 D6/2 B5/2', 'A5/6 r/2'];
  const riff2 = [...riff.slice(0, 3), 'E5/2 G#5/2 B5/2 E5/2'];
  const melody = [...riff, ...verso, ...coro, ...riff2];
  const chords = ['Am', 'Am', 'Am', 'F', 'Am', 'F', 'G', 'Em', 'Am', 'F', 'Dm', 'E', 'F', 'G', 'Em', 'Am', 'F', 'G', 'E', 'Am', 'Am', 'Am', 'Am', 'E'];
  melody.forEach((txt, b) => {
    const t0 = b * bar, isRiff = b < 4 || b >= 20, isCoro = b >= 12 && b < 20, ch = chords[b];
    for (const n of seq(txt, t0, e)) {
      const sus = n.units >= 3;
      if (isRiff) m.add({ t: n.t, dur: n.dur * 0.8, f: n.f / 2, wave: 'saw', vol: 0.12, a: 0.003, s: 0.7, r: 0.04, lp: 0.35, vib: sus ? [6, 0.25, 0.1] : undefined });
      m.add({ t: n.t, dur: n.dur * 0.88, f: n.f, wave: 'square', duty: 0.25, vol: isRiff ? 0.1 : 0.17, a: 0.006, d: 0.05, s: 0.8, r: 0.05, vib: sus ? [6, 0.22, 0.14] : undefined, lp: 0.6 });
      if (isCoro) m.add({ t: n.t, dur: n.dur * 0.86, f: terceraAbajo(n.f, sc), wave: 'square', duty: 0.5, vol: 0.07, a: 0.006, s: 0.75, r: 0.05, lp: 0.45 });
    }
    // guitarra rítmica: corcheas con palm mute; en el coro, acordes abiertos en 1 y 3
    const r3 = raiz(ch, 3);
    if (isCoro) { powerChord(m, t0, r3, e * 3.6, 0.045, true); powerChord(m, t0 + 4 * e, r3, e * 3.6, 0.045, true); }
    else for (let k = 0; k < 8; k++) powerChord(m, t0 + k * e, r3, e * 0.55, k % 4 === 0 ? 0.05 : 0.035);
    // colchón de sintetizador en el coro
    if (isCoro) for (const f of acorde(ch, 4)) m.add({ t: t0, dur: bar * 0.95, f, wave: 'square', duty: 0.5, vol: 0.025, a: 0.08, s: 0.8, r: 0.1, lp: 0.12 });
    // bajo en corcheas, con la octava al final del compás
    const r2 = raiz(ch, 2);
    for (let k = 0; k < 8; k++) m.add({ t: t0 + k * e, dur: e * 0.8, f: k === 7 ? r2 * 2 : k === 6 && !isRiff ? quinta(ch, 2) : r2, wave: 'saw', vol: 0.2, a: 0.004, s: 0.8, r: 0.03, lp: 0.2 });
    // batería
    for (let k = 0; k < 8; k++) m.drum('charles', t0 + k * e, k % 2 ? 0.45 : 0.8);
    m.drum('bombo', t0, 1); m.drum('bombo', t0 + 3 * e, 0.7); m.drum('bombo', t0 + 4 * e, 0.9);
    if (isCoro) m.drum('bombo', t0 + 7 * e, 0.6);
    m.drum('caja', t0 + 2 * e, 0.9); m.drum('caja', t0 + 6 * e, 0.9);
    if (b % 4 === 0) m.drum('platillo', t0, isCoro || b === 0 ? 0.7 : 0.4);
    if (b % 4 === 3) for (const [k, d] of [[6, 'caja'], [6.5, 'caja'], [7, 'tom'], [7.5, 'tom']] as const) m.drum(d, t0 + k * e, 0.6);
  });
  m.echo(0.13, 0.2, 0.3);
  return normalize(sinDC(m.out(), true));
}

// ---------- Hội An: tambores de festival y sáo ----------
/**
 * `hoian_noche`: la noche de los faroles en Hội An. Mi menor pentatónico, 92 bpm, 16 compases (41.7 s). La sáo
 * (flauta de bambú) lleva el tema, algunas notas suben desde abajo. Tambores de festival como los de la danza del
 * león: el trống grande, el golpe de madera en el aro, címbalos chicos y un gong cada 4 compases. En la segunda
 * vuelta entran el đàn nguyệt y los redobles.
 */
export function temaHoiAn(): Float32Array {
  const { e, bar } = tiempo(92, 8);
  const m = new Mixer(16 * bar, true, 202);
  const melody = [
    'B4/2 E5/2 G5/3 E5', 'D5/2 E5 D5 B4/4', 'A4/2 B4/2 D5/2 E5 G5', 'E5/8',
    'G5/2 A5/2 B5/3 A5', 'G5/2 E5 D5 E5/4', 'D5/2 B4 A4 B4/2 D5/2', 'E5/6 r/2',
    'E5/2 G5/2 B5/3 D6', 'B5/2 A5 G5 E5/4', 'D5/2 E5/2 G5/2 A5 B5', 'A5/8',
    'B5/2 D6/2 E6/3 D6', 'B5/2 A5 G5 A5/4', 'G5/2 E5 D5 B4/2 D5/2', 'E5/6 r/2',
  ];
  const roots = ['E2', 'E2', 'A2', 'E2', 'G2', 'D2', 'A2', 'E2', 'E2', 'E2', 'A2', 'A2', 'G2', 'D2', 'A2', 'E2'];
  const R = rng(22);
  melody.forEach((txt, b) => {
    const t0 = b * bar, fuerte = b >= 8;
    for (const n of seq(txt, t0, e)) flauta(m, n, 0.2, n.units >= 2 && R() < 0.45);
    // colchón grave: la raíz y la quinta, muy suave, para que la noche no quede hueca
    const r = hz(roots[b]);
    m.add({ t: t0, dur: bar * 0.96, f: r, wave: 'triangle', vol: 0.16, a: 0.2, s: 0.8, r: 0.15 });
    m.add({ t: t0, dur: bar * 0.96, f: r * 1.5, wave: 'triangle', vol: 0.06, a: 0.3, s: 0.8, r: 0.15 });
    // đàn nguyệt en la segunda vuelta: raíz, quinta y octava punteadas
    if (fuerte) [1, 1.5, 2, 1.5, 2, 3, 2, 1.5].forEach((k, j) => m.add({ t: t0 + j * e, dur: e * 0.9, f: r * 2 * k, wave: 'pluck', vol: j % 2 ? 0.06 : 0.09, r: 0.12 }));
    // tambores de festival
    for (const [k, v] of (fuerte ? [[0, 1], [3, 0.7], [4, 0.9], [6, 0.8]] : [[0, 0.9], [3, 0.5], [4, 0.75]]) as [number, number][]) {
      m.add({ t: t0 + k * e, dur: 0.03, f: 68, wave: 'sine', vol: 0.75 * v, s: 1, r: 0.42, bend: { semis: -4, len: 0.3 } });
      m.add({ t: t0 + k * e, dur: 0.01, f: 600, wave: 'noise', vol: 0.25 * v, s: 1, r: 0.07, lp: 0.12 });
    }
    // el "cắc": la baqueta en el aro de madera
    for (const k of [2, 5, 7]) m.drum('madera', t0 + k * e, fuerte ? 0.75 : 0.55);
    // címbalos chicos (chũm chọe) en 2 y 4
    for (const k of [2, 6]) {
      m.add({ t: t0 + k * e, dur: 0.01, f: 13000, wave: 'noise', vol: fuerte ? 0.16 : 0.1, s: 1, r: 0.22, hp: 0.55 });
      m.add({ t: t0 + k * e, dur: 0.01, f: 3270, wave: 'sine', vol: 0.03, s: 1, r: 0.25 });
    }
    // gong cada 4 compases
    if (b % 4 === 0) for (const [f, v] of [[262, 0.2], [611, 0.08], [873, 0.05]]) m.add({ t: t0, dur: 0.02, f, wave: 'sine', vol: v, s: 1, r: 1.8, vib: [3.5, 0.06, 0] });
    // redoble de tambor chico al cierre de cada 2 compases en la segunda vuelta
    if (fuerte && b % 2 === 1) for (let k = 0; k < 6; k++) m.drum('tom', t0 + (5 + k * 0.5) * e, 0.3 + k * 0.08);
  });
  m.echo(0.24, 0.3, 0.45);
  return normalize(sinDC(m.out(), true));
}

// ---------- Bogotá: rock en español de los 90 ----------
/**
 * `ajiaco_rock`: rock en español bogotano de los 90 en chiptune. Re mayor con el Do mixolidio (Re, Do, Sol, Re),
 * 132 bpm, 16 compases (29.1 s). Guitarras distorsionadas en rasgueo sincopado, un coro de estadio en cuadrada
 * doblado una octava abajo, bajo en corcheas y batería con el charles abierto en el coro.
 */
export function temaAjiaco(): Float32Array {
  const { e, bar } = tiempo(132, 8);
  const m = new Mixer(16 * bar, true, 203);
  const melody = [
    'F#5/2 F#5 E5 D5/2 A4/2', 'G5/2 E5 C5 E5/4', 'D5/2 D5 B4 D5/2 G5/2', 'F#5/6 r/2',
    'A5/2 A5 F#5 D5/2 F#5/2', 'G5/2 E5 G5 C6/2 B5/2', 'B5/2 A5 G5 D5/2 B4/2', 'A4/2 C#5/2 E5/2 A5/2',
    'B5/3 A5 B5/2 D6/2', 'C#6/3 B5 A5/4', 'F#5/2 A5/2 D6/2 A5/2', 'B5/6 r/2',
    'B5/3 A5 B5/2 D6/2', 'E6/3 D6 C#6/2 A5/2', 'D6/2 A5 F#5 A5/2 F#5/2', 'D5/4 r/2 A4 C#5',
  ];
  const chords = ['D', 'C', 'G', 'D', 'D', 'C', 'G', 'A', 'G', 'A', 'D', 'Bm', 'G', 'A', 'D', 'D'];
  melody.forEach((txt, b) => {
    const t0 = b * bar, coro = b >= 8, ch = chords[b];
    for (const n of seq(txt, t0, e)) {
      m.add({ t: n.t, dur: n.dur * 0.86, f: n.f, wave: 'square', duty: 0.5, vol: 0.15, a: 0.008, d: 0.06, s: 0.75, r: 0.05, lp: 0.5, vib: n.units >= 3 ? [5.5, 0.2, 0.15] : undefined });
      if (coro) m.add({ t: n.t, dur: n.dur * 0.86, f: n.f / 2, wave: 'triangle', vol: 0.14, a: 0.008, s: 0.8, r: 0.05 });
    }
    // rasgueo sincopado: 1, 2 y, 3 y, 4 (el "y" de 4 se calla)
    const notas = acorde(ch, 3).concat(acorde(ch, 3)[0] * 2);
    for (const [k, d, v] of [[0, 1.5, 1], [3, 1, 0.8], [5, 1, 0.8], [6, 1, 0.7]] as const) strum(m, t0 + k * e, notas, e * d * 0.9, 0.04 * v);
    // bajo: corcheas con la quinta y un paso para llegar al siguiente acorde
    const r2 = raiz(ch, 2), next = raiz(chords[(b + 1) % 16], 2);
    for (let k = 0; k < 8; k++) m.add({ t: t0 + k * e, dur: e * 0.8, f: k === 7 ? (next > r2 ? next / Math.pow(2, 2 / 12) : next * Math.pow(2, 2 / 12)) : k === 4 || k === 5 ? quinta(ch, 2) : r2, wave: 'saw', vol: 0.2, a: 0.004, s: 0.8, r: 0.03, lp: 0.22 });
    // batería: rock con el charles abierto en el coro
    for (let k = 0; k < 8; k++) {
      if (coro && k % 2 === 1) m.add({ t: t0 + k * e, dur: 0.02, f: 11000, wave: 'noise', vol: 0.12, s: 1, r: 0.14, hp: 0.6 });
      else m.drum('charles', t0 + k * e, k % 2 ? 0.45 : 0.75);
    }
    m.drum('bombo', t0, 1); m.drum('bombo', t0 + 2.5 * e, 0.6); m.drum('bombo', t0 + 4 * e, 0.9); m.drum('bombo', t0 + 5 * e, 0.6);
    m.drum('caja', t0 + 2 * e, 0.9); m.drum('caja', t0 + 6 * e, 0.95);
    if (b % 4 === 0) m.drum('platillo', t0, coro ? 0.75 : 0.45);
    if (b % 8 === 7) for (const k of [4, 5, 6, 6.5, 7, 7.5]) m.drum(k < 6 ? 'tom' : 'caja', t0 + k * e, 0.6);
  });
  m.echo(0.11, 0.18, 0.3);
  return normalize(sinDC(m.out(), true));
}

// ---------- Medellín: cumbia ----------
/**
 * `parce_corra`: cumbia chiptune para la Comuna 13. La menor, 100 bpm, 16 compases (38.4 s). Acordeón en dos
 * cuadradas que baten, con terceras. Guacharaca con ruido filtrado ("chaaa-ki-chi" en cada tiempo), llamador en los
 * contratiempos, tambora en el uno, bajo de cumbia (raíz y quinta) y el "chucu" del teclado en los contratiempos.
 */
export function temaCumbia(): Float32Array {
  const { e, bar } = tiempo(100, 8);
  const m = new Mixer(16 * bar, true, 204);
  const sc = escala('A', 'B', 'C', 'D', 'E', 'F', 'G#');
  const melody = [
    'A4 C5 E5 C5 A5/2 E5/2', 'G5 F5 E5 D5 C5/2 B4/2', 'B4 G#4 B4 D5 E5/2 D5/2', 'C5 B4 A4 G#4 B4/4',
    'B4 D5 G#5 D5 B5/2 G#5/2', 'A5 G#5 F5 E5 D5/2 B4/2', 'C5 E5 A5 E5 C6/2 B5/2', 'A5/4 E5 C5 A4/2',
    'D5 F5 A5 F5 D6/2 A5/2', 'C6 A5 F5 D5 F5/4', 'E5 A5 C6 A5 E5/2 C5/2', 'A4 C5 E5 G#5 A5/4',
    'G#5 B5 G#5 E5 D5/2 B4/2', 'D5 E5 F5 E5 D5/2 B4/2', 'C5 B4 A4 C5 E5/2 G#5/2', 'A5/4 r/4',
  ];
  const chords = ['Am', 'Am', 'E', 'E', 'E', 'E', 'Am', 'Am', 'Dm', 'Dm', 'Am', 'Am', 'E', 'E', 'Am', 'Am'];
  melody.forEach((txt, b) => {
    const t0 = b * bar, ch = chords[b];
    for (const n of seq(txt, t0, e)) {
      acordeon(m, n.t, n.dur * 0.85, n.f, 0.1);
      acordeon(m, n.t, n.dur * 0.85, terceraAbajo(n.f, sc), 0.045);
    }
    // bajo de cumbia: raíz en 1 y 3, quinta abajo en 2 y 4
    const r2 = raiz(ch, 2), q = quinta(ch, 1);
    for (const [k, f] of [[0, r2], [2, q], [4, r2], [6, q]] as const) m.add({ t: t0 + k * e, dur: e * 1.4, f, wave: 'triangle', vol: 0.42, a: 0.005, s: 0.75, r: 0.05 });
    // el "chucu" del teclado en los contratiempos
    for (const k of [1, 3, 5, 7]) for (const f of acorde(ch, 4)) m.add({ t: t0 + k * e, dur: e * 0.35, f, wave: 'square', duty: 0.25, vol: 0.03, s: 0.6, r: 0.03, lp: 0.3 });
    // guacharaca: largo en el tiempo, dos cortos después
    for (let beat = 0; beat < 4; beat++) {
      const tb = t0 + beat * 2 * e;
      raspa(m, tb, e * 0.9, 0.12);
      raspa(m, tb + e, e * 0.4, 0.08);
      raspa(m, tb + e * 1.5, e * 0.4, 0.09);
    }
    // llamador en los contratiempos y tambora en el uno de cada medio compás
    for (const k of [1, 3, 5, 7]) m.add({ t: t0 + k * e, dur: 0.01, f: 210, wave: 'sine', vol: 0.32, s: 1, r: 0.09, bend: { semis: -3, len: 0.06 } });
    tambora(m, t0, 0.8, 'parche'); tambora(m, t0 + 4 * e, 0.7, 'parche');
    tambora(m, t0 + 3 * e, 0.5, 'aro'); tambora(m, t0 + 7 * e, 0.5, 'aro');
    if (b % 4 === 3) for (const k of [6, 6.5, 7, 7.5]) tambora(m, t0 + k * e, 0.45, 'parche');
  });
  m.echo(0.15, 0.2, 0.3);
  return normalize(sinDC(m.out(), true));
}

// ---------- Caracas: joropo ----------
/**
 * `pana_dale`: joropo chiptune. Re mayor en 3/4 a 180 negras por minuto, 32 compases (32 s). El arpa llanera lleva
 * la melodía con su bordón en el bajo (en el 2 y el 3, como el joropo). El cuatro rasguea y arpegia con apagados,
 * y las maracas no paran, con el acento que cambia entre 3/4 y 6/8.
 */
export function temaJoropo(): Float32Array {
  const { e, bar } = tiempo(180, 6);
  const m = new Mixer(32 * bar, true, 205);
  const sc = escala('D', 'E', 'F#', 'G', 'A', 'B', 'C#');
  const p1 = ['A5 F#5 D5 F#5 A5 D6', 'C#6 B5 A5/2 F#5/2', 'G5 E5 C#5 E5 G5 A5', 'B5 A5 G5/2 E5/2', 'C#5 E5 G5 B5 A5 G5', 'F#5 E5 D5/2 C#5/2', 'D5 F#5 A5 F#5 D6 A5', 'F#5/2 D5/2 r/2'];
  const p2 = ['F#5 A5 D6 A5 F#5 A5', 'E5 F#5 G5/2 A5/2', 'E5 G5 C#6 G5 E5 G5', 'A5 G5 F#5/2 E5/2', 'C#6 B5 A5 G5 F#5 E5', 'G5 F#5 E5/2 C#5/2', 'D5 A5 F#5 A5 D6 C#6', 'D6/4 C#6 B5'];
  const p3 = ['B5 D6 B5 G5 B5 D6', 'B5 A5 G5/2 D5/2', 'F#5 A5 D6 A5 F#5 D5', 'A5/2 F#5/2 D5/2', 'C#5 E5 A5 E5 G5 B5', 'A5 G5 E5/2 C#5/2', 'D5 F#5 A5 D6 A5 F#5', 'D5/4 r/2'];
  const p4 = [...p3.slice(0, 4), 'E5 G5 C#6 E6 C#6 A5', 'G5 E5 C#5/2 E5/2', 'F#5 A5 D6 F#6 E6 C#6', 'D6/4 A5 F#5'];
  const melody = [...p1, ...p2, ...p3, ...p4];
  const cA = ['D', 'D', 'A7', 'A7', 'A7', 'A7', 'D', 'D'], cB = ['G', 'G', 'D', 'D', 'A7', 'A7', 'D', 'D'];
  const chords = [...cA, ...cA, ...cB, ...cB];
  melody.forEach((txt, b) => {
    const t0 = b * bar, ch = chords[b], segunda = (b >= 8 && b < 16) || b >= 24;
    // arpa: la melodía punteada y, en la segunda de cada par de frases, con terceras
    for (const n of seq(txt, t0, e)) {
      m.add({ t: n.t, dur: n.dur, f: n.f, wave: 'pluck', vol: 0.3, r: 0.22 });
      if (segunda) m.add({ t: n.t, dur: n.dur, f: terceraAbajo(n.f, sc), wave: 'pluck', vol: 0.14, r: 0.2 });
    }
    // bordón del arpa: raíz en el 2 y quinta en el 3, y la raíz en el 1 muy suave
    const r2 = raiz(ch, 2);
    m.add({ t: t0, dur: e * 1.5, f: r2, wave: 'pluck', vol: 0.18, r: 0.2 });
    m.add({ t: t0 + 2 * e, dur: e * 1.8, f: r2, wave: 'pluck', vol: 0.36, r: 0.2 });
    m.add({ t: t0 + 2 * e, dur: e * 1.6, f: r2, wave: 'triangle', vol: 0.22, a: 0.004, s: 0.6, r: 0.08 });
    m.add({ t: t0 + 4 * e, dur: e * 1.8, f: quinta(ch, 1) * 2, wave: 'pluck', vol: 0.32, r: 0.2 });
    m.add({ t: t0 + 4 * e, dur: e * 1.6, f: quinta(ch, 1) * 2, wave: 'triangle', vol: 0.2, a: 0.004, s: 0.6, r: 0.08 });
    // cuatro: rasgueo en 1 y en el 4 de las corcheas (6/8), arpegio en las otras y apagado en la última
    const cuatro = acorde(ch, 4).slice(0, 3).concat(acorde(ch, 3)[1] ?? acorde(ch, 3)[0]).sort((a, c) => a - c);
    for (let k = 0; k < 6; k++) {
      if (k === 0 || k === 3) rasgueo(m, t0 + k * e, cuatro, 0.11);
      else if (k === 5 || (k === 2 && b % 2 === 1)) rasgueo(m, t0 + k * e, cuatro, 0.1, true);
      else m.add({ t: t0 + k * e, dur: e * 0.8, f: cuatro[(k + b) % cuatro.length], wave: 'pluck', vol: 0.07, r: 0.08 });
    }
    // maracas: todas las corcheas con el acento que alterna 3/4 y 6/8, y repique de semicorcheas cada 4 compases
    const acentos = b % 2 ? [1, 0.4, 0.7, 1, 0.4, 0.7] : [1, 0.4, 1, 0.4, 1, 0.5];
    acentos.forEach((v, k) => maraca(m, t0 + k * e, 0.18 * v));
    for (let k = 0; k < 6; k++) maraca(m, t0 + (k + 0.5) * e, b % 4 === 3 ? 0.1 : 0.05);
  });
  m.echo(0.12, 0.2, 0.3);
  return normalize(sinDC(m.out(), true));
}

// ---------- Maracaibo: gaita zuliana ----------
/**
 * `gaita_lago`: gaita zuliana en La menor, 6/8 a 112 negras con puntillo, 32 compases (34.3 s). El furro hace el
 * "rum, rum-rum", la tambora alterna parche y palitos en el aro, la charrasca raspa y las maracas no paran. El coro
 * canta en dos voces (cuadradas en terceras), y en la segunda vuelta se dobla a la octava. El cuatro rasguea con el
 * "frenado" de la gaita.
 */
export function temaGaita(): Float32Array {
  const { e, bar } = tiempo(112, 6, 3);
  const m = new Mixer(32 * bar, true, 206);
  const sc = escala('A', 'B', 'C', 'D', 'E', 'F', 'G#');
  const A = ['E5/3 C5 D5 E5', 'A5/3 G5/2 E5', 'F5/3 E5 D5 C5', 'D5/3 A4/3', 'B4/3 D5 E5 F5', 'G5/3 F5/2 D5', 'E5/3 D5 C5 B4', 'C5/3 r/3'];
  const B = ['A5/3 G5 F5 E5', 'F5/3 A5/3', 'D6/3 C6 A5 F5', 'A5/3 F5/3', 'G#5/3 B5 A5 G#5', 'E5/3 D5/2 B4', 'C5/3 E5 A5 G#5', 'A5/3 r/3'];
  const melody = [...A, ...B, ...A, ...B];
  const cA = ['Am', 'Am', 'Dm', 'Dm', 'G7', 'G7', 'C', 'C'], cB = ['F', 'F', 'Dm', 'Dm', 'E7', 'E7', 'Am', 'Am'];
  const chords = [...cA, ...cB, ...cA, ...cB];
  melody.forEach((txt, b) => {
    const t0 = b * bar, ch = chords[b], vuelta2 = b >= 16;
    // el coro en dos voces; en la segunda vuelta, doblado a la octava de abajo
    for (const n of seq(txt, t0, e)) {
      const sus = n.units >= 3;
      m.add({ t: n.t, dur: n.dur * 0.9, f: n.f, wave: 'square', duty: 0.5, vol: 0.13, a: 0.02, d: 0.06, s: 0.8, r: 0.06, lp: 0.4, vib: sus ? [5.5, 0.2, 0.12] : undefined });
      m.add({ t: n.t, dur: n.dur * 0.9, f: terceraAbajo(n.f, sc), wave: 'square', duty: 0.35, vol: 0.07, a: 0.02, s: 0.75, r: 0.06, lp: 0.35 });
      if (vuelta2) m.add({ t: n.t, dur: n.dur * 0.9, f: n.f / 2, wave: 'triangle', vol: 0.12, a: 0.02, s: 0.8, r: 0.06 });
    }
    // bajo: raíz en el 1 y quinta en el 4
    m.add({ t: t0, dur: e * 2.6, f: raiz(ch, 2), wave: 'triangle', vol: 0.3, a: 0.005, s: 0.7, r: 0.06 });
    m.add({ t: t0 + 3 * e, dur: e * 2.6, f: quinta(ch, 1), wave: 'triangle', vol: 0.26, a: 0.005, s: 0.7, r: 0.06 });
    // furro: rum (largo) en el 1, rum-rum en el 4 y el 5
    furro(m, t0, e * 1.8, 0.55); furro(m, t0 + 3 * e, e * 0.8, 0.45); furro(m, t0 + 4 * e, e * 1.6, 0.5);
    // tambora: parche en 1 y 4, palitos en el aro en el resto
    tambora(m, t0, 0.8, 'parche'); tambora(m, t0 + 3 * e, 0.65, 'parche');
    for (const [k, v] of [[1, 0.55], [2, 0.8], [4, 0.55], [5, 0.8]] as const) tambora(m, t0 + k * e, v, 'aro');
    // charrasca: largo en 1 y 4, corto en 3 y 6
    for (const [k, d, v] of [[0, 1.4, 0.09], [2, 0.5, 0.07], [3, 1.4, 0.09], [5, 0.5, 0.07]] as const) raspa(m, t0 + k * e, e * d, v, { paso: 0.009, hp: 0.4, lp: 0.85 });
    for (let k = 0; k < 6; k++) maraca(m, t0 + k * e, k % 3 === 0 ? 0.14 : 0.08);
    // cuatro: rasgueo en 1, 3 y 4, con el frenado (apagado) en el 2 y el 5
    const cuatro = acorde(ch, 4).slice(0, 3);
    for (const [k, ap] of [[0, false], [1, true], [2, false], [3, false], [4, true]] as const) rasgueo(m, t0 + k * e, cuatro, 0.08, ap);
  });
  m.echo(0.14, 0.2, 0.3);
  return normalize(sinDC(m.out(), true));
}

export const MUSIC_MUNDOS = {
  tema_instituto: temaInstituto,
  hoian_noche: temaHoiAn,
  ajiaco_rock: temaAjiaco,
  parce_corra: temaCumbia,
  pana_dale: temaJoropo,
  gaita_lago: temaGaita,
};

// ---------- efectos ----------
function efecto(seconds: number, seed: number, build: (m: Mixer, R: () => number) => void): Float32Array {
  const m = new Mixer(seconds, false, seed);
  build(m, rng(seed));
  return trimTail(normalize(sinDC(m.out(), false), 0.85));
}
const N = (m: Mixer, n: Note) => m.add(n);

/**
 * El kikirikí: "ki-ki-ri-kiiii". Tres sílabas que suben y la última larga que sube, se sostiene y cae, con la
 * aspereza de la garganta (vibrato rápido) y el golpe de la "k" en cada sílaba. Arranca en la muestra 0, para que
 * suene justo en el evento `canto` (cuadro 3 de `cantar`, a 8 fps).
 */
function kikiriki(): Float32Array {
  return efecto(1.4, 41, (m) => {
    const voz = (t: number, dur: number, f: number, bend: Note['bend'], vol: number, a = 0.008, r = 0.03) => {
      N(m, { t, dur, f, wave: 'saw', vol, a, d: 0.04, s: 0.85, r, lp: 0.42, vib: [29, 0.3, 0], bend });
      N(m, { t, dur, f: f * 1.003, wave: 'square', duty: 0.18, vol: vol * 0.35, a, d: 0.04, s: 0.8, r, lp: 0.3, vib: [29, 0.3, 0], bend });
      N(m, { t, dur, f, wave: 'triangle', vol: vol * 0.3, a, s: 0.8, r, bend });
    };
    const k = (t: number, v: number) => N(m, { t, dur: 0.004, f: 12000, wave: 'noise', vol: v, s: 1, r: 0.012, hp: 0.5 });
    k(0, 0.35); voz(0, 0.075, 640, { semis: 4, len: 0.06 }, 0.45, 0.004);
    k(0.11, 0.35); voz(0.11, 0.075, 700, { semis: 4, len: 0.06 }, 0.5);
    k(0.22, 0.3); voz(0.22, 0.11, 760, { semis: 5, len: 0.09 }, 0.6);
    k(0.37, 0.4);
    // la "i" larga: sube y se sostiene arriba
    voz(0.37, 0.36, 860, { semis: 4, len: 0.14 }, 0.8, 0.012, 0.04);
    // y cae al final, con la voz que se quiebra
    voz(0.75, 0.42, 860 * Math.pow(2, 4 / 12), { semis: -9, at: 0.08, len: 0.38 }, 0.75, 0.03, 0.12);
    N(m, { t: 0.37, dur: 0.8, f: 4000, wave: 'noise', vol: 0.05, a: 0.05, s: 0.8, r: 0.1, lp: 0.4 });
  });
}

export const SFX_MUNDOS = {
  /** El canto del gallo (1.3 s). */
  gallo: kikiriki,
  /** Aleteo de un ave (0.35 s): cuatro golpes de ala, cada uno más suave, con el roce de las plumas. */
  aleteo: () => efecto(0.5, 42, (m) => {
    [1, 0.85, 0.7, 0.55].forEach((v, k) => {
      const t = k * 0.068;
      N(m, { t, dur: 0.018, f: 2600, wave: 'noise', vol: 0.7 * v, a: 0.01, s: 1, r: 0.05, lp: 0.22 });
      N(m, { t, dur: 0.01, f: 150, wave: 'sine', vol: 0.35 * v, a: 0.006, s: 1, r: 0.04, bend: { semis: -5, len: 0.04 } });
      N(m, { t: t + 0.01, dur: 0.02, f: 12000, wave: 'noise', vol: 0.18 * v, a: 0.01, s: 1, r: 0.04, hp: 0.55 });
    });
  }),
  /** El tejo revienta la mecha (1.2 s): el golpe del disco en la greda, el estallido de la pólvora y su chisporroteo. */
  mecha_tejo: () => efecto(1.6, 43, (m, R) => {
    // el disco de metal contra la greda
    N(m, { t: 0, dur: 0.01, f: 125, wave: 'sine', vol: 0.5, s: 1, r: 0.09, bend: { semis: -5, len: 0.06 } });
    N(m, { t: 0, dur: 0.005, f: 2500, wave: 'noise', vol: 0.35, s: 1, r: 0.04, lp: 0.15 });
    // el estallido: chasquido brillante y el cuerpo grave
    N(m, { t: 0.018, dur: 0.008, f: 22050, wave: 'noise', vol: 1, s: 1, r: 0.07, hp: 0.35 });
    N(m, { t: 0.018, dur: 0.03, f: 72, wave: 'sine', vol: 1, s: 1, r: 0.5, bend: { semis: -6, len: 0.35 } });
    N(m, { t: 0.018, dur: 0.02, f: 170, wave: 'sine', vol: 0.55, s: 1, r: 0.22, bend: { semis: -8, len: 0.2 } });
    N(m, { t: 0.018, dur: 0.02, f: 1600, wave: 'noise', vol: 0.75, s: 1, r: 0.6, lp: 0.07 });
    // chisporroteo de la pólvora
    for (let k = 0; k < 9; k++) {
      const t = 0.08 + R() * 0.5, v = 0.35 * (1 - (t - 0.08) / 0.6);
      N(m, { t, dur: 0.003, f: 18000, wave: 'noise', vol: v, s: 1, r: 0.015, hp: 0.4 });
    }
    // el humo que silba
    N(m, { t: 0.05, dur: 0.3, f: 9000, wave: 'noise', vol: 0.08, a: 0.04, s: 0.8, r: 0.4, hp: 0.6 });
  }),
  /** Toque de đá cầu (0.25 s): el pie contra la base del volante, seco y medio agudo, y el silbido de las plumas. */
  toque_cau: () => efecto(0.4, 44, (m) => {
    N(m, { t: 0, dur: 0.008, f: 430, wave: 'sine', vol: 0.75, s: 1, r: 0.06, bend: { semis: -5, len: 0.04 } });
    N(m, { t: 0, dur: 0.004, f: 980, wave: 'triangle', vol: 0.28, s: 1, r: 0.025 });
    N(m, { t: 0, dur: 0.004, f: 5000, wave: 'noise', vol: 0.4, s: 1, r: 0.03, lp: 0.35 });
    N(m, { t: 0.012, dur: 0.05, f: 7000, wave: 'noise', vol: 0.16, a: 0.02, s: 1, r: 0.11, hp: 0.6, bend: { semis: 7, len: 0.12 } });
  }),
  /** La caída en el tatami (0.35 s): la palmada del brazo, seca y sorda, y el cuerpo que cae junto, sin rebote. */
  caida_tatami: () => efecto(0.5, 45, (m) => {
    N(m, { t: 0, dur: 0.006, f: 9000, wave: 'noise', vol: 1, s: 1, r: 0.05, lp: 0.3 });
    N(m, { t: 0, dur: 0.004, f: 260, wave: 'triangle', vol: 0.3, s: 1, r: 0.03 });
    N(m, { t: 0.014, dur: 0.02, f: 78, wave: 'sine', vol: 1, s: 1, r: 0.17, bend: { semis: -6, len: 0.12 } });
    N(m, { t: 0.014, dur: 0.01, f: 155, wave: 'sine', vol: 0.5, s: 1, r: 0.08, bend: { semis: -4, len: 0.06 } });
    N(m, { t: 0.014, dur: 0.01, f: 1200, wave: 'noise', vol: 0.5, s: 1, r: 0.1, lp: 0.12 });
  }),
  /** El pitazo largo del árbitro (1.3 s): un solo pitazo con trino, que sube un poco al soplar. */
  pitazo_largo: () => efecto(1.6, 46, (m) => {
    N(m, { t: 0, dur: 1.15, f: 2820, wave: 'sine', vol: 0.55, a: 0.015, d: 0.1, s: 0.9, r: 0.08, vib: [31, 0.45, 0], bend: { semis: 0.6, len: 0.12 } });
    N(m, { t: 0, dur: 1.15, f: 5640, wave: 'sine', vol: 0.05, a: 0.015, s: 0.9, r: 0.08, vib: [31, 0.45, 0], bend: { semis: 0.6, len: 0.12 } });
    N(m, { t: 0, dur: 1.15, f: 6000, wave: 'noise', vol: 0.06, a: 0.015, s: 1, r: 0.08, hp: 0.6 });
  }),
};
