import { useEffect, useMemo, useRef, useState } from 'react';
import boldUrl from '@fontsource/silkscreen/files/silkscreen-latin-700-normal.woff?url';
import { retroUi, gameLogo, type UiPiece } from '../../engine/ui/retro';
import { effectSheet } from '../../engine/fx/catalog';
import { encodePng, type Raster } from '../../engine/index';
import type { T } from '../components/ui';
import { downloadFiles } from '../util';

const img = (r: Raster) => new ImageData(new Uint8ClampedArray(r.data), r.w, r.h);

/** Un lienzo animado con los cuadros dados (un solo cuadro: quieto). */
function Anim({ frames, fps = 8, zoom = 2, testid }: { frames: Raster[]; fps?: number; zoom?: number; testid?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || !frames.length) return;
    c.width = frames[0].w; c.height = frames[0].h;
    const g = c.getContext('2d')!;
    const ims = frames.map(img);
    g.putImageData(ims[0], 0, 0);
    if (ims.length < 2) return;
    let k = 0;
    const id = setInterval(() => { k = (k + 1) % ims.length; g.putImageData(ims[k], 0, 0); }, 1000 / fps);
    return () => clearInterval(id);
  }, [frames, fps]);
  return <canvas ref={ref} className="pixel" style={{ width: (frames[0]?.w ?? 0) * zoom, height: (frames[0]?.h ?? 0) * zoom }} data-testid={testid} />;
}

/** Estira una pieza 9-slice a w x h, como lo haría el juego. */
function nineSlice(p: UiPiece, w: number, h: number): ImageData {
  const [l, t, r, b] = p.nueve!, src = p.frames[0], out = new ImageData(w, h);
  const map = (v: number, size: number, a: number, z: number, srcSize: number) => (v < a ? v : v >= size - z ? srcSize - (size - v) : a + ((v - a) % (srcSize - a - z)));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = map(x, w, l, r, src.w), sy = map(y, h, t, b, src.h), si = (sy * src.w + sx) * 4, di = (y * w + x) * 4;
    out.data.set(src.data.subarray(si, si + 4), di);
  }
  return out;
}

/** La caja de diálogo armada: 9-slice estirada, el marco del retrato y la flecha que titila. */
function DialogDemo({ pieces }: { pieces: UiPiece[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current, box = pieces.find((p) => p.name === 'dialogo'), arrow = pieces.find((p) => p.name === 'dialogo_flecha'), frame = pieces.find((p) => p.name === 'marco_retrato_40');
    if (!c || !box || !arrow || !frame) return;
    const W = 280, H = 64;
    c.width = W; c.height = H;
    const g = c.getContext('2d')!;
    const base = document.createElement('canvas');
    base.width = W; base.height = H;
    const bg = base.getContext('2d')!;
    bg.putImageData(nineSlice(box, W, H), 0, 0);
    const fc = document.createElement('canvas');
    fc.width = frame.w; fc.height = frame.h; fc.getContext('2d')!.putImageData(img(frame.frames[0]), 0, 0);
    bg.drawImage(fc, 8, 8);
    bg.fillStyle = '#ffffff';
    for (let i = 0; i < 3; i++) bg.fillRect(64, 16 + i * 12, 170 - i * 40, 3);
    const arr = arrow.frames.map((f) => { const a = document.createElement('canvas'); a.width = f.w; a.height = f.h; a.getContext('2d')!.putImageData(img(f), 0, 0); return a; });
    let k = 0;
    const draw = () => { g.clearRect(0, 0, W, H); g.drawImage(base, 0, 0); g.drawImage(arr[k], W - 18, H - 16); k = (k + 1) % arr.length; };
    draw();
    const id = setInterval(draw, 250);
    return () => clearInterval(id);
  }, [pieces]);
  return <canvas ref={ref} className="pixel" style={{ width: 560, maxWidth: '100%', height: 'auto', aspectRatio: '280 / 64' }} data-testid="ui-dialog-demo" />;
}

/** Interfaz del juego: el logo a partir del texto, la caja de diálogo armada y todas las piezas retro, con descarga. */
export function InterfaceStep({ t }: { t: T }) {
  const [bold, setBold] = useState<ArrayBuffer | null>(null);
  const [text, setText] = useState('PIXEL FORJA ARENA');
  useEffect(() => {
    let alive = true;
    fetch(boldUrl).then((r) => r.arrayBuffer()).then((b) => { if (alive) setBold(b); });
    return () => { alive = false; };
  }, []);
  const pieces = useMemo(() => (bold ? retroUi(bold) : []), [bold]);
  const logo = useMemo(() => (bold && text.trim() ? gameLogo(bold, text, 320, 112) : []), [bold, text]);
  const small = useMemo(() => (bold && text.trim() ? gameLogo(bold, text, 160, 56) : []), [bold, text]);
  const doExport = () => {
    const files: { name: string; bytes: Uint8Array; mime: string }[] = [];
    const meta: Record<string, unknown> = {};
    const put = (name: string, frames: Raster[], extra: Record<string, unknown> = {}) => {
      const { sheet, columnas } = effectSheet(frames, frames[0].w, frames[0].h);
      files.push({ name: `ui/${name}.png`, bytes: encodePng(sheet), mime: 'image/png' });
      meta[name] = { archivo: `ui/${name}.png`, w: frames[0].w, h: frames[0].h, ...(frames.length > 1 ? { cuadros: frames.length, columnas } : {}), ...extra };
    };
    if (logo.length) { put('logo', logo, { fps: 10 }); put('logo_chico', small, { fps: 10 }); }
    for (const p of pieces) put(p.name, p.frames, { ...(p.fps ? { fps: p.fps } : {}), ...(p.nueve ? { nueve: p.nueve } : {}), ...(p.tres ? { tres: p.tres } : {}), ...(p.extra ?? {}) });
    files.push({ name: 'interfaz.json', bytes: new TextEncoder().encode(JSON.stringify({ generado_con: 'PixelForja', ui: meta }, null, 1)), mime: 'application/json' });
    downloadFiles(files, 'interfaz.zip');
  };
  return (
    <>
      <section className="panel stage-wrap">
        <div className="ui-stage" data-testid="ui-stage">
          {!bold ? <p className="muted">{t('fonts_loading')}</p> : (
            <>
              <div className="ui-row">{logo.length > 0 && <Anim frames={logo} fps={10} testid="ui-logo" />}{small.length > 0 && <Anim frames={small} fps={10} />}</div>
              <DialogDemo pieces={pieces} />
              <div className="ui-grid">
                {pieces.map((p) => (
                  <figure key={p.name} className="ui-piece" data-testid={`ui-${p.name}`}>
                    <Anim frames={p.frames} fps={p.fps ?? 2} zoom={p.w <= 16 ? 4 : p.w > 120 ? 1 : 2} />
                    <figcaption className="muted small">{p.name}{p.nueve ? ' · 9-slice' : p.tres ? ' · 3-slice' : ''}</figcaption>
                  </figure>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
      <aside className="panel side">
        <label className="field">{t('ui_logoText')}<input value={text} onChange={(e) => setText(e.target.value)} data-testid="ui-logo-text" /></label>
        <p className="muted small">{t('ui_help')}</p>
        <p className="muted small" data-testid="ui-count">{pieces.length} {t('ui_pieces')}</p>
        <button className="btn primary" onClick={doExport} disabled={!bold} data-testid="ui-export">{t('ui_export')}</button>
      </aside>
    </>
  );
}
