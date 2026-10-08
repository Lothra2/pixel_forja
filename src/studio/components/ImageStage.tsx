import { useEffect, useRef, useState } from 'react';
import type { AnalyzeResult } from '../protocol';
import { ZONES, type HeadSpec, type Point } from '../../engine/index';

export const ZONE_COLORS: Record<string, [number, number, number]> = {
  hair: [150, 90, 40], skin: [255, 196, 150], face: [255, 0, 200], top: [50, 120, 255], bottom: [30, 50, 150],
  socks: [245, 245, 245], shoes: [70, 70, 80], accessory: [255, 215, 0], line: [20, 20, 20], beard: [0, 190, 120],
};

export type StageMode = 'bg' | 'zones' | 'head' | 'plain';

interface Props {
  a: AnalyzeResult;
  mode: StageMode;
  head?: HeadSpec;
  brushR?: number;
  onDown?: (p: Point) => void;
  onDrag?: (p: Point, start: Point) => void;
  onUp?: (p: Point, start: Point) => void;
}

function checker(x: number, y: number) {
  return ((x >> 3) + (y >> 3)) & 1 ? 205 : 230;
}

/** Muestra la imagen de trabajo con la capa del paso actual y traduce los toques a coordenadas de la imagen. */
export function ImageStage({ a, mode, head, brushR, onDown, onDrag, onUp }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const start = useRef<Point | null>(null);
  const [cursor, setCursor] = useState<Point | null>(null);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    c.width = a.w;
    c.height = a.h;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(a.w, a.h);
    const d = img.data;
    for (let i = 0; i < a.w * a.h; i++) {
      const x = i % a.w, y = (i / a.w) | 0;
      const o = i * 4;
      const al = a.rgba[o + 3] / 255;
      const ck = checker(x, y);
      let r = a.rgba[o] * al + ck * (1 - al), g = a.rgba[o + 1] * al + ck * (1 - al), b = a.rgba[o + 2] * al + ck * (1 - al);
      if (mode !== 'plain' && !a.mask[i]) {
        r = g = b = ck;
      } else if (mode === 'zones') {
        const zc = ZONE_COLORS[ZONES[a.zone[i]]];
        if (zc) { r = r * 0.35 + zc[0] * 0.65; g = g * 0.35 + zc[1] * 0.65; b = b * 0.35 + zc[2] * 0.65; }
      }
      d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, [a, mode]);

  const toImage = (e: React.PointerEvent): Point => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * a.w, y: ((e.clientY - r.top) / r.height) * a.h };
  };

  return (
    <div className="stage" style={{ aspectRatio: `${a.w} / ${a.h}`, maxWidth: `min(100%, calc(var(--stage-h) * ${a.w / a.h}))` }}>
      <canvas ref={canvas} className="stage-canvas" />
      <svg
        className="stage-overlay"
        viewBox={`0 0 ${a.w} ${a.h}`}
        data-testid="stage"
        onPointerDown={(e) => {
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
          const p = toImage(e);
          start.current = p;
          onDown?.(p);
        }}
        onPointerMove={(e) => {
          const p = toImage(e);
          setCursor(p);
          if (start.current) onDrag?.(p, start.current);
        }}
        onPointerUp={(e) => {
          if (start.current) onUp?.(toImage(e), start.current);
          start.current = null;
        }}
        onPointerLeave={() => setCursor(null)}
      >
        {head && mode === 'head' && (
          <g>
            <rect x={head.box.x} y={head.box.y} width={head.box.w} height={head.box.h} className="head-box" />
            {head.eyes.map((e, i) => (
              <g key={i} className="eye-mark">
                <circle cx={e.x} cy={e.y} r={Math.max(3, a.w / 90)} />
                <line x1={e.x - 8} y1={e.y} x2={e.x + 8} y2={e.y} />
                <line x1={e.x} y1={e.y - 8} x2={e.x} y2={e.y + 8} />
              </g>
            ))}
          </g>
        )}
        {cursor && brushR && <circle cx={cursor.x} cy={cursor.y} r={brushR} className="brush-cursor" />}
      </svg>
    </div>
  );
}
