import { toScreen, type Vec } from './iso';

/** Partículas de pixel: polvo de los pasos, arena, gotas, chispas. Viven en el mundo y caen con gravedad. */
interface Particle { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; max: number; color: string; size: number; grav: number }

/** Texto que sube y se apaga (distancias, puntos, "¡NOCAUT!"). */
interface FloatText { x: number; y: number; z: number; text: string; life: number; color: string }

export class Effects {
  private parts: Particle[] = [];
  private texts: FloatText[] = [];
  shake = 0;

  dust(p: Vec, n = 5, color = '#d9c9a3') {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 6 + Math.random() * 14;
      this.parts.push({ x: p.x, y: p.y, z: 1, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 6 + Math.random() * 10, life: 0, max: 0.35 + Math.random() * 0.2, color, size: 1, grav: 40 });
    }
  }

  burst(p: Vec, z: number, n: number, colors: string[], speed = 40, up = 30) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.6);
      this.parts.push({ x: p.x, y: p.y, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: up * (0.5 + Math.random()), life: 0, max: 0.4 + Math.random() * 0.3, color: colors[i % colors.length], size: Math.random() < 0.3 ? 2 : 1, grav: 120 });
    }
  }

  text(p: Vec, z: number, text: string, color = '#ffffff') {
    this.texts.push({ x: p.x, y: p.y, z, text, life: 0, color });
  }

  update(dt: number) {
    for (const q of this.parts) {
      q.life += dt;
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.vz -= q.grav * dt;
      if (q.z < 0) { q.z = 0; q.vz = 0; q.vx *= 0.6; q.vy *= 0.6; }
    }
    this.parts = this.parts.filter((q) => q.life < q.max);
    for (const t of this.texts) { t.life += dt; t.z += 14 * dt; }
    this.texts = this.texts.filter((t) => t.life < 1.6);
    this.shake = Math.max(0, this.shake - dt * 20);
  }

  draw(g: CanvasRenderingContext2D, cam: Vec) {
    for (const q of this.parts) {
      const s = toScreen(q.x, q.y, q.z);
      g.globalAlpha = 1 - q.life / q.max;
      g.fillStyle = q.color;
      g.fillRect(Math.round(s.x - cam.x), Math.round(s.y - cam.y), q.size, q.size);
    }
    g.globalAlpha = 1;
  }

  /** Los textos se dibujan en el lienzo grande (no en el de pixeles) para que se lean bien. */
  drawTexts(g: CanvasRenderingContext2D, cam: Vec, zoom: number) {
    g.textAlign = 'center';
    g.font = `700 ${Math.max(12, Math.round(zoom * 5))}px Silkscreen, monospace`;
    for (const t of this.texts) {
      const s = toScreen(t.x, t.y, t.z);
      g.globalAlpha = Math.min(1, 2 * (1.6 - t.life));
      g.fillStyle = '#0b0a12';
      g.fillText(t.text, (s.x - cam.x) * zoom + 2, (s.y - cam.y) * zoom + 2);
      g.fillStyle = t.color;
      g.fillText(t.text, (s.x - cam.x) * zoom, (s.y - cam.y) * zoom);
    }
    g.globalAlpha = 1;
  }
}

/** Sonidos sintetizados (sin archivos): pasos, golpes, pelota, agua. Se activan con el primer toque. */
export class Sfx {
  private ctx?: AudioContext;
  private noise?: AudioBuffer;
  on = false;

  private ensure() {
    if (!this.on) return null;
    if (!this.ctx) {
      try { this.ctx = new AudioContext(); } catch { return null; }
      const b = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.5, this.ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noise = b;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private burst(dur: number, type: BiquadFilterType, freq: number, gain: number, sweep?: number) {
    const c = this.ensure();
    if (!c || !this.noise) return;
    const src = c.createBufferSource(); src.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, c.currentTime + dur);
    const g = c.createGain(); g.gain.setValueAtTime(gain, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    src.connect(f).connect(g).connect(c.destination);
    src.start(); src.stop(c.currentTime + dur);
  }

  private tone(dur: number, from: number, to: number, gain: number, type: OscillatorType = 'sine') {
    const c = this.ensure();
    if (!c) return;
    const o = c.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(from, c.currentTime); o.frequency.exponentialRampToValueAtTime(to, c.currentTime + dur);
    const g = c.createGain(); g.gain.setValueAtTime(gain, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start(); o.stop(c.currentTime + dur);
  }

  step(near: boolean) { this.burst(0.05, 'lowpass', near ? 900 : 700, 0.18); }
  land() { this.burst(0.14, 'lowpass', 500, 0.35); this.tone(0.12, 110, 50, 0.25); }
  whoosh() { this.burst(0.18, 'bandpass', 600, 0.25, 2400); }
  hit(strong: boolean) { this.tone(strong ? 0.18 : 0.1, strong ? 160 : 220, 45, 0.5, 'triangle'); this.burst(0.08, 'highpass', 1800, strong ? 0.35 : 0.2); }
  ball() { this.tone(0.06, 720, 380, 0.3, 'square'); }
  bounce() { this.tone(0.05, 300, 180, 0.2); }
  splash(big: boolean) { this.burst(big ? 0.45 : 0.18, 'bandpass', 1400, big ? 0.4 : 0.12, 500); }
  whistle() { this.tone(0.35, 2100, 2000, 0.12, 'square'); }
}
