import { useEffect, useRef } from 'react';
import type { FrameSet } from '../protocol';

/** Orden de las direcciones para el giro de la vitrina: en el sentido de las agujas del reloj desde abajo. */
export const SHOW_DIRS = ['front', 'sw', 'left', 'nw', 'back', 'ne', 'side', 'se'] as const;

const W = 168, H = 134;
const TILE_W = 32, TILE_H = 16;

/** Piso isométrico de baldosas, dibujado a mano con pixeles (sin suavizado). */
function drawFloor(ctx: CanvasRenderingContext2D) {
  const img = ctx.createImageData(W, H);
  const cx = W / 2, cy = 92;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      // coordenadas de la rejilla isométrica
      const u = (x - cx) / TILE_W + (y - cy) / TILE_H;
      const v = (y - cy) / TILE_H - (x - cx) / TILE_W;
      const r = Math.hypot((x - cx) / 1.0, (y - cy) * 2);
      if (r > 80) continue;
      const fade = Math.max(0, 1 - r / 80);
      const fu = u - Math.floor(u), fv = v - Math.floor(v);
      const edge = fu < 0.06 || fv < 0.06;
      const checker = (Math.floor(u) + Math.floor(v)) & 1;
      const base = checker ? [44, 37, 72] : [38, 32, 62];
      const c = edge ? [70, 60, 112] : base;
      const a = Math.round(255 * Math.min(1, fade * 1.6));
      const i = (y * W + x) * 4;
      img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = a;
    }
  ctx.putImageData(img, 0, 0);
}

interface Props {
  /** por personaje, un clip por dirección (en el orden de SHOW_DIRS) */
  cast: (FrameSet | undefined)[][];
  label: string;
}

/** Vitrina de la portada: personajes caminando sobre un piso isométrico, girando por las 8 direcciones. */
export function Showcase({ cast, label }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dirRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    const floor = document.createElement('canvas');
    floor.width = W; floor.height = H;
    drawFloor(floor.getContext('2d')!);
    // cada cuadro a un canvas chico, para dibujar con drawImage (respeta la transparencia)
    const sprites = cast.map((dirs) => dirs.map((clip) => clip?.frames.map((f) => {
      const c = document.createElement('canvas');
      c.width = clip.cell; c.height = clip.cell;
      c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(f), clip.cell, clip.cell), 0, 0);
      return c;
    })));
    const spots: [number, number][] = [[42, 100], [84, 110], [126, 100]];
    let raf = 0;
    const start = performance.now();
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const tick = (t: number) => {
      // el primer cuadro de requestAnimationFrame puede traer un tiempo anterior a start
      const el = Math.max(0, (t - start) / 1000);
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(floor, 0, 0);
      const step = reduced ? 7 : Math.floor(el / 1.6);
      // de atrás hacia adelante: el del medio va más cerca
      [0, 2, 1].forEach((k) => {
        const dirs = sprites[k];
        if (!dirs) return;
        const di = (step + k * 3) % SHOW_DIRS.length;
        const frames = dirs[di] ?? dirs.find(Boolean);
        if (!frames?.length) return;
        const clip = cast[k][di] ?? cast[k].find(Boolean)!;
        const fi = reduced ? 0 : Math.floor(el * clip.fps) % frames.length;
        const [x, y] = spots[k];
        const f = frames[fi];
        // sombra en el piso
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(x - 9, y - 2, 18, 3);
        ctx.fillRect(x - 6, y - 3, 12, 5);
        ctx.drawImage(f, Math.round(x - f.width / 2), Math.round(y - f.height + 2));
      });
      if (dirRef.current) dirRef.current.textContent = `${(step % 8) + 1}/8`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cast]);

  return (
    <div className="showcase" data-testid="showcase">
      <canvas ref={ref} aria-label={label} role="img" />
      <span className="tag">{label}</span>
      <span className="dirs" ref={dirRef}>1/8</span>
    </div>
  );
}
