import { createRaster, blit, type Raster } from '../core/raster';
import { renderBoss, camMatrix, type BossScene } from './render';
import { bossPoses, type BossAnimDef } from './anim';
import { solveBiped, type BossPose, type BossDims, type Joints } from './rig';
import { secondaryAt, type Secondary } from './secondary';
import { add, mul, mv, type V3 } from './sdf';

/**
 * Hojas de jefe en 8 direcciones (fila = dirección en el orden del kit, columna = cuadro), dibujadas a su tamaño
 * final. El pivote sale de medir los pies de verdad en todos los cuadros y direcciones: el punto más bajo que queda
 * debajo del apoyo (los pies cerca de la cámara bajan un poco en la vista de arriba) define la fila del pivote.
 */

/** Direcciones del kit y hacia dónde mira el cuerpo en cada una (0 derecha, 90 hacia la cámara). */
export const KIT_DIRS = ['down', 'down_left', 'left', 'up_left', 'up', 'up_right', 'right', 'down_right'] as const;
export const DIR_YAW: Record<(typeof KIT_DIRS)[number], number> = { down: 90, down_left: 135, left: 180, up_left: 225, up: 270, up_right: 315, right: 0, down_right: 45 };

export interface BossSpec {
  id: string;
  cell: number;
  dims: (cell: number) => BossDims;
  scene: (cell: number, pose: BossPose, sec?: Secondary) => BossScene;
  anims: BossAnimDef[];
  /** punto que pega en los impactos (la cabeza del mazo), a partir del esqueleto */
  strikePoint?: (j: Joints, d: BossDims) => V3;
  /** variantes de color: nombre y cambio de materiales */
  elev?: number;
  /** retoque final de cada cuadro ya recortado (la sombra se deshace al morir) */
  post?: (r: Raster, anim: string, frame: number, frames: number) => void;
}

export interface BossClip {
  def: BossAnimDef;
  /** [dirección][cuadro] */
  frames: Raster[][];
  pivot: [number, number];
  overflow: number;
  /** punto de impacto por dirección (pixeles desde el pivote), por evento de impacto */
  strike?: Record<number, [number, number][]>;
  /** dónde caen los pies (medio de los tobillos, en el piso) en el primer cuadro, por dirección, desde el pivote */
  feet: [number, number][];
}

/** Caché de cuadros (dibujar jefes grandes tarda): clave de la escena y su imagen. */
export interface BossCache { get(key: string): Raster | null; set(key: string, r: Raster): void }

function hashStr(s: string): string {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619); h2 = Math.imul(h2 ^ c, 2246822519); }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}

/** Versión del pintor: si cambia cómo se dibuja, la caché vieja no sirve. */
export const BOSS_RENDER_VERSION = 5;

/** Poses del clip con su movimiento secundario (lo que cuelga va 2 cuadros atrás del cuerpo). */
export function clipScenes(spec: BossSpec, def: BossAnimDef, cell: number): { poses: BossPose[]; scenes: BossScene[]; joints: Joints[] } {
  const poses = bossPoses(def);
  const d = spec.dims(cell);
  const joints = poses.map((p) => solveBiped(d, p));
  const motion = joints.map((j) => ({ x: j.pelvis[0] / d.s, y: j.pelvis[1] / d.s }));
  const scenes = poses.map((p, f) => spec.scene(cell, p, secondaryAt(motion, f, def.loop)));
  return { poses, scenes, joints };
}

/**
 * Dibuja todas las animaciones de un jefe en las 8 direcciones con un pivote común (el mismo para todas, así el
 * juego no tiene que corregir nada al cambiar de animación).
 */
export function renderBossSheets(spec: BossSpec, cache?: BossCache, log?: (m: string) => void): { clips: BossClip[]; pivot: [number, number] } {
  const cell = spec.cell;
  // se pinta una vez con mucho margen (el lienzo completo va a la caché) y después se recorta con el pivote medido
  const probe: [number, number] = [cell / 2, cell / 2];
  type Raw = { full: Raster; origin: [number, number]; ext: { x0: number; y0: number; x1: number; y1: number } | null };
  const raw: { def: BossAnimDef; frames: Raw[][]; joints: Joints[] }[] = [];
  let maxBelow = 0, maxAbove = 0;
  for (const def of spec.anims) {
    const { scenes, joints } = clipScenes(spec, def, cell);
    const rows = KIT_DIRS.map((dir) => scenes.map((sc): Raw => {
      const view = { yaw: DIR_YAW[dir], elev: spec.elev };
      const key = hashStr(JSON.stringify([BOSS_RENDER_VERSION, cell, view, sc]));
      const hit = cache?.get(key);
      const M = Math.round(cell / 2);
      const origin: [number, number] = [M + probe[0], M + probe[1]];
      if (hit) return { full: hit, origin, ext: extentOf(hit, origin) };
      const f = renderBoss(sc, cell, view, probe);
      cache?.set(key, f.full);
      return { full: f.full, origin: f.origin, ext: f.extent };
    }));
    for (const row of rows) for (const f of row) {
      if (!f.ext) continue;
      maxBelow = Math.max(maxBelow, f.ext.y1);
      maxAbove = Math.max(maxAbove, -f.ext.y0);
    }
    raw.push({ def, frames: rows, joints });
    log?.(`${spec.id}: ${def.name} ${def.frames} cuadros x 8`);
  }
  // el pivote baja lo justo para que quepan los pies de abajo; arriba tiene que alcanzar
  const pivotY = cell - 2 - Math.max(0, maxBelow);
  const pivot: [number, number] = [cell / 2, pivotY];
  const clips: BossClip[] = raw.map(({ def, frames, joints }) => {
    let overflow = 0;
    const out = frames.map((row) => row.map((f, fi) => {
      const r = createRaster(cell, cell);
      const dx = pivot[0] - f.origin[0], dy = pivot[1] - f.origin[1];
      for (let y = 0; y < f.full.h; y++)
        for (let x = 0; x < f.full.w; x++) {
          const si = (y * f.full.w + x) * 4;
          if (!f.full.data[si + 3]) continue;
          const X = x + dx, Y = y + dy;
          if (X < 0 || Y < 0 || X >= cell || Y >= cell) { overflow++; continue; }
          const ti = (Y * cell + X) * 4;
          for (let c = 0; c < 4; c++) r.data[ti + c] = f.full.data[si + c];
        }
      spec.post?.(r, def.name, fi, row.length);
      return r;
    }));
    let strike: BossClip['strike'];
    if (spec.strikePoint && def.events?.some((e) => e.type === 'impacto')) {
      strike = {};
      const d = spec.dims(cell);
      for (const e of def.events.filter((x) => x.type === 'impacto')) {
        const p = spec.strikePoint(joints[e.frame], d);
        strike[e.frame] = KIT_DIRS.map((dir) => {
          const c = mv(camMatrix({ yaw: DIR_YAW[dir], elev: spec.elev }), p);
          return [Math.round(c[0]), Math.round(-c[1])];
        });
      }
    }
    const j0 = joints[0];
    const mid: V3 = [(j0.ankles.near[0] + j0.ankles.far[0]) / 2, 0, (j0.ankles.near[2] + j0.ankles.far[2]) / 2];
    const feet = KIT_DIRS.map((dir): [number, number] => { const c = mv(camMatrix({ yaw: DIR_YAW[dir], elev: spec.elev }), mid); return [Math.round(c[0] * 10) / 10, Math.round(-c[1] * 10) / 10]; });
    return { def, frames: out, pivot, overflow, strike, feet };
  });
  if (maxAbove > pivotY) log?.(`${spec.id}: ¡no cabe! sobresale ${maxAbove - pivotY} px por arriba`);
  return { clips, pivot };
}

/** Caja de lo dibujado en un lienzo, respecto de su origen. */
function extentOf(r: Raster, o: [number, number]): { x0: number; y0: number; x1: number; y1: number } | null {
  const b = boundsOf(r);
  return b ? { x0: b.x0 - o[0], y0: b.y0 - o[1], x1: b.x1 - o[0], y1: b.y1 - o[1] } : null;
}

function boundsOf(r: Raster): { x0: number; y0: number; x1: number; y1: number } | null {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (r.data[(y * r.w + x) * 4 + 3]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return y1 < 0 ? null : { x0, y0, x1, y1 };
}

/** Hoja PNG de un clip: fila = dirección, columna = cuadro. */
export function clipSheet(c: BossClip, cell: number): Raster {
  const n = c.def.frames;
  const out = createRaster(n * cell, 8 * cell);
  c.frames.forEach((row, ri) => row.forEach((fr, ci) => blit(out, fr, ci * cell, ri * cell)));
  return out;
}

/** Punto de la cabeza del mazo (o lo que pegue) para el juego. */
export function weaponHead(len: number) {
  return (j: Joints, d: BossDims): V3 => (j.weapon ? add(j.weapon.grip, mul(j.weapon.dir, len * d.s)) : j.hands.near);
}
