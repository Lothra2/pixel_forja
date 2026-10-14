import { RATE } from './sfx';

/**
 * Sonido del final (encargo F13): la heroína celestial y las dos cinemáticas. Va aparte de sfx.ts a propósito: tiene
 * su propio generador de ruido, así agregar estos sonidos no cambia ni un bit de los de antes.
 *
 * Más "de orquesta" que los efectos del juego: coro sin palabras (vocal "aah" armada con armónicos y formantes),
 * cuerdas graves (sierra filtrada con varias voces desafinadas), timbales, campanas y viento. Todo en 22050 Hz mono.
 */

class Rng {
  constructor(private s: number) {}
  next(): number { this.s = (this.s * 16807) % 2147483647; return this.s / 2147483647; }
}

const NOTAS: Record<string, number> = { C: -9, 'C#': -8, Db: -8, D: -7, 'D#': -6, Eb: -6, E: -5, F: -4, 'F#': -3, Gb: -3, G: -2, 'G#': -1, Ab: -1, A: 0, 'A#': 1, Bb: 1, B: 2 };
/** 'A4' > 440 */
export function nota(n: string): number {
  const m = /^([A-G][#b]?)(-?\d)$/.exec(n);
  if (!m) throw new Error(`nota inválida: ${n}`);
  return 440 * Math.pow(2, (NOTAS[m[1]] + (Number(m[2]) - 4) * 12) / 12);
}

export class Pista {
  readonly buf: Float32Array;
  readonly rng: Rng;
  constructor(readonly seg: number, semilla: number) { this.buf = new Float32Array(Math.ceil(seg * RATE)); this.rng = new Rng(semilla); }

  /** envolvente: ataque, sostén y caída (segundos) */
  private env(i: number, n: number, a: number, r: number): number {
    const t = i / RATE, d = n / RATE;
    const at = a > 0 ? Math.min(1, t / a) : 1;
    const rel = r > 0 ? Math.min(1, (d - t) / r) : 1;
    return Math.max(0, at * rel);
  }

  /** coro sin palabras: vocal "aah" (formantes en 700, 1200 y 2600 Hz), varias voces desafinadas con vibrato */
  coro(at: number, dur: number, f: number, vol: number, o: { a?: number; r?: number; voces?: number; vocal?: 'a' | 'o' | 'u' } = {}) {
    const F = o.vocal === 'o' ? [450, 800, 2830] : o.vocal === 'u' ? [325, 700, 2530] : [700, 1220, 2600];
    const voces = o.voces ?? 4;
    const s0 = Math.floor(at * RATE), n = Math.floor(dur * RATE);
    const armon: { k: number; amp: number }[] = [];
    for (let k = 1; k * f < 4000; k++) {
      const h = k * f;
      // peso de cada armónico según lo cerca que cae de cada formante
      const w = F.reduce((s, fm, q) => s + [1, 0.5, 0.15][q] / (1 + ((h - fm) / (fm * 0.12)) ** 2), 0);
      armon.push({ k, amp: (w + 0.02) / Math.sqrt(k) });
    }
    const tot = armon.reduce((s, a) => s + a.amp, 0);
    for (let v = 0; v < voces; v++) {
      const det = 1 + (this.rng.next() - 0.5) * 0.012, vibF = 4.6 + this.rng.next() * 1.2, vibP = this.rng.next() * 6;
      const fases = armon.map(() => this.rng.next());
      for (let i = 0; i < n && s0 + i < this.buf.length; i++) {
        const t = i / RATE;
        const vib = 1 + Math.sin(t * vibF * Math.PI * 2 + vibP) * 0.004 * Math.min(1, t / 0.6);
        const ff = f * det * vib;
        let s = 0;
        for (let q = 0; q < armon.length; q++) s += Math.sin((fases[q] + ff * armon[q].k * t) * Math.PI * 2) * armon[q].amp;
        this.buf[s0 + i] += (s / tot) * this.env(i, n, o.a ?? 0.8, o.r ?? 1) * vol / voces;
      }
    }
  }

  /** cuerdas: sierra filtrada con tres voces desafinadas; `brillo` 0..1 abre el filtro */
  cuerdas(at: number, dur: number, f: number, vol: number, o: { a?: number; r?: number; brillo?: number } = {}) {
    const s0 = Math.floor(at * RATE), n = Math.floor(dur * RATE);
    const lpk = 0.02 + (o.brillo ?? 0.3) * 0.25;
    for (const det of [0.996, 1, 1.004]) {
      let ph = this.rng.next(), lp = 0, lp2 = 0;
      for (let i = 0; i < n && s0 + i < this.buf.length; i++) {
        const t = i / RATE;
        ph += (f * det * (1 + Math.sin(t * 5.2 * Math.PI * 2) * 0.002)) / RATE;
        const s = (ph % 1) * 2 - 1;
        lp += (s - lp) * lpk; lp2 += (lp - lp2) * lpk;
        this.buf[s0 + i] += lp2 * this.env(i, n, o.a ?? 0.4, o.r ?? 0.6) * vol / 3;
      }
    }
  }

  /** timbal: seno que cae de tono más un golpe de ruido grave */
  timbal(at: number, f: number, vol: number, dur = 1.6) {
    const s0 = Math.floor(at * RATE), n = Math.floor(dur * RATE);
    let ph = 0, lp = 0;
    for (let i = 0; i < n && s0 + i < this.buf.length; i++) {
      const t = i / RATE;
      ph += (f * (1 + 0.5 * Math.exp(-t * 18))) / RATE;
      lp += ((this.rng.next() * 2 - 1) - lp) * 0.08;
      const s = Math.sin(ph * Math.PI * 2) * Math.exp(-t * 2.4) + lp * Math.exp(-t * 14) * 0.8;
      this.buf[s0 + i] += s * vol;
    }
  }

  /** campana: parciales inarmónicos que se apagan despacio */
  campana(at: number, f: number, vol: number, dur = 3) {
    const s0 = Math.floor(at * RATE), n = Math.floor(dur * RATE);
    const parc = [[1, 1], [2.01, 0.55], [2.76, 0.4], [5.4, 0.2], [8.9, 0.1]];
    for (let i = 0; i < n && s0 + i < this.buf.length; i++) {
      const t = i / RATE;
      let s = 0;
      for (const [k, a] of parc) s += Math.sin(f * k * t * Math.PI * 2) * a * Math.exp(-t * (1.2 + k * 0.5));
      this.buf[s0 + i] += s * vol * Math.min(1, t / 0.003);
    }
  }

  /** seno puro con deslizamiento (brillos, zumbidos graves) */
  seno(at: number, dur: number, f0: number, f1: number, vol: number, a = 0.01, r = 0.1) {
    const s0 = Math.floor(at * RATE), n = Math.floor(dur * RATE);
    let ph = 0;
    for (let i = 0; i < n && s0 + i < this.buf.length; i++) {
      ph += (f0 + (f1 - f0) * (i / n)) / RATE;
      this.buf[s0 + i] += Math.sin(ph * Math.PI * 2) * this.env(i, n, a, r) * vol;
    }
  }

  /** ruido filtrado (viento, soplido): `lp` 0..1 de grave a agudo, el volumen sigue la curva `forma` (0..1 en el tiempo) */
  ruido(at: number, dur: number, vol: number, lpk: number, forma: (t: number) => number = () => 1, hp = 0) {
    const s0 = Math.floor(at * RATE), n = Math.floor(dur * RATE);
    let lp = 0, lp2 = 0, prev = 0;
    for (let i = 0; i < n && s0 + i < this.buf.length; i++) {
      lp += ((this.rng.next() * 2 - 1) - lp) * lpk; lp2 += (lp - lp2) * lpk;
      let s = lp2;
      if (hp) { const h = s - prev; prev = s; s = h * (1 / Math.max(0.05, hp)); }
      this.buf[s0 + i] += s * vol * forma(i / n) * 3;
    }
  }

  /** gruñido grave (el Diablo): sierra grave con el tono que cae, modulada por un ruido lento, todo muy filtrado */
  grunido(at: number, dur: number, f0: number, f1: number, vol: number) {
    const s0 = Math.floor(at * RATE), n = Math.floor(dur * RATE);
    let ph = 0, lp = 0, lp2 = 0, mod = 0;
    for (let i = 0; i < n && s0 + i < this.buf.length; i++) {
      const u = i / n;
      mod += ((this.rng.next() * 2 - 1) - mod) * 0.004;
      ph += ((f0 + (f1 - f0) * u) * (1 + mod * 0.15)) / RATE;
      const saw = (ph % 1) * 2 - 1;
      const s = saw * (0.6 + 0.4 * Math.abs(Math.sin(ph * Math.PI * 0.5))) + (this.rng.next() * 2 - 1) * 0.35;
      lp += (s - lp) * 0.06; lp2 += (lp - lp2) * 0.06;
      const env = Math.min(1, u / 0.12) * Math.pow(1 - u, 0.8);
      this.buf[s0 + i] += lp2 * env * vol * (1 + mod * 2);
    }
  }

  /** eco de sala grande: tres ecos con filtro (se aplica al final) */
  eco(mezcla = 0.3, demora = 0.21) {
    const b = this.buf, d = [demora, demora * 1.63, demora * 2.41].map((x) => Math.floor(x * RATE));
    const out = new Float32Array(b.length);
    for (let i = 0; i < b.length; i++) {
      let s = b[i];
      for (let k = 0; k < d.length; k++) if (i >= d[k]) s += out[i - d[k]] * mezcla * (0.7 - k * 0.15);
      out[i] = s;
    }
    let lp = 0;
    for (let i = 0; i < b.length; i++) { lp += (out[i] - lp) * 0.5; b[i] = lp; }
  }

  /** deja el pico en p y apaga los últimos `fin` segundos */
  listo(p = 0.6, fin = 0.3): Float32Array {
    const b = this.buf;
    let m = 0;
    for (const v of b) m = Math.max(m, Math.abs(v));
    const nf = Math.floor(fin * RATE);
    for (let i = 0; i < b.length; i++) {
      b[i] *= m > 0 ? p / m : 0;
      const q = b.length - i;
      if (q < nf) b[i] *= q / nf;
    }
    return b;
  }
}

// ---------------------------------------------------------------- la heroína celestial

/** Un aleteo de luz: dos soplidos de plumas y un brillo que sube. 0.8 s */
export function alasVuelo(): Float32Array {
  const p = new Pista(0.8, 70101);
  for (const [at, v] of [[0, 1], [0.28, 0.75]] as [number, number][]) p.ruido(at, 0.32, 0.5 * v, 0.12, (t) => Math.sin(Math.PI * Math.min(1, t * 1.6)) ** 2);
  p.seno(0.02, 0.6, 1320, 2640, 0.08, 0.02, 0.4);
  p.seno(0.1, 0.55, 1980, 3300, 0.05, 0.02, 0.4);
  return p.listo(0.5, 0.1);
}

/** La lanza de luz: un zumbido brillante que sube, un golpe de campana y la estela. 1 s */
export function lanzaLuzSonido(): Float32Array {
  const p = new Pista(1.1, 70202);
  p.seno(0, 0.35, 440, 1760, 0.35, 0.005, 0.1);
  p.seno(0, 0.35, 660, 2640, 0.18, 0.005, 0.1);
  p.ruido(0, 0.35, 0.25, 0.5, (t) => 1 - t);
  p.campana(0.3, nota('E6'), 0.25, 0.8);
  p.campana(0.3, nota('B6'), 0.12, 0.7);
  p.seno(0.3, 0.7, 2637, 2637, 0.05, 0.01, 0.5);
  p.eco(0.25, 0.09);
  return p.listo(0.5, 0.15);
}

/** Despierta la celestial: un coro corto sin palabras que se abre en Do mayor con campanas. 3.4 s */
export function celestialDespierta(): Float32Array {
  const p = new Pista(3.6, 70303);
  for (const [n, v] of [['C4', 0.9], ['E4', 0.7], ['G4', 0.7], ['C5', 0.6]] as [string, number][]) p.coro(0.05, 2.9, nota(n), 0.5 * v, { a: 0.5, r: 1.4, voces: 3 });
  p.coro(0.9, 2.2, nota('D5'), 0.18, { a: 0.4, r: 1.2, voces: 2 });
  for (const [at, n] of [[0.1, 'G6'], [0.45, 'C7'], [0.8, 'E7'], [1.2, 'G7']] as [number, string][]) p.campana(at, nota(n), 0.06, 2);
  p.eco(0.35, 0.17);
  return p.listo(0.6, 0.4);
}

// ---------------------------------------------------------------- la cinemática de bajada

/** El rugido del Diablo: grave, largo, que retumba. Sin grito: nada agudo. 3 s */
export function cineRugido(): Float32Array {
  const p = new Pista(3.2, 70404);
  p.grunido(0, 2.8, 62, 44, 1);
  p.grunido(0.05, 2.7, 93, 66, 0.55);
  p.ruido(0, 2.8, 0.35, 0.03, (t) => Math.min(1, t * 5) * (1 - t));
  p.timbal(0, 41, 0.6, 2.5);
  p.eco(0.35, 0.23);
  return p.listo(0.7, 0.3);
}

/**
 * La música de la bajada (60 s): Re menor, grave y épica, que crece hasta el título.
 *   0 a 10 s   viento y un zumbido grave (la Puerta se abre)
 *   10 a 20 s  cuerdas graves en ostinato (la escalera)
 *   20 a 30 s  el coro en "u", grave (el lago)
 *   30 a 40 s  timbales lentos como pasos (la Ladrona)
 *   40 a 50 s  todo junto y subiendo, un latido (el Diablo despierta)
 *   50.5 s     el golpe del título, y la cola hasta 60
 */
export function cineBajadaMusica(): Float32Array {
  const S = 60, p = new Pista(S, 70505);
  // viento que nunca para
  p.ruido(0, S, 0.18, 0.015, (t) => 0.5 + 0.5 * Math.sin(t * Math.PI * 7) ** 2);
  // pedal grave en Re, todo el tiempo
  p.seno(0, 50.5, nota('D1'), nota('D1'), 0.28, 4, 0.5);
  p.cuerdas(0, 50.5, nota('D2'), 0.22, { a: 6, r: 0.3, brillo: 0.1 });
  // la escalera: ostinato de corcheas graves (Re, Fa, Mi, Re, La...) que va abriendo el filtro
  const osti = ['D3', 'F3', 'E3', 'D3', 'A2', 'D3', 'F3', 'G3'];
  for (let k = 0, t = 10; t < 50; k++, t += 0.5) p.cuerdas(t, 0.45, nota(osti[k % osti.length]), 0.12 + (t - 10) / 40 * 0.12, { a: 0.02, r: 0.2, brillo: 0.15 + (t - 10) / 40 * 0.5 });
  // armonía: Rem, Sib, Sol m, La (la tensión antes del título)
  const acordes: [number, string[]][] = [[20, ['D3', 'F3', 'A3']], [25, ['Bb2', 'D3', 'F3']], [30, ['G2', 'Bb2', 'D3']], [35, ['D3', 'F3', 'A3']], [40, ['Bb2', 'D3', 'F3']], [45, ['A2', 'C#3', 'E3']]];
  for (const [t, ns] of acordes) for (const n of ns) p.coro(t, 5.4, nota(n), 0.2 + (t - 20) / 25 * 0.2, { a: 1.2, r: 1.2, voces: 3, vocal: t < 40 ? 'u' : 'a' });
  // pasos de la Ladrona: timbales lentos
  for (let t = 30; t < 40; t += 1.25) p.timbal(t, 55, 0.35);
  // el despertar: latido que se acelera
  for (let t = 40, k = 0; t < 50; k++, t += Math.max(0.42, 0.9 - k * 0.04)) { p.timbal(t, 46, 0.55, 0.6); p.timbal(t + 0.18, 46, 0.35, 0.5); }
  // silencio de medio segundo y el golpe del título
  p.timbal(50.5, 36, 0.9, 4);
  p.timbal(50.5, 55, 0.6, 3);
  for (const n of ['D2', 'A2', 'D3', 'F3', 'A3', 'D4']) p.coro(50.5, 8.5, nota(n), 0.85, { a: 0.05, r: 5, voces: 3, vocal: 'a' });
  p.cuerdas(50.5, 8.5, nota('D2'), 0.9, { a: 0.02, r: 6, brillo: 0.6 });
  p.cuerdas(50.5, 8.5, nota('A2'), 0.6, { a: 0.02, r: 6, brillo: 0.6 });
  p.campana(50.5, nota('D5'), 0.12, 6);
  p.eco(0.32, 0.27);
  // el hueco antes del golpe
  for (let i = Math.floor(50 * RATE); i < Math.floor(50.48 * RATE); i++) p.buf[i] *= 0.05;
  return p.listo(0.75, 1.5);
}

// ---------------------------------------------------------------- la cinemática de cierre

/**
 * La música del cierre (72 s): de oscura a luminosa, con el tema del Bosque al final.
 *   0 a 12 s   Re menor apagado: un pedal, el coro en "u" que baja (el Diablo cae)
 *   12 a 24 s  una campana sola y el primer acorde mayor (la última llama vuelve)
 *   24 a 36 s  las cuerdas suben piso por piso, de Re a Re dos octavas arriba (las luces suben)
 *   36 a 54 s  Do mayor pleno: el tema del Bosque en campanas y coro (el amanecer)
 *   54 a 64 s  las alas: el coro abre en Fa y vuelve a Do
 *   64 a 72 s  "Fin": acorde final y campanas
 */
export function cineFinMusica(): Float32Array {
  const S = 72, p = new Pista(S, 70606);
  // oscuro
  p.seno(0, 13, nota('D1'), nota('D1'), 0.12, 2, 4);
  for (const [t, n] of [[0, 'A3'], [3, 'G3'], [6, 'F3'], [9, 'E3']] as [number, string][]) p.coro(t, 3.6, nota(n), 0.16, { a: 0.8, r: 1.2, voces: 3, vocal: 'u' });
  p.timbal(0.2, 40, 0.45, 3);
  // la llama: campana sola y el primer acorde mayor (Re mayor)
  for (const t of [12, 14, 16, 18]) p.campana(t, nota('A5'), 0.18, 2.6);
  for (const n of ['D3', 'F#3', 'A3', 'D4']) p.coro(16, 8.5, nota(n), 0.28, { a: 2, r: 2, voces: 3 });
  // las luces suben: escala de Re mayor en cuerdas, cada piso más arriba y más brillante
  const escala = ['D3', 'E3', 'F#3', 'G3', 'A3', 'B3', 'C#4', 'D4', 'E4', 'F#4', 'G4', 'A4', 'B4', 'C#5', 'D5'];
  escala.forEach((n, k) => { const t = 24 + k * 0.8; p.cuerdas(t, 1.4, nota(n), 0.2, { a: 0.05, r: 0.8, brillo: 0.3 + k / escala.length * 0.6 }); if (k % 2 === 0) p.campana(t, nota(n) * 4, 0.05, 1.5); });
  for (const n of ['G2', 'D3', 'G3', 'B3']) p.coro(30, 6.5, nota(n), 0.22, { a: 1.5, r: 1.5, voces: 3 });
  p.timbal(35.6, 49, 0.6, 2);
  // el amanecer: el tema del Bosque (el mismo de musica_bosque) en campanas, con coro y cuerdas en Do mayor
  const tema = [
    'E5', '-', 'G5', '-', 'A5', '-', 'G5', 'E5', 'D5', '-', 'E5', '-', 'C5', '-', '-', '-',
    'E5', '-', 'G5', '-', 'C6', '-', 'B5', 'A5', 'G5', '-', '-', '-', '.', '.', '.', '.',
  ];
  const beat = 60 / 84 / 2;
  const t0 = 36;
  for (let i = 0; i < tema.length; i++) {
    const n = tema[i];
    if (n === '-' || n === '.') continue;
    let len = 1;
    while (tema[i + len] === '-') len++;
    p.campana(t0 + i * beat, nota(n), 0.22, 2.4);
    p.seno(t0 + i * beat, beat * len * 0.95, nota(n), nota(n), 0.1, 0.02, 0.2);
  }
  const armon: [number, string[]][] = [[36, ['C3', 'E3', 'G3', 'C4']], [39, ['A2', 'C3', 'E3', 'A3']], [42, ['F2', 'A2', 'C3', 'F3']], [45, ['G2', 'B2', 'D3', 'G3']], [48, ['C3', 'E3', 'G3', 'C4']], [51, ['G2', 'B2', 'D3', 'G3']]];
  for (const [t, ns] of armon) { for (const n of ns) p.coro(t, 3.4, nota(n), 0.2, { a: 0.6, r: 0.8, voces: 2 }); p.cuerdas(t, 3.2, nota(ns[0]) / 2, 0.2, { a: 0.3, r: 0.8, brillo: 0.4 }); }
  // las alas: coro que se abre en Fa y vuelve a Do
  for (const n of ['F3', 'A3', 'C4', 'F4']) p.coro(54, 5, nota(n), 0.3, { a: 1.2, r: 1.5, voces: 3 });
  for (const n of ['C3', 'E3', 'G3', 'C4', 'E4']) p.coro(59, 13, nota(n), 0.5, { a: 1.5, r: 4, voces: 3 });
  for (const [t, n] of [[54.5, 'C6'], [55.5, 'F6'], [56.5, 'A6'], [57.5, 'C7'], [64, 'C6'], [64, 'G6'], [65, 'E7']] as [number, string][]) p.campana(t, nota(n), 0.1, 3);
  p.timbal(59, 49, 0.7, 3);
  p.eco(0.3, 0.25);
  return p.listo(0.72, 3);
}
