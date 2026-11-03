import { describe, it, expect } from 'vitest';
import zancadaJson from '../gotico/datos/zancada_monstruos.json';
import { ZANCADA_MONSTRUO } from '../gotico/datos/zancada_monstruos';
import { esqueleto } from '../gotico/cuerpo';
import { zancada, CUADROS } from '../gotico/figura';

describe('zancada de los monstruos del acto 1', () => {
  it('el JSON para el juego está al día y todos los valores son positivos', () => {
    expect(zancadaJson).toEqual(ZANCADA_MONSTRUO);
    for (const [id, v] of Object.entries(ZANCADA_MONSTRUO)) expect(v, id).toBeGreaterThan(0.3);
    // los humanoides pisan como los héroes (2,83 casillas por ciclo a alto 1)
    expect(ZANCADA_MONSTRUO.zombi).toBeCloseTo(zancada('caminar') / 16, 2);
  });

  it('al caminar el pie apoyado retrocede parejo (no patina) y el del aire no roza el piso', () => {
    const zan = zancada('caminar'), n = CUADROS.caminar;
    const pies = Array.from({ length: n }, (_, f) => {
      const e = esqueleto({ piel: 'cu_piel' }, 's', 'caminar', f);
      return e.piernas.map((p) => ({ x: p.tob[0] * e.F[0] + p.tob[1] * e.F[1], z: p.tob[2] }));
    });
    for (let f = 0; f < n; f++) for (let k = 0; k < 2; k++) {
      const a = pies[f][k], b = pies[(f + 1) % n][k];
      // apoyado en los dos cuadros: retrocede zancada / 8
      if (a.z < 2.5 && b.z < 2.5) expect((a.x - b.x) / (zan / n), `cuadro ${f} pie ${k}`).toBeCloseTo(1, 1);
      // si avanza, va por el aire
      if (b.x > a.x + 0.5) expect(Math.max(a.z, b.z), `cuadro ${f} pie ${k}`).toBeGreaterThan(2.5);
    }
  });
});
