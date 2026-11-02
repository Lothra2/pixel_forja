import { registrar, type Arma, type ObjetoDef, type Tema } from '../objeto';
import { MATERIALES } from '../materiales';
import { masa, hueso, bulto, ruido, type Comp, type Pieza, type V3, type Escena } from '../render';
import {
  TAU, PI, rad, add, sub, esc, len, nor, cruz, mez, ciclo, onda, jit, elegir, polar, suelo, rotM, ejeAng, transformar, tenir,
  roca, pena, manto, craneo, huesoLargo, costillar, catenaria, cadena, tela, cuerpo, CUERPOS, type M3,
} from '../actos45';

/**
 * Acto 6, Ysmeral, la Ciudad Ahogada: una catedral-ciudad que emerge del mar del norte. Barcos naufragados partidos,
 * mástiles rotos, anclas gigantes, redes con huesos, campanas de bronce verdoso caídas o meciéndose, columnas góticas
 * con percebes y algas, charcos de marea con luz que vive en el agua, corales de hueso, conchas gigantes, cofres de
 * barco, faroles de pescador, santos con la cara comida por la sal y marinos ahogados. Lo que vive: tentáculos que
 * asoman del agua, arrecifes de huesos y algas que cuelgan. Lo urbano: puertas de casas hundidas, escaleras que bajan
 * al agua, el barco varado que sirve de pueblo (muelle, tablones, velas raídas) y peces muertos.
 *
 * Escala: una persona mide 61 (75 px). Cada objeto tiene de 3 a 6 variantes y cambia con la semilla.
 */

const TEMA = 'ahogada' as string as Tema;

// ------------------------------------------------------------------ materiales
const M = MATERIALES;
const junta = (v: number, paso: number, grosor = 1) => { const m = ((v % paso) + paso) % paso; return m < grosor ? 1 : 0; };
function bloques(largo: number, alto: number) {
  return (p: V3, n: V3) => {
    const fila = Math.floor(p[2] / alto);
    if (Math.abs(n[2]) > 0.7) { const corre = (Math.floor(p[1] / alto) % 2) * largo * 0.5; return junta(p[1], alto) || junta(p[0] + corre, largo) ? -0.3 : 0; }
    const corre = (fila % 2) * largo * 0.5, u = Math.abs(n[0]) > Math.abs(n[1]) ? p[1] : p[0];
    if (junta(p[2], alto)) return -0.32;
    if (junta(u + corre, largo)) return -0.28;
    // la sal y las algas dejan la piedra manchada en franjas
    return (ruido(Math.floor((u + corre) / largo) * 1.7, fila * 2.3, 5) - 0.5) * 0.2 + (ruido(p[0] * 0.1, p[1] * 0.1, p[2] * 0.5) > 0.66 ? -0.1 : 0);
  };
}
function tablas(ancho: number) {
  return (p: V3, n: V3) => {
    const vertical = Math.abs(n[2]) < 0.7;
    const u = vertical ? (Math.abs(n[0]) > Math.abs(n[1]) ? p[1] : p[0]) : p[0];
    const v = vertical ? p[2] : p[1];
    if (junta(u, ancho)) return -0.3;
    const tabla = Math.floor(u / ancho);
    return (ruido(tabla * 3.3, v * 0.08, 1) - 0.5) * 0.3 + (ruido(u * 0.9, v * 0.05, tabla) - 0.5) * 0.14;
  };
}
M.ahg_piedra = { rampa: ['#0c1011', '#151d1f', '#202a2b', '#2b3737', '#384544', '#465451', '#566460', '#687570'], ruido: 0.3, escala: 0.2, patron: bloques(14, 7) };
M.ahg_piedra_lisa = { rampa: ['#0c1011', '#151d1f', '#202a2b', '#2b3737', '#384544', '#465451', '#566460', '#687570'], ruido: 0.35, escala: 0.18, brillo: 0.15, patron: (p) => (ruido(p[0] * 0.12, p[1] * 0.12, p[2] * 0.4) > 0.68 ? -0.12 : 0) };
M.ahg_roca = { rampa: ['#0a0d0e', '#131a1b', '#1d2627', '#283233', '#343f3f', '#424d4b', '#525c58'], ruido: 0.5, escala: 0.14, brillo: 0.2 };
M.ahg_sal = { rampa: ['#353833', '#4f534b', '#6a6e63', '#85897c', '#9fa293', '#b6b8a8', '#cacbbb'], ruido: 0.5, escala: 0.7 };
M.ahg_percebe = { rampa: ['#1d1f1b', '#33352e', '#4c4d43', '#66675a', '#808070', '#9a9986', '#b1af9b'], ruido: 0.4, escala: 1.3 };
M.ahg_alga = { rampa: ['#050806', '#0b110a', '#121b0f', '#1a2614', '#233219', '#2d3f1e', '#394c25'], ruido: 0.4, escala: 0.7, brillo: 0.45, patron: (p) => (Math.sin(p[2] * 1.3 + p[0] * 0.4) > 0.7 ? -0.08 : 0) };
M.ahg_alga_parda = { rampa: ['#0a0805', '#151008', '#21190c', '#2e2311', '#3c2e16', '#4b3a1c', '#5a4623'], ruido: 0.4, escala: 0.7, brillo: 0.45 };
M.ahg_bronce = { rampa: ['#0a1311', '#11201c', '#192f29', '#234036', '#305345', '#406855', '#567f68', '#72987f'], ruido: 0.35, escala: 0.3, brillo: 0.45, patron: (p) => { const v = ruido(p[0] * 0.18, p[1] * 0.18, p[2] * 0.5); return v > 0.64 ? -0.16 : v < 0.3 ? 0.06 : 0; } };
M.ahg_bronce_viejo = { rampa: ['#140e08', '#22180d', '#332413', '#46321a', '#5a4223', '#6e532d', '#83653a'], ruido: 0.3, escala: 0.3, brillo: 0.6 };
M.ahg_madera = { rampa: ['#0a0908', '#13110e', '#1d1a15', '#28231c', '#332d24', '#3f372c', '#4c4235', '#5a4f40'], ruido: 0.22, escala: 0.3, patron: tablas(5) };
M.ahg_madera_lisa = { rampa: ['#0a0908', '#13110e', '#1d1a15', '#28231c', '#332d24', '#3f372c', '#4c4235', '#5a4f40'], ruido: 0.25, escala: 0.25, patron: (p) => (ruido(p[0] * 0.15, p[1] * 0.15, p[2] * 0.9) - 0.5) * 0.25 };
M.ahg_agua = { rampa: ['#02070a', '#051015', '#09191f', '#0e242b', '#153138', '#1d3f46', '#284e55', '#3a6168'], ruido: 0.22, escala: 0.07, brillo: 1.1, patron: (p) => (Math.sin(p[0] * 0.5 + p[1] * 0.3 + ruido(p[0] * 0.1, p[1] * 0.1, 3) * 6) > 0.85 ? 0.08 : 0) };
M.ahg_espuma = { rampa: ['#2e3c3e', '#465859', '#617474', '#7e9090', '#9cacaa', '#bac8c4'], ruido: 0.55, escala: 0.6 };
M.ahg_bio = { rampa: ['#08403e', '#0e6660', '#18908a', '#38bcae', '#7ae2cc', '#c8fbec'], ruido: 0.35, escala: 0.35, emite: true };
M.ahg_bio_azul = { rampa: ['#0a1c48', '#123276', '#1e54a6', '#3a84d4', '#86c0f4', '#d6eeff'], ruido: 0.35, escala: 0.35, emite: true };
M.ahg_coral = { rampa: ['#29231d', '#433a30', '#605444', '#7e705b', '#9c8d74', '#b6a88d', '#ccc0a5'], ruido: 0.35, escala: 1.1, patron: (p) => (ruido(p[0] * 1.6, p[1] * 1.6, p[2] * 1.6) > 0.68 ? -0.18 : 0) };
M.ahg_concha = { rampa: ['#1e1819', '#362c2c', '#524441', '#705e58', '#8e7a72', '#ac978c', '#c6b2a6', '#dccbbf'], ruido: 0.2, escala: 0.4, brillo: 0.45 };
M.ahg_nacar = { rampa: ['#2e3540', '#4a5462', '#6a7684', '#8c98a4', '#aeb8c2', '#ccd4da', '#e6ecee'], ruido: 0.25, escala: 0.25, brillo: 1.0 };
M.ahg_vela = { rampa: ['#191714', '#2a2722', '#3d3931', '#524c41', '#686052', '#7e7564', '#948a77'], ruido: 0.3, escala: 0.35, patron: (p) => (ruido(p[0] * 0.08, p[1] * 0.08, p[2] * 0.08) > 0.64 ? -0.14 : 0) };
M.ahg_carne = { rampa: ['#111414', '#1e2423', '#2e3634', '#404946', '#545e59', '#69736c', '#7f8780', '#969c93'], ruido: 0.3, escala: 0.4, brillo: 0.35, patron: (p) => (ruido(p[0] * 0.4, p[1] * 0.4, p[2] * 0.4) > 0.66 ? -0.12 : 0) };
M.ahg_tentaculo = { rampa: ['#0a0609', '#150b11', '#22121b', '#311a27', '#412334', '#532e43', '#663a53', '#7c4964'], ruido: 0.25, escala: 0.35, brillo: 0.7, patron: (p) => (ruido(p[0] * 0.35, p[1] * 0.35, p[2] * 0.35) > 0.63 ? -0.14 : 0) };
M.ahg_ventosa = { rampa: ['#2a1e22', '#45333a', '#634c52', '#82676c', '#a08488', '#b9a0a2'], ruido: 0.2, escala: 0.6, brillo: 0.5 };
M.ahg_pez = { rampa: ['#10161a', '#1d262c', '#2d3940', '#3f4e56', '#54646c', '#6c7c83', '#87979b', '#a6b3b5'], ruido: 0.25, escala: 0.8, brillo: 0.9, patron: (p) => (Math.sin((p[0] + p[1]) * 2.2) > 0.4 ? -0.05 : 0) };
M.ahg_lodo = { rampa: ['#080908', '#10120f', '#191c16', '#22261e', '#2c3027', '#373b30'], ruido: 0.45, escala: 0.25, brillo: 0.4 };
M.ahg_arena = { rampa: ['#17150f', '#252117', '#342f21', '#443d2c', '#554c37', '#665c43'], ruido: 0.4, escala: 0.3 };
M.ahg_hierro = { rampa: ['#0d0a08', '#18120e', '#251b14', '#33251a', '#433020', '#553c28', '#684a31'], ruido: 0.55, escala: 0.45, brillo: 0.15 };
M.ahg_soga = { rampa: ['#17140d', '#282215', '#3a321f', '#4d432a', '#605436'], ruido: 0.4, escala: 0.9 };
M.ahg_vidrio = { rampa: ['#08141a', '#0f2430', '#1a3a46', '#2a5660', '#467a80', '#76a8a8'], ruido: 0.3, escala: 0.3, brillo: 0.8 };
M.ahg_luz = { rampa: ['#a0601c', '#d08a2a', '#f0b448', '#ffd884', '#fff2cc', '#fffbf0'], ruido: 0.25, escala: 0.3, emite: true };

const P = 'ahg_piedra', PL = 'ahg_piedra_lisa', W = 'ahg_madera', WL = 'ahg_madera_lisa', AG = 'ahg_agua', BR = 'ahg_bronce', HI = 'ahg_hierro';

// ------------------------------------------------------------------ ayudas
/** Azar fijo por número (igual en todos los cuadros). */
const hr = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const lat = (d: V3): V3 => nor(Math.abs(d[2]) > 0.9 ? cruz(d, [1, 0, 0]) : cruz(d, [0, 0, 1]));
/** Agua quieta en el piso: una mancha chata de bultos (el borde sale irregular). */
const charco = (a: Arma, rx: number, ry: number, o: { x?: number; y?: number; mat?: string; n?: number } = {}) => manto(a, rx, ry, o.n ?? 6, o.mat ?? AG, 0.7, { x: o.x, y: o.y, tono: 0 });
/** Anillos de onda en el agua: un aro de gotas chatas que se abre con el cuadro. */
function ondas(ps: Pieza[], c: V3, r0: number, f: number, n: number, k = 2, mat = 'ahg_espuma') {
  for (let j = 0; j < k; j++) {
    const u = ciclo(f + (j * n) / k, n), r = r0 * (0.3 + u * 1.1), m = Math.max(6, Math.round(r * 0.9));
    for (let i = 0; i < m; i++) { const an = (i / m) * TAU; ps.push({ k: 'elip', c: [c[0] + Math.cos(an) * r, c[1] + Math.sin(an) * r, c[2] + 0.3], ex: [Math.cos(an + PI / 2), Math.sin(an + PI / 2), 0], ey: [Math.cos(an), Math.sin(an), 0], ez: [0, 0, 1], r: [TAU * r / m * 0.55, 0.45, 0.3], mat, tono: -0.1 - u * 0.25 } as Pieza); }
  }
}
/** Racimo de percebes sobre una superficie (punto y normal): conos chatos con la boca más oscura. */
function percebes(a: Arma, ps: Pieza[], c: V3, n: V3, k: number, r: number, tam = 1) {
  const nn = nor(n), u = lat(nn), w = cruz(nn, u);
  for (let i = 0; i < k; i++) {
    const an = a.r() * TAU, d = Math.sqrt(a.r()) * r, b = add(add(c, u, Math.cos(an) * d), w, Math.sin(an) * d);
    const r0 = (0.8 + a.r() * 0.9) * tam, h = (1 + a.r() * 1.3) * tam, e = nor(add(nn, [jit(a, 0.3), jit(a, 0.3), jit(a, 0.3)]));
    ps.push(a.cilindro(...add(b, e, -0.4), r0, h, { mat: 'ahg_percebe', r1: r0 * 0.5, eje: e, tono: jit(a, 0.08) }));
  }
}
/** Hebra de alga que cuelga desde `p` (se mece con el cuadro): huesos que se afinan, sueltos en una masa. */
function alga(p: V3, largo: number, grueso: number, f: number, n: number, sem: number, o: { mat?: string; viento?: V3; tramos?: number; arriba?: boolean } = {}): Comp[] {
  const cs: Comp[] = [], N = o.tramos ?? 5, mat = o.mat ?? 'ahg_alga', ph = ciclo(f, n) * TAU;
  let q = p;
  for (let i = 0; i < N; i++) {
    const t = (i + 1) / N, sw = Math.sin(ph + sem * 2.3 + t * 2.4) * largo * 0.12 * t;
    const d: V3 = o.arriba
      ? [Math.sin(sem * 3 + t * 3) * 0.35 + sw * 0.08, Math.cos(sem * 2 + t * 2.6) * 0.35, 1]
      : [Math.sin(sem * 3 + t * 2) * 0.15 + (o.viento?.[0] ?? 0) * t, Math.cos(sem * 5 + t * 3) * 0.15 + (o.viento?.[1] ?? 0) * t + sw * 0.05, -1];
    const r = add(q, nor(d), largo / N);
    const pr: V3 = [r[0] + (o.arriba ? sw * 0.3 : sw * 0.2), r[1] + (o.arriba ? 0 : sw * 0.25), r[2]];
    cs.push(hueso(q, pr, grueso * (1 - (i / N) * 0.7), grueso * (1 - t * 0.7) + 0.15, { mat, tono: -0.03 * i }));
    q = pr;
  }
  return cs;
}
/** Varias hebras de alga desde puntos dados, juntas en una masa. */
function algas(bases: V3[], largo: number, grueso: number, f: number, n: number, sem: number, o: { mat?: string; arriba?: boolean } = {}): Pieza | null {
  if (!bases.length) return null;
  const cs: Comp[] = [];
  bases.forEach((b, i) => cs.push(...alga(b, largo * (0.6 + hr(sem + i) * 0.6), grueso, f, n, sem + i * 1.7, { mat: o.mat ?? (hr(sem * 3 + i) < 0.3 ? 'ahg_alga_parda' : 'ahg_alga'), arriba: o.arriba })));
  return masa(cs, { mat: o.mat ?? 'ahg_alga', suave: grueso * 0.6 });
}
/** Mancha de sal y algas sobre la piedra (bultos chatos pegados a la superficie). */
function costra(a: Arma, ps: Pieza[], c: V3, n: V3, r: number, mat = 'ahg_sal') {
  const nn = nor(n), u = lat(nn), w = cruz(nn, u), cs: Comp[] = [];
  for (let i = 0; i < 4; i++) { const an = a.r() * TAU, d = a.r() * r * 0.6; cs.push(bulto(add(add(c, u, Math.cos(an) * d), w, Math.sin(an) * d), [r * (0.35 + a.r() * 0.3), r * (0.3 + a.r() * 0.25), r * 0.12], { ejes: [u, w, nn], mat })); }
  ps.push(masa(cs, { mat, suave: r * 0.2 }));
}
/** Agrega a cada variante su gemela a lo largo de y (`<variante>_y`), con la huella girada. */
function dosEjes(d: ObjetoDef): ObjetoDef {
  const base = d.armar;
  return {
    ...d, variantes: [...d.variantes, ...d.variantes.map((v) => v + '_y')],
    armar: (v, f, a) => {
      if (!v.endsWith('_y')) return base(v, f, a);
      const r = base(v.slice(0, -2), f, a), m = rotM(90);
      if (Array.isArray(r)) return transformar(r, m);
      const e: Escena = { ...r, piezas: transformar(r.piezas, m) };
      if (r.resplandor) { const [x, y, z] = r.resplandor.c; e.resplandor = { ...r.resplandor, c: [-y, x, z] }; }
      return e;
    },
  };
}
/** Lleva un grupo de piezas: gira `giro` en la vertical, inclina `ix`/`iy` y mueve a `t`. */
const mover = (ps: Pieza[], giro: number, t: V3 = [0, 0, 0], ix = 0, iy = 0) => transformar(ps, rotM(giro, ix, iy), t);

// ------------------------------------------------------------------ casco de barco
interface OpcCasco {
  L: number; W: number; D: number;
  /** tramo que se arma, de -1 (popa) a 1 (proa) */
  u0: number; u1: number;
  /** dónde está la rotura (u) y hacia qué lado del tramo; las tablas faltan más cerca de ella */
  roto?: number; rotoLado?: 1 | -1; podrido?: number;
  secciones?: number; tracas?: number; cubierta?: boolean; costillas?: boolean;
}
/**
 * Casco de barco de tablas curvas: en cada sección la cuaderna es una U (quilla abajo, borda arriba) que se angosta
 * hacia la proa y sube en las puntas; las tablas son placas entre dos secciones y dos tracas, con su juego. Cerca de
 * la rotura faltan tablas y asoman las cuadernas.
 */
function casco(a: Arma, ps: Pieza[], o: OpcCasco) {
  const { L, W: AN, D } = o, ns = o.secciones ?? 9, nt = o.tracas ?? 5;
  const ancho = (u: number) => (u > 0 ? AN * Math.pow(Math.max(0, 1 - Math.pow(u, 2.4)), 0.55) : AN * (1 - 0.3 * u * u));
  const quilla = (u: number) => (u > 0.55 ? Math.pow((u - 0.55) / 0.45, 2) * D * 0.9 : u < -0.85 ? ((-0.85 - u) / 0.15) * D * 0.2 : 0);
  const borda = (u: number) => D + 7 * u * u + (u > 0.7 ? (u - 0.7) * 14 : 0);
  const pt = (u: number, s: number, fi: number, adentro = 0): V3 => {
    const w = Math.max(0.6, ancho(u) - adentro), k = quilla(u) + adentro * (1 - fi), h = borda(u) - k;
    return [u * L, s * w * Math.sin((fi * PI) / 2), k + h * (1 - Math.cos((fi * PI) / 2))];
  };
  const falta = (u: number) => {
    if (o.roto === undefined) return (o.podrido ?? 0) * 0.3;
    const d = ((u - o.roto) * (o.rotoLado ?? 1));
    return d < 0 ? 1 : Math.max((o.podrido ?? 0) * 0.3, 1 - d * 3.2);
  };
  const du = (o.u1 - o.u0) / ns;
  for (const s of [1, -1]) for (let i = 0; i < ns; i++) for (let j = 0; j < nt; j++) {
    const ua = o.u0 + i * du, ub = ua + du, uc = (ua + ub) / 2;
    if (a.r() < falta(uc) * (0.55 + 0.45 * (j / nt))) continue;
    const fa = j / nt + 0.012, fb = (j + 1) / nt - 0.012;
    // la tabla junto a la rotura queda corta y astillada
    const ub2 = o.roto !== undefined && falta(ub) > 0.6 ? ua + du * (0.3 + a.r() * 0.6) : ub;
    const q = [pt(ua, s, fa), pt(ub2, s, fa), pt(ub2, s, fb), pt(ua, s, fb)];
    const qi = [pt(ua, s, fa, 1.2), pt(ub2, s, fa, 1.2), pt(ub2, s, fb, 1.2), pt(ua, s, fb, 1.2)];
    ps.push(a.poliedro([...q, ...qi], { mat: W, tono: jit(a, 0.06) - (j < 2 ? 0.06 : 0) }));
  }
  // quilla y roda / codaste
  const kq: V3[] = [];
  for (let i = 0; i <= ns; i++) { const u = o.u0 + i * du; kq.push(pt(u, 1, 0, 0)); }
  for (let i = 0; i < ns; i++) ps.push(a.palo(add(kq[i], [0, 0, -0.6]), add(kq[i + 1], [0, 0, -0.6]), 1.6, { mat: WL, tono: -0.08 }));
  if (o.u1 > 0.97) { const b = pt(1, 1, 0), c = add(pt(1, 1, 1), [5, 0, 8]); ps.push(a.palo(b, mez(b, c, 0.5), 1.9, { mat: WL }), a.palo(mez(b, c, 0.5), c, 1.9, { mat: WL, r1: 1.4 })); }
  // cuadernas: las que quedan a la vista asoman más altas que la borda y rotas
  if (o.costillas !== false) for (let i = 0; i <= ns; i += 1) {
    const u = o.u0 + i * du;
    if (i % 2 && falta(u) < 0.5) continue;
    for (const s of [1, -1]) {
      const sube = falta(u) > 0.5 ? 1 + a.r() * 0.25 : 1, corte = falta(u) > 0.5 && a.r() < 0.5 ? 0.45 + a.r() * 0.4 : 1;
      let prev = pt(u, s, 0, 1.6);
      for (let k = 1; k <= 4; k++) {
        const fi = (k / 4) * corte, q = pt(u, s, fi, 1.6);
        if (k === 4 && sube > 1) q[2] += 6 * sube;
        ps.push(a.palo(prev, q, 1.2, { mat: WL, tono: -0.05 }));
        prev = q;
      }
    }
  }
  // regala (el borde de arriba)
  for (const s of [1, -1]) for (let i = 0; i < ns; i++) {
    const ua = o.u0 + i * du, ub = ua + du;
    if (falta((ua + ub) / 2) > 0.45) continue;
    ps.push(a.palo(add(pt(ua, s, 1), [0, 0, 0.6]), add(pt(ub, s, 1), [0, 0, 0.6]), 1.1, { mat: WL, tono: 0.04 }));
  }
  if (o.cubierta) for (let i = 0; i < ns; i++) {
    const ua = o.u0 + i * du, ub = ua + du;
    if (falta((ua + ub) / 2) > 0.5) continue;
    const h = Math.min(borda(ua), borda(ub)) - 4, w = Math.min(ancho(ua), ancho(ub)) - 1.5;
    ps.push(a.caja(((ua + ub) / 2) * L, 0, h, du * L + 0.2, w * 2, 1.2, { mat: W, tono: jit(a, 0.04) }));
  }
  return { pt, ancho, borda, quilla };
}
/** Mástil con verga, cofa y jarcia; `vela` le cuelga una vela raída que se mueve. */
function mastil(a: Arma, ps: Pieza[], base: V3, alto: number, r: number, o: { roto?: number; verga?: boolean; cofa?: boolean; vela?: boolean; f?: number; n?: number } = {}) {
  const top = add(base, [0, 0, alto * (o.roto ?? 1)]);
  ps.push(a.cilindro(...base, r, alto * (o.roto ?? 1), { mat: WL, r1: r * 0.75 }));
  if (o.roto !== undefined && o.roto < 1) { for (let i = 0; i < 4; i++) { const an = a.r() * TAU; ps.push(a.poliedro([add(top, [Math.cos(an) * r * 0.8, Math.sin(an) * r * 0.8, -1]), add(top, [Math.cos(an + 1) * r * 0.8, Math.sin(an + 1) * r * 0.8, -1]), add(top, [Math.cos(an + 0.5) * r * 0.3, Math.sin(an + 0.5) * r * 0.3, 3 + a.r() * 7])], { mat: WL, tono: 0.05 })); } }
  const hv = alto * 0.78;
  if (o.verga && (o.roto ?? 1) * alto > hv) {
    const c = add(base, [0, 0, hv]), g = jit(a, 14), d: V3 = [Math.sin(rad(g)), Math.cos(rad(g)), Math.sin(rad(jit(a, 10)))];
    ps.push(a.palo(add(c, d, -alto * 0.36), add(c, d, alto * 0.36), r * 0.55, { mat: WL, r1: r * 0.45 }));
    if (o.vela) tela(a, ps, { p0: add(add(c, d, -alto * 0.3), [r * 0.7, 0, -1]), u: d, ancho: alto * 0.6, alto: alto * 0.5, f: o.f ?? 0, n: o.n ?? 8, mat: 'ahg_vela', jirones: 0.7, nu: 5, nv: 6, amp: 2.5, viento: 0.4 });
  }
  if (o.cofa && (o.roto ?? 1) * alto > alto * 0.6) { const c = add(base, [0, 0, alto * 0.6]); ps.push(a.cilindro(...c, r * 3.2, 4, { mat: W, r1: r * 3.6 }), a.cilindro(...add(c, [0, 0, 3.6]), r * 2.6, 1, { mat: 'negro' })); }
  return top;
}

// ------------------------------------------------------------------ campana de bronce
/**
 * Campana: perfil de bronce (corona, hombro, cintura y labio que se abre) como una masa de huesos a lo largo del eje,
 * hueca por dentro, con el asa arriba, el badajo y la pátina verde. `c` es el centro de la boca; `arriba` va de la
 * boca a la corona. `raja` le abre una grieta.
 */
function campana(a: Arma, ps: Pieza[], c: V3, arriba: V3, R: number, o: { mat?: string; raja?: boolean; badajo?: V3; percebes?: number } = {}) {
  const up = nor(arriba), u = lat(up), w = cruz(up, u), mat = o.mat ?? BR, H = R * 1.25;
  const A = (t: number): V3 => add(c, up, t * H);
  const cs: Comp[] = [
    hueso(A(0.02), A(0.1), R * 0.98, R * 0.86, { mat }), hueso(A(0.1), A(0.35), R * 0.86, R * 0.68, { mat }), hueso(A(0.35), A(0.72), R * 0.68, R * 0.6, { mat }),
    hueso(A(0.72), A(0.86), R * 0.6, R * 0.5, { mat }), bulto(A(0.86), [R * 0.5, R * 0.5, R * 0.22], { ejes: [u, w, up], mat }),
  ];
  ps.push(masa(cs, { mat, suave: R * 0.12 }));
  // el anillo del labio, más grueso y claro
  ps.push(a.cilindro(...add(c, up, -0.2), R * 1.02, H * 0.1, { mat, r1: R * 0.9, eje: up, tono: 0.05 }));
  // hueca: cava la masa y el anillo
  ps.push(a.cilindro(...add(c, up, -1), R * 0.86, H * 0.8, { mat: 'negro', r1: R * 0.45, eje: up, resta: true }));
  ps.push(a.cilindro(...add(c, up, H * 0.3), R * 0.5, H * 0.5, { mat: 'negro', r1: R * 0.3, eje: up }));
  // franjas en relieve (inscripciones) y el asa
  for (const t of [0.3, 0.68]) ps.push(a.cilindro(...A(t), R * (t < 0.5 ? 0.72 : 0.62), H * 0.035, { mat, eje: up, tono: 0.08 }));
  const top = A(0.93);
  ps.push({ k: 'elip', c: add(top, up, R * 0.22), ex: u, ey: up, ez: w, r: [R * 0.24, R * 0.26, R * 0.09], mat } as Pieza);
  ps.push({ k: 'elip', c: add(top, up, R * 0.22), ex: u, ey: up, ez: w, r: [R * 0.13, R * 0.15, R * 0.2], mat: 'negro', resta: true } as Pieza);
  if (o.badajo) ps.push(a.palo(A(0.7), o.badajo, R * 0.07, { mat: HI }), a.esfera(...o.badajo, R * 0.17, { mat: HI }));
  if (o.raja) {
    // grieta que sube del labio en zigzag
    let p = add(add(c, u, R * 0.98), up, 0.2);
    for (let i = 0; i < 4; i++) { const q = add(add(add(c, up, H * (i + 1) * 0.15), u, R * (0.9 - i * 0.07)), w, (i % 2 ? 1 : -1) * R * 0.08); ps.push(a.palo(p, q, R * 0.05 + 0.3, { mat: 'negro', resta: false })); p = q; }
  }
  if (o.percebes) for (let i = 0; i < o.percebes; i++) { const an = a.r() * TAU, t = 0.1 + a.r() * 0.6, rr = R * (0.95 - t * 0.38); const pp = add(add(A(t), u, Math.cos(an) * rr), w, Math.sin(an) * rr); percebes(a, ps, pp, add(esc(add(esc(u, Math.cos(an)), w, Math.sin(an)), 1), up, 0.3), 3, R * 0.15, R * 0.06); }
}

// ------------------------------------------------------------------ figura de piedra (santos y estatuas)
interface Pose { pel: V3; pecho: V3; cab: V3; hom: [V3, V3]; codo: [V3, V3]; mano: [V3, V3]; rod: [V3, V3]; pie: [V3, V3]; tunica?: number }
/**
 * Figura humana de masa (estatua): torso, cabeza, brazos y piernas que se funden, con una túnica que cae de la
 * cintura. La pose da las articulaciones en un marco mirando a +x; `s` escala (1 = persona de 61).
 */
function figura(p: Pose, mat: string, s = 1, o: { capucha?: boolean; sinCabeza?: boolean; manto?: string } = {}): Pieza[] {
  const S = (v: V3): V3 => esc(v, s), cs: Comp[] = [], m = { mat };
  const pel = S(p.pel), pe = S(p.pecho), cab = S(p.cab);
  cs.push(bulto(pel, [6 * s, 7.5 * s, 5 * s], m), hueso(pel, pe, 6.5 * s, 7.5 * s, m), bulto(pe, [5.5 * s, 9 * s, 6.5 * s], m));
  if (!o.sinCabeza) {
    cs.push(hueso(pe, mez(pe, cab, 0.6), 2.6 * s, 2.3 * s, m), bulto(cab, [3.9 * s, 3.4 * s, 4.4 * s], { ...m, eje: sub(cab, pe) }));
    if (o.capucha) cs.push(bulto(add(cab, sub(pe, cab), 0.08), [5.2 * s, 5 * s, 5.6 * s], { mat: o.manto ?? mat, eje: sub(cab, pe) }));
  } else cs.push(hueso(pe, mez(pe, cab, 0.35), 2.8 * s, 2.4 * s, m));
  for (const i of [0, 1]) {
    const h = S(p.hom[i]), c = S(p.codo[i]), mn = S(p.mano[i]);
    cs.push(bulto(h, [3.3 * s, 3.3 * s, 3.3 * s], m), hueso(h, c, 2.6 * s, 2.1 * s, m), hueso(c, mn, 2.1 * s, 1.6 * s, m), bulto(add(mn, nor(sub(mn, c)), 1.4 * s), [2.2 * s, 1.2 * s, 1.6 * s], { ...m, eje: sub(mn, c) }));
    const r = S(p.rod[i]), pi = S(p.pie[i]), cad = add(pel, [0, (i ? 1 : -1) * 4 * s, -1.5 * s]);
    cs.push(hueso(cad, r, 3.6 * s, 2.7 * s, m), hueso(r, pi, 2.6 * s, 1.8 * s, m), bulto(add(pi, [2 * s, 0, -0.6 * s]), [3.4 * s, 1.6 * s, 1.2 * s], m));
  }
  const ps: Pieza[] = [];
  // túnica: un faldón de bultos que cae de la cintura hasta las rodillas y se abre
  const tu = p.tunica ?? 1, tm = o.manto ?? mat;
  if (tu > 0) {
    const r0 = S(p.rod[0]), r1 = S(p.rod[1]), bajo = mez(r0, r1, 0.5), cint = mez(pel, pe, 0.15);
    cs.push(hueso(cint, mez(cint, bajo, 0.55), 7.5 * s, 9 * s, { mat: tm }), hueso(mez(cint, bajo, 0.5), add(bajo, [0, 0, -bajo[2] * 0.85 * tu]), 9 * s, 10.5 * s * tu + 1, { mat: tm }));
  }
  ps.push(masa(cs, { mat, suave: 1.6 * s }));
  return ps;
}
const POSES: Record<string, Pose> = {
  orante: { pel: [0, 0, 33], pecho: [0.5, 0, 46], cab: [1, 0, 55.5], hom: [[0, -8, 49], [0, 8, 49]], codo: [[3, -9, 39], [3, 9, 39]], mano: [[8, -1, 45], [8, 1, 45]], rod: [[1, -4, 18], [1, 4, 18]], pie: [[0, -4, 1.5], [0, 4, 1.5]] },
  libro: { pel: [0, 0, 33], pecho: [0.5, 0, 46], cab: [1.5, 0, 55.5], hom: [[0, -8, 49], [0, 8, 49]], codo: [[3, -9, 38], [3, 9, 38]], mano: [[9, -4, 41], [9, 4, 41]], rod: [[1, -4, 18], [1, 4, 18]], pie: [[0, -4, 1.5], [0, 4, 1.5]] },
  bendice: { pel: [0, 0, 33], pecho: [0.5, 0, 46], cab: [1, 0, 55.5], hom: [[0, -8, 49], [0, 8, 49]], codo: [[3, -10, 38], [5, 10, 45]], mano: [[6, -6, 32], [9, 8, 56]], rod: [[1, -4, 18], [1, 4, 18]], pie: [[0, -4, 1.5], [0, 4, 1.5]] },
  llave: { pel: [0, 0, 33], pecho: [0.5, 0, 46], cab: [1, 0, 55.5], hom: [[0, -8, 49], [0, 8, 49]], codo: [[2, -10, 38], [3, 10, 38]], mano: [[8, -9, 45], [6, 6, 30]], rod: [[1, -4, 18], [1, 4, 18]], pie: [[0, -4, 1.5], [0, 4, 1.5]] },
};

// ------------------------------------------------------------------ 1. barcos partidos, mástiles, anclas, cadenas y redes
registrar(
  {
    id: 'ahg_proa_naufragada', nombre: ['Proa naufragada', 'Wrecked bow'], tema: TEMA, variantes: ['hundida', 'alzada', 'escorada', 'con_mascaron'], huella: [5, 3], bloquea: true,
    armar: (v, _f, a) => {
      const loc: Pieza[] = [];
      const k = casco(a, loc, { L: 62, W: 15, D: 22, u0: -0.15, u1: 1, roto: 0.1 + a.r() * 0.1, rotoLado: 1, podrido: 0.3 + a.r() * 0.3, cubierta: true });
      // bauprés roto y la jarcia que cuelga
      const roda = add(k.pt(1, 1, 1), [5, 0, 8]);
      if (a.r() < 0.7) loc.push(a.palo(roda, add(roda, [22 + a.r() * 10, jit(a, 3), 9]), 1.4, { mat: WL, r1: 0.9 }));
      if (v === 'con_mascaron') {
        // mascarón de proa: una mujer de madera que se inclina sobre el agua, comida por la sal
        const fig = figura({ ...POSES.orante, mano: [[6, -6, 46], [6, 6, 46]], tunica: 1.2 }, WL, 0.48, { capucha: false });
        loc.push(...transformar(fig, rotM(0, 0, -55), add(k.pt(1, 1, 0.75), [2, 0, -2])));
      }
      // algas en la borda y percebes en el pantoque
      const ag = algas(Array.from({ length: 5 }, () => k.pt(0.2 + a.r() * 0.6, elegir(a, [1, -1]), 0.98)), 10, 0.7, 0, 1, a.seed);
      if (ag) loc.push(ag);
      for (let i = 0; i < 4; i++) { const u = 0.15 + a.r() * 0.7, s = elegir(a, [1, -1]), q = k.pt(u, s, 0.35 + a.r() * 0.3); percebes(a, loc, q, [0, s, -0.3], 4, 3.5); }
      const g = jit(a, 12);
      const [ix, iy, dz] = v === 'alzada' ? [jit(a, 5), -18 - a.r() * 6, -9] : v === 'escorada' ? [28 + a.r() * 10, -6, -7] : [jit(a, 6), -4 - a.r() * 3, -11];
      const ps = mover(loc, g, [-12, 0, dz], ix, iy);
      ps.push(charco(a, 46, 24, { x: -4 }), suelo(a));
      return ps;
    },
  },
  {
    id: 'ahg_popa_naufragada', nombre: ['Popa naufragada', 'Wrecked stern'], tema: TEMA, variantes: ['recta', 'escorada', 'podrida', 'con_farol'], huella: [5, 3], bloquea: true,
    armar: (v, _f, a) => {
      const loc: Pieza[] = [];
      const k = casco(a, loc, { L: 60, W: 17, D: 24, u0: -1, u1: 0.2, roto: 0.05 - a.r() * 0.1, rotoLado: -1, podrido: v === 'podrida' ? 0.9 : 0.25, cubierta: true });
      // castillo de popa: cuarto de tablas con ventanas y el espejo de popa con la galería
      const x0 = -60, h = k.borda(-1);
      loc.push(a.caja(x0 + 17, 0, h - 4, 30, 30, 16, { mat: W }), a.caja(x0 + 17, 0, h + 12, 32, 33, 1.5, { mat: W, tono: 0.05 }));
      for (const y of [-8, 0, 8]) loc.push(a.caja(x0 + 1.5, y, h + 1, 3, 4, 6, { mat: v === 'con_farol' ? 'ahg_luz' : 'negro' }));
      for (const s of [1, -1]) loc.push(a.caja(x0 + 17, s * 15, h + 2, 6, 3, 5, { mat: 'negro' }));
      loc.push(a.caja(x0 + 1, 0, h - 10, 2, 32, 4, { mat: WL, tono: 0.06 }));
      // timón colgando de los goznes
      loc.push(a.caja(x0 - 2, 0, 0, 3, 2, h - 2, { mat: WL, tono: -0.05, incl: 6, inclEje: 'y' }), a.caja(x0 - 6, 0, 2, 9, 1.8, 18, { mat: W }));
      if (v === 'con_farol') { loc.push(a.palo([x0 + 2, 0, h + 13], [x0 - 6, 0, h + 20], 0.6, { mat: HI }), a.cilindro(x0 - 6, 0, h + 13, 2.2, 6, { mat: 'ahg_luz' }), a.cilindro(x0 - 6, 0, h + 19, 2.6, 1.6, { mat: HI, r1: 0.6 })); }
      mastil(a, loc, [x0 + 30, 0, h - 4], 60, 2.2, { roto: 0.3 + a.r() * 0.3 });
      for (let i = 0; i < 4; i++) { const u = -0.9 + a.r() * 0.8, s = elegir(a, [1, -1]); percebes(a, loc, k.pt(u, s, 0.3 + a.r() * 0.3), [0, s, -0.3], 4, 3.5); }
      const ag = algas(Array.from({ length: 6 }, () => k.pt(-0.9 + a.r() * 0.9, elegir(a, [1, -1]), 0.98)), 12, 0.7, 0, 1, a.seed + 3);
      if (ag) loc.push(ag);
      const [ix, iy] = v === 'escorada' ? [-24 - a.r() * 8, 4] : [jit(a, 5), 3 + a.r() * 3];
      const ps = mover(loc, jit(a, 10), [24, 0, -9], ix, iy);
      ps.push(charco(a, 48, 26, { x: 6 }), suelo(a));
      return v === 'con_farol' ? { piezas: ps, resplandor: { c: [-34, 0, 30], r: 34, color: '#e0a040' } } : ps;
    },
  },
  {
    id: 'ahg_costillar_barco', nombre: ['Costillar de barco', 'Ship skeleton'], tema: TEMA, variantes: ['corto', 'largo', 'medio_hundido', 'volcado'], huella: [6, 3], bloquea: true,
    armar: (v, _f, a) => {
      const loc: Pieza[] = [];
      const L = v === 'corto' ? 44 : 64;
      casco(a, loc, { L, W: 15, D: 20, u0: -0.85, u1: 0.95, podrido: 2.6, secciones: 10 });
      const ag = algas(Array.from({ length: 6 }, () => [jit(a, L * 0.8), elegir(a, [-13, 13]), 18 + a.r() * 4] as V3), 12, 0.6, 0, 1, a.seed);
      if (ag) loc.push(ag);
      const ps = v === 'volcado' ? mover(loc, jit(a, 10), [0, 0, 20], 180 + jit(a, 8), jit(a, 4)) : mover(loc, jit(a, 15), [0, 0, v === 'medio_hundido' ? -9 : -3], jit(a, 8), jit(a, 4));
      ps.push(charco(a, L * 0.8, 22), suelo(a));
      for (let i = 0; i < 3; i++) ps.push(a.caja(jit(a, L * 0.7), jit(a, 22), 0.5, 10 + a.r() * 10, 3, 1.1, { mat: W, giro: a.r() * 180 }));
      return ps;
    },
  },
  {
    id: 'ahg_mastil_roto', nombre: ['Mástil roto', 'Broken mast'], tema: TEMA, variantes: ['alto', 'partido', 'con_vela', 'con_cofa'], cuadros: 8, t: 4, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], ix = jit(a, 7), iy = jit(a, 7);
      const loc: Pieza[] = [];
      const alto = v === 'partido' ? 70 : 105 + a.r() * 20;
      const top = mastil(a, loc, [0, 0, 0], alto, 3.2, { roto: v === 'partido' ? 0.55 + a.r() * 0.2 : 1, verga: true, cofa: v === 'con_cofa' || v === 'alto', vela: v === 'con_vela', f, n: 8 });
      // obenques: sogas del tope al piso, alguna suelta y colgando
      for (let i = 0; i < 3; i++) { const an = a.r() * TAU, pie: V3 = [Math.cos(an) * 26, Math.sin(an) * 26, 0.5]; const pts = catenaria(add(top, [0, 0, -alto * 0.15]), pie, 4 + a.r() * 6, 6); for (let j = 0; j < pts.length - 1; j++) loc.push(a.palo(pts[j], pts[j + 1], 0.45, { mat: 'ahg_soga' })); }
      const ag = algas([[0, 0, alto * 0.75], [0, 0, alto * 0.5]], 14, 0.8, f, 8, a.seed);
      if (ag) loc.push(ag);
      percebes(a, loc, [3, 0, 8], [1, 0, 0], 6, 4); percebes(a, loc, [-2, 2, 14], [-0.6, 0.8, 0], 4, 3);
      ps.push(...mover(loc, a.r() * 360, [0, 0, -3], ix, iy));
      ps.push(roca(a, [0, 0, 0], [9, 8, 4], { mat: 'ahg_roca', facetas: 2 })[0], charco(a, 22, 18), suelo(a));
      return ps;
    },
  },
  {
    id: 'ahg_mastil_caido', nombre: ['Mástil caído', 'Fallen mast'], tema: TEMA, variantes: ['x', 'con_verga', 'con_cofa'], huella: [6, 2], bloquea: true,
    armar: (v, _f, a) => {
      const loc: Pieza[] = [];
      const L = 90 + a.r() * 20;
      loc.push(a.cilindro(-L / 2, 0, 3.2, 3.4, L, { mat: WL, r1: 2.4, eje: [1, 0, 0] }));
      // punta astillada
      for (let i = 0; i < 4; i++) { const an = a.r() * TAU; loc.push(a.poliedro([[-L / 2, Math.cos(an) * 2.6, 3.2 + Math.sin(an) * 2.6], [-L / 2, Math.cos(an + 1.1) * 2.6, 3.2 + Math.sin(an + 1.1) * 2.6], [-L / 2 - 4 - a.r() * 6, Math.cos(an + 0.5) * 1.2, 3.2 + Math.sin(an + 0.5) * 1.2]], { mat: WL, tono: 0.06 })); }
      if (v !== 'x') { const x = jit(a, 10) + 10, g = 60 + jit(a, 20); loc.push(a.palo([x - Math.cos(rad(g)) * 38, -Math.sin(rad(g)) * 38, 2], [x + Math.cos(rad(g)) * 38, Math.sin(rad(g)) * 38, 4.8], 1.8, { mat: WL, r1: 1.3 })); }
      if (v === 'con_cofa') loc.push(a.cilindro(L * 0.12, 0, 0.2, 7, 4, { mat: W, eje: [0.2, 0.3, 0.9], r1: 8 }));
      const sogas: Comp[] = [];
      for (let i = 0; i < 3; i++) { const x = jit(a, L * 0.4); sogas.push(...alga([x, 2.5, 6], 9, 0.5, 0, 1, a.seed + i, { mat: 'ahg_soga', viento: [jit(a, 1), 2, 0] })); }
      loc.push(masa(sogas, { mat: 'ahg_soga', suave: 0.5 }));
      for (let i = 0; i < 4; i++) percebes(a, loc, [jit(a, L * 0.4), 2.4, 4], [0, 1, 0.3], 4, 3);
      const ag = algas(Array.from({ length: 4 }, () => [jit(a, L * 0.4), -2, 6.6] as V3), 9, 0.7, 0, 1, a.seed, { arriba: false });
      if (ag) loc.push(ag);
      const ps = mover(loc, jit(a, 8), [0, 0, -1.2]);
      ps.push(charco(a, L * 0.4, 14, { x: jit(a, 10) }), suelo(a));
      return ps;
    },
  },
  {
    id: 'ahg_ancla', nombre: ['Ancla gigante', 'Giant anchor'], tema: TEMA, variantes: ['clavada', 'tumbada', 'erguida', 'con_cadena'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const loc: Pieza[] = [], H = 74 + a.r() * 14;
      // caña, cepo, arganeo y los brazos curvos con las uñas
      loc.push(a.cilindro(0, 0, 0, 3.6, H, { mat: HI, r1: 3 }));
      loc.push(a.palo([0, -24, H - 10], [0, 24, H - 10], 2.6, { mat: HI }), a.esfera(0, -24.5, H - 10, 3.2, { mat: HI }), a.esfera(0, 24.5, H - 10, 3.2, { mat: HI }));
      loc.push({ k: 'elip', c: [0, 0, H + 5], ex: [0, 0, 1], ey: [1, 0, 0], ez: [0, 1, 0], r: [6.5, 6.5, 1.8], mat: HI } as Pieza, { k: 'elip', c: [0, 0, H + 5], ex: [0, 0, 1], ey: [1, 0, 0], ez: [0, 1, 0], r: [4, 4, 3], mat: HI, resta: true } as Pieza);
      const cs: Comp[] = [bulto([0, 0, 2], [5, 5, 5], { mat: HI })];
      for (const s of [1, -1]) {
        let prev: V3 = [0, 0, 2];
        for (let i = 1; i <= 5; i++) { const an = (i / 5) * 1.15, q: V3 = [s * Math.sin(an) * 30, 0, 30 - Math.cos(an) * 28]; cs.push(hueso(prev, q, 3.6 - i * 0.25, 3.4 - i * 0.3, { mat: HI })); prev = q; }
        // uña: pala triangular que mira afuera
        const t = prev, d: V3 = [s * 0.45, 0, 1];
        loc.push(a.poliedro([add(t, [s * 3, -7, -9]), add(t, [s * 3, 7, -9]), add(t, [s * 2, 0, 9]), add(t, [s * 0.5, -5, -3]), add(t, [s * 0.5, 5, -3]), add(t, esc(nor(d), 6))], { mat: HI, tono: 0.03 }));
      }
      loc.push(masa(cs, { mat: HI, suave: 2.5 }));
      for (let i = 0; i < 5; i++) percebes(a, loc, [jit(a, 4), elegir(a, [-3.5, 3.5]), 6 + a.r() * H * 0.5], [0, 1, 0], 4, 3);
      const ag = algas([[0, -20, H - 12], [0, 15, H - 12], [3, 0, H * 0.6]], 13, 0.8, 0, 1, a.seed);
      if (ag) loc.push(ag);
      let ps: Pieza[];
      if (v === 'tumbada') ps = mover(loc, a.r() * 360, [0, 0, 4], 0, 88);
      else if (v === 'clavada') ps = mover(loc, a.r() * 360, [0, 0, -16], jit(a, 14), 12 + a.r() * 10);
      else ps = mover(loc, a.r() * 360, [0, 0, v === 'con_cadena' ? -6 : -3], jit(a, 5), jit(a, 5));
      if (v === 'con_cadena') { const pts: V3[] = [[0, 0, H], [10, 8, H * 0.5], [20, 14, 2], [28, 2, 1.5], [20, -10, 1.5], [6, -14, 1.5]]; cadena(a, ps, pts, 6, 1.6, HI); }
      ps.push(charco(a, 30, 26), suelo(a));
      return ps;
    },
  },
  {
    id: 'ahg_cadena_ancla', nombre: ['Cadena de ancla', 'Anchor chain'], tema: TEMA, variantes: ['tendida', 'montón', 'que_sube', 'enredada'], huella: [4, 2], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      let pts: V3[];
      if (v === 'montón') { pts = []; for (let i = 0; i < 30; i++) { const an = i * 0.9 + a.r() * 0.3, r = 12 - i * 0.3; pts.push([Math.cos(an) * r, Math.sin(an) * r, 2 + i * 0.32]); } }
      else if (v === 'que_sube') pts = [[-34, jit(a, 6), 1.5], [-12, jit(a, 8), 1.5], [8, jit(a, 6), 2], [22, 0, 18], [30, 0, 52], [33, 0, 90]];
      else { pts = []; for (let i = 0; i <= 8; i++) pts.push([-36 + i * 9, Math.sin(i * 1.2 + a.r()) * 7, 1.6]); }
      cadena(a, ps, pts, 6.5, 1.7, HI);
      if (v === 'enredada') { const ag = algas(pts.filter((_, i) => i % 2 === 0).map((p) => add(p, [0, 0, 1])), 12, 0.8, 0, 1, a.seed, { arriba: true, mat: 'ahg_alga_parda' }); if (ag) ps.push(ag); }
      for (let i = 0; i < 3; i++) { const p = pts[Math.floor(a.r() * pts.length)]; percebes(a, ps, p, [0, 0, 1], 3, 2.5); }
      ps.push(charco(a, 30, 16), suelo(a));
      return ps;
    },
  },
  {
    id: 'ahg_red_huesos', nombre: ['Red con huesos', 'Net of bones'], tema: TEMA, variantes: ['colgada', 'tendida', 'en_poste', 'llena'], cuadros: 8, t: 5, huella: [3, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], n = 7, m = 7;
      const colgada = v === 'colgada' || v === 'llena';
      // los postes de donde cuelga
      if (colgada) for (const y of [-20, 20]) { ps.push(a.cilindro(0, y, 0, 1.6, 52, { mat: WL, r1: 1.2, incl: jit(a, 5) })); ps.push(a.esfera(0, y, 52, 1.7, { mat: WL })); }
      if (v === 'en_poste') ps.push(a.cilindro(0, 0, 0, 1.8, 58, { mat: WL, r1: 1.3 }), a.palo([0, -18, 54], [0, 18, 54], 1.1, { mat: WL }));
      const sway = onda(f, 8, a.r() * 3) * 1.4;
      const N = (i: number, j: number): V3 => {
        const u = i / n, w = j / m;
        if (colgada) { const bolsa = Math.sin(u * PI) * (v === 'llena' ? 14 : 9) * w; return [bolsa * 0.7 + sway * w, -20 + u * 40, 51 - w * 36 - Math.sin(u * PI) * 6 * w - bolsa * 0.6]; }
        if (v === 'en_poste') return [1.5 + Math.sin(u * PI) * 3 * w + sway * w, -18 + u * 36 + (u - 0.5) * w * 8, 53 - w * 46];
        const x = -24 + u * 48, y = -16 + w * 32; return [x, y, 1 + Math.max(0, 7 - Math.hypot(x * 0.5, y * 0.6)) * 1.2 + ruido(x * 0.2, y * 0.2, a.seed) * 3];
      };
      for (let i = 0; i <= n; i++) for (let j = 0; j <= m; j++) {
        if (i < n && !(j > 0 && a.r() < 0.08)) ps.push(a.palo(N(i, j), N(i + 1, j), 0.38, { mat: 'ahg_soga', tono: -0.04 }));
        if (j < m && a.r() > 0.06) ps.push(a.palo(N(i, j), N(i, j + 1), 0.38, { mat: 'ahg_soga' }));
      }
      // corchos de flotador en la relinga y lo que atrapó: huesos, cráneos y un pez muerto
      for (let i = 0; i <= n; i += 2) ps.push(a.elipsoide(...N(i, 0), 1.8, 1.8, 1.3, { mat: 'ahg_madera_lisa', tono: 0.1 }));
      const caz = v === 'llena' ? 5 : 3;
      for (let k = 0; k < caz; k++) {
        const i = 1 + Math.floor(a.r() * (n - 2)), j = colgada ? m - 1 - Math.floor(a.r() * 2) : 1 + Math.floor(a.r() * (m - 2)), c = add(N(i, j), colgada ? [-1, 0, 2] : [0, 0, 1.5]);
        if (k % 3 === 0) craneo(a, ps, c, 3.3, a.r() * 360, { incl: jit(a, 30) });
        else if (k % 3 === 1) huesoLargo(ps, add(c, [0, -5, 0]), add(c, [jit(a, 3), 5, jit(a, 3)]), 1.2);
        else ps.push(a.elipsoide(c[0], c[1], c[2], 5, 1.6, 2.2, { mat: 'ahg_pez', giro: a.r() * 180 }));
      }
      const ag = algas([N(2, 2), N(5, 3), N(3, 5)], 7, 0.5, f, 8, a.seed);
      if (ag && colgada) ps.push(ag);
      if (!colgada && v !== 'en_poste') ps.push(charco(a, 26, 18));
      return ps;
    },
  },
);

// ------------------------------------------------------------------ 2. campanas
registrar(
  {
    id: 'ahg_campana_caida', nombre: ['Campana caída', 'Fallen bell'], tema: TEMA, variantes: ['tumbada', 'boca_arriba', 'rajada', 'semienterrada', 'chica'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], R = v === 'chica' ? 10 : 17 + a.r() * 5, g = a.r() * 360;
      const d: V3 = [Math.cos(rad(g)), Math.sin(rad(g)), 0];
      if (v === 'boca_arriba') campana(a, ps, [0, 0, R * 1.25 + 1], [d[0] * 0.25, d[1] * 0.25, -1], R, { percebes: 3 });
      else if (v === 'semienterrada') campana(a, ps, add(esc(d, -R * 0.4), [0, 0, -R * 0.3]), add(d, [0, 0, 0.9]), R, { percebes: 3, raja: a.r() < 0.5 });
      else {
        // tumbada de costado: el labio apoya en el piso
        const up = nor(add(d, [0, 0, 0.12]));
        campana(a, ps, add(esc(d, -R * 0.6), [0, 0, R * 0.98]), up, R, { raja: v === 'rajada', percebes: 4, badajo: add(esc(d, -R * 0.9), [0, 0, R * 0.35]) });
      }
      if (v === 'rajada') for (let i = 0; i < 4; i++) { const c: V3 = [jit(a, R * 1.5), jit(a, R * 1.5), 0.4], g2 = a.r() * TAU; ps.push(a.poliedro([c, add(c, [Math.cos(g2) * 6, Math.sin(g2) * 6, 0]), add(c, [Math.cos(g2 + 1.2) * 5, Math.sin(g2 + 1.2) * 5, 0.3]), add(c, [Math.cos(g2 + 0.6) * 3, Math.sin(g2 + 0.6) * 3, 2.2])], { mat: BR, tono: 0.04 })); }
      const ag = algas([[jit(a, R), jit(a, R), R * 1.4], [jit(a, R), jit(a, R), R]], 8, 0.6, 0, 1, a.seed, { arriba: true });
      if (ag && v !== 'boca_arriba') ps.push(ag);
      ps.push(charco(a, R * 1.8, R * 1.5), suelo(a));
      return ps;
    },
  },
  {
    id: 'ahg_campana_colgante', nombre: ['Campana que se mece', 'Swinging bell'], tema: TEMA, variantes: ['horca', 'arco', 'doble', 'mastil'], cuadros: 8, t: 4, huella: [3, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const H = v === 'arco' ? 74 : 66;
      if (v === 'arco') {
        // arco gótico de piedra mojada con percebes
        for (const y of [-22, 22]) { ps.push(a.caja(0, y, 0, 10, 8, H - 10, { mat: P })); percebes(a, ps, [5, y, 6], [1, 0, 0], 6, 4); }
        for (let i = 0; i <= 8; i++) { const t = i / 8, an = t * PI, y = -Math.cos(an) * 22, z = H - 10 + Math.sin(an) * 16 + (t > 0.3 && t < 0.7 ? 4 * Math.sin((t - 0.3) / 0.4 * PI) : 0); ps.push(a.caja(0, y, z - 1, 10, 7, 7, { mat: P, giro: 0, tono: jit(a, 0.05) })); }
      } else if (v === 'mastil') {
        ps.push(a.cilindro(-6, 0, 0, 2.6, H + 8, { mat: WL, r1: 2 }), a.palo([-6, 0, H + 2], [18, 0, H + 2], 1.4, { mat: WL }), a.palo([-6, 0, H - 14], [10, 0, H + 2], 0.9, { mat: WL }));
      } else {
        const ys = v === 'doble' ? [-30, 30] : [-22, 22];
        for (const y of ys) ps.push(a.cilindro(0, y, 0, 2.6, H + 2, { mat: WL, r1: 2.1, incl: jit(a, 3) }), a.palo([-6, y, 0.5], [0, y, 18], 1.1, { mat: WL }), a.palo([6, y, 0.5], [0, y, 18], 1.1, { mat: WL }));
        ps.push(a.caja(0, 0, H, 6, ys[1] * 2 + 10, 5, { mat: WL, tono: 0.05 }));
      }
      const pivotes: [V3, number][] = v === 'doble' ? [[[0, -13, H - 1], 13], [[0, 13, H - 1], 11]] : v === 'mastil' ? [[[14, 0, H + 1], 12]] : [[[0, 0, H - 2], 16]];
      pivotes.forEach(([pv, R], i) => {
        const fase = i * 1.3 + a.r() * 0.2, th = onda(f, 8, fase) * (v === 'mastil' ? 14 : 20), thB = onda(f, 8, fase - 0.9) * 30;
        const loc: Pieza[] = [], Hc = R * 1.25;
        campana(a, loc, [0, 0, -Hc - R * 0.35], [0, 0, 1], R, { percebes: 2, badajo: [Math.sin(rad(thB - th)) * R * 0.75, 0, -Hc - R * 0.35 + 1 - Math.cos(rad(thB - th)) * 0.5] });
        loc.push(a.palo([0, 0, 0], [0, 0, -R * 0.4], 0.9, { mat: HI }));
        const ag = algas([[R * 0.5, 0, -Hc * 0.6], [-R * 0.6, R * 0.2, -Hc * 0.7]], 9, 0.55, f, 8, a.seed + i);
        if (ag) loc.push(ag);
        ps.push(...transformar(loc, ejeAng([0, 1, 0], th), pv));
      });
      ps.push(charco(a, 30, 22));
      return ps;
    },
  },
  {
    id: 'ahg_campanario_hundido', nombre: ['Campanario hundido', 'Sunken belfry'], tema: TEMA, variantes: ['aguja', 'tronera', 'derrumbado'], cuadros: 8, t: 5, huella: [5, 5], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], h0 = 6, ix = jit(a, 6), iy = jit(a, 6);
      const loc: Pieza[] = [];
      // el cuerpo de la torre asoma del agua: cuatro pilares con troneras y la aguja de pizarra rota
      for (const [x, y] of [[-24, -24], [24, -24], [-24, 24], [24, 24]]) loc.push(a.caja(x, y, -10, 12, 12, 70 + h0, { mat: P }));
      for (const [x, y, g] of [[0, -24, 0], [0, 24, 0], [-24, 0, 90], [24, 0, 90]] as [number, number, number][]) {
        loc.push(a.caja(x, y, -10, 40, 9, 22, { mat: P, giro: g }), a.caja(x, y, 46, 40, 9, 14, { mat: P, giro: g }));
        for (let i = 0; i <= 6; i++) { const t = i / 6, u = -18 + t * 36, z = 30 + Math.sin(t * PI) * 12; loc.push(a.caja(g ? x : x + u, g ? y + u : y, z, 7, 9, 7, { mat: P, giro: g, tono: -0.03 })); }
      }
      loc.push(a.caja(0, 0, 60, 62, 62, 6, { mat: P, tono: 0.03 }));
      if (v !== 'derrumbado') loc.push(a.poliedro([[-28, -28, 66], [28, -28, 66], [28, 28, 66], [-28, 28, 66], [jit(a, 4), jit(a, 4), v === 'aguja' ? 140 : 108]], { mat: 'pizarra' }));
      if (v === 'tronera') loc.push(a.caja(14, 10, 80, 24, 24, 50, { mat: 'pizarra', resta: true, giro: 30 }));
      // la campana dentro, que todavía se mece con la marea
      const th = onda(f, 8) * 9, cl: Pieza[] = [];
      campana(a, cl, [0, 0, -26], [0, 0, 1], 15, { badajo: [Math.sin(rad(-th * 2)) * 10, 0, -24] });
      loc.push(a.palo([0, -22, 58], [0, 22, 58], 1.6, { mat: W }), ...transformar(cl, ejeAng([0, 1, 0], th), [0, 0, 58]));
      for (let i = 0; i < 8; i++) percebes(a, loc, [elegir(a, [-30, 30]), jit(a, 28), 2 + a.r() * 16], [1, 0, 0], 5, 4);
      const ag = algas(Array.from({ length: 8 }, () => [elegir(a, [-30, 30]), jit(a, 28), 60] as V3), 18, 0.9, f, 8, a.seed);
      if (ag) loc.push(ag);
      ps.push(...mover(loc, jit(a, 6), [0, 0, 0], ix, iy));
      if (v === 'derrumbado') for (let i = 0; i < 6; i++) ps.push(pena(a, jit(a, 40), jit(a, 40), 2, 5 + a.r() * 4, 4 + a.r() * 3, 3 + a.r() * 2, { mat: P }));
      ps.push(charco(a, 52, 52, { n: 8 }));
      ondas(ps, [36, 30, 0.5], 14, f, 8);
      ps.push(suelo(a));
      return ps;
    },
  },
);
