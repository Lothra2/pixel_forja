/**
 * Las 8 direcciones (isométrica) de una o varias animaciones, ampliadas, una dirección por fila.
 *   npx tsx scripts/ocho.ts <receta.json|imagen.png> <salida.png> [walk,attack] [48]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  decodePng, encodePng, buildFicha, fichaFromAvatar, recolor, renderClip, createRaster, blit, fill, upscaleNearest, EIGHT_VIEWS,
  type CellSize, type Raster, type Ficha, type ColorSlot,
} from '../src/engine/index.ts';

const [, , input, out, namesArg, sizeArg] = process.argv;
const cell = (Number(sizeArg) || 48) as CellSize;
let ficha: Ficha;
if (input.endsWith('.json')) {
  const spec = JSON.parse(readFileSync(input, 'utf8'));
  ficha = fichaFromAvatar(spec.name ?? 'x', spec.avatar, spec.outfit);
  for (const [slot, hex] of Object.entries(spec.colors ?? {})) ficha = recolor(ficha, slot as ColorSlot, hex as string);
  if (spec.gear) ficha = { ...ficha, gear: spec.gear } as typeof ficha;
} else ficha = buildFicha(decodePng(readFileSync(input)), { name: 'x', sizes: [cell] }).ficha;
const k = 4, maxF = 8;
const rows: Raster[] = [];
for (const name of (namesArg || 'walk').split(','))
  for (const v of EIGHT_VIEWS) {
    const c = renderClip(ficha, cell, name, v);
    const row = createRaster(maxF * (cell * k + 2), cell * k + 2);
    fill(row, [255, 255, 255, 255]);
    c.frames.slice(0, maxF).forEach((f, i) => {
      const bg = createRaster(cell, cell); fill(bg, [196, 226, 160, 255]); blit(bg, f, 0, 0);
      blit(row, upscaleNearest(bg, k), i * (cell * k + 2), 1);
    });
    rows.push(row);
  }
const sheet = createRaster(rows[0].w, rows.reduce((s, r) => s + r.h, 0));
let y = 0;
for (const r of rows) { blit(sheet, r, 0, y); y += r.h; }
writeFileSync(out, encodePng(sheet));
console.log(EIGHT_VIEWS.join(' '));
