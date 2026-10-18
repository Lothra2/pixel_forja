import { describe, it, expect } from 'vitest';
import { HOLLIN_SPEC, SALAMANDRA_SPEC, FAROLERO_SPEC, CARCELERO_SPEC, faroleroJaula, emberProjectile, emberImpact, emberTrail, chainSpinWarning, chainLineWarning, steamPuff } from '../boss/fragua';
import { renderBossSheets } from '../boss/sheet';
import { bossPoses } from '../boss/anim';

/** Los enemigos del Mundo 6 (parte 3). */
describe('Mundo 6: los enemigos de la fragua', () => {
  type Spec = typeof HOLLIN_SPEC;
  const names = (s: Spec) => s.anims.map((a) => a.name).sort();
  const anim = (s: Spec, n: string) => s.anims.find((a) => a.name === n)!;
  const w = (s: Spec, n: string) => { const a = anim(s, n); return a.windup![1] - a.windup![0] + 1; };

  it('sus animaciones, su celda y el aviso antes de pegar, como pide el encargo', () => {
    expect(names(HOLLIN_SPEC)).toEqual(['attack', 'die', 'hit', 'idle', 'pegado', 'walk']);
    expect(names(SALAMANDRA_SPEC)).toEqual(['attack', 'die', 'hit', 'idle', 'piedra', 'walk']);
    expect(names(FAROLERO_SPEC)).toEqual(['attack', 'attack_heavy', 'die', 'hit', 'idle', 'walk']);
    expect(names(CARCELERO_SPEC)).toEqual(['attack', 'attack_heavy', 'die', 'hit', 'idle', 'jalar', 'walk', 'warcry']);
    expect([HOLLIN_SPEC.cell, SALAMANDRA_SPEC.cell, FAROLERO_SPEC.cell, CARCELERO_SPEC.cell]).toEqual([32, 48, 64, 64]);
    expect(w(HOLLIN_SPEC, 'attack')).toBeGreaterThanOrEqual(4);
    expect(w(SALAMANDRA_SPEC, 'attack')).toBeGreaterThanOrEqual(4);
    expect(w(FAROLERO_SPEC, 'attack_heavy')).toBeGreaterThanOrEqual(7);
    expect(w(CARCELERO_SPEC, 'attack_heavy')).toBeGreaterThanOrEqual(7);
    for (const s of [HOLLIN_SPEC, SALAMANDRA_SPEC, FAROLERO_SPEC, CARCELERO_SPEC]) expect(anim(s, 'attack').events!.some((e) => e.type === 'impacto'), s.id).toBe(true);
    // la salamandra: la boca brilla en el aviso; mojada es piedra negra
    const sal = bossPoses(anim(SALAMANDRA_SPEC, 'attack'));
    expect(sal[anim(SALAMANDRA_SPEC, 'attack').windup![1]].extra!.mouth).toBeGreaterThan(0.6);
    expect(bossPoses(anim(SALAMANDRA_SPEC, 'piedra')).every((p) => p.extra!.cool === 1)).toBe(true);
    // el hollín pegado es más chiquito
    expect(bossPoses(anim(HOLLIN_SPEC, 'pegado')).every((p) => (p.extra!.small ?? 1) < 0.8)).toBe(true);
    // el Carcelero grita (portazo) y se libera al morir
    expect(anim(CARCELERO_SPEC, 'warcry').events!.some((e) => e.type === 'grito')).toBe(true);
    const die = anim(CARCELERO_SPEC, 'die');
    expect(die.keys[die.keys.length - 1].pose.freed).toBe(1);
    expect(anim(CARCELERO_SPEC, 'jalar').loop).toBe(true);
  });

  it('caben en su celda; la jaula del farolero cae al morir', () => {
    for (const s of [HOLLIN_SPEC, SALAMANDRA_SPEC, FAROLERO_SPEC, CARCELERO_SPEC]) {
      const { clips } = renderBossSheets(s);
      for (const c of clips) expect(c.overflow, `${s.id} ${c.def.name}`).toBe(0);
      if (s === HOLLIN_SPEC) {
        // al morir se deshace en polvo
        const d = clips.find((c) => c.def.name === 'die')!;
        const op = (f: (typeof d.frames)[number][number]) => { let n = 0; for (let i = 0; i < f.w * f.h; i++) if (f.data[i * 4 + 3] > 150) n++; return n; };
        expect(op(d.frames[0][d.frames[0].length - 1])).toBeLessThan(op(d.frames[0][0]) * 0.3);
      }
    }
    const die = anim(FAROLERO_SPEC, 'die'), poses = bossPoses(die);
    const a = faroleroJaula(64, poses[0]), b = faroleroJaula(64, poses[poses.length - 1]);
    expect(b[1]).toBeLessThan(a[1] - 10);
    expect(die.events!.some((e) => e.type === 'suelta')).toBe(true);
  });

  it('los efectos: la brasa en 8 direcciones, su impacto y su rastro, los avisos de las cadenas y el vapor', () => {
    const sz = (fr: { w: number; h: number }[]) => [fr.length, fr[0].w, fr[0].h];
    expect(sz(emberProjectile())).toEqual([4, 16, 16]);
    expect(sz(emberImpact())).toEqual([6, 32, 32]);
    expect(sz(emberTrail())).toEqual([6, 32, 32]);
    expect(sz(chainSpinWarning())).toEqual([8, 128, 64]);
    expect(sz(chainLineWarning())).toEqual([6, 32, 32]);
    expect(sz(steamPuff())).toEqual([8, 64, 64]);
    // el aviso de la cadena en línea pega con el de al lado (algo en las columnas de los bordes)
    const ln = chainLineWarning();
    expect(ln.some((r) => r.data[(11 * 32) * 4 + 3] > 0 || r.data[(11 * 32 + 31) * 4 + 3] > 0)).toBe(true);
  });
}, 900_000);
