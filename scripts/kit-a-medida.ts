/**
 * Kit a medida: arma el kit de un juego desde su kit.config.json.
 *   npm run kit-a-medida -- <carpeta de salida> --config <juego>/kit.config.json [--rapido] [--solo atletas,retratos,...]
 * Las rutas de la configuración (fichas, equipos) son relativas a la carpeta del kit.config.json.
 * --rapido: 2 animaciones por pack. --solo: solo esas partes (atletas, retratos, cabecitas, objetos, animales, fuentes).
 * Ver docs/KIT_A_MEDIDA.md.
 */
import { mkdirSync, writeFileSync, rmSync, readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCustomKit, KIT_PARTS, type KitConfig, type KitPart, type TeamDef } from '../src/engine/kit/custom.ts';
import { migrateFicha, validateFicha, type Ficha } from '../src/engine/sheet/ficha.ts';

const args = process.argv.slice(2);
const flag = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const valued = new Set(['--config', '--solo']);
const out = args.find((a, i) => !a.startsWith('--') && !valued.has(args[i - 1]));
const configPath = flag('--config');
const fail = (msg: string): never => { console.error(msg); process.exit(1); };
if (!out || !configPath) fail('Uso: npm run kit-a-medida -- <carpeta de salida> --config <juego>/kit.config.json [--rapido] [--solo atletas,retratos]');
if (!existsSync(configPath!)) fail(`No encuentro la configuración: ${configPath}`);
const solo = flag('--solo')?.split(',').filter(Boolean) as KitPart[] | undefined;
for (const p of solo ?? []) if (!KIT_PARTS.includes(p)) fail(`--solo: "${p}" no es una parte del kit (hay ${KIT_PARTS.join(', ')})`);

let cfg: KitConfig;
try { cfg = JSON.parse(readFileSync(configPath!, 'utf8')); } catch (e) { fail(`${configPath}: no es un JSON válido (${(e as Error).message})`); }
const base = dirname(resolve(configPath!));

// las fichas de la carpeta: el id es el nombre del archivo
const fichas: Record<string, Ficha> = {};
if (cfg!.fichas) {
  const dir = resolve(base, cfg!.fichas);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) fail(`fichas: no existe la carpeta ${dir}`);
  const bad: string[] = [];
  for (const n of readdirSync(dir).filter((x) => x.endsWith('.ficha.json')).sort()) {
    const id = basename(n, '.ficha.json').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const raw = JSON.parse(readFileSync(join(dir, n), 'utf8'));
    const errs = validateFicha(raw);
    if (errs.length) { bad.push(`${n}: ${errs.join('. ')}`); continue; }
    fichas[id] = migrateFicha(raw);
  }
  if (bad.length) fail(`Fichas inválidas:\n  ${bad.join('\n  ')}`);
}
let equipos: Record<string, TeamDef> | undefined;
if (cfg!.equipos) {
  const p = resolve(base, cfg!.equipos);
  if (!existsSync(p)) fail(`equipos: no existe ${p}`);
  try { equipos = JSON.parse(readFileSync(p, 'utf8')); } catch (e) { fail(`${p}: no es un JSON válido (${(e as Error).message})`); }
}
// fuentes: Silkscreen (OFL), que viene con el proyecto
let fuentes: { regular: ArrayBuffer; bold: ArrayBuffer } | undefined;
if (cfg!.ui?.fuentes) {
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', '@fontsource', 'silkscreen', 'files');
  const ab = (f: string) => { const b = readFileSync(join(dir, f)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length) as ArrayBuffer; };
  fuentes = { regular: ab('silkscreen-latin-400-normal.woff'), bold: ab('silkscreen-latin-700-normal.woff') };
}

// la carpeta se borra entera: solo si está vacía o ya es un kit de PixelForja
if (existsSync(out!) && readdirSync(out!).length) {
  const m = join(out!, 'manifest.json');
  const isKit = existsSync(m) && (() => { try { return JSON.parse(readFileSync(m, 'utf8')).generado_con === 'PixelForja'; } catch { return false; } })();
  if (!isKit) fail(`No borro ${out}: no está vacía y no es un kit de PixelForja. Usa una carpeta nueva.`);
}

const t0 = Date.now();
let res: ReturnType<typeof buildCustomKit>;
try {
  res = buildCustomKit(cfg!, { fichas, equipos, fuentes }, { quick: args.includes('--rapido'), solo, progress: (m) => console.log(`  ${m}`) });
} catch (e) { fail((e as Error).message); }
rmSync(out!, { recursive: true, force: true });
let bytes = 0;
for (const f of res!.files) {
  const p = join(out!, f.name);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, f.bytes);
  bytes += f.bytes.length;
}
for (const w of res!.warnings) console.warn(`  aviso: ${w}`);
console.log(`Kit a medida de "${cfg!.juego}" listo en ${out}: ${res!.files.length} archivos, ${(bytes / 1e6).toFixed(1)} MB, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
