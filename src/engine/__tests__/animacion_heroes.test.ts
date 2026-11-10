import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ANIM_HEROE, CLASES_HEROE, CUADROS, cuadrosDe, manifiestoAnimacion, zancada, ESTILO_CLASE, pose } from '../gotico/figura';
import { qaHeroes } from '../../../scripts/qa-heroes';

describe('animación de los héroes: cuadros por clase', () => {
  it('el manifiesto que lee el juego está al día con el código (npx tsx scripts/animacion-heroes.ts)', () => {
    const json = JSON.parse(readFileSync(join(__dirname, '../gotico/animacion_heroes.json'), 'utf8'));
    expect(json).toEqual(JSON.parse(JSON.stringify(manifiestoAnimacion())));
  });
  it('los héroes atacan, lanzan, corren y caminan en 12 cuadros y respiran en 8; los monstruos siguen como siempre', () => {
    expect(CUADROS).toEqual({ quieto: 4, caminar: 8, correr: 8, atacar: 8, lanzar: 8, herido: 4, morir: 8, presentar: 16 });
    for (const c of CLASES_HEROE) {
      const a = ANIM_HEROE[c], e = ESTILO_CLASE[c];
      expect([a.atacar.cuadros, a.lanzar.cuadros, a.correr.cuadros, a.caminar.cuadros, a.quieto.cuadros]).toEqual([12, 12, 12, 12, 8]);
      expect(cuadrosDe('atacar', e)).toBe(12);
      for (const acc of ['atacar', 'lanzar'] as const) {
        expect(a[acc].impacto).toBeGreaterThan(0);
        expect(a[acc].impacto).toBeLessThan(a[acc].cuadros - 1);
      }
      expect(zancada('caminar', 1, e)).toBeGreaterThan(30);
      expect(zancada('correr', 1, e)).toBeGreaterThan(zancada('caminar', 1, e));
    }
    expect(cuadrosDe('atacar')).toBe(8);
  });
  it('cada clase se mueve distinto: el mismo cuadro de ataque no da la misma pose en dos clases', () => {
    const firma = (e: (typeof ESTILO_CLASE)[keyof typeof ESTILO_CLASE]) => JSON.stringify(pose('atacar', 4, 'una', e));
    const firmas = new Set(CLASES_HEROE.map((c) => firma(ESTILO_CLASE[c])));
    expect(firmas.size).toBeGreaterThanOrEqual(6);
  });
  it('QA numérica: 0 fallas en todos los cuadros de las 8 clases, 4 niveles y 8 direcciones', () => {
    const { cuadros, fallas } = qaHeroes();
    expect(cuadros).toBeGreaterThan(20000);
    expect(fallas.slice(0, 5)).toEqual([]);
  });
});
