/**
 * Catálogo visual del creador de avatar: cada opción de pelo, ojos, cejas, barba, lentes y nariz,
 * de frente, 3/4, de lado y de espalda.
 *   npx tsx scripts/avatar-board.ts <salida.png> [foto.png] [look]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng, analyzeImage, createRaster, hexToRgb, type Raster } from '../src/engine/index.ts';
import { measureHead } from '../src/engine/head3d/measure.ts';
import { renderHeadModel, HEAD_STYLES, type ModelHeadImage } from '../src/engine/head3d/render.ts';
import {
  defaultAvatar, fitAvatar, modelFromAvatar, withHairStyle, HAIR_STYLE_IDS, EYE_STYLE_IDS, BROW_STYLE_IDS, BEARD_STYLE_IDS,
  GLASSES_STYLE_IDS, NOSE_IDS, type Avatar,
} from '../src/engine/head3d/avatar.ts';

const [, , out, photo, lookArg] = process.argv;
let base: Avatar = defaultAvatar();
if (photo) {
  const a = analyzeImage(decodePng(readFileSync(photo)), {});
  base = fitAvatar(measureHead({ work: a.work, zone: a.zone, mask: a.mask, head: a.zones.head }));
  console.log(JSON.stringify(base));
}
if (lookArg) base = { ...base, look: lookArg as Avatar['look'] };
const style = HEAD_STYLES[base.look];
const yaws = [0, 35, 62, 180];

function withOutline(h: ModelHeadImage): Raster {
  const { w, h: H, idx } = h.img;
  const r = createRaster(w + 2, H + 2);
  const set = (x: number, y: number, hex: string) => { const [R, G, B] = hexToRgb(hex); r.data.set([R, G, B, 255], (y * (w + 2) + x) * 4); };
  for (let y = -1; y <= H; y++)
    for (let x = -1; x <= w; x++) {
      const at = (xx: number, yy: number) => (xx < 0 || yy < 0 || xx >= w || yy >= H ? -1 : idx[yy * w + xx]);
      const i = at(x, y);
      if (i >= 0) { set(x + 1, y + 1, h.pal[i].hex); continue; }
      const n = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].find((v) => v >= 0);
      if (n !== undefined && n >= 0) set(x + 1, y + 1, h.pal[n].dark ?? '#222');
    }
  return r;
}

const groups: { label: string; list: Avatar[] }[] = [
  { label: 'pelo', list: HAIR_STYLE_IDS.map((s) => withHairStyle(base, s)) },
  { label: 'ojos', list: EYE_STYLE_IDS.map((s) => ({ ...base, eyes: { ...base.eyes, style: s } })) },
  { label: 'cejas', list: BROW_STYLE_IDS.map((s) => ({ ...base, brows: { style: s } })) },
  { label: 'barba', list: BEARD_STYLE_IDS.map((s) => ({ ...base, beard: { ...base.beard, style: s } })) },
  { label: 'lentes', list: GLASSES_STYLE_IDS.map((s) => ({ ...base, glasses: { style: s, color: s === 'sol' ? '#1d1d24' : '#e2e7ea' } })) },
  { label: 'nariz', list: NOSE_IDS.map((s) => ({ ...base, nose: s })) },
];
const Z = 5, PAD = 6, PER_ROW = 4;
const tiles: { r: Raster; x: number; y: number }[] = [];
let y = PAD, W = 0;
for (const g of groups) {
  for (let i = 0; i < g.list.length; i += PER_ROW) {
    let x = PAD, rowH = 0;
    for (const av of g.list.slice(i, i + PER_ROW)) {
      const m = modelFromAvatar(av);
      for (const yaw of yaws) {
        const r = withOutline(renderHeadModel(m, { width: 20, yaw, style }));
        tiles.push({ r, x, y });
        x += r.w * Z + 2;
        rowH = Math.max(rowH, r.h * Z);
      }
      x += PAD * 3;
    }
    W = Math.max(W, x);
    y += rowH + PAD;
  }
  y += PAD * 3;
}
const sheet = createRaster(W, y);
for (let i = 0; i < sheet.w * sheet.h; i++) sheet.data.set([200, 226, 160, 255], i * 4);
for (const t of tiles)
  for (let yy = 0; yy < t.r.h * Z; yy++) for (let xx = 0; xx < t.r.w * Z; xx++) {
    const si = (Math.floor(yy / Z) * t.r.w + Math.floor(xx / Z)) * 4;
    if (!t.r.data[si + 3]) continue;
    sheet.data.set(t.r.data.subarray(si, si + 4), ((t.y + yy) * sheet.w + t.x + xx) * 4);
  }
writeFileSync(out, encodePng(sheet));
console.log('listo', out, sheet.w, sheet.h);
