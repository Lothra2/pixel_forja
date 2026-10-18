import { describe, it, expect } from 'vitest';
import { renderClip, posesFor } from '../render/clip';
import { familyFicha } from '../rpg/family';
import type { Joints } from '../render/human';
import { patinazos, resumen, NO_CLAVAR } from '../forja2/clavar';

const f = familyFicha('rick', true);
const slip = (anim: string, v: 'side' | 'left', pieClavado: boolean) => {
  const c = renderClip(f, 48, anim, v, { props: true, ...(pieClavado ? { pieClavado } : {}) });
  return { c, r: resumen(patinazos(posesFor(f, 48, anim, 'side'), (c.joints ?? []) as Joints[], c.frames.map(() => 0), c.loop)) };
};

describe('Forja 2: el pie clavado (piloto 0d)', () => {
  it('apagado (lo de siempre) da los mismos cuadros; prendido baja el patinazo de hit sin cambiar cuántos cuadros hay', () => {
    const base = renderClip(f, 48, 'hit', 'left', { props: true });
    const apagado = renderClip(f, 48, 'hit', 'left', { props: true, pieClavado: false });
    expect(apagado.frames.map((x) => Buffer.from(x.data).toString('base64'))).toEqual(base.frames.map((x) => Buffer.from(x.data).toString('base64')));
    const antes = slip('hit', 'left', false), despues = slip('hit', 'left', true);
    expect(antes.r.max).toBeGreaterThan(2);
    expect(despues.r.max).toBeLessThan(antes.r.max);
    expect(despues.c.frames).toHaveLength(antes.c.frames.length);
    expect(despues.c.events).toEqual(antes.c.events);
  });

  it('no toca las que avanzan ni las que se deslizan a propósito', () => {
    for (const a of ['walk', ...NO_CLAVAR]) {
      const x = renderClip(f, 48, a, 'side', { props: true }), y = renderClip(f, 48, a, 'side', { props: true, pieClavado: true });
      expect(y.frames.map((r) => Buffer.from(r.data).toString('base64')), a).toEqual(x.frames.map((r) => Buffer.from(r.data).toString('base64')));
    }
  });
});
