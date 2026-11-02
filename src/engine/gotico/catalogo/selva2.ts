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
