import { registrar, type Arma, type Pieza, type V3 } from '../objeto';

/**
 * Armas y armaduras: las armas tiradas en el piso (con un giro que sale de la semilla), escudos, yelmos, armaduras,
 * armeros cargados, el maniquí con la armadura completa, estandartes y blancos de práctica. Cada arma se arma en su
 * propio marco (largo en x, ancho en y, grueso en z) y después se tiende en el piso o se para en un armero.
 */

// ------------------------------------------------------------------ marcos (piezas en un sistema local)
interface Marco { o: V3; x: V3; y: V3; z: V3 }
interface Op { tono?: number; resta?: boolean }
const RAD = Math.PI / 180;
const nr = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cr = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

class Pz {
  constructor(readonly a: Arma, readonly ps: Pieza[], readonly k: Marco = { o: [0, 0, 0], x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }) {}
  p(v: V3): V3 { const k = this.k; return [k.o[0] + k.x[0] * v[0] + k.y[0] * v[1] + k.z[0] * v[2], k.o[1] + k.x[1] * v[0] + k.y[1] * v[1] + k.z[1] * v[2], k.o[2] + k.x[2] * v[0] + k.y[2] * v[1] + k.z[2] * v[2]]; }
  d(v: V3): V3 { const k = this.k; return [k.x[0] * v[0] + k.y[0] * v[1] + k.z[0] * v[2], k.x[1] * v[0] + k.y[1] * v[1] + k.z[1] * v[2], k.x[2] * v[0] + k.y[2] * v[1] + k.z[2] * v[2]]; }
  /** Sub-marco con origen `o` y ejes x, y (en coordenadas locales); z sale del producto. */
  en(o: V3, x: V3 = [1, 0, 0], y: V3 = [0, 1, 0]): Pz { const X = nr(this.d(x)); const Z = nr(cr(X, this.d(y))); const Y = cr(Z, X); return new Pz(this.a, this.ps, { o: this.p(o), x: X, y: Y, z: Z }); }
  /** Gira `g` grados alrededor del z local en `o`. */
  gira(o: V3, g: number): Pz { const c = Math.cos(g * RAD), s = Math.sin(g * RAD); return this.en(o, [c, s, 0], [-s, c, 0]); }
  /** Caja centrada en c con medidas l. */
  caja(c: V3, l: V3, mat: string, o: Op = {}) { const pts: V3[] = []; for (const sx of [-0.5, 0.5]) for (const sy of [-0.5, 0.5]) for (const sz of [-0.5, 0.5]) pts.push(this.p([c[0] + sx * l[0], c[1] + sy * l[1], c[2] + sz * l[2]])); this.ps.push(this.a.poliedro(pts, { mat, ...o })); return this; }
  /** Caja apoyada (como a.caja: centro de la base). */
  base(x: number, y: number, z: number, an: number, pr: number, al: number, mat: string, o: Op = {}) { return this.caja([x, y, z + al / 2], [an, pr, al], mat, o); }
  poli(pts: V3[], mat: string, o: Op = {}) { this.ps.push(this.a.poliedro(pts.map((q) => this.p(q)), { mat, ...o })); return this; }
  palo(p0: V3, p1: V3, r0: number, mat: string, o: Op & { r1?: number } = {}) { this.ps.push(this.a.palo(this.p(p0), this.p(p1), r0, { mat, ...o })); return this; }
  cil(x: number, y: number, z: number, r0: number, h: number, mat: string, o: Op & { r1?: number } = {}) { return this.palo([x, y, z], [x, y, z + h], r0, mat, o); }
  bola(c: V3, r: number, mat: string, o: Op = {}) { return this.elip(c, [r, r, r], mat, o); }
  elip(c: V3, r: V3, mat: string, o: Op = {}) { const k = this.k; this.ps.push({ k: 'elip', c: this.p(c), ex: k.x, ey: k.y, ez: k.z, r, mat, ...o } as Pieza); return this; }
}

/** Marco tendido en el piso: largo a lo largo de x local, el extremo 0 a la altura h0 y el otro a h1. */
function tendido(raiz: Pz, largo: number, h0: number, h1: number, g: number, cx = 0, cy = 0): Pz {
  const c = Math.cos(g * RAD), s = Math.sin(g * RAD);
  const dx = Math.sqrt(Math.max(1, largo * largo - (h1 - h0) ** 2));
  return raiz.en([cx - (c * dx) / 2, cy - (s * dx) / 2, h0], [c * dx, s * dx, h1 - h0], [-s, c, 0]);
}
/** Marco parado: el largo (x local) sube por z, el ancho (y local) a lo largo de `lado` (vector del piso), inclinado `incl` grados hacia atrás. */
function parado(raiz: Pz, o: V3, lado: V3, incl = 0): Pz {
  const n = nr(cr([0, 0, 1], lado)); // hacia atrás
  const up: V3 = [n[0] * Math.sin(incl * RAD), n[1] * Math.sin(incl * RAD), Math.cos(incl * RAD)];
  return raiz.en(o, up, lado);
}

// ------------------------------------------------------------------ materiales por variante
interface Met { hoja: string; guarda: string; puno: string; asta: string; sangre: boolean }
const MET = (v: string): Met => {
  const ox = v.startsWith('oxid'), oro = v === 'oro' || v === 'dorada' || v === 'dorado';
  return { hoja: ox ? 'hierro_oxido' : 'acero', guarda: ox ? 'hierro_oxido' : oro ? 'oro' : 'hierro', puno: ox ? 'madera_vieja' : oro ? 'tela_roja' : 'cuero', asta: ox ? 'madera_vieja' : 'madera_lisa', sangre: v.includes('sangr') };
};
const VAR_METAL = ['hierro', 'oxidada', 'oro', 'ensangrentada'];

/** Manchas de sangre sobre un tramo del arma (cajas que asoman de las dos caras). */
function manchar(b: Pz, x0: number, x1: number, ancho: number, grueso: number, n = 3) {
  for (let i = 0; i < n; i++) {
    const L = 2 + b.a.r() * (x1 - x0) * 0.35, x = x0 + b.a.r() * (x1 - x0 - L) + L / 2;
    b.caja([x, (b.a.r() - 0.5) * ancho * 0.3, 0], [L, ancho * (0.35 + b.a.r() * 0.3), grueso + 0.5], 'sangre', { tono: b.a.r() * 0.1 });
  }
}
/** Charco de sangre en el piso. */
function charco(a: Arma, ps: Pieza[], x: number, y: number, r: number) {
  ps.push(a.elipsoide(x, y, 0, r, r * (0.6 + a.r() * 0.3), 0.5, { mat: 'sangre', giro: a.r() * 180 }));
  ps.push(a.elipsoide(x + r * 0.7, y + r * 0.4, 0, r * 0.35, r * 0.3, 0.45, { mat: 'sangre', tono: -0.05 }));
}

// ------------------------------------------------------------------ hojas y armas (en su marco: largo en x)
/** Hoja recta de doble filo con canal: base en x0, largo L, ancho w, grueso t. */
function hoja(b: Pz, x0: number, L: number, w: number, t: number, mat: string, punta = 0.2) {
  const xp = x0 + L * (1 - punta);
  b.poli([[x0, w / 2, t * 0.15], [x0, -w / 2, t * 0.15], [x0, w / 2, -t * 0.15], [x0, -w / 2, -t * 0.15], [x0, 0, t / 2], [x0, 0, -t / 2],
    [xp, w * 0.44, 0], [xp, -w * 0.44, 0], [xp, 0, t / 2], [xp, 0, -t / 2], [x0 + L, 0, 0]], mat);
  b.caja([x0 + L * 0.38, 0, 0], [L * 0.62, w * 0.22, t + 0.06], mat, { tono: -0.14 });
}
interface OpEspada { hoja: number; ancho: number; puno: number; guarda: number; pomo?: number; grueso?: number }
function espada(b: Pz, m: Met, o: OpEspada): number {
  const pr = o.pomo ?? 1.6, t = o.grueso ?? 1.2;
  b.bola([pr, 0, 0], pr, m.guarda);
  b.palo([pr * 1.5, 0, 0], [pr + o.puno, 0, 0], 1.0, m.puno);
  for (let x = pr * 1.6 + 1; x < pr + o.puno - 0.5; x += 2.2) b.palo([x, 0, 0], [x + 0.8, 0, 0], 1.15, m.puno, { tono: -0.12 });
  const xg = pr + o.puno;
  b.caja([xg + 0.9, 0, 0], [1.8, o.guarda, 1.8], m.guarda);
  b.caja([xg + 1.1, o.guarda / 2, 0], [2.4, 1.6, 2], m.guarda, { tono: 0.08 }).caja([xg + 1.1, -o.guarda / 2, 0], [2.4, 1.6, 2], m.guarda, { tono: 0.08 });
  b.caja([xg + 2.2, 0, 0], [1.4, o.ancho * 0.7, 1.6], m.guarda, { tono: -0.05 });
  hoja(b, xg + 1.8, o.hoja, o.ancho, t, m.hoja);
  if (m.sangre) manchar(b, xg + 1.8 + o.hoja * 0.35, xg + 1.8 + o.hoja * 0.95, o.ancho, t);
  return xg + 1.8 + o.hoja;
}
const largoEspada = (o: OpEspada) => (o.pomo ?? 1.6) + o.puno + 1.8 + o.hoja;

function falcata(b: Pz, m: Met): number {
  b.bola([1.5, 0, 0], 1.5, m.guarda);
  b.palo([2, 0, 0], [9, 0, 0], 1.0, m.puno);
  b.caja([9.8, 0, 0], [1.6, 8, 1.8], m.guarda).bola([9.8, 4.2, 0], 1.1, m.guarda).bola([9.8, -4.2, 0], 1.1, m.guarda);
  const x0 = 10.6, L = 25, w = 3.6, t = 1.2;
  const pts: V3[] = [];
  for (const [x, y] of [[x0, -w / 2], [x0, w / 2], [x0 + L * 0.72, w * 1.05], [x0 + L, w * 0.05], [x0 + L * 0.9, -w / 2]] as [number, number][]) pts.push([x, y, t / 2 - 0.2], [x, y, -t / 2 + 0.2]);
  pts.push([x0, -w / 2 + 0.5, t / 2], [x0, -w / 2 + 0.5, -t / 2], [x0 + L * 0.85, -w / 2 + 0.5, t / 2], [x0 + L * 0.85, -w / 2 + 0.5, -t / 2]);
  b.poli(pts, m.hoja);
  b.caja([x0 + L * 0.4, -w / 2 + 0.6, 0], [L * 0.75, 0.9, t + 0.06], m.hoja, { tono: 0.12 });
  if (m.sangre) manchar(b, x0 + 8, x0 + L - 2, w * 1.4, t);
  return x0 + L;
}

function daga(b: Pz, m: Met, curva: boolean): number {
  b.bola([1.1, 0, 0], 1.2, m.guarda);
  b.palo([1.5, 0, 0], [6, 0, 0], 0.9, m.puno);
  b.caja([6.6, 0, 0], [1.3, 6, 1.5], m.guarda);
  if (!curva) { hoja(b, 7.2, 11, 2.6, 1, m.hoja, 0.3); if (m.sangre) manchar(b, 9, 17, 2.6, 1, 2); return 18.2; }
  // hoja curva en tres tramos
  let x = 7.2, y = 0, ang = 0;
  for (let i = 0; i < 3; i++) {
    const L = 4, w = 2.6 - i * 0.6, nx = x + Math.cos(ang) * L, ny = y + Math.sin(ang) * L, px = -Math.sin(ang), py = Math.cos(ang);
    const w2 = i === 2 ? 0.2 : w - 0.6;
    b.poli([[x + px * w / 2, y + py * w / 2, 0.5], [x - px * w / 2, y - py * w / 2, 0.5], [x + px * w / 2, y + py * w / 2, -0.5], [x - px * w / 2, y - py * w / 2, -0.5],
      [nx + px * w2 / 2, ny + py * w2 / 2, 0.4], [nx - px * w2 / 2, ny - py * w2 / 2, 0.4], [nx + px * w2 / 2, ny + py * w2 / 2, -0.4], [nx - px * w2 / 2, ny - py * w2 / 2, -0.4]], m.hoja);
    x = nx; y = ny; ang += 0.32;
  }
  if (m.sangre) manchar(b, 8, 12, 2.4, 1, 1);
  return 18;
}

function hachaMano(b: Pz, m: Met): number {
  const L = 28;
  b.palo([0, 0, 0], [L, 0, 0], 1.1, m.asta, { r1: 1.3 });
  b.palo([0, 0, 0], [7, 0, 0], 1.3, 'cuero');
  const x = L - 3;
  b.caja([x, 0, 0], [4.5, 3.4, 3], m.guarda);
  b.poli([[x - 2.2, 1.5, 1.3], [x + 2.2, 1.5, 1.3], [x - 2.2, 1.5, -1.3], [x + 2.2, 1.5, -1.3], [x - 6, 10, 0.35], [x + 4, 10.8, 0.35], [x - 6, 10, -0.35], [x + 4, 10.8, -0.35], [x - 1, 11.6, 0]], m.hoja);
  b.poli([[x - 1.6, -1.5, 1.2], [x + 1.6, -1.5, 1.2], [x - 1.6, -1.5, -1.2], [x + 1.6, -1.5, -1.2], [x - 1, -4, 0.9], [x + 1, -4, 0.9], [x - 1, -4, -0.9], [x + 1, -4, -0.9]], m.guarda);
  if (m.sangre) b.caja([x, 7.5, 0], [6, 2, 1.2], 'sangre');
  return L + 1;
}

function granHacha(b: Pz, m: Met): number {
  const L = 54;
  b.palo([0, 0, 0], [L, 0, 0], 1.2, m.asta);
  b.palo([2, 0, 0], [12, 0, 0], 1.4, 'cuero');
  b.palo([L - 1, 0, 0], [L + 5, 0, 0], 1.3, m.guarda, { r1: 0 });
  b.bola([0, 0, 0], 1.6, m.guarda);
  const x = L - 6;
  b.caja([x, 0, 0], [9, 3.6, 3.4], m.guarda);
  for (const s of [1, -1]) {
    b.poli([[x - 4.5, s * 1.8, 1.4], [x + 4.5, s * 1.8, 1.4], [x - 4.5, s * 1.8, -1.4], [x + 4.5, s * 1.8, -1.4], [x + 7.5, s * 11.5, 0.3], [x - 0.5, s * 14.2, 0.3], [x - 8.5, s * 11.5, 0.3],
      [x + 7.5, s * 11.5, -0.3], [x - 0.5, s * 14.2, -0.3], [x - 8.5, s * 11.5, -0.3]], m.hoja);
    b.caja([x, s * 6, 0], [3, 5, 2.4], m.guarda, { tono: -0.1 });
  }
  if (m.sangre) { b.caja([x + 1, 12, 0], [9, 3, 0.9], 'sangre'); b.caja([x - 3, -11.5, 0], [5, 2.5, 0.9], 'sangre'); }
  return L + 5;
}

function maza(b: Pz, m: Met, estrella: boolean): number {
  const L = 27;
  b.palo([0, 0, 0], [L, 0, 0], 1.1, estrella ? m.asta : m.guarda, { r1: 1.2 });
  b.palo([0, 0, 0], [9, 0, 0], 1.35, m.puno);
  b.bola([0, 0, 0], 1.4, m.guarda);
  if (estrella) {
    b.bola([L + 1.5, 0, 0], 3.6, m.guarda);
    for (let i = 0; i < 10; i++) {
      const z = 1 - (2 * (i + 0.5)) / 10, r = Math.sqrt(1 - z * z), th = i * 2.4;
      b.palo([L + 1.5, 0, 0], [L + 1.5 + z * 6.3, Math.cos(th) * r * 6.3, Math.sin(th) * r * 6.3], 1.0, m.hoja, { r1: 0 });
    }
  } else {
    b.palo([L - 3.5, 0, 0], [L + 3.5, 0, 0], 2.4, m.guarda, { r1: 2 });
    for (let i = 0; i < 6; i++) {
      const th = (i * 60 + 15) * RAD;
      b.en([L, 0, 0], [1, 0, 0], [0, Math.cos(th), Math.sin(th)]).poli([[-3.8, 0, 0.55], [3.2, 0, 0.55], [1.6, 4.6, 0.5], [-2.6, 4.6, 0.5], [-3.8, 0, -0.55], [3.2, 0, -0.55], [1.6, 4.6, -0.5], [-2.6, 4.6, -0.5]], m.hoja);
    }
    b.palo([L + 3.4, 0, 0], [L + 5.2, 0, 0], 1.4, m.guarda, { r1: 0.3 });
  }
  if (m.sangre) b.bola([L + 2, 1.5, 1.5], 2.6, 'sangre');
  return L + 5;
}

function martillo(b: Pz, m: Met): number {
  const L = 46;
  b.palo([0, 0, 0], [L, 0, 0], 1.1, m.asta);
  b.palo([1, 0, 0], [11, 0, 0], 1.35, m.puno);
  b.palo([L - 14, 0, 0], [L - 2, 0, 0], 1.3, m.guarda, { tono: -0.1 });
  b.palo([L - 1, 0, 0], [L + 5, 0, 0], 1.3, m.guarda, { r1: 0 });
  const x = L - 3;
  b.caja([x, 1.6, 0], [4.6, 6.4, 4.6], m.guarda);
  b.caja([x, 5.2, 0], [5.8, 1.6, 5.8], m.hoja);
  b.poli([[x - 2, -1.6, 2], [x + 2, -1.6, 2], [x - 2, -1.6, -2], [x + 2, -1.6, -2], [x - 0.4, -9.5, 0.3], [x + 0.4, -9.5, 0.3], [x - 0.4, -9.5, -0.3], [x + 0.4, -9.5, -0.3]], m.hoja);
  if (m.sangre) b.caja([x, 5.6, 0], [6, 1.2, 6], 'sangre');
  return L + 5;
}

/** Mangual: mango, cadena que cae al piso y bola con púas. La cadena va en el marco `piso` (z = suelo). */
function mangual(b: Pz, m: Met, piso: Pz, ang: number) {
  b.palo([0, 0, 0], [14, 0, 0], 1.25, m.asta);
  b.palo([0, 0, 0], [6, 0, 0], 1.45, m.puno);
  b.bola([0, 0, 0], 1.5, m.guarda);
  b.palo([13, 0, 0], [16, 0, 0], 1.5, m.guarda);
  const p0 = b.p([16.5, 0, 0]);
  let x = p0[0], y = p0[1], z = p0[2], a = ang;
  for (let i = 0; i < 6; i++) {
    const nx = x + Math.cos(a) * 2.2, ny = y + Math.sin(a) * 2.2, nz = Math.max(0.6, z - 0.4);
    piso.palo([x, y, z], [nx, ny, nz], 0.55, m.guarda);
    piso.bola([nx, ny, nz], 0.75, m.guarda, { tono: 0.1 });
    x = nx; y = ny; z = nz; a += (piso.a.r() - 0.5) * 1.1;
  }
  const c: V3 = [x + Math.cos(a) * 3.4, y + Math.sin(a) * 3.4, 3.2];
  piso.bola(c, 3.2, m.guarda);
  for (let i = 0; i < 9; i++) {
    const zz = 1 - (2 * (i + 0.5)) / 9, r = Math.sqrt(1 - zz * zz), th = i * 2.4;
    if (zz < -0.6) continue;
    piso.palo(c, [c[0] + Math.cos(th) * r * 5.6, c[1] + Math.sin(th) * r * 5.6, c[2] + zz * 5.6], 0.9, m.hoja, { r1: 0 });
  }
  if (m.sangre) piso.bola([c[0] + 1, c[1] + 1, c[2] + 1.5], 2.4, 'sangre');
}

function lanza(b: Pz, m: Met): number {
  const L = 64;
  b.palo([0, 0, 0], [L, 0, 0], 0.95, m.asta);
  b.palo([-1.5, 0, 0], [1, 0, 0], 1.1, m.guarda, { r1: 1.0 });
  b.palo([L - 0.5, 0, 0], [L + 3.5, 0, 0], 1.3, m.guarda, { r1: 0.9 });
  b.poli([[L + 3, 0.9, 0], [L + 3, -0.9, 0], [L + 7.5, 2.6, 0], [L + 7.5, -2.6, 0], [L + 15, 0, 0], [L + 3, 0, 0.7], [L + 3, 0, -0.7], [L + 8, 0, 0.7], [L + 8, 0, -0.7]], m.hoja);
  if (m.sangre) b.caja([L + 9, 0, 0], [6, 2.2, 1.6], 'sangre');
  return L + 15;
}

function alabarda(b: Pz, m: Met): number {
  const L = 68;
  b.palo([0, 0, 0], [L, 0, 0], 1.0, m.asta);
  b.palo([-1.5, 0, 0], [1, 0, 0], 1.15, m.guarda);
  b.palo([L - 14, 0, 0], [L, 0, 0], 1.25, m.guarda, { tono: -0.1 });
  const x = L - 4;
  b.poli([[x - 5, 1, 0.9], [x + 4, 1, 0.9], [x - 5, 1, -0.9], [x + 4, 1, -0.9], [x + 6, 10, 0.3], [x - 0.5, 12, 0.3], [x - 8, 10.5, 0.3], [x + 6, 10, -0.3], [x - 0.5, 12, -0.3], [x - 8, 10.5, -0.3]], m.hoja);
  b.poli([[x - 2.5, -1, 0.8], [x + 2.5, -1, 0.8], [x - 2.5, -1, -0.8], [x + 2.5, -1, -0.8], [x - 5, -8, 0]], m.guarda);
  b.poli([[L, 1.4, 0], [L, -1.4, 0], [L, 0, 0.8], [L, 0, -0.8], [L + 5, 1.1, 0], [L + 5, -1.1, 0], [L + 14, 0, 0]], m.hoja);
  if (m.sangre) b.caja([x, 9.5, 0], [10, 3, 0.9], 'sangre');
  return L + 14;
}

function guadana(b: Pz, m: Met): number {
  const L = 56;
  b.palo([0, 0, 0], [L * 0.55, 0.8, 0], 1.05, m.asta);
  b.palo([L * 0.55, 0.8, 0], [L, 0, 0], 1.05, m.asta);
  b.palo([12, 0, 0], [12, -6, 0.5], 0.8, m.asta).palo([36, 0.5, 0], [36, -6, 0.5], 0.8, m.asta);
  b.palo([L - 3, 0, 0], [L + 1, 0, 0], 1.4, m.guarda);
  const n = 6;
  const c = (t: number): [number, number] => [L - 9 * t * t, 1 + 30 * t];
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n, [x0, y0] = c(t0), [x1, y1] = c(t1);
    const w0 = 4.5 * (1 - t0) + 0.6, w1 = i === n - 1 ? 0.2 : 4.5 * (1 - t1) + 0.6;
    b.poli([[x0, y0, 0.45], [x0 - w0, y0, 0.3], [x1, y1, 0.45], [x1 - w1, y1, 0.3], [x0, y0, -0.45], [x0 - w0, y0, -0.3], [x1, y1, -0.45], [x1 - w1, y1, -0.3]], m.hoja);
    b.caja([(x0 + x1) / 2 - 0.4, (y0 + y1) / 2, 0], [1, y1 - y0 + 0.4, 1.0], m.hoja, { tono: 0.12 });
  }
  if (m.sangre) b.caja([L - 5, 12, 0], [3, 9, 1.2], 'sangre');
  return L + 2;
}

/** Arco: centrado, a lo largo de y (largo L), panza hacia +x (d). */
function arco(b: Pz, L: number, d: number, mat: string, rec: boolean, roto: boolean) {
  const n = 10;
  const pt = (t: number): V3 => { const u = t * 2 - 1; let x = d * (1 - u * u); if (rec && Math.abs(u) > 0.8) x -= (Math.abs(u) - 0.8) * 14; return [x - d / 2, u * L / 2, 0]; };
  for (let i = 0; i < n; i++) {
    if (roto && i === 7) continue;
    const t0 = i / n, t1 = (i + 1) / n, r = (t: number) => 1.3 - Math.abs(t * 2 - 1) * 0.65;
    b.palo(pt(t0), pt(t1), r(t0), mat, { r1: r(t1) });
  }
  b.palo([d / 2 - 0.2, -3, 0], [d / 2 - 0.2, 3, 0], 1.6, 'cuero');
  b.bola(pt(0), 0.8, 'hueso').bola(pt(1), 0.8, 'hueso');
  if (roto) {
    const a = pt(0), c = pt(0.7);
    b.palo(a, [c[0] - 3, c[1] - 2, 0], 0.4, 'cuerda');
  } else b.palo(pt(0), pt(1), 0.4, 'cuerda');
}

function flecha(b: Pz, x0: number, L: number, pluma = 'tela', punta = 'hierro') {
  b.palo([x0, 0, 0], [x0 + L, 0, 0], 0.45, 'madera_lisa');
  b.poli([[x0 + L - 0.3, 1, 0], [x0 + L - 0.3, -1, 0], [x0 + L, 0, 0.4], [x0 + L, 0, -0.4], [x0 + L + 2.6, 0, 0]], punta);
  b.poli([[x0 + 0.8, 0, 0], [x0 + 4.5, 0, 0], [x0 + 1.2, 1.4, 0], [x0 + 3, 1.4, 0], [x0 + 1.2, -1.4, 0], [x0 + 3, -1.4, 0], [x0 + 2, 0, 0.15], [x0 + 2, 0, -0.15]], pluma);
  b.poli([[x0 + 0.8, 0, 0], [x0 + 4.5, 0, 0], [x0 + 1.2, 0, 1.4], [x0 + 3, 0, 1.4], [x0 + 1.2, 0, -1.4], [x0 + 3, 0, -1.4], [x0 + 2, 0.15, 0], [x0 + 2, -0.15, 0]], pluma, { tono: -0.08 });
}

function ballesta(b: Pz, m: Met, cargada: boolean) {
  // culata y cuerpo a lo largo de x (0..30), arco de acero a lo ancho en x=25
  b.poli([[0, 2.2, 1.3], [0, -2.2, 1.3], [0, 2.2, -1.3], [0, -2.2, -1.3], [9, 1.5, 1.2], [9, -1.5, 1.2], [9, 1.5, -1.2], [9, -1.5, -1.2]], 'madera');
  b.caja([19.5, 0, 0], [21, 3, 2.4], 'madera');
  b.caja([18, 0, 1.25], [14, 0.8, 0.2], 'madera', { tono: -0.25 });
  b.caja([16, 0, 0], [2.2, 3.4, 2.8], m.guarda);
  b.caja([29, 0, 0], [2.4, 3.6, 2.8], m.guarda);
  const n = 6, W = 26, d = cargada ? 4.5 : 2.2;
  const pt = (t: number): V3 => { const u = t * 2 - 1; return [27 + d * (1 - u * u), (u * W) / 2, 0]; };
  for (let i = 0; i < n; i++) b.palo(pt(i / n), pt((i + 1) / n), 1.0 - Math.abs(i / n - 0.5) * 0.6, m.guarda === 'oro' ? 'hierro' : m.guarda);
  const cuerda: V3 = cargada ? [16.5, 0, 0.6] : [27.5, 0, 0.6];
  b.palo(pt(0), cuerda, 0.4, 'cuerda').palo(pt(1), cuerda, 0.4, 'cuerda');
  b.palo([30, -2, 0], [34, -2.5, 0], 0.6, m.guarda).palo([34, -2.5, 0], [34, 2.5, 0], 0.6, m.guarda).palo([30, 2, 0], [34, 2.5, 0], 0.6, m.guarda);
  if (cargada) { const s = b.en([16.5, 0, 1.8]); s.palo([0, 0, 0], [15, 0, 0], 0.55, 'madera_lisa'); s.poli([[15, 1, 0], [15, -1, 0], [15, 0, 0.5], [15, 0, -0.5], [17.5, 0, 0]], 'hierro'); s.caja([1.5, 0, 0], [2.4, 2.4, 0.3], 'cuero'); }
}

function baculo(b: Pz, v: string): { largo: number; gema?: V3 } {
  const hueso = v === 'hueso';
  const mat = hueso ? 'hueso' : 'madera_vieja';
  const L = 54;
  let y = 0;
  for (let i = 0; i < 5; i++) { const ny = (b.a.r() - 0.5) * 1.2; b.palo([(L * i) / 5, y, 0], [(L * (i + 1)) / 5, ny, 0], 1.15 - i * 0.04, mat); y = ny; if (i && !hueso) b.bola([(L * i) / 5, y, 0], 1.4, mat, { tono: 0.06 }); }
  if (hueso) for (let x = 6; x < L; x += 9) b.palo([x, y * 0, 0], [x + 1.5, 0, 0], 1.5, 'hueso', { tono: 0.1 });
  b.palo([18, 0, 0], [26, 0, 0], 1.4, 'cuero');
  if (v === 'roble') { b.elip([L + 1.5, y, 0], [3.2, 2.4, 2.4], 'madera_vieja'); return { largo: L + 4 }; }
  if (hueso) {
    // calavera en la punta
    const s = b.en([L + 3, y, 0], [1, 0, 0], [0, 1, 0]);
    s.elip([0, 0, 0], [3.2, 2.6, 2.8], 'hueso').elip([1.5, 0, -1], [2, 1.9, 1.5], 'hueso', { tono: -0.05 });
    s.bola([0.6, 1, 1.8], 0.8, 'negro', { resta: true }).bola([0.6, -1, 1.8], 0.8, 'negro', { resta: true });
    s.bola([0.6, 1, 1.4], 0.7, 'magia').bola([0.6, -1, 1.4], 0.7, 'magia');
    return { largo: L + 6, gema: b.p([L + 3, y, 2]) };
  }
  // garras que sostienen la gema
  const gm = v === 'gema_azul' ? 'runa' : v === 'gema_roja' ? 'portal_rojo' : 'magia';
  for (let i = 0; i < 3; i++) {
    const th = (i * 120 + 30) * RAD, cy = Math.cos(th), cz = Math.sin(th);
    b.palo([L, y + cy * 0.8, cz * 0.8], [L + 3, y + cy * 3.4, cz * 3.4], 0.6, mat).palo([L + 3, y + cy * 3.4, cz * 3.4], [L + 7, y + cy * 1.2, cz * 1.2], 0.5, mat, { r1: 0.2 });
  }
  b.poli([[L + 2.4, y, 0], [L + 4.5, y + 2, 0], [L + 4.5, y - 2, 0], [L + 4.5, y, 2], [L + 4.5, y, -2], [L + 7.5, y, 0]], gm);
  return { largo: L + 8, gema: b.p([L + 4.5, y, 0]) };
}

function varita(b: Pz, v: string): V3 | undefined {
  const mat = v === 'hueso' ? 'hueso' : 'madera_lisa';
  b.palo([0, 0, 0], [16, 0, 0], 0.95, mat, { r1: 0.7 });
  b.palo([0, 0, 0], [5, 0, 0], 1.15, v === 'hueso' ? 'hueso' : 'cuero', { tono: -0.1 });
  b.bola([0, 0, 0], 1.0, v === 'hueso' ? 'hueso' : 'bronce');
  if (v === 'gema') { b.palo([15.5, 0, 0], [17, 0, 0], 1.0, 'oro'); b.poli([[16.5, 0, 0], [18, 1.1, 0], [18, -1.1, 0], [18, 0, 1.1], [18, 0, -1.1], [20, 0, 0]], 'fuego_verde'); return b.p([18, 0, 0]); }
  if (v === 'hueso') { b.bola([16.5, 0, 0], 1.3, 'hueso'); b.bola([16.5, 0.5, 0.7], 0.5, 'negro'); }
  else b.bola([16.3, 0, 0], 1.0, 'madera_vieja');
  return undefined;
}

// ------------------------------------------------------------------ escudos (en su marco: x hacia arriba de la cara, y a lo ancho, z hacia afuera)
function escRedondo(b: Pz, v: string) {
  const R = 11;
  b.palo([0, 0, -1.2], [0, 0, 1.2], R + 0.6, v === 'hierro' ? 'hierro' : 'hierro_oxido');
  b.palo([0, 0, -2], [0, 0, 2], R - 0.6, 'negro', { resta: true });
  b.palo([0, 0, -0.9], [0, 0, 0.9], R - 0.4, v === 'hierro' ? 'hierro' : 'madera');
  if (v === 'pintado') {
    b.caja([0, 0, 0.95], [R * 2 - 1.5, 4, 0.3], 'tela_roja').caja([0, 0, 0.95], [4, R * 2 - 1.5, 0.3], 'tela_roja');
  }
  if (v === 'roto') { b.poli([[3, -3, -3], [3, -3, 3], [14, -3, -3], [14, -3, 3], [4, -14, -3], [4, -14, 3], [14, -14, 3], [14, -14, -3]], 'negro', { resta: true }); b.palo([2.8, -3.6, 1], [8, -6, 1], 0.5, 'madera_vieja', { tono: 0.1 }); }
  b.elip([0, 0, 0.8], [3.4, 3.4, 2.2], v === 'pintado' ? 'bronce' : 'hierro');
  for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2; if (v === 'roto' && Math.cos(t) > 0.3 && Math.sin(t) < -0.3) continue; b.bola([Math.cos(t) * (R - 2), Math.sin(t) * (R - 2), 0.9], 0.7, 'hierro', { tono: 0.1 }); }
}
function escCometa(b: Pz, v: string) {
  const cara = v === 'blason_azul' ? 'tela_azul' : v === 'blason_rojo' ? 'tela_roja' : v === 'oxidado' ? 'hierro_oxido' : 'hierro';
  const borde = v === 'oxidado' ? 'hierro_oxido' : v === 'hierro' ? 'acero' : 'hierro';
  const out = (k: number, z: number): V3[] => [[0, 0, z], [16 * k, 10.5 * k, z], [16 * k, -10.5 * k, z], [26 * k, 10.5 * k, z], [26 * k, -10.5 * k, z], [29 * k, 8 * k, z], [29 * k, -8 * k, z], [30 * k, 0, z]];
  b.poli([...out(1, -1.0), ...out(1, 0.3)], borde);
  b.en([1.6, 0, 0]).poli([...out(0.92, 0.2), ...out(0.92, 0.9)], cara);
  if (v === 'blason_rojo' || v === 'blason_azul') {
    const em = v === 'blason_rojo' ? 'oro' : 'hueso';
    b.caja([16, 0, 0.95], [22, 3, 0.3], em).caja([22, 0, 0.95], [3, 15, 0.3], em);
  } else { b.caja([15, 0, 0.6], [26, 2.2, 0.7], borde); b.caja([21, 0, 0.6], [2.2, 18, 0.7], borde); }
  b.elip([21, 0, 0.8], [2.2, 2.2, 1.4], borde);
}
function escTorre(b: Pz, v: string) {
  const mat = v === 'madera' ? 'madera' : v === 'oxidado' ? 'hierro_oxido' : 'hierro';
  const banda = v === 'madera' ? 'hierro' : v === 'oxidado' ? 'hierro_oxido' : 'acero';
  for (const [y, g] of [[0, 0], [-10, -18], [10, 18]] as [number, number][]) {
    const s = b.en([0, y, 0], [1, 0, 0], [0, Math.cos(g * RAD), Math.sin(g * RAD)]);
    s.caja([20, 0, 0], [40, g ? 7.6 : 13, 1.8], mat, { tono: g ? -0.03 : 0 });
    for (const x of [3, 20, 37]) s.caja([x, 0, 0.2], [2.6, g ? 7.8 : 13.2, 2], banda);
    for (const x of [3, 37]) for (const yy of [-2.5, 2.5]) s.bola([x, yy, 1.1], 0.7, banda, { tono: 0.15 });
  }
  b.caja([28, 0, 1.2], [8, 7, 1], banda);
  if (v === 'oxidado') b.caja([11, -2, 0], [4, 3, 6], 'negro', { resta: true });
}
function rodela(b: Pz, v: string) {
  const mat = v === 'bronce' ? 'bronce' : v === 'madera' ? 'madera' : 'hierro';
  b.palo([0, 0, -0.6], [0, 0, 0.8], 7, mat, { r1: 6.6 });
  b.palo([0, 0, 0.8], [0, 0, 1.6], 6.6, mat, { r1: 4.8, tono: 0.06 });
  b.palo([0, 0, -0.7], [0, 0, 0.9], 7.3, v === 'madera' ? 'hierro' : mat, { tono: -0.1 });
  b.palo([0, 0, -1], [0, 0, 2], 6.4, 'negro', { resta: true });
  b.palo([0, 0, -0.6], [0, 0, 1.4], 6.5, mat, { r1: 4.6 });
  b.elip([0, 0, 1.4], [2.4, 2.4, 1.8], v === 'madera' ? 'hierro' : mat, { tono: 0.08 });
  b.palo([0, 0, 2.8], [0, 0, 4.6], 0.9, v === 'madera' ? 'hierro' : mat, { r1: 0 });
}
/** Escudo apoyado: el borde de abajo en el piso, la cara mirando a la cámara, echado atrás `incl` grados. */
function escApoyado(raiz: Pz, alto: number, incl: number, g = 45, abajo = 0): Pz {
  const n: V3 = [Math.cos(g * RAD) * Math.cos(incl * RAD), Math.sin(g * RAD) * Math.cos(incl * RAD), Math.sin(incl * RAD)];
  const up: V3 = [-Math.cos(g * RAD) * Math.sin(incl * RAD), -Math.sin(g * RAD) * Math.sin(incl * RAD), Math.cos(incl * RAD)];
  const side = cr(n, up);
  const o: V3 = [up[0] * (alto - abajo) - n[0] * 1.2, up[1] * (alto - abajo) - n[1] * 1.2, up[2] * (alto - abajo) + 0.5];
  return raiz.en(o, up, side);
}

// ------------------------------------------------------------------ yelmos (en su marco: z arriba, x adelante)
function yelmo(b: Pz, v: string, mat: string) {
  const borde = mat === 'hierro_oxido' ? 'hierro_oxido' : mat === 'oro' ? 'oro' : 'acero';
  if (v === 'gorro') {
    b.elip([0, 0, 0], [6.4, 5.8, 9], mat).caja([0, 0, -5], [20, 20, 10], 'negro', { resta: true });
    b.palo([0, 0, 0], [0, 0, 1.6], 6.6, borde, { r1: 6.5 });
    b.caja([6.2, 0, 0], [1.2, 1.6, 7], borde);
    b.caja([0, 0, 7.6], [3, 2, 1.4], borde, { tono: 0.1 });
    return;
  }
  if (v === 'cerrado' || v === 'oxidado') {
    b.palo([0, 0, 0], [0, 0, 9], 6, mat, { r1: 6.2 });
    b.elip([0, 0, 9], [6.2, 6.2, 4.2], mat);
    b.caja([6, 0, 5.6], [5, 10, 1.7], 'negro', { resta: true });
    b.caja([6, 0, 1.2], [4, 0.8, 3.2], 'negro', { resta: true });
    for (const y of [-2.5, -1, 1, 2.5]) b.bola([5.9, y, 3.2], 0.45, 'negro', { resta: true });
    b.caja([5.3, 0, 2], [1.8, 1.6, 11], borde).caja([0, 0, 6.4], [12.6, 12.6, 1.3], borde, { tono: -0.05 });
    b.palo([0, 0, -0.2], [0, 0, 1.3], 6.3, borde);
    if (v === 'oxidado') { b.bola([3, 4.8, 9], 2.2, 'negro', { resta: true }); b.elip([2.9, 4.1, 9], [1.4, 1.4, 1.4], 'hierro_oxido', { tono: -0.2 }); }
    return;
  }
  // cuernos
  b.palo([0, 0, 0], [0, 0, 6], 6, mat, { r1: 6.2 });
  b.elip([0, 0, 6], [6.2, 6.2, 5.4], mat);
  b.caja([6, 0, 3], [4, 2.4, 3], 'negro', { resta: true });
  b.caja([5.8, 0, 0], [1.6, 1.8, 7], borde).palo([0, 0, 4.5], [0, 0, 5.8], 6.4, borde);
  for (const s of [1, -1]) {
    let p: V3 = [0.5, s * 5.6, 6.6]; let dir: V3 = [0.2, s * 1, 0.25]; let r = 1.7;
    for (let i = 0; i < 5; i++) { const q: V3 = [p[0] + dir[0] * 3, p[1] + dir[1] * 3, p[2] + dir[2] * 3]; b.palo(p, q, r, 'hueso', { r1: r * 0.75, tono: -i * 0.04 }); p = q; r *= 0.75; dir = nr([dir[0] + 0.12, dir[1] * 0.75, dir[2] + 0.45]); }
  }
}

// ------------------------------------------------------------------ armaduras
/** Peto tendido boca arriba, en el marco del piso (x adelante = hacia la cabeza). */
function peto(b: Pz, mat: string, borde: string) {
  b.elip([0, 0, 0], [9.5, 8, 4.5], mat).caja([0, 0, -5], [30, 30, 10], 'negro', { resta: true });
  b.caja([0, 0, 4.1], [17, 1.2, 1.2], borde, { tono: 0.1 });
  b.palo([9.3, -4, 1.5], [9.3, 4, 1.5], 1.4, borde);
  for (let i = 0; i < 3; i++) b.caja([-10 - i * 2.4, 0, 0], [3, 13 - i * 0.6, 2.8 - i * 0.4], mat, { tono: -0.05 * i });
}
function hombrera(b: Pz, mat: string) { b.elip([0, 0, 0], [4.6, 4.2, 3.4], mat).caja([0, 0, -4], [12, 12, 8], 'negro', { resta: true }); b.elip([-0.5, 0, 0], [4.9, 4.4, 1.1], mat, { tono: -0.08 }); }
function guantelete(b: Pz, mat: string) { b.palo([0, 0, 1.6], [5, 0, 1.6], 1.8, mat, { r1: 2.2 }); b.caja([7.3, 0, 1.2], [4.6, 3.8, 2.2], mat); for (const y of [-1.2, 0, 1.2]) b.caja([10.4, y, 0.8], [2.6, 1.1, 1.4], mat, { tono: -0.08 }); }
function greba(b: Pz, mat: string) { b.palo([0, 0, 2], [13, 0, 2], 2.0, mat, { r1: 1.7 }); b.bola([0, 0, 2], 2.4, mat, { tono: 0.08 }); b.caja([15.3, 1, 1.4], [3.2, 5.5, 2.8], mat); }

// ------------------------------------------------------------------ registro
const sobre = (a: Arma) => (a.r() * 360);
const armaTirada = (id: string, nombre: [string, string], huella: [number, number], largo: number, h0: number, h1: number, fn: (b: Pz, m: Met) => void, variantes = VAR_METAL) => ({
  id, nombre, tema: 'armas' as const, variantes, huella, bloquea: false,
  armar: (v: string, _f: number, a: Arma) => {
    const ps: Pieza[] = []; const m = MET(v);
    if (m.sangre) charco(a, ps, (a.r() - 0.5) * 8, (a.r() - 0.5) * 8, 5 + a.r() * 3);
    fn(tendido(new Pz(a, ps), largo, h0, h1, sobre(a)), m);
    return ps;
  },
});

const ESP_CORTA: OpEspada = { hoja: 20, ancho: 3.2, puno: 6, guarda: 8 };
const ESP_LARGA: OpEspada = { hoja: 31, ancho: 3.4, puno: 8, guarda: 11 };
const MANDOBLE: OpEspada = { hoja: 42, ancho: 4.2, puno: 13, guarda: 17, pomo: 2, grueso: 1.4 };

registrar(
  armaTirada('arm_espada_corta', ['Espada corta', 'Short sword'], [2, 2], largoEspada(ESP_CORTA), 1.6, 0.8, (b, m) => espada(b, m, ESP_CORTA)),
  armaTirada('arm_espada_larga', ['Espada larga', 'Long sword'], [3, 2], largoEspada(ESP_LARGA), 1.6, 0.8, (b, m) => espada(b, m, ESP_LARGA)),
  armaTirada('arm_mandoble', ['Mandoble', 'Greatsword'], [4, 2], largoEspada(MANDOBLE), 2, 0.9, (b, m) => espada(b, m, MANDOBLE)),
  armaTirada('arm_falcata', ['Falcata', 'Falchion'], [2, 2], 35.6, 1.5, 0.8, (b, m) => falcata(b, m)),
  armaTirada('arm_daga', ['Daga', 'Dagger'], [1, 1], 18, 1.2, 0.6, (b, m) => daga(b, m, false)),
  {
    id: 'arm_daga_curva', nombre: ['Daga curva', 'Curved dagger'], tema: 'armas', variantes: ['hierro', 'oro', 'ensangrentada'], huella: [1, 1], bloquea: false,
    armar: (v, _f, a) => { const ps: Pieza[] = []; const m = MET(v); if (m.sangre) charco(a, ps, 2, 1, 4); daga(tendido(new Pz(a, ps), 18, 1.2, 0.6, sobre(a)), m, true); return ps; },
  },
  armaTirada('arm_hacha_mano', ['Hacha de mano', 'Hand axe'], [2, 2], 29, 1.2, 1.6, (b, m) => hachaMano(b, m)),
  armaTirada('arm_gran_hacha', ['Gran hacha', 'Great axe'], [4, 2], 59, 1.4, 1.6, (b, m) => granHacha(b, m)),
  armaTirada('arm_maza', ['Maza de armas', 'Flanged mace'], [2, 2], 32, 1.4, 4.4, (b, m) => maza(b, m, false), ['hierro', 'oxidada', 'oro', 'ensangrentada']),
  armaTirada('arm_lucero', ['Lucero del alba', 'Morning star'], [2, 2], 34, 1.4, 4.2, (b, m) => maza(b, m, true), ['hierro', 'oxidada', 'ensangrentada']),
  armaTirada('arm_martillo_guerra', ['Martillo de guerra', 'War hammer'], [3, 2], 51, 1.2, 3, (b, m) => martillo(b, m)),
  {
    id: 'arm_mangual', nombre: ['Mangual', 'Flail'], tema: 'armas', variantes: ['hierro', 'oxidada', 'ensangrentada'], huella: [2, 2], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = []; const m = MET(v); const raiz = new Pz(a, ps); const g = sobre(a);
      if (m.sangre) charco(a, ps, 4, 2, 6);
      mangual(tendido(raiz, 17, 1.4, 1.6, g, -6 * Math.cos(g * RAD), -6 * Math.sin(g * RAD)), m, raiz, g * RAD + 0.6);
      return ps;
    },
  },
  armaTirada('arm_lanza', ['Lanza', 'Spear'], [5, 2], 79, 1.1, 0.8, (b, m) => lanza(b, m), ['hierro', 'oxidada', 'ensangrentada']),
  {
    id: 'arm_lanza_rota', nombre: ['Lanza rota', 'Broken spear'], tema: 'armas', variantes: ['hierro', 'oxidada'], huella: [3, 2], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = []; const m = MET(v); const raiz = new Pz(a, ps); const g = sobre(a);
      const t = tendido(raiz, 36, 1.1, 1.0, g);
      t.palo([0, 0, 0], [34, 0, 0], 0.95, m.asta).palo([-1.5, 0, 0], [1, 0, 0], 1.1, m.guarda);
      t.poli([[34, -0.9, 0.9], [34, 0.9, -0.9], [34, 0.9, 0.9], [34, -0.9, -0.9], [36.5, 0.3, 0]], m.asta, { tono: 0.12 });
      const s = tendido(raiz, 26, 1.0, 0.8, g + 25 + a.r() * 30, Math.cos(g * RAD) * 26 + 6, Math.sin(g * RAD) * 26 + 4);
      s.poli([[0, -0.9, 0.9], [0, 0.9, -0.9], [0, 0.9, 0.9], [0, -0.9, -0.9], [-2.2, 0, 0]], m.asta, { tono: 0.12 });
      s.palo([0, 0, 0], [10, 0, 0], 0.95, m.asta).palo([9.5, 0, 0], [13.5, 0, 0], 1.3, m.guarda, { r1: 0.9 });
      s.poli([[13, 0.9, 0], [13, -0.9, 0], [17.5, 2.6, 0], [17.5, -2.6, 0], [25, 0, 0], [13, 0, 0.7], [13, 0, -0.7], [18, 0, 0.7], [18, 0, -0.7]], m.hoja);
      return ps;
    },
  },
  armaTirada('arm_alabarda', ['Alabarda', 'Halberd'], [5, 2], 82, 1.1, 1.0, (b, m) => alabarda(b, m), ['hierro', 'oxidada', 'ensangrentada']),
  armaTirada('arm_guadana', ['Guadaña', 'Scythe'], [4, 3], 58, 1.1, 0.6, (b, m) => guadana(b, m), ['hierro', 'oxidada', 'ensangrentada']),
  {
    id: 'arm_arco', nombre: ['Arco', 'Bow'], tema: 'armas', variantes: ['corto', 'largo', 'recurvo', 'roto'], huella: [3, 2], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = []; const raiz = new Pz(a, ps); const g = sobre(a);
      const L = v === 'largo' ? 62 : v === 'recurvo' ? 44 : 40;
      arco(tendido(raiz, 6, 1.3, 1.3, g), L, v === 'largo' ? 7 : 5.5, v === 'recurvo' ? 'cuero' : v === 'roto' ? 'madera_vieja' : 'madera_lisa', v === 'recurvo', v === 'roto');
      if (v === 'recurvo') { const b = tendido(raiz, 6, 1.3, 1.3, g); for (const s of [1, -1]) b.palo([-3, s * 16, 0], [-3, s * 21, 0], 1.0, 'hueso'); }
      if (v === 'largo') flecha(tendido(raiz, 32, 0.6, 0.6, g + 80 + a.r() * 20, 8, 4), 0, 28);
      return ps;
    },
  },
  {
    id: 'arm_ballesta', nombre: ['Ballesta', 'Crossbow'], tema: 'armas', variantes: ['cargada', 'descargada', 'oxidada'], huella: [2, 2], bloquea: false,
    armar: (v, _f, a) => { const ps: Pieza[] = []; ballesta(tendido(new Pz(a, ps), 34, 1.6, 1.4, sobre(a)), MET(v), v === 'cargada'); return ps; },
  },
  {
    id: 'arm_carcaj', nombre: ['Carcaj con flechas', 'Quiver of arrows'], tema: 'armas', variantes: ['parado', 'tirado', 'vacio'], huella: [1, 1], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = []; const raiz = new Pz(a, ps); const g = sobre(a);
      const plumas = ['hueso', 'tela_roja', 'tela_verde'];
      const carcaj = (b: Pz) => {
        b.palo([0, 0, 0], [21, 0, 0], 3.3, 'cuero', { r1: 3.7 });
        b.palo([1, 0, 0], [3, 0, 0], 3.6, 'hierro_oxido').palo([19, 0, 0], [21, 0, 0], 3.95, 'cuero', { tono: 0.1 });
        b.palo([16, 0, 0], [24, 0, 0], 3.0, 'negro', { resta: true });
        b.palo([4, 0, 0], [17, 0, 0], 3.1, 'negro');
        b.palo([2, 0, -3.3], [19, 0, -3.6], 0.8, 'cuero', { tono: -0.12 });
        b.caja([9, 0, 3.3], [7, 3.4, 0.8], 'cuero', { tono: 0.08 });
      };
      if (v === 'parado') {
        const b = raiz.en([0, 0, 0], [Math.sin(6 * RAD), 0, Math.cos(6 * RAD)], [0, 1, 0]);
        carcaj(b);
        for (let i = 0; i < 8; i++) { const ty = (a.r() - 0.5) * 4.4, tz = (a.r() - 0.5) * 4.4; const s = b.en([18 + a.r() * 2, ty, tz], [-1, -ty * 0.1, -tz * 0.1], [0, Math.cos(i), Math.sin(i)]); flecha(s, -12, 12 + a.r() * 2, plumas[i % 3]); }
        ps.push(a.cilindro(0, 0, 0, 5, 0.8, { mat: 'tierra', r1: 4 }));
        return ps;
      }
      carcaj(tendido(raiz, 22, 3.7, 3.5, g, -4, 0));
      const n = v === 'vacio' ? 2 : 6;
      for (let i = 0; i < n; i++) {
        const gg = g + (a.r() - 0.5) * 40, d = 10 + a.r() * 10;
        flecha(tendido(raiz, 30, 0.6, 0.6, gg, Math.cos(g * RAD) * d + (a.r() - 0.5) * 4, Math.sin(g * RAD) * d + (a.r() - 0.5) * 4), 0, v === 'vacio' && i ? 14 : 28, plumas[i % 3]);
      }
      return ps;
    },
  },
  {
    id: 'arm_baculo', nombre: ['Báculo', 'Staff'], tema: 'armas', variantes: ['roble', 'gema_azul', 'gema_morada', 'hueso'], huella: [4, 2], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = []; const r = baculo(tendido(new Pz(a, ps), 62, 1.2, 3.6, sobre(a)), v);
      if (!r.gema) return ps;
      return { piezas: ps, resplandor: { c: r.gema, r: 16, color: v === 'gema_azul' ? '#5ac8f0' : v === 'hueso' ? '#b46ae8' : '#b46ae8' } };
    },
  },
  {
    id: 'arm_varita', nombre: ['Varita', 'Wand'], tema: 'armas', variantes: ['madera', 'gema', 'hueso'], huella: [1, 1], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = []; const g = varita(tendido(new Pz(a, ps), 19, 1.0, 1.2, sobre(a)), v);
      return g ? { piezas: ps, resplandor: { c: g, r: 10, color: '#8af06a' } } : ps;
    },
  },
);

// escudos: apoyados mirando a la cámara, o tirados boca arriba
const escudo = (id: string, nombre: [string, string], variantes: string[], huella: [number, number], fn: (b: Pz, v: string) => void, alto: number, centrado: boolean, tirado: string[]) => ({
  id, nombre, tema: 'armas' as const, variantes, huella, bloquea: false,
  armar: (v: string, _f: number, a: Arma) => {
    const ps: Pieza[] = []; const raiz = new Pz(a, ps);
    if (v === 'tirado') { const t = raiz.gira([0, 0, 1.2], sobre(a)); fn(centrado ? t : t.en([-alto / 2, 0, 0]), tirado[Math.floor(a.r() * tirado.length)]); return ps; }
    fn(escApoyado(raiz, centrado ? alto / 2 : 0, 14 + a.r() * 8, 45 + (a.r() - 0.5) * 16), v);
    return ps;
  },
});
registrar(
  escudo('arm_escudo_redondo', ['Escudo redondo', 'Round shield'], ['madera', 'pintado', 'hierro', 'roto', 'tirado'], [2, 1], escRedondo, 22, true, ['madera', 'pintado', 'roto']),
  escudo('arm_escudo_cometa', ['Escudo de cometa', 'Kite shield'], ['hierro', 'blason_rojo', 'blason_azul', 'oxidado', 'tirado'], [2, 1], escCometa, 30, false, ['hierro', 'blason_rojo', 'oxidado']),
  escudo('arm_escudo_torre', ['Escudo de torre', 'Tower shield'], ['hierro', 'madera', 'oxidado', 'tirado'], [2, 2], escTorre, 40, false, ['madera', 'hierro']),
  escudo('arm_rodela', ['Rodela', 'Buckler'], ['hierro', 'bronce', 'madera', 'tirado'], [1, 1], rodela, 14.6, true, ['hierro', 'bronce']),
);

// yelmos y armaduras
registrar(
  {
    id: 'arm_yelmo', nombre: ['Yelmo', 'Helm'], tema: 'armas', variantes: ['gorro', 'cerrado', 'cuernos', 'oxidado', 'dorado'], huella: [1, 1], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = []; const raiz = new Pz(a, ps);
      const mat = v === 'oxidado' ? 'hierro_oxido' : v === 'dorado' ? 'oro' : v === 'cuernos' ? 'hierro' : 'acero';
      const forma = v === 'dorado' ? 'cerrado' : v;
      if (v === 'oxidado') { yelmo(raiz.en([0, 0, 6.2], [Math.cos(0.8), Math.sin(0.8), 0], [0, 0, 1]), forma, mat); return ps; }
      yelmo(raiz.gira([0, 0, 0], 20 + a.r() * 40), forma, mat);
      return ps;
    },
  },
  {
    id: 'arm_armadura_suelo', nombre: ['Armadura tirada', 'Discarded armor'], tema: 'armas', variantes: ['placas', 'oxidada', 'cota', 'cuero'], huella: [3, 2], bloquea: false,
    armar: (v, _f, a) => {
      const ps: Pieza[] = []; const raiz = new Pz(a, ps); const g = a.r() * 360;
      const mat = v === 'oxidada' ? 'hierro_oxido' : v === 'cuero' ? 'cuero' : 'acero', borde = v === 'oxidada' ? 'hierro_oxido' : v === 'cuero' ? 'hierro' : 'hierro';
      if (v === 'cota') {
        // cota de malla arrugada: bultos de hierro con mucho ruido
        const b = raiz.gira([0, 0, 0], g);
        for (let i = 0; i < 9; i++) b.elip([(a.r() - 0.5) * 16, (a.r() - 0.5) * 12, 0], [4 + a.r() * 4, 3 + a.r() * 3, 1.6 + a.r() * 1.8], 'hierro', { tono: (a.r() - 0.5) * 0.15 });
        b.elip([12, 3, 0], [6, 3, 1.4], 'hierro', { tono: -0.05 }).elip([-11, -4, 0], [5, 3, 1.2], 'hierro', { tono: -0.05 });
        b.palo([-6, 7, 0.8], [6, 9, 0.8], 1.0, 'cuero');
        yelmo(raiz.gira([16, -12, 0], a.r() * 360), 'gorro', 'hierro');
        return ps;
      }
      peto(raiz.gira([0, 0, 0], g), mat, borde);
      hombrera(raiz.gira([Math.cos(g * RAD) * 8 + 9, Math.sin(g * RAD) * 8 - 5, 0], g + 40), mat);
      guantelete(raiz.gira([-14 + a.r() * 4, 10, 0], a.r() * 360), mat);
      greba(raiz.gira([12, 12, 0], a.r() * 360), mat);
      if (v !== 'cuero') yelmo(raiz.en([-12, -12, 6], [0.6, -0.8, 0], [0, 0, 1]), 'cerrado', mat);
      return ps;
    },
  },
);

// ------------------------------------------------------------------ montones, armeros, maniquíes
registrar(
  {
    id: 'arm_pila_armas', nombre: ['Montón de armas', 'Weapon pile'], tema: 'armas', variantes: ['chico', 'grande', 'con_huesos'], huella: [3, 3], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = []; const raiz = new Pz(a, ps);
      const n = v === 'chico' ? 4 : 8;
      const tipos = [
        (b: Pz, m: Met) => espada(b, m, ESP_LARGA), (b: Pz, m: Met) => granHacha(b, m), (b: Pz, m: Met) => lanza(b, m), (b: Pz, m: Met) => maza(b, m, false),
        (b: Pz, m: Met) => espada(b, m, ESP_CORTA), (b: Pz, m: Met) => hachaMano(b, m), (b: Pz, m: Met) => martillo(b, m), (b: Pz, m: Met) => alabarda(b, m),
      ];
      const largos = [44, 59, 79, 32, 30, 29, 51, 82];
      if (v !== 'chico') escRedondo(raiz.en([2, 3, 4], [0.95, 0, 0.3], [0, 1, 0]), 'pintado');
      for (let i = 0; i < n; i++) {
        const k = (i * 3 + Math.floor(a.r() * 2)) % tipos.length, g = a.r() * 360;
        const L = Math.min(largos[k], v === 'chico' ? 45 : 60);
        const h0 = 1.2 + a.r() * (v === 'chico' ? 2 : 7), h1 = 1 + a.r() * (v === 'chico' ? 3 : 9);
        tipos[k](tendido(raiz, L, h0, h1, g, (a.r() - 0.5) * 10, (a.r() - 0.5) * 10), MET(a.r() < 0.4 ? 'oxidada' : 'hierro'));
      }
      if (v !== 'chico') { yelmo(raiz.en([-12, 10, 6], [0.3, 1, 0], [0, 0, 1]), 'cerrado', 'hierro'); yelmo(raiz.gira([14, -8, 6], 30), 'gorro', 'hierro_oxido'); }
      if (v === 'con_huesos') {
        const b = raiz;
        b.bola([-6, 15, 3], 3.2, 'hueso').bola([-4.3, 16.6, 3.3], 0.9, 'negro').bola([-5.5, 17.2, 3.3], 0.9, 'negro');
        for (let i = 0; i < 5; i++) { const x = (a.r() - 0.5) * 30, y = (a.r() - 0.5) * 30, gg = a.r() * 6; b.palo([x, y, 1], [x + Math.cos(gg) * 10, y + Math.sin(gg) * 10, 1], 0.9, 'hueso'); b.bola([x, y, 1.2], 1.4, 'hueso'); }
        for (let i = 0; i < 4; i++) b.palo([10 + i * 2, 10, 1 + i * 0.5], [12 + i * 2, 4, 2 + i * 0.5], 0.7, 'hueso', { tono: -0.05 });
      }
      ps.push(a.elipsoide(0, 0, 0, 22, 20, 0.8, { mat: 'tierra', tono: -0.05 }));
      return ps;
    },
  },
);

/** Armero: a lo largo de x, el frente mira a +y. */
function armero(v: string, a: Arma, giro: number): Pieza[] {
  const ps: Pieza[] = []; const b = new Pz(a, ps).gira([0, 0, 0], giro);
  const W = 50;
  b.base(0, -1, 0, W + 6, 10, 2.5, 'madera', { tono: -0.05 });
  for (const x of [-W / 2, W / 2]) { b.base(x, -2, 0, 3, 3, 46, 'madera'); b.base(x, 2, 0, 3, 8, 3, 'madera', { tono: -0.05 }); b.poli([[x - 1.5, -3.5, 46], [x + 1.5, -3.5, 46], [x - 1.5, -0.5, 46], [x + 1.5, -0.5, 46], [x, -2, 49]], 'madera'); }
  b.base(0, -2, 40, W, 3.4, 3, 'madera');
  b.base(0, 2.5, 14, W, 2.4, 2.2, 'madera', { tono: 0.05 });
  for (let x = -W / 2 + 6; x < W / 2 - 3; x += 6) b.base(x, -2, 40.5, 2.8, 4, 2.4, 'negro', { tono: 0.05, resta: false });
  const lado: V3 = [1, 0, 0];
  const n = v === 'lanzas' ? 7 : 6;
  for (let i = 0; i < n; i++) {
    if (v === 'vacio' && i % 3) continue;
    const x = -W / 2 + 6 + i * (W - 12) / (n - 1);
    const m = MET(a.r() < 0.25 ? 'oxidada' : 'hierro');
    const incl = 6 + a.r() * 3;
    if (v === 'espadas' || v === 'vacio') {
      // punta abajo, empuñadura arriba
      const s = parado(b, [x, 1.5, 1], lado, -incl).en([0, 0, 0], [1, 0, 0], [0, 1, 0]);
      const o = i % 2 ? ESP_LARGA : ESP_CORTA, L = largoEspada(o);
      espada(s.en([L, 0, 0], [-1, 0, 0], [0, -1, 0]), m, o);
    } else if (v === 'lanzas') {
      const s = parado(b, [x, 1.5, 2], lado, -incl);
      if (i % 3 === 2) alabarda(s, m); else lanza(s, m);
    } else {
      const s = parado(b, [x, 1.5, 2], lado, -incl);
      if (i === 0 || i === n - 1) granHacha(s, m); else hachaMano(s.en([0, 0, 0], [1, 0, 0], [0, 0, 1]), m);
    }
  }
  if (v === 'vacio') ps.push(a.caja(14, 10, 0, 5, 4, 1.5, { mat: 'madera_vieja', giro: 30 }));
  return ps;
}
registrar(
  { id: 'arm_armero', nombre: ['Armero', 'Weapon rack'], tema: 'armas', variantes: ['espadas', 'lanzas', 'hachas', 'vacio'], huella: [4, 1], bloquea: true, armar: (v, _f, a) => armero(v, a, 0) },
  { id: 'arm_armero_y', nombre: ['Armero (eje y)', 'Weapon rack (y axis)'], tema: 'armas', variantes: ['espadas', 'lanzas', 'hachas', 'vacio'], huella: [1, 4], bloquea: true, armar: (v, _f, a) => armero(v, a, -90) },
);

/** Maniquí con armadura completa, mirando hacia la cámara (+x+y). */
function maniqui(v: string, a: Arma): Pieza[] {
  const ps: Pieza[] = []; const raiz = new Pz(a, ps); const b = raiz.gira([0, 0, 0], 45 + (a.r() - 0.5) * 10);
  const mat = v === 'oxidada' ? 'hierro_oxido' : v === 'dorada' ? 'acero' : 'acero';
  const borde = v === 'oxidada' ? 'hierro_oxido' : v === 'dorada' ? 'oro' : 'hierro';
  // la base en cruz y el poste
  b.base(0, 0, 0, 26, 4, 3, 'madera').base(0, 0, 0, 4, 26, 3, 'madera').cil(0, 0, 0, 1.6, 60, 'madera');
  if (v === 'vacio') {
    b.base(0, 0, 44, 3, 26, 3, 'madera');
    b.elip([0, 0, 50], [3, 3, 4], 'madera_vieja');
    yelmo(raiz.gira([10, 8, 0], 60), 'cerrado', 'hierro_oxido');
    ps.push(a.caja(-10, 10, 0, 6, 3, 1.4, { mat: 'cuero', giro: 20 }));
    return ps;
  }
  // piernas
  for (const s of [1, -1]) {
    b.cil(0, s * 4, 3, 2.6, 13, mat, { r1: 2.2 }).bola([0.5, s * 4, 16.5], 2.8, mat, { tono: 0.08 }).cil(0, s * 4, 17, 2.8, 12, mat, { r1: 3.2 });
    b.base(1.5, s * 4, 3, 7, 4.4, 2.6, mat, { tono: -0.05 });
  }
  // faldar y escarcelas
  b.cil(0, 0, 27, 7.2, 7, mat, { r1: 6.6 });
  for (let i = 0; i < 3; i++) b.cil(0, 0, 27 + i * 2.4, 7.4 - i * 0.2, 1.2, borde, { tono: -0.05 });
  for (const s of [1, -1]) b.en([2.5, s * 4, 30]).poli([[0, -3, 0], [0, 3, 0], [3, -3.2, -6], [3, 3.2, -6], [1.5, -3, 0], [1.5, 3, 0], [4.5, -3.2, -6], [4.5, 3.2, -6]], mat);
  if (v === 'dorada') b.poli([[3, -6, 34], [3, 6, 34], [4.5, -5, 14], [4.5, 5, 14], [6, -6, 34], [6, 6, 34], [7, -5, 14], [7, 5, 14]], 'tela_roja');
  // torso
  b.elip([0.5, 0, 41], [6.5, 9, 9], mat);
  b.elip([2.2, 0, 42], [5.5, 7.5, 7.5], mat, { tono: 0.06 });
  b.caja([7.4, 0, 41], [1, 1.4, 12], borde, { tono: 0.1 });
  b.cil(0, 0, 48.5, 4.6, 3.6, borde);
  // hombreras y brazos
  for (const s of [1, -1]) {
    b.elip([0, s * 10.5, 47.5], [5, 4.6, 4], mat).elip([0, s * 10.8, 46.5], [5.3, 5, 1.3], borde, { tono: -0.05 });
    b.palo([0, s * 11, 45], [1.2, s * 11.5, 35], 2.2, mat).bola([1.2, s * 11.5, 35], 2.4, mat, { tono: 0.08 });
    b.palo([1.2, s * 11.5, 35], [3, s * 11, 26], 2.1, mat, { r1: 2.3 });
    b.caja([3.4, s * 11, 21.5], [4.2, 3.2, 5.5], mat);
  }
  if (v === 'dorada') { b.elip([0, 10.5, 47.5], [5.1, 4.7, 4.1], 'oro', { tono: -0.1, resta: false }); b.elip([0, -10.5, 47.5], [5.1, 4.7, 4.1], 'oro', { tono: -0.1 }); }
  yelmo(b.en([0, 0, 51.5]), 'cerrado', mat === 'acero' && v === 'dorada' ? 'oro' : mat);
  if (v === 'dorada') { for (let i = 0; i < 5; i++) b.palo([-1, (i - 2) * 0.8, 64], [-4 - i * 0.5, (i - 2) * 1.5, 70 - Math.abs(i - 2)], 0.8, 'tela_roja', { r1: 0.4 }); }
  return ps;
}
registrar({ id: 'arm_maniqui_armadura', nombre: ['Maniquí con armadura', 'Armor stand'], tema: 'armas', variantes: ['placas', 'oxidada', 'dorada', 'vacio'], huella: [2, 2], bloquea: true, armar: (v, _f, a) => maniqui(v, a) });

// ------------------------------------------------------------------ estandarte (animado), haces, blancos
registrar({
  id: 'arm_estandarte', nombre: ['Estandarte de guerra', 'War banner'], tema: 'armas', variantes: ['rojo', 'azul', 'negro', 'rasgado'], cuadros: 6, t: 3, huella: [1, 1], bloquea: true,
  armar: (v, f, a) => {
    const ps: Pieza[] = []; const b = new Pz(a, ps).gira([0, 0, 0], 45);
    const tela = v === 'azul' ? 'tela_azul' : v === 'negro' ? 'tela' : v === 'rasgado' ? 'tela_verde' : 'tela_roja';
    const ton = v === 'negro' ? -0.28 : 0;
    const em = v === 'azul' ? 'hueso' : v === 'negro' ? 'tela_roja' : 'oro';
    // piedras al pie y el asta
    for (let i = 0; i < 6; i++) { const t = (i / 6) * Math.PI * 2 + a.r(); ps.push(a.elipsoide(Math.cos(t) * 5, Math.sin(t) * 5, 0, 3 + a.r(), 2.5 + a.r(), 2.4 + a.r() * 1.5, { mat: 'piedra', giro: a.r() * 90 })); }
    ps.push(a.elipsoide(0, 0, 0, 6, 6, 1.5, { mat: 'tierra' }));
    b.cil(0, 0, 0, 1.3, 92, 'madera_lisa');
    b.palo([0, 0, 92], [0, 0, 99], 1.4, 'hierro', { r1: 0 }).cil(0, 0, 90.5, 1.8, 2.2, 'oro');
    b.palo([0, -13, 86], [0, 13, 86], 0.9, 'madera_lisa').bola([0, -13.5, 86], 1.3, 'oro').bola([0, 13.5, 86], 1.3, 'oro');
    // la tela en tiras verticales que ondean
    const N = 8, W = 24, H = 40, fase = (f / 6) * Math.PI * 2;
    for (let i = 0; i < N; i++) {
      const y = -W / 2 + (i + 0.5) * (W / N);
      let largo = H - (3.5 - Math.abs(i - 3.5)) * 3; // cola de golondrina
      if (v === 'rasgado') largo = H * (0.45 + a.r() * 0.5);
      const segs = Math.ceil(largo / 5);
      for (let k = 0; k < segs; k++) {
        const z1 = 85 - k * 5, z0 = Math.max(85 - largo, z1 - 5), zc = (z0 + z1) / 2;
        const q = (85 - zc) / H;
        const off = Math.sin(fase + i * 0.8 - q * 3) * (0.5 + q * 3.2);
        const centro = (Math.abs(y) < 2.2 && zc > 52 && zc < 82) || (Math.abs(y) < 9 && zc > 69 && zc < 76);
        const mat = centro && v !== 'rasgado' ? em : tela;
        b.caja([off + 0.5, y, zc], [1, W / N + 0.15, z1 - z0 + 0.5], mat, { tono: ton * (mat === tela ? 1 : 0) + Math.sin(fase + i * 0.8 - q * 3) * 0.07 });
      }
    }
    return ps;
  },
});

registrar(
  {
    id: 'arm_haz_jabalinas', nombre: ['Haz de jabalinas', 'Javelin stack'], tema: 'armas', variantes: ['jabalinas', 'lanzas', 'flechas', 'barril'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = []; const raiz = new Pz(a, ps);
      if (v === 'flechas') {
        // atado de flechas tendido, con una correa
        const g = sobre(a);
        for (let i = 0; i < 9; i++) { const y = ((i % 3) - 1) * 1.1, z = 0.6 + Math.floor(i / 3) * 0.9; flecha(tendido(raiz, 30, z, z, g, Math.cos((g + 90) * RAD) * y, Math.sin((g + 90) * RAD) * y), 0, 28, i % 2 ? 'tela' : 'hueso'); }
        const s = tendido(raiz, 30, 1.6, 1.6, g);
        s.palo([11, 0, 0], [13, 0, 0], 2.4, 'cuero').palo([20, 0, 0], [22, 0, 0], 2.4, 'cuero');
        return ps;
      }
      if (v === 'barril') {
        ps.push(a.cilindro(0, 0, 0, 7, 9, { mat: 'madera', r1: 8 }), a.cilindro(0, 0, 9, 8, 9, { mat: 'madera', r1: 7 }));
        for (const z of [2, 15]) ps.push(a.cilindro(0, 0, z, z < 9 ? 7.4 : 7.7, 1.5, { mat: 'hierro', r1: z < 9 ? 7.7 : 7.4 }));
        ps.push(a.cilindro(0, 0, 17.5, 6.4, 1, { mat: 'negro' }));
        for (let i = 0; i < 14; i++) { const t = a.r() * Math.PI * 2, r = 1 + a.r() * 4.5; const tx = Math.cos(t) * r, ty = Math.sin(t) * r; if (i % 3) flecha(raiz.en([tx, ty, 32], [-tx * 0.03, -ty * 0.03, -1], [Math.cos(i), Math.sin(i), 0]), 0, 24, ['tela', 'tela_roja', 'hueso'][i % 3]); else lanza(raiz.en([tx, ty, 4], [tx * 0.03, ty * 0.03, 1], [Math.cos(i), Math.sin(i), 0]), MET('hierro')); }
        return ps;
      }
      // tienda de jabalinas atadas arriba
      const n = v === 'lanzas' ? 5 : 7, top: V3 = [0, 0, v === 'lanzas' ? 58 : 40];
      for (let i = 0; i < n; i++) {
        const t = (i / n) * Math.PI * 2 + a.r() * 0.3, R = v === 'lanzas' ? 14 : 11;
        const p0: V3 = [Math.cos(t) * R, Math.sin(t) * R, 0];
        const dir = nr([top[0] - p0[0], top[1] - p0[1], top[2] - p0[2]]);
        const s = raiz.en(p0, dir, [-Math.sin(t), Math.cos(t), 0]);
        if (v === 'lanzas') lanza(s, MET(i % 2 ? 'hierro' : 'oxidada'));
        else { s.palo([0, 0, 0], [50, 0, 0], 0.8, 'madera_lisa'); s.poli([[50, 0.8, 0], [50, -0.8, 0], [50, 0, 0.7], [50, 0, -0.7], [57, 0, 0]], 'hierro'); }
      }
      raiz.cil(0, 0, top[2] - 6, 2.4, 3, 'cuerda');
      ps.push(a.elipsoide(0, 0, 0, 14, 14, 0.8, { mat: 'tierra' }));
      return ps;
    },
  },
  {
    id: 'arm_blanco', nombre: ['Blanco de práctica', 'Training target'], tema: 'armas', variantes: ['diana', 'muneco', 'muneco_roto', 'poste'], huella: [2, 2], bloquea: true,
    armar: (v, _f, a) => {
      const ps: Pieza[] = []; const raiz = new Pz(a, ps); let b = raiz.gira([0, 0, 0], 45 + (a.r() - 0.5) * 16);
      ps.push(a.elipsoide(0, 0, 0, 13, 12, 1, { mat: 'tierra' }));
      if (v === 'diana') {
        // caballete de tres patas y la diana de paja echada atrás
        b.palo([-8, -10, 0], [-2, -8, 34], 1.2, 'madera').palo([-8, 10, 0], [-2, 8, 34], 1.2, 'madera').palo([-14, 0, 0], [-4, 0, 30], 1.2, 'madera');
        b.palo([-3, -9, 14], [-3, 9, 14], 1.0, 'madera');
        const d = b.en([0, 0, 27], [1, 0, 0.3], [0, 1, 0]);
        d.palo([-4, 0, 0], [0, 0, 0], 14, 'paja');
        d.palo([0, 0, 0], [0.2, 0, 0], 11, 'tela', { tono: 0.08 }).palo([0, 0, 0], [0.4, 0, 0], 8, 'tela_roja').palo([0, 0, 0], [0.6, 0, 0], 5, 'tela', { tono: 0.08 }).palo([0, 0, 0], [0.8, 0, 0], 2.2, 'tela_roja');
        for (let i = 0; i < 4; i++) { const t = a.r() * Math.PI * 2, r = a.r() * 10; const s = d.en([0.5, Math.cos(t) * r, Math.sin(t) * r], [-1, (a.r() < 0.5 ? -1 : 1) * (0.5 + a.r() * 0.4), (a.r() - 0.3) * 0.8], [0, 1, 0]); flecha(s, -13, 12, i % 2 ? 'tela' : 'hueso'); }
        return ps;
      }
      // muñeco de paja en un poste con brazos de palo (el roto, torcido)
      if (v === 'muneco_roto') b = b.en([0, 0, 0], [1, 0, 0], [0, Math.cos(14 * RAD), Math.sin(14 * RAD)]);
      b.cil(0, 0, 0, 2.2, v === 'poste' ? 52 : 58, 'madera_vieja');
      if (v === 'poste') {
        for (const z of [20, 34, 44]) b.caja([0, 0, z], [5, 5, 1.2], 'negro', { resta: true, tono: 0 });
        b.palo([0, -9, 36], [0, 9, 36], 1.2, 'madera_vieja').palo([-1, -9, 24], [1, 9, 24], 1.2, 'madera_vieja', { tono: 0.05 });
        b.caja([0, 0, 52], [5, 5, 2], 'hierro_oxido');
        for (let i = 0; i < 4; i++) b.caja([2.3, (a.r() - 0.5) * 3, 10 + a.r() * 36], [0.6, 3, 1.5], 'madera_lisa', { tono: 0.2 });
        return ps;
      }
      const roto = v === 'muneco_roto';
      b.palo([0, -15, 42], [0, 15, roto ? 36 : 42], 1.2, 'madera_vieja');
      b.elip([0, 0, 36], [6, 8, 11], 'tela');
      for (const z of [29, 38, 44]) b.palo([0, 0, z - 1], [0, 0, z + 0.6], z === 38 ? 8.6 : 7.4, 'cuerda');
      b.elip([0, 0, 52], [5, 5, 5.6], 'tela', { tono: 0.05 });
      b.cil(0, 0, 47, 2.8, 2, 'cuerda');
      for (let i = 0; i < 7; i++) { const t = a.r() * Math.PI * 2; b.palo([Math.cos(t) * 4, Math.sin(t) * 6, 30 + a.r() * 12], [Math.cos(t) * 8, Math.sin(t) * 10, 28 + a.r() * 12], 0.6, 'paja'); }
      b.palo([0, 15, 42], [2, 18, 37], 1.0, 'paja').palo([0, -15, 42], [2, -18, 38], 1.0, 'paja');
      if (roto) {
        b.elip([4.5, 2, 33], [2.5, 4, 5], 'paja');
        for (let i = 0; i < 9; i++) ps.push(a.elipsoide((a.r() - 0.3) * 18, (a.r() - 0.3) * 18, 0, 2 + a.r() * 2.5, 1.2 + a.r(), 0.9, { mat: 'paja', giro: a.r() * 180 }));
        flecha(b.en([5, 1, 40], [-1, 0.2, 0.1], [0, 1, 0]), -12, 16, 'tela');
        flecha(b.en([5, -2, 34], [-1, -0.2, -0.05], [0, 1, 0]), -12, 16, 'hueso');
      } else {
        b.elip([4.4, 0, 53], [1.4, 2.2, 1.6], 'tela_roja', { tono: -0.1 });
      }
      return ps;
    },
  },
);
