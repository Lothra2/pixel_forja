import { createRaster, blit, type Raster } from '../core/raster';

/**
 * Atlas de cuadros en el formato "JSON Hash" de TexturePacker, el que Phaser carga con `this.load.atlas(clave, png,
 * json)`. Todos los cuadros de un atlas son de la misma celda, así que se acomodan en grilla (sin recortar): el pivote
 * queda en el mismo lugar de cada cuadro y el juego no tiene que corregir nada.
 */

export const MAX_ATLAS = 4096;

export interface AtlasFrame { name: string; raster: Raster }

export interface TexturePackerHash {
  frames: Record<string, {
    frame: { x: number; y: number; w: number; h: number };
    rotated: false;
    trimmed: false;
    spriteSourceSize: { x: number; y: number; w: number; h: number };
    sourceSize: { w: number; h: number };
    pivot: { x: number; y: number };
  }>;
  meta: { app: string; version: string; image: string; format: 'RGBA8888'; size: { w: number; h: number }; scale: '1' };
}

/** Columnas y filas de la grilla: lo más cuadrada posible sin pasar de 4096 de ancho. */
export function atlasGrid(count: number, cell: number): { cols: number; rows: number } {
  const maxCols = Math.floor(MAX_ATLAS / cell);
  const cols = Math.max(1, Math.min(maxCols, Math.ceil(Math.sqrt(count))));
  return { cols, rows: Math.ceil(count / cols) };
}

/**
 * Arma el atlas. `pivot` es el punto de apoyo dentro de la celda (va en cada cuadro como fracción, como lo usa Phaser).
 * Si los cuadros no entran en 4096 x 4096 avisa con un error: hay que partir el pack.
 */
export function packAtlas(frames: AtlasFrame[], cell: number, image: string, pivot: [number, number]): { png: Raster; json: TexturePackerHash } {
  if (!frames.length) throw new Error(`atlas ${image}: no hay cuadros`);
  const names = new Set<string>();
  for (const f of frames) {
    if (f.raster.w !== cell || f.raster.h !== cell) throw new Error(`atlas ${image}: el cuadro ${f.name} mide ${f.raster.w}x${f.raster.h} y la celda es ${cell}`);
    if (names.has(f.name)) throw new Error(`atlas ${image}: cuadro repetido ${f.name}`);
    names.add(f.name);
  }
  const { cols, rows } = atlasGrid(frames.length, cell);
  const W = cols * cell, H = rows * cell;
  if (H > MAX_ATLAS) throw new Error(`atlas ${image}: ${frames.length} cuadros de ${cell} no entran en ${MAX_ATLAS} x ${MAX_ATLAS} (harían falta ${H} px de alto). Partí el pack en dos`);
  const png = createRaster(W, H);
  const json: TexturePackerHash = { frames: {}, meta: { app: 'PixelForja', version: '1', image, format: 'RGBA8888', size: { w: W, h: H }, scale: '1' } };
  frames.forEach((f, i) => {
    const x = (i % cols) * cell, y = Math.floor(i / cols) * cell;
    blit(png, f.raster, x, y);
    json.frames[f.name] = {
      frame: { x, y, w: cell, h: cell }, rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: cell, h: cell }, sourceSize: { w: cell, h: cell },
      pivot: { x: pivot[0] / cell, y: pivot[1] / cell },
    };
  });
  return { png, json };
}

/** Nombre de un cuadro en el atlas: `<anim>_<fila>_<cuadro>`. */
export const atlasFrameName = (anim: string, row: string, frame: number) => `${anim}_${row}_${frame}`;
