import { useEffect, useRef } from 'react';
import type { FrameSet } from '../protocol';

export type PreviewBg = 'pitch' | 'grass' | 'plain';

/** Fondo de prueba dibujado con código, al tamaño real del cuadro. */
export function backgroundPixels(kind: PreviewBg, cell: number): Uint8ClampedArray {
  const d = new Uint8ClampedArray(cell * cell * 4);
  for (let y = 0; y < cell; y++)
    for (let x = 0; x < cell; x++) {
      let c: [number, number, number];
      if (kind === 'plain') c = [233, 230, 242];
      else if (kind === 'pitch') {
        c = (x >> 3) & 1 ? [86, 160, 74] : [95, 172, 80];
        if (y === cell - 1) c = [238, 242, 236];
      } else {
        c = [124, 194, 95];
        const n = (x * 73856093) ^ (y * 19349663);
        if ((n & 31) === 0) c = [96, 160, 70];
        else if ((n & 63) === 7) c = [150, 214, 116];
      }
      d.set([c[0], c[1], c[2], 255], (y * cell + x) * 4);
    }
  return d;
}

interface Props {
  clip: FrameSet | undefined;
  bg: PreviewBg;
  zoom: number;
  labels: { real: string; zoomed: string };
}

export function Preview({ clip, bg, zoom, labels }: Props) {
  const big = useRef<HTMLCanvasElement>(null);
  const small = useRef<HTMLCanvasElement>(null);
  const small2 = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!clip) return;
    const cell = clip.cell;
    const back = backgroundPixels(bg, cell);
    const frames = clip.frames.map((f) => {
      const out = new Uint8ClampedArray(back);
      for (let i = 0; i < cell * cell; i++) if (f[i * 4 + 3]) out.set(f.subarray(i * 4, i * 4 + 4), i * 4);
      return new ImageData(out, cell, cell);
    });
    const canvases = [big.current, small.current, small2.current].filter(Boolean) as HTMLCanvasElement[];
    canvases.forEach((c) => { c.width = cell; c.height = cell; });
    let i = 0, last = 0, raf = 0;
    const tick = (t: number) => {
      if (t - last >= 1000 / clip.fps) {
        last = t;
        canvases.forEach((c) => c.getContext('2d')!.putImageData(frames[i], 0, 0));
        i = (i + 1) % frames.length;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [clip, bg]);

  if (!clip) return null;
  return (
    <div className="preview">
      <figure>
        <canvas ref={big} className="pixel" data-testid="preview-big" style={{ width: clip.cell * zoom, height: clip.cell * zoom }} />
        <figcaption>{labels.zoomed} ×{zoom}</figcaption>
      </figure>
      <div className="preview-real">
        <figure>
          <canvas ref={small} className="pixel" style={{ width: clip.cell, height: clip.cell }} />
          <figcaption>{labels.real}</figcaption>
        </figure>
        <figure>
          <canvas ref={small2} className="pixel" style={{ width: clip.cell * 2, height: clip.cell * 2 }} />
          <figcaption>×2</figcaption>
        </figure>
      </div>
    </div>
  );
}
