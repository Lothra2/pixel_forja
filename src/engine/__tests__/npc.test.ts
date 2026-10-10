import { describe, it, expect } from 'vitest';
import { merchantFicha, NPCS, NPC_ANIMS } from '../rpg/npc';
import { renderClip, EIGHT_VIEWS } from '../render/clip';
import { runQA } from '../qa/checks';

describe('PNJ: el mercader', () => {
  it('pasa el control de calidad en sus animaciones y en las 8 direcciones', () => {
    const f = merchantFicha();
    for (const id of NPCS) for (const a of NPC_ANIMS[id]) for (const v of EIGHT_VIEWS) {
      const r = runQA(f, renderClip(f, 48, a, v, { props: true }));
      expect(r.ok, `${id} ${a} ${v}: ${JSON.stringify(r.issues ?? r)}`.slice(0, 300)).toBe(true);
    }
  }, 60000);
  it('lleva su libro de cuentas y no lleva armas', () => {
    const f = merchantFicha();
    expect(f.gear).toMatchObject({ main: null, off: 'tome' });
    expect(f.avatar?.lpc?.hat).toBe('cavalier');
  });
});
