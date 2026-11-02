import { MATERIALES } from './materiales';
import { VISTA, ruido, palo, esfera, poliedro, masa, hueso, bulto, type Comp, type Pieza, type V3 } from './render';
import type { Encanto } from './cuerpo';

/**
 * Los siete elementos de las armas como capas reutilizables (fuego, hielo, veneno, rayo, sombra, sagrado y sangre).
 * Cualquier familia lleva cualquier elemento: el elemento no es un dibujo aparte sino
 *
 *  1. un metal propio para la hoja (`ar_<elemento>_1` sutil, `ar_<elemento>_2` encendido): acero ennegrecido con
 *     grietas de brasa, acero pálido con escarcha cristalina, acero corroído con venas de icor verde, acero azulado con
 *     venas blanco violáceas, obsidiana con vetas moradas, plata con runas de oro, acero carmesí con venas de sangre;
 *  2. una capa viva (`capaElemental`) que se arma sobre el tramo vivo del arma (la hoja, la cabeza o la gema) y cambia
 *     con el cuadro: lenguas de fuego y brasas, racimos de cristales y carámbanos, gotas de icor que se estiran y caen,
 *     arcos de rayo que se ramifican, humo negro con núcleo morado, runas de oro que laten con un halo, y sangre que
 *     chorrea. Su fuerza crece con el nivel del arma (1 a 5);
 *  3. la luz que el juego usa para la iluminación dinámica y las sombras (`LUZ_ELEMENTO_ARMA`).
 */

// ------------------------------------------------------------------ luz para el juego
export interface LuzElemento {
  /** color de la luz (#rrggbb) */
  color: string;
  /** radio en pixeles del juego a nivel 3 (escala con `luzDeArma`) */
  radio: number;
  /** 0..2: cuánto ilumina (1 = una antorcha) */
  intensidad: number;
  /** 0..1: cuánto titila (0 fija, 1 parpadeo de llama o chispazo) */
  parpadeo: number;
}
/** Luz de cada elemento para la iluminación dinámica y las sombras del juego. */
export const LUZ_ELEMENTO_ARMA: Record<Encanto, LuzElemento> = {
  fuego: { color: '#ff7a20', radio: 96, intensidad: 1.15, parpadeo: 0.45 },
  hielo: { color: '#7cc4ff', radio: 80, intensidad: 0.8, parpadeo: 0.08 },
  veneno: { color: '#62e03a', radio: 64, intensidad: 0.65, parpadeo: 0.2 },
  rayo: { color: '#d8ccff', radio: 104, intensidad: 1.3, parpadeo: 0.9 },
  sombra: { color: '#8a3cd8', radio: 56, intensidad: 0.5, parpadeo: 0.25 },
  sagrado: { color: '#ffe6a8', radio: 112, intensidad: 1.2, parpadeo: 0.12 },
  sangre: { color: '#c81a1a', radio: 60, intensidad: 0.6, parpadeo: 0.3 },
};
/** La luz de un arma según su nivel: el radio y la intensidad crecen del 60 % (común) al 140 % (mítica). */
export function luzDeArma(el: Encanto, nivel = 3): LuzElemento {
  const l = LUZ_ELEMENTO_ARMA[el], k = 0.6 + (Math.max(1, Math.min(5, nivel)) - 1) * 0.2;
  return { color: l.color, radio: Math.round(l.radio * k), intensidad: +(l.intensidad * k).toFixed(2), parpadeo: l.parpadeo };
}

// ------------------------------------------------------------------ materiales de las armas (ar_*)
const M = MATERIALES;
/** Reflejo de entorno falso para lo pulido: cielo claro arriba del horizonte, suelo oscuro abajo, una línea nítida. */
const reflejo = (n: V3, k = 1) => {
  const d = VISTA[0] * n[0] + VISTA[1] * n[1] + VISTA[2] * n[2], rz = VISTA[2] - 2 * d * n[2];
  return (rz > 0.12 ? 0.06 + Math.min(0.1, (rz - 0.12) * 0.3) : rz > -0.05 ? -0.16 : -0.05) * k;
};
const cepillado = (p: V3) => (ruido(p[0] * 0.2, p[1] * 0.2, p[2] * 2.4) - 0.5) * 0.08;
/** Venas: la isolínea del ruido (una red de grietas que no se repite). */
const vena = (p: V3, f: number, w: number, o = 0) => Math.abs(ruido(p[0] * f + o, p[1] * f + o * 0.7, p[2] * f - o) - 0.5) < w;

M.ar_hierro = { rampa: ['#121110', '#201e1b', '#302d29', '#423e38', '#56514a', '#6b655c', '#827b70', '#9a9285', '#b4ab9c'], ruido: 0.2, escala: 0.7, brillo: 0.45,
  patron: (p, n) => (ruido(p[0] * 0.45, p[1] * 0.45, p[2] * 0.45) > 0.7 ? -0.14 : 0) + (ruido(p[0] * 0.9 + 5, p[1] * 0.9, p[2] * 0.9) > 0.74 ? -0.08 : 0) + reflejo(n, 0.5) };
M.ar_acero = { rampa: ['#0c0d10', '#171a1f', '#252930', '#353b44', '#48505b', '#5e6874', '#78838f', '#96a1ac', '#b9c2ca', '#e2e7eb'], ruido: 0.05, escala: 0.5, brillo: 0.7, patron: (p, n) => cepillado(p) + reflejo(n) - 0.06 };
M.ar_acero_negro = { rampa: ['#050608', '#0b0d11', '#13161c', '#1c2028', '#262c36', '#323a46', '#424c5a', '#5a6676', '#7e8b9c', '#b8c4d2'], ruido: 0.05, escala: 0.5, brillo: 0.9, patron: (p, n) => cepillado(p) + reflejo(n, 1.2) };
M.ar_obsidiana = { rampa: ['#030204', '#060509', '#0b0910', '#110e18', '#181421', '#211b2c', '#2c2439', '#3a304b', '#5a4c70', '#a89cc4'], ruido: 0.04, escala: 0.5, brillo: 1.1, patron: (_p, n) => reflejo(n, 1.4) - 0.12 };
M.ar_oro = { rampa: ['#1a0e03', '#331f07', '#54360d', '#785015', '#9c6c1f', '#b8862a', '#d0a03c', '#e2bb55', '#efd27c', '#f8e6aa'], ruido: 0.04, escala: 0.5, brillo: 0.95, patron: (_p, n) => reflejo(n, 0.6) };
M.ar_oro_negro = { rampa: ['#0a0503', '#160b05', '#241309', '#341c0d', '#482712', '#5e3519', '#7a4a22', '#9c6630', '#c49048'], ruido: 0.05, escala: 0.5, brillo: 0.9, patron: (_p, n) => reflejo(n, 0.8) };
M.ar_plata = { rampa: ['#121417', '#23272c', '#383d44', '#50565e', '#6b727b', '#889099', '#a8afb7', '#ccd2d8', '#f0f3f6'], ruido: 0.04, escala: 0.5, brillo: 0.95, patron: (_p, n) => reflejo(n, 0.8) };
M.ar_plata_negra = { rampa: ['#060508', '#0e0c12', '#18151e', '#231f2b', '#302a3a', '#3f384b', '#544b63', '#706683', '#9a90ae'], ruido: 0.05, escala: 0.5, brillo: 0.85, patron: (_p, n) => reflejo(n, 0.9) };
M.ar_ebano = { rampa: ['#060403', '#0d0907', '#160f0b', '#20160f', '#2b1d14', '#38261a', '#473021', '#5a3d2a'], ruido: 0.12, escala: 0.4, brillo: 0.35, patron: (p) => (ruido(p[0] * 0.3, p[1] * 0.3, p[2] * 1.6) - 0.5) * 0.14 };
/** Hielo de los cristales y carámbanos: claro, con brillo duro y facetas. */
M.ar_hielo = { rampa: ['#0e2436', '#16344c', '#204a66', '#2e6484', '#4282a4', '#62a2c2', '#8cc2dc', '#bce0f0', '#eaf8ff'], ruido: 0.08, escala: 0.4, brillo: 1.2, patron: (p, n) => reflejo(n, 1.2) + (ruido(p[0] * 0.8, p[1] * 0.8, p[2] * 0.8) > 0.66 ? 0.12 : 0) };
/** Humo negro de la sombra (no brilla: tapa y oscurece) y la sangre que chorrea (brillo de líquido). */
M.ar_humo = { rampa: ['#040306', '#09060d', '#100b16', '#18101f', '#22172c', '#2e1f3a'], ruido: 0.5, escala: 0.6 };
M.ar_sangre = { rampa: ['#120102', '#240305', '#3a0608', '#540a0c', '#700f10', '#8c1614', '#a82018', '#d04a38'], ruido: 0.1, escala: 0.6, brillo: 1.1, patron: (_p, n) => reflejo(n, 1.3) };
M.ar_icor = { rampa: ['#1a4808', '#2c7010', '#46a018', '#6ad02a', '#a0f060', '#e0ffb0'], ruido: 0.3, escala: 0.5, emite: true };
M.ar_rayo = { rampa: ['#4a2aa0', '#7a5ae8', '#b0a0ff', '#e4dcff', '#ffffff'], ruido: 0.15, escala: 1, emite: true };
M.ar_runa_oro = { rampa: ['#7a5418', '#b8862a', '#f0c860', '#fff0b0', '#ffffff'], ruido: 0.1, escala: 0.6, emite: true };
M.ar_nucleo_sombra = { rampa: ['#2a0a4a', '#4a1478', '#7a2ab0', '#a858e0', '#d8a0ff'], ruido: 0.4, escala: 0.5, emite: true };
M.ar_vidrio = { rampa: ['#0a1014', '#122028', '#1c3038', '#284450', '#385a68', '#4c7484', '#6a92a0', '#98bcc6', '#dceef2'], ruido: 0.04, escala: 0.4, brillo: 1.25, patron: (_p, n) => reflejo(n, 1.1) - 0.08 };

/**
 * Metales de los elementos: ocho tonos de metal y cuatro de lo que brilla. El patrón baja el metal un cuarto (así el
 * brillo del acero nunca llega a la parte encendida de la rampa) y sube las venas hasta el final: las venas quedan
 * encendidas aun en la sombra, como grietas de brasa o hielo con luz por dentro.
 */
type Veta = (p: V3, n: V3) => number;
const hexA = (h: string): V3 => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const aHex = (c: V3) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
/** Estira una rampa a `n` tonos y le suma un brillo frío arriba (el filo pulido). */
function estirar(r: string[], n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < n - 1; i++) { const t = (i / (n - 2)) * (r.length - 1), k = Math.min(r.length - 2, Math.floor(t)), a = hexA(r[k]), b = hexA(r[k + 1]), u = t - k; out.push(aHex([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u])); }
  const top = hexA(r[r.length - 1]);
  out.push(aHex([top[0] * 0.55 + 200 * 0.45, top[1] * 0.55 + 205 * 0.45, top[2] * 0.55 + 212 * 0.45]));
  return out;
}
const metalElemental = (metal: string[], luz: string[], veta: Veta, brillo = 0.7): { rampa: string[]; ruido: number; escala: number; brillo: number; patron: Veta } =>
  ({ rampa: [...estirar(metal, 11), ...luz.slice(1)], ruido: 0.05, escala: 0.5, brillo: brillo * 0.45, patron: (p, n) => -0.3 + reflejo(n, 0.9) + cepillado(p) + veta(p, n) });
const ELEM_METAL: Record<Encanto, { metal: string[]; luz: string[]; veta: (fuerte: boolean) => Veta; brillo?: number }> = {
  // acero ennegrecido por el fuego, grietas de brasa
  fuego: { metal: ['#060404', '#0e0907', '#18100c', '#231812', '#302119', '#3f2b20', '#523a2b', '#6a4c39'], luz: ['#a02a08', '#e0600e', '#ffa830', '#fff0a0'],
    veta: (k) => (p) => (vena(p, 0.24, k ? 0.022 : 0.011) ? 1.25 : vena(p, 0.24, k ? 0.04 : 0.02) ? 0.3 : 0) },
  // acero pálido azulado con escarcha cristalina y grietas de hielo
  hielo: { metal: ['#0c121a', '#16202c', '#22303f', '#304256', '#40566e', '#536c86', '#6a849e', '#86a0b8'], luz: ['#6aaee8', '#a8d8ff', '#dff2ff', '#ffffff'],
    veta: (k) => (p) => (ruido(p[0] * 0.9, p[1] * 0.9, p[2] * 0.9) > (k ? 0.74 : 0.79) ? 1.1 : vena(p, 0.3, k ? 0.014 : 0.008, 3) ? 1.0 : 0), brillo: 0.95 },
  // acero corroído verdoso con venas de icor
  veneno: { metal: ['#060806', '#0c110b', '#141b12', '#1e271b', '#283425', '#344330', '#43543c', '#56684c'], luz: ['#2c8a10', '#58c820', '#a0f050', '#e8ffb8'],
    veta: (k) => (p) => (vena(p, 0.28, k ? 0.02 : 0.011, 7) ? 1.25 : ruido(p[0] * 0.5, p[1] * 0.5, p[2] * 0.5) > 0.72 ? -0.12 : 0) },
  // acero azulado con venas blanco violáceas que se ramifican
  rayo: { metal: ['#07080e', '#0e1019', '#171a28', '#212639', '#2c334c', '#394262', '#4a557a', '#606d96'], luz: ['#6a4ad0', '#a890ff', '#e6deff', '#ffffff'],
    veta: (k) => (p) => (vena(p, 0.2, k ? 0.016 : 0.009, 11) || (k && vena(p, 0.55, 0.009, 2)) ? 1.25 : 0), brillo: 0.9 },
  // obsidiana con vetas moradas que apenas laten
  sombra: { metal: ['#030204', '#060408', '#0b080e', '#110c15', '#18121e', '#211829', '#2c2036', '#3c2c4a'], luz: ['#4a1a7a', '#7a34b8', '#b070e8', '#e6c8ff'],
    veta: (k) => (p) => (vena(p, 0.18, k ? 0.02 : 0.011, 13) ? 1.15 : 0), brillo: 1.05 },
  // plata y oro blanco con runas de oro encendidas
  sagrado: { metal: ['#1c1a16', '#2e2b25', '#45413a', '#5e5950', '#7a7468', '#979084', '#b4ada0', '#d0cabe'], luz: ['#c8902a', '#f0c050', '#fff0b0', '#ffffff'],
    veta: (k) => (p) => { const u = (p[0] - p[1]) * 0.42 + p[2] * 0.12, v = p[2] * 0.42; const runa = Math.abs(Math.sin(u * 2.1) * Math.cos(v * 1.7)) > (k ? 0.93 : 0.97) && ruido(Math.floor(u), Math.floor(v), 4) > 0.42; return runa ? 1.2 : 0; }, brillo: 0.95 },
  // acero carmesí con venas de sangre viva
  sangre: { metal: ['#080203', '#120405', '#1e0708', '#2a0b0c', '#381011', '#481617', '#5a1e1e', '#702a28'], luz: ['#8a0a0c', '#d0201a', '#ff5a40', '#ffc0a8'],
    veta: (k) => (p) => (vena(p, 0.26, k ? 0.02 : 0.011, 17) ? 1.25 : 0) },
};
for (const [el, d] of Object.entries(ELEM_METAL) as [Encanto, (typeof ELEM_METAL)[Encanto]][]) {
  M[`ar_${el}_1`] = metalElemental(d.metal, d.luz, d.veta(false), d.brillo);
  M[`ar_${el}_2`] = metalElemental(d.metal, d.luz, d.veta(true), d.brillo);
}
/** Lo que brilla de cada elemento (núcleos, gemas, chispas). */
export const BRILLO_ELEMENTO: Record<Encanto, string> = { fuego: 'fuego', hielo: 'cu_ojo_hielo', veneno: 'ar_icor', rayo: 'ar_rayo', sombra: 'ar_nucleo_sombra', sagrado: 'ar_runa_oro', sangre: 'cu_sangre_viva' };

// ------------------------------------------------------------------ vectores
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const nor = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cruz = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const mez = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const ARRIBA: V3 = [0, 0, 1];

/**
 * La capa viva de un elemento sobre el tramo a→b (la hoja, la cabeza o la gema del arma), en el cuadro f (de 8).
 * `S` es la escala del arma y `nivel` (1..5) cuánto se nota: brasas y lenguas más altas, más cristales, más arcos.
 * `ancho` es el medio ancho de lo que envuelve (la hoja o la cabeza), para que la capa nazca del borde y no del eje.
 */
export function capaElemental(a: V3, b: V3, el: Encanto, f: number, S = 1, nivel = 3, semilla = 1, ancho = 1.2): Pieza[] {
  const ps: Pieza[] = [];
  const h = (i: number) => { const x = Math.sin(i * 127.1 + semilla * 311.7) * 43758.5453; return x - Math.floor(x); };
  const k = [0.5, 0.65, 0.82, 1.0, 1.25][Math.max(1, Math.min(5, nivel)) - 1];
  const L = len(sub(b, a)), eje = nor(sub(b, a));
  // un lado perpendicular al eje (para abrir la capa a los costados de la hoja)
  let lado = cruz(eje, ARRIBA); if (len(lado) < 0.2) lado = cruz(eje, [1, 0, 0]);
  lado = nor(lado);
  const frente = nor(cruz(lado, eje));
  const n = Math.max(3, Math.round((L / (2.2 * S)) * (0.7 + k * 0.4)));
  const ciclo = (i: number) => ((f + h(i) * 8) % 8) / 8;
  const brillo = BRILLO_ELEMENTO[el];
  const W = ancho * S;
  switch (el) {
    case 'fuego': {
      // lenguas de fuego que nacen de los filos y suben ondulando (en S), con un núcleo claro; se funden en una sola llama
      const lenguas: Comp[] = [], nucleos: Comp[] = [];
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, u = ciclo(i), s = i % 2 ? 1 : -1;
        const base = add(mez(a, b, t), lado, s * W * (0.8 + h(i + 3) * 0.3));
        const alto = (2.4 + 3.0 * Math.sin(u * Math.PI) + h(i + 1) * 1.6) * S * k, ond = Math.sin((f / 8) * Math.PI * 2 + i * 1.9) * 0.22 * alto;
        const p1 = add(add(base, ARRIBA, alto * 0.34), lado, s * (alto * 0.18 + ond * 0.3));
        const p2 = add(add(add(p1, ARRIBA, alto * 0.33), lado, -s * ond * 0.6), eje, ond * 0.4);
        const p3 = add(add(p2, ARRIBA, alto * 0.33), lado, s * (alto * 0.12 + ond));
        lenguas.push(hueso(base, p1, 0.72 * S * k, 0.55 * S * k), hueso(p1, p2, 0.55 * S * k, 0.32 * S * k), hueso(p2, p3, 0.32 * S * k, 0.04 * S));
        if (i % 2 === 0) nucleos.push(hueso(add(base, ARRIBA, 0.15 * S), p1, 0.34 * S * k, 0.16 * S * k), hueso(p1, mez(p1, p2, 0.6), 0.16 * S * k, 0.05 * S));
      }
      ps.push(masa(lenguas, { mat: 'fuego', suave: 0.9 * S * k }), masa(nucleos, { mat: 'luz_vela', suave: 0.4 * S }));
      // brasas que se van subiendo y apagando
      for (let i = 0; i < Math.round(n * k); i++) {
        const u = ciclo(i + 40), t = h(i + 50), p = mez(a, b, t);
        const q = add(add(add(p, ARRIBA, (4 + u * 11) * S * k), lado, (h(i + 51) - 0.5) * 7 * S), frente, (h(i + 52) - 0.5) * 3 * S);
        ps.push(esfera(...q, 0.3 * S * (1 - u * 0.6) * Math.min(1.2, k), { mat: u < 0.5 ? 'luz_vela' : 'fuego' }));
      }
      break;
    }
    case 'hielo': {
      // racimos de cristales que crecen de la hoja hacia afuera, carámbanos que cuelgan y un destello que recorre
      for (let i = 0; i < n; i++) {
        if (i % 2 && k < 1.1) continue;
        const t = (i + 0.5) / n, s = h(i + 6) > 0.5 ? 1 : -1, p = add(mez(a, b, t), lado, s * W * 0.95);
        const racimo = 1 + Math.round(h(i + 2) * 1.2 * k);
        for (let j = 0; j < racimo; j++) {
          const dir = nor(add(add(add([0, 0, 0], lado, s * (0.7 + h(i * 5 + j) * 0.6)), eje, (h(i * 7 + j) - 0.4) * 1.2), ARRIBA, 0.3 + h(i * 3 + j) * 0.6));
          const L2 = (1.1 + h(i * 11 + j) * 1.8) * S * k, r = (0.3 + h(i * 13 + j) * 0.22) * S * k;
          const o1 = nor(cruz(dir, frente)), o2 = cruz(dir, o1), c0 = add(p, dir, -0.2 * S);
          ps.push(poliedro([add(c0, o1, r), add(c0, o1, -r), add(c0, o2, r), add(c0, o2, -r), add(add(c0, dir, L2 * 0.75), o1, r * 0.8), add(add(c0, dir, L2 * 0.75), o2, -r * 0.8), add(c0, dir, L2)], { mat: 'ar_hielo' }));
          if (h(i * 17 + j + f) > 0.82) ps.push(esfera(...add(c0, dir, L2 * 0.92), 0.22 * S, { mat: 'cu_ojo_hielo' }));
        }
        // carámbano colgando
        if (i % 2 === 0) { const c = add(mez(a, b, t), lado, -s * W * 0.5), lg = (1.6 + h(i + 9) * 2.4) * S * k; ps.push(masa([hueso(c, add(c, ARRIBA, -lg), 0.38 * S * k, 0.04 * S)], { mat: 'ar_hielo', suave: 0.2 * S })); }
      }
      // el destello que recorre la hoja y la nieve fina que cae
      const tt = (f % 8) / 8, pd = mez(a, b, tt);
      ps.push(esfera(...add(pd, frente, 0.4 * S), 0.7 * S * k, { mat: 'cu_ojo_hielo' }));
      for (let i = 0; i < Math.round(4 * k); i++) { const u = ciclo(i + 30); ps.push(esfera(...add(add(mez(a, b, h(i + 31)), lado, (h(i + 32) - 0.5) * 6 * S), ARRIBA, -(1 + u * 8) * S), 0.2 * S, { mat: 'nieve' })); }
      break;
    }
    case 'veneno': {
      void brillo;
      // icor que rezuma del filo: gotas que cuelgan de un hilo, se estiran y caen; burbujas que revientan sobre la hoja
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, u = ciclo(i), s = i % 2 ? 1 : -1, p = add(mez(a, b, t), lado, s * W * 0.85);
        if (i % 3 === 0 || (k > 1 && i % 3 === 1)) {
          const estira = (1.2 + Math.min(1, u * 1.6) * 3.2) * S * k, fin = add(p, ARRIBA, -estira);
          const cs: Comp[] = [hueso(p, fin, 0.4 * S * k, 0.18 * S), bulto(add(fin, ARRIBA, -0.35 * S), [0.55 * S * k, 0.55 * S * k, 0.75 * S * k], {})];
          if (u > 0.55) ps.push(esfera(...add(fin, ARRIBA, -(u - 0.55) * 18 * S), 0.45 * S * k, { mat: 'ar_icor' }));
          else ps.push(masa(cs, { mat: 'ar_icor', suave: 0.45 * S }));
        }
        const bu = ciclo(i + 20);
        if (bu < 0.7 && i % 2 === 0) ps.push(esfera(...add(add(mez(a, b, h(i + 21)), frente, 0.35 * S), lado, (h(i + 22) - 0.5) * W), (0.2 + bu * 0.5) * S * k, { mat: 'ar_icor' }));
      }
      // vapor verde que sube
      for (let i = 0; i < Math.round(3 * k); i++) { const u = ciclo(i + 60); ps.push(esfera(...add(add(mez(a, b, h(i + 61)), lado, (h(i + 62) - 0.5) * 5 * S), ARRIBA, (2 + u * 7) * S), (0.5 - u * 0.3) * S, { mat: 'fuego_verde' })); }
      break;
    }
    case 'rayo': {
      // el núcleo blanco y arcos que saltan entre puntos de la hoja y al aire, ramificados, distintos en cada cuadro
      ps.push(palo(a, b, 0.24 * S, { mat: 'ar_rayo', r1: 0.14 * S }));
      const arcos = Math.round(2 + 3 * k);
      const j = (i: number, s: number) => (h(i * 17 + f * 31 + s) - 0.5);
      for (let i = 0; i < arcos; i++) {
        const t0 = h(i + f * 7), t1 = Math.min(1, Math.max(0, t0 + (j(i, 1) > 0 ? 0.35 : -0.35)));
        const p0 = add(mez(a, b, t0), lado, (j(i, 2) > 0 ? 1 : -1) * W * 0.8), p1 = add(add(mez(a, b, t1), lado, j(i, 3) * 6 * S * k), frente, j(i, 4) * 3 * S);
        let prev = p0;
        const pasos = 4;
        for (let s = 1; s <= pasos; s++) {
          const m = mez(p0, p1, s / pasos), nx: V3 = s === pasos ? p1 : add(add(m, lado, j(i, s * 3) * 2.6 * S * k), ARRIBA, j(i, s * 5) * 2.2 * S * k);
          ps.push(palo(prev, nx, (0.3 - s * 0.04) * S, { mat: 'ar_rayo' }));
          // rama que se abre
          if (s === 2 && k >= 0.8) { const rama = add(add(nx, lado, j(i, 40) * 4 * S), ARRIBA, j(i, 41) * 4 * S); ps.push(palo(nx, rama, 0.14 * S, { mat: 'ar_rayo' })); }
          prev = nx;
        }
        ps.push(esfera(...p1, 0.32 * S, { mat: 'ar_rayo' }));
      }
      break;
    }
    case 'sombra': {
      // núcleo morado a lo largo de la hoja y hebras de humo negro que se enroscan alrededor, suben y se deshacen
      ps.push(palo(a, b, 0.3 * S, { mat: 'ar_nucleo_sombra', r1: 0.18 * S }));
      const hebras = Math.round(2 + 2 * k);
      for (let i = 0; i < hebras; i++) {
        const fase = (i / hebras) * Math.PI * 2 + (f / 8) * Math.PI * 2, t0 = h(i + 5) * 0.4, pts: V3[] = [];
        for (let j = 0; j <= 7; j++) {
          const t = Math.min(1, t0 + j * 0.11), ang = fase + j * 0.9, r = (W + (0.6 + j * 0.25) * S) * Math.min(1.2, k);
          pts.push(add(add(add(mez(a, b, t), lado, Math.cos(ang) * r), frente, Math.sin(ang) * r * 0.6), ARRIBA, j * 0.45 * S * k));
        }
        ps.push(masa(pts.slice(1).map((q, j) => hueso(pts[j], q, (0.62 - j * 0.07) * S * k, (0.55 - j * 0.07) * S * k)), { mat: 'ar_humo', suave: 0.5 * S * k }));
      }
      // jirones que se sueltan arriba y ojos de brasa morada que asoman
      for (let i = 0; i < Math.round(3 * k); i++) { const u = ciclo(i + 64), c = add(add(mez(a, b, 0.6 + h(i + 65) * 0.4), lado, (h(i + 66) - 0.5) * 4 * S), ARRIBA, (2 + u * 7) * S * k); ps.push(masa([bulto(c, [0.9 * S * (1 - u * 0.5), 0.7 * S * (1 - u * 0.5), 0.5 * S], { giro: u * 200 })], { mat: 'ar_humo', suave: 0.3 * S })); }
      for (let i = 0; i < Math.round(3 * k); i++) { const u = ciclo(i + 70); if (u > 0.6) continue; ps.push(esfera(...add(add(mez(a, b, h(i + 71)), lado, (h(i + 72) - 0.5) * 5 * S), ARRIBA, (1 + u * 6) * S), 0.28 * S, { mat: 'ar_nucleo_sombra' })); }
      break;
    }
    case 'sagrado': {
      // runas de oro que flotan a los dos lados de la hoja y laten, un halo en la base y motas de luz que suben
      const nr = Math.round(n * 0.8);
      for (let i = 0; i < nr; i++) {
        const t = (i + 0.5) / nr, s = i % 2 ? 1 : -1, late = 0.5 + 0.5 * Math.sin((f / 8) * Math.PI * 2 + i * 1.3);
        const c = add(add(mez(a, b, t), lado, s * (W + 1.4 * S)), frente, 0.3 * S), r = (0.55 + late * 0.25) * S * Math.min(1.2, k);
        // cada runa: un trazo vertical y uno o dos cruzados (no se repiten)
        const g = Math.floor(h(i + 3) * 4);
        ps.push(palo(add(c, eje, -r * 1.3), add(c, eje, r * 1.3), 0.14 * S, { mat: 'ar_runa_oro' }));
        if (g !== 1) ps.push(palo(add(c, eje, r * 0.6), add(add(c, eje, -r * 0.2), lado, s * r), 0.12 * S, { mat: 'ar_runa_oro' }));
        if (g >= 2) ps.push(palo(add(c, eje, -r * 0.5), add(add(c, eje, -r * 1.1), lado, -s * r * 0.8), 0.12 * S, { mat: 'ar_runa_oro' }));
        if (g === 3) ps.push(esfera(...add(c, eje, r * 1.5), 0.2 * S, { mat: 'ar_runa_oro' }));
      }
      // halo: aro de luz en la base del tramo vivo, perpendicular al arma
      const R = (W + 1.6 * S) * Math.min(1.25, k), seg = 14;
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI * 2 + f * 0.2, a1 = ((i + 1) / seg) * Math.PI * 2 + f * 0.2;
        const q0 = add(add(a, lado, Math.cos(a0) * R), frente, Math.sin(a0) * R), q1 = add(add(a, lado, Math.cos(a1) * R), frente, Math.sin(a1) * R);
        ps.push(palo(q0, q1, 0.16 * S, { mat: 'cu_halo' }));
      }
      for (let i = 0; i < Math.round(4 * k); i++) { const u = ciclo(i + 80); ps.push(esfera(...add(add(mez(a, b, h(i + 81)), lado, (h(i + 82) - 0.5) * 6 * S), ARRIBA, (1 + u * 8) * S), 0.24 * S * (1 - u * 0.5), { mat: 'luz_vela' })); }
      ps.push(palo(a, b, 0.22 * S, { mat: 'ar_runa_oro', r1: 0.12 * S }));
      break;
    }
    case 'sangre': {
      // sangre espesa que corre por la hoja hacia abajo, gotea de la punta y del filo, y una vena viva que late
      const late = 0.5 + 0.5 * Math.sin((f / 8) * Math.PI * 2);
      ps.push(palo(a, b, (0.18 + late * 0.08) * S, { mat: 'cu_sangre_viva', r1: 0.1 * S }));
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, u = ciclo(i), s = i % 2 ? 1 : -1, p = add(add(mez(a, b, t), lado, s * W * (0.3 + h(i + 4) * 0.6)), frente, 0.25 * S);
        // reguero pegado a la hoja que baja y engorda en la gota
        const lg = (1.5 + h(i + 5) * 2.5 + u * 2) * S * k, fin = add(p, ARRIBA, -lg);
        if (i % 2 === 0 || k > 1) ps.push(masa([hueso(p, fin, 0.3 * S * k, 0.36 * S * k), bulto(add(fin, ARRIBA, -0.3 * S), [0.5 * S * k, 0.5 * S * k, 0.7 * S * k], {})], { mat: 'ar_sangre', suave: 0.4 * S }));
        if (u > 0.6 && i % 3 === 0) ps.push(esfera(...add(fin, ARRIBA, -(u - 0.6) * 20 * S), 0.38 * S * k, { mat: 'ar_sangre' }));
      }
      // bruma roja
      for (let i = 0; i < Math.round(3 * k); i++) { const u = ciclo(i + 90); ps.push(esfera(...add(add(mez(a, b, h(i + 91)), lado, (h(i + 92) - 0.5) * 5 * S), ARRIBA, (1 + u * 5) * S), 0.22 * S, { mat: 'cu_sangre_viva' })); }
      break;
    }
  }
  return ps;
}
