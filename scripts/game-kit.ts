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
import { fileURLToPath } from 'node:url';
import { buildGameKit } from '../src/engine/kit/gamekit.ts';
import { encodePng, decodePng } from '../src/engine/export/png.ts';
import type { Raster } from '../src/engine/core/raster.ts';
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
// fuentes bitmap: Silkscreen (OFL), que viene con el proyecto
const fontDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', '@fontsource', 'silkscreen', 'files');
const ab = (p: string) => { const b = readFileSync(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length) as ArrayBuffer; };
const fonts = existsSync(fontDir) ? { regular: ab(join(fontDir, 'silkscreen-latin-400-normal.woff')), bold: ab(join(fontDir, 'silkscreen-latin-700-normal.woff')) } : undefined;
if (!fonts) console.warn('  sin fuentes: falta node_modules/@fontsource/silkscreen (corre npm ci)');
// las capas de equipo tardan en dibujarse: se guardan en .cache/capas (con --sin-cache se rehacen todas)
const cacheDir = join(dirname(fileURLToPath(import.meta.url)), '..', '.cache', 'capas');
const usarCache = !args.includes('--sin-cache');
if (usarCache) mkdirSync(cacheDir, { recursive: true });
const cache = usarCache ? {
  get: (k: string) => {
    const pj = join(cacheDir, `${k}.json`);
    if (!existsSync(pj)) return undefined;
    const pp = join(cacheDir, `${k}.png`);
    return { meta: readFileSync(pj, 'utf8'), png: existsSync(pp) ? new Uint8Array(readFileSync(pp)) : new Uint8Array() };
  },
  set: (k: string, v: { png: Uint8Array; meta: string }) => {
    if (v.png.length) writeFileSync(join(cacheDir, `${k}.png`), v.png);
    writeFileSync(join(cacheDir, `${k}.json`), v.meta);
  },
} : undefined;
// los jefes grandes también: cada cuadro se guarda en .cache/jefes con la huella de su escena
const bossDir = join(dirname(fileURLToPath(import.meta.url)), '..', '.cache', 'jefes');
if (usarCache) mkdirSync(bossDir, { recursive: true });
const bossCache = usarCache ? {
  get: (k: string) => { const p = join(bossDir, `${k}.png`); return existsSync(p) ? decodePng(new Uint8Array(readFileSync(p))) : null; },
  set: (k: string, r: Raster) => writeFileSync(join(bossDir, `${k}.png`), encodePng(r)),
} : undefined;
const files = buildGameKit({ quick, fichas, fonts, cache, bossCache, sinCapas: args.includes('--sin-capas'), progress: (m) => console.log(`  ${m}`) });
rmSync(out, { recursive: true, force: true });
let bytes = 0;
for (const f of files) {
  const p = join(out, f.name);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, f.bytes);
  bytes += f.bytes.length;
}
console.log(`Kit listo en ${out}: ${files.length} archivos, ${(bytes / 1e6).toFixed(1)} MB, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
