import { describe, it, expect } from 'vitest';
import type { Raster } from '../core/raster';
import { decodePng } from '../export/png';
import * as C from '../gotico/cine';
import * as T from '../gotico/titulo';
import * as P from '../gotico/portada';
import * as K from '../gotico/kit_portada';
import { cartaActo, ACTOS_CARTA, ZONAS_CARTA } from '../gotico/cartas_actos';

const firma = (r: Raster) => { let h = 2166136261; for (let i = 0; i < r.data.length; i++) h = Math.imul(h ^ r.data[i], 16777619); return h >>> 0; };
const visibles = (r: Raster) => { let n = 0; for (let i = 3; i < r.data.length; i += 4) if (r.data[i] > 8) n++; return n; };
const luz = (r: Raster, x0: number, y0: number, w: number, h: number) => { let s = 0; for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const i = (y * r.w + x) * 4; s += r.data[i] * 0.3 + r.data[i + 1] * 0.55 + r.data[i + 2] * 0.15; } return s / (w * h); };

describe('lienzo de cine', () => {
  it('un cuadrado de 10x10 cubre 100 pixeles y la distancia crece desde el borde', () => {
    const m = C.mascara(32, 32);
    C.rellenar(m, [[5.5, 5.5], [15.5, 5.5], [15.5, 15.5], [5.5, 15.5]]);
    expect(m.d.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 0);
    const d = C.distancia(m, (v) => v >= 0.5);
    expect(d[10 * 32 + 10]).toBe(0);
    expect(d[10 * 32 + 20]).toBeCloseTo(5, 0);
  });
  it('el PNG con filtro vuelve idéntico', () => {
    const L = C.lamina(40, 30); C.degradado(L, [[0, [1, 0.2, 0]], [1, [0, 0.3, 1]]]); C.halo(L, 20, 15, 12, [1, 1, 1], 1, 1, true);
    const r = C.aRaster(L), back = decodePng(K.pngFiltrado(r));
    expect([back.w, back.h]).toEqual([40, 30]);
    expect(firma(back)).toBe(firma(r));
  });
});

describe('el título', () => {
  it('tiene todas sus letras y entra en el cuadro', () => {
    for (const idi of ['es', 'en'] as const) for (const r of T.RENGLONES[idi]) for (const ch of r.s) expect(T.GLIFOS[ch], `${idi} ${ch}`).toBeTruthy();
    const { m } = T.mascaraTitulo('es', 400, 240, 340);
    let x0 = 400, x1 = 0, y0 = 240, y1 = 0, n = 0;
    for (let y = 0; y < 240; y++) for (let x = 0; x < 400; x++) if (m.d[y * 400 + x] > 0.5) { n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    expect(n).toBeGreaterThan(400 * 240 * 0.12);
    expect(x0).toBeGreaterThan(20); expect(x1).toBeLessThan(380); expect(y0).toBeGreaterThan(10); expect(y1).toBeLessThan(230);
    expect(Math.abs((x0 + x1) / 2 - 200)).toBeLessThan(6);
  });
  it('los cuadros cambian con el tiempo y el revelado empieza vacío', () => {
    const c = T.capasTitulo('es', 400, 240);
    const a = T.cuadroTituloRaster(c, { t: 0 }), b = T.cuadroTituloRaster(c, { t: 0.4 });
    expect(firma(a)).not.toBe(firma(b));
    expect(visibles(a)).toBeGreaterThan(400 * 240 * 0.3);
    expect(visibles(T.cuadroTituloRaster(c, { aparicion: 0 }))).toBe(0);
  });
});

describe('la portada', () => {
  it('la ceniza es una hoja de 8 x 4 celdas de 32 y la viñeta es de la pantalla base', () => {
    const h = P.hojaCeniza();
    expect([h.w, h.h]).toEqual([256, 128]);
    const v = P.capaVineta();
    expect([v.w, v.h]).toEqual([1280, 720]);
  });
  it('las nubes sueltas se enrollan sin costura', () => {
    const L = P.capaNubes(), w = L.w;
    let dif = 0, ref = 0;
    for (let y = 60; y < 380; y++) { const a = (y * w + w - 1) * 4 + 3, b = (y * w) * 4 + 3, c = (y * w + w - 2) * 4 + 3; dif += Math.abs(L.d[a] - L.d[b]); ref += Math.abs(L.d[a] - L.d[c]); }
    expect(dif).toBeLessThan(ref * 4 + 2);
  });
});

describe('las cartas de los actos', () => {
  it('son siete, de 1280x720, y la franja de la narración queda oscura', () => {
    expect(ACTOS_CARTA).toHaveLength(7);
    for (const n of [1, 7]) {
      const r = cartaActo(n);
      expect([r.w, r.h]).toEqual([1280, 720]);
      const z = ZONAS_CARTA.narracion;
      expect(luz(r, z.x, z.y + 40, z.w, z.h - 50)).toBeLessThan(luz(r, 0, 250, 1280, 200));
    }
  }, 300000);
});

describe('el kit de la portada', () => {
  it('trae el manifiesto, todas sus texturas de 4096 o menos y los archivos que nombra', () => {
    const { manifiesto, archivos } = K.kitPortada({ rapido: true, sinCartas: true, sinCinematicas: true, idiomas: ['es'] });
    const nombres = new Set(archivos.map((a) => a.nombre));
    expect(nombres.has('portada.json')).toBe(true);
    for (const a of archivos) if (a.nombre.endsWith('.png')) { const r = decodePng(a.bytes); expect(Math.max(r.w, r.h), a.nombre).toBeLessThanOrEqual(4096); }
    const nombrados = JSON.stringify(manifiesto).match(/"(titulo|fondo|cartas)\/[^"]+\.png"/g) ?? [];
    expect(nombrados.length).toBeGreaterThan(10);
    for (const n of nombrados) expect(nombres.has(n.slice(1, -1)), n).toBe(true);
  }, 240000);
});
