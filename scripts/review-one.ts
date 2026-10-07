/** Varias animaciones ampliadas x6, para revisar de cerca. npx tsx scripts/review-one.ts img out.png 48 side walk,run */
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng, buildFicha, buildAnimalFicha, renderClip, createRaster, blit, fill, upscaleNearest, type CellSize, type ViewName, type Raster, type Ficha, type Species } from '../src/engine/index.ts';

const [, , img, out, sizeArg, viewArg, names, species] = process.argv;
const cell = (Number(sizeArg) || 48) as CellSize;
const src = decodePng(readFileSync(img));
const ficha: Ficha = species ? buildAnimalFicha(src, { name: 'x', species: species as Species }).ficha : buildFicha(src, { name: 'x', sizes: [cell] }).ficha;
const k = 6;
const rows: Raster[] = [];
for (const n of names.split(',')) {
  const c = renderClip(ficha, cell, n, viewArg as ViewName);
  const row = createRaster(Math.min(10, c.frames.length) * (cell * k + 4), cell * k + 4);
  fill(row, [255, 255, 255, 255]);
  c.frames.slice(0, 10).forEach((f, i) => {
    const bg = createRaster(cell, cell); fill(bg, [196, 226, 160, 255]); blit(bg, f, 0, 0);
    blit(row, upscaleNearest(bg, k), i * (cell * k + 4), 2);
  });
  rows.push(row);
}
const W = Math.max(...rows.map((r) => r.w));
const sheet = createRaster(W, rows.reduce((s, r) => s + r.h, 0));
fill(sheet, [255, 255, 255, 255]);
let y = 0;
for (const r of rows) { blit(sheet, r, 0, y); y += r.h; }
writeFileSync(out, encodePng(sheet));
