/**
 * La silueta de nuestro héroe a la escala de pixelfx (1x = la mitad de la pantalla), para los efectos de pixelfx que
 * leen el cuerpo (estados, muertes, auras). Se pinta con el render de figuras del motor (templario veterano, quieto,
 * mirando al sur, sin sombra en el piso) y se reduce a la mitad.
 */
import { pintarEscena, type Render } from './render';
import { personajeEscena } from './cuerpo';
import { HEROES } from './catalogo/personajes';

export interface Silueta {
  w: number;
  h: number;
  /** 1 donde hay cuerpo */
  mask: Uint8Array;
  /** brillo 0..1 de cada pixel del cuerpo */
  luz: Float32Array;
}

let SIL: Silueta | null = null;
let FIG: Render | null = null;

/** El héroe de referencia pintado a escala de juego (con su sombra), para las láminas de control. */
export function heroeReferencia(): Render {
  if (FIG) return FIG;
  const h = HEROES.find((x) => x.id === 'templario')!;
  FIG = pintarEscena(personajeEscena(h.cuerpo, h.niveles[1], 'so', 'quieto', 0));
  return FIG;
}

/** La silueta del héroe a 1x, con los pies en la fila de abajo y centrada en x. */
export function siluetaHeroe(): Silueta {
  if (SIL) return SIL;
  const h = HEROES.find((x) => x.id === 'templario')!;
  // con la luz de siempre (no la clave baja de los sprites): el muñeco de los efectos sale de este brillo y los efectos ya horneados no cambian
  const r = pintarEscena({ ...personajeEscena(h.cuerpo, h.niveles[1], 's', 'quieto', 0), sinSombra: true, luz: undefined });
  const { img, ancla } = r;
  // columnas y filas con cuerpo
  let x0 = img.w, x1 = -1, y0 = img.h, y1 = -1;
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++)
      if (img.data[(y * img.w + x) * 4 + 3] > 96) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  // a la mitad, centrada en el ancla (pies)
  const izq = Math.ceil((ancla[0] - x0) / 2), der = Math.ceil((x1 + 1 - ancla[0]) / 2);
  const w = 2 * Math.max(izq, der), hh = Math.ceil((Math.max(y1 + 1, ancla[1]) - y0) / 2);
  const mask = new Uint8Array(w * hh), luz = new Float32Array(w * hh);
  for (let y = 0; y < hh; y++)
    for (let x = 0; x < w; x++) {
      // bloque de 2×2 de la imagen grande
      const X = ancla[0] + (x - w / 2) * 2, Y = Math.max(y1 + 1, ancla[1]) - (hh - y) * 2;
      let a = 0, l = 0;
      for (let dy = 0; dy < 2; dy++)
        for (let dx = 0; dx < 2; dx++) {
          const px = X + dx, py = Y + dy;
          if (px < 0 || py < 0 || px >= img.w || py >= img.h) continue;
          const i = (py * img.w + px) * 4, al = img.data[i + 3] / 255;
          a += al;
          l += al * (0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2]) / 255;
        }
      if (a >= 2) { mask[y * w + x] = 1; luz[y * w + x] = Math.min(1, (l / a) * 1.6); }
    }
  SIL = { w, h: hh, mask, luz };
  return SIL;
}
