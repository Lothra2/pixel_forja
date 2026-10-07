/** Morfología binaria con kernel cuadrado (separable: rápido en imágenes grandes). */
function pass(src: Uint8Array, w: number, h: number, r: number, erode: boolean): Uint8Array {
  const tmp = new Uint8Array(w * h);
  const out = new Uint8Array(w * h);
  const target = erode ? 0 : 1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let v = erode ? 1 : 0;
      for (let d = -r; d <= r && v !== target; d++) {
        const xx = x + d;
        const s = xx < 0 || xx >= w ? 0 : src[y * w + xx];
        if (s === target) v = target;
      }
      tmp[y * w + x] = v;
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let v = erode ? 1 : 0;
      for (let d = -r; d <= r && v !== target; d++) {
        const yy = y + d;
        const s = yy < 0 || yy >= h ? 0 : tmp[yy * w + x];
        if (s === target) v = target;
      }
      out[y * w + x] = v;
    }
  return out;
}

/** Pixeles que desaparecen con una apertura: estructuras más delgadas que 2r+1 (líneas del dibujo). */
export function thinParts(m: Uint8Array, w: number, h: number, r: number): Uint8Array {
  const opened = pass(pass(m, w, h, r, true), w, h, r, false);
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = m[i] && !opened[i] ? 1 : 0;
  return out;
}
