import { Mixer, seq, hz, rng, normalize, type Note } from './synth';
import { sinDC, terceraAbajo, escala, acorde, raiz, quinta, raspa, maraca, tambora, rasgueo, flauta, tiempo, efecto } from './mundos';

/**
 * Audio de los mundos de pelota (lote H3): un tema para Barranquilla, Margarita y Đà Lạt, y los efectos del vóley,
 * el básquet y la chapita. Cumbia de carnaval con caña de millo y papayera, música oriental margariteña con bandolina
 * y cuatro, y un vals lento de montaña con đàn tranh y sáo. Todo sintetizado con código, cada pieza con su semilla:
 * sale igual siempre. Los temas van en bucle sin corte (el mezclador da la vuelta) y en mono, como los de H2.
 */

type Nota = { t: number; dur: number; f: number; units: number };

// ---------- instrumentos ----------
/**
 * Caña de millo: la flauta de caña con lengüeta del Caribe colombiano. Nasal y aguda, con el soplo y el zumbido de
 * la garganta del que toca. Las notas largas llevan un trino corto al empezar (la nota de arriba y vuelta).
 */
function millo(m: Mixer, n: Nota, vol: number, trino: boolean) {
  const sube = n.f * Math.pow(2, 2 / 12);
  const t0 = trino ? n.t + 0.07 : n.t, dur = n.dur * 0.9 - (t0 - n.t);
  if (trino) {
    m.add({ t: n.t, dur: 0.03, f: n.f, wave: 'square', duty: 0.12, vol, a: 0.005, s: 1, r: 0.005, lp: 0.55 });
    m.add({ t: n.t + 0.035, dur: 0.03, f: sube, wave: 'square', duty: 0.12, vol, a: 0.003, s: 1, r: 0.005, lp: 0.55 });
  }
  m.add({ t: t0, dur, f: n.f, wave: 'square', duty: 0.12, vol, a: trino ? 0.004 : 0.01, d: 0.05, s: 0.85, r: 0.03, lp: 0.55, vib: n.units >= 2 ? [6.5, 0.16, 0.12] : undefined });
  m.add({ t: t0, dur, f: n.f * 1.002, wave: 'saw', vol: vol * 0.35, a: 0.01, s: 0.8, r: 0.03, lp: 0.3 });
  // el soplo y el zumbido
  m.add({ t: n.t, dur: n.dur * 0.85, f: 9000, wave: 'noise', vol: vol * 0.13, a: 0.01, d: 0.04, s: 0.55, r: 0.03, hp: 0.5, lp: 0.7 });
}
/** Trompeta de papayera: cuadrada que entra un pelo desde abajo, como el labio que busca la nota. */
function trompeta(m: Mixer, n: Nota, f: number, vol: number) {
  m.add({ t: n.t, dur: n.dur * 0.86, f: f / Math.pow(2, 0.7 / 12), wave: 'square', duty: 0.5, vol, a: 0.012, d: 0.07, s: 0.78, r: 0.05, lp: 0.5, bend: { semis: 0.7, len: 0.035 }, vib: n.units >= 3 ? [5.8, 0.15, 0.2] : undefined });
  m.add({ t: n.t, dur: n.dur * 0.86, f: f * 2, wave: 'saw', vol: vol * 0.18, a: 0.02, s: 0.7, r: 0.05, lp: 0.4 });
}
/** Trombón o bombardino: sierra opaca, con glissando cuando hace de puente. */
function trombon(m: Mixer, t: number, dur: number, f: number, vol: number, gliss = 0) {
  m.add({ t, dur, f, wave: 'saw', vol, a: 0.02, d: 0.08, s: 0.75, r: 0.06, lp: 0.2, bend: gliss ? { semis: gliss, at: dur * 0.3, len: dur * 0.6 } : undefined });
  m.add({ t, dur, f: f * 1.003, wave: 'square', duty: 0.4, vol: vol * 0.35, a: 0.02, s: 0.7, r: 0.06, lp: 0.15, bend: gliss ? { semis: gliss, at: dur * 0.3, len: dur * 0.6 } : undefined });
}
/** Tambor alegre: el que repica. Abierto (la nota que canta), tapado (la mano que apaga el parche) o quemado (el borde). */
function alegre(m: Mixer, t: number, vol: number, golpe: 'abierto' | 'tapado' | 'quemado') {
  if (golpe === 'abierto') {
    m.add({ t, dur: 0.015, f: 300, wave: 'sine', vol: vol * 0.7, s: 1, r: 0.15, bend: { semis: -2, len: 0.08 } });
    m.add({ t, dur: 0.004, f: 3000, wave: 'noise', vol: vol * 0.2, s: 1, r: 0.02, lp: 0.3 });
  } else if (golpe === 'tapado') {
    m.add({ t, dur: 0.01, f: 255, wave: 'sine', vol: vol * 0.55, s: 1, r: 0.04 });
    m.add({ t, dur: 0.004, f: 2500, wave: 'noise', vol: vol * 0.25, s: 1, r: 0.025, lp: 0.25 });
  } else {
    m.add({ t, dur: 0.004, f: 9000, wave: 'noise', vol: vol * 0.55, s: 1, r: 0.04, hp: 0.4, lp: 0.8 });
    m.add({ t, dur: 0.006, f: 520, wave: 'sine', vol: vol * 0.3, s: 1, r: 0.03 });
  }
}
/** Llamador: el tambor chico que marca el contratiempo, seco. */
const llamador = (m: Mixer, t: number, vol: number) => {
  m.add({ t, dur: 0.01, f: 240, wave: 'sine', vol, s: 1, r: 0.08, bend: { semis: -3, len: 0.06 } });
  m.add({ t, dur: 0.003, f: 4000, wave: 'noise', vol: vol * 0.3, s: 1, r: 0.015, lp: 0.4 });
};
/** Bandolina: cuerdas dobles punteadas, brillantes. Las notas largas en trémolo, la púa que va y viene. */
export function bandolina(m: Mixer, n: Nota, f: number, vol: number) {
  const paso = 0.068, golpes = n.units >= 2 ? Math.max(2, Math.floor((n.dur * 0.95) / paso)) : 1;
  for (let k = 0; k < golpes; k++) {
    const t = n.t + k * paso, ultimo = k === golpes - 1, d = ultimo ? n.dur * 0.95 - k * paso : paso;
    const v = vol * (k === 0 ? 1 : k % 2 ? 0.62 : 0.72);
    m.add({ t, dur: d, f, wave: 'pluck', vol: v, r: ultimo ? 0.1 : 0.012 });
    m.add({ t: t + 0.002, dur: d, f: f * 1.004, wave: 'pluck', vol: v * 0.6, r: ultimo ? 0.1 : 0.012 });
    m.add({ t, dur: 0.002, f: 12000, wave: 'noise', vol: v * 0.18, s: 1, r: 0.006, hp: 0.6 });
  }
}
/** Đàn tranh: cuerda punteada con "nhấn" (sube desde abajo doblando la cuerda) y vibrato en las notas largas. */
export function tranh(m: Mixer, n: Nota, vol: number, nhan: boolean) {
  m.add({ t: n.t, dur: n.dur, f: nhan ? n.f / Math.pow(2, 2 / 12) : n.f, wave: 'pluck', vol, r: 0.3, bend: nhan ? { semis: 2, at: 0.03, len: 0.1 } : undefined, vib: n.units >= 3 ? [5, 0.22, 0.35] : undefined });
}

// ---------- Barranquilla: cumbia de carnaval ----------
/**
 * `carnaval_quilla`: cumbia de carnaval en Sol mayor, 116 bpm, 16 compases (33.1 s). Primero la caña de millo lleva
 * el tema, con trinos, sobre el tambor alegre que repica, el llamador en los contratiempos, la tambora, el maracón y
 * la guacharaca. Después entra la papayera: dos trompetas en terceras, el trombón que contesta y hace de puente, el
 * bombo y el platillo de banda. El bajo hace "um-pa" de tuba en todo el tema.
 */
export function temaCarnaval(): Float32Array {
  const { e, bar } = tiempo(116, 8);
  const m = new Mixer(16 * bar, true, 301);
  const sc = escala('G', 'A', 'B', 'C', 'D', 'E', 'F#');
  const melody = [
    'D5 G5 G5/0.5 A5/0.5 B5 A5/2 G5/2', 'A5 B5 A5 G5 F#5/2 D5/2', 'E5 F#5 G5 A5 B5/2 A5 G5', 'A5/0.5 B5/0.5 A5 G5 F#5 G5/4',
    'D6 B5 D6 B5 A5/2 G5/2', 'A5 B5 C6 B5 A5/2 F#5/2', 'G5 A5 B5 G5 A5/0.5 B5/0.5 A5 G5 F#5', 'G5/4 D5 E5 F#5 A5',
    'B5/2 B5 C6 D6/2 B5/2', 'C6/2 A5 B5 C6/2 A5/2', 'F#5/2 A5 F#5 D5/2 F#5/2', 'G5/6 r/2',
    'D6/2 D6 C6 B5/2 G5/2', 'E6/2 D6 C6 A5/2 F#5/2', 'D6 C6 B5 A5 F#5/2 A5/2', 'G5/2 B5/2 D6/2 r/2',
  ];
  const chords = ['G', 'D7', 'D7', 'G', 'G', 'D7', 'D7', 'G', 'G', 'D7', 'D7', 'G', 'G', 'C', 'D7', 'G'];
  const R = rng(31);
  melody.forEach((txt, b) => {
    const t0 = b * bar, ch = chords[b], banda = b >= 8;
    for (const n of seq(txt, t0, e)) {
      if (!banda) millo(m, n, 0.16, n.units >= 2 && R() < 0.6);
      else {
        trompeta(m, n, n.f, 0.13);
        trompeta(m, n, terceraAbajo(n.f, sc), 0.07);
      }
    }
    // el millo sigue en la papayera, más suave: el acorde en corcheas de adorno
    if (banda) acorde(ch, 5).forEach((f, k) => millo(m, { t: t0 + (1 + 2 * k) * e, dur: e * 0.6, f, units: 1 }, 0.05, false));
    // trombón: contesta en los huecos de la trompeta y hace de puente al final de cada frase
    if (banda && (b === 11 || b === 15)) for (const [k, f, g] of [[4, quinta(ch, 2), 0], [5, raiz(ch, 3), 0], [6, quinta(ch, 2) * 2, -2]] as const) trombon(m, t0 + k * e, e * (g ? 1.8 : 0.85), f, 0.12, g);
    else if (banda) for (const k of [1, 5]) for (const f of acorde(ch, 3).slice(0, 2)) trombon(m, t0 + k * e, e * 0.4, f, 0.05);
    // bajo de tuba: raíz en el 1 y el 3, quinta de pique antes de cada uno
    const r2 = raiz(ch, 2), q = quinta(ch, 1);
    for (const [k, f, d] of [[0, r2, 1.6], [3, q, 0.8], [4, r2, 1.6], [7, q, 0.8]] as const) {
      m.add({ t: t0 + k * e, dur: e * d, f, wave: 'triangle', vol: 0.4, a: 0.006, s: 0.75, r: 0.05 });
      m.add({ t: t0 + k * e, dur: e * d, f, wave: 'saw', vol: 0.05, a: 0.006, s: 0.7, r: 0.05, lp: 0.15 });
    }
    // llamador en los contratiempos y tambora: parche en el 1 y el 3, palitos en el aro en el medio
    for (const k of [1, 3, 5, 7]) llamador(m, t0 + k * e, 0.3);
    tambora(m, t0, 0.75, 'parche'); tambora(m, t0 + 4 * e, 0.65, 'parche');
    for (const k of [2, 6]) tambora(m, t0 + k * e, 0.5, 'aro');
    if (b % 4 === 3) for (const k of [5, 5.5, 6, 6.5, 7, 7.5]) tambora(m, t0 + k * e, 0.4 + (k - 5) * 0.1, 'parche');
    // tambor alegre: repica en semicorcheas, siempre igual por la semilla
    for (let s = 0; s < 16; s++) {
      const p = s % 4 === 2 ? 0.85 : s % 4 === 0 ? 0.5 : 0.28, x = R();
      if (x < p) alegre(m, t0 + (s / 2) * e, s % 4 === 2 ? 0.55 : 0.4, s % 4 === 2 ? 'abierto' : x < p * 0.45 ? 'quemado' : 'tapado');
    }
    // maracón en cada corchea, con el acento en el contratiempo, y la guacharaca larga en cada tiempo
    for (let k = 0; k < 8; k++) maraca(m, t0 + k * e, k % 2 ? 0.16 : 0.09);
    for (let beat = 0; beat < 4; beat++) raspa(m, t0 + beat * 2 * e, e * 0.8, 0.07, { paso: 0.012 });
    // la papayera: bombo en el 1 y el 3, platillo de banda apagado en el 2 y el 4, redoblante de pique
    if (banda) {
      m.drum('bombo_banda', t0, 0.8); m.drum('bombo_banda', t0 + 4 * e, 0.7);
      for (const k of [2, 6]) m.add({ t: t0 + k * e, dur: 0.02, f: 9000, wave: 'noise', vol: 0.16, s: 1, r: 0.16, hp: 0.7 });
      for (const k of [3, 3.5, 7]) m.drum('caja_banda', t0 + k * e, 0.55);
    }
    if (b === 8 || b === 0) m.drum('platillo', t0, b === 8 ? 0.7 : 0.4);
  });
  m.echo(0.13, 0.18, 0.28);
  return normalize(sinDC(m.out(), true));
}

// ---------- Margarita: música oriental ----------
/**
 * `playa_margarita`: música oriental margariteña en 3/4 a 144, 32 compases (40 s). Primero un polo en Mi menor:
 * la bandolina canta en trémolo, el cuatro rasguea y la guitarra hace los bordones. Después un galerón en Sol mayor,
 * más vivo, con el cuatro que apaga y las maracas en 6/8. La segunda vez de cada parte, la bandolina va en terceras.
 * Debajo, las olas que van y vienen cada dos compases.
 */
export function temaMargarita(): Float32Array {
  const { e, bar } = tiempo(144, 6);
  const m = new Mixer(32 * bar, true, 302);
  const polo = ['B4 E5 G5 B5/2 A5', 'G5 F#5 E5/2 B4/2', 'C5 E5 A5 C6/2 B5', 'A5 G5 F#5/2 E5/2', 'F#5 A5 B5 D#6/2 B5', 'C6 B5 A5/2 F#5/2', 'G5 B5 E6/2 D#6 E6', 'B5/4 r/2'];
  const galeron = ['D5 G5 B5 D6/2 B5', 'C6 B5 A5 G5/2 D5', 'F#5 A5 D6 C6/2 A5', 'B5 A5 G5 F#5/2 A5', 'C6 A5 F#5 D5/2 F#5', 'A5 C6 B5 A5/2 F#5', 'G5 B5 D6 G6/2 D6', 'D#6 F#6 B5/2 A5/2'];
  const melody = [...polo, ...polo, ...galeron, ...galeron];
  const cP = ['Em', 'Em', 'Am', 'Am', 'B7', 'B7', 'Em', 'Em'], cG = ['G', 'G', 'D7', 'D7', 'D7', 'D7', 'G', 'B7'];
  const chords = [...cP, ...cP, ...cG, ...cG];
  const scE = escala('E', 'F#', 'G', 'A', 'B', 'C', 'D#'), scG = escala('G', 'A', 'B', 'C', 'D', 'E', 'F#');
  melody.forEach((txt, b) => {
    const t0 = b * bar, ch = chords[b], gal = b >= 16, segunda = (b >= 8 && b < 16) || b >= 24;
    // bandolina, y en la segunda vez la tercera de abajo
    for (const n of seq(txt, t0, e)) {
      bandolina(m, n, n.f, 0.2);
      if (segunda) bandolina(m, n, terceraAbajo(n.f, gal ? scG : scE), 0.1);
    }
    // el silencio del final del polo lo llena la guitarra con un bordón que baja a la tónica
    if (b === 7 || b === 15) ['A3', 'G3', 'F#3'].forEach((x, k) => m.add({ t: t0 + (4 + k * 0.67) * e, dur: e * 0.6, f: hz(x), wave: 'pluck', vol: 0.26, r: 0.08 }));
    // guitarra: bordones, raíz en el 1, quinta en el 2 y la octava en el 3
    const r2 = raiz(ch, 2);
    for (const [k, f, v] of [[0, r2, 0.34], [2, quinta(ch, 2), 0.24], [4, r2 * 2, 0.2]] as const) {
      m.add({ t: t0 + k * e, dur: e * 1.7, f, wave: 'pluck', vol: v, r: 0.12 });
      m.add({ t: t0 + k * e, dur: e * 1.5, f, wave: 'triangle', vol: v * 0.5, a: 0.004, s: 0.6, r: 0.08 });
    }
    // cuatro: el polo rasguea en los tres tiempos y apaga el último; el galerón apaga en el 2 y el 5
    const cuatro = acorde(ch, 4).slice(0, 3).concat(acorde(ch, 3)[1]).sort((a, c) => a - c);
    const golpes: [number, boolean][] = gal ? [[0, false], [1, true], [2, false], [3, false], [4, true], [5, false]] : [[0, false], [2, false], [4, false], [5, true]];
    for (const [k, ap] of golpes) rasgueo(m, t0 + k * e, cuatro, gal ? 0.075 : 0.085, ap);
    // maracas: en el polo, los tres tiempos; en el galerón, todas las corcheas con el 6/8 (1 y 4)
    for (let k = 0; k < 6; k++) maraca(m, t0 + k * e, gal ? (k % 3 === 0 ? 0.17 : 0.08) : k % 2 === 0 ? 0.13 : 0.045);
    // las olas: suben y bajan cada dos compases
    if (b % 2 === 0) {
      m.add({ t: t0, dur: bar * 0.8, f: 2600, wave: 'noise', vol: 0.11, a: bar * 0.7, d: 0.3, s: 0.7, r: bar * 1.1, lp: 0.05 });
      m.add({ t: t0 + bar * 0.6, dur: bar * 0.3, f: 9000, wave: 'noise', vol: 0.025, a: bar * 0.25, s: 1, r: bar * 0.8, hp: 0.5, lp: 0.6 });
    }
  });
  m.echo(0.16, 0.22, 0.32);
  return normalize(sinDC(m.out(), true));
}

// ---------- Đà Lạt: vals de montaña ----------
/**
 * `dalat_niebla`: vals lento de montaña en Fa mayor, 3/4 a 96, 20 compases (37.5 s). El đàn tranh lleva el tema con
 * su "nhấn" y abre cada frase con el barrido de cuerdas. En la segunda parte canta la sáo y el đàn tranh arpegia. Bajo
 * en el 1 y el acorde punteado en el 2 y el 3, un colchón suave como la niebla y el viento en los pinos.
 */
export function temaDalat(): Float32Array {
  const { e, bar } = tiempo(96, 6);
  const m = new Mixer(20 * bar, true, 303);
  const melody = [
    'C5/2 F5/2 G5 A5', 'G5/4 F5 D5', 'C5/2 D5/2 F5 G5', 'A5/4 G5 A5', 'D6/2 C6/2 A5 C6', 'G5/4 A5 G5', 'F5/2 D5/2 C5 D5', 'F5/4 A4 C5',
    'A5/3 C6 D6/2', 'C6/4 A5/2', 'G5/3 A5 C6/2', 'C6/6', 'D6/3 F6 D6/2', 'C6/3 A5 G5/2', 'A5/3 G5 F5/2', 'G5/6',
    'C5/2 F5/2 G5 A5', 'C6/4 A5 G5', 'F5/2 G5/2 A5 D5', 'C5/4 G4 A4',
  ];
  const chords = ['F', 'Dm', 'Bb', 'F', 'Dm', 'C', 'Bb', 'F', 'Dm', 'Am', 'Bb', 'F', 'Bb', 'F', 'Dm', 'C', 'F', 'Am', 'Bb', 'C'];
  const R = rng(33);
  const cuerdas = ['F4', 'G4', 'A4', 'C5', 'D5', 'F5', 'G5'].map(hz);
  melody.forEach((txt, b) => {
    const t0 = b * bar, ch = chords[b], sao = b >= 8 && b < 16;
    for (const n of seq(txt, t0, e)) {
      if (sao) flauta(m, n, 0.17, n.units >= 2 && R() < 0.5);
      else tranh(m, n, 0.3, n.units >= 2 && R() < 0.55);
    }
    // el barrido de cuerdas del đàn tranh al abrir cada frase de cuatro compases
    if (b % 4 === 0 && !sao) cuerdas.forEach((f, k) => m.add({ t: t0 - 0.2 + k * 0.026, dur: 0.12, f, wave: 'pluck', vol: 0.05 + k * 0.012, r: 0.2 }));
    // con la sáo, el đàn tranh arpegia el acorde en corcheas; en la última parte, la sáo sostiene notas del acorde
    if (sao) acorde(ch, 4).concat(acorde(ch, 5)[0], acorde(ch, 4)[1], acorde(ch, 4)[2]).slice(0, 6).forEach((f, k) => m.add({ t: t0 + k * e, dur: e * 1.5, f, wave: 'pluck', vol: k ? 0.08 : 0.11, r: 0.2 }));
    if (b >= 16) m.add({ t: t0, dur: bar * 0.92, f: acorde(ch, 4)[1], wave: 'sine', vol: 0.07, a: 0.3, s: 0.85, r: 0.25, vib: [4.5, 0.12, 0.5] });
    // el vals: bajo en el 1, acorde punteado en el 2 y el 3
    const r2 = raiz(ch, 2);
    m.add({ t: t0, dur: e * 1.8, f: r2, wave: 'pluck', vol: 0.3, r: 0.2 });
    m.add({ t: t0, dur: e * 1.8, f: r2, wave: 'triangle', vol: 0.16, a: 0.01, s: 0.6, r: 0.15 });
    for (const k of [2, 4]) acorde(ch, 4).forEach((f, j) => m.add({ t: t0 + k * e + j * 0.012, dur: e * 1.2, f, wave: 'pluck', vol: 0.05, r: 0.15 }));
    // la niebla: un colchón muy suave con el acorde
    for (const f of acorde(ch, 3)) m.add({ t: t0, dur: bar, f, wave: 'triangle', vol: 0.045, a: 0.5, d: 0.2, s: 0.9, r: 0.45, lp: 0.25 });
    // el viento en los pinos, cada cuatro compases
    if (b % 4 === 2) m.add({ t: t0, dur: bar * 1.2, f: 3500, wave: 'noise', vol: 0.06, a: bar * 1.2, s: 1, r: bar * 1.6, lp: 0.035 });
  });
  m.echo(0.3, 0.33, 0.45);
  return normalize(sinDC(m.out(), true));
}

export const MUSIC_PELOTA = {
  carnaval_quilla: temaCarnaval,
  playa_margarita: temaMargarita,
  dalat_niebla: temaDalat,
};

// ---------- efectos ----------
const N = (m: Mixer, n: Note) => m.add(n);
/** Metal que suena: parciales inarmónicos que se apagan, los agudos antes. */
function metal(m: Mixer, t: number, parciales: [number, number][], vol: number, cola: number) {
  parciales.forEach(([f, v], k) => N(m, { t, dur: 0.004, f, wave: 'sine', vol: vol * v, s: 1, r: cola / (1 + k * 0.6), vib: [7 + k, 0.03, 0] }));
}

/** El aro y el tablero: el golpe del balón en el tablero y el aro que suena, igual en la canasta y en el fallo. */
function aro(m: Mixer, t: number, vol: number, cola: number) {
  // el tablero: un "toc" grave de madera con el balón que se aplasta
  N(m, { t, dur: 0.012, f: 150, wave: 'sine', vol: 0.8 * vol, s: 1, r: 0.12, bend: { semis: -4, len: 0.08 } });
  N(m, { t, dur: 0.008, f: 340, wave: 'triangle', vol: 0.3 * vol, s: 1, r: 0.05 });
  N(m, { t, dur: 0.006, f: 2000, wave: 'noise', vol: 0.45 * vol, s: 1, r: 0.04, lp: 0.2 });
  // el aro de hierro: golpe y anillo
  N(m, { t: t + 0.06, dur: 0.003, f: 16000, wave: 'noise', vol: 0.4 * vol, s: 1, r: 0.015, hp: 0.5 });
  metal(m, t + 0.06, [[610, 0.45], [1590, 0.42], [2730, 0.3], [3920, 0.16]], vol, cola);
}

export const SFX_PELOTA = {
  /** La pelota contra la red de vóley (0.4 s): el golpe sordo, la malla que se sacude y la cuerda de arriba que vibra. */
  red_voley: () => efecto(0.7, 51, (m, R) => {
    N(m, { t: 0, dur: 0.012, f: 135, wave: 'sine', vol: 0.65, s: 1, r: 0.09, bend: { semis: -4, len: 0.06 } });
    N(m, { t: 0, dur: 0.01, f: 3000, wave: 'noise', vol: 0.6, s: 1, r: 0.06, lp: 0.18 });
    // la malla: roces que se repiten cada vez más suaves mientras la red se sacude
    for (let k = 0; k < 8; k++) {
      const t = 0.02 + k * 0.045 + R() * 0.012, v = 0.55 * Math.pow(0.76, k);
      N(m, { t, dur: 0.015, f: 7000, wave: 'noise', vol: v, a: 0.008, s: 1, r: 0.035, hp: 0.35, lp: 0.45 });
    }
    // la cuerda de arriba, tensa: un "frum" grave que tiembla
    N(m, { t: 0.01, dur: 0.05, f: 92, wave: 'triangle', vol: 0.45, a: 0.01, s: 1, r: 0.32, vib: [11, 0.6, 0] });
    N(m, { t: 0.01, dur: 0.03, f: 184, wave: 'sine', vol: 0.15, s: 1, r: 0.18, vib: [11, 0.6, 0] });
  }),
  /** Rebote del balón de básquet en el cemento (0.3 s): el chasquido del piso y el "pung" hueco del balón. */
  rebote_balon: () => efecto(0.5, 52, (m) => {
    N(m, { t: 0, dur: 0.003, f: 18000, wave: 'noise', vol: 0.75, s: 1, r: 0.012, hp: 0.45 });
    N(m, { t: 0, dur: 0.015, f: 196, wave: 'sine', vol: 1, s: 1, r: 0.26, bend: { semis: -3, len: 0.12 } });
    N(m, { t: 0, dur: 0.01, f: 415, wave: 'triangle', vol: 0.3, s: 1, r: 0.08, bend: { semis: -2, len: 0.06 } });
    N(m, { t: 0, dur: 0.004, f: 1060, wave: 'sine', vol: 0.18, s: 1, r: 0.05 });
    N(m, { t: 0, dur: 0.006, f: 2500, wave: 'noise', vol: 0.4, s: 1, r: 0.03, lp: 0.25 });
  }),
  /** Canasta (0.67 s): el balón contra el tablero, el aro de hierro que suena y el "swish" de la red al pasar. */
  aro_basket: () => efecto(1.3, 53, (m) => {
    aro(m, 0, 0.85, 0.55);
    // el balón cae por la red: "shhhuip", de opaco a brillante y se apaga
    N(m, { t: 0.2, dur: 0.16, f: 5000, wave: 'noise', vol: 0.5, a: 0.08, d: 0.06, s: 0.8, r: 0.3, hp: 0.45, lp: 0.7, bend: { semis: 14, len: 0.2 } });
    N(m, { t: 0.25, dur: 0.08, f: 12000, wave: 'noise', vol: 0.18, a: 0.04, s: 1, r: 0.22, hp: 0.7 });
  }),
  /** El tiro que pega en el aro y se sale (0.5 s): tablero, aro, y el segundo toque del balón en el aro al rebotar. */
  aro_fallo: () => efecto(0.9, 54, (m) => {
    aro(m, 0, 1, 0.4);
    N(m, { t: 0.17, dur: 0.003, f: 16000, wave: 'noise', vol: 0.25, s: 1, r: 0.012, hp: 0.5 });
    // otro punto del aro: los mismos modos un poco corridos, así no se cancelan con el primero y baten
    metal(m, 0.17, [[652, 0.4], [1655, 0.36], [2840, 0.25]], 0.7, 0.3);
  }),
  /** La chapa golpeada por el palo de escoba (0.25 s): el "toc" de la madera, el "tin" de la lata y la chapa que sale silbando. */
  chapa: () => efecto(0.6, 55, (m) => {
    N(m, { t: 0, dur: 0.006, f: 540, wave: 'sine', vol: 0.55, s: 1, r: 0.045, bend: { semis: -3, len: 0.04 } });
    N(m, { t: 0, dur: 0.004, f: 820, wave: 'triangle', vol: 0.22, s: 1, r: 0.03 });
    N(m, { t: 0, dur: 0.004, f: 6000, wave: 'noise', vol: 0.45, s: 1, r: 0.02, lp: 0.45 });
    metal(m, 0.002, [[3150, 0.42], [4870, 0.3], [7230, 0.2], [9400, 0.1]], 0.9, 0.16);
    // los dientes de la chapa que tiemblan y el silbido de la chapa que se va
    for (let k = 0; k < 4; k++) N(m, { t: 0.03 + k * 0.022, dur: 0.002, f: 15000, wave: 'noise', vol: 0.16 * Math.pow(0.7, k), s: 1, r: 0.008, hp: 0.6 });
    N(m, { t: 0.02, dur: 0.08, f: 9000, wave: 'noise', vol: 0.1, a: 0.02, s: 1, r: 0.14, hp: 0.65, bend: { semis: -10, len: 0.2 } });
  }),
};
