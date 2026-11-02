import { conVarianteY, registrar, type Arma, type Pieza, type V3 } from '../objeto';
import { MATERIALES } from '../materiales';
import { masa, hueso, bulto, ruido, type Comp } from '../render';
import {
  TAU, PI, rad, deg, add, mez, jit, elegir, ciclo, onda, suelo, rotM, transformar, tenir, cuerpo, CUERPOS, EQUIPOS, envolver,
  rematerial, roca, pena, prisma, manto, fuego, craneo, craneoBestia, huesoLargo, costillar, cadena, arbolMuerto,
} from '../actos45';

/**
 * Acto 5, las cuevas de hielo (segunda tanda): columnas de hielo con algo atrapado adentro, cristales gigantes,
 * estalactitas y salientes con carámbanos, lagos congelados con grietas, tronos y altares de escarcha, cadáveres
 * helados, cascadas congeladas, arcos, espejos de escarcha que reflejan, seracs, campos de escarcha, estatuas,
 * pilares rúnicos, erupciones de agujas, braseros de fuego azul, cofres helados, la proa de un barco preso en el
 * hielo, árboles de cristal, osamentas, el portal helado, sarcófagos, rocas escarchadas, charcos y pozos.
 *
 * El hielo "translúcido": lo atrapado se tiñe del azul del hielo (como se vería a través de él), la columna se arma
 * con el fondo macizo, aristas claras adelante, grietas de escarcha y la punta facetada, y lo de adentro queda a la
 * vista entre las aristas.
 */

MATERIALES.hie2_hielo = { rampa: ['#0c1a28', '#14283c', '#1e3a52', '#2a4f6a', '#3a6784', '#4f819e', '#6a9db8', '#8fbcd0', '#bcdce8', '#e6f6fa'], ruido: 0.22, escala: 0.1, brillo: 0.8, patron: (p) => { const r = ruido(p[0] * 0.09 + p[2] * 0.05, p[1] * 0.09, p[2] * 0.11); return r > 0.62 && r < 0.66 ? 0.22 : (r - 0.5) * 0.12; } };
MATERIALES.hie2_hondo = { rampa: ['#071019', '#0c1a28', '#132539', '#1b3249', '#25415b', '#31516e', '#3f6282'], ruido: 0.2, escala: 0.08, brillo: 0.6, patron: (p) => (ruido(p[0] * 0.07, p[1] * 0.07, p[2] * 0.07) > 0.68 ? 0.14 : 0) };
MATERIALES.hie2_escarcha = { rampa: ['#33475a', '#4a6074', '#647c90', '#8098aa', '#9db4c4', '#bccfdb', '#dae7ee', '#f0f6f9'], ruido: 0.3, escala: 0.35 };
MATERIALES.hie2_roca = { rampa: ['#10141a', '#1b222b', '#28313c', '#36414e', '#465363', '#586678', '#6c7b8e', '#8292a4'], ruido: 0.5, escala: 0.14, patron: (p) => (ruido(p[0] * 0.4, p[1] * 0.4, p[2] * 1.2) > 0.7 ? -0.15 : 0) };
MATERIALES.hie2_agua = { rampa: ['#02050a', '#050b14', '#09121f', '#0e1b2c', '#15263a'], ruido: 0.15, escala: 0.1, brillo: 1 };
MATERIALES.hie2_reflejo = { rampa: ['#1a2a38', '#2a4052', '#3e586c', '#567388', '#7290a4', '#94b0c2', '#bad0dd', '#e2eef4'], ruido: 0.08, escala: 0.05, brillo: 1.2, patron: (p) => (Math.sin((p[0] - p[1]) * 0.35 + p[2] * 0.2) > 0.92 ? 0.18 : 0) };
MATERIALES.hie2_luz = { rampa: ['#0e3a50', '#16587a', '#2480a8', '#46aad0', '#80d0ec', '#c4ecf8', '#f0fbff'], ruido: 0.4, escala: 0.2, emite: true };
MATERIALES.hie2_luz_violeta = { rampa: ['#24124a', '#3a1f78', '#5634a8', '#7a58d0', '#a888ec', '#d6c4fa', '#f6f0ff'], ruido: 0.45, escala: 0.2, emite: true };

const H2 = 'hie2_hielo', HO = 'hie2_hondo', E = 'hie2_escarcha';
/** Lo que se ve a través del hielo: azulado, lavado y con brillo. */
const atrapado = (ps: Pieza[], k = 0.55) => tenir(ps, 'hie2_t' + Math.round(k * 100), '#5d9cc4', k, -0.05, 0.7);

// ------------------------------------------------------------------ piezas de hielo
/** Escarcha en el piso alrededor (manto claro). */
const helada = (a: Arma, rx: number, ry: number, n = 5) => manto(a, rx, ry, n, E, 1.6, { tono: -0.1 });
/** Racimo de cristales que salen de c hacia arriba y afuera. */
function racimo(a: Arma, ps: Pieza[], c: V3, n: number, L: number, r: number, mat = H2, abre = 0.5) {
  for (let i = 0; i < n; i++) { const t = a.r() * TAU, k = i === 0 ? 0.08 : abre * (0.4 + a.r() * 0.8); ps.push(prisma(a, add(c, [Math.cos(t) * r * 0.6 * k * 2, Math.sin(t) * r * 0.6 * k * 2, 0]), [Math.cos(t) * k, Math.sin(t) * k, 1], L * (i === 0 ? 1 : 0.45 + a.r() * 0.45), r * (i === 0 ? 1 : 0.5 + a.r() * 0.4), mat, jit(a, 0.08))); }
}
/** Carámbanos colgando de una línea a la altura z, entre p y q. */
function carambanos(a: Arma, ps: Pieza[], p: V3, q: V3, n: number, L: number, r = 1.2) {
  for (let i = 0; i < n; i++) { const c = mez(p, q, (i + 0.5) / n + jit(a, 0.3 / n)), l = L * (0.3 + a.r() * 0.7); ps.push(a.cilindro(c[0], c[1], c[2] - l, 0.12, l, { mat: H2, r1: r * (0.6 + a.r() * 0.6), tono: 0.08 })); }
}
/**
 * Columna de hielo que encierra `dentro`: el fondo macizo y oscuro, aristas claras adelante, grietas de escarcha, la
 * base que tapa los pies y la corona de puntas. Las caras de adelante quedan abiertas para ver lo atrapado.
 */
function vitrina(a: Arma, ps: Pieza[], c: V3, R: number, H: number, dentro: Pieza[], o: { lados?: number; rota?: boolean; tapa?: boolean } = {}) {
  const n = o.lados ?? 7, g0 = a.r() * TAU, rs = Array.from({ length: n }, () => R * (0.88 + a.r() * 0.24));
  const P = (i: number, z: number, k = 1): V3 => { const t = g0 + (i / n) * TAU; return [c[0] + Math.cos(t) * rs[i % n] * k, c[1] + Math.sin(t) * rs[i % n] * k, c[2] + z]; };
  const frente = (i: number) => { const t = g0 + ((i + 0.5) / n) * TAU; return Math.cos(t) + Math.sin(t) > -0.2; };
  const Hc = o.rota ? H * 0.55 : H;
  // el fondo: cuñas macizas en las caras de atrás
  for (let i = 0; i < n; i++) if (!frente(i)) ps.push(a.poliedro([P(i, 0), P(i + 1, 0), P(i, Hc + jit(a, 4)), P(i + 1, Hc + jit(a, 4)), P(i, 0, 0.55), P(i + 1, 0, 0.55), P(i, Hc, 0.55), P(i + 1, Hc, 0.55)], { mat: HO, tono: jit(a, 0.05) }));
  ps.push(...dentro);
  // aristas claras en las esquinas de adelante y grietas que las cruzan
  for (let i = 0; i < n; i++) {
    const t = g0 + (i / n) * TAU; if (Math.cos(t) + Math.sin(t) < -0.6) continue;
    ps.push(a.palo(P(i, 0), P(i, Hc - 2 + jit(a, 3)), 1.3 + a.r() * 0.6, { mat: H2, r1: 0.9, tono: 0.15 }));
  }
  for (let i = 0; i < 3; i++) { const k = Math.floor(a.r() * n); if (!frente(k)) continue; const z0 = a.r() * Hc * 0.6; ps.push(a.palo(P(k, z0, 1.01), P(k + 1, z0 + Hc * (0.15 + a.r() * 0.25), 1.01), 0.35, { mat: E, tono: 0.1 })); }
  // la base (tapa los pies) y la corona
  const base: V3[] = [];
  for (let i = 0; i < n; i++) base.push(P(i, -1, 1.06), P(i, 6 + a.r() * 5, 1.02));
  ps.push(a.poliedro(base, { mat: H2, tono: -0.04 }));
  if (o.tapa !== false) {
    const top: V3[] = [];
    for (let i = 0; i < n; i++) top.push(P(i, Hc - 5, 1.02), P(i, Hc + 2 + a.r() * 3, 0.8));
    ps.push(a.poliedro(top, { mat: H2, tono: 0.05 }));
    racimo(a, ps, add(c, [0, 0, Hc + 2]), 4, R * (o.rota ? 0.9 : 1.6), R * 0.35);
  }
  if (o.rota) for (let i = 0; i < 6; i++) ps.push(pena(a, c[0] + jit(a, R * 1.8), c[1] + R + a.r() * R, 2, 3 + a.r() * 4, 3 + a.r() * 3, 2.5 + a.r() * 3, { mat: H2, tono: 0.05 }));
}
/** Losa irregular plana (lagos, charcos): polígono de n puntos extruido. */
function losa(a: Arma, R: number, ry: number, z0: number, z1: number, mat: string, n = 12, o: { x?: number; y?: number; tono?: number } = {}): Pieza[] {
  // en cuñas convexas desde el centro (el contorno irregular no es convexo)
  const rr = Array.from({ length: n }, () => 0.78 + a.r() * 0.3), ps: Pieza[] = [], x = o.x ?? 0, y = o.y ?? 0;
  for (let i = 0; i < n; i++) {
    const t0 = (i / n) * TAU, t1 = ((i + 1) / n) * TAU, k0 = rr[i], k1 = rr[(i + 1) % n];
    const q = [[x, y], [x + Math.cos(t0) * R * k0, y + Math.sin(t0) * ry * k0], [x + Math.cos(t1) * R * k1, y + Math.sin(t1) * ry * k1]];
    ps.push(a.poliedro(q.flatMap(([u, w]) => [[u, w, z0], [u, w, z1]] as V3[]), { mat, tono: o.tono }));
  }
  return ps;
}
/** Grietas: líneas quebradas finas sobre el plano z. */
function grietas(a: Arma, ps: Pieza[], R: number, ry: number, z: number, n: number, mat = E) {
  for (let i = 0; i < n; i++) {
    let p: V3 = [jit(a, R * 0.3), jit(a, ry * 0.3), z], t = a.r() * TAU;
    for (let k = 0; k < 4; k++) { t += jit(a, 0.6); const q: V3 = [p[0] + Math.cos(t) * R * 0.18, p[1] + Math.sin(t) * ry * 0.18, z]; if (Math.hypot(q[0] / R, q[1] / ry) > 0.85) break; ps.push(a.palo(p, q, 0.3 + (3 - k) * 0.06, { mat, tono: 0.15 })); if (a.r() < 0.4) { const t2 = t + jit(a, 1.4); ps.push(a.palo(q, [q[0] + Math.cos(t2) * R * 0.1, q[1] + Math.sin(t2) * ry * 0.1, z], 0.25, { mat, tono: 0.1 })); } p = q; }
  }
}

registrar(
  // ------------------------------------------------------------------ columnas con algo atrapado
  {
    id: 'hie2_columna', nombre: ['Columna de hielo con prisionero', 'Ice column with captive'], tema: 'hielo', variantes: ['guerrero', 'demonio', 'craneo', 'bruja', 'vacia', 'rota'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [helada(a, 22, 20)];
      let dentro: Pieza[] = [], H = 74, R = 15;
      if (v === 'guerrero' || v === 'rota') dentro = cuerpo({ cu: CUERPOS.barbaro_rubio, eq: EQUIPOS.barbaro_espada, acc: v === 'rota' ? 'atacar' : 'quieto', f: v === 'rota' ? 5 : 0, dir: 'se', t: [0, 0, 2] });
      else if (v === 'demonio') { dentro = cuerpo({ cu: CUERPOS.demonio, eq: EQUIPOS.demonio, acc: 'atacar', f: 2, dir: 's', t: [0, 0, 2], s: 0.95 }); H = 96; R = 19; }
      else if (v === 'bruja') dentro = cuerpo({ cu: CUERPOS.mujer, eq: { torso: { tipo: 'vestido', mat: 'cu_tela_morada' }, cabeza: { tipo: 'diadema', mat: 'cu_oro' } }, acc: 'lanzar', f: 4, dir: 'so', t: [0, 0, 6] });
      else if (v === 'craneo') { craneoBestia(a, dentro, [0, 0, 34], 8, 45, { cuernos: 'demonio', colmillos: true, incl: -10 }); }
      else { dentro.push(a.elipsoide(0, 0, 36, 5, 5, 14, { mat: 'hie2_luz', tono: -0.15 })); }
      vitrina(a, ps, [0, 0, 0], R, H, v === 'vacia' ? dentro : atrapado(dentro, v === 'rota' ? 0.35 : 0.55), { rota: v === 'rota' });
      ps.push(suelo(a));
      return v === 'vacia' ? { piezas: ps, resplandor: { c: [0, 0, 36], r: 34, color: '#80d0ec' } } : ps;
    },
  },
  // ------------------------------------------------------------------ cristales gigantes
  {
    id: 'hie2_cristal', nombre: ['Cristal gigante', 'Giant ice crystal'], tema: 'hielo', variantes: ['cumulo', 'gigante', 'inclinado', 'brillante', 'negro'], huella: [2, 2], huellaPor: { gigante: [3, 3] }, bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [helada(a, 22, 20)];
      ps.push(...roca(a, [0, 0, 1], [10, 9, 5], { mat: 'hie2_roca', n: 4, facetas: 2 }));
      const mat = v === 'negro' ? HO : H2;
      if (v === 'cumulo') racimo(a, ps, [0, 0, 0], 7, 46, 6);
      else if (v === 'gigante') { ps.push(prisma(a, [0, 0, -2], [jit(a, 0.1), jit(a, 0.1), 1], 110, 12, mat)); racimo(a, ps, [4, 4, 0], 6, 50, 6, mat, 0.8); }
      else if (v === 'inclinado') { ps.push(prisma(a, [-6, -6, -2], [0.6, 0.5, 1], 80, 9, mat)); racimo(a, ps, [6, 2, 0], 4, 34, 5, mat, 0.7); }
      else if (v === 'brillante') { ps.push(prisma(a, [0, 0, -2], [0, 0, 1], 70, 9, 'hie2_luz')); racimo(a, ps, [2, 2, 0], 5, 36, 5, mat, 0.9); }
      else racimo(a, ps, [0, 0, 0], 6, 58, 7, mat, 0.6);
      for (let i = 0; i < 5; i++) { const t = a.r() * TAU; ps.push(prisma(a, [Math.cos(t) * 16, Math.sin(t) * 16, -1], [Math.cos(t) * 0.6, Math.sin(t) * 0.6, 1], 6 + a.r() * 8, 1.6 + a.r(), mat, 0.05)); }
      ps.push(suelo(a));
      return v === 'brillante' ? { piezas: ps, resplandor: { c: [0, 0, 34], r: 46, color: '#80d0ec' } } : ps;
    },
  },
  // ------------------------------------------------------------------ estalactitas y salientes
  {
    id: 'hie2_estalactita', nombre: ['Estalactitas de hielo', 'Ice stalactites'], tema: 'hielo', variantes: ['saliente', 'estalagmitas', 'columnas', 'arco_roca'], huella: [3, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [helada(a, 30, 20)];
      if (v === 'estalagmitas') for (let i = 0; i < 9; i++) { const x = jit(a, 26), y = jit(a, 14), L = 12 + a.r() * 34; ps.push(masa([hueso([x, y, -1], [x + jit(a, 2), y + jit(a, 2), L], 3 + L * 0.08, 0.3), bulto([x, y, 1], [4 + L * 0.06, 4 + L * 0.06, 3])], { mat: a.r() < 0.4 ? E : H2, suave: 1.5 })); }
      else {
        // una saliente de roca con el manto de hielo y los carámbanos que cuelgan hasta el piso
        const H = v === 'arco_roca' ? 60 : 52;
        ps.push(...roca(a, [-22, -6, H * 0.45], [12, 12, H * 0.55], { mat: 'hie2_roca', n: 6 }));
        if (v === 'arco_roca') ps.push(...roca(a, [24, -4, H * 0.45], [11, 11, H * 0.55], { mat: 'hie2_roca', n: 6 }));
        ps.push(...roca(a, [0, -4, H], [32, 15, 9], { mat: 'hie2_roca', n: 8, cubre: E, cubreAlto: 0.6 }));
        carambanos(a, ps, [-26, 6, H - 6], [26, 4, H - 6], 14, v === 'columnas' ? 10 : 30, 2);
        carambanos(a, ps, [-20, -12, H - 6], [20, -12, H - 6], 7, 22, 1.6);
        if (v === 'columnas') for (let i = 0; i < 4; i++) { const x = -16 + i * 11 + jit(a, 2); ps.push(masa([hueso([x, 4, 0], [x, 4, H - 6], 3.4, 2.4), bulto([x, 4, 2], [5, 5, 3]), bulto([x, 4, H * 0.5], [3.4, 3.4, 6])], { mat: H2, suave: 1.6 })); }
        else for (let i = 0; i < 5; i++) { const x = -20 + i * 10 + jit(a, 3); ps.push(a.cilindro(x, 6 + jit(a, 3), -1, 2.6, 5 + a.r() * 10, { mat: H2, r1: 0.2 })); }
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ lago congelado
  {
    id: 'hie2_lago', nombre: ['Lago congelado', 'Frozen lake'], tema: 'hielo', variantes: ['chico', 'grande', 'agrietado', 'agujero', 'atrapado'], huella: [4, 3], huellaPor: { grande: [6, 5] }, bloquea: false, plano: true,
    armar: (v, _f, a) => {
      const R = v === 'grande' ? 48 : 30, ry = v === 'grande' ? 38 : 22, ps: Pieza[] = [];
      ps.push(...losa(a, R + 7, ry + 6, 0, 1.4, E, 14, { tono: -0.12 }));
      ps.push(...losa(a, R, ry, 0, 1.8, H2, 14));
      // reflejos claros que barren la superficie
      for (let i = 0; i < 3; i++) ps.push(a.caja(jit(a, R * 0.4), jit(a, ry * 0.4), 1.8, R * (0.3 + a.r() * 0.3), 1.2, 0.15, { mat: H2, giro: -45 + jit(a, 8), tono: 0.25 }));
      grietas(a, ps, R, ry, 1.95, v === 'agrietado' ? 7 : 2);
      if (v === 'agujero') { ps.push(...losa(a, R * 0.32, ry * 0.32, 1.7, 2.0, 'hie2_agua', 9, { x: R * 0.2, y: -ry * 0.1 })); for (let i = 0; i < 6; i++) ps.push(pena(a, R * 0.2 + jit(a, R * 0.35), -ry * 0.1 + jit(a, ry * 0.35), 2, 2 + a.r() * 2.5, 1.6 + a.r() * 2, 1.2, { mat: H2, tono: 0.05 })); }
      if (v === 'atrapado') ps.push(...transformar(atrapado(cuerpo({ cu: CUERPOS.soldado, eq: EQUIPOS.soldado, acc: 'morir', f: 7, dir: 'so' }), 0.78), rotM(30), [0, 0, -3.6]));
      for (let i = 0; i < 7; i++) { const t = a.r() * TAU; ps.push(pena(a, Math.cos(t) * (R + 4), Math.sin(t) * (ry + 4), 1, 2.5 + a.r() * 3, 2 + a.r() * 2, 1.6 + a.r() * 1.6, { mat: elegir(a, ['hie2_roca', E]) })); }
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ tronos de escarcha
  {
    id: 'hie2_trono', nombre: ['Trono de escarcha', 'Frost throne'], tema: 'hielo', variantes: ['vacio', 'rey', 'roto', 'espinas'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [helada(a, 30, 28)];
      ps.push(...losa(a, 22, 22, 0, 4, HO, 8), ...losa(a, 17, 17, 4, 8, H2, 8));
      const roto = v === 'roto';
      // asiento y respaldo de bloques de hielo, el respaldo mirando al frente (+x +y)
      ps.push(a.caja(0, 0, 8, 18, 18, 8, { mat: H2, giro: 45 }));
      ps.push(...transformar([a.caja(0, 0, 0, 22, 5, roto ? 26 : 52, { mat: H2 })], rotM(-45, -6), [-8, -8, 8]));
      for (const s of [-1, 1]) ps.push(...transformar([a.caja(0, 0, 0, 5, 16, 16, { mat: H2, tono: 0.04 })], rotM(-45), [-s * 9 * 0.7 + 1, s * 9 * 0.7 + 1, 8].map((x, i) => i < 2 ? x : x) as V3));
      if (!roto) racimo(a, ps, [-8, -8, 56], v === 'espinas' ? 7 : 4, v === 'espinas' ? 30 : 20, 3.4, H2, 0.9);
      else for (let i = 0; i < 7; i++) ps.push(pena(a, jit(a, 18) + 6, jit(a, 18) + 6, 2, 3 + a.r() * 4, 3 + a.r() * 3, 2 + a.r() * 3, { mat: H2 }));
      if (v === 'espinas') for (let i = 0; i < 10; i++) { const t = (i / 10) * TAU; ps.push(prisma(a, [Math.cos(t) * 20, Math.sin(t) * 20, 2], [Math.cos(t) * 0.5, Math.sin(t) * 0.5, 1], 14 + a.r() * 16, 2.6, H2)); }
      if (v === 'rey') {
        // un rey esqueleto con corona, de rodillas ante su trono, helado
        ps.push(...atrapado(cuerpo({ cu: CUERPOS.esqueleto, eq: { cabeza: { tipo: 'corona', mat: 'cu_oro', mat2: 'cu_ojo_hielo' }, capa: { mat: 'cu_tela_azul' }, torso: { tipo: 'tunica', mat: 'cu_tela_azul' } }, acc: 'morir', f: 3, dir: 'se', t: [10, 10, 8] }), 0.3));
        ps.push(...transformar([a.palo([0, 0, 0], [0, 0, 44], 1, { mat: 'cu_oro' }), a.esfera(0, 0, 46, 2.6, { mat: 'hie2_luz' })], rotM(0, 0, 12), [-2, 12, 8]));
      }
      for (const s of [-1, 1]) ps.push(prisma(a, [s * 18 * 0.7 - 6, -s * 18 * 0.7 - 6, 2], [0, 0, 1], 34 + a.r() * 8, 3.4, H2));
      ps.push(suelo(a));
      return v === 'rey' ? { piezas: ps, resplandor: { c: [-2, 12, 50], r: 28, color: '#80d0ec' } } : ps;
    },
  },
  // ------------------------------------------------------------------ altares de escarcha
  {
    id: 'hie2_altar', nombre: ['Altar de escarcha', 'Frost altar'], tema: 'hielo', variantes: ['ofrenda', 'sangre', 'orbe', 'runas'], cuadros: 8, t: 4, huella: [3, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [helada(a, 30, 22)];
      ps.push(...losa(a, 24, 17, 0, 3, HO, 9));
      ps.push(a.caja(0, 0, 3, 34, 16, 14, { mat: H2 }), a.caja(0, 0, 17, 38, 20, 3, { mat: H2, tono: 0.06 }));
      for (const s of [-1, 1]) racimo(a, ps, [s * 20, 0, 2], 3, 28, 3, H2, 0.5);
      carambanos(a, ps, [-18, 10, 17], [18, 10, 17], 8, 8, 1);
      let res: string | null = null;
      if (v === 'ofrenda') { const u = ciclo(f, 8); ps.push(a.esfera(-18 + u * 36, 10.6, 20, 0.7 + Math.sin(u * PI) * 0.5, { mat: 'hie2_luz' })); ps.push(...atrapado(cuerpo({ cu: CUERPOS.muerto, eq: EQUIPOS.preso, acc: 'morir', f: 7, dir: 'e', m: rotM(0), s: 0.62, t: [0, 0, 20] }), 0.25)); }
      else if (v === 'sangre') { ps.push(...losa(a, 12, 7, 20, 20.6, 'cu_sangre_viva', 7, { tono: -0.3 + onda(f, 8) * 0.1 })); craneo(a, ps, [6, 3, 23.5], 3, 45); for (let i = 0; i < 3; i++) { const u = ciclo(f + i * 2.6, 8); ps.push(a.elipsoide(-6 + i * 6, 10.4, 18 - u * 16, 0.5, 0.5, 1, { mat: 'cu_sangre_viva' })); } res = '#c01818'; }
      else if (v === 'orbe') { const z = 34 + onda(f, 8) * 2; ps.push(a.esfera(0, 0, z, 4.4, { mat: 'hie2_luz' })); for (let i = 0; i < 6; i++) { const t = (i / 6) * TAU + ciclo(f, 8) * TAU; ps.push(prisma(a, [Math.cos(t) * 9, Math.sin(t) * 9, z - 3], [0, 0, 1], 6, 1, H2, 0.2, 4)); } ps.push(a.cilindro(0, 0, 20, 3, 6, { mat: H2, r1: 1.4 })); res = '#80d0ec'; }
      else { for (let i = 0; i < 5; i++) { const brillo = 0.5 + 0.5 * onda(f, 8, i * 1.2); ps.push(a.caja(-12 + i * 6, 8.2, 8, 3, 0.5, 5, { mat: 'hie2_luz_violeta', tono: -0.4 + brillo * 0.4 })); } ps.push(a.cilindro(0, 0, 20.2, 7, 0.4, { mat: 'hie2_luz_violeta', tono: -0.3 + onda(f, 8) * 0.15 })); res = '#a888ec'; }
      ps.push(suelo(a));
      return res ? { piezas: ps, resplandor: { c: [0, 0, 26], r: 40, color: res } } : ps;
    },
  },
  // ------------------------------------------------------------------ cadáveres helados
  {
    id: 'hie2_cadaver', nombre: ['Cadáver helado', 'Frozen corpse'], tema: 'hielo', variantes: ['tendido', 'arrodillado', 'abrazados', 'bestia', 'esqueleto'], huella: [2, 2], huellaPor: { bestia: [3, 3] }, bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [helada(a, 26, 22)];
      let cs: Pieza[] = [];
      if (v === 'tendido') cs = cuerpo({ cu: CUERPOS.soldado, eq: EQUIPOS.soldado_lanza, acc: 'morir', f: 7, dir: elegir(a, ['s', 'se', 'e']) });
      else if (v === 'arrodillado') cs = cuerpo({ cu: CUERPOS.barbaro, eq: EQUIPOS.barbaro_hacha, acc: 'morir', f: 3, dir: 'se' });
      else if (v === 'abrazados') { cs = [...cuerpo({ cu: CUERPOS.mujer, eq: EQUIPOS.preso, acc: 'morir', f: 4, dir: 'so', t: [-5, 5, 0] }), ...cuerpo({ cu: CUERPOS.soldado_moreno, eq: EQUIPOS.preso, acc: 'morir', f: 3, dir: 'se', t: [4, -4, 0] })]; }
      else if (v === 'bestia') { craneoBestia(a, cs, [24, 0, 12], 8, 0, { cuernos: 'toro', colmillos: true, incl: 15 }); cs.push(masa([bulto([0, 0, 14], [26, 15, 14]), bulto([-22, 0, 10], [12, 12, 10]), ...[[-18, 1], [-12, -1], [12, 1], [16, -1]].map(([x, s]) => hueso([x, s * 10, 8], [x + 6, s * 22, 2], 4, 3))], { mat: 'cu_pelaje_gris', suave: 4 })); }
      else cs = cuerpo({ cu: CUERPOS.esqueleto, eq: EQUIPOS.oxidado, acc: 'morir', f: 7, dir: 'so' });
      ps.push(...atrapado(cs, 0.62));
      // costra de hielo encima y agujas alrededor
      const [lo, hi] = envolver(cs);
      for (let i = 0; i < 6; i++) ps.push(pena(a, lo[0] + a.r() * (hi[0] - lo[0]), lo[1] + a.r() * (hi[1] - lo[1]), 2 + a.r() * 4, 4 + a.r() * 5, 3 + a.r() * 4, 2 + a.r() * 3, { mat: H2, tono: 0.08 }));
      for (let i = 0; i < 6; i++) { const t = a.r() * TAU, d = 14 + a.r() * 8; ps.push(prisma(a, [Math.cos(t) * d, Math.sin(t) * d, -1], [Math.cos(t) * 0.4, Math.sin(t) * 0.4, 1], 6 + a.r() * 12, 1.8 + a.r(), H2)); }
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ cascada helada
  {
    id: 'hie2_cascada', nombre: ['Cascada helada', 'Frozen waterfall'], tema: 'hielo', variantes: ['alta', 'ancha', 'rota', 'goteo'], cuadros: 8, t: 3, huella: [4, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [helada(a, 34, 22)];
      const H = v === 'alta' ? 96 : 70, W = v === 'ancha' ? 34 : 22;
      // el risco detrás
      for (let i = 0; i < 4; i++) ps.push(pena(a, -W + (i / 3) * 2 * W + jit(a, 4), -20 + jit(a, 3), H * 0.5, W * 0.55, 10, H * 0.56 + jit(a, 6), { mat: 'hie2_roca', n: 10 }));
      // la caída congelada: chorros de masa que bajan, se ensanchan y forman un charco al pie
      const n = Math.round(W / 3.4), cs: Comp[] = [];
      for (let i = 0; i < n; i++) {
        const x = -W + (i + 0.5) * (2 * W / n) + jit(a, 1.2), top = H * (0.86 + a.r() * 0.1), mat = i % 4 === 2 ? E : H2;
        if (v === 'rota' && i % 3 === 1) { cs.push(hueso([x, -9, top], [x + jit(a, 2), -6, top * 0.55], 3, 0.6, { mat })); continue; }
        // cada chorro baja ondulando y se abre al pie
        let p: V3 = [x, -10, top];
        for (let k = 1; k <= 4; k++) { const t = k / 4, q: V3 = [x + Math.sin(t * 5 + i) * 1.6, -10 + t * t * 14, top * (1 - t) + 2]; cs.push(hueso(p, q, 2.8 + t * 1.4 + a.r() * 0.6, 3 + t * 2, { mat })); p = q; }
      }
      ps.push(masa(cs, { mat: H2, suave: 4.5 }));
      for (let i = 0; i < 4; i++) ps.push(a.elipsoide(-W + (i / 3) * 2 * W + jit(a, 3), -18, H * 0.96 + jit(a, 3), W * 0.4, 9, 5.5, { mat: E, giro: jit(a, 25) }));
      ps.push(...losa(a, W + 8, 14, 0, 4, H2, 10, { y: 10 }));
      if (v === 'rota') for (let i = 0; i < 7; i++) ps.push(pena(a, jit(a, W), 14 + a.r() * 10, 3, 3 + a.r() * 4, 3 + a.r() * 3, 3 + a.r() * 3, { mat: H2 }));
      carambanos(a, ps, [-W - 4, -6, H - 2], [W + 4, -6, H - 2], 10, 14, 1.6);
      // gotas que caen y el brillo que corre por el hielo
      for (let i = 0; i < (v === 'goteo' ? 5 : 2); i++) { const u = ciclo(f + i * 1.7, 8), x = -W + (i + 0.5) * (2 * W / 5); ps.push(a.elipsoide(x, 4, H * 0.7 * (1 - u), 0.5, 0.5, 1.2, { mat: 'hie2_luz', tono: -0.2 })); }
      const u = ciclo(f, 8); ps.push(a.caja(-W + u * 2 * W, 7, 4, 2, 1, H * 0.6, { mat: H2, tono: 0.3, incl: 4, inclEje: 'y' }));
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ arcos de hielo
  {
    id: 'hie2_arco', nombre: ['Arco de hielo', 'Ice arch'], tema: 'hielo', variantes: ['entero', 'roto', 'doble'], huella: [5, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [helada(a, 40, 16)];
      const arco = (y: number, R: number, g: number) => {
        const cs: Comp[] = [], n = 9, fin = v === 'roto' ? 6 : n;
        for (let i = 0; i < fin; i++) { const t0 = (i / n) * PI, t1 = ((i + 1) / n) * PI; const p: V3 = [-Math.cos(t0) * R, y, Math.sin(t0) * R * 1.25], q: V3 = [-Math.cos(t1) * R, y, Math.sin(t1) * R * 1.25]; cs.push(hueso(p, q, g * (1.2 - Math.sin(t0) * 0.45), g * (1.2 - Math.sin(t1) * 0.45))); if (a.r() < 0.6) cs.push(bulto(add(mez(p, q, 0.5), [0, jit(a, 2), 0]), [g * 0.9, g * 0.9, g * 0.9], { mat: a.r() < 0.4 ? E : H2 })); }
        ps.push(masa(cs, { mat: H2, suave: 3 }));
        for (let i = 1; i < 8; i++) if (a.r() < 0.55 && !(v === 'roto' && i > 5)) { const t = (i / 9) * PI; ps.push(prisma(a, [-Math.cos(t) * R, y, Math.sin(t) * R * 1.25 + g * 0.6], [-Math.cos(t) * 0.6 + jit(a, 0.3), jit(a, 0.4), Math.sin(t) + 0.3], 8 + a.r() * 10, 1.8 + a.r(), H2, 0.05)); }
        for (let i = 1; i < 8; i++) { const t = (i / 9) * PI; if (v === 'roto' && i > 5) continue; ps.push(a.cilindro(-Math.cos(t) * R, y + g * 0.5, Math.sin(t) * R * 1.25 - g - 6 - a.r() * 6, 0.15, 6 + a.r() * 6, { mat: H2, r1: 1.4 })); }
      };
      arco(0, 32, 6);
      if (v === 'doble') arco(-14, 26, 4.6);
      for (const s of [-1, 1]) racimo(a, ps, [s * 32, 0, 0], 4, 22, 5, H2, 0.6);
      if (v === 'roto') { for (let i = 0; i < 8; i++) ps.push(pena(a, 18 + jit(a, 12), 8 + jit(a, 8), 2, 3 + a.r() * 5, 3 + a.r() * 4, 2 + a.r() * 4, { mat: elegir(a, [H2, E]) })); }
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ espejos de escarcha
  {
    id: 'hie2_espejo', nombre: ['Espejo de escarcha', 'Frost mirror'], tema: 'hielo', variantes: ['marco', 'tallado', 'roto', 'reflejo'], cuadros: 8, t: 4, huella: [2, 1], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [helada(a, 18, 14)];
      const W = 24, H = v === 'tallado' ? 54 : 46, loc: Pieza[] = [];
      // la luna del espejo (mira hacia +y) y su marco de hielo
      loc.push(a.caja(0, 0, 6, W, 2.4, H, { mat: HO }), a.caja(0, 1.1, 8, W - 4, 0.6, H - 4, { mat: 'hie2_reflejo', tono: v === 'roto' ? -0.1 : 0 }));
      const marco: Comp[] = [];
      const borde = (t: number): V3 => [Math.cos(t) * W * 0.54 + jit(a, 0.8), 0.6, 6 + H / 2 + Math.sin(t) * H * 0.53 + jit(a, 0.8)];
      for (let i = 0; i < 14; i++) { const t0 = (i / 14) * TAU, t1 = ((i + 1) / 14) * TAU; marco.push(hueso(borde(t0), borde(t1), 2.4 + a.r() * 1.2, 2.4 + a.r() * 1.2, { mat: i % 4 ? H2 : E })); }
      loc.push(masa(marco, { mat: H2, suave: 2.2 }));
      for (let i = 0; i < 9; i++) { const t = (i / 9) * PI * 1.1 - PI * 0.05, b = borde(t); loc.push(prisma(a, b, [Math.cos(t), jit(a, 0.3), Math.sin(t) * 1.2 + 0.2], 5 + a.r() * 9, 1.4 + a.r() * 0.8, H2, 0.05)); }
      loc.push(...roca(a, [0, 0, 3], [12, 6, 5], { mat: H2, n: 4, facetas: 2 }));
      if (v === 'tallado') { racimo(a, loc, [0, 0, 6 + H], 5, 20, 3, H2, 0.7); for (const s of [-1, 1]) loc.push(prisma(a, [s * 14, 0, 2], [s * 0.2, 0, 1], H + 10, 3, H2)); }
      // lo que refleja: una figura pálida que se mece (cara + hombros) bajo la escarcha
      const k = 0.5 + 0.5 * onda(f, 8);
      if (v === 'reflejo' || v === 'marco' || v === 'tallado') {
        const cs: Comp[] = [bulto([jit(a, 1) + Math.sin(f * 0.8) * 0.6, 1.4, 6 + H * 0.62], [3.6, 0.5, 4.6]), bulto([0, 1.4, 6 + H * 0.42], [8, 0.5, 5])];
        loc.push(masa(cs, { mat: v === 'reflejo' ? 'cu_ectoplasma' : 'hie2_hondo', suave: 2, tono: v === 'reflejo' ? -0.35 + k * 0.25 : 0.1 }));
        if (v === 'reflejo') for (const s of [-1, 1]) loc.push(a.esfera(s * 1.3, 1.9, 6 + H * 0.64, 0.6, { mat: 'cu_ojo_hielo' }));
      }
      if (v === 'roto') { for (let i = 0; i < 6; i++) loc.push(a.palo([jit(a, 2), 1.5, 6 + H * 0.5], [jit(a, W * 0.45), 1.5, 6 + H * 0.5 + jit(a, H * 0.45)], 0.3, { mat: E, tono: 0.2 })); for (let i = 0; i < 5; i++) loc.push(pena(a, jit(a, 10), 8 + a.r() * 6, 0.5, 2 + a.r() * 2, 1.5, 0.6, { mat: 'hie2_reflejo' })); }
      // escarcha que trepa por los bordes de la luna
      for (let i = 0; i < 7; i++) loc.push(a.elipsoide(elegir(a, [-1, 1]) * (W / 2 - 3), 1.4, 8 + a.r() * H * 0.9, 2.6, 0.6, 3 + a.r() * 3, { mat: E, tono: 0.1 }));
      ps.push(...transformar(loc, rotM(-35 + jit(a, 10)), [0, 0, 0]));
      ps.push(suelo(a));
      return v === 'reflejo' ? { piezas: ps, resplandor: { c: [0, 6, 30], r: 22, color: '#80d0ec' } } : ps;
    },
  },
);

registrar(
  // ------------------------------------------------------------------ seracs
  {
    id: 'hie2_serac', nombre: ['Serac', 'Ice serac'], tema: 'hielo', variantes: ['serac', 'grupo', 'derrumbe', 'torre'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [helada(a, 30, 26)];
      const bloque = (x: number, y: number, s: number, h: number) => { ps.push(pena(a, x, y, h * 0.5, s, s * 0.85, h * 0.55, { mat: elegir(a, [H2, H2, HO]), n: 9, tono: jit(a, 0.05) })); ps.push(a.elipsoide(x, y, h * 0.95, s * 0.6, s * 0.5, 1.8, { mat: E })); };
      if (v === 'serac') { bloque(0, 0, 16, 44); bloque(14, 10, 9, 20); }
      else if (v === 'grupo') { bloque(-10, -8, 14, 40); bloque(12, -4, 11, 30); bloque(-2, 14, 9, 22); bloque(18, 16, 6, 12); }
      else if (v === 'torre') { bloque(0, 0, 13, 30); ps.push(pena(a, 2, -2, 44, 10, 8, 20, { mat: H2, n: 9 })); ps.push(prisma(a, [2, 0, 66], [0.1, 0, 1], 24, 4, H2)); }
      else for (let i = 0; i < 9; i++) { const t = a.r() * TAU, d = a.r() * 22, s = 4 + a.r() * 8; ps.push(pena(a, Math.cos(t) * d, Math.sin(t) * d, s * 0.6, s, s * 0.8, s * 0.8, { mat: elegir(a, [H2, HO, E]) })); }
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ campos de escarcha
  {
    id: 'hie2_escarcha', nombre: ['Campo de escarcha', 'Frost field'], tema: 'hielo', variantes: ['flores', 'agujas', 'campo', 'helechos'], huella: [3, 3], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [helada(a, 30, 26, 6)];
      const n = v === 'campo' ? 26 : 14;
      for (let i = 0; i < n; i++) {
        const t = a.r() * TAU, d = Math.sqrt(a.r()) * 26, c: V3 = [Math.cos(t) * d, Math.sin(t) * d, 0];
        if (v === 'flores') { for (let k = 0; k < 6; k++) { const an = (k / 6) * TAU + a.r(); ps.push(prisma(a, c, [Math.cos(an) * 0.8, Math.sin(an) * 0.8, 0.6], 3 + a.r() * 3, 0.9, E, 0.1, 4)); } }
        else if (v === 'agujas' || v === 'campo') ps.push(prisma(a, c, [jit(a, 0.4), jit(a, 0.4), 1], 3 + a.r() * (v === 'agujas' ? 14 : 7), 0.8 + a.r() * 0.8, elegir(a, [H2, E]), 0.1, 4));
        else { const an = a.r() * TAU; for (let k = 0; k < 5; k++) ps.push(a.palo(add(c, [Math.cos(an) * k * 1.5, Math.sin(an) * k * 1.5, k * 0.8]), add(c, [Math.cos(an) * k * 1.5 + Math.cos(an + 1.2) * 2.5, Math.sin(an) * k * 1.5 + Math.sin(an + 1.2) * 2.5, k * 0.8 + 1]), 0.4, { mat: E, r1: 0.1 })); }
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ estatuas de hielo
  {
    id: 'hie2_estatua', nombre: ['Estatua de hielo', 'Ice statue'], tema: 'hielo', variantes: ['guerrera', 'angel', 'bestia', 'rota'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [helada(a, 22, 20)];
      ps.push(a.cilindro(0, 0, 0, 13, 6, { mat: HO, r1: 12 }), a.cilindro(0, 0, 6, 11, 2, { mat: H2 }));
      const pura = (x: Pieza[]) => rematerial(x, H2);
      if (v === 'guerrera' || v === 'rota') {
        let cs = cuerpo({ cu: CUERPOS.mujer, eq: { torso: { tipo: 'placas', mat: 'cu_placa', mat2: 'cu_malla' }, hombros: { tipo: 'placas', mat: 'cu_placa' }, capa: { mat: 'cu_tela_azul' }, arma: { tipo: 'lanza', mat: 'cu_placa', mango: 'madera' }, izq: { tipo: 'escudo_torre', mat: 'cu_placa', mat2: 'cu_placa' } }, acc: 'quieto', f: 0, dir: 'se', t: [0, 0, 8], s: 1.1 });
        if (v === 'rota') { cs = cs.filter((p) => { const [lo] = envolver([p]); return lo[2] < 44; }); for (let i = 0; i < 7; i++) ps.push(pena(a, jit(a, 16) + 6, jit(a, 16) + 6, 2, 2 + a.r() * 4, 2 + a.r() * 3, 2 + a.r() * 3, { mat: H2 })); }
        ps.push(...pura(cs));
      } else if (v === 'angel') {
        ps.push(...pura(cuerpo({ cu: CUERPOS.mujer, eq: { torso: { tipo: 'vestido', mat: 'cu_tela_blanca' }, arma: { tipo: 'espada', mat: 'cu_placa' } }, acc: 'lanzar', f: 4, dir: 'se', t: [0, 0, 8], s: 1.05 })));
        for (const s of [-1, 1]) { const b: V3 = [-3 + s * 4, -3 - s * 4, 54], cs: Comp[] = []; for (let k = 0; k < 5; k++) { const t = k / 4; cs.push(bulto(add(b, [-t * 6 + s * t * 12, -t * 6 - s * t * 12, t * 18 - t * t * 10]), [3.4, 1, 9 - t * 4], { eje: [s, -s, 0] })); } ps.push(masa(cs, { mat: H2, suave: 3 })); }
      } else { craneoBestia(a, ps, [6, 6, 28], 7, 45, { cuernos: 'toro', mat: H2, matCuerno: H2, colmillos: true }); ps.push(masa([bulto([0, 0, 18], [12, 10, 12]), ...[[-6, -6], [6, -6], [-6, 6], [6, 6]].map(([x, y]) => hueso([x, y, 14], [x * 1.1, y * 1.1, 8], 3.4, 3))], { mat: H2, suave: 4 })); }
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ pilares rúnicos
  {
    id: 'hie2_pilar_runa', nombre: ['Pilar rúnico de hielo', 'Runic ice pillar'], tema: 'hielo', variantes: ['entero', 'agrietado', 'apagado'], cuadros: 8, t: 4, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [helada(a, 20, 18)];
      const H = 84, R = 9;
      ps.push(a.cilindro(0, 0, 0, R + 5, 6, { mat: 'hie2_roca', r1: R + 3 }));
      const pts: V3[] = [];
      for (let i = 0; i < 6; i++) { const t = (i / 6) * TAU + 0.2; pts.push([Math.cos(t) * R, Math.sin(t) * R, 6], [Math.cos(t) * R * 0.85, Math.sin(t) * R * 0.85, H]); }
      ps.push(a.poliedro(pts, { mat: v === 'apagado' ? HO : H2 }));
      ps.push(prisma(a, [0, 0, H - 2], [0, 0, 1], 14, R * 0.8, H2));
      if (v === 'agrietado') for (let i = 0; i < 5; i++) ps.push(a.palo([R * 0.9, R * 0.3, 10 + i * 14], [R * 0.4, R * 0.95, 20 + i * 14 + jit(a, 4)], 0.4, { mat: E, tono: 0.15 }));
      // runas en las caras del frente, encendiéndose de abajo hacia arriba
      for (let i = 0; i < 8; i++) {
        const z = 12 + i * 8, br = v === 'apagado' ? 0 : 0.5 + 0.5 * onda(f - i, 8), t = (0.5 / 6) * TAU + 0.2;
        for (const k of [0, 1]) { const tt = t + k * (TAU / 6), c: V3 = [Math.cos(tt) * R * 0.93, Math.sin(tt) * R * 0.93, z]; ps.push(a.caja(...c, 3, 0.6, 4.4, { mat: v === 'apagado' ? 'negro' : 'hie2_luz_violeta', giro: deg(tt) + 90, tono: -0.45 + br * 0.5 })); }
      }
      ps.push(suelo(a));
      return v === 'apagado' ? ps : { piezas: ps, resplandor: { c: [0, 0, 44], r: 40, color: '#a888ec' } };
    },
  },
  // ------------------------------------------------------------------ erupciones de agujas
  {
    id: 'hie2_erupcion', nombre: ['Erupción de agujas', 'Ice shard eruption'], tema: 'hielo', variantes: ['erupcion', 'abanico', 'anillo', 'muro'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [helada(a, 30, 26)];
      if (v === 'erupcion') for (let i = 0; i < 14; i++) { const t = a.r() * TAU, k = a.r(); ps.push(prisma(a, [Math.cos(t) * k * 10, Math.sin(t) * k * 10, -2], [Math.cos(t) * k * 1.2, Math.sin(t) * k * 1.2, 1], 20 + (1 - k) * 40, 3 + (1 - k) * 3, H2, jit(a, 0.08))); }
      else if (v === 'abanico') for (let i = 0; i < 10; i++) { const t = rad(-110 + i * 22 + jit(a, 6)); ps.push(prisma(a, [-14, 14, -2], [Math.cos(t), Math.sin(t) * -1, 0.9], 26 + a.r() * 20, 3 + a.r() * 2, H2)); }
      else if (v === 'anillo') for (let i = 0; i < 14; i++) { const t = (i / 14) * TAU; ps.push(prisma(a, [Math.cos(t) * 22, Math.sin(t) * 22, -2], [Math.cos(t) * 0.3, Math.sin(t) * 0.3, 1], 16 + a.r() * 18, 3 + a.r() * 1.5, H2)); }
      else for (let i = 0; i < 12; i++) { const x = -32 + i * 6; ps.push(prisma(a, [x, jit(a, 3), -2], [jit(a, 0.3), jit(a, 0.5), 1], 18 + a.r() * 26, 3 + a.r() * 2, elegir(a, [H2, H2, HO]))); }
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ braseros de fuego azul
  {
    id: 'hie2_brasero', nombre: ['Brasero de fuego frío', 'Cold-fire brazier'], tema: 'hielo', variantes: ['cuenco', 'pie', 'craneo', 'farol'], cuadros: 8, t: 3, huella: [1, 1], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [helada(a, 14, 12, 4)];
      let zf = 30, s = 1.4;
      if (v === 'cuenco') { ps.push(...roca(a, [0, 0, 4], [9, 8, 5], { mat: 'hie2_roca', n: 4 }), a.cilindro(0, 0, 8, 6, 6, { mat: 'hierro', r1: 10 }), a.cilindro(0, 0, 14, 10.4, 1, { mat: H2 })); zf = 14; s = 1.8; }
      else if (v === 'pie') { ps.push(a.cilindro(0, 0, 0, 6, 4, { mat: H2, r1: 4 }), prisma(a, [0, 0, 2], [0, 0, 1], 30, 3, H2), a.cilindro(0, 0, 26, 3, 5, { mat: 'hierro', r1: 7 }), a.cilindro(0, 0, 31, 7.4, 0.8, { mat: 'hierro' })); zf = 31; }
      else if (v === 'craneo') { ps.push(a.cilindro(0, 0, 0, 7, 3, { mat: 'hie2_roca' }), a.palo([0, 0, 3], [0, 0, 24], 1.6, { mat: 'hierro' })); craneoBestia(a, ps, [0, 0, 29], 4.4, 45, { cuernos: 'demonio', mat: 'hueso', ojos: 'hie2_luz' }); zf = 34; s = 1.1; }
      else { ps.push(a.palo([0, 0, 0], [0, 0, 44], 1.4, { mat: 'hierro' }), a.palo([0, 0, 42], [7, -7, 44], 0.8, { mat: 'hierro' })); cadena(a, ps, [[7, -7, 44], [7, -7, 38]], 2, 0.4); ps.push(a.cilindro(7, -7, 28, 3.6, 9, { mat: 'hierro', r1: 3 }), a.cilindro(7, -7, 37, 3.4, 1.4, { mat: 'hierro', r1: 0.5 })); for (let i = 0; i < 4; i++) { const t = (i / 4) * TAU + 0.4; ps.push(a.palo([7 + Math.cos(t) * 3.4, -7 + Math.sin(t) * 3.4, 28], [7 + Math.cos(t) * 3.1, -7 + Math.sin(t) * 3.1, 37], 0.4, { mat: 'hierro' })); } zf = 29; s = 0.8; }
      const cx = v === 'farol' ? 7 : 0, cy = v === 'farol' ? -7 : 0;
      fuego(a, ps, [cx, cy, zf], s, f, 8, { mat: 'fuego_azul', lenguas: v === 'farol' ? 2 : 4 });
      ps.push(suelo(a));
      return { piezas: ps, resplandor: { c: [cx, cy, zf + 5], r: 44, color: '#6ab4ff' } };
    },
  },
  // ------------------------------------------------------------------ cofres helados
  {
    id: 'hie2_cofre', nombre: ['Cofre helado', 'Frozen chest'], tema: 'hielo', variantes: ['cerrado', 'abierto', 'sepultado'], huella: [2, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [helada(a, 18, 12, 4)], loc: Pieza[] = [];
      loc.push(a.caja(0, 0, 0, 26, 14, 12, { mat: 'madera_vieja' }));
      for (const x of [-10, 0, 10]) loc.push(a.caja(x, 0, 0, 2, 14.6, 12.4, { mat: 'hierro' }));
      if (v === 'abierto') { loc.push(...transformar([a.caja(0, 0, 0, 26, 14, 4, { mat: 'madera_vieja' }), a.caja(0, 0, 4, 26, 6, 2, { mat: 'madera_vieja' })], rotM(0, -100), [0, -7, 12])); loc.push(a.caja(0, 0, 6, 24, 12, 6, { mat: 'cu_oro', tono: -0.05 })); for (let i = 0; i < 6; i++) loc.push(a.cilindro(jit(a, 9), jit(a, 4), 11.5, 1.6, 0.6, { mat: 'cu_oro' })); loc.push(a.esfera(4, 2, 12.5, 1.6, { mat: 'hie2_luz' })); }
      else { loc.push(a.caja(0, 0, 12, 26, 14, 3, { mat: 'madera_vieja' }), masa([hueso([-13, 0, 15], [13, 0, 15], 6.6, 6.6)], { mat: 'madera_vieja', suave: 1 }), a.caja(0, 7.2, 8, 4, 1, 5, { mat: 'hierro' })); }
      ps.push(...transformar(loc, rotM(jit(a, 15)), [0, 0, 0]));
      ps.push(a.elipsoide(0, 0, v === 'abierto' ? 12 : 21, 10, 6, 2, { mat: E }));
      carambanos(a, ps, [-12, 7.5, 13], [12, 7.5, 13], 6, 7, 0.9);
      if (v === 'sepultado') { ps.push(pena(a, -4, -4, 10, 22, 16, 16, { mat: H2, giro: 10, n: 12, tono: -0.05 })); }
      ps.push(suelo(a));
      return v === 'abierto' ? { piezas: ps, resplandor: { c: [0, 0, 14], r: 20, color: '#ffd070' } } : ps;
    },
  },
  // ------------------------------------------------------------------ barco preso en el hielo
  {
    id: 'hie2_barco', nombre: ['Barco preso en el hielo', 'Ship trapped in ice'], tema: 'hielo', variantes: ['proa', 'mastil', 'popa'], huella: [6, 4], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [helada(a, 56, 36, 8)];
      // el casco inclinado que sale del hielo: costillas y tablas
      const loc: Pieza[] = [], L = 70;
      for (let i = 0; i <= 8; i++) {
        const x = -L / 2 + (i / 8) * L, k = v === 'popa' ? 1 : Math.min(1, (L / 2 - x) / 30 + 0.15), w = 18 * k;
        for (const s of [-1, 1]) loc.push(masa([hueso([x, 0, -6], [x, s * w * 0.85, 4], 1.3, 1.3), hueso([x, s * w * 0.85, 4], [x, s * w, 22], 1.3, 1.1)], { mat: 'madera_vieja', suave: 1 }));
      }
      // tracas: tablas que siguen la curva de las costillas, con huecos donde se rompieron
      const ancho = (x: number) => (v === 'popa' ? 18 : 18 * Math.min(1, (L / 2 - x) / 30 + 0.15));
      for (const sg of [-1, 1]) for (let j = 0; j < 6; j++) {
        const z = 1 + j * 3.6, cs: Comp[] = [];
        for (let i = 0; i < 10; i++) { if (a.r() < 0.12 * j) continue; const x0 = -L / 2 + (i / 10) * (L + 8), x1 = -L / 2 + ((i + 1) / 10) * (L + 8); cs.push(hueso([x0, sg * ancho(x0) * (0.86 + z / 140), z + x0 * 0.04], [x1, sg * ancho(x1) * (0.86 + z / 140), z + x1 * 0.04], 1.8, 1.8, { tono: jit(a, 0.08) })); }
        if (cs.length) loc.push(masa(cs, { mat: 'madera_vieja', suave: 1.6 }));
      }
      loc.push(masa([hueso([L / 2 - 4, 0, -4], [L / 2 + 10, 0, 30], 2.6, 2), hueso([L / 2 + 10, 0, 30], [L / 2 + 6, 0, 40], 2, 1.4)], { mat: 'madera', suave: 1 }));
      if (v === 'proa') craneoBestia(a, loc, [L / 2 + 10, 0, 40], 4.4, 0, { cuernos: 'carnero', mat: 'madera', matCuerno: 'madera' });
      if (v === 'mastil' || v === 'popa') { loc.push(a.palo([0, 0, -4], [jit(a, 3), jit(a, 3), 86], 2.2, { mat: 'madera' }), a.palo([-1, -24, 62], [1, 24, 62], 1.2, { mat: 'madera' })); for (let i = 0; i < 4; i++) loc.push(a.caja(0, -16 + i * 10, 40 + a.r() * 8, 0.5, 7 + a.r() * 3, 14 + a.r() * 8, { mat: 'cu_tela_blanca', tono: -0.2, giro: jit(a, 10) })); loc.push(a.palo([0, 0, 82], [L / 2 + 6, 0, 36], 0.3, { mat: 'cuerda' }), a.palo([0, 0, 82], [-L / 2, 14, 18], 0.3, { mat: 'cuerda' })); }
      // nieve y escarcha encima de las bordas
      for (const s of [-1, 1]) loc.push(a.elipsoide(-6, s * 17, 23.4, 26, 2.4, 1.4, { mat: E }));
      ps.push(...transformar(loc, rotM(-20, 6, -10), [0, 0, 0]));
      // el hielo que lo aprieta
      for (let i = 0; i < 14; i++) { const t = a.r() * TAU; ps.push(pena(a, Math.cos(t) * (30 + a.r() * 14), Math.sin(t) * (18 + a.r() * 10), 3, 5 + a.r() * 7, 4 + a.r() * 5, 4 + a.r() * 6, { mat: elegir(a, [H2, E, HO]) })); }
      for (let i = 0; i < 6; i++) ps.push(prisma(a, [jit(a, 40), jit(a, 24), -2], [jit(a, 0.5), jit(a, 0.5), 1], 10 + a.r() * 18, 2.6, H2));
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ árboles de cristal
  {
    id: 'hie2_arbol', nombre: ['Árbol de hielo', 'Ice tree'], tema: 'hielo', variantes: ['cristal', 'escarcha', 'negro', 'luz'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [helada(a, 22, 20)];
      const mat = v === 'cristal' || v === 'luz' ? H2 : v === 'negro' ? HO : 'corteza_muerta';
      const ramas = arbolMuerto(a, ps, { H: 70 + a.r() * 20, mat, cubre: v === 'negro' ? undefined : E, ramas: 8, torsion: 1.6 });
      for (const [p, d] of ramas) { if (a.r() < 0.6) ps.push(a.cilindro(p[0], p[1], p[2] - 6 - a.r() * 4, 0.1, 6 + a.r() * 4, { mat: H2, r1: 0.9 })); if (v === 'luz' && a.r() < 0.6) ps.push(a.esfera(...add(p, d, 3), 1.2, { mat: 'hie2_luz' })); }
      ps.push(suelo(a));
      return v === 'luz' ? { piezas: ps, resplandor: { c: [0, 0, 50], r: 46, color: '#80d0ec' } } : ps;
    },
  },
  // ------------------------------------------------------------------ osamentas heladas
  {
    id: 'hie2_osamenta', nombre: ['Osamenta helada', 'Frozen bones'], tema: 'hielo', variantes: ['pila', 'craneo_gigante', 'costillar'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [helada(a, 30, 26)];
      if (v === 'pila') { for (let i = 0; i < 9; i++) craneo(a, ps, [jit(a, 10), jit(a, 10), 3 + Math.floor(i / 4) * 5], 3, a.r() * 360, { incl: jit(a, 20) }); for (let i = 0; i < 8; i++) { const p: V3 = [jit(a, 14), jit(a, 14), 1 + a.r() * 6]; huesoLargo(ps, p, add(p, [jit(a, 12), jit(a, 12), jit(a, 3)]), 1); } }
      else if (v === 'craneo_gigante') craneoBestia(a, ps, [0, 0, 14], 13, 30, { cuernos: 'demonio', colmillos: true, incl: 15 });
      else costillar(a, ps, [0, 0, 20], 44, 20, -30, { alto: 20, grueso: 1.7, rotas: 0.2 });
      for (let i = 0; i < 6; i++) ps.push(pena(a, jit(a, 22), jit(a, 22), 3, 4 + a.r() * 5, 3 + a.r() * 4, 2 + a.r() * 3, { mat: H2, tono: 0.08 }));
      for (let i = 0; i < 5; i++) ps.push(prisma(a, [jit(a, 24), jit(a, 24), -1], [jit(a, 0.5), jit(a, 0.5), 1], 8 + a.r() * 14, 2, H2));
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ portal helado
  {
    id: 'hie2_portal', nombre: ['Portal helado', 'Frozen portal'], tema: 'hielo', variantes: ['activo', 'apagado', 'roto'], cuadros: 8, t: 3, huella: [4, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [helada(a, 30, 18)], loc: Pieza[] = [];
      const R = 26, cs: Comp[] = [];
      for (let i = 0; i < 16; i++) { if (v === 'roto' && (i === 5 || i === 6)) continue; const t0 = (i / 16) * TAU, t1 = ((i + 1) / 16) * TAU; cs.push(hueso([Math.cos(t0) * R, 0, R + 6 + Math.sin(t0) * R * 1.1], [Math.cos(t1) * R, 0, R + 6 + Math.sin(t1) * R * 1.1], 4.4, 4.4)); cs.push(bulto([Math.cos(t0) * (R + 3), 0, R + 6 + Math.sin(t0) * (R + 3) * 1.1], [3, 3, 3], { mat: E })); }
      loc.push(masa(cs, { mat: H2, suave: 2.4 }));
      for (let i = 0; i < 10; i++) { const t = (i / 10) * PI + PI * 0.05; loc.push(prisma(a, [Math.cos(t) * (R + 4), 0, R + 6 + Math.sin(t) * (R + 4) * 1.1], [Math.cos(t), 0, Math.sin(t) * 1.1], 10 + a.r() * 10, 2.4, H2)); }
      for (const s of [-1, 1]) loc.push(...roca(a, [s * R, 0, 5], [10, 9, 7], { mat: 'hie2_roca', n: 4, cubre: E }));
      if (v === 'activo') {
        // el remolino: anillos que giran y se cierran hacia el centro
        for (let k = 0; k < 4; k++) for (let i = 0; i < 10; i++) { const r = R * (0.85 - k * 0.2), t = (i / 10) * TAU + ciclo(f, 8) * TAU * (k % 2 ? 1 : -1) * 0.5 + k; loc.push(a.esfera(Math.cos(t) * r, 0, R + 6 + Math.sin(t) * r * 1.1, 2.2 - k * 0.3, { mat: k % 2 ? 'hie2_luz' : 'hie2_luz_violeta', tono: -0.2 + k * 0.08 })); }
        loc.push(a.elipsoide(0, 0, R + 6, R * 0.55, 1, R * 0.6, { mat: 'hie2_luz', tono: -0.35 + onda(f, 8) * 0.1 }));
      }
      ps.push(...transformar(loc, rotM(-45), [0, 0, 0]));
      ps.push(suelo(a));
      return v === 'activo' ? { piezas: ps, resplandor: { c: [0, 0, R + 6], r: 56, color: '#80c0f0' } } : ps;
    },
  },
  // ------------------------------------------------------------------ sarcófagos de hielo
  {
    id: 'hie2_sarcofago', nombre: ['Sarcófago de hielo', 'Ice sarcophagus'], tema: 'hielo', variantes: ['cerrado', 'abierto', 'reina'], huella: [3, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [helada(a, 30, 20)];
      ps.push(...losa(a, 24, 14, 0, 4, HO, 8));
      // la caja: fondo y costados macizos, la tapa abierta o sin tapa para ver adentro
      ps.push(a.caja(0, 0, 4, 52, 22, 6, { mat: H2 }), a.caja(0, -10, 4, 52, 3, 16, { mat: H2 }), a.caja(-25, 0, 4, 3, 22, 16, { mat: H2 }));
      for (const s of [-1, 1]) ps.push(a.palo([s * 25.5, 10.5, 4], [s * 25.5, 10.5, 19], 1.4, { mat: H2, tono: 0.15 }));
      ps.push(a.palo([-25.5, 10.5, 19], [25.5, 10.5, 19], 1.4, { mat: H2, tono: 0.15 }), a.palo([25.5, -10.5, 19], [25.5, 10.5, 19], 1.4, { mat: H2, tono: 0.15 }));
      const eq = v === 'reina' ? { torso: { tipo: 'vestido' as const, mat: 'cu_tela_blanca' }, cabeza: { tipo: 'corona' as const, mat: 'cu_oro', mat2: 'cu_ojo_hielo' } } : EQUIPOS.caballero;
      const cs = cuerpo({ cu: v === 'reina' ? CUERPOS.mujer : CUERPOS.soldado, eq: { ...eq, arma: undefined, izq: undefined }, acc: 'morir', f: 7, dir: 'so', m: rotM(0, 0, 0) });
      const [lo, hi] = envolver(cs), largo = Math.max(hi[0] - lo[0], hi[1] - lo[1]);
      const giro = hi[0] - lo[0] > hi[1] - lo[1] ? 0 : 90;
      ps.push(...atrapado(transformar(cs, rotM(giro), [0, 0, 10], Math.min(1, 44 / largo)), 0.4));
      if (v === 'abierto') ps.push(...transformar([a.caja(0, 0, 0, 54, 24, 3.4, { mat: H2 })], rotM(10, 0, 0), [10, 22, 1]));
      else ps.push(a.caja(0, 2, 19.5, 50, 18, 0.8, { mat: H2, tono: 0.2 }));
      for (const s of [-1, 1]) racimo(a, ps, [s * 30, -12, 0], 3, 24, 3, H2, 0.5);
      ps.push(suelo(a));
      return v === 'reina' ? { piezas: ps, resplandor: { c: [0, 0, 16], r: 30, color: '#80d0ec' } } : ps;
    },
  },
  // ------------------------------------------------------------------ rocas escarchadas
  {
    id: 'hie2_roca', nombre: ['Roca con costra de hielo', 'Ice-crusted rock'], tema: 'hielo', variantes: ['grande', 'grupo', 'carambanos', 'partida'], huella: [2, 2], huellaPor: { grupo: [3, 3] }, bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [helada(a, 24, 20)];
      const M = { mat: 'hie2_roca', cubre: E, cubreAlto: 0.4, n: 4, facetas: 7 };
      if (v === 'grande') ps.push(...roca(a, [0, 0, 11], [18, 15, 15], { ...M, n: 9 }));
      else if (v === 'grupo') ps.push(...roca(a, [-8, -6, 10], [14, 12, 12], M), ...roca(a, [12, 4, 7], [10, 9, 8], M), ...roca(a, [-2, 16, 4], [7, 6, 5], M));
      else if (v === 'carambanos') { ps.push(...roca(a, [0, -4, 20], [20, 12, 10], { ...M, n: 8 }), ...roca(a, [-14, -6, 8], [7, 7, 10], M)); carambanos(a, ps, [-16, 7, 14], [16, 6, 14], 9, 12, 1.4); }
      else { ps.push(...roca(a, [-7, -2, 10], [10, 13, 13], { ...M, giro: 10 }), ...roca(a, [8, 4, 9], [9, 12, 12], { ...M, giro: 15 })); racimo(a, ps, [1, 1, 0], 4, 26, 3, H2, 0.3); }
      for (let i = 0; i < 4; i++) { const t = a.r() * TAU; ps.push(prisma(a, [Math.cos(t) * 18, Math.sin(t) * 18, -1], [Math.cos(t) * 0.5, Math.sin(t) * 0.5, 1], 5 + a.r() * 8, 1.6, H2)); }
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ charcos congelados
  {
    id: 'hie2_charco', nombre: ['Charco congelado', 'Frozen puddle'], tema: 'hielo', variantes: ['charco', 'placas', 'sangre', 'huellas'], huella: [2, 2], bloquea: false, plano: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      if (v === 'placas') for (let i = 0; i < 6; i++) ps.push(...losa(a, 5 + a.r() * 6, 4 + a.r() * 5, 0, 1 + a.r() * 0.6, elegir(a, [H2, E]), 6, { x: jit(a, 16), y: jit(a, 14) }));
      else { ps.push(...losa(a, 20, 15, 0, 0.8, E, 10, { tono: -0.1 }), ...losa(a, 15, 11, 0, 1.2, v === 'sangre' ? 'sangre' : H2, 10)); grietas(a, ps, 15, 11, 1.3, 2); }
      if (v === 'sangre') { ps.push(...losa(a, 15, 11, 1.2, 1.5, H2, 10, { tono: 0.1 }).slice(0, 4)); craneo(a, ps, [8, 6, 3], 2.6, 30, { incl: 25 }); }
      if (v === 'huellas') for (let i = 0; i < 6; i++) { const x = -14 + i * 5.6, y = (i % 2 ? 2.4 : -2.4) + x * 0.2; ps.push(a.elipsoide(x, y, 1.25, 2.2, 1.2, 0.3, { mat: 'hie2_hondo', giro: 10 })); }
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ pozo en el hielo
  {
    id: 'hie2_pozo', nombre: ['Pozo en el hielo', 'Ice pit'], tema: 'hielo', variantes: ['abierto', 'sellado', 'luz'], cuadros: 8, t: 4, huella: [3, 3], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [...losa(a, 30, 28, 0, 1.2, E, 12, { tono: -0.1 })];
      const R = 16;
      for (let i = 0; i < 12; i++) { const t = (i / 12) * TAU; ps.push(pena(a, Math.cos(t) * (R + 3), Math.sin(t) * (R + 3), 3, 5 + a.r() * 2, 4 + a.r() * 2, 3.6 + a.r() * 3, { mat: elegir(a, [H2, 'hie2_roca']), giro: deg(t) })); }
      ps.push(a.cilindro(0, 0, 0, R, 2.6, { mat: v === 'luz' ? 'hie2_luz' : 'hie2_agua', tono: v === 'luz' ? -0.3 + onda(f, 8) * 0.15 : 0 }));
      if (v === 'abierto') { const u = ciclo(f, 8); ps.push(a.cilindro(jit(a, 4), jit(a, 4), 2.6, 2 + u * 10, 0.3, { mat: H2, tono: 0.2 - u * 0.3 })); ps.push(a.cilindro(0, 0, 2.6, 1.5 + ((u + 0.5) % 1) * 10, 0.25, { mat: H2, tono: 0.1 - ((u + 0.5) % 1) * 0.3 })); }
      if (v === 'sellado') { ps.push(a.cilindro(0, 0, 0, R + 1, 3, { mat: H2 })); for (let i = 0; i < 4; i++) { const t = (i / 4) * PI; ps.push(a.palo([Math.cos(t) * R, Math.sin(t) * R, 3.2], [-Math.cos(t) * R, -Math.sin(t) * R, 3.2], 1, { mat: 'hierro_oxido' })); } }
      if (v === 'luz') for (let i = 0; i < 5; i++) { const u = ciclo(f + i * 1.6, 8), t = i * 1.3 + u * 3; ps.push(a.elipsoide(Math.cos(t) * 6, Math.sin(t) * 6, 2 + u * 30, 1.8 * (1 - u * 0.5), 1.8 * (1 - u * 0.5), 3, { mat: 'hie2_luz', tono: 0.1 - u * 0.4 })); }
      ps.push(suelo(a));
      return v === 'luz' ? { piezas: ps, resplandor: { c: [0, 0, 10], r: 40, color: '#80d0ec' } } : ps;
    },
  },
);

conVarianteY('hie2_arco');
