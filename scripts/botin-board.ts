/**
 * Tableros del botín para revisar a ojo.
 *   npx tsx scripts/botin-board.ts <salida.png> [legendarios|armas|armaduras|varios|mundo] [32|64] [zoom]
 */
import { writeFileSync } from 'node:fs';
import {
  encodePng, createRaster, blit, fill, upscaleNearest, renderLoot, UNIQUE_LOOT, allBases, allArmor, allMisc,
  CHEST_TIERS, chestFrames, coinFrames, PILE_SIZES, pileFrames, coinBurstFrames, dropFrames, beamFrames, type Raster,
} from '../src/engine/index.ts';

const [, , out, which = 'legendarios', pxArg = '64', zArg] = process.argv;
const px = (Number(pxArg) === 32 ? 32 : 64) as 32 | 64;
const z = Number(zArg) || (px === 32 ? 3 : 2);
let rows: Raster[][] = [];
if (which === 'mundo') {
  for (const t of CHEST_TIERS) rows.push(chestFrames(t, 48), chestFrames(t, 48, true));
  rows.push([...coinFrames(16), ...PILE_SIZES.map((s) => pileFrames(s)[0])]);
  rows.push(coinBurstFrames(48));
  rows.push([...dropFrames(UNIQUE_LOOT[0], 32), ...beamFrames('legendary').slice(0, 3)]);
} else {
  const items = which === 'armas' ? allBases() : which === 'armaduras' ? allArmor() : which === 'varios' ? allMisc() : UNIQUE_LOOT;
  const icons = items.map((it) => renderLoot(it, { px, slot: true, frame: 1 }));
  const cols = which === 'armaduras' ? 35 : 12;
  for (let i = 0; i < icons.length; i += cols) rows.push(icons.slice(i, i + cols));
}
const cw = Math.max(...rows.flat().map((r) => r.w)) * z + 4, ch = Math.max(...rows.flat().map((r) => r.h)) * z + 4;
const sheet = createRaster(Math.max(...rows.map((r) => r.length)) * cw, rows.length * ch);
fill(sheet, which === 'mundo' ? [44, 52, 40, 255] : [16, 14, 22, 255]);
rows.forEach((r, y) => r.forEach((fr, x) => blit(sheet, upscaleNearest(fr, z), x * cw + 2, y * ch + 2)));
writeFileSync(out, encodePng(sheet));
console.log(rows.flat().length, 'cuadros');
