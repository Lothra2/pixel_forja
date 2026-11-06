// Tipos mínimos del núcleo de pixelfx: solo lo que usa el adaptador de la Forja (archivo agregado por la Forja).

/** Cuadro de pixelfx: `color` (pixeles opacos, ABGR en memoria) y `light` (luz aditiva). */
export interface CuadroPfx {
  w: number;
  h: number;
  ox: number;
  oy: number;
  color: Uint32Array;
  light: Uint32Array;
}

/** El pintor de pixelfx (opaco para la Forja). */
export type Pintor = object;

export interface MascaraPfx {
  w: number;
  h: number;
  data: Uint8Array;
}

/** El muñeco que leen los efectos de cuerpo: silueta, colores y puntos (pies en 0, 0). */
export interface ActorPfx {
  mask: MascaraPfx;
  pixels: Uint32Array;
  x: number;
  y: number;
  w: number;
  h: number;
  k: number;
  head: [number, number];
  chest: [number, number];
  eyes?: [number, number][];
}

export interface InstanciaPfx {
  readonly t: number;
  options: Record<string, unknown>;
  update(dt: number): void;
  draw(frame: CuadroPfx, layer?: 'back' | 'front'): void;
  stop(): void;
  done(): boolean;
}

export function createFrame(w: number, h: number, ox?: number, oy?: number): CuadroPfx;
export function clearFrame(f: CuadroPfx): CuadroPfx;
export function createFx(mod: unknown, o?: Record<string, unknown>): InstanciaPfx;
export function composite(f: CuadroPfx, out: Uint8ClampedArray, bg?: number | Uint32Array | null, lightK?: number): Uint8ClampedArray;
export function stockActor(k?: number): ActorPfx;
export function hex(h: string | number): number;
export function toHex(c: number): string;
