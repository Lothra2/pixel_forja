import { Mixer, seq, hz, normalize, trimTail } from './synth';
import { renderSfx, RATE } from './sfx';
import { sinDC, terceraAbajo, escala, acorde, raiz, quinta, raspa, maraca, tambora, rasgueo, flauta, furro, powerChord, tiempo } from './mundos';
import { tranh } from './pelota';

/**
 * Los acordes de victoria de los 6 equipos (lote H7): `acorde_<equipo>`, 4 compases cortos (entre 3 y 5 s) con lo
 * que suena el equipo cuando gana. Cada uno en el estilo de su gente:
 * - `acorde_familia`: fanfarria de la Familia GG en Sol mayor con cuatro venezolano, que cierra con "Sol-Sol" (GG) y
 *   el ladrido de Thor.
 * - `acorde_instituto`: rock japonés de los 80 en La menor, como `tema_instituto`, que remata en La mayor.
 * - `acorde_rong`: đàn tranh que sube en pentatónica, tambores de festival y el gong del Rồng Sài Gòn.
 * - `acorde_rolos`: torbellino andino de los Rolos de Chapinero, con tiple y quena.
 * - `acorde_panas`: joropo de Los Panas de Caracas: arpa, cuatro y maracas, como `pana_dale`.
 * - `acorde_maracuchos`: gaita zuliana de los Maracuchos del Lago, con furro, tambora y charrasca, como `gaita_lago`.
 * No van en bucle. Cada uno sale igual siempre.
 */

const fin = (m: Mixer) => trimTail(normalize(sinDC(m.out(), false)));
/** Lead en cuadrada con su vibrato en las notas largas. */
function lead(m: Mixer, n: { t: number; dur: number; f: number; units: number }, vol: number, duty = 0.5, lp = 0.5) {
  m.add({ t: n.t, dur: n.dur * 0.9, f: n.f, wave: 'square', duty, vol, a: 0.008, d: 0.05, s: 0.8, r: n.units >= 3 ? 0.35 : 0.06, lp, vib: n.units >= 3 ? [5.5, 0.22, 0.15] : undefined });
}
/** El gong del festival: los parciales del metal que se apagan despacio. */
function gong(m: Mixer, t: number, f: number, vol: number) {
  for (const [k, a, r] of [[1, 1, 2.2], [1.47, 0.5, 1.8], [2.09, 0.4, 1.4], [2.56, 0.3, 1.1], [3.14, 0.2, 0.8]] as const)
    m.add({ t, dur: 0.01, f: f * k, wave: 'sine', vol: vol * a, a: 0.004, s: 1, r, vib: [3 + k, 0.08, 0] });
  m.add({ t, dur: 0.01, f: 2400, wave: 'noise', vol: vol * 0.25, s: 1, r: 0.25, lp: 0.2 });
}

/** Familia GG: fanfarria en Sol mayor con el cuatro, que remata con dos Sol (G, G) y el ladrido de Thor. */
export function acordeFamilia(): Float32Array {
  const { e, bar } = tiempo(144, 4), m = new Mixer(4 * bar + 1.4, false, 401);
  const sc = escala('G', 'A', 'B', 'C', 'D', 'E', 'F#');
  // redoble de entrada
  for (let k = 0; k < 4; k++) m.drum('caja_banda', k * (e / 2), 0.3 + k * 0.12);
  const t0 = e * 2;
  const melodia = ['D5 G5 B5 D6', 'C6/2 B5 A5', 'B5 G5 A5 F#5', 'G5 G6/7'];
  const acordes = ['G', 'C', 'D', 'G'];
  melodia.forEach((txt, b) => {
    const tb = t0 + b * bar, ch = acordes[b], ultimo = b === 3;
    for (const n of seq(txt, tb, e)) { lead(m, n, 0.2); m.add({ t: n.t, dur: n.dur * 0.9, f: terceraAbajo(n.f, sc), wave: 'square', duty: 0.25, vol: 0.09, a: 0.008, s: 0.8, r: n.units >= 3 ? 0.35 : 0.06, lp: 0.45 }); }
    // el cuatro: rasgueo en cada corchea, con el apagado en el contratiempo; en el final, un solo rasgueo largo
    const cuatro = acorde(ch, 4).slice(0, 3).concat(acorde(ch, 3)[1]).sort((a, c) => a - c);
    if (ultimo) { rasgueo(m, tb, cuatro, 0.13); rasgueo(m, tb + e, cuatro, 0.14); }
    else for (let k = 0; k < 4; k++) rasgueo(m, tb + k * e, cuatro, 0.11, k % 2 === 1);
    // bajo y batería
    m.add({ t: tb, dur: ultimo ? bar * 1.6 : e * 1.6, f: raiz(ch, 2), wave: 'triangle', vol: 0.36, a: 0.005, s: 0.8, r: ultimo ? 0.5 : 0.08 });
    if (!ultimo) m.add({ t: tb + 2 * e, dur: e * 1.6, f: quinta(ch, 1), wave: 'triangle', vol: 0.3, a: 0.005, s: 0.8, r: 0.08 });
    m.drum('bombo_banda', tb, 0.9);
    if (!ultimo) m.drum('caja_banda', tb + 2 * e, 0.7);
  });
  m.drum('platillo', t0 + 3 * bar + e, 0.8);
  // Thor celebra
  const guau = renderSfx('ladrido'), tg = Math.round((t0 + 3 * bar + 4.6 * e) * RATE);
  const out = m.out();
  for (let i = 0; i < guau.length && tg + i < out.length; i++) out[tg + i] += guau[i] * 1.1;
  return fin(m);
}

/** Instituto Nekketsu: rock japonés de los 80, power chords en La menor, Fa y Sol, y el remate en La mayor con el solo. */
export function acordeInstituto(): Float32Array {
  const { e, bar } = tiempo(152, 4), m = new Mixer(4 * bar + 1.2, false, 402);
  const raices = ['A2', 'F2', 'G2', 'A2'];
  const melodia = ['A5 C6 E6 A6', 'G6/2 F6 E6', 'D6 E6 F6 G6', 'A6/6'];
  melodia.forEach((txt, b) => {
    const tb = b * bar, ultimo = b === 3, root = hz(raices[b]);
    if (ultimo) powerChord(m, tb, root, bar * 1.4, 0.13, true);
    else for (let k = 0; k < 4; k++) powerChord(m, tb + k * e, root, e * 0.7, 0.12);
    for (const n of seq(txt, tb, e)) {
      m.add({ t: n.t, dur: n.dur * 0.92, f: ultimo ? n.f / Math.pow(2, 1 / 12) : n.f, wave: 'square', duty: 0.35, vol: 0.16, a: 0.004, d: 0.05, s: 0.85, r: ultimo ? 0.4 : 0.05, lp: 0.42, bend: ultimo ? { semis: 1, at: 0.02, len: 0.08 } : undefined, vib: ultimo ? [6.5, 0.35, 0.3] : undefined });
      m.add({ t: n.t, dur: n.dur * 0.92, f: n.f * 1.004, wave: 'saw', vol: 0.05, a: 0.004, s: 0.8, r: ultimo ? 0.4 : 0.05, lp: 0.3 });
    }
    // la tercera mayor en el remate: La mayor
    if (ultimo) m.add({ t: tb, dur: bar * 1.4, f: hz('C#5'), wave: 'square', duty: 0.3, vol: 0.06, a: 0.01, s: 0.8, r: 0.4, lp: 0.35 });
    m.add({ t: tb, dur: ultimo ? bar * 1.4 : bar * 0.9, f: root, wave: 'triangle', vol: 0.3, a: 0.004, s: 0.8, r: 0.1 });
    // batería de rock: bombo y caja, con el redoble antes del remate
    m.drum('bombo', tb, 1);
    if (!ultimo) { m.drum('caja', tb + 2 * e, 0.9); m.drum('bombo', tb + 3 * e, 0.6); }
    for (let k = 0; k < 4 && !ultimo; k++) m.drum('charles', tb + k * e, 0.5);
    if (b === 2) for (let k = 0; k < 4; k++) m.drum('tom', tb + 2 * e + k * (e / 2), 0.6 + k * 0.1);
  });
  m.drum('platillo', 3 * bar, 1);
  return fin(m);
}

/** Rồng Sài Gòn: el đàn tranh sube en pentatónica de Sol, los tambores del festival y el gong. */
export function acordeRong(): Float32Array {
  const { e, bar } = tiempo(120, 4), m = new Mixer(4 * bar + 2, false, 403);
  // la subida del đàn tranh, en semicorcheas
  seq('G4 A4 B4 D5 E5 G5 A5 B5', 0, e / 2).forEach((n) => tranh(m, n, 0.28, false));
  const melodia = ['D6/2 B5 A5', 'G5 E5 D5 E5', 'G5/4'];
  melodia.forEach((txt, b) => {
    const tb = (b + 1) * bar;
    seq(txt, tb, e).forEach((n, k) => { tranh(m, n, 0.3, k === 0 && n.units >= 2); flauta(m, n, 0.12); });
  });
  // el bajo del đàn tranh
  for (const [t, n] of [[0, 'G2'], [bar, 'D3'], [2 * bar, 'C3'], [3 * bar, 'G2']] as const) m.add({ t, dur: bar * 0.9, f: hz(n), wave: 'pluck', vol: 0.3, r: 0.4 });
  // los tambores del festival: golpe en cada tiempo y repique antes del gong
  for (let b = 0; b < 3; b++) for (let k = 0; k < 4; k += 2) m.drum('tom', b * bar + k * e, k === 0 ? 0.8 : 0.55);
  for (let k = 0; k < 6; k++) m.drum('tom', 2 * bar + 2 * e + k * (e / 3), 0.4 + k * 0.08);
  for (let b = 0; b < 3; b++) for (let k = 1; k < 4; k += 2) m.drum('madera', b * bar + k * e, 0.5);
  gong(m, 3 * bar, 98, 0.5);
  m.drum('bombo_banda', 3 * bar, 0.9);
  return fin(m);
}

/** Rolos de Chapinero: torbellino andino en Re mayor, 3/4: el tiple rasgueado, la quena y el bombo. */
export function acordeRolos(): Float32Array {
  const { e, bar } = tiempo(168, 6), m = new Mixer(4 * bar + 1.3, false, 404);
  const melodia = ['F#5 A5 D6 A5 F#5 A5', 'E5 G5 C#6 B5 A5 G5', 'F#5 E5 D5 E5 G5 E5', 'D5/6'];
  const acordes = ['D', 'A7', 'A7', 'D'];
  melodia.forEach((txt, b) => {
    const tb = b * bar, ch = acordes[b], ultimo = b === 3;
    // la quena: aire y vibrato en la nota larga
    for (const n of seq(txt, tb, e)) flauta(m, n, 0.16, n.units >= 2);
    // el tiple: cuerdas en octavas, rasgueo en cada negra con el "chas" apagado en el tercer tiempo
    const tiple = acorde(ch, 4).slice(0, 3).flatMap((f) => [f, f * 2]);
    if (ultimo) rasgueo(m, tb, tiple, 0.09);
    else for (let k = 0; k < 3; k++) rasgueo(m, tb + 2 * k * e, tiple, 0.08, k === 2);
    // el bombo andino en el uno y el bajo de la guitarra
    m.drum('bombo_banda', tb, ultimo ? 0.9 : 0.7);
    m.add({ t: tb, dur: ultimo ? bar : e * 1.8, f: raiz(ch, 2), wave: 'pluck', vol: 0.32, r: ultimo ? 0.6 : 0.15 });
    if (!ultimo) m.add({ t: tb + 4 * e, dur: e * 1.8, f: quinta(ch, 1) * 2, wave: 'pluck', vol: 0.24, r: 0.15 });
    // el chucho (la sonaja) en cada corchea
    for (let k = 0; k < 6 && !ultimo; k++) maraca(m, tb + k * e, k % 2 ? 0.06 : 0.1);
  });
  return fin(m);
}

/** Los Panas de Caracas: joropo en Re mayor, 3/4 a 180: arpa con su bordón, cuatro y maracas, y el remate seco. */
export function acordePanas(): Float32Array {
  const { e, bar } = tiempo(180, 6), m = new Mixer(4 * bar + 1, false, 405);
  const sc = escala('D', 'E', 'F#', 'G', 'A', 'B', 'C#');
  const melodia = ['A5 F#5 D5 F#5 A5 D6', 'F#6 E6 D6 C#6 B5 A5', 'G5 B5 E6 C#6 A5 G5', 'F#5 A5 D6/4'];
  const acordes = ['D', 'D', 'A7', 'D'];
  melodia.forEach((txt, b) => {
    const tb = b * bar, ch = acordes[b], ultimo = b === 3;
    for (const n of seq(txt, tb, e)) {
      m.add({ t: n.t, dur: n.dur, f: n.f, wave: 'pluck', vol: 0.3, r: n.units >= 3 ? 0.5 : 0.2 });
      if (b >= 2) m.add({ t: n.t, dur: n.dur, f: terceraAbajo(n.f, sc), wave: 'pluck', vol: 0.14, r: n.units >= 3 ? 0.5 : 0.2 });
    }
    // bordón del arpa: raíz en el 2 y quinta en el 3
    m.add({ t: tb + 2 * e, dur: e * 1.8, f: raiz(ch, 2), wave: 'pluck', vol: 0.36, r: 0.2 });
    if (!ultimo) m.add({ t: tb + 4 * e, dur: e * 1.8, f: quinta(ch, 1) * 2, wave: 'pluck', vol: 0.3, r: 0.2 });
    else m.add({ t: tb + 2 * e, dur: e * 4, f: raiz(ch, 1) * 2, wave: 'triangle', vol: 0.25, a: 0.004, s: 0.7, r: 0.3 });
    // cuatro: rasgueo en el 1 y el 4, apagado en el último
    const cuatro = acorde(ch, 4).slice(0, 3).concat(acorde(ch, 3)[1]).sort((a, c) => a - c);
    rasgueo(m, tb, cuatro, 0.11);
    if (!ultimo) { rasgueo(m, tb + 3 * e, cuatro, 0.11); rasgueo(m, tb + 5 * e, cuatro, 0.1, true); }
    else rasgueo(m, tb + 2 * e, cuatro, 0.13);
    // maracas: todas las corcheas, y en el remate se callan de golpe
    const acentos = b % 2 ? [1, 0.4, 0.7, 1, 0.4, 0.7] : [1, 0.4, 1, 0.4, 1, 0.5];
    if (!ultimo) acentos.forEach((v, k) => { maraca(m, tb + k * e, 0.2 * v); maraca(m, tb + (k + 0.5) * e, 0.07); });
    else { maraca(m, tb, 0.25); maraca(m, tb + 2 * e, 0.25); }
  });
  m.echo(0.12, 0.2, 0.25);
  return fin(m);
}

/** Maracuchos del Lago: gaita zuliana en 6/8, el coro en terceras, furro, tambora y charrasca, y el remate en La mayor. */
export function acordeMaracuchos(): Float32Array {
  const { e, bar } = tiempo(112, 6, 3), m = new Mixer(4 * bar + 1.3, false, 406);
  const sc = escala('A', 'B', 'C', 'D', 'E', 'F', 'G#');
  const melodia = ['E5/3 A5 B5 C6', 'D6/3 C6/2 A5', 'B5/3 G#5 A5 B5', 'A5/6'];
  const acordes = ['Am', 'Dm', 'E7', 'A'];
  melodia.forEach((txt, b) => {
    const tb = b * bar, ch = acordes[b], ultimo = b === 3;
    for (const n of seq(txt, tb, e)) {
      m.add({ t: n.t, dur: n.dur * 0.9, f: n.f, wave: 'square', duty: 0.5, vol: 0.14, a: 0.02, d: 0.06, s: 0.8, r: ultimo ? 0.4 : 0.06, lp: 0.4, vib: n.units >= 3 ? [5.5, 0.2, 0.12] : undefined });
      m.add({ t: n.t, dur: n.dur * 0.9, f: ultimo ? hz('C#5') : terceraAbajo(n.f, sc), wave: 'square', duty: 0.35, vol: 0.08, a: 0.02, s: 0.75, r: ultimo ? 0.4 : 0.06, lp: 0.35 });
    }
    m.add({ t: tb, dur: ultimo ? bar : e * 2.6, f: raiz(ch, 2), wave: 'triangle', vol: 0.3, a: 0.005, s: 0.7, r: ultimo ? 0.4 : 0.06 });
    if (!ultimo) m.add({ t: tb + 3 * e, dur: e * 2.6, f: quinta(ch, 1), wave: 'triangle', vol: 0.26, a: 0.005, s: 0.7, r: 0.06 });
    // furro: "rum, rum-rum"; en el remate, un rum largo en La, la tónica (el furro sube un tono al entrar)
    if (ultimo) furro(m, tb, bar * 0.8, 0.6, 55 / Math.pow(2, 2 / 12));
    else { furro(m, tb, e * 1.8, 0.55); furro(m, tb + 3 * e, e * 0.8, 0.45); furro(m, tb + 4 * e, e * 1.6, 0.5); }
    tambora(m, tb, 0.85, 'parche');
    if (!ultimo) {
      tambora(m, tb + 3 * e, 0.65, 'parche');
      for (const [k, v] of [[1, 0.55], [2, 0.8], [4, 0.55], [5, 0.8]] as const) tambora(m, tb + k * e, v, 'aro');
      for (const [k, d, v] of [[0, 1.4, 0.09], [2, 0.5, 0.07], [3, 1.4, 0.09], [5, 0.5, 0.07]] as const) raspa(m, tb + k * e, e * d, v, { paso: 0.009, hp: 0.4, lp: 0.85 });
      for (let k = 0; k < 6; k++) maraca(m, tb + k * e, k % 3 === 0 ? 0.14 : 0.08);
    }
    const cuatro = acorde(ch, 4).slice(0, 3);
    if (ultimo) rasgueo(m, tb, cuatro, 0.12);
    else for (const [k, ap] of [[0, false], [1, true], [2, false], [3, false], [4, true]] as const) rasgueo(m, tb + k * e, cuatro, 0.08, ap);
  });
  m.echo(0.14, 0.2, 0.3);
  return fin(m);
}

/** Los 6 acordes, con el nombre que va en el kit (`musica`) y en `equipos.<id>.musica`. */
export const MUSIC_ACORDES = {
  acorde_familia: acordeFamilia,
  acorde_instituto: acordeInstituto,
  acorde_rong: acordeRong,
  acorde_rolos: acordeRolos,
  acorde_panas: acordePanas,
  acorde_maracuchos: acordeMaracuchos,
};
