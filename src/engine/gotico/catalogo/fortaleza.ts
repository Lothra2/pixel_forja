import { registrar, type Arma, type ObjetoDef, type Pieza, type V3 } from '../objeto';
import { MATERIALES } from '../materiales';
import { ruido, type Escena } from '../render';

/**
 * Fortaleza del cielo (el pueblo del cuarto acto): murallas de piedra oscura con runas que brillan, baldosas de
 * runas, pilares de mármol y oro, cristales, la forja de fuego azul, estatuas de ángeles, braseros de fuego blanco
 * y la puerta.
 */

const junta = (v: number, paso: number, grosor = 1) => { const m = ((v % paso) + paso) % paso; return m < grosor ? 1 : 0; };
function bloques(largo: number, alto: number) {
  return (p: V3, n: V3) => {
    const fila = Math.floor(p[2] / alto);
    if (Math.abs(n[2]) > 0.7) { const corre = (Math.floor(p[1] / alto) % 2) * largo * 0.5; return junta(p[1], alto) || junta(p[0] + corre, largo) ? -0.3 : (ruido(p[0] * 0.1, p[1] * 0.1, 3) - 0.5) * 0.12; }
    const corre = (fila % 2) * largo * 0.5, u = Math.abs(n[0]) > Math.abs(n[1]) ? p[1] : p[0];
    if (junta(p[2], alto)) return -0.32;
    if (junta(u + corre, largo)) return -0.28;
    return (ruido(Math.floor((u + corre) / largo) * 1.7, fila * 2.3, 9) - 0.5) * 0.2;
  };
}
MATERIALES.fortaleza_piedra = { rampa: ['#0d0e13', '#171920', '#21242d', '#2c303b', '#383d4a', '#454b5a', '#535a6b'], ruido: 0.25, escala: 0.18, patron: bloques(24, 12) };
MATERIALES.fortaleza_lisa = { rampa: ['#0d0e13', '#171920', '#21242d', '#2c303b', '#383d4a', '#454b5a', '#535a6b'], ruido: 0.22, escala: 0.15 };
MATERIALES.fortaleza_cristal = { rampa: ['#0a1628', '#112442', '#1a365e', '#26497c', '#355f98', '#4a78b2', '#6c9acc', '#a8c8e8'], ruido: 0.18, escala: 0.12, brillo: 0.9 };
MATERIALES.fortaleza_fuego = { rampa: ['#2a4a7a', '#4a78aa', '#7aa8d4', '#a8cceb', '#d2e8f8', '#f2faff', '#ffffff'], ruido: 0.5, escala: 0.25, emite: true };

const PI2 = Math.PI * 2;
const deg = (r: number) => (r * 180) / Math.PI;
const jit = (a: Arma, k: number) => (a.r() - 0.5) * 2 * k;
const frente = (phi: number, R: number, lado: number, z: number, cx = 0, cy = 0): V3 => [cx + Math.cos(phi) * R - Math.sin(phi) * lado, cy + Math.sin(phi) * R + Math.cos(phi) * lado, z];
const B = 'fortaleza_piedra', L = 'fortaleza_lisa', F = 'fortaleza_fuego';

/** Gira todas las piezas `g` grados alrededor del eje vertical (el origen queda en su lugar). */
function rotarZ(ps: Pieza[], g: number): Pieza[] {
  const c = Math.cos((g * Math.PI) / 180), s = Math.sin((g * Math.PI) / 180);
  const R = (v: V3): V3 => [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
  return ps.map((p): Pieza => {
    if (p.k === 'conv') return { ...p, planos: p.planos.map(([n, d]) => [R(n), d] as [V3, number]), pts: p.pts.map(R) };
    if (p.k === 'cono') return { ...p, o: R(p.o), ex: R(p.ex), ey: R(p.ey), ez: R(p.ez) };
    if (p.k === 'elip') return { ...p, c: R(p.c), ex: R(p.ex), ey: R(p.ey), ez: R(p.ez) };
    return p;
  });
}
/** Agrega a cada variante su gemela a lo largo del eje y (`<variante>_y`): las mismas piezas giradas -90°. */
const EJE_Y = ['for_muro_runas', 'for_puerta'];
const conEjes = (...ds: ObjetoDef[]) => ds.map((d) => (EJE_Y.includes(d.id) ? dosEjes(d) : d));
function dosEjes(d: ObjetoDef): ObjetoDef {
  const hp = d.huellaPor ? Object.fromEntries(Object.entries(d.huellaPor).flatMap(([k, [w, h]]) => [[k, [w, h]], [k + '_y', [h, w]]])) as Record<string, [number, number]> : undefined;
  return {
    ...d, huellaPor: hp, variantes: [...d.variantes, ...d.variantes.map((v) => v + '_y')],
    armar: (v, f, a) => {
      if (!v.endsWith('_y')) return d.armar(v, f, a);
      const r = d.armar(v.slice(0, -2), f, a);
      if (Array.isArray(r)) return rotarZ(r, -90);
      const e: Escena = { ...r, piezas: rotarZ(r.piezas, -90) };
      if (r.resplandor) { const [x, y, z] = r.resplandor.c; e.resplandor = { ...r.resplandor, c: [y, -x, z] }; }
      return e;
    },
  };
}
function llama(a: Arma, ps: Pieza[], x: number, y: number, z: number, s: number, f: number, mat = F) {
  const fr = (k: number) => Math.sin((f / 6) * PI2 + k * 2.1);
  for (let k = 0; k < 3; k++) {
    const ang = (k / 3) * PI2 + f * 0.5;
    ps.push(a.cilindro(x + Math.cos(ang) * s * 0.5, y + Math.sin(ang) * s * 0.5, z, s * (0.95 - k * 0.12), s * (2.3 + fr(k) * 0.7 + k * 0.5), { mat, r1: 0.25, tono: -0.1 }));
  }
  ps.push(a.elipsoide(x, y, z + s * 0.3, s * 1.2, s * 1.2, s * 0.6, { mat, tono: 0.1 }));
}
/**
 * Una runa angular tallada y encendida en la cara +y (en y = c) o +x (en x = c), centrada en u, z: tres trazos al
 * azar de una plantilla (un tallo y dos ramas).
 */
function runa(a: Arma, ps: Pieza[], cara: 'x' | 'y', c: number, u: number, z: number, h: number, tono = 0) {
  const tr = (du0: number, dz0: number, du1: number, dz1: number) => {
    const mu = u + (du0 + du1) / 2, mz = z + (dz0 + dz1) / 2, L = Math.hypot(du1 - du0, dz1 - dz0) + 1.4, ang = deg(Math.atan2(dz1 - dz0, du1 - du0));
    // en la cara y: la caja corre en x e inclina hacia z con incl en el eje y
    ps.push(cara === 'y' ? a.caja(mu, c, mz - 0.7, L, 1.6, 1.4, { mat: 'runa', incl: ang, inclEje: 'y', tono }) : a.caja(c, mu, mz - 0.7, L, 1.6, 1.4, { mat: 'runa', giro: 90, incl: ang, inclEje: 'y', tono }));
  };
  const w = h * 0.35;
  tr(0, -h / 2, 0, h / 2);
  const k = Math.floor(a.r() * 4);
  if (k === 0) { tr(0, h / 2, w, h / 6); tr(0, 0, w, -h / 3); }
  else if (k === 1) { tr(-w, h / 3, w, -h / 3); tr(-w, -h / 3, w, h / 3); }
  else if (k === 2) { tr(0, h / 4, w, h / 2); tr(0, h / 4, -w, h / 2); }
  else { tr(0, -h / 6, w, h / 6); tr(w, h / 6, w, -h / 2); }
}

registrar(...conEjes(
  // ------------------------------------------------------------------ muralla con runas
  {
    id: 'for_muro_runas', nombre: ['Muralla de runas', 'Rune fortress wall'], tema: 'fortaleza', variantes: ['recto', 'torre', 'roto'], huella: [5, 2], huellaPor: { torre: [5, 4] }, bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const Hm = 128;
      ps.push(a.caja(0, 0, 0, 84, 24, 12, { mat: B, tono: -0.03 }), a.poliedro([[-41, -11, 12], [41, -11, 12], [-41, 11, 12], [41, 11, 12], [-40, -8, 22], [40, -8, 22], [-40, 8, 22], [40, 8, 22]], { mat: B }));
      ps.push(a.caja(0, 0, 22, 80, 16, Hm - 22, { mat: B }));
      // pilastras y runas encendidas en ranuras
      for (const x of [-30, 0, 30]) ps.push(a.caja(x, 8.5, 22, 7, 3, Hm - 30, { mat: L, tono: 0.04 }));
      for (const x of [-15, 15]) {
        ps.push(a.caja(x, 8, 56, 12, 3, 30, { mat: L, resta: true }), a.caja(x, 6.6, 56, 12, 1, 30, { mat: 'negro' }));
        runa(a, ps, 'y', 7.6, x, 71, 22, -0.05);
      }
      ps.push(a.caja(0, 0, Hm - 8, 86, 22, 8, { mat: L, tono: 0.05 }));
      for (let k = 0; k < 9; k++) ps.push(a.caja(-40 + k * 10, 10.6, Hm - 11, 4, 2, 3, { mat: L, tono: -0.05 }));
      // almenas
      const merlones = v === 'roto' ? [-34, -20, 20] : [-34, -20, -6, 8, 22, 36];
      for (const x of merlones) ps.push(a.caja(x, 2, Hm, 9, 14, 13, { mat: B }), a.poliedro([[x - 4.5, -5, Hm + 13], [x + 4.5, -5, Hm + 13], [x - 4.5, 9, Hm + 13], [x + 4.5, 9, Hm + 13], [x, 2, Hm + 18]], { mat: L, tono: 0.04 }));
      if (v === 'torre') {
        ps.push(a.cilindro(0, 14, 0, 26, 14, { mat: B, r1: 24 }), a.cilindro(0, 14, 14, 22, Hm + 10, { mat: B }));
        ps.push(a.cilindro(0, 14, 64, 23, 4, { mat: L, tono: 0.05 }), a.cilindro(0, 14, Hm + 10, 26, 8, { mat: L, tono: 0.05 }));
        for (let k = 0; k < 4; k++) { const g = Math.PI * 0.05 + (k / 3) * Math.PI * 0.5; const x = Math.cos(g) * 22, y = 14 + Math.sin(g) * 22; ps.push(a.caja(x, y, 82, 3.5, 3.5, 22, { mat: L, resta: true, giro: deg(g) }), a.caja(Math.cos(g) * 20.4, 14 + Math.sin(g) * 20.4, 82, 2, 3, 22, { mat: 'runa', giro: deg(g), tono: -0.15 })); }
        for (let k = 0; k < 10; k++) { const g = (k / 10) * PI2; ps.push(a.caja(Math.cos(g) * 23, 14 + Math.sin(g) * 23, Hm + 18, 7, 6, 10, { mat: B, giro: deg(g) })); }
        ps.push(a.cilindro(0, 14, Hm + 18, 21, 4, { mat: L, tono: -0.05 }));
        // anillo de runas a media altura
        for (let k = 0; k < 5; k++) { const g = Math.PI * 0.05 + (k / 4) * Math.PI * 0.55; ps.push(a.caja(Math.cos(g) * 23.2, 14 + Math.sin(g) * 23.2, 65, 1.4, 2.5, 2, { mat: 'runa', giro: deg(g) })); }
      }
      if (v === 'roto') {
        ps.push(a.poliedro([[-6, -14, Hm + 30], [44, -14, Hm + 30], [-6, 14, Hm + 30], [44, 14, Hm + 30], [10, -14, Hm - 30], [44, -14, Hm - 50], [10, 14, Hm - 30], [44, 14, Hm - 50]], { mat: B, resta: true }));
        for (let i = 0; i < 6; i++) ps.push(a.caja(24 + jit(a, 16), 20 + jit(a, 6), 0, 8 + a.r() * 6, 6 + a.r() * 4, 4 + a.r() * 4, { mat: B, giro: a.r() * 90, incl: jit(a, 15) }));
      }
      return ps;
    },
  },
  // ------------------------------------------------------------------ baldosa de runas
  {
    id: 'for_baldosa_runa', nombre: ['Baldosa de runas', 'Rune floor tile'], tema: 'fortaleza', variantes: ['circulo', 'cruz', 'apagada'], huella: [5, 5], bloquea: false, plano: true, cuadros: 6, t: 4,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const pul = v === 'apagada' ? -0.45 : -0.1 + Math.sin((f / 6) * PI2) * 0.12;
      if (v === 'circulo' || v === 'apagada') {
        ps.push(a.cilindro(0, 0, 0, 26, 2.2, { mat: 'runa', tono: pul }), a.cilindro(0, 0, 0, 24, 3, { mat: 'runa', resta: true }));
        ps.push(a.cilindro(0, 0, 0, 13, 2.2, { mat: 'runa', tono: pul }), a.cilindro(0, 0, 0, 11.5, 3, { mat: 'runa', resta: true }));
        for (let k = 0; k < 8; k++) { const g = (k / 8) * PI2; ps.push(a.caja(Math.cos(g) * 19, Math.sin(g) * 19, 0, 8, 1.4, 2.2, { mat: 'runa', giro: deg(g), tono: pul })); }
        ps.push(a.poliedro([[0, -5, 0], [5, 0, 0], [0, 5, 0], [-5, 0, 0], [0, -5, 2.2], [5, 0, 2.2], [0, 5, 2.2], [-5, 0, 2.2]], { mat: 'runa', tono: pul + 0.1 }));
      } else {
        for (const g of [0, 90]) ps.push(a.caja(0, 0, 0, 70, 1.6, 2.2, { mat: 'runa', giro: g, tono: pul }));
        for (const g of [45, 135]) ps.push(a.caja(0, 0, 0, 30, 1.4, 2.2, { mat: 'runa', giro: g, tono: pul }));
        ps.push(a.poliedro([[0, -16, 0], [16, 0, 0], [0, 16, 0], [-16, 0, 0], [0, -16, 2.2], [16, 0, 2.2], [0, 16, 2.2], [-16, 0, 2.2]], { mat: 'runa', tono: pul }), a.poliedro([[0, -14, 0], [14, 0, 0], [0, 14, 0], [-14, 0, 0], [0, -14, 3], [14, 0, 3], [0, 14, 3], [-14, 0, 3]], { mat: 'runa', resta: true }));
        for (const [x, y] of [[24, 24], [-24, 24], [24, -24], [-24, -24]]) ps.push(a.cilindro(x, y, 0, 3, 2.2, { mat: 'runa', tono: pul + 0.05 }));
      }
      // losas de piedra oscura
      for (const x of [-20, 20]) for (const y of [-20, 20]) ps.push(a.caja(x, y, 0, 39.2, 39.2, 2, { mat: L, tono: jit(a, 0.05) }));
      ps.push(a.caja(0, 0, 0, 80, 80, 1.4, { mat: 'negro' }));
      return v === 'apagada' ? ps : { piezas: ps, resplandor: { c: [0, 0, 2], r: 46, color: '#5ac8f0' } };
    },
  },
  // ------------------------------------------------------------------ pilar celestial
  {
    id: 'for_pilar', nombre: ['Pilar celestial', 'Heavenly pillar'], tema: 'fortaleza', variantes: ['entero', 'roto'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      ps.push(a.caja(0, 0, 0, 30, 30, 5, { mat: B }), a.caja(0, 0, 5, 24, 24, 5, { mat: 'marmol' }), a.cilindro(0, 0, 10, 11, 4, { mat: 'oro', r1: 10 }));
      const H = v === 'roto' ? 62 : 118;
      ps.push(a.cilindro(0, 0, 14, 9, H - 14, { mat: 'marmol', r1: 8 }));
      for (let k = 0; k < 8; k++) { const g = (k / 8) * PI2 + Math.PI / 8; ps.push(a.caja(Math.cos(g) * 8.6, Math.sin(g) * 8.6, 16, 1.4, 1.4, H - 20, { mat: 'marmol', giro: deg(g), tono: -0.12 })); }
      for (const z of [40, 80]) if (z < H - 4) ps.push(a.cilindro(0, 0, z, 9.4, 2.5, { mat: 'oro' }));
      if (v === 'entero') {
        ps.push(a.cilindro(0, 0, H, 8, 6, { mat: 'oro', r1: 13 }), a.caja(0, 0, H + 6, 30, 30, 2, { mat: 'oro', tono: -0.2 }), a.caja(0, 0, H + 8, 28, 28, 6, { mat: 'marmol', tono: -0.08 }));
        for (let k = 0; k < 4; k++) { const g = (k / 4) * PI2 + Math.PI / 4; ps.push(a.poliedro([[Math.cos(g) * 10, Math.sin(g) * 10, H + 1], [Math.cos(g) * 15, Math.sin(g) * 15, H + 6], [Math.cos(g + 0.3) * 10, Math.sin(g + 0.3) * 10, H + 6], [Math.cos(g - 0.3) * 10, Math.sin(g - 0.3) * 10, H + 6]], { mat: 'oro' })); }
        for (const [x, y] of [[0, 14.6], [14.6, 0]]) ps.push(a.caja(x, y, H + 7, x ? 1 : 6, y ? 1 : 6, 2.5, { mat: 'runa', tono: -0.1 }));
      } else {
        ps.push(a.poliedro([[-8, 0, H], [8, 0, H], [0, -8, H], [0, 8, H], [-5, 3, H + 9], [4, -2, H + 5], [2, 5, H + 3]], { mat: 'marmol', tono: -0.04 }));
        ps.push(a.cilindro(18, 16, 9, 8.5, 26, { mat: 'marmol', eje: [1, -0.4, 0.05], tono: -0.03 }), a.cilindro(-22, 10, 0, 9, 9, { mat: 'marmol', eje: [0.3, 1, 0.2] }));
        ps.push(a.caja(-16, -20, 0, 26, 26, 5, { mat: 'marmol', giro: 30, incl: 12, tono: -0.04 }), a.caja(-17, -21, 4, 28, 28, 3, { mat: 'oro', giro: 30, incl: 12, tono: -0.1 }));
      }
      return ps;
    },
  },
  // ------------------------------------------------------------------ cristales
  {
    id: 'for_cristales', nombre: ['Formación de cristales', 'Crystal formation'], tema: 'fortaleza', variantes: ['azul', 'morado', 'grande'], huella: [3, 3], huellaPor: { grande: [4, 4] }, bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const mat = v === 'morado' ? 'cristal' : 'fortaleza_cristal';
      ps.push(a.elipsoide(0, 0, 0, 22, 20, 7, { mat: L, tono: -0.05 }), a.caja(0, 0, -30, 100, 100, 30, { mat: L, resta: true }));
      for (let i = 0; i < 5; i++) { const g = a.r() * PI2; ps.push(a.elipsoide(Math.cos(g) * 18, Math.sin(g) * 18, 0, 5 + a.r() * 4, 4 + a.r() * 3, 3 + a.r() * 3, { mat: 'roca', giro: a.r() * 180 })); }
      const prisma = (x: number, y: number, z: number, r: number, h: number, dir: V3) => {
        const L0 = Math.hypot(...dir), d: V3 = [dir[0] / L0, dir[1] / L0, dir[2] / L0];
        const t: V3 = Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
        const ex: V3 = [d[1] * t[2] - d[2] * t[1], d[2] * t[0] - d[0] * t[2], d[0] * t[1] - d[1] * t[0]], le = Math.hypot(...ex);
        ex[0] /= le; ex[1] /= le; ex[2] /= le;
        const ey: V3 = [d[1] * ex[2] - d[2] * ex[1], d[2] * ex[0] - d[0] * ex[2], d[0] * ex[1] - d[1] * ex[0]];
        const anillo = (s: number, rr: number): V3[] => Array.from({ length: 6 }, (_, k) => { const g = (k / 6) * PI2; return [x + d[0] * s + (ex[0] * Math.cos(g) + ey[0] * Math.sin(g)) * rr, y + d[1] * s + (ex[1] * Math.cos(g) + ey[1] * Math.sin(g)) * rr, z + d[2] * s + (ex[2] * Math.cos(g) + ey[2] * Math.sin(g)) * rr]; });
        ps.push(a.poliedro([...anillo(-2, r), ...anillo(h * 0.78, r * 0.92), [x + d[0] * h, y + d[1] * h, z + d[2] * h]], { mat, tono: jit(a, 0.06) }));
      };
      const n = v === 'grande' ? 11 : 7, esc = v === 'grande' ? 1.5 : 1;
      prisma(0, 0, 0, 7 * esc, 48 * esc, [jit(a, 0.15), jit(a, 0.15), 1]);
      for (let i = 0; i < n; i++) {
        const g = (i / n) * PI2 + a.r() * 0.5, d = (5 + a.r() * 6) * esc;
        prisma(Math.cos(g) * d, Math.sin(g) * d, 0, (2.5 + a.r() * 3) * esc, (14 + a.r() * 22) * esc, [Math.cos(g) * (0.4 + a.r() * 0.5), Math.sin(g) * (0.4 + a.r() * 0.5), 1]);
      }
      return { piezas: ps, resplandor: { c: [0, 0, 20 * esc], r: 34 * esc, color: v === 'morado' ? '#9a6ad8' : '#6aa8e8' } };
    },
  },
  // ------------------------------------------------------------------ forja de fuego azul
  {
    id: 'for_forja', nombre: ['Forja de fuego azul', 'Blue-fire forge'], tema: 'fortaleza', variantes: ['activa', 'apagada'], huella: [4, 3], bloquea: true, cuadros: 6, t: 3,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const activa = v === 'activa';
      // hogar con campana y chimenea
      ps.push(a.caja(-8, -6, 0, 48, 34, 26, { mat: B }), a.caja(-8, -6, 26, 52, 38, 3, { mat: L, tono: 0.05 }));
      ps.push(a.poliedro([[-32, -24, 29], [16, -24, 29], [-32, 12, 29], [16, 12, 29], [-18, -14, 58], [2, -14, 58], [-18, 0, 58], [2, 0, 58]], { mat: B }));
      ps.push(a.caja(-8, -7, 58, 20, 14, 30, { mat: B }), a.caja(-8, -7, 88, 24, 18, 4, { mat: L, tono: 0.05 }));
      ps.push(a.caja(-8, 11, 4, 24, 4, 18, { mat: B, resta: true }), a.cilindro(-8, 9, 22, 12, 4, { mat: B, resta: true, eje: [0, 1, 0] }), a.caja(-8, 8.5, 4, 23, 1, 28, { mat: 'negro' }));
      ps.push(a.caja(-8, 11.6, 0, 30, 4, 4, { mat: L, tono: 0.04 }));
      runa(a, ps, 'y', 11, -26, 16, 10); runa(a, ps, 'y', 11, 10, 16, 10);
      // yunque y armas a medio hacer
      const ax = 26, ay = 10;
      ps.push(a.caja(ax, ay, 0, 12, 10, 6, { mat: L }), a.caja(ax, ay, 6, 7, 6, 6, { mat: 'hierro' }), a.caja(ax, ay, 12, 20, 8, 5, { mat: 'acero' }));
      ps.push(a.poliedro([[ax + 10, ay - 4, 12], [ax + 10, ay + 4, 12], [ax + 10, ay - 4, 17], [ax + 10, ay + 4, 17], [ax + 18, ay, 16]], { mat: 'acero' }));
      ps.push(a.caja(ax - 2, ay, 17, 14, 2.4, 0.8, { mat: activa ? 'fortaleza_fuego' : 'acero', giro: 10, tono: activa ? -0.25 : 0 }));
      ps.push(a.cilindro(ax - 14, ay + 14, 0, 6, 8, { mat: 'madera', r1: 6.5 }), a.cilindro(ax - 14, ay + 14, 7.4, 5.4, 0.6, { mat: 'agua' }));
      for (let k = 0; k < 3; k++) ps.push(a.palo([16 + k * 4, -24, 0], [18 + k * 4, -20, 30], 0.9, { mat: 'acero' }), a.caja(18 + k * 4, -20, 30, 1, 4, 3, { mat: 'oro' }));
      if (activa) { llama(a, ps, -8, 4, 4, 7.5, f); return { piezas: ps, resplandor: { c: [-8, 12, 14], r: 46, color: '#6ab4ff' } }; }
      ps.push(a.elipsoide(-8, 4, 4, 9, 6, 2.5, { mat: 'tierra', tono: -0.1 }), a.elipsoide(-6, 5, 5, 3, 2, 1, { mat: 'fortaleza_fuego', tono: -0.45 }));
      return ps;
    },
  },
  // ------------------------------------------------------------------ estatua de ángel
  {
    id: 'for_estatua_angel', nombre: ['Estatua de ángel', 'Angel statue'], tema: 'fortaleza', variantes: ['espada', 'orando', 'rota'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const phi = (50 * Math.PI) / 180, G = deg(phi), m = 'marmol', rota = v === 'rota';
      const q = (R: number, l: number, z: number) => frente(phi, R, l, z);
      ps.push(a.caja(0, 0, 0, 40, 40, 6, { mat: B, giro: G }), a.caja(0, 0, 6, 32, 32, 10, { mat: L, giro: G }), a.caja(0, 0, 16, 34, 34, 2, { mat: 'oro', giro: G, tono: -0.25 }));
      { const r = q(16.2, 0, 9); ps.push(a.caja(r[0], r[1], 7, 14, 1, 6, { mat: 'runa', giro: G + 90, tono: -0.1 })); }
      const z0 = 18;
      // túnica (cono) y torso
      ps.push(a.cilindro(0, 0, z0, 11, 38, { mat: m, r1: 6 }));
      for (let k = 0; k < 6; k++) { const g = phi + ((k - 2.5) / 6) * Math.PI; ps.push(a.palo([Math.cos(g) * 10.6, Math.sin(g) * 10.6, z0], [Math.cos(g) * 6, Math.sin(g) * 6, z0 + 36], 1.1, { mat: m, tono: -0.08 })); }
      const to = q(0, 0, z0 + 46); ps.push(a.elipsoide(to[0], to[1], to[2], 5.5, 8, 9, { mat: m, giro: G }));
      ps.push(a.cilindro(0, 0, z0 + 36, 6.4, 2, { mat: 'oro' }));
      if (!rota) {
        const hd = q(0.5, 0, z0 + 59); ps.push(a.esfera(hd[0], hd[1], hd[2] - (v === 'orando' ? 1 : 0), 4.4, { mat: m }));
        ps.push(a.elipsoide(hd[0] - Math.cos(phi) * 1.4, hd[1] - Math.sin(phi) * 1.4, hd[2] + 1.6, 4.8, 4.8, 3.4, { mat: m, tono: -0.05 }));
        ps.push(a.cilindro(hd[0], hd[1], hd[2] + 6, 5, 0.8, { mat: 'oro', incl: -10 }), a.cilindro(hd[0], hd[1], hd[2] + 6, 4, 1.2, { mat: 'oro', resta: true, incl: -10 }));
      } else {
        ps.push(a.poliedro([q(-1, -3, z0 + 54), q(-1, 3, z0 + 54), q(2, 0, z0 + 54), q(0, 0, z0 + 57)], { mat: m, tono: -0.05 }));
        const hd = q(18, -12, 0); ps.push(a.esfera(hd[0], hd[1], 4, 4.4, { mat: m, tono: -0.05 }));
      }
      // brazos
      if (v === 'espada') {
        for (const s of [-1, 1]) { const h = q(0, s * 7.5, z0 + 51), c = q(4, s * 6, z0 + 41), mn = q(7, s * 1.6, z0 + 38); ps.push(a.palo(h, c, 2.1, { mat: m, r1: 1.8 }), a.palo(c, mn, 1.8, { mat: m, r1: 1.6 })); }
        const pu = q(8, 0, z0 + 38);
        ps.push(a.palo([pu[0], pu[1], pu[2] + 5], [pu[0], pu[1], pu[2] - 2], 1, { mat: 'oro' }), a.caja(pu[0], pu[1], pu[2] - 3, 11, 2, 2, { mat: 'oro', giro: G + 90 }));
        ps.push(a.poliedro([[pu[0] - 1.6 * Math.sin(-phi), pu[1] - 1.6 * Math.cos(phi), pu[2] - 3], [pu[0] + 1.6 * Math.sin(-phi), pu[1] + 1.6 * Math.cos(phi), pu[2] - 3], [pu[0], pu[1], pu[2] - 3.5], [pu[0], pu[1], z0 + 2]], { mat: 'acero' }));
      } else if (v === 'orando') {
        for (const s of [-1, 1]) { const h = q(0, s * 7.5, z0 + 51), c = q(5, s * 6, z0 + 43), mn = q(7.5, s * 0.8, z0 + 49); ps.push(a.palo(h, c, 2.1, { mat: m, r1: 1.8 }), a.palo(c, mn, 1.8, { mat: m, r1: 1.4 })); }
      } else {
        const h = q(0, 7.5, z0 + 51), c = q(4, 9, z0 + 42); ps.push(a.palo(h, c, 2.1, { mat: m, r1: 1.8 }));
        ps.push(a.esfera(...(q(0, -7.5, z0 + 51).slice(0, 2) as [number, number]), z0 + 51, 2.5, { mat: m }));
      }
      // alas: plumas en capas, hacia arriba y atrás
      for (const s of [-1, 1]) {
        if (rota && s === -1) { const b = q(-4, s * 5, z0 + 50); ps.push(a.poliedro([b, q(-7, s * 10, z0 + 56), q(-6, s * 12, z0 + 48), q(-5, s * 8, z0 + 46)], { mat: m, tono: -0.05 })); continue; }
        const b = q(-4, s * 5, z0 + 50);
        for (let k = 0; k < 6; k++) {
          const t = k / 5, tip = q(-10 - t * 6, s * (14 + t * 18), z0 + 84 - t * 56), raiz = q(-5 - t * 3, s * (6 + t * 10), z0 + 54 + (1 - t) * 12);
          ps.push(a.poliedro([b, raiz, tip, q(-6.5 - t * 6, s * (13 + t * 17), z0 + 80 - t * 54), [raiz[0] - Math.cos(phi) * 2, raiz[1] - Math.sin(phi) * 2, raiz[2]]], { mat: m, tono: 0.02 - t * 0.08 }));
        }
        const hb = q(-6, s * 16, z0 + 72); ps.push(a.palo(b, hb, 2.2, { mat: m, r1: 1.5 }), a.palo(hb, q(-12, s * 18, z0 + 86), 1.5, { mat: m, r1: 0.6 }));
      }
      if (rota) { ps.push(a.caja(-18, 14, 0, 12, 8, 4, { mat: m, giro: 20, incl: 10 }), a.poliedro([[14, -18, 0], [22, -14, 0], [18, -10, 0], [18, -14, 4]], { mat: m })); ps.push(a.caja(0, 0, z0 + 20, 1.8, 40, 40, { mat: m, resta: true, giro: G - 30, incl: 25 })); }
      return ps;
    },
  },
  // ------------------------------------------------------------------ brasero de fuego blanco
  {
    id: 'for_brasero', nombre: ['Brasero de fuego blanco', 'White-fire brazier'], tema: 'fortaleza', variantes: ['alto', 'cuenco'], huella: [1, 1], bloquea: true, cuadros: 6, t: 3,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      let zf: number;
      if (v === 'alto') {
        ps.push(a.caja(0, 0, 0, 16, 16, 4, { mat: B }), a.cilindro(0, 0, 4, 5, 3, { mat: 'oro', r1: 3.5 }), a.cilindro(0, 0, 7, 3, 30, { mat: 'marmol', r1: 2.6 }));
        for (const z of [16, 26]) ps.push(a.cilindro(0, 0, z, 3.4, 1.5, { mat: 'oro' }));
        ps.push(a.cilindro(0, 0, 37, 3, 6, { mat: 'oro', r1: 9 }), a.cilindro(0, 0, 42.5, 8.4, 0.6, { mat: 'negro' }));
        for (let k = 0; k < 4; k++) { const g = (k / 4) * PI2 + Math.PI / 4; ps.push(a.poliedro([[Math.cos(g) * 8, Math.sin(g) * 8, 42], [Math.cos(g + 0.3) * 8, Math.sin(g + 0.3) * 8, 42], [Math.cos(g + 0.15) * 11, Math.sin(g + 0.15) * 11, 48], [Math.cos(g + 0.15) * 8, Math.sin(g + 0.15) * 8, 38]], { mat: 'oro' })); }
        zf = 43;
      } else {
        ps.push(a.caja(0, 0, 0, 24, 24, 4, { mat: B }), a.cilindro(0, 0, 4, 9, 8, { mat: 'marmol', r1: 7 }), a.cilindro(0, 0, 12, 7, 6, { mat: 'oro', r1: 13 }), a.cilindro(0, 0, 17.5, 12.4, 0.6, { mat: 'negro' }));
        for (let k = 0; k < 4; k++) { const g = (k / 4) * PI2 + Math.PI / 4; ps.push(a.caja(Math.cos(g) * 9, Math.sin(g) * 9, 4, 2, 2, 8, { mat: 'runa', giro: deg(g), tono: -0.15 })); }
        zf = 18;
      }
      llama(a, ps, 0, 0, zf, v === 'alto' ? 4.4 : 6, f);
      return { piezas: ps, resplandor: { c: [0, 0, zf + 6], r: 38, color: '#a8dcff' } };
    },
  },
  // ------------------------------------------------------------------ puerta de la fortaleza
  {
    id: 'for_puerta', nombre: ['Puerta de la fortaleza', 'Fortress gate'], tema: 'fortaleza', variantes: ['cerrada', 'abierta'], huella: [7, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const Hm = 132, W = 112;
      ps.push(a.caja(0, 0, 0, W + 4, 26, 10, { mat: B, tono: -0.03 }), a.caja(0, 0, 10, W, 18, Hm - 10, { mat: B }));
      for (const s of [-1, 1]) ps.push(a.caja(s * (W / 2 - 8), 4, 0, 20, 26, Hm + 18, { mat: B, tono: 0.02 }), a.poliedro([[s * (W / 2 - 8) - 10, -9, Hm + 18], [s * (W / 2 - 8) + 10, -9, Hm + 18], [s * (W / 2 - 8) - 10, 17, Hm + 18], [s * (W / 2 - 8) + 10, 17, Hm + 18], [s * (W / 2 - 8), 4, Hm + 34]], { mat: L, tono: 0.04 }));
      // el arco
      ps.push(a.caja(0, 0, 10, 40, 40, 54, { mat: B, resta: true }), a.cilindro(0, -20, 64, 20, 40, { mat: B, resta: true, eje: [0, 1, 0] }));
      ps.push(a.cilindro(0, 9, 64, 24, 3, { mat: L, eje: [0, 1, 0], tono: 0.05 }), a.cilindro(0, 8, 64, 20, 6, { mat: L, resta: true, eje: [0, 1, 0] }), a.caja(0, 9, 10, 40, 8, 54, { mat: L, resta: true }));
      ps.push(a.caja(0, 9.5, 82, 6, 3, 10, { mat: L, tono: 0.08 }), a.caja(0, 11, 85, 2, 1, 5, { mat: 'runa' }));
      ps.push(a.caja(0, -8, 10, 40, 1, 74, { mat: 'negro' }));
      // hojas de la puerta
      const hoja = (s: number) => {
        if (v === 'cerrada') {
          ps.push(a.caja(s * 10, 0, 10, 19.6, 4, 54, { mat: 'madera', tono: -0.05 }));
          ps.push(a.poliedro([[s * 0.2, -2, 64], [s * 19.8, -2, 64], [s * 0.2, 2, 64], [s * 19.8, 2, 64], [s * 0.2, -2, 84], [s * 0.2, 2, 84], [s * 11, -2, 80], [s * 11, 2, 80]], { mat: 'madera', tono: -0.05 }));
          for (const z of [18, 40, 62]) ps.push(a.caja(s * 10, 2.4, z, 19.6, 1, 3, { mat: 'hierro' }));
          for (const z of [26, 50]) for (const x of [4, 10, 16]) ps.push(a.esfera(s * x, 2.6, z, 0.9, { mat: 'oro' }));
          ps.push(a.cilindro(s * 3, 3, 38, 2, 1, { mat: 'oro', eje: [0, 1, 0] }));
        } else {
          const g = s * 70, c = Math.cos((g * Math.PI) / 180), sn = Math.sin((g * Math.PI) / 180);
          const hx = s * 20, cx = hx - s * 10 * c, cy = -s * 10 * sn - 4;
          ps.push(a.caja(cx, cy, 10, 19.6, 4, 64, { mat: 'madera', giro: g, tono: -0.1 }));
          for (const z of [18, 40, 62]) ps.push(a.caja(cx, cy, z, 20, 4.8, 3, { mat: 'hierro', giro: g }));
        }
      };
      hoja(-1); hoja(1);
      if (v === 'abierta') ps.push(a.caja(0, -20, 10, 40, 6, 0.4, { mat: L, tono: -0.05 }));
      // runas sobre el arco y en las torres
      for (const x of [-26, 26]) runa(a, ps, 'y', 9.4, x, 100, 16, -0.05);
      for (const s of [-1, 1]) { runa(a, ps, 'y', 17.4, s * (W / 2 - 8), 70, 18, -0.05); }
      ps.push(a.caja(0, 0, Hm, W - 36, 24, 6, { mat: L, tono: 0.05 }));
      for (let k = 0; k < 5; k++) ps.push(a.caja(-32 + k * 16, 4, Hm + 6, 9, 14, 11, { mat: B }));
      return { piezas: ps, resplandor: { c: [0, 12, 85], r: 30, color: '#5ac8f0' } };
    },
  },
));
