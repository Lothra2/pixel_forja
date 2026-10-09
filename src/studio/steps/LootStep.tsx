import { useEffect, useMemo, useRef, useState } from 'react';
import {
  allBases, allArmor, allMisc, allPetArmor, LEGENDARIES, SET_ITEMS, SET_BONUS, rollItem, lootFrames, modText, RARITY_COLORS, ARMOR_LINES, ARMOR_EVOLUTION, ARMOR_SLOTS, baseArmor,
  CHEST_TIERS, chestFrames, coinFrames, PILE_SIZES, pileFrames, coinBurstFrames, dropFrames, beamFrames, exportLootIcons, exportLootWorld, exportLootCatalog, exportLootAll,
  type LootItem, type Raster, type ArmorLine,
} from '../../engine/index';
import type { Key } from '../i18n';
import { Seg, Toggle, type T } from '../components/ui';
import { downloadFiles } from '../util';

/** Lienzo animado de cuadros RGBA de cualquier tamaño (sin suavizar). */
export function RasterAnim({ frames, fps, zoom, testid }: { frames: Raster[]; fps: number; zoom: number; testid?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || !frames.length) return;
    const { w, h } = frames[0];
    c.width = w; c.height = h;
    const ctx = c.getContext('2d')!;
    const imgs = frames.map((f) => new ImageData(new Uint8ClampedArray(f.data), f.w, f.h));
    ctx.clearRect(0, 0, w, h);
    ctx.putImageData(imgs[0], 0, 0);
    if (imgs.length < 2) return;
    let raf = 0, last = 0, i = 0;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const tick = (tm: number) => {
      if (tm - last >= 1000 / fps) { last = tm; ctx.clearRect(0, 0, w, h); ctx.putImageData(imgs[i], 0, 0); i = (i + 1) % imgs.length; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [frames, fps]);
  const w = frames[0]?.w ?? 1, h = frames[0]?.h ?? 1;
  return <canvas ref={ref} className="pixel" style={{ width: w * zoom, height: h * zoom }} data-testid={testid} />;
}

type Tab = 'legend' | 'weapons' | 'armor' | 'misc' | 'world';

function LootTile({ item, px, slot, on, pick }: { item: LootItem; px: 32 | 64; slot: boolean; on: boolean; pick: (i: LootItem) => void }) {
  const frames = useMemo(() => lootFrames(item, px, slot), [item, px, slot]);
  return (
    <button className={`loot-tile ${on ? 'on' : ''}`} onClick={() => pick(item)} title={item.name.es} data-testid={`loot-${item.id}`} style={{ ['--rar' as string]: RARITY_COLORS[item.rarity] }}>
      <RasterAnim frames={frames} fps={10} zoom={px === 32 ? 2 : 1} />
    </button>
  );
}

/** se puede llevar puesto: armas, piezas de armadura y mano libre (menos el carcaj) */
const wearable = (i: LootItem) => i.base.cat === 'weapon' || i.base.cat === 'armor' || i.base.cat === 'pet' || (i.base.cat === 'offhand' && i.base.icon !== 'quiver');

function Detail({ item, t, lang, equip, hero }: { item: LootItem; t: T; lang: 'es' | 'en'; equip?: (i: LootItem) => void; hero?: string | null }) {
  const big = useMemo(() => lootFrames(item, 64, true), [item]);
  const drop = useMemo(() => dropFrames(item, 32), [item]);
  const s = item.stats;
  return (
    <div className="loot-detail" data-testid="loot-detail">
      <div className="loot-detail-art">
        <RasterAnim frames={big} fps={10} zoom={2} />
        <RasterAnim frames={drop} fps={12} zoom={2} />
      </div>
      <h3 style={{ color: RARITY_COLORS[item.rarity] }} data-testid="loot-name">{item.name[lang]}</h3>
      <p className="muted small">{t(`rar_${item.rarity}` as Key)} · {t('loot_level')} {item.level}{item.twoHanded ? ` · ${t('loot_twoHanded')}` : ''}</p>
      <ul className="loot-stats">
        {s.damage && <li>{t('loot_damage')}: <b>{s.damage[0]}-{s.damage[1]}</b> · {s.speed} {t('loot_speed')}</li>}
        {s.defense !== undefined && <li>{t('loot_defense')}: <b>{s.defense}</b>{s.block ? ` · ${t('loot_block')} ${s.block}%` : ''}</li>}
        {s.mods.map((m, i) => <li key={i} className="mod">{modText(m, lang)}</li>)}
      </ul>
      {item.set && (
        <div className="loot-set">
          <b style={{ color: RARITY_COLORS.set }}>{t('loot_setName')}</b>
          {SET_BONUS.map((b) => <span key={b.pieces} className="muted small">({b.pieces}) {b.mods.map((m) => modText(m, lang)).join(', ')}</span>)}
        </div>
      )}
      {item.flavor && <p className="flavor">“{item.flavor[lang]}”</p>}
      {equip && wearable(item) && (
        <>
          <button className="btn" onClick={() => equip(item)} data-testid="loot-equip">{t('loot_equip')}</button>
          <span className="muted small">{item.base.cat === 'pet' ? `${t('loot_equipOn')} Thor` : hero ? `${t('loot_equipOn')} ${hero}` : t('loot_equipRick')}</span>
        </>
      )}
    </div>
  );
}

function World({ t, item }: { t: T; item: LootItem | null }) {
  const [px, setPx] = useState<32 | 48 | 64>(48);
  const chests = useMemo(() => CHEST_TIERS.map((c) => ({ c, open: chestFrames(c, px), idle: chestFrames(c, px, true) })), [px]);
  const coins = useMemo(() => coinFrames(16), []);
  const piles = useMemo(() => PILE_SIZES.map((s) => pileFrames(s)), []);
  const burst = useMemo(() => coinBurstFrames(48), []);
  const beams = useMemo(() => (['magic', 'rare', 'set', 'legendary'] as const).map((r) => beamFrames(r)), []);
  const drop = useMemo(() => (item ? dropFrames(item, 32) : null), [item]);
  return (
    <div className="loot-world" data-testid="loot-world">
      <Seg label={t('size')} value={String(px)} set={(v) => setPx(+v as 32)} opts={[['32', '32'], ['48', '48'], ['64', '64']]} />
      <h4>{t('loot_chests')}</h4>
      <div className="world-row">
        {chests.map(({ c, open, idle }) => (
          <figure key={c} className="world-card" data-testid={`chest-${c}`}>
            <div className="world-pair"><RasterAnim frames={idle} fps={8} zoom={2} /><RasterAnim frames={[...open, ...open.slice(-1), ...open.slice(-1), ...open.slice(-1)]} fps={10} zoom={2} /></div>
            <figcaption>{t(`chest_${c}` as Key)}</figcaption>
          </figure>
        ))}
      </div>
      <h4>{t('loot_gold')}</h4>
      <div className="world-row">
        <figure className="world-card"><RasterAnim frames={coins} fps={12} zoom={4} /><figcaption>{t('loot_coin')}</figcaption></figure>
        {piles.map((p, i) => <figure key={i} className="world-card"><RasterAnim frames={p} fps={6} zoom={3} /><figcaption>{t(`pile_${PILE_SIZES[i]}` as Key)}</figcaption></figure>)}
        <figure className="world-card"><RasterAnim frames={burst} fps={14} zoom={2} /><figcaption>{t('loot_burst')}</figcaption></figure>
      </div>
      <h4>{t('loot_drops')}</h4>
      <div className="world-row">
        {beams.map((b, i) => <figure key={i} className="world-card"><RasterAnim frames={b} fps={10} zoom={2} /><figcaption>{t(`rar_${(['magic', 'rare', 'set', 'legendary'] as const)[i]}` as Key)}</figcaption></figure>)}
        {drop && <figure className="world-card"><RasterAnim frames={drop} fps={12} zoom={3} /><figcaption>{item!.name.es}</figcaption></figure>}
      </div>
    </div>
  );
}

export function LootStep({ t, lang, equip, hero }: { t: T; lang: 'es' | 'en'; equip?: (i: LootItem) => void; hero?: string | null }) {
  const [tab, setTab] = useState<Tab>('legend');
  const [px, setPx] = useState<32 | 64>(32);
  const [slot, setSlot] = useState(true);
  const [grade, setGrade] = useState<'1' | '2' | '3' | 'magic' | 'rare'>('1');
  const [seed, setSeed] = useState(1);
  const [line, setLine] = useState<ArmorLine | 'all'>('all');
  const [sel, setSel] = useState<LootItem | null>(null);
  const items: LootItem[] = useMemo(() => {
    if (tab === 'legend') return [...LEGENDARIES, ...SET_ITEMS];
    if (tab === 'weapons') {
      const g = grade === 'magic' || grade === 'rare' ? 2 : (+grade as 1 | 2 | 3);
      const base = allBases().filter((b) => b.grade === g);
      return grade === 'magic' || grade === 'rare' ? base.map((b, i) => rollItem(b, grade, seed * 100 + i)) : base;
    }
    if (tab === 'armor') return line === 'all' ? allArmor() : ARMOR_SLOTS.flatMap((s) => ([1, 2, 3, 4, 5] as const).map((tier) => baseArmor(s, line, tier)));
    if (tab === 'misc') return [...allPetArmor(), ...allMisc()];
    return [];
  }, [tab, grade, seed, line]);
  const current = sel && (tab === 'world' || items.some((i) => i.id === sel.id)) ? sel : items[0] ?? null;
  const [busy, setBusy] = useState(false);
  const exp = (which: 'view' | 'all' | 'world' | 'catalog') => {
    setBusy(true);
    // deja pintar el "trabajando" antes de generar (en el hilo principal)
    setTimeout(() => {
      try {
        const files = which === 'all' ? exportLootAll() : which === 'world' ? exportLootWorld() : which === 'catalog' ? exportLootCatalog() : [...exportLootIcons(items, px, slot, `botin_${tab}_${px}`), ...exportLootCatalog(items, `botin_${tab}_catalogo`)];
        downloadFiles(files, which === 'all' ? 'botin.zip' : `botin_${which === 'view' ? tab : which}.zip`);
      } finally { setBusy(false); }
    }, 30);
  };
  return (
    <section className="panel wide loot" data-testid="loot">
      <div className="loot-head">
        <div>
          <h3 className="h2">{t('loot_title')}</h3>
          <p className="muted small">{t('loot_help')}</p>
        </div>
        <div className="loot-actions">
          {tab !== 'world' && <button className="btn" disabled={busy} onClick={() => exp('view')} data-testid="loot-export">{t('loot_exportView')}</button>}
          {tab === 'world' && <button className="btn" disabled={busy} onClick={() => exp('world')} data-testid="loot-export-world">{t('loot_exportWorld')}</button>}
          <button className="btn ghost" disabled={busy} onClick={() => exp('all')} data-testid="loot-export-all">{busy ? t('working') : t('loot_exportAll')}</button>
        </div>
      </div>
      <div className="loot-tabs" role="tablist">
        {(['legend', 'weapons', 'armor', 'misc', 'world'] as Tab[]).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`chip ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)} data-testid={`loot-tab-${k}`}>{t(`loot_tab_${k}` as Key)}</button>
        ))}
      </div>
      {tab !== 'world' && (
        <div className="loot-bar">
          {tab === 'weapons' && (
            <Seg label={t('loot_grade')} value={grade} set={(v) => setGrade(v as typeof grade)} testid="loot-grade"
              opts={[['1', t('grade_1')], ['2', t('grade_2')], ['3', t('grade_3')], ['magic', t('rar_magic')], ['rare', t('rar_rare')]]} />
          )}
          {tab === 'weapons' && (grade === 'magic' || grade === 'rare') && <button className="btn ghost sm" onClick={() => setSeed((x) => x + 1)} data-testid="loot-reroll">🎲 {t('loot_reroll')}</button>}
          {tab === 'armor' && (
            <Seg label={t('loot_line')} value={line} set={(v) => setLine(v as ArmorLine | 'all')} opts={[['all', t('loot_all')], ...ARMOR_LINES.map((l) => [l, t(`armor_${l}` as Key)] as [string, string])]} />
          )}
          <Seg label={t('it_px')} value={String(px)} set={(v) => setPx(+v as 32)} opts={[['32', '32'], ['64', '64']]} />
          <Toggle label={t('it_frame')} on={slot} set={setSlot} />
        </div>
      )}
      {tab === 'world' ? <World t={t} item={current} /> : (
        <div className="loot-body">
          <div>
            {tab === 'armor' && (
              <div className="loot-evo">
                <p className="muted small">{t('loot_evoHelp')}</p>
                {(line === 'all' ? ARMOR_LINES : [line]).map((l) => (
                  <div key={l} className="evo-names"><b>{t(`armor_${l}` as Key)}</b>{ARMOR_EVOLUTION[l].map((x, i) => <span key={i}>{i + 1}. {x.name[lang]}</span>)}</div>
                ))}
              </div>
            )}
            <div className={`loot-grid ${px === 64 ? 'big' : ''}`} data-testid="loot-grid">
              {items.map((it) => <LootTile key={it.id} item={it} px={px} slot={slot} on={current?.id === it.id} pick={setSel} />)}
            </div>
          </div>
          {current && <Detail item={current} t={t} lang={lang} equip={equip} hero={hero} />}
        </div>
      )}
      <p className="muted small">{t('loot_exportHelp')}</p>
    </section>
  );
}
