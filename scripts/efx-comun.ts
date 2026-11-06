// Piezas comunes de las herramientas de control de efectos (efx-lamina.ts, efx-tira.ts, efx-luz.ts): lienzo RGBA,
// letras de 3×5, pegar con alfa o sumando, piso gótico oscuro y el héroe de referencia a escala de juego.
// Lo que sale de acá es solo para mirar: no va al juego.
import { pintarPiso } from '../src/engine/gotico/pisos.ts';
import { heroeReferencia } from '../src/engine/gotico/efectos_pfx_silueta.ts';

export type Img = { w: number; h: number; data: Uint8ClampedArray };
export type Celda = { img: Img; ancla: [number, number] };
export const lienzo = (w: number, h: number): Img => ({ w, h, data: new Uint8ClampedArray(w * h * 4) });

const FUENTE: Record<string, string> = {
  a: '010101111101101', b: '110101110101110', c: '011100100100011', d: '110101101101110', e: '111100110100111', f: '111100110100100',
  g: '011100101101011', h: '101101111101101', i: '111010010010111', j: '001001001101010', k: '101101110101101', l: '100100100100111',
  m: '101111111101101', n: '110101101101101', o: '010101101101010', p: '110101110100100', q: '010101101110011', r: '110101110101101',
  s: '011100010001110', t: '111010010010010', u: '101101101101111', v: '101101101101010', w: '101101111111101', x: '101101010101101',
  y: '101101010010010', z: '111001010100111', '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110',
  '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001110',
  _: '000000000000111', ' ': '000000000000000', '-': '000000111000000', '/': '001001010100100', '|': '010010010010010', '.': '000000000000010',
  ':': '000010000010000', '=': '000111000111000', '>': '100010001010100', '<': '001010100010001', '+': '000010111010000', '%': '101001010100101',
  '(': '010100100100010', ')': '010001001001010',
};
/** Texto en letras de 3×5 (tamaño k por pixel). Las letras con tilde salen sin ella. */
export function texto(img: Img, s: string, x: number, y: number, c: [number, number, number] = [214, 200, 170], k = 2): void {
  for (const ch of s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')) {
    const g = FUENTE[ch] ?? FUENTE[' '];
    for (let i = 0; i < 15; i++) if (g[i] === '1') for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) {
      const X = x + (i % 3) * k + dx, Y = y + Math.floor(i / 3) * k + dy;
      if (X >= 0 && Y >= 0 && X < img.w && Y < img.h) img.data.set([...c, 255], (Y * img.w + X) * 4);
    }
    x += 4 * k;
  }
}
/** Pega con alfa normal o sumando la luz (aditiva: color * alfa sumado, como 'lighter' en el juego). */
export function pegar(dst: Img, src: Img, x0: number, y0: number, aditiva = false, k = 1): void {
  for (let y = 0; y < src.h; y++) {
    const Y = y + y0;
    if (Y < 0 || Y >= dst.h) continue;
    for (let x = 0; x < src.w; x++) {
      const X = x + x0;
      if (X < 0 || X >= dst.w) continue;
      const s = (y * src.w + x) * 4, a = (src.data[s + 3] / 255) * k;
      if (!a) continue;
      const d = (Y * dst.w + X) * 4;
      for (let c = 0; c < 3; c++) dst.data[d + c] = aditiva ? Math.min(255, dst.data[d + c] + src.data[s + c] * a) : src.data[s + c] * a + dst.data[d + c] * (1 - a);
      dst.data[d + 3] = 255;
    }
  }
}
export function rect(img: Img, x: number, y: number, w: number, h: number, c: [number, number, number, number]): void {
  for (let yy = Math.max(0, y); yy < Math.min(img.h, y + h); yy++) for (let xx = Math.max(0, x); xx < Math.min(img.w, x + w); xx++) img.data.set(c, (yy * img.w + xx) * 4);
}
export function marco(img: Img, x: number, y: number, w: number, h: number, c: [number, number, number, number]): void {
  rect(img, x, y, w, 1, c); rect(img, x, y + h - 1, w, 1, c); rect(img, x, y, 1, h, c); rect(img, x + w - 1, y, 1, h, c);
}

const BALD = pintarPiso('lajas', 0, 0);
/** Piso gótico: lajas en rombos de 160 × 80 (las del juego), apagadas a `brillo` como en una mazmorra de noche. */
export function piso(img: Img, x0: number, y0: number, w: number, h: number, brillo = 0.42): void {
  rect(img, x0, y0, w, h, [7, 6, 8, 255]);
  for (let j = -1; j * 40 < h + 80; j++)
    for (let i = -1; i * 160 < w + 160; i++) {
      const tx = x0 + i * 160 + (j & 1 ? 80 : 0) - 80, ty = y0 + j * 40 - 40;
      for (let y = 0; y < BALD.h; y++) {
        const Y = ty + y;
        if (Y < y0 || Y >= y0 + h || Y >= img.h) continue;
        for (let x = 0; x < BALD.w; x++) {
          const X = tx + x;
          if (X < x0 || X >= x0 + w || X >= img.w) continue;
          const s = (y * BALD.w + x) * 4, a = BALD.data[s + 3] / 255;
          if (a < 0.5) continue;
          const d = (Y * img.w + X) * 4;
          for (let c = 0; c < 3; c++) img.data[d + c] = BALD.data[s + c] * brillo;
        }
      }
    }
}

/** El templario de referencia a escala de juego (75 px de alto), con su ancla en los pies. */
export const HEROE: Celda = (() => { const r = heroeReferencia(); return { img: r.img, ancla: r.ancla }; })();

/** Recorta una imagen a su contenido (alfa > umbral) con margen. */
export function recortarImg(c: Celda, margen = 2): Celda {
  const { w, h, data } = c.img;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 4) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  if (x1 < 0) return c;
  x0 = Math.max(0, x0 - margen); y0 = Math.max(0, y0 - margen); x1 = Math.min(w - 1, x1 + margen); y1 = Math.min(h - 1, y1 + margen);
  const o = lienzo(x1 - x0 + 1, y1 - y0 + 1);
  for (let y = 0; y < o.h; y++) o.data.set(data.subarray(((y + y0) * w + x0) * 4, ((y + y0) * w + x1 + 1) * 4), y * o.w * 4);
  return { img: o, ancla: [c.ancla[0] - x0, c.ancla[1] - y0] };
}

/**
 * GIF animado a `fps` con una paleta común de 255 colores (corte por la mediana sobre todos los cuadros juntos, sin
 * trama): para mirar el movimiento, no para el juego. Los cuadros iguales seguidos se juntan en uno más largo.
 */
export async function gifCuantizado(cuadros: Img[], fps: number): Promise<Uint8Array> {
  const { cuantizar } = await import('../src/engine/gotico/efectos_pfx_png.ts');
  const { GifWriter } = (await import('omggif')).default as unknown as { GifWriter: new (b: Uint8Array, w: number, h: number, o: object) => { addFrame: (x: number, y: number, w: number, h: number, idx: Uint8Array, o: object) => void; end: () => number } };
  const { w, h } = cuadros[0];
  // cuadros únicos (por referencia) con cuántos ticks dura cada uno
  const tramos: { img: Img; n: number }[] = [];
  for (const c of cuadros) { const u = tramos.at(-1); if (u && u.img === c) u.n++; else tramos.push({ img: c, n: 1 }); }
  const unicos = [...new Set(tramos.map((x) => x.img))];
  const pila = lienzo(w, h * unicos.length);
  unicos.forEach((c, i) => pila.data.set(c.data, i * w * h * 4));
  for (let i = 3; i < pila.data.length; i += 4) pila.data[i] = 255;
  const { idx, paleta } = cuantizar(pila, 255);
  const pal = Array.from({ length: 256 }, (_, i) => { const p = paleta[i] ?? [0, 0, 0]; return (p[0] << 16) | (p[1] << 8) | p[2]; });
  const buf = new Uint8Array(w * h * tramos.length + 1024 * 1024 + 256 * 3);
  const g = new GifWriter(buf, w, h, { palette: pal, loop: 0 });
  for (const tr of tramos) {
    const u = unicos.indexOf(tr.img);
    g.addFrame(0, 0, w, h, idx.subarray(u * w * h, (u + 1) * w * h), { delay: Math.round((tr.n * 100) / fps) });
  }
  return buf.slice(0, g.end());
}
