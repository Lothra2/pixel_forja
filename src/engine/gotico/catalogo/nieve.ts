import { registrar, type Arma, type Pieza, type V3 } from '../objeto';
import { MATERIALES } from '../materiales';

// Montaña nevada y asedio: pinos nevados, rocas y ventisqueros, barricadas, catapulta y torre de asedio, tótems y
// estandartes tribales, postes de calaveras, hogueras, un pozo helado, una jaula, un trineo, el altar de los
// antiguos (tres grandes estatuas) y un armero.

MATERIALES.nie_nieve = { rampa: ['#262f3c', '#3a4657', '#516073', '#6a7a8e', '#8494a8', '#a0aec0', '#bcc8d6', '#d6dee6'], ruido: 0.15, escala: 0.12 };
MATERIALES.nie_roca = { rampa: ['#121315', '#202226', '#30333a', '#42464e', '#565b64', '#6b717a', '#80868e'], ruido: 0.5, escala: 0.13 };
MATERIALES.nie_piel = { rampa: ['#1a140e', '#2c2218', '#403224', '#554433', '#6b5843', '#826d55'], ruido: 0.6, escala: 0.8 };
MATERIALES.nie_estatua = { rampa: ['#141518', '#22242a', '#33363d', '#464a52', '#5b5f68', '#71757e', '#888c94', '#a0a3a9'], ruido: 0.35, escala: 0.16 };
MATERIALES.nie_quemado = { rampa: ['#0a0807', '#14100d', '#1f1914', '#2b231b', '#382d22'], ruido: 0.5, escala: 0.5 };

const PI = Math.PI;
const rad = (g: number) => (g * PI) / 180;
const suelo = (a: Arma) => a.caja(0, 0, -80, 900, 900, 80, { mat: 'roca', resta: true });
const N = 'nie_nieve';

function pena(a: Arma, x: number, y: number, z: number, rx: number, ry: number, rz: number, o: { mat: string; giro?: number; tono?: number; n?: number }): Pieza {
  const g = rad(o.giro ?? a.r() * 360), c = Math.cos(g), s = Math.sin(g);
  const loc: V3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (let i = 0; i < (o.n ?? 8); i++) { const th = a.r() * 2 * PI, w = a.r() * 2 - 1, q = Math.sqrt(1 - w * w); loc.push([Math.cos(th) * q, Math.sin(th) * q, w]); }
  const pts: V3[] = loc.map(([lx, ly, lz]) => { const k = 0.84 + a.r() * 0.16; const px = lx * rx * k, py = ly * ry * k; return [x + px * c - py * s, y + px * s + py * c, z + Math.max(-0.8, Math.min(0.72, lz)) * rz * k]; });
  return a.poliedro(pts, { mat: o.mat, tono: o.tono });
}
/** Montoncitos de nieve en el piso alrededor del objeto. */
function nevado(a: Arma, ps: Pieza[], rx: number, ry: number, n = 4, alto = 2.5) {
  for (let i = 0; i < n; i++) { const t = (i / n) * 2 * PI + a.r(); ps.push(a.elipsoide(Math.cos(t) * rx * 0.45, Math.sin(t) * ry * 0.45, 0, rx * (0.45 + a.r() * 0.25), ry * (0.4 + a.r() * 0.25), alto * (0.4 + a.r() * 0.4), { mat: N, giro: a.r() * 180, tono: -0.12 })); }
}
function calavera(a: Arma, ps: Pieza[], x: number, y: number, z: number, s = 1, giro = 45) {
  const g = rad(giro), fx = Math.cos(g), fy = Math.sin(g), sx = -fy, sy = fx;
  ps.push(a.elipsoide(x, y, z + 3.6 * s, 3.8 * s, 3.3 * s, 3.4 * s, { mat: 'hueso', giro }));
  ps.push(a.caja(x + fx * 2.2 * s, y + fy * 2.2 * s, z, 3 * s, 4 * s, 2.6 * s, { mat: 'hueso', giro, tono: -0.05 }));
  for (const l of [-1, 1]) ps.push(a.esfera(x + fx * 3 * s + sx * l * 1.4 * s, y + fy * 3 * s + sy * l * 1.4 * s, z + 4 * s, 1.2 * s, { mat: 'negro' }));
  ps.push(a.esfera(x + fx * 3.6 * s, y + fy * 3.6 * s, z + 2.4 * s, 0.7 * s, { mat: 'negro' }));
}
function llama(a: Arma, ps: Pieza[], x: number, y: number, z: number, f: number, n: number, e = 1, mat = 'fuego') {
  for (let k = 0; k < 3; k++) {
    const an = (k / 3) * 2 * PI + f * 0.9, fr = Math.sin((f / n) * 2 * PI + k * 2.1);
    ps.push(a.cilindro(x + Math.cos(an) * 1.2 * e, y + Math.sin(an) * 1.2 * e, z, (3 - k * 0.5) * e, (8 + fr * 2.5 + k * 2) * e, { mat, r1: 0.3 }));
  }
  ps.push(a.elipsoide(x, y, z + 1.2 * e, 3.4 * e, 3.4 * e, 2.4 * e, { mat, tono: 0.2 }));
}
/** Estaca: tronco con la punta afilada (la punta es madera recién cortada, más clara). */
function estaca(a: Arma, ps: Pieza[], p: V3, q: V3, r: number, mat = 'corteza') {
  const m: V3 = [p[0] + (q[0] - p[0]) * 0.82, p[1] + (q[1] - p[1]) * 0.82, p[2] + (q[2] - p[2]) * 0.82];
  ps.push(a.palo(p, m, r, { mat }), a.palo(m, q, r, { mat: 'madera_lisa', r1: 0.25, tono: 0.08 }));
}
/** Rueda de madera con cubo de hierro, eje a lo largo de `d`. */
function rueda(a: Arma, ps: Pieza[], c: V3, d: V3, r: number, mat = 'madera') {
  ps.push(a.palo([c[0] - d[0] * 1.6, c[1] - d[1] * 1.6, c[2]], [c[0] + d[0] * 1.6, c[1] + d[1] * 1.6, c[2]], r, { mat }));
  ps.push(a.palo([c[0] - d[0] * 2.2, c[1] - d[1] * 2.2, c[2]], [c[0] + d[0] * 2.2, c[1] + d[1] * 2.2, c[2]], r * 0.28, { mat: 'hierro' }));
}

/** Estatua de los antiguos: guerrero de piedra sobre pedestal, mira hacia `ang` grados, con un arma distinta. */
function estatua(a: Arma, ps: Pieza[], cx: number, cy: number, ang: number, arma: number, vivo: boolean) {
  const k = 1.25, g = rad(ang), fx = Math.cos(g), fy = Math.sin(g), sx = -fy, sy = fx;
  const P = (fw: number, sd: number, z: number): V3 => [cx + (fx * fw + sx * sd) * k, cy + (fy * fw + sy * sd) * k, z * k];
  const M = { mat: 'nie_estatua' };
  const C = (fw: number, sd: number, z: number, an: number, pr: number, al: number, mat = 'nie_estatua', tono = 0) => { const p = P(fw, sd, z); ps.push(a.caja(p[0], p[1], p[2], an * k, pr * k, al * k, { mat, giro: ang + 90, tono })); };
  C(0, 0, 0, 20, 20, 8, 'piedra_gris');
  C(0, 0, 8, 17, 17, 2, 'piedra_gris', 0.05);
  let p = P(0, 0, 10);
  ps.push(a.cilindro(p[0], p[1], p[2], 9 * k, 42 * k, { ...M, r1: 7.5 * k }));
  p = P(0, 0, 50); ps.push(a.cilindro(p[0], p[1], p[2], 8 * k, 3 * k, { mat: 'nie_estatua', tono: -0.08 }));
  C(0, 0, 52, 22, 12, 17);
  for (const l of [-1, 1]) { p = P(0, l * 12, 67); ps.push(a.esfera(p[0], p[1], p[2], 5.5 * k, M)); }
  p = P(1, 0, 77); ps.push(a.elipsoide(p[0], p[1], p[2], 5 * k, 5 * k, 6.2 * k, { ...M, giro: ang }));
  p = P(0.5, 0, 79); ps.push(a.cilindro(p[0], p[1], p[2], 5.8 * k, 5 * k, { mat: 'nie_estatua', r1: 3 * k, tono: -0.05 }));
  ps.push(a.poliedro([P(4.5, -3.5, 75), P(4.5, 3.5, 75), P(3, -4, 76), P(3, 4, 76), P(6, 0, 62), P(3, 0, 62)], { mat: 'nie_estatua', tono: 0.06 }));
  if (arma === 0) for (const l of [-1, 1]) ps.push(a.palo(P(0, l * 4.5, 82), P(-1, l * 10, 90), 1.8 * k, { mat: 'hueso', r1: 0.5 * k }));
  // brazos hacia el arma, delante del cuerpo
  for (const l of [-1, 1]) { ps.push(a.palo(P(0, l * 12, 66), P(6, l * 9, 52), 3.2 * k, M), a.palo(P(6, l * 9, 52), P(10, l * 2.5, 46), 2.8 * k, M)); }
  if (arma === 0) {
    ps.push(a.poliedro([P(9.2, -3, 40), P(10.8, -3, 40), P(9.2, 3, 40), P(10.8, 3, 40), P(10, 0, 10)], { mat: 'nie_estatua', tono: 0.1 }));
    C(10, 0, 40, 14, 2.5, 2.5);
    ps.push(a.palo(P(10, 0, 42), P(10, 0, 50), 1.4 * k, M));
    p = P(10, 0, 51); ps.push(a.esfera(p[0], p[1], p[2], 2.2 * k, M));
  } else if (arma === 1) {
    ps.push(a.palo(P(10, 0, 10), P(10, 0, 64), 1.5 * k, M));
    ps.push(a.poliedro([P(10, 1, 56), P(10, 1, 64), P(10, 9, 52), P(10, 9, 68), P(10.8, 1, 60), P(9.2, 1, 60)], { mat: 'nie_estatua', tono: 0.1 }));
  } else {
    ps.push(a.palo(P(10, 0, 10), P(10, 0, 60), 1.6 * k, M));
    p = P(10, 0, 58); ps.push(a.caja(p[0], p[1], p[2], 6 * k, 15 * k, 8 * k, { mat: 'nie_estatua', giro: ang, tono: 0.05 }));
  }
  // nieve en hombros, cabeza y pedestal
  for (const l of [-1, 1]) { p = P(0, l * 12, 71); ps.push(a.elipsoide(p[0], p[1], p[2], 4.5 * k, 4 * k, 1.8 * k, { mat: N })); }
  p = P(0.5, 0, 84); ps.push(a.elipsoide(p[0], p[1], p[2], 3.4 * k, 3.4 * k, 1.5 * k, { mat: N }));
  p = P(-5, 5, 10); ps.push(a.elipsoide(p[0], p[1], p[2], 6 * k, 4 * k, 1.6 * k, { mat: N, tono: -0.05 }));
  if (vivo) for (const l of [-1, 1]) { p = P(5, l * 1.8, 78.5); ps.push(a.esfera(p[0], p[1], p[2], 1.1 * k, { mat: 'runa' })); }
}

registrar(
  {
    id: 'nie_pino', nombre: ['Pino nevado', 'Snowy pine'], tema: 'nieve', variantes: ['alto', 'mediano', 'cargado', 'seco'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      nevado(a, ps, 22, 20, 4, 3);
      const H = v === 'alto' ? 140 : v === 'cargado' ? 115 : v === 'seco' ? 100 : 96;
      const jx = (a.r() - 0.5) * 4, jy = (a.r() - 0.5) * 4;
      ps.push(a.palo([0, 0, 0], [jx, jy, H * 0.96], v === 'seco' ? 4 : 3.6, { mat: v === 'seco' ? 'corteza_muerta' : 'corteza', r1: 0.8 }));
      ps.push(a.cilindro(0, 0, 0, 6, 4, { mat: 'corteza', r1: 3.6 }));
      if (v === 'seco') {
        for (let i = 0; i < 12; i++) {
          const f = 0.25 + (i / 12) * 0.68, z = H * f, t = i * 2.4 + a.r(), L = (1 - f) * 34 + 6;
          const b: V3 = [jx * f + Math.cos(t) * L, jy * f + Math.sin(t) * L, z - L * 0.25];
          ps.push(a.palo([jx * f, jy * f, z], b, 1.6 * (1 - f) + 0.5, { mat: 'corteza_muerta', r1: 0.4 }));
          ps.push(a.elipsoide((jx * f + b[0]) / 2, (jy * f + b[1]) / 2, (z + b[2]) / 2 + 1.2, L * 0.35, 1.6, 1.1, { mat: N, giro: (t * 180) / PI }));
        }
      } else {
        const n = v === 'alto' ? 7 : 6, R = v === 'alto' ? 34 : v === 'cargado' ? 32 : 26, z0 = H * 0.16, paso = (H * 0.86 - z0) / n;
        const cub = v === 'cargado' ? 0.82 : 0.7;
        for (let i = 0; i < n; i++) {
          const f = i / n, r = R * (1 - f * 0.78) * (0.92 + a.r() * 0.16), z = z0 + i * paso, h = paso * 1.9, x = jx * (z / H), y = jy * (z / H);
          ps.push(a.cilindro(x, y, z + h * 0.1, r * 0.8, h * 0.9, { mat: 'pino', r1: 0.6, tono: (a.r() - 0.5) * 0.08 }));
          // ramas en cuña que cuelgan hacia afuera: dan el borde dentado
          const nr = 7 + (i < 2 ? 2 : 0), t0 = a.r() * 2 * PI;
          for (let j = 0; j < nr; j++) {
            const t = t0 + (j / nr) * 2 * PI + (a.r() - 0.5) * 0.3, rr = r * (0.95 + a.r() * 0.15), c = Math.cos(t), sn = Math.sin(t), d = 0.32;
            ps.push(a.poliedro([[x, y, z + h * 0.55], [x + c * rr, y + sn * rr, z - 1.5 - a.r() * 2], [x + Math.cos(t - d) * rr * 0.7, y + Math.sin(t - d) * rr * 0.7, z + 1.5], [x + Math.cos(t + d) * rr * 0.7, y + Math.sin(t + d) * rr * 0.7, z + 1.5], [x + c * rr * 0.45, y + sn * rr * 0.45, z + h * 0.3]], { mat: 'pino', tono: (a.r() - 0.5) * 0.1 }));
            if (a.r() < (v === 'cargado' ? 0.85 : 0.55)) ps.push(a.elipsoide(x + c * rr * 0.62, y + sn * rr * 0.62, z + h * 0.12 + 1, rr * 0.28, rr * 0.14, 1.6, { mat: N, giro: (t * 180) / PI, tono: -0.04 }));
          }
          ps.push(a.cilindro(x + (a.r() - 0.5), y + (a.r() - 0.5), z + h * 0.34, r * cub * 0.85, h * 0.7, { mat: N, r1: 0.4, incl: (a.r() - 0.5) * 6, tono: -0.06 }));
        }
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'nie_rocas', nombre: ['Rocas nevadas', 'Snow-covered rocks'], tema: 'nieve', variantes: ['grande', 'grupo', 'chica'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const roca = (x: number, y: number, r: number, alt: number) => {
        ps.push(pena(a, x, y, r * alt * 0.45, r, r * 0.85, r * alt, { mat: 'nie_roca', n: 16, tono: (a.r() - 0.5) * 0.08 }));
        ps.push(pena(a, x + r * 0.5, y + r * 0.4, r * alt * 0.25, r * 0.55, r * 0.5, r * alt * 0.55, { mat: 'nie_roca', n: 12 }));
        ps.push(a.elipsoide(x - r * 0.1, y, r * alt * 0.82, r * 0.6, r * 0.5, r * alt * 0.32, { mat: N, giro: a.r() * 90 }));
        ps.push(a.elipsoide(x - r * 0.4, y + r * 0.5, 0, r * 0.7, r * 0.5, r * 0.35, { mat: N, tono: -0.05 }));
      };
      if (v === 'grande') roca(0, 0, 24, 1);
      else if (v === 'chica') roca(0, 0, 11, 0.85);
      else { roca(-6, -5, 16, 1); roca(12, 8, 10, 0.8); roca(-12, 12, 7, 0.7); }
      nevado(a, ps, 26, 22, 3, 2);
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'nie_ventisquero', nombre: ['Ventisquero', 'Snowdrift'], tema: 'nieve', variantes: ['chico', 'largo', 'con_restos'], huella: [3, 2], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const n = v === 'largo' ? 7 : 4, L = v === 'largo' ? 70 : 34;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1) - 0.5, h = (1 - Math.abs(t) * 1.4) * (v === 'largo' ? 10 : 7) + a.r() * 2;
        ps.push(a.elipsoide(t * L, (a.r() - 0.5) * 6 - t * 6, 0, 13 + a.r() * 5, 10 + a.r() * 4, h, { mat: N, giro: -20 + a.r() * 20, tono: -0.1 + (a.r() - 0.5) * 0.06 }));
      }
      // cresta del viento
      ps.push(a.elipsoide(-L * 0.1, -5, 0, L * 0.4, 5, (v === 'largo' ? 11 : 8), { mat: N, giro: -15, tono: -0.04 }));
      if (v === 'con_restos') {
        ps.push(a.cilindro(10, 8, 2, 7, 1.6, { mat: 'madera', eje: [0.3, 0.6, 0.75] }), a.esfera(10.5, 9, 3.4, 2, { mat: 'hierro' }));
        ps.push(a.poliedro([[-8, 4, 6], [-6, 4, 6], [-7, 3.5, 22], [-7, 4.5, 22]], { mat: 'acero' }), a.caja(-7, 4, 22, 8, 1.6, 1.6, { mat: 'hierro' }), a.palo([-7, 4, 23.6], [-7, 4, 29], 0.9, { mat: 'cuero' }));
        calavera(a, ps, -16, 10, 3, 0.9, 40);
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'nie_barricada', nombre: ['Barricada de estacas', 'Spiked log barricade'], tema: 'nieve', variantes: ['estacas', 'empalizada', 'rota'], huella: [5, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      nevado(a, ps, 44, 16, 5, 3);
      if (v === 'empalizada') {
        for (let i = 0; i < 11; i++) {
          const x = -38 + i * 7.6 + (a.r() - 0.5), h = 50 + a.r() * 12;
          estaca(a, ps, [x, (a.r() - 0.5) * 1.5, 0], [x + (a.r() - 0.5) * 2, (a.r() - 0.5) * 2, h], 3.7);
          if (a.r() < 0.5) ps.push(a.elipsoide(x, 0, h * 0.82, 2.6, 2.6, 1.2, { mat: N }));
        }
        for (const z of [14, 36]) ps.push(a.caja(0, 4, z, 82, 3, 4, { mat: 'madera_vieja', giro: (a.r() - 0.5) * 2 }));
        for (const x of [-30, 0, 30]) ps.push(a.palo([x, -14, 0], [x, -2, 30], 1.8, { mat: 'corteza' }));
      } else {
        const rota = v === 'rota';
        if (rota) { ps.push(a.palo([-40, 0, 10], [-4, 0, 11], 4, { mat: 'corteza' }), a.palo([6, 4, 3], [38, 10, 4], 4, { mat: 'corteza' })); }
        else ps.push(a.palo([-40, 0, 12], [40, 0, 12], 4.2, { mat: 'corteza' }));
        for (let i = 0; i < 9; i++) {
          const x = -34 + i * 8.5;
          if (rota && (i === 4 || i === 5)) continue;
          const z = rota && x > 0 ? 4 : 12, yo = rota && x > 0 ? 6 : 0;
          const corta = rota && i % 3 === 0;
          for (const l of [-1, 1]) estaca(a, ps, [x, yo - l * 14, rota && x > 0 ? 0 : 0], [x + (a.r() - 0.5) * 3, yo + l * (corta ? 6 : 16), z + (corta ? 10 : 22)], 2);
        }
        ps.push(a.elipsoide(-20, 0, 15.5, 18, 3.4, 1.6, { mat: N }), a.elipsoide(18, rota ? 6 : 0, rota ? 7.5 : 15.5, 14, 3.4, 1.6, { mat: N }));
        if (rota) for (let i = 0; i < 4; i++) ps.push(a.palo([(a.r() - 0.5) * 20, 14 + a.r() * 6, 1.5], [(a.r() - 0.5) * 20 + 10, 10 + a.r() * 6, 1.5], 1.8, { mat: 'corteza' }));
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'nie_catapulta', nombre: ['Catapulta de asedio', 'Siege catapult'], tema: 'nieve', variantes: ['cargada', 'disparada', 'rota'], huella: [5, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const rota = v === 'rota', m = rota ? 'nie_quemado' : 'madera', mv = rota ? 'nie_quemado' : 'madera_vieja';
      nevado(a, ps, 40, 24, 5, 2);
      // bastidor y ruedas
      for (const l of [-1, 1]) ps.push(a.caja(0, l * 11, 6, 66, 5, 5, { mat: m }));
      for (const x of [-28, -6, 26]) ps.push(a.caja(x, 0, 6, 5, 27, 4.5, { mat: m, tono: -0.04 }));
      for (const x of [-20, 20]) for (const l of [-1, 1]) {
        if (rota && x > 0 && l > 0) { rueda(a, ps, [26, 26, 2.2], [0, 0.3, 1], 8, m); continue; }
        rueda(a, ps, [x, l * 15, 8], [0, 1, 0], 8, m);
      }
      // caballete con el travesaño de tope
      const xp = 14;
      for (const l of [-1, 1]) {
        ps.push(a.palo([xp - 9, l * 11, 11], [xp + 2, l * 11, 44], 2.2, { mat: m }), a.palo([xp + 11, l * 11, 11], [xp + 2, l * 11, 44], 2.2, { mat: m }));
      }
      if (!rota) ps.push(a.caja(xp + 2, 0, 42, 5, 28, 5, { mat: m }), a.caja(xp + 2, 0, 41, 5.6, 14, 6, { mat: 'nie_piel' }));
      else ps.push(a.caja(xp + 2, -5, 42, 5, 16, 5, { mat: m, incl: 12 }));
      // haz de cuerdas retorcidas y el brazo
      ps.push(a.cilindro(xp, -12, 12, 4.5, 24, { mat: 'cuerda', eje: [0, 1, 0] }));
      const piv: V3 = [xp, 0, 12];
      const punta: V3 = v === 'disparada' ? [xp + 6, 0, 54] : rota ? [xp - 14, 0, 18] : [-30, 0, 15];
      ps.push(a.palo(piv, punta, 2.6, { mat: m, r1: 2 }));
      if (!rota) {
        ps.push(a.cilindro(punta[0], punta[1], punta[2] - 1, 3, 4, { mat: mv, r1: 6 }), a.cilindro(punta[0], punta[1], punta[2] + 1.5, 4.8, 2, { mat: 'negro' }));
        if (v === 'cargada') ps.push(pena(a, punta[0], punta[1], punta[2] + 4, 5, 5, 4.5, { mat: 'nie_roca' }));
        // torno atrás
        ps.push(a.cilindro(-30, -11, 11, 2.6, 22, { mat: 'madera', eje: [0, 1, 0] }), a.palo([-30, 0, 11], [punta[0], 0, punta[2]], 0.6, { mat: 'cuerda' }));
      } else {
        ps.push(a.palo([-6, 20, 2], [-30, 14, 3], 2.4, { mat: m }), a.cilindro(-32, 13, 0, 3, 4, { mat: mv, r1: 6 }));
      }
      for (let i = 0; i < 3; i++) ps.push(pena(a, -24 + i * 7, -24 + a.r() * 4, 4, 5, 5, 4.5, { mat: 'nie_roca' }));
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'nie_torre_asedio', nombre: ['Torre de asedio', 'Siege tower'], tema: 'nieve', variantes: ['cerrada', 'abierta', 'quemada'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const q = v === 'quemada', m = q ? 'nie_quemado' : 'madera', mv = q ? 'nie_quemado' : 'madera_vieja';
      const B = 20, T = 17, z0 = 10, z1 = 120;
      const ancho = (z: number) => B + (T - B) * ((z - z0) / (z1 - z0));
      ps.push(a.poliedro([[-B, -B, z0], [B, -B, z0], [-B, B, z0], [B, B, z0], [-T, -T, z1], [T, -T, z1], [-T, T, z1], [T, T, z1]], { mat: m }));
      // ruedas a los lados
      for (const x of [-11, 11]) for (const l of [-1, 1]) rueda(a, ps, [x, l * (B + 2), 9], [0, 1, 0], 9, m);
      for (const y of [-11, 11]) rueda(a, ps, [B + 2, y, 9], [1, 0, 0], 9, m);
      // vigas de cada piso y postes de esquina
      for (const z of [z0, 46, 82]) { const w = ancho(z) * 2 + 2; ps.push(a.caja(0, 0, z, w, w, 3.5, { mat: mv })); }
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) ps.push(a.palo([sx * (B + 0.5), sy * (B + 0.5), z0], [sx * (T + 0.5), sy * (T + 0.5), z1 + 2], 2, { mat: mv }));
      // cueros clavados en las caras de adelante
      for (const z of [16, 52]) {
        const w = ancho(z + 14);
        ps.push(a.caja(0, w + 0.6, z, w * 1.5, 1.2, 26, { mat: q ? 'nie_quemado' : 'cuero', tono: (a.r() - 0.5) * 0.1 }));
        ps.push(a.caja(w + 0.6, 0, z, 1.2, w * 1.5, 26, { mat: q ? 'nie_quemado' : 'cuero', tono: (a.r() - 0.5) * 0.1 - 0.05 }));
      }
      for (const z of [30, 66]) { const w = ancho(z); ps.push(a.caja(w + 0.8, -6, z, 1, 2.4, 7, { mat: 'negro' }), a.caja(-6, w + 0.8, z, 2.4, 1, 7, { mat: 'negro' })); }
      // parapeto arriba con almenas
      const w = T + 1;
      for (let i = 0; i < 5; i++) {
        const u = -w + 2 + i * ((2 * w - 4) / 4);
        if (q && (i === 1 || i === 2)) continue;
        ps.push(a.caja(u, w - 1, z1, 5, 2.5, 10, { mat: mv }), a.caja(w - 1, u, z1, 2.5, 5, 10, { mat: mv }), a.caja(u, -w + 1, z1, 5, 2.5, 10, { mat: mv }), a.caja(-w + 1, u, z1, 2.5, 5, 10, { mat: mv }));
      }
      if (!q) ps.push(a.elipsoide(0, 0, z1 + 0.2, T * 0.7, T * 0.7, 1.2, { mat: N }));
      // puente levadizo en la cara +y del último piso
      const wz = ancho(86);
      if (v === 'abierta') {
        ps.push(a.caja(0, wz, 86, 22, 10, 28, { mat: m, resta: true }), a.caja(0, wz - 4, 86, 24, 2, 28, { mat: 'negro' }));
        ps.push(a.caja(0, wz + 14, 85, 22, 28, 2.4, { mat: mv }));
        for (const l of [-1, 1]) ps.push(a.palo([l * 11, wz + 0.5, 114], [l * 11, wz + 27, 87.4], 0.6, { mat: 'hierro' }));
      } else {
        ps.push(a.caja(0, wz + 1.6, 84, 24, 2.4, 30, { mat: mv, incl: 3 }));
        for (const l of [-1, 1]) ps.push(a.palo([l * 11, wz + 1, 118], [l * 11, wz + 3.5, 112], 0.6, { mat: 'hierro' }));
      }
      if (q) {
        for (let i = 0; i < 4; i++) ps.push(a.caja((a.r() - 0.5) * 20, B + 2, 20 + a.r() * 70, 6 + a.r() * 5, 6, 6 + a.r() * 6, { mat: m, resta: true }));
        for (let i = 0; i < 5; i++) ps.push(a.caja((a.r() - 0.3) * 40, B + 8 + a.r() * 14, 0, 14 + a.r() * 10, 2.5, 2.5, { mat: 'nie_quemado', giro: a.r() * 180 }));
      }
      nevado(a, ps, 34, 34, 5, 3);
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'nie_totem', nombre: ['Tótem tribal', 'Tribal totem pole'], tema: 'nieve', variantes: ['aguila', 'carnero', 'pintado'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      nevado(a, ps, 14, 12, 3, 3);
      for (let i = 0; i < 5; i++) { const t = (i / 5) * 2 * PI; ps.push(pena(a, Math.cos(t) * 7, Math.sin(t) * 7, 1.5, 3, 2.6, 2.6, { mat: 'nie_roca' })); }
      // cuatro tallas apiladas mirando a la cámara
      const g = 45, fx = Math.SQRT1_2, fy = Math.SQRT1_2, sx = -fy, sy = fx;
      const pint = v === 'pintado';
      for (let i = 0; i < 4; i++) {
        const z = i * 16, r = 6.4 - (i % 2) * 0.6;
        ps.push(a.cilindro(0, 0, z, r, 16, { mat: 'madera_vieja', r1: r - 0.4, tono: (a.r() - 0.5) * 0.08 }));
        if (pint) ps.push(a.cilindro(0, 0, z + 1, r + 0.2, 2.2, { mat: i % 2 ? 'tela_azul' : 'tela_roja' }));
        const F = (d: number, s: number, h: number): V3 => [fx * d + sx * s, fy * d + sy * s, z + h];
        for (const l of [-1, 1]) { const e = F(r - 0.6, l * 2.4, 10.5); ps.push(a.esfera(e[0], e[1], e[2], 1.6, { mat: pint ? 'hueso' : 'negro' })); if (pint) { const e2 = F(r - 0.1, l * 2.4, 10.5); ps.push(a.esfera(e2[0], e2[1], e2[2], 0.9, { mat: 'negro' })); } }
        const b = F(r - 0.2, 0, 12.6); ps.push(a.caja(b[0], b[1], b[2], 8, 2, 1.6, { mat: 'madera', giro: g + 90 }));
        ps.push(a.poliedro([F(r - 1, -1.5, 10.5), F(r - 1, 1.5, 10.5), F(r + 2, 0, 6.5), F(r - 1, -1.8, 6), F(r - 1, 1.8, 6)], { mat: 'madera', tono: 0.08 }));
        const bo = F(r - 0.8, 0, 2.5); ps.push(a.caja(bo[0], bo[1], bo[2], 6, 2.4, 2.2, { mat: pint ? 'tela_roja' : 'negro', giro: g + 90 }));
        if (i === 1) for (const l of [-1, 1]) ps.push(a.caja(sx * l * (r + 4), sy * l * (r + 4), z + 6, 9, 2, 4, { mat: 'madera_vieja', giro: g + 90, incl: l * -12, inclEje: 'x' }));
      }
      if (v === 'carnero') {
        calavera(a, ps, 0, 0, 64, 1.5, 45);
        for (const l of [-1, 1]) {
          let p: V3 = [sx * l * 3.5, sy * l * 3.5, 72];
          for (let k = 1; k <= 6; k++) { const t = (k / 6) * 1.6 * PI; const q: V3 = [sx * l * (4 + Math.sin(t) * 5 + k * 0.6) - fx * Math.sin(t) * 3, sy * l * (4 + Math.sin(t) * 5 + k * 0.6) - fy * Math.sin(t) * 3, 72 - Math.sin(t / 2) * 9 + Math.cos(t) * 3]; ps.push(a.palo(p, q, 2.2 - k * 0.2, { mat: 'hueso', tono: -0.06 })); p = q; }
        }
        ps.push(a.elipsoide(0, 0, 61, 9, 9, 5, { mat: 'nie_piel' }));
        for (let i = 0; i < 6; i++) { const t = (i / 6) * 2 * PI; ps.push(a.palo([Math.cos(t) * 7, Math.sin(t) * 7, 60], [Math.cos(t) * 8.5, Math.sin(t) * 8.5, 50 - a.r() * 4], 1.6, { mat: 'nie_piel', r1: 0.6 })); }
      } else {
        // ave con las alas abiertas
        ps.push(a.cilindro(0, 0, 64, 6, 8, { mat: 'madera_vieja', r1: 4 }), a.elipsoide(fx * 1, fy * 1, 76, 4.5, 4.5, 5, { mat: 'madera_vieja' }));
        ps.push(a.poliedro([[fx * 3.5 + sx * -1.6, fy * 3.5 + sy * -1.6, 77], [fx * 3.5 + sx * 1.6, fy * 3.5 + sy * 1.6, 77], [fx * 9, fy * 9, 73], [fx * 4, fy * 4, 73]], { mat: pint ? 'tela_roja' : 'madera', tono: 0.1 }));
        for (const l of [-1, 1]) {
          ps.push(a.poliedro([[sx * l * 3, sy * l * 3, 66], [sx * l * 3, sy * l * 3, 74], [sx * l * 22, sy * l * 22, 84], [sx * l * 20, sy * l * 20, 74], [sx * l * 12 - fx * 1.5, sy * l * 12 - fy * 1.5, 70], [sx * l * 12 + fx * 1.5, sy * l * 12 + fy * 1.5, 70]], { mat: 'madera_vieja', tono: pint ? 0 : -0.04 }));
          if (pint) ps.push(a.poliedro([[sx * l * 10 + fx * 1.6, sy * l * 10 + fy * 1.6, 72], [sx * l * 19 + fx * 1.2, sy * l * 19 + fy * 1.2, 80], [sx * l * 19 + fx * 1.2, sy * l * 19 + fy * 1.2, 76], [sx * l * 10 + fx * 0.6, sy * l * 10 + fy * 0.6, 70]], { mat: 'tela_azul' }));
        }
        ps.push(a.elipsoide(0, 0, 80, 3.6, 3.6, 1.6, { mat: N }));
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'nie_estandarte', nombre: ['Estandarte tribal', 'Tribal banner'], tema: 'nieve', variantes: ['rojo', 'piel', 'azul'], cuadros: 6, t: 3, huella: [2, 1], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      nevado(a, ps, 14, 10, 3, 2.5);
      const mat = v === 'rojo' ? 'tela_roja' : v === 'azul' ? 'tela_azul' : 'nie_piel';
      ps.push(a.palo([0, 0, 0], [0, 0, 84], 1.8, { mat: 'madera', r1: 1.4 }), a.caja(0, 0, 72, 34, 2.5, 2.5, { mat: 'madera_vieja' }));
      for (let i = 0; i < 4; i++) ps.push(pena(a, Math.cos(i * 1.6) * 4, Math.sin(i * 1.6) * 4, 1.5, 3, 3, 3, { mat: 'nie_roca' }));
      calavera(a, ps, 0, 0, 84, 1.1, 45);
      for (const l of [-1, 1]) ps.push(a.palo([-l * 2.5, l * 2.5, 90], [-l * 8, l * 8, 97], 1.8, { mat: 'hueso', r1: 0.5 }), a.palo([-l * 8, l * 8, 97], [-l * 8.5, l * 8.5, 103], 1.1, { mat: 'hueso', r1: 0.3 }));
      // la tela en tiras que ondulan con el viento (desplazadas en y, más abajo más)
      const ns = 8, fase = (f / 6) * 2 * PI;
      for (let i = 0; i < ns; i++) {
        const x = -14 + i * 4, largo = 34 - Math.abs(i - 3.5) * 1.2 + (i % 3) * 2 - (i === 2 || i === 6 ? 5 : 0);
        for (let k = 0; k < 3; k++) {
          const amp = (k + 0.5) * 1.6, y = Math.sin(fase + i * 0.7 + k * 0.6) * amp + 2;
          ps.push(a.caja(x, y, 72 - (largo * (k + 1)) / 3, 4.1, 1.2, largo / 3 + 0.8, { mat, tono: (k === 1 ? -0.03 : 0) + Math.sin(fase + i * 0.7) * 0.05 }));
        }
      }
      // emblema: un círculo de hueso en la tela
      const ye = Math.sin(fase + 2.8 + 0.6) * 2.4 + 2.8;
      ps.push(a.cilindro(-0.5, ye, 55, 5, 1, { mat: 'hueso', eje: [0, 1, 0], tono: -0.08 }), a.cilindro(-0.5, ye + 0.3, 55, 2.5, 1, { mat: mat, eje: [0, 1, 0] }));
      for (const l of [-1, 1]) ps.push(a.palo([l * 17, 0, 72], [l * 17 + Math.sin(fase) * 1.5, 2 + Math.sin(fase + 1) * 2, 60], 1.3, { mat: 'nie_piel', r1: 0.6 }));
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'nie_poste_calaveras', nombre: ['Poste de calaveras', 'Death pole with skulls'], tema: 'nieve', variantes: ['simple', 'cruz', 'pila'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      nevado(a, ps, 14, 12, 3, 2.5);
      const ix = (a.r() - 0.5) * 3, iy = (a.r() - 0.5) * 3;
      if (v === 'pila') {
        estaca(a, ps, [0, 0, 0], [ix, iy, 48], 2.2);
        const capas: [number, number, number][] = [[5, 6, 0], [3, 4.5, 7], [1, 0, 14]];
        for (const [n, rr, z] of capas) for (let i = 0; i < n; i++) { const t = (i / n) * 2 * PI + 0.4; calavera(a, ps, Math.cos(t) * rr, Math.sin(t) * rr, z, 1, 45 + (a.r() - 0.5) * 50); }
        calavera(a, ps, ix * 0.8, iy * 0.8, 34, 1, 45);
        for (let i = 0; i < 4; i++) { const t = a.r() * 2 * PI; ps.push(a.palo([Math.cos(t) * 8, Math.sin(t) * 8, 1.2], [Math.cos(t + 0.8) * 12, Math.sin(t + 0.8) * 12, 1.2], 1.1, { mat: 'hueso' })); }
      } else {
        estaca(a, ps, [0, 0, 0], [ix, iy, 66], 2.2);
        calavera(a, ps, ix * 0.85, iy * 0.85, 52, 1.1, 45);
        calavera(a, ps, ix * 0.6, iy * 0.6, 38, 1, 60);
        ps.push(a.cilindro(ix * 0.4, iy * 0.4, 24, 2.6, 4, { mat: 'cuerda' }));
        if (v === 'cruz') {
          ps.push(a.caja(ix * 0.7, iy * 0.7, 46, 34, 2.6, 2.6, { mat: 'madera_vieja', giro: -45 }));
          for (const l of [-1, 1]) {
            const x = ix * 0.7 + l * 11.3, y = iy * 0.7 - l * 11.3;
            ps.push(a.palo([x, y, 46], [x, y, 34], 0.5, { mat: 'cuerda' }));
            calavera(a, ps, x, y, 27, 0.95, 45 + l * 20);
          }
          ps.push(a.elipsoide(ix * 0.7, iy * 0.7, 48.5, 14, 2, 1, { mat: N, giro: -45 }));
        }
        for (let i = 0; i < 3; i++) ps.push(a.palo([0, 0, 22 - i * 3], [6 - i * 4, 8, 6 - i * 2], 0.9, { mat: 'hueso' }));
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'nie_hoguera', nombre: ['Hoguera de troncos', 'Burning log pile'], tema: 'nieve', variantes: ['pira', 'troncos'], cuadros: 6, t: 3, huella: [2, 2], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [a.elipsoide(0, 0, 0, 22, 20, 1.2, { mat: 'tierra' }), a.elipsoide(0, 0, 0, 12, 12, 1.8, { mat: 'nie_quemado' })];
      for (let i = 0; i < 10; i++) { const t = (i / 10) * 2 * PI; ps.push(pena(a, Math.cos(t) * 15, Math.sin(t) * 14, 1, 3.4, 3, 3, { mat: 'nie_roca' })); }
      let fz = 2, e = 1.6, cz = 16;
      if (v === 'pira') {
        for (let i = 0; i < 5; i++) { const t = (i / 5) * 2 * PI + 0.5 + a.r() * 0.3; ps.push(a.palo([Math.cos(t) * 13, Math.sin(t) * 12, 0], [Math.cos(t) * 3.5, Math.sin(t) * 3.5, 28 + a.r() * 5], 2.2, { mat: i % 2 ? 'corteza' : 'nie_quemado' })); }
        e = 3.4; cz = 24;
      } else {
        for (let k = 0; k < 3; k++) for (const l of [-1, 1]) {
          const z = 2.5 + k * 4.2;
          if (k % 2 === 0) ps.push(a.palo([-13, l * 6, z], [13, l * 6, z], 2.6, { mat: k === 2 ? 'nie_quemado' : 'corteza' }));
          else ps.push(a.palo([l * 6, -13, z], [l * 6, 13, z], 2.6, { mat: 'corteza' }));
        }
        fz = 6; e = 1.9;
      }
      ps.push(a.elipsoide(0, 0, fz, 7, 7, 3, { mat: 'fuego', tono: -0.1 }));
      llama(a, ps, 0, 0, fz, f, 6, e);
      llama(a, ps, 3, -2, fz + 1, (f + 3) % 6, 6, e * 0.6);
      llama(a, ps, -3, 3, fz, (f + 1) % 6, 6, e * 0.55);
      // chispas que suben
      for (let i = 0; i < 3; i++) { const h = ((f + i * 2) % 6) / 6; ps.push(a.esfera(Math.sin(i * 2.3 + f) * 4, Math.cos(i * 1.7) * 4, fz + 20 * e * 0.5 + h * 20, 0.9, { mat: 'fuego', tono: 0.2 - h * 0.3 })); }
      ps.push(suelo(a));
      return { piezas: ps, resplandor: { c: [0, 0, cz], r: 50, color: '#ff8a2a' } };
    },
  },
  {
    id: 'nie_pozo', nombre: ['Pozo helado', 'Frozen well'], tema: 'nieve', variantes: ['techo', 'sin_techo'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      nevado(a, ps, 22, 20, 4, 3);
      ps.push(a.cilindro(0, 0, 0, 13, 15, { mat: 'piedra_gris' }), a.cilindro(0, 0, 14, 13.6, 2, { mat: 'piedra_gris', tono: 0.05 }), a.cilindro(0, 0, 4, 9.6, 14, { mat: 'piedra_gris', resta: true }));
      if (v === 'sin_techo') ps.push(a.caja(9, 5, 9, 9, 12, 10, { mat: 'piedra_gris', giro: 30, resta: true }), pena(a, 18, 12, 2, 4, 3, 3, { mat: 'piedra_gris' }), pena(a, 14, 18, 1.5, 3, 3, 2.5, { mat: 'piedra_gris' }));
      ps.push(a.cilindro(0, 0, 4, 9.7, 8.5, { mat: 'hielo' }), a.caja(-2, 1, 12.4, 10, 0.8, 0.2, { mat: 'hielo', giro: 35, tono: 0.25 }));
      for (let i = 0; i < 6; i++) { const t = (i / 6) * 2 * PI + a.r(); if (v === 'sin_techo' && t % (2 * PI) < 1.2) continue; ps.push(a.elipsoide(Math.cos(t) * 11.5, Math.sin(t) * 11.5, 16, 4.5, 3, 1.6, { mat: N, giro: (t * 180) / PI + 90 })); }
      if (v === 'techo') {
        for (const l of [-1, 1]) ps.push(a.caja(l * 12, 0, 0, 3.5, 3.5, 44, { mat: 'madera' }));
        ps.push(a.cilindro(-12, 0, 30, 1.5, 24, { mat: 'madera_vieja', eje: [1, 0, 0] }), a.cilindro(-4, 0, 30, 2.4, 8, { mat: 'cuerda', eje: [1, 0, 0] }));
        ps.push(a.palo([1, 0, 28], [1, 0, 20], 0.5, { mat: 'cuerda' }), a.cilindro(1, 0, 15, 3, 5, { mat: 'madera', r1: 3.4 }), a.cilindro(1, 0, 18, 3.5, 0.8, { mat: 'hierro' }));
        ps.push(a.poliedro([[-17, -13, 40], [17, -13, 40], [-17, 13, 40], [17, 13, 40], [-17, 0, 52], [17, 0, 52]], { mat: 'madera_vieja' }));
        ps.push(a.poliedro([[-17.6, -9, 44], [17.6, -9, 44], [-17.6, 9, 44], [17.6, 9, 44], [-17.6, 0, 53.6], [17.6, 0, 53.6]], { mat: N }));
        for (let i = 0; i < 7; i++) { const x = -15 + i * 5 + (a.r() - 0.5) * 2; ps.push(a.cilindro(x, 13, 40 - 3 - a.r() * 5, 0.2, 3 + a.r() * 5, { mat: 'hielo', r1: 1.3 })); }
      } else {
        ps.push(a.cilindro(17, -4, 0, 3.2, 6, { mat: 'madera', r1: 3.6, eje: [0.2, 0.3, 0.93] }), a.palo([14, 2, 1], [20, 8, 1], 0.5, { mat: 'cuerda' }));
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'nie_jaula', nombre: ['Jaula de prisionero', 'Prisoner cage'], tema: 'nieve', variantes: ['prisionero', 'vacia', 'abierta'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      nevado(a, ps, 22, 20, 4, 2.5);
      const S = 13, H = 50;
      ps.push(a.caja(0, 0, 0, S * 2 + 4, S * 2 + 4, 4, { mat: 'madera' }));
      // barrotes en los cuatro lados (la puerta es el lado +y)
      const n = 5;
      for (let i = 0; i <= n; i++) {
        const u = -S + (i * 2 * S) / n;
        ps.push(a.palo([u, -S, 4], [u, -S, H], 0.9, { mat: 'hierro' }), a.palo([-S, u, 4], [-S, u, H], 0.9, { mat: 'hierro' }), a.palo([S, u, 4], [S, u, H], 0.9, { mat: 'hierro' }));
        if (v !== 'abierta') ps.push(a.palo([u, S, 4], [u, S, H], 0.9, { mat: 'hierro' }));
      }
      for (const z of [H - 2, 22]) {
        ps.push(a.caja(0, -S, z, S * 2 + 2, 2, 2, { mat: 'hierro_oxido' }), a.caja(-S, 0, z, 2, S * 2 + 2, 2, { mat: 'hierro_oxido' }), a.caja(S, 0, z, 2, S * 2 + 2, 2, { mat: 'hierro_oxido' }));
        if (v !== 'abierta') ps.push(a.caja(0, S, z, S * 2 + 2, 2, 2, { mat: 'hierro_oxido' }));
      }
      ps.push(a.caja(0, 0, H, S * 2 + 4, S * 2 + 4, 3, { mat: 'madera' }));
      for (let i = 0; i < 3; i++) ps.push(a.elipsoide(-6 + i * 5 + (a.r() - 0.5) * 3, (a.r() - 0.5) * 12, H + 3, 6 + a.r() * 3, 4 + a.r() * 2, 1.2, { mat: N, giro: a.r() * 180, tono: -0.08 }));
      ps.push(a.palo([0, 0, H + 3], [0, 0, H + 8], 0.7, { mat: 'hierro' }), a.cilindro(0, 0, H + 8, 2.2, 1, { mat: 'hierro', eje: [1, -1, 0] }));
      if (v === 'abierta') {
        // la puerta girada hacia afuera, colgando de la bisagra en x = -S
        const g = rad(65), dx = Math.cos(g), dy = Math.sin(g);
        for (let i = 0; i <= n; i++) { const d = (i * 2 * S) / n; ps.push(a.palo([-S + dx * d, S + dy * d, 4], [-S + dx * d, S + dy * d, H - 2], 0.9, { mat: 'hierro' })); }
        for (const z of [H - 4, 22]) ps.push(a.palo([-S, S, z], [-S + dx * 2 * S, S + dy * 2 * S, z], 1, { mat: 'hierro_oxido' }));
      } else {
        ps.push(a.caja(4, S + 0.8, 24, 3, 1.6, 4, { mat: 'hierro' }));
      }
      if (v === 'prisionero') {
        // figura sentada, encogida y con capucha
        ps.push(a.elipsoide(-3, -3, 10, 7, 6, 4, { mat: 'tela' }), a.elipsoide(-2, -2, 17, 6, 5.5, 9, { mat: 'tela', incl: -12 }));
        ps.push(a.elipsoide(0, 0, 27, 4, 4, 4.4, { mat: 'tela', tono: -0.06 }), a.esfera(1.8, 1.8, 26.5, 2.4, { mat: 'negro' }));
        for (const l of [-1, 1]) ps.push(a.palo([-1 + l * 3, 1 - l * 3, 8], [4 + l * 2.5, 4 - l * 2.5, 14], 2.4, { mat: 'tela', r1: 2 }), a.palo([4 + l * 2.5, 4 - l * 2.5, 14], [6 + l * 2.5, 6 - l * 2.5, 5], 2.2, { mat: 'tela', r1: 1.8 }));
        ps.push(a.palo([1, -2, 20], [5, 5, 15], 1.7, { mat: 'tela' }), a.palo([-2, 1, 20], [5, 5, 15], 1.7, { mat: 'tela' }));
        ps.push(a.caja(6, -6, 4, 6, 4, 1.4, { mat: 'madera_vieja', giro: 20 }), a.cilindro(-7, 7, 4, 2.4, 3, { mat: 'madera', r1: 2.8 }));
      } else if (v === 'vacia') {
        calavera(a, ps, 2, 0, 4, 1, 60);
        ps.push(a.palo([-6, -4, 5.2], [3, -8, 5.2], 1.1, { mat: 'hueso' }), a.caja(-4, 4, 4, 12, 8, 1.5, { mat: 'tela', giro: 30, tono: -0.1 }));
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'nie_trineo', nombre: ['Trineo', 'Sled'], tema: 'nieve', variantes: ['cargado', 'vacio', 'roto'], huella: [3, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const roto = v === 'roto';
      nevado(a, ps, 32, 18, 4, 2);
      for (const l of [-1, 1]) {
        const y = l * 9, cae = roto && l > 0 ? -3 : 0;
        ps.push(a.palo([-26, y, 1.2], [14, y, 1.2], 1.3, { mat: 'madera_lisa' }));
        if (!(roto && l > 0)) ps.push(a.palo([14, y, 1.2], [22, y, 4], 1.3, { mat: 'madera_lisa' }), a.palo([22, y, 4], [25, y, 10], 1.2, { mat: 'madera_lisa' }));
        else ps.push(a.palo([16, y + 6, 1], [24, y + 9, 1.3], 1.2, { mat: 'madera_lisa' }));
        for (const x of [-20, -6, 8]) ps.push(a.palo([x, y, 1.2], [x, y, 7 + cae * 0.3], 1, { mat: 'madera' }));
        ps.push(a.palo([-24, y, 1.2], [-27, y, 24], 1.1, { mat: 'madera' }));
      }
      ps.push(a.caja(-6, 0, 7, 36, 20, 2, { mat: 'madera', incl: roto ? 5 : 0 }), a.palo([-27, -9, 22], [-27, 9, 22], 1, { mat: 'madera' }));
      ps.push(a.palo([25, -9, 10], [25, 9, 10], 0.9, { mat: 'madera' }), a.palo([25, 0, 10], [40, 4, 4], 0.4, { mat: 'cuerda' }));
      if (v === 'cargado') {
        ps.push(a.elipsoide(-6, 0, 10, 16, 9.5, 2.5, { mat: 'nie_piel' }));
        ps.push(a.caja(-14, -2, 10, 10, 10, 9, { mat: 'madera_vieja', giro: 5 }), a.elipsoide(0, -3, 14, 6, 5, 5, { mat: 'cuero' }), a.elipsoide(3, 4, 13, 5, 4.5, 4.5, { mat: 'tela' }));
        ps.push(a.palo([-24, 7, 13], [8, 7, 13], 0.5, { mat: 'cuerda' }), a.palo([-14, -10, 9], [-14, 10, 19], 0.5, { mat: 'cuerda' }));
        ps.push(a.elipsoide(-12, -2, 19.5, 5, 4, 1.2, { mat: N }));
      }
      if (roto) {
        ps.push(a.caja(12, 18, 0, 10, 10, 9, { mat: 'madera_vieja', giro: 40, incl: 15 }), a.elipsoide(-4, 20, 2, 6, 5, 4, { mat: 'cuero' }), a.elipsoide(-18, 16, 0.5, 9, 6, 1.4, { mat: 'nie_piel', giro: 30 }));
      }
      ps.push(suelo(a));
      return ps;
    },
  },
  {
    id: 'nie_altar_antiguos', nombre: ['Altar de los antiguos', 'Altar of the ancients'], tema: 'nieve', variantes: ['dormido', 'despierto'], huella: [8, 8], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const vivo = v === 'despierto';
      nevado(a, ps, 70, 70, 6, 3);
      ps.push(a.cilindro(0, 0, 0, 60, 4, { mat: 'piedra_gris' }), a.cilindro(0, 0, 4, 50, 3, { mat: 'piedra_gris', tono: 0.04 }));
      if (vivo) for (let k = 0; k < 3; k++) { const t = rad(45 + k * 120); ps.push(a.caja(Math.cos(t) * 24, Math.sin(t) * 24, 6.9, 30, 1.6, 0.4, { mat: 'runa', giro: 45 + k * 120 })); }
      ps.push(a.cilindro(0, 0, 6.9, 30, 0.5, { mat: vivo ? 'runa' : 'piedra_gris', tono: vivo ? -0.1 : -0.12 }), a.cilindro(0, 0, 6.9, 28.5, 0.7, { mat: 'piedra_gris', tono: 0.04 }));
      // el altar del centro
      ps.push(a.caja(0, 0, 7, 18, 18, 14, { mat: 'nie_estatua', giro: 45 }), a.caja(0, 0, 21, 22, 22, 3, { mat: 'nie_estatua', giro: 45, tono: 0.05 }));
      ps.push(a.cilindro(0, 0, 24, 5, 1.2, { mat: vivo ? 'runa' : 'negro' }));
      ps.push(a.elipsoide(-4, -4, 24, 8, 6, 1.4, { mat: N, giro: 45 }));
      // tres estatuas mirando al centro: atrás, a la izquierda y a la derecha de la pantalla
      for (const [ang, arma] of [[225, 0], [135, 1], [315, 2]] as [number, number][]) {
        const t = rad(ang);
        estatua(a, ps, Math.cos(t) * 40, Math.sin(t) * 40, ang + 180, arma, vivo);
      }
      for (let i = 0; i < 7; i++) { const t = a.r() * 2 * PI, d = 52 + a.r() * 10; ps.push(pena(a, Math.cos(t) * d, Math.sin(t) * d, 1, 3 + a.r() * 3, 3, 2.5, { mat: 'piedra_gris' })); }
      ps.push(suelo(a));
      return vivo ? { piezas: ps, resplandor: { c: [0, 0, 30], r: 70, color: '#5ac8f0' } } : ps;
    },
  },
  {
    id: 'nie_armero', nombre: ['Armero en la nieve', 'Weapon rack in snow'], tema: 'nieve', variantes: ['lleno', 'medio', 'roto'], huella: [3, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      nevado(a, ps, 30, 16, 4, 3);
      const roto = v === 'roto';
      for (const l of [-1, 1]) {
        const x = l * 20;
        if (roto && l > 0) { ps.push(a.palo([x, -6, 0], [x - 2, 0, 14], 1.6, { mat: 'madera' }), a.palo([x + 4, 6, 1.5], [x + 16, 12, 1.5], 1.6, { mat: 'madera' })); continue; }
        ps.push(a.palo([x, -7, 0], [x, 1, 32], 1.6, { mat: 'madera' }), a.palo([x, 7, 0], [x, -1, 32], 1.6, { mat: 'madera' }));
      }
      if (roto) ps.push(a.palo([-21, 0, 30], [18, 4, 2], 1.5, { mat: 'madera_vieja' }));
      else ps.push(a.palo([-23, 0, 30], [23, 0, 30], 1.5, { mat: 'madera_vieja' }), a.palo([-21, 3, 7], [21, 3, 7], 1.2, { mat: 'madera_vieja' }), a.elipsoide(0, 0, 31.6, 20, 2, 1, { mat: N }));
      const lanza = (x: number, y0: number) => { ps.push(a.palo([x, y0, 0], [x + (a.r() - 0.5) * 2, -1, 44], 0.9, { mat: 'madera' })); ps.push(a.poliedro([[x - 1.6, -1.2, 44], [x + 1.6, -1.2, 44], [x, -0.8, 44], [x, -1.6, 44], [x, -1.4, 52]], { mat: 'acero' })); };
      const hacha = (x: number) => { ps.push(a.palo([x, 6, 0], [x, -0.5, 36], 1, { mat: 'madera' })); ps.push(a.poliedro([[x, -0.3, 34], [x, -0.3, 29], [x + 7, -1.2, 37], [x + 7, -0.4, 27], [x + 0.6, -0.3, 31.5], [x - 0.6, -0.3, 31.5]], { mat: 'hierro' })); };
      const espada = (x: number) => { ps.push(a.poliedro([[x - 1.6, 5.5, 2], [x + 1.6, 5.5, 2], [x, 5.8, 2], [x - 1.6, 1.2, 25], [x + 1.6, 1.2, 25], [x, 6, 0]], { mat: 'acero' }), a.caja(x, 1, 25, 8, 1.6, 1.6, { mat: 'hierro' }), a.palo([x, 1, 26.6], [x, 0.4, 32], 0.8, { mat: 'cuero' }), a.esfera(x, 0.3, 32.6, 1.3, { mat: 'hierro' })); };
      if (roto) {
        lanza(-14, 8); espada(-6);
        ps.push(a.palo([0, 12, 1], [24, 18, 1.5], 0.9, { mat: 'madera' }), a.cilindro(6, 20, 0, 8, 1.4, { mat: 'madera', tono: -0.05 }), a.cilindro(6, 20, 1.4, 2, 1.2, { mat: 'hierro' }));
      } else {
        const objs = v === 'lleno' ? [0, 1, 2, 0, 2, 1, 0] : [0, 2, 1];
        objs.forEach((o, i) => { const x = -15 + (i * 30) / (objs.length - 1); if (o === 0) lanza(x, 7); else if (o === 1) hacha(x); else espada(x); });
        ps.push(a.cilindro(25, 3, 9, 9, 1.8, { mat: 'madera', eje: [0.2, 0.25, 0.95], tono: -0.03 }), a.esfera(25.3, 3.4, 10.6, 2.4, { mat: 'hierro' }));
        if (v === 'lleno') ps.push(a.elipsoide(-24, 9, 2, 7, 5, 2.4, { mat: 'nie_piel' }));
      }
      ps.push(suelo(a));
      return ps;
    },
  },
);
