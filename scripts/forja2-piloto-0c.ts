/**
 * Piloto 0c de Forja 2: el movimiento nuevo sobre el cuerpo de hoy. Los mismos 4 movimientos (guardia, puño fuerte,
 * patada fuerte, recibe) del formato de claves y principios, dibujados con el cuerpo y el pintor del premium chibi de
 * GG Abyss a 48, al lado de las animaciones de hoy de ese mismo chibi.
 *   npx tsx scripts/forja2-piloto-0c.ts
 * Escribe en docs/forja2/piloto/0c/: lamina_<movimiento>.png (fila 1 hoy, fila 2 Forja 2, x4), gif/<movimiento>_x1.gif y
 * _x3.gif (los dos lado a lado, cada uno con sus tiempos) y calidad.md.
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodePng } from '../src/engine/export/png.ts';
import { encodeGif } from '../src/engine/export/gif.ts';
import { createRaster, blit, upscaleNearest, type Raster } from '../src/engine/core/raster.ts';
import { bitmapFonts, drawText } from '../src/engine/ui/fonts.ts';
import { renderClip } from '../src/engine/render/clip.ts';
import { familyFicha } from '../src/engine/rpg/family.ts';
import type { Joints } from '../src/engine/render/human.ts';
import { estilo, medidasDe } from '../src/engine/forja2/estilo.ts';
import { movimiento } from '../src/engine/forja2/biblioteca.ts';
import { muestrear } from '../src/engine/forja2/principios.ts';
import { pintarChibi } from '../src/engine/forja2/chibi.ts';
import { controlarCuadros, medirGolpe, type Informe, type Golpeo } from '../src/engine/forja2/calidad.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs/forja2/piloto/0c');
mkdirSync(join(OUT, 'gif'), { recursive: true });
const FONDO: [number, number, number] = [58, 62, 84];
const fontDir = join(ROOT, 'node_modules/@fontsource/silkscreen/files');
const ab = (p: string) => { const b = readFileSync(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length) as ArrayBuffer; };
const fuente = bitmapFonts(ab(join(fontDir, 'silkscreen-latin-400-normal.woff')), ab(join(fontDir, 'silkscreen-latin-700-normal.woff')))[0];

/** el mismo movimiento hoy (premium chibi) y en Forja 2, y qué pega */
const MOVS: { f2: string; hoy: string; pega?: 'handNear' | 'footNear' }[] = [
  { f2: 'guardia', hoy: 'guard' },
  { f2: 'puño_fuerte', hoy: 'punch', pega: 'handNear' },
  { f2: 'patada_fuerte', hoy: 'kick_martial', pega: 'footNear' },
  { f2: 'recibe_alto', hoy: 'fight_hit' },
];
const CELL = 48, PIVOT: [number, number] = [24, 46], K = 4;
const f = familyFicha('rick');
const e = estilo('cabezon'), m = medidasDe(e, CELL);

const informes: Informe[] = [];
const golpes: { mov: string; fila: string; g: Golpeo }[] = [];
const tiempos: { fila: string; cuadros: number; seg: number; ticks: number }[] = [];
const pies = (js: (Joints | undefined)[]) => js.map((j) => [j?.footNear, j?.footFar] as ([number, number] | undefined)[]);

for (const mv of MOVS) {
  // hoy: las animaciones premium del chibi, cuadros parejos a su fps
  let t0 = performance.now();
  const hoy = renderClip(f, CELL, mv.hoy, 'side', { props: true });
  const segHoy = (performance.now() - t0) / 1000;
  const ticksHoy = hoy.frames.map(() => 60 / hoy.fps);
  // Forja 2: el formato de claves con los principios, en el mismo cuerpo
  const { mov, poses } = movimiento('pelea', mv.f2);
  t0 = performance.now();
  const cs = muestrear(mov, poses, e, m);
  const nuevo = pintarChibi(f, CELL, cs);
  const segNuevo = (performance.now() - t0) / 1000;
  const ticksNuevo = cs.map((q) => q.ticks);
  tiempos.push({ fila: `hoy ${mv.hoy}`, cuadros: hoy.frames.length, seg: segHoy, ticks: Math.round(ticksHoy.reduce((a, b) => a + b, 0)) });
  tiempos.push({ fila: `Forja 2 ${mv.f2}`, cuadros: nuevo.frames.length, seg: segNuevo, ticks: ticksNuevo.reduce((a, b) => a + b, 0) });

  informes.push(controlarCuadros(mv.f2, 'hoy', hoy.frames, PIVOT, pies(hoy.joints ?? []), hoy.loop));
  informes.push(controlarCuadros(mv.f2, 'Forja 2', nuevo.frames, PIVOT, pies(nuevo.joints), mov.bucle));
  if (mv.pega) {
    const impHoy = Math.min(hoy.frames.length - 1, Math.floor((hoy.events?.find((x) => x.type === 'impacto')?.phase ?? 0) * hoy.frames.length + 1e-6));
    const impNuevo = cs.findIndex((q) => q.impacto);
    const j1 = hoy.joints!, j2 = nuevo.joints.map((j) => j!);
    golpes.push({ mov: mv.f2, fila: 'hoy', g: medirGolpe(j1.map((j) => j[mv.pega!]), j1.map((j) => j.head), impHoy) });
    golpes.push({ mov: mv.f2, fila: 'Forja 2', g: medirGolpe(j2.map((j) => j[mv.pega!]), j2.map((j) => j.head), impNuevo) });
  }

  // lámina: fila 1 hoy, fila 2 Forja 2, x4
  const filas: [string, Raster[]][] = [[`HOY: premium chibi (${mv.hoy}) x${K}`, hoy.frames], [`FORJA 2: movimiento nuevo, mismo cuerpo (${mv.f2}) x${K}`, nuevo.frames]];
  const sep = 8, tit = 14, n = Math.max(hoy.frames.length, nuevo.frames.length);
  const W = sep + n * (CELL * K + sep), H = sep + filas.length * (tit + CELL * K + sep);
  const lam = createRaster(W, H);
  for (let i = 0; i < W * H; i++) lam.data.set([...FONDO, 255], i * 4);
  filas.forEach(([t, fr], r) => {
    const y = sep + r * (tit + CELL * K + sep);
    blit(lam, drawText(fuente, t), sep, y);
    fr.forEach((x, i) => blit(lam, upscaleNearest(x, K), sep + i * (CELL * K + sep), y + tit));
  });
  writeFileSync(join(OUT, `lamina_${mv.f2}.png`), encodePng(lam));

  // GIF: los dos lado a lado, cada uno con sus tiempos (se recorre la unión de los cortes en ticks)
  const cortes = (t: number[]) => t.reduce<number[]>((a, v) => [...a, (a[a.length - 1] ?? 0) + v], []);
  const c1 = cortes(ticksHoy), c2 = cortes(ticksNuevo);
  const total = Math.max(c1[c1.length - 1], c2[c2.length - 1]);
  const marcas = [...new Set([...c1, ...c2].map((v) => Math.round(v * 100) / 100))].filter((v) => v <= total).sort((a, b) => a - b);
  const cuadroEn = (c: number[], t: number) => { const i = c.findIndex((v) => t < v - 1e-6); return i < 0 ? c.length - 1 : i; };
  const frames: Raster[] = [], delays: number[] = [];
  let prev = 0;
  for (const t of marcas) {
    const d = createRaster(CELL * 2 + 4, CELL);
    blit(d, hoy.frames[cuadroEn(c1, prev)], 0, 0);
    blit(d, nuevo.frames[cuadroEn(c2, prev)], CELL + 4, 0);
    frames.push(d); delays.push(Math.max(2, Math.round(((t - prev) * 100) / 60)));
    prev = t;
  }
  writeFileSync(join(OUT, 'gif', `${mv.f2}_x1.gif`), encodeGif(frames, 60, { background: FONDO, delays }));
  writeFileSync(join(OUT, 'gif', `${mv.f2}_x3.gif`), encodeGif(frames, 60, { background: FONDO, delays, scale: 3 }));
  console.log(`  ${mv.f2}: hoy ${hoy.frames.length} cuadros, Forja 2 ${nuevo.frames.length}`);
}

const MED = ['pivote', 'patina', 'altura', 'sueltos', 'salto', 'colores'];
const md = [
  '# Piloto 0c: movimiento de Forja 2 sobre el cuerpo del premium chibi de hoy',
  '',
  'Generado por `npx tsx scripts/forja2-piloto-0c.ts`. Mismo cuerpo, mismo pintor, misma celda (48), vista de lado. Topes: pivote 0 px, patina ≤ 1 px, altura ≤ 2 px (bucles), sueltos 0, salto de silueta ≤ 0,6, colores ≤ 48. ✗ = no pasa.',
  '',
  `| movimiento | fila | cuadros | ${MED.join(' | ')} | pasa |`,
  `|---|---|---|${MED.map(() => '---').join('|')}|---|`,
  ...informes.map((i) => `| ${i.movimiento} | ${i.estilo} | ${i.cuadros} | ${MED.map((n) => { const x = i.medidas.find((y) => y.nombre === n); return x ? `${x.valor}${x.ok ? '' : ' ✗'}` : 'n/a'; }).join(' | ')} | ${i.ok ? 'sí' : 'NO'} |`),
  '',
  '## El golpe, medido (pixeles de la celda de 48)',
  '',
  'recogido: cuánto se va para atrás el puño o el pie antes del impacto. alcance: cuánto llega adelante. sobrepaso: cuánto sigue la cabeza después del impacto. arco: cuánto se aparta el camino de la línea recta.',
  '',
  '| movimiento | fila | recogido | alcance | sobrepaso | arco |',
  '|---|---|---|---|---|---|',
  ...golpes.map((g) => `| ${g.mov} | ${g.fila} | ${g.g.recogido} | ${g.g.alcance} | ${g.g.sobrepaso} | ${g.g.arco} |`),
  '',
  '## Tiempos',
  '',
  '| fila | cuadros | ticks (60 por segundo) | segundos por cuadro |',
  '|---|---|---|---|',
  ...tiempos.map((t) => `| ${t.fila} | ${t.cuadros} | ${t.ticks} | ${(t.seg / t.cuadros).toFixed(3)} |`),
  '',
];
writeFileSync(join(OUT, 'calidad.md'), md.join('\n'));
console.log(md.join('\n'));
