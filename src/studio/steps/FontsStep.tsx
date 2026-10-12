import { useEffect, useRef, useState } from 'react';
import regularUrl from '@fontsource/silkscreen/files/silkscreen-latin-400-normal.woff?url';
import boldUrl from '@fontsource/silkscreen/files/silkscreen-latin-700-normal.woff?url';
import { bitmapFonts, drawText, VIETNAMESE_CHARS, type BitmapFont } from '../../engine/ui/fonts';
import { encodePng, type Raster } from '../../engine/index';
import type { T } from '../components/ui';
import { Seg } from '../components/ui';
import { downloadFiles } from '../util';

/** Un texto escrito con una fuente bitmap, en un lienzo sin suavizar. */
function TextCanvas({ r, zoom, testid }: { r: Raster; zoom: number; testid?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = r.w; c.height = r.h;
    c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(r.data), r.w, r.h), 0, 0);
  }, [r]);
  return <canvas ref={ref} className="pixel" style={{ width: r.w * zoom, height: r.h * zoom }} data-testid={testid} />;
}

/** Fuentes del juego: escribir un texto y verlo en las tres fuentes bitmap (con vietnamita), y descargarlas. */
export function FontsStep({ t }: { t: T }) {
  const [fonts, setFonts] = useState<BitmapFont[] | null>(null);
  const [text, setText] = useState('Rồng Sài Gòn · Đá cầu · Bà Hoa · Tuấn · Trời ơi');
  const [zoom, setZoom] = useState('2');
  useEffect(() => {
    let alive = true;
    Promise.all([fetch(regularUrl).then((r) => r.arrayBuffer()), fetch(boldUrl).then((r) => r.arrayBuffer())])
      .then(([a, b]) => { if (alive) setFonts(bitmapFonts(a, b)); });
    return () => { alive = false; };
  }, []);
  const enc = new TextEncoder();
  const doExport = () => fonts && downloadFiles(fonts.flatMap((f) => [
    { name: `${f.name}.png`, bytes: encodePng(f.png), mime: 'image/png' },
    { name: `${f.name}.fnt`, bytes: enc.encode(f.fnt), mime: 'application/xml' },
  ]), 'fuentes.zip');
  return (
    <>
      <section className="panel stage-wrap">
        <div className="fonts-stage" data-testid="fonts-preview">
          {fonts ? fonts.map((f, i) => (
            <div key={f.name} className="font-row">
              <span className="muted small">{f.name}</span>
              <TextCanvas r={drawText(f, text || ' ')} zoom={i === 0 ? +zoom * 2 : +zoom} testid={`font-${f.name}`} />
            </div>
          )) : <p className="muted">{t('fonts_loading')}</p>}
        </div>
      </section>
      <aside className="panel side">
        <label className="field">
          {t('fonts_text')}
          <input value={text} onChange={(e) => setText(e.target.value)} data-testid="fonts-text" />
        </label>
        <Seg label={t('fonts_zoom')} value={zoom} set={setZoom} opts={[['1', '1x'], ['2', '2x'], ['3', '3x']]} />
        <p className="muted small">{t('fonts_help')}</p>
        <p className="muted small fonts-viet" data-testid="fonts-viet">{VIETNAMESE_CHARS}</p>
        <button className="btn primary" onClick={doExport} disabled={!fonts} data-testid="fonts-export">{t('fonts_export')}</button>
      </aside>
    </>
  );
}
