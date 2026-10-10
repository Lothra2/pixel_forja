import { MAT, metalMat, GEM_COLORS } from './materials';
import type { WeaponIcon, WeaponDesign } from './weapons';
import type { OffhandIcon, OffhandDesign, JewelIcon, JewelDesign } from './misc';
import type { ArmorLine, ArmorSlot, TierLook } from './armor';
import { baseWeapon, baseOffhand, baseArmor, JEWEL_NAMES, type LootItem, type Mod, type StatKey } from './catalog';

/**
 * Botín de nivel bajo (2 a 10) para el Mundo 1: 24 mágicos y 8 raros (los 2 legendarios van en LEGENDARIES). Hecho a mano, no al azar,
 * para que en el primer bosque caigan haces de color y para que cada propiedad sea una de las que el juego usa
 * (daño, defensa, vida, maná, % de daño y armadura, velocidades, crítico, regeneración, curación y mascota).
 */

/** Las propiedades que el Mundo 1 sabe aplicar. Cualquier otra se mostraría pero no haría nada. */
export const EARLY_STATS: StatKey[] = ['life', 'mana', 'dmgPct', 'armorPct', 'atkSpeed', 'castSpeed', 'moveSpeed', 'critChance', 'lifeRegen', 'healPct', 'petDmg', 'petArmor', 'restoreLife', 'restoreMana'];

const m = (stat: StatKey, value: number): Mod => ({ stat, value });
type Name = [string, string];

/** Una base con nombre, rareza, nivel y propiedades nuevas (las de la base se conservan). */
function early(base: LootItem, id: string, rarity: 'magic' | 'rare', level: number, [es, en]: Name, mods: Mod[], design?: LootItem['design']): LootItem {
  return { ...base, id, rarity, level, name: { es, en }, ...(design ? { design: { ...base.design, ...design } } : {}), stats: { ...base.stats, mods: [...base.stats.mods, ...mods] } };
}
const wpn = (icon: WeaponIcon) => baseWeapon(icon, 1);
const off = (icon: OffhandIcon) => baseOffhand(icon, 1);
const arm = (line: ArmorLine, slot: ArmorSlot, tier: 1 | 2) => baseArmor(slot, line, tier);
const jwl = (icon: JewelIcon): LootItem => ({ id: `jewel_${icon}`, name: JEWEL_NAMES[icon], rarity: 'normal', base: { cat: 'jewel', icon }, level: 1, stats: { mods: [] } });

/** 24 mágicos (azules): una o dos propiedades. */
export const earlyMagic = (): LootItem[] => [
  // un arma por cada arma de clase y el escudo
  early(wpn('bow'), 'm_arco_certero', 'magic', 2, ['Arco corto certero', 'Precise Short Bow'], [m('critChance', 3)]),
  early(wpn('wand'), 'm_varita_arcana', 'magic', 3, ['Varita arcana', 'Arcane Wand'], [m('mana', 15)]),
  early(wpn('sword'), 'm_espada_cruel', 'magic', 2, ['Espada cruel', 'Cruel Sword'], [m('dmgPct', 15)]),
  early(wpn('staff'), 'm_baculo_prisa', 'magic', 4, ['Báculo de la Prisa', 'Staff of Haste'], [m('castSpeed', 10), m('mana', 10)]),
  early(off('shield_round'), 'm_rodela_robusta', 'magic', 3, ['Rodela robusta', 'Hale Round Shield'], [m('life', 15)]),
  // 12 piezas de armadura en los casilleros de equipo
  early(arm('cuero', 'chest', 1), 'm_jubon_robusto', 'magic', 2, ['Jubón de cuero robusto', 'Hale Leather Jerkin'], [m('life', 12)]),
  early(arm('cuero', 'boots', 1), 'm_botas_viento', 'magic', 3, ['Botas de cuero del Viento', 'Leather Boots of the Wind'], [m('moveSpeed', 8)]),
  early(arm('cuero', 'gloves', 1), 'm_guantes_prisa', 'magic', 4, ['Guantes de cuero de la Prisa', 'Leather Gloves of Haste'], [m('atkSpeed', 6)]),
  early(arm('cuero', 'pants', 1), 'm_calzas_viento', 'magic', 6, ['Calzas de cuero del Viento', 'Leather Pants of the Wind'], [m('moveSpeed', 5), m('life', 8)]),
  early(arm('cuero', 'helm', 2), 'm_cinta_certera', 'magic', 9, ['Cinta de cuero certera', 'Precise Leather Headband'], [m('critChance', 4)]),
  early(arm('tunica', 'chest', 1), 'm_tunica_arcana', 'magic', 3, ['Túnica de aprendiz arcana', 'Arcane Apprentice Robe'], [m('mana', 20)]),
  early(arm('tunica', 'helm', 2), 'm_capucha_buho', 'magic', 8, ['Capucha de seda del Búho', 'Silk Hood of the Owl'], [m('castSpeed', 8), m('mana', 10)]),
  early(arm('malla', 'helm', 1), 'm_casco_robusto', 'magic', 5, ['Casco de anillas robusto', 'Hale Ring Mail Helm'], [m('life', 15), m('armorPct', 8)]),
  early(arm('malla', 'belt', 1), 'm_cinturon_robusto', 'magic', 4, ['Cinturón de anillas robusto', 'Hale Ring Mail Belt'], [m('life', 10)]),
  early(arm('malla', 'boots', 2), 'm_botas_malla_viento', 'magic', 10, ['Botas de malla del Viento', 'Chain Boots of the Wind'], [m('moveSpeed', 8), m('armorPct', 10)]),
  early(arm('placas', 'chest', 1), 'm_coraza_vida', 'magic', 6, ['Coraza de hierro de la Vida', 'Iron Breastplate of Life'], [m('lifeRegen', 2)]),
  early(arm('placas', 'shoulders', 1), 'm_hombreras_firmes', 'magic', 5, ['Hombreras de hierro firmes', 'Sturdy Iron Pauldrons'], [m('armorPct', 12)]),
  // 4 joyas
  early(jwl('ring'), 'm_anillo_vida', 'magic', 3, ['Anillo de la Vida', 'Ring of Life'], [m('lifeRegen', 2)], { metal: MAT.silver, gem: GEM_COLORS.emerald }),
  early(jwl('ring_band'), 'm_sortija_arcana', 'magic', 6, ['Sortija arcana', 'Arcane Band'], [m('mana', 20), m('castSpeed', 5)], { metal: MAT.silver, gem: GEM_COLORS.sapphire }),
  early(jwl('amulet'), 'm_amuleto_robusto', 'magic', 5, ['Amuleto robusto', 'Hale Amulet'], [m('life', 20)], { metal: MAT.bronze, gem: GEM_COLORS.ruby }),
  early(jwl('amulet_pendant'), 'm_colgante_manada', 'magic', 8, ['Colgante de la Manada', 'Pendant of the Pack'], [m('petDmg', 15), m('petArmor', 10)], { metal: MAT.bronze, gem: GEM_COLORS.topaz }),
  // 3 más
  early(off('quiver'), 'm_carcaj_prisa', 'magic', 4, ['Carcaj de la Prisa', 'Quiver of Haste'], [m('atkSpeed', 8)]),
  early(off('orb'), 'm_orbe_arcano', 'magic', 6, ['Orbe arcano', 'Arcane Orb'], [m('mana', 25)]),
  early(wpn('dagger'), 'm_daga_certera', 'magic', 5, ['Daga certera', 'Precise Dagger'], [m('critChance', 4), m('dmgPct', 10)]),
];

// los raros cambian de color: metal teñido y una gema
const tint = (hex: string, gem: string): WeaponDesign & OffhandDesign => ({ blade: metalMat(hex), gem, guard: MAT.bronze, pommel: MAT.bronze });

/** 8 raros (amarillos): dos o tres propiedades, al menos uno por clase. */
export const earlyRare = (): LootItem[] => [
  // amazona (Sophie)
  early(wpn('bow'), 'r_aguijon_de_cuervo', 'rare', 7, ['Aguijón de Cuervo', 'Raven Sting'], [m('dmgPct', 30), m('atkSpeed', 10), m('critChance', 4)], { ...tint('#5a6a8a', GEM_COLORS.sapphire), feather: '#2a2a3a' }),
  // druida (Alana)
  early(wpn('wand'), 'r_canto_del_bosque', 'rare', 8, ['Canto del Bosque', 'Forest Song'], [m('dmgPct', 25), m('castSpeed', 10), m('petDmg', 15)], { ...tint('#7aa898', GEM_COLORS.emerald), glow: '#7ad48a', accent: 'leaves' }),
  // hechicera (Steph)
  early(wpn('staff'), 'r_corona_de_escarcha', 'rare', 9, ['Corona de Escarcha', 'Frost Crown'], [m('mana', 35), m('castSpeed', 12), m('dmgPct', 20)], { ...tint('#8ea4c0', GEM_COLORS.sapphire), glow: '#9fe8ff', floating: true }),
  // paladín (Rick)
  early(wpn('sword'), 'r_juramento_de_hierro', 'rare', 8, ['Juramento de Hierro', 'Iron Oath'], [m('dmgPct', 30), m('life', 20), m('armorPct', 10)], { ...tint('#b8a68e', GEM_COLORS.ruby), guardShape: 'wings' }),
  early(off('shield_heater'), 'r_muralla_del_alba', 'rare', 10, ['Muralla del Alba', 'Dawn Rampart'], [m('armorPct', 20), m('life', 25), m('healPct', 10)], { face: '#7a5a1a', rim: MAT.bronze, emblem: 'sun', emblemMat: MAT.gold, gem: GEM_COLORS.topaz }),
  // armaduras y un anillo para Thor
  early(arm('cuero', 'chest', 2), 'r_piel_del_lobo_gris', 'rare', 8, ['Piel del Lobo Gris', 'Grey Wolf Hide'], [m('life', 25), m('moveSpeed', 6), m('armorPct', 10)], { base: '#5a5a62', gem: GEM_COLORS.emerald } as Partial<TierLook>),
  early(arm('tunica', 'chest', 2), 'r_manto_de_luna_nueva', 'rare', 9, ['Manto de Luna Nueva', 'New Moon Mantle'], [m('mana', 30), m('lifeRegen', 3), m('castSpeed', 8)], { base: '#1e2450', gem: GEM_COLORS.amethyst } as Partial<TierLook>),
  early(jwl('ring'), 'r_marca_de_la_manada', 'rare', 10, ['Marca de la Manada', 'Mark of the Pack'], [m('petDmg', 25), m('petArmor', 20), m('life', 15)], { metal: MAT.gold, gem: GEM_COLORS.ruby, glow: '#ffb060' } as JewelDesign),
];

/** Mágicos y raros de nivel bajo (los 2 legendarios de nivel 8 y 9 están en LEGENDARIES: pluma_de_cuervo y ramita_del_abuelo). */
export const earlyLoot = (): LootItem[] => [...earlyMagic(), ...earlyRare()];
