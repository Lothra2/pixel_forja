/** Lo que el reloj necesita saber del clip. */
export interface ClipTiming { frames: number; fps: number; loop: boolean }

/**
 * Reloj de reproducción del estudio. Avanza a pasos fijos de 1000/fps ms y guarda el resto, así el ritmo es
 * el del juego aunque el navegador dibuje a 60, 120 o 144 Hz o se trabe un momento. Sin requestAnimationFrame
 * adentro: el que dibuja le pasa el tiempo, y así se puede probar sin pantalla.
 */
export class PlaybackClock {
  frame = 0;
  playing = true;
  /** 1 = velocidad del juego */
  speed = 1;
  private acc = 0;
  private held = 0;

  /** holdMs: en un clip sin bucle, cuánto se queda en el último cuadro antes de repetir (0 = se queda ahí) */
  constructor(public timing: ClipTiming, public holdMs = 600) {}

  /** Clip nuevo: vuelve al principio y sigue en el mismo estado (pausado o andando). */
  load(timing: ClipTiming) {
    this.timing = timing;
    this.frame = 0;
    this.acc = 0;
    this.held = 0;
  }

  get atEnd() { return !this.timing.loop && this.frame === this.timing.frames - 1; }

  /** Pasa dt ms. Devuelve true si cambió el cuadro. */
  tick(dt: number): boolean {
    const { frames, fps, loop } = this.timing;
    if (!this.playing || frames <= 1) return false;
    // si la pestaña estuvo dormida no salta medio clip de golpe
    const d = Math.min(dt, 250) * this.speed;
    if (this.atEnd) {
      if (!this.holdMs) return false;
      this.held += d;
      if (this.held < this.holdMs) return false;
      this.held = 0;
      this.acc = 0;
      this.frame = 0;
      return true;
    }
    const step = 1000 / fps;
    this.acc += d;
    let moved = false;
    while (this.acc >= step) {
      this.acc -= step;
      if (!loop && this.frame === frames - 2) { this.frame = frames - 1; this.acc = 0; this.held = 0; return true; }
      this.frame = (this.frame + 1) % frames;
      moved = true;
    }
    return moved;
  }

  seek(i: number) {
    const n = this.timing.frames;
    this.frame = this.timing.loop ? ((Math.round(i) % n) + n) % n : Math.max(0, Math.min(n - 1, Math.round(i)));
    this.acc = 0;
    this.held = 0;
  }

  /** Un cuadro adelante o atrás: pausa, porque si no el cuadro se escapa al instante. */
  step(d: 1 | -1) {
    this.playing = false;
    this.seek(this.frame + d);
  }

  toggle() {
    if (!this.playing && this.atEnd) this.seek(0);
    this.playing = !this.playing;
  }
}
