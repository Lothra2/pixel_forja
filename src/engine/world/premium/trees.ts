import { createRaster, type Raster } from '../../core/raster';
import { drawCanopy, drawTrunk, drawPineTiers, splitAnims, swayFrames, RAMPS, type Puff, type Flora } from '../flora';

/**
 * Árboles premium: cada especie en 3 tamaños y 3 formas de copa (9 por especie), con escala de verdad respecto a la
 * heroína (44 px): un árbol joven mide unos 115 px, uno adulto unos 145 y uno viejo unos 180. Mismo formato que la
 * flora v3 (9 cuadros de viento, `tronco` y `copa` aparte), pero sin la sombra pegada: la sombra va en su PNG aparte
 * (`sombra`), proyectada con la misma luz del kit, así cae siempre hacia abajo a la derecha.
 *
 * Nombres: `roble_t<tamaño>_<forma>` y `pino_t<tamaño>_<forma>`, tamaño 0 chico, 1 adulto, 2 viejo; forma 0 redonda,
 * 1 alta, 2 ancha y despareja.
 */

function hash(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Altura total por tamaño (px). */
export const TREE_HEIGHT = [116, 146, 182];

/** Nubes de la copa del roble según la forma: redonda, alta o ancha y despareja. */
function oakCrown(cx: number, cy: number, s: number, shape: number, seed: number): Puff[] {
  const base: [number, number, number][] = shape === 1
    // alta: una columna de nubes, más angosta
    ? [[0, -14, 13], [0, 0, 14], [-10, 8, 11], [10, 9, 11], [-5, -26, 10], [6, -24, 10], [0, 16, 10]]
    : shape === 2
      // ancha y despareja: se abre hacia un lado, con un hueco
      ? [[-4, -4, 15], [-20, 4, 12], [16, 0, 13], [28, 6, 9], [-10, 12, 12], [8, 12, 12], [-14, -14, 10], [10, -14, 9]]
      // redonda (la clásica)
      : [[0, -6, 15], [-14, 2, 12], [14, 1, 12.5], [-6, 10, 12], [8, 11, 11.5], [-8, -16, 9.5], [9, -15, 10]];
  return base.map(([x, y, r], i) => ({ x: cx + x * s + (hash(i, 1, seed) - 0.5) * 4 * s, y: cy + y * s + (hash(i, 2, seed) - 0.5) * 3 * s, r: r * s * (0.9 + hash(i, 3, seed) * 0.2) }));
}

/** Roble premium. */
export function oakP(size: 0 | 1 | 2, shape: 0 | 1 | 2): Flora {
  const H = TREE_HEIGHT[size];
  const s = H / 98;
  const W = Math.round((shape === 2 ? 118 : shape === 1 ? 86 : 104) * s * 0.9);
  const cx = Math.round(W / 2 - (shape === 2 ? 6 * s : 0)), base = H - 6, seed = 5100 + size * 97 + shape * 13;
  const crownC = H * (shape === 1 ? 0.36 : 0.4);
  const puffs = oakCrown(cx, crownC, s, shape, seed);
  const trunkTop = Math.round(H * 0.58);
  const paint = (sw: number, crown: boolean) => {
    const r = createRaster(W, H);
    drawTrunk(r, cx, base, trunkTop, (9 + size * 2) * s * 0.9, (6.5 + size) * s * 0.9, RAMPS.corteza, seed, shape === 2 ? 3 : 0, 3 + size);
    if (crown) drawCanopy(r, puffs, RAMPS.roble, seed, sw, size === 2 ? 7 : 6);
    return r;
  };
  const sws = swayFrames(1.1 + size * 0.25), frames = sws.map((v) => paint(v, true));
  const tw = Math.round((6 + size * 1.5) * s);
  return { name: `roble_t${size}_${shape}`, w: W, h: H, anchor: [cx, base], solid: [-tw, -6, tw * 2, 6], anims: { idle: { frames, fps: 5, loop: true }, ...splitAnims(frames, sws.map((v) => paint(v, false)), 5) } };
}

/** Pino premium: más pisos cuanto más viejo, y la forma cambia el ancho y el largo de los pisos. */
export function pineP(size: 0 | 1 | 2, shape: 0 | 1 | 2): Flora {
  const H = TREE_HEIGHT[size] + 6;
  const s = H / 124;
  const W = Math.round((shape === 2 ? 78 : shape === 1 ? 56 : 66) * s);
  const cx = Math.round(W / 2), base = H - 5, seed = 7300 + size * 89 + shape * 17;
  const tiers = 5 + size + (shape === 1 ? 1 : 0);
  const tierH = ((shape === 1 ? 22 : 26) * s * (5 + size)) / tiers * 1.05;
  const w0 = (shape === 2 ? 8 : 6) * s, dw = ((shape === 1 ? 3.6 : shape === 2 ? 5.6 : 4.8) * s * (5 + size)) / tiers * 1.05;
  const paint = (sw: number, crown: boolean) => {
    const r = createRaster(W, H);
    drawTrunk(r, cx, base, base - Math.round(26 * s), 7 * s, 5 * s, RAMPS.corteza, seed, 0, 2 + size);
    if (!crown) drawTrunk(r, cx, base - Math.round(22 * s), Math.round(14 * s), 5 * s, 2, RAMPS.corteza, seed, 0, 0);
    if (crown) drawPineTiers(r, cx, Math.round(4 * s), tiers, tierH, w0, dw, RAMPS.pino, seed, sw, base);
    return r;
  };
  const sws = swayFrames(1 + size * 0.2), frames = sws.map((v) => paint(v, true));
  const tw = Math.round(5 * s);
  return { name: `pino_t${size}_${shape}`, w: W, h: H, anchor: [cx, base], solid: [-tw, -5, tw * 2, 5], anims: { idle: { frames, fps: 5, loop: true }, ...splitAnims(frames, sws.map((v) => paint(v, false)), 5) } };
}

/** Los 18 árboles premium. */
export function treesPremium(): Flora[] {
  const out: Flora[] = [];
  for (const size of [0, 1, 2] as const) for (const shape of [0, 1, 2] as const) out.push(oakP(size, shape), pineP(size, shape));
  return out;
}

export type { Raster };
