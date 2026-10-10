/**
 * Tablero para escoger el estilo de cara: el mismo personaje con cada estilo de cabeza,
 * de frente, de lado, caminando y a tamaño real.
 *   npx tsx scripts/estilos.ts <imagen.png> <salida.png> [estilos]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  decodePng, encodePng, buildFicha, renderClip, createRaster, blit, fill, upscaleNearest, type Raster,
} from '../src/engine/index.ts';
import { HEAD_STYLES } from '../src/engine/head3d/render.ts';

const [, , img, out, stylesArg] = process.argv;
const styles = (stylesArg ?? Object.keys(HEAD_STYLES).join(',')).split(',');
const src = decodePng(readFileSync(img));
const BG: [number, number, number, number] = [196, 226, 160, 255];
const onBg = (r: Raster) => { const o = createRaster(r.w, r.h); fill(o, BG); blit(o, r, 0, 0); return o; };
const DIG: Record<string, string[]> = {
  '1': ['.#.', '##.', '.#.', '.#.', '###'], '2': ['###', '..#', '###', '#..', '###'], '3': ['###', '..#', '.##', '..#', '###'],
  '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '###', '..#', '###'], '6': ['###', '#..', '###', '#.#', '###'],
};
function label(n: number): Raster {
  const r = createRaster(40, 56);
  fill(r, [255, 255, 255, 255]);
  DIG[String(n)].forEach((row, j) => [...row].forEach((c, i) => {
    if (c !== '#') return;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) r.data.set([40, 40, 60, 255], ((8 + j * 8 + y) * 40 + 8 + i * 8 + x) * 4);
  }));
  return r;
}
const rows: Raster[] = [];
let analysis;
for (const st of styles) {
  const { ficha, analysis: a } = buildFicha(src, { name: st, headStyle: st }, analysis);
  analysis = a;
  const tiles: Raster[] = [
    label(rows.length + 1),
    upscaleNearest(onBg(renderClip(ficha, 48, 'idle', 'front').frames[0]), 6),
    upscaleNearest(onBg(renderClip(ficha, 48, 'idle', 'side').frames[0]), 6),
    upscaleNearest(onBg(renderClip(ficha, 48, 'idle', 'back').frames[0]), 6),
  ];
  const walk = renderClip(ficha, 48, 'walk', 'side');
  const strip = createRaster(4 * 48 * 3 + 9, 48 * 3);
  fill(strip, [255, 255, 255, 255]);
  [0, 2, 4, 6].forEach((f, i) => blit(strip, upscaleNearest(onBg(walk.frames[f]), 3), i * (48 * 3 + 3), 0));
  const shot = renderClip(ficha, 48, 'celebrate', 'front');
  const strip2 = createRaster(4 * 48 * 3 + 9, 48 * 3);
  fill(strip2, [255, 255, 255, 255]);
  [0, 1, 2, 3].forEach((f, i) => blit(strip2, upscaleNearest(onBg(shot.frames[f]), 3), i * (48 * 3 + 3), 0));
  const real = createRaster(48 * 3 + 20, 48);
  fill(real, [255, 255, 255, 255]);
  blit(real, onBg(renderClip(ficha, 48, 'idle', 'front').frames[0]), 0, 0);
  blit(real, onBg(renderClip(ficha, 48, 'idle', 'side').frames[0]), 58, 0);
  blit(real, onBg(renderClip(ficha, 32, 'idle', 'side').frames[0]), 116, 16);
  const right = createRaster(strip.w, strip.h * 2 + real.h + 12);
  fill(right, [255, 255, 255, 255]);
  blit(right, strip, 0, 0); blit(right, strip2, 0, strip.h + 6); blit(right, real, 0, strip.h * 2 + 12);
  tiles.push(right);
  const W = tiles.reduce((s, t) => s + t.w + 10, 0), H = Math.max(...tiles.map((t) => t.h));
  const row = createRaster(W, H);
  fill(row, [255, 255, 255, 255]);
  let x = 0;
  for (const t of tiles) { blit(row, t, x, 0); x += t.w + 10; }
  rows.push(row);
}
const W = Math.max(...rows.map((r) => r.w)), H = rows.reduce((s, r) => s + r.h + 16, 0);
const sheet = createRaster(W, H);
fill(sheet, [255, 255, 255, 255]);
let y = 0;
for (const r of rows) { blit(sheet, r, 0, y); y += r.h + 16; }
writeFileSync(out, encodePng(sheet));
console.log('listo', out);
