/**
 * Hojas en estilo Nekketsu (NES) para un juego.
 *   npx tsx scripts/nekketsu.ts <elenco.json> <carpeta> [--tablero tablero.png]
 * elenco.json: { "personas": { "<id>": NesLook | { "ficha": "ruta.ficha.json", ...NesLook parcial }, ... }, "porteros": ["<id>"], "perros": { "<id>": NesDogLook } }
 * Sale <id>.png + <id>.json (Phaser: cell, pivot, cols, mirror y anims "<anim>_<dir>") por cada uno, y con --tablero una hoja de muestra.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { encodePng, createRaster, migrateFicha, nesSheet, nesDogSheet, nesLookFromFicha, nesFrame, nesDogFrame, NES_ANIMS, type NesLook, type NesDogLook, type Raster, type Ficha } from '../src/engine/index.ts';

const [, , cast, out] = process.argv;
const ti = process.argv.indexOf('--tablero'), board = ti > 0 ? process.argv[ti + 1] : null;
const spec = JSON.parse(readFileSync(cast, 'utf8')) as { personas: Record<string, NesLook | (Partial<NesLook> & { ficha: string })>; porteros?: string[]; perros?: Record<string, NesDogLook> };
mkdirSync(out, { recursive: true });
const looks: Record<string, NesLook> = {};
for (const [id, v] of Object.entries(spec.personas)) {
  if ('ficha' in v && v.ficha) { const { ficha, ...rest } = v; looks[id] = nesLookFromFicha(migrateFicha(JSON.parse(readFileSync(resolve(dirname(cast), ficha), 'utf8'))) as Ficha, rest); }
  else looks[id] = v as NesLook;
}
const write = (id: string, s: { png: Raster; meta: unknown }): void => { writeFileSync(join(out, `${id}.png`), encodePng(s.png)); writeFileSync(join(out, `${id}.json`), JSON.stringify(s.meta)); };
for (const [id, L] of Object.entries(looks)) write(id, nesSheet(L, { keeper: spec.porteros?.includes(id) }));
for (const [id, D] of Object.entries(spec.perros ?? {})) write(id, nesDogSheet(D));
console.log(`${Object.keys(looks).length + Object.keys(spec.perros ?? {}).length} hojas Nekketsu en ${out}`);

if (board) {
  // the sample board: every character in a row, 12 poses, at 4x on the green of the NES pitch
  const S = 4, poses: [string, 'side' | 'front' | 'back', number][] = [['idle', 'side', 0], ['run', 'side', 0], ['run', 'side', 1], ['run', 'side', 2], ['run', 'side', 3], ['idle', 'front', 0], ['idle', 'back', 0], ['shot', 'side', 2], ['punch', 'side', 1], ['kick_hit', 'side', 1], ['slide', 'side', 1], ['tumble', 'side', 4], ['celebrate', 'front', 1], ['sad', 'front', 0]];
  const ids = [...Object.keys(looks), ...Object.keys(spec.perros ?? {})];
  const R = createRaster(poses.length * 32 * S, ids.length * 32 * S);
  for (let i = 0; i < R.w * R.h; i++) R.data.set(((Math.floor(i / R.w / (12 * S))) % 2) ? [82, 196, 48, 255] : [94, 214, 58, 255], i * 4);
  ids.forEach((id, row) => poses.forEach(([a, v, k], col) => {
    let f: Raster;
    if (looks[id]) { const an = NES_ANIMS[a]; const list = (v === 'front' ? an.front : v === 'back' ? an.back : an.side) ?? an.side; f = nesFrame(looks[id], (v === 'front' && an.front) || (v === 'back' && an.back) ? v : 'side', list[Math.min(k, list.length - 1)]); }
    else f = nesDogFrame(spec.perros![id], col % 3 === 0 ? {} : { legs: [[5, 1], [3, 2], [-6, 2], [-8, 1]], bob: 1, tail: -4 });
    for (let y = 0; y < 32 * S; y++) for (let x = 0; x < 32 * S; x++) {
      const si = (Math.floor(y / S) * 32 + Math.floor(x / S)) * 4;
      if (f.data[si + 3]) R.data.set(f.data.subarray(si, si + 4), ((row * 32 * S + y) * R.w + col * 32 * S + x) * 4);
    }
  }));
  writeFileSync(board, encodePng(R));
  console.log('tablero', board);
}
