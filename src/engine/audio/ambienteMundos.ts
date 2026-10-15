import { RATE } from './sfx';
import { Mixer } from './synth';
import { pink, bandpass, lowpass, highpass, voz } from './ambienteBase';
import { tambora, maraca, bocina } from './mundos';

/**
 * Los ambientes del resto de los mundos del olímpico (lote H7): la calle de Saigón, Hội An de noche, La Candelaria con
 * llovizna, la cancha del lago en Maracaibo, la azotea de Caracas, el atardecer de Cartagena, la Comuna 13, el
 * carnaval de Barranquilla, los pinos de Đà Lạt y el patio del liceo. Después, los del lote B7H8 (el parque Tao Đàn, el
 * barrio de Caracas y el dojo de Hanói) y los del lote H2 corto (el mercado Bến Thành, el río Saigón y el estadio).
 *
 * Cada uno tiene dos partes:
 * - el fondo continuo (tráfico, agua, viento, llovizna, insectos), que se escribe en `buf` (13.5 s) y el motor cierra
 *   con el mismo fundido de los demás ambientes;
 * - la capa de cosas que pasan (motos, bocinas, perros, campanas, gente, tambores), que se arma en 12 s exactos y da la
 *   vuelta: lo que empieza al final termina al principio, sin fundido. Así un perro que ladra en el empalme no suena
 *   doble ni a medias.
 *
 * Sin melodías: el tema del mundo suena encima. Lo único con ritmo son los tambores de la comparsa, el parlante de los
 * bailarines de la Comuna 13, el picó de Cartagena, el radio del barrio de Caracas y la barra del estadio, lejos y
 * bajitos.
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

// ---------- lote B7H8 ----------

/** Un pájaro cantor: una frase de notas cortas que suben y bajan (`notas` = [desde, hasta] en Hz), brillante. */
function canto(c: Float32Array, t0: number, notas: [number, number][], vol: number, paso = 0.11) {
  notas.forEach(([fa, fb], j) => pon(c, t0 + j * paso, suelto(paso * 0.9, (x) => voz(x, 0, paso * 0.8, fa, fb, 1, [1, 0.15], 0.01, 40, 0.004)), vol));
}
/** El toque del cầu: el golpe seco del empeine contra la base de goma y el soplo de las plumas. */
function toqueCau(m: Mixer, t: number, vol: number) {
  m.add({ t, dur: 0.004, f: 520, wave: 'sine', vol, s: 1, r: 0.04, bend: { semis: -5, len: 0.03 } });
  m.add({ t, dur: 0.003, f: 2600, wave: 'noise', vol: vol * 0.6, s: 1, r: 0.03, lp: 0.45 });
}
/** Una escoba de palito que barre hojas: el "shhh" que sube y se corta. */
const barrida = (r: () => number) => suelto(0.45, (x) => { for (let i = 0; i < x.length; i++) { const t = i / x.length; x[i] = (r() * 2 - 1) * Math.sin(Math.PI * t) * Math.pow(t, 0.4); } });

/**
 * El parque Tao Đàn en la mañana (Đá cầu): los pájaros en sus jaulas colgadas de los árboles (el café de los pájaros),
 * el toque del cầu de los grupos que juegan en ronda, una escoba que barre hojas, los señores que conversan y
 * Saigón que ya se despierta detrás de los árboles.
 */
const parqueTaoDan: Ambiente = (buf, r) => {
  // la ciudad detrás de los árboles y las hojas que se mueven con la brisa
  suma(buf, lowpass(pink(buf.length, r), 0.018), 0.32);
  suma(buf, bandpass(pink(buf.length, r), (i) => 2200 + 700 * LFO(i, 0.07), 0.6), (i) => 0.08 + 0.1 * LFO(i, 1 / 6, 0.4));
  const c = capa(), m = new Mixer(12, true, 713);
  // los pájaros de las jaulas: el chào mào y el khướu, que se contestan
  for (const t0 of [0.6, 4.1, 8.3]) canto(c, t0, [[2400, 2700], [2450, 2750], [2100, 2600], [2700, 2200]], 0.18);
  for (const t0 of [2.2, 6.4, 10.6]) canto(c, t0, [[1800, 2300], [2300, 1900], [1700, 2500], [2500, 2600], [2600, 2100]], 0.13, 0.09);
  for (const t0 of [3.3, 9.5]) canto(c, t0, [[3100, 3300], [3300, 3100], [3100, 3300]], 0.08, 0.07);
  // dos rondas de đá cầu: el toque va de pie en pie, cerca y más lejos
  for (const [t0, n, v] of [[0.9, 6, 0.32], [5.6, 5, 0.32], [2.4, 7, 0.16], [8.9, 6, 0.16]] as const)
    for (let k = 0; k < n; k++) toqueCau(m, t0 + k * (0.42 + r() * 0.12), v * (0.8 + r() * 0.3));
  // la escoba de palito barriendo las hojas
  for (let k = 0; k < 6; k++) pon(c, 3.6 + k * 0.62, bandpass(barrida(r), () => 3800, 0.5), 0.1);
  // los señores que conversan en un banco, bajito, y uno que se ríe
  murmullo(c, 3, r, [100, 170], 0.18);
  frase(c, 7.3, [['a', 0.09, 160, 150], ['a', 0.09, 155, 145], ['a', 0.12, 150, 130]], 0.22, r);
  // una moto que pasa por la calle del parque y una bocina lejos
  pon(c, 6.2, lejos(moto(3.4, 44, r), 0.3), 0.3);
  bocina(m, 11.1, 460, 0.035, 2);
  const mo = m.out();
  for (let i = 0; i < LEN; i++) c[i] += mo[i];
  return c;
};

/**
 * El barrio de Caracas de día (Chapita): las guacamayas que cruzan gritando, la camionetica que sube la calle con su
 * corneta, el vendedor que pregona, un radio con salsa lejos, los chamos jugando, un perro y el "tac" de la chapa
 * contra el palo de escoba.
 */
const barrioCaracas: Ambiente = (buf, r) => {
  // el valle: el tráfico de abajo y la brisa del Ávila
  suma(buf, lowpass(pink(buf.length, r), 0.02), 0.38);
  suma(buf, bandpass(pink(buf.length, r), (i) => 700 + 300 * LFO(i, 0.09), 0.8), 0.12);
  const c = capa(), m = new Mixer(12, true, 714);
  // las guacamayas: dos que pasan gritando "ráa-ráa", ásperas, de un lado al otro
  for (const t0 of [1.1, 1.5, 7.8, 8.25]) {
    const g = suelto(0.32, (x) => { voz(x, 0, 0.3, 1150, 900, 1, [1, 0.7, 0.5, 0.3], 0.08, 28, 0.01); for (let i = 0; i < x.length; i++) x[i] = Math.tanh(x[i] * 3 + (r() * 2 - 1) * 0.15 * Math.abs(x[i])); });
    pon(c, t0, bandpass(g, () => 1600, 0.7), 0.16);
  }
  // la camionetica que sube forzada, con su corneta de dos tonos
  pon(c, 3.0, lejos(moto(5.5, 34, r, 0.2), 0.25), 0.55);
  for (const t of [4.4, 4.75]) { m.add({ t, dur: 0.28, f: 330, wave: 'square', duty: 0.5, vol: 0.05, a: 0.01, s: 0.9, r: 0.05, lp: 0.15 }); m.add({ t, dur: 0.28, f: 415, wave: 'square', duty: 0.5, vol: 0.04, a: 0.01, s: 0.9, r: 0.05, lp: 0.15 }); }
  // el pregón: "¡a-gua-ca-teee!", largo al final
  frase(c, 6.0, [['a', 0.1, 240, 250], ['u', 0.09, 260, 255], ['a', 0.1, 270, 265], ['a', 0.11, 275, 270], ['e', 0.55, 300, 240]], 0.32, r, 0.012);
  // el radio de una casa: el bajo y la clave de la salsa, lejos y apagado (sin melodía)
  const radio = new Mixer(12, true, 715), e = 60 / 96;
  for (let b = 0; b < 19; b++) {
    const t = b * e;
    radio.add({ t: t + e * 0.5, dur: 0.18, f: b % 4 < 2 ? 98 : 110, wave: 'triangle', vol: 0.5, a: 0.01, s: 0.7, r: 0.08 });
    if ([0, 1.5, 3, 5, 6].includes((b % 4) * 2) || b % 2 === 0) radio.add({ t, dur: 0.01, f: 2400, wave: 'sine', vol: 0.25, s: 1, r: 0.05 });
  }
  const rd = lowpass(lowpass(radio.out(), 0.08), 0.08);
  for (let i = 0; i < LEN; i++) c[i] += rd[i] * 0.45;
  // los chamos jugando chapita en la calle: los gritos y el tac del palo contra la chapa
  murmullo(c, 4, r, [230, 380], 0.2, 0.8);
  frase(c, 9.4, [['a', 0.08, 380, 400], ['e', 0.08, 400, 390], ['o', 0.3, 420, 330]], 0.4, r);
  for (const t of [9.2, 2.6]) { m.add({ t, dur: 0.004, f: 1900, wave: 'square', duty: 0.3, vol: 0.12, s: 1, r: 0.03, lp: 0.5 }); m.add({ t, dur: 0.003, f: 5000, wave: 'noise', vol: 0.1, s: 1, r: 0.02 }); }
  // un perro de la cuadra
  pon(c, 10.6, ladrido(560, r), 0.3); pon(c, 10.9, ladrido(545, r), 0.26);
  const mo = m.out();
  for (let i = 0; i < LEN; i++) c[i] += mo[i];
  return c;
};

/**
 * El dojo de Hanói en la tarde (el judo): adentro, los pies que arrastran sobre el tatami, las palmadas del ukemi, un
 * kiai y el piso de madera que cruje, todo con el eco del salón; afuera, por los ventanales, el viento en los árboles
 * del lago Hoàn Kiếm, las motos lejos y la campana de un templo.
 */
const dojoHanoi: Ambiente = (buf, r) => {
  // el salón: un rumor quieto, y la tarde de afuera por las ventanas
  suma(buf, lowpass(pink(buf.length, r), 0.015), 0.3);
  suma(buf, bandpass(pink(buf.length, r), (i) => 1800 + 600 * LFO(i, 0.05), 0.6), (i) => 0.14 + 0.1 * LFO(i, 1 / 6, 1.2));
  suma(buf, bandpass(pink(buf.length, r), (i) => 500 + 150 * LFO(i, 0.08), 0.9), 0.14);
  const c = capa(), m = new Mixer(12, true, 716);
  // los pies que arrastran sobre el tatami (suri ashi): un roce corto y suave
  for (let k = 0; k < 14; k++) pon(c, k * 0.86 + r() * 0.3, bandpass(suelto(0.18, (x) => { for (let i = 0; i < x.length; i++) x[i] = (r() * 2 - 1) * Math.sin((Math.PI * i) / x.length); }), () => 1400, 0.8), 0.13);
  // las caídas: el cuerpo contra el tatami y la palmada seca justo encima
  for (const [t, v] of [[2.2, 0.5], [5.9, 0.45], [9.4, 0.55]] as const) {
    m.add({ t, dur: 0.01, f: 160, wave: 'sine', vol: v * 0.45, s: 1, r: 0.14, bend: { semis: -3, len: 0.1 } });
    m.add({ t: t + 0.015, dur: 0.004, f: 3000, wave: 'noise', vol: v * 0.4, s: 1, r: 0.05, lp: 0.6 });
  }
  // un kiai y la voz del sensei, los dos con eco
  frase(c, 3.8, [['e', 0.07, 240, 260], ['i', 0.28, 280, 220]], 0.35, r);
  frase(c, 7.6, [['a', 0.1, 140, 135], ['i', 0.08, 130, 125], ['e', 0.2, 140, 120]], 0.2, r);
  // los que esperan su turno al borde del tatami, en voz baja
  murmullo(c, 3, r, [120, 220], 0.12);
  // el piso de madera que cruje
  for (const t of [1.0, 8.5]) pon(c, t, bandpass(suelto(0.3, (x) => { for (let i = 0; i < x.length; i++) x[i] = Math.sin((i / RATE) * 2 * Math.PI * (300 + 200 * Math.sin(i / 900))) * (r() < 0.3 ? 1 : 0.2) * Math.sin((Math.PI * i) / x.length); }), () => 500, 0.5), 0.06);
  // afuera: la campana del templo de Ngọc Sơn y dos motos lejos
  campana(m, 0.4, 196, 0.07);
  pon(c, 4.6, lejos(moto(3.6, 48, r), 0.2), 0.22);
  pon(c, 10.1, lejos(moto(2.8, 55, r), 0.2), 0.16);
  const mo = m.out();
  for (let i = 0; i < LEN; i++) c[i] += mo[i];
  eco(c, 0.09, 0.35, 0.45);
  return c;
};

// ---------- lote H2 corto ----------

/** La cuchilla del carnicero contra la tabla: el golpe sordo de la madera, la tabla que suena y el filo que muerde. */
function cuchilla(m: Mixer, t: number, vol: number) {
  m.add({ t, dur: 0.008, f: 210, wave: 'sine', vol, s: 1, r: 0.07, bend: { semis: -5, len: 0.05 } });
  m.add({ t, dur: 0.004, f: 1150, wave: 'sine', vol: vol * 0.55, s: 1, r: 0.05 });
  m.add({ t, dur: 0.003, f: 9000, wave: 'noise', vol: vol * 0.5, s: 1, r: 0.025, lp: 0.6 });
}
/** Una bolsa plástica que se arruga: chasquidos sueltos y agudos, más seguidos en el medio. */
const bolsa = (seg: number, r: () => number) => highpass(suelto(seg, (x) => {
  for (let i = 0; i < x.length; i++) { const u = Math.sin((Math.PI * i) / x.length); x[i] = r() < 0.05 + 0.25 * u ? (r() * 2 - 1) * (0.4 + 0.6 * u) : 0; }
}), 0.55);
/** Una moneda que cae en la mano o en la lata: dos parciales de metal que se apagan, y un rebotito. */
function moneda(m: Mixer, t: number, vol: number, f = 3400) {
  for (const [dt, v] of [[0, 1], [0.06, 0.45]] as const) {
    m.add({ t: t + dt, dur: 0.004, f, wave: 'sine', vol: vol * v, s: 1, r: 0.16 });
    m.add({ t: t + dt, dur: 0.004, f: f * 1.47, wave: 'sine', vol: vol * v * 0.6, s: 1, r: 0.1 });
    m.add({ t: t + dt, dur: 0.002, f: 12000, wave: 'noise', vol: vol * v * 0.4, s: 1, r: 0.01, hp: 0.6 });
  }
}
/** El agua que pega contra el muelle o el casco: el chapoteo (ruido en banda que se apaga) y el "bong" hueco de la madera. */
function chapoteo(r: () => number, f: number, hueco: number): Float32Array {
  return suelto(0.4, (x) => {
    const g = 2 * Math.sin((Math.PI * f) / RATE);
    let lo = 0, ba = 0;
    for (let i = 0; i < x.length; i++) {
      const t = i / RATE, h = (r() * 2 - 1) - lo - 0.8 * ba; ba += g * h; lo += g * ba;
      x[i] = ba * 0.6 * Math.min(1, t / 0.01) * Math.exp(-t * 11) + Math.sin(t * 2 * Math.PI * 190 * (1 - t * 0.3)) * hueco * Math.min(1, t / 0.003) * Math.exp(-t * 18);
    }
  });
}

/**
 * El mercado Bến Thành (Saigón): el zumbido del techo alto y los ventiladores, la gente, las vendedoras que llaman
 * cantando (con los tonos del vietnamita: suben, bajan, se quiebran), las bolsas plásticas, la cuchilla del puesto de
 * carne contra la tabla, las monedas y, por las puertas, las motos que pasan afuera.
 */
const mercado: Ambiente = (buf, r) => {
  // el galpón: un rumor grave, el lavado de la gente y los ventiladores del techo que giran
  suma(buf, lowpass(pink(buf.length, r), 0.02), 0.32);
  suma(buf, bandpass(pink(buf.length, r), (i) => 950 + 250 * LFO(i, 0.07), 0.8), (i) => 0.13 + 0.05 * LFO(i, 0.19, 1));
  suma(buf, bandpass(pink(buf.length, r), () => 320, 0.4), (i) => 0.05 * (0.6 + 0.4 * Math.sin((i / RATE) * 4.3 * Math.PI * 2)));
  const c = capa(), m = new Mixer(12, true, 717);
  murmullo(c, 9, r, [120, 260], 0.2);
  // las vendedoras: "mua đi chị ơi", "rẻ lắm": frases cantadas, la altura que sube, baja o se quiebra en cada sílaba
  const llamadas: [number, [Vocal, number, number, number][], number][] = [
    [0.8, [['u', 0.14, 300, 340], ['i', 0.12, 330, 300], ['i', 0.16, 290, 360], ['o', 0.32, 360, 300]], 0.42],
    [3.9, [['e', 0.13, 260, 230], ['a', 0.2, 240, 300], ['a', 0.12, 300, 300], ['o', 0.3, 320, 250]], 0.36],
    [6.6, [['a', 0.12, 340, 380], ['i', 0.14, 380, 330], ['o', 0.36, 330, 390]], 0.34],
    [9.7, [['u', 0.12, 280, 320], ['a', 0.16, 310, 270], ['e', 0.12, 280, 330], ['a', 0.34, 330, 270]], 0.4],
  ];
  for (const [t, sil, v] of llamadas) frase(c, t, sil, v, r, 0.02);
  // las bolsas plásticas, cerca y lejos
  for (const [t, d, v] of [[1.7, 0.6, 0.09], [4.8, 0.45, 0.06], [7.3, 0.7, 0.08], [10.9, 0.5, 0.06]] as const) pon(c, t, bolsa(d, r), v);
  // el puesto de carne: la cuchilla en ráfagas de golpes
  for (const [t0, k] of [[2.3, 3], [8.2, 4]] as const) for (let j = 0; j < k; j++) cuchilla(m, t0 + j * 0.31, 0.3 - j * 0.03);
  // las monedas del vuelto
  moneda(m, 3.3, 0.06); moneda(m, 3.42, 0.05, 3900); moneda(m, 6.1, 0.05, 3600); moneda(m, 11.4, 0.05);
  // afuera, por las puertas: tres motos que pasan y una bocina
  for (const [t, f, v] of [[0.3, 46, 0.22], [5.2, 52, 0.18], [9.0, 40, 0.2]] as const) pon(c, t, lejos(moto(3.2, f, r), 0.18), v);
  bocina(m, 6.0, 450, 0.025, 2);
  const mo = m.out();
  for (let i = 0; i < LEN; i++) c[i] += mo[i];
  // el techo alto del galpón
  eco(c, 0.08, 0.3, 0.35);
  return c;
};

/**
 * El río Saigón: el agua que lame el muelle y el casco de un bote, el motor diésel del ferry que espera, lejos (un
 * "tuc-tuc" parejo), la sirena del ferry una vez con su eco en la otra orilla, los pájaros sobre el agua y la brisa.
 */
const rio: Ambiente = (buf, r) => {
  // la brisa del río y el agua que se mueve
  suma(buf, bandpass(pink(buf.length, r), (i) => 650 + 300 * LFO(i, 0.06) + 150 * LFO(i, 0.21, 1), 0.85), (i) => 0.14 + 0.12 * LFO(i, 0.083, 0.5));
  suma(buf, lowpass(pink(buf.length, r), 0.05), (i) => 0.35 * (0.3 + 0.7 * LFO(i, 0.37) * LFO(i, 0.11, 2)));
  const c = capa(), m = new Mixer(12, true, 718);
  // el agua contra el muelle y el casco: chapoteos que van y vienen, unos con el "bong" de la madera
  for (let k = 0; k < 30; k++) pon(c, k * 0.4 + r() * 0.25, chapoteo(r, 380 + r() * 500, r() < 0.35 ? 0.25 : 0), 0.22 + r() * 0.2);
  // el motor del ferry, lejos: cada explosión es un golpe en banda (que se oiga arriba de 150 Hz), 7.5 por segundo
  const motor = capa();
  for (let k = 0; k < 90; k++) pon(motor, k / 7.5, bandpass(suelto(0.09, (x) => { for (let i = 0; i < x.length; i++) x[i] = (r() * 2 - 1) * Math.exp(-(i / RATE) * 45); }), () => 210, 0.35), k % 2 ? 0.7 : 1);
  const mt = lowpass(motor, 0.3);
  for (let i = 0; i < LEN; i++) c[i] += mt[i] * 0.55;
  // la sirena del ferry, una vez: grave y ronca, con el eco de la otra orilla
  const sirena = capa();
  pon(sirena, 5.6, suelto(2.1, (x) => {
    let ph = 0;
    for (let i = 0; i < x.length; i++) {
      const t = i / RATE; ph += (185 * (1 + 0.004 * Math.sin(t * 5 * Math.PI * 2))) / RATE;
      const p = ph - Math.floor(ph);
      x[i] = ((2 * p - 1) * 0.6 + Math.sin(ph * Math.PI * 2 * 2) * 0.3) * Math.min(1, t / 0.12, (2.1 - t) / 0.35);
    }
  }), 1);
  eco(sirena, 0.55, 0.3, 0.5);
  const sr = lowpass(sirena, 0.18);
  for (let i = 0; i < LEN; i++) c[i] += sr[i] * 0.16;
  // los pájaros sobre el agua: golondrinas que pasan chillando y una garza lejos
  for (const t0 of [1.4, 7.9]) canto(c, t0, [[3600, 4100], [4000, 3500], [3700, 4200], [4100, 3600]], 0.06, 0.08);
  for (const t0 of [3.6, 10.6]) canto(c, t0, [[3300, 3900], [3800, 3300], [3500, 4000]], 0.05, 0.07);
  pon(c, 9.1, suelto(0.4, (x) => voz(x, 0, 0.35, 900, 650, 1, [1, 0.6, 0.35], 0.03, 25, 0.02)), 0.08);
  const mo = m.out();
  for (let i = 0; i < LEN; i++) c[i] += mo[i];
  return c;
};

/** Una vuvuzela o corneta de la barra: una sierra ronca de unos 233 Hz que tiembla, varias juntas un poco desafinadas. */
function vuvuzela(c: Float32Array, t0: number, dur: number, vol: number, r: () => number) {
  for (let v = 0; v < 3; v++) {
    const f = 233 * (1 + (r() - 0.5) * 0.025), d0 = r() * 0.06;
    pon(c, t0 + d0, lowpass(suelto(dur, (x) => {
      let ph = 0;
      for (let i = 0; i < x.length; i++) {
        const t = i / RATE; ph += (f * (1 + 0.006 * Math.sin(t * 6.5 * Math.PI * 2 + v))) / RATE;
        x[i] = (2 * (ph - Math.floor(ph)) - 1) * Math.min(1, t / 0.05, (dur - t) / 0.08);
      }
    }), 0.3), vol);
  }
}

/**
 * El estadio, llegando al final del Cross: el público de un estadio grande que ruge en olas, aplausos, la barra con su
 * bombo y las cornetas a lo lejos, un pitazo del árbitro y el parlante que anuncia, todo con el eco de las tribunas.
 */
const estadio: Ambiente = (buf, r) => {
  // el público: un rumor ancho que no para
  suma(buf, bandpass(pink(buf.length, r), (i) => 850 + 300 * LFO(i, 0.09), 0.7), (i) => 0.3 + 0.1 * LFO(i, 0.13, 1));
  suma(buf, lowpass(pink(buf.length, r), 0.03), 0.3);
  const c = capa(), m = new Mixer(12, true, 719);
  murmullo(c, 14, r, [130, 300], 0.14, 0.5);
  // las olas del rugido: el estadio entero que se levanta y baja
  for (const [t, d, v] of [[0.6, 3.2, 0.6], [6.4, 4.2, 0.75]] as const) {
    const g = suelto(d, (x) => { for (let i = 0; i < x.length; i++) { const u = i / x.length; x[i] = (r() * 2 - 1) * Math.pow(Math.sin(Math.PI * u), 1.5) * (1 - 0.4 * u); } });
    pon(c, t, bandpass(g, (i) => 900 + 400 * Math.sin((Math.PI * i) / g.length), 0.6), v);
  }
  // los aplausos: sueltos todo el tiempo y en racha cuando ruge
  for (let k = 0; k < 60; k++) m.drum('palmas', r() * 12, 0.08 + r() * 0.1);
  for (let k = 0; k < 50; k++) m.drum('palmas', 1.4 + r() * 2, 0.12 + r() * 0.14);
  // la barra, lejos: el bombo "pum, pum, pum-pum-pum" y las cornetas que contestan
  const barra = new Mixer(12, true, 720);
  for (let b = 0; b < 6; b++) for (const [dt, v] of [[0, 1], [0.5, 1], [1.0, 0.8], [1.25, 0.8], [1.5, 1]] as const) {
    const t = b * 2 + dt;
    // el bombo de la barra: el parche grave (que se oiga en un teléfono) y el mazo que pega
    barra.add({ t, dur: 0.02, f: 125, wave: 'sine', vol: v * 0.5, s: 1, r: 0.2, bend: { semis: -5, len: 0.15 } });
    barra.add({ t, dur: 0.01, f: 1000, wave: 'noise', vol: v * 0.45, s: 1, r: 0.07, lp: 0.2 });
  }
  const ba = barra.out();
  const bl = lejos(ba, 0.25);
  for (let i = 0; i < LEN; i++) c[i] += bl[i] * 0.45;
  const cornetas = capa();
  for (const t of [2.2, 4.2, 8.2, 10.2]) { vuvuzela(cornetas, t, 0.25, 0.5, r); vuvuzela(cornetas, t + 0.3, 0.25, 0.5, r); vuvuzela(cornetas, t + 0.6, 0.6, 0.55, r); }
  const cl = lejos(cornetas, 0.35);
  for (let i = 0; i < LEN; i++) c[i] += cl[i] * 0.22;
  // el pitazo del árbitro, una vez
  m.add({ t: 9.3, dur: 0.42, f: 2820, wave: 'sine', vol: 0.2, a: 0.015, s: 0.9, r: 0.06, vib: [31, 0.45, 0] });
  // el parlante: el locutor que anuncia, por la bocina, con el eco largo de las tribunas
  const pa = capa();
  frase(pa, 4.6, [['a', 0.14, 150, 160], ['e', 0.12, 160, 150], ['o', 0.16, 150, 170], ['a', 0.42, 175, 140]], 1, r);
  const pah = highpass(pa, 0.15);
  for (let i = 0; i < LEN; i++) c[i] += Math.tanh(pah[i] * 5) * 0.05;
  const mo = m.out();
  for (let i = 0; i < LEN; i++) c[i] += mo[i];
  eco(c, 0.27, 0.4, 0.5);
  return c;
};

/** Los ambientes de los mundos (lote H7, y detrás los de B7H8 y H2 corto), en el orden del pedido de Rick. */
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
  // lote B7H8
  parque_tao_dan: parqueTaoDan,
  barrio_caracas: barrioCaracas,
  dojo_hanoi: dojoHanoi,
  // lote H2 corto
  mercado,
  rio,
  estadio,
};
