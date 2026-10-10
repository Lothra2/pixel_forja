import { describe, it, expect } from 'vitest';
import { PlaybackClock } from '../playback';

/** Simula una pantalla a hz cuadros por segundo durante ms milisegundos. */
const run = (c: PlaybackClock, ms: number, hz: number) => {
  const seen: number[] = [];
  for (let t = 0; t < ms; t += 1000 / hz) if (c.tick(1000 / hz)) seen.push(c.frame);
  return seen;
};

describe('reloj de reproducción', () => {
  it('va al ritmo del clip en pantallas de 60, 120 y 144 Hz', () => {
    for (const hz of [60, 120, 144]) {
      const c = new PlaybackClock({ frames: 8, fps: 10, loop: true });
      const seen = run(c, 2000, hz);
      expect(seen.length, `${hz} Hz`).toBeGreaterThanOrEqual(19);
      expect(seen.length, `${hz} Hz`).toBeLessThanOrEqual(20);
      // nunca se salta un cuadro
      seen.forEach((f, i) => i && expect(f).toBe((seen[i - 1] + 1) % 8));
    }
  });

  it('una trabada larga no salta medio clip', () => {
    const c = new PlaybackClock({ frames: 8, fps: 10, loop: true });
    c.tick(5000);
    expect(c.frame).toBe(2);
  });

  it('sin bucle: llega al final, espera y repite; con holdMs 0 se queda', () => {
    const c = new PlaybackClock({ frames: 4, fps: 10, loop: false }, 300);
    expect(run(c, 300, 100)).toEqual([1, 2, 3]);
    expect(c.atEnd).toBe(true);
    c.tick(200);
    expect(c.frame).toBe(3);
    c.tick(110);
    expect(c.frame).toBe(0);
    const stay = new PlaybackClock({ frames: 4, fps: 10, loop: false }, 0);
    run(stay, 2000, 60);
    expect(stay.frame).toBe(3);
    stay.toggle();
    stay.toggle();
    expect([stay.frame, stay.playing]).toEqual([0, true]);
  });

  it('cuadro a cuadro pausa y da la vuelta solo si el clip tiene bucle', () => {
    const c = new PlaybackClock({ frames: 6, fps: 12, loop: true });
    c.step(-1);
    expect([c.frame, c.playing]).toEqual([5, false]);
    expect(c.tick(1000)).toBe(false);
    const once = new PlaybackClock({ frames: 6, fps: 12, loop: false });
    once.step(-1);
    expect(once.frame).toBe(0);
  });

  it('a media velocidad tarda el doble', () => {
    const c = new PlaybackClock({ frames: 8, fps: 10, loop: true });
    c.speed = 0.5;
    expect(run(c, 2000, 60).length).toBeGreaterThanOrEqual(9);
    expect(run(new PlaybackClock({ frames: 8, fps: 10, loop: true }), 2000, 60).length).toBeGreaterThanOrEqual(19);
    expect(c.frame).toBeLessThanOrEqual(2);
  });
});
