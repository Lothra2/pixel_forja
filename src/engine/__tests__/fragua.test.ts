import { describe, it, expect } from 'vitest';
import { premiumPortal, PORTAL_MUNDO } from '../world/portales';

describe('Mundo 6, parte 7: el portal brasa de La Fragua de las Luces', () => {
  it('portal_brasa en el formato de los nuevos, con grietas naranjas que se apagan', () => {
    const p = premiumPortal('brasa');
    expect(p.name).toBe('portal_brasa');
    expect([p.w, p.h]).toEqual([96, 128]);
    for (const a of ['girar', 'abrir', 'cerrar', 'arco', 'remolino', 'apagado']) expect(p.anims[a], a).toBeTruthy();
    expect([p.anims.girar.frames.length, p.anims.girar.fps]).toEqual([12, 12]);
    expect(PORTAL_MUNDO.mundo6).toBe('brasa');
    const naranja = (r: { data: Uint8ClampedArray | Uint8Array }) => { let n = 0; for (let i = 0; i < r.data.length; i += 4) if (r.data[i + 3] && r.data[i] > 220 && r.data[i + 1] > 90 && r.data[i + 1] < 140 && r.data[i + 2] < 60) n++; return n; };
    expect(naranja(p.anims.arco.frames[0])).toBeGreaterThan(naranja(p.anims.apagado.frames[0]) + 30);
  });
});
