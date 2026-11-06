import { describe, it, expect } from 'vitest';
import { createRaster } from '../core/raster';
import { encodePng, decodePng } from '../export/png';
import { empaquetar, paqueteIntro3d, paqueteCine3d, PAGINA_MAX, PAGINA_MPX } from '../gotico/cine3d_paquete';
import { PLANOS_INTRO } from '../gotico/cine3d_cuadros';
import { GUION, ELECCIONES, exportarCinematicas } from '../gotico/cinematicas';
import { hayHorneado } from '../gotico/cine3d_toma';

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
    const { paginas, planos } = paqueteIntro3d(PLANOS_INTRO.map((p) => p.id), decodePng);
    if (!paginas.length) return; // sin horneado (el horneado se hace con scripts/gotico-cine3d.ts)
    expect(paginas.length).toBeLessThanOrEqual(3);
    expect(paginas.reduce((a, p) => a + encodePng(p).length, 0) / 1e6).toBeLessThanOrEqual(12);
    for (const [id, p] of Object.entries(planos)) for (const c of p.capas) {
      const pg = paginas[c.pagina], [sx, sy, sw, sh] = c.recorte;
      expect(sx >= 0 && sy >= 0 && sx + sw <= pg.w && sy + sh <= pg.h, `${id}/${c.id}`).toBe(true);
    }
  }, 600000);
});

/** Las claves (fuera de la intro) que ya tienen algún plano horneado en 3D (datos/cine3d/<clave>/). */
const CLAVES_3D = Object.keys(GUION).filter((k) => k !== 'intro' && GUION[k].some((p) => hayHorneado(k, p.id)));
describe('cierres 3D: empaquetado por clave', () => {
  it.each(CLAVES_3D.length ? CLAVES_3D : ['(ninguna horneada)'])('%s: 2 páginas como mucho, 4,5 MB o menos, recortes dentro de su página y las elecciones con si', (clave) => {
    if (!GUION[clave]) return;
    const { paginas, planos } = paqueteCine3d(clave, GUION[clave].map((p) => p.id), decodePng);
    expect(paginas.length).toBeGreaterThan(0);
    expect(paginas.length).toBeLessThanOrEqual(2);
    for (const p of paginas) { expect(Math.max(p.w, p.h)).toBeLessThanOrEqual(PAGINA_MAX); expect(p.w * p.h).toBeLessThanOrEqual(PAGINA_MPX); }
    expect(paginas.reduce((a, p) => a + encodePng(p).length, 0) / 1e6).toBeLessThanOrEqual(4.5);
    for (const [id, p] of Object.entries(planos)) {
      for (const c of p.capas) {
        const pg = paginas[c.pagina], [sx, sy, sw, sh] = c.recorte;
        expect(sx >= 0 && sy >= 0 && sx + sw <= pg.w && sy + sh <= pg.h, `${id}/${c.id}`).toBe(true);
      }
      const ids = p.capas.map((c) => c.id);
      expect(new Set(ids).size, id).toBe(ids.length);
      // un plano con elección horneado por valor: cada valor con su fondo
      const pl = GUION[clave].find((q) => q.id === id)!, si = new Set(p.capas.map((c) => c.si).filter(Boolean));
      if (si.size) for (const v of ELECCIONES[pl.eleccion!]) expect(p.capas.some((c) => c.si === v && c.id.startsWith('fondo')), `${id} ${v}`).toBe(true);
      else expect(p.capas[0].id, id).toBe('fondo');
    }
  }, 600000);
  it.each(CLAVES_3D.length ? CLAVES_3D : ['(ninguna horneada)'])('%s: la exportación reemplaza las capas 2D de los planos horneados por las páginas', (clave) => {
    if (!GUION[clave]) return;
    const archivos = new Set<string>();
    const sec = exportarCinematicas({ poner: (n) => archivos.add(n), claves: [clave] }) as Record<string, any>;
    const propios = [...archivos].filter((n) => n.startsWith(`cinematicas/${clave}/`));
    for (const p of GUION[clave]) {
      const hecho = hayHorneado(clave, p.id), pj = sec[clave].planos.find((q: any) => q.id === p.id);
      if (hecho) expect(propios.filter((n) => n.startsWith(`cinematicas/${clave}/${p.id}_`)), p.id).toEqual([]);
      for (const c of pj.capas) expect(archivos.has(c.archivo), c.archivo).toBe(true);
      if (hecho) for (const c of pj.capas) if (c.id !== 'vineta') expect(c.archivo).toMatch(new RegExp(`^cinematicas/${clave}/pagina_[12]\\.png$`));
    }
    if (GUION[clave].every((p) => hayHorneado(clave, p.id))) expect(propios.every((n) => /pagina_\d\.png$/.test(n)), propios.join(' ')).toBe(true);
  }, 600000);
});
