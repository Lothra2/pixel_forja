import { describe, it, expect } from 'vitest';
import { DIABLO_SPEC, diabloOjos, novaFire, novaWarning, redBeam, beamWarning, firePillar, pillarWarning, boneCage, chargeWarning, NOVA_HUECOS } from '../boss/diablo';
import { renderBossSheets } from '../boss/sheet';
import { bossPoses } from '../boss/anim';

/** El jefe final (Mundo 7, parte 4): el Diablo. */
describe('Mundo 7: el Diablo', () => {
  const D = DIABLO_SPEC;
  const anim = (n: string) => D.anims.find((a) => a.name === n)!;
  const w = (n: string) => { const a = anim(n); return a.windup![1] - a.windup![0] + 1; };

  it('sus 13 animaciones, celda 192 y el aviso antes de pegar', () => {
    expect(D.cell).toBe(192);
    expect(D.anims.map((a) => a.name).sort()).toEqual(['attack', 'aturdido', 'charge', 'die', 'hit', 'idle', 'jaula', 'nova', 'oscuridad', 'pilares', 'rayo', 'walk', 'warcry']);
    expect(w('attack')).toBeGreaterThanOrEqual(6);
    expect(w('nova')).toBeGreaterThanOrEqual(8);
    expect(w('rayo')).toBeGreaterThanOrEqual(8);
    for (const a of D.anims) if (a.events?.some((e) => e.type === 'impacto')) expect(a.windup, a.name).toBeTruthy();
    for (const n of ['idle', 'walk', 'charge', 'aturdido']) expect(anim(n).loop, n).toBe(true);
    expect(anim('warcry').events!.some((e) => e.type === 'grito')).toBe(true);
    // die: cae de rodillas, la última llama sale del pecho y termina en ceniza
    const die = anim('die');
    expect(die.events!.map((e) => e.type)).toEqual(['aterriza', 'suelta']);
    const dp = bossPoses(die);
    expect(dp[dp.length - 1].extra!.ash).toBe(1);
  });

  it('los ojos: un punto por cuadro en la cara, que se apaga sólo cuando la ceniza le llega a la cara', () => {
    for (const a of D.anims) for (const [i, p] of bossPoses(a).entries()) {
      const o = diabloOjos(192, p);
      if (a.name === 'die' && i >= 18) continue;
      expect(o, `${a.name} ${i}`).not.toBeNull();
      expect(o![1], `${a.name} ${i}`).toBeGreaterThan(40);
    }
    const dp = bossPoses(anim('die'));
    expect(diabloOjos(192, dp[dp.length - 1])).toBeNull();
  });

  it('cabe en la celda en las 8 direcciones', () => {
    const quick = { ...D, anims: D.anims.map((a) => ({ ...a, frames: Math.min(a.frames, 6), events: undefined })) };
    const { clips } = renderBossSheets(quick);
    for (const c of clips) expect(c.overflow, c.def.name).toBe(0);
  });

  it('los efectos a la medida del encargo', () => {
    const sz = (fr: { w: number; h: number }[]) => [fr.length, fr[0].w, fr[0].h];
    expect(sz(novaFire())).toEqual([10, 256, 256]);
    expect(sz(novaWarning())).toEqual([8, 256, 256]);
    expect(sz(redBeam())).toEqual([6, 32, 32]);
    expect(sz(beamWarning())).toEqual([6, 32, 32]);
    expect(sz(firePillar())).toEqual([12, 64, 128]);
    expect(sz(pillarWarning())).toEqual([8, 64, 32]);
    const j = boneCage();
    expect([sz(j.subir), sz(j.quieta), sz(j.romper)]).toEqual([[8, 96, 96], [1, 96, 96], [8, 96, 96]]);
    expect(sz(chargeWarning())[1]).toBe(32);
    // el anillo de la nova deja pasar por los huecos: en el cuadro 6 no hay fuego en el centro de cada hueco
    const f = novaFire()[5];
    let anillo = 0;
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) if (f.data[(y * 256 + x) * 4 + 3]) anillo++;
    expect(anillo).toBeGreaterThan(500);
    for (const [c] of NOVA_HUECOS) for (let d = 30; d < 120; d += 2) {
      const x = Math.round(128 + Math.cos(c) * d), y = Math.round(128 + Math.sin(c) * d * 0.62);
      expect(f.data[(y * 256 + x) * 4 + 3], `${c} ${d}`).toBe(0);
    }
  });
}, 900_000);
