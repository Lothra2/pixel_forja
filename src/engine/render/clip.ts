import { type Raster, createRaster } from '../core/raster';
import { type Ficha, type CellSize, isHuman } from '../sheet/ficha';
import { dimsFor } from '../rig/dims';
import { animalDims } from '../rig/animal';
import { makeCtx, type AnimDef } from '../anim/types';
import { humanAnim, animalAnim, customToDef } from '../anim/registry';
import type { Pose } from '../rig/pose';
import { renderHuman, type BigFrame, type RenderOptions, type RenderView } from './human';
import { renderPet3d, type PetView } from './pet3d';
import type { View } from './head';

/**
 * side = mirando a la derecha, left = espejo, front = hacia abajo (de frente), back = hacia arriba (de espalda).
 * Diagonales (isométrica, 8 direcciones tipo Diablo): se = abajo a la derecha, sw = abajo a la izquierda,
 * ne = arriba a la derecha, nw = arriba a la izquierda. sw y nw son espejos de se y ne.
 */
export type ViewName = 'side' | 'left' | 'front' | 'back' | 'se' | 'sw' | 'ne' | 'nw';
export const VIEW_NAMES: ViewName[] = ['side', 'left', 'front', 'back', 'se', 'sw', 'ne', 'nw'];
export const DIAG_VIEWS: ViewName[] = ['se', 'sw', 'ne', 'nw'];
/** las 8 direcciones en el orden de las agujas del reloj desde abajo (como se ordenan en motores isométricos) */
export const EIGHT_VIEWS: ViewName[] = ['front', 'sw', 'left', 'nw', 'back', 'ne', 'side', 'se'];
/** sufijo de exportación para 4 u 8 direcciones */
export const VIEW_SUFFIX: Record<ViewName, string> = {
  side: 'right', left: 'left', front: 'down', back: 'up', se: 'down_right', sw: 'down_left', ne: 'up_right', nw: 'up_left',
};
const MIRRORED: Partial<Record<ViewName, RenderView>> = { left: 'side', sw: 'se', nw: 'ne' };

export interface RenderedClip {
  name: string;
  fps: number;
  loop: boolean;
  cell: CellSize;
  view: ViewName;
  frames: Raster[];
  /** cuadros en el aire (no se exige pie en el piso) */
  airborne: boolean[];
  /** de pie con altura estable (aplica el control de altura y temblor) */
  steady: boolean;
  /** false si el clip no cabe en la celda ni corriéndolo */
  fits: boolean;
  /** por cuadro, alto del cuerpo sin implementos (arriba y abajo, en la celda): el control de calidad mide con esto */
  bodies?: ({ y0: number; y1: number } | null)[];
}

function humanDef(f: Ficha, name: string): AnimDef | undefined {
  if (!isHuman(f)) return undefined;
  const custom = f.customAnims?.find((c) => c.name === name);
  return custom ? customToDef(custom) : humanAnim(name);
}

export function hasAnim(f: Ficha, name: string): boolean {
  return isHuman(f) ? !!humanDef(f, name) : !!animalAnim(name);
}

/** Poses de una animación (para el editor y las pruebas). */
export function posesFor(f: Ficha, cell: CellSize, name: string, view: View = 'side'): Pose[] {
  if (!isHuman(f)) throw new Error('posesFor es solo para humanos');
  const def = humanDef(f, name);
  if (!def) throw new Error(`No existe la animación ${name}`);
  const d = dimsFor(cell, f.body.proportions);
  let poses = def.build(makeCtx(d, f.body.proportions.build, view));
  // con equipo de RPG, el héroe lleva el arma (y el escudo) también al caminar, correr, recibir golpes...
  const g = f.gear;
  if (g && (def.pack === 'basic' || def.pack === 'rpg' || def.pack === 'skills')) {
    poses = poses.map((p) => {
      const props = [...(p.props ?? [])];
      if (g.main && !props.some((q) => q.at === 'handNear')) props.push({ kind: 'sword', at: 'handNear' });
      if (g.off && !props.some((q) => q.at === 'handFar')) props.push({ kind: 'shield', at: 'handFar' });
      return { ...p, props };
    });
  }
  // vaivén del pelo: llega tarde al subir y bajar, y se va hacia atrás al correr
  const lag = f.physics.hairLag;
  return poses.map((p, i) => {
    const prev = poses[(i - 1 + poses.length) % poses.length];
    const vy = (p.air - prev.air) + (prev.head.dy - p.head.dy) * 0.5;
    const dy = Math.max(-1, Math.min(1, Math.round(vy * lag)));
    const dx = (def.hairTrail ?? 0) * lag * (i % 2 === 0 ? 1 : 0.5);
    return { ...p, hair: p.hair ?? { dx: Math.round(dx), dy } };
  });
}

export function renderClip(f: Ficha, cell: CellSize, name: string, view: ViewName = 'side', opt: RenderOptions = {}): RenderedClip {
  const base: RenderView = MIRRORED[view] ?? (view as RenderView);
  // las diagonales usan las poses pensadas de lado (adelante = hacia la derecha)
  const poseView: View = base === 'se' || base === 'ne' ? 'side' : base;
  let big: BigFrame[], fps: number, loop: boolean, steady: boolean, airborne: boolean[];
  if (isHuman(f)) {
    const def = humanDef(f, name);
    if (!def) throw new Error(`No existe la animación ${name}`);
    const poses = posesFor(f, cell, name, poseView);
    // giro (torbellino): cada cuadro en la dirección siguiente, en el sentido de las agujas del reloj
    const ring = EIGHT_VIEWS;
    const start = Math.max(0, ring.indexOf(view));
    const frameView = (i: number): ViewName => (def.spin ? ring[(start + i) % ring.length] : view);
    const renderAt = (p: Pose, i: number): BigFrame => {
      const v = frameView(i);
      if (!def.spin || v === view) return renderHuman(f, cell, p, base, opt);
      const b = MIRRORED[v] ?? (v as RenderView);
      const fr = renderHuman(f, cell, p, b, opt);
      // la vista final se espeja entera al final si view es espejo: se compensa aquí
      return !!MIRRORED[v] !== !!MIRRORED[view] ? mirrorBig(fr) : fr;
    };
    big = poses.map((p, i) => renderAt(p, i));
    // salto que choca con el techo de la celda: se baja solo ese cuadro lo justo
    big = big.map((b, i) => {
      const top = b.groundRow - (cell - 2) + 1;
      if (!b.body || b.body.y0 >= top || poses[i].air <= 0) return b;
      poses[i] = { ...poses[i], air: Math.max(0, poses[i].air - (top - b.body.y0)) };
      return renderAt(poses[i], i);
    });
    fps = def.fps; loop = def.loop; steady = !!def.steady;
    airborne = poses.map((p) => p.air > 0 || p.hipH !== undefined);
  } else {
    const def = animalAnim(name);
    if (!def) throw new Error(`No existe la animación ${name}`);
    const d = animalDims(f.body.species, cell, f.body.size);
    const poses = def.build(d);
    // mascota en 3D: las 8 direcciones (las de la izquierda, espejo) con armadura si la tiene
    big = poses.map((p) => renderPet3d(f, cell, p, (base === 'side' || base === 'se' || base === 'front' || base === 'ne' || base === 'back' ? base : 'side') as PetView, f.barding ?? 0));
    fps = def.fps; loop = def.loop; steady = !!def.steady;
    airborne = poses.map((p) => p.air > 0);
  }
  const { frames, fits, top } = cropClip(big, cell);
  // el cuerpo sin armas ni balones (con el pelo y el contorno): un hacha colgando no cuenta como pie
  // solo con equipo de RPG: sin equipo el piso lo marca todo lo dibujado (balones, raquetas) y se mide igual
  const useBodies = isHuman(f) && !!f.gear;
  const bodies = big.map((b) => (useBodies && b.full ? { y0: b.full.y0 - top, y1: b.full.y1 - top } : null));
  return { name, fps, loop, cell, view, frames: MIRRORED[view] ? frames.map(mirror) : frames, airborne, steady, fits, bodies: bodies.some(Boolean) ? bodies : undefined };
}

/**
 * Recorta la celda alrededor del pie de apoyo. Si una pose se sale por un lado, corre TODO el clip
 * lo mismo (así no salta entre cuadros). Si no cabe ni así, avisa.
 */
function cropClip(big: BigFrame[], cell: CellSize): { frames: Raster[]; fits: boolean; top: number } {
  // solo el cuerpo decide el encuadre: un balón que sale disparado se recorta.
  // Si el cuerpo con el pelo cabe, se encuadra con el pelo (así no se corta la cabeza al caer acostado)
  const union = (full: boolean) => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity;
    for (const b of big) {
      const box = full ? b.full ?? b.body : b.body;
      if (!box) continue;
      x0 = Math.min(x0, box.x0); x1 = Math.max(x1, box.x1); y0 = Math.min(y0, b.body?.y0 ?? box.y0);
    }
    return { x0, x1, y0 };
  };
  const withHair = union(true);
  const { x0, x1, y0 } = union(false);
  const pivotX = big[0].pivotX, groundRow = big[0].groundRow;
  let left = pivotX - cell / 2;
  const top = groundRow - (cell - 2);
  let fits = true;
  if (isFinite(x0)) {
    if (x1 - x0 + 1 > cell - 2) fits = false;
    if (withHair.x1 - withHair.x0 + 1 <= cell - 2) {
      if (withHair.x0 < left + 1) left = withHair.x0 - 1;
      else if (withHair.x1 > left + cell - 2) left = withHair.x1 - cell + 2;
    } else if (fits) {
      // el pelo no cabe entero: se centra lo que hay, sin sacar el cuerpo del cuadro
      if (withHair.x0 < left + 1 || withHair.x1 > left + cell - 2) left = Math.round((withHair.x0 + withHair.x1 + 1) / 2 - cell / 2);
      left = Math.min(x0 - 1, Math.max(x1 - cell + 2, left));
    } else if (x0 < left + 1) left = x0 - 1;
    else if (x1 > left + cell - 2) left = x1 - cell + 2;
    if (y0 < top + 1) fits = false;
  }
  const frames = big.map((b) => {
    const out = createRaster(cell, cell);
    const r = b.raster;
    for (let y = 0; y < cell; y++)
      for (let x = 0; x < cell; x++) {
        const sx = x + left, sy = y + top;
        if (sx < 0 || sy < 0 || sx >= r.w || sy >= r.h) continue;
        const si = (sy * r.w + sx) * 4, di = (y * cell + x) * 4;
        out.data[di] = r.data[si]; out.data[di + 1] = r.data[si + 1]; out.data[di + 2] = r.data[si + 2]; out.data[di + 3] = r.data[si + 3];
      }
    return out;
  });
  return { frames, fits, top };
}

/** Espeja un cuadro grande sobre su eje (el pie de apoyo queda en el centro). */
function mirrorBig(b: BigFrame): BigFrame {
  const W = b.raster.w;
  const fx = (box: BigFrame['body']) => (box ? { x0: W - 1 - box.x1, x1: W - 1 - box.x0, y0: box.y0, y1: box.y1 } : box);
  return { ...b, raster: mirror(b.raster), pivotX: W - b.pivotX, body: fx(b.body), full: b.full === undefined ? undefined : fx(b.full), joints: undefined };
}

export function mirror(r: Raster): Raster {
  const out = createRaster(r.w, r.h);
  for (let y = 0; y < r.h; y++)
    for (let x = 0; x < r.w; x++) {
      const si = (y * r.w + x) * 4, di = (y * r.w + (r.w - 1 - x)) * 4;
      for (let k = 0; k < 4; k++) out.data[di + k] = r.data[si + k];
    }
  return out;
}
