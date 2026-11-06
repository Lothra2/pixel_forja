import { createRaster, type Raster } from '../core/raster';
import { leerHorneado, tomaDeHorneado, type MetaHorneado, type MetaTira } from './cine3d_toma';
import type { Toma } from './cine_toma';
import { decodePng } from '../export/png';

/**
 * Empaquetado de la intro 3D para el juego (que está al borde de su límite de archivos): todas las capas horneadas de
 * todos los planos van en pocas páginas (atlas) de hasta 4096 px de lado y 16 Mpx, y cada capa dice su `recorte`
 * [sx, sy, sw, sh] dentro de su página. Las tiras van enteras (su grilla): el cuadro k está en
 * sx + (k % columnas) * w, sy + floor(k / columnas) * h, y se dibuja agrandado `escala` veces.
 */
export const PAGINA_MAX = 4096, PAGINA_MPX = 16_000_000;

/** Por estantes, de la más alta a la más baja, con 2 px de aire; cada página se recorta a lo que usa. */
export function empaquetar(imgs: Raster[]): { paginas: Raster[]; donde: [number, number, number][] } {
  const orden = imgs.map((_, i) => i).sort((a, b) => imgs[b].h - imgs[a].h || imgs[b].w - imgs[a].w), A = 2;
  const pags: { items: [number, number, number][]; w: number; h: number }[] = [], donde: [number, number, number][] = [];
  let pg: (typeof pags)[number] | null = null, x = 0, y = 0, fila = 0;
  for (const i of orden) {
    const r = imgs[i];
    if (r.w > PAGINA_MAX || r.h > PAGINA_MAX) throw new Error(`una capa de ${r.w}x${r.h} no entra en una página`);
    if (pg && x + r.w > PAGINA_MAX) { x = 0; y += fila + A; fila = 0; }
    if (!pg || y + r.h > PAGINA_MAX || Math.max(pg.w, x + r.w) * Math.max(pg.h, y + r.h) > PAGINA_MPX) { pg = { items: [], w: 0, h: 0 }; pags.push(pg); x = 0; y = 0; fila = 0; }
    pg.items.push([i, x, y]); donde[i] = [pags.length - 1, x, y];
    pg.w = Math.max(pg.w, x + r.w); pg.h = Math.max(pg.h, y + r.h);
    x += r.w + A; fila = Math.max(fila, r.h);
  }
  const paginas = pags.map((p) => {
    const R = createRaster(p.w, p.h);
    for (const [i, px, py] of p.items) { const r = imgs[i]; for (let yy = 0; yy < r.h; yy++) R.data.set(r.data.subarray(yy * r.w * 4, (yy + 1) * r.w * 4), ((py + yy) * p.w + px) * 4); }
    return R;
  });
  return { paginas, donde };
}

export interface CapaPaquete { id: string; pagina: number; recorte: [number, number, number, number]; x: number; y: number; w: number; h: number; paralaje: number; mezcla: 'normal' | 'sumar'; anim?: Record<string, unknown> }
/** Lee lo horneado de los planos y lo empaqueta: páginas y, por plano, sus capas (en px de la capa de 1408 x 792). */
export function paqueteIntro3d(ids: string[], decodificar: (b: Uint8Array) => Raster): { paginas: Raster[]; planos: Record<string, { capas: CapaPaquete[]; particulas?: MetaHorneado['particulas'] }> } {
  const imgs: Raster[] = [], capas: { plano: string; c: Omit<CapaPaquete, 'pagina' | 'recorte'>; i: number }[] = [], planos: Record<string, { capas: CapaPaquete[]; particulas?: MetaHorneado['particulas'] }> = {};
  for (const id of ids) {
    const h = leerHorneado(id, decodificar); if (!h) continue;
    const e = h.meta.escala ?? 1, pon = (r: Raster, c: Omit<CapaPaquete, 'pagina' | 'recorte'>) => { capas.push({ plano: id, c, i: imgs.length }); imgs.push(r); };
    planos[id] = { capas: [], particulas: h.meta.particulas };
    const geo = (f: MetaTira) => ({ x: Math.round(f.x / e), y: Math.round(f.y / e), w: Math.round((f.w * f.escala) / e), h: Math.round((f.h * f.escala) / e) });
    const cuadros = (f: MetaTira) => ({ tipo: 'cuadros', columnas: f.columnas, cuadros: f.cuadros, fps: f.fps, w: f.w, h: f.h });
    // en orden de dibujo: el fondo, lo que se mueve (normal), el frente, las tiras de fuego (suman) y las luces a su tiempo (suman)
    if (h.fondo) pon(h.fondo, { id: 'fondo', x: 0, y: 0, w: 1408, h: 792, paralaje: h.meta.paralaje, mezcla: 'normal' });
    (h.meta.moviles ?? []).forEach((f, n) => pon(h.moviles[n], { id: `movil_${n + 1}`, ...geo(f), paralaje: h.meta.paralaje, mezcla: 'normal', anim: cuadros(f) }));
    if (h.frente) pon(h.frente, { id: 'frente', x: 0, y: 0, w: 1408, h: 792, paralaje: 1, mezcla: 'normal' });
    h.meta.fuegos.forEach((f, n) => pon(h.fuegos[n], { id: `fuego_${n + 1}`, ...geo(f), paralaje: h.meta.paralaje, mezcla: 'sumar', anim: cuadros(f) }));
    (h.meta.luces ?? []).forEach((f, n) => pon(h.luces[n], { id: `luz_${n + 1}`, ...geo(f), paralaje: h.meta.paralaje, mezcla: 'sumar', ...(f.anim ? { anim: f.anim as unknown as Record<string, unknown> } : {}) }));
  }
  const { paginas, donde } = empaquetar(imgs);
  for (const { plano, c, i } of capas) { const [pg, x, y] = donde[i]; planos[plano].capas.push({ ...c, pagina: pg, recorte: [x, y, imgs[i].w, imgs[i].h] }); }
  return { paginas, planos };
}

/**
 * Los pintores de la intro para el reproductor de control (cinematicas.ts): cada plano arma su toma con lo horneado. Un
 * plano que todavía no tiene horneado sale negro, con una capa que lo avisa (`falta_horneado`).
 */
export function pintoresIntro3d(ids: string[]): Record<string, (t: Toma) => void> {
  return Object.fromEntries(ids.map((id) => [`intro/${id}`, (t: Toma) => {
    const h = leerHorneado(id, decodePng);
    if (h) { tomaDeHorneado(t, h); return; }
    const L = t.capa('falta_horneado', 0, 1, 'normal', { opaca: true, notas: `falta hornear ${id} (scripts/gotico-cine3d.ts)` });
    for (let i = 3; i < L.d.length; i += 4) L.d[i] = 1;
  }]));
}
