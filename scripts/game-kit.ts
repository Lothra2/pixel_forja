/**
 * Kit del juego GG Abyss: genera todos los assets listos para Phaser en una carpeta, con su manifest.json.
 *   npx tsx scripts/game-kit.ts <carpeta> [--rapido] [--fichas <carpeta con *.ficha.json>]
 * Desde el juego (PixelForja como submódulo en tools/pixel_forja):
 *   npx tsx tools/pixel_forja/scripts/game-kit.ts public/assets/kit --fichas fichas
 * Con --fichas, cada `<id>.ficha.json` exportado del estudio reemplaza al preset de ese id (rick, steph, sophie, alana)
 * o se agrega como heroína nueva.
 */
import { mkdirSync, writeFileSync, rmSync, readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { buildGameKit } from '../src/engine/kit/gamekit.ts';
import { migrateFicha, validateFicha, isHuman, type HumanFicha } from '../src/engine/sheet/ficha.ts';

const args = process.argv.slice(2);
const flag = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const fichasDir = flag('--fichas');
const out = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--fichas');
if (!out) { console.error('Uso: npx tsx scripts/game-kit.ts <carpeta> [--rapido] [--fichas <carpeta>]'); process.exit(1); }
const quick = args.includes('--rapido');

// la carpeta se borra entera: solo si está vacía o ya es un kit (no vaya a ser que borre el juego)
if (existsSync(out) && readdirSync(out).length) {
  const m = join(out, 'manifest.json');
  const isKit = existsSync(m) && (() => { try { return JSON.parse(readFileSync(m, 'utf8')).generado_con === 'PixelForja'; } catch { return false; } })();
  if (!isKit) { console.error(`No borro ${out}: no está vacía y no es un kit de PixelForja. Usa una carpeta nueva.`); process.exit(1); }
}

const fichas: Record<string, HumanFicha> = {};
if (fichasDir) {
  for (const n of readdirSync(fichasDir).filter((x) => x.endsWith('.ficha.json'))) {
    const id = basename(n, '.ficha.json').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const f = migrateFicha(JSON.parse(readFileSync(join(fichasDir, n), 'utf8')));
    const errs = validateFicha(f);
    if (errs.length) { console.error(`${n}: ficha inválida\n  ${errs.join('\n  ')}`); process.exit(1); }
    if (!isHuman(f)) { console.warn(`${n}: es un animal, se salta (Thor sale de sus presets)`); continue; }
    fichas[id] = f;
    console.log(`  ficha del estudio: ${id} (${f.name})`);
  }
}

const t0 = Date.now();
const files = buildGameKit({ quick, fichas, progress: (m) => console.log(`  ${m}`) });
rmSync(out, { recursive: true, force: true });
let bytes = 0;
for (const f of files) {
  const p = join(out, f.name);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, f.bytes);
  bytes += f.bytes.length;
}
console.log(`Kit listo en ${out}: ${files.length} archivos, ${(bytes / 1e6).toFixed(1)} MB, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
