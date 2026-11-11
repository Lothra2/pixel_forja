/**
 * Tiras de revisión a plena luz (sin clave baja) y recortadas al cuerpo, para mirar la animación cuadro a cuadro:
 *   npx tsx scripts/revisar-anim.ts <carpeta> --clase berserker [--nivel 1] [--accs caminar,correr] [--dirs se,so] [--esc 3] [--monstruos]
 * Una imagen por acción: una fila por dirección, un cuadro por columna (celda 96×100, ancla en 48,84), ampliada ×esc.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { personaje } from '../src/engine/gotico/cuerpo.ts';
import { pintarEscena } from '../src/engine/gotico/render.ts';
import { cuadrosDe, type Accion, type Dir } from '../src/engine/gotico/figura.ts';
import { Lienzo, texto } from '../src/engine/gotico/hud.ts';
import { createRaster, blit, upscaleNearest, type Raster } from '../src/engine/core/raster.ts';
import { encodePng } from '../src/engine/export/png.ts';
import { SUJETOS_HEROES, SUJETOS_MONSTRUOS } from './qa-heroes.ts';

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const SALIDA = process.argv[2];
const NIVEL = +(arg('--nivel') ?? 1), ESC = +(arg('--esc') ?? 3);
const DIRS = (arg('--dirs') ?? 'se,so').split(',') as Dir[];
const ACCS = (arg('--accs') ?? 'quieto,caminar,correr,atacar,lanzar,herido,morir').split(',') as Accion[];
const CUADROS = arg('--cuadros')?.split(',').map(Number);
const CW = +(arg('--cw') ?? 96), CH = +(arg('--ch') ?? 100), AX = CW / 2, AY = CH - 16;
mkdirSync(SALIDA, { recursive: true });
const pintar = (r: Raster, x: number, y: number, w: number, h: number, c: [number, number, number, number]) => {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < r.w && j < r.h) r.data.set(c, (j * r.w + i) * 4);
};
for (const h of process.argv.includes('--monstruos') ? SUJETOS_MONSTRUOS : SUJETOS_HEROES) {
  if (arg('--clase') && !arg('--clase')!.split(',').includes(h.id)) continue;
  const [nn, eq] = h.niveles[Math.min(NIVEL, h.niveles.length - 1)];
  for (const acc of ACCS) {
    if (!h.acciones.includes(acc)) continue;
    const n = cuadrosDe(acc, h.cuerpo.presentacion), fs = CUADROS ?? Array.from({ length: n }, (_, i) => i);
    const k = Math.max(1, h.cuerpo.alto ?? 1), cw = Math.round(CW * k), ch = Math.round(CH * k);
    const t = createRaster(fs.length * cw, DIRS.length * ch);
    pintar(t, 0, 0, t.w, t.h, [70, 66, 62, 255]);
    DIRS.forEach((dir, fi) => fs.forEach((f, c) => {
      const x0 = c * cw, y0 = fi * ch;
      pintar(t, x0 + 1, y0 + 1, cw - 1, ch - 1, [96, 92, 88, 255]);
      pintar(t, x0 + Math.round(AX * k) - 8, y0 + Math.round(AY * k), 17, 1, [60, 56, 52, 255]);
      const r = pintarEscena({ piezas: personaje(h.cuerpo, eq, dir, acc, f), sinSombra: true }, {}, { w: cw, h: ch, ax: Math.round(AX * k), ay: Math.round(AY * k) });
      blit(t, r.img, x0, y0);
      texto(Lienzo.de(t), x0 + 3, y0 + 3, `${dir} ${f}`, [30, 28, 26], { sombra: null });
    }));
    writeFileSync(join(SALIDA, `${h.id}_${nn}_${acc}.png`), encodePng(upscaleNearest(t, ESC)));
    console.log(h.id, nn, acc);
  }
}
