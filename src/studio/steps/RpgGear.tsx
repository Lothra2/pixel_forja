import {
  type HumanFicha, type Gear, type HeroClass, type ArmorKind, type WeaponKind, type OffhandKind, type ArmorLine, type ArmorTier,
  HERO_CLASSES, ARMOR_KINDS, ARMOR_DEFAULT_COLOR, WEAPON_KINDS, OFFHAND_KINDS, ARMOR_EVOLUTION, findLoot, RARITY_COLORS,
} from '../../engine/index';
import type { Key } from '../i18n';
import { Seg, Select, Toggle, type T } from '../components/ui';

interface Props {
  t: T;
  h: HumanFicha;
  setOutfit: <K extends keyof HumanFicha['outfit']>(k: K, v: HumanFicha['outfit'][K]) => void;
  setGear: (g: Gear) => void;
  applyClass: (c: HeroClass | null) => void;
  setArmorTier: (line: ArmorLine, tier: ArmorTier, helmet: boolean) => void;
  lang?: 'es' | 'en';
}

function Color({ label, value, set }: { label: string; value: string; set: (v: string) => void }) {
  return (
    <label className="swatch">
      <input type="color" value={value} onChange={(e) => set(e.target.value)} />
      {label}
    </label>
  );
}

/** Equipo de RPG: clase de un toque, armadura, capa, armas y mano libre. */
export function RpgGear({ t, h, setOutfit, setGear, applyClass, setArmorTier, lang = 'es' }: Props) {
  const o = h.outfit;
  const g = h.gear ?? {};
  const armor = o.armor ?? null;
  const helmet = !!h.avatar?.lpc?.hat;
  const lootName = (id?: string | null) => (id ? findLoot(id)?.name[lang] : null);
  return (
    <details className="group" open={!!h.gear || !!o.armor} data-testid="rpg-gear">
      <summary>{t('rpg_gear')}</summary>
      <div className="field">
        <span>{t('rpg_class')}</span>
        <div className="chips" data-testid="rpg-class">
          {HERO_CLASSES.map((c) => (
            <button key={c} className="chip" onClick={() => applyClass(c)} data-testid={`class-${c}`}>{t(`class_${c}` as Key)}</button>
          ))}
          <button className="chip" onClick={() => applyClass(null)}>{t('rpg_noClass')}</button>
        </div>
      </div>
      <Seg
        label={t('rpg_armor')} value={armor ?? 'none'} testid="rpg-armor"
        set={(v) => (v === 'none' ? setOutfit('armor', null) : setArmorTier(v as ArmorKind, (o.armorTier ?? 1) as ArmorTier, helmet || !o.armor))}
        opts={[['none', t('none')], ...ARMOR_KINDS.map((k) => [k, t(`armor_${k}` as Key)] as [string, string])]}
      />
      {armor && (
        <div className="field" data-testid="rpg-tier">
          <span>{t('rpg_tier')}: <b>{h.outfit.armorTier ? ARMOR_EVOLUTION[armor][h.outfit.armorTier - 1].name[lang] : t('rpg_tierCustom')}</b></span>
          <div className="seg">
            {([1, 2, 3, 4, 5] as ArmorTier[]).map((n) => (
              <button key={n} className={h.outfit.armorTier === n ? 'on' : ''} aria-pressed={h.outfit.armorTier === n} data-testid={`tier-${n}`}
                onClick={() => setArmorTier(armor, n, helmet)} style={n >= 4 ? { color: n === 5 ? RARITY_COLORS.legendary : RARITY_COLORS.rare } : undefined}>{n}</button>
            ))}
          </div>
          <Toggle label={t('rpg_helmet')} on={helmet} set={(v) => setArmorTier(armor, (h.outfit.armorTier ?? 1) as ArmorTier, v)} testid="rpg-helmet" />
        </div>
      )}
      {armor && (
        <div className="row">
          <Color label={t('rpg_armorColor')} value={o.armorColor ?? ARMOR_DEFAULT_COLOR[armor]} set={(v) => setOutfit('armorColor', v)} />
          <Toggle label={t('rpg_pauldrons')} on={!!o.pauldrons} set={(v) => setOutfit('pauldrons', v)} />
        </div>
      )}
      <div className="row">
        <Toggle label={t('rpg_trim')} on={!!o.trim} set={(v) => setOutfit('trim', v ? '#e2b74a' : null)} />
        {o.trim && <Color label="" value={o.trim} set={(v) => setOutfit('trim', v)} />}
        <Toggle label={t('rpg_cape')} on={!!o.cape} set={(v) => setOutfit('cape', v ? '#7a1f2b' : null)} testid="rpg-cape" />
        {o.cape && <Color label="" value={o.cape} set={(v) => setOutfit('cape', v)} />}
        <Toggle label={t('rpg_belt')} on={!!o.belt} set={(v) => setOutfit('belt', v ? '#5a3a22' : null)} />
        {o.belt && <Color label="" value={o.belt} set={(v) => setOutfit('belt', v)} />}
      </div>
      <div className="row">
        <Select
          label={t('rpg_weapon')} value={g.main ?? 'none'} testid="rpg-weapon"
          set={(v) => setGear({ ...g, main: v === 'none' ? null : (v as WeaponKind), mainLoot: null })}
          opts={[['none', t('none')], ...WEAPON_KINDS.map((k) => [k, t(`weapon_${k}` as Key)] as [string, string])]}
        />
        <Select
          label={t('rpg_offhand')} value={g.off ?? 'none'} testid="rpg-offhand"
          set={(v) => setGear({ ...g, off: v === 'none' ? null : (v as OffhandKind), offLoot: null })}
          opts={[['none', t('none')], ...OFFHAND_KINDS.map((k) => [k, t(`off_${k}` as Key)] as [string, string])]}
        />
      </div>
      <div className="row">
        <Color label={t('rpg_glow')} value={g.glow ?? '#5fe0ff'} set={(v) => setGear({ ...g, glow: v })} />
        <Color label={t('rpg_shield')} value={g.shield ?? '#2f5fb8'} set={(v) => setGear({ ...g, shield: v })} />
      </div>
      {(g.mainLoot || g.offLoot) && (
        <p className="small" data-testid="rpg-loot">
          {g.mainLoot && <b style={{ color: RARITY_COLORS[findLoot(g.mainLoot)?.rarity ?? 'normal'] }}>{lootName(g.mainLoot)}</b>}
          {g.mainLoot && g.offLoot && ' · '}
          {g.offLoot && <b style={{ color: RARITY_COLORS[findLoot(g.offLoot)?.rarity ?? 'normal'] }}>{lootName(g.offLoot)}</b>}
        </p>
      )}
      <p className="muted small">{t('rpg_gearHelp')}</p>
    </details>
  );
}
