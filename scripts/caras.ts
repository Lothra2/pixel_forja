/**
 * Tablero de estilos de cara: mide la cabeza de una foto o dibujo y la dibuja con cada estilo,
 * de frente, 3/4, de lado, de perfil y de espalda.
 *   npx tsx scripts/caras.ts <imagen.png> <salida.png> [estilos] [anchos]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng, analyzeImage, createRaster, hexToRgb, type Raster } from '../src/engine/index.ts';
import { measureHead } from '../src/engine/head3d/measure.ts';
import { renderHeadModel, HEAD_STYLES, type ModelHeadImage } from '../src/engine/head3d/render.ts';

const [, , file, out, stylesArg, widthsArg] = process.argv;
const img = decodePng(readFileSync(file));
const a = analyzeImage(img, {});
const model = measureHead({ work: a.work, zone: a.zone, mask: a.mask, head: a.zones.head });
writeFileSync(out.replace(/\.png$/, '.model.json'), JSON.stringify(model, null, 1));
const styles = (stylesArg ?? Object.keys(HEAD_STYLES).join(',')).split(',');
const widths = (widthsArg ?? '20').split(',').map(Number);
const yaws = [0, 35, 60, 90, 180];

/** cabeza con contorno de 1 pixel, como queda en el juego */
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

const Z = 8, PAD = 4;
const tiles: { r: Raster; x: number; y: number; z: number }[] = [];
let y = PAD, W = 0;
// referencia: la cara de la foto
const box = a.zones.head.box, s = 1 / a.work.scale;
const crop = createRaster(Math.round(box.w * s), Math.round(box.h * s));
for (let yy = 0; yy < crop.h; yy++) for (let xx = 0; xx < crop.w; xx++) {
  const sx = Math.round(box.x * s + xx), sy = Math.round(box.y * s + yy);
  if (sx < 0 || sy < 0 || sx >= img.w || sy >= img.h) continue;
  crop.data.set(img.data.subarray((sy * img.w + sx) * 4, (sy * img.w + sx) * 4 + 4), (yy * crop.w + xx) * 4);
}
const refZ = Math.max(1, Math.floor(((widths[0] + 8) * Z * 1.3) / crop.h));
const refScale = ((widths[0] * 1.4 + 2) * Z) / crop.h;
for (const st of styles) {
  for (const wpx of widths) {
    let x = PAD + Math.round(crop.w * refScale) + PAD * 2, rowH = 0;
    for (const yaw of yaws) {
      const h = renderHeadModel(model, { width: wpx, yaw, style: HEAD_STYLES[st] });
      const r = withOutline(h);
      tiles.push({ r, x, y, z: Z });
      x += r.w * Z + PAD * 3;
      rowH = Math.max(rowH, r.h * Z);
    }
    W = Math.max(W, x);
    y += rowH + PAD * 3;
  }
}
const sheet = createRaster(W, y);
for (let i = 0; i < sheet.w * sheet.h; i++) sheet.data.set([200, 226, 160, 255], i * 4);
// foto a la izquierda, escalada
const rw = Math.round(crop.w * refScale), rh = Math.round(crop.h * refScale);
for (let yy = 0; yy < rh; yy++) for (let xx = 0; xx < rw; xx++) {
  const sx = Math.floor(xx / refScale), sy = Math.floor(yy / refScale);
  sheet.data.set(crop.data.subarray((sy * crop.w + sx) * 4, (sy * crop.w + sx) * 4 + 4), ((yy + PAD) * sheet.w + xx + PAD) * 4);
}
void refZ;
for (const t of tiles)
  for (let yy = 0; yy < t.r.h * t.z; yy++) for (let xx = 0; xx < t.r.w * t.z; xx++) {
    const si = (Math.floor(yy / t.z) * t.r.w + Math.floor(xx / t.z)) * 4;
    if (!t.r.data[si + 3]) continue;
    sheet.data.set(t.r.data.subarray(si, si + 4), ((t.y + yy) * sheet.w + t.x + xx) * 4);
  }
writeFileSync(out, encodePng(sheet));
console.log('listo', out, sheet.w, sheet.h);
