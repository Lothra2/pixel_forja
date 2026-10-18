import { describe, it, expect } from 'vitest';
import { lanternClip } from '../render/petLantern';
import { renderClip, EIGHT_VIEWS } from '../render/clip';
import { thorFicha } from '../rpg/family';
import { PET_RPG_ANIMS } from '../anim/animal';

/** El farol de Thor (Mundo 4, parte 3): una capa que calza cuadro por cuadro con la hoja de Thor. */
describe('el farol de Thor', () => {
  const f = thorFicha(0);
  const ambar = (r: { data: Uint8Array | Uint8ClampedArray }) => { let n = 0; for (let i = 0; i < r.data.length; i += 4) if (r.data[i + 3] && r.data[i] > 220 && r.data[i + 1] > 140 && r.data[i + 2] < 140) n++; return n; };

  it('mismo encuadre que Thor: los cuadros de Thor que arma el farol son idénticos a los de su hoja', () => {
    for (const a of ['walk', 'howl', 'dig']) for (const v of ['front', 'sw', 'side', 'ne'] as const) {
      const l = lanternClip(f, 48, a, v, true), t = renderClip(f, 48, a, v, { props: true });
      expect(l.frames.length, `${a} ${v}`).toBe(t.frames.length);
      l.thor.forEach((fr, i) => expect(Buffer.from(fr.data).equals(Buffer.from(t.frames[i].data)), `${a} ${v} ${i}`).toBe(true));
    }
  });

  it('todas las animaciones de Thor, 48 x 48, y el farol se ve (prendido) en las vistas de frente y de lado', () => {
    for (const a of PET_RPG_ANIMS) {
      const l = lanternClip(f, 48, a, 'side', true);
      expect(l.frames[0].w, a).toBe(48);
      expect(l.frames.some((fr) => ambar(fr) >= 4), a).toBe(true);
    }
    for (const v of EIGHT_VIEWS.filter((q) => q !== 'back')) expect(ambar(lanternClip(f, 48, 'walk', v, true).frames[0]), v).toBeGreaterThan(0);
  });

  it('en el aullido el farol sube (alzar el farol) y el apagado no tiene luz', () => {
    const idle = lanternClip(f, 48, 'idle', 'side', true), howl = lanternClip(f, 48, 'howl', 'side', true);
    const top = Math.min(...howl.handle.map((h) => h![1]));
    expect(top).toBeLessThan(idle.handle[0]![1] - 3);
    const off = lanternClip(f, 48, 'walk', 'side', false);
    for (const fr of off.frames) expect(ambar(fr)).toBe(0);
    // la llamita titila: dos cuadros seguidos no son iguales
    const w = lanternClip(f, 48, 'idle', 'front', true);
    expect(Buffer.from(w.frames[0].data).equals(Buffer.from(w.frames[1].data))).toBe(false);
  });
}, 300_000);
