import { encode, decode } from 'fast-png';
import type { Raster } from '../core/raster';

/** PNG sin pérdida, igual en navegador y en Node. */
export function encodePng(r: Raster): Uint8Array {
  return encode({ width: r.w, height: r.h, data: new Uint8Array(r.data.buffer, r.data.byteOffset, r.data.byteLength), channels: 4, depth: 8 });
}

export function decodePng(bytes: Uint8Array | ArrayBuffer): Raster {
  const img = decode(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  const { width: w, height: h } = img;
  const out = new Uint8ClampedArray(w * h * 4);
  const ch = img.channels;
  const src = img.data as Uint8Array | Uint16Array;
  const shift = img.depth === 16 ? 8 : 0;
  for (let i = 0; i < w * h; i++) {
    if (ch === 4) { for (let k = 0; k < 4; k++) out[i * 4 + k] = src[i * 4 + k] >> shift; }
    else if (ch === 3) { for (let k = 0; k < 3; k++) out[i * 4 + k] = src[i * 3 + k] >> shift; out[i * 4 + 3] = 255; }
    else if (ch === 2) { const v = src[i * 2] >> shift; out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = v; out[i * 4 + 3] = src[i * 2 + 1] >> shift; }
    else { const v = src[i] >> shift; out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = v; out[i * 4 + 3] = 255; }
  }
  if (img.palette) {
    const pal = img.palette;
    for (let i = 0; i < w * h; i++) {
      const c = pal[(src as Uint8Array)[i]];
      out[i * 4] = c[0]; out[i * 4 + 1] = c[1]; out[i * 4 + 2] = c[2]; out[i * 4 + 3] = c.length > 3 ? c[3] : 255;
    }
  }
  return { w, h, data: out };
}
