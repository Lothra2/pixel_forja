import { describe, it, expect } from 'vitest';
import { GUION, PINTORES, CAPA_CINE, MUSICA_CINE, SONIDOS_CINE, exportarCinematicas } from '../gotico/cinematicas';
import { PAGINA_MAX, PAGINA_MPX } from '../gotico/cine3d_paquete';
import { encodePng } from '../export/png';
import type { Raster } from '../core/raster';

/** El guion de la intro del juego (src/mundo/actos.ts, INTRO): la narración no se reescribe, se reparte en los planos. */
const INTRO_JUEGO = [
  'Hubo un tiempo en que el valle de Velmora solo le temía al invierno.',
  'Los monjes de Santa Oria tocaban las campanas al alba, y nadie preguntaba por qué la abadía se alzó sobre un pozo sellado.',
  'Nadie recordaba el voto de los primeros hermanos: no cantar nunca de noche.',
  'La noche de la última cosecha, el cielo se abrió.',
  'Una brasa cayó, lenta, como si buscara algo.',
  'Cayó en el claustro. Y las campanas doblaron solas.',
  'Al amanecer, los monjes ya no estaban. Y el valle empezó a arder sin fuego.',
  'Los que sobrevivieron llevan ceniza en la piel. La llaman la Marca.',
  'Tú también la tienes.',
  'Y en el fondo del pozo, algo que esperaba mil inviernos abrió los ojos.',
];
const intro = GUION.intro;

describe('la intro: guion', () => {
  it('11 planos, ~83 s, la narración del juego entera, música y sonidos conocidos', () => {
    expect(intro).toHaveLength(11);
    expect(intro.reduce((a, p) => a + p.dur, 0)).toBeCloseTo(83, 0);
    for (const p of intro) expect(PINTORES[`intro/${p.id}`], p.id).toBeTruthy();
    expect(intro.map((p) => p.texto[0]).join(' ')).toBe(INTRO_JUEGO.join(' '));
    for (const p of intro) expect(p.texto[1].length, p.id).toBeGreaterThan(5);
    expect(MUSICA_CINE.intro).toBe('intro');
    for (const p of intro) for (const s of p.sonidos ?? []) { expect(SONIDOS_CINE).toContain(s.efecto); expect(s.t).toBeGreaterThanOrEqual(0); expect(s.t).toBeLessThan(p.dur); }
  });
  it('la cámara con su sacudida no se sale del margen de la capa', () => {
    for (const p of intro) {
      const f = p.cam.sacudida?.fuerza ?? 0;
      for (const c of [p.cam.desde, p.cam.hasta]) { expect(Math.abs(c.x) + f, p.id).toBeLessThanOrEqual(CAPA_CINE.margen_x); expect(Math.abs(c.y) + f, p.id).toBeLessThanOrEqual(CAPA_CINE.margen_y); }
    }
  });
});

describe('la intro: exportar empaquetada', () => {
  it('páginas: 10 archivos como mucho, 12 MB o menos, ninguna de más de 4096 px ni 16 Mpx; cada capa con su recorte, la música y los sonidos', () => {
    const pags = new Map<string, Raster>();
    const sec = exportarCinematicas({ poner: (n, r) => { if (n.startsWith('cinematicas/intro/')) pags.set(n, r); }, claves: ['intro'] }) as Record<string, any>;
    expect(sec.intro.musica).toBe('intro');
    expect(sec.intro.planos).toHaveLength(11);
    expect(pags.size).toBeLessThanOrEqual(10);
    let bytes = 0;
    for (const [n, r] of pags) { expect(Math.max(r.w, r.h), n).toBeLessThanOrEqual(PAGINA_MAX); expect(r.w * r.h, n).toBeLessThanOrEqual(PAGINA_MPX); bytes += encodePng(r).length; }
    expect(bytes / 1e6).toBeLessThanOrEqual(12);
    for (const p of sec.intro.planos) {
      expect(p.narracion.es && p.narracion.en).toBeTruthy();
      for (const c of p.capas) {
        if (c.id === 'vineta') continue;
        const r = pags.get(c.archivo)!, [sx, sy, sw, sh] = c.recorte;
        expect(r, c.archivo).toBeTruthy();
        expect(sx >= 0 && sy >= 0 && sx + sw <= r.w && sy + sh <= r.h, `${p.id}/${c.id}`).toBe(true);
      }
    }
    expect(sec.intro.planos.find((p: any) => p.id === 'i06_impacto').sonidos[0].efecto).toBe('explosion');
  }, 900000);
});
