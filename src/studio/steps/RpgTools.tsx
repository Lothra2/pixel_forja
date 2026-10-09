import { useEffect, useMemo, useRef, useState } from 'react';
import {
  renderFx, exportFx, FX_ELEMENTS, FX_KINDS, FX_PALETTES, ENEMIES, FAMILY, FAMILY_GG,
  type FamilyId, type FxElement, type FxKind, type CellSize, type EnemyId, type Raster,
} from '../../engine/index';
import type { FrameSet } from '../protocol';
import type { Key } from '../i18n';
import { Seg, type T } from '../components/ui';
import { downloadFiles } from '../util';

/** Lienzo animado de cuadros RGBA (sin suavizar). */
export function AnimCanvas({ frames, cell, fps, zoom, testid }: { frames: Uint8ClampedArray[]; cell: number; fps: number; zoom: number; testid?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || !frames.length) return;
    c.width = cell; c.height = cell;
    const ctx = c.getContext('2d')!;
    const imgs = frames.map((f) => new ImageData(new Uint8ClampedArray(f), cell, cell));
    let raf = 0, last = 0, i = 0;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const tick = (tm: number) => {
      if (tm - last >= 1000 / fps) { last = tm; ctx.putImageData(imgs[i], 0, 0); i = reduced ? 0 : (i + 1) % imgs.length; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [frames, cell, fps]);
  return <canvas ref={ref} className="pixel" style={{ width: cell * zoom, height: cell * zoom }} data-testid={testid} />;
}

const toggleIn = <V,>(s: Set<V>, v: V) => { const n = new Set(s); if (n.has(v)) n.delete(v); else n.add(v); return n; };

// ---------- enemigos ----------

function EnemyCard({ id, t, render, open }: { id: EnemyId; t: T; render: (id: EnemyId) => Promise<FrameSet | null>; open: (id: EnemyId) => void }) {
  const [clip, setClip] = useState<FrameSet | null>(null);
  useEffect(() => { let live = true; render(id).then((c) => { if (live && c) setClip(c); }); return () => { live = false; }; }, [id, render]);
  return (
    <button className="tile enemy" onClick={() => open(id)} data-testid={`enemy-${id}`}>
      <div className="enemy-stage">{clip ? <AnimCanvas frames={clip.frames} cell={clip.cell} fps={clip.fps} zoom={clip.cell > 48 ? 2 : 3} /> : <span className="muted small">···</span>}</div>
      <strong>{t(`enemy_${id}` as Key)}</strong>
    </button>
  );
}

export function EnemiesStep({ t, render, open }: { t: T; render: (id: EnemyId) => Promise<FrameSet | null>; open: (id: EnemyId) => void }) {
  return (
    <section className="panel wide">
      <div className="section-h"><h3>{t('rpg_enemies')}</h3></div>
      <p className="muted small">{t('rpg_enemiesHelp')}</p>
      <div className="enemy-grid">
        {ENEMIES.map((id) => <EnemyCard key={id} id={id} t={t} render={render} open={open} />)}
      </div>
    </section>
  );
}

// ---------- poderes ----------

export function FxStep({ t }: { t: T }) {
  const [element, setElement] = useState<FxElement>('fuego');
  const [kind, setKind] = useState<FxKind>('impact');
  const [cell, setCell] = useState<CellSize>(48);
  const [els, setEls] = useState<Set<FxElement>>(new Set(['fuego']));
  const [kinds, setKinds] = useState<Set<FxKind>>(new Set(FX_KINDS));
  const big = useMemo(() => renderFx({ kind, element, cell }), [kind, element, cell]);
  const all = useMemo(() => FX_KINDS.map((k) => renderFx({ kind: k, element, cell: 48 })), [element]);
  const frames = (fs: Raster[]) => fs.map((f) => f.data);
  const doExport = () => downloadFiles(exportFx([...els], [...kinds], cell), 'poderes.zip');
  return (
    <>
      <section className="panel stage-wrap">
        <div className="fx-stage" data-testid="fx-preview">
          <AnimCanvas frames={frames(big.frames)} cell={big.cell} fps={big.fps} zoom={cell === 64 ? 5 : cell === 48 ? 7 : 10} />
        </div>
        <div className="fx-strip">
          {all.map((c, i) => (
            <button key={c.name} className={`fx-thumb ${FX_KINDS[i] === kind ? 'on' : ''}`} onClick={() => setKind(FX_KINDS[i])} data-testid={`fx-kind-${FX_KINDS[i]}`}>
              <AnimCanvas frames={frames(c.frames)} cell={48} fps={c.fps} zoom={2} />
              <span>{t(`fx_${FX_KINDS[i]}` as Key)}</span>
            </button>
          ))}
        </div>
      </section>
      <aside className="panel side">
        <div className="field">
          <span>{t('fx_element')}</span>
          <div className="chips">
            {FX_ELEMENTS.map((e) => (
              <button key={e} className={`chip ${e === element ? 'on' : ''}`} onClick={() => setElement(e)} data-testid={`fx-el-${e}`}>
                <i style={{ background: FX_PALETTES[e][3] }} />{t(`el_${e}` as Key)}
              </button>
            ))}
          </div>
        </div>
        <Seg label={t('size')} value={String(cell)} set={(v) => setCell(+v as CellSize)} opts={[['32', '32'], ['48', '48'], ['64', '64']]} />
        <h3 className="h2">{t('step_export')}</h3>
        <div className="field">
          <span>{t('fx_exportElements')}</span>
          <div className="chips">
            {FX_ELEMENTS.map((e) => <button key={e} className={`chip ${els.has(e) ? 'on' : ''}`} onClick={() => setEls(toggleIn(els, e))}>{t(`el_${e}` as Key)}</button>)}
            <button className="chip" onClick={() => setEls(new Set(FX_ELEMENTS))}>{t('selectAll')}</button>
          </div>
        </div>
        <div className="field">
          <span>{t('fx_exportKinds')}</span>
          <div className="chips">
            {FX_KINDS.map((k) => <button key={k} className={`chip ${kinds.has(k) ? 'on' : ''}`} onClick={() => setKinds(toggleIn(kinds, k))}>{t(`fx_${k}` as Key)}</button>)}
          </div>
        </div>
        <button className="btn" disabled={!els.size || !kinds.size} onClick={doExport} data-testid="fx-export">{t('fx_export')}</button>
        <p className="muted small">{t('fx_help')}</p>
      </aside>
    </>
  );
}

// ---------- familia GG ----------

function FamilyCard({ id, t, render, open }: { id: FamilyId; t: T; render: (id: FamilyId, rpg: boolean) => Promise<FrameSet | null>; open: (id: FamilyId, rpg: boolean) => void }) {
  const [clips, setClips] = useState<(FrameSet | null)[]>([null, null]);
  useEffect(() => {
    let live = true;
    (async () => {
      const a = await render(id, false);
      if (live) setClips([a, null]);
      const b = await render(id, true);
      if (live) setClips([a, b]);
    })();
    return () => { live = false; };
  }, [id, render]);
  const m = FAMILY_GG[id];
  return (
    <div className="tile family" data-testid={`family-${id}`}>
      <div className="family-stage">
        {clips.map((c, i) => (
          <button key={i} className="family-look" onClick={() => open(id, i === 1)} data-testid={`family-${id}-${i ? 'rpg' : 'casual'}`} aria-label={`${m.name} ${i ? t(`class_${m.clase}` as Key) : t('fam_casual')}`}>
            {c ? <AnimCanvas frames={c.frames} cell={c.cell} fps={c.fps} zoom={3} /> : <span className="muted small">···</span>}
            <small>{i ? t(`class_${m.clase}` as Key) : t('fam_casual')}</small>
          </button>
        ))}
      </div>
      <strong>{m.name}</strong>
    </div>
  );
}

export function FamilyRow({ t, render, open }: { t: T; render: (id: FamilyId, rpg: boolean) => Promise<FrameSet | null>; open: (id: FamilyId, rpg: boolean) => void }) {
  return (
    <div className="family-grid" data-testid="family">
      {FAMILY.map((id) => <FamilyCard key={id} id={id} t={t} render={render} open={open} />)}
    </div>
  );
}
