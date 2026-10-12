/**
 * Kit deportivo: hojas de 8 direcciones por atleta y deporte, con manifest.json (eventos, avance, elevación, agua).
 *   npx tsx scripts/sports-kit.ts <carpeta> [--rapido] [--celda 32|48|64] [--deportes atletismo,natacion,voley,tenis,pelea] [--fichas <carpeta>]
 *     [--filas right,down_right,up_right,down,up] [--datos] [--atlas] [--retratos] [--cabecitas] [--objetos] [--fuentes]
 * --deportes calle: la pelea callejera (levantar, lanzar, agarres, armas). --objetos: las armas del piso en un atlas.
 * --fuentes: las fuentes bitmap (Silkscreen, con ñ, tildes y vietnamita) en ui/fuentes/.
 * Con --fichas, cada `<id>.ficha.json` del estudio se agrega como atleta (y reemplaza a la familia). Un animal (la
 * mascota) sale con todas sus animaciones en animales/<id>.png + .json. Un gigante sale en la celda de su ficha.
 * --filas: solo esas filas, en ese orden. --datos: cajas, manos, cabeza y pies por cuadro. --atlas: un atlas por pack
 * (JSON Hash de TexturePacker). --retratos: 7 expresiones en 40 y 96. --cabecitas: ui/cabecitas.png de 12 x 12.
 */
import { mkdirSync, writeFileSync, rmSync, readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSportsKit, SPORT_PACK_NAMES, DEFAULT_SPORT_PACKS, type SportPack } from '../src/engine/kit/sportskit.ts';
import { migrateFicha, validateFicha, isHuman, type HumanFicha, type AnimalFicha, type CellSize } from '../src/engine/sheet/ficha.ts';

const args = process.argv.slice(2);
const flag = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const valued = new Set(['--fichas', '--celda', '--deportes', '--filas']);
const out = args.find((a, i) => !a.startsWith('--') && !valued.has(args[i - 1]));
if (!out) { console.error('Uso: npx tsx scripts/sports-kit.ts <carpeta> [--rapido] [--celda 48] [--deportes atletismo,natacion] [--fichas <carpeta>]'); process.exit(1); }
const cell = Number(flag('--celda') ?? 48) as CellSize;
if (![32, 48, 64].includes(cell)) { console.error('--celda tiene que ser 32, 48 o 64'); process.exit(1); }
const packs = (flag('--deportes')?.split(',') ?? DEFAULT_SPORT_PACKS) as SportPack[];
for (const p of packs) if (!SPORT_PACK_NAMES.includes(p)) { console.error(`deporte desconocido: ${p} (hay ${SPORT_PACK_NAMES.join(', ')})`); process.exit(1); }

// la carpeta se borra entera: solo si está vacía o ya es un kit de PixelForja
if (existsSync(out) && readdirSync(out).length) {
  const m = join(out, 'manifest.json');
  const isKit = existsSync(m) && (() => { try { return JSON.parse(readFileSync(m, 'utf8')).generado_con === 'PixelForja'; } catch { return false; } })();
  if (!isKit) { console.error(`No borro ${out}: no está vacía y no es un kit de PixelForja. Usa una carpeta nueva.`); process.exit(1); }
}

let athletes: Record<string, HumanFicha> | undefined;
const animales: Record<string, AnimalFicha> = {};
const fichasDir = flag('--fichas');
if (fichasDir) {
  athletes = {};
  for (const n of readdirSync(fichasDir).filter((x) => x.endsWith('.ficha.json'))) {
    const id = basename(n, '.ficha.json').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const f = migrateFicha(JSON.parse(readFileSync(join(fichasDir, n), 'utf8')));
    const errs = validateFicha(f);
    if (errs.length) { console.error(`${n}: ficha inválida\n  ${errs.join('\n  ')}`); process.exit(1); }
    // un animal (la mascota) sale con todas sus animaciones en animales/<id>.png
    if (!isHuman(f)) { animales[id] = { ...f, movementProfile: 'premium' }; console.log(`  animal: ${id} (${f.name})`); continue; }
    // los deportes salen con el movimiento premium aunque la ficha diga clásico
    athletes[id] = { ...f, movementProfile: 'premium' };
    console.log(`  atleta: ${id} (${f.name})`);
  }
}

/** Silkscreen (OFL), que viene con el proyecto */
function fuentesSilkscreen() {
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', '@fontsource', 'silkscreen', 'files');
  const ab = (p: string) => { const b = readFileSync(join(dir, p)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length) as ArrayBuffer; };
  return { regular: ab('silkscreen-latin-400-normal.woff'), bold: ab('silkscreen-latin-700-normal.woff') };
}

const t0 = Date.now();
const files = buildSportsKit({
  athletes, packs, cell, quick: args.includes('--rapido'), progress: (m) => console.log(`  ${m}`),
  filas: flag('--filas')?.split(','), datos: args.includes('--datos'), atlas: args.includes('--atlas'),
  retratos: args.includes('--retratos'), cabecitas: args.includes('--cabecitas'), objetos: args.includes('--objetos'), animales,
  fuentes: args.includes('--fuentes') ? fuentesSilkscreen() : undefined,
});
rmSync(out, { recursive: true, force: true });
let bytes = 0;
for (const f of files) {
  const p = join(out, f.name);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, f.bytes);
  bytes += f.bytes.length;
}
console.log(`Kit deportivo listo en ${out}: ${files.length} archivos, ${(bytes / 1e6).toFixed(1)} MB, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
