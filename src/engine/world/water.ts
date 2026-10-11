import { createRaster, type Raster } from '../core/raster';
import { distTo } from './paint';
import { TILE } from './tiles';
import type { BigMap } from './bosqueMap';

/**
 * El agua premium (encargo 2.7):
 *
 * - **Espuma de orilla** (`orilla_espuma`): 4 cuadros a 5 fps. En vez de un autotile de 16 bordes rectos, cada cuadro
 *   de agua que toca la orilla trae su propia pieza, pintada sobre la orilla real (que es orgánica). Las piezas van en
 *   un atlas de 32 columnas, con los 4 cuadros uno debajo del otro, y el mapa trae la capa `espuma` (por cuadro:
 *   0 nada, n = pieza n - 1 del atlas). Se dibuja encima del suelo.
 * - **Reflejo**: capa `reflejo` (por cuadro: 1 = agua quieta donde se ve el reflejo de la heroína y de los árboles de
 *   la orilla). Los lagos y el pozo sí; los ríos que corren, no.
 */

export const ESPUMA = { cuadros: 4, fps: 5, columnas: 32 };

export interface WaterExtras {
  /** atlas de piezas: `columnas` de ancho, cada cuadro de la animación debajo del anterior */
  atlas: Raster;
  filas: number;
  /** por cuadro del mapa: 0 nada, n = pieza n - 1 */
  espuma: Uint16Array;
  /** por cuadro del mapa: 1 = agua quieta con reflejo */
  reflejo: Uint8Array;
  piezas: number;
}

const cache = new WeakMap<BigMap, WaterExtras>();

export function waterExtras(m: BigMap): WaterExtras {
  const hit = cache.get(m);
  if (hit) return hit;
  const t = m.terrain, W = t.img.w, H = t.img.h;
  const land = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) land[i] = t.kind[i] === 4 ? 0 : 1;
  const dLand = distTo(land, W, H);
  const espuma = new Uint16Array(m.w * m.h);
  const pieces: { tx: number; ty: number }[] = [];
  for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) {
    if (!t.waterTiles[ty * m.w + tx]) continue;
    let near = false;
    for (let y = ty * TILE; y < ty * TILE + TILE && !near; y++) for (let x = tx * TILE; x < tx * TILE + TILE; x++) { const i = y * W + x; if (t.kind[i] === 4 && dLand[i] <= 5) { near = true; break; } }
    if (!near) continue;
    pieces.push({ tx, ty });
    espuma[ty * m.w + tx] = pieces.length;
  }
  const C = ESPUMA.columnas, filas = Math.max(1, Math.ceil(pieces.length / C));
  if (filas * TILE * ESPUMA.cuadros > 4096) throw new Error(`espuma: ${pieces.length} piezas no entran en un atlas de 4096`);
  const atlas = createRaster(C * TILE, filas * TILE * ESPUMA.cuadros);
  const put = (x: number, y: number, rgb: [number, number, number], a: number) => { const k = (y * atlas.w + x) * 4; atlas.data[k] = rgb[0]; atlas.data[k + 1] = rgb[1]; atlas.data[k + 2] = rgb[2]; atlas.data[k + 3] = a; };
  pieces.forEach((p, n) => {
    const ax = (n % C) * TILE, ay = Math.floor(n / C) * TILE;
    for (let f = 0; f < ESPUMA.cuadros; f++) for (let ly = 0; ly < TILE; ly++) for (let lx = 0; lx < TILE; lx++) {
      const x = p.tx * TILE + lx, y = p.ty * TILE + ly, i = y * W + x;
      if (t.kind[i] !== 4) continue;
      const d = dLand[i];
      // la ola que lame la orilla: avanza y se retira (4 cuadros), con un borde que no es recto
      const wave = (Math.sin(x * 0.31 + y * 0.23 + (f * Math.PI) / 2) + 1) * 0.9 + (Math.sin(x * 0.09 - y * 0.13 + f * 1.1) + 1) * 0.4;
      const Y = ay + f * filas * TILE + ly, X = ax + lx;
      if (d <= 1 + wave) put(X, Y, [226, 240, 242], d <= 1 ? 220 : 170);
      else if (d <= 2.5 + wave && ((x + y + f) % 3 === 0)) put(X, Y, [180, 214, 222], 120);
      // brillitos sueltos un poco más afuera
      else if (d >= 3 && d <= 5 && ((x * 7 + y * 13 + f * 5) % 41) === 0) put(X, Y, [210, 232, 238], 150);
    }
  });
  const reflejo = new Uint8Array(m.w * m.h);
  if (m.quieta) for (let k = 0; k < reflejo.length; k++) reflejo[k] = t.waterTiles[k] && m.quieta[k] ? 1 : 0;
  const out = { atlas, filas, espuma, reflejo, piezas: pieces.length };
  cache.set(m, out);
  return out;
}

/** La espuma de un cuadro de la animación sobre una imagen del mapa entero (para las postales y la vista). */
export function drawFoam(dst: Raster, m: BigMap, frame = 0) {
  const x = waterExtras(m), f = frame % ESPUMA.cuadros;
  for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) {
    const n = x.espuma[ty * m.w + tx];
    if (!n) continue;
    const ax = ((n - 1) % ESPUMA.columnas) * TILE, ay = Math.floor((n - 1) / ESPUMA.columnas) * TILE + f * x.filas * TILE;
    for (let ly = 0; ly < TILE; ly++) for (let lx = 0; lx < TILE; lx++) {
      const s = ((ay + ly) * x.atlas.w + ax + lx) * 4, a = x.atlas.data[s + 3] / 255;
      if (!a) continue;
      const d = ((ty * TILE + ly) * dst.w + tx * TILE + lx) * 4;
      for (let c = 0; c < 3; c++) dst.data[d + c] = dst.data[d + c] * (1 - a) + x.atlas.data[s + c] * a;
    }
  }
}
