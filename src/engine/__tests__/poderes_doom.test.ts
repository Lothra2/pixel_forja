import { describe, it, expect } from 'vitest';
import { PODERES, pintarPoder } from '../gotico/poderes';
import { LUZ_EFECTO } from '../gotico/luz_efectos';
import { EFECTOS_DOOM, curvaDoom } from '../gotico/poderes_doom';

const dif = (a: Uint8ClampedArray, b: Uint8ClampedArray) => { let s = 0; for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 3] - b[i + 3]); return s; };

describe('poderes con fuego de Doom', () => {
  it('los ids nuevos están, con luz cuya curva sale del calor de la llama', () => {
    expect(EFECTOS_DOOM).toEqual(['muro_infierno', 'cerco_llamas', 'suelo_ardiente', 'lluvia_brasas', 'pilar_infernal', 'llanto_animas', 'llama_corona_fria']);
    for (const id of EFECTOS_DOOM) {
      const p = PODERES.find((x) => x.id === id)!;
      expect(p, id).toBeDefined();
      expect(p.nombre[0].length && p.nombre[1].length, id).toBeTruthy();
      expect(LUZ_EFECTO[id].curva, id).toEqual(curvaDoom(id));
      expect(LUZ_EFECTO[id].curva.length, id).toBe(p.cuadros);
    }
  });

  it('muro_llamas (sin cambios) y crater_ardiente (con Doom) conservan id, cuadros, celda y ancla', () => {
    const m = PODERES.find((x) => x.id === 'muro_llamas')!, c = PODERES.find((x) => x.id === 'crater_ardiente')!;
    expect([m.cuadros, m.t, m.bucle, m.celda, m.ancla]).toEqual([10, 2, true, [84, 126], [42, 100]]);
    expect([c.cuadros, c.t, c.bucle, c.celda, c.ancla]).toEqual([10, 2, true, [93, 105], [45, 78]]);
  });

  it('los que se repiten empalman sin salto y todo es determinista', () => {
    for (const id of ['muro_llamas', 'crater_ardiente', ...EFECTOS_DOOM]) {
      const p = PODERES.find((x) => x.id === id)!;
      if (!p.bucle) continue;
      const fs = Array.from({ length: p.cuadros }, (_, f) => pintarPoder(id, 0, f).img.data);
      let paso = 0; for (let f = 0; f < p.cuadros - 1; f++) paso += dif(fs[f], fs[f + 1]);
      paso /= p.cuadros - 1;
      // del último al primero no cambia más que entre dos cuadros seguidos (con holgura)
      expect(dif(fs[p.cuadros - 1], fs[0]), id).toBeLessThan(paso * 1.6);
    }
    expect([...pintarPoder('pilar_infernal', 0, 6).img.data]).toEqual([...pintarPoder('pilar_infernal', 0, 6).img.data]);
  }, 120_000);
});
