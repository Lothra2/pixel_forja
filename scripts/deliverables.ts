/**
 * Genera los entregables visuales de una fase: comparación antes/después, hojas, GIFs y tabla de calidad.
 *   npx tsx scripts/deliverables.ts            -> out/entregables
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  decodePng, encodePng, buildFicha, renderClip, runQA, encodeGif, packSheet, ANIM_NAMES, CELL_SIZES,
  createRaster, blit, fill, upscaleNearest, downscaleForAnalysis, type Raster, type QAReport,
} from '../src/engine/index.ts';

const out = join('out', 'entregables');
mkdirSync(out, { recursive: true });
const BG: [number, number, number, number] = [196, 226, 160, 255];
const names = process.argv.slice(2).length ? process.argv.slice(2) : ['sofi', 'gabo', 'papa'];

function onBg(r: Raster): Raster {
  const o = createRaster(r.w, r.h);
  fill(o, BG);
  blit(o, r, 0, 0);
  return o;
}

const reports: { name: string; r: QAReport }[] = [];
const rows: Raster[] = [];
for (const n of names) {
  const src = decodePng(readFileSync(join('samples', `${n}.png`)));
  const { ficha } = buildFicha(src, { name: n });
  writeFileSync(join(out, `${n}.ficha.json`), JSON.stringify(ficha, null, 2));
  const H = 336;
  const orig = downscaleForAnalysis(src, Math.round((H * Math.max(src.w, src.h)) / src.h)).raster;
  // antes | idle 48 ampliado x7 | caminar 48 x3 (8 cuadros) | tamaño real 32/48/64
  const walk48 = renderClip(ficha, 48, 'walk');
  const idle48 = renderClip(ficha, 48, 'idle');
  const big = upscaleNearest(onBg(idle48.frames[0]), 7);
  const strip = createRaster(8 * 48 * 3 + 7 * 6, 48 * 3);
  walk48.frames.forEach((f, i) => blit(strip, upscaleNearest(onBg(f), 3), i * (48 * 3 + 6), 0));
  const real = createRaster(32 + 48 + 64 + 40, 64);
  let rx = 0;
  for (const cell of CELL_SIZES) {
    blit(real, onBg(renderClip(ficha, cell, 'idle').frames[0]), rx, 64 - cell);
    rx += cell + 20;
  }
  const W = orig.w + 24 + big.w + 24 + Math.max(strip.w, real.w);
  const row = createRaster(W, H);
  fill(row, [255, 255, 255, 255]);
  const origBg = createRaster(orig.w, orig.h);
  fill(origBg, [236, 236, 240, 255]);
  blit(origBg, orig, 0, 0);
  blit(row, origBg, 0, 0);
  blit(row, big, orig.w + 24, 0);
  blit(row, strip, orig.w + 24 + big.w + 24, 0);
  blit(row, real, orig.w + 24 + big.w + 24, strip.h + 40);
  writeFileSync(join(out, `${n}_comparacion.png`), encodePng(row));
  rows.push(row);

  for (const cell of CELL_SIZES) {
    const clips = ANIM_NAMES.map((a) => renderClip(ficha, cell, a));
    for (const c of clips) {
      reports.push({ name: n, r: runQA(ficha, c) });
      writeFileSync(join(out, `${n}_${c.name}_${cell}.gif`), encodeGif(c.frames, c.fps, { scale: Math.round(240 / cell), background: [196, 226, 160] }));
    }
    const { png, json } = packSheet(clips, `${n}_${cell}.png`);
    writeFileSync(join(out, `${n}_${cell}.png`), encodePng(png));
    writeFileSync(join(out, `${n}_${cell}.json`), JSON.stringify(json, null, 2));
    writeFileSync(join(out, `${n}_${cell}_x6.png`), encodePng(upscaleNearest(onBg(png), 6)));
  }
}
const W = Math.max(...rows.map((r) => r.w));
const all = createRaster(W, rows.reduce((s, r) => s + r.h + 24, 0));
fill(all, [255, 255, 255, 255]);
let y = 0;
for (const r of rows) { blit(all, r, 0, y); y += r.h + 24; }
writeFileSync(join(out, 'comparacion_todos.png'), encodePng(all));

const icon = (s: string) => (s === 'ok' ? 'OK' : s === 'warn' ? 'AVISO' : 'FALLA');
const lines = ['| personaje | anim | px | altura | cabe | piso | sueltos | colores | temblor cabeza | cara (ΔL) |', '|---|---|---|---|---|---|---|---|---|---|'];
for (const { name, r } of reports) {
  const g = (c: string) => { const it = r.items.find((x) => x.check === c)!; return `${icon(it.severity)} ${it.value}`; };
  lines.push(`| ${name} | ${r.clip} | ${r.cell} | ${g('height')} | ${g('fit')} | ${g('ground')} | ${g('orphans')} | ${g('colors')} | ${g('jitter')} | ${g('face')} |`);
}
writeFileSync(join(out, 'calidad.md'), lines.join('\n') + '\n');
console.log(lines.join('\n'));
