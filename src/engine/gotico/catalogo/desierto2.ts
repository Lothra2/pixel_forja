import { registrar, conVarianteY, type Arma, type Pieza } from '../objeto';
import { MATERIALES } from '../materiales';
import { ruido, hash3, hueso, bulto, masa, type Comp } from '../render';
import {
  PI2, az, entre, elegir, mas, mez, nrm, cruz, polar, rad, grad, suelo, mata, guijarro, pena, disco, llamas, chispas, humo,
  cadaver, craneo, huesoLargo, costillar, ave, buitre, marco, cajaM, sillar, bestiaMuerta, flecha, type V,
} from '../exteriores';

/**
 * Desierto (acto 2), segunda tanda: dunas con crestas y ondas, rocas talladas por el viento, osamentas de bestias
 * gigantes, obeliscos y estelas medio enterrados, estatuas colosales derribadas y una esfinge, tiendas nómadas,
 * camellos muertos y caravanas perdidas, pozos secos, oasis con palmeras vivas y muertas, columnas en ruinas,
 * escarabajos que caminan, cactus, arenas movedizas que giran y el remolino de arena. La arena lleva ondas de
 * viento y se amontona al pie de todo.
 */

// ------------------------------------------------------------------ materiales
const M = MATERIALES;
const fr = (x: number) => x - Math.floor(x);
/** Arena con ondas de viento (rizos paralelos que se tuercen con el ruido). */
M.des2_arena = {
  rampa: ['#2a2014', '#3e301e', '#544229', '#6b5535', '#816842', '#977b50', '#ab8e60', '#bea172'], ruido: 0.18, escala: 0.25,
  patron: (p, n) => { const w = Math.sin((p[0] * 0.55 + p[1] * 0.3) + ruido(p[0] * 0.05, p[1] * 0.05, 2) * 6) * 0.5 + 0.5; return (w > 0.8 ? 0.09 : w < 0.2 ? -0.08 : 0) * Math.max(0.2, n[2]) + (ruido(p[0] * 0.04, p[1] * 0.04, 5) - 0.5) * 0.18; },
};
M.des2_arena_osc = { rampa: ['#1e160d', '#2e2215', '#40301e', '#523f28', '#654f33', '#78603f'], ruido: 0.25, escala: 0.3 };
/** Arenisca con jeroglíficos tallados en las caras de pie. */
M.des2_glifos = {
  rampa: ['#24190f', '#3a2918', '#523b23', '#6b4e2f', '#83623c', '#9a764b', '#b08a5c', '#c39d6e'], ruido: 0.25, escala: 0.2,
  patron: (p, n) => {
    const base = (ruido(p[0] * 0.08, p[1] * 0.08, p[2] * 0.08) - 0.5) * 0.2;
    if (Math.abs(n[2]) > 0.6) return base;
    const u = Math.abs(n[0]) > Math.abs(n[1]) ? p[1] : p[0], cu = u / 3.4, cz = p[2] / 4.4, iu = Math.floor(cu), iz = Math.floor(cz), fu = fr(cu), fz = fr(cz);
    if (iz % 5 === 4) return base + (fz < 0.12 || fz > 0.88 ? -0.22 : 0);
    const h = hash3(iu, iz, 11);
    let g = false;
    if (h < 0.25) g = Math.abs(fu - 0.5) < 0.1 && fz > 0.15 && fz < 0.85;
    else if (h < 0.5) g = (Math.abs(fz - 0.3) < 0.08 || Math.abs(fz - 0.7) < 0.08) && fu > 0.2 && fu < 0.8;
    else if (h < 0.72) { const d = Math.hypot(fu - 0.5, fz - 0.55); g = Math.abs(d - 0.25) < 0.07 || (Math.abs(fu - 0.5) < 0.07 && fz < 0.35); }
    else if (h < 0.86) g = Math.abs(fu - fz) < 0.09 && fz > 0.15 && fz < 0.85;
    return base + (g ? -0.3 : 0);
  },
};
/** Fuste estriado (columnas). */
M.des2_estrias = {
  rampa: ['#2a1f14', '#45331f', '#62492c', '#7f603a', '#9b784a', '#b5905d', '#c8a470'], ruido: 0.22, escala: 0.18,
  // las estrías salen de la normal (sirve para cualquier fuste vertical, esté donde esté)
  patron: (p, n) => (Math.abs(n[2]) < 0.5 && Math.sin(Math.atan2(n[1], n[0]) * 12) > 0.45 ? -0.22 : 0) + (ruido(p[0] * 0.1, p[1] * 0.1, p[2] * 0.1) - 0.5) * 0.2 + (ruido(p[0] * 0.6, p[1] * 0.6, p[2] * 0.6) > 0.8 ? -0.1 : 0),
};
M.des2_tronco_palma = {
  rampa: ['#130e09', '#221910', '#332618', '#453321', '#58422b', '#6b5236', '#7d6242'], ruido: 0.35, escala: 0.5,
  patron: (p) => { const f = fr(p[2] / 2.4 + ruido(p[0] * 0.3, p[1] * 0.3, 1) * 0.4); return f < 0.22 ? -0.3 : (f - 0.6) * 0.3; },
};
M.des2_palma = { rampa: ['#0b0f07', '#141b0c', '#1f2913', '#2b3719', '#384521', '#47542a', '#576434'], ruido: 0.4, escala: 0.7, patron: (p) => (ruido(p[0] * 1.4, p[1] * 1.4, p[2] * 1.4) - 0.5) * 0.25 };
M.des2_palma_seca = { rampa: ['#17110a', '#271c11', '#3a2a19', '#4d3a22', '#614a2c', '#755b37', '#886b43'], ruido: 0.45, escala: 0.7, patron: (p) => (ruido(p[0] * 1.4, p[1] * 1.4, p[2] * 1.4) - 0.5) * 0.3 };
M.des2_cacto = {
  rampa: ['#0b120e', '#132018', '#1d2e22', '#283d2d', '#344c39', '#425b46', '#516b54'], ruido: 0.25, escala: 0.6,
  patron: (p) => (Math.sin(ruido(p[0] * 0.4, p[1] * 0.4, 1) * 30) > 0.55 ? -0.2 : 0) + (ruido(p[0] * 2.5, p[1] * 2.5, p[2] * 2.5) > 0.82 ? 0.15 : 0),
};
M.des2_quitina = { rampa: ['#040606', '#081010', '#0d1a18', '#132520', '#1a3128', '#223e31', '#2c4c3b'], ruido: 0.15, escala: 0.6, brillo: 0.9 };
M.des2_quitina_oro = { rampa: ['#110c04', '#211808', '#33260d', '#473513', '#5b451a', '#715623', '#87682d'], ruido: 0.15, escala: 0.6, brillo: 1 };
M.des2_polvo = { rampa: ['#3a2c1b', '#4a3824', '#5a452d', '#6b5337', '#7c6242', '#8d714e'], ruido: 0.55, escala: 0.22, emite: true };
M.des2_lana_negra = { rampa: ['#0b0908', '#151210', '#1f1a17', '#2a241f', '#352d27', '#40372f'], ruido: 0.45, escala: 0.9, patron: (p) => (Math.sin((p[0] + p[1]) * 0.35) > 0.85 ? -0.12 : 0) };
M.des2_alfombra = {
  rampa: ['#170605', '#280b08', '#3c120c', '#521b11', '#682617', '#7e331f'], ruido: 0.2, escala: 0.4,
  patron: (p) => { const u = fr((p[0] + p[1] * 0.2) / 6), v = fr((p[1] - p[0] * 0.2) / 6); return (u < 0.1 || v < 0.1 ? 0.18 : 0) + (Math.abs(u - 0.5) + Math.abs(v - 0.5) < 0.2 ? -0.15 : 0); },
};
M.des2_cuerno = { rampa: ['#080605', '#120e0b', '#1e1812', '#2b221a', '#3a2e23', '#4b3c2e', '#5e4c3b'], ruido: 0.2, escala: 0.8, brillo: 0.3, patron: (p) => (Math.sin(p[2] * 1.4 + p[0] * 0.3) > 0.7 ? -0.1 : 0) };
M.des2_piedra_pulida = { rampa: ['#20170f', '#352719', '#4b3824', '#624a30', '#7a5d3d', '#91704b', '#a7845b', '#bb986c'], ruido: 0.12, escala: 0.1, brillo: 0.15, patron: (p) => (ruido(p[0] * 0.05, p[1] * 0.05, p[2] * 0.05) - 0.5) * 0.25 + (ruido(p[0] * 0.5, p[1] * 0.5, p[2] * 0.5) > 0.78 ? -0.12 : 0) };

const reg = (...ds: Parameters<typeof registrar>) => registrar(...ds);
const sueloD = (a: Arma, ps: Pieza[], rx: number, ry: number, o: Parameters<typeof suelo>[4] = {}) => suelo(a, ps, rx, ry, { mat: 'des2_arena', matas: 1, pasto: 'ext_pasto_seco', piedras: 1, matPiedra: 'ext_estratos', alto: 1.6, ...o });
/** Arena amontonada contra algo: una lengua de masa baja que se pega del lado del viento. */
function montonArena(ps: Pieza[], c: V, r: V, g = 0) { ps.push(masa([bulto([c[0], c[1], c[2] - r[2] * 0.35], r, { giro: g }), bulto(mas(c, [Math.cos(rad(g)) * r[0] * 0.6, Math.sin(rad(g)) * r[0] * 0.6, -r[2] * 0.4]), [r[0] * 0.7, r[1] * 0.7, r[2] * 0.6], { giro: g })], { mat: 'des2_arena', suave: Math.min(r[0], r[1]) * 0.3 })); }

// ------------------------------------------------------------------ dunas
reg({
  id: 'des2_duna', nombre: ['Duna con cresta', 'Crested dune'], tema: 'desierto', variantes: ['baja', 'alta', 'doble', 'con_huesos', 'ondulada'], huella: [6, 4], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    // barlovento suave hacia -y, la cresta corrida y la cara de sotavento empinada hacia +y
    const duna = (cx: number, cy: number, L: number, H: number, curva: number) => {
      const cs: Comp[] = [];
      const n = 6;
      for (let i = 0; i < n; i++) {
        const t = (i / (n - 1)) * 2 - 1, x = cx + t * L * 0.5, h = H * (1 - t * t * 0.75) * (0.9 + a.r() * 0.2), y = cy + curva * (1 - t * t) * L * 0.18;
        cs.push(bulto([x, y - h * 0.9, 0], [L * 0.26, h * 2.4, h * 0.75], { giro: az(a, 6) }));
        cs.push(bulto([x, y + h * 0.15, h * 0.35], [L * 0.2, h * 0.75, h * 0.62], { giro: az(a, 4) }));
      }
      ps.push(masa(cs, { mat: 'des2_arena', suave: H * 0.55 }));
    };
    if (v === 'baja') duna(0, 0, 80, 12 + a.r() * 4, 0.6);
    if (v === 'alta') duna(0, -4, 90, 24 + a.r() * 6, 0.8);
    if (v === 'doble') { duna(-14, -10, 64, 16, 0.6); duna(18, 12, 56, 12, 0.7); }
    if (v === 'ondulada') { for (let k = 0; k < 3; k++) duna(az(a, 6), -20 + k * 18, 84, 5 + a.r() * 2, 0.3 + a.r() * 0.3); }
    if (v === 'con_huesos') {
      duna(0, 0, 80, 15, 0.6);
      craneo(a, ps, 18, 14, 3.2, 1.05, 1.6);
      costillar(a, ps, [-26, 18, 2], [-10, 16, 3], 6, 6, { abre: 0.9, rotas: 0.3 });
      ps.push(a.palo([10, 20, 0], [12, 24, 18], 0.8, { mat: 'madera_vieja' }), a.caja(12, 24, 14, 1, 7, 9, { mat: 'ext_tela_sucia', incl: 8 }));
    }
    for (let i = 0; i < 3; i++) mata(a, ps, az(a, 40), 18 + a.r() * 8, 4, 7, 'ext_pasto_seco');
    return ps;
  },
});

// ------------------------------------------------------------------ rocas talladas por el viento
reg({
  id: 'des2_roca_viento', nombre: ['Roca tallada por el viento', 'Wind-carved rock'], tema: 'desierto', variantes: ['hongo', 'arco', 'ventifacto', 'columnas', 'yardang'], huella: [3, 3], huellaPor: { arco: [5, 2], yardang: [5, 3] }, bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    const mat = a.r() < 0.5 ? 'ext_estratos' : 'ext_estratos_rojos';
    sueloD(a, ps, v === 'arco' || v === 'yardang' ? 48 : 30, 28);
    if (v === 'hongo') {
      // cuello comido por la arena y el sombrero ancho de roca dura
      const H = 36 + a.r() * 12;
      ps.push(masa([bulto([0, 0, 3], [12, 11, 6]), hueso([0, 0, 2], [az(a, 2), az(a, 2), H * 0.65], 8, 4.5), hueso([0, 0, H * 0.6], [az(a, 2), az(a, 2), H * 0.8], 4.5, 7)], { mat, suave: 3 }));
      pena(a, ps, [az(a, 2), az(a, 2), H * 0.72], [18 + a.r() * 4, 14 + a.r() * 3, 9 + a.r() * 3], { mat, n: 6, losa: 0.3, hunde: 0 });
      montonArena(ps, [6, 8, 3], [16, 10, 5], 45);
    }
    if (v === 'arco') {
      const cs: Comp[] = [];
      for (const s of [-1, 1]) cs.push(bulto([s * 26, 0, 12], [9, 9, 14]), hueso([s * 26, 0, 4], [s * 22, az(a, 2), 30], 9, 7));
      let prev: V = [-22, 0, 30];
      for (let i = 1; i <= 6; i++) { const t = i / 6, q: V = [-22 + t * 44, az(a, 1), 30 + Math.sin(t * Math.PI) * 10]; cs.push(hueso(prev, q, 6.5 - Math.sin(t * Math.PI) * 2, 6.5 - Math.sin(t * Math.PI) * 2)); prev = q; }
      ps.push(masa(cs, { mat, suave: 3 }));
      for (const s of [-1, 1]) pena(a, ps, [s * 34, az(a, 4), 0], [8, 7, 6], { mat, n: 4 });
      montonArena(ps, [0, 12, 2], [30, 10, 4], 0);
    }
    if (v === 'ventifacto') for (let i = 0; i < 4; i++) {
      // rocas aerodinámicas: largas, lisas del lado del viento y con aristas
      const p = i ? polar(a.r() * PI2, 14 + a.r() * 8) : [0, 0, 0] as V, L = i ? 7 + a.r() * 4 : 15;
      ps.push(masa([bulto([p[0], p[1], L * 0.35], [L * 1.4, L * 0.65, L * 0.5], { giro: 25 + az(a, 8) }), bulto([p[0] + L * 0.5, p[1] + L * 0.25, L * 0.45], [L * 0.6, L * 0.4, L * 0.55], { giro: 25, incl: 12 })], { mat, suave: 1.2 }));
    }
    if (v === 'columnas') for (let i = 0; i < 4; i++) {
      // chimeneas de hadas: columnas de capas con su piedra en la punta
      const p = i ? polar((i / 3) * PI2 + az(a, 0.4), 13) : [0, 0, 0] as V, H = (i ? 22 : 40) + a.r() * 12, cs: Comp[] = [];
      for (let k = 0; k < 4; k++) { const z = (k / 4) * H; cs.push(bulto([p[0] + az(a, 1), p[1] + az(a, 1), z + H * 0.12], [6 - k * 0.6 + (k % 2) * 1.2, 6 - k * 0.6 + (k % 2) * 1.2, H * 0.16])); }
      ps.push(masa(cs, { mat, suave: 2 }));
      pena(a, ps, [p[0], p[1], H * 0.92], [6, 5, 4], { mat: 'ext_roca', n: 3, hunde: 0 });
    }
    if (v === 'yardang') {
      // lomo largo con estrías a lo largo del viento
      const cs: Comp[] = [];
      for (let i = 0; i < 5; i++) { const t = i / 4; cs.push(bulto([-34 + t * 64, az(a, 2), 10 - t * 4], [16, 14 - t * 5, 16 - t * 8], { giro: az(a, 4) })); }
      ps.push(masa(cs, { mat, suave: 3 }));
      for (let k = 0; k < 3; k++) ps.push(a.palo([-40, -6 + k * 6, 6 + k], [24, -4 + k * 4, 6 + k * 0.5], 0.8, { mat: 'negro', tono: 0.15 }));
    }
    return ps;
  },
});

// ------------------------------------------------------------------ osamentas de bestias gigantes
reg({
  id: 'des2_osamenta', nombre: ['Osamenta de bestia gigante', 'Giant beast bones'], tema: 'desierto', variantes: ['costillar', 'craneo', 'columna', 'colmillo'], huella: [6, 4], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloD(a, ps, 56, 40);
    if (v === 'costillar') {
      costillar(a, ps, [-40, 0, 10], [36, 2, 14], 12, 30, { abre: 0.2 + a.r() * 0.3, rotas: 0.15, r: 2 });
      montonArena(ps, [-30, 10, 2], [26, 16, 7], 10); montonArena(ps, [20, -14, 2], [22, 14, 6], -20);
    }
    if (v === 'craneo') {
      // cráneo enorme con cuernos, medio enterrado
      const cs: Comp[] = [bulto([0, 0, 12], [22, 18, 16]), hueso([10, 0, 12], [44, 2, 6], 14, 7), bulto([30, 0, 2], [16, 13, 6], { tono: -0.05 })];
      for (const s of [-1, 1]) cs.push(bulto([6, s * 14, 16], [8, 4, 6]));
      ps.push(masa(cs, { mat: 'ext_hueso', suave: 4 }));
      for (const s of [-1, 1]) { ps.push(a.esfera(14, s * 12, 17, 5, { mat: 'negro' })); const b: V = [-6, s * 14, 24]; ps.push(masa([hueso(b, [-16, s * 30, 32], 5, 3.5), hueso([-16, s * 30, 32], [-8, s * 40, 50], 3.5, 0.6)], { mat: 'des2_cuerno', suave: 1.5 })); }
      ps.push(a.elipsoide(40, 0, 7, 3, 2, 3, { mat: 'negro' }));
      for (let i = 0; i < 6; i++) ps.push(a.palo([32 + i * 2.2, -8 + (i % 2) * 16, 4], [33 + i * 2.2, -8 + (i % 2) * 16, -1], 1.4, { mat: 'ext_hueso', r1: 0.4 }));
      montonArena(ps, [-10, 8, 2], [30, 22, 9], 30);
    }
    if (v === 'columna') {
      // vértebras enormes en fila que entran y salen de la arena
      for (let i = 0; i < 9; i++) {
        const t = i / 8, p: V = [-44 + t * 88, Math.sin(t * 4) * 8, 4 + Math.sin(t * Math.PI) * 6];
        ps.push(masa([bulto(p, [4, 7, 7]), hueso(mas(p, [0, 0, 3]), mas(p, [az(a, 1), az(a, 1), 16 - Math.abs(t - 0.5) * 10]), 2.4, 1), hueso(mas(p, [0, -4, 0]), mas(p, [0, -11, -2]), 2, 0.8), hueso(mas(p, [0, 4, 0]), mas(p, [0, 11, -2]), 2, 0.8)], { mat: 'ext_hueso', suave: 1.4, tono: az(a, 0.05) }));
      }
      for (let i = 0; i < 4; i++) montonArena(ps, [entre(a, -40, 40), az(a, 10), 1], [12, 10, 4], a.r() * 180);
    }
    if (v === 'colmillo') {
      for (const s of [-1, 1]) { const b: V = [-16, s * 10, 0]; let p = b; for (let i = 1; i <= 6; i++) { const t = i / 6, q: V = [-16 + t * 40, s * (10 + Math.sin(t * Math.PI) * 6), Math.sin(t * Math.PI * 0.8) * 34]; ps.push(masa([hueso(p, q, 6 - t * 4.5, 6 - (t + 1 / 6) * 4.5)], { mat: 'ext_hueso', suave: 1, tono: 0.05 })); p = q; } }
      montonArena(ps, [-16, 0, 2], [16, 22, 7], 0);
    }
    return ps;
  },
});

// ------------------------------------------------------------------ obeliscos y estelas
/** Fuste de obelisco: tronco de pirámide con su piramidión, en un marco. */
function obelisco(a: Arma, ps: Pieza[], H: number, w: number, m: ReturnType<typeof marco>, roto = 0) {
  const w1 = w * 0.62, h = roto ? H * roto : H;
  const P = (x: number, y: number, z: number) => m.T([x, y, z]);
  const wz = (z: number) => w + (w1 - w) * (z / H);
  const pts: V[] = [];
  for (const z of [0, h]) for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) pts.push(P(sx * wz(z) / 2, sy * wz(z) / 2, z));
  ps.push(a.poliedro(pts, { mat: 'des2_glifos', tono: az(a, 0.04) }));
  if (!roto) ps.push(a.poliedro([P(-w1 / 2, -w1 / 2, H), P(w1 / 2, -w1 / 2, H), P(w1 / 2, w1 / 2, H), P(-w1 / 2, w1 / 2, H), P(0, 0, H + w1 * 0.9)], { mat: 'des2_quitina_oro', tono: -0.1 }));
  else for (let i = 0; i < 4; i++) { const q = P(az(a, wz(h) * 0.35), az(a, wz(h) * 0.35), h); ps.push(a.poliedro([q, mas(q, [az(a, 3), az(a, 3), 3 + a.r() * 4]), mas(q, [az(a, 4), az(a, 4), 0]), mas(q, [az(a, 4), az(a, 4), 0])], { mat: 'des2_glifos' })); }
}
reg(
  {
    id: 'des2_obelisco', nombre: ['Obelisco medio enterrado', 'Half-buried obelisk'], tema: 'desierto', variantes: ['en_pie', 'inclinado', 'enterrado', 'roto'], huella: [2, 2], huellaPor: { roto: [5, 2] }, bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      sueloD(a, ps, 26, 24);
      const g = a.r() * 90, H = 96 + a.r() * 20;
      if (v === 'en_pie') { sillar(a, ps, 0, 0, -1, 24, 24, 7, g, 'arenisca'); obelisco(a, ps, H, 15, marco([0, 0, 5], g)); montonArena(ps, [4, 6, 2], [18, 12, 6], g + 30); }
      if (v === 'inclinado') { obelisco(a, ps, H, 15, marco([0, 0, -10], g, 16, 4)); montonArena(ps, [0, 0, 2], [20, 18, 9], g); }
      if (v === 'enterrado') { obelisco(a, ps, H, 16, marco([0, 0, -48], g, 6, 0)); montonArena(ps, [0, 0, 3], [24, 20, 11], g); montonArena(ps, [10, -8, 2], [14, 10, 6], g + 60); }
      if (v === 'roto') {
        obelisco(a, ps, H, 15, marco([-24, 0, -2], 0), 0.32);
        obelisco(a, ps, H * 0.6, 12, marco([-2, 4, 6], -5, 90, 0));
        for (let i = 0; i < 5; i++) sillar(a, ps, entre(a, -20, 30), entre(a, -14, 16), -1, 5 + a.r() * 5, 4 + a.r() * 3, 3 + a.r() * 3, a.r() * 180, 'arenisca_lisa');
        montonArena(ps, [10, 10, 2], [30, 10, 6], 0);
      }
      return ps;
    },
  },
  {
    id: 'des2_estela', nombre: ['Estela de jeroglíficos', 'Hieroglyph stele'], tema: 'desierto', variantes: ['entera', 'rota', 'enterrada', 'caida'], huella: [1, 1], huellaPor: { caida: [3, 2] }, bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      sueloD(a, ps, 18, 16);
      const g = 45 + az(a, 15), m = marco([0, 0, v === 'enterrada' ? -16 : -1], g, v === 'caida' ? 86 : az(a, 3), 0);
      const H = v === 'rota' ? 22 : 44;
      cajaM(a, ps, m, 0, 0, 0, 6, 22, H, 'des2_glifos');
      if (v !== 'rota') { const c = m.T([0, 0, H]); ps.push(masa([bulto(c, [3, 11, 5], { ejes: [m.D([1, 0, 0]), m.D([0, 1, 0]), m.D([0, 0, 1])] })], { mat: 'des2_glifos', suave: 1 })); ps.push(a.cilindro(...m.T([3.1, 0, H - 6]), 3.4, 0.8, { mat: 'des2_quitina_oro', eje: m.D([1, 0, 0]) })); }
      else for (let i = 0; i < 4; i++) sillar(a, ps, ...(polar(a.r() * PI2, 12 + a.r() * 5).slice(0, 2) as [number, number]), -1, 5 + a.r() * 3, 4, 3, a.r() * 180, 'des2_glifos');
      montonArena(ps, m.T([3, 0, 2]), [12, 14, v === 'enterrada' ? 8 : 4], g);
      return ps;
    },
  },
);

// ------------------------------------------------------------------ estatuas colosales
/** Cabeza colosal de faraón con tocado a rayas (en un marco: x hacia la cara, z arriba). */
function cabezaColosal(a: Arma, ps: Pieza[], m: ReturnType<typeof marco>, s: number, mat = 'des2_piedra_pulida', gastada = 0.3) {
  const T = (x: number, y: number, z: number) => m.T([x * s, y * s, z * s]);
  const E: [V, V, V] = [m.D([1, 0, 0]), m.D([0, 1, 0]), m.D([0, 0, 1])];
  const B = (c: V, r: V, o: { mat?: string; tono?: number } = {}) => bulto(c, [r[0] * s, r[1] * s, r[2] * s], { ejes: E, ...o });
  const cs: Comp[] = [
    B(T(0, 0, 14), [10, 9, 12]), B(T(6, 0, 7), [5, 7.5, 6]), B(T(9.4, 0, 12), [2.4, 1.7, 3.4]), B(T(8.2, 0, 6), [2.6, 3.8, 1.3], { tono: -0.05 }),
    B(T(7.2, 0, 2.5), [3.6, 4.6, 2.6]), B(T(8.5, 3.5, 16.5), [1.6, 2.6, 1], { tono: 0.03 }), B(T(8.5, -3.5, 16.5), [1.6, 2.6, 1], { tono: 0.03 }),
    // tocado: la tela que cae a los costados y la cofia
    B(T(-1, 0, 21), [11.5, 11, 6], { mat: 'des2_glifos' }), B(T(-1, 9.5, 8), [6, 3.5, 12], { mat: 'des2_glifos' }), B(T(-1, -9.5, 8), [6, 3.5, 12], { mat: 'des2_glifos' }),
    B(T(2, 10.8, 15), [2.4, 1.6, 3.4]), B(T(2, -10.8, 15), [2.4, 1.6, 3.4]),
  ];
  for (let i = 0; i < Math.round(gastada * 6); i++) cs.push(B(T(az(a, 9), az(a, 9), 6 + a.r() * 16), [2 + a.r() * 3, 2 + a.r() * 3, 2 + a.r() * 2], { tono: -0.12 }));
  ps.push(masa(cs, { mat, suave: 1.6 * s }));
  for (const sd of [-1, 1]) { const q = T(8.8, sd * 3.5, 13.5); ps.push(a.elipsoide(q[0], q[1], q[2], 1.2 * s, 2 * s, 1 * s, { mat: 'negro', tono: 0.15 })); }
  for (let k = 0; k < 5; k++) { const z = 17 + k * 1.6; ps.push(a.palo(T(9.2, -10, z), T(9.2, 10, z), 0.35 * s, { mat: 'negro', tono: 0.2 })); }
}
reg({
  id: 'des2_estatua_caida', nombre: ['Estatua colosal derribada', 'Toppled colossus'], tema: 'desierto', variantes: ['cabeza', 'torso', 'pies', 'mano'], huella: [5, 4], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloD(a, ps, 50, 40, { piedras: 3 });
    if (v === 'cabeza') {
      // la cabeza caída de costado, la nariz rota, medio tapada
      cabezaColosal(a, ps, marco([0, 0, 10], 30 + az(a, 20), 0, -72), 1.8, 'des2_piedra_pulida', 0.5);
      montonArena(ps, [-14, -10, 2], [30, 18, 9], 30);
      for (let i = 0; i < 4; i++) sillar(a, ps, entre(a, 10, 34), entre(a, 6, 26), -1, 4 + a.r() * 4, 3 + a.r() * 3, 3, a.r() * 180, 'des2_piedra_pulida');
    }
    if (v === 'torso') {
      // el torso tumbado de espaldas con los brazos cruzados sobre el pecho
      const m = marco([0, 0, 0], 20 + az(a, 15)), E: [V, V, V] = [m.D([1, 0, 0]), m.D([0, 1, 0]), m.D([0, 0, 1])];
      const cs: Comp[] = [bulto(m.T([0, 0, 14]), [26, 20, 13], { ejes: E }), bulto(m.T([20, 0, 12]), [8, 24, 10], { ejes: E }), bulto(m.T([4, 8, 26]), [14, 6, 4], { ejes: E, tono: 0.04 }), bulto(m.T([6, -8, 26]), [14, 6, 4], { ejes: E, tono: 0.04 }), bulto(m.T([-22, 0, 10]), [8, 16, 9], { ejes: E, tono: -0.05 })];
      ps.push(masa(cs, { mat: 'des2_piedra_pulida', suave: 4 }));
      ps.push(a.caja(...m.T([29, 0, 2]), 6, 26, 18, { mat: 'des2_piedra_pulida', giro: 20, tono: -0.1 }));
      for (let k = 0; k < 4; k++) ps.push(a.palo(m.T([-14 + k * 3, -18, 26]), m.T([-14 + k * 3, 18, 26]), 0.4, { mat: 'negro', tono: 0.2 }));
      montonArena(ps, m.T([-24, 0, 2]), [18, 26, 9], 20);
    }
    if (v === 'pies') {
      // en el pedestal solo quedan las piernas rotas a la altura de la rodilla
      sillar(a, ps, 0, 0, -1, 50, 34, 12, 0, 'des2_glifos', { jit: 1 });
      for (const s of [-1, 1]) {
        const x = s * 9;
        ps.push(masa([bulto([x + 6, s * 2, 15], [12, 6, 3.6]), hueso([x, s * 2, 14], [x + az(a, 1), s * 2, 40 + s * 6 + a.r() * 6], 6, 6.5), bulto([x, s * 2, 15], [5, 5, 3])], { mat: 'des2_piedra_pulida', suave: 2 }));
        const top: V = [x, s * 2, 40 + s * 6]; ps.push(a.poliedro([mas(top, [-6, -6, 0]), mas(top, [6, -6, 0]), mas(top, [6, 6, 0]), mas(top, [-6, 6, 0]), mas(top, [az(a, 3), az(a, 3), 5])], { mat: 'des2_piedra_pulida', tono: 0.05 }));
      }
      montonArena(ps, [20, 16, 2], [20, 14, 6], 45);
    }
    if (v === 'mano') {
      // mano gigante que sale de la arena con los dedos a medio cerrar
      const cs: Comp[] = [bulto([0, 0, 6], [14, 11, 8]), hueso([-14, 0, 0], [-6, 0, 6], 9, 9)];
      for (let i = 0; i < 4; i++) { const y = -7.5 + i * 5, b: V = [10, y, 10], c: V = [20, y + az(a, 1), 14 + a.r() * 6], d: V = [24 + a.r() * 2, y, 6 + a.r() * 6]; cs.push(hueso(b, c, 2.4, 2.2), hueso(c, d, 2.2, 1.9)); }
      cs.push(hueso([2, 10, 8], [10, 16, 16], 3, 2.5), hueso([10, 16, 16], [16, 15, 18], 2.5, 2.2));
      ps.push(masa(cs, { mat: 'des2_piedra_pulida', suave: 1.4 }));
      montonArena(ps, [-12, 0, 2], [20, 18, 8], 0);
    }
    return ps;
  },
});
reg({
  id: 'des2_esfinge', nombre: ['Esfinge erosionada', 'Eroded sphinx'], tema: 'desierto', variantes: ['entera', 'erosionada', 'enterrada'], huella: [7, 4], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloD(a, ps, 70, 44, { piedras: 3 });
    const m = marco([0, 0, v === 'enterrada' ? -14 : 0], 0), E: [V, V, V] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    if (v !== 'enterrada') sillar(a, ps, 0, 0, -1, 104, 44, 8, 0, 'des2_glifos', { jit: 1 });
    const z0 = v === 'enterrada' ? -14 : 7;
    const cs: Comp[] = [bulto([-14, 0, z0 + 16], [34, 15, 14], { ejes: E }), bulto([-38, 0, z0 + 12], [12, 15, 12], { ejes: E }), bulto([12, 0, z0 + 20], [12, 14, 17], { ejes: E })];
    // patas delanteras estiradas y traseras recogidas
    for (const s of [-1, 1]) cs.push(hueso([16, s * 8, z0 + 6], [46, s * 8, z0 + 4], 5.5, 4.5), bulto([47, s * 8, z0 + 3.5], [5, 4.5, 3.5], { ejes: E }), bulto([-34, s * 12, z0 + 7], [12, 4, 7], { ejes: E }));
    if (v === 'erosionada') for (let i = 0; i < 7; i++) cs.push(bulto([entre(a, -40, 20), az(a, 14), z0 + 10 + a.r() * 14], [4 + a.r() * 5, 4, 3 + a.r() * 3], { tono: -0.12 }));
    ps.push(masa(cs, { mat: v === 'erosionada' ? 'ext_estratos' : 'des2_piedra_pulida', suave: 4 }));
    cabezaColosal(a, ps, marco([20, 0, z0 + 28], 0), 1.25, v === 'erosionada' ? 'ext_estratos' : 'des2_piedra_pulida', v === 'erosionada' ? 1 : 0.2);
    if (v === 'enterrada') { montonArena(ps, [-20, 0, 2], [44, 24, 16], 0); montonArena(ps, [20, 18, 2], [30, 12, 8], 30); }
    else { montonArena(ps, [-30, 20, 2], [26, 10, 6], 10); for (let i = 0; i < 5; i++) sillar(a, ps, entre(a, -40, 50), entre(a, 24, 36), -1, 5 + a.r() * 5, 4, 3, a.r() * 180, 'des2_glifos'); }
    return ps;
  },
});
