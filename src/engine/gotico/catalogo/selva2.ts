import { registrar, conVarianteY, type Arma, type Pieza } from '../objeto';
import { MATERIALES } from '../materiales';
import { ruido, hueso, bulto, masa, type Comp } from '../render';
import {
  PI2, az, entre, elegir, mas, mez, nrm, cruz, polar, rad, grad, suelo, mata, guijarro, pena, disco, charco, llamas, chispas, vela, humo,
  cadaver, muneco, colgado, ropaDe, craneo, huesoLargo, costillar, ave, marco, cajaM, sillar, losa, type V,
} from '../exteriores';

/**
 * Selva (acto 3), segunda tanda: árboles gigantes con raíces aéreas y estranguladores, lianas, helechos, flores
 * carnívoras que abren y cierran las fauces, ídolos y cabezas colosales de piedra comidos por el musgo, chozas en
 * pilotes, puentes colgantes, cascadas, ranas venenosas, nidos, calaveras en estacas, tótems, barcas varadas,
 * manglares con las raíces en el agua, bambú, charcas con burbujas, altares, jaulas y fogatas de la tribu. Todo
 * húmedo y oscuro, con verdes profundos y el barro negro.
 */

// ------------------------------------------------------------------ materiales
const M = MATERIALES;
const hojeo = (k: number) => (p: V) => { const a = ruido(p[0] * k, p[1] * k, p[2] * k), b = ruido(p[0] * k * 2.4 + 5, p[1] * k * 2.4, p[2] * k * 2.4); return (a - 0.5) * 0.3 + (b > 0.64 ? 0.14 : b < 0.3 ? -0.2 : 0); };
M.sel2_suelo = { rampa: ['#070806', '#0e100b', '#151810', '#1d2015', '#26291b', '#2f3221', '#393b28'], ruido: 0.5, escala: 0.35, patron: (p) => (ruido(p[0] * 0.5, p[1] * 0.5, 1) > 0.66 ? 0.1 : 0) + (ruido(p[0] * 0.1, p[1] * 0.1, 2) - 0.5) * 0.25 };
M.sel2_corteza = {
  rampa: ['#090806', '#12100c', '#1c1812', '#262119', '#312a20', '#3d3428', '#4a3f31'], ruido: 0.4, escala: 0.4,
  patron: (p) => (ruido(p[0] * 0.7, p[1] * 0.7, p[2] * 0.08) - 0.5) * 0.4 + (ruido(p[0] * 0.15, p[1] * 0.15, p[2] * 0.15) > 0.66 ? -0.12 : 0),
};
M.sel2_follaje = { rampa: ['#030504', '#060b07', '#0a120b', '#0e1910', '#132115', '#192a1a', '#1f3320', '#263d27'], ruido: 0.45, escala: 0.5, patron: hojeo(0.9) };
M.sel2_follaje2 = { rampa: ['#050603', '#0a0d06', '#10140a', '#161c0e', '#1d2412', '#252d17', '#2e371d'], ruido: 0.45, escala: 0.55, patron: hojeo(1.05) };
M.sel2_hoja = { rampa: ['#040806', '#08110b', '#0d1b10', '#132616', '#1a321c', '#223f23', '#2c4d2b'], ruido: 0.25, escala: 0.5, brillo: 0.45, patron: (p) => (ruido(p[0] * 0.9, p[1] * 0.9, p[2] * 0.9) - 0.5) * 0.2 };
M.sel2_hoja_clara = { rampa: ['#080b04', '#111708', '#1b230c', '#263011', '#323d16', '#3f4b1c', '#4d5a23'], ruido: 0.25, escala: 0.5, brillo: 0.35 };
M.sel2_carne_flor = { rampa: ['#140409', '#25070f', '#380b16', '#4c101d', '#611625', '#771e2e', '#8c2836'], ruido: 0.3, escala: 0.5, brillo: 0.5, patron: (p) => (ruido(p[0] * 0.8, p[1] * 0.8, p[2] * 0.8) > 0.68 ? 0.15 : 0) };
M.sel2_garganta = { rampa: ['#100204', '#200508', '#33090d', '#470e12', '#5c1418'], ruido: 0.3, escala: 0.6, brillo: 0.6 };
M.sel2_rana_azul = { rampa: ['#02060e', '#05102a', '#081c48', '#0d2a68', '#163c88', '#2250a4'], ruido: 0.3, escala: 1.2, brillo: 0.8, patron: (p) => (ruido(p[0] * 1.6, p[1] * 1.6, p[2] * 1.6) > 0.68 ? -0.35 : 0) };
M.sel2_rana_roja = { rampa: ['#100202', '#2a0604', '#480c06', '#681408', '#881f0c', '#a42c12'], ruido: 0.3, escala: 1.2, brillo: 0.8, patron: (p) => (ruido(p[0] * 1.6, p[1] * 1.6, p[2] * 1.6) > 0.68 ? -0.35 : 0) };
M.sel2_rana_amarilla = { rampa: ['#0e0a02', '#2a1e04', '#4a3606', '#6a4e08', '#8a680c', '#a68212'], ruido: 0.3, escala: 1.2, brillo: 0.8, patron: (p) => (ruido(p[0] * 1.6, p[1] * 1.6, p[2] * 1.6) > 0.66 ? -0.4 : 0) };
M.sel2_piedra = {
  rampa: ['#0b0c0a', '#151713', '#20231c', '#2c2f26', '#393d31', '#474b3d', '#565a4a', '#656857'], ruido: 0.35, escala: 0.2,
  patron: (p) => (ruido(p[0] * 0.07, p[1] * 0.07, p[2] * 0.07) - 0.5) * 0.3 + (ruido(p[0] * 0.5, p[1] * 0.5, p[2] * 0.5) > 0.75 ? -0.12 : 0) - Math.max(0, 1 - p[2] / 20) * 0.1,
};
M.sel2_paja = { rampa: ['#100c06', '#1b150b', '#282011', '#352b17', '#43361d', '#524225', '#614f2e'], ruido: 0.5, escala: 0.6, patron: (p) => (ruido(p[0] * 1.3, p[1] * 1.3, p[2] * 0.25) - 0.5) * 0.45 };
M.sel2_bambu = { rampa: ['#121306', '#20220b', '#303210', '#414316', '#53551d', '#656625', '#78772e'], ruido: 0.18, escala: 0.3, brillo: 0.3, patron: (p) => ((((p[2] % 10) + 10) % 10) < 0.8 ? -0.35 : 0) };
M.sel2_ocre = { rampa: ['#1d0805', '#340f08', '#4c180c', '#652311', '#7e2f17', '#96401f'], ruido: 0.3, escala: 0.4 };
M.sel2_cal = { rampa: ['#2d2b25', '#47443b', '#625e52', '#7e796a', '#999382', '#b1ab98'], ruido: 0.3, escala: 0.4 };
M.sel2_agua = { rampa: ['#030605', '#06100b', '#0a1811', '#102117', '#172b1d', '#1f3624', '#2c4530'], ruido: 0.2, escala: 0.12, brillo: 1, patron: (p) => (ruido(p[0] * 0.12, p[1] * 0.12, 4) - 0.5) * 0.25 };
M.sel2_lenteja = { rampa: ['#0a1205', '#132109', '#1d310e', '#284214', '#34531b', '#416422'], ruido: 0.5, escala: 1.4, patron: (p) => (ruido(p[0] * 0.6, p[1] * 0.6, 3) > 0.55 ? 0.1 : -0.25) };
M.sel2_hongo_luz = { rampa: ['#0a2a2e', '#12444a', '#1e6266', '#2e8282', '#4ca69c', '#7ccab8'], ruido: 0.3, escala: 0.6, emite: true };
M.sel2_hongo_rojo = { rampa: ['#150405', '#29080a', '#3e0d0f', '#541315', '#6a1a1b', '#802322'], ruido: 0.3, escala: 0.4, brillo: 0.25 };
M.sel2_ojo = { rampa: ['#2a3a06', '#4a660a', '#70921a', '#a0c030', '#d6ec6a'], ruido: 0.2, escala: 0.5, emite: true };
M.sel2_cera_avispa = { rampa: ['#1a1408', '#2c2210', '#403218', '#554321', '#6b552b', '#806735'], ruido: 0.4, escala: 0.8, patron: (p) => (Math.sin(p[2] * 2.4 + Math.atan2(p[1], p[0]) * 0) > 0.6 ? -0.15 : 0) };

const reg = (...ds: Parameters<typeof registrar>) => registrar(...ds);
const sueloS = (a: Arma, ps: Pieza[], rx: number, ry: number, o: Parameters<typeof suelo>[4] = {}) => suelo(a, ps, rx, ry, { mat: 'sel2_suelo', pasto: 'sel2_hoja_clara', matPiedra: 'sel2_piedra', hojas: 'hojas_otono', ...o });

/** Hoja grande con forma (rombo alargado, nervio y caída), de `b` hacia `d`. */
function hoja(a: Arma, ps: Pieza[], b: V, d: V, L: number, w: number, caida: number, mat = 'sel2_hoja', tono = 0) {
  const u = nrm(d), lado = nrm(cruz(u, [0, 0, 1])), t = mas(b, u, L), m1 = mas(mas(b, u, L * 0.42), lado, w), m2 = mas(mas(b, u, L * 0.42), lado, -w);
  t[2] -= caida; m1[2] -= caida * 0.25; m2[2] -= caida * 0.25;
  const e = 0.5;
  ps.push(a.poliedro([b, t, m1, m2, mas(b, [0, 0, e]), mas(t, [0, 0, e * 0.5]), mas(m1, [0, 0, e * 0.6]), mas(m2, [0, 0, e * 0.6]), mas(mez(b, t, 0.45), [0, 0, e + w * 0.18])], { mat, tono: tono + az(a, 0.05) }));
}
/** Racimo de follaje: bultos chatos e irregulares con tonos propios y hojas grandes que asoman y cuelgan del borde. */
function follaje(a: Arma, ps: Pieza[], c: V, R: number, mat = 'sel2_follaje', n = 4) {
  for (let i = 0; i < n + 2; i++) { const t = a.r() * PI2, d = Math.sqrt(a.r()) * R * 0.6, k = i < n ? 1 : 0.6; ps.push(a.elipsoide(c[0] + Math.cos(t) * d, c[1] + Math.sin(t) * d, c[2] + az(a, R * 0.22) - (i >= n ? R * 0.2 : 0), R * (0.36 + a.r() * 0.2) * k, R * (0.32 + a.r() * 0.2) * k, R * (0.17 + a.r() * 0.1) * k, { mat: a.r() < 0.3 ? 'sel2_follaje2' : mat, giro: a.r() * 180, incl: az(a, 12), tono: az(a, 0.06) - (i >= n ? 0.1 : 0) })); }
  for (let i = 0; i < 4; i++) { const t = a.r() * PI2, b: V = mas(c, [Math.cos(t) * R * 0.6, Math.sin(t) * R * 0.6, -R * 0.05]); hoja(a, ps, b, [Math.cos(t), Math.sin(t), -0.3], R * 0.45, R * 0.13, R * 0.25, 'sel2_hoja', -0.05); }
}
/** Liana que se comba entre dos puntos, con hojitas. */
function liana(a: Arma, ps: Pieza[], p0: V, p1: V, comba: number, r = 0.8, hojas = 0.5, n = 6) {
  let q = p0;
  for (let i = 1; i <= n; i++) {
    const t = i / n, m = mez(p0, p1, t), nq: V = [m[0] + az(a, 0.8), m[1] + az(a, 0.8), Math.max(0.8, m[2] - comba * 4 * t * (1 - t))];
    ps.push(a.palo(q, nq, r, { mat: 'sel2_corteza', r1: r * 0.9 }));
    if (a.r() < hojas) ps.push(a.elipsoide(nq[0], nq[1], nq[2] - 1, 2.4, 1.4, 1.1, { mat: 'sel2_hoja', giro: a.r() * 180, tono: az(a, 0.06) }));
    q = nq;
  }
}
/** Liana que cuelga recta (con algún giro) desde `p` hasta `largo` más abajo. */
function colgante(a: Arma, ps: Pieza[], p: V, largo: number, r = 0.7, hojas = 0.4) {
  let q = p;
  const n = Math.max(2, Math.round(largo / 10));
  for (let i = 1; i <= n; i++) { const nq: V = [q[0] + az(a, 1.5), q[1] + az(a, 1.5), Math.max(0.5, p[2] - (largo * i) / n)]; ps.push(a.palo(q, nq, r, { mat: 'sel2_corteza', r1: r * 0.85 })); if (a.r() < hojas) ps.push(a.elipsoide(nq[0], nq[1], nq[2], 2.2, 1.3, 1.6, { mat: 'sel2_hoja', giro: a.r() * 180 })); q = nq; }
}

// ------------------------------------------------------------------ árboles gigantes
reg({
  id: 'sel2_arbol_gigante', nombre: ['Árbol gigante de la selva', 'Giant jungle tree'], tema: 'selva', variantes: ['raices_aereas', 'estrangulador', 'hueco', 'musgoso'], huella: [5, 5], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloS(a, ps, 56, 50, { matas: 7, piedras: 2 });
    const H = 150 + a.r() * 30, r0 = 13 + a.r() * 3, cs: Comp[] = [];
    const top: V = [az(a, 8), az(a, 8), H], mid: V = [top[0] * 0.4, top[1] * 0.4, H * 0.5];
    cs.push(hueso([0, 0, 0], mid, r0, r0 * 0.78), hueso(mid, top, r0 * 0.78, r0 * 0.5), bulto([0, 0, 6], [r0 * 1.6, r0 * 1.6, 9]));
    // contrafuertes: tablas de raíz altas y finas que se abren
    const nr = 6 + Math.floor(a.r() * 3);
    for (let i = 0; i < nr; i++) {
      const t = (i / nr) * PI2 + az(a, 0.3), L = 30 + a.r() * 14, h = 26 + a.r() * 16;
      const n: V = [-Math.sin(t) * 1.4, Math.cos(t) * 1.4, 0], b0 = polar(t, r0 * 0.7, 0), b1 = polar(t, r0 * 0.7, h), b2 = polar(t + az(a, 0.15), r0 + L, 0), b3 = polar(t, r0 + L * 0.4, h * 0.35);
      ps.push(a.poliedro([mas(b0, n), mas(b0, n, -1), mas(b1, n, 0.6), mas(b1, n, -0.6), mas(b2, n, 0.5), mas(b2, n, -0.5), mas(b3, n, 1.1), mas(b3, n, -1.1)], { mat: 'sel2_corteza', tono: az(a, 0.05) }));
      cs.push(hueso(polar(t, r0 + L * 0.4, 2), polar(t + az(a, 0.3), r0 + L, -1), 3, 1.2));
    }
    if (v === 'musgoso') for (let i = 0; i < 9; i++) { const z = 6 + a.r() * H * 0.7, t = rad(100 + az(a, 70)), k = z / H; cs.push(bulto([top[0] * k * 0.8 + Math.cos(t) * r0 * (1 - k * 0.4), top[1] * k * 0.8 + Math.sin(t) * r0 * (1 - k * 0.4), z], [6, 4, 8 + a.r() * 6], { mat: 'ext_musgo', giro: grad(t) + 90, k: 1.4 })); }
    if (v === 'estrangulador') {
      // las raíces del higo estrangulador abrazando el tronco en red
      for (let i = 0; i < 7; i++) { const t0 = a.r() * PI2; let p: V = polar(t0, r0 * 1.02, H * 0.8); for (let k = 1; k <= 5; k++) { const z = H * 0.8 * (1 - k / 5), rr = r0 * (1 + (1 - z / H) * 0.2) * 1.02, q: V = polar(t0 + k * az(a, 0.5) + k * 0.25, rr, z); cs.push(hueso(p, q, 2.6, 2.6)); p = q; } }
    }
    ps.push(masa(cs, { mat: 'sel2_corteza', suave: 3 }));
    if (v === 'hueco') { const t = rad(45); ps.push(a.elipsoide(Math.cos(t) * r0, Math.sin(t) * r0, 14, 9, 9, 15, { mat: 'negro', resta: true })); ps.push(a.elipsoide(Math.cos(t) * (r0 - 6), Math.sin(t) * (r0 - 6), 14, 4, 6, 12, { mat: 'negro' })); for (let i = 0; i < 4; i++) ps.push(a.elipsoide(Math.cos(t) * (r0 + 3) + az(a, 4), Math.sin(t) * (r0 + 3) + az(a, 4), 0.6, 2, 1.6, 1, { mat: 'sel2_hongo_luz' })); }
    // ramas madre y la copa de racimos
    const nb = 7, copa: V[] = [];
    for (let i = 0; i < nb; i++) {
      const t = (i / nb) * PI2 + az(a, 0.4), d = 44 + a.r() * 22, b: V = [top[0] + Math.cos(t) * d, top[1] + Math.sin(t) * d, H - 8 + a.r() * 24];
      ps.push(masa([hueso([top[0] * 0.95, top[1] * 0.95, H - 20 - a.r() * 16], mez(top, b, 0.55), r0 * 0.36, r0 * 0.22), hueso(mez(top, b, 0.55), b, r0 * 0.22, r0 * 0.1)], { mat: 'sel2_corteza', suave: 1.5 }));
      copa.push(b);
    }
    for (const b of copa) { follaje(a, ps, mas(b, [0, 0, 5]), 30, 'sel2_follaje', 4); follaje(a, ps, mas(mez(top, b, 0.5), [0, 0, 10]), 22, 'sel2_follaje', 2); }
    follaje(a, ps, [top[0], top[1], H + 14], 34, 'sel2_follaje', 4);
    // raíces aéreas: cuelgan de las ramas hasta el piso y se clavan
    const na = v === 'raices_aereas' ? 12 : 5;
    for (let i = 0; i < na; i++) { const b = elegir(a, copa), p = mez([top[0], top[1], b[2]], b, 0.3 + a.r() * 0.6); colgante(a, ps, [p[0], p[1], p[2] - 4], p[2] - (v === 'raices_aereas' ? 0 : 20 + a.r() * 40), v === 'raices_aereas' ? 1.1 : 0.7, 0.2); }
    for (let i = 0; i < 4; i++) { const p = polar(a.r() * PI2, r0 + 10 + a.r() * 20); hoja(a, ps, [p[0], p[1], 1], [Math.cos(i * 1.7), Math.sin(i * 1.7), 0.5], 14, 5, 3); }
    return ps;
  },
});

// ------------------------------------------------------------------ lianas, helechos y plantas
reg({
  id: 'sel2_lianas', nombre: ['Lianas', 'Hanging vines'], tema: 'selva', variantes: ['cortina', 'enredo', 'con_flores', 'arco'], huella: [4, 1], bloquea: false,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloS(a, ps, 38, 14, { matas: 4 });
    // dos troncos delgados de los que cuelga todo
    const h = 90 + a.r() * 20;
    for (const x of [-30, 30]) ps.push(masa([hueso([x, 0, 0], [x + az(a, 4), az(a, 4), h], 4.5, 3), bulto([x, 0, 3], [7, 7, 4])], { mat: 'sel2_corteza', suave: 2 }));
    for (const x of [-30, 30]) { for (let i = 0; i < 7; i++) { const t = (i / 7) * PI2 + az(a, 0.3); hoja(a, ps, [x, 0, h - 2], [Math.cos(t), Math.sin(t), 0.35], 16 + a.r() * 6, 3.6, 9, 'sel2_hoja'); } colgante(a, ps, [x + 2, 2, h - 4], 30 + a.r() * 30, 0.5, 0.6); }
    const nl = v === 'enredo' ? 5 : 3;
    for (let k = 0; k < nl; k++) liana(a, ps, [-29, az(a, 2), h - 6 - k * 9], [29, az(a, 2), h - 10 - k * 7], 10 + a.r() * 18, 1, 0.6, 8);
    if (v === 'cortina' || v === 'con_flores') for (let i = 0; i < 12; i++) { const x = -26 + i * 4.7 + az(a, 1.5); colgante(a, ps, [x, az(a, 1), h - 12 - Math.sin((x + 30) / 60 * Math.PI) * 16], 30 + a.r() * 40, 0.55, 0.55); }
    if (v === 'con_flores') for (let i = 0; i < 10; i++) ps.push(a.esfera(entre(a, -26, 26), az(a, 2), entre(a, 30, h - 15), 1.5, { mat: elegir(a, ['sel2_carne_flor', 'sel2_ocre', 'sel2_cal']), tono: 0.1 }));
    if (v === 'arco') { liana(a, ps, [-29, 0, h * 0.4], [29, 0, h * 0.45], -18, 1.6, 0.8, 9); for (let i = 0; i < 6; i++) colgante(a, ps, [entre(a, -24, 24), az(a, 2), h * 0.42 + 14], 24 + a.r() * 20, 0.5, 0.5); }
    return ps;
  },
});
conVarianteY('sel2_lianas');

/** Helecho: frondas de hojitas que se arquean (cada fronda: nervio y pares de folíolos). */
function helecho(a: Arma, ps: Pieza[], c: V, R: number, n: number, mat = 'sel2_hoja_clara', rizado = false) {
  for (let i = 0; i < n; i++) {
    const t = (i / n) * PI2 + az(a, 0.3), e = 0.5 + a.r() * 0.6, L = R * (0.8 + a.r() * 0.4);
    let p = c, el = e;
    const k = 4;
    for (let j = 0; j < k; j++) {
      const l = L / k, q: V = [p[0] + Math.cos(t) * Math.cos(el) * l, p[1] + Math.sin(t) * Math.cos(el) * l, p[2] + Math.sin(el) * l];
      ps.push(a.palo(p, q, 0.35, { mat: 'sel2_corteza', r1: 0.25 }));
      const w = (rizado ? 2.4 : 3.4) * (1 - j / k * 0.6);
      hoja(a, ps, mez(p, q, 0.3), [Math.cos(t + 1.2), Math.sin(t + 1.2), 0.2], w * 1.6, w * 0.5, 0.6, mat);
      hoja(a, ps, mez(p, q, 0.3), [Math.cos(t - 1.2), Math.sin(t - 1.2), 0.2], w * 1.6, w * 0.5, 0.6, mat);
      p = q; el -= rizado ? 0.75 : 0.45;
    }
  }
}
reg({
  id: 'sel2_helecho', nombre: ['Helecho', 'Fern'], tema: 'selva', variantes: ['mata', 'arborescente', 'rizado', 'grupo'], huella: [1, 1], huellaPor: { arborescente: [2, 2], grupo: [2, 2] }, bloquea: false,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloS(a, ps, v === 'mata' ? 16 : 24, v === 'mata' ? 14 : 22, { matas: 2 });
    if (v === 'mata') helecho(a, ps, [0, 0, 1], 18, 9);
    if (v === 'rizado') helecho(a, ps, [0, 0, 1], 16, 10, 'sel2_hoja', true);
    if (v === 'grupo') for (let i = 0; i < 3; i++) helecho(a, ps, i ? polar(a.r() * PI2, 12, 1) : [0, 0, 1], 14 + a.r() * 4, 7, i % 2 ? 'sel2_hoja' : 'sel2_hoja_clara');
    if (v === 'arborescente') {
      const H = 50 + a.r() * 16, top: V = [az(a, 4), az(a, 4), H];
      ps.push(masa([hueso([0, 0, 0], top, 3.4, 2.6), bulto([0, 0, 2], [5, 5, 3])], { mat: 'sel2_corteza', suave: 1.5 }));
      for (let i = 0; i < 6; i++) { const z = 8 + i * 6; ps.push(a.cilindro(top[0] * z / H, top[1] * z / H, z, 3.3, 1.2, { mat: 'sel2_paja', tono: -0.1 })); }
      helecho(a, ps, top, 30, 11, 'sel2_hoja');
    }
    return ps;
  },
});

reg({
  id: 'sel2_planta', nombre: ['Planta de la selva', 'Jungle plant'], tema: 'selva', variantes: ['taro', 'platanera', 'bromelia', 'orquidea'], huella: [1, 1], huellaPor: { platanera: [2, 2] }, bloquea: false,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloS(a, ps, 16, 14, { matas: 2 });
    if (v === 'taro') for (let i = 0; i < 6; i++) {
      // oreja de elefante: tallo largo y la hoja ancha colgando
      const t = (i / 6) * PI2 + az(a, 0.4), h = 14 + a.r() * 12, b: V = polar(t, 3, 0), c: V = polar(t, 7 + a.r() * 4, h);
      ps.push(a.palo(b, c, 0.7, { mat: 'sel2_hoja_clara', r1: 0.5 }));
      hoja(a, ps, c, [Math.cos(t), Math.sin(t), -0.2], 14 + a.r() * 4, 7 + a.r() * 2, 4, 'sel2_hoja');
    }
    if (v === 'platanera') {
      const H = 34 + a.r() * 10;
      ps.push(masa([hueso([0, 0, 0], [az(a, 2), az(a, 2), H], 4, 3)], { mat: 'sel2_hoja_clara', suave: 1, tono: -0.1 }));
      for (let i = 0; i < 7; i++) { const t = (i / 7) * PI2 + az(a, 0.3), b: V = [0, 0, H - 2 + a.r() * 4]; ps.push(a.palo(b, mas(b, [Math.cos(t) * 6, Math.sin(t) * 6, 8]), 0.7, { mat: 'sel2_hoja_clara' })); hoja(a, ps, mas(b, [Math.cos(t) * 6, Math.sin(t) * 6, 8]), [Math.cos(t), Math.sin(t), 0.1], 28 + a.r() * 8, 6, 14, a.r() < 0.25 ? 'sel2_paja' : 'sel2_hoja'); }
      ps.push(a.palo([0, 0, H], [6, 2, H - 10], 0.8, { mat: 'sel2_hoja_clara' }), a.elipsoide(7, 2.4, H - 14, 3.4, 3.4, 5.5, { mat: 'sel2_carne_flor', tono: -0.15 }));
      for (let k = 0; k < 6; k++) ps.push(a.elipsoide(6 + az(a, 3), 2 + az(a, 3), H - 4 - k * 1.2, 1.2, 1.2, 3, { mat: 'sel2_hoja_clara', incl: 30, giro: k * 60 }));
    }
    if (v === 'bromelia') { for (let i = 0; i < 12; i++) { const t = (i / 12) * PI2 + az(a, 0.2); hoja(a, ps, [0, 0, 2], [Math.cos(t), Math.sin(t), 0.9 - (i % 3) * 0.3], 10 + a.r() * 4, 1.8, 2, i % 2 ? 'sel2_hoja' : 'sel2_carne_flor', -0.05); } ps.push(a.cilindro(0, 0, 2, 2, 10, { mat: 'sel2_carne_flor', r1: 0.6, tono: 0.1 })); }
    if (v === 'orquidea') {
      ps.push(masa([hueso([0, 0, 0], [az(a, 2), az(a, 2), 22], 3, 2.4), bulto([0, 0, 2], [4, 4, 3])], { mat: 'sel2_corteza', suave: 1 }));
      for (let i = 0; i < 4; i++) { const t = a.r() * PI2; hoja(a, ps, [0, 0, 4 + i * 4], [Math.cos(t), Math.sin(t), 0.1], 9, 2.2, 1.5); }
      for (let i = 0; i < 6; i++) { const t = a.r() * PI2, c: V = polar(t, 4 + a.r() * 3, 14 + a.r() * 8); ps.push(a.palo([0, 0, 18], c, 0.3, { mat: 'sel2_hoja_clara' })); for (let k = 0; k < 5; k++) { const u = (k / 5) * PI2; ps.push(a.elipsoide(c[0] + Math.cos(u) * 1.4, c[1] + Math.sin(u) * 1.4, c[2], 1.3, 0.7, 0.3, { mat: elegir(a, ['sel2_cal', 'sel2_carne_flor']), giro: grad(u), tono: 0.1 })); } ps.push(a.esfera(c[0], c[1], c[2] + 0.3, 0.6, { mat: 'sel2_ocre' })); }
    }
    return ps;
  },
});

// ------------------------------------------------------------------ flores carnívoras animadas
/** Flor carnívora: tallo grueso, dos valvas con dientes que abren y cierran (0 cerrada, 1 abierta) y la garganta. */
function flor(a: Arma, ps: Pieza[], b: V, s: number, abre: number, g: number, cab: number) {
  const d: V = [Math.cos(g), Math.sin(g), 0], l: V = [-d[1], d[0], 0];
  const top: V = mas(mas(b, d, 4 * s), [0, 0, 22 * s + cab * 2 * s]);
  ps.push(masa([hueso(b, mas(mas(b, d, 1 * s), [0, 0, 10 * s]), 3 * s, 2.4 * s), hueso(mas(mas(b, d, 1 * s), [0, 0, 10 * s]), top, 2.4 * s, 2 * s), bulto(b, [5 * s, 5 * s, 2.5 * s])], { mat: 'sel2_hoja', suave: 1.5 * s }));
  // valvas: la boca mira hacia adelante y arriba; cada valva gira alrededor del eje de la bisagra (lateral)
  const fi = rad(48), eje: V = nrm([d[0] * Math.cos(fi), d[1] * Math.cos(fi), Math.sin(fi)]), n0: V = nrm([-d[0] * Math.sin(fi), -d[1] * Math.sin(fi), Math.cos(fi)]);
  const ang = 0.12 + abre * 0.7, dot = (p: V, q: V) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
  const dirs: V[] = [];
  for (const sg of [1, -1]) {
    const dir = nrm(mas(mas([0, 0, 0], eje, Math.cos(ang)), n0, sg * Math.sin(ang))), c = mas(top, dir, 7 * s);
    let adentro = nrm(cruz(dir, l)); if (dot(adentro, n0) * sg > 0) adentro = mas([0, 0, 0], adentro, -1);
    dirs.push(dir);
    ps.push(masa([bulto(c, [8 * s, 6.5 * s, 2.6 * s], { ejes: [dir, l, adentro] }), bulto(mas(c, adentro, 1.3 * s), [6.6 * s, 5.3 * s, 1.5 * s], { ejes: [dir, l, adentro], mat: 'sel2_garganta' })], { mat: 'sel2_carne_flor', suave: 1 * s }));
    for (let k = 0; k < 7; k++) { const u = (k / 6 - 0.5) * 2.4, p = mas(mas(top, dir, 7 * s + Math.cos(u) * 7.6 * s), l, Math.sin(u) * 6 * s); ps.push(a.palo(p, mas(p, adentro, 2.8 * s), 0.42 * s, { mat: 'ext_hueso', r1: 0.05 })); }
  }
  const F = (_u: number) => dirs[1];
  // hojas del pie y saliva colgando
  for (let k = 0; k < 4; k++) { const t = (k / 4) * PI2 + az(a, 0.4); hoja(a, ps, mas(b, [0, 0, 1]), [Math.cos(t), Math.sin(t), 0.3], 12 * s, 3.4 * s, 3 * s, 'sel2_hoja'); }
  if (abre > 0.5) ps.push(a.palo(mas(top, F(0), 10 * s), mas(mas(top, F(0), 10 * s), [0, 0, -5 * s * abre]), 0.3 * s, { mat: 'baba' }));
}
reg({
  id: 'sel2_flor_carnivora', nombre: ['Flor carnívora', 'Carnivorous flower'], tema: 'selva', variantes: ['abierta', 'cazando', 'gigante', 'grupo'], cuadros: 8, t: 3, huella: [2, 2], huellaPor: { gigante: [3, 3] }, bloquea: true,
  armar: (v, f, a) => {
    const ps: Pieza[] = [];
    sueloS(a, ps, v === 'gigante' ? 30 : 22, v === 'gigante' ? 26 : 20, { matas: 3 });
    const u = (f / 8) * PI2;
    if (v === 'abierta') flor(a, ps, [0, 0, 0], 1, 0.75 + Math.sin(u) * 0.2, rad(40), Math.sin(u + 1) * 0.6);
    if (v === 'cazando') { const k = f < 2 ? 0.1 : f < 4 ? 0.1 + (f - 2) * 0.45 : 1 - (f - 4) * 0.22; flor(a, ps, [0, 0, 0], 1, Math.max(0, Math.min(1, k)), rad(40), f < 2 ? 1 : 0); }
    if (v === 'gigante') { flor(a, ps, [0, 0, 0], 1.8, 0.6 + Math.sin(u) * 0.35, rad(45), Math.sin(u) * 0.5); craneo(a, ps, 18, 10, 2.4, 1, 1); huesoLargo(ps, [10, 18, 0.8], [20, 22, 0.8], 0.8); }
    if (v === 'grupo') for (let i = 0; i < 3; i++) { const p = i ? polar(i * 2.3 + 0.4, 13, 0) : [0, 0, 0] as V; flor(a, ps, p, i ? 0.65 : 0.9, 0.5 + Math.sin(u + i * 2) * 0.45, rad(40 + i * 50), Math.sin(u + i) * 0.5); }
    return ps;
  },
});

// ------------------------------------------------------------------ ídolos y cabezas colosales de piedra
/** Musgo y raíces que trepan por la piedra (bultos y palos pegados a la superficie de `c`, radio `R`). */
function enmohecer(a: Arma, ps: Pieza[], c: V, R: V, n: number, raices = 0) {
  for (let i = 0; i < n; i++) { const t = a.r() * PI2, el = a.r() * 1.1, p: V = [c[0] + Math.cos(t) * Math.cos(el) * R[0], c[1] + Math.sin(t) * Math.cos(el) * R[1], c[2] + Math.sin(el) * R[2]]; ps.push(a.elipsoide(p[0], p[1], p[2], 3 + a.r() * 4, 3 + a.r() * 3, 1.6, { mat: 'ext_musgo', giro: grad(t), incl: grad(Math.PI / 2 - el) * 0.7, tono: az(a, 0.06) })); }
  for (let k = 0; k < raices; k++) { const t = a.r() * PI2; let p: V = [c[0] + Math.cos(t) * R[0] * 0.3, c[1] + Math.sin(t) * R[1] * 0.3, c[2] + R[2]]; for (let i = 1; i <= 4; i++) { const tt = t + az(a, 0.3), el = 1.2 - i * 0.35, q: V = [c[0] + Math.cos(tt) * Math.cos(el) * R[0] * 1.03, c[1] + Math.sin(tt) * Math.cos(el) * R[1] * 1.03, Math.max(0, c[2] + Math.sin(el) * R[2] * 1.03)]; ps.push(a.palo(p, q, 1.6 - i * 0.2, { mat: 'sel2_corteza' })); p = q; } ps.push(a.palo(p, mas(p, [Math.cos(t) * 8, Math.sin(t) * 8, -p[2]]), 1, { mat: 'sel2_corteza' })); }
}
reg({
  id: 'sel2_idolo', nombre: ['Ídolo de piedra musgoso', 'Mossy stone idol'], tema: 'selva', variantes: ['sentado', 'estela', 'caido', 'ojos'], huella: [2, 2], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloS(a, ps, 24, 22, { matas: 4 });
    const g = 45 + az(a, 15), m = marco([0, 0, v === 'caido' ? 9 : 0], g, v === 'caido' ? 80 : 0, v === 'caido' ? 10 : 0);
    const E: [V, V, V] = [m.D([1, 0, 0]), m.D([0, 1, 0]), m.D([0, 0, 1])], T = (x: number, y: number, z: number) => m.T([x, y, z]);
    if (v === 'estela') {
      cajaM(a, ps, m, 0, 0, -1, 7, 18, 50, 'sel2_piedra');
      // la cara tallada en relieve: ojos, nariz, boca con colmillos y el tocado
      ps.push(masa([bulto(T(3.4, 0, 34), [1.6, 7, 9], { ejes: E }), bulto(T(4.8, 0, 32), [1.4, 1.6, 3], { ejes: E }), bulto(T(4.2, 0, 26), [1.2, 5, 1.6], { ejes: E }), bulto(T(3.6, 0, 45), [2, 9, 4], { ejes: E })], { mat: 'sel2_piedra', suave: 0.8 }));
      for (const s of [-1, 1]) ps.push(a.elipsoide(...T(4.6, s * 3.6, 35), 0.9, 2, 1.4, { mat: 'negro', giro: g }));
      for (let k = 0; k < 4; k++) ps.push(a.caja(...T(3.6, -6 + k * 4, 10), 0.8, 3, 9, { mat: 'sel2_piedra', giro: g, tono: -0.15 }));
      enmohecer(a, ps, T(0, 0, 25), [5, 10, 25], 6, 1);
      return ps;
    }
    // ídolo sentado: cuerpo rechoncho, manos en las rodillas, cabezota con fauces
    const cs: Comp[] = [bulto(T(0, 0, 13), [9, 11, 12], { ejes: E }), bulto(T(4, 0, 4), [8, 12, 4.5], { ejes: E }), bulto(T(1, 0, 32), [10, 11, 10], { ejes: E }), bulto(T(8.5, 0, 28), [3, 7, 3], { ejes: E, tono: -0.05 }), bulto(T(9.6, 0, 33), [2, 2, 3], { ejes: E }), bulto(T(-1, 0, 41), [9, 13, 3.4], { ejes: E })];
    for (const s of [-1, 1]) cs.push(hueso(T(0, s * 10, 22), T(7, s * 9, 10), 3, 2.6), bulto(T(9, s * 7, 9), [3, 3.6, 2.4], { ejes: E }), bulto(T(9, s * 12, 32), [3, 2, 5], { ejes: E }));
    ps.push(masa(cs, { mat: 'sel2_piedra', suave: 1.6 }));
    for (const s of [-1, 1]) ps.push(a.elipsoide(...T(9.2, s * 4, 34), 1.4, 2.2, 1.6, { mat: v === 'ojos' ? 'sel2_ojo' : 'negro', giro: g }));
    for (let k = 0; k < 4; k++) ps.push(a.palo(T(10.2, -3 + k * 2, 28), T(10.6, -3 + k * 2, 25.5), 0.6, { mat: 'ext_hueso', r1: 0.1 }));
    enmohecer(a, ps, T(0, 0, 18), [10, 12, 22], 7, v === 'caido' ? 0 : 2);
    if (v === 'ojos') return { piezas: ps, resplandor: { c: T(14, 0, 34), r: 22, color: '#80c030' } };
    return ps;
  },
});

/** Cabeza colosal (la de los pueblos antiguos de la selva): casco ceñido, cara ancha, labios gruesos. */
function cabezaOlmeca(a: Arma, ps: Pieza[], m: ReturnType<typeof marco>, s: number, partida = false) {
  const E: [V, V, V] = [m.D([1, 0, 0]), m.D([0, 1, 0]), m.D([0, 0, 1])], T = (x: number, y: number, z: number) => m.T([x * s, y * s, z * s]);
  const B = (x: number, y: number, z: number, r: V, o: { mat?: string; tono?: number } = {}) => bulto(T(x, y, z), [r[0] * s, r[1] * s, r[2] * s], { ejes: E, ...o });
  const cs: Comp[] = [
    B(0, 0, 15, [12, 13, 15]), B(1, 0, 27, [11, 13.5, 6], { tono: 0.04 }), B(9, 0, 26, [3, 13, 3], { tono: 0.06 }),
    B(10.5, 0, 17, [3, 3, 4]), B(10.6, 0, 15.6, [2.2, 4.2, 1.8]), B(10, 0, 9, [3, 6, 1.6], { tono: 0.03 }), B(10, 0, 6.6, [2.6, 5, 1.4], { tono: -0.02 }),
    B(9.2, 5, 20, [2.2, 3.4, 1.2], { tono: -0.12 }), B(9.2, -5, 20, [2.2, 3.4, 1.2], { tono: -0.12 }), B(6, 0, 3, [6, 10, 3]),
    B(0, 13, 16, [3, 2.4, 5]), B(0, -13, 16, [3, 2.4, 5]), B(3, 12, 24, [5, 3, 5], { tono: 0.05 }), B(3, -12, 24, [5, 3, 5], { tono: 0.05 }),
  ];
  ps.push(masa(cs, { mat: 'sel2_piedra', suave: 1.4 * s }));
  for (const sd of [-1, 1]) ps.push(a.elipsoide(...T(10.4, sd * 5, 20), 0.6 * s, 1.8 * s, 0.9 * s, { mat: 'negro', tono: 0.2 }));
  if (partida) ps.push(a.caja(...T(0, 2, -2), 40 * s, 2.4 * s, 44 * s, { mat: 'negro', giro: 0, resta: true }));
}
reg({
  id: 'sel2_cabeza_colosal', nombre: ['Cabeza colosal', 'Colossal head'], tema: 'selva', variantes: ['entera', 'musgo', 'raices', 'partida'], huella: [4, 4], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloS(a, ps, 44, 40, { matas: 6 });
    const g = 40 + az(a, 25), m = marco([0, 0, -2], g, az(a, 4), az(a, 4)), s = 1.9;
    cabezaOlmeca(a, ps, m, s, v === 'partida');
    const c = m.T([0, 0, 15 * s]);
    if (v === 'musgo') enmohecer(a, ps, c, [12 * s, 13 * s, 15 * s], 14, 0);
    if (v === 'raices') { enmohecer(a, ps, c, [12 * s, 13 * s, 15 * s], 6, 6); for (let i = 0; i < 4; i++) colgante(a, ps, mas(c, [az(a, 10), az(a, 10), 15 * s]), 30, 0.6, 0.6); }
    if (v === 'partida') for (let i = 0; i < 5; i++) pena(a, ps, polar(a.r() * PI2, 30 + a.r() * 8), [4 + a.r() * 4, 3 + a.r() * 3, 3 + a.r() * 2], { mat: 'sel2_piedra', n: 3, musgo: 0.5 });
    if (v === 'entera') enmohecer(a, ps, c, [12 * s, 13 * s, 15 * s], 4, 0);
    for (let i = 0; i < 3; i++) helecho(a, ps, polar(a.r() * PI2, 28, 1), 12, 6);
    return ps;
  },
});

reg({
  id: 'sel2_ruina', nombre: ['Ruina tragada por la selva', 'Jungle-swallowed ruin'], tema: 'selva', variantes: ['escalones', 'muro', 'arco', 'base'], huella: [4, 3], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloS(a, ps, 42, 32, { matas: 5 });
    if (v === 'escalones') for (let k = 0; k < 5; k++) for (let i = 0; i < 5 - k; i++) { if (a.r() < 0.15) continue; sillar(a, ps, -24 + i * 12 + k * 6, -k * 6, k * 7, 11.6, 30 - k * 4, 7, az(a, 2), 'sel2_piedra', { jit: 1 }); }
    if (v === 'muro') for (let z = 0, f = 0; z < 50; z += 8, f++) for (let x = -32 - (f % 2) * 6; x < 32; x += 13) if (40 - Math.abs(x) * 0.4 + az(a, 10) > z) sillar(a, ps, x + 6, 0, z, 12.6, 12, 7.8, 0, 'sel2_piedra', { jit: 1 });
    if (v === 'arco') { for (const s of [-1, 1]) for (let z = 0; z < 40; z += 8) sillar(a, ps, s * 16, 0, z, 10, 12, 7.8, 0, 'sel2_piedra', { jit: 0.8 }); for (let k = 0; k < 4; k++) sillar(a, ps, -12 + k * 8, 0, 40 + (k === 0 || k === 3 ? 0 : 6), 8, 12, 7, 0, 'sel2_piedra', { jit: 0.8 }); sillar(a, ps, 0, 0, 52, 30, 13, 7, 0, 'sel2_piedra'); }
    if (v === 'base') { for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) sillar(a, ps, -24 + i * 16, -12 + j * 12, 0, 15.5, 11.5, 6 + a.r() * 2, az(a, 2), 'sel2_piedra', { jit: 1 }); craneo(a, ps, 6, 2, 9, 1, 1); }
    // raíces que abrazan y lianas, musgo en lo alto
    for (let k = 0; k < 4; k++) { const x0 = entre(a, -26, 26); let p: V = [x0, az(a, 4), v === 'base' ? 8 : 40]; for (let i = 1; i <= 4; i++) { const q: V = [p[0] + az(a, 6), p[1] + az(a, 6) + 3, Math.max(0, p[2] - 11)]; ps.push(a.palo(p, q, 1.8 - i * 0.25, { mat: 'sel2_corteza' })); p = q; } }
    for (let i = 0; i < 8; i++) ps.push(a.elipsoide(entre(a, -28, 28), az(a, 8), entre(a, 6, 44), 4 + a.r() * 4, 3, 2, { mat: 'ext_musgo', giro: a.r() * 180 }));
    for (let i = 0; i < 3; i++) helecho(a, ps, [entre(a, -30, 30), 14 + a.r() * 6, 0.5], 12, 6);
    return ps;
  },
});

// ------------------------------------------------------------------ chozas, puentes y barcas
reg({
  id: 'sel2_choza', nombre: ['Choza sobre pilotes', 'Stilt hut'], tema: 'selva', variantes: ['entera', 'escalera', 'ruina', 'sobre_agua'], cuadros: 1, huella: [5, 5], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    if (v === 'sobre_agua') charco(a, ps, 44, 38, 0, 1, { mat: 'sel2_agua', gotas: 0, borde: 'ext_barro' }); else sueloS(a, ps, 46, 44, { matas: 5 });
    const X = 22, Y = 20, zp = 26, ruina = v === 'ruina';
    for (const x of [-X, 0, X]) for (const y of [-Y, Y]) { ps.push(a.cilindro(x + az(a, 1), y + az(a, 1), -2, 2, zp + 2, { mat: 'sel2_bambu', incl: az(a, 3) })); ps.push(a.palo([x, y, 6], [x + (x ? -Math.sign(x) * 10 : 10), y, zp - 2], 0.8, { mat: 'sel2_bambu' })); }
    // piso de cañas, paredes de tablas y techo alto de paja que baja casi al piso
    for (let i = 0; i < 12; i++) { if (ruina && a.r() < 0.3) continue; ps.push(a.palo([-X - 3, -Y - 2 + i * 3.7, zp], [X + 3, -Y - 2 + i * 3.7, zp], 1.6, { mat: 'sel2_bambu', tono: az(a, 0.06) })); }
    for (const s of [-1, 1]) { if (ruina && s > 0) continue; ps.push(a.caja(0, s * (Y - 1), zp + 1, 2 * X, 2, 18, { mat: 'sel2_paja', tono: -0.1 })); }
    ps.push(a.caja(-X + 1, 0, zp + 1, 2, 2 * Y - 2, 18, { mat: 'sel2_paja', tono: -0.1 }));
    if (!ruina) ps.push(a.caja(X - 1, 0, zp + 1, 2, 2 * Y - 2, 18, { mat: 'sel2_paja', tono: -0.05 }), a.caja(X - 1, 4, zp + 1, 4, 10, 14, { mat: 'negro', resta: true }), a.caja(X - 2, 4, zp + 1, 1, 9, 13, { mat: 'negro' }));
    const zt = zp + 18, alto = 30;
    const techo = (lado: number) => { const pts: V[] = []; for (const x of [-X - 6, X + 6]) pts.push([x, lado * (Y + 9), zt - 6], [x, 0, zt + alto], [x, lado * (Y + 9), zt - 4], [x, 0, zt + alto + 2]); ps.push(a.poliedro(pts, { mat: 'sel2_paja', tono: lado * 0.03 })); };
    if (!ruina) { techo(1); techo(-1); for (let i = 0; i < 10; i++) ps.push(a.palo([entre(a, -X - 6, X + 6), Y + 9, zt - 5], [entre(a, -X - 6, X + 6), Y + 10, zt - 10 - a.r() * 5], 0.5, { mat: 'sel2_paja' })); }
    else { techo(-1); ps.push(a.palo([-X, 0, zt + alto * 0.6], [X + 10, 20, zt - 10], 1.2, { mat: 'sel2_bambu' })); for (let i = 0; i < 4; i++) colgante(a, ps, [entre(a, -X, X), entre(a, -Y, Y), zt], 20, 0.5, 0.6); }
    if (v === 'escalera' || v === 'sobre_agua') { for (const s of [-1, 1]) ps.push(a.palo([X + 22, 6 + s * 4, -1], [X + 2, 6 + s * 4, zp + 1], 1, { mat: 'sel2_bambu' })); for (let k = 1; k < 7; k++) { const t = k / 7; ps.push(a.palo([X + 22 - t * 20, 2, zp * t], [X + 22 - t * 20, 10, zp * t], 0.6, { mat: 'sel2_bambu' })); } }
    // cráneos colgados y una vasija
    for (let i = 0; i < 3; i++) { const p: V = [X + 4, -Y + 6 + i * 8, zp - 2]; ps.push(a.palo(p, mas(p, [0, 0, -6]), 0.25, { mat: 'cuerda' })); craneo(a, ps, p[0], p[1], p[2] - 8, 0.6, 0.8); }
    return ps;
  },
});

reg({
  id: 'sel2_puente_colgante', nombre: ['Puente colgante', 'Rope bridge'], tema: 'selva', variantes: ['x', 'roto'], cuadros: 6, t: 4, huella: [7, 2], bloquea: true,
  armar: (v, f, a) => {
    const ps: Pieza[] = [];
    // barranco con agua oscura abajo (el puente cruza a lo largo de x)
    sueloS(a, ps, 60, 22, { matas: 4 });
    disco(a, ps, 0, 0, 0.1, 30, 20, 1, 'sel2_agua', { ruido: 0.12 });
    for (const s of [-1, 1]) { pena(a, ps, [s * 48, 0, 0], [12, 16, 8], { mat: 'sel2_piedra', musgo: 0.8, n: 5 }); for (const y of [-7, 7]) ps.push(a.palo([s * 50, y, 6], [s * 50 + az(a, 1), y, 30], 1.4, { mat: 'sel2_bambu' })); }
    const L = 100, n = 18, comba = 9, mece = Math.sin((f / 6) * PI2) * 1.2;
    const z = (x: number) => 9 - comba * (1 - (x / (L / 2)) ** 2);
    const roto = v === 'roto';
    for (let i = 0; i < n; i++) {
      const x = -L / 2 + 4 + (i / (n - 1)) * (L - 8), k = 1 - (x / (L / 2)) ** 2;
      if (roto && x > -4 && x < 14) continue;
      const yy = mece * k, zz = roto && x > 0 ? z(x) - (x - 14) * 0.2 : z(x);
      ps.push(a.caja(x, yy, zz + (roto ? az(a, 1) : 0), 3.4, 13, 1.1, { mat: 'madera_vieja', giro: az(a, 6), tono: az(a, 0.1) }));
    }
    for (const y of [-7, 7]) for (const h of [0, 12]) {
      const pts: V[] = [];
      for (let i = 0; i <= 10; i++) { const x = -L / 2 + (i / 10) * L, k = 1 - (x / (L / 2)) ** 2; pts.push([x, y + mece * k, z(x) + h + (h ? 6 * (1 - k) : 0)]); }
      for (let i = 0; i < 10; i++) { if (roto && pts[i][0] > -6 && pts[i][0] < 10) { if (h === 0 && y < 0) ps.push(a.palo(pts[i], mas(pts[i], [2, 0, -14]), 0.4, { mat: 'cuerda' })); continue; } ps.push(a.palo(pts[i], pts[i + 1], 0.45, { mat: 'cuerda' })); if (h && i % 2 === 0) ps.push(a.palo(pts[i], [pts[i][0], pts[i][1], z(pts[i][0])], 0.3, { mat: 'cuerda' })); }
    }
    return ps;
  },
});
conVarianteY('sel2_puente_colgante');

reg({
  id: 'sel2_barca', nombre: ['Barca varada', 'Beached canoe'], tema: 'selva', variantes: ['varada', 'volcada', 'rota', 'piragua'], huella: [4, 2], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    charco(a, ps, 36, 16, 0, 1, { mat: 'sel2_agua', gotas: 0, borde: 'ext_barro' });
    const g = az(a, 15), d: V = [Math.cos(rad(g)), Math.sin(rad(g)), 0], L = v === 'piragua' ? 40 : 30;
    const vuelca = v === 'volcada';
    // casco tallado en un tronco: masa por fuera, hueco cavado por dentro
    const m = marco([0, 0, vuelca ? 7 : 0], g, 0, vuelca ? 180 : v === 'rota' ? 18 : 6);
    const E: [V, V, V] = [m.D([1, 0, 0]), m.D([0, 1, 0]), m.D([0, 0, 1])];
    ps.push(masa([bulto(m.T([0, 0, 4]), [L, 6.5, 4.6], { ejes: E }), hueso(m.T([L * 0.7, 0, 5.5]), m.T([L + 4, 0, 8]), 3.6, 1.4), hueso(m.T([-L * 0.7, 0, 5.5]), m.T([-L - 3, 0, 7]), 3.6, 1.4)], { mat: 'sel2_corteza', suave: 2 }));
    if (!vuelca) ps.push(a.elipsoide(...m.T([0, 0, 7.6]), L * 0.86, 5, 4.2, { mat: 'negro', giro: g, resta: true }), a.elipsoide(...m.T([0, 0, 4.5]), L * 0.8, 4.4, 1, { mat: v === 'rota' ? 'sel2_agua' : 'madera_vieja', giro: g, tono: -0.2 }));
    if (v === 'rota') ps.push(a.caja(...m.T([8, 4, 2]), 10, 6, 9, { mat: 'negro', giro: g, resta: true }));
    if (v === 'piragua') { for (let i = 0; i < 6; i++) ps.push(a.palo(m.T([-L * 0.75 + i * L * 0.3, -6.3, 8.6]), m.T([-L * 0.75 + i * L * 0.3 + 3, -6.3, 8.6]), 0.8, { mat: 'sel2_ocre' })); ps.push(a.palo(m.T([L * 0.9, 0, 9]), m.T([L + 4, 0, 16]), 0.8, { mat: 'sel2_corteza' })); craneo(a, ps, ...m.T([L + 4.5, 0, 18]), 0.6, rad(g)); }
    // remo y cuerda a la estaca
    ps.push(a.palo(mas([0, 0, 0], d, -6), mas(mas([0, 0, 0], d, 18), [-d[1] * 10, d[0] * 10, 1]), 0.6, { mat: 'madera_vieja' }), a.caja(...mas(mas([0, 0, 0], d, 19), [-d[1] * 11, d[0] * 11, 0.5]), 7, 3.4, 0.8, { mat: 'madera_vieja', giro: g + 90 }));
    ps.push(a.palo(mas(mas([0, 0, 0], d, -L - 10), [0, 0, -1]), mas(mas([0, 0, 0], d, -L - 10), [0, 0, 12]), 1, { mat: 'sel2_bambu' }), a.palo(mas(mas([0, 0, 0], d, -L - 10), [0, 0, 8]), mas(mas([0, 0, 0], d, -L), [0, 0, 6]), 0.3, { mat: 'cuerda' }));
    juncosS(a, ps, entre(a, -20, 20), 14, 7);
    return ps;
  },
});
function juncosS(a: Arma, ps: Pieza[], x: number, y: number, n: number) { for (let i = 0; i < n; i++) { const b: V = [x + az(a, 4), y + az(a, 4), 0]; ps.push(a.palo(b, mas(b, [az(a, 4), az(a, 4), 12 + a.r() * 10]), 0.55, { mat: 'sel2_hoja_clara', r1: 0.2, tono: az(a, 0.1) })); } }

// ------------------------------------------------------------------ agua: cascadas, manglares y charcas
reg({
  id: 'sel2_cascada', nombre: ['Cascada', 'Waterfall'], tema: 'selva', variantes: ['chica', 'alta', 'con_poza'], cuadros: 6, t: 2, huella: [5, 4], bloquea: true,
  armar: (v, f, a) => {
    const ps: Pieza[] = [];
    sueloS(a, ps, 50, 40, { matas: 5 });
    const H = v === 'alta' ? 70 : 40;
    // la peña de la que cae (al fondo), la poza al frente
    grupoP(a, ps, H);
    const R = v === 'con_poza' ? 30 : 22;
    disco(a, ps, 10, 12, 0, R + 4, R * 0.75 + 4, 1.4, 'ext_barro', { ruido: 0.1 });
    disco(a, ps, 10, 12, 0.2, R, R * 0.75, 1.4, 'sel2_agua', { ruido: 0.1, n: 16 });
    // el chorro: lenguas de agua que bajan con el cuadro y la espuma al pie
    const x0 = -10, y0 = -8, ancho = 14;
    for (let k = 0; k < 5; k++) {
      const yy = y0 + (k / 4 - 0.5) * ancho, u = ((f / 6) + k * 0.37) % 1;
      ps.push(a.caja(x0 + 4, yy, 1, 2.2, ancho / 5 + 0.4, H - 1, { mat: 'ext_agua_lluvia', tono: 0.1 + (k % 2) * 0.06 }));
      for (let j = 0; j < 3; j++) { const z = H * (1 - ((u + j / 3) % 1)); ps.push(a.elipsoide(x0 + 5.3, yy, z, 0.7, 1.2, 3.5, { mat: 'ext_espuma', tono: -0.05 })); }
    }
    for (let i = 0; i < 7; i++) { const t = a.r() * PI2, u = ((f / 6) + i / 7) % 1; ps.push(a.elipsoide(x0 + 8 + Math.cos(t) * 5 * u, y0 + Math.sin(t) * 7, 1.8 + u * 2, 3 - u * 1.5, 2.4 - u, 1.2, { mat: 'ext_espuma', tono: 0.05 - u * 0.2 })); }
    for (let i = 0; i < 4; i++) helecho(a, ps, polar(a.r() * PI2 + 1, 34, 0.5), 12, 6);
    return ps;
  },
});
/** Peña con el borde de donde cae el agua (al fondo, hacia -x). */
function grupoP(a: Arma, ps: Pieza[], H: number) {
  pena(a, ps, [-28, -6, 0], [20, 26, H * 0.62], { mat: 'sel2_piedra', musgo: 1.1, n: 7, losa: 0.3, hunde: 0 });
  pena(a, ps, [-22, 18, 0], [14, 12, H * 0.45], { mat: 'sel2_piedra', musgo: 1, n: 5, hunde: 0 });
  pena(a, ps, [-22, -30, 0], [12, 12, H * 0.5], { mat: 'sel2_piedra', musgo: 1, n: 5, hunde: 0 });
}

reg({
  id: 'sel2_manglar', nombre: ['Manglar', 'Mangrove'], tema: 'selva', variantes: ['chico', 'grande', 'grupo'], huella: [4, 4], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    charco(a, ps, 40, 34, 0, 1, { mat: 'sel2_agua', gotas: 0, borde: 'ext_barro' });
    const arbol = (c: V, H: number) => {
      // tronco que nace arriba de un arco de raíces zancudas clavadas en el agua
      const base: V = [c[0], c[1], H * 0.32], top: V = [c[0] + az(a, 4), c[1] + az(a, 4), H];
      ps.push(masa([hueso(base, top, 3.6, 2.2), bulto(base, [5, 5, 4])], { mat: 'sel2_corteza', suave: 1.6 }));
      const nr = 7 + Math.floor(a.r() * 4);
      for (let i = 0; i < nr; i++) { const t = (i / nr) * PI2 + az(a, 0.3), R = H * (0.35 + a.r() * 0.2), m: V = [c[0] + Math.cos(t) * R * 0.55, c[1] + Math.sin(t) * R * 0.55, H * 0.36 + a.r() * 4], e: V = [c[0] + Math.cos(t) * R, c[1] + Math.sin(t) * R, -0.5]; ps.push(masa([hueso(mas(base, [0, 0, az(a, 2)]), m, 1.8, 1.4), hueso(m, e, 1.4, 1)], { mat: 'sel2_corteza', suave: 1 })); }
      for (let i = 0; i < 5; i++) { const t = a.r() * PI2; ps.push(a.palo(top, mas(top, [Math.cos(t) * 12, Math.sin(t) * 12, 4 + a.r() * 6]), 1.1, { mat: 'sel2_corteza', r1: 0.5 })); follaje(a, ps, mas(top, [Math.cos(t) * 14, Math.sin(t) * 14, 8]), 13, 'sel2_follaje', 3); }
      for (let i = 0; i < 4; i++) { const t = a.r() * PI2; ps.push(a.palo(mas(top, [Math.cos(t) * 8, Math.sin(t) * 8, 2]), [top[0] + Math.cos(t) * 9, top[1] + Math.sin(t) * 9, 0.5], 0.4, { mat: 'sel2_corteza' })); }
    };
    if (v === 'chico') arbol([0, 0, 0], 46);
    if (v === 'grande') arbol([0, 0, 0], 72);
    if (v === 'grupo') { arbol([-14, -8, 0], 54); arbol([16, 10, 0], 40); }
    juncosS(a, ps, 26, -18, 6);
    for (let i = 0; i < 6; i++) ps.push(a.cilindro(entre(a, -30, 30), entre(a, -26, 26), 1.3, 2 + a.r() * 2, 0.3, { mat: 'sel2_lenteja' }));
    return ps;
  },
});

reg({
  id: 'sel2_charca', nombre: ['Charca del pantano', 'Swamp pool'], tema: 'selva', variantes: ['lirios', 'burbujas', 'lenteja', 'juncos'], cuadros: 6, t: 3, huella: [3, 3], bloquea: false,
  armar: (v, f, a) => {
    const ps: Pieza[] = [];
    const R = 28;
    charco(a, ps, R, R * 0.75, f, 6, { mat: 'sel2_agua', gotas: v === 'juncos' ? 2 : 0, borde: 'ext_barro' });
    if (v === 'lirios') for (let i = 0; i < 8; i++) { const p = polar(a.r() * PI2, a.r() * R * 0.75); ps.push(a.cilindro(p[0], p[1] * 0.75, 1.4, 3 + a.r() * 2, 0.3, { mat: 'sel2_hoja' }), a.caja(p[0] + 1.5, p[1] * 0.75 + 0.5, 1.2, 3, 1, 1, { mat: 'sel2_agua', giro: a.r() * 180, resta: true })); if (a.r() < 0.4) { for (let k = 0; k < 5; k++) { const u = (k / 5) * PI2; ps.push(a.elipsoide(p[0] + Math.cos(u) * 0.9, p[1] * 0.75 + Math.sin(u) * 0.9, 2.4, 1.2, 0.6, 0.6, { mat: 'sel2_cal', giro: grad(u), incl: 30 })); } } }
    if (v === 'burbujas') for (let i = 0; i < 6; i++) { const p = polar(i * 1.9 + 0.3, R * 0.5 * ((i * 0.41) % 1 + 0.15)), u = ((f / 6) + i * 0.29) % 1; ps.push(a.esfera(p[0], p[1] * 0.75, 1.6, 0.6 + u * 1.6, { mat: 'baba', tono: 0.15 - u * 0.2 })); if (u > 0.85) ps.push(a.elipsoide(p[0], p[1] * 0.75, 1.7, 3.5, 3, 0.15, { mat: 'ext_espuma', tono: -0.2 })); }
    if (v === 'lenteja') disco(a, ps, az(a, 4), az(a, 4), 1.35, R * 0.7, R * 0.5, 0.2, 'sel2_lenteja', { ruido: 0.3, n: 16 });
    if (v === 'juncos' || v === 'lirios') { juncosS(a, ps, R * 0.8, -R * 0.3, 8); juncosS(a, ps, -R * 0.7, R * 0.4, 6); }
    for (let i = 0; i < 3; i++) helecho(a, ps, polar(a.r() * PI2, R + 6, 0.5), 10, 5);
    return ps;
  },
});
