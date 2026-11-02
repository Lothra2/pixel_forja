import { registrar, conVarianteY, type Arma, type Pieza } from '../objeto';
import { MATERIALES } from '../materiales';
import { ruido, hash3, hueso, bulto, masa, type Comp } from '../render';
import {
  PI2, az, entre, elegir, mas, nrm, polar, rad, grad, suelo, mata, pena, disco, llamas, chispas, humo,
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
M.des2_nemes = { rampa: ['#1d140c', '#30221a', '#463222', '#5d432e', '#76563a', '#8d6947', '#a47d56'], ruido: 0.15, escala: 0.2, patron: (p) => (Math.sin(p[2] * 1.5) > 0.2 ? 0.12 : -0.12) + (ruido(p[0] * 0.4, p[1] * 0.4, p[2] * 0.4) > 0.78 ? -0.15 : 0) };
M.des2_barro = { rampa: ['#1e0f09', '#33190f', '#4a2616', '#62341e', '#7a4427', '#925632'], ruido: 0.22, escala: 0.3, patron: (p) => (Math.sin(p[2] * 2.2) > 0.85 ? -0.12 : 0) };
M.des2_datil = { rampa: ['#1a0c06', '#2c150a', '#40200f', '#552c15', '#6b391c'], ruido: 0.5, escala: 1.2, brillo: 0.3 };
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
    // cáscara de la duna: el pie ondulado, la ladera de barlovento suave hacia -y y la cresta filosa corrida hacia +y,
    // con la cara de sotavento empinada (la arista de la cáscara es la cresta)
    const duna = (cx: number, cy: number, L: number, H: number, curva: number) => {
      const W = H * 4.2, pts: V[] = [];
      for (let i = 0; i < 18; i++) { const t = (i / 18) * PI2, k = 1 + az(a, 0.06); pts.push([cx + Math.cos(t) * L * 0.5 * k, cy + Math.sin(t) * W * 0.5 * k + (Math.sin(t) > 0 ? -curva * W * 0.15 * Math.cos(t) ** 2 : 0), 0]); }
      for (let i = 0; i <= 8; i++) { const t = (i / 8) * 2 - 1, h = H * (1 - t * t * 0.85); pts.push([cx + t * L * 0.4, cy + W * 0.22 - curva * W * 0.25 * t * t, h], [cx + t * L * 0.36, cy - W * 0.1, h * 0.68]); }
      ps.push(a.poliedro(pts, { mat: 'des2_arena', tono: az(a, 0.03) }));
      // el pie de la cara de sotavento, más oscuro (arena que se desliza)
      ps.push(masa([bulto([cx, cy + W * 0.32, 0], [L * 0.32, W * 0.12, H * 0.25])], { mat: 'des2_arena', suave: 2, tono: -0.06 }));
    };
    if (v === 'baja') duna(0, 0, 80, 12 + a.r() * 4, 0.6);
    if (v === 'alta') duna(0, -4, 90, 24 + a.r() * 6, 0.8);
    if (v === 'doble') { duna(-14, -10, 64, 16, 0.6); duna(18, 12, 56, 12, 0.7); }
    if (v === 'ondulada') { for (let k = 0; k < 4; k++) duna(az(a, 6), -27 + k * 18, 80 - k * 6, 4 + a.r() * 2, 0.4 + a.r() * 0.4); }
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
      if (v === 'enterrado') { obelisco(a, ps, H * 0.45, 11, marco([0, 0, -2], g, 7, 0)); montonArena(ps, [0, 0, 3], [24, 20, 11], g); montonArena(ps, [10, -8, 2], [14, 10, 6], g + 60); }
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
      const g = 45 + az(a, 15), m = marco([0, 0, v === 'caida' ? 3 : -1], g, v === 'caida' ? 86 : v === 'enterrada' ? 12 : az(a, 3), 0);
      const H = v === 'rota' ? 22 : v === 'enterrada' ? 26 : 44;
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
    B(T(-1, 0, 21), [11.5, 11, 6], { mat: 'des2_nemes' }), B(T(-1, 9.5, 8), [6, 3.5, 12], { mat: 'des2_nemes' }), B(T(-1, -9.5, 8), [6, 3.5, 12], { mat: 'des2_nemes' }), B(T(-6, 0, 6), [7, 9, 12], { mat: 'des2_nemes' }),
    B(T(7.6, 3.4, 13.4), [1.2, 2.2, 1], { tono: -0.25 }), B(T(7.6, -3.4, 13.4), [1.2, 2.2, 1], { tono: -0.25 }),
    B(T(2, 10.8, 15), [2.4, 1.6, 3.4]), B(T(2, -10.8, 15), [2.4, 1.6, 3.4]),
  ];
  for (let i = 0; i < Math.round(gastada * 6); i++) cs.push(B(T(az(a, 9), az(a, 9), 6 + a.r() * 16), [2 + a.r() * 3, 2 + a.r() * 3, 2 + a.r() * 2], { tono: -0.12 }));
  ps.push(masa(cs, { mat, suave: 1.6 * s }));
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
    const E: [V, V, V] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    if (v !== 'enterrada') sillar(a, ps, 0, 0, -1, 104, 44, 8, 0, 'des2_glifos', { jit: 1 });
    const z0 = v === 'enterrada' ? -5 : 7;
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

// ------------------------------------------------------------------ tiendas nómadas
reg({
  id: 'des2_tienda', nombre: ['Tienda beduina', 'Bedouin tent'], tema: 'desierto', variantes: ['beduina', 'harapienta', 'con_alfombra', 'derrumbada'], huella: [5, 4], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloD(a, ps, 50, 40);
    const X = 34, Y = 22, mad = 'madera_vieja', caida = v === 'derrumbada';
    const lana = v === 'harapienta' ? ['des2_lana_negra', 'ext_tela_sucia', 'des2_lana_negra'] : ['des2_lana_negra', 'des2_lana_negra', 'cu_tela_parda'];
    // postes en tres filas: el del medio más alto (la lona se comba entre ellos)
    const alto = (x: number, y: number) => (Math.abs(y) < 1 ? 30 : 22) - (caida ? Math.max(0, x) * 0.55 : 0) - (Math.abs(x) > X - 2 ? 3 : 0);
    for (const x of [-X, 0, X]) for (const y of [-Y, 0, Y]) { if (caida && x > 0 && y !== 0) continue; ps.push(a.cilindro(x, y, -1, 1.1, alto(x, y) + 1, { mat: mad })); }
    // la lona: paños entre filas con comba en el medio y bordes que bajan
    const n = 6, m4 = 4;
    for (let i = 0; i < n; i++) for (let j = 0; j < m4; j++) {
      if (v === 'harapienta' && a.r() < 0.15) continue;
      const x0 = -X - 3 + (i / n) * (2 * X + 6), x1 = x0 + (2 * X + 6) / n, y0 = -Y - 4 + (j / m4) * (2 * Y + 8), y1 = y0 + (2 * Y + 8) / m4;
      const z = (x: number, y: number) => { const comba = 2.5 * Math.cos((x / X) * Math.PI) ** 2; return Math.max(1, alto(Math.min(X, Math.max(-X, x)), Math.abs(y) < 1 ? 0 : y) * (1 - Math.max(0, Math.abs(y) - 0) / (Y + 6) * 0.35) - comba + (Math.abs(y) > Y ? -(Math.abs(y) - Y) * 1.6 : 0)); };
      const P: V[] = [];
      for (const x of [x0, x1]) for (const y of [y0, y1]) P.push([x, y, z(x, y)], [x, y, z(x, y) + 0.9]);
      ps.push(a.poliedro(P, { mat: elegir(a, lana), tono: az(a, 0.05) }));
    }
    // vientos con estacas
    for (const x of [-X, 0, X]) for (const s of [-1, 1]) ps.push(a.palo([x, s * (Y + 4), 18], [x + az(a, 3), s * (Y + 16), 0], 0.3, { mat: 'cuerda' }), a.palo([x, s * (Y + 16), 2], [x, s * (Y + 17), -1], 0.6, { mat: mad }));
    // cortina de un costado y la boca abierta al frente
    for (let i = 0; i < 6; i++) { const x = -X + i * (X * 2 / 5); if (i > 2 && v !== 'derrumbada') continue; ps.push(a.caja(x, -Y - 3.5, 0, X * 2 / 5 + 0.5, 1, 17 + az(a, 2), { mat: elegir(a, lana), tono: -0.05 })); }
    if (v === 'con_alfombra' || v === 'beduina') {
      ps.push(a.caja(0, 8, 0, 36, 22, 0.8, { mat: 'des2_alfombra', giro: az(a, 6) }), a.caja(-4, 26, 0, 22, 14, 0.7, { mat: 'des2_alfombra', giro: 20, tono: -0.1 }));
      for (let i = 0; i < 4; i++) ps.push(a.elipsoide(-14 + i * 9, -6 + az(a, 2), 3, 4.5, 3, 3, { mat: elegir(a, ['tela_roja', 'tela', 'tela_azul']), giro: a.r() * 90 }));
      ps.push(a.cilindro(12, 12, 0.6, 4, 3, { mat: 'bronce', r1: 5 }), a.cilindro(16, 6, 0.6, 2, 8, { mat: 'bronce', r1: 1 }), a.esfera(16, 6, 9, 1.8, { mat: 'bronce' }));
    }
    if (v === 'derrumbada') for (let i = 0; i < 3; i++) ps.push(a.palo([entre(a, 0, 30), entre(a, -20, 20), 1.2], [entre(a, 10, 40), entre(a, -20, 20), 1.5], 1.1, { mat: mad }));
    return ps;
  },
});

// ------------------------------------------------------------------ camellos muertos y caravanas
reg({
  id: 'des2_camello_muerto', nombre: ['Camello muerto', 'Dead camel'], tema: 'desierto', variantes: ['tendido', 'podrido', 'con_carga', 'con_buitres', 'momificado'], huella: [4, 3], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloD(a, ps, 44, 34);
    const g = a.r() * 360;
    if (v === 'momificado') {
      // ya solo cuero pegado al hueso: costillar a la vista y el cuello estirado
      costillar(a, ps, polar(rad(g), -16, 7), polar(rad(g), 12, 8), 9, 10, { abre: 0.3, mat: 'ext_cuero_seco', r: 1.1 });
      craneo(a, ps, ...(polar(rad(g + 20), 30, 3) as V), 1.4, rad(g));
      for (let i = 0; i < 4; i++) huesoLargo(ps, polar(rad(g + 90 + i * 30), 14, 1), polar(rad(g + 70 + i * 30), 30, 1), 1.1);
      montonArena(ps, polar(rad(g + 180), 10, 2), [20, 12, 6], g);
      return ps;
    }
    bestiaMuerta(a, ps, 'camello', [0, 0, 0], g, { podrida: v === 'podrido' ? 1 : 0, carga: v === 'con_carga' });
    montonArena(ps, polar(rad(g - 90), 18, 2), [24, 8, 5], g);
    if (v === 'con_buitres') { buitre(a, ps, polar(rad(g + 70), 24, 0), rad(g + 250), 1.4, 1); buitre(a, ps, polar(rad(g + 140), 26, 0), rad(g + 320), 1.3, 0); buitre(a, ps, polar(rad(g), 4, 17), rad(g + 90), 1.2, 0); }
    if (v === 'podrido') for (let i = 0; i < 3; i++) ave(a, ps, polar(a.r() * PI2, 24, 0), a.r() * PI2, 0.9, 'picando');
    return ps;
  },
});

reg({
  id: 'des2_caravana', nombre: ['Caravana perdida', 'Lost caravan'], tema: 'desierto', variantes: ['emboscada', 'abandonada', 'enterrada'], huella: [7, 5], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloD(a, ps, 70, 50, { piedras: 2 });
    const enterrada = v === 'enterrada';
    bestiaMuerta(a, ps, 'camello', [-30, -20, 0], 10 + az(a, 30), { carga: true, podrida: v === 'abandonada' ? 0.8 : 0 });
    bestiaMuerta(a, ps, 'camello', [32, 16, 0], 200 + az(a, 30), { carga: a.r() < 0.5, podrida: enterrada ? 0 : 0.3 });
    // fardos, tinajas rotas, alfombras y cajas desparramadas
    const lugares: [number, number][] = [[-4, 30], [8, -30], [52, 34], [-52, 22], [-14, 4], [54, -18]];
    lugares.forEach(([x, y], i) => {
      const k = i % 3;
      if (k === 0) ps.push(a.elipsoide(x + az(a, 3), y + az(a, 3), 4, 7, 5, 4.5, { mat: elegir(a, ['ext_tela_sucia', 'tela', 'des2_lana_negra']), giro: a.r() * 180 }));
      if (k === 1) { ps.push(a.cilindro(x, y, 5, 4.5, 12, { mat: 'des2_barro', eje: [Math.cos(i), Math.sin(i), 0.2], r1: 2.5 })); }
      if (k === 2) ps.push(a.cilindro(x, y, 3, 3, 24, { mat: 'des2_alfombra', eje: [Math.cos(i * 2), Math.sin(i * 2), 0] }));
    });
    if (v === 'emboscada') {
      for (const [x, y] of [[-6, 34], [46, -18], [-54, 2]] as [number, number][]) cadaver(a, ps, 'nomada', [x + az(a, 4), y + az(a, 4), 0], a.r() * 360, { sangre: 0.8, flechas: Math.floor(a.r() * 3) });
      for (let i = 0; i < 5; i++) { const p: V = [entre(a, -50, 50), entre(a, -30, 30), 0]; ps.push(a.palo(p, mas(p, [az(a, 8), az(a, 8), 26]), 0.6, { mat: 'madera_lisa' })); }
      for (let i = 0; i < 6; i++) flecha(a, ps, [entre(a, -50, 50), entre(a, -30, 30), 0], [az(a, 0.5), az(a, 0.5), 1], 11);
    }
    if (v === 'abandonada') { cadaver(a, ps, 'nomada', [8, 22, 0], a.r() * 360, { huesos: true }); buitre(a, ps, [-14, 14, 0], 2, 1.3, 1); }
    if (enterrada) { for (let i = 0; i < 4; i++) montonArena(ps, [entre(a, -40, 40), entre(a, -20, 20), 2], [22, 14, 9], a.r() * 180); cadaver(a, ps, 'nomada', [30, -20, 0], 30, { huesos: true }); }
    return ps;
  },
});

// ------------------------------------------------------------------ pozos secos y oasis
reg({
  id: 'des2_pozo_seco', nombre: ['Pozo seco', 'Dry well'], tema: 'desierto', variantes: ['piedra', 'derrumbado', 'con_cuerda', 'tapiado'], huella: [2, 2], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloD(a, ps, 24, 22);
    const R = 11, n = 10;
    ps.push(a.cilindro(0, 0, -1, R - 2, 10, { mat: 'negro' }));
    for (let fila = 0; fila < 3; fila++) for (let i = 0; i < n; i++) {
      const t = ((i + (fila % 2) * 0.5) / n) * PI2;
      if (v === 'derrumbado' && fila > 0 && Math.cos(t - 0.6) > 0.1 - fila * 0.3) continue;
      sillar(a, ps, Math.cos(t) * R, Math.sin(t) * R, fila * 4.4 - 1, (PI2 * R) / n - 0.4, 5, 4.2, grad(t) + 90, 'arenisca', { jit: 0.7 });
    }
    if (v === 'derrumbado') for (let i = 0; i < 7; i++) sillar(a, ps, ...(polar(0.6 + az(a, 0.6), R + 4 + a.r() * 8).slice(0, 2) as [number, number]), -1, 5, 4, 4, a.r() * 180, 'arenisca', { incl: az(a, 20) });
    if (v === 'tapiado') { ps.push(a.cilindro(0, 0, 11.5, R - 1, 2, { mat: 'madera_vieja' })); for (let i = 0; i < 3; i++) ps.push(a.caja(az(a, 4), -6 + i * 6, 13.4, 22, 5, 1.2, { mat: 'madera_vieja', giro: az(a, 8) })); pena(a, ps, [2, 1, 14], [5, 4, 4], { mat: 'ext_estratos', n: 3, hunde: 0 }); }
    if (v === 'con_cuerda' || v === 'piedra') {
      // palos en horqueta con el travesaño y la cuerda que entra
      for (const s of [-1, 1]) ps.push(a.palo([0, s * (R + 1), -1], [0, s * (R - 1), 26], 1.2, { mat: 'madera_vieja' }), a.palo([0, s * (R - 1), 24], [s * 2, s * (R - 2), 29], 0.7, { mat: 'madera_vieja' }));
      ps.push(a.palo([0, -R - 1, 25], [0, R + 1, 25], 0.9, { mat: 'madera_vieja' }));
      if (v === 'con_cuerda') { ps.push(a.palo([0, 1, 25], [0, 1, 3], 0.35, { mat: 'cuerda' })); ps.push(a.cilindro(R + 6, 4, 0.2, 3, 4, { mat: 'cuero', r1: 3.6, eje: [0.9, 0.1, 0.3] })); }
    }
    montonArena(ps, [R * 0.8, R * 0.8, 2], [14, 8, 4], 45);
    return ps;
  },
});

/** Palmera: tronco de masa con anillos que se curva, copa de pencas que caen y los dátiles. */
function palmera(a: Arma, ps: Pieza[], b: V, H: number, curva: number, g: number, o: { seca?: boolean; quebrada?: boolean; pencas?: number } = {}) {
  const d: V = [Math.cos(g), Math.sin(g), 0], n = 6, cs: Comp[] = [bulto(mas(b, [0, 0, 2]), [6, 6, 4])];
  let p: V = b;
  const tope = o.quebrada ? 0.55 : 1;
  for (let i = 1; i <= n; i++) {
    const t = (i / n) * tope, q: V = [b[0] + d[0] * curva * t * t, b[1] + d[1] * curva * t * t, H * t];
    cs.push(hueso(p, q, 4 - 1.6 * ((i - 1) / n), 4 - 1.6 * (i / n)));
    p = q;
  }
  ps.push(masa(cs, { mat: 'des2_tronco_palma', suave: 1.5 }));
  if (o.quebrada) { for (let i = 0; i < 4; i++) ps.push(a.palo(p, mas(p, [az(a, 2), az(a, 2), 3 + a.r() * 3]), 1.2, { mat: 'des2_tronco_palma', r1: 0.2 })); const caido = mas(b, [Math.cos(g + 1) * 10, Math.sin(g + 1) * 10, 3]); ps.push(masa([hueso(caido, mas(caido, [Math.cos(g + 1) * 40, Math.sin(g + 1) * 40, 0]), 3, 2.4)], { mat: 'des2_tronco_palma', suave: 1 })); return; }
  const top = p, seca = !!o.seca, N = o.pencas ?? (seca ? 8 : 12);
  ps.push(a.esfera(top[0], top[1], top[2], 3.4, { mat: 'des2_tronco_palma', tono: -0.05 }));
  if (!seca) for (let k = 0; k < 3; k++) { const t = a.r() * PI2; ps.push(a.elipsoide(top[0] + Math.cos(t) * 3.4, top[1] + Math.sin(t) * 3.4, top[2] - 4, 2.4, 2.4, 3.6, { mat: 'des2_datil' })); }
  for (let k = 0; k < N; k++) {
    // penca: tres tramos que se doblan, angostos en las puntas, con el borde aserrado (tonos alternos)
    const t = (k / N) * PI2 + a.r() * 0.4, L = (seca ? 26 : 36) + a.r() * 10, sube = seca ? -0.4 : 0.45 + a.r() * 0.3, cae = seca ? 0.9 : 0.55 + a.r() * 0.3;
    let q = top, e = sube;
    const mat = seca ? 'des2_palma_seca' : a.r() < 0.15 ? 'des2_palma_seca' : 'des2_palma';
    for (let j = 0; j < 3; j++) {
      const l = L / 3, nq: V = [q[0] + Math.cos(t) * Math.cos(e) * l, q[1] + Math.sin(t) * Math.cos(e) * l, q[2] + Math.sin(e) * l];
      const w0 = [1.6, 7.5, 5.6][j], w1 = [7.5, 5.6, 0.8][j], nx = -Math.sin(t), ny = Math.cos(t), cv = j === 0 ? 0 : 0.9;
      ps.push(a.poliedro([[q[0] + nx * w0 / 2, q[1] + ny * w0 / 2, q[2] - cv], [q[0] - nx * w0 / 2, q[1] - ny * w0 / 2, q[2] - cv], [nq[0] + nx * w1 / 2, nq[1] + ny * w1 / 2, nq[2] - cv], [nq[0] - nx * w1 / 2, nq[1] - ny * w1 / 2, nq[2] - cv], q, nq], { mat, tono: az(a, 0.06) - j * 0.03 }));
      q = nq; e -= cae;
    }
  }
  // pencas secas colgando bajo la copa
  for (let k = 0; k < (seca ? 7 : 3); k++) { const t = a.r() * PI2, q = mas(top, [Math.cos(t) * 2.5, Math.sin(t) * 2.5, -1]); ps.push(a.palo(q, mas(q, [Math.cos(t) * 3, Math.sin(t) * 3, -14 - a.r() * 8]), 1.3, { mat: 'des2_palma_seca', r1: 0.4, tono: -0.1 })); }
}
reg({
  id: 'des2_palmera', nombre: ['Palmera del oasis', 'Oasis palm'], tema: 'desierto', variantes: ['viva', 'muerta', 'quebrada', 'joven', 'grupo'], huella: [2, 2], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloD(a, ps, 20, 18, { matas: 3 });
    const g = a.r() * PI2;
    if (v === 'viva') palmera(a, ps, [0, 0, 0], 100 + a.r() * 24, 14 + a.r() * 16, g);
    if (v === 'muerta') palmera(a, ps, [0, 0, 0], 86 + a.r() * 16, 18, g, { seca: true });
    if (v === 'quebrada') palmera(a, ps, [0, 0, 0], 80, 8, g, { quebrada: true });
    if (v === 'joven') { palmera(a, ps, [0, 0, 0], 34 + a.r() * 8, 4, g, { pencas: 9 }); for (let i = 0; i < 2; i++) mata(a, ps, az(a, 10), az(a, 10), 6, 12, 'des2_palma'); }
    if (v === 'grupo') { palmera(a, ps, [-6, 4, 0], 110, 22, g, {}); palmera(a, ps, [6, -4, 0], 84, 26, g + 2.2, { pencas: 10 }); palmera(a, ps, [8, 9, 0], 30, 6, g + 1, { pencas: 8 }); }
    return ps;
  },
});

reg({
  id: 'des2_oasis', nombre: ['Oasis', 'Oasis'], tema: 'desierto', variantes: ['chico', 'grande', 'seco'], cuadros: 6, t: 4, huella: [7, 6], bloquea: true,
  armar: (v, f, a) => {
    const ps: Pieza[] = [];
    sueloD(a, ps, 64, 54, { matas: 6 });
    const R = v === 'grande' ? 34 : 24, seco = v === 'seco';
    // orilla de pasto y barro y el agua quieta con destellos que titilan
    ps.push(a.elipsoide(0, 0, 0, R + 9, R * 0.75 + 8, 1.8, { mat: seco ? 'ext_barro' : 'ext_pasto', tono: -0.05 }));
    disco(a, ps, 0, 0, 0, R + 3, R * 0.75 + 2.5, 1.4, 'ext_barro', { ruido: 0.1 });
    if (seco) { disco(a, ps, 0, 0, 0.2, R, R * 0.75, 1.3, 'des2_arena_osc', { ruido: 0.1 }); for (let i = 0; i < 14; i++) { const p = polar(a.r() * PI2, a.r() * R * 0.8); ps.push(a.palo([p[0], p[1], 1.6], [p[0] + az(a, 8), p[1] + az(a, 6), 1.6], 0.25, { mat: 'negro', tono: 0.15 })); } }
    else {
      disco(a, ps, 0, 0, 0.2, R, R * 0.75, 1.3, 'agua', { ruido: 0.1, n: 18 });
      for (let i = 0; i < 6; i++) { const p = polar(i * 2.1 + 0.3, R * 0.5 * ((i * 0.37) % 1 + 0.2)), u = Math.sin((f / 6) * PI2 + i * 1.7); if (u > 0.2) ps.push(a.elipsoide(p[0], p[1] * 0.75, 1.6, 2.5 * u, 0.5, 0.1, { mat: 'ext_espuma', tono: 0.1 })); }
      for (let i = 0; i < 4; i++) { const p = polar(a.r() * PI2, R * 0.6); ps.push(a.cilindro(p[0], p[1] * 0.75, 1.5, 3, 0.4, { mat: 'hojas_selva' })); }
      for (let i = 0; i < 5; i++) { const t = a.r() * PI2; const p = polar(t, R + 2); for (let k = 0; k < 6; k++) ps.push(a.palo([p[0] + az(a, 3), p[1] * 0.78 + az(a, 3), 0], [p[0] + az(a, 5), p[1] * 0.78 + az(a, 5), 10 + a.r() * 8], 0.55, { mat: 'ext_pasto', r1: 0.2 })); }
    }
    // palmeras de la orilla
    const np = v === 'grande' ? 4 : 2;
    for (let i = 0; i < np; i++) { const t = (i / np) * PI2 + az(a, 0.6) + 2.4, p = polar(t, R + 10); palmera(a, ps, [p[0], p[1] * 0.85, 0], 80 + a.r() * 30, 14 + a.r() * 14, t + Math.PI, { seca: seco || a.r() < 0.15 }); }
    return ps;
  },
});

// ------------------------------------------------------------------ columnas en ruinas
/** Columna estriada de tambores con basa y capitel; `h` cuántos tambores en pie. */
function columna(a: Arma, ps: Pieza[], x: number, y: number, n: number, capitel: boolean, o: { r?: number; desde?: number } = {}) {
  const r = o.r ?? 6.5, hz = 11;
  if ((o.desde ?? 0) === 0) { ps.push(a.caja(x, y, -1, r * 2.6, r * 2.6, 4, { mat: 'arenisca', giro: az(a, 3) })); ps.push(a.cilindro(x, y, 3, r * 1.25, 3, { mat: 'arenisca_lisa', r1: r * 1.05 })); }
  for (let i = 0; i < n; i++) { const z = 6 + i * hz, dx = az(a, 0.5), dy = az(a, 0.5); ps.push(a.cilindro(x + dx, y + dy, z, r - i * 0.15, hz - 0.3, { mat: 'des2_estrias', r1: r - (i + 1) * 0.15, tono: az(a, 0.05) })); }
  const top = 6 + n * hz;
  if (capitel) { ps.push(a.cilindro(x, y, top, r - n * 0.15, 3, { mat: 'arenisca_lisa', r1: r * 1.6 })); ps.push(a.caja(x, y, top + 3, r * 3.3, r * 3.3, 4, { mat: 'arenisca', giro: az(a, 3) })); }
  else for (let i = 0; i < 3; i++) { const t = a.r() * PI2; ps.push(a.poliedro([[x + Math.cos(t) * r, y + Math.sin(t) * r, top], [x + Math.cos(t + 1.2) * r, y + Math.sin(t + 1.2) * r, top], [x, y, top], [x + Math.cos(t + 0.6) * r * 0.6, y + Math.sin(t + 0.6) * r * 0.6, top + 3 + a.r() * 4]], { mat: 'des2_estrias' })); }
  return top;
}
reg({
  id: 'des2_columnas', nombre: ['Columnas en ruinas', 'Ruined columns'], tema: 'desierto', variantes: ['en_pie', 'quebrada', 'caida', 'capitel', 'portico'], huella: [2, 2], huellaPor: { caida: [5, 2], portico: [5, 2] }, bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloD(a, ps, v === 'caida' || v === 'portico' ? 48 : 22, 20);
    if (v === 'en_pie') columna(a, ps, 0, 0, 7, true);
    if (v === 'quebrada') { columna(a, ps, 0, 0, 2 + Math.floor(a.r() * 3), false); for (let i = 0; i < 3; i++) { const t = a.r() * PI2; ps.push(a.cilindro(Math.cos(t) * 14, Math.sin(t) * 14, 6, 6, 10.5, { mat: 'des2_estrias', eje: [Math.cos(t + 1), Math.sin(t + 1), 0.05] })); } }
    if (v === 'capitel') { columna(a, ps, -8, 0, 1, false); ps.push(a.cilindro(12, 6, 0, 10, 4, { mat: 'arenisca_lisa', r1: 6, eje: [0.3, 0.2, 1] }), a.caja(12, 6, -1, 21, 21, 4, { mat: 'arenisca', giro: 20, incl: 8 })); }
    if (v === 'caida') {
      columna(a, ps, -30, 0, 1, false);
      // los tambores rodados en fila, separados por la caída
      for (let i = 0; i < 6; i++) { const x = -18 + i * 11 + az(a, 1.5), y = az(a, 2) + i * 0.8; ps.push(a.cilindro(x, y, 5.6, 6, 10.5, { mat: 'des2_estrias', eje: [1, az(a, 0.15), 0.02] })); }
      ps.push(a.caja(52, 6, -1, 21, 21, 4, { mat: 'arenisca', giro: 15, incl: 25 }));
    }
    if (v === 'portico') { columna(a, ps, -26, 0, 6, true); columna(a, ps, 26, 0, 4, false); ps.push(a.caja(-14, 0, 76, 40, 15, 9, { mat: 'des2_glifos', incl: 3 })); }
    montonArena(ps, [6, 8, 2], [16, 10, 5], 30);
    return ps;
  },
});

// ------------------------------------------------------------------ escarabajos animados
/** Escarabajo de masa caminando (seis patas en trípode alterno) hacia `g`; `s` 1 mide unos 6 de largo. */
function escarabajo(a: Arma, ps: Pieza[], p: V, g: number, s: number, f: number, nc: number, mat = 'des2_quitina') {
  const d: V = [Math.cos(g), Math.sin(g), 0], l: V = [-d[1], d[0], 0];
  const P = (fw: number, rt: number, up: number): V => mas(mas(mas(p, d, fw * s), l, rt * s), [0, 0, up * s]);
  ps.push(masa([
    bulto(P(-0.6, 0, 1.7), [2.6 * s, 2 * s, 1.35 * s], { eje: d }), bulto(P(1.9, 0, 1.4), [1 * s, 1.5 * s, 0.9 * s], { eje: d, tono: -0.05 }), bulto(P(2.9, 0, 1.1), [0.7 * s, 1.1 * s, 0.6 * s], { eje: d, tono: -0.1 }),
  ], { mat, suave: 0.35 * s }));
  ps.push(a.palo(P(-3, 0, 2.9), P(1.2, 0, 2.9), 0.12 * s, { mat: 'negro', tono: 0.2 }));
  for (const sd of [-1, 1]) ps.push(a.palo(P(3.3, sd * 0.5, 1.2), P(3.9, sd * 1.2, 1.5), 0.2 * s, { mat: 'negro' }));
  // patas: cada trípode avanza mientras el otro apoya
  for (let i = 0; i < 3; i++) for (const sd of [-1, 1]) {
    const grupo = (i + (sd > 0 ? 1 : 0)) % 2, fase = Math.sin((f / nc) * PI2 + grupo * Math.PI), x0 = 1 - i * 1.3;
    const cad = P(x0, sd * 1, 1.1), rod = P(x0 + fase * 0.5, sd * 2.6, 1.8 + Math.max(0, fase) * 0.5), pie = P(x0 + fase * 0.9 + (i - 1) * 0.6, sd * 3.6, 0.1 + Math.max(0, fase) * 0.4);
    ps.push(a.palo(cad, rod, 0.22 * s, { mat: 'negro' }), a.palo(rod, pie, 0.18 * s, { mat: 'negro' }));
  }
}
reg({
  id: 'des2_escarabajos', nombre: ['Escarabajos', 'Scarabs'], tema: 'desierto', variantes: ['uno', 'grupo', 'dorado', 'gigante'], cuadros: 6, t: 2, huella: [1, 1], huellaPor: { gigante: [2, 2] }, bloquea: false,
  armar: (v, f, a) => {
    const ps: Pieza[] = [];
    // las huellas en la arena y los bichos que la cruzan en círculo
    disco(a, ps, 0, 0, -0.3, v === 'gigante' ? 22 : 14, v === 'gigante' ? 18 : 11, 1.2, 'des2_arena', { ruido: 0.15 });
    if (v === 'gigante') { escarabajo(a, ps, [Math.cos((f / 6) * 0.6) * 3, Math.sin((f / 6) * 0.6) * 3, 0], 0.9 + (f / 6) * 0.6, 4.2, f, 6, 'des2_quitina'); return ps; }
    const n = v === 'grupo' ? 5 : 1;
    for (let i = 0; i < n; i++) {
      const R = n === 1 ? 4 : 5 + a.r() * 7, fase = a.r() * PI2, sentido = a.r() < 0.5 ? 1 : -1, t = fase + sentido * (f / 6) * 0.9;
      escarabajo(a, ps, [Math.cos(t) * R, Math.sin(t) * R, 0], t + sentido * Math.PI / 2, v === 'dorado' ? 1.9 : 1.3 + a.r() * 0.3, f + i, 6, v === 'dorado' ? 'des2_quitina_oro' : 'des2_quitina');
    }
    if (v === 'grupo') { craneo(a, ps, 2, -3, 2.6, 0.8, 1); }
    return ps;
  },
});

// ------------------------------------------------------------------ cactus y matas
reg({
  id: 'des2_cactus', nombre: ['Cactus', 'Cactus'], tema: 'desierto', variantes: ['saguaro', 'candelabro', 'nopal', 'seco', 'florido'], huella: [1, 1], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloD(a, ps, 14, 12, { matas: 1 });
    const mat = v === 'seco' ? 'des2_palma_seca' : 'des2_cacto';
    const brazo = (cs: Comp[], b: V, lado: V, sale: number, sube: number, r: number) => { const c = mas(b, lado, sale); cs.push(hueso(b, c, r, r * 0.95), hueso(c, mas(c, [0, 0, sube]), r * 0.95, r * 0.85), bulto(mas(c, [0, 0, sube]), [r * 0.85, r * 0.85, r * 0.9])); return mas(c, [0, 0, sube]); };
    const puntas: V[] = [];
    if (v === 'saguaro' || v === 'seco' || v === 'florido') {
      const H = 46 + a.r() * 16, cs: Comp[] = [hueso([0, 0, -1], [az(a, 1), az(a, 1), H], 4.4, 4), bulto([0, 0, H], [4, 4, 4.2])];
      puntas.push([0, 0, H + 4]);
      const nb = v === 'seco' ? 1 : 2;
      for (let i = 0; i < nb; i++) { const t = a.r() * PI2 + i * Math.PI; puntas.push(brazo(cs, [0, 0, H * (0.35 + a.r() * 0.2)], [Math.cos(t), Math.sin(t), 0], 8 + a.r() * 2, 10 + a.r() * 10, 2.9)); }
      ps.push(masa(cs, { mat, suave: 1.6 }));
      if (v === 'seco') { for (let i = 0; i < 4; i++) ps.push(a.palo([az(a, 3), az(a, 3), 10 + i * 9], [az(a, 3) * 2, az(a, 3) * 2, 12 + i * 9], 0.35, { mat: 'negro', tono: 0.2 })); ps.push(a.elipsoide(3, 0, H * 0.6, 3.6, 3, 5, { mat: 'negro', resta: true })); }
    }
    if (v === 'candelabro') {
      const cs: Comp[] = [bulto([0, 0, 4], [5, 5, 5])];
      for (let i = 0; i < 5; i++) { const t = (i / 5) * PI2 + a.r() * 0.4, h = 22 + a.r() * 16, b: V = polar(t, 3.5, 4), c: V = polar(t, 7, 10); cs.push(hueso(b, c, 2.8, 2.6), hueso(c, mas(c, [az(a, 1), az(a, 1), h]), 2.6, 2.3), bulto(mas(c, [0, 0, h]), [2.3, 2.3, 2.4])); puntas.push(mas(c, [0, 0, h + 2])); }
      ps.push(masa(cs, { mat, suave: 1.2 }));
    }
    if (v === 'nopal') {
      // pencas planas que salen unas de otras
      const pala = (p: V, g: number, inc: number, k: number) => { ps.push(masa([bulto(p, [5.5, 1.5, 7], { giro: g, incl: inc })], { mat, suave: 0.5, tono: az(a, 0.06) })); puntas.push(mas(p, [0, 0, 7])); if (k > 0) for (const s of [-1, 1]) if (a.r() < 0.8) pala(mas(p, [Math.cos(rad(g)) * s * 4, Math.sin(rad(g)) * s * 4, 10]), g + az(a, 40), s * 20 + az(a, 15), k - 1); };
      pala([0, 0, 6], a.r() * 180, 0, 2);
    }
    // espinas y flores (o frutos)
    for (let i = 0; i < (v === 'nopal' ? 6 : 10); i++) { const p = elegir(a, puntas); ps.push(a.palo(mas(p, [az(a, 3), az(a, 3), -2 - a.r() * 10]), mas(p, [az(a, 5), az(a, 5), -2 - a.r() * 10]), 0.15, { mat: 'ext_hueso' })); }
    if (v === 'florido' || v === 'nopal') for (const p of puntas) ps.push(a.esfera(p[0] + az(a, 1), p[1] + az(a, 1), p[2] + 0.8, 1.6, { mat: v === 'florido' ? 'tela_roja' : 'des2_alfombra', tono: 0.15 }));
    return ps;
  },
});

reg({
  id: 'des2_arbusto', nombre: ['Mata del desierto', 'Desert shrub'], tema: 'desierto', variantes: ['tamarisco', 'espinoso', 'rodante', 'seco'], huella: [1, 1], bloquea: false,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    if (v !== 'rodante') sueloD(a, ps, 14, 12, { matas: 1 });
    if (v === 'rodante') {
      // planta rodadora: ovillo de ramitas
      ps.push(a.elipsoide(0, 0, -0.3, 12, 9, 1, { mat: 'des2_arena', tono: -0.05 }));
      for (let i = 0; i < 30; i++) { const u1 = a.r() * PI2, v1 = a.r() * Math.PI, u2 = u1 + 0.8 + a.r() * 2, v2 = a.r() * Math.PI, R = 8; ps.push(a.palo([Math.cos(u1) * Math.sin(v1) * R, Math.sin(u1) * Math.sin(v1) * R, 8 + Math.cos(v1) * R * 0.85], [Math.cos(u2) * Math.sin(v2) * R, Math.sin(u2) * Math.sin(v2) * R, 8 + Math.cos(v2) * R * 0.85], 0.4, { mat: i % 3 ? 'corteza_muerta' : 'des2_palma_seca' })); }
      return ps;
    }
    const n = v === 'tamarisco' ? 8 : 10;
    const cs: Comp[] = [];
    for (let i = 0; i < n; i++) {
      const t = a.r() * PI2, L = v === 'tamarisco' ? 18 + a.r() * 8 : 9 + a.r() * 5, e = 0.6 + a.r() * 0.6, b: V = [Math.cos(t) * L * Math.cos(e) * 0.7, Math.sin(t) * L * Math.cos(e) * 0.7, L * Math.sin(e)];
      ps.push(a.palo([0, 0, 0.5], b, 0.9, { mat: 'corteza_muerta', r1: 0.4 }));
      for (let k = 0; k < 2; k++) ps.push(a.palo(b, mas(b, [az(a, 4), az(a, 4), 2 + a.r() * 4]), 0.35, { mat: 'corteza_muerta', r1: 0.15 }));
      if (v === 'tamarisco') cs.push(bulto(b, [4 + a.r() * 2, 4 + a.r() * 2, 3 + a.r() * 2], { tono: az(a, 0.08) }));
      if (v === 'espinoso') ps.push(a.esfera(b[0], b[1], b[2] + 1, 0.9, { mat: a.r() < 0.5 ? 'des2_palma_seca' : 'tela_roja', tono: -0.1 }));
    }
    if (cs.length) ps.push(masa(cs, { mat: 'des2_palma', suave: 2 }));
    return ps;
  },
});

// ------------------------------------------------------------------ arenas movedizas y remolino
reg({
  id: 'des2_arenas_movedizas', nombre: ['Arenas movedizas', 'Quicksand'], tema: 'desierto', variantes: ['chica', 'grande', 'victima', 'huesos'], cuadros: 8, t: 3, huella: [3, 3], bloquea: false,
  armar: (v, f, a) => {
    const ps: Pieza[] = [];
    const R = v === 'grande' ? 36 : 24;
    sueloD(a, ps, R + 10, R * 0.85 + 8, { matas: 2, piedras: 1 });
    // el embudo: anillos de arena oscura y húmeda que giran hacia el centro
    disco(a, ps, 0, 0, 0.2, R, R * 0.85, 1.4, 'des2_arena_osc', { ruido: 0.08, n: 18 });
    const n = 26, giro = (f / 8) * PI2 / 3;
    for (let i = 0; i < n; i++) {
      const u = i / n, r = R * (0.92 - u * 0.85), t = u * PI2 * 3 + giro;
      ps.push(a.elipsoide(Math.cos(t) * r, Math.sin(t) * r * 0.85, 1.7 - u * 0.4, 3.5 + (1 - u) * 3, 1.1, 0.35, { mat: i % 2 ? 'des2_arena' : 'des2_arena_osc', giro: grad(t) + 90, tono: 0.05 - u * 0.15 }));
    }
    ps.push(a.elipsoide(0, 0, 1, R * 0.16, R * 0.14, 0.6, { mat: 'negro', tono: 0.15 }));
    if (v === 'victima') {
      // brazo que se hunde, la mano abierta y el turbante flotando
      const hunde = Math.sin((f / 8) * PI2) * 1.2;
      ps.push(masa([hueso([4, 2, 0], [6, 3, 14 + hunde], 2.2, 1.8), bulto([6.4, 3.2, 16.4 + hunde], [1.4, 2, 2.2]), hueso([6.4, 3.2, 17.5 + hunde], [7.6, 4, 21 + hunde], 0.5, 0.4), hueso([6.4, 2.2, 17.5 + hunde], [6.8, 1.4, 21 + hunde], 0.5, 0.4)], { mat: 'cu_piel_morena', suave: 0.6 }));
      ps.push(a.elipsoide(-6, -4, 2, 4, 3.4, 2.4, { mat: 'cu_tela_blanca', giro: 30 }), a.esfera(-6, -4, 2.6, 2.6, { mat: 'cu_piel_morena' }));
    }
    if (v === 'huesos') { craneo(a, ps, -3, 4, 2, 1, 0.8); costillar(a, ps, [6, -6, 1], [14, -4, 1.5], 4, 4, { abre: 1, rotas: 0.3, r: 0.5 }); huesoLargo(ps, [-12, -8, 1.8], [-4, -12, 1.8], 0.8); }
    return ps;
  },
});

reg({
  id: 'des2_remolino', nombre: ['Remolino de arena', 'Sand whirlwind'], tema: 'desierto', variantes: ['chico', 'grande', 'con_escombros'], cuadros: 8, t: 2, huella: [2, 2], bloquea: false,
  armar: (v, f, a) => {
    const ps: Pieza[] = [];
    const k = v === 'grande' ? 1.5 : 1, H = 80 * k, giro = (f / 8) * PI2;
    // la columna: bocanadas de polvo en espiral que se abren hacia arriba y se tuercen
    const n = Math.round(22 * k);
    for (let i = 0; i < n; i++) {
      const u = i / n, z = u * H, r = (3 + u * u * 22) * k, t = u * 16 + giro * (1.6 - u * 0.6), ej = Math.sin(u * 4 + giro) * 3 * k;
      ps.push(a.elipsoide(Math.cos(t) * r * 0.55 + ej, Math.sin(t) * r * 0.55, z + 4, r * 0.65 + 2, r * 0.55 + 2, (3 + u * 4) * k, { mat: 'des2_polvo', giro: grad(t), tono: -0.15 + u * 0.2 - (i % 3) * 0.05 }));
    }
    // el pie: arena levantada que gira en el piso
    for (let i = 0; i < 10; i++) { const t = (i / 10) * PI2 + giro * 1.5, r = 10 * k; ps.push(a.elipsoide(Math.cos(t) * r, Math.sin(t) * r, 1.5, 4 * k, 2 * k, 1.4 * k, { mat: 'des2_polvo', giro: grad(t) + 90, tono: -0.25 })); }
    if (v === 'con_escombros') for (let i = 0; i < 8; i++) { const u = (i / 8 + f / 8 * 0.3) % 1, t = i * 2.3 + giro * 2, r = (6 + u * 22) * k, z = 6 + u * H * 0.8, c: V = [Math.cos(t) * r, Math.sin(t) * r, z]; if (i % 3 === 0) ps.push(a.palo(c, mas(c, [Math.cos(t + 1) * 4, Math.sin(t + 1) * 4, 1]), 0.5, { mat: 'corteza_muerta' })); else ps.push(a.esfera(c[0], c[1], c[2], 1 + (i % 2), { mat: i % 2 ? 'ext_estratos' : 'des2_palma_seca' })); }
    return { piezas: ps, sinSombra: false };
  },
});

// ------------------------------------------------------------------ cráneos, huesos y restos
reg({
  id: 'des2_craneo_cuernos', nombre: ['Cráneo con cuernos', 'Horned skull'], tema: 'desierto', variantes: ['suelo', 'poste', 'pila'], huella: [1, 1], bloquea: false,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloD(a, ps, 14, 12, { matas: 1 });
    const cr = (p: V, g: number, s: number) => {
      const d: V = [Math.cos(g), Math.sin(g), 0], l: V = [-d[1], d[0], 0];
      ps.push(masa([bulto(mas(p, [0, 0, 2.5 * s]), [3.4 * s, 3.6 * s, 3 * s]), hueso(mas(p, [0, 0, 2.5 * s]), mas(mas(p, d, 8 * s), [0, 0, 1.4 * s]), 2.6 * s, 1.5 * s)], { mat: 'ext_hueso', suave: 1 * s }));
      for (const sd of [-1, 1]) { const e = mas(mas(mas(p, d, 2.5 * s), l, sd * 2.4 * s), [0, 0, 3.2 * s]); ps.push(a.esfera(e[0], e[1], e[2], 1 * s, { mat: 'negro' })); const b = mas(mas(p, l, sd * 3 * s), [0, 0, 4 * s]), m = mas(mas(b, l, sd * 6 * s), [0, 0, 2 * s]); ps.push(a.palo(b, m, 1.2 * s, { mat: 'des2_cuerno', r1: 0.9 * s }), a.palo(m, mas(mas(m, d, -2 * s), [0, 0, 6 * s]), 0.9 * s, { mat: 'des2_cuerno', r1: 0.15 * s })); }
    };
    if (v === 'suelo') cr([0, 0, 0], a.r() * PI2, 1.3);
    if (v === 'poste') { ps.push(a.palo([0, 0, -1], [az(a, 2), az(a, 2), 40], 1.2, { mat: 'madera_vieja', r1: 0.9 })); cr([0, 0, 36], 0.8, 1.2); for (let i = 0; i < 3; i++) ps.push(a.caja(az(a, 1), 1.2, 24 - i * 6, 0.4, 1.6, 7, { mat: elegir(a, ['tela_roja', 'cu_tela_blanca']), incl: az(a, 10) })); }
    if (v === 'pila') { for (let i = 0; i < 4; i++) cr(polar(a.r() * PI2, i ? 7 : 0, i ? 0 : 3), a.r() * PI2, i ? 1 : 1.2); }
    return ps;
  },
});

reg({
  id: 'des2_huesos', nombre: ['Huesos en la arena', 'Bones in the sand'], tema: 'desierto', variantes: ['dispersos', 'craneos', 'costillas'], huella: [2, 2], bloquea: false,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloD(a, ps, 24, 20, { matas: 1 });
    if (v === 'costillas') { costillar(a, ps, [-14, 0, 1], [8, 2, 2], 8, 8, { abre: 1.1, rotas: 0.3 }); montonArena(ps, [-12, 4, 1], [10, 8, 3], 0); }
    const nc = v === 'craneos' ? 4 : 1;
    for (let i = 0; i < nc; i++) { const p = i ? polar(a.r() * PI2, 6 + a.r() * 9) : [8, 8, 0]; craneo(a, ps, p[0], p[1], 2.2, 1, a.r() * PI2); }
    for (let i = 0; i < (v === 'dispersos' ? 9 : 4); i++) { const p: V = [az(a, 18), az(a, 15), 0.7]; huesoLargo(ps, p, [p[0] + az(a, 8), p[1] + az(a, 8), 0.7], 0.6 + a.r() * 0.3); }
    for (let i = 0; i < 2; i++) montonArena(ps, [az(a, 16), az(a, 14), 1], [6, 4, 2], a.r() * 180);
    return ps;
  },
});

reg({
  id: 'des2_restos_batalla', nombre: ['Lanzas en la arena', 'Spears in the sand'], tema: 'desierto', variantes: ['lanzas', 'escudos', 'estandarte'], cuadros: 6, t: 3, huella: [2, 2], bloquea: false,
  armar: (v, f, a) => {
    const ps: Pieza[] = [];
    sueloD(a, ps, 26, 22, { matas: 1 });
    for (let i = 0; i < (v === 'lanzas' ? 7 : 3); i++) { const p: V = [az(a, 18), az(a, 16), 0], q = mas(p, [az(a, 10), az(a, 10), 30 + a.r() * 12]); ps.push(a.palo(p, q, 0.6, { mat: 'madera_lisa' })); const d = nrm(mas(q, p, -1)); ps.push(a.poliedro([mas(q, [0.9, 0, 0]), mas(q, [-0.9, 0, 0]), mas(q, [0, 0.9, 0]), mas(q, [0, -0.9, 0]), mas(q, d, 6)], { mat: 'hierro_oxido' })); }
    if (v === 'escudos') for (let i = 0; i < 3; i++) { const p = polar(a.r() * PI2, 6 + a.r() * 8, 3); const e = nrm([az(a, 1), az(a, 1), 0.8]); ps.push(a.cilindro(p[0], p[1], p[2], 6.5, 1.2, { mat: elegir(a, ['cuero', 'des2_alfombra', 'bronce']), eje: e }), a.cilindro(p[0] + e[0], p[1] + e[1], p[2] + e[2], 1.8, 0.8, { mat: 'bronce', eje: e })); }
    if (v === 'estandarte') {
      ps.push(a.palo([0, 0, -1], [2, 1, 70], 1.1, { mat: 'madera_vieja' }), a.palo([2, -12, 64], [2, 12, 64], 0.7, { mat: 'madera_vieja' }));
      const sw = (k: number) => Math.sin((f / 6) * PI2 - k * 0.9);
      for (let k = 0; k < 6; k++) { const y = -10 + k * 4, h = 26 - (k % 2) * 5 - a.r() * 8; ps.push(a.caja(2.6 + sw(k) * (0.4 + k * 0.3), y, 63 - h, 0.8, 4.2, h, { mat: 'des2_alfombra', tono: sw(k) * 0.05 })); }
      cadaver(a, ps, 'nomada', [12, 14, 0], 300, { huesos: true });
    }
    montonArena(ps, [az(a, 6), az(a, 6), 1.5], [10, 7, 3], a.r() * 180);
    return ps;
  },
});

// ------------------------------------------------------------------ muros de arenisca bajo la arena
reg({
  id: 'des2_muro', nombre: ['Muro enterrado', 'Sand-buried wall'], tema: 'desierto', variantes: ['x', 'esquina', 'puerta', 'bajo'], huella: [5, 1], huellaPor: { esquina: [5, 5], esquina_y: [5, 5] }, bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloD(a, ps, v === 'esquina' ? 46 : 46, v === 'esquina' ? 46 : 16);
    const muro = (L: number, H: number, giro: number, dx: number, dy: number, puerta = false) => {
      const c = Math.cos(rad(giro)), s = Math.sin(rad(giro)), fase = a.r() * 9;
      for (let z = 0, fila = 0; z < H + 8; z += 8, fila++) for (let u = -L / 2 - (fila % 2) * 6; u < L / 2;) {
        const l = Math.min(L / 2 - u, 11 + a.r() * 5); if (l < 3) break;
        const m = u + l / 2, h = H * (0.6 + 0.4 * ruido(m * 0.06, fase, 1)) * (1 - Math.abs(m) / L * 0.5);
        if (h > z + 4 && !(puerta && Math.abs(m) < 10 && z < 36)) sillar(a, ps, dx + m * c, dy + m * s, z, l - 0.4, 12, 7.7, giro + az(a, 1), fila % 3 === 2 ? 'des2_glifos' : 'arenisca', { jit: 1 });
        u += l;
      }
      if (puerta) ps.push(a.caja(dx, dy, 36, 30, 13, 8, { mat: 'des2_glifos', giro }));
    };
    if (v === 'x') muro(80, 50 + a.r() * 14, 0, 0, 0);
    if (v === 'bajo') muro(80, 20, 0, 0, 0);
    if (v === 'puerta') muro(80, 56, 0, 0, 0, true);
    if (v === 'esquina') { muro(46, 46, 0, -14, -18); muro(40, 40, 90, -18, 10); }
    // la arena que el viento apiló contra el muro
    montonArena(ps, [az(a, 10), 10, 2], [34, 10, 12], 0); montonArena(ps, [az(a, 20), -8, 1], [24, 7, 7], 0);
    return ps;
  },
});
conVarianteY('des2_muro');

// ------------------------------------------------------------------ fogata nómada, buitres y sarcófago
reg({
  id: 'des2_fogata', nombre: ['Fogata nómada', 'Nomad campfire'], tema: 'desierto', variantes: ['encendida', 'tetera', 'apagada'], cuadros: 6, t: 3, huella: [2, 2], bloquea: true,
  armar: (v, f, a) => {
    const ps: Pieza[] = [];
    sueloD(a, ps, 26, 24, { matas: 0 });
    for (let i = 0; i < 9; i++) { const t = (i / 9) * PI2; pena(a, ps, polar(t, 10), [2.8, 2.4, 2.2], { n: 3, mat: 'ext_estratos' }); }
    for (let i = 0; i < 4; i++) { const t = (i / 4) * PI2 + a.r(); ps.push(a.palo(polar(t, 8, 0.5), polar(t, 1, v === 'apagada' ? 2 : 9), 1.3, { mat: v === 'apagada' ? 'ext_carbon' : 'corteza_muerta' })); }
    ps.push(a.caja(-16, 12, 0, 22, 14, 0.8, { mat: 'des2_alfombra', giro: 30 }), a.elipsoide(-20, 6, 3, 4, 3, 3, { mat: 'tela_roja' }));
    if (v === 'apagada') { humo(a, ps, f, 6, 0, 0, 3, 24, 4, 2); return ps; }
    llamas(a, ps, f, 6, 0, 0, 1, 2.6, 15, 2.6);
    chispas(a, ps, f, 6, 0, 0, 10, 18, 3);
    if (v === 'tetera') { for (const s of [-1, 1]) pena(a, ps, [s * 5, 0, 0], [2.6, 3, 4], { n: 3, mat: 'ext_estratos', hunde: 0 }); ps.push(a.cilindro(0, 0, 7, 3.4, 5, { mat: 'bronce', r1: 2 }), a.cilindro(0, 0, 12, 1, 2, { mat: 'bronce' }), a.palo([2.5, 0, 9], [6, 0, 12], 0.5, { mat: 'bronce' })); }
    return { piezas: ps, resplandor: { c: [0, 0, 8], r: 36 + Math.sin((f / 6) * PI2) * 2, color: '#ff9a3a' } };
  },
});

reg({
  id: 'des2_buitres', nombre: ['Buitres', 'Vultures'], tema: 'desierto', variantes: ['posados', 'comiendo', 'poste'], huella: [2, 2], bloquea: false,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloD(a, ps, 24, 20, { matas: 1 });
    if (v === 'posados') for (let i = 0; i < 3; i++) buitre(a, ps, polar(a.r() * PI2, i ? 10 + a.r() * 6 : 0), a.r() * PI2, 1.3 + a.r() * 0.3, 0);
    if (v === 'comiendo') { cadaver(a, ps, 'nomada', [0, 0, 0], a.r() * 360, { sangre: 0.7 }); for (let i = 0; i < 3; i++) { const p = polar((i / 3) * PI2 + 0.4, 16); buitre(a, ps, p, Math.atan2(-p[1], -p[0]), 1.3, i < 2 ? 0.9 : 0); } }
    if (v === 'poste') { ps.push(a.palo([0, 0, -1], [1, 1, 42], 1.6, { mat: 'corteza_muerta', r1: 1.2 }), a.palo([1, 1, 34], [12, 6, 44], 1, { mat: 'corteza_muerta', r1: 0.5 })); buitre(a, ps, [1, 1, 42], 0.8, 1.2, 0); buitre(a, ps, [10, 5, 42.5], 2.6, 1.1, 0); craneo(a, ps, 8, -6, 2.5, 1, 1); }
    return ps;
  },
});

reg({
  id: 'des2_sarcofago', nombre: ['Sarcófago en la arena', 'Sarcophagus in the sand'], tema: 'desierto', variantes: ['cerrado', 'abierto', 'roto'], huella: [3, 2], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    sueloD(a, ps, 34, 24);
    const g = az(a, 20), m = marco([0, 0, 0], g);
    cajaM(a, ps, m, 0, 0, -1, 40, 18, 14, 'des2_glifos');
    if (v !== 'cerrado') cajaM(a, ps, m, 0, 0, 4, 36, 14, 12, 'negro', 0, true);
    // la tapa con forma de momia (rostro, brazos cruzados) en su lugar, corrida o partida
    const tapa = (mm: ReturnType<typeof marco>) => {
      const T = (x: number, y: number, z: number) => mm.T([x, y, z]);
      const Ej: [V, V, V] = [mm.D([1, 0, 0]), mm.D([0, 1, 0]), mm.D([0, 0, 1])];
      ps.push(masa([bulto(T(0, 0, 2.5), [20, 9, 2.5], { ejes: Ej }), bulto(T(14, 0, 4.5), [5, 6, 3], { ejes: Ej, mat: 'des2_quitina_oro' }), bulto(T(16, 0, 5), [3, 4.4, 2.6], { ejes: Ej }), bulto(T(4, 0, 5), [4, 7, 1.6], { ejes: Ej, tono: 0.05 }), bulto(T(-8, 0, 4), [10, 6, 2], { ejes: Ej, mat: 'des2_nemes' })], { mat: 'des2_piedra_pulida', suave: 1.2 }));
    };
    if (v === 'cerrado') tapa(marco(m.T([0, 0, 13]), g));
    if (v === 'abierto') { tapa(marco(m.T([6, 20, 2]), g + 20, 0, -12)); cadaver(a, ps, 'momia', m.T([0, 0, 3]), g, { pose: { brazos: [175, 175], codos: [0, 0], piernas: [2, 2], rodillas: [0, 0], cabeza: 0 }, bruces: false, s: 0.6 }); }
    if (v === 'roto') { tapa(marco(m.T([-6, -18, 1]), g - 25, 0, 10)); for (let i = 0; i < 5; i++) sillar(a, ps, ...(m.T([entre(a, -20, 20), entre(a, 12, 22), 0]).slice(0, 2) as [number, number]), -1, 4 + a.r() * 4, 3 + a.r() * 3, 2.5, a.r() * 180, 'des2_glifos'); }
    montonArena(ps, m.T([-16, 8, 2]), [16, 10, 6], g);
    return ps;
  },
});
