import type { Kit, KitAnim, KitEvent } from './kit';
import { DIR_WORLD, SQRT2, toScreen, type Direction, type Vec } from './iso';

/**
 * Un atleta en el juego. Todo lo que hace sale de los datos del kit:
 * - en los ciclos con `avance`, la animación la mueve la distancia recorrida (el pie no patina a ninguna velocidad);
 * - en las acciones con `desplazamiento`, el juego mueve el sprite eso hacia el `rumbo` de la fila;
 * - `elevacion` sube el sprite sobre su sombra y `agua` alinea la superficie con la piscina;
 * - los `eventos` se avisan en el cuadro justo (pasos, golpes, sueltas, despegues, aterrizajes).
 */

export type EventHandler = (a: Actor, e: KitEvent, anim: string) => void;

interface OneShot { name: string; start: Vec; dir: Vec; done?: () => void }

export class Actor {
  pos: Vec;
  facing: Direction;
  anim = '';
  /** tiempo de la animación en cuadros (con decimales) */
  t = 0;
  private shot: OneShot | null = null;
  sheets = new Map<string, HTMLImageElement>();
  /** lo que se movió en el último paso (para saber si va corriendo) */
  moved = 0;
  /** a qué velocidad va la animación respecto a sus fps (para el panel de datos) */
  rate = 1;
  /** se dibuja en la superficie del agua (natación) */
  inWater = false;
  /** se espeja a mano: fight_step hacia atrás se reproduce al revés */
  reverse = false;

  constructor(readonly kit: Kit, public id: string, public sport: string, pos: Vec, facing: Direction, private onEvent: EventHandler) {
    this.pos = { ...pos };
    this.facing = facing;
  }

  get info() { return this.kit.athlete(this.id); }
  get cell() { return this.info.celda; }
  get pivot() { return this.info.pivote; }
  def(name = this.anim): KitAnim | undefined { return this.kit.anim(this.id, this.sport, name); }
  has(name: string) { return !!this.def(name) && this.sheets.has(name); }
  get busy() { return !!this.shot; }
  get row() { return this.kit.row(this.facing); }

  frame(): number {
    const d = this.def();
    if (!d) return 0;
    const f = Math.floor(this.t + 1e-6);
    return d.loop ? ((f % d.cuadros) + d.cuadros) % d.cuadros : Math.min(d.cuadros - 1, Math.max(0, f));
  }

  elevation(): number { return this.def()?.elevacion?.[this.frame()] ?? 0; }
  waterRow(): number | null { return this.def()?.agua?.[this.frame()] ?? null; }

  /** Velocidad natural de un ciclo en el mundo (pixeles por segundo): la que hace que el pie no patine a sus fps. */
  nativeSpeed(name: string): number {
    const d = this.def(name);
    return d?.avance ? ((d.avance / SQRT2) * d.fps) / d.cuadros : 0;
  }

  /** Cambia el ciclo (reposo, caminar, nadar). No interrumpe una acción. */
  loop(name: string) {
    if (this.shot || name === this.anim || !this.has(name)) return;
    this.anim = name;
    this.t = 0;
  }

  /** Lanza una acción de un disparo. Devuelve false si el atleta no la tiene o está ocupado. */
  play(name: string, done?: () => void, force = false): boolean {
    if ((this.shot && !force) || !this.has(name)) return false;
    const d = this.def(name)!;
    // de frente, una prueba de campo se dibuja en diagonal: el rumbo dice hacia dónde avanza de verdad
    const heading = (d.rumbo?.[this.row] ?? this.facing) as Direction;
    this.shot = { name, start: { ...this.pos }, dir: DIR_WORLD[heading] ?? DIR_WORLD[this.facing], done };
    this.anim = name;
    this.t = 0;
    this.fire(-1, 0, d);
    return true;
  }

  /** Corta la acción en curso (un golpe recibido manda sobre lo que estaba haciendo). */
  interrupt() { this.shot = null; }

  /**
   * Avanza el tiempo. `move`: hacia dónde y a qué fracción de la velocidad natural del ciclo actual.
   * Devuelve el desplazamiento aplicado en el mundo.
   */
  update(dt: number, move?: { dir: Vec; k: number }): void {
    const d = this.def();
    this.moved = 0;
    if (!d) return;
    const before = this.t;
    if (this.shot) {
      this.t += dt * d.fps;
      this.rate = 1;
      // desplazamiento: entre cuadro y cuadro se interpola, así se mueve parejo
      if (d.desplazamiento) {
        const f = Math.min(d.cuadros - 1, this.t);
        const i = Math.floor(f), k = f - i;
        const a = d.desplazamiento[i] ?? 0, b = d.desplazamiento[Math.min(i + 1, d.cuadros - 1)] ?? a;
        const s = (a + (b - a) * k) / SQRT2;
        this.pos = { x: this.shot.start.x + this.shot.dir.x * s, y: this.shot.start.y + this.shot.dir.y * s };
      }
      this.fire(before, this.t, d);
      if (this.t >= d.cuadros) {
        const done = this.shot.done;
        this.shot = null;
        this.t = d.cuadros - 1;
        done?.();
      }
      return;
    }
    if (move && move.k > 0 && d.avance) {
      // el ciclo lo mueve la distancia: un ciclo completo cada avance/√2 de mundo
      const speed = this.nativeSpeed(this.anim) * move.k;
      const step = speed * dt;
      this.pos = { x: this.pos.x + move.dir.x * step, y: this.pos.y + move.dir.y * step };
      this.moved = step;
      const dt2 = (step / (d.avance / SQRT2)) * d.cuadros;
      this.t += this.reverse ? -dt2 : dt2;
      this.rate = move.k;
    } else if (move && move.k > 0) {
      // ciclo sin avance (no debería pasar en un kit premium): se mueve a su ritmo y el pie puede patinar
      const step = 20 * move.k * dt;
      this.pos = { x: this.pos.x + move.dir.x * step, y: this.pos.y + move.dir.y * step };
      this.moved = step;
      this.t += dt * d.fps;
      this.rate = 1;
    } else {
      this.t += dt * d.fps;
      this.rate = 1;
    }
    if (this.reverse) this.fireBack(before, this.t, d);
    else this.fire(before, this.t, d);
  }

  /** Avisa los eventos de los cuadros que se cruzaron entre a y b (en ciclos, también al dar la vuelta). */
  private fire(a: number, b: number, d: KitAnim) {
    if (!d.eventos?.length || b <= a) return;
    const name = this.anim;
    for (let c = Math.floor(a) + 1; c <= Math.floor(b); c++) {
      const f = d.loop ? ((c % d.cuadros) + d.cuadros) % d.cuadros : c;
      if (!d.loop && f >= d.cuadros) break;
      for (const e of d.eventos) if (e.cuadro === f) this.onEvent(this, e, name);
    }
  }

  private fireBack(a: number, b: number, d: KitAnim) {
    if (!d.eventos?.length || b >= a) return;
    for (let c = Math.floor(a); c > Math.floor(b); c--) {
      const f = ((c % d.cuadros) + d.cuadros) % d.cuadros;
      for (const e of d.eventos) if (e.cuadro === f && e.tipo === 'paso') this.onEvent(this, e, this.anim);
    }
  }

  /**
   * Dónde está en el mundo un punto del sprite dado en pixeles desde el pivote (la mano que pega).
   * El alto sale directo; de lado, el ancho se lleva hacia donde mira.
   */
  pointToWorld(p: [number, number]): { pos: Vec; z: number } {
    const w = DIR_WORLD[this.facing];
    const across = w.x - w.y;
    const reach = Math.abs(across) > 0.3 ? p[0] / across : 6;
    return { pos: { x: this.pos.x + w.x * reach, y: this.pos.y + w.y * reach }, z: Math.max(0, -p[1] + this.elevation()) };
  }

  draw(g: CanvasRenderingContext2D, cam: Vec, opts: { debug: boolean; tint?: string }) {
    const img = this.sheets.get(this.anim);
    const d = this.def();
    if (!img || !d) return;
    const C = this.cell, [px, py] = this.pivot;
    const s = toScreen(this.pos.x, this.pos.y);
    const gx = Math.round(s.x - cam.x), gy = Math.round(s.y - cam.y);
    const w = this.waterRow();
    const lift = this.elevation();
    // en el agua la fila de la superficie queda en el piso de la piscina; fuera, el pivote
    const top = w !== null && this.inWater ? gy - w : gy - py - Math.round(lift);
    if (w === null || !this.inWater) {
      // sombra: se achica con la altura
      const k = Math.max(0.45, 1 - lift / 50);
      g.fillStyle = 'rgba(8,6,16,0.35)';
      g.beginPath();
      g.ellipse(gx, gy, 7 * k * (C / 48), 2.6 * k * (C / 48), 0, 0, Math.PI * 2);
      g.fill();
    }
    g.drawImage(img, this.frame() * C, this.row * C, C, C, gx - px, top, C, C);
    if (opts.debug) {
      g.strokeStyle = 'rgba(255,138,61,0.8)';
      g.lineWidth = 1;
      g.strokeRect(gx - px + 0.5, top + 0.5, C - 1, C - 1);
      g.fillStyle = '#4ade80';
      g.fillRect(gx - 2, gy, 5, 1); g.fillRect(gx, gy - 2, 1, 5);
    }
  }
}
