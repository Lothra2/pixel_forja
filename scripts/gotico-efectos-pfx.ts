// Exporta los efectos mudados de pixelfx (efectos_pfx.ts): una hoja PNG liviana por efecto (paleta de 256 colores
// con alfa), efectos_pfx.json (el manifiesto), luz_efectos_pfx.json (la luz dinámica), LEEME.txt y los avisos de
// licencia de pixelfx.
// Uso: npx tsx scripts/gotico-efectos-pfx.ts <directorio>
// Variables: IDS (filtrar ids, separados por coma), CAT (categoría), SINCRONIZAR=1 (también reescribe
// src/engine/gotico/datos/efectos_pfx.json y luz_efectos_pfx.json, que los tests comparan).
import { writeFileSync, mkdirSync, readFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { EFECTOS_PFX, efectoPfx, pngEfectoPfx, olvidarEfectosPfx, manifiestoDe, luzEfectosPfxJson, LEEME_PFX } = await import('../src/engine/gotico/efectos_pfx.ts');

const dir = process.argv[2];
if (!dir) {
  console.error('uso: npx tsx scripts/gotico-efectos-pfx.ts <directorio>');
  process.exit(1);
}
const filtro = process.env.IDS?.split(',');
const cat = process.env.CAT;
const lista = EFECTOS_PFX.filter((c) => (!filtro || filtro.includes(c.id)) && (!cat || c.categoria === cat));
mkdirSync(dir, { recursive: true });

const t0 = Date.now();
let bytes = 0;
const efectos = [];
for (const c of lista) {
  const t1 = Date.now();
  const e = efectoPfx(c.id);
  const png = pngEfectoPfx(c.id);
  writeFileSync(join(dir, e.archivo), png);
  bytes += png.length;
  efectos.push(e);
  console.log(`${c.id.padEnd(28)} ${String(e.cuadros).padStart(3)}f t${e.t} ${e.direccional ? '8dir' : '    '} ${e.celda.join('x').padStart(8)} ${(png.length / 1024).toFixed(0).padStart(5)} KB  ${Date.now() - t1} ms`);
  // libera la memoria: los cuadros ya están en el png
  olvidarEfectosPfx(c.id);
}
const manifiesto = manifiestoDe(efectos);
const luz = luzEfectosPfxJson(manifiesto);
writeFileSync(join(dir, 'efectos_pfx.json'), JSON.stringify(manifiesto, null, 1));
writeFileSync(join(dir, 'luz_efectos_pfx.json'), JSON.stringify(luz, null, 1));
writeFileSync(join(dir, 'LEEME.txt'), LEEME_PFX);
const vendor = fileURLToPath(new URL('../src/engine/gotico/vendor/pixelfx/', import.meta.url));
copyFileSync(join(vendor, 'LICENSE'), join(dir, 'LICENSE-pixelfx.txt'));
copyFileSync(join(vendor, 'NOTICE.md'), join(dir, 'NOTICE-pixelfx.md'));
console.log(`${efectos.length} efectos, ${(bytes / 1024 / 1024).toFixed(1)} MB de hojas, en ${((Date.now() - t0) / 1000).toFixed(0)} s -> ${dir}`);

if (process.env.SINCRONIZAR === '1') {
  if (filtro || cat) throw new Error('SINCRONIZAR pide todos los efectos (sin IDS ni CAT)');
  const datos = fileURLToPath(new URL('../src/engine/gotico/datos/', import.meta.url));
  writeFileSync(join(datos, 'efectos_pfx.json'), JSON.stringify(manifiesto, null, 1) + '\n');
  writeFileSync(join(datos, 'luz_efectos_pfx.json'), JSON.stringify(luz, null, 1) + '\n');
  // control: lo escrito se vuelve a leer igual
  JSON.parse(readFileSync(join(datos, 'efectos_pfx.json'), 'utf8'));
  console.log('datos sincronizados en', datos);
}
