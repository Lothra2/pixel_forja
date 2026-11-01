import { registrar, type Arma, type Pieza } from '../objeto';
import { MATERIALES } from '../materiales';

/**
 * Campo y páramo: rocas, peñascos, menhires y mojones, riscos, ruinas de muros y cercas, el pozo viejo, restos de
 * huesos, el empalado envuelto, letreros, el puente del arroyo, el altar del bosque, estanques y charcos, la fogata
 * apagada, la rueda de carreta y el espantapájaros. Las rocas son cáscaras convexas de puntos al azar, así cada
 * semilla da una piedra distinta.
 */

MATERIALES.campo_ceniza = { rampa: ['#141312', '#22201e', '#33302d', '#45413d', '#58534e', '#6b655f'], ruido: 0.5, escala: 0.3 };
MATERIALES.campo_carbon = { rampa: ['#060505', '#0e0c0b', '#171412', '#211d1a', '#2c2723', '#38322d'], ruido: 0.5, escala: 0.4 };
MATERIALES.campo_liquen = { rampa: ['#2a2a1e', '#3f3f2c', '#56563b', '#6d6c4b', '#83815b'], ruido: 0.6, escala: 0.6 };

type V = [number, number, number];
const az = (a: Arma, k = 1) => (a.r() - 0.5) * 2 * k;
const mas = (a: V, b: V, k = 1): V => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];

/** Roca: cáscara convexa de un anillo de base y puntos al azar sobre medio elipsoide. Devuelve sus puntos. */
function roca(a: Arma, ps: Pieza[], x: number, y: number, z: number, rx: number, ry: number, rz: number, mat = 'roca', o: { giro?: number; tono?: number; n?: number } = {}): V[] {
  const g = ((o.giro ?? a.r() * 360) * Math.PI) / 180, cg = Math.cos(g), sg = Math.sin(g);
  const P = (lx: number, ly: number, lz: number): V => [x + lx * cg - ly * sg, y + lx * sg + ly * cg, z + lz];
  const pts: V[] = [];
  for (let i = 0; i < 6; i++) { const t = (i / 6) * 6.28 + az(a, 0.4), k = 0.8 + a.r() * 0.2; pts.push(P(Math.cos(t) * rx * k, Math.sin(t) * ry * k, 0)); }
  const n = o.n ?? 9;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * 6.28 * 2.618 + az(a, 0.5), u = 0.12 + a.r() * 0.88, k = Math.pow(1 - u * u, 0.3) * (0.78 + a.r() * 0.25);
    pts.push(P(Math.cos(t) * rx * k, Math.sin(t) * ry * k, rz * Math.pow(u, 0.75) * (0.85 + a.r() * 0.18)));
  }
  ps.push(a.poliedro(pts, { mat, tono: o.tono ?? az(a, 0.05) }));
  return pts;
}
/** Capa (musgo, nieve, liquen) sobre la parte alta de una roca: la cáscara de sus puntos altos un poco inflada. */
function capa(a: Arma, ps: Pieza[], pts: V[], mat: string, desde = 0.6, infla = 1.05) {
  const zmin = Math.min(...pts.map((p) => p[2])), zmax = Math.max(...pts.map((p) => p[2])), corte = zmin + (zmax - zmin) * desde;
  const c: V = [0, 0, 0];
  for (const p of pts) { c[0] += p[0] / pts.length; c[1] += p[1] / pts.length; }
  c[2] = zmin + (zmax - zmin) * 0.3;
  const alt = pts.filter((p) => p[2] >= corte).map((p) => mas(c, mas(p, c, -1), infla));
  if (alt.length < 4) return;
  // la capa no baja recta: un borde más bajo e irregular
  const extra = alt.slice(0, 3).map((p): V => [p[0] + az(a, 1), p[1] + az(a, 1), corte - (zmax - zmin) * 0.12 * a.r()]);
  ps.push(a.poliedro([...alt, ...extra], { mat, tono: az(a, 0.05) }));
}
/** Disco plano e irregular (agua, barro): un prisma bajo con borde de ruido, sin el bulto de un elipsoide. */
function disco(a: Arma, ps: Pieza[], x: number, y: number, z: number, rx: number, ry: number, h: number, mat: string, o: { giro?: number; tono?: number; ruido?: number; n?: number } = {}) {
  const g = ((o.giro ?? 0) * Math.PI) / 180, n = o.n ?? 14, pts: V[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * 6.28, k = 1 + az(a, o.ruido ?? 0.08), lx = Math.cos(t) * rx * k, ly = Math.sin(t) * ry * k;
    const px = x + lx * Math.cos(g) - ly * Math.sin(g), py = y + lx * Math.sin(g) + ly * Math.cos(g);
    pts.push([px, py, z], [x + (px - x) * 0.97, y + (py - y) * 0.97, z + h]);
  }
  ps.push(a.poliedro(pts, { mat, tono: o.tono }));
}
/** Hueso largo: palo con nudos en las puntas. */
function hueso(a: Arma, ps: Pieza[], p0: V, p1: V, r = 0.9) {
  ps.push(a.palo(p0, p1, r, { mat: 'hueso' }), a.esfera(p0[0], p0[1], p0[2], r * 1.5, { mat: 'hueso' }), a.esfera(p1[0], p1[1], p1[2], r * 1.5, { mat: 'hueso' }));
}
function craneo(a: Arma, ps: Pieza[], x: number, y: number, z: number, s = 1, giro = 0) {
  const g = (giro * Math.PI) / 180, fx = Math.cos(g), fy = Math.sin(g);
  ps.push(a.elipsoide(x, y, z, 3.6 * s, 3.1 * s, 3.2 * s, { mat: 'hueso', giro }));
  ps.push(a.caja(x + fx * 2.2 * s, y + fy * 2.2 * s, z - 3 * s, 3 * s, 4 * s, 2.6 * s, { mat: 'hueso', giro, tono: -0.05 }));
  for (const sd of [-1, 1]) ps.push(a.esfera(x + fx * 3 * s - fy * 1.3 * s * sd, y + fy * 3 * s + fx * 1.3 * s * sd, z - 0.2 * s, 1.1 * s, { mat: 'negro' }));
}
const fuegoVela = (a: Arma, ps: Pieza[], x: number, y: number, z: number, f: number, k: number) => {
  const h = 2.6 + Math.sin(f * 1.7 + k * 2.3) * 0.7;
  ps.push(a.cilindro(x, y, z, 0.25, 0.8, { mat: 'negro' }), a.elipsoide(x, y, z + 0.6 + h / 2, 0.9, 0.9, h / 2, { mat: 'luz_vela', tono: Math.sin(f + k) * 0.1 }));
};

// ------------------------------------------------------------------ piedras
registrar(
  {
    id: 'campo_roca', nombre: ['Roca', 'Rock'], tema: 'campo', variantes: ['a', 'b', 'c', 'd'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const mat = a.r() < 0.25 ? 'piedra' : 'roca';
      if (v === 'a') {
        const n = 3 + Math.floor(a.r() * 3);
        for (let i = 0; i < n; i++) { const g = a.r() * 6.28, d = a.r() * 7, s = 2.5 + a.r() * 3; roca(a, ps, Math.cos(g) * d, Math.sin(g) * d, -0.5, s, s * 0.8, s * 0.8, mat, { n: 6 }); }
        return ps;
      }
      const s = v === 'b' ? 8 : v === 'c' ? 11 : 15;
      ps.push(a.elipsoide(0, 0, 0, s * 1.3, s * 1.1, 1.2, { mat: 'tierra' }));
      const p = roca(a, ps, 0, 0, -1, s, s * (0.7 + a.r() * 0.3), s * (v === 'd' ? 1.6 : 1.05) * (0.8 + a.r() * 0.4), mat);
      if (v !== 'b' && a.r() < 0.6) capa(a, ps, p, 'musgo', 0.65);
      const k = v === 'b' ? 1 : 2;
      for (let i = 0; i < k; i++) { const g = a.r() * 6.28; roca(a, ps, Math.cos(g) * s * 1.1, Math.sin(g) * s * 1.1, -0.5, s * 0.35, s * 0.3, s * 0.35, mat, { n: 6 }); }
      return ps;
    },
  },
  {
    id: 'campo_penasco', nombre: ['Peñasco', 'Boulder'], tema: 'campo', variantes: ['liso', 'musgo', 'liquen', 'partido'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [a.elipsoide(0, 0, 0, 32, 28, 1.5, { mat: 'tierra', giro: a.r() * 180 })];
      const p = roca(a, ps, 0, 0, -2, 25 + a.r() * 5, 20 + a.r() * 5, 28 + a.r() * 10, 'roca', { n: 14 });
      if (v === 'musgo') capa(a, ps, p, 'musgo', 0.55, 1.04);
      if (v === 'liquen') for (let i = 0; i < 7; i++) { const g = a.r() * 1.6 - 0.1, z = 6 + a.r() * 24; ps.push(a.elipsoide(Math.cos(g) * 19, Math.sin(g) * 16, z, 3 + a.r() * 2, 3 + a.r() * 2, 2.5, { mat: 'campo_liquen' })); }
      if (v === 'partido') {
        const g = 30 + a.r() * 40;
        ps.push(a.caja(az(a, 4), 0, -3, 70, 4, 60, { mat: 'roca', giro: g, incl: az(a, 10), resta: true }));
        for (let i = 0; i < 3; i++) roca(a, ps, az(a, 6), az(a, 6), -1, 2 + a.r() * 2, 2, 2, 'roca', { n: 5 });
      }
      for (let i = 0; i < 4; i++) { const g = a.r() * 6.28, d = 24 + a.r() * 6, s = 2.5 + a.r() * 3; roca(a, ps, Math.cos(g) * d, Math.sin(g) * d, -0.5, s, s * 0.8, s * 0.8, 'roca', { n: 6 }); }
      return ps;
    },
  },
  {
    id: 'campo_menhir', nombre: ['Menhir', 'Standing stone'], tema: 'campo', variantes: ['alto', 'inclinado', 'caido', 'runas'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [a.elipsoide(0, 0, 0, 14, 12, 1.5, { mat: 'tierra' })];
      const H = 62 + a.r() * 18, w = 9 + a.r() * 2, d = 6 + a.r() * 1.5;
      // losa tosca que se afina hacia la punta
      let pts: V[] = [];
      for (const z of [0, H * 0.45, H * 0.85]) { const k = z === 0 ? 1 : z < H * 0.5 ? 0.95 : 0.75; for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) pts.push([sx * w * k + az(a, 1.2), sy * d * k + az(a, 1), z + az(a, z ? 2 : 0)]); }
      pts.push([az(a, 3), az(a, 2), H]);
      const g = a.r() * 0.6 - 0.3, cg = Math.cos(g), sg = Math.sin(g);
      pts = pts.map(([x, y, z]) => [x * cg - y * sg, x * sg + y * cg, z]);
      if (v === 'inclinado') { const t = (14 * Math.PI) / 180; pts = pts.map(([x, y, z]) => [x + z * Math.sin(t) * 0.7, y - z * Math.sin(t) * 0.7, z * Math.cos(t)]); }
      if (v === 'caido') {
        // tumbado a lo largo de x, medio hundido, y el muñón roto todavía en pie
        pts = pts.map(([x, y, z]): V => [z * 0.75 - 6, y, x * 0.8 + w * 0.55]);
        ps.push(a.poliedro([[-w, -d, 0], [w, -d, 0], [w, d, 0], [-w, d, 0], [-w + 1, -d + 1, 9], [w - 1, -d + 1, 13], [w, d - 1, 8], [-w + 2, d, 11]], { mat: 'piedra', tono: -0.03 }));
      }
      ps.push(a.poliedro(pts, { mat: 'piedra', tono: az(a, 0.04) }));
      // musgo en el pie y manchas de liquen
      ps.push(a.elipsoide(az(a, 3), az(a, 3), 1, w * 1.2, d * 1.4, 3, { mat: 'musgo', tono: -0.05 }));
      for (let i = 0; i < 3; i++) ps.push(a.elipsoide(w * 0.7 + az(a, 2), d * 0.9, 10 + a.r() * H * 0.5 * (v === 'caido' ? 0 : 1), 2.5, 1.5, 2.5, { mat: 'campo_liquen' }));
      if (v === 'runas') {
        // runas talladas en la cara de +y que brillan apenas
        for (let i = 0; i < 5; i++) {
          const z = 14 + i * 9, x = az(a, 2);
          ps.push(a.caja(x, d + 0.2, z, 1.3, 1, 5, { mat: 'runa', tono: -0.45 }), a.caja(x + 1.6, d + 0.2, z + 2 + az(a, 1.5), 3.2, 1, 1.2, { mat: 'runa', tono: -0.5, giro: 0 }));
        }
        return { piezas: ps, resplandor: { c: [0, d + 4, 34], r: 16, color: '#1a5a7a' } };
      }
      return ps;
    },
  },
  {
    id: 'campo_mojon', nombre: ['Mojón de piedras', 'Stone cairn'], tema: 'campo', variantes: ['chico', 'grande', 'derrumbado'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [a.elipsoide(0, 0, 0, 13, 11, 1.4, { mat: 'tierra' })];
      if (v === 'derrumbado') {
        for (let i = 0; i < 9; i++) { const g = a.r() * 6.28, d = a.r() * 12, s = 3 + a.r() * 3; roca(a, ps, Math.cos(g) * d, Math.sin(g) * d, -0.5, s, s * 0.8, s * 0.55, 'piedra_gris', { n: 6 }); }
        roca(a, ps, 0, 0, -0.5, 8, 7, 6, 'piedra_gris', { n: 7 });
        return ps;
      }
      const n = v === 'chico' ? 4 : 8;
      let z = -0.5, s = v === 'chico' ? 9 : 11, x = 0, y = 0;
      for (let i = 0; i < n; i++) {
        const h = s * (0.5 + a.r() * 0.15);
        roca(a, ps, x, y, z, s, s * (0.75 + a.r() * 0.2), h, 'piedra_gris', { n: 7 });
        z += h * 0.78; s *= 0.86; x += az(a, 1.2); y += az(a, 1.2);
      }
      if (v === 'grande') ps.push(a.palo([x, y, z - 2], [x + 1, y - 1, z + 22], 1.1, { mat: 'madera_vieja' }), a.caja(x + 1, y - 1, z + 12, 1, 5, 9, { mat: 'tela_roja', giro: 40, tono: -0.1 }));
      return ps;
    },
  },
);

registrar({
  id: 'campo_risco', nombre: ['Risco de roca', 'Rock outcrop'], tema: 'campo', variantes: ['x', 'y', 'pico'], huella: [5, 2], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    const along = v === 'y' ? 90 : 0;
    const R = (u: number, w: number): [number, number] => (v === 'y' ? [w, u] : [u, w]);
    const L = v === 'pico' ? 40 : 80, Hm = v === 'pico' ? 95 : 70;
    ps.push(a.elipsoide(0, 0, 0, ...(R(L * 0.65, 24) as [number, number]), 1.6, { mat: 'tierra' }));
    // estratos: bloques de roca escalonados que se angostan hacia arriba
    const capas = v === 'pico' ? 5 : 4;
    let z = -1;
    for (let k = 0; k < capas; k++) {
      const t = k / capas, n = v === 'pico' ? 2 : 3 - (k > 1 ? 1 : 0), h = (Hm / capas) * (1.1 + a.r() * 0.3);
      for (let i = 0; i < n; i++) {
        const u = (n === 1 ? 0 : (i / (n - 1) - 0.5) * L * (1 - t * 0.6)) + az(a, 6), w = az(a, 3) - t * 3;
        const [x, y] = R(u, w), ru = (L / n) * 0.7 * (1 - t * 0.35) + 6, rw = 18 * (1 - t * 0.45);
        const [rx, ry] = R(ru, rw);
        const p = roca(a, ps, x, y, z, rx, ry, h * 1.25, k % 2 ? 'roca' : 'piedra', { giro: along + az(a, 8), n: 10, tono: -t * 0.06 + az(a, 0.04) });
        if (k === capas - 1 && a.r() < 0.6) capa(a, ps, p, 'musgo', 0.75);
      }
      z += h;
    }
    // pedregal al pie
    for (let i = 0; i < 6; i++) { const u = az(a, L * 0.6), [x, y] = R(u, 16 + a.r() * 8), s = 2 + a.r() * 4; roca(a, ps, x, y, -0.5, s, s, s * 0.7, 'roca', { n: 6 }); }
    return ps;
  },
});

// ------------------------------------------------------------------ ruinas y madera
registrar(
  {
    id: 'campo_escombros', nombre: ['Escombros', 'Rubble'], tema: 'campo', variantes: ['piedra', 'con_vigas', 'ladrillo'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [a.elipsoide(0, 0, 0, 22, 18, 3, { mat: 'tierra', giro: a.r() * 180 })];
      const mat = v === 'ladrillo' ? 'ladrillo' : 'piedra_bloques';
      ps.push(a.elipsoide(0, 0, 0, 14, 12, 7, { mat: v === 'ladrillo' ? 'tierra' : 'piedra', tono: -0.1 }));
      const n = 16;
      for (let i = 0; i < n; i++) {
        const g = a.r() * 6.28, d = Math.sqrt(a.r()) * 17, z = Math.max(0, 7 - d * 0.45) - 1;
        const s = v === 'ladrillo' ? 1.15 : 1.2 + a.r() * 0.9;
        ps.push(a.caja(Math.cos(g) * d, Math.sin(g) * d, z, (v === 'ladrillo' ? 8 : 9) * s, (v === 'ladrillo' ? 4 : 6) * s, (v === 'ladrillo' ? 3.5 : 5) * s, { mat, giro: a.r() * 180, incl: az(a, 25), inclEje: a.r() < 0.5 ? 'x' : 'y', tono: az(a, 0.08) }));
      }
      if (v === 'con_vigas') {
        ps.push(a.caja(-4, 2, 3, 40, 4, 4, { mat: 'madera_vieja', giro: 25, incl: 14, inclEje: 'y' }), a.caja(4, -5, 1, 30, 3.5, 3.5, { mat: 'madera_vieja', giro: -50, incl: -8, inclEje: 'y', tono: -0.1 }));
        ps.push(a.caja(8, 6, 5, 22, 3, 3, { mat: 'campo_carbon', giro: 70, incl: 20, inclEje: 'y' }));
      }
      return ps;
    },
  },
  {
    id: 'campo_muro_ruina', nombre: ['Muro en ruinas', 'Ruined wall'], tema: 'campo', variantes: ['x', 'y', 'esquina', 'bajo'], huella: [5, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const tramo = (ox: number, oy: number, eje: 'x' | 'y', L: number, Hmax: number, alto0: boolean) => {
        const P = (u: number, w: number): [number, number] => (eje === 'x' ? [ox + u, oy + w] : [ox + w, oy + u]);
        const n = 8, paso = L / n, T = 12;
        let h = alto0 ? Hmax : Hmax * 0.4;
        const hs: number[] = [];
        for (let i = 0; i < n; i++) { hs.push(h); h = Math.max(Hmax * 0.12, Math.min(Hmax, h + (alto0 ? -1 : 1) * Hmax * (0.05 + a.r() * 0.2) + az(a, Hmax * 0.12))); }
        if (!alto0) hs.reverse();
        for (let i = 0; i < n; i++) {
          const u = -L / 2 + paso * (i + 0.5), [x, y] = P(u, 0);
          ps.push(a.caja(x, y, 0, eje === 'x' ? paso + 0.02 : T, eje === 'x' ? T : paso + 0.02, hs[i], { mat: 'piedra_bloques' }));
          // bloque suelto y musgo arriba
          if (a.r() < 0.5) ps.push(a.caja(x + az(a, 2), y + az(a, 2), hs[i], eje === 'x' ? paso * 0.8 : T * 0.8, eje === 'x' ? T * 0.8 : paso * 0.8, 3 + a.r() * 3, { mat: 'piedra_bloques', giro: az(a, 12), tono: 0.03 }));
          if (a.r() < 0.45) ps.push(a.elipsoide(x, y, hs[i], paso * 0.6, T * 0.55, 2.2, { mat: 'musgo', giro: eje === 'x' ? 0 : 90 }));
        }
        // zócalo y musgo al pie
        const [bx, by] = P(0, 0);
        ps.push(a.caja(bx, by, 0, eje === 'x' ? L + 3 : T + 3, eje === 'x' ? T + 3 : L + 3, 5, { mat: 'piedra_musgo', tono: -0.05 }));
        // una tronera en la parte alta
        const im = hs.indexOf(Math.max(...hs));
        if (hs[im] > 50) { const [wx, wy] = P(-L / 2 + paso * (im + 0.5), 0); ps.push(a.caja(wx, wy, hs[im] - 30, eje === 'x' ? 4 : T + 4, eje === 'x' ? T + 4 : 4, 14, { mat: 'piedra', resta: true })); }
        // grietas
        for (let k = 0; k < 2; k++) { const [cx, cy] = P(az(a, L * 0.3), 0); ps.push(a.caja(cx, cy, 8 + a.r() * 20, eje === 'x' ? 1.2 : T + 1, eje === 'x' ? T + 1 : 1.2, 12, { mat: 'piedra', resta: true, giro: az(a, 3) })); }
        // piedras caídas a los lados
        for (let k = 0; k < 5; k++) { const [cx, cy] = P(az(a, L * 0.5), (a.r() < 0.5 ? -1 : 1) * (T / 2 + 3 + a.r() * 8)); ps.push(a.caja(cx, cy, 0, 7, 5, 4.5, { mat: 'piedra_bloques', giro: a.r() * 180, incl: az(a, 15), tono: az(a, 0.06) })); }
      };
      const H = v === 'bajo' ? 32 : 80 + a.r() * 30;
      if (v === 'x') tramo(0, 0, 'x', 80, H, a.r() < 0.5);
      else if (v === 'y') tramo(0, 0, 'y', 80, H, a.r() < 0.5);
      else if (v === 'bajo') tramo(0, 0, 'x', 80, H, true);
      else {
        // esquina: el tramo en x arranca alto en la esquina y el de y también
        tramo(-34, 6, 'x', 68, H, true);
        tramo(6, -34, 'y', 68, H * 0.9, true);
        ps.push(a.caja(-6, -6, 0, 16, 16, H * 0.92, { mat: 'piedra_bloques', tono: 0.04 }), a.caja(-5, -7, H * 0.92, 12, 10, 5, { mat: 'piedra_bloques', giro: 12, tono: 0.06 }));
      }
      return ps;
    },
  },
  {
    id: 'campo_cerca_rota', nombre: ['Cerca rota', 'Broken fence'], tema: 'campo', variantes: ['x', 'y', 'caida'], huella: [4, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const ey = v === 'y';
      const P = (u: number, w: number): [number, number] => (ey ? [w, u] : [u, w]);
      const n = 4, L = 64, paso = L / (n - 1);
      const postes: [number, number, number][] = [];
      for (let i = 0; i < n; i++) {
        const u = -L / 2 + i * paso, [x, y] = P(u, az(a, 1));
        const cae = v === 'caida' ? (i === 1 || i === 2 ? 1 : 0.35) : i === n - 1 ? 0.6 : 0.15;
        const inc = az(a, 12) * cae + (v === 'caida' && i === 2 ? 55 : 0);
        const h = 26 + a.r() * 4 - (i === n - 1 ? 8 : 0);
        ps.push(a.caja(x, y, 0, 3.2, 3.2, h, { mat: 'madera_vieja', incl: inc, inclEje: ey ? 'x' : 'y', giro: az(a, 6) }));
        ps.push(a.elipsoide(x, y, 0, 4, 4, 1.5, { mat: 'tierra' }));
        postes.push([x, y, h]);
      }
      // travesaños: algunos enteros, uno partido colgando y uno en el piso
      for (let i = 0; i < n - 1; i++) {
        for (const z of [10, 20]) {
          const [x0, y0] = P(-L / 2 + i * paso, 1.8), [x1, y1] = P(-L / 2 + (i + 1) * paso, 1.8);
          const roto = v === 'caida' ? a.r() < 0.75 : a.r() < 0.3;
          if (!roto) ps.push(a.palo([x0, y0, z + az(a, 1)], [x1, y1, z + az(a, 1.5)], 1.4, { mat: 'madera_vieja' }));
          else if (a.r() < 0.5) {
            const m: V = [(x0 + x1) / 2 + az(a, 3), (y0 + y1) / 2 + az(a, 3), z - 4];
            ps.push(a.palo([x0, y0, z], [m[0], m[1], z - 6 - a.r() * 4], 1.4, { mat: 'madera_vieja' }));
          } else {
            const [gx, gy] = P(-L / 2 + (i + 0.5) * paso + az(a, 4), 6 + a.r() * 5);
            ps.push(a.caja(gx, gy, 0, ey ? 2.6 : paso * 0.8, ey ? paso * 0.8 : 2.6, 2.4, { mat: 'madera_vieja', giro: az(a, 15), tono: -0.05 }));
          }
        }
      }
      for (let i = 0; i < 4; i++) { const [x, y] = P(az(a, L * 0.5), az(a, 6)); ps.push(a.elipsoide(x, y, 1, 4, 3, 3, { mat: 'pasto', tono: az(a, 0.06) })); }
      return ps;
    },
  },
  {
    id: 'campo_pozo', nombre: ['Pozo viejo', 'Old well'], tema: 'campo', variantes: ['techo', 'roto', 'seco'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [a.elipsoide(0, 0, 0, 22, 20, 1.6, { mat: 'tierra' })];
      ps.push(a.cilindro(0, 0, 0, 14, 15, { mat: 'piedra_bloques', r1: 13.5 }));
      ps.push(a.cilindro(0, 0, 15, 14.5, 2.5, { mat: 'piedra_gris' }));
      ps.push(a.cilindro(0, 0, 3, 10, 20, { mat: 'piedra', resta: true }));
      ps.push(a.cilindro(0, 0, 3, 10, 7, { mat: v === 'seco' ? 'tierra' : 'negro' }));
      if (v !== 'seco') ps.push(a.cilindro(0, 0, 10, 10, 0.4, { mat: 'agua_sucia', tono: -0.1 }));
      ps.push(a.elipsoide(10, 8, 2, 6, 4, 4, { mat: 'musgo' }));
      for (let i = 0; i < 3; i++) { const g = a.r() * 6.28; ps.push(a.caja(Math.cos(g) * 18, Math.sin(g) * 18, 0, 6, 4, 3.5, { mat: 'piedra_bloques', giro: a.r() * 180 })); }
      const roto = v === 'roto';
      // armazón: dos postes sobre el eje y, travesaño con la manivela, techo de dos aguas
      const H = 42;
      ps.push(a.caja(0, -14, 14, 3.5, 3.5, H - 14, { mat: 'madera_vieja' }));
      if (!roto) ps.push(a.caja(0, 14, 14, 3.5, 3.5, H - 14, { mat: 'madera_vieja' }));
      else ps.push(a.caja(0, 14, 14, 3.5, 3.5, 12, { mat: 'madera_vieja' }), a.caja(18, 20, 0, 3.5, 3.5, H - 14, { mat: 'madera_vieja', giro: 30, incl: 84, inclEje: 'y' }));
      if (!roto) {
        ps.push(a.cilindro(0, -16, 34, 2, 32, { mat: 'madera', eje: [0, 1, 0] }), a.palo([0, 17, 34], [4, 18, 31], 0.8, { mat: 'hierro' }));
        ps.push(a.palo([0, 0, 34], [0, 0, 22], 0.6, { mat: 'cuerda' }), a.cilindro(0, 0, 16, 3, 6, { mat: 'madera', r1: 3.5 }), a.cilindro(0, 0, 18, 3.2, 1, { mat: 'hierro' }));
        if (v === 'techo') {
          const z0 = H, w = 13, L = 20;
          ps.push(a.poliedro([[-w, -L, z0], [w, -L, z0], [-w, L, z0], [w, L, z0], [0, -L, z0 + 11], [0, L, z0 + 11]], { mat: 'madera_vieja', tono: -0.05 }));
          ps.push(a.poliedro([[-w - 1, -L - 1, z0 + 1], [-w - 1, L + 1, z0 + 1], [0, -L - 1, z0 + 12], [0, L + 1, z0 + 12], [-w - 1, -L - 1, z0 - 0.5], [-w - 1, L + 1, z0 - 0.5]], { mat: 'teja', tono: -0.05 }));
          ps.push(a.poliedro([[w + 1, -L - 1, z0 + 1], [w + 1, L + 1, z0 + 1], [0, -L - 1, z0 + 12], [0, L + 1, z0 + 12], [w + 1, -L - 1, z0 - 0.5], [w + 1, L + 1, z0 - 0.5]], { mat: 'teja' }));
          ps.push(a.caja(3, 4, z0 + 4, 7, 5, 1, { mat: 'negro', giro: 0, incl: -40, inclEje: 'x', resta: true }));
        } else ps.push(a.caja(0, 0, H - 1, 4, 32, 3, { mat: 'madera_vieja' }));
      } else ps.push(a.caja(14, -4, 0, 4, 30, 3, { mat: 'madera_vieja', giro: 20 }), a.cilindro(-16, 10, 0, 3.5, 6, { mat: 'madera', r1: 3, eje: [1, 0.4, 0.2] }));
      return ps;
    },
  },
);

// ------------------------------------------------------------------ restos y muertos
registrar(
  {
    id: 'campo_esqueleto', nombre: ['Restos de esqueleto', 'Skeleton remains'], tema: 'campo', variantes: ['tendido', 'disperso', 'con_armadura'], huella: [3, 1], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [a.elipsoide(0, 0, 0, 30, 12, 1, { mat: 'tierra', tono: -0.05 })];
      if (v === 'disperso') {
        craneo(a, ps, -14 + az(a, 4), az(a, 5), 3, 1, a.r() * 360);
        for (let i = 0; i < 8; i++) { const x = az(a, 24), y = az(a, 8), g = a.r() * 6.28, l = 4 + a.r() * 8; hueso(a, ps, [x, y, 1], [x + Math.cos(g) * l, y + Math.sin(g) * l, 1 + a.r()], 0.85); }
        for (let i = 0; i < 4; i++) { const x = az(a, 10), y = az(a, 6); ps.push(a.palo([x, y, 1], [x + 2, y + 5, 3.5], 0.7, { mat: 'hueso' }), a.palo([x + 2, y + 5, 3.5], [x + 5, y + 7, 1], 0.7, { mat: 'hueso' })); }
        return ps;
      }
      // tendido boca arriba a lo largo de x: cabeza en -x
      const hx = -24;
      craneo(a, ps, hx, 0, 3.2, 1, 180 + az(a, 25));
      ps.push(a.palo([hx + 3, 0, 2], [3, 0, 2], 1.1, { mat: 'hueso' }));
      for (let i = 0; i < 5; i++) {
        const x = hx + 7 + i * 2.6, w = 5.5 - Math.abs(i - 1.5) * 0.6;
        for (const s of [-1, 1]) { ps.push(a.palo([x, 0, 2.5], [x + 0.5, s * w * 0.8, 5], 0.7, { mat: 'hueso' }), a.palo([x + 0.5, s * w * 0.8, 5], [x + 1.3, s * w, 1.2], 0.7, { mat: 'hueso' })); }
      }
      ps.push(a.elipsoide(4, 0, 2, 3, 5, 2, { mat: 'hueso' }));
      // brazos y piernas, alguno corrido
      for (const s of [-1, 1]) {
        const sh: V = [hx + 6, s * 6, 1.5], co: V = [hx + 14 + az(a, 2), s * (8 + a.r() * 3), 1.2], mu: V = [hx + 22 + az(a, 3), s * (6 + a.r() * 6), 1.2];
        hueso(a, ps, sh, co, 0.85); hueso(a, ps, co, mu, 0.75);
        const ca: V = [5, s * 3, 1.5], ro: V = [16 + az(a, 2), s * (4 + a.r() * 3), 1.4], pi: V = [27 + az(a, 2), s * (4 + a.r() * 5), 1.2];
        hueso(a, ps, ca, ro, 1); hueso(a, ps, ro, pi, 0.85);
        ps.push(a.caja(pi[0] + 2, pi[1], 0, 4, 2.4, 1.4, { mat: 'hueso', tono: -0.08 }));
      }
      if (v === 'con_armadura') {
        ps.push(a.elipsoide(hx, 0, 4, 4.4, 4, 3.6, { mat: 'hierro_oxido' }), a.caja(hx, 0, 1, 9.5, 9, 1, { mat: 'hierro_oxido', tono: -0.1 }));
        ps.push(a.elipsoide(hx + 12, 0, 2, 7, 7, 4.5, { mat: 'hierro_oxido', tono: 0.05 }));
        ps.push(a.caja(hx + 18, 12, 0.5, 34, 2.6, 1, { mat: 'hierro_oxido', giro: -8 }), a.caja(hx + 2, 14, 0.5, 2, 9, 1.6, { mat: 'hierro_oxido', giro: -8 }), a.cilindro(hx - 3, 14.5, 0.5, 1.4, 1.6, { mat: 'cuero' }));
        ps.push(a.cilindro(14, -14, 0, 8, 2, { mat: 'madera_vieja' }), a.cilindro(14, -14, 2, 2.2, 1.4, { mat: 'hierro_oxido' }));
      }
      return ps;
    },
  },
  {
    id: 'campo_craneo_animal', nombre: ['Cráneo de animal', 'Animal skull'], tema: 'campo', variantes: ['vaca', 'carnero', 'ciervo'], huella: [1, 1], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [a.elipsoide(0, 0, 0, 13, 11, 1.2, { mat: 'tierra' })];
      for (let i = 0; i < 3; i++) { const g = a.r() * 6.28; ps.push(a.elipsoide(Math.cos(g) * 9, Math.sin(g) * 8, 1, 3, 2.5, 2.5, { mat: 'paja', tono: -0.1 })); }
      // cráneo largo mirando hacia +x (hacia la cámara, abajo a la derecha)
      const g = 25 + az(a, 25), gr = (g * Math.PI) / 180, fx = Math.cos(gr), fy = Math.sin(gr), px = -fy, py = fx;
      ps.push(a.elipsoide(-fx * 2, -fy * 2, 4.2, 5, 4.2, 3.8, { mat: 'hueso', giro: g }));
      ps.push(a.palo([0, 0, 3.5], [fx * 10, fy * 10, 2], 2.8, { mat: 'hueso', r1: 1.8 }));
      for (const s of [-1, 1]) ps.push(a.esfera(fx * 1.5 + px * s * 2.6, fy * 1.5 + py * s * 2.6, 5, 1.2, { mat: 'negro' }));
      ps.push(a.caja(fx * 9.5, fy * 9.5, 1.5, 2, 2.4, 1.4, { mat: 'negro', giro: g }));
      const base = (s: number): V => [-fx * 4 + px * s * 3.5, -fy * 4 + py * s * 3.5, 6.5];
      for (const s of [-1, 1]) {
        const b = base(s);
        if (v === 'vaca') {
          const m = mas(b, [px * s * 6 - fx * 1, py * s * 6 - fy * 1, 1.5]), t = mas(m, [px * s * 2 + fx * 2, py * s * 2 + fy * 2, 5]);
          ps.push(a.palo(b, m, 1.6, { mat: 'hueso', r1: 1.2, tono: -0.12 }), a.palo(m, t, 1.2, { mat: 'hueso', r1: 0.3, tono: -0.12 }));
        } else if (v === 'carnero') {
          // cuerno enrollado: espiral hacia atrás y abajo
          let p = b;
          for (let k = 1; k <= 6; k++) {
            const t = (k / 6) * 5.2, R = 4.5 - k * 0.45;
            const q: V = [b[0] + px * s * (1.5 + k * 0.4) - fx * Math.sin(t) * R, b[1] + py * s * (1.5 + k * 0.4) - fy * Math.sin(t) * R, b[2] - 2 + Math.cos(t) * R];
            ps.push(a.palo(p, q, 1.8 - k * 0.2, { mat: 'hueso', r1: 1.6 - k * 0.2, tono: -0.18 }));
            p = q;
          }
        } else {
          // astas ramificadas
          const m = mas(b, [px * s * 4 - fx * 2, py * s * 4 - fy * 2, 9]), t = mas(m, [px * s * 3 - fx * 3, py * s * 3 - fy * 3, 9]);
          ps.push(a.palo(b, m, 1.1, { mat: 'hueso', r1: 0.9, tono: -0.1 }), a.palo(m, t, 0.9, { mat: 'hueso', r1: 0.4, tono: -0.1 }));
          ps.push(a.palo(m, mas(m, [fx * 3 + px * s, fy * 3 + py * s, 5]), 0.7, { mat: 'hueso', r1: 0.3, tono: -0.1 }));
          const q = mas(b, mas(m, b, -1), 0.5);
          ps.push(a.palo(q, mas(q, [fx * 3, fy * 3, 4]), 0.7, { mat: 'hueso', r1: 0.3, tono: -0.1 }));
          ps.push(a.palo(t, mas(t, [px * s * 3, py * s * 3, 3]), 0.6, { mat: 'hueso', r1: 0.3, tono: -0.1 }), a.palo(t, mas(t, [-fx * 3, -fy * 3, 3]), 0.6, { mat: 'hueso', r1: 0.3, tono: -0.1 }));
        }
      }
      return ps;
    },
  },
  {
    id: 'campo_empalado', nombre: ['Empalado envuelto', 'Wrapped body on a stake'], tema: 'campo', variantes: ['envuelto', 'ensangrentado', 'solo_estaca'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [a.elipsoide(0, 0, 0, 12, 10, 1.8, { mat: 'tierra' })];
      for (let i = 0; i < 4; i++) { const g = (i / 4) * 6.28 + a.r(); ps.push(a.caja(Math.cos(g) * 5, Math.sin(g) * 5, 0, 5, 3.5, 3, { mat: 'piedra', giro: a.r() * 180, incl: 20 })); }
      const inc = az(a, 0.06), H = v === 'solo_estaca' ? 58 : 78;
      const top: V = [inc * H, -Math.abs(inc) * H * 0.5, H];
      ps.push(a.palo([0, 0, 0], top, 2.3, { mat: 'madera_vieja', r1: 1.6 }), a.cilindro(top[0], top[1], top[2], 1.6, 4, { mat: 'madera_vieja', r1: 0 }));
      const at = (z: number): V => [(top[0] * z) / H, (top[1] * z) / H, z];
      if (v === 'solo_estaca') {
        const c = at(H - 1);
        craneo(a, ps, c[0], c[1], c[2] + 2, 1.1, 30);
        ps.push(a.caja(c[0] + 1, c[1] + 2, H - 22, 5, 1, 16, { mat: 'tela', giro: 20, incl: 6, tono: -0.1 }), a.caja(c[0] - 1, c[1] + 2, H - 16, 3, 1, 10, { mat: 'tela', giro: -30, incl: -8, tono: -0.15 }));
        ps.push(a.palo(at(H - 6), mas(at(H - 6), [0.5, 2, -12]), 0.6, { mat: 'cuerda' }));
        return ps;
      }
      // el cuerpo envuelto en tela atado con sogas: un bulto largo con la forma de la cabeza
      const c = at(42), cab = at(66);
      ps.push(a.elipsoide(c[0] + 2.5, c[1] + 2.5, 30, 5, 4.5, 10, { mat: 'tela', tono: -0.08 }));
      ps.push(a.elipsoide(c[0] + 3, c[1] + 3, 46, 6.5, 5.5, 13, { mat: 'tela', tono: -0.06 }));
      ps.push(a.elipsoide(cab[0] + 3, cab[1] + 3, 64, 4.3, 4, 5.2, { mat: 'tela', tono: 0.04 }));
      ps.push(a.elipsoide(c[0] + 6.5, c[1] + 6.5, 50, 2.8, 2.6, 7, { mat: 'tela', tono: -0.03 }), a.elipsoide(c[0] - 1, c[1] + 7.5, 50, 2.8, 2.6, 7, { mat: 'tela', tono: -0.06 }));
      for (const [z, r] of [[24, 4.4], [36, 5.6], [48, 6.6], [59, 3.6], [62, 4.2]] as [number, number][]) ps.push(a.cilindro(c[0] + 3, c[1] + 3, z, r, 1.3, { mat: 'cuerda', incl: az(a, 8), tono: -0.2 }));
      ps.push(a.palo([c[0] + 6, c[1] + 6, 48], [c[0] + 9, c[1] + 6, 40], 0.6, { mat: 'cuerda' }), a.caja(c[0] + 4, c[1] + 6, 17, 4, 1, 8, { mat: 'tela', giro: 45, incl: 10, tono: -0.12 }));
      if (v === 'ensangrentado') {
        for (const [z, dx] of [[52, 2], [40, 4], [30, 1]]) ps.push(a.elipsoide(c[0] + 5 + dx * 0.3, c[1] + 6 + dx * 0.3, z, 3, 1.5, 4, { mat: 'sangre' }));
        ps.push(a.elipsoide(5, 5, 0.6, 7, 5, 0.6, { mat: 'sangre' }), a.palo(at(14), [4, 4, 1], 0.7, { mat: 'sangre' }));
      }
      return ps;
    },
  },
);

// ------------------------------------------------------------------ obras del camino
registrar(
  {
    id: 'campo_letrero', nombre: ['Poste indicador', 'Wooden signpost'], tema: 'campo', variantes: ['dos', 'tres', 'roto'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [a.elipsoide(0, 0, 0, 8, 7, 1.4, { mat: 'tierra' })];
      const roto = v === 'roto';
      const H = 52;
      ps.push(a.caja(0, 0, 0, 3.4, 3.4, roto ? 30 : H, { mat: 'madera_vieja', incl: roto ? 8 : az(a, 3) }));
      if (!roto) ps.push(a.poliedro([[-2, -2, H], [2, -2, H], [2, 2, H], [-2, 2, H], [0, 0, H + 3]], { mat: 'madera_vieja' }));
      const flecha = (z: number, giro: number, L: number, caida = false) => {
        const g = (giro * Math.PI) / 180, fx = Math.cos(g), fy = Math.sin(g), px = -fy, py = fx, h = 3.4, t = 0.9;
        const o: V = caida ? [10, 8, 1] : [fx * 2, fy * 2, z];
        const pts: V[] = [];
        const mk = (u: number, w: number, s: number): V => caida ? [o[0] + fx * u + px * s, o[1] + fy * u + py * s, o[2] + w * 0.25 + 0.9] : [o[0] + fx * u + px * s, o[1] + fy * u + py * s, o[2] + w];
        for (const s of [-t, t]) { pts.push(mk(0, -h, s), mk(L, -h, s), mk(L + 4, 0, s), mk(L, h, s), mk(0, h, s)); }
        ps.push(a.poliedro(pts, { mat: 'madera', tono: az(a, 0.06) }));
        // letras talladas
        for (let k = 0; k < 3; k++) ps.push(a.caja(o[0] + fx * (3 + k * 4) + px * t * 1.05, o[1] + fy * (3 + k * 4) + py * t * 1.05, (caida ? o[2] + 1 : z - 1.2), 2.2, 0.4, caida ? 0.3 : 2.4, { mat: 'negro', giro, tono: 0.1 }));
      };
      if (v === 'dos') { flecha(44, -35 + az(a, 10), 18); flecha(36, 145 + az(a, 10), 16); }
      else if (v === 'tres') { flecha(46, -40 + az(a, 8), 18); flecha(39, 60 + az(a, 8), 15); flecha(32, 160 + az(a, 8), 17); }
      else { flecha(25, -20, 16); flecha(0, 40, 17, true); ps.push(a.caja(-6, 10, 0, 3.4, 3.4, 22, { mat: 'madera_vieja', giro: 30, incl: 88, inclEje: 'y' })); }
      return ps;
    },
  },
  {
    id: 'campo_puente', nombre: ['Puentecito sobre el arroyo', 'Small creek bridge'], tema: 'campo', variantes: ['x', 'y', 'roto'], cuadros: 4, t: 3, huella: [5, 3], bloquea: false,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const ey = v === 'y';
      const P = (u: number, w: number): [number, number] => (ey ? [w, u] : [u, w]);
      // el arroyo corre de través al puente
      const [ax, ay] = P(0, 0);
      ps.push(a.elipsoide(ax, ay, -1, ey ? 50 : 22, ey ? 22 : 50, 2, { mat: 'tierra', tono: -0.08 }));
      disco(a, ps, ax, ay, -0.5, ey ? 48 : 14, ey ? 14 : 48, 1.4, 'agua', { tono: -0.2, ruido: 0.05, n: 18 });
      for (let k = 0; k < 5; k++) {
        const w = ((f / 4 + k / 5) % 1) * 84 - 42, u = az(a, 9);
        const [x, y] = P(u, w);
        ps.push(a.elipsoide(x, y, 1, ey ? 4 : 1.2, ey ? 1.2 : 4, 0.4, { mat: 'agua', tono: 0.15 }));
      }
      for (const s of [-1, 1]) {
        for (let k = 0; k < 3; k++) { const [x, y] = P(s * (16 + a.r() * 4), az(a, 30)); ps.push(a.elipsoide(x, y, 0, 4, 3.5, 2.5, { mat: 'roca' })); }
        const [bx, by] = P(s * 34, 0);
        ps.push(a.elipsoide(bx, by, -1, 14, 16, 5, { mat: 'tierra' }));
      }
      // tablas en arco
      const N = 13, L = 66, W = 20, roto = v === 'roto';
      const arco = (u: number) => 5 + 7 * Math.cos((u / L) * Math.PI);
      for (const s of [-1, 1]) for (let k = 0; k < 6; k++) {
        const u0 = -L / 2 + (k / 6) * L, u1 = -L / 2 + ((k + 1) / 6) * L;
        const [x0, y0] = P(u0, s * (W / 2 - 2)), [x1, y1] = P(u1, s * (W / 2 - 2));
        ps.push(a.palo([x0, y0, arco(u0) - 2], [x1, y1, arco(u1) - 2], 1.6, { mat: 'madera' }));
      }
      for (let k = 0; k < N; k++) {
        if (roto && (k === 6 || k === 7 || (k === 4 && a.r() < 0.7))) continue;
        const u = -L / 2 + ((k + 0.5) / N) * L, [x, y] = P(u, az(a, 1)), du = 0.01, sl = ((arco(u + du) - arco(u - du)) / (2 * du));
        const ang = (Math.atan(sl) * 180) / Math.PI;
        ps.push(a.caja(x, y, arco(u) - 0.5, ey ? W + az(a, 1.5) : 4.4, ey ? 4.4 : W + az(a, 1.5), 1.6, { mat: 'madera_vieja', incl: ey ? ang : -ang, inclEje: ey ? 'x' : 'y', tono: az(a, 0.08) }));
      }
      if (roto) { const [x, y] = P(4, 6); ps.push(a.caja(x, y, 0, 4.4, W, 1.5, { mat: 'madera_vieja', giro: ey ? 60 : 30, incl: 20, tono: -0.1 })); }
      // barandas
      for (const s of [-1, 1]) {
        const us = [-L / 2 + 2, 0, L / 2 - 2];
        for (const u of us) { const [x, y] = P(u, s * W / 2); ps.push(a.caja(x, y, arco(u) - 2, 2.4, 2.4, 16, { mat: 'madera' })); }
        for (let k = 0; k < 2; k++) {
          if (roto && s === 1 && k === 1) { const [x0, y0] = P(us[1], s * W / 2), [x1, y1] = P(us[2] - 8, s * W / 2 + 6); ps.push(a.palo([x0, y0, arco(0) + 12], [x1, y1, 2], 1.1, { mat: 'madera' })); continue; }
          const [x0, y0] = P(us[k], s * W / 2), [x1, y1] = P(us[k + 1], s * W / 2);
          ps.push(a.palo([x0, y0, arco(us[k]) + 12], [x1, y1, arco(us[k + 1]) + 12], 1.1, { mat: 'madera' }));
        }
      }
      return ps;
    },
  },
  {
    id: 'campo_altar', nombre: ['Altar del bosque', 'Forest altar'], tema: 'campo', variantes: ['velas', 'apagado', 'sangre'], cuadros: 4, t: 3, huella: [2, 1], bloquea: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [a.elipsoide(0, 0, 0, 26, 17, 1.5, { mat: 'tierra' }), a.elipsoide(0, 0, 0.5, 20, 12, 1.5, { mat: 'musgo', tono: -0.1 })];
      roca(a, ps, -10, 0, -0.5, 6, 6, 20, 'piedra', { n: 8, giro: 10 });
      roca(a, ps, 10, 0, -0.5, 6, 6, 20, 'piedra', { n: 8, giro: -10 });
      const z = 17.5;
      ps.push(a.caja(0, 0, z, 34, 17, 4, { mat: 'piedra', giro: az(a, 4), tono: -0.06 }));
      ps.push(a.caja(-6, 3, z + 3.6, 1.2, 9, 0.8, { mat: 'piedra', resta: true, giro: 30 }));
      ps.push(a.elipsoide(-12, -5, z + 2, 4, 3, 2.5, { mat: 'musgo' }));
      const velas: [number, number, number][] = [[-13, 5, 7], [-9, 6.5, 4], [12, 5, 6], [14, -4, 4], [8, 7, 3], [-14, -5, 5]];
      for (const [k, [x, y, h]] of velas.entries()) {
        const hh = h + a.r() * 2;
        ps.push(a.cilindro(x, y, z + 4, 1.4, hh, { mat: 'cera', tono: az(a, 0.06) }), a.elipsoide(x, y, z + 4.2, 2.3, 2.3, 0.8, { mat: 'cera', tono: -0.05 }));
        if (v !== 'apagado') fuegoVela(a, ps, x, y, z + 4 + hh, f, k);
        else ps.push(a.cilindro(x, y, z + 4 + hh, 0.3, 1, { mat: 'negro' }));
      }
      // cuernos y cráneo de ciervo apoyado atrás
      if (v === 'sangre') {
        ps.push(a.elipsoide(1, 1, z + 4, 9, 5, 0.5, { mat: 'sangre' }), a.palo([4, 8.4, z + 3], [5, 8.6, 4], 0.7, { mat: 'sangre' }), a.palo([-2, 8.4, z + 3], [-2.5, 8.6, 7], 0.6, { mat: 'sangre' }));
        craneo(a, ps, 0, -3, z + 7, 1.1, 45);
        ps.push(a.caja(4, 2, z + 4, 9, 1.4, 0.8, { mat: 'acero', giro: 20 }), a.caja(-1, 0.3, z + 4, 4, 1.8, 1.4, { mat: 'cuero', giro: 20 }));
      } else ps.push(a.cilindro(0, 0, z + 4, 4, 1.2, { mat: 'bronce' }), a.cilindro(0, 0, z + 5.2, 3.4, 2, { mat: 'bronce', r1: 4 }));
      if (v === 'apagado') return ps;
      return { piezas: ps, resplandor: { c: [0, 0, z + 12], r: 34, color: '#e0a050' } };
    },
  },
);

// ------------------------------------------------------------------ agua y fuego
registrar(
  {
    id: 'campo_estanque', nombre: ['Estanque', 'Pond'], tema: 'campo', variantes: ['claro', 'sucio', 'nenufares'], cuadros: 6, t: 4, huella: [4, 3], bloquea: true, plano: true,
    armar: (v, f, a) => {
      const ps: Pieza[] = [];
      const Rx = 32 + a.r() * 5, Ry = 22 + a.r() * 4, agua = v === 'sucio' ? 'agua_sucia' : 'agua';
      disco(a, ps, 0, 0, -0.5, Rx + 7, Ry + 6, 0.9, 'tierra', { giro: 10, ruido: 0.1 });
      disco(a, ps, az(a, 3), az(a, 3), -0.5, Rx + 3, Ry + 2.5, 1.1, 'tierra', { giro: 10 + az(a, 10), tono: -0.12, ruido: 0.1 });
      disco(a, ps, 0, 0, -0.5, Rx, Ry, 1.5, agua, { giro: 10, tono: -0.2, ruido: 0.06 });
      disco(a, ps, -Rx * 0.2, -Ry * 0.15, -0.4, Rx * 0.6, Ry * 0.55, 1.5, agua, { giro: 10, tono: -0.3, ruido: 0.1 });
      // destellos que se mueven despacio
      for (let k = 0; k < 6; k++) {
        const g = k * 1.9 + (f / 6) * 6.28 * (k % 2 ? 1 : -1) * 0.3, rr = 0.25 + (k / 6) * 0.5;
        const x = Math.cos(g + k) * Rx * rr, y = Math.sin(g + k) * Ry * rr, br = Math.max(0, Math.sin((f / 6) * 6.28 + k * 1.3));
        ps.push(a.elipsoide(x, y, 1, 3 + br * 2, 0.9, 0.3, { mat: agua, giro: 45, tono: 0.05 + br * 0.2 }));
      }
      for (let k = 0; k < 7; k++) { const g = a.r() * 6.28, s = 2 + a.r() * 3; ps.push(a.elipsoide(Math.cos(g) * (Rx + 3), Math.sin(g) * (Ry + 3), 0, s, s * 0.8, 1.2, { mat: 'roca' })); }
      for (let k = 0; k < 5; k++) { const g = a.r() * 6.28; ps.push(a.elipsoide(Math.cos(g) * (Rx + 4), Math.sin(g) * (Ry + 4), 0, 5, 3, 1, { mat: 'pasto', tono: az(a, 0.06) })); }
      if (v === 'nenufares') for (let k = 0; k < 7; k++) {
        const g = a.r() * 6.28, d = 0.3 + a.r() * 0.55, x = Math.cos(g) * Rx * d, y = Math.sin(g) * Ry * d, r = 2.5 + a.r() * 2;
        ps.push(a.cilindro(x, y, 1, r, 0.4, { mat: 'hojas', tono: 0.05 }), a.caja(x + r * 0.5, y, 0.9, r, 0.8, 0.8, { mat: agua, giro: a.r() * 360, resta: true }));
        if (k % 3 === 0) ps.push(a.esfera(x, y, 2, 1.2, { mat: 'cera' }));
      }
      if (v === 'sucio') for (let k = 0; k < 6; k++) { const g = a.r() * 6.28, d = a.r() * 0.7; ps.push(a.elipsoide(Math.cos(g) * Rx * d, Math.sin(g) * Ry * d, 1, 3 + a.r() * 3, 2 + a.r() * 2, 0.4, { mat: 'baba', tono: -0.15 })); }
      return ps;
    },
  },
  {
    id: 'campo_charco', nombre: ['Charco de barro', 'Mud puddle'], tema: 'campo', variantes: ['barro', 'agua', 'sangre'], huella: [2, 2], bloquea: false, plano: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [];
      const liq = v === 'barro' ? 'agua_sucia' : v === 'agua' ? 'agua' : 'sangre';
      for (let k = 0; k < 4; k++) disco(a, ps, az(a, 8), az(a, 6), -0.5, 9 + a.r() * 6, 6 + a.r() * 5, 0.9, 'tierra', { giro: a.r() * 180, tono: -0.1 - a.r() * 0.08, ruido: 0.15, n: 10 });
      for (let k = 0; k < 3; k++) disco(a, ps, az(a, 6), az(a, 4), -0.5, 6 + a.r() * 5, 4 + a.r() * 3, 1.2 + k * 0.05, liq, { giro: a.r() * 180, tono: (v === 'sangre' ? -0.15 : -0.1) + az(a, 0.05), ruido: 0.15, n: 10 });
      // huellas y piedritas
      for (let k = 0; k < 3; k++) ps.push(a.elipsoide(az(a, 14), az(a, 10), 0.6, 1.8, 1.2, 0.4, { mat: 'tierra', tono: -0.25, giro: 30 }));
      for (let k = 0; k < 3; k++) ps.push(a.elipsoide(az(a, 16), az(a, 12), 0, 1.6, 1.4, 1, { mat: 'roca' }));
      return ps;
    },
  },
  {
    id: 'campo_fogata_restos', nombre: ['Restos de fogata', 'Campfire remains'], tema: 'campo', variantes: ['apagada', 'brasas'], cuadros: 4, t: 3, huella: [1, 1], bloquea: false,
    armar: (v, f, a) => {
      const ps: Pieza[] = [a.elipsoide(0, 0, 0, 13, 12, 1.2, { mat: 'tierra', tono: -0.1 }), a.elipsoide(0, 0, 0, 8, 7, 1.6, { mat: 'campo_ceniza' })];
      const n = 9;
      for (let i = 0; i < n; i++) { const g = (i / n) * 6.28 + az(a, 0.2); roca(a, ps, Math.cos(g) * 10, Math.sin(g) * 9, -0.5, 2.6 + a.r(), 2.2 + a.r(), 2.6 + a.r(), i === 3 && a.r() < 0.6 ? 'campo_carbon' : 'roca', { n: 6 }); }
      for (let i = 0; i < 4; i++) {
        const g = a.r() * 6.28, l = 5 + a.r() * 4;
        ps.push(a.palo([Math.cos(g) * l, Math.sin(g) * l, 1], [-Math.cos(g) * 2, -Math.sin(g) * 2, 2.5 + a.r() * 2], 1.3 + a.r() * 0.5, { mat: 'campo_carbon' }));
      }
      ps.push(a.palo([7, -12, 0.8], [14, -4, 0.8], 0.8, { mat: 'madera_vieja' }));
      if (v === 'apagada') return ps;
      for (let i = 0; i < 6; i++) {
        const g = i * 1.7 + 0.4, d = 1 + (i % 3) * 1.6, br = Math.sin(f * 1.6 + i * 2.1);
        ps.push(a.elipsoide(Math.cos(g) * d, Math.sin(g) * d, 1.6, 1.4, 1.2, 0.8, { mat: i % 2 ? 'lava' : 'fuego', tono: -0.25 + br * 0.15 }));
      }
      return { piezas: ps, resplandor: { c: [0, 0, 3], r: 16 + Math.sin(f * 1.6) * 2, color: '#c0401a' } };
    },
  },
);

// ------------------------------------------------------------------ cosas abandonadas
registrar(
  {
    id: 'campo_rueda_carreta', nombre: ['Rueda de carreta', 'Abandoned cart wheel'], tema: 'campo', variantes: ['tumbada', 'apoyada', 'rota'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [a.elipsoide(0, 0, 0, 16, 14, 1.2, { mat: 'tierra' })];
      const R = 13, Tk = 3;
      // eje de la rueda (normal al plano) y centro
      let n: V, c: V;
      if (v === 'apoyada') {
        roca(a, ps, -10, -9, -0.5, 7, 6, 8, 'roca', { n: 7 });
        const t = (22 * Math.PI) / 180; n = [Math.cos(t) * 0.7, Math.cos(t) * 0.7, Math.sin(t)]; const l = Math.hypot(...n); n = [n[0] / l, n[1] / l, n[2] / l];
        c = [2, 2, R * 0.93];
      } else { n = [0, 0, 1]; c = [0, 0, 0.5]; }
      const u: V = Math.abs(n[2]) > 0.9 ? [1, 0, 0] : [-n[1], n[0], 0];
      { const l = Math.hypot(...u); u[0] /= l; u[1] /= l; u[2] /= l; }
      const w: V = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
      const at = (ang: number, r: number, h = 0): V => [c[0] + (u[0] * Math.cos(ang) + w[0] * Math.sin(ang)) * r + n[0] * h, c[1] + (u[1] * Math.cos(ang) + w[1] * Math.sin(ang)) * r + n[1] * h, c[2] + (u[2] * Math.cos(ang) + w[2] * Math.sin(ang)) * r + n[2] * h];
      const b = mas(c, n, -Tk / 2);
      ps.push(a.cilindro(b[0], b[1], b[2], R, Tk, { mat: 'madera', eje: n }));
      ps.push(a.cilindro(b[0] - n[0], b[1] - n[1], b[2] - n[2], R - 2.6, Tk + 2, { mat: 'madera', eje: n, resta: true }));
      // llanta de hierro
      ps.push(a.cilindro(b[0] + n[0] * 0.6, b[1] + n[1] * 0.6, b[2] + n[2] * 0.6, R + 0.5, 1.6, { mat: 'hierro_oxido', eje: n }));
      ps.push(a.cilindro(b[0], b[1], b[2], R - 0.3, Tk + 1, { mat: 'hierro', eje: n, resta: true }));
      const rota = v === 'rota';
      if (rota) ps.push(a.caja(...at(0.6, R, -3), 12, 12, 8, { mat: 'madera', resta: true, giro: 30 }));
      const hb = mas(c, n, -2.5);
      ps.push(a.cilindro(hb[0], hb[1], hb[2], 3.2, 5, { mat: 'madera_lisa', eje: n }), a.cilindro(hb[0] + n[0] * 5, hb[1] + n[1] * 5, hb[2] + n[2] * 5, 1.4, 1.2, { mat: 'hierro', eje: n }));
      const N = 10;
      for (let i = 0; i < N; i++) {
        if (rota && (i === 0 || i === 1 || i === 6)) continue;
        const g = (i / N) * 6.28;
        ps.push(a.palo(at(g, 2.8), at(g, R - 2), 1, { mat: 'madera' }));
      }
      if (rota) {
        ps.push(a.palo([16, 4, 1], [10, 12, 1], 1, { mat: 'madera', r1: 0.8 }), a.palo([-15, 6, 0.8], [-9, 13, 1.2], 1, { mat: 'madera' }));
        ps.push(a.cilindro(14, -10, 1.5, 1.6, 12, { mat: 'madera_vieja', eje: [-0.3, 1, 0.05] }));
      }
      for (let i = 0; i < 3; i++) { const g = a.r() * 6.28; ps.push(a.elipsoide(Math.cos(g) * 12, Math.sin(g) * 11, 1, 3.5, 3, 3, { mat: 'pasto', tono: az(a, 0.06) })); }
      return ps;
    },
  },
  {
    id: 'campo_espantapajaros', nombre: ['Espantapájaros', 'Scarecrow'], tema: 'campo', variantes: ['normal', 'roto', 'con_cuervo'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [a.elipsoide(0, 0, 0, 10, 9, 1.4, { mat: 'tierra' })];
      for (let i = 0; i < 4; i++) { const g = a.r() * 6.28; ps.push(a.elipsoide(Math.cos(g) * 7, Math.sin(g) * 6, 1, 3, 2.5, 3, { mat: 'paja', tono: -0.15 })); }
      const roto = v === 'roto';
      const inc = roto ? 9 : az(a, 3);
      const ir = (inc * Math.PI) / 180;
      const at = (z: number, dy = 0): V => [Math.sin(ir) * z, dy, Math.cos(ir) * z];
      ps.push(a.palo([0, 0, 0], at(74), 1.8, { mat: 'madera_vieja', r1: 1.4 }));
      const brazo = 52;
      const izq: V = mas(at(brazo), [0, -19, roto ? -6 : az(a, 2)]), der: V = mas(at(brazo), [0, 19, az(a, 2)]);
      ps.push(a.palo(izq, der, 1.4, { mat: 'madera_vieja' }));
      // abrigo: torso de tela, faldones y mangas rellenas de paja
      const t0 = at(30), t1 = at(brazo + 3);
      ps.push(a.elipsoide((t0[0] + t1[0]) / 2 + 1, 0, (t0[2] + t1[2]) / 2, 6, 8.5, 13, { mat: 'tela', tono: -0.05 }));
      for (const s of [-1, 0, 1]) ps.push(a.caja(t0[0] + 1.5, s * 5, 22, 6, 4.2, 12, { mat: 'tela', giro: az(a, 8), incl: s * 7 + az(a, 4), tono: -0.08 + az(a, 0.06) }));
      for (const [s, p] of [[-1, izq], [1, der]] as [number, V][]) {
        const m = mas(t1, p, 0.5);
        ps.push(a.palo(mas(t1, [0, s * 4, -3]), mas(m, mas(p, m, -1), 1.35), 3.3, { mat: 'tela', r1: 2.7, tono: -0.04 }));
        for (let k = 0; k < 4; k++) ps.push(a.cilindro(p[0], p[1] + s * 1, p[2], 0.9, 6 + a.r() * 4, { mat: 'paja', r1: 0, eje: [az(a, 0.6), s, -0.5 + az(a, 0.5)] }));
      }
      for (let k = 0; k < 6; k++) ps.push(a.cilindro(t0[0] + az(a, 3), az(a, 5), 18, 0.9, 6 + a.r() * 4, { mat: 'paja', r1: 0, eje: [az(a, 0.3), az(a, 0.3), -1] }));
      ps.push(a.cilindro(t1[0], 0, t1[2] - 6, 3, 2, { mat: 'cuerda' }));
      // cabeza de costal con boca cosida y sombrero de paja
      const cab = roto ? ([12, 14, 4.5] as V) : at(66);
      ps.push(a.elipsoide(cab[0], cab[1], cab[2], 5.3, 5, 6, { mat: 'tela', tono: roto ? -0.05 : 0.03, giro: roto ? 70 : 0, incl: roto ? 80 : 0 }));
      if (!roto) {
        ps.push(a.caja(cab[0] + 4.7, cab[1], cab[2] - 2.5, 1, 5, 0.8, { mat: 'negro' }), a.esfera(cab[0] + 4.3, cab[1] - 2, cab[2] + 1, 1.1, { mat: 'negro' }), a.esfera(cab[0] + 4.3, cab[1] + 2, cab[2] + 1, 1.1, { mat: 'negro' }));
        for (let k = -2; k <= 2; k++) ps.push(a.caja(cab[0] + 4.9, cab[1] + k, cab[2] - 3.1, 0.6, 0.4, 1.6, { mat: 'cuerda' }));
        ps.push(a.cilindro(cab[0], cab[1], cab[2] - 5, 4.3, 2, { mat: 'cuerda' }));
        { const ih = 6 + a.r() * 8; ps.push(a.cilindro(cab[0], cab[1], cab[2] + 3.6, 9, 1.2, { mat: 'cuero', incl: ih, tono: -0.05 }), a.cilindro(cab[0], cab[1], cab[2] + 4, 4.6, 6.5, { mat: 'cuero', r1: 3.6, incl: ih + 4, tono: 0.03 }), a.cilindro(cab[0], cab[1], cab[2] + 4.6, 4.8, 1.4, { mat: 'tela_roja', incl: ih + 4, tono: -0.15 })); }
      } else {
        ps.push(a.cilindro(-10, 12, 0, 9, 1.2, { mat: 'cuero', tono: -0.1, incl: 8 }), a.cilindro(-9, 13, 0.8, 4.6, 6, { mat: 'cuero', r1: 3.6, incl: 75 }));
        ps.push(a.cilindro(at(70)[0], 0, 64, 2.5, 1.5, { mat: 'cuerda' }));
      }
      if (v === 'con_cuervo') {
        const p = mas(der, [0, -4, 1.5]);
        ps.push(a.elipsoide(p[0] + 1, p[1], p[2] + 3, 4.5, 2.4, 2.6, { mat: 'negro', giro: 20, incl: -20, inclEje: 'y', tono: 0.15 }));
        ps.push(a.esfera(p[0] + 4.5, p[1] + 1, p[2] + 5.5, 2, { mat: 'negro', tono: 0.15 }), a.cilindro(p[0] + 6, p[1] + 1.6, p[2] + 5.3, 0.9, 3, { mat: 'hueso', r1: 0, eje: [1, 0.4, -0.2], tono: -0.3 }));
        ps.push(a.caja(p[0] - 4, p[1] - 1, p[2] + 2, 5, 2, 0.8, { mat: 'negro', giro: 20, incl: 20, inclEje: 'y', tono: 0.1 }));
        for (const s of [-1, 1]) ps.push(a.palo([p[0] + 1, p[1] + s * 0.8, p[2] + 1], [p[0] + 1, p[1] + s * 0.8, p[2] - 0.5], 0.4, { mat: 'hueso', tono: -0.3 }));
      }
      return ps;
    },
  },
);
