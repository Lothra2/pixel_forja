import { describe, it, expect } from 'vitest';
import { History } from '../history';

describe('deshacer y rehacer', () => {
  it('deshace y rehace en orden, y un cambio nuevo borra lo que se podía rehacer', () => {
    const h = new History<number>();
    let v = 0;
    const set = (n: number) => { h.record(v); v = n; };
    set(1); set(2); set(3);
    v = h.undo(v)!; v = h.undo(v)!;
    expect(v).toBe(1);
    v = h.redo(v)!;
    expect(v).toBe(2);
    set(9);
    expect(h.canRedo).toBe(false);
    expect(h.undo(v)).toBe(2);
  });

  it('un arrastre entero es un solo paso, pero dos arrastres son dos', () => {
    const h = new History<string>();
    h.record('a', 'drag1', 0); h.record('b', 'drag1', 16); h.record('c', 'drag1', 32);
    h.record('d', 'drag2', 48);
    expect(h.undo('e')).toBe('d');
    expect(h.undo('d')).toBe('a');
    expect(h.canUndo).toBe(false);
  });

  it('el mismo deslizador después de una pausa larga cuenta como otro paso', () => {
    const h = new History<number>();
    h.record(1, 'torso', 0); h.record(2, 'torso', 100); h.record(3, 'torso', 5000);
    expect(h.undo(4)).toBe(3);
    expect(h.undo(3)).toBe(1);
  });

  it('tiene límite', () => {
    const h = new History<number>(3);
    for (let i = 0; i < 10; i++) h.record(i);
    expect([h.undo(10), h.undo(9), h.undo(8), h.undo(7)]).toEqual([9, 8, 7, null]);
  });
});
