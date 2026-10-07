/**
 * Entregables visuales: comparación antes/después, hojas ampliadas, GIF y tabla de calidad.
 *   npx tsx scripts/deliverables.ts            -> out/entregables
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  decodePng, encodePng, buildFicha, buildAnimalFicha, renderClip, runQA, encodeGif, packSheet, CELL_SIZES, renderPlan, FFGG_PLAN,
  createRaster, blit, fill, upscaleNearest, downscaleForAnalysis, HUMAN_ANIMS, ANIMAL_ANIMS,
  type Raster, type QAReport, type Ficha, type ViewName,
} from '../src/engine/index.ts';

const out = join('out', 'entregables');
mkdirSync(out, { recursive: true });
const BG: [number, number, number, number] = [196, 226, 160, 255];
const humans = ['sofi', 'gabo', 'papa', 'mama', 'nena', 'portero'];

function onBg(r: Raster): Raster {
  const o = createRaster(r.w, r.h);
  fill(o, BG);
  blit(o, r, 0, 0);
  return o;
}

/** Fila: imagen original | cuadro ampliado | 8 cuadros de una animación x3 | tamaño real 32/48/64 */
function compareRow(src: Raster, f: Ficha, anim: string): Raster {
  const H = 336;
  const orig = downscaleForAnalysis(src, Math.round((H * Math.max(src.w, src.h)) / src.h)).raster;
  const clip = renderClip(f, 48, anim);
  const big = upscaleNearest(onBg(renderClip(f, 48, 'idle').frames[0]), 7);
  const n = Math.min(8, clip.frames.length);
  const strip = createRaster(n * (48 * 3 + 6), 48 * 3);
  clip.frames.slice(0, n).forEach((fr, i) => blit(strip, upscaleNearest(onBg(fr), 3), i * (48 * 3 + 6), 0));
  const real = createRaster(32 + 48 + 64 + 40, 64);
  let rx = 0;
  for (const cell of CELL_SIZES) { blit(real, onBg(renderClip(f, cell, 'idle').frames[0]), rx, 64 - cell); rx += cell + 20; }
  const row = createRaster(orig.w + 24 + big.w + 24 + Math.max(strip.w, real.w), Math.max(H, big.h));
  fill(row, [255, 255, 255, 255]);
  const ob = createRaster(orig.w, orig.h); fill(ob, [236, 236, 240, 255]); blit(ob, orig, 0, 0);
  blit(row, ob, 0, 0);
  blit(row, big, orig.w + 24, 0);
  blit(row, strip, orig.w + 24 + big.w + 24, 0);
  blit(row, real, orig.w + 24 + big.w + 24, strip.h + 40);
  return row;
}

function stack(rows: Raster[], gap = 24): Raster {
  const W = Math.max(...rows.map((r) => r.w));
  const all = createRaster(W, rows.reduce((s, r) => s + r.h + gap, 0));
  fill(all, [255, 255, 255, 255]);
  let y = 0;
  for (const r of rows) { blit(all, r, 0, y); y += r.h + gap; }
  return all;
}

/** Hoja de contacto: un cuadro clave de cada animación, x3. */
function contact(f: Ficha, anims: string[], view: ViewName = 'side', cols = 10): Raster {
  const k = 3, cw = 48 * k + 4;
  const sheet = createRaster(cols * cw, Math.ceil(anims.length / cols) * cw);
  fill(sheet, [255, 255, 255, 255]);
  anims.forEach((a, i) => {
    const c = renderClip(f, 48, a, view);
    const fr = c.frames[Math.floor(c.frames.length / 2)];
    blit(sheet, upscaleNearest(onBg(fr), k), (i % cols) * cw, Math.floor(i / cols) * cw);
  });
  return sheet;
}

const reports: { name: string; r: QAReport }[] = [];
const rows: Raster[] = [];
for (const n of humans) {
  const src = decodePng(readFileSync(join('samples', `${n}.png`)));
  const { ficha } = buildFicha(src, { name: n });
  writeFileSync(join(out, `${n}.ficha.json`), JSON.stringify(ficha, null, 2));
  rows.push(compareRow(src, ficha, 'walk'));
  for (const cell of CELL_SIZES) {
    const { clips, qa } = renderPlan(ficha, { ...FFGG_PLAN, cell });
    qa.forEach((r) => reports.push({ name: n, r }));
    const { png } = packSheet(clips, `${n}_${cell}.png`);
    writeFileSync(join(out, `${n}_ffgg_${cell}_x4.png`), encodePng(upscaleNearest(onBg(png), cell === 32 ? 6 : 4)));
  }
  for (const a of ['walk', 'run', 'shot', 'celebrate']) {
    const c = renderClip(ficha, 48, a);
    writeFileSync(join(out, `${n}_${a}_48.gif`), encodeGif(c.frames, c.fps, { scale: 5, background: [196, 226, 160] }));
  }
}
writeFileSync(join(out, 'comparacion_familia_futbol.png'), encodePng(stack(rows)));

// todas las animaciones de un jugador (contacto) y RPG en 4 direcciones
const gabo = buildFicha(decodePng(readFileSync('samples/gabo.png')), { name: 'gabo' }).ficha;
writeFileSync(join(out, 'gabo_todas_las_animaciones.png'), encodePng(contact(gabo, HUMAN_ANIMS.map((a) => a.name))));
const sofi = buildFicha(decodePng(readFileSync('samples/sofi.png')), { name: 'sofi' }).ficha;
const rpg = ['idle', 'walk', 'attack', 'throw', 'block_shield', 'use_item', 'die'];
writeFileSync(join(out, 'sofi_rpg_4_direcciones.png'), encodePng(stack((['front', 'back', 'left', 'side'] as ViewName[]).map((v) => contact(sofi, rpg, v, 7)), 8)));
for (const v of ['front', 'back', 'left', 'side'] as ViewName[]) {
  const c = renderClip(sofi, 48, 'walk', v);
  writeFileSync(join(out, `sofi_walk_${v}.gif`), encodeGif(c.frames, c.fps, { scale: 5, background: [196, 226, 160] }));
}
// preajustes
const presets = (['chibi', 'juvenil', 'realista'] as const).map((p) => buildFicha(decodePng(readFileSync('samples/papa.png')), { name: 'papa', proportions: { preset: p, height: 1, build: 1, legs: 1, arms: 1, head: 1, shoulders: 1, hips: 1 } }).ficha);
writeFileSync(join(out, 'papa_preajustes.png'), encodePng(stack(presets.map((f) => contact(f, ['idle', 'walk', 'run', 'shot', 'celebrate'], 'side', 5)), 8)));
// Thor
const thor = buildAnimalFicha(decodePng(readFileSync('samples/thor.png')), { name: 'thor', species: 'boxer' }).ficha;
writeFileSync(join(out, 'thor_animaciones.png'), encodePng(contact(thor, ANIMAL_ANIMS.map((a) => a.name), 'side', 5)));
for (const a of ANIMAL_ANIMS) {
  const c = renderClip(thor, 48, a.name);
  reports.push({ name: 'thor', r: runQA(thor, c) });
  writeFileSync(join(out, `thor_${a.name}_48.gif`), encodeGif(c.frames, c.fps, { scale: 5, background: [196, 226, 160] }));
}

const icon = (s: string) => (s === 'ok' ? 'OK' : s === 'warn' ? 'AVISO' : 'FALLA');
const lines = ['| personaje | anim | px | altura | cabe | piso | sueltos | colores | temblor cabeza | cara (ΔL) |', '|---|---|---|---|---|---|---|---|---|---|'];
for (const { name, r } of reports) {
  const g = (c: string) => { const it = r.items.find((x) => x.check === c)!; return `${icon(it.severity)} ${it.value}`; };
  lines.push(`| ${name} | ${r.clip} | ${r.cell} | ${g('height')} | ${g('fit')} | ${g('ground')} | ${g('orphans')} | ${g('colors')} | ${g('jitter')} | ${g('face')} |`);
}
writeFileSync(join(out, 'calidad.md'), lines.join('\n') + '\n');
const bad = reports.filter((x) => !x.r.ok);
console.log(`${reports.length} clips revisados, ${bad.length} con errores${bad.length ? ': ' + bad.map((b) => `${b.name}/${b.r.clip}@${b.r.cell}`).join(', ') : ''}`);
