import { useEffect, useMemo, useRef, useState } from 'react';
import {
  type HumanFicha, type CellSize, type Pose, type JointName, type CustomAnim, type EyeExpr, type MouthExpr,
  editorFrame, dragJoint, posesFor, customFrames, DRAGGABLE, EYE_EXPRS, MOUTH_EXPRS, animsFor,
} from '../../engine/index';
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
  const zoom = ZOOM[cell];

  const loadBase = (n: string) => {
    setBase(n);
    const custom = ficha.customAnims?.find((c) => c.name === n);
    const ps = custom ? (custom.keys as Pose[]) : posesFor(ficha, cell, n);
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

  const update = (patch: (p: Pose) => Pose) => {
    setKeys((ks) => ks.map((k, i) => (i === sel ? patch(k) : k)));
    setSaved(false);
  };
  const toCell = (e: React.PointerEvent): [number, number] => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * cell, ((e.clientY - r.top) / r.height) * cell];
  };
  const pose = keys[Math.min(sel, keys.length - 1)];

  return (
    <>
      <section className="panel stage-wrap">
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
                update((p) => dragJoint(ficha, cell, p, drag.current!, to, editorFrame(ficha, cell, p).joints));
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
                    onPointerDown={(e) => { (e.currentTarget.ownerSVGElement as Element).setPointerCapture(e.pointerId); drag.current = j; }}
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
          <button className="btn ghost" onClick={() => { setKeys((ks) => [...ks.slice(0, sel + 1), structuredClone(ks[sel]), ...ks.slice(sel + 1)]); setSel(sel + 1); }}>{t('ed_add')}</button>
          <button className="btn ghost" disabled={keys.length <= 1} onClick={() => { setKeys((ks) => ks.filter((_, i) => i !== sel)); setSel(Math.max(0, sel - 1)); }}>{t('ed_del')}</button>
          <button className="btn" onClick={() => setPlaying(!playing)} data-testid="ed-play">{playing ? t('ed_stop') : t('ed_play')}</button>
          <span className="muted small">{sequence.length} {t('frames')}</span>
        </div>
      </section>
      <aside className="panel side">
        <Select label={t('ed_base')} value={base} set={loadBase} opts={bases.map((a) => [a.name, animLabel(a.name, lang)])} testid="ed-base" />
        <Slider label={t('ed_torso')} value={pose.torso} min={-180} max={180} step={1} fmt={(v) => `${v}°`} set={(v) => update((p) => ({ ...p, torso: v }))} />
        <Slider label={t('ed_tilt')} value={pose.head.tilt} min={-40} max={40} step={1} fmt={(v) => `${v}°`} set={(v) => update((p) => ({ ...p, head: { ...p.head, tilt: v } }))} />
        <Slider label={t('ed_air')} value={pose.air} min={0} max={Math.round(cell / 6)} step={1} set={(v) => update((p) => ({ ...p, air: v }))} />
        <Seg label={t('ed_eyes')} value={pose.face.eyes} set={(v) => update((p) => ({ ...p, face: { ...p.face, eyes: v as EyeExpr } }))} opts={EYE_EXPRS.map((e) => [e, t(`eye_${e}` as Key)])} />
        <Seg label={t('ed_mouth')} value={pose.face.mouth ?? ficha.face.mouth} set={(v) => update((p) => ({ ...p, face: { ...p.face, mouth: v as MouthExpr } }))} opts={MOUTH_EXPRS.map((m) => [m, t(`mouth_${m}` as Key)])} />
        <Slider label={t('ed_inb')} value={inb} min={0} max={4} step={1} set={setInb} />
        <Slider label={t('fps')} value={fps} min={4} max={16} step={1} set={setFps} />
        <div className="row">
          <Toggle label={t('ed_onion')} on={onion} set={setOnion} />
          <Toggle label={t('loop')} on={loop} set={setLoop} />
        </div>
        <label className="field">
          {t('ed_name')}
          <input value={name} onChange={(e) => setName(e.target.value.replace(/[^\w-]+/g, '_'))} data-testid="ed-name" />
        </label>
        <button
          className="btn"
          data-testid="ed-save"
          onClick={() => { onSave({ name, fps, loop, inBetweens: inb, keys: keys.map((k) => ({ ...k, hair: undefined })) }); setSaved(true); }}
        >{t('ed_save')}</button>
        {saved && <p className="ok small">{t('ed_saved')}</p>}
        <p className="muted small">{t('ed_onlySide')}</p>
      </aside>
    </>
  );
}
