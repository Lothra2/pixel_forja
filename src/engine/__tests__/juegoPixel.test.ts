import { describe, expect, it } from 'vitest';
import { componerPixel } from '../luchador/pixel/muneco';
import { RICK_PIXEL } from '../luchador/pixel/rick';
import { SOPHIE_PIXEL } from '../luchador/pixel/sophie';
import { ANIMS_RICK_PIXEL, ANIMS_SOPHIE_PIXEL } from '../luchador/pixel/golpesPixel';
import { exportarLuchadorJuego } from '../luchador/pixel/juego';

const L = { w: 400, h: 340, ox: 200, oy: 325 };
const opacos = (idx: Int16Array) => idx.reduce((s, v) => s + (v >= 0 ? 1 : 0), 0);

describe('fluidez y exportación al juego', () => {
  it('respirar recoge filas sin abrir huecos: la cabeza baja entera y los pies no se mueven', () => {
    const a = componerPixel(RICK_PIXEL, {}, L), b = componerPixel(RICK_PIXEL, { respira: { fila: 82, k: 2 } }, L);
    // la cabeza es la misma, dos filas más abajo
    expect(b.puntos.cabeza[1]).toBe(a.puntos.cabeza[1] + 2);
    expect(b.puntos.pieC).toEqual(a.puntos.pieC);
    // ninguna fila queda vacía entre la cabeza y los pies
    const fila = (c: typeof a, y: number) => Array.from({ length: c.w }, (_, x) => c.idx[y * c.w + x]).some((v) => v >= 0);
    let y0 = 0;
    while (!fila(b, y0)) y0++;
    for (let y = y0; y < L.oy; y++) expect(fila(b, y), `fila ${y}`).toBe(true);
    // solo se pierden los pixeles de las filas que se recogen
    expect(opacos(a.idx) - opacos(b.idx)).toBeLessThan(2 * 70);
  });

  it('las estelas van detrás, con trama, y no reciben golpes', () => {
    const solo = componerPixel(RICK_PIXEL, { dibujo: 'puno' }, L);
    const con = componerPixel(RICK_PIXEL, { dibujo: 'puno', estelas: [{ pose: { dibujo: 'puno', raiz: { x: -30 } }, trama: 2 }] }, L);
    let nuevos = 0;
    for (let i = 0; i < con.idx.length; i++) {
      if (solo.idx[i] >= 0) { expect(con.idx[i]).toBe(solo.idx[i]); continue; }
      if (con.idx[i] < 0) continue;
      nuevos++;
      const x = i % L.w, y = Math.floor(i / L.w);
      expect((x + y) % 2).toBe(0);
      expect(con.pieza[i]).toBe(-1);
    }
    expect(nuevos).toBeGreaterThan(50);
  });

  it('las animaciones nuevas que pide el juego están, con sus golpes', () => {
    for (const n of ['retrocede', 'agachado', 'salto', 'bloqueo_bajo', 'recibe_bajo', 'levanta', 'patada_aerea', 'embestida', 'super'])
      expect(Object.keys(ANIMS_RICK_PIXEL), n).toContain(n);
    for (const n of ['avanza', 'retrocede', 'agachado', 'bloqueo', 'bloqueo_bajo', 'recibe_bajo', 'cae', 'levanta', 'patada', 'super'])
      expect(Object.keys(ANIMS_SOPHIE_PIXEL), n).toContain(n);
    const salto = ANIMS_RICK_PIXEL.salto();
    expect(salto.cuadros.reduce((s, c) => s + c.ticks, 0)).toBe(42);
    expect(ANIMS_RICK_PIXEL.embestida().cuadros.filter((c) => c.fase === 'activo').length).toBeGreaterThan(1);
    expect(ANIMS_SOPHIE_PIXEL.super().cuadros.filter((c) => c.fase === 'activo').length).toBeGreaterThanOrEqual(9);
  });

  it('la exportación sigue el contrato: hojas en fila, cajas desde el pivote, retrato y proyectiles', () => {
    const e = exportarLuchadorJuego(RICK_PIXEL, ANIMS_RICK_PIXEL, { id: 'rick', nombre: 'Rick', lienzo: L, proyectiles: true });
    const m = e.manifest;
    expect(m.anims.guardia).toBeTruthy();
    expect(e.hojas['retrato.png'].w).toBe(e.hojas['retrato.png'].h);
    for (const [n, a] of Object.entries(m.anims)) {
      const h = e.hojas[a.hoja];
      expect(h.w, n).toBe(a.w * a.cuadros.length);
      expect(h.h, n).toBe(a.h);
      for (const c of a.cuadros) {
        if (c.fase !== 'activo') expect(c.pega, n).toEqual([]);
        for (const z of c.recibe) expect(z.caja[1], n).toBeLessThanOrEqual(0);
      }
    }
    // el puño fuerte pega delante del pivote, a la altura del pecho
    const activo = m.anims['puño_fuerte'].cuadros.find((c) => c.fase === 'activo')!;
    expect(activo.pega[0][0]).toBeGreaterThan(20);
    expect(activo.pega[0][1]).toBeLessThan(-120);
    expect(m.anims.onda_bola.ox).toBe(64);
    // el salto no sube: la altura la pone el juego
    const s = exportarLuchadorJuego(SOPHIE_PIXEL, ANIMS_SOPHIE_PIXEL, { id: 'sophie', nombre: 'Sophie', lienzo: { w: 320, h: 300, ox: 160, oy: 285 } });
    for (const c of s.manifest.anims.salto.cuadros) for (const z of c.recibe) expect(z.caja[1]).toBeGreaterThan(-200);
  });
});
