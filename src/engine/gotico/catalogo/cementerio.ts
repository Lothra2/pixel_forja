import { registrar, type Arma, type Pieza, type V3 } from '../objeto';
import { MATERIALES } from '../materiales';

// Cementerio y criptas: lápidas de muchas formas (enteras, rotas, inclinadas, con musgo), tumbas de tierra, fosas
// abiertas, ataúdes, sarcófagos, el mausoleo, la entrada a la cripta, rejas, portones, el ángel que llora, huesos,
// urnas, velas, faroles, flores secas y el muro con su arco.

MATERIALES.cem_lapida = { rampa: ['#121314', '#212325', '#323538', '#45484c', '#5a5d61', '#717477', '#8a8c8e', '#a2a3a3'], ruido: 0.3, escala: 0.25 };
MATERIALES.cem_lapida_musgo = { rampa: ['#111410', '#1e241b', '#2d3528', '#3e4737', '#525a48', '#676e5a', '#7f8670'], ruido: 0.45, escala: 0.22 };

// ------------------------------------------------------------------ armado en grupos (giro e inclinación de un conjunto)
type Op = { mat: string; tono?: number; resta?: boolean };
type Rot = { giro?: number; incl?: number; inclEje?: 'x' | 'y' };
type P2 = [number, number];
const GR = Math.PI / 180;
const lin = (m: V3[], v: V3): V3 => [m[0][0] * v[0] + m[1][0] * v[1] + m[2][0] * v[2], m[0][1] * v[0] + m[1][1] * v[1] + m[2][1] * v[2], m[0][2] * v[0] + m[1][2] * v[1] + m[2][2] * v[2]];
function marco(giro = 0, incl = 0, eje: 'x' | 'y' = 'x'): V3[] {
  const g = giro * GR, t = incl * GR, c = Math.cos(t), s = Math.sin(t);
  let ex: V3 = [Math.cos(g), Math.sin(g), 0], ey: V3 = [-Math.sin(g), Math.cos(g), 0], ez: V3 = [0, 0, 1];
  const mez = (u: V3, w: V3, k: number): V3 => [u[0] * c + w[0] * k, u[1] * c + w[1] * k, u[2] * c + w[2] * k];
  if (t) { if (eje === 'x') { const n = mez(ey, ez, s); ez = mez(ez, ey, -s); ey = n; } else { const n = mez(ex, ez, s); ez = mez(ez, ex, -s); ex = n; } }
  return [ex, ey, ez];
}
/** Un grupo de piezas con su propio origen y ejes: todo lo que se arma en él gira e inclina junto. */
class G {
  constructor(readonly a: Arma, readonly ps: Pieza[], readonly m: V3[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], readonly o: V3 = [0, 0, 0]) {}
  D(v: V3): V3 { return lin(this.m, v); }
  P(x: number, y: number, z: number): V3 { const d = this.D([x, y, z]); return [this.o[0] + d[0], this.o[1] + d[1], this.o[2] + d[2]]; }
  sub(x: number, y: number, z: number, giro = 0, incl = 0, eje: 'x' | 'y' = 'x') { const k = marco(giro, incl, eje); return new G(this.a, this.ps, k.map((e) => this.D(e)), this.P(x, y, z)); }
  private put(p: Pieza) { this.ps.push(p); return p; }
  caja(x: number, y: number, z: number, w: number, d: number, h: number, o: Op & Rot) {
    const k = marco(o.giro, o.incl, o.inclEje), pts: V3[] = [];
    for (const sx of [-0.5, 0.5]) for (const sy of [-0.5, 0.5]) for (const sz of [0, 1]) { const l = lin(k, [sx * w, sy * d, sz * h]); pts.push(this.P(x + l[0], y + l[1], z + l[2])); }
    return this.put(this.a.poliedro(pts, { mat: o.mat, tono: o.tono, resta: o.resta }));
  }
  cil(x: number, y: number, z: number, r0: number, h: number, o: Op & { r1?: number; eje?: V3 }) {
    return this.put(this.a.cilindro(...this.P(x, y, z), r0, h, { mat: o.mat, tono: o.tono, resta: o.resta, r1: o.r1, eje: this.D(o.eje ?? [0, 0, 1]) }));
  }
  palo(p: V3, q: V3, r0: number, o: Op & { r1?: number }) { return this.put(this.a.palo(this.P(...p), this.P(...q), r0, o)); }
  elip(x: number, y: number, z: number, rx: number, ry: number, rz: number, o: Op & Rot) {
    const p = this.a.elipsoide(...this.P(x, y, z), rx, ry, rz, { mat: o.mat, tono: o.tono, resta: o.resta });
    if (p.k === 'elip') { const k = marco(o.giro, o.incl, o.inclEje); p.ex = this.D(k[0]); p.ey = this.D(k[1]); p.ez = this.D(k[2]); }
    return this.put(p);
  }
  esf(x: number, y: number, z: number, r: number, o: Op) { return this.elip(x, y, z, r, r, r, o); }
  poli(pts: V3[], o: Op) { return this.put(this.a.poliedro(pts.map((q) => this.P(...q)), o)); }
  /** Prisma: un perfil (x,z) convexo extruido a lo largo de y entre y0 e y1. */
  prisma(perfil: P2[], y0: number, y1: number, o: Op) { return this.poli(perfil.flatMap(([x, z]) => [[x, y0, z], [x, y1, z]] as V3[]), o); }
}
/** Perfil (x,z) de un arco ojival: ancho w, jambas hasta hr, agudeza k (0.5 medio punto, 1 equilátero). */
function ojiva(w: number, hr: number, k = 0.85, n = 4, z0 = 0): P2[] {
  const rr = k * w, cx = w / 2 - rr, tmax = Math.acos(-cx / rr);
  const der: P2[] = [];
  for (let i = 0; i <= n; i++) { const t = (tmax * i) / n; der.push([cx + rr * Math.cos(t), z0 + hr + rr * Math.sin(t)]); }
  const izq = der.map(([x, z]) => [-x, z] as P2).reverse();
  return [[-w / 2, z0], [w / 2, z0], ...der, ...izq.slice(1)];
}
const altoOjiva = (w: number, hr: number, k = 0.85) => { const rr = k * w, cx = w / 2 - rr; return hr + rr * Math.sqrt(1 - (cx / rr) ** 2); };

// ------------------------------------------------------------------ detalles comunes
/** Mancha de tierra en el piso, con piedritas. */
function tierra(g: G, rx: number, ry: number, n = 3, mat = 'tierra', x = 0, y = 0) {
  const a = g.a;
  g.elip(x, y, 0, rx, ry, 1.4, { mat, giro: (a.r() - 0.5) * 30 });
  for (let i = 0; i < n; i++) { const t = a.r() * Math.PI * 2, q = 0.5 + a.r() * 0.5; g.elip(x + Math.cos(t) * rx * q, y + Math.sin(t) * ry * q, 0.4, 1.2 + a.r(), 1 + a.r(), 0.9 + a.r() * 0.6, { mat: a.r() < 0.5 ? 'roca' : 'tierra', tono: 0.05, giro: a.r() * 90 }); }
}
/** Matas de pasto seco alrededor. */
function matas(g: G, n: number, rx: number, ry: number, x = 0, y = 0) {
  const a = g.a;
  for (let i = 0; i < n; i++) {
    const t = a.r() * Math.PI * 2, q = 0.7 + a.r() * 0.45, cx = x + Math.cos(t) * rx * q, cy = y + Math.sin(t) * ry * q;
    const mat = a.r() < 0.5 ? 'pasto' : 'paja', tono = mat === 'paja' ? -0.18 : 0;
    for (let k = 0; k < 3; k++) { const h = 3 + a.r() * 3; g.palo([cx + (k - 1) * 0.8, cy + (a.r() - 0.5), 0], [cx + (k - 1) * 2 + (a.r() - 0.5) * 2, cy + (a.r() - 0.5) * 3, h], 0.9, { mat, tono, r1: 0.15 }); }
  }
}
/** Calavera mirando hacia +x del grupo, apoyada en z=0. */
function calavera(g: G, r = 3.3, mat = 'hueso') {
  g.elip(0, 0, r * 0.95, r * 1.08, r * 0.9, r * 0.92, { mat });
  g.elip(r * 0.55, 0, r * 0.5, r * 0.62, r * 0.72, r * 0.55, { mat, tono: -0.03 });
  for (const s of [-1, 1]) g.esf(r * 0.78, s * r * 0.4, r * 0.88, r * 0.34, { mat: 'negro' });
  g.caja(r * 0.95, 0, r * 0.38, r * 0.4, r * 0.3, r * 0.36, { mat: 'negro' });
}
/** Hueso largo con sus dos cabezas. */
function hueso(g: G, p: V3, q: V3, r = 1, mat = 'hueso') {
  g.palo(p, q, r, { mat });
  for (const e of [p, q]) g.esf(e[0], e[1], e[2], r * 1.6, { mat, tono: 0.04 });
}
/** Esqueleto tumbado boca arriba a lo largo de y (cabeza en -y), unos 58 de largo. */
function esqueleto(g: G, flojo = 0) {
  const a = g.a, j = () => (a.r() - 0.5) * flojo;
  calavera(g.sub(0, -25, 3.6, 90, 90, 'y').sub(0, 0, -3.3), 3.3);
  g.palo([0, -21, 2.4], [0, -2, 2.2], 1.1, { mat: 'hueso' });
  for (let i = 0; i < 4; i++) { const y = -19 + i * 3.2; for (const s of [-1, 1]) g.palo([0, y, 3.6], [s * (5.2 - i * 0.3), y + 1.4, 1.6], 0.9, { mat: 'hueso', tono: -0.04 }); }
  g.elip(0, -1, 2, 5, 2.6, 2, { mat: 'hueso' });
  for (const s of [-1, 1]) {
    const c: V3 = [s * (7.5 + j()), -9 + j(), 1.4];
    hueso(g, [s * 6.2, -19, 1.8], c, 1);
    g.palo(c, [s * (5.5 + j()), 0 + j(), 1.2], 0.9, { mat: 'hueso' });
    const k: V3 = [s * (3.4 + j()), 13 + j(), 1.6];
    hueso(g, [s * 3, -0.5, 2], k, 1.25);
    g.palo(k, [s * (3.6 + j()), 26 + j(), 1.2], 1.05, { mat: 'hueso' });
    g.elip(s * 3.8, 28, 1.6, 1.6, 2.4, 1.2, { mat: 'hueso', tono: -0.05 });
  }
}
/** Ataúd de seis lados a lo largo de y (cabeza en -y). Devuelve el perfil para tapas e interiores. */
const perfilAtaud = (k = 1, L = 30): P2[] => [[-7 * k, -L], [7 * k, -L], [10 * k, -L * 0.52], [5.6 * k, L], [-5.6 * k, L], [-10 * k, -L * 0.52]];
function placa(g: G, perfil: P2[], z0: number, z1: number, o: Op) { return g.poli(perfil.flatMap(([x, y]) => [[x, y, z0], [x, y, z1]] as V3[]), o); }
function ataud(g: G, estado: 'cerrado' | 'abierto' | 'esqueleto' | 'roto', mat = 'madera_vieja') {
  const a = g.a;
  placa(g, perfilAtaud(1), 0, 10, { mat });
  if (estado !== 'cerrado') {
    placa(g, perfilAtaud(0.82, 28), 2, 14, { mat, resta: true });
    placa(g, perfilAtaud(0.84, 28.5), 0, 2.4, { mat: 'tela_morada', tono: -0.15 });
    if (estado === 'esqueleto' || estado === 'roto') { esqueleto(g.sub(0, 0, 2.2, 0, 0).sub(0, -1, 0), 0.8); }
    if (estado === 'roto') {
      g.caja(10, -4, 0, 2, 12, 10, { mat, resta: true });
      for (let i = 0; i < 3; i++) g.caja(16 + a.r() * 5, -10 + i * 7, 0, 3, 11, 1.4, { mat, giro: 20 + a.r() * 50, tono: -0.05 });
    }
    // la tapa corrida, apoyada de costado
    const t = g.sub(-15, 6, 0, -8 + (a.r() - 0.5) * 6, -64, 'y');
    placa(t, perfilAtaud(1.03), 0, 2.2, { mat, tono: 0.04 });
    t.caja(0, -12, 2.2, 2.4, 22, 1.4, { mat: 'hierro_oxido' }); t.caja(0, -16, 2.2, 10, 2.4, 1.4, { mat: 'hierro_oxido' });
  } else {
    placa(g, perfilAtaud(1.04), 10, 12.4, { mat, tono: 0.05 });
    g.caja(0, -10, 12.4, 2.4, 22, 1.2, { mat: 'hierro_oxido' }); g.caja(0, -14, 12.4, 10, 2.4, 1.2, { mat: 'hierro_oxido' });
    for (const y of [-26, 22]) for (const s of [-1, 1]) g.caja(s * (y < 0 ? 7.5 : 6), y, 4, 1.4, 3, 2, { mat: 'hierro' });
  }
}

// ------------------------------------------------------------------ lápidas: seis formas, cuatro estados
interface Dim { h: number; d: number; corte: number; w: number }
interface Forma { dim: (a: Arma) => Dim; armar: (g: G, m: string, k: Dim) => void }
const plinto = (g: G, m: string, w: number, d: number, h = 2.5) => g.caja(0, 0, 0, w, d, h, { mat: m, tono: -0.06 });
const FORMAS: Record<string, Forma> = {
  redonda: {
    dim: (a) => { const w = 12 + a.r() * 3, h = 18 + a.r() * 5; return { w, h: 2.5 + h, d: 4, corte: 2.5 + h * 0.5 }; },
    armar: (g, m, k) => {
      plinto(g, m, k.w + 3, k.d + 4);
      const hs = k.h - 2.5 - k.w / 2;
      g.caja(0, 0, 2.5, k.w, k.d, hs, { mat: m });
      g.cil(0, -k.d / 2, 2.5 + hs, k.w / 2, k.d, { mat: m, eje: [0, 1, 0] });
      g.caja(0, k.d / 2, 2.5 + hs * 0.3, 2, 2, 9, { mat: m, resta: true });
      g.caja(0, k.d / 2, 2.5 + hs * 0.3 + 5.5, 6.5, 2, 2, { mat: m, resta: true });
    },
  },
  ojival: {
    dim: (a) => { const w = 12 + a.r() * 3, hr = 12 + a.r() * 4; return { w, h: 2.5 + altoOjiva(w, hr, 0.8), d: 4.5, corte: 2.5 + hr * 0.55 }; },
    armar: (g, m, k) => {
      plinto(g, m, k.w + 3, k.d + 4);
      const hr = k.h - 2.5 - (altoOjiva(k.w, 0, 0.8));
      g.prisma(ojiva(k.w, hr, 0.8, 4, 2.5), -k.d / 2, k.d / 2, { mat: m });
      g.prisma(ojiva(k.w - 5, hr - 4, 0.8, 3, 5), k.d / 2 - 1.1, k.d / 2 + 1, { mat: m, resta: true });
      g.caja(0, k.d / 2 - 0.6, 9, 1.8, 1.6, 7, { mat: m, tono: 0.08 });
      g.caja(0, k.d / 2 - 0.6, 13, 5, 1.6, 1.8, { mat: m, tono: 0.08 });
    },
  },
  cruz: {
    dim: (a) => { const h = 26 + a.r() * 6; return { w: 15, h: 7 + h, d: 4, corte: 7 + h * 0.42 }; },
    armar: (g, m, k) => {
      g.caja(0, 0, 0, 12, 10, 4, { mat: m, tono: -0.06 }); g.caja(0, 0, 4, 8, 7, 3, { mat: m, tono: -0.03 });
      g.caja(0, 0, 7, 4.5, 4, k.h - 7, { mat: m });
      g.caja(0, 0, 7 + (k.h - 7) * 0.64, 15, 4, 4.2, { mat: m });
    },
  },
  celta: {
    dim: (a) => { const h = 30 + a.r() * 5; return { w: 18, h, d: 3.6, corte: h - 21 }; },
    armar: (g, m, k) => {
      const zc = k.h - 9.5;
      g.cil(0, -1.5, zc, 7.2, 3, { mat: m, eje: [0, 1, 0] });
      g.cil(0, -3, zc, 4.9, 6, { mat: m, resta: true, eje: [0, 1, 0] });
      g.poli([[-6.5, -4.5, 0], [6.5, -4.5, 0], [-6.5, 4.5, 0], [6.5, 4.5, 0], [-5, -3.5, 6], [5, -3.5, 6], [-5, 3.5, 6], [5, 3.5, 6]], { mat: m, tono: -0.05 });
      g.poli([[-2.8, -1.8, 6], [2.8, -1.8, 6], [-2.8, 1.8, 6], [2.8, 1.8, 6], [-2.1, -1.8, k.h], [2.1, -1.8, k.h], [-2.1, 1.8, k.h], [2.1, 1.8, k.h]], { mat: m });
      g.caja(0, 0, zc - 2.1, 18, 3.6, 4.2, { mat: m });
      g.cil(0, 1.6, zc, 2.2, 1.2, { mat: m, tono: 0.1, eje: [0, 1, 0] });
      for (let i = 0; i < 3; i++) g.caja(0, 1.9, 9 + i * 4, 3, 0.6, 1.2, { mat: m, tono: -0.12 });
    },
  },
  obelisco: {
    dim: (a) => { const h = 38 + a.r() * 8; return { w: 7, h, d: 6, corte: 7 + (h - 12) * 0.5 }; },
    armar: (g, m, k) => {
      g.caja(0, 0, 0, 15, 15, 4, { mat: m, tono: -0.07 }); g.caja(0, 0, 4, 11, 11, 3.5, { mat: m, tono: -0.03 });
      for (const [x, y, w, d] of [[0, 5.5, 7, 2], [5.5, 0, 2, 7]]) g.caja(x, y, 1, w, d, 1.8, { mat: m, resta: true });
      const zt = k.h - 5;
      g.poli([[-3.6, -3.6, 7.5], [3.6, -3.6, 7.5], [-3.6, 3.6, 7.5], [3.6, 3.6, 7.5], [-2.5, -2.5, zt], [2.5, -2.5, zt], [-2.5, 2.5, zt], [2.5, 2.5, zt]], { mat: m });
      g.poli([[-2.5, -2.5, zt], [2.5, -2.5, zt], [-2.5, 2.5, zt], [2.5, 2.5, zt], [0, 0, k.h]], { mat: m, tono: 0.05 });
      g.caja(0, 3.6, 16, 3.2, 1.4, 4, { mat: m, resta: true });
    },
  },
};
function lapida(id: string, nombre: [string, string], forma: Forma) {
  registrar({
    id, nombre, tema: 'cementerio', variantes: ['intacta', 'rota', 'inclinada', 'con_musgo'], huella: [1, 1], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = [], g = new G(a, ps);
      const k = forma.dim(a), musgo = v === 'con_musgo', m = musgo ? 'cem_lapida_musgo' : 'cem_lapida';
      const giro = (a.r() - 0.5) * 24;
      if (v === 'rota') {
        // el pedazo de arriba caído adelante, con el corte hacia la base
        // cae de costado (a la derecha o a la izquierda de la pantalla), no hacia la cámara
        const ang = a.r() < 0.5 ? 35 + a.r() * 30 : 205 + a.r() * 30, u: V3 = [Math.sin(ang * GR), -Math.cos(ang * GR), 0];
        const F: V3 = [u[0] * 5 + 3, u[1] * 5 + 3, 0];
        const gf = g.sub(F[0] - u[0] * k.corte, F[1] - u[1] * k.corte, k.d / 2 - 0.8, ang, 87);
        forma.armar(gf, m, k);
        gf.caja(0, 0, -2, 60, 60, k.corte + 2, { mat: m, resta: true });
      }
      tierra(g, 9 + a.r() * 3, 8 + a.r() * 3, 3);
      const inc = v === 'inclinada' ? (a.r() < 0.5 ? -1 : 1) * (10 + a.r() * 8) : (a.r() - 0.5) * 4;
      const gu = g.sub(0, 0, v === 'inclinada' ? -1 : 0, giro, inc, a.r() < 0.5 ? 'x' : 'y');
      forma.armar(gu, m, k);
      if (v === 'rota') {
        const sx = (a.r() - 0.5) * 0.5, sy = (a.r() - 0.5) * 0.3, c = k.corte;
        gu.poli([[-30, -30, c - 30 * sx - 30 * sy], [30, -30, c + 30 * sx - 30 * sy], [-30, 30, c - 30 * sx + 30 * sy], [30, 30, c + 30 * sx + 30 * sy], [-30, -30, 90], [30, -30, 90], [-30, 30, 90], [30, 30, 90]], { mat: m, resta: true });
        gu.poli([[-4, -9, c - 3], [4, -9, c], [0, 9, c - 2.5], [-6, 0, c + 8], [6, 0, c + 8]], { mat: m, resta: true });
        for (let i = 0; i < 3; i++) g.caja(-6 + a.r() * 12, 4 + a.r() * 6, 0, 2 + a.r() * 2, 2 + a.r() * 2, 1.5 + a.r() * 1.5, { mat: m, giro: a.r() * 90, tono: -0.05 });
      }
      if (v === 'inclinada') g.elip(0, 0, 0, 7, 6, 3, { mat: 'tierra', giro, tono: 0.05 });
      if (musgo) {
        for (let i = 0; i < 4; i++) gu.elip((a.r() - 0.5) * k.w * 0.8, k.d / 2, 2 + a.r() * k.h * 0.45, 2.2 + a.r() * 1.5, 1, 1.6 + a.r(), { mat: 'musgo' });
        gu.elip((a.r() - 0.5) * 3, 0, k.h - 0.5, 3, 2.4, 1.1, { mat: 'musgo', tono: 0.05 });
        for (let i = 0; i < 3; i++) { const t = a.r() * 6.28; g.elip(Math.cos(t) * 7, Math.sin(t) * 6, 0.3, 3 + a.r() * 2, 2 + a.r() * 2, 1.2, { mat: 'musgo' }); }
      }
      matas(g, musgo ? 4 : 2, 9, 8);
      return ps;
    },
  });
}
lapida('cem_lapida_redonda', ['Lápida redonda', 'Rounded tombstone'], FORMAS.redonda);
lapida('cem_lapida_ojival', ['Lápida ojival', 'Pointed gothic tombstone'], FORMAS.ojival);
lapida('cem_lapida_cruz', ['Cruz de piedra', 'Stone cross'], FORMAS.cruz);
lapida('cem_lapida_celta', ['Cruz con anillo', 'Ringed cross'], FORMAS.celta);
lapida('cem_obelisco', ['Obelisco funerario', 'Grave obelisk'], FORMAS.obelisco);

// ------------------------------------------------------------------ losa en el piso
function losaPts(y0: number, y1: number, cx: number, lado: number): V3[] {
  // la losa (15×30, 3.5 de alto con bisel) cortada por el plano y = cx + 0.3x; `lado` dice qué mitad
  const cut = (x: number) => cx + 0.3 * x;
  const pts: V3[] = [];
  for (const [hx, z, ya, yb] of [[7.5, 0, -15, 15], [6.4, 3.5, -13.9, 13.9]] as [number, number, number, number][]) {
    for (const x of [-hx, hx]) {
      const lo = lado > 0 ? Math.max(ya, cut(x)) : Math.max(ya, y0), hi = lado < 0 ? Math.min(yb, cut(x)) : Math.min(yb, y1);
      pts.push([x, lo, z], [x, hi, z]);
    }
  }
  return pts;
}
registrar({
  id: 'cem_losa', nombre: ['Losa sepulcral', 'Grave slab'], tema: 'cementerio', variantes: ['intacta', 'rota', 'inclinada', 'con_musgo'], huella: [1, 2], bloquea: false,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g0 = new G(a, ps);
    const musgo = v === 'con_musgo', m = musgo ? 'cem_lapida_musgo' : 'cem_lapida';
    tierra(g0, 11, 19, 4);
    const g = g0.sub(0, 0, v === 'inclinada' ? -1.2 : 0, (a.r() - 0.5) * 14, v === 'inclinada' ? 6 + a.r() * 3 : 0, 'y');
    if (v === 'rota') {
      const c = (a.r() - 0.5) * 8;
      g.poli(losaPts(-15, 15, c, -1), { mat: m });
      g.sub(0, 0, -1.4, 0, -5, 'x').poli(losaPts(-15, 15, c, 1), { mat: m, tono: -0.04 });
      for (let i = 0; i < 3; i++) g.caja(8 + a.r() * 4, c + (a.r() - 0.5) * 8, 0, 2 + a.r() * 1.5, 2 + a.r(), 1.6, { mat: m, giro: a.r() * 90 });
    } else g.poli(losaPts(-15, 15, 99, -1), { mat: m });
    g.caja(0, -2, 2.6, 2.4, 17, 2, { mat: m, resta: true });
    g.caja(0, -6.5, 2.6, 9, 2.4, 2, { mat: m, resta: true });
    g.caja(0, 10.5, 2.6, 8, 1.2, 2, { mat: m, resta: true });
    g.caja(0, 12.5, 2.6, 6, 1.2, 2, { mat: m, resta: true });
    if (musgo) for (let i = 0; i < 6; i++) g.elip((a.r() - 0.5) * 12, (a.r() - 0.5) * 26, 3.2, 2 + a.r() * 2.5, 2 + a.r() * 3, 0.8, { mat: 'musgo', giro: a.r() * 90 });
    if (v === 'inclinada') g0.elip(-7, 0, 0, 3.5, 13, 2.4, { mat: 'tierra', tono: 0.04 });
    matas(g0, 3, 9, 16);
    return ps;
  },
});

// ------------------------------------------------------------------ tumba de tierra
registrar({
  id: 'cem_tumba_tierra', nombre: ['Tumba de tierra', 'Grave mound'], tema: 'cementerio', variantes: ['fresca', 'vieja', 'con_cruz', 'con_piedras'], huella: [2, 4], bloquea: false,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps).sub(0, 0, 0, (a.r() - 0.5) * 10);
    const vieja = v === 'vieja';
    g.elip(0, 0, 0, 14, 34, 1.6, { mat: 'tierra', tono: -0.05 });
    g.elip(0, 0, 0, 11, 30, vieja ? 3.5 : 6.5, { mat: 'tierra', tono: vieja ? -0.04 : 0.02 });
    if (!vieja) for (let i = 0; i < 9; i++) g.elip((a.r() - 0.5) * 14, (a.r() - 0.5) * 46, 3 + a.r() * 2, 1.8 + a.r() * 1.5, 1.8 + a.r() * 1.5, 1.3 + a.r(), { mat: 'tierra', tono: 0.06, giro: a.r() * 90 });
    if (vieja) { for (let i = 0; i < 8; i++) g.elip((a.r() - 0.5) * 16, (a.r() - 0.5) * 50, 1.8, 3 + a.r() * 3, 4 + a.r() * 4, 1.6, { mat: a.r() < 0.6 ? 'pasto' : 'musgo', giro: a.r() * 90 }); matas(g, 6, 11, 28); }
    if (v === 'con_cruz') {
      const c = g.sub(0, -27, 0, (a.r() - 0.5) * 20, (a.r() - 0.5) * 12);
      c.caja(0, 0, -2, 3, 3, 30, { mat: 'madera_vieja' }); c.caja(0, 0, 18, 14, 2.6, 3, { mat: 'madera_vieja', tono: 0.05 });
      c.caja(0, 0, 17.5, 3.6, 3.4, 4, { mat: 'cuerda' });
      c.elip(0, 2, 6, 3, 1.5, 2, { mat: 'hojas_otono', tono: -0.15 });
    }
    if (v === 'con_piedras') {
      for (let i = 0; i < 16; i++) { const t = (i / 16) * Math.PI * 2; g.elip(Math.cos(t) * 13.5, Math.sin(t) * 32, 0.8, 2.5 + a.r() * 1.5, 2.5 + a.r() * 1.5, 1.8 + a.r() * 1.3, { mat: 'roca', giro: a.r() * 90, tono: 0.05 }); }
      g.elip(0, -30, 0, 5, 3.5, 12, { mat: 'roca', tono: 0.08, incl: -6 });
    }
    if (v !== 'vieja') matas(g, 2, 13, 30);
    return ps;
  },
});

// ------------------------------------------------------------------ fosa abierta (cavada con `resta` en un bloque de tierra que no se ve de costado)
/** Bloque de suelo con la cara de arriba en z≈0.6 y los costados de adelante tan tendidos que la cámara no los ve. */
function suelo(g: G, x0: number, x1: number, y0: number, y1: number, prof: number, mat: string, tono = 0) {
  const m = prof * 1.32 + 1;
  return g.poli([[x0 - 3, y0 - 3, 0.6], [x1 + m, y0 - 3, 0.6], [x0 - 3, y1 + m, 0.6], [x1 + m * 0.7, y1 + m, 0.6], [x1 + m, y1 + m * 0.7, 0.6],
    [x0 - 1, y0 - 1, -prof], [x1 + 1, y0 - 1, -prof], [x0 - 1, y1 + 1, -prof], [x1 + 1, y1 + 1, -prof]], { mat, tono });
}
registrar({
  id: 'cem_fosa_abierta', nombre: ['Fosa abierta', 'Open grave'], tema: 'cementerio', variantes: ['con_pala', 'vacia', 'con_ataud'], huella: [3, 5], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps).sub(-4, -8, 0);
    const P = 15;
    suelo(g, -11, 11, -30, 30, P, 'tierra');
    g.caja(0, 0, -P + 1, 22, 60, P + 6, { mat: 'tierra', resta: true });
    g.caja(-11, 0, -P, 2, 60, P, { mat: 'tierra', tono: -0.12 });
    g.caja(0, -30, -P, 22, 2, P, { mat: 'tierra', tono: -0.08 });
    for (let i = 0; i < 4; i++) g.elip(-10.3, -20 + i * 13 + a.r() * 4, -P * (0.3 + a.r() * 0.5), 1.2, 2.5, 1.5, { mat: 'roca' });
    if (v === 'con_ataud') { const c = g.sub(0.5, 0, -P + 1, (a.r() - 0.5) * 6); ataud(c, 'cerrado'); }
    // el montón de tierra sacada, del lado de atrás
    g.elip(-20, 0, 0, 9, 26, 10, { mat: 'tierra', tono: 0.04 });
    for (let i = 0; i < 7; i++) g.elip(-18 + (a.r() - 0.5) * 8, (a.r() - 0.5) * 44, 3 + a.r() * 6, 2 + a.r() * 2, 2.5 + a.r() * 2, 1.5 + a.r(), { mat: 'tierra', tono: 0.08, giro: a.r() * 90 });
    for (let i = 0; i < 5; i++) g.elip(13 + a.r() * 6, -26 + a.r() * 52, 0.5, 1.5 + a.r() * 2, 2 + a.r() * 2, 1, { mat: 'tierra', tono: 0.05 });
    if (v !== 'vacia') {
      const p = g.sub(-17, 8, 9, 20, -24, 'y');
      p.palo([0, 0, -6], [0, 0, 26], 1.1, { mat: 'madera' });
      p.caja(0, 0, 26, 5, 1.6, 1.6, { mat: 'madera' });
      p.poli([[-3.5, -0.7, -6], [3.5, -0.7, -6], [-3.5, 0.7, -6], [3.5, 0.7, -6], [-3, -0.6, -15], [3, -0.6, -15], [0, 0, -18]], { mat: 'hierro_oxido' });
    } else {
      g.palo([12, -22, 0.6], [-14, -18, 1.6], 1.6, { mat: 'madera_vieja' });
      g.palo([12, 20, 0.6], [-14, 23, 1.6], 1.6, { mat: 'madera_vieja' });
      g.palo([-12, -22, 2], [-8, 10, 2], 0.9, { mat: 'cuerda' });
    }
    return ps;
  },
});

// ------------------------------------------------------------------ ataúd
registrar({
  id: 'cem_ataud', nombre: ['Ataúd', 'Coffin'], tema: 'cementerio', variantes: ['cerrado', 'abierto', 'con_esqueleto', 'roto'], huella: [2, 4], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps).sub(2, 0, 0, (a.r() - 0.5) * 16);
    tierra(g, 12, 30, 2, 'tierra');
    ataud(g, v === 'cerrado' ? 'cerrado' : v === 'abierto' ? 'abierto' : v === 'roto' ? 'roto' : 'esqueleto', v === 'roto' ? 'madera_vieja' : a.r() < 0.5 ? 'madera' : 'madera_vieja');
    return ps;
  },
});

// ------------------------------------------------------------------ sarcófago
registrar({
  id: 'cem_sarcofago', nombre: ['Sarcófago', 'Sarcophagus'], tema: 'cementerio', variantes: ['efigie', 'liso', 'abierto', 'roto'], huella: [2, 4], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps);
    const m = v === 'liso' ? 'marmol' : 'cem_lapida';
    g.caja(0, 0, 0, 30, 68, 4, { mat: m, tono: -0.08 });
    g.caja(0, 0, 4, 26, 64, 17, { mat: m });
    g.caja(0, 0, 19, 28, 66, 2.5, { mat: m, tono: 0.04 });
    // arcadas talladas en los costados
    for (let i = 0; i < 4; i++) g.sub(13, -24 + i * 16, 0, -90).prisma(ojiva(10, 5, 0.75, 3, 7), -1.5, 1.5, { mat: m, resta: true });
    g.sub(0, 32, 0).prisma(ojiva(14, 4, 0.75, 3, 7), -1.5, 1.5, { mat: m, resta: true });
    g.caja(0, 32.2, 8, 3, 1.6, 9, { mat: m, tono: 0.06 }); g.caja(0, 32.2, 13, 8, 1.6, 2.6, { mat: m, tono: 0.06 });
    if (v === 'abierto' || v === 'roto') {
      g.caja(0, 0, 8, 20, 58, 20, { mat: m, resta: true });
      g.caja(0, 0, 4, 22, 60, 4, { mat: 'negro' });
      hueso(g, [-4, -10, 9], [5, 6, 8.5], 1.1); hueso(g, [3, -18, 8.5], [-6, -2, 8.8], 1);
      calavera(g.sub(-2, -24, 8, 40 + a.r() * 40), 3.3);
    }
    if (v === 'abierto') {
      const t = g.sub(19, 8, 0, 6, -18, 'y');
      t.caja(0, 0, 0, 30, 68, 5, { mat: m, tono: 0.03 });
      g.caja(31, 24, 0, 8, 10, 4, { mat: m, giro: 30 });
    } else if (v === 'roto') {
      const t = g.sub(-2, -10, 21.5, 3, 4, 'y');
      t.poli([[-15, -34, 0], [15, -34, 0], [-15, 12, 0], [15, 4, 0], [-15, -34, 4.5], [15, -34, 4.5], [-15, 12, 4.5], [15, 4, 4.5]], { mat: m });
      const t2 = g.sub(14, 22, 0, 30, -40, 'y');
      t2.poli([[-14, -6, 0], [14, -10, 0], [-14, 12, 0], [14, 12, 0], [-14, -6, 4.5], [14, -10, 4.5], [-14, 12, 4.5], [14, 12, 4.5]], { mat: m, tono: -0.03 });
      for (let i = 0; i < 4; i++) g.caja(18 + a.r() * 10, 26 + a.r() * 12, 0, 3 + a.r() * 3, 3 + a.r() * 2, 2 + a.r() * 2, { mat: m, giro: a.r() * 90 });
    } else {
      g.caja(0, 0, 21.5, 30, 70, 3.5, { mat: m, tono: 0.04 });
      g.poli([[-13, -33, 25], [13, -33, 25], [-13, 33, 25], [13, 33, 25], [-9, -29, 28], [9, -29, 28], [-9, 29, 28], [9, 29, 28]], { mat: m, tono: 0.06 });
      if (v === 'efigie') {
        const e = g.sub(0, 0, 28);
        e.caja(0, -24, 0, 12, 7, 2.5, { mat: m, tono: 0.08 });
        e.esf(0, -23, 4.5, 3.6, { mat: m, tono: 0.12 });
        e.elip(0, 2, 2, 7.5, 22, 3.6, { mat: m, tono: 0.08 });
        e.elip(0, -14, 3.5, 7, 6, 3, { mat: m, tono: 0.1 });
        e.elip(0, -8, 5.8, 2.2, 2.8, 1.6, { mat: m, tono: 0.16 });
        e.palo([0, -9, 6], [0, 18, 5], 1.1, { mat: m, tono: 0.18 }); e.caja(0, -6, 5.5, 7, 1.6, 1.4, { mat: m, tono: 0.18 });
        for (const s of [-1, 1]) e.elip(s * 3, 25, 3.5, 1.8, 2, 3, { mat: m, tono: 0.08 });
      } else {
        g.caja(0, -6, 28, 3, 30, 1.8, { mat: m, tono: 0.1 }); g.caja(0, -13, 28, 14, 3, 1.8, { mat: m, tono: 0.1 });
      }
      if (v === 'liso') for (let i = 0; i < 3; i++) g.elip((a.r() - 0.5) * 30, 36 + a.r() * 4, 0.3, 3, 3, 1, { mat: 'musgo' });
    }
    tierra(g, 18, 36, 3, 'tierra', 0, 0);
    return ps;
  },
});

// ------------------------------------------------------------------ mausoleo
registrar({
  id: 'cem_mausoleo', nombre: ['Mausoleo', 'Mausoleum'], tema: 'cementerio', variantes: ['cerrado', 'abierto', 'en_ruinas', 'cerrado_der', 'abierto_der'], huella: [5, 5], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [];
    const g = new G(a, ps).sub(0, 0, 0, v.endsWith('_der') ? -90 : 0).sub(0, -4, 0);
    const ruina = v === 'en_ruinas', abierto = v.startsWith('abierto') || ruina;
    const piedra = 'piedra_bloques', liso = 'cem_lapida';
    // plataforma y escalones
    g.caja(0, -2, 0, 82, 70, 5, { mat: 'piedra_gris', tono: -0.06 });
    g.caja(0, 36, 0, 40, 6, 3.4, { mat: 'piedra_gris', tono: -0.03 }); g.caja(0, 41.5, 0, 44, 5, 1.7, { mat: 'piedra_gris' });
    // cuerpo con zócalo y pilastras
    g.caja(0, -9, 5, 70, 48, 4, { mat: liso, tono: -0.08 });
    g.caja(0, -9, 5, 66, 44, 58, { mat: piedra });
    for (const x of [-32, 32]) g.caja(x, 13, 5, 6, 3, 58, { mat: liso, tono: 0.02 });
    // puerta ojival en la cara de adelante (y = 13)
    const puerta = ojiva(22, 26, 0.8, 4, 5);
    g.prisma(ojiva(28, 27, 0.8, 4, 5), 11.5, 16, { mat: piedra, resta: true });
    g.prisma(puerta, 6, 16, { mat: piedra, resta: true });
    g.caja(0, 13, 51, 26, 3, 5, { mat: piedra, resta: true });
    for (let i = 0; i < 3; i++) g.caja(-8 + i * 8, 11.6, 52, 5, 1, 1.6, { mat: liso, tono: -0.2 });
    if (!abierto) {
      g.prisma(puerta, 7, 9, { mat: 'bronce', tono: -0.18 });
      for (const z of [12, 24]) g.caja(0, 9, z, 22, 1.2, 2, { mat: 'hierro' });
      g.caja(0, 9, 5, 1.4, 1.2, 40, { mat: 'negro' });
      for (const s of [-1, 1]) g.cil(s * 3, 9.6, 20, 1.6, 0.8, { mat: 'hierro', eje: [0, 1, 0] });
    } else {
      g.prisma(puerta, 6, 7, { mat: 'negro' });
      if (!ruina) g.sub(-10.5, 8, 5, -70).caja(5.5, 0, 0, 11, 1.8, 36, { mat: 'bronce', tono: -0.2 });
      else for (let i = 0; i < 3; i++) g.caja(-6 + a.r() * 12, 26 + a.r() * 8, 5, 4 + a.r() * 4, 3 + a.r() * 3, 2 + a.r() * 2, { mat: piedra, giro: a.r() * 90 });
    }
    // ventana angosta del costado
    g.caja(33, -12, 24, 4, 5, 18, { mat: piedra, resta: true });
    g.caja(31.5, -12, 24, 1, 5, 18, { mat: 'negro' });
    for (const y of [-13.5, -10.5]) g.caja(33, y, 24, 1.2, 1.2, 18, { mat: 'hierro' });
    // pórtico: columnas y dintel
    const cols = [-27, -15, 15, 27];
    cols.forEach((x, i) => {
      const rota = ruina && i === 3;
      g.caja(x, 26, 5, 8, 8, 2.5, { mat: liso, tono: -0.04 });
      g.cil(x, 26, 7.5, 3, rota ? 18 + a.r() * 8 : 44, { mat: 'marmol', tono: -0.18 });
      if (!rota) { g.cil(x, 26, 51.5, 3, 3, { mat: 'marmol', tono: -0.15, r1: 4.8 }); g.caja(x, 26, 54.5, 10, 10, 2, { mat: liso }); }
    });
    if (ruina) { g.cil(38, 34, 3, 3, 11, { mat: 'marmol', tono: -0.2, eje: [0.4, 1, 0] }); g.cil(26, 46, 3, 3, 9, { mat: 'marmol', tono: -0.2, eje: [1, 0.3, 0] }); }
    g.caja(0, 18.5, 56.5, 74, 19, 6.5, { mat: liso, tono: 0.02 });
    g.caja(0, 18.5, 62, 76, 20, 1.6, { mat: liso, tono: 0.08 });
    // frontón y techo de pizarra
    g.poli([[-37, -34, 63], [37, -34, 63], [-37, 27, 63], [37, 27, 63], [0, -34, 82], [0, 27, 82]], { mat: piedra });
    g.cil(0, 24, 71, 5, 5, { mat: piedra, resta: true, eje: [0, 1, 0] });
    g.cil(0, 25, 71, 5, 1, { mat: 'vidrio', tono: -0.1, eje: [0, 1, 0] });
    g.caja(0, 27.5, 66.5, 1.4, 1, 9, { mat: 'hierro' }); g.caja(0, 27.5, 70.3, 9, 1, 1.4, { mat: 'hierro' });
    for (const s of [-1, 1]) g.poli([[s * 41, -37, 61.5], [s * 41, 30, 61.5], [0, -37, 84], [0, 30, 84], [s * 41, -37, 64], [s * 41, 30, 64], [0, -37, 86.5], [0, 30, 86.5]], { mat: 'pizarra' });
    // cruz arriba y urnas en las esquinas
    if (!ruina) { g.caja(0, 28, 84, 3, 3, 14, { mat: liso, tono: 0.05 }); g.caja(0, 28, 93, 10, 3, 3, { mat: liso, tono: 0.05 }); }
    for (const s of [-1, 1]) { g.cil(s * 36, 27, 63, 2.5, 2, { mat: liso }); g.elip(s * 36, 27, 67, 3.2, 3.2, 3.6, { mat: liso }); g.cil(s * 36, 27, 70, 1.6, 2.5, { mat: liso, r1: 2.4 }); }
    if (ruina) {
      g.poli([[-29, -28, 9], [29, -28, 9], [-29, 10, 9], [29, 10, 9], [-29, -28, 61], [29, -28, 61], [-29, 10, 61], [29, 10, 61], [0, -28, 79], [0, 10, 79]], { mat: piedra, resta: true });
      g.caja(0, -9, 5, 60, 40, 4.5, { mat: 'piedra_gris', tono: -0.15 });
      g.caja(0, -27.6, 9, 58, 1.2, 60, { mat: piedra, tono: -0.28 }); g.caja(-28.6, -9, 9, 1.2, 38, 60, { mat: piedra, tono: -0.22 });
      g.poli([[5, -40, 70], [45, -40, 55], [5, 10, 80], [45, 10, 60], [20, -40, 100], [45, -40, 100], [20, 10, 100], [45, 10, 100]], { mat: piedra, resta: true });
      g.poli([[16, -20, 40], [36, -20, 40], [36, 5, 50], [24, -10, 70], [36, -20, 70]], { mat: piedra, resta: true });
      g.caja(-12, 14.4, 30, 1.2, 2, 22, { mat: piedra, resta: true, giro: 0, incl: 12, inclEje: 'y' });
      for (let i = 0; i < 7; i++) g.caja(40 + a.r() * 10, -30 + a.r() * 50, 0, 5 + a.r() * 6, 4 + a.r() * 5, 3 + a.r() * 4, { mat: a.r() < 0.5 ? piedra : 'pizarra', giro: a.r() * 90, incl: (a.r() - 0.5) * 20 });
      for (let i = 0; i < 6; i++) g.elip((a.r() - 0.5) * 70, 14 + a.r() * 2, 6 + a.r() * 20, 3 + a.r() * 3, 1.2, 2 + a.r() * 3, { mat: 'musgo' });
    }
    tierra(g, 46, 46, 6, 'tierra', 0, 2);
    matas(g, 6, 44, 44, 0, 2);
    return ps;
  },
});

// ------------------------------------------------------------------ entrada a la cripta: escalones que bajan a lo oscuro
registrar({
  id: 'cem_entrada_cripta', nombre: ['Entrada a la cripta', 'Crypt entrance'], tema: 'cementerio', variantes: ['abierta', 'con_reja', 'derruida'], huella: [4, 5], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps).sub(-10, -4, 0);
    const P = 19, piedra = 'piedra_bloques';
    suelo(g, -16, 16, -38, 24, P, 'tierra');
    g.caja(0, -8, -P, 18, 64, P + 8, { mat: 'tierra', resta: true });
    g.caja(-10, -8, -P, 2, 64, P, { mat: piedra, tono: -0.1 });
    g.caja(0, -40, -P, 22, 2, P, { mat: piedra, tono: -0.2 });
    g.caja(0, -26, -P, 18, 28, 1.5, { mat: 'negro' });
    for (let i = 0; i < 5; i++) { const zt = -3.5 * (i + 1); g.caja(0, 24 - 6 * i - 3, -P, 18, 6, P + zt, { mat: 'piedra_gris', tono: -0.07 * i }); }
    // muretes a los lados de la bajada
    for (const s of [-1, 1]) { g.caja(s * 11.5, 9, 0, 5, 30, 2.5, { mat: piedra }); g.caja(s * 11.5, 9, 2.5, 6.5, 31, 1.4, { mat: 'cem_lapida' }); }
    g.caja(0, 25.5, 0, 28, 3, 1.4, { mat: 'cem_lapida', tono: -0.05 });
    // la portada: muros, frente con arco y techo a dos aguas
    const ruina = v === 'derruida';
    for (const s of [-1, 1]) g.caja(s * 13, -25, 0, 6, 30, 40, { mat: piedra });
    g.caja(0, -41, 0, 32, 4, 40, { mat: piedra });
    g.caja(0, -8, 0, 32, 5, 42, { mat: piedra });
    for (const s of [-1, 1]) g.caja(s * 15, -6, 0, 5, 3, 44, { mat: 'cem_lapida', tono: -0.04 });
    g.prisma(ojiva(17, 40, 0.85, 4, -P), -12, -4, { mat: piedra, resta: true });
    g.caja(0, -25, -P, 20, 30, 56, { mat: 'negro' });
    g.poli([[-19, -44, 41], [19, -44, 41], [-19, -4, 41], [19, -4, 41], [0, -44, 55], [0, -4, 55]], { mat: piedra });
    for (const s of [-1, 1]) g.poli([[s * 21, -46, 40.5], [s * 21, -2, 40.5], [0, -46, 56], [0, -2, 56], [s * 21, -46, 43], [s * 21, -2, 43], [0, -46, 58.5], [0, -2, 58.5]], { mat: 'pizarra' });
    g.caja(0, -5, 44, 7, 2, 7, { mat: piedra, resta: true });
    calavera(g.sub(0, -6.5, 44.5, 90), 2.8, 'cem_lapida');
    if (!ruina) { g.caja(0, -3, 57, 3, 3, 10, { mat: 'cem_lapida' }); g.caja(0, -3, 63, 8, 3, 2.6, { mat: 'cem_lapida' }); }
    if (v === 'con_reja') {
      for (let i = 0; i < 5; i++) { const x = -6 + i * 3; g.palo([x, -6, -P + 2], [x, -6, 30 - Math.abs(x) * 0.8], 0.8, { mat: 'hierro' }); }
      for (const z of [-2, 14, 24]) g.caja(0, -6, z, 15, 1.4, 1.6, { mat: 'hierro_oxido' });
      g.caja(5, -5, 10, 3, 2, 4, { mat: 'hierro' });
    }
    if (ruina) {
      g.poli([[2, -50, 60], [25, -50, 20], [2, 0, 60], [25, 0, 28], [10, -50, 80], [25, -50, 80], [10, 0, 80], [25, 0, 80]], { mat: piedra, resta: true });
      for (let i = 0; i < 6; i++) g.caja(22 + a.r() * 12, -30 + a.r() * 30, 0, 4 + a.r() * 5, 4 + a.r() * 4, 2 + a.r() * 4, { mat: a.r() < 0.6 ? piedra : 'pizarra', giro: a.r() * 90, incl: (a.r() - 0.5) * 24 });
      for (let i = 0; i < 2; i++) g.caja(-3 + a.r() * 6, 8 + a.r() * 10, -6 - a.r() * 6, 4, 4, 3, { mat: piedra, giro: a.r() * 90 });
    }
    matas(g, 5, 22, 30, 0, -8);
    return ps;
  },
});

// ------------------------------------------------------------------ reja de hierro y portón
function barrotes(g: G, x0: number, x1: number, paso: number, z0: number, alto: (x: number) => number, rota: boolean) {
  const a = g.a;
  for (let x = x0; x <= x1 + 0.01; x += paso) {
    if (rota && a.r() < 0.18) continue;
    const h = alto(x), dob = rota && a.r() < 0.3;
    const top: V3 = dob ? [x + (a.r() - 0.5) * 8, 4 + a.r() * 5, h - 3] : [x, 0, h];
    const mat = rota && a.r() < 0.5 ? 'hierro_oxido' : 'hierro';
    g.palo([x, 0, z0], top, 0.95, { mat });
    if (!dob) g.poli([[x - 1.3, 0, h], [x + 1.3, 0, h], [x, -0.8, h], [x, 0.8, h], [x, 0, h + 4]], { mat });
  }
}
registrar({
  id: 'cem_reja', nombre: ['Reja del cementerio', 'Cemetery fence'], tema: 'cementerio', variantes: ['x', 'y', 'x_rota', 'y_rota'], huella: [3, 1], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps).sub(0, 0, 0, v.startsWith('y') ? -90 : 0);
    const rota = v.endsWith('rota');
    g.caja(0, 0, 0, 48, 6, 4, { mat: 'cem_lapida', tono: -0.06 });
    for (const x of [-24, 24]) { g.caja(x, 0, 0, 7, 7, 38, { mat: 'piedra_bloques' }); g.caja(x, 0, 38, 9, 9, 2.4, { mat: 'cem_lapida' }); g.poli([[x - 3.5, -3.5, 40.4], [x + 3.5, -3.5, 40.4], [x - 3.5, 3.5, 40.4], [x + 3.5, 3.5, 40.4], [x, 0, 45]], { mat: 'cem_lapida', tono: 0.05 }); }
    barrotes(g, -18, 18, 4, 4, () => 31, rota);
    g.caja(0, 0, 9, 41, 1.6, 2, { mat: 'hierro' });
    if (rota) { g.caja(-10, 0, 28, 20, 1.6, 2, { mat: 'hierro_oxido' }); g.sub(8, 3, 0, 20, -60, 'y').caja(0, 0, 0, 18, 1.6, 2, { mat: 'hierro_oxido' }); tierra(g, 14, 8, 3); }
    else g.caja(0, 0, 28, 41, 1.6, 2, { mat: 'hierro' });
    if (rota) for (let i = 0; i < 3; i++) g.elip(-18 + a.r() * 36, 2, 1, 3, 2, 2 + a.r() * 3, { mat: 'hojas', tono: -0.1 });
    matas(g, 3, 20, 5);
    return ps;
  },
});
const altoArco = (x: number, w: number, hr: number, k: number) => { const rr = k * w, cx = w / 2 - rr, ax = Math.abs(x); return hr + Math.sqrt(Math.max(0, rr * rr - (ax - cx) ** 2)); };
/** Una hoja de portón de hierro: bisagra en el origen del grupo, se abre hacia +x local. */
function hojaReja(g: G, ancho: number, alto: (x: number) => number) {
  barrotes(g, 1.5, ancho - 1, 3.2, 1, alto, false);
  for (const z of [3, 16]) g.caja(ancho / 2, 0, z, ancho, 1.6, 1.8, { mat: 'hierro' });
  g.caja(0.8, 0, 1, 2, 2, alto(0) + 1, { mat: 'hierro' });
  g.caja(ancho - 0.6, 0, 1, 1.6, 1.8, alto(ancho) - 2, { mat: 'hierro' });
  for (let i = 0; i < 2; i++) g.elip(ancho / 2, 0, 9.5, 3.4 - i, 0.7, 3.4 - i, { mat: 'hierro', tono: i * 0.08 });
}
registrar({
  id: 'cem_porton', nombre: ['Portón del cementerio', 'Cemetery gate'], tema: 'cementerio', variantes: ['cerrado_x', 'abierto_x', 'cerrado_y', 'abierto_y'], huella: [3, 1], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps).sub(0, 0, 0, v.endsWith('_y') ? -90 : 0);
    const abierto = v.startsWith('abierto');
    for (const x of [-24, 24]) {
      g.caja(x, 0, 0, 10, 10, 48, { mat: 'piedra_bloques' }); g.caja(x, 0, 0, 12, 12, 5, { mat: 'cem_lapida', tono: -0.05 });
      g.caja(x, 0, 48, 12, 12, 3, { mat: 'cem_lapida' }); g.poli([[x - 4.5, -4.5, 51], [x + 4.5, -4.5, 51], [x - 4.5, 4.5, 51], [x + 4.5, 4.5, 51], [x, 0, 54]], { mat: 'cem_lapida' });
      g.esf(x, 0, 56.5, 3, { mat: 'cem_lapida', tono: 0.05 });
    }
    const L = 18.8;
    for (const s of [-1, 1]) {
      const ang = abierto ? (s < 0 ? -72 : 72) + (a.r() - 0.5) * 10 : 0;
      const h = g.sub(s * 19, 0, 0, s < 0 ? ang : 180 + ang);
      hojaReja(h, L, (x) => 32 + 9 * Math.sin((x / L) * Math.PI / 2));
    }
    if (!abierto) { g.caja(0, 0.8, 18, 3, 1.4, 6, { mat: 'hierro_oxido' }); g.cil(0, 1.2, 14, 1.6, 1.2, { mat: 'hierro_oxido', eje: [0, 1, 0] }); }
    tierra(g, 26, 9, 4);
    return ps;
  },
});

// ------------------------------------------------------------------ ángel que llora
registrar({
  id: 'cem_angel', nombre: ['Ángel que llora', 'Weeping angel statue'], tema: 'cementerio', variantes: ['intacta', 'rota', 'con_musgo'], huella: [1, 1], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps);
    const musgo = v === 'con_musgo', rota = v === 'rota';
    const m = musgo ? 'cem_lapida_musgo' : 'marmol', t = musgo ? 0 : -0.16;
    tierra(g, 12, 12, 3);
    g.caja(0, 0, 0, 17, 17, 4, { mat: 'cem_lapida', tono: -0.05 }); g.caja(0, 0, 4, 13, 13, 10, { mat: musgo ? 'cem_lapida_musgo' : 'cem_lapida' });
    g.caja(0, 0, 14, 16, 16, 2.5, { mat: 'cem_lapida', tono: 0.04 });
    g.caja(0, 6.5, 6, 8, 2, 5, { mat: 'cem_lapida', resta: true });
    const s = g.sub(0, 0, 16.5, 70 + (a.r() - 0.5) * 16);
    s.cil(0, 0, 0, 7.4, 2, { mat: m, tono: t, r1: 7 });
    s.cil(0, 0, 2, 7, 22, { mat: m, tono: t, r1: 4.3 });
    for (let i = 0; i < 3; i++) s.caja(4 + i * 0.5, -2.5 + i * 2.5, 1, 1.2, 1.4, 20 - i * 2, { mat: m, tono: t - 0.1, giro: 0 });
    s.elip(0.4, 0, 28.5, 4.2, 5.2, 7, { mat: m, tono: t });
    for (const k of [-1, 1]) { s.palo([0, k * 4.6, 32], [3.6, k * 2.6, 28.5], 1.6, { mat: m, tono: t }); s.palo([3.6, k * 2.6, 28.5], [4.2, k * 1.3, 35.5], 1.4, { mat: m, tono: t }); }
    if (!rota) {
      s.esf(2.4, 0, 37.2, 3.2, { mat: m, tono: t + 0.03 });
      s.elip(1.4, 0, 38.2, 3.3, 3.5, 3.3, { mat: m, tono: t - 0.04 });
    } else {
      s.cil(1.5, 0, 34, 1.6, 2, { mat: m, tono: t });
      const c = g.sub(10, 5, 0, 70);
      c.esf(0, 0, 3, 3.2, { mat: m, tono: t }); c.elip(-1, 0, 3.6, 3.3, 3.5, 3.3, { mat: m, tono: t - 0.04 });
    }
    for (const k of [-1, 1]) s.elip(4.6, k * 1, 36.6, 1.5, 1.3, 2.2, { mat: m, tono: t + 0.05 });
    // alas: plumas grandes arriba y la punta que cae
    for (const k of [-1, 1]) {
      if (rota && k > 0) { s.poli([[-3, k * 2, 33], [-3, k * 2, 28], [-5, k * 7, 37], [-6, k * 6, 30], [-4, k * 2.4, 33.5]], { mat: m, tono: t }); continue; }
      s.poli([[-3, k * 2, 33], [-3, k * 2, 27], [-4.2, k * 2, 33], [-11, k * 8, 50], [-12, k * 13, 42], [-12, k * 11, 46], [-9.5, k * 6, 49]], { mat: m, tono: t + 0.12 });
      s.poli([[-3.2, k * 3, 30], [-11.6, k * 12.5, 42], [-8.5, k * 9, 24], [-5.5, k * 5, 16], [-4.6, k * 4.6, 28], [-6.6, k * 6.5, 18]], { mat: m, tono: t + 0.06 });
    }
    if (rota) {
      const w = g.sub(-9, 9, 1, 30, 80, 'y');
      w.poli([[0, 0, 0], [0, 6, 0], [2, 0, 14], [1.5, 6, 11], [1, 10, 3]], { mat: m, tono: t });
      g.caja(-4.6, 4.5, 16.5, 4, 4, 3, { mat: m, tono: t });
      g.caja(5, 2.6, 30, 1.4, 4, 14, { mat: m, resta: true, giro: 45, incl: 15, inclEje: 'y' });
    }
    if (musgo) {
      for (let i = 0; i < 6; i++) s.elip((a.r() - 0.3) * 8, (a.r() - 0.5) * 10, 1 + a.r() * 26, 2.5, 2.5, 2, { mat: 'musgo' });
      for (let i = 0; i < 4; i++) g.elip((a.r() - 0.5) * 14, 7, 2 + a.r() * 12, 2.6, 1.2, 2.4, { mat: 'musgo' });
      s.poli([[-4, -11, 42], [-6, -13, 41], [-4, -10, 36]], { mat: 'musgo' });
    }
    matas(g, 3, 11, 11);
    return ps;
  },
});

// ------------------------------------------------------------------ calaveras y huesos
const mirar = (a: Arma) => (a.r() < 0.8 ? 10 + a.r() * 70 : a.r() * 360);
registrar({
  id: 'cem_pila_calaveras', nombre: ['Pila de calaveras', 'Skull pile'], tema: 'cementerio', variantes: ['piramide', 'monton'], huella: [1, 1], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps);
    tierra(g, 13, 12, 3);
    if (v === 'piramide') {
      const capas: [number, number][] = [[3, 0], [2, 5.4], [1, 10.8]];
      for (const [n, z] of capas) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const x = (i - (n - 1) / 2) * 6.8 + (a.r() - 0.5), y = (j - (n - 1) / 2) * 6.8 + (a.r() - 0.5);
        calavera(g.sub(x, y, z, n === 1 ? 45 : mirar(a), (a.r() - 0.5) * 10), 3.4);
      }
    } else {
      g.elip(0, 0, 0, 11, 10, 6, { mat: 'hueso', tono: -0.22 });
      for (let i = 0; i < 6; i++) hueso(g, [(a.r() - 0.5) * 18, (a.r() - 0.5) * 16, 2 + a.r() * 3], [(a.r() - 0.5) * 18, (a.r() - 0.5) * 16, 1 + a.r() * 4], 0.9);
      const pos: V3[] = [[-6, 5, 1], [3, 7, 1], [8, -1, 1], [-8, -4, 1], [0, -7, 1.5], [-3, 1, 4.5], [4, 1, 4], [0, -2, 8]];
      for (const p of pos) calavera(g.sub(p[0] + (a.r() - 0.5) * 2, p[1] + (a.r() - 0.5) * 2, p[2], mirar(a), (a.r() - 0.5) * 30, 'y'), 3.2 + a.r() * 0.4);
    }
    return ps;
  },
});
registrar({
  id: 'cem_pila_huesos', nombre: ['Montón de huesos', 'Bone pile'], tema: 'cementerio', variantes: ['chico', 'grande'], huella: [1, 1], bloquea: false,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps);
    const R = v === 'grande' ? 13 : 9;
    tierra(g, R + 2, R, 2);
    if (v === 'grande') g.elip(0, 0, 0, R * 0.8, R * 0.7, 5, { mat: 'hueso', tono: -0.25 });
    const n = v === 'grande' ? 16 : 8;
    for (let i = 0; i < n; i++) {
      const t = a.r() * 6.28, q = a.r() * R * 0.7, L = 6 + a.r() * 7, b = a.r() * 6.28;
      const cx = Math.cos(t) * q, cy = Math.sin(t) * q, z = v === 'grande' ? 1.5 + (1 - q / R) * 4 : 1.2;
      hueso(g, [cx - Math.cos(b) * L / 2, cy - Math.sin(b) * L / 2, z + a.r() * 2], [cx + Math.cos(b) * L / 2, cy + Math.sin(b) * L / 2, z], 0.85 + a.r() * 0.3);
    }
    for (let i = 0; i < (v === 'grande' ? 3 : 1); i++) calavera(g.sub((a.r() - 0.5) * R, (a.r() - 0.5) * R, v === 'grande' ? 3 : 0.5, mirar(a), (a.r() - 0.5) * 30), 3.3);
    for (let i = 0; i < 3; i++) { const y = (a.r() - 0.5) * 6; g.palo([R * 0.3, y - 3, 2], [R * 0.3 + 4, y - 2, 1], 1, { mat: 'hueso', tono: -0.04 }); }
    return ps;
  },
});

// ------------------------------------------------------------------ urna funeraria
registrar({
  id: 'cem_urna', nombre: ['Urna funeraria', 'Funeral urn'], tema: 'cementerio', variantes: ['piedra', 'bronce', 'rota'], huella: [1, 1], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps);
    tierra(g, 10, 10, 2);
    g.caja(0, 0, 0, 12, 12, 3, { mat: 'cem_lapida', tono: -0.06 }); g.caja(0, 0, 3, 9, 9, 10, { mat: 'piedra_bloques' }); g.caja(0, 0, 13, 11, 11, 2, { mat: 'cem_lapida' });
    g.caja(0, 4.6, 5, 5, 1.5, 5, { mat: 'cem_lapida', resta: true });
    const m = v === 'bronce' ? 'bronce' : 'cem_lapida', t = v === 'bronce' ? -0.1 : 0.04;
    const urna = (u: G) => {
      u.cil(0, 0, 0, 3.2, 1.6, { mat: m, tono: t, r1: 2.2 }); u.cil(0, 0, 1.6, 1.8, 2, { mat: m, tono: t });
      u.elip(0, 0, 8, 5.4, 5.4, 5.6, { mat: m, tono: t }); u.cil(0, 0, 12.5, 2.6, 2.4, { mat: m, tono: t, r1: 3.4 });
      u.cil(0, 0, 14.9, 3.6, 1, { mat: m, tono: t + 0.05 });
      for (const s of [-1, 1]) u.elip(s * 5.4, 0, 10.5, 0.9, 1, 2.2, { mat: m, tono: t });
    };
    if (v !== 'rota') {
      urna(g.sub(0, 0, 15, a.r() * 90));
      g.elip(0, 0, 32.5, 3, 3, 1.8, { mat: m, tono: t }); g.esf(0, 0, 34.8, 1.2, { mat: m, tono: t + 0.08 });
      if (v === 'bronce') for (let i = 0; i < 3; i++) g.elip((a.r() - 0.5) * 6, 4.6, 20 + a.r() * 8, 1.4, 1, 1.6, { mat: 'piedra_musgo', tono: 0.1 });
    } else {
      const u = g.sub(4, 9, 4.6, 200 + a.r() * 40, 92, 'y');
      urna(u);
      u.caja(0, 0, 11, 14, 14, 10, { mat: m, resta: true });
      g.elip(3, 14, 0, 7, 5, 1.4, { mat: 'roca', tono: -0.25 });
      for (let i = 0; i < 4; i++) g.caja(-6 + a.r() * 16, 8 + a.r() * 10, 0, 2 + a.r() * 2, 2 + a.r() * 2, 1.2, { mat: m, giro: a.r() * 90 });
      g.elip(-7, 10, 0.4, 3, 2.4, 1.6, { mat: m, tono: 0.02 });
    }
    return ps;
  },
});

// ------------------------------------------------------------------ velas sobre la tumba (animadas)
function vela(g: G, x: number, y: number, h: number, r: number, f: number, k: number) {
  const a = g.a;
  g.cil(x, y, 0, r, h, { mat: 'cera', tono: (a.r() - 0.5) * 0.1 });
  g.elip(x, y, 0, r * 2, r * 1.8, 0.8, { mat: 'cera', tono: -0.08 });
  if (a.r() < 0.6) g.elip(x + r * 0.7, y + r * 0.5, h * 0.6, 0.8, 0.8, h * 0.3, { mat: 'cera', tono: 0.05 });
  const fl = Math.sin(((f + k * 1.7) / 4) * Math.PI * 2);
  g.cil(x + fl * 0.2, y, h + 0.3, 1.1, 3.6 + fl * 0.7, { mat: 'fuego', r1: 0.1 });
  g.elip(x, y, h + 1.2, 0.7, 0.7, 1.1, { mat: 'luz_vela' });
}
registrar({
  id: 'cem_velas', nombre: ['Velas de la tumba', 'Grave candles'], tema: 'cementerio', variantes: ['tres', 'muchas', 'con_calavera'], cuadros: 4, t: 3, huella: [1, 1], bloquea: false,
  armar: (v, f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps);
    tierra(g, 10, 9, 2);
    let zc = 8;
    if (v === 'muchas') {
      g.caja(0, 0, 0, 22, 14, 3, { mat: 'cem_lapida', giro: 10, tono: -0.05 });
      const s = g.sub(0, 0, 3, 10);
      const pos: [number, number][] = [[-8, -4], [-4, 2], [1, -3], [5, 3], [8, -2], [-1, 4], [3, 0]];
      pos.forEach(([x, y], i) => vela(s, x, y, 4 + a.r() * 8, 1.2 + a.r() * 0.6, f, i));
      zc = 12;
    } else if (v === 'con_calavera') {
      calavera(g.sub(0, 0, 0, 45), 4);
      const s = g.sub(-0.4, 0, 7.4);
      vela(s, 0, 0, 5, 1.3, f, 0);
      vela(g, 7, 3, 6, 1.4, f, 1); vela(g, -3, 8, 9, 1.5, f, 2);
      zc = 14;
    } else {
      vela(g, -3, -2, 9 + a.r() * 3, 1.6, f, 0); vela(g, 3, 1, 5 + a.r() * 3, 1.5, f, 1); vela(g, -1, 5, 3 + a.r() * 2, 1.5, f, 2);
    }
    return { piezas: ps, resplandor: { c: [0, 0, zc], r: 24, color: '#ffb35a' } };
  },
});

// ------------------------------------------------------------------ farol del cementerio
function farol(g: G, encendido: boolean, f: number) {
  const fl = Math.sin((f / 4) * Math.PI * 2) * 0.08;
  g.cil(0, 0, 0, 0.8, 3, { mat: 'hierro' });
  g.poli([[-3.6, -3.6, 0], [3.6, -3.6, 0], [-3.6, 3.6, 0], [3.6, 3.6, 0], [0, 0, -2]], { mat: 'hierro', tono: 0.05 });
  g.caja(0, 0, -11, 5, 5, 9, { mat: encendido ? 'luz_vela' : 'vidrio', tono: encendido ? fl - 0.05 : -0.25 });
  for (const [x, y] of [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]]) g.caja(x, y, -11.5, 1.2, 1.2, 10, { mat: 'hierro' });
  g.caja(0, 0, -12.5, 6.4, 6.4, 1.4, { mat: 'hierro' });
  g.poli([[-3.6, -3.6, -2], [3.6, -3.6, -2], [-3.6, 3.6, -2], [3.6, 3.6, -2], [0, 0, 2.5]], { mat: 'hierro' });
}
registrar({
  id: 'cem_farol', nombre: ['Farol del cementerio', 'Cemetery lantern post'], tema: 'cementerio', variantes: ['encendido', 'apagado', 'doble'], cuadros: 4, t: 4, huella: [1, 1], bloquea: true,
  armar: (v, f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps).sub(0, 0, 0, (a.r() - 0.5) * 20);
    const lit = v !== 'apagado';
    tierra(g, 8, 8, 2);
    g.caja(0, 0, 0, 9, 9, 3, { mat: 'cem_lapida', tono: -0.05 }); g.caja(0, 0, 3, 6, 6, 4, { mat: 'cem_lapida' });
    g.cil(0, 0, 7, 2, 2, { mat: 'hierro', r1: 1.3 }); g.cil(0, 0, 9, 1.3, 47, { mat: 'hierro' });
    for (const z of [20, 40]) g.cil(0, 0, z, 1.9, 1.4, { mat: 'hierro' });
    g.cil(0, 0, 56, 1.8, 2, { mat: 'hierro' }); g.poli([[-1.4, -1.4, 58], [1.4, -1.4, 58], [-1.4, 1.4, 58], [1.4, 1.4, 58], [0, 0, 63]], { mat: 'hierro' });
    const brazos = v === 'doble' ? [0, 180] : [0];
    for (const b of brazos) {
      const s = g.sub(0, 0, 0, b);
      s.palo([0, 0, 53], [10, 0, 53], 0.9, { mat: 'hierro' }); s.palo([0, 0, 47], [7, 0, 52.5], 0.7, { mat: 'hierro' });
      s.esf(10, 0, 53, 1.3, { mat: 'hierro' });
      farol(s.sub(10, 0, 50), lit, f + b / 90);
    }
    return lit ? { piezas: ps, resplandor: { c: [6, 0, 42], r: 34, color: '#ffc070' } } : ps;
  },
});

// ------------------------------------------------------------------ flores secas
const COLOR_FLOR = ['tela_morada', 'tela_roja', 'hojas_otono', 'tela'];
function flor(g: G, p: V3, q: V3) {
  const a = g.a;
  g.palo(p, q, 0.55, { mat: 'hojas_otono', tono: -0.15 });
  g.elip(q[0], q[1], q[2], 1.5, 1.5, 1.1, { mat: COLOR_FLOR[Math.floor(a.r() * 4)], tono: -0.12 - a.r() * 0.1 });
}
registrar({
  id: 'cem_flores_secas', nombre: ['Flores secas', 'Dead flowers'], tema: 'cementerio', variantes: ['ramo', 'florero', 'corona'], huella: [1, 1], bloquea: false,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps).sub(0, 0, 0, a.r() * 360);
    if (v === 'ramo') {
      for (let i = 0; i < 7; i++) { const b = (i - 3) * 0.12 + (a.r() - 0.5) * 0.1; flor(g, [-7, 0, 0.7], [5 + a.r() * 3, Math.sin(b) * 9, 1 + a.r() * 1.5]); }
      for (let i = 0; i < 4; i++) g.elip(-1 + a.r() * 5, (a.r() - 0.5) * 5, 0.8, 2, 1, 0.5, { mat: 'hojas', tono: -0.2, giro: a.r() * 180 });
      g.cil(-3, -1.6, 0.8, 1.3, 2, { mat: 'tela_roja', tono: -0.1, eje: [1, 0, 0] });
      for (let i = 0; i < 3; i++) g.elip(4 + a.r() * 6, (a.r() - 0.5) * 10, 0.3, 1.2, 1, 0.4, { mat: COLOR_FLOR[i % 3], tono: -0.2 });
    } else if (v === 'florero') {
      g.cil(0, 0, 0, 3.4, 1.5, { mat: 'cem_lapida', r1: 2.4 }); g.cil(0, 0, 1.5, 2.4, 4, { mat: 'cem_lapida', r1: 3.2 }); g.cil(0, 0, 5.5, 3.2, 3, { mat: 'cem_lapida', r1: 4 });
      g.cil(0, 0, 8.2, 3.3, 0.4, { mat: 'negro' });
      for (let i = 0; i < 7; i++) {
        const t = (i / 7) * 6.28 + a.r() * 0.5, cae = a.r() < 0.3;
        const top: V3 = [Math.cos(t) * (cae ? 9 : 3.5), Math.sin(t) * (cae ? 9 : 3.5), cae ? 5 + a.r() * 3 : 15 + a.r() * 5];
        g.palo([Math.cos(t), Math.sin(t), 7], [top[0] * 0.6, top[1] * 0.6, top[2] + (cae ? 6 : -1)], 0.55, { mat: 'hojas_otono', tono: -0.15 });
        flor(g, [top[0] * 0.6, top[1] * 0.6, top[2] + (cae ? 6 : -1)], top);
      }
      for (let i = 0; i < 3; i++) g.elip((a.r() - 0.5) * 12, (a.r() - 0.5) * 12, 0.3, 1.2, 1, 0.4, { mat: COLOR_FLOR[i], tono: -0.22 });
    } else {
      // corona apoyada en un caballete de palos
      const c = g.sub(0, 0, 0, 0);
      c.palo([-6, 2, 0], [-2, 0, 22], 0.8, { mat: 'madera_vieja' }); c.palo([6, 2, 0], [2, 0, 22], 0.8, { mat: 'madera_vieja' }); c.palo([0, -5, 0], [0, 0, 20], 0.8, { mat: 'madera_vieja' });
      for (let i = 0; i < 14; i++) {
        const t = (i / 14) * 6.28, x = Math.cos(t) * 7, z = 13 + Math.sin(t) * 7;
        c.elip(x, 1.6, z, 2.3, 1.6, 2.3, { mat: i % 3 === 0 ? 'pino' : 'hojas', tono: -0.08 - a.r() * 0.1, giro: a.r() * 90 });
        if (i % 2 === 0) c.elip(x * 1.02, 3, z, 1.4, 1, 1.4, { mat: COLOR_FLOR[i % 4], tono: -0.12 });
      }
      c.caja(0, 2.5, 3, 3, 0.8, 6, { mat: 'tela_morada', tono: -0.1, giro: 8 }); c.caja(2, 2.5, 3, 3, 0.8, 6, { mat: 'tela_morada', tono: -0.15, giro: -12 });
      for (let i = 0; i < 4; i++) c.elip((a.r() - 0.5) * 12, 4 + a.r() * 6, 0.3, 1.3, 1, 0.5, { mat: 'hojas_otono', tono: -0.2 });
    }
    return ps;
  },
});

// ------------------------------------------------------------------ muro del cementerio y su arco de entrada
function muroCem(g: G, largo: number, alto: number, roto: boolean) {
  const a = g.a;
  g.caja(0, 0, 0, largo + 2, 15, 4, { mat: 'cem_lapida', tono: -0.08 });
  g.caja(0, 0, 0, largo, 12, alto, { mat: a.r() < 0.75 ? 'piedra_bloques' : 'piedra_musgo' });
  g.caja(0, 0, alto, largo + 2, 15, 1.6, { mat: 'cem_lapida' });
  g.poli([[-largo / 2 - 1, -7.5, alto + 1.6], [largo / 2 + 1, -7.5, alto + 1.6], [-largo / 2 - 1, 7.5, alto + 1.6], [largo / 2 + 1, 7.5, alto + 1.6], [-largo / 2 - 1, 0, alto + 5], [largo / 2 + 1, 0, alto + 5]], { mat: 'cem_lapida', tono: 0.04 });
  for (let i = 0; i < 4; i++) g.caja(-largo / 2 + 6 + a.r() * (largo - 12), 6.5, 6 + a.r() * (alto - 14), 6 + a.r() * 4, 3, 4 + a.r() * 2, { mat: 'piedra', resta: true });
  if (roto) {
    const c = (a.r() - 0.5) * 20;
    g.poli([[c - 18, -12, alto + 8], [c + 20, -12, alto + 8], [c - 18, 12, alto + 8], [c + 20, 12, alto + 8], [c - 2, -12, alto * 0.35], [c + 4, 12, alto * 0.4], [c - 9, 0, alto * 0.6], [c + 12, 0, alto * 0.55]], { mat: 'piedra', resta: true });
    for (let i = 0; i < 7; i++) g.caja(c + (a.r() - 0.5) * 24, 8 + a.r() * 10, 0, 4 + a.r() * 5, 4 + a.r() * 4, 2 + a.r() * 4, { mat: a.r() < 0.6 ? 'piedra_bloques' : 'cem_lapida', giro: a.r() * 90, incl: (a.r() - 0.5) * 30 });
  }
  for (let i = 0; i < 5; i++) g.elip(-largo / 2 + a.r() * largo, 6.2, a.r() * alto * 0.5, 3 + a.r() * 4, 1.2, 2 + a.r() * 5, { mat: a.r() < 0.5 ? 'musgo' : 'hojas', tono: -0.1 });
  matas(g, 5, largo / 2, 8);
}
registrar({
  id: 'cem_muro', nombre: ['Muro del cementerio', 'Cemetery wall'], tema: 'cementerio', variantes: ['x', 'y', 'x_roto', 'y_roto'], huella: [5, 1], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps).sub(0, 0, 0, v.startsWith('y') ? -90 : 0);
    muroCem(g, 80, 50, v.endsWith('roto'));
    for (const x of [-38, 38]) { g.caja(x, 0, 0, 8, 17, 56, { mat: 'piedra_bloques', tono: 0.03 }); g.caja(x, 0, 56, 10, 19, 2.5, { mat: 'cem_lapida' }); }
    return ps;
  },
});
registrar({
  id: 'cem_arco_entrada', nombre: ['Arco de entrada del cementerio', 'Cemetery archway'], tema: 'cementerio', variantes: ['abierto_x', 'reja_x', 'abierto_y', 'reja_y'], huella: [5, 1], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps).sub(0, 0, 0, v.endsWith('_y') ? -90 : 0);
    const W = 28, HR = 32, K = 0.8;
    g.caja(0, 0, 0, 82, 15, 4, { mat: 'cem_lapida', tono: -0.08 });
    g.caja(0, 0, 0, 80, 12, 50, { mat: 'piedra_bloques' });
    g.caja(0, 0, 0, 42, 18, 70, { mat: 'piedra_bloques', tono: 0.03 });
    g.caja(0, 0, 70, 46, 21, 2.5, { mat: 'cem_lapida' });
    g.poli([[-23, -10.5, 72.5], [23, -10.5, 72.5], [-23, 10.5, 72.5], [23, 10.5, 72.5], [0, -10.5, 86], [0, 10.5, 86]], { mat: 'piedra_bloques', tono: 0.03 });
    for (const s of [-1, 1]) g.poli([[s * 24.5, -12, 71.5], [s * 24.5, 12, 71.5], [0, -12, 86.5], [0, 12, 86.5], [s * 24.5, -12, 74], [s * 24.5, 12, 74], [0, -12, 89], [0, 12, 89]], { mat: 'cem_lapida', tono: 0.02 });
    g.caja(0, 0, 88, 3, 3, 12, { mat: 'cem_lapida' }); g.caja(0, 0, 95, 9, 3, 2.6, { mat: 'cem_lapida' });
    for (const s of [-1, 1]) { g.caja(s * 40, 0, 50, 2, 15, 1.6, { mat: 'cem_lapida' }); g.caja(s * 30, 0, 50, 22, 15, 1.6, { mat: 'cem_lapida' }); g.poli([[s * 41, -7.5, 51.6], [s * 19, -7.5, 51.6], [s * 41, 7.5, 51.6], [s * 19, 7.5, 51.6], [s * 41, 0, 55], [s * 19, 0, 55]], { mat: 'cem_lapida', tono: 0.04 }); }
    // arco con moldura: primero un rebaje y después el paso
    g.prisma(ojiva(W + 6, HR, K, 5, 0), 6, 12, { mat: 'piedra', resta: true });
    g.prisma(ojiva(W, HR, K, 5, 0), -12, 12, { mat: 'piedra', resta: true });
    g.caja(0, 9, 62, 14, 2, 5, { mat: 'piedra', resta: true });
    calavera(g.sub(0, 7.6, 61.6, 90), 3, 'cem_lapida');
    if (v.startsWith('reja')) for (const s of [-1, 1]) { const h = g.sub(s * (W / 2 - 0.5), 0, 0, s < 0 ? 0 : 180); hojaReja(h, W / 2 - 0.6, (x) => altoArco(W / 2 - x - 0.5, W, HR, K) - 3); }
    for (let i = 0; i < 6; i++) g.elip((a.r() - 0.5) * 78, 6.5 + (a.r() < 0.5 ? 3 : 0), a.r() * 30, 3 + a.r() * 3, 1.2, 3 + a.r() * 4, { mat: a.r() < 0.5 ? 'musgo' : 'hojas', tono: -0.1 });
    tierra(g, 18, 12, 3);
    matas(g, 4, 38, 9);
    return ps;
  },
});
