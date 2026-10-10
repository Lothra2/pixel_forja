/**
 * Tablero de cabezas de monstruo sobre un cuerpo: de frente, en diagonal y de lado.
 *   npx tsx scripts/enemigos-board.ts <salida.png> [ids,separados]
 */
import { writeFileSync } from 'node:fs';
import { encodePng, createRaster, blit, fill, upscaleNearest, renderClip, fichaFromAvatar, defaultAvatar, withLpc, LPC_MONSTERS, type Raster } from '../src/engine/index.ts';

const [, , out, idsArg] = process.argv;
const ids = idsArg ? idsArg.split(',') : LPC_MONSTERS;
const k = 3, cell = 48, views = ['front', 'se', 'side', 'back'] as const;
const sheet = createRaster(views.length * cell * k, ids.length * cell * k);
fill(sheet, [40, 34, 60, 255]);
ids.forEach((id, r) => {
  const av = withLpc(defaultAvatar(), 'lpcMonster', id);
  const f = fichaFromAvatar(id, { ...av, lpc: { ...av.lpc!, hair: null, brows: null } });
  views.forEach((v, c) => {
    const fr: Raster = renderClip(f, cell, 'idle', v).frames[0];
    blit(sheet, upscaleNearest(fr, k), c * cell * k, r * cell * k);
  });
});
writeFileSync(out, encodePng(sheet));
console.log(ids.join(' '));
