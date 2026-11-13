import { createRaster } from '../core/raster';
import { LUZ, VISTA, hash3, type Render, type V3 } from './render';

/**
 * Decals del suelo del páramo y del campamento: manchas planas que rompen la grilla de las baldosas (charcos con
 * reflejo y lluvia, raíces, piedras sueltas, grava, pisadas, huellas de carreta, pasto ralo, ceniza y los restos de
 * una fogata). Se pintan por pixel sobre el piso (alto propio de 2,5 como mucho, para que no tapen a nadie) con el
 * borde que se funde (alfa), y el juego los dibuja como suelo (`plano`). `regarDecalsParamo` dice dónde ponerlos.
 */

const cl = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const sm = (a: number, b: number, v: number) => { const t = cl((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
type C3 = [number, number, number];
const hex = (h: string): C3 => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const mixC = (a: C3, b: C3, t: number): C3 => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
/** Ruido de valor 2D suave (libre, no periódico: los decals no pegan con nada). */
function vn(x: number, y: number, s: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const h = (i: number, j: number) => hash3(i, j, s);
  return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v;
}
const fbm = (x: number, y: number, s: number) => vn(x, y, s) * 0.6 + vn(x * 2.1, y * 2.1, s + 1) * 0.3 + vn(x * 4.3, y * 4.3, s + 2) * 0.1;

const COL = {
  barroMojado: hex('#16110c'), barro: hex('#261d14'), cielo: hex('#596167'), cieloAlto: hex('#283035'), brillo: hex('#a8b8c1'),
  agua: hex('#0c1115'), corteza: hex('#2b2118'), cortezaClara: hex('#5a4834'), piedra: hex('#5e584d'), piedraOsc: hex('#2a2722'),
  musgo: hex('#2b3320'), tierraOsc: hex('#1d1710'), brizna: hex('#5f5639'), briznaOsc: hex('#463d28'), briznaClara: hex('#766b4c'),
  ceniza: hex('#3f3d3a'), cenizaClara: hex('#5d5a55'), carbon: hex('#121110'), brasaVieja: hex('#3a1c10'), hollin: hex('#191716'),
};
const VIS: V3 = [-VISTA[0], -VISTA[1], -VISTA[2]];
const SOL: V3 = (() => { const v: V3 = [LUZ[0], LUZ[1], LUZ[2] * 0.55]; const l = Math.hypot(...v); return [v[0] / l, v[1] / l, v[2] / l]; })();

/** Lo que da un decal en un punto del piso: color, alfa, alto (para la luz) y cuánto refleja (mojado). */
interface Punto { c: C3; a: number; h: number; moja: number }
type Decal = (x: number, y: number, f: number) => Punto | null;

// ------------------------------------------------------------------ piezas sueltas (piedras, grava)
interface Piedrita { x: number; y: number; rx: number; ry: number; g: number; h: number; t: number; musgo: boolean }
function piedritas(n: number, rad: [number, number], esparcir: number, seed: number, centro: [number, number] = [0, 0]): Piedrita[] {
  const out: Piedrita[] = []; let k = 0; const r = () => hash3(k++, seed, 71);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * esparcir, rr = rad[0] + r() * r() * (rad[1] - rad[0]);
    out.push({ x: centro[0] + Math.cos(a) * d, y: centro[1] + Math.sin(a) * d * 0.8, rx: rr * (0.85 + r() * 0.4), ry: rr * (0.7 + r() * 0.35), g: r() * Math.PI, h: rr * (0.45 + r() * 0.35), t: r(), musgo: r() < 0.3 });
  }
  return out;
}
function enPiedras(ps: Piedrita[], x: number, y: number): [number, Piedrita | null, number] {
  let hm = 0, cual: Piedrita | null = null, ao = 0;
  for (const p of ps) {
    const dx = x - p.x, dy = y - p.y, c = Math.cos(p.g), s = Math.sin(p.g);
    const u = (dx * c + dy * s) / p.rx, v = (-dx * s + dy * c) / p.ry, d = Math.sqrt(u * u + v * v);
    // sombra de contacto alrededor (hacia +x-y, lejos de la luz)
    const ds = Math.hypot(u - 0.35, v + 0.2);
    if (ds < 1.6) ao = Math.max(ao, sm(1.6, 0.9, ds) * 0.6);
    if (d >= 1) continue;
    const h = p.h * Math.sqrt(1 - d * d); if (h > hm) { hm = h; cual = p; }
  }
  return [hm, cual, ao];
}

// ------------------------------------------------------------------ los decals
function charco(rx: number, ry: number, seed: number): Decal {
  // forma: elipse con borde irregular; adentro agua que refleja el cielo, borde de barro mojado que se funde
  const anillos: { x: number; y: number; b: number }[] = [];
  for (let i = 0; i < Math.round((rx * ry) / 14) + 2; i++) { const a = hash3(i, seed, 5) * Math.PI * 2, d = Math.sqrt(hash3(i, seed, 6)) * 0.75; anillos.push({ x: Math.cos(a) * d * rx, y: Math.sin(a) * d * ry, b: hash3(i, seed, 7) }); }
  return (x, y, f) => {
    const u = x / rx, v = y / ry, d = Math.sqrt(u * u + v * v) + (fbm(x * 0.18, y * 0.18, seed) - 0.5) * 0.55;
    if (d > 1.75) return null;
    if (d > 1) {
      // barro mojado alrededor
      const k = sm(1.75, 1.0, d);
      return { c: mixC(COL.barro, COL.barroMojado, sm(1.5, 1.05, d)), a: k * 0.92, h: (fbm(x * 0.5, y * 0.5, seed + 3) - 0.5) * 0.8 + (d - 1) * 0.8, moja: sm(1.45, 1.0, d) * 0.7 };
    }
    // agua: ondas de lluvia (8 cuadros, bucle) que cambian la normal
    const t = (f % 8) / 8; let nx = 0, ny = 0;
    for (const r of anillos) {
      const edad = (t - r.b + 1) % 1; if (edad > 0.45) continue;
      const q = edad / 0.45, rad = 0.5 + q * 4, dx = x - r.x, dy = y - r.y, dd = Math.hypot(dx, dy);
      if (dd < 0.01 || Math.abs(dd - rad) > 1.4) continue;
      const w = Math.exp(-(((dd - rad) / 0.45) ** 2)) * (1 - q) * (1 - q) * Math.cos((dd - rad) * 4);
      nx += (dx / dd) * w * 0.35; ny += (dy / dd) * w * 0.35;
    }
    return { c: COL.agua, a: 1, h: -0.25, moja: 1, n: [nx, ny] } as Punto & { n: [number, number] };
  };
}
function raices(seed: number): Decal {
  // 4 a 6 raíces que salen de un tronco en (-14, -6) (arriba a la izquierda) y se meten en la tierra
  const rs: { a: [number, number]; b: [number, number]; c: [number, number]; r: number }[] = [];
  let k = 0; const r = () => hash3(k++, seed, 91);
  const n = 4 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const ang = -0.6 + (i / (n - 1)) * 2.1 + (r() - 0.5) * 0.35, L = 16 + r() * 13, o: [number, number] = [-12 + (r() - 0.5) * 3, -6 + (r() - 0.5) * 3];
    const b: [number, number] = [o[0] + Math.cos(ang) * L, o[1] + Math.sin(ang) * L], c: [number, number] = [o[0] + Math.cos(ang + (r() - 0.5) * 0.9) * L * 0.5, o[1] + Math.sin(ang + (r() - 0.5) * 0.9) * L * 0.5];
    rs.push({ a: o, b, c, r: 2.1 + r() * 1.2 });
  }
  return (x, y) => {
    let best = 0, hh = 0, ao = 0;
    for (const q of rs) for (let s = 0; s <= 1.0001; s += 0.05) {
      const p0 = bez(q.a, q.c, q.b, s), d = Math.hypot(x - p0[0], y - p0[1]), rad = q.r * (1 - s * 0.75);
      if (d < rad * 2.2) ao = Math.max(ao, sm(rad * 2.2, rad, d) * 0.5 * (1 - s * 0.5));
      if (d < rad) { const h = Math.sqrt(1 - (d / rad) ** 2) * rad * 0.8 * (1 - s * 0.55); if (h > hh) { hh = h; best = s; } }
    }
    if (hh > 0) { const tex = fbm(x * 0.9, y * 0.3, seed + 5); return { c: mixC(COL.corteza, COL.cortezaClara, 0.25 + tex * 0.75), a: sm(1, 0.82, best), h: hh * 1.3, moja: 0 }; }
    if (ao > 0.02) return { c: COL.tierraOsc, a: ao, h: 0, moja: 0 };
    return null;
  };
}
const bez = (a: [number, number], c: [number, number], b: [number, number], t: number): [number, number] => [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]];

function piedras(n: number, rad: [number, number], esparcir: number, seed: number, grava = false): Decal {
  const ps = piedritas(n, rad, esparcir, seed);
  return (x, y) => {
    const [h, p, ao] = enPiedras(ps, x, y);
    const mancha = grava ? sm(1.0, 0.55, Math.hypot(x / esparcir, y / (esparcir * 0.8)) + (fbm(x * 0.2, y * 0.2, seed) - 0.5) * 0.5) : 0;
    if (p) {
      const seca = sm(0.15, 0.8, h / p.h);
      let c = mixC(COL.piedraOsc, COL.piedra, 0.35 + p.t * 0.4 + seca * 0.2);
      if (p.musgo && h / p.h > 0.6 && fbm(x * 1.4, y * 1.4, seed + 9) > 0.5) c = mixC(c, COL.musgo, 0.65);
      return { c, a: 1, h, moja: 0.15 };
    }
    if (ao > 0.02 || mancha > 0.02) return { c: COL.tierraOsc, a: Math.max(ao, mancha * 0.45), h: 0, moja: 0 };
    return null;
  };
}
function pisadas(seed: number): Decal {
  // un rastro de botas a lo largo de x: izquierda y derecha alternadas, cada una con su taco
  const ps: { x: number; y: number; g: number }[] = [];
  for (let i = 0; i < 7; i++) ps.push({ x: -27 + i * 9 + (hash3(i, seed, 1) - 0.5) * 1.5, y: (i % 2 ? 2.6 : -2.6) + (hash3(i, seed, 2) - 0.5) * 1.2, g: (hash3(i, seed, 3) - 0.5) * 0.25 });
  return (x, y) => {
    for (const p of ps) {
      const dx = x - p.x, dy = y - p.y, c = Math.cos(p.g), s = Math.sin(p.g), u = dx * c + dy * s, v = -dx * s + dy * c;
      // suela (adelante) y taco (atrás)
      const suela = Math.hypot((u - 1.2) / 2.1, v / 1.25), taco = Math.hypot((u + 2.2) / 1.0, v / 1.05);
      const d = Math.min(suela, taco);
      if (d < 1.35) { const dentro = sm(1.0, 0.7, d); return { c: mixC(COL.barro, COL.barroMojado, dentro), a: sm(1.35, 0.95, d) * 0.9, h: -dentro * 0.6 + sm(1.35, 1.0, d) * 0.25, moja: dentro * 0.55 }; }
    }
    return null;
  };
}
function carreta(seed: number): Decal {
  // dos rodadas a lo largo de x, de 64 de largo, con barro mojado al fondo; las puntas se funden
  return (x, y) => {
    const serp = (vn(x * 0.04 + 3, 0.5, seed) - 0.5) * 3, fin = sm(32, 24, Math.abs(x));
    for (const y0 of [-11, 11]) {
      const d = Math.abs(y - y0 - serp) / (1.7 + (vn(x * 0.2, y0, seed + 2) - 0.5) * 0.6);
      if (d < 1.9) {
        const fondo = sm(1, 0.3, d), lomo = sm(1.9, 1.2, d) * (1 - fondo);
        return { c: mixC(COL.barro, COL.barroMojado, fondo), a: sm(1.9, 1.1, d) * fin * 0.95, h: -fondo * 0.9 + lomo * 0.45, moja: fondo * 0.75 * (vn(x * 0.15, y0, seed + 4) > 0.45 ? 1 : 0.4) };
      }
    }
    return null;
  };
}
function pasto(seed: number, esparcir: number): Decal {
  // matas de pasto seco sueltas (como las del suelo), en una mancha de borde irregular
  const ms: { x: number; y: number; R: number; s: number }[] = [];
  let k = 0; const r = () => hash3(k++, seed, 41);
  for (let i = 0; i < 13; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * esparcir; ms.push({ x: Math.cos(a) * d, y: Math.sin(a) * d * 0.8, R: 2.6 + r() * 2.8, s: r() * 1000 }); }
  return (x, y) => {
    let best = 0, tono = 0, alto = 0, ao = 0;
    for (const m of ms) {
      const dx0 = x - m.x, dy0 = y - m.y, d = Math.hypot(dx0, dy0); if (d > m.R * 1.6) continue;
      ao = Math.max(ao, sm(m.R * 1.6, m.R * 0.3, d) * 0.5);
      for (let b = 0; b < 12; b++) {
        const th = hash3(b, m.s, 1) * Math.PI * 2, L = m.R * (0.6 + hash3(b, m.s, 2) * 0.7), ex = Math.cos(th) * L + 0.45 * L, ey = Math.sin(th) * L + 0.45 * L;
        const t = cl((dx0 * ex + dy0 * ey) / (ex * ex + ey * ey)), dd = Math.hypot(ex * t - dx0, ey * t - dy0), an = 0.5 * (1 - t * 0.65);
        if (dd < an) { const w = (1 - dd / an) * (0.6 + 0.4 * t); if (w > best) { best = w; tono = hash3(b, m.s, 3); alto = 0.5 + t * 2.2; } }
      }
    }
    if (best > 0) return { c: mixC(tono < 0.6 ? COL.brizna : COL.briznaOsc, COL.briznaClara, sm(1.4, 2.7, alto) * 0.6), a: cl(best * 1.8), h: alto, moja: 0 };
    if (ao > 0.02) return { c: COL.tierraOsc, a: ao, h: 0, moja: 0 };
    return null;
  };
}
function ceniza(seed: number, rx: number, ry: number, fogata: boolean): Decal {
  const piedras6 = fogata ? Array.from({ length: 8 }, (_, i): Piedrita => { const a = (i / 8) * Math.PI * 2 + hash3(i, seed, 3) * 0.4, R = 7 + hash3(i, seed, 4) * 1.2; return { x: Math.cos(a) * R, y: Math.sin(a) * R * 0.9, rx: 1.7 + hash3(i, seed, 5) * 0.8, ry: 1.4 + hash3(i, seed, 6) * 0.6, g: a, h: 1.3 + hash3(i, seed, 7) * 0.8, t: hash3(i, seed, 8), musgo: false }; }) : [];
  return (x, y) => {
    if (fogata) {
      const [h, p, ao] = enPiedras(piedras6, x, y);
      if (p) { const ho = sm(0.2, 0.9, h / p.h); return { c: mixC(COL.hollin, COL.piedra, ho * 0.55), a: 1, h, moja: 0 }; }
      if (ao > 0.3) return { c: COL.tierraOsc, a: ao, h: 0, moja: 0 };
    }
    const u = x / rx, v = y / ry, d = Math.sqrt(u * u + v * v) + (fbm(x * 0.2, y * 0.2, seed) - 0.5) * 0.6;
    if (d > 1.2) return null;
    const n = fbm(x * 0.6, y * 0.6, seed + 1);
    let c = mixC(COL.ceniza, COL.cenizaClara, sm(0.45, 0.8, n));
    // carbones: trozos negros con alguna brasa ya muerta (marrón rojizo, sin brillo)
    const cb = vn(x * 0.9, y * 0.9, seed + 2);
    if (cb > 0.7 && d < 0.8) c = mixC(COL.carbon, COL.brasaVieja, sm(0.88, 0.95, cb) * 0.6);
    // hollín hacia el borde
    c = mixC(c, COL.hollin, sm(0.5, 1.05, d) * 0.7);
    return { c, a: sm(1.2, 0.75, d) * (fogata ? 1 : 0.85), h: cb > 0.7 ? 0.5 : n * 0.3, moja: 0 };
  };
}

// ------------------------------------------------------------------ catálogo de decals
export const CUADROS_CHARCO = 8;
interface DefDecal { r: [number, number]; d: (f: number) => Decal }
/** Cada decal con su medio tamaño en el mundo (x, y) y su función. Las variantes `_y` corren a lo largo de y. */
const DECALS: Record<string, DefDecal> = {
  charco_chico: { r: [10, 8], d: () => charco(5.5, 4.2, 1) },
  charco_mediano: { r: [16, 13], d: () => charco(9, 7, 2) },
  charco_largo: { r: [24, 12], d: () => charco(14, 5.5, 3) },
  raices_a: { r: [28, 24], d: () => raices(4) }, raices_b: { r: [28, 24], d: () => raices(9) },
  piedras_a: { r: [16, 13], d: () => piedras(6, [1.5, 4.2], 8, 11) }, piedras_b: { r: [18, 15], d: () => piedras(10, [1.1, 3.2], 10, 12) },
  grava: { r: [18, 15], d: () => piedras(46, [0.5, 1.4], 12, 13, true) },
  pisadas: { r: [32, 8], d: () => pisadas(21) },
  carreta: { r: [34, 16], d: () => carreta(22) },
  pasto_a: { r: [16, 13], d: () => pasto(31, 8) }, pasto_b: { r: [22, 17], d: () => pasto(32, 12) }, pasto_c: { r: [13, 11], d: () => pasto(33, 5) },
  ceniza_a: { r: [14, 12], d: () => ceniza(41, 10, 8, false) }, ceniza_b: { r: [20, 14], d: () => ceniza(42, 15, 9, false) },
  fogata_vieja: { r: [14, 13], d: () => ceniza(43, 6.5, 6, true) },
};
export const VARIANTES_DECAL = ['raices_a', 'raices_b', 'piedras_a', 'piedras_b', 'grava', 'pisadas', 'pisadas_y', 'carreta', 'carreta_y', 'pasto_a', 'pasto_b', 'pasto_c', 'ceniza_a', 'ceniza_b', 'fogata_vieja'];
export const VARIANTES_CHARCO = ['chico', 'mediano', 'largo', 'largo_y'];

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const cacheD = new Map<string, Render>();
/** Pinta un decal (variante de `par_decal`, o `charco_<v>` de `par_charco_suelo`) en el cuadro f. El ancla es su centro. */
export function pintarDecal(v: string, f = 0): Render {
  const k = `${v}|${f}`; const c0 = cacheD.get(k); if (c0) return c0;
  const ejeY = v.endsWith('_y'), base = ejeY ? v.slice(0, -2) : v, def = DECALS[base];
  if (!def) throw new Error(`No hay decal "${v}"`);
  const fn = def.d(f), [rx0, ry0] = def.r, rx = ejeY ? ry0 : rx0, ry = ejeY ? rx0 : ry0;
  // lienzo: la caja del rombo que cubre (x de -rx a rx, y de -ry a ry) más un margen arriba para lo que tiene alto
  const W = Math.ceil((rx + ry) * 1) * 2 + 4, H = Math.ceil((rx + ry) / 2) * 2 + 8, ax = W / 2, ay = Math.ceil((rx + ry) / 2) + 6;
  const img = createRaster(W, H), SS = 2;
  const muestra = (x: number, y: number) => (ejeY ? fn(y, -x, f) : fn(x, y, f));
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    let R = 0, G = 0, B = 0, A = 0;
    for (let q = 0; q < SS * SS; q++) {
      const sx = px - ax + ((q % SS) + 0.5) / SS, sy = py - ay + (Math.floor(q / SS) + 0.5) / SS;
      const x = (2 * sy + sx) / 2, y = (2 * sy - sx) / 2;
      if (Math.abs(x) > rx || Math.abs(y) > ry) continue;
      const m = muestra(x, y) as (Punto & { n?: [number, number] }) | null; if (!m || m.a <= 0.003) continue;
      const e = 0.4, mx = muestra(x + e, y), my = muestra(x, y + e);
      const n: V3 = [-((mx?.h ?? m.h) - m.h) / e + (m.n?.[0] ?? 0), -((my?.h ?? m.h) - m.h) / e + (m.n?.[1] ?? 0), 1], nl = Math.hypot(n[0], n[1], n[2]);
      n[0] /= nl; n[1] /= nl; n[2] /= nl;
      const dif = Math.max(0, n[0] * LUZ[0] + n[1] * LUZ[1] + n[2] * LUZ[2]);
      let c: C3 = m.moja >= 1 ? m.c : [m.c[0] * (0.5 + 0.62 * dif), m.c[1] * (0.5 + 0.62 * dif), m.c[2] * (0.5 + 0.62 * dif)];
      if (m.moja > 0.04) {
        const d = VISTA, k2 = 2 * (d[0] * n[0] + d[1] * n[1] + d[2] * n[2]), rv: V3 = [d[0] - k2 * n[0], d[1] - k2 * n[1], d[2] - k2 * n[2]];
        const F = cl((m.moja >= 1 ? 0.38 : 0.08) + 0.7 * Math.pow(1 - Math.max(0, n[0] * VIS[0] + n[1] * VIS[1] + n[2] * VIS[2]), 3)) * Math.min(1, m.moja);
        const cie = mixC(COL.cielo, COL.cieloAlto, Math.pow(cl(rv[2]), 0.55));
        c = mixC(c, cie, F);
        const sb = Math.pow(Math.max(0, rv[0] * SOL[0] + rv[1] * SOL[1] + rv[2] * SOL[2]), 10) * 0.3 * m.moja;
        c = [c[0] + COL.brillo[0] * sb, c[1] + COL.brillo[1] * sb, c[2] + COL.brillo[2] * sb];
      }
      R += c[0] * m.a; G += c[1] * m.a; B += c[2] * m.a; A += m.a;
    }
    if (A <= 0.004) continue;
    const o = (py * W + px) * 4, tr = (BAYER[(py & 3) * 4 + (px & 3)] - 0.5) * 2;
    img.data[o] = cl((R / A) * 255 + tr, 0, 255); img.data[o + 1] = cl((G / A) * 255 + tr, 0, 255); img.data[o + 2] = cl((B / A) * 255 + tr, 0, 255);
    img.data[o + 3] = Math.round(cl(A / (SS * SS)) * 255);
  }
  const r: Render = { img, ancla: [ax, ay] };
  cacheD.set(k, r);
  return r;
}

// ------------------------------------------------------------------ la regla de riego
export interface OpcRiego {
  /** Celdas de juego del mapa (16×16 unidades). */
  W: number; H: number;
  semilla: number;
  /** Qué hay en la celda: 'libre' (se puede regar), 'camino', 'agua' (orilla del agua: charcos y pisadas no), 'bloqueado' o 'fuera'. */
  tipo: (cx: number, cy: number) => 'libre' | 'camino' | 'agua' | 'bloqueado' | 'fuera';
  /** Fogatas y hogueras (celda), árboles (celda) y estado del suelo de Wang en la celda (0 seco, 1 tierra, 2 barro). */
  fuegos?: [number, number][];
  arboles?: [number, number][];
  estado?: (cx: number, cy: number) => number;
  /** Decals por cada 100 celdas libres (6 por defecto). */
  densidad?: number;
}
export interface Riego { id: 'par_decal' | 'par_charco_suelo'; v: string; cx: number; cy: number }
/**
 * Dónde van los decals, sin patrones. Primero lo que va con un ancla: ceniza y pisadas alrededor de cada fuego (y a
 * veces los restos de una fogata vieja más lejos), raíces al pie de los árboles. Después el riego: una rejilla de 4×4
 * celdas con un punto corrido al azar en cada una (ruido azul barato), una densidad que sube y baja con un ruido
 * grande del mundo (claros y rincones cargados) y que pesa más en la tierra pisada y el barro que en el pasto; el
 * decal se elige por el lugar: rodadas, pisadas y charcos en el camino (a lo largo del camino), charcos y pisadas en
 * el barro, piedras, grava, pasto y pisadas en la tierra, piedras y grava en el pasto. Cada clase guarda su distancia
 * con las de su clase (dos charcos nunca pegados). Misma semilla, mismo resultado.
 */
export function regarDecalsParamo(o: OpcRiego): Riego[] {
  const out: Riego[] = [], dens = (o.densidad ?? 7) / 100, S = o.semilla;
  const r = (i: number, j: number, k: number) => hash3(i, j, S * 31 + k);
  const lejos: Record<string, number> = { charco: 7, raices: 3, ceniza: 3, fogata: 12, pisadas: 5, carreta: 9, piedras: 4, grava: 5, pasto: 4 };
  const puesto: { cx: number; cy: number; clase: string }[] = [];
  const libre = (cx: number, cy: number) => { if (cx < 1 || cy < 1 || cx >= o.W - 1 || cy >= o.H - 1) return false; const t = o.tipo(cx, cy); return t !== 'bloqueado' && t !== 'fuera'; };
  const poner = (id: Riego['id'], v: string, cx: number, cy: number, clase: string) => {
    if (!libre(cx, cy) || puesto.some((q) => q.clase === clase && Math.hypot(q.cx - cx, q.cy - cy) < lejos[clase])) return false;
    puesto.push({ cx, cy, clase }); out.push({ id, v, cx, cy }); return true;
  };
  // 1) lo que va con un ancla: ceniza y pisadas alrededor de cada fuego, raíces al pie de cada árbol
  (o.fuegos ?? []).forEach(([fx, fy], i) => {
    for (let k = 0; k < 6; k++) {
      const a = r(i, k, 1) * Math.PI * 2, d = 2 + r(i, k, 2) * 2.2;
      const cx = Math.round(fx + Math.cos(a) * d), cy = Math.round(fy + Math.sin(a) * d);
      if (k < 2) poner('par_decal', r(i, k, 3) < 0.5 ? 'ceniza_a' : 'ceniza_b', cx, cy, 'ceniza');
      else if (k < 4) poner('par_decal', 'pisadas' + (r(i, k, 4) < 0.5 ? '_y' : ''), cx, cy, 'pisadas');
    }
    // los restos de una fogata vieja, más lejos
    if (r(i, 9, 5) < 0.6) { const a = r(i, 9, 6) * Math.PI * 2, d = 6 + r(i, 9, 7) * 4; poner('par_decal', 'fogata_vieja', Math.round(fx + Math.cos(a) * d), Math.round(fy + Math.sin(a) * d), 'fogata'); }
  });
  // el decal de raíces tiene el tronco a (-12, -6) unidades de su centro: va una celda a +x del árbol
  (o.arboles ?? []).forEach(([ax, ay], i) => { if (r(i, 0, 11) < 0.65) poner('par_decal', r(i, 0, 12) < 0.5 ? 'raices_a' : 'raices_b', ax + 1, ay, 'raices'); });
  // 2) el riego: rejilla de 4×4 con un punto corrido al azar (ruido azul barato) y una densidad que sube y baja
  const G = 4;
  for (let gy = 0; gy * G < o.H; gy++) for (let gx = 0; gx * G < o.W; gx++) {
    const q = vn(gx / 3, gy / 3, S + 7) * 0.7 + vn(gx / 1.5, gy / 1.5, S + 8) * 0.3;
    for (let k = 0; k < 2; k++) {
      const cx = Math.floor(gx * G + r(gx, gy, 20 + k) * G), cy = Math.floor(gy * G + r(gx, gy, 30 + k) * G);
      if (!libre(cx, cy)) continue;
      const t = o.tipo(cx, cy), est = o.estado?.(cx, cy) ?? 1;
      // más en la tierra pisada y el barro (donde se vive y se camina), menos en el pasto
      const kd = t === 'camino' ? 1.6 : est === 0 ? 0.55 : 1.35;
      if (r(gx, gy, 10 + k) > dens * G * G * sm(0.2, 0.75, q) * 1.6 * kd - k * 0.6) continue;
      const u = r(gx, gy, 40 + k);
      let clase: string;
      if (t === 'camino') clase = u < 0.45 ? 'carreta' : u < 0.8 ? 'pisadas' : 'charco';
      else if (t === 'agua') clase = u < 0.6 ? 'piedras' : 'pasto';
      else if (est === 2) clase = u < 0.5 ? 'charco' : u < 0.8 ? 'pisadas' : 'piedras';
      else if (est === 1) clase = u < 0.25 ? 'piedras' : u < 0.42 ? 'grava' : u < 0.66 ? 'pasto' : u < 0.86 ? 'pisadas' : 'charco';
      else clase = u < 0.45 ? 'piedras' : u < 0.75 ? 'grava' : 'charco';
      // a lo largo del camino: si el camino sigue en y y no en x
      const enY = o.tipo(cx, cy - 2) === 'camino' && o.tipo(cx, cy + 2) === 'camino' && !(o.tipo(cx - 2, cy) === 'camino' && o.tipo(cx + 2, cy) === 'camino');
      const w = r(gx, gy, 50 + k), y2 = enY || (t !== 'camino' && w < 0.5) ? '_y' : '';
      if (clase === 'charco') poner('par_charco_suelo', w < 0.45 ? 'chico' : w < 0.8 ? 'mediano' : 'largo' + y2, cx, cy, clase);
      else if (clase === 'pisadas') poner('par_decal', 'pisadas' + y2, cx, cy, clase);
      else if (clase === 'carreta') poner('par_decal', 'carreta' + y2, cx, cy, clase);
      else if (clase === 'piedras') poner('par_decal', w < 0.5 ? 'piedras_a' : 'piedras_b', cx, cy, clase);
      else if (clase === 'grava') poner('par_decal', 'grava', cx, cy, clase);
      else poner('par_decal', w < 0.4 ? 'pasto_a' : w < 0.75 ? 'pasto_b' : 'pasto_c', cx, cy, clase);
    }
  }
  return out;
}
