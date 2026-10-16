import { describe, expect, it } from 'vitest';
import { componerPixel, pintarAnimPixel, type AnimPixel, type MunecoPixel } from '../luchador/pixel/muneco';
import { RICK_PIXEL } from '../luchador/pixel/rick';
import { SOPHIE_PIXEL } from '../luchador/pixel/sophie';
import { ANIMS_RICK_PIXEL, ANIMS_SOPHIE_PIXEL } from '../luchador/pixel/golpesPixel';
import { hexToRgb } from '../color/oklab';

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const L = { w: 420, h: 420, ox: 210, oy: 400 };
const opacos = (c: { idx: Int16Array }) => c.idx.reduce((s, v) => s + (v >= 0 ? 1 : 0), 0);
const caja = (c: { w: number; idx: Int16Array }) => {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  c.idx.forEach((v, i) => { if (v < 0) return; const x = i % c.w, y = Math.floor(i / c.w); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
};

describe('luchador en pixel a mano', () => {
  it.each([[RICK_PIXEL], [SOPHIE_PIXEL]] as [MunecoPixel][])('la hoja de %#: piezas bien formadas, tonos de su paleta y juntas que existen', (m) => {
    for (const [n, p] of Object.entries(m.piezas)) {
      const ancho = p.filas[0].length;
      expect(p.filas.every((f) => f.length === ancho), n).toBe(true);
      for (const f of p.filas) for (const ch of f) if (ch !== '.') expect(LETRAS.indexOf(ch), n).toBeLessThan(m.paleta.length);
      if (p.padre) expect(m.piezas[p.padre], n).toBeTruthy();
      expect(m.orden).toContain(n);
    }
    for (const pt of Object.values(m.puntos)) expect(m.piezas[pt.pieza]).toBeTruthy();
    for (const n of Object.keys(m.piezas)) expect(m.zonas[n], n).toBeTruthy();
    // los dibujos de las poses clave: filas parejas, tonos de la paleta y el ancla dentro del dibujo
    for (const [n, d] of Object.entries(m.dibujos ?? {})) {
      const ancho = d.filas[0].length;
      expect(d.filas.every((f) => f.length === ancho), n).toBe(true);
      for (const f of d.filas) for (const ch of f) if (ch !== '.') expect(LETRAS.indexOf(ch), n).toBeLessThan(m.paleta.length);
      expect(d.ancla[0], n).toBeGreaterThanOrEqual(0); expect(d.ancla[0], n).toBeLessThanOrEqual(ancho);
      expect(d.ancla[1], n).toBe(d.filas.length);
    }
  });

  it('en reposo la hoja se arma entera: pisa el piso, mide lo que mide y no le falta ningún pixel', () => {
    for (const m of [RICK_PIXEL, SOPHIE_PIXEL]) {
      const c = componerPixel(m, {}, L), b = caja(c);
      expect(b.y1).toBe(L.oy - 1);
      expect(b.h).toBe(m.h);
      // lo que se ve en reposo es exactamente la hoja de origen: tantos pixeles como su silueta
      const silueta = new Set<string>();
      for (const p of Object.values(m.piezas)) p.filas.forEach((f, y) => { for (let x = 0; x < f.length; x++) if (f[x] !== '.') silueta.add(`${p.x + x},${p.y + y}`); });
      expect(opacos(c)).toBe(silueta.size);
    }
    // las hojas fieles a la referencia: Rick casi 200 px y Sophie más baja, con la cabeza grande de anime
    expect(RICK_PIXEL.h).toBeGreaterThanOrEqual(190);
    expect(SOPHIE_PIXEL.h).toBeLessThan(RICK_PIXEL.h * 0.9);
    // cada luchador trae sus poses clave dibujadas
    expect(Object.keys(RICK_PIXEL.dibujos ?? {}).length).toBeGreaterThanOrEqual(11);
    expect(Object.keys(SOPHIE_PIXEL.dibujos ?? {}).length).toBeGreaterThanOrEqual(11);
  });

  it('girar las piezas no inventa colores: todos los cuadros usan solo la paleta del luchador', () => {
    const revisar = (m: MunecoPixel, anims: Record<string, () => AnimPixel>) => {
      const pal = new Set(m.paleta.map((h) => hexToRgb(h).join(',')));
      for (const f of Object.values(anims))
        for (const r of pintarAnimPixel(m, f(), L).cuadros)
          for (let i = 0; i < r.w * r.h; i++) if (r.data[i * 4 + 3]) expect(pal.has(`${r.data[i * 4]},${r.data[i * 4 + 1]},${r.data[i * 4 + 2]}`)).toBe(true);
    };
    revisar(RICK_PIXEL, ANIMS_RICK_PIXEL);
    revisar(SOPHIE_PIXEL, ANIMS_SOPHIE_PIXEL);
  });

  it('los golpes traen sus tiempos y su caja que pega sobre el puño o el pie', () => {
    const onda = pintarAnimPixel(RICK_PIXEL, ANIMS_RICK_PIXEL.onda(), L);
    expect(onda.tiempos).toEqual({ inicio: 10, activo: 3, recuperacion: 22 });
    const puño = pintarAnimPixel(RICK_PIXEL, ANIMS_RICK_PIXEL.puño_fuerte(), L);
    const activo = puño.datos.findIndex((d) => d.fase === 'activo');
    const [px, py] = puño.datos[activo].puño.lejos;
    const [x, y, w, h] = puño.datos[activo].pega[0];
    expect(px).toBeGreaterThanOrEqual(x); expect(px).toBeLessThan(x + w);
    expect(py).toBeGreaterThanOrEqual(y); expect(py).toBeLessThan(y + h);
    // el puño fuerte llega lejos: más allá de la guardia
    expect(px).toBeGreaterThan(pintarAnimPixel(RICK_PIXEL, ANIMS_RICK_PIXEL.guardia(), L).datos[0].puño.lejos[0] + 12);
    for (const k of ['patada_voladora', 'mil_patadas', 'remolino'] as const) {
      const a = pintarAnimPixel(SOPHIE_PIXEL, ANIMS_SOPHIE_PIXEL[k](), L);
      const act = a.datos.filter((d) => d.fase === 'activo');
      expect(act.length, k).toBeGreaterThan(0);
      expect(act.every((d) => d.pega.length === 1 && d.recibe.some((z) => z.zona === 'brazo')), k).toBe(true);
    }
  });

  it('Sophie da la voltereta completa y el remolino la deja de cabeza', () => {
    const salto = ANIMS_SOPHIE_PIXEL.salto();
    const giros = salto.cuadros.map((q) => q.pose.raiz?.giro ?? 0);
    for (const g of [90, 180, 270]) expect(giros).toContain(g);
    const alto = Math.max(...salto.cuadros.map((q) => -(q.pose.raiz?.y ?? 0)));
    expect(alto).toBeGreaterThan(SOPHIE_PIXEL.h);
    const rem = ANIMS_SOPHIE_PIXEL.remolino();
    const helice = rem.cuadros.filter((q) => q.fase === 'activo');
    expect(helice.length).toBe(8);
    for (const q of helice) {
      const c = componerPixel(SOPHIE_PIXEL, q.pose, L);
      // la cabeza queda abajo y los pies arriba
      expect(c.puntos.cabeza[1]).toBeGreaterThan(c.puntos.pieL[1]);
      expect(c.puntos.cabeza[1]).toBeGreaterThan(c.puntos.pieC[1]);
    }
  });

  it('Rick cae volando y queda tendido en el piso', () => {
    const cae = ANIMS_RICK_PIXEL.cae();
    const ult = componerPixel(RICK_PIXEL, cae.cuadros[cae.cuadros.length - 1].pose, L), b = caja(ult);
    expect(b.w).toBeGreaterThan(b.h * 2);
    expect(b.y1).toBe(L.oy - 1);
    expect(cae.cuadros.map((q) => q.pose.dibujo)).toEqual(['vuela', 'vuela', 'vuela', 'tendido', 'tendido', 'tendido']);
    // mientras vuela no toca el piso
    const aire = caja(componerPixel(RICK_PIXEL, cae.cuadros[1].pose, L));
    expect(aire.y1).toBeLessThan(L.oy - 20);
  });

  it('un dibujo girado o volteado se arma sin colores nuevos y sus puntos lo siguen', () => {
    const recto = componerPixel(SOPHIE_PIXEL, { dibujo: 'patada' }, L);
    const volteado = componerPixel(SOPHIE_PIXEL, { dibujo: 'patada', espejo: true }, L);
    // volteado, el pie que pega queda del otro lado del ancla
    expect(recto.puntos.pieL[0]).toBeGreaterThan(L.ox);
    expect(volteado.puntos.pieL[0]).toBeLessThan(L.ox);
    expect(opacos(volteado)).toBe(opacos(recto));
  });
});
