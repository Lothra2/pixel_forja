/**
 * Piloto de Forja 2 (fase 0b): Rick en `luchador` 160 y `cabezon` 48 con guardia, puño fuerte, patada fuerte y recibe.
 *   npx tsx scripts/forja2-piloto.ts
 * Escribe:
 * - docs/forja2/piloto/gif/<estilo>_<movimiento>_x1.gif y _x3.gif (los ticks de cada cuadro, 60 por segundo)
 * - docs/forja2/piloto/lamina_<movimiento>.png: JUEGO (Higgsfield), PIXEL, Forja 2 luchador, el premium chibi de hoy y
 *   Forja 2 cabezón, el mismo movimiento lado a lado
 * - docs/forja2/piloto/calidad.md: el control de calidad y los segundos por cuadro
 * - docs/pelea/FORJA2/assets/luchadores/rick/: el contrato de pelea (hojas y manifest.json), al alto de JUEGO
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodePng, decodePng } from '../src/engine/export/png.ts';
import { encodeGif } from '../src/engine/export/gif.ts';
import { createRaster, blit, crop, upscaleNearest, type Raster } from '../src/engine/core/raster.ts';
import { bitmapFonts, drawText, type BitmapFont } from '../src/engine/ui/fonts.ts';
import { renderClip } from '../src/engine/render/clip.ts';
import { familyFicha } from '../src/engine/rpg/family.ts';
import { RICK_PIXEL } from '../src/engine/luchador/pixel/rick.ts';
import { ANIMS_RICK_PIXEL } from '../src/engine/luchador/pixel/golpesPixel.ts';
import { pintarAnimPixel } from '../src/engine/luchador/pixel/muneco.ts';
import { estilo, medidasDe } from '../src/engine/forja2/estilo.ts';
import { movimiento } from '../src/engine/forja2/biblioteca.ts';
import { muestrear } from '../src/engine/forja2/principios.ts';
import { PERSONAJES, paleta, type Lienzo } from '../src/engine/forja2/figura.ts';
import { exportarAnim, type ResultadoAnim } from '../src/engine/forja2/exportar.ts';
import { controlar, type Informe } from '../src/engine/forja2/calidad.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs/forja2/piloto');
const CONTRATO = join(ROOT, 'docs/pelea/FORJA2/assets/luchadores/rick');
const JUEGO = join(ROOT, 'docs/pelea/JUEGO/assets/luchadores/rick');
for (const d of [OUT, join(OUT, 'gif'), CONTRATO]) mkdirSync(d, { recursive: true });

const MOVS = ['guardia', 'puño_fuerte', 'patada_fuerte', 'recibe_alto'];
/** lo mismo en PIXEL y en el premium chibi de hoy */
const PIXEL: Record<string, string> = { guardia: 'guardia', 'puño_fuerte': 'puño_fuerte', patada_fuerte: 'patada', recibe_alto: 'recibe_alto' };
const CHIBI: Record<string, string> = { guardia: 'guard', 'puño_fuerte': 'punch', patada_fuerte: 'kick_martial', recibe_alto: 'fight_hit' };
const FONDO: [number, number, number] = [58, 62, 84];

const fontDir = join(ROOT, 'node_modules/@fontsource/silkscreen/files');
const ab = (p: string) => { const b = readFileSync(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length) as ArrayBuffer; };
const fuente: BitmapFont = bitmapFonts(ab(join(fontDir, 'silkscreen-latin-400-normal.woff')), ab(join(fontDir, 'silkscreen-latin-700-normal.woff')))[0];

const pj = PERSONAJES.rick;
const PILOTO: { id: string; cell: number; lz: Lienzo; k: number }[] = [
  { id: 'luchador', cell: 160, lz: { w: 224, h: 168, pivot: [92, 162] }, k: 1 },
  { id: 'cabezon', cell: 48, lz: { w: 64, h: 52, pivot: [26, 48] }, k: 3 },
];

const informes: Informe[] = [];
const tiempos: { estilo: string; cuadros: number; seg: number }[] = [];
const f2: Record<string, Record<string, ResultadoAnim>> = {};
for (const p of PILOTO) {
  const e = estilo(p.id), m = medidasDe(e, p.cell);
  f2[p.id] = {};
  let n = 0, seg = 0;
  for (const nombre of MOVS) {
    const { mov, poses } = movimiento('pelea', nombre);
    const cs = muestrear(mov, poses, e, m);
    const r = exportarAnim(pj, e, m, p.cell, mov, cs, p.lz);
    f2[p.id][nombre] = r;
    n += r.pintados.length; seg += r.pintados.reduce((a, q) => a + q.segundos, 0);
    const pegas = r.pega.map((c) => c);
    informes.push(controlar(nombre, p.id, cs, r.pintados, p.lz.pivot, paleta(pj, e, p.cell, r.pintados), pegas, mov.bucle));
    const delays = cs.map((q) => Math.max(2, Math.round((q.ticks * 100) / 60)));
    const frames = r.pintados.map((q) => q.raster);
    writeFileSync(join(OUT, 'gif', `${p.id}_${nombre}_x1.gif`), encodeGif(frames, 60, { background: FONDO, delays }));
    writeFileSync(join(OUT, 'gif', `${p.id}_${nombre}_x3.gif`), encodeGif(frames, 60, { background: FONDO, delays, scale: 3 }));
    console.log(`  ${p.id} ${nombre}: ${cs.length} cuadros`);
  }
  tiempos.push({ estilo: `${p.id} ${p.cell}`, cuadros: n, seg });
}

// ---------- el contrato de pelea, al alto de JUEGO (188 px de Rick, lienzo 256 x 235, pivote 128, 229) ----------
{
  const e = estilo('luchador');
  const juego = JSON.parse(readFileSync(join(JUEGO, 'manifest.json'), 'utf8'));
  const alto: number = juego.alto;
  const cell = Math.round(alto / e.alto);
  const m = medidasDe(e, cell);
  const g = juego.anims.guardia;
  const lz: Lienzo = { w: g.w, h: g.h, pivot: [g.ox, g.oy] };
  const anims: Record<string, unknown> = {};
  let n = 0, seg = 0;
  for (const nombre of MOVS) {
    const { mov, poses } = movimiento('pelea', nombre);
    const r = exportarAnim(pj, e, m, cell, mov, muestrear(mov, poses, e, m), lz);
    writeFileSync(join(CONTRATO, `${nombre}.png`), encodePng(r.hoja));
    anims[nombre] = r.anim;
    n += r.pintados.length; seg += r.pintados.reduce((a, q) => a + q.segundos, 0);
  }
  tiempos.push({ estilo: `luchador ${cell} (contrato, alto ${alto})`, cuadros: n, seg });
  const manifest = {
    id: 'rick', nombre: 'Rick', alto, ciudad: juego.ciudad, poderes: juego.poderes,
    generado_con: 'PixelForja Forja 2 (piloto)', parcial: true,
    notas: 'Piloto de Forja 2: solo guardia, puño_fuerte, patada_fuerte y recibe_alto. Mismo contrato que docs/pelea/JUEGO (ticks, fases y ventanas iguales); el resto de las animaciones, el retrato y los poderes siguen en JUEGO.',
    anims,
  };
  writeFileSync(join(CONTRATO, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}

// ---------- láminas: el mismo movimiento lado a lado ----------
const cortar = (frames: Raster[]): Raster[] => {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (const r of frames) for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (r.data[(y * r.w + x) * 4 + 3]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return frames.map((r) => crop(r, x0 - 2, y0 - 2, x1 - x0 + 5, y1 - y0 + 5));
};
const tiras = (hoja: Raster, w: number) => Array.from({ length: Math.round(hoja.w / w) }, (_, i) => crop(hoja, i * w, 0, w, hoja.h));
for (const nombre of MOVS) {
  const filas: { titulo: string; frames: Raster[]; k: number }[] = [];
  const jm = JSON.parse(readFileSync(join(JUEGO, 'manifest.json'), 'utf8')).anims[nombre];
  filas.push({ titulo: 'JUEGO (Higgsfield, hoy en el juego) x1', frames: cortar(tiras(decodePng(new Uint8Array(readFileSync(join(JUEGO, jm.hoja)))), jm.w)), k: 1 });
  const px = pintarAnimPixel(RICK_PIXEL, (ANIMS_RICK_PIXEL as unknown as Record<string, () => Parameters<typeof pintarAnimPixel>[1]>)[PIXEL[nombre]](), { w: 400, h: 340, ox: 200, oy: 325 });
  filas.push({ titulo: 'PIXEL (guardia de Higgsfield por piezas) x1', frames: cortar(px.cuadros), k: 1 });
  filas.push({ titulo: 'FORJA 2 luchador 160 x1', frames: cortar(f2.luchador[nombre].pintados.map((q) => q.raster)), k: 1 });
  filas.push({ titulo: 'premium chibi de hoy (GG Abyss) 48 x3', frames: cortar(renderClip(familyFicha('rick'), 48, CHIBI[nombre], 'side', { props: true }).frames), k: 3 });
  filas.push({ titulo: 'FORJA 2 cabezon 48 (retro3) x3', frames: cortar(f2.cabezon[nombre].pintados.map((q) => q.raster)), k: 3 });
  const sep = 8, titulo = 14;
  const anchoFila = (f: (typeof filas)[number]) => f.frames.reduce((a, r) => a + r.w * f.k + sep, sep);
  const W = Math.max(...filas.map(anchoFila));
  const H = filas.reduce((a, f) => a + titulo + Math.max(...f.frames.map((r) => r.h)) * f.k + sep, sep);
  const lam = createRaster(W, H);
  for (let i = 0; i < W * H; i++) lam.data.set([...FONDO, 255], i * 4);
  let y = sep;
  for (const f of filas) {
    blit(lam, drawText(fuente, f.titulo), sep, y);
    y += titulo;
    let x = sep;
    const hf = Math.max(...f.frames.map((r) => r.h)) * f.k;
    for (const r of f.frames) { const u = upscaleNearest(r, f.k); blit(lam, u, x, y + hf - u.h); x += u.w + sep; }
    y += hf + sep;
  }
  writeFileSync(join(OUT, `lamina_${nombre}.png`), encodePng(lam));
}

// ---------- la tabla de calidad ----------
const nombresMed = ['pivote', 'patina', 'altura', 'silueta', 'sueltos', 'salto', 'cajas', 'paleta'];
const linea = (i: Informe) => `| ${i.estilo} | ${i.movimiento} | ${i.cuadros} | ${nombresMed.map((n) => { const m = i.medidas.find((x) => x.nombre === n); return m ? `${m.valor}${m.ok ? '' : ' ✗'}` : 'n/a'; }).join(' | ')} | ${i.ok ? 'sí' : 'NO'} |`;
const md = [
  '# Piloto de Forja 2: control de calidad',
  '',
  'Generado por `npx tsx scripts/forja2-piloto.ts`. Topes: pivote 0 px, patina ≤ 1 px, altura ≤ 2 px (±1, solo bucles), silueta ≥ 0,95, sueltos 0, salto ≤ 0,6 (silueta), cajas ≥ 0,5, paleta 0 colores de más. ✗ = no pasa.',
  '',
  `| estilo | movimiento | cuadros | ${nombresMed.join(' | ')} | pasa |`,
  `|---|---|---|${nombresMed.map(() => '---').join('|')}|---|`,
  ...informes.map(linea),
  '',
  '## Segundos por cuadro',
  '',
  '| estilo | cuadros | segundos por cuadro |',
  '|---|---|---|',
  ...tiempos.map((t) => `| ${t.estilo} | ${t.cuadros} | ${(t.seg / t.cuadros).toFixed(2)} |`),
  '',
];
writeFileSync(join(OUT, 'calidad.md'), md.join('\n'));
console.log(md.join('\n'));
