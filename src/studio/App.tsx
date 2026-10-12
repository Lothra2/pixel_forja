import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Engine } from './client';
import { translator, animLabel, type Lang, type Key } from './i18n';
import type { AnalyzeParams, AnalyzeResult, FrameSet } from './protocol';
import { ImageStage, ZONE_COLORS } from './components/ImageStage';
import { Preview, type PreviewBg } from './components/Preview';
import { Showcase, SHOW_DIRS } from './components/Showcase';
import { demoCast } from './showcase';
import { Seg, Select, Toggle, DirPad, Logo, type T } from './components/ui';
import { StyleStep } from './steps/StyleStep';
import { EditorStep } from './steps/EditorStep';
import { ExportStep } from './steps/ExportStep';
import { AvatarStep } from './steps/AvatarStep';
import { EnemiesStep, FxStep, FamilyRow, HeroRow } from './steps/RpgTools';
import { LootStep } from './steps/LootStep';
import { FontsStep } from './steps/FontsStep';
import { EffectsStep } from './steps/EffectsStep';
import { InterfaceStep } from './steps/InterfaceStep';
import { AudioStep } from './steps/AudioStep';
import { loadGallery, saveGallery, upsert, type GalleryItem } from './gallery';
import { download, downloadFiles, fileToPayload, payloadTransfer, thumbnail, safeName } from './util';
import {
  type Ficha, type HumanFicha, type CellSize, type HeadSpec, type Point, type Zone, type QAReport, type ColorSlot, type AnimalColorSlot,
  type Proportions, type Species, type ViewName, type ExportKind, type ExportPlan, type Variant, type CustomAnim, type Avatar, type AvatarPart,
  DEFAULT_BG_TOLERANCE, validateFicha, migrateFicha, withVariant, variantNames, HELD_ANIMS, FLOOR_PROPS, type FloorPropKind, recolor, isHuman, animsFor, makeRamp, SPECIES, fichaFromAvatar, randomAvatar, defaultAvatar, applyPhotoColors, bodyProportions, type BodyType,
  applyClass, CLASS_KITS, enemyFicha, enemyCell, enemyAnims, type Gear, type HeroClass, type EnemyId,
  familyFicha, thorFicha, type FamilyId, applyArmorTier, equipLoot, type ArmorLine, type ArmorTier, type LootItem,
  isPremiumClip, type MovementProfile, heroFicha, heroCell, type HeroId,
} from '../engine/index';

type Step = 'image' | 'bg' | 'zones' | 'head' | 'avatar' | 'style' | 'animate' | 'editor' | 'export' | ToolStep;
/** herramientas del Taller RPG: páginas sueltas, fuera de los pasos */
type ToolStep = 'enemies' | 'fx' | 'items' | 'fonts' | 'effects' | 'interface' | 'audio';
const TOOLS: Step[] = ['enemies', 'fx', 'items', 'fonts', 'effects', 'interface', 'audio'];
const HUMAN_STEPS: Step[] = ['image', 'bg', 'zones', 'head', 'avatar', 'style', 'animate', 'editor', 'export'];
const ANIMAL_STEPS: Step[] = ['image', 'bg', 'style', 'animate', 'export'];
const EDIT_ZONES: Zone[] = ['hair', 'beard', 'skin', 'face', 'top', 'bottom', 'socks', 'shoes', 'accessory', 'line'];
const SAMPLES: { name: string; kind: 'human' | 'animal'; species?: Species }[] = [
  { name: 'gabo', kind: 'human' }, { name: 'portero', kind: 'human' }, { name: 'sofi', kind: 'human' }, { name: 'nena', kind: 'human' },
  { name: 'mama', kind: 'human' }, { name: 'papa', kind: 'human' }, { name: 'thor', kind: 'animal', species: 'boxer' },
];
const ARTIFACT = !!import.meta.env.VITE_ARTIFACT;

/** Pone el avatar en la ficha y sincroniza los colores del cuerpo (piel, pelo, ojos). */
function withAvatar(f: HumanFicha, av: Avatar): HumanFicha {
  return { ...f, avatar: av, palette: { ...f.palette, skin: makeRamp(av.skin), hair: makeRamp(av.hair.color), eyes: av.eyes.color } };
}

function storedLang(): Lang {
  try {
    const v = localStorage.getItem('pf.lang');
    if (v === 'es' || v === 'en') return v;
  } catch { /* sin almacenamiento */ }
  return navigator.language?.startsWith('en') ? 'en' : 'es';
}

interface Overrides {
  outfit: Partial<HumanFicha['outfit']>;
  face: Partial<HumanFicha['face']>;
  colors: Partial<Record<ColorSlot | AnimalColorSlot, string>>;
  proportions?: Proportions;
  customAnims: CustomAnim[];
  /** el avatar editado en el creador (pisa al que propone la imagen) */
  avatar?: Avatar;
  headMode?: 'avatar' | 'image';
  /** equipo de RPG (arma y mano libre) */
  gear?: Gear;
  /** cómo se mueve: clásico o premium (poses clave de verdad) */
  movementProfile?: MovementProfile;
}
const emptyOverrides = (): Overrides => ({ outfit: {}, face: {}, colors: {}, customAnims: [] });

export function App() {
  const engine = useMemo(() => new Engine(), []);
  const [lang, setLang] = useState<Lang>(storedLang);
  const t = useMemo(() => translator(lang), [lang]);
  const [step, setStep] = useState<Step>('image');
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [kind, setKind] = useState<'human' | 'animal'>('human');
  const [species, setSpecies] = useState<Species>('boxer');
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('personaje');
  const [params, setParams] = useState<AnalyzeParams>({ bgTolerance: DEFAULT_BG_TOLERANCE, bgStrokes: [], zoneEdits: [] });
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [extraLoaded, setExtraLoaded] = useState({ side: false, back: false });
  const [buildTick, setBuildTick] = useState(0);
  const overrides = useRef<Overrides>(emptyOverrides());
  /** el avatar que propuso la imagen, para volver a él */
  const fittedAvatar = useRef<Avatar | null>(null);

  const [cell, setCell] = useState<CellSize>(48);
  const [anim, setAnim] = useState('walk');
  const [view, setView] = useState<ViewName>('side');
  const [bg, setBg] = useState<PreviewBg>('studio');
  /** variante de ropa que se está viendo ('' = la ropa de la ficha) */
  const [outfitVar, setOutfitVar] = useState('');
  /** el arma del piso que se ve en la mano en las animaciones de armas */
  const [heldKind, setHeldKind] = useState<FloorPropKind | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try { return localStorage.getItem('pf.theme') === 'light' ? 'light' : 'dark'; } catch { return 'dark'; }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('pf.theme', theme); } catch { /* sin almacenamiento */ }
  }, [theme]);
  // vitrina de la portada: tres personajes de muestra en las 8 direcciones
  const [showcase, setShowcase] = useState<(FrameSet | undefined)[][]>([]);
  const showcaseStarted = useRef(false);
  useEffect(() => {
    if (step !== 'image' || showcaseStarted.current) return;
    showcaseStarted.current = true;
    (async () => {
      const cast = demoCast();
      const out: (FrameSet | undefined)[][] = cast.map(() => []);
      // primero una dirección por personaje para que aparezcan rápido, después el resto
      for (const round of [[7], [0, 1, 2, 3, 4, 5, 6]])
        for (const di of round)
          for (let k = 0; k < cast.length; k++) {
            const r = await engine.call<'rendered'>({ type: 'render', key: `show${k}`, ficha: cast[k], cell: 48, anim: 'walk', view: SHOW_DIRS[di], props: false }).catch(() => null);
            if (r) out[k][di] = r.clip;
            if (round.length === 1 && k === cast.length - 1) setShowcase(out.map((d) => [...d]));
          }
      setShowcase(out.map((d) => [...d]));
    })();
  }, [step, engine]);
  const [props, setProps] = useState(true);
  const [clip, setClip] = useState<FrameSet | null>(null);
  const [compareOn, setCompareOn] = useState(false);
  const [compareClip, setCompareClip] = useState<FrameSet | null>(null);
  const [qa, setQa] = useState<QAReport | null>(null);
  const [variants, setVariants] = useState<{ variants: Variant[]; thumbs: Uint8ClampedArray[] } | null>(null);
  const [gallery, setGallery] = useState<GalleryItem[]>(loadGallery);
  const [savedMsg, setSavedMsg] = useState(false);

  const [bgBrush, setBgBrush] = useState<'fg' | 'bg'>('fg');
  const [brushR, setBrushR] = useState(6);
  const [zoneSel, setZoneSel] = useState<Zone>('hair');
  const [zoneTool, setZoneTool] = useState<'wand' | 'brush'>('wand');
  const [headTool, setHeadTool] = useState<'box' | 'eyes'>('box');
  const [dragBox, setDragBox] = useState<HeadSpec | null>(null);
  const pendingEye = useRef<Point | null>(null);

  useEffect(() => {
    try { localStorage.setItem('pf.lang', lang); } catch { /* sin almacenamiento */ }
    document.documentElement.lang = lang;
  }, [lang]);

  const run = useCallback(async <R,>(fn: () => Promise<R>): Promise<R | undefined> => {
    setBusy((b) => b + 1);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy((b) => b - 1);
    }
  }, []);

  const steps = kind === 'human' ? HUMAN_STEPS : ANIMAL_STEPS;
  const stepIdx = steps.indexOf(step);
  const needsFicha = step === 'avatar' || step === 'style' || step === 'animate' || step === 'editor' || step === 'export';

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
    const o = overrides.current;
    let out: Ficha = f;
    if (isHuman(out)) {
      out = { ...out, outfit: { ...out.outfit, ...o.outfit }, face: { ...out.face, ...o.face }, customAnims: o.customAnims.length ? o.customAnims : out.customAnims };
      if (o.proportions) out = { ...out, body: { ...out.body, proportions: o.proportions } } as HumanFicha;
      if (o.avatar) out = withAvatar(out, o.avatar);
      if (o.headMode && out.avatar) out = { ...out, headMode: o.headMode };
      if (o.gear) out = { ...out, gear: o.gear } as HumanFicha;
      if (o.movementProfile) out = { ...out, movementProfile: o.movementProfile };
    }
    for (const [slot, hex] of Object.entries(o.colors)) out = recolor(out, slot as ColorSlot, hex!);
    return out;
  }, []);

  // ficha: se reconstruye desde la imagen al pasar a estilo y cuando cambia algo de la imagen o las proporciones
  useEffect(() => {
    if (!loaded || !needsFicha) return;
    const id = setTimeout(() => {
      run(async () => {
        const r = kind === 'human'
          ? await engine.call<'built'>({ type: 'build', params, name, outfit: overrides.current.outfit, face: overrides.current.face, proportions: overrides.current.proportions })
          : await engine.call<'built'>({ type: 'buildAnimal', name, species, bgTolerance: params.bgTolerance, bgStrokes: params.bgStrokes });
        if (r) {
          fittedAvatar.current = isHuman(r.ficha) ? r.ficha.avatar ?? null : null;
          setFicha(applyOverrides(r.ficha));
        }
      });
    }, 150);
    return () => clearTimeout(id);
    // el nombre y la especie se aplican sin reconstruir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, needsFicha, params, engine, run, applyOverrides, kind, buildTick]);

  // animación de la vista previa
  const animList = useMemo(() => (ficha ? animsFor(ficha) : []), [ficha]);
  useEffect(() => {
    if (ficha && animList.length && !animList.some((a) => a.name === anim)) setAnim(animList.some((a) => a.name === 'walk') ? 'walk' : animList[0].name);
  }, [animList, anim, ficha]);
  // vestuario: la ficha con la variante elegida (la ficha guardada no cambia)
  const wardrobeNames = useMemo(() => (ficha ? variantNames(ficha) : []), [ficha]);
  useEffect(() => { if (outfitVar && !wardrobeNames.includes(outfitVar)) setOutfitVar(''); }, [wardrobeNames, outfitVar]);
  const dressed = useMemo(() => (ficha && outfitVar && isHuman(ficha) ? withVariant(ficha, ficha.wardrobe?.variants[outfitVar]) : ficha), [ficha, outfitVar]);
  const heldInfo = HELD_ANIMS[anim];
  const held = heldInfo ? (heldKind && heldInfo.kinds.includes(heldKind) ? heldKind : heldInfo.default) : null;
  useEffect(() => {
    if (!dressed || !needsFicha || step === 'editor' || !animList.some((a) => a.name === anim)) return;
    run(async () => {
      const r = await engine.call<'rendered'>({ type: 'render', ficha: dressed, cell, anim, view, props, ...(held && props ? { held: { kind: held } } : {}) });
      if (r) { setClip(r.clip); setQa(r.qa); }
    });
  }, [dressed, cell, anim, view, props, needsFicha, step, engine, run, animList, held]);
  // comparador: la misma animación con el otro perfil, al lado
  const canCompare = !!ficha && isHuman(ficha) && isPremiumClip({ ...ficha, movementProfile: 'premium' }, anim) && !ficha.customAnims?.some((c) => c.name === anim);
  useEffect(() => {
    if (!compareOn || !canCompare || !ficha || !isHuman(ficha) || step === 'editor') { setCompareClip(null); return; }
    const otherProfile: MovementProfile = ficha.movementProfile === 'premium' ? 'classic' : 'premium';
    let live = true;
    engine.call<'rendered'>({ type: 'render', key: 'compare', ficha: { ...(dressed as HumanFicha), movementProfile: otherProfile }, cell, anim, view, props })
      .then((r) => { if (r && live) setCompareClip(r.clip); })
      .catch(() => {});
    return () => { live = false; };
  }, [compareOn, canCompare, ficha, dressed, cell, anim, view, props, step, engine]);

  // ---------- carga ----------
  const loadFile = (file: Blob, fileName: string, k: 'human' | 'animal' = kind, sp: Species = species) =>
    run(async () => {
      const payload = await fileToPayload(file);
      await engine.call<'loaded'>({ type: 'load', ...payload }, payloadTransfer(payload));
      overrides.current = emptyOverrides();
      setKind(k);
      setSpecies(sp);
      setName(safeName(fileName.replace(/\.[a-z]+$/i, '')));
      setFicha(null);
      setClip(null);
      setVariants(null);
      setExtraLoaded({ side: false, back: false });
      setParams({ bgTolerance: DEFAULT_BG_TOLERANCE, bgStrokes: [], zoneEdits: [] });
      setLoaded(true);
      setStep('bg');
    });

  const loadSample = (s: (typeof SAMPLES)[number]) =>
    run(async () => {
      const res = await fetch(`./samples/${s.name}.png`);
      await loadFile(await res.blob(), s.name, s.kind, s.species ?? species);
    });

  const openFicha = (f: Ficha) => {
    overrides.current = { ...emptyOverrides(), customAnims: isHuman(f) ? f.customAnims ?? [] : [] };
    setLoaded(false);
    setAnalysis(null);
    setKind(isHuman(f) ? 'human' : 'animal');
    setFicha(f);
    setName(f.name);
    setVariants(null);
    setStep('animate');
  };
  const openFichaFile = (file: File) =>
    run(async () => {
      const raw = JSON.parse(await file.text());
      const errs = validateFicha(raw);
      if (errs.length) throw new Error(errs.join('. '));
      const f = migrateFicha(raw);
      openFicha(f);
      // un gigante trae su celda en la ficha
      if (isHuman(f) && f.cell) setCell(f.cell);
    });

  const loadExtra = (v: 'side' | 'back', file: File | null) =>
    run(async () => {
      if (!file) {
        await engine.call<'loaded'>({ type: 'clearExtra', view: v });
        setExtraLoaded((e) => ({ ...e, [v]: false }));
      } else {
        const payload = await fileToPayload(file);
        await engine.call<'loaded'>({ type: 'loadExtra', view: v, ...payload }, payloadTransfer(payload));
        setExtraLoaded((e) => ({ ...e, [v]: true }));
      }
      setBuildTick((n) => n + 1);
    });

  // ---------- cambios de estilo ----------
  const updateFicha = (fn: (f: Ficha) => Ficha) => setFicha((f) => (f ? fn(f) : f));
  const setMovement = (p: MovementProfile) => {
    overrides.current.movementProfile = p;
    updateFicha((f) => (isHuman(f) ? { ...f, movementProfile: p } : f));
  };
  const setOutfit = <K extends keyof HumanFicha['outfit']>(k: K, v: HumanFicha['outfit'][K]) => {
    overrides.current.outfit[k] = v;
    updateFicha((f) => (isHuman(f) ? { ...f, outfit: { ...f.outfit, [k]: v } } : f));
  };
  const setFace = <K extends keyof HumanFicha['face']>(k: K, v: HumanFicha['face'][K]) => {
    overrides.current.face[k] = v;
    updateFicha((f) => (isHuman(f) ? { ...f, face: { ...f.face, [k]: v } } : f));
  };
  const setColor = (slot: ColorSlot | AnimalColorSlot, hex: string) => {
    overrides.current.colors[slot] = hex;
    updateFicha((f) => recolor(f, slot, hex));
  };
  const setProportions = (p: Proportions) => {
    overrides.current.proportions = p;
    if (loaded) setBuildTick((n) => n + 1); // la cabeza se vuelve a pixelar al tamaño nuevo
    else updateFicha((f) => (isHuman(f) ? { ...f, body: { ...f.body, proportions: p } } : f));
  };
  const setAnimal = (patch: { species?: Species; collar?: boolean; markings?: { chest: boolean; paws: boolean; mask: boolean }; barding?: number }) => {
    if (patch.species) setSpecies(patch.species);
    updateFicha((f) => {
      if (isHuman(f)) return f;
      const out = structuredClone(f);
      if (patch.species) out.body.species = patch.species;
      if (patch.markings) out.markings = patch.markings;
      if (patch.collar !== undefined) out.palette.collar = patch.collar ? out.palette.collar ?? makeRamp('#1f5fd6') : null;
      if (patch.barding !== undefined) { if (patch.barding > 0) out.barding = patch.barding; else delete out.barding; }
      return out;
    });
  };
  const setAvatar = (av: Avatar) => {
    overrides.current.avatar = av;
    if (!overrides.current.headMode) overrides.current.headMode = 'avatar';
    updateFicha((f) => (isHuman(f) ? { ...withAvatar(f, av), headMode: overrides.current.headMode } : f));
  };
  const setGear = (g: Gear) => {
    overrides.current.gear = g;
    updateFicha((f) => (isHuman(f) ? { ...f, gear: g } : f));
  };
  /** clase de RPG de un toque: armadura, capa, armas y gorro (la cara y el pelo quedan) */
  const setHeroClass = (c: HeroClass | null) => {
    updateFicha((f) => {
      if (!isHuman(f)) return f;
      const nf: HumanFicha = c ? applyClass(f, c) : { ...f, outfit: { ...f.outfit, armor: null, trim: null, cape: null, pauldrons: false, belt: null }, gear: undefined };
      const o = overrides.current;
      o.outfit = { ...nf.outfit };
      o.gear = nf.gear;
      if (c) { for (const [slot, hex] of Object.entries(CLASS_KITS[c].colors ?? {})) o.colors[slot as ColorSlot] = hex; }
      if (nf.avatar) o.avatar = nf.avatar;
      return nf;
    });
  };
  /** armadura que evoluciona: línea y nivel 1 a 5 (con o sin casco) */
  const setArmorTier = (line: ArmorLine, tier: ArmorTier, helmet: boolean) => {
    updateFicha((f) => {
      if (!isHuman(f)) return f;
      const nf = applyArmorTier(f, line, tier, helmet);
      overrides.current.outfit = { ...nf.outfit };
      if (nf.avatar) overrides.current.avatar = nf.avatar;
      return nf;
    });
  };
  /** equipa un objeto del botín: si no hay héroe abierto, se lo pone a Rick */
  const equipItem = (item: LootItem) => {
    // la barda va en Thor
    if (item.base.cat === 'pet') { openThor(item.base.tier); return; }
    if (!ficha || !isHuman(ficha)) openFicha(familyFicha('rick'));
    updateFicha((f) => {
      if (!isHuman(f)) return f;
      const nf = equipLoot(f, item);
      const o = overrides.current;
      o.outfit = { ...nf.outfit };
      o.gear = nf.gear;
      if (nf.avatar) o.avatar = nf.avatar;
      return nf;
    });
    setCell(48);
    setView('se');
    setStep('style');
  };
  const setHeadMode = (m: 'avatar' | 'image') => {
    overrides.current.headMode = m;
    updateFicha((f) => (isHuman(f) ? { ...f, headMode: m } : f));
  };
  const resetAvatar = () => {
    if (!fittedAvatar.current) return;
    setAvatar(fittedAvatar.current);
  };
  const loadThumbs = useCallback(async (av: Avatar, part: AvatarPart) => {
    const r = await engine.call<'avatarThumbs'>({ type: 'avatarThumbs', key: part, avatar: av, part });
    return r ? r.thumbs : null;
  }, [engine]);
  /** Colores de una foto (piel, pelo, ojos, barba). Las formas no: eso lo elige la persona. */
  const photoColors = (file: File) =>
    run(async () => {
      const payload = await fileToPayload(file);
      const r = await engine.call<'photoColors'>({ type: 'photoColors', ...payload }, payloadTransfer(payload));
      return r?.colors;
    });
  const startFromPhoto = async (file: File) => {
    const c = await photoColors(file);
    if (c) startFromScratch(applyPhotoColors(defaultAvatar(), c));
  };
  const startFromScratch = (base?: Avatar) => {
    overrides.current = emptyOverrides();
    fittedAvatar.current = null;
    setLoaded(false);
    setAnalysis(null);
    setKind('human');
    setName('personaje');
    setVariants(null);
    setClip(null);
    setView('front');
    setAnim('idle');
    const av = base ?? defaultAvatar();
    overrides.current.avatar = av;
    setFicha(fichaFromAvatar('personaje', av));
    setStep('avatar');
  };
  const renderEnemy = useCallback(async (id: EnemyId) => {
    const r = await engine.call<'rendered'>({ type: 'render', key: `enemy-${id}`, ficha: enemyFicha(id), cell: enemyCell(id), anim: 'idle', view: 'se', props: true }).catch(() => null);
    return r ? r.clip : null;
  }, [engine]);
  const openEnemy = (id: EnemyId) => {
    openFicha(enemyFicha(id));
    setCell(enemyCell(id));
    setView('se');
    setAnim(enemyAnims(id)[1] ?? 'walk');
  };
  const renderFamily = useCallback(async (id: FamilyId, rpg: boolean) => {
    const r = await engine.call<'rendered'>({ type: 'render', key: `fam-${id}-${rpg}`, ficha: familyFicha(id, rpg), cell: 48, anim: 'walk', view: 'se', props: true }).catch(() => null);
    return r ? r.clip : null;
  }, [engine]);
  const renderThor = useCallback(async (barding: number) => {
    const r = await engine.call<'rendered'>({ type: 'render', key: `thor-${barding}`, ficha: thorFicha(barding), cell: 48, anim: 'walk', view: 'se', props: false }).catch(() => null);
    return r ? r.clip : null;
  }, [engine]);
  const openThor = (barding: number) => {
    openFicha(thorFicha(barding));
    setSpecies('boxer');
    setCell(48);
    setView('se');
    setAnim('walk');
    setStep('style');
  };
  // superhéroes: de pelea con su arma en la tarjeta; se abren con ropa de deporte y movimiento premium
  const renderHero = useCallback(async (id: HeroId) => {
    const r = await engine.call<'rendered'>({ type: 'render', key: `hero-${id}`, ficha: heroFicha(id, true), cell: heroCell(id), anim: 'guard', view: 'se', props: true }).catch(() => null);
    return r ? r.clip : null;
  }, [engine]);
  const openHero = (id: HeroId) => {
    openFicha(heroFicha(id));
    setCell(heroCell(id));
    setView('se');
    setAnim('sprint');
    setStep('animate');
  };
  // la familia GG: se abre en el creador de avatar, lista para modificar
  const openFamily = (id: FamilyId, rpg: boolean) => {
    const f = familyFicha(id, rpg);
    openFicha(f);
    setCell(48);
    setView('se');
    setAnim('walk');
    setStep(rpg ? 'style' : 'avatar');
  };
  const askVariants = () =>
    run(async () => {
      if (!ficha || !isHuman(ficha)) return;
      const r = await engine.call<'variants'>({ type: 'variants', ficha, params: loaded ? params : null, seed: Date.now() % 100000, n: 6 });
      if (r) setVariants({ variants: r.variants, thumbs: r.thumbs });
    });
  const pickVariant = (v: Variant) => {
    overrides.current.face = { ...overrides.current.face, ...v.face };
    setProportions(v.proportions);
    updateFicha((f) => (isHuman(f) ? { ...f, face: { ...f.face, ...v.face } } : f));
  };
  const saveCustom = (a: CustomAnim) => {
    overrides.current.customAnims = [...overrides.current.customAnims.filter((c) => c.name !== a.name), a];
    updateFicha((f) => (isHuman(f) ? { ...f, customAnims: overrides.current.customAnims } : f));
  };

  // ---------- galería y exportar ----------
  const saveToGallery = () => {
    if (!ficha || !clip) return;
    const item: GalleryItem = { id: `${Date.now()}`, name, date: new Date().toISOString().slice(0, 10), thumb: thumbnail(clip.frames[0], clip.cell), ficha: { ...ficha, name } };
    const next = upsert(gallery, item);
    if (saveGallery(next)) {
      setGallery(next);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
    } else setError(lang === 'es' ? 'No se pudo guardar en este navegador (almacenamiento lleno o bloqueado). Exporta la ficha.' : 'Could not save in this browser (storage full or blocked). Export the character file.');
  };
  const removeFromGallery = (id: string) => {
    const next = gallery.filter((g) => g.id !== id);
    saveGallery(next);
    setGallery(next);
  };
  const qaPlan = useCallback(async (plan: ExportPlan) => {
    if (!ficha) return null;
    const r = await engine.call<'qa'>({ type: 'qa', ficha, plan });
    return r ? { reports: r.reports, missing: r.missing } : null;
  }, [ficha, engine]);
  const doExport = async (k: ExportKind, plan: ExportPlan, force: boolean) => {
    await run(async () => {
      if (!ficha) return;
      const r = await engine.call<'exported'>({ type: 'export', ficha: { ...ficha, name }, kind: k, plan, force });
      if (r) downloadFiles(r.files, `${safeName(name)}_${k}.zip`);
    });
  };

  const canGo = (s: Step) => s === 'image' || (loaded && steps.includes(s)) || (!!ficha && ['avatar', 'style', 'animate', 'editor', 'export'].includes(s) && steps.includes(s));
  const zoom = cell === 32 ? 9 : cell === 48 ? 6 : 5;

  // ---------- interacción con la imagen ----------
  const stroke = (p: Point) => setParams((q) => ({ ...q, bgStrokes: [...q.bgStrokes, { x: p.x, y: p.y, r: brushR, mode: bgBrush }] }));
  const zoneEdit = (p: Point, mode: 'wand' | 'brush') => setParams((q) => ({ ...q, zoneEdits: [...q.zoneEdits, { mode, x: p.x, y: p.y, r: brushR, zone: zoneSel }] }));
  const shownHead = dragBox ?? params.head ?? analysis?.head;
  const packOpts = useMemo(() => [...new Set(animList.map((a) => a.pack))], [animList]);
  const curPack = animList.find((a) => a.name === anim)?.pack ?? packOpts[0];

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="logo" aria-hidden><Logo /></span>
          <div>
            <h1>Pixel<b>Forja</b></h1>
            <p>{t('appTagline')}</p>
          </div>
        </div>
        <div className="top-right">
          {busy > 0 && <span className="busy" role="status">{t('working')}</span>}
          <a className="arena-link" href="./arena.html" data-testid="arena-link" aria-label={t('arenaLink')}><span className="long">{t('arenaLink')}</span><span className="short">{t('arenaShort')}</span></a>
          <a className="arena-link" href="./visor.html" data-testid="visor-link" aria-label={t('visorLink')}><span className="long">{t('visorLink')}</span><span className="short">{t('visorShort')}</span></a>
          <div className="theme" role="group" aria-label={t('theme')}>
            <button className={theme === 'dark' ? 'on' : ''} onClick={() => setTheme('dark')} aria-label={t('themeDark')} aria-pressed={theme === 'dark'}>☾</button>
            <button className={theme === 'light' ? 'on' : ''} onClick={() => setTheme('light')} aria-label={t('themeLight')} aria-pressed={theme === 'light'}>☀</button>
          </div>
          <div className="lang" role="group" aria-label="idioma / language">
            {(['es', 'en'] as Lang[]).map((l) => (
              <button key={l} className={l === lang ? 'on' : ''} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
            ))}
          </div>
        </div>
      </header>

      <nav className="steps" aria-label={lang === 'es' ? 'pasos' : 'steps'}>
        {steps.map((s, i) => (
          <button key={s} className={`${s === step ? 'on' : ''} ${i < stepIdx ? 'done' : ''}`} disabled={!canGo(s)} onClick={() => setStep(s)} data-testid={`step-${s}`}>
            <span className="num">{i + 1}</span> {t(`step_${s}` as Key)}
          </button>
        ))}
      </nav>

      {error && <div className="error" role="alert">{t('error')}: {error}</div>}

      <main className="work">
        {step === 'image' && (
          <section className="panel wide home">
            {kind === 'human' ? (
              <div className="hero">
                <div>
                  <span className="eyebrow">{t('heroEyebrow')}</span>
                  <h2>{t('heroTitleA')} <em>{t('heroTitleB')}</em></h2>
                  <p className="lead">{t('heroLead')}</p>
                  <div className="cta">
                    <button className="btn big" onClick={() => startFromScratch()} data-testid="from-scratch">{t('fromScratch')}</button>
                    <Seg value={kind} set={(v) => setKind(v as 'human' | 'animal')} opts={[['human', t('kind_human')], ['animal', t('kind_animal')]]} />
                  </div>
                  <div className="badges">
                    <span className="badge"><i />{t('badgeLocal')}</span>
                    <span className="badge"><b>75</b> {t('badgeAnims')}</span>
                    <span className="badge"><b>8</b> {t('badgeDirs')}</span>
                    <span className="badge">Phaser · Godot · Unity · Aseprite</span>
                  </div>
                </div>
                <Showcase cast={showcase} label={t('showcaseLabel')} />
              </div>
            ) : (
              <div className="row">
                <Seg label={t('kind')} value={kind} set={(v) => setKind(v as 'human' | 'animal')} opts={[['human', t('kind_human')], ['animal', t('kind_animal')]]} />
                <Select label={t('species')} value={species} set={(v) => setSpecies(v as Species)} opts={SPECIES.map((s) => [s, t(`species_${s}` as Key)])} />
              </div>
            )}
            {kind === 'human' ? (
              <div className="home-grid">
                <label className="tile">
                  <span className="ico" aria-hidden>🎨</span>
                  <strong>{t('fromPhotoColors')}</strong>
                  <span>{t('fromPhotoColorsHelp')}</span>
                  <input type="file" accept="image/*" data-testid="photo-colors" onChange={(e) => { const f = e.target.files?.[0]; if (f) startFromPhoto(f); }} />
                </label>
                <label
                  className="tile"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) loadFile(f, f.name); }}
                >
                  <span className="ico" aria-hidden>✏️</span>
                  <strong>{t('fromDrawing')}</strong>
                  <span>{t('dropHint')}</span>
                  <input type="file" accept="image/*" data-testid="file" onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f, f.name); }} />
                </label>
                <label className="tile">
                  <span className="ico" aria-hidden>📂</span>
                  <strong>{t('openFicha')}</strong>
                  <span>{t('openFichaHelp')}</span>
                  <input type="file" accept="application/json,.json" data-testid="open-ficha" onChange={(e) => { const f = e.target.files?.[0]; if (f) openFichaFile(f); }} />
                </label>
              </div>
            ) : (
              <label
                className="drop"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) loadFile(f, f.name); }}
              >
                <input type="file" accept="image/*" data-testid="file" onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f, f.name); }} />
                <strong>{t('upload')}</strong>
                <span>{t('dropHint')}</span>
              </label>
            )}
            {kind === 'human' && (
              <>
                <div className="section-h"><h3>{t('fam_title')}</h3><span className="muted small">{t('fam_help')}</span></div>
                <FamilyRow t={t} render={renderFamily} open={openFamily} renderPet={renderThor} openPet={openThor} />
                <div className="section-h"><h3>{t('hero_title')}</h3><span className="muted small">{t('hero_help')}</span></div>
                <HeroRow lang={lang} render={renderHero} open={openHero} />
                <div className="section-h"><h3>{t('rpg_workshop')}</h3><span className="muted small">{t('rpg_workshopHelp')}</span></div>
                <div className="home-grid rpg-grid">
                  <button className="tile" onClick={() => { startFromScratch(); setHeroClass('paladin'); setStep('style'); }} data-testid="rpg-hero">
                    <span className="ico" aria-hidden>⚔️</span>
                    <strong>{t('rpg_hero')}</strong>
                    <span>{t('rpg_heroHelp')}</span>
                  </button>
                  <button className="tile" onClick={() => setStep('enemies')} data-testid="rpg-enemies">
                    <span className="ico" aria-hidden>💀</span>
                    <strong>{t('rpg_enemies')}</strong>
                    <span>{t('rpg_enemiesTile')}</span>
                  </button>
                  <button className="tile" onClick={() => setStep('fx')} data-testid="rpg-fx">
                    <span className="ico" aria-hidden>🔥</span>
                    <strong>{t('rpg_fx')}</strong>
                    <span>{t('rpg_fxTile')}</span>
                  </button>
                  <button className="tile" onClick={() => setStep('items')} data-testid="rpg-items">
                    <span className="ico" aria-hidden>💎</span>
                    <strong>{t('rpg_items')}</strong>
                    <span>{t('rpg_itemsTile')}</span>
                  </button>
                  <button className="tile" onClick={() => setStep('fonts')} data-testid="tool-fonts">
                    <span className="ico" aria-hidden>🔤</span>
                    <strong>{t('fonts_title')}</strong>
                    <span>{t('fonts_tile')}</span>
                  </button>
                  <button className="tile" onClick={() => setStep('effects')} data-testid="tool-effects">
                    <span className="ico" aria-hidden>💥</span>
                    <strong>{t('ef_title')}</strong>
                    <span>{t('ef_tile')}</span>
                  </button>
                  <button className="tile" onClick={() => setStep('interface')} data-testid="tool-interface">
                    <span className="ico" aria-hidden>🎮</span>
                    <strong>{t('ui_title')}</strong>
                    <span>{t('ui_tile')}</span>
                  </button>
                  <button className="tile" onClick={() => setStep('audio')} data-testid="tool-audio">
                    <span className="ico" aria-hidden>🎺</span>
                    <strong>{t('au_title')}</strong>
                    <span>{t('au_tile')}</span>
                  </button>
                </div>
              </>
            )}
            <div className="section-h"><h3>{t('gallery')}</h3></div>
            {gallery.length ? (
              <div className="gallery" data-testid="gallery">
                {gallery.map((g) => (
                  <div key={g.id} className="g-item">
                    <img src={g.thumb} alt={g.name} className="pixel" />
                    <span>{g.name}</span>
                    <small className="muted">{g.date}</small>
                    <div className="row">
                      <button className="btn ghost sm" onClick={() => openFicha(migrateFicha(g.ficha))}>{t('open')}</button>
                      <button className="btn ghost sm" onClick={() => removeFromGallery(g.id)}>{t('remove')}</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="muted small">{t('galleryEmpty')}</p>}
            <div className="section-h"><h3>{t('orTry')}</h3></div>
            <div className="samples">
              {SAMPLES.map((s) => (
                <button key={s.name} onClick={() => loadSample(s)} data-testid={`sample-${s.name}`}>
                  <img src={`./samples/${s.name}.png`} alt={s.name} />
                  <span>{s.name}</span>
                </button>
              ))}
            </div>
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
                  <Seg
                    label={`${t('imgMode')} (${t('modeAuto')}: ${t(analysis.mode === 'bust' ? 'mode_bust' : 'mode_full')})`}
                    value={params.mode ?? analysis.mode}
                    set={(v) => setParams((q) => ({ ...q, mode: v as 'full' | 'bust', head: undefined, zoneEdits: [] }))}
                    opts={[['full', t('mode_full')], ['bust', t('mode_bust')]]}
                    testid="img-mode"
                  />
                  <p>{analysis.mode === 'bust' ? t('bustHelp') : t('bgHelp')}</p>
                  {analysis.mode !== 'bust' && (
                    <label className="field">
                      {t('tolerance')} <output>{params.bgTolerance.toFixed(2)}</output>
                      <input type="range" min={0.02} max={0.2} step={0.01} value={params.bgTolerance} onChange={(e) => setParams((q) => ({ ...q, bgTolerance: +e.target.value }))} />
                    </label>
                  )}
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

        {step === 'enemies' && <EnemiesStep t={t} render={renderEnemy} open={openEnemy} />}
        {step === 'fx' && <FxStep t={t} />}
        {step === 'fonts' && <FontsStep t={t} />}
        {step === 'effects' && <EffectsStep t={t} lang={lang} />}
        {step === 'interface' && <InterfaceStep t={t} />}
        {step === 'audio' && <AudioStep t={t} />}
        {step === 'items' && <LootStep t={t} lang={lang} equip={equipItem} hero={ficha && isHuman(ficha) ? ficha.name : null} />}

        {step === 'editor' && ficha && (isHuman(ficha)
          ? <EditorStep t={t} lang={lang} ficha={ficha} cell={cell} onSave={saveCustom} />
          : <section className="panel wide"><p>{t('ed_animalNo')}</p></section>)}

        {(step === 'avatar' || step === 'style' || step === 'animate' || step === 'export') && (
          <>
            <section className="panel stage-wrap preview-wrap">
              {clip ? <Preview clip={clip} compare={compareOn && canCompare ? compareClip : null} bg={bg} zoom={compareOn && canCompare ? Math.max(3, zoom - 2) : zoom} t={t} /> : <p className="muted">{t('working')}</p>}
              <div className="controls">
                <Select label={t('pack')} value={curPack ?? ''} set={(p) => { const first = animList.find((a) => a.pack === p); if (first) setAnim(first.name); }} opts={packOpts.map((p) => [p, t(`pack_${p}` as Key)])} testid="pack" />
                <Select label={t('anim')} value={anim} set={setAnim} opts={animList.filter((a) => a.pack === curPack).map((a) => [a.name, animLabel(a.name, lang)])} testid="anim" />
              </div>
              {ficha && isHuman(ficha) && heldInfo && held && (
                <div className="controls" title={t('held_help')}>
                  <Select label={t('held')} value={held} set={(v) => setHeldKind(v as FloorPropKind)} opts={heldInfo.kinds.map((k): [string, string] => [k, FLOOR_PROPS[k].nombre[lang]])} testid="held" />
                </div>
              )}
              {ficha && isHuman(ficha) && wardrobeNames.length > 0 && (
                <div className="controls" title={t('wardrobe_help')}>
                  <Seg
                    label={t('wardrobe')}
                    value={outfitVar}
                    set={setOutfitVar}
                    opts={[['', t('wardrobe_base')], ...wardrobeNames.map((v): [string, string] => [v, ficha.wardrobe!.variants[v].label ?? v])]}
                    testid="wardrobe"
                  />
                </div>
              )}
              {ficha && isHuman(ficha) && (
                <div className="controls motion">
                  <Seg label={t('motion')} value={ficha.movementProfile ?? 'classic'} set={(v) => setMovement(v as MovementProfile)} opts={[['classic', t('motion_classic')], ['premium', t('motion_premium')]]} testid="motion" />
                  <Toggle label={t('motion_compare')} on={compareOn} set={setCompareOn} testid="motion-compare" />
                  {!canCompare && <span className="muted small">{t('motion_none')}</span>}
                </div>
              )}
              <div className="controls">
                {ficha && <DirPad label={t('view')} value={view} set={setView} name={(v) => t(`view_${v}` as Key)} />}
                <Seg label={t('size')} value={String(cell)} set={(v) => setCell(+v as CellSize)} opts={[['32', '32'], ['48', '48'], ['64', '64']]} testid="cell-size" />
                <Seg label={t('background')} value={bg} set={(v) => setBg(v as PreviewBg)} opts={[['studio', t('bg_studio')], ['pitch', t('bg_pitch')], ['grass', t('bg_grass')], ['plain', t('bg_plain')]]} />
                {ficha && isHuman(ficha) && <Toggle label={t('props')} on={props} set={setProps} />}
              </div>
            </section>
            <aside className="panel side">
              {step === 'avatar' && ficha && isHuman(ficha) && ficha.avatar && (
                <AvatarStep
                  t={t} avatar={ficha.avatar} setAvatar={setAvatar}
                  canChooseHead={Object.keys(ficha.heads).length > 0} headMode={ficha.headMode ?? 'avatar'} setHeadMode={setHeadMode}
                  canReset={!!fittedAvatar.current} reset={resetAvatar} random={() => setAvatar(randomAvatar(Date.now() % 100000))}
                  loadThumbs={loadThumbs}
                  mouth={ficha.face.mouth}
                  setMouth={(m) => setFace('mouth', m)}
                  setBody={(b: BodyType) => {
                    const av = { ...ficha.avatar!, body: b };
                    setAvatar(av);
                    setProportions(bodyProportions(ficha.body.proportions.preset, b));
                  }}
                  photoColors={async (file) => { const c = await photoColors(file); if (c && isHuman(ficha) && ficha.avatar) setAvatar(applyPhotoColors(ficha.avatar, c)); }}
                />
              )}
              {step === 'avatar' && ficha && isHuman(ficha) && !ficha.avatar && <p className="muted">{t('working')}</p>}
              {step === 'style' && ficha && (
                <StyleStep
                  t={t} lang={lang} ficha={ficha} name={name} setName={(s) => setName(safeName(s))}
                  setOutfit={setOutfit} setFace={setFace} setColor={setColor} setProportions={setProportions} setAnimal={setAnimal}
                  setGear={setGear} setHeroClass={setHeroClass} setArmorTier={setArmorTier}
                  variants={variants} askVariants={askVariants} pickVariant={pickVariant}
                  canExtra={loaded && kind === 'human'} extraLoaded={extraLoaded} loadExtra={loadExtra}
                />
              )}
              {step === 'animate' && (
                <>
                  {qa && <QATable qa={qa} t={t} />}
                  <button className="btn" onClick={saveToGallery} disabled={!ficha || !clip} data-testid="save-gallery">{t('saveGallery')}</button>
                  {savedMsg && <p className="ok small">{t('saved')}</p>}
                  <button className="btn ghost" disabled={!ficha} onClick={() => ficha && download(`${safeName(name)}.ficha.json`, JSON.stringify({ ...ficha, name }, null, 2), 'application/json')}>{t('exportFicha')}</button>
                </>
              )}
              {step === 'export' && ficha && <ExportStep t={t} ficha={ficha} cell={cell} qa={qaPlan} doExport={doExport} artifact={ARTIFACT} />}
            </aside>
          </>
        )}
      </main>

      {TOOLS.includes(step) && (
        <footer className="nav">
          <button className="btn ghost" onClick={() => setStep('image')} data-testid="tool-home">{t('home')}</button>
        </footer>
      )}
      {step !== 'image' && !TOOLS.includes(step) && (
        <footer className="nav">
          <button className="btn ghost" onClick={() => setStep(steps[Math.max(0, stepIdx - 1)])}>{t('back')}</button>
          {stepIdx < steps.length - 1 && (
            <button className="btn" disabled={!canGo(steps[stepIdx + 1])} onClick={() => setStep(steps[stepIdx + 1])} data-testid="next">{t('next')}</button>
          )}
        </footer>
      )}
    </div>
  );
}

function BrushSize({ t, r, set }: { t: T; r: number; set: (v: number) => void }) {
  return (
    <label className="field">
      {t('brushSize')} <output>{r}</output>
      <input type="range" min={2} max={24} value={r} onChange={(e) => set(+e.target.value)} />
    </label>
  );
}

function QATable({ qa, t }: { qa: QAReport; t: T }) {
  return (
    <div className="qa">
      <h3>{t('qa')}</h3>
      <table data-testid="qa">
        <tbody>
          {qa.items.map((it) => (
            <tr key={it.check}>
              <th>{t(`qa_${it.check}` as Key)}</th>
              <td className={it.severity} title={it.where}>
                {it.severity === 'ok' ? '✓' : it.severity === 'warn' ? '!' : '✗'} {it.value}{it.where ? ` · ${it.where}` : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
