import { createRaster, type Raster } from '../../core/raster';

/**
 * Sombra horneada de un objeto, en un PNG aparte del mismo tamaño (negra con alfa).
 *
 * La luz es la misma de todo el kit: de arriba a la izquierda. Cada pixel del objeto está a una altura sobre el
 * piso (lo que lo separa del apoyo hacia arriba) y su sombra cae en el piso corrida hacia la derecha y un poco hacia
 * abajo, proporcional a esa altura: larga en los árboles, corta en las piedras. Más lejos del pie, más suave
 * (penumbra), y pegado al pie, más oscura (sombra de contacto: es lo que asienta el objeto en el suelo).
 */
export function castShadow(frame: Raster, anchor: [number, number], opts: { length?: number; drop?: number; alpha?: number; contact?: number } = {}): Raster {
  const W = frame.w, H = frame.h;
  const len = opts.length ?? 0.42, drop = opts.drop ?? 0.2, alpha = opts.alpha ?? 110, contact = opts.contact ?? 1;
  const acc = new Float32Array(W * H);
  const ay = anchor[1];
  // el objeto "parado" en su apoyo: lo de arriba del apoyo proyecta
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (frame.data[(y * W + x) * 4 + 3] < 128) continue;
      const h = Math.max(0, ay - y);
      const sx = Math.round(x + h * len), sy = Math.round(ay - 2 + h * drop + (y - ay) * 0.25 * (y > ay ? 1 : 0));
      if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
      // más alto, más suave
      const w = 1 - Math.min(0.55, (h / Math.max(1, ay)) * 0.6);
      acc[sy * W + sx] = Math.max(acc[sy * W + sx], w);
    }
  // cerrar los huequitos de la proyección (un objeto sólido da una sombra sólida)
  const filled = new Float32Array(acc);
  for (let pass = 0; pass < 2; pass++)
    for (let y = 1; y < H - 1; y++)
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (filled[i]) continue;
        let n = 0, s = 0;
        for (const j of [i - 1, i + 1, i - W, i + W]) if (filled[j]) { n++; s += filled[j]; }
        if (n >= 3) filled[i] = s / n;
      }
  const out = createRaster(W, H);
  for (let i = 0; i < W * H; i++) {
    if (!filled[i]) continue;
    // donde está el propio objeto no hace falta sombra (se dibuja encima), pero se deja: el juego la pone debajo
    out.data[i * 4 + 3] = Math.round(alpha * filled[i]);
  }
  // sombra de contacto: una franja oscura de 1 a 3 px pegada al pie del objeto
  if (contact > 0) {
    let x0 = W, x1 = -1;
    for (let x = 0; x < W; x++) for (let y = Math.max(0, ay - 3); y <= Math.min(H - 1, ay); y++) if (frame.data[(y * W + x) * 4 + 3] > 128) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
    if (x1 >= x0) {
      const cx = (x0 + x1) / 2, rx = (x1 - x0) / 2 + 3;
      for (let y = ay - 2; y <= ay + 2; y++)
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          const d = ((x - cx) / rx) ** 2 + ((y - ay) / 2.6) ** 2;
          if (d > 1) continue;
          const k = (y * W + x) * 4 + 3;
          out.data[k] = Math.max(out.data[k], Math.round((d < 0.45 ? 165 : 120) * contact));
        }
    }
  }
  return out;
}

/** Pone una sombra debajo de una imagen (para las postales: el juego hace lo mismo con el PNG de la sombra). */
export function drawShadow(dst: Raster, shadow: Raster, ox: number, oy: number): void {
  for (let y = 0; y < shadow.h; y++)
    for (let x = 0; x < shadow.w; x++) {
      const a = shadow.data[(y * shadow.w + x) * 4 + 3];
      if (!a) continue;
      const X = ox + x, Y = oy + y;
      if (X < 0 || Y < 0 || X >= dst.w || Y >= dst.h) continue;
      const k = (Y * dst.w + X) * 4, t = a / 255;
      // sombra fría: oscurece tirando a azul, no a gris
      dst.data[k] = dst.data[k] * (1 - t) + 6 * t;
      dst.data[k + 1] = dst.data[k + 1] * (1 - t) + 10 * t;
      dst.data[k + 2] = dst.data[k + 2] * (1 - t) + 22 * t;
    }
}

export { type Raster };

/** Lo que un objeto necesita para su sombra: cuántos pixeles de lienzo de más a la derecha y abajo. */
export function shadowPad(frame: Raster, anchor: [number, number], len = 0.42, drop = 0.2): { right: number; bottom: number } {
  let right = 0, bottom = 0;
  for (let y = 0; y < frame.h; y++)
    for (let x = 0; x < frame.w; x++) {
      if (frame.data[(y * frame.w + x) * 4 + 3] < 128) continue;
      const h = Math.max(0, anchor[1] - y);
      right = Math.max(right, Math.ceil(x + h * len) - frame.w + 1);
      bottom = Math.max(bottom, Math.ceil(anchor[1] - 2 + h * drop) - frame.h + 4);
    }
  return { right: Math.max(0, right + 2), bottom: Math.max(0, bottom) };
}

/** Agranda el lienzo a la derecha y abajo (el apoyo no se mueve). */
export function padRaster(r: Raster, right: number, bottom: number): Raster {
  if (!right && !bottom) return r;
  const o = createRaster(r.w + right, r.h + bottom);
  for (let y = 0; y < r.h; y++) o.data.set(r.data.subarray(y * r.w * 4, (y + 1) * r.w * 4), y * o.w * 4);
  return o;
}

export interface Shadowed { name: string; w: number; h: number; anchor: [number, number]; anims: Record<string, { frames: Raster[]; fps: number; loop: boolean }>; shadow?: Raster }

/**
 * Le pone su sombra horneada a un objeto: agranda el lienzo lo justo para que la sombra entre y la calcula con el
 * primer cuadro de su animación de reposo (la sombra no se mueve con el viento: el piso no se mece).
 */
export function withShadow<T extends Shadowed>(o: T, opts: { length?: number; drop?: number; alpha?: number; contact?: number } = {}): T {
  const first = (o.anims.idle ?? Object.values(o.anims)[0]).frames[0];
  const pad = shadowPad(first, o.anchor, opts.length ?? 0.42, opts.drop ?? 0.2);
  const anims = Object.fromEntries(Object.entries(o.anims).map(([k, a]) => [k, { ...a, frames: a.frames.map((f) => padRaster(f, pad.right, pad.bottom)) }]));
  const base = padRaster(first, pad.right, pad.bottom);
  return { ...o, w: o.w + pad.right, h: o.h + pad.bottom, anims, shadow: castShadow(base, o.anchor, opts) };
}
