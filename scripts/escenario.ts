/**
 * Genera un escenario oblicuo desde su layout:
 *
 *   npm run escenario -- <layout.json> <carpeta> [--postales] [--ficha] [--semilla n] [--contorno #hex ...]
 *
 * Escribe <carpeta>/<id>/ con todo lo de la sección 10.3 del pedido. Valida, pinta y corre las 9 pruebas: si una
 * falla no escribe nada y sale con código 1. Las postales y la ficha son para aprobar y salen solo si se piden.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { generarEscenario } from '../src/engine/world/oblique';

const args = process.argv.slice(2);
const flag = (f: string) => { const i = args.indexOf(f); if (i < 0) return false; args.splice(i, 1); return true; };
const valor = (f: string) => { const i = args.indexOf(f); if (i < 0) return undefined; const v = args[i + 1]; args.splice(i, 2); return v; };
const postales = flag('--postales'), ficha = flag('--ficha');
const semilla = valor('--semilla');
const contornos: string[] = [];
for (let c = valor('--contorno'); c; c = valor('--contorno')) contornos.push(c);
const [entrada, salida] = args;
if (!entrada || !salida) {
  console.error('Uso: npm run escenario -- <layout.json> <carpeta> [--postales] [--ficha] [--semilla n] [--contorno #hex]');
  process.exit(2);
}
const t0 = Date.now();
const r = generarEscenario(JSON.parse(readFileSync(entrada, 'utf8')), { postales, ficha, semilla: semilla ? +semilla : undefined, contornos: contornos.length ? contornos : undefined });
for (const a of r.avisos) console.warn(`aviso: ${a}`);
for (const p of r.pruebas) console.log(`${p.ok ? '  ok ' : 'FALLA'} ${p.n}. ${p.nombre}: ${p.detalle}`);
if (!r.ok) {
  for (const e of r.errores) console.error(`error: ${e}`);
  process.exit(1);
}
const dir = join(salida, r.id!);
rmSync(dir, { recursive: true, force: true });
let bytes = 0;
for (const a of r.archivos) { const p = join(dir, a.nombre); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, a.bytes); bytes += a.bytes.length; }
console.log(`Escenario ${r.id} listo en ${dir}: ${r.archivos.length} archivos, ${(bytes / 1e6).toFixed(2)} MB, ${Date.now() - t0} ms`);
