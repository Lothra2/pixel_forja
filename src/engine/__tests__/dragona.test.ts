import { describe, it, expect } from 'vitest';
import { DRAGONA_SPEC, dragonaBoca, breathWarning, floorFire, tailWarning, bigSteam } from '../boss/dragona';
import { renderBossSheets } from '../boss/sheet';
import { bossPoses } from '../boss/anim';

/** El jefe del Mundo 6 (parte 4): la Dragona de Brasa. */
describe('Mundo 6: la Dragona de Brasa', () => {
  const D = DRAGONA_SPEC;
  const anim = (n: string) => D.anims.find((a) => a.name === n)!;

  it('sus animaciones, celda 128, los avisos y la elevación', () => {
    expect(D.cell).toBe(128);
    expect(D.anims.map((a) => a.name).sort()).toEqual(['aliento', 'apagada', 'attack', 'coletazo', 'die', 'encendida', 'hit', 'idle', 'walk', 'warcry']);
    const w = (n: string) => { const a = anim(n); return a.windup![1] - a.windup![0] + 1; };
    expect(w('attack')).toBeGreaterThanOrEqual(6);
    expect(w('coletazo')).toBeGreaterThanOrEqual(6);
    expect(w('aliento')).toBeGreaterThanOrEqual(8);
    for (const n of ['attack', 'coletazo', 'aliento']) expect(anim(n).events!.some((e) => e.type === 'impacto'), n).toBe(true);
    expect(Math.max(...anim('coletazo').rise!)).toBeGreaterThan(0);
    expect(anim('warcry').events!.some((e) => e.type === 'grito')).toBe(true);
    for (const n of ['encendida', 'apagada', 'idle', 'walk']) expect(anim(n).loop, n).toBe(true);
    // el aliento: el pecho se pone al rojo durante el aviso y el chorro sale después
    const al = bossPoses(anim('aliento'));
    expect(al[8].extra!.chest).toBeGreaterThan(0.9);
    expect(al[4].extra!.breath).toBe(0);
    expect(al[11].extra!.breath).toBe(1);
    // apagada: gris y echada; die: rompe las cadenas, dorada, chiquita y enroscada
    expect(bossPoses(anim('apagada')).every((p) => p.extra!.grey === 1 && p.extra!.lie === 1)).toBe(true);
    const die = bossPoses(anim('die')), last = die[die.length - 1].extra!;
    expect([last.chains, last.gold, last.curl]).toEqual([1, 1, 1]);
    expect(last.small).toBeLessThan(0.7);
  });

  it('la boca: un punto por cuadro adelante y arriba, que baja al echarse y es null apagada con la boca cerrada', () => {
    for (const a of D.anims) for (const p of bossPoses(a)) {
      const b = dragonaBoca(128, p);
      if (a.name === 'apagada') { expect(b, a.name).toBeNull(); continue; }
      expect(b, a.name).not.toBeNull();
      if (a.name !== 'die') { expect(b![0], a.name).toBeGreaterThan(10); expect(b![1], a.name).toBeGreaterThan(20); }
    }
    // al rugir la boca sube
    const ys = bossPoses(anim('warcry')).map((p) => dragonaBoca(128, p)![1]);
    expect(Math.max(...ys)).toBeGreaterThan(ys[0] + 8);
  });

  it('cabe en la celda en las 8 direcciones (reposo)', () => {
    const quick = { ...D, anims: D.anims.filter((a) => a.name === 'idle').map((a) => ({ ...a, frames: 2 })) };
    const { clips } = renderBossSheets(quick);
    for (const c of clips) expect(c.overflow).toBe(0);
  });

  it('los efectos a su medida', () => {
    const sz = (fr: { w: number; h: number }[]) => [fr.length, fr[0].w, fr[0].h];
    expect(sz(breathWarning())).toEqual([6, 32, 32]);
    expect(sz(floorFire())).toEqual([8, 32, 32]);
    expect(sz(tailWarning())).toEqual([8, 192, 96]);
    expect(sz(bigSteam())).toEqual([10, 96, 128]);
  });
}, 600_000);
