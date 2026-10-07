import type { Raster } from '../core/raster';
import type { Ficha, CellSize } from '../sheet/ficha';
import { dimsFor } from '../rig/dims';
import { HUMAN_ANIMS, type HumanAnimName } from '../anim/human';
import type { AnimClip } from '../rig/pose';
import { renderPose } from './frame';

export interface RenderedClip {
  name: string;
  fps: number;
  loop: boolean;
  cell: CellSize;
  frames: Raster[];
  /** cuadros que deben estar en el aire (no se exige pie en el piso) */
  airborne: boolean[];
}

export function clipFor(f: Ficha, cell: CellSize, name: HumanAnimName): AnimClip {
  const d = dimsFor(cell, f.body.proportions);
  return HUMAN_ANIMS[name](d, { build: f.body.proportions.build });
}

export function renderClip(f: Ficha, cell: CellSize, name: HumanAnimName): RenderedClip {
  const clip = clipFor(f, cell, name);
  return {
    name: clip.name,
    fps: clip.fps,
    loop: clip.loop,
    cell,
    frames: clip.frames.map((p) => renderPose(f, cell, p)),
    airborne: clip.frames.map((p) => p.air > 0),
  };
}

export const ANIM_NAMES = Object.keys(HUMAN_ANIMS) as HumanAnimName[];
