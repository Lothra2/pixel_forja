/**
 * Paquete de un personaje desde una imagen: comparación, GIF, hoja de Fútbol Familia GG y ficha.
 *   npx tsx scripts/personaje.ts <imagen.png> <carpeta> [nombre]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  decodePng, encodePng, buildFicha, renderClip, encodeGif, exportFiles, FFGG_PLAN, renderPlan, packSheet,
  createRaster, blit, fill, upscaleNearest, downscaleForAnalysis, CELL_SIZES, type Raster, type ViewName,
} from '../src/engine/index.ts';

const [, , img, dir, nameArg] = process.argv;
const name = nameArg ?? 'personaje';
mkdirSync(dir, { recursive: true });
const src = decodePng(readFileSync(img));
const { ficha, analysis } = buildFicha(src, { name });
console.log('modo', analysis.mode, JSON.stringify(analysis.portrait ?? {}), JSON.stringify(ficha.outfit));
writeFileSync(join(dir, `${name}.ficha.json`), JSON.stringify(ficha, null, 2));
const BG: [number, number, number, number] = [196, 226, 160, 255];
const onBg = (r: Raster) => { const o = createRaster(r.w, r.h); fill(o, BG); blit(o, r, 0, 0); return o; };

// comparación: foto | reposo x8 de frente y de lado | caminar x3 | tamaño real
const H = 420;
const orig = downscaleForAnalysis(src, Math.round((H * Math.max(src.w, src.h)) / src.h)).raster;
const front = upscaleNearest(onBg(renderClip(ficha, 48, 'idle', 'front').frames[0]), 8);
const sideBig = upscaleNearest(onBg(renderClip(ficha, 48, 'idle', 'side').frames[0]), 8);
const walk = renderClip(ficha, 48, 'walk');
const strip = createRaster(8 * (48 * 3 + 6), 48 * 3);
walk.frames.forEach((f, i) => blit(strip, upscaleNearest(onBg(f), 3), i * (48 * 3 + 6), 0));
const real = createRaster(32 + 48 + 64 + 40, 64);
let rx = 0;
for (const c of CELL_SIZES) { blit(real, onBg(renderClip(ficha, c, 'idle').frames[0]), rx, 64 - c); rx += c + 20; }
const top = createRaster(orig.w + 20 + front.w + 20 + sideBig.w, Math.max(orig.h, front.h));
fill(top, [255, 255, 255, 255]);
blit(top, orig, 0, 0); blit(top, front, orig.w + 20, 0); blit(top, sideBig, orig.w + 20 + front.w + 20, 0);
const all = createRaster(Math.max(top.w, strip.w), top.h + 20 + strip.h + 20 + real.h);
fill(all, [255, 255, 255, 255]);
blit(all, top, 0, 0); blit(all, strip, 0, top.h + 20); blit(all, real, 0, top.h + 20 + strip.h + 20);
writeFileSync(join(dir, `${name}_comparacion.png`), encodePng(all));

const gifs: [string, ViewName][] = [['idle', 'front'], ['walk', 'side'], ['run', 'side'], ['shot', 'side'], ['celebrate', 'side'], ['goal_knee', 'side'], ['walk', 'front'], ['chilena', 'side']];
for (const [a, v] of gifs) {
  const c = renderClip(ficha, 48, a, v);
  writeFileSync(join(dir, `${name}_${a}_${v}.gif`), encodeGif(c.frames, c.fps, { scale: 6, background: [196, 226, 160] }));
}
for (const f of exportFiles(ficha, 'ffgg', FFGG_PLAN)) writeFileSync(join(dir, f.name), f.bytes);
const { clips, qa } = renderPlan(ficha, FFGG_PLAN);
writeFileSync(join(dir, `${name}_ffgg_x4.png`), encodePng(upscaleNearest(onBg(packSheet(clips, 'x').png), 4)));
console.log(`calidad: ${qa.filter((q) => q.ok).length}/${qa.length} animaciones del juego sin errores`);
