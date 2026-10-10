/** Imagen RGBA en memoria. El motor nunca usa Canvas: así da los mismos pixeles en navegador y en Node. */
export interface Raster {
  w: number;
  h: number;
  data: Uint8ClampedArray; // RGBA
}

export function createRaster(w: number, h: number): Raster {
  return { w, h, data: new Uint8ClampedArray(w * h * 4) };
}

export function cloneRaster(r: Raster): Raster {
  return { w: r.w, h: r.h, data: new Uint8ClampedArray(r.data) };
}

export type RGBA = [number, number, number, number];

export function getPx(r: Raster, x: number, y: number): RGBA {
  const i = (y * r.w + x) * 4;
  return [r.data[i], r.data[i + 1], r.data[i + 2], r.data[i + 3]];
}

export function setPx(r: Raster, x: number, y: number, c: RGBA): void {
  if (x < 0 || y < 0 || x >= r.w || y >= r.h) return;
  const i = (y * r.w + x) * 4;
  r.data[i] = c[0];
  r.data[i + 1] = c[1];
  r.data[i + 2] = c[2];
  r.data[i + 3] = c[3];
}

/** Recorta un rectángulo (con relleno transparente si se sale de la imagen). */
export function crop(r: Raster, x0: number, y0: number, w: number, h: number): Raster {
  const out = createRaster(w, h);
  for (let y = 0; y < h; y++) {
    const sy = y + y0;
    if (sy < 0 || sy >= r.h) continue;
    for (let x = 0; x < w; x++) {
      const sx = x + x0;
      if (sx < 0 || sx >= r.w) continue;
      const si = (sy * r.w + sx) * 4;
      const di = (y * w + x) * 4;
      out.data[di] = r.data[si];
      out.data[di + 1] = r.data[si + 1];
      out.data[di + 2] = r.data[si + 2];
      out.data[di + 3] = r.data[si + 3];
    }
  }
  return out;
}

/** Reducción por área (promedio con alfa premultiplicado). Solo para análisis, nunca para el pixel art final. */
export function downscaleForAnalysis(r: Raster, maxSide: number): { raster: Raster; scale: number } {
  const s = Math.min(1, maxSide / Math.max(r.w, r.h));
  if (s === 1) return { raster: r, scale: 1 };
  const w = Math.max(1, Math.round(r.w * s));
  const h = Math.max(1, Math.round(r.h * s));
  const out = createRaster(w, h);
  for (let y = 0; y < h; y++) {
    const sy0 = Math.floor(y / s), sy1 = Math.min(r.h, Math.floor((y + 1) / s));
    for (let x = 0; x < w; x++) {
      const sx0 = Math.floor(x / s), sx1 = Math.min(r.w, Math.floor((x + 1) / s));
      let R = 0, G = 0, B = 0, A = 0, n = 0;
      for (let yy = sy0; yy < Math.max(sy1, sy0 + 1); yy++)
        for (let xx = sx0; xx < Math.max(sx1, sx0 + 1); xx++) {
          const i = (yy * r.w + xx) * 4;
          const a = r.data[i + 3];
          R += r.data[i] * a; G += r.data[i + 1] * a; B += r.data[i + 2] * a; A += a; n++;
        }
      const di = (y * w + x) * 4;
      if (A > 0) {
        out.data[di] = R / A; out.data[di + 1] = G / A; out.data[di + 2] = B / A;
      }
      out.data[di + 3] = A / n;
    }
  }
  return { raster: out, scale: s };
}

/** Escala entera con vecino más cercano, para ver pixel art ampliado. */
export function upscaleNearest(r: Raster, k: number): Raster {
  const out = createRaster(r.w * k, r.h * k);
  for (let y = 0; y < out.h; y++)
    for (let x = 0; x < out.w; x++) {
      const si = (Math.floor(y / k) * r.w + Math.floor(x / k)) * 4;
      const di = (y * out.w + x) * 4;
      out.data[di] = r.data[si]; out.data[di + 1] = r.data[si + 1];
      out.data[di + 2] = r.data[si + 2]; out.data[di + 3] = r.data[si + 3];
    }
  return out;
}

/** Pega `src` sobre `dst` en (ox, oy) respetando alfa (sin mezcla: alfa 0 o 255). */
export function blit(dst: Raster, src: Raster, ox: number, oy: number): void {
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const si = (y * src.w + x) * 4;
      if (src.data[si + 3] === 0) continue;
      const dx = x + ox, dy = y + oy;
      if (dx < 0 || dy < 0 || dx >= dst.w || dy >= dst.h) continue;
      const di = (dy * dst.w + dx) * 4;
      dst.data[di] = src.data[si]; dst.data[di + 1] = src.data[si + 1];
      dst.data[di + 2] = src.data[si + 2]; dst.data[di + 3] = src.data[si + 3];
    }
}

/** Rellena con un color de fondo sólido (para vistas previas). */
export function fill(r: Raster, c: RGBA): void {
  for (let i = 0; i < r.w * r.h; i++) r.data.set(c, i * 4);
}
