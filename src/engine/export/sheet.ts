import { type Raster, createRaster, blit } from '../core/raster';
import type { RenderedClip } from '../render/clip';

export const SHEET_COLS = 8;

export interface SheetAnim {
  start: number;
  frames: number;
  fps: number;
  loop: boolean;
}

/** JSON genérico: es un atlas "JSON Hash" que Phaser carga directo, más la lista de animaciones. */
export interface SheetJson {
  frames: Record<string, { frame: { x: number; y: number; w: number; h: number }; rotated: false; trimmed: false; spriteSourceSize: { x: 0; y: 0; w: number; h: number }; sourceSize: { w: number; h: number } }>;
  animations: Record<string, string[]>;
  cell: [number, number];
  pivot: [number, number];
  cols: number;
  anims: Record<string, SheetAnim>;
  meta: { app: string; version: string; image: string; format: 'RGBA8888'; size: { w: number; h: number }; scale: '1' };
}

/**
 * Hoja: cada animación empieza en una fila nueva, 8 cuadros por fila.
 * Así `start` siempre es múltiplo de 8 y es fácil de leer a ojo.
 */
export function packSheet(clips: RenderedClip[], imageName: string): { png: Raster; json: SheetJson } {
  const cell = clips[0].cell;
  let row = 0;
  const placed = clips.map((c) => {
    const start = row * SHEET_COLS;
    row += Math.ceil(c.frames.length / SHEET_COLS);
    return { c, start };
  });
  const png = createRaster(SHEET_COLS * cell, Math.max(1, row) * cell);
  const json: SheetJson = {
    frames: {}, animations: {}, cell: [cell, cell], pivot: [cell / 2, cell - 2], cols: SHEET_COLS, anims: {},
    meta: { app: 'PixelForja', version: '0.0.1', image: imageName, format: 'RGBA8888', size: { w: png.w, h: png.h }, scale: '1' },
  };
  for (const { c, start } of placed) {
    json.anims[c.name] = { start, frames: c.frames.length, fps: c.fps, loop: c.loop };
    json.animations[c.name] = [];
    c.frames.forEach((fr, i) => {
      const idx = start + i;
      const x = (idx % SHEET_COLS) * cell, y = Math.floor(idx / SHEET_COLS) * cell;
      blit(png, fr, x, y);
      const key = `${c.name}_${i}`;
      json.frames[key] = { frame: { x, y, w: cell, h: cell }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w: cell, h: cell }, sourceSize: { w: cell, h: cell } };
      json.animations[c.name].push(key);
    });
  }
  return { png, json };
}
