import type { Raster } from '../core/raster';
import { VIEW_SUFFIX, type RenderedClip, type ViewName } from '../render/clip';
import type { Joints } from '../render/human';

/**
 * Datos por cuadro para los juegos de pelea y de deportes (cajas, manos, cabeza y pies) y el filtro de filas.
 *
 * Todo va en pixeles de la celda, relativo al pivote (el punto de apoyo: centro de abajo de la celda), con y hacia
 * abajo. Así el juego suma la posición del personaje y listo, sin importar el tamaño de la celda.
 */

/** Nombres de fila del kit (los mismos que `direcciones`) y la vista que dibuja cada una. */
export const ROW_VIEW: Record<string, ViewName> = Object.fromEntries(Object.entries(VIEW_SUFFIX).map(([v, s]) => [s, v as ViewName]));
export const ROW_NAMES = Object.keys(ROW_VIEW);

/** Las vistas que hay que dibujar para unas filas pedidas, en ese orden. Avisa si una fila no existe. */
export function viewsForRows(filas: readonly string[]): ViewName[] {
  const bad = filas.filter((f) => !ROW_VIEW[f]);
  if (bad.length) throw new Error(`filas desconocidas: ${bad.join(', ')} (se puede pedir: ${ROW_NAMES.join(', ')})`);
  if (new Set(filas).size !== filas.length) throw new Error(`filas repetidas: ${filas.join(', ')}`);
  return filas.map((f) => ROW_VIEW[f]);
}

export type FrameDataField = 'cajas' | 'cuerpo' | 'manos' | 'cabeza' | 'pies' | 'carga';
export const FRAME_DATA_FIELDS: FrameDataField[] = ['cajas', 'cuerpo', 'manos', 'cabeza', 'pies', 'carga'];

type Box = [number, number, number, number];
type Pt = [number, number];

export interface FrameData {
  /** [fila][cuadro] = [x, y, w, h] del recuadro de lo opaco, desde el pivote. null si el cuadro está vacío */
  cajas?: (Box | null)[][];
  /** igual que cajas pero solo la persona: sin implementos, pelotas ni efectos (el hurtbox) */
  cuerpo?: (Box | null)[][];
  /** [fila][cuadro] = [[x, y] mano cercana, [x, y] mano lejana] */
  manos?: [Pt, Pt][][];
  /** [fila][cuadro] = [x, y] del centro de la cabeza */
  cabeza?: Pt[][];
  /** [fila][cuadro] = [[x, y] pie cercano, [x, y] pie lejano] */
  pies?: [Pt, Pt][][];
  /**
   * [fila][cuadro] = [x, y] donde apoya su base lo que se lleva (levantar, llevar, lanzar), o null en los cuadros
   * sin carga. Solo en las animaciones que cargan algo
   */
  carga?: (Pt | null)[][];
}

/** Recuadro de los pixeles opacos de un cuadro, en coordenadas del cuadro (null si no hay ninguno). */
export function opaqueBox(r: Raster): { x0: number; y0: number; x1: number; y1: number } | null {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    if (!r.data[(y * r.w + x) * 4 + 3]) continue;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

/** El pivote de una celda: centro de abajo, dos pixeles arriba del borde (donde apoyan los pies). */
export const pivotOf = (cell: number): Pt => [cell / 2, cell - 2];

/**
 * Datos por cuadro de una hoja (una fila por clip, en el orden de las filas). Las cajas salen de los pixeles; las
 * articulaciones, del esqueleto del cuadro (redondeadas al pixel). Si un clip no trae articulaciones (animales),
 * esos campos no se exportan.
 */
export function frameDataOf(clips: RenderedClip[], fields: readonly FrameDataField[]): FrameData {
  const out: FrameData = {};
  if (!clips.length || !fields.length) return out;
  const [px, py] = pivotOf(clips[0].cell);
  const rel = ([x, y]: [number, number]): Pt => [Math.round(x - px), Math.round(y - py)];
  if (fields.includes('cajas')) out.cajas = clips.map((c) => c.frames.map((fr) => {
    const b = opaqueBox(fr);
    return b ? [b.x0 - px, b.y0 - py, b.x1 - b.x0 + 1, b.y1 - b.y0 + 1] : null;
  }));
  // el cuerpo sale del render (separa implementos y efectos): solo en las animaciones premium de personas
  if (fields.includes('cuerpo') && clips.every((c) => c.wholes)) out.cuerpo = clips.map((c) => c.wholes!.map((w) => (w ? [w.x0 - px, w.y0 - py, w.x1 - w.x0 + 1, w.y1 - w.y0 + 1] : null)));
  const withJoints = clips.every((c) => c.joints && c.joints.length === c.frames.length);
  if (!withJoints) return out;
  const J = (c: RenderedClip) => c.joints as Joints[];
  if (fields.includes('manos')) out.manos = clips.map((c) => J(c).map((j) => [rel(j.handNear), rel(j.handFar)] as [Pt, Pt]));
  if (fields.includes('cabeza')) out.cabeza = clips.map((c) => J(c).map((j) => rel(j.head)));
  if (fields.includes('pies')) out.pies = clips.map((c) => J(c).map((j) => [rel(j.footNear), rel(j.footFar)] as [Pt, Pt]));
  if (fields.includes('carga') && clips.some((c) => J(c).some((j) => j.carry))) out.carga = clips.map((c) => J(c).map((j) => (j.carry ? rel(j.carry) : null)));
  return out;
}
