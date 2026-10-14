import { describe, it, expect } from 'vitest';
import { REY_DE_PIEDRA_SPEC, reyCorona, fistWarning, crackGlow, lullabyNote } from '../boss/rey';
import { renderBossSheets } from '../boss/sheet';
import { bossPoses } from '../boss/anim';

/** El jefe del Mundo 5 (parte 4): el Rey de Piedra. */
describe('Mundo 5: el Rey de Piedra', () => {
  const R = REY_DE_PIEDRA_SPEC;
  const anim = (n: string) => R.anims.find((a) => a.name === n)!;

  it('sus animaciones, celda 128, y los golpes avisan 6 cuadros o más', () => {
    expect(R.cell).toBe(128);
    expect(R.anims.map((a) => a.name).sort()).toEqual(['attack', 'attack_heavy', 'aturdido', 'barrido', 'die', 'hit', 'idle', 'walk', 'warcry']);
    for (const n of ['attack', 'attack_heavy', 'barrido']) {
      const a = anim(n);
      expect(a.windup![1] - a.windup![0] + 1, n).toBeGreaterThanOrEqual(6);
      expect(a.events!.some((e) => e.type === 'impacto'), n).toBe(true);
    }
    // el pisotón salta: sube con `elevacion`
    expect(Math.max(...anim('attack_heavy').rise!)).toBeGreaterThan(10);
    expect(anim('warcry').events!.some((e) => e.type === 'grito')).toBe(true);
    expect(anim('aturdido').loop).toBe(true);
    // se libera: termina sin corona, de colores, saludando
    const die = anim('die');
    const last = die.keys[die.keys.length - 1].pose;
    expect(last.freed).toBe(1);
    expect(last.extra!.crown).toBe(0);
  });

  it('la corona: un punto por cuadro mientras está entera, arriba de la cabeza, y en die se va (null) después de romperse', () => {
    for (const a of R.anims) {
      const poses = bossPoses(a);
      for (const p of poses) {
        const c = reyCorona(128, p);
        if ((p.extra?.crown ?? 1) >= 0.5) { expect(c, a.name).not.toBeNull(); expect(c![1], a.name).toBeGreaterThan(40); }
      }
    }
    const die = bossPoses(anim('die'));
    expect(die.slice(6).every((p) => (p.extra?.crown ?? 1) < 0.5)).toBe(true);
    expect(reyCorona(128, die[die.length - 1])).toBeNull();
    // en idle la luz sube y baja con la respiración, pero no salta
    const ys = bossPoses(anim('idle')).map((p) => reyCorona(128, p)![1]);
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(6);
  });

  it('cabe en la celda en las 8 direcciones y la corona es lo más brillante', () => {
    const quick = { ...R, anims: R.anims.filter((a) => a.name === 'idle').map((a) => ({ ...a, frames: 2 })) };
    const { clips } = renderBossSheets(quick);
    for (const c of clips) expect(c.overflow).toBe(0);
    const f = clips[0].frames[7][0];
    let bright = 0;
    for (let i = 0; i < f.w * f.h; i++) if (f.data[i * 4 + 3] === 255 && f.data[i * 4] > 245 && f.data[i * 4 + 1] > 225) bright++;
    expect(bright).toBeGreaterThanOrEqual(6);
  });

  it('los efectos a su medida', () => {
    const a = fistWarning(), g = crackGlow(), n = lullabyNote();
    expect([a.length, a[0].w, a[0].h]).toEqual([8, 96, 48]);
    expect([g.length, g[0].w, g[0].h]).toEqual([6, 64, 64]);
    expect([n.length, n[0].w, n[0].h]).toEqual([6, 16, 16]);
  });
}, 600_000);
