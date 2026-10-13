import { createRaster, type Raster } from '../../core/raster';

/**
 * Sombra de contacto (Mundo 4 y portales): solo la oclusión donde el objeto toca el piso, oscura y corta, sin
 * dirección. La luz del Mundo 4 es puntual y se mueve (el farol de Thor), y el juego ya hace la sombra larga que cae
 * lejos de esa luz: si se horneara una con dirección, habría dos sombras peleando.
 *
 * Se mide el pie del objeto (lo que hay en las últimas filas por encima del apoyo) y se pone una elipse oscura un
 * poco más ancha, más negra en el centro y con un borde más suave. Mismo tamaño que el objeto, negra con alfa.
 */
export function contactShadow(frame: Raster, anchor: [number, number], opts: { rows?: number; alpha?: number; spread?: number; tall?: number } = {}): Raster {
  const W = frame.w, H = frame.h, ay = anchor[1];
  const rows = opts.rows ?? 4, alpha = opts.alpha ?? 175, spread = opts.spread ?? 3, tall = opts.tall ?? 2.6;
  const out = createRaster(W, H);
  // el ancho del pie, por tramos (un arco tiene dos pies: cada tramo da su propia mancha)
  const cols = new Uint8Array(W);
  for (let x = 0; x < W; x++) for (let y = Math.max(0, ay - rows); y <= Math.min(H - 1, ay + 1); y++) if (frame.data[(y * W + x) * 4 + 3] > 128) cols[x] = 1;
  const runs: [number, number][] = [];
  for (let x = 0; x < W; x++) {
    if (!cols[x]) continue;
    const x0 = x;
    while (x + 1 < W && cols[x + 1]) x++;
    runs.push([x0, x]);
  }
  for (const [x0, x1] of runs) {
    const cx = (x0 + x1) / 2, rx = (x1 - x0) / 2 + spread;
    for (let y = Math.floor(ay - tall); y <= Math.ceil(ay + tall); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - ay) / tall) ** 2;
        if (d > 1) continue;
        const k = (y * W + x) * 4 + 3;
        out.data[k] = Math.max(out.data[k], Math.round(alpha * (d < 0.4 ? 1 : d < 0.75 ? 0.72 : 0.42)));
      }
  }
  return out;
}
