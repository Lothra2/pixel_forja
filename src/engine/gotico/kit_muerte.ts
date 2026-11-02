import type { Arma } from './objeto';
import { MATERIALES } from './materiales';
import { masa, hueso, bulto, ruido, type Comp, type Pieza, type V3 } from './render';

/**
 * Kit de la muerte: lo que comparten el cementerio nuevo (`cementerio2`), la cripta (`cripta`) y las catacumbas
 * nuevas (`catacumbas2`). Materiales con desgaste (mugre que sube del piso, chorreado, vetas), un grupo `G` que gira
 * e inclina juntas sus piezas y también las masas orgánicas, piedra tallada con bisel irregular, calaveras y huesos
 * de masa, velas que chorrean cera, cuervos, árboles muertos, tierra removida, hiedra y musgo.
 */

// ------------------------------------------------------------------ materiales
const M = MATERIALES;
/** Mugre que sube del piso y chorreados verticales: el desgaste de la piedra a la intemperie. */
const mugre = (k = 0.2, alto = 14, chorro = 0.22) => (p: V3) => -Math.max(0, 1 - p[2] / alto) * k + (ruido(p[0] * 0.9 + p[1] * 0.3, p[1] * 0.9, p[2] * 0.05) - 0.5) * chorro;
M.mu_piedra = { rampa: ['#121211', '#1f1e1c', '#2e2c29', '#403d38', '#545049', '#6a655c', '#807a6f', '#97907f'], ruido: 0.32, escala: 0.22, patron: mugre() };
M.mu_piedra_fria = { rampa: ['#0f1112', '#1b1e20', '#292d30', '#3a3f42', '#4d5356', '#62686b', '#797f81', '#919596'], ruido: 0.3, escala: 0.22, patron: mugre(0.2, 16) };
M.mu_piedra_clara = { rampa: ['#1a1917', '#2d2b27', '#43403a', '#5b574f', '#757066', '#8f897d', '#a8a194', '#bdb6a8'], ruido: 0.26, escala: 0.18, patron: mugre(0.24, 18, 0.26) };
M.mu_marmol = { rampa: ['#1e1d1c', '#33312e', '#4c4945', '#67635d', '#837e76', '#9f998f', '#b8b1a5', '#cdc6b8'], ruido: 0.16, escala: 0.1, brillo: 0.2, patron: (p) => (ruido(p[0] * 0.07 + p[2] * 0.14, p[1] * 0.07, p[2] * 0.03) > 0.74 ? -0.2 : 0) + mugre(0.26, 16, 0.2)(p) };
M.mu_marmol_negro = { rampa: ['#09090a', '#131214', '#1e1c20', '#2a272c', '#38343a', '#48434b', '#5b555e'], ruido: 0.15, escala: 0.1, brillo: 0.35, patron: (p) => (ruido(p[0] * 0.08 + p[2] * 0.1, p[1] * 0.08, 3) > 0.76 ? 0.2 : 0) };
M.mu_granito = { rampa: ['#0e0f10', '#1a1b1d', '#27292c', '#36383c', '#46494d', '#585b60', '#6c6f73'], ruido: 0.6, escala: 0.9, patron: mugre(0.15, 12, 0.1) };
M.mu_bloques = { rampa: ['#121110', '#1f1d1a', '#2e2b26', '#3f3b34', '#524c43', '#665f54', '#7b7366'], ruido: 0.3, escala: 0.22, patron: (p, n) => { const al = 7, la = 13; const fila = Math.floor(p[2] / al); const u = Math.abs(n[0]) > Math.abs(n[1]) ? p[1] : p[0]; const m = (v: number, s: number) => ((v % s) + s) % s; if (Math.abs(n[2]) < 0.7) { if (m(p[2], al) < 0.9) return -0.32; if (m(u + (fila % 2) * la * 0.5, la) < 0.9) return -0.28; } return mugre(0.2, 18)(p) + (ruido(Math.floor((u + (fila % 2) * la * 0.5) / la) * 1.7, fila * 2.3, 5) - 0.5) * 0.2; } };
M.mu_toba = { rampa: ['#110e0b', '#1e1913', '#2c241b', '#3c3124', '#4d3f2f', '#5f4e3b', '#725e48'], ruido: 0.5, escala: 0.2, patron: (p) => (ruido(p[0] * 0.05, p[1] * 0.05, p[2] * 0.4) - 0.5) * 0.3 - Math.max(0, 1 - p[2] / 12) * 0.15 };
M.mu_ladrillo = { rampa: ['#170d0a', '#28160f', '#3a2015', '#4d2b1c', '#613725', '#76442e'], ruido: 0.3, escala: 0.35, patron: (p, n) => { const m = (v: number, s: number) => ((v % s) + s) % s; const u = Math.abs(n[0]) > Math.abs(n[1]) ? p[1] : p[0]; const f = Math.floor(p[2] / 4); if (m(p[2], 4) < 0.8) return -0.35; if (m(u + (f % 2) * 4, 8) < 0.8) return -0.3; return (ruido(Math.floor((u + (f % 2) * 4) / 8) * 2.1, f * 1.3, 2) - 0.5) * 0.3; } };
M.mu_musgo = { rampa: ['#0d120a', '#172012', '#22301a', '#2e3f22', '#3b4f2b', '#4a6035'], ruido: 0.7, escala: 0.6 };
M.mu_liquen = { rampa: ['#1d1d12', '#2f2f1c', '#444328', '#5a5835', '#706d44'], ruido: 0.6, escala: 0.8 };
M.mu_hierro = { rampa: ['#0a0a0b', '#141415', '#1f1f21', '#2c2c2f', '#3b3b3f', '#4d4c50', '#625f60'], ruido: 0.3, escala: 0.6, brillo: 0.3, patron: (p) => (ruido(p[0] * 0.5, p[1] * 0.5, p[2] * 0.5) > 0.7 ? 0.08 : 0) };
M.mu_oxido = { rampa: ['#140b07', '#24130b', '#371d10', '#4c2915', '#62361c', '#784525'], ruido: 0.6, escala: 0.7 };
M.mu_pluma = { rampa: ['#060608', '#0c0c10', '#14141a', '#1e1e27', '#2a2a36', '#3a3a4a'], ruido: 0.2, escala: 0.8, brillo: 0.5 };
M.mu_tierra = { rampa: ['#0d0907', '#18110c', '#241a12', '#322419', '#412f21', '#523c2b'], ruido: 0.6, escala: 0.35, patron: (p) => (ruido(p[0] * 0.45, p[1] * 0.45, p[2] * 0.45) - 0.5) * 0.3 };
M.mu_cal = { rampa: ['#3a3832', '#56534b', '#737066', '#918d82', '#aeaa9e', '#c6c2b5'], ruido: 0.35, escala: 0.3 };
M.mu_mortaja = { rampa: ['#1c1a15', '#2f2b23', '#454034', '#5d5646', '#756d5a', '#8c836d', '#a0977f'], ruido: 0.25, escala: 0.3, patron: (p) => (ruido(p[0] * 0.25, p[1] * 0.25, p[2] * 0.6) - 0.5) * 0.3 };
M.mu_venda = { rampa: ['#1a140d', '#2d2416', '#433621', '#5a492d', '#715c3a', '#877049'], ruido: 0.35, escala: 0.5, patron: (p) => (Math.sin(p[2] * 1.7 + p[0] * 0.9 + p[1] * 0.4) > 0.7 ? -0.22 : 0) };
M.mu_sangre_seca = { rampa: ['#0c0303', '#180605', '#250907', '#320d0a', '#40120d'], ruido: 0.4, escala: 0.3, brillo: 0.25 };
M.mu_sangre = { rampa: ['#140303', '#260505', '#3a0807', '#4f0c0a', '#651310'], ruido: 0.3, escala: 0.3, brillo: 0.6 };
M.mu_telarana = { rampa: ['#2c2c2b', '#454441', '#605e59', '#7e7b74', '#9d998f', '#b9b5ac'], ruido: 0.35, escala: 1 };
M.mu_cera = { rampa: ['#2e2618', '#4a3f2a', '#6a5c40', '#8a7b5a', '#a99a76', '#c4b693'], ruido: 0.12, escala: 0.3 };
M.mu_bronce = { rampa: ['#0f1512', '#1a2620', '#26372e', '#33493c', '#405b4a', '#557056'], ruido: 0.45, escala: 0.5, brillo: 0.3 };
M.mu_revoque = { rampa: ['#211d17', '#352f26', '#4b4336', '#625847', '#796d58', '#8f8269'], ruido: 0.4, escala: 0.2, patron: (p) => (ruido(p[0] * 0.3, p[1] * 0.3, p[2] * 0.3) > 0.72 ? -0.28 : 0) - Math.max(0, 1 - p[2] / 14) * 0.15 };
M.mu_fresco_rojo = { rampa: ['#1f0d0a', '#331611', '#48211a', '#5d2e24', '#713b2f'], ruido: 0.5, escala: 0.4 };
M.mu_fresco_azul = { rampa: ['#0f1418', '#18212a', '#22303c', '#2e3f4e', '#3b4e5f'], ruido: 0.5, escala: 0.4 };
M.mu_fresco_ocre = { rampa: ['#231a0c', '#3a2b14', '#53401f', '#6b552b', '#836a38'], ruido: 0.5, escala: 0.4 };
M.mu_fresco_hueso = { rampa: ['#302a20', '#4a4232', '#655a45', '#7f7258', '#978a6c'], ruido: 0.45, escala: 0.4 };
M.mu_fresco_oro = { rampa: ['#2a1d08', '#46310e', '#634815', '#7f5f1f', '#9a782b'], ruido: 0.4, escala: 0.4, brillo: 0.4 };
M.mu_rata = { rampa: ['#0f0d0c', '#1c1916', '#2a2521', '#3a332d', '#4b433a', '#5d5348'], ruido: 0.5, escala: 1 };
M.mu_rosa = { rampa: ['#2a1a18', '#432a26', '#5e3c36', '#7a5048', '#93655a'], ruido: 0.2, escala: 0.6 };
M.mu_madera = { rampa: ['#0f0d0a', '#1b1712', '#28221b', '#372e24', '#463b2e', '#564939', '#665744'], ruido: 0.3, escala: 0.35, patron: (p, n) => { const u = Math.abs(n[2]) < 0.7 ? (Math.abs(n[0]) > Math.abs(n[1]) ? p[1] : p[0]) : p[0]; return (ruido(u * 0.9, p[2] * 0.06 + p[1] * 0.06, 3) - 0.5) * 0.32; } };
M.mu_hoja_seca = { rampa: ['#140d07', '#22160c', '#332112', '#452d18', '#573a1f'], ruido: 0.6, escala: 0.6 };
M.mu_flor = { rampa: ['#160c12', '#25131d', '#361c2a', '#472637', '#583143'], ruido: 0.5, escala: 0.6 };
M.mu_hueso = { rampa: ['#1d1913', '#322b21', '#4a4131', '#655943', '#807257', '#9a8b6d', '#b2a385', '#c6b99c'], ruido: 0.22, escala: 0.7 };
M.mu_osario = { rampa: ['#100e0b', '#1c1914', '#2a251d', '#393228', '#4a4133'], ruido: 0.5, escala: 0.5 };
M.mu_agua = { rampa: ['#05070a', '#0a1016', '#111a22', '#1a2630', '#26343f', '#36454f'], ruido: 0.2, escala: 0.15, brillo: 1 };
M.mu_carne_seca = { rampa: ['#140b08', '#24140e', '#361f15', '#492b1d', '#5c3826', '#6f4630'], ruido: 0.45, escala: 0.5 };
M.mu_corteza = { rampa: ['#0c0b0a', '#171513', '#24211d', '#322e29', '#423c35', '#534b42', '#645b50'], ruido: 0.45, escala: 0.4, patron: (p) => (ruido(p[0] * 0.7, p[1] * 0.7, p[2] * 0.07) - 0.5) * 0.5 };
M.mu_paja = { rampa: ['#1d170c', '#2f2614', '#44381d', '#594a27', '#6f5d33'], ruido: 0.6, escala: 0.8 };
/** Luces propias: el sello y la vela fría de la cripta. */
M.mu_sello_rojo = { rampa: ['#3a0606', '#701010', '#a8201a', '#d84a2e', '#f8906a', '#ffd0b8'], ruido: 0.4, escala: 0.3, emite: true };
M.mu_sello_verde = { rampa: ['#06280e', '#0e4a1a', '#1c7a2c', '#38b04a', '#7ae080', '#c8ffc8'], ruido: 0.4, escala: 0.3, emite: true };
M.mu_brasa = { rampa: ['#2a0804', '#4a1006', '#781c08', '#a8320c', '#d85a18'], ruido: 0.6, escala: 0.6, emite: true };

// ------------------------------------------------------------------ grupo con giro e inclinación
export type Op = { mat: string; tono?: number; resta?: boolean };
export type Rot = { giro?: number; incl?: number; inclEje?: 'x' | 'y' };
export type P2 = [number, number];
export const GR = Math.PI / 180;
const lin = (m: V3[], v: V3): V3 => [m[0][0] * v[0] + m[1][0] * v[1] + m[2][0] * v[2], m[0][1] * v[0] + m[1][1] * v[1] + m[2][1] * v[2], m[0][2] * v[0] + m[1][2] * v[1] + m[2][2] * v[2]];
export function marco(giro = 0, incl = 0, eje: 'x' | 'y' = 'x'): V3[] {
  const g = giro * GR, t = incl * GR, c = Math.cos(t), s = Math.sin(t);
  let ex: V3 = [Math.cos(g), Math.sin(g), 0], ey: V3 = [-Math.sin(g), Math.cos(g), 0], ez: V3 = [0, 0, 1];
  const mez = (u: V3, w: V3, k: number): V3 => [u[0] * c + w[0] * k, u[1] * c + w[1] * k, u[2] * c + w[2] * k];
  if (t) { if (eje === 'x') { const n = mez(ey, ez, s); ez = mez(ez, ey, -s); ey = n; } else { const n = mez(ex, ez, s); ez = mez(ez, ex, -s); ex = n; } }
  return [ex, ey, ez];
}
/** Un grupo de piezas con su propio origen y ejes: todo lo que se arma en él gira e inclina junto (masas incluidas). */
export class G {
  constructor(readonly a: Arma, readonly ps: Pieza[], readonly m: V3[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], readonly o: V3 = [0, 0, 0]) {}
  get r() { return this.a.r; }
  D(v: V3): V3 { return lin(this.m, v); }
  P(x: number, y: number, z: number): V3 { const d = this.D([x, y, z]); return [this.o[0] + d[0], this.o[1] + d[1], this.o[2] + d[2]]; }
  sub(x: number, y: number, z: number, giro = 0, incl = 0, eje: 'x' | 'y' = 'x') { const k = marco(giro, incl, eje); return new G(this.a, this.ps, k.map((e) => this.D(e)), this.P(x, y, z)); }
  /** Mismo origen y ejes con la escala `k` (para armar lo mismo más chico o más grande). */
  esc(k: number) { return new G(this.a, this.ps, this.m.map((e) => [e[0] * k, e[1] * k, e[2] * k] as V3), this.o); }
  put(p: Pieza) { this.ps.push(p); return p; }
  caja(x: number, y: number, z: number, w: number, d: number, h: number, o: Op & Rot) {
    const k = marco(o.giro, o.incl, o.inclEje), pts: V3[] = [];
    for (const sx of [-0.5, 0.5]) for (const sy of [-0.5, 0.5]) for (const sz of [0, 1]) { const l = lin(k, [sx * w, sy * d, sz * h]); pts.push(this.P(x + l[0], y + l[1], z + l[2])); }
    return this.put(this.a.poliedro(pts, { mat: o.mat, tono: o.tono, resta: o.resta }));
  }
  cil(x: number, y: number, z: number, r0: number, h: number, o: Op & { r1?: number; eje?: V3 }) {
    const s = Math.hypot(...this.D([1, 0, 0]));
    return this.put(this.a.cilindro(...this.P(x, y, z), r0 * s, h * s, { mat: o.mat, tono: o.tono, resta: o.resta, r1: (o.r1 ?? r0) * s, eje: this.D(o.eje ?? [0, 0, 1]) }));
  }
  palo(p: V3, q: V3, r0: number, o: Op & { r1?: number }) { const s = Math.hypot(...this.D([1, 0, 0])); return this.put(this.a.palo(this.P(...p), this.P(...q), r0 * s, { ...o, r1: (o.r1 ?? r0) * s })); }
  elip(x: number, y: number, z: number, rx: number, ry: number, rz: number, o: Op & Rot) {
    const s = Math.hypot(...this.D([1, 0, 0]));
    const p = this.a.elipsoide(...this.P(x, y, z), rx * s, ry * s, rz * s, { mat: o.mat, tono: o.tono, resta: o.resta });
    if (p.k === 'elip') { const k = marco(o.giro, o.incl, o.inclEje); p.ex = this.uni(k[0]); p.ey = this.uni(k[1]); p.ez = this.uni(k[2]); }
    return this.put(p);
  }
  esf(x: number, y: number, z: number, r: number, o: Op) { return this.elip(x, y, z, r, r, r, o); }
  poli(pts: V3[], o: Op) { return this.put(this.a.poliedro(pts.map((q) => this.P(...q)), o)); }
  /** Prisma: un perfil (x,z) convexo extruido a lo largo de y entre y0 e y1. */
  prisma(perfil: P2[], y0: number, y1: number, o: Op) { return this.poli(perfil.flatMap(([x, z]) => [[x, y0, z], [x, y1, z]] as V3[]), o); }
  private uni(v: V3): V3 { const d = this.D(v), l = Math.hypot(...d) || 1; return [d[0] / l, d[1] / l, d[2] / l]; }
  /** Componentes de masa en las coordenadas del grupo. */
  hu(p: V3, q: V3, r0: number, r1 = r0, o: { mat?: string; tono?: number; k?: number } = {}): Comp { const s = Math.hypot(...this.D([1, 0, 0])); return hueso(this.P(...p), this.P(...q), r0 * s, r1 * s, o); }
  bu(c: V3, r: V3, o: { mat?: string; tono?: number; k?: number; giro?: number; incl?: number; inclEje?: 'x' | 'y'; eje?: V3 } = {}): Comp {
    const s = Math.hypot(...this.D([1, 0, 0]));
    let k: V3[];
    if (o.eje) { const ex = norm3(o.eje); const up: V3 = Math.abs(ex[2]) > 0.95 ? [1, 0, 0] : [0, 0, 1]; const ey = norm3(cruz(up, ex)); k = [ex, ey, cruz(ex, ey)]; }
    else k = marco(o.giro, o.incl, o.inclEje);
    return bulto(this.P(...c), [r[0] * s, r[1] * s, r[2] * s], { mat: o.mat, tono: o.tono, k: o.k, ejes: [this.uni(k[0]), this.uni(k[1]), this.uni(k[2])] });
  }
  masa(cs: Comp[], o: Op & { suave?: number }) { const s = Math.hypot(...this.D([1, 0, 0])); return this.put(masa(cs, { ...o, suave: (o.suave ?? 2) * s })); }
}
const norm3 = (v: V3): V3 => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cruz = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Grupo raíz de un armado y su lista de piezas. */
export const raiz = (a: Arma, giro = 0) => { const ps: Pieza[] = []; const g0 = new G(a, ps); return { ps, g: giro ? g0.sub(0, 0, 0, giro) : g0 }; };
/** Variantes de pared: la que termina en `_der` corre a lo largo de y con la cara hacia +x. */
export const orient = (v: string) => (v.endsWith('_der') || v === 'der' ? -90 : 0);
export const base = (v: string) => v.replace(/_der$/, '');
export const ciclo = (f: number, n: number) => (f % n) / n;
export const onda = (f: number, n: number, fase = 0) => Math.sin(ciclo(f, n) * Math.PI * 2 + fase);
export const rr = (a: Arma, x0: number, x1: number) => x0 + a.r() * (x1 - x0);
export const elegir = <T>(a: Arma, xs: T[]) => xs[Math.floor(a.r() * xs.length) % xs.length];

// ------------------------------------------------------------------ piedra tallada
/**
 * Bloque de piedra con aristas biseladas y gastadas: la cáscara de 24 puntos (tres por esquina) movidos un poco al
 * azar, así cada bloque sale distinto y sin el filo de caja. `b` es el bisel y `j` cuánto se gasta.
 */
export function bloque(g: G, x: number, y: number, z: number, w: number, d: number, h: number, o: Op & Rot & { b?: number; j?: number; arriba?: number }) {
  const a = g.a, b = Math.min(o.b ?? 1.2, w / 3, d / 3, h / 3), j = o.j ?? 0.5, k = marco(o.giro, o.incl, o.inclEje);
  const sup = o.arriba ?? 1; // achique de la cara de arriba (1 = recto)
  const pts: V3[] = [];
  const J = () => (a.r() - 0.5) * j;
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [0, 1]) {
    const f = sz ? sup : 1, X = (sx * w) / 2 * f, Y = (sy * d) / 2 * f, Z = sz * h;
    const cs: V3[] = [[X - sx * b, Y, Z - (sz ? b : -b) * 0.6], [X, Y - sy * b, Z - (sz ? b : -b) * 0.6], [X - sx * b * 0.7, Y - sy * b * 0.7, Z]];
    for (const c of cs) { const l = lin(k, [c[0] + J(), c[1] + J(), c[2] + (sz ? J() * 1.4 - Math.abs(J()) : 0)]); pts.push(g.P(x + l[0], y + l[1], z + l[2])); }
  }
  return g.put(a.poliedro(pts, { mat: o.mat, tono: o.tono, resta: o.resta }));
}
/** Perfil (x,z) de un arco ojival: ancho w, jambas hasta hr, agudeza k (0.5 medio punto, 1 equilátero). */
export function ojiva(w: number, hr: number, k = 0.85, n = 4, z0 = 0): P2[] {
  const r = k * w, cx = w / 2 - r, tmax = Math.acos(-cx / r);
  const der: P2[] = [];
  for (let i = 0; i <= n; i++) { const t = (tmax * i) / n; der.push([cx + r * Math.cos(t), z0 + hr + r * Math.sin(t)]); }
  const izq = der.map(([x, z]) => [-x, z] as P2).reverse();
  return [[-w / 2, z0], [w / 2, z0], ...der, ...izq.slice(1)];
}
export const altoOjiva = (w: number, hr: number, k = 0.85) => { const r = k * w, cx = w / 2 - r; return hr + r * Math.sqrt(1 - (cx / r) ** 2); };
/** Renglones tallados en la cara +y de una pieza (cava con `resta`, solo sirve sobre piezas no orgánicas). */
export function letras(g: G, x0: number, x1: number, y: number, z: number, filas: number, mat: string, paso = 2.4, alto = 1.1) {
  const a = g.a;
  for (let f = 0; f < filas; f++) {
    const ancho = (x1 - x0) * (f === 0 ? 1 : 0.6 + a.r() * 0.4), xa = (x0 + x1) / 2 - ancho / 2;
    let x = xa;
    while (x < xa + ancho - 1) { const wd = Math.min(1 + a.r() * 3.5, xa + ancho - x); g.caja(x + wd / 2, y, z - f * paso, wd, 1.4, alto, { mat, resta: true }); x += wd + 0.9 + a.r() * 0.6; }
  }
}
/** Grieta: una cuña fina cavada que baja zigzagueando por la cara +y. */
export function grieta(g: G, x: number, y: number, z0: number, z1: number, mat: string) {
  const a = g.a; let px = x, pz = z1;
  while (pz > z0) { const dz = 2 + a.r() * 3, nx = px + (a.r() - 0.5) * 3; g.palo([px, y + 0.3, pz], [nx, y + 0.3, pz - dz], 0.45, { mat, resta: true }); px = nx; pz -= dz; }
}

// ------------------------------------------------------------------ suelo, tierra, pasto, musgo
/** Mancha de tierra en el piso con terrones y piedritas. */
export function tierra(g: G, rx: number, ry: number, n = 3, mat = 'tierra', x = 0, y = 0) {
  const a = g.a;
  g.elip(x, y, 0, rx, ry, 1.3, { mat, giro: (a.r() - 0.5) * 30 });
  for (let i = 0; i < n; i++) { const t = a.r() * Math.PI * 2, q = 0.5 + a.r() * 0.5; g.elip(x + Math.cos(t) * rx * q, y + Math.sin(t) * ry * q, 0.4, 1.2 + a.r(), 1 + a.r(), 0.9 + a.r() * 0.6, { mat: a.r() < 0.5 ? 'roca' : mat, tono: 0.05, giro: a.r() * 90 }); }
}
/** Montículo de tierra blanda: bultos que se funden (tierra removida, tumbas, escombro). */
export function monticulo(g: G, rx: number, ry: number, h: number, mat = 'mu_tierra', n = 6, x = 0, y = 0, terrones = 6) {
  const a = g.a, cs: Comp[] = [];
  cs.push(g.bu([x, y, -h * 0.25], [rx, ry, h * 1.1]));
  for (let i = 0; i < n; i++) { const t = a.r() * Math.PI * 2, q = 0.3 + a.r() * 0.6; cs.push(g.bu([x + Math.cos(t) * rx * q, y + Math.sin(t) * ry * q, h * (0.2 + a.r() * 0.3)], [rx * (0.25 + a.r() * 0.2), ry * (0.25 + a.r() * 0.2), h * (0.4 + a.r() * 0.4)], { giro: a.r() * 180 })); }
  g.masa(cs, { mat, suave: Math.max(2, Math.min(rx, ry) * 0.35) });
  for (let i = 0; i < terrones; i++) { const t = a.r() * Math.PI * 2, q = a.r(); const ex = 1 - q * q; g.elip(x + Math.cos(t) * rx * q * 0.95, y + Math.sin(t) * ry * q * 0.95, h * Math.sqrt(Math.max(0, ex)) * 0.75, 1.1 + a.r() * 1.4, 1 + a.r() * 1.2, 0.8 + a.r() * 0.8, { mat: a.r() < 0.2 ? 'roca' : mat, tono: 0.07, giro: a.r() * 90 }); }
}
/** Matas de pasto seco. */
export function matas(g: G, n: number, rx: number, ry: number, x = 0, y = 0) {
  const a = g.a;
  for (let i = 0; i < n; i++) {
    const t = a.r() * Math.PI * 2, q = 0.7 + a.r() * 0.45, cx = x + Math.cos(t) * rx * q, cy = y + Math.sin(t) * ry * q;
    const mat = a.r() < 0.5 ? 'pasto' : 'paja', tono = mat === 'paja' ? -0.2 : 0;
    for (let k = 0; k < 3; k++) { const h = 3 + a.r() * 3.5; g.palo([cx + (k - 1) * 0.8, cy + (a.r() - 0.5), 0], [cx + (k - 1) * 2 + (a.r() - 0.5) * 2, cy + (a.r() - 0.5) * 3, h], 0.9, { mat, tono, r1: 0.15 }); }
  }
}
/** Manchas de musgo sobre una cara (+y) entre x0..x1 y z0..z1, a la profundidad y. */
export function musgo(g: G, n: number, x0: number, x1: number, y: number, z0: number, z1: number, mat = 'mu_musgo') {
  const a = g.a;
  for (let i = 0; i < n; i++) g.elip(rr(a, x0, x1), y, rr(a, z0, z1), 1.6 + a.r() * 2, 0.9, 1.2 + a.r() * 1.4, { mat, tono: (a.r() - 0.5) * 0.1, giro: (a.r() - 0.5) * 30 });
}
/** Hiedra: hojas en racimo a lo largo de un camino de puntos. */
export function hiedra(g: G, camino: V3[], dens = 3, mat = 'hojas') {
  const a = g.a;
  for (let i = 0; i < camino.length - 1; i++) {
    const p = camino[i], q = camino[i + 1];
    g.palo(p, q, 0.5, { mat: 'mu_corteza' });
    for (let k = 0; k < dens; k++) { const t = a.r(); g.elip(p[0] + (q[0] - p[0]) * t + (a.r() - 0.5) * 2.5, p[1] + (q[1] - p[1]) * t + (a.r() - 0.5) * 2.5, p[2] + (q[2] - p[2]) * t + (a.r() - 0.5) * 2, 1.3 + a.r() * 0.6, 1.3 + a.r() * 0.6, 0.9, { mat, tono: (a.r() - 0.5) * 0.15, giro: a.r() * 180, incl: a.r() * 60 }); }
  }
}
/** Piedritas y cascotes sueltos. */
export function cascotes(g: G, n: number, rx: number, ry: number, mat: string, x = 0, y = 0, tam = 2.4) {
  const a = g.a;
  for (let i = 0; i < n; i++) { const s = tam * (0.5 + a.r()); bloque(g, x + (a.r() - 0.5) * 2 * rx, y + (a.r() - 0.5) * 2 * ry, -0.3, s * (0.8 + a.r() * 0.6), s * (0.7 + a.r() * 0.5), s * (0.5 + a.r() * 0.5), { mat, giro: a.r() * 90, incl: (a.r() - 0.5) * 30, b: s * 0.25, j: s * 0.4, tono: (a.r() - 0.5) * 0.1 }); }
}

// ------------------------------------------------------------------ huesos
/** Calavera orgánica mirando hacia +x del grupo, apoyada en z=0; `mand` con mandíbula. */
export function calavera(g: G, r = 3.3, mat = 'mu_hueso', mand = true, tono = 0) {
  const a = g.a, t = tono + (a.r() - 0.5) * 0.08;
  const cs = [g.bu([0, 0, r * 0.98], [r * 1.08, r * 0.9, r * 0.93]), g.bu([r * 0.58, 0, r * 0.5], [r * 0.58, r * 0.7, r * 0.5]), ...[-1, 1].map((s) => g.bu([r * 0.55, s * r * 0.62, r * 0.5], [r * 0.3, r * 0.22, r * 0.25]))];
  if (mand) cs.push(g.bu([r * 0.62, 0, r * 0.12], [r * 0.42, r * 0.5, r * 0.2]));
  g.masa(cs, { mat, tono: t, suave: r * 0.35 });
  for (const s of [-1, 1]) g.elip(r * 0.86, s * r * 0.38, r * 0.72, r * 0.26, r * 0.28, r * 0.3, { mat: 'negro' });
  g.poli([[r * 1.08, -r * 0.13, r * 0.42], [r * 1.08, r * 0.13, r * 0.42], [r * 1.12, 0, r * 0.6], [r * 0.85, 0, r * 0.5]], { mat: 'negro' });
  g.caja(r * 1.02, 0, r * 0.22, r * 0.25, r * 0.7, r * 0.12, { mat: 'negro' });
}
/** Hueso largo con cabezas de dos lóbulos (fémur, húmero). */
export function huesoLargo(g: G, p: V3, q: V3, r = 1, mat = 'mu_hueso', tono = 0) {
  const d: V3 = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], L = Math.hypot(...d) || 1, u: V3 = [d[0] / L, d[1] / L, d[2] / L];
  const lado: V3 = norm3(cruz(u, [0, 0, 1])), l = Math.hypot(...lado) > 0.1 ? lado : [1, 0, 0] as V3;
  const cs = [g.hu([p[0] + u[0] * r, p[1] + u[1] * r, p[2] + u[2] * r], [q[0] - u[0] * r, q[1] - u[1] * r, q[2] - u[2] * r], r * 0.85, r * 0.8)];
  for (const e of [p, q]) for (const s of [-1, 1]) cs.push(g.bu([e[0] + l[0] * s * r * 0.6, e[1] + l[1] * s * r * 0.6, e[2]], [r * 1.05, r * 1.05, r * 1.05]));
  g.masa(cs, { mat, tono, suave: r * 0.9 });
}
/** Hueso barato (para montones grandes): palo con dos esferas. */
export function huesito(g: G, p: V3, q: V3, r = 0.9, mat = 'mu_hueso', tono = 0) {
  g.palo(p, q, r, { mat, tono });
  for (const e of [p, q]) g.esf(e[0], e[1], e[2], r * 1.55, { mat, tono: tono + 0.04 });
}
/** Huesos sueltos tirados en una zona. */
export function huesos(g: G, n: number, rx: number, ry: number, x = 0, y = 0, z = 0.9, organicos = 0) {
  const a = g.a;
  for (let i = 0; i < n; i++) {
    const cx = x + (a.r() - 0.5) * 2 * rx, cy = y + (a.r() - 0.5) * 2 * ry, L = 5 + a.r() * 6, b = a.r() * 6.28;
    const p: V3 = [cx - Math.cos(b) * L / 2, cy - Math.sin(b) * L / 2, z + a.r() * 0.8], q: V3 = [cx + Math.cos(b) * L / 2, cy + Math.sin(b) * L / 2, z];
    if (i < organicos) huesoLargo(g, p, q, 0.9 + a.r() * 0.3); else huesito(g, p, q, 0.85 + a.r() * 0.25);
  }
}
export const mirar = (a: Arma) => (a.r() < 0.8 ? 10 + a.r() * 70 : a.r() * 360);
/** Costillar suelto (arcos de costilla) a lo largo de x. */
export function costillar(g: G, n = 5, mat = 'mu_hueso') {
  g.palo([-n * 1.6, 0, 1.4], [n * 1.6, 0, 1.6], 1, { mat });
  for (let i = 0; i < n; i++) for (const s of [-1, 1]) { const x = -n * 1.4 + i * 2.8; g.palo([x, 0, 1.6], [x + 0.8, s * 4, 3.2], 0.7, { mat, tono: -0.04 }); g.palo([x + 0.8, s * 4, 3.2], [x + 1.3, s * 6, 0.6], 0.6, { mat, tono: -0.06 }); }
}
/** Esqueleto tumbado boca arriba a lo largo de y (cabeza en -y), ~58 de largo. */
export function esqueleto(g: G, flojo = 0, mat = 'mu_hueso') {
  const a = g.a, j = () => (a.r() - 0.5) * flojo;
  calavera(g.sub(0, -25, 3.6, 90, 90, 'y').sub(0, 0, -3.3), 3.3, mat);
  g.palo([0, -21, 2.4], [0, -2, 2.2], 1.1, { mat });
  for (let i = 0; i < 4; i++) { const y = -19 + i * 3.2; for (const s of [-1, 1]) g.palo([0, y, 3.6], [s * (5.2 - i * 0.3), y + 1.4, 1.6], 0.9, { mat, tono: -0.04 }); }
  g.elip(0, -1, 2, 5, 2.6, 2, { mat });
  for (const s of [-1, 1]) {
    const c: V3 = [s * (7.5 + j()), -9 + j(), 1.4];
    huesito(g, [s * 6.2, -19, 1.8], c, 1, mat);
    g.palo(c, [s * (5.5 + j()), 0 + j(), 1.2], 0.9, { mat });
    const k: V3 = [s * (3.4 + j()), 13 + j(), 1.6];
    huesito(g, [s * 3, -0.5, 2], k, 1.25, mat);
    g.palo(k, [s * (3.6 + j()), 26 + j(), 1.2], 1.05, { mat });
    g.elip(s * 3.8, 28, 1.6, 1.6, 2.4, 1.2, { mat, tono: -0.05 });
  }
}

// ------------------------------------------------------------------ fuego y velas
/** Llama: lengua que sube y baja con el cuadro y su núcleo claro. */
export function llama(g: G, x: number, y: number, z: number, r: number, h: number, f: number, n: number, k = 0, mat = 'fuego') {
  const fl = Math.sin(((f + k * 1.7) / n) * Math.PI * 2), fl2 = Math.cos(((f + k * 2.3) / n) * Math.PI * 2);
  g.cil(x + fl * r * 0.15, y + fl2 * r * 0.1, z, r, h * (1 + fl * 0.18), { mat, r1: 0.08 });
  g.elip(x, y, z + h * 0.28, r * 0.55, r * 0.55, h * 0.3, { mat: mat === 'fuego' ? 'luz_vela' : mat, tono: 0.1 });
}
/** Vela de cera con chorreados que bajan y un charquito en la base. */
export function vela(g: G, x: number, y: number, z: number, h: number, r: number, f: number, n: number, k = 0, encendida = true, mat = 'mu_cera') {
  const a = g.a;
  g.cil(x, y, z, r, h, { mat, tono: (a.r() - 0.5) * 0.1, r1: r * 0.92 });
  g.elip(x, y, z, r * 1.9, r * 1.7, 0.7, { mat, tono: -0.06 });
  const nc = 1 + Math.floor(a.r() * 3);
  for (let i = 0; i < nc; i++) { const t = a.r() * Math.PI * 2, L = h * (0.3 + a.r() * 0.5); g.palo([x + Math.cos(t) * r * 0.95, y + Math.sin(t) * r * 0.95, z + h - 0.2], [x + Math.cos(t) * r * 1.02, y + Math.sin(t) * r * 1.02, z + h - L], 0.55, { mat, tono: 0.06, r1: 0.7 }); }
  g.palo([x, y, z + h], [x, y, z + h + 1.2], 0.25, { mat: 'negro' });
  if (encendida) llama(g, x, y, z + h + 0.4, Math.max(0.9, r * 0.6), 3.4 + r * 0.6, f, n, k);
}
/** Cadena colgando entre dos puntos: eslabones alternados. */
export function cadena(g: G, p: V3, q: V3, comba = 3, mat = 'mu_hierro', tam = 1) {
  const n = Math.max(3, Math.round(Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) / (2.6 * tam)));
  for (let i = 0; i <= n; i++) {
    const t = i / n, c = Math.sin(t * Math.PI) * comba;
    g.elip(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t - c, 1.2 * tam, (i % 2 ? 0.5 : 1.2) * tam, 1.5 * tam, { mat, tono: i % 2 ? -0.05 : 0.05 });
  }
}

// ------------------------------------------------------------------ hierro forjado
/** Voluta (espiral de hierro) en el plano x-z del grupo, centro (cx, cz). */
export function voluta(g: G, cx: number, cz: number, r: number, vueltas = 1.2, sentido = 1, grosor = 0.55, mat = 'mu_hierro', y = 0) {
  const n = Math.max(6, Math.round(vueltas * 10));
  let prev: V3 | null = null;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * vueltas * Math.PI * 2, rad = r * (1 - (i / n) * 0.75);
    const p: V3 = [cx + Math.cos(t) * rad * sentido, y, cz + Math.sin(t) * rad];
    if (prev) g.palo(prev, p, grosor, { mat });
    prev = p;
  }
}
/** Punta de lanza de un barrote. */
export function punta(g: G, x: number, y: number, z: number, h = 4, w = 1.6, mat = 'mu_hierro') {
  g.poli([[x - w, y, z], [x + w, y, z], [x, y - w * 0.45, z + h * 0.3], [x, y + w * 0.45, z + h * 0.3], [x, y, z + h]], { mat });
  g.esf(x, y, z - 0.4, 0.95, { mat });
}

// ------------------------------------------------------------------ bichos y árboles
/** Cuervo mirando +x, parado en z=0. pose: posado, picotea, grazna, vuela (con aleteo por cuadro). */
export function cuervo(g: G, pose: 'posado' | 'picotea' | 'grazna' | 'vuela', f = 0, n = 8, k = 1) {
  const s = g.esc(k), fl = Math.sin((f / n) * Math.PI * 2);
  const pic = pose === 'picotea' ? Math.max(0, fl) : 0;
  const cab: V3 = pose === 'picotea' ? [4.6 + pic * 0.8, 0, 6.6 - pic * 4.4] : pose === 'grazna' ? [4.2, 0, 9.4] : [4.4, 0, 8.6];
  const z0 = pose === 'vuela' ? 2 : 0;
  const cs = [s.bu([0, 0, 5.4 + z0], [4.6, 2.5, 2.7], { eje: [1, 0, pose === 'picotea' ? -0.15 : 0.32] }), s.bu([cab[0], 0, cab[2] + z0], [2, 1.6, 1.75]), s.bu([-5.6, 0, 4.2 + z0], [3.2, 1.7, 0.55], { eje: [1, 0, 0.3] })];
  s.masa(cs, { mat: 'mu_pluma', suave: 1.2 });
  const ab = pose === 'grazna' ? 0.5 + 0.5 * Math.max(0, fl) : 0;
  s.poli([[cab[0] + 1.2, -0.6, cab[2] + z0 + 0.5], [cab[0] + 1.2, 0.6, cab[2] + z0 + 0.5], [cab[0] + 1.2, 0, cab[2] + z0 - 0.5 + ab * 0.2], [cab[0] + 4.2, 0, cab[2] + z0 - 0.3 + ab * 0.4]], { mat: 'mu_hierro', tono: -0.1 });
  if (ab > 0.2) s.poli([[cab[0] + 1.1, -0.5, cab[2] + z0 - 0.4], [cab[0] + 1.1, 0.5, cab[2] + z0 - 0.4], [cab[0] + 3.4, 0, cab[2] + z0 - 1.2 - ab]], { mat: 'mu_hierro', tono: -0.12 });
  for (const sg of [-1, 1]) s.esf(cab[0] + 0.9, sg * 1.25, cab[2] + z0 + 0.5, 0.4, { mat: 'mu_hueso', tono: 0.1 });
  if (pose === 'vuela') {
    for (const sg of [-1, 1]) {
      const alza = fl * 6, codo: V3 = [0.5, sg * 6.5, 7 + z0 + alza * 0.5], tip: V3 = [-2.5, sg * 12.5, 7 + z0 + alza];
      s.poli([[1.8, sg * 1.6, 6.4 + z0], [-1.8, sg * 1.6, 6.4 + z0], codo, tip, [-5, sg * 9.5, 6 + z0 + alza * 0.8], [1.8, sg * 1.6, 6.9 + z0], [-1.8, sg * 1.6, 6.9 + z0]], { mat: 'mu_pluma', tono: 0.04 });
    }
  } else {
    const ala = pose === 'grazna' ? 0.6 : 0;
    for (const sg of [-1, 1]) s.poli([[2.4, sg * 2.1, 6.6 + ala], [2.4, sg * 2.6, 5.2], [-6.5, sg * 1.9, 4.6 + ala], [-6.5, sg * 1.5, 5.3 + ala], [-1, sg * 2.8, 4.2]], { mat: 'mu_pluma', tono: 0.06 });
    for (const sg of [-1, 1]) { s.palo([0.5, sg * 1, 3.2], [0.8, sg * 1.1, 0.2], 0.4, { mat: 'mu_hierro' }); s.palo([0.8, sg * 1.1, 0.2], [2.4, sg * 1.3, 0], 0.35, { mat: 'mu_hierro' }); }
  }
}
/**
 * Árbol muerto: tronco que se tuerce, raíces que agarran el piso y ramas desnudas que se abren en dedos. Devuelve
 * las puntas de rama gruesas (donde se posan los cuervos o cuelga una soga).
 */
export function arbolMuerto(g: G, alto: number, grueso: number, o: { tor?: number; ramas?: number; partido?: boolean; mat?: string } = {}) {
  const a = g.a, cs: Comp[] = [], mat = o.mat ?? 'mu_corteza', tor = o.tor ?? 0.5;
  const tronco: V3[] = [[0, 0, -2]];
  const nT = 6, hT = o.partido ? alto * 0.45 : alto * 0.62;
  const fase = a.r() * 6;
  for (let i = 1; i <= nT; i++) { const t = i / nT; tronco.push([Math.sin(t * 2.6 + fase) * 7 * tor + (a.r() - 0.5) * 2, Math.cos(t * 2.1 + fase) * 6 * tor + (a.r() - 0.5) * 2, t * hT]); }
  for (let i = 1; i < tronco.length; i++) { const t0 = (i - 1) / nT, t1 = i / nT; cs.push(g.hu(tronco[i - 1], tronco[i], grueso * (1 - t0 * 0.55), grueso * (1 - t1 * 0.55))); }
  // nudos y bultos de la corteza
  for (let i = 0; i < 4; i++) { const t = 0.15 + a.r() * 0.6, p = tronco[Math.round(t * nT)]; const an = a.r() * 6.28; cs.push(g.bu([p[0] + Math.cos(an) * grueso * 0.6, p[1] + Math.sin(an) * grueso * 0.6, p[2]], [grueso * 0.45, grueso * 0.45, grueso * 0.7])); }
  // raíces
  const nr = 5 + Math.floor(a.r() * 3);
  for (let i = 0; i < nr; i++) { const an = (i / nr) * 6.28 + a.r() * 0.6, L = grueso * (2.4 + a.r() * 1.6); const m: V3 = [Math.cos(an) * L * 0.5, Math.sin(an) * L * 0.5, grueso * 0.3]; cs.push(g.hu([Math.cos(an) * grueso * 0.3, Math.sin(an) * grueso * 0.3, grueso * 1.3], m, grueso * 0.55, grueso * 0.32), g.hu(m, [Math.cos(an + 0.3) * L, Math.sin(an + 0.3) * L, -0.6], grueso * 0.32, 0.5)); }
  const puntas: V3[] = [];
  const cima = tronco[tronco.length - 1];
  if (o.partido) {
    // tronco partido: astillas que suben
    for (let i = 0; i < 5; i++) { const an = a.r() * 6.28; cs.push(g.hu([cima[0] + Math.cos(an) * grueso * 0.3, cima[1] + Math.sin(an) * grueso * 0.3, cima[2] - 2], [cima[0] + Math.cos(an) * grueso * 0.35, cima[1] + Math.sin(an) * grueso * 0.35, cima[2] + 4 + a.r() * 9], grueso * 0.25, 0.3)); }
  }
  const rama = (p: V3, dir: V3, L: number, r: number, nivel: number) => {
    const q: V3 = [p[0] + dir[0] * L, p[1] + dir[1] * L, p[2] + dir[2] * L];
    const m: V3 = [(p[0] + q[0]) / 2 + (a.r() - 0.5) * L * 0.25, (p[1] + q[1]) / 2 + (a.r() - 0.5) * L * 0.25, (p[2] + q[2]) / 2 + (a.r() - 0.3) * L * 0.2];
    cs.push(g.hu(p, m, r, r * 0.8), g.hu(m, q, r * 0.8, nivel >= 2 ? 0.35 : r * 0.55));
    if (nivel === 1) puntas.push(m);
    if (nivel >= 2 || r < 0.8) { puntas.push(q); return; }
    const nh = 2 + Math.floor(a.r() * 2);
    for (let i = 0; i < nh; i++) { const an = Math.atan2(dir[1], dir[0]) + (a.r() - 0.5) * 1.8, sube = 0.3 + a.r() * 0.6; const d = norm3([Math.cos(an), Math.sin(an), sube]); rama(q, d, L * (0.55 + a.r() * 0.2), r * 0.55, nivel + 1); }
  };
  const nR = o.ramas ?? 4;
  for (let i = 0; i < nR; i++) {
    const t = o.partido ? 0.5 + a.r() * 0.45 : 0.55 + (i / nR) * 0.45, p = tronco[Math.min(nT, Math.round(t * nT))];
    const an = (i / nR) * 6.28 + a.r() * 0.8, sube = 0.35 + a.r() * 0.7;
    rama(p, norm3([Math.cos(an), Math.sin(an), sube]), alto * (0.22 + a.r() * 0.12), grueso * 0.5, 0);
  }
  if (!o.partido) rama(cima, norm3([(a.r() - 0.5) * 0.6, (a.r() - 0.5) * 0.6, 1]), alto * 0.3, grueso * 0.42, 1);
  g.masa(cs, { mat, suave: Math.max(1.2, grueso * 0.35) });
  return puntas;
}

// ------------------------------------------------------------------ figuras de piedra
/**
 * Figura envuelta en manto (doliente, monja, encapuchado), de pie o arrodillada, mirando +x. `h` es la altura de
 * pie (~34 una estatua chica sobre pedestal). Devuelve la altura de la cabeza.
 */
export function figuraVelada(g: G, h: number, o: { mat: string; pose?: 'pie' | 'rodillas' | 'cubre_cara' | 'reza' | 'abraza'; tono?: number }) {
  const k = h / 34, s = g.esc(k), cs: Comp[] = [], pose = o.pose ?? 'pie';
  const rod = pose === 'rodillas' || pose === 'abraza';
  const zh = rod ? 23 : 31; // altura de la cabeza
  // manto: campana que cae hasta el piso con pliegues
  if (rod) {
    cs.push(s.bu([-1, 0, 4], [8, 7, 4.5]), s.hu([-1, 0, 6], [0, 0, zh - 6], 6, 4.2));
    cs.push(s.bu([3.5, 0, 3.5], [5, 6, 3.2]));
  } else {
    cs.push(s.hu([0, 0, 1.2], [0, 0, zh - 6], 7.2, 4.3), s.bu([0, 0, 1], [7.6, 7, 1.6]));
    for (let i = 0; i < 5; i++) { const an = -1.2 + i * 0.6; cs.push(s.hu([Math.cos(an) * 6.4, Math.sin(an) * 6.4, 0.8], [Math.cos(an) * 4.2, Math.sin(an) * 4.2, zh - 9], 1.3, 0.6, { k: 1 })); }
  }
  // hombros y capucha
  cs.push(s.bu([0, 0, zh - 5.5], [3.6, 5.2, 2.6]), s.bu([0.3, 0, zh], [3.2, 2.9, 3.6]), s.hu([-1.4, 0, zh + 1], [-2.6, 0, zh - 9], 2.6, 3.4));
  // brazos según la pose
  const brazo = (sg: number, codo: V3, mano: V3) => { cs.push(s.hu([0.5, sg * 4.6, zh - 5.5], codo, 1.7, 1.5), s.hu(codo, mano, 1.5, 1.2), s.bu(mano, [1.4, 1.1, 1.3])); };
  if (pose === 'cubre_cara') for (const sg of [-1, 1]) brazo(sg, [3.4, sg * 4.2, zh - 10], [3.2, sg * 1.2, zh - 0.5]);
  else if (pose === 'reza' || pose === 'rodillas') for (const sg of [-1, 1]) brazo(sg, [3.6, sg * 3.6, zh - 11], [4.8, sg * 0.6, zh - 6.5]);
  else if (pose === 'abraza') for (const sg of [-1, 1]) brazo(sg, [4.2, sg * 4.6, zh - 10], [6.4, -sg * 1.2, zh - 13]);
  else { brazo(1, [2.8, 4.4, zh - 12], [3.4, 1.6, zh - 15]); brazo(-1, [2.6, -4.2, zh - 11], [3.6, -1.4, zh - 15.5]); }
  s.masa(cs, { mat: o.mat, tono: o.tono, suave: 1.8 });
  // la cara en sombra dentro de la capucha
  if (pose !== 'cubre_cara') s.elip(2.6, 0, zh - 0.4, 1.2, 1.8, 2.3, { mat: 'negro', tono: 0.1 });
  return zh * k;
}
