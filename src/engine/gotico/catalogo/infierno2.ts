import { conVarianteY, registrar, type Arma, type Pieza, type V3 } from '../objeto';
import { MATERIALES } from '../materiales';
import { masa, hueso, bulto, ruido, type Comp } from '../render';
import {
  TAU, PI, deg, add, sub, nor, mez, jit, elegir, ciclo, onda, suelo, rotM, transformar, cuerpo, CUERPOS, EQUIPOS, envolver, rematerial,
  roca, pena, prisma, manto, tronco, fuego, lengua, brasas, craneo, craneoBestia, huesoLargo, costillar, catenaria, cadena, tela, arbolMuerto, jaula, colgado, losa,
} from '../actos45';

/**
 * Acto 4, el infierno (segunda tanda): ríos y charcas de lava que corren y laten con su luz, grietas incandescentes,
 * rocas volcánicas con venas encendidas, pilares de obsidiana, jaulas colgantes con prisioneros, empalados, piras de
 * cadáveres que arden, altares de sacrificio, pentáculos de fuego, cráneos gigantes, huesos de demonios colosales,
 * puentes sobre la lava, géiseres de fuego, braseros demoníacos, estandartes de piel, cadenas, puertas del infierno,
 * árboles calcinados, carne viva que palpita, espinas, tronos, estatuas, osarios, calderos, campos de pinchos,
 * obeliscos, ganchos de carnicero, huevos de demonio, fumarolas, ruinas, cuerpos, charcos de sangre y columnas de fuego.
 */

MATERIALES.inf2_roca = { rampa: ['#0c0706', '#170e0b', '#231510', '#311d16', '#40261d', '#503025', '#623b2e'], ruido: 0.55, escala: 0.15, patron: (p) => (ruido(p[0] * 0.45, p[1] * 0.45, p[2] * 1.3) > 0.7 ? -0.16 : 0) };
MATERIALES.inf2_basalto = { rampa: ['#080707', '#111010', '#1b1918', '#262321', '#322e2b', '#3f3a36', '#4d4742'], ruido: 0.45, escala: 0.2, patron: (p) => (Math.sin(p[2] * 0.9 + ruido(p[0] * 0.2, p[1] * 0.2, 0) * 4) > 0.85 ? -0.14 : 0) };
MATERIALES.inf2_costra = { rampa: ['#070403', '#100806', '#1a0d09', '#25130d', '#311a12', '#3e2218'], ruido: 0.6, escala: 0.3, patron: (p) => (ruido(p[0] * 0.35, p[1] * 0.35, p[2] * 0.35) > 0.74 ? 0.3 : 0) };
MATERIALES.inf2_obsidiana = { rampa: ['#050407', '#0b080e', '#130e17', '#1c1522', '#271d2e', '#33263c', '#43324e', '#5a4668'], ruido: 0.15, escala: 0.12, brillo: 1.1, patron: (p) => (ruido(p[0] * 0.12 + p[2] * 0.05, p[1] * 0.12, p[2] * 0.08) > 0.7 ? 0.12 : 0) };
MATERIALES.inf2_ceniza = { rampa: ['#0b0909', '#141110', '#1d1918', '#272220', '#312b28', '#3c3531'], ruido: 0.5, escala: 0.3 };
MATERIALES.inf2_piel = { rampa: ['#1f130e', '#352219', '#4d3326', '#664535', '#7f5844', '#986c56', '#ae826a'], ruido: 0.35, escala: 0.5, patron: (p) => (ruido(p[0] * 0.6, p[1] * 0.6, p[2] * 0.6) > 0.72 ? -0.15 : 0) };
MATERIALES.inf2_carne = { rampa: ['#1a0507', '#2e090c', '#450f12', '#5e1719', '#782021', '#912c2a', '#a83c36', '#bc5146'], ruido: 0.35, escala: 0.4, brillo: 0.5, patron: (p) => (Math.abs(ruido(p[0] * 0.3, p[1] * 0.3, p[2] * 0.3) - 0.5) < 0.03 ? -0.25 : 0) };
MATERIALES.inf2_vena = { rampa: ['#100306', '#22060c', '#370b14', '#4e121c', '#661a24', '#7f242c'], ruido: 0.25, escala: 0.6, brillo: 0.6 };
MATERIALES.inf2_hierro = { rampa: ['#0a0807', '#141010', '#1f1817', '#2b2220', '#382c29', '#463733', '#56443f'], ruido: 0.35, escala: 0.4, brillo: 0.35 };
MATERIALES.inf2_hueso = { rampa: ['#24190f', '#3a2b1b', '#523f29', '#6b5539', '#856c4b', '#9e8460', '#b59b76'], ruido: 0.25, escala: 0.5 };
MATERIALES.inf2_piedra = { rampa: ['#110807', '#1c0e0c', '#291511', '#371c17', '#46251e', '#562f26', '#673a2f'], ruido: 0.3, escala: 0.2, patron: MATERIALES.piedra_bloques.patron };
MATERIALES.inf2_humo = { rampa: ['#0e0a0a', '#1a1414', '#271f1e', '#342a28', '#423633'], ruido: 0.5, escala: 0.25 };
MATERIALES.inf2_runa = { rampa: ['#4a0606', '#7a0c0a', '#b01a10', '#e0401c', '#ff7a3a', '#ffc08a'], ruido: 0.3, escala: 0.3, emite: true };
MATERIALES.inf2_runa_verde = { rampa: ['#0a3a0a', '#146a14', '#28a020', '#4ad03a', '#8af06a', '#ccffaa'], ruido: 0.3, escala: 0.3, emite: true };

const R0 = 'inf2_roca', K = 'inf2_costra', O = 'inf2_obsidiana', HI = 'inf2_hierro', HU = 'inf2_hueso';
const LUZ = '#ff6a20';
/** Ceniza y costra en el piso alrededor. */
const ceniza = (a: Arma, rx: number, ry: number, n = 5) => manto(a, rx, ry, n, 'inf2_ceniza', 1.6, { tono: -0.12 });
/** Peñasco volcánico anguloso: lajas facetadas apretadas, la mayor al medio. */
function penasco(a: Arma, ps: Pieza[], c: V3, r: number, h: number, mat = R0) {
  ps.push(pena(a, c[0], c[1], c[2] + h * 0.45, r, r * 0.85, h * 0.6, { mat, n: 12 }));
  for (let i = 0; i < 5; i++) { const t = a.r() * TAU, d = r * (0.45 + a.r() * 0.35), k = 0.4 + a.r() * 0.3; ps.push(pena(a, c[0] + Math.cos(t) * d, c[1] + Math.sin(t) * d, c[2] + h * k * 0.4, r * k, r * k * 0.8, h * k * 0.55, { mat, n: 9, tono: jit(a, 0.06) })); }
}
/** Lava que respira: el tono sube y baja con el cuadro (fase propia). */
const lavaT = (f: number, fase = 0, base = -0.12) => base + onda(f, 8, fase) * 0.14;

// ------------------------------------------------------------------ lava
/**
 * Río de lava por un camino (t de 0 a 1 → centro y ancho): franjas encendidas que laten en ola río abajo, placas de
 * costra que derivan con la corriente (cierran el ciclo en 8 cuadros), burbujas que revientan y orillas de roca.
 */
function rioLava(a: Arma, ps: Pieza[], camino: (t: number) => [V3, number], f: number, n = 12, orillas = true) {
  const pts = Array.from({ length: n + 1 }, (_, i) => { const t = i / n, [c, w] = camino(t), [c2] = camino(Math.min(1, t + 0.01)), [c1] = camino(Math.max(0, t - 0.01)); const d = nor(sub(c2, c1)), l: V3 = [-d[1], d[0], 0]; return { c, w, d, l }; });
  for (let i = 0; i < n; i++) {
    const A = pts[i], B = pts[i + 1], q: V3[] = [add(A.c, A.l, -A.w), add(A.c, A.l, A.w), add(B.c, B.l, -B.w), add(B.c, B.l, B.w)];
    ps.push(a.poliedro(q.flatMap((p) => [add(p, [0, 0, 0]), add(p, [0, 0, 1.0])]), { mat: 'lava', tono: lavaT(f + i * 0.6, 0, -0.32) }));
    const k0 = 0.45 + ruido(i * 1.7, 3, 1) * 0.25, k1 = 0.45 + ruido((i + 1) * 1.7, 3, 1) * 0.25, sh0 = (ruido(i * 0.9, 5, 2) - 0.5) * A.w * 0.5, sh1 = (ruido((i + 1) * 0.9, 5, 2) - 0.5) * B.w * 0.5;
    const nq: V3[] = [add(A.c, A.l, sh0 - A.w * k0), add(A.c, A.l, sh0 + A.w * k0), add(B.c, B.l, sh1 - B.w * k1), add(B.c, B.l, sh1 + B.w * k1)];
    ps.push(a.poliedro(nq.flatMap((p) => [add(p, [0, 0, 0.9]), add(p, [0, 0, 1.25])]), { mat: 'lava', tono: lavaT(f + i * 0.6, 1, 0.02) }));
    // costra que se enfría pegada a las orillas
    for (const sg of [-1, 1]) { const w0 = A.w * (0.78 + ruido(i, sg, 4) * 0.2), w1 = B.w * (0.78 + ruido(i + 1, sg, 4) * 0.2); ps.push(a.poliedro([add(A.c, A.l, sg * w0), add(A.c, A.l, sg * (A.w + 1)), add(B.c, B.l, sg * w1), add(B.c, B.l, sg * (B.w + 1))].flatMap((p) => [add(p, [0, 0, 0.5]), add(p, [0, 0, 1.6])]), { mat: K })); }
    if (orillas) for (const s of [-1, 1]) {
      const e = add(mez(A.c, B.c, 0.5), mez(A.l, B.l, 0.5), s * (mez([A.w, 0, 0], [B.w, 0, 0], 0.5)[0] + 2));
      ps.push(pena(a, e[0] + jit(a, 2), e[1] + jit(a, 2), 1, 5 + a.r() * 4, 4 + a.r() * 3, 2 + a.r() * 3, { mat: elegir(a, [R0, K, K]) }));
      if (a.r() < 0.5) ps.push(pena(a, e[0] + s * A.l[0] * 5, e[1] + s * A.l[1] * 5, 1, 3 + a.r() * 2, 2 + a.r() * 2, 1.5 + a.r() * 2, { mat: R0 }));
    }
  }
  // placas de costra que derivan río abajo
  for (let k = 0; k < Math.round(n * 0.6); k++) {
    const t = ((k / (n * 0.6)) + ciclo(f, 8) / (n * 0.6)) % 1, i = Math.min(n - 1, Math.floor(t * n)), u = t * n - i, P = mez(pts[i].c, pts[i + 1].c, u), l = pts[i].l, w = pts[i].w;
    const off = (ruido(k * 3.1, 1, 2) - 0.5) * w * 1.2, c = add(P, l, off), s = 1.6 + ruido(k, 2, 3) * 3;
    ps.push(a.poliedro([add(c, [-s, 0, 1.2]), add(c, [0, -s * 0.8, 1.2]), add(c, [s, s * 0.2, 1.2]), add(c, [-s * 0.2, s, 1.2]), add(c, [0, 0, 2.2])], { mat: K }));
  }
  for (let k = 0; k < 3; k++) { const i = Math.floor(ruido(k, 4, 1) * n), fase = (f + k * 3) % 8, c = add(pts[i].c, pts[i].l, (ruido(k, 7, 2) - 0.5) * pts[i].w); if (fase < 5) ps.push(a.esfera(c[0], c[1], 1.2, 0.6 + fase * 0.45, { mat: 'lava', tono: 0.25 })); }
}
/** Charca de lava: orilla de costra, la lava que respira, vetas claras, costras flotando y burbujas. */
function charca(a: Arma, ps: Pieza[], R: number, ry: number, f: number, o: { x?: number; y?: number } = {}) {
  const x = o.x ?? 0, y = o.y ?? 0;
  ps.push(...losa(a, R + 6, ry + 5, 0, 1.6, K, 12, { x, y }));
  ps.push(...losa(a, R, ry, 0, 2.2, 'lava', 12, { x, y, tono: lavaT(f) }));
  for (let i = 0; i < 4; i++) { const t = a.r() * TAU, d = a.r() * 0.6; ps.push(a.elipsoide(x + Math.cos(t) * R * d, y + Math.sin(t) * ry * d, 2.2, 3 + a.r() * 4, 1.2, 0.3, { mat: 'lava', giro: a.r() * 180, tono: 0.2 + onda(f, 8, i) * 0.1 })); }
  for (let i = 0; i < 3; i++) { const t = a.r() * TAU + ciclo(f, 8) * 0.6, d = a.r() * 0.6, cx = x + Math.cos(t) * R * d, cy = y + Math.sin(t) * ry * d, s = 2 + a.r() * 3; ps.push(a.poliedro([[cx - s, cy, 2], [cx, cy - s * 0.8, 2], [cx + s, cy + s * 0.2, 2], [cx - s * 0.2, cy + s, 2], [cx, cy, 3]], { mat: K })); }
  for (let i = 0; i < 2; i++) { const t = a.r() * TAU, d = a.r() * 0.6, fase = (f + i * 4) % 8; if (fase < 5) ps.push(a.esfera(x + Math.cos(t) * R * d, y + Math.sin(t) * ry * d, 2, 0.8 + fase * 0.5, { mat: 'lava', tono: 0.3 })); }
  for (let i = 0; i < 7; i++) { const t = (i / 7) * TAU + a.r() * 0.5; ps.push(pena(a, x + Math.cos(t) * (R + 4), y + Math.sin(t) * (ry + 4), 1, 2.5 + a.r() * 3, 2 + a.r() * 2.5, 1.5 + a.r() * 2.5, { mat: elegir(a, [R0, K]) })); }
}
/** Grieta: dos labios de costra y lava al fondo, quebrada a lo largo de una polilínea. */
function grieta(a: Arma, ps: Pieza[], pts: V3[], w: number, f: number) {
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i], q = pts[i + 1], d = nor(sub(q, p)), l: V3 = [-d[1], d[0], 0], k = w * (1 - (i / pts.length) * 0.5);
    ps.push(a.poliedro([add(p, l, -k), add(p, l, k), add(q, l, -k * 0.85), add(q, l, k * 0.85)].flatMap((e) => [add(e, [0, 0, -0.5]), add(e, [0, 0, 0.5])]), { mat: 'lava', tono: lavaT(f + i, 0, 0) }));
    for (const s of [-1, 1]) ps.push(pena(a, ...add(mez(p, q, 0.5), l, s * (k + 1.8)), k * 1.4 + 1.5, k * 0.8 + 1, 1.6 + a.r() * 1.4, { mat: K, giro: deg(Math.atan2(d[1], d[0])) }));
  }
}

// ------------------------------------------------------------------ piezas del infierno
/** Pica (estaca) con la punta ensangrentada, de b hacia arriba. */
function pica(a: Arma, ps: Pieza[], b: V3, d: V3, L: number, r = 1.4, mat = 'madera_vieja') {
  const q = add(b, nor(d), L), m = add(b, nor(d), L * 0.8);
  ps.push(a.palo(b, m, r, { mat }), a.palo(m, q, r, { mat: 'sangre', r1: 0.15 }));
  return q;
}
/** Empalado: el cuerpo atravesado por la pica, caído hacia atrás, a la altura z. */
function empalado(a: Arma, ps: Pieza[], b: V3, alto: number, o: { cu?: typeof CUERPOS.muerto; eq?: typeof EQUIPOS.preso; s?: number } = {}) {
  const s = o.s ?? 0.9, ang = jit(a, 25), q = pica(a, ps, b, [jit(a, 0.08), jit(a, 0.08), 1], alto + 32 * s);
  ps.push(...cuerpo({ cu: o.cu ?? elegir(a, [CUERPOS.muerto, CUERPOS.desollado, CUERPOS.palido]), eq: o.eq ?? EQUIPOS.harapos, acc: 'morir', f: 4, dir: 'se', m: rotM(ang, jit(a, 10), 0), s, t: add(b, [0, 0, alto]) }));
  ps.push(manto(a, 6, 5, 3, 'sangre', 0.6, { x: b[0] + 2, y: b[1] + 2, tono: 0 }));
  void q;
}
/** Vela negra con su llamita (cuadro f). */
function vela(a: Arma, ps: Pieza[], c: V3, h: number, f: number) {
  ps.push(a.cilindro(c[0], c[1], c[2], 1.1, h, { mat: 'cu_cuero_negro' }), a.elipsoide(c[0], c[1], c[2] + h + 1.2 + (f % 2) * 0.3, 0.6, 0.6, 1.3 + onda(f, 8, c[0]) * 0.3, { mat: 'luz_vela' }));
}
/** Estrella de n puntas en el piso (pentáculos): líneas encendidas y el círculo. */
function estrella(a: Arma, ps: Pieza[], R: number, n: number, mat: string, tono: number, z = 0.35, g0 = 0) {
  const c = 48;
  for (let i = 0; i < c; i++) { const a0 = (i / c) * TAU, a1 = ((i + 1) / c) * TAU; ps.push(a.palo([Math.cos(a0) * R, Math.sin(a0) * R, z], [Math.cos(a1) * R, Math.sin(a1) * R, z], 1.2, { mat, tono }), a.palo([Math.cos(a0) * (R - 4), Math.sin(a0) * (R - 4), z], [Math.cos(a1) * (R - 4), Math.sin(a1) * (R - 4), z], 0.7, { mat, tono: tono - 0.1 })); }
  const salto = n === 5 ? 2 : 3;
  for (let i = 0; i < n; i++) { const a0 = (i / n) * TAU + g0, a1 = (((i + salto) % n) / n) * TAU + g0; ps.push(a.palo([Math.cos(a0) * (R - 4), Math.sin(a0) * (R - 4), z + 0.05], [Math.cos(a1) * (R - 4), Math.sin(a1) * (R - 4), z + 0.05], 1.1, { mat, tono })); }
}

registrar(
  // ------------------------------------------------------------------ ríos y charcas de lava
  {
    id: 'inf2_rio_lava', nombre: ['Río de lava', 'Lava river'], tema: 'infierno', variantes: ['recto', 'curva', 'ancho', 'meandro'], cuadros: 8, t: 3, huella: [5, 3], huellaPor: { curva: [5, 5], meandro: [5, 4] }, bloquea: true, plano: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const camino = (t: number): [V3, number] => {
        if (v === 'curva') { const an = PI * 0.5 * t; return [[-20 + Math.sin(an) * 40, 20 - Math.cos(an) * 40, 0], 10 + Math.sin(t * 7) * 1.2]; }
        if (v === 'meandro') return [[-40 + t * 80, Math.sin(t * TAU) * 12, 0], 9 + Math.sin(t * 7) * 1.5];
        return [[-40 + t * 80, Math.sin(t * 5 + 1) * 2, 0], v === 'ancho' ? 18 + Math.sin(t * 9) * 2 : 10 + Math.sin(t * 7) * 1.5];
      };
      rioLava(a, ps, camino, f, v === 'ancho' ? 14 : 12);
      ps.push(suelo(a));
      return { piezas: ps, resplandor: { c: [0, 0, 4], r: v === 'ancho' ? 60 : 48, color: LUZ } };
    },
  },
  {
    id: 'inf2_charca_lava', nombre: ['Charca de lava', 'Lava pool'], tema: 'infierno', variantes: ['chica', 'mediana', 'burbujas', 'craneos', 'isla'], cuadros: 8, t: 3, huella: [3, 3], huellaPor: { mediana: [4, 4], isla: [5, 5] }, bloquea: true, plano: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const R = v === 'chica' ? 14 : v === 'isla' ? 34 : 24;
      charca(a, ps, R, R * 0.8, f);
      if (v === 'burbujas') for (let i = 0; i < 5; i++) { const fase = (f + i * 1.6) % 8, t = i * 1.3; if (fase < 6) ps.push(a.esfera(Math.cos(t) * R * 0.4, Math.sin(t) * R * 0.3, 1.8, 1 + fase * 0.6, { mat: 'lava', tono: 0.25 - fase * 0.04 })); }
      if (v === 'craneos') for (let i = 0; i < 4; i++) { const t = a.r() * TAU; craneo(a, ps, [Math.cos(t) * R * 0.5, Math.sin(t) * R * 0.4, 1.8 + onda(f, 8, i) * 0.4], 2.8, a.r() * 360, { mat: 'a45_carbon', incl: jit(a, 30) }); }
      if (v === 'isla') { ps.push(...roca(a, [2, 0, 3], [12, 10, 7], { mat: R0, n: 6 })); empalado(a, ps, [4, 2, 8], 2); }
      ps.push(suelo(a));
      return { piezas: ps, resplandor: { c: [0, 0, 4], r: R + 20, color: LUZ } };
    },
  },
  {
    id: 'inf2_grieta', nombre: ['Grieta incandescente', 'Glowing fissure'], tema: 'infierno', variantes: ['recta', 'ramificada', 'estrella', 'abierta'], cuadros: 8, t: 3, huella: [4, 2], huellaPor: { estrella: [4, 4] }, bloquea: false, plano: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [ceniza(a, 22, 10, 4)];
      const linea = (p0: V3, ang: number, L: number, n: number): V3[] => { const r: V3[] = [p0]; let t = ang; for (let i = 0; i < n; i++) { t += jit(a, 0.45); r.push(add(r[i], [Math.cos(t) * L / n, Math.sin(t) * L / n, 0])); } return r; };
      const w = v === 'abierta' ? 5 : 2.6;
      if (v === 'estrella') for (let k = 0; k < 5; k++) grieta(a, ps, linea([0, 0, 0], (k / 5) * TAU, 30, 4), w, f);
      else {
        const main = linea([-36, 0, 0], jit(a, 0.2), 72, 8);
        grieta(a, ps, main, w, f);
        if (v === 'ramificada') for (let k = 0; k < 3; k++) grieta(a, ps, linea(main[2 + k * 2], jit(a, 0.3) + (k % 2 ? 1.2 : -1.2), 20, 3), 1.2, f);
      }
      // chispas que suben de lo hondo
      for (let i = 0; i < 4; i++) { const u = ciclo(f + i * 2, 8); ps.push(a.esfera(jit(a, 24) + u * 3, jit(a, 3), 2 + u * 24, 0.6 * (1 - u * 0.5), { mat: 'fuego', tono: 0.2 - u * 0.3 })); }
      ps.push(suelo(a));
      return { piezas: ps, resplandor: { c: [0, 0, 2], r: 44, color: LUZ } };
    },
  },
  // ------------------------------------------------------------------ rocas volcánicas y obsidiana
  {
    id: 'inf2_roca', nombre: ['Roca volcánica', 'Volcanic rock'], tema: 'infierno', variantes: ['grande', 'grupo', 'venas', 'basalto', 'chica'], huella: [2, 2], huellaPor: { grupo: [3, 3], chica: [1, 1] }, bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [ceniza(a, 22, 20)];
      if (v === 'grande') penasco(a, ps, [0, 0, 0], 17, 30);
      else if (v === 'grupo') { penasco(a, ps, [-8, -6, 0], 13, 24); penasco(a, ps, [12, 4, 0], 9, 15); penasco(a, ps, [-2, 16, 0], 6, 9); }
      else if (v === 'chica') penasco(a, ps, [0, 0, 0], 7, 10);
      else if (v === 'basalto') for (let i = 0; i < 9; i++) { const t = a.r() * TAU, d = a.r() * 12, h = 10 + a.r() * 30; const pts: V3[] = []; for (let k = 0; k < 6; k++) { const an = (k / 6) * TAU; pts.push([Math.cos(t) * d + Math.cos(an) * 4.4, Math.sin(t) * d + Math.sin(an) * 4.4, 0], [Math.cos(t) * d + Math.cos(an) * 4.4, Math.sin(t) * d + Math.sin(an) * 4.4, h + (k % 2) * 1.5]); } ps.push(a.poliedro(pts, { mat: 'inf2_basalto', tono: jit(a, 0.06) })); }
      else {
        // roca quebrada con venas de lava entre las lajas
        penasco(a, ps, [0, 0, 0], 15, 26);
        for (let i = 0; i < 8; i++) { const t = a.r() * TAU, z = 3 + a.r() * 16, rr = 14 * (1 - Math.abs(z - 10) / 22); ps.push(a.palo([Math.cos(t) * rr, Math.sin(t) * rr * 0.9, z], [Math.cos(t + 0.45) * rr, Math.sin(t + 0.45) * rr * 0.9, z + jit(a, 6)], 0.9, { mat: 'lava', tono: 0.1 })); }
      }
      ps.push(suelo(a));
      return v === 'venas' ? { piezas: ps, resplandor: { c: [0, 0, 12], r: 30, color: LUZ } } : ps;
    },
  },
  {
    id: 'inf2_obsidiana', nombre: ['Pilar de obsidiana', 'Obsidian pillar'], tema: 'infierno', variantes: ['entero', 'roto', 'tallado', 'runas', 'grupo'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [ceniza(a, 20, 18)];
      const pilar = (x: number, y: number, H: number, r: number, roto: boolean) => {
        const n = 7, pts: V3[] = [], g = a.r() * TAU, top = roto ? H * 0.6 : H;
        for (let k = 0; k < n; k++) { const t = g + (k / n) * TAU, rr = r * (0.85 + a.r() * 0.3); pts.push([x + Math.cos(t) * rr, y + Math.sin(t) * rr, 0], [x + Math.cos(t) * rr * 0.8 + jit(a, 0.5), y + Math.sin(t) * rr * 0.8, top + jit(a, roto ? 6 : 0)]); }
        ps.push(a.poliedro(pts, { mat: O }));
        if (!roto) ps.push(prisma(a, [x, y, top - 2], [jit(a, 0.1), jit(a, 0.1), 1], r * 2.4, r * 0.8, O, 0, 7));
        else for (let i = 0; i < 5; i++) ps.push(pena(a, x + jit(a, 14) + 6, y + jit(a, 14) + 6, 2, 2 + a.r() * 4, 2 + a.r() * 3, 2 + a.r() * 2, { mat: O }));
        return top;
      };
      if (v === 'grupo') { pilar(-8, -6, 64, 7, false); pilar(10, -2, 44, 5.4, false); pilar(-2, 12, 30, 4.4, a.r() < 0.5); }
      else {
        const top = pilar(0, 0, 76, 9, v === 'roto');
        if (v === 'tallado') { ps.push(a.cilindro(0, 0, 0, 13, 5, { mat: 'inf2_basalto', r1: 11 })); craneoBestia(a, ps, [6, 6, top * 0.62], 4.4, 45, { cuernos: 'demonio', mat: O, matCuerno: O }); for (const z of [20, 52]) ps.push(a.cilindro(0, 0, z, 8.4, 2, { mat: 'cu_oro', tono: -0.2 })); }
        if (v === 'runas') for (let i = 0; i < 6; i++) ps.push(a.caja(6.2, 6.2, 10 + i * 9, 3.2, 0.5, 4.6, { mat: 'inf2_runa', giro: -45, tono: -0.15 }));
      }
      ps.push(suelo(a));
      return v === 'runas' ? { piezas: ps, resplandor: { c: [6, 6, 34], r: 30, color: '#e0401c' } } : ps;
    },
  },
  // ------------------------------------------------------------------ jaulas colgantes
  {
    id: 'inf2_jaula', nombre: ['Jaula colgante', 'Hanging cage'], tema: 'infierno', variantes: ['preso', 'esqueleto', 'vacia', 'abierta', 'doble'], huella: [3, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [ceniza(a, 28, 18)];
      // horca de hierro con cuernos y la cadena
      const H = 104, brazos = v === 'doble' ? [1, -1] : [1];
      ps.push(a.cilindro(0, 0, 0, 7, 4, { mat: 'inf2_basalto', r1: 5 }), a.palo([0, 0, 2], [0, 0, H], 2.2, { mat: HI }));
      craneoBestia(a, ps, [0, 0, H + 3], 3.4, 45, { cuernos: 'demonio', mat: HU });
      for (const s of brazos) {
        const fin: V3 = [s * 30, -s * 30 * 0.2, H - 6];
        ps.push(a.palo([0, 0, H - 4], fin, 1.6, { mat: HI }), a.palo([0, 0, H - 30], [s * 14, -s * 3, H - 5], 1.1, { mat: HI }));
        for (let k = 0; k < 3; k++) ps.push(prisma(a, add(fin, [-s * k * 8, 0, 1]), [0, 0, 1], 4, 0.8, HI, 0, 4));
        const largo = 18 + a.r() * 10, c: V3 = add(fin, [0, 0, -largo]);
        cadena(a, ps, [fin, c], 2.4, 0.55, HI);
        const preso = v === 'preso' || (v === 'doble' && s > 0) ? 'vivo' : v === 'esqueleto' || v === 'doble' ? 'esqueleto' : undefined;
        jaula(a, ps, add(c, [0, 0, -44]), 10, 40, { preso: preso as 'vivo' | 'esqueleto' | undefined, abierta: v === 'abierta', mat: HI });
        if (v === 'esqueleto' || preso === 'esqueleto') ps.push(manto(a, 6, 5, 3, 'sangre', 0.5, { x: c[0], y: c[1], tono: 0 }));
      }
      if (v === 'vacia') for (let i = 0; i < 4; i++) huesoLargo(ps, [26 + jit(a, 8), -6 + jit(a, 8), 1], [30 + jit(a, 8), jit(a, 8), 1.5], 1);
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ empalados
  {
    id: 'inf2_empalado', nombre: ['Empalados', 'Impaled'], tema: 'infierno', variantes: ['uno', 'dos', 'craneos', 'demonio', 'bosque'], huella: [2, 2], huellaPor: { bosque: [4, 4] }, bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [ceniza(a, 22, 20)];
      if (v === 'uno') empalado(a, ps, [0, 0, 0], 34);
      else if (v === 'dos') { empalado(a, ps, [-8, -6, 0], 36); empalado(a, ps, [9, 8, 0], 26, { cu: CUERPOS.calcinado, eq: EQUIPOS.nada }); }
      else if (v === 'demonio') empalado(a, ps, [0, 0, 0], 44, { cu: CUERPOS.demonio, eq: EQUIPOS.demonio, s: 0.95 });
      else if (v === 'craneos') for (let i = 0; i < 6; i++) { const t = (i / 6) * TAU + a.r() * 0.4, d = i ? 12 : 0, q = pica(a, ps, [Math.cos(t) * d, Math.sin(t) * d, -1], [jit(a, 0.2), jit(a, 0.2), 1], 40 + a.r() * 26, 1); craneo(a, ps, add(q, [0, 0, -3]), 3.2, a.r() * 360, { incl: jit(a, 20), mat: elegir(a, ['hueso', HU]) }); }
      else for (let i = 0; i < 5; i++) { const t = (i / 5) * TAU + a.r(), d = 10 + a.r() * 18; if (i < 3) empalado(a, ps, [Math.cos(t) * d, Math.sin(t) * d, 0], 26 + a.r() * 16, { s: 0.85 }); else { const q = pica(a, ps, [Math.cos(t) * d, Math.sin(t) * d, -1], [jit(a, 0.15), jit(a, 0.15), 1], 52, 1.2); craneo(a, ps, add(q, [0, 0, -3]), 3, a.r() * 360); } }
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ piras de cadáveres
  {
    id: 'inf2_pira', nombre: ['Pira de cadáveres', 'Corpse pyre'], tema: 'infierno', variantes: ['pira', 'monton', 'hoguera'], cuadros: 8, t: 3, huella: [3, 3], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [ceniza(a, 30, 28, 6)];
      if (v === 'hoguera') {
        // la quema en la estaca: troncos apilados al pie y el condenado atado
        for (let i = 0; i < 12; i++) { const t = (i / 12) * TAU + jit(a, 0.2); tronco(a, ps, [Math.cos(t) * 16, Math.sin(t) * 16, 1], [Math.cos(t) * 3, Math.sin(t) * 3, 14 + a.r() * 4], 2, { mat: i % 2 ? 'a45_carbon' : 'madera_vieja', nudos: 0 }); }
        ps.push(a.palo([0, 0, 0], [0, 0, 74], 2, { mat: 'a45_carbon' }));
        ps.push(...cuerpo({ cu: CUERPOS.calcinado, eq: EQUIPOS.nada, acc: 'herido', f: 2, dir: 'se', t: [2, 2, 12], s: 0.92 }));
        for (const z of [24, 40]) ps.push(a.cilindro(0, 0, z, 3.6, 1.2, { mat: 'cuerda', tono: -0.2 }));
        brasas(a, ps, [0, 0, 2], 14, f, 8);
        fuego(a, ps, [0, 0, 8], 3, f, 8, { lenguas: 6, alto: 1.4 });
      } else {
        const n = v === 'monton' ? 5 : 4;
        if (v === 'pira') for (let k = 0; k < 3; k++) for (let i = 0; i < 4; i++) { const g = k % 2 ? 0 : 90, d = -12 + i * 8; const p: V3 = g ? [d, -18, 2 + k * 4] : [-18, d, 2 + k * 4], q: V3 = g ? [d, 18, 2 + k * 4] : [18, d, 2 + k * 4]; tronco(a, ps, p, q, 2, { mat: 'madera_vieja', nudos: 0 }); }
        const z0 = v === 'pira' ? 14 : 2;
        for (let i = 0; i < n; i++) ps.push(...cuerpo({ cu: elegir(a, [CUERPOS.calcinado, CUERPOS.muerto, CUERPOS.desollado]), eq: EQUIPOS.nada, acc: 'morir', f: 7, dir: elegir(a, ['s', 'se', 'e', 'so']), m: rotM(a.r() * 360), s: 0.85, t: [jit(a, 6), jit(a, 6), z0 + i * 3.4] }));
        brasas(a, ps, [0, 0, 1], 16, f, 8);
        for (let i = 0; i < 3; i++) { const t = (i / 3) * TAU + a.r(); fuego(a, ps, [Math.cos(t) * 8, Math.sin(t) * 8, z0 + 4], 2.4, f, 8, { lenguas: 4, sem: i * 11, alto: 1.2 }); }
      }
      ps.push(suelo(a));
      return { piezas: ps, resplandor: { c: [0, 0, 20], r: 70, color: '#ff7a24' } };
    },
  },
  // ------------------------------------------------------------------ altares de sacrificio
  {
    id: 'inf2_altar', nombre: ['Altar de sacrificio', 'Sacrificial altar'], tema: 'infierno', variantes: ['piedra', 'victima', 'hueso', 'sangre', 'velas'], cuadros: 8, t: 4, huella: [3, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [ceniza(a, 30, 22)];
      const hueco = v === 'hueso';
      ps.push(...losa(a, 26, 18, 0, 3, 'inf2_basalto', 8));
      if (hueco) { ps.push(masa([bulto([0, 0, 10], [18, 9, 6]), ...[-14, -5, 5, 14].flatMap((x) => [hueso([x, -7, 2], [x, -8, 12], 2, 1.6), hueso([x, 7, 2], [x, 8, 12], 2, 1.6)])], { mat: HU, suave: 2.5 })); for (let i = 0; i < 5; i++) craneo(a, ps, [-14 + i * 7, 9, 6], 2.6, 60, { mat: HU }); }
      else { ps.push(a.caja(0, 0, 3, 36, 18, 14, { mat: 'inf2_basalto' }), a.caja(0, 0, 17, 40, 21, 3, { mat: 'inf2_basalto', tono: 0.06 })); for (const s of [-1, 1]) craneoBestia(a, ps, [s * 22, 0, 12], 4, s > 0 ? 0 : 180, { cuernos: 'demonio', mat: 'inf2_basalto', matCuerno: 'inf2_basalto' }); }
      const top = hueco ? 16 : 20;
      if (v === 'victima' || v === 'sangre') ps.push(...cuerpo({ cu: CUERPOS.palido, eq: EQUIPOS.preso, acc: 'morir', f: 7, dir: 'e', m: rotM(0), s: 0.62, t: [0, 0, top] }));
      if (v === 'sangre' || v === 'victima') { ps.push(...losa(a, 16, 9, top - 0.2, top + 0.3, 'cu_sangre_viva', 7, { tono: -0.35 + onda(f, 8) * 0.1 })); for (let i = 0; i < 3; i++) { const u = ciclo(f + i * 2.6, 8); ps.push(a.elipsoide(-8 + i * 8, 10.6, top - 2 - u * 14, 0.5, 0.5, 1.1, { mat: 'cu_sangre_viva' })); } ps.push(manto(a, 12, 6, 3, 'sangre', 0.6, { y: 14, tono: 0 })); }
      if (v === 'velas' || v === 'piedra') for (let i = 0; i < (v === 'velas' ? 9 : 3); i++) vela(a, ps, [-16 + (i % 5) * 8 + jit(a, 1), (i < 5 ? -7 : 7) + jit(a, 1), top], 3 + a.r() * 4, f + i);
      if (v === 'piedra') { const pts: V3[] = [[-2, -1, top], [2, -1, top], [0, 1, top], [0, 0, top + 9]]; ps.push(a.poliedro(pts, { mat: 'acero' }), a.palo([0, 0, top + 9], [0, 0, top + 15], 0.8, { mat: 'cu_cuero_negro' })); }
      ps.push(suelo(a));
      return { piezas: ps, resplandor: { c: [0, 0, top + 4], r: 36, color: v === 'velas' || v === 'piedra' ? '#ffb050' : '#c01818' } };
    },
  },
  // ------------------------------------------------------------------ pentáculos de fuego
  {
    id: 'inf2_pentaculo', nombre: ['Pentáculo de fuego', 'Fire pentacle'], tema: 'infierno', variantes: ['fuego', 'sangre', 'apagado', 'velas'], cuadros: 8, t: 3, huella: [5, 5], bloquea: false,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const R = 30, mat = v === 'sangre' ? 'cu_sangre_viva' : v === 'apagado' ? 'a45_carbon' : 'inf2_runa';
      estrella(a, ps, R, 5, mat, v === 'apagado' ? 0 : -0.15 + onda(f, 8) * 0.12);
      if (v === 'fuego') for (let i = 0; i < 5; i++) { const t = (i / 5) * TAU; fuego(a, ps, [Math.cos(t) * R, Math.sin(t) * R, 0.5], 1.3, f, 8, { lenguas: 3, sem: i * 9, chispas: 1 }); }
      if (v === 'velas' || v === 'sangre') for (let i = 0; i < 10; i++) { const t = (i / 10) * TAU; vela(a, ps, [Math.cos(t) * (R + 4), Math.sin(t) * (R + 4), 0], 3 + (i % 3) * 2, f + i); }
      if (v === 'sangre') { craneo(a, ps, [0, 0, 3], 4, 45); ps.push(manto(a, 8, 7, 4, 'sangre', 0.6, { tono: 0 })); }
      if (v !== 'apagado') for (let i = 0; i < 5; i++) { const t = (i / 5) * TAU + PI / 5; ps.push(a.caja(Math.cos(t) * R * 0.6, Math.sin(t) * R * 0.6, 0.4, 3.4, 3.4, 0.4, { mat, giro: deg(t) + 45, tono: -0.2 + onda(f, 8, i) * 0.15 })); }
      ps.push(suelo(a));
      return v === 'apagado' ? ps : { piezas: ps, resplandor: { c: [0, 0, 6], r: 52, color: v === 'sangre' ? '#c01818' : LUZ } };
    },
  },
  // ------------------------------------------------------------------ cráneos gigantes
  {
    id: 'inf2_craneo', nombre: ['Cráneo gigante', 'Giant skull'], tema: 'infierno', variantes: ['semienterrado', 'cuernos', 'lava', 'partido'], cuadros: 8, t: 4, huella: [4, 4], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [ceniza(a, 34, 30, 6)];
      const ojos = v === 'lava' ? 'lava' : 'negro';
      craneoBestia(a, ps, [0, 0, v === 'semienterrado' ? 8 : 18], 15, 30, { cuernos: v === 'cuernos' || v === 'lava' ? 'demonio' : 'ninguno', mat: HU, colmillos: true, incl: v === 'semienterrado' ? 25 : 12, ojos });
      if (v === 'partido') { for (let i = 0; i < 7; i++) ps.push(pena(a, 20 + jit(a, 10), -14 + jit(a, 10), 3, 3 + a.r() * 6, 3 + a.r() * 4, 3 + a.r() * 4, { mat: HU })); ps.push(a.caja(-4, -4, 10, 4, 40, 50, { mat: HU, resta: true, giro: 30 })); }
      if (v === 'lava') { charca(a, ps, 14, 10, f, { x: 22, y: 14 }); for (let i = 0; i < 3; i++) { const u = ciclo(f + i * 2.6, 8); ps.push(a.elipsoide(20 + u * 6, 8, 12 - u * 10, 1.2, 1.2, 2.2, { mat: 'lava' })); } }
      ps.push(...roca(a, [-16, -12, 6], [10, 8, 7], { mat: R0, n: 4 }));
      // brasas que escapan por las cuencas
      for (let i = 0; i < 3; i++) { const u = ciclo(f + i * 2.7, 8); ps.push(a.esfera(8 + Math.cos(i * 2) * 4 + u * 4, 4 + Math.sin(i * 2) * 4, 24 + u * 26, 0.7 * (1 - u * 0.5), { mat: 'fuego', tono: 0.2 - u * 0.3 })); }
      ps.push(suelo(a));
      return v === 'lava' ? { piezas: ps, resplandor: { c: [16, 8, 12], r: 46, color: LUZ } } : ps;
    },
  },
  // ------------------------------------------------------------------ huesos de demonios colosales
  {
    id: 'inf2_coloso', nombre: ['Huesos de un coloso', 'Colossus bones'], tema: 'infierno', variantes: ['costillar', 'columna', 'brazo', 'cuerno'], huella: [5, 4], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [ceniza(a, 44, 34, 7)];
      if (v === 'costillar') costillar(a, ps, [0, 0, 36], 66, 30, jit(a, 20), { alto: 38, n: 7, grueso: 3, rotas: 0.2, mat: HU });
      else if (v === 'columna') { let p: V3 = [-40, -10, 6]; for (let i = 0; i < 10; i++) { const q = add(p, [8.4, 2.2, Math.sin(i * 0.7) * 2]); ps.push(masa([bulto(p, [4.4, 5, 5]), hueso(p, add(p, [0, 0, 10]), 2, 1), hueso(p, add(p, [0, 7, 3]), 1.8, 0.6), hueso(p, add(p, [0, -7, 3]), 1.8, 0.6)], { mat: HU, suave: 1.6 })); p = q; } craneoBestia(a, ps, add(p, [10, 3, 6]), 9, 15, { cuernos: 'demonio', mat: HU, colmillos: true, incl: 20 }); }
      else if (v === 'brazo') {
        huesoLargo(ps, [-40, -10, 6], [0, 0, 10], 5, HU); huesoLargo(ps, [0, 0, 10], [22, 18, 40], 4, HU);
        for (let k = 0; k < 4; k++) { const b: V3 = [24 + k * 2, 16 + k * 3, 42], cs: Comp[] = []; let p = b; for (let j = 1; j <= 3; j++) { const q = add(p, [4 + j, jit(a, 2), 8 - j * 6]); cs.push(hueso(p, q, 2 - j * 0.3, 1.6 - j * 0.3)); p = q; } ps.push(masa(cs, { mat: HU, suave: 1 }), prisma(a, p, [0.6, 0, -1], 7, 1.4, 'a45_cuerno', 0, 5)); }
      } else {
        const cs: Comp[] = [], pts: V3[] = [];
        for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push([-34 + t * 50 + Math.sin(t * PI) * 6, -10 + t * 10, 2 + t * 64 - t * t * 20]); }
        for (let i = 0; i < 8; i++) cs.push(hueso(pts[i], pts[i + 1], 12 * (1 - i / 9) + 1, 12 * (1 - (i + 1) / 9) + 1));
        ps.push(masa(cs, { mat: 'a45_cuerno', suave: 2 }));
        ps.push(...roca(a, [-34, -10, 4], [16, 14, 10], { mat: HU, n: 5 }));
      }
      for (let i = 0; i < 4; i++) ps.push(...roca(a, [jit(a, 36), jit(a, 26), 2], [5 + a.r() * 4, 4 + a.r() * 3, 3], { mat: R0, n: 3, facetas: 1 }));
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ puentes sobre la lava
  {
    id: 'inf2_puente', nombre: ['Puente sobre la lava', 'Bridge over lava'], tema: 'infierno', variantes: ['piedra', 'hueso', 'roto', 'cadenas'], cuadros: 8, t: 3, huella: [5, 3], bloquea: false,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      // la lava corre de lado a lado (a lo largo de y) bajo el puente, que cruza a lo largo de x
      rioLava(a, ps, (t) => [[jit(a, 0) + Math.sin(t * 4) * 3, -40 + t * 80, 0], 15], f, 10, false);
      for (const s of [-1, 1]) for (let i = 0; i < 6; i++) ps.push(pena(a, s * (20 + a.r() * 8), -36 + i * 14, 2, 6 + a.r() * 3, 6, 3 + a.r() * 3, { mat: elegir(a, [R0, K]) }));
      const L = 52, z = 10;
      if (v === 'piedra' || v === 'roto') {
        // dovelas de piedra quemada a lo largo del arco, cada una un poco torcida
        for (let i = 0; i <= 12; i++) { const x = -L / 2 + (i / 12) * L, zz = z + Math.sin((i / 12) * PI) * 6; if (v === 'roto' && (i === 6 || i === 7)) continue; ps.push(a.caja(x, jit(a, 0.6), zz - 5, L / 12 - 0.5, 17 + jit(a, 1), 6, { mat: 'inf2_piedra', giro: jit(a, 3), incl: -Math.cos((i / 12) * PI) * 12 + jit(a, 3), inclEje: 'y', tono: jit(a, 0.08) })); }
        for (const s of [-1, 1]) penasco(a, ps, [s * L / 2, 0, 0], 9, 12, 'inf2_basalto');
        if (v === 'roto') for (let i = 0; i < 4; i++) ps.push(pena(a, jit(a, 6), jit(a, 10), 1.5, 2 + a.r() * 3, 2 + a.r() * 3, 1.5, { mat: 'inf2_basalto' }));
        for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const x = -L / 2 + 6 + i * 13; if (v === 'roto' && Math.abs(x) < 8) continue; ps.push(a.palo([x, s * 8, z + Math.sin(((x + L / 2) / L) * PI) * 6], [x, s * 8, z + 8 + Math.sin(((x + L / 2) / L) * PI) * 6], 1, { mat: 'inf2_basalto' })); }
      } else if (v === 'hueso') {
        costillar(a, ps, [0, 0, z + 8], L + 6, 10, 0, { alto: z + 8, n: 9, grueso: 1.4, mat: HU });
        for (let i = 0; i < 9; i++) ps.push(a.caja(-L / 2 + 3 + i * 6, 0, z + 6, 4.6, 16, 1.4, { mat: HU, tono: jit(a, 0.06), giro: jit(a, 4) }));
      } else {
        for (const s of [-1, 1]) { ps.push(a.palo([s * L / 2, -9, 0], [s * L / 2, -9, 30], 2, { mat: HI }), a.palo([s * L / 2, 9, 0], [s * L / 2, 9, 30], 2, { mat: HI })); }
        for (const y of [-9, 9]) cadena(a, ps, catenaria([-L / 2, y, 30], [L / 2, y, 30], 10, 12), 2.6, 0.6, HI);
        const tab = catenaria([-L / 2, 0, 16], [L / 2, 0, 16], 6, 10);
        for (let i = 0; i < tab.length; i++) { if (a.r() < 0.15) continue; ps.push(a.caja(tab[i][0], 0, tab[i][2], 4.4, 16, 1.4, { mat: 'a45_carbon', giro: jit(a, 5) })); }
        for (let i = 0; i < 4; i++) ps.push(a.palo([-L / 2 + 10 + i * 10, -9, 26], [-L / 2 + 10 + i * 10, -8, tab[2 + i * 2][2]], 0.3, { mat: HI }));
      }
      ps.push(suelo(a));
      return { piezas: ps, resplandor: { c: [0, 0, 2], r: 50, color: LUZ } };
    },
  },
  // ------------------------------------------------------------------ géiseres de fuego
  {
    id: 'inf2_geiser', nombre: ['Géiser de fuego', 'Fire geyser'], tema: 'infierno', variantes: ['activo', 'chico', 'humo', 'azul'], cuadros: 8, t: 3, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [ceniza(a, 22, 20)];
      // el cono de costra con la boca encendida
      ps.push(masa([hueso([0, 0, -2], [0, 0, 8], 14, 6), ...Array.from({ length: 6 }, (_, i) => { const t = (i / 6) * TAU + a.r(); return bulto([Math.cos(t) * 9, Math.sin(t) * 9, 3], [5, 4, 4], { giro: deg(t) }); })], { mat: K, suave: 3 }));
      ps.push(a.cilindro(0, 0, 7.5, 5.4, 1.2, { mat: v === 'azul' ? 'fuego_azul' : 'lava', tono: 0.1 }));
      const mat = v === 'azul' ? 'fuego_azul' : 'fuego', u = ciclo(f, 8), h = v === 'chico' ? 0.5 : 1;
      if (v !== 'humo') {
        // la erupción crece, se sostiene y cae
        const k = u < 0.25 ? u / 0.25 : u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3;
        ps.push(lengua([0, 0, 8], [0, 0, 1], (20 + 60 * k) * h, 4.4 * h + 1, f, 8, 3, { mat, tramos: 6 }));
        for (let i = 0; i < 3; i++) ps.push(lengua([Math.cos(i * 2.1) * 2.5, Math.sin(i * 2.1) * 2.5, 8], [Math.cos(i * 2.1) * 0.3, Math.sin(i * 2.1) * 0.3, 1], (12 + 34 * k) * h, 2.6 * h + 0.6, f, 8, 7 + i, { mat, tramos: 4 }));
        for (let i = 0; i < 5; i++) { const w = ciclo(f + i * 1.6, 8); ps.push(a.esfera(Math.cos(i * 1.3) * w * 18, Math.sin(i * 1.3) * w * 18, 8 + Math.sin(w * PI) * 50 * h * k + 2, 1.2 * (1 - w * 0.6), { mat })); }
      }
      if (v === 'humo') for (let i = 0; i < 3; i++) { const w = ciclo(f + i * 2.7, 8); ps.push(a.elipsoide(w * 3, -w * 2, 10 + w * 16, 2 + w * 3, 2 + w * 3, 1.6 + w * 2, { mat: 'inf2_humo', tono: 0.1 - w * 0.2 })); }
      ps.push(suelo(a));
      return { piezas: ps, resplandor: { c: [0, 0, v === 'humo' ? 8 : 30], r: v === 'humo' ? 24 : 60, color: v === 'azul' ? '#6ab4ff' : LUZ } };
    },
  },
  // ------------------------------------------------------------------ braseros demoníacos
  {
    id: 'inf2_brasero', nombre: ['Brasero demoníaco', 'Demonic brazier'], tema: 'infierno', variantes: ['cuernos', 'craneo', 'tripode', 'pilar', 'jaula'], cuadros: 8, t: 3, huella: [1, 1], huellaPor: { pilar: [2, 2] }, bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [ceniza(a, 13, 12, 4)];
      let zf = 28, s = 1.6;
      if (v === 'cuernos') { ps.push(a.cilindro(0, 0, 0, 6, 3, { mat: HI, r1: 4 }), a.palo([0, 0, 3], [0, 0, 22], 1.8, { mat: HI }), a.cilindro(0, 0, 21, 3, 6, { mat: HI, r1: 8 })); for (let i = 0; i < 4; i++) { const t = (i / 4) * TAU + 0.4; ps.push(masa([hueso([Math.cos(t) * 7, Math.sin(t) * 7, 26], [Math.cos(t) * 10, Math.sin(t) * 10, 33], 1.4, 0.9), hueso([Math.cos(t) * 10, Math.sin(t) * 10, 33], [Math.cos(t) * 8, Math.sin(t) * 8, 40], 0.9, 0.2)], { mat: 'a45_cuerno', suave: 0.6 })); } zf = 27; }
      else if (v === 'craneo') { ps.push(a.cilindro(0, 0, 0, 7, 4, { mat: 'inf2_basalto' })); craneoBestia(a, ps, [0, 0, 14], 7, 45, { cuernos: 'demonio', mat: HU, colmillos: true, ojos: 'lava' }); ps.push(a.cilindro(-1, -1, 18, 5, 3, { mat: 'a45_carbon' })); zf = 21; s = 1.7; }
      else if (v === 'tripode') { for (let i = 0; i < 3; i++) { const t = (i / 3) * TAU + 0.5; ps.push(masa([hueso([Math.cos(t) * 10, Math.sin(t) * 10, 0], [Math.cos(t) * 4, Math.sin(t) * 4, 26], 1.2, 1)], { mat: HU, suave: 1 })); craneo(a, ps, [Math.cos(t) * 9.6, Math.sin(t) * 9.6, 2.4], 2.2, deg(t)); } ps.push(a.cilindro(0, 0, 24, 4, 5, { mat: HI, r1: 8.4 }), a.cilindro(0, 0, 29, 8.8, 0.8, { mat: HI })); zf = 29; }
      else if (v === 'pilar') { ps.push(a.cilindro(0, 0, 0, 12, 5, { mat: 'inf2_basalto', r1: 10 }), a.cilindro(0, 0, 5, 8, 26, { mat: O, r1: 7 }), a.cilindro(0, 0, 31, 7, 4, { mat: HI, r1: 12 }), a.cilindro(0, 0, 35, 12.4, 1, { mat: HI })); for (let i = 0; i < 4; i++) { const t = (i / 4) * TAU + 0.8; ps.push(a.caja(Math.cos(t) * 7.4, Math.sin(t) * 7.4, 12, 3, 0.5, 4, { mat: 'inf2_runa', giro: deg(t) + 90, tono: -0.2 + onda(f, 8, i) * 0.15 })); } zf = 35; s = 2.6; }
      else { ps.push(a.palo([0, 0, 0], [0, 0, 32], 1.6, { mat: HI })); for (let i = 0; i < 8; i++) { const t = (i / 8) * TAU; ps.push(masa([hueso([Math.cos(t) * 2, Math.sin(t) * 2, 28], [Math.cos(t) * 8, Math.sin(t) * 8, 36], 0.7, 0.6), hueso([Math.cos(t) * 8, Math.sin(t) * 8, 36], [Math.cos(t) * 7, Math.sin(t) * 7, 44], 0.6, 0.2)], { mat: HI, suave: 0.5 })); } ps.push(a.cilindro(0, 0, 28, 3, 3, { mat: HI })); zf = 31; }
      brasas(a, ps, [0, 0, zf - 1], v === 'pilar' ? 9 : 5.5, f, 8);
      fuego(a, ps, [0, 0, zf], s, f, 8, { lenguas: v === 'pilar' ? 6 : 4 });
      ps.push(suelo(a));
      return { piezas: ps, resplandor: { c: [0, 0, zf + 6], r: v === 'pilar' ? 64 : 48, color: LUZ } };
    },
  },
  // ------------------------------------------------------------------ estandartes de piel
  {
    id: 'inf2_estandarte', nombre: ['Estandarte de piel', 'Skin banner'], tema: 'infierno', variantes: ['piel', 'craneo', 'jirones', 'pica'], cuadros: 8, t: 3, huella: [2, 1], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [ceniza(a, 16, 12, 4)];
      ps.push(...roca(a, [0, 0, 2], [6, 6, 4], { mat: R0, n: 3, facetas: 1 }));
      const H = 84;
      ps.push(a.palo([0, 0, 0], [0, 0, H], 1.5, { mat: HI }));
      if (v === 'pica') { craneoBestia(a, ps, [0, 0, H + 4], 4.6, 45, { cuernos: 'demonio', mat: HU }); tela(a, ps, { p0: [0, 0, H - 4], u: [0, 0, -1], abajo: nor([0.6, -0.8, -0.15]), ancho: 12, alto: 40, f, n: 8, nu: 3, nv: 8, amp: 3.4, mat: 'inf2_piel', punta: true, jirones: 0.6, fase: a.r() * 6 }); }
      else {
        ps.push(a.palo([0, -14, H - 6], [0, 14, H - 6], 1, { mat: HI }));
        for (const s of [-1, 1]) prisma(a, [0, s * 14, H - 6], [0, s, 0.3], 5, 1, HI);
        tela(a, ps, { p0: [0.8, -13, H - 7], u: [0, 1, 0], ancho: 26, alto: 42, f, n: 8, nu: 5, nv: 8, amp: 2.4, mat: 'inf2_piel', jirones: v === 'jirones' ? 1 : 0.45, fase: a.r() * 6, dibujo: (u, w) => (v === 'piel' && (Math.abs(u - 0.5) < 0.05 || Math.abs(w - 0.4) < 0.04) ? 'sangre' : undefined) });
        if (v === 'craneo') craneo(a, ps, [3, 0, H - 26 + onda(f, 8) * 0.5], 4.4, 45, { incl: -5 });
        craneoBestia(a, ps, [0, 0, H + 3], 3.4, 45, { cuernos: 'carnero', mat: HU });
        for (let k = 0; k < 4; k++) { const y = -10 + k * 7, p: V3 = [1, y, H - 8], sw = onda(f, 8, k * 0.9) * 1.6; ps.push(a.palo(p, add(p, [sw, 0, -10]), 0.25, { mat: 'cuerda' })); huesoLargo(ps, add(p, [sw, 0, -10]), add(p, [sw * 1.4, 0, -16]), 0.6, HU); }
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ cadenas
  {
    id: 'inf2_cadenas', nombre: ['Cadenas del tormento', 'Torment chains'], tema: 'infierno', variantes: ['anclas', 'ganchos', 'cuerpo', 'arco'], cuadros: 8, t: 4, huella: [3, 3], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [ceniza(a, 28, 26)];
      const sw = onda(f, 8) * 1.4;
      if (v === 'anclas') {
        // cadenas tensas que salen de argollas en el piso hacia arriba, hacia nada
        for (let i = 0; i < 5; i++) { const t = (i / 5) * TAU + a.r(), b: V3 = [Math.cos(t) * 22, Math.sin(t) * 22, 1.5]; ps.push(...roca(a, add(b, [0, 0, 1]), [4, 4, 3], { mat: R0, n: 3, facetas: 0 }), a.cilindro(...add(b, [0, 0, 3]), 2.4, 1, { mat: HI, eje: [Math.cos(t), Math.sin(t), 0] })); cadena(a, ps, catenaria(add(b, [0, 0, 4]), [sw, 0, 90], 3, 10), 2.8, 0.6, HI); }
        ps.push(a.esfera(sw, 0, 92, 3, { mat: HI }));
      } else {
        // marco de vigas de hierro con cadenas que cuelgan y se mecen
        for (const x of [-26, 26]) ps.push(a.palo([x, 0, 0], [x, 0, 72], 2.2, { mat: HI }), a.palo([x, -8, 0], [x, 0, 30], 1.4, { mat: HI }), a.palo([x, 8, 0], [x, 0, 30], 1.4, { mat: HI }));
        ps.push(a.palo([-30, 0, 72], [30, 0, 72], 2, { mat: HI }));
        for (let i = 0; i < 5; i++) {
          const x = -18 + i * 9, L = 18 + a.r() * 26, p: V3 = [x, 0, 71], q: V3 = [x + sw * (L / 20), 0, 71 - L];
          if (v === 'arco') { cadena(a, ps, catenaria(p, [x + 9, 0, 71], 18 + a.r() * 12, 8), 2.4, 0.5, HI); continue; }
          cadena(a, ps, [p, q], 2.4, 0.5, HI);
          if (v === 'ganchos') { ps.push(masa([hueso(q, add(q, [0, 0, -5]), 0.7, 0.6), hueso(add(q, [0, 0, -5]), add(q, [2.4, 0, -7]), 0.6, 0.5), hueso(add(q, [2.4, 0, -7]), add(q, [3, 0, -4]), 0.5, 0.2)], { mat: HI, suave: 0.4 })); if (i % 2) ps.push(masa([bulto(add(q, [2, 0, -10]), [3, 2.4, 5]), bulto(add(q, [2, 0, -15]), [2.2, 2, 3])], { mat: 'inf2_carne', suave: 1.4 })); }
        }
        if (v === 'cuerpo') colgado(a, ps, [0 + sw, 0, 71], 6, CUERPOS.desollado, EQUIPOS.nada, 0.92, HI);
      }
      ps.push(suelo(a));
      return ps;
    },
  },
);

registrar(
  // ------------------------------------------------------------------ puertas del infierno
  {
    id: 'inf2_puerta', nombre: ['Puerta del infierno', 'Gate of hell'], tema: 'infierno', variantes: ['cerrada', 'abierta', 'rota', 'fauces'], cuadros: 8, t: 3, huella: [5, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [ceniza(a, 40, 18, 6)];
      const W = 34, H = 66;
      if (v === 'fauces') {
        // una boca de piedra viva: mandíbulas de roca, colmillos y la garganta encendida
        ps.push(masa([bulto([0, -6, 30], [40, 14, 34]), bulto([0, -2, 62], [30, 12, 12]), ...[-1, 1].map((s) => bulto([s * 30, 0, 14], [12, 12, 16]))], { mat: R0, suave: 6 }));
        ps.push(a.elipsoide(0, 6, 26, 18, 8, 22, { mat: 'negro' }), a.elipsoide(0, 4, 24, 12, 6, 16, { mat: 'lava', tono: -0.3 + onda(f, 8) * 0.15 }));
        for (let i = 0; i < 6; i++) { const x = -14 + i * 5.6; ps.push(prisma(a, [x, 9, 47], [0, 0.2, -1], 10 + (i % 2) * 5, 2.2, HU), prisma(a, [x + 2.8, 9, 3], [0, 0.2, 1], 8 + (i % 2) * 4, 2, HU)); }
        for (const s of [-1, 1]) ps.push(a.esfera(s * 16, 8, 56, 3, { mat: 'lava' }));
      } else {
        // las jambas de obsidiana con cuernos y el dintel de cráneos
        for (const s of [-1, 1]) { ps.push(a.caja(s * (W / 2 + 7), 0, 0, 14, 14, H, { mat: O })); ps.push(masa([hueso([s * (W / 2 + 7), 0, H], [s * (W / 2 + 18), 0, H + 18], 4, 2.4), hueso([s * (W / 2 + 18), 0, H + 18], [s * (W / 2 + 12), 0, H + 34], 2.4, 0.3)], { mat: 'a45_cuerno', suave: 1 })); for (let k = 0; k < 4; k++) ps.push(a.caja(s * (W / 2 + 7) + s * -7.1, 4, 8 + k * 14, 0.5, 3.6, 6, { mat: 'inf2_runa', tono: -0.2 + onda(f, 8, k + s) * 0.15 })); }
        ps.push(a.caja(0, 0, H, W + 30, 15, 10, { mat: O, tono: 0.05 }));
        for (let i = 0; i < 5; i++) craneo(a, ps, [-14 + i * 7, 6, H + 4], 2.8, 45 + jit(a, 10), { mat: HU });
        if (v === 'cerrada') { ps.push(a.caja(0, 0, 0, W, 5, H, { mat: HI })); for (let k = 0; k < 4; k++) ps.push(a.caja(0, 2.6, 6 + k * 16, W, 1, 2.4, { mat: 'inf2_hierro', tono: 0.1 })); craneoBestia(a, ps, [0, 4, H * 0.55], 5, 90, { cuernos: 'demonio', mat: HI, matCuerno: HI }); }
        else if (v === 'abierta') {
          // el portal: velo encendido que gira y lenguas que lamen los bordes
          ps.push(a.caja(0, 0, 0, W, 2, H, { mat: 'portal_rojo', tono: -0.3 + onda(f, 8) * 0.1 }));
          for (let k = 0; k < 3; k++) for (let i = 0; i < 9; i++) { const r = (k + 1) * 5, t = (i / 9) * TAU + ciclo(f, 8) * TAU * (k % 2 ? 1 : -1) * 0.4; ps.push(a.esfera(Math.cos(t) * r, 1.6, H / 2 + Math.sin(t) * r * 1.6, 1.4, { mat: k === 1 ? 'fuego' : 'portal_rojo', tono: 0.1 })); }
          for (const s of [-1, 1]) ps.push(lengua([s * (W / 2 - 1), 2, 2], [-s * 0.2, 0.3, 1], 30, 3, f, 8, s + 3, { tramos: 5 }));
        } else { ps.push(...transformar([a.caja(0, 0, 0, W / 2, 5, H * 0.9, { mat: HI })], rotM(70, 0, 80), [8, 18, 3])); ps.push(a.caja(-W / 4, 0, 0, W / 2, 5, H * 0.8, { mat: HI, incl: 12, inclEje: 'y' })); for (let i = 0; i < 6; i++) ps.push(pena(a, jit(a, 20), 10 + a.r() * 10, 2, 3 + a.r() * 4, 3 + a.r() * 3, 2 + a.r() * 3, { mat: O })); }
      }
      ps.push(suelo(a));
      return { piezas: ps, resplandor: { c: [0, 6, v === 'fauces' ? 24 : 34], r: v === 'cerrada' || v === 'rota' ? 30 : 56, color: v === 'cerrada' || v === 'rota' ? '#e0401c' : LUZ } };
    },
  },
  // ------------------------------------------------------------------ árboles calcinados
  {
    id: 'inf2_arbol', nombre: ['Árbol calcinado', 'Charred tree'], tema: 'infierno', variantes: ['retorcido', 'partido', 'brasas', 'ahorcados'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [ceniza(a, 22, 20)];
      if (v === 'partido') { arbolMuerto(a, ps, { H: 34, mat: 'a45_carbon', brasa: 'lava', ramas: 2, grueso: 1.8 }); for (let i = 0; i < 5; i++) ps.push(prisma(a, [jit(a, 3), jit(a, 3), 30], [jit(a, 0.5), jit(a, 0.5), 1], 5 + a.r() * 8, 1.4, 'a45_carbon', 0, 4)); tronco(a, ps, [6, 4, 4], [44, 20, 5], 4, { mat: 'a45_carbon', corte: 'lava' }); }
      else {
        const ramas = arbolMuerto(a, ps, { H: v === 'ahorcados' ? 110 : 90, mat: 'a45_carbon', brasa: v === 'brasas' ? 'lava' : undefined, ramas: 8, torsion: v === 'retorcido' ? 2.4 : 1.2 });
        if (v === 'ahorcados') { const pun = (r: [V3, V3]) => Math.abs(r[0][0] - r[0][1]) * (r[0][2] > 70 && r[0][2] < 100 ? 1 : 0.1); const orden = [...ramas].sort((x, y) => pun(y) - pun(x)); for (const [p, d] of orden.slice(0, 2)) colgado(a, ps, add(p, nor([d[0], d[1], 0]), 7), Math.max(3, p[2] - 76), elegir(a, [CUERPOS.calcinado, CUERPOS.desollado]), EQUIPOS.nada, 0.9); }
      }
      ps.push(suelo(a));
      return v === 'brasas' || v === 'partido' ? { piezas: ps, resplandor: { c: [0, 0, 20], r: 30, color: LUZ } } : ps;
    },
  },
  // ------------------------------------------------------------------ carne viva
  {
    id: 'inf2_carne', nombre: ['Carne viva', 'Living flesh'], tema: 'infierno', variantes: ['tumor', 'muro', 'ojos', 'tentaculos'], cuadros: 8, t: 3, huella: [3, 3], huellaPor: { muro: [5, 2] }, bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [manto(a, 28, 24, 6, 'sangre', 1, { tono: 0 })];
      const late = (fase: number) => 0.5 + 0.5 * onda(f, 8, fase), cs: Comp[] = [];
      const muro = v === 'muro', n = muro ? 16 : 10;
      for (let i = 0; i < n; i++) {
        const x = muro ? -36 + (i / (n - 1)) * 72 + jit(a, 3) : jit(a, 16), y = muro ? jit(a, 5) : jit(a, 14), z = muro ? 6 + a.r() * 40 : 4 + a.r() * 10;
        const r = (muro ? 8 : 7) + a.r() * 5 + late(i * 0.8) * (i % 3 === 0 ? 2 : 0.6);
        cs.push(bulto([x, y, z - r * 0.3], [r * 1.3, r, r * 0.7], { mat: i % 4 === 0 ? 'inf2_vena' : 'inf2_carne', giro: a.r() * 180 }));
        for (let k = 0; k < 2; k++) cs.push(bulto([x + jit(a, r), y + jit(a, r), z + jit(a, r * 0.5)], [r * 0.35, r * 0.3, r * 0.3], { mat: elegir(a, ['inf2_carne', 'inf2_vena', 'sangre']), k: 2 }));
      }
      // venas que la recorren
      for (let i = 0; i < 8; i++) { const p: V3 = [jit(a, muro ? 34 : 16), jit(a, 12), 2 + a.r() * (muro ? 40 : 12)]; cs.push(hueso(p, add(p, [jit(a, 14), jit(a, 6), jit(a, 10)]), 0.9 + late(i) * 0.4, 0.6, { mat: 'inf2_vena', k: 0.6 })); }
      if (v === 'tentaculos') for (let k = 0; k < 4; k++) { const t = (k / 4) * TAU + 0.3; let p: V3 = [Math.cos(t) * 10, Math.sin(t) * 10, 8]; for (let j = 1; j <= 6; j++) { const q: V3 = add(p, [Math.cos(t) * 3 + onda(f, 8, k + j * 0.6) * 2.4, Math.sin(t) * 3 + onda(f, 8, k * 2 + j * 0.5) * 2.4, 5]); cs.push(hueso(p, q, 3.2 - j * 0.45, 3.2 - (j + 1) * 0.45 + 0.1, { mat: 'inf2_carne' })); p = q; } }
      ps.push(masa(cs, { mat: 'inf2_carne', suave: 7 }));
      if (v === 'ojos' || v === 'muro') for (let i = 0; i < (muro ? 4 : 5); i++) { const x = jit(a, muro ? 30 : 12), y = muro ? 10 : 8 + a.r() * 4, z = muro ? 12 + a.r() * 30 : 9 + a.r() * 6, abre = Math.max(0, onda(f, 8, i * 1.7)); ps.push(a.elipsoide(x, y, z, 2.6, 1.6, 0.4 + abre * 1.8, { mat: 'cu_hueso', giro: -45 }), a.esfera(x + 0.6, y + 0.6, z, 0.4 + abre * 0.8, { mat: 'cu_ojo_brasa' })); }
      if (v === 'tumor') for (let i = 0; i < 3; i++) { const u = ciclo(f + i * 2.7, 8); ps.push(a.esfera(jit(a, 8), 10 + jit(a, 3), 10 - u * 9, 0.6, { mat: 'sangre' })); }
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ espinas
  {
    id: 'inf2_espina', nombre: ['Espinas de roca', 'Rock thorns'], tema: 'infierno', variantes: ['espina', 'grupo', 'curva', 'campo'], huella: [2, 2], huellaPor: { campo: [4, 4] }, bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [ceniza(a, 22, 20)];
      const espina = (b: V3, L: number, r: number, curva: number) => { const cs: Comp[] = []; let p = b, d: V3 = nor([jit(a, 0.3), jit(a, 0.3), 1]); const lat: V3 = nor([a.r() - 0.5, a.r() - 0.5, 0]); for (let i = 1; i <= 6; i++) { d = nor(add(d, lat, curva * 0.25)); const q = add(p, d, L / 6); cs.push(hueso(p, q, r * (1 - (i - 1) / 6) + 0.2, r * (1 - i / 6) + 0.15)); p = q; } cs.push(bulto(add(b, [0, 0, 2]), [r * 1.5, r * 1.4, r])); ps.push(masa(cs, { mat: elegir(a, [R0, O, 'inf2_basalto']), suave: r * 0.5 })); };
      if (v === 'espina') espina([0, 0, -2], 60, 7, 0.4);
      else if (v === 'curva') { espina([-8, -8, -2], 70, 6.5, 1.6); espina([8, 6, -2], 34, 4, 1.2); }
      else if (v === 'grupo') for (let i = 0; i < 5; i++) espina([jit(a, 12), jit(a, 12), -2], 22 + a.r() * 40, 3 + a.r() * 3, a.r());
      else for (let i = 0; i < 12; i++) espina([jit(a, 28), jit(a, 28), -2], 10 + a.r() * 28, 2 + a.r() * 2.5, a.r() * 1.2);
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ tronos demoníacos
  {
    id: 'inf2_trono', nombre: ['Trono demoníaco', 'Demonic throne'], tema: 'infierno', variantes: ['hueso', 'obsidiana', 'carne'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [ceniza(a, 30, 28)];
      const mat = v === 'hueso' ? HU : v === 'obsidiana' ? O : 'inf2_carne';
      ps.push(...losa(a, 22, 22, 0, 4, 'inf2_basalto', 8), ...losa(a, 18, 18, 4, 7, O, 8));
      // asiento, brazos y un respaldo alto que mira al frente, con cuernos
      const loc: Pieza[] = [], cs: Comp[] = [bulto([0, 0, 13], [11, 11, 5]), bulto([-9, 0, 34], [4, 12, 26]), ...[-1, 1].map((s) => hueso([2, s * 11, 12], [8, s * 12, 22], 3, 2.6))];
      for (const s of [-1, 1]) cs.push(hueso([-9, s * 10, 50], [-14, s * 18, 74], 4, 0.6, { mat: 'a45_cuerno' }));
      if (v === 'carne') for (let i = 0; i < 6; i++) cs.push(bulto([-8 + jit(a, 4), jit(a, 10), 14 + a.r() * 40], [5, 5, 5], { mat: 'inf2_vena' }));
      loc.push(masa(cs, { mat, suave: 3 }));
      if (v === 'hueso') for (let i = 0; i < 5; i++) craneo(a, loc, [-10, -8 + i * 4, 58 - Math.abs(i - 2) * 3], 2.6, 0, { mat: HU });
      if (v === 'obsidiana') { craneoBestia(a, loc, [-7, 0, 58], 5, 0, { cuernos: 'demonio', mat: O, matCuerno: O, ojos: 'lava' }); for (const s of [-1, 1]) loc.push(prisma(a, [-10, s * 12, 30], [0, s * 0.3, 1], 40, 2.4, O)); }
      ps.push(...transformar(loc, rotM(45), [0, 0, 0]));
      ps.push(suelo(a));
      return v === 'obsidiana' ? { piezas: ps, resplandor: { c: [-5, -5, 58], r: 20, color: LUZ } } : ps;
    },
  },
  // ------------------------------------------------------------------ estatuas de demonios
  {
    id: 'inf2_estatua', nombre: ['Estatua demoníaca', 'Demon statue'], tema: 'infierno', variantes: ['garra', 'alas', 'rota', 'diablillos'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [ceniza(a, 22, 20)];
      ps.push(a.caja(0, 0, 0, 26, 26, 8, { mat: 'inf2_basalto' }), a.caja(0, 0, 8, 22, 22, 3, { mat: 'inf2_basalto', tono: 0.05 }));
      if (v === 'diablillos') for (let i = 0; i < 3; i++) { const t = (i / 3) * TAU; ps.push(...rematerial(cuerpo({ cu: CUERPOS.diablillo, eq: EQUIPOS.nada, acc: elegir(a, ['atacar', 'quieto', 'lanzar'] as const), f: 3, dir: elegir(a, ['s', 'se', 'so']), t: [Math.cos(t) * 6, Math.sin(t) * 6, 11] }), O)); }
      else {
        let cs = cuerpo({ cu: { ...CUERPOS.demonio, alas: v === 'alas' ? 'cu_piel_roja' : undefined }, eq: EQUIPOS.demonio, acc: v === 'garra' ? 'atacar' : 'quieto', f: v === 'garra' ? 5 : 0, dir: 'se', t: [0, 0, 11], s: 1.05 });
        if (v === 'rota') { cs = cs.filter((p) => envolver([p])[0][2] < 52); for (let i = 0; i < 7; i++) ps.push(pena(a, 8 + jit(a, 12), 8 + jit(a, 12), 2, 2 + a.r() * 5, 2 + a.r() * 4, 2 + a.r() * 3, { mat: O })); }
        ps.push(...rematerial(cs, O));
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ osarios
  {
    id: 'inf2_osario', nombre: ['Osario', 'Ossuary heap'], tema: 'infierno', variantes: ['craneos', 'mixto', 'piramide'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [ceniza(a, 28, 26)];
      if (v === 'piramide') { let z = 0; for (let k = 0; k < 5; k++) { const n = 5 - k; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) craneo(a, ps, [(i - (n - 1) / 2) * 6.4, (j - (n - 1) / 2) * 6.4, z + 3.4], 3.2, 45 + jit(a, 15), { mat: elegir(a, ['hueso', HU]), incl: jit(a, 10) }); z += 5.6; } }
      else {
        ps.push(masa([bulto([0, 0, -2], [17, 15, 10]), bulto([3, 2, 3], [10, 9, 7])], { mat: 'inf2_ceniza', suave: 4 }));
        const n = v === 'craneos' ? 28 : 14;
        for (let i = 0; i < n; i++) { const t = a.r() * TAU, d = Math.sqrt(a.r()) * 16, z = 10 * (1 - (d / 17) ** 2) + 1.5; craneo(a, ps, [Math.cos(t) * d, Math.sin(t) * d, z], 3 + a.r() * 0.6, a.r() * 360, { mat: elegir(a, ['hueso', HU]), incl: jit(a, 25) }); }
        if (v === 'mixto') for (let i = 0; i < 12; i++) { const t = a.r() * TAU, d = a.r() * 18, z = 12 * (1 - (d / 20) ** 2) + 1, p: V3 = [Math.cos(t) * d, Math.sin(t) * d, z]; huesoLargo(ps, p, add(p, [jit(a, 10), jit(a, 10), jit(a, 4)]), 1, elegir(a, ['hueso', HU])); }
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ calderos
  {
    id: 'inf2_caldero', nombre: ['Caldero infernal', 'Hell cauldron'], tema: 'infierno', variantes: ['sangre', 'lava', 'restos'], cuadros: 8, t: 3, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [ceniza(a, 22, 20)];
      for (let i = 0; i < 6; i++) { const t = (i / 6) * TAU; ps.push(...roca(a, [Math.cos(t) * 14, Math.sin(t) * 14, 3], [4, 4, 4], { mat: R0, n: 3, facetas: 0 })); }
      brasas(a, ps, [0, 0, 1], 11, f, 8);
      fuego(a, ps, [0, 0, 2], 1.6, f, 8, { lenguas: 5, alto: 0.7 });
      ps.push(a.cilindro(0, 0, 9, 7, 6, { mat: HI, r1: 13 }), a.cilindro(0, 0, 15, 13, 11, { mat: HI, r1: 12.4 }), a.cilindro(0, 0, 26, 13.4, 1.6, { mat: HI, tono: 0.1 }));
      for (let i = 0; i < 3; i++) { const t = (i / 3) * TAU + 0.5; ps.push(a.palo([Math.cos(t) * 9, Math.sin(t) * 9, 10], [Math.cos(t) * 12, Math.sin(t) * 12, 0], 1.4, { mat: HI })); }
      for (const s of [-1, 1]) ps.push(a.cilindro(s * 9.2, -s * 9.2, 24, 2.4, 0.8, { mat: HI, eje: [1, -1, 0] }));
      const liq = v === 'lava' ? 'lava' : 'cu_sangre_viva';
      ps.push(a.cilindro(0, 0, 26.2, 12, 1, { mat: liq, tono: -0.25 + onda(f, 8) * 0.1 }));
      for (let i = 0; i < 3; i++) { const fase = (f + i * 3) % 8, t = i * 2.1; if (fase < 5) ps.push(a.esfera(Math.cos(t) * 6, Math.sin(t) * 6, 27, 0.8 + fase * 0.4, { mat: liq, tono: 0.1 })); }
      if (v === 'restos') { craneo(a, ps, [3, -2, 27.5], 3, 30, { incl: 30 }); huesoLargo(ps, [-6, 4, 27], [-14, 10, 36], 1.1); ps.push(masa([bulto([-2, 6, 27.5], [3, 2.4, 2])], { mat: 'inf2_carne', suave: 1 })); }
      ps.push(suelo(a));
      return { piezas: ps, resplandor: { c: [0, 0, 14], r: 46, color: LUZ } };
    },
  },
  // ------------------------------------------------------------------ campos de pinchos
  {
    id: 'inf2_pinchos', nombre: ['Campo de pinchos', 'Spike field'], tema: 'infierno', variantes: ['campo', 'victimas', 'oxidado'], huella: [4, 4], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [ceniza(a, 34, 32, 6)];
      const mat = v === 'oxidado' ? 'hierro_oxido' : HI;
      for (let i = 0; i < 22; i++) { const x = jit(a, 28), y = jit(a, 28), L = 12 + a.r() * 16; ps.push(a.cilindro(x, y, -1, 1.4 + a.r() * 0.6, L, { mat, r1: 0.1, incl: jit(a, 12), giro: a.r() * 180 })); if (v !== 'oxidado' && a.r() < 0.3) ps.push(a.cilindro(x, y, L * 0.6, 1, L * 0.38, { mat: 'sangre', r1: 0.1 })); }
      if (v === 'victimas') for (let i = 0; i < 2; i++) ps.push(...cuerpo({ cu: elegir(a, [CUERPOS.muerto, CUERPOS.desollado]), eq: EQUIPOS.harapos, acc: 'morir', f: 7, dir: elegir(a, ['s', 'se', 'e']), m: rotM(a.r() * 360), t: [jit(a, 14), jit(a, 14), 10 + i * 2], s: 0.9 }));
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ obeliscos
  {
    id: 'inf2_obelisco', nombre: ['Obelisco rúnico', 'Runic obelisk'], tema: 'infierno', variantes: ['rojo', 'verde', 'apagado'], cuadros: 8, t: 4, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [ceniza(a, 20, 18)];
      const runa = v === 'verde' ? 'inf2_runa_verde' : 'inf2_runa';
      ps.push(a.caja(0, 0, 0, 24, 24, 5, { mat: 'inf2_basalto', giro: 45 }), a.caja(0, 0, 5, 18, 18, 4, { mat: O, giro: 45 }));
      ps.push(a.poliedro([[-7, -7, 9], [7, -7, 9], [-7, 7, 9], [7, 7, 9], [-4.6, -4.6, 86], [4.6, -4.6, 86], [-4.6, 4.6, 86], [4.6, 4.6, 86]], { mat: O }), a.poliedro([[-4.6, -4.6, 86], [4.6, -4.6, 86], [-4.6, 4.6, 86], [4.6, 4.6, 86], [0, 0, 96]], { mat: O, tono: 0.05 }));
      for (let i = 0; i < 9; i++) { const z = 14 + i * 7.6, br = v === 'apagado' ? 0 : 0.5 + 0.5 * onda(f + i, 8); for (const [x, y, g] of [[7 - z * 0.03 + 0.2, 0, 0], [0, 7 - z * 0.03 + 0.2, 90]] as [number, number, number][]) ps.push(a.caja(x, y, z, x ? 0.5 : 3.2, x ? 3.2 : 0.5, 4.6, { mat: v === 'apagado' ? 'negro' : runa, tono: -0.4 + br * 0.45, giro: g * 0 })); }
      if (v !== 'apagado') ps.push(a.esfera(0, 0, 100 + onda(f, 8) * 2, 2.6, { mat: runa }));
      ps.push(suelo(a));
      return v === 'apagado' ? ps : { piezas: ps, resplandor: { c: [0, 0, 50], r: 46, color: v === 'verde' ? '#4ad03a' : '#e0401c' } };
    },
  },
  // ------------------------------------------------------------------ ganchos de carnicero
  {
    id: 'inf2_ganchos', nombre: ['Ganchos de carnicero', 'Butcher hooks'], tema: 'infierno', variantes: ['carne', 'cuerpos', 'vacio'], huella: [4, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [manto(a, 32, 14, 5, 'sangre', 0.8, { tono: 0 })];
      for (const x of [-28, 28]) { ps.push(a.palo([x, 0, 0], [x, 0, 84], 2, { mat: HI }), a.palo([x, -8, 0], [x, 0, 24], 1.2, { mat: HI }), a.palo([x, 8, 0], [x, 0, 24], 1.2, { mat: HI })); }
      ps.push(a.palo([-32, 0, 84], [32, 0, 84], 1.8, { mat: HI }));
      for (let i = 0; i < 5; i++) {
        const x = -20 + i * 10, L = 8 + a.r() * 8, q: V3 = [x, 0, 83 - L];
        cadena(a, ps, [[x, 0, 83], q], 2.2, 0.45, HI);
        ps.push(masa([hueso(q, add(q, [0, 0, -4]), 0.6, 0.5), hueso(add(q, [0, 0, -4]), add(q, [2, 0, -6]), 0.5, 0.4), hueso(add(q, [2, 0, -6]), add(q, [2.6, 0, -3.6]), 0.4, 0.15)], { mat: HI, suave: 0.4 }));
        if (v === 'carne') ps.push(masa([bulto(add(q, [2, 0, -12]), [4, 3, 7]), bulto(add(q, [2, 0, -19]), [3, 2.6, 4]), hueso(add(q, [2, 0, -22]), add(q, [2.4, 0, -28]), 1, 0.7, { mat: 'hueso' })], { mat: 'inf2_carne', suave: 2 }));
        else if (v === 'cuerpos' && i % 2 === 0) ps.push(...cuerpo({ cu: CUERPOS.desollado, eq: EQUIPOS.nada, acc: 'herido', f: 2, dir: 'se', m: rotM(0, 180), t: add(q, [2, 0, -6]), s: 0.85 }));
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ huevos de demonio
  {
    id: 'inf2_huevo', nombre: ['Huevos de demonio', 'Demon eggs'], tema: 'infierno', variantes: ['nido', 'eclosion', 'uno'], cuadros: 8, t: 4, huella: [3, 3], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [manto(a, 26, 24, 6, 'inf2_carne', 2, { tono: -0.15 })];
      const huevo = (c: V3, s: number, fase: number, roto = false) => {
        const k = 1 + onda(f, 8, fase) * 0.04, cs: Comp[] = [bulto(add(c, [0, 0, 9 * s]), [6.4 * s * k, 6.4 * s * k, 10 * s * k], { mat: 'inf2_piel' })];
        for (let i = 0; i < 5; i++) { const t = (i / 5) * TAU + fase; cs.push(hueso(add(c, [Math.cos(t) * 6 * s, Math.sin(t) * 6 * s, 3 * s]), add(c, [Math.cos(t + 0.6) * 4 * s, Math.sin(t + 0.6) * 4 * s, 17 * s]), 0.7 * s, 0.4 * s, { mat: 'lava', k: 0.4, tono: -0.35 + onda(f, 8, fase + i) * 0.2 })); }
        if (roto) { ps.push(masa(cs, { mat: 'inf2_piel', suave: 1 })); ps.push(a.elipsoide(c[0], c[1], c[2] + 17 * s, 6 * s, 6 * s, 6 * s, { mat: 'inf2_piel', resta: true })); for (let i = 0; i < 6; i++) { const t = (i / 6) * TAU; ps.push(prisma(a, add(c, [Math.cos(t) * 5 * s, Math.sin(t) * 5 * s, 12 * s]), [Math.cos(t) * 0.4, Math.sin(t) * 0.4, 1], 5 * s, 1.2 * s, 'inf2_piel', 0, 4)); } }
        else ps.push(masa(cs, { mat: 'inf2_piel', suave: 1 }));
      };
      if (v === 'uno') huevo([0, 0, 0], 1.6, 0);
      else for (let i = 0; i < 5; i++) { const t = (i / 5) * TAU + a.r() * 0.3, d = i ? 12 : 0; huevo([Math.cos(t) * d, Math.sin(t) * d, 0], 0.9 + a.r() * 0.3, i * 1.3, v === 'eclosion' && i === 0); }
      if (v === 'eclosion') ps.push(...cuerpo({ cu: CUERPOS.diablillo, eq: EQUIPOS.nada, acc: 'herido', f: 2, dir: 'se', t: [0, 0, 6], s: 0.8 }));
      for (let i = 0; i < 6; i++) { const t = a.r() * TAU; ps.push(masa([hueso([Math.cos(t) * 8, Math.sin(t) * 8, 1], [Math.cos(t) * 24, Math.sin(t) * 24, 0.5], 1.4, 0.5)], { mat: 'inf2_vena', suave: 1 })); }
      ps.push(suelo(a));
      return { piezas: ps, resplandor: { c: [0, 0, 10], r: 30, color: '#d04018' } };
    },
  },
  // ------------------------------------------------------------------ fumarolas
  {
    id: 'inf2_fumarola', nombre: ['Fumarola', 'Fumarole'], tema: 'infierno', variantes: ['chica', 'grande', 'cono'], cuadros: 8, t: 3, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [ceniza(a, 20, 18)];
      const H = v === 'cono' ? 22 : v === 'grande' ? 10 : 6, R = v === 'chica' ? 7 : 12;
      ps.push(masa([hueso([0, 0, -2], [0, 0, H], R + 6, R * 0.5), ...Array.from({ length: 5 }, (_, i) => { const t = (i / 5) * TAU + a.r(); return bulto([Math.cos(t) * R, Math.sin(t) * R, 2], [5, 4, 3 + a.r() * 3], { giro: deg(t) }); })], { mat: elegir(a, [R0, K]), suave: 3 }));
      ps.push(a.cilindro(0, 0, H - 0.4, R * 0.42, 1, { mat: 'lava', tono: lavaT(f) }));
      for (let i = 0; i < 4; i++) { const u = ciclo(f + i * 2, 8), s = v === 'chica' ? 0.7 : 1; ps.push(a.elipsoide(Math.sin(u * 4 + i) * 2 + u * 4, -u * 3, H + 2 + u * 16 * s, (1.6 + u * 3) * s, (1.6 + u * 3) * s, (1.4 + u * 2) * s, { mat: 'inf2_humo', tono: 0.1 - u * 0.2 })); }
      for (let i = 0; i < 3; i++) { const u = ciclo(f + i * 2.6, 8); ps.push(a.esfera(Math.cos(i * 2.1) * u * 8, Math.sin(i * 2.1) * u * 8, H + Math.sin(u * PI) * 20, 0.7 * (1 - u * 0.5), { mat: 'fuego' })); }
      ps.push(suelo(a));
      return { piezas: ps, resplandor: { c: [0, 0, H + 2], r: 28, color: LUZ } };
    },
  },
  // ------------------------------------------------------------------ ruinas
  {
    id: 'inf2_ruina', nombre: ['Ruinas infernales', 'Hellish ruins'], tema: 'infierno', variantes: ['muro', 'arco', 'columna', 'escalinata'], huella: [5, 2], huellaPor: { columna: [2, 2], escalinata: [4, 4] }, bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [ceniza(a, 36, 18, 6)];
      const P = 'inf2_piedra';
      if (v === 'muro') { const alt = [56, 44, 30, 50, 22]; for (let i = 0; i < 5; i++) { ps.push(a.caja(-32 + i * 16, 0, 0, 16.4, 12, alt[i] + jit(a, 6), { mat: P, tono: jit(a, 0.05) })); ps.push(pena(a, -32 + i * 16, 0, alt[i] - 2, 9, 7, 4, { mat: P })); } for (let i = 0; i < 6; i++) ps.push(pena(a, jit(a, 34), 12 + a.r() * 8, 2, 3 + a.r() * 4, 3 + a.r() * 3, 2 + a.r() * 3, { mat: P })); craneoBestia(a, ps, [-16, 7, 34], 4, 90, { cuernos: 'demonio', mat: P, matCuerno: P }); }
      else if (v === 'arco') { for (const s of [-1, 1]) ps.push(a.caja(s * 22, 0, 0, 12, 12, 54, { mat: P })); const cs: Comp[] = []; for (let i = 0; i <= 8; i++) { const t = (i / 8) * PI; if (i > 5) continue; cs.push(bulto([-Math.cos(t) * 22, 0, 54 + Math.sin(t) * 18], [5, 6, 5])); } ps.push(masa(cs, { mat: P, suave: 1.5 })); for (let i = 0; i < 4; i++) ps.push(pena(a, 14 + jit(a, 8), 10 + jit(a, 6), 3, 4 + a.r() * 3, 4, 3 + a.r() * 2, { mat: P })); }
      else if (v === 'columna') { ps.push(a.cilindro(0, 0, 0, 10, 6, { mat: P, r1: 9 }), a.cilindro(0, 0, 6, 7, 40 + a.r() * 20, { mat: P, r1: 6.4 })); for (let i = 0; i < 4; i++) ps.push(pena(a, 10 + jit(a, 8), 10 + jit(a, 8), 3, 4, 4, 4, { mat: P })); }
      else { for (let k = 0; k < 5; k++) ps.push(a.caja(-k * 5, -k * 5, k * 5, 50 - k * 4, 50 - k * 4, 5, { mat: P, giro: 0, tono: jit(a, 0.05) })); ps.push(a.caja(-28, -28, 0, 12, 12, 64, { mat: P }), a.caja(16, -28, 0, 12, 12, 40, { mat: P }), a.caja(-28, 16, 0, 12, 12, 30, { mat: P })); craneoBestia(a, ps, [-20, -20, 32], 5, 45, { cuernos: 'demonio', mat: 'inf2_basalto', matCuerno: 'inf2_basalto', ojos: 'lava' }); }
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ cuerpos
  {
    id: 'inf2_cuerpos', nombre: ['Cuerpos de condenados', 'Bodies of the damned'], tema: 'infierno', variantes: ['desollado', 'monton', 'calcinado', 'arrastrado'], huella: [2, 2], huellaPor: { monton: [3, 3] }, bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [ceniza(a, 22, 20)];
      if (v === 'monton') for (let i = 0; i < 5; i++) ps.push(...cuerpo({ cu: elegir(a, [CUERPOS.muerto, CUERPOS.desollado, CUERPOS.calcinado, CUERPOS.palido]), eq: elegir(a, [EQUIPOS.harapos, EQUIPOS.nada, EQUIPOS.preso]), acc: 'morir', f: 7, dir: elegir(a, ['s', 'se', 'e', 'so']), m: rotM(a.r() * 360), s: 0.92, t: [jit(a, 8), jit(a, 8), i * 3] }));
      else if (v === 'arrastrado') { ps.push(...cuerpo({ cu: CUERPOS.muerto, eq: EQUIPOS.preso, acc: 'morir', f: 7, dir: 'e', m: rotM(20), s: 0.95 })); ps.push(manto(a, 20, 4, 6, 'sangre', 0.5, { x: -24, tono: 0 })); cadena(a, ps, [[-6, 0, 3], [-20, 2, 0.6], [-40, 6, 0.6]], 2.4, 0.5, HI); }
      else ps.push(...cuerpo({ cu: v === 'desollado' ? CUERPOS.desollado : CUERPOS.calcinado, eq: EQUIPOS.nada, acc: 'morir', f: 7, dir: elegir(a, ['s', 'se', 'e']), m: rotM(a.r() * 360) }));
      if (v !== 'calcinado') ps.push(manto(a, 12, 10, 4, 'sangre', 0.6, { x: jit(a, 6), y: jit(a, 6), tono: 0 }));
      else for (let i = 0; i < 4; i++) ps.push(a.esfera(jit(a, 14), jit(a, 14), 1, 0.8, { mat: 'lava', tono: -0.2 }));
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ charcos de sangre
  {
    id: 'inf2_sangre', nombre: ['Charco de sangre', 'Blood pool'], tema: 'infierno', variantes: ['charca', 'manos', 'huesos'], cuadros: 8, t: 4, huella: [3, 3], bloquea: false, plano: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      ps.push(...losa(a, 26, 20, 0, 1, 'inf2_carne', 12, { tono: -0.25 }), ...losa(a, 22, 17, 0, 1.6, 'sangre', 12));
      for (let i = 0; i < 3; i++) { const u = ciclo(f + i * 2.6, 8), t = i * 2.2; ps.push(a.cilindro(Math.cos(t) * 8, Math.sin(t) * 6, 1.6, 1 + u * 6, 0.2, { mat: 'sangre', tono: 0.25 - u * 0.25 })); }
      if (v === 'manos') for (let i = 0; i < 4; i++) { const x = jit(a, 14), y = jit(a, 10), sube = 0.5 + 0.5 * onda(f, 8, i * 1.7), ld = a.r() * TAU; const codo: V3 = [x + Math.cos(ld) * 2, y + Math.sin(ld) * 2, 5 + sube * 6], mano: V3 = [x + Math.cos(ld) * 3.5, y + Math.sin(ld) * 3.5, 11 + sube * 8]; ps.push(masa([hueso([x, y, -1], codo, 1.7, 1.5), hueso(codo, mano, 1.5, 1.2), bulto(mano, [1.4, 1.9, 1.7]), ...[0, 1, 2, 3].map((k) => hueso(mano, add(mano, [Math.cos(ld + (k - 1.5) * 0.5) * 1.6, Math.sin(ld + (k - 1.5) * 0.5) * 1.6, 3.4 * (0.6 + sube)]), 0.5, 0.3, { k: 0.3 }))], { mat: 'inf2_carne', suave: 0.9 })); }
      if (v === 'huesos') { for (let i = 0; i < 3; i++) craneo(a, ps, [jit(a, 14), jit(a, 10), 2.4], 2.8, a.r() * 360, { incl: jit(a, 30) }); for (let i = 0; i < 5; i++) { const p: V3 = [jit(a, 16), jit(a, 12), 1.6]; huesoLargo(ps, p, add(p, [jit(a, 9), jit(a, 9), 0.4]), 0.9); } }
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ columna de fuego
  {
    id: 'inf2_columna_fuego', nombre: ['Columna de fuego', 'Pillar of fire'], tema: 'infierno', variantes: ['alta', 'doble', 'verde'], cuadros: 8, t: 3, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [ceniza(a, 22, 20)];
      const mat = v === 'verde' ? 'fuego_verde' : 'fuego';
      charca(a, ps, 9, 8, f);
      const una = (x: number, y: number, k: number, sem: number) => {
        ps.push(lengua([x, y, 2], [0, 0, 1], 70 * k, 6 * k, f, 8, sem, { mat, tramos: 7 }));
        for (let i = 0; i < 4; i++) { const t = (i / 4) * TAU + sem; ps.push(lengua([x + Math.cos(t) * 4 * k, y + Math.sin(t) * 4 * k, 2], [Math.cos(t) * 0.25, Math.sin(t) * 0.25, 1], 40 * k, 3.4 * k, f, 8, sem + i * 3.1, { mat, tramos: 5, tono: -0.05 })); }
      };
      if (v === 'doble') { una(-6, -4, 0.9, 1); una(7, 5, 0.7, 5); } else una(0, 0, 1, 2);
      for (let i = 0; i < 4; i++) { const u = ciclo(f + i * 2, 8); ps.push(a.esfera(Math.cos(i * 1.7) * 6, Math.sin(i * 1.7) * 6, 30 + u * 60, 1 * (1 - u * 0.5), { mat })); }
      ps.push(suelo(a));
      return { piezas: ps, resplandor: { c: [0, 0, 30], r: 64, color: v === 'verde' ? '#4ad03a' : LUZ } };
    },
  },
);

conVarianteY('inf2_rio_lava', 'inf2_puente', 'inf2_puerta');
