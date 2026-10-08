/**
 * Tablero de piezas LPC sobre una cabeza: compara peinados, barbas o lentes de frente y de lado.
 *   npx tsx scripts/lpc-board.ts <salida.png> <hair|beard|mustache|glasses|head|nose> [ids,separados,por,coma] [json con base]
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { encodePng, createRaster, hexToRgb, lpcHead, LPC_HAIRS, LPC_BEARDS, LPC_MUSTACHES, LPC_GLASSES, LPC_HEADS, LPC_NOSES, LPC_EARS, LPC_HORNS, DEFAULT_LPC, type LpcLook, type LpcColors, type ModelHeadImage, type Raster } from '../src/engine/index.ts';

const [, , out, what, idsArg, baseArg] = process.argv;
const base: { look: LpcLook; colors: LpcColors } = baseArg ? JSON.parse(readFileSync(baseArg, 'utf8')) : { look: DEFAULT_LPC, colors: { skin: '#e0ac8a', hair: '#3a2d26', eyes: '#3a2418', beard: '#4a3a33', glasses: '#1d1d24' } };
const all: Record<string, string[]> = { hair: LPC_HAIRS, beard: LPC_BEARDS, mustache: LPC_MUSTACHES, glasses: LPC_GLASSES, head: LPC_HEADS, nose: LPC_NOSES, ears: LPC_EARS, horns: LPC_HORNS };
const ids = idsArg && idsArg !== 'all' ? idsArg.split(',') : all[what];
function outlined(h: ModelHeadImage): Raster {
  const { w, h: H, idx } = h.img;
  const r = createRaster(w + 2, H + 2);
  for (let y = 0; y < H; y++) for (let x = 0; x < w; x++) { const i = idx[y * w + x]; if (i < 0) continue; const [R, G, B] = hexToRgb(h.pal[i].hex); r.data.set([R, G, B, 255], ((y + 1) * (w + 2) + x + 1) * 4); }
  return r;
}
const Z = 4, cols = 6, cw = 40 * 2 * Z, ch = 52 * Z;
const sheet = createRaster(cols * cw, Math.ceil(ids.length / cols) * ch);
for (let i = 0; i < sheet.w * sheet.h; i++) sheet.data.set([200, 226, 160, 255], i * 4);
ids.forEach((id, n) => {
  const look = { ...base.look, [what]: id } as LpcLook;
  ['front', 'side'].forEach((v, j) => {
    const r = outlined(lpcHead(look, v as 'front' | 'side', base.colors));
    const ox = (n % cols) * cw + j * 40 * Z, oy = Math.floor(n / cols) * ch;
    for (let y = 0; y < r.h * Z; y++) for (let x = 0; x < r.w * Z; x++) {
      const si = (Math.floor(y / Z) * r.w + Math.floor(x / Z)) * 4;
      if (r.data[si + 3] && ox + x < sheet.w && oy + y < sheet.h) sheet.data.set(r.data.subarray(si, si + 4), ((oy + y) * sheet.w + ox + x) * 4);
    }
  });
});
writeFileSync(out, encodePng(sheet));
console.log(ids.map((id, i) => `${i}:${id}`).join(' '));
