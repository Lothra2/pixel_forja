import { rng, bayer } from '../../fx/pix';
import { Lienzo } from './lienzo';
import type { Color, Paleta } from './paleta';
import type { Hora } from './layout';

/**
 * Cielo por hora, en franjas con tramado entre una y otra, y nubes que dan la vuelta por el borde: se repite en x
 * sin costura. Solo usa colores de la paleta.
 */
const FRANJAS: Partial<Record<Hora, Color[]>> = {
  manana: ['celeste', 'cielo', 'cielo', 'bruma'],
};

export function cielo(pal: Paleta, w: number, h: number, hora: Hora = 'manana', seed = 7): Lienzo {
  const L = new Lienzo(w, h, pal);
  const fr = FRANJAS[hora] ?? FRANJAS.manana!;
  const n = fr.length, bh = h / n;
  for (let y = 0; y < h; y++) {
    const k = Math.min(n - 1, Math.floor(y / bh)), t = (y - k * bh) / bh;
    const next = fr[Math.min(n - 1, k + 1)];
    for (let x = 0; x < w; x++) {
      // tramado ordenado en la última mitad de la franja, cada vez más denso
      const mix = t > 0.5 && bayer(x, y) < (t - 0.5) / 0.5;
      L.p(x, y, mix ? next : fr[k]);
    }
  }
  // nubes bajas de la mañana: óvalos planos con la panza en sombra
  const R = rng(seed);
  for (let i = 0; i < Math.max(2, Math.round(w / 220)); i++) {
    const cx = R() * w, cy = h * (0.25 + R() * 0.4), cw = 28 + R() * 40;
    for (let k = 0; k < 5; k++) {
      const bx = cx + (k - 2) * cw * 0.22, by = cy - (k === 2 ? 4 : k % 2 ? 2 : 0), r = cw * (k === 2 ? 0.24 : 0.17);
      for (let y = Math.floor(by - r * 0.6); y <= by + r * 0.6; y++) for (let x = Math.floor(bx - r); x <= bx + r; x++) {
        const dx = (x - bx) / r, dy = (y - by) / (r * 0.6);
        if (dx * dx + dy * dy > 1 || y > cy + 2) continue;
        L.p(((x % w) + w) % w, y, y > cy - 1 ? 'cielo' : 'luz');
      }
    }
  }
  return L;
}
