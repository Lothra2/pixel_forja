import { Mixer, seq, hz, rng, normalize, trimTail, type Note } from './synth';
import { raspa, maraca, acorde, raiz, escala, terceraAbajo, sinDC, flauta, acordeon, rasgueo, efecto } from './mundos';

/**
 * La música y los efectos de Street Family Fighter 2, sintetizados con código como un cartucho de 16 bits:
 * - **Un tema por ciudad**: Caracas con arpa llanera sobre rock, Ho Chi Minh con đàn tranh que dobla la cuerda,
 *   Bogotá con cumbia y acordeón, Japón con koto en escala miyako-bushi, y el Reino Celestial con campanitas mágicas.
 *   Todos en bucle sin corte de 16 compases.
 * - **Los mundos del lote E** (de 43 a 52 s, también en bucle): China con erhu, dizi y gongs, Italia con tarantela de
 *   mandolina y acordeón, el puerto de Nueva York con bajo funk y metales, samba de batucada en Brasil, Egipto en
 *   hijaz con oud y darbuka, y el Polo Norte con celesta y cascabeles.
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

// ---------------------------------------------------------------- lote E: seis mundos nuevos

type Nota = ReturnType<typeof seq>[number];

interface Banda {
  bpm: number;
  seed: number;
  /** unidades por compás (8 corcheas, 12 corcheas de tresillo o 16 semicorcheas) y unidades por negra */
  pasos: number;
  porNegra: number;
  /** la melodía, un compás por texto; cada compás suma `pasos` */
  melodia: string[];
  /** cómo suena cada nota de la melodía en el compás b */
  toca: (m: Mixer, n: Nota, b: number, R: () => number) => void;
  /** lo demás del compás b: bajo, acordes y percusión (t0 = inicio, e = una unidad en segundos) */
  compas: (m: Mixer, b: number, t0: number, e: number, R: () => number) => void;
  eco?: [number, number, number];
}

/**
 * Lleva un tema al volumen medio de los de las ciudades (RMS en dB, pico de 0.9): sube la ganancia y redondea con una
 * curva suave (tanh) los picos que pasan, en vez de cortarlos. Da unas vueltas porque redondear baja el RMS. Muestra a
 * muestra, así que el bucle sigue empalmando sin corte.
 */
function aRms(b: Float32Array, dB: number): Float32Array {
  const obj = Math.pow(10, dB / 20), k = 0.5;
  for (let vuelta = 0; vuelta < 8; vuelta++) {
    normalize(b, 0.9);
    let s = 0;
    for (const v of b) s += v * v;
    const rms = Math.sqrt(s / b.length);
    if (rms > obj) { for (let i = 0; i < b.length; i++) b[i] *= obj / rms; return b; }
    if (rms > obj * 0.985) return b;
    const g = obj / rms;
    for (let i = 0; i < b.length; i++) {
      const y = b[i] * g, a = Math.abs(y);
      b[i] = a <= k ? y : Math.sign(y) * (k + (1 - k) * Math.tanh((a - k) / (1 - k)));
    }
  }
  return normalize(b, 0.9);
}

/**
 * Un tema en bucle sin corte con su propio arreglo (el lote E no cabe en `tema`: compases de 12 y de 16, bajos y
 * percusiones de cada país). Revisa que cada compás de la melodía sume lo que debe.
 */
function banda(o: Banda): Float32Array {
  const e = 60 / o.bpm / o.porNegra, bar = e * o.pasos;
  const m = new Mixer(o.melodia.length * bar, true, o.seed), R = rng(o.seed);
  o.melodia.forEach((txt, b) => {
    const u = txt.trim().split(/\s+/).reduce((s, tok) => s + Number(tok.split('/')[1] ?? 1), 0);
    if (u !== o.pasos) throw new Error(`compás ${b + 1}: suma ${u} y no ${o.pasos}`);
    for (const n of seq(txt, b * bar, e)) o.toca(m, n, b, R);
    o.compas(m, b, b * bar, e, R);
  });
  const [d, fb, mix] = o.eco ?? [0.12, 0.2, 0.3];
  m.echo(d, fb, mix);
  return aRms(sinDC(m.out(), true), -15.3);
}

// ---------- China: erhu y dizi en pentatónica, gongs y tambores que empujan ----------

/** Erhu: el violín de dos cuerdas. Sierra nasal con arco suave; las notas largas entran deslizando y vibran ancho. */
function erhu(m: Mixer, n: Nota, vol: number) {
  const largo = n.units >= 3, f = largo ? n.f / Math.pow(2, 2 / 12) : n.f;
  const bend = largo ? { semis: 2, len: 0.08 } : undefined;
  m.add({ t: n.t, dur: n.dur * 0.94, f, wave: 'saw', vol, a: 0.035, d: 0.1, s: 0.85, r: 0.09, lp: 0.3, vib: largo ? [6.2, 0.35, 0.16] : [6.2, 0.1, 0.06], bend });
  m.add({ t: n.t, dur: n.dur * 0.94, f: f * 1.003, wave: 'square', duty: 0.15, vol: vol * 0.35, a: 0.035, s: 0.8, r: 0.08, lp: 0.22, vib: largo ? [6.2, 0.35, 0.16] : undefined, bend });
}
/** Dizi: la flauta de bambú, con el zumbido de la membrana (una sierra suave encima del soplo). */
function dizi(m: Mixer, n: Nota, vol: number) {
  flauta(m, n, vol, n.units >= 3);
  m.add({ t: n.t, dur: n.dur * 0.9, f: n.f, wave: 'saw', vol: vol * 0.07, a: 0.03, s: 0.8, r: 0.06, lp: 0.6 });
}
/** Gong: parciales que no son armónicos, el soplo grave del metal y la subida del gong de ópera (`sube`). */
function gong(m: Mixer, t: number, vol: number, f = 98, sube = 0) {
  for (const [k, a, r] of [[1, 1, 2.4], [1.48, 0.5, 1.7], [2.11, 0.36, 1.3], [2.73, 0.25, 0.9], [3.9, 0.14, 0.6]]) {
    m.add({ t, dur: 0.03, f: f * k, wave: 'sine', vol: vol * a * 0.4, a: 0.008, s: 1, r, bend: sube ? { semis: sube, at: 0.04, len: 0.5 } : undefined });
  }
  m.add({ t, dur: 0.05, f: 2200, wave: 'noise', vol: vol * 0.3, s: 1, r: 1.1, lp: 0.08 });
}
/** Platillos chinos (bo): el choque brillante y corto con su tono metálico. */
function bo(m: Mixer, t: number, vol: number) {
  m.add({ t, dur: 0.02, f: 9000, wave: 'noise', vol: vol * 0.4, s: 1, r: 0.45, hp: 0.6 });
  m.add({ t, dur: 0.01, f: 1870, wave: 'sine', vol: vol * 0.12, s: 1, r: 0.3 });
}

/** China, el mundo de Chun-Li: pentatónica de Re (modo gong) con erhu, dizi, yangqin, gongs y tambores, 160 bpm. */
export function temaChina(): Float32Array {
  const a = ['A5 B5 D6 E6 D6/2 B5 A5', 'B5/2 A5 F#5 E5/4', 'D5 E5 F#5 A5 B5/2 A5 B5', 'D6/4 B5/2 A5/2', 'F#6/2 E6 D6 E6/2 D6 B5', 'A5/2 B5 A5 F#5/4', 'E5 F#5 A5 B5 D6/2 E6/2', 'D6/8'];
  const b = ['B5/3 A5 B5 D6 E6/2', 'F#6/2 E6 D6 B5/4', 'A5/3 B5 A5 F#5 E5/2', 'F#5/8', 'B5/3 D6 E6 F#6 A6/2', 'B6/2 A6 F#6 E6/4', 'D6 E6 F#6 A6 B6/2 A6 F#6', 'E6/4 A5/4'];
  const fin = [...b.slice(0, 6), 'D6 E6 F#6 A6 B6/2 D7/2', 'A6/4 E6/2 A5/2'];
  const ac = ['D', 'D', 'G', 'G', 'Bm', 'Bm', 'A', 'D', 'Bm', 'G', 'A', 'D', 'Bm', 'G', 'A', 'A'];
  return banda({
    bpm: 160, seed: 101, pasos: 8, porNegra: 2, melodia: [...a, ...b, ...a, ...fin], eco: [0.14, 0.22, 0.32],
    toca: (m, n, k) => {
      const parte = Math.floor(k / 8);
      if (parte === 0) erhu(m, n, 0.15);
      else if (parte === 1) dizi(m, n, 0.22);
      else if (parte === 2) { erhu(m, n, 0.14); dizi(m, { ...n, f: n.f * 2 }, 0.06); }
      else { dizi(m, n, 0.2); erhu(m, { ...n, f: n.f / 2 }, 0.08); }
    },
    compas: (m, k, t0, e) => {
      const nom = ac[k % 16], r = raiz(nom, 2), notas = acorde(nom, 4);
      // bajo que empuja: raíz, quinta y octava en corcheas
      for (let i = 0; i < 8; i++) m.add({ t: t0 + i * e, dur: e * 0.7, f: r * [1, 1, 1.5, 2][i % 4], wave: 'saw', vol: 0.17, s: 0.75, r: 0.04, lp: 0.2 });
      // yangqin: el salterio de martillos, arpegio en semicorcheas que sube y baja
      const arp = [notas[0], notas[1], notas[2], notas[0] * 2, notas[2], notas[1]];
      for (let i = 0; i < 16; i++) m.add({ t: t0 + i * e / 2, dur: e * 0.4, f: arp[i % 6], wave: 'pluck', vol: k < 8 ? 0.05 : 0.07, r: 0.12 });
      // batería y tambores chinos
      for (let i = 0; i < 8; i++) m.drum('charles', t0 + i * e, i % 2 ? 0.4 : 0.7);
      m.drum('bombo', t0, 1); m.drum('bombo', t0 + 3 * e, 0.7); m.drum('bombo', t0 + 4 * e, 0.9); m.drum('bombo', t0 + 5.5 * e, 0.5);
      m.drum('caja', t0 + 2 * e, 0.85); m.drum('caja', t0 + 6 * e, 0.85);
      if (k >= 8) { m.drum('madera', t0 + 1 * e, 0.6); m.drum('madera', t0 + 5 * e, 0.6); }
      if (k % 2 === 1) bo(m, t0 + 4 * e, 0.6);
      if (k % 4 === 3) for (const [i, v] of [[6, 0.6], [6.5, 0.7], [7, 0.8], [7.5, 0.9]]) m.drum('tom', t0 + i * e, v);
      if (k % 8 === 0) gong(m, t0, 0.7);
      if (k % 8 === 7) gong(m, t0 + 7 * e, 0.45, 196, 2);
    },
  });
}

// ---------- Italia: Venecia de noche, tarantela con mandolina y acordeón ----------

/** Mandolina: las notas largas en trémolo (la púa que va y viene) sobre la pareja de cuerdas un poco desafinada. */
function mandolina(m: Mixer, n: Nota, vol: number) {
  const paso = 0.05, golpes = n.units >= 2 ? Math.max(1, Math.floor((n.dur * 0.92) / paso)) : 1;
  for (let k = 0; k < golpes; k++) {
    const t = n.t + k * paso, v = vol * (k === 0 ? 1 : k % 2 ? 0.6 : 0.75), dur = golpes === 1 ? n.dur * 0.85 : paso;
    m.add({ t, dur, f: n.f, wave: 'pluck', vol: v, r: 0.06 });
    m.add({ t: t + 0.004, dur, f: n.f * 1.004, wave: 'pluck', vol: v * 0.5, r: 0.06 });
  }
}
/** Pandereta: las sonajas (ruido agudo en ráfaga) y, si toca, el parche. */
function pandereta(m: Mixer, t: number, vol: number, parche = false) {
  for (const dt of [0, 0.006, 0.013]) m.add({ t: t + dt, dur: 0.004, f: 10000, wave: 'noise', vol: vol * 0.5, s: 1, r: 0.05, hp: 0.8 });
  m.add({ t, dur: 0.005, f: 6400, wave: 'sine', vol: vol * 0.12, s: 1, r: 0.06 });
  if (parche) m.add({ t, dur: 0.01, f: 210, wave: 'sine', vol: vol * 0.7, s: 1, r: 0.08, bend: { semis: -4, len: 0.06 } });
}

/** Italia, Venecia de noche: tarantela en La menor (12/8) con mandolina en trémolo, acordeón y pandereta. */
export function temaItalia(): Float32Array {
  const a = ['E5/2 A5 A5/2 B5 C6/2 B5 A5/2 B5', 'C6/2 B5 A5/2 G#5 A5/3 E5/3', 'D5/2 F5 F5/2 G5 A5/2 G5 F5/2 E5', 'D5/2 E5 F5/2 D5 E5/6', 'E5/2 G#5 B5/2 D6 C6/2 B5 A5/2 G#5', 'A5/2 C6 E6/2 C6 B5/3 A5/3', 'D6/2 C6 B5/2 A5 G#5/2 A5 B5/2 G#5', 'A5/9 E5/3'];
  const b = ['G5/2 C6 E6/2 C6 G5/2 C6 E6/2 G6', 'F6/2 E6 D6/2 C6 D6/6', 'F5/2 A5 C6/2 A5 F5/2 A5 C6/2 F6', 'E6/2 D6 C6/2 B5 C6/6', 'A5/2 C6 E6/2 C6 A5/2 C6 E6/2 A6', 'G#6/2 F6 E6/2 D6 E6/6', 'F6/2 E6 D6/2 C6 B5/2 A5 G#5/2 B5', 'A5/6 E5/6'];
  const ac = ['Am', 'Am', 'Dm', 'E7', 'E7', 'Am', 'E7', 'Am', 'C', 'G', 'F', 'C', 'Am', 'E7', 'Dm', 'Am'];
  const sc = escala('A', 'B', 'C', 'D', 'E', 'F', 'G#');
  return banda({
    bpm: 132, seed: 102, pasos: 12, porNegra: 3, melodia: [...a, ...b, ...a], eco: [0.2, 0.28, 0.35],
    toca: (m, n, k) => {
      mandolina(m, n, 0.2);
      // el acordeón responde: una octava abajo en la segunda parte, en terceras en la vuelta
      if (k >= 8 && k < 16) acordeon(m, n.t, n.dur * 0.85, n.f / 2, 0.05);
      if (k >= 16) acordeon(m, n.t, n.dur * 0.85, terceraAbajo(n.f, sc), 0.05);
    },
    compas: (m, k, t0, e) => {
      const nom = ac[k % 16], r = raiz(nom, 2), notas = acorde(nom, 4);
      // um-pa: el bajo en el 1 y el 3 (raíz y quinta abajo), el acordeón en el 2 y el 4
      m.add({ t: t0, dur: e * 2, f: r, wave: 'triangle', vol: 0.32, s: 0.8, r: 0.06 });
      m.add({ t: t0 + 6 * e, dur: e * 2, f: r * 0.75, wave: 'triangle', vol: 0.3, s: 0.8, r: 0.06 });
      for (const i of [3, 9]) for (const f of notas) acordeon(m, t0 + i * e, e * 1.6, f, 0.04);
      // de noche la primera vez: el acordeón sostenido por debajo, muy suave
      if (k < 8) for (const f of notas) acordeon(m, t0, e * 11, f / 2, 0.02);
      for (let i = 0; i < 12; i++) pandereta(m, t0 + i * e, i % 3 === 0 ? 0.32 : 0.13, i % 6 === 0);
      if (k >= 8) { m.drum('bombo', t0, 0.6); m.drum('bombo', t0 + 6 * e, 0.5); m.drum('caja', t0 + 3 * e, 0.4); m.drum('caja', t0 + 9 * e, 0.45); }
      if (k % 8 === 7) for (const i of [9, 10, 11]) m.drum('caja', t0 + i * e, 0.4 + (i - 9) * 0.15);
    },
  });
}

// ---------- USA: el puerto de Nueva York, bajo funk, metales y batería de rock ----------

/** Lead de sintetizador: sierra brillante y cuadrada; las notas largas entran doblando la cuerda y vibran. */
function leadUsa(m: Mixer, n: Nota, vol: number) {
  const largo = n.units >= 6, f = largo ? n.f / Math.pow(2, 2 / 12) : n.f, bend = largo ? { semis: 2, len: 0.07 } : undefined;
  m.add({ t: n.t, dur: n.dur * 0.9, f, wave: 'saw', vol, a: 0.008, d: 0.08, s: 0.8, r: 0.06, lp: 0.42, vib: largo ? [5.8, 0.25, 0.22] : undefined, bend });
  m.add({ t: n.t, dur: n.dur * 0.9, f: f * 0.997, wave: 'square', duty: 0.25, vol: vol * 0.5, a: 0.008, d: 0.08, s: 0.75, r: 0.06, lp: 0.35, bend });
}
/** Metales: el acorde de trompetas y saxos, corto y con la caída desde abajo. */
function metales(m: Mixer, t: number, notas: number[], dur: number, vol: number) {
  for (const f of notas) {
    m.add({ t, dur, f: f / Math.pow(2, 1.5 / 12), wave: 'saw', vol, a: 0.012, d: 0.06, s: 0.7, r: 0.05, lp: 0.45, bend: { semis: 1.5, len: 0.05 } });
    m.add({ t, dur, f: f * 1.004, wave: 'square', duty: 0.5, vol: vol * 0.4, a: 0.012, d: 0.06, s: 0.65, r: 0.05, lp: 0.3 });
  }
}
/** El bajo funk: [semicorchea, semitonos sobre la raíz, largo, slap] (el slap es el "pop" de la cuerda aguda). */
const FUNK: [number, number, number, boolean][] = [[0, 0, 2, false], [3, 0, 1, false], [4, 12, 1, true], [6, 0, 1, false], [7, 10, 1, false], [8, 12, 1, true], [10, 0, 1, false], [11, 7, 1, false], [12, 10, 1, false], [14, 12, 1, true], [15, 0, 1, false]];

/** USA, el puerto de Nueva York: funk-rock en Mi dórico con bajo slap, metales, lead de sintetizador y sirena de barco. */
export function temaUsa(): Float32Array {
  const a = ['E5/3 G5/3 A5/2 B5/2 D6/2 B5/2 A5/2', 'B5/6 A5/2 G5/4 E5/4', 'E5/3 G5/3 A5/2 B5/2 D6/2 E6/2 D6/2', 'E6/8 r/4 D6/2 E6/2', 'G6/3 F#6/3 E6/2 D6/3 B5/3 A5/2', 'B5/6 A5/2 B5/8', 'C6/3 B5/3 A5/2 G5/3 A5/3 B5/2', 'E5/12 r/4'];
  const b = ['B5/4 B5/2 A5/2 B5/4 D6/4', 'E6/6 D6/2 B5/8', 'G5/4 G5/2 A5/2 B5/4 D6/4', 'B5/16', 'C6/4 C6/2 B5/2 C6/4 E6/4', 'F#6/6 E6/2 D6/8', 'D#6/4 F#6/4 B6/4 A6/4', 'F#6/8 D#6/4 B5/4'];
  const vuelta = ['E6/2 D6/2 B5/2 A5/2 G5/2 A5/2 B5/2 D6/2', 'E6/16', 'r/16', 'r/8 B5/2 D6/2 D#6/2 F#6/2'];
  const ac = ['Em', 'Em', 'Em', 'Em', 'C', 'G', 'A7', 'Bm', 'C', 'D', 'Bm', 'Em', 'C', 'D', 'B7', 'B7', 'Em', 'Em', 'Em', 'Em', 'C', 'G', 'A7', 'Bm', 'Em', 'C', 'D', 'B7'];
  return banda({
    bpm: 140, seed: 103, pasos: 16, porNegra: 4, melodia: [...a, ...b, ...a, ...vuelta], eco: [0.11, 0.2, 0.28],
    toca: (m, n, k) => { leadUsa(m, n, 0.15); if (k >= 16) leadUsa(m, { ...n, f: n.f / 2 }, 0.05); },
    compas: (m, k, t0, e) => {
      const nom = ac[k], r = raiz(nom, 2), notas = acorde(nom, 4), parte = k < 8 || (k >= 16 && k < 24) ? 'a' : k < 16 ? 'b' : 'v';
      // bajo slap
      for (const [i, st, len, pop] of FUNK) {
        const f = r * Math.pow(2, st / 12), t = t0 + i * e;
        if (pop) m.add({ t, dur: e * 0.5, f, wave: 'square', duty: 0.3, vol: 0.13, a: 0.002, d: 0.04, s: 0.4, r: 0.03, lp: 0.5 });
        else { m.add({ t, dur: e * len * 0.8, f, wave: 'saw', vol: 0.24, a: 0.003, d: 0.06, s: 0.55, r: 0.03, lp: 0.18 }); m.add({ t, dur: e * len * 0.8, f, wave: 'sine', vol: 0.2, s: 0.8, r: 0.03 }); }
      }
      // los golpes de metales
      const golpes: [number, number][] = parte === 'b' ? [[0, 2], [6, 1], [10, 3]] : parte === 'v' ? (k === 26 ? [[0, 1], [3, 1], [6, 2], [10, 1], [12, 1], [14, 2]] : [[0, 2], [6, 1]]) : k % 2 === 0 ? [[0, 3]] : [[10, 1], [14, 1]];
      for (const [i, d] of golpes) metales(m, t0 + i * e, notas, e * d * 0.8, 0.055);
      // batería de rock: bombo, caja en 2 y 4, charles en corcheas con fantasmas
      const corte = k === 26;
      if (!corte) {
        for (const i of [0, 7, 8, 10]) m.drum('bombo', t0 + i * e, i === 0 ? 1 : 0.75);
        m.drum('caja', t0 + 4 * e, 0.95); m.drum('caja', t0 + 12 * e, 0.95);
        for (let i = 0; i < 16; i++) if (i !== 14 || k % 2) m.drum('charles', t0 + i * e, i % 2 ? 0.25 : 0.65);
        if (k % 2 === 0) m.add({ t: t0 + 14 * e, dur: 0.02, f: 10000, wave: 'noise', vol: 0.16, s: 1, r: 0.22, hp: 0.85 });
      } else for (const [i, v] of [[0, 1], [3, 0.8], [6, 0.9], [10, 0.8], [12, 0.8], [14, 0.9]]) { m.drum('bombo', t0 + i * e, v); m.drum('caja', t0 + i * e, v * 0.8); }
      if (k % 8 === 0 || k === 24) m.drum('platillo', t0, 0.65);
      if (k % 4 === 3) for (const [i, v] of [[12, 0.5], [13, 0.6], [14, 0.75], [15, 0.9]]) m.drum(i < 14 ? 'caja' : 'tom', t0 + i * e, v);
      // el puerto: la sirena grave de un barco al empezar, y una gaviota a la mitad
      if (k === 0) for (const f of [hz('E2'), hz('E2') * 1.005]) m.add({ t: t0, dur: 1.1, f, wave: 'saw', vol: 0.12, a: 0.12, s: 1, r: 0.5, lp: 0.06 });
      if (k === 16) for (const dt of [0, 0.22]) m.add({ t: t0 + 8 * e + dt, dur: 0.1, f: 2100, wave: 'sine', vol: 0.06, a: 0.02, s: 1, r: 0.05, bend: { semis: -6, at: 0.02, len: 0.1 } });
    },
  });
}

// ---------- Brasil: samba de batucada ----------

/** Surdo: el bombo grande de la batería de escola; abierto retumba, apagado (la mano encima) es corto. */
function surdo(m: Mixer, t: number, vol: number, f: number, abierto: boolean) {
  m.add({ t, dur: 0.03, f, wave: 'sine', vol, s: 1, r: abierto ? 0.42 : 0.12, bend: { semis: -4, len: 0.2 } });
  m.add({ t, dur: 0.01, f: 600, wave: 'noise', vol: vol * 0.25, s: 1, r: 0.04, lp: 0.12 });
}
/** Tamborim: el tamborcito agudo de baqueta, seco. */
function tamborim(m: Mixer, t: number, vol: number) {
  m.add({ t, dur: 0.004, f: 1050, wave: 'triangle', vol: vol * 0.6, s: 1, r: 0.04 });
  m.add({ t, dur: 0.004, f: 7000, wave: 'noise', vol: vol * 0.5, s: 1, r: 0.03, hp: 0.5 });
}
/** Agogô: las dos campanas de hierro (alta y baja), con parciales que no son armónicos. */
function agogo(m: Mixer, t: number, vol: number, alta: boolean) {
  const f = alta ? 1180 : 880;
  for (const [k, a] of [[1, 1], [2.42, 0.35], [4.1, 0.15]]) m.add({ t, dur: 0.008, f: f * k, wave: 'sine', vol: vol * a, s: 1, r: 0.2 / k });
}
/** Cuíca: la varilla frotada que "llora": sube o baja como una voz. */
function cuica(m: Mixer, t: number, vol: number, sube: boolean) {
  const bend = { semis: sube ? 9 : -7, len: 0.09 };
  m.add({ t, dur: 0.1, f: 520, wave: 'sine', vol, a: 0.015, s: 0.9, r: 0.05, bend });
  m.add({ t, dur: 0.1, f: 1040, wave: 'triangle', vol: vol * 0.2, a: 0.015, s: 0.8, r: 0.05, lp: 0.3, bend });
}
/** Apito: el pito del director de la batería, con el trino de la bolita. */
function apito(m: Mixer, t: number, dur: number, vol: number) {
  m.add({ t, dur, f: 2900, wave: 'sine', vol, a: 0.005, s: 1, r: 0.03, vib: [38, 0.6, 0] });
  m.add({ t, dur, f: 6000, wave: 'noise', vol: vol * 0.15, a: 0.005, s: 1, r: 0.03, hp: 0.6 });
}
/** Lead brillante: cuadrada abierta con un brillo de triángulo una octava arriba. */
function leadBrasil(m: Mixer, n: Nota, vol: number) {
  const vib: Note['vib'] = n.units >= 6 ? [6, 0.2, 0.2] : undefined;
  m.add({ t: n.t, dur: n.dur * 0.85, f: n.f, wave: 'square', duty: 0.5, vol, a: 0.005, d: 0.06, s: 0.8, r: 0.05, lp: 0.55, vib });
  m.add({ t: n.t, dur: n.dur * 0.85, f: n.f * 2, wave: 'triangle', vol: vol * 0.35, a: 0.005, s: 0.7, r: 0.05, vib });
}

/** Brasil: samba de batucada en Sol mayor con surdos, caixa, tamborim, agogô, cuíca, cavaquinho y apito, 132 bpm. */
export function temaBrasil(): Float32Array {
  const a = ['D5/2 G5/2 B5/3 A5/1 G5/2 A5/2 B5/4', 'r/2 A5/2 B5/2 A5/2 G5/2 E5/2 D5/4', 'C5/2 E5/2 A5/3 G5/1 F#5/2 G5/2 A5/4', 'r/2 B5/2 A5/2 G5/2 F#5/2 E5/2 D5/4', 'D5/2 G5/2 B5/3 A5/1 B5/2 D6/2 E6/4', 'D6/3 B5/1 D6/2 B5/2 A5/4 G5/4', 'A5/3 B5/1 C6/2 B5/2 A5/2 G5/2 F#5/2 A5/2', 'G5/12 r/4'];
  const b = ['B5/2 D6/2 B5/2 D6/2 E6/4 D6/4', 'B5/2 A5/2 G5/2 A5/2 B5/8', 'A5/2 C6/2 A5/2 C6/2 D6/4 C6/4', 'B5/2 A5/2 G5/2 A5/2 F#5/8', 'G5/2 B5/2 D6/2 G6/2 F#6/3 E6/1 D6/4', 'E6/3 D6/1 C6/2 B5/2 A5/4 C6/4', 'B5/3 A5/1 G5/2 F#5/2 E5/2 F#5/2 A5/4', 'G5/16'];
  const breque = ['r/16', 'r/8 A4/2 B4/2 C5/2 C#5/2'];
  const ac = ['G', 'Em', 'Am', 'D7', 'G', 'C', 'D7', 'G', 'Em', 'C', 'D', 'D7', 'G', 'Am', 'D7', 'G'];
  return banda({
    bpm: 132, seed: 104, pasos: 16, porNegra: 4, melodia: [...a, ...b, ...a, ...breque], eco: [0.12, 0.2, 0.28],
    toca: (m, n, k) => { leadBrasil(m, n, 0.13); if (k >= 16) leadBrasil(m, { ...n, f: n.f / 2 }, 0.05); },
    compas: (m, k, t0, e, R) => {
      const nom = k < 24 ? ac[k % 16] : k === 24 ? 'D7' : 'D', r = raiz(nom, 2), notas = acorde(nom, 4);
      const at = (i: number) => t0 + i * e;
      if (k === 24) {
        // el breque: el apito llama y el repique contesta, todo lo demás calla
        apito(m, at(0), 0.08, 0.16); apito(m, at(2), 0.08, 0.16); apito(m, at(4), 0.35, 0.18);
        surdo(m, at(0), 0.8, 58, true); surdo(m, at(4), 0.6, 58, true);
        for (const [i, v] of [[8, 0.7], [10, 0.7], [11, 0.8], [13, 0.7], [14, 0.9]]) { m.drum('tom', at(i), v * 0.6); tamborim(m, at(i), v * 0.5); }
        surdo(m, at(15), 0.7, 58, true);
        return;
      }
      // bajo: raíz y quinta como el violão de siete cuerdas
      for (const [i, f] of [[0, r], [6, r * 1.5], [8, r], [12, r * 0.75]] as const) m.add({ t: at(i), dur: e * 1.6, f, wave: 'triangle', vol: 0.28, s: 0.8, r: 0.05 });
      // cavaquinho: rasgueos sincopados, algunos apagados
      for (const i of [0, 3, 6, 8, 11, 14]) rasgueo(m, at(i), notas.map((f) => f * 2), 0.07, i === 6 || i === 14);
      // surdos: el de segunda apagado en el 1, el de primera abierto en el 2; el de tercera repica
      surdo(m, at(0), 0.7, 75, false); surdo(m, at(4), 0.95, 58, true); surdo(m, at(8), 0.7, 75, false); surdo(m, at(12), 0.95, 58, true);
      if (k % 2) { surdo(m, at(6), 0.45, 95, false); surdo(m, at(14), 0.45, 95, false); }
      // caixa en semicorcheas y ganzá
      for (let i = 0; i < 16; i++) { m.drum('caja_banda', at(i), [0.5, 0.18, 0.3, 0.22][i % 4]); maraca(m, at(i), i % 4 === 0 || i % 4 === 3 ? 0.22 : 0.1); }
      for (const i of [0, 2, 3, 5, 6, 8, 10, 11, 13, 14]) tamborim(m, at(i), 0.22);
      for (const [i, alta] of [[0, true], [3, true], [6, false], [8, true], [11, true], [14, false]] as const) agogo(m, at(i), 0.09, alta);
      if (k % 2 || (k >= 8 && k < 16)) { cuica(m, at(2), 0.09, true); cuica(m, at(10) + R() * 0.01, 0.08, false); }
      if (k % 8 === 0) m.drum('platillo', t0, 0.4);
      if (k === 25) apito(m, at(0), 0.25, 0.14);
    },
  });
}

// ---------- Egipto: escala hijaz, laúd y darbuka ----------

/** Oud: el laúd sin trastes; las notas largas en trémolo de risha (la pluma), con el cuerpo una octava abajo. */
function oud(m: Mixer, n: Nota, vol: number) {
  const paso = 0.065, golpes = n.units >= 4 ? Math.max(1, Math.floor((n.dur * 0.9) / paso)) : 1;
  for (let k = 0; k < golpes; k++) m.add({ t: n.t + k * paso, dur: golpes === 1 ? n.dur * 0.85 : paso, f: n.f, wave: 'pluck', vol: vol * (k ? 0.65 : 1), r: 0.08, lp: 0.45 });
  m.add({ t: n.t, dur: n.dur * 0.85, f: n.f / 2, wave: 'pluck', vol: vol * 0.35, r: 0.1, lp: 0.3 });
}
/** Mizmar: la chirimía nasal de las bodas; cuadrada angosta con vibrato y entrada desde medio tono abajo. */
function mizmar(m: Mixer, n: Nota, vol: number) {
  const largo = n.units >= 4, f = largo ? n.f / Math.pow(2, 1 / 12) : n.f, bend = largo ? { semis: 1, len: 0.06 } : undefined;
  const vib: Note['vib'] = [6.5, largo ? 0.32 : 0.12, 0.1];
  m.add({ t: n.t, dur: n.dur * 0.92, f, wave: 'square', duty: 0.18, vol, a: 0.02, d: 0.06, s: 0.85, r: 0.05, lp: 0.45, vib, bend });
  m.add({ t: n.t, dur: n.dur * 0.92, f: f * 1.002, wave: 'saw', vol: vol * 0.4, a: 0.02, s: 0.8, r: 0.05, lp: 0.3, vib, bend });
}
/** Darbuka: dum (el centro, grave), tek (el borde, seco) y ka (el borde con la otra mano, más suave). */
function darbuka(m: Mixer, t: number, vol: number, golpe: 'dum' | 'tek' | 'ka') {
  if (golpe === 'dum') {
    m.add({ t, dur: 0.02, f: 82, wave: 'sine', vol, s: 1, r: 0.28, bend: { semis: -3, len: 0.15 } });
    m.add({ t, dur: 0.01, f: 165, wave: 'sine', vol: vol * 0.3, s: 1, r: 0.08 });
    m.add({ t, dur: 0.01, f: 500, wave: 'noise', vol: vol * 0.2, s: 1, r: 0.04, lp: 0.1 });
  } else {
    const v = golpe === 'tek' ? vol : vol * 0.55;
    m.add({ t, dur: 0.004, f: 2300, wave: 'sine', vol: v * 0.4, s: 1, r: 0.035 });
    m.add({ t, dur: 0.004, f: 8000, wave: 'noise', vol: v * 0.45, s: 1, r: golpe === 'tek' ? 0.05 : 0.03, hp: 0.55 });
  }
}

/** Egipto: Re hijaz (frigio dominante) con oud, mizmar, darbuka en maqsum, riq, sagat y un bordón del desierto, 120 bpm. */
export function temaEgipto(): Float32Array {
  const a = ['D5/2 Eb5/2 F#5/4 G5/2 F#5/2 Eb5/4', 'D5/2 Eb5/2 F#5/2 G5/2 A5/8', 'Bb5/2 A5/2 G5/4 A5/2 G5/2 F#5/4', 'G5/2 F#5/2 Eb5/2 F#5/2 D5/8', 'A5/2 Bb5/2 C6/4 Bb5/2 A5/2 G5/4', 'A5/2 Bb5/2 A5/2 G5/2 F#5/8', 'G5/2 A5/2 Bb5/2 C6/2 D6/4 C6/2 Bb5/2', 'A5/4 G5/2 F#5/2 Eb5/2 F#5/2 D5/4'];
  const b = ['D6/6 Eb6/2 D6/4 C6/4', 'Bb5/2 C6/2 D6/2 Eb6/2 D6/8', 'C6/6 D6/2 C6/4 Bb5/4', 'A5/2 Bb5/2 C6/2 Bb5/2 A5/8', 'D6/2 F#6/2 G6/4 F#6/2 Eb6/2 D6/4', 'C6/2 D6/2 Eb6/2 D6/2 C6/2 Bb5/2 A5/4', 'Bb5/2 A5/2 G5/2 F#5/2 G5/2 A5/2 Bb5/4', 'A5/16'];
  const ac = ['D', 'D', 'Gm', 'D', 'Cm', 'D', 'Gm', 'D', 'Gm', 'Gm', 'Cm', 'D', 'D', 'Cm', 'Gm', 'D'];
  return banda({
    bpm: 120, seed: 105, pasos: 16, porNegra: 4, melodia: [...a, ...b, ...a], eco: [0.18, 0.25, 0.32],
    toca: (m, n, k) => {
      if (k < 8) oud(m, n, 0.3);
      else if (k < 16) mizmar(m, n, 0.12);
      else { oud(m, n, 0.24); mizmar(m, n, 0.07); }
    },
    compas: (m, k, t0, e, R) => {
      const nom = ac[k % 16], r = raiz(nom, 2), at = (i: number) => t0 + i * e;
      // el bordón del desierto: Re y La graves que no se mueven
      for (const f of [hz('D2'), hz('A2'), hz('D2') * 1.004]) m.add({ t: t0, dur: e * 15.5, f, wave: 'saw', vol: 0.05, a: 0.2, s: 1, r: 0.3, lp: 0.06 });
      // el bajo del laúd con el dum
      for (const i of [0, 6, 8, 12]) m.add({ t: at(i), dur: e * 1.6, f: i === 6 ? r * 1.5 : r, wave: 'pluck', vol: 0.3, r: 0.12, lp: 0.3 });
      // en la segunda parte, el oud acompaña con el acorde
      if (k >= 8 && k < 16) for (const i of [0, 4, 8, 12]) acorde(nom, 4).forEach((f, j) => m.add({ t: at(i) + j * 0.012, dur: e * 1.5, f, wave: 'pluck', vol: 0.07, r: 0.1, lp: 0.4 }));
      // darbuka en maqsum: dum tek . tek dum . tek . (con los ka de adorno)
      for (const [i, g] of [[0, 'dum'], [2, 'tek'], [6, 'tek'], [8, 'dum'], [12, 'tek']] as const) darbuka(m, at(i), 0.9, g);
      for (const i of [4, 10, 14]) darbuka(m, at(i), 0.7, 'ka');
      for (const i of [3, 7, 11, 15]) if (R() < 0.5) darbuka(m, at(i), 0.5, 'ka');
      if (k % 4 === 3) for (const i of [13, 14, 15]) darbuka(m, at(i), 0.8, 'tek');
      if (k % 8 === 7) darbuka(m, at(15), 0.8, 'dum');
      m.drum('bombo', t0, 0.5); m.drum('bombo', at(8), 0.4);
      // riq: el pandero de sonajas en corcheas
      for (let i = 0; i < 16; i += 2) pandereta(m, at(i), i % 4 === 0 ? 0.18 : 0.1);
      // sagat: los platillitos de los dedos
      if (k >= 8) for (const i of [0, 3, 6]) for (const f of [3100, 4730]) m.add({ t: at(i), dur: 0.005, f, wave: 'sine', vol: 0.05, s: 1, r: 0.3 });
      if (k >= 8 && k < 16) { m.drum('palmas', at(4), 0.7); m.drum('palmas', at(12), 0.7); }
      if (k % 8 === 0) m.drum('platillo', t0, 0.35);
    },
  });
}

// ---------- Polo Norte: celesta, cascabeles de trineo y un colchón helado ----------

/** Celesta: barras de metal con martillos; seno con un brillo agudo que se apaga rápido. */
function celesta(m: Mixer, n: Nota, vol: number) {
  m.add({ t: n.t, dur: 0.02, f: n.f, wave: 'sine', vol, s: 1, r: Math.min(0.9, n.dur * 1.4 + 0.2) });
  m.add({ t: n.t, dur: 0.01, f: n.f * 4, wave: 'sine', vol: vol * 0.18, s: 1, r: 0.12 });
  m.add({ t: n.t, dur: 0.01, f: n.f * 2, wave: 'triangle', vol: vol * 0.15, s: 1, r: 0.25 });
}
/** Cascabeles de trineo: varias sonajas que suenan casi juntas, con dos tonos metálicos. */
function cascabeles(m: Mixer, t: number, vol: number, R: () => number) {
  for (let k = 0; k < 4; k++) m.add({ t: t + k * 0.007 + R() * 0.004, dur: 0.004, f: 9000, wave: 'noise', vol: vol * (1 - k * 0.15), s: 1, r: 0.05, hp: 0.85 });
  for (const f of [5300, 7100]) m.add({ t, dur: 0.005, f: f + R() * 500, wave: 'sine', vol: vol * 0.2, s: 1, r: 0.06 });
}

/** Polo Norte: Mi menor con celesta, campanitas, cascabeles, colchón frío y bajo que rebota; épico en el coro, 152 bpm. */
export function temaPoloNorte(): Float32Array {
  const a = ['B5 E6 G6 B6/2 A6 G6 F#6', 'E6/2 B5/2 G5/4', 'A5 C6 E6 A6/2 G6 F#6 E6', 'D#6/4 B5/4', 'G6 F#6 E6 D6 E6/2 B5/2', 'C6 D6 E6 G6 F#6/4', 'G6 A6 B6 A6 G6/2 F#6/2', 'E6/8'];
  const b = ['D6/2 G6/2 B6/3 A6', 'G6/2 F#6 E6 D6/4', 'E6/2 A6/2 C7/3 B6', 'A6/2 G6 F#6 G6/4', 'B6/2 A6 G6 F#6/2 E6 F#6', 'G6/2 F#6 E6 D#6/4', 'E6 F#6 G6 A6 B6/2 C7/2', 'B6/4 B5/4'];
  const ac = ['Em', 'C', 'Am', 'B7', 'C', 'D', 'Am', 'Em', 'G', 'D', 'C', 'G', 'Em', 'B7', 'C', 'B7'];
  return banda({
    bpm: 152, seed: 106, pasos: 8, porNegra: 2, melodia: [...a, ...b, ...a, ...b], eco: [0.2, 0.32, 0.4],
    toca: (m, n, k) => {
      celesta(m, n, 0.3);
      const coro = Math.floor(k / 8) % 2 === 1;
      // en el coro, el lead de cuadrada sostiene la melodía abajo (lo épico) y en la vuelta suman campanitas arriba
      if (coro) m.add({ t: n.t, dur: n.dur * 0.9, f: n.f / 2, wave: 'square', duty: 0.25, vol: 0.07, a: 0.02, s: 0.8, r: 0.08, lp: 0.4, vib: n.units >= 3 ? [5.5, 0.18, 0.15] : undefined });
      if (k >= 16) celesta(m, { ...n, f: n.f * 2 }, 0.08);
    },
    compas: (m, k, t0, e, R) => {
      const nom = ac[k % 16], r = raiz(nom, 2), coro = Math.floor(k / 8) % 2 === 1;
      // el colchón helado: sierras desafinadas muy filtradas que entran lento
      for (const f of acorde(nom, 3)) for (const d of [1, 1.006]) m.add({ t: t0, dur: e * 7.6, f: f * d, wave: 'saw', vol: 0.035, a: 0.4, s: 1, r: 0.45, lp: 0.05 });
      // el bajo que rebota: octavas cortas
      for (let i = 0; i < 8; i++) {
        const f = i % 2 ? r * 2 : r;
        m.add({ t: t0 + i * e, dur: e * 0.45, f, wave: 'triangle', vol: 0.3, s: 0.7, r: 0.04 });
        m.add({ t: t0 + i * e, dur: e * 0.4, f, wave: 'square', duty: 0.5, vol: 0.05, s: 0.6, r: 0.03, lp: 0.2 });
      }
      for (let i = 0; i < 8; i++) cascabeles(m, t0 + i * e, i % 2 ? 0.22 : 0.13, R);
      if (coro) for (let i = 0; i < 8; i++) cascabeles(m, t0 + (i + 0.5) * e, 0.08, R);
      m.drum('bombo', t0, 1); m.drum('bombo', t0 + 4 * e, 0.85);
      if (coro) m.drum('bombo', t0 + 3 * e, 0.6);
      m.drum('caja', t0 + 2 * e, coro ? 0.8 : 0.5); m.drum('caja', t0 + 6 * e, coro ? 0.8 : 0.5);
      if (coro && k % 2 === 1) for (const [i, v] of [[6, 0.6], [6.5, 0.7], [7, 0.85], [7.5, 0.95]]) m.drum('tom', t0 + i * e, v);
      if (k % 8 === 0) m.drum('platillo', t0, 0.55);
      // el viento del polo cada ocho compases
      if (k % 8 === 0) m.add({ t: t0, dur: 2, f: 700, wave: 'noise', vol: 0.1, a: 1, s: 1, r: 1.2, lp: 0.04, bend: { semis: 5, len: 2 } });
    },
  });
}

export const MUSIC_PELEA = {
  titulo: temaTitulo, selector: temaSelector, vs: temaVS, victoria: temaVictoria,
  caracas: temaCaracas, hochiminh: temaHoChiMinh, bogota: temaBogota, japon: temaJapon, celestial: temaCelestial,
  china: temaChina, italia: temaItalia, usa: temaUsa, brasil: temaBrasil, egipto: temaEgipto, polo_norte: temaPoloNorte,
};
/** las piezas que suenan en bucle */
export const BUCLE_PELEA = new Set(['titulo', 'selector', 'caracas', 'hochiminh', 'bogota', 'japon', 'celestial', 'china', 'italia', 'usa', 'brasil', 'egipto', 'polo_norte']);

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
  // lote E: los bonus (el carro y los barriles) y el luchador oscuro. La chapa y el vidrio son casi todo anillo y
  // quedaban bajos: suben al volumen medio de los golpes con la misma curva suave de los temas
  // la chapa del carro: la abolladura grave y el anillo metálico, parciales que no son armónicos en parejas que baten
  golpe_lata: () => aRms(efecto(1.1, 90, (m) => {
    m.add({ t: 0, dur: 0.02, f: 130, wave: 'sine', vol: 0.8, s: 1, r: 0.18, bend: { semis: -8, len: 0.12 } });
    m.add({ t: 0, dur: 0.015, f: 5000, wave: 'noise', vol: 0.7, s: 1, r: 0.06, hp: 0.3 });
    m.add({ t: 0, dur: 0.03, f: 1800, wave: 'noise', vol: 0.4, s: 1, r: 0.12, lp: 0.3 });
    m.add({ t: 0, dur: 0.04, f: 95, wave: 'square', duty: 0.3, vol: 0.2, s: 0.6, r: 0.2, lp: 0.15 });
    for (const [f, v, r] of [[310, 0.35, 0.7], [742, 0.3, 0.55], [1187, 0.22, 0.45], [1859, 0.16, 0.35], [2711, 0.12, 0.25], [3930, 0.08, 0.18]]) {
      m.add({ t: 0.002, dur: 0.01, f, wave: 'sine', vol: v, s: 1, r, bend: { semis: -0.3, len: r } });
      m.add({ t: 0.002, dur: 0.01, f: f * 1.013, wave: 'sine', vol: v * 0.7, s: 1, r: r * 0.9 });
    }
  }), -16.5),
  // el vidrio que estalla: el chasquido brillante y los pedazos que tintinean, cada vez más espaciados y más suaves
  vidrio: () => aRms(efecto(1.4, 91, (m, R) => {
    m.add({ t: 0, dur: 0.01, f: 9000, wave: 'noise', vol: 0.9, s: 1, r: 0.08, hp: 0.5 });
    m.add({ t: 0, dur: 0.02, f: 3000, wave: 'noise', vol: 0.4, s: 1, r: 0.15, hp: 0.3 });
    m.add({ t: 0, dur: 0.01, f: 180, wave: 'sine', vol: 0.35, s: 1, r: 0.07, bend: { semis: -6, len: 0.06 } });
    let t = 0.01;
    for (let k = 0; k < 34; k++) {
      const f = 2600 + R() * 5200, v = 0.28 * (1 - k / 40) * (0.5 + R() * 0.5);
      m.add({ t, dur: 0.004, f, wave: 'sine', vol: v, s: 1, r: 0.04 + R() * 0.12 });
      m.add({ t, dur: 0.004, f: f * 1.37, wave: 'sine', vol: v * 0.4, s: 1, r: 0.03 + R() * 0.05 });
      if (R() < 0.5) m.add({ t, dur: 0.003, f: 12000, wave: 'noise', vol: v * 0.6, s: 1, r: 0.015, hp: 0.7 });
      t += 0.008 + R() * 0.03 * (1 + k / 16);
    }
  }), -16.5),
  // el barril que se rompe: la duela que se raja, el hueco del barril, las astillas y las tablas que caen
  madera: () => efecto(1.2, 92, (m, R) => {
    m.add({ t: 0, dur: 0.02, f: 2500, wave: 'noise', vol: 0.9, s: 1, r: 0.07, lp: 0.45 });
    m.add({ t: 0, dur: 0.03, f: 150, wave: 'sine', vol: 0.7, s: 1, r: 0.16, bend: { semis: -7, len: 0.12 } });
    m.add({ t: 0.005, dur: 0.01, f: 420, wave: 'triangle', vol: 0.35, s: 1, r: 0.09 });
    for (let k = 0; k < 14; k++) {
      const t = 0.03 + R() * 0.35 * (k / 14 + 0.2), v = 0.4 + R() * 0.6;
      m.add({ t, dur: 0.004, f: 500 + R() * 1100, wave: 'sine', vol: 0.25 * v, s: 1, r: 0.03 + R() * 0.03 });
      m.add({ t, dur: 0.004, f: 3000 + R() * 3000, wave: 'noise', vol: 0.2 * v, s: 1, r: 0.02, lp: 0.5 });
    }
    for (const [t, f, v] of [[0.28, 260, 0.4], [0.42, 330, 0.3], [0.55, 220, 0.25]]) {
      m.add({ t, dur: 0.005, f, wave: 'triangle', vol: v, s: 1, r: 0.07 });
      m.add({ t, dur: 0.005, f: 1200, wave: 'noise', vol: v * 0.5, s: 1, r: 0.04, lp: 0.3 });
    }
  }),
  // teletransporte oscuro: el aire que se va por un agujero, dos sierras que se desfasan bajando y el zumbido de llegada
  teletransporte: () => efecto(1.1, 93, (m) => {
    m.add({ t: 0, dur: 0.35, f: 400, wave: 'noise', vol: 0.5, a: 0.25, s: 1, r: 0.04, lp: 0.08, bend: { semis: 19, len: 0.35 } });
    for (const [f, vib] of [[220, 9], [223.5, 7]]) m.add({ t: 0.05, dur: 0.5, f, wave: 'saw', vol: 0.3, a: 0.15, s: 0.9, r: 0.3, lp: 0.15, bend: { semis: -17, at: 0.25, len: 0.5 }, vib: [vib, 0.45, 0] });
    m.add({ t: 0.33, dur: 0.05, f: 1600, wave: 'sine', vol: 0.25, s: 1, r: 0.35, bend: { semis: -24, len: 0.4 } });
    m.add({ t: 0.35, dur: 0.3, f: 900, wave: 'noise', vol: 0.3, s: 0.8, r: 0.3, lp: 0.06, bend: { semis: -10, len: 0.5 } });
  }),
  // la furia oscura (el súper del malo): el aire que se junta, el estallido grave y el acorde maldito (segunda menor y tritono)
  furia_oscura: () => efecto(2.4, 94, (m) => {
    m.add({ t: 0, dur: 0.28, f: 300, wave: 'noise', vol: 0.35, a: 0.27, s: 1, r: 0.02, lp: 0.05, bend: { semis: 12, len: 0.28 } });
    m.add({ t: 0, dur: 0.28, f: 55, wave: 'saw', vol: 0.2, a: 0.27, s: 1, r: 0.02, lp: 0.1, bend: { semis: 7, len: 0.28 } });
    const T = 0.3;
    m.add({ t: T, dur: 0.05, f: 60, wave: 'sine', vol: 1, s: 1, r: 1.3, bend: { semis: -12, len: 1 } });
    m.add({ t: T, dur: 0.04, f: 3000, wave: 'noise', vol: 0.7, s: 1, r: 0.3, lp: 0.35 });
    m.add({ t: T, dur: 0.3, f: 150, wave: 'noise', vol: 0.6, s: 0.8, r: 1.4, lp: 0.03 });
    for (const n of ['A1', 'Bb1', 'Eb2', 'A2']) m.add({ t: T, dur: 0.6, f: hz(n), wave: 'saw', vol: 0.16, a: 0.01, d: 0.2, s: 0.7, r: 0.9, lp: 0.12, vib: [3, 0.25, 0.1] });
    m.add({ t: T, dur: 0.5, f: hz('A3'), wave: 'square', duty: 0.3, vol: 0.06, s: 0.7, r: 0.7, lp: 0.15, bend: { semis: -5, at: 0.1, len: 0.8 } });
  }),
};
