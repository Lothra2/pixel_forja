import { createRaster, type Raster } from '../core/raster';
import { LayerCanvas, finalizeOutlines, toRaster, Layer } from './canvas';
import { Materials } from './materials';
import { Part } from './part';
import { BASE, SHADOW } from '../color/ramp';
import { drawFloorProp, type FloorPropKind } from './props';

/**
 * Sprite suelto de un arma del piso, con su contorno, en una celda cuadrada. La base del objeto (centro de abajo)
 * queda en el pivote de la celda (cell / 2, cell - 2), igual que los personajes: el juego lo pone en el piso o en la
 * `carga` de quien lo levanta sin hacer cuentas.
 */
export function floorPropSprite(kind: FloorPropKind, cell = 48, opts: { lid?: boolean } = {}): Raster {
  const u = cell / 48;
  const part = new Part();
  drawFloorProp(part, kind, [0, 0], u, opts.lid ?? true);
  const canvas = new LayerCanvas(cell, cell, Math.floor(cell / 2), cell - 2);
  const mats = new Materials({});
  for (const [x, y, p] of part.entries()) {
    // la cara de la izquierda en la sombra del borde, como el resto del motor
    const slot = !part.has(x - 1, y) && p.slot > BASE ? BASE : p.slot === BASE && !part.has(x + 1, y) ? SHADOW : p.slot;
    canvas.put(x, y, Layer.Prop, mats.paint(p.mat, slot));
  }
  finalizeOutlines(canvas, { fused: [] });
  return canvas.bbox() ? toRaster(canvas, 0, 0, cell, cell, 0, 0) : createRaster(cell, cell);
}
