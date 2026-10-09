/**
 * Kit del juego Legado GG: genera todos los assets listos para Phaser en una carpeta, con su manifest.json.
 *   npx tsx scripts/game-kit.ts <carpeta> [--rapido]
 * Desde el juego (PixelForja como submódulo en tools/pixel_forja):
 *   npx tsx tools/pixel_forja/scripts/game-kit.ts public/assets/kit
 */
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { buildGameKit } from '../src/engine/kit/gamekit.ts';

const args = process.argv.slice(2);
const out = args.find((a) => !a.startsWith('--'));
if (!out) { console.error('Uso: npx tsx scripts/game-kit.ts <carpeta> [--rapido]'); process.exit(1); }
const quick = args.includes('--rapido');
const t0 = Date.now();
const files = buildGameKit({ quick, progress: (m) => console.log(`  ${m}`) });
rmSync(out, { recursive: true, force: true });
let bytes = 0;
for (const f of files) {
  const p = join(out, f.name);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, f.bytes);
  bytes += f.bytes.length;
}
console.log(`Kit listo en ${out}: ${files.length} archivos, ${(bytes / 1e6).toFixed(1)} MB, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
