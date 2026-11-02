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
        const brazo = [masa([hueso([6, 10, 0], [7, 9, 11], 2.4, 2), hueso([7, 9, 11], [5, 7.5, 19], 2, 1.6), bulto([4.6, 7.2, 21], [1.8, 2.3, 2.3]), ...[0, 1, 2, 3].map((k) => hueso([4.6, 7.2, 21.5], [3.2 + k * 1.1, 5.4 + k * 1.2, 25.5 + (k % 2)], 0.6, 0.4)), hueso([5.5, 8.2, 20.5], [7.5, 9.5, 23], 0.6, 0.4)], { mat: 'cu_piel_gris', suave: 0.9 })];
        ps.push(...tenir(brazo, 'nie2_m', '#5a7a90', 0.35, -0.1));
        ps.push(a.cilindro(6, 10, 0.5, 3.4, 4, { mat: 'cu_tela_parda', r1: 2.6 }));
        ps.push(a.cilindro(-6, -4, 0, 2.8, 8, { mat: 'hierro_oxido', r1: 2.4, incl: 40 }), a.elipsoide(-6, -2, 6, 3.2, 3.2, 2.4, { mat: 'hierro_oxido', tono: -0.1 }));
      }
      if (v === 'cuervos') { ps.push(sangre(a, 6, 14, 9)); ps.push(...cuerpo({ cu: CUERPOS.muerto, eq: EQUIPOS.preso, acc: 'morir', f: 7, m: rotM(20), t: [4, 16, 0], s: 0.95 })); cuervo(ps, [12, 22, 4], 200, true, 1.2); cuervo(ps, [-6, 20, 3.5], 30, true, 1.2); cuervo(ps, [16, 8, 1], 120, false, 1.1); }
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
