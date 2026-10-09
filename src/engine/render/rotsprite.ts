/**
 * RotSprite: rota pixel art sin destrozarlo.
 * Se agranda 8x con Scale2x tres veces (que suaviza diagonales sin inventar colores),
 * se rota con vecino más cercano y se vuelve a muestrear al tamaño original.
 * Trabaja sobre índices de paleta (-1 transparente), así nunca aparecen colores nuevos.
 */
export interface IndexImage {
  w: number;
  h: number;
  idx: Int16Array;
}

function scale2x(src: IndexImage): IndexImage {
  const { w, h, idx } = src;
  const W = w * 2, H = h * 2;
  const out = new Int16Array(W * H);
  const at = (x: number, y: number) => idx[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
      const e0 = C === A && C !== D && A !== B ? A : P;
      const e1 = A === B && A !== C && B !== D ? B : P;
      const e2 = D === C && D !== B && C !== A ? C : P;
      const e3 = B === D && B !== A && D !== C ? D : P;
      out[(2 * y) * W + 2 * x] = e0;
      out[(2 * y) * W + 2 * x + 1] = e1;
      out[(2 * y + 1) * W + 2 * x] = e2;
      out[(2 * y + 1) * W + 2 * x + 1] = e3;
    }
  return { w: W, h: H, idx: out };
}

/**
 * Rota alrededor de (px, py). Devuelve la imagen nueva y dónde quedó el pivote.
 * Ángulo en grados, sentido horario (y hacia abajo).
 */
export function rotSprite(src: IndexImage, deg: number, px: number, py: number): { img: IndexImage; px: number; py: number } {
  const turns = ((Math.round(deg) % 360) + 360) % 360;
  if (turns === 0) return { img: src, px, py };
  const big = scale2x(scale2x(scale2x(src)));
  const k = 8;
  const a = (deg * Math.PI) / 180;
  const cos = Math.cos(a), sin = Math.sin(a);
  // caja del resultado
  const corners = [[0, 0], [src.w, 0], [0, src.h], [src.w, src.h]].map(([x, y]) => {
    const dx = x - px, dy = y - py;
    return [dx * cos - dy * sin, dx * sin + dy * cos];
  });
  const minX = Math.floor(Math.min(...corners.map((c) => c[0]))) - 1;
  const minY = Math.floor(Math.min(...corners.map((c) => c[1]))) - 1;
  const maxX = Math.ceil(Math.max(...corners.map((c) => c[0]))) + 1;
  const maxY = Math.ceil(Math.max(...corners.map((c) => c[1]))) + 1;
  const W = maxX - minX, H = maxY - minY;
  const out = new Int16Array(W * H).fill(-1);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      // centro del pixel destino, relativo al pivote, rotado hacia atrás
      const dx = x + minX + 0.5, dy = y + minY + 0.5;
      const sx = dx * cos + dy * sin + px, sy = -dx * sin + dy * cos + py;
      const bx = Math.floor(sx * k), by = Math.floor(sy * k);
      if (bx < 0 || by < 0 || bx >= big.w || by >= big.h) continue;
      out[y * W + x] = big.idx[by * big.w + bx];
    }
  return { img: { w: W, h: H, idx: out }, px: -minX, py: -minY };
}

/**
 * Agranda un cuadro RGBA al doble con Scale2x: las diagonales quedan suaves y no aparece ningún color nuevo.
 * Sirve para un jefe que tiene que llenar la pantalla sin los bloques de 2 x 2 del vecino más cercano.
 */
export function scale2xRaster(r: { w: number; h: number; data: Uint8ClampedArray }): { w: number; h: number; data: Uint8ClampedArray } {
  const colors: number[] = [], keyOf = new Map<number, number>();
  const idx = new Int16Array(r.w * r.h).fill(-1);
  for (let i = 0; i < r.w * r.h; i++) {
    const a = r.data[i * 4 + 3];
    if (!a) continue;
    const key = ((r.data[i * 4] << 24) | (r.data[i * 4 + 1] << 16) | (r.data[i * 4 + 2] << 8) | a) >>> 0;
    let k = keyOf.get(key);
    if (k === undefined) { k = colors.length; colors.push(key); keyOf.set(key, k); }
    idx[i] = k;
  }
  const big = scale2x({ w: r.w, h: r.h, idx });
  const data = new Uint8ClampedArray(big.w * big.h * 4);
  for (let i = 0; i < big.w * big.h; i++) {
    const k = big.idx[i];
    if (k < 0) continue;
    const c = colors[k];
    data.set([c >>> 24, (c >>> 16) & 255, (c >>> 8) & 255, c & 255], i * 4);
  }
  return { w: big.w, h: big.h, data };
}

/**
 * Cambia el tamaño de un cuadro RGBA por un factor cualquiera (por ejemplo 1.5) como lo hace RotSprite:
 * agranda 8x con Scale2x y vuelve a muestrear con vecino más cercano. No inventa colores.
 */
export function scaleRaster(r: { w: number; h: number; data: Uint8ClampedArray }, k: number): { w: number; h: number; data: Uint8ClampedArray } {
  const big = scale2xRaster(scale2xRaster(scale2xRaster(r)));
  const W = Math.round(r.w * k), H = Math.round(r.h * k);
  const data = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sx = Math.min(big.w - 1, Math.floor(((x + 0.5) / k) * 8)), sy = Math.min(big.h - 1, Math.floor(((y + 0.5) / k) * 8));
    data.set(big.data.subarray((sy * big.w + sx) * 4, (sy * big.w + sx) * 4 + 4), (y * W + x) * 4);
  }
  return { w: W, h: H, data };
}
