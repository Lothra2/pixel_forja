/**
 * Tablero de objetos: todos los íconos, con casillero de rareza.
 *   npx tsx scripts/objetos-board.ts <salida.png> [zoom]
 */
import { writeFileSync } from 'node:fs';
import { encodePng, createRaster, blit, fill, upscaleNearest, renderItem, ITEM_KINDS, RARITIES, type ItemSpec, type GemColor } from '../src/engine/index.ts';

const [, , out, zArg] = process.argv;
const z = Number(zArg) || 3;
const specs: ItemSpec[] = [];
ITEM_KINDS.forEach((kind, i) => specs.push({ kind, rarity: RARITIES[i % RARITIES.length], frame: true, seed: i, size: kind.startsWith('potion') ? (['small', 'medium', 'large'] as const)[i % 3] : undefined }));
(['ruby', 'sapphire', 'emerald', 'topaz', 'amethyst', 'diamond'] as GemColor[]).forEach((gem, i) => specs.push({ kind: 'gem', gem, size: (['small', 'medium', 'large'] as const)[i % 3], frame: true }));
const cols = 10, S = 32 * z + 4;
const sheet = createRaster(cols * S, Math.ceil(specs.length / cols) * S);
fill(sheet, [16, 14, 22, 255]);
specs.forEach((s, i) => blit(sheet, upscaleNearest(renderItem(s), z), (i % cols) * S + 2, Math.floor(i / cols) * S + 2));
writeFileSync(out, encodePng(sheet));
console.log(specs.length, 'objetos');
