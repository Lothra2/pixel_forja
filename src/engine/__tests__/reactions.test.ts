import { describe, it, expect } from 'vitest';
import { bosqueObjects } from '../world/bosqueMap';
import { catedralMapObjects } from '../world/catedralMap';
import { smallCreatures } from '../world/reactions';
import { SFX, RATE } from '../audio/sfx';
import type { Raster } from '../core/raster';

const same = (a: Raster, b: Raster) => a.w === b.w && a.h === b.h && a.data.every((v, i) => v === b.data[i]);

describe('2.9 un mundo que reacciona', () => {
  const objs = [...bosqueObjects(), ...catedralMapObjects()];
  const by = new Map(objs.map((o) => [o.name, o]));
  const has = (re: RegExp, anim: string, fps: [number, number]) => {
    const list = objs.filter((o) => re.test(o.name));
    expect(list.length, String(re)).toBeGreaterThan(0);
    for (const o of list) {
      const a = o.anims[anim];
      expect(a, `${o.name}.${anim}`).toBeTruthy();
      expect(a.fps, `${o.name}.${anim} fps`).toBeGreaterThanOrEqual(fps[0]);
      expect(a.fps, `${o.name}.${anim} fps`).toBeLessThanOrEqual(fps[1]);
      for (const f of a.frames) expect([f.w, f.h], `${o.name}.${anim} tamaño`).toEqual([o.w, o.h]);
    }
  };

  it('las animaciones nuevas en lo que ya había, con los fps del encargo', () => {
    has(/^arbusto/, 'sacudir', [6, 14]);
    has(/^arbusto_moras/, 'sin_moras', [1, 1]);
    has(/^(hongos|hongo_gigante)/, 'rebotar', [6, 14]);
    has(/^flores_grandes/, 'cerrar', [4, 10]);
    has(/^flores_grandes/, 'abrir', [4, 10]);
    has(/^(nenufar|juncos)/, 'mecer', [6, 10]);
    has(/^(charco|charco_chico)/, 'salpicar', [6, 16]);
    has(/^(antorcha|farol|candelabro_pie)$/, 'apagada', [1, 1]);
    has(/^(antorcha|farol|candelabro_pie)$/, 'prender', [6, 12]);
    has(/^telarana$/, 'romper', [6, 14]);
    // de verdad cambian: sin moras no es el arbusto de siempre, apagada no es prendida
    const moras = by.get('arbusto_moras_0')!;
    expect(same(moras.anims.sin_moras.frames[0], moras.anims.idle.frames[0])).toBe(false);
    for (const n of ['antorcha', 'farol']) expect(same(by.get(n)!.anims.apagada.frames[0], by.get(n)!.anims.idle.frames[0]), n).toBe(false);
  });

  it('los objetos nuevos: palanca, puerta, reja, piedra que empuja Thor y campana chica', () => {
    const spec: [string, number, number, string[]][] = [
      ['palanca', 32, 32, ['arriba', 'bajar', 'abajo']], ['puerta_madera', 64, 64, ['cerrada', 'abrir', 'abierta']], ['reja_catedral', 64, 64, ['cerrada', 'abrir', 'abierta']],
      ['piedra_empujable', 32, 32, ['quieta', 'arrastrar']], ['campana_chica', 32, 48, ['sonar']],
    ];
    for (const [n, w, h, anims] of spec) {
      const o = by.get(n)!;
      expect(o, n).toBeTruthy();
      expect(o.w, n).toBeGreaterThanOrEqual(w);
      expect(o.h, n).toBeGreaterThanOrEqual(h);
      for (const a of anims) expect(o.anims[a], `${n}.${a}`).toBeTruthy();
      expect(o.solid, n).not.toBeNull();
    }
    expect(by.get('palanca')!.solid!.slice(2)).toEqual([12, 6]);
    expect(by.get('palanca')!.anims.bajar.fps).toBeGreaterThanOrEqual(6);
    expect(by.get('puerta_madera')!.anims.abrir.fps).toBeGreaterThanOrEqual(8);
  });

  it('ranas, peces y ardillas de 16 a 24 px que se quedan quietas y huyen', () => {
    const c = smallCreatures();
    expect(c.map((x) => x.name).sort()).toEqual(['ardilla', 'pez', 'rana']);
    for (const x of c) {
      expect(x.w).toBeGreaterThanOrEqual(16); expect(x.w).toBeLessThanOrEqual(24);
      expect(x.anims.quieto.fps).toBe(4);
      expect(x.anims.huir.fps).toBeGreaterThanOrEqual(8); expect(x.anims.huir.fps).toBeLessThanOrEqual(12);
    }
  });

  it('cada interacción con su sonido corto: de 0.2 a 0.8 s y pico de 0.5', () => {
    for (const n of ['arbusto_sacudir', 'hongo_rebote', 'charco_pisar', 'rana_salto', 'palanca', 'puerta_abrir', 'reja_abrir', 'piedra_arrastrar', 'campana_chica', 'telarana_romper'] as const) {
      const b = SFX[n]();
      const dur = b.length / RATE;
      expect(dur, n).toBeGreaterThanOrEqual(0.2); expect(dur, n).toBeLessThanOrEqual(0.85);
      let p = 0; for (const v of b) p = Math.max(p, Math.abs(v));
      expect(p, n).toBeCloseTo(0.5, 2);
    }
  });
});
