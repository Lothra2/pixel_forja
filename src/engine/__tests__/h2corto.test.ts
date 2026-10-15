import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { AMBIENCE_NAMES } from '../audio/ambience';
import { SONIDOS, renderSound } from '../audio/catalogo';
import { RATE, SFX_NAMES } from '../audio/sfx';
import { SFX_DEPORTE } from '../audio/deporte';
import { SFX_MUNDOS, SFX_MUNDOS_H2C } from '../audio/mundos';
import { SFX_PELOTA } from '../audio/pelota';
import { SFX_ATLETISMO } from '../audio/atletismo';
import { buildCustomKit, validateKitConfig, type KitConfig } from '../kit/custom';

/** Lo que pide el lote H2 corto: el trueno del rayo, el furrazo, la corneta de la moto y tres ambientes del Cross. */
const AMBIENTES = ['mercado', 'rio', 'estadio'];
const EFECTOS = ['trueno', 'furro', 'corneta_moto'];
/** Los 22 ambientes de antes (H6, H7 y B7H8), en su orden. */
const ANTES = [
  'bosque', 'agua', 'noche', 'viento', 'cueva', 'magia', 'mar', 'cafetal', 'llano',
  'trafico_saigon', 'hoian_noche', 'llovizna_bogota', 'lago_noche', 'azotea_noche', 'atardecer_cartagena', 'comuna', 'carnaval', 'pinos_dalat', 'liceo',
  'parque_tao_dan', 'barrio_caracas', 'dojo_hanoi',
];

const ms = (t: number) => Math.round(t * RATE);
const rms = (b: ArrayLike<number>, from = 0, to = b.length) => { let s = 0; for (let i = from; i < to; i++) s += b[i] * b[i]; return Math.sqrt(s / Math.max(1, to - from)); };
const peak = (b: Float32Array) => { let p = 0; for (const v of b) p = Math.max(p, Math.abs(v)); return p; };
const hash = (b: Float32Array) => createHash('sha256').update(Buffer.from(b.buffer, b.byteOffset, b.byteLength)).digest('hex');
const ventanas = (s: Float32Array, w: number) => { const o: number[] = []; for (let t = 0; t + w <= 12 + 1e-9; t += w) o.push(rms(s, ms(t), ms(t + w))); return o; };
/** Cuánto suena una frecuencia en una ventana (Goertzel). */
function tono(s: Float32Array, f: number, t0: number, t1: number) {
  const w = (2 * Math.PI * f) / RATE, c = 2 * Math.cos(w);
  let a = 0, b = 0;
  for (let i = ms(t0); i < ms(t1); i++) { const x = s[i] + c * a - b; b = a; a = x; }
  return Math.sqrt(Math.max(0, a * a + b * b - c * a * b)) / (ms(t1) - ms(t0));
}
/** Qué parte de la energía cae entre `a` y `b` Hz (un banco de tonos cada 25 Hz, en ventanas de 0.1 s cada `paso` s). */
function banda(s: Float32Array, a: number, b: number, paso = 0.5) {
  let dentro = 0, total = 0;
  const fin = s.length / RATE - 0.1;
  for (let f = 25; f < 8000; f += 25) {
    let e = 0;
    for (let t = Math.min(0.05, fin); t <= fin; t += paso) e += tono(s, f, t, t + 0.1) ** 2;
    total += e; if (f >= a && f < b) dentro += e;
  }
  return dentro / total;
}
/** La envolvente: el volumen muestra a muestra (rectificado y suavizado). */
function envolvente(s: Float32Array) {
  const o = new Float32Array(s.length);
  let y = 0;
  for (let i = 0; i < s.length; i++) { y += (Math.abs(s[i]) - y) * 0.05; o[i] = y; }
  return o;
}
/** Qué tanto se parece la envolvente a sí misma `lag` segundos después (1 = se repite igual). */
function seRepite(e: Float32Array, a: number, z: number, lag: number) {
  const A = ms(a), Z = ms(z), L = ms(lag);
  let m = 0; for (let i = A; i < Z; i++) m += e[i]; m /= Z - A;
  let c = 0, v = 0;
  for (let i = A; i < Z - L; i++) { c += (e[i] - m) * (e[i + L] - m); v += (e[i] - m) ** 2; }
  return c / v;
}
/** Los golpes de un efecto: tramos seguidos de 10 ms que pasan del 25 % del más fuerte, como [desde, hasta] en s. */
function rafagas(s: Float32Array) {
  const w = ms(0.01), v: number[] = [];
  for (let i = 0; i + w <= s.length; i += w) v.push(rms(s, i, i + w));
  const thr = Math.max(...v) * 0.25, out: [number, number][] = [];
  v.forEach((x, k) => { if (x > thr) { const last = out[out.length - 1]; if (last && last[1] === k * 0.01) last[1] = (k + 1) * 0.01; else out.push([k * 0.01, (k + 1) * 0.01]); } });
  return out.map(([a, b]) => [Number(a.toFixed(2)), Number(b.toFixed(2))] as [number, number]);
}

describe('el trueno, el furrazo, la corneta de la moto y tres ambientes del Cross (lote H2 corto)', () => {
  const amb = Object.fromEntries(AMBIENTES.map((n) => [n, renderSound('ambientes', n)]));
  const sfx = Object.fromEntries(EFECTOS.map((n) => [n, renderSound('sfx', n)]));

  it('los seis están en el catálogo, al final, y lo de antes no se movió', () => {
    expect(AMBIENCE_NAMES.slice(0, 22)).toEqual(ANTES);
    expect(AMBIENCE_NAMES.slice(22)).toEqual(AMBIENTES);
    expect(SONIDOS.ambientes).toEqual([...ANTES, ...AMBIENTES]);
    expect(Object.keys(SFX_MUNDOS_H2C)).toEqual(EFECTOS);
    // los efectos de antes siguen en el mismo orden y los nuevos van detrás de todos
    const antes = [...SFX_NAMES, ...Object.keys({ ...SFX_DEPORTE, ...SFX_MUNDOS, ...SFX_PELOTA, ...SFX_ATLETISMO })];
    expect(SONIDOS.sfx).toEqual([...antes, ...EFECTOS]);
    for (const sec of ['ambientes', 'musica', 'sfx'] as const) expect(new Set(SONIDOS[sec]).size, sec).toBe(SONIDOS[sec].length);
  });

  it('los ambientes duran 12 s, van en bucle, suenan todo el tiempo, no saturan y no tienen componente continua', () => {
    for (const n of AMBIENTES) {
      const { samples: s, loop } = amb[n];
      expect(loop, n).toBe(true);
      expect(s.length, n).toBe(12 * RATE);
      expect(peak(s), n).toBeCloseTo(0.5, 3);
      expect(rms(s), n).toBeGreaterThan(0.045);
      for (const [k, v] of ventanas(s, 0.5).entries()) expect(v, `${n} en ${k * 0.5} s`).toBeGreaterThan(0.015);
      let m = 0; for (const v of s) m += v; expect(Math.abs(m / s.length), n).toBeLessThan(0.002);
    }
  });

  it('el bucle empalma sin corte: el salto del final al principio es como cualquier otro y el volumen sigue igual', () => {
    for (const n of AMBIENTES) {
      const s = amb[n].samples, saltos: number[] = [];
      for (let i = 1; i < s.length; i++) saltos.push(Math.abs(s[i] - s[i - 1]));
      saltos.sort((a, b) => a - b);
      expect(Math.abs(s[0] - s[s.length - 1]), n).toBeLessThan(saltos[Math.floor(saltos.length * 0.99)]);
      const v = ventanas(s, 1), med = [...v].sort((a, b) => a - b)[6];
      for (const k of [0, 11]) { expect(v[k] / med, `${n} segundo ${k}`).toBeGreaterThan(0.4); expect(v[k] / med, `${n} segundo ${k}`).toBeLessThan(2.2); }
    }
  });

  it('suenan en un parlante de teléfono: más de la mitad de la energía entre 150 Hz y 6 kHz', () => {
    for (const n of AMBIENTES) expect(banda(amb[n].samples, 150, 6000), n).toBeGreaterThan(0.5);
  });

  it('cada ambiente tiene lo suyo: la cuchilla y las monedas del mercado, la sirena y el motor del ferry, el pitazo y las cornetas del estadio', () => {
    // el mercado: la tabla de la cuchilla (1150 Hz) suena en cada golpe y no antes, y las monedas del vuelto brillan
    const me = amb.mercado.samples;
    for (const t of [2.3, 2.61, 8.2, 8.51, 8.82]) expect(tono(me, 1150, t, t + 0.04), `cuchilla en ${t} s`).toBeGreaterThan(tono(me, 1150, 1.9, 2.25) * 8);
    expect(tono(me, 3400, 3.3, 3.4)).toBeGreaterThan(tono(me, 3400, 2.9, 3.25) * 10);
    // el río: la sirena del ferry (185 Hz) una sola vez, y el motor diésel que late 7.5 veces por segundo
    const ri = amb.rio.samples;
    expect(tono(ri, 185, 6, 7)).toBeGreaterThan(tono(ri, 185, 3, 4) * 20);
    expect(tono(ri, 185, 6, 7)).toBeGreaterThan(tono(ri, 185, 9.5, 10.5) * 20);
    const er = envolvente(ri);
    expect(seRepite(er, 0.5, 5, 1 / 7.5)).toBeGreaterThan(seRepite(er, 0.5, 5, 1 / 5.3) + 0.1);
    // el estadio: el pitazo del árbitro (2820 Hz), una vez, y las cornetas de la barra (233 Hz) en sus tandas
    const es = amb.estadio.samples;
    expect(tono(es, 2820, 9.32, 9.62)).toBeGreaterThan(tono(es, 2820, 8.4, 9.2) * 4);
    expect(tono(es, 2820, 9.32, 9.62)).toBeGreaterThan(tono(es, 2820, 3.3, 4.1) * 4);
    for (const t of [2.2, 4.2, 8.2, 10.2]) expect(tono(es, 233, t + 0.6, t + 1.1), `corneta en ${t} s`).toBeGreaterThan(tono(es, 233, 5.6, 6.1) * 3);
  });

  it('el trueno: el chasquido pega en los primeros 50 ms, el retumbo grave sigue después del segundo y se apaga', () => {
    const { samples: s, loop } = sfx.trueno, d = s.length / RATE;
    expect(loop).toBe(false);
    expect(d).toBeGreaterThanOrEqual(2);
    expect(d).toBeLessThanOrEqual(2.5);
    expect(peak(s)).toBeCloseTo(0.85, 2);
    let pi = 0; for (let i = 0; i < s.length; i++) if (Math.abs(s[i]) > Math.abs(s[pi])) pi = i;
    expect(pi / RATE).toBeLessThan(0.05);
    // el chasquido es brillante y el retumbo es grave
    const agudo = (a: number, b: number) => { let e = 0; for (let i = ms(a) + 1; i < ms(b); i++) e += (s[i] - s[i - 1]) ** 2; return Math.sqrt(e / (ms(b) - ms(a))) / rms(s, ms(a), ms(b)); };
    expect(agudo(0, 0.04)).toBeGreaterThan(agudo(0.8, 1.6) * 4);
    // la cola: después del segundo todavía retumba, y al final se apaga
    expect(rms(s, ms(1), ms(1.5))).toBeGreaterThan(rms(s, 0, ms(0.1)) * 0.15);
    expect(rms(s, ms(1), ms(1.5))).toBeGreaterThan(0.03);
    expect(rms(s, s.length - ms(0.2))).toBeLessThan(rms(s, ms(0.3), ms(0.8)) * 0.3);
    expect(banda(s.subarray(ms(0.3)), 0, 300, 0.05)).toBeGreaterThan(0.6);
  });

  it('el furrazo: grave y áspero, pero con cuerpo que se oye; crece un poquito y se apaga en un segundo', () => {
    const { samples: s, loop } = sfx.furro, d = s.length / RATE;
    expect(loop).toBe(false);
    expect(d).toBeGreaterThanOrEqual(0.8);
    expect(d).toBeLessThanOrEqual(1.2);
    expect(peak(s)).toBeCloseTo(0.85, 2);
    // casi todo por debajo de 300 Hz, pero con cuerpo entre 150 y 600 Hz (lo que da un parlante chiquito)
    expect(banda(s, 0, 300, 0.05)).toBeGreaterThan(0.8);
    expect(banda(s, 150, 600, 0.05)).toBeGreaterThan(0.15);
    expect(rms(s)).toBeGreaterThan(0.2);
    // el "rum" crece después de la palmada, se sostiene y se apaga
    expect(rms(s, ms(0.05), ms(0.12))).toBeGreaterThan(rms(s, 0, ms(0.03)));
    expect(rms(s, ms(0.3), ms(0.6))).toBeGreaterThan(0.2);
    expect(rms(s, s.length - ms(0.1))).toBeLessThan(rms(s, ms(0.3), ms(0.6)) * 0.4);
    // y es el mismo instrumento de la gaita: el gruñido de 23 Hz se ve en la envolvente de lo grave
    const e = envolvente(s);
    expect(seRepite(e, 0.15, 0.7, 1 / 23)).toBeGreaterThan(seRepite(e, 0.15, 0.7, 1 / 15) + 0.2);
  });

  it('la corneta de la moto: dos pitos ("pí-píii"), nasal y afinada', () => {
    const { samples: s, loop } = sfx.corneta_moto, d = s.length / RATE;
    expect(loop).toBe(false);
    expect(d).toBeGreaterThanOrEqual(0.5);
    expect(d).toBeLessThanOrEqual(0.7);
    const r = rafagas(s);
    expect(r).toHaveLength(2);
    expect(r[0][0]).toBeLessThan(0.02);
    expect(r[1][0] - r[0][1]).toBeGreaterThanOrEqual(0.04);
    expect(r[1][1] - r[1][0]).toBeGreaterThan(r[0][1] - r[0][0]);
    // un pito con sus armónicos: la nota y su octava suenan mucho más que lo de en medio, en los dos pitos
    for (const [a, b] of r) {
      const base = tono(s, 440, a, b), entre = Math.max(tono(s, 440 * 1.37, a, b), tono(s, 440 * 0.75, a, b));
      expect(base, `${a} s`).toBeGreaterThan(entre * 5);
      expect(tono(s, 880, a, b), `${a} s`).toBeGreaterThan(entre * 2);
    }
    // nada grave: es un pito
    expect(banda(s, 0, 300, 0.05)).toBeLessThan(0.05);
  });

  it('determinista: sale igual siempre, se pida solo o después de otros', () => {
    for (const n of [...AMBIENTES].reverse()) expect(hash(renderSound('ambientes', n).samples), n).toBe(hash(amb[n].samples));
    for (const n of [...EFECTOS].reverse()) expect(hash(renderSound('sfx', n).samples), n).toBe(hash(sfx[n].samples));
  });

  it('el kit los exporta: los ambientes en bucle de 12 s, los efectos sin bucle, sin pendientes, y escuchar.html los toca', () => {
    const cfg: KitConfig = { juego: 'Prueba', personajes_incluidos: ['familia'], packs: { base: ['idle'] }, audio: { ambientes: AMBIENTES, sfx: EFECTOS } };
    expect(validateKitConfig(cfg)).toEqual([]);
    const { files, warnings } = buildCustomKit(cfg, {}, { quick: true, solo: ['audio'] });
    expect(warnings).toEqual([]);
    const m = JSON.parse(new TextDecoder().decode(files.find((f) => f.name === 'manifest.json')!.bytes));
    expect(m.pendiente).toBeUndefined();
    for (const n of AMBIENTES) {
      expect(m.audio.ambientes[n], n).toMatchObject({ archivo: `audio/ambiente/${n}.wav`, bucle: true });
      expect(m.audio.ambientes[n].duracion, n).toBeCloseTo(12, 2);
    }
    for (const n of EFECTOS) { expect(m.audio.sfx[n], n).toMatchObject({ archivo: `audio/sfx/${n}.wav` }); expect(m.audio.sfx[n].bucle, n).toBeUndefined(); }
    const html = new TextDecoder().decode(files.find((f) => f.name === 'audio/escuchar.html')!.bytes);
    for (const n of [...AMBIENTES, ...EFECTOS]) expect(html, n).toContain(`"n":"${n}"`);
  });

  it('el ejemplo de Nekketsu los pide, al final de cada lista', () => {
    const cfg = JSON.parse(readFileSync('docs/ejemplos/nekketsu/kit.config.json', 'utf8')) as KitConfig;
    const a = cfg.audio as { sfx: string[]; ambientes: string[] };
    expect(a.sfx.slice(-3)).toEqual(EFECTOS);
    expect(a.ambientes.slice(-3)).toEqual(AMBIENTES);
  });
});
