/**
 * forja: genera personajes en lote con el mismo motor del estudio.
 *
 *   npx tsx cli/forja.ts build samples/gabo.png --out out/gabo
 *   npx tsx cli/forja.ts build img.png --head 120,90,180,200 --eyes 160,250,240,250 --sizes 48
 *   npx tsx cli/forja.ts build samples/thor.png --animal boxer --out out/thor
 *   npx tsx cli/forja.ts render out/gabo/gabo.ficha.json --out out/x --anims ffgg --export sheet,godot,unity,aseprite,gif
 *
 * Opciones: --preset chibi|juvenil|realista  --anims all|ffgg|<pack>|idle,walk  --views side,front,back,left
 *           --export sheet,ffgg,aseprite,godot,unity,frames,gif,ficha  --props on|off
 * Si existe `<imagen>.head.json` al lado de la imagen ({ box, eyes } en pixeles de la imagen original),
 * se usa como si el usuario hubiera marcado la cabeza.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { basename, join, dirname } from 'node:path';
import {
  decodePng, encodePng, buildFicha, buildAnimalFicha, migrateFicha, validateFicha, exportFiles, renderPlan, animsFor,
  createRaster, ZONES, FFGG_ANIMS, isHuman, CELL_SIZES, DEFAULT_PROPORTIONS, QAError,
  type Ficha, type CellSize, type HeadSpec, type QAReport, type Raster, type Analysis, type ViewName, type ExportKind, type Species, type PresetName,
} from '../src/engine/index.ts';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const ZONE_COLORS: Record<string, [number, number, number]> = {
  bg: [0, 0, 0], hair: [140, 80, 30], skin: [255, 200, 160], face: [255, 0, 255], top: [60, 120, 255], bottom: [20, 40, 140],
  socks: [240, 240, 240], shoes: [60, 60, 60], accessory: [255, 220, 0], line: [0, 0, 0], beard: [0, 190, 120],
};

export function zoneOverlay(a: Analysis): Raster {
  const { w, h } = a.work.raster;
  const out = createRaster(w, h);
  for (let i = 0; i < w * h; i++) {
    if (!a.mask[i]) { out.data.set([235, 235, 235, 255], i * 4); continue; }
    const c = ZONE_COLORS[ZONES[a.zone[i]]];
    out.data.set([c[0], c[1], c[2], 255], i * 4);
  }
  return out;
}

export function qaTable(reports: QAReport[]): string {
  const lines = ['| anim | px | altura | cabe | piso | sueltos | colores | temblor | cara |', '|---|---|---|---|---|---|---|---|---|'];
  for (const r of reports) {
    const g = (c: string) => {
      const it = r.items.find((x) => x.check === c)!;
      const icon = it.severity === 'ok' ? 'OK' : it.severity === 'warn' ? 'AVISO' : 'FALLA';
      return `${icon} ${it.value}${it.where ? ` (${it.where})` : ''}`;
    };
    lines.push(`| ${r.clip} | ${r.cell} | ${g('height')} | ${g('fit')} | ${g('ground')} | ${g('orphans')} | ${g('colors')} | ${g('jitter')} | ${g('face')} |`);
  }
  return lines.join('\n');
}

function animList(f: Ficha, spec: string | undefined): string[] {
  const all = animsFor(f);
  if (!spec || spec === 'all') return all.map((a) => a.name);
  if (spec === 'ffgg') return [...FFGG_ANIMS];
  const packs = new Set(all.map((a) => a.pack as string));
  return spec.split(',').flatMap((s) => (packs.has(s) ? all.filter((a) => a.pack === s).map((a) => a.name) : [s]));
}

function writeOutputs(ficha: Ficha, out: string, sizes: CellSize[]) {
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, `${ficha.name}.ficha.json`), JSON.stringify(ficha, null, 2));
  const anims = animList(ficha, arg('anims') ?? (ficha.body.skeleton === 'human' ? 'ffgg' : 'all'));
  const views = (arg('views')?.split(',') ?? ['side']) as ViewName[];
  const props = arg('props') !== 'off';
  const kinds = (arg('export')?.split(',') ?? ['sheet', 'gif']) as ExportKind[];
  const reports: QAReport[] = [];
  for (const cell of sizes) {
    const plan = { cell, anims, views, props };
    reports.push(...renderPlan(ficha, plan).qa);
    for (const k of kinds) {
      if (k === 'ffgg' && cell !== 48) continue;
      try {
        for (const file of exportFiles(ficha, k, plan, { force: true })) writeFileSync(join(out, file.name), file.bytes);
      } catch (e) {
        console.error(e instanceof QAError ? e.message : e);
      }
    }
  }
  const table = qaTable(reports);
  writeFileSync(join(out, 'qa.md'), table + '\n');
  const bad = reports.filter((r) => !r.ok);
  console.log(`${reports.length} clips, ${bad.length} con errores de calidad${bad.length ? ': ' + bad.map((b) => `${b.clip}@${b.cell}`).join(', ') : ''}`);
}

async function main() {
  const cmd = process.argv[2];
  const file = process.argv[3];
  if (!cmd || !file) {
    console.log('uso: forja build <imagen.png> [--out dir] [--sizes 32,48,64] [--animal boxer] [--preset chibi] [--head x,y,w,h --eyes x1,y1,x2,y2]\n     forja render <ficha.json> [--out dir]');
    process.exit(1);
  }
  const sizes = (arg('sizes')?.split(',').map(Number) ?? CELL_SIZES) as CellSize[];
  if (cmd === 'render') {
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    const errs = validateFicha(raw);
    if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
    const ficha = migrateFicha(raw);
    const usable = isHuman(ficha) && !ficha.avatar ? sizes.filter((s) => ficha.heads[`${s}`]) : sizes;
    const missing = sizes.filter((s) => !usable.includes(s));
    if (missing.length) console.warn(`La ficha no tiene cabeza para ${missing.join(', ')} px: vuelve a generarla desde la imagen con esos tamaños.`);
    writeOutputs(ficha, arg('out') ?? join('out', ficha.name), usable);
    return;
  }
  const img = decodePng(readFileSync(file));
  const name = basename(file).replace(/\.png$/i, '');
  const out = arg('out') ?? join('out', name);
  mkdirSync(out, { recursive: true });
  if (arg('animal')) {
    const { ficha } = buildAnimalFicha(img, { name, species: arg('animal') as Species });
    writeOutputs(ficha, out, sizes);
    return;
  }
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
  const proportions = { ...DEFAULT_PROPORTIONS, preset: (arg('preset') ?? 'chibi') as PresetName };
  const { ficha, analysis, report } = buildFicha(img, { name, head, sizes, proportions });
  console.log(`ficha en ${Date.now() - t0} ms. cabeza adivinada: ${report.headGuessed}. zonas sin encontrar: ${report.missingZones.join(', ') || 'ninguna'}`);
  console.log('ropa:', JSON.stringify(ficha.outfit), 'lentes:', ficha.face.glasses ?? 'no');
  writeFileSync(join(out, `${name}_zonas.png`), encodePng(zoneOverlay(analysis)));
  writeOutputs(ficha, out, sizes);
}

main();
