// Obrero del navegador: pinta los cuadros del héroe con el equipo que lleva puesto.
import { personajeEscena, esqueleto } from '../../../src/engine/gotico/cuerpo';
import { pintarEscena, aPantalla, fijarCalidad } from '../../../src/engine/gotico/render';
import { hojaDe } from './hoja';
import { tinte } from '../../../src/engine/gotico/apariencia';

/** Los materiales teñidos se registran al vuelo en el hilo principal: aquí hay que volver a crearlos. */
function tenir(equipo: any) { for (const m of JSON.stringify(equipo).matchAll(/cu_tinte_(tela|cuero|metal)_([0-9a-f]{6})/g)) tinte('#' + m[2], m[1] as any); }

self.onmessage = (ev: MessageEvent) => {
  const { id, cuerpo, equipo, acc, dir, cuadros, calidad } = ev.data;
  try {
    fijarCalidad(calidad ?? 1);
    tenir(equipo);
    const out: any[] = [];
    const bufs: ArrayBuffer[] = [];
    for (let f = 0; f < cuadros; f++) {
      const r = pintarEscena({ ...personajeEscena(cuerpo, equipo, dir, acc, f), sinSombra: true });
      const img = r.img;
      let x0 = img.w, y0 = img.h, x1 = -1, y1 = -1;
      for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (img.data[(y * img.w + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < 0) { x0 = y0 = 0; x1 = y1 = 0; }
      const w = x1 - x0 + 1, h = y1 - y0 + 1, d = new Uint8ClampedArray(w * h * 4);
      for (let y = 0; y < h; y++) d.set(img.data.subarray(((y0 + y) * img.w + x0) * 4, ((y0 + y) * img.w + x1 + 1) * 4), y * w * 4);
      out.push({ w, h, ax: r.ancla[0] - x0, ay: r.ancla[1] - y0, data: d, hoja: hojaDe(esqueleto, aPantalla, cuerpo, equipo, dir, acc, f) });
      bufs.push(d.buffer as ArrayBuffer);
    }
    (self as any).postMessage({ id, acc, dir, out }, bufs);
  } catch (e) {
    (self as any).postMessage({ id, acc, dir, error: String(e) });
  }
};
