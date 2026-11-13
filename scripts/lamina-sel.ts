/**
 * Lámina de la presentación del menú ('sel'): un cuadro del reposo de cada clase con la luz de retrato, lado a lado.
 *   npx tsx scripts/lamina-sel.ts <salida.png> [--f 24] [--nivel 0] [--clases a,b]
 */
import { writeFileSync } from 'node:fs';
import { HEROES } from '../src/engine/gotico/catalogo/personajes.ts';
import { pintarSeleccion } from '../src/engine/gotico/sel.ts';
import { createRaster, blit } from '../src/engine/core/raster.ts';
import { encodePng } from '../src/engine/export/png.ts';

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const F = +(arg('--f') ?? 24), NIVEL = +(arg('--nivel') ?? 0), CLASES = arg('--clases')?.split(',');
const hs = HEROES.filter((h) => !CLASES || CLASES.includes(h.id));
const rs = hs.map((h) => pintarSeleccion(h.cuerpo, h.niveles[Math.min(NIVEL, h.niveles.length - 1)], F, { ss: 2 }));
const W = Math.max(...rs.map((r: any) => r.img.w)) + 8, H = Math.max(...rs.map((r: any) => r.img.h)) + 8;
const t = createRaster(W * rs.length, H);
for (let i = 0; i < t.w * t.h; i++) t.data.set([10, 9, 9, 255], i * 4);
rs.forEach((r: any, i: number) => blit(t, r.img, i * W + 4, H - r.img.h - 4));
writeFileSync(process.argv[2], encodePng(t));
console.log('sel', hs.map((h) => h.id).join(' '), t.w, t.h);
