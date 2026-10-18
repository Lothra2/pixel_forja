import { createRaster, type Raster } from '../core/raster';

/**
 * Los efectos de la heroína celestial (encargo F13, parte 3). Luz dorada y blanca, pintada pixel a pixel con
 * transparencia suave en los bordes (el juego los dibuja en modo normal, no aditivo).
 *
 * - `lanza_luz` (32 x 32, 6 cuadros en bucle): un tramo del haz horizontal, hacia la derecha. Pega de lado a lado: el
 *   juego lo repite en línea y lo gira hacia donde va la lanza. La punta es `impacto_luz` donde pega.
 * - `impacto_luz` (48 x 48, 8 cuadros): estallido de luz con rayos y un anillo.
 * - `estela_alas` (32 x 32, 6 cuadros): plumas de luz que caen y se apagan, para dejar detrás del vuelo.
 * - `aura_celestial` (64 x 64, 8 cuadros en bucle): el brillo al pie, una elipse de luz con chispas que suben.
 */

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const BLANCO = hex('#ffffff'), CREMA = hex('#fff6d0'), ORO = hex('#ffd45a'), ORO_HONDO = hex('#e8a030');

function hash(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** pinta encima con alfa (se queda con el más opaco si ya había algo) */
function put(r: Raster, x: number, y: number, c: RGB, a: number) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= r.w || y >= r.h || a <= 0) return;
  const o = (y * r.w + x) * 4;
  const A = Math.min(255, Math.round(a));
  const prev = r.data[o + 3];
  if (!prev) { r.data[o] = c[0]; r.data[o + 1] = c[1]; r.data[o + 2] = c[2]; r.data[o + 3] = A; return; }
  // mezcla: lo nuevo encima de lo que había
  const t = A / 255;
  for (let k = 0; k < 3; k++) r.data[o + k] = Math.round(r.data[o + k] * (1 - t) + c[k] * t);
  r.data[o + 3] = Math.max(prev, A);
}
/** color de la luz según la intensidad (0 a 1): oro hondo en el borde, blanco en el centro */
function luz(k: number): RGB {
  if (k > 0.85) return BLANCO;
  if (k > 0.6) return CREMA;
  if (k > 0.35) return ORO;
  return ORO_HONDO;
}
/** cuantiza el alfa a pocos tonos (pixel art, no degradé liso) */
const qa = (a: number) => Math.round(Math.max(0, Math.min(1, a)) * 4) / 4 * 255;

/** Un tramo del haz de la lanza, de 32 x 32: pega de lado a lado (todo se repite cada 32 px y cada 6 cuadros). */
export function lanzaLuz(): Raster[] {
  const S = 32, out: Raster[] = [];
  for (let f = 0; f < 6; f++) {
    const r = createRaster(S, S);
    const ph = (f / 6) * Math.PI * 2;
    for (let x = 0; x < S; x++) {
      const u = (x / S) * Math.PI * 2;
      // el grosor late con ondas que pegan en 32 y en 6 cuadros
      const w = 3.2 + 0.9 * Math.sin(u * 2 - ph) + 0.5 * Math.sin(u * 3 + ph * 2);
      for (let y = 0; y < S; y++) {
        const d = Math.abs(y - 15.5);
        if (d < w * 0.35) put(r, x, y, BLANCO, 255);
        else if (d < w * 0.7) put(r, x, y, CREMA, 255);
        else if (d < w) put(r, x, y, ORO, 230);
        else if (d < w + 3) put(r, x, y, ORO, qa((1 - (d - w) / 3) * 0.55) );
      }
    }
    // chispas que corren por el haz (pegan en 32: se mueven 32 px en los 6 cuadros, de a 16 en dos tandas)
    for (let i = 0; i < 6; i++) {
      const x = (Math.floor(hash(i, 1, 7) * S) + f * 16) % S, y = 15.5 + (hash(i, 2, 7) - 0.5) * 14;
      put(r, x, y, BLANCO, 255); put(r, (x + S - 1) % S, y, CREMA, 170);
    }
    out.push(r);
  }
  return out;
}

/** Estallido de luz de 48 x 48 en 8 cuadros: un destello, rayos que salen, un anillo que se abre y se apaga. */
export function impactoLuz(): Raster[] {
  const S = 48, C = 23.5, out: Raster[] = [];
  for (let f = 0; f < 8; f++) {
    const r = createRaster(S, S);
    const t = f / 7;
    const fuerza = f < 2 ? 1 : 1 - (t - 0.14) / 0.86;
    // el anillo
    const R = 4 + t * 19;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const d = Math.hypot(x - C, y - C);
      const g = Math.abs(d - R);
      if (g < 1.6) put(r, x, y, luz(0.65 + fuerza * 0.3), qa(fuerza * (1 - g / 1.6) * 1.2));
      // el núcleo: grande al principio, se achica
      const core = (1 - t) * 9;
      if (d < core) put(r, x, y, luz(1 - d / core), qa((1 - d / core) * 1.4));
    }
    // ocho rayos que salen y se cortan
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + 0.2, largo = k % 2 ? 10 : 16;
      const r0 = 3 + t * 12, r1 = r0 + largo * (1 - t * 0.6);
      for (let s = r0; s < r1; s += 0.5) {
        const u = (s - r0) / (r1 - r0);
        put(r, C + Math.cos(a) * s, C + Math.sin(a) * s, luz(1 - u), qa(fuerza * (1 - u * 0.7)));
      }
    }
    // chispas
    for (let i = 0; i < 10; i++) {
      const a = hash(i, 1, 11) * Math.PI * 2, d = 6 + t * (14 + hash(i, 2, 11) * 8);
      if (hash(i, f, 12) > 0.3) put(r, C + Math.cos(a) * d, C + Math.sin(a) * d - t * 4, BLANCO, qa(fuerza + 0.2));
    }
    out.push(r);
  }
  return out;
}

/** Una pluma de luz chiquita: cañón dorado y barbas blancas, girada. */
function pluma(r: Raster, x: number, y: number, ang: number, largo: number, alfa: number) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  for (let s = 0; s <= largo; s += 0.5) {
    const u = s / largo;
    const w = Math.sin(u * Math.PI) * 1.6;
    const px = x + ca * s, py = y + sa * s;
    for (let d = -w; d <= w; d += 0.5) put(r, px - sa * d, py + ca * d, Math.abs(d) < 0.5 ? ORO : u > 0.6 ? BLANCO : CREMA, qa(alfa));
  }
}

/** Plumas de luz que caen balanceándose y se apagan (32 x 32, 6 cuadros). */
export function estelaAlas(): Raster[] {
  const S = 32, out: Raster[] = [];
  const plumas = Array.from({ length: 4 }, (_, i) => ({ x: 6 + hash(i, 1, 21) * 20, y: 3 + hash(i, 2, 21) * 8, a: hash(i, 3, 21) * 6, l: 5 + hash(i, 4, 21) * 3 }));
  for (let f = 0; f < 6; f++) {
    const r = createRaster(S, S);
    const t = f / 5;
    for (const [i, p] of plumas.entries()) {
      const vaiven = Math.sin(t * Math.PI * 2 + i) * 3;
      pluma(r, p.x + vaiven, p.y + t * 14, p.a + Math.sin(t * Math.PI * 2 + i) * 0.6, p.l, 1 - t * 0.85);
    }
    // destellos que se apagan
    for (let i = 0; i < 5; i++) if (hash(i, f, 22) > 0.4) put(r, hash(i, 1, 23) * S, hash(i, 2, 23) * S * 0.8 + t * 6, BLANCO, qa(1 - t));
    out.push(r);
  }
  return out;
}

/** El brillo al pie de la heroína celestial (64 x 64, 8 cuadros en bucle): elipse de luz que respira y chispas que suben. */
export function auraCelestial(): Raster[] {
  const S = 64, out: Raster[] = [];
  for (let f = 0; f < 8; f++) {
    const r = createRaster(S, S);
    const ph = (f / 8) * Math.PI * 2;
    const cx = 31.5, cy = 50;
    const RX = 20 + Math.sin(ph) * 1.5, RY = 7 + Math.sin(ph) * 0.6;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const d = Math.hypot((x - cx) / RX, (y - cy) / RY);
      if (d < 1) {
        // relleno suave con el borde marcado: un anillo de luz en el piso
        const borde = Math.abs(d - 0.86) < 0.1;
        put(r, x, y, borde ? CREMA : d < 0.5 ? CREMA : ORO, qa(borde ? 0.9 : 0.2 + (1 - d) * 0.5));
      }
    }
    // chispas que suben en un ciclo (cada una con su fase: el bucle cierra en 8 cuadros)
    for (let i = 0; i < 12; i++) {
      const fase = (hash(i, 1, 31) + f / 8) % 1;
      const a = hash(i, 2, 31) * Math.PI * 2;
      const x = cx + Math.cos(a) * RX * 0.85, y = cy + Math.sin(a) * RY * 0.85 - fase * 34;
      const al = Math.sin(fase * Math.PI);
      put(r, x, y, fase < 0.5 ? BLANCO : CREMA, qa(al));
      if (hash(i, 3, 31) > 0.6) put(r, x, y + 1, ORO, qa(al * 0.6));
    }
    out.push(r);
  }
  return out;
}
