/**
 * Compara variantes de un personaje (cuerpo entero, de frente, en diagonal y de lado).
 *   npx tsx scripts/opciones.ts <salida.png> <variantes.json>
 * variantes.json: { base: { avatar, outfit, colors, gear }, variants: [{ label, lpc?, avatar?, outfit?, colors? }] }
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { encodePng, createRaster, blit, fill, upscaleNearest, renderClip, fichaFromAvatar, recolor, bodyProportions, DEFAULT_BODY, type HumanFicha, type ColorSlot } from '../src/engine/index.ts';

const [, , out, file] = process.argv;
const spec = JSON.parse(readFileSync(file, 'utf8'));
const views = ['front', 'se', 'side'] as const;
const k = 4, cell = 48;
const sheet = createRaster(spec.variants.length * views.length * cell * k + (spec.variants.length - 1) * 8, cell * k);
fill(sheet, [44, 38, 62, 255]);
spec.variants.forEach((v: Record<string, any>, i: number) => {
  const av = { ...spec.base.avatar, ...(v.avatar ?? {}), lpc: { ...spec.base.avatar.lpc, ...(v.lpc ?? {}) } };
  let f = fichaFromAvatar(v.label ?? 'x', av, { ...spec.base.outfit, ...(v.outfit ?? {}) }) as HumanFicha;
  if (av.body) f = { ...f, body: { ...f.body, proportions: bodyProportions(f.body.proportions.preset, { ...DEFAULT_BODY, ...av.body }) } };
  for (const [slot, hex] of Object.entries({ ...spec.base.colors, ...(v.colors ?? {}) })) f = recolor(f, slot as ColorSlot, hex as string) as HumanFicha;
  if (spec.base.gear || v.gear) f = { ...f, gear: { ...spec.base.gear, ...v.gear } };
  views.forEach((vw, j) => blit(sheet, upscaleNearest(renderClip(f, cell, 'idle', vw).frames[0], k), (i * views.length + j) * cell * k + i * 8, 0));
});
writeFileSync(out, encodePng(sheet));
console.log(spec.variants.map((v: { label: string }, i: number) => `${i}:${v.label}`).join('  '));
