import { createRaster, type Raster } from '../core/raster';

/**
 * Agua sobre un cuadro ya recortado: todo lo que queda bajo la superficie se tiñe de azul y se transparenta, la
 * línea de la superficie lleva espuma donde el cuerpo la corta y una estela clara a los lados, y las manos o los
 * pies que entran o salen del agua levantan gotas. Así el nadador se lee igual sobre cualquier piscina del juego.
 */

type RGB = [number, number, number];
const WATER: RGB = [46, 132, 214];
const FOAM: RGB = [236, 248, 255];
const LIGHT: RGB = [150, 210, 245];

const hash = (a: number, b: number) => { let h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

export interface WaterOptions {
  /** fila de la superficie en la celda */
  row: number;
  /** puntos (manos, pies) que cruzan la superficie en este cuadro: ahí salen gotas */
  splashes?: [number, number][];
  /** número de cuadro (para que las gotas y la estela cambien de un cuadro a otro sin azar) */
  frame?: number;
  /** salpicadura grande (entrada del clavado) */
  big?: boolean;
}

export function applyWater(src: Raster, o: WaterOptions): Raster {
  const { w, h } = src;
  const out = createRaster(w, h);
  out.data.set(src.data);
  const row = Math.round(o.row), f = o.frame ?? 0;
  const at = (x: number, y: number) => (y * w + x) * 4;
  const put = (x: number, y: number, c: RGB, a = 255) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    out.data.set([c[0], c[1], c[2], a], at(x, y));
  };
  // 1. bajo el agua: color mezclado con el azul y medio transparente (más hondo, más azul)
  let x0 = w, x1 = -1;
  for (let y = Math.max(0, row + 1); y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = at(x, y);
      if (!src.data[i + 3]) continue;
      const depth = Math.min(1, (y - row) / 10);
      const k = 0.45 + depth * 0.25;
      for (let c = 0; c < 3; c++) out.data[i + c] = Math.round(src.data[i + c] * (1 - k) + WATER[c] * k);
      out.data[i + 3] = Math.round(235 - depth * 70);
    }
  // dónde corta el cuerpo la superficie
  for (let x = 0; x < w; x++) {
    let hit = false;
    for (let y = row - 1; y <= row + 1; y++) if (y >= 0 && y < h && src.data[at(x, y) + 3]) hit = true;
    if (hit) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
  }
  if (x1 < 0) return out;
  // 2. espuma: la fila de la superficie donde hay cuerpo, y un pixel más a cada lado
  for (let x = x0 - 1; x <= x1 + 1; x++) {
    if (x < 0 || x >= w || row < 0 || row >= h) continue;
    const has = src.data[at(x, row) + 3] || src.data[at(x, Math.min(h - 1, row + 1)) + 3];
    if (has || x === x0 - 1 || x === x1 + 1) put(x, row, hash(x, f) > 0.35 ? FOAM : LIGHT);
  }
  // 3. estela: rayitas claras a los lados que se mueven cuadro a cuadro
  for (let s = 1; s <= 5; s++) {
    const gap = (s + f) % 3 === 0;
    if (!gap) { put(x0 - 1 - s, row, LIGHT, 200 - s * 25); put(x1 + 1 + s, row, LIGHT, 200 - s * 25); }
  }
  // 4. gotas donde una mano o un pie cruza la superficie
  for (const [sx, sy] of o.splashes ?? []) {
    const n = o.big ? 9 : 4;
    for (let k = 0; k < n; k++) {
      const dx = Math.round((hash(k, f * 7 + sx) - 0.5) * (o.big ? 12 : 6));
      const dy = 1 + Math.round(hash(k + 11, f * 5 + sy) * (o.big ? 7 : 3));
      put(Math.round(sx) + dx, row - dy, k % 3 === 0 ? LIGHT : FOAM);
    }
    put(Math.round(sx) - 1, row, FOAM); put(Math.round(sx) + 1, row, FOAM);
  }
  return out;
}
