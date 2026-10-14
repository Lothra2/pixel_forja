/**
 * Láminas de las cinemáticas del final (encargo F13 de GG Abyss, partes 1 y 2) en docs/entregas/:
 *   npx tsx scripts/lamina-cine.ts [bajada|fin|todo] [solo-un-panel]
 *
 * - cine_bajada.png y cine_fin.png: cada panel armado con todas sus capas (como lo ve el juego, sin franjas), en tres
 *   momentos: el primer cuadro, el del medio y el último. Los de 480 x 540 van en dos mitades.
 * - cine_logos.png: el logo de hielo y el de "Fin" cuadro por cuadro, y la nieve de adelante.
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRaster, type Raster } from '../src/engine/core/raster.ts';
import { encodePng } from '../src/engine/export/png.ts';
import { bajadaPanels, nieveFrente, logoHielo, type CinePanel } from '../src/engine/cine/bajada.ts';
import { finPanels, logoFin } from '../src/engine/cine/fin.ts';
import { textoMascara } from '../src/engine/ui/fonts.ts';

const what = process.argv[2] ?? 'todo';
const solo = process.argv[3];
const OUT = 'docs/entregas';
mkdirSync(OUT, { recursive: true });
const save = (name: string, r: Raster) => { writeFileSync(`${OUT}/${name}`, encodePng(r)); console.log(`  ${OUT}/${name} ${r.w}x${r.h}`); };
function over(dst: Raster, src: Raster, ox: number, oy: number) {
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    const X = ox + x, Y = oy + y;
    if (X < 0 || Y < 0 || X >= dst.w || Y >= dst.h) continue;
    const s = (y * src.w + x) * 4, a = src.data[s + 3] / 255;
    if (!a) continue;
    const d = (Y * dst.w + X) * 4;
    for (let c = 0; c < 3; c++) dst.data[d + c] = dst.data[d + c] * (1 - a) + src.data[s + c] * a;
    dst.data[d + 3] = 255;
  }
}
/** el panel armado en el momento t (0 a 1): cada capa en su cuadro de ese momento */
function armar(p: CinePanel, t: number): Raster {
  const r = createRaster(p.w, p.h);
  for (let i = 0; i < r.data.length; i += 4) r.data.set([0, 0, 0, 255], i);
  for (const c of p.capas) over(r, c.frames[Math.min(c.frames.length - 1, Math.floor(t * c.frames.length))], 0, 0);
  return r;
}
function lamina(name: string, panels: CinePanel[]) {
  const T = [0, 0.5, 0.99], G = 6;
  const filas = panels.map((p) => (p.h > 270 ? 2 : 1));
  const img = createRaster(T.length * (480 + G) + G, filas.reduce((a, n) => a + n * (270 + G), 0) + G);
  for (let i = 0; i < img.data.length; i += 4) img.data.set([40, 40, 48, 255], i);
  let y = G;
  panels.forEach((p, k) => {
    T.forEach((t, c) => {
      const a = armar(p, t);
      for (let m = 0; m < filas[k]; m++) {
        const part = createRaster(480, 270);
        for (let yy = 0; yy < 270; yy++) for (let x = 0; x < 480; x++) { const s = ((yy + m * 270) * a.w + x) * 4; part.data.set(a.data.subarray(s, s + 4), (yy * 480 + x) * 4); }
        over(img, part, G + c * (480 + G), y + m * (270 + G));
      }
    });
    y += filas[k] * (270 + G);
  });
  save(name, img);
}
const fontDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', '@fontsource', 'silkscreen', 'files');
const ab = (p: string) => { const b = readFileSync(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length) as ArrayBuffer; };
const bold = ab(join(fontDir, 'silkscreen-latin-700-normal.woff'));

if (what === 'bajada' || what === 'todo') lamina('cine_bajada.png', bajadaPanels().filter((p) => !solo || p.id === solo));
if (what === 'fin' || what === 'todo') lamina('cine_fin.png', finPanels().filter((p) => !solo || p.id === solo));
if (what === 'logos' || what === 'todo') {
  const lh = logoHielo([textoMascara(bold, 'EL CORAZÓN', 6), textoMascara(bold, 'HELADO', 6)]);
  const lf = logoFin(textoMascara(bold, 'Fin', 8), textoMascara(bold, '¿o no?', 2));
  const nv = nieveFrente();
  const w = Math.max(lh[0].w, lf[0].w);
  const img = createRaster(w * 4 + 50, lh[0].h * 4 + lf[0].h * 4 + 140 + 60);
  for (let i = 0; i < img.data.length; i += 4) img.data.set([4, 4, 8, 255], i);
  lh.forEach((fr, i) => over(img, fr, 10 + (i % 4) * (w + 10), 10 + Math.floor(i / 4) * lh[0].h));
  const y0 = 20 + lh[0].h * 4;
  lf.forEach((fr, i) => over(img, fr, 10 + (i % 4) * (w + 10), y0 + Math.floor(i / 4) * lf[0].h));
  nv.forEach((fr, i) => over(img, fr, 10 + i * 132, y0 + lf[0].h * 4 + 10));
  save('cine_logos.png', img);
}
