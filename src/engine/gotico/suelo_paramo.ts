import { createRaster, type Raster } from '../core/raster';
import { LUZ, VISTA, hash3, type V3 } from './render';

/**
 * Suelo del páramo y del campamento (acto 1) en baldosas de Wang por esquinas.
 *
 * Cada esquina de la grilla de baldosas (en el mundo) lleva un estado: 0 pasto seco ralo, 1 tierra apisonada,
 * 2 barro húmedo. Una baldosa se pinta con sus cuatro esquinas: es la variante `c00 + 3·c10 + 9·c01 + 27·c11`
 * (81 en total), donde c00 es la esquina (0,0) de la baldosa (la de arriba en pantalla), c10 la de x=80 (derecha),
 * c01 la de y=80 (izquierda) y c11 la de abajo. Lo que se ve en un borde depende solo de las dos esquinas de ese
 * borde y de ruido que se repite cada 80, así dos baldosas vecinas siempre pegan, y como las esquinas salen de un
 * ruido del mundo (`pisosParamo`), las manchas de barro, tierra y pasto cruzan las baldosas sin repetirse.
 * El grano de adentro es fino (matas de pasto de 3 a 7 unidades, grava, hojarasca), sin manchas grandes que delaten el
 * período de 80: la variación grande la dan las esquinas y los decals (ver `regarDecalsParamo`).
 */

export const PISO_PARAMO = 'par_suelo';
export const ESTADOS_PARAMO = ['seco', 'tierra', 'barro'] as const;
export const VARIANTES_PARAMO = 81;
export const varianteParamo = (c00: number, c10: number, c01: number, c11: number) => c00 + 3 * c10 + 9 * c01 + 27 * c11;
export const esquinasDe = (v: number): [number, number, number, number] => [v % 3, Math.floor(v / 3) % 3, Math.floor(v / 9) % 3, Math.floor(v / 27) % 3];

const P = 80;
const cl = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const sm = (a: number, b: number, v: number) => { const t = cl((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
type C3 = [number, number, number];
const hex = (h: string): C3 => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const mixC = (a: C3, b: C3, t: number): C3 => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

/** Ruido de valor que se repite cada 80 en x e y (`c` celdas por baldosa). */
function nper(x: number, y: number, c: number, s: number): number {
  const a = (x / P) * c, b = (y / P) * c, ai = Math.floor(a), bi = Math.floor(b), fa = a - ai, fb = b - bi;
  const u = fa * fa * (3 - 2 * fa), v = fb * fb * (3 - 2 * fb), m = (q: number) => ((q % c) + c) % c;
  const h = (i: number, j: number) => hash3(m(i), m(j), s);
  return (h(ai, bi) * (1 - u) + h(ai + 1, bi) * u) * (1 - v) + (h(ai, bi + 1) * (1 - u) + h(ai + 1, bi + 1) * u) * v;
}
const fb2 = (x: number, y: number, c: number, s: number) => nper(x, y, c, s) * 0.65 + nper(x, y, c * 2, s + 1) * 0.35;
/** Hash de una celda de la rejilla periódica (n celdas por baldosa). */
const hc = (i: number, j: number, n: number, s: number) => hash3(((i % n) + n) % n, ((j % n) + n) % n, s);

// ------------------------------------------------------------------ paleta (tonos tierra apagados)
const COL = {
  // tres valores separados: pasto seco claro (ocre y paja), tierra pisada media, barro oscuro; verde apagado en lo húmedo
  tierra: hex('#3c2e20'), tierraOsc: hex('#291f16'), grava: hex('#6c6558'), gravaOsc: hex('#38322a'),
  // pasto seco de páramo frío: oliva grisáceo y pardo de brezo, no paja amarilla; las briznas apenas sobre su base
  secoBase: hex('#454030'), secoOsc: hex('#393328'), paja: hex('#54503b'), pajaClara: hex('#5d5741'),
  brizna: hex('#5a553f'), briznaOsc: hex('#4c3e33'), briznaVerde: hex('#4d5237'), briznaClara: hex('#6e664d'),
  tierraFria: hex('#3b3630'), charco: hex('#1a222b'),
  barro: hex('#1f170f'), barroOsc: hex('#0f0b07'), cielo: hex('#7d8890'), cieloAlto: hex('#3a444c'),
  musgo: hex('#2e3b1a'), musgoClaro: hex('#4a5b2b'), pastoHumedo: hex('#5a6636'),
};
const VIS: V3 = [-VISTA[0], -VISTA[1], -VISTA[2]];

// ------------------------------------------------------------------ texturas de cada estado (color y alto)
interface Muestra { c: C3; h: number; moja: number }
/** Grava: piedritas en celdas de 2 unidades (40 por baldosa). Devuelve el alto y el tono si cae en una. */
function grava(x: number, y: number, dens: number, s: number): [number, number] {
  const n = 40, cs = P / n, i0 = Math.floor(x / cs), j0 = Math.floor(y / cs);
  let h = 0, t = 0;
  for (let j = j0 - 1; j <= j0 + 1; j++) for (let i = i0 - 1; i <= i0 + 1; i++) {
    const r = hc(i, j, n, s); if (r > dens) continue;
    const px = (i + 0.2 + hc(i, j, n, s + 1) * 0.6) * cs, py = (j + 0.2 + hc(i, j, n, s + 2) * 0.6) * cs, rad = 0.35 + hc(i, j, n, s + 3) * 0.55;
    const d = Math.hypot(x - px, y - py) / rad; if (d >= 1) continue;
    const hh = Math.sqrt(1 - d * d) * rad * 0.9; if (hh > h) { h = hh; t = hc(i, j, n, s + 4); }
  }
  return [h, t];
}
/**
 * Matas de pasto seco: centros en celdas de 5 unidades (16 por baldosa), cada mata con 7 a 15 briznas que salen del
 * centro y se tumban hacia +x+y (el viento). Devuelve [cuánto la cubre, tono, alto, sombra al pie].
 */
function matas(x: number, y: number, dens: number): [number, number, number, number] {
  const n = 16, cs = P / n, i0 = Math.floor(x / cs), j0 = Math.floor(y / cs);
  let best = 0, tono = 0, alto = 0, ao = 0;
  for (let j = j0 - 1; j <= j0 + 1; j++) for (let i = i0 - 1; i <= i0 + 1; i++) {
    if (hc(i, j, n, 300) > dens) continue;
    const cx = (i + 0.2 + hc(i, j, n, 301) * 0.6) * cs, cy = (j + 0.2 + hc(i, j, n, 302) * 0.6) * cs, R = 1.5 + hc(i, j, n, 303) * 2.3;
    const dx0 = x - cx, dy0 = y - cy, d = Math.hypot(dx0, dy0);
    if (d > R * 1.5) continue;
    ao = Math.max(ao, sm(R * 1.5, R * 0.3, d) * 0.55);
    const nb = 7 + Math.floor(hc(i, j, n, 304) * 9);
    for (let k = 0; k < nb; k++) {
      const s = 310 + k * 3, th = hc(i, j, n, s) * Math.PI * 2, L = R * (0.6 + hc(i, j, n, s + 1) * 0.7);
      // el viento tumba la punta hacia +x+y
      const ex = Math.cos(th) * L + 0.9 * L * 0.5, ey = Math.sin(th) * L + 0.9 * L * 0.5;
      const t = cl((dx0 * ex + dy0 * ey) / (ex * ex + ey * ey)), qx = ex * t - dx0, qy = ey * t - dy0, dd = Math.hypot(qx, qy);
      const ancho = 0.5 * (1 - t * 0.65);
      if (dd < ancho) { const w = (1 - dd / ancho) * (0.6 + 0.4 * t); if (w > best) { best = w; tono = hc(i, j, n, s + 2); alto = 0.5 + t * 2.4; } }
    }
  }
  return [best, tono, alto, ao];
}
/**
 * Colchón de paja: briznas muertas tumbadas por el viento (hacia +x+y, ±25°), en celdas de 2,5 unidades (32 por baldosa).
 * Cubre casi toda la tierra del pasto seco, así la mancha se lee clara como masa y no como granito suelto.
 */
function colchon(x: number, y: number, dens: number): [number, number] {
  const n = 32, cs = P / n, i0 = Math.floor(x / cs), j0 = Math.floor(y / cs);
  let best = 0, tono = 0;
  for (let j = j0 - 1; j <= j0 + 1; j++) for (let i = i0 - 1; i <= i0 + 1; i++) for (let k = 0; k < 2; k++) {
    const s = 500 + k * 7;
    if (hc(i, j, n, s) > dens) continue;
    const cx = (i + hc(i, j, n, s + 1)) * cs, cy = (j + hc(i, j, n, s + 2)) * cs;
    const th = Math.PI / 4 + (hc(i, j, n, s + 3) - 0.5) * 0.9, L = 2 + hc(i, j, n, s + 4) * 2.4;
    const ex = Math.cos(th) * L, ey = Math.sin(th) * L, dx0 = x - cx + ex * 0.5, dy0 = y - cy + ey * 0.5;
    const t = cl((dx0 * ex + dy0 * ey) / (L * L)), dd = Math.hypot(ex * t - dx0, ey * t - dy0);
    if (dd < 0.42) { const w = 1 - dd / 0.42; if (w > best) { best = w; tono = hc(i, j, n, s + 5); } }
  }
  return [best, tono];
}
function seco(x: number, y: number, dens: number): Muestra {
  const n = fb2(x, y, 10, 11), m = nper(x, y, 40, 13);
  // la tierra seca entre la paja (ocre oscuro)
  let c = mixC(COL.secoOsc, COL.secoBase, 0.3 + n * 0.55 + (m - 0.5) * 0.3);
  let h = n * 0.6;
  const [pj, pt] = colchon(x, y, 0.35 + 0.6 * dens);
  if (pj > 0) { c = mixC(c, mixC(COL.paja, COL.pajaClara, pt * 0.8), cl(pj * 1.5) * 0.85); h += pj * 0.35; }
  // hojarasca: briznas cortas caídas, más oscuras, en la tierra entre matas
  const ho = nper(x * 1.0 + y * 0.35, y * 1.0 - x * 0.35, 80, 14);
  if (ho > 0.74) c = mixC(c, COL.briznaOsc, sm(0.74, 0.86, ho) * 0.5);
  const [g, gt] = grava(x, y, 0.05, 21); if (g > 0) { c = mixC(COL.gravaOsc, COL.grava, 0.3 + gt * 0.4); h += g; }
  const [b, bt, ba, ao] = matas(x, y, dens * (0.55 + 0.45 * nper(x, y, 8, 12)));
  c = [c[0] * (1 - ao * 0.45), c[1] * (1 - ao * 0.45), c[2] * (1 - ao * 0.45)];
  if (b > 0) { const col = bt < 0.5 ? COL.brizna : bt < 0.76 ? COL.briznaOsc : COL.briznaVerde; c = mixC(c, mixC(col, COL.briznaClara, sm(1.4, 2.9, ba) * 0.65), cl(b * 1.6)); h += ba * cl(b * 2) * 0.55; }
  return { c, h, moja: 0 };
}
function tierra(x: number, y: number): Muestra {
  const n = fb2(x, y, 14, 31), m = nper(x, y, 40, 32), q = nper(x, y, 7, 37);
  let c = mixC(COL.tierraOsc, COL.tierra, 0.35 + n * 0.55 + (m - 0.5) * 0.3);
  // tierra pisada: algo más fría y lisa en manchas, más cálida y suelta en otras
  c = mixC(c, COL.tierraFria, sm(0.5, 0.8, q) * 0.35);
  let h = n * 0.9 + m * 0.25;
  const [g, gt] = grava(x, y, 0.08 + 0.14 * nper(x, y, 9, 38), 33); if (g > 0) { c = mixC(COL.gravaOsc, COL.grava, 0.25 + gt * 0.6); h += g; }
  return { c, h, moja: 0 };
}
function barro(x: number, y: number): Muestra {
  const n = fb2(x, y, 12, 41), m = nper(x, y, 32, 42);
  const h = n * 1.4 + m * 0.3;
  let c = mixC(COL.barroOsc, COL.barro, 0.35 + n * 0.65);
  const [g, gt] = grava(x, y, 0.05, 43);
  if (g > 0) return { c: mixC(COL.gravaOsc, COL.grava, 0.15 + gt * 0.35), h: h + g, moja: 0.6 };
  // lo bajo junta agua: charquitos planos que reflejan el cielo, con el borde más oscuro
  const ch = sm(0.36, 0.28, n + (m - 0.5) * 0.08), borde = sm(0.44, 0.36, n) * (1 - ch);
  c = mixC(c, COL.barroOsc, borde * 0.5);
  if (ch > 0) return { c: mixC(c, COL.charco, ch), h: ch > 0.5 ? 0.35 : h, moja: 0.6 + ch * 0.4 };
  return { c, h, moja: 0.55 };
}

// ------------------------------------------------------------------ una baldosa de Wang
function pesos(x: number, y: number, esq: [number, number, number, number]): [number, number, number, number] {
  const u = x / P, v = y / P, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
  const a = 0.5, uu = mix(u, su, a), vv = mix(v, sv, a);
  const w = [(1 - uu) * (1 - vv), uu * (1 - vv), (1 - uu) * vv, uu * vv];
  const S = [0, 0, 0];
  for (let i = 0; i < 4; i++) S[esq[i]] += w[i];
  // cada estado empuja su borde con su propio ruido (el mismo en todas las baldosas: pega en los bordes)
  for (let k = 0; k < 3; k++) S[k] += (fb2(x, y, 4, 51 + k) - 0.5) * 1.1 + (nper(x, y, 16, 61 + k) - 0.5) * 0.3;
  // cuánto barro hay cerca, sin ruido ni filo (de las esquinas): para el halo húmedo y verde alrededor del barro
  let sb = 0; for (let i = 0; i < 4; i++) if (esq[i] === 2) sb += w[i];
  const e = S.map((q) => Math.exp(q * 16)), t = e[0] + e[1] + e[2];
  return [e[0] / t, e[1] / t, e[2] / t, sb];
}
function muestra(x: number, y: number, esq: [number, number, number, number]): Muestra {
  const W = pesos(x, y, esq);
  let c: C3 = [0, 0, 0], h = 0, moja = 0;
  const add = (m: Muestra, w: number) => { c = [c[0] + m.c[0] * w, c[1] + m.c[1] * w, c[2] + m.c[2] * w]; h += m.h * w; moja += m.moja * w; };
  // el pasto se ralea al acercarse a otro estado (no se funde: las briznas desaparecen)
  if (W[0] > 0.01) add(seco(x, y, sm(0.15, 0.85, W[0]) * 0.9), W[0]);
  if (W[1] > 0.01) add(tierra(x, y), W[1]);
  if (W[2] > 0.01) add(barro(x, y), W[2]);
  // la tierra y el pasto se oscurecen al lado del barro (humedad que sube)
  if (W[2] > 0.02 && W[2] < 0.98) { const k = 1 - 0.25 * sm(0, 0.6, W[2]) * (1 - W[2]); c = [c[0] * k, c[1] * k, c[2] * k]; }
  // halo húmedo: alrededor del barro el pasto y la tierra se ponen verdes (musgo y pasto mojado), en manchas
  const hum = sm(0.06, 0.4, W[3]) * (1 - sm(0.35, 0.8, W[2])) * sm(0.3, 0.6, fb2(x, y, 8, 71) + W[3] * 0.25);
  if (hum > 0.01) {
    // el verde guarda el dibujo de abajo: lo claro (matas, paja) pasa a pasto mojado, lo oscuro a musgo
    const lum = c[0] * 0.3 + c[1] * 0.6 + c[2] * 0.1, mm = nper(x, y, 40, 72);
    const v = mixC(mixC(COL.musgo, COL.musgoClaro, sm(0.3, 0.75, mm)), COL.pastoHumedo, sm(0.2, 0.45, lum));
    c = mixC(c, v, hum * 0.85); moja += hum * 0.2;
  }
  return { c, h, moja };
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const cache = new Map<number, Raster>();
/** Pinta la variante v (0..80) del suelo del páramo: rombo de 160×80 como las baldosas de `pisos.ts`. */
export function pintarSueloParamo(v: number): Raster {
  const vv = ((v % VARIANTES_PARAMO) + VARIANTES_PARAMO) % VARIANTES_PARAMO;
  let r = cache.get(vv);
  if (r) return r;
  const esq = esquinasDe(vv), img = createRaster(160, 80), SS = 2;
  for (let py = 0; py < 80; py++) for (let px = 0; px < 160; px++) {
    const sxc = px - 80 + 0.5, syc = py - 40 + 0.5;
    if (Math.abs(sxc) / 80 + Math.abs(syc) / 40 > 1.0001) continue;
    let R = 0, G = 0, B = 0;
    for (let q = 0; q < SS * SS; q++) {
      const sx = px - 80 + ((q % SS) + 0.5) / SS, sy = py - 40 + (Math.floor(q / SS) + 0.5) / SS;
      const x = cl((2 * sy + sx) / 2 + 40, 0, P), y = cl((2 * sy - sx) / 2 + 40, 0, P);
      const m = muestra(x, y, esq), e = 0.5, mx = muestra(Math.min(P, x + e), y, esq).h, my = muestra(x, Math.min(P, y + e), esq).h;
      const n: V3 = [-(mx - m.h) / e * 0.9, -(my - m.h) / e * 0.9, 1], nl = Math.hypot(n[0], n[1], n[2]);
      n[0] /= nl; n[1] /= nl; n[2] /= nl;
      const dif = Math.max(0, n[0] * LUZ[0] + n[1] * LUZ[1] + n[2] * LUZ[2]);
      const luz = 0.56 + 0.68 * dif;
      let c: C3 = [m.c[0] * luz, m.c[1] * luz, m.c[2] * luz];
      if (m.moja > 0.05) {
        // lo mojado refleja el cielo frío en las caras que lo miran (fresnel), y brilla un hilo hacia la luz
        const d = VISTA, k2 = 2 * (d[0] * n[0] + d[1] * n[1] + d[2] * n[2]), rv: V3 = [d[0] - k2 * n[0], d[1] - k2 * n[1], d[2] - k2 * n[2]];
        const F = (0.08 + 0.6 * Math.pow(1 - Math.max(0, n[0] * VIS[0] + n[1] * VIS[1] + n[2] * VIS[2]), 3)) * m.moja;
        c = mixC(c, mixC(COL.cielo, COL.cieloAlto, cl(rv[2])), cl(F));
      }
      R += c[0]; G += c[1]; B += c[2];
    }
    const o = (py * 160 + px) * 4, tr = (BAYER[(py & 3) * 4 + (px & 3)] - 0.5) * 2.2, n2 = SS * SS;
    img.data[o] = cl((R / n2) * 255 + tr, 0, 255); img.data[o + 1] = cl((G / n2) * 255 + tr, 0, 255); img.data[o + 2] = cl((B / n2) * 255 + tr, 0, 255); img.data[o + 3] = 255;
  }
  cache.set(vv, img);
  return img;
}

// ------------------------------------------------------------------ cómo elige el juego las variantes
const ESTADO_DE: Record<string, number> = { pasto_seco: 0, pasto: 0, tierra: 1, camino: 1, par_suelo: -1, barro: 2 };
/** Ruido suave del mundo (en baldosas) para las manchas. */
function nm(x: number, y: number, s: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const h = (i: number, j: number) => hash3(i, j, s);
  return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v;
}
/**
 * Estado de cada esquina de la grilla de baldosas (tw+1 × th+1): el que más pesa entre las 4 baldosas que la tocan
 * (según su piso lógico: pasto_seco/pasto → seco, tierra/camino → tierra, barro → barro), y un ruido del mundo que
 * agrega manchas: claros de tierra en el pasto, barro en la tierra (más cerca de `humedos`, como el agua o la
 * fogata). `semilla` cambia las manchas; el mismo mapa con la misma semilla da siempre lo mismo.
 */
export function esquinasParamo(tw: number, th: number, logico: (bx: number, by: number) => string | null | undefined, semilla: number,
  o: { humedos?: [number, number][]; barro?: number; claros?: number } = {}): Int8Array {
  const E = new Int8Array((tw + 1) * (th + 1));
  for (let j = 0; j <= th; j++) for (let i = 0; i <= tw; i++) {
    const cuenta = [0, 0, 0];
    for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) { const id = logico(i + dx, j + dy); const e = id ? ESTADO_DE[id] : undefined; if (e !== undefined && e >= 0) cuenta[e]++; }
    let e = cuenta[1] > cuenta[0] && cuenta[1] >= cuenta[2] ? 1 : cuenta[2] > cuenta[0] && cuenta[2] > cuenta[1] ? 2 : cuenta[0] || (!cuenta[1] && !cuenta[2]) ? 0 : 1;
    // empate entre pasto y tierra: el ruido decide (borde que serpentea en vez de seguir la grilla)
    if (cuenta[0] && cuenta[1] && cuenta[0] === cuenta[1]) e = nm(i * 0.9, j * 0.9, semilla + 5) < 0.5 ? 0 : 1;
    const a = nm(i / 2.6, j / 2.6, semilla + 1) * 0.65 + nm(i / 1.3, j / 1.3, semilla + 2) * 0.35;
    const b = nm(i / 2.2, j / 2.2, semilla + 3) * 0.6 + nm(i / 1.1, j / 1.1, semilla + 4) * 0.4;
    const humedad = (o.humedos ?? []).reduce((m, [hx, hy]) => Math.max(m, 1 - Math.hypot(i - hx, j - hy) / 3.5), 0);
    if (e === 0 && a > 1 - (o.claros ?? 0.34)) e = 1;
    // el barro va en manchas (no tapa el centro del campamento): la humedad empuja poco
    if (e === 1 && b + humedad * 0.15 > 1 - (o.barro ?? 0.3)) e = 2;
    E[j * (tw + 1) + i] = e;
  }
  return E;
}
/**
 * Pisos de una zona del páramo: cambia cada baldosa de pasto seco, pasto, tierra o camino por `par_suelo` con la
 * variante que sale de sus cuatro esquinas. Lo demás (empedrado, lajas, agua) queda como está.
 *
 *   const nuevos = pisosParamo(z.tw, z.th, (bx, by) => z.pisos[by * z.tw + bx]?.id, z.semilla);
 *   nuevos.forEach((p, i) => { if (p) z.pisos[i] = p; });
 */
export function pisosParamo(tw: number, th: number, logico: (bx: number, by: number) => string | null | undefined, semilla: number,
  o: Parameters<typeof esquinasParamo>[4] = {}): ({ id: string; v: number } | null)[] {
  const fuera = (bx: number, by: number) => (bx < 0 || by < 0 || bx >= tw || by >= th ? null : logico(bx, by));
  const E = esquinasParamo(tw, th, fuera, semilla, o);
  const out: ({ id: string; v: number } | null)[] = [];
  for (let by = 0; by < th; by++) for (let bx = 0; bx < tw; bx++) {
    const id = logico(bx, by);
    if (!id || ESTADO_DE[id] === undefined) { out.push(null); continue; }
    const e = (i: number, j: number) => E[j * (tw + 1) + i];
    out.push({ id: PISO_PARAMO, v: varianteParamo(e(bx, by), e(bx + 1, by), e(bx, by + 1), e(bx + 1, by + 1)) });
  }
  return out;
}

/** El estado que domina en un punto de una baldosa (u, w de 0 a 1 en x e y): para elegir decals (charcos en el barro). */
export function estadoEn(v: number, u: number, w: number): number {
  const e = esquinasDe(v), p = [(1 - u) * (1 - w), u * (1 - w), (1 - u) * w, u * w], S = [0, 0, 0];
  for (let i = 0; i < 4; i++) S[e[i]] += p[i];
  return S[2] >= S[0] && S[2] >= S[1] ? 2 : S[1] >= S[0] ? 1 : 0;
}
