import { createRaster, type Raster } from '../core/raster';

/**
 * El Ciclo 2 en la interfaz (encargo F13, parte 4).
 *
 * - `marco_ciclo` (36 x 24, nueve [8, 8, 8, 8]): un marco chico dorado para el número de ciclo en el HUD, como los
 *   otros marcos (borde negro, biselado de oro, adentro piedra oscura) con un espiral en cada esquina de arriba.
 * - `logo_ciclo`: el logo del título en oro (también ABYSS, que en el de siempre es plata y violeta), con un espiral
 *   dorado que gira detrás y chispas. Mismo tamaño, cuadros y fps que `ui.logo`, para cambiar uno por el otro.
 */

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const ORO = ['#fff2b0', '#ffd25a', '#e8a828', '#c47a18', '#8a4a10'].map(hex);
const PIEDRA = ['#1c1820', '#221d26', '#28222c'].map(hex);

function hash(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const put = (r: Raster, x: number, y: number, c: RGB, a = 255) => {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= r.w || y >= r.h) return;
  r.data.set([c[0], c[1], c[2], a], (y * r.w + x) * 4);
};

export const MARCO_CICLO = { w: 36, h: 24, nueve: [8, 8, 8, 8] as [number, number, number, number] };

export function marcoCiclo(): Raster {
  const { w, h } = MARCO_CICLO, b = 4;
  const r = createRaster(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const e = Math.min(x, y, w - 1 - x, h - 1 - y);
    if ((x < 1 || x > w - 2) && (y < 1 || y > h - 2)) continue;
    let c: RGB;
    if (e === 0) c = hex('#120a06');
    else if (e < b) {
      // biselado de oro: claro arriba y a la izquierda, hondo abajo y a la derecha
      const lit = (y < b || x < b) && !(y > h - 1 - b || x > w - 1 - b);
      c = e === b - 1 ? hex('#3a2208') : lit ? ORO[e === 1 ? 0 : 1] : ORO[e === 1 ? 3 : 2];
    } else c = PIEDRA[hash(x >> 1, y >> 1, 3) < 0.5 ? 0 : hash(x, y, 4) < 0.7 ? 1 : 2];
    put(r, x, y, c);
  }
  // un espiral chiquito en cada esquina de arriba (adentro de la parte que no se estira)
  for (const cx of [3.5, w - 4.5]) {
    for (let t = 0; t <= 1; t += 0.05) {
      const a = t * Math.PI * 3, rr = 2.6 - t * 2.2;
      put(r, cx + Math.cos(a) * rr, 3.5 + Math.sin(a) * rr, ORO[t < 0.5 ? 0 : 1]);
    }
  }
  // brillo arriba del borde
  for (let x = 6; x < w - 6; x += 7) put(r, x, 1, hex('#ffffff'));
  return r;
}

/**
 * El logo dorado: toma los cuadros del logo de siempre, pasa ABYSS (y su halo violeta) a oro y pone detrás un espiral
 * de dos brazos que da una vuelta en los 8 cuadros.
 */
export function logoCiclo(logo: Raster[]): Raster[] {
  return logo.map((src, f) => {
    const W = src.w, H = src.h;
    const r = createRaster(W, H);
    // el espiral detrás: dos brazos, gira un octavo por cuadro (en 8 cuadros vuelve igual)
    const cx = W / 2, cy = H / 2 + 4, giro = (f / 8) * Math.PI * 2;
    for (let brazo = 0; brazo < 2; brazo++) for (let t = 0; t <= 1; t += 0.002) {
      const a = t * Math.PI * 4 + giro + brazo * Math.PI, rr = 4 + t * 52;
      const x = cx + Math.cos(a) * rr * 2.3, y = cy + Math.sin(a) * rr * 0.8;
      const al = Math.round(60 + 110 * (1 - t));
      put(r, x, y, ORO[1], al); put(r, x + 1, y, ORO[2], al);
    }
    // el logo encima, con ABYSS pasado a oro según su luz
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, a = src.data[i + 3];
      if (!a) continue;
      let c: RGB = [src.data[i], src.data[i + 1], src.data[i + 2]];
      const azul = c[2] > c[0] + 8;
      if (azul) {
        const l = (c[0] + c[1] + c[2]) / 765;
        if (a < 255) c = hex('#ffc860'); // el halo que respira
        else if (l < 0.12) c = hex('#1a0e08'); // el contorno
        else c = ORO[Math.max(0, Math.min(4, Math.round((1 - l) * 5.2 - 0.6)))];
      }
      const o = (y * W + x) * 4;
      const t = a / 255, ba = r.data[o + 3] / 255;
      const outA = t + ba * (1 - t);
      for (let q = 0; q < 3; q++) r.data[o + q] = Math.round((c[q] * t + r.data[o + q] * ba * (1 - t)) / Math.max(1e-6, outA));
      r.data[o + 3] = Math.round(outA * 255);
    }
    // chispas que titilan
    for (let k = 0; k < 10; k++) if (hash(k, f, 9) > 0.45) {
      const x = hash(k, 1, 8) * W, y = hash(k, 2, 8) * H;
      put(r, x, y, hex('#ffffff')); put(r, x + 1, y, ORO[0], 200); put(r, x - 1, y, ORO[0], 200); put(r, x, y + 1, ORO[0], 200); put(r, x, y - 1, ORO[0], 200);
    }
    return r;
  });
}
