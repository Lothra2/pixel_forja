/**
 * Tablero de poderes: cada fila un tipo de efecto, columnas = cuadros, un elemento por bloque.
 *   npx tsx scripts/poderes-board.ts <salida.png> [elementos] [tipos] [celda]
 */
import { writeFileSync } from 'node:fs';
import { encodePng, createRaster, blit, fill, upscaleNearest, renderFx, FX_ELEMENTS, FX_KINDS, type FxElement, type FxKind, type CellSize } from '../src/engine/index.ts';

const [, , out, elArg, kindArg, cellArg] = process.argv;
const els = (elArg ? elArg.split(',') : FX_ELEMENTS) as FxElement[];
const kinds = (kindArg ? kindArg.split(',') : FX_KINDS) as FxKind[];
const cell = (Number(cellArg) || 48) as CellSize;
const k = 2, maxF = 10;
const sheet = createRaster(maxF * cell * k, els.length * kinds.length * cell * k);
fill(sheet, [34, 30, 48, 255]);
let row = 0;
for (const element of els)
  for (const kind of kinds) {
    const c = renderFx({ kind, element, cell });
    c.frames.forEach((fr, i) => blit(sheet, upscaleNearest(fr, k), i * cell * k, row * cell * k));
    row++;
  }
writeFileSync(out, encodePng(sheet));
console.log(els.join(','), kinds.join(','));
