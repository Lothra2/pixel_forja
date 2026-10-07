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
