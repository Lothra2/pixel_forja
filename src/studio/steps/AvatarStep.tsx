import { useEffect, useRef, useState } from 'react';
import {
  type Avatar, type AvatarPart, type HairParams, type FaceParams,
  SKIN_SWATCHES, HAIR_SWATCHES, EYE_SWATCHES, GLASSES_SWATCHES, withHairStyle, lpcValue, withLpc, DEFAULT_LPC, DEFAULT_BODY,
  type BodyType,
} from '../../engine/index';
import type { Key } from '../i18n';
import type { Thumb } from '../protocol';
import { Seg, Slider, type T } from '../components/ui';

interface Props {
  t: T;
  avatar: Avatar;
  setAvatar: (a: Avatar) => void;
  /** la ficha tiene cabeza pixelada del dibujo: se puede elegir cuál usar */
  canChooseHead: boolean;
  headMode: 'avatar' | 'image';
  setHeadMode: (m: 'avatar' | 'image') => void;
  canReset: boolean;
  reset: () => void;
  random: () => void;
  loadThumbs: (a: Avatar, part: AvatarPart) => Promise<Thumb[] | null>;
  /** toma piel, pelo, ojos y barba de una foto */
  photoColors: (f: File) => void;
  /** cambia edad, contextura y figura (y las proporciones de la ficha) */
  setBody: (b: BodyType) => void;
  /** expresión de reposo: la boca de todas las animaciones que no traen la suya */
  mouth: string;
  setMouth: (m: 'line' | 'smile' | 'grin') => void;
}

const HAT_SWATCHES = ['#8a5a32', '#3b3f4a', '#c9d3df', '#e2b23c', '#b0283a', '#2f5aa8', '#2f9b5b', '#5a3a9a', '#f2f2ee'];

/** Nombre visible de cada opción. Las piezas LPC traen nombres en inglés del proyecto original. */
const VOLUME_KEY: Partial<Record<AvatarPart, (id: string) => Key>> = {
  look: (id) => `look_${id}` as Key,
  hair: (id) => `hair_${id}` as Key,
  eyes: (id) => `eyes_${id}` as Key,
  brows: (id) => `brows_${id}` as Key,
  nose: (id) => `nose_${id}` as Key,
  beard: (id) => `beard_${id}` as Key,
  glasses: (id) => `glasses_${id}` as Key,
};
const isLpc = (part: AvatarPart) => part.startsWith('lpc');
function label(t: T, part: AvatarPart, id: string): string {
  if (id === 'none') return t('none');
  if (part === 'lpcHead') return t(`head_${id}` as Key);
  if (part === 'lpcHat') return t((`hat_${id}`) as Key) === `hat_${id}` ? id.replace(/_/g, ' ') : t(`hat_${id}` as Key);
  if (part === 'lpcBrows') return t(id === 'thick' ? 'brows_gruesa' : 'brows_fina');
  const k = VOLUME_KEY[part];
  if (k) return t(k(id));
  return id.replace(/_/g, ' ');
}

function current(a: Avatar, part: AvatarPart): string {
  if (isLpc(part)) return lpcValue(a, part);
  switch (part) {
    case 'look': return a.look;
    case 'hair': return a.hair.style;
    case 'eyes': return a.eyes.style;
    case 'brows': return a.brows.style;
    case 'nose': return a.nose;
    case 'beard': return a.beard.style;
    default: return a.glasses.style;
  }
}

function apply(a: Avatar, part: AvatarPart, id: string): Avatar {
  if (isLpc(part)) return withLpc(a, part, id);
  switch (part) {
    case 'look': return { ...a, look: id as Avatar['look'] };
    case 'hair': return withHairStyle(a, id as Avatar['hair']['style']);
    case 'eyes': return { ...a, eyes: { ...a.eyes, style: id as Avatar['eyes']['style'] } };
    case 'brows': return { ...a, brows: { style: id as Avatar['brows']['style'] } };
    case 'nose': return { ...a, nose: id as Avatar['nose'] };
    case 'beard': return { ...a, beard: { ...a.beard, style: id as Avatar['beard']['style'] } };
    default: return { ...a, glasses: { ...a.glasses, style: id as Avatar['glasses']['style'] } };
  }
}

function ThumbCanvas({ th }: { th: Thumb }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = th.w; c.height = th.h;
    c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(th.rgba), th.w, th.h), 0, 0);
  }, [th]);
  return <canvas ref={ref} className="pixel" style={{ width: th.w * 3, aspectRatio: `${th.w} / ${th.h}` }} />;
}

function Swatches({ label, colors, value, set, testid }: { label: string; colors: string[]; value: string; set: (hex: string) => void; testid?: string }) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="sw-row" data-testid={testid}>
        {colors.map((c) => (
          <button key={c} className={`sw ${c.toLowerCase() === value.toLowerCase() ? 'on' : ''}`} style={{ background: c }} aria-label={c} onClick={() => set(c)} />
        ))}
        <label className="sw sw-custom" title={label}>
          <input type="color" value={value} onChange={(e) => set(e.target.value)} />
        </label>
      </div>
    </div>
  );
}

export function AvatarStep(p: Props) {
  const { t, avatar: a } = p;
  const lpc = a.kit === 'lpc';
  const [open, setOpen] = useState<Set<AvatarPart>>(() => new Set<AvatarPart>(['look', 'hair', 'lpcHair', 'lpcHead']));
  const [thumbs, setThumbs] = useState<Partial<Record<AvatarPart, Thumb[]>>>({});

  // miniaturas: solo de las secciones abiertas, y un rato después del último cambio
  const key = JSON.stringify(a);
  useEffect(() => {
    let alive = true;
    const id = setTimeout(async () => {
      for (const part of open) {
        const r = await p.loadThumbs(a, part);
        if (!alive) return;
        if (r) setThumbs((s) => ({ ...s, [part]: r }));
      }
    }, 250);
    return () => { alive = false; clearTimeout(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, open]);

  const toggle = (part: AvatarPart) => (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    const isOpen = e.currentTarget.open;
    setOpen((s) => {
      const n = new Set(s);
      if (isOpen) n.add(part); else n.delete(part);
      return n;
    });
  };

  const options = (part: AvatarPart) => {
    const list = thumbs[part];
    const cur = current(a, part);
    if (!list) return <p className="muted small thumbs-wait" aria-busy="true">···</p>;
    return (
      <div className="thumbs" data-testid={`av-${part}`}>
        {list.map((th) => (
          <button key={th.id} className={th.id === cur ? 'on' : ''} onClick={() => p.setAvatar(apply(a, part, th.id))} aria-pressed={th.id === cur} data-testid={`av-${part}-${th.id}`}>
            <ThumbCanvas th={th} />
            <span>{label(t, part, th.id)}</span>
          </button>
        ))}
      </div>
    );
  };

  const section = (part: AvatarPart, title: Key, extra?: React.ReactNode) => (
    <details className="group" open={open.has(part)} onToggle={toggle(part)}>
      <summary>{t(title)}</summary>
      {options(part)}
      {extra}
    </details>
  );

  const b = a.body ?? DEFAULT_BODY;
  const body = (
    <details className="group" open>
      <summary>{t('av_body')}</summary>
      <Seg label={t('b_age')} value={b.age} set={(v) => p.setBody({ ...b, age: v as BodyType['age'] })} opts={(['nino', 'adolescente', 'adulto', 'mayor'] as const).map((v) => [v, t(`age_${v}`)])} testid="b-age" />
      <Seg label={t('b_build')} value={b.build} set={(v) => p.setBody({ ...b, build: v as BodyType['build'] })} opts={(['delgado', 'medio', 'robusto'] as const).map((v) => [v, t(`build_${v}`)])} />
      <Seg label={t('b_shape')} value={b.shape} set={(v) => p.setBody({ ...b, shape: v as BodyType['shape'] })} opts={(['recto', 'curvas'] as const).map((v) => [v, t(`shape_${v}`)])} />
    </details>
  );
  const setFace = (k: keyof FaceParams, v: number) => p.setAvatar({ ...a, face: { ...a.face, [k]: v } });
  const setHair = (k: keyof HairParams, v: number) => p.setAvatar({ ...a, hair: { ...a.hair, params: { ...a.hair.params, [k]: v } } });

  return (
    <div className="avatar-step">
      <p className="muted small">{t('av_help')}</p>
      {p.canChooseHead && (
        <Seg label={t('av_head')} value={p.headMode} set={(v) => p.setHeadMode(v as 'avatar' | 'image')} opts={[['avatar', t('head_avatar')], ['image', t('head_image')]]} testid="head-mode" />
      )}
      <div className="row">
        <button className="btn ghost" onClick={p.random} data-testid="av-random">{t('av_random')}</button>
        {p.canReset && <button className="btn ghost" onClick={p.reset}>{t('av_reset')}</button>}
        <label className="btn ghost file-btn">
          {t('fromPhotoColors')}
          <input type="file" accept="image/*" data-testid="av-photo-colors" onChange={(e) => { const f = e.target.files?.[0]; if (f) p.photoColors(f); e.target.value = ''; }} />
        </label>
      </div>
      <Seg label={t('av_kit')} value={lpc ? 'lpc' : 'volumen'} set={(v) => p.setAvatar({ ...a, kit: v as 'lpc' | 'volumen', lpc: a.lpc ?? { ...DEFAULT_LPC } })} opts={[['lpc', t('kit_lpc')], ['volumen', t('kit_volumen')]]} testid="av-kit" />
      {lpc ? (
        <>
          <p className="muted small">{t('kit_lpcHelp')}</p>
          {body}
          <Seg label={t('av_expr')} value={p.mouth === 'open' ? 'line' : p.mouth} set={(v) => p.setMouth(v as 'line' | 'smile' | 'grin')} opts={[['line', t('expr_line')], ['smile', t('expr_smile')], ['grin', t('expr_grin')]]} testid="av-expr" />
          {section('lpcHead', 'av_headType')}
          {section('lpcHair', 'av_hair', <Swatches label={t('av_hairColor')} colors={HAIR_SWATCHES} value={a.hair.color} set={(c) => p.setAvatar({ ...a, hair: { ...a.hair, color: c } })} testid="av-hair-color" />)}
          <details className="group" open>
            <summary>{t('av_skin')}</summary>
            <Swatches label={t('av_skin')} colors={SKIN_SWATCHES} value={a.skin} set={(c) => p.setAvatar({ ...a, skin: c })} testid="av-skin" />
            <Swatches label={t('av_eyeColor')} colors={EYE_SWATCHES} value={a.eyes.color} set={(c) => p.setAvatar({ ...a, eyes: { ...a.eyes, color: c } })} />
          </details>
          {section('lpcBrows', 'av_brows')}
          {section('lpcNose', 'av_nose')}
          {section('lpcBeard', 'av_beard', <Swatches label={t('av_beardColor')} colors={HAIR_SWATCHES} value={a.beard.color} set={(c) => p.setAvatar({ ...a, beard: { ...a.beard, color: c } })} />)}
          {section('lpcMustache', 'av_mustache')}
          {section('lpcGlasses', 'av_glasses', <Swatches label={t('av_glassesColor')} colors={GLASSES_SWATCHES} value={a.glasses.color} set={(c) => p.setAvatar({ ...a, glasses: { ...a.glasses, color: c } })} />)}
          {section('lpcHat', 'av_hat', (
            <>
              <Swatches label={t('av_hatColor')} colors={HAT_SWATCHES} value={a.lpc?.hatColor ?? '#8a5a32'} set={(c) => p.setAvatar({ ...a, lpc: { ...(a.lpc ?? DEFAULT_LPC), hatColor: c } })} />
              <button className="btn ghost sm" onClick={() => p.setAvatar({ ...a, lpc: { ...(a.lpc ?? DEFAULT_LPC), hatColor: null } })}>{t('hat_original')}</button>
            </>
          ))}
        </>
      ) : (
        <>
      {body}
      {section('look', 'av_look')}
      {section('hair', 'av_hair', <Swatches label={t('av_hairColor')} colors={HAIR_SWATCHES} value={a.hair.color} set={(c) => p.setAvatar({ ...a, hair: { ...a.hair, color: c } })} testid="av-hair-color" />)}
      <details className="group" open>
        <summary>{t('av_skin')}</summary>
        <Swatches label={t('av_skin')} colors={SKIN_SWATCHES} value={a.skin} set={(c) => p.setAvatar({ ...a, skin: c })} testid="av-skin" />
      </details>
      {section('eyes', 'av_eyes', <Swatches label={t('av_eyeColor')} colors={EYE_SWATCHES} value={a.eyes.color} set={(c) => p.setAvatar({ ...a, eyes: { ...a.eyes, color: c } })} />)}
      {section('brows', 'av_brows')}
      {section('nose', 'av_nose')}
      {section('beard', 'av_beard', (
        <>
          <Swatches label={t('av_beardColor')} colors={HAIR_SWATCHES} value={a.beard.color} set={(c) => p.setAvatar({ ...a, beard: { ...a.beard, color: c } })} />
          <Slider label={t('av_gray')} value={a.beard.gray} min={0} max={1} step={0.05} fmt={(v) => `${Math.round(v * 100)}%`} set={(v) => p.setAvatar({ ...a, beard: { ...a.beard, gray: v } })} />
        </>
      ))}
      {section('glasses', 'av_glasses', <Swatches label={t('av_glassesColor')} colors={GLASSES_SWATCHES} value={a.glasses.color} set={(c) => p.setAvatar({ ...a, glasses: { ...a.glasses, color: c } })} />)}
        </>
      )}
      {!lpc && <details className="group">
        <summary>{t('av_face')}</summary>
        <div className="sliders">
          <Slider label={t('f_jaw')} value={a.face.jaw} min={0.7} max={1} step={0.02} fmt={(v) => `${Math.round(v * 100)}%`} set={(v) => setFace('jaw', v)} />
          <Slider label={t('f_chin')} value={a.face.chin} min={2} max={4.5} step={0.1} fmt={(v) => v.toFixed(1)} set={(v) => setFace('chin', v)} />
          <Slider label={t('f_forehead')} value={a.face.forehead} min={0.35} max={1} step={0.05} fmt={(v) => v.toFixed(2)} set={(v) => setFace('forehead', v)} />
          <Slider label={t('f_eyeX')} value={a.face.eyeX} min={0.34} max={0.5} step={0.01} fmt={(v) => v.toFixed(2)} set={(v) => setFace('eyeX', v)} />
          <Slider label={t('f_mouthChin')} value={a.face.mouthChin} min={0.4} max={0.75} step={0.02} fmt={(v) => v.toFixed(2)} set={(v) => setFace('mouthChin', v)} />
          <Slider label={t('f_ears')} value={a.face.ears} min={0.1} max={0.3} step={0.02} fmt={(v) => v.toFixed(2)} set={(v) => setFace('ears', v)} />
        </div>
      </details>}
      {!lpc && <details className="group">
        <summary>{t('av_hairFine')}</summary>
        <div className="sliders">
          <Slider label={t('hp_top')} value={a.hair.params.top} min={0} max={0.7} step={0.02} fmt={(v) => v.toFixed(2)} set={(v) => setHair('top', v)} />
          <Slider label={t('hp_side')} value={a.hair.params.side} min={0} max={0.5} step={0.02} fmt={(v) => v.toFixed(2)} set={(v) => setHair('side', v)} />
          <Slider label={t('hp_length')} value={a.hair.params.length} min={0.5} max={4} step={0.1} fmt={(v) => v.toFixed(1)} set={(v) => setHair('length', v)} />
          <Slider label={t('hp_recede')} value={a.hair.params.recede} min={0} max={1} step={0.05} fmt={(v) => `${Math.round(v * 100)}%`} set={(v) => setHair('recede', v)} />
          <Slider label={t('hp_fringe')} value={a.hair.params.fringe} min={0} max={1} step={0.05} fmt={(v) => `${Math.round(v * 100)}%`} set={(v) => setHair('fringe', v)} />
          <Slider label={t('hp_sweep')} value={a.hair.params.sweep} min={0} max={1} step={0.05} fmt={(v) => `${Math.round(v * 100)}%`} set={(v) => setHair('sweep', v)} />
        </div>
      </details>}
    </div>
  );
}
