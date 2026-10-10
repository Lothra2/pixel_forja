/**
 * Deshacer y rehacer. Se guarda el estado de antes de cada cambio. Los cambios seguidos con la misma etiqueta
 * (un arrastre, mover un deslizador) cuentan como uno solo, así deshacer no va pixel por pixel.
 */
export class History<T> {
  private past: T[] = [];
  private future: T[] = [];
  private lastTag: string | undefined;
  private lastAt = 0;

  constructor(private limit = 100, private window = 800) {}

  record(prev: T, tag?: string, now = Date.now()) {
    if (tag !== undefined && tag === this.lastTag && now - this.lastAt < this.window) { this.lastAt = now; return; }
    this.past.push(prev);
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
    this.lastTag = tag;
    this.lastAt = now;
  }

  undo(current: T): T | null {
    const p = this.past.pop();
    if (p === undefined) return null;
    this.future.push(current);
    this.lastTag = undefined;
    return p;
  }

  redo(current: T): T | null {
    const n = this.future.pop();
    if (n === undefined) return null;
    this.past.push(current);
    this.lastTag = undefined;
    return n;
  }

  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }

  clear() {
    this.past = [];
    this.future = [];
    this.lastTag = undefined;
  }
}
