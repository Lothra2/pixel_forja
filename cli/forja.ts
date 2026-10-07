/**
 * forja: genera personajes en lote con el mismo motor del estudio.
 *
 *   npx tsx cli/forja.ts build samples/sofi.png --out out/sofi
 *   npx tsx cli/forja.ts build img.png --head 120,90,180,200 --eyes 160,250,240,250 --sizes 48
 *   npx tsx cli/forja.ts render ficha.json --out out/x
 *
 * Si existe `<imagen>.head.json` al lado de la imagen ({ box, eyes } en pixeles de la imagen original),
 * se usa como si el usuario hubiera marcado la cabeza.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { basename, join, dirname } from 'node:path';
import {
  decodePng, encodePng, buildFicha, renderClip, ANIM_NAMES, runQA, packSheet, encodeGif, toFfgg,
  upscaleNearest, createRaster, blit, fill, ZONES, validateFicha,
  type Ficha, type CellSize, type HeadSpec, type QAReport, type Raster, type Analysis, CELL_SIZES,
} from '../src/engine/index.ts';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const ZONE_COLORS: Record<string, [number, number, number]> = {
  bg: [0, 0, 0], hair: [140, 80, 30], skin: [255, 200, 160], face: [255, 0, 255], top: [60, 120, 255], bottom: [20, 40, 140],
  socks: [240, 240, 240], shoes: [60, 60, 60], accessory: [255, 220, 0], line: [0, 0, 0],
};

export function zoneOverlay(a: Analysis): Raster {
  const { w, h } = a.work.raster;
  const out = createRaster(w, h);
  for (let i = 0; i < w * h; i++) {
    if (!a.mask[i]) { out.data.set([235, 235, 235, 255], i * 4); continue; }
    const c = ZONE_COLORS[ZONES[a.zone[i]]];
    out.data.set([c[0], c[1], c[2], 255], i * 4);
  }
  // recuadro de cabeza y ojos
  const { box, eyes } = a.zones.head;
  const mark = (x: number, y: number, c: [number, number, number]) => {
    if (x >= 0 && y >= 0 && x < w && y < h) out.data.set([...c, 255], (Math.round(y) * w + Math.round(x)) * 4);
  };
  for (let x = box.x; x < box.x + box.w; x++) { mark(x, box.y, [255, 0, 0]); mark(x, box.y + box.h, [255, 0, 0]); }
  for (let y = box.y; y < box.y + box.h; y++) { mark(box.x, y, [255, 0, 0]); mark(box.x + box.w, y, [255, 0, 0]); }
  for (const e of eyes) for (let d = -4; d <= 4; d++) { mark(e.x + d, e.y, [0, 255, 0]); mark(e.x, e.y + d, [0, 255, 0]); }
  return out;
}

function onBg(r: Raster, bg: [number, number, number]): Raster {
  const out = createRaster(r.w, r.h);
  fill(out, [...bg, 255]);
  blit(out, r, 0, 0);
  return out;
}

function qaTable(reports: QAReport[]): string {
  const lines = ['| anim | px | altura | piso | sueltos | colores | temblor | cara |', '|---|---|---|---|---|---|---|---|'];
  for (const r of reports) {
    const g = (c: string) => {
      const it = r.items.find((x) => x.check === c)!;
      const icon = it.severity === 'ok' ? 'OK' : it.severity === 'warn' ? 'AVISO' : 'FALLA';
      return `${icon} ${it.value}${it.where ? ` (${it.where})` : ''}`;
    };
    lines.push(`| ${r.clip} | ${r.cell} | ${g('height')} | ${g('ground')} | ${g('orphans')} | ${g('colors')} | ${g('jitter')} | ${g('face')} |`);
  }
  return lines.join('\n');
}

function writeOutputs(ficha: Ficha, out: string, sizes: CellSize[]) {
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, `${ficha.name}.ficha.json`), JSON.stringify(ficha, null, 2));
  const reports: QAReport[] = [];
  for (const cell of sizes) {
    const clips = ANIM_NAMES.map((n) => renderClip(ficha, cell, n));
    for (const c of clips) {
      reports.push(runQA(ficha, c));
      writeFileSync(join(out, `${ficha.name}_${c.name}_${cell}.gif`), encodeGif(c.frames, c.fps, { scale: Math.round(192 / cell), background: [196, 226, 160] }));
    }
    const { png, json } = packSheet(clips, `${ficha.name}_${cell}.png`);
    writeFileSync(join(out, `${ficha.name}_${cell}.png`), encodePng(png));
    writeFileSync(join(out, `${ficha.name}_${cell}.json`), JSON.stringify(json, null, 2));
    writeFileSync(join(out, `${ficha.name}_${cell}_x6.png`), encodePng(upscaleNearest(onBg(png, [196, 226, 160]), 6)));
    if (cell === 48) {
      const ff = toFfgg(json);
      writeFileSync(join(out, `${ficha.name}_ffgg.json`), JSON.stringify(ff.json, null, 2));
      console.log(`FFGG: ${Object.keys(ff.json.anims).length} animaciones listas, faltan ${ff.missing.length}`);
    }
  }
  const table = qaTable(reports);
  writeFileSync(join(out, 'qa.md'), table + '\n');
  console.log(table);
}

async function main() {
  const cmd = process.argv[2];
  const file = process.argv[3];
  if (!cmd || !file) {
    console.log('uso: forja build <imagen.png> [--out dir] [--sizes 32,48,64] [--head x,y,w,h --eyes x1,y1,x2,y2]\n     forja render <ficha.json> [--out dir]');
    process.exit(1);
  }
  const sizes = (arg('sizes')?.split(',').map(Number) ?? CELL_SIZES) as CellSize[];
  if (cmd === 'render') {
    const ficha = JSON.parse(readFileSync(file, 'utf8')) as Ficha;
    const errs = validateFicha(ficha);
    if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
    writeOutputs(ficha, arg('out') ?? join('out', ficha.name), sizes.filter((s) => ficha.heads[`${s}`]));
    return;
  }
  const img = decodePng(readFileSync(file));
  const name = basename(file).replace(/\.png$/i, '');
  const out = arg('out') ?? join('out', name);
  // la cabeza se marca en pixeles de la imagen original; el motor trabaja en la imagen reducida
  let head: HeadSpec | undefined;
  const sidecar = join(dirname(file), `${name}.head.json`);
  const raw = arg('head') && arg('eyes')
    ? (() => {
        const [x, y, w, h] = arg('head')!.split(',').map(Number);
        const [a, b, c, d] = arg('eyes')!.split(',').map(Number);
        return { box: { x, y, w, h }, eyes: [{ x: a, y: b }, { x: c, y: d }] } as HeadSpec;
      })()
    : existsSync(sidecar) ? (JSON.parse(readFileSync(sidecar, 'utf8')) as HeadSpec) : undefined;
  if (raw) {
    const s = Math.min(1, 640 / Math.max(img.w, img.h));
    head = {
      box: { x: raw.box.x * s, y: raw.box.y * s, w: raw.box.w * s, h: raw.box.h * s },
      eyes: [{ x: raw.eyes[0].x * s, y: raw.eyes[0].y * s }, { x: raw.eyes[1].x * s, y: raw.eyes[1].y * s }],
    };
  }
  const t0 = Date.now();
  const { ficha, analysis, report } = buildFicha(img, { name, head, sizes });
  console.log(`ficha en ${Date.now() - t0} ms. cabeza adivinada: ${report.headGuessed}. zonas sin encontrar: ${report.missingZones.join(', ') || 'ninguna'}`);
  console.log('ropa:', JSON.stringify(ficha.outfit));
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, `${name}_zonas.png`), encodePng(zoneOverlay(analysis)));
  writeOutputs(ficha, out, sizes);
}

main();
