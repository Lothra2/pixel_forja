/*
 * Sonido procedural (solo WebAudio, sin archivos, sin dependencias).
 *
 * - Bus maestro: compresor suave -> limitador -> destino.
 * - Reverb oscura con respuesta al impulso generada.
 * - Musica generativa con semilla (planificador con anticipacion via setInterval).
 * - Capa de combate, lechos de ambiente, susurros y latido.
 * - Efectos sintetizados con limite de voces y anti-repeticion.
 *
 * Todo falla en silencio si no hay AudioContext.
 */

export type Musica =
  | 'menu' | 'intro'
  | 'campamento1' | 'campamento2' | 'campamento3' | 'campamento4' | 'campamento5' | 'campamento6' | 'campamento7'
  | 'acto1' | 'acto2' | 'acto3' | 'acto4' | 'acto5' | 'acto6' | 'acto7'
  | 'mazmorra' | 'mazmorra2' | 'mazmorra3' | 'mazmorra4' | 'mazmorra5' | 'mazmorra6' | 'mazmorra7' | 'jefe' | null;

type IdAmbiente = 'lluvia' | 'viento' | 'fuego' | 'cueva' | 'selva' | 'infierno' | 'nada';
interface OpcionesEfecto { pan?: number; vol?: number; tono?: number; dist?: number }

// ============================================================================
// Estado del motor
// ============================================================================

let ac!: AudioContext;
let listo = false;
let fallido = false;
let maestro!: GainNode;
let busMusica!: GainNode;
let busEfectos!: GainNode;
/** Efectos de horror (gore, sustos, susurros, latido y dron): con volumen propio en Opciones. */
let busHorror!: GainNode;
let busAmbiente!: GainNode;
let revEntrada!: GainNode;
let ruidos: AudioBuffer[] = [];
let reloj: ReturnType<typeof setInterval> | null = null;

const vols = { general: 0.8, musica: 0.6, efectos: 0.8, horror: 0.8 };

const BLANCO = 0;
const ROSA = 1;
const MARRON = 2;

// ============================================================================
// Utilidades
// ============================================================================

const al = (a: number, b: number): number => a + Math.random() * (b - a);
const elegir = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)] as T;
const lim = (x: number, a: number, b: number): number => (x < a ? a : x > b ? b : x);
const mtof = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);
const EPS = 0.0001;

function mulberry32(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function ahoraMs(): number {
  try { return performance.now(); } catch { return Date.now(); }
}

// ---------- nodos ----------

function gan(v: number, dest?: AudioNode | null): GainNode {
  const g = ac.createGain();
  g.gain.value = v;
  if (dest) g.connect(dest);
  return g;
}

function filt(tipo: BiquadFilterType, f: number, q: number, dest?: AudioNode | null): BiquadFilterNode {
  const b = ac.createBiquadFilter();
  b.type = tipo;
  b.frequency.value = f;
  b.Q.value = q;
  if (dest) b.connect(dest);
  return b;
}

function osc(tipo: OscillatorType, f: number, t: number, fin: number, dest: AudioNode | null, det = 0): OscillatorNode {
  const o = ac.createOscillator();
  o.type = tipo;
  o.frequency.setValueAtTime(f, t);
  if (det) o.detune.value = det;
  if (dest) o.connect(dest);
  o.start(t);
  o.stop(fin);
  return o;
}

function ruido(t: number, fin: number, dest: AudioNode, tipo = BLANCO): AudioBufferSourceNode {
  const s = ac.createBufferSource();
  const buf = ruidos[tipo] as AudioBuffer;
  s.buffer = buf;
  s.loop = true;
  s.connect(dest);
  s.start(t, Math.random() * (buf.duration - 0.1));
  s.stop(fin);
  return s;
}

/** Envolvente percusiva exponencial. */
function env(p: AudioParam, t: number, ataque: number, pico: number, caida: number): void {
  const pk = Math.max(pico, 0.0002);
  p.setValueAtTime(EPS, t);
  p.exponentialRampToValueAtTime(pk, t + Math.max(ataque, 0.001));
  p.exponentialRampToValueAtTime(EPS, t + ataque + Math.max(caida, 0.005));
}

/** Envolvente sostenida: ataque lineal, mantiene, cae exponencial. */
function envSost(p: AudioParam, t: number, ataque: number, v: number, dur: number, rel: number): void {
  const vv = Math.max(v, 0.0002);
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(vv, t + ataque);
  p.setValueAtTime(vv, t + Math.max(dur, ataque + 0.001));
  p.exponentialRampToValueAtTime(EPS, t + Math.max(dur, ataque + 0.001) + rel);
}

const curvas = new Map<number, Float32Array<ArrayBuffer>>();
function curva(k: number): Float32Array<ArrayBuffer> {
  let c = curvas.get(k);
  if (!c) {
    const n = 1024;
    c = new Float32Array(n);
    const th = Math.tanh(k);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / (n - 1) - 1;
      c[i] = Math.tanh(k * x) / th;
    }
    curvas.set(k, c);
  }
  return c;
}

function dist(k: number, dest: AudioNode): WaveShaperNode {
  const w = ac.createWaveShaper();
  w.curve = curva(k);
  w.oversample = 'none';
  w.connect(dest);
  return w;
}

function lfo(f: number, prof: number, param: AudioParam, t: number, fin: number, tipo: OscillatorType = 'sine'): OscillatorNode {
  const g = gan(prof);
  g.connect(param);
  return osc(tipo, f, t, fin, g);
}

// ---------- formantes ----------

const VOCALES: Record<string, readonly [number, number, number]> = {
  a: [800, 1150, 2900],
  e: [450, 1900, 2600],
  i: [300, 2300, 3000],
  o: [450, 800, 2830],
  u: [325, 700, 2530],
};

/** Banco de 3 pasabandas en paralelo; devuelve la entrada y los filtros. */
function formantes(vocal: string, dest: AudioNode, escala = 1): { entrada: GainNode; filtros: BiquadFilterNode[] } {
  const v = VOCALES[vocal] ?? VOCALES.a as readonly [number, number, number];
  const entrada = gan(1);
  const ganancias = [1, 0.55, 0.28];
  const qs = [7, 10, 14];
  const filtros: BiquadFilterNode[] = [];
  for (let i = 0; i < 3; i++) {
    const g = gan(ganancias[i] as number, dest);
    const b = filt('bandpass', (v[i] as number) * escala, qs[i] as number, g);
    entrada.connect(b);
    filtros.push(b);
  }
  return { entrada, filtros };
}

// ---------- campana FM ----------

function campanaFM(dest: AudioNode, t: number, f: number, dur: number, v: number): void {
  const fin = t + dur + 0.1;
  const g = gan(0, dest);
  env(g.gain, t, 0.004, v, dur);
  const car = osc('sine', f, t, fin, g);
  const mod = ac.createOscillator();
  mod.frequency.value = f * 1.414;
  const mg = gan(0);
  mg.gain.setValueAtTime(f * 2.2, t);
  mg.gain.exponentialRampToValueAtTime(f * 0.05, t + dur * 0.6);
  mod.connect(mg);
  mg.connect(car.frequency);
  mod.start(t);
  mod.stop(fin);
  const g2 = gan(0, dest);
  env(g2.gain, t, 0.002, v * 0.35, dur * 0.35);
  osc('sine', f * 2.756, t, fin, g2);
  const g3 = gan(0, dest);
  env(g3.gain, t, 0.02, v * 0.25, dur * 1.1);
  osc('sine', f * 0.5, t, fin + dur * 0.1, g3);
}

// ============================================================================
// Inicializacion del grafo
// ============================================================================

function crearRuidos(): void {
  const sr = ac.sampleRate;
  const len = Math.floor(sr * 3);
  const bB = ac.createBuffer(1, len, sr);
  const bR = ac.createBuffer(1, len, sr);
  const bM = ac.createBuffer(1, len, sr);
  const dB = bB.getChannelData(0);
  const dR = bR.getChannelData(0);
  const dM = bM.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, ult = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    dB[i] = w;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    dR[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
    ult = (ult + 0.02 * w) / 1.02;
    dM[i] = ult * 3.5;
  }
  // fundido de los bordes para bucles sin click
  const fade = Math.floor(sr * 0.01);
  for (const d of [dB, dR, dM]) {
    for (let i = 0; i < fade; i++) {
      const k = i / fade;
      d[i] = (d[i] as number) * k;
      d[len - 1 - i] = (d[len - 1 - i] as number) * k;
    }
  }
  ruidos = [bB, bR, bM];
}

function crearImpulso(dur: number): AudioBuffer {
  const sr = ac.sampleRate;
  const len = Math.floor(sr * dur);
  const buf = ac.createBuffer(2, len, sr);
  const pre = Math.floor(sr * 0.025);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let y = 0;
    for (let i = 0; i < len; i++) {
      if (i < pre) { d[i] = 0; continue; }
      const x = (i - pre) / (len - pre);
      // cada vez mas oscuro: el pasabajos de un polo se cierra con el tiempo
      const a = 0.5 * (1 - x) * (1 - x) + 0.025;
      y += a * (Math.random() * 2 - 1 - y);
      d[i] = y * Math.pow(1 - x, 2.4);
    }
    // reflexiones tempranas
    for (let r = 0; r < 6; r++) {
      const idx = pre + Math.floor(sr * al(0.005, 0.08));
      if (idx < len) d[idx] = (d[idx] as number) + al(-0.5, 0.5) * (1 - r / 6);
    }
  }
  return buf;
}

function construirGrafo(): void {
  crearRuidos();
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.knee.value = 12;
  comp.ratio.value = 3;
  comp.attack.value = 0.01;
  comp.release.value = 0.3;
  const limitador = ac.createDynamicsCompressor();
  limitador.threshold.value = -4;
  limitador.knee.value = 0;
  limitador.ratio.value = 20;
  limitador.attack.value = 0.002;
  limitador.release.value = 0.15;
  comp.connect(limitador);
  limitador.connect(ac.destination);
  maestro = gan(vols.general, comp);

  const conv = ac.createConvolver();
  conv.buffer = crearImpulso(3.4);
  const revSalida = gan(0.9, maestro);
  conv.connect(revSalida);
  const revHp = filt('highpass', 120, 0.7, conv);
  revEntrada = gan(1, revHp);

  busMusica = gan(0, maestro);
  busEfectos = gan(0, maestro);
  busAmbiente = gan(0, maestro);
  busHorror = gan(0, maestro);
  aplicarVolumen();
  crearDronJefe();

  crearCombate();
  crearLatido();
}

function aplicarVolumen(): void {
  if (!listo) return;
  const t = ac.currentTime;
  maestro.gain.setTargetAtTime(vols.general, t, 0.05);
  busMusica.gain.setTargetAtTime(vols.musica * 0.75, t, 0.05);
  busEfectos.gain.setTargetAtTime(vols.efectos, t, 0.05);
  busAmbiente.gain.setTargetAtTime(vols.efectos * 0.65, t, 0.05);
  busHorror.gain.setTargetAtTime(vols.horror, t, 0.05);
}

// ============================================================================
// Voces de efectos
// ============================================================================

const MAX_VOCES = 24;
let vocesFin: number[] = [];
const ultimoEfecto = new Map<string, number>();

const REVERB_EXTRA: Record<string, number> = {
  campana: 0.55, trueno: 0.4, muerte_heroe: 0.5, santuario: 0.5, mision: 0.4, rugido_jefe: 0.35,
  portal: 0.35, nivel: 0.35, objeto_unico: 0.35, invocar: 0.3, sombra: 0.3, luz: 0.3, nova: 0.2,
  explosion: 0.2, susurro: 0.6, teletransporte: 0.3, chillido: 0.25,
};

function hayHueco(): boolean {
  const t = ac.currentTime;
  vocesFin = vocesFin.filter((f) => f > t);
  return vocesFin.length < MAX_VOCES;
}

/** Crea la cadena de una voz: entrada -> pasabajos (distancia) -> paneo -> bus + reverb. */
function crearVoz(vol: number, pan: number, d: number, extraRev: number, bus: AudioNode): GainNode {
  const entrada = gan(vol * (1 - 0.85 * d));
  const lp = filt('lowpass', 18000 - 15000 * d, 0.5);
  entrada.connect(lp);
  let salida: AudioNode = lp;
  try {
    const p = ac.createStereoPanner();
    p.pan.value = lim(pan, -1, 1);
    lp.connect(p);
    salida = p;
  } catch { /* sin paneo */ }
  salida.connect(bus);
  const envio = gan(0.18 + 0.5 * d + extraRev, revEntrada);
  salida.connect(envio);
  return entrada;
}

function liberar(nodo: AudioNode, segundos: number): void {
  setTimeout(() => { try { nodo.disconnect(); } catch { /* nada */ } }, (segundos + 0.5) * 1000);
}

// ============================================================================
// Efectos
// ============================================================================

type Fx = (o: AudioNode, t: number, p: number) => number;

function golpeMetalico(o: AudioNode, t: number, f: number, v: number, caida: number): void {
  const parciales = [1, 2.76, 5.4, 8.93, 13.3];
  const ganancias = [1, 0.6, 0.4, 0.25, 0.12];
  for (let i = 0; i < parciales.length; i++) {
    const g = gan(0, o);
    const c = caida / (1 + i * 0.6);
    env(g.gain, t, 0.001, v * (ganancias[i] as number) * 0.3, c);
    osc('sine', f * (parciales[i] as number) * al(0.995, 1.005), t, t + c + 0.05, g);
  }
  const gc = gan(0, o);
  env(gc.gain, t, 0.001, v * 0.5, 0.025);
  ruido(t, t + 0.05, filt('highpass', 4000, 0.7, gc));
}

function golpeSordo(o: AudioNode, t: number, f0: number, f1: number, v: number, caida: number): void {
  const g = gan(0, o);
  env(g.gain, t, 0.003, v, caida);
  const s = osc('sine', f0, t, t + caida + 0.05, g);
  s.frequency.exponentialRampToValueAtTime(f1, t + caida * 0.9);
}

function chasquido(o: AudioNode, t: number, f: number, q: number, v: number, caida: number): void {
  const g = gan(0, o);
  env(g.gain, t, 0.001, v, caida);
  ruido(t, t + caida + 0.03, filt('bandpass', f, q, g));
}

function silbido(o: AudioNode, t: number, f0: number, fm: number, f1: number, dur: number, q: number, v: number, tipo = BLANCO): void {
  const g = gan(0, o);
  g.gain.setValueAtTime(EPS, t);
  g.gain.exponentialRampToValueAtTime(v, t + dur * 0.4);
  g.gain.exponentialRampToValueAtTime(EPS, t + dur);
  const b = filt('bandpass', f0, q, g);
  b.frequency.setValueAtTime(f0, t);
  b.frequency.exponentialRampToValueAtTime(fm, t + dur * 0.45);
  b.frequency.exponentialRampToValueAtTime(f1, t + dur);
  ruido(t, t + dur + 0.02, b, tipo);
}

function crepitar(o: AudioNode, t: number, dur: number, n: number, v: number): void {
  for (let i = 0; i < n; i++) {
    chasquido(o, t + Math.random() * dur, al(1500, 5000), 3, v * al(0.3, 1), al(0.004, 0.02));
  }
}

/** Voz gutural: sierra(s) por un banco de formantes. */
function voz(o: AudioNode, t: number, dur: number, curvaF: [number, number][], vocal: string, v: number, opts: { dist?: number; am?: number; vib?: number; ruido?: number; esc?: number; ataque?: number } = {}): void {
  const fin = t + dur + 0.1;
  const g = gan(0, o);
  const at = opts.ataque ?? 0.03;
  g.gain.setValueAtTime(EPS, t);
  g.gain.exponentialRampToValueAtTime(v, t + at);
  g.gain.setValueAtTime(v, t + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(EPS, t + dur);
  let dest: AudioNode = g;
  if (opts.am) {
    const amg = gan(0.6, g);
    lfo(opts.am, 0.4, amg.gain, t, fin);
    dest = amg;
  }
  const fb = formantes(vocal, dest, opts.esc ?? 1);
  let entrada: AudioNode = fb.entrada;
  if (opts.dist) entrada = dist(opts.dist, fb.entrada);
  const s1 = osc('sawtooth', curvaF[0]![1], t, fin, entrada);
  const s2 = osc('sawtooth', curvaF[0]![1], t, fin, entrada, 12);
  for (const s of [s1, s2]) {
    for (const [dt, f] of curvaF) s.frequency.linearRampToValueAtTime(f, t + dt);
    if (opts.vib) lfo(opts.vib, 6 + opts.vib * 0.5, s.frequency, t, fin);
  }
  if (opts.ruido) {
    const gn = gan(opts.ruido, fb.entrada);
    ruido(t, fin, gn, ROSA);
  }
}

const EFECTOS: Record<string, Fx> = {
  golpe_carne(o, t, p) {
    golpeSordo(o, t, 150 * p, 45 * p, 0.9, 0.16);
    silbido(o, t, 1100 * p, 700 * p, 280 * p, 0.11, 1.2, 0.6);
    return 0.25;
  },
  golpe_metal(o, t, p) {
    golpeMetalico(o, t, 520 * p, 1, 0.45);
    golpeSordo(o, t, 180 * p, 80, 0.4, 0.08);
    return 0.5;
  },
  golpe_hueso(o, t, p) {
    chasquido(o, t, 2300 * p, 6, 0.9, 0.035);
    chasquido(o, t + 0.022, 1500 * p, 5, 0.6, 0.05);
    golpeSordo(o, t, 620 * p, 240 * p, 0.35, 0.07);
    return 0.15;
  },
  tajo(o, t, p) {
    silbido(o, t, 450 * p, 2800 * p, 650 * p, 0.28, 1.6, 0.55);
    silbido(o, t + 0.02, 900 * p, 4500 * p, 1500 * p, 0.2, 3, 0.15);
    return 0.32;
  },
  flecha(o, t, p) {
    silbido(o, t, 4200 * p, 3200 * p, 1600 * p, 0.2, 2.5, 0.35);
    const g = gan(0, o);
    env(g.gain, t, 0.002, 0.18, 0.13);
    osc('triangle', 330 * p, t, t + 0.18, filt('lowpass', 1500, 1, g));
    return 0.22;
  },
  virote(o, t, p) {
    golpeSordo(o, t, 240 * p, 80 * p, 0.6, 0.1);
    const g = gan(0, o);
    env(g.gain, t, 0.002, 0.25, 0.22);
    osc('sawtooth', 110 * p, t, t + 0.25, filt('lowpass', 700, 2, g));
    chasquido(o, t, 2200 * p, 2, 0.4, 0.06);
    silbido(o, t + 0.01, 3000 * p, 2400 * p, 1200 * p, 0.16, 2, 0.2);
    return 0.28;
  },
  fuego_lanzar(o, t, p) {
    const g = gan(0, o);
    g.gain.setValueAtTime(EPS, t);
    g.gain.exponentialRampToValueAtTime(0.7, t + 0.08);
    g.gain.exponentialRampToValueAtTime(EPS, t + 0.55);
    const f = filt('lowpass', 400 * p, 1.5, g);
    f.frequency.exponentialRampToValueAtTime(2400 * p, t + 0.2);
    f.frequency.exponentialRampToValueAtTime(500 * p, t + 0.55);
    ruido(t, t + 0.6, f, ROSA);
    crepitar(o, t, 0.5, 7, 0.35);
    return 0.6;
  },
  fuego_impacto(o, t, p) {
    const g = gan(0, o);
    env(g.gain, t, 0.005, 0.9, 0.6);
    const f = filt('lowpass', 3200 * p, 0.8, g);
    f.frequency.exponentialRampToValueAtTime(160, t + 0.6);
    ruido(t, t + 0.7, f, ROSA);
    golpeSordo(o, t, 95 * p, 35, 0.8, 0.4);
    crepitar(o, t + 0.05, 0.6, 9, 0.3);
    return 0.75;
  },
  hielo_lanzar(o, t, p) {
    for (let i = 0; i < 6; i++) {
      const tt = t + Math.random() * 0.16;
      const g = gan(0, o);
      env(g.gain, tt, 0.003, 0.1, al(0.15, 0.35));
      osc('sine', al(1800, 4200) * p, tt, tt + 0.4, g);
    }
    silbido(o, t, 5000, 8000, 6000, 0.32, 1, 0.12);
    return 0.5;
  },
  hielo_impacto(o, t, p) {
    for (let i = 0; i < 9; i++) {
      chasquido(o, t + Math.random() * 0.12, al(2500, 7500) * p, 10, al(0.3, 0.7), al(0.03, 0.12));
    }
    const g = gan(0, o);
    env(g.gain, t, 0.001, 0.12, 0.4);
    osc('sine', 2637 * p, t, t + 0.45, g);
    osc('sine', 3951 * p, t, t + 0.45, g);
    golpeSordo(o, t, 200 * p, 90, 0.4, 0.1);
    return 0.5;
  },
  rayo(o, t, p) {
    const dur = 0.45;
    const g = gan(0, o);
    env(g.gain, t, 0.003, 0.45, dur);
    const hp = filt('highpass', 700, 0.7, g);
    const s = osc('sawtooth', 120, t, t + dur + 0.05, dist(8, hp));
    for (let x = 0; x < dur; x += 0.018) s.frequency.setValueAtTime(al(50, 420) * p, t + x);
    const gn = gan(0, o);
    const hp2 = filt('highpass', 2500, 0.7, gn);
    ruido(t, t + dur + 0.05, hp2);
    gn.gain.setValueAtTime(0, t);
    for (let x = 0; x < dur; x += 0.014) gn.gain.setValueAtTime(Math.random() < 0.6 ? al(0.1, 0.5) * (1 - x / dur) : 0, t + x);
    gn.gain.setValueAtTime(0, t + dur);
    return dur + 0.1;
  },
  veneno(o, t, p) {
    for (let i = 0; i < 8; i++) {
      const tt = t + Math.random() * 0.5;
      const g = gan(0, o);
      env(g.gain, tt, 0.004, 0.22, 0.06);
      const s = osc('sine', al(160, 300) * p, tt, tt + 0.09, g);
      s.frequency.exponentialRampToValueAtTime(al(450, 800) * p, tt + 0.06);
    }
    const g = gan(0, o);
    env(g.gain, t, 0.05, 0.15, 0.45);
    ruido(t, t + 0.55, filt('lowpass', 700, 3, g), ROSA);
    return 0.6;
  },
  sombra(o, t, p) {
    const g = gan(0, o);
    g.gain.setValueAtTime(EPS, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.35);
    g.gain.exponentialRampToValueAtTime(EPS, t + 0.7);
    const f = filt('lowpass', 150, 4, g);
    f.frequency.exponentialRampToValueAtTime(900 * p, t + 0.35);
    f.frequency.exponentialRampToValueAtTime(100, t + 0.7);
    osc('sawtooth', 55 * p, t, t + 0.75, f);
    osc('sawtooth', 58.3 * p, t, t + 0.75, f);
    const gn = gan(0, o);
    gn.gain.setValueAtTime(EPS, t);
    gn.gain.exponentialRampToValueAtTime(0.15, t + 0.4);
    gn.gain.exponentialRampToValueAtTime(EPS, t + 0.7);
    ruido(t, t + 0.75, filt('bandpass', 420, 3, gn), ROSA);
    return 0.8;
  },
  luz(o, t, p) {
    const notas = [880, 1320, 1760, 2640];
    notas.forEach((f, i) => {
      const tt = t + i * 0.035;
      const g = gan(0, o);
      env(g.gain, tt, 0.03, 0.12, 0.9);
      osc('sine', f * p, tt, tt + 1, g);
    });
    silbido(o, t, 6000, 9000, 7000, 0.6, 1, 0.06);
    return 1.1;
  },
  explosion(o, t, p) {
    const g = gan(0, o);
    env(g.gain, t, 0.004, 1, 1.3);
    const f = filt('lowpass', 1400 * p, 0.7, g);
    f.frequency.exponentialRampToValueAtTime(70, t + 1.1);
    ruido(t, t + 1.4, dist(3, f), MARRON);
    const gb = gan(0, o);
    env(gb.gain, t, 0.003, 0.5, 0.5);
    ruido(t, t + 0.6, filt('lowpass', 2500, 0.7, gb), ROSA);
    golpeSordo(o, t, 75 * p, 28, 1, 0.7);
    crepitar(o, t + 0.1, 0.8, 8, 0.25);
    return 1.5;
  },
  nova(o, t, p) {
    const g = gan(0, o);
    env(g.gain, t, 0.02, 0.6, 0.6);
    const b = filt('bandpass', 300, 2, g);
    b.frequency.exponentialRampToValueAtTime(5000 * p, t + 0.5);
    ruido(t, t + 0.7, b, ROSA);
    const gs = gan(0, o);
    env(gs.gain, t, 0.01, 0.12, 0.5);
    const s = osc('triangle', 200 * p, t, t + 0.6, gs);
    s.frequency.exponentialRampToValueAtTime(1300 * p, t + 0.5);
    golpeSordo(o, t, 120 * p, 50, 0.5, 0.25);
    return 0.75;
  },
  invocar(o, t, p) {
    const g = gan(0, o);
    g.gain.setValueAtTime(EPS, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.55);
    g.gain.exponentialRampToValueAtTime(EPS, t + 1.1);
    const f = filt('lowpass', 200, 3, g);
    f.frequency.exponentialRampToValueAtTime(1800 * p, t + 0.8);
    const a = osc('sawtooth', 82 * p, t, t + 1.15, f);
    const b = osc('sawtooth', 123 * p, t, t + 1.15, f, 8);
    const c = osc('sawtooth', 87 * p, t, t + 1.15, f, -6);
    for (const s of [a, b, c]) s.frequency.exponentialRampToValueAtTime(s.frequency.value * 1.5, t + 1);
    silbido(o, t, 300, 1200, 400, 1, 2, 0.1, ROSA);
    return 1.2;
  },
  grito_guerra(o, t, p) {
    voz(o, t, 0.75, [[0, 140 * p], [0.15, 185 * p], [0.5, 170 * p], [0.75, 120 * p]], 'a', 0.55, { dist: 4, vib: 5.5, ruido: 0.15 });
    return 0.85;
  },
  curar(o, t, p) {
    const semis = [0, 7, 12, 16, 19];
    semis.forEach((s, i) => {
      const tt = t + i * 0.08;
      const g = gan(0, o);
      env(g.gain, tt, 0.04, 0.12, 0.7);
      osc('sine', 523 * p * Math.pow(2, s / 12), tt, tt + 0.8, g);
      osc('triangle', 523 * p * Math.pow(2, s / 12) * 2, tt, tt + 0.8, gan(0.15, g));
    });
    silbido(o, t, 3000, 7000, 5000, 0.8, 1, 0.05);
    return 1.2;
  },
  bloqueo(o, t, p) {
    golpeMetalico(o, t, 720 * p, 0.8, 0.18);
    golpeSordo(o, t, 160 * p, 70, 0.6, 0.09);
    return 0.25;
  },
  muerte_monstruo(o, t, p) {
    voz(o, t, 0.85, [[0, 210 * p], [0.2, 170 * p], [0.85, 55 * p]], 'o', 0.5, { dist: 3, am: 22, ruido: 0.3 });
    golpeSordo(o, t + 0.6, 110, 45, 0.5, 0.25);
    return 1;
  },
  muerte_esqueleto(o, t, p) {
    for (let i = 0; i < 10; i++) {
      const tt = t + i * al(0.03, 0.07);
      chasquido(o, tt, al(1300, 3200) * p * (1 - i * 0.04), 6, al(0.3, 0.7), al(0.02, 0.05));
    }
    golpeSordo(o, t + 0.55, 300 * p, 120, 0.35, 0.08);
    chasquido(o, t + 0.56, 900, 2, 0.4, 0.06);
    return 0.75;
  },
  muerte_heroe(o, t, p) {
    voz(o, t, 1.3, [[0, 140 * p], [0.2, 130 * p], [1.3, 62 * p]], 'o', 0.4, { vib: 4, ruido: 0.25, ataque: 0.06 });
    golpeSordo(o, t + 0.2, 70, 30, 0.9, 1);
    campanaFM(o, t + 0.25, 98, 3, 0.35);
    return 3.4;
  },
  dolor_heroe(o, t, p) {
    voz(o, t, 0.24, [[0, 175 * p], [0.05, 190 * p], [0.24, 115 * p]], elegir(['a', 'e']), 0.45, { ruido: 0.2, ataque: 0.012 });
    return 0.3;
  },
  grunido(o, t, p) {
    voz(o, t, 0.55, [[0, 85 * p], [0.3, 95 * p], [0.55, 70 * p]], 'o', 0.55, { am: 28, dist: 2, ruido: 0.3 });
    return 0.6;
  },
  chillido(o, t, p) {
    const g = gan(0, o);
    g.gain.setValueAtTime(EPS, t);
    g.gain.exponentialRampToValueAtTime(0.28, t + 0.04);
    g.gain.exponentialRampToValueAtTime(EPS, t + 0.45);
    const b = filt('bandpass', 2200 * p, 2, g);
    const s = osc('sawtooth', 1100 * p, t, t + 0.5, dist(2, b));
    s.frequency.linearRampToValueAtTime(1550 * p, t + 0.12);
    s.frequency.exponentialRampToValueAtTime(700 * p, t + 0.45);
    lfo(32, 60, s.frequency, t, t + 0.5);
    return 0.5;
  },
  rugido_jefe(o, t, p) {
    const dur = 1.7;
    const fin = t + dur + 0.1;
    const g = gan(0, o);
    g.gain.setValueAtTime(EPS, t);
    g.gain.exponentialRampToValueAtTime(0.7, t + 0.12);
    g.gain.setValueAtTime(0.7, t + 0.9);
    g.gain.exponentialRampToValueAtTime(EPS, t + dur);
    const am = gan(0.6, g);
    lfo(17, 0.4, am.gain, t, fin);
    const b1 = filt('bandpass', 300, 3, am);
    b1.frequency.linearRampToValueAtTime(850, t + 0.4);
    b1.frequency.exponentialRampToValueAtTime(320, t + dur);
    const b2 = filt('bandpass', 1100, 5, gan(0.5, am));
    const d = dist(5, b1);
    d.connect(b2);
    for (const f of [60, 63.5, 91]) {
      const s = osc('sawtooth', f * p, t, fin, d);
      s.frequency.linearRampToValueAtTime(f * p * 1.15, t + 0.4);
      s.frequency.exponentialRampToValueAtTime(f * p * 0.75, t + dur);
    }
    const gn = gan(0.5, d);
    ruido(t, fin, gn, ROSA);
    golpeSordo(o, t, 60, 30, 0.7, 0.8);
    return dur + 0.2;
  },
  paso(o, t, p) {
    const g = gan(0, o);
    env(g.gain, t, 0.002, 0.3, 0.06);
    ruido(t, t + 0.08, filt('lowpass', 650 * p, 1, g), ROSA);
    golpeSordo(o, t, 110 * p, 60, 0.2, 0.05);
    return 0.1;
  },
  oro(o, t, p) {
    let tt = t;
    for (let i = 0; i < 3; i++) {
      const f = al(2600, 3600) * p;
      const g = gan(0, o);
      env(g.gain, tt, 0.001, 0.12, 0.14);
      osc('sine', f, tt, tt + 0.18, g);
      osc('sine', f * 2.42, tt, tt + 0.18, gan(0.4, g));
      tt += al(0.04, 0.09);
    }
    return 0.4;
  },
  objeto_cae(o, t, p) {
    golpeSordo(o, t, 170 * p, 70, 0.5, 0.1);
    chasquido(o, t, 1300 * p, 1.5, 0.3, 0.05);
    return 0.15;
  },
  objeto_raro(o, t, p) {
    campanaFM(o, t, 660 * p, 1, 0.18);
    campanaFM(o, t + 0.13, 990 * p, 1.2, 0.15);
    return 1.4;
  },
  objeto_unico(o, t, p) {
    golpeSordo(o, t, 80, 35, 0.5, 0.5);
    [330, 392, 494, 659].forEach((f, i) => campanaFM(o, t + i * 0.09, f * p, 1.8, 0.13));
    silbido(o, t, 4000, 8000, 6000, 1.2, 1, 0.05);
    return 2.2;
  },
  pocion(o, t, p) {
    for (let i = 0; i < 3; i++) {
      const tt = t + i * 0.13;
      const g = gan(0, o);
      env(g.gain, tt, 0.01, 0.3, 0.09);
      const s = osc('sine', 320 * p * (1 - i * 0.08), tt, tt + 0.12, filt('lowpass', 900, 4, g));
      s.frequency.exponentialRampToValueAtTime(180 * p, tt + 0.09);
    }
    return 0.5;
  },
  nivel(o, t, p) {
    const acordes = [[57, 60, 64, 69], [57, 61, 64, 69, 76]];
    acordes.forEach((ac2, k) => {
      const tt = t + k * 0.45;
      const g = gan(0, o);
      envSost(g.gain, tt, 0.25, 0.07, k ? 0.9 : 0.4, 0.6);
      const lp = filt('lowpass', 2500, 0.7, g);
      for (const m of ac2) {
        osc('sine', mtof(m) * p, tt, tt + 2, lp);
        osc('triangle', mtof(m) * 2 * p, tt, tt + 2, gan(0.25, lp));
      }
    });
    campanaFM(o, t + 0.45, mtof(81) * p, 1.6, 0.12);
    return 2.1;
  },
  portal(o, t, p) {
    const g = gan(0, o);
    envSost(g.gain, t, 0.3, 0.35, 0.6, 0.6);
    const f = filt('lowpass', 800, 5, g);
    lfo(6, 600, f.frequency, t, t + 1.6);
    osc('sawtooth', 110 * p, t, t + 1.6, f);
    osc('sawtooth', 110.8 * p, t, t + 1.6, f);
    osc('sawtooth', 165 * p, t, t + 1.6, f, 5);
    silbido(o, t, 200, 3000, 400, 1.3, 2, 0.12, ROSA);
    return 1.6;
  },
  click(o, t, p) {
    const g = gan(0, o);
    env(g.gain, t, 0.001, 0.15, 0.025);
    osc('square', 1400 * p, t, t + 0.04, filt('lowpass', 3000, 0.7, g));
    return 0.05;
  },
  abrir(o, t, p) {
    silbido(o, t, 900 * p, 2400 * p, 1800 * p, 0.12, 1.5, 0.2);
    const g = gan(0, o);
    env(g.gain, t + 0.06, 0.001, 0.12, 0.04);
    osc('sine', 620 * p, t + 0.06, t + 0.12, g);
    return 0.15;
  },
  negado(o, t, p) {
    [160, 115].forEach((f, i) => {
      const tt = t + i * 0.13;
      const g = gan(0, o);
      envSost(g.gain, tt, 0.005, 0.15, 0.08, 0.05);
      osc('square', f * p, tt, tt + 0.16, filt('lowpass', 900, 1, g));
    });
    return 0.32;
  },
  cofre(o, t, p) {
    crujido(o, t, 0.45, 1500 * p, 0.35);
    golpeSordo(o, t + 0.45, 140 * p, 60, 0.6, 0.15);
    chasquido(o, t + 0.45, 800, 1.5, 0.3, 0.06);
    EFECTOS.oro?.(o, t + 0.55, p);
    return 0.95;
  },
  puerta(o, t, p) {
    crujido(o, t, 0.9, 850 * p, 0.4);
    golpeSordo(o, t + 0.9, 90 * p, 40, 0.8, 0.35);
    chasquido(o, t + 0.9, 600, 1, 0.3, 0.12);
    return 1.4;
  },
  campana(o, t, p) {
    campanaFM(o, t, 196 * p, 4, 0.4);
    campanaFM(o, t + 0.005, 196 * p * 2.01, 2, 0.08);
    return 4.3;
  },
  trueno(o, t, p) {
    const g = gan(0, o);
    env(g.gain, t, 0.002, 0.6, 0.2);
    ruido(t, t + 0.25, filt('highpass', 1200, 0.7, g));
    const gr = gan(0, o);
    gr.gain.setValueAtTime(0, t);
    let x = 0.02;
    let v = 1;
    while (x < 2.6) {
      gr.gain.setTargetAtTime(v * al(0.4, 1), t + x, 0.08);
      x += al(0.12, 0.35);
      v *= 0.82;
    }
    gr.gain.setTargetAtTime(0, t + x, 0.3);
    ruido(t, t + x + 1.2, dist(2, filt('lowpass', 260 * p, 0.8, gr)), MARRON);
    return x + 1.3;
  },
  mision(o, t, p) {
    const notas = [62, 65, 69, 74];
    notas.forEach((m, i) => campanaFM(o, t + i * 0.2, mtof(m + 12) * p, 1.6, 0.12));
    const g = gan(0, o);
    envSost(g.gain, t, 0.4, 0.07, 1, 0.8);
    const lp = filt('lowpass', 1200, 0.7, g);
    for (const m of [50, 57, 62, 65]) osc('sawtooth', mtof(m) * p, t, t + 2.3, lp, al(-8, 8));
    return 2.4;
  },
  santuario(o, t, p) {
    const g = gan(0, o);
    envSost(g.gain, t, 0.6, 0.18, 1.1, 1.2);
    const fb = formantes('a', g);
    const vib = gan(12);
    osc('sine', 5, t, t + 2.5, vib);
    for (const m of [57, 60, 64, 71]) {
      for (const d of [-9, 9]) {
        const s = osc('sawtooth', mtof(m) * p, t, t + 2.5, fb.entrada, d);
        vib.connect(s.detune);
      }
    }
    silbido(o, t, 5000, 9000, 6000, 1.5, 1, 0.04);
    return 2.6;
  },
  teletransporte(o, t, p) {
    const g = gan(0, o);
    envSost(g.gain, t, 0.1, 0.18, 0.5, 0.15);
    const am = gan(0.6, g);
    lfo(24, 0.4, am.gain, t, t + 0.8);
    const s = osc('sine', 180 * p, t, t + 0.8, am);
    s.frequency.exponentialRampToValueAtTime(2200 * p, t + 0.6);
    silbido(o, t, 500, 6000, 9000, 0.65, 1.5, 0.15);
    return 0.85;
  },
  trampa(o, t, p) {
    chasquido(o, t, 5000, 1, 0.6, 0.012);
    golpeMetalico(o, t, 900 * p, 0.7, 0.12);
    const g = gan(0, o);
    env(g.gain, t + 0.01, 0.002, 0.2, 0.35);
    const s = osc('triangle', 260 * p, t, t + 0.4, filt('lowpass', 1200, 1, g));
    lfo(38, 25, s.frequency, t, t + 0.4);
    return 0.45;
  },
  mana_falta(o, t, p) {
    const g = gan(0, o);
    envSost(g.gain, t, 0.03, 0.15, 0.18, 0.12);
    const s = osc('triangle', 230 * p, t, t + 0.35, filt('lowpass', 700, 1, g));
    s.frequency.linearRampToValueAtTime(175 * p, t + 0.3);
    silbido(o, t, 600, 900, 400, 0.3, 2, 0.08, ROSA);
    return 0.35;
  },
  equipar(o, t, p) {
    chasquido(o, t, 900 * p, 1.2, 0.35, 0.06);
    golpeMetalico(o, t + 0.035, 1300 * p, 0.35, 0.09);
    return 0.15;
  },
  vender(o, t, p) {
    let tt = t;
    for (let i = 0; i < 5; i++) {
      const f = al(2400, 3800) * p;
      const g = gan(0, o);
      env(g.gain, tt, 0.001, 0.1, 0.12);
      osc('sine', f, tt, tt + 0.15, g);
      osc('sine', f * 2.42, tt, tt + 0.15, gan(0.4, g));
      tt += al(0.03, 0.07);
    }
    return 0.5;
  },
  reparar(o, t, p) {
    golpeMetalico(o, t, 850 * p, 0.9, 0.35);
    golpeSordo(o, t, 200, 90, 0.4, 0.06);
    golpeMetalico(o, t + 0.24, 880 * p, 0.7, 0.3);
    golpeSordo(o, t + 0.24, 200, 90, 0.3, 0.06);
    return 0.6;
  },
};

/** Crujido de madera: tren de pulsos irregular por una pasabanda resonante. */
function crujido(o: AudioNode, t: number, dur: number, fc: number, v: number): void {
  const g = gan(0, o);
  envSost(g.gain, t, 0.04, v, dur * 0.85, dur * 0.15);
  const b = filt('bandpass', fc, 6, g);
  const b2 = filt('bandpass', fc * 2.3, 8, gan(0.4, g));
  const s = osc('sawtooth', 40, t, t + dur + 0.05, b);
  s.connect(b2);
  for (let x = 0; x < dur; x += 0.03) s.frequency.setValueAtTime(al(25, 75), t + x);
  b.frequency.linearRampToValueAtTime(fc * 1.3, t + dur);
}

function efectoGenerico(o: AudioNode, t: number, p: number): number {
  const g = gan(0, o);
  env(g.gain, t, 0.001, 0.08, 0.03);
  osc('triangle', 900 * p, t, t + 0.05, filt('lowpass', 2000, 0.7, g));
  return 0.06;
}

// ============================================================================
// Capas continuas (drones, lechos de ambiente, texturas)
// ============================================================================

interface Capa {
  salida: GainNode;
  fuentes: AudioScheduledSourceNode[];
  tick?: (desde: number, hasta: number) => void;
}

function nuevaCapa(dest: AudioNode, vol: number, t: number, fundido = 2): Capa {
  const salida = gan(0, dest);
  salida.gain.setValueAtTime(0, t);
  salida.gain.linearRampToValueAtTime(vol, t + fundido);
  return { salida, fuentes: [] };
}

function pararCapa(c: Capa, t: number): void {
  try {
    c.salida.gain.cancelScheduledValues(t);
    c.salida.gain.setTargetAtTime(0, t, 0.5);
    for (const f of c.fuentes) { try { f.stop(t + 3); } catch { /* ya parada */ } }
    c.tick = undefined;
    liberar(c.salida, 3.5);
  } catch { /* nada */ }
}

/** Fuente de ruido continua (sin fin programado). */
function ruidoCont(c: Capa, t: number, dest: AudioNode, tipo: number): void {
  const s = ac.createBufferSource();
  const buf = ruidos[tipo] as AudioBuffer;
  s.buffer = buf;
  s.loop = true;
  s.connect(dest);
  s.start(t, Math.random() * buf.duration * 0.9);
  c.fuentes.push(s);
}

function oscCont(c: Capa, tipo: OscillatorType, f: number, t: number, dest: AudioNode | null, det = 0): OscillatorNode {
  const o = ac.createOscillator();
  o.type = tipo;
  o.frequency.value = f;
  o.detune.value = det;
  if (dest) o.connect(dest);
  o.start(t);
  c.fuentes.push(o);
  return o;
}

function lfoCont(c: Capa, f: number, prof: number, param: AudioParam, t: number): void {
  const g = gan(prof);
  g.connect(param);
  oscCont(c, 'sine', f, t, g);
}

/** Planificador de eventos aleatorios tipo Poisson dentro de una capa. */
function eventos(tasa: number, fn: (t: number) => void): (desde: number, hasta: number) => void {
  let prox = -1;
  return (desde, hasta) => {
    if (prox < desde) prox = desde + (-Math.log(1 - Math.random()) / tasa);
    let n = 0;
    while (prox < hasta && n < 20) {
      fn(prox);
      prox += -Math.log(1 - Math.random()) / tasa;
      n++;
    }
  };
}

function combinar(...fs: ((d: number, h: number) => void)[]): (d: number, h: number) => void {
  return (d, h) => { for (const f of fs) f(d, h); };
}

type TipoLecho = 'lluvia' | 'viento' | 'aullido' | 'fuego' | 'cueva' | 'goteo' | 'selva' | 'insectos' | 'infierno' | 'rugido';

function gota(dest: AudioNode, t: number, v: number): void {
  const g = gan(0, dest);
  env(g.gain, t, 0.002, v, 0.09);
  const s = osc('sine', al(900, 2000), t, t + 0.12, g);
  s.frequency.exponentialRampToValueAtTime(s.frequency.value * al(1.5, 2.2), t + 0.07);
  const e = gan(v * 2, revEntrada);
  g.connect(e);
  liberar(e, 1);
}

function insecto(dest: AudioNode, t: number, v: number): void {
  const dur = al(0.15, 0.7);
  const g = gan(0, dest);
  const tasa = al(18, 45);
  for (let x = 0; x < dur; x += 1 / tasa) {
    g.gain.setValueAtTime(v, t + x);
    g.gain.setValueAtTime(0, t + x + 0.5 / tasa);
  }
  osc('sine', al(3800, 6800), t, t + dur + 0.02, g);
}

function crearLecho(tipo: TipoLecho, dest: AudioNode, vol: number, t: number): Capa {
  const c = nuevaCapa(dest, vol, t);
  const s = c.salida;
  switch (tipo) {
    case 'lluvia': {
      ruidoCont(c, t, filt('highpass', 500, 0.5, filt('lowpass', 7000, 0.5, gan(0.45, s))), ROSA);
      ruidoCont(c, t, filt('lowpass', 380, 0.7, gan(0.35, s)), MARRON);
      c.tick = eventos(9, (tt) => {
        const g = gan(0, s);
        env(g.gain, tt, 0.001, al(0.02, 0.07), 0.015);
        osc('sine', al(2500, 5500), tt, tt + 0.03, g);
      });
      break;
    }
    case 'viento':
    case 'aullido': {
      const fuerte = tipo === 'aullido';
      const g1 = gan(0.5, s);
      lfoCont(c, 0.05, 0.25, g1.gain, t);
      const b1 = filt('bandpass', 500, 1.2, g1);
      lfoCont(c, 0.07, 300, b1.frequency, t);
      ruidoCont(c, t, b1, ROSA);
      const g2 = gan(fuerte ? 0.25 : 0.08, s);
      const b2 = filt('bandpass', fuerte ? 700 : 1200, fuerte ? 18 : 6, g2);
      lfoCont(c, 0.11, fuerte ? 350 : 400, b2.frequency, t);
      lfoCont(c, 0.031, fuerte ? 200 : 150, b2.frequency, t);
      lfoCont(c, 0.09, fuerte ? 0.2 : 0.06, g2.gain, t);
      ruidoCont(c, t, b2, ROSA);
      break;
    }
    case 'fuego': {
      ruidoCont(c, t, filt('lowpass', 550, 0.7, gan(0.45, s)), MARRON);
      ruidoCont(c, t, filt('bandpass', 1200, 0.8, gan(0.03, s)), ROSA);
      c.tick = eventos(14, (tt) => {
        chasquido(s, tt, al(1500, 6000), al(1, 4), al(0.05, 0.35) * (Math.random() < 0.08 ? 2.5 : 1), al(0.003, 0.02));
      });
      break;
    }
    case 'cueva':
    case 'goteo': {
      ruidoCont(c, t, filt('lowpass', 120, 0.7, gan(0.6, s)), MARRON);
      ruidoCont(c, t, filt('bandpass', 300, 0.7, gan(0.05, s)), ROSA);
      c.tick = eventos(tipo === 'cueva' ? 0.45 : 0.3, (tt) => gota(s, tt, al(0.06, 0.16)));
      break;
    }
    case 'selva':
    case 'insectos': {
      ruidoCont(c, t, filt('bandpass', 3500, 1, gan(0.05, s)), ROSA);
      ruidoCont(c, t, filt('lowpass', 300, 0.7, gan(0.12, s)), MARRON);
      c.tick = combinar(
        eventos(1.6, (tt) => insecto(s, tt, al(0.015, 0.05))),
        eventos(0.25, (tt) => {
          // rana grave
          for (let i = 0; i < 3; i++) {
            const g = gan(0, s);
            env(g.gain, tt + i * 0.11, 0.01, 0.07, 0.06);
            osc('triangle', al(180, 260), tt + i * 0.11, tt + i * 0.11 + 0.1, g);
          }
        }),
        eventos(0.4, (tt) => gota(s, tt, al(0.03, 0.07))),
      );
      break;
    }
    case 'infierno':
    case 'rugido': {
      const lp2 = filt('lowpass', 420, 0.7, gan(0.55, s));
      ruidoCont(c, t, filt('lowpass', 180, 1, dist(3, lp2)), MARRON);
      const sub = gan(0.12, s);
      lfoCont(c, 0.13, 0.08, sub.gain, t);
      oscCont(c, 'sine', 38, t, sub);
      oscCont(c, 'sine', 41, t, sub);
      c.tick = eventos(0.12, (tt) => {
        voz(s, tt, 2.6, [[0, al(70, 110)], [1.3, al(60, 120)], [2.6, al(50, 80)]], elegir(['o', 'u', 'a']), 0.06, { ataque: 0.8, vib: 3 });
      });
      break;
    }
  }
  return c;
}

// ============================================================================
// Instrumentos musicales
// ============================================================================

type Inst = (d: AudioNode, t: number, f: number, dur: number, v: number) => void;
type InstPad = (d: AudioNode, t: number, fs: number[], dur: number, v: number) => void;

const INST: Record<string, Inst> = {
  arco(d, t, f, dur, v) {
    const ataque = Math.min(0.35, dur * 0.4);
    const fin = t + dur + 0.8;
    const g = gan(0, d);
    envSost(g.gain, t, ataque, v, dur, 0.6);
    const lp = filt('lowpass', f * 2, 0.8, g);
    lp.frequency.setValueAtTime(f * 1.5, t);
    lp.frequency.linearRampToValueAtTime(Math.min(f * 5, 6000), t + ataque);
    lp.frequency.linearRampToValueAtTime(f * 3, t + dur);
    const vib = gan(0);
    vib.gain.setValueAtTime(0, t);
    vib.gain.linearRampToValueAtTime(14, t + Math.min(0.6, dur));
    osc('sine', al(4.8, 5.6), t, fin, vib);
    for (const det of [-7, 7]) {
      const o = osc('sawtooth', f, t, fin, lp, det);
      vib.connect(o.detune);
    }
  },
  pulsado(d, t, f, dur, v) {
    const caida = 0.9 + dur * 0.5;
    const g = gan(0, d);
    env(g.gain, t, 0.004, v, caida);
    const lp = filt('lowpass', f * 10, 2, g);
    lp.frequency.setValueAtTime(Math.min(f * 12, 9000), t);
    lp.frequency.exponentialRampToValueAtTime(f * 1.4, t + 0.35);
    osc('sawtooth', f, t, t + caida + 0.05, lp);
    osc('square', f * 2, t, t + caida + 0.05, gan(0.15, lp), 4);
    chasquido(d, t, Math.min(f * 5, 6000), 2, v * 0.25, 0.012);
  },
  laud(d, t, f, dur, v) {
    const caida = 1.4 + dur * 0.4;
    const g = gan(0, d);
    env(g.gain, t, 0.003, v, caida);
    const lp = filt('lowpass', f * 6, 1.2, g);
    lp.frequency.setValueAtTime(Math.min(f * 8, 8000), t);
    lp.frequency.exponentialRampToValueAtTime(f * 1.6, t + 0.5);
    osc('triangle', f, t, t + caida + 0.05, lp);
    osc('sawtooth', f, t, t + caida + 0.05, gan(0.35, lp), 5);
    chasquido(d, t, Math.min(f * 6, 7000), 3, v * 0.18, 0.008);
  },
  flauta(d, t, f, dur, v) {
    const fin = t + dur + 0.5;
    const g = gan(0, d);
    envSost(g.gain, t, 0.09, v, dur, 0.3);
    const o = osc('sine', f, t, fin, g);
    osc('sine', f * 2, t, fin, gan(0.12, g));
    const vib = gan(0);
    vib.gain.setValueAtTime(0, t);
    vib.gain.linearRampToValueAtTime(f * 0.006, t + 0.4);
    vib.connect(o.frequency);
    osc('sine', 5, t, fin, vib);
    const gn = gan(0, d);
    envSost(gn.gain, t, 0.05, v * 0.35, dur * 0.6, 0.2);
    ruido(t, fin, filt('bandpass', f * 2, 4, gn), ROSA);
  },
  cristal(d, t, f, dur, v) {
    const caida = 1.6 + dur * 0.3;
    const g = gan(0, d);
    env(g.gain, t, 0.002, v, caida);
    osc('sine', f, t, t + caida + 0.05, g);
    osc('sine', f * 3.01, t, t + caida * 0.5, gan(0.18, g));
    osc('sine', f * 4.2, t, t + caida * 0.3, gan(0.08, g));
  },
  metal(d, t, f, dur, v) {
    const fin = t + dur + 0.5;
    const g = gan(0, d);
    envSost(g.gain, t, 0.05, v, dur, 0.35);
    const lp = filt('lowpass', 300, 1.5, g);
    lp.frequency.setValueAtTime(250, t);
    lp.frequency.exponentialRampToValueAtTime(Math.min(f * 7, 5000), t + 0.08);
    lp.frequency.exponentialRampToValueAtTime(f * 2, t + dur + 0.3);
    const ds = dist(2.5, lp);
    osc('sawtooth', f, t, fin, ds);
    osc('sawtooth', f, t, fin, ds, 9);
    osc('sawtooth', f / 2, t, fin, gan(0.5, ds), -5);
  },
  arcoCorto(d, t, f, _dur, v) {
    const g = gan(0, d);
    env(g.gain, t, 0.012, v, 0.18);
    const lp = filt('lowpass', f * 5, 1, g);
    osc('sawtooth', f, t, t + 0.25, lp, -6);
    osc('sawtooth', f, t, t + 0.25, lp, 6);
  },
  bajo(d, t, f, dur, v) {
    const fin = t + dur + 0.7;
    const g = gan(0, d);
    envSost(g.gain, t, 0.08, v, dur, 0.5);
    const lp = filt('lowpass', 380, 0.7, g);
    osc('sine', f, t, fin, lp);
    osc('triangle', f * 2, t, fin, gan(0.3, lp));
  },
};

const PADS: Record<string, InstPad> = {
  organo(d, t, fs, dur, v) {
    const fin = t + dur + 1.2;
    const g = gan(0, d);
    envSost(g.gain, t, 0.6, v, dur, 1);
    const lp = filt('lowpass', 2200, 0.6, g);
    for (const f of fs) {
      osc('sine', f, t, fin, lp);
      osc('sine', f * 2, t, fin, gan(0.45, lp), 2);
      osc('triangle', f * 4, t, fin, gan(0.08, lp), -2);
    }
  },
  cuerdas(d, t, fs, dur, v) {
    const fin = t + dur + 1.6;
    const g = gan(0, d);
    envSost(g.gain, t, Math.min(1.2, dur * 0.4), v, dur, 1.4);
    const lp = filt('lowpass', 500, 0.6, g);
    lp.frequency.linearRampToValueAtTime(1100, t + dur * 0.6);
    lp.frequency.linearRampToValueAtTime(600, t + dur + 1);
    for (const f of fs) {
      osc('sawtooth', f, t, fin, lp, -9);
      osc('sawtooth', f, t, fin, lp, 8);
    }
  },
  coro(d, t, fs, dur, v) {
    const fin = t + dur + 1.6;
    const g = gan(0, d);
    envSost(g.gain, t, Math.min(1.4, dur * 0.45), v * 2.2, dur, 1.4);
    const fb = formantes(Math.random() < 0.5 ? 'a' : 'o', g);
    const vib = gan(10);
    osc('sine', al(4.5, 5.5), t, fin, vib);
    for (const f of fs) {
      for (const det of [-12, 11]) {
        const o = osc('sawtooth', f, t, fin, fb.entrada, det);
        vib.connect(o.detune);
      }
    }
  },
};

// ---------- percusion ----------

function taiko(d: AudioNode, t: number, f: number, v: number): void {
  const g = gan(0, d);
  env(g.gain, t, 0.004, v, 0.55);
  const s = osc('sine', f * 1.7, t, t + 0.65, g);
  s.frequency.exponentialRampToValueAtTime(f, t + 0.08);
  const gn = gan(0, d);
  env(gn.gain, t, 0.002, v * 0.5, 0.12);
  ruido(t, t + 0.15, filt('lowpass', 700, 1, gn), ROSA);
}

function marco(d: AudioNode, t: number, grave: boolean, v: number): void {
  if (grave) {
    const g = gan(0, d);
    env(g.gain, t, 0.003, v, 0.3);
    const s = osc('sine', 110, t, t + 0.35, g);
    s.frequency.exponentialRampToValueAtTime(65, t + 0.15);
    chasquido(d, t, 260, 1.5, v * 0.4, 0.08);
  } else {
    chasquido(d, t, al(2200, 3000), 2, v * 0.6, 0.05);
    const g = gan(0, d);
    env(g.gain, t, 0.001, v * 0.25, 0.04);
    osc('triangle', 420, t, t + 0.06, g);
  }
}

function golpeHumedo(d: AudioNode, t: number, f: number, v: number): void {
  const g = gan(0, d);
  env(g.gain, t, 0.002, v, 0.14);
  const b = filt('bandpass', f, 12, g);
  const s = osc('triangle', f * 0.7, t, t + 0.18, b);
  s.frequency.exponentialRampToValueAtTime(f * 1.25, t + 0.05);
  b.frequency.exponentialRampToValueAtTime(f * 1.4, t + 0.1);
  chasquido(d, t, f * 3, 4, v * 0.2, 0.02);
}

function latidoGolpe(d: AudioNode, t: number, v: number): void {
  const g = gan(0, d);
  env(g.gain, t, 0.008, v, 0.2);
  const s = osc('sine', 62, t, t + 0.26, filt('lowpass', 160, 0.7, g));
  s.frequency.exponentialRampToValueAtTime(36, t + 0.18);
  const gn = gan(0, d);
  env(gn.gain, t, 0.005, v * 0.35, 0.08);
  ruido(t, t + 0.1, filt('lowpass', 220, 1, gn), MARRON);
}

// ============================================================================
// Definicion de pistas
// ============================================================================

const EOLIO = [0, 2, 3, 5, 7, 8, 10];
const FRIGIO = [0, 1, 3, 5, 7, 8, 10];
const FRIGIO_DOM = [0, 1, 4, 5, 7, 8, 10];
const DORICO = [0, 2, 3, 5, 7, 9, 10];
const LOCRIO = [0, 1, 3, 5, 6, 8, 10];
const ARMONICA = [0, 2, 3, 5, 7, 8, 11];

type TipoDron = 'organo' | 'oscuro' | 'arena' | 'selva' | 'hielo' | 'distorsion' | 'suave';
type TipoPerc = 'taiko' | 'marco' | 'humeda' | 'latido' | 'lejano' | 'jefe' | 'ninguna';

interface Pista {
  bpm: number;
  raiz: number; // midi
  escala: number[];
  prog: number[][];
  dron: TipoDron;
  dronVol: number;
  pads: string[];
  padVol: number;
  mel: string | null;
  melVol: number;
  densidad: number;
  registro: number; // grados por encima de la raiz
  silencio: number; // prob. de frase sin melodia
  arp: string | null;
  arpVol: number;
  bajo: number; // volumen (0 = sin bajo)
  campana: number; // prob. por compas
  perc: TipoPerc;
  percVol: number;
  textura: TipoLecho | null;
  texturaVol: number;
  construir?: boolean;
  disonante?: boolean;
}

function pista(p: Partial<Pista> & Pick<Pista, 'bpm' | 'raiz' | 'escala'>): Pista {
  return {
    prog: [[0, 5, 3, 4], [0, 3, 5, 4], [0, 6, 5, 4], [0, 3, 0, 4]],
    dron: 'oscuro', dronVol: 0.14, pads: [], padVol: 0.05, mel: null, melVol: 0.12,
    densidad: 0.3, registro: 14, silencio: 0.3, arp: null, arpVol: 0.1, bajo: 0,
    campana: 0, perc: 'ninguna', percVol: 0.35, textura: null, texturaVol: 0.25,
    ...p,
  };
}

const PISTAS: Record<Exclude<Musica, null>, Pista> = {
  menu: pista({
    bpm: 54, raiz: 38, escala: EOLIO, dron: 'organo', pads: ['organo', 'coro'], padVol: 0.045,
    mel: 'arco', melVol: 0.1, densidad: 0.3, campana: 0.3, bajo: 0.12, silencio: 0.25,
    prog: [[0, 5, 3, 4], [0, 3, 6, 4], [0, 5, 6, 4]],
  }),
  intro: pista({
    bpm: 50, raiz: 36, escala: ARMONICA, dron: 'oscuro', pads: ['cuerdas', 'coro'], padVol: 0.05,
    mel: 'arco', melVol: 0.11, densidad: 0.35, campana: 0.25, bajo: 0.15, perc: 'taiko', percVol: 0.45,
    construir: true, textura: 'viento', texturaVol: 0.15, silencio: 0.15,
    prog: [[0, 5, 3, 4], [0, 1, 0, 4], [0, 5, 1, 4]],
  }),
  campamento1: pista({
    bpm: 66, raiz: 40, escala: EOLIO, dron: 'suave', dronVol: 0.1, arp: 'laud', arpVol: 0.09,
    mel: 'flauta', melVol: 0.07, densidad: 0.2, silencio: 0.55, textura: 'fuego', texturaVol: 0.3,
    prog: [[0, 5, 3, 4], [0, 3, 0, 6], [0, 6, 5, 4]],
  }),
  campamento2: pista({
    bpm: 62, raiz: 38, escala: FRIGIO_DOM, dron: 'arena', dronVol: 0.08, arp: 'laud', arpVol: 0.09,
    mel: 'flauta', melVol: 0.07, densidad: 0.2, silencio: 0.55, textura: 'fuego', texturaVol: 0.3,
    prog: [[0, 1, 0, 6], [0, 6, 5, 1], [0, 3, 1, 0]],
  }),
  campamento3: pista({
    bpm: 70, raiz: 43, escala: DORICO, dron: 'suave', dronVol: 0.1, arp: 'laud', arpVol: 0.09,
    mel: 'flauta', melVol: 0.07, densidad: 0.25, registro: 7, silencio: 0.5, textura: 'fuego', texturaVol: 0.3,
    prog: [[0, 3, 0, 4], [0, 6, 3, 0], [0, 3, 6, 4]],
  }),
  campamento4: pista({
    bpm: 58, raiz: 41, escala: EOLIO, dron: 'suave', dronVol: 0.1, arp: 'laud', arpVol: 0.09,
    mel: 'arco', melVol: 0.06, densidad: 0.2, silencio: 0.55, textura: 'fuego', texturaVol: 0.3,
    prog: [[0, 5, 2, 6], [0, 3, 5, 4], [0, 5, 6, 0]],
  }),
  campamento5: pista({
    bpm: 54, raiz: 37, escala: FRIGIO, dron: 'oscuro', dronVol: 0.1, arp: 'laud', arpVol: 0.08,
    mel: 'arco', melVol: 0.06, densidad: 0.2, silencio: 0.55, textura: 'fuego', texturaVol: 0.3,
    prog: [[0, 1, 0, 6], [0, 5, 1, 0], [0, 3, 1, 6]],
  }),
  // acto 6: la ciudad ahogada, campanas bajo el agua y lluvia
  campamento6: pista({
    bpm: 52, raiz: 36, escala: EOLIO, dron: 'suave', dronVol: 0.1, arp: 'laud', arpVol: 0.07,
    mel: 'flauta', melVol: 0.06, densidad: 0.2, silencio: 0.6, campana: 0.35, textura: 'lluvia', texturaVol: 0.25,
    prog: [[0, 5, 3, 4], [0, 3, 5, 6], [0, 5, 6, 4]],
  }),
  acto6: pista({
    bpm: 50, raiz: 34, escala: FRIGIO, dron: 'organo', dronVol: 0.1, pads: ['coro'], padVol: 0.04,
    mel: 'arco', melVol: 0.08, densidad: 0.25, registro: 7, campana: 0.6, perc: 'lejano', percVol: 0.3,
    textura: 'lluvia', texturaVol: 0.25, prog: [[0, 1, 5, 0], [0, 6, 1, 0], [0, 3, 1, 5]],
  }),
  // acto 7: la corona del dios sediento, coro y cristal sobre el vacío
  campamento7: pista({
    bpm: 50, raiz: 38, escala: DORICO, dron: 'suave', dronVol: 0.1, arp: 'laud', arpVol: 0.07,
    mel: 'cristal', melVol: 0.06, densidad: 0.2, silencio: 0.6, textura: 'viento', texturaVol: 0.2,
    prog: [[0, 3, 4, 0], [0, 6, 3, 4], [0, 4, 6, 0]],
  }),
  acto7: pista({
    bpm: 46, raiz: 33, escala: LOCRIO, dron: 'distorsion', dronVol: 0.1, pads: ['coro', 'organo'], padVol: 0.05,
    mel: 'cristal', melVol: 0.08, densidad: 0.3, registro: 21, campana: 0.25, perc: 'latido', percVol: 0.35, disonante: true,
    textura: 'viento', texturaVol: 0.22, prog: [[0, 1, 4, 0], [0, 4, 1, 6], [0, 6, 4, 1]],
  }),
  acto1: pista({
    bpm: 58, raiz: 38, escala: EOLIO, dron: 'organo', pads: ['organo'], padVol: 0.04,
    mel: 'arco', melVol: 0.1, densidad: 0.3, campana: 0.45, bajo: 0.1, perc: 'lejano', percVol: 0.3,
    textura: 'lluvia', texturaVol: 0.18,
  }),
  acto2: pista({
    bpm: 72, raiz: 40, escala: FRIGIO_DOM, dron: 'arena', dronVol: 0.12, pads: [],
    mel: 'pulsado', melVol: 0.11, densidad: 0.45, registro: 7, silencio: 0.25, perc: 'marco', percVol: 0.35,
    textura: 'viento', texturaVol: 0.18, prog: [[0, 1, 0, 1], [0, 6, 5, 1], [0, 3, 1, 0]],
  }),
  acto3: pista({
    bpm: 76, raiz: 36, escala: DORICO, dron: 'selva', dronVol: 0.12, pads: ['cuerdas'], padVol: 0.03,
    mel: 'flauta', melVol: 0.1, densidad: 0.3, registro: 7, perc: 'humeda', percVol: 0.3,
    textura: 'insectos', texturaVol: 0.3, prog: [[0, 3, 0, 6], [0, 4, 3, 0], [0, 6, 3, 4]],
  }),
  acto4: pista({
    bpm: 48, raiz: 39, escala: EOLIO, dron: 'hielo', dronVol: 0.12, pads: ['cuerdas'], padVol: 0.035,
    mel: 'cristal', melVol: 0.08, densidad: 0.3, registro: 21, silencio: 0.3, campana: 0.15,
    textura: 'aullido', texturaVol: 0.22, prog: [[0, 5, 2, 6], [0, 3, 5, 6], [0, 6, 5, 3]],
  }),
  acto5: pista({
    bpm: 56, raiz: 35, escala: LOCRIO, dron: 'distorsion', dronVol: 0.12, pads: ['coro'], padVol: 0.04,
    mel: 'arco', melVol: 0.08, densidad: 0.25, registro: 7, perc: 'latido', percVol: 0.45, disonante: true,
    textura: 'rugido', texturaVol: 0.25, prog: [[0, 1, 0, 4], [0, 4, 1, 0], [0, 6, 1, 4]],
  }),
  mazmorra: pista({
    bpm: 52, raiz: 37, escala: FRIGIO, dron: 'oscuro', dronVol: 0.13, pads: [],
    mel: 'pulsado', melVol: 0.08, densidad: 0.15, registro: 7, silencio: 0.45, campana: 0.12,
    perc: 'lejano', percVol: 0.3, textura: 'goteo', texturaVol: 0.3,
    prog: [[0, 1, 0, 0], [0, 0, 1, 6], [0, 3, 1, 0]],
  }),
  // mazmorras de cada acto: la misma calma de la de Velmora, con el color de su tierra
  mazmorra2: pista({ bpm: 50, raiz: 38, escala: FRIGIO_DOM, dron: 'arena', dronVol: 0.12, pads: [], mel: 'flauta', melVol: 0.06, densidad: 0.15, registro: 7, silencio: 0.5, campana: 0.1, perc: 'lejano', percVol: 0.25, textura: 'viento', texturaVol: 0.25, prog: [[0, 1, 0, 0], [0, 0, 1, 6], [0, 3, 1, 0]] }),
  mazmorra3: pista({ bpm: 54, raiz: 36, escala: DORICO, dron: 'selva', dronVol: 0.12, pads: [], mel: 'pulsado', melVol: 0.07, densidad: 0.18, registro: 7, silencio: 0.45, campana: 0.08, perc: 'lejano', percVol: 0.3, textura: 'insectos', texturaVol: 0.25, prog: [[0, 1, 0, 0], [0, 0, 1, 6], [0, 3, 1, 0]] }),
  mazmorra4: pista({ bpm: 48, raiz: 40, escala: EOLIO, dron: 'hielo', dronVol: 0.13, pads: [], mel: 'cristal', melVol: 0.06, densidad: 0.14, registro: 7, silencio: 0.5, campana: 0.15, perc: 'lejano', percVol: 0.2, textura: 'goteo', texturaVol: 0.3, prog: [[0, 1, 0, 0], [0, 0, 1, 6], [0, 3, 1, 0]] }),
  mazmorra5: pista({ bpm: 56, raiz: 34, escala: LOCRIO, dron: 'distorsion', dronVol: 0.12, pads: [], mel: 'pulsado', melVol: 0.07, densidad: 0.2, registro: 7, silencio: 0.4, campana: 0.05, perc: 'lejano', percVol: 0.35, textura: 'fuego', texturaVol: 0.3, disonante: true, prog: [[0, 1, 0, 0], [0, 0, 1, 6], [0, 3, 1, 0]] }),
  mazmorra6: pista({ bpm: 46, raiz: 37, escala: FRIGIO, dron: 'organo', dronVol: 0.11, pads: [], mel: 'arco', melVol: 0.06, densidad: 0.14, registro: 7, silencio: 0.5, campana: 0.25, perc: 'lejano', percVol: 0.2, textura: 'goteo', texturaVol: 0.35, prog: [[0, 1, 0, 0], [0, 0, 1, 6], [0, 3, 1, 0]] }),
  mazmorra7: pista({ bpm: 50, raiz: 41, escala: ARMONICA, dron: 'organo', dronVol: 0.12, pads: ['coro'], padVol: 0.04, mel: 'cristal', melVol: 0.07, densidad: 0.16, registro: 7, silencio: 0.45, campana: 0.2, perc: 'lejano', percVol: 0.25, textura: 'viento', texturaVol: 0.2, prog: [[0, 1, 0, 0], [0, 0, 1, 6], [0, 3, 1, 0]] }),
  jefe: pista({
    bpm: 78, raiz: 33, escala: FRIGIO, dron: 'distorsion', dronVol: 0.13, pads: ['coro'], padVol: 0.05,
    mel: 'metal', melVol: 0.09, densidad: 0.5, registro: 7, silencio: 0.1, bajo: 0.15, campana: 0.1,
    perc: 'jefe', percVol: 0.5, disonante: true, prog: [[0, 1, 0, 6], [0, 5, 1, 4], [0, 1, 5, 1]],
  }),
};

// umbrales (en compases) para la intro que se construye
const UMBRAL: Record<string, number> = { pad: 2, coro: 6, bajo: 4, mel: 8, campana: 10, perc: 12 };

const ARPEGIOS = [
  [0, 2, 4, 7, 4, 2, 4, 7],
  [0, 4, 7, 9, 7, 4, 2, 4],
  [0, 4, 2, 4, 7, 4, 2, 4],
  [-3, 0, 2, 4, 2, 0, 2, 4],
  [0, 7, 4, 7, 2, 7, 4, 7],
];

// ============================================================================
// Reproductor generativo
// ============================================================================

interface Nota { deg: number; len: number; vel: number }

interface Rep {
  id: Exclude<Musica, null>;
  p: Pista;
  salida: GainNode;
  capas: Capa[];
  sd: number; // duracion de corchea
  proximo: number;
  paso: number;
  semilla: number;
  motivo: (Nota | null)[];
  frase: (Nota | null)[];
  prog: number[];
  arp: number[];
  fin: number; // >0 cuando se esta desvaneciendo
}

let repActual: Rep | null = null;
let reps: Rep[] = [];
let musicaPedida: Musica = null;

function gradoAMidi(p: Pista, deg: number): number {
  const n = p.escala.length;
  const oct = Math.floor(deg / n);
  const i = ((deg % n) + n) % n;
  return p.raiz + (p.escala[i] as number) + 12 * oct;
}

function generarMotivo(rng: () => number, densidad: number): (Nota | null)[] {
  const ev: (Nota | null)[] = new Array<Nota | null>(16).fill(null);
  const largos = [1, 2, 2, 3, 4, 4, 6];
  const pasos = [-2, -1, -1, 1, 1, 2, 0, -3, 3, -1];
  let s = 0;
  let d = [0, 2, 4][Math.floor(rng() * 3)] as number;
  while (s < 16) {
    const len = Math.min(largos[Math.floor(rng() * largos.length)] as number, 16 - s);
    if (s === 0 || rng() < densidad + 0.3) ev[s] = { deg: d, len, vel: 0.7 + rng() * 0.3 };
    s += len;
    d = lim(d + (pasos[Math.floor(rng() * pasos.length)] as number), -3, 9);
  }
  return ev;
}

function variar(m: (Nota | null)[], op: number, rng: () => number): (Nota | null)[] {
  const r: (Nota | null)[] = new Array<Nota | null>(16).fill(null);
  const primero = m.find((x) => x) ?? { deg: 0, len: 1, vel: 1 };
  for (let s = 0; s < 16; s++) {
    const n = m[s];
    if (!n) continue;
    switch (op) {
      case 1: r[s] = { ...n, deg: 2 * primero.deg - n.deg }; break; // inversion
      case 2: { const ns = 16 - s - n.len; if (ns >= 0) r[ns] = { ...n }; break; } // retrogrado
      case 3: r[s] = { ...n, deg: n.deg + 2 }; break; // tercera arriba
      case 4: if (s === 0 || rng() > 0.35) r[s] = { ...n }; break; // raleo
      case 5: // ornamento
        if (n.len >= 2 && rng() < 0.5) {
          r[s] = { ...n, len: n.len - 1 };
          r[s + n.len - 1] = { deg: n.deg + (rng() < 0.5 ? 1 : -1), len: 1, vel: n.vel * 0.8 };
        } else r[s] = { ...n };
        break;
      default: r[s] = { ...n };
    }
  }
  return r;
}

function nuevaFrase(r: Rep, compas: number): void {
  const n = Math.floor(compas / 4);
  const rng = mulberry32((r.semilla + Math.imul(n + 1, 2654435761)) >>> 0);
  const P = r.p;
  if (n % 2 === 0) r.prog = P.prog[Math.floor(rng() * P.prog.length)] as number[];
  if (n > 0 && n % 6 === 0) {
    // mutacion lenta del motivo: sigue reconocible pero evoluciona
    const idx = r.motivo.findIndex((x, i) => x && i > 0 && rng() < 0.4);
    const nota = idx >= 0 ? r.motivo[idx] : null;
    if (nota) nota.deg = lim(nota.deg + (rng() < 0.5 ? 1 : -1), -3, 9);
  }
  r.arp = ARPEGIOS[Math.floor(rng() * ARPEGIOS.length)] as number[];
  r.frase = new Array<Nota | null>(32).fill(null);
  if (rng() < P.silencio) return;
  const ops = [0, 0, 1, 2, 3, 4, 5, 5];
  const v1 = variar(r.motivo, ops[Math.floor(rng() * ops.length)] as number, rng);
  const v2 = variar(r.motivo, ops[Math.floor(rng() * ops.length)] as number, rng);
  // cadencia: la ultima nota de la respuesta reposa en la tonica o la quinta
  for (let s = 15; s >= 0; s--) {
    const x = v2[s];
    if (x) { x.deg = rng() < 0.6 ? 0 : 4; break; }
  }
  for (let s = 0; s < 16; s++) {
    r.frase[s] = v1[s] ?? null;
    r.frase[16 + s] = v2[s] ?? null;
  }
}

function crearDron(tipo: TipoDron, raiz: number, dest: AudioNode, vol: number, t: number): Capa {
  const c = nuevaCapa(dest, vol, t, 3);
  const s = c.salida;
  const f = mtof(raiz);
  switch (tipo) {
    case 'organo': {
      const lp = filt('lowpass', 800, 0.7, s);
      lfoCont(c, 0.04, 300, lp.frequency, t);
      oscCont(c, 'sine', f, t, lp);
      oscCont(c, 'sine', f * 2, t, gan(0.5, lp), 3);
      oscCont(c, 'triangle', f * 3, t, gan(0.18, lp), -3);
      oscCont(c, 'sine', f / 2, t, gan(0.6, lp));
      break;
    }
    case 'oscuro': {
      const lp = filt('lowpass', 320, 1.5, s);
      lfoCont(c, 0.05, 160, lp.frequency, t);
      oscCont(c, 'sawtooth', f / 2, t, lp, -6);
      oscCont(c, 'sawtooth', f, t, gan(0.6, lp), 7);
      oscCont(c, 'sine', f / 2, t, gan(0.8, s));
      break;
    }
    case 'arena': {
      const b = filt('bandpass', f * 4, 3, s);
      lfoCont(c, 0.09, f * 2, b.frequency, t);
      const g = gan(1.4, b);
      lfoCont(c, 0.3, 0.3, g.gain, t);
      oscCont(c, 'sawtooth', f, t, g);
      oscCont(c, 'sawtooth', f * 1.5, t, gan(0.5, g), 4);
      oscCont(c, 'sine', f / 2, t, gan(0.6, s));
      break;
    }
    case 'selva': {
      const g = gan(0.8, s);
      lfoCont(c, 0.17, 0.3, g.gain, t);
      oscCont(c, 'sine', f, t, g);
      oscCont(c, 'sine', f * 1.5, t, gan(0.35, g), 5);
      const lp = filt('lowpass', 250, 2, gan(0.5, s));
      lfoCont(c, 0.07, 120, lp.frequency, t);
      oscCont(c, 'sawtooth', f / 2, t, lp);
      break;
    }
    case 'hielo': {
      oscCont(c, 'sine', f, t, gan(0.7, s));
      for (const [semi, rate] of [[36, 0.23], [43, 0.31], [48, 0.17], [51, 0.27]] as const) {
        const g = gan(0.06, s);
        lfoCont(c, rate, 0.06, g.gain, t);
        oscCont(c, 'sine', mtof(raiz + semi), t, g, al(-6, 6));
      }
      break;
    }
    case 'distorsion': {
      const lp = filt('lowpass', 380, 1, s);
      lfoCont(c, 0.06, 150, lp.frequency, t);
      const d = dist(4, lp);
      const pre = gan(0.5, d);
      oscCont(c, 'sawtooth', f / 2, t, pre);
      oscCont(c, 'sawtooth', f / 2 * 1.06, t, pre); // segunda menor batiendo
      oscCont(c, 'sine', f / 2, t, gan(0.9, s));
      break;
    }
    case 'suave': {
      const lp = filt('lowpass', 500, 0.7, s);
      oscCont(c, 'triangle', f, t, lp);
      oscCont(c, 'sine', f * 1.5, t, gan(0.4, lp), 3);
      oscCont(c, 'sine', f / 2, t, gan(0.6, lp));
      lfoCont(c, 0.08, 0.25, s.gain, t);
      break;
    }
  }
  return c;
}

function crearRep(id: Exclude<Musica, null>): Rep {
  const t = ac.currentTime;
  const P = PISTAS[id];
  const salida = gan(0, busMusica);
  salida.gain.setValueAtTime(0, t);
  salida.gain.linearRampToValueAtTime(1, t + 2);
  const envio = gan(0.35, revEntrada);
  salida.connect(envio);
  const capas: Capa[] = [crearDron(P.dron, P.raiz, salida, P.dronVol, t)];
  if (P.textura) capas.push(crearLecho(P.textura, salida, P.texturaVol, t));
  // semilla estable por pista + variacion por sesion (coherente dentro de la sesion)
  const semilla = (hash(id) ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
  const rng = mulberry32(semilla);
  const r: Rep = {
    id, p: P, salida, capas, sd: 30 / P.bpm, proximo: t + 0.15, paso: 0, semilla,
    motivo: generarMotivo(rng, P.densidad), frase: [], prog: P.prog[0] as number[],
    arp: ARPEGIOS[0] as number[], fin: 0,
  };
  return r;
}

function activo(r: Rep, capa: string, compas: number): boolean {
  if (!r.p.construir) return true;
  return compas >= (UMBRAL[capa] ?? 0);
}

function pasoPista(r: Rep, t: number): void {
  const P = r.p;
  const comp = r.paso % 8;
  const compas = Math.floor(r.paso / 8);
  const dCompas = r.sd * 8;
  const o = r.salida;
  if (comp === 0 && compas % 4 === 0) nuevaFrase(r, compas);
  const raizAc = r.prog[compas % 4] as number;
  const rngC = mulberry32((r.semilla ^ Math.imul(compas + 7, 40503)) >>> 0);
  const intensidadIntro = P.construir ? lim(compas / 16, 0.25, 1) : 1;

  if (comp === 0) {
    // pads
    const grados = [raizAc + 7, raizAc + 9, raizAc + 11];
    if (P.disonante && rngC() < 0.5) grados.push(raizAc + 8);
    const fs = grados.map((g) => mtof(gradoAMidi(P, g)));
    for (const pad of P.pads) {
      const capa = pad === 'coro' ? 'coro' : 'pad';
      if (activo(r, capa, compas)) PADS[pad]?.(o, t, fs, dCompas * 1.02, P.padVol * intensidadIntro);
    }
    if (P.bajo > 0 && activo(r, 'bajo', compas)) {
      INST.bajo?.(o, t, mtof(gradoAMidi(P, raizAc)), dCompas * 0.9, P.bajo);
    }
    if (P.campana > 0 && activo(r, 'campana', compas) && rngC() < P.campana) {
      const deg = [0, 4, 7][Math.floor(rngC() * 3)] as number;
      campanaFM(o, t + r.sd * Math.floor(rngC() * 4), mtof(gradoAMidi(P, deg + 14)), 3.5, 0.06);
    }
  }

  // melodia
  if (P.mel && activo(r, 'mel', compas)) {
    const n = r.frase[(compas % 4) * 8 + comp];
    if (n) {
      const f = mtof(gradoAMidi(P, n.deg + raizAc + P.registro));
      INST[P.mel]?.(o, t, f, n.len * r.sd * 1.05, P.melVol * n.vel);
    }
  }

  // arpegio (campamentos)
  if (P.arp) {
    const deg = r.arp[comp] as number;
    if (rngC() > 0.08 || comp === 0) {
      INST[P.arp]?.(o, t + al(0, 0.012), mtof(gradoAMidi(P, raizAc + 7 + deg)), r.sd * 2, P.arpVol * (comp === 0 ? 1 : 0.75));
    }
  }

  // percusion
  if (P.perc !== 'ninguna' && activo(r, 'perc', compas)) {
    const v = P.percVol * intensidadIntro;
    const azar = Math.random();
    switch (P.perc) {
      case 'taiko':
        if (comp === 0) taiko(o, t, 55, v);
        else if (comp === 5) taiko(o, t, 62, v * 0.6);
        else if (comp === 7 && azar < 0.3) taiko(o, t, 75, v * 0.4);
        break;
      case 'jefe':
        if (comp === 0 || comp === 4) taiko(o, t, 50, v);
        else if (comp === 3 || comp === 6) taiko(o, t, 62, v * 0.65);
        else if (azar < 0.35) taiko(o, t, 80, v * 0.35);
        break;
      case 'marco':
        if (comp === 0 || comp === 4) marco(o, t, true, v);
        else if (comp === 2 || comp === 3 || comp === 6) marco(o, t, false, v * (0.6 + azar * 0.4));
        else if (azar < 0.25) marco(o, t, false, v * 0.3);
        break;
      case 'humeda': {
        if (comp === 0) golpeHumedo(o, t, 140, v);
        const tonos = [300, 400, 450, 600, 800];
        if (azar < 0.35) golpeHumedo(o, t + (Math.random() < 0.3 ? r.sd / 2 : 0), elegir(tonos), v * al(0.3, 0.7));
        break;
      }
      case 'latido':
        if (comp === 0) latidoGolpe(o, t, v);
        else if (comp === 1) latidoGolpe(o, t - r.sd * 0.3, v * 0.6);
        break;
      case 'lejano':
        if (comp === 0 && compas % 2 === 0) taiko(o, t, 48, v * 0.7);
        break;
    }
  }
}

// ============================================================================
// Capa de combate
// ============================================================================

const combate = { salida: null as GainNode | null, objetivo: 0, proximo: 0, paso: 0, hasta: 0 };

function crearCombate(): void {
  combate.salida = gan(0, busMusica);
  combate.salida.connect(gan(0.25, revEntrada));
}

function tickCombate(desde: number, hasta: number): void {
  const o = combate.salida;
  if (!o) return;
  if (combate.objetivo < 0.02 && desde > combate.hasta) return;
  const sd = 30 / 92;
  if (combate.proximo < desde - 0.05) {
    // alinear con el reproductor actual si existe
    combate.proximo = desde + 0.05;
    combate.paso = 0;
  }
  const raiz = repActual ? repActual.p.raiz : 38;
  const I = combate.objetivo;
  let n = 0;
  while (combate.proximo < hasta && n < 16) {
    const t = combate.proximo;
    const comp = combate.paso % 8;
    const compas = Math.floor(combate.paso / 8);
    const az = Math.random();
    if (comp === 0) taiko(o, t, 52, 0.55);
    else if (comp === 3) taiko(o, t, 66, 0.4);
    else if (comp === 4 && I > 0.45) taiko(o, t, 52, 0.45);
    else if ((comp === 6 || comp === 7) && az < 0.3 + I * 0.6) taiko(o, t, 82, 0.25);
    // ostinato frigio tenso
    const semis = [0, 0, 1, 0, 0, 0, 1, -1][comp] as number;
    INST.arcoCorto?.(o, t, mtof(raiz + 12 + semis), sd, 0.07 + I * 0.05);
    if (I > 0.6 && comp === 0 && compas % 2 === 0) {
      INST.arco?.(o, t, mtof(raiz + 36), sd * 15, 0.025);
      INST.arco?.(o, t, mtof(raiz + 37), sd * 15, 0.02);
    }
    combate.proximo += sd;
    combate.paso++;
    n++;
  }
}

// ============================================================================
// Latido (vida baja)
// ============================================================================

const latido = { salida: null as GainNode | null, on: false, proximo: 0, hasta: 0, periodo: 0.86, golpes: [] as number[] };

function crearLatido(): void {
  latido.salida = gan(0, busHorror);
}
/** Diferencia entre el reloj de audio y el de la página, para que la pantalla lata justo con el sonido. */
const relojPagina = (tAudio: number) => performance.now() / 1000 + (tAudio - ac.currentTime);

function tickLatido(desde: number, hasta: number): void {
  const o = latido.salida;
  if (!o) return;
  if (!latido.on && desde > latido.hasta) return;
  if (latido.proximo < desde - 0.05) latido.proximo = desde + 0.05;
  while (latido.proximo < hasta) {
    const t = latido.proximo;
    latidoGolpe(o, t, 0.8);
    latidoGolpe(o, t + latido.periodo * 0.31, 0.5);
    latido.golpes.push(relojPagina(t)); if (latido.golpes.length > 4) latido.golpes.shift();
    latido.proximo += latido.periodo * al(0.97, 1.03);
  }
}

// ============================================================================
// Ambiente
// ============================================================================

let ambActual: { id: IdAmbiente; capa: Capa | null } = { id: 'nada', capa: null };
let ambPedido: IdAmbiente = 'nada';
const ambViejos: { capa: Capa; fin: number }[] = [];

const MAPA_AMB: Record<Exclude<IdAmbiente, 'nada'>, TipoLecho> = {
  lluvia: 'lluvia', viento: 'viento', fuego: 'fuego', cueva: 'cueva', selva: 'selva', infierno: 'infierno',
};

function cambiarAmbiente(id: IdAmbiente): void {
  if (ambActual.id === id && (ambActual.capa || id === 'nada')) return;
  const t = ac.currentTime;
  if (ambActual.capa) {
    pararCapa(ambActual.capa, t);
    ambViejos.push({ capa: ambActual.capa, fin: t + 3 });
  }
  ambActual = { id, capa: id === 'nada' ? null : crearLecho(MAPA_AMB[id], busAmbiente, 0.9, t) };
}

// ============================================================================
// Planificador
// ============================================================================

const ANTICIPO = 0.3;

function tick(): void {
  if (!listo) return;
  try {
    if (ac.state !== 'running') return;
    const ahora = ac.currentTime;
    const hasta = ahora + ANTICIPO;
    for (const r of reps) {
      if (r.proximo < ahora - 0.05) r.proximo = ahora + 0.05; // pestana dormida: resincronizar
      let n = 0;
      if (!r.fin) {
        while (r.proximo < hasta && n < 16) {
          pasoPista(r, r.proximo);
          r.proximo += r.sd;
          r.paso++;
          n++;
        }
      }
      for (const c of r.capas) c.tick?.(ahora, hasta);
    }
    // limpiar pistas desvanecidas
    reps = reps.filter((r) => {
      if (r.fin && ahora > r.fin) {
        try { r.salida.disconnect(); } catch { /* nada */ }
        return false;
      }
      return true;
    });
    tickCombate(ahora, hasta);
    tickLatido(ahora, hasta);
    ambActual.capa?.tick?.(ahora, hasta);
    for (let i = ambViejos.length - 1; i >= 0; i--) if ((ambViejos[i] as { fin: number }).fin < ahora) ambViejos.splice(i, 1);
  } catch { /* nunca lanzar */ }
}

function cambiarMusica(m: Musica): void {
  const t = ac.currentTime;
  if (repActual) {
    const r = repActual;
    const g = r.salida.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(0, t + 2);
    for (const c of r.capas) pararCapa(c, t + 0.5);
    r.fin = t + 2.5;
    repActual = null;
  }
  if (m) {
    repActual = crearRep(m);
    reps.push(repActual);
  }
}

// ============================================================================
// Susurro
// ============================================================================

function susurrar(pan?: number, d = 0.15): void {
  const t0 = ac.currentTime + 0.05;
  const o = crearVoz(0.55, pan ?? al(-0.9, 0.9), d, REVERB_EXTRA.susurro ?? 0.5, busHorror);
  const n = 5 + Math.floor(Math.random() * 6);
  let t = t0;
  const vocales = Object.keys(VOCALES);
  const escala = al(0.9, 1.15);
  for (let i = 0; i < n; i++) {
    if (Math.random() < 0.35) {
      // consonante sibilante
      const d = al(0.04, 0.1);
      const g = gan(0, o);
      env(g.gain, t, 0.01, al(0.15, 0.3), d);
      ruido(t, t + d + 0.03, filt('highpass', al(3500, 6000), 1, g));
      t += d * 0.8;
    }
    const d = al(0.09, 0.24);
    const g = gan(0, o);
    g.gain.setValueAtTime(EPS, t);
    g.gain.exponentialRampToValueAtTime(al(0.5, 0.9), t + 0.03);
    g.gain.exponentialRampToValueAtTime(EPS, t + d);
    const fb = formantes(elegir(vocales), g, escala);
    const glide = al(0.88, 1.12);
    for (const f of fb.filtros) f.frequency.exponentialRampToValueAtTime(f.frequency.value * glide, t + d);
    ruido(t, t + d + 0.02, fb.entrada);
    t += d + al(0.02, 0.1) + (Math.random() < 0.18 ? al(0.15, 0.3) : 0);
  }
  vocesFin.push(t + 0.5);
  liberar(o, t - ac.currentTime + 1.5);
}

// ============================================================================
// Horror: dron de jefe y efectos de gore y sustos
// ============================================================================

const dron = { salida: null as GainNode | null, filtro: null as BiquadFilterNode | null, nivel: 0 };
/** Un dron grave y sucio que sube cuando hay un jefe despierto cerca: dos sierras desafinadas, un subgrave y ruido marrón. */
function crearDronJefe(): void {
  const t = ac.currentTime;
  dron.salida = gan(0, busHorror);
  dron.filtro = filt('lowpass', 180, 2, dron.salida);
  for (const [f, det] of [[41.2, 0], [41.2, 9], [61.7, -6]] as [number, number][]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; o.connect(gan(0.22, dron.filtro)); o.start(t); }
  const sub = ac.createOscillator(); sub.type = 'sine'; sub.frequency.value = 30.9; sub.connect(gan(0.5, dron.salida)); sub.start(t);
  const rb = ac.createBufferSource(); rb.buffer = ruidos[MARRON] as AudioBuffer; rb.loop = true; rb.connect(filt('lowpass', 260, 0.8, gan(0.35, dron.filtro))); rb.start(t);
  const l = ac.createOscillator(); l.frequency.value = 0.13; const lg = gan(70, dron.filtro.frequency as any); l.connect(lg); l.start(t);
}

/** Chapoteo de sangre: un golpe húmedo grave, ruido que se cierra rápido y unas gotas que caen después. */
function chapoteo(o: AudioNode, t: number, p: number, grande: boolean): number {
  const v = grande ? 0.7 : 0.7;
  golpeSordo(o, t, 140 * p, 55, v * 0.7, grande ? 0.16 : 0.09);
  const g = gan(0, o); env(g.gain, t, 0.003, v * 0.8, grande ? 0.22 : 0.12);
  const lp = filt('lowpass', 1400 * p, 1.2, g); lp.frequency.exponentialRampToValueAtTime(260, t + (grande ? 0.25 : 0.14));
  ruido(t, t + 0.3, lp, ROSA);
  const n = grande ? 7 : 3;
  for (let i = 0; i < n; i++) golpeHumedo(o, t + 0.05 + al(0, grande ? 0.5 : 0.25), al(500, 1100) * p, al(0.1, 0.25) * v);
  return grande ? 0.7 : 0.35;
}
const EFECTOS_HORROR: Record<string, Fx> = {
  chapoteo(o, t, p) { return chapoteo(o, t, p, false); },
  reventon(o, t, p) { golpeSordo(o, t, 90 * p, 38, 0.5, 0.3); return chapoteo(o, t + 0.01, p * 0.8, true); },
  /** Huesos que crujen: una ráfaga de chasquidos secos que se astillan, y el golpe sordo del montón al caer. */
  hueso_cruje(o, t, p) {
    const n = 7 + Math.floor(Math.random() * 6);
    let tt = t;
    for (let i = 0; i < n; i++) { chasquido(o, tt, al(1800, 4200) * p, al(3, 9), al(0.25, 0.6), al(0.01, 0.03)); tt += al(0.012, 0.06); }
    golpeSordo(o, tt, 220 * p, 90, 0.5, 0.08);
    crujido(o, t, 0.18, 900 * p, 0.25);
    return tt - t + 0.2;
  },
  /** Carne que se desgarra: ruido áspero que barre hacia arriba con un temblor, sobre un tirón grave. */
  desgarro(o, t, p) {
    const g = gan(0, o); envSost(g.gain, t, 0.01, 0.7, 0.22, 0.08);
    const b = filt('bandpass', 500 * p, 2.5, g); b.frequency.exponentialRampToValueAtTime(2600 * p, t + 0.28);
    const am = gan(0.5, b); lfo(38, 0.5, am.gain, t, t + 0.35, 'square');
    ruido(t, t + 0.36, am, BLANCO);
    golpeSordo(o, t, 110 * p, 50, 0.6, 0.12);
    chapoteo(o, t + 0.06, p, false);
    return 0.45;
  },
  /** El golpe del susto: un cluster grave de órgano y cuerdas que entra de golpe y un platillo raspado. */
  golpe_susto(o, t, p) {
    const g = gan(0, o); env(g.gain, t, 0.004, 0.2, 1.6);
    const lp = filt('lowpass', 1800, 0.9, g); lp.frequency.exponentialRampToValueAtTime(240, t + 1.4);
    for (const [f, det] of [[55, 0], [58.3, 4], [82.4, -3], [110, 6], [116.5, -5]] as [number, number][]) osc('sawtooth', f * p, t, t + 1.8, lp, det);
    golpeSordo(o, t, 70, 32, 0.55, 0.5);
    const gm = gan(0, o); env(gm.gain, t, 0.002, 0.35, 0.9); ruido(t, t + 1, filt('bandpass', 5200, 1.5, gm));
    return 1.9;
  },
};
const HORROR = new Set([...Object.keys(EFECTOS_HORROR), 'susurro']);

// ============================================================================
// API publica
// ============================================================================

function iniciar(): void {
  if (fallido) return;
  try {
    if (!listo) {
      const w = globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
      const Ctor = w.AudioContext ?? w.webkitAudioContext;
      if (!Ctor) { fallido = true; return; }
      ac = new Ctor({ latencyHint: 'interactive' });
      listo = true;
      construirGrafo();
      reloj = setInterval(tick, 100);
      if (musicaPedida) cambiarMusica(musicaPedida);
      if (ambPedido !== 'nada') cambiarAmbiente(ambPedido);
      if (latido.on) {
        latido.salida?.gain.setTargetAtTime(1, ac.currentTime, 0.3);
      }
      if (combate.objetivo > 0) combate.salida?.gain.setTargetAtTime(combate.objetivo, ac.currentTime, 0.6);
    }
    // iOS deja el contexto en 'suspended' hasta un toque y en 'interrupted' al volver de segundo plano o de una llamada
    if (ac.state !== 'running') {
      const pr = ac.resume();
      if (pr) pr.then(() => tick()).catch(() => { /* nada */ });
      // el truco de siempre en iOS: un búfer mudo dentro del gesto termina de desbloquear la salida
      try { const b = ac.createBuffer(1, 1, 22050), f = ac.createBufferSource(); f.buffer = b; f.connect(ac.destination); f.start(0); } catch { /* nada */ }
    }
    tick();
  } catch {
    fallido = !listo;
  }
}

if (typeof window !== 'undefined') (window as any).__audio = (pausar?: boolean) => { if (pausar && listo) void ac.suspend(); return listo ? ac.state : 'sin crear'; };
/** Al volver de segundo plano el contexto queda suspendido o interrumpido: se reanuda solo (y, si iOS no deja, al próximo toque). */
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && listo && ac.state !== 'running') { try { ac.resume().then(() => tick()).catch(() => { /* nada */ }); } catch { /* nada */ } }
});

export const Sonido = {
  iniciar,
  /** El audio todavía no suena: no hubo gesto o el navegador lo tiene suspendido. */
  mudo(): boolean { return !listo || ac.state !== 'running'; },

  volumen(general: number, musica: number, efectos: number, horror = vols.horror): void {
    try {
      vols.horror = lim(Number(horror) || 0, 0, 1);
      vols.general = lim(Number(general) || 0, 0, 1);
      vols.musica = lim(Number(musica) || 0, 0, 1);
      vols.efectos = lim(Number(efectos) || 0, 0, 1);
      aplicarVolumen();
    } catch { /* nada */ }
  },

  musica(m: Musica): void {
    try {
      if (m !== null && !(m in PISTAS)) m = null;
      if (m === musicaPedida && (!listo || repActual?.id === m || (m === null && !repActual))) return;
      musicaPedida = m;
      if (!listo) return;
      cambiarMusica(m);
    } catch { /* nada */ }
  },

  combate(intensidad: number): void {
    try {
      const I = lim(Number(intensidad) || 0, 0, 1);
      combate.objetivo = I;
      if (!listo || !combate.salida) return;
      const t = ac.currentTime;
      combate.salida.gain.setTargetAtTime(I * 0.9, t, I > 0 ? 0.5 : 0.8);
      if (I < 0.02) combate.hasta = t + 4;
    } catch { /* nada */ }
  },

  efecto(id: string, o?: { pan?: number; vol?: number; tono?: number; dist?: number }): void {
    try {
      if (!listo || ac.state !== 'running') return;
      const ms = ahoraMs();
      const ult = ultimoEfecto.get(id);
      if (ult !== undefined && ms - ult < 40) return;
      if (!hayHueco()) return;
      ultimoEfecto.set(id, ms);
      const op: OpcionesEfecto = o ?? {};
      const d = lim(op.dist ?? 0, 0, 1);
      const vol = lim(op.vol ?? 1, 0, 2);
      if (vol <= 0.001) return;
      const tono = (op.tono && op.tono > 0 ? op.tono : 1) * (1 + (Math.random() - 0.5) * 0.08);
      const t = ac.currentTime + 0.005;
      const voz = crearVoz(vol, op.pan ?? 0, d, REVERB_EXTRA[id] ?? (id === 'golpe_susto' ? 0.6 : 0), HORROR.has(id) ? busHorror : busEfectos);
      const fx = EFECTOS_HORROR[id] ?? EFECTOS[id] ?? efectoGenerico;
      const dur = fx(voz, t, tono);
      vocesFin.push(t + dur);
      liberar(voz, dur + 0.3);
    } catch { /* nada */ }
  },

  ambiente(id: IdAmbiente): void {
    try {
      const v: IdAmbiente = id in MAPA_AMB ? id : 'nada';
      ambPedido = v;
      if (!listo) return;
      cambiarAmbiente(v);
    } catch { /* nada */ }
  },

  susurro(pan?: number, dist?: number): void {
    try {
      if (!listo || ac.state !== 'running') return;
      const ms = ahoraMs();
      const ult = ultimoEfecto.get('__susurro');
      if (ult !== undefined && ms - ult < 400) return;
      if (!hayHueco()) return;
      ultimoEfecto.set('__susurro', ms);
      susurrar(pan === undefined ? undefined : lim(pan, -1, 1), dist === undefined ? 0.15 : lim(dist, 0, 1));
    } catch { /* nada */ }
  },

  /** Ritmo del latido (segundos entre latidos): más rápido cuanto menos vida queda. */
  latidoRitmo(periodo: number): void { latido.periodo = lim(Number(periodo) || 0.86, 0.35, 1.4); },
  /** Segundos desde el último latido que sonó (para que la pantalla lata con él), o -1 si no hay latido. */
  latidoFase(): number { if (!latido.on) return -1; const ahora = performance.now() / 1000; const g = latido.golpes.filter((x) => x <= ahora); return g.length ? ahora - g[g.length - 1] : -1; },
  /** El dron grave cerca de un jefe despierto: 0 apagado, 1 encima. */
  dronJefe(nivel: number): void {
    try {
      if (!listo || !dron.salida || !dron.filtro) return;
      const v = lim(Number(nivel) || 0, 0, 1);
      if (Math.abs(v - dron.nivel) < 0.02) return;
      dron.nivel = v; const t = ac.currentTime;
      dron.salida.gain.setTargetAtTime(v * 0.55, t, v > 0 ? 1.2 : 0.8);
      dron.filtro.frequency.setTargetAtTime(140 + v * 380, t, 1.5);
    } catch { /* nada */ }
  },
  latido(on: boolean): void {
    try {
      const v = !!on;
      if (v === latido.on) return;
      latido.on = v;
      if (!listo || !latido.salida) return;
      const t = ac.currentTime;
      latido.salida.gain.setTargetAtTime(v ? 1 : 0, t, v ? 0.3 : 0.5);
      if (!v) latido.hasta = t + 2.5;
    } catch { /* nada */ }
  },
};

/** Solo para depuracion / pruebas: detiene el planificador. */
export function _detenerSonido(): void {
  try {
    if (reloj) clearInterval(reloj);
    reloj = null;
  } catch { /* nada */ }
}

/** Solo para pruebas: renderiza un efecto fuera de línea y devuelve su pico, su RMS y la duración con sonido. */
export async function _renderEfecto(id: string, seg = 2.5): Promise<{ pico: number; rms: number; activo: number }> {
  const viejoAc = ac, viejos = ruidos;
  const off = new OfflineAudioContext(1, Math.floor(44100 * seg), 44100);
  ac = off as unknown as AudioContext;
  try {
    crearRuidos();
    const salida = off.createGain(); salida.connect(off.destination);
    const fx = EFECTOS_HORROR[id] ?? EFECTOS[id];
    if (!fx) throw new Error('no existe ' + id);
    fx(salida, 0.01, 1);
  } finally { ac = viejoAc; }
  const buf = await off.startRendering();
  ruidos = viejos;
  const d = buf.getChannelData(0); let pico = 0, s = 0, act = 0;
  for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); pico = Math.max(pico, a); s += d[i] * d[i]; if (a > 0.01) act = i; }
  return { pico, rms: Math.sqrt(s / d.length), activo: act / 44100 };
}
