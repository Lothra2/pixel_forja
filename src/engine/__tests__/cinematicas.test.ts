import { describe, it, expect } from 'vitest';
import type { Raster } from '../core/raster';
import { decodePng } from '../export/png';
import { pngFiltrado } from '../gotico/kit_portada';
import { GUION, ELECCIONES, PINTORES, CAPA_CINE, exportarCinematicas, camaraEn } from '../gotico/cinematicas';
import { fijarEstudioRapido } from '../gotico/estudio';

const FINALES = ['acto_7_vigilia', 'acto_7_cielo', 'acto_7_rey_ceniza', 'acto_7_corona_fria'];
const BANDERAS = ['vigdis_viva', 'vigdis_muerta', 'brasa_destruir', 'brasa_absorber', 'corona_auren', 'corona_mira', 'corona_quedarse'];

describe('el guion de las cinemáticas', () => {
  it('tiene todas las claves con su cantidad de planos, narración en los dos idiomas y un pintor por plano', () => {
    for (let n = 1; n <= 6; n++) { const k = `acto_${n}`; expect(GUION[k]?.length, k).toBeGreaterThanOrEqual(3); expect(GUION[k].length, k).toBeLessThanOrEqual(4); }
    expect(GUION.acto_7.length).toBeGreaterThanOrEqual(2);
    for (const k of FINALES) { expect(GUION[k]?.length, k).toBeGreaterThanOrEqual(2); expect(GUION[k].length, k).toBeLessThanOrEqual(3); }
    for (const [k, planos] of Object.entries(GUION)) for (const p of planos) {
      expect(PINTORES[`${k}/${p.id}`], `${k}/${p.id}`).toBeTruthy();
      expect(p.dur).toBeGreaterThan(3);
      expect(p.texto[0].length).toBeGreaterThan(10); expect(p.texto[1].length).toBeGreaterThan(10);
      for (const [b, tx] of Object.entries(p.textoSegun ?? {})) { expect(BANDERAS, b).toContain(b); expect(tx[0] && tx[1]).toBeTruthy(); }
      if (p.eleccion) for (const v of ELECCIONES[p.eleccion]) expect(BANDERAS).toContain(v);
    }
  });
  it('la cámara nunca se sale del margen de la capa (con la sacudida) ni se aleja de 1', () => {
    for (const [k, planos] of Object.entries(GUION)) for (const p of planos) {
      const f = p.cam.sacudida?.fuerza ?? 0;
      for (const c of [p.cam.desde, p.cam.hasta]) {
        expect(Math.abs(c.x) + f, `${k}/${p.id}`).toBeLessThanOrEqual(CAPA_CINE.margen_x);
        expect(Math.abs(c.y) + f, `${k}/${p.id}`).toBeLessThanOrEqual(CAPA_CINE.margen_y);
        expect(c.zoom).toBeGreaterThanOrEqual(1);
      }
      const [x, y, z] = camaraEn(p.cam, p.dur, p.dur);
      expect([Math.round(x), Math.round(y), z]).toEqual([p.cam.hasta.x, p.cam.hasta.y, p.cam.hasta.zoom]);
    }
  });
});

describe('exportar una cinemática', () => {
  it('el acto 4 trae sus capas con archivo, la variante de Vigdis con si, y texturas de 4096 o menos', () => {
    fijarEstudioRapido(true);
    const archivos = new Map<string, Raster>();
    const sec = exportarCinematicas({ poner: (n, r) => archivos.set(n, r), claves: ['acto_4'] }) as Record<string, any>;
    fijarEstudioRapido(false);
    expect(sec.capa).toEqual(CAPA_CINE);
    const planos = sec.acto_4.planos as any[];
    expect(planos).toHaveLength(GUION.acto_4.length);
    for (const p of planos) {
      expect(p.dur).toBeGreaterThan(0);
      expect(p.narracion.es && p.narracion.en).toBeTruthy();
      expect(p.capas.length).toBeGreaterThanOrEqual(3);
      expect(p.capas[0].mezcla).toBe('normal');
      for (const c of p.capas) {
        expect(archivos.has(c.archivo), c.archivo).toBe(true);
        expect(['normal', 'sumar']).toContain(c.mezcla);
        if (c.anim) expect(['deriva', 'titilar', 'latir', 'flotar', 'cuadros', 'aparecer']).toContain(c.anim.tipo);
      }
    }
    const si = planos[1].capas.map((c: any) => c.si).filter(Boolean);
    expect(si).toContain('vigdis_viva'); expect(si).toContain('vigdis_muerta');
    for (const [n, r] of archivos) {
      expect(Math.max(r.w, r.h), n).toBeLessThanOrEqual(4096);
      if (n.endsWith('fuego.png')) expect(decodePng(pngFiltrado(r)).w).toBe(r.w);
    }
  }, 300000);
});
