import { useEffect, useMemo, useRef, useState } from 'react';
import {
  type HumanFicha, type CellSize, type Pose, type JointName, type CustomAnim, type EyeExpr, type MouthExpr,
  editorFrame, dragJoint, posesFor, customFrames, DRAGGABLE, EYE_EXPRS, MOUTH_EXPRS, animsFor, scalePose,
} from '../../engine/index';
import { History } from '../history';
import { animLabel, type Key, type Lang } from '../i18n';
import { Select, Slider, Toggle, Seg, type T } from '../components/ui';
import { backgroundPixels } from '../components/Preview';

interface Props {
  t: T;
  lang: Lang;
  ficha: HumanFicha;
  cell: CellSize;
  onSave: (anim: CustomAnim) => void;
}

/** Lo que se puede deshacer y lo que guarda el borrador. */
interface Doc { keys: Pose[]; inb: number; fps: number; loop: boolean }
interface Draft extends Doc { base: string; name: string; cell: CellSize; at: number }
const draftKey = (f: HumanFicha) => `pf.editorDraft:${f.name}`;
function readDraft(f: HumanFicha): Draft | null {
  try {
    const d = JSON.parse(localStorage.getItem(draftKey(f)) ?? 'null') as Draft | null;
    return d && Array.isArray(d.keys) && d.keys.length ? d : null;
  } catch { return null; }
}
function clearDraft(f: HumanFicha) {
  try { localStorage.removeItem(draftKey(f)); } catch { /* sin almacenamiento */ }
}

const ZOOM: Record<CellSize, number> = { 32: 12, 48: 9, 64: 7 };
const JOINT_COLOR: Record<string, string> = { footNear: '#ff9a3c', footFar: '#c46a1c', handNear: '#3cc7ff', handFar: '#1f7fa6', head: '#ff4fa3', hip: '#7cff6b' };

function draw(c: HTMLCanvasElement, cell: number, layers: { rgba: Uint8ClampedArray; alpha: number; tint?: [number, number, number] }[]) {
  c.width = cell;
  c.height = cell;
  const ctx = c.getContext('2d')!;
  const out = new Uint8ClampedArray(backgroundPixels('plain', cell));
  for (const l of layers)
    for (let i = 0; i < cell * cell; i++) {
      if (!l.rgba[i * 4 + 3]) continue;
      for (let k = 0; k < 3; k++) {
        const src = l.tint ? (l.rgba[i * 4 + k] + l.tint[k]) / 2 : l.rgba[i * 4 + k];
        out[i * 4 + k] = out[i * 4 + k] * (1 - l.alpha) + src * l.alpha;
      }
    }
  ctx.putImageData(new ImageData(out, cell, cell), 0, 0);
}

export function EditorStep({ t, lang, ficha, cell, onSave }: Props) {
  const bases = useMemo(() => animsFor(ficha).filter((a) => a.pack !== 'custom' || true), [ficha]);
  const [base, setBase] = useState('idle');
  const [keys, setKeys] = useState<Pose[]>(() => posesFor(ficha, cell, 'idle').slice(0, 4));
  const [sel, setSel] = useState(0);
  const [inb, setInb] = useState(1);
  const [onion, setOnion] = useState(true);
  const [loop, setLoop] = useState(true);
  const [fps, setFps] = useState(8);
  const [name, setName] = useState('mi_animacion');
  const [playing, setPlaying] = useState(false);
  const [saved, setSaved] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<JointName | null>(null);
  const gesture = useRef(0);
  const zoom = ZOOM[cell];

  // ---------- deshacer, rehacer y borrador ----------
  const hist = useRef(new History<Doc>());
  const [, rerender] = useState(0);
  const dirty = useRef(false);
  const [draft, setDraft] = useState<Draft | null>(() => readDraft(ficha));
  const doc = (): Doc => ({ keys, inb, fps, loop });
  const record = (tag?: string) => {
    hist.current.record(doc(), tag);
    dirty.current = true;
    setSaved(false);
    rerender((n) => n + 1);
  };
  const apply = (d: Doc) => {
    setKeys(d.keys);
    setInb(d.inb);
    setFps(d.fps);
    setLoop(d.loop);
    setSel((i) => Math.min(i, d.keys.length - 1));
    dirty.current = true;
    setSaved(false);
    rerender((n) => n + 1);
  };
  const undo = () => { const d = hist.current.undo(doc()); if (d) apply(d); };
  const redo = () => { const d = hist.current.redo(doc()); if (d) apply(d); };
  const recover = () => {
    if (!draft) return;
    record();
    // el borrador pudo hacerse a otro tamaño: las distancias se pasan a este
    const k = cell / draft.cell;
    apply({ ...draft, keys: k === 1 ? draft.keys : draft.keys.map((p) => scalePose(p, k)) });
    setBase(draft.base);
    setName(draft.name);
    setDraft(null);
  };
  const discard = () => { clearDraft(ficha); setDraft(null); };
  // el borrador se guarda solo, medio segundo después del último cambio
  useEffect(() => {
    if (!dirty.current) return;
    const id = setTimeout(() => {
      try { localStorage.setItem(draftKey(ficha), JSON.stringify({ keys, inb, fps, loop, base, name, cell, at: Date.now() } satisfies Draft)); } catch { /* sin almacenamiento */ }
    }, 500);
    return () => clearTimeout(id);
  }, [keys, inb, fps, loop, base, name, cell, ficha]);
  // Ctrl+Z, Ctrl+Shift+Z y Ctrl+Y (no dentro de un campo de texto)
  const keyRef = useRef({ undo, redo });
  keyRef.current = { undo, redo };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || (e.target as HTMLElement)?.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); keyRef.current.undo(); }
      else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); keyRef.current.redo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const loadBase = (n: string) => {
    record();
    setBase(n);
    const custom = ficha.customAnims?.find((c) => c.name === n);
    // una animación guardada a otro tamaño se trae a este (las poses del editor van en pixeles de la celda)
    const k = custom?.authoredCell ? cell / custom.authoredCell : 1;
    const ps = custom ? (custom.keys as Pose[]).map((p) => (k === 1 ? p : scalePose(p, k))) : posesFor(ficha, cell, n);
    // de una animación de fábrica se toman hasta 8 poses clave repartidas
    const step = custom ? 1 : Math.max(1, Math.ceil(ps.length / 8));
    setKeys(ps.filter((_, i) => i % step === 0).map((p) => ({ ...p, hair: undefined })));
    setInb(custom ? custom.inBetweens : step - 1);
    setSel(0);
    setSaved(false);
  };

  const sequence = useMemo(() => customFrames({ name, fps, loop, inBetweens: inb, keys }), [keys, inb, loop, name, fps]);
  const current = useMemo(() => editorFrame(ficha, cell, keys[Math.min(sel, keys.length - 1)]), [ficha, cell, keys, sel]);

  // dibujo del cuadro actual con papel cebolla, o la animación si está reproduciendo
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    if (playing) {
      const frames = sequence.map((p) => editorFrame(ficha, cell, p).frame.data);
      let i = 0;
      const id = setInterval(() => { draw(c, cell, [{ rgba: frames[i], alpha: 1 }]); i = (i + 1) % frames.length; }, 1000 / fps);
      return () => clearInterval(id);
    }
    const layers: { rgba: Uint8ClampedArray; alpha: number; tint?: [number, number, number] }[] = [];
    if (onion && keys.length > 1) {
      const prev = keys[(sel - 1 + keys.length) % keys.length], next = keys[(sel + 1) % keys.length];
      if (sel > 0 || loop) layers.push({ rgba: editorFrame(ficha, cell, prev).frame.data, alpha: 0.3, tint: [255, 80, 80] });
      if (sel < keys.length - 1 || loop) layers.push({ rgba: editorFrame(ficha, cell, next).frame.data, alpha: 0.3, tint: [80, 160, 255] });
    }
    layers.push({ rgba: current.frame.data, alpha: 1 });
    draw(c, cell, layers);
  }, [current, keys, sel, onion, playing, sequence, ficha, cell, fps, loop]);

  const update = (patch: (p: Pose) => Pose, tag?: string) => {
    record(tag);
    setKeys((ks) => ks.map((k, i) => (i === sel ? patch(k) : k)));
  };
  const toCell = (e: React.PointerEvent): [number, number] => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * cell, ((e.clientY - r.top) / r.height) * cell];
  };
  const pose = keys[Math.min(sel, keys.length - 1)];

  return (
    <>
      <section className="panel stage-wrap">
        {draft && (
          <div className="draft-bar" role="status" data-testid="ed-draft">
            <span>{t('ed_draft')} <b>{draft.name}</b></span>
            <button className="btn" onClick={recover} data-testid="ed-recover">{t('ed_draftRecover')}</button>
            <button className="btn ghost" onClick={discard}>{t('ed_draftDiscard')}</button>
          </div>
        )}
        <p className="muted small">{t('ed_help')}</p>
        <div className="editor-stage" style={{ width: cell * zoom, maxWidth: '100%' }}>
          <canvas ref={canvas} className="pixel" style={{ width: '100%', height: 'auto' }} data-testid="editor-canvas" />
          {!playing && (
            <svg
              className="stage-overlay"
              viewBox={`0 0 ${cell} ${cell}`}
              onPointerMove={(e) => {
                if (!drag.current) return;
                const to = toCell(e);
                update((p) => dragJoint(ficha, cell, p, drag.current!, to, editorFrame(ficha, cell, p).joints), `drag${gesture.current}`);
              }}
              onPointerUp={() => (drag.current = null)}
              onPointerLeave={() => (drag.current = null)}
            >
              {DRAGGABLE.map((j) => {
                const [x, y] = current.joints[j];
                return (
                  <circle
                    key={j}
                    cx={x + 0.5}
                    cy={y + 0.5}
                    r={Math.max(1.2, cell / 30)}
                    className="joint"
                    style={{ fill: JOINT_COLOR[j] }}
                    data-testid={`joint-${j}`}
                    onPointerDown={(e) => { (e.currentTarget.ownerSVGElement as Element).setPointerCapture(e.pointerId); drag.current = j; gesture.current++; }}
                  />
                );
              })}
            </svg>
          )}
        </div>
        <div className="timeline" data-testid="timeline">
          {keys.map((_, i) => (
            <button key={i} className={i === sel ? 'on' : ''} onClick={() => { setSel(i); setPlaying(false); }}>{i + 1}</button>
          ))}
        </div>
        <div className="row center">
          <button className="btn ghost" onClick={undo} disabled={!hist.current.canUndo} title="Ctrl+Z" data-testid="ed-undo">{t('ed_undo')}</button>
          <button className="btn ghost" onClick={redo} disabled={!hist.current.canRedo} title="Ctrl+Shift+Z" data-testid="ed-redo">{t('ed_redo')}</button>
          <button className="btn ghost" onClick={() => { record(); setKeys((ks) => [...ks.slice(0, sel + 1), structuredClone(ks[sel]), ...ks.slice(sel + 1)]); setSel(sel + 1); }}>{t('ed_add')}</button>
          <button className="btn ghost" disabled={keys.length <= 1} onClick={() => { record(); setKeys((ks) => ks.filter((_, i) => i !== sel)); setSel(Math.max(0, sel - 1)); }}>{t('ed_del')}</button>
          <button className="btn" onClick={() => setPlaying(!playing)} data-testid="ed-play">{playing ? t('ed_stop') : t('ed_play')}</button>
          <span className="muted small">{sequence.length} {t('frames')}</span>
        </div>
      </section>
      <aside className="panel side">
        <Select label={t('ed_base')} value={base} set={loadBase} opts={bases.map((a) => [a.name, animLabel(a.name, lang)])} testid="ed-base" />
        <Slider label={t('ed_torso')} value={pose.torso} min={-180} max={180} step={1} fmt={(v) => `${v}°`} set={(v) => update((p) => ({ ...p, torso: v }), `torso${sel}`)} />
        <Slider label={t('ed_tilt')} value={pose.head.tilt} min={-40} max={40} step={1} fmt={(v) => `${v}°`} set={(v) => update((p) => ({ ...p, head: { ...p.head, tilt: v } }), `tilt${sel}`)} />
        <Slider label={t('ed_air')} value={pose.air} min={0} max={Math.round(cell / 6)} step={1} set={(v) => update((p) => ({ ...p, air: v }), `air${sel}`)} />
        <Seg label={t('ed_eyes')} value={pose.face.eyes} set={(v) => update((p) => ({ ...p, face: { ...p.face, eyes: v as EyeExpr } }))} opts={EYE_EXPRS.map((e) => [e, t(`eye_${e}` as Key)])} />
        <Seg label={t('ed_mouth')} value={pose.face.mouth ?? ficha.face.mouth} set={(v) => update((p) => ({ ...p, face: { ...p.face, mouth: v as MouthExpr } }))} opts={MOUTH_EXPRS.map((m) => [m, t(`mouth_${m}` as Key)])} />
        <Slider label={t('ed_inb')} value={inb} min={0} max={4} step={1} set={(v) => { record('inb'); setInb(v); }} />
        <Slider label={t('fps')} value={fps} min={4} max={16} step={1} set={(v) => { record('fps'); setFps(v); }} />
        <div className="row">
          <Toggle label={t('ed_onion')} on={onion} set={setOnion} />
          <Toggle label={t('loop')} on={loop} set={(v) => { record(); setLoop(v); }} />
        </div>
        <label className="field">
          {t('ed_name')}
          <input value={name} onChange={(e) => setName(e.target.value.replace(/[^\w-]+/g, '_'))} data-testid="ed-name" />
        </label>
        <button
          className="btn"
          data-testid="ed-save"
          onClick={() => {
            // authoredCell: así al exportar a otro tamaño las poses se escalan
            onSave({ name, fps, loop, inBetweens: inb, keys: keys.map((k) => ({ ...k, hair: undefined })), authoredCell: cell });
            setSaved(true);
            dirty.current = false;
            clearDraft(ficha);
            setDraft(null);
          }}
        >{t('ed_save')}</button>
        {saved && <p className="ok small">{t('ed_saved')}</p>}
        <p className="muted small">{t('ed_onlySide')}</p>
      </aside>
    </>
  );
}
