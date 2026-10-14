import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { AMBIENCE_NAMES } from '../audio/ambience';
import { SONIDOS, JINGLES, renderSound } from '../audio/catalogo';
import { RATE, renderSfx } from '../audio/sfx';
import { buildCustomKit, validateKitConfig, validateTeams, type KitConfig } from '../kit/custom';

/** Lo que pide el lote H7: los ambientes del resto de los mundos y el acorde de victoria de cada equipo. */
const AMBIENTES = ['trafico_saigon', 'hoian_noche', 'llovizna_bogota', 'lago_noche', 'azotea_noche', 'atardecer_cartagena', 'comuna', 'carnaval', 'pinos_dalat', 'liceo'];
const ANTES = ['bosque', 'agua', 'noche', 'viento', 'cueva', 'magia', 'mar', 'cafetal', 'llano'];
const ACORDES = ['acorde_familia', 'acorde_instituto', 'acorde_rong', 'acorde_rolos', 'acorde_panas', 'acorde_maracuchos'];

const ms = (t: number) => Math.round(t * RATE);
const rms = (b: ArrayLike<number>, from = 0, to = b.length) => { let s = 0; for (let i = from; i < to; i++) s += b[i] * b[i]; return Math.sqrt(s / Math.max(1, to - from)); };
const peak = (b: Float32Array) => { let p = 0; for (const v of b) p = Math.max(p, Math.abs(v)); return p; };
const hash = (b: Float32Array) => createHash('sha256').update(Buffer.from(b.buffer, b.byteOffset, b.byteLength)).digest('hex');
const cruces = (s: Float32Array) => { let n = 0; for (let i = 1; i < s.length; i++) if ((s[i - 1] < 0) !== (s[i] < 0)) n++; return (n / s.length) * RATE; };
const agudo = (s: Float32Array) => { const d = new Float32Array(s.length); for (let i = 1; i < s.length; i++) d[i] = s[i] - s[i - 1]; return d; };
const ventanas = (s: Float32Array, w: number) => { const o: number[] = []; for (let t = 0; t + w <= 12 + 1e-9; t += w) o.push(rms(s, ms(t), ms(t + w))); return o; };
/** Altura (Hz) y qué tan clara es (0..1) en una ventana de `W` s, por autocorrelación entre `lo` y `hi`. */
function altura(s: Float32Array, t: number, lo: number, hi: number, W = 0.1): [number, number] {
  const i0 = ms(t), N = ms(W);
  let best = 0, lag = 0;
  for (let L = Math.floor(RATE / hi); L <= Math.ceil(RATE / lo); L++) {
    let c = 0, e1 = 0, e2 = 0;
    for (let i = i0; i < i0 + N; i++) { c += s[i] * s[i + L]; e1 += s[i] * s[i]; e2 += s[i + L] * s[i + L]; }
    const r = c / Math.sqrt(e1 * e2 + 1e-12);
    if (r > best) { best = r; lag = L; }
  }
  return [RATE / lag, best];
}
/** Cuánto suena una frecuencia en una ventana (Goertzel). */
function tono(s: Float32Array, f: number, t0: number, t1: number) {
  const w = (2 * Math.PI * f) / RATE, c = 2 * Math.cos(w);
  let a = 0, b = 0;
  for (let i = ms(t0); i < ms(t1); i++) { const x = s[i] + c * a - b; b = a; a = x; }
  return Math.sqrt(a * a + b * b - c * a * b) / (ms(t1) - ms(t0));
}
/** La envolvente: el volumen muestra a muestra (rectificado y suavizado), sin lo grave si `agudos`. */
function envolvente(s: Float32Array, agudos: boolean) {
  const o = new Float32Array(s.length);
  let y = 0, p = 0;
  for (let i = 0; i < s.length; i++) { const x = agudos ? s[i] - p : s[i]; p = s[i]; y += (Math.abs(x) - y) * 0.05; o[i] = y; }
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
/** Qué parte de la energía cae entre `a` y `b` Hz (un banco de tonos cada 25 Hz, en ventanas de 0.1 s). */
function banda(s: Float32Array, a: number, b: number) {
  let dentro = 0, total = 0;
  for (let f = 25; f < 8000; f += 25) {
    let e = 0;
    for (let t = 0.05; t < 12; t += 0.5) e += tono(s, f, t, t + 0.1) ** 2;
    total += e; if (f >= a && f < b) dentro += e;
  }
  return dentro / total;
}

describe('ambientes del resto de los mundos y acordes de victoria (lote H7)', () => {
  const amb = Object.fromEntries([...AMBIENTES, ...ANTES].map((n) => [n, renderSound('ambientes', n).samples]));
  const aco = Object.fromEntries([...ACORDES, 'victoria', 'victoria_banda'].map((n) => [n, renderSound('musica', n)]));

  it('los 10 ambientes y los 6 acordes están en el catálogo, después de lo de antes, y ninguno pisa un nombre', () => {
    expect(AMBIENCE_NAMES.slice(0, 19)).toEqual([...ANTES, ...AMBIENTES]);
    for (const n of AMBIENTES) expect(SONIDOS.ambientes, n).toContain(n);
    for (const n of ACORDES) { expect(SONIDOS.musica, n).toContain(n); expect(JINGLES, n).toContain(n); }
    for (const sec of ['ambientes', 'musica', 'sfx'] as const) expect(new Set(SONIDOS[sec]).size, sec).toBe(SONIDOS[sec].length);
  });

  it('los ambientes duran 12 s, van en bucle, suenan todo el tiempo, no saturan y no tienen componente continua', () => {
    for (const n of AMBIENTES) {
      const s = amb[n];
      expect(renderSound('ambientes', n).loop, n).toBe(true);
      expect(s.length, n).toBe(12 * RATE);
      expect(peak(s), n).toBeCloseTo(0.5, 3);
      expect(rms(s), n).toBeGreaterThan(0.045);
      for (const [k, v] of ventanas(s, 0.5).entries()) expect(v, `${n} en ${k * 0.5} s`).toBeGreaterThan(0.015);
      let m = 0; for (const v of s) m += v; expect(Math.abs(m / s.length), n).toBeLessThan(0.002);
    }
  });

  it('el bucle empalma sin corte: el salto del final al principio es como cualquier otro y el volumen sigue igual', () => {
    for (const n of AMBIENTES) {
      const s = amb[n], saltos: number[] = [];
      for (let i = 1; i < s.length; i++) saltos.push(Math.abs(s[i] - s[i - 1]));
      saltos.sort((a, b) => a - b);
      expect(Math.abs(s[0] - s[s.length - 1]), n).toBeLessThan(saltos[Math.floor(saltos.length * 0.99)]);
      const v = ventanas(s, 1), med = [...v].sort((a, b) => a - b)[6];
      for (const k of [0, 11]) { expect(v[k] / med, `${n} segundo ${k}`).toBeGreaterThan(0.4); expect(v[k] / med, `${n} segundo ${k}`).toBeLessThan(2.2); }
    }
  });

  it('suenan en un parlante de teléfono: más de la mitad de la energía entre 150 Hz y 6 kHz', () => {
    for (const n of AMBIENTES) expect(banda(amb[n], 150, 6000), n).toBeGreaterThan(0.5);
  });

  it('cada mundo tiene lo suyo: bocinas en Saigón, la campana en La Candelaria, el helicóptero en Caracas, los tambores del carnaval y el parlante de la Comuna 13', () => {
    // las bocinas de las motos: el pito de 470 Hz suena mucho más que el tráfico de antes
    const sg = amb.trafico_saigon;
    expect(tono(sg, 470, 1.7, 1.8)).toBeGreaterThan(tono(sg, 470, 1.3, 1.6) * 3);
    expect(tono(sg, 520, 4.25, 4.35)).toBeGreaterThan(tono(sg, 520, 3.0, 3.5) * 3);
    // la campana de la iglesia: su parcial grave se queda sonando después del golpe
    const ll = amb.llovizna_bogota;
    expect(tono(ll, 196, 6.9, 7.9)).toBeGreaterThan(tono(ll, 196, 5.6, 6.6) * 10);
    // el helicóptero: las aspas golpean el aire unas 17 veces por segundo mientras cruza, y antes no
    const ez = envolvente(amb.azotea_noche, true);
    expect(seRepite(ez, 6, 9, 1 / 17.5)).toBeGreaterThan(0.8);
    expect(seRepite(ez, 6, 9, 1 / 17.5)).toBeGreaterThan(seRepite(ez, 0.3, 2.5, 1 / 17.5) + 0.3);
    // los tambores de la comparsa a 120 (cada 0.5 s) y el boom bap de la Comuna 13 a 100 (cada 0.6 s)
    const ec = envolvente(amb.carnaval, false), eb = envolvente(amb.comuna, false);
    expect(seRepite(ec, 0, 12, 0.5)).toBeGreaterThan(seRepite(ec, 0, 12, 0.385) * 1.6);
    expect(seRepite(eb, 0, 12, 0.6)).toBeGreaterThan(seRepite(eb, 0, 12, 0.462) * 2);
    // en la calle y en el patio del liceo nada lleva ritmo
    for (const n of ['trafico_saigon', 'liceo']) expect(Math.abs(seRepite(envolvente(amb[n], false), 0, 12, 0.5)), n).toBeLessThan(0.15);
  });

  it('los pinos de Đà Lạt son lo más agudo (el susurro de las agujas), y los de lluvia e insectos le siguen', () => {
    const agudos = Object.fromEntries(AMBIENTES.map((n) => [n, banda(amb[n], 2500, 6000)]));
    for (const n of AMBIENTES) if (n !== 'pinos_dalat') expect(agudos.pinos_dalat, n).toBeGreaterThan(agudos[n]);
    for (const n of ['trafico_saigon', 'atardecer_cartagena', 'comuna', 'liceo']) expect(agudos[n], n).toBeLessThan(0.1);
  });

  it('cada ambiente nuevo es distinto de los demás y de los de antes', () => {
    const rasgos = (n: string) => {
      const s = amb[n], v = ventanas(s, 0.5), m = v.reduce((a, b) => a + b) / v.length;
      const ag = Array.from({ length: 12 }, (_, k) => rms(agudo(s), ms(k), ms(k + 1)) / rms(s, ms(k), ms(k + 1)));
      return [cruces(s), Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length) / m, rms(s), Math.min(...ag), banda(s, 150, 1000) + 0.02];
    };
    const f = Object.fromEntries([...AMBIENTES, ...ANTES].map((n) => [n, rasgos(n)]));
    for (const a of AMBIENTES) for (const b of [...AMBIENTES, ...ANTES]) {
      if (a === b) continue;
      const dif = Math.max(...f[a].map((x, k) => Math.abs(Math.log(x / f[b][k]))));
      expect(dif, `${a} y ${b} se parecen demasiado`).toBeGreaterThan(Math.log(1.2));
    }
  });

  it('los acordes son cortos, arrancan de una, no van en bucle, no saturan y terminan sonando', () => {
    for (const n of ACORDES) {
      const { samples: s, loop } = aco[n], d = s.length / RATE;
      expect(loop, n).toBe(false);
      expect(d, n).toBeGreaterThanOrEqual(3);
      expect(d, n).toBeLessThanOrEqual(5.5);
      expect(peak(s), n).toBeCloseTo(0.9, 2);
      expect(peak(s.subarray(0, ms(0.02))), `${n}: arranque`).toBeGreaterThan(0.05);
      // el último acorde suena y se apaga: el último medio segundo es más bajito que el del medio, sin cortarse en seco
      expect(rms(s, s.length - ms(0.5)), n).toBeLessThan(rms(s, ms(1), ms(2)));
      expect(rms(s, s.length - ms(1.2), s.length - ms(0.7)), n).toBeGreaterThan(0.02);
    }
  });

  it('cada acorde remata en la tónica de su equipo, y el de la Familia GG cierra con el ladrido de Thor', () => {
    // [tónica, cuándo empieza el último compás (s), rango del bajo]: el bajo se mide 0.3 s después
    const remate: Record<string, [number, number, number, number]> = {
      acorde_familia: [98, 2.917, 60, 260], acorde_instituto: [110, 2.368, 60, 260], acorde_rong: [98, 3, 60, 260],
      acorde_rolos: [73.42, 3.214, 60, 260], acorde_panas: [73.42, 3, 60, 260], acorde_maracuchos: [110, 3.214, 45, 260],
    };
    for (const [n, [f, inicio, lo, hi]] of Object.entries(remate)) {
      const [fa, c] = altura(aco[n].samples, inicio + 0.3, lo, hi);
      const pc = ((12 * Math.log2(fa / f)) % 12 + 12) % 12;
      expect(c, `${n}: el bajo del remate`).toBeGreaterThan(0.45);
      expect(Math.min(pc, 12 - pc), `${n}: ${fa.toFixed(1)} Hz no es la tónica`).toBeLessThan(0.5);
    }
    // el ladrido de Thor, el mismo `ladrido` del kit, en el compás del remate
    const fam = aco.acorde_familia.samples, guau = renderSfx('ladrido');
    let best = 0, cuando = 0;
    for (let o = ms(2.5); o < fam.length - guau.length; o += 8) {
      let c = 0, e1 = 0, e2 = 0;
      for (let i = 0; i < guau.length; i += 2) { c += fam[o + i] * guau[i]; e1 += fam[o + i] ** 2; e2 += guau[i] ** 2; }
      const r = c / Math.sqrt(e1 * e2 + 1e-12);
      if (r > best) { best = r; cuando = o / RATE; }
    }
    expect(best).toBeGreaterThan(0.3);
    expect(cuando).toBeGreaterThan(3.7); expect(cuando).toBeLessThan(4.1);
  });

  it('cada acorde es distinto de los otros y de las fanfarrias de antes', () => {
    const todos = [...ACORDES, 'victoria', 'victoria_banda'];
    const f = Object.fromEntries(todos.map((n) => { const s = aco[n].samples; return [n, [s.length / RATE, cruces(s), rms(s), rms(agudo(s)) / rms(s)]]; }));
    for (let i = 0; i < todos.length; i++) for (let j = i + 1; j < todos.length; j++) {
      const dif = Math.max(...f[todos[i]].map((x, k) => Math.abs(Math.log(x / f[todos[j]][k]))));
      expect(dif, `${todos[i]} y ${todos[j]} se parecen demasiado`).toBeGreaterThan(Math.log(1.15));
    }
  });

  it('determinista: sale igual siempre, se pida solo o después de otros', () => {
    for (const n of [...AMBIENTES].reverse()) expect(hash(renderSound('ambientes', n).samples), n).toBe(hash(amb[n]));
    for (const n of [...ACORDES].reverse()) expect(hash(renderSound('musica', n).samples), n).toBe(hash(aco[n].samples));
  });

  it('el ejemplo de Nekketsu pide los 6 acordes por equipo y la validación avisa si un equipo pide uno que no existe', () => {
    const eq = JSON.parse(readFileSync('docs/ejemplos/nekketsu/equipos.json', 'utf8')) as Record<string, { musica?: string; atletas: string[] }>;
    const de: Record<string, string> = { familia_gg: 'acorde_familia', instituto_nekketsu: 'acorde_instituto', rong_sai_gon: 'acorde_rong', rolos_de_chapinero: 'acorde_rolos', panas_de_caracas: 'acorde_panas', maracuchos_del_lago: 'acorde_maracuchos' };
    for (const [id, m] of Object.entries(de)) expect(eq[id].musica, id).toBe(m);
    const atletas = Object.values(eq).flatMap((t) => t.atletas);
    expect(validateTeams(eq, atletas, ['thor'])).toEqual([]);
    const mal = validateTeams({ familia_gg: { ...eq.familia_gg, musica: 'acorde_famila' } }, atletas, ['thor']);
    expect(mal.join(' ')).toMatch(/equipos\.familia_gg\.musica.*acorde_famila.*acorde_familia/);
  });

  it('si un equipo pide su acorde y no va en audio.musica, el kit avisa', () => {
    const eq = { familia_gg: { nombre: 'Familia GG', atletas: ['rick'], musica: 'acorde_familia' } };
    const cfg: KitConfig = { juego: 'Prueba', personajes_incluidos: ['familia'], packs: { base: ['idle'] }, audio: { musica: ['victoria'] } };
    const { warnings } = buildCustomKit(cfg, { equipos: eq }, { quick: true, solo: ['audio'] });
    expect(warnings.join(' ')).toMatch(/familia_gg \(acorde_familia\)/);
    const ok = buildCustomKit({ ...cfg, audio: { musica: ['acorde_familia'] } }, { equipos: eq }, { quick: true, solo: ['audio'] });
    expect(ok.warnings).toEqual([]);
  });

  it('el kit los exporta: los ambientes en bucle, los acordes sin bucle, sin pendientes, y escuchar.html los toca', () => {
    const cfg: KitConfig = { juego: 'Prueba', personajes_incluidos: ['familia'], packs: { base: ['idle'] }, audio: { ambientes: AMBIENTES, musica: ACORDES } };
    expect(validateKitConfig(cfg)).toEqual([]);
    const { files, warnings } = buildCustomKit(cfg, {}, { quick: true, solo: ['audio'] });
    expect(warnings).toEqual([]);
    const m = JSON.parse(new TextDecoder().decode(files.find((f) => f.name === 'manifest.json')!.bytes));
    expect(m.pendiente).toBeUndefined();
    for (const n of AMBIENTES) {
      expect(m.audio.ambientes[n], n).toMatchObject({ archivo: `audio/ambiente/${n}.wav`, bucle: true });
      expect(m.audio.ambientes[n].duracion, n).toBeCloseTo(12, 2);
    }
    for (const n of ACORDES) { expect(m.audio.musica[n], n).toMatchObject({ archivo: `audio/musica/${n}.wav` }); expect(m.audio.musica[n].bucle, n).toBeUndefined(); }
    const html = new TextDecoder().decode(files.find((f) => f.name === 'audio/escuchar.html')!.bytes);
    for (const n of [...AMBIENTES, ...ACORDES]) expect(html, n).toContain(`"n":"${n}"`);
  });
});
