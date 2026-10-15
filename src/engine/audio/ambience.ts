import { RATE } from './sfx';
import { rng, pink, bandpass, lowpass, blip, highpass, voz, graznido, loopify } from './ambienteBase';
import { AMBIENTES_MUNDOS, sinGraves } from './ambienteMundos';

/**
 * Sonidos de ambiente por zona, en bucle sin corte (el final se funde con el principio).
 * bosque (viento suave y pájaros), agua (arroyo), noche (grillos), viento (ráfagas), cueva (eco y gotas),
 * magia (campanitas y un colchón brillante). Y los de los mundos del olímpico (lote H6): mar (las olas que revientan y
 * se devuelven, con gaviotas), cafetal (la brisa de la montaña, los pájaros, los loros y una vaca a lo lejos) y llano
 * (el viento de la sabana al atardecer, las chicharras, el alcaraván y el ganado). Y los del resto de los mundos
 * (lote H7, en `ambienteMundos.ts`): la calle de Saigón, Hội An de noche, La Candelaria con llovizna, el lago de
 * Maracaibo de noche, la azotea de Caracas, el atardecer de Cartagena, la Comuna 13, el carnaval, los pinos de Đà Lạt
 * y el patio del liceo. Y los del lote B7H8: el parque Tao Đàn en la mañana, el barrio de Caracas de día y el dojo de
 * Hanói en la tarde. Y los del lote H2 corto: el mercado Bến Thành, el río Saigón y el estadio del final del Cross.
 * Todo sintetizado.
 */

export type AmbienceName =
  | 'bosque' | 'agua' | 'noche' | 'viento' | 'cueva' | 'magia' | 'mar' | 'cafetal' | 'llano'
  | 'trafico_saigon' | 'hoian_noche' | 'llovizna_bogota' | 'lago_noche' | 'azotea_noche' | 'atardecer_cartagena'
  | 'comuna' | 'carnaval' | 'pinos_dalat' | 'liceo' | 'parque_tao_dan' | 'barrio_caracas' | 'dojo_hanoi'
  | 'mercado' | 'rio' | 'estadio';

const SECONDS = 12, FADE = 1.5;

export function ambience(name: AmbienceName): Float32Array {
  const total = Math.floor((SECONDS + FADE) * RATE), len = Math.floor(SECONDS * RATE);
  const r = rng(name.length * 7919 + name.charCodeAt(0));
  let buf: Float32Array = new Float32Array(total);
  const add = (x: Float32Array, k: number) => { for (let i = 0; i < total; i++) buf[i] += x[i] * k; };
  const lfo = (i: number, hz: number, ph = 0) => 0.5 + 0.5 * Math.sin((i / RATE) * hz * Math.PI * 2 + ph);

  if (name === 'bosque' || name === 'viento' || name === 'noche') {
    // viento: ruido rosa por un filtro que respira
    const wind = bandpass(pink(total, r), (i) => 300 + 500 * lfo(i, 0.07) + 300 * lfo(i, 0.23, 1), 0.9);
    const gust = name === 'viento' ? 1 : 0.35;
    for (let i = 0; i < total; i++) buf[i] += wind[i] * (0.25 + 0.75 * lfo(i, 0.11, 2) * lfo(i, 0.05)) * gust;
  }
  if (name === 'bosque') {
    // pájaros: frases de 3 a 6 notas con barrido
    for (let k = 0; k < 9; k++) {
      let t = r() * (SECONDS + FADE - 1.2);
      const base = 2200 + r() * 1800, notes = 3 + Math.floor(r() * 4), up = r() < 0.5;
      for (let j = 0; j < notes; j++) {
        const f = base * (1 + (r() - 0.5) * 0.2);
        blip(buf, t, 0.05 + r() * 0.06, up ? f * 0.8 : f * 1.2, up ? f * 1.25 : f * 0.85, 0.11, 4);
        t += 0.07 + r() * 0.08;
      }
    }
  }
  if (name === 'agua') {
    const rush = lowpass(pink(total, r), 0.18);
    add(bandpass(rush, (i) => 700 + 250 * lfo(i, 0.3), 1.2), 1.4);
    add(lowpass(pink(total, r), 0.05), 1.1);
    // burbujas: tonitos que suben
    for (let k = 0; k < 140; k++) blip(buf, r() * (SECONDS + FADE), 0.03 + r() * 0.04, 300 + r() * 500, 700 + r() * 900, 0.05, 5);
  }
  if (name === 'noche') {
    // grillos: un tono agudo cortado en pulsos (grupos de 3) que se repiten
    for (const [f, every, off] of [[4400, 0.9, 0.1], [5200, 1.3, 0.5]] as [number, number, number][]) {
      for (let t = off; t < SECONDS + FADE; t += every * (0.9 + r() * 0.2))
        for (let p = 0; p < 3; p++) blip(buf, t + p * 0.035, 0.022, f, f, 0.06, 1);
    }
    // ranita a lo lejos
    for (let t = 1; t < SECONDS + FADE; t += 2.3 + r()) blip(buf, t, 0.12, 180, 140, 0.08, 3);
  }
  if (name === 'cueva') {
    add(lowpass(pink(total, r), 0.015), 2.2);
    // gotas con eco
    for (let k = 0; k < 9; k++) {
      const t = r() * (SECONDS + FADE - 1), f = 1100 + r() * 900;
      for (let e = 0; e < 4; e++) blip(buf, t + e * 0.18, 0.06, f, f * 0.6, 0.12 * Math.pow(0.45, e), 8);
    }
  }
  if (name === 'magia') {
    // colchón: acorde agudo con trémolo lento
    const chord = [523.25, 659.25, 783.99, 987.77];
    for (let i = 0; i < total; i++) {
      let s = 0;
      for (let c = 0; c < chord.length; c++) s += Math.sin((i / RATE) * chord[c] * Math.PI * 2) * (0.5 + 0.5 * Math.sin((i / RATE) * (0.2 + c * 0.07) * Math.PI * 2));
      buf[i] += s * 0.025;
    }
    // campanitas
    for (let k = 0; k < 22; k++) { const f = [1568, 1760, 2093, 2349, 2637][Math.floor(r() * 5)]; blip(buf, r() * (SECONDS + FADE), 0.6, f, f, 0.06, 7); }
  }
  if (name === 'mar') {
    // el fondo del mar: un rumor grave que no para
    add(lowpass(pink(total, r), 0.03), 0.45);
    // las olas: cada una crece, revienta (un golpe ancho que se apaga) y se devuelve siseando por la arena
    // la última es la primera más 12 s: en el empalme del bucle caen juntas
    const olas = [0.4, 4.3, 8.1, 12.4];
    const rompe = lowpass(pink(total, r), 0.35), siseo = highpass(pink(total, r), 0.25);
    for (let i = 0; i < total; i++) {
      const t = i / RATE;
      let crece = 0, golpe = 0, vuelve = 0;
      for (const o of olas) {
        const d = t - o;
        if (d > -1.6 && d < 0) crece += Math.pow(1 + d / 1.6, 2);
        if (d >= 0 && d < 3) golpe += Math.exp(-d * 1.4) * Math.pow(Math.min(1, d / 0.3), 1.5);
        if (d >= 0.6 && d < 3.6) vuelve += Math.sin((Math.PI * (d - 0.6)) / 3) * 0.7;
      }
      buf[i] += rompe[i] * (0.5 * crece + 2.6 * golpe) + siseo[i] * 1.6 * vuelve;
    }
    // gaviotas a lo lejos: el "kiau" que baja
    for (const [t, f] of [[2.2, 1900], [2.65, 1750], [9.6, 2050]] as [number, number][]) voz(buf, t, 0.32, f, f * 0.72, 0.09, [1, 0.45, 0.2], 0.02, 23, 0.02);
  }
  if (name === 'cafetal') {
    // la brisa de la montaña, suave y fresca
    const brisa = bandpass(pink(total, r), (i) => 500 + 350 * lfo(i, 0.09) + 200 * lfo(i, 0.31, 1), 0.8);
    for (let i = 0; i < total; i++) buf[i] += brisa[i] * (0.25 + 0.3 * lfo(i, 0.083, 0.5));
    // pájaros del cafetal: silbidos limpios que suben y bajan, en frases cortas
    for (let k = 0; k < 11; k++) {
      let t = r() * (SECONDS + FADE - 1);
      const base = 1800 + r() * 2200, notas = 2 + Math.floor(r() * 4);
      for (let j = 0; j < notas; j++) {
        const f = base * (1 + (r() - 0.5) * 0.3), sube = r() < 0.5;
        voz(buf, t, 0.06 + r() * 0.08, sube ? f * 0.85 : f * 1.15, sube ? f * 1.15 : f * 0.85, 0.14, [1, 0.12], 0.01, 30);
        t += 0.09 + r() * 0.1;
      }
    }
    // la bandada de loros que pasa graznando, y una vaca a lo lejos
    graznido(buf, 3.1, r, 0.2); graznido(buf, 3.5, r, 0.16); graznido(buf, 10.2, r, 0.14);
    voz(buf, 6.4, 1.3, 155, 128, 0.1, [1, 0.6, 0.4, 0.25, 0.12], 0.015, 5, 0.15);
  }
  if (name === 'llano') {
    // el viento de la sabana: abierto y parejo, con ráfagas largas
    const viento = bandpass(pink(total, r), (i) => 380 + 260 * lfo(i, 0.06) + 140 * lfo(i, 0.19, 2), 0.9);
    for (let i = 0; i < total; i++) buf[i] += viento[i] * (0.5 + 0.5 * lfo(i, 0.07, 1.2));
    // las chicharras del atardecer: un zumbido agudo que pulsa, crece y se apaga
    const zumbido = bandpass(pink(total, r), () => 5200, 0.12);
    for (let i = 0; i < total; i++) {
      // dos olas de chicharras en los 12 s (cada 6 s), que nunca se callan del todo
      const t = i / RATE, ola = 0.3 + 0.7 * Math.pow(Math.sin((Math.PI * (t + 1)) / 6), 2);
      buf[i] += zumbido[i] * (0.5 + 0.5 * Math.sin(t * 58 * Math.PI * 2)) * ola * 0.6;
    }
    // el alcaraván: "cá-cá-cá-cáaa", golpes que bajan, dos veces
    for (const t0 of [2.6, 8.9]) for (let j = 0; j < 4; j++) voz(buf, t0 + j * 0.17, j === 3 ? 0.22 : 0.11, 1350 - j * 60, 1150 - j * 70, 0.5, [1, 0.5, 0.3], 0, 0, 0.005);
    // el ganado a lo lejos
    voz(buf, 5.3, 1.5, 140, 112, 0.22, [1, 0.7, 0.45, 0.3, 0.15], 0.02, 4, 0.2);
  }
  // los de los mundos (H7): el fondo va en `buf` y lo que pasa viene aparte, en una capa de 12 s que ya da la vuelta
  const capa = AMBIENTES_MUNDOS[name]?.(buf, r);
  buf = loopify(buf, len);
  if (capa) {
    for (let i = 0; i < len; i++) buf[i] += capa[i];
    sinGraves(buf);
  }
  // nivel parejo (todos los ambientes suenan parecido de fuerte)
  let peak = 0;
  for (const s of buf) peak = Math.max(peak, Math.abs(s));
  const k = peak ? 0.5 / peak : 1;
  for (let i = 0; i < buf.length; i++) buf[i] *= k;
  return buf;
}

export const AMBIENCE_NAMES: AmbienceName[] = [
  'bosque', 'agua', 'noche', 'viento', 'cueva', 'magia', 'mar', 'cafetal', 'llano',
  ...(Object.keys(AMBIENTES_MUNDOS) as AmbienceName[]),
];
