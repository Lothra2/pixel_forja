/**
 * Hoja de revisión: todas las animaciones de un personaje, una por fila, ampliadas.
 *   npx tsx scripts/review.ts samples/gabo.png out/review_gabo.png [48] [side|front|back|left] [pack]
 * La entrada también puede ser una receta de avatar en JSON: { name, avatar, outfit, colors }.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  decodePng, encodePng, buildFicha, renderClip, runQA, createRaster, blit, fill, upscaleNearest, HUMAN_ANIMS, fichaFromAvatar, recolor,
  type CellSize, type ViewName, type Raster, type HumanFicha, type ColorSlot,
} from '../src/engine/index.ts';

const [, , img, out, sizeArg, viewArg, packArg] = process.argv;
const cell = (Number(sizeArg) || 48) as CellSize;
const view = (viewArg || 'side') as ViewName;
let ficha: HumanFicha;
if (img.endsWith('.json')) {
  const spec = JSON.parse(readFileSync(img, 'utf8'));
  ficha = fichaFromAvatar(spec.name ?? 'x', spec.avatar, spec.outfit);
  for (const [slot, hex] of Object.entries(spec.colors ?? {})) ficha = recolor(ficha, slot as ColorSlot, hex as string) as HumanFicha;
  if (spec.gear) ficha = { ...ficha, gear: spec.gear } as typeof ficha;
} else ficha = buildFicha(decodePng(readFileSync(img)), { name: 'x', sizes: [cell] }).ficha as HumanFicha;
const anims = HUMAN_ANIMS.filter((a) => !packArg || packArg.split(',').includes(a.pack));
const k = cell === 32 ? 4 : cell === 48 ? 3 : 2;
const maxF = 12;
const rows: Raster[] = [];
const bad: string[] = [];
for (const a of anims) {
  const c = renderClip(ficha, cell, a.name, view);
  const qa = runQA(ficha, c);
  if (!qa.ok) bad.push(`${a.name}: ${qa.items.filter((i) => i.severity === 'error').map((i) => `${i.check} ${i.value} ${i.where ?? ''}`).join('; ')}`);
  const row = createRaster(maxF * (cell * k + 2), cell * k + 2);
  fill(row, qa.ok ? [255, 255, 255, 255] : [255, 200, 200, 255]);
  c.frames.slice(0, maxF).forEach((f, i) => {
    const bg = createRaster(cell, cell);
    fill(bg, [196, 226, 160, 255]);
    blit(bg, f, 0, 0);
    blit(row, upscaleNearest(bg, k), i * (cell * k + 2), 1);
  });
  rows.push(row);
}
const W = rows[0].w;
const sheet = createRaster(W, rows.reduce((s, r) => s + r.h, 0));
let y = 0;
for (const r of rows) { blit(sheet, r, 0, y); y += r.h; }
writeFileSync(out, encodePng(sheet));
console.log(anims.map((a, i) => `${i}:${a.name}`).join(' '));
console.log(bad.length ? 'QA FALLA:\n' + bad.join('\n') : 'QA ok');
