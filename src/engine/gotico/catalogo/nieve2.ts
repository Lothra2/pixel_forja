import { conVarianteY, registrar, type Arma, type Pieza, type V3 } from '../objeto';
import { MATERIALES } from '../materiales';
import { masa, hueso, bulto, ruido, type Comp } from '../render';
import {
  TAU, PI, rad, deg, add, sub, esc, nor, mez, cruz, jit, elegir, ciclo, onda, suelo, rotM, transformar, tenir, cuerpo, CUERPOS, EQUIPOS,
  roca, pena, prisma, manto, tronco, fuego, brasas, craneo, craneoBestia, huesoLargo, costillar, catenaria, cadena, tela, pellejo,
} from '../actos45';

/**
 * Acto 5, la montaña (segunda tanda): pinos nevados de todos los tamaños, troncos caídos, peñascos con manto de nieve,
 * ventisqueros con restos, cabañas de troncos sepultadas, empalizadas bárbaras, tótems de guerra con cráneos de
 * bestia, estandartes que el viento desgarra, soldados congelados, mamuts muertos, trineos, hogueras, túmulos, piedras
 * rúnicas, tiendas de pieles, leña, árboles muertos, escudos clavados, hitos, osamentas, secaderos, el gran cuerno de
 * guerra, braseros y la horca. Todo varía con la semilla.
 */

MATERIALES.nie2_nieve = { rampa: ['#2a3442', '#3e4b5d', '#556477', '#6e7e92', '#8a99ac', '#a6b3c3', '#c2ccd8', '#dce3ea', '#eef2f5'], ruido: 0.12, escala: 0.14 };
MATERIALES.nie2_nieve_sucia = { rampa: ['#1f232a', '#30363f', '#454c55', '#5c636b', '#747a80', '#8d9297', '#a6aaad'], ruido: 0.35, escala: 0.25 };
MATERIALES.nie2_pino = { rampa: ['#060b0a', '#0c1512', '#121f1a', '#192a23', '#21362c', '#2a4436', '#345240'], ruido: 0.55, escala: 0.7, patron: (p) => (ruido(p[0] * 1.3, p[1] * 1.3, p[2] * 0.6) - 0.5) * 0.35 };
MATERIALES.nie2_roca = { rampa: ['#101114', '#1c1e23', '#2a2d33', '#3a3e45', '#4c5058', '#5f646c', '#747981', '#8a8f96'], ruido: 0.45, escala: 0.16, patron: (p) => (ruido(p[0] * 0.5, p[1] * 0.5, p[2] * 1.4) > 0.68 ? -0.18 : 0) };
MATERIALES.nie2_tronco = { rampa: ['#100d0b', '#1d1814', '#2b241e', '#3a3129', '#4a3f35', '#5b4f43', '#6d6052'], ruido: 0.4, escala: 0.4, patron: (p) => (ruido(p[0] * 0.25, p[1] * 0.25, p[2] * 2.2) - 0.5) * 0.4 };
MATERIALES.nie2_lana = { rampa: ['#0d0907', '#1a120d', '#281c14', '#36261b', '#463224', '#573f2e', '#6a4e3a'], ruido: 0.65, escala: 1.6, patron: (p) => (Math.sin(p[2] * 3.1 + ruido(p[0] * 0.8, p[1] * 0.8, 1) * 6) > 0.4 ? -0.12 : 0.04) };
MATERIALES.nie2_marfil = { rampa: ['#2b2519', '#463d2a', '#655940', '#857758', '#a39572', '#bdb08e', '#d3c8a9'], ruido: 0.15, escala: 0.5, brillo: 0.3, patron: (p) => (Math.sin((p[0] + p[1]) * 0.9 + p[2] * 0.4) > 0.75 ? -0.06 : 0) };
MATERIALES.nie2_piedra_runa = { rampa: ['#121316', '#1f2126', '#2e3138', '#3e424a', '#50555d', '#646971', '#797e86'], ruido: 0.4, escala: 0.2, patron: (p) => (ruido(p[0] * 0.3, p[1] * 0.3, p[2] * 0.3) > 0.72 ? 0.12 : 0) };
MATERIALES.nie2_humo = { rampa: ['#1a1a1e', '#2a2a30', '#3c3c43', '#505058', '#66666e', '#7c7c84'], ruido: 0.5, escala: 0.3 };
MATERIALES.nie2_cuervo = { rampa: ['#050506', '#0b0b0e', '#131318', '#1c1c23', '#26262f', '#31313c'], ruido: 0.2, escala: 1.2, brillo: 0.4 };
MATERIALES.nie2_sangre_helada = { rampa: ['#140405', '#24080a', '#350c0f', '#481216', '#5a1a1e'], ruido: 0.3, escala: 0.3, brillo: 0.4 };

const N = 'nie2_nieve';
const hielo = (ps: Pieza[]) => tenir(ps, 'nie2_t', '#7fb4d0', 0.55, 0.08, 0.6);

// ------------------------------------------------------------------ piezas de la montaña
/** Pino nevado: tronco con raíces, pisos de ramas que cuelgan con nieve fundida encima y la punta. */
function pino(a: Arma, ps: Pieza[], H: number, R: number, o: { x?: number; y?: number; doblado?: number; nieve?: number; seco?: number } = {}) {
  const x0 = o.x ?? 0, y0 = o.y ?? 0, dob = o.doblado ?? 0, ang = rad(elegir(a, [-45, 135]) + jit(a, 20)), jx = jit(a, 3), jy = jit(a, 3), nv = o.nieve ?? 0.7;
  const eje = (t: number): V3 => [x0 + Math.cos(ang) * dob * t * t * H * 0.4 + jx * t, y0 + Math.sin(ang) * dob * t * t * H * 0.4 + jy * t, H * t * (1 - dob * t * 0.22)];
  const r0 = H * 0.028 + 1.8, cs: Comp[] = [];
  for (let i = 0; i < 5; i++) cs.push(hueso(eje((i / 5) * 0.95), eje(((i + 1) / 5) * 0.95), r0 * (1 - (i / 5) * 0.8), r0 * (1 - ((i + 1) / 5) * 0.8) + 0.3));
  for (let k = 0; k < 5; k++) { const an = (k / 5) * TAU + a.r(); cs.push(hueso([x0, y0, 3], [x0 + Math.cos(an) * r0 * 3.2, y0 + Math.sin(an) * r0 * 3.2, -1.5], r0 * 0.6, r0 * 0.25)); }
  ps.push(masa(cs, { mat: 'corteza', suave: r0 * 0.6 }));
  const n = Math.max(4, Math.round(H / 17));
  for (let i = 0; i < n; i++) {
    const f = i / n, z = H * (0.16 + f * 0.74), c = eje(z / H), r = R * (1 - f * 0.82) * (0.9 + a.r() * 0.2);
    if (o.seco && a.r() < o.seco) continue;
    const ts: Comp[] = [], nb = Math.max(5, Math.round(5 + r / 6)), t0 = a.r() * TAU, raiz: V3 = [c[0], c[1], z + r * 0.12];
    ts.push(bulto([c[0], c[1], z + r * 0.16], [r * 0.48, r * 0.48, r * 0.4], { mat: 'nie2_pino' }));
    for (let j = 0; j < nb; j++) {
      const t = t0 + (j / nb) * TAU + jit(a, 0.25), rr = r * (0.85 + a.r() * 0.25), d: V3 = [Math.cos(t), Math.sin(t), 0];
      const tip: V3 = [c[0] + d[0] * rr, c[1] + d[1] * rr, z - rr * 0.32 - a.r() * 2], mid: V3 = [c[0] + d[0] * rr * 0.55, c[1] + d[1] * rr * 0.55, z - rr * 0.06 + 1];
      ts.push(hueso(raiz, mid, r * 0.15 + 1, r * 0.12 + 0.8, { mat: 'nie2_pino' }), hueso(mid, tip, r * 0.12 + 0.8, 0.7, { mat: 'nie2_pino' }));
      ts.push(bulto(add(mez(mid, tip, 0.35), [0, 0, -1.2]), [rr * 0.3, rr * 0.17 + 1, 1.8 + rr * 0.05], { eje: [d[0], d[1], -0.35], mat: 'nie2_pino' }));
      if (a.r() < nv) ts.push(bulto(add(mez(raiz, tip, 0.48), [0, 0, 1.6 + r * 0.035]), [rr * (0.3 + a.r() * 0.12), rr * 0.15 + 1.1, 1.3 + r * 0.025], { eje: [d[0], d[1], -0.3], mat: N }));
      if (a.r() < nv * 0.6) ts.push(bulto(add(mez(raiz, tip, 0.8), [0, 0, 0.6 + r * 0.02]), [rr * 0.16, rr * 0.1 + 0.8, 1], { eje: [d[0], d[1], -0.4], mat: N }));
    }
    if (a.r() < nv + 0.2) ts.push(bulto([c[0], c[1], z + r * 0.42], [r * 0.36, r * 0.36, r * 0.14], { mat: N }));
    ps.push(masa(ts, { mat: 'nie2_pino', suave: 1.4 + r * 0.05 }));
  }
  const top = eje(1.02), cima = eje(0.9);
  ps.push(masa([hueso(cima, top, 2.2, 0.4), bulto(add(cima, [0, 0, 1.5]), [2.4, 2.4, 1.2], { mat: N })], { mat: 'nie2_pino', suave: 1 }));
}
/** Cuervo posado mirando hacia `phi` (grados), con el pico abajo si come. */
function cuervo(ps: Pieza[], c: V3, phi: number, come = false, s = 1) {
  const g = rad(phi), d: V3 = [Math.cos(g), Math.sin(g), 0], l: V3 = [-d[1], d[0], 0];
  const P = (fw: number, sd: number, z: number): V3 => add(add(add(c, d, fw * s), l, sd * s), [0, 0, z * s]);
  const cab = come ? P(3.2, 0, 1.6) : P(2.6, 0, 4.4);
  ps.push(masa([bulto(P(0, 0, 2.6), [2.8, 1.6, 1.8], { eje: [d[0], d[1], come ? -0.4 : 0.25] }), bulto(cab, [1.2, 1.1, 1.1]), hueso(P(-2, 0, 2.8), P(-4.6, 0, come ? 4.2 : 1.8), 1.2, 0.3), hueso(P(0.4, -0.6, 1.2), P(0.4, -0.6, 0), 0.3, 0.25), hueso(P(0.4, 0.6, 1.2), P(0.4, 0.6, 0), 0.3, 0.25)], { mat: 'nie2_cuervo', suave: 0.8 }));
  ps.push(masa([hueso(add(cab, add(esc(d, 0.8 * s), [0, 0, 0])), add(cab, add(esc(d, 2.6 * s), [0, 0, -0.7 * s])), 0.45 * s, 0.1)], { mat: 'negro', suave: 0.2 }));
}
/** Charco de sangre helada en el piso. */
const sangre = (a: Arma, x: number, y: number, r: number) => manto(a, r, r * 0.8, 4, 'nie2_sangre_helada', 0.5, { x, y, tono: 0 });

registrar(
  // ------------------------------------------------------------------ pinos
  {
    id: 'nie2_pino', nombre: ['Pino nevado', 'Snow pine'], tema: 'nieve', variantes: ['joven', 'mediano', 'alto', 'gigante', 'doblado', 'ralo'], huella: [2, 2], huellaPor: { gigante: [3, 3], joven: [1, 1] }, bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const [H, R] = v === 'joven' ? [56 + a.r() * 12, 15] : v === 'mediano' ? [96 + a.r() * 16, 26] : v === 'alto' ? [140 + a.r() * 20, 32] : v === 'gigante' ? [190 + a.r() * 20, 44] : v === 'doblado' ? [110, 26] : [120, 28];
      ps.push(manto(a, R * 1.1, R, 6, N, 3));
      pino(a, ps, H, R, { doblado: v === 'doblado' ? 1.5 : 0.05, nieve: v === 'joven' ? 0.5 : 0.75, seco: v === 'ralo' ? 0.35 : 0 });
      if (v === 'gigante' || v === 'alto') for (let i = 0; i < 3; i++) { const t = a.r() * TAU; ps.push(...roca(a, [Math.cos(t) * R * 0.8, Math.sin(t) * R * 0.8, 2], [5 + a.r() * 3, 4 + a.r() * 2, 3.5], { mat: 'nie2_roca', cubre: N, n: 4 })); }
      if (v === 'ralo') for (let i = 0; i < 4; i++) { const t = a.r() * TAU, L = 10 + a.r() * 8; ps.push(a.palo([Math.cos(t) * 8, Math.sin(t) * 8, 1], [Math.cos(t) * (8 + L), Math.sin(t) * (8 + L), 1.5], 0.9, { mat: 'corteza_muerta', r1: 0.3 })); }
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'nie2_bosquecillo', nombre: ['Bosquecillo nevado', 'Snowy pine grove'], tema: 'nieve', variantes: ['tres', 'denso', 'claro'], huella: [5, 5], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [manto(a, 46, 42, 9, N, 3.5)];
      const n = v === 'denso' ? 5 : v === 'tres' ? 3 : 2;
      const sitios: [number, number][] = [[-14, -16], [16, -6], [-6, 16], [22, 22], [-26, 6]];
      for (let i = 0; i < n; i++) { const H = 80 + a.r() * 80; pino(a, ps, H, H * 0.22, { x: sitios[i][0] + jit(a, 4), y: sitios[i][1] + jit(a, 4), nieve: 0.75 }); }
      if (v === 'claro') { pino(a, ps, 44, 12, { x: 18, y: 14 }); ps.push(...roca(a, [-20, 20, 3], [9, 7, 6], { mat: 'nie2_roca', cubre: N })); }
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'nie2_tronco_caido', nombre: ['Tronco caído', 'Fallen log'], tema: 'nieve', variantes: ['tronco', 'raices', 'partido', 'con_hacha', 'hongos'], huella: [4, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [manto(a, 34, 14, 5, N, 2.5)];
      const r = 5.5 + a.r() * 1.5, L = v === 'partido' ? 26 : 34, g = jit(a, 12);
      const d: V3 = [Math.cos(rad(g)), Math.sin(rad(g)), 0], p: V3 = add(esc(d, -L), [0, 0, r * 0.75]), q: V3 = add(esc(d, L), [0, 0, r * 0.7]);
      tronco(a, ps, p, q, r, { mat: 'nie2_tronco', nudos: 3, cortes: v !== 'raices' });
      // manto de nieve sobre el lomo, fundido en tramos
      const cs: Comp[] = [];
      for (let i = 0; i < 5; i++) { const t = 0.1 + (i / 4) * 0.8 + jit(a, 0.04); cs.push(bulto(add(mez(p, q, t), [0, 0, r * 0.82]), [L * 0.22, r * 0.55, 1.6 + a.r()], { eje: d })); }
      ps.push(masa(cs, { mat: N, suave: 2 }));
      if (v === 'raices') {
        const rs: Comp[] = [];
        for (let k = 0; k < 8; k++) { const an = (k / 8) * TAU, e: V3 = add(p, [0, Math.cos(an) * r * 0.6, Math.sin(an) * r * 0.6]); rs.push(hueso(e, add(e, [-6 - a.r() * 8, Math.cos(an) * (8 + a.r() * 6), Math.sin(an) * (8 + a.r() * 6)]), r * 0.4, 0.6)); }
        rs.push(bulto(add(p, [-2, 0, 0]), [3, r * 1.3, r * 1.3]));
        ps.push(masa(rs, { mat: 'corteza_muerta', suave: 1.6 }), a.elipsoide(p[0] - 8, p[1], 0, 10, 12, 4, { mat: 'tierra', tono: -0.1 }));
      }
      if (v === 'partido') {
        // la otra mitad, astillada
        const p2 = add(q, [6, 6 + a.r() * 4, -r * 0.1]), q2 = add(p2, [22, 10, 0]);
        tronco(a, ps, p2, q2, r * 0.95, { mat: 'nie2_tronco', cortes: false });
        for (let i = 0; i < 6; i++) ps.push(prisma(a, add(q, [0, jit(a, r * 0.5), jit(a, r * 0.5)]), [d[0] + 0.3, d[1] + jit(a, 0.3), jit(a, 0.4)], 4 + a.r() * 5, 1, 'madera_vieja', 0.1, 4));
        for (let i = 0; i < 6; i++) ps.push(prisma(a, add(p2, [0, jit(a, r * 0.5), jit(a, r * 0.5)]), [-1, jit(a, 0.3), jit(a, 0.4)], 3 + a.r() * 4, 1, 'madera_vieja', 0.1, 4));
      }
      if (v === 'con_hacha') {
        const h = add(mez(p, q, 0.6), [0, 0, r * 0.9]);
        ps.push(a.palo(add(h, [0, 0, 1]), add(h, [6, 10, 22]), 1.2, { mat: 'madera_lisa' }), a.poliedro([add(h, [-5, -2, 1]), add(h, [5, 2, 1]), add(h, [-4, -1.5, -3]), add(h, [4, 1.5, -3]), add(h, [-4.5, -1.8, 5]), add(h, [4.5, 1.8, 5])], { mat: 'acero' }));
        ps.push(...[0, 1, 2, 3, 4].map((i) => a.caja(h[0] + 8 + i * 2.5 + jit(a, 2), h[1] + 12 + jit(a, 4), 0, 2.5, 1.6, 0.8, { mat: 'madera_lisa', giro: a.r() * 180, tono: 0.1 })));
      }
      if (v === 'hongos') for (let i = 0; i < 7; i++) { const t = 0.15 + a.r() * 0.7, c = add(mez(p, q, t), [0, r * 0.95, r * (a.r() * 0.6)]); ps.push(a.elipsoide(c[0], c[1] + 1, c[2], 2.6, 2, 0.7, { mat: 'hongo', tono: -0.1 })); }
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ rocas y nieve
  {
    id: 'nie2_roca', nombre: ['Peñasco nevado', 'Snowy boulder'], tema: 'nieve', variantes: ['penasco', 'losa', 'pila', 'aguja', 'grieta', 'chica'], huella: [2, 2], huellaPor: { chica: [1, 1], aguja: [2, 2], pila: [3, 3] }, bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const M = { mat: 'nie2_roca', cubre: N };
      if (v === 'penasco') { ps.push(...roca(a, [0, 0, 10], [20, 16, 15], { ...M, n: 9 })); ps.push(...roca(a, [14, 10, 3], [7, 6, 5], M)); }
      else if (v === 'losa') { ps.push(...roca(a, [0, 0, 5], [24, 14, 6], { ...M, aplasta: 0.5, cubreAlto: 0.5 }), ...roca(a, [-6, 10, 12], [12, 8, 4], { ...M, giro: 30 })); }
      else if (v === 'pila') { ps.push(...roca(a, [-8, -6, 12], [18, 15, 14], M), ...roca(a, [14, 4, 8], [12, 10, 9], M), ...roca(a, [-2, 16, 5], [9, 8, 6], M), ...roca(a, [4, -6, 26], [9, 8, 7], M)); }
      else if (v === 'aguja') {
        let c: V3 = [0, 0, 7], r = 14;
        for (let i = 0; i < 6; i++) { ps.push(pena(a, c[0], c[1], c[2], r, r * 0.8, 9, { mat: 'nie2_roca', n: 9, tono: jit(a, 0.05) })); if (i < 5 && a.r() < 0.8) ps.push(a.elipsoide(c[0] + jit(a, 2), c[1] + jit(a, 2), c[2] + 6.5, r * 0.6, r * 0.5, 1.6, { mat: N, giro: a.r() * 180 })); c = add(c, [jit(a, 2.5), jit(a, 2.5), 9.5]); r *= 0.8; }
        ps.push(prisma(a, add(c, [0, 0, -5]), [jit(a, 0.2), jit(a, 0.2), 1], 14, 3.5, 'nie2_roca', 0, 5));
        ps.push(...roca(a, [9, 8, 3], [7, 6, 5], { mat: 'nie2_roca', cubre: N }));
      } else if (v === 'grieta') {
        ps.push(...roca(a, [-9, -4, 12], [12, 14, 15], { ...M, giro: 10 }), ...roca(a, [10, 5, 11], [11, 13, 14], { ...M, giro: 15 }));
        for (let i = 0; i < 5; i++) { const y = -8 + i * 4; ps.push(a.cilindro(0.5, y, 10 + a.r() * 8 - (4 + a.r() * 6), 0.15, 4 + a.r() * 6, { mat: 'hielo', r1: 1.1 })); }
      } else ps.push(...roca(a, [0, 0, 4], [8 + a.r() * 2, 7, 5.5], M));
      ps.push(manto(a, v === 'chica' ? 12 : 26, v === 'chica' ? 10 : 22, 5, N, 2.5));
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'nie2_ventisquero', nombre: ['Ventisquero', 'Snowdrift'], tema: 'nieve', variantes: ['ola', 'duna', 'lanza', 'mano', 'cuervos'], huella: [3, 2], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], cs: Comp[] = [];
      const L = v === 'duna' ? 40 : 26;
      for (let i = 0; i < 7; i++) { const t = i / 6 - 0.5, h = (1 - Math.abs(t) * 1.5) * (v === 'ola' ? 11 : 8) + a.r() * 2; cs.push(bulto([t * L * 2, jit(a, 3) - t * 5, 0], [12 + a.r() * 4, 9 + a.r() * 3, Math.max(2, h)], { giro: -15 + jit(a, 10) })); }
      if (v === 'ola') for (let i = 0; i < 4; i++) cs.push(bulto([-12 + i * 8, -6, 10 + Math.sin(i) * 1.5], [6, 4, 2.2], { giro: -15 }));
      // crestas que talla el viento y piedras que asoman
      for (let i = 0; i < 5; i++) { const t = jit(a, 0.45), x = t * L * 2, h = (1 - Math.abs(t) * 1.5) * (v === 'ola' ? 11 : 8); cs.push(bulto([x + jit(a, 4), jit(a, 5), Math.max(1, h * 0.85)], [9 + a.r() * 5, 1.4, 1.6], { giro: -15 + jit(a, 8), tono: 0.08 })); }
      ps.push(masa(cs, { mat: N, suave: 5, tono: -0.04 }));
      for (let i = 0; i < 3; i++) ps.push(pena(a, jit(a, L * 1.4), 6 + a.r() * 6, 0.5, 2.5 + a.r() * 2.5, 2 + a.r() * 2, 2 + a.r() * 1.5, { mat: 'nie2_roca' }));
      if (v === 'lanza') {
        ps.push(a.palo([-6, 2, 0], [-2, -2, 40], 0.8, { mat: 'madera' }), a.poliedro([[-2.4, -1.6, 39], [-1.6, -2.4, 39], [-2, -2, 46]], { mat: 'hierro' }));
        ps.push(...transformar([a.cilindro(0, 0, 0, 8, 1.6, { mat: 'madera_vieja' }), a.esfera(0, 0, 1.6, 2, { mat: 'hierro' })], rotM(30, 70), [8, 6, 7]));
        ps.push(a.elipsoide(-4, 0, 9, 4, 3, 2.5, { mat: N }));
      }
      if (v === 'mano') {
        // un brazo helado que sale de la nieve, los dedos abiertos
        const K = 1.5, Q = (x: number, y: number, z: number): V3 => [6 + x * K, 9 + y * K, z * K];
        const brazo = [masa([hueso(Q(0, 0, -1), Q(0.6, -0.6, 7), 1.7, 1.4), hueso(Q(0.6, -0.6, 7), Q(-0.4, -1.4, 12), 1.4, 1.1), bulto(Q(-0.6, -1.6, 13.4), [1.5, 1.9, 1.7]),
          ...[0, 1, 2, 3].map((k) => hueso(Q(-0.6 + (k - 1.5) * 0.5, -1.6 - (k - 1.5) * 0.5, 14.4), Q(-0.6 + (k - 1.5) * 1.4, -1.6 - (k - 1.5) * 1.4, 18 - Math.abs(k - 1.5) * 0.6), 0.5, 0.36, { k: 0.2 })),
          hueso(Q(0.6, -2.6, 13.4), Q(1.2, -3.8, 15.4), 0.5, 0.38, { k: 0.2 })], { mat: 'cu_piel_gris', suave: 0.9 })];
        ps.push(...tenir(brazo, 'nie2_m', '#5a7a90', 0.35, -0.1));
        ps.push(a.cilindro(6, 10, 0.5, 3.4, 4, { mat: 'cu_tela_parda', r1: 2.6 }));
        ps.push(a.cilindro(-6, -4, 0, 2.8, 8, { mat: 'hierro_oxido', r1: 2.4, incl: 40 }), a.elipsoide(-6, -2, 6, 3.2, 3.2, 2.4, { mat: 'hierro_oxido', tono: -0.1 }));
      }
      if (v === 'cuervos') { ps.push(sangre(a, 6, 14, 9)); ps.push(...cuerpo({ cu: CUERPOS.barbaro, eq: EQUIPOS.barbaro, acc: 'morir', f: 7, dir: 'so', m: rotM(20), t: [4, 18, 0], s: 0.95 })); cuervo(ps, [14, 26, 2], 200, true, 1.6); cuervo(ps, [-8, 24, 2], 330, true, 1.6); cuervo(ps, [20, 10, 1], 120, false, 1.5); }
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ cabaña de troncos sepultada
  {
    id: 'nie2_cabana', nombre: ['Cabaña sepultada', 'Buried log cabin'], tema: 'nieve', variantes: ['sepultada', 'techo_hundido', 'luz', 'quemada'], huella: [5, 4], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const W = 64, D = 48, rl = 3.4, filas = 6, quem = v === 'quemada', mat = quem ? 'a45_carbon' : 'nie2_tronco';
      const alto = filas * rl * 1.85;
      // paredes de troncos que se cruzan en las esquinas
      for (let i = 0; i < filas; i++) {
        const z = rl + i * rl * 1.85;
        if (quem && i > 3 && a.r() < 0.6) continue;
        const sx = i % 2 ? 0 : 3, sy = i % 2 ? 3 : 0;
        for (const s of [-1, 1]) {
          tronco(a, ps, [-W / 2 - 5 - sx, s * D / 2, z], [W / 2 + 5 + sx, s * D / 2, z + jit(a, 0.4)], rl * (0.92 + a.r() * 0.16), { mat, nudos: 1 });
          if (!(quem && s > 0 && i > 2)) tronco(a, ps, [s * W / 2, -D / 2 - 5 - sy, z + rl * 0.9], [s * W / 2, D / 2 + 5 + sy, z + rl * 0.9 + jit(a, 0.4)], rl * (0.92 + a.r() * 0.16), { mat, nudos: 1 });
        }
      }
      // puerta y ventana en la cara de adelante (+y)
      ps.push(a.caja(-10, D / 2, 0, 16, 12, 30, { mat, resta: true }), a.caja(-10, D / 2 - 1, 0, 15, 2, 29, { mat: quem ? 'negro' : 'madera_vieja', tono: -0.1 }));
      ps.push(a.caja(16, D / 2, 14, 10, 12, 9, { mat, resta: true }), a.caja(16, D / 2 - 2, 14, 10, 1, 9, { mat: v === 'luz' ? 'luz_vela' : 'negro' }));
      if (v === 'luz') for (const s of [-1, 1]) ps.push(a.caja(16 + s * 2.6, D / 2 + 0.5, 14, 1, 1.4, 9, { mat: 'madera' }));
      // techo a dos aguas con la cumbrera a lo largo de x
      const zt = alto + rl, cum = zt + 22, hund = v === 'techo_hundido';
      if (!quem) {
        for (const s of [-1, 1]) {
          const lado: V3[] = [[-W / 2 - 8, s * (D / 2 + 8), zt - 3], [W / 2 + 8, s * (D / 2 + 8), zt - 3], [-W / 2 - 8, 0, cum - (hund ? 10 : 0)], [W / 2 + 8, 0, cum - (hund && s > 0 ? 14 : 0)]];
          ps.push(a.poliedro([...lado, ...lado.map((p) => add(p, [0, 0, -2.4]))], { mat: 'madera_vieja', tono: -0.08 }));
          // el manto de nieve: bultos chatos siguiendo la pendiente y una cornisa colgando del alero
          const cs: Comp[] = [];
          const sl = Math.atan2(cum - zt + 3, D / 2 + 8);
          for (let i = 0; i < 5; i++) for (let k = 0; k < 3; k++) { const t = 0.12 + k * 0.36, x = -W / 2 - 2 + (i / 4) * (W + 4), z = zt - 3 + (cum - zt + 3) * t + 1.6 - (hund && (s > 0 || i < 2) ? 12 * t : 0); cs.push(bulto([x + jit(a, 2), s * (D / 2 + 8) * (1 - t), z], [13, 12, 1.8 + a.r() * 1.1], { ejes: [[1, 0, 0], [0, Math.cos(sl), -s * Math.sin(sl)], [0, s * Math.sin(sl), Math.cos(sl)]] })); }
          for (let i = 0; i < 6; i++) cs.push(bulto([-W / 2 - 5 + (i / 5) * (W + 10), s * (D / 2 + 8.5), zt - 3.2], [9, 2.6, 2.6 + a.r() * 1.2]));
          ps.push(masa(cs, { mat: N, suave: 4 }));
          for (let i = 0; i < 6; i++) if (a.r() < 0.7) ps.push(a.cilindro(-W / 2 + (i / 5) * W + jit(a, 3), s * (D / 2 + 8.5), zt - 6 - 3 - a.r() * 6, 0.15, 3 + a.r() * 6, { mat: 'hielo', r1: 0.9 }));
        }
        for (const s of [-1, 1]) ps.push(a.poliedro([[s * W / 2, -D / 2 - 2, zt - 2], [s * W / 2, D / 2 + 2, zt - 2], [s * W / 2, 0, cum - 2], [s * (W / 2 - 3), -D / 2 - 2, zt - 2], [s * (W / 2 - 3), D / 2 + 2, zt - 2], [s * (W / 2 - 3), 0, cum - 2]], { mat: 'nie2_tronco', tono: -0.05 }));
      } else {
        // vigas quemadas que quedaron
        for (let i = 0; i < 4; i++) ps.push(a.palo([-W / 2 + 6 + i * 16, -D / 2 - 4, zt - 4 - a.r() * 8], [-W / 2 + 10 + i * 16 + jit(a, 4), D / 3, zt + 8 - a.r() * 18], 2, { mat: 'a45_carbon' }));
        ps.push(manto(a, 26, 18, 6, 'nie2_nieve_sucia', 3));
      }
      // chimenea de piedra con humo
      ps.push(...roca(a, [-W / 2 - 6, -8, 18], [8, 8, 20], { mat: 'nie2_roca', n: 5 }), a.cilindro(-W / 2 - 6, -8, 30, 5.5, cum - 26, { mat: 'piedra_bloques', r1: 4.5 }));
      // la nieve la sepulta: ventisqueros contra las paredes
      const cs: Comp[] = [], mon = v === 'sepultada' ? 1 : 0.6;
      for (let i = 0; i < 10; i++) { const t = (i / 10) * TAU + jit(a, 0.2), x = Math.cos(t) * (W / 2 + 6), y = Math.sin(t) * (D / 2 + 6); if (y > D / 2 && x > -22 && x < 2 && v !== 'sepultada') continue; cs.push(bulto([x, y, 0], [16 + a.r() * 6, 12 + a.r() * 4, (10 + a.r() * 10) * mon], { giro: deg(t) })); }
      if (v === 'sepultada') cs.push(bulto([-10, D / 2 + 6, 0], [14, 10, 24]));
      ps.push(masa(cs, { mat: N, suave: 6 }));
      ps.push(suelo(a));
      return v === 'luz' ? { piezas: ps, resplandor: { c: [16, D / 2 + 4, 18], r: 18, color: '#ffb050' } } : ps;
    },
  },
);

// ------------------------------------------------------------------ armas y pertrechos sueltos
/** Escudo redondo con la cara hacia `n`: tablas pintadas en dos colores, borde de hierro y el umbo. */
function escudo(a: Arma, ps: Pieza[], c: V3, r: number, n: V3, mats: [string, string] = ['madera_vieja', 'tela_roja']) {
  const d = nor(n), u = nor(cruz([0, 0, 1], d).every((x) => Math.abs(x) < 1e-6) ? [1, 0, 0] : cruz([0, 0, 1], d)), w = cruz(d, u);
  ps.push(a.cilindro(...add(c, d, -0.6), r + 0.5, 1.2, { mat: 'hierro_oxido', eje: d }));
  ps.push(a.cilindro(...add(c, d, -0.2), r, 1.4, { mat: mats[0], eje: d }));
  // media cara pintada (una cuña de color) y el umbo
  const pts: V3[] = [];
  for (let i = 0; i <= 6; i++) { const t = (i / 6) * PI; pts.push(add(add(add(c, d, 1.3), u, Math.cos(t) * r * 0.95), w, Math.sin(t) * r * 0.95), add(add(add(c, d, 1.0), u, Math.cos(t) * r * 0.95), w, Math.sin(t) * r * 0.95)); }
  ps.push(a.poliedro(pts, { mat: mats[1], tono: -0.05 }));
  ps.push(a.esfera(...add(c, d, 1.2), r * 0.24, { mat: 'hierro' }));
}
/** Espada clavada: hoja de `base` hacia arriba según `dir`, guarda, puño y pomo. */
function espada(a: Arma, ps: Pieza[], base: V3, dir: V3, L = 26, mat = 'acero') {
  const d = nor(dir), l = nor(Math.abs(d[2]) > 0.9 ? cruz(d, [1, -1, 0]) : cruz(d, [0, 0, 1])), g = add(base, d, L * 0.7);
  ps.push(a.poliedro([add(base, l, 0.4), add(base, l, -0.4), add(add(g, l, 1.3), cruz(d, l), 0.3), add(add(g, l, -1.3), cruz(d, l), -0.3), add(add(g, l, 1.3), cruz(d, l), -0.3), add(add(g, l, -1.3), cruz(d, l), 0.3)], { mat }));
  ps.push(a.palo(add(g, l, -4), add(g, l, 4), 0.8, { mat: 'hierro' }), a.palo(g, add(g, d, L * 0.22), 0.75, { mat: 'cuero' }), a.esfera(...add(g, d, L * 0.25), 1.2, { mat: 'hierro' }));
}
/** Hacha de guerra: mango de p a q y la hoja en q. */
function hacha(a: Arma, ps: Pieza[], p: V3, q: V3, s = 1, doble = false) {
  const d = nor(sub(q, p)), l = nor(Math.abs(d[2]) > 0.9 ? cruz(d, [1, -1, 0]) : cruz(d, [0, 0, 1])), k = cruz(d, l);
  ps.push(a.palo(p, add(q, d, 1), 0.85 * s, { mat: 'madera' }));
  for (const sg of doble ? [-1, 1] : [1]) {
    const b = add(q, k, sg * 1.2 * s);
    ps.push(a.poliedro([add(b, d, 1.6 * s), add(b, d, -1.6 * s), add(add(b, k, sg * 5.5 * s), d, 3.8 * s), add(add(b, k, sg * 5.5 * s), d, -3.8 * s), add(add(b, k, sg * 4 * s), l, 0.7 * s), add(add(b, k, sg * 4 * s), l, -0.7 * s)], { mat: 'hierro' }));
  }
}
/** Casco bárbaro con o sin cuernos, apoyado en c. */
function casco(a: Arma, ps: Pieza[], c: V3, cuernos = true, mat = 'hierro_oxido') {
  ps.push(a.elipsoide(c[0], c[1], c[2] + 2, 4.2, 4.2, 4.6, { mat }), a.cilindro(c[0], c[1], c[2], 4.6, 1.4, { mat, tono: -0.1 }));
  if (cuernos) for (const s of [-1, 1]) ps.push(masa([hueso([c[0] - s * 2.8, c[1] + s * 2.8, c[2] + 4], [c[0] - s * 6, c[1] + s * 6, c[2] + 7], 1.3, 0.9), hueso([c[0] - s * 6, c[1] + s * 6, c[2] + 7], [c[0] - s * 6.4, c[1] + s * 6.4, c[2] + 12], 0.9, 0.25)], { mat: 'a45_cuerno', suave: 0.8 }));
}
/** Runa tallada en un plano: trazos cortos en (u, z) dentro de un cuadro de lado s, sobre la cara de normal n. */
function runa(a: Arma, ps: Pieza[], c: V3, u: V3, n: V3, s: number, mat: string, tono = 0) {
  const k = Math.floor(a.r() * 6), up: V3 = [0, 0, 1];
  const T = (x0: number, z0: number, x1: number, z1: number) => { const p = add(add(add(c, u, x0 * s), up, z0 * s), n, 0.15), q = add(add(add(c, u, x1 * s), up, z1 * s), n, 0.15); ps.push(a.palo(p, q, 0.42, { mat, tono })); };
  T(0, -0.5, 0, 0.5);
  if (k === 0) { T(0, 0.5, 0.4, 0.15); T(0, 0.1, 0.4, -0.25); }
  else if (k === 1) { T(0, 0.3, -0.4, 0); T(0, 0.3, 0.4, 0); }
  else if (k === 2) { T(-0.35, 0.5, 0.35, -0.1); }
  else if (k === 3) { T(0, 0.5, 0.4, 0.2); T(0.4, 0.2, 0, -0.1); }
  else if (k === 4) { T(-0.4, 0.5, 0.4, 0.5); T(0.4, 0.5, 0.4, -0.5); }
  else { T(-0.4, 0.1, 0.4, -0.3); T(-0.4, -0.3, 0.4, 0.1); }
}
/** Piedra rúnica: laja de canto irregular con la cara hacia (u × arriba), runas y nieve arriba. */
function piedraRunica(a: Arma, ps: Pieza[], c: V3, alto: number, ancho: number, giro: number, o: { mat?: string; runas?: string; tono?: number; incl?: number; partida?: boolean; nieve?: boolean }) {
  const loc: Pieza[] = [], g = 3.4 + a.r() * 1.2, pts: V3[] = [];
  const perfil: [number, number][] = [[-ancho / 2, 0], [ancho / 2, 0], [ancho / 2 + jit(a, 1.5), alto * 0.55], [ancho * 0.36, alto * (0.86 + a.r() * 0.08)], [jit(a, 2), alto], [-ancho * 0.38, alto * (0.84 + a.r() * 0.1)], [-ancho / 2 + jit(a, 1.5), alto * 0.5]];
  const top = o.partida ? alto * 0.55 : alto;
  for (const [x, z] of perfil) { if (z > top + 0.1) continue; for (const s of [-1, 1]) pts.push([x + jit(a, 0.4), s * g * (1 - z / alto * 0.25) + jit(a, 0.3), z]); }
  if (o.partida) for (const s of [-1, 1]) { pts.push([-ancho * 0.5, s * g, top - 3], [ancho * 0.1, s * g, top + 6], [ancho * 0.5, s * g, top + 1]); }
  loc.push(a.poliedro(pts, { mat: o.mat ?? 'nie2_piedra_runa', tono: o.tono }));
  if (o.runas) for (let i = 0; i < Math.floor((top - 8) / 7); i++) runa(a, loc, [jit(a, 1), g * 0.95, 6 + i * 7], [1, 0, 0], [0, 1, 0], 2.6, o.runas);
  if (o.nieve !== false) loc.push(a.elipsoide(0, 0, top - 1, ancho * 0.35, g * 0.9, 1.6, { mat: N }));
  ps.push(...transformar(loc, rotM(giro, 0, o.incl ?? jit(a, 5)), c));
}

registrar(
  // ------------------------------------------------------------------ empalizada bárbara
  {
    id: 'nie2_empalizada', nombre: ['Empalizada bárbara', 'Barbarian palisade'], tema: 'nieve', variantes: ['recta', 'rota', 'puerta', 'craneos'], huella: [5, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      ps.push(manto(a, 46, 12, 7, N, 4));
      const n = 11;
      for (let i = 0; i < n; i++) {
        const x = -37 + i * 7.4 + jit(a, 0.6), r = 3.2 + a.r() * 0.8;
        if (v === 'puerta' && i >= 4 && i <= 6) continue;
        let h = 46 + a.r() * 16;
        const rota = v === 'rota' && (i === 3 || i === 4 || i === 7) ;
        if (rota) h = 12 + a.r() * 14;
        const lean: V3 = [jit(a, 1.5), jit(a, 1.5), 0];
        tronco(a, ps, [x, 0, -2], add([x, 0, h], lean), r, { mat: 'nie2_tronco', cortes: false, nudos: 1 });
        if (!rota) { ps.push(a.cilindro(...add([x, 0, h - 0.5], lean), r * 0.92, 9, { mat: 'madera_lisa', r1: 0.3, tono: 0.05 })); if (a.r() < 0.6) ps.push(a.elipsoide(...add([x, 0, h + 2], lean), r * 0.8, r * 0.8, 1.6, { mat: N })); }
        else for (let k = 0; k < 4; k++) ps.push(prisma(a, add([x, 0, h - 1], lean), [jit(a, 0.4), jit(a, 0.4), 1], 3 + a.r() * 4, 1, 'madera_vieja', 0.1, 4));
        if (v === 'craneos' && i % 3 === 1) craneo(a, ps, add([x, 0, h + 6.5], lean), 3.4, 30 + jit(a, 30), { incl: jit(a, 15) });
      }
      // ataduras y riostras por detrás
      for (const z of [14, 36]) for (const s of [-1, 1]) {
        if (v === 'puerta') { ps.push(a.palo([-40, s * 3.6, z], [-11, s * 3.6, z + jit(a, 1)], 0.6, { mat: 'cuerda' }), a.palo([11, s * 3.6, z], [40, s * 3.6, z + jit(a, 1)], 0.6, { mat: 'cuerda' })); }
        else ps.push(a.palo([-40, s * 3.6, z], [40, s * 3.6, z + jit(a, 1)], 0.6, { mat: 'cuerda' }));
      }
      for (const x of [-28, 0, 28]) if (!(v === 'puerta' && x === 0)) ps.push(a.palo([x + jit(a, 3), -18, 0], [x, -3, 34], 2, { mat: 'corteza' }));
      if (v === 'rota') {
        tronco(a, ps, [-14, 6, 3], [6, 30, 3.5], 3.4, { mat: 'nie2_tronco' }); tronco(a, ps, [16, 4, 3], [30, 26, 3], 3.2, { mat: 'nie2_tronco' });
        ps.push(manto(a, 18, 14, 4, N, 3, { x: 6, y: 18 }));
      }
      if (v === 'puerta') {
        for (const s of [-1, 1]) tronco(a, ps, [s * 11, 0, -2], [s * 11, 0, 72], 5, { mat: 'nie2_tronco', nudos: 2 });
        tronco(a, ps, [-17, 0, 66], [17, 0, 67], 4, { mat: 'nie2_tronco' });
        ps.push(a.elipsoide(0, 0, 71, 16, 4, 2, { mat: N }));
        craneoBestia(a, ps, [0, 2, 76], 6.5, 90, { cuernos: 'carnero', colmillos: false, incl: -10 });
        for (const x of [-8, -3, 4, 9]) { const p: V3 = [x, 3, 64], q: V3 = [x + jit(a, 1), 4, 50 + a.r() * 6]; ps.push(a.palo(p, q, 0.25, { mat: 'cuerda' })); huesoLargo(ps, add(q, [0, 0, -0.5]), add(q, [jit(a, 2), 0, -7]), 0.7); }
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ tótem de guerra
  {
    id: 'nie2_totem', nombre: ['Tótem de guerra', 'War totem'], tema: 'nieve', variantes: ['mamut', 'oso', 'carnero', 'cuervo', 'apilado'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [manto(a, 14, 12, 5, N, 3)];
      for (let i = 0; i < 5; i++) { const t = (i / 5) * TAU + a.r(); ps.push(pena(a, Math.cos(t) * 7, Math.sin(t) * 7, 1.5, 3 + a.r() * 2, 2.5 + a.r() * 1.5, 3 + a.r() * 2, { mat: 'nie2_roca' })); }
      const H = v === 'apilado' ? 58 : 66, cs: Comp[] = [];
      cs.push(hueso([0, 0, -2], [jit(a, 1), jit(a, 1), H], 3.6, 2.8));
      for (let z = 10; z < H - 4; z += 9 + a.r() * 4) cs.push(bulto([0, 0, z], [4.4, 4.4, 1.4], { tono: 0.06 }));
      // cara tallada mirando al frente
      cs.push(bulto([2.2, 2.2, H * 0.5], [3, 3, 5], { tono: -0.04 }));
      ps.push(masa(cs, { mat: 'nie2_tronco', suave: 1.4 }));
      for (const s of [-1, 1]) ps.push(a.esfera(3.4 + s * 1.2, 3.4 - s * 1.2, H * 0.5 + 2, 0.9, { mat: 'negro' }));
      ps.push(a.elipsoide(4, 4, H * 0.5 - 2.5, 1.6, 1.6, 1, { mat: 'negro' }));
      for (const z of [18, 44]) ps.push(a.cilindro(0, 0, z, 3.9, 1.6, { mat: 'cuerda' }));
      // travesaño con amuletos que cuelgan
      const zt = H - 10;
      ps.push(a.palo([-11, 11, zt], [11, -11, zt], 1.2, { mat: 'madera' }));
      for (const s of [-1, 1]) {
        const p: V3 = [s * 9, -s * 9, zt], q: V3 = add(p, [jit(a, 1), jit(a, 1), -10 - a.r() * 6]);
        ps.push(a.palo(p, q, 0.25, { mat: 'cuerda' }));
        if (a.r() < 0.5) huesoLargo(ps, q, add(q, [0, 0, -7]), 0.7); else for (let k = 0; k < 3; k++) ps.push(a.elipsoide(q[0] + jit(a, 0.8), q[1] + jit(a, 0.8), q[2] - 2 - k, 0.6, 1.2, 3, { mat: 'nie2_cuervo', giro: a.r() * 180 }));
      }
      const top: V3 = [0, 0, H];
      if (v === 'mamut') {
        craneoBestia(a, ps, add(top, [0, 0, 6]), 7, 45, { cuernos: 'ninguno', incl: -15 });
        for (const s of [-1, 1]) { const b: V3 = add(top, [6 - s * 3, 6 + s * 3, -2]), cs2: Comp[] = []; let p = b; for (let i = 1; i <= 6; i++) { const t = i / 6, q: V3 = add(b, [t * 14 - s * t * t * 8, t * 14 + s * t * t * 8, -Math.sin(t * PI) * 8 + t * t * 14]); cs2.push(hueso(p, q, 2.4 * (1 - t * 0.6), 2.4 * (1 - (t + 0.17) * 0.6) + 0.2)); p = q; } ps.push(masa(cs2, { mat: 'nie2_marfil', suave: 1 })); }
      } else if (v === 'oso') {
        craneoBestia(a, ps, add(top, [0, 0, 5]), 5, 45, { colmillos: true, incl: -10 });
        ps.push(pellejo(a, [-3, -3, H - 14], 22, 26, [1, 1, 0], 'cu_pelaje'));
        for (let k = 0; k < 4; k++) ps.push(a.palo([-10 + k * 1.2, 10 - k * 1.2, zt - 1], [-10 + k * 1.2, 10 - k * 1.2, zt - 6], 0.5, { mat: 'hueso', r1: 0.1 }));
      } else if (v === 'carnero') craneoBestia(a, ps, add(top, [0, 0, 5]), 5.5, 45, { cuernos: 'carnero', incl: -12 });
      else if (v === 'cuervo') {
        const b: V3 = add(top, [0, 0, 4]);
        ps.push(masa([bulto(b, [5, 3.5, 4], { eje: [1, 1, 0.3] }), bulto(add(b, [4, 4, 4]), [2.6, 2.6, 2.6]), hueso(add(b, [5.5, 5.5, 4.5]), add(b, [9, 9, 3]), 1.1, 0.2), ...[-1, 1].map((s) => bulto(add(b, [-s * 9, s * 9, 3]), [12, 2.2, 6], { eje: [-s, s, 0.6] }))], { mat: 'nie2_cuervo', suave: 1.4 }));
        for (const s of [-1, 1]) ps.push(a.esfera(...add(b, [4.8 + s * 1, 4.8 - s * 1, 4.8]), 0.7, { mat: 'cu_ojo_brasa' }));
      } else {
        for (let i = 0; i < 3; i++) craneo(a, ps, [jit(a, 0.6), jit(a, 0.6), H - 26 + i * 8], 3.6 - i * 0.2, 45 + jit(a, 20), { incl: jit(a, 10) });
        craneoBestia(a, ps, add(top, [0, 0, 4]), 4, 45, { cuernos: 'ciervo' });
      }
      ps.push(a.elipsoide(0, 0, zt + 1.4, 3, 11, 1, { mat: N, giro: -45 }));
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ estandartes que el viento desgarra
  {
    id: 'nie2_estandarte', nombre: ['Estandarte desgarrado', 'Wind-torn banner'], tema: 'nieve', variantes: ['rojo', 'azul', 'jirones', 'piel', 'gallardete'], cuadros: 8, t: 3, huella: [2, 1], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [manto(a, 16, 12, 4, N, 3)];
      for (let i = 0; i < 6; i++) { const t = (i / 6) * TAU + a.r(); ps.push(pena(a, Math.cos(t) * 5, Math.sin(t) * 5, 2, 3 + a.r() * 1.5, 2.5 + a.r(), 3 + a.r() * 2, { mat: 'nie2_roca' })); }
      const H = 86 + a.r() * 6, lean: V3 = [jit(a, 2), jit(a, 2), 0];
      ps.push(a.palo([0, 0, -2], add([0, 0, H], lean), 1.4, { mat: 'madera' }));
      const tip = add([0, 0, H], lean);
      ps.push(a.poliedro([add(tip, [-1, 0, 0]), add(tip, [1, 0, 0]), add(tip, [0, -1, 0]), add(tip, [0, 1, 0]), add(tip, [0, 0, 7])], { mat: 'hierro' }));
      const zb = H - 6, bar: V3 = add([0, 0, zb], esc(lean, zb / H));
      if (v !== 'gallardete') ps.push(a.palo(add(bar, [0, -13, 0]), add(bar, [0, 13, 0]), 0.9, { mat: 'madera' }));
      const tela0 = { p0: add(bar, [0.8, -12, -0.5]), u: [0, 1, 0] as V3, ancho: 24, alto: 40, f, n: 8, nu: 5, nv: 8, amp: 3.2, fase: a.r() * 6 };
      if (v === 'rojo') tela(a, ps, { ...tela0, mat: 'tela_roja', jirones: 0.55, dibujo: (u, w) => (Math.hypot(u - 0.5, (w - 0.32) * 1.2) < 0.17 ? 'hueso' : Math.abs(w - 0.08) < 0.05 ? 'cu_oro' : undefined) });
      else if (v === 'azul') tela(a, ps, { ...tela0, mat: 'tela_azul', jirones: 0.5, dibujo: (u, w) => (Math.abs(u - w * 0.8 - 0.1) < 0.12 ? 'cu_tela_blanca' : undefined) });
      else if (v === 'jirones') tela(a, ps, { ...tela0, mat: 'cu_tela_negra', jirones: 1, nu: 6, amp: 4, dibujo: (u, w) => (Math.abs(u - 0.5) < 0.1 && w < 0.6 ? 'tela_roja' : undefined) });
      else if (v === 'piel') {
        // un cuero estirado que se mece, con flecos de hueso
        const g = onda(f, 8, 0) * 4;
        ps.push(...transformar([pellejo(a, [0, 0, -16], 22, 30, [1, 1, 0], 'a45_piel')], rotM(0, g), add(bar, [1, 0, 0])));
        for (let k = 0; k < 5; k++) { const y = -10 + k * 5, p: V3 = add(bar, [1, y, -30]), sw = onda(f, 8, k * 0.8) * 2.4; ps.push(a.palo(p, add(p, [sw, 0, -7]), 0.25, { mat: 'cuerda' })); ps.push(a.elipsoide(...add(p, [sw * 1.2, 0, -8]), 0.8, 0.8, 1.8, { mat: 'hueso' })); }
      } else tela(a, ps, { p0: add(tip, [0, 0, -3]), u: [0, 0, -1], abajo: nor([0.6, -0.8, -0.12]), ancho: 12, alto: 46, f, n: 8, nu: 3, nv: 9, amp: 4, mat: 'tela_roja', punta: true, jirones: 0.3, fase: a.r() * 6 });
      if (v !== 'gallardete') ps.push(a.elipsoide(...add(bar, [0, 0, 1.2]), 1.6, 12, 0.9, { mat: N }));
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ soldados congelados en el hielo
  {
    id: 'nie2_soldado_hielo', nombre: ['Soldado congelado', 'Frozen soldier'], tema: 'nieve', variantes: ['de_pie', 'atacando', 'arrodillado', 'barbaro', 'grupo'], huella: [2, 2], huellaPor: { grupo: [4, 4] }, bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [manto(a, 24, 22, 6, N, 3)];
      const uno = (x: number, y: number, tipo: string) => {
        const [cu, eq, acc, f] = tipo === 'atacando' ? [CUERPOS.soldado, EQUIPOS.caballero, 'atacar', 5] : tipo === 'arrodillado' ? [CUERPOS.soldado_moreno, EQUIPOS.soldado, 'morir', 3] : tipo === 'barbaro' ? [CUERPOS.barbaro, EQUIPOS.barbaro_hacha, 'atacar', 2] : [CUERPOS.soldado, EQUIPOS.soldado_lanza, 'quieto', 0];
        ps.push(...hielo(cuerpo({ cu: cu as typeof CUERPOS.soldado, eq: eq as typeof EQUIPOS.soldado, acc: acc as 'quieto', f: f as number, dir: elegir(a, ['s', 'so', 'se']), t: [x, y, 0] })));
        // el bloque que lo envuelve por detrás y los costados, y agujas que salen del piso
        ps.push(pena(a, x - 7, y - 7, 26, 15 + a.r() * 4, 11, 32 + a.r() * 8, { mat: 'hielo', giro: 45, n: 10, tono: -0.05 }));
        for (let i = 0; i < 7; i++) { const t = (i / 7) * TAU + a.r(), d = 9 + a.r() * 5; if (Math.cos(t) + Math.sin(t) > 0.9 && i % 2) continue; ps.push(prisma(a, [x + Math.cos(t) * d, y + Math.sin(t) * d, -1], [Math.cos(t) * 0.5, Math.sin(t) * 0.5, 1], 12 + a.r() * 22, 2.5 + a.r() * 2.5, 'hielo', jit(a, 0.08))); }
        for (let i = 0; i < 3; i++) ps.push(prisma(a, [x + 4 + jit(a, 5), y + 4 + jit(a, 5), -1], [0.3 + jit(a, 0.3), 0.3 + jit(a, 0.3), 1], 6 + a.r() * 8, 2, 'hielo', 0.1));
        ps.push(manto(a, 12, 11, 4, 'hielo', 1.6, { x, y, tono: 0.05 }));
      };
      if (v === 'grupo') { uno(-14, -8, 'de_pie'); uno(12, -14, 'atacando'); uno(-2, 14, 'barbaro'); }
      else uno(0, 0, v);
      ps.push(suelo(a));
      return ps;
    },
  },
);

/** Colmillo de marfil que nace en b, avanza hacia `fw` y se curva hacia `arriba` (y un poco de lado). */
function colmillo(ps: Pieza[], b: V3, fw: V3, arriba: V3, lado: V3, L: number, r: number, mat = 'nie2_marfil') {
  const cs: Comp[] = []; let p = b;
  for (let i = 1; i <= 7; i++) { const t = i / 7, q = add(add(add(add(b, fw, L * (0.95 * t - 0.35 * t * t * t)), arriba, L * 0.62 * t * t), lado, L * 0.22 * Math.sin(PI * t)), [0, 0, 0]); cs.push(hueso(p, q, r * (1 - (i - 1) / 7 * 0.75), r * (1 - t * 0.75) + 0.2)); p = q; }
  ps.push(masa(cs, { mat, suave: r * 0.4 }));
}
/** Mamut tendido de costado (lomo hacia -y, patas hacia +y), cabeza hacia +x. */
function mamut(a: Arma, ps: Pieza[], estado: 'entero' | 'descarnado') {
  const L = 'nie2_lana', cs: Comp[] = [];
  const des = estado === 'descarnado';
  if (!des) cs.push(bulto([0, -2, 21], [40, 22, 21], { mat: L }));
  else cs.push(bulto([-24, -2, 20], [20, 21, 20], { mat: L }), bulto([26, -2, 21], [16, 21, 20], { mat: L }), bulto([0, -10, 12], [22, 10, 10], { mat: 'carne' }));
  cs.push(bulto([-8, -14, 30], [24, 12, 14], { mat: L }), bulto([44, -1, 24], [14, 14, 15], { mat: L }), bulto([47, -6, 35], [9, 9, 8], { mat: L }));
  // la trompa enroscada en la nieve y las orejas chicas
  cs.push(hueso([56, 2, 18], [62, 8, 9], 5.5, 4.4, { mat: L }), hueso([62, 8, 9], [58, 16, 3], 4.4, 3, { mat: L }), hueso([58, 16, 3], [50, 18, 2], 3, 1.8, { mat: L }));
  cs.push(bulto([38, -6, 38], [5, 3, 6], { mat: L }));
  // patas hacia adelante (de costado), con las plantas
  for (const [x, z, k] of [[-28, 10, 1], [-22, 26, 0.9], [26, 12, 1], [32, 28, 0.9]] as [number, number, number][]) { const pie: V3 = [x + jit(a, 4), 40 * k, z * 0.5 + 4]; cs.push(hueso([x, 10, z], pie, 8 * k, 6.5 * k, { mat: L }), bulto(add(pie, [0, 2, 0]), [6.5 * k, 3.5, 6.5 * k], { mat: 'cu_cuero_negro' })); }
  // flecos de lana que caen al piso por la panza y el lomo
  for (let i = 0; i < 9; i++) cs.push(bulto([-34 + i * 8 + jit(a, 2), 16 + jit(a, 2), 6 + a.r() * 4], [5, 4, 6], { mat: L, tono: -0.06 }));
  cs.push(hueso([-40, -4, 20], [-50, -2, 8], 2.4, 1.2, { mat: L }));
  ps.push(masa(cs, { mat: L, suave: 6 }));
  if (des) costillar(a, ps, [2, -16, 22], 34, 20, 0, { alto: 20, n: 7, grueso: 1.5, rotas: 0.15 });
  for (const s of [-1, 1]) ps.push(a.elipsoide(51, -1 + s * 9, 29, 1.4, 1, 1.2, { mat: 'negro' }));
  colmillo(ps, [56, 4, 15], [1, 0.1, 0], [0, 0, 1], [0, 1, 0], 36, 3.2);
  colmillo(ps, [55, -6, 20], [1, -0.2, 0.1], [0, -0.3, 1], [0, -1, 0], 34, 3);
  // la nieve que lo cubre de a poco y las lanzas de la cacería
  const nv: Comp[] = [];
  for (let i = 0; i < 6; i++) nv.push(bulto([-30 + i * 13 + jit(a, 3), -6 + jit(a, 4), 40 + jit(a, 2) - Math.abs(i - 2) * 1.5], [10, 9, 3], { giro: jit(a, 30) }));
  ps.push(masa(nv, { mat: N, suave: 3 }));
  for (let i = 0; i < 3; i++) { const p: V3 = [-14 + i * 14 + jit(a, 4), 6 + jit(a, 3), 28 + jit(a, 4)], q = add(p, [jit(a, 8), 14 + a.r() * 8, 24 + a.r() * 10]); ps.push(a.palo(p, q, 0.9, { mat: 'madera' }), a.palo(add(p, sub(p, q), 0.08), p, 1.2, { mat: 'hierro', r1: 0.2 })); }
  ps.push(manto(a, 70, 40, 10, N, 6), sangre(a, 20, 30, 18));
}

registrar(
  // ------------------------------------------------------------------ mamut muerto
  {
    id: 'nie2_mamut', nombre: ['Mamut muerto', 'Dead mammoth'], tema: 'nieve', variantes: ['entero', 'descarnado', 'esqueleto', 'craneo'], huella: [7, 5], huellaPor: { craneo: [4, 3] }, bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      if (v === 'entero' || v === 'descarnado') mamut(a, ps, v);
      else if (v === 'esqueleto') {
        ps.push(manto(a, 66, 36, 10, N, 5));
        costillar(a, ps, [-4, 0, 30], 60, 24, 0, { alto: 30, n: 9, grueso: 1.8, rotas: 0.2 });
        ps.push(masa([bulto([-40, 0, 18], [9, 14, 10]), bulto([-36, 0, 26], [5, 8, 6])], { mat: 'hueso', suave: 3 }));
        craneoBestia(a, ps, [36, 0, 22], 10, 0, { cuernos: 'ninguno', incl: 25 });
        colmillo(ps, [50, 6, 12], [1, 0.3, 0], [0, 0, 1], [0, 1, 0], 40, 3.4); colmillo(ps, [50, -6, 12], [1, -0.3, 0], [0, 0, 1], [0, -1, 0], 40, 3.4);
        for (let i = 0; i < 4; i++) { const p: V3 = [-30 + i * 18 + jit(a, 5), 22 + jit(a, 8), 2], q = add(p, [jit(a, 10), 14 + jit(a, 6), 0.5]); huesoLargo(ps, p, q, 2.4); }
        for (let i = 0; i < 5; i++) ps.push(a.elipsoide(-20 + i * 12 + jit(a, 4), jit(a, 6), 41 + jit(a, 2), 6, 5, 1.6, { mat: N }));
      } else {
        ps.push(manto(a, 34, 26, 6, N, 5));
        craneoBestia(a, ps, [-4, 0, 12], 11, 20, { cuernos: 'ninguno', incl: 15 });
        colmillo(ps, [14, 8, 4], [0.7, 0.7, 0], [0, 0, 1], [-0.7, 0.7, 0], 38, 3.4); colmillo(ps, [16, -4, 6], [0.9, -0.3, 0], [0, 0, 1], [0.3, -0.9, 0], 36, 3.2);
        ps.push(a.elipsoide(-6, 0, 21, 9, 8, 2.6, { mat: N }));
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ trineos
  {
    id: 'nie2_trineo', nombre: ['Trineo', 'Sled'], tema: 'nieve', variantes: ['carga', 'pieles', 'lena', 'volcado', 'roto'], huella: [3, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [manto(a, 30, 18, 5, N, 2.5)], loc: Pieza[] = [];
      const roto = v === 'roto';
      for (const s of [-1, 1]) {
        if (roto && s > 0) { loc.push(masa([hueso([-22, s * 8, 1.4], [-2, s * 8, 1.4], 1.3, 1.3)], { mat: 'madera', suave: 1 })); continue; }
        loc.push(masa([hueso([-22, s * 8, 1.4], [14, s * 8, 1.4], 1.3, 1.3), hueso([14, s * 8, 1.4], [21, s * 8, 4], 1.3, 1.2), hueso([21, s * 8, 4], [22, s * 8, 10], 1.2, 1.1), hueso([22, s * 8, 10], [19, s * 8, 12], 1.1, 1)], { mat: 'madera', suave: 1 }));
        for (const x of [-18, -6, 6]) loc.push(a.palo([x, s * 8, 1.6], [x, s * 7.5, 7.4], 0.9, { mat: 'madera' }));
        loc.push(a.palo([-22, s * 8, 13], [-21, s * 8, 2], 0.8, { mat: 'madera' }));
      }
      for (let i = 0; i < 6; i++) { if (roto && (i === 2 || i === 4)) continue; loc.push(a.caja(-4, -6.5 + i * 2.6, 7.4, 36, 2.2, 1.2, { mat: 'madera_vieja', tono: jit(a, 0.06), giro: jit(a, 1.5) })); }
      loc.push(a.palo([-22, -8, 13], [-22, 8, 13], 0.8, { mat: 'madera' }));
      if (v === 'carga' || v === 'volcado') {
        loc.push(a.caja(-10, -2, 8.6, 13, 11, 10, { mat: 'madera_vieja', giro: jit(a, 6) }), a.caja(-10, -2, 8.6, 13.4, 1.2, 10.2, { mat: 'hierro_oxido', giro: jit(a, 6) }));
        loc.push(masa([bulto([5, -3, 13], [6, 4.5, 5]), bulto([5, -2, 18], [2, 2, 2])], { mat: 'cu_tela_parda', suave: 2 }), masa([bulto([7, 4, 12.5], [5.5, 4, 4.5])], { mat: 'cu_tela_blanca', suave: 2 }));
        loc.push(a.cilindro(-4, 5, 8.6, 4, 9, { mat: 'madera', r1: 3.6 }));
        loc.push(a.palo([-16, -9, 9], [0, 0, 20], 0.4, { mat: 'cuerda' }), a.palo([0, 0, 20], [12, 9, 9], 0.4, { mat: 'cuerda' }));
      } else if (v === 'pieles') {
        for (let i = 0; i < 4; i++) loc.push(masa([bulto([-4 + jit(a, 3), jit(a, 2), 10 + i * 2.6], [17 - i * 2, 8.5 - i, 1.6], { giro: jit(a, 20) }), bulto([-4 + jit(a, 3), 9 + jit(a, 1), 8 + i * 2], [6, 2, 4], {})], { mat: elegir(a, ['a45_piel', 'cu_pelaje', 'cu_pelaje_gris']), suave: 2 }));
      } else if (v === 'lena') {
        for (let k = 0; k < 3; k++) for (let i = 0; i < 4 - k; i++) tronco(a, loc, [-18, -5.5 + i * 3.6 + k * 1.8, 10.5 + k * 3.2], [8 + jit(a, 2), -5.5 + i * 3.6 + k * 1.8, 10.5 + k * 3.2], 1.8, { mat: 'nie2_tronco', nudos: 0 });
        hacha(a, loc, [10, 4, 9], [14, -2, 14], 0.8);
      }
      if (v !== 'volcado') { for (let i = 0; i < 3; i++) loc.push(a.elipsoide(-10 + i * 9, jit(a, 3), v === 'lena' ? 20 : 19, 5, 4, 1.2, { mat: N })); ps.push(...loc); }
      else {
        // volcado de costado: la carga desparramada en la nieve
        ps.push(...transformar(loc, rotM(10, 82), [0, -8, 8]));
        ps.push(a.caja(6, 14, 0, 13, 11, 10, { mat: 'madera_vieja', giro: 30, incl: 8 }), masa([bulto([-8, 16, 3], [6, 4.5, 4])], { mat: 'cu_tela_parda', suave: 2 }), a.cilindro(-18, 12, 4, 4, 9, { mat: 'madera', eje: [0.3, 1, 0] }));
      }
      ps.push(a.palo([22, 0, 10], [32, 6, 1], 0.4, { mat: 'cuerda' }));
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ hogueras
  {
    id: 'nie2_hoguera', nombre: ['Hoguera del campamento', 'Camp bonfire'], tema: 'nieve', variantes: ['piedras', 'pira', 'asador', 'caldero', 'brasas'], cuadros: 8, t: 3, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      // la nieve derretida alrededor: barro oscuro y un anillo de nieve sucia
      ps.push(manto(a, 26, 24, 6, 'nie2_nieve_sucia', 2.5), manto(a, 16, 15, 4, 'tierra', 1.2, { tono: -0.12 }));
      let zf = 2, s = 2.2, al = 1;
      if (v !== 'pira') for (let i = 0; i < 9; i++) { const t = (i / 9) * TAU + jit(a, 0.15); ps.push(...roca(a, [Math.cos(t) * 11, Math.sin(t) * 11, 2], [3.4 + a.r(), 2.8, 2.6 + a.r()], { mat: 'nie2_roca', n: 3, facetas: 1 })); }
      if (v === 'pira') {
        for (let i = 0; i < 9; i++) { const t = (i / 9) * TAU + jit(a, 0.2); tronco(a, ps, [Math.cos(t) * 13, Math.sin(t) * 13, 1], [Math.cos(t) * 2, Math.sin(t) * 2, 26 + a.r() * 4], 2.3, { mat: i % 3 ? 'nie2_tronco' : 'a45_carbon', nudos: 0 }); }
        zf = 4; s = 3.2; al = 1.25;
      } else if (v === 'brasas') { s = 1; al = 0.8; }
      else for (let i = 0; i < 4; i++) { const t = (i / 4) * TAU + a.r(); tronco(a, ps, [Math.cos(t) * 9, Math.sin(t) * 9, 1.5], [Math.cos(t + PI) * 3, Math.sin(t + PI) * 3, 4], 1.8, { mat: 'a45_carbon', nudos: 0 }); }
      brasas(a, ps, [0, 0, 0.5], v === 'brasas' ? 10 : 8, f, 8);
      fuego(a, ps, [0, 0, zf], s, f, 8, { alto: al, lenguas: v === 'brasas' ? 3 : 5 });
      let cz = zf + s * 4;
      if (v === 'asador') {
        for (const sg of [-1, 1]) { const b: V3 = [sg * 15, -sg * 15, 0]; ps.push(a.palo(b, add(b, [0, 0, 22]), 1, { mat: 'madera' }), a.palo(add(b, [0, 0, 18]), add(b, [sg * 3, sg * 3, 24]), 0.7, { mat: 'madera' }), a.palo(add(b, [0, 0, 18]), add(b, [-sg * 3, -sg * 3, 24]), 0.7, { mat: 'madera' })); }
        ps.push(a.palo([-17, 17, 20.5], [17, -17, 20.5], 0.7, { mat: 'madera_lisa' }));
        // la pieza de carne gira en el asador
        const g = ciclo(f, 8) * 360;
        ps.push(...transformar([masa([bulto([0, 0, 0], [8, 4.5, 4]), bulto([6, 1, 1], [3.5, 3, 3]), hueso([-6, 0, 1], [-11, 0, 3], 1.4, 0.8, { mat: 'hueso' })], { mat: 'cu_cuero', suave: 2.5 })], [nor([1, -1, 0]), nor([1, 1, 0]), [0, 0, 1]].map((e, i) => i === 0 ? e : nor(add(esc(e as V3, Math.cos(rad(g))), cruz(nor([1, -1, 0]), e as V3), Math.sin(rad(g))))) as [V3, V3, V3], [0, 0, 20.5]));
      } else if (v === 'caldero') {
        for (let i = 0; i < 3; i++) { const t = (i / 3) * TAU + 0.3; ps.push(a.palo([Math.cos(t) * 17, Math.sin(t) * 17, 0], [0, 0, 40], 1, { mat: 'madera' })); }
        cadena(a, ps, [[0, 0, 40], [0, 0, 27]], 2.2, 0.45);
        ps.push(masa([bulto([0, 0, 20], [8, 8, 7]), hueso([0, 0, 24], [0, 0, 27], 7.4, 7)], { mat: 'hierro', suave: 2 }), a.cilindro(0, 0, 26.4, 6.6, 0.8, { mat: 'agua_sucia' }));
        for (let i = 0; i < 3; i++) { const u = ciclo(f + i * 2.7, 8); ps.push(a.elipsoide(jit(a, 3), jit(a, 3), 29 + u * 16, 2 + u * 4, 2 + u * 4, 1.6 + u * 2, { mat: 'nie2_humo', tono: 0.25 - u * 0.4 })); }
        cz = 12;
      }
      ps.push(suelo(a));
      return { piezas: ps, resplandor: { c: [0, 0, cz], r: v === 'pira' ? 70 : v === 'brasas' ? 34 : 54, color: '#ff8a30' } };
    },
  },
  // ------------------------------------------------------------------ túmulos
  {
    id: 'nie2_tumulo', nombre: ['Túmulo bárbaro', 'Barbarian burial mound'], tema: 'nieve', variantes: ['piedras', 'espada', 'gran', 'guerrero', 'nevado'], huella: [4, 3], huellaPor: { gran: [6, 5] }, bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const gran = v === 'gran', L = gran ? 40 : 24, W = gran ? 28 : 16, H = gran ? 22 : 11;
      const cs: Comp[] = [bulto([0, 0, 0], [L, W, H], { mat: 'tierra' })];
      for (let i = 0; i < 6; i++) cs.push(bulto([jit(a, L * 0.6), jit(a, W * 0.5), H * 0.5], [L * 0.4, W * 0.4, H * 0.5], { mat: 'tierra', giro: a.r() * 180 }));
      // manto de nieve arriba, con la tierra que asoma a los costados
      const nv = v === 'nevado' ? 1 : 0.65;
      for (let i = 0; i < 6; i++) cs.push(bulto([jit(a, L * 0.5), jit(a, W * 0.35), H * (0.75 + a.r() * 0.15)], [L * 0.45 * nv + 4, W * 0.45 * nv + 3, H * 0.35], { mat: N, k: 3 }));
      ps.push(masa(cs, { mat: 'tierra', suave: 5 }));
      const n = gran ? 16 : 11;
      for (let i = 0; i < n; i++) { const t = (i / n) * TAU; ps.push(pena(a, Math.cos(t) * (L + 3), Math.sin(t) * (W + 3), 2, 3.5 + a.r() * 2.5, 3 + a.r() * 2, 3 + a.r() * 3, { mat: 'nie2_roca' })); }
      if (v === 'piedras') { let z = H - 1; for (let i = 0; i < 4; i++) { ps.push(pena(a, jit(a, 1), jit(a, 1), z + 2.5, 6 - i, 5 - i, 3, { mat: 'nie2_roca' })); z += 4.5; } ps.push(a.elipsoide(0, 0, z, 2.5, 2.5, 1.2, { mat: N })); }
      if (v === 'espada') { espada(a, ps, [2, 0, H - 3], [jit(a, 0.15), jit(a, 0.15), 1], 30); escudo(a, ps, [-6, 6, H * 0.55], 7, [-0.3, 1, 1.5]); casco(a, ps, [8, -3, H - 3], true); }
      if (v === 'guerrero') {
        hacha(a, ps, [-6, -2, H - 3], [-4, -1, H + 22], 1.1, true); casco(a, ps, [4, 2, H - 1.5], true, 'hierro');
        for (let i = 0; i < 5; i++) craneo(a, ps, [-L * 0.5 + i * L * 0.25, W * 0.8 + jit(a, 2), 3], 2.8, 45 + jit(a, 20), { incl: jit(a, 15) });
      }
      if (gran) {
        // la entrada de tres piedras con el hueco negro, y piedras paradas a los lados
        const x = L * 0.55, y = W * 0.55;
        ps.push(a.caja(x, y, 0, 18, 16, 20, { mat: 'negro', giro: -45 }));
        for (const s of [-1, 1]) ps.push(pena(a, x + s * 9 * 0.7, y - s * 9 * 0.7, 10, 3.5, 3.5, 12, { mat: 'nie2_piedra_runa', giro: 45 }));
        ps.push(pena(a, x, y, 22, 14, 4, 3.5, { mat: 'nie2_piedra_runa', giro: -45 }), a.elipsoide(x, y, 25, 10, 3, 1.4, { mat: N, giro: -45 }));
        for (const [px, py] of [[-L - 10, 6], [-6, -W - 10], [L * 0.2, -W - 8]]) piedraRunica(a, ps, [px, py, 0], 26 + a.r() * 10, 10, a.r() * 180, { runas: 'negro' });
      }
      if (v === 'nevado') piedraRunica(a, ps, [-L * 0.75, -W * 0.3, 0], 26, 11, 30, { runas: 'negro' });
      ps.push(manto(a, L + 10, W + 8, 7, N, 2.5));
      ps.push(suelo(a));
      return ps;
    },
  },
  // ------------------------------------------------------------------ piedras rúnicas
  {
    id: 'nie2_piedra_runica', nombre: ['Piedra rúnica', 'Rune stone'], tema: 'nieve', variantes: ['alta', 'partida', 'dolmen', 'sangre', 'caida'], huella: [2, 2], huellaPor: { dolmen: [4, 3] }, bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [manto(a, 18, 15, 5, N, 2.5)];
      if (v === 'alta') piedraRunica(a, ps, [0, 0, -1], 46 + a.r() * 8, 15, 30 + jit(a, 20), { runas: 'negro' });
      else if (v === 'partida') { piedraRunica(a, ps, [0, 0, -1], 44, 15, 30, { runas: 'negro', partida: true }); ps.push(...transformar([a.poliedro([[-7, -3, 0], [7, -3, 0], [-7, 3, 0], [7, 3, 0], [-6, -3, 18], [5, -3, 16], [-6, 3, 18], [5, 3, 16]], { mat: 'nie2_piedra_runa' })], rotM(20, 0, 84), [10, 14, 3])); }
      else if (v === 'sangre') { piedraRunica(a, ps, [0, 0, -1], 40, 16, 30, { runas: 'nie2_sangre_helada' }); craneo(a, ps, [8, 10, 3], 3, 60, { incl: 20 }); ps.push(sangre(a, 6, 8, 8)); }
      else if (v === 'caida') { const loc: Pieza[] = []; piedraRunica(a, loc, [0, 0, 0], 44, 15, 0, { runas: 'negro', nieve: false, incl: 0 }); ps.push(...transformar(loc, rotM(30, -86), [0, -6, 3])); ps.push(a.elipsoide(4, 10, 5, 12, 5, 2, { mat: N, giro: 30 })); }
      else {
        for (const s of [-1, 1]) piedraRunica(a, ps, [s * 14, -s * 5, -1], 30, 12, 75 + jit(a, 8), { runas: 'negro', nieve: false, incl: 0 });
        ps.push(pena(a, 0, 0, 30, 24, 10, 5, { mat: 'nie2_piedra_runa', giro: -20 }), a.elipsoide(0, 0, 34, 18, 7, 2.2, { mat: N, giro: -20 }));
        ps.push(manto(a, 30, 20, 6, N, 3));
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'nie2_runa_viva', nombre: ['Piedra rúnica encendida', 'Glowing rune stone'], tema: 'nieve', variantes: ['alta', 'circulo', 'arco'], cuadros: 8, t: 4, huella: [2, 2], huellaPor: { circulo: [5, 5], arco: [4, 2] }, bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const brillo = 0.5 + 0.5 * onda(f, 8);
      const viva = (c: V3, alto: number, ancho: number, giro: number, fase = 0) => { const loc: Pieza[] = []; piedraRunica(a, loc, c, alto, ancho, giro, { runas: 'runa', incl: jit(a, 4) }); ps.push(...loc.map((p) => (p.mat === 'runa' ? { ...p, tono: -0.3 + (0.5 + 0.5 * onda(f, 8, fase)) * 0.45 } : p))); };
      if (v === 'alta') { ps.push(manto(a, 18, 15, 5, N, 2.5)); viva([0, 0, -1], 50, 16, 30); }
      else if (v === 'circulo') {
        ps.push(manto(a, 44, 40, 9, N, 3), manto(a, 18, 16, 4, 'hielo', 0.8, { tono: 0.1 }));
        for (let i = 0; i < 6; i++) { const t = (i / 6) * TAU; viva([Math.cos(t) * 32, Math.sin(t) * 32, -1], 30 + a.r() * 12, 11, deg(t) + 90, i); }
        ps.push(a.cilindro(0, 0, 0.6, 7, 0.4, { mat: 'runa', tono: -0.4 + brillo * 0.4 }));
      } else {
        ps.push(manto(a, 30, 16, 6, N, 3));
        for (const s of [-1, 1]) viva([s * 16, 0, -1], 40, 12, 0, s);
        ps.push(pena(a, 0, 0, 40, 26, 6, 4.5, { mat: 'nie2_piedra_runa', giro: 0 }), a.elipsoide(0, 0, 44, 20, 5, 2, { mat: N }));
        for (let i = 0; i < 5; i++) runa(a, ps, [-12 + i * 6, 3.2, 40], [1, 0, 0], [0, 1, 0], 2.4, 'runa', -0.3 + brillo * 0.4);
        // la luz entre las piedras: un velo que respira
        ps.push(a.caja(0, 0, 0, 18, 0.6, 36 * (0.85 + brillo * 0.1), { mat: 'cu_ectoplasma', tono: -0.35 + brillo * 0.2 }));
      }
      ps.push(suelo(a));
      return { piezas: ps, resplandor: { c: [0, 0, 18], r: v === 'circulo' ? 60 : 38, color: '#5ac8f0' } };
    },
  },
);
