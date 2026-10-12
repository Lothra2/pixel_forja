import { type Raster, createRaster } from '../core/raster';
import { type Ficha, type CellSize, isHuman } from '../sheet/ficha';
import { dimsFor } from '../rig/dims';
import { animalDims } from '../rig/animal';
import { makeCtx, type AnimDef, type AnimEvent } from '../anim/types';
import { humanAnim, animalAnim, customToDef } from '../anim/registry';
import { premiumAnim, swingWeapon } from '../anim/premium';
import { petPremiumAnim } from '../anim/petPremium';
import type { Pose } from '../rig/pose';
import { strideOf } from '../anim/stride';
import { applyWater } from './water';
import { renderHuman, LONG_HELD, type BigFrame, type Joints, type RenderOptions, type RenderView } from './human';
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
/** Para las que avanzan de espaldas: cada vista lateral usa su espejo. */
const BACKWARD: Partial<Record<ViewName, ViewName>> = { side: 'left', left: 'side', se: 'sw', sw: 'se', ne: 'nw', nw: 'ne' };

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
  /** cuánto sube el juego el sprite en cada cuadro (saltos que no caben en la celda), en pixeles */
  rise?: number[];
  /** fila de la superficie del agua en cada cuadro (nadar), o null si no hay agua */
  waterRows?: (number | null)[];
  /** encuadre fijo (premium): los cuadros que se salen de la celda */
  overflow?: number[];
  /**
   * por cuadro, caja de la persona (con el pelo) sin implementos, pelotas ni efectos, en la celda: el hurtbox.
   * Solo premium (el render separa los implementos)
   */
  wholes?: ({ x0: number; y0: number; x1: number; y1: number } | null)[];
  /** por cuadro, el arma del piso en la mano (agarre en la celda, ángulo en pantalla y si va detrás del cuerpo) */
  held?: ({ x: number; y: number; angle: number; behind: boolean } | null)[];
  /** por cuadro, alto del cuerpo sin implementos (arriba y abajo, en la celda): el control de calidad mide con esto */
  bodies?: ({ y0: number; y1: number } | null)[];
  /** perfil con el que se dibujó */
  profile: 'classic' | 'premium';
  /** eventos para el juego (pasos, golpe, suelta), en fase 0 a 1 */
  events?: AnimEvent[];
  /**
   * Andar (premium): cuántos pixeles avanza el cuerpo en un ciclo para que el pie apoyado no patine, a este tamaño.
   * El juego puede ajustar la velocidad de la animación: ritmo = velocidad_del_juego / (avance * fps / cuadros).
   */
  stride?: number;
  /**
   * Acciones que se desplazan (salto largo, clavado): cuántos pixeles lleva avanzado el cuerpo en cada cuadro desde
   * el primero. El juego mueve el sprite eso hacia donde mira; la celda ya descuenta lo que el cuerpo se corre adentro.
   */
  travel?: number[];
  /** hacia dónde va de verdad cuando no es la vista pedida (de frente, una prueba de campo usa la diagonal) */
  heading?: ViewName;
  /**
   * articulaciones de cada cuadro ya en coordenadas de la celda (para enganchar cosas en el juego: manos, cabeza,
   * pies). Las traen todas las animaciones de personas, premium o no
   */
  joints?: Joints[];
}

function humanDef(f: Ficha, name: string): AnimDef | undefined {
  if (!isHuman(f)) return undefined;
  const custom = f.customAnims?.find((c) => c.name === name);
  if (custom) return customToDef(custom);
  return (f.movementProfile === 'premium' ? premiumAnim(name) : undefined) ?? humanAnim(name);
}

/** ¿Esta ficha usa la versión premium de esta animación? */
export function isPremiumClip(f: Ficha, name: string): boolean {
  if (f.movementProfile !== 'premium') return false;
  // la mascota premium (Thor): andares de verdad, eventos y pivote fijo
  if (!isHuman(f)) return !!petPremiumAnim(name);
  return !f.customAnims?.some((c) => c.name === name) && !!premiumAnim(name);
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
  // una animación del editor hecha a otro tamaño: las distancias se escalan (los ángulos no)
  const custom = f.customAnims?.find((c) => c.name === name);
  if (custom?.authoredCell && custom.authoredCell !== cell) poses = poses.map((p) => scalePose(p, cell / custom.authoredCell!));
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
  if (isPremiumClip(f, name)) poses = swingWeapon(name, poses, g?.main);
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

/** Escala las distancias de una pose (pies, cuerpo, cabeza, implementos) sin tocar los ángulos. */
export function scalePose(p: Pose, k: number): Pose {
  const foot = (q: Pose['legs']['near']) => ({ ...q, x: q.x * k, y: q.y * k, ...(q.z !== undefined ? { z: q.z * k } : {}) });
  return {
    ...p, x: p.x * k, air: p.air * k, ...(p.hipH !== undefined ? { hipH: p.hipH * k } : {}), ...(p.rise !== undefined ? { rise: p.rise * k } : {}),
    head: { ...p.head, dx: p.head.dx * k, dy: p.head.dy * k },
    legs: { near: foot(p.legs.near), far: foot(p.legs.far) },
    props: p.props?.map((q) => ({ ...q, ...(q.x !== undefined ? { x: q.x * k } : {}), ...(q.y !== undefined ? { y: q.y * k } : {}) })),
  };
}

export function renderClip(f: Ficha, cell: CellSize, name: string, asked: ViewName = 'side', opt: RenderOptions = {}): RenderedClip {
  // de lado nomás (garrocha): de frente y de espalda se usa la diagonal más cercana
  const hd = humanDef(f, name);
  const lateral = !!hd?.lateral && (asked === 'front' || asked === 'back');
  let view: ViewName = lateral ? (asked === 'front' ? 'se' : 'ne') : asked;
  if (hd?.backward) view = BACKWARD[view] ?? view;
  const base: RenderView = MIRRORED[view] ?? (view as RenderView);
  // las diagonales usan las poses pensadas de lado (adelante = hacia la derecha)
  const poseView: View = base === 'se' || base === 'ne' ? 'side' : base;
  let big: BigFrame[], fps: number, loop: boolean, steady: boolean, airborne: boolean[];
  let events: AnimEvent[] | undefined, stride: number | undefined, rise: number[] | undefined, travel: number[] | undefined;
  // garrocha o jabalina: largas, no marcan el piso (el control mide el cuerpo, como con el equipo de RPG)
  let longHeld: boolean[] = [];
  // agua por cuadro (nadar): fila de la superficie y si salpica fuerte
  let water: ({ level: number; big: boolean } | null)[] = [];
  const premium = isPremiumClip(f, name);
  if (isHuman(f)) {
    const def = humanDef(f, name);
    if (!def) throw new Error(`No existe la animación ${name}`);
    const poses = posesFor(f, cell, name, poseView);
    if (premium) {
      events = def.events;
      const L = dimsFor(cell, f.body.proportions);
      if (def.loop) stride = def.strideL ? Math.round(def.strideL * (L.legUpper + L.legLower) * 10) / 10 : strideOf(poses);
      else if (def.travel) travel = travelFor(f, cell, def, poses);
    }
    // giro (torbellino): cada cuadro en la dirección siguiente, en el sentido de las agujas del reloj
    const ring = EIGHT_VIEWS;
    const start = Math.max(0, ring.indexOf(view));
    const frameView = (i: number): ViewName => (def.spin ? ring[(start + i) % ring.length] : view);
    // premium: los implementos no cuentan como cuerpo para encuadrar
    const ro: RenderOptions = premium ? { ...opt, propsApart: true } : opt;
    const renderAt = (p: Pose, i: number): BigFrame => {
      const v = frameView(i);
      if (!def.spin || v === view) return renderHuman(f, cell, p, base, ro);
      const b = MIRRORED[v] ?? (v as RenderView);
      const fr = renderHuman(f, cell, p, b, ro);
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
    // acostado (premium): se corre el cuerpo hasta centrarlo en la celda. Se mide cuánto mueve un paso de x
    // en esta vista (de lado, en diagonal o de frente no es lo mismo) y se vuelve a dibujar
    // un solo corrimiento para todo el ciclo: se centra la unión de todos los cuadros 'shared' (el más largo manda)
    const shared = poses.map((p, i) => (p.fit === 'shared' ? i : -1)).filter((i) => i >= 0);
    if (shared.length) {
      const boxOf = boxFor;
      const union = (list: BigFrame[]) => {
        let x0 = Infinity, x1 = -Infinity;
        for (const r of list) { const q = boxOf(r); if (q) { x0 = Math.min(x0, q.x0); x1 = Math.max(x1, q.x1); } }
        return { x0, x1 };
      };
      const u0 = union(shared.map((i) => big[i]));
      const i0 = shared[0];
      const probe = renderAt({ ...poses[i0], x: poses[i0].x + 4 }, i0);
      const q0 = boxOf(big[i0]), qp = boxOf(probe);
      const perUnit = q0 && qp ? (qp.x0 - q0.x0) / 4 : 0;
      const off = big[i0].pivotX - 0.5 - (u0.x0 + u0.x1) / 2;
      if (isFinite(off) && Math.abs(perUnit) >= 0.25 && Math.abs(off) >= 1) {
        const dx = off / perUnit;
        big = big.map((b, i) => {
          if (poses[i].fit !== 'shared') return b;
          poses[i] = { ...poses[i], x: poses[i].x + dx };
          return renderAt(poses[i], i);
        });
      }
    }
    big = big.map((b, i) => {
      if (poses[i].fit !== true || !b.body) return b;
      // lo que entra en la celda va de left+1 a left+cell-2: su centro está medio pixel antes del pivote
      const offOf = (r: BigFrame) => { const q = boxFor(r); return q ? r.pivotX - 0.5 - (q.x0 + q.x1) / 2 : 0; };
      const probe = renderAt({ ...poses[i], x: poses[i].x + 4 }, i);
      const perUnit = probe.body ? (offOf(b) - offOf(probe)) / 4 : 0;
      if (Math.abs(perUnit) < 0.25) return b;
      let out = b;
      // unas pasadas: el redondeo a pixeles puede dejarlo a medio camino la primera vez
      for (let k = 0; k < 3 && Math.abs(offOf(out)) >= 1; k++) {
        poses[i] = { ...poses[i], x: poses[i].x + offOf(out) / perUnit };
        out = renderAt(poses[i], i);
      }
      return out;
    });
    // premium, en acciones de un disparo (no ciclos): si un cuadro se sale de la celda por la cabeza grande del chibi
    // (pasa a 32 px), se corre lo justo para que entre. En los ciclos manda el control: ahí correrlo sería temblor,
    // también los cuadros de un ciclo centrado de una vez (nadar) que todavía se pasan un pixel
    if (premium && ((!def.steady && !def.loop) || shared.length)) {
      const left0 = big[0].pivotX - cell / 2;
      big = big.map((b, i) => {
        if (!b.body || poses[i].fit === true || (def.loop && poses[i].fit !== 'shared')) return b;
        const need = b.body.x0 < left0 + 1 ? left0 + 1 - b.body.x0 : b.body.x1 > left0 + cell - 2 ? left0 + cell - 2 - b.body.x1 : 0;
        if (!need || b.body.x1 - b.body.x0 + 1 > cell - 2) return b;
        const probe = renderAt({ ...poses[i], x: poses[i].x + 4 }, i);
        const perUnit = probe.body ? (probe.body.x0 - b.body.x0) / 4 : 0;
        if (Math.abs(perUnit) < 0.25) return b;
        let out = b;
        for (let k = 0, x = poses[i].x; k < 3; k++) {
          const ob = out.body!;
          const d = ob.x0 < left0 + 1 ? left0 + 1 - ob.x0 : ob.x1 > left0 + cell - 2 ? left0 + cell - 2 - ob.x1 : 0;
          if (!d) break;
          x += (d + Math.sign(d) * 0.4) / perUnit;
          poses[i] = { ...poses[i], x };
          out = renderAt(poses[i], i);
        }
        return out;
      });
    }
    fps = def.fps; loop = def.loop; steady = !!def.steady;
    airborne = poses.map((p) => p.air > 0 || p.hipH !== undefined || (p.rise ?? 0) > 0);
    if (poses.some((p) => p.rise)) rise = poses.map((p) => Math.round(p.rise ?? 0));
    longHeld = poses.map((p) => !!p.props?.some((q) => LONG_HELD.has(q.kind)));
    water = poses.map((p) => (p.water !== undefined ? { level: p.water, big: !!p.splash } : null));
  } else {
    const def = (premium ? petPremiumAnim(name) : undefined) ?? animalAnim(name);
    if (!def) throw new Error(`No existe la animación ${name}`);
    const d = animalDims(f.body.species, cell, f.body.size, f.movementProfile === 'premium');
    const poses = def.build(d);
    // mascota en 3D: las 8 direcciones (las de la izquierda, espejo) con armadura si la tiene
    big = poses.map((p) => renderPet3d(f, cell, p, (base === 'side' || base === 'se' || base === 'front' || base === 'ne' || base === 'back' ? base : 'side') as PetView, f.barding ?? 0));
    fps = def.fps; loop = def.loop; steady = !!def.steady;
    airborne = poses.map((p) => p.air > 0 || (p.rise ?? 0) > 0);
    if (poses.some((p) => p.rise)) rise = poses.map((p) => Math.round(p.rise ?? 0));
    if (premium) { events = def.events; if (def.loop && def.stride) stride = Math.round(def.stride(d) * 10) / 10; }
  }
  // premium: el pivote queda siempre en el mismo lugar de la celda (no salta entre cuadros, direcciones ni acciones)
  const cropped = cropClip(big, cell, premium);
  const { fits, top, left, overflow } = cropped;
  let { frames } = cropped;
  if (water.some(Boolean)) frames = wetFrames(frames, big, water, cell, left, top);
  // el cuerpo sin armas ni balones (con el pelo y el contorno): un hacha colgando no cuenta como pie
  // solo con equipo de RPG: sin equipo el piso lo marca todo lo dibujado (balones, raquetas) y se mide igual
  const useBodies = (i: number) => isHuman(f) && (!!f.gear || premium || !!longHeld[i]);
  const bodies = big.map((b, i) => (useBodies(i) && b.full ? { y0: b.full.y0 - top, y1: b.full.y1 - top } : null));
  const mirrored = !!MIRRORED[view];
  // articulaciones en coordenadas de la celda final (espejadas si la vista es espejo)
  const joints = isHuman(f) && big.every((b) => b.joints)
    ? big.map((b) => Object.fromEntries(Object.entries(b.joints!).map(([k, [x, y]]) => [k, [mirrored ? cell - 1 - (x - left) : x - left, y - top]])) as Joints)
    : undefined;
  const clampX = (v: number) => Math.max(0, Math.min(cell - 1, v)), clampY = clampX;
  const wholes = isHuman(f) ? big.map((b) => {
    const w = b.whole;
    if (!w) return null;
    const x0 = clampX(w.x0 - left), x1 = clampX(w.x1 - left), y0 = clampY(w.y0 - top), y1 = clampY(w.y1 - top);
    return mirrored ? { x0: cell - 1 - x1, x1: cell - 1 - x0, y0, y1 } : { x0, x1, y0, y1 };
  }) : undefined;
  const held = big.some((b) => b.held) ? big.map((b) => {
    if (!b.held) return null;
    const x = b.held.x - left, y = b.held.y - top;
    return mirrored ? { x: cell - 1 - x, y, angle: (540 - b.held.angle) % 360, behind: b.held.behind } : { x, y, angle: b.held.angle, behind: b.held.behind };
  }) : undefined;
  return {
    name, fps, loop, cell, view, frames: mirrored ? frames.map(mirror) : frames, airborne, steady, fits, bodies: bodies.some(Boolean) ? bodies : undefined,
    ...(wholes?.some(Boolean) ? { wholes } : {}), ...(held ? { held } : {}),
    profile: premium ? 'premium' : 'classic',
    ...(overflow ? { overflow } : {}),
    ...(rise ? { rise } : {}),
    ...(water.some(Boolean) ? { waterRows: water.map((w) => (w ? cell - 2 - Math.round(w.level) : null)) } : {}),
    ...(events?.length ? { events } : {}), ...(stride ? { stride } : {}), ...(travel ? { travel } : {}),
    ...(lateral ? { heading: (asked === 'front' ? 'se' : 'ne') as ViewName } : {}), ...(joints ? { joints } : {}),
  };
}

/**
 * Desplazamiento acumulado de una acción de un disparo, en pixeles de la celda: lo que el cuerpo avanza (fracción
 * de la velocidad de su carrera) menos lo que ya se corre dentro de la celda, así el juego no lo mueve dos veces.
 * Nunca retrocede: si la celda ya corrió el cuerpo de más, el juego se queda quieto ese cuadro.
 */
function travelFor(f: Ficha, cell: CellSize, def: AnimDef, poses: Pose[]): number[] {
  const t = def.travel!;
  const ref = posesFor(f, cell, t.ref, 'side');
  const refDef = humanDef(f, t.ref);
  const v = ((strideOf(ref) ?? 0) * (refDef?.fps ?? def.fps)) / ref.length / def.fps;
  const out = [0];
  for (let i = 0; i + 1 < poses.length; i++) {
    const d = Math.max(0, (t.k[i] ?? 0) * v - (poses[i + 1].x - poses[i].x));
    out.push(out[i] + d);
  }
  return out.map((d) => Math.round(d * 10) / 10);
}

/**
 * Recorta la celda alrededor del pie de apoyo. Si una pose se sale por un lado, corre TODO el clip
 * lo mismo (así no salta entre cuadros). Si no cabe ni así, avisa.
 */
function cropClip(big: BigFrame[], cell: CellSize, fixed = false): { frames: Raster[]; fits: boolean; top: number; left: number; overflow?: number[] } {
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
  let overflow: number[] | undefined;
  if (isFinite(x0) && fixed) {
    // encuadre fijo: no se corre nada; si algo del cuerpo se sale, la animación está mal hecha y el control lo dice
    if (x0 < left + 1 || x1 > left + cell - 2 || y0 < top + 1) fits = false;
    // cuáles cuadros se salen (para que el control diga dónde está el problema, no "todos")
    if (!fits) overflow = big.flatMap((b, i) => (b.body && (b.body.x0 < left + 1 || b.body.x1 > left + cell - 2 || b.body.y0 < top + 1) ? [i] : []));
  } else if (isFinite(x0)) {
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
  return { frames, fits, top, left, overflow };
}

/** Espeja un cuadro grande sobre su eje (el pie de apoyo queda en el centro). */
function mirrorBig(b: BigFrame): BigFrame {
  const W = b.raster.w;
  const fx = (box: BigFrame['body']) => (box ? { x0: W - 1 - box.x1, x1: W - 1 - box.x0, y0: box.y0, y1: box.y1 } : box);
  // las articulaciones se espejan igual que los pixeles (x -> W - 1 - x)
  const joints = b.joints ? (Object.fromEntries(Object.entries(b.joints).map(([k, [x, y]]) => [k, [W - 1 - x, y]])) as Joints) : undefined;
  return { ...b, raster: mirror(b.raster), pivotX: W - b.pivotX, body: fx(b.body), full: b.full === undefined ? undefined : fx(b.full), whole: b.whole === undefined ? undefined : fx(b.whole), joints,
    held: b.held ? { ...b.held, x: W - 1 - b.held.x, angle: (540 - b.held.angle) % 360 } : undefined };
}

/** Caja para centrar: con el pelo si cabe en la celda; si no, el cuerpo (y la punta del pelo se recorta). */
function boxFor(r: BigFrame) {
  const cell = r.raster.w / 3;
  return r.whole && r.whole.x1 - r.whole.x0 + 1 <= cell - 2 ? r.whole : r.body;
}

/**
 * Pone el agua en los cuadros de un nadador. Las gotas salen donde una mano o un pie cruza la superficie entre un
 * cuadro y el siguiente (entra o sale del agua).
 */
function wetFrames(frames: Raster[], big: BigFrame[], water: ({ level: number; big: boolean } | null)[], cell: number, left: number, top: number): Raster[] {
  const ends = ['handNear', 'handFar', 'footNear', 'footFar'] as const;
  return frames.map((fr, i) => {
    const w = water[i];
    if (!w) return fr;
    const row = cell - 2 - Math.round(w.level);
    const cur = big[i].joints, prev = big[(i - 1 + big.length) % big.length].joints;
    const splashes: [number, number][] = [];
    if (cur && prev) for (const e of ends) {
      const [x, y] = cur[e], py = prev[e][1] - top, cy = y - top;
      if ((py - row) * (cy - row) <= 0 && Math.abs(py - cy) >= 1) splashes.push([x - left, row]);
    }
    if (w.big && cur) splashes.push([cur.hip[0] - left, row]);
    return applyWater(fr, { row, splashes, frame: i, big: w.big });
  });
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
