import { Mixer, seq, hz, rng, normalize, trimTail, type Note } from './synth';
import { raspa, maraca } from './mundos';

/**
 * La música y los efectos de Street Family Fighter 2, sintetizados con código como un cartucho de 16 bits:
 * - **Un tema por ciudad**: Caracas con arpa llanera sobre rock, Ho Chi Minh con đàn tranh que dobla la cuerda,
 *   Bogotá con cumbia y acordeón, Japón con koto en escala miyako-bushi, y el Reino Celestial con campanitas mágicas.
 *   Todos en bucle sin corte de 16 compases.
 * - **Título, selector, VS y victoria** para las pantallas.
 * - **Golpes por fuerza** (débil, fuerte, súper), bloqueo, silbidos de aire, barrida, saltos, caídas y los poderes de
 *   cada uno: onda, hojas, estrella, pelota, ladrido y trueno.
 */

interface Tema {
  bpm: number;
  seed: number;
  /** la melodía, un compás de 8 corcheas por texto */
  melodia: string[];
  /** la raíz del bajo por compás */
  bajos: string[];
  /** acorde por compás para los arpegios (notas separadas por espacio) */
  acordes?: string[];
  lider: Partial<Note> & { wave: Note['wave'] };
  /** el instrumento de los arpegios */
  arpegio?: Partial<Note> & { wave: Note['wave']; cada?: number };
  bateria: 'rock' | 'cumbia' | 'taiko' | 'magia' | 'marcha';
  /** doblar la melodía una octava abajo con otro timbre */
  doble?: Partial<Note> & { wave: Note['wave'] };
  eco?: [number, number, number];
}

function tema(t: Tema, compases = t.melodia.length): Float32Array {
  const e = 60 / t.bpm / 2, bar = e * 8;
  const m = new Mixer(compases * bar, true, t.seed);
  const R = rng(t.seed);
  for (let b = 0; b < compases; b++) {
    const t0 = b * bar;
    for (const n of seq(t.melodia[b % t.melodia.length], t0, e)) {
      const largo = n.units >= 4;
      m.add({ s: 0.8, r: 0.05, a: 0.005, vol: 0.17, ...t.lider, t: n.t, dur: n.dur * 0.88, f: n.f, vib: largo ? [5.5, 0.25, 0.18] : t.lider.vib } as Note);
      if (t.doble) m.add({ s: 0.8, r: 0.05, vol: 0.08, ...t.doble, t: n.t, dur: n.dur * 0.85, f: n.f / 2 } as Note);
    }
    const raiz = hz(t.bajos[b % t.bajos.length]);
    // bajo
    if (t.bateria === 'cumbia') {
      for (const [k, f] of [[0, raiz], [3, raiz * 1.5], [4, raiz], [7, raiz * 1.5]] as const) m.add({ t: t0 + k * e, dur: e * 0.9, f, wave: 'triangle', vol: 0.32, s: 0.8, r: 0.04 });
    } else if (t.bateria === 'magia') {
      m.add({ t: t0, dur: bar * 0.95, f: raiz, wave: 'triangle', vol: 0.28, a: 0.05, s: 0.8, r: 0.2 });
    } else {
      for (let k = 0; k < 8; k++) m.add({ t: t0 + k * e, dur: e * 0.8, f: k % 4 === 3 ? raiz * 2 : raiz, wave: 'saw', vol: 0.18, s: 0.8, r: 0.03, lp: 0.22 });
    }
    // arpegios
    if (t.arpegio && t.acordes) {
      const notas = t.acordes[b % t.acordes.length].split(' ').map(hz);
      const paso = t.arpegio.cada ?? 1;
      for (let k = 0; k < 8; k += paso) {
        const f = notas[(k / paso) % notas.length] * (k >= 4 && notas.length < 4 ? 2 : 1);
        m.add({ s: 0.5, r: 0.12, vol: 0.07, ...t.arpegio, t: t0 + k * e, dur: e * paso * 0.7, f } as Note);
      }
    }
    // batería
    switch (t.bateria) {
      case 'rock':
        for (let k = 0; k < 8; k++) m.drum('charles', t0 + k * e, k % 2 ? 0.45 : 0.75);
        m.drum('bombo', t0, 1); m.drum('bombo', t0 + 3 * e, 0.7); m.drum('bombo', t0 + 4 * e, 0.9);
        m.drum('caja', t0 + 2 * e, 0.9); m.drum('caja', t0 + 6 * e, 0.9);
        if (b % 4 === 0) m.drum('platillo', t0, 0.6);
        if (b % 4 === 3) { m.drum('tom', t0 + 6 * e, 0.7); m.drum('tom', t0 + 6.5 * e, 0.6); m.drum('caja', t0 + 7 * e, 0.7); m.drum('caja', t0 + 7.5 * e, 0.8); }
        break;
      case 'cumbia':
        for (let k = 0; k < 8; k++) raspa(m, t0 + k * e, e * 0.6, k % 2 ? 0.25 : 0.12);
        for (let k = 0; k < 8; k++) if (k % 2) maraca(m, t0 + k * e, 0.3);
        m.drum('bombo', t0, 0.9); m.drum('bombo', t0 + 4 * e, 0.9);
        m.drum('tom', t0 + 3 * e, 0.5); m.drum('tom', t0 + 7 * e, 0.6);
        m.drum('caja', t0 + 2 * e, 0.6); m.drum('caja', t0 + 6 * e, 0.6);
        if (b % 8 === 0) m.drum('platillo', t0, 0.5);
        break;
      case 'taiko':
        m.drum('bombo', t0, 1); m.drum('tom', t0 + 2 * e, 0.8); m.drum('bombo', t0 + 4 * e, 0.9); m.drum('tom', t0 + 5 * e, 0.6); m.drum('tom', t0 + 6 * e, 0.8);
        for (let k = 0; k < 8; k++) m.drum('charles', t0 + k * e, k % 2 ? 0.35 : 0.6);
        m.drum('caja', t0 + 2 * e, 0.7); m.drum('caja', t0 + 6 * e, 0.8);
        if (b % 2 === 1) m.drum('madera', t0 + 7 * e, 0.7);
        if (b % 4 === 0) m.drum('platillo', t0, 0.55);
        break;
      case 'magia':
        for (let k = 0; k < 8; k += 2) m.drum('charles', t0 + k * e, 0.35);
        m.drum('bombo', t0, 0.7); m.drum('caja', t0 + 4 * e, 0.45);
        if (R() < 0.6) m.add({ t: t0 + 7 * e, dur: 0.02, f: hz('C7') * (1 + Math.floor(R() * 3) * 0.25), wave: 'sine', vol: 0.12, s: 1, r: 0.5 });
        break;
      case 'marcha':
        m.drum('bombo_banda', t0, 1); m.drum('bombo_banda', t0 + 4 * e, 0.8);
        for (let k = 0; k < 8; k++) m.drum('caja_banda', t0 + k * e, k % 4 === 2 ? 0.9 : 0.35);
        if (b % 4 === 0) m.drum('platillo', t0, 0.7);
        break;
    }
  }
  const [d, fb, mix] = t.eco ?? [0.12, 0.2, 0.3];
  m.echo(d, fb, mix);
  return normalize(m.out());
}

// la segunda mitad repite la primera con un final distinto
const dos = (a: string[], fin: string[]) => [...a, ...a.slice(0, a.length - fin.length), ...fin];

/** Caracas, Rick: rock en Re menor con arpa llanera en arpegios, 168 bpm. */
export function temaCaracas(): Float32Array {
  const a = ['D5 F5 A5 D6/2 C6 A5 F5', 'G5/2 A5 F5/2 E5 D5/2', 'D5 F5 Bb5 D6/2 C6 Bb5 A5', 'G5/4 F5/2 G5/2', 'C5 E5 G5 C6/2 Bb5 A5 G5', 'A5/2 G5 F5/2 E5 C5/2', 'A4 C#5 E5 A5/2 G5 F5 E5', 'C#5/4 E5/2 A4/2'];
  return tema({
    bpm: 168, seed: 58, melodia: dos(a, ['Bb5 A5 G5 F5 E5 F5 G5 A5', 'D5/4 A4/2 D5/2']),
    bajos: ['D2', 'D2', 'Bb1', 'Bb1', 'C2', 'C2', 'A1', 'A1'],
    acordes: ['D4 F4 A4 D5', 'D4 F4 A4 D5', 'Bb3 D4 F4 Bb4', 'Bb3 D4 F4 Bb4', 'C4 E4 G4 C5', 'C4 E4 G4 C5', 'A3 C#4 E4 A4', 'A3 C#4 E4 A4'],
    lider: { wave: 'square', duty: 0.25, vol: 0.16 }, arpegio: { wave: 'pluck', vol: 0.1, r: 0.25 },
    doble: { wave: 'saw', vol: 0.05, lp: 0.2 }, bateria: 'rock',
  });
}

/** Ho Chi Minh, Sophie: pentatónica vietnamita con đàn tranh que dobla la cuerda, 150 bpm. */
export function temaHoChiMinh(): Float32Array {
  const a = ['A5/2 C6 A5 G5 E5 G5/2', 'A5/4 r C6 D6 E6', 'D6/2 C6 A5 C6/2 A5 G5', 'E5/4 G5/2 A5/2', 'E6/2 D6 C6 D6/2 C6 A5', 'G5/2 A5 G5 E5/4', 'D5 E5 G5 A5 C6/2 D6/2', 'A5/8'];
  const e = 60 / 150 / 2;
  const base = tema({
    bpm: 150, seed: 84, melodia: dos(a, ['G5 A5 C6 D6 E6/2 G6/2', 'A6/4 A5/4']),
    bajos: ['A1', 'A1', 'F1', 'G1', 'A1', 'A1', 'E1', 'E1'],
    acordes: ['A3 E4 A4 C5', 'A3 E4 A4 C5', 'F3 C4 F4 A4', 'G3 D4 G4 B4', 'A3 E4 A4 C5', 'A3 E4 A4 C5', 'E3 B3 E4 G4', 'E3 B3 E4 G4'],
    lider: { wave: 'pluck', vol: 0.3, r: 0.3 }, arpegio: { wave: 'triangle', vol: 0.06, cada: 2 },
    doble: { wave: 'square', duty: 0.125, vol: 0.05 }, bateria: 'rock', eco: [0.16, 0.25, 0.35],
  });
  // los adornos de đàn tranh: notas que suben un tono al final de cada compás par
  const m = new Mixer(base.length / 22050, true, 85);
  for (let b = 1; b < 16; b += 2) m.add({ t: b * 8 * e + 6 * e, dur: e * 1.6, f: hz('E5'), wave: 'pluck', vol: 0.2, r: 0.3, bend: { semis: 2, at: 0.05, len: 0.12 } });
  const ad = normalize(m.out(), 0.25);
  for (let i = 0; i < base.length; i++) base[i] += ad[i % ad.length] * 0.6;
  return normalize(base);
}

/** Bogotá, Steph: cumbia rockera en Sol menor con acordeón, guacharaca y maracas, 140 bpm. */
export function temaBogota(): Float32Array {
  const a = ['G5 Bb5 D6 Bb5 G5/2 F5 G5', 'A5/2 Bb5 A5 G5/2 D5/2', 'C6 Bb5 A5 G5 A5/2 Bb5 C6', 'D6/4 D5/4', 'Eb6/2 D6 C6 Bb5/2 A5 G5', 'F5/2 G5 A5 Bb5/4', 'A5 G5 F#5 G5 A5/2 C6/2', 'G5/8'];
  return tema({
    bpm: 140, seed: 57, melodia: dos(a, ['Bb5 A5 G5 F#5 G5 A5 Bb5 C6', 'D6/4 G5/4']),
    bajos: ['G1', 'G1', 'C2', 'D2', 'Eb2', 'F2', 'D2', 'G1'],
    acordes: ['G4 Bb4 D5', 'G4 Bb4 D5', 'C4 Eb4 G4', 'D4 F#4 A4', 'Eb4 G4 Bb4', 'F4 A4 C5', 'D4 F#4 A4', 'G4 Bb4 D5'],
    lider: { wave: 'saw', vol: 0.15, lp: 0.35, vib: [6, 0.12, 0] }, arpegio: { wave: 'square', duty: 0.5, vol: 0.05, cada: 2, r: 0.05 },
    doble: { wave: 'saw', vol: 0.07, lp: 0.25 }, bateria: 'cumbia',
  });
}

/** Japón, Thor: koto en escala miyako-bushi sobre rock con taikos, 156 bpm. */
export function temaJapon(): Float32Array {
  const a = ['E5/2 F5 A5 B5/2 C6 B5', 'A5/2 F5/2 E5/4', 'B5/2 C6 E6 F6/2 E6 C6', 'B5/4 A5/4', 'E6/2 C6 B5 A5/2 B5 C6', 'B5/2 A5 F5 E5/4', 'F5 A5 B5 C6 B5 A5 F5 A5', 'E5/8'];
  return tema({
    bpm: 156, seed: 35, melodia: dos(a, ['F6 E6 C6 B5 A5 B5 C6 F6', 'E6/4 E5/4']),
    bajos: ['E2', 'E2', 'F2', 'F2', 'A1', 'A1', 'B1', 'B1'],
    acordes: ['E4 B4 E5', 'E4 B4 E5', 'F4 C5 F5', 'F4 C5 F5', 'A3 E4 A4', 'A3 E4 A4', 'B3 F4 B4', 'B3 F4 B4'],
    lider: { wave: 'pluck', vol: 0.32, r: 0.35 }, arpegio: { wave: 'pluck', vol: 0.09, r: 0.2 },
    doble: { wave: 'square', duty: 0.25, vol: 0.07 }, bateria: 'taiko', eco: [0.14, 0.22, 0.3],
  });
}

/** El Reino Celestial, Alana: vals mágico de campanitas y triángulo en Fa lidio, 132 bpm. */
export function temaCelestial(): Float32Array {
  const a = ['C6 F6 A6 G6 F6/2 C6/2', 'D6/2 E6 F6 G6/4', 'A6 G6 F6 E6 D6/2 F6/2', 'C6/8', 'Bb5 D6 F6 A6 G6/2 F6/2', 'E6/2 G6/2 C6/4', 'D6 E6 F6 G6 A6/2 B6/2', 'C7/8'];
  return tema({
    bpm: 132, seed: 21, melodia: dos(a, ['B6 A6 G6 F6 E6 F6 G6 A6', 'F6/8']),
    bajos: ['F2', 'F2', 'D2', 'D2', 'Bb1', 'C2', 'Bb1', 'C2'],
    acordes: ['F4 A4 C5 E5', 'F4 A4 C5 E5', 'D4 F4 A4 C5', 'D4 F4 A4 C5', 'Bb3 D4 F4 A4', 'C4 E4 G4 B4', 'Bb3 D4 F4 B4', 'C4 E4 G4 C5'],
    lider: { wave: 'triangle', vol: 0.28, r: 0.25, vib: [5, 0.15, 0.1] }, arpegio: { wave: 'sine', vol: 0.09, r: 0.4 },
    doble: { wave: 'sine', vol: 0.08, r: 0.3 }, bateria: 'magia', eco: [0.23, 0.35, 0.45],
  });
}

/** Título: fanfarria épica en Do menor, 120 bpm, 8 compases en bucle. */
export function temaTitulo(): Float32Array {
  return tema({
    bpm: 120, seed: 1,
    melodia: ['C5/2 Eb5 G5 C6/4', 'Bb5/2 Ab5 G5 F5/2 Eb5/2', 'D5/2 F5 Ab5 C6/2 Bb5/2', 'G5/8', 'C6/2 Eb6 G6 F6/2 Eb6/2', 'D6/2 C6 Bb5 Ab5/4', 'G5 Ab5 Bb5 C6 D6/2 B5/2', 'C6/8'],
    bajos: ['C2', 'C2', 'Ab1', 'Ab1', 'Bb1', 'Bb1', 'G1', 'G1'],
    acordes: ['C4 Eb4 G4', 'C4 Eb4 G4', 'Ab3 C4 Eb4', 'Ab3 C4 Eb4', 'Bb3 D4 F4', 'Bb3 D4 F4', 'G3 B3 D4', 'G3 B3 D4'],
    lider: { wave: 'square', duty: 0.5, vol: 0.18, lp: 0.6 }, arpegio: { wave: 'saw', vol: 0.05, lp: 0.3, cada: 1 },
    doble: { wave: 'square', duty: 0.25, vol: 0.08 }, bateria: 'marcha', eco: [0.15, 0.25, 0.35],
  });
}

/** Selector: tema juguetón en Do mayor, 128 bpm, 8 compases en bucle. */
export function temaSelector(): Float32Array {
  return tema({
    bpm: 128, seed: 2,
    melodia: ['G5 E5 C5 E5 G5/2 C6/2', 'B5/2 A5 G5 A5/4', 'F5 A5 C6 A5 F5/2 A5/2', 'G5/8', 'E5 G5 C6 G5 E6/2 D6/2', 'C6/2 B5 A5 B5/4', 'A5 B5 C6 D6 E6/2 D6/2', 'C6/8'],
    bajos: ['C2', 'C2', 'F1', 'F1', 'C2', 'A1', 'F1', 'G1'],
    acordes: ['C4 E4 G4', 'C4 E4 G4', 'F4 A4 C5', 'G4 B4 D5', 'C4 E4 G4', 'A3 C4 E4', 'F4 A4 C5', 'G4 B4 D5'],
    lider: { wave: 'square', duty: 0.25, vol: 0.16 }, arpegio: { wave: 'triangle', vol: 0.08 },
    bateria: 'rock',
  });
}

/** VS: golpe de acorde con platillo y redoble, 2.4 s. */
export function temaVS(): Float32Array {
  const m = new Mixer(2.4, false, 3);
  for (let k = 0; k < 8; k++) m.drum('caja', k * 0.05, 0.3 + k * 0.08);
  for (const n of ['C3', 'G3', 'C4', 'Eb4', 'G4']) {
    m.add({ t: 0.42, dur: 1.4, f: hz(n), wave: 'saw', vol: 0.12, a: 0.005, s: 0.8, r: 0.5, lp: 0.35 });
    m.add({ t: 0.42, dur: 1.4, f: hz(n) * 1.005, wave: 'square', duty: 0.3, vol: 0.06, a: 0.005, s: 0.8, r: 0.5 });
  }
  m.add({ t: 0.42, dur: 1.5, f: hz('C1'), wave: 'triangle', vol: 0.5, s: 0.8, r: 0.5 });
  m.drum('bombo', 0.42, 1); m.drum('platillo', 0.42, 1);
  m.echo(0.12, 0.2, 0.3);
  return trimTail(normalize(m.out()));
}

/** Victoria: fanfarria corta en Do mayor, 4 s. */
export function temaVictoria(): Float32Array {
  const e = 60 / 150 / 2, m = new Mixer(4.4, false, 4);
  for (const n of seq('G4 C5 E5 G5/3 E5 G5 C6/8', 0, e)) {
    m.add({ t: n.t, dur: n.dur * 0.9, f: n.f, wave: 'square', duty: 0.5, vol: 0.2, s: 0.8, r: 0.12, lp: 0.6, vib: n.units > 3 ? [5.5, 0.2, 0.2] : undefined });
    m.add({ t: n.t, dur: n.dur * 0.9, f: n.f * 0.75, wave: 'square', duty: 0.25, vol: 0.09, s: 0.8, r: 0.12 });
  }
  const tc = e * 8;
  for (const n of ['C2', 'G2', 'C3']) m.add({ t: tc, dur: e * 8, f: hz(n), wave: 'triangle', vol: 0.3, s: 0.8, r: 0.4 });
  for (let k = 0; k < 8; k++) m.drum('caja', k * e, k === 7 ? 0.9 : 0.4);
  m.drum('bombo', tc, 1); m.drum('platillo', tc, 0.9);
  m.echo(0.14, 0.25, 0.35);
  return trimTail(normalize(m.out()));
}

export const MUSIC_PELEA = {
  titulo: temaTitulo, selector: temaSelector, vs: temaVS, victoria: temaVictoria,
  caracas: temaCaracas, hochiminh: temaHoChiMinh, bogota: temaBogota, japon: temaJapon, celestial: temaCelestial,
};
/** las piezas que suenan en bucle */
export const BUCLE_PELEA = new Set(['titulo', 'selector', 'caracas', 'hochiminh', 'bogota', 'japon', 'celestial']);

// ---------------------------------------------------------------- efectos

function uno(seconds: number, seed: number, notes: Note[], pico = 0.85): Float32Array {
  const m = new Mixer(seconds, false, seed);
  for (const n of notes) m.add(n);
  return trimTail(normalize(m.out(), pico));
}

/** golpe débil: chasquido corto y seco */
const debil = (k: number) => () => uno(0.22, 40 + k, [
  { t: 0, dur: 0.008, f: 3500 + k * 500, wave: 'noise', vol: 0.7, s: 1, r: 0.05, lp: 0.5 },
  { t: 0, dur: 0.015, f: 220 - k * 20, wave: 'sine', vol: 0.6, s: 1, r: 0.07, bend: { semis: -9, len: 0.07 } },
  { t: 0.003, dur: 0.008, f: 1200 + k * 150, wave: 'square', duty: 0.3, vol: 0.15, s: 1, r: 0.03, lp: 0.35 },
], 0.7);

/** golpe fuerte: trancazo grave con crujido */
const fuerte = (k: number) => () => uno(0.6, 50 + k, [
  { t: 0, dur: 0.02, f: 95 - k * 8, wave: 'sine', vol: 1, s: 1, r: 0.3, bend: { semis: -12, len: 0.22 } },
  { t: 0, dur: 0.02, f: 2600 + k * 300, wave: 'noise', vol: 0.8, s: 1, r: 0.14, lp: 0.4 },
  { t: 0.02, dur: 0.03, f: 700, wave: 'noise', vol: 0.45, s: 1, r: 0.2, lp: 0.12 },
  { t: 0, dur: 0.012, f: 240, wave: 'square', vol: 0.3, s: 1, r: 0.08, lp: 0.3 },
]);

/** el aire que corta un golpe: ruido que sube y baja */
const silbido = (largo: number, seed: number) => () => uno(largo + 0.15, seed, [
  { t: 0, dur: largo, f: 1400, wave: 'noise', vol: 0.5, a: largo * 0.4, s: 0.8, r: 0.08, lp: 0.12, bend: { semis: 14, len: largo * 0.6 } },
  { t: largo * 0.5, dur: largo * 0.4, f: 3000, wave: 'noise', vol: 0.25, s: 0.8, r: 0.06, lp: 0.2, bend: { semis: -10, len: largo * 0.4 } },
], 0.6);

/** un ladrido de boxer: dos pulsos de sierra con formante que cae */
function ladrido(seed: number, grave = 1): Float32Array {
  const m = new Mixer(0.7, false, seed);
  for (const [t, f] of [[0, 520], [0.18, 470]] as const) {
    m.add({ t, dur: 0.07, f: f * grave, wave: 'saw', vol: 0.5, a: 0.004, d: 0.03, s: 0.6, r: 0.06, lp: 0.3, bend: { semis: -7, at: 0.01, len: 0.08 } });
    m.add({ t, dur: 0.06, f: f * 2.4 * grave, wave: 'square', duty: 0.3, vol: 0.12, a: 0.004, s: 0.6, r: 0.05, lp: 0.25, bend: { semis: -9, at: 0.01, len: 0.07 } });
    m.add({ t, dur: 0.05, f: 2500, wave: 'noise', vol: 0.25, a: 0.002, s: 0.5, r: 0.05, lp: 0.3 });
  }
  return trimTail(normalize(m.out(), 0.9));
}

export const SFX_PELEA: Record<string, () => Float32Array> = {
  golpe_debil_1: debil(0), golpe_debil_2: debil(1), golpe_debil_3: debil(2),
  golpe_fuerte_1: fuerte(0), golpe_fuerte_2: fuerte(1), golpe_fuerte_3: fuerte(2),
  golpe_super: () => uno(1.2, 60, [
    { t: 0, dur: 0.03, f: 70, wave: 'sine', vol: 1, s: 1, r: 0.6, bend: { semis: -14, len: 0.5 } },
    { t: 0, dur: 0.04, f: 3000, wave: 'noise', vol: 0.9, s: 1, r: 0.35, lp: 0.45 },
    { t: 0.05, dur: 0.05, f: 900, wave: 'noise', vol: 0.5, s: 1, r: 0.5, lp: 0.1 },
    { t: 0.02, dur: 0.02, f: 1600, wave: 'sine', vol: 0.3, s: 1, r: 0.8 },
  ]),
  bloqueo: () => uno(0.35, 61, [
    { t: 0, dur: 0.01, f: 1800, wave: 'square', duty: 0.5, vol: 0.3, s: 1, r: 0.12, bend: { semis: -2, len: 0.1 } },
    { t: 0, dur: 0.01, f: 2700, wave: 'sine', vol: 0.3, s: 1, r: 0.2 },
    { t: 0, dur: 0.01, f: 6000, wave: 'noise', vol: 0.5, s: 1, r: 0.05, hp: 0.4 },
    { t: 0, dur: 0.015, f: 160, wave: 'sine', vol: 0.4, s: 1, r: 0.06 },
  ], 0.75),
  silbido_debil: silbido(0.12, 62), silbido_fuerte: silbido(0.24, 63),
  barrida: () => uno(0.5, 64, [
    { t: 0, dur: 0.3, f: 600, wave: 'noise', vol: 0.5, a: 0.1, s: 0.8, r: 0.1, lp: 0.08, bend: { semis: -6, len: 0.3 } },
    { t: 0.05, dur: 0.2, f: 3000, wave: 'noise', vol: 0.15, a: 0.05, s: 0.6, r: 0.1, hp: 0.5 },
  ], 0.65),
  salto: () => uno(0.3, 65, [{ t: 0, dur: 0.12, f: 900, wave: 'noise', vol: 0.3, a: 0.02, s: 0.7, r: 0.06, lp: 0.1, bend: { semis: 10, len: 0.12 } }], 0.45),
  aterriza: () => uno(0.3, 66, [
    { t: 0, dur: 0.015, f: 110, wave: 'sine', vol: 0.6, s: 1, r: 0.1, bend: { semis: -6, len: 0.08 } },
    { t: 0, dur: 0.02, f: 1500, wave: 'noise', vol: 0.3, s: 1, r: 0.06, lp: 0.2 },
  ], 0.5),
  cae: () => uno(0.75, 67, [
    { t: 0, dur: 0.02, f: 75, wave: 'sine', vol: 1, s: 1, r: 0.3, bend: { semis: -8, len: 0.22 } },
    { t: 0, dur: 0.02, f: 3500, wave: 'noise', vol: 0.6, s: 1, r: 0.1, lp: 0.35 },
    { t: 0.24, dur: 0.015, f: 90, wave: 'sine', vol: 0.45, s: 1, r: 0.16, bend: { semis: -6, len: 0.1 } },
    { t: 0.24, dur: 0.02, f: 1500, wave: 'noise', vol: 0.25, s: 1, r: 0.08, lp: 0.3 },
  ]),
  ko: () => uno(2.2, 68, [
    { t: 0, dur: 0.03, f: 62, wave: 'sine', vol: 1, s: 1, r: 0.8, bend: { semis: -12, len: 0.6 } },
    { t: 0, dur: 0.04, f: 3000, wave: 'noise', vol: 0.8, s: 1, r: 0.4, lp: 0.35 },
    ...[1320, 2640, 3960].map((f, i) => ({ t: 0.15, dur: 0.02, f, wave: 'sine' as const, vol: 0.4 / (i + 1), s: 1, r: 1.6 - i * 0.4 })),
  ]),
  mareo: () => uno(1.4, 69, [
    { t: 0, dur: 1.2, f: 1100, wave: 'sine', vol: 0.3, a: 0.05, s: 1, r: 0.15, vib: [8, 3, 0] },
    { t: 0.1, dur: 1.1, f: 1650, wave: 'triangle', vol: 0.12, a: 0.05, s: 1, r: 0.15, vib: [8, 3, 0] },
  ], 0.6),
  carga: () => uno(0.9, 70, [
    { t: 0, dur: 0.7, f: 220, wave: 'saw', vol: 0.25, a: 0.3, s: 1, r: 0.1, lp: 0.2, bend: { semis: 19, len: 0.7 } },
    { t: 0, dur: 0.7, f: 1200, wave: 'noise', vol: 0.15, a: 0.4, s: 1, r: 0.1, lp: 0.15, bend: { semis: 12, len: 0.7 } },
  ], 0.6),
  super_flash: () => uno(1.4, 71, [
    { t: 0, dur: 0.05, f: 55, wave: 'sine', vol: 1, s: 1, r: 0.6, bend: { semis: -5, len: 0.5 } },
    ...['C5', 'G5', 'C6', 'E6'].map((n, i) => ({ t: i * 0.04, dur: 0.6, f: hz(n), wave: 'square' as const, duty: 0.25, vol: 0.12, a: 0.01, s: 0.8, r: 0.4, vib: [7, 0.2, 0.1] as [number, number, number] })),
    { t: 0, dur: 0.2, f: 6000, wave: 'noise', vol: 0.4, s: 0.6, r: 0.4, hp: 0.5 },
  ]),
  // los poderes de cada uno
  poder_onda: () => uno(0.9, 72, [
    { t: 0, dur: 0.35, f: 160, wave: 'saw', vol: 0.4, a: 0.03, s: 0.9, r: 0.3, lp: 0.2, bend: { semis: 7, len: 0.1 } },
    { t: 0, dur: 0.5, f: 1800, wave: 'noise', vol: 0.5, a: 0.02, s: 0.8, r: 0.3, lp: 0.2, bend: { semis: -8, len: 0.5 } },
    { t: 0.02, dur: 0.3, f: 640, wave: 'square', duty: 0.3, vol: 0.12, s: 0.7, r: 0.2, vib: [16, 0.6, 0] },
  ]),
  poder_hojas: () => uno(1.1, 73, [
    ...Array.from({ length: 14 }, (_, i) => ({ t: i * 0.05, dur: 0.03, f: 4000 + (i % 3) * 900, wave: 'noise' as const, vol: 0.25, s: 0.8, r: 0.06, hp: 0.4 })),
    { t: 0, dur: 0.8, f: 700, wave: 'noise', vol: 0.4, a: 0.1, s: 0.8, r: 0.2, lp: 0.12, bend: { semis: 12, len: 0.6 } },
    { t: 0.05, dur: 0.6, f: hz('A5'), wave: 'pluck', vol: 0.2, r: 0.3, bend: { semis: 5, at: 0.1, len: 0.2 } },
  ]),
  poder_estrella: () => uno(1.2, 74, [
    ...['C6', 'E6', 'G6', 'C7', 'E7', 'G7'].map((n, i) => ({ t: i * 0.045, dur: 0.05, f: hz(n), wave: 'sine' as const, vol: 0.3, s: 1, r: 0.6 })),
    { t: 0, dur: 0.3, f: 8000, wave: 'noise', vol: 0.15, a: 0.05, s: 0.6, r: 0.4, hp: 0.7 },
  ]),
  poder_pelota: () => uno(0.9, 75, [
    { t: 0, dur: 0.008, f: 2200, wave: 'square', duty: 0.5, vol: 0.5, s: 1, r: 0.05 },
    { t: 0, dur: 0.01, f: 900, wave: 'triangle', vol: 0.6, s: 1, r: 0.09 },
    { t: 0, dur: 0.01, f: 6000, wave: 'noise', vol: 0.6, s: 1, r: 0.05, hp: 0.4 },
    { t: 0.05, dur: 0.6, f: 900, wave: 'noise', vol: 0.35, a: 0.05, s: 0.8, r: 0.15, lp: 0.15, bend: { semis: -10, len: 0.6 } },
  ]),
  poder_ladrido: () => ladrido(76),
  ladrido_corto: () => ladrido(77, 1.1),
  poder_trueno: () => uno(1.8, 78, [
    { t: 0, dur: 0.02, f: 9000, wave: 'noise', vol: 1, s: 1, r: 0.15, hp: 0.3 },
    { t: 0.05, dur: 0.05, f: 2500, wave: 'noise', vol: 0.7, s: 1, r: 0.3, lp: 0.4 },
    { t: 0.08, dur: 0.4, f: 120, wave: 'noise', vol: 0.8, a: 0.05, s: 0.8, r: 1.1, lp: 0.03 },
    { t: 0.08, dur: 0.05, f: 50, wave: 'sine', vol: 0.8, s: 1, r: 0.9, bend: { semis: -5, len: 0.8 } },
  ]),
  // la barra de energía llena: arpegio que sube con brillo
  lleno: () => uno(0.7, 83, [
    ...['C6', 'E6', 'G6', 'C7'].map((n, i) => ({ t: i * 0.05, dur: 0.06, f: hz(n), wave: 'square' as const, duty: 0.25, vol: 0.22, s: 0.8, r: 0.25 })),
    { t: 0.2, dur: 0.3, f: 9000, wave: 'noise', vol: 0.08, a: 0.05, s: 0.6, r: 0.2, hp: 0.7 },
  ], 0.6),
  // dos proyectiles que chocan y se deshacen
  choque: () => uno(0.9, 84, [
    { t: 0, dur: 0.03, f: 4000, wave: 'noise', vol: 0.9, s: 1, r: 0.4, lp: 0.5 },
    { t: 0, dur: 0.02, f: 120, wave: 'sine', vol: 0.8, s: 1, r: 0.3, bend: { semis: -8, len: 0.25 } },
    ...[1760, 2640].map((f) => ({ t: 0.02, dur: 0.02, f, wave: 'sine' as const, vol: 0.2, s: 1, r: 0.5 })),
  ]),
  // el menú
  elige: () => uno(0.5, 80, [
    ...['C6', 'G6', 'C7'].map((n, i) => ({ t: i * 0.06, dur: 0.08, f: hz(n), wave: 'square' as const, duty: 0.25, vol: 0.25, s: 0.8, r: 0.12 })),
  ], 0.6),
  mueve: () => uno(0.12, 81, [{ t: 0, dur: 0.03, f: hz('A6'), wave: 'square', duty: 0.25, vol: 0.3, s: 0.8, r: 0.04 }], 0.45),
  ruleta: () => uno(0.08, 82, [{ t: 0, dur: 0.02, f: hz('E6'), wave: 'square', duty: 0.5, vol: 0.3, s: 0.8, r: 0.03 }], 0.4),
};
