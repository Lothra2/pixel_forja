/**
 * Hojas de animación de los héroes para revisar como animador: por clase, una tira por acción y dirección a escala de
 * juego (1 px por unidad, el héroe mide ~75 px), con el cuadro de impacto marcado en rojo (y los otros contactos en
 * naranja) y la cruz del piso en el ancla para ver si los pies patinan; una hoja ×2 de la dirección suroeste y un GIF con
 * todas las acciones seguidas a su ritmo (t de ANIM_HEROE a 25 cps).
 *   npx tsx scripts/hojas-heroes.ts <carpeta> [--clase berserker] [--nivel 1] [--dirs so,se,ne]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HEROES } from '../src/engine/gotico/catalogo/personajes.ts';
import { personajeEscena } from '../src/engine/gotico/cuerpo.ts';
import { pintarEscena } from '../src/engine/gotico/render.ts';
import { ANIM_HEROE, CLASE_ESTILO, cuadrosDe, type Accion, type Dir } from '../src/engine/gotico/figura.ts';
import { Lienzo, texto } from '../src/engine/gotico/hud.ts';
import { createRaster, blit, upscaleNearest, type Raster } from '../src/engine/core/raster.ts';
import { encodePng } from '../src/engine/export/png.ts';
import { encodeGif } from '../src/engine/export/gif.ts';
import { nivelesQA, SUJETOS_HEROES, SUJETOS_MONSTRUOS, sujetoMonstruo } from './qa-heroes.ts';

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const SALIDA = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'hojas_heroes';
const NIVEL = +(arg('--nivel') ?? 1);
const DIRS_HOJA = (arg('--dirs') ?? 'so,se,ne').split(',') as Dir[];
const ACCS: Accion[] = ['quieto', 'caminar', 'correr', 'atacar', 'lanzar', 'herido', 'morir'];
const CW = 128, CH = 124, AX = 64, AY = 104, IZQ = 70, ARR = 16;
const FONDO: [number, number, number, number] = [38, 34, 31, 255];

const pintar = (r: Raster, x: number, y: number, w: number, h: number, c: [number, number, number, number]) => {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < r.w && j < r.h) r.data.set(c, (j * r.w + i) * 4);
};
function cuadro(cu: (typeof HEROES)[number]['cuerpo'], eq: Parameters<typeof personajeEscena>[1], dir: Dir, acc: Accion, f: number, k = 1): Raster {
  const r = pintarEscena({ ...personajeEscena(cu, eq, dir, acc, f), sinSombra: true }, {}, { w: Math.round(CW * k), h: Math.round(CH * k), ax: Math.round(AX * k), ay: Math.round(AY * k) });
  return r.img;
}

/** Paleta común de 254 colores para el GIF (popularidad en cubos de 5 bits y el más cercano para el resto). */
function cuantizar(frs: Raster[]): Raster[] {
  const cuenta = new Map<number, number>();
  const cubo = (r: number, g: number, b: number) => ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
  for (const f of frs) for (let i = 0; i < f.w * f.h; i++) if (f.data[i * 4 + 3]) { const k = cubo(f.data[i * 4], f.data[i * 4 + 1], f.data[i * 4 + 2]); cuenta.set(k, (cuenta.get(k) ?? 0) + 1); }
  const pal = [...cuenta].sort((a, b) => b[1] - a[1]).slice(0, 254).map(([k]) => [((k >> 10) & 31) * 8 + 4, ((k >> 5) & 31) * 8 + 4, (k & 31) * 8 + 4]);
  const cache = new Map<number, number[]>();
  const cerca = (k: number) => {
    let c = cache.get(k); if (c) return c;
    const r = ((k >> 10) & 31) * 8 + 4, g = ((k >> 5) & 31) * 8 + 4, b = (k & 31) * 8 + 4;
    let m = Infinity; for (const p of pal) { const d = (p[0] - r) ** 2 * 2 + (p[1] - g) ** 2 * 3 + (p[2] - b) ** 2; if (d < m) { m = d; c = p; } }
    cache.set(k, c!); return c!;
  };
  return frs.map((f) => {
    const o = createRaster(f.w, f.h);
    for (let i = 0; i < f.w * f.h; i++) if (f.data[i * 4 + 3] > 127) { const c = cerca(cubo(f.data[i * 4], f.data[i * 4 + 1], f.data[i * 4 + 2])); o.data[i * 4] = c[0]; o.data[i * 4 + 1] = c[1]; o.data[i * 4 + 2] = c[2]; o.data[i * 4 + 3] = 255; }
    return o;
  });
}

mkdirSync(SALIDA, { recursive: true });
// --tira <acción>: solo una tira por clase con esa acción en las direcciones pedidas (filas), a ×2
// (--monstruos: los monstruos humanoides de la QA en vez de los héroes; los cuadros son los de los monstruos)
const TIRA = arg('--tira') as Accion | undefined;
const { MONSTRUOS } = await import('../src/engine/gotico/catalogo/personajes.ts');
const todosMonstruos = [...SUJETOS_MONSTRUOS, ...MONSTRUOS.filter((m) => !SUJETOS_MONSTRUOS.some((x) => x.id === m.id)).map(sujetoMonstruo)];
if (TIRA) for (const h of process.argv.includes('--monstruos') ? todosMonstruos : SUJETOS_HEROES) {
  if (arg('--clase') && h.id !== arg('--clase')) continue;
  const a = { cuadros: cuadrosDe(TIRA, h.cuerpo.presentacion) }, [nombreNivel, eq] = h.niveles[Math.min(NIVEL, h.niveles.length - 1)];
  // los cuerpos grandes (ogro, trol, gigante) van en celdas más grandes, a la misma escala
  const k = Math.max(1, h.cuerpo.alto ?? 1), cw = Math.round(CW * k), ch = Math.round(CH * k);
  const t = createRaster(IZQ + a.cuadros * cw, ARR + DIRS_HOJA.length * ch);
  pintar(t, 0, 0, t.w, t.h, [24, 21, 19, 255]);
  texto(Lienzo.de(t), 4, 4, `${h.id}${nombreNivel ? ` (${nombreNivel})` : ''} · ${TIRA}`, [230, 210, 170]);
  DIRS_HOJA.forEach((dir, fi) => {
    const y0 = ARR + fi * ch;
    texto(Lienzo.de(t), 4, y0 + 44, dir, [230, 210, 170]);
    for (let f = 0; f < a.cuadros; f++) {
      const x0 = IZQ + f * cw;
      pintar(t, x0 + 1, y0 + 1, cw - 2, ch - 2, FONDO);
      pintar(t, x0 + Math.round(AX * k) - 6, y0 + Math.round(AY * k), 13, 1, [90, 80, 70, 255]);
      blit(t, cuadro(h.cuerpo, eq, dir, TIRA, f, k), x0, y0);
      texto(Lienzo.de(t), x0 + 4, y0 + 4, String(f), [120, 110, 100], { sombra: null });
    }
  });
  writeFileSync(join(SALIDA, `${h.id}${nombreNivel ? '_' + nombreNivel : ''}_${TIRA}_${DIRS_HOJA.join('-')}.png`), encodePng(upscaleNearest(t, 2)));
  console.log('tira', h.id, nombreNivel, TIRA);
}
if (!TIRA) for (const h of HEROES) {
  if (arg('--clase') && h.id !== arg('--clase')) continue;
  const clase = CLASE_ESTILO[h.cuerpo.presentacion!], anim = ANIM_HEROE[clase];
  const [nombreNivel, eq] = nivelesQA(h)[NIVEL];
  const filas = ACCS.flatMap((acc) => DIRS_HOJA.map((dir) => ({ acc, dir })));
  const hoja = createRaster(IZQ + 12 * CW, ARR + filas.length * CH);
  pintar(hoja, 0, 0, hoja.w, hoja.h, [24, 21, 19, 255]);
  const L = Lienzo.de(hoja);
  texto(L, 4, 4, `${h.nombre[0]} (${nombreNivel}): cuadros a escala de juego; rojo = impacto, naranja = otros contactos`, [230, 210, 170]);
  const tiras = new Map<string, Raster[]>();
  filas.forEach(({ acc, dir }, fi) => {
    const a = anim[acc], y0 = ARR + fi * CH;
    texto(L, 4, y0 + 40, acc, [230, 210, 170]);
    texto(L, 4, y0 + 52, `${dir} ${a.cuadros}c t${a.t}`, [150, 140, 120]);
    const fr: Raster[] = [];
    for (let f = 0; f < a.cuadros; f++) {
      const x0 = IZQ + f * CW;
      pintar(hoja, x0 + 1, y0 + 1, CW - 2, CH - 2, FONDO);
      // la cruz del piso en el ancla (los pies plantados no deberían moverse respecto de ella)
      pintar(hoja, x0 + AX - 6, y0 + AY, 13, 1, [90, 80, 70, 255]); pintar(hoja, x0 + AX, y0 + AY - 3, 1, 7, [90, 80, 70, 255]);
      const img = cuadro(h.cuerpo, eq, dir, acc, f);
      blit(hoja, img, x0, y0);
      fr.push(img);
      if (a.impacto === f) pintar(hoja, x0 + 2, y0 + CH - 5, CW - 4, 3, [220, 40, 30, 255]);
      else if (a.golpes?.includes(f)) pintar(hoja, x0 + 2, y0 + CH - 5, CW - 4, 3, [230, 140, 30, 255]);
      texto(L, x0 + 4, y0 + 4, String(f), [120, 110, 100], { sombra: null });
    }
    tiras.set(`${acc}/${dir}`, fr);
  });
  writeFileSync(join(SALIDA, `${h.id}_${nombreNivel}_hoja.png`), encodePng(hoja));
  // la dirección suroeste a ×2, para mirar de cerca
  const d0 = DIRS_HOJA[0];
  const cerca = createRaster(IZQ + 12 * CW, ARR + ACCS.length * CH);
  pintar(cerca, 0, 0, cerca.w, cerca.h, [24, 21, 19, 255]);
  ACCS.forEach((acc, fi) => {
    const y0 = ARR + fi * CH;
    texto(Lienzo.de(cerca), 4, y0 + 40, acc, [230, 210, 170]);
    (tiras.get(`${acc}/${d0}`) ?? []).forEach((img, f) => {
      const x0 = IZQ + f * CW;
      pintar(cerca, x0 + 1, y0 + 1, CW - 2, CH - 2, FONDO);
      blit(cerca, img, x0, y0);
      if (anim[acc].impacto === f) pintar(cerca, x0 + 2, y0 + CH - 5, CW - 4, 3, [220, 40, 30, 255]);
    });
  });
  writeFileSync(join(SALIDA, `${h.id}_${nombreNivel}_${d0}_x2.png`), encodePng(upscaleNearest(cerca, 2)));
  // el GIF: todas las acciones seguidas a su ritmo (cada cuadro dura t ticks de 1/25 s; t 1.5 alterna 1 y 2)
  const gif: Raster[] = [];
  const poner = (img: Raster, t: number, k: number) => { const n = Math.max(1, Math.round(t * (k + 1)) - Math.round(t * k)); for (let i = 0; i < n; i++) gif.push(img); };
  for (const acc of ACCS) {
    const fr = tiras.get(`${acc}/${d0}`) ?? [], a = anim[acc];
    const vueltas = acc === 'quieto' || acc === 'caminar' || acc === 'correr' ? 2 : 1;
    let k = 0;
    for (let v = 0; v < vueltas; v++) for (const img of fr) poner(img, a.t, k++);
    if (acc === 'morir') for (let i = 0; i < 12; i++) gif.push(fr[fr.length - 1]);
  }
  writeFileSync(join(SALIDA, `${h.id}_${nombreNivel}_${d0}.gif`), encodeGif(cuantizar(gif), 25, { scale: 2, background: [38, 34, 31] }));
  console.log('hecho', h.id, nombreNivel);
}
