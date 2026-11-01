import { registrar, type Arma, type Pieza, type V3 } from '../objeto';
import { MATERIALES } from '../materiales';

// Cuevas de hielo: paredes y púas de hielo, pilares, cristales que brillan, cuerpos atrapados en bloques, estanques
// helados, rocas escarchadas, antorchas de fuego azul y un altar de hielo.

MATERIALES.hie_hielo_oscuro = { rampa: ['#0e1822', '#16263a', '#20364e', '#2c4a64', '#3c607c', '#527a94', '#6e96ac', '#98b8c8'], ruido: 0.3, escala: 0.12, brillo: 0.45 };
MATERIALES.hie_escarcha = { rampa: ['#3a4a58', '#536676', '#6e8494', '#8ca2b0', '#acc0ca', '#cadae0', '#e4eef2'], ruido: 0.2, escala: 0.2 };
MATERIALES.hie_luz = { rampa: ['#0e3a50', '#16587a', '#2480a8', '#46aad0', '#80d0ec', '#c4ecf8', '#f0fbff'], ruido: 0.4, escala: 0.2, emite: true };
MATERIALES.hie_silueta = { rampa: ['#080e15', '#0d1620', '#13202c', '#1a2a38', '#223444'], ruido: 0.25, escala: 0.3, brillo: 0.3 };
MATERIALES.hie_roca = { rampa: ['#0e1013', '#1a1d22', '#282c33', '#373d45', '#484f59', '#5a626d', '#6e7782'], ruido: 0.5, escala: 0.13 };

const PI = Math.PI;
const rad = (g: number) => (g * PI) / 180;
const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const suelo = (a: Arma) => a.caja(0, 0, -80, 900, 900, 80, { mat: 'roca', resta: true });

/** Peña facetada: cáscara de puntos sobre un elipsoide, con la punta de arriba recortada. */
function pena(a: Arma, x: number, y: number, z: number, rx: number, ry: number, rz: number, o: { mat: string; giro?: number; tono?: number; n?: number }): Pieza {
  const g = rad(o.giro ?? a.r() * 360), c = Math.cos(g), s = Math.sin(g);
  const loc: V3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (let i = 0; i < (o.n ?? 8); i++) { const th = a.r() * 2 * PI, w = a.r() * 2 - 1, q = Math.sqrt(1 - w * w); loc.push([Math.cos(th) * q, Math.sin(th) * q, w]); }
  const pts: V3[] = loc.map(([lx, ly, lz]) => { const k = 0.84 + a.r() * 0.16; const px = lx * rx * k, py = ly * ry * k; return [x + px * c - py * s, y + px * s + py * c, z + Math.max(-0.8, Math.min(0.72, lz)) * rz * k]; });
  return a.poliedro(pts, { mat: o.mat, tono: o.tono });
}
/** Prisma de seis caras con punta, desde `base` hacia `dir`. */
function prisma(a: Arma, base: V3, dir: V3, largo: number, r: number, mat: string, tono = 0): Pieza {
  const d = norm(dir), t: V3 = Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0], u = norm(cross(t, d)), w = cross(d, u);
  const rot = a.r() * PI, pts: V3[] = [];
  for (let k = 0; k < 6; k++) {
    const an = rot + (k * PI) / 3, ox = (u[0] * Math.cos(an) + w[0] * Math.sin(an)) * r, oy = (u[1] * Math.cos(an) + w[1] * Math.sin(an)) * r, oz = (u[2] * Math.cos(an) + w[2] * Math.sin(an)) * r;
    pts.push([base[0] + ox - d[0] * 2, base[1] + oy - d[1] * 2, base[2] + oz - d[2] * 2]);
    pts.push([base[0] + ox * 0.95 + d[0] * largo * 0.72, base[1] + oy * 0.95 + d[1] * largo * 0.72, base[2] + oz * 0.95 + d[2] * largo * 0.72]);
  }
  pts.push([base[0] + d[0] * largo, base[1] + d[1] * largo, base[2] + d[2] * largo]);
  return a.poliedro(pts, { mat, tono });
}
/** Carámbano colgando: cono hacia abajo. */
const carambano = (a: Arma, x: number, y: number, z: number, largo: number, r: number) => a.cilindro(x, y, z - largo, 0.2, largo, { mat: 'hielo', r1: r, tono: 0.05 });
/** Pared de hielo: lajas facetadas apiladas a lo largo de una línea quebrada, con agujas arriba. */
function muroHielo(a: Arma, ps: Pieza[], pts: [number, number][], alto: number, grueso: number) {
  for (let s = 0; s < pts.length - 1; s++) {
    const [x0, y0] = pts[s], [x1, y1] = pts[s + 1];
    const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L, nx = -uy, ny = ux;
    const giro = (Math.atan2(uy, ux) * 180) / PI;
    const n = Math.max(2, Math.round(L / 15));
    for (let k = s === 0 ? 0 : 1; k <= n; k++) {
      const t = k / n, cx = x0 + (x1 - x0) * t + ux * (a.r() - 0.5) * 5, cy = y0 + (y1 - y0) * t + uy * (a.r() - 0.5) * 5;
      const h = alto * (0.74 + 0.3 * a.r());
      ps.push(pena(a, cx, cy, h * 0.42, 13, grueso * 0.72, h * 0.5, { mat: 'hie_hielo_oscuro', giro, tono: -0.1, n: 6 }));
      let z = 0;
      while (z < h - 6) {
        const fr = z / h, rz = Math.min(h - z, 12 + a.r() * 14) * 0.6 + 4, rl = 9 + a.r() * 6;
        const rn = grueso * (1 - 0.5 * fr) * (0.8 + 0.3 * a.r()), off = (a.r() - 0.5) * grueso * 0.5 * (1 - fr * 0.5);
        const mat = a.r() < 0.22 ? 'hie_roca' : a.r() < 0.5 ? 'hielo' : 'hie_hielo_oscuro';
        ps.push(pena(a, cx + nx * off, cy + ny * off, z + rz * 0.75, rl, rn, rz, { mat, giro: giro + (a.r() - 0.5) * 24, tono: (a.r() - 0.5) * 0.12 - fr * 0.04 }));
        z += rz * (1.1 + 0.25 * a.r());
      }
      // agujas de hielo arriba y escarcha al pie
      if (a.r() < 0.6) ps.push(prisma(a, [cx + nx * (a.r() - 0.5) * 6, cy + ny * (a.r() - 0.5) * 6, z - 6], [(a.r() - 0.5) * 0.5, (a.r() - 0.5) * 0.5, 1], 14 + a.r() * 16, 3 + a.r() * 2, 'hielo'));
      if (a.r() < 0.5) ps.push(prisma(a, [cx + nx * grueso * 0.9, cy + ny * grueso * 0.9, 2], [nx * 0.6 + (a.r() - 0.5) * 0.4, ny * 0.6 + (a.r() - 0.5) * 0.4, 1], 10 + a.r() * 10, 2.5, 'hielo'));
      if (a.r() < 0.6) ps.push(a.elipsoide(cx + nx * grueso * 0.7, cy + ny * grueso * 0.7, 0, 7 + a.r() * 4, 5, 2 + a.r() * 1.5, { mat: 'hie_escarcha', giro, tono: -0.12 }));
    }
  }
}
/** Llama (tres lenguas que se mueven con el cuadro). */
function llama(a: Arma, ps: Pieza[], x: number, y: number, z: number, f: number, n: number, e = 1, mat = 'fuego_azul') {
  for (let k = 0; k < 3; k++) {
    const an = (k / 3) * 2 * PI + f * 0.9, fr = Math.sin((f / n) * 2 * PI + k * 2.1);
    ps.push(a.cilindro(x + Math.cos(an) * 1.2 * e, y + Math.sin(an) * 1.2 * e, z, (3 - k * 0.5) * e, (8 + fr * 2.5 + k * 2) * e, { mat, r1: 0.3 }));
  }
  ps.push(a.elipsoide(x, y, z + 1.2 * e, 3.4 * e, 3.4 * e, 2.4 * e, { mat, tono: 0.2 }));
}
function calavera(a: Arma, ps: Pieza[], x: number, y: number, z: number, s = 1, giro = 45) {
  const g = rad(giro), fx = Math.cos(g), fy = Math.sin(g), sx = -fy, sy = fx;
  ps.push(a.elipsoide(x, y, z + 3.6 * s, 3.8 * s, 3.3 * s, 3.4 * s, { mat: 'hueso', giro }));
  ps.push(a.caja(x + fx * 2.2 * s, y + fy * 2.2 * s, z, 3 * s, 4 * s, 2.6 * s, { mat: 'hueso', giro, tono: -0.05 }));
  for (const l of [-1, 1]) ps.push(a.esfera(x + fx * 3 * s + sx * l * 1.4 * s, y + fy * 3 * s + sy * l * 1.4 * s, z + 4 * s, 1.2 * s, { mat: 'negro' }));
}
/** Escarcha en el piso alrededor. */
const escarcha = (a: Arma, rx: number, ry: number): Pieza[] => Array.from({ length: 4 }, (_, i) => {
  const t = (i / 4) * 2 * PI + a.r();
  return a.elipsoide(Math.cos(t) * rx * 0.4, Math.sin(t) * ry * 0.4, 0, rx * (0.45 + a.r() * 0.2), ry * (0.4 + a.r() * 0.2), 1 + a.r(), { mat: 'hie_escarcha', giro: a.r() * 180, tono: -0.18 });
});

registrar(
  {
    id: 'hie_muro', nombre: ['Pared de hielo', 'Ice wall'], tema: 'hielo', variantes: ['x', 'y', 'x_alta', 'y_alta'], huella: [5, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      muroHielo(a, ps, v.startsWith('x') ? [[-40, 0], [40, 0]] : [[0, -40], [0, 40]], v.endsWith('alta') ? 124 : 88, 14);
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'hie_muro_esquina', nombre: ['Esquina de hielo', 'Ice wall corner'], tema: 'hielo', variantes: ['interior', 'exterior'], huella: [4, 4], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      muroHielo(a, ps, v === 'exterior' ? [[24, -32], [24, 24], [-32, 24]] : [[32, -24], [-24, -24], [-24, 32]], 92, 14);
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'hie_puas', nombre: ['Púas de hielo', 'Ice spikes'], tema: 'hielo', variantes: ['grupo', 'alta', 'caidas'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [...escarcha(a, 20, 17)];
      if (v === 'caidas') {
        for (let i = 0; i < 6; i++) { const t = a.r() * 2 * PI, d = a.r() * 12, L = 10 + a.r() * 14, an = a.r() * 2 * PI; ps.push(prisma(a, [Math.cos(t) * d, Math.sin(t) * d, 2.5], [Math.cos(an), Math.sin(an), 0.08], L, 2 + a.r() * 1.5, 'hielo', (a.r() - 0.5) * 0.1)); }
        for (let i = 0; i < 9; i++) { const t = a.r() * 2 * PI, d = a.r() * 16; ps.push(pena(a, Math.cos(t) * d, Math.sin(t) * d, 1, 2 + a.r() * 2, 2, 1.5 + a.r(), { mat: 'hielo', tono: 0.05 })); }
        ps.push(prisma(a, [4, -4, 0], [0.1, -0.1, 1], 16, 3, 'hielo'));
      } else {
        const g = v === 'alta' ? 1.9 : 1;
        ps.push(pena(a, 0, 0, 2, 10 * g, 9 * g, 5, { mat: 'hie_hielo_oscuro' }));
        ps.push(prisma(a, [0, 0, 0], [(a.r() - 0.5) * 0.2, (a.r() - 0.5) * 0.2, 1], 30 * g, 4.5 * g, 'hielo'));
        const n = v === 'alta' ? 6 : 8;
        for (let i = 0; i < n; i++) {
          const t = (i / n) * 2 * PI + a.r() * 0.5, s = 0.35 + a.r() * 0.7;
          ps.push(prisma(a, [Math.cos(t) * 5 * g, Math.sin(t) * 5 * g, 0], [Math.cos(t) * s, Math.sin(t) * s, 1], (10 + a.r() * 18) * g, (2 + a.r() * 2) * g, a.r() < 0.3 ? 'hie_hielo_oscuro' : 'hielo', (a.r() - 0.5) * 0.12));
        }
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'hie_pilar', nombre: ['Pilar congelado', 'Frozen pillar'], tema: 'hielo', variantes: ['entero', 'roto'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [...escarcha(a, 22, 20), a.elipsoide(0, 0, 0, 16, 15, 8, { mat: 'hie_hielo_oscuro' })];
      const j = (a.r() - 0.5) * 5;
      if (v === 'entero') {
        ps.push(a.palo([0, 0, 0], [j, -j, 56], 13, { mat: 'hie_hielo_oscuro', r1: 6 }), a.palo([j, -j, 56], [0, 0, 112], 6, { mat: 'hie_hielo_oscuro', r1: 15 }));
        for (let i = 0; i < 6; i++) ps.push(pena(a, (a.r() - 0.5) * 20, (a.r() - 0.5) * 20, 104 + i * 4, 10 + a.r() * 6, 9 + a.r() * 6, 9, { mat: i % 2 ? 'hie_hielo_oscuro' : 'hielo', tono: -0.03 * i }));
        for (let i = 0; i < 6; i++) { const t = (i / 6) * 2 * PI + a.r(); ps.push(carambano(a, Math.cos(t) * 11, Math.sin(t) * 11, 104, 12 + a.r() * 14, 2.4)); }
      } else {
        ps.push(a.palo([0, 0, 0], [j, -j, 44], 13, { mat: 'hie_hielo_oscuro', r1: 7.5 }), pena(a, j, -j, 44, 8, 8, 6, { mat: 'hielo', tono: 0.06 }));
        ps.push(a.palo([-4, 22, 7], [-36, 8, 9], 13, { mat: 'hie_hielo_oscuro', r1: 6 }));
        for (let i = 0; i < 7; i++) ps.push(pena(a, (a.r() - 0.3) * 30, 6 + a.r() * 22, 1, 2 + a.r() * 3, 2 + a.r() * 2, 2 + a.r() * 2, { mat: 'hielo' }));
      }
      // agujas que salen del pie
      for (let i = 0; i < 5; i++) { const t = (i / 5) * 2 * PI + a.r(); ps.push(prisma(a, [Math.cos(t) * 12, Math.sin(t) * 12, 0], [Math.cos(t) * 0.6, Math.sin(t) * 0.6, 1], 8 + a.r() * 12, 2.4, 'hielo')); }
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'hie_cristales', nombre: ['Cristales de hielo', 'Ice crystal formation'], tema: 'hielo', variantes: ['grupo', 'alto', 'anillo'], cuadros: 4, t: 4, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => {
      const pulso = Math.sin((f / 4) * 2 * PI) * 0.08;
      const ps: Pieza[] = [...escarcha(a, 22, 20)];
      if (v === 'anillo') {
        ps.push(a.esfera(0, 0, 16 + Math.sin((f / 4) * 2 * PI) * 1.5, 4.5, { mat: 'hie_luz', tono: pulso }));
        for (let i = 0; i < 8; i++) { const t = (i / 8) * 2 * PI; ps.push(prisma(a, [Math.cos(t) * 15, Math.sin(t) * 13, 0], [-Math.cos(t) * 0.25, -Math.sin(t) * 0.25, 1], 16 + (i % 2) * 10 + a.r() * 5, 3, 'hielo')); }
        ps.push(a.cilindro(0, 0, 0, 6, 1.6, { mat: 'hie_luz', tono: -0.15 + pulso }));
        ps.push(suelo(a));
        return { piezas: ps, resplandor: { c: [0, 0, 16], r: 36, color: '#6ad0f0' } };
      }
      const g = v === 'alto' ? 1.8 : 1;
      ps.push(pena(a, 0, 0, 2, 9 * g, 8 * g, 5 * g, { mat: 'hie_roca' }));
      ps.push(a.elipsoide(0, 0, 4, 6 * g, 6 * g, 5 * g, { mat: 'hie_luz', tono: -0.1 + pulso }));
      ps.push(prisma(a, [0, 0, 1], [(a.r() - 0.5) * 0.3, (a.r() - 0.5) * 0.3, 1], 36 * g, 5 * g, 'hielo', 0.05));
      for (let i = 0; i < 8; i++) {
        const t = (i / 8) * 2 * PI + a.r() * 0.6, s = 0.3 + a.r() * 0.6, brilla = i % 3 === 0;
        ps.push(prisma(a, [Math.cos(t) * 5 * g, Math.sin(t) * 5 * g, 1], [Math.cos(t) * s, Math.sin(t) * s, 1], (12 + a.r() * 16) * g * (brilla ? 0.7 : 1), (2.2 + a.r() * 2) * g, brilla ? 'hie_luz' : 'hielo', brilla ? pulso : (a.r() - 0.5) * 0.1));
      }
      ps.push(suelo(a));
      return { piezas: ps, resplandor: { c: [0, 0, 14 * g], r: 34 * g, color: '#6ad0f0' } };
    },
  },
  {
    id: 'hie_cuerpo', nombre: ['Cuerpo en el hielo', 'Body frozen in ice'], tema: 'hielo', variantes: ['de_pie', 'acostado', 'bestia'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [...escarcha(a, 26, 22)];
      const S = { mat: 'hie_silueta' };
      if (v === 'acostado') {
        // bloque echado: la silueta se ve desde arriba
        ps.push(a.caja(0, 0, 0, 66, 24, 18, { mat: 'hielo', giro: 0 }));
        for (const [x, y, r] of [[-30, 10, 7], [28, -10, 8], [20, 12, 6], [-26, -12, 6]]) ps.push(pena(a, x, y, 6, r, r, 9, { mat: 'hielo', tono: 0.05 }));
        const z = 17.4;
        ps.push(a.elipsoide(-24, 0, z, 4.5, 4, 1, S), a.caja(-8, 0, z, 22, 13, 1, S), a.caja(12, -3, z, 22, 4.5, 1, { ...S, giro: -4 }), a.caja(12, 3.5, z, 22, 4.5, 1, { ...S, giro: 6 }));
        ps.push(a.caja(-10, -9, z, 16, 3.5, 1, { ...S, giro: 25 }), a.caja(-13, 8, z, 14, 3.5, 1, { ...S, giro: -40 }));
      } else {
        const bestia = v === 'bestia', W = bestia ? 40 : 28, H = bestia ? 84 : 70;
        ps.push(a.caja(0, 0, 0, W, 18, H, { mat: 'hielo' }));
        for (let i = 0; i < 6; i++) { const l = i % 2 ? 1 : -1; ps.push(pena(a, l * (W / 2 - 2), (a.r() - 0.8) * 8, 8 + a.r() * (H - 10), 7, 9, 10 + a.r() * 6, { mat: a.r() < 0.5 ? 'hielo' : 'hie_hielo_oscuro', tono: 0.04 })); }
        ps.push(pena(a, 0, -2, H, W * 0.55, 10, 8, { mat: 'hielo', tono: 0.08 }));
        ps.push(prisma(a, [-W * 0.3, 0, H - 2], [-0.3, 0.1, 1], 16, 3, 'hielo'), prisma(a, [W * 0.25, -3, H - 2], [0.2, -0.2, 1], 22, 3.5, 'hielo'));
        // la silueta, rozando la cara de adelante (y = 9)
        const y = 6.4, d = 5.4, yf = 8.6;
        if (!bestia) {
          ps.push(a.elipsoide(1, yf, 56, 4, 1.2, 4.6, S), a.caja(0, y, 34, 14, d, 17, { ...S, incl: 0 }), a.caja(0, y, 30, 10, d, 5, S));
          ps.push(a.caja(-4, y, 6, 4.6, d, 25, { ...S, incl: -6, inclEje: 'y' }), a.caja(4, y, 6, 4.6, d, 25, { ...S, incl: 8, inclEje: 'y' }));
          ps.push(a.caja(-10, y, 36, 3.6, d, 18, { ...S, incl: -22, inclEje: 'y' }), a.caja(9, y, 47, 3.6, d, 17, { ...S, incl: 30, inclEje: 'y' }));
        } else {
          ps.push(a.elipsoide(0, yf, 62, 7, 1.2, 6, S), a.elipsoide(0, yf, 40, 13, 1.2, 16, S));
          for (const l of [-1, 1]) {
            ps.push(a.palo([l * 5, 8.2, 66], [l * 13, 8.2, 75], 2, { ...S, r1: 0.9 }));
            ps.push(a.palo([l * 10, 7.8, 50], [l * 17, 7.8, 28], 3, { ...S, r1: 2.4 }), a.palo([l * 6, 7.6, 26], [l * 9, 7.6, 4], 3.4, { ...S, r1: 2.8 }));
            ps.push(a.palo([l * 17, 8.2, 28], [l * 19, 8.2, 22], 1.6, { ...S, r1: 0.6 }));
          }
        }
      }
      for (let i = 0; i < 4; i++) ps.push(pena(a, (a.r() - 0.5) * 40, 14 + a.r() * 8, 1, 2 + a.r() * 2, 2, 1.5, { mat: 'hielo', tono: 0.06 }));
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'hie_estanque', nombre: ['Estanque helado', 'Frozen pond'], tema: 'hielo', variantes: ['entero', 'roto', 'con_restos'], huella: [4, 3], bloquea: false, plano: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const borde: V3[] = [];
      for (let i = 0; i < 18; i++) { const t = (i / 18) * 2 * PI, k = 0.88 + a.r() * 0.2; borde.push([Math.cos(t) * 28 * k, Math.sin(t) * 20 * k, 0]); }
      ps.push(a.poliedro([...borde.map(([x, y]) => [x * 1.12, y * 1.12, 0] as V3), ...borde.map(([x, y]) => [x * 1.12, y * 1.12, 1] as V3)], { mat: 'hie_escarcha' }));
      ps.push(a.poliedro([...borde, ...borde.map(([x, y]) => [x, y, 1.5] as V3)], { mat: 'hie_hielo_oscuro' }));
      // grietas y vetas claras en el hielo
      for (let i = 0; i < 6; i++) { const t = a.r() * PI; ps.push(a.caja((a.r() - 0.5) * 30, (a.r() - 0.5) * 20, 1.4, 8 + a.r() * 12, 0.9, 0.3, { mat: 'hielo', giro: (t * 180) / PI, tono: 0.25 })); }
      if (v === 'roto') {
        ps.push(a.cilindro(6, -2, 0, 9, 1.6, { mat: 'agua', tono: -0.2 }));
        for (let i = 0; i < 4; i++) { const t = a.r() * 2 * PI; ps.push(a.caja(6 + Math.cos(t) * 5, -2 + Math.sin(t) * 5, 1.2, 4 + a.r() * 3, 3 + a.r() * 2, 1, { mat: 'hielo', giro: a.r() * 90, incl: (a.r() - 0.5) * 20, tono: 0.1 })); }
      }
      if (v === 'con_restos') {
        const S = { mat: 'hie_silueta' };
        ps.push(a.elipsoide(-6, 4, 0.4, 4, 3.5, 1.2, S), a.caja(6, 1, 0.3, 16, 8, 1.3, { ...S, giro: -15 }), a.caja(-2, -6, 0.3, 12, 3, 1.3, { ...S, giro: 30 }));
        ps.push(a.caja(8, -10, 1.2, 14, 1.4, 1.2, { mat: 'hierro', giro: 20 }), a.caja(1, -12.5, 1.2, 1.4, 5, 1.2, { mat: 'hierro', giro: 20 }));
      }
      for (let i = 0; i < 12; i++) { const t = (i / 12) * 2 * PI + a.r() * 0.3, r = 3 + a.r() * 3; ps.push(pena(a, Math.cos(t) * 31, Math.sin(t) * 23, r * 0.2, r, r * 0.8, r * 0.6, { mat: a.r() < 0.5 ? 'nieve' : 'hie_roca', tono: (a.r() - 0.5) * 0.1 })); }
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'hie_roca', nombre: ['Roca escarchada', 'Frosted rock'], tema: 'hielo', variantes: ['grande', 'chica', 'carambanos'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const r = v === 'chica' ? 12 : 22, alt = v === 'chica' ? 0.8 : 1;
      ps.push(pena(a, 0, 0, r * alt * 0.45, r, r * 0.85, r * alt, { mat: 'hie_roca', n: 18 }));
      for (let i = 0; i < 3; i++) { const t = a.r() * 2 * PI, rr = r * (0.4 + a.r() * 0.2); ps.push(pena(a, Math.cos(t) * r * 0.7, Math.sin(t) * r * 0.6, rr * 0.4, rr, rr * 0.85, rr, { mat: 'hie_roca', n: 12, tono: (a.r() - 0.5) * 0.1 })); }
      // capa de nieve arriba
      ps.push(a.elipsoide(-r * 0.1, r * 0.05, r * alt * 0.8, r * 0.55, r * 0.48, r * 0.32, { mat: 'nieve', giro: a.r() * 60, tono: -0.06 }));
      ps.push(a.elipsoide(r * 0.2, r * 0.25, r * alt * 0.82, r * 0.34, r * 0.3, r * 0.1, { mat: 'nieve', tono: -0.1 }));
      if (v === 'carambanos') {
        ps.push(pena(a, 6, 10, r * 1.1, r * 0.9, r * 0.55, r * 0.45, { mat: 'hie_roca', giro: 0 }), a.elipsoide(6, 8, r * 1.3, r * 0.6, r * 0.38, r * 0.14, { mat: 'nieve', tono: -0.12 }));
        for (let i = 0; i < 7; i++) ps.push(carambano(a, -10 + i * 4 + (a.r() - 0.5) * 2, 18 + a.r() * 3, r * 1.0, 6 + a.r() * 9, 1.6 + a.r()));
      }
      ps.push(...escarcha(a, r * 1.3, r * 1.1));
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'hie_antorcha', nombre: ['Antorcha de fuego azul', 'Blue-fire torch'], tema: 'hielo', variantes: ['pie', 'poste', 'brasero'], cuadros: 6, t: 3, huella: [1, 1], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [...escarcha(a, 9, 8)];
      let top: V3;
      if (v === 'pie') {
        for (let i = 0; i < 3; i++) { const t = (i / 3) * 2 * PI + 0.5; ps.push(a.palo([Math.cos(t) * 7, Math.sin(t) * 7, 0], [0, 0, 22], 0.9, { mat: 'hierro' })); }
        ps.push(a.palo([0, 0, 18], [0, 0, 44], 1.2, { mat: 'hierro' }));
        top = [0, 0, 44];
        ps.push(a.cilindro(0, 0, 41, 2, 5, { mat: 'hierro', r1: 5 }));
      } else if (v === 'poste') {
        ps.push(prisma(a, [0, 0, 0], [0, 0, 1], 52, 4, 'hielo'), a.cilindro(0, 0, 0, 6, 3, { mat: 'hie_hielo_oscuro', r1: 4 }));
        top = [0, 0, 44];
        ps.push(a.cilindro(0, 0, 41, 3, 4, { mat: 'hierro', r1: 5 }));
      } else {
        for (let i = 0; i < 6; i++) { const t = (i / 6) * 2 * PI; ps.push(prisma(a, [Math.cos(t) * 6, Math.sin(t) * 6, 0], [Math.cos(t) * 0.5, Math.sin(t) * 0.5, 1], 16 + a.r() * 6, 2.5, 'hielo')); }
        ps.push(a.cilindro(0, 0, 0, 7, 12, { mat: 'hie_hielo_oscuro', r1: 9 }));
        top = [0, 0, 12];
      }
      llama(a, ps, top[0], top[1], top[2] + 1, f, 6, v === 'brasero' ? 1.7 : 1.4);
      ps.push(suelo(a));
      return { piezas: ps, resplandor: { c: [top[0], top[1], top[2] + 6], r: 34, color: '#6ab4ff' } };
    },
  },
  {
    id: 'hie_altar', nombre: ['Altar de hielo', 'Ice altar'], tema: 'hielo', variantes: ['entero', 'ofrenda', 'roto'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [...escarcha(a, 32, 28)];
      const roto = v === 'roto';
      ps.push(a.caja(0, 0, 0, 44, 40, 5, { mat: 'hie_hielo_oscuro' }), a.caja(0, 0, 5, 34, 30, 5, { mat: 'hie_hielo_oscuro', tono: 0.05 }));
      ps.push(a.caja(0, 0, 10, 22, 16, 16, { mat: 'hielo' }), a.caja(0, 0, 26, 28, 20, 4, { mat: 'hielo', tono: 0.06 }));
      if (roto) ps.push(a.poliedro([[2, -12, 31], [16, -12, 31], [16, 12, 31], [6, 12, 31], [16, 12, 20], [16, -12, 22]], { mat: 'hielo', resta: true }), a.caja(22, 16, 0, 12, 8, 4, { mat: 'hielo', giro: 30, incl: 12 }));
      // runa que brilla en la cara de arriba
      if (!roto) {
        ps.push(a.cilindro(0, 0, 30, 6, 0.6, { mat: 'runa' }), a.cilindro(0, 0, 30, 4.4, 0.8, { mat: 'hielo' }));
        for (let k = 0; k < 4; k++) ps.push(a.caja(0, 0, 30, 14, 1.2, 0.7, { mat: 'runa', giro: k * 45 }));
      }
      for (const [x, y] of [[-14, -10], [14, -10], [-14, 10], [14, 10]]) ps.push(carambano(a, x * 0.95, y * 0.95, 26, 6 + a.r() * 6, 1.6));
      for (const [x, y] of [[-20, -18], [20, -18], [-20, 18]]) ps.push(prisma(a, [x, y, 4], [x * 0.02, y * 0.02, 1], 26 + a.r() * 12, 3.5, 'hielo'));
      if (v === 'ofrenda') {
        calavera(a, ps, -6, 2, 30, 1, 45);
        ps.push(a.cilindro(7, -3, 30, 2.5, 3, { mat: 'hierro', r1: 3.5 }), a.esfera(7, -3, 36, 3.5, { mat: 'hie_luz' }));
      }
      ps.push(suelo(a));
      return roto ? ps : { piezas: ps, resplandor: { c: [0, 0, 34], r: 30, color: '#5ac8f0' } };
    },
  },
);
