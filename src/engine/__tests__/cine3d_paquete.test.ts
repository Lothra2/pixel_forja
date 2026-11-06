import { describe, it, expect } from 'vitest';
import { createRaster } from '../core/raster';
import { encodePng, decodePng } from '../export/png';
import { empaquetar, paqueteIntro3d, PAGINA_MAX, PAGINA_MPX } from '../gotico/cine3d_paquete';
import { PLANOS_VALLE } from '../gotico/cine3d_cuadros';

describe('intro 3D: empaquetado para el juego', () => {
  it('el empaquetador no pisa capas ni se pasa de 4096 px ni de 16 Mpx', () => {
    const imgs = Array.from({ length: 30 }, (_, i) => createRaster(300 + (i % 7) * 150, 200 + (i % 5) * 180));
    const { paginas, donde } = empaquetar(imgs);
    for (const p of paginas) { expect(Math.max(p.w, p.h)).toBeLessThanOrEqual(PAGINA_MAX); expect(p.w * p.h).toBeLessThanOrEqual(PAGINA_MPX); }
    for (let a = 0; a < imgs.length; a++) for (let b = a + 1; b < imgs.length; b++) {
      const [pa, xa, ya] = donde[a], [pb, xb, yb] = donde[b];
      if (pa !== pb) continue;
      expect(xa + imgs[a].w <= xb || xb + imgs[b].w <= xa || ya + imgs[a].h <= yb || yb + imgs[b].h <= ya).toBe(true);
    }
  });
  it('lo horneado de la intro: 10 archivos como mucho, 12 MB o menos, y cada capa con su recorte dentro de su página', () => {
    const { paginas, planos } = paqueteIntro3d(PLANOS_VALLE.map((p) => p.id), decodePng);
    if (!paginas.length) return; // sin horneado (el horneado se hace con scripts/gotico-cine3d.ts)
    expect(paginas.length).toBeLessThanOrEqual(10);
    expect(paginas.reduce((a, p) => a + encodePng(p).length, 0) / 1e6).toBeLessThanOrEqual(12);
    for (const [id, p] of Object.entries(planos)) for (const c of p.capas) {
      const pg = paginas[c.pagina], [sx, sy, sw, sh] = c.recorte;
      expect(sx >= 0 && sy >= 0 && sx + sw <= pg.w && sy + sh <= pg.h, `${id}/${c.id}`).toBe(true);
    }
  }, 600000);
});
