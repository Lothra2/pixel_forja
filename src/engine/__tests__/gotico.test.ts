import { describe, it, expect } from 'vitest';
import {
  REGISTRO, TEMAS, PISOS, PAISAJES, pintarObjeto, pintarPiso, pintarMapa, generarPaisaje, crearMapa, medidas, pantallaACelda, celdaAPantalla,
  paqueteMapa, DIRS, ALTO_PERSONA, KZ, caja, pintarEscena,
} from '../gotico';

describe('taller gótico: el renderizador', () => {
  it('una persona mide 75 px y una caja de 16×16×61 queda de ese alto en pantalla', () => {
    expect(Math.round(ALTO_PERSONA * KZ)).toBe(75);
    const r = pintarEscena({ piezas: [caja(0, 0, 0, 16, 16, ALTO_PERSONA, { mat: 'piedra' })], sinSombra: true });
    let y0 = r.img.h, y1 = -1;
    for (let y = 0; y < r.img.h; y++) for (let x = 0; x < r.img.w; x++) if (r.img.data[(y * r.img.w + x) * 4 + 3]) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    // alto de la caja + el rombo de su base (16 de lado: 16 px de alto en pantalla)
    expect(y1 - y0 + 1).toBeGreaterThanOrEqual(75 + 14);
    expect(y1 - y0 + 1).toBeLessThanOrEqual(75 + 18);
  });
  it('lo que se cava con `resta` deja ver lo que se arma después', () => {
    const muro = caja(0, 0, 0, 80, 12, 90, { mat: 'piedra' });
    const hueco = caja(0, 0, 0, 28, 20, 44, { mat: 'piedra', resta: true });
    const puerta = caja(0, 0, 0, 26, 2, 40, { mat: 'madera' });
    const sin = pintarEscena({ piezas: [muro, hueco], sinSombra: true }), con = pintarEscena({ piezas: [muro, hueco, puerta], sinSombra: true });
    const opacos = (r: typeof sin) => { let n = 0; for (let i = 3; i < r.img.data.length; i += 4) if (r.img.data[i]) n++; return n; };
    expect(opacos(con)).toBeGreaterThan(opacos(sin));
  });
});

describe('taller gótico: el catálogo', () => {
  it('hay muchos assets, cada id es único y cada tema que se usa existe', () => {
    expect(REGISTRO.length).toBeGreaterThanOrEqual(150);
    expect(new Set(REGISTRO.map((d) => d.id)).size).toBe(REGISTRO.length);
    const temas = new Set(TEMAS.map((t) => t[0]));
    for (const d of REGISTRO) { expect(temas.has(d.tema), `${d.id} tema ${d.tema}`).toBe(true); expect(d.variantes.length, d.id).toBeGreaterThan(0); }
  });
  it('cada asset se pinta (su primera variante) con pixeles y sin pasarse de tamaño', () => {
    for (const d of REGISTRO) {
      const r = pintarObjeto(d.id, d.variantes[0], 0, 2);
      let n = 0; for (let i = 3; i < r.img.data.length; i += 4) if (r.img.data[i] === 255) n++;
      expect(n, `${d.id} vacío`).toBeGreaterThan(20);
      expect(r.img.w, `${d.id} ancho`).toBeLessThan(900);
      expect(r.img.h, `${d.id} alto`).toBeLessThan(900);
    }
  }, 300000);
  it('los personajes y monstruos tienen las 8 direcciones y sus cuadros salen del mismo tamaño', () => {
    const per = REGISTRO.filter((d) => d.tema === 'personajes' || d.tema === 'monstruos');
    expect(per.length).toBeGreaterThanOrEqual(40);
    for (const d of per) expect(d.variantes).toEqual(DIRS);
    const camina = REGISTRO.find((d) => d.id === 'per_paladin_caminar')!;
    const qs = Array.from({ length: camina.cuadros! }, (_, f) => pintarObjeto(camina.id, 'so', f, 1));
    for (const q of qs) { expect(q.img.w).toBe(qs[0].img.w); expect(q.ancla).toEqual(qs[0].ancla); }
    // y se mueve: los cuadros no son iguales
    expect(qs[0].img.data.some((v, i) => v !== qs[4].img.data[i])).toBe(true);
  });
});

describe('taller gótico: pisos y mapas', () => {
  it('cada piso es un rombo de 160×80 y pega sin costura con su vecino', () => {
    for (const p of PISOS) {
      const a = pintarPiso(p.id, 0, 0);
      expect([a.w, a.h]).toEqual([160, 80]);
      // el borde de abajo a la derecha de una baldosa y el de arriba a la izquierda de la siguiente (corrida 80, 40)
      // son la misma línea del mundo: los colores de un lado y del otro se parecen (sin salto)
      let difs = 0, n = 0;
      for (let k = 4; k < 76; k += 4) {
        const x1 = 80 + k, y1 = 79 - Math.floor(k / 2) - 1; // borde inferior derecho de a
        const x2 = k, y2 = 39 - Math.floor(k / 2) + 1; // borde superior izquierdo de la vecina (corrida +80,+40)
        const i1 = (y1 * 160 + x1) * 4, i2 = (y2 * 160 + x2) * 4;
        if (!a.data[i1 + 3] || !a.data[i2 + 3]) continue;
        difs += Math.abs(a.data[i1] - a.data[i2]) + Math.abs(a.data[i1 + 1] - a.data[i2 + 1]) + Math.abs(a.data[i1 + 2] - a.data[i2 + 2]); n++;
      }
      expect(n, p.id).toBeGreaterThan(5);
      // control: lo que cambia el mismo piso entre dos pixeles a la misma distancia, lejos del borde
      let ctrl = 0, m = 0;
      for (let y = 30; y < 50; y += 2) for (let x = 60; x < 100; x += 4) { const i1 = (y * 160 + x) * 4, i2 = ((y + 2) * 160 + x) * 4; ctrl += Math.abs(a.data[i1] - a.data[i2]) + Math.abs(a.data[i1 + 1] - a.data[i2 + 1]) + Math.abs(a.data[i1 + 2] - a.data[i2 + 2]); m++; }
      expect(difs / n, `${p.id} costura`).toBeLessThan((ctrl / m) * 2.5 + 40);
    }
  }, 120000);
  it('celda y pantalla van y vuelven', () => {
    const m = crearMapa(4, 4);
    for (const [cx, cy] of [[0, 0], [7, 3], [19, 19], [10, 2]]) {
      const [sx, sy] = celdaAPantalla(m, cx, cy);
      const c = pantallaACelda(m, sx, sy);
      expect([c.cx, c.cy]).toEqual([cx, cy]);
    }
  });
  it('cada paisaje se arma con objetos y se pinta; el paquete trae mapa, vista y tiras', () => {
    for (const p of PAISAJES) {
      const m = generarPaisaje(p.id, 3);
      expect(m.objetos.length, p.id).toBeGreaterThan(3);
      const { w, h } = medidas(m);
      const img = pintarMapa(m, { cuadro: 0 });
      expect([img.w, img.h]).toEqual([w, h]);
    }
    const zip = paqueteMapa(generarPaisaje('cementerio', 2));
    expect(zip[0]).toBe(0x50); expect(zip[1]).toBe(0x4b);
  }, 300000);
});
