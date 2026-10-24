import { createRaster, type Raster } from '../core/raster';
import { renderHuman, type BigFrame } from '../render/human';
import { posesFor } from '../render/clip';
import type { HumanFicha } from '../sheet/ficha';
import type { EyeExpr, MouthExpr } from '../head/stamps';
import { hexToRgb } from '../color/oklab';

/**
 * Retratos con expresión (diálogos, marcadores, selección de equipo) y cabecitas para el HUD. Salen del mismo
 * personaje dibujado de frente, con los ojos y la boca del motor (los sellos de las caras), así siempre se parecen
 * al sprite.
 *
 * - chico: 40 x 40, dibujado a celda 64 y recortado desde arriba del pelo (cabeza y torso, nítido, pixel a pixel).
 * - grande: 96 x 96. Dos estilos (`EstiloRetrato`):
 *   - puro (por defecto): la cabeza y los hombros del personaje a celda 64, 32 x 32 con su contorno,
 *     agrandados x3 exacto. Cada pixel es un bloque de 3 x 3: es el mismo pixel del sprite, como viene de la forja.
 *   - suave: redibujado a 96 (lote G2). El motor dibuja personas hasta celda 64 y las piezas LPC de la
 *   cabeza vienen a su tamaño, así que no hay de dónde sacar más detalle. Se dibuja la cabeza y los hombros a celda
 *   64 sin contorno y con el material de cada pixel; se agranda x3 con Scale3x (redondea las curvas y las diagonales
 *   sin inventar colores, sobre color y material juntos para que no se desalineen); y a 96 se dibuja el contorno de
 *   un pixel (afuera con el tono oscuro de la pieza que toca, adentro entre el pelo y la cara, la ropa y la piel) y
 *   el brillo de los ojos abiertos. Antes era el recorte escalado x3 a bloques: el contorno salía de 3 pixeles.
 * - cabecita: 12 x 12, la cabeza de celda 64 reducida a la mitad sin mezclar colores (ver `halve`).
 */

export const EXPRESSIONS = ['neutral', 'feliz', 'enojo', 'triste', 'susto', 'cerrado', 'dolor', 'burla'] as const;
export type Expression = (typeof EXPRESSIONS)[number];

/** Ojos y boca de cada expresión (sellos del motor). */
export const EXPRESSION_FACE: Record<Expression, { eyes: EyeExpr; mouth: MouthExpr }> = {
  neutral: { eyes: 'open', mouth: 'line' },
  feliz: { eyes: 'happy', mouth: 'grin' },
  enojo: { eyes: 'angry', mouth: 'frown' },
  triste: { eyes: 'sad', mouth: 'frown' },
  susto: { eyes: 'wide', mouth: 'o' },
  cerrado: { eyes: 'closed', mouth: 'line' },
  dolor: { eyes: 'hurt', mouth: 'open' },
  // la cara de sobrado de la pelea (lote P1): guiño con la ceja fruncida y media sonrisa torcida, para el VS
  burla: { eyes: 'wink', mouth: 'smirk' },
};

export const PORTRAIT_SMALL = 40;
export const PORTRAIT_BIG = 96;
export const HEAD_ICON = 12;

/** El personaje de frente, quieto, con una cara. Devuelve el cuadro grande y el centro de la cabeza. */
function faceFrame(f: HumanFicha, cell: 32 | 64, face: { eyes: EyeExpr; mouth: MouthExpr }) {
  const pose = posesFor(f, cell, 'idle', 'front')[0];
  const b = renderHuman(f, cell, { ...pose, face }, 'front', {});
  const head = b.joints?.head ?? [b.pivotX, b.groundRow - cell / 2];
  const top = (b.whole ?? b.full ?? b.body)?.y0 ?? head[1] - cell / 3;
  return { r: b.raster, head, top };
}

/** Recorta un cuadrado de lado `size` con la esquina en (x0, y0); lo que cae afuera queda transparente. */
function crop(r: Raster, x0: number, y0: number, size: number): Raster {
  const out = createRaster(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const sx = x0 + x, sy = y0 + y;
    if (sx < 0 || sy < 0 || sx >= r.w || sy >= r.h) continue;
    const s = (sy * r.w + sx) * 4, d = (y * size + x) * 4;
    for (let k = 0; k < 4; k++) out.data[d + k] = r.data[s + k];
  }
  return out;
}

/** Escala entera con vecino más cercano (sin mezclar colores). */
export function scaleInt(r: Raster, k: number): Raster {
  const out = createRaster(r.w * k, r.h * k);
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) {
    const s = (Math.floor(y / k) * r.w + Math.floor(x / k)) * 4, d = (y * out.w + x) * 4;
    for (let q = 0; q < 4; q++) out.data[d + q] = r.data[s + q];
  }
  return out;
}

/** El recorte de cabeza y hombros mide 96 / 3 = 32 a celda 64; se agranda x3 y se redibuja a 96. */
export const PORTRAIT_BIG_SCALE = 3;

/**
 * Scale3x (AdvMAME3x) sobre una imagen de índices (-1 vacío): cada pixel se vuelve 3 x 3 y en los bordes en diagonal
 * toma el vecino que sigue la línea. No inventa colores: redondea las curvas en vez de dejar escalones de 3.
 */
export function scale3xIdx(src: Int32Array, w: number, h: number): Int32Array {
  const W = w * 3, o = new Int32Array(W * h * 3).fill(-1);
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : src[y * w + x]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const A = at(x - 1, y - 1), B = at(x, y - 1), C = at(x + 1, y - 1), D = at(x - 1, y), E = at(x, y), F = at(x + 1, y), G = at(x - 1, y + 1), H = at(x, y + 1), I = at(x + 1, y + 1);
    let e = [E, E, E, E, E, E, E, E, E];
    if (B !== H && D !== F) e = [D === B ? D : E, (D === B && E !== C) || (B === F && E !== A) ? B : E, B === F ? F : E,
      (D === B && E !== G) || (D === H && E !== A) ? D : E, E, (B === F && E !== I) || (H === F && E !== C) ? F : E,
      D === H ? D : E, (D === H && E !== I) || (H === F && E !== G) ? H : E, H === F ? F : E];
    for (let k = 0; k < 9; k++) o[(y * 3 + Math.floor(k / 3)) * W + x * 3 + (k % 3)] = e[k];
  }
  return o;
}

/** La piel y lo que va con ella: entre estas no se dibuja línea (la nariz, las orejas y la cara son de la misma piel). */
const PIEL = new Set(['skin', 'face', 'ears']);
/**
 * Qué pieza va delante cuando dos se tocan a 96: el pixel de la de atrás toma su tono oscuro (como el contorno del
 * sprite). El pelo va delante de la cara (el flequillo), la ropa delante del cuello. Las que no están, en 1.
 */
const DELANTE: Record<string, number> = { skin: 0, face: 0, ears: 0, top: 2, top2: 2, neck: 3, jacket: 3, armor: 3, trim: 4, jbutton: 4, armband: 4, hair: 5, beard: 5, accessory: 6 };

/**
 * Un pedazo de un cuadro (renderizado con `materiales` y sin contorno) redibujado a 3: Scale3x sobre el par (color,
 * material), así cada pieza se suaviza sin mezclarse con la de al lado, y después el contorno de un pixel: afuera, el
 * tono oscuro de la pieza que toca; adentro, una línea donde una pieza va delante de otra (el pelo sobre la cara).
 * Es lo que hace el retrato grande, para cualquier recorte del cuerpo.
 */
export function aTres(b: BigFrame, x0: number, y0: number, w: number, h: number): Raster { return aTresConMaterial(b, x0, y0, w, h).r; }

/** `aTres` y el material de cada pixel de la imagen a 3 ('' afuera). */
export function aTresConMaterial(b: BigFrame, x0: number, y0: number, w: number, h: number): { r: Raster; mat: (i: number) => string } {
  const R = b.raster, { mapa, nombres, oscuros } = b.materiales!;
  const W = w * 3, H = h * 3;
  // cada par (color, material) es un índice: así Scale3x mueve los dos juntos
  const colores: number[] = [], materialDe: number[] = [], idx = new Int32Array(w * h).fill(-1), visto = new Map<number, number>();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = x0 + x, sy = y0 + y;
    if (sx < 0 || sy < 0 || sx >= R.w || sy >= R.h) continue;
    const i = sy * R.w + sx;
    if (!R.data[i * 4 + 3]) continue;
    const c = (R.data[i * 4] << 16) | (R.data[i * 4 + 1] << 8) | R.data[i * 4 + 2];
    const k = c * 512 + (mapa[i] + 2);
    let n = visto.get(k);
    if (n === undefined) { n = colores.length; colores.push(c); materialDe.push(mapa[i]); visto.set(k, n); }
    idx[y * w + x] = n;
  }
  const big = scale3xIdx(idx, w, h);
  const out = createRaster(W, H);
  const mat = (i: number) => (big[i] < 0 ? '' : nombres[materialDe[big[i]]] ?? '?');
  const oscuro = (i: number): [number, number, number] => hexToRgb(oscuros[materialDe[big[i]]] ?? '#1e1418');
  const pon = (i: number, [r, g, bl]: [number, number, number]) => { out.data[i * 4] = r; out.data[i * 4 + 1] = g; out.data[i * 4 + 2] = bl; out.data[i * 4 + 3] = 255; };
  for (let i = 0; i < W * H; i++) if (big[i] >= 0) { const c = colores[big[i]]; pon(i, [c >> 16, (c >> 8) & 255, c & 255]); }
  // el contorno de un pixel, decidido sobre la imagen sin contorno y pintado al final
  const vecinos = (x: number, y: number) => [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].filter(([a, c]) => a >= 0 && c >= 0 && a < W && c < H).map(([a, c]) => c * W + a);
  const lineas: [number, [number, number, number]][] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, m = mat(i);
    if (!m) {
      // afuera: el tono oscuro de la pieza que toca (la que va más adelante si toca dos)
      const js = vecinos(x, y).filter((j) => mat(j));
      if (js.length) lineas.push([i, oscuro(js.reduce((a, j) => ((DELANTE[mat(j)] ?? 1) > (DELANTE[mat(a)] ?? 1) ? j : a))) ]);
      continue;
    }
    for (const j of vecinos(x, y)) {
      const n = mat(j);
      if (!n || n === m || (PIEL.has(m) && PIEL.has(n))) continue;
      if ((DELANTE[n] ?? 1) > (DELANTE[m] ?? 1)) { lineas.push([i, oscuro(i)]); break; }
    }
  }
  for (const [i, c] of lineas) pon(i, c);
  return { r: out, mat };
}

/** El retrato grande suave, redibujado a 96 (ver arriba). */
function portraitBig(f: HumanFicha, face: { eyes: EyeExpr; mouth: MouthExpr }): Raster {
  const pose = posesFor(f, 64, 'idle', 'front')[0];
  const b = renderHuman(f, 64, { ...pose, face }, 'front', { noOutline: true, materiales: true });
  const head = b.joints?.head ?? [b.pivotX, b.groundRow - 32];
  const top = (b.whole ?? b.full ?? b.body)?.y0 ?? head[1] - 21;
  const S = PORTRAIT_BIG / PORTRAIT_BIG_SCALE, N = PORTRAIT_BIG;
  const x0 = Math.round(head[0] - S / 2), y0 = top - 1;
  const { r: out, mat } = aTresConMaterial(b, x0, y0, S, S);
  const pon = (i: number, [r, g, bl]: [number, number, number]) => { out.data[i * 4] = r; out.data[i * 4 + 1] = g; out.data[i * 4 + 2] = bl; out.data[i * 4 + 3] = 255; };
  // el brillo de los ojos abiertos: dos por dos blanco arriba a la izquierda del iris (los cerrados y los felices son
  // una rayita: no llevan). El iris se busca por el color de ojos de la ficha, en la franja de los ojos
  const [er, eg, eb] = hexToRgb(f.palette.eyes);
  const hx = (head[0] - x0) * 3, hy = (head[1] - y0) * 3;
  const iris: number[] = [];
  for (let i = 0; i < N * N; i++) {
    const x = i % N, y = Math.floor(i / N);
    if (y < hy - 12 || y > hy + 15 || Math.abs(x - hx) > 30 || !PIEL.has(mat(i))) continue;
    if (Math.hypot(out.data[i * 4] - er, out.data[i * 4 + 1] - eg, out.data[i * 4 + 2] - eb) < 48) iris.push(i);
  }
  for (const lado of [-1, 1]) {
    const ojo = iris.filter((i) => Math.sign((i % N) - hx + 0.5) === lado);
    if (!ojo.length) continue;
    const xs = ojo.map((i) => i % N), ys = ojo.map((i) => Math.floor(i / N));
    const X0 = Math.min(...xs), X1 = Math.max(...xs), Y0 = Math.min(...ys), Y1 = Math.max(...ys);
    if (Y1 - Y0 < 5 || X1 - X0 < 3) continue;
    const enOjo = new Set(ojo);
    for (const [dx, dy] of [[1, 1], [2, 1], [1, 2], [2, 2]]) { const i = (Y0 + dy) * N + X0 + dx; if (enOjo.has(i)) pon(i, [255, 255, 255]); }
  }
  return out;
}

/** Un retrato: la cabeza arriba (con pixeles de aire sobre el pelo) y los hombros abajo. */
/** La cara de una expresión para una ficha: si su cara de base ya es la media sonrisa (la malandra), la burla saca la lengua. */
export function expressionFace(f: HumanFicha, expr: Expression): { eyes: EyeExpr; mouth: MouthExpr } {
  const face = EXPRESSION_FACE[expr];
  return expr === 'burla' && f.face.base?.mouth === face.mouth ? { ...face, mouth: 'tongue' } : face;
}

/** Cómo sale el retrato grande: puro (el sprite x3 exacto, por defecto) o suave (Scale3x y contorno de un pixel). */
export type EstiloRetrato = 'puro' | 'suave';

/** El retrato grande puro: la cabeza y los hombros a celda 64 (32 x 32, desde un pixel sobre el pelo), x3 exacto. */
function portraitBigPuro(f: HumanFicha, face: { eyes: EyeExpr; mouth: MouthExpr }): Raster {
  const { r, head, top } = faceFrame(f, 64, face);
  const S = PORTRAIT_BIG / PORTRAIT_BIG_SCALE;
  return scaleInt(crop(r, Math.round(head[0] - S / 2), top - 1, S), PORTRAIT_BIG_SCALE);
}

export function portrait(f: HumanFicha, expr: Expression, size: 'chico' | 'grande' = 'chico', estilo: EstiloRetrato = 'puro'): Raster {
  if (size === 'grande') return estilo === 'suave' ? portraitBig(f, expressionFace(f, expr)) : portraitBigPuro(f, expressionFace(f, expr));
  const { r, head, top } = faceFrame(f, 64, expressionFace(f, expr));
  return crop(r, Math.round(head[0] - PORTRAIT_SMALL / 2), top - 2, PORTRAIT_SMALL);
}

/**
 * Reduce a la mitad sin mezclar colores: cada bloque de 2 x 2 se queda con su color más repetido (si empatan, el más
 * oscuro, así sobreviven el contorno, los ojos y los lentes). El bloque queda transparente si tiene menos de 2 pixeles
 * opacos.
 */
export function halve(r: Raster): Raster {
  const out = createRaster(Math.floor(r.w / 2), Math.floor(r.h / 2));
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) {
    const seen = new Map<number, { n: number; i: number }>();
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const i = ((2 * y + dy) * r.w + 2 * x + dx) * 4;
      if (!r.data[i + 3]) continue;
      const k = (r.data[i] << 16) | (r.data[i + 1] << 8) | r.data[i + 2];
      const e = seen.get(k);
      if (e) e.n++; else seen.set(k, { n: 1, i });
    }
    let opaque = 0, best: { n: number; i: number } | null = null, bestLum = Infinity;
    for (const e of seen.values()) {
      opaque += e.n;
      const lum = r.data[e.i] * 3 + r.data[e.i + 1] * 6 + r.data[e.i + 2];
      if (!best || e.n > best.n || (e.n === best.n && lum < bestLum)) { best = e; bestLum = lum; }
    }
    if (opaque < 2 || !best) continue;
    const d = (y * out.w + x) * 4;
    for (let k = 0; k < 4; k++) out.data[d + k] = r.data[best.i + k];
  }
  return out;
}

/**
 * La cabecita para el HUD: la cabeza de frente a celda 64 (24 x 24 desde lo alto del pelo) reducida a la mitad sin
 * mezclar colores. A celda 32 la cabeza ya mide más de 12 y pierde los lentes y el peinado, por eso sale de la grande.
 */
export function headIcon(f: HumanFicha): Raster {
  const { r, head, top } = faceFrame(f, 64, EXPRESSION_FACE.neutral);
  const side = HEAD_ICON * 2;
  return halve(crop(r, Math.round(head[0] - side / 2), top, side));
}

/**
 * Hoja de retratos: dos filas, la de arriba con los 8 chicos (40 x 40) y la de abajo con los 8 grandes (96 x 96), en
 * el orden de EXPRESSIONS. El chico i está en (i * 40, 0); el grande i en (i * 96, 40).
 */
export function portraitSheet(f: HumanFicha, estilo: EstiloRetrato = 'puro'): { png: Raster; chico: number; grande: number; expresiones: Expression[]; estilo: EstiloRetrato } {
  const png = createRaster(EXPRESSIONS.length * PORTRAIT_BIG, PORTRAIT_SMALL + PORTRAIT_BIG);
  EXPRESSIONS.forEach((e, i) => {
    const small = portrait(f, e, 'chico'), big = portrait(f, e, 'grande', estilo);
    for (const [img, ox, oy] of [[small, i * PORTRAIT_SMALL, 0], [big, i * PORTRAIT_BIG, PORTRAIT_SMALL]] as [Raster, number, number][]) {
      for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
        const s = (y * img.w + x) * 4, d = ((oy + y) * png.w + ox + x) * 4;
        for (let k = 0; k < 4; k++) png.data[d + k] = img.data[s + k];
      }
    }
  });
  return { png, chico: PORTRAIT_SMALL, grande: PORTRAIT_BIG, expresiones: [...EXPRESSIONS], estilo };
}
