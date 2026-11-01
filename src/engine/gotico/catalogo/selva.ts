import { registrar, type Arma, type Pieza, type V3 } from '../objeto';
import { MATERIALES } from '../materiales';
import { ruido } from '../render';

/**
 * Selva y pantano: árboles enormes con raíces de tabla, palmeras, helechos gigantes, lianas, telarañas y capullos,
 * agua quieta, chozas en pilotes, muelles, canoas, tótems y altares tribales. Todo original.
 */

MATERIALES.selva_telarana = { rampa: ['#2e2f2b', '#46463f', '#605f56', '#7b796e', '#959285', '#aeab9c', '#c4c1b0'], ruido: 0.35, escala: 0.6 };
MATERIALES.selva_bambu = { rampa: ['#191a0b', '#2b2c12', '#3f3f1a', '#545322', '#6a682c', '#807c37', '#958f45'], ruido: 0.18, escala: 0.3, patron: (p) => ((((p[2] % 9) + 9) % 9) < 1 ? -0.35 : 0) };
MATERIALES.selva_flor = { rampa: ['#1c070b', '#330d13', '#4c141b', '#651c22', '#7e2629', '#963531', '#a8473a'], ruido: 0.3, escala: 0.4 };
MATERIALES.selva_copa = { rampa: ['#060b07', '#0c150d', '#132013', '#1a2c19', '#223920', '#2c4728', '#375632'], ruido: 0.55, escala: 0.45, patron: (p) => (ruido(p[0] * 0.55, p[1] * 0.55, p[2] * 0.55) > 0.68 ? -0.35 : (ruido(p[0] * 1.7, p[1] * 1.7, p[2] * 1.7) - 0.5) * 0.3) };
MATERIALES.selva_paja = { rampa: ['#15110a', '#231c10', '#332816', '#43351d', '#544325', '#65512e', '#776139'], ruido: 0.45, escala: 0.5, patron: (p) => (ruido(p[0] * 1.2, p[1] * 1.2, p[2] * 0.25) - 0.5) * 0.45 };
MATERIALES.selva_pintura = { rampa: ['#1e0d07', '#34160b', '#4c210f', '#652d14', '#7d3a1a', '#954a22'], ruido: 0.25, escala: 0.3 };

const PI2 = Math.PI * 2;
const deg = (r: number) => (r * 180) / Math.PI;
const jit = (a: Arma, k: number) => (a.r() - 0.5) * 2 * k;
/** Punto mirando hacia el ángulo `phi`: R hacia adelante, `lado` a la derecha, a la altura z. */
const frente = (phi: number, R: number, lado: number, z: number, cx = 0, cy = 0): V3 => [cx + Math.cos(phi) * R - Math.sin(phi) * lado, cy + Math.sin(phi) * R + Math.cos(phi) * lado, z];

/** Una hoja plana entre dos puntos (elipsoide orientado a lo largo del tramo). */
function hoja(a: Arma, p: V3, q: V3, ancho: number, grueso: number, mat: string, tono?: number): Pieza {
  const dx = q[0] - p[0], dy = q[1] - p[1], dz = q[2] - p[2];
  const h = Math.hypot(dx, dy), L = Math.hypot(h, dz);
  return a.elipsoide((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2, L / 2 + ancho * 0.25, ancho, grueso, { mat, giro: deg(Math.atan2(dy, dx)), incl: deg(Math.atan2(dz, h)), inclEje: 'y', tono });
}
/** Fronda que sale de `o` hacia `ang`, sube con `elev` (radianes) y se va doblando `caida` por tramo. */
function fronda(a: Arma, ps: Pieza[], o: V3, ang: number, largo: number, ancho: number, elev: number, caida: number, mat: string, n = 3, tono = 0): V3 {
  let p = o, e = elev;
  for (let i = 0; i < n; i++) {
    const L = largo / n;
    const q: V3 = [p[0] + Math.cos(ang) * Math.cos(e) * L, p[1] + Math.sin(ang) * Math.cos(e) * L, p[2] + Math.sin(e) * L];
    ps.push(hoja(a, p, q, Math.max(1.2, ancho * (1 - (i / n) * 0.55)), 1.1, mat, tono));
    p = q; e -= caida;
  }
  return p;
}
/** Llama de varias lenguas que cambian con el cuadro (de 6). */
function llama(a: Arma, ps: Pieza[], x: number, y: number, z: number, s: number, f: number, mat = 'fuego') {
  const fr = (k: number) => Math.sin((f / 6) * PI2 + k * 2.1);
  for (let k = 0; k < 3; k++) {
    const ang = (k / 3) * PI2 + f * 0.5;
    ps.push(a.cilindro(x + Math.cos(ang) * s * 0.5, y + Math.sin(ang) * s * 0.5, z, s * (0.95 - k * 0.12), s * (2.3 + fr(k) * 0.7 + k * 0.5), { mat, r1: 0.25 }));
  }
  ps.push(a.elipsoide(x, y, z + s * 0.3, s * 1.2, s * 1.2, s * 0.6, { mat, tono: 0.2 }));
}
/** Cráneo mirando hacia `phi` (radio s). */
function craneo(a: Arma, ps: Pieza[], x: number, y: number, z: number, s: number, phi = Math.PI / 4, mat = 'hueso') {
  ps.push(a.elipsoide(x, y, z, s, s * 0.95, s * 0.95, { mat, giro: deg(phi) }));
  const q = (R: number, l: number, zz: number) => frente(phi, R, l, z + zz, x, y);
  const m = q(s * 0.55, 0, -s * 0.75);
  ps.push(a.caja(m[0], m[1], m[2], s * 0.9, s * 1.0, s * 0.5, { mat, giro: deg(phi) + 90 }));
  for (const l of [-0.38, 0.38]) { const e = q(s * 0.72, l * s, s * 0.02); ps.push(a.esfera(e[0], e[1], e[2], s * 0.3, { mat: 'negro' })); }
  const n = q(s * 0.9, 0, -s * 0.35); ps.push(a.esfera(n[0], n[1], n[2], s * 0.16, { mat: 'negro' }));
}
/** Mancha de tierra irregular. */
function suelo(a: Arma, ps: Pieza[], r: number, mat = 'tierra', alto = 1.5) {
  ps.push(a.cilindro(0, 0, 0, r, alto, { mat, r1: r * 0.92 }));
  for (let i = 0; i < 4; i++) { const g = a.r() * PI2, d = r * (0.5 + a.r() * 0.4); ps.push(a.cilindro(Math.cos(g) * d, Math.sin(g) * d, 0, r * (0.3 + a.r() * 0.2), alto * 0.8, { mat, r1: r * 0.25 })); }
}
/** Agua quieta: varios discos bajos. */
function charca(a: Arma, ps: Pieza[], r: number, n = 4, mat = 'agua_sucia', z = 1.2) {
  ps.push(a.cilindro(0, 0, 0, r + 4, z * 0.5, { mat: 'tierra' }));
  ps.push(a.cilindro(0, 0, 0, r, z, { mat }));
  for (let i = 0; i < n; i++) { const g = a.r() * PI2, d = r * (0.45 + a.r() * 0.35), rr = r * (0.35 + a.r() * 0.25); ps.push(a.cilindro(Math.cos(g) * d, Math.sin(g) * d, 0, rr + 3.5, z * 0.5, { mat: 'tierra' }), a.cilindro(Math.cos(g) * d, Math.sin(g) * d, 0, rr, z, { mat })); }
}
/** Mata de juncos. */
function juncos(a: Arma, ps: Pieza[], x: number, y: number, n: number, alto: number) {
  for (let i = 0; i < n; i++) {
    const b: V3 = [x + jit(a, 3), y + jit(a, 3), 0];
    const t: V3 = [b[0] + jit(a, 5), b[1] + jit(a, 5), alto * (0.6 + a.r() * 0.5)];
    ps.push(a.palo(b, t, 0.75, { mat: 'pasto', r1: 0.4, tono: jit(a, 0.12) }));
    if (a.r() < 0.35) ps.push(a.elipsoide(t[0], t[1], t[2] - 3, 1.1, 1.1, 3, { mat: 'hongo', tono: -0.1 }));
  }
}

registrar(
  // ------------------------------------------------------------------ árbol de la selva
  {
    id: 'sel_arbol', nombre: ['Árbol de la selva', 'Jungle tree'], tema: 'selva', variantes: ['alto', 'ancho', 'raices'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const H = v === 'alto' ? 150 + a.r() * 30 : v === 'ancho' ? 108 + a.r() * 18 : 118 + a.r() * 16;
      const R = v === 'ancho' ? 64 : v === 'alto' ? 44 : 46;
      const r0 = v === 'alto' ? 8.5 : 10;
      suelo(a, ps, 34, 'tierra', 1.5);
      const top: V3 = [jit(a, 7), jit(a, 7), H];
      const mid: V3 = [top[0] * 0.4 + jit(a, 4), top[1] * 0.4 + jit(a, 4), H * 0.5];
      ps.push(a.cilindro(0, 0, 0, r0 + 4, 12, { mat: 'corteza', r1: r0 }));
      ps.push(a.palo([0, 0, 8], mid, r0, { mat: 'corteza', r1: r0 * 0.8 }), a.palo(mid, top, r0 * 0.8, { mat: 'corteza', r1: r0 * 0.5 }));
      // raíces de tabla
      const nr = 5 + Math.floor(a.r() * 3);
      for (let i = 0; i < nr; i++) {
        const g = (i / nr) * PI2 + a.r() * 0.6, c = Math.cos(g), s = Math.sin(g), px = -s * 1.5, py = c * 1.5;
        const L = (v === 'raices' ? 30 : 20) + a.r() * 12, h = (v === 'raices' ? 30 : 18) + a.r() * 14;
        const fin = (r1: number, z1: number, r2: number) => a.poliedro([[c * r1 + px, s * r1 + py, 0], [c * r1 - px, s * r1 - py, 0], [c * r1 + px, s * r1 + py, z1], [c * r1 - px, s * r1 - py, z1], [c * r2 + px * 0.5, s * r2 + py * 0.5, 0], [c * r2 - px * 0.5, s * r2 - py * 0.5, 0]], { mat: 'corteza', tono: -0.03 });
        ps.push(fin(r0 * 0.6, h, L * 0.55), fin(r0 * 0.6, h * 0.4, L));
        const e: V3 = [c * L, s * L, 1], e2: V3 = [c * (L + 8) + jit(a, 4), s * (L + 8) + jit(a, 4), 0.5];
        ps.push(a.palo(e, e2, 1.8, { mat: 'corteza', r1: 0.9 }));
      }
      if (v === 'raices') {
        // raíces aéreas que bajan del tronco
        for (let i = 0; i < 6; i++) {
          const g = a.r() * PI2, zz = 34 + a.r() * 30, d = 26 + a.r() * 14;
          const p0: V3 = [Math.cos(g) * r0 * 0.6 + mid[0] * zz / H, Math.sin(g) * r0 * 0.6 + mid[1] * zz / H, zz];
          const p1: V3 = [Math.cos(g) * d * 0.7, Math.sin(g) * d * 0.7, zz * 0.45];
          const p2: V3 = [Math.cos(g) * d, Math.sin(g) * d, 0];
          ps.push(a.palo(p0, p1, 2, { mat: 'corteza', r1: 1.8, tono: -0.05 }), a.palo(p1, p2, 1.8, { mat: 'corteza', r1: 2.4, tono: -0.05 }));
        }
      }
      // musgo en el tronco
      for (let i = 0; i < 4; i++) { const zz = 10 + a.r() * H * 0.6, g = Math.PI * 0.25 + jit(a, 1.2), k = zz / H; ps.push(a.elipsoide(top[0] * k * 0.7 + Math.cos(g) * r0 * 0.85, top[1] * k * 0.7 + Math.sin(g) * r0 * 0.85, zz, 3, 3, 5, { mat: 'musgo' })); }
      // ramas y copa
      const nb = v === 'ancho' ? 8 : 6;
      const copa: V3[] = [];
      for (let i = 0; i < nb; i++) {
        const g = (i / nb) * PI2 + a.r() * 0.6, d = R * (0.55 + a.r() * 0.3), bz = H - 4 + a.r() * 16;
        const b: V3 = [top[0] + Math.cos(g) * d, top[1] + Math.sin(g) * d, bz];
        ps.push(a.palo([top[0] * 0.9, top[1] * 0.9, H - 16 - a.r() * 14], b, r0 * 0.4, { mat: 'corteza', r1: r0 * 0.2 }));
        copa.push(b);
      }
      ps.push(a.elipsoide(top[0], top[1], H + 16, R * 0.5, R * 0.5, R * 0.22, { mat: 'selva_copa', tono: 0.04 }));
      for (let k = 0; k < 3; k++) { const g = a.r() * PI2; ps.push(a.elipsoide(top[0] + Math.cos(g) * R * 0.25, top[1] + Math.sin(g) * R * 0.25, H + 24 + a.r() * 6, R * 0.22, R * 0.22, R * 0.14, { mat: 'selva_copa', tono: 0.06 })); }
      for (const b of copa) {
        ps.push(a.elipsoide(b[0], b[1], b[2] + 4, R * 0.3 + a.r() * 5, R * 0.27 + a.r() * 5, R * 0.15 + a.r() * 3, { mat: 'selva_copa', giro: a.r() * 180, tono: jit(a, 0.06) }));
        for (let k = 0; k < 3; k++) { const g = a.r() * PI2, d = R * (0.2 + a.r() * 0.12); ps.push(a.elipsoide(b[0] + Math.cos(g) * d, b[1] + Math.sin(g) * d, b[2] + jit(a, 6) + 3, R * 0.15 + a.r() * 4, R * 0.15 + a.r() * 4, R * 0.1 + a.r() * 2, { mat: 'selva_copa', tono: jit(a, 0.08) })); }
        // por debajo, más oscuro
        ps.push(a.elipsoide(b[0] * 0.85 + top[0] * 0.15, b[1] * 0.85 + top[1] * 0.15, b[2] - 5, R * 0.24, R * 0.24, R * 0.09, { mat: 'selva_copa', tono: -0.12 }));
        // hojas que caen por el borde
        const ga = Math.atan2(b[1] - top[1], b[0] - top[0]);
        for (let k = 0; k < 3; k++) {
          const g = ga + jit(a, 0.9), e: V3 = [b[0] + Math.cos(g) * R * 0.3, b[1] + Math.sin(g) * R * 0.3, b[2] + 2];
          ps.push(hoja(a, e, [e[0] + Math.cos(g) * 9, e[1] + Math.sin(g) * 9, e[2] - 7], 3.6, 1, 'hojas_selva', -0.04 + jit(a, 0.06)));
        }
      }
      // lianas que cuelgan de la copa
      for (let i = 0; i < 5; i++) {
        const b = copa[i % copa.length], L = 20 + a.r() * 45;
        const p0: V3 = [b[0] * 0.85, b[1] * 0.85, b[2] - 6], p1: V3 = [p0[0] + jit(a, 3), p0[1] + jit(a, 3), p0[2] - L];
        ps.push(a.palo(p0, p1, 0.9, { mat: 'pasto', r1: 0.7 }));
        for (let k = 1; k < 4; k++) ps.push(a.elipsoide(p0[0] + (p1[0] - p0[0]) * k / 4, p0[1] + (p1[1] - p0[1]) * k / 4, p0[2] - L * k / 4, 2.2, 2.2, 1.6, { mat: 'hojas_selva', giro: a.r() * 180, tono: 0.05 }));
      }
      return ps;
    },
  },
  // ------------------------------------------------------------------ palmera
  {
    id: 'sel_palmera', nombre: ['Palmera', 'Palm tree'], tema: 'selva', variantes: ['recta', 'curva', 'doble'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 16, 'tierra', 1.2);
      const tronco = (dir: number, curva: number, H: number) => {
        const n = 10;
        let prev: V3 = [0, 0, 0];
        for (let i = 1; i <= n; i++) {
          const t = i / n, p: V3 = [Math.cos(dir) * curva * t * t, Math.sin(dir) * curva * t * t, H * t];
          const r = 4.4 - t * 1.4;
          ps.push(a.palo(prev, p, r + 0.3, { mat: 'corteza', r1: r, tono: i % 2 ? -0.06 : 0.04 }));
          prev = p;
        }
        // copa
        const nf = 9 + Math.floor(a.r() * 3);
        for (let k = 0; k < nf; k++) fronda(a, ps, [prev[0], prev[1], prev[2] + 1], (k / nf) * PI2 + a.r() * 0.5, 32 + a.r() * 10, 4.6, 0.45 + a.r() * 0.3, 0.5 + a.r() * 0.2, 'hojas_selva', 3, jit(a, 0.1));
        for (let k = 0; k < 3; k++) fronda(a, ps, [prev[0], prev[1], prev[2] + 1], a.r() * PI2, 20, 3.5, 1.15, 0.35, 'hojas_selva', 3, 0.08);
        for (let k = 0; k < 4; k++) { const g = a.r() * PI2; ps.push(a.esfera(prev[0] + Math.cos(g) * 3.5, prev[1] + Math.sin(g) * 3.5, prev[2] - 2.5, 2.4, { mat: 'hongo', tono: -0.15 })); }
        // hojas secas colgando
        for (let k = 0; k < 3; k++) { const g = a.r() * PI2; ps.push(hoja(a, [prev[0], prev[1], prev[2] - 1], [prev[0] + Math.cos(g) * 6, prev[1] + Math.sin(g) * 6, prev[2] - 18], 2.8, 1, 'hojas_otono', -0.1)); }
      };
      ps.push(a.cilindro(0, 0, 0, 6.5, 4, { mat: 'corteza', r1: 4.6 }));
      const dir = a.r() * PI2;
      if (v === 'recta') tronco(dir, 6, 98 + a.r() * 20);
      else if (v === 'curva') tronco(dir, 34, 88 + a.r() * 14);
      else { tronco(dir, 22, 104 + a.r() * 10); tronco(dir + 2 + a.r(), 20, 76 + a.r() * 10); }
      for (let i = 0; i < 4; i++) ps.push(a.elipsoide(jit(a, 12), jit(a, 12), 0, 4, 3, 3, { mat: 'hojas_selva', tono: -0.1 }));
      return ps;
    },
  },
  // ------------------------------------------------------------------ helecho gigante
  {
    id: 'sel_helecho', nombre: ['Helecho gigante', 'Giant fern'], tema: 'selva', variantes: ['mata', 'arborescente', 'seco'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 14, 'tierra', 1);
      let o: V3 = [0, 0, 2];
      if (v === 'arborescente') {
        const t: V3 = [jit(a, 4), jit(a, 4), 46 + a.r() * 10];
        ps.push(a.cilindro(0, 0, 0, 5, 5, { mat: 'corteza', r1: 3.5 }), a.palo([0, 0, 4], t, 3.4, { mat: 'corteza', r1: 2.8 }));
        for (let i = 0; i < 5; i++) ps.push(a.elipsoide(t[0] * i / 5, t[1] * i / 5, 8 + i * 8, 3.8, 3.8, 2.5, { mat: 'corteza_muerta', tono: -0.05 }));
        o = t;
      }
      const seco = v === 'seco';
      const nf = v === 'mata' ? 14 : 12;
      for (let k = 0; k < nf; k++) {
        const g = (k / nf) * PI2 + a.r() * 0.4;
        const L = v === 'mata' ? 40 + a.r() * 12 : v === 'seco' ? 30 + a.r() * 8 : 34 + a.r() * 8;
        fronda(a, ps, o, g, L, 3.6, v === 'arborescente' ? 0.55 : 1.05, v === 'arborescente' ? 0.5 : 0.42, seco && a.r() < 0.45 ? 'hojas_otono' : 'hojas_selva', 4, jit(a, 0.1) + (seco ? -0.16 : 0));
      }
      for (let k = 0; k < 4; k++) fronda(a, ps, o, a.r() * PI2, 16, 2.6, 1.35, 0.3, 'hojas_selva', 3, 0.12);
      if (seco) for (let k = 0; k < 4; k++) ps.push(hoja(a, [jit(a, 14), jit(a, 14), 0.5], [jit(a, 18), jit(a, 18), 0.8], 2.8, 0.8, 'hojas_otono', -0.25));
      return ps;
    },
  },
  // ------------------------------------------------------------------ cortina de lianas
  {
    id: 'sel_lianas', nombre: ['Cortina de lianas', 'Vine curtain'], tema: 'selva', variantes: ['cortina', 'arco'], huella: [5, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      for (const s of [-1, 1]) {
        const b: V3 = [s * 34, jit(a, 2), 0], t: V3 = [s * 31 + jit(a, 2), jit(a, 3), 86];
        ps.push(a.cilindro(b[0], b[1], 0, 7.5, 6, { mat: 'corteza', r1: 4.8 }), a.palo(b, t, 4.8, { mat: 'corteza', r1: 3.8 }));
        for (let i = 0; i < 3; i++) { const g = a.r() * PI2; ps.push(a.palo([b[0], b[1], 3], [b[0] + Math.cos(g) * 12, b[1] + Math.sin(g) * 12, 0], 2, { mat: 'corteza', r1: 1 })); }
      }
      ps.push(a.palo([-38, 0, 80], [38, 0, 84], 3.6, { mat: 'corteza', r1: 3.2 }));
      // una masa de follaje sobre la rama y las copas de los troncos
      for (let i = 0; i < 9; i++) {
        const x = -40 + i * 10 + jit(a, 3), extremo = Math.abs(x) > 26;
        ps.push(a.elipsoide(x, jit(a, 4), 88 + (extremo ? 6 : 0) + jit(a, 3), (extremo ? 13 : 9) + a.r() * 3, (extremo ? 12 : 8) + a.r() * 3, (extremo ? 9 : 6) + a.r() * 2, { mat: 'selva_copa', giro: a.r() * 180, tono: jit(a, 0.06) }));
      }
      for (let i = 0; i < 14; i++) {
        const x = -42 + a.r() * 84, g = Math.PI * 0.5 + jit(a, 1.4), e: V3 = [x, 6, 84 + a.r() * 6];
        ps.push(hoja(a, e, [e[0] + Math.cos(g) * 9, e[1] + Math.sin(g) * 9, e[2] - 8], 3.4, 1, 'hojas_selva', jit(a, 0.08)));
      }
      const n = 13;
      for (let i = 0; i < n; i++) {
        const x = -27 + (i * 54) / (n - 1) + jit(a, 1.5);
        const centro = Math.abs(x) < 15;
        const L = v === 'arco' && centro ? 8 + a.r() * 12 : 42 + a.r() * 38;
        const y0 = 3 + jit(a, 2.5), z0 = 82;
        let p: V3 = [x, y0, z0];
        const tramos = 3;
        for (let k = 0; k < tramos; k++) {
          const q: V3 = [p[0] + jit(a, 2), p[1] + jit(a, 1.5) + 0.6, p[2] - L / tramos];
          if (q[2] < 1) { q[2] = 1; }
          if (p[2] - q[2] < 2) break;
          ps.push(a.palo(p, q, 0.9, { mat: 'pasto', r1: 0.75, tono: -0.08 }));
          for (let j = 0; j < 2; j++) {
            const t = (j + 0.5) / 2, m: V3 = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t], s = j % 2 ? 1 : -1;
            ps.push(hoja(a, m, [m[0] + s * 3.5, m[1] + 2, m[2] - 2.5], 1.8, 0.8, 'hojas_selva', 0.06));
          }
          p = q;
        }
        if (p[2] < 6) ps.push(a.elipsoide(p[0], p[1], 0, 4, 3, 2, { mat: 'hojas_selva', tono: -0.08 }));
      }
      return ps;
    },
  },
  // ------------------------------------------------------------------ planta de hojas grandes
  {
    id: 'sel_planta_hojas', nombre: ['Planta de hojas grandes', 'Big-leaf plant'], tema: 'selva', variantes: ['verde', 'con_flor', 'joven'], huella: [2, 2], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 12, 'tierra', 1);
      const n = v === 'joven' ? 4 : 7;
      const esc = v === 'joven' ? 0.65 : 1;
      for (let i = 0; i < n; i++) {
        const g = (i / n) * PI2 + a.r() * 0.5, d = (9 + a.r() * 6) * esc, h = (14 + a.r() * 14) * esc;
        const b: V3 = [Math.cos(g) * d * 0.6, Math.sin(g) * d * 0.6, h];
        ps.push(a.palo([0, 0, 0], b, 0.9, { mat: 'pasto', r1: 0.7, tono: 0.05 }));
        const m: V3 = [b[0] + Math.cos(g) * 9 * esc, b[1] + Math.sin(g) * 9 * esc, b[2] + 2];
        const t: V3 = [m[0] + Math.cos(g) * 9 * esc, m[1] + Math.sin(g) * 9 * esc, b[2] - 6 * esc];
        ps.push(hoja(a, b, m, 7.5 * esc, 1.2, 'hojas_selva', jit(a, 0.08) + 0.04), hoja(a, m, t, 6 * esc, 1.1, 'hojas_selva', jit(a, 0.08)));
      }
      if (v === 'con_flor') {
        for (let i = 0; i < 2; i++) {
          const g = a.r() * PI2, t: V3 = [Math.cos(g) * 4, Math.sin(g) * 4, 30 + a.r() * 8];
          ps.push(a.palo([0, 0, 0], t, 0.8, { mat: 'pasto' }));
          for (let k = 0; k < 5; k++) { const gg = (k / 5) * PI2; ps.push(hoja(a, t, [t[0] + Math.cos(gg) * 5, t[1] + Math.sin(gg) * 5, t[2] + 2.5], 2.4, 1, 'selva_flor', 0.05)); }
          ps.push(a.esfera(t[0], t[1], t[2] + 1, 1.6, { mat: 'oro', tono: -0.15 }));
        }
      }
      return ps;
    },
  },
  // ------------------------------------------------------------------ árbol con telarañas
  {
    id: 'sel_arbol_telarana', nombre: ['Árbol con telarañas', 'Webbed tree'], tema: 'selva', variantes: ['telarana', 'con_capullos'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 24, 'tierra', 1.2);
      const puntas: V3[] = [];
      const rama = (o: V3, d: V3, r: number, nivel: number) => {
        const b: V3 = [o[0] + d[0], o[1] + d[1], o[2] + d[2]];
        ps.push(a.palo(o, b, r, { mat: 'corteza_muerta', r1: r * 0.68 }));
        if (nivel <= 0 || r < 1) { puntas.push(b); return; }
        const n = 2 + (a.r() < 0.4 ? 1 : 0);
        for (let i = 0; i < n; i++) {
          const g = a.r() * PI2, L = Math.hypot(...d) * (0.62 + a.r() * 0.25), sube = 0.12 + a.r() * 0.35;
          rama(b, [Math.cos(g) * L * (1 - sube), Math.sin(g) * L * (1 - sube), L * sube], r * 0.64, nivel - 1);
        }
      };
      ps.push(a.cilindro(0, 0, 0, 10, 7, { mat: 'corteza_muerta', r1: 6.5 }));
      rama([0, 0, 2], [jit(a, 6), jit(a, 6), 46], 6.8, 3);
      for (let i = 0; i < 5; i++) { const g = a.r() * PI2; ps.push(a.palo([0, 0, 3], [Math.cos(g) * 18, Math.sin(g) * 18, 0], 2.6, { mat: 'corteza_muerta', r1: 1 })); }
      const hebra = (p: V3, q: V3, t = 0) => ps.push(a.palo(p, q, 0.55, { mat: 'selva_telarana', tono: t }));
      // la tela de rueda, de frente a la cámara, delante del tronco
      const u: V3 = [Math.SQRT1_2, -Math.SQRT1_2, 0];
      const c: V3 = [11 + jit(a, 3), 11 + jit(a, 3), 36 + jit(a, 4)];
      const nr = 9, anclas: V3[] = [];
      for (let i = 0; i < nr; i++) {
        const g = (i / nr) * PI2 + jit(a, 0.15), r = 19 + a.r() * 9;
        anclas.push([c[0] + u[0] * Math.cos(g) * r, c[1] + u[1] * Math.cos(g) * r, Math.max(0.5, c[2] + Math.sin(g) * r)]);
      }
      for (const p of anclas) hebra(c, p);
      for (const k of [0.3, 0.55, 0.8]) for (let i = 0; i < nr; i++) {
        const p = anclas[i], q = anclas[(i + 1) % nr];
        hebra([c[0] + (p[0] - c[0]) * k, c[1] + (p[1] - c[1]) * k, c[2] + (p[2] - c[2]) * k], [c[0] + (q[0] - c[0]) * k, c[1] + (q[1] - c[1]) * k, c[2] + (q[2] - c[2]) * k], -0.12);
      }
      // amarras a las ramas y al piso
      for (const p of anclas) {
        if (p[2] > 30) { let m = puntas[0], dm = Infinity; for (const q of puntas) { const d = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]); if (d < dm) { dm = d; m = q; } } hebra(p, m, -0.15); }
        else if (p[2] < 18) hebra(p, [p[0] + jit(a, 6), p[1] + jit(a, 6), 0], -0.15);
      }
      if (v === 'con_capullos') {
        const altas = puntas.filter((p) => p[2] > 35).slice(0, 4);
        for (const p of altas) {
          const L = 8 + a.r() * 10, z = p[2] - L - 10;
          hebra(p, [p[0], p[1], z + 10]);
          ps.push(a.elipsoide(p[0], p[1], z, 4.5, 4.5, 10, { mat: 'selva_telarana', giro: a.r() * 90 }));
          for (const dz of [-4, 2]) ps.push(a.elipsoide(p[0], p[1], z + dz, 4.9, 4.9, 1.3, { mat: 'selva_telarana', tono: -0.12 }));
        }
      }
      return ps;
    },
  },
  // ------------------------------------------------------------------ capullos
  {
    id: 'sel_capullo', nombre: ['Capullos de araña', 'Spider cocoons'], tema: 'selva', variantes: ['colgado', 'suelo', 'roto'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 16, 'tierra', 1);
      const hebra = (p: V3, q: V3) => ps.push(a.palo(p, q, 0.6, { mat: 'selva_telarana' }));
      const capullo = (x: number, y: number, z: number, h: number, incl = 0, giro = 0) => {
        ps.push(a.elipsoide(x, y, z, h * 0.42, h * 0.4, h, { mat: 'selva_telarana', incl, giro }));
        for (let k = -1; k <= 1; k++) ps.push(a.elipsoide(x, y, z + k * h * 0.45, h * 0.4, h * 0.38, h * 0.12, { mat: 'selva_telarana', tono: -0.12, incl, giro }));
      };
      if (v === 'colgado') {
        // horca de rama seca
        const t: V3 = [-6, -4, 70];
        ps.push(a.cilindro(-8, -6, 0, 5, 4, { mat: 'corteza_muerta', r1: 3 }), a.palo([-8, -6, 0], t, 3, { mat: 'corteza_muerta', r1: 2.2 }));
        const p1: V3 = [10, 8, 66], p2: V3 = [-22, 2, 60];
        ps.push(a.palo(t, p1, 2, { mat: 'corteza_muerta', r1: 1.2 }), a.palo([-7, -5, 58], p2, 1.6, { mat: 'corteza_muerta', r1: 1 }));
        const c1 = 34 + a.r() * 6, c2 = 30 + a.r() * 6;
        hebra(p1, [p1[0], p1[1], c1 + 12]); capullo(p1[0], p1[1], c1, 12);
        hebra(p2, [p2[0], p2[1], c2 + 10]); capullo(p2[0], p2[1], c2, 10);
        hebra(t, [10, 8, 0]); hebra(p1, [18, -2, 0]); hebra(p2, [-24, 10, 0]);
      } else {
        const n = v === 'suelo' ? 3 : 1;
        for (let i = 0; i < n; i++) {
          const g = (i / n) * PI2 + a.r(), d = n > 1 ? 8 : 0, x = Math.cos(g) * d, y = Math.sin(g) * d, h = 10 + a.r() * 3;
          capullo(x, y, h * 0.85, h, jit(a, 18), a.r() * 90);
          for (let k = 0; k < 3; k++) { const gg = a.r() * PI2; hebra([x, y, h * (0.8 + a.r())], [x + Math.cos(gg) * 14, y + Math.sin(gg) * 14, 0]); }
        }
        if (v === 'roto') {
          ps.push(a.elipsoide(3, 4, 15, 4, 4, 9, { mat: 'negro', resta: true }));
          ps.push(a.elipsoide(1.5, 2.5, 10, 3, 3, 4, { mat: 'baba', tono: -0.05 }), a.elipsoide(6, 9, 0.5, 6, 4, 1, { mat: 'baba' }));
          craneo(a, ps, 9, 10, 2.8, 2.8, 0.3);
          ps.push(a.palo([3, 14, 1], [12, 16, 1.5], 0.9, { mat: 'hueso' }));
          ps.push(a.elipsoide(-9, 4, 4, 4, 3.5, 4, { mat: 'selva_telarana', tono: -0.1, giro: 30 }));
        }
      }
      return ps;
    },
  },
  // ------------------------------------------------------------------ tronco y rocas en el pantano
  {
    id: 'sel_tronco_pantano', nombre: ['Tronco en el pantano', 'Swamp log'], tema: 'selva', variantes: ['tronco', 'raices', 'rocas'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      charca(a, ps, 22, 3);
      if (v === 'tronco') {
        const p: V3 = [-26, -6 + jit(a, 3), 3], q: V3 = [24, 7 + jit(a, 3), 4.5];
        ps.push(a.palo(p, q, 6.5, { mat: 'corteza', r1: 5.4 }), a.cilindro(q[0], q[1], q[2], 5.2, 1.5, { mat: 'madera_vieja', eje: [q[0] - p[0], q[1] - p[1], q[2] - p[2]] }));
        ps.push(a.palo([-6, -1, 7], [-12, 12, 18], 1.8, { mat: 'corteza', r1: 1.1 }), a.palo([8, 3, 8], [14, -10, 15], 1.6, { mat: 'corteza', r1: 1 }));
        for (let i = 0; i < 4; i++) { const t = 0.15 + i * 0.22; ps.push(a.elipsoide(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, 9.5, 5 + a.r() * 2, 3.5, 2, { mat: 'musgo', giro: 15 })); }
        ps.push(a.elipsoide(-2, 2, 11, 1.5, 1.5, 2.5, { mat: 'hongo' }), a.elipsoide(1, 1, 10.5, 2.5, 2.5, 1, { mat: 'hongo', tono: 0.1 }));
      } else if (v === 'raices') {
        // tocón partido con raíces de mangle
        ps.push(a.cilindro(0, 0, 0, 9, 24, { mat: 'corteza', r1: 7 }));
        for (let i = 0; i < 6; i++) { const g = (i / 6) * PI2 + a.r() * 0.5, h = 26 + a.r() * 12; ps.push(a.poliedro([[Math.cos(g) * 7, Math.sin(g) * 7, 23], [Math.cos(g + 0.9) * 7, Math.sin(g + 0.9) * 7, 23], [Math.cos(g) * 4, Math.sin(g) * 4, 23], [Math.cos(g + 0.4) * 6, Math.sin(g + 0.4) * 6, h]], { mat: 'madera_vieja', tono: jit(a, 0.08) })); }
        for (let i = 0; i < 12; i++) {
          const g = (i / 12) * PI2 + a.r() * 0.4, zz = 4 + a.r() * 16, d = 12 + a.r() * 12, r = 1.2 + a.r() * 1.3;
          const p0: V3 = [Math.cos(g) * 6.5, Math.sin(g) * 6.5, zz], p1: V3 = [Math.cos(g) * (d * 0.55 + 4), Math.sin(g) * (d * 0.55 + 4), zz * 0.7 + 2], p2: V3 = [Math.cos(g + jit(a, 0.2)) * d, Math.sin(g + jit(a, 0.2)) * d, 0];
          ps.push(a.palo(p0, p1, r, { mat: 'corteza', r1: r * 0.9 }), a.palo(p1, p2, r * 0.9, { mat: 'corteza', r1: r * 0.6 }));
        }
        ps.push(a.elipsoide(-3, -2, 22, 6, 5, 3, { mat: 'musgo' }), a.elipsoide(5, 4, 14, 3, 3, 4, { mat: 'musgo' }));
      } else {
        for (let i = 0; i < 5; i++) {
          const g = a.r() * PI2, d = i ? 10 + a.r() * 8 : 0, s = i ? 5 + a.r() * 4 : 11;
          const x = Math.cos(g) * d, y = Math.sin(g) * d;
          ps.push(a.elipsoide(x, y, s * 0.25, s * (1 + a.r() * 0.3), s, s * 0.85, { mat: 'roca', giro: a.r() * 180, incl: jit(a, 10) }));
          ps.push(a.elipsoide(x - s * 0.2, y - s * 0.1, s * 0.25 + s * 0.7, s * 0.7, s * 0.6, s * 0.25, { mat: 'musgo', giro: a.r() * 180 }));
        }
      }
      juncos(a, ps, 18, -12, 6, 20);
      juncos(a, ps, -16, 16, 5, 16);
      for (let i = 0; i < 3; i++) ps.push(a.cilindro(jit(a, 18), 12 + jit(a, 6), 1.2, 3, 0.4, { mat: 'hojas_selva', tono: 0.05 }));
      return ps;
    },
  },
  // ------------------------------------------------------------------ charco del pantano (piso animado)
  {
    id: 'sel_charco', nombre: ['Agua del pantano', 'Marsh water'], tema: 'selva', variantes: ['chico', 'grande'], huella: [4, 4], bloquea: false, plano: true, cuadros: 6, t: 4,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const R = v === 'grande' ? 40 : 24;
      // ondas (anillo = disco + hueco), antes del agua para que el hueco no la cave
      const ondas: [number, number][] = [[jit(a, R * 0.4), jit(a, R * 0.4)], [jit(a, R * 0.4), jit(a, R * 0.4)]];
      ondas.forEach(([x, y], k) => {
        const fase = ((f + k * 3) % 6) / 6, r = 2 + fase * (v === 'grande' ? 12 : 8);
        ps.push(a.cilindro(x, y, 0, r + 1.2, 1.5, { mat: 'agua_sucia', tono: 0.22 * (1 - fase) }), a.cilindro(x, y, 0, r, 2, { mat: 'agua_sucia', resta: true }));
      });
      charca(a, ps, R, v === 'grande' ? 6 : 3);
      // burbujas que suben y revientan
      const burb: [number, number][] = Array.from({ length: 3 }, () => [jit(a, R * 0.6), jit(a, R * 0.6)]);
      burb.forEach(([x, y], k) => { const fase = (f + k * 2) % 6; if (fase < 4) ps.push(a.esfera(x, y, 1.2, 0.8 + fase * 0.35, { mat: 'agua_sucia', tono: 0.15 })); });
      // nenúfares y verdín
      for (let i = 0; i < (v === 'grande' ? 7 : 4); i++) { const g = a.r() * PI2, d = R * a.r() * 0.8; ps.push(a.cilindro(Math.cos(g) * d, Math.sin(g) * d, 1.2, 2.5 + a.r() * 1.5, 0.3, { mat: 'hojas_selva', tono: 0.08 })); }
      for (let i = 0; i < 3; i++) { const g = a.r() * PI2, d = R * a.r() * 0.7; ps.push(a.elipsoide(Math.cos(g) * d, Math.sin(g) * d, 1.2, 5 + a.r() * 4, 3 + a.r() * 2, 0.25, { mat: 'baba', giro: a.r() * 180, tono: -0.05 })); }
      for (let i = 0; i < 4; i++) { const g = a.r() * PI2; ps.push(a.elipsoide(Math.cos(g) * (R + 2), Math.sin(g) * (R + 2), 0, 3 + a.r() * 3, 2 + a.r() * 2, 0.8, { mat: 'musgo', giro: a.r() * 180 })); }
      return ps;
    },
  },
);

registrar(
  // ------------------------------------------------------------------ choza en pilotes
  {
    id: 'sel_choza_pilotes', nombre: ['Choza en pilotes', 'Stilt hut'], tema: 'selva', variantes: ['entera', 'en_ruinas'], huella: [6, 6], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const ruina = v === 'en_ruinas';
      const z0 = 28;
      charca(a, ps, 38, 4, 'agua_sucia', 1);
      // pilotes y riostras
      const pil: [number, number][] = [[-32, -28], [0, -28], [32, -28], [-32, 20], [0, 20], [32, 20], [-32, 42], [32, 42]];
      pil.forEach(([x, y], i) => {
        const roto = ruina && i === 2;
        ps.push(a.palo([x + jit(a, 2), y + jit(a, 2), 0], [x, y, roto ? 14 : z0], 2.6, { mat: 'madera_vieja', r1: 2.3 }));
        if (roto) ps.push(a.palo([x + 4, y + 8, 1], [x - 10, y + 22, 3], 2.3, { mat: 'madera_vieja' }));
      });
      ps.push(a.palo([-32, 20, 4], [0, 20, z0 - 2], 1.2, { mat: 'madera_vieja' }), a.palo([32, 20, 4], [0, 20, z0 - 2], 1.2, { mat: 'madera_vieja' }), a.palo([32, -28, 4], [32, 20, z0 - 2], 1.2, { mat: 'madera_vieja' }));
      // plataforma y porche
      ps.push(a.caja(0, 6, z0, 72, 80, 4, { mat: 'madera_vieja' }));
      if (ruina) ps.push(a.caja(22, 36, z0 - 1, 16, 12, 8, { mat: 'madera', resta: true }), a.caja(24, 40, 1, 14, 5, 1.5, { mat: 'madera_vieja', giro: 30 }));
      // cuerpo
      const zc = z0 + 4;
      ps.push(a.caja(0, -6, zc, 58, 46, 32, { mat: 'madera' }));
      ps.push(a.caja(-8, 17.5, zc, 14, 6, 24, { mat: 'madera', resta: true }), a.caja(-8, 14.6, zc, 13, 1, 23, { mat: 'negro' }));
      ps.push(a.caja(29.5, -8, zc + 12, 6, 12, 10, { mat: 'madera', resta: true }), a.caja(26.5, -8, zc + 12, 1, 11, 9, { mat: 'negro' }));
      if (ruina) ps.push(a.caja(20, 17.5, zc + 6, 12, 6, 18, { mat: 'madera', resta: true }), a.caja(20, 14.8, zc + 6, 11, 1, 17, { mat: 'negro' }));
      for (const [x, y] of [[-29, -29], [29, -29], [-29, 17], [29, 17]]) ps.push(a.caja(x, y, zc, 3.5, 3.5, 34, { mat: 'corteza' }));
      // techo de paja a cuatro aguas
      const ze = zc + 30, zr = zc + 62;
      const techo: V3[] = [[-42, -36, ze], [42, -36, ze], [-42, 26, ze], [42, 26, ze], [-16, -6, zr], [16, -6, zr], [-43, -37, ze - 3], [43, -37, ze - 3], [-43, 27, ze - 3], [43, 27, ze - 3]];
      ps.push(a.poliedro(techo, { mat: 'selva_paja' }));
      if (ruina) {
        ps.push(a.caja(14, 10, ze + 4, 18, 16, 30, { mat: 'selva_paja', resta: true, giro: 20 }), a.caja(-24, -18, ze + 10, 12, 12, 30, { mat: 'selva_paja', resta: true }));
        ps.push(a.caja(12, 8, zc + 32, 24, 1.5, 1.5, { mat: 'madera_vieja', giro: 20 }), a.caja(16, 6, zc + 32, 1.5, 18, 1.5, { mat: 'madera_vieja', giro: 20 }));
      }
      ps.push(a.palo([-18, -6, zr + 1], [18, -6, zr + 1], 1.6, { mat: 'madera' }));
      for (const s of [-1, 1]) { ps.push(a.palo([s * 14, -6, zr - 4], [s * 22, -14, zr + 10], 1.2, { mat: 'madera' }), a.palo([s * 14, -6, zr - 4], [s * 22, 2, zr + 10], 1.2, { mat: 'madera' })); }
      // flecos de la paja
      for (let i = 0; i < 9; i++) { const x = -38 + i * 9.5; ps.push(a.caja(x, 26.5, ze - 4, 9, 1.5, 4, { mat: 'selva_paja', tono: -0.08 + jit(a, 0.05), incl: -10 })); }
      // baranda del porche
      for (let i = 0; i < 6; i++) ps.push(a.palo([-34 + i * 13.6, 45, zc], [-34 + i * 13.6, 45, zc + 12], 1, { mat: 'madera_vieja' }));
      if (!ruina) ps.push(a.palo([-34, 45, zc + 11], [34, 45, zc + 11], 0.9, { mat: 'madera_vieja' }));
      else ps.push(a.palo([-34, 45, zc + 11], [0, 45, zc + 7], 0.9, { mat: 'madera_vieja' }));
      // escalera
      const lx = 18;
      for (const s of [-1, 1]) ps.push(a.palo([lx + s * 4, 60, 0], [lx + s * 4, 46, zc], 1.1, { mat: 'madera_vieja' }));
      for (let i = 1; i < 6; i++) { if (ruina && (i === 2 || i === 3)) continue; const t = i / 6; ps.push(a.palo([lx - 4, 60 - 14 * t, zc * t], [lx + 4, 60 - 14 * t, zc * t], 0.8, { mat: 'madera_vieja' })); }
      // cosas: cuero tendido, vasijas, cráneo en la puerta
      ps.push(a.caja(-24, 17.2, zc + 8, 10, 0.8, 12, { mat: 'cuero' }));
      ps.push(a.cilindro(8, 30, zc, 3.5, 6, { mat: 'tierra', r1: 2.5 }), a.cilindro(14, 26, zc, 2.5, 4, { mat: 'hongo' }));
      craneo(a, ps, -8, 18.5, zc + 28, 2.4, Math.PI / 2);
      return ps;
    },
  },
  // ------------------------------------------------------------------ muelle
  {
    id: 'sel_muelle', nombre: ['Muelle de madera', 'Wooden pier'], tema: 'selva', variantes: ['recto', 'roto'], huella: [5, 2], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const roto = v === 'roto';
      for (const x of [-26, 0, 26]) { ps.push(a.cilindro(x, 0, 0, 22, 0.6, { mat: 'tierra', r1: 20 }), a.cilindro(x, 0, 0, 19, 1, { mat: 'agua_sucia' })); }
      for (const x of [-36, -12, 12, 36]) for (const y of [-12, 12]) {
        const alto = (x === 36 || x === -36) && y === 12 ? 17 : 8.5;
        const r = roto && x === 36 && y === -12;
        ps.push(a.cilindro(x + jit(a, 1), y, 0, 2.4, r ? 4 : alto, { mat: 'madera_vieja', incl: jit(a, 3) }));
        ps.push(a.cilindro(x, y, 0.6, 3.2, 1, { mat: 'agua_sucia', tono: 0.15 }));
      }
      for (const y of [-10, 10]) ps.push(a.caja(roto ? -6 : 0, y, 6.5, roto ? 68 : 80, 2.5, 2.5, { mat: 'madera', tono: -0.1 }));
      for (let i = 0; i < 15; i++) {
        const x = -37 + i * 5.3;
        if (roto && (i === 11 || i === 12 || i === 14)) continue;
        if (roto && i === 13) { ps.push(a.caja(x + 2, 4, 3, 5, 26, 1.6, { mat: 'madera_vieja', incl: 12, giro: 8 })); continue; }
        ps.push(a.caja(x + jit(a, 0.3), jit(a, 1), 9, 5, 28 - a.r() * 2, 1.6, { mat: 'madera_vieja', giro: jit(a, 2), tono: jit(a, 0.1) - (i % 4 ? 0 : 0.08) }));
      }
      ps.push(a.cilindro(-28, -4, 10.6, 3.5, 1.6, { mat: 'cuerda' }), a.cilindro(-28, -4, 12.2, 2.5, 1.2, { mat: 'cuerda' }));
      ps.push(a.cilindro(-36, 12, 13, 2.8, 1.5, { mat: 'cuerda' }), a.palo([-36, 12, 13.5], [-44, 18, 1], 0.6, { mat: 'cuerda' }));
      if (!roto) ps.push(a.cilindro(36, 12, 13, 2.8, 1.5, { mat: 'cuerda' }), a.caja(20, -4, 10.6, 8, 6, 5, { mat: 'madera', giro: 15 }));
      return ps;
    },
  },
  // ------------------------------------------------------------------ canoa
  {
    id: 'sel_canoa', nombre: ['Canoa', 'Canoe'], tema: 'selva', variantes: ['en_tierra', 'volcada'], huella: [4, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const g = 20 + jit(a, 10);
      suelo(a, ps, 26, 'tierra', 0.8);
      if (v === 'en_tierra') {
        ps.push(a.elipsoide(0, 0, 6, 30, 7.5, 7, { mat: 'madera_lisa', giro: g }));
        ps.push(a.elipsoide(0, 0, 8.5, 27, 5.8, 6.2, { mat: 'madera_lisa', resta: true, giro: g }));
        ps.push(a.caja(0, 0, 9.5, 80, 30, 20, { mat: 'madera_lisa', resta: true, giro: g }), a.caja(0, 0, -20, 80, 30, 20.5, { mat: 'madera_lisa', resta: true, giro: g }));
        const c = Math.cos((g * Math.PI) / 180), s = Math.sin((g * Math.PI) / 180);
        for (const k of [-12, 10]) ps.push(a.caja(c * k, s * k, 5, 2, 11, 1.4, { mat: 'madera', giro: g }));
        for (const k of [-29, 29]) ps.push(a.palo([c * k * 0.93, s * k * 0.93, 8], [c * k * 1.04, s * k * 1.04, 11.5], 1.6, { mat: 'madera_lisa', r1: 1 }));
        ps.push(a.palo([c * -6 - s * 2, s * -6 + c * 2, 7], [c * 14 + s * 1, s * 14 - c * 1, 9.5], 0.8, { mat: 'madera' }), a.elipsoide(c * 17 + s, s * 17 - c, 9.6, 4, 2, 0.6, { mat: 'madera', giro: g }));
        ps.push(a.elipsoide(c * -3, s * -3, 4.5, 4, 3, 2.5, { mat: 'tela', giro: g }), a.cilindro(c * 4, s * 4, 3, 2.2, 4, { mat: 'tierra', r1: 1.6 }));
      } else {
        ps.push(a.elipsoide(0, 0, 0, 30, 7.5, 7, { mat: 'madera_lisa', giro: g, tono: -0.04 }), a.caja(0, 0, -20, 80, 30, 20, { mat: 'madera_lisa', resta: true, giro: g }));
        for (let i = 0; i < 3; i++) ps.push(a.elipsoide(jit(a, 14), jit(a, 4), 6, 3 + a.r() * 2, 2, 1.2, { mat: 'musgo', giro: g }));
        ps.push(a.palo([10, 14, 0.5], [2, 10, 16], 0.8, { mat: 'madera' }), a.elipsoide(11, 14.5, 3, 2, 0.8, 4, { mat: 'madera', giro: g }));
      }
      return ps;
    },
  },
  // ------------------------------------------------------------------ tótem
  {
    id: 'sel_totem', nombre: ['Tótem tribal', 'Tribal totem'], tema: 'selva', variantes: ['tallado', 'con_plumas', 'viejo'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const viejo = v === 'viejo';
      const mat = viejo ? 'madera_vieja' : 'madera_lisa';
      const phi = (65 * Math.PI) / 180, R = 6.5;
      suelo(a, ps, 12, 'tierra', 1);
      for (let i = 0; i < 6; i++) { const g = (i / 6) * PI2; ps.push(a.elipsoide(Math.cos(g) * 10, Math.sin(g) * 10, 0.5, 2.5, 2, 2, { mat: 'piedra', tono: jit(a, 0.1) })); }
      const H = viejo ? 50 : 76;
      ps.push(a.cilindro(0, 0, 0, R, H, { mat, r1: R - 0.8 }));
      const caras = viejo ? [8, 30] : [8, 30, 52];
      caras.forEach((z, i) => {
        ps.push(a.cilindro(0, 0, z, R + 1.2, 18, { mat, r1: R + 0.8, tono: i % 2 ? -0.05 : 0.03 }));
        const q = (l: number, zz: number, d = R + 1) => frente(phi, d, l, z + zz);
        // ceja, ojos, nariz y boca
        const ce = q(0, 13.5); ps.push(a.caja(ce[0], ce[1], ce[2], 11, 3, 2.4, { mat, giro: deg(phi) + 90, tono: 0.08 }));
        for (const l of [-3, 3]) { const e = q(l, 10.5, R + 0.8); ps.push(a.elipsoide(e[0], e[1], e[2], 1.8, 1.8, 1.4, { mat: 'negro' })); const e2 = q(l, 10.5, R + 1.4); ps.push(a.esfera(e2[0], e2[1], e2[2], 0.7, { mat: viejo ? 'hueso' : 'selva_pintura', tono: 0.2 })); }
        const n = q(0, 6.5, R + 2); ps.push(a.poliedro([[n[0], n[1], n[2] + 4], q(-2, 5.5), q(2, 5.5), q(-2.2, 9), q(2.2, 9), [n[0], n[1], n[2]]], { mat, tono: 0.05 }));
        const b = q(0, 2.2, R + 1.4); ps.push(a.caja(b[0], b[1], b[2], 8, 2, 2.5, { mat: 'negro', giro: deg(phi) + 90 }));
        for (const l of [-3, -1, 1, 3]) { const d = q(l, 2.2, R + 2); ps.push(a.caja(d[0], d[1], d[2] + 0.8, 1.2, 1, 1.7, { mat: 'hueso', giro: deg(phi) + 90 })); }
        if (!viejo) ps.push(a.cilindro(0, 0, z + 17, R + 1.3, 1.6, { mat: i % 2 ? 'tela_azul' : 'selva_pintura' }));
      });
      // alas y pico arriba
      const zt = H - 4;
      const ala = (s: number) => { const p0 = frente(phi, 0, s * 4, zt), p1 = frente(phi, -1, s * 24, zt + 10), p2 = frente(phi, -1, s * 22, zt + 2); return a.poliedro([p0, p1, p2, [p0[0], p0[1], p0[2] + 7], [p0[0] - Math.cos(phi) * 2, p0[1] - Math.sin(phi) * 2, p0[2] + 3], [p1[0] - Math.cos(phi) * 2, p1[1] - Math.sin(phi) * 2, p1[2]]], { mat, tono: 0.04 }); };
      if (!viejo) {
        ps.push(ala(-1), ala(1));
        ps.push(a.elipsoide(0, 0, H + 4, R, R, 6, { mat }));
        const pk = frente(phi, R + 7, 0, H + 1); ps.push(a.poliedro([frente(phi, R - 1, -2.5, H + 5), frente(phi, R - 1, 2.5, H + 5), frente(phi, R - 1, 0, H + 1), pk, frente(phi, R - 1, 0, H + 7)], { mat: 'selva_pintura' }));
        for (const l of [-2.5, 2.5]) { const e = frente(phi, R - 0.5, l, H + 6.5); ps.push(a.esfera(e[0], e[1], e[2], 1.1, { mat: 'negro' })); }
      } else {
        for (let i = 0; i < 4; i++) { const g = (i / 4) * PI2 + a.r(), h = 3 + a.r() * 9; ps.push(a.poliedro([[Math.cos(g) * R, Math.sin(g) * R, H - 1], [Math.cos(g + 1.2) * R, Math.sin(g + 1.2) * R, H - 1], [0, 0, H - 1], [Math.cos(g + 0.5) * R * 0.7, Math.sin(g + 0.5) * R * 0.7, H + h]], { mat, tono: -0.05 })); }
        ps.push(a.caja(10, 11, 0, 6, 16, 3.5, { mat, giro: 40, tono: -0.1 }), a.caja(-11, 9, 0, 5, 10, 3, { mat, giro: -20, tono: -0.12 }));
        for (let i = 0; i < 3; i++) ps.push(a.elipsoide(jit(a, 3), jit(a, 3), 10 + a.r() * 40, R + 1.5, R + 1.5, 2.2, { mat: 'musgo', tono: -0.05 }));
      }
      if (v === 'con_plumas') {
        for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
          const t = frente(phi, -1, s * (14 + k * 4), zt + 3 + k * 1.5);
          ps.push(a.palo(t, [t[0], t[1], t[2] - 6], 0.5, { mat: 'cuerda' }), a.elipsoide(t[0], t[1], t[2] - 10, 1.4, 1.2, 4.2, { mat: k % 2 ? 'tela_verde' : 'tela_roja', tono: 0.08 }));
        }
        craneo(a, ps, frente(phi, R + 3, 0, 46)[0], frente(phi, R + 3, 0, 46)[1], 46, 3.2, phi);
        for (let k = 0; k < 5; k++) { const g = phi + Math.PI + (k - 2) * 0.35; ps.push(hoja(a, [Math.cos(g) * 4, Math.sin(g) * 4, H + 8], [Math.cos(g) * 6, Math.sin(g) * 6, H + 22], 2, 0.8, k % 2 ? 'tela_roja' : 'tela_verde', 0.1)); }
      }
      return ps;
    },
  },
  // ------------------------------------------------------------------ poste de cráneos
  {
    id: 'sel_poste_craneos', nombre: ['Poste de cráneos', 'Skull pole'], tema: 'selva', variantes: ['craneos', 'cornamenta', 'travesano'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 10, 'tierra', 1);
      const tx = jit(a, 3), ty = jit(a, 3);
      const H = 56 + a.r() * 8;
      const at = (z: number): [number, number] => [tx * z / H, ty * z / H];
      ps.push(a.palo([0, 0, 0], [tx, ty, H], 2.2, { mat: 'madera_vieja', r1: 1.8 }));
      for (let i = 0; i < 3; i++) { const g = (i / 3) * PI2 + a.r(); ps.push(a.palo([Math.cos(g) * 8, Math.sin(g) * 8, 0], [Math.cos(g) * 2, Math.sin(g) * 2, 10], 1, { mat: 'madera_vieja' })); }
      const phi = Math.PI / 4 + jit(a, 0.4);
      if (v === 'craneos') {
        for (let i = 0; i < 3; i++) { const z = H - 3 - i * 9.5; const [x, y] = at(z); craneo(a, ps, x, y, z, 4.2 - i * 0.2, phi + jit(a, 0.3)); }
        const [x, y] = at(H - 32); ps.push(a.cilindro(x, y, H - 32, 2.8, 4, { mat: 'cuerda' }));
        for (let k = 0; k < 3; k++) { const g = phi + (k - 1) * 0.6; ps.push(a.palo([x + Math.cos(g) * 2.5, y + Math.sin(g) * 2.5, H - 30], [x + Math.cos(g) * 4, y + Math.sin(g) * 4, H - 42], 0.8, { mat: 'hueso' })); }
      } else if (v === 'cornamenta') {
        const [x, y] = at(H);
        craneo(a, ps, x, y, H + 1, 6, phi);
        for (const s of [-1, 1]) {
          const b = frente(phi, -1, s * 5, H + 4, x, y), m = frente(phi, -2, s * 14, H + 10, x, y), t = frente(phi, 2, s * 15, H + 22, x, y);
          ps.push(a.palo(b, m, 1.8, { mat: 'hueso', r1: 1.3 }), a.palo(m, t, 1.3, { mat: 'hueso', r1: 0.5 }));
        }
        ps.push(a.cilindro(x, y, H - 8, 2.8, 3, { mat: 'cuerda' }));
        for (let k = 0; k < 2; k++) { const e = frente(phi, 3, (k - 0.5) * 5, H - 9, x, y); ps.push(a.palo(e, [e[0], e[1], e[2] - 8], 0.4, { mat: 'cuerda' }), a.elipsoide(e[0], e[1], e[2] - 11, 1.2, 1, 3.5, { mat: k ? 'tela_roja' : 'tela_verde' })); }
      } else {
        const z = H - 10, [x, y] = at(z);
        const p0 = frente(phi + Math.PI / 2, 0, 0, z, x, y);
        const d: V3 = [Math.cos(phi + Math.PI / 2) * 16, Math.sin(phi + Math.PI / 2) * 16, 0];
        ps.push(a.palo([p0[0] - d[0], p0[1] - d[1], z], [p0[0] + d[0], p0[1] + d[1], z + 1], 1.5, { mat: 'madera_vieja' }));
        const [hx, hy] = at(H); craneo(a, ps, hx, hy, H + 2, 4.5, phi);
        for (const k of [-0.85, -0.4, 0.4, 0.85]) {
          const c: V3 = [p0[0] + d[0] * k, p0[1] + d[1] * k, z];
          const L = 6 + a.r() * 6;
          ps.push(a.palo(c, [c[0], c[1], z - L], 0.4, { mat: 'cuerda' }));
          if (Math.abs(k) > 0.6) craneo(a, ps, c[0], c[1], z - L - 3, 2.8, phi + jit(a, 0.5)); else ps.push(a.palo([c[0], c[1], z - L], [c[0] + 1, c[1], z - L - 9], 0.9, { mat: 'hueso' }));
        }
      }
      return ps;
    },
  },
  // ------------------------------------------------------------------ antorcha de la selva
  {
    id: 'sel_antorcha', nombre: ['Antorcha de la selva', 'Jungle torch'], tema: 'selva', variantes: ['bambu', 'craneo'], huella: [1, 1], bloquea: true, cuadros: 6, t: 3,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 8, 'tierra', 1);
      let zf: number;
      if (v === 'bambu') {
        const t: V3 = [jit(a, 1.5), jit(a, 1.5), 50];
        for (let i = 0; i < 3; i++) { const g = (i / 3) * PI2 + 0.4; ps.push(a.palo([Math.cos(g) * 5, Math.sin(g) * 5, 0], [t[0] + Math.cos(g) * 1.6, t[1] + Math.sin(g) * 1.6, 46], 1.5, { mat: 'selva_bambu', r1: 1.3 })); }
        ps.push(a.cilindro(t[0], t[1], 30, 3, 2, { mat: 'cuerda' }), a.cilindro(t[0], t[1], 44, 3.2, 7, { mat: 'cuerda', r1: 4.6 }), a.cilindro(t[0], t[1], 50.5, 4.2, 0.6, { mat: 'negro' }));
        zf = 50.5;
      } else {
        ps.push(a.palo([0, 0, 0], [0, 0, 46], 1.8, { mat: 'madera_vieja', r1: 1.5 }), a.cilindro(0, 0, 36, 2.4, 3, { mat: 'cuerda' }));
        craneo(a, ps, 0, 0, 49, 5, Math.PI / 4);
        ps.push(a.cilindro(0, 0, 51.5, 4.5, 4, { mat: 'hueso', resta: true }), a.cilindro(0, 0, 51, 3.8, 0.6, { mat: 'negro' }));
        for (let k = 0; k < 2; k++) { const e = frente(Math.PI / 4, 1.8, (k - 0.5) * 3.8, 39); ps.push(a.palo(e, [e[0], e[1], e[2] - 6], 0.4, { mat: 'cuerda' }), a.elipsoide(e[0], e[1], e[2] - 8.5, 1, 0.9, 3, { mat: k ? 'tela_roja' : 'tela_verde' })); }
        zf = 51.5;
      }
      llama(a, ps, 0, 0, zf, 3.3, f);
      return { piezas: ps, resplandor: { c: [0, 0, zf + 6], r: 34, color: '#ff9a3a' } };
    },
  },
  // ------------------------------------------------------------------ cofre de la selva
  {
    id: 'sel_cofre', nombre: ['Cofre de la selva', 'Jungle chest'], tema: 'selva', variantes: ['cerrado', 'abierto'], huella: [2, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const g = jit(a, 8);
      const rot = (x: number, y: number): [number, number] => { const c = Math.cos((g * Math.PI) / 180), s = Math.sin((g * Math.PI) / 180); return [x * c - y * s, x * s + y * c]; };
      suelo(a, ps, 18, 'tierra', 0.8);
      ps.push(a.caja(0, 0, 0, 26, 15, 12, { mat: 'madera', giro: g }));
      for (const x of [-8.5, 8.5]) { const [px, py] = rot(x, 0); ps.push(a.caja(px, py, 0, 2.4, 15.8, v === 'abierto' ? 12.4 : 16.4, { mat: 'cuerda', giro: g })); }
      for (const [x, y] of [[-12.5, -7], [12.5, -7], [-12.5, 7], [12.5, 7]]) { const [px, py] = rot(x, y); ps.push(a.caja(px, py, 0, 2.6, 2.6, 12.5, { mat: 'hueso', giro: g, tono: -0.05 })); }
      if (v === 'cerrado') {
        const [lx, ly] = rot(0, 0);
        ps.push(a.poliedro([[-13.5, -8, 12], [13.5, -8, 12], [-13.5, 8, 12], [13.5, 8, 12], [-13, -5, 16.5], [13, -5, 16.5], [-13, 5, 16.5], [13, 5, 16.5]].map(([x, y, z]) => { const [px, py] = rot(x, y); return [px + lx, py + ly, z] as V3; }), { mat: 'madera_vieja' }));
        const [cx, cy] = rot(0, 8); ps.push(a.elipsoide(cx, cy, 10, 3, 1.4, 3.4, { mat: 'hueso', giro: g }));
        for (const l of [-1.2, 1.2]) { const [ex, ey] = rot(l, 9.2); ps.push(a.esfera(ex, ey, 10.8, 0.8, { mat: 'negro' })); }
        for (let i = 0; i < 3; i++) { const [hx, hy] = rot(jit(a, 9), jit(a, 4)); ps.push(a.elipsoide(hx, hy, 16, 3.2, 2, 0.8, { mat: 'hojas_selva', giro: a.r() * 180 })); }
      } else {
        const [hx, hy] = rot(0, -8.5);
        ps.push(a.caja(hx, hy, 12, 27, 3.5, 15, { mat: 'madera_vieja', giro: g, incl: 18 }));
        ps.push(a.caja(0, 0, 10.5, 24, 13, 2, { mat: 'negro', giro: g }));
        ps.push(a.elipsoide(0, 0, 11.5, 11, 5.5, 2.6, { mat: 'oro', giro: g }));
        for (let i = 0; i < 6; i++) { const [cx, cy] = rot(jit(a, 9), jit(a, 4)); ps.push(a.cilindro(cx, cy, 12 + a.r() * 1.5, 1.4, 0.5, { mat: 'oro', tono: 0.1 })); }
        const [jx, jy] = rot(4, 1); ps.push(a.poliedro([[jx, jy, 13], [jx + 2, jy, 15], [jx - 2, jy, 15], [jx, jy + 2, 15], [jx, jy - 2, 15], [jx, jy, 17]], { mat: 'tela_verde', tono: 0.25 }));
        for (let i = 0; i < 4; i++) { const [cx, cy] = rot(10 + i * 2.5, 10 + jit(a, 2)); ps.push(a.cilindro(cx, cy, 0.5, 1.4, 0.5, { mat: 'oro' })); }
      }
      return ps;
    },
  },
  // ------------------------------------------------------------------ santuario de la selva
  {
    id: 'sel_santuario', nombre: ['Santuario de la selva', 'Jungle shrine'], tema: 'selva', variantes: ['piedra', 'ofrendas'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      suelo(a, ps, 30, 'tierra', 1);
      ps.push(a.caja(0, 0, 0, 46, 46, 5, { mat: 'piedra_musgo' }), a.caja(0, 25, 0, 30, 6, 2.5, { mat: 'piedra_musgo', tono: 0.04 }));
      ps.push(a.caja(0, -3, 5, 32, 28, 30, { mat: 'piedra_musgo' }));
      ps.push(a.caja(0, 11, 9, 14, 10, 18, { mat: 'piedra', resta: true }), a.cilindro(0, 5, 27, 7, 12, { mat: 'piedra', resta: true, eje: [0, 1, 0] }));
      ps.push(a.caja(0, 5.4, 9, 14, 1, 26, { mat: 'negro' }));
      // ídolo en el nicho
      const idolo = v === 'ofrendas' ? 'oro' : 'piedra_gris';
      ps.push(a.caja(0, 8, 9, 8, 5, 3, { mat: 'piedra_gris' }), a.elipsoide(0, 8, 16, 3.4, 2.8, 5, { mat: idolo }), a.esfera(0, 8, 23.5, 3, { mat: idolo }));
      for (const l of [-1.1, 1.1]) ps.push(a.esfera(l, 10.6, 24, 0.7, { mat: v === 'ofrendas' ? 'tela_verde' : 'negro', tono: 0.3 }));
      // techo escalonado
      ps.push(a.caja(0, -3, 35, 38, 34, 4, { mat: 'piedra_musgo', tono: 0.03 }), a.caja(0, -3, 39, 32, 28, 4, { mat: 'piedra_musgo' }));
      ps.push(a.poliedro([[-14, -15, 43], [14, -15, 43], [-14, 9, 43], [14, 9, 43], [-3, -6, 56], [3, -6, 56], [-3, 0, 56], [3, 0, 56]], { mat: 'piedra_musgo' }));
      ps.push(a.cilindro(0, -3, 56, 2.5, 4, { mat: 'piedra_gris', r1: 1 }));
      // relieves a los lados del nicho
      for (const s of [-1, 1]) { ps.push(a.caja(s * 11.5, 11, 10, 4, 1, 22, { mat: 'piedra_gris', tono: -0.05 })); for (let k = 0; k < 3; k++) ps.push(a.caja(s * 11.5, 11.6, 13 + k * 6.5, 2.5, 0.8, 2.5, { mat: 'piedra_gris', tono: 0.12 })); }
      // musgo y lianas
      for (let i = 0; i < 4; i++) ps.push(a.elipsoide(jit(a, 14), -3 + jit(a, 12), 46 + a.r() * 4, 5, 4, 2.5, { mat: 'musgo' }));
      for (let i = 0; i < 3; i++) { const x = -17 + a.r() * 34; ps.push(a.palo([x, 13.5, 38], [x + jit(a, 2), 13.5, 14 + a.r() * 14], 0.8, { mat: 'pasto' })); }
      if (v === 'ofrendas') {
        for (const [x, y, h] of [[-12, 19, 6], [-8, 21, 4], [10, 20, 5], [14, 18, 7]]) ps.push(a.cilindro(x, y, 5, 1.2, h, { mat: 'cera' }), a.cilindro(x, y, 5 + h, 0.6, 1.8, { mat: 'luz_vela' }));
        ps.push(a.cilindro(0, 19, 5, 4, 2, { mat: 'tierra', r1: 5 }), a.esfera(-1.5, 19, 7.5, 1.8, { mat: 'selva_flor' }), a.esfera(1.5, 18.5, 7.5, 1.6, { mat: 'hongo', tono: 0.15 }), a.esfera(0, 20.5, 8, 1.5, { mat: 'oro', tono: -0.1 }));
        craneo(a, ps, 6, 26, 4.5, 2.6, 1.2);
        for (let k = 0; k < 4; k++) ps.push(a.elipsoide(-6 + k * 3, 26 + jit(a, 1), 3.2, 1.6, 1.2, 0.8, { mat: 'selva_flor', tono: 0.1 }));
        return { piezas: ps, resplandor: { c: [0, 20, 12], r: 22, color: '#ffc060' } };
      }
      return ps;
    },
  },
  // ------------------------------------------------------------------ cabeza de ídolo rota
  {
    id: 'sel_cabeza_idolo', nombre: ['Cabeza de ídolo rota', 'Broken idol head'], tema: 'selva', variantes: ['semienterrada', 'partida'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const enterrada = v === 'semienterrada';
      const zc = enterrada ? 12 : 22;
      const phi = (55 * Math.PI) / 180;
      suelo(a, ps, 32, 'tierra', 1.2);
      if (enterrada) ps.push(a.elipsoide(0, 0, 0, 30, 28, 7, { mat: 'tierra' }));
      const q = (R: number, l: number, z: number) => frente(phi, R, l, zc + z);
      const G = deg(phi);
      ps.push(a.elipsoide(-Math.cos(phi) * 3, -Math.sin(phi) * 3, zc, 17, 19, 23, { mat: 'piedra', giro: G }));
      // cara plana y ancha
      ps.push(a.poliedro([q(4, -16, -19), q(4, 16, -19), q(4, -17, 10), q(4, 17, 10), q(13, -15, -18), q(13, 15, -18), q(15, -16, 9), q(15, 16, 9), q(17, -6, -18), q(17, 6, -18), q(18, -7, 8), q(18, 7, 8)], { mat: 'piedra', tono: 0.03 }));
      // casco con visera
      ps.push(a.elipsoide(-Math.cos(phi) * 4, -Math.sin(phi) * 4, zc + 10, 19, 21, 16, { mat: 'piedra', giro: G, tono: -0.08 }));
      const vis = q(14.5, 0, 8); ps.push(a.caja(vis[0], vis[1], vis[2], 36, 8, 6.5, { mat: 'piedra', giro: G + 90, tono: -0.04 }));
      for (let k = -2; k <= 2; k++) { const d = q(18.4, k * 6.5, 9.5); ps.push(a.caja(d[0], d[1], d[2], 3, 1.2, 3, { mat: 'piedra', giro: G + 90, tono: -0.18 })); }
      for (const s of [-1, 1]) {
        // párpado abultado y ojo hundido
        const e = q(17.6, s * 6.5, 1); ps.push(a.elipsoide(e[0], e[1], e[2], 2.6, 5, 2.8, { mat: 'piedra', giro: G, tono: 0.06 }));
        const e2 = q(19.6, s * 6.5, 0.6); ps.push(a.elipsoide(e2[0], e2[1], e2[2], 1, 3.4, 1, { mat: 'negro', giro: G }));
        const o = q(1, s * 18.5, -4); ps.push(a.cilindro(o[0], o[1], o[2], 5, 3, { mat: 'piedra_gris', eje: [-Math.sin(phi) * s, Math.cos(phi) * s, 0] }), a.cilindro(o[0] - Math.sin(phi) * s * 0.5, o[1] + Math.cos(phi) * s * 0.5, o[2], 2.3, 3, { mat: 'negro', eje: [-Math.sin(phi) * s, Math.cos(phi) * s, 0] }));
      }
      ps.push(a.poliedro([q(18, -2.2, 4), q(18, 2.2, 4), q(18.5, -6, -7), q(18.5, 6, -7), q(22.5, -4, -6.5), q(22.5, 4, -6.5), q(21, 0, 0)], { mat: 'piedra', tono: 0.06 }));
      for (const s of [-1, 1]) { const n = q(21.5, s * 2.4, -6.3); ps.push(a.esfera(n[0], n[1], n[2], 1, { mat: 'negro' })); }
      const l1 = q(17.6, 0, -10.5); ps.push(a.elipsoide(l1[0], l1[1], l1[2], 3, 8, 2.2, { mat: 'piedra', giro: G, tono: 0.05 }));
      const l2 = q(17.2, 0, -14.6); ps.push(a.elipsoide(l2[0], l2[1], l2[2], 3, 7, 2.2, { mat: 'piedra', giro: G, tono: 0.02 }));
      const l3 = q(18.6, 0, -12.6); ps.push(a.caja(l3[0], l3[1], l3[2], 13, 1.6, 1, { mat: 'negro', giro: G + 90 }));
      if (v === 'partida') {
        // grieta y pedazo caído
        ps.push(a.caja(-4, 6, zc - 30, 2.2, 60, 70, { mat: 'piedra', resta: true, giro: deg(phi) - 70, incl: 12 }));
        ps.push(a.caja(-14, -14, zc + 18, 30, 30, 20, { mat: 'piedra', resta: true, giro: 30, incl: 25 }));
        ps.push(a.poliedro([[-28, 8, 0], [-16, 16, 0], [-22, 22, 0], [-30, 18, 0], [-26, 14, 9], [-20, 17, 8], [-24, 12, 6]], { mat: 'piedra', tono: -0.04 }));
        ps.push(a.poliedro([[22, -12, 0], [28, -6, 0], [24, -2, 0], [24, -8, 5]], { mat: 'piedra' }), a.elipsoide(-10, 22, 1, 3, 2, 2, { mat: 'piedra' }));
      }
      // musgo y lianas encima
      for (let i = 0; i < 5; i++) { const g = a.r() * PI2; ps.push(a.elipsoide(Math.cos(g) * 8, Math.sin(g) * 8, zc + 20 + a.r() * 4, 6 + a.r() * 3, 5, 2.5, { mat: 'musgo', giro: a.r() * 180 })); }
      for (let i = 0; i < 3; i++) { const g = -0.6 + a.r() * 2.2; ps.push(a.palo([Math.cos(g) * 6, Math.sin(g) * 6, zc + 24], [Math.cos(g) * 20, Math.sin(g) * 20, zc - 4], 1, { mat: 'pasto' }), a.palo([Math.cos(g) * 20, Math.sin(g) * 20, zc - 4], [Math.cos(g) * 26, Math.sin(g) * 26, 0], 1, { mat: 'pasto' })); }
      for (let i = 0; i < 5; i++) { const g = a.r() * PI2; ps.push(a.elipsoide(Math.cos(g) * 24, Math.sin(g) * 24, 1, 4, 3, 3, { mat: 'hojas_selva', tono: jit(a, 0.1) })); }
      return ps;
    },
  },
);
