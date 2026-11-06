import { objeto, herramientas } from './objeto';
import { hash3, caja, palo, poliedro, type Pieza, type V3, type Camara } from './render';
import { personaje, type Cuerpo, type Equipo } from './cuerpo';
import { EscenaCine, Terreno, hexLin, mezclar, escalar, type Atmosfera, type C3, type LuzPuntual, type Pluma, type Particula } from './cine3d';
import './catalogo/abadia_oria';
import './catalogo/casas';
import './catalogo/nieve2';
import './catalogo/arboles';
import './catalogo/pueblo';
import './catalogo/campamento';
import './catalogo/campo';
import './catalogo/paramo';
import { HEROES } from './catalogo/personajes';

/**
 * El valle de Velmora en 3D: una sola escena con la colina, la catedral de Santa Oria del catálogo en la cima, su
 * cerca, el camino con faroles, el pueblo al pie, el bosque y las montañas. Cada plano de la intro que pasa en el valle
 * es esta escena con otra cámara, otra hora y lo suyo:
 * - i01 el alba de invierno (contraluz del sol bajo detrás de la catedral, ventanas de velas, nieve);
 * - i04 la noche de la última cosecha (la carreta en el campo, el cielo que se rompe arriba de la abadía);
 * - i05 la brasa que cae (su luz roja, estela de fuego de Doom);
 * - i06 la noche del impacto (la catedral `herida` ardiendo, humo, ceniza, sobrevivientes de espaldas con una antorcha);
 * - i09 la hoguera de los que quedaron entre las ruinas del pueblo;
 * - i10 las ocho clases en formación, la catedral ardiendo chica atrás.
 * Medidas del taller (una persona mide 61): la catedral mide ~210 x 350 y sus agujas pasan las 400; la colina sube 850.
 */

export type Plano = 'i01' | 'i04' | 'i05' | 'i06' | 'i09' | 'i10';
const TAU = Math.PI * 2;
const sat = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const suave = (a: number, b: number, v: number) => { const t = sat((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
/** Dirección desde el rumbo (grados desde +x, contra reloj: 90 es mirar al valle) y la elevación en grados. */
const dirAz = (a: number, e: number): V3 => { const A = (a * Math.PI) / 180, E = (e * Math.PI) / 180; return [Math.cos(A) * Math.cos(E), Math.sin(A) * Math.cos(E), Math.sin(E)]; };
/** Ruido de valor 2D (rápido: sin funciones internas, que el cargador de TypeScript envuelve y vuelve lentas). */
function h2(x: number, y: number, s: number) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function r2(x: number, y: number, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), si = Math.round(s * 7) + 3;
  let u = x - xi, v = y - yi; u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
  const a = h2(xi, yi, si), b = h2(xi + 1, yi, si), c = h2(xi, yi + 1, si), d = h2(xi + 1, yi + 1, si);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm2(x: number, y: number, oct: number, s = 0) { let v = 0, a = 0.5, t = 0, f = 1; for (let i = 0; i < oct; i++) { v += r2(x * f, y * f, s + i) * a; t += a; a *= 0.5; f *= 2.03; } return v / t; }
/** Azar estable 0..1. */
const az = (i: number, k = 0) => hash3(i * 31 + 7, k * 17 + 3, 911);

// ================================================================== lugares
/** Centro de la catedral (el origen de la pieza de la nave), alto de la meseta y giro (la fachada mira a la izquierda del valle). */
export const CAT = { x: 360, y: 3350, z: 800, giro: 118 };
const GC = (CAT.giro * Math.PI) / 180, CO = Math.cos(GC), SI = Math.sin(GC);
/** De coordenadas de la catedral (las del catálogo) al mundo. */
export const deCat = (x: number, y: number, z = 0): V3 => [CAT.x + x * CO - y * SI, CAT.y + x * SI + y * CO, CAT.z + z];
const aCat = (x: number, y: number): [number, number] => { const dx = x - CAT.x, dy = y - CAT.y; return [dx * CO + dy * SI, -dx * SI + dy * CO]; };
/** El sol del alba: bajo, escondido detrás de la catedral. */
const SOL_ALBA = dirAz(86.1, 9.2);
/**
 * Las cámaras: `fov` y `encuadre` (dónde cae la catedral, o `mira`) se dicen para la pantalla base de 1280 x 720; la
 * capa sale más grande (1408 x 792) para que el reproductor pueda moverse y acercarse sin ver el borde. El sujeto queda
 * entre y 150 y 470 de la base: entra entero en la franja que ve un iPhone acostado.
 */
export const OJOS: Record<Plano, { x: number; y: number; alto: number; fov: number; encuadre: [number, number]; mira?: V3 }> = {
  i01: { x: 60, y: -900, alto: 40, fov: 17.5, encuadre: [0.64, 0.33] },
  i04: { x: -700, y: -2700, alto: 30, fov: 30, encuadre: [0.7, 0.74] },
  i05: { x: 260, y: -1500, alto: 40, fov: 24, encuadre: [0.6, 0.6] },
  i06: { x: -110, y: 0, alto: 22, fov: 16.7, encuadre: [0.6, 0.4] },
  i09: { x: -1080, y: 1010, alto: 36, fov: 30, encuadre: [0.5, 0.56], mira: [-860, 1330, 40] },
  i10: { x: -40, y: -700, alto: 46, fov: 30, encuadre: [0.5, 0.5], mira: [-20, -330, 60] },
};

/** El camino que sube del pueblo a la puerta de la cerca (zigzag por la ladera). */
const CAMINO: [number, number][] = (() => {
  const puerta = deCat(0, 300);
  return [[-420, 1500], [-250, 1820], [-60, 2240], [-330, 2560], [-90, 2800], [puerta[0] - 160, puerta[1] - 200], [puerta[0], puerta[1]], deCat(0, 160).slice(0, 2) as [number, number]];
})();
function distCamino(x: number, y: number): number {
  let m = Infinity;
  for (let i = 0; i < CAMINO.length - 1; i++) {
    const [ax, ay] = CAMINO[i], [bx, by] = CAMINO[i + 1], vx = bx - ax, vy = by - ay, t = sat(((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy));
    m = Math.min(m, Math.hypot(x - ax - vx * t, y - ay - vy * t));
  }
  return m;
}

// ================================================================== terreno
/** Loma con forma de gota (elipse girada) y perfil gaussiano. */
function loma(x: number, y: number, cx: number, cy: number, rx: number, ry: number, ang: number, H: number) {
  const c = Math.cos(ang), s = Math.sin(ang), u = ((x - cx) * c + (y - cy) * s) / rx, v = (-(x - cx) * s + (y - cy) * c) / ry;
  return H * Math.exp(-(u * u + v * v) * 2.1);
}
const smax = (a: number, b: number, k: number) => { const h = sat(0.5 + (0.5 * (b - a)) / k); return mix(a, b, h) + k * h * (1 - h); };
/** Cuánto de la meseta (bajo la catedral y su atrio) hay en el punto (0..1), de borde roto. */
function meseta(x: number, y: number) {
  const [u, v] = aCat(x, y), du = Math.max(0, Math.abs(u) - 130), dv = Math.max(0, Math.abs(v + 10) - 215);
  return 1 - suave(0, 110, Math.hypot(du, dv) + (r2(x * 0.006, y * 0.006, 4) - 0.5) * 160 + (r2(x * 0.03, y * 0.03, 5) - 0.5) * 40);
}
/** La colina: lomas fundidas, deformadas, con cárcavas en abanico, crestas de roca y estratos rotos. */
function colina(x: number, y: number) {
  const wx = x + (fbm2(x / 1500, y / 1500, 3, 1) - 0.5) * 700, wy = y + (fbm2(x / 1500 + 9, y / 1500, 3, 2) - 0.5) * 600;
  let h = loma(wx, wy, 380, 3420, 1350, 950, 0.18, 850);
  h = smax(h, loma(wx, wy, -800, 3950, 1000, 700, -0.3, 520), 110);
  h = smax(h, loma(wx, wy, 1600, 3400, 820, 560, 0.5, 430), 100);
  h = smax(h, loma(wx, wy, 300, 4800, 2100, 1000, 0, 760), 120);
  const ang = Math.atan2(wy - 3600, wx - 470), rr = Math.hypot((wx - 470) / 1350, (wy - 3600) / 900);
  const cv = 1 - Math.abs(2 * fbm2(ang * 4.5, rr * 2.2, 3, 5) - 1);
  h -= Math.pow(cv, 5) * 70 * suave(0.25, 0.55, rr) * (1 - suave(0.95, 1.3, rr));
  const cr = 1 - Math.abs(2 * fbm2(wx / 340, wy / 340, 4, 8) - 1);
  h += (cr * cr - 0.35) * 110 * suave(150, 520, h);
  const est = fbm2(wx / 260, wy / 260, 3, 6), hr = h + (fbm2(wx / 90, wy / 90, 2, 7) - 0.5) * 40;
  h += (Math.round(hr / 46) * 46 - hr) * 0.22 * suave(0.6, 0.78, est) * suave(120, 260, h);
  return h;
}
/** Fondo del valle: lomadas suaves, un bordo que sube a los costados y el lomo donde se paran los sobrevivientes en i06. */
function valle(x: number, y: number) {
  const lomo = loma(x, y, -56, 386, 460, 120, -0.14, 66);
  return lomo + (fbm2(x / 700, y / 700, 4, 11) - 0.5) * 50 + (fbm2(x / 160, y / 160, 3, 12) - 0.5) * 10 + suave(1800, 5200, Math.abs(x - 300)) * 380 + Math.max(0, -y - 300) * 0.05;
}
/** Montañas lejanas: crestas con un paso bajo donde sale el sol. */
function montes(x: number, y: number) {
  const env = suave(6500, 14000, y);
  if (env <= 0) return 0;
  const cr = 1 - Math.abs(2 * fbm2(x / 5200, y / 5200, 5, 21) - 1), base = fbm2(x / 11000, y / 9000, 3, 22), cr2 = 1 - Math.abs(2 * fbm2(x / 1400, y / 1400, 4, 23) - 1);
  const paso = 1 - 0.55 * Math.exp(-(((x + 50 + (y - 14000) * 0.009) / 6500) ** 2));
  return env * (cr * cr * 3200 + base * 2600 + cr2 * cr2 * 700 * (0.4 + cr)) * paso + suave(14000, 40000, y) * 2500;
}
function altoBase(x: number, y: number) {
  let h = valle(x, y) + colina(x, y);
  const m = meseta(x, y);
  if (m > 0) h = mix(h, CAT.z, m);
  h = Math.max(h, montes(x, y) + valle(x, y) * 0.3);
  const dc = distCamino(x, y);
  if (dc < 30) h -= 4 * (1 - suave(6, 26, dc));
  return h;
}
/** Detalle fino (solo para la luz): ventisqueros y huellas de viento en la nieve. */
const altoDetalle = (x: number, y: number) => altoBase(x, y) + (fbm2(x / 22, y / 30, 3, 31) - 0.5) * 3.4 + (r2(x / 5, y / 7, 32) - 0.5) * 0.8;

const NIEVE: C3 = [0.72, 0.75, 0.82], ROCA: C3 = [0.032, 0.031, 0.031], BARRO: C3 = [0.07, 0.058, 0.05];
function superficie(p: V3, n: V3): { albedo: C3; brillo?: number } {
  const x = p[0], y = p[1], pend = 1 - n[2], rv = fbm2(x / 60, y / 60, 3, 41), rf = r2(x / 9, y / 9, 42);
  // roca donde la ladera se para, con nieve en lo que mira arriba; en los montes, vetas de roca por las crestas
  let roca = suave(0.42, 0.6, pend + (rv - 0.5) * 0.4 + (rf - 0.5) * 0.14);
  if (y > 7000) roca = Math.max(roca, suave(0.62, 0.8, fbm2(x / 380, y / 900, 4, 47) + pend * 0.6) * suave(800, 2000, p[2]));
  roca *= 1 - suave(0.86, 0.95, n[2]) * 0.8;
  let alb: C3 = mezclar(NIEVE, escalar(NIEVE, 0.9), rv);
  alb = mezclar(alb, mezclar(ROCA, escalar(ROCA, 1.8), rf), roca);
  const dc = distCamino(x, y);
  if (dc < 26) {
    const k = 1 - suave(8, 24, dc + (rf - 0.5) * 10), huella = suave(0.55, 0.8, r2(x / 3, y / 3, 43)) * (1 - suave(2, 7, Math.abs(dc - 4)));
    alb = mezclar(alb, mezclar([0.36, 0.36, 0.38], BARRO, 0.35 + huella * 0.6), k * 0.85);
  }
  const m = meseta(x, y);
  if (m > 0.5) alb = mezclar(alb, [0.42, 0.42, 0.44], (m - 0.5) * 0.6 * (0.6 + rv * 0.6));
  return { albedo: alb, brillo: roca > 0.5 ? 0.05 : 0.08 };
}

// ================================================================== assets
/** La primera variante de un objeto del catálogo. */
const objetoVar = (id: string) => objeto(id).variantes[0];
function piezasDe(id: string, v: string, seed: number, f = 0): Pieza[] {
  const a = objeto(id).armar(v, f, herramientas(seed));
  // la niebla de utilería del asset (masas oscuras que emiten) no va: acá la niebla es de verdad
  return (Array.isArray(a) ? a : a.piezas).filter((p) => p.mat !== 'abo_niebla');
}
/** Alto del terreno más bajo bajo un radio (para que el pie no quede en el aire). */
function pieEn(ter: Terreno, x: number, y: number, r: number) {
  let m = ter.h(x, y);
  for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; m = Math.min(m, ter.h(x + Math.cos(a) * r, y + Math.sin(a) * r)); }
  return m;
}
/** Luces de un asset: las piezas que emiten agrupadas en racimos (ventanas, puertas), corridas un poco afuera. */
function lucesDeEmisivos(ps: Pieza[], mats: string[], centro: V3, o: { c: C3; k: number; r: number; canal?: 0 | 1; sombra?: boolean; afuera?: number; halo?: number }): LuzPuntual[] {
  const cs: { s: V3; n: number }[] = [];
  for (const p of ps) {
    if (!mats.includes(p.mat) || p.resta) continue;
    const c: V3 = p.k === 'conv' ? p.pts.reduce((a, q) => [a[0] + q[0] / p.pts.length, a[1] + q[1] / p.pts.length, a[2] + q[2] / p.pts.length], [0, 0, 0] as V3) : p.k === 'elip' ? p.c : p.k === 'cono' ? p.o : (p.esf.slice(0, 3) as V3);
    const g = cs.find((q) => Math.hypot(q.s[0] / q.n - c[0], q.s[1] / q.n - c[1], q.s[2] / q.n - c[2]) < 34);
    if (g) { g.s = [g.s[0] + c[0], g.s[1] + c[1], g.s[2] + c[2]]; g.n++; } else cs.push({ s: [...c] as V3, n: 1 });
  }
  return cs.map(({ s, n }) => {
    const p: V3 = [s[0] / n, s[1] / n, s[2] / n], dx = p[0] - centro[0], dy = p[1] - centro[1], l = Math.hypot(dx, dy) || 1, af = o.afuera ?? 8;
    return { p: [p[0] + (dx / l) * af, p[1] + (dy / l) * af, p[2]], c: o.c, k: o.k * Math.min(2.2, Math.sqrt(n) * 0.7), r: o.r, canal: o.canal, sombra: o.sombra, halo: o.halo, envuelve: 0.3 };
  });
}
/** Bocas de chimenea de un asset (la tapa negra arriba de todo). */
function chimeneas(ps: Pieza[]): V3[] {
  const out: V3[] = [];
  for (const p of ps) if (p.k === 'conv' && p.mat === 'negro' && !p.resta) {
    const z = Math.max(...p.pts.map((q) => q[2])); if (z < 60) continue;
    const c = p.pts.reduce((a, q) => [a[0] + q[0] / p.pts.length, a[1] + q[1] / p.pts.length, a[2] + q[2] / p.pts.length], [0, 0, 0] as V3);
    if (!out.some((q) => Math.hypot(q[0] - c[0], q[1] - c[1]) < 20)) out.push([c[0], c[1], z]);
  }
  return out;
}
/** Peñasco anguloso: dos o tres bloques convexos de caras partidas, recostados (la nieve se le junta arriba al sombrear). */
function rocaNieve(s: number, R: number): Pieza[] {
  const out: Pieza[] = [], n = 2 + Math.floor(az(s, 1) * 2);
  for (let b = 0; b < n; b++) {
    const a0 = az(s, b + 2) * TAU, d0 = b ? R * (0.35 + az(s, b + 3) * 0.3) : 0, cx = Math.cos(a0) * d0, cy = Math.sin(a0) * d0, rr = R * (b ? 0.55 + az(s, b + 4) * 0.3 : 1);
    const alto = rr * (0.7 + az(s, b + 5) * 0.7), pts: V3[] = [];
    for (let i = 0; i < 11; i++) {
      const a = az(s * 3 + b, i + 10) * TAU, r = rr * (0.55 + az(s * 3 + b, i + 30) * 0.45), z = (az(s * 3 + b, i + 50) * 1.1 - 0.35) * alto, k = 1 - Math.max(0, z / alto) * 0.45;
      pts.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * 0.8 * k, z]);
    }
    out.push(poliedro(pts, { mat: 'nie2_roca', tono: (az(s, b + 6) - 0.5) * 0.12 }));
  }
  return out;
}
/** Tramo del muro de la cerca (en coordenadas propias: largo a lo largo de x, base en z = 0). */
function tramoMuro(L: number, alto: number, s: number, pilar: boolean): Pieza[] {
  const ps: Pieza[] = [caja(0, 0, -30, L + 0.6, 9, alto + 30, { mat: 'abo_sillar', tono: (az(s, 1) - 0.5) * 0.1 }), caja(0, 0, alto, L + 0.8, 12, 3, { mat: 'abo_labra' })];
  ps.push(poliedro([[-L / 2 - 0.4, -6, alto + 3], [L / 2 + 0.4, -6, alto + 3], [-L / 2 - 0.4, 6, alto + 3], [L / 2 + 0.4, 6, alto + 3], [-L / 2 - 0.4, 0, alto + 7], [L / 2 + 0.4, 0, alto + 7]], { mat: 'abo_labra' }));
  if (pilar) ps.push(caja(L / 2, 0, -30, 14, 15, alto + 42, { mat: 'abo_sillar_grueso' }), caja(L / 2, 0, alto + 12, 17, 18, 4, { mat: 'abo_labra' }));
  if (az(s, 3) < 0.25) ps.push(caja((az(s, 4) - 0.5) * L * 0.6, 0, alto - 6, 7 + az(s, 5) * 6, 14, 12, { mat: 'abo_sillar', resta: true }));
  return ps;
}
const ALDEANO = (genero: 'h' | 'm', alto: number, ancho: number): Cuerpo => ({ genero, alto, ancho, musculo: 0.3, piel: 'cu_piel', pelo: 'cu_pelo_negro', peinado: genero === 'm' ? 'largo' : 'corto' });
const ROPA = (capa: string, tela: string, capucha = true): Equipo => ({ torso: { tipo: 'tunica', mat: tela }, piernas: { tipo: 'pantalon', mat: 'cu_tela_parda' }, pies: { tipo: 'botas', mat: 'cu_cuero' }, capa: { mat: capa, largo: 0.95 }, cinturon: { mat: 'cu_cuero' }, ...(capucha ? { cabeza: { tipo: 'capucha' as const, mat: capa } } : {}) });

// ================================================================== armar
export type TipoFuego = 'techo' | 'puerta' | 'antorcha' | 'ventana';
export interface Valle { esc: EscenaCine; atm: Atmosfera; cam: Camara; plumas: Pluma[]; fuegos: { p: V3; ancho: number; alto: number; semilla: number; tipo: TipoFuego }[]; sol: V3 }

export function camaraValle(plano: Plano, w = 1408, h = 792): Camara {
  const O = OJOS[plano], z = altoBase(O.x, O.y) + O.alto, mira = O.mira ? ([O.mira[0], O.mira[1], altoBase(O.mira[0], O.mira[1]) + O.mira[2]] as V3) : null;
  // pantalla base dentro de la capa
  const bw = (w * 1280) / 1408, bh = (h * 720) / 792, thB = Math.tan((O.fov * Math.PI) / 360), th = thB * (h / bh), asp = bw / bh;
  const P = mira ?? deCat(0, -20, 175), dx = P[0] - O.x, dy = P[1] - O.y, dz = P[2] - z;
  const azP = (Math.atan2(dy, dx) * 180) / Math.PI, elP = (Math.atan2(dz, Math.hypot(dx, dy)) * 180) / Math.PI;
  const [sx, sy] = O.encuadre, ox = (Math.atan((2 * sx - 1) * thB * asp) * 180) / Math.PI, oy = (Math.atan((1 - 2 * sy) * thB) * 180) / Math.PI;
  const d = dirAz(azP + ox, elP - oy);
  return { pos: [O.x, O.y, z], obj: [O.x + d[0] * 5000, O.y + d[1] * 5000, z + d[2] * 5000], fov: (Math.atan(th) * 360) / Math.PI, w, h };
}

export function armarValle(plano: Plano, o: { w?: number; h?: number; sinBosque?: boolean } = {}): Valle {
  // noche: la catedral arde (i06, i09, i10); vida: el valle antes, con ventanas y faroles encendidos (i01, i04, i05)
  const noche = plano === 'i06' || plano === 'i09' || plano === 'i10', vida = !noche;
  const frente: number[] = [], esc = new EscenaCine();
  esc.terreno = new Terreno({ alto: altoDetalle, superficie, grillas: [[-2600, -3000, 3600, 6200, 5], [-14000, -3500, 16000, 17000, 25], [-90000, -6000, 90000, 80000, 220]], techo: 9000 });
  const ter = esc.terreno, cam = camaraValle(plano, o.w, o.h), fuegos: Valle['fuegos'] = [], plumas: Pluma[] = [];

  // ---------------------------------------------------------------- la catedral
  const catPs: Pieza[] = [];
  for (const [id, dy] of [['abo_catedral_cabecera', -9], ['abo_catedral_nave', 0], ['abo_catedral_fachada', 7]] as [string, number][]) {
    // cada pieza del catálogo viene corrida a su propia ancla: se devuelve a la de la nave
    const g = esc.poner(piezasDe(id, noche ? 'herida' : 'entera', 1, noche ? 5 : 2), { x: CAT.x - dy * 16 * SI, y: CAT.y + dy * 16 * CO, z: CAT.z - 1.5, giro: CAT.giro }, { nieve: noche ? 0.55 : 1 });
    catPs.push(...esc.piezas.filter((_, i) => esc.grupoDe[i] === g));
  }
  const cc = deCat(0, 0, 150);
  if (vida) esc.luces.push(...lucesDeEmisivos(catPs, ['abo_vitral'], cc, { c: hexLin('#ffb070'), k: 0.5, r: 30, afuera: 14 }));
  else {
    esc.luces.push(...lucesDeEmisivos(catPs, ['abo_vitral', 'abo_brasa', 'abo_llama'], cc, { c: hexLin('#ff7a30'), k: 2.2, r: 60, canal: 1, afuera: 16, halo: 0.00008 }));
    // el incendio del tejado: luces grandes que tiran sombra (las torres sobre la plaza, los muros sobre la nieve)
    for (const [y, z, k] of [[40, 400, 30], [-20, 420, 34], [-95, 420, 24], [100, 330, 14]] as [number, number, number][]) esc.luces.push({ p: deCat(0, y, z), c: hexLin('#ff6a22'), k, r: 190, sombra: true, canal: 1, envuelve: 0.25, halo: 0.00003 });
    for (const y of [-60, 0, 60]) esc.luces.push({ p: deCat(0, y, 120), c: hexLin('#ff5a1a'), k: 8, r: 60, canal: 1, envuelve: 0.4 });
    esc.luces.push({ p: deCat(0, 175, 40), c: hexLin('#ff7a2a'), k: 10, r: 80, sombra: true, canal: 1, envuelve: 0.3, halo: 0.0003 });
    // lenguas de Doom en dos hileras corridas (una más cerca del ojo, otra al fondo de la nave): el fuego tiene espesor
    for (const [x, y, z, an, al, s] of [[-26, 50, 240, 50, 230, 31], [26, 22, 244, 58, 300, 32], [-24, -8, 246, 56, 360, 33], [24, -40, 244, 52, 280, 34], [-22, -80, 270, 50, 260, 35], [24, -112, 280, 44, 220, 36],
      [-12, 66, 248, 60, 300, 11], [10, 40, 252, 76, 440, 12], [-8, 14, 255, 70, 540, 13], [12, -10, 256, 76, 490, 19], [-14, -34, 252, 66, 390, 14], [8, -58, 250, 56, 320, 16], [0, -100, 290, 76, 430, 17], [-16, -125, 285, 56, 290, 20], [18, 92, 238, 44, 180, 18]] as [number, number, number, number, number, number][]) fuegos.push({ p: deCat(x, y, z), ancho: an, alto: al, semilla: s, tipo: 'techo' });
    // el fuego que sale por los ventanales y la puerta
    for (const [k, v] of lucesDeEmisivos(catPs, ['abo_vitral'], cc, { c: [1, 1, 1], k: 1, r: 1, afuera: 3 }).entries()) if (v.p[2] > CAT.z + 30) fuegos.push({ p: [v.p[0], v.p[1], v.p[2] - 6], ancho: 20, alto: 44, semilla: 50 + k, tipo: 'ventana' });
    fuegos.push({ p: deCat(0, 166, 2), ancho: 64, alto: 120, semilla: 15, tipo: 'puerta' });
    plumas.push({ base: deCat(0, 0, 230), alto: 700, r0: 190, r1: 520, viento: [1.6, 0.4, 0], dens: 0.02, humo: [0.03, 0.025, 0.025], abajo: hexLin('#ff5a1a'), kAbajo: 1.4, semilla: 11, sube: 30, escala: 1 / 70 });
    plumas.push({ base: deCat(0, 10, 380), alto: 2200, r0: 120, r1: 900, viento: [2.4, 0.5, 0], dens: 0.03, humo: [0.025, 0.02, 0.02], abajo: hexLin('#ff6020'), kAbajo: 0.9, semilla: 3, sube: 26, escala: 1 / 110 });
    plumas.push({ base: deCat(0, -90, 380), alto: 1800, r0: 90, r1: 700, viento: [2.0, 0.7, 0], dens: 0.026, humo: [0.025, 0.02, 0.02], abajo: hexLin('#ff6020'), kAbajo: 0.9, semilla: 7, sube: 22, escala: 1 / 95 });
  }

  // ---------------------------------------------------------------- la cerca: un muro que sigue el terreno alrededor de la meseta
  {
    const N = 64, pts: [number, number][] = [];
    for (let i = 0; i <= N; i++) { const t = (i / N) * TAU; pts.push(deCat(Math.cos(t) * 240 * (1 + 0.06 * Math.sin(t * 3)), Math.sin(t) * 330 - 20).slice(0, 2) as [number, number]); }
    for (let i = 0; i < N; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], mx = (ax + bx) / 2, my = (ay + by) / 2, t = ((i + 0.5) / N) * TAU;
      // hueco del portón (donde llega el camino) y un tramo caído atrás
      if (Math.abs(Math.atan2(Math.sin(t - Math.PI / 2), Math.cos(t - Math.PI / 2))) < 0.13 || Math.abs(t - 4.6) < 0.1) continue;
      esc.poner(tramoMuro(Math.hypot(bx - ax, by - ay), 30 + az(i, 7) * 5, i, i % 4 === 0), { x: mx, y: my, z: Math.min(ter.h(ax, ay), ter.h(bx, by), ter.h(mx, my)), giro: (Math.atan2(by - ay, bx - ax) * 180) / Math.PI });
    }
    for (const s of [-1, 1]) { const p = deCat(s * 34, 312); esc.poner([caja(0, 0, -20, 18, 18, 76, { mat: 'abo_sillar_grueso' }), caja(0, 0, 56, 22, 22, 5, { mat: 'abo_labra' }), poliedro([[-9, -9, 61], [9, -9, 61], [-9, 9, 61], [9, 9, 61], [0, 0, 78]], { mat: 'abo_labra' })], { x: p[0], y: p[1], z: ter.h(p[0], p[1]), giro: CAT.giro }); }
  }

  // ---------------------------------------------------------------- faroles a lo largo del camino (llevan la mirada a la catedral)
  {
    let acum = 0;
    for (let i = 0; i < CAMINO.length - 2; i++) {
      const [ax, ay] = CAMINO[i], [bx, by] = CAMINO[i + 1], L = Math.hypot(bx - ax, by - ay);
      for (let t = (230 - acum) / L; t < 1; t += 230 / L) {
        const nx = -(by - ay) / L, ny = (bx - ax) / L, x = ax + (bx - ax) * t + nx * 22, y = ay + (by - ay) * t + ny * 22, z = ter.h(x, y) - 1;
        esc.poner(piezasDe('pue_farol', vida ? 'encendido' : 'apagado', 300 + i), { x, y, z, giro: (Math.atan2(-ny, -nx) * 180) / Math.PI });
        if (vida) esc.luces.push({ p: [x - nx * 14, y - ny * 14, z + 58], c: hexLin('#ffa050'), k: 1.3, r: 30, envuelve: 0.3, halo: 0.012 });
      }
      acum = (acum + L) % 230;
    }
  }

  // ---------------------------------------------------------------- el pueblo al pie (en i09, calcinado)
  const casas: [string, string, number, number, number, number][] = [
    ['casa_piedra', 'iluminada', -620, 1650, 20, 1], ['casa_entramado', 'iluminada', -300, 1880, -12, 2], ['casa_dos_pisos', 'iluminada', 60, 1700, 8, 3],
    ['casa_piedra', 'iluminada', 330, 2050, -30, 4], ['casa_alargada', 'intacta', -880, 2120, 35, 5], ['casa_capilla', 'iluminada', -120, 2280, -5, 6],
    ['casa_entramado', 'intacta', 640, 1780, 15, 7], ['casa_piedra', 'intacta', -1060, 1600, -20, 8], ['casa_establo', 'con_heno', 900, 2150, 60, 9],
    ['casa_piedra', 'iluminada', -480, 2460, 50, 10], ['casa_dos_pisos', 'intacta', 260, 1480, -20, 11],
  ];
  for (const [id, v, x, y, giro, s] of casas) {
    const ruina = plano === 'i09' && az(s, 2) < 0.6, rid = az(s, 4) < 0.5 ? 'pue_casa_calcinada' : 'pue_ruina_derrumbada';
    const ps = ruina ? piezasDe(rid, objetoVar(rid), s) : piezasDe(id, noche && v === 'iluminada' ? 'intacta' : v, s), z = pieEn(ter, x, y, 60) - 2;
    const g = esc.poner(ps, { x, y, z, giro: giro - 90 }), enMundo = esc.piezas.filter((_, i) => esc.grupoDe[i] === g);
    if (vida && v === 'iluminada') esc.luces.push(...lucesDeEmisivos(enMundo, ['casas_ventana_luz'], [x, y, z], { c: hexLin('#ffa458'), k: 1.6, r: 26, afuera: 10 }));
    if (vida) for (const ch of chimeneas(enMundo)) if (v === 'iluminada' || az(s, 5) < 0.5) plumas.push({ base: ch, alto: 380, r0: 7, r1: 90, viento: [0.7, 0.2, 0], dens: 0.018, humo: [0.16, 0.16, 0.18], semilla: s, sube: 18, escala: 1 / 34, sol: 0.15 });
  }
  esc.emision.casas_ventana_luz = { k: vida ? 3.2 : 0.2 };
  esc.emision.abo_vitral = noche ? { k: 5, canal: 1 } : { k: 1.5, color: hexLin('#ff9a4a') };
  esc.emision.abo_brasa = { k: 4, canal: 1 };
  esc.emision.abo_llama = { k: 5, canal: 1 };
  esc.emision.abo_chispa = { k: 6, canal: 1 };
  esc.emision.luz_vela = { k: 4 };
  esc.marcas = { vitral: ['abo_vitral'] };

  // ---------------------------------------------------------------- bosque
  const pinos = ['mediano', 'alto', 'gigante', 'ralo', 'doblado'];
  const libre = (x: number, y: number) => Math.hypot(x - OJOS.i01.x, y - OJOS.i01.y) > 500 && Math.hypot(x - OJOS.i06.x, y - OJOS.i06.y) > 520 && Math.hypot(x - OJOS.i10.x, y - OJOS.i10.y) > 500 && Math.hypot(x - OJOS.i09.x, y - OJOS.i09.y) > 420
    && distCamino(x, y) > 45 && meseta(x, y) < 0.05 && !casas.some(([, , cx, cy]) => Math.hypot(cx - x, cy - y) < 150) && Math.hypot(x - CAT.x, y - CAT.y) > 420;
  const plantar = (id: string, v: string, x: number, y: number, s: number, k = 1, nieve = 1) => esc.poner(piezasDe(id, v, s), { x, y, z: pieEn(ter, x, y, 14 * k) - 3 * k, giro: az(s, 3) * 360, k }, { nieve });
  // primer plano del alba: un árbol muerto grande a la izquierda y pinos oscuros a la derecha (capa de frente)
  const I1 = OJOS.i01;
  frente.push(plantar('nie2_arbol_muerto', 'retorcido', I1.x - 250, I1.y + 700, 101, 2.3), plantar('nie2_pino', 'gigante', I1.x + 190, I1.y + 560, 102, 1.3), plantar('nie2_pino', 'alto', I1.x + 260, I1.y + 690, 103, 1.15));
  frente.push(plantar('nie2_pino', 'mediano', I1.x + 150, I1.y + 640, 104, 1), plantar('nie2_arbol_muerto', 'alto', I1.x - 300, I1.y + 660, 105, 1.4));
  if (!o.sinBosque) {
    let s = 200;
    for (let i = 0; i < 700 && s < 440; i++) {
      const x = -2400 + az(i, 1) * 5200, y = -400 + az(i, 2) * 3900;
      const lado = suave(200, 800, Math.abs(x - 80 - (y + 900) * 0.02)), dens = lado * (0.35 + fbm2(x / 500, y / 500, 2, 51) * 0.9);
      if (az(i, 3) > dens || !libre(x, y)) continue;
      const muerto = az(i, 4) < (colina(x, y) > 60 ? 0.25 : 0.12);
      plantar(muerto ? 'nie2_arbol_muerto' : 'nie2_pino', muerto ? (az(i, 5) < 0.5 ? 'retorcido' : 'alto') : pinos[Math.floor(az(i, 5) * pinos.length)], x, y, s++, 0.9 + az(i, 6) * 0.5);
    }
    for (let i = 0; i < 160; i++) {
      const x = -1900 + az(i, 41) * 1700, y = 2500 + az(i, 42) * 2300;
      if (!libre(x, y) || az(i, 43) > 0.35 + fbm2(x / 400, y / 400, 2, 44) * 0.6) continue;
      plantar('nie2_pino', pinos[Math.floor(az(i, 45) * 4)], x, y, s++, 1 + az(i, 46) * 0.4);
    }
    for (let i = 0; i < 40; i++) {
      const x = -900 + az(i, 11) * 2600, y = 3700 + az(i, 12) * 1400;
      if (!libre(x, y) || az(i, 13) > 0.7) continue;
      plantar('nie2_pino', pinos[Math.floor(az(i, 14) * 3)], x, y, s++, 1 + az(i, 15) * 0.5);
    }
    // la corona de roca: peñascos grandes donde la meseta se corta
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * TAU + az(i, 31) * 0.2, [x, y] = deCat(Math.cos(a) * (200 + az(i, 32) * 50), Math.sin(a) * (290 + az(i, 33) * 50) - 10), R = 30 + az(i, 34) * 45;
      if (distCamino(x, y) < 60) continue;
      esc.poner(rocaNieve(i + 900, R), { x, y, z: ter.h(x, y) - R * 0.35, giro: az(i, 35) * 360 }, { nieve: 0.7 });
    }
    for (let i = 0; i < 70; i++) {
      const x = -1000 + az(i, 21) * 2700, y = 2300 + az(i, 22) * 2200;
      if (colina(x, y) < 90 || !libre(x, y) || az(i, 23) > 0.75) continue;
      const R = 14 + az(i, 24) * 30;
      esc.poner(rocaNieve(i + 500, R), { x, y, z: ter.h(x, y) - R * 0.25, giro: az(i, 25) * 360 }, { nieve: 0.8 });
    }
  }

  // ---------------------------------------------------------------- los que sobrevivieron (i06)
  if (plano === 'i06') {
    // en primer plano sobre el lomo, de espaldas, mirando arder la catedral; uno alza una antorcha que les da en la ropa
    const O = OJOS.i06, a = Math.atan2(CAT.y - O.y, CAT.x - O.x), fx = Math.cos(a), fy = Math.sin(a);
    const en = (lado: number, fr: number): [number, number] => [O.x + fx * fr + fy * lado, O.y + fy * fr - fx * lado];
    const figuras: [number, number, number, 'h' | 'm', number, string, boolean][] = [
      [-96, 402, 1.0, 'h', 10, 'cu_tela_parda', false], [-64, 424, 0.92, 'm', -6, 'cu_tela_roja', false], [-78, 436, 0.6, 'm', -2, 'cu_tela_parda', false],
      [-48, 396, 1.04, 'h', 4, 'cu_tela_negra', true], [72, 412, 0.96, 'h', -18, 'cu_tela_parda', false], [96, 446, 0.98, 'm', 8, 'cu_tela_negra', false],
    ];
    for (const [lado, fr, k, gen, mira, tela, antorcha] of figuras) {
      const [x, y] = en(lado, fr), eq = ROPA(k < 0.7 ? 'cu_tela_parda' : 'cu_pelaje', tela, gen === 'm' || az(Math.round(x), 3) < 0.5);
      // el personaje del taller mira hacia `n` (arriba en pantalla isométrica = -x -y): se gira para que mire la catedral
      const giro = (Math.atan2(CAT.y - y, CAT.x - x) * 180) / Math.PI + 135 + mira;
      frente.push(esc.poner(personaje(ALDEANO(gen, k, gen === 'm' ? 0.92 : 1.02), eq, 'n', 'quieto', 1), { x, y, z: ter.h(x, y) - 1, giro }, { nieve: 0 }));
      if (antorcha) {
        const z0 = ter.h(x, y) - 1, rx = fy, ry = -fx, mano: V3 = [x - rx * 9 * k, y - ry * 9 * k, z0 + 44 * k], cima: V3 = [x - rx * 13 * k, y - ry * 13 * k, z0 + 70 * k];
        frente.push(esc.ponerMundo([palo(mano, cima, 0.9, { mat: 'abo_madera_quemada', r1: 1.2 }), caja(cima[0], cima[1], cima[2] - 3, 4, 4, 5, { mat: 'hierro' })], { nieve: 0 }));
        esc.luces.push({ p: [cima[0], cima[1] - 6, cima[2] + 8], c: hexLin('#ff8a3a'), k: 3.6, r: 30, canal: 1, envuelve: 0.5, sombra: true, halo: 0.0015 });
        fuegos.push({ p: [cima[0], cima[1], cima[2] + 1], ancho: 11, alto: 26, semilla: 21, tipo: 'antorcha' });
      }
    }
  }
  extrasPlano(plano, esc, ter, fuegos, plumas, frente);

  const atm = plano === 'i01' ? atmAlba() : plano === 'i04' || plano === 'i05' ? atmCosecha(plano) : atmNoche(plano);
  for (const g of frente) esc.frente.add(g);
  return { esc, atm, cam, plumas, fuegos, sol: atm.sol.dir };
}

// ================================================================== lo propio de cada plano
function extrasPlano(plano: Plano, esc: EscenaCine, ter: Terreno, fuegos: Valle['fuegos'], plumas: Pluma[], frente: number[]) {
  const poner = (id: string, v: string, x: number, y: number, s: number, giro: number, k = 1, alFrente = true, nieve = 1) => {
    const g = esc.poner(piezasDe(id, v, s), { x, y, z: pieEn(ter, x, y, 12 * k) - 1, giro, k }, { nieve });
    if (alFrente) frente.push(g);
  };
  const O = OJOS[plano], P = O.mira ?? deCat(0, -20, 0), ah = Math.atan2(P[1] - O.y, P[0] - O.x), fx = Math.cos(ah), fy = Math.sin(ah), hacia = (ah * 180) / Math.PI;
  const en = (lado: number, adelante: number): [number, number] => [O.x + fx * adelante + fy * lado, O.y + fy * adelante - fx * lado];
  if (plano === 'i04') {
    // el campo de la última cosecha: una carreta de verdad con su farol, gavillas y un espantapájaros
    let [x, y] = en(-150, 620); poner('camp_carreta', objetoVar('camp_carreta'), x, y, 401, hacia + 70, 1.3);
    esc.luces.push({ p: [x, y, ter.h(x, y) + 46], c: hexLin('#ffa050'), k: 2.2, r: 40, envuelve: 0.4, sombra: true, halo: 0.003 });
    esc.ponerMundo([caja(x, y, ter.h(x, y) + 40, 5, 5, 8, { mat: 'luz_vela' })], { nieve: 0 });
    for (const [l, a, s] of [[60, 380, 402], [140, 520, 403], [-260, 600, 404], [230, 760, 405], [-40, 820, 406], [330, 980, 407]] as [number, number, number][]) { [x, y] = en(l, a); poner('camp_heno', objetoVar('camp_heno'), x, y, s, az(s) * 360, 1.1, a < 700, 0.7); }
    [x, y] = en(320, 640); poner('campo_espantapajaros', objetoVar('campo_espantapajaros'), x, y, 408, hacia + 180, 1.2, true, 0.5);
  }
  if (plano === 'i05') {
    // la brasa: un núcleo que arde, su luz roja que se come el valle y una estela de fuego de Doom que sube detrás
    const b = deCat(-300, 40, 620);
    esc.ponerMundo([caja(b[0], b[1], b[2] - 9, 16, 16, 18, { mat: 'abo_brasa' })], { nieve: 0 });
    esc.luces.push({ p: b, c: hexLin('#ff4a1a'), k: 70, r: 260, canal: 1, sombra: true, envuelve: 0.2, halo: 0.0004 });
    fuegos.push({ p: [b[0], b[1], b[2] - 14], ancho: 60, alto: 420, semilla: 61, tipo: 'techo' });
    plumas.push({ base: [b[0], b[1], b[2] + 40], alto: 900, r0: 30, r1: 140, viento: [0.15, 0.05, 0], dens: 0.025, humo: [0.03, 0.025, 0.025], abajo: hexLin('#ff5a1a'), kAbajo: 2, semilla: 62, sube: 10, escala: 1 / 40 });
  }
  if (plano === 'i09') {
    // la hoguera entre las ruinas del pueblo: fuego de Doom en una pira, los que quedaron alrededor
    const m = O.mira!, z = ter.h(m[0], m[1]);
    poner('nie2_hoguera', objetoVar('nie2_hoguera'), m[0], m[1], 501, 0, 1.3, false, 0);
    esc.luces.push({ p: [m[0], m[1], z + 28], c: hexLin('#ff8a3a'), k: 8, r: 80, canal: 1, sombra: true, envuelve: 0.4, halo: 0.00025 });
    for (const [dx, dy, an, al, s2] of [[0, 0, 40, 120, 71], [-10, 8, 30, 90, 72], [12, -6, 28, 80, 73]] as [number, number, number, number, number][]) fuegos.push({ p: [m[0] + dx, m[1] + dy, z + 6], ancho: an, alto: al, semilla: s2, tipo: 'techo' });
    plumas.push({ base: [m[0], m[1], z + 90], alto: 700, r0: 20, r1: 160, viento: [0.5, 0.2, 0], dens: 0.02, humo: [0.05, 0.045, 0.045], abajo: hexLin('#ff6a2a'), kAbajo: 1.4, semilla: 74, sube: 20, escala: 1 / 40 });
    const haciaOjo = Math.atan2(O.y - m[1], O.x - m[0]);
    for (const [ang, k, gen, tela] of [[200, 0.98, 'h', 'cu_tela_parda'], [150, 0.92, 'm', 'cu_tela_roja'], [95, 1.02, 'h', 'cu_tela_negra'], [30, 0.62, 'm', 'cu_tela_parda'], [-30, 1.0, 'h', 'cu_tela_parda'], [-90, 0.95, 'm', 'cu_tela_negra'], [-150, 1.04, 'h', 'cu_tela_parda']] as [number, number, 'h' | 'm', string][]) {
      const a = haciaOjo + (ang * Math.PI) / 180, x = m[0] + Math.cos(a) * 78, y = m[1] + Math.sin(a) * 78, giro = (Math.atan2(m[1] - y, m[0] - x) * 180) / Math.PI + 135;
      frente.push(esc.poner(personaje(ALDEANO(gen, k, gen === 'm' ? 0.92 : 1.02), ROPA(k < 0.7 ? 'cu_tela_parda' : 'cu_pelaje', tela, gen === 'm'), 'n', 'quieto', 1), { x, y, z: ter.h(x, y) - 1, giro }, { nieve: 0 }));
    }
  }
  if (plano === 'i10') {
    // las ocho clases en formación (en V, la del medio adelante), de frente al ojo y de espaldas al incendio
    const m = O.mira!, a = Math.atan2(O.y - m[1], O.x - m[0]), gx = Math.cos(a), gy = Math.sin(a);
    const lugares: [number, number][] = [[0, 30], [-58, -50], [60, -60], [-120, -140], [118, -150], [-178, -240], [176, -250], [0, -200]];
    HEROES.slice(0, 8).forEach((h, i) => {
      const [l, d] = lugares[i], x = m[0] + gx * d + gy * l, y = m[1] + gy * d - gx * l;
      // 's' (abajo en la pantalla isométrica = +x +y) gira hacia el ojo
      frente.push(esc.poner(personaje(h.cuerpo, h.niveles[1], 's', 'quieto', 0), { x, y, z: ter.h(x, y) - 1, giro: (Math.atan2(O.y - y, O.x - x) * 180) / Math.PI - 45 + l * 0.06 }, { nieve: 0 }));
    });
    esc.luces.push({ p: [m[0] + gx * 160, m[1] + gy * 160, ter.h(m[0], m[1]) + 8], c: hexLin('#ff7a30'), k: 9, r: 170, canal: 1, envuelve: 0.3 });
  }
}

// ================================================================== cielos
function gradiente(paradas: [number, C3][], e: number): C3 {
  let k = 0; while (k < paradas.length - 2 && e > paradas[k + 1][0]) k++;
  const [a, ca] = paradas[k], [b, cb] = paradas[k + 1];
  return mezclar(ca, cb, suave(a, b, e));
}
/**
 * Bancos de nubes con volumen: ruido deformado (no estirado en bandas), borde roto por las octavas altas y una luz que
 * sale de comparar la densidad con la del punto corrido hacia la luz (lo que da a la luz se enciende, la panza queda
 * oscura). Devuelve la cobertura, cuánto le da la luz al borde y el espesor.
 */
function nubes(d: V3, s: number, esc: number, cubre: number, alto: number, luz: V3, estira = 1.7): { a: number; luz: number; espesor: number } {
  if (d[2] <= 0.005) return { a: 0, luz: 0, espesor: 0 };
  const k = alto / d[2], u = (d[0] * k) / (esc * estira), v = (d[1] * k) / esc;
  const den = (x: number, y: number) => {
    const wx = x + (fbm2(x * 0.6 + 3, y * 0.6, 3, s + 1) - 0.5) * 1.4, wy = y + (fbm2(x * 0.6, y * 0.6 + 7, 3, s + 2) - 0.5) * 1.4;
    return fbm2(wx, wy, 6, s) * 0.7 + fbm2(wx * 0.35, wy * 0.35, 2, s + 4) * 0.45 - 0.15;
  };
  const n = den(u, v), ll = Math.hypot(luz[0], luz[1]) || 1, n2 = den(u + (luz[0] / ll) * 0.12, v + (luz[1] / ll) * 0.12);
  return { a: suave(cubre, cubre + 0.07, n) * suave(0.01, 0.08, d[2]), luz: sat((n - n2) * 6 + 0.25) * (1 - suave(cubre + 0.05, cubre + 0.3, n) * 0.6), espesor: sat((n - cubre) * 4) };
}
const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function atmAlba(): Atmosfera {
  const L = SOL_ALBA, sol = hexLin('#ffc08a');
  const pars: [number, C3][] = [[0, hexLin('#545866')], [0.05, hexLin('#3b4560')], [0.16, hexLin('#26314f')], [0.38, hexLin('#141a33')], [0.9, hexLin('#070a18')]];
  const brillo = (d: V3, e: number) => { const g = Math.max(0, dot3(d, L)); return escalar(hexLin('#ffb27a'), (0.55 * Math.pow(g, 90) + 0.16 * Math.pow(g, 12) + 0.04 * Math.pow(g, 2)) * Math.exp(-Math.max(0, e) * 9) + 0.9 * Math.pow(g, 260)); };
  // el aire toma menos del resplandor que el cielo de arriba; los dos usan la misma cuenta hasta 0.03 (el horizonte empalma)
  const kAire = (e: number) => 0.5 + 0.5 * suave(0, 0.12, e);
  const aire = (d: V3): C3 => { const e = Math.min(0.03, Math.max(0, d[2])), b = gradiente(pars, e), gl = brillo(norm([d[0], d[1], e]), e), k = kAire(e); return [b[0] + gl[0] * k, b[1] + gl[1] * k, b[2] + gl[2] * k]; };
  const cielo = (d: V3): C3 => {
    const e = Math.asin(Math.max(-1, Math.min(1, d[2])));
    if (e < 0.03) return aire(d);
    const b = gradiente(pars, e), gl = brillo(d, e), g = Math.max(0, dot3(d, L)), ka = kAire(e);
    let c: C3 = [b[0] + gl[0] * ka, b[1] + gl[1] * ka, b[2] + gl[2] * ka];
    c = mezclar(c, [c[0] + sol[0] * (30 * Math.pow(g, 4000) + 1.2 * Math.pow(g, 300)), c[1] + sol[1] * (30 * Math.pow(g, 4000) + 1.2 * Math.pow(g, 300)), c[2] + sol[2] * (30 * Math.pow(g, 4000) + 1.2 * Math.pow(g, 300))], 1);
    for (const [sd, esc, cu, al, oscuro] of [[3.1, 2600, 0.5, 5200, 0.5], [7.7, 1500, 0.55, 2600, 0.7]] as [number, number, number, number, number][]) {
      const nb = nubes(d, sd, esc, cu, al, L); if (nb.a <= 0) continue;
      const lz = (0.25 + nb.luz) * (Math.pow(g, 6) * 2.4 + Math.pow(g, 2) * 0.18), cal = hexLin('#ffa070'), os = oscuro * (1 - nb.espesor * 0.4);
      c = mezclar(c, [b[0] * os + cal[0] * lz, b[1] * os + cal[1] * lz, b[2] * os + cal[2] * lz], nb.a * 0.92);
    }
    return c;
  };
  return {
    sol: { dir: L, c: sol, k: 3.2, ancho: 0.012 }, cielo, aire,
    ambCielo: escalar(hexLin('#304e8e'), 0.6), ambSuelo: escalar(hexLin('#2a2a36'), 0.6),
    niebla: { densidad: 1 / 19000, baja: 1 / 9000, z0: 0, H: 80, ruido: 0.7, escalaRuido: 0.0012 },
    borde: { c: hexLin('#ffc8a0'), k: 2.4 }, nieve: { albedo: NIEVE, desde: 0.55 }, oclusion: 0.85,
  };
}

/** El cielo que se rompe (i04) y la brasa que cae (i05): noche de invierno honda, estrellas y la herida roja arriba de la abadía. */
function atmCosecha(plano: 'i04' | 'i05'): Atmosfera {
  const O = OJOS[plano], ab = deCat(0, 0, 0), az0 = Math.atan2(ab[1] - O.y, ab[0] - O.x) + (plano === 'i04' ? 0.06 : 0.1), el0 = plano === 'i04' ? 0.27 : 0.3;
  const R = norm([Math.cos(az0) * Math.cos(el0), Math.sin(az0) * Math.cos(el0), Math.sin(el0)]), herida = hexLin('#ff3a14'), alma = hexLin('#ffe6b0'), kH = plano === 'i05' ? 1.5 : 1;
  const pars: [number, C3][] = [[0, hexLin('#20222e')], [0.06, hexLin('#181d2c')], [0.18, hexLin('#10162a')], [0.45, hexLin('#090c1a')], [0.9, hexLin('#04050c')]];
  /** La grieta: una línea que serpentea en el cielo, con alma clara, borde rojo y un resplandor que cae. */
  const grieta = (d: V3) => {
    const a = Math.atan2(d[1], d[0]) - az0, e = Math.asin(Math.max(-1, Math.min(1, d[2]))), u = Math.atan2(Math.sin(a), Math.cos(a)), largo = 1 - suave(0.22, 0.42, Math.abs(u));
    const halo = Math.exp(-Math.hypot(u * 1.6, e - el0) / 0.18) * 0.25;
    if (largo <= 0) return { alma: 0, borde: 0, brillo: halo };
    const ec = el0 + 0.035 * Math.sin(u * 11) + 0.025 * (fbm2(u * 16, 2, 2, 81) - 0.5) + 0.01 * Math.sin(u * 37), ancho = (0.004 + 0.012 * fbm2(u * 9, 5, 2, 82)) * largo, dv = Math.abs(e - ec);
    return { alma: (1 - suave(ancho * 0.35, ancho, dv)) * largo, borde: (1 - suave(ancho, ancho * 3.5, dv)) * largo, brillo: Math.exp(-dv / 0.05) * largo * 0.6 + halo };
  };
  const aire = (d: V3): C3 => { const e = Math.min(0.03, Math.max(0, d[2])), b = gradiente(pars, e), g = Math.max(0, d[0] * R[0] + d[1] * R[1]) ** 12 * 0.06 * kH; return [b[0] + herida[0] * g, b[1] + herida[1] * g, b[2] + herida[2] * g]; };
  const cielo = (d: V3): C3 => {
    const e = Math.asin(Math.max(-1, Math.min(1, d[2])));
    if (e < 0.03) return aire(d);
    let c = gradiente(pars, e);
    const hs = h2(Math.floor(Math.atan2(d[1], d[0]) * 900), Math.floor(e * 900), 91);
    if (hs > 0.9975) c = [c[0] + (hs - 0.9975) * 24, c[1] + (hs - 0.9975) * 24, c[2] + (hs - 0.9975) * 32];
    const g = grieta(d);
    c = [c[0] + herida[0] * g.brillo * kH * 0.5, c[1] + herida[1] * g.brillo * kH * 0.5, c[2] + herida[2] * g.brillo * kH * 0.5];
    for (const [sd, esc, cu, al] of [[23.1, 2400, 0.46, 3600], [29.3, 1500, 0.52, 2200]] as [number, number, number, number][]) {
      const nb = nubes(d, sd, esc, cu, al, [-R[0], -R[1], 0]); if (nb.a <= 0) continue;
      const k = g.brillo * kH * (0.4 + nb.luz) * 1.6, frio = escalar(hexLin('#141a2a'), 1 - nb.espesor * 0.5);
      c = mezclar(c, [frio[0] + herida[0] * k, frio[1] + herida[1] * k, frio[2] + herida[2] * k], nb.a * 0.9);
    }
    return mezclar(mezclar(c, escalar(herida, 2.4 * kH), g.borde), escalar(alma, 3.6 * kH), g.alma);
  };
  return {
    sol: { dir: R, c: herida, k: 0.55 * kH, ancho: 0.05 }, cielo, aire,
    ambCielo: escalar(hexLin('#22325a'), 0.3), ambSuelo: escalar(hexLin('#141820'), 0.18),
    niebla: { densidad: 1 / 18000, baja: 1 / 7000, z0: 0, H: 90, ruido: 0.7, escalaRuido: 0.0012 },
    borde: { c: herida, k: 1.8 }, nieve: { albedo: NIEVE, desde: 0.55 }, oclusion: 0.85,
  };
}

/** La noche del incendio: ceniza fría (azul gris) en todo el cielo y el fuego como único foco cálido. */
function atmNoche(plano: Plano): Atmosfera {
  const rojo = hexLin('#ff5a22'), fc = deCat(0, 0, 420), F = norm([fc[0] - OJOS[plano].x, fc[1] - OJOS[plano].y, fc[2] - 40]);
  const pars: [number, C3][] = [[0, hexLin('#2e2a30')], [0.05, hexLin('#2a3042')], [0.15, hexLin('#222c40')], [0.4, hexLin('#141b2a')], [0.9, hexLin('#080b12')]];
  const resplandor = (d: V3) => { const g = Math.max(0, dot3(d, F)); return 0.6 * Math.pow(g, 500) + 0.12 * Math.pow(g, 80) + 0.02 * Math.pow(g, 8); };
  const aire = (d: V3): C3 => { const e = Math.min(0.03, Math.max(0, d[2])), b = gradiente(pars, e), k = resplandor(norm([d[0], d[1], e])) * 0.5; return [b[0] + rojo[0] * k, b[1] + rojo[1] * k, b[2] + rojo[2] * k]; };
  const cielo = (d: V3): C3 => {
    const e = Math.asin(Math.max(-1, Math.min(1, d[2])));
    if (e < 0.03) return aire(d);
    const b = gradiente(pars, e), rf = resplandor(d), ka = 0.5 + 0.5 * suave(0, 0.12, e);
    let c: C3 = [b[0] + rojo[0] * rf * ka, b[1] + rojo[1] * rf * ka, b[2] + rojo[2] * rf * ka];
    for (const [sd, esc, cu, al] of [[13.3, 2200, 0.42, 3000], [17.9, 1300, 0.5, 1800]] as [number, number, number, number][]) {
      const nb = nubes(d, sd, esc, cu, al, [-F[0], -F[1], 0]); if (nb.a <= 0) continue;
      const k = rf * 2.6 * (0.3 + nb.luz * 0.7), frio = escalar(hexLin('#222a3c'), 0.9 * (1 - nb.espesor * 0.5));
      c = mezclar(c, [frio[0] + rojo[0] * k, frio[1] + rojo[1] * k, frio[2] + rojo[2] * k], nb.a * 0.9);
    }
    return c;
  };
  return {
    // la luz principal es el incendio mismo, desde arriba de la catedral: filo cálido en lo que mira hacia ella
    sol: { dir: norm([F[0], F[1], 0.22]), c: hexLin('#ff6a2a'), k: 0.3, ancho: 0.04 }, cielo, aire,
    ambCielo: escalar(hexLin('#2c3c5e'), 0.32), ambSuelo: escalar(hexLin('#141820'), 0.22),
    niebla: { densidad: 1 / 16000, baja: 1 / 6500, z0: 0, H: 110, ruido: 0.7, escalaRuido: 0.0012 },
    borde: { c: hexLin('#ff7a40'), k: 2.2 }, nieve: { albedo: NIEVE, desde: 0.6 }, oclusion: 0.85,
  };
}

// ================================================================== partículas
/** Nieve o ceniza que cae: repartida en el campo visual a todas las distancias, con su velocidad (para la estela). */
export function copos(cam: Camara, t: number, n: number, s = 1, o: { c?: C3; viento?: V3; cae?: number } = {}): Particula[] {
  const out: Particula[] = [], f = norm([cam.obj[0] - cam.pos[0], cam.obj[1] - cam.pos[1], cam.obj[2] - cam.pos[2]]);
  const r = norm([f[1], -f[0], 0]), u: V3 = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  const th = Math.tan((cam.fov * Math.PI) / 360) * 1.15, asp = cam.w / cam.h, vi = o.viento ?? [14, 4, 0], cae = o.cae ?? 34;
  for (let i = 0; i < n; i++) {
    const d = 240 + Math.pow(az(i, s * 3 + 1), 1.3) * 2600, sx = (az(i, s * 3 + 2) * 2 - 1) * th * asp * d, sy = (az(i, s * 3 + 3) * 2 - 1) * th * d * 1.3;
    const ph = az(i, s * 3 + 4) * TAU, k = 0.6 + az(i, s * 3 + 5) * 0.8, H = th * d * 2.6, dz = ((t * cae * k + az(i, 7) * H) % H) - H / 2;
    const p: V3 = [cam.pos[0] + f[0] * d + r[0] * sx + u[0] * sy, cam.pos[1] + f[1] * d + r[1] * sx + u[1] * sy, cam.pos[2] + f[2] * d + r[2] * sx + u[2] * sy];
    out.push({ p: [p[0] + vi[0] * t + Math.sin(t * 1.3 + ph) * 3, p[1] + vi[1] * t, p[2] - dz], r: 0.12 + az(i, s * 3 + 6) * 0.14, c: o.c ?? [0.7, 0.72, 0.8], a: 0.7, v: [vi[0] + Math.cos(t * 1.3 + ph) * 3.9, vi[1], -cae * k] });
  }
  return out;
}
