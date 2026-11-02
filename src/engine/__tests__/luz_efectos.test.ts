import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PODERES } from '../gotico/poderes';
import { LUZ_EFECTO, EFECTOS_NUEVOS, luzEfectosJson, intensidadLuz, rgbLuz } from '../gotico/luz_efectos';

describe('luz de los poderes', () => {
  it('cada poder tiene su luz, con una curva por cuadro', () => {
    for (const p of PODERES) {
      const l = LUZ_EFECTO[p.id];
      expect(l, p.id).toBeDefined();
      expect(l.curva.length, p.id).toBe(p.cuadros);
      expect(l.curva.every((k) => k >= 0 && k <= 1), p.id).toBe(true);
      expect(l.color, p.id).toMatch(/^#[0-9a-f]{6}$/);
      expect(l.intensidad >= 0 && l.intensidad <= 1, p.id).toBe(true);
      if (l.intensidad > 0) {
        expect(l.radio, p.id).toBeGreaterThan(40);
        expect(Math.max(...l.curva), p.id).toBeGreaterThan(0.5);
      }
      if (l.impacto) expect(LUZ_EFECTO[l.impacto], `${p.id} -> ${l.impacto}`).toBeDefined();
      // los que pasan una vez terminan apagados
      if (!p.bucle && l.intensidad > 0) expect(l.curva[l.curva.length - 1], p.id).toBeLessThan(0.35);
    }
    expect(Object.keys(LUZ_EFECTO).sort()).toEqual(PODERES.map((p) => p.id).sort());
  });

  it('los proyectiles que alumbran viajan con su luz y los impactos caen rápido', () => {
    for (const p of PODERES.filter((x) => x.tipo === 'proyectil' && x.bucle)) {
      const l = LUZ_EFECTO[p.id];
      expect(l.enVuelo, p.id).toBe(true);
    }
    for (const id of ['explosion_fuego', 'impacto_rayo', 'impacto_sagrado', 'castigo']) {
      const c = LUZ_EFECTO[id].curva;
      expect(c[0], id).toBe(1);
      expect(c[Math.floor(c.length / 2)], id).toBeLessThan(0.4);
    }
    expect(intensidadLuz('explosion_fuego', 0, 2, false)).toBe(1);
    expect(intensidadLuz('explosion_fuego', 10, 2, false)).toBe(0);
    expect(intensidadLuz('bola_fuego', 10, 2, true)).toBeGreaterThan(0.5);
    expect(rgbLuz('bola_fuego')).toEqual([255, 138, 51]);
  });

  it('los ids nuevos existen y el json para el juego está al día', () => {
    for (const id of EFECTOS_NUEVOS) expect(PODERES.find((p) => p.id === id), id).toBeDefined();
    const ruta = fileURLToPath(new URL('../gotico/datos/luz_efectos.json', import.meta.url));
    expect(JSON.parse(readFileSync(ruta, 'utf8'))).toEqual(JSON.parse(JSON.stringify(luzEfectosJson())));
  });
});
