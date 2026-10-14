import { RATE } from './sfx';
import { Mixer } from './synth';
import { pink, bandpass, lowpass, highpass, voz } from './ambienteBase';
import { tambora, maraca } from './mundos';

/**
 * Los ambientes del resto de los mundos del olímpico (lote H7): la calle de Saigón, Hội An de noche, La Candelaria con
 * llovizna, la cancha del lago en Maracaibo, la azotea de Caracas, el atardecer de Cartagena, la Comuna 13, el
 * carnaval de Barranquilla, los pinos de Đà Lạt y el patio del liceo.
 *
 * Cada uno tiene dos partes:
 * - el fondo continuo (tráfico, agua, viento, llovizna, insectos), que se escribe en `buf` (13.5 s) y el motor cierra
 *   con el mismo fundido de los demás ambientes;
 * - la capa de cosas que pasan (motos, bocinas, perros, campanas, gente, tambores), que se arma en 12 s exactos y da la
 *   vuelta: lo que empieza al final termina al principio, sin fundido. Así un perro que ladra en el empalme no suena
 *   doble ni a medias.
 *
 * Sin melodías: el tema del mundo suena encima. Lo único con ritmo son los tambores de la comparsa, el parlante de los
 * bailarines de la Comuna 13 y el picó de Cartagena, lejos y bajitos.
 */

const LEN = 12 * RATE;
const capa = () => new Float32Array(LEN);
/** Suma un sonido suelto en la capa a partir de `t0` segundos, dando la vuelta al final. */
function pon(c: Float32Array, t0: number, x: Float32Array, k = 1) {
  const s = Math.round(t0 * RATE);
  for (let i = 0; i < x.length; i++) c[(((s + i) % LEN) + LEN) % LEN] += x[i] * k;
}
/** Un sonido suelto hecho con las piezas de `ambienteBase` (que escriben desde un segundo dado). */
function suelto(seg: number, f: (b: Float32Array) => void): Float32Array { const b = new Float32Array(Math.ceil(seg * RATE)); f(b); return b; }
/** Lo que suena lejos: más grave y más bajito. */
const lejos = (x: Float32Array, k = 0.12) => lowpass(lowpass(x, k), k);
/** Eco de 12 s que da la vuelta (el patio techado, los edificios). */
function eco(c: Float32Array, delay: number, fb: number, mezcla: number) {
  const D = Math.round(delay * RATE), src = Float32Array.from(c);
  for (let k = 1; k <= 3; k++) { const g = Math.pow(fb, k) * mezcla; for (let i = 0; i < LEN; i++) c[(i + D * k) % LEN] += src[i] * g; }
}

/**
 * Quita lo que está por debajo de `hz` (dos pasa altos de un polo), dando dos vueltas al bucle para que el final
 * empalme con el principio. Lo que va por debajo de 70 Hz no lo da un parlante de teléfono ni de tablet, y como el
 * nivel se iguala por el pico, solo le quitaría volumen a lo que sí se oye.
 */
export function sinGraves(b: Float32Array, hz = 70): Float32Array {
  const k = 1 - (2 * Math.PI * hz) / RATE;
  for (let polo = 0; polo < 2; polo++) {
    const src = Float32Array.from(b);
    let x1 = src[src.length - 1], y = 0;
    for (let pasada = 0; pasada < 2; pasada++) for (let i = 0; i < src.length; i++) { y = src[i] - x1 + k * y; x1 = src[i]; if (pasada === 1) b[i] = y; }
  }
  return b;
}

// ---------- piezas ----------
/**
 * Una moto que pasa: el motor de cuatro tiempos (un golpe por explosión que se apaga dentro del ciclo), con el doppler
 * (llega más aguda y se va más grave) y más brillante cuando está cerca. `acelera` sube las revoluciones.
 */
function moto(dur: number, f: number, R: () => number, acelera = 0): Float32Array {
  const n = Math.round(dur * RATE), out = new Float32Array(n), mid = dur / 2;
  let ph = 0, lp1 = 0, lp2 = 0, jit = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE, d = (t - mid) / (dur * 0.22);
    ph += (f * (1 + (acelera * t) / dur) * (1 + 0.07 * Math.tanh(-d * 1.5))) / RATE;
    if (ph >= 1) { ph -= 1; jit = R() * 0.3; }
    const v = Math.exp(-ph * 5) * (1 + jit) - 0.2 + (R() * 2 - 1) * 0.25;
    const cerca = 1 / (1 + d * d), k = 0.06 + 0.3 * cerca;
    lp1 += (v - lp1) * k; lp2 += (lp1 - lp2) * k;
    out[i] = lp2 * cerca * Math.min(1, t / 0.3, (dur - t) / 0.3);
  }
  return out;
}
/** La bocina de una moto: el pito eléctrico de dos tonos, "píp" o "píp-píp". */
function bocina(m: Mixer, t: number, f: number, vol: number, veces: number) {
  for (let k = 0; k < veces; k++) {
    m.add({ t: t + k * 0.19, dur: 0.11, f, wave: 'square', duty: 0.4, vol, a: 0.004, s: 0.9, r: 0.03, lp: 0.22 });
    m.add({ t: t + k * 0.19, dur: 0.11, f: f * 1.26, wave: 'square', duty: 0.4, vol: vol * 0.7, a: 0.004, s: 0.9, r: 0.03, lp: 0.2 });
  }
}

/** Las vocales por sus dos formantes (Hz). */
const VOCAL = { a: [800, 1250], e: [470, 1900], i: [320, 2250], o: [520, 900], u: [350, 780] } as const;
type Vocal = keyof typeof VOCAL;
/**
 * Una sílaba cantada o hablada: la cuerda vocal (una sierra) por los dos formantes de la vocal, con la altura de `fa` a
 * `fb` y un vibrato opcional. `golpe` pone la consonante del principio (un soplo corto).
 */
function silaba(dur: number, fa: number, fb: number, v: Vocal, R: () => number, vib = 0, golpe = 0.3): Float32Array {
  const n = Math.round(dur * RATE), out = new Float32Array(n), [F1, F2] = VOCAL[v];
  const g1 = 2 * Math.sin((Math.PI * F1) / RATE), g2 = 2 * Math.sin((Math.PI * F2) / RATE);
  let ph = 0, l1 = 0, b1 = 0, l2 = 0, b2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n, f = (fa + (fb - fa) * t) * (1 + vib * Math.sin((i / RATE) * 5.5 * Math.PI * 2));
    ph += f / RATE; ph -= Math.floor(ph);
    const src = 2 * ph - 1;
    const h1 = src - l1 - 0.25 * b1; b1 += g1 * h1; l1 += g1 * b1;
    const h2 = src - l2 - 0.3 * b2; b2 += g2 * h2; l2 += g2 * b2;
    const env = Math.min(1, i / (0.015 * RATE)) * Math.min(1, (n - i) / (0.03 * RATE));
    const cons = i < 0.012 * RATE ? (R() * 2 - 1) * golpe * (1 - i / (0.012 * RATE)) : 0;
    out[i] = ((b1 + 0.6 * b2) * 0.15 + cons) * env;
  }
  return out;
}
/** Una frase: sílabas seguidas, cada una [vocal, duración, altura inicial, altura final]. */
function frase(c: Float32Array, t0: number, sil: [Vocal, number, number, number][], vol: number, R: () => number, vib = 0) {
  let t = t0;
  for (const [v, d, fa, fb] of sil) { pon(c, t, silaba(d, fa, fb, v, R, vib), vol); t += d + 0.015; }
}
/**
 * El murmullo de la gente: `voces` personas que hablan en frases de 3 a 8 sílabas, cada una con su altura (entre
 * `f[0]` y `f[1]`) y sus vocales, con pausas entre frase y frase. `animo` acorta las sílabas y las pausas (niños,
 * fiesta).
 */
function murmullo(c: Float32Array, voces: number, R: () => number, f: [number, number], vol: number, animo = 0) {
  const vocales: Vocal[] = ['a', 'e', 'i', 'o', 'u', 'a', 'e', 'o'];
  for (let k = 0; k < voces; k++) {
    const f0 = f[0] + R() * (f[1] - f[0]), v0 = vol * (0.55 + R() * 0.45);
    let t = R() * 12;
    const fin = t + 12;
    while (t < fin) {
      const nsil = 3 + Math.floor(R() * 6);
      for (let j = 0; j < nsil; j++) {
        const d = (0.09 + R() * 0.14) * (1 - animo * 0.35), fa = f0 * (0.9 + R() * 0.3), fb = fa * (0.85 + R() * 0.25);
        pon(c, t, silaba(d, fa, fb, vocales[Math.floor(R() * vocales.length)], R), v0);
        t += d + 0.02 + R() * 0.04;
      }
      t += (0.3 + R() * 1.2) * (1 - animo * 0.5);
    }
  }
}
/** Un perro que ladra: "guau", la voz que sube y baja con el soplo áspero de la garganta. */
function ladrido(f: number, R: () => number): Float32Array {
  const d = 0.13 + R() * 0.05, n = Math.round(d * RATE), out = new Float32Array(n);
  const g = 2 * Math.sin((Math.PI * 1000) / RATE);
  let ph = 0, l = 0, b = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    ph += (f * (1 + 0.35 * Math.sin(Math.PI * t))) / RATE; ph -= Math.floor(ph);
    const src = (2 * ph - 1) * 0.7 + (R() * 2 - 1) * 0.5;
    const h = src - l - 0.7 * b; b += g * h; l += g * b;
    out[i] = (b * 0.8 + src * 0.25) * Math.min(1, i / (0.006 * RATE)) * Math.pow(1 - t, 2);
  }
  return out;
}
/** Campana de iglesia: los parciales de una campana (el zumbido, la nota, la tercera menor, la quinta...) que se apagan. */
function campana(m: Mixer, t: number, f: number, vol: number) {
  for (const [k, a, r] of [[0.5, 0.5, 4.5], [1, 1, 3.5], [1.183, 0.6, 2.4], [1.506, 0.4, 2], [2, 0.5, 1.6], [2.514, 0.25, 1.1], [3.01, 0.2, 0.8], [4.17, 0.12, 0.5]] as const)
    m.add({ t, dur: 0.005, f: f * k, wave: 'sine', vol: vol * a, a: 0.002, s: 1, r });
  m.add({ t, dur: 0.004, f: 6000, wave: 'noise', vol: vol * 0.3, s: 1, r: 0.03, hp: 0.5 });
}
/** Un casco de caballo contra el adoquín: el golpe de madera y el chasquido de la herradura. */
function casco(m: Mixer, t: number, vol: number, f: number) {
  m.add({ t, dur: 0.004, f, wave: 'sine', vol, s: 1, r: 0.06, bend: { semis: -4, len: 0.05 } });
  m.add({ t, dur: 0.003, f: 3200, wave: 'noise', vol: vol * 0.7, s: 1, r: 0.02, lp: 0.5 });
}
/** Un balón que pica: el golpe grave, el "bong" del aire de adentro y el chasquido del cuero o la goma. */
function bote(m: Mixer, t: number, vol: number, f = 140, ring = 900) {
  m.add({ t, dur: 0.01, f, wave: 'sine', vol, s: 1, r: 0.09, bend: { semis: -5, len: 0.06 } });
  m.add({ t, dur: 0.005, f: ring, wave: 'sine', vol: vol * 0.25, s: 1, r: 0.07 });
  m.add({ t, dur: 0.004, f: 5000, wave: 'noise', vol: vol * 0.4, s: 1, r: 0.02, lp: 0.4 });
}
/** El chirrido de una zapatilla contra la cancha. */
const chirrido = (m: Mixer, t: number, vol: number, f = 2300) => m.add({ t, dur: 0.07, f, wave: 'sine', vol, a: 0.008, s: 0.8, r: 0.03, vib: [38, 0.6, 0], bend: { semis: 3, len: 0.06 } });
/** Ranita de Caracas (el sapito "tink"): una nota corta y otra que sube, como una gota de vidrio. */
function tink(m: Mixer, t: number, f: number, vol: number) {
  m.add({ t, dur: 0.025, f, wave: 'sine', vol: vol * 0.6, a: 0.003, s: 0.9, r: 0.015 });
  m.add({ t: t + 0.07, dur: 0.05, f: f * 1.12, wave: 'sine', vol, a: 0.003, s: 0.9, r: 0.03, bend: { semis: 2, len: 0.05 } });
}
/** Un pito de carnaval: "fi-fi-fiii", con el trino de la bolita. */
function pito(m: Mixer, t: number, vol: number, golpes: number[]) {
  let tt = t;
  for (const d of golpes) { m.add({ t: tt, dur: d, f: 2650, wave: 'sine', vol, a: 0.01, s: 0.9, r: 0.03, vib: [27, 0.5, 0] }); tt += d + 0.06; }
}

// ---------- los ambientes ----------
type Ambiente = (buf: Float32Array, r: () => number) => Float32Array;
const LFO = (i: number, hz: number, ph = 0) => 0.5 + 0.5 * Math.sin((i / RATE) * hz * Math.PI * 2 + ph);
const suma = (buf: Float32Array, x: Float32Array, k: number | ((i: number) => number)) => { for (let i = 0; i < buf.length; i++) buf[i] += x[i] * (typeof k === 'number' ? k : k(i)); };

/** La calle de Saigón: el río de motos que no para, las bocinas, el parlante del que vende pan y la gente. */
const traficoSaigon: Ambiente = (buf, r) => {
  // el fondo: el rumor del tráfico y el siseo de las llantas
  suma(buf, lowpass(pink(buf.length, r), 0.02), 0.4);
  suma(buf, bandpass(pink(buf.length, r), (i) => 900 + 400 * LFO(i, 0.13), 0.7), (i) => 0.3 + 0.15 * LFO(i, 0.21, 1));
  suma(buf, highpass(pink(buf.length, r), 0.3), 0.06);
  const c = capa(), m = new Mixer(12, true, 701);
  // catorce motos que pasan, cerca y lejos, algunas acelerando
  for (let k = 0; k < 14; k++) pon(c, (k * 12) / 14 + r() * 0.5, moto(2.5 + r() * 2, 38 + r() * 22, r, r() < 0.3 ? 0.35 : 0), 0.35 + r() * 0.5);
  // las bocinas: una contesta a la otra
  for (const [t, f, v] of [[1.7, 470, 2], [3.9, 410, 1], [4.25, 520, 3], [7.3, 445, 2], [9.8, 390, 1], [11.2, 500, 2]] as const) bocina(m, t, f, 0.11, v);
  // el parlante del pan, "bánh mì nóng giòn đây": la voz grabada, con los tonos del vietnamita, por un parlante chiquito
  const loa = capa();
  for (const t0 of [5.2, 8.6]) frase(loa, t0, [['a', 0.2, 190, 250], ['i', 0.18, 175, 140], ['o', 0.22, 195, 255], ['o', 0.2, 170, 140], ['e', 0.34, 205, 200]], 1, r, 0.01);
  const altos = highpass(loa, 0.12);
  for (let i = 0; i < LEN; i++) c[i] += Math.tanh(altos[i] * 6) * 0.05;
  murmullo(c, 4, r, [110, 230], 0.25);
  const mo = m.out();
  for (let i = 0; i < LEN; i++) c[i] += mo[i];
  return c;
};

/** Hội An de noche: el río Thu Bồn que lame los botes, los grillos, las ranas, los remos de un sampán y un tambor lejos. */
const hoianNoche: Ambiente = (buf, r) => {
  // el agua contra los botes: un chapoteo grave que va y viene
  suma(buf, lowpass(pink(buf.length, r), 0.05), (i) => 0.55 * (0.25 + 0.75 * LFO(i, 0.41) * LFO(i, 0.13, 2)));
  for (let k = 0; k < 90; k++) { const t = r() * 13.4, f = 260 + r() * 300; const b = suelto(0.08, (x) => voz(x, 0, 0.06, f, f * 1.6, 1, [1], 0, 0, 0.004)); for (let i = 0; i < b.length && Math.round(t * RATE) + i < buf.length; i++) buf[Math.round(t * RATE) + i] += b[i] * 0.05; }
  // los grillos: un trino agudo que se corta en grupos
  const grillo = bandpass(pink(buf.length, r), () => 4700, 0.08);
  suma(buf, grillo, (i) => { const t = i / RATE; return 0.18 * (0.5 + 0.5 * Math.sin(t * 31 * Math.PI * 2)) * (Math.sin(t * 0.9 * Math.PI * 2) > -0.3 ? 1 : 0.15); });
  const c = capa(), m = new Mixer(12, true, 702);
  // las ranas del arrozal: "ộp ộp"
  for (const t of [1.9, 2.25, 6.7, 7.05, 10.4]) pon(c, t, suelto(0.2, (x) => voz(x, 0, 0.16, 260, 200, 1, [1, 0.7, 0.4, 0.2], 0.04, 30, 0.01)), 0.32);
  // un sampán que pasa remando: el remo entra al agua y cruje en la horquilla
  for (const t of [3.1, 5.6, 8.1, 10.6]) {
    pon(c, t, lowpass(suelto(0.4, (x) => { for (let i = 0; i < x.length; i++) x[i] = (r() * 2 - 1) * Math.exp(-(i / RATE) * 9) * Math.min(1, i / 200); }), 0.25), 0.55);
    m.add({ t: t + 0.25, dur: 0.18, f: 190, wave: 'saw', vol: 0.05, a: 0.03, s: 0.8, r: 0.05, lp: 0.15, vib: [17, 0.8, 0], bend: { semis: 2, len: 0.15 } });
  }
  // el tambor del festival, lejos
  for (const t of [0.3, 0.95, 4.3, 4.95, 8.3, 8.95]) m.add({ t, dur: 0.02, f: 110, wave: 'sine', vol: 0.22, s: 1, r: 0.3, bend: { semis: -4, len: 0.2 } });
  murmullo(c, 4, r, [140, 260], 0.12);
  const mo = m.out();
  for (let i = 0; i < LEN; i++) c[i] += mo[i];
  // la noche lo suaviza todo un poco
  return lowpass(c, 0.45);
};

/** La Candelaria con llovizna: las gotas, los pasos en el adoquín mojado, las palomas, la campana y la mecha de un tejo. */
const lloviznaBogota: Ambiente = (buf, r) => {
  // la llovizna: un siseo fino y muchas gotitas
  suma(buf, highpass(pink(buf.length, r), 0.45), 0.8);
  for (let k = 0; k < 700; k++) { const s = Math.floor(r() * (buf.length - 400)), f = 2500 + r() * 3500; for (let i = 0; i < 120; i++) buf[s + i] += Math.sin((i / RATE) * f * Math.PI * 2) * Math.exp(-i / 25) * 0.06; }
  // la ciudad lejos
  suma(buf, lowpass(pink(buf.length, r), 0.015), 0.5);
  const c = capa(), m = new Mixer(12, true, 703);
  // alguien que camina por el adoquín mojado: el taco y el chapoteo
  for (let k = 0; k < 7; k++) {
    const t = 1.6 + k * 0.56, v = 0.5 * Math.sin((Math.PI * (k + 1)) / 8);
    m.add({ t, dur: 0.004, f: 1300, wave: 'sine', vol: 0.3 * v, s: 1, r: 0.03 });
    m.add({ t: t + 0.01, dur: 0.02, f: 5000, wave: 'noise', vol: 0.35 * v, s: 1, r: 0.07, lp: 0.45 });
  }
  // la campana de la iglesia, dos golpes
  campana(m, 6.8, 196, 0.16); campana(m, 8.7, 196, 0.14);
  // las palomas: "ruu-cu-cuu"
  for (const t of [2.3, 10.7]) frase(c, t, [['u', 0.22, 420, 390], ['u', 0.1, 470, 440], ['u', 0.3, 430, 380]], 0.45, r, 0.03);
  // en la cancha de tejo de la esquina revientan una mecha, y celebran
  pon(c, 4.6, lejos(suelto(0.9, (x) => { for (let i = 0; i < x.length; i++) { const t = i / RATE; x[i] = (r() * 2 - 1) * Math.exp(-t * 7) + Math.sin(t * 2 * Math.PI * 70 * (1 - t * 0.4)) * Math.exp(-t * 5) * 0.8; } }), 0.18), 0.8);
  frase(c, 5.15, [['e', 0.12, 230, 260], ['o', 0.3, 280, 220]], 0.35, r);
  murmullo(c, 3, r, [110, 220], 0.12);
  const mo = m.out();
  for (let i = 0; i < LEN; i++) c[i] += mo[i];
  return c;
};

/** La cancha del lago en Maracaibo, de noche: el calor quieto, los insectos, el agua, el trueno del Catatumbo y el básquet. */
const lagoNoche: Ambiente = (buf, r) => {
  // el calor quieto y el lago que apenas se mueve
  suma(buf, lowpass(pink(buf.length, r), 0.012), 0.5);
  suma(buf, lowpass(pink(buf.length, r), 0.06), (i) => 0.25 * LFO(i, 0.25) * LFO(i, 0.09, 1));
  // los insectos de la noche caliente: un zumbido parejo que late rápido
  const bichos = bandpass(pink(buf.length, r), () => 3400, 0.15);
  suma(buf, bichos, (i) => 0.14 * (0.6 + 0.4 * Math.sin((i / RATE) * 43 * Math.PI * 2)));
  const c = capa(), m = new Mixer(12, true, 704);
  // el trueno del relámpago del Catatumbo, muy lejos: un rumor que rueda
  pon(c, 5.2, lowpass(lowpass(suelto(3.2, (x) => { for (let i = 0; i < x.length; i++) { const t = i / RATE; x[i] = (r() * 2 - 1) * Math.min(1, t / 0.4) * Math.exp(-t * 1.1) * (0.6 + 0.4 * Math.sin(t * 3.1)); } }), 0.02), 0.02), 4);
  // uno que bota el balón en la cancha y se le oyen las zapatillas
  for (let k = 0; k < 7; k++) bote(m, 1 + k * 0.45, 0.25);
  chirrido(m, 4.2, 0.08); chirrido(m, 4.5, 0.06, 2600);
  for (let k = 0; k < 5; k++) bote(m, 8 + k * 0.42, 0.22);
  chirrido(m, 10.3, 0.08, 2450);
  // "¡epa, pásala!"
  frase(c, 6.3, [['e', 0.1, 210, 240], ['a', 0.18, 250, 230]], 0.35, r);
  murmullo(c, 3, r, [110, 220], 0.12);
  const mo = m.out();
  for (let i = 0; i < LEN; i++) c[i] += mo[i];
  return c;
};

/** La azotea de Caracas de noche: la ciudad que zumba abajo, los sapitos, los perros, el helicóptero y una moto. */
const azoteaNoche: Ambiente = (buf, r) => {
  // la ciudad abajo: un rumor grave y el siseo del tráfico lejos
  suma(buf, lowpass(pink(buf.length, r), 0.01), 0.8);
  suma(buf, bandpass(pink(buf.length, r), (i) => 850 + 200 * LFO(i, 0.07), 0.9), 0.14);
  const c = capa(), m = new Mixer(12, true, 705);
  // los sapitos de la noche caraqueña: muchos "tink" de vidrio, cada uno con su altura
  const ranas = [2650, 2900, 3150, 3400];
  for (let k = 0; k < 44; k++) tink(m, r() * 12, ranas[k % 4] * (0.98 + r() * 0.04), 0.07 + r() * 0.05);
  // los perros del cerro: uno ladra, otro le contesta más lejos, con el rebote en los edificios
  const perros = capa();
  for (const [t, f] of [[2.9, 470], [3.25, 470], [3.6, 480], [7.4, 380], [7.8, 390]] as const) pon(perros, t, ladrido(f, r), t > 7 ? 0.3 : 0.45);
  eco(perros, 0.28, 0.35, 0.5);
  const pl = lejos(perros, 0.2);
  for (let i = 0; i < LEN; i++) c[i] += pl[i];
  // el helicóptero que cruza: las aspas que golpean el aire y la turbina
  pon(c, 3.8, suelto(7.5, (x) => {
    for (let i = 0; i < x.length; i++) {
      const t = i / RATE, d = (t - 3.75) / 1.6, cerca = 1 / (1 + d * d);
      const aspa = Math.pow(0.5 + 0.5 * Math.cos(t * 17.5 * Math.PI * 2), 6);
      x[i] = ((r() * 2 - 1) * aspa * 1.2 + Math.sin(t * 2 * Math.PI * 1480 * (1 + 0.02 * Math.tanh(-d))) * 0.04) * cerca * Math.min(1, t / 0.5, (7.5 - t) / 0.5);
    }
  }), 0.35);
  // una moto que sube por la avenida
  pon(c, 0.6, lejos(moto(3.4, 55, r, 0.5), 0.3), 0.5);
  const mo = m.out();
  for (let i = 0; i < LEN; i++) c[i] += mo[i];
  return c;
};

/** El atardecer de Cartagena: la brisa del mar, el coche de caballos, la palenquera que pregona y el picó que retumba. */
const atardecerCartagena: Ambiente = (buf, r) => {
  // la brisa del mar entre las casas y la resaca lejos
  suma(buf, bandpass(pink(buf.length, r), (i) => 480 + 300 * LFO(i, 0.08) + 150 * LFO(i, 0.27, 1), 0.85), (i) => 0.3 + 0.25 * LFO(i, 0.09, 0.4));
  suma(buf, lowpass(pink(buf.length, r), 0.02), (i) => 0.25 + 0.2 * LFO(i, 1 / 6.5));
  const c = capa(), m = new Mixer(12, true, 706);
  // el coche de caballos que pasa al trote por el adoquín: "ta-ca, ta-ca"
  for (let k = 0; k < 16; k++) {
    const t = 0.8 + k * 0.36, v = 0.4 * Math.pow(Math.sin((Math.PI * (k + 0.5)) / 16), 1.5);
    casco(m, t, v, 640); casco(m, t + 0.09, v * 0.8, 590);
    if (k % 3 === 1) m.add({ t: t + 0.05, dur: 0.12, f: 3500, wave: 'noise', vol: v * 0.15, a: 0.02, s: 0.8, r: 0.04, hp: 0.4, lp: 0.6 });
  }
  // la palenquera: "¡a-le-gríaaa, co-ca-di-taaa!"
  frase(c, 7.4, [['a', 0.16, 340, 360], ['e', 0.16, 360, 380], ['i', 0.22, 400, 440], ['a', 0.55, 440, 420]], 0.5, r, 0.015);
  frase(c, 8.75, [['o', 0.14, 380, 380], ['a', 0.14, 380, 400], ['i', 0.16, 400, 420], ['a', 0.5, 420, 360]], 0.45, r, 0.015);
  // el picó de una casa: el bajo y el bombo de la champeta a 100, retumbando a través de la pared
  const pico = new Mixer(12, true, 707), e = 60 / 100;
  const bajo = [55, 55, 73.4, 65.4, 55, 82.4, 73.4, 65.4];
  for (let b = 0; b < 20; b++) {
    pico.drum('bombo', b * e, 0.9);
    pico.add({ t: b * e + e / 2, dur: e * 0.4, f: bajo[b % 8], wave: 'triangle', vol: 0.55, a: 0.01, s: 0.8, r: 0.05 });
  }
  const pc = lowpass(lowpass(pico.out(), 0.05), 0.05);
  for (let i = 0; i < LEN; i++) c[i] += pc[i] * 0.6;
  const mo = m.out();
  for (let i = 0; i < LEN; i++) c[i] += mo[i];
  return c;
};

/** La Comuna 13: el parlante de los bailarines, las escaleras eléctricas, la gente, un perro, una moto que sube y aplausos. */
const comuna: Ambiente = (buf, r) => {
  // la ladera: la ciudad abajo y la brisa
  suma(buf, lowpass(pink(buf.length, r), 0.015), 0.5);
  suma(buf, bandpass(pink(buf.length, r), (i) => 600 + 250 * LFO(i, 0.1), 0.9), 0.12);
  // las escaleras eléctricas: el zumbido del motor (120 Hz) y el clac de cada escalón
  for (let i = 0; i < buf.length; i++) { const t = i / RATE; buf[i] += (Math.sin(t * 120 * Math.PI * 2) + 0.4 * Math.sin(t * 240 * Math.PI * 2)) * 0.02; }
  const c = capa(), m = new Mixer(12, true, 708);
  for (let t = 0.2; t < 12; t += 0.8) m.add({ t, dur: 0.004, f: 900, wave: 'sine', vol: 0.06, s: 1, r: 0.03 });
  // el parlante de los bailarines: un boom bap a 100, bajito y un poco lejos
  const beat = new Mixer(12, true, 709), e = 60 / 100;
  for (let b = 0; b < 20; b++) {
    const t = b * e;
    if (b % 2 === 0) { beat.drum('bombo', t, 0.6); beat.drum('bombo', t + e * 0.75, 0.3); } else beat.drum('caja', t, 0.8);
    beat.drum('charles', t, 0.5); beat.drum('charles', t + e / 2, 0.35);
  }
  const bt = lowpass(beat.out(), 0.3);
  for (let i = 0; i < LEN; i++) c[i] += bt[i] * 0.65;
  // la gente que sube y mira, y los aplausos cuando el b-boy remata
  murmullo(c, 6, r, [110, 260], 0.3);
  for (let k = 0; k < 26; k++) m.drum('palmas', 6 + r() * 1.4, 0.2 + r() * 0.2);
  frase(c, 6.1, [['e', 0.12, 240, 280], ['o', 0.3, 300, 240]], 0.35, r);
  // un perro y una moto que sube la loma forzada
  pon(c, 9.1, ladrido(520, r), 0.4); pon(c, 9.42, ladrido(510, r), 0.35);
  pon(c, 3.2, lejos(moto(3.6, 68, r, 0.25), 0.35), 0.55);
  const mo = m.out();
  for (let i = 0; i < LEN; i++) c[i] += mo[i];
  return c;
};

/** El carnaval de Barranquilla: el gentío, la comparsa que pasa con sus tambores, los pitos, la pólvora y el grito. */
const carnaval: Ambiente = (buf, r) => {
  // el gentío: un rugido ancho que crece y baja
  suma(buf, bandpass(pink(buf.length, r), (i) => 900 + 500 * LFO(i, 0.11), 0.7), (i) => 0.35 + 0.25 * LFO(i, 1 / 6, 1));
  suma(buf, lowpass(pink(buf.length, r), 0.03), 0.4);
  const c = capa(), m = new Mixer(12, true, 710);
  murmullo(c, 14, r, [130, 300], 0.2, 0.6);
  // la comparsa: tambora, llamador en el contratiempo, alegre que repica y maracas, a 120, que se acerca y se va
  const tambores = new Mixer(12, true, 711), e = 60 / 120;
  for (let b = 0; b < 24; b++) {
    const t = b * e;
    tambora(tambores, t, 0.8, 'parche'); tambora(tambores, t + e * 0.5, 0.5, 'aro');
    tambores.add({ t: t + e * 0.5, dur: 0.01, f: 230, wave: 'sine', vol: 0.4, s: 1, r: 0.1, bend: { semis: -3, len: 0.06 } });
    if (r() < 0.6) tambores.add({ t: t + e * 0.75, dur: 0.008, f: 340, wave: 'sine', vol: 0.35, s: 1, r: 0.07 });
    for (let q = 0; q < 4; q++) maraca(tambores, t + (q * e) / 4, q % 2 ? 0.15 : 0.25);
  }
  const tb = tambores.out();
  for (let i = 0; i < LEN; i++) c[i] += tb[i] * 0.55 * (0.35 + 0.65 * Math.pow(Math.sin((Math.PI * i) / LEN), 2));
  // los pitos
  pito(m, 2.2, 0.09, [0.08, 0.08, 0.3]); pito(m, 7.9, 0.08, [0.1, 0.35]); pito(m, 10.9, 0.07, [0.08, 0.08, 0.08, 0.25]);
  // el grito del gentío cuando pasa la reina
  for (const t of [4.9, 10.5]) { const g = suelto(1.6, (x) => { for (let i = 0; i < x.length; i++) x[i] = (r() * 2 - 1) * Math.sin(Math.PI * (i / x.length)); }); pon(c, t, bandpass(g, () => 1100, 0.6), 0.6); }
  // la pólvora: un totazo y su eco
  for (const t of [3.3, 8.4]) { const p = suelto(0.6, (x) => { for (let i = 0; i < x.length; i++) x[i] = (r() * 2 - 1) * Math.exp(-(i / RATE) * 14); }); pon(c, t, lowpass(p, 0.3), 0.7); pon(c, t + 0.22, lowpass(p, 0.1), 0.25); }
  const mo = m.out();
  for (let i = 0; i < LEN; i++) c[i] += mo[i];
  return c;
};

/** Los pinos de Đà Lạt: el susurro de las agujas, el viento fresco, el chào mào, el tu hú y una moto lejos. */
const pinosDalat: Ambiente = (buf, r) => {
  // el susurro de los pinos: un siseo alto que respira despacio, y el viento fresco más abajo
  suma(buf, bandpass(pink(buf.length, r), (i) => 2600 + 900 * LFO(i, 0.06) + 400 * LFO(i, 0.17, 2), 0.5), (i) => 0.25 + 0.3 * LFO(i, 1 / 6, 0.7) * LFO(i, 0.05));
  suma(buf, bandpass(pink(buf.length, r), (i) => 380 + 150 * LFO(i, 0.09), 0.9), 0.3);
  const c = capa();
  // el chào mào, el pájaro de las tierras altas: "chít-chít-chào-mào", brillante y alegre
  for (const t0 of [2.1, 6.8, 10.4]) [[2400, 2700], [2450, 2750], [2100, 2600], [2700, 2200]].forEach(([fa, fb], j) => pon(c, t0 + j * 0.13, suelto(0.12, (x) => voz(x, 0, 0.09, fa, fb, 1, [1, 0.15], 0.01, 40, 0.005)), 0.2));
  // el tu hú, lejos: dos notas que suben
  for (const t0 of [4.3, 9.1]) { pon(c, t0, suelto(0.35, (x) => voz(x, 0, 0.3, 620, 680, 1, [1, 0.3], 0.01, 6, 0.04)), 0.14); pon(c, t0 + 0.42, suelto(0.45, (x) => voz(x, 0, 0.4, 760, 840, 1, [1, 0.3], 0.01, 6, 0.04)), 0.14); }
  // una moto que baja la loma, lejos
  pon(c, 7.1, lejos(moto(4.2, 46, r), 0.25), 0.35);
  return c;
};

/** El patio del liceo en el recreo: los niños que gritan y corren, el balón contra el piso y la pared, todo con el eco del techo. */
const liceo: Ambiente = (buf, r) => {
  // el patio techado: un rumor bajito que resuena
  suma(buf, lowpass(pink(buf.length, r), 0.02), 0.15);
  const c = capa(), m = new Mixer(12, true, 712);
  murmullo(c, 12, r, [220, 380], 0.3, 1);
  // los gritos: "¡pá-sa-la!", "¡a-quí!", "¡ja-ja-ja!"
  frase(c, 1.4, [['a', 0.1, 360, 420], ['a', 0.09, 420, 400], ['a', 0.22, 400, 330]], 0.55, r);
  frase(c, 4.8, [['a', 0.08, 380, 400], ['i', 0.26, 440, 520]], 0.5, r);
  frase(c, 7.6, [['a', 0.07, 420, 400], ['a', 0.07, 400, 380], ['a', 0.07, 380, 360], ['a', 0.1, 360, 330]], 0.45, r);
  frase(c, 10.2, [['o', 0.1, 330, 360], ['e', 0.28, 380, 300]], 0.5, r);
  // el balón de goma: pica, pega en la pared y vuelve a picar
  for (const [t, v] of [[2.3, 0.5], [2.75, 0.4], [3.1, 0.3], [6.1, 0.55], [6.35, 0.35], [9.2, 0.5], [9.6, 0.4], [9.95, 0.32], [10.25, 0.25]] as const) bote(m, t, v * 0.6, 180, 600);
  m.add({ t: 6.25, dur: 0.01, f: 95, wave: 'sine', vol: 0.5, s: 1, r: 0.12, bend: { semis: -4, len: 0.08 } });
  const mo = m.out();
  for (let i = 0; i < LEN; i++) c[i] += mo[i];
  eco(c, 0.11, 0.3, 0.4);
  return c;
};

/** Los ambientes de los mundos (lote H7), en el orden del pedido de Rick. */
export const AMBIENTES_MUNDOS: Record<string, Ambiente> = {
  trafico_saigon: traficoSaigon,
  hoian_noche: hoianNoche,
  llovizna_bogota: lloviznaBogota,
  lago_noche: lagoNoche,
  azotea_noche: azoteaNoche,
  atardecer_cartagena: atardecerCartagena,
  comuna,
  carnaval,
  pinos_dalat: pinosDalat,
  liceo,
};
