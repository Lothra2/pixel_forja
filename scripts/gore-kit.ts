/**
 * Solo el kit de sangre, vísceras y horror (src/engine/kit/gorekit.ts) a una carpeta, con su manifest.json.
 *   npx tsx scripts/gore-kit.ts <carpeta> [--rapido] [--calidad N]
 * El kit completo lo incluye con `npx tsx scripts/game-kit.ts <carpeta> --gore`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { exportarGoreHorror } from '../src/engine/kit/gorekit.ts';

const args = process.argv.slice(2);
const out = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--calidad');
if (!out) { console.error('Uso: npx tsx scripts/gore-kit.ts <carpeta> [--rapido] [--calidad N]'); process.exit(1); }
const ic = args.indexOf('--calidad');
const t0 = Date.now();
const { files, manifest } = exportarGoreHorror({ rapido: args.includes('--rapido'), calidad: ic >= 0 ? +args[ic + 1] : undefined, progress: (m) => console.log(`  ${m}`) });
let bytes = 0;
for (const f of [...files, { name: 'gore_horror/manifest.json', bytes: new TextEncoder().encode(JSON.stringify(manifest, null, 1)), mime: 'application/json' }]) {
  const p = join(out, f.name);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, f.bytes);
  bytes += f.bytes.length;
}
console.log(`${files.length + 1} archivos, ${(bytes / 1e6).toFixed(1)} MB, en ${((Date.now() - t0) / 1000).toFixed(0)} s`);
