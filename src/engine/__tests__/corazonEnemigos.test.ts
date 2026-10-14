import { describe, it, expect } from 'vitest';
import { LOBO_SPEC, ESPECTRO_SPEC, DIABLILLO_SPEC, CABALLERO_SPEC, BRUJA_SPEC, SOMBRA_DEVORADORA_SPEC, iceProjectile, iceImpact, smallFireball, iceLanceWarning, crossWarning } from '../boss/corazon';
import { REINA_SPEC, GUARDIAN_PUERTA_SPEC, CORAZON_SPECS } from '../boss/corazonJefes';
import { corazonObjectsB } from '../world/corazonObjectsB';
import { renderBossSheets } from '../boss/sheet';
import { bossPoses } from '../boss/anim';

/** Los enemigos del Mundo 7 (parte 3). */
describe('Mundo 7: los enemigos del Corazón Helado', () => {
  type Spec = typeof LOBO_SPEC;
  const names = (s: Spec) => s.anims.map((a) => a.name).sort();
  const anim = (s: Spec, n: string) => s.anims.find((a) => a.name === n)!;
  const w = (s: Spec, n: string) => { const a = anim(s, n); return a.windup![1] - a.windup![0] + 1; };

  it('sus animaciones, su celda y el aviso antes de pegar, como pide el encargo', () => {
    expect(names(LOBO_SPEC)).toEqual(['attack', 'aullar', 'die', 'hit', 'idle', 'run', 'walk']);
    expect(names(ESPECTRO_SPEC)).toEqual(['cast', 'die', 'hit', 'idle', 'walk']);
    expect(names(DIABLILLO_SPEC)).toEqual(['attack', 'die', 'hit', 'idle', 'walk']);
    expect(names(CABALLERO_SPEC)).toEqual(['attack', 'attack_heavy', 'bloquear', 'die', 'hit', 'idle', 'walk']);
    expect(names(BRUJA_SPEC)).toEqual(['cast', 'die', 'hit', 'idle', 'walk']);
    expect(names(SOMBRA_DEVORADORA_SPEC)).toEqual(['attack', 'die', 'hit', 'idle', 'walk']);
    expect(names(REINA_SPEC)).toEqual(['attack', 'cast', 'die', 'dividirse', 'hit', 'idle', 'walk', 'warcry']);
    expect(names(GUARDIAN_PUERTA_SPEC)).toEqual(['attack', 'attack_heavy', 'charge', 'die', 'hit', 'idle', 'walk']);
    expect(CORAZON_SPECS.map((s) => s.cell)).toEqual([48, 48, 32, 64, 48, 48, 64, 64]);
    expect(w(LOBO_SPEC, 'attack')).toBeGreaterThanOrEqual(4);
    expect(w(ESPECTRO_SPEC, 'cast')).toBeGreaterThanOrEqual(6);
    expect(w(DIABLILLO_SPEC, 'attack')).toBeGreaterThanOrEqual(4);
    expect(w(CABALLERO_SPEC, 'attack_heavy')).toBeGreaterThanOrEqual(7);
    expect(w(SOMBRA_DEVORADORA_SPEC, 'attack')).toBeGreaterThanOrEqual(4);
    expect(w(GUARDIAN_PUERTA_SPEC, 'attack_heavy')).toBeGreaterThanOrEqual(7);
    expect(w(REINA_SPEC, 'cast')).toBeGreaterThanOrEqual(6);
    for (const s of CORAZON_SPECS) for (const a of s.anims) if (a.events?.some((e) => e.type === 'impacto')) expect(a.windup, `${s.id} ${a.name}`).toBeTruthy();
    // el caballero bloquea en bucle con el escudo al frente; la sombra abre la boca en el aviso
    expect(anim(CABALLERO_SPEC, 'bloquear').loop).toBe(true);
    expect(bossPoses(anim(CABALLERO_SPEC, 'bloquear')).every((p) => p.extra!.shield === 1)).toBe(true);
    const so = anim(SOMBRA_DEVORADORA_SPEC, 'attack');
    expect(bossPoses(so)[so.windup![1]].extra!.mouth).toBeGreaterThan(0.8);
    // el golpe en cruz son dos impactos; la carga es en bucle; la Reina se divide y suelta los reflejos
    expect(anim(GUARDIAN_PUERTA_SPEC, 'attack').events!.filter((e) => e.type === 'impacto').length).toBe(2);
    expect(anim(GUARDIAN_PUERTA_SPEC, 'charge').loop).toBe(true);
    expect(anim(REINA_SPEC, 'dividirse').events!.some((e) => e.type === 'suelta')).toBe(true);
    expect(anim(LOBO_SPEC, 'aullar').events!.some((e) => e.type === 'grito')).toBe(true);
  });

  it('caben en su celda, se ven en lo oscuro y al morir se deshacen (sin dejar nada)', () => {
    for (const s of CORAZON_SPECS) {
      const { clips } = renderBossSheets(s);
      for (const c of clips) expect(c.overflow, `${s.id} ${c.def.name}`).toBe(0);
      const op = (f: { w: number; h: number; data: Uint8ClampedArray | Uint8Array }) => { let n = 0; for (let i = 0; i < f.w * f.h; i++) if (f.data[i * 4 + 3] > 150) n++; return n; };
      // los ojos (o las juntas) brillan: de frente (abajo, abajo a la izquierda y abajo a la derecha) hay pixeles
      // muy claros y saturados, rojos, naranjas, celestes o blancos
      const idle = clips.find((c) => c.def.name === 'idle')!;
      for (const dir of [0, 1, 7]) {
        const fr = idle.frames[dir][0];
        let glow = 0;
        for (let i = 0; i < fr.w * fr.h; i++) { const R = fr.data[i * 4], G = fr.data[i * 4 + 1], B = fr.data[i * 4 + 2]; if (fr.data[i * 4 + 3] && ((R > 230 && G < 200 && B < 130) || (B > 230 && G > 190) || (R > 230 && G > 230 && B > 230))) glow++; }
        expect(glow, `${s.id} ${dir}`).toBeGreaterThan(0);
      }
      if (['lobo_escarcha', 'espectro_helado', 'diablillo', 'bruja_escarcha', 'sombra_devoradora', 'reina_escarcha'].includes(s.id)) {
        const d = clips.find((c) => c.def.name === 'die')!;
        expect(op(d.frames[0][d.frames[0].length - 1]), s.id).toBeLessThan(op(d.frames[0][0]) * 0.4);
      }
    }
  });

  it('los efectos: el rayo de hielo y la bolita de fuego en 8 direcciones, el impacto, las lanzas, la cruz y el muro', () => {
    const sz = (fr: { w: number; h: number }[]) => [fr.length, fr[0].w, fr[0].h];
    expect(sz(iceProjectile())).toEqual([4, 16, 16]);
    expect(sz(iceImpact())).toEqual([6, 32, 32]);
    expect(sz(smallFireball())).toEqual([4, 16, 16]);
    expect(sz(iceLanceWarning())).toEqual([8, 48, 32]);
    expect(sz(crossWarning())).toEqual([8, 128, 128]);
    const muro = corazonObjectsB().find((o) => o.name === 'muro_hielo')!;
    expect([muro.w, muro.h]).toEqual([32, 64]);
    expect(muro.solid).toBeTruthy();
    expect([muro.anims.subir.frames.length, muro.anims.subir.fps, muro.anims.quieto.frames.length, muro.anims.romper.frames.length, muro.anims.romper.fps]).toEqual([6, 12, 1, 6, 12]);
  });
}, 1_200_000);
