import { registrar, type Arma, type Pieza, type V3 } from '../objeto';
import { MATERIALES } from '../materiales';
import { ruido } from '../render';

// Cuevas: paredes de roca, entradas, estalagmitas, cristales, pozas, huesos, minas y campamentos abandonados.

MATERIALES.cue_caliza = { rampa: ['#15120e', '#26211a', '#383128', '#4c4436', '#615746', '#776b57', '#8e8169'], ruido: 0.4, escala: 0.16, patron: (p) => Math.sin(p[2] * 0.35 + ruido(p[0] * 0.1, p[1] * 0.1, 3) * 6) * 0.035 };
MATERIALES.cue_roca = { rampa: ['#110e0b', '#1f1914', '#30271e', '#43372a', '#574836', '#6c5a44', '#826d54'], ruido: 0.5, escala: 0.13, patron: (p) => (ruido(p[0] * 0.08, p[1] * 0.08, p[2] * 0.5) - 0.5) * 0.16 };
MATERIALES.cue_cristal_azul = { rampa: ['#0a1622', '#12263a', '#1c3a55', '#2a5272', '#3e6e90', '#5a8eae', '#86b4cc', '#bcdcea'], ruido: 0.2, escala: 0.1, brillo: 0.8 };
MATERIALES.cue_cristal_verde = { rampa: ['#0a1a12', '#12291c', '#1c3c29', '#295238', '#3a6a4a', '#52845e', '#76a47c', '#a8ccaa'], ruido: 0.2, escala: 0.1, brillo: 0.8 };
MATERIALES.cue_luz_azul = { rampa: ['#103050', '#1a4a78', '#2a6ca0', '#4a94c8', '#7cbce0', '#bce0f0', '#e8f6fc'], ruido: 0.4, escala: 0.2, emite: true };
MATERIALES.cue_luz_verde = { rampa: ['#0e3a24', '#18583a', '#287a50', '#44a068', '#78c890', '#b8e8c4', '#e6faea'], ruido: 0.4, escala: 0.2, emite: true };
MATERIALES.cue_hongo_luz = { rampa: ['#0c3a3a', '#145656', '#207474', '#349494', '#58b4ac', '#94d4c8', '#d0f0e8'], ruido: 0.45, escala: 0.3, emite: true };
MATERIALES.cue_tallo = { rampa: ['#2a261f', '#433d32', '#5e5646', '#78705c', '#928971', '#aaa188'], ruido: 0.25, escala: 0.4 };
MATERIALES.cue_hongo_rojo = { rampa: ['#1a0a0a', '#2e1210', '#451c17', '#5c2820', '#74352a', '#8c4636'], ruido: 0.35, escala: 0.35, brillo: 0.2 };
MATERIALES.cue_telarana = { rampa: ['#4e4c47', '#67645d', '#817d74', '#9b968b', '#b4afa3'], ruido: 0.15, escala: 0.6 };
MATERIALES.cue_ceniza = { rampa: ['#121110', '#1d1b19', '#2a2724', '#383430', '#47423d'], ruido: 0.5, escala: 0.4 };
MATERIALES.cue_carbon = { rampa: ['#0a0807', '#14100d', '#1f1914', '#2b231b'], ruido: 0.5, escala: 0.6 };
MATERIALES.cue_gema_roja = { rampa: ['#1e0508', '#36090e', '#520f16', '#6e1820', '#8c242c', '#ac3a3e', '#d06a66'], ruido: 0.2, escala: 0.1, brillo: 0.9 };

const PI = Math.PI;
const rad = (g: number) => (g * PI) / 180;
const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** Todo lo que quede bajo el piso no se ve (va al final: cava lo de antes). */
const suelo = (a: Arma) => a.caja(0, 0, -80, 900, 900, 80, { mat: 'roca', resta: true });

/** Peña facetada: cáscara de puntos sobre un elipsoide (roca con caras, no una bola lisa). */
function pena(a: Arma, x: number, y: number, z: number, rx: number, ry: number, rz: number, o: { mat: string; giro?: number; tono?: number; n?: number }): Pieza {
  const g = rad(o.giro ?? a.r() * 360), c = Math.cos(g), s = Math.sin(g);
  const loc: V3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (let i = 0; i < (o.n ?? 8); i++) { const th = a.r() * 2 * PI, w = a.r() * 2 - 1, q = Math.sqrt(1 - w * w); loc.push([Math.cos(th) * q, Math.sin(th) * q, w]); }
  const pts: V3[] = loc.map(([lx, ly, lz]) => { const k = 0.84 + a.r() * 0.16; const px = lx * rx * k, py = ly * ry * k; return [x + px * c - py * s, y + px * s + py * c, z + Math.max(-0.8, Math.min(0.72, lz)) * rz * k]; });
  return a.poliedro(pts, { mat: o.mat, tono: o.tono });
}
/** Roca suelta: una peña grande y otras pegadas. */
function bloque(a: Arma, ps: Pieza[], x: number, y: number, r: number, mat = 'cue_roca', alt = 0.75, n = 3) {
  ps.push(pena(a, x, y, r * alt * 0.45, r, r * (0.75 + a.r() * 0.2), r * alt, { mat, tono: (a.r() - 0.5) * 0.08, n: 18 }));
  for (let i = 0; i < n; i++) {
    const t = a.r() * 2 * PI, d = r * (0.5 + a.r() * 0.35), rr = r * (0.35 + a.r() * 0.25);
    ps.push(pena(a, x + Math.cos(t) * d, y + Math.sin(t) * d, rr * alt * 0.4, rr, rr * 0.85, rr * alt, { mat, tono: (a.r() - 0.5) * 0.12, n: 12 }));
  }
}
/** Pared de roca a lo largo de una línea quebrada: lajas facetadas apiladas, más angostas arriba, con derrubio al pie. */
function muroRoca(a: Arma, ps: Pieza[], pts: [number, number][], alto: number, grueso: number, mat = 'cue_roca') {
  for (let s = 0; s < pts.length - 1; s++) {
    const [x0, y0] = pts[s], [x1, y1] = pts[s + 1];
    const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L, nx = -uy, ny = ux;
    const giro = (Math.atan2(uy, ux) * 180) / PI;
    const n = Math.max(2, Math.round(L / 15));
    for (let k = s === 0 ? 0 : 1; k <= n; k++) {
      const t = k / n, cx = x0 + (x1 - x0) * t + ux * (a.r() - 0.5) * 5, cy = y0 + (y1 - y0) * t + uy * (a.r() - 0.5) * 5;
      const h = alto * (0.78 + 0.28 * a.r());
      ps.push(pena(a, cx, cy, h * 0.42, 13, grueso * 0.72, h * 0.5, { mat, giro, tono: -0.08, n: 6 }));
      let z = 0;
      while (z < h - 6) {
        const fr = z / h, rz = Math.min(h - z, 12 + a.r() * 12) * 0.6 + 4, rl = 10 + a.r() * 6;
        const rn = grueso * (1 - 0.5 * fr) * (0.8 + 0.3 * a.r());
        const off = (a.r() - 0.5) * grueso * 0.5 * (1 - fr * 0.5);
        const tono = (a.r() - 0.5) * 0.14 - fr * 0.05;
        const g = giro + (a.r() - 0.5) * 24;
        ps.push(z === 0 && a.r() < 0.4 ? pena(a, cx + nx * off, cy + ny * off, rz * 0.4, rl * 1.1, rn * 1.1, rz * 0.9, { mat, giro: g, tono, n: 14 })
          : pena(a, cx + nx * off, cy + ny * off, z + rz * 0.75, rl, rn, rz, { mat, giro: g, tono }));
        z += rz * (1.1 + 0.25 * a.r());
      }
      // derrubio al pie, del lado que se ve
      if (a.r() < 0.75) { const lado = a.r() < 0.65 ? 1 : -1; const r = 3 + a.r() * 4; ps.push(pena(a, cx + nx * (grueso + r) * lado + ux * (a.r() - 0.5) * 8, cy + ny * (grueso + r) * lado + uy * (a.r() - 0.5) * 8, r * 0.3, r, r * 0.9, r * 0.75, { mat, tono: 0.04 })); }
    }
  }
}
/** Prisma de cristal (seis caras y punta) desde `base` hacia `dir`. */
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
/** Estalagmita: conos encadenados con un charco de piedra al pie. */
function estal(a: Arma, ps: Pieza[], x: number, y: number, h: number, r: number, mat = 'cue_caliza') {
  ps.push(a.elipsoide(x, y, 0, r * 1.7, r * 1.5, r * 0.7, { mat, giro: a.r() * 180 }));
  let p: V3 = [x, y, 0];
  const n = h > 40 ? 4 : 3;
  for (let i = 1; i <= n; i++) {
    const f = i / n, q: V3 = [x + (a.r() - 0.5) * r * 0.5 * f, y + (a.r() - 0.5) * r * 0.5 * f, h * f];
    ps.push(a.palo(p, q, Math.max(0.6, r * Math.pow(1 - (i - 1) / n, 0.85)), { mat, r1: Math.max(0.3, r * Math.pow(1 - f, 0.85)) }));
    p = q;
  }
}
/** Calavera mirando hacia `giro` (45 = a la cámara). */
function calavera(a: Arma, ps: Pieza[], x: number, y: number, z: number, s = 1, giro = 45, mat = 'hueso') {
  const g = rad(giro), fx = Math.cos(g), fy = Math.sin(g), sx = -fy, sy = fx;
  ps.push(a.elipsoide(x, y, z + 3.6 * s, 3.8 * s, 3.3 * s, 3.4 * s, { mat, giro }));
  ps.push(a.caja(x + fx * 2.2 * s, y + fy * 2.2 * s, z, 3 * s, 4 * s, 2.6 * s, { mat, giro, tono: -0.05 }));
  for (const l of [-1, 1]) ps.push(a.esfera(x + fx * 3 * s + sx * l * 1.4 * s, y + fy * 3 * s + sy * l * 1.4 * s, z + 4 * s, 1.2 * s, { mat: 'negro' }));
  ps.push(a.esfera(x + fx * 3.6 * s, y + fy * 3.6 * s, z + 2.4 * s, 0.7 * s, { mat: 'negro' }));
}
/** Hueso largo con sus nudos. */
function hueso(a: Arma, ps: Pieza[], p: V3, q: V3, r = 1.1) {
  ps.push(a.palo(p, q, r, { mat: 'hueso', tono: (a.r() - 0.5) * 0.1 }));
  ps.push(a.esfera(p[0], p[1], p[2], r * 1.55, { mat: 'hueso' }), a.esfera(q[0], q[1], q[2], r * 1.5, { mat: 'hueso' }));
}
/** Llama de antorcha (tres lenguas que se mueven con el cuadro). */
function llama(a: Arma, ps: Pieza[], x: number, y: number, z: number, f: number, n: number, e = 1, mat = 'fuego') {
  for (let k = 0; k < 3; k++) {
    const an = (k / 3) * 2 * PI + f * 0.9, fr = Math.sin((f / n) * 2 * PI + k * 2.1);
    ps.push(a.cilindro(x + Math.cos(an) * 1.2 * e, y + Math.sin(an) * 1.2 * e, z, (3 - k * 0.5) * e, (8 + fr * 2.5 + k * 2) * e, { mat, r1: 0.3 }));
  }
  ps.push(a.elipsoide(x, y, z + 1.2 * e, 3.4 * e, 3.4 * e, 2.4 * e, { mat, tono: 0.2 }));
}

registrar(
  {
    id: 'cue_muro', nombre: ['Pared de cueva', 'Cave wall'], tema: 'cueva', variantes: ['x', 'y', 'x_alta', 'y_alta'], huella: [5, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const alto = v.endsWith('alta') ? 130 : 92;
      const pts: [number, number][] = v.startsWith('x') ? [[-40, 0], [40, 0]] : [[0, -40], [0, 40]];
      muroRoca(a, ps, pts, alto, 14);
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    // Peñascos sueltos para el borde de las cuevas orgánicas: el juego los riega por todo el contorno de la caverna
    // (altos donde la roca queda detrás del piso, bajos donde queda delante) y entre todos arman una pared irregular.
    id: 'cue_penasco', nombre: ['Peñasco de cueva', 'Cave crag'], tema: 'cueva',
    variantes: ['alta_a', 'alta_b', 'alta_c', 'alta_d', 'alta_e', 'media_a', 'media_b', 'media_c', 'baja_a', 'baja_b', 'baja_c', 'baja_d'], huella: [2, 2], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const alta = v.startsWith('alta'), media = v.startsWith('media');
      // cada variante sale distinta: se adelanta el azar según su letra
      for (let i = (v.charCodeAt(v.length - 1) - 96) * 11 + (alta ? 3 : media ? 5 : 0); i > 0; i--) a.r();
      if (alta || media) {
        const alto = alta ? 104 + a.r() * 44 : 52 + a.r() * 22, g = a.r() * PI, L = 19 + a.r() * 8, q = (a.r() - 0.5) * 14;
        // un contrafuerte quebrado, con una segunda hoja más baja cruzada: nunca queda como tabla
        muroRoca(a, ps, [[-Math.cos(g) * L, -Math.sin(g) * L], [q * Math.sin(g), -q * Math.cos(g)], [Math.cos(g) * L, Math.sin(g) * L]], alto, 18);
        const g2 = g + PI / 2 + (a.r() - 0.5) * 0.8;
        muroRoca(a, ps, [[-Math.cos(g2) * 15, -Math.sin(g2) * 15], [Math.cos(g2) * 15, Math.sin(g2) * 15]], alto * (0.55 + a.r() * 0.3), 15);
        for (let i = 0; i < 5; i++) { const t = a.r() * 2 * PI, d = 18 + a.r() * 10; bloque(a, ps, Math.cos(t) * d, Math.sin(t) * d, 6 + a.r() * 7, 'cue_roca', 0.9, 2); }
      } else {
        const n = 3 + Math.floor(a.r() * 3);
        for (let i = 0; i < n; i++) { const t = a.r() * 2 * PI, d = a.r() * 17; bloque(a, ps, Math.cos(t) * d, Math.sin(t) * d * 0.9, 9 + a.r() * 8, a.r() < 0.25 ? 'cue_caliza' : 'cue_roca', 0.8 + a.r() * 0.5, 2); }
        if (a.r() < 0.4) estal(a, ps, (a.r() - 0.5) * 16, (a.r() - 0.5) * 16, 12 + a.r() * 12, 3 + a.r() * 2);
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'cue_muro_esquina', nombre: ['Esquina de cueva', 'Cave wall corner'], tema: 'cueva', variantes: ['interior', 'exterior', 'interior_alta'], huella: [4, 4], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      muroRoca(a, ps, v === 'exterior' ? [[24, -32], [24, 24], [-32, 24]] : [[32, -24], [-24, -24], [-24, 32]], v === 'interior_alta' ? 130 : 92, 14);
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'cue_entrada', nombre: ['Entrada de cueva', 'Cave entrance'], tema: 'cueva', variantes: ['cueva', 'mina', 'derrumbe'], huella: [7, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      muroRoca(a, ps, [[-58, 0], [58, 0]], 128, 26);
      // hombros de roca a los lados de la boca y el dintel
      for (const l of [-1, 1]) for (let i = 0; i < 3; i++) ps.push(pena(a, l * (36 + a.r() * 8), 20 + a.r() * 6, 16 + i * 20, 13, 12, 15, { mat: 'cue_roca', tono: 0.03 }));
      ps.push(pena(a, 0, 16, 76, 36, 16, 13, { mat: 'cue_roca', giro: 0, tono: 0.04 }));
      // la boca: caja y bóveda cavadas, y la oscuridad al fondo
      ps.push(a.caja(0, 31, 0, 52, 64, 42, { mat: 'roca', resta: true }), a.cilindro(0, -1, 42, 26, 64, { mat: 'roca', resta: true, eje: [0, 1, 0] }));
      ps.push(a.caja(0, -3, 0, 58, 4, 72, { mat: 'negro' }), a.elipsoide(0, 2, 0, 24, 7, 52, { mat: 'negro' }));
      ps.push(a.elipsoide(0, 32, 0, 22, 18, 1.2, { mat: 'tierra' }));
      if (v === 'mina') {
        for (const l of [-1, 1]) {
          ps.push(a.caja(l * 22, 28, 0, 5.5, 5.5, 50, { mat: 'madera', incl: l * 2, inclEje: 'y' }));
          ps.push(a.palo([l * 22, 28, 36], [l * 13, 28, 49], 1.7, { mat: 'madera_vieja' }));
        }
        ps.push(a.caja(0, 28, 49, 56, 6.5, 6.5, { mat: 'madera' }), a.caja(0, 31, 55.5, 34, 2, 9, { mat: 'madera_vieja', giro: 3 }));
        for (const l of [-1, 1]) ps.push(a.caja(l * 6, 30, 0.8, 1.6, 52, 1.6, { mat: 'hierro_oxido' }));
        for (let k = 0; k < 5; k++) ps.push(a.caja(0, 10 + k * 10, 0, 18, 3.5, 1.2, { mat: 'madera_vieja', giro: (a.r() - 0.5) * 8 }));
        ps.push(a.palo([14, 32, 49], [14, 32, 42], 0.5, { mat: 'hierro' }), a.caja(14, 32, 35, 4.5, 4.5, 7, { mat: 'hierro' }), a.cilindro(14, 32, 36, 1.6, 5, { mat: 'luz_vela' }));
        return { piezas: [...ps, suelo(a)], resplandor: { c: [14, 34, 38], r: 30, color: '#ffb04a' } };
      }
      if (v === 'derrumbe') {
        for (let i = 0; i < 12; i++) { const r = 8 + a.r() * 6; ps.push(pena(a, (a.r() - 0.5) * 40, 14 + a.r() * 14, r * 0.5 + Math.floor(i / 4) * 13, r, r * 0.8, r * 0.8, { mat: 'cue_roca', tono: 0.04 })); }
        for (let i = 0; i < 8; i++) ps.push(pena(a, (a.r() - 0.5) * 50, 34 + a.r() * 14, 1, 2 + a.r() * 3, 2 + a.r() * 2, 2 + a.r() * 2, { mat: 'cue_roca' }));
      } else {
        for (let i = 0; i < 6; i++) ps.push(pena(a, (a.r() - 0.5) * 60, 30 + a.r() * 18, 1, 2 + a.r() * 3, 2 + a.r() * 3, 2 + a.r() * 2, { mat: 'cue_roca' }));
        calavera(a, ps, 14, 40, 0, 0.9, 70);
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'cue_estalagmita', nombre: ['Estalagmita', 'Stalagmite'], tema: 'cueva', variantes: ['sola', 'grupo', 'alta'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      if (v === 'sola') { estal(a, ps, 0, 0, 50 + a.r() * 8, 8); estal(a, ps, 9, 5, 12 + a.r() * 5, 3.5); }
      else if (v === 'grupo') {
        estal(a, ps, -2, -2, 34 + a.r() * 6, 6.5);
        for (let i = 0; i < 5; i++) { const t = (i / 5) * 2 * PI + a.r(), d = 9 + a.r() * 5; estal(a, ps, Math.cos(t) * d, Math.sin(t) * d, 10 + a.r() * 18, 3 + a.r() * 2.5); }
      } else {
        estal(a, ps, 0, 0, 78 + a.r() * 10, 10);
        for (let i = 0; i < 3; i++) { const t = (i / 3) * 2 * PI + a.r(); estal(a, ps, Math.cos(t) * 6, Math.sin(t) * 6, 28 + a.r() * 22, 5); }
      }
      for (let i = 0; i < 3; i++) ps.push(pena(a, (a.r() - 0.5) * 24, (a.r() - 0.5) * 24, 0.5, 2 + a.r() * 2, 2, 1.5 + a.r() * 1.5, { mat: 'cue_roca' }));
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'cue_columna', nombre: ['Columna de cueva', 'Cave column'], tema: 'cueva', variantes: ['entera', 'rota'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const m = 'cue_caliza', j = (a.r() - 0.5) * 5;
      ps.push(a.elipsoide(0, 0, 0, 20, 18, 7, { mat: m }), a.elipsoide(4, -3, 0, 12, 10, 10, { mat: m, tono: 0.03 }));
      if (v === 'entera') {
        ps.push(a.palo([0, 0, 0], [j, -j, 54], 13, { mat: m, r1: 4.5 }), a.palo([j, -j, 54], [0, 0, 112], 4.5, { mat: m, r1: 16 }));
        ps.push(a.palo([5, 3, 0], [6 + j, 2, 30], 6, { mat: m, r1: 1.5 }), a.palo([-3, 6, 112], [-2 + j, 5, 78], 6, { mat: m, r1: 1 }));
        for (let i = 0; i < 6; i++) ps.push(pena(a, (a.r() - 0.5) * 20, (a.r() - 0.5) * 20, 104 + i * 4 + a.r() * 4, 10 + a.r() * 7, 9 + a.r() * 6, 9 + a.r() * 5, { mat: i % 2 ? 'cue_roca' : 'cue_caliza', tono: -0.03 * i }));
      } else {
        ps.push(a.palo([0, 0, 0], [j, -j, 40], 13, { mat: m, r1: 6.5 }), pena(a, j, -j, 41, 7, 7, 5, { mat: m, tono: 0.08 }));
        ps.push(a.palo([-6, 20, 6], [-34, 6, 9], 13, { mat: m, r1: 5 }), pena(a, -5, 19, 6, 10, 10, 6, { mat: m, tono: 0.08 }));
        for (let i = 0; i < 6; i++) ps.push(pena(a, (a.r() - 0.2) * 26, 6 + a.r() * 20, 1, 2 + a.r() * 3, 2 + a.r() * 2, 2 + a.r() * 2, { mat: m }));
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'cue_roca', nombre: ['Roca de cueva', 'Cave boulder'], tema: 'cueva', variantes: ['grande', 'mediana', 'par', 'musgo'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      if (v === 'mediana') bloque(a, ps, 0, 0, 12, 'cue_roca', 0.8, 2);
      else if (v === 'par') { bloque(a, ps, -6, -4, 15, 'cue_roca', 0.85, 2); bloque(a, ps, 10, 9, 9, 'cue_roca', 0.7, 1); }
      else {
        bloque(a, ps, 0, 0, 26, 'cue_roca', 0.95, 4);
        if (v === 'musgo') for (let i = 0; i < 5; i++) ps.push(a.elipsoide((a.r() - 0.5) * 16, (a.r() - 0.4) * 14, 22 + a.r() * 4, 7 + a.r() * 4, 6 + a.r() * 3, 3, { mat: 'musgo', giro: a.r() * 180 }));
      }
      for (let i = 0; i < 4; i++) ps.push(pena(a, (a.r() - 0.5) * 34, (a.r() - 0.5) * 34, 0.5, 1.5 + a.r() * 2, 1.5 + a.r() * 1.5, 1.5 + a.r(), { mat: 'cue_roca' }));
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'cue_escombros', nombre: ['Escombros de roca', 'Rock rubble'], tema: 'cueva', variantes: ['suelto', 'monton'], huella: [2, 2], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [a.elipsoide(0, 0, 0, 20, 17, 1.5, { mat: 'tierra', giro: a.r() * 180 })];
      const n = v === 'monton' ? 22 : 14;
      for (let i = 0; i < n; i++) {
        const t = a.r() * 2 * PI, d = Math.sqrt(a.r()) * 18, r = (v === 'monton' ? 6 - d * 0.18 : 3.5) + a.r() * 2.5;
        const z = v === 'monton' ? Math.max(0, 14 - d * 0.8) * a.r() + r * 0.3 : r * 0.3;
        ps.push(pena(a, Math.cos(t) * d, Math.sin(t) * d, z, r, r * 0.8, r * 0.7, { mat: a.r() < 0.3 ? 'cue_caliza' : 'cue_roca', tono: (a.r() - 0.5) * 0.15 }));
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'cue_cristales', nombre: ['Cristales brillantes', 'Glowing crystals'], tema: 'cueva', variantes: ['morado', 'azul', 'verde', 'grande'], cuadros: 4, t: 4, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => {
      const [mc, ml, col] = v === 'azul' ? ['cue_cristal_azul', 'cue_luz_azul', '#5ab0f0'] : v === 'verde' ? ['cue_cristal_verde', 'cue_luz_verde', '#5ad08a'] : ['cristal', 'magia', '#b06ae8'];
      const g = v === 'grande' ? 1.7 : 1, pulso = Math.sin((f / 4) * 2 * PI) * 0.08;
      const ps: Pieza[] = [];
      for (let i = 0; i < 4; i++) { const t = a.r() * 2 * PI; ps.push(pena(a, Math.cos(t) * 8 * g, Math.sin(t) * 8 * g, 2, 8 * g, 7 * g, 5 * g, { mat: 'cue_roca', tono: -0.03 })); }
      ps.push(a.elipsoide(0, 0, 3, 7 * g, 7 * g, 5 * g, { mat: ml, tono: -0.1 + pulso }));
      ps.push(prisma(a, [0, 0, 2], [(a.r() - 0.5) * 0.3, (a.r() - 0.5) * 0.3, 1], 34 * g, 5 * g, mc));
      const n = v === 'grande' ? 9 : 7;
      for (let i = 0; i < n; i++) {
        const t = (i / n) * 2 * PI + a.r() * 0.6, s = 0.3 + a.r() * 0.6;
        const b: V3 = [Math.cos(t) * (4 + a.r() * 5) * g, Math.sin(t) * (4 + a.r() * 5) * g, 1];
        const brilla = i % 3 === 1;
        ps.push(prisma(a, b, [Math.cos(t) * s, Math.sin(t) * s, 1], (12 + a.r() * 16) * g * (brilla ? 0.7 : 1), (2.2 + a.r() * 2) * g, brilla ? ml : mc, brilla ? pulso : (a.r() - 0.5) * 0.1));
      }
      ps.push(suelo(a));
      return { piezas: ps, resplandor: { c: [0, 0, 14 * g], r: 34 * g, color: col } };
    },
  },
  {
    id: 'cue_poza', nombre: ['Poza subterránea', 'Underground pool'], tema: 'cueva', variantes: ['agua', 'sucia', 'cristales'], cuadros: 4, t: 4, huella: [4, 3], bloquea: true, plano: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const m = v === 'sucia' ? 'agua_sucia' : 'agua';
      const borde: V3[] = [];
      for (let i = 0; i < 18; i++) { const t = (i / 18) * 2 * PI, k = 0.9 + ruido(i * 0.7, a.seed, 1) * 0.2; borde.push([Math.cos(t) * 28 * k, Math.sin(t) * 20 * k, 0]); }
      ps.push(a.poliedro([...borde.map(([x, y]) => [x * 1.08, y * 1.08, 0] as V3), ...borde.map(([x, y]) => [x * 1.08, y * 1.08, 0.6] as V3)], { mat: 'tierra' }));
      ps.push(a.poliedro([...borde, ...borde.map(([x, y]) => [x, y, 1.2] as V3)], { mat: m }));
      // onda que se abre desde la gota y reflejos que se corren
      const R = 2 + f * 3.2, cx = 6, cy = -3;
      ps.push(a.cilindro(cx, cy, 0, R, 1.35, { mat: m, tono: 0.25 - f * 0.05 }), a.cilindro(cx, cy, 0, Math.max(0.5, R - 1.1), 1.45, { mat: m }));
      for (let i = 0; i < 3; i++) ps.push(a.elipsoide(-14 + i * 9 + Math.sin(f * 1.6 + i) * 2, 6 - i * 3, 1.2, 4, 1, 0.3, { mat: m, tono: 0.3, giro: -45 }));
      for (let i = 0; i < 16; i++) {
        const t = (i / 16) * 2 * PI + a.r() * 0.2, r = 3 + a.r() * 3;
        ps.push(pena(a, Math.cos(t) * 30, Math.sin(t) * 22, r * 0.25, r, r * 0.8, r * 0.6, { mat: a.r() < 0.4 ? 'cue_caliza' : 'cue_roca', tono: (a.r() - 0.5) * 0.12 }));
      }
      estal(a, ps, -22, -20, 14, 4);
      if (v === 'cristales') {
        ps.push(prisma(a, [-24, -14, 1], [-0.3, -0.2, 1], 22, 3.5, 'cue_cristal_azul'), prisma(a, [-20, -18, 1], [0.3, -0.5, 1], 14, 2.5, 'cue_luz_azul', Math.sin(f * 1.5) * 0.08));
        ps.push(prisma(a, [22, -12, 1], [0.4, -0.2, 1], 16, 3, 'cue_cristal_azul'), prisma(a, [26, -8, 1], [0.6, 0.2, 1], 10, 2, 'cue_luz_azul'));
        ps.push(suelo(a));
        return { piezas: ps, resplandor: { c: [0, -10, 10], r: 44, color: '#5ab0f0' } };
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'cue_huesos', nombre: ['Montón de huesos', 'Bone pile'], tema: 'cueva', variantes: ['pequeno', 'grande', 'con_sangre'], huella: [2, 2], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [a.elipsoide(0, 0, 0, 18, 15, 1.4, { mat: 'tierra', giro: a.r() * 180 })];
      const R = v === 'pequeno' ? 10 : 16, n = v === 'pequeno' ? 8 : 18, alto = v === 'pequeno' ? 2 : 9;
      if (v !== 'pequeno') ps.push(a.elipsoide(0, 0, 0, R * 0.8, R * 0.7, alto, { mat: 'tierra', tono: -0.05 }));
      if (v === 'con_sangre') for (let i = 0; i < 3; i++) ps.push(a.elipsoide((a.r() - 0.5) * 24, (a.r() - 0.5) * 24, 0, 5 + a.r() * 4, 3 + a.r() * 3, 1.6, { mat: 'sangre', giro: a.r() * 180 }));
      for (let i = 0; i < n; i++) {
        const t = a.r() * 2 * PI, d = Math.sqrt(a.r()) * R, an = a.r() * 2 * PI, L = 7 + a.r() * 8;
        const z = (1 - d / R) * alto + 1.2, c: V3 = [Math.cos(t) * d, Math.sin(t) * d, z];
        hueso(a, ps, [c[0] - Math.cos(an) * L / 2, c[1] - Math.sin(an) * L / 2, z + (a.r() - 0.5) * 3], [c[0] + Math.cos(an) * L / 2, c[1] + Math.sin(an) * L / 2, Math.max(1.2, z + (a.r() - 0.5) * 4)]);
      }
      calavera(a, ps, 3, 3, alto * 0.75, 1, 40 + (a.r() - 0.5) * 40);
      if (v !== 'pequeno') { calavera(a, ps, -8, 6, 2, 0.9, 80); calavera(a, ps, 7, -7, alto * 0.4, 0.95, 20); }
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'cue_costillar', nombre: ['Restos de bestia', 'Giant beast remains'], tema: 'cueva', variantes: ['costillar', 'con_craneo', 'hundido'], huella: [6, 4], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const hz = v === 'hundido' ? -16 : 0, H = 46, W = 24;
      ps.push(a.elipsoide(0, 0, 0, 52, 30, 2, { mat: 'tierra' }));
      // espinazo arqueado
      const esp = (x: number): V3 => [x, 0, hz + H * Math.cos((x / 60) * PI * 0.5) + 2];
      for (let i = 0; i <= 12; i++) { const x = -42 + i * 7.5, p = esp(x); ps.push(a.elipsoide(p[0], p[1], p[2] + 1, 3.4, 3.4, 5, { mat: 'hueso', tono: (a.r() - 0.5) * 0.1 })); }
      // costillas
      for (let i = 0; i < 7; i++) {
        const x = -26 + i * 8, top = esp(x), largo = 1 - Math.abs(i - 2.5) * 0.08;
        for (const l of [-1, 1]) {
          const rota = a.r() < 0.18;
          const fin = rota ? 0.45 + a.r() * 0.2 : 0.92;
          let p = top;
          const n = 4;
          for (let k = 1; k <= n; k++) {
            const th = (k / n) * PI * fin, q: V3 = [x + Math.sin(th) * 3, l * W * largo * Math.sin(th), Math.max(hz + 1.5, top[2] * (0.5 + 0.5 * Math.cos(th)) - 1)];
            ps.push(a.palo(p, q, 2.2 - k * 0.25, { mat: 'hueso', r1: 1.95 - k * 0.25 }));
            p = q;
          }
          if (rota) ps.push(a.palo([x + 6 * a.r(), l * (W + 4), 1.5], [x + 10, l * (W - 4), 2], 1.4, { mat: 'hueso' }));
        }
      }
      // cola que baja al piso
      let p = esp(-42);
      for (let k = 1; k <= 4; k++) { const q: V3 = [-42 - k * 6, Math.sin(k) * 3, Math.max(hz + 2, p[2] - 9)]; ps.push(a.esfera(q[0], q[1], q[2], 3 - k * 0.4, { mat: 'hueso' })); ps.push(a.palo(p, q, 2 - k * 0.3, { mat: 'hueso' })); p = q; }
      if (v !== 'costillar') {
        const cx = 50, cy = 8, cz = hz + 9;
        ps.push(a.elipsoide(cx, cy, cz, 15, 9, 9, { mat: 'hueso', giro: 25 }), a.elipsoide(cx + 12, cy + 6, cz - 3, 10, 6, 5, { mat: 'hueso', giro: 25, tono: -0.04 }));
        ps.push(a.esfera(cx + 5, cy + 9, cz + 3, 3, { mat: 'negro' }), a.esfera(cx + 9, cy - 1, cz + 3, 3, { mat: 'negro' }));
        ps.push(a.caja(cx + 10, cy + 6, hz, 18, 7, 3, { mat: 'hueso', giro: 30, tono: -0.08 }));
        for (const l of [-1, 1]) {
          let hp: V3 = [cx - 6, cy + l * 7, cz + 6];
          for (let k = 1; k <= 4; k++) { const q: V3 = [hp[0] - 5, hp[1] + l * 3, hp[2] + 5 - k]; ps.push(a.palo(hp, q, 2.6 - k * 0.5, { mat: 'hueso', r1: 2.1 - k * 0.5, tono: -0.05 })); hp = q; }
        }
        for (let k = 0; k < 5; k++) ps.push(a.poliedro([[cx + 6 + k * 3, cy + 9 - k * 0.4, cz - 4], [cx + 8 + k * 3, cy + 9 - k * 0.4, cz - 4], [cx + 7 + k * 3, cy + 10 - k * 0.4, cz - 8]], { mat: 'hueso', tono: 0.1 }));
      }
      if (v === 'hundido') for (let i = 0; i < 10; i++) ps.push(a.elipsoide((a.r() - 0.5) * 90, (a.r() - 0.5) * 50, 0, 8 + a.r() * 8, 6 + a.r() * 6, 3 + a.r() * 3, { mat: 'tierra', giro: a.r() * 180 }));
      for (let i = 0; i < 5; i++) ps.push(pena(a, (a.r() - 0.5) * 90, (a.r() - 0.5) * 50, 0.5, 2 + a.r() * 3, 2 + a.r() * 2, 2 + a.r() * 2, { mat: 'cue_roca' }));
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'cue_antorcha', nombre: ['Antorcha de cueva', 'Cave torch'], tema: 'cueva', variantes: ['palo', 'hueso', 'piedras'], cuadros: 6, t: 3, huella: [1, 1], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const ix = (a.r() - 0.5) * 4, iy = (a.r() - 0.5) * 4, top: V3 = [ix, iy, 36];
      if (v === 'hueso') {
        hueso(a, ps, [0, 0, 0], top, 1.4);
        calavera(a, ps, ix * 0.8, iy * 0.8, 26, 1, 45);
      } else {
        ps.push(a.palo([0, 0, 0], top, 1.5, { mat: 'madera', r1: 1.3 }));
        ps.push(a.cilindro(ix * 0.9, iy * 0.9, 30, 1.8, 4, { mat: 'cuerda' }));
      }
      if (v === 'piedras') for (let i = 0; i < 7; i++) { const t = (i / 7) * 2 * PI; ps.push(pena(a, Math.cos(t) * 5, Math.sin(t) * 5, i > 4 ? 6 : 2, 4, 3.5, 3.5, { mat: 'cue_roca' })); }
      else ps.push(a.elipsoide(0, 0, 0, 5, 4, 1.5, { mat: 'tierra' }));
      ps.push(a.cilindro(top[0], top[1], 35, 1.6, 5, { mat: 'hierro', r1: 3.6 }), a.cilindro(top[0], top[1], 39.4, 3, 0.8, { mat: 'cue_carbon' }));
      llama(a, ps, top[0], top[1], 39.5, f, 6, 1.1);
      ps.push(suelo(a));
      return { piezas: ps, resplandor: { c: [top[0], top[1], 44], r: 34, color: '#ff9a3a' } };
    },
  },
  {
    id: 'cue_hongos', nombre: ['Hongos de cueva', 'Cave mushrooms'], tema: 'cueva', variantes: ['grupo', 'gigante', 'luz'], huella: [2, 2], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [a.elipsoide(0, 0, 0, 16, 14, 1.4, { mat: 'tierra' })];
      const hongo = (x: number, y: number, h: number, rc: number, cap: string) => {
        const dx = (a.r() - 0.5) * h * 0.25, dy = (a.r() - 0.5) * h * 0.25;
        ps.push(a.palo([x, y, 0], [x + dx, y + dy, h], rc * 0.3, { mat: 'cue_tallo', r1: rc * 0.22 }));
        ps.push(a.elipsoide(x + dx, y + dy, h - rc * 0.1, rc * 0.85, rc * 0.85, rc * 0.25, { mat: 'cue_tallo', tono: -0.15 }));
        ps.push(a.elipsoide(x + dx, y + dy, h, rc, rc * (0.9 + a.r() * 0.15), rc * 0.5, { mat: cap, giro: a.r() * 180, tono: (a.r() - 0.5) * 0.1 }));
        if (cap === 'cue_hongo_rojo') for (let i = 0; i < 4; i++) { const t = a.r() * 2 * PI; ps.push(a.esfera(x + dx + Math.cos(t) * rc * 0.5, y + dy + Math.sin(t) * rc * 0.5, h + rc * 0.38, rc * 0.12, { mat: 'cue_tallo', tono: 0.15 })); }
      };
      if (v === 'gigante') { hongo(-3, -3, 40 + a.r() * 8, 15, 'cue_hongo_rojo'); hongo(10, 8, 24, 9, 'cue_hongo_rojo'); hongo(-12, 10, 12, 5, 'hongo'); }
      else {
        const cap = v === 'luz' ? 'cue_hongo_luz' : 'hongo';
        for (let i = 0; i < 7; i++) { const t = (i / 7) * 2 * PI + a.r(), d = i === 0 ? 0 : 5 + a.r() * 8; hongo(Math.cos(t) * d, Math.sin(t) * d, (i === 0 ? 14 : 5 + a.r() * 8), i === 0 ? 6 : 2.5 + a.r() * 2.5, cap); }
        if (v === 'luz') { ps.push(suelo(a)); return { piezas: ps, resplandor: { c: [0, 0, 10], r: 30, color: '#58c4b4' } }; }
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'cue_raices', nombre: ['Raíces colgantes', 'Hanging roots'], tema: 'cueva', variantes: ['raices', 'musgo'], huella: [4, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      muroRoca(a, ps, [[-30, -4], [30, -4]], 74, 14);
      for (let i = 0; i < 5; i++) ps.push(pena(a, -24 + i * 12 + (a.r() - 0.5) * 4, 12 + a.r() * 4, 64 + a.r() * 6, 9, 9, 7, { mat: 'cue_roca', tono: 0.02 }));
      const n = v === 'musgo' ? 14 : 10;
      for (let i = 0; i < n; i++) {
        let p: V3 = [-26 + (i / (n - 1)) * 52 + (a.r() - 0.5) * 4, 14 + a.r() * 6, 60];
        const seg = 3 + Math.floor(a.r() * 3);
        for (let k = 0; k < seg; k++) {
          const q: V3 = [p[0] + (a.r() - 0.5) * 5, p[1] + (a.r() - 0.3) * 3, p[2] - 7 - a.r() * 6];
          ps.push(a.palo(p, q, Math.max(0.5, 1.8 - k * 0.35), { mat: 'corteza', r1: Math.max(0.45, 1.6 - k * 0.35) }));
          p = q;
        }
      }
      if (v === 'musgo') for (let i = 0; i < 7; i++) ps.push(a.elipsoide(-26 + a.r() * 52, 10 + a.r() * 6, 20 + a.r() * 50, 6 + a.r() * 4, 4, 4 + a.r() * 4, { mat: 'musgo', giro: a.r() * 40 }));
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'cue_telarana', nombre: ['Telaraña entre rocas', 'Spider web'], tema: 'cueva', variantes: ['entre_rocas', 'con_presa'], huella: [4, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      estal(a, ps, -24, 0, 48, 7.5, 'cue_roca');
      bloque(a, ps, 24, 2, 13, 'cue_roca', 1.6, 2);
      const c: V3 = [0, 1, 24];
      const anc: V3[] = [[-20, 0, 6], [-19, 0, 20], [-17, 0, 33], [-12, 0, 42], [17, 0, 32], [20, 0, 22], [20, 0, 10], [8, 0, 1], [-6, 0, 1]];
      const ang = anc.map((p) => Math.atan2(p[2] - c[2], p[0] - c[0]));
      const ord = anc.map((p, i) => [p, ang[i]] as [V3, number]).sort((x, y) => x[1] - y[1]).map((x) => x[0]);
      const m = { mat: 'cue_telarana' };
      for (const p of ord) ps.push(a.palo(c, [p[0], p[1] + (a.r() - 0.5), p[2]], 0.5, m));
      for (let k = 1; k <= 5; k++) {
        const s = k / 6;
        for (let i = 0; i < ord.length; i++) {
          const p = ord[i], q = ord[(i + 1) % ord.length];
          const sag = (a.r() - 0.5) * 0.06;
          ps.push(a.palo([c[0] + (p[0] - c[0]) * (s + sag), 1, c[2] + (p[2] - c[2]) * (s + sag)], [c[0] + (q[0] - c[0]) * s, 1, c[2] + (q[2] - c[2]) * s], 0.45, m));
        }
      }
      if (v === 'con_presa') {
        ps.push(a.palo([6, 1, 31], [6, 1, 27], 0.5, m), a.elipsoide(6, 1.5, 21, 3.6, 3.4, 7, { mat: 'cue_telarana', tono: -0.06 }));
        for (let k = 0; k < 4; k++) ps.push(a.cilindro(6, 1.5, 16 + k * 2.6, 3.4 - Math.abs(k - 1.5) * 0.4, 0.9, { mat: 'cue_telarana', tono: 0.08, incl: (a.r() - 0.5) * 30 }));
        calavera(a, ps, -4, 10, 0, 0.9, 60);
        hueso(a, ps, [4, 12, 1.2], [12, 7, 1.2]);
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'cue_vagoneta', nombre: ['Vagoneta de mina', 'Mine cart'], tema: 'cueva', variantes: ['mineral', 'vacia', 'volcada'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const vol = v === 'volcada';
      const T = (p: V3): V3 => (vol ? [p[0], p[2] - 9, 9 - p[1]] : p);
      const P = (pts: V3[], mat: string, tono = 0) => a.poliedro(pts.map(T), { mat, tono });
      const caj = (x0: number, x1: number, yb: number, yt: number, zb: number, zt: number, xt = 0): V3[] => [[x0, -yb, zb], [x1, -yb, zb], [x0, yb, zb], [x1, yb, zb], [x0 - xt, -yt, zt], [x1 + xt, -yt, zt], [x0 - xt, yt, zt], [x1 + xt, yt, zt]];
      // rieles debajo
      for (const l of [-1, 1]) ps.push(a.caja(0, l * 7.6, 0.8, 40, 1.6, 1.6, { mat: 'hierro_oxido' }));
      for (let k = 0; k < 4; k++) ps.push(a.caja(-15 + k * 10, 0, 0, 3.5, 21, 1.2, { mat: 'madera_vieja', giro: (a.r() - 0.5) * 6 }));
      ps.push(P(caj(-10, 10, 6.5, 8.5, 5, 18, 2.5), 'madera'));
      for (const x of [-6.5, 6.5]) ps.push(P(caj(x - 1, x + 1, 6.9, 8.9, 4.8, 18.2, 0), 'hierro_oxido'));
      ps.push(P(caj(-12.8, 12.8, 8.6, 8.9, 17, 18.6, 0), 'hierro_oxido'));
      ps.push(a.poliedro(caj(-9, 9, 5.5, 7.5, 7, 19, 2.3).map(T), { mat: 'madera', resta: true }));
      for (const x of [-6.5, 6.5]) {
        ps.push(a.palo(T([x, -8.2, 3.6]), T([x, 8.2, 3.6]), 0.8, { mat: 'hierro' }));
        for (const l of [-1, 1]) ps.push(a.palo(T([x, l * 7, 3.6]), T([x, l * 9.2, 3.6]), 3.6, { mat: 'hierro' }));
      }
      if (v === 'mineral') {
        for (let i = 0; i < 8; i++) ps.push(pena(a, (a.r() - 0.5) * 16, (a.r() - 0.5) * 10, 16 + a.r() * 3, 3 + a.r() * 2, 3, 2.5 + a.r(), { mat: 'cue_roca' }));
        for (let i = 0; i < 6; i++) ps.push(pena(a, (a.r() - 0.5) * 16, (a.r() - 0.5) * 10, 19 + a.r() * 2, 1.4, 1.4, 1.2, { mat: 'oro' }));
      }
      if (vol) {
        for (let i = 0; i < 12; i++) { const x = (a.r() - 0.5) * 26, y = 12 + a.r() * 16; ps.push(pena(a, x, y, 1, 2 + a.r() * 2.5, 2 + a.r() * 2, 1.5 + a.r() * 1.5, { mat: i % 4 === 0 ? 'oro' : 'cue_roca' })); }
        ps.push(a.palo([-16, 16, 0.6], [-4, 22, 1.4], 0.9, { mat: 'madera' }));
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'cue_rieles', nombre: ['Rieles de mina', 'Mine rails'], tema: 'cueva', variantes: ['x', 'y', 'tope', 'roto'], huella: [5, 2], bloquea: false, plano: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const sw = v === 'y';
      const B = (x: number, y: number, z: number, an: number, pr: number, al: number, mat: string, giro = 0, incl = 0) => ps.push(sw ? a.caja(y, x, z, an, pr, al, { mat, giro: giro + 90, incl }) : a.caja(x, y, z, an, pr, al, { mat, giro, incl }));
      const fin = v === 'tope' ? 18 : 40;
      for (let k = 0; k < 8; k++) { const x = -35 + k * 10; if (x > fin || (v === 'roto' && k === 4)) continue; B(x + (a.r() - 0.5) * 2, 0, 0, 3.5, 21, 1.2, 'madera_vieja', (a.r() - 0.5) * 8); }
      for (const l of [-1, 1]) {
        if (v === 'roto' && l === 1) { B(-22, l * 7.6, 1.2, 36, 1.6, 1.6, 'hierro_oxido'); B(24, l * 7.6, 1.2, 32, 1.6, 1.6, 'hierro_oxido'); B(5, l * 9.5, 1.5, 14, 1.6, 1.6, 'hierro_oxido', 20, 8); }
        else B((fin - 40) / 2, l * 7.6, 1.2, fin + 40, 1.6, 1.6, 'hierro_oxido');
      }
      if (v === 'tope') {
        for (const l of [-1, 1]) B(22, l * 7, 0, 3, 3, 9, 'madera');
        B(22, 0, 7, 3.5, 20, 4, 'madera');
        ps.push(a.elipsoide(30, 0, 0, 10, 14, 6, { mat: 'tierra' }));
        for (let i = 0; i < 4; i++) ps.push(pena(a, 30 + a.r() * 6, (a.r() - 0.5) * 20, 3, 3, 3, 2.5, { mat: 'cue_roca' }));
      }
      if (v === 'roto') for (let i = 0; i < 5; i++) ps.push(pena(a, (a.r() - 0.3) * 20, (a.r() - 0.5) * 18, 0.6, 2 + a.r() * 2, 2, 1.5, { mat: 'cue_roca' }));
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'cue_puntal', nombre: ['Puntales de mina', 'Mine support beams'], tema: 'cueva', variantes: ['entero', 'farol', 'roto'], huella: [3, 1], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const roto = v === 'roto';
      ps.push(a.caja(18, 0, 0, 5.5, 5.5, 58, { mat: 'madera', incl: (a.r() - 0.5) * 3 }));
      if (roto) {
        ps.push(a.caja(-18, 0, 0, 5.5, 5.5, 26, { mat: 'madera' }), a.poliedro([[-20.7, -2.7, 26], [-15.3, -2.7, 26], [-20.7, 2.7, 26], [-15.3, 2.7, 26], [-17, 0, 31]], { mat: 'madera', tono: 0.1 }));
        ps.push(a.caja(-12, 14, 0, 5.5, 30, 5.5, { mat: 'madera', giro: 70 }));
        ps.push(a.caja(-2, 0, 44, 52, 6, 6, { mat: 'madera', incl: 20, inclEje: 'y' }));
        ps.push(a.palo([18, 0, 46], [11, 0, 56], 1.6, { mat: 'madera_vieja' }));
        for (let i = 0; i < 8; i++) ps.push(pena(a, -18 + a.r() * 16, (a.r() - 0.3) * 18, 2, 3 + a.r() * 3, 3, 2 + a.r() * 2, { mat: 'cue_roca' }));
      } else {
        ps.push(a.caja(-18, 0, 0, 5.5, 5.5, 58, { mat: 'madera', incl: (a.r() - 0.5) * 3 }));
        ps.push(a.caja(0, 0, 58, 50, 6.5, 6, { mat: 'madera' }), a.caja(0, 0, 64, 42, 14, 1.8, { mat: 'madera_vieja', giro: (a.r() - 0.5) * 4 }));
        for (const l of [-1, 1]) ps.push(a.palo([l * 18, 0, 45], [l * 9, 0, 58.5], 1.7, { mat: 'madera_vieja' }));
      }
      for (const l of [-1, 1]) for (let i = 0; i < 2; i++) ps.push(pena(a, l * 18 + (a.r() - 0.5) * 8, (a.r() - 0.5) * 8, 1, 2.5 + a.r() * 2, 2.5, 2, { mat: 'cue_roca' }));
      if (v === 'farol') {
        ps.push(a.palo([7, 0, 58], [7, 0, 50], 0.5, { mat: 'hierro' }), a.cilindro(7, 0, 48, 2.6, 2.5, { mat: 'hierro', r1: 0.5 }));
        ps.push(a.caja(7, 0, 41, 4.5, 4.5, 1, { mat: 'hierro' }), a.cilindro(7, 0, 42, 1.8, 6, { mat: 'luz_vela' }));
        for (const [dx, dy] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) ps.push(a.caja(7 + dx, dy, 42, 0.8, 0.8, 6, { mat: 'hierro' }));
        ps.push(suelo(a));
        return { piezas: ps, resplandor: { c: [7, 0, 45], r: 28, color: '#ffb04a' } };
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'cue_campamento', nombre: ['Campamento abandonado', 'Abandoned campsite'], tema: 'cueva', variantes: ['frio', 'brasas', 'saqueado'], huella: [4, 3], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [a.elipsoide(0, 0, 0, 34, 24, 1.2, { mat: 'tierra' })];
      const fx = 8, fy = 4;
      for (let i = 0; i < 9; i++) { const t = (i / 9) * 2 * PI; ps.push(pena(a, fx + Math.cos(t) * 7.5, fy + Math.sin(t) * 7.5, 1, 2.6, 2.2, 2.2, { mat: 'cue_roca', tono: (a.r() - 0.5) * 0.1 })); }
      ps.push(a.elipsoide(fx, fy, 0, 6, 6, 1.8, { mat: 'cue_ceniza' }));
      for (let i = 0; i < 3; i++) { const t = a.r() * PI; ps.push(a.palo([fx - Math.cos(t) * 5, fy - Math.sin(t) * 5, 1.5], [fx + Math.cos(t) * 5, fy + Math.sin(t) * 5, 2.5], 1.3, { mat: 'cue_carbon' })); }
      // trípode con olla
      for (let i = 0; i < 3; i++) { const t = (i / 3) * 2 * PI + 0.4; ps.push(a.palo([fx + Math.cos(t) * 9, fy + Math.sin(t) * 9, 0], [fx, fy, 24], 0.9, { mat: 'madera_vieja' })); }
      ps.push(a.palo([fx, fy, 24], [fx, fy, 14], 0.4, { mat: 'hierro' }), a.cilindro(fx, fy, 9, 3.5, 5, { mat: 'hierro', r1: 4 }));
      // petate, mochila, caja, pico
      const saq = v === 'saqueado';
      ps.push(a.caja(-16, -6, 0, 26, 11, 1.4, { mat: saq ? 'tela' : 'tela_roja', giro: 8, tono: -0.05 }));
      ps.push(a.cilindro(-28, -8, 3.2, 3.2, 10, { mat: 'tela_roja', eje: [0.99, 0.14, 0], tono: 0.05 }));
      if (!saq) ps.push(a.elipsoide(-18, 12, 5, 5, 4, 6, { mat: 'cuero' }), a.caja(-18, 15.5, 2, 4, 1.5, 4, { mat: 'cuero', tono: -0.1 }));
      ps.push(a.caja(20, -14, 0, 12, 10, 10, { mat: 'madera', giro: 10 }));
      if (saq) {
        ps.push(a.caja(20, -14, 5, 10, 8, 6, { mat: 'madera', giro: 10, resta: true }), a.caja(26, -2, 0, 12, 10, 1.6, { mat: 'madera', giro: 40, incl: 6 }));
        ps.push(a.elipsoide(-6, 12, 0, 7, 4, 1.4, { mat: 'sangre', giro: 20 }), a.elipsoide(-18, 14, 1, 6, 4, 2, { mat: 'cuero', tono: -0.1, giro: 60 }));
        calavera(a, ps, -4, 16, 0, 1, 50);
        hueso(a, ps, [-12, 8, 1.2], [-4, 6, 1.4]);
      }
      ps.push(a.palo([13, -9, 0], [15, -11, 17], 0.9, { mat: 'madera' }), a.caja(15, -11, 15.5, 11, 1.6, 1.8, { mat: 'hierro', giro: 45, incl: 10 }));
      if (v === 'brasas') {
        for (let i = 0; i < 5; i++) ps.push(a.esfera(fx + (a.r() - 0.5) * 6, fy + (a.r() - 0.5) * 6, 1.6, 1.2 + a.r() * 0.6, { mat: 'fuego', tono: -0.25 }));
        ps.push(a.cilindro(fx, fy, 1.5, 2, 4, { mat: 'fuego', r1: 0.3, tono: -0.1 }));
        ps.push(suelo(a));
        return { piezas: ps, resplandor: { c: [fx, fy, 4], r: 24, color: '#ff7a2a' } };
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'cue_veta', nombre: ['Roca con veta', 'Ore vein rock'], tema: 'cueva', variantes: ['oro', 'plata', 'gemas'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const rx = 23, ry = 20, rz = 24, cz = 9;
      ps.push(pena(a, 0, 0, cz, rx, ry, rz, { mat: 'cue_roca', giro: 0, n: 22 }));
      for (let i = 0; i < 3; i++) { const t = a.r() * 2 * PI; ps.push(pena(a, Math.cos(t) * 13, Math.sin(t) * 11, 6, 9, 8, 9, { mat: 'cue_roca', tono: (a.r() - 0.5) * 0.1 })); }
      const mat = v === 'oro' ? 'oro' : v === 'plata' ? 'acero' : 'cue_gema_roja';
      // la veta: una franja inclinada de pepitas sobre la cara que se ve
      for (let i = 0; i < 14; i++) {
        const u = i / 13, t = -0.2 + u * 1.9 + (a.r() - 0.5) * 0.25, ph = 0.1 + u * 0.5 + (a.r() - 0.5) * 0.2;
        const d: V3 = [Math.cos(t) * Math.cos(ph), Math.sin(t) * Math.cos(ph), Math.sin(ph)];
        const p: V3 = [d[0] * rx * 0.86, d[1] * ry * 0.86, cz + d[2] * rz * 0.86];
        if (v === 'gemas' && i % 3 === 0) ps.push(prisma(a, p, [d[0], d[1], d[2] + 1], 5 + a.r() * 3, 1.8, mat));
        else ps.push(pena(a, p[0], p[1], p[2], 1.6 + a.r() * 1.2, 1.6 + a.r(), 1.4 + a.r(), { mat }));
      }
      for (let i = 0; i < 4; i++) ps.push(pena(a, 14 + a.r() * 10, (a.r() - 0.2) * 20, 1, 2 + a.r() * 2, 2, 1.5, { mat: i === 0 ? mat : 'cue_roca' }));
      ps.push(suelo(a));
      return ps;
    },
  },
);
