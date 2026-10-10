/** Depura el modo busto: npx tsx scripts/debug-portrait.ts private/foto.png out.png */
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng, makeWorkImage, analyzePortrait, createRaster, ZONES } from '../src/engine/index.ts';
const [, , img, out] = process.argv;
const work = makeWorkImage(decodePng(readFileSync(img)));
const t0 = Date.now();
const { zones, mask, info } = analyzePortrait(work);
console.log(Date.now() - t0, 'ms', JSON.stringify(info), JSON.stringify(zones.head));
const C: Record<string, number[]> = { hair: [140, 80, 30], skin: [255, 200, 160], face: [255, 0, 255], top: [50, 90, 255], accessory: [255, 230, 0], beard: [0, 200, 120] };
const { w, h } = work.raster;
const r = createRaster(w, h);
for (let i = 0; i < w * h; i++) {
  const src = work.raster.data.subarray(i * 4, i * 4 + 3);
  const c = mask[i] ? C[ZONES[zones.zone[i]]] ?? [255, 0, 0] : null;
  const k = c ? 0.6 : 0;
  r.data.set([src[0] * (1 - k) + (c?.[0] ?? 0) * k, src[1] * (1 - k) + (c?.[1] ?? 0) * k, src[2] * (1 - k) + (c?.[2] ?? 0) * k, 255], i * 4);
}
const { box, eyes } = zones.head;
for (let x = box.x; x < box.x + box.w; x++) for (const y of [box.y, box.y + box.h]) r.data.set([255, 0, 0, 255], (Math.round(y) * w + Math.round(x)) * 4);
for (let y = box.y; y < box.y + box.h; y++) for (const x of [box.x, box.x + box.w]) r.data.set([255, 0, 0, 255], (Math.round(y) * w + Math.round(x)) * 4);
for (const e of eyes) for (let d = -5; d <= 5; d++) { r.data.set([0, 255, 0, 255], (Math.round(e.y) * w + Math.round(e.x + d)) * 4); r.data.set([0, 255, 0, 255], (Math.round(e.y + d) * w + Math.round(e.x)) * 4); }
writeFileSync(out, encodePng(r));
