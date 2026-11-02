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
M.ahg_bronce = { rampa: ['#090f0d', '#0f1916', '#162420', '#1f302a', '#2a3e35', '#384e41', '#4a6150', '#627664'], ruido: 0.35, escala: 0.3, brillo: 0.45, patron: (p) => { const v = ruido(p[0] * 0.18, p[1] * 0.18, p[2] * 0.5); return v > 0.64 ? -0.16 : v < 0.3 ? 0.06 : 0; } };
M.ahg_bronce_viejo = { rampa: ['#140e08', '#22180d', '#332413', '#46321a', '#5a4223', '#6e532d', '#83653a'], ruido: 0.3, escala: 0.3, brillo: 0.6 };
M.ahg_madera = { rampa: ['#0a0908', '#13110e', '#1d1a15', '#28231c', '#332d24', '#3f372c', '#4c4235', '#5a4f40'], ruido: 0.22, escala: 0.3, patron: tablas(5) };
M.ahg_madera_lisa = { rampa: ['#0a0908', '#13110e', '#1d1a15', '#28231c', '#332d24', '#3f372c', '#4c4235', '#5a4f40'], ruido: 0.25, escala: 0.25, patron: (p) => (ruido(p[0] * 0.15, p[1] * 0.15, p[2] * 0.9) - 0.5) * 0.25 };
M.ahg_agua = { rampa: ['#020506', '#040a0d', '#071014', '#0b171b', '#101f23', '#16282c', '#1f3437', '#2e4546'], ruido: 0.2, escala: 0.07, brillo: 0.8, patron: (p) => (Math.sin(p[0] * 0.5 + p[1] * 0.3 + ruido(p[0] * 0.1, p[1] * 0.1, 3) * 6) > 0.85 ? 0.08 : 0) };
M.ahg_espuma = { rampa: ['#2e3c3e', '#465859', '#617474', '#7e9090', '#9cacaa', '#bac8c4'], ruido: 0.55, escala: 0.6 };
M.ahg_bio = { rampa: ['#08403e', '#0e6660', '#18908a', '#38bcae', '#7ae2cc', '#c8fbec'], ruido: 0.35, escala: 0.35, emite: true };
M.ahg_bio_azul = { rampa: ['#0a1c48', '#123276', '#1e54a6', '#3a84d4', '#86c0f4', '#d6eeff'], ruido: 0.35, escala: 0.35, emite: true };
M.ahg_coral = { rampa: ['#29231d', '#433a30', '#605444', '#7e705b', '#9c8d74', '#b6a88d', '#ccc0a5'], ruido: 0.35, escala: 1.1, patron: (p) => (ruido(p[0] * 1.6, p[1] * 1.6, p[2] * 1.6) > 0.68 ? -0.18 : 0) };
M.ahg_concha = { rampa: ['#141113', '#241e1f', '#362d2d', '#4a3e3c', '#5f504c', '#75645e', '#8c7a72', '#a39087'], ruido: 0.25, escala: 0.4, brillo: 0.45, patron: (p) => (ruido(p[0] * 0.3, p[1] * 0.3, p[2] * 0.3) > 0.64 ? -0.1 : 0) };
M.ahg_nacar = { rampa: ['#1e2329', '#313841', '#47505b', '#5f6a75', '#7a8590', '#96a0a9', '#b4bcc2'], ruido: 0.3, escala: 0.25, brillo: 1.0 };
M.ahg_vela = { rampa: ['#191714', '#2a2722', '#3d3931', '#524c41', '#686052', '#7e7564', '#948a77'], ruido: 0.3, escala: 0.35, patron: (p) => (ruido(p[0] * 0.08, p[1] * 0.08, p[2] * 0.08) > 0.64 ? -0.14 : 0) };
M.ahg_carne = { rampa: ['#111414', '#1e2423', '#2e3634', '#404946', '#545e59', '#69736c', '#7f8780', '#969c93'], ruido: 0.3, escala: 0.4, brillo: 0.35, patron: (p) => (ruido(p[0] * 0.4, p[1] * 0.4, p[2] * 0.4) > 0.66 ? -0.12 : 0) };
M.ahg_tentaculo = { rampa: ['#0a0609', '#150b11', '#22121b', '#311a27', '#412334', '#532e43', '#663a53', '#7c4964'], ruido: 0.25, escala: 0.35, brillo: 0.7, patron: (p) => (ruido(p[0] * 0.35, p[1] * 0.35, p[2] * 0.35) > 0.63 ? -0.14 : 0) };
M.ahg_ventosa = { rampa: ['#2a1e22', '#45333a', '#634c52', '#82676c', '#a08488', '#b9a0a2'], ruido: 0.2, escala: 0.6, brillo: 0.5 };
M.ahg_pez = { rampa: ['#10161a', '#1d262c', '#2d3940', '#3f4e56', '#54646c', '#6c7c83', '#87979b', '#a6b3b5'], ruido: 0.25, escala: 0.8, brillo: 0.9, patron: (p) => (Math.sin((p[0] + p[1]) * 2.2) > 0.4 ? -0.05 : 0) };
M.ahg_lodo = { rampa: ['#080908', '#10120f', '#191c16', '#22261e', '#2c3027', '#373b30'], ruido: 0.45, escala: 0.25, brillo: 0.4 };
M.ahg_arena = { rampa: ['#17150f', '#252117', '#342f21', '#443d2c', '#554c37', '#665c43'], ruido: 0.4, escala: 0.3 };
M.ahg_hierro = { rampa: ['#0b0a09', '#151210', '#201a16', '#2c231d', '#392d24', '#48382c', '#584535'], ruido: 0.3, escala: 0.45, brillo: 0.25 };
M.ahg_soga = { rampa: ['#17140d', '#282215', '#3a321f', '#4d432a', '#605436'], ruido: 0.4, escala: 0.9 };
M.ahg_vidrio = { rampa: ['#08141a', '#0f2430', '#1a3a46', '#2a5660', '#467a80', '#76a8a8'], ruido: 0.3, escala: 0.3, brillo: 0.8 };
M.ahg_luz = { rampa: ['#a0601c', '#d08a2a', '#f0b448', '#ffd884', '#fff2cc', '#fffbf0'], ruido: 0.25, escala: 0.3, emite: true };

const P = 'ahg_piedra', PL = 'ahg_piedra_lisa', W = 'ahg_madera', WL = 'ahg_madera_lisa', AG = 'ahg_agua', BR = 'ahg_bronce', HI = 'ahg_hierro';

// ------------------------------------------------------------------ ayudas
/** Azar fijo por número (igual en todos los cuadros). */
const hr = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const lat = (d: V3): V3 => nor(Math.abs(d[2]) > 0.9 ? cruz(d, [1, 0, 0]) : cruz(d, [0, 0, 1]));
/** Agua quieta en el piso: una mancha chata de bultos (el borde sale irregular). */
function charco(a: Arma, rx: number, ry: number, o: { x?: number; y?: number; mat?: string; n?: number } = {}): Pieza {
  const cs: Comp[] = [], n = o.n ?? 6;
  for (let i = 0; i < n; i++) {
    const t = a.r() * TAU, q = Math.sqrt(a.r()) * 0.55;
    cs.push(bulto([(o.x ?? 0) + Math.cos(t) * rx * q, (o.y ?? 0) + Math.sin(t) * ry * q, 0], [rx * (0.45 + a.r() * 0.2), ry * (0.45 + a.r() * 0.2), 0.45], { giro: jit(a, 20) }));
  }
  return masa(cs, { mat: o.mat ?? AG, suave: 1.2 });
}
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
/** Cadena gruesa de ancla: eslabones ovalados con el ojo hueco, cada uno cruzado al anterior. */
function eslabones(a: Arma, ps: Pieza[], pts: V3[], paso: number, grueso: number, mat = HI) {
  const largos = [0];
  for (let i = 1; i < pts.length; i++) largos.push(largos[i - 1] + len(sub(pts[i], pts[i - 1])));
  const total = largos[largos.length - 1], n = Math.max(1, Math.floor(total / paso));
  let j = 0;
  for (let i = 0; i < n; i++) {
    const sd = (i + 0.5) * (total / n);
    while (j < pts.length - 2 && largos[j + 1] < sd) j++;
    const t = (sd - largos[j]) / Math.max(1e-6, largos[j + 1] - largos[j]), c = mez(pts[j], pts[j + 1], t), d = nor(sub(pts[j + 1], pts[j]));
    const l = lat(d), w = i % 2 ? l : cruz(d, l), z = cruz(d, w), Lk = total / n;
    ps.push({ k: 'elip', c, ex: d, ey: w, ez: z, r: [Lk * 0.68, Lk * 0.42 + grueso * 0.3, grueso], mat, tono: jit(a, 0.05) } as Pieza);
    ps.push({ k: 'elip', c, ex: d, ey: w, ez: z, r: [Lk * 0.42, Lk * 0.17, grueso * 1.6], mat, resta: true } as Pieza);
  }
}
/** Punta astillada de un palo roto: lascas que salen del corte hacia `d`. */
function astillas(a: Arma, ps: Pieza[], c: V3, d: V3, r: number) {
  const dd = nor(d), u = lat(dd), w = cruz(dd, u);
  for (let i = 0; i < 5; i++) {
    const an = (i / 5) * TAU + a.r() * 0.8, e = add(esc(u, Math.cos(an)), w, Math.sin(an)), e2 = add(esc(u, Math.cos(an + 0.9)), w, Math.sin(an + 0.9));
    ps.push(a.poliedro([add(add(c, e, r * 0.95), dd, -1.5), add(add(c, e2, r * 0.95), dd, -1.5), add(add(c, mez(e, e2, 0.5), r * 0.55), dd, -1.5), add(add(c, mez(e, e2, 0.5), r * 0.75), dd, 2 + a.r() * 8)], { mat: WL, tono: 0.08 }));
  }
}
/** Mástil con verga, cofa y jarcia; `vela` le cuelga una vela raída que se mueve. */
function mastil(a: Arma, ps: Pieza[], base: V3, alto: number, r: number, o: { roto?: number; verga?: boolean; cofa?: boolean; vela?: boolean; f?: number; n?: number } = {}) {
  const top = add(base, [0, 0, alto * (o.roto ?? 1)]);
  ps.push(a.cilindro(...base, r, alto * (o.roto ?? 1), { mat: WL, r1: r * 0.75 }));
  if (o.roto !== undefined && o.roto < 1) astillas(a, ps, top, [0, 0, 1], r * 0.8);
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
    hueso(A(0.06), A(0.14), R * 0.92, R * 0.8, { mat }), hueso(A(0.14), A(0.35), R * 0.8, R * 0.66, { mat }), hueso(A(0.35), A(0.72), R * 0.68, R * 0.6, { mat }),
    hueso(A(0.72), A(0.86), R * 0.6, R * 0.5, { mat }), bulto(A(0.86), [R * 0.5, R * 0.5, R * 0.22], { ejes: [u, w, up], mat }),
  ];
  ps.push(masa(cs, { mat, suave: R * 0.12 }));
  // la boca es plana: se corta lo que la masa redondea más allá del labio
  ps.push(a.cilindro(...add(c, up, -R * 1.5), R * 1.6, R * 1.5, { mat, eje: up, resta: true }));
  // el anillo del labio, más grueso y claro
  ps.push(a.cilindro(...c, R * 1.03, H * 0.1, { mat, r1: R * 0.9, eje: up, tono: 0.05 }));
  // hueca: cava la masa y el anillo
  ps.push(a.cilindro(...add(c, up, -1), R * 0.84, H * 0.8, { mat: 'negro', r1: R * 0.45, eje: up, resta: true }));
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
  cs.push(bulto(pel, [5 * s, 6.5 * s, 4.5 * s], m), hueso(pel, pe, 5 * s, 6 * s, m), bulto(pe, [4.6 * s, 7.8 * s, 5.5 * s], m));
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
    cs.push(hueso(cint, mez(cint, bajo, 0.55), 6 * s, 6.6 * s, { mat: tm }), hueso(mez(cint, bajo, 0.5), add(bajo, [0, 0, -bajo[2] * 0.85 * tu]), 6.6 * s, 8 * s * tu + 1, { mat: tm }));
    // pliegues: tres husos que caen por delante y a los costados
    for (const k of [-1, 0, 1]) cs.push(hueso(add(cint, [3 * s, k * 4 * s, -2 * s]), add(bajo, [3.5 * s, k * 6 * s, -bajo[2] * 0.8 * tu]), 1.6 * s, 2.4 * s, { mat: tm, k: 1.2 * s }));
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
    id: 'ahg_casco_proa', nombre: ['Casco partido: proa', 'Broken hull: bow'], tema: TEMA, variantes: ['hundida', 'alzada', 'escorada', 'con_mascaron'], huella: [5, 3], bloquea: true,
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
    id: 'ahg_casco_popa', nombre: ['Casco partido: popa', 'Broken hull: stern'], tema: TEMA, variantes: ['recta', 'escorada', 'podrida', 'con_farol'], huella: [5, 3], bloquea: true,
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
    id: 'ahg_casco_costillar', nombre: ['Costillar de casco', 'Hull skeleton'], tema: TEMA, variantes: ['corto', 'largo', 'medio_hundido', 'volcado'], huella: [6, 3], bloquea: true,
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
      astillas(a, loc, [-L / 2, 0, 3.2], [-1, 0, 0], 3.4);
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
        for (let i = 1; i <= 6; i++) { const an = (i / 6) * 1.25, q: V3 = [s * Math.sin(an) * 36, 0, 36 - Math.cos(an) * 34]; cs.push(hueso(prev, q, 4.6 - i * 0.3, 4.4 - i * 0.35, { mat: HI })); prev = q; }
        // uña: pala de hierro que se abre a los lados de la punta del brazo
        const t = prev, d = nor([s * 36 * Math.cos(1.25), 0, 34 * Math.sin(1.25)]), nn: V3 = nor(cruz(d, [0, s, 0])), y: V3 = [0, 1, 0];
        const pal: V3[] = [add(add(t, d, -12), nn, 0), add(add(t, d, -5), y, 8), add(add(t, d, -5), y, -8), add(t, d, 8)];
        loc.push(a.poliedro([...pal.map((q) => add(q, nn, 1.3)), ...pal.map((q) => add(q, nn, -1.3))], { mat: HI, tono: 0.04 }));
      }
      loc.push(masa(cs, { mat: HI, suave: 2.5 }));
      for (let i = 0; i < 5; i++) percebes(a, loc, [jit(a, 4), elegir(a, [-3.5, 3.5]), 6 + a.r() * H * 0.5], [0, 1, 0], 4, 3);
      const ag = algas([[0, -20, H - 12], [0, 15, H - 12], [3, 0, H * 0.6]], 13, 0.8, 0, 1, a.seed);
      if (ag) loc.push(ag);
      let ps: Pieza[];
      if (v === 'tumbada') ps = mover(loc, a.r() * 360, [0, 0, 4], 0, 88);
      else if (v === 'clavada') ps = mover(loc, a.r() * 360, [0, 0, -16], jit(a, 14), 12 + a.r() * 10);
      else ps = mover(loc, a.r() * 360, [0, 0, v === 'con_cadena' ? -6 : -3], jit(a, 5), jit(a, 5));
      if (v === 'con_cadena') { const pts: V3[] = [[0, 0, H], [10, 8, H * 0.5], [20, 14, 2], [28, 2, 1.5], [20, -10, 1.5], [6, -14, 1.5]]; eslabones(a, ps, pts, 6, 1.6); }
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
      eslabones(a, ps, pts, 6.5, 1.7);
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
    id: 'ahg_torre_campanario', nombre: ['Torre del campanario hundida', 'Sunken bell tower'], tema: TEMA, variantes: ['aguja', 'tronera', 'derrumbado'], cuadros: 8, t: 5, huella: [5, 5], bloquea: true,
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

// ------------------------------------------------------------------ 3. la catedral ahogada: columnas, arcos, santos
/** Fuste gótico (haz de baquetones) con basa y capitel; devuelve la altura del capitel. */
function fuste(a: Arma, ps: Pieza[], c: V3, alto: number, r: number, o: { roto?: number; haz?: boolean } = {}) {
  const h = alto * (o.roto ?? 1);
  ps.push(a.cilindro(c[0], c[1], c[2], r * 1.55, 3, { mat: P, r1: r * 1.4 }), a.cilindro(c[0], c[1], c[2] + 3, r * 1.3, 2.5, { mat: PL, r1: r * 1.1 }));
  ps.push(a.cilindro(c[0], c[1], c[2] + 5, r, h - 5, { mat: PL }));
  if (o.haz !== false) for (let k = 0; k < 4; k++) { const an = (k / 4) * TAU + PI / 4; ps.push(a.cilindro(c[0] + Math.cos(an) * r * 0.9, c[1] + Math.sin(an) * r * 0.9, c[2] + 5, r * 0.42, h - 5, { mat: PL, tono: 0.04 })); }
  if ((o.roto ?? 1) >= 1) {
    ps.push(a.cilindro(c[0], c[1], c[2] + h, r * 1.05, 5, { mat: PL, r1: r * 1.55 }), a.caja(c[0], c[1], c[2] + h + 5, r * 3.3, r * 3.3, 3, { mat: P }));
    // hojas talladas en el capitel
    for (let k = 0; k < 6; k++) { const an = (k / 6) * TAU; ps.push(a.elipsoide(c[0] + Math.cos(an) * r * 1.2, c[1] + Math.sin(an) * r * 1.2, c[2] + h + 2.5, 1.6, 1.6, 2.6, { mat: PL, giro: (an * 180) / PI, tono: 0.05 })); }
  } else {
    // corte quebrado: lajas que suben del tope
    for (let k = 0; k < 3; k++) ps.push(pena(a, c[0] + jit(a, r * 0.5), c[1] + jit(a, r * 0.5), c[2] + h - 1, r * 0.8, r * 0.7, 2 + a.r() * 4, { mat: PL }));
  }
  return c[2] + h + 8;
}
registrar(
  {
    id: 'ahg_columna_percebes', nombre: ['Columna con percebes', 'Barnacled column'], tema: TEMA, variantes: ['entera', 'rota', 'inclinada', 'con_algas', 'caida'], cuadros: 8, t: 5, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => {
      const loc: Pieza[] = [], alto = 84 + a.r() * 24, r = 4.5;
      if (v === 'caida') {
        // tambores sueltos tirados en el agua
        const g = a.r() * 360;
        for (let i = 0; i < 4; i++) { const p = polar(g, -30 + i * 16 + jit(a, 2), r * 1.3); loc.push(a.cilindro(p[0], p[1], r * 1.3, r * 1.3, 14, { mat: PL, eje: [Math.cos(rad(g + jit(a, 12))), Math.sin(rad(g + jit(a, 12))), jit(a, 0.1)] })); percebes(a, loc, add(p, [0, 0, r * 2.4]), [0, 0, 1], 4, 3); }
        const ps = [...loc, charco(a, 36, 28)];
        fuste(a, ps, [polar(g, 40)[0], polar(g, 40)[1], -2], 22, r, { roto: 0.6 });
        return [...ps, suelo(a)];
      }
      const top = fuste(a, loc, [0, 0, -2], alto, r, { roto: v === 'rota' ? 0.4 + a.r() * 0.25 : 1 });
      // percebes y la línea de marea: la mitad de abajo cubierta
      for (let i = 0; i < 7; i++) { const an = a.r() * TAU, z = 3 + a.r() * alto * 0.35; percebes(a, loc, [Math.cos(an) * r * 1.3, Math.sin(an) * r * 1.3, z], [Math.cos(an), Math.sin(an), 0.1], 5, 3.5); }
      costra(a, loc, [r * 1.2, 0, 10], [1, 0, 0], 8, 'ahg_alga');
      costra(a, loc, [0, r * 1.2, 16], [0, 1, 0], 7);
      const nA = v === 'con_algas' ? 9 : v === 'rota' ? 0 : 4;
      const ag = algas(Array.from({ length: nA }, (_, k) => polar((k / nA) * 360 + jit(a, 15), r * 1.6, top - 3)), v === 'con_algas' ? 34 : 18, 0.8, f, 8, a.seed);
      if (ag) loc.push(ag);
      const ps = v === 'inclinada' ? mover(loc, a.r() * 360, [0, 0, -4], 7 + a.r() * 5, 0) : mover(loc, a.r() * 360);
      ps.push(charco(a, 16, 14), suelo(a));
      return ps;
    },
  },
  {
    id: 'ahg_arco_hundido', nombre: ['Arco ojival hundido', 'Sunken pointed arch'], tema: TEMA, variantes: ['entero', 'partido', 'con_campana', 'con_algas'], cuadros: 8, t: 5, huella: [5, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], luz = 26, hP = 52 + a.r() * 10;
      const tops: V3[] = [];
      for (const s of [-1, 1]) tops.push(...[fuste(a, ps, [0, s * luz, -4], hP, 4.2)].map((z) => [0, s * luz, z] as V3));
      // dovelas: dos arcos de círculo que se cruzan en punta
      const n = 7, R = luz * 1.6;
      for (const s of [-1, 1]) for (let i = 0; i < n; i++) {
        if (v === 'partido' && s > 0 && i > 2) continue;
        const t0 = i / n, t1 = (i + 1) / n, A0 = Math.acos(1 - luz / R * 1), an0 = t0 * A0, an1 = t1 * A0;
        const P0: V3 = [0, s * (luz - R * (1 - Math.cos(an0))), tops[0][2] + R * Math.sin(an0)], P1: V3 = [0, s * (luz - R * (1 - Math.cos(an1))), tops[0][2] + R * Math.sin(an1)];
        const d = nor(sub(P1, P0)), up = nor(cruz([1, 0, 0], d)), Ld = len(sub(P1, P0));
        const q = [add(P0, up, -3.5), add(P1, up, -3.5), add(P1, up, 3.5), add(P0, up, 3.5)];
        ps.push(a.poliedro([...q.map((x) => add(x, [5, 0, 0])), ...q.map((x) => add(x, [-5, 0, 0]))], { mat: P, tono: jit(a, 0.05) }));
        if (Ld < 0) break;
      }
      if (v === 'partido') for (let i = 0; i < 4; i++) ps.push(pena(a, jit(a, 10), luz * 0.5 + jit(a, 12), 2, 5, 4, 3, { mat: P }));
      if (v === 'con_campana') {
        const th = onda(f, 8) * 12, cl: Pieza[] = [];
        campana(a, cl, [0, 0, -21], [0, 0, 1], 11, { badajo: [Math.sin(rad(-th * 2)) * 7, 0, -19] });
        ps.push(...transformar([...cl, a.palo([0, 0, 0], [0, 0, -5], 0.7, { mat: HI })], ejeAng([0, 1, 0], th), [0, 0, tops[0][2] + R * Math.sin(Math.acos(1 - luz / R)) - 4]));
      }
      const ag = algas(Array.from({ length: v === 'con_algas' ? 10 : 4 }, () => [jit(a, 3), jit(a, luz), tops[0][2] + 8 + a.r() * 18] as V3), v === 'con_algas' ? 26 : 14, 0.7, f, 8, a.seed);
      if (ag) ps.push(ag);
      for (const s of [-1, 1]) percebes(a, ps, [5, s * luz, 8], [1, 0, 0], 6, 4);
      ps.push(charco(a, 22, 36), suelo(a));
      return ps;
    },
  },
  {
    id: 'ahg_estatua_santo', nombre: ['Estatua de santo carcomida', 'Salt-eaten saint statue'], tema: TEMA, variantes: ['orante', 'con_libro', 'bendice', 'con_llave', 'decapitado'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const loc: Pieza[] = [], z0 = 12;
      // pedestal gótico
      loc.push(a.caja(0, 0, 0, 22, 22, 4, { mat: P }), a.caja(0, 0, 4, 18, 18, 7, { mat: PL }), a.caja(0, 0, 11, 20, 20, 2, { mat: P, tono: 0.04 }));
      const pose = POSES[v === 'con_libro' ? 'libro' : v === 'bendice' ? 'bendice' : v === 'con_llave' ? 'llave' : 'orante'];
      const fig = figura(pose, 'ahg_piedra_lisa', 1.02, { capucha: v !== 'decapitado' && a.r() < 0.6, sinCabeza: v === 'decapitado' });
      loc.push(...transformar(fig, ID3, [0, 0, z0]));
      if (v === 'con_libro') loc.push(a.caja(9.5, 0, z0 + 40, 4, 9, 6, { mat: PL, giro: 0, incl: -30, inclEje: 'y', tono: 0.06 }));
      if (v === 'con_llave') loc.push(a.palo([8, -9, z0 + 40], [8, -9, z0 + 58], 0.9, { mat: 'ahg_bronce' }), a.caja(8, -9, z0 + 56, 1.2, 5, 4, { mat: 'ahg_bronce' }));
      if (v !== 'decapitado') {
        // la cara comida por la sal: costra blanca, huecos donde estaban los ojos y la boca
        const cab: V3 = [pose.cab[0] * 1.02 + 3.8, 0, pose.cab[2] * 1.02 + z0];
        loc.push(a.elipsoide(cab[0] + 0.3, -1.3, cab[2] + 0.6, 1.2, 1.1, 1.3, { mat: 'negro', resta: true }), a.elipsoide(cab[0] + 0.3, 1.3, cab[2] + 0.2, 1.4, 1.2, 1.5, { mat: 'negro', resta: true }), a.elipsoide(cab[0], 0.4, cab[2] - 2.4, 1.3, 1.8, 1.4, { mat: 'negro', resta: true }));
        costra(a, loc, add(cab, [0.2, jit(a, 1.5), -0.5]), [1, 0, 0.2], 4.2);
        costra(a, loc, add(cab, [-1, 2, 2]), [0.3, 1, 0.5], 3);
      } else for (let i = 0; i < 3; i++) loc.push(pena(a, jit(a, 3), jit(a, 3), z0 + 49 + a.r() * 2, 2.8, 3.4, 1.4, { mat: PL }));
      // la túnica también: chorreones de sal y percebes desde el pedestal
      for (let i = 0; i < 3; i++) costra(a, loc, [5.5, jit(a, 6), z0 + 8 + a.r() * 26], [1, 0, 0], 4 + a.r() * 3, a.r() < 0.4 ? 'ahg_alga' : 'ahg_sal');
      for (let i = 0; i < 4; i++) { const an = a.r() * TAU; percebes(a, loc, [Math.cos(an) * 10, Math.sin(an) * 10, 2 + a.r() * 9], [Math.cos(an), Math.sin(an), 0], 6, 4); }
      const ag = algas([[jit(a, 6), jit(a, 6), z0 + 46], [0, 9, z0 + 37]], 14, 0.55, 0, 1, a.seed);
      if (ag) loc.push(ag);
      const ps = mover(loc, 45 + jit(a, 30), [0, 0, -1], jit(a, 3), jit(a, 3));
      ps.push(charco(a, 20, 18), suelo(a));
      return ps;
    },
  },
);
const ID3: M3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

// ------------------------------------------------------------------ 4. el fondo del mar a la vista: charcos, corales, conchas, cofres
/** Rama de coral de hueso: tallos que se abren en horquillas (en un plano si `abanico`), una masa porosa. */
function coral(a: Arma, c: V3, alto: number, grueso: number, o: { abanico?: number; niveles?: number; mat?: string } = {}): Pieza {
  const cs: Comp[] = [], mat = o.mat ?? 'ahg_coral';
  const rama = (p: V3, d: V3, L: number, r: number, nivel: number) => {
    const q = add(p, nor(d), L);
    cs.push(hueso(p, q, r, r * 0.72, { mat }));
    if (nivel <= 0 || r < 0.6) { cs.push(bulto(q, [r * 0.95, r * 0.95, r * 0.95], { mat })); return; }
    const n = 2 + (a.r() < 0.35 ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const ab = o.abanico !== undefined ? ((k / (n - 1 || 1)) - 0.5) * 1.3 : 0;
      const nd: V3 = o.abanico !== undefined
        ? add(nor(d), [Math.cos(rad(o.abanico)) * ab, Math.sin(rad(o.abanico)) * ab, 0.15])
        : add(nor(d), [jit(a, 0.8), jit(a, 0.8), 0.25]);
      rama(q, nd, L * (0.68 + a.r() * 0.2), r * 0.72, nivel - 1);
    }
  };
  rama(c, [jit(a, 0.2), jit(a, 0.2), 1], alto * 0.36, grueso, o.niveles ?? 3);
  return masa(cs, { mat, suave: grueso * 0.35 });
}
/** Pez muerto echado de costado: cuerpo, cola, aleta y el ojo blanco. */
function pez(a: Arma, ps: Pieza[], c: V3, L: number, giro: number, o: { incl?: number; podrido?: boolean } = {}) {
  const loc: Pieza[] = [];
  loc.push(masa([bulto([0, 0, 0], [L * 0.42, L * 0.12, L * 0.17]), bulto([L * 0.28, 0, -L * 0.01], [L * 0.16, L * 0.1, L * 0.12]), hueso([-L * 0.2, 0, 0], [-L * 0.42, 0, 0], L * 0.08, L * 0.03)], { mat: 'ahg_pez', suave: L * 0.05 }));
  loc.push(a.poliedro([[-L * 0.4, -0.3, 0], [-L * 0.4, 0.3, 0], [-L * 0.6, -0.2, L * 0.17], [-L * 0.6, 0.2, L * 0.17], [-L * 0.62, 0, -L * 0.17], [-L * 0.55, 0, 0]], { mat: 'ahg_pez', tono: -0.08 }));
  loc.push(a.poliedro([[-L * 0.05, 0, L * 0.14], [L * 0.12, 0, L * 0.15], [-L * 0.12, -0.3, L * 0.26], [-L * 0.12, 0.3, L * 0.26]], { mat: 'ahg_pez', tono: -0.1 }));
  loc.push(a.esfera(L * 0.32, -L * 0.07, L * 0.04, L * 0.04 + 0.3, { mat: 'ahg_sal' }));
  if (o.podrido) loc.push(a.elipsoide(L * 0.05, -L * 0.1, 0, L * 0.14, L * 0.06, L * 0.08, { mat: 'carne', tono: -0.1 }));
  ps.push(...transformar(loc, rotM(giro, 90 + (o.incl ?? 0), 0), c));
}
registrar(
  {
    id: 'ahg_charco_marea', nombre: ['Charco de marea que brilla', 'Glowing tide pool'], tema: TEMA, variantes: ['chico', 'grande', 'con_conchas', 'azul', 'con_estrellas'], cuadros: 8, t: 4, huella: [3, 3], bloquea: false,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], R = v === 'grande' ? 30 : v === 'chico' ? 14 : 22, bio = v === 'azul' ? 'ahg_bio_azul' : 'ahg_bio';
      // borde de rocas mojadas alrededor del agua
      const nr = v === 'grande' ? 10 : 7;
      for (let i = 0; i < nr; i++) { const an = (i / nr) * TAU + jit(a, 0.3), rr = R * (0.95 + a.r() * 0.2); ps.push(...roca(a, [Math.cos(an) * rr, Math.sin(an) * rr * 0.8, 1], [5 + a.r() * 4, 4 + a.r() * 3, 2.5 + a.r() * 3], { mat: 'ahg_roca', facetas: 1, n: 5 })); }
      ps.push(charco(a, R * 1.05, R * 0.85, { n: 7 }));
      // la luz que vive en el agua: motas y hilos que laten cada una a su ritmo
      const nm = Math.round(R * 1.3);
      for (let i = 0; i < nm; i++) {
        const an = a.r() * TAU, d = Math.sqrt(a.r()) * R * 0.8, ph = a.r() * TAU, k = 0.5 + 0.5 * Math.sin(ciclo(f, 8) * TAU + ph);
        ps.push(a.elipsoide(Math.cos(an) * d, Math.sin(an) * d * 0.8, 0.5, 0.8 + k * 0.7, 0.8 + k * 0.7, 0.3, { mat: bio, tono: -0.2 + k * 0.4 }));
      }
      // anémonas que se abren y cierran
      for (let i = 0; i < (v === 'chico' ? 2 : 4); i++) {
        const an = a.r() * TAU, d = a.r() * R * 0.6, c: V3 = [Math.cos(an) * d, Math.sin(an) * d * 0.8, 0.3], k = 0.6 + 0.4 * onda(f, 8, i);
        const cs: Comp[] = [bulto(c, [1.6, 1.6, 1.2], { mat: 'ahg_tentaculo' })];
        for (let j = 0; j < 7; j++) { const b = (j / 7) * TAU; cs.push(hueso(add(c, [0, 0, 1]), add(c, [Math.cos(b) * 2.6 * k, Math.sin(b) * 2.6 * k, 1.6 + 1.6 * (1 - k)]), 0.45, 0.2, { mat: 'ahg_tentaculo' })); }
        ps.push(masa(cs, { mat: 'ahg_tentaculo', suave: 0.5 }), a.esfera(c[0], c[1], c[2] + 1.6, 0.6, { mat: bio, tono: k * 0.3 - 0.2 }));
      }
      if (v === 'con_conchas' || v === 'grande') for (let i = 0; i < 5; i++) { const an = a.r() * TAU, d = R * (0.5 + a.r() * 0.5); ps.push(a.elipsoide(Math.cos(an) * d, Math.sin(an) * d * 0.8, 0.8, 2.2, 1.7, 0.9, { mat: 'ahg_concha', giro: a.r() * 180 })); }
      if (v === 'con_estrellas') for (let i = 0; i < 4; i++) {
        const an = a.r() * TAU, d = a.r() * R * 0.7, c: V3 = [Math.cos(an) * d, Math.sin(an) * d * 0.8, 0.6], cs: Comp[] = [], g0 = a.r() * TAU;
        for (let j = 0; j < 5; j++) { const b = g0 + (j / 5) * TAU; cs.push(hueso(c, add(c, [Math.cos(b) * 3.2, Math.sin(b) * 3.2, 0]), 1, 0.35, { mat: 'roca_roja' })); }
        ps.push(masa(cs, { mat: 'roca_roja', suave: 0.6 }));
      }
      const k = 0.5 + 0.5 * onda(f, 8);
      return { piezas: ps, resplandor: { c: [0, 0, 2], r: R * (0.75 + k * 0.25), color: v === 'azul' ? '#4080e0' : '#40c8b0' } };
    },
  },
  {
    id: 'ahg_coral_hueso', nombre: ['Coral de hueso', 'Bone coral'], tema: TEMA, variantes: ['rama', 'abanico', 'mata', 'alto', 'con_luz'], cuadros: 8, t: 5, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      ps.push(...roca(a, [0, 0, 0], [9, 8, 4], { mat: 'ahg_roca', facetas: 1, n: 4 }));
      if (v === 'abanico') ps.push(coral(a, [0, 0, 2], 46, 2.2, { abanico: a.r() * 180, niveles: 4 }));
      else if (v === 'mata') for (let i = 0; i < 4; i++) ps.push(coral(a, [jit(a, 7), jit(a, 7), 2], 22 + a.r() * 10, 1.6, { niveles: 2 }));
      else ps.push(coral(a, [0, 0, 2], v === 'alto' ? 70 : 44, v === 'alto' ? 3 : 2.4, { niveles: v === 'alto' ? 4 : 3 }));
      // pólipos que asoman de los poros
      if (v === 'con_luz') for (let i = 0; i < 10; i++) { const k = 0.5 + 0.5 * onda(f, 8, i * 1.7); ps.push(a.esfera(jit(a, 12), jit(a, 12), 6 + a.r() * 34, 0.7 + k * 0.4, { mat: 'ahg_bio', tono: -0.3 + k * 0.4 })); }
      const ag = algas([[jit(a, 6), jit(a, 6), 2], [jit(a, 6), jit(a, 6), 2]], 16, 0.6, f, 8, a.seed, { arriba: true });
      if (ag) ps.push(ag);
      ps.push(charco(a, 16, 13));
      return v === 'con_luz' ? { piezas: ps, resplandor: { c: [0, 0, 22], r: 30 + onda(f, 8) * 4, color: '#40c8b0' } } : ps;
    },
  },
  {
    id: 'ahg_arrecife_huesos', nombre: ['Arrecife de huesos', 'Bone reef'], tema: TEMA, variantes: ['bajo', 'alto', 'con_craneos', 'costillar', 'con_algas'], cuadros: 8, t: 5, huella: [4, 3], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], alto = v === 'alto' ? 26 : 14;
      ps.push(...roca(a, [0, 0, 0], [26, 18, alto], { mat: 'ahg_roca', facetas: 2, n: 9, suave: 5 }));
      for (let i = 0; i < 3; i++) costra(a, ps, [jit(a, 14), jit(a, 9), alto * 0.85], [0, 0, 1], 10, 'ahg_coral');
      // huesos atrapados en la roca: largos que asoman, cráneos encajados, una costilla de bestia marina
      for (let i = 0; i < 6; i++) { const an = a.r() * TAU, p: V3 = [Math.cos(an) * 18, Math.sin(an) * 13, alto * (0.3 + a.r() * 0.6)]; huesoLargo(ps, p, add(p, [Math.cos(an) * 9, Math.sin(an) * 9, 2 + a.r() * 6]), 1.3); }
      const nc = v === 'con_craneos' ? 6 : 2;
      for (let i = 0; i < nc; i++) { const an = a.r() * TAU; craneo(a, ps, [Math.cos(an) * 16, Math.sin(an) * 11, alto * (0.5 + a.r() * 0.5)], 3.6, (an * 180) / PI + jit(a, 30), { incl: jit(a, 20), mandibula: a.r() < 0.5 }); }
      if (v === 'costillar' || v === 'alto') costillar(a, ps, [jit(a, 6), jit(a, 4), alto + 6], 40, 16, a.r() * 180, { mat: 'ahg_coral', n: 7, grueso: 1.6, rotas: 0.2, alto: alto + 4 });
      for (let i = 0; i < 4; i++) ps.push(coral(a, [jit(a, 18), jit(a, 12), alto * 0.8], 18 + a.r() * 12, 1.4, { niveles: 2 }));
      const ag = algas(Array.from({ length: v === 'con_algas' ? 9 : 4 }, () => [jit(a, 20), jit(a, 13), alto * 0.7] as V3), v === 'con_algas' ? 30 : 18, 0.8, f, 8, a.seed, { arriba: true });
      if (ag) ps.push(ag);
      for (let i = 0; i < 4; i++) { const an = a.r() * TAU; percebes(a, ps, [Math.cos(an) * 22, Math.sin(an) * 15, alto * 0.4], [Math.cos(an), Math.sin(an), 0.4], 5, 4); }
      ps.push(charco(a, 36, 26), suelo(a));
      return ps;
    },
  },
  {
    id: 'ahg_concha_gigante', nombre: ['Concha gigante', 'Giant shell'], tema: TEMA, variantes: ['cerrada', 'abierta', 'con_perla', 'rota', 'caracola'], cuadros: 8, t: 6, huella: [3, 3], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], R = 18 + a.r() * 5, g = a.r() * 360;
      const loc: Pieza[] = [];
      if (v === 'caracola') {
        // caracola en espiral: vueltas que crecen hacia la boca y la aguja que se afina
        const cs: Comp[] = [];
        for (let i = 0; i < 14; i++) { const t = i / 13, an = t * 3.4 * PI, r = R * (0.15 + 0.65 * t), x = -R * 1.1 + t * R * 1.6; cs.push(bulto([x, Math.cos(an) * r * 0.45, R * 0.5 + Math.sin(an) * r * 0.45], [r * 0.55, r * 0.6, r * 0.6], { mat: 'ahg_concha', tono: (i % 2) * 0.05 })); }
        cs.push(hueso([-R * 1.1, 0, R * 0.5], [-R * 1.8, 0, R * 0.62], R * 0.18, 0.4, { mat: 'ahg_concha' }));
        loc.push(masa(cs, { mat: 'ahg_concha', suave: R * 0.12 }));
        loc.push(a.elipsoide(R * 0.75, 0, R * 0.45, R * 0.2, R * 0.42, R * 0.5, { mat: 'ahg_nacar' }), a.elipsoide(R * 0.85, 0, R * 0.45, R * 0.18, R * 0.3, R * 0.38, { mat: 'negro', resta: true }));
        for (let i = 0; i < 5; i++) loc.push(a.palo([jit(a, R * 0.6), jit(a, R * 0.3), R * 0.9], [jit(a, R * 0.8), jit(a, R * 0.5), R * 1.2 + a.r() * 4], 1, { mat: 'ahg_concha', r1: 0.1 }));
        ps.push(...mover(loc, g), charco(a, R * 1.4, R * 1.1), suelo(a));
        return ps;
      }
      // almeja: dos valvas con costillas que salen de la bisagra (atrás) y el labio ondulado
      const valva = (arriba: number, abre: number) => {
        // la valva es una cúpula chata con costillas que salen de la bisagra siguiendo la curva y abren el labio en ondas
        const cs: Comp[] = [bulto([R * 0.95, 0, 0], [R, R * 0.92, R * 0.4], { mat: 'ahg_concha' })];
        for (let k = 0; k < 9; k++) {
          const an = (-0.5 + k / 8) * PI * 0.92;
          let prev: V3 | null = null;
          for (let q = 0; q <= 4; q++) {
            const ca = Math.cos(an), sa = Math.sin(an), A2 = (ca * ca) / (R * R) + (sa * sa) / (R * R * 0.8464), B2 = (-2 * 0.95 * ca) / R, d = (-B2 + Math.sqrt(B2 * B2 - 4 * A2 * (0.9025 - 1))) / (2 * A2);
            const t = 0.1 + (q / 4) * 0.92, x = ca * t * d, y = sa * t * d, u = (x - R * 0.95) / R, w = y / (R * 0.92);
            const p: V3 = [x, y, arriba * (R * 0.4 * Math.sqrt(Math.max(0, 1 - u * u - w * w)) + 0.3)];
            if (prev) cs.push(hueso(prev, p, 1 + t * 1.2, 1 + t * 1.4, { mat: 'ahg_concha', tono: 0.05 }));
            prev = p;
          }
        }
        const vp: Pieza[] = [masa(cs, { mat: 'ahg_concha', suave: 1.4 })];
        vp.push(a.caja(R * 0.95, 0, arriba > 0 ? -R : 0, R * 2.6, R * 2.6, R, { mat: 'ahg_concha', resta: true }));
        return transformar(vp, ejeAng([0, 1, 0], -abre * arriba), [0, 0, 0]);
      };
      const ab = v === 'cerrada' ? 4 : v === 'rota' ? 40 : 28 + onda(f, 8) * 4;
      loc.push(...transformar(valva(-1, 0), ID3, [0, 0, R * 0.42]));
      if (v !== 'rota') loc.push(...transformar(valva(1, ab), ID3, [0, 0, R * 0.42]));
      else for (let i = 0; i < 3; i++) loc.push(pena(a, R + jit(a, R), jit(a, R), 1.2, 5, 4, 1.2, { mat: 'ahg_concha' }));
      if (v !== 'cerrada') {
        // carne nacarada adentro y, en una, la perla del tamaño de una cabeza que brilla
        loc.push(a.elipsoide(R * 0.9, 0, R * 0.42, R * 0.8, R * 0.72, R * 0.12, { mat: 'ahg_nacar' }));
        if (v === 'con_perla') loc.push(a.esfera(R * 0.9, 0, R * 0.42 + 5.5, 5.5, { mat: 'ahg_nacar', tono: 0.15 }));
        else loc.push(a.elipsoide(R * 0.9, 0, R * 0.48, R * 0.45, R * 0.4, R * 0.1, { mat: 'ahg_carne', tono: 0.05 }));
      }
      percebes(a, loc, [R * 0.4, R * 0.6, R * 0.6], [0, 1, 1], 6, 5);
      ps.push(...mover(loc, g, [-R * 0.6 * Math.cos(rad(g)), -R * 0.6 * Math.sin(rad(g)), -2]), charco(a, R * 1.3, R * 1.1), suelo(a));
      return v === 'con_perla' ? { piezas: ps, resplandor: { c: [0, 0, R * 0.6], r: 26 + onda(f, 8) * 3, color: '#b0c8d8' } } : ps;
    },
  },
  {
    id: 'ahg_cofre_barco', nombre: ['Cofre de barco', 'Ship chest'], tema: TEMA, variantes: ['cerrado', 'abierto', 'volcado', 'con_percebes', 'hundido'], huella: [2, 1], bloquea: true,
    armar: (v, _f, a) => {
      const loc: Pieza[] = [], L = 24, A = 14, H = 11;
      loc.push(a.caja(0, 0, 0, L, A, H, { mat: W }));
      const tapa = (ab: number) => {
        // la tapa curva gira sobre la bisagra de atrás (eje x, en y = -A/2)
        const t: Pieza[] = [a.cilindro(-L / 2, A / 2, 0, A / 2, L, { mat: W, eje: [1, 0, 0], tono: 0.04 }), a.caja(0, A / 2, -A / 2, L + 1, A + 1, A / 2, { mat: W, resta: true })];
        for (const x of [-L * 0.36, 0, L * 0.36]) t.push(a.cilindro(x - 0.9, A / 2, 0, A / 2 + 0.4, 1.8, { mat: HI, eje: [1, 0, 0] }), a.caja(x, A / 2, -A / 2 - 0.4, 2.2, A + 2, A / 2 + 0.4, { mat: HI, resta: true }));
        return transformar(t, ejeAng([1, 0, 0], ab), [0, -A / 2, H]);
      };
      const abierto = v === 'abierto' || v === 'volcado';
      for (const x of [-L * 0.36, 0, L * 0.36]) loc.push(a.caja(x, 0, 0, 1.8, A + 0.6, H + 0.2, { mat: HI }));
      loc.push(a.caja(L / 2 + 0.3, 0, H - 4, 1, 3, 3.5, { mat: HI }));
      if (abierto) {
        loc.push(a.caja(0, 0, 1.5, L - 2, A - 2, H, { mat: 'negro', resta: true }));
        // oro y perlas verdosas adentro
        for (let i = 0; i < 14; i++) loc.push(a.cilindro(jit(a, L * 0.4), jit(a, A * 0.35), H - 2 + a.r() * 2.5, 1.2, 0.5, { mat: a.r() < 0.8 ? 'oro' : 'ahg_nacar', incl: jit(a, 30) }));
        loc.push(...tapa(105));
      } else loc.push(...tapa(0));
      if (v === 'con_percebes' || v === 'hundido') { percebes(a, loc, [0, -A / 2, H * 0.5], [0, -1, 0], 10, 8); percebes(a, loc, [0, 0, H + A / 2], [0, 0, 1], 6, 6); }
      costra(a, loc, [L / 2, 0, 3], [1, 0, 0], 5, 'ahg_alga');
      let ps: Pieza[];
      if (v === 'volcado') {
        ps = mover(loc, a.r() * 360, [0, 0, A / 2 + 1], 0, 0);
        ps = transformar(ps, ejeAng([1, 0, 0], 82), [0, 0, 0]);
        ps = mover(ps, 0, [0, 0, 6]);
        for (let i = 0; i < 16; i++) ps.push(a.cilindro(jit(a, 18), jit(a, 18), 0.3, 1.2, 0.5, { mat: 'oro', incl: jit(a, 15) }));
      } else ps = mover(loc, a.r() * 360, [0, 0, v === 'hundido' ? -5 : 0], jit(a, 3), jit(a, 3));
      ps.push(charco(a, 20, 16), suelo(a));
      return ps;
    },
  },
);

// ------------------------------------------------------------------ 5. luces, muertos y lo que vive en el agua
/** Farol de pescador: jaula de hierro con el vidrio encendido, el sombrerete y el asa. `k` es el pulso de la llama. */
function farol(a: Arma, ps: Pieza[], c: V3, s: number, k: number) {
  ps.push(a.cilindro(c[0], c[1], c[2], 2.4 * s, 1.2 * s, { mat: HI }));
  ps.push(a.cilindro(c[0], c[1], c[2] + 1.2 * s, 1.9 * s, 5 * s, { mat: 'ahg_luz', r1: 1.7 * s, tono: -0.15 + k * 0.25 }));
  for (let i = 0; i < 4; i++) { const an = (i / 4) * TAU + PI / 4; ps.push(a.palo([c[0] + Math.cos(an) * 2.1 * s, c[1] + Math.sin(an) * 2.1 * s, c[2] + 1 * s], [c[0] + Math.cos(an) * 1.9 * s, c[1] + Math.sin(an) * 1.9 * s, c[2] + 6.4 * s], 0.35 * s, { mat: HI })); }
  ps.push(a.cilindro(c[0], c[1], c[2] + 6.2 * s, 2.6 * s, 2.2 * s, { mat: HI, r1: 0.5 * s }));
  ps.push({ k: 'elip', c: [c[0], c[1], c[2] + 9 * s], ex: [1, 0, 0], ey: [0, 0, 1], ez: [0, 1, 0], r: [1.4 * s, 1.4 * s, 0.35 * s], mat: HI } as Pieza);
}
/** Ahogado: el cuerpo de un personaje en una pose de muerte, hinchado, lavado y verdoso. */
function ahogado(a: Arma, pose: 'tendido' | 'sentado' | 'boca_abajo' | 'arrodillado', giro: number, t: V3): Pieza[] {
  const eq = { torso: { tipo: 'harapos' as const, mat: 'cu_tela_parda' }, piernas: { tipo: 'pantalon' as const, mat: 'cu_tela_azul' }, cinturon: { mat: 'cu_cuero' } };
  const cu = { ...CUERPOS.muerto, grasa: 0.6, demacrado: false, piel: 'ahg_carne', peinado: 'largo' as const, pelo: 'cu_pelo_negro' };
  const acc = pose === 'sentado' || pose === 'arrodillado' ? { acc: 'morir' as const, f: pose === 'sentado' ? 4 : 3 } : { acc: 'morir' as const, f: 7 };
  let ps = cuerpo({ cu, eq, ...acc, dir: 'se' });
  if (pose === 'boca_abajo') ps = transformar(ps, ejeAng([1, 0, 0], 180), [0, 0, 7]);
  ps = tenir(ps, 'ahg_ah', '#34504c', 0.5, -0.15);
  return transformar(ps, rotM(giro), t);
}
registrar(
  {
    id: 'ahg_farol_pescador', nombre: ['Farol de pescador', 'Fisherman lantern'], tema: TEMA, variantes: ['poste', 'colgado', 'suelo', 'gancho', 'doble'], cuadros: 8, t: 3, huella: [1, 1], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], k = 0.5 + 0.35 * onda(f, 8) + 0.15 * onda(f * 3, 8, 1);
      let c: V3 = [0, 0, 0];
      if (v === 'suelo') { c = [0, 0, 0]; farol(a, ps, c, 1.3, k); ps.push(...roca(a, [-6, 4, 0], [5, 4, 3], { mat: 'ahg_roca', facetas: 1, n: 3 })); }
      else if (v === 'poste' || v === 'doble') {
        ps.push(a.cilindro(0, 0, 0, 1.6, 44, { mat: WL, r1: 1.2, incl: jit(a, 4) }), a.palo([0, 0, 40], [9, 0, 43], 0.8, { mat: WL }));
        if (v === 'doble') ps.push(a.palo([0, 0, 40], [-9, 0, 43], 0.8, { mat: WL }));
        percebes(a, ps, [1.5, 0, 4], [1, 0, 0], 4, 3);
        const sw = onda(f, 8) * 1.2;
        for (const x of v === 'doble' ? [9, -9] : [9]) { ps.push(a.palo([x, 0, 43], [x + sw, 0, 37], 0.3, { mat: HI })); farol(a, ps, [x + sw, 0, 28], 1, k); }
        c = [9, 0, 31];
      } else if (v === 'gancho') {
        ps.push(a.palo([0, 0, 0], [3, 0, 30], 1.4, { mat: WL, r1: 1 }), a.palo([3, 0, 30], [0, 0, 36], 0.9, { mat: WL }));
        farol(a, ps, [-0.5, 0, 24], 1, k); c = [0, 0, 27];
      } else {
        // colgado de una soga entre dos palos, se mece con el viento
        for (const y of [-14, 14]) ps.push(a.cilindro(0, y, 0, 1.3, 40, { mat: WL, r1: 1 }));
        const sw = onda(f, 8) * 2.5, m: V3 = [sw, 0, 33];
        const pts = catenaria([0, -14, 39], [0, 14, 39], 4, 6); for (let i = 0; i < pts.length - 1; i++) ps.push(a.palo(pts[i], pts[i + 1], 0.35, { mat: 'ahg_soga' }));
        ps.push(a.palo([0, 0, 35], m, 0.3, { mat: 'ahg_soga' })); farol(a, ps, [m[0], 0, 24], 1, k); c = [m[0], 0, 27];
      }
      return { piezas: ps, resplandor: { c, r: 34 + k * 8, color: '#e0a040' } };
    },
  },
  {
    id: 'ahg_marino_ahogado', nombre: ['Marino ahogado', 'Drowned sailor'], tema: TEMA, variantes: ['tendido', 'sentado', 'boca_abajo', 'enredado', 'contra_ancla'], huella: [2, 2], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], g = a.r() * 360;
      ps.push(charco(a, 22, 16));
      if (v === 'contra_ancla') {
        ps.push(a.cilindro(-8, 0, 0, 2.6, 34, { mat: HI, r1: 2.2, incl: -10 }), a.palo([-8, -12, 30], [-8, 12, 30], 1.8, { mat: HI }));
        ps.push(...ahogado(a, 'sentado', 0, [-1, 0, 0]));
      } else ps.push(...ahogado(a, v === 'enredado' ? 'tendido' : v === 'sentado' ? 'sentado' : v === 'boca_abajo' ? 'boca_abajo' : 'tendido', g, [0, 0, 0]));
      if (v === 'enredado') {
        // red y algas encima del cuerpo
        for (let i = 0; i < 6; i++) { const y = -12 + i * 4.5; ps.push(a.palo([-14, y, 2], [14, y + jit(a, 3), 4 + a.r() * 3], 0.35, { mat: 'ahg_soga' })); }
        for (let i = 0; i < 6; i++) { const x = -12 + i * 4.5; ps.push(a.palo([x, -14, 2], [x + jit(a, 3), 14, 3 + a.r() * 3], 0.35, { mat: 'ahg_soga' })); }
      }
      const cs: Comp[] = [];
      for (let i = 0; i < 4; i++) cs.push(...alga([jit(a, 10), jit(a, 10), 6], 10, 0.5, 0, 1, a.seed + i, { viento: [jit(a, 1.5), jit(a, 1.5), 0] }));
      ps.push(masa(cs.map((c) => (c.f === 'hueso' ? hueso([c.a[0], c.a[1], Math.max(1, c.a[2] * 0.3)], [c.b[0], c.b[1], Math.max(1, c.b[2] * 0.3)], c.r0, c.r1, { mat: 'ahg_alga' }) : c)), { mat: 'ahg_alga', suave: 0.4 }));
      for (let i = 0; i < 2; i++) pez(a, ps, [jit(a, 16), jit(a, 14), 0.9], 8 + a.r() * 4, a.r() * 360);
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'ahg_tentaculo', nombre: ['Tentáculos que asoman del agua', 'Tentacles from the water'], tema: TEMA, variantes: ['uno', 'tres', 'enroscado', 'muchos', 'con_marino'], cuadros: 8, t: 3, huella: [3, 3], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], n = v === 'uno' || v === 'enroscado' || v === 'con_marino' ? 1 : v === 'tres' ? 3 : 5, ph = ciclo(f, 8) * TAU;
      const brazos: { c: V3; L: number; r: number; g: number; fase: number }[] = [];
      for (let i = 0; i < n; i++) { const an = (i / n) * TAU + a.r(), d = n > 1 ? 10 + a.r() * 10 : 0; brazos.push({ c: [Math.cos(an) * d, Math.sin(an) * d, -3], L: (i === 0 ? 78 : 44 + a.r() * 26) * (v === 'muchos' && i ? 0.8 : 1), r: i === 0 ? 7 : 4.5 + a.r() * 1.5, g: n === 1 ? elegir(a, [-45, 135]) + jit(a, 25) : a.r() * 360, fase: a.r() * TAU }); }
      for (const [i, b] of brazos.entries()) {
        // el brazo sube, se arquea y la punta se enrosca; la curva respira con el cuadro
        const N = 11, cs: Comp[] = [], pts: V3[] = [];
        const enr = v === 'enroscado' && i === 0 ? 1.8 : 1;
        for (let k = 0; k <= N; k++) {
          const t = k / N, curva = t * t * (2.2 + 0.4 * Math.sin(ph + b.fase)) * enr + 0.15 * Math.sin(ph * 1 + t * 4 + b.fase) * t, lado = 0.4 * Math.sin(ph + t * 3 + b.fase) * t;
          const x = Math.sin(curva) * b.L * 0.42 * (t + 0.15), z = b.L * (t * 0.85 - Math.max(0, t - 0.55) * (1 - Math.cos(curva)) * 0.8), y = lado * b.L * 0.2;
          const cg = Math.cos(rad(b.g)), sg = Math.sin(rad(b.g));
          pts.push(add(b.c, [x * cg - y * sg, x * sg + y * cg, z]));
        }
        for (let k = 0; k < N; k++) { const t0 = k / N, t1 = (k + 1) / N; cs.push(hueso(pts[k], pts[k + 1], b.r * (1 - t0 * 0.88), b.r * (1 - t1 * 0.88) + 0.2, { mat: 'ahg_tentaculo' })); }
        ps.push(masa(cs, { mat: 'ahg_tentaculo', suave: b.r * 0.3 }));
        // ventosas pálidas en la cara de adentro de la curva
        for (let k = 2; k < N - 1; k++) {
          const t = k / N, p = pts[k], d = nor(sub(pts[k + 1], pts[k - 1])), dentro = nor(sub(mez(pts[k - 1], pts[k + 1], 0.5), p));
          const nn = len(dentro) > 0.01 ? dentro : lat(d), r = b.r * (1 - t * 0.88);
          for (const s2 of [-0.45, 0.45]) { const w = nor(add(nn, cruz(d, nn), s2)); ps.push(a.elipsoide(...add(p, w, r * 0.92), r * 0.32 + 0.3, r * 0.32 + 0.3, r * 0.14 + 0.2, { mat: 'ahg_ventosa' })); }
        }
        ondas(ps, [b.c[0], b.c[1], 0], b.r * 2.4, f + i * 3, 8, 2);
      }
      if (v === 'con_marino') { const g = rad(brazos[0].g); ps.push(...ahogado(a, 'boca_abajo', brazos[0].g + 90, [Math.cos(g) * 26, Math.sin(g) * 26, 0])); }
      ps.push(charco(a, 30, 26, { n: 8 }), suelo(a));
      return ps;
    },
  },
  {
    id: 'ahg_algas_colgantes', nombre: ['Algas colgantes', 'Hanging kelp'], tema: TEMA, variantes: ['viga', 'arco', 'cortina', 'erguidas'], cuadros: 8, t: 4, huella: [3, 1], bloquea: false,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      let bases: V3[] = [], largo = 30;
      if (v === 'viga') { ps.push(a.cilindro(0, -24, 0, 1.8, 52, { mat: WL }), a.cilindro(0, 24, 0, 1.8, 52, { mat: WL }), a.caja(0, 0, 52, 4, 54, 4, { mat: WL })); bases = Array.from({ length: 9 }, (_, i) => [jit(a, 1.5), -20 + i * 5 + jit(a, 1.5), 52]); largo = 34; }
      else if (v === 'arco') { for (let i = 0; i <= 8; i++) { const t = i / 8, an = t * PI; ps.push(a.caja(0, -Math.cos(an) * 22, 40 + Math.sin(an) * 18, 8, 7, 7, { mat: P, tono: jit(a, 0.05) })); if (i % 2 === 0 && i && i < 8) bases.push([0, -Math.cos(an) * 22, 40 + Math.sin(an) * 18]); } for (const y of [-22, 22]) ps.push(a.caja(0, y, 0, 8, 8, 42, { mat: P })); largo = 30; bases.push([3, -12, 54], [3, 12, 54], [-3, 0, 57]); }
      else if (v === 'cortina') { ps.push(a.caja(0, 0, 60, 6, 56, 5, { mat: P })); for (const y of [-26, 26]) ps.push(a.caja(0, y, 0, 6, 6, 60, { mat: P })); bases = Array.from({ length: 13 }, (_, i) => [jit(a, 2), -22 + i * 3.7, 60]); largo = 52; }
      else { bases = Array.from({ length: 10 }, () => [jit(a, 14), jit(a, 22), 0] as V3); ps.push(charco(a, 20, 28)); }
      const ag = algas(bases, largo, 1, f, 8, a.seed, { arriba: v === 'erguidas' });
      if (ag) ps.push(ag);
      // hojas anchas de laminaria en algunas puntas
      for (let i = 0; i < bases.length; i += 3) { const b = bases[i], dz = v === 'erguidas' ? largo * 0.8 : -largo * 0.7, sw = onda(f, 8, i) * 2; ps.push(a.elipsoide(b[0] + sw, b[1], b[2] + dz, 0.6, 1.8, 7, { mat: 'ahg_alga_parda', giro: a.r() * 180, incl: jit(a, 8) })); }
      return ps;
    },
  },
);

// ------------------------------------------------------------------ 6. la ciudad: casas hundidas, escaleras, muelles y el barco-pueblo
/** Tabla suelta o clavada: caja fina con giro e inclinación y un tono propio. */
const tabla = (a: Arma, c: V3, largo: number, ancho: number, giro: number, incl = 0, mat = W) => a.caja(c[0], c[1], c[2], largo, ancho, 1.1, { mat, giro, incl, inclEje: 'y', tono: jit(a, 0.07) });
/** Pilote de madera con percebes y la línea verde de la marea. */
function pilote(a: Arma, ps: Pieza[], x: number, y: number, alto: number, r = 2) {
  ps.push(a.cilindro(x, y, -2, r, alto + 2, { mat: WL, r1: r * 0.9, incl: jit(a, 3) }));
  ps.push(a.cilindro(x, y, -2, r + 0.25, 7 + a.r() * 4, { mat: 'ahg_alga', tono: -0.05 }));
  percebes(a, ps, [x, y, 3], [1, 0.3, 0], 4, 2.5, 0.8);
}
registrar(
  dosEjes({
    id: 'ahg_puerta_hundida', nombre: ['Puerta de casa hundida', 'Sunken house door'], tema: TEMA, variantes: ['cerrada', 'abierta', 'tapiada', 'con_ventana', 'con_farol'], cuadros: 8, t: 4, huella: [3, 1], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], Ww = 44, H = 62 + a.r() * 12, hun = 6 + a.r() * 6;
      // muro de la casa con la puerta ojival, hundido hasta la rodilla
      ps.push(a.caja(0, 0, -hun, 10, Ww, H, { mat: P }));
      ps.push(a.caja(0, 0, -hun, 12, 18, 40, { mat: P, resta: true }), a.cilindro(0, -9, 34 - hun, 9, 12, { mat: P, eje: [1, 0, 0], resta: true }));
      // jambas y dintel
      for (const y of [-10, 10]) ps.push(a.caja(5, y, -hun, 2, 3, 40, { mat: PL, tono: 0.05 }));
      if (v === 'abierta') ps.push(a.caja(-2, -6, -hun, 2, 2, 38, { mat: W, giro: 60 }), ...[0, 1, 2].map((k) => tabla(a, [3 + k * 2, -12 - k * 3, -hun + 4 + k * 12], 14, 3, 60, 90)));
      else {
        // la puerta de tablas, con tablas que faltan
        for (let k = 0; k < 5; k++) if (v === 'tapiada' || a.r() > 0.15) ps.push(a.caja(-1, -7.2 + k * 3.6, -hun, 2, 3.4, 38 + (k === 2 ? 4 : k % 4 ? 2 : 0), { mat: W, tono: jit(a, 0.06) }));
        ps.push(a.caja(0.3, 6, 18 - hun, 1, 1.2, 4, { mat: HI }), a.esfera(0.5, 6, 20 - hun, 1.3, { mat: HI }));
      }
      if (v === 'tapiada') for (let k = 0; k < 3; k++) ps.push(tabla(a, [6, 0, 6 + k * 10 - hun], 2, 24, 0, 90 + jit(a, 12)), ...[-7, 7].map((y) => a.esfera(6.6, y, 6 + k * 10 - hun, 0.6, { mat: HI })));
      // ventana del piso de arriba con su postigo colgando
      if (v === 'con_ventana' || v === 'con_farol') { ps.push(a.caja(0, 12, 50 - hun, 12, 8, 10, { mat: 'negro', resta: true }), a.caja(5, 12, 49 - hun, 2, 10, 1.4, { mat: PL })); ps.push(a.caja(5.5, 18, 46 - hun, 1, 7, 12, { mat: W, giro: 25 + onda(f, 8) * 5 })); }
      // alero de pizarra y el tejado que asoma
      ps.push(a.caja(4, 0, H - hun, 8, Ww + 4, 2, { mat: 'pizarra' }));
      // marca de la marea: costra de algas y percebes en la base
      for (let k = 0; k < 4; k++) costra(a, ps, [5, jit(a, Ww / 2), 4 + a.r() * 8], [1, 0, 0], 6, a.r() < 0.5 ? 'ahg_alga' : 'ahg_sal');
      for (let k = 0; k < 3; k++) percebes(a, ps, [5, elegir(a, [-16, 16]) + jit(a, 4), 2 + a.r() * 10], [1, 0, 0], 6, 4);
      const ag = algas(Array.from({ length: 5 }, () => [5.5, jit(a, Ww / 2), H - hun - 1] as V3), 20, 0.7, f, 8, a.seed);
      if (ag) ps.push(ag);
      let luz: Escena['resplandor'] | undefined;
      if (v === 'con_farol') { const k = 0.5 + 0.4 * onda(f, 8); ps.push(a.palo([5, -14, 40 - hun], [11, -14, 43 - hun], 0.6, { mat: HI })); farol(a, ps, [11, -14, 30 - hun], 0.9, k); luz = { c: [12, -14, 33 - hun], r: 30 + k * 6, color: '#e0a040' }; }
      ps.push(charco(a, 18, 28, { x: 12 }));
      ondas(ps, [12, jit(a, 10), 0], 8, f, 8, 1);
      ps.push(suelo(a));
      return luz ? { piezas: ps, resplandor: luz } : ps;
    },
  }),
  dosEjes({
    id: 'ahg_escalera_agua', nombre: ['Escalera que baja al agua', 'Stairs into the water'], tema: TEMA, variantes: ['recta', 'rota', 'con_baranda', 'con_arco'], cuadros: 8, t: 5, huella: [4, 2], bloquea: false,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], n = 9, paso = 6.5, alto = 4.2, ancho = 22;
      // los escalones bajan hacia +x y se meten en el agua (lo de abajo del piso no se ve)
      for (let i = 0; i < n; i++) {
        const x = -26 + i * paso, z = (5 - i) * alto;
        if (v === 'rota' && i > 2 && a.r() < 0.35) { ps.push(pena(a, x + jit(a, 3), jit(a, 6), Math.max(0.5, z - 3), 4, 6, 2.5, { mat: P })); continue; }
        ps.push(a.caja(x, 0, z - 30, paso + 0.4, ancho, 30 + alto - (i > 5 ? 0 : 0), { mat: P, tono: jit(a, 0.05) - i * 0.015 }));
        if (z < 6) { costra(a, ps, [x, jit(a, 6), z + alto], [0, 0, 1], 5, 'ahg_alga'); percebes(a, ps, [x + paso / 2, jit(a, 8), z + 1], [1, 0, 0], 3, 3); }
      }
      // muretes a los lados
      for (const s of [-1, 1]) {
        ps.push(a.poliedro([[-30, s * (ancho / 2 + 2), -2], [-30, s * (ancho / 2 + 2), 30], [-22, s * (ancho / 2 + 2), 30], [32, s * (ancho / 2 + 2), -2], [-30, s * (ancho / 2 + 6), -2], [-30, s * (ancho / 2 + 6), 30], [-22, s * (ancho / 2 + 6), 30], [32, s * (ancho / 2 + 6), -2]], { mat: P }));
        if (v === 'con_baranda') for (let k = 0; k < 5; k++) { const x = -24 + k * 12, z = 30 - (x + 22) * 0.6; ps.push(a.cilindro(x, s * (ancho / 2 + 4), Math.max(z, 0), 0.9, 10, { mat: HI })); }
        if (v === 'con_baranda') ps.push(a.palo([-24, s * (ancho / 2 + 4), 40], [24, s * (ancho / 2 + 4), 10], 0.8, { mat: HI }));
      }
      if (v === 'con_arco') {
        for (const s of [-1, 1]) ps.push(a.caja(-24, s * (ancho / 2 + 4), 0, 8, 6, 70, { mat: P }));
        for (let i = 0; i <= 8; i++) { const t = i / 8, an = t * PI; ps.push(a.caja(-24, -Math.cos(an) * (ancho / 2 + 4), 68 + Math.sin(an) * 14, 8, 6, 6, { mat: P, tono: jit(a, 0.05) })); }
      }
      ps.push(charco(a, 24, 20, { x: 26 }));
      ondas(ps, [24, jit(a, 6), 0], 10, f, 8, 2);
      const ag = algas(Array.from({ length: 4 }, () => [-4 + a.r() * 24, elegir(a, [-1, 1]) * (ancho / 2 + 4), 22] as V3), 14, 0.6, f, 8, a.seed);
      if (ag) ps.push(ag);
      ps.push(suelo(a));
      return ps;
    },
  }),
  dosEjes({
    id: 'ahg_muelle', nombre: ['Muelle de tablones', 'Plank pier'], tema: TEMA, variantes: ['tramo', 'punta', 'roto', 'con_bote'], cuadros: 8, t: 5, huella: [5, 2], bloquea: false,
    armar: (v, f, a) => {
      const ps: Pieza[] = [], L = 80, A = 24, z = 12;
      for (const x of [-34, -6, 22]) for (const y of [-10, 10]) { if (v === 'roto' && x > 10 && y > 0) continue; pilote(a, ps, x, y, z + (v === 'punta' && x > 20 ? 10 : 0)); }
      // largueros y tablones cruzados, alguno torcido o faltante
      for (const y of [-9, 9]) ps.push(a.caja(0, y, z - 3, L, 2.4, 3, { mat: WL, incl: v === 'roto' && y > 0 ? 6 : 0, inclEje: 'y' }));
      const nt = Math.round(L / 4.4);
      for (let i = 0; i < nt; i++) {
        const x = -L / 2 + 2 + i * 4.4, roto = v === 'roto' && x > 4;
        if ((roto && a.r() < 0.55) || a.r() < 0.06) continue;
        ps.push(a.caja(x, jit(a, 0.6), z + (roto ? -(x - 4) * 0.12 : 0), 4, A + jit(a, 1.5), 1.2, { mat: W, giro: jit(a, 3), incl: roto ? jit(a, 10) : 0, tono: jit(a, 0.08) }));
      }
      // bolardo con la amarra, cuerda enrollada
      ps.push(a.cilindro(-30, 8, z + 1, 2, 6, { mat: WL, r1: 1.6 }), a.esfera(-30, 8, z + 7, 2.2, { mat: WL }));
      for (let k = 0; k < 3; k++) ps.push({ k: 'elip', c: [-22, -6, z + 1.6 + k * 0.9], ex: [1, 0, 0], ey: [0, 1, 0], ez: [0, 0, 1], r: [3.4 - k * 0.5, 3.4 - k * 0.5, 0.6], mat: 'ahg_soga' } as Pieza);
      if (v === 'punta') { ps.push(a.cilindro(34, -10, z, 1.4, 22, { mat: WL }), a.palo([34, -10, z + 20], [38, -10, z + 22], 0.6, { mat: HI })); farol(a, ps, [38.5, -10, z + 12], 0.9, 0.6 + 0.3 * onda(f, 8)); }
      if (v === 'con_bote') {
        const bl: Pieza[] = [];
        casco(a, bl, { L: 17, W: 6, D: 6, u0: -1, u1: 1, secciones: 6, tracas: 3, costillas: false });
        ps.push(...transformar(bl, rotM(0, 4 + onda(f, 8) * 2, 0), [10, 24, -1.5 + onda(f, 8) * 0.4]));
        const pts = catenaria([18, 10, z + 1], [20, 22, 4], 3, 5); for (let i = 0; i < pts.length - 1; i++) ps.push(a.palo(pts[i], pts[i + 1], 0.35, { mat: 'ahg_soga' }));
      }
      ps.push(charco(a, 46, 22, { n: 7 }));
      ondas(ps, [22, -10, 0], 6, f, 8, 1);
      ps.push(suelo(a));
      return v === 'punta' ? { piezas: ps, resplandor: { c: [38, -10, z + 15], r: 32, color: '#e0a040' } } : ps;
    },
  }),
  {
    id: 'ahg_tablones', nombre: ['Tablones del naufragio', 'Wreck planks'], tema: TEMA, variantes: ['pila', 'pasarela', 'sueltos', 'con_sogas'], huella: [3, 2], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      if (v === 'pila' || v === 'con_sogas') {
        for (let k = 0; k < 7; k++) { const g = jit(a, 12) + (k % 2) * 6; ps.push(a.caja(jit(a, 2), jit(a, 3), k * 1.3, 36 + jit(a, 6), 4.2, 1.2, { mat: W, giro: g, tono: jit(a, 0.07) })); }
        if (v === 'con_sogas') for (const x of [-10, 10]) for (let k = 0; k < 4; k++) ps.push(a.palo([x, -3, k * 2.4], [x + 0.6, 3, k * 2.4 + 1.2], 0.45, { mat: 'ahg_soga' }));
      } else if (v === 'pasarela') {
        // tablones tendidos sobre piedras de un charco a otro
        for (let k = 0; k < 3; k++) ps.push(...roca(a, [-24 + k * 24, jit(a, 3), 0], [5, 6, 3], { mat: 'ahg_roca', facetas: 1, n: 3 }));
        for (let k = 0; k < 4; k++) ps.push(a.caja(-12 + (k >> 1) * 24, -3.5 + (k % 2) * 4.6, 3.6, 25, 4.2, 1.2, { mat: W, giro: jit(a, 4), tono: jit(a, 0.07) }));
        ps.push(charco(a, 36, 16));
      } else for (let k = 0; k < 6; k++) ps.push(tabla(a, [jit(a, 22), jit(a, 16), 0.6 + a.r() * 1.5], 16 + a.r() * 16, 3.6, a.r() * 180, jit(a, 6)));
      for (let k = 0; k < 3; k++) percebes(a, ps, [jit(a, 12), jit(a, 5), 4], [0, 0, 1], 3, 2, 0.8);
      return ps;
    },
  },
  {
    id: 'ahg_vela_raida', nombre: ['Vela raída', 'Tattered sail'], tema: TEMA, variantes: ['bastidor', 'toldo', 'colgada', 'en_verga'], cuadros: 8, t: 4, huella: [3, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      if (v === 'bastidor') {
        for (const y of [-20, 20]) ps.push(a.cilindro(0, y, 0, 1.4, 56, { mat: WL, r1: 1.1 }));
        ps.push(a.palo([0, -21, 54], [0, 21, 54], 1, { mat: WL }));
        tela(a, ps, { p0: [0, -19, 53], u: [0, 1, 0], ancho: 38, alto: 46, f, n: 8, mat: 'ahg_vela', jirones: 0.6, nu: 6, nv: 7, amp: 2.8, viento: 0.5 });
      } else if (v === 'toldo') {
        // toldo de vela vieja sobre dos palos, caído de un lado
        for (const [x, y, h] of [[12, -18, 34], [12, 18, 34], [-14, -18, 20], [-14, 18, 20]] as [number, number, number][]) ps.push(a.cilindro(x, y, 0, 1.2, h, { mat: WL }));
        tela(a, ps, { p0: [12, -18, 34], u: [0, 1, 0], abajo: nor([-26, 0, -14]), ancho: 36, alto: 30, f, n: 8, mat: 'ahg_vela', jirones: 0.35, nu: 6, nv: 5, amp: 1.4, viento: 0.2 });
      } else if (v === 'colgada') {
        for (const y of [-22, 22]) ps.push(a.cilindro(0, y, 0, 1.3, 50, { mat: WL }));
        const pts = catenaria([0, -22, 49], [0, 22, 49], 5, 6); for (let i = 0; i < pts.length - 1; i++) ps.push(a.palo(pts[i], pts[i + 1], 0.35, { mat: 'ahg_soga' }));
        tela(a, ps, { p0: [0, -16, 46], u: [0, 1, 0], ancho: 30, alto: 34, f, n: 8, mat: 'ahg_vela', jirones: 0.8, nu: 5, nv: 6, amp: 3.2, viento: 0.7 });
      } else {
        ps.push(a.cilindro(-6, 0, 0, 2.2, 74, { mat: WL, r1: 1.6, incl: 6 }), a.palo([-1, -26, 66], [-1, 26, 70], 1.2, { mat: WL }));
        tela(a, ps, { p0: [0, -24, 66], u: nor([0, 1, 0.08]), ancho: 46, alto: 40, f, n: 8, mat: 'ahg_vela', jirones: 0.75, nu: 6, nv: 6, amp: 3.5, viento: 0.6 });
      }
      ps.push(charco(a, 22, 18));
      return ps;
    },
  },
  {
    id: 'ahg_peces_muertos', nombre: ['Peces muertos', 'Dead fish'], tema: TEMA, variantes: ['pocos', 'montón', 'en_cesta', 'ensartados', 'podridos'], huella: [2, 2], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      if (v === 'en_cesta') {
        ps.push(a.cilindro(0, 0, 0, 9, 9, { mat: 'paja', r1: 10.5 }), a.cilindro(0, 0, 1.5, 8, 9, { mat: 'paja', resta: true }));
        for (let i = 0; i < 6; i++) pez(a, ps, [jit(a, 5), jit(a, 5), 7 + a.r() * 2], 9 + a.r() * 3, a.r() * 360, { incl: jit(a, 40) });
      } else if (v === 'ensartados') {
        for (const y of [-14, 14]) ps.push(a.cilindro(0, y, 0, 1, 34, { mat: WL }));
        ps.push(a.palo([0, -15, 32], [0, 15, 32], 0.6, { mat: 'ahg_soga' }));
        for (let i = 0; i < 6; i++) { const y = -11 + i * 4.4; ps.push(a.palo([0, y, 32], [0, y, 28], 0.25, { mat: 'ahg_soga' })); const tmp: Pieza[] = []; pez(a, tmp, [0, 0, 0], 10, 0); ps.push(...transformar(tmp, ejeAng([0, 1, 0], -90 + jit(a, 10)), [0, y, 23])); }
      } else {
        const n = v === 'pocos' ? 4 : v === 'podridos' ? 6 : 14;
        for (let i = 0; i < n; i++) pez(a, ps, [jit(a, v === 'montón' ? 10 : 18), jit(a, v === 'montón' ? 10 : 18), 1 + (v === 'montón' ? a.r() * 5 : 0)], 8 + a.r() * 6, a.r() * 360, { incl: jit(a, 20), podrido: v === 'podridos' });
        if (v === 'podridos') for (let i = 0; i < 4; i++) huesoLargo(ps, [jit(a, 14), jit(a, 14), 0.8], [jit(a, 14), jit(a, 14), 0.8], 0.5);
        ps.push(charco(a, 20, 18));
      }
      return ps;
    },
  },
);

// ------------------------------------------------------------------ 7. el barco varado que sirve de pueblo y lo que queda en la playa
registrar(
  {
    id: 'ahg_casco_pueblo', nombre: ['Casco varado hecho pueblo', 'Beached hull village'], tema: TEMA, variantes: ['chozas', 'faroles', 'mercado', 'abandonado'], cuadros: 8, t: 4, huella: [9, 4], bloquea: true,
    armar: (v, f, a) => {
      const loc: Pieza[] = [];
      const k = casco(a, loc, { L: 72, W: 22, D: 30, u0: -1, u1: 1, podrido: v === 'abandonado' ? 0.45 : 0.08, cubierta: true, secciones: 11, tracas: 6 });
      const hd = k.borda(0) - 4 + 0.6;
      // chozas de tablas sobre la cubierta con techos de vela y tablas
      const chozas: [number, number, number, number][] = [[-40, 0, 26, 30], [-6, -6, 18, 16], [22, 4, 16, 14]];
      chozas.forEach(([x, y, w, h], i) => {
        if (v === 'abandonado' && i === 2) return;
        loc.push(a.caja(x, y, hd, w, w * 0.85, h, { mat: W, tono: jit(a, 0.05) }));
        loc.push(a.caja(x + w / 2, y, hd, 1.5, 5, 10, { mat: 'negro', resta: true }), a.caja(x + w / 2 - 0.2, y + w * 0.25, hd + h * 0.55, 1, 4, 4, { mat: v === 'faroles' || v === 'mercado' ? 'ahg_luz' : 'negro', tono: -0.1 }));
        const r = hd + h;
        loc.push(a.poliedro([[x - w / 2 - 2, y - w * 0.5, r], [x + w / 2 + 2, y - w * 0.5, r], [x - w / 2 - 2, y + w * 0.5, r], [x + w / 2 + 2, y + w * 0.5, r], [x - w / 2 - 2, y, r + w * 0.4], [x + w / 2 + 2, y, r + w * 0.4], [x - w / 2 - 2, y - w * 0.5, r + 1], [x + w / 2 + 2, y + w * 0.5, r + 1]], { mat: i % 2 ? 'ahg_vela' : 'ahg_madera', tono: -0.03 }));
        // chimenea de chapa
        if (i === 0) loc.push(a.cilindro(x - 4, y + 6, r, 1.6, 16, { mat: HI }));
      });
      // el palo mayor sirve de poste del toldo; sogas con ropa y pescado secándose
      const top = mastil(a, loc, [8, 0, hd], 92, 3, { roto: 0.8, verga: true, vela: true, f, n: 8 });
      for (const [p, q] of [[[-40, -12, hd + 34], [8, 0, hd + 48]], [[8, 0, hd + 40], [38, 0, hd + 18]]] as [V3, V3][]) {
        const pts = catenaria(p, q, 5, 7); for (let i = 0; i < pts.length - 1; i++) loc.push(a.palo(pts[i], pts[i + 1], 0.3, { mat: 'ahg_soga' }));
        for (let i = 1; i < pts.length - 1; i += 2) { const tmp: Pieza[] = []; pez(a, tmp, [0, 0, 0], 7, 0); loc.push(...transformar(tmp, ejeAng([0, 1, 0], -90 + onda(f, 8, i) * 8), add(pts[i], [0, 0, -4]))); }
      }
      void top;
      // escalera de mano hasta la arena y una pasarela de tablones
      for (const s of [-1, 1]) loc.push(a.palo([-20, 22 + s * 4, 0], [-20, 15 + s * 4, hd], 0.8, { mat: WL }));
      for (let i = 1; i < 7; i++) loc.push(a.palo([-20, 22 - 4 - i * 1, (i / 7) * hd], [-20, 22 + 4 - i * 1, (i / 7) * hd], 0.6, { mat: WL }));
      let luz: Escena['resplandor'] | undefined;
      if (v === 'faroles' || v === 'mercado') {
        const kk = 0.5 + 0.4 * onda(f, 8);
        for (const [x, y] of [[-26, -12], [10, 14], [34, -8]]) { loc.push(a.palo([x, y, hd + 8], [x, y, hd + 26], 0.7, { mat: WL })); farol(a, loc, [x, y, hd + 17], 0.8, kk); }
        luz = { c: [0, 0, hd + 20], r: 70 + kk * 10, color: '#e0a040' };
        if (v === 'mercado') for (let i = 0; i < 4; i++) { const x = -20 + i * 14; loc.push(a.cilindro(x, 26 + a.r() * 6, 0, 4.5, 10, { mat: W, r1: 5 }), a.cilindro(x, 26, 0, 4.5, 10, { mat: W }).k === 'cono' ? a.cilindro(x, 26 + a.r() * 6, 0, 4.5, 0.1, { mat: W }) : a.esfera(0, 0, 0, 0.1, { mat: W })); }
      }
      // percebes y algas en el casco
      for (let i = 0; i < 8; i++) { const u = -0.9 + a.r() * 1.8, s = elegir(a, [1, -1]); percebes(a, loc, k.pt(u, s, 0.3 + a.r() * 0.3), [0, s, -0.3], 5, 4); }
      const ag = algas(Array.from({ length: 10 }, () => k.pt(-0.9 + a.r() * 1.8, elegir(a, [1, -1]), 0.96)), 16, 0.8, f, 8, a.seed);
      if (ag) loc.push(ag);
      const ps = mover(loc, 0, [0, 0, -6], 4 + jit(a, 3), jit(a, 2));
      ps.push(manto(a, 70, 34, 9, 'ahg_arena', 2.2), charco(a, 30, 18, { x: 40, y: -20 }), suelo(a));
      return luz ? { piezas: ps, resplandor: luz } : ps;
    },
  },
  {
    id: 'ahg_bote_roto', nombre: ['Bote roto', 'Broken rowboat'], tema: TEMA, variantes: ['volcado', 'partido', 'lleno_de_agua', 'con_remos'], huella: [3, 2], bloquea: true,
    armar: (v, _f, a) => {
      const loc: Pieza[] = [];
      casco(a, loc, { L: 22, W: 8, D: 8, u0: -1, u1: 1, secciones: 7, tracas: 4, roto: v === 'partido' ? 0.1 : undefined, rotoLado: 1, podrido: 0.4, costillas: true });
      if (v === 'lleno_de_agua') loc.push(a.elipsoide(0, 0, 3.5, 18, 6.5, 1, { mat: AG }));
      for (const y of [-3, 3]) loc.push(a.caja(-4 + y * 2, 0, 5, 3, 13, 1.1, { mat: W }));
      if (v === 'con_remos') for (const s of [-1, 1]) loc.push(a.palo([2, s * 6, 7], [-8, s * 26, 0.6], 0.7, { mat: WL }), a.caja(-8, s * 25, 0.5, 2, 7, 0.8, { mat: WL, giro: 20 * s }));
      const ps = v === 'volcado' ? mover(loc, a.r() * 360, [0, 0, 8.5], 180 + jit(a, 6), 0) : mover(loc, a.r() * 360, [0, 0, -1.5], jit(a, 10), jit(a, 4));
      for (let i = 0; i < 3; i++) percebes(a, ps, [jit(a, 10), jit(a, 4), 5], [0, 0, 1], 3, 3);
      ps.push(charco(a, 22, 14), suelo(a));
      return ps;
    },
  },
  {
    id: 'ahg_ballena_huesos', nombre: ['Huesos de ballena', 'Whale bones'], tema: TEMA, variantes: ['entera', 'costillar', 'craneo', 'arco_de_quijadas'], huella: [7, 4], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], g = a.r() * 360;
      const loc: Pieza[] = [];
      if (v !== 'craneo' && v !== 'arco_de_quijadas') costillar(a, loc, [0, 0, 22], v === 'entera' ? 100 : 64, 26, 0, { mat: 'ahg_coral', n: v === 'entera' ? 12 : 8, grueso: 2.4, rotas: 0.15, alto: 22 });
      if (v === 'entera' || v === 'craneo') {
        // cráneo largo y chato con las mandíbulas abiertas
        const x0 = v === 'entera' ? 58 : 0, cs: Comp[] = [bulto([x0, 0, 10], [18, 14, 9], { mat: 'ahg_coral' }), hueso([x0, 0, 12], [x0 + 46, 0, 6], 9, 3, { mat: 'ahg_coral' })];
        for (const s of [-1, 1]) cs.push(hueso([x0 - 6, s * 10, 4], [x0 + 44, s * 8, 0.6], 3.2, 1.6, { mat: 'ahg_coral' }));
        loc.push(masa(cs, { mat: 'ahg_coral', suave: 2.5 }));
        for (const s of [-1, 1]) loc.push(a.elipsoide(x0 + 2, s * 12, 12, 3.5, 2.5, 3, { mat: 'negro' }));
      }
      if (v === 'arco_de_quijadas') {
        // dos quijadas clavadas en la arena formando un arco
        for (const s of [-1, 1]) { const cs: Comp[] = []; let prev: V3 = [0, s * 22, -2]; for (let i = 1; i <= 6; i++) { const t = i / 6, q: V3 = [Math.sin(t * 2) * 4, s * 22 * Math.cos(t * PI * 0.48), -2 + Math.sin(t * PI * 0.5) * 86]; cs.push(hueso(prev, q, 4.2 - t * 1.6, 4 - t * 1.8, { mat: 'ahg_coral' })); prev = q; } loc.push(masa(cs, { mat: 'ahg_coral', suave: 1.5 })); }
        const ag = algas([[2, -6, 82], [2, 6, 82], [3, 0, 84]], 20, 0.7, 0, 1, a.seed);
        if (ag) loc.push(ag);
      }
      for (let i = 0; i < 6; i++) percebes(a, loc, [jit(a, 40), jit(a, 20), 2 + a.r() * 20], [0, 0, 1], 4, 3);
      ps.push(...mover(loc, g, [0, 0, -2]), manto(a, 56, 30, 8, 'ahg_arena', 2), charco(a, 28, 16, { x: jit(a, 20) }), suelo(a));
      return ps;
    },
  },
  {
    id: 'ahg_boya_campana', nombre: ['Boya con campana', 'Bell buoy'], tema: TEMA, variantes: ['entera', 'escorada', 'con_luz'], cuadros: 8, t: 4, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => {
      const loc: Pieza[] = [], th = onda(f, 8) * (v === 'escorada' ? 5 : 9);
      // flotador de hierro, jaula y la campana que tañe con la ola
      loc.push(a.cilindro(0, 0, -2, 11, 8, { mat: HI, r1: 9 }), a.cilindro(0, 0, 6, 9, 2, { mat: 'tela_roja', r1: 8, tono: -0.2 }));
      for (let i = 0; i < 4; i++) { const an = (i / 4) * TAU; loc.push(a.palo([Math.cos(an) * 7, Math.sin(an) * 7, 8], [Math.cos(an) * 2, Math.sin(an) * 2, 38], 0.9, { mat: HI })); }
      const cl: Pieza[] = [];
      campana(a, cl, [0, 0, -12], [0, 0, 1], 6.5, { badajo: [Math.sin(rad(-th * 3)) * 4.5, 0, -11.5] });
      loc.push(...transformar(cl, ejeAng([0, 1, 0], th * 0.6), [0, 0, 34]));
      let luz: Escena['resplandor'] | undefined;
      if (v === 'con_luz') { const kk = 0.5 + 0.5 * onda(f, 4); loc.push(a.esfera(0, 0, 41, 2.6, { mat: 'ahg_luz', tono: -0.2 + kk * 0.3 })); luz = { c: [0, 0, 41], r: 30 + kk * 6, color: '#e0b060' }; }
      percebes(a, loc, [10, 0, 1], [1, 0, 0], 6, 4);
      const ag = algas([[8, 4, 2], [-6, 7, 2]], 6, 0.6, f, 8, a.seed);
      if (ag) loc.push(ag);
      const ps = transformar(loc, rotM(0, th * 0.8 + (v === 'escorada' ? 14 : 0), th * 0.4), [0, 0, onda(f, 8, 1) * 0.8]);
      ps.push(charco(a, 18, 16));
      ondas(ps, [0, 0, 0], 11, f, 8, 2);
      ps.push(suelo(a));
      return luz ? { piezas: ps, resplandor: luz } : ps;
    },
  },
  {
    id: 'ahg_roca_percebes', nombre: ['Roca con percebes', 'Barnacled rock'], tema: TEMA, variantes: ['chica', 'grande', 'con_algas', 'con_mejillones'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], R = v === 'grande' ? 18 : v === 'chica' ? 8 : 13;
      ps.push(...roca(a, [0, 0, 0], [R, R * 0.8, R * 0.75], { mat: 'ahg_roca', facetas: 2 }));
      for (let i = 0; i < 5; i++) { const an = a.r() * TAU; percebes(a, ps, [Math.cos(an) * R * 0.8, Math.sin(an) * R * 0.65, R * (0.2 + a.r() * 0.3)], [Math.cos(an), Math.sin(an), 0.3], 6, R * 0.25); }
      if (v === 'con_mejillones') for (let i = 0; i < 14; i++) { const an = a.r() * TAU; ps.push(a.elipsoide(Math.cos(an) * R * 0.85, Math.sin(an) * R * 0.7, a.r() * R * 0.35, 2, 1, 0.9, { mat: 'negro', giro: a.r() * 180, incl: 60, tono: 0.2 })); }
      const ag = algas(Array.from({ length: v === 'con_algas' ? 6 : 2 }, () => [jit(a, R * 0.5), jit(a, R * 0.4), R * 0.6] as V3), R * 1.2, 0.6, 0, 1, a.seed, { arriba: false, mat: 'ahg_alga' });
      if (ag) ps.push(ag);
      ps.push(charco(a, R * 1.4, R * 1.2), suelo(a));
      return ps;
    },
  },
  {
    id: 'ahg_barril_marino', nombre: ['Barriles del naufragio', 'Wreck barrels'], tema: TEMA, variantes: ['uno', 'tumbado', 'grupo', 'reventado'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const barril = (c: V3, eje: V3, roto = false) => {
        const e = nor(eje), base = add(c, e, -9);
        ps.push(masa([hueso(base, add(base, e, 18), 6.4, 6.4), bulto(add(base, e, 9), [7.4, 7.4, 6], { eje: e })], { mat: W, suave: 2 }));
        for (const t of [1.5, 5, 13, 16.5]) ps.push(a.cilindro(...add(base, e, t - 0.6), t > 3 && t < 15 ? 7.3 : 6.7, 1.2, { mat: HI, eje: e }));
        if (roto) ps.push(a.elipsoide(...add(base, e, 12), 4, 3, 5, { mat: 'negro', resta: true, giro: a.r() * 180 }));
        percebes(a, ps, add(base, e, 6), lat(e), 5, 4);
      };
      if (v === 'uno' || v === 'reventado') barril([0, 0, 9], [jit(a, 0.1), jit(a, 0.1), 1], v === 'reventado');
      if (v === 'tumbado') barril([0, 0, 6.6], [Math.cos(a.r() * TAU), Math.sin(a.r() * TAU), 0]);
      if (v === 'grupo') { barril([-6, -5, 9], [0, 0, 1]); barril([8, 4, 9], [0, 0, 1]); barril([-2, 14, 6.6], [1, 0.3, 0]); }
      if (v === 'reventado') for (let i = 0; i < 5; i++) ps.push(tabla(a, [jit(a, 16), jit(a, 16), 0.6], 14, 3, a.r() * 180, 0));
      ps.push(charco(a, 18, 16), suelo(a));
      return ps;
    },
  },
  {
    id: 'ahg_nasa', nombre: ['Nasas de pescador', 'Fish traps'], tema: TEMA, variantes: ['una', 'apiladas', 'con_cangrejo', 'rota'], huella: [2, 2], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const nasa = (c: V3, g: number, roto = false) => {
        const loc: Pieza[] = [], L = 18, R = 6;
        for (let i = 0; i < 8; i++) { if (roto && i > 4 && a.r() < 0.5) continue; const an = (i / 8) * TAU; loc.push(a.palo([-L / 2, Math.cos(an) * R * 0.6, R + Math.sin(an) * R * 0.6], [L / 2, Math.cos(an) * R, R + Math.sin(an) * R], 0.35, { mat: 'ahg_madera_lisa' })); }
        for (const x of [-L / 2, 0, L / 2]) for (let i = 0; i < 8; i++) { const an = (i / 8) * TAU, an2 = ((i + 1) / 8) * TAU, rr = x < 0 ? R * 0.6 : x > 0 ? R : R * 0.8; loc.push(a.palo([x, Math.cos(an) * rr, R + Math.sin(an) * rr], [x, Math.cos(an2) * rr, R + Math.sin(an2) * rr], 0.4, { mat: 'ahg_soga' })); }
        ps.push(...transformar(loc, rotM(g), c));
      };
      if (v === 'apiladas') { nasa([0, -6, 0], 10); nasa([2, 7, 0], -8); nasa([1, 0, 11], 80); }
      else nasa([0, 0, 0], a.r() * 360, v === 'rota');
      if (v === 'con_cangrejo') { const cs: Comp[] = [bulto([2, 0, 5], [3, 4, 1.6], { mat: 'roca_roja' })]; for (const s of [-1, 1]) for (let k = 0; k < 3; k++) cs.push(hueso([2, s * 3, 5], [2 + (k - 1) * 2.5, s * 6.5, 3.5], 0.5, 0.3, { mat: 'roca_roja' })); ps.push(masa(cs, { mat: 'roca_roja', suave: 0.6 })); }
      ps.push(a.cilindro(-12, 8, 0, 3.4, 1.6, { mat: 'ahg_soga' }), charco(a, 18, 14));
      return ps;
    },
  },
);
