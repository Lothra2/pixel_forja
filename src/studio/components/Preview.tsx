import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { FrameSet } from '../protocol';
import type { Key } from '../i18n';
import { PlaybackClock } from '../playback';
import type { T } from './ui';

export type PreviewBg = 'studio' | 'pitch' | 'grass' | 'plain';

/** Fondo de prueba dibujado con código, al tamaño real del cuadro. */
export function backgroundPixels(kind: PreviewBg, cell: number): Uint8ClampedArray<ArrayBuffer> {
  const d = new Uint8ClampedArray(cell * cell * 4);
  // estudio: transparente, se ve el fondo del escenario
  if (kind === 'studio') return d;
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

const SPEEDS = [0.25, 0.5, 1] as const;

/** Cada cuadro en su propio canvas (para dibujar encima del fondo y con transparencia en el papel cebolla). */
function toCanvases(frames: Uint8ClampedArray[], cell: number): HTMLCanvasElement[] {
  return frames.map((f) => {
    const c = document.createElement('canvas');
    c.width = cell; c.height = cell;
    c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(f), cell, cell), 0, 0);
    return c;
  });
}

interface Props {
  clip: FrameSet | undefined;
  /** el mismo clip con el otro perfil, para comparar lado a lado */
  compare?: FrameSet | null;
  bg: PreviewBg;
  zoom: number;
  t: T;
}

export function Preview({ clip, compare, bg, zoom, t }: Props) {
  const big = useRef<HTMLCanvasElement>(null);
  const other = useRef<HTMLCanvasElement>(null);
  const small = useRef<HTMLCanvasElement>(null);
  const small2 = useRef<HTMLCanvasElement>(null);
  const clock = useRef(new PlaybackClock({ frames: 1, fps: 8, loop: true }));
  const clock2 = useRef(new PlaybackClock({ frames: 1, fps: 8, loop: true }));
  const redraw = useRef<() => void>(() => {});
  const loaded = useRef<[FrameSet | null, FrameSet | null]>([null, null]);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<number>(1);
  const [onion, setOnion] = useState(false);

  useEffect(() => {
    if (!clip) return;
    const cell = clip.cell;
    const back = document.createElement('canvas');
    back.width = cell; back.height = cell;
    back.getContext('2d')!.putImageData(new ImageData(backgroundPixels(bg, cell), cell, cell), 0, 0);
    const sprites = toCanvases(clip.frames, cell);
    const sprites2 = compare && compare.cell === cell ? toCanvases(compare.frames, cell) : null;
    const c1 = clock.current, c2 = clock2.current;
    // clip nuevo: empieza de cero y andando. Cambiar el fondo o el papel cebolla no mueve el cuadro
    if (loaded.current[0] !== clip) { c1.load({ frames: clip.frames.length, fps: clip.fps, loop: clip.loop }); c1.playing = true; }
    if (compare && loaded.current[1] !== compare) { c2.load({ frames: compare.frames.length, fps: compare.fps, loop: compare.loop }); c2.seek(Math.round((c1.frame / clip.frames.length) * compare.frames.length)); }
    c2.playing = c1.playing;
    loaded.current = [clip, compare ?? null];
    const main = [big.current, small.current, small2.current].filter(Boolean) as HTMLCanvasElement[];
    [...main, other.current].forEach((c) => { if (c) { c.width = cell; c.height = cell; } });
    const paint = (c: HTMLCanvasElement, list: HTMLCanvasElement[], i: number, ghost: boolean, loop: boolean) => {
      const g = c.getContext('2d')!;
      g.clearRect(0, 0, cell, cell);
      g.drawImage(back, 0, 0);
      if (ghost && list.length > 1 && (i > 0 || loop)) {
        g.globalAlpha = 0.3;
        g.drawImage(list[(i - 1 + list.length) % list.length], 0, 0);
        g.globalAlpha = 1;
      }
      g.drawImage(list[i], 0, 0);
    };
    redraw.current = () => {
      // el papel cebolla solo en el grande: el tamaño real es para ver cómo queda en el juego
      main.forEach((c) => paint(c, sprites, c1.frame, onion && c === big.current, clip.loop));
      if (sprites2 && other.current) paint(other.current, sprites2, c2.frame, onion, compare!.loop);
      setFrame(c1.frame);
      setPlaying(c1.playing);
    };
    redraw.current();
    let last = performance.now(), raf = 0;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      const a = c1.tick(dt), b = sprites2 ? c2.tick(dt) : false;
      if (a || b) redraw.current();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [clip, compare, bg, onion]);

  if (!clip) return null;
  const n = clip.frames.length;
  const both = (fn: (c: PlaybackClock) => void) => { fn(clock.current); fn(clock2.current); redraw.current(); };
  const toggle = () => both((c) => { c.toggle(); c.playing = clock.current.playing; });
  const step = (d: 1 | -1) => {
    clock.current.step(d);
    // el comparado va a la misma altura del ciclo (pueden tener distinta cantidad de cuadros)
    const c2 = clock2.current;
    c2.playing = false;
    c2.seek(Math.round((clock.current.frame / n) * c2.timing.frames));
    redraw.current();
  };
  const seek = (i: number) => both((c) => { c.playing = false; c.seek(c === clock.current ? i : Math.round((i / n) * c.timing.frames)); });
  const setRate = (s: number) => { setSpeed(s); clock.current.speed = s; clock2.current.speed = s; };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === ' ') { e.preventDefault(); toggle(); }
    else if (e.key === 'ArrowLeft' || e.key === ',') { e.preventDefault(); step(-1); }
    else if (e.key === 'ArrowRight' || e.key === '.') { e.preventDefault(); step(1); }
  };
  const evAt = (i: number) => clip.events?.filter((e) => e.frame === i) ?? [];
  const now = evAt(frame);
  const premiumLabel = (p: FrameSet['profile']) => t(p === 'premium' ? 'motion_premium' : 'motion_classic');
  const w = clip.cell * zoom;

  return (
    <div className="preview-box" tabIndex={0} onKeyDown={onKey} aria-label={t('pb_keys')}>
      <div className="preview">
        <div className={compare ? 'pair' : 'solo'}>
          <figure>
            <canvas ref={big} className="pixel" data-testid="preview-big" style={{ width: w, height: w }} />
            <figcaption>{compare ? premiumLabel(clip.profile) : `${t('zoomed')} ×${zoom}`}</figcaption>
          </figure>
          {compare && (
            <figure>
              <canvas ref={other} className="pixel" data-testid="preview-compare" style={{ width: w, height: w }} />
              <figcaption>{premiumLabel(compare.profile)}</figcaption>
            </figure>
          )}
        </div>
        <div className="preview-real">
          <figure>
            <canvas ref={small} className="pixel" style={{ width: clip.cell, height: clip.cell }} />
            <figcaption>{t('realSize')}</figcaption>
          </figure>
          <figure>
            <canvas ref={small2} className="pixel" style={{ width: clip.cell * 2, height: clip.cell * 2 }} />
            <figcaption>×2</figcaption>
          </figure>
        </div>
        {now.length > 0 && <span className={`ev-flash ev-${now[0].type}`} data-testid="event-flash">{t(`ev_${now[0].type}` as Key)}</span>}
      </div>
      <div className="transport">
        <button className="tbtn" onClick={() => step(-1)} aria-label={t('pb_prev')} title={t('pb_prev')}>◀︎◀︎</button>
        <button className="tbtn play" onClick={toggle} aria-label={playing ? t('pb_pause') : t('pb_play')} title={playing ? t('pb_pause') : t('pb_play')} data-testid="pb-toggle">{playing ? '❚❚' : '▶︎'}</button>
        <button className="tbtn" onClick={() => step(1)} aria-label={t('pb_next')} title={t('pb_next')}>▶︎▶︎</button>
        <div className="pb-timeline" role="group" aria-label={t('pb_frame')} data-testid="pb-timeline">
          {Array.from({ length: n }, (_, i) => {
            const ev = evAt(i);
            return (
              <button key={i} className={`tl${i === frame ? ' on' : ''}`} onClick={() => seek(i)} aria-label={`${t('pb_frame')} ${i + 1}${ev.length ? `: ${ev.map((e) => t(`ev_${e.type}` as Key)).join(', ')}` : ''}`}>
                {ev.map((e, k) => <i key={k} className={`ev-dot ev-${e.type}`} />)}
              </button>
            );
          })}
        </div>
        <span className="tl-count" data-testid="frame-count">{frame + 1}/{n}</span>
        <div className="seg speed" aria-label={t('pb_speed')}>
          {SPEEDS.map((s) => <button key={s} className={speed === s ? 'on' : ''} aria-pressed={speed === s} onClick={() => setRate(s)}>{s === 1 ? '1×' : s === 0.5 ? '½×' : '¼×'}</button>)}
        </div>
        <button className={`tbtn onion${onion ? ' on' : ''}`} aria-pressed={onion} onClick={() => setOnion(!onion)} title={t('ed_onion')}>{t('ed_onion')}</button>
      </div>
    </div>
  );
}
