import { describe, it, expect } from 'vitest';
import { REGISTRO, huellaDe, pintarObjeto, fijarCalidad } from '../gotico';
import { CATEDRAL } from '../gotico/catalogo/abadia_oria';
import { ATRIO_CATEDRAL } from '../gotico/catalogo/atrio_oria';

const NUEVOS = ['abo_atrio_lajas', 'abo_sendero_lajas', 'abo_andamio_ruina', 'abo_derrumbe'];
// palabras con que el juego (zona.ts) y los paisajes (escenas.ts) riegan el camposanto al azar
const RIEGO = ['losa', 'tumba', 'cruz', 'urna', 'vela', 'flor', 'pila', 'ataud', 'fosa', 'mausoleo', 'mauso', 'angel', 'sarc', 'muro', 'farol', 'linterna',
  'lapida', 'obelisco', 'reja', 'verja', 'cerca', 'calavera', 'hueso', 'estatua', 'entrada', 'cripta', 'pozo', 'catedral'];

describe('atrio de Santa Oria', () => {
  it('las piezas nuevas existen, son del camposanto y no las riega el juego al azar', () => {
    for (const id of NUEVOS) {
      const d = REGISTRO.find((x) => x.id === id);
      expect(d, id).toBeTruthy();
      expect(d!.tema, id).toBe('cementerio');
      for (const p of RIEGO) expect(id.includes(p), `${id} contiene "${p}"`).toBe(false);
    }
    expect(REGISTRO.find((d) => d.id === 'abo_atrio_lajas')!.plano).toBe(true);
    expect(REGISTRO.find((d) => d.id === 'abo_sendero_lajas')!.variantes).toContain('x_roto_y');
  });
  it('el marco usa ids y variantes que existen, queda fuera de la huella y deja libre el eje de la puerta', () => {
    // huella de la catedral en celdas desde la nave
    const caja = CATEDRAL.piezas.map((p) => [p.dx - p.huella[0] / 2, p.dy - p.huella[1] / 2, p.dx + p.huella[0] / 2, p.dy + p.huella[1] / 2]);
    for (const [id, v, dx, dy] of ATRIO_CATEDRAL.marco) {
      const d = REGISTRO.find((x) => x.id === id);
      expect(d, id).toBeTruthy();
      expect(d!.variantes, `${id} ${v}`).toContain(v);
      if (d!.plano) continue;
      const [hw, hh] = huellaDe(d!, v), x0 = dx - hw / 2, y0 = dy - hh / 2, x1 = dx + hw / 2, y1 = dy + hh / 2;
      for (const [a0, b0, a1, b1] of caja) expect(x1 <= a0 || x0 >= a1 || y1 <= b0 || y0 >= b1, `${id} pisa la catedral`).toBe(true);
      // por el eje de la puerta (dx -2..2, de la escalinata hacia afuera) se llega: nada que bloquee
      if (y1 > CATEDRAL.puerta[1]) expect(x1 <= -2 || x0 >= 2, `${id} en el eje de la puerta`).toBe(true);
    }
  });
  it('cada pieza nueva se pinta con pixeles y sin pasarse de tamaño', () => {
    fijarCalidad(0);
    for (const id of NUEVOS) for (const v of REGISTRO.find((x) => x.id === id)!.variantes) {
      const r = pintarObjeto(id, v, 0, 1);
      let n = 0; for (let i = 3; i < r.img.data.length; i += 4) if (r.img.data[i] === 255) n++;
      expect(n, `${id} ${v}`).toBeGreaterThan(200);
      expect(Math.max(r.img.w, r.img.h), `${id} ${v}`).toBeLessThan(400);
    }
    fijarCalidad(1);
  }, 120000);
});
