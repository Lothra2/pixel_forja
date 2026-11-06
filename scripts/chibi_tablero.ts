/** Muestra del estilo chibi Nekketsu: npx tsx scripts/chibi_tablero.ts <elenco.json> <salida.png> [ids...] */
import { readFileSync, writeFileSync } from 'node:fs';
import { encodePng, createRaster, chibiFrame, CHIBI_ANIMS, type NesLook, type Raster } from '../src/engine/index.ts';
const [, , cast, outPath, ...only] = process.argv;
const spec = JSON.parse(readFileSync(cast, 'utf8')) as { personas: Record<string, NesLook> };
const ids = only.length ? only : Object.keys(spec.personas);
const poses: [string, 'side' | 'front' | 'back', number][] = [['idle', 'side', 0], ['idle', 'front', 0], ['idle', 'back', 0], ['run', 'side', 0], ['run', 'side', 1], ['run', 'side', 2], ['run', 'side', 3], ['run', 'front', 0], ['shot', 'side', 0], ['shot', 'side', 2], ['header', 'side', 1], ['punch', 'side', 1], ['kick_hit', 'side', 1], ['slide', 'side', 1], ['stagger', 'side', 0], ['tumble', 'side', 2], ['lie', 'side', 0], ['fall_getup', 'side', 0], ['celebrate', 'front', 1], ['celebrate', 'side', 0], ['sad', 'front', 0], ['dizzy', 'front', 0], ['keeper_ready', 'front', 0], ['keeper_dive', 'side', 1]];
const S = 4, R = createRaster(poses.length * 32 * S, ids.length * 32 * S);
for (let i = 0; i < R.w * R.h; i++) R.data.set(((Math.floor(i / R.w / (16 * S))) % 2) ? [60, 176, 50, 255] : [100, 235, 54, 255], i * 4);
ids.forEach((id, row) => poses.forEach(([a, v, k], col) => {
  const an = CHIBI_ANIMS[a]; const list = (v === 'front' ? an.front : v === 'back' ? an.back : an.side) ?? an.side;
  const f: Raster = chibiFrame({ ...spec.personas[id], guantes: a.startsWith('keeper') || spec.personas[id].guantes }, ['sad', 'dizzy', 'keeper_ready'].includes(a) ? 'front' : v, list[Math.min(k, list.length - 1)]);
  for (let y = 0; y < 32 * S; y++) for (let x = 0; x < 32 * S; x++) {
    const si = (Math.floor(y / S) * 32 + Math.floor(x / S)) * 4;
    if (f.data[si + 3]) R.data.set(f.data.subarray(si, si + 4), ((row * 32 * S + y) * R.w + col * 32 * S + x) * 4);
  }
}));
writeFileSync(outPath, encodePng(R)); console.log('tablero', outPath, R.w, R.h);
