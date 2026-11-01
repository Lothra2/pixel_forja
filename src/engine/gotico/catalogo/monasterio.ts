import { registrar, type Arma, type Pieza, type V3 } from '../objeto';
import { MATERIALES } from '../materiales';

// Monasterio y catedral gótica: muros altos (lisos, con vitral ojival, rotos), portal con puerta de madera, pilares
// redondos y en haz, altar, bancos, braseros y antorchas que arden, estatuas en pedestal, púlpito, pila bautismal,
// campana en su armazón, escaleras, rastrillo, tapiz colgado y un charco de sangre que burbujea.

MATERIALES.mon_piedra = { rampa: ['#131415', '#222427', '#33363a', '#46494e', '#5b5e63', '#727579', '#8b8d90', '#a3a4a5'], ruido: 0.3, escala: 0.25 };
MATERIALES.mon_piedra_musgo = { rampa: ['#111410', '#1e241b', '#2d3528', '#3e4737', '#525a48', '#676e5a', '#7f8670'], ruido: 0.45, escala: 0.22 };

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

/** Calavera mirando hacia +x del grupo, apoyada en z=0. */
function calavera(g: G, r = 3.3, mat = 'hueso') {
  g.elip(0, 0, r * 0.95, r * 1.08, r * 0.9, r * 0.92, { mat });
  g.elip(r * 0.55, 0, r * 0.5, r * 0.62, r * 0.72, r * 0.55, { mat, tono: -0.03 });
  for (const s of [-1, 1]) g.esf(r * 0.78, s * r * 0.4, r * 0.88, r * 0.34, { mat: 'negro' });
  g.caja(r * 0.95, 0, r * 0.38, r * 0.4, r * 0.3, r * 0.36, { mat: 'negro' });
}
/** Fuego: brasas, lenguas que suben y bajan con el cuadro y una chispa. `n` es el total de cuadros. */
function llama(g: G, x: number, y: number, z: number, R: number, H: number, f: number, n: number, mat = 'fuego') {
  const ph = (f / n) * Math.PI * 2;
  g.elip(x, y, z + R * 0.2, R, R, R * 0.45, { mat, tono: 0.12 });
  for (let k = 0; k < 5; k++) {
    const ang = (k / 5) * Math.PI * 2 + ph * 0.5, rr = k ? R * 0.5 : 0, h = H * (0.6 + 0.35 * Math.sin(ph + k * 1.9)) * (k ? 1 : 1.25);
    g.cil(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr, z, k ? R * 0.55 : R * 0.75, h, { mat, r1: 0.2, tono: k ? 0 : 0.18 });
  }
  g.esf(x + Math.sin(ph) * R * 0.4, y + Math.cos(ph) * R * 0.3, z + H * (1.05 + (f % 3) * 0.22), 0.9, { mat, tono: 0.1 });
}
/** Vela con llama que tiembla. */
function vela(g: G, x: number, y: number, z: number, h: number, r: number, f: number, n: number, k: number) {
  g.cil(x, y, z, r, h, { mat: 'cera' });
  const fl = Math.sin(((f + k * 1.3) / n) * Math.PI * 2);
  g.cil(x + fl * 0.2, y, z + h + 0.3, 1.1, 3.4 + fl * 0.7, { mat: 'fuego', r1: 0.1 });
  g.elip(x, y, z + h + 1.2, 0.7, 0.7, 1.1, { mat: 'luz_vela' });
}
const orient = (v: string) => (v.includes('der') ? -90 : 0);

// ------------------------------------------------------------------ muros de la catedral
const ALTO = 136;
/** Muro alto a lo largo de x con la cara buena hacia +y: zócalo, arcada ciega, imposta, cornisa y pilastras. */
function muroGotico(g: G, arcada = true) {
  g.caja(0, 0, 0, 82, 18, 8, { mat: 'mon_piedra', tono: -0.08 });
  g.caja(0, 0, 0, 80, 14, ALTO, { mat: 'piedra_bloques' });
  g.caja(0, 0, 50, 81, 16.5, 2.5, { mat: 'mon_piedra' });
  g.caja(0, 0, ALTO, 82, 17, 3, { mat: 'mon_piedra', tono: 0.03 }); g.caja(0, 0, ALTO + 3, 80, 15, 3, { mat: 'mon_piedra', tono: 0.06 });
  if (arcada) for (const x of [-18, 18]) g.sub(x, 0, 0).prisma(ojiva(24, 22, 0.85, 4, 8), 5, 9, { mat: 'piedra_bloques', resta: true });
  for (const x of [-40, 40]) { g.caja(x, 0, 0, 12, 22, 10, { mat: 'mon_piedra', tono: -0.05 }); g.caja(x, 0, 10, 10, 20, ALTO - 4, { mat: 'piedra_bloques', tono: 0.05 }); g.caja(x, 0, ALTO + 6, 11, 21, 3, { mat: 'mon_piedra' }); }
}
function ruinaMuro(g: G, alto: number) {
  const a = g.a, c = (a.r() - 0.5) * 24;
  g.prisma([[c - 34, alto + 20], [c + 30, alto + 20], [c + 8, alto * 0.42], [c - 14, alto * 0.5], [c - 30, alto * 0.75]], -14, 14, { mat: 'piedra', resta: true });
  g.prisma([[c + 22, alto + 20], [c + 40, alto + 20], [c + 36, alto * 0.7], [c + 28, alto * 0.78]], -14, 14, { mat: 'piedra', resta: true });
  g.caja(c - 20, 7.2, 20, 1.4, 2, 30, { mat: 'piedra', resta: true, incl: 15, inclEje: 'y' });
  for (let i = 0; i < 9; i++) g.caja(c + (a.r() - 0.5) * 40, 10 + a.r() * 16, 0, 5 + a.r() * 8, 4 + a.r() * 6, 3 + a.r() * 5, { mat: a.r() < 0.7 ? 'piedra_bloques' : 'mon_piedra', giro: a.r() * 90, incl: (a.r() - 0.5) * 30 });
  for (let i = 0; i < 4; i++) g.elip(c + (a.r() - 0.5) * 30, 7.5, 10 + a.r() * 40, 3 + a.r() * 3, 1.2, 3 + a.r() * 4, { mat: 'musgo' });
}
registrar({
  id: 'mon_muro', nombre: ['Muro de la catedral', 'Cathedral wall'], tema: 'monasterio', variantes: ['izq', 'der', 'izq_roto', 'der_roto'], huella: [5, 1], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps).sub(0, 0, 0, orient(v));
    muroGotico(g);
    if (v.endsWith('roto')) ruinaMuro(g, ALTO);
    return ps;
  },
});
registrar({
  id: 'mon_muro_vitral', nombre: ['Muro con vitral ojival', 'Wall with stained glass window'], tema: 'monasterio', variantes: ['izq', 'der', 'izq_roto', 'der_roto'], huella: [5, 1], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps).sub(0, 0, 0, orient(v));
    const roto = v.endsWith('roto');
    muroGotico(g, false);
    const W = 24, HR = 34, K = 0.85, Z = 58, top = Z + altoOjiva(W, HR, K);
    g.prisma(ojiva(W + 9, HR, K, 5, Z - 2), 4.5, 9, { mat: 'piedra_bloques', resta: true });
    g.prisma(ojiva(W, HR, K, 5, Z), -9, 9, { mat: 'piedra_bloques', resta: true });
    g.caja(0, 7, Z - 4, W + 12, 6, 2.5, { mat: 'mon_piedra', tono: 0.04 });
    if (!roto) {
      g.prisma(ojiva(W + 2, HR, K, 5, Z - 1), -1, 1, { mat: 'vidrio', tono: 0.12 });
      for (let z = Z + 8; z < top - 4; z += 9) g.caja(0, 1.4, z, W, 0.8, 1.2, { mat: 'hierro' });
      for (const x of [-6.5, 6.5]) g.caja(x, 1.4, Z, 1.2, 0.8, HR + 4, { mat: 'hierro' });
    } else {
      for (let i = 0; i < 6; i++) {
        const lado = i % 2 ? 1 : -1, z = Z + a.r() * (HR + 6);
        g.poli([[lado * W / 2, 0, z], [lado * W / 2, 0, z + 6 + a.r() * 6], [lado * (W / 2 - 4 - a.r() * 5), 0, z + 3], [lado * W / 2, 0.8, z + 3]], { mat: 'vidrio', tono: 0.08 });
      }
      for (let i = 0; i < 5; i++) g.poli([[0, 0, 0], [2.5, 0, 0], [1, 0, 0.6], [1.2, 2, 0]].map(([x, y, z]) => [x + (a.r() - 0.5) * 30, y + 9 + a.r() * 10, z] as V3), { mat: 'vidrio' });
    }
    g.caja(0, 1.8, Z, 2.6, 2.4, HR + 2, { mat: 'mon_piedra' });
    const zr = Z + HR + 7;
    g.cil(0, 1, zr, 5.2, 2.2, { mat: 'mon_piedra', eje: [0, 1, 0] });
    g.cil(0, 0, zr, 3.6, 4, { mat: 'mon_piedra', resta: true, eje: [0, 1, 0] });
    if (!roto) g.cil(0, 1.2, zr, 3.7, 0.6, { mat: 'vidrio', tono: 0.2, eje: [0, 1, 0] });
    for (const s of [-1, 1]) g.palo([s * 0.5, 2, Z + HR + 1], [s * 6, 2, zr - 2], 1.1, { mat: 'mon_piedra' });
    if (roto) ruinaMuro(g, ALTO);
    return ps;
  },
});

// ------------------------------------------------------------------ portal ojival con puerta de madera
function hojaPuerta(g: G, W: number, HR: number, K: number) {
  // perfil de la mitad izquierda del arco, corrido para que la bisagra quede en x=0
  const p = ojiva(W, HR, K, 5, 0).filter(([x]) => x <= 0.01).map(([x, z]) => [x + W / 2, z] as P2);
  p.push([W / 2, 0]);
  g.prisma(p, -1.6, 1.6, { mat: 'madera', tono: -0.05 });
  for (const z of [8, 24, 40]) g.caja(W / 4, 1.8, z, W / 2 - 1.5, 0.8, 2, { mat: 'hierro' });
  for (const z of [8, 24, 40]) for (let i = 0; i < 3; i++) g.esf(2 + i * 5, 2.3, z + 1, 0.7, { mat: 'hierro', tono: 0.1 });
  g.cil(W / 2 - 3.5, 1.6, 26, 1.8, 0.7, { mat: 'hierro_oxido', eje: [0, 1, 0] });
}
registrar({
  id: 'mon_portal', nombre: ['Portal ojival', 'Pointed arch doorway'], tema: 'monasterio', variantes: ['cerrada_izq', 'cerrada_der', 'abierta_izq', 'abierta_der'], huella: [5, 1], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps).sub(0, 0, 0, orient(v));
    const W = 34, HR = 44, K = 0.85;
    muroGotico(g, false);
    g.prisma(ojiva(W + 14, HR, K, 5, 0), 4, 9, { mat: 'piedra_bloques', resta: true });
    g.prisma(ojiva(W + 7, HR, K, 5, 0), 1, 9, { mat: 'piedra_bloques', resta: true });
    g.prisma(ojiva(W, HR, K, 5, 0), -9, 9, { mat: 'piedra_bloques', resta: true });
    for (const s of [-1, 1]) for (const d of [3.5, 7]) g.cil(s * (W / 2 + d - 0.3), 7 - d * 0.6, 0, 1.6, HR, { mat: 'mon_piedra', tono: 0.04 });
    g.prisma(ojiva(W, HR, K, 5, 0), -7.5, -6.5, { mat: 'negro' });
    const ang = v.startsWith('abierta') ? 72 + (a.r() - 0.5) * 10 : 0;
    hojaPuerta(g.sub(-W / 2, 0, 0, -ang), W, HR, K);
    hojaPuerta(g.sub(W / 2, 0, 0, 180 + ang), W, HR, K);
    g.caja(0, 11, 0, W + 16, 8, 2.5, { mat: 'mon_piedra', tono: -0.04 });
    g.caja(0, 7.5, HR + 30, 12, 2, 10, { mat: 'piedra_bloques', resta: true });
    calavera(g.sub(0, 5.8, HR + 31, 90), 3.6, 'mon_piedra');
    return ps;
  },
});

// ------------------------------------------------------------------ pilares
registrar({
  id: 'mon_pilar', nombre: ['Pilar gótico', 'Gothic pillar'], tema: 'monasterio', variantes: ['redondo', 'en_haz', 'roto', 'roto_en_haz'], huella: [2, 2], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps);
    const haz = v.includes('haz'), roto = v.startsWith('roto'), H = 128, m = 'piedra_bloques';
    g.caja(0, 0, 0, 24, 24, 6, { mat: 'mon_piedra', tono: -0.06 }); g.cil(0, 0, 6, 10.5, 3, { mat: 'mon_piedra', r1: 9 });
    if (!haz) g.cil(0, 0, 9, 7.5, H - 20, { mat: m });
    else {
      g.cil(0, 0, 9, 6.5, H - 20, { mat: m });
      for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2 + Math.PI / 8; g.cil(Math.cos(t) * 6.8, Math.sin(t) * 6.8, 9, 2.7, H - 20, { mat: 'mon_piedra', tono: i % 2 ? -0.03 : 0.03 }); }
    }
    g.cil(0, 0, H - 11, haz ? 9.5 : 7.5, 7, { mat: 'mon_piedra', r1: 11 });
    g.caja(0, 0, H - 4, 25, 25, 4, { mat: 'mon_piedra', tono: 0.05 });
    if (haz) for (let i = 0; i < 4; i++) { const t = (i / 4) * Math.PI * 2 + Math.PI / 4; g.elip(Math.cos(t) * 9, Math.sin(t) * 9, H - 7, 2.6, 2.6, 2.4, { mat: 'mon_piedra', tono: 0.08 }); }
    if (roto) {
      const c = 40 + a.r() * 35, sx = (a.r() - 0.5) * 0.6, sy = (a.r() - 0.5) * 0.4;
      g.poli([[-30, -30, c - 30 * sx - 30 * sy], [30, -30, c + 30 * sx - 30 * sy], [-30, 30, c - 30 * sx + 30 * sy], [30, 30, c + 30 * sx + 30 * sy], [-30, -30, 200], [30, -30, 200], [-30, 30, 200], [30, 30, 200]], { mat: m, resta: true });
      g.poli([[-6, -12, c - 6], [8, -12, c - 2], [0, 12, c - 4], [-4, 0, c + 12], [6, 2, c + 12]], { mat: m, resta: true });
      for (let i = 0; i < 2; i++) {
        const ang = a.r() * 360, d = 18 + i * 14;
        const t = g.sub(Math.cos(ang * GR) * d, Math.sin(ang * GR) * d, haz ? 9 : 7.5, ang + 90, 90, 'y');
        t.cil(0, 0, -9 - i * 2, haz ? 9 : 7.5, 18 + a.r() * 6, { mat: m, tono: -0.03 });
      }
      for (let i = 0; i < 7; i++) g.caja((a.r() - 0.5) * 40, (a.r() - 0.5) * 40, 0, 3 + a.r() * 5, 3 + a.r() * 5, 2 + a.r() * 3, { mat: a.r() < 0.5 ? m : 'mon_piedra', giro: a.r() * 90, incl: (a.r() - 0.5) * 30 });
      g.elip(-4, 8, c - 8, 4, 2, 4, { mat: 'musgo' });
    }
    return ps;
  },
});

// ------------------------------------------------------------------ altar
registrar({
  id: 'mon_altar', nombre: ['Altar', 'Altar'], tema: 'monasterio', variantes: ['tela_roja', 'tela_morada', 'profanado'], cuadros: 4, t: 3, huella: [3, 2], bloquea: true,
  armar: (v, f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps);
    const prof = v === 'profanado', tela = v === 'tela_morada' ? 'tela_morada' : 'tela_roja';
    g.caja(0, 0, 0, 60, 34, 4, { mat: 'mon_piedra', tono: -0.06 }); g.caja(0, 2, 4, 54, 26, 3, { mat: 'mon_piedra', tono: -0.02 });
    g.caja(0, -2, 7, 42, 17, 15, { mat: 'marmol', tono: -0.22 });
    g.caja(0, -2, 22, 46, 21, 3, { mat: 'marmol', tono: -0.14 });
    for (const x of [-14, 0, 14]) g.sub(x, 6.5, 0).prisma(ojiva(8, 4, 0.8, 3, 9), -1, 1, { mat: 'marmol', resta: true });
    if (!prof) {
      g.caja(0, -2, 25, 38, 21.6, 0.8, { mat: tela });
      g.caja(0, 8.8, 13, 26, 0.8, 12.6, { mat: tela, tono: -0.04 });
      g.caja(0, 9.2, 13, 26, 0.6, 1.4, { mat: 'oro', tono: -0.1 }); g.caja(0, 9.3, 18, 2, 0.6, 6, { mat: 'oro', tono: -0.05 }); g.caja(0, 9.3, 20, 6, 0.6, 2, { mat: 'oro', tono: -0.05 });
      g.caja(0, -8, 25.8, 6, 4, 2, { mat: 'oro', tono: -0.1 }); g.caja(0, -8, 27.8, 2.2, 2.2, 17, { mat: 'oro' }); g.caja(0, -8, 38, 10, 2.2, 2.2, { mat: 'oro' });
      g.cil(-6, 2, 25.8, 2, 1, { mat: 'oro', tono: -0.05 }); g.cil(-6, 2, 26.8, 0.8, 3, { mat: 'oro' }); g.cil(-6, 2, 29.8, 0.8, 3, { mat: 'oro', r1: 2.2 });
      g.caja(8, 1, 25.8, 7, 9, 2, { mat: 'cuero', giro: -12 }); g.caja(8, 1, 27.6, 6.4, 8.4, 0.6, { mat: 'tela', tono: 0.15, giro: -12 });
    } else {
      g.sub(0, -2, 25.8, 6).caja(-4, 0, 0, 22, 21.6, 0.8, { mat: tela, tono: -0.1 });
      g.caja(-6, 8.8, 15, 12, 0.8, 10.6, { mat: tela, tono: -0.12, incl: 6, inclEje: 'y' });
      g.sub(14, 22, 0.8, 30, 90).caja(0, 0, 0, 2.2, 2.2, 17, { mat: 'oro', tono: -0.1 }); g.sub(14, 22, 0.8, 30, 90).caja(0, -2, 10, 10, 2.2, 2.2, { mat: 'oro', tono: -0.1 });
      g.elip(4, -2, 25.3, 9, 6, 0.6, { mat: 'sangre' }); g.elip(2, 8.6, 18, 3, 0.8, 8, { mat: 'sangre' }); g.elip(8, 16, 4.3, 7, 4, 0.5, { mat: 'sangre' });
      calavera(g.sub(-10, -4, 25.8, 40), 3.3);
    }
    const n = 4;
    for (const [i, x] of [[0, -18], [1, 18]] as [number, number][]) {
      const caida = prof && i === 1;
      if (!caida) {
        g.cil(x, -6, 25, 2.6, 1.2, { mat: 'oro', tono: -0.1 }); g.cil(x, -6, 26.2, 0.9, 7, { mat: 'oro', tono: -0.05 }); g.cil(x, -6, 33.2, 2, 1, { mat: 'oro' });
        vela(g, x, -6, 34.2, 7 + (prof ? -3 : 0), 1.3, f, n, i);
      } else { const c = g.sub(x - 2, 14, 0.8, 70, 90); c.cil(0, 0, 0, 2.6, 1.2, { mat: 'oro', tono: -0.1 }); c.cil(0, 0, 1.2, 0.9, 7, { mat: 'oro', tono: -0.05 }); c.cil(0, 0, 8, 1.3, 6, { mat: 'cera' }); }
    }
    for (const [x, y, h] of [[-24, 10, 6], [-21, 13, 9], [24, 10, 5]] as [number, number, number][]) if (!prof || x < 0) vela(g, x, y, 7, h, 1.4, f, n, x + y);
    return { piezas: ps, resplandor: { c: [0, -2, 40], r: 40, color: '#ffbf6a' } };
  },
});

// ------------------------------------------------------------------ banco de iglesia
registrar({
  id: 'mon_banco', nombre: ['Banco de iglesia', 'Church pew'], tema: 'monasterio', variantes: ['izq', 'der', 'roto'], huella: [3, 1], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps).sub(0, 0, 0, orient(v) + (a.r() - 0.5) * 4);
    const m = 'madera', roto = v === 'roto';
    for (const x of [-23, 23]) {
      if (roto && x > 0) { g.sub(30, 8, 1.2, 70, 90, 'y').prisma([[-8, 0], [7, 0], [7, 2.6], [-8, 2.6]], -1.2, 1.2, { mat: m }); continue; }
      g.sub(x, 0, 0, 90).prisma([[-7, 0], [7, 0], [7, 12], [5, 13], [-5, 26], [-7, 26]], -1.3, 1.3, { mat: m, tono: -0.04 });
    }
    if (!roto) g.caja(0, 1, 9, 46, 11, 2, { mat: 'madera_lisa' });
    else { g.caja(-11, 1, 9, 24, 11, 2, { mat: 'madera_lisa' }); g.sub(1, 1, 9, 0, 14, 'y').caja(10, 0, -3, 22, 11, 2, { mat: 'madera_lisa', tono: -0.05 }); }
    g.caja(0, -5.5, 11, 46, 2, roto ? 8 : 14, { mat: m, tono: 0.03 });
    g.caja(0, -5.8, 22, 47, 3, 2, { mat: m, tono: 0.06 });
    g.caja(0, -8, 14, 44, 4, 1.4, { mat: m, tono: -0.05 });
    g.caja(0, 1, 4, 44, 1.6, 2, { mat: m, tono: -0.1 });
    if (!roto) g.caja(-12 + a.r() * 20, 2, 11, 5, 7, 1.6, { mat: 'cuero', giro: a.r() * 40 - 20 });
    else for (let i = 0; i < 3; i++) g.caja(-10 + a.r() * 30, 10 + a.r() * 8, 0, 14 + a.r() * 8, 3, 1.2, { mat: 'madera_vieja', giro: a.r() * 60 - 30 });
    return ps;
  },
});

// ------------------------------------------------------------------ braseros
registrar({
  id: 'mon_brasero', nombre: ['Brasero de la catedral', 'Cathedral brazier'], tema: 'monasterio', variantes: ['tripode', 'pedestal', 'cuenco_grande', 'jaula', 'fuego_azul'], cuadros: 6, t: 3, huella: [1, 1], bloquea: true,
  armar: (v, f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps).sub(0, 0, 0, a.r() * 90);
    let fz = 30, R = 6.5, H = 13, fuego = 'fuego';
    if (v === 'tripode' || v === 'fuego_azul') {
      for (let i = 0; i < 3; i++) { const t = (i / 3) * Math.PI * 2; g.palo([Math.cos(t) * 10, Math.sin(t) * 10, 0], [Math.cos(t) * 4, Math.sin(t) * 4, 24], 1.1, { mat: 'hierro' }); g.esf(Math.cos(t) * 10.5, Math.sin(t) * 10.5, 0.8, 1.6, { mat: 'hierro' }); }
      g.cil(0, 0, 12, 4.5, 1.2, { mat: 'hierro' });
      g.cil(0, 0, 22, 3.5, 6, { mat: 'hierro', r1: 9 }); g.cil(0, 0, 27.6, 9.4, 1, { mat: 'hierro', tono: 0.08 });
      fz = 28; if (v === 'fuego_azul') fuego = 'fuego_azul';
    } else if (v === 'pedestal') {
      g.caja(0, 0, 0, 14, 14, 3, { mat: 'mon_piedra', tono: -0.05 }); g.cil(0, 0, 3, 4.5, 24, { mat: 'piedra_bloques', r1: 3.6 });
      g.cil(0, 0, 27, 3.6, 7, { mat: 'mon_piedra', r1: 10 }); g.cil(0, 0, 33, 10.5, 2, { mat: 'mon_piedra', tono: 0.05 });
      fz = 34; R = 7.5; H = 15;
    } else if (v === 'cuenco_grande') {
      g.cil(0, 0, 0, 10, 3, { mat: 'mon_piedra', tono: -0.06 }); g.cil(0, 0, 3, 11, 9, { mat: 'mon_piedra', r1: 17 });
      g.cil(0, 0, 11.5, 17.5, 2, { mat: 'mon_piedra', tono: 0.05 });
      for (let i = 0; i < 4; i++) { const t = (i / 4) * Math.PI * 2 + 0.4; g.elip(Math.cos(t) * 13, Math.sin(t) * 13, 7, 2.5, 2.5, 2.5, { mat: 'mon_piedra', tono: 0.08 }); }
      fz = 12.5; R = 13; H = 22;
    } else {
      g.cil(0, 0, 0, 7, 2, { mat: 'hierro' }); g.cil(0, 0, 2, 1.6, 26, { mat: 'hierro' });
      g.cil(0, 0, 26, 7, 1.5, { mat: 'hierro' });
      for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2; g.palo([Math.cos(t) * 6.5, Math.sin(t) * 6.5, 27], [Math.cos(t) * 8, Math.sin(t) * 8, 40], 0.8, { mat: 'hierro' }); }
      g.cil(0, 0, 39, 8.5, 1.2, { mat: 'hierro' });
      fz = 27.5; R = 5.5; H = 14;
    }
    g.cil(0, 0, fz - 0.6, R * 1.15, 1.2, { mat: 'negro' });
    for (let i = 0; i < 5; i++) g.elip((a.r() - 0.5) * R, (a.r() - 0.5) * R, fz + 0.5, 1.6, 1.4, 1.1, { mat: 'roca', tono: -0.15 });
    llama(g, 0, 0, fz, R, H, f, 6, fuego);
    const color = fuego === 'fuego_azul' ? '#6ab4ff' : '#ff9a3a';
    return { piezas: ps, resplandor: { c: [0, 0, fz + H * 0.4], r: 32 + R * 1.5, color } };
  },
});

// ------------------------------------------------------------------ antorcha en un bloque de piedra
registrar({
  id: 'mon_antorcha', nombre: ['Antorcha de pared', 'Wall torch'], tema: 'monasterio', variantes: ['izq', 'der', 'apagada'], cuadros: 6, t: 3, huella: [1, 1], bloquea: true,
  armar: (v, f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps).sub(0, 0, 0, orient(v));
    g.caja(0, -2, 0, 20, 16, 6, { mat: 'mon_piedra', tono: -0.06 });
    g.caja(0, -2, 6, 17, 13, 60, { mat: 'piedra_bloques' });
    g.caja(0, -2, 66, 20, 16, 3, { mat: 'mon_piedra', tono: 0.04 });
    g.caja(0, 4.5, 34, 8, 1, 10, { mat: 'hierro' });
    g.palo([0, 5, 38], [0, 10, 42], 1, { mat: 'hierro' }); g.palo([0, 5, 35], [0, 10, 40.5], 0.8, { mat: 'hierro' });
    g.cil(0, 10, 39.5, 2.6, 3, { mat: 'hierro', r1: 3 });
    const t = g.sub(0, 10.5, 34, 0, -14);
    t.palo([0, 0, 0], [0, 0, 16], 1.2, { mat: 'madera' });
    t.elip(0, 0, 16.5, 2.2, 2.2, 3, { mat: 'cuerda', tono: -0.2 });
    if (v !== 'apagada') {
      llama(t, 0, 0, 17.5, 3.2, 14, f, 6);
      return { piezas: ps, resplandor: { c: [0, 14, 56], r: 30, color: '#ff9a3a' } };
    }
    t.elip(0, 0, 18.5, 1.8, 1.8, 1.5, { mat: 'negro' });
    return ps;
  },
});

// ------------------------------------------------------------------ estatuas en pedestal
function monje(s: G, m: string, t: number, roto: boolean) {
  s.cil(0, 0, 0, 8.5, 34, { mat: m, tono: t, r1: 5.8 });
  for (let i = 0; i < 3; i++) s.caja(6.5 - i * 0.6, -3 + i * 3, 0.5, 1.4, 1.4, 26 - i * 3, { mat: m, tono: t - 0.08 });
  s.cil(0, 0, 33, 6.2, 1.6, { mat: m, tono: t - 0.1 });
  s.elip(0, 0, 41, 5.6, 6.8, 9, { mat: m, tono: t });
  s.elip(0, 0, 46, 5, 7.6, 3.5, { mat: m, tono: t });
  if (!roto) s.elip(4.8, 0, 38, 3.4, 5.8, 3, { mat: m, tono: t + 0.04 }); else s.elip(4.6, -3, 38, 3, 2.8, 2.8, { mat: m, tono: t + 0.04 });
  if (!roto) s.caja(7, 0, 39, 2, 6, 7, { mat: m, tono: t + 0.1 });
  if (!roto) {
    s.elip(-0.5, 0, 51.5, 4.8, 4.8, 5.8, { mat: m, tono: t + 0.02 });
    s.poli([[-4.8, 0, 57], [-6, 0, 49], [-3, -3.4, 54], [-3, 3.4, 54]], { mat: m, tono: t });
    s.elip(3.4, 0, 50.5, 1.9, 2.5, 3.2, { mat: 'negro' });
  } else s.cil(0, 0, 47.5, 2.4, 2, { mat: m, tono: t - 0.05 });
}
function caballero(s: G, m: string, t: number, roto: boolean) {
  for (const k of [-1, 1]) { s.caja(1.5, k * 3, 0, 6, 3.2, 2.5, { mat: m, tono: t }); s.cil(0, k * 3, 2.5, 2.4, 21, { mat: m, tono: t, r1: 2.9 }); s.esf(0.6, k * 3, 13, 2.8, { mat: m, tono: t + 0.05 }); }
  s.poli([[-5.5, 0, 4], [-7, -7, 4], [-7, 7, 4], [-4.5, -7, 44], [-4.5, 7, 44], [-6, 0, 46]], { mat: m, tono: t - 0.08 });
  s.cil(0, 0, 22, 6.2, 9, { mat: m, tono: t, r1: 5.4 });
  s.poli([[-4, -5.5, 30], [4, -5.5, 30], [-4, 5.5, 30], [4, 5.5, 30], [-4.5, -7, 44], [4.6, -7, 44], [-4.5, 7, 44], [4.6, 7, 44], [6, 0, 37]], { mat: m, tono: t + 0.03 });
  for (const k of [-1, 1]) {
    if (roto && k > 0) { s.esf(0, k * 7.4, 44, 3.4, { mat: m, tono: t }); continue; }
    s.esf(0, k * 7.4, 44.5, 3.5, { mat: m, tono: t + 0.06 });
    s.palo([0, k * 7.6, 43], [3, k * 6.8, 35], 2, { mat: m, tono: t }); s.palo([3, k * 6.8, 35], [7, k * 2, 36], 1.8, { mat: m, tono: t });
  }
  s.caja(7.5, 0, 1, 1, 2.8, 32, { mat: m, tono: t + 0.08 }); s.caja(7.5, 0, 33, 1.8, 11, 1.6, { mat: m, tono: t + 0.05 });
  s.palo([7.5, 0, 34.6], [7.5, 0, 38.5], 0.9, { mat: m, tono: t }); s.esf(7.5, 0, 39.5, 1.5, { mat: m, tono: t + 0.05 });
  if (!roto || true) s.elip(7.4, 0, 36.6, 2.2, 3, 1.8, { mat: m, tono: t + 0.04 });
  if (!roto) {
    s.cil(0, 0, 46, 2.4, 2, { mat: m, tono: t });
    s.cil(0, 0, 48, 3.9, 8, { mat: m, tono: t + 0.04, r1: 3.6 }); s.elip(0, 0, 56, 3.6, 3.6, 1.8, { mat: m, tono: t + 0.06 });
    s.caja(3.5, 0, 52.4, 1.2, 5.4, 1.2, { mat: 'negro' }); s.caja(3.8, 0, 49, 0.8, 1, 3, { mat: 'negro' });
    s.caja(-0.5, 0, 57, 6, 1.4, 3, { mat: m, tono: t });
  } else s.cil(0, 0, 46, 2.4, 1.5, { mat: m, tono: t - 0.05 });
}
registrar({
  id: 'mon_estatua', nombre: ['Estatua en pedestal', 'Statue on plinth'], tema: 'monasterio', variantes: ['monje', 'caballero', 'monje_roto', 'caballero_roto'], huella: [2, 2], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps);
    const roto = v.endsWith('roto'), m = roto ? 'mon_piedra_musgo' : 'mon_piedra', t = 0.06;
    g.caja(0, 0, 0, 24, 24, 4, { mat: 'mon_piedra', tono: -0.08 }); g.caja(0, 0, 4, 19, 19, 11, { mat: 'piedra_bloques' }); g.caja(0, 0, 15, 22, 22, 2.5, { mat: 'mon_piedra' });
    g.caja(0, 9.6, 7, 10, 1.4, 5, { mat: 'mon_piedra', resta: true }); g.caja(9.6, 0, 7, 1.4, 10, 5, { mat: 'mon_piedra', resta: true });
    const s = g.sub(0, 0, 17.5, 65 + (a.r() - 0.5) * 16);
    if (v.startsWith('monje')) monje(s, m, t, roto); else caballero(s, m, t, roto);
    if (roto) {
      const c = g.sub(14 + a.r() * 4, 10, 0, a.r() * 360, 80, 'y');
      if (v.startsWith('monje')) { c.elip(0, 0, 4, 4.8, 4.8, 5.4, { mat: m, tono: t }); c.elip(3.4, 0, 3.4, 1.8, 2.4, 2.8, { mat: 'negro' }); }
      else { c.cil(0, 0, 0, 3.9, 8, { mat: m, tono: t, r1: 3.6 }); c.caja(3.5, 0, 4.4, 1.2, 5.4, 1.2, { mat: 'negro' }); }
      for (let i = 0; i < 5; i++) g.caja(-12 + a.r() * 30, 8 + a.r() * 10, 0, 2 + a.r() * 3, 2 + a.r() * 3, 1.5 + a.r() * 2, { mat: m, giro: a.r() * 90 });
      g.palo([10.5, -6, 20], [11, 3, 4], 0.8, { mat: 'mon_piedra', resta: true });
      for (let i = 0; i < 4; i++) g.elip((a.r() - 0.5) * 18, 9.8, 4 + a.r() * 10, 2.6, 1, 2.2, { mat: 'musgo' });
    }
    return ps;
  },
});

// ------------------------------------------------------------------ púlpito
registrar({
  id: 'mon_pulpito', nombre: ['Púlpito', 'Pulpit'], tema: 'monasterio', variantes: ['madera', 'piedra'], huella: [2, 3], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps).sub(0, 6, 0);
    const m = v === 'madera' ? 'madera_lisa' : 'mon_piedra', b = v === 'madera' ? 'madera' : 'piedra_bloques';
    g.caja(0, 0, 0, 16, 16, 3, { mat: 'mon_piedra', tono: -0.06 });
    g.cil(0, 0, 3, 4.2, 22, { mat: b });
    g.cil(0, 0, 22, 4.2, 9, { mat: m, r1: 10.5 });
    g.cil(0, 0, 31, 10.5, 16, { mat: m });
    g.cil(0, 0, 46, 11.6, 2.2, { mat: m, tono: 0.06 }); g.cil(0, 0, 30, 11.2, 2, { mat: m, tono: -0.04 });
    for (const ang of [0, 45, 90]) g.sub(Math.cos(ang * GR) * 10.5, Math.sin(ang * GR) * 10.5, 0, ang - 90).prisma(ojiva(5, 5, 0.8, 3, 33.5), -1.2, 1.2, { mat: m, resta: true });
    // escalera que sube por atrás a la derecha
    for (let i = 0; i < 7; i++) g.caja(1, -32 + i * 3.2 + 1.6, 0, 8, 3.2, 4.4 * (i + 1), { mat: b, tono: -0.03 * (i % 2) });
    g.palo([5.5, -33, 9], [5.5, -12, 39], 0.9, { mat: 'madera' }); for (const y of [-33, -22]) g.palo([5.5, y, 4.4 * ((y + 33) / 3.2 + 1)], [5.5, y, 4.4 * ((y + 33) / 3.2 + 1) + 6.5], 0.8, { mat: 'madera' });
    // tornavoz
    g.palo([-7, -7, 46], [-7, -7, 78], 1.5, { mat: 'madera' });
    g.cil(0, 0, 77, 13, 2.6, { mat: 'madera', r1: 12.5 }); g.cil(0, 0, 79.6, 11.5, 7, { mat: 'madera', r1: 1.5 }); g.cil(0, 0, 86.5, 0.8, 4, { mat: 'oro' }); g.caja(0, 0, 89, 4, 0.8, 1, { mat: 'oro' });
    for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2; g.esf(Math.cos(t) * 12.5, Math.sin(t) * 12.5, 76, 1.2, { mat: 'oro', tono: -0.1 }); }
    // atril con el libro
    const at = g.sub(Math.cos(45 * GR) * 9, Math.sin(45 * GR) * 9, 47, -45);
    at.caja(0, 0, 0, 7, 4, 2, { mat: m });
    at.caja(0, 1, 2, 9, 7, 1.2, { mat: 'cuero', incl: 25 }); at.caja(0, 1, 2.8, 8, 6, 0.6, { mat: 'tela', tono: 0.15, incl: 25 });
    if (v === 'madera') g.caja(0, 0, 32, 1, 1, 1, { mat: m, tono: 0 });
    else for (let i = 0; i < 2; i++) g.elip((a.r() - 0.5) * 10, 8, 4 + a.r() * 20, 2, 1.2, 2, { mat: 'musgo' });
    return ps;
  },
});

// ------------------------------------------------------------------ pila bautismal
registrar({
  id: 'mon_pila_bautismal', nombre: ['Pila bautismal', 'Baptismal font'], tema: 'monasterio', variantes: ['agua', 'seca', 'sangre'], huella: [2, 2], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps);
    const m = 'mon_piedra';
    g.caja(0, 0, 0, 24, 24, 3, { mat: m, tono: -0.07 }); g.cil(0, 0, 3, 9, 3, { mat: m, tono: -0.03, r1: 7 });
    g.cil(0, 0, 6, 4.5, 12, { mat: 'marmol', tono: -0.2 });
    for (let i = 0; i < 4; i++) { const t = (i / 4) * Math.PI * 2 + Math.PI / 4; g.cil(Math.cos(t) * 6.5, Math.sin(t) * 6.5, 6, 1.4, 12, { mat: 'marmol', tono: -0.15 }); }
    g.cil(0, 0, 17, 7, 9, { mat: 'marmol', tono: -0.18, r1: 12 });
    g.cil(0, 0, 25.5, 12.6, 2.2, { mat: 'marmol', tono: -0.12 });
    g.cil(0, 0, 21, 10.3, 10, { mat: 'marmol', resta: true });
    for (const ang of [0, 45, 90]) g.sub(Math.cos(ang * GR) * 10, Math.sin(ang * GR) * 10, 0, ang - 90).caja(0, 0, 19.5, 4, 1.4, 4, { mat: 'marmol', tono: 0.05, giro: 45 });
    if (v === 'agua') { g.cil(0, 0, 25, 10.4, 0.5, { mat: 'agua' }); g.elip(-3, 2, 25.4, 2.4, 1.6, 0.2, { mat: 'agua', tono: 0.3 }); }
    else if (v === 'sangre') { g.cil(0, 0, 24.6, 10.4, 0.5, { mat: 'sangre', tono: 0.1 }); g.elip(9, 6, 18, 1.2, 1.2, 8, { mat: 'sangre' }); g.elip(14, 9, 0, 8, 6, 0.5, { mat: 'sangre' }); g.elip(12, 4, 3, 1.4, 1.4, 1.6, { mat: 'sangre' }); }
    else { g.cil(0, 0, 21, 10.4, 1, { mat: 'tierra', tono: -0.05 }); for (let i = 0; i < 5; i++) g.elip((a.r() - 0.5) * 12, (a.r() - 0.5) * 12, 22, 1.6, 1, 0.4, { mat: 'hojas_otono', tono: -0.2, giro: a.r() * 90 }); g.caja(8, 8, 18, 1, 5, 10, { mat: 'marmol', resta: true, giro: 45 }); }
    return ps;
  },
});

// ------------------------------------------------------------------ campana en su armazón
function campana(g: G) {
  g.cil(0, 0, 0, 15, 3, { mat: 'bronce', r1: 13.4, tono: -0.1 });
  g.cil(0, 0, 3, 13.4, 15, { mat: 'bronce', r1: 9, tono: -0.12 });
  g.cil(0, 0, 18, 9, 5, { mat: 'bronce', r1: 7, tono: 0.04 });
  g.elip(0, 0, 23, 7, 7, 3.6, { mat: 'bronce', tono: 0.06 });
  g.cil(0, 0, 2, 13.8, 1.2, { mat: 'bronce', tono: 0.1 }); g.cil(0, 0, 14, 11, 1, { mat: 'bronce', tono: 0.1 });
  g.caja(0, 0, 25, 5, 3, 5, { mat: 'hierro' });
}
registrar({
  id: 'mon_campana', nombre: ['Campana en su armazón', 'Bell on frame'], tema: 'monasterio', variantes: ['madera', 'hierro', 'caida'], huella: [4, 2], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps);
    const m = v === 'hierro' ? 'hierro' : 'madera_vieja', grueso = v === 'hierro' ? 3.6 : 5.5;
    const caida = v === 'caida';
    for (const s of [-1, 1]) {
      g.caja(s * 25, 0, 0, 9, 28, 4, { mat: m, tono: -0.05 });
      if (caida && s > 0) { g.sub(s * 25, 0, 4, 0, 30, 'y').caja(0, 0, 0, grueso, grueso, 42, { mat: m }); continue; }
      g.caja(s * 25, 0, 4, grueso, grueso, 78, { mat: m });
      for (const d of [-1, 1]) g.palo([s * 25, d * 12, 4], [s * 25, d * 1.5, 30], 1.4, { mat: m });
      g.palo([s * 25, 0, 66], [s * 16, 0, 79], 1.4, { mat: m });
    }
    if (!caida) {
      g.caja(0, 0, 80, 60, grueso + 1, grueso, { mat: m, tono: 0.05 });
      if (v === 'madera') g.poli([[-32, -6, 80 + grueso], [32, -6, 80 + grueso], [-32, 6, 80 + grueso], [32, 6, 80 + grueso], [-32, 0, 88 + grueso], [32, 0, 88 + grueso]], { mat: 'teja' });
      const c = g.sub(0, 0, 47);
      c.caja(0, 0, 25, 12, 5, 5, { mat: 'madera' }); c.caja(0, 0, 30, 3, 3, 5, { mat: 'hierro' });
      campana(c);
      c.palo([0, 0, 18], [0, 0, -4], 0.9, { mat: 'hierro' }); c.esf(0, 0, -5, 2.2, { mat: 'hierro' });
      g.palo([3, 4, 51], [6, 12, 0], 0.8, { mat: 'cuerda' });
    } else {
      g.sub(-8, 6, 0, 30, -8, 'y').caja(16, 0, 0, 60, grueso + 1, grueso, { mat: m, tono: 0.05 });
      const c = g.sub(6, 18, 14, 200, 95, 'y');
      campana(c.sub(0, 0, -12));
      c.caja(3, 9, -10, 2, 8, 6, { mat: 'bronce', resta: true, giro: 30 });
      for (let i = 0; i < 4; i++) g.caja(-10 + a.r() * 30, -14 + a.r() * 30, 0, 6 + a.r() * 6, 3, 2, { mat: 'madera_vieja', giro: a.r() * 180 });
    }
    return ps;
  },
});

// ------------------------------------------------------------------ escalera de piedra
registrar({
  id: 'mon_escalera', nombre: ['Escalera de piedra', 'Stone stairs'], tema: 'monasterio', variantes: ['izq', 'der', 'rota'], huella: [3, 5], bloquea: false,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps).sub(0, 0, 0, orient(v));
    const N = 8, sube = 6, huella = 8, W = 40;
    // los escalones suben hacia -y: las contrahuellas miran a la cámara
    for (let i = 0; i < N; i++) g.caja(0, 32 - i * huella - huella / 2, 0, W, huella, sube * (i + 1), { mat: 'piedra_bloques', tono: i % 2 ? 0.03 : -0.02 });
    for (let i = 0; i < N; i++) g.caja(0, 32 - i * huella - 0.4, sube * (i + 1) - 1, W, 1.6, 1, { mat: 'mon_piedra', tono: 0.08 });
    for (const s of [-1, 1]) {
      g.poli([[s * (W / 2 + 0.5), 33, 0], [s * (W / 2 + 6), 33, 0], [s * (W / 2 + 0.5), -32, 0], [s * (W / 2 + 6), -32, 0], [s * (W / 2 + 0.5), 33, 10], [s * (W / 2 + 6), 33, 10], [s * (W / 2 + 0.5), -32, N * sube + 10], [s * (W / 2 + 6), -32, N * sube + 10]], { mat: 'mon_piedra' });
      g.caja(s * (W / 2 + 3.2), 33, 0, 8, 6, 16, { mat: 'mon_piedra', tono: 0.04 }); g.esf(s * (W / 2 + 3.2), 33, 18.5, 3, { mat: 'mon_piedra', tono: 0.06 });
    }
    if (v === 'rota') {
      for (let i = 0; i < 4; i++) { const k = Math.floor(a.r() * N); g.caja(-W / 2 + 6 + a.r() * (W - 12), 32 - k * huella, sube * (k + 1) - 3, 8 + a.r() * 6, 6, 5, { mat: 'piedra', resta: true, giro: a.r() * 30 }); }
      g.poli([[W / 2 - 2, -40, 70], [W / 2 + 10, -40, 70], [W / 2 - 2, 0, 70], [W / 2 + 10, 0, 70], [W / 2, -40, 34], [W / 2 + 10, -10, 22]], { mat: 'piedra', resta: true });
      for (let i = 0; i < 6; i++) g.caja(-W / 2 + a.r() * W, 36 + a.r() * 10, 0, 4 + a.r() * 4, 3 + a.r() * 4, 2 + a.r() * 3, { mat: a.r() < 0.5 ? 'piedra_bloques' : 'mon_piedra', giro: a.r() * 90, incl: (a.r() - 0.5) * 20 });
      g.elip(-8, 34, 0, 8, 4, 1.4, { mat: 'tierra' });
    }
    return ps;
  },
});

// ------------------------------------------------------------------ rastrillo (reja levadiza) en su portada
registrar({
  id: 'mon_rastrillo', nombre: ['Rastrillo', 'Portcullis'], tema: 'monasterio', variantes: ['bajado_izq', 'alzado_izq', 'bajado_der', 'alzado_der'], huella: [5, 1], bloquea: true,
  armar: (v, _f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps).sub(0, 0, 0, orient(v));
    const W = 40, HR = 50, K = 0.62, alzado = v.startsWith('alzado');
    g.caja(0, 0, 0, 84, 20, 8, { mat: 'mon_piedra', tono: -0.08 });
    g.caja(0, 0, 0, 80, 16, 112, { mat: 'piedra_bloques' });
    g.caja(0, 0, 112, 84, 20, 3, { mat: 'mon_piedra' });
    for (let i = 0; i < 5; i++) g.caja(-34 + i * 17, 0, 115, 10, 18, 11, { mat: 'piedra_bloques', tono: 0.03 });
    for (const x of [-40, 40]) g.caja(x, 0, 0, 12, 24, 118, { mat: 'piedra_bloques', tono: 0.05 });
    g.prisma(ojiva(W + 10, HR, K, 5, 0), 6, 10, { mat: 'piedra_bloques', resta: true });
    g.prisma(ojiva(W, HR, K, 5, 0), -10, 10, { mat: 'piedra_bloques', resta: true });
    g.prisma(ojiva(W, HR, K, 5, 0), -9, -8, { mat: 'negro' });
    for (const s of [-1, 1]) g.caja(s * (W / 2 + 6), 9, 64, 4, 4, 12, { mat: 'piedra_bloques', resta: true });
    // la reja: lo que queda arriba se esconde dentro del muro
    const z0 = alzado ? 46 : 0, m = a.r() < 0.5 ? 'hierro' : 'hierro_oxido';
    for (let x = -18; x <= 18.01; x += 6) {
      g.caja(x, 2, z0, 2.4, 2.4, 108 - z0, { mat: m });
      g.poli([[x - 1.2, 0.8, z0], [x + 1.2, 0.8, z0], [x - 1.2, 3.2, z0], [x + 1.2, 3.2, z0], [x, 2, z0 - 5]], { mat: m });
    }
    for (let z = z0 + 6; z < 104; z += 9) g.caja(0, 2, z, W + 2, 1.8, 2.2, { mat: m, tono: -0.05 });
    if (alzado) for (const s of [-1, 1]) g.palo([s * 14, 2.5, 100], [s * 18, 2.5, z0 + 6], 0.6, { mat: 'hierro' });
    for (let i = 0; i < 3; i++) g.elip(-30 + a.r() * 60, 10 + a.r() * 4, 0.3, 3 + a.r() * 3, 2, 1, { mat: 'tierra' });
    return ps;
  },
});

// ------------------------------------------------------------------ tapiz colgado de un bastidor (se mece)
registrar({
  id: 'mon_tapiz', nombre: ['Tapiz en bastidor', 'Tapestry banner'], tema: 'monasterio', variantes: ['rojo', 'azul', 'morado', 'rasgado'], cuadros: 4, t: 4, huella: [2, 1], bloquea: true,
  armar: (v, f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps).sub(0, 0, 0, (a.r() - 0.5) * 10);
    const tela = v === 'azul' ? 'tela_azul' : v === 'morado' ? 'tela_morada' : 'tela_roja', rasg = v === 'rasgado';
    for (const s of [-1, 1]) {
      g.caja(s * 16, 0, 0, 3.2, 3.2, 74, { mat: 'madera' });
      g.caja(s * 16, 0, 0, 4, 16, 3, { mat: 'madera', tono: -0.05 });
      g.palo([s * 16, -6, 3], [s * 16, 0, 14], 0.9, { mat: 'madera' }); g.palo([s * 16, 6, 3], [s * 16, 0, 14], 0.9, { mat: 'madera' });
      g.esf(s * 16, 0, 75.5, 2, { mat: 'oro', tono: -0.15 });
    }
    g.cil(-19, 0, 68, 1.4, 38, { mat: 'madera', eje: [1, 0, 0] });
    const ph = (f / 4) * Math.PI * 2, ola = (z: number) => Math.sin(z * 0.14 + ph) * 1.6 * ((68 - z) / 50) + 1.6;
    const zTop = 67, zBot = rasg ? 26 : 18, paso = 4.5;
    for (let z = zTop; z > zBot; z -= paso) {
      if (rasg && z < 44 && z > 34 && a.r() < 0.6) { g.caja(-6, ola(z), z - paso, 12, 1.2, paso, { mat: tela, tono: -0.1 }); continue; }
      g.caja(0, ola(z - paso / 2), z - paso, 24, 1.2, paso + 0.4, { mat: tela, tono: rasg ? -0.12 : 0 });
    }
    // la cola de golondrina y los flecos de oro
    const yb = ola(zBot);
    for (const s of [-1, 1]) g.poli([[s * 12, yb, zBot + 0.4], [0, yb, zBot + 0.4], [s * 12, yb, zBot - 10], [s * 12, yb + 1.2, zBot + 0.4], [0, yb + 1.2, zBot + 0.4], [s * 12, yb + 1.2, zBot - 10]], { mat: tela, tono: rasg ? -0.12 : -0.02 });
    if (rasg) g.poli([[-4, yb - 1, zBot - 2], [8, yb - 1, zBot - 2], [2, yb - 1, zBot - 12], [-4, yb + 2, zBot - 2], [8, yb + 2, zBot - 2]], { mat: tela, resta: true });
    else for (let x = -11; x <= 11; x += 2.75) g.caja(x, ola(zTop - 2) + 0.6, zTop - 3, 1.4, 0.8, 3, { mat: 'oro', tono: -0.1 });
    // el emblema: una cruz con un anillo
    const ze = 48, ye = ola(ze) + 0.8;
    g.caja(0, ye, ze - 9, 2.6, 0.8, 18, { mat: 'oro', tono: -0.08 }); g.caja(0, ye, ze + 1, 12, 0.8, 2.6, { mat: 'oro', tono: -0.08 });
    g.cil(0, ye - 0.2, ze + 2, 4.6, 0.8, { mat: 'oro', tono: -0.15, eje: [0, 1, 0] }); g.cil(0, ye - 0.6, ze + 2, 3.2, 2, { mat: 'oro', resta: true, eje: [0, 1, 0] });
    g.caja(0, ye + 0.1, ze + 1, 12, 0.8, 2.6, { mat: 'oro', tono: -0.08 }); g.caja(0, ye + 0.1, ze - 3, 2.6, 0.8, 10, { mat: 'oro', tono: -0.08 });
    return ps;
  },
});

// ------------------------------------------------------------------ charco de sangre que burbujea
registrar({
  id: 'mon_charco_sangre', nombre: ['Charco de sangre', 'Bubbling blood pool'], tema: 'monasterio', variantes: ['chico', 'grande'], cuadros: 6, t: 3, huella: [2, 2], bloquea: false, plano: true,
  armar: (v, f, a) => {
    const ps: Pieza[] = [], g = new G(a, ps);
    const R = v === 'grande' ? 22 : 12;
    g.elip(0, 0, 0, R, R * 0.8, 0.7, { mat: 'sangre', giro: a.r() * 180 });
    for (let i = 0; i < 6; i++) { const t = a.r() * 6.28, q = R * (0.5 + a.r() * 0.5); g.elip(Math.cos(t) * q, Math.sin(t) * q * 0.8, 0, R * (0.25 + a.r() * 0.25), R * (0.2 + a.r() * 0.2), 0.6, { mat: 'sangre', giro: a.r() * 180, tono: -0.03 }); }
    for (let i = 0; i < 4; i++) { const t = a.r() * 6.28; g.elip(Math.cos(t) * R * 1.3, Math.sin(t) * R * 1.05, 0, 1.4 + a.r(), 1.2 + a.r(), 0.4, { mat: 'sangre', tono: -0.05 }); }
    g.elip(-R * 0.2, -R * 0.15, 0.3, R * 0.35, R * 0.2, 0.5, { mat: 'sangre', tono: 0.18 });
    // burbujas: cada una crece unos cuadros y revienta en un anillo
    const nb = v === 'grande' ? 6 : 3;
    for (let i = 0; i < nb; i++) {
      const x = (a.r() - 0.5) * R * 1.1, y = (a.r() - 0.5) * R * 0.8, fase = (f + i * 2) % 6;
      if (fase < 4) g.esf(x, y, 0.2, 0.9 + fase * 0.7, { mat: 'sangre', tono: 0.12 + fase * 0.03 });
      else if (fase === 4) { g.cil(x, y, 0.4, 3.6, 0.5, { mat: 'sangre', tono: 0.15 }); g.cil(x, y, 0.3, 2.6, 1, { mat: 'sangre', resta: true }); }
      else g.esf(x, y, 0.4, 0.7, { mat: 'sangre', tono: 0.2 });
    }
    return ps;
  },
});
