import { createRaster, type Raster } from '../core/raster';
import { NesCell, NES_CELL, NES_FOOT, NES_INK, body, head, rgb, nesShade, type NesPose, type NesView } from './draw';
import { NES_ANIMS } from './poses';
import type { NesLook } from './look';

/** Las filas del estilo (las de la izquierda salen por espejo, como en las hojas de la forja para Phaser). */
export const NES_DIRS: Record<string, NesView> = { right: 'side', down_right: 'side', up_right: 'side', down: 'front', up: 'back' };
export const NES_MIRROR = { left: 'right', down_left: 'down_right', up_left: 'up_right' } as const;

/** Gira un cuadro sobre un punto, pixel a pixel (vecino más cercano: el pixel art no se emborrona). */
export function rotateNearest(src: Raster, deg: number, cx: number, cy: number, tx = 0, ty = 0): Raster {
  const out = createRaster(src.w, src.h), a = (-deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    const dx = x - cx - tx, dy = y - cy - ty, sx = Math.round(cx + dx * c - dy * s), sy = Math.round(cy + dx * s + dy * c);
    if (sx < 0 || sy < 0 || sx >= src.w || sy >= src.h) continue;
    const i = (sy * src.w + sx) * 4;
    if (src.data[i + 3]) out.data.set(src.data.subarray(i, i + 4), (y * src.w + x) * 4);
  }
  return out;
}

/** Un cuadro de una persona en el estilo Nekketsu. */
export function nesFrame(L: NesLook, view: NesView, p: NesPose): Raster {
  const c = new NesCell(), bob = p.bob ?? 0, cx = 15 + (p.dx ?? 0);
  const top = NES_FOOT - 14 - bob;
  body(c, L, cx, top, view, p);
  head(c, L, cx + (p.hx ?? 0), top - 12 + (p.hy ?? 0), view, p.face);
  const r = c.raster();
  return p.rot ? rotateNearest(r, p.rot, 16, 22, p.tx ?? 0, p.ty ?? 0) : r;
}

export interface NesSheetMeta { cell: [number, number]; pivot: [number, number]; cols: number; mirror: typeof NES_MIRROR; anims: Record<string, { start: number; frames: number; fps: number; loop: boolean }> }

/** Junta los cuadros en una hoja de `cols` columnas, con su JSON para Phaser (el mismo formato que el resto de la forja). */
export function packNes(frames: Raster[], anims: NesSheetMeta['anims'], cols = 16): { png: Raster; meta: NesSheetMeta } {
  const rows = Math.ceil(frames.length / cols), png = createRaster(cols * NES_CELL, rows * NES_CELL);
  frames.forEach((f, i) => {
    const ox = (i % cols) * NES_CELL, oy = Math.floor(i / cols) * NES_CELL;
    for (let y = 0; y < NES_CELL; y++) png.data.set(f.data.subarray(y * NES_CELL * 4, (y + 1) * NES_CELL * 4), ((oy + y) * png.w + ox) * 4);
  });
  return { png, meta: { cell: [NES_CELL, NES_CELL], pivot: [16, NES_FOOT], cols, mirror: NES_MIRROR, anims } };
}

/** La hoja completa de una persona: todas las animaciones de fútbol y de pelea en las cinco filas (las de portero solo si es portero). */
export function nesSheet(L: NesLook, opts: { keeper?: boolean; anims?: string[] } = {}): { png: Raster; meta: NesSheetMeta } {
  const frames: Raster[] = [], anims: NesSheetMeta['anims'] = {};
  for (const [name, a] of Object.entries(NES_ANIMS)) {
    if (a.keeper && !opts.keeper) continue;
    if (opts.anims && !opts.anims.includes(name)) continue;
    for (const [dir, view] of Object.entries(NES_DIRS)) {
      const own = view === 'front' ? a.front : view === 'back' ? a.back : a.side;
      const poses = own ?? a.side, v: NesView = own ? view : 'side';
      const start = frames.length;
      for (const p of poses) frames.push(nesFrame(L, v, p));
      anims[`${name}_${dir}`] = { start, frames: poses.length, fps: a.fps, loop: a.loop };
    }
  }
  return packNes(frames, anims);
}

// ------------------------------------------------------------------------------------------------ el perro
export interface NesDogLook { pelo: string; pecho: string; oreja?: string; nariz?: string }
interface DogPose { legs?: [number, number][]; bob?: number; air?: boolean; tail?: number; hx?: number; hy?: number; tongue?: boolean; rot?: number; ty?: number }

/** Un perro chiquito de lado en el estilo Nekketsu (Thor, el bóxer de la familia): cabeza grande, pecho claro, cola que se mueve. */
export function nesDogFrame(D: NesDogLook, p: DogPose): Raster {
  const c = new NesCell(), fur = rgb(D.pelo), fur2 = nesShade(fur, 0.72), white = rgb(D.pecho), ear = rgb(D.oreja ?? D.pelo);
  const bob = p.bob ?? 0, y = NES_FOOT - 7 - bob;
  (p.legs ?? [[3, 0], [1, 0], [-4, 0], [-6, 0]]).forEach(([lx, ly], i) => c.line(15 + lx, y + 2, 15 + lx + (i % 2), NES_FOOT - 1 - ly - (p.air ? bob : 0), i % 2 ? fur2 : fur, 2));
  c.ellipse(14, y, 7.5, 4, fur);
  c.rect(17, y + 1, 4, 3, white);
  c.line(7, y - 1, 3, y - 5 + (p.tail ?? -2), fur, 2);
  const hx = 21 + (p.hx ?? 0), hy = y - 6 + (p.hy ?? 0);
  c.rect(hx - 4, hy - 3, 9, 8, fur); c.rect(hx - 3, hy - 4, 7, 1, fur);
  c.rect(hx + 2, hy + 1, 4, 4, white);
  c.rect(hx + 5, hy, 2, 2, rgb(D.nariz ?? '#101018'));
  c.rect(hx, hy - 1, 1, 2, NES_INK);
  c.rect(hx - 4, hy - 4, 3, 5, ear);
  if (p.tongue) c.rect(hx + 3, hy + 5, 2, 2, [255, 96, 128, 255]);
  const r = c.raster();
  return p.rot ? rotateNearest(r, p.rot, 16, 24, 0, p.ty ?? 0) : r;
}

const DOG: Record<string, { fps: number; loop: boolean; poses: DogPose[] }> = {
  idle: { fps: 4, loop: true, poses: [{ tail: -3 }, { tail: -1 }] },
  walk: { fps: 8, loop: true, poses: [{ legs: [[3, 0], [1, 1], [-4, 1], [-6, 0]] }, { legs: [[2, 1], [2, 0], [-5, 0], [-5, 1]] }] },
  run: { fps: 12, loop: true, poses: [{ legs: [[5, 1], [3, 2], [-6, 2], [-8, 1]], bob: 1, tail: -4 }, { legs: [[1, 1], [0, 2], [-3, 2], [-4, 1]], tail: -2 }, { legs: [[4, 2], [2, 1], [-5, 1], [-6, 2]], bob: 1, tail: -4 }, { legs: [[2, 0], [1, 1], [-4, 1], [-5, 0]], tail: -2 }] },
  jump: { fps: 10, loop: false, poses: [{ bob: 4, air: true, legs: [[4, 2], [3, 2], [-5, 2], [-6, 2]], tail: -5 }, { bob: 8, air: true, legs: [[6, 3], [5, 3], [-7, 3], [-8, 3]], tail: -6, hy: -1 }] },
  sit: { fps: 2, loop: true, poses: [{ legs: [[3, 0], [2, 0], [-3, 2], [-4, 2]], hy: -1 }] },
  celebrate: { fps: 10, loop: true, poses: [{ bob: 2, air: true, tail: -6, tongue: true }, { bob: 6, air: true, tail: -2, tongue: true }] },
  fetch: { fps: 12, loop: false, poses: [{ hx: 2, hy: 2 }, { hx: 3, hy: 3 }] },
  hurt: { fps: 8, loop: false, poses: [{ rot: 40, ty: 2 }, { rot: 90, ty: 6 }] },
  wag: { fps: 8, loop: true, poses: [{ tail: -6 }, { tail: 0 }] },
  pickup: { fps: 6, loop: false, poses: [{ hx: 2, hy: 3 }, { hx: 1, hy: 1 }] },
  lie: { fps: 2, loop: true, poses: [{ bob: -2, legs: [[4, -1], [2, -1], [-4, -1], [-6, -1]] }] },
};

/** La hoja del perro: las animaciones de mascota en las cinco filas (de lado en todas: así se ven los perros en la NES). */
export function nesDogSheet(D: NesDogLook): { png: Raster; meta: NesSheetMeta } {
  const frames: Raster[] = [], anims: NesSheetMeta['anims'] = {};
  for (const [name, a] of Object.entries(DOG)) for (const dir of Object.keys(NES_DIRS)) {
    const start = frames.length;
    for (const p of a.poses) frames.push(nesDogFrame(D, p));
    anims[`${name}_${dir}`] = { start, frames: a.poses.length, fps: a.fps, loop: a.loop };
  }
  return packNes(frames, anims);
}
