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
  | 'mercado' | 'rio' | 'estadio'
  | 'catedral' | 'galerias' | 'eco' | 'puerto' | 'campana' | 'ciudad' | 'cajita' | 'jardin' | 'reloj' | 'abismo'
  | 'fragua' | 'lava' | 'jaulas' | 'fuelles' | 'bosque_ceniza' | 'carcel' | 'horno'
  | 'hielo' | 'bosque_hielo' | 'lago' | 'catacumbas' | 'ciudadela' | 'puente' | 'puerta' | 'trono';

const SECONDS = 12, FADE = 1.5;

/** El puerto dura 20 s (el encargo lo pide más largo: el agua contra los muelles necesita tiempo para no repetirse). */
const LARGO: Partial<Record<AmbienceName, number>> = { puerto: 20, ciudad: 20, cajita: 14.4, fragua: 20, jaulas: 16, hielo: 20, puente: 16, trono: 16 };

export function ambience(name: AmbienceName): Float32Array {
  const secs = LARGO[name] ?? SECONDS;
  const total = Math.floor((secs + FADE) * RATE), len = Math.floor(secs * RATE);
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
  if (name === 'catedral') {
    // la nave: un zumbido hondo que respira, gotas que caen de lejos con eco largo y raíces que crujen despacio
    const hum = lowpass(pink(total, r), 0.01);
    for (let i = 0; i < total; i++) buf[i] += hum[i] * 2.4 * (0.7 + 0.3 * lfo(i, 0.06));
    for (let k = 0; k < 7; k++) {
      const t = r() * (SECONDS + FADE - 2), f = 900 + r() * 700;
      for (let e = 0; e < 6; e++) blip(buf, t + e * 0.32, 0.07, f, f * 0.55, 0.1 * Math.pow(0.55, e), 8);
    }
    for (let k = 0; k < 3; k++) blip(buf, r() * (SECONDS + FADE - 1.5), 0.9, 90 + r() * 40, 60 + r() * 20, 0.05, 2);
  }
  if (name === 'galerias') {
    // la mina: aire quieto muy grave, viento lejano que entra por los túneles, goteo y una piedra que cae a lo lejos
    const hum = lowpass(pink(total, r), 0.012);
    for (let i = 0; i < total; i++) buf[i] += hum[i] * 1.8;
    const far = bandpass(pink(total, r), (i) => 180 + 120 * lfo(i, 0.05), 1.1);
    for (let i = 0; i < total; i++) buf[i] += far[i] * 0.5 * lfo(i, 0.083, 1) ** 2;
    for (let k = 0; k < 11; k++) {
      const t = r() * (SECONDS + FADE - 1), f = 1300 + r() * 900;
      for (let e = 0; e < 3; e++) blip(buf, t + e * 0.22, 0.05, f, f * 0.62, 0.1 * Math.pow(0.4, e), 9);
    }
    // la piedra lejana: un golpe sordo y unas piedritas que ruedan después
    const tp = 5 + r() * 3;
    blip(buf, tp, 0.5, 110, 55, 0.12, 4);
    for (let j = 0; j < 6; j++) blip(buf, tp + 0.18 + j * (0.07 + r() * 0.06), 0.04, 600 + r() * 500, 400, 0.035 * (1 - j / 7), 10);
  }
  if (name === 'eco') {
    // la Sala del Eco: casi silencio, y cada gota vuelve muchas veces, cada vez más lejos
    const hum = lowpass(pink(total, r), 0.008);
    for (let i = 0; i < total; i++) buf[i] += hum[i] * 1.2;
    for (let k = 0; k < 6; k++) {
      const t = r() * (SECONDS + FADE - 3), f = 1500 + r() * 800;
      for (let e = 0; e < 9; e++) blip(buf, t + e * 0.38, 0.08, f * (1 - e * 0.015), f * 0.6, 0.12 * Math.pow(0.68, e), 7);
    }
    // un cristal que canta apenas
    for (let k = 0; k < 3; k++) { const f = [1975.5, 2349.3, 2637][k]; blip(buf, 1 + k * 4 + r(), 2.2, f, f, 0.025, 2.5); }
  }
  if (name === 'puerto') {
    // el puerto: agua que golpea despacio contra los muelles, madera que cruje, viento bajo y, muy lejos, la campana
    const sea = lowpass(pink(total, r), 0.02);
    for (let i = 0; i < total; i++) buf[i] += sea[i] * 1.6 * (0.6 + 0.4 * lfo(i, 0.09));
    // cada golpe del agua contra los pilotes: un ruido grave que sube y se corta, con chapoteo
    for (let t = 0.4; t < len / RATE + FADE - 1; t += 2.6 + r() * 1.4) {
      const s = Math.floor(t * RATE), n = Math.floor((0.7 + r() * 0.3) * RATE);
      const lap = bandpass(pink(n, r), (i) => 300 + 500 * (i / n), 1.4);
      for (let i = 0; i < n && s + i < total; i++) buf[s + i] += lap[i] * 0.9 * Math.sin((i / n) * Math.PI) ** 2;
      for (let j = 0; j < 3; j++) blip(buf, t + 0.4 + j * 0.06 + r() * 0.05, 0.04, 600 + r() * 500, 1100 + r() * 400, 0.025, 6);
    }
    // madera que cruje: un roce grave con vibrato
    for (let k = 0; k < 4; k++) {
      const t = r() * (len / RATE - 1), s = Math.floor(t * RATE), n = Math.floor(0.6 * RATE), f0 = 90 + r() * 60;
      let ph = 0;
      for (let i = 0; i < n && s + i < total; i++) { ph += (f0 * (1 + 0.15 * Math.sin(i / 300))) / RATE; buf[s + i] += ((ph % 1) * 2 - 1) * 0.02 * Math.sin((i / n) * Math.PI); }
    }
    const wind = bandpass(pink(total, r), (i) => 200 + 160 * lfo(i, 0.05), 1);
    for (let i = 0; i < total; i++) buf[i] += wind[i] * 0.35;
    // la campana, muy lejos (dos veces en el bucle): parciales graves y apagados
    for (const t of [3.5, 13.2]) for (const [m, v] of [[0.5, 0.03], [1, 0.045], [1.19, 0.02], [1.56, 0.012]] as [number, number][]) blip(buf, t, 3.2, 293.66 * m, 293.66 * m, v, 2.2);
  }
  if (name === 'campana') {
    // la iglesia por dentro: hueca, eco largo, gotas que caen y la campana que vibra apenas sola
    const hum = lowpass(pink(total, r), 0.01);
    for (let i = 0; i < total; i++) buf[i] += hum[i] * 2 * (0.75 + 0.25 * lfo(i, 0.07));
    for (let k = 0; k < 8; k++) {
      const t = r() * (SECONDS + FADE - 3), f = 1000 + r() * 700;
      for (let e = 0; e < 7; e++) blip(buf, t + e * 0.42, 0.07, f, f * 0.58, 0.1 * Math.pow(0.6, e), 8);
    }
    for (const [m, v] of [[0.5, 0.02], [1, 0.03], [2, 0.01]] as [number, number][]) blip(buf, 2, 9, 293.66 * m, 293.66 * m, v, 1.2);
  }
  if (name === 'ciudad') {
    // la ciudad dormida: viento que pasa despacio entre calles vacías y, muy lejos, un tic tac que no para
    const wind = bandpass(pink(total, r), (i) => 260 + 260 * lfo(i, 0.04) + 140 * lfo(i, 0.13, 1), 1.1);
    for (let i = 0; i < total; i++) buf[i] += wind[i] * (0.35 + 0.65 * lfo(i, 0.06, 2) ** 2);
    const hum = lowpass(pink(total, r), 0.01);
    for (let i = 0; i < total; i++) buf[i] += hum[i] * 1.2;
    for (let t = 0.3, k = 0; t < len / RATE + FADE; t += 1, k++) blip(buf, t, 0.05, k % 2 ? 1500 : 1900, k % 2 ? 1450 : 1850, 0.018, 9);
    // un polvito que brilla de vez en cuando (campanitas finitas, casi nada)
    for (let k = 0; k < 5; k++) { const f = [2637, 3136, 3520][k % 3]; blip(buf, 1.5 + k * 3.7 + r(), 1.2, f, f, 0.01, 4); }
  }
  if (name === 'cajita') {
    // la cajita de música con la canción de cuna, lejana y un poco desafinada: cada nota es un plin metálico que
    // se apaga, con la cuerda que se va acabando (el tempo cae apenas) y vuelve
    const cuna = [392, 329.6, 392, 440, 392, 329.6, 392, 329.6, 293.7, 261.6, 0, 0, 329.6, 392, 523.3, 493.9, 440, 392, 440, 392, 293.7, 261.6, 0, 0];
    const beat = 0.6, loopT = cuna.length * beat;
    for (let t0 = 0; t0 < len / RATE + FADE; t0 += loopT) cuna.forEach((f, i) => {
      if (!f) return;
      const t = t0 + i * beat, det = 1 + Math.sin(i * 1.7) * 0.008;
      blip(buf, t, 1.1, f * 2 * det, f * 2 * det, 0.07, 5);
      blip(buf, t, 0.6, f * 4.02 * det, f * 4.02 * det, 0.02, 8);
      if (i % 3 === 0) blip(buf, t, 1.2, f * det, f * det, 0.03, 4);
    });
    const hum = lowpass(pink(total, r), 0.012);
    for (let i = 0; i < total; i++) buf[i] += hum[i] * 0.5;
    buf = lowpass(buf, 0.35); // lejos
  }
  if (name === 'jardin') {
    // los jardines de piedra: hojas de piedra que rozan (roces cortitos), muy bajito, y alguna piedrita que tintinea
    const air = bandpass(pink(total, r), (i) => 900 + 400 * lfo(i, 0.07), 1.3);
    for (let i = 0; i < total; i++) buf[i] += air[i] * 0.12 * lfo(i, 0.09, 1);
    for (let k = 0; k < 16; k++) {
      const t = r() * (SECONDS + FADE - 0.5), s0 = Math.floor(t * RATE), n = Math.floor((0.15 + r() * 0.2) * RATE);
      const sc = bandpass(pink(n, r), () => 2400 + r() * 1200, 1.5);
      for (let i = 0; i < n && s0 + i < total; i++) buf[s0 + i] += sc[i] * 0.25 * Math.sin((i / n) * Math.PI);
    }
    for (let k = 0; k < 4; k++) blip(buf, r() * (SECONDS + FADE - 1), 0.25, 2200 + r() * 600, 2000, 0.03, 9);
  }
  if (name === 'reloj') {
    // la torre del reloj por dentro: tic tac cerca, el engranaje grande que gira y un golpe hondo cada cuatro
    for (let t = 0.1, k = 0; t < len / RATE + FADE; t += 0.5, k++) { blip(buf, t, 0.04, k % 2 ? 1250 : 1750, k % 2 ? 1200 : 1700, 0.09, 10); blip(buf, t + 0.004, 0.03, 420, 380, 0.05, 10); }
    for (let t = 0.9; t < len / RATE + FADE; t += 3) { blip(buf, t, 0.6, 85, 60, 0.12, 4); for (let j = 0; j < 6; j++) blip(buf, t + 0.1 + j * 0.06, 0.02, 900, 800, 0.03, 10); }
    const hum = lowpass(pink(total, r), 0.015);
    for (let i = 0; i < total; i++) buf[i] += hum[i] * 1.4 * (0.7 + 0.3 * lfo(i, 1 / 3));
  }
  if (name === 'abismo') {
    // el puente sobre el abismo: viento hondo que sube del vacío, un tic tac muy lejos y una piedrita que cae y no llega
    const deep = bandpass(pink(total, r), (i) => 120 + 80 * lfo(i, 0.05), 0.9);
    for (let i = 0; i < total; i++) buf[i] += deep[i] * 0.9 * (0.5 + 0.5 * lfo(i, 0.083));
    const hiss = bandpass(pink(total, r), (i) => 1600 + 600 * lfo(i, 0.11, 2), 1.2);
    for (let i = 0; i < total; i++) buf[i] += hiss[i] * 0.06;
    for (let t = 0.5, k = 0; t < len / RATE + FADE; t += 1, k++) blip(buf, t, 0.04, k % 2 ? 1500 : 1900, k % 2 ? 1450 : 1850, 0.008, 9);
    const tp = 4 + r() * 3;
    for (let j = 0; j < 5; j++) blip(buf, tp + j * (0.3 + j * 0.12), 0.05, 900 - j * 80, 700, 0.03 * (1 - j / 6), 10);
  }
  // ---------- Mundo 6: La Fragua de las Luces ----------
  const T = len / RATE + FADE;
  /** lava que burbujea grave: borbotones que suben y revientan, muy graves */
  const lavaBub = (n: number, vol: number) => { for (let k = 0; k < n; k++) { const t = r() * (T - 0.6), f = 50 + r() * 60; blip(buf, t, 0.35 + r() * 0.3, f, f * 1.8, vol, 3); blip(buf, t + 0.3, 0.06, 180 + r() * 120, 120, vol * 0.5, 9); } };
  /** cadenas lejanas: tintineos cortos agrupados, con eco */
  const cadenas = (n: number, vol: number) => { for (let k = 0; k < n; k++) { const t = r() * (T - 1); for (let j = 0; j < 3 + Math.floor(r() * 3); j++) { const f = 1800 + r() * 1400; blip(buf, t + j * 0.07, 0.15, f, f * 0.98, vol, 7); blip(buf, t + j * 0.07 + 0.35, 0.15, f, f * 0.98, vol * 0.3, 7); } } };
  /** crujido de roca caliente: chasquidos secos sueltos */
  const crujidos = (n: number, vol: number) => { for (let k = 0; k < n; k++) { const t = r() * (T - 0.2), s0 = Math.floor(t * RATE), m = Math.floor(0.02 * RATE); for (let i = 0; i < m && s0 + i < total; i++) buf[s0 + i] += (r() * 2 - 1) * vol * (1 - i / m); } };
  if (name === 'fragua' || name === 'lava') {
    // la fragua: un rumor hondo que respira, lava que burbujea grave, cadenas lejanas y la roca que cruje
    const deep = lowpass(pink(total, r), 0.012);
    for (let i = 0; i < total; i++) buf[i] += deep[i] * 1.8 * (0.7 + 0.3 * lfo(i, 1 / 5));
    lavaBub(name === 'lava' ? 40 : 16, name === 'lava' ? 0.16 : 0.1);
    cadenas(name === 'lava' ? 2 : 4, 0.03);
    crujidos(name === 'lava' ? 10 : 14, 0.08);
    if (name === 'lava') { const flow = bandpass(pink(total, r), (i) => 160 + 60 * lfo(i, 0.09), 0.8); for (let i = 0; i < total; i++) buf[i] += flow[i] * 0.7; }
  }
  if (name === 'jaulas') {
    // las jaulas que se mecen (chirridos de cadena lentos) y, metidos bajito, los recuerdos de arriba: un grillo,
    // una campanita, el eco de un cristal, una ola y la cajita de música
    const deep = lowpass(pink(total, r), 0.01);
    for (let i = 0; i < total; i++) buf[i] += deep[i] * 1.2;
    for (let t = 0.4; t < T - 1; t += 2.6 + r() * 1.4) { const f = 700 + r() * 300; blip(buf, t, 0.5, f, f * 1.15, 0.025, 3); blip(buf, t + 0.6, 0.5, f * 1.15, f, 0.02, 3); }
    cadenas(3, 0.025);
    // el grillo (Bosque)
    for (let j = 0; j < 3; j++) blip(buf, 1.2 + j * 0.09, 0.05, 4400, 4400, 0.012, 6);
    // la campanita (Catedral)
    for (const [m, v] of [[1, 0.025], [2.76, 0.01]] as [number, number][]) blip(buf, 4.2, 2.5, 587.3 * m, 587.3 * m, v, 2.5);
    // el eco de un cristal (Galerías)
    for (let e = 0; e < 4; e++) blip(buf, 7.4 + e * 0.38, 0.4, 2637, 2637, 0.02 * Math.pow(0.5, e), 5);
    // una ola (Puerto)
    { const s0 = Math.floor(10 * RATE), n = Math.floor(2.4 * RATE), w = lowpass(pink(n, r), 0.06); for (let i = 0; i < n && s0 + i < total; i++) buf[s0 + i] += w[i] * 0.5 * Math.sin((i / n) * Math.PI); }
    // la cajita de música (Ciudad): las primeras notas de la canción de cuna
    [392, 329.6, 392, 440, 392].forEach((f, i) => blip(buf, 13 + i * 0.5, 0.9, f * 2, f * 2, 0.018, 5));
  }
  if (name === 'fuelles') {
    // los fuelles: el rumor de la fragua y un aire grande que entra y sale cada cuatro segundos
    const deep = lowpass(pink(total, r), 0.012);
    for (let i = 0; i < total; i++) buf[i] += deep[i] * 1.4;
    const air = bandpass(pink(total, r), (i) => 220 + 260 * lfo(i, 0.25, -1.4), 0.9);
    for (let i = 0; i < total; i++) buf[i] += air[i] * 0.6 * lfo(i, 0.25, -1.4) ** 3;
    crujidos(10, 0.07);
    lavaBub(8, 0.08);
  }
  if (name === 'bosque_ceniza') {
    // el bosque de ceniza: brasas que crepitan finito y un viento seco, muy bajito
    const wind = bandpass(pink(total, r), (i) => 500 + 300 * lfo(i, 0.06), 1.2);
    for (let i = 0; i < total; i++) buf[i] += wind[i] * 0.25 * (0.4 + 0.6 * lfo(i, 0.09, 1));
    crujidos(60, 0.05);
    for (let k = 0; k < 12; k++) blip(buf, r() * (T - 0.2), 0.03, 3000 + r() * 1500, 2600, 0.015, 9);
  }
  if (name === 'carcel') {
    // la cárcel: hierro que gotea frío, una reja que se mece y llaves que tintinean lejos
    const deep = lowpass(pink(total, r), 0.01);
    for (let i = 0; i < total; i++) buf[i] += deep[i] * 1.1;
    for (let k = 0; k < 9; k++) { const t = r() * (T - 0.5); blip(buf, t, 0.12, 1400 + r() * 300, 900, 0.04, 8); }
    for (let t = 1; t < T - 1; t += 4 + r() * 2) blip(buf, t, 0.9, 380, 410, 0.025, 3);
    cadenas(4, 0.03);
  }
  if (name === 'horno') {
    // el horno: un rugido sordo, grave y lejos, que crece y baja despacio
    const roar = bandpass(pink(total, r), (i) => 90 + 50 * lfo(i, 0.07), 0.7);
    for (let i = 0; i < total; i++) buf[i] += roar[i] * 1.3 * (0.6 + 0.4 * lfo(i, 1 / 6));
    const deep = lowpass(pink(total, r), 0.008);
    for (let i = 0; i < total; i++) buf[i] += deep[i] * 1.6;
    crujidos(8, 0.06);
  }
  // ---------- Mundo 7: El Corazón Helado ----------
  /** viento helado: aire que silba entre el hielo, con ráfagas que crecen y bajan despacio */
  const viento = (vol: number, alto = 1) => { const w = bandpass(pink(total, r), (i) => (380 + 340 * lfo(i, 0.05)) * alto, 1.4); const w2 = bandpass(pink(total, r), (i) => (1300 + 500 * lfo(i, 0.08, 2)) * alto, 1.2); for (let i = 0; i < total; i++) buf[i] += (w[i] * 0.8 + w2[i] * 0.25) * vol * (0.45 + 0.55 * lfo(i, 1 / 7, 0.6) ** 2); };
  /** el hielo que cruje: un quejido grave que se dobla (como un lago congelado) y chasquidos secos */
  const crujeHielo = (n: number, vol: number) => { for (let k = 0; k < n; k++) { const t = r() * (T - 1.5), f = 90 + r() * 140; blip(buf, t, 0.5 + r() * 0.6, f * 1.6, f * 0.6, vol, 2.2); blip(buf, t + 0.05, 0.4, f * 3.1, f * 1.2, vol * 0.4, 3); } crujidos(Math.round(n * 1.4), vol * 0.6); };
  /** goteo helado: gotas que caen en agua quieta con eco */
  const goteo = (n: number, vol: number) => { for (let k = 0; k < n; k++) { const t = r() * (T - 0.8), f = 1200 + r() * 900; blip(buf, t, 0.12, f, f * 1.6, vol, 9); blip(buf, t + 0.28, 0.12, f, f * 1.6, vol * 0.3, 9); } };
  /** el rumor hondo del abismo */
  const hondo = (vol: number) => { const d = lowpass(pink(total, r), 0.01); for (let i = 0; i < total; i++) buf[i] += d[i] * vol; };
  if (name === 'hielo') {
    // la escalera helada: viento helado siempre y el hielo que cruje de vez en cuando
    hondo(1.2); viento(1); crujeHielo(5, 0.05);
  }
  if (name === 'bosque_hielo') {
    // el bosque de escarcha: ramas de hielo que tintinean con el viento y lobos que aúllan lejos
    hondo(0.9); viento(0.8, 1.2);
    for (let k = 0; k < 18; k++) { const t = r() * (T - 0.5), f = 2400 + r() * 1800; blip(buf, t, 0.25, f, f, 0.012, 6); }
    for (const t0 of [2.5, 8.2]) { const f = 380 + r() * 60; blip(buf, t0, 2.4, f, f * 1.45, 0.02, 1.4); blip(buf, t0 + 0.5, 2, f * 1.45, f * 1.2, 0.012, 1.6); }
  }
  if (name === 'lago') {
    // el lago: el hielo que suena bajo los pies (quejidos largos y graves que viajan) y un viento bajito
    hondo(1.4); viento(0.5); crujeHielo(9, 0.07);
    for (let k = 0; k < 4; k++) { const t = r() * (T - 2), f = 900 + r() * 500; blip(buf, t, 1.6, f, f * 0.4, 0.02, 1.2); }
  }
  if (name === 'catacumbas') {
    // las catacumbas: goteo helado con eco y susurros sin palabras (ruido que sube y baja como una voz)
    hondo(1.3); goteo(14, 0.035);
    for (let k = 0; k < 4; k++) { const t0 = 1 + r() * (T - 3), dur = 1.2 + r(), s0 = Math.floor(t0 * RATE), n = Math.floor(dur * RATE); const v = bandpass(pink(n, r), (i) => 900 + 600 * Math.sin((i / n) * Math.PI * 3 + k), 0.9); for (let i = 0; i < n && s0 + i < total; i++) buf[s0 + i] += v[i] * 0.22 * Math.sin((i / n) * Math.PI) ** 2; }
  }
  if (name === 'ciudadela') {
    // la ciudadela: el viento que pasa por las almenas (silbido más agudo), una bandera helada que golpea y cadenas
    hondo(1); viento(0.7, 1.6);
    for (let t = 0.6; t < T - 1; t += 2.2 + r() * 1.8) for (let j = 0; j < 3; j++) { const s0 = Math.floor((t + j * 0.09) * RATE), m = Math.floor(0.04 * RATE); for (let i = 0; i < m && s0 + i < total; i++) buf[s0 + i] += (r() * 2 - 1) * 0.06 * (1 - i / m); }
    cadenas(3, 0.02);
  }
  if (name === 'puente') {
    // el puente: la ventisca que no para (fuerte y de lado), las cadenas del puente que golpean y el vacío abajo
    hondo(1.6); viento(1.6, 1.1); viento(0.8, 2);
    for (let t = 0.3; t < T - 0.5; t += 0.9 + r() * 0.8) { const f = 1600 + r() * 900; blip(buf, t, 0.12, f, f * 0.97, 0.03, 7); }
  }
  if (name === 'puerta') {
    // la puerta del trono: un rumor de fuego negro detrás de la puerta y el viento helado delante
    hondo(1.2); viento(0.5);
    const roar = bandpass(pink(total, r), (i) => 70 + 30 * lfo(i, 0.06), 0.7);
    for (let i = 0; i < total; i++) buf[i] += roar[i] * 0.9 * (0.6 + 0.4 * lfo(i, 1 / 8));
    crujidos(6, 0.05);
  }
  if (name === 'trono') {
    // el corazón helado: un latido grave y lento (dos golpes hondos, sin susto) sobre el viento y las brasas del trono
    hondo(1.4); viento(0.4);
    const beat = len / RATE / 12;
    for (let t = 0.3; t < T; t += beat) { blip(buf, t, 0.28, 62, 44, 0.32, 3.5); blip(buf, t + 0.26, 0.24, 56, 40, 0.22, 3.5); }
    crujidos(18, 0.04);
  }
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

/**
 * Los ambientes del kit de GG Abyss, en su orden (los del olímpico van en AMBIENCE_NAMES, que es el catálogo del kit a
 * medida y no cambia de orden).
 */
export const AMBIENTES_GG_ABYSS: AmbienceName[] = ['bosque', 'agua', 'noche', 'viento', 'cueva', 'magia', 'catedral', 'galerias', 'eco', 'puerto', 'campana', 'ciudad', 'cajita', 'jardin', 'reloj', 'abismo', 'fragua', 'lava', 'jaulas', 'fuelles', 'bosque_ceniza', 'carcel', 'horno', 'hielo', 'bosque_hielo', 'lago', 'catacumbas', 'ciudadela', 'puente', 'puerta', 'trono'];
