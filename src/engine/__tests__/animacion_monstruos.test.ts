import { describe, it, expect } from 'vitest';
import animacionJson from '../gotico/datos/animacion_monstruos.json';
import zancadaCorrerJson from '../gotico/datos/zancada_correr_monstruos.json';
import { ANIMACION_MONSTRUO, IMPACTO_ATAQUE } from '../gotico/datos/animacion_monstruos';
import { ZANCADA_CORRER_MONSTRUO, ZANCADA_MONSTRUO } from '../gotico/datos/zancada_monstruos';
import { patasCuadrupedo, ZANCADA_CORRER_BESTIA, BESTIAS_QUE_CORREN } from '../gotico/catalogo/bestias';
import { REGISTRO, herramientas } from '../gotico/objeto';

/** Adelante en el mundo para cada dirección (como `mundo()` de bestias.ts). */
const ADELANTE: Record<string, [number, number]> = { se: [1, 0], o: [Math.cos((135 * Math.PI) / 180), Math.sin((135 * Math.PI) / 180)] };
const GALOPAN = ['lobo_sombrio', 'jabali_demonio', 'perro_infernal'];

describe('animación de los monstruos de los catálogos propios', () => {
  it('los JSON para el juego están al día', () => {
    expect(animacionJson).toEqual(ANIMACION_MONSTRUO);
    expect(zancadaCorrerJson).toEqual(ZANCADA_CORRER_MONSTRUO);
  });

  it('el golpe cae en el cuadro 4 de 8 y correr y herido tienen los cuadros que espera el juego', () => {
    for (const [id, a] of Object.entries(ANIMACION_MONSTRUO)) {
      expect(a.impacto, id).toBe(IMPACTO_ATAQUE);
      if (a.acciones.atacar) expect(a.acciones.atacar, id).toBe(8);
      if (a.acciones.correr) expect(a.acciones.correr, id).toBe(8);
      if (a.acciones.herido) expect(a.acciones.herido, id).toBe(4);
    }
    for (const id of BESTIAS_QUE_CORREN) expect(ANIMACION_MONSTRUO[id].acciones.correr, id).toBe(8);
    // las bestias que caminan con pisada propia tienen zancada (sin ella el juego usa la humana y patinan)
    for (const id of GALOPAN) { expect(ZANCADA_MONSTRUO[id], id).toBeGreaterThan(0.5); expect(ZANCADA_CORRER_MONSTRUO[id], id).toBeGreaterThan(ZANCADA_MONSTRUO[id]); }
  });

  it('al galopar la pata apoyada retrocede pareja (no patina), la que avanza va por el aire y hay suspensión', () => {
    for (const id of GALOPAN) for (const d of ['se', 'o'] as const) {
      const paso = ZANCADA_CORRER_BESTIA[id] / 8, F = ADELANTE[d];
      const P = Array.from({ length: 8 }, (_, f) => patasCuadrupedo(id, d, 'correr', f));
      const piso = Math.min(...P.flat().map((q) => q.pie[2])) + 0.01;
      const x = (q: { pie: number[] }) => q.pie[0] * F[0] + q.pie[1] * F[1];
      for (let f = 0; f < 8; f++) for (let k = 0; k < 4; k++) {
        const a = P[f][k], b = P[(f + 1) % 8][k];
        if (a.pie[2] <= piso && b.pie[2] <= piso) expect((x(a) - x(b)) / paso, `${id} ${d} cuadro ${f} pata ${k}`).toBeCloseTo(1, 1);
        if (x(b) > x(a) + 0.5) expect(Math.max(a.pie[2], b.pie[2]), `${id} ${d} cuadro ${f} pata ${k}`).toBeGreaterThan(piso);
        // la IK llega: la mano o pezuña está donde la marcha la pone
        expect(Math.hypot(a.pz[0] - a.pie[0], a.pz[1] - a.pie[1], a.pz[2] - a.pie[2]), `${id} ${d} ${f} ${k}`).toBeLessThan(1);
      }
      // los cuadros 6 y 7 son la suspensión: las cuatro en el aire
      for (const f of [6, 7]) for (const q of P[f]) expect(q.pie[2], `${id} ${d} suspensión ${f}`).toBeGreaterThan(piso);
    }
  });

  it('ninguna articulación se dobla al revés (codos atrás, rodillas de atrás adelante)', () => {
    for (const id of GALOPAN) for (const acc of ['quieto', 'caminar', 'correr', 'atacar', 'herido']) for (const d of ['se', 'o'] as const) {
      const n = acc === 'quieto' || acc === 'herido' ? 4 : 8;
      for (let f = 0; f < n; f++) for (const q of patasCuadrupedo(id, d, acc, f)) {
        const ab = q.tob.map((v, i) => v - q.raiz[i]), L2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
        const t = ab.reduce((s, v, i) => s + v * (q.rod[i] - q.raiz[i]), 0) / L2;
        const fuera = q.rod.map((v, i) => v - q.raiz[i] - ab[i] * t);
        const adelante = fuera[0] * q.adel[0] + fuera[1] * q.adel[1] + fuera[2] * q.adel[2];
        expect(q.del ? -adelante : adelante, `${id} ${acc} ${d} ${f}`).toBeGreaterThan(1);
      }
    }
  });

  it('al recibir un golpe las patas no se mueven del piso', () => {
    for (const id of GALOPAN) {
      const P = Array.from({ length: 4 }, (_, f) => patasCuadrupedo(id, 'se', 'herido', f));
      for (let f = 1; f < 4; f++) for (let k = 0; k < 4; k++) expect(Math.hypot(P[f][k].pie[0] - P[0][k].pie[0], P[f][k].pie[1] - P[0][k].pie[1]), `${id} ${f} ${k}`).toBeLessThan(0.01);
    }
  });

  it('herido tiene cuatro cuadros distintos en todos los monstruos de los catálogos propios', () => {
    for (const [sprite, a] of Object.entries(ANIMACION_MONSTRUO)) {
      if (!a.acciones.herido) continue;
      const o = REGISTRO.find((x) => x.id === (sprite.startsWith('jefe_') ? `${sprite}_herido` : `mon_${sprite}_herido`))!;
      const firmas = Array.from({ length: 4 }, (_, f) => JSON.stringify(o.armar('so', f, herramientas(1))));
      expect(new Set(firmas).size, sprite).toBe(4);
    }
  });
});
