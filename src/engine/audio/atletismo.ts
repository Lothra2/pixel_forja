import { Mixer, seq, rng, normalize } from './synth';
import { sinDC, terceraAbajo, escala, acorde, raiz, quinta, maraca, rasgueo, tiempo, efecto } from './mundos';
import type { Note } from './synth';
import { bandolina, tranh } from './pelota';

/**
 * Audio de los mundos de las pruebas de atletismo y natación (lote H4): un tema para Cartagena (Azoteas), el Eje
 * Cafetero (Vallas), la bahía de Hạ Long (Natación) y los Llanos de Apure (Jabalina). Champeta de picó, bambuco
 * acelerado con tiple y bandola, el canto de los remeros de Hạ Long con đàn bầu y un pajarillo llanero con arpa y
 * bandola. Todo sintetizado con código, cada pieza con su semilla: sale igual siempre. Los temas van en bucle sin
 * corte (el mezclador da la vuelta) y en mono, como los de H2 y H3. Y los efectos de la natación y la garrocha
 * (lote H5): el chapuzón de la salida, la brazada, la bocina de la salida de natación y la garrocha que se clava y se
 * dobla.
 */

type Nota = { t: number; dur: number; f: number; units: number };

// ---------- instrumentos ----------
/** Cucharas: las dos cucharas de palo del bambuco, un clic seco de madera con un roce. */
function cucharas(m: Mixer, t: number, vol: number) {
  m.add({ t, dur: 0.004, f: 1800, wave: 'sine', vol: vol * 0.6, s: 1, r: 0.025 });
  m.add({ t, dur: 0.004, f: 7000, wave: 'noise', vol: vol * 0.35, s: 1, r: 0.02, hp: 0.6 });
}
/** Tiple: el acorde de las cuerdas dobles y la octava de arriba, más brillante que el cuatro. */
function tiple(m: Mixer, t: number, ch: string, vol: number, apagado = false) {
  const n = acorde(ch, 4).slice(0, 3).concat(acorde(ch, 5)[0]).sort((a, c) => a - c);
  rasgueo(m, t, n, vol, apagado);
  if (!apagado) n.forEach((f, k) => m.add({ t: t + 0.004 + k * 0.007, dur: 0.12, f: f * 2, wave: 'pluck', vol: vol * 0.25, r: 0.1 }));
}
/** Guitarra eléctrica limpia de la champeta: punteo brillante, con un poco de filo. */
function guitarraPicao(m: Mixer, t: number, dur: number, f: number, vol: number) {
  m.add({ t, dur, f, wave: 'pluck', vol, r: 0.07 });
  m.add({ t, dur: dur * 0.8, f, wave: 'saw', vol: vol * 0.22, a: 0.002, d: 0.05, s: 0.3, r: 0.04, lp: 0.45 });
}
/**
 * Đàn bầu: la cuerda sola de Vietnam. Se toca en armónicos, así que suena casi puro, y la vara que dobla la cuerda
 * hace que cada nota entre deslizándose y que las largas canten con un vibrato ancho. `luyen`: la nota sube o baja
 * al final hacia la siguiente, como el "luyến" del đàn bầu.
 */
function danBau(m: Mixer, n: Nota, vol: number, desde: number, luyen = 0) {
  const sus = n.units >= 2, dur = n.dur * 0.92;
  const bend = luyen ? { semis: luyen, at: dur * 0.6, len: dur * 0.3 } : desde ? { semis: -desde, len: 0.09 } : undefined;
  const f0 = desde && !luyen ? n.f * Math.pow(2, desde / 12) : n.f;
  m.add({ t: n.t, dur, f: f0, wave: 'sine', vol, a: 0.012, d: 0.25, s: 0.55, r: 0.18, bend, vib: sus ? [5.5, 0.35, 0.18] : undefined });
  m.add({ t: n.t, dur, f: f0 * 2, wave: 'triangle', vol: vol * 0.16, a: 0.01, d: 0.12, s: 0.3, r: 0.12, bend, vib: sus ? [5.5, 0.35, 0.18] : undefined });
  // el golpe de la púa en la cuerda
  m.add({ t: n.t, dur: 0.003, f: 5000, wave: 'noise', vol: vol * 0.08, s: 1, r: 0.012, hp: 0.5 });
}
/** Trống cơm: el tambor de arroz, afinado, que canta un poco al golpearlo. */
function trongCom(m: Mixer, t: number, vol: number, alto = false) {
  m.add({ t, dur: 0.015, f: alto ? 230 : 150, wave: 'sine', vol, s: 1, r: 0.2, bend: { semis: -3, len: 0.12 } });
  m.add({ t, dur: 0.004, f: 1800, wave: 'noise', vol: vol * 0.25, s: 1, r: 0.02, lp: 0.3 });
}
/** El remo que entra al agua: un chapoteo grave y la gota que salpica. */
function remo(m: Mixer, t: number, vol: number) {
  m.add({ t, dur: 0.06, f: 1200, wave: 'noise', vol, a: 0.01, d: 0.08, s: 0.4, r: 0.18, lp: 0.08 });
  m.add({ t: t + 0.05, dur: 0.02, f: 6000, wave: 'noise', vol: vol * 0.25, a: 0.005, s: 1, r: 0.08, hp: 0.5, lp: 0.7 });
}
/** Bandola llanera: cuatro cuerdas con púa, seca y mordida, sin trémolo. */
function bandolaLlanera(m: Mixer, t: number, dur: number, f: number, vol: number) {
  m.add({ t, dur, f, wave: 'pluck', vol, r: 0.05 });
  m.add({ t, dur: Math.min(dur, 0.09), f, wave: 'saw', vol: vol * 0.3, a: 0.002, s: 0.5, r: 0.03, lp: 0.5 });
  m.add({ t, dur: 0.002, f: 9000, wave: 'noise', vol: vol * 0.2, s: 1, r: 0.006, hp: 0.6 });
}

// ---------- Eje Cafetero: bambuco acelerado ----------
/**
 * `cafe_neblina`: bambuco acelerado en La mayor, 6/8 a 124 negras con puntillo, 32 compases (31 s). La bandola
 * andina canta en trémolo y entra a contratiempo, como en el bambuco. El tiple rasguea y adelanta el acorde que viene
 * en la última corchea, la guitarra hace los bordones alternando 3/4 y 6/8, y las cucharas no paran. La segunda
 * parte se va a Fa sostenido menor, y en la segunda vez de cada parte la bandola va en terceras. Debajo, la neblina:
 * un colchón muy suave en la parte en menor.
 */
export function temaBambuco(): Float32Array {
  const { e, bar } = tiempo(124, 6, 3);
  const m = new Mixer(32 * bar, true, 401);
  const A = ['r E5 A5 C#6/2 B5', 'A5 G#5 F#5/2 E5/2', 'r D5 G#5 B5/2 A5', 'G#5 F#5 E5/2 D5/2', 'r B4 E5 G#5/2 B5', 'D6 C#6 B5/2 G#5/2', 'A5 C#6 E6/2 C#6 A5', 'E5/4 r/2'];
  const A2 = [...A.slice(0, 6), 'A5 C#6 B5/2 G#5 E5', 'A5/4 r/2'];
  const B = ['r C#5 F#5 A5/2 G#5', 'F#5 E#5 F#5/2 C#5/2', 'r B4 E#5 G#5/2 B5', 'A5 G#5 E#5/2 C#5/2', 'r C#5 E#5 G#5/2 B5', 'A5 G#5 F#5/2 E#5/2', 'F#5 A5 C#6/2 A5 F#5', 'C#5/4 r/2'];
  const B2 = ['r D5 F#5 B5/2 A5', 'G#5 F#5 D5/2 B4/2', 'r C#5 F#5 A5/2 C#6', 'B5 A5 F#5/2 C#5/2', 'r E#5 G#5 B5/2 D6', 'C#6 B5 G#5/2 E#5/2', 'F#5 A5 C#6/2 B5 A5', 'G#5 B5 D6/2 E5/2'];
  const melody = [...A, ...A2, ...B, ...B2];
  const cA = ['A', 'A', 'E7', 'E7', 'E7', 'E7', 'A', 'A'];
  const cB = ['F#m', 'F#m', 'C#7', 'C#7', 'C#7', 'C#7', 'F#m', 'F#m'], cB2 = ['Bm', 'Bm', 'F#m', 'F#m', 'C#7', 'C#7', 'F#m', 'E7'];
  const chords = [...cA, ...cA, ...cB, ...cB2];
  const scA = escala('A', 'B', 'C#', 'D', 'E', 'F#', 'G#'), scF = escala('F#', 'G#', 'A', 'B', 'C#', 'D', 'E#');
  melody.forEach((txt, b) => {
    const t0 = b * bar, ch = chords[b], sig = chords[(b + 1) % chords.length], menor = b >= 16, segunda = (b >= 8 && b < 16) || b >= 24;
    // la bandola, y en la segunda vez de cada parte la tercera de abajo
    for (const n of seq(txt, t0, e)) {
      bandolina(m, n, n.f, 0.19);
      if (segunda) bandolina(m, n, terceraAbajo(n.f, menor ? scF : scA), 0.09);
    }
    // el tiple: rasguea en el 1 y el 3, apaga en el 4 y adelanta el acorde que viene en la última corchea
    tiple(m, t0, ch, 0.1); tiple(m, t0 + 2 * e, ch, 0.075); tiple(m, t0 + 3 * e, ch, 0.07, true); tiple(m, t0 + 5 * e, sig, 0.09);
    // la guitarra: bordones que alternan 3/4 (1, 3 y 5) y 6/8 (1 y 4), la hemiola del bambuco
    const r2 = raiz(ch, 2), golpes: [number, number][] = b % 2 ? [[0, r2], [3, quinta(ch, 1) * 2]] : [[0, r2], [2, quinta(ch, 1) * 2], [4, r2 * 2]];
    for (const [k, f] of golpes) {
      m.add({ t: t0 + k * e, dur: e * 1.6, f, wave: 'pluck', vol: k ? 0.24 : 0.3, r: 0.12 });
      m.add({ t: t0 + k * e, dur: e * 1.4, f, wave: 'triangle', vol: k ? 0.12 : 0.15, a: 0.004, s: 0.6, r: 0.08 });
    }
    // las cucharas: todas las corcheas, con el acento en el 1, el 3 y el 6
    for (let k = 0; k < 6; k++) cucharas(m, t0 + k * e, k === 0 ? 0.32 : k === 2 || k === 5 ? 0.24 : 0.12);
    // la neblina: en la parte en menor, un colchón muy suave con el acorde
    if (menor) for (const f of acorde(ch, 3)) m.add({ t: t0, dur: bar, f, wave: 'triangle', vol: 0.035, a: 0.4, d: 0.2, s: 0.9, r: 0.4, lp: 0.2 });
  });
  m.echo(0.15, 0.2, 0.3);
  return normalize(sinDC(m.out(), true));
}

// ---------- Cartagena: champeta ----------
/**
 * `champeta_murallas`: champeta criolla en Mi mayor, 132 bpm, 20 compases (36.4 s). Cuatro compases de entrada, ocho
 * con la guitarra que canta el tema en terceras sobre los acordes cortos del teclado, y ocho de "despeluque": la
 * guitarra repite su punteo en semicorcheas, el bajo se mueve más y la batería se llena. El bajo va adelante, como
 * suena en un picó, y el láser del picó baja al entrar cada parte.
 */
export function temaChampeta(): Float32Array {
  const { e, bar } = tiempo(132, 8);
  const m = new Mixer(20 * bar, true, 402);
  const sc = escala('E', 'F#', 'G#', 'A', 'B', 'C#', 'D#');
  const tema = ['G#5 B5 E6/2 D#6 E6 B5/2', 'G#5/2 F#5 E5 F#5/2 G#5/2', 'A5 C#6 E6/2 C#6 A5 C#6/2', 'B5/2 A5 G#5 A5/4', 'F#5 A5 B5/2 D#6 B5 A5 F#5', 'D#5/2 F#5/2 A5/2 G#5 F#5', 'E5 G#5 B5 E6/2 B5 G#5 E5', 'E6/3 r B5 G#5 B5/2'];
  const cIntro = ['E', 'A', 'B7', 'E'], cTema = ['E', 'E', 'A', 'A', 'B7', 'B7', 'E', 'E'];
  const chords = [...cIntro, ...cTema, ...cIntro, ...cIntro];
  for (let b = 0; b < 20; b++) {
    const t0 = b * bar, ch = chords[b], conTema = b >= 4 && b < 12, despeluque = b >= 12;
    // el tema: la guitarra canta y la segunda guitarra la sigue una tercera abajo
    if (conTema) for (const n of seq(tema[b - 4], t0, e)) {
      guitarraPicao(m, n.t, n.dur * 0.85, n.f, 0.27);
      guitarraPicao(m, n.t, n.dur * 0.85, terceraAbajo(n.f, sc), 0.13);
    }
    // el punteo: el arpegio del acorde en semicorcheas, arriba y abajo; en el despeluque, más fuerte y una octava arriba
    const ac = acorde(ch, 4), arp = [ac[0], ac[1], ac[2], ac[0] * 2, ac[2], ac[1], ac[2], ac[0] * 2];
    for (let k = 0; k < 16; k++) {
      if (conTema && k % 2 === 0) continue;
      const f = arp[k % 8] * (despeluque && b % 2 ? 2 : 1);
      guitarraPicao(m, t0 + (k * e) / 2, e * 0.4, f, despeluque ? (k % 4 === 0 ? 0.13 : 0.09) : 0.07);
    }
    // el teclado: acordes cortos en los contratiempos mientras canta la guitarra
    if (conTema) for (const k of [1, 3, 5, 7]) for (const f of acorde(ch, 4)) m.add({ t: t0 + k * e, dur: e * 0.35, f, wave: 'square', duty: 0.3, vol: 0.035, a: 0.003, s: 0.6, r: 0.03, lp: 0.35 });
    // el bajo: adelante y bailando (raíz, quinta y la tercera que sube a la raíz)
    const r1 = raiz(ch, 2), q = quinta(ch, 1) * 2, t3 = acorde(ch, 2)[1];
    const bajo: [number, number, number][] = despeluque ? [[0, r1, 1.5], [1.5, r1, 0.5], [2, q, 1], [3, r1 * 2, 1], [4, r1, 1.5], [5.5, t3, 0.5], [6, q, 1], [7, t3, 1]] : [[0, r1, 1.5], [1.5, r1, 0.5], [3, q, 1], [4, r1, 1.5], [6, t3, 1], [7, q, 1]];
    for (const [k, f, d] of bajo) {
      m.add({ t: t0 + k * e, dur: d * e * 0.85, f, wave: 'triangle', vol: 0.26, a: 0.004, s: 0.8, r: 0.04 });
      m.add({ t: t0 + k * e, dur: d * e * 0.85, f, wave: 'saw', vol: 0.05, a: 0.004, s: 0.7, r: 0.04, lp: 0.18 });
    }
    // la batería: bombo en las negras, palmas y caja en el 2 y el 4, charles en semicorcheas con el acento a contratiempo
    for (const k of [0, 2, 4, 6]) m.drum('bombo', t0 + k * e, k ? 0.8 : 1);
    if (despeluque) { m.drum('bombo', t0 + 3.5 * e, 0.55); m.drum('bombo', t0 + 7.5 * e, 0.55); }
    for (const k of [2, 6]) { m.drum('caja', t0 + k * e, 0.7); m.drum('palmas', t0 + k * e, 0.8); }
    for (let k = 0; k < 16; k++) m.drum('charles', t0 + (k * e) / 2, k % 4 === 2 ? 0.9 : k % 2 ? 0.35 : 0.55);
    if (despeluque && b % 4 === 3) for (const k of [6, 6.5, 7, 7.5]) m.drum('tom', t0 + k * e, 0.55);
    // el láser del picó al entrar cada parte
    if (b === 0 || b === 4 || b === 12) m.add({ t: t0, dur: 0.35, f: 2400, wave: 'square', duty: 0.25, vol: 0.06, a: 0.003, s: 0.8, r: 0.06, lp: 0.6, bend: { semis: -30, len: 0.35 } });
    if (b % 4 === 0) m.drum('platillo', t0, b === 12 ? 0.6 : 0.35);
  }
  m.echo(0.11, 0.18, 0.25);
  return normalize(sinDC(m.out(), true));
}

// ---------- Hạ Long: los remeros ----------
/**
 * `halong_remos`: el canto de los remeros de la bahía de Hạ Long, en Sol menor pentatónico, 108 bpm, 16 compases
 * (35.6 s). Primero el đàn bầu lleva el tema, con sus notas que entran deslizándose y su vibrato ancho. Después el
 * "hò": el đàn bầu llama y el coro de los remeros contesta. Debajo, el đàn tranh repite su figura, el trống cơm marca
 * la remada en el 1 y el 3, con el remo que entra al agua, y el mõ de madera en los contratiempos. Las olas van y
 * vienen cada dos compases.
 */
export function temaHaLong(): Float32Array {
  const { e, bar } = tiempo(108, 8);
  const m = new Mixer(16 * bar, true, 403);
  const R = rng(43);
  const A = ['D5/3 F5 G5/2 F5 D5', 'C5/2 Bb4 C5 D5/4', 'F5/3 G5 Bb5/2 G5 F5', 'G5/6 F5 D5', 'Bb5/3 C6 D6/2 C6 Bb5', 'G5/2 F5 G5 C5/4', 'D5 F5 G5 Bb5 G5/2 F5 D5', 'G4/6 Bb4 C5'];
  // el hò: el đàn bầu llama (compases impares) y el coro contesta (pares)
  const B = ['G5/2 Bb5/2 C6/3 Bb5', 'G5 G5 F5 D5/4 r', 'D6/2 C6 Bb5 G5/3 F5', 'G5 G5 F5 G5/4 r', 'F5/2 G5 Bb5 C6/2 D6/2', 'C6 Bb5 G5 F5 G5/4', 'D5 F5 G5 Bb5 C6 Bb5 G5 F5', 'G5/4 D5/2 F5/2'];
  const melody = [...A, ...B];
  const chords = ['Gm', 'Gm', 'Bb', 'Bb', 'F', 'F', 'Gm', 'Gm', 'Cm', 'Cm', 'Gm', 'Gm', 'F', 'F', 'Gm', 'Gm'];
  melody.forEach((txt, b) => {
    const t0 = b * bar, ch = chords[b], hoCoro = b >= 8 && b % 2 === 1 && b < 12;
    const notas = seq(txt, t0, e);
    notas.forEach((n, i) => {
      if (hoCoro) {
        // el coro: varias voces al unísono, un pelo desafinadas, y la octava de abajo
        for (const [d, v] of [[1, 0.1], [1.006, 0.08], [0.995, 0.07]] as const) m.add({ t: n.t, dur: n.dur * 0.85, f: n.f * d, wave: 'square', duty: 0.5, vol: v, a: 0.03, d: 0.08, s: 0.75, r: 0.08, lp: 0.3, vib: n.units >= 3 ? [5, 0.15, 0.2] : undefined });
        m.add({ t: n.t, dur: n.dur * 0.85, f: n.f / 2, wave: 'triangle', vol: 0.12, a: 0.03, s: 0.8, r: 0.08 });
        return;
      }
      // el đàn bầu: unas notas entran desde arriba o abajo, y la larga que va a otra se desliza al final
      const sig = notas[i + 1], desde = n.units >= 2 && R() < 0.5 ? (R() < 0.5 ? -2 : 2) : 0;
      const luyen = n.units >= 3 && sig && R() < 0.4 ? Math.round(12 * Math.log2(sig.f / n.f)) : 0;
      danBau(m, n, 0.32, desde, Math.abs(luyen) <= 3 ? luyen : 0);
    });
    // el đàn tranh: raíz, quinta, octava y quinta en corcheas, que no para
    const r3 = raiz(ch, 3), fig = [r3, quinta(ch, 3), r3 * 2, quinta(ch, 3)];
    for (let k = 0; k < 8; k++) tranh(m, { t: t0 + k * e, dur: e * 0.9, f: fig[k % 4] * (k >= 4 && b % 2 ? 2 : 1), units: 1 }, k % 4 === 0 ? 0.12 : 0.08, false);
    // el bajo: la raíz larga, como un bordón
    m.add({ t: t0, dur: bar * 0.95, f: raiz(ch, 2), wave: 'triangle', vol: 0.24, a: 0.02, d: 0.3, s: 0.6, r: 0.2 });
    // la remada: el trống cơm y el remo en el 1 y el 3, el golpe chico en el 4 y el mõ en los contratiempos
    trongCom(m, t0, 0.5); trongCom(m, t0 + 4 * e, 0.42); trongCom(m, t0 + 3 * e, 0.22, true); trongCom(m, t0 + 7 * e, 0.22, true);
    remo(m, t0 + 0.04, 0.16); remo(m, t0 + 4 * e + 0.04, 0.13);
    for (const k of [1, 3, 5, 7]) m.drum('madera', t0 + k * e, b >= 8 ? 0.55 : 0.4);
    // las olas, cada dos compases
    if (b % 2 === 0) m.add({ t: t0, dur: bar * 0.7, f: 2200, wave: 'noise', vol: 0.1, a: bar * 0.6, d: 0.3, s: 0.7, r: bar * 1.0, lp: 0.05 });
  });
  m.echo(0.24, 0.3, 0.4);
  return normalize(sinDC(m.out(), true));
}

// ---------- Llanos de Apure: pajarillo ----------
/**
 * `pajarillo_llano`: un pajarillo, joropo recio en Si menor, a 196, 40 compases (36.7 s). El arpa lleva el tema con
 * sus corridas, la bandola llanera hace el pespunteo y en la parte en Mi menor toma el tema mientras el arpa bordonea.
 * El cuatro rasguea con el golpe recio, y los bajos del arpa alternan el 3/4 y el 6/8. Las maracas van "escobilladas"
 * en semicorcheas. Más rápido, en menor y con bandola: no se confunde con `pana_dale`, el joropo de Caracas.
 */
export function temaPajarillo(): Float32Array {
  const { e, bar } = tiempo(196, 6);
  const m = new Mixer(40 * bar, true, 404);
  const sc = escala('B', 'C#', 'D', 'E', 'F#', 'G', 'A#');
  const A = ['F#5 B5 D6 F#6 D6 B5', 'C#6 B5 A#5/2 F#5/2', 'C#6 E6 C#6 A#5 F#5 A#5', 'C#6 A#5 F#5/2 E5/2', 'E5 F#5 A#5 C#6 E6 C#6', 'A#5 C#6 F#6/2 E6/2', 'D6 C#6 B5 A#5 B5 D6', 'B5/4 F#5/2'];
  const B = ['G5 B5 E6 B5 G5 E5', 'F#5 G5 B5/2 E5/2', 'F#5 B5 D6 B5 F#5 D5', 'C#5 D5 F#5/2 B4/2', 'A#4 C#5 E5 F#5 A#5 C#6', 'E6 C#6 A#5/2 F#5/2', 'B5 D6 F#6 D6 B5 F#5', 'B5/4 r/2'];
  // partes: A con el arpa, A con la bandola en terceras, B con la bandola, B con el arpa, y A con las dos
  const partes: ('arpa' | 'terceras' | 'bandola' | 'dos')[] = ['arpa', 'terceras', 'bandola', 'arpa', 'dos'];
  const melody = [...A, ...A, ...B, ...B, ...A];
  const cA = ['Bm', 'Bm', 'F#7', 'F#7', 'F#7', 'F#7', 'Bm', 'Bm'], cB = ['Em', 'Em', 'Bm', 'Bm', 'F#7', 'F#7', 'Bm', 'Bm'];
  const chords = [...cA, ...cA, ...cB, ...cB, ...cA];
  melody.forEach((txt, b) => {
    const t0 = b * bar, ch = chords[b], parte = partes[Math.floor(b / 8)];
    for (const n of seq(txt, t0, e)) {
      if (parte !== 'bandola') m.add({ t: n.t, dur: n.dur, f: n.f, wave: 'pluck', vol: 0.3, r: 0.2 });
      if (parte === 'terceras') bandolaLlanera(m, n.t, n.dur * 0.8, terceraAbajo(n.f, sc) / 2, 0.16);
      if (parte === 'bandola' || parte === 'dos') bandolaLlanera(m, n.t, n.dur * 0.8, n.f / 2, parte === 'dos' ? 0.14 : 0.24);
    }
    // el pespunteo de la bandola: notas del acorde en el 2, 3, 5 y 6 cuando no lleva el tema
    if (parte === 'arpa') { const ac = acorde(ch, 4); [1, 2, 4, 5].forEach((k, j) => bandolaLlanera(m, t0 + k * e, e * 0.7, ac[j % ac.length], 0.08)); }
    // cuando la bandola canta, el arpa bordonea en corcheas con el acorde
    if (parte === 'bandola') { const ac = acorde(ch, 4); for (let k = 0; k < 6; k++) m.add({ t: t0 + k * e, dur: e * 1.2, f: ac[k % 3] * (k >= 3 ? 2 : 1), wave: 'pluck', vol: 0.11, r: 0.15 }); }
    // los bajos del arpa: en 3/4 (1, 3 y 5) un compás y en 6/8 (1 y 4) el otro
    const r2 = raiz(ch, 2), q = quinta(ch, 1) * 2;
    const bajos: [number, number][] = b % 2 ? [[0, r2], [3, q]] : [[0, r2], [2, q], [4, r2]];
    for (const [k, f] of bajos) {
      m.add({ t: t0 + k * e, dur: e * 1.5, f, wave: 'pluck', vol: k ? 0.3 : 0.34, r: 0.18 });
      m.add({ t: t0 + k * e, dur: e * 1.3, f, wave: 'triangle', vol: 0.18, a: 0.004, s: 0.6, r: 0.08 });
    }
    // el cuatro: el golpe recio, rasgueo fuerte en el 1 y el 4, y apagado en el 3 y el 6
    const cuatro = acorde(ch, 4).slice(0, 3).concat(acorde(ch, 3)[1]).sort((a, c) => a - c);
    for (const [k, v, ap] of [[0, 0.11, false], [1, 0.07, false], [2, 0.09, true], [3, 0.11, false], [4, 0.07, false], [5, 0.09, true]] as const) rasgueo(m, t0 + k * e, cuatro, v, ap);
    // las maracas escobilladas: semicorcheas, con el acento en cada corchea y más fuerte en el 1 y el 4
    for (let k = 0; k < 12; k++) maraca(m, t0 + (k * e) / 2, k % 2 ? 0.06 : k % 6 === 0 ? 0.2 : 0.13);
  });
  m.echo(0.1, 0.18, 0.25);
  return normalize(sinDC(m.out(), true));
}

export const MUSIC_ATLETISMO = {
  champeta_murallas: temaChampeta,
  cafe_neblina: temaBambuco,
  halong_remos: temaHaLong,
  pajarillo_llano: temaPajarillo,
};

// ---------- efectos de la natación y la garrocha (lote H5) ----------
const N = (m: Mixer, n: Note) => m.add(n);
/** Burbujas: "blup" cortos que suben de tono, cada vez más suaves. */
function burbujas(m: Mixer, R: () => number, t0: number, t1: number, n: number, vol: number, f0 = 320) {
  for (let k = 0; k < n; k++) {
    const t = t0 + (t1 - t0) * (k / n) + R() * 0.02, f = f0 + R() * f0 * 1.6, v = vol * (0.55 + R() * 0.45) * Math.pow(0.8, k);
    N(m, { t, dur: 0.012, f, wave: 'sine', vol: v, a: 0.002, s: 1, r: 0.03, bend: { semis: 7 + R() * 5, len: 0.03 } });
  }
}
/** Gotas que caen de vuelta al agua: tics agudos y sueltos. */
function gotas(m: Mixer, R: () => number, t0: number, t1: number, n: number, vol: number) {
  for (let k = 0; k < n; k++) {
    const t = t0 + R() * (t1 - t0), v = vol * (0.4 + R() * 0.6) * (1 - (t - t0) / (t1 - t0) * 0.6);
    N(m, { t, dur: 0.002, f: 12000, wave: 'noise', vol: v, s: 1, r: 0.012, hp: 0.6 });
    N(m, { t, dur: 0.006, f: 1400 + R() * 1800, wave: 'sine', vol: v * 0.5, s: 1, r: 0.02, bend: { semis: 5, len: 0.015 } });
  }
}

export const SFX_ATLETISMO = {
  /**
   * El chapuzón de la salida (0.9 s): el cuerpo que pega plano contra el agua, el agua que se abre con un "shhh" grave,
   * las burbujas que suben y las gotas que caen de vuelta. Va en el evento `impacto` de `dive`.
   */
  chapuzon: () => efecto(1.3, 61, (m, R) => {
    N(m, { t: 0, dur: 0.012, f: 4000, wave: 'noise', vol: 1, s: 1, r: 0.07, lp: 0.55 });
    N(m, { t: 0, dur: 0.02, f: 95, wave: 'sine', vol: 0.9, s: 1, r: 0.16, bend: { semis: -7, len: 0.12 } });
    N(m, { t: 0.01, dur: 0.12, f: 1500, wave: 'noise', vol: 0.75, a: 0.02, d: 0.1, s: 0.5, r: 0.3, lp: 0.12 });
    N(m, { t: 0.03, dur: 0.1, f: 6000, wave: 'noise', vol: 0.35, a: 0.02, s: 0.6, r: 0.25, hp: 0.35, lp: 0.6 });
    // el agua que se vuelve a juntar debajo, mientras suben las burbujas y caen las gotas
    N(m, { t: 0.15, dur: 0.35, f: 800, wave: 'noise', vol: 0.18, a: 0.05, d: 0.2, s: 0.6, r: 0.25, lp: 0.06 });
    burbujas(m, R, 0.08, 0.55, 14, 0.4);
    gotas(m, R, 0.18, 0.8, 22, 0.35);
  }),
  /**
   * Una brazada de crol (0.35 s): la mano que entra al agua ("plof"), el jalón que empuja el agua y dos o tres burbujas.
   * Corta y sin cola, para que se pueda tocar en cada brazada sin taparse (el juego le puede variar el `rate`).
   */
  brazada: () => efecto(0.6, 62, (m, R) => {
    N(m, { t: 0, dur: 0.01, f: 2500, wave: 'noise', vol: 0.8, a: 0.004, s: 1, r: 0.06, lp: 0.35 });
    N(m, { t: 0, dur: 0.015, f: 160, wave: 'sine', vol: 0.45, s: 1, r: 0.07, bend: { semis: -5, len: 0.05 } });
    N(m, { t: 0.05, dur: 0.1, f: 900, wave: 'noise', vol: 0.4, a: 0.04, d: 0.05, s: 0.6, r: 0.12, lp: 0.07 });
    burbujas(m, R, 0.06, 0.22, 3, 0.25, 420);
    gotas(m, R, 0.08, 0.3, 5, 0.2);
  }),
  /**
   * La bocina electrónica de la salida de natación (0.6 s): el "biiip" áspero del sistema de salida, con el zumbido
   * del parlante. Distinta del ¡YA! de las otras pruebas, para que se reconozca la piscina.
   */
  salida_natacion: () => efecto(0.9, 63, (m) => {
    const dur = 0.5;
    N(m, { t: 0, dur, f: 830, wave: 'square', duty: 0.42, vol: 0.55, a: 0.006, s: 1, r: 0.05, lp: 0.6, vib: [55, 0.12, 0] });
    N(m, { t: 0, dur, f: 1245, wave: 'saw', vol: 0.3, a: 0.006, s: 1, r: 0.05, lp: 0.5 });
    N(m, { t: 0, dur, f: 415, wave: 'square', duty: 0.5, vol: 0.18, a: 0.006, s: 1, r: 0.05, lp: 0.4 });
    N(m, { t: 0, dur: 0.02, f: 6000, wave: 'noise', vol: 0.25, s: 1, r: 0.02, hp: 0.4 });
  }),
  /**
   * La garrocha (0.7 s): la punta que se clava en la cajita con un golpe de metal, la pértiga de fibra que se dobla
   * con un "uuum" que sube, y el latigazo cuando se endereza y suelta al atleta. Va en el evento `despegue` de
   * `pole_vault`: el latigazo cae 1/3 s después, justo en `suelta` (4 cuadros a 12 fps).
   */
  garrocha: () => efecto(1.2, 64, (m) => {
    const SUELTA = 4 / 12;
    N(m, { t: 0, dur: 0.008, f: 3000, wave: 'noise', vol: 0.7, s: 1, r: 0.04, lp: 0.4 });
    N(m, { t: 0, dur: 0.015, f: 120, wave: 'sine', vol: 0.7, s: 1, r: 0.1, bend: { semis: -4, len: 0.06 } });
    [[880, 0.4], [2310, 0.32], [3730, 0.2], [5200, 0.1]].forEach(([f, v], k) => N(m, { t: 0, dur: 0.003, f, wave: 'sine', vol: v, s: 1, r: 0.18 / (1 + k * 0.6) }));
    // la pértiga que se dobla: un tono grave que sube, con el crujido de la fibra
    N(m, { t: 0.03, dur: 0.27, f: 70, wave: 'triangle', vol: 0.55, a: 0.05, s: 0.9, r: 0.08, bend: { semis: 14, len: 0.29 }, vib: [9, 0.25, 0.05] });
    N(m, { t: 0.03, dur: 0.27, f: 140, wave: 'saw', vol: 0.12, a: 0.07, s: 0.8, r: 0.08, lp: 0.15, bend: { semis: 14, len: 0.29 } });
    N(m, { t: 0.05, dur: 0.24, f: 2500, wave: 'noise', vol: 0.12, a: 0.08, s: 0.7, r: 0.06, hp: 0.3, lp: 0.45 });
    // el latigazo al enderezarse: un "fiuu" que sube y se va, con el "tung" de la pértiga
    N(m, { t: SUELTA, dur: 0.12, f: 5000, wave: 'noise', vol: 0.5, a: 0.04, s: 0.8, r: 0.2, hp: 0.45, lp: 0.75, bend: { semis: 12, len: 0.15 } });
    N(m, { t: SUELTA, dur: 0.02, f: 210, wave: 'triangle', vol: 0.35, s: 1, r: 0.25, vib: [14, 0.4, 0] });
  }),
};
