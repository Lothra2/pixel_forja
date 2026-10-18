import { describe, it, expect } from 'vitest';
import { SONAMBULO_SPEC, GARGOLA_SPEC, DUENDE_SPEC, RELOJERO_SPEC, diveShadow, sandProjectile, sandImpact, needleWarning } from '../boss/ciudad';
import { renderBossSheets } from '../boss/sheet';
import { bossPoses } from '../boss/anim';

/** Los enemigos del Mundo 5 (parte 3). */
describe('Mundo 5: los enemigos de la ciudad dormida', () => {
  const names = (s: typeof SONAMBULO_SPEC) => s.anims.map((a) => a.name).sort();
  const anim = (s: typeof SONAMBULO_SPEC, n: string) => s.anims.find((a) => a.name === n)!;

  it('sus animaciones y su celda, como pide el encargo', () => {
    expect(names(SONAMBULO_SPEC)).toEqual(['attack', 'die', 'hit', 'idle', 'quieto', 'walk']);
    expect(names(GARGOLA_SPEC)).toEqual(['attack', 'despertar', 'die', 'hit', 'posada', 'walk']);
    expect(names(DUENDE_SPEC)).toEqual(['attack', 'die', 'hit', 'idle', 'walk']);
    expect(names(RELOJERO_SPEC)).toEqual(['attack', 'attack_heavy', 'die', 'hit', 'idle', 'walk', 'warcry']);
    expect([SONAMBULO_SPEC.cell, GARGOLA_SPEC.cell, DUENDE_SPEC.cell, RELOJERO_SPEC.cell]).toEqual([48, 48, 48, 64]);
    // se ve antes de pegar: el empujón avisa 4 cuadros (con los ojos que se prenden), la picada 6, la llave levantada 7 o más
    const w = (s: typeof SONAMBULO_SPEC, n: string) => { const a = anim(s, n); return a.windup![1] - a.windup![0] + 1; };
    expect(w(SONAMBULO_SPEC, 'attack')).toBeGreaterThanOrEqual(4);
    expect(w(GARGOLA_SPEC, 'attack')).toBeGreaterThanOrEqual(6);
    expect(w(RELOJERO_SPEC, 'attack_heavy')).toBeGreaterThanOrEqual(7);
    const glow = bossPoses(anim(SONAMBULO_SPEC, 'attack')).map((p) => p.extra?.glow ?? 0);
    const [a, b] = anim(SONAMBULO_SPEC, 'attack').windup!;
    expect(glow[b]).toBeGreaterThan(0.9);
    expect(glow[a]).toBeGreaterThan(0.2);
    expect(glow[0]).toBe(0);
    // dormido y en la luz: quieto es de piedra con los ojos cerrados
    expect(bossPoses(anim(SONAMBULO_SPEC, 'quieto'))[0].extra?.glow ?? 0).toBe(0);
    // la gárgola posada está en el piso con los ojos cerrados; volando está en el aire
    expect(bossPoses(anim(GARGOLA_SPEC, 'posada'))[0].extra).toMatchObject({ hover: 0, eyes: 0 });
    expect(bossPoses(anim(GARGOLA_SPEC, 'walk')).every((p) => (p.extra?.hover ?? 0) > 15)).toBe(true);
    // el relojero da cuerda (grito) y se libera al morir
    expect(anim(RELOJERO_SPEC, 'warcry').events!.some((e) => e.type === 'grito')).toBe(true);
    const die = anim(RELOJERO_SPEC, 'die');
    expect(die.keys[die.keys.length - 1].pose.freed).toBe(1);
    for (const s of [SONAMBULO_SPEC, GARGOLA_SPEC, DUENDE_SPEC, RELOJERO_SPEC]) for (const n of ['attack']) expect(anim(s, n).events!.some((e) => e.type === 'impacto'), `${s.id} ${n}`).toBe(true);
  });

  it('caben en su celda y los ojos del sonámbulo se prenden celeste en el aviso', () => {
    for (const s of [SONAMBULO_SPEC, GARGOLA_SPEC, DUENDE_SPEC, RELOJERO_SPEC]) {
      const { clips } = renderBossSheets(s);
      for (const c of clips) expect(c.overflow, `${s.id} ${c.def.name}`).toBe(0);
      if (s === SONAMBULO_SPEC) {
        const atk = clips.find((c) => c.def.name === 'attack')!;
        const celeste = (f: (typeof atk.frames)[number][number]) => { let n = 0; for (let i = 0; i < f.w * f.h; i++) if (f.data[i * 4 + 3] && f.data[i * 4 + 2] > 220 && f.data[i * 4 + 1] > 170 && f.data[i * 4] < 190) n++; return n; };
        expect(celeste(atk.frames[0][4])).toBeGreaterThan(2);
        expect(celeste(clips.find((c) => c.def.name === 'quieto')!.frames[0][0])).toBe(0);
        // al morir se desmorona: el último cuadro tiene mucho menos que el primero
        const d = clips.find((c) => c.def.name === 'die')!;
        const op = (f: (typeof atk.frames)[number][number]) => { let n = 0; for (let i = 0; i < f.w * f.h; i++) if (f.data[i * 4 + 3] > 150) n++; return n; };
        expect(op(d.frames[0][d.frames[0].length - 1])).toBeLessThan(op(d.frames[0][0]) * 0.35);
      }
    }
  });

  it('los efectos: la sombra de la picada, la arena en 8 direcciones y la aguja que se repite en línea', () => {
    const sp = diveShadow(), pr = sandProjectile(), im = sandImpact(), ag = needleWarning();
    expect([sp.length, sp[0].w, sp[0].h]).toEqual([6, 48, 24]);
    expect([pr.length, pr[0].w, pr[0].h]).toEqual([4, 16, 16]);
    expect([im.length, im[0].w, im[0].h]).toEqual([6, 32, 32]);
    expect([ag.length, ag[0].w, ag[0].h]).toEqual([6, 32, 32]);
    // la aguja pega con el cuadro de al lado: la columna 0 y la 31 siguen el mismo dibujo (borde de arriba)
    const on = (r: (typeof ag)[number], x: number) => r.data[(13 * 32 + x) * 4 + 3] > 0;
    expect(ag.some((r) => on(r, 0) || on(r, 31))).toBe(true);
    // la sombra crece
    const area = (r: (typeof sp)[number]) => { let n = 0; for (let i = 0; i < r.w * r.h; i++) if (r.data[i * 4 + 3]) n++; return n; };
    expect(area(sp[5])).toBeGreaterThan(area(sp[0]) * 2);
  });
}, 600_000);
