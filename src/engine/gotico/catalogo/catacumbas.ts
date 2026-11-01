import { registrar, type Arma, type Pieza, type V3 } from '../objeto';
import { MATERIALES } from '../materiales';

// Catacumbas y cárcel: paredes de nichos con calaveras, el pilar osario, rejas y puertas de celda, poste con cadenas,
// potro, doncella de hierro, jaulas, banco del preso, mesa del guardia, cama de paja, rejilla del piso, ataúdes
// apilados y montones de huesos.

MATERIALES.cat_toba = { rampa: ['#13110e', '#221d18', '#322a22', '#44392d', '#574939', '#6b5a46', '#806d56'], ruido: 0.5, escala: 0.2, patron: (p) => ((Math.floor(p[2] / 9) + Math.floor((p[0] + p[1]) / 13)) % 2 ? 0.05 : -0.05) };

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

/** Mancha de tierra en el piso, con piedritas. */
function tierra(g: G, rx: number, ry: number, n = 3, mat = 'tierra', x = 0, y = 0) {
  const a = g.a;
  g.elip(x, y, 0, rx, ry, 1.4, { mat, giro: (a.r() - 0.5) * 30 });
  for (let i = 0; i < n; i++) { const t = a.r() * Math.PI * 2, q = 0.5 + a.r() * 0.5; g.elip(x + Math.cos(t) * rx * q, y + Math.sin(t) * ry * q, 0.4, 1.2 + a.r(), 1 + a.r(), 0.9 + a.r() * 0.6, { mat: a.r() < 0.5 ? 'roca' : 'tierra', tono: 0.05, giro: a.r() * 90 }); }
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
const orient = (v: string) => (v.includes('der') ? -90 : 0);
/** Huesos sueltos tirados en una zona. */
function huesos(g: G, n: number, rx: number, ry: number, x = 0, y = 0, z = 0.9) {
  const a = g.a;
  for (let i = 0; i < n; i++) {
    const cx = x + (a.r() - 0.5) * 2 * rx, cy = y + (a.r() - 0.5) * 2 * ry, L = 5 + a.r() * 6, b = a.r() * 6.28;
    hueso(g, [cx - Math.cos(b) * L / 2, cy - Math.sin(b) * L / 2, z + a.r() * 0.8], [cx + Math.cos(b) * L / 2, cy + Math.sin(b) * L / 2, z], 0.85 + a.r() * 0.25);
  }
}
const mirar = (a: Arma) => (a.r() < 0.8 ? 10 + a.r() * 70 : a.r() * 360);
/** Cadena colgando entre dos puntos: eslabones alternados. */
function cadena(g: G, p: V3, q: V3, comba = 3) {
  const n = Math.max(3, Math.round(Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) / 2.6));
  for (let i = 0; i <= n; i++) {
    const t = i / n, c = Math.sin(t * Math.PI) * comba;
    const x = p[0] + (q[0] - p[0]) * t, y = p[1] + (q[1] - p[1]) * t, z = p[2] + (q[2] - p[2]) * t - c;
    g.elip(x, y, z, 1.2, i % 2 ? 0.5 : 1.2, 1.5, { mat: 'hierro', tono: i % 2 ? -0.05 : 0.05 });
  }
}
/** Grillete: un aro de hierro. */
function grillete(g: G, x: number, y: number, z: number, eje: V3 = [0, 0, 1]) {
  g.cil(x, y, z, 2.6, 1.6, { mat: 'hierro', eje });
  g.cil(x - eje[0], y - eje[1], z - eje[2], 1.7, 3.6, { mat: 'hierro', resta: true, eje });
}

// ------------------------------------------------------------------ pared de nichos
registrar({
  id: 'cat_nichos', nombre: ['Pared de nichos', 'Burial niche wall'], tema: 'catacumbas', variantes: ['izq', 'der', 'izq_saqueado', 'der_saqueado'], huella: [5, 2], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps).sub(0, 0, 0, orient(v));
    const saq = v.endsWith('saqueado');
    g.caja(0, 0, 0, 80, 18, 98, { mat: 'cat_toba' });
    g.caja(0, 0, 98, 82, 20, 3, { mat: 'cat_toba', tono: 0.05 });
    for (const x of [-40, 40]) g.caja(x, 0, 0, 8, 22, 101, { mat: 'ladrillo', tono: -0.05 });
    const filas = [8, 38, 68], cols = [-24, 0, 24];
    const contenido: string[] = [];
    for (const z of filas) for (const x of cols) {
      g.sub(x, 0, 0).prisma(ojiva(19, 11, 0.5, 4, z), -3, 11, { mat: 'cat_toba', resta: true });
      contenido.push(a.r() < 0.35 ? 'calaveras' : a.r() < 0.55 ? 'cuerpo' : a.r() < 0.8 ? 'sellado' : 'huesos');
    }
    let k = 0;
    for (const z of filas) for (const x of cols) {
      const c = saq && contenido[k] === 'sellado' ? 'huesos' : contenido[k]; k++;
      const n = g.sub(x, 2, z);
      g.caja(x, 9, z - 1.5, 21, 3, 1.5, { mat: 'ladrillo', tono: 0.05 });
      if (c === 'calaveras') { for (let i = 0; i < 3; i++) calavera(n.sub(-6 + i * 6 + (a.r() - 0.5), 1 + (a.r() - 0.5) * 2, 0, 80 + (a.r() - 0.5) * 40), 3.1); }
      else if (c === 'cuerpo') { n.elip(0, 0, 3.2, 9, 3.6, 3, { mat: 'tela', tono: -0.15 }); n.esf(-8, 0, 3.6, 2.8, { mat: 'tela', tono: -0.1 }); for (const xx of [-4, 1, 5]) n.cil(xx, -3.7, 3.2, 3.2, 0.8, { mat: 'cuerda', eje: [1, 0, 0] }); }
      else if (c === 'sellado') { n.caja(0, 7.4, 0, 19, 1.6, 16, { mat: 'piedra' }); n.caja(0, 8.4, 6, 10, 1, 1.2, { mat: 'negro' }); n.caja(0, 8.4, 9, 7, 1, 1.2, { mat: 'negro' }); }
      else { hueso(n, [-6, 2, 1.2], [5, 0, 1], 0.9); hueso(n, [-3, -2, 1.2], [7, 3, 2], 0.9); calavera(n.sub(-6, 2, 1.5, mirar(a)), 3); }
    }
    if (saq) {
      for (let i = 0; i < 3; i++) g.sub(-26 + i * 24 + a.r() * 6, 14 + a.r() * 6, 1, a.r() * 50 - 25, 80 + a.r() * 8).caja(0, 0, 0, 19, 1.6, 15, { mat: 'piedra', tono: -0.05 });
      huesos(g, 10, 34, 6, 0, 18);
      for (let i = 0; i < 3; i++) calavera(g.sub(-30 + a.r() * 60, 14 + a.r() * 10, 0, mirar(a)), 3.2);
    }
    tierra(g, 40, 10, 5, 'tierra', 0, 12);
    return ps;
  },
});

// ------------------------------------------------------------------ pilar osario
registrar({
  id: 'cat_osario', nombre: ['Pilar osario', 'Ossuary pillar'], tema: 'catacumbas', variantes: ['entero', 'derrumbado'], huella: [2, 2], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps);
    const roto = v === 'derrumbado', filas = roto ? 5 : 9;
    g.caja(0, 0, 0, 30, 30, 5, { mat: 'cat_toba', tono: -0.05 });
    g.caja(0, 0, 5, 24, 24, roto ? 56 : 96, { mat: 'hueso', tono: -0.3 });
    if (!roto) { g.caja(0, 0, 100, 30, 30, 4, { mat: 'cat_toba' }); g.caja(0, 0, 104, 26, 26, 6, { mat: 'cat_toba', tono: 0.04 }); }
    else g.poli([[-12, -12, 61], [12, -12, 61], [-12, 12, 61], [12, 12, 61], [-12, -12, 68], [6, -12, 75], [-12, 4, 72]], { mat: 'hueso', tono: -0.3 });
    // calaveras metidas en las dos caras que se ven, con hileras de huesos largos entre medio
    for (let f = 0; f < filas; f++) {
      const z = 8 + f * 10.4;
      for (const [nx, ny] of [[1, 0], [0, 1]]) {
        g.palo([nx * 12.5 + ny * -12, ny * 12.5 + nx * -12, z + 8.6], [nx * 12.5 + ny * 12, ny * 12.5 + nx * 12, z + 8.6], 1.1, { mat: 'hueso', tono: -0.05 });
        for (let i = -1; i <= 1; i++) {
          const x = nx * 11 + ny * i * 7.6, y = ny * 11 + nx * i * 7.6;
          const c = g.sub(x, y, z, nx ? 0 : 90);
          c.elip(0.5, 0, 3.2, 3.1, 3, 3, { mat: 'hueso', tono: (a.r() - 0.5) * 0.1 });
          for (const s of [-1, 1]) c.esf(2.6, s * 1.2, 3.4, 1, { mat: 'negro' });
          c.caja(3.2, 0, 1.1, 0.8, 1, 1.2, { mat: 'negro' });
        }
      }
    }
    if (roto) {
      for (let i = 0; i < 9; i++) calavera(g.sub(14 + a.r() * 10, -10 + a.r() * 26, a.r() < 0.3 ? 4 : 0, mirar(a), (a.r() - 0.5) * 30), 3.2);
      huesos(g, 10, 8, 14, 20, 2);
      g.elip(18, 4, 0, 10, 14, 4, { mat: 'hueso', tono: -0.3 });
    }
    return ps;
  },
});

// ------------------------------------------------------------------ rejas y puertas de celda
function barras(g: G, x0: number, x1: number, paso: number, alto: number, rota: boolean) {
  const a = g.a;
  for (let x = x0; x <= x1 + 0.01; x += paso) {
    if (rota && a.r() < 0.15) { g.palo([x, 0, 0], [x, 0, 6 + a.r() * 8], 1.1, { mat: 'hierro_oxido' }); continue; }
    if (rota && a.r() < 0.3) { const d = 5 + a.r() * 6; g.palo([x, 0, 0], [x, d * 0.5, alto * 0.45], 1.1, { mat: 'hierro_oxido' }); g.palo([x, d * 0.5, alto * 0.45], [x, 0, alto], 1.1, { mat: 'hierro_oxido' }); continue; }
    g.palo([x, 0, 0], [x, 0, alto], 1.1, { mat: rota && a.r() < 0.5 ? 'hierro_oxido' : 'hierro' });
  }
}
registrar({
  id: 'cat_reja_celda', nombre: ['Reja de celda', 'Cell bars'], tema: 'catacumbas', variantes: ['izq', 'der', 'izq_doblada', 'der_doblada'], huella: [3, 1], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps).sub(0, 0, 0, orient(v));
    const rota = v.endsWith('doblada');
    g.caja(0, 0, 0, 50, 9, 4, { mat: 'cat_toba', tono: -0.05 });
    g.caja(0, 0, 64, 50, 10, 7, { mat: 'madera_vieja' });
    for (const x of [-24, 24]) g.caja(x, 0, 0, 5, 9, 66, { mat: 'madera_vieja', tono: 0.04 });
    barras(g.sub(0, 0, 4), -19, 19, 4.75, 60, rota);
    for (const z of [22, 46]) g.caja(0, 0, z, 46, 2, 2.4, { mat: rota && z > 30 ? 'hierro_oxido' : 'hierro' });
    if (rota) tierra(g, 16, 8, 3, 'tierra', 0, 8);
    return ps;
  },
});
function puertaBarras(g: G, ancho: number, alto: number) {
  g.caja(ancho / 2, 0, 0, ancho, 2.2, 2.6, { mat: 'hierro' }); g.caja(ancho / 2, 0, alto - 2.6, ancho, 2.2, 2.6, { mat: 'hierro' });
  g.caja(ancho / 2, 0, alto * 0.48, ancho, 2.2, 2.4, { mat: 'hierro' });
  g.caja(1.2, 0, 0, 2.4, 2.4, alto, { mat: 'hierro' }); g.caja(ancho - 1.2, 0, 0, 2.4, 2.4, alto, { mat: 'hierro' });
  for (let x = 6; x < ancho - 3; x += 4.6) g.palo([x, 0, 1], [x, 0, alto - 1], 1, { mat: 'hierro' });
  g.caja(ancho - 4, 1.8, alto * 0.45, 4.5, 2.4, 6, { mat: 'hierro_oxido' }); g.caja(ancho - 4, 3.1, alto * 0.47, 1, 0.4, 2, { mat: 'negro' });
  for (const z of [6, alto - 8]) g.cil(0, 0, z, 1.8, 4, { mat: 'hierro' });
}
registrar({
  id: 'cat_puerta_celda', nombre: ['Puerta de celda', 'Cell door'], tema: 'catacumbas', variantes: ['cerrada_izq', 'abierta_izq', 'cerrada_der', 'abierta_der'], huella: [2, 1], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps).sub(0, 0, 0, orient(v));
    g.caja(0, 0, 0, 36, 9, 4, { mat: 'cat_toba', tono: -0.05 });
    g.caja(0, 0, 64, 36, 10, 7, { mat: 'madera_vieja' });
    for (const x of [-16, 16]) g.caja(x, 0, 0, 5, 9, 66, { mat: 'madera_vieja', tono: 0.04 });
    const ang = v.startsWith('abierta') ? 78 + (a.r() - 0.5) * 16 : 0;
    puertaBarras(g.sub(-13, 0, 4, ang), 26, 58);
    if (ang) { g.palo([-4, 10, 0.6], [6, 16, 0.8], 0.5, { mat: 'hierro' }); g.cil(-5, 9, 0.4, 2.2, 0.8, { mat: 'hierro' }); g.cil(-5, 9, 0, 1.5, 2, { mat: 'hierro', resta: true }); }
    return ps;
  },
});

// ------------------------------------------------------------------ poste con cadenas y grilletes
/** Esqueleto colgado: el tumbado puesto de pie (la cara hacia +y del grupo). */
const colgado = (g: G, x: number, y: number, giro: number) => esqueleto(g.sub(x, y, 30, giro, -90, 'x'), 1.5);
registrar({
  id: 'cat_poste_cadenas', nombre: ['Poste con cadenas', 'Chained post'], tema: 'catacumbas', variantes: ['vacio', 'con_esqueleto', 'con_sangre'], huella: [1, 1], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps).sub(0, 0, 0, (a.r() - 0.5) * 20);
    tierra(g, 13, 13, 4);
    g.caja(0, -2, 0, 7, 7, 74, { mat: 'madera_vieja' });
    g.caja(0, -2, 74, 9, 9, 3, { mat: 'madera_vieja', tono: 0.05 });
    for (const z of [62, 22]) { g.caja(0, -2, z, 8, 8, 2.4, { mat: 'hierro' }); }
    if (v === 'con_esqueleto') {
      colgado(g, 0, 4, 0);
      for (const s of [-1, 1]) { cadena(g, [s * 4, 2, 63], [s * 6.5, 5, 50], 1); grillete(g, s * 6.5, 5, 48); }
    } else {
      for (const s of [-1, 1]) { cadena(g, [s * 4, 2, 63], [s * 5, 4, 40], 2); grillete(g, s * 5, 4.5, 37, [0, 1, 0.4]); }
      cadena(g, [3, 2, 22], [8, 9, 1], 2); grillete(g, 9, 10, 0.2); grillete(g, 5, 12, 0.2);
    }
    if (v === 'con_sangre') {
      g.elip(0, 1.6, 40, 2.5, 0.6, 12, { mat: 'sangre' }); g.elip(1, 1.7, 52, 3.5, 0.6, 3, { mat: 'sangre' });
      g.elip(3, 8, 0, 9, 6, 0.6, { mat: 'sangre' }); g.elip(-5, 12, 0, 3, 2, 0.5, { mat: 'sangre' });
    }
    huesos(g, v === 'vacio' ? 2 : 3, 8, 6, 2, 9);
    return ps;
  },
});

// ------------------------------------------------------------------ potro de tortura
registrar({
  id: 'cat_potro', nombre: ['Potro de tortura', 'Torture rack'], tema: 'catacumbas', variantes: ['vacio', 'con_esqueleto', 'con_sangre'], huella: [2, 4], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps).sub(0, 0, 0, (a.r() - 0.5) * 8);
    const m = 'madera_vieja';
    for (const s of [-1, 1]) {
      g.caja(s * 11, 0, 20, 4, 68, 4, { mat: m });
      for (const y of [-30, 30]) g.caja(s * 11, y, 0, 4, 4, 20, { mat: m, tono: -0.05 });
      g.palo([s * 11, -30, 4], [s * 11, 30, 4], 1.4, { mat: m });
    }
    for (const y of [-14, -2, 10]) g.caja(0, y, 22.5, 20, 6, 1.6, { mat: 'madera', tono: -0.05 });
    for (const y of [-31, 31]) {
      g.cil(-14, y, 26, 3.2, 28, { mat: m, eje: [1, 0, 0] });
      for (const ang of [0, 90]) { const c = Math.cos(ang * GR) * 8, s2 = Math.sin(ang * GR) * 8; g.palo([15, y - c, 26 - s2], [15, y + c, 26 + s2], 1.1, { mat: 'madera' }); }
      g.cil(-14, y, 26, 3.4, 1.4, { mat: 'hierro', eje: [1, 0, 0] }); g.cil(12.6, y, 26, 3.4, 1.4, { mat: 'hierro', eje: [1, 0, 0] });
    }
    const con = v !== 'vacio';
    if (con) {
      esqueleto(g.sub(0, 0, 23.8, 0), 0.6);
      for (const s of [-1, 1]) { g.palo([s * 3, -31, 28], [s * 6, -24, 26], 0.8, { mat: 'cuerda' }); g.palo([s * 3, 31, 28], [s * 3.6, 27, 26], 0.8, { mat: 'cuerda' }); }
    } else {
      for (const s of [-1, 1]) { g.palo([s * 3, -29, 28.5], [s * 5, -12, 24], 0.8, { mat: 'cuerda' }); g.palo([s * 3, 29, 28.5], [s * 6, 14, 24], 0.8, { mat: 'cuerda' }); grillete(g, s * 5, -12, 24); grillete(g, s * 6, 14, 24); }
    }
    if (v === 'con_sangre') { g.elip(0, 0, 24.2, 7, 14, 0.5, { mat: 'sangre' }); g.elip(4, 4, 0, 10, 16, 0.6, { mat: 'sangre' }); g.elip(12.8, 2, 17, 0.8, 2, 4, { mat: 'sangre' }); }
    tierra(g, 18, 36, 4);
    return ps;
  },
});

// ------------------------------------------------------------------ doncella de hierro
const PERFIL_D: P2[] = [[-10, 0], [10, 0], [8, -6.5], [-8, -6.5]];
registrar({
  id: 'cat_doncella', nombre: ['Doncella de hierro', 'Iron maiden'], tema: 'catacumbas', variantes: ['cerrada', 'abierta', 'abierta_sangre'], huella: [2, 2], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps).sub(0, 0, 0, -20 + (a.r() - 0.5) * 10);
    const m = 'hierro_oxido', abierta = v !== 'cerrada', H = 56;
    g.caja(0, 0, 0, 26, 20, 3, { mat: 'madera_vieja' });
    const cuerpo = (gg: G, p: P2[], z0: number, z1: number, o: { mat: string; tono?: number; resta?: boolean }) => gg.poli(p.flatMap(([x, y]) => [[x, y, z0], [x, y, z1]] as V3[]), o);
    cuerpo(g, PERFIL_D, 3, H, { mat: m });
    if (abierta) {
      cuerpo(g, [[-8, 1], [8, 1], [6.5, -4.6], [-6.5, -4.6]], 6, H - 3, { mat: m, resta: true });
      cuerpo(g, [[-8, -4], [8, -4], [6.5, -4.6], [-6.5, -4.6]], 6, H - 3, { mat: 'negro' });
      for (let z = 12; z < H - 6; z += 9) for (const x of [-4, 0, 4]) g.cil(x + (z % 2), -4.5, z, 0.9, 4.5, { mat: 'hierro', r1: 0.1, eje: [0, 1, 0] });
    }
    // la cabeza con la cara de la doncella
    g.elip(0, -2.5, H + 6, 8, 6.5, 9, { mat: m });
    g.elip(0, 2.6, H + 6, 4.4, 2.4, 5.6, { mat: 'hierro', tono: 0.1 });
    for (const s of [-1, 1]) g.elip(s * 1.7, 4.4, H + 7.5, 1, 0.8, 0.6, { mat: 'negro' });
    g.elip(0, 4.6, H + 4.2, 1.2, 0.6, 0.4, { mat: 'negro' });
    g.elip(0, -2.5, H + 14, 6, 5, 2.5, { mat: m, tono: 0.05 });
    for (const z of [16, 36]) cuerpo(g, [[-10.6, 0], [10.6, 0], [8.5, -7], [-8.5, -7]], z, z + 2.4, { mat: 'hierro' });
    // la puerta (bisagra a la izquierda): se abre hacia la cámara y enseña sus clavos
    const ang = abierta ? 105 + (a.r() - 0.5) * 10 : 0;
    const d = g.sub(-10, 0, 0, ang);
    cuerpo(d, [[0, 0], [20, 0], [17.5, 5.5], [2.5, 5.5]], 3.5, H, { mat: m, tono: 0.03 });
    for (const z of [16, 36]) cuerpo(d, [[-0.4, -0.2], [20.4, -0.2], [17.8, 6.1], [2.2, 6.1]], z, z + 2.4, { mat: 'hierro' });
    d.caja(10, 5.4, 6, 1.4, 1, H - 10, { mat: 'negro' });
    for (const z of [26, 46]) d.cil(16, 5.6, z, 1.6, 1, { mat: 'hierro', eje: [0, 1, 0] });
    if (abierta) for (let z = 10; z < H - 4; z += 8) for (const x of [5, 10, 15]) d.cil(x, -0.1, z + (x % 2) * 2, 1, 4.5, { mat: 'hierro', r1: 0.1, eje: [0, -1, 0] });
    if (v === 'abierta_sangre') {
      g.elip(0, -4.2, 30, 5, 0.6, 14, { mat: 'sangre' }); d.elip(10, -0.4, 28, 6, 0.6, 12, { mat: 'sangre' });
      g.elip(4, 6, 3.2, 9, 7, 0.6, { mat: 'sangre' }); g.elip(-6, 14, 0, 5, 4, 0.5, { mat: 'sangre' });
      calavera(g.sub(3, 4, 3, 50), 3);
    }
    return ps;
  },
});

// ------------------------------------------------------------------ jaulas
function jaulaRedonda(g: G, R: number, H: number, preso: boolean) {
  g.cil(0, 0, 0, R, 1.6, { mat: 'hierro' });
  for (let i = 0; i < 10; i++) { const t = (i / 10) * Math.PI * 2; g.palo([Math.cos(t) * R * 0.95, Math.sin(t) * R * 0.95, 1], [Math.cos(t) * R * 0.95, Math.sin(t) * R * 0.95, H], 0.8, { mat: i % 3 ? 'hierro' : 'hierro_oxido' }); }
  g.cil(0, 0, H * 0.5, R + 0.3, 1.4, { mat: 'hierro' }); g.cil(0, 0, H * 0.5 - 0.5, R - 0.6, 2.4, { mat: 'hierro', resta: true });
  for (let i = 0; i < 6; i++) { const t = (i / 6) * Math.PI * 2; g.palo([Math.cos(t) * R * 0.95, Math.sin(t) * R * 0.95, H], [0, 0, H + R * 0.6], 0.8, { mat: 'hierro' }); }
  g.cil(0, 0, H - 0.6, R + 0.3, 1.4, { mat: 'hierro' }); g.cil(0, 0, H - 1, R - 0.6, 2.4, { mat: 'hierro', resta: true });
  g.cil(0, 0, H + R * 0.6 - 1, 2, 2.6, { mat: 'hierro' });
  if (preso) {
    const a = g.a;
    calavera(g.sub(-1, 2, 1.6, 50), 3.2);
    g.palo([0, -2, 2], [-1, -1, 14], 1, { mat: 'hueso' });
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) g.palo([0, -1.5, 6 + i * 3], [s * 4, 0.5, 4 + i * 3], 0.8, { mat: 'hueso', tono: -0.04 });
    g.elip(0, -1.5, 2.5, 4, 2.4, 1.8, { mat: 'hueso' });
    hueso(g, [2, 2, 2], [R + 4, 4, -10], 1.1); hueso(g, [-2, 3, 2], [-1, R + 5, -12], 1.1);
    hueso(g, [3, -4, 2.2], [-3, 2, 2], 0.9);
    g.elip(a.r() * 2, 0, 1.6, R * 0.7, R * 0.7, 0.6, { mat: 'paja', tono: -0.2 });
  }
}
registrar({
  id: 'cat_jaula', nombre: ['Jaula', 'Cage'], tema: 'catacumbas', variantes: ['colgante', 'colgante_esqueleto', 'en_el_piso'], huella: [2, 2], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps);
    if (v === 'en_el_piso') {
      const c = g.sub(0, 0, 0, (a.r() - 0.5) * 20);
      c.caja(0, 0, 0, 30, 26, 3, { mat: 'madera_vieja' });
      for (const s of [-1, 1]) for (let t = -12; t <= 12; t += 4) { c.palo([t, s * 12, 3], [t, s * 12, 36], 0.9, { mat: 'hierro' }); }
      for (const s of [-1, 1]) for (let t = -8; t <= 8; t += 4) { c.palo([s * 14, t, 3], [s * 14, t, 36], 0.9, { mat: 'hierro' }); }
      c.caja(0, 0, 35, 31, 27, 2, { mat: 'hierro' }); c.caja(0, 0, 35, 27, 23, 2.4, { mat: 'hierro', resta: true });
      for (const x of [-7, 0, 7]) c.caja(x, 0, 35, 2, 25, 2, { mat: 'hierro' });
      c.caja(0, 0, 18, 31, 27, 1.6, { mat: 'hierro', tono: -0.05 }); c.caja(0, 0, 17.8, 27, 23, 2, { mat: 'hierro', resta: true });
      c.caja(14.6, 0, 16, 1.6, 4, 5, { mat: 'hierro_oxido' });
      c.elip(-3, -2, 3, 9, 7, 1.5, { mat: 'paja', tono: -0.15 });
      calavera(c.sub(4, 3, 3, 60), 3.2); hueso(c, [-6, 4, 4], [3, 8, 4.3], 1);
      tierra(g, 20, 18, 3);
      return ps;
    }
    // la horca de la jaula: poste, brazo y riostra
    g.caja(-14, -14, 0, 14, 14, 4, { mat: 'cat_toba', tono: -0.05 });
    g.caja(-14, -14, 4, 6, 6, 94, { mat: 'madera_vieja' });
    g.caja(-1, -14, 92, 32, 5, 5, { mat: 'madera_vieja', tono: 0.04 });
    g.palo([-14, -14, 72], [-2, -14, 92], 1.5, { mat: 'madera_vieja' });
    cadena(g, [12, -14, 92], [12, -14, 78], 0);
    jaulaRedonda(g.sub(12, -14, 44, a.r() * 40), 9, 24, v === 'colgante_esqueleto');
    tierra(g, 20, 20, 3, 'tierra', -2, -4);
    if (v === 'colgante_esqueleto') huesos(g, 2, 6, 6, 14, -4);
    return ps;
  },
});

// ------------------------------------------------------------------ banco del preso, mesa del guardia, cama de paja
registrar({
  id: 'cat_banco_preso', nombre: ['Banco del preso', 'Prisoner bench'], tema: 'catacumbas', variantes: ['entero', 'roto'], huella: [3, 1], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps).sub(0, 0, 0, (a.r() - 0.5) * 12);
    for (const x of [-15, 15]) g.caja(x, 0, 0, 6, 10, 9, { mat: 'cat_toba', giro: (a.r() - 0.5) * 10 });
    if (v === 'entero') { g.caja(0, -1.5, 9, 42, 6, 2, { mat: 'madera_vieja' }); g.caja(0, 4, 9, 40, 5, 2, { mat: 'madera_vieja', tono: -0.04, giro: 1.5 }); }
    else { g.caja(-6, -1.5, 9, 26, 6, 2, { mat: 'madera_vieja' }); g.sub(8, 2, 0, 15, -14, 'y').caja(0, 0, 0, 22, 5, 2, { mat: 'madera_vieja', tono: -0.05 }); g.caja(14, 9, 0, 14, 4, 1.6, { mat: 'madera_vieja', giro: 40 }); }
    g.cil(10, 14, 0, 2.2, 1, { mat: 'hierro' }); g.cil(10, 14, 0.5, 1.4, 2, { mat: 'hierro', resta: true });
    cadena(g, [10, 14, 1], [-2, 12, 1], 0); grillete(g, -4, 12, 0.3);
    g.cil(-12, 12, 0, 3.6, 2.6, { mat: 'madera', r1: 4.2 }); g.cil(-12, 12, 1, 3.4, 3, { mat: 'madera', resta: true }); g.cil(-12, 12, 1, 3.4, 0.6, { mat: 'agua_sucia' });
    huesos(g, 1, 6, 3, 6, 10);
    return ps;
  },
});
registrar({
  id: 'cat_mesa_guardia', nombre: ['Mesa del guardia', 'Guard table'], tema: 'catacumbas', variantes: ['con_cosas', 'con_dados'], huella: [3, 2], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps).sub(0, 0, 0, (a.r() - 0.5) * 10);
    g.caja(0, 0, 13, 40, 20, 3, { mat: 'madera' });
    for (const [x, y] of [[-17, -7], [17, -7], [-17, 7], [17, 7]]) g.caja(x, y, 0, 3, 3, 13, { mat: 'madera', tono: -0.05 });
    g.caja(0, -7, 4, 34, 2, 2, { mat: 'madera', tono: -0.1 });
    const t = g.sub(0, 0, 16);
    if (v === 'con_cosas') {
      t.cil(-10, -3, 0, 2.4, 6, { mat: 'madera', r1: 2.8 }); t.cil(-10, -3, 5.6, 2.3, 0.6, { mat: 'agua_sucia' }); t.palo([-7.4, -3, 1.5], [-7.4, -3, 4.5], 0.7, { mat: 'madera' });
      t.cil(2, 3, 0, 5, 0.8, { mat: 'madera_lisa', r1: 5.5 }); t.elip(1, 3, 1.6, 3.4, 2.4, 1.8, { mat: 'paja', tono: 0.1 }); t.elip(4, 1, 1.2, 1.6, 1.2, 1, { mat: 'carne', tono: 0.05 });
      t.cil(12, -4, 0, 3, 0.6, { mat: 'hierro' }); t.cil(12, -4, 0, 2.2, 1.4, { mat: 'hierro', resta: true });
      for (const [dx, dy] of [[3, 1], [4, -2], [1, 3.5]]) t.palo([12 + dx * 0.6, -4 + dy * 0.6, 0.5], [12 + dx * 1.8, -4 + dy * 1.8, 0.5], 0.6, { mat: 'hierro' });
      t.cil(-2, -5, 0, 1.6, 5, { mat: 'cera' }); t.elip(-2, -5, 5.6, 0.6, 0.6, 1, { mat: 'negro' });
    } else {
      for (let i = 0; i < 3; i++) t.caja(-6 + a.r() * 8, -4 + a.r() * 8, 0, 2.2, 2.2, 2.2, { mat: 'hueso', giro: a.r() * 90 });
      for (let i = 0; i < 5; i++) t.caja(4 + a.r() * 10, -5 + a.r() * 10, 0, 3, 4.5, 0.4, { mat: i % 2 ? 'tela' : 'tela_roja', giro: a.r() * 90, tono: 0.05 });
      for (let i = 0; i < 6; i++) t.cil(-12 + a.r() * 6, -4 + a.r() * 8, 0, 1.2, 0.5 + (i % 3) * 0.5, { mat: 'oro', tono: -0.1 });
      t.cil(-14, 4, 0, 2.4, 6, { mat: 'madera', r1: 2.8 });
      t.caja(13, 5, 0, 8, 2, 1.5, { mat: 'acero', giro: 30 }); t.caja(9, 3, 0, 3, 3, 1.5, { mat: 'madera', giro: 30 });
    }
    // banquetas
    for (const [x, y] of [[-8, 18], [12, -18]] as [number, number][]) { g.cil(x, y, 8, 5, 2, { mat: 'madera' }); for (let i = 0; i < 3; i++) { const q = (i / 3) * Math.PI * 2; g.palo([x + Math.cos(q) * 4, y + Math.sin(q) * 4, 0], [x + Math.cos(q) * 2.5, y + Math.sin(q) * 2.5, 8], 0.8, { mat: 'madera' }); } }
    return ps;
  },
});
registrar({
  id: 'cat_cama_paja', nombre: ['Cama de paja', 'Straw bed'], tema: 'catacumbas', variantes: ['paja', 'tarima', 'con_huesos'], huella: [2, 4], bloquea: false,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps).sub(0, 0, 0, (a.r() - 0.5) * 14);
    let z = 0;
    if (v === 'tarima') {
      for (const x of [-10, 10]) g.caja(x, 0, 0, 3, 56, 4, { mat: 'madera_vieja' });
      for (let y = -24; y <= 24; y += 8) g.caja(0, y, 4, 24, 6.5, 1.6, { mat: 'madera_vieja', tono: (a.r() - 0.5) * 0.1 });
      z = 5.6;
      g.caja(0, -2, z, 21, 46, 3, { mat: 'tela', tono: -0.15 });
      z += 3;
    }
    g.elip(0, 0, z, 13, 27, 3.5, { mat: 'paja', tono: -0.1 });
    for (let i = 0; i < 14; i++) g.palo([(a.r() - 0.5) * 24, (a.r() - 0.5) * 50, z + 0.5], [(a.r() - 0.5) * 30, (a.r() - 0.5) * 56, z + 0.3], 0.6, { mat: 'paja', tono: 0.05 });
    if (v !== 'con_huesos') {
      g.sub(1, 8, z + 2.6, 8, 4, 'y').poli([[-11, -12, 0], [10, -14, 0], [-12, 12, 0], [11, 14, 0], [-9, -10, 1.6], [8, -12, 1.4], [-10, 10, 1.4], [9, 12, 1.8], [0, 0, 3]], { mat: 'tela', tono: -0.2 });
      g.elip(0, -20, z + 2.5, 6, 4, 2, { mat: 'tela', tono: -0.1 });
    } else {
      esqueleto(g.sub(0, 2, z + 1.5, 6), 1.2);
      g.sub(3, 18, z + 2.6, 0, 4, 'y').poli([[-11, -8, 0], [10, -10, 0], [-12, 10, 0], [11, 12, 0], [-9, -6, 1.6], [8, -8, 1.4], [-10, 8, 1.4], [9, 10, 1.8]], { mat: 'tela', tono: -0.25 });
    }
    g.cil(18, -18, 0, 4, 9, { mat: 'madera', r1: 4.6 }); g.cil(18, -18, 2, 3.6, 8, { mat: 'madera', resta: true });
    for (const zz of [1.5, 7]) g.cil(18, -18, zz, 4.5, 1, { mat: 'hierro' });
    g.cil(18, -18, 6, 3.7, 0.6, { mat: 'agua_sucia' });
    return ps;
  },
});

// ------------------------------------------------------------------ rejilla del piso
registrar({
  id: 'cat_rejilla', nombre: ['Rejilla del piso', 'Floor grate'], tema: 'catacumbas', variantes: ['cuadrada', 'redonda', 'oxidada'], huella: [2, 2], bloquea: false, plano: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps).sub(0, 0, 0, v === 'redonda' ? 0 : (a.r() - 0.5) * 6);
    const ox = v === 'oxidada', m = ox ? 'hierro_oxido' : 'hierro';
    if (v === 'redonda') {
      g.cil(0, 0, 0, 16, 1.4, { mat: 'cat_toba' }); g.cil(0, 0, 0.3, 11.5, 2, { mat: 'cat_toba', resta: true });
      g.cil(0, 0, 0, 11.6, 0.3, { mat: 'negro' }); g.elip(-3, 2, 0.3, 4, 2.5, 0.1, { mat: 'agua_sucia', tono: 0.15 });
      for (let x = -9; x <= 9; x += 3.6) { const L = Math.sqrt(11.5 * 11.5 - x * x); g.caja(x, 0, 0.3, 1.8, L * 2, 1.2, { mat: m }); }
      g.cil(0, 0, 0.3, 11.8, 1.3, { mat: m }); g.cil(0, 0, 0, 10.6, 2, { mat: m, resta: true });
      for (let x = -9; x <= 9; x += 3.6) { const L = Math.sqrt(10.5 * 10.5 - x * x); g.caja(x, 0, 0.3, 1.8, L * 2, 1.2, { mat: m }); }
      g.caja(0, 0, 0.3, 21, 1.8, 1.2, { mat: m });
    } else {
      g.caja(0, 0, 0, 30, 30, 1.4, { mat: 'cat_toba' }); g.caja(0, 0, 0.3, 22, 22, 2, { mat: 'cat_toba', resta: true });
      g.caja(0, 0, 0, 22.2, 22.2, 0.3, { mat: 'negro' }); g.elip(2, -3, 0.3, 5, 3, 0.1, { mat: 'agua_sucia', tono: 0.15 });
      g.caja(0, 0, 0.3, 22, 22, 1.4, { mat: m }); g.caja(0, 0, 0, 20, 20, 2.4, { mat: m, resta: true });
      for (let x = -8; x <= 8.01; x += 4) { if (ox && a.r() < 0.25) continue; g.caja(x, 0, 0.3, 1.8, 21, 1.3, { mat: m }); }
      for (const y of [-5, 5]) g.caja(0, y, 0.4, 21, 1.6, 1.1, { mat: m, tono: -0.05 });
      for (const [x, y] of [[-11.5, -11.5], [11.5, -11.5], [-11.5, 11.5], [11.5, 11.5]]) g.esf(x, y, 1.4, 1, { mat: m, tono: 0.08 });
    }
    if (ox) for (let i = 0; i < 5; i++) { const t = a.r() * 6.28; g.elip(Math.cos(t) * 14, Math.sin(t) * 14, 0.4, 3 + a.r() * 3, 2 + a.r() * 2, 0.6, { mat: 'baba', giro: a.r() * 90 }); }
    return ps;
  },
});

// ------------------------------------------------------------------ ataúdes apilados
function cajon(g: G, tono: number, abierto = false) {
  const p: V3[] = [];
  for (const [x, y] of [[-28, -6], [-28, 6], [-14, -9.5], [-14, 9.5], [30, -5.5], [30, 5.5]] as P2[]) p.push([x, y, 0], [x, y, 11]);
  g.poli(p, { mat: 'madera_vieja', tono });
  if (abierto) { g.poli(p.map(([x, y, z]) => [x * 0.9, y * 0.8, z === 0 ? 2 : 14] as V3), { mat: 'madera_vieja', resta: true }); g.poli(p.map(([x, y, z]) => [x * 0.9, y * 0.8, z === 0 ? 1.5 : 2.2] as V3), { mat: 'negro' }); return; }
  g.poli(p.map(([x, y, z]) => [x * 1.02, y * 1.06, z === 0 ? 11 : 12.6] as V3), { mat: 'madera_vieja', tono: tono + 0.05 });
  g.caja(-3, 0, 12.6, 22, 2, 0.8, { mat: 'hierro_oxido' }); g.caja(-8, 0, 12.6, 2, 9, 0.8, { mat: 'hierro_oxido' });
}
registrar({
  id: 'cat_ataudes_apilados', nombre: ['Ataúdes apilados', 'Stacked coffins'], tema: 'catacumbas', variantes: ['dos', 'tres', 'caidos'], huella: [4, 2], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps);
    const n = v === 'dos' ? 2 : 3;
    tierra(g, 34, 14, 3);
    for (let i = 0; i < (v === 'caidos' ? 2 : n); i++) cajon(g.sub((a.r() - 0.5) * 4, (a.r() - 0.5) * 3, i * 12.6, (a.r() - 0.5) * 8), (a.r() - 0.5) * 0.1);
    if (v === 'caidos') {
      cajon(g.sub(6, 19, 4, 18, -24, 'x'), -0.04);
      const c = g.sub(-6, 24, 0, -15);
      cajon(c, 0.02, true);
      esqueleto(c.sub(0, 0, 2.2, 90).sub(0, 0, 0), 1.5);
      g.sub(-24, 38, 0, 40, -70, 'x').poli([[-28, -6, 0], [-28, 6, 0], [-14, -9.5, 0], [-14, 9.5, 0], [30, -5.5, 0], [30, 5.5, 0], [-28, -6, 1.8], [-28, 6, 1.8], [-14, -9.5, 1.8], [-14, 9.5, 1.8], [30, -5.5, 1.8], [30, 5.5, 1.8]], { mat: 'madera_vieja', tono: 0.05 });
    }
    return ps;
  },
});

// ------------------------------------------------------------------ montón de huesos
registrar({
  id: 'cat_monton_huesos', nombre: ['Montón de huesos', 'Bone heap'], tema: 'catacumbas', variantes: ['chico', 'grande', 'de_calaveras'], huella: [2, 2], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps);
    const R = v === 'chico' ? 11 : 17, H = v === 'chico' ? 5 : 10;
    tierra(g, R + 3, R, 3);
    g.elip(0, 0, 0, R, R * 0.85, H, { mat: 'hueso', tono: -0.28 });
    const nb = v === 'chico' ? 10 : 22;
    for (let i = 0; i < nb; i++) {
      const t = a.r() * 6.28, q = a.r() * 0.85, cx = Math.cos(t) * R * q, cy = Math.sin(t) * R * 0.85 * q, cz = H * Math.sqrt(Math.max(0, 1 - q * q));
      const L = 6 + a.r() * 7, b = a.r() * 6.28;
      hueso(g, [cx - Math.cos(b) * L / 2, cy - Math.sin(b) * L / 2, cz + a.r() * 1.5], [cx + Math.cos(b) * L / 2, cy + Math.sin(b) * L / 2, Math.max(0.8, cz - 1.5)], 0.85 + a.r() * 0.3);
    }
    const ns = v === 'de_calaveras' ? 12 : v === 'grande' ? 4 : 2;
    for (let i = 0; i < ns; i++) {
      const t = a.r() * 6.28, q = 0.3 + a.r() * 0.75, cx = Math.cos(t) * R * q, cy = Math.sin(t) * R * 0.85 * q, cz = H * Math.sqrt(Math.max(0, 1 - q * q)) - 1.8;
      calavera(g.sub(cx, cy, Math.max(0, cz), mirar(a), (a.r() - 0.5) * 30, 'y'), 3.2 + a.r() * 0.4);
    }
    huesos(g, 4, R, R, 0, 0, 0.9);
    return ps;
  },
});
