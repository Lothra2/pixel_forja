import { type Raster, upscaleNearest } from '../core/raster';

export interface GifOptions {
  scale?: number;
  /** color de fondo; si no se da, el fondo es transparente */
  background?: [number, number, number];
  /** cuánto dura cada cuadro, en centésimas de segundo (si no se da, todos duran 1/fps) */
  delays?: number[];
}

/** Escritor de bytes que crece solo. */
class Bytes {
  buf = new Uint8Array(1 << 16);
  n = 0;
  byte(b: number) {
    if (this.n >= this.buf.length) { const nb = new Uint8Array(this.buf.length * 2); nb.set(this.buf); this.buf = nb; }
    this.buf[this.n++] = b & 255;
  }
  u16(v: number) { this.byte(v); this.byte(v >> 8); }
  str(s: string) { for (const c of s) this.byte(c.charCodeAt(0)); }
  all(a: ArrayLike<number>) { for (let i = 0; i < a.length; i++) this.byte(a[i]); }
  out() { return this.buf.slice(0, this.n); }
}

/** Compresión LZW de GIF (códigos de largo variable, LSB primero, bloques de 255). */
function lzw(minCode: number, idx: Uint8Array, out: Bytes) {
  const clear = 1 << minCode, eoi = clear + 1;
  let size = minCode + 1, next = eoi + 1;
  let table = new Map<number, number>();
  const block: number[] = [];
  let cur = 0, bits = 0;
  const emit = (code: number) => {
    cur |= code << bits;
    bits += size;
    while (bits >= 8) {
      block.push(cur & 255);
      cur >>>= 8;
      bits -= 8;
      if (block.length === 255) { out.byte(255); out.all(block); block.length = 0; }
    }
  };
  out.byte(minCode);
  emit(clear);
  let prefix = idx[0];
  for (let i = 1; i < idx.length; i++) {
    const k = idx[i];
    const key = (prefix << 8) | k;
    const hit = table.get(key);
    if (hit !== undefined) { prefix = hit; continue; }
    emit(prefix);
    if (next === 4096) {
      emit(clear);
      next = eoi + 1;
      size = minCode + 1;
      table = new Map();
    } else {
      if (next >= 1 << size) size++;
      table.set(key, next++);
    }
    prefix = k;
  }
  emit(prefix);
  emit(eoi);
  if (bits > 0) block.push(cur & 255);
  if (block.length) { out.byte(block.length); out.all(block); }
  out.byte(0);
}

/** GIF animado con paleta exacta: los colores del pixel art salen idénticos, sin cuantizar. */
export function encodeGif(frames: Raster[], fps: number, opt: GifOptions = {}): Uint8Array {
  const k = opt.scale ?? 4;
  const big = frames.map((f) => (k === 1 ? f : upscaleNearest(f, k)));
  const w = big[0].w, h = big[0].h;
  const palette: number[][] = [opt.background ? [...opt.background] : [0, 0, 0]];
  const index = new Map<number, number>();
  const indexed = big.map((f) => {
    const idx = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      if (!f.data[i * 4 + 3]) continue;
      const key = (f.data[i * 4] << 16) | (f.data[i * 4 + 1] << 8) | f.data[i * 4 + 2];
      let v = index.get(key);
      if (v === undefined) {
        if (palette.length >= 256) throw new Error('Más de 255 colores: no cabe en un GIF');
        v = palette.length;
        index.set(key, v);
        palette.push([f.data[i * 4], f.data[i * 4 + 1], f.data[i * 4 + 2]]);
      }
      idx[i] = v;
    }
    return idx;
  });
  let depth = 1;
  while (1 << depth < palette.length) depth++;
  const out = new Bytes();
  out.str('GIF89a');
  out.u16(w);
  out.u16(h);
  out.byte(0x80 | ((depth - 1) << 4) | (depth - 1));
  out.byte(0);
  out.byte(0);
  for (let i = 0; i < 1 << depth; i++) out.all(palette[i] ?? [0, 0, 0]);
  // repetir para siempre
  out.all([0x21, 0xff, 0x0b]);
  out.str('NETSCAPE2.0');
  out.all([3, 1, 0, 0, 0]);
  const delay = Math.round(100 / fps);
  const transparent = !opt.background;
  for (const [fi, idx] of indexed.entries()) {
    out.all([0x21, 0xf9, 4, ((transparent ? 2 : 1) << 2) | (transparent ? 1 : 0)]);
    out.u16(opt.delays ? Math.max(2, Math.round(opt.delays[fi] ?? delay)) : delay);
    out.byte(0);
    out.byte(0);
    out.byte(0x2c);
    out.u16(0); out.u16(0); out.u16(w); out.u16(h);
    out.byte(0);
    lzw(Math.max(2, depth), idx, out);
  }
  out.byte(0x3b);
  return out.out();
}
