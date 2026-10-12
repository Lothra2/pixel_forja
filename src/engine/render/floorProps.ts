import { createRaster, blit, type Raster } from '../core/raster';
import { LayerCanvas, finalizeOutlines, toRaster, Layer } from './canvas';
import { Materials } from './materials';
import { Part } from './part';
import { makeRamp } from '../color/ramp';
import { BASE, SHADOW } from '../color/ramp';
import { drawFloorProp, drawPoteLid, floorPropGrip, rotatePart, FLOOR_PROPS, FLOOR_PROP_KINDS, type FloorPropKind, type FloorPropOpts } from './props';
import { rotateRaster } from '../fx/fx';
import { packAtlas, type TexturePackerHash } from '../export/atlas';

/**
 * Armas del piso como sprites sueltos (para el piso, la mano y el aire), con su contorno. Cada una en una celda
 * cuadrada; en `quieto` la base del objeto (centro de abajo) queda en el pivote (cell / 2, cell - 2), igual que los
 * personajes, así el juego la pone en el piso o en la `carga` de quien la levanta sin hacer cuentas.
 */

/** La celda de los objetos para personajes de celda `cell`: la mitad (24 para 48). Entra el más largo girado. */
export const objectCell = (cell: number) => Math.round(cell / 2);

/** Pinta una pieza en una celda con contorno. (ox, oy) es dónde cae el (0, 0) de la pieza. */
function partRaster(part: Part, size: number, ox: number, oy: number, color?: string): Raster {
  const canvas = new LayerCanvas(size, size, ox, oy);
  const mats = new Materials({});
  if (color) mats.add('p_color0', makeRamp(color));
  for (const [x, y, p] of part.entries()) {
    const slot = p.slot === BASE && !part.has(x + 1, y) ? SHADOW : p.slot;
    canvas.put(x, y, Layer.Prop, mats.paint(p.mat, slot));
  }
  finalizeOutlines(canvas, { fused: [] });
  return canvas.bbox() ? toRaster(canvas, 0, 0, size, size, 0, 0) : createRaster(size, size);
}

/** Color de la variante i (o el de siempre). */
const variantColor = (kind: FloorPropKind, i = 0) => FLOOR_PROPS[kind].colores?.[i] ?? FLOOR_PROPS[kind].colores?.[0];

/**
 * Sprite suelto de un arma del piso. `size` es el lado de la celda (por defecto la de un personaje de 48: también
 * sirve la del personaje, el objeto queda en su escala).
 */
export function floorPropSprite(kind: FloorPropKind, cell = 48, opts: FloorPropOpts & { variant?: number; size?: number } = {}): Raster {
  const u = cell / 48, size = opts.size ?? cell;
  const part = new Part();
  drawFloorProp(part, kind, [0, 0], u, opts);
  return partRaster(part, size, Math.floor(size / 2), size - 2, variantColor(kind, opts.variant));
}

/** El objeto girado `deg` grados en la mano: el agarre queda en el centro de la celda. */
export function heldPropSprite(kind: FloorPropKind, cell: number, deg: number, opts: FloorPropOpts & { variant?: number; size?: number } = {}): Raster {
  const u = cell / 48, size = opts.size ?? objectCell(cell);
  const [gx, gy] = floorPropGrip(kind, u, opts);
  const tmp = new Part();
  drawFloorProp(tmp, kind, [-gx, -gy], u, opts);
  return partRaster(rotatePart(tmp, deg), size, Math.floor(size / 2), Math.floor(size / 2), variantColor(kind, opts.variant));
}

/** Cuadros de cada animación de un objeto (celda de objeto). */
export function floorPropAnims(kind: FloorPropKind, cell = 48, variant = 0): Record<string, Raster[]> {
  const size = objectCell(cell), info = FLOOR_PROPS[kind];
  const one = (o: FloorPropOpts = {}) => floorPropSprite(kind, cell, { ...o, variant, size });
  const out: Record<string, Raster[]> = { quieto: [one()] };
  // en el aire: gira sobre su centro con RotSprite (los que rotan); 8 cuadros por vuelta
  if (info.rota) {
    const centered = (o: FloorPropOpts = {}) => {
      const r = one(o), w = createRaster(size, size);
      // el centro del dibujo al centro de la celda (en el piso estaba apoyado abajo)
      let y0 = size, y1 = -1;
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (r.data[(y * size + x) * 4 + 3]) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      blit(w, r, 0, Math.round(size / 2 - (y0 + y1) / 2));
      return w;
    };
    const c = centered();
    out.girando = Array.from({ length: 8 }, (_, i) => rotateRaster(c, i * 45));
  }
  // en la mano: 16 ángulos, con el agarre en el centro de la celda (0 = apunta a la derecha, horario)
  for (let k = 0; k < 16; k++) out[`mano_${k}`] = [heldPropSprite(kind, cell, k * 22.5, { variant, size })];
  if (kind === 'pote_basura') {
    out.sin_tapa = [one({ lid: false })];
    const lid = new Part();
    drawPoteLid(lid, [0, 0], cell / 48);
    out.tapa = [partRaster(lid, size, Math.floor(size / 2), size - 2)];
  }
  if (kind === 'paraguas') out.abierto = [one({ open: true })];
  if (kind === 'abanico') out.abierto = [one({ open: true })];
  if (kind === 'termo') out.vapor = Array.from({ length: 4 }, (_, i) => one({ phase: i }));
  if (kind === 'volante_dacau') out.volando = Array.from({ length: 4 }, (_, i) => one({ phase: i }));
  if (kind === 'chapa') {
    // volando: la chapa girando con una estela de su color
    out.volando = (out.girando ?? [one()]).slice(0, 4).map((r) => {
      const w = createRaster(size, size);
      blit(w, r, 0, 0);
      const col = variantColor(kind, variant) ?? '#d23c3c';
      const rgb = [1, 3, 5].map((i) => parseInt(col.slice(i, i + 2), 16));
      for (let k = 1; k <= 4; k++) { const x = Math.floor(size / 2) - 2 - k * 2, y = Math.floor(size / 2); if (x >= 0) w.data.set([...rgb, 255 - k * 50], (y * size + x) * 4); }
      return w;
    });
  }
  return out;
}

/** Nombre de cuadro en el atlas de objetos: `<id>_<anim>_<cuadro>`. */
export const objectFrameName = (id: string, anim: string, i: number) => `${id}_${anim}_${i}`;

export interface ObjectEntry {
  atlas: string;
  /** ancho y alto del objeto parado en el piso, en pixeles */
  w: number; h: number;
  /** dónde se agarra, en el cuadro `quieto` */
  agarre: [number, number];
  peso: 'liviano' | 'medio' | 'pesado';
  rota: boolean;
  uso: string;
  nombre: { es: string; en: string };
  anims: Record<string, number>;
}

/**
 * Atlas de todas las armas del piso (JSON Hash de TexturePacker) y la entrada de cada una para el manifiesto. Las
 * variantes de color son ids aparte (`silla_plastica_azul`...). Cuadros: `quieto` (base en el pivote), `girando`
 * (centrado), `mano` de 16 cuadros (agarre en el centro, cuadro k girado k * 22.5 grados) y los propios de cada objeto.
 * `kinds` elige cuáles (sin valor: todas).
 */
export function buildObjectsAtlas(cell = 48, image = 'armas.png', kinds: readonly FloorPropKind[] = FLOOR_PROP_KINDS): { png: Raster; json: TexturePackerHash; objetos: Record<string, ObjectEntry> } {
  const size = objectCell(cell), u = cell / 48;
  const frames: { name: string; raster: Raster }[] = [];
  const objetos: Record<string, ObjectEntry> = {};
  const COLOR_NAMES: Record<string, string> = { '#d23c3c': 'roja', '#3d6fd6': 'azul', '#4caf50': 'verde', '#2bb3a3': 'turquesa', '#e0466a': 'rosada', '#f2c94c': 'amarilla', '#24305e': 'negra', '#8a4fd6': 'morada', '#e2b23c': 'dorada' };
  for (const kind of kinds) {
    const cols = FLOOR_PROPS[kind].colores ?? [undefined];
    cols.forEach((col, v) => {
      const id = v === 0 ? kind : `${kind}_${COLOR_NAMES[col!] ?? v}`;
      const raw = floorPropAnims(kind, cell, v);
      // en la mano: una animación `mano` de 16 cuadros (uno por ángulo)
      const anims: Record<string, Raster[]> = Object.fromEntries(Object.entries(raw).filter(([a]) => !a.startsWith('mano_')));
      anims.mano = Array.from({ length: 16 }, (_, k) => raw[`mano_${k}`][0]);
      for (const [a, rs] of Object.entries(anims)) rs.forEach((r, i) => frames.push({ name: objectFrameName(id, a, i), raster: r }));
      const q = anims.quieto[0];
      let x0 = size, x1 = -1, y0 = size;
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (q.data[(y * size + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); }
      const [gx, gy] = floorPropGrip(kind, u);
      objetos[id] = {
        atlas: image.replace(/\.png$/, '.json'), w: x1 - x0 + 1, h: size - 1 - y0, agarre: [Math.floor(size / 2) + gx, size - 2 + gy],
        peso: FLOOR_PROPS[kind].peso, rota: FLOOR_PROPS[kind].rota, uso: FLOOR_PROPS[kind].uso, nombre: FLOOR_PROPS[kind].nombre,
        anims: Object.fromEntries(Object.entries(anims).map(([a, rs]) => [a, rs.length])),
      };
    });
  }
  const { png, json } = packAtlas(frames, size, image, [size / 2, size - 2]);
  return { png, json, objetos };
}
