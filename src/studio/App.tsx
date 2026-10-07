import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Engine } from './client';
import { translator, type Lang, type Key } from './i18n';
import type { AnalyzeParams, AnalyzeResult, FrameSet } from './protocol';
import { ImageStage, ZONE_COLORS } from './components/ImageStage';
import { Preview, type PreviewBg } from './components/Preview';
import {
  type Ficha, type CellSize, type HeadSpec, type Point, type Zone, type QAReport, type ColorSlot,
  DEFAULT_BG_TOLERANCE, validateFicha, migrateFicha, recolor, BASE,
} from '../engine/index';

const STEPS = ['image', 'bg', 'zones', 'head', 'style', 'preview', 'export'] as const;
type Step = (typeof STEPS)[number];
const EDIT_ZONES: Zone[] = ['hair', 'skin', 'face', 'top', 'bottom', 'socks', 'shoes', 'accessory', 'line'];
const SAMPLES = ['sofi', 'gabo', 'papa'];

function storedLang(): Lang {
  try {
    const v = localStorage.getItem('pf.lang');
    if (v === 'es' || v === 'en') return v;
  } catch { /* sin almacenamiento */ }
  return navigator.language?.startsWith('en') ? 'en' : 'es';
}

function download(name: string, bytes: Uint8Array | string, mime: string) {
  const blob = new Blob([bytes as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function fileToRequest(file: Blob): Promise<{ png?: Uint8Array; rgba?: Uint8ClampedArray; w?: number; h?: number }> {
  const buf = new Uint8Array(await file.arrayBuffer());
  // PNG: se decodifica con el mismo código que la línea de comandos (mismos pixeles)
  if (buf[0] === 0x89 && buf[1] === 0x50) return { png: buf };
  const bmp = await createImageBitmap(file);
  const c = new OffscreenCanvas(bmp.width, bmp.height);
  const ctx = c.getContext('2d')!;
  ctx.drawImage(bmp, 0, 0);
  const d = ctx.getImageData(0, 0, bmp.width, bmp.height);
  return { rgba: d.data, w: d.width, h: d.height };
}

export function App() {
  const engine = useMemo(() => new Engine(), []);
  const [lang, setLang] = useState<Lang>(storedLang);
  const t = useMemo(() => translator(lang), [lang]);
  const [step, setStep] = useState<Step>('image');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('personaje');

  const [params, setParams] = useState<AnalyzeParams>({ bgTolerance: DEFAULT_BG_TOLERANCE, bgStrokes: [], zoneEdits: [] });
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [cell, setCell] = useState<CellSize>(48);
  const [clips, setClips] = useState<FrameSet[]>([]);
  const [qa, setQa] = useState<QAReport[]>([]);
  const [anim, setAnim] = useState('walk');
  const [bg, setBg] = useState<PreviewBg>('pitch');

  const [bgBrush, setBgBrush] = useState<'fg' | 'bg'>('fg');
  const [brushR, setBrushR] = useState(6);
  const [zoneSel, setZoneSel] = useState<Zone>('hair');
  const [zoneTool, setZoneTool] = useState<'wand' | 'brush'>('wand');
  const [headTool, setHeadTool] = useState<'box' | 'eyes'>('box');
  const [dragBox, setDragBox] = useState<HeadSpec | null>(null);
  const pendingEye = useRef<Point | null>(null);
  /** lo que el usuario cambió a mano en ropa, cara y colores: sobrevive a reconstruir la ficha */
  const overrides = useRef<{ outfit: Partial<Ficha['outfit']>; face: Partial<Ficha['face']>; colors: Partial<Record<ColorSlot, string>> }>({ outfit: {}, face: {}, colors: {} });

  useEffect(() => {
    try { localStorage.setItem('pf.lang', lang); } catch { /* sin almacenamiento */ }
    document.documentElement.lang = lang;
  }, [lang]);

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  // análisis: cada vez que cambian fondo, cabeza o zonas
  useEffect(() => {
    if (!loaded) return;
    const id = setTimeout(() => {
      run(async () => {
        const r = await engine.call<'analyzed'>({ type: 'analyze', params });
        if (r) setAnalysis(r.result);
      });
    }, 120);
    return () => clearTimeout(id);
  }, [loaded, params, engine, run]);

  const applyOverrides = useCallback((f: Ficha): Ficha => {
    let out: Ficha = { ...f, outfit: { ...f.outfit, ...overrides.current.outfit }, face: { ...f.face, ...overrides.current.face } };
    for (const [slot, hex] of Object.entries(overrides.current.colors)) out = recolor(out, slot as ColorSlot, hex!);
    return out;
  }, []);

  // ficha: se reconstruye desde la imagen al llegar a estilo y cuando cambian los parámetros de imagen
  const needsFicha = step === 'style' || step === 'preview' || step === 'export';
  useEffect(() => {
    if (!loaded || !needsFicha) return;
    const id = setTimeout(() => {
      run(async () => {
        const r = await engine.call<'built'>({ type: 'build', params, name, outfit: overrides.current.outfit, face: overrides.current.face });
        if (r) setFicha(applyOverrides(r.ficha));
      });
    }, 150);
    return () => clearTimeout(id);
  }, [loaded, needsFicha, params, engine, run, applyOverrides]);

  // render: cada vez que cambia la ficha o el tamaño
  useEffect(() => {
    if (!ficha || !needsFicha) return;
    run(async () => {
      const r = await engine.call<'rendered'>({ type: 'render', ficha, cell });
      if (r) { setClips(r.clips); setQa(r.qa); }
    });
  }, [ficha, cell, needsFicha, engine, run]);

  const loadFile = (file: Blob, fileName: string) =>
    run(async () => {
      const req = await fileToRequest(file);
      const transfer = [req.png?.buffer, req.rgba?.buffer].filter(Boolean) as Transferable[];
      await engine.call<'loaded'>({ type: 'load', ...req }, transfer);
      overrides.current = { outfit: {}, face: {}, colors: {} };
      setName(fileName.replace(/\.[a-z]+$/i, '').replace(/[^\w-]+/g, '_') || 'personaje');
      setFicha(null);
      setParams({ bgTolerance: DEFAULT_BG_TOLERANCE, bgStrokes: [], zoneEdits: [] });
      setLoaded(true);
      setStep('bg');
    });

  const loadSample = (n: string) =>
    run(async () => {
      const res = await fetch(`./samples/${n}.png`);
      await loadFile(await res.blob(), n);
    });

  const openFicha = (file: File) =>
    run(async () => {
      const f = JSON.parse(await file.text());
      const errs = validateFicha(f);
      if (errs.length) throw new Error(errs.join('. '));
      setLoaded(false);
      setAnalysis(null);
      setFicha(migrateFicha(f));
      setName(f.name);
      setStep('preview');
    });

  const updateFicha = (fn: (f: Ficha) => Ficha) => setFicha((f) => (f ? fn(f) : f));
  const setOutfit = <K extends keyof Ficha['outfit']>(k: K, v: Ficha['outfit'][K]) => {
    overrides.current.outfit[k] = v;
    updateFicha((f) => ({ ...f, outfit: { ...f.outfit, [k]: v } }));
  };
  const setFace = <K extends keyof Ficha['face']>(k: K, v: Ficha['face'][K]) => {
    overrides.current.face[k] = v;
    updateFicha((f) => ({ ...f, face: { ...f.face, [k]: v } }));
  };
  const setColor = (slot: ColorSlot, hex: string) => {
    overrides.current.colors[slot] = hex;
    updateFicha((f) => recolor(f, slot, hex));
  };

  const doExport = (kind: 'sheet' | 'ffgg' | 'gif') =>
    run(async () => {
      if (!ficha) return;
      const f = { ...ficha, name };
      const r = await engine.call<'exported'>({ type: 'export', ficha: f, cell: kind === 'ffgg' ? 48 : cell, kind, anim });
      r?.files.forEach((x) => download(x.name, x.bytes, x.mime));
    });

  const qaErrors = qa.some((q) => !q.ok);
  const stepIdx = STEPS.indexOf(step);
  const canGo = (s: Step) => (s === 'image' ? true : ficha && !loaded ? ['style', 'preview', 'export'].includes(s) : loaded);
  const stepKey = (s: Step) => `step_${s}` as Key;
  const currentClip = clips.find((c) => c.name === anim) ?? clips[0];
  const zoom = cell === 32 ? 9 : cell === 48 ? 6 : 5;

  // ---------- interacción con la imagen ----------
  const stroke = (p: Point) => setParams((q) => ({ ...q, bgStrokes: [...q.bgStrokes, { x: p.x, y: p.y, r: brushR, mode: bgBrush }] }));
  const zoneEdit = (p: Point, mode: 'wand' | 'brush') => setParams((q) => ({ ...q, zoneEdits: [...q.zoneEdits, { mode, x: p.x, y: p.y, r: brushR, zone: zoneSel }] }));
  const shownHead = dragBox ?? params.head ?? analysis?.head;

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="logo" aria-hidden>▚</span>
          <div>
            <h1>PixelForja</h1>
            <p>{t('appTagline')}</p>
          </div>
        </div>
        <div className="top-right">
          {busy && <span className="busy" role="status">{t('working')}</span>}
          <div className="lang" role="group" aria-label="idioma">
            {(['es', 'en'] as Lang[]).map((l) => (
              <button key={l} className={l === lang ? 'on' : ''} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
            ))}
          </div>
        </div>
      </header>

      <nav className="steps" aria-label="pasos">
        {STEPS.map((s, i) => (
          <button key={s} className={`${s === step ? 'on' : ''} ${i < stepIdx ? 'done' : ''}`} disabled={!canGo(s)} onClick={() => setStep(s)} data-testid={`step-${s}`}>
            <span className="num">{i + 1}</span> {t(stepKey(s))}
          </button>
        ))}
      </nav>

      {error && <div className="error" role="alert">{t('error')}: {error}</div>}

      <main className="work">
        {step === 'image' && (
          <section className="panel wide">
            <label
              className="drop"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) loadFile(f, f.name);
              }}
            >
              <input type="file" accept="image/*" data-testid="file" onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f, f.name); }} />
              <strong>{t('upload')}</strong>
              <span>{t('dropHint')}</span>
            </label>
            <p className="muted">{t('orTry')}</p>
            <div className="samples">
              {SAMPLES.map((n) => (
                <button key={n} onClick={() => loadSample(n)} data-testid={`sample-${n}`}>
                  <img src={`./samples/${n}.png`} alt={n} />
                  <span>{n}</span>
                </button>
              ))}
            </div>
            <label className="btn ghost file-btn">
              {t('openFicha')}
              <input type="file" accept="application/json,.json" onChange={(e) => { const f = e.target.files?.[0]; if (f) openFicha(f); }} />
            </label>
            <p className="muted small">{t('privacy')}</p>
          </section>
        )}

        {(step === 'bg' || step === 'zones' || step === 'head') && analysis && (
          <>
            <section className="panel stage-wrap">
              <ImageStage
                a={analysis}
                mode={step === 'bg' ? 'bg' : step === 'zones' ? 'zones' : 'head'}
                head={shownHead}
                brushR={step === 'bg' || (step === 'zones' && zoneTool === 'brush') ? brushR : undefined}
                onDown={(p) => {
                  if (step === 'bg') stroke(p);
                  else if (step === 'zones') zoneEdit(p, zoneTool);
                  else if (step === 'head' && headTool === 'eyes') {
                    const cur = params.head ?? analysis.head;
                    if (!pendingEye.current) {
                      pendingEye.current = p;
                      setParams((q) => ({ ...q, head: { box: cur.box, eyes: [p, cur.eyes[1]] } }));
                    } else {
                      const a = pendingEye.current;
                      pendingEye.current = null;
                      const eyes: [Point, Point] = a.x <= p.x ? [a, p] : [p, a];
                      setParams((q) => ({ ...q, head: { box: cur.box, eyes } }));
                    }
                  }
                }}
                onDrag={(p, s) => {
                  if (step === 'bg') stroke(p);
                  else if (step === 'zones' && zoneTool === 'brush') zoneEdit(p, 'brush');
                  else if (step === 'head' && headTool === 'box') {
                    const cur = params.head ?? analysis.head;
                    setDragBox({ box: { x: Math.min(p.x, s.x), y: Math.min(p.y, s.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) }, eyes: cur.eyes });
                  }
                }}
                onUp={() => {
                  if (step === 'head' && headTool === 'box' && dragBox) {
                    if (dragBox.box.w > 8 && dragBox.box.h > 8) {
                      setParams((q) => ({ ...q, head: dragBox }));
                      setHeadTool('eyes');
                    }
                    setDragBox(null);
                  }
                }}
              />
            </section>
            <aside className="panel side">
              {step === 'bg' && (
                <>
                  <p>{t('bgHelp')}</p>
                  <label className="field">
                    {t('tolerance')} <output>{params.bgTolerance.toFixed(2)}</output>
                    <input type="range" min={0.02} max={0.2} step={0.01} value={params.bgTolerance} onChange={(e) => setParams((q) => ({ ...q, bgTolerance: +e.target.value }))} />
                  </label>
                  <div className="seg">
                    <button className={bgBrush === 'fg' ? 'on' : ''} onClick={() => setBgBrush('fg')}>{t('brushFg')}</button>
                    <button className={bgBrush === 'bg' ? 'on' : ''} onClick={() => setBgBrush('bg')}>{t('brushBg')}</button>
                  </div>
                  <BrushSize t={t} r={brushR} set={setBrushR} />
                  <button className="btn ghost" disabled={!params.bgStrokes.length} onClick={() => setParams((q) => ({ ...q, bgStrokes: [] }))}>{t('clear')}</button>
                </>
              )}
              {step === 'zones' && (
                <>
                  <p>{t('zonesHelp')}</p>
                  <div className="chips">
                    {EDIT_ZONES.map((z) => (
                      <button key={z} className={`chip ${z === zoneSel ? 'on' : ''}`} onClick={() => setZoneSel(z)}>
                        <i style={{ background: `rgb(${ZONE_COLORS[z].join(',')})` }} />
                        {t(`zone_${z}` as Key)}
                      </button>
                    ))}
                  </div>
                  <div className="seg">
                    <button className={zoneTool === 'wand' ? 'on' : ''} onClick={() => setZoneTool('wand')}>{t('wand')}</button>
                    <button className={zoneTool === 'brush' ? 'on' : ''} onClick={() => setZoneTool('brush')}>{t('brush')}</button>
                  </div>
                  {zoneTool === 'brush' && <BrushSize t={t} r={brushR} set={setBrushR} />}
                  <div className="row">
                    <button className="btn ghost" disabled={!params.zoneEdits.length} onClick={() => setParams((q) => ({ ...q, zoneEdits: q.zoneEdits.slice(0, -1) }))}>{t('undo')}</button>
                    <button className="btn ghost" disabled={!params.zoneEdits.length} onClick={() => setParams((q) => ({ ...q, zoneEdits: [] }))}>{t('clear')}</button>
                  </div>
                </>
              )}
              {step === 'head' && (
                <>
                  <p>{analysis.headGuessed && !params.head ? t('headGuessed') : t('headHelp')}</p>
                  <div className="seg">
                    <button className={headTool === 'box' ? 'on' : ''} onClick={() => setHeadTool('box')}>{t('headBox')}</button>
                    <button className={headTool === 'eyes' ? 'on' : ''} onClick={() => { pendingEye.current = null; setHeadTool('eyes'); }}>{t('headEyes')}</button>
                  </div>
                  <button className="btn ghost" disabled={!params.head} onClick={() => setParams((q) => ({ ...q, head: undefined }))}>{t('resetGuess')}</button>
                </>
              )}
            </aside>
          </>
        )}

        {(step === 'style' || step === 'preview' || step === 'export') && (
          <>
            <section className="panel stage-wrap preview-wrap">
              {currentClip ? (
                <Preview clip={currentClip} bg={bg} zoom={zoom} labels={{ real: t('realSize'), zoomed: t('zoomed') }} />
              ) : (
                <p className="muted">{t('working')}</p>
              )}
              <div className="row center">
                <Seg label={t('anim')} value={anim} set={setAnim} opts={clips.map((c) => [c.name, t(`anim_${c.name}` as Key)])} />
                <Seg label={t('size')} value={String(cell)} set={(v) => setCell(+v as CellSize)} opts={[['32', '32'], ['48', '48'], ['64', '64']]} />
                <Seg label={t('background')} value={bg} set={(v) => setBg(v as PreviewBg)} opts={[['pitch', t('bg_pitch')], ['grass', t('bg_grass')], ['plain', t('bg_plain')]]} />
              </div>
            </section>
            <aside className="panel side">
              {step === 'style' && ficha && (
                <>
                  <label className="field">
                    {t('name')}
                    <input value={name} onChange={(e) => setName(e.target.value.replace(/[^\w-]+/g, '_'))} />
                  </label>
                  <Seg label={t('sleeves')} value={ficha.outfit.sleeves} set={(v) => setOutfit('sleeves', v as Ficha['outfit']['sleeves'])} opts={(['none', 'short', 'long'] as const).map((v) => [v, t(`sleeves_${v}`)])} />
                  <Seg label={t('bottom')} value={ficha.outfit.bottom} set={(v) => setOutfit('bottom', v as Ficha['outfit']['bottom'])} opts={(['shorts', 'pants', 'skirt'] as const).map((v) => [v, t(`bottom_${v}`)])} />
                  <Seg label={t('socks')} value={ficha.outfit.socks} set={(v) => setOutfit('socks', v as Ficha['outfit']['socks'])} opts={(['none', 'low', 'knee'] as const).map((v) => [v, t(`socks_${v}`)])} />
                  <Seg label={t('eyes')} value={ficha.face.eyes} set={(v) => setFace('eyes', v as Ficha['face']['eyes'])} opts={(['round', 'big', 'small'] as const).map((v) => [v, t(`eyes_${v}`)])} />
                  <Seg label={t('mouth')} value={ficha.face.mouth} set={(v) => setFace('mouth', v as Ficha['face']['mouth'])} opts={(['smile', 'line', 'open'] as const).map((v) => [v, t(`mouth_${v}`)])} />
                  <div className="row">
                    <Toggle label={t('blush')} on={ficha.face.blush} set={(v) => setFace('blush', v)} />
                    <Toggle label={t('brows')} on={ficha.face.brows} set={(v) => setFace('brows', v)} />
                    <Toggle label={t('glasses')} on={!!ficha.face.glasses} set={(v) => setFace('glasses', v ? ficha.face.glasses || '#1d3c78' : null)} />
                  </div>
                  <fieldset className="colors">
                    <legend>{t('colors')}</legend>
                    {(['skin', 'hair', 'eyes', 'top', 'bottom', 'socks', 'shoes'] as ColorSlot[]).map((slot) => (
                      <label key={slot} className="swatch">
                        <input
                          type="color"
                          value={slot === 'eyes' ? ficha.palette.eyes : ficha.palette[slot][BASE]}
                          onChange={(e) => setColor(slot, e.target.value)}
                        />
                        {t(`color_${slot}` as Key)}
                      </label>
                    ))}
                  </fieldset>
                </>
              )}
              {(step === 'preview' || step === 'export') && <QATable qa={qa} t={t} />}
              {step === 'export' && (
                <div className="exports">
                  <p className="muted small">{t('exportHelp')}</p>
                  {qaErrors && <p className="error">{t('qaBlocked')}</p>}
                  <button className="btn" disabled={!ficha || qaErrors} onClick={() => doExport('sheet')} data-testid="export-sheet">{t('exportSheet')} · {cell}px</button>
                  <button className="btn" disabled={!ficha || qaErrors} onClick={() => doExport('ffgg')} data-testid="export-ffgg">{t('exportFfgg')}</button>
                  <button className="btn" disabled={!ficha || qaErrors} onClick={() => doExport('gif')} data-testid="export-gif">{t('exportGif')} · {t(`anim_${anim}` as Key)}</button>
                  <button className="btn ghost" disabled={!ficha} onClick={() => ficha && download(`${name}.ficha.json`, JSON.stringify({ ...ficha, name }, null, 2), 'application/json')} data-testid="export-ficha">{t('exportFicha')}</button>
                  {import.meta.env.VITE_ARTIFACT && <p className="error">{t('noDownloads')}</p>}
                  <p className="muted small">{t('phase0')}</p>
                </div>
              )}
            </aside>
          </>
        )}
      </main>

      {step !== 'image' && (
        <footer className="nav">
          <button className="btn ghost" onClick={() => setStep(STEPS[Math.max(0, stepIdx - 1)])}>{t('back')}</button>
          {stepIdx < STEPS.length - 1 && (
            <button className="btn" disabled={!canGo(STEPS[stepIdx + 1])} onClick={() => setStep(STEPS[stepIdx + 1])} data-testid="next">{t('next')}</button>
          )}
        </footer>
      )}
    </div>
  );
}

function Seg({ label, value, set, opts }: { label: string; value: string; set: (v: string) => void; opts: [string, string][] }) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="seg">
        {opts.map(([v, l]) => (
          <button key={v} className={v === value ? 'on' : ''} onClick={() => set(v)}>{l}</button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  );
}

function BrushSize({ t, r, set }: { t: (k: Key) => string; r: number; set: (v: number) => void }) {
  return (
    <label className="field">
      {t('brushSize')} <output>{r}</output>
      <input type="range" min={2} max={24} value={r} onChange={(e) => set(+e.target.value)} />
    </label>
  );
}

function QATable({ qa, t }: { qa: QAReport[]; t: (k: Key) => string }) {
  if (!qa.length) return null;
  const checks = qa[0].items.map((i) => i.check);
  return (
    <div className="qa">
      <h3>{t('qa')}</h3>
      <table data-testid="qa">
        <thead>
          <tr>
            <th />
            {qa.map((q) => <th key={q.clip}>{t(`anim_${q.clip}` as Key)}</th>)}
          </tr>
        </thead>
        <tbody>
          {checks.map((c) => (
            <tr key={c}>
              <th>{t(`qa_${c}` as Key)}</th>
              {qa.map((q) => {
                const it = q.items.find((i) => i.check === c)!;
                return (
                  <td key={q.clip} className={it.severity} title={it.where}>
                    {it.severity === 'ok' ? '✓' : it.severity === 'warn' ? '!' : '✗'} {it.value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
