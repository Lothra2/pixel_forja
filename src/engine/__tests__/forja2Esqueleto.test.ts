import { describe, it, expect } from 'vitest';
import { estilo, medidasDe, ESTILOS } from '../forja2/estilo';
import { resolver } from '../forja2/esqueleto';
import { POSE_NEUTRA, sobre, aEsqueleto } from '../forja2/pose';

const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe('Forja 2: estilos como datos y el esqueleto común', () => {
  it('cada estilo trae sus cabezas de alto y cabe parado en su celda', () => {
    for (const [id, cell] of [['luchador', 160], ['cabezon', 48]] as const) {
      const e = estilo(id), m = medidasDe(e, cell);
      expect(m.H / m.cabeza, id).toBeCloseTo(e.cabezas, 5);
      // de la planta a la coronilla: tobillo, pierna, columna, cuello y la cabeza entera
      const alto = m.caderaAlta + m.columna + m.cuello + m.cabeza;
      expect(alto, id).toBeLessThan(cell - 2);
      expect(alto, id).toBeGreaterThan(cell * 0.8);
    }
    expect(Object.keys(ESTILOS)).toEqual(expect.arrayContaining(['luchador', 'cabezon']));
    expect(() => estilo('nada')).toThrow(/No existe el estilo/);
  });

  it('el pie queda donde dice el dato y la mano estirada llega a su alcance, en los dos estilos', () => {
    for (const [id, cell] of [['luchador', 160], ['cabezon', 48]] as const) {
      const m = medidasDe(estilo(id), cell);
      const p = sobre(POSE_NEUTRA, { cadera: { baja: 0.1 }, pies: { lejos: { x: 0.3 } }, manos: { lejos: { alcance: 1, alto: 0, abre: 0 } } });
      const esq = aEsqueleto(m, p);
      const j = resolver(m, esq);
      expect(j.tobillo.lejos[0], id).toBeCloseTo(0.3 * m.pierna, 1);
      expect(j.tobillo.lejos[1], id).toBeCloseTo(m.tobillo, 1);
      // el brazo estirado mide lo que el estilo dice (con el puño), salvo lo que el IK deja de margen
      expect(dist(j.hombro.lejos, j.puño.lejos) / m.alcance, id).toBeGreaterThan(0.98);
      // y apunta hacia adelante: el retarget es el mismo dato en los dos tamaños
      expect(j.puño.lejos[0] - j.hombro.lejos[0], id).toBeGreaterThan(0.95 * m.alcance);
    }
  });

  it('el estirón del impacto alarga el brazo de verdad (no solo empuja la mano)', () => {
    const m = medidasDe(estilo('luchador'), 160);
    const p = sobre(POSE_NEUTRA, { manos: { cerca: { alcance: 1, alto: 0, abre: 0 } } });
    const normal = resolver(m, aEsqueleto(m, p));
    const largo = resolver(m, aEsqueleto(m, p, { estira: { mano: { cerca: 0.1 } } }));
    const ln = dist(normal.hombro.cerca, normal.puño.cerca), ll = dist(largo.hombro.cerca, largo.puño.cerca);
    expect(ll / ln).toBeGreaterThan(1.08);
  });
});
