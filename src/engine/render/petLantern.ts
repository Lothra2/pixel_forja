import { createRaster, type Raster } from '../core/raster';
import type { AnimalFicha, CellSize } from '../sheet/ficha';
import { animalDims } from '../rig/animal';
import { animalAnim } from '../anim/registry';
import { petPremiumAnim } from '../anim/petPremium';
import { renderPet3d, type PetHook, type PetView } from './pet3d';
import { cropClip, mirror, isPremiumClip, MIRRORED, type ViewName } from './clip';
import type { BigFrame } from './human';

/**
 * El farol de Thor (Mundo 4, parte 3): una capa que va ENCIMA de la hoja de Thor, cuadro por cuadro, con la misma
 * celda, el mismo pivote, las mismas animaciones y las mismas 8 direcciones. Cada cuadro trae solo el farol colgando
 * de la boca, en su lugar exacto: el juego lo dibuja sobre Thor con cualquier armadura.
 *
 * Cómo: se vuelve a armar cada pose de Thor igual que su hoja (mismo esqueleto, misma vista, mismo encuadre) y el
 * pintor de la mascota avisa dónde cae la boca en pantalla y qué tan cerca de la cámara está cada pixel de Thor. El
 * farol cuelga derecho hacia abajo desde los dientes (la gravedad baja en pantalla) y se mece con un cuadro de
 * retraso cuando la cabeza se mueve. Donde la cabeza o el cuerpo de Thor quedan delante (de espaldas), el farol no se
 * dibuja. En `howl` Thor levanta la cabeza y el farol queda arriba: es el "alzar el farol".
 *
 * El farol está pintado a mano a pixel (7 x 10) para que se lea a x1: hierro negro, vidrio ámbar y una llamita que
 * titila en dos tonos.
 */

const O = '#0c0a0e', IRON = '#34343e', IRON_L = '#62626e', BRASS = '#8a6a34';
/** el farol prendido: vidrio ámbar con la luz de arriba a la izquierda, llama en dos tonos */
const LIT = { glassL: '#ffc070', glass: '#f09a3a', glassD: '#c06a1e', flame: ['#fff4c8', '#ffe08a'], core: ['#ffffff', '#fff4c8'] };
const OFF = { glassL: '#5a4a32', glass: '#3e3224', glassD: '#2a2018', flame: ['#3e3224', '#3e3224'], core: ['#4a3c2a', '#4a3c2a'] };

/**
 * El dibujo del farol (7 x 10), fila por fila. b: el asa (lo que muerde Thor), o: contorno, i/h: hierro y su brillo,
 * L/G/D: vidrio claro, medio y oscuro, F: llama, C: el corazón de la llama, B: el remate de bronce.
 */
const SPRITE = [
  '..bbb..',
  '.b...b.',
  '..oBo..',
  '.ohiio.',
  'oLGFGDo',
  'oLFCFDo',
  'oLGFGDo',
  'oLGGGDo',
  'ohiiiio',
  '.ooooo.',
];

/** Pinta el farol con la fila 0 (el asa) centrada en (x, y). sway: -1, 0 o 1 (el cuerpo se corre, el asa no). */
function drawLantern(r: Raster, x: number, y: number, lit: boolean, f: number, sway: number, hidden: (X: number, Y: number) => boolean) {
  const P = lit ? LIT : OFF;
  const t = f % 2;
  const col: Record<string, string> = { b: IRON_L, o: O, h: IRON_L, i: IRON, L: P.glassL, G: P.glass, D: P.glassD, F: P.flame[t], C: P.core[t], B: BRASS };
  SPRITE.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === '.') return;
    // el cuerpo se mece, el asa queda en los dientes; la fila del medio del asa acompaña a medias
    const off = j === 0 ? 0 : j === 1 ? (sway ? Math.sign(sway) * (i < 3 === sway < 0 ? 1 : 0) : 0) : sway;
    const X = x - 3 + i + off, Y = y + j;
    if (X < 0 || Y < 0 || X >= r.w || Y >= r.h || hidden(X, Y)) return;
    const k = (Y * r.w + X) * 4, v = col[ch];
    r.data[k] = parseInt(v.slice(1, 3), 16); r.data[k + 1] = parseInt(v.slice(3, 5), 16); r.data[k + 2] = parseInt(v.slice(5, 7), 16); r.data[k + 3] = 255;
  }));
}

export interface LanternClip { frames: Raster[]; thor: Raster[]; fps: number; loop: boolean; /** dónde quedó el asa en cada cuadro (en la celda) */ handle: ([number, number] | null)[] }

/** El farol de una animación en una vista, con el mismo encuadre que la hoja de Thor. */
export function lanternClip(f: AnimalFicha, cell: CellSize, name: string, view: ViewName, lit: boolean): LanternClip {
  const premium = isPremiumClip(f, name);
  const def = (premium ? petPremiumAnim(name) : undefined) ?? animalAnim(name);
  if (!def) throw new Error(`No existe la animación ${name}`);
  const d = animalDims(f.body.species, cell, f.body.size, f.movementProfile === 'premium');
  const poses = def.build(d);
  const base = (MIRRORED[view] ?? view) as string;
  const pv = (base === 'side' || base === 'se' || base === 'front' || base === 'ne' || base === 'back' ? base : 'side') as PetView;
  const hooks: PetHook[] = [];
  const big: BigFrame[] = poses.map((p) => renderPet3d(f, cell, p, pv, f.barding ?? 0, (h) => hooks.push(h)));
  // el mismo encuadre que la hoja de Thor
  const { frames: thor, left, top } = cropClip(big, cell, premium);
  // dónde muerde: un poco detrás de la punta del hocico, entre los dientes
  const bite = hooks.map((h) => {
    const [a, b] = h.mouth;
    const m: [number, number, number] = [a[0] + (b[0] - a[0]) * 0.62, a[1] + (b[1] - a[1]) * 0.62, a[2] + (b[2] - a[2]) * 0.62];
    const p = h.proj(m);
    return { x: p.x + h.dx, y: p.y + h.dy, dep: p.dep };
  });
  // vaivén: el farol se queda atrás cuando la boca se mueve (un cuadro de retraso)
  const n = poses.length;
  const at = (i: number) => bite[def.loop ? ((i % n) + n) % n : Math.max(0, Math.min(n - 1, i))];
  const frames: Raster[] = [];
  const handle: ([number, number] | null)[] = [];
  for (let i = 0; i < n; i++) {
    const h = hooks[i], b = bite[i];
    const W = h.W, H = h.H;
    const full = createRaster(W, H);
    const v = b.x - at(i - 1).x;
    const sway = v > 0.6 ? -1 : v < -0.6 ? 1 : 0;
    // no se mete debajo del piso: si la cabeza está muy baja, el farol se apoya en el suelo
    const ground = h.groundRow;
    const y = Math.min(b.y + 1, ground - SPRITE.length + 1);
    // tapado por Thor: un pixel de Thor más cerca de la cámara que el farol (con un margen) lo tapa
    const hidden = (X: number, Y: number) => {
      const ux = X - h.dx, uy = Y - h.dy;
      if (ux < 0 || uy < 0 || ux >= W || uy >= H) return false;
      const dz = h.depth[uy * W + ux];
      return isFinite(dz) && dz > b.dep + 2.2;
    };
    drawLantern(full, b.x, y, lit, i, sway, hidden);
    // al encuadre de la celda
    const out = createRaster(cell, cell);
    for (let yy = 0; yy < cell; yy++) for (let xx = 0; xx < cell; xx++) {
      const sx = xx + left, sy = yy + top;
      if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
      const si = (sy * W + sx) * 4, di = (yy * cell + xx) * 4;
      for (let c = 0; c < 4; c++) out.data[di + c] = full.data[si + c];
    }
    frames.push(out);
    handle.push([b.x - left, y - top]);
  }
  const mirrored = !!MIRRORED[view];
  return {
    frames: mirrored ? frames.map(mirror) : frames, thor: mirrored ? thor.map(mirror) : thor, fps: def.fps, loop: def.loop,
    handle: mirrored ? handle.map((p) => (p ? [cell - 1 - p[0], p[1]] as [number, number] : null)) : handle,
  };
}
