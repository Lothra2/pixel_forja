import { createRaster, type Raster } from '../core/raster';

/**
 * La flecha: pintada a mano pixel por pixel (no con partículas), porque es un objeto y no un hechizo.
 * Celda de 48, flecha de 20 px mirando a la derecha (después se gira a las 8 direcciones).
 * Proyectil: 2 cuadros con un destello que recorre la punta. Impacto: astillas y polvo.
 */

type RGB = [number, number, number];
const OUT: RGB = [28, 18, 12];
const SHAFT: RGB = [138, 90, 50], SHAFT_HI: RGB = [184, 128, 74];
const STEEL: RGB = [200, 208, 218], STEEL_DK: RGB = [120, 130, 146], TIP: RGB = [255, 255, 255];
const FEATHER: RGB = [216, 36, 62], FEATHER_HI: RGB = [255, 120, 130], FEATHER_W: RGB = [242, 239, 230];

function put(r: Raster, x: number, y: number, c: RGB, a = 255) {
  if (x < 0 || y < 0 || x >= r.w || y >= r.h) return;
  const i = (y * r.w + x) * 4;
  if (a < 255 && r.data[i + 3]) return;
  r.data.set([...c, a], i);
}

/** Contorno de 1 px alrededor de lo pintado (lee mejor sobre cualquier piso). */
function outline(r: Raster) {
  const src = new Uint8Array(r.w * r.h);
  for (let i = 0; i < src.length; i++) src[i] = r.data[i * 4 + 3] === 255 ? 1 : 0;
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    if (src[y * r.w + x]) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < r.w && Y < r.h && src[Y * r.w + X]; })) put(r, x, y, OUT);
  }
}

function drawArrow(r: Raster, x0: number, y: number, glint: number) {
  // asta de 2 px: luz arriba
  for (let x = x0 + 3; x <= x0 + 15; x++) { put(r, x, y, SHAFT_HI); put(r, x, y + 1, SHAFT); }
  // plumas: dos aletas barridas hacia atrás (roja arriba, roja abajo, puntas blancas)
  for (const [dx, dy, c] of [[0, -3, FEATHER_W], [1, -3, FEATHER_HI], [1, -2, FEATHER], [2, -2, FEATHER_HI], [3, -1, FEATHER], [2, -1, FEATHER], [4, -1, FEATHER]] as [number, number, RGB][]) put(r, x0 + dx, y + dy, c);
  for (const [dx, dy, c] of [[0, 4, FEATHER_W], [1, 4, FEATHER], [1, 3, FEATHER], [2, 3, FEATHER], [3, 2, FEATHER], [2, 2, FEATHER], [4, 2, FEATHER]] as [number, number, RGB][]) put(r, x0 + dx, y + dy, c);
  // punta de acero en flecha
  const hx = x0 + 16;
  for (let k = 0; k < 4; k++) {
    const half = 2 - Math.floor(k / 1.6);
    for (let dy = -half; dy <= half + 1; dy++) put(r, hx + k, y + dy, dy <= 0 ? STEEL : STEEL_DK);
  }
  put(r, hx + 4, y, STEEL); put(r, hx + 4, y + 1, STEEL_DK);
  // destello que recorre la punta
  put(r, hx + glint, y - (glint < 2 ? 1 : 0), TIP);
}

/** Proyectil: 2 cuadros a 14 fps en bucle, mirando a la derecha. */
export function arrowProjectile(cell = 48): Raster[] {
  return [0, 1].map((f) => {
    const r = createRaster(cell, cell);
    const x0 = Math.round(cell / 2 - 10), y = Math.round(cell / 2 - 1);
    drawArrow(r, x0, y, f ? 3 : 1);
    outline(r);
    return r;
  });
}

/** Impacto: 5 cuadros a 16 fps sin bucle. Chispa, astillas que saltan y caen, polvo. */
export function arrowImpact(cell = 48): Raster[] {
  const out: Raster[] = [];
  const cx = cell / 2, cy = cell / 2 + 2;
  const splinters = Array.from({ length: 7 }, (_, k) => ({ a: -Math.PI * 0.95 + (k / 6) * Math.PI * 0.9 + (k % 2) * 0.15, v: 5 + (k * 7) % 5, len: 2 + (k % 2) }));
  for (let f = 0; f < 5; f++) {
    const r = createRaster(cell, cell);
    const t = f / 4;
    // chispa en cruz los primeros cuadros
    if (f < 2) {
      const s = f ? 4 : 3;
      for (let k = -s; k <= s; k++) { put(r, cx + k, cy, k === 0 ? TIP : [255, 230, 150]); put(r, cx, cy + k, k === 0 ? TIP : [255, 230, 150]); }
      if (f === 0) for (const [dx, dy] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) put(r, cx + dx, cy + dy, [255, 240, 190]);
    }
    // astillas de madera: salen hacia arriba y a los lados y caen con gravedad
    for (const s of splinters) {
      const d = s.v * (0.4 + t * 1.6);
      const x = Math.round(cx + Math.cos(s.a) * d), y = Math.round(cy + Math.sin(s.a) * d + t * t * 10);
      if (f === 0 && d < 3) continue;
      for (let k = 0; k < s.len; k++) put(r, x + Math.round(Math.cos(s.a + t * 3) * k), y + Math.round(Math.sin(s.a + t * 3) * k), k ? SHAFT : SHAFT_HI);
    }
    outline(r);
    // polvo que se abre y se desvanece
    if (f >= 1) for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2, d = 3 + t * 7;
      const x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + 2 + Math.sin(a) * d * 0.4);
      const al = Math.round(170 * (1 - t) + 30);
      put(r, x, y, [170, 160, 150], al); put(r, x + 1, y, [150, 140, 130], al);
    }
    out.push(r);
  }
  return out;
}
