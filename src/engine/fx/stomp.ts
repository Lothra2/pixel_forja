import { createRaster, type Raster } from '../core/raster';

/**
 * Onda del pisotón del minotauro: celda 96, 8 cuadros sin bucle. Grietas que se abren en el piso desde el centro,
 * un anillo de polvo aplastado 2:1 (está en el piso) que crece y se deshace, y piedritas que saltan.
 */

type RGB = [number, number, number];
const CRACK: RGB = [34, 22, 16], CRACK_HI: RGB = [120, 92, 64];
const DUST = [[86, 66, 48], [128, 102, 74], [168, 142, 108], [206, 186, 152]] as RGB[];

function hash(a: number, b: number) {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function stompWave(cell = 96): Raster[] {
  const out: Raster[] = [];
  const cx = cell / 2, cy = cell * 0.6;
  // 9 grietas con un zigzag fijo (las mismas en todos los cuadros, solo crecen)
  const cracks = Array.from({ length: 9 }, (_, k) => {
    const a = (k / 9) * Math.PI * 2 + hash(k, 1) * 0.4;
    const pts: [number, number][] = [[0, 0]];
    let x = 0, y = 0, ang = a;
    for (let s = 0; s < 14; s++) { ang += (hash(k, s + 5) - 0.5) * 0.7; x += Math.cos(ang) * 2.2; y += Math.sin(ang) * 1.1; pts.push([x, y]); }
    return pts;
  });
  for (let f = 0; f < 8; f++) {
    const r = createRaster(cell, cell);
    const t = f / 7;
    const put = (x: number, y: number, c: RGB, a = 255) => {
      const X = Math.round(x), Y = Math.round(y);
      if (X < 0 || Y < 0 || X >= cell || Y >= cell) return;
      const i = (Y * cell + X) * 4;
      if (a < 255 && r.data[i + 3] === 255) return;
      r.data.set([...c, a], i);
    };
    // grietas: crecen rápido y se van borrando al final
    const grow = Math.min(1, 0.35 + t * 1.6), fade = t > 0.7 ? Math.round(255 * (1 - (t - 0.7) / 0.3) + 40) : 255;
    for (const pts of cracks) {
      const n = Math.max(2, Math.round(pts.length * grow));
      for (let i = 1; i < n; i++) {
        // tramo continuo entre dos puntos del zigzag (borde claro arriba en la parte ancha)
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], steps = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2);
        for (let s = 0; s <= steps; s++) {
          const x = cx + x0 + ((x1 - x0) * s) / steps, y = cy + y0 + ((y1 - y0) * s) / steps;
          put(x, y, CRACK, fade);
          if (i < n * 0.5) put(x, y - 1, CRACK_HI, Math.min(fade, 200));
        }
      }
    }
    // golpe en el centro los primeros cuadros
    if (f < 3) for (let y = -4; y <= 4; y++) for (let x = -8; x <= 8; x++) if ((x / 8) ** 2 + (y / 4) ** 2 <= 1) put(cx + x, cy + y, DUST[3 - f], 230 - f * 40);
    // anillo de polvo: bolitas que crecen hacia afuera, más claras arriba (luz) y que se desvanecen
    const R = 8 + t * (cell * 0.42);
    const n = 28;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + hash(k, 9) * 0.2;
      const rr = R * (0.92 + hash(k, f) * 0.16), px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * 0.5 - t * 4;
      const size = Math.max(1, Math.round(3.4 * (1 - t * 0.6) + hash(k, 3) * 1.4));
      const alpha = Math.round(235 * (1 - t * 0.75));
      for (let y = -size; y <= size; y++) for (let x = -size; x <= size; x++) {
        if (x * x + y * y > size * size) continue;
        put(px + x, py + y * 0.8, DUST[y < 0 ? (x < 0 ? 3 : 2) : y > size / 2 ? 0 : 1], alpha);
      }
    }
    // piedritas que saltan y caen
    if (f >= 1 && f <= 6) for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + 0.4, d = 6 + t * cell * 0.3, lift = Math.sin(t * Math.PI) * 14 * (0.6 + hash(k, 2) * 0.6);
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.5 - lift;
      put(x, y, [92, 88, 96]); put(x + 1, y, [140, 136, 144]); put(x, y + 1, CRACK);
    }
    out.push(r);
  }
  return out;
}

/** Tierra cavada (celda 48, 6 cuadros sin bucle): terrones que saltan hacia atrás y un montoncito que crece. */
export function dirtDig(cell = 48): Raster[] {
  const out: Raster[] = [];
  const cx = cell / 2, cy = cell * 0.72;
  for (let f = 0; f < 6; f++) {
    const r = createRaster(cell, cell);
    const t = f / 5;
    const put = (x: number, y: number, c: RGB) => { const X = Math.round(x), Y = Math.round(y); if (X >= 0 && Y >= 0 && X < cell && Y < cell) r.data.set([...c, 255], (Y * cell + X) * 4); };
    // hoyo oscuro y montoncito de tierra al lado que crece
    for (let y = -2; y <= 2; y++) for (let x = -5; x <= 5; x++) if ((x / 5) ** 2 + (y / 2) ** 2 <= 1) put(cx + x, cy + y, CRACK);
    const mh = 1 + Math.round(t * 3);
    for (let y = 0; y < mh + 2; y++) for (let x = -6 + y; x <= 6 - y; x++) put(cx + 9 + x, cy + 1 - y, y === mh + 1 ? DUST[3] : y > mh / 2 ? DUST[2] : DUST[1]);
    // terrones que vuelan en arco hacia atrás y caen
    for (let k = 0; k < 6; k++) {
      const tt = Math.min(1, t * 1.4 + hash(k, 4) * 0.3), sp = 8 + hash(k, 5) * 10;
      const x = cx - 2 - tt * sp, y = cy - 2 - Math.sin(tt * Math.PI) * (6 + hash(k, 6) * 8);
      if (tt >= 1) continue;
      put(x, y, DUST[1]); put(x + 1, y, DUST[2]); put(x, y + 1, DUST[0]);
    }
    out.push(r);
  }
  return out;
}
