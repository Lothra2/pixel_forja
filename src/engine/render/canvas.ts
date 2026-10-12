import { type Raster, createRaster } from '../core/raster';
import { hexToRgb } from '../color/oklab';

/**
 * Lienzo por capas. Cada pixel sabe de qué pieza es (capa) y cuál es su tono oscuro.
 * Con eso se hace el contorno selectivo: nada de línea negra, el borde toma el tono oscuro
 * de la pieza que queda detrás.
 */
export interface Paint {
  /** color RGBA empaquetado */
  color: number;
  /** tono oscuro del material (para contornos) */
  dark: number;
  /** material (para saber si dos piezas son de la misma tela) */
  mat: number;
}

export const enum Layer {
  HairBack = 1,
  Behind = 2,
  FarArm = 3,
  FarLeg = 4,
  PropMid = 5,
  NearLeg = 6,
  Skirt = 7,
  Torso = 8,
  /** brazo levantado: pasa detrás de la cabeza (los brazos del chibi no llegan por encima de ella) */
  ArmUp = 9,
  Head = 10,
  NearArm = 11,
  Prop = 12,
}

const colorCache = new Map<string, number>();
export function packHex(hex: string): number {
  let v = colorCache.get(hex);
  if (v === undefined) {
    const [r, g, b] = hexToRgb(hex);
    v = ((r << 24) | (g << 16) | (b << 8) | 255) >>> 0;
    colorCache.set(hex, v);
  }
  return v;
}

export class LayerCanvas {
  readonly color: Uint32Array;
  readonly dark: Uint32Array;
  readonly mat: Int16Array;
  readonly layer: Int8Array;
  constructor(readonly w: number, readonly h: number, readonly ox: number, readonly oy: number) {
    this.color = new Uint32Array(w * h);
    this.dark = new Uint32Array(w * h);
    this.mat = new Int16Array(w * h).fill(-1);
    this.layer = new Int8Array(w * h);
  }
  /** Pinta en coordenadas del esqueleto (origen en la cadera). */
  put(x: number, y: number, layer: number, p: Paint): void {
    const X = x + this.ox, Y = y + this.oy;
    if (X < 0 || Y < 0 || X >= this.w || Y >= this.h) return;
    const i = Y * this.w + X;
    // una pieza de atrás nunca tapa a una de adelante, sin importar el orden de dibujo
    if (this.layer[i] > layer) return;
    this.color[i] = p.color;
    this.dark[i] = p.dark;
    this.mat[i] = p.mat;
    this.layer[i] = layer;
  }
  layerAt(x: number, y: number): number {
    const X = x + this.ox, Y = y + this.oy;
    if (X < 0 || Y < 0 || X >= this.w || Y >= this.h) return 0;
    return this.layer[Y * this.w + X];
  }
  bbox(): { x0: number; y0: number; x1: number; y1: number } | null {
    const w = this.w, h = this.h, layer = this.layer;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (layer[y * w + x]) {
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
    return x1 < 0 ? null : { x0, y0, x1, y1 };
  }
}

export interface OutlineRules {
  /** pares de capas que no se separan con línea si son del mismo material (pierna y cadera del pantalón) */
  fused: [number, number][];
}

/**
 * Contorno selectivo:
 * 1. Donde una pieza pasa por delante de otra, el pixel de la pieza de atrás toma su tono oscuro.
 * 2. Afuera de la silueta, el contorno toma el tono oscuro de la pieza que toca.
 */
export function finalizeOutlines(c: LayerCanvas, rules: OutlineRules): void {
  const { w, h } = c;
  const layer = c.layer, mat = c.mat, dark = c.dark;
  const isFused = (a: number, b: number) => rules.fused.some(([p, q]) => (p === a && q === b) || (p === b && q === a));
  const newColor = new Uint32Array(c.color);
  // los 4 vecinos en orden (izquierda, derecha, arriba, abajo) sin crear un arreglo por pixel: es el lazo más caliente del kit
  const nb = new Int32Array(4);
  const vecinos = (x: number, y: number, i: number) => {
    nb[0] = x > 0 ? i - 1 : -1; nb[1] = x < w - 1 ? i + 1 : -1; nb[2] = y > 0 ? i - w : -1; nb[3] = y < h - 1 ? i + w : -1;
  };
  // solo se recorre la caja de lo pintado más un pixel de margen (el contorno de afuera cae ahí)
  const bb = c.bbox();
  if (!bb) return;
  const X0 = Math.max(0, bb.x0 - 1), X1 = Math.min(w - 1, bb.x1 + 1), Y0 = Math.max(0, bb.y0 - 1), Y1 = Math.min(h - 1, bb.y1 + 1);
  for (let y = Y0; y <= Y1; y++)
    for (let x = X0; x <= X1; x++) {
      const i = y * w + x;
      const L = layer[i];
      if (!L) continue;
      vecinos(x, y, i);
      for (let k = 0; k < 4; k++) {
        const j = nb[k];
        if (j < 0) continue;
        const M = layer[j];
        if (M > L && !(mat[j] === mat[i] && isFused(L, M))) {
          newColor[i] = dark[i];
          break;
        }
      }
    }
  c.color.set(newColor);
  // contorno exterior (4 vecinos: esquinas limpias)
  const outColor = new Uint32Array(w * h);
  const outLayer = new Int8Array(w * h);
  for (let y = Y0; y <= Y1; y++)
    for (let x = X0; x <= X1; x++) {
      const i = y * w + x;
      if (layer[i]) continue;
      let best = 0, bl = 0;
      vecinos(x, y, i);
      for (let k = 0; k < 4; k++) {
        const j = nb[k];
        if (j < 0 || !layer[j]) continue;
        if (layer[j] > bl) { bl = layer[j]; best = dark[j]; }
      }
      if (bl) { outColor[i] = best; outLayer[i] = bl; }
    }
  for (let y = Y0; y <= Y1; y++)
    for (let i = y * w + X0; i <= y * w + X1; i++)
      if (outLayer[i]) {
        c.color[i] = outColor[i];
        layer[i] = outLayer[i];
        mat[i] = -2; // contorno
      }
}

export function toRaster(c: LayerCanvas, x0: number, y0: number, w: number, h: number, dx: number, dy: number): Raster {
  const out = createRaster(w, h);
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      const i = y * c.w + x;
      if (!c.layer[i]) continue;
      const X = x - x0 + dx, Y = y - y0 + dy;
      if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
      const v = c.color[i];
      const o = (Y * w + X) * 4;
      out.data[o] = v >>> 24;
      out.data[o + 1] = (v >>> 16) & 255;
      out.data[o + 2] = (v >>> 8) & 255;
      out.data[o + 3] = v & 255;
    }
  return out;
}
