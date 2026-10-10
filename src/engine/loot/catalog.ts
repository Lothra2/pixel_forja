import { MAT, gemMat, glowMat, metalMat, crystalMat, GEM_COLORS, type Rarity, type GemColor } from './materials';
import type { WeaponIcon, WeaponDesign } from './weapons';
import { TWO_HANDED, WEAPON_ICONS } from './weapons';
import { JEWEL_ICONS, POTION_KINDS, POTION_SIZES, CONSUMABLE_ICONS, GEM_GRADES, GEM_KINDS, RUNE_COUNT, OFFHAND_ICONS, type OffhandIcon, type OffhandDesign, type JewelIcon, type JewelDesign, type PotionKind, type PotionSize, type ConsumableIcon, type GemGrade } from './misc';
import { ARMOR_LINES, ARMOR_SLOTS, ARMOR_TIERS } from './armor';
import { PET_ARMOR } from '../render/pet3d';
import { earlyLoot } from './early';
import { ARMOR_EVOLUTION, SLOT_NAMES, type ArmorLine, type ArmorSlot, type ArmorTier, type TierLook } from './armor';

/**
 * Catálogo del botín: bases (normal, excepcional y élite), objetos mágicos y raros al azar, legendarios
 * con nombre propio y el set "Legado GG". Cada objeto trae sus estadísticas listas para el juego.
 * Los nombres son originales (inspirados en Diablo, sin usar los de Blizzard).
 */

export type LootBase =
  | { cat: 'weapon'; icon: WeaponIcon }
  | { cat: 'offhand'; icon: OffhandIcon }
  | { cat: 'armor'; slot: ArmorSlot; line: ArmorLine; tier: ArmorTier }
  | { cat: 'jewel'; icon: JewelIcon }
  | { cat: 'potion'; kind: PotionKind; size: PotionSize }
  | { cat: 'consumable'; icon: ConsumableIcon }
  | { cat: 'gem'; kind: GemColor; grade: GemGrade }
  | { cat: 'rune'; index: number }
  | { cat: 'pet'; tier: number };

export type StatKey =
  | 'str' | 'dex' | 'vit' | 'ene' | 'life' | 'mana' | 'allRes' | 'fireRes' | 'coldRes' | 'lightRes' | 'poisonRes'
  | 'fireDmg' | 'coldDmg' | 'lightDmg' | 'poisonDmg' | 'dmgPct' | 'atkSpeed' | 'castSpeed' | 'critChance' | 'critDmg'
  | 'lifeSteal' | 'manaSteal' | 'moveSpeed' | 'magicFind' | 'goldFind' | 'allSkills' | 'blockPct' | 'thorns'
  | 'lifeRegen' | 'cdr' | 'petDmg' | 'petArmor' | 'armorPct' | 'healPct' | 'restoreLife' | 'restoreMana' | 'sockets';

export interface Mod { stat: StatKey; value: number }

export interface ItemStats {
  /** daño mínimo y máximo (armas) */
  damage?: [number, number];
  /** golpes por segundo (armas) */
  speed?: number;
  defense?: number;
  /** probabilidad de bloqueo (escudos) */
  block?: number;
  mods: Mod[];
}

export interface LootItem {
  id: string;
  name: { es: string; en: string };
  rarity: Rarity;
  base: LootBase;
  /** 1 normal, 2 excepcional, 3 élite (armas, escudos y joyas) */
  grade?: 1 | 2 | 3;
  design?: WeaponDesign | OffhandDesign | JewelDesign | Partial<TierLook>;
  level: number;
  stats: ItemStats;
  /** texto de ambiente (legendarios) */
  flavor?: { es: string; en: string };
  /** nombre del set al que pertenece */
  set?: string;
  /** dos manos */
  twoHanded?: boolean;
}

export const STAT_LABELS: Record<StatKey, { es: string; en: string }> = {
  str: { es: '+{v} a Fuerza', en: '+{v} Strength' }, dex: { es: '+{v} a Destreza', en: '+{v} Dexterity' },
  vit: { es: '+{v} a Vitalidad', en: '+{v} Vitality' }, ene: { es: '+{v} a Energía', en: '+{v} Energy' },
  life: { es: '+{v} a Vida', en: '+{v} Life' }, mana: { es: '+{v} a Maná', en: '+{v} Mana' },
  allRes: { es: '+{v}% a todas las resistencias', en: '+{v}% All Resistances' },
  fireRes: { es: '+{v}% resistencia al fuego', en: '+{v}% Fire Resistance' }, coldRes: { es: '+{v}% resistencia al frío', en: '+{v}% Cold Resistance' },
  lightRes: { es: '+{v}% resistencia al rayo', en: '+{v}% Lightning Resistance' }, poisonRes: { es: '+{v}% resistencia al veneno', en: '+{v}% Poison Resistance' },
  fireDmg: { es: '+{v} de daño de fuego', en: '+{v} Fire Damage' }, coldDmg: { es: '+{v} de daño de frío', en: '+{v} Cold Damage' },
  lightDmg: { es: '+{v} de daño de rayo', en: '+{v} Lightning Damage' }, poisonDmg: { es: '+{v} de daño de veneno', en: '+{v} Poison Damage' },
  dmgPct: { es: '+{v}% de daño', en: '+{v}% Damage' }, atkSpeed: { es: '+{v}% velocidad de ataque', en: '+{v}% Attack Speed' },
  castSpeed: { es: '+{v}% velocidad de lanzamiento', en: '+{v}% Cast Speed' }, critChance: { es: '+{v}% probabilidad de crítico', en: '+{v}% Critical Chance' },
  critDmg: { es: '+{v}% daño crítico', en: '+{v}% Critical Damage' }, lifeSteal: { es: '{v}% de robo de vida', en: '{v}% Life Steal' },
  manaSteal: { es: '{v}% de robo de maná', en: '{v}% Mana Steal' }, moveSpeed: { es: '+{v}% velocidad de movimiento', en: '+{v}% Movement Speed' },
  magicFind: { es: '+{v}% de hallar objetos mágicos', en: '+{v}% Magic Find' }, goldFind: { es: '+{v}% de oro encontrado', en: '+{v}% Gold Find' },
  allSkills: { es: '+{v} a todas las habilidades', en: '+{v} to All Skills' }, blockPct: { es: '+{v}% de bloqueo', en: '+{v}% Block Chance' },
  thorns: { es: 'Espinas: {v} de daño al atacante', en: 'Thorns: {v} damage to attackers' }, lifeRegen: { es: '+{v} vida por segundo', en: '+{v} Life per Second' },
  cdr: { es: '-{v}% tiempo de recarga', en: '-{v}% Cooldown' }, petDmg: { es: '+{v}% daño de tu mascota', en: '+{v}% Pet Damage' },
  petArmor: { es: '+{v}% armadura de tu mascota', en: '+{v}% Pet Armor' }, armorPct: { es: '+{v}% de armadura', en: '+{v}% Armor' },
  healPct: { es: '+{v}% de curación recibida', en: '+{v}% Healing Received' },
  restoreLife: { es: 'Restaura {v} de vida', en: 'Restores {v} Life' }, restoreMana: { es: 'Restaura {v} de maná', en: 'Restores {v} Mana' },
  sockets: { es: 'Engarces: {v}', en: 'Sockets: {v}' },
};

/** Texto de un modificador en el idioma pedido. */
export function modText(m: Mod, lang: 'es' | 'en' = 'es'): string {
  return STAT_LABELS[m.stat][lang].replace('{v}', String(m.value));
}

// ---------- bases ----------

export const WEAPON_NAMES: Record<WeaponIcon, { es: string; en: string }> = {
  sword: { es: 'Espada', en: 'Sword' }, scimitar: { es: 'Cimitarra', en: 'Scimitar' }, katana: { es: 'Katana', en: 'Katana' }, rapier: { es: 'Estoque', en: 'Rapier' },
  dagger: { es: 'Daga', en: 'Dagger' }, kris: { es: 'Kris', en: 'Kris' }, axe: { es: 'Hacha', en: 'Axe' }, hatchet: { es: 'Hacha arrojadiza', en: 'Throwing Axe' },
  mace: { es: 'Maza', en: 'Mace' }, morning_star: { es: 'Lucero del alba', en: 'Morning Star' }, flail: { es: 'Mangual', en: 'Flail' }, warhammer: { es: 'Martillo de guerra', en: 'War Hammer' },
  scepter: { es: 'Cetro', en: 'Scepter' }, club: { es: 'Garrote', en: 'Club' }, wand: { es: 'Varita', en: 'Wand' }, claw: { es: 'Garra', en: 'Claw' },
  javelin: { es: 'Jabalina', en: 'Javelin' }, greatsword: { es: 'Mandoble', en: 'Greatsword' }, greataxe: { es: 'Hacha doble', en: 'Great Axe' },
  maul: { es: 'Gran martillo', en: 'Maul' }, staff: { es: 'Báculo', en: 'Staff' }, spear: { es: 'Lanza', en: 'Spear' }, halberd: { es: 'Alabarda', en: 'Halberd' },
  scythe: { es: 'Guadaña', en: 'Scythe' }, bow: { es: 'Arco corto', en: 'Short Bow' }, longbow: { es: 'Arco largo', en: 'Long Bow' }, crossbow: { es: 'Ballesta', en: 'Crossbow' },
};

export const OFFHAND_NAMES: Record<OffhandIcon, { es: string; en: string }> = {
  shield_heater: { es: 'Escudo', en: 'Heater Shield' }, shield_round: { es: 'Rodela', en: 'Round Shield' }, shield_kite: { es: 'Escudo de cometa', en: 'Kite Shield' },
  shield_tower: { es: 'Pavés', en: 'Tower Shield' }, buckler: { es: 'Broquel', en: 'Buckler' }, orb: { es: 'Orbe', en: 'Orb' }, tome: { es: 'Tomo', en: 'Tome' },
  shrunken_head: { es: 'Cabeza reducida', en: 'Shrunken Head' }, quiver: { es: 'Carcaj', en: 'Quiver' },
};

export const JEWEL_NAMES: Record<JewelIcon, { es: string; en: string }> = {
  ring: { es: 'Anillo', en: 'Ring' }, ring_band: { es: 'Sortija', en: 'Band' }, amulet: { es: 'Amuleto', en: 'Amulet' }, amulet_pendant: { es: 'Colgante', en: 'Pendant' },
  charm_small: { es: 'Talismán pequeño', en: 'Small Charm' }, charm_large: { es: 'Talismán grande', en: 'Large Charm' }, charm_grand: { es: 'Gran talismán', en: 'Grand Charm' }, jewel: { es: 'Joya', en: 'Jewel' },
};

// daño base [min, max] y velocidad (golpes por segundo) de cada arma normal
const W_BASE: Record<WeaponIcon, [number, number, number]> = {
  sword: [3, 8, 1.2], scimitar: [2, 9, 1.3], katana: [4, 9, 1.25], rapier: [2, 7, 1.45], dagger: [1, 5, 1.6], kris: [2, 5, 1.6], axe: [3, 9, 1.15],
  hatchet: [2, 6, 1.4], mace: [3, 7, 1.15], morning_star: [4, 9, 1.1], flail: [2, 11, 1.0], warhammer: [5, 10, 1.0], scepter: [3, 8, 1.15], club: [2, 6, 1.2],
  wand: [1, 5, 1.4], claw: [2, 6, 1.5], javelin: [3, 8, 1.3], greatsword: [8, 18, 0.95], greataxe: [9, 19, 0.9], maul: [10, 22, 0.8], staff: [3, 9, 1.1],
  spear: [5, 14, 1.0], halberd: [7, 17, 0.9], scythe: [6, 18, 0.95], bow: [2, 7, 1.3], longbow: [3, 10, 1.1], crossbow: [6, 14, 0.85],
};

const GRADE_NAME = [{ es: '', en: '' }, { es: ' reforzada', en: 'Reinforced ' }, { es: ' de élite', en: 'Elite ' }];
const GRADE_K = [1, 1.9, 3.2];
const GRADE_LVL = [1, 18, 36];

/** Aspecto de una base según su grado: hierro y madera, acero y bronce, acero oscuro con oro y gema. */
export function gradeDesign(icon: WeaponIcon | OffhandIcon, grade: 1 | 2 | 3): WeaponDesign & OffhandDesign {
  if (grade === 1) return { blade: MAT.iron, haft: MAT.wood, grip: MAT.leather, guard: MAT.iron, pommel: MAT.iron, rim: MAT.iron, face: '#7a4a2a' };
  if (grade === 2) return { blade: MAT.steel, haft: MAT.darkwood, grip: MAT.darkleather, guard: MAT.bronze, pommel: MAT.bronze, guardShape: 'ornate', rim: MAT.steel, face: '#2f5fb8', emblem: 'cross', emblemMat: MAT.bronze };
  return { blade: MAT.darksteel, edge: MAT.silver, haft: MAT.darkwood, grip: MAT.redleather, guard: MAT.gold, pommel: MAT.gold, gem: GEM_COLORS.ruby, guardShape: icon === 'katana' ? 'disc' : 'wings', shape: 'broad', rim: MAT.gold, face: '#6a1a24', emblem: 'sun', emblemMat: MAT.gold };
}

// nombres femeninos en español (para "reforzada")
const FEM = new Set(['sword', 'scimitar', 'katana', 'dagger', 'axe', 'hatchet', 'mace', 'wand', 'claw', 'javelin', 'greataxe', 'spear', 'halberd', 'scythe', 'crossbow', 'shield_round', 'shrunken_head']);
const fem = (icon: WeaponIcon | OffhandIcon) => FEM.has(icon);

export function baseWeapon(icon: WeaponIcon, grade: 1 | 2 | 3 = 1): LootItem {
  const [mn, mx, sp] = W_BASE[icon];
  const k = GRADE_K[grade - 1];
  const n = WEAPON_NAMES[icon];
  // las armas en femenino llevan "reforzada", en masculino "reforzado"
  const gEs = grade === 2 ? (fem(icon) ? ' reforzada' : ' reforzado') : GRADE_NAME[grade - 1].es;
  return {
    id: `${icon}_${grade}`, rarity: 'normal', base: { cat: 'weapon', icon }, grade, design: gradeDesign(icon, grade),
    name: { es: n.es + gEs, en: GRADE_NAME[grade - 1].en + n.en }, level: GRADE_LVL[grade - 1],
    stats: { damage: [Math.round(mn * k), Math.round(mx * k)], speed: sp, mods: [] }, twoHanded: TWO_HANDED.includes(icon),
  };
}

export function baseOffhand(icon: OffhandIcon, grade: 1 | 2 | 3 = 1): LootItem {
  const n = OFFHAND_NAMES[icon];
  const shield = icon.startsWith('shield') || icon === 'buckler';
  const def = { shield_heater: 8, shield_round: 6, shield_kite: 10, shield_tower: 14, buckler: 4, orb: 2, tome: 1, shrunken_head: 3, quiver: 0 }[icon];
  const gEs = grade === 2 ? (fem(icon) ? ' reforzada' : ' reforzado') : GRADE_NAME[grade - 1].es;
  return {
    id: `${icon}_${grade}`, rarity: 'normal', base: { cat: 'offhand', icon }, grade, design: gradeDesign(icon, grade),
    name: { es: n.es + gEs, en: GRADE_NAME[grade - 1].en + n.en }, level: GRADE_LVL[grade - 1],
    stats: { defense: Math.round(def * GRADE_K[grade - 1]), block: shield ? (icon === 'shield_tower' ? 30 : icon === 'buckler' ? 15 : 22) : undefined, mods: icon === 'orb' || icon === 'tome' ? [{ stat: 'mana', value: 10 * grade }] : [] },
  };
}

export function baseArmor(slot: ArmorSlot, line: ArmorLine, tier: ArmorTier): LootItem {
  const t = ARMOR_EVOLUTION[line][tier - 1];
  const share: Record<ArmorSlot, number> = { chest: 1, helm: 0.45, shoulders: 0.35, gloves: 0.25, belt: 0.2, pants: 0.5, boots: 0.3 };
  const slotName = SLOT_NAMES[slot];
  return {
    id: `armor_${line}_${slot}_${tier}`, rarity: tier >= 5 ? 'legendary' : tier === 4 ? 'rare' : 'normal',
    base: { cat: 'armor', slot, line, tier },
    name: slot === 'chest' ? t.name : { es: `${slotName.es} (${t.name.es})`, en: `${slotName.en} (${t.name.en})` },
    level: t.level, stats: { defense: Math.max(1, Math.round(t.defense * share[slot])), mods: tier >= 4 ? [{ stat: 'allRes', value: tier === 5 ? 15 : 8 }] : [] },
  };
}

// ---------- mágicos y raros al azar ----------

function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const PREFIX: { stat: StatKey; es: string; en: string; min: number; max: number }[] = [
  { stat: 'dmgPct', es: 'Cruel', en: 'Cruel', min: 10, max: 60 }, { stat: 'fireDmg', es: 'Ardiente', en: 'Flaming', min: 3, max: 18 },
  { stat: 'coldDmg', es: 'Gélido', en: 'Freezing', min: 3, max: 16 }, { stat: 'lightDmg', es: 'Tronante', en: 'Shocking', min: 1, max: 24 },
  { stat: 'poisonDmg', es: 'Venenoso', en: 'Venomous', min: 4, max: 20 }, { stat: 'life', es: 'Robusto', en: 'Hale', min: 10, max: 60 },
  { stat: 'mana', es: 'Arcano', en: 'Arcane', min: 10, max: 50 }, { stat: 'allRes', es: 'Prismático', en: 'Prismatic', min: 5, max: 20 },
  { stat: 'magicFind', es: 'Afortunado', en: 'Lucky', min: 5, max: 25 }, { stat: 'critChance', es: 'Certero', en: 'Precise', min: 2, max: 8 },
];
const SUFFIX: { stat: StatKey; es: string; en: string; min: number; max: number }[] = [
  { stat: 'str', es: 'del Oso', en: 'of the Bear', min: 3, max: 20 }, { stat: 'dex', es: 'del Halcón', en: 'of the Hawk', min: 3, max: 20 },
  { stat: 'vit', es: 'del Toro', en: 'of the Ox', min: 3, max: 20 }, { stat: 'ene', es: 'del Búho', en: 'of the Owl', min: 3, max: 20 },
  { stat: 'atkSpeed', es: 'de la Prisa', en: 'of Haste', min: 5, max: 20 }, { stat: 'lifeSteal', es: 'del Vampiro', en: 'of the Vampire', min: 2, max: 7 },
  { stat: 'moveSpeed', es: 'del Viento', en: 'of the Wind', min: 5, max: 20 }, { stat: 'thorns', es: 'de las Espinas', en: 'of Thorns', min: 3, max: 25 },
  { stat: 'lifeRegen', es: 'de la Vida', en: 'of Life', min: 1, max: 8 }, { stat: 'goldFind', es: 'del Avaro', en: 'of Greed', min: 10, max: 60 },
];
const RARE_A = [['Pesadilla', 'Nightmare'], ['Ira', 'Wrath'], ['Cuervo', 'Raven'], ['Tormenta', 'Storm'], ['Sangre', 'Blood'], ['Hueso', 'Bone'], ['Brasa', 'Ember'], ['Escarcha', 'Frost'], ['Sombra', 'Shadow'], ['Plaga', 'Plague']];
const RARE_B = [['Mordida', 'Bite'], ['Canto', 'Song'], ['Garra', 'Claw'], ['Grito', 'Cry'], ['Marca', 'Mark'], ['Aguijón', 'Sting'], ['Lamento', 'Lament'], ['Corona', 'Crown'], ['Ala', 'Wing'], ['Juramento', 'Oath']];
const GLOWS = ['#ff6a2a', '#5fb0ff', '#b48cff', '#7ad48a', '#ffd84a', '#ff4a6a'];

/** Objeto mágico (azul, 1 o 2 propiedades) o raro (amarillo, 3 a 5 y otro color) a partir de una base. */
export function rollItem(base: LootItem, rarity: 'magic' | 'rare', seed: number): LootItem {
  const r = rng(seed * 9973 + base.id.length * 31);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const lvlK = 1 + base.level / 30;
  const val = (a: { min: number; max: number }) => Math.round((a.min + (a.max - a.min) * r()) * lvlK);
  const mods: Mod[] = [];
  const pre = pick(PREFIX), suf = pick(SUFFIX);
  let name = base.name;
  if (rarity === 'magic') {
    if (r() < 0.75) { mods.push({ stat: pre.stat, value: val(pre) }); name = { es: `${name.es} ${pre.es.toLowerCase()}`, en: `${pre.en} ${name.en}` }; }
    if (r() < 0.75 || !mods.length) { mods.push({ stat: suf.stat, value: val(suf) }); name = { es: `${name.es} ${suf.es}`, en: `${name.en} ${suf.en}` }; }
  } else {
    const n = 3 + Math.floor(r() * 3);
    const pool = [...PREFIX, ...SUFFIX];
    while (mods.length < n) { const a = pick(pool); if (!mods.some((m) => m.stat === a.stat)) mods.push({ stat: a.stat, value: val(a) }); }
    const A = pick(RARE_A), B = pick(RARE_B);
    name = { es: `${B[0]} de ${A[0]}`, en: `${A[1]} ${B[1]}` };
  }
  // los raros cambian de color: acero teñido y una gema
  const design = base.design && rarity === 'rare'
    ? { ...base.design, blade: metalMat(pick(['#aab5c3', '#8ea4c0', '#b8a68e', '#9a8ab8', '#7aa898'])), gem: GEM_COLORS[pick(['ruby', 'sapphire', 'emerald', 'topaz', 'amethyst'] as GemColor[])], glow: r() < 0.5 ? pick(GLOWS) : null }
    : base.design;
  return { ...base, id: `${base.id}_${rarity}_${seed}`, rarity, name, design, stats: { ...base.stats, mods: [...base.stats.mods, ...mods] } };
}

// ---------- legendarios ----------

const L = (
  id: string, es: string, en: string, base: LootBase, design: WeaponDesign | OffhandDesign | JewelDesign | Partial<TierLook>, level: number, stats: Partial<ItemStats> & { mods: Mod[] },
  flavorEs: string, flavorEn: string, extra: Partial<LootItem> = {},
): LootItem => ({ id, name: { es, en }, rarity: 'legendary', base, design, level, stats: { ...stats }, flavor: { es: flavorEs, en: flavorEn }, twoHanded: twoH(base), ...extra });
const twoH = (b: LootBase) => b.cat === 'weapon' && TWO_HANDED.includes(b.icon);
const W = (icon: WeaponIcon): LootBase => ({ cat: 'weapon', icon });
const O = (icon: OffhandIcon): LootBase => ({ cat: 'offhand', icon });
const J = (icon: JewelIcon): LootBase => ({ cat: 'jewel', icon });
const A = (slot: ArmorSlot, line: ArmorLine): LootBase => ({ cat: 'armor', slot, line, tier: 5 });
const m = (stat: StatKey, value: number): Mod => ({ stat, value });
const dmg = (icon: WeaponIcon, k: number) => { const [a, b, s] = W_BASE[icon]; return { damage: [Math.round(a * k), Math.round(b * k)] as [number, number], speed: s }; };

export const LEGENDARIES: LootItem[] = [
  // los de nivel bajo, para el cofre del Claro Escondido del Mundo 1: uno para cada niña
  L('pluma_de_cuervo', 'Arco Pluma de Cuervo', 'Ravenfeather Bow', W('bow'), { blade: metalMat('#2a2a3e'), grip: MAT.silver, gem: '#9a3ad8', glow: '#b48cff', feather: '#1a1a26', accent: 'stars' }, 8,
    { ...dmg('bow', 2), mods: [m('atkSpeed', 20), m('critChance', 8), m('moveSpeed', 8)] }, 'Los cuervos del bosque lo dejaron en el claro. Para ti.', 'The forest crows left it in the clearing. For you.'),
  L('ramita_del_abuelo', 'Ramita del Abuelo Roble', "Grandfather Oak's Twig", W('wand'), { haft: MAT.palewood, guard: MAT.gold, gem: '#5fd47a', glow: '#9affb0', accent: 'leaves' }, 9,
    { ...dmg('wand', 2), mods: [m('dmgPct', 60), m('petDmg', 30), m('lifeRegen', 4)] }, 'Te la dio sonriendo. Todavía le salen hojas.', 'He gave it to you with a smile. It still grows leaves.'),
  // espadas
  L('filo_del_alba', 'Filo del Alba', 'Dawnedge', W('sword'), { blade: MAT.silver, edge: MAT.palegold, guard: MAT.gold, pommel: MAT.gold, gem: '#ffd86a', glow: '#ffe9a0', accent: 'holy', guardShape: 'wings', shape: 'broad' }, 20,
    { ...dmg('sword', 3.4), mods: [m('dmgPct', 120), m('lightDmg', 30), m('healPct', 15), m('allRes', 10)] }, 'La primera luz del día corta más que el acero.', 'The first light of day cuts deeper than steel.'),
  L('colmillo_de_ceniza', 'Colmillo de Ceniza', 'Ashfang', W('scimitar'), { blade: MAT.obsidian, guard: MAT.copper, pommel: MAT.copper, gem: '#ff6a2a', glow: '#ff7a1a', accent: 'cracks', guardShape: 'crescent' }, 24,
    { ...dmg('scimitar', 3.6), mods: [m('fireDmg', 45), m('atkSpeed', 20), m('fireRes', 25)] }, 'Forjado en la boca de un volcán dormido.', 'Forged in the mouth of a sleeping volcano.'),
  L('susurro_gelido', 'Susurro Gélido', 'Frostwhisper', W('katana'), { blade: crystalMat('#bfe8ff'), guard: MAT.silver, grip: { hex: '#2a4a8a', kind: 'leather' }, glow: '#9fe8ff', accent: 'frost', shape: 'crystal', guardShape: 'disc' }, 28,
    { ...dmg('katana', 3.8), mods: [m('coldDmg', 50), m('critChance', 8), m('dex', 25)] }, 'No se oye. Se siente, y ya es tarde.', 'You never hear it. You feel it, and then it is too late.'),
  L('juramento_del_titan', 'Juramento del Titán', "Titan's Oath", W('greatsword'), { blade: MAT.steel, guard: MAT.gold, pommel: MAT.gold, grip: MAT.redleather, gem: '#2f62e6', glow: '#6cc8ff', accent: 'runes', guardShape: 'ornate', shape: 'broad' }, 34,
    { ...dmg('greatsword', 4.2), mods: [m('str', 40), m('dmgPct', 180), m('allSkills', 1), m('life', 80)] }, 'Lo juró un gigante. Lo cumple quien lo empuña.', 'A giant swore it. Whoever wields it keeps the oath.'),
  L('hoja_del_vacio', 'Hoja del Vacío', 'Voidreaver', W('greatsword'), { blade: metalMat('#2a1e44'), edge: metalMat('#8a6aff'), guard: MAT.obsidian, pommel: MAT.obsidian, gem: '#9a3ad8', glow: '#b48cff', accent: 'stars', guardShape: 'crescent', shape: 'flame' }, 45,
    { ...dmg('greatsword', 5), mods: [m('dmgPct', 220), m('lifeSteal', 8), m('critDmg', 60), m('manaSteal', 4)] }, 'Dentro de la hoja hay un cielo sin estrellas.', 'Inside the blade lies a starless sky.'),
  // dagas
  L('beso_de_la_vibora', 'Beso de la Víbora', "Viper's Kiss", W('kris'), { blade: metalMat('#5a7a4a'), guard: MAT.bronze, pommel: MAT.bronze, gem: '#1fb35e', glow: '#7aff6a', accent: 'drip' }, 16,
    { ...dmg('kris', 3.2), mods: [m('poisonDmg', 60), m('atkSpeed', 25), m('poisonRes', 30)] }, 'Un beso. Uno solo.', 'One kiss. Just one.'),
  L('ultima_sombra', 'Última Sombra', 'Last Shadow', W('dagger'), { blade: MAT.obsidian, edge: metalMat('#c8a0ff'), guard: MAT.darksteel, pommel: MAT.darksteel, gem: '#d8243e', glow: '#ff3a5a', accent: 'veins', guardShape: 'crescent' }, 40,
    { ...dmg('dagger', 5), mods: [m('critChance', 15), m('critDmg', 100), m('moveSpeed', 15)] }, 'Lo último que ve tu enemigo es tu propia sombra.', 'The last thing your foe sees is your shadow.'),
  // hachas
  L('partetormentas', 'Partetormentas', 'Stormsplitter', W('axe'), { blade: MAT.steel, edge: MAT.mithril, guard: MAT.silver, haft: MAT.darkwood, gem: '#5fb0ff', glow: '#9fdcff', accent: 'lightning', shape: 'wicked' }, 22,
    { ...dmg('axe', 3.6), mods: [m('lightDmg', 60), m('atkSpeed', 15), m('lightRes', 30)] }, 'Cada golpe llama a un trueno.', 'Every swing calls a thunderclap.'),
  L('furia_del_norte', 'Furia del Norte', 'Northern Fury', W('greataxe'), { blade: MAT.mithril, guard: MAT.silver, haft: MAT.palewood, gem: '#bfe8ff', glow: '#bfe8ff', accent: 'frost' }, 30,
    { ...dmg('greataxe', 4), mods: [m('coldDmg', 70), m('str', 30), m('coldRes', 40), m('life', 60)] }, 'El invierno también tiene filo.', 'Winter has an edge too.'),
  L('verdugo_carmesi', 'Verdugo Carmesí', 'Crimson Headsman', W('greataxe'), { blade: MAT.bloodsteel, edge: metalMat('#ff8a8a'), guard: MAT.darksteel, haft: MAT.darkwood, gem: '#d8243e', glow: '#ff3a3a', accent: 'drip', shape: 'wicked' }, 42,
    { ...dmg('greataxe', 5), mods: [m('dmgPct', 250), m('lifeSteal', 10), m('critDmg', 50)] }, 'Nunca se limpia. Nunca se seca.', 'Never cleaned. Never dry.'),
  // mazas y martillos
  L('martillo_del_trueno', 'Martillo del Trueno', 'Thunder Maul', W('maul'), { blade: MAT.silver, guard: MAT.gold, haft: MAT.darkwood, gem: '#5fb0ff', glow: '#9fdcff', accent: 'lightning' }, 38,
    { ...dmg('maul', 4.4), mods: [m('lightDmg', 90), m('str', 35), m('allSkills', 1)] }, 'Hasta Thor lo mira con respeto.', 'Even Thor looks at it with respect.'),
  L('lucero_sagrado', 'Lucero Sagrado', 'Holy Morningstar', W('morning_star'), { blade: MAT.palegold, edge: MAT.silver, guard: MAT.gold, haft: MAT.palewood, gem: '#ffd86a', glow: '#ffe9a0' }, 26,
    { ...dmg('morning_star', 3.6), mods: [m('dmgPct', 140), m('healPct', 20), m('lifeRegen', 6)] }, 'Brilla más cuando la noche es más oscura.', 'It shines brightest on the darkest nights.'),
  L('cetro_de_brasas', 'Cetro de Brasas', 'Ember Scepter', W('scepter'), { blade: MAT.copper, guard: MAT.gold, gem: '#ff6a2a', glow: '#ffb03a', floating: true }, 24,
    { ...dmg('scepter', 3.2), mods: [m('fireDmg', 40), m('allSkills', 2), m('castSpeed', 20)] }, 'Las brasas nunca se apagan. Solo esperan.', 'Embers never die. They only wait.'),
  L('mangual_de_almas', 'Mangual de las Almas', 'Soulflail', W('flail'), { blade: metalMat('#4a5a5a'), edge: MAT.bone, guard: MAT.darksteel, haft: MAT.darkwood, glow: '#7aff9a' }, 32,
    { ...dmg('flail', 4), mods: [m('dmgPct', 160), m('lifeSteal', 6), m('poisonDmg', 40)] }, 'Gimen al girar. No son las cadenas.', 'They moan as it spins. It is not the chains.'),
  // báculos y varitas
  L('aguja_del_archimago', 'Aguja del Archimago', "Archmage's Spire", W('staff'), { haft: MAT.darkwood, guard: MAT.gold, gem: '#9fe8ff', glow: '#9fe8ff', floating: true, accent: 'runes' }, 36,
    { ...dmg('staff', 3.6), mods: [m('allSkills', 3), m('castSpeed', 30), m('mana', 120), m('ene', 40)] }, 'El cristal flota porque no quiere tocar al mundo.', 'The crystal floats because it refuses to touch the world.'),
  L('rama_del_bosque_eterno', 'Rama del Bosque Eterno', 'Evergrove Branch', W('staff'), { haft: MAT.palewood, guard: MAT.bronze, gem: '#1fb35e', glow: '#7ad48a', accent: 'leaves' }, 20,
    { ...dmg('staff', 3), mods: [m('allSkills', 2), m('lifeRegen', 10), m('petDmg', 30), m('poisonRes', 25)] }, 'Todavía echa hojas. Todavía crece.', 'It still grows leaves. It is still growing.'),
  L('varita_de_hueso_lunar', 'Varita de Hueso Lunar', 'Moonbone Wand', W('wand'), { shape: 'bone', glow: '#9fdcff' }, 18,
    { ...dmg('wand', 3), mods: [m('allSkills', 2), m('petDmg', 40), m('mana', 40)] }, 'Tallada con la luz de una luna muerta.', 'Carved by the light of a dead moon.'),
  L('vara_de_tormenta', 'Vara de Tormenta', 'Stormrod', W('wand'), { haft: MAT.darkwood, guard: MAT.silver, gem: '#5fb0ff', glow: '#9fdcff', accent: 'lightning' }, 26,
    { ...dmg('wand', 3.4), mods: [m('lightDmg', 50), m('castSpeed', 25), m('allSkills', 1)] }, 'Huele a lluvia antes de cada hechizo.', 'It smells of rain before every spell.'),
  // arcos y ballesta
  L('aliento_del_fenix', 'Aliento del Fénix', 'Phoenix Breath', W('longbow'), { blade: metalMat('#c84a2a'), grip: MAT.gold, gem: '#ff6a2a', glow: '#ffb03a', accent: 'flames', feather: '#ff8a3a' }, 34,
    { ...dmg('longbow', 4), mods: [m('fireDmg', 70), m('atkSpeed', 20), m('dex', 35)] }, 'Cada flecha muere en llamas y renace en la siguiente.', 'Every arrow dies in flames and is reborn in the next.'),
  L('rompecielos', 'Rompecielos', 'Skybreaker', W('crossbow'), { haft: MAT.darkwood, blade: MAT.steel, guard: MAT.gold, gem: '#2f62e6', glow: '#9fdcff' }, 40,
    { ...dmg('crossbow', 4.6), mods: [m('dmgPct', 200), m('critChance', 10), m('lightDmg', 40)] }, 'Dicen que una vez le dio a una estrella.', 'They say it once hit a star.'),
  // astas
  L('alabarda_del_centinela', 'Alabarda del Centinela', "Sentinel's Halberd", W('halberd'), { blade: MAT.silver, guard: MAT.gold, haft: MAT.darkwood, glow: '#ffe9a0', accent: 'holy' }, 30,
    { ...dmg('halberd', 3.8), mods: [m('dmgPct', 150), m('armorPct', 25), m('blockPct', 10)] }, 'Nunca durmió en su guardia. Nunca.', 'It never slept on watch. Never.'),
  L('segador_palido', 'Segador Pálido', 'Pale Reaper', W('scythe'), { blade: MAT.bone, edge: metalMat('#d8f0ff'), haft: MAT.darkwood, guard: MAT.darksteel, gem: '#7aff9a', glow: '#7aff9a' }, 44,
    { ...dmg('scythe', 5), mods: [m('dmgPct', 230), m('lifeSteal', 12), m('petDmg', 50), m('allSkills', 1)] }, 'No siega trigo.', 'It does not reap wheat.'),
  L('lanza_solar', 'Lanza Solar', 'Sunspear', W('spear'), { blade: MAT.palegold, guard: MAT.gold, haft: MAT.palewood, glow: '#ffd86a', accent: 'holy', feather: '#d8243e' }, 22,
    { ...dmg('spear', 3.6), mods: [m('fireDmg', 35), m('lightDmg', 35), m('atkSpeed', 15)] }, 'Atrapó un rayo de sol y no lo soltó.', 'It caught a sunbeam and never let go.'),
  L('garras_de_pantera', 'Garras de la Pantera', 'Pantherclaws', W('claw'), { blade: MAT.darksteel, guard: MAT.obsidian, grip: MAT.darkleather, gem: '#7aff6a', glow: '#7aff6a' }, 28,
    { ...dmg('claw', 3.8), mods: [m('atkSpeed', 30), m('critChance', 10), m('moveSpeed', 20), m('dex', 30)] }, 'Silenciosas como su dueña.', 'As silent as their owner.'),
  // escudos y mano libre
  L('bastion_del_alba', 'Bastión del Alba', 'Dawn Bastion', O('shield_kite'), { face: '#f2efe6', rim: MAT.gold, emblem: 'sun', emblemMat: MAT.gold, gem: '#ffd86a', glow: '#ffe9a0' }, 30,
    { defense: 60, block: 35, mods: [m('allRes', 20), m('blockPct', 15), m('healPct', 15)] }, 'Detrás de él siempre amanece.', 'Behind it, dawn always breaks.'),
  L('muro_de_hierro_negro', 'Muro de Hierro Negro', 'Blackiron Wall', O('shield_tower'), { face: '#2a2630', rim: MAT.darksteel, emblem: 'skull', emblemMat: MAT.bone, glow: '#ff3a3a' }, 38,
    { defense: 95, block: 40, mods: [m('thorns', 80), m('armorPct', 40), m('life', 100)] }, 'Lo que lo golpea, lo lamenta.', 'Whatever strikes it regrets it.'),
  L('egida_de_escamas', 'Égida de Escamas de Dragón', 'Dragonscale Aegis', O('shield_round'), { face: '#7a1f2b', rim: MAT.gold, boss: MAT.gold, emblem: 'dragon', emblemMat: MAT.gold, gem: '#d8243e', glow: '#ff7a1a' }, 34,
    { defense: 70, block: 30, mods: [m('fireRes', 45), m('fireDmg', 30), m('str', 20)] }, 'El dragón no la dio. Se la quitaron.', 'The dragon did not give it. It was taken.'),
  L('orbe_de_la_eternidad', 'Orbe de la Eternidad', 'Eternity Orb', O('orb'), { rim: MAT.gold, gem: '#b48cff', glow: '#e0c8ff' }, 36,
    { defense: 10, mods: [m('allSkills', 2), m('mana', 150), m('cdr', 15)] }, 'Adentro, el tiempo da vueltas en círculo.', 'Inside, time runs in circles.'),
  L('cabeza_susurrante', 'Cabeza Susurrante', 'Whispering Head', O('shrunken_head'), { glow: '#7aff9a' }, 28,
    { defense: 12, mods: [m('petDmg', 60), m('allSkills', 2), m('poisonDmg', 30)] }, 'Te dice secretos. Algunos son ciertos.', 'It tells you secrets. Some are true.'),
  L('tomo_de_mil_nombres', 'Tomo de los Mil Nombres', 'Tome of a Thousand Names', O('tome'), { face: '#3a1a4a', rim: MAT.gold, emblem: 'eye', emblemMat: MAT.gold, gem: '#d8243e', glow: '#b48cff' }, 32,
    { defense: 8, mods: [m('allSkills', 2), m('castSpeed', 25), m('ene', 30)] }, 'Leer un nombre en voz alta lo despierta.', 'Reading a name aloud wakes it.'),
  // armaduras legendarias (piezas de nivel 5)
  L('corona_del_rey_caido', 'Corona del Rey Caído', "Fallen King's Crown", A('helm', 'placas'), { helm: 'crown', base: '#e3ae3c', trim: '#f0d27a', gem: '#d8243e', glow: '#ffd86a' }, 40,
    { defense: 48, mods: [m('allSkills', 2), m('allRes', 20), m('magicFind', 30)] }, 'Todavía cree que manda.', 'It still thinks it rules.'),
  L('coraza_del_dragon_rojo', 'Coraza del Dragón Rojo', 'Red Dragon Cuirass', A('chest', 'placas'), { base: '#8e2a32', trim: '#e3ae3c', gem: '#ff6a2a', glow: '#ff7a1a' }, 42,
    { defense: 110, mods: [m('fireRes', 50), m('life', 150), m('thorns', 40)] }, 'Escamas que todavía están tibias.', 'Scales that are still warm.'),
  L('guanteletes_del_titan', 'Guanteletes del Titán', 'Titan Gauntlets', A('gloves', 'placas'), { base: '#6a7080', trim: '#e3ae3c', gem: '#2f62e6', glow: '#6cc8ff' }, 36,
    { defense: 28, mods: [m('str', 30), m('atkSpeed', 20), m('critChance', 6)] }, 'Para manos que mueven montañas.', 'For hands that move mountains.'),
  L('botas_de_siete_leguas', 'Botas de Siete Leguas', 'Seven-League Boots', A('boots', 'cuero'), { base: '#3a5a7a', trim: '#cfd6e0', gem: '#9fe8ff', glow: '#9fe8ff' }, 30,
    { defense: 24, mods: [m('moveSpeed', 40), m('dex', 20), m('magicFind', 20)] }, 'Un paso aquí, otro allá. Muy allá.', 'One step here, another there. Way over there.'),
  L('cinto_del_gigante', 'Cinto del Gigante', "Giant's Girdle", A('belt', 'placas'), { base: '#7a5a3a', belt: '#5a3a22', trim: '#e3ae3c', gem: '#d8243e', glow: '#ff8a1e' }, 34,
    { defense: 20, mods: [m('str', 40), m('vit', 30), m('life', 80)] }, 'Le queda grande a cualquiera. Y le sirve.', 'It is too big for anyone. And it fits.'),
  // joyas
  L('anillo_del_ojo_eterno', 'Anillo del Ojo Eterno', 'Ring of the Endless Eye', J('ring'), { metal: MAT.gold, gem: '#d8243e', glow: '#ff6a6a' }, 30,
    { mods: [m('allSkills', 1), m('critChance', 8), m('magicFind', 25)] }, 'Nunca parpadea.', 'It never blinks.'),
  L('sello_del_liche', 'Sello del Liche', 'Lich Seal', J('ring_band'), { metal: MAT.silver, gem: '#7aff9a', glow: '#7aff9a' }, 38,
    { mods: [m('manaSteal', 6), m('petDmg', 40), m('coldRes', 30)] }, 'Frío al tacto. Frío para siempre.', 'Cold to the touch. Cold forever.'),
  L('lagrima_de_la_diosa', 'Lágrima de la Diosa', 'Goddess Tear', J('amulet_pendant'), { metal: MAT.silver, gem: '#bfe8ff', glow: '#e0f4ff' }, 32,
    { mods: [m('allRes', 25), m('healPct', 25), m('allSkills', 1)] }, 'Lloró una sola vez. Por ti.', 'She wept only once. For you.'),
  L('corazon_de_estrella', 'Corazón de Estrella', 'Starheart', J('amulet'), { metal: MAT.gold, gem: '#ffd86a', glow: '#fff0b0' }, 45,
    { mods: [m('allSkills', 2), m('life', 100), m('mana', 100), m('allRes', 15)] }, 'Late. Despacio, pero late.', 'It beats. Slowly, but it beats.'),
];

// ---------- set Legado GG (verde): uno por cada miembro de la familia y uno de Thor ----------

export const SET_GG = 'legado_gg';
export const SET_NAME = { es: 'Legado GG', en: 'GG Legacy' };

const S = (id: string, es: string, en: string, base: LootBase, design: WeaponDesign | OffhandDesign | JewelDesign, stats: Partial<ItemStats> & { mods: Mod[] }, fEs: string, fEn: string): LootItem =>
  ({ id, name: { es, en }, rarity: 'set', base, design, level: 25, stats, flavor: { es: fEs, en: fEn }, set: SET_GG, twoHanded: twoH(base) });

export const SET_ITEMS: LootItem[] = [
  S('juramento_de_rick', 'Juramento de Rick', "Rick's Oath", W('sword'), { blade: MAT.silver, edge: MAT.palegold, guard: MAT.gold, pommel: MAT.gold, gem: '#2f62e6', glow: '#7fc8ff', accent: 'runes', guardShape: 'wings', shape: 'broad' },
    { ...dmg('sword', 3.8), mods: [m('dmgPct', 140), m('life', 60), m('allRes', 10)] }, 'Protege a los suyos primero. Siempre.', 'He protects his own first. Always.'),
  S('escudo_de_la_casa_gg', 'Escudo de la Casa GG', 'House GG Shield', O('shield_heater'), { face: '#1e3a7a', rim: MAT.gold, emblem: 'star', emblemMat: MAT.gold, gem: '#ffd86a' },
    { defense: 55, block: 32, mods: [m('blockPct', 12), m('allRes', 15), m('petArmor', 30)] }, 'Cuatro estrellas y un perro. Una casa.', 'Four stars and a dog. One house.'),
  S('baculo_de_steph', 'Báculo Estelar de Steph', "Steph's Starstaff", W('staff'), { haft: MAT.palewood, guard: MAT.gold, gem: '#f4a5b5', glow: '#ffb8d0', floating: true, accent: 'stars' },
    { ...dmg('staff', 3.4), mods: [m('allSkills', 2), m('healPct', 20), m('mana', 80)] }, 'Su magia no hace ruido, pero lo arregla todo.', 'Her magic makes no noise, yet fixes everything.'),
  S('arco_de_sophie', 'Arco Celeste de Sophie', "Sophie's Skybow", W('bow'), { blade: metalMat('#3fa8c8'), grip: MAT.silver, gem: '#2f62e6', glow: '#9fe8ff', feather: '#3fa8c8', accent: 'stars' },
    { ...dmg('bow', 3.6), mods: [m('dex', 25), m('atkSpeed', 20), m('critChance', 6)] }, 'Nunca falla. Bueno, casi nunca.', 'It never misses. Well, almost never.'),
  S('varita_de_alana', 'Varita en Flor de Alana', "Alana's Bloomwand", W('wand'), { haft: MAT.palewood, guard: MAT.gold, gem: '#f4a5c8', glow: '#ffc8e0', accent: 'leaves' },
    { ...dmg('wand', 3), mods: [m('allSkills', 1), m('lifeRegen', 8), m('petDmg', 25)] }, 'Donde apunta, crecen flores.', 'Wherever it points, flowers grow.'),
  S('collar_de_thor', 'Collar de Thor', "Thor's Collar", J('amulet'), { metal: MAT.gold, gem: '#d8243e', glow: '#ffd86a' },
    { mods: [m('petDmg', 50), m('petArmor', 50), m('moveSpeed', 10)] }, 'El mejor guardián de la casa también tiene su tesoro.', 'The best guardian of the house has his treasure too.'),
];

/** Bonos del set por piezas puestas. */
export const SET_BONUS: { pieces: number; mods: Mod[] }[] = [
  { pieces: 2, mods: [m('allRes', 15)] },
  { pieces: 3, mods: [m('life', 120), m('petDmg', 30)] },
  { pieces: 4, mods: [m('allSkills', 1), m('magicFind', 30)] },
  { pieces: 6, mods: [m('dmgPct', 100), m('petArmor', 60), m('healPct', 25)] },
];

/** Todo lo especial: legendarios y set. */
export const UNIQUE_LOOT: LootItem[] = [...LEGENDARIES, ...SET_ITEMS];

export function findLoot(id: string): LootItem | undefined {
  return UNIQUE_LOOT.find((x) => x.id === id);
}

/** Lista completa de bases normales (cada arma y escudo en sus 3 grados). */
export function allBases(): LootItem[] {
  const out: LootItem[] = [];
  for (const g of [1, 2, 3] as const) for (const w of WEAPON_ICONS) out.push(baseWeapon(w, g));
  for (const g of [1, 2, 3] as const) for (const o of OFFHAND_ICONS) out.push(baseOffhand(o, g));
  return out;
}

/** Todas las piezas de armadura: 4 líneas x 7 piezas x 5 niveles. */
export function allArmor(): LootItem[] {
  const out: LootItem[] = [];
  for (const line of ARMOR_LINES) for (const slot of ARMOR_SLOTS) for (const t of ARMOR_TIERS) out.push(baseArmor(slot, line, t));
  return out;
}

const POTION_NAMES: Record<PotionKind, { es: string; en: string }> = {
  health: { es: 'Poción de vida', en: 'Healing Potion' }, mana: { es: 'Poción de maná', en: 'Mana Potion' }, rejuv: { es: 'Poción de rejuvenecimiento', en: 'Rejuvenation Potion' },
  stamina: { es: 'Poción de aguante', en: 'Stamina Potion' }, antidote: { es: 'Antídoto', en: 'Antidote' }, thawing: { es: 'Poción descongelante', en: 'Thawing Potion' },
};
const SIZE_NAMES: Record<PotionSize, { es: string; en: string }> = {
  minor: { es: ' menor', en: 'Minor ' }, light: { es: ' ligera', en: 'Light ' }, normal: { es: '', en: '' }, greater: { es: ' mayor', en: 'Greater ' }, super: { es: ' suprema', en: 'Super ' },
};
const CONSUMABLE_NAMES: Record<ConsumableIcon, { es: string; en: string }> = {
  scroll_portal: { es: 'Pergamino de portal', en: 'Portal Scroll' }, scroll_identify: { es: 'Pergamino de identificar', en: 'Identify Scroll' },
  tome_portal: { es: 'Tomo de portales', en: 'Tome of Portals' }, key: { es: 'Llave', en: 'Key' }, key_boss: { es: 'Llave del jefe', en: 'Boss Key' },
  gold: { es: 'Oro', en: 'Gold' }, ore: { es: 'Mineral', en: 'Ore' }, essence: { es: 'Esencia', en: 'Essence' }, skull_trophy: { es: 'Trofeo de calavera', en: 'Skull Trophy' }, map: { es: 'Mapa del tesoro', en: 'Treasure Map' },
};
const GEM_NAMES: Record<GemColor, { es: string; en: string; f: boolean; stat: StatKey; k: number }> = {
  ruby: { es: 'Rubí', en: 'Ruby', f: false, stat: 'life', k: 10 }, sapphire: { es: 'Zafiro', en: 'Sapphire', f: false, stat: 'mana', k: 10 },
  emerald: { es: 'Esmeralda', en: 'Emerald', f: true, stat: 'dex', k: 3 }, topaz: { es: 'Topacio', en: 'Topaz', f: false, stat: 'magicFind', k: 5 },
  amethyst: { es: 'Amatista', en: 'Amethyst', f: true, stat: 'str', k: 3 }, diamond: { es: 'Diamante', en: 'Diamond', f: false, stat: 'allRes', k: 3 },
  skull: { es: 'Calavera', en: 'Skull', f: true, stat: 'lifeSteal', k: 1 },
};
const GRADE_ADJ: Record<GemGrade, { m: string; f: string; en: string }> = {
  chipped: { m: ' astillado', f: ' astillada', en: 'Chipped ' }, flawed: { m: ' imperfecto', f: ' imperfecta', en: 'Flawed ' }, normal: { m: '', f: '', en: '' },
  flawless: { m: ' impecable', f: ' impecable', en: 'Flawless ' }, perfect: { m: ' perfecto', f: ' perfecta', en: 'Perfect ' },
};
export const RUNE_NAMES = ['Aen', 'Bryn', 'Cor', 'Dusk', 'Eir', 'Fen', 'Gal', 'Hroth', 'Isa', 'Jor', 'Kael', 'Lum'];
const RUNE_MODS: Mod[] = [
  m('life', 15), m('mana', 15), m('dmgPct', 15), m('fireRes', 15), m('coldRes', 15), m('lightRes', 15), m('atkSpeed', 10), m('magicFind', 15),
  m('allRes', 8), m('critChance', 4), m('allSkills', 1), m('lifeSteal', 4),
];

/** Joyas, pociones, consumibles, gemas y runas. */
export function allMisc(): LootItem[] {
  const out: LootItem[] = [];
  JEWEL_ICONS.forEach((icon) => out.push({ id: `jewel_${icon}`, name: JEWEL_NAMES[icon], rarity: 'normal', base: { cat: 'jewel', icon }, level: 1, stats: { mods: [] } }));
  for (const kind of POTION_KINDS) POTION_SIZES.forEach((size, i) => {
    const amt = [40, 90, 150, 250, 400][i];
    const mods: Mod[] = kind === 'health' ? [m('restoreLife', amt)] : kind === 'mana' ? [m('restoreMana', amt)] : kind === 'rejuv' ? [m('restoreLife', Math.round(amt * 0.6)), m('restoreMana', Math.round(amt * 0.6))] : [];
    out.push({ id: `potion_${kind}_${size}`, name: { es: POTION_NAMES[kind].es + SIZE_NAMES[size].es, en: SIZE_NAMES[size].en + POTION_NAMES[kind].en }, rarity: 'normal', base: { cat: 'potion', kind, size }, level: 1 + i * 10, stats: { mods } });
  });
  CONSUMABLE_ICONS.forEach((icon) => out.push({ id: icon, name: CONSUMABLE_NAMES[icon], rarity: 'normal', base: { cat: 'consumable', icon }, level: 1, stats: { mods: [] } }));
  for (const kind of GEM_KINDS) GEM_GRADES.forEach((grade, i) => {
    const g = GEM_NAMES[kind];
    out.push({ id: `gem_${kind}_${grade}`, name: { es: g.es + (g.f ? GRADE_ADJ[grade].f : GRADE_ADJ[grade].m), en: GRADE_ADJ[grade].en + g.en }, rarity: 'normal', base: { cat: 'gem', kind, grade }, level: 1 + i * 9, stats: { mods: [m(g.stat, g.k * (i + 1))] } });
  });
  for (let i = 0; i < RUNE_COUNT; i++) out.push({ id: `rune_${RUNE_NAMES[i].toLowerCase()}`, name: { es: `Runa ${RUNE_NAMES[i]}`, en: `${RUNE_NAMES[i]} Rune` }, rarity: 'normal', base: { cat: 'rune', index: i }, level: 1 + i * 4, stats: { mods: [RUNE_MODS[i]] } });
  return out;
}

/** Armaduras de mascota (la barda de Thor), 5 niveles. */
export function allPetArmor(): LootItem[] {
  return PET_ARMOR.map((p, i) => ({
    id: `pet_armor_${i + 1}`, name: p.name, rarity: i === 4 ? 'legendary' : i === 3 ? 'rare' : 'normal', base: { cat: 'pet', tier: i + 1 }, level: p.level,
    stats: { defense: p.defense, mods: i >= 3 ? [m('petDmg', i === 4 ? 40 : 20), m('petArmor', i === 4 ? 50 : 25)] : [] },
  }));
}

/** Todo el botín del juego: bases, armaduras, joyas y consumibles, armaduras de mascota, mágicos y raros de nivel bajo, legendarios y set. */
export function allLoot(): LootItem[] {
  return [...allBases(), ...allArmor(), ...allMisc(), ...allPetArmor(), ...earlyLoot(), ...UNIQUE_LOOT];
}

export { gemMat, glowMat };
