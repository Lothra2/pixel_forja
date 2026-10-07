import { useEffect, useRef } from 'react';
import {
  type Ficha, type HumanFicha, type AnimalFicha, type Proportions, type Variant, type ColorSlot, type AnimalColorSlot, type Species,
  SPECIES, BASE, isHuman,
} from '../../engine/index';
import type { Key } from '../i18n';
import { Seg, Toggle, Slider, type T } from '../components/ui';

interface Props {
  t: T;
  ficha: Ficha;
  name: string;
  setName: (s: string) => void;
  setOutfit: <K extends keyof HumanFicha['outfit']>(k: K, v: HumanFicha['outfit'][K]) => void;
  setFace: <K extends keyof HumanFicha['face']>(k: K, v: HumanFicha['face'][K]) => void;
  setColor: (slot: ColorSlot | AnimalColorSlot, hex: string) => void;
  setProportions: (p: Proportions) => void;
  setAnimal: (patch: Partial<Pick<AnimalFicha, 'markings'>> & { species?: Species; collar?: boolean }) => void;
  variants: { variants: Variant[]; thumbs: Uint8ClampedArray[] } | null;
  askVariants: () => void;
  pickVariant: (v: Variant) => void;
  canExtra: boolean;
  extraLoaded: { side: boolean; back: boolean };
  loadExtra: (view: 'side' | 'back', f: File | null) => void;
}

const P_KEYS: (keyof Omit<Proportions, 'preset'>)[] = ['height', 'build', 'legs', 'arms', 'head', 'shoulders', 'hips'];

function Thumb({ rgba }: { rgba: Uint8ClampedArray }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = 48; c.height = 48;
    c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(rgba), 48, 48), 0, 0);
  }, [rgba]);
  return <canvas ref={ref} className="pixel" style={{ width: 96, height: 96 }} />;
}

export function StyleStep(p: Props) {
  const { t, ficha } = p;
  const name = (
    <label className="field">
      {t('name')}
      <input value={p.name} onChange={(e) => p.setName(e.target.value)} data-testid="name" />
    </label>
  );
  if (!isHuman(ficha)) {
    const a = ficha;
    return (
      <>
        {name}
        <Seg label={t('species')} value={a.body.species} set={(v) => p.setAnimal({ species: v as Species })} opts={SPECIES.map((s) => [s, t(`species_${s}` as Key)])} />
        <div className="row">
          <Toggle label={t('markings')} on={a.markings.chest} set={(v) => p.setAnimal({ markings: { chest: v, paws: v, mask: a.markings.mask } })} />
          <Toggle label={t('collar')} on={!!a.palette.collar} set={(v) => p.setAnimal({ collar: v })} />
        </div>
        <fieldset className="colors">
          <legend>{t('colors')}</legend>
          {(['fur', 'fur2', 'dark', 'eyes', 'collar'] as AnimalColorSlot[]).map((slot) => {
            const val = slot === 'eyes' ? a.palette.eyes : slot === 'collar' ? a.palette.collar?.[BASE] ?? '#1f5fd6' : a.palette[slot][BASE];
            return (
              <label key={slot} className="swatch">
                <input type="color" value={val} onChange={(e) => p.setColor(slot, e.target.value)} />
                {t(`color_${slot}` as Key)}
              </label>
            );
          })}
        </fieldset>
      </>
    );
  }
  const h = ficha;
  const pr = h.body.proportions;
  return (
    <>
      {name}
      <details open className="group">
        <summary>{t('proportions')}</summary>
        <Seg label={t('preset')} value={pr.preset} set={(v) => p.setProportions({ ...pr, preset: v as Proportions['preset'] })} opts={(['chibi', 'juvenil', 'realista'] as const).map((v) => [v, t(`preset_${v}`)])} testid="preset" />
        <div className="sliders">
          {P_KEYS.map((k) => (
            <Slider key={k} label={t(`p_${k}` as Key)} value={pr[k]} min={k === 'head' ? 0.85 : 0.75} max={k === 'head' ? 1.15 : 1.35} step={0.05} fmt={(v) => `${Math.round(v * 100)}%`} set={(v) => p.setProportions({ ...pr, [k]: v })} />
          ))}
        </div>
        <button className="btn ghost" onClick={p.askVariants} data-testid="surprise">{t('surprise')}</button>
        {p.variants && (
          <>
            <p className="muted small">{t('surpriseHelp')}</p>
            <div className="variants">
              {p.variants.variants.map((v, i) => (
                <button key={i} onClick={() => p.pickVariant(v)} title={t(`preset_${v.proportions.preset}` as Key)}>
                  <Thumb rgba={p.variants!.thumbs[i]} />
                </button>
              ))}
            </div>
          </>
        )}
      </details>
      <details open className="group">
        <summary>{t('step_style')}</summary>
        <Seg label={t('sleeves')} value={h.outfit.sleeves} set={(v) => p.setOutfit('sleeves', v as HumanFicha['outfit']['sleeves'])} opts={(['none', 'short', 'long'] as const).map((v) => [v, t(`sleeves_${v}`)])} />
        <Seg label={t('bottom')} value={h.outfit.bottom} set={(v) => p.setOutfit('bottom', v as HumanFicha['outfit']['bottom'])} opts={(['shorts', 'pants', 'skirt'] as const).map((v) => [v, t(`bottom_${v}`)])} />
        <Seg label={t('socks')} value={h.outfit.socks} set={(v) => p.setOutfit('socks', v as HumanFicha['outfit']['socks'])} opts={(['none', 'low', 'knee'] as const).map((v) => [v, t(`socks_${v}`)])} />
        <div className="row">
          <label className="field narrow">
            {t('number')}
            <input value={h.outfit.number ?? ''} maxLength={2} inputMode="numeric" onChange={(e) => p.setOutfit('number', e.target.value.replace(/\D/g, '').slice(0, 2) || undefined)} data-testid="number" />
          </label>
          <label className="swatch">
            <input type="color" value={h.outfit.numberColor ?? '#ffffff'} onChange={(e) => p.setOutfit('numberColor', e.target.value)} />
            {t('numberColor')}
          </label>
          <Toggle label={t('gloves')} on={!!h.outfit.gloves} set={(v) => p.setOutfit('gloves', v)} />
        </div>
        <Seg label={t('eyes')} value={h.face.eyes} set={(v) => p.setFace('eyes', v as HumanFicha['face']['eyes'])} opts={(['round', 'big', 'small'] as const).map((v) => [v, t(`eyes_${v}`)])} />
        <Seg label={t('mouth')} value={h.face.mouth} set={(v) => p.setFace('mouth', v as HumanFicha['face']['mouth'])} opts={(['smile', 'line', 'open'] as const).map((v) => [v, t(`mouth_${v}`)])} />
        <div className="row">
          <Toggle label={t('blush')} on={h.face.blush} set={(v) => p.setFace('blush', v)} />
          <Toggle label={t('brows')} on={h.face.brows} set={(v) => p.setFace('brows', v)} />
          <Toggle label={t('glasses')} on={!!h.face.glasses} set={(v) => p.setFace('glasses', v ? h.face.glasses || '#1d3c78' : null)} />
        </div>
      </details>
      <fieldset className="colors">
        <legend>{t('colors')}</legend>
        {(['skin', 'hair', 'eyes', 'top', 'bottom', 'socks', 'shoes', 'accessory'] as ColorSlot[]).map((slot) => (
          <label key={slot} className="swatch">
            <input type="color" value={slot === 'eyes' ? h.palette.eyes : h.palette[slot][BASE]} onChange={(e) => p.setColor(slot, e.target.value)} />
            {slot === 'accessory' ? t('zone_accessory') : t(`color_${slot}` as Key)}
          </label>
        ))}
      </fieldset>
      {p.canExtra && (
        <details className="group">
          <summary>{t('extraViews')}</summary>
          <p className="muted small">{t('extraHelp')}</p>
          <div className="row">
            {(['side', 'back'] as const).map((v) => (
              <label key={v} className="btn ghost file-btn">
                {t(`extra_${v}`)}{p.extraLoaded[v] ? ` · ${t('extraLoaded')}` : ''}
                <input type="file" accept="image/*" onChange={(e) => p.loadExtra(v, e.target.files?.[0] ?? null)} />
              </label>
            ))}
          </div>
        </details>
      )}
    </>
  );
}
