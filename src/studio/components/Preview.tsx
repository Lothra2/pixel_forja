import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { ClipData, FrameSet } from '../protocol';
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

/** Colores de "Ver datos" (los mismos en la leyenda). */
export const DATA_COLORS = { caja: '#4cc3ff', cuerpo: '#b388ff', mano: '#ff4d6d', manoLejos: '#ffa3b5', cabeza: '#ffd23f', pie: '#3ddc84', pieLejos: '#a8f0c6', punto: '#ffffff', carga: '#ff9f1c', arma: '#00e5c7' } as const;

/**
 * Dibuja los datos de un cuadro encima del sprite, en pixeles de la celda: la caja de lo opaco, las manos, la cabeza,
 * los pies y el punto del golpe. (ox, oy) es dónde cae el pivote en el lienzo.
 */
function paintData(g: CanvasRenderingContext2D, d: ClipData, i: number, ox: number, oy: number) {
  const dot = (p: [number, number] | undefined, color: string) => { if (p) { g.fillStyle = color; g.fillRect(ox + p[0], oy + p[1], 1, 1); } };
  const box = d.cajas[i];
  if (box) {
    g.strokeStyle = DATA_COLORS.caja;
    g.globalAlpha = 0.85;
    g.lineWidth = 1;
    g.strokeRect(ox + box[0] + 0.5, oy + box[1] + 0.5, box[2] - 1, box[3] - 1);
    g.globalAlpha = 1;
  }
  const body = d.cuerpo?.[i];
  if (body) {
    // el cuerpo (hurtbox) con línea de puntos, para distinguirlo de la caja
    g.fillStyle = DATA_COLORS.cuerpo;
    const [x0, y0, w, h] = [ox + body[0], oy + body[1], body[2], body[3]];
    for (let k = 0; k < w; k += 2) { g.fillRect(x0 + k, y0, 1, 1); g.fillRect(x0 + k, y0 + h - 1, 1, 1); }
    for (let k = 0; k < h; k += 2) { g.fillRect(x0, y0 + k, 1, 1); g.fillRect(x0 + w - 1, y0 + k, 1, 1); }
  }
  const load = d.carga?.[i];
  if (load) { g.fillStyle = DATA_COLORS.carga; g.fillRect(ox + load[0] - 2, oy + load[1], 5, 1); }
  const weapon = d.arma?.[i];
  if (weapon) {
    // el agarre y hacia dónde apunta el arma
    g.fillStyle = DATA_COLORS.arma;
    const a = (weapon[2] * Math.PI) / 180;
    for (let k = 0; k <= 5; k++) g.fillRect(Math.round(ox + weapon[0] + Math.cos(a) * k), Math.round(oy + weapon[1] + Math.sin(a) * k), 1, 1);
  }
  dot(d.manos?.[i][1], DATA_COLORS.manoLejos);
  dot(d.pies?.[i][1], DATA_COLORS.pieLejos);
  dot(d.manos?.[i][0], DATA_COLORS.mano);
  dot(d.pies?.[i][0], DATA_COLORS.pie);
  dot(d.cabeza?.[i], DATA_COLORS.cabeza);
  for (const p of d.puntos) if (p.frame === i) {
    g.fillStyle = DATA_COLORS.punto;
    const [x, y] = [ox + p.at[0], oy + p.at[1]];
    g.fillRect(x - 2, y, 5, 1);
    g.fillRect(x, y - 2, 1, 5);
  }
}

/** Lo más alto que sube el sprite en el clip (o en el comparado). */
const liftOf = (a?: FrameSet | null, b?: FrameSet | null) => Math.max(0, ...(a?.rise ?? []), ...(b?.rise ?? []));

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
  const [showData, setShowData] = useState(false);

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
    // saltos que no caben en la celda: el lienzo crece hacia arriba y el sprite sube sobre su sombra, como en el juego
    const lift = liftOf(clip, compare);
    [...main, other.current].forEach((c) => { if (c) { c.width = cell; c.height = cell + lift; } });
    const paint = (c: HTMLCanvasElement, list: HTMLCanvasElement[], i: number, ghost: boolean, loop: boolean, rise: number[] | undefined, data?: ClipData) => {
      const g = c.getContext('2d')!;
      const r = rise?.[i] ?? 0;
      g.clearRect(0, 0, cell, cell + lift);
      g.drawImage(back, 0, lift);
      if (lift) {
        // sombra en el piso: más chica y más clara cuanto más alto va
        const k = 1 - Math.min(0.6, r / (lift + cell * 0.25));
        const rw = Math.max(2, Math.round(cell * 0.2 * k)), ry = Math.max(1, Math.round(cell * 0.04 * k));
        const cx = cell / 2, cy = lift + cell - 2;
        g.fillStyle = `rgba(0,0,0,${(0.16 + 0.22 * k).toFixed(2)})`;
        for (let y = -ry; y <= ry; y++) { const half = Math.round(rw * Math.sqrt(1 - (y * y) / ((ry + 0.5) * (ry + 0.5)))); g.fillRect(cx - half, cy + y, half * 2, 1); }
      }
      if (ghost && list.length > 1 && (i > 0 || loop)) {
        g.globalAlpha = 0.3;
        const j = (i - 1 + list.length) % list.length;
        g.drawImage(list[j], 0, lift - (rise?.[j] ?? 0));
        g.globalAlpha = 1;
      }
      g.drawImage(list[i], 0, lift - r);
      if (data) paintData(g, data, i, cell / 2, lift - r + cell - 2);
    };
    redraw.current = () => {
      // el papel cebolla solo en el grande: el tamaño real es para ver cómo queda en el juego
      // los datos, como el papel cebolla, solo en el grande
      main.forEach((c) => paint(c, sprites, c1.frame, onion && c === big.current, clip.loop, clip.rise, showData && c === big.current ? clip.data : undefined));
      if (sprites2 && other.current) paint(other.current, sprites2, c2.frame, onion, compare!.loop, compare!.rise, showData ? compare!.data : undefined);
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
  }, [clip, compare, bg, onion, showData]);

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
  // con saltos el lienzo es más alto que ancho
  const lift = liftOf(clip, compare);
  const box = (width: number) => ({ width, height: (width * (clip.cell + lift)) / clip.cell, aspectRatio: `${clip.cell} / ${clip.cell + lift}` });

  return (
    <div className="preview-box" tabIndex={0} onKeyDown={onKey} aria-label={t('pb_keys')}>
      <div className="preview">
        <div className={compare ? 'pair' : 'solo'}>
          <figure>
            <canvas ref={big} className="pixel" data-testid="preview-big" style={box(w)} />
            <figcaption>{compare ? premiumLabel(clip.profile) : `${t('zoomed')} ×${zoom}`}</figcaption>
          </figure>
          {compare && (
            <figure>
              <canvas ref={other} className="pixel" data-testid="preview-compare" style={box(w)} />
              <figcaption>{premiumLabel(compare.profile)}</figcaption>
            </figure>
          )}
        </div>
        <div className="preview-real">
          <figure>
            <canvas ref={small} className="pixel" style={box(clip.cell)} />
            <figcaption>{t('realSize')}</figcaption>
          </figure>
          <figure>
            <canvas ref={small2} className="pixel" style={box(clip.cell * 2)} />
            <figcaption>×2</figcaption>
          </figure>
        </div>
        {now.length > 0 && <span className={`ev-flash ev-${now[0].type}`} data-testid="event-flash">{t(`ev_${now[0].type}` as Key)}</span>}
      </div>
      {showData && (
        <ul className="data-legend" data-testid="data-legend">
          {([['caja', 'data_box'], ['cuerpo', 'data_body'], ['mano', 'data_hands'], ['cabeza', 'data_head'], ['pie', 'data_feet'], ['punto', 'data_point'], ['carga', 'data_load'], ['arma', 'data_weapon']] as const).filter(([c]) => (c !== 'carga' || clip.data?.carga) && (c !== 'arma' || clip.data?.arma)).map(([c, k]) => (
            <li key={c}><i style={{ background: DATA_COLORS[c] }} />{t(k)}</li>
          ))}
          {clip.data?.cajas[frame] && <li className="muted" data-testid="data-box">{t('data_box')}: [{clip.data.cajas[frame]!.join(', ')}]</li>}
        </ul>
      )}
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
        <button className={`tbtn onion${showData ? ' on' : ''}`} aria-pressed={showData} onClick={() => setShowData(!showData)} title={t('data_help')} data-testid="show-data">{t('data_show')}</button>
      </div>
    </div>
  );
}
