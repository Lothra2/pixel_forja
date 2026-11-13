/**
 * Lámina de diseño: los 8 héroes de pie (quieto, cuadro 2), en 2 direcciones y con el primer y el último nivel de
 * equipo, a ×3 sobre fondo neutro. Para criticar la figura como diseñador (proporción, silueta, lectura, material).
 *   npx tsx scripts/lamina-heroes.ts <salida.png> [--acc atacar --f 5] [--k 3] [--clases a,b]
 */
import { writeFileSync } from 'node:fs';
import { personajeEscena } from '../src/engine/gotico/cuerpo.ts';
import { pintarEscena } from '../src/engine/gotico/render.ts';
import type { Accion, Dir } from '../src/engine/gotico/figura.ts';
import { createRaster, blit, upscaleNearest } from '../src/engine/core/raster.ts';
import { encodePng } from '../src/engine/export/png.ts';
import { SUJETOS_HEROES, sujetoMonstruo } from './qa-heroes.ts';

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const ACC = (arg('--acc') ?? 'quieto') as Accion, F = +(arg('--f') ?? 2), K = +(arg('--k') ?? 3);
const DIRS = (arg('--dirs') ?? 'so,se').split(',') as Dir[];
const CLASES = arg('--clases')?.split(',');
const CW = 112, CH = 124, AX = 56, AY = 104;
// --luz '<json>': campos de Iluminacion que pisan los del personaje (para probar una luz sin tocar el motor)
const LUZ_PRUEBA = arg('--luz') ? JSON.parse(arg('--luz')!) : null;
const FONDO = (arg('--fondo') ?? '46,42,40').split(',').map(Number);
// --monstruos: los del catálogo (una sola columna de equipo cada uno)
const { MONSTRUOS } = await import('../src/engine/gotico/catalogo/personajes.ts');
const base = process.argv.includes('--monstruos') ? MONSTRUOS.map(sujetoMonstruo) : SUJETOS_HEROES;
const suj = base.filter((h) => !CLASES || CLASES.includes(h.id));
const cols = DIRS.length * (base[0].niveles.length > 1 ? 2 : 1);
const t = createRaster(suj.length * cols * CW, CH);
for (let i = 0; i < t.w * t.h; i++) t.data.set([FONDO[0], FONDO[1], FONDO[2], 255], i * 4);
suj.forEach((h, hi) => {
  const nvs = h.niveles.length > 1 ? [h.niveles[0], h.niveles[h.niveles.length - 1]] : [h.niveles[0]];
  nvs.forEach(([, eq], ni) => DIRS.forEach((dir, di) => {
    const e = personajeEscena(h.cuerpo, eq, dir, ACC, F); const r = pintarEscena({ ...e, luz: LUZ_PRUEBA ? { ...e.luz, ...LUZ_PRUEBA } : e.luz, sinSombra: true }, {}, { w: CW, h: CH, ax: AX, ay: AY });
    blit(t, r.img, (hi * cols + ni * DIRS.length + di) * CW, 0);
  }));
});
writeFileSync(process.argv[2], encodePng(upscaleNearest(t, K)));
console.log('lámina', suj.map((s) => s.id).join(' '), t.w * K, t.h * K);
