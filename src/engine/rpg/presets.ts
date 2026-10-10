import type { HumanFicha, Gear } from '../sheet/ficha';
import { fichaFromAvatar } from '../sheet/build';
import { recolor, type ColorSlot } from '../sheet/recolor';
import { defaultAvatar, type Avatar } from '../head3d/avatar';
import { withLpc } from '../head3d/thumb';
import { DEFAULT_LPC, type LpcLook } from '../parts/lpc';
import { bodyProportions, DEFAULT_BODY, type BodyType } from '../rig/dims';
import { ARMOR_EVOLUTION, type ArmorLine, type ArmorTier, type TierLook } from '../loot/armor';
import type { LootItem } from '../loot/catalog';
import { handKindOf } from '../loot/render';

/**
 * Clases de héroe y enemigos listos para un RPG de acción (estilo Diablo).
 * Una clase viste y arma a TU personaje (no le cambia la cara ni el pelo). Un enemigo es un personaje completo.
 */

type Outfit = HumanFicha['outfit'];
interface Kit {
  outfit: Partial<Outfit>;
  colors?: Partial<Record<ColorSlot, string>>;
  gear: Gear;
  /** gorro o casco, orejas, cuernos */
  lpc?: Partial<LpcLook>;
}

export type HeroClass = 'barbaro' | 'paladin' | 'hechicera' | 'amazona' | 'nigromante' | 'druida' | 'asesina';
export const HERO_CLASSES: HeroClass[] = ['barbaro', 'paladin', 'hechicera', 'amazona', 'nigromante', 'druida', 'asesina'];

const NO_ARMOR: Partial<Outfit> = { armor: null, armorColor: undefined, trim: null, cape: null, pauldrons: false, belt: null, armorTier: undefined, armorGem: null, armorGlow: null };

export const CLASS_KITS: Record<HeroClass, Kit> = {
  barbaro: {
    outfit: { armor: 'cuero', armorColor: '#6b4426', sleeves: 'none', bottom: 'pants', belt: '#3a2414', shoes: 'botas', pauldrons: true },
    colors: { bottom: '#4a3a2a', shoes: '#3a2a1a' }, gear: { main: 'axe', off: null }, lpc: { hat: 'barbarian', hatColor: null },
  },
  paladin: {
    outfit: { armor: 'placas', armorColor: '#b8c2cc', trim: '#e2b74a', cape: '#2a4fa0', pauldrons: true, belt: '#5a3a22', bottom: 'pants', shoes: 'botas' },
    colors: { bottom: '#3a3348' }, gear: { main: 'sword', off: 'shield_kite', shield: '#2f5fb8' }, lpc: { hat: null },
  },
  hechicera: {
    outfit: { armor: 'tunica', armorColor: '#3a2a7a', trim: '#5fe0ff', belt: '#2a1a12', shoes: 'botas' },
    gear: { main: 'staff', off: 'orb', glow: '#5fe0ff' }, lpc: { hat: 'tiara', hatColor: null },
  },
  amazona: {
    outfit: { armor: 'cuero', armorColor: '#8a6a3a', sleeves: 'short', bottom: 'skirt', belt: '#5a3a22', shoes: 'botas', trim: '#e2b74a' },
    colors: { bottom: '#6a4a2a' }, gear: { main: 'spear', off: 'shield_round', shield: '#8a2a2a' }, lpc: { hat: 'headband', hatColor: '#8a2a2a' },
  },
  nigromante: {
    outfit: { armor: 'tunica', armorColor: '#1e1a24', trim: '#7ad48a', cape: '#141018', pauldrons: true, shoes: 'botas' },
    gear: { main: 'wand', off: 'tome', glow: '#7ad48a' }, lpc: { hat: 'hood', hatColor: '#1e1a24' },
  },
  druida: {
    outfit: { armor: 'cuero', armorColor: '#4a6a2a', cape: '#5a3a1a', belt: '#3a2414', bottom: 'pants', shoes: 'botas' },
    colors: { bottom: '#3a3a22' }, gear: { main: 'club', off: null }, lpc: { hat: null },
  },
  asesina: {
    outfit: { armor: 'cuero', armorColor: '#2a2a34', sleeves: 'long', bottom: 'pants', belt: '#1a1a22', shoes: 'botas' },
    colors: { top: '#2a2a34', bottom: '#1e1e28' }, gear: { main: 'claws', off: null }, lpc: { hat: 'bandana2', hatColor: '#3a1a2a' },
  },
};

function applyKit(f: HumanFicha, k: Kit): HumanFicha {
  let out: HumanFicha = { ...f, outfit: { ...f.outfit, ...NO_ARMOR, ...k.outfit }, gear: { ...k.gear } };
  if (out.avatar?.lpc && k.lpc) out = { ...out, avatar: { ...out.avatar, kit: 'lpc', lpc: { ...out.avatar.lpc, ...k.lpc } } };
  for (const [slot, hex] of Object.entries(k.colors ?? {})) out = recolor(out, slot as ColorSlot, hex) as HumanFicha;
  return out;
}

/** Viste y arma a un personaje con una clase (la cara, el pelo y los colores de piel quedan). */
export function applyClass(f: HumanFicha, c: HeroClass): HumanFicha {
  return applyKit(f, CLASS_KITS[c]);
}

/** Animaciones de un héroe de RPG de acción, en el orden en que suelen pedirse. */
export const HERO_RPG_ANIMS = [
  'idle', 'walk', 'run', 'attack', 'attack_heavy', 'attack_thrust', 'cast', 'nova', 'channel', 'whirlwind', 'leap', 'charge',
  'dodge', 'shoot_bow', 'summon', 'warcry', 'block_shield', 'use_item', 'throw', 'hit', 'die',
];

// ---------- enemigos ----------

export type EnemyId =
  | 'esqueleto' | 'esqueleto_mago' | 'zombi' | 'orco' | 'goblin_arquero' | 'vampiro' | 'hombre_lobo'
  | 'minotauro' | 'hombre_lagarto' | 'demonio' | 'rata' | 'calabaza' | 'trol' | 'guardian_cobre';
export const ENEMIES: EnemyId[] = ['esqueleto', 'esqueleto_mago', 'zombi', 'orco', 'goblin_arquero', 'vampiro', 'hombre_lobo', 'minotauro', 'hombre_lagarto', 'demonio', 'rata', 'calabaza', 'trol', 'guardian_cobre'];

interface EnemyDef extends Kit {
  head: string;
  skin?: string;
  body?: Partial<BodyType>;
  /** sin camisa: el torso del color de la piel */
  bare?: boolean;
  /** jefe: más grande, va en celdas de 64 px */
  boss?: boolean;
  /** élite grande: celda de 64 sin ser jefe */
  big?: boolean;
  /** proporciones a mano (sobre las del cuerpo): para que un élite o un jefe impongan */
  size?: { height?: number; build?: number; shoulders?: number; head?: number; arms?: number };
  anims: string[];
}

const BASIC_FOE = ['idle', 'walk', 'attack', 'hit', 'die'];
const ENEMY_DEFS: Record<EnemyId, EnemyDef> = {
  esqueleto: { head: 'skeleton', bare: true, body: { build: 'delgado' }, outfit: { sleeves: 'none', bottom: 'shorts', belt: '#3a2a20' }, colors: { bottom: '#3a3030' }, gear: { main: 'sword', off: 'shield_round', shield: '#5a4a3a' }, anims: [...BASIC_FOE, 'rise', 'block_shield'] },
  esqueleto_mago: { head: 'skeleton', body: { build: 'delgado' }, outfit: { armor: 'tunica', armorColor: '#2a1a3a', trim: '#9a3ad8' }, gear: { main: 'staff', off: null, glow: '#c060ff' }, lpc: { hat: 'hood', hatColor: '#2a1a3a' }, anims: [...BASIC_FOE, 'cast', 'nova', 'rise'] },
  zombi: { head: 'zombie', outfit: { sleeves: 'short', bottom: 'pants', shoes: 'descalzo' }, colors: { top: '#4a5a3a', bottom: '#3a3428' }, gear: { main: null, off: null }, anims: ['idle', 'zombie_walk', 'claw', 'lunge', 'hit', 'die', 'rise'] },
  orco: { head: 'orc', body: { build: 'robusto' }, outfit: { armor: 'cuero', armorColor: '#5a3a22', sleeves: 'none', pauldrons: true, belt: '#2a1a12', bottom: 'pants', shoes: 'botas' }, colors: { bottom: '#3a3020' }, gear: { main: 'axe', off: 'shield_round', shield: '#6a3a2a' }, anims: [...BASIC_FOE, 'attack_heavy', 'warcry', 'charge'] },
  goblin_arquero: { head: 'goblin', body: { age: 'nino', build: 'delgado' }, outfit: { armor: 'cuero', armorColor: '#4a5a2a', bottom: 'shorts', belt: '#3a2a1a', shoes: 'descalzo' }, colors: { bottom: '#5a4a2a' }, gear: { main: 'bow', off: null }, anims: ['idle', 'walk', 'run', 'shoot_bow', 'dodge', 'hit', 'die'] },
  vampiro: { head: 'vampire', outfit: { armor: 'tunica', armorColor: '#1a0a14', trim: '#b8242c', cape: '#5a0a14', pauldrons: true }, gear: { main: 'wand', off: null, glow: '#e03a4a' }, anims: [...BASIC_FOE, 'cast', 'channel', 'summon'] },
  hombre_lobo: { head: 'wolf', bare: true, body: { build: 'robusto' }, outfit: { sleeves: 'none', bottom: 'pants', shoes: 'descalzo' }, colors: { bottom: '#3a2e2a' }, gear: { main: 'claws', off: null }, anims: ['idle', 'walk', 'run', 'claw', 'lunge', 'warcry', 'hit', 'die'] },
  minotauro: { head: 'minotaur', boss: true, body: { build: 'robusto' }, outfit: { armor: 'cuero', armorColor: '#4a2e1a', sleeves: 'none', pauldrons: true, belt: '#2a1a12', bottom: 'pants', shoes: 'descalzo' }, colors: { bottom: '#3a2a1a' }, gear: { main: 'hammer', off: null }, anims: [...BASIC_FOE, 'attack_heavy', 'charge', 'warcry'] },
  hombre_lagarto: { head: 'lizard', outfit: { armor: 'cuero', armorColor: '#3a5a3a', bottom: 'shorts', belt: '#2a3a2a', shoes: 'descalzo' }, colors: { bottom: '#2a3a2a' }, gear: { main: 'spear', off: 'shield_round', shield: '#3a6a5a' }, anims: [...BASIC_FOE, 'attack_thrust', 'dodge'] },
  demonio: { head: 'troll', skin: '#b02a2a', body: { build: 'robusto' }, outfit: { armor: 'tunica', armorColor: '#1a0a0a', trim: '#ff6a2a', cape: '#3a0a0a' }, gear: { main: 'scythe', off: null, glow: '#ff6a2a' }, lpc: { horns: 'curled' }, anims: [...BASIC_FOE, 'cast', 'nova', 'leap'] },
  rata: { head: 'rat', body: { age: 'adolescente', build: 'delgado' }, outfit: { armor: 'cuero', armorColor: '#5a4a3a', bottom: 'shorts', shoes: 'descalzo' }, colors: { bottom: '#4a3a2a' }, gear: { main: 'dagger', off: null }, anims: ['idle', 'walk', 'run', 'attack_thrust', 'dodge', 'hit', 'die'] },
  calabaza: { head: 'jack', outfit: { armor: 'tunica', armorColor: '#2a1a12', trim: '#ff9a1f', cape: '#140c08' }, gear: { main: 'scythe', off: null }, anims: [...BASIC_FOE, 'cast', 'summon'] },
  // la Catedral (mundo 2): un centinela de cobre viejo con verdín, yelmo cerrado, martillo y escudo. Pesado y lento.
  guardian_cobre: { head: 'troll', big: true, size: { height: 1.12, build: 1.25, shoulders: 1.2, arms: 1 }, skin: '#5f7a74', body: { build: 'robusto' }, outfit: { armor: 'placas', armorColor: '#a0623a', trim: '#4f8f80', pauldrons: true, belt: '#3a281c', bottom: 'pants', shoes: 'botas' }, colors: { bottom: '#3a3428', shoes: '#5a3a22' }, gear: { main: 'axe', off: 'shield_round', shield: '#8a5a32' }, lpc: { hat: 'greathelm', hatColor: '#a0623a' }, anims: [...BASIC_FOE, 'attack_heavy', 'warcry'] },
  trol: { head: 'troll', big: true, size: { height: 1.22, build: 1.35, shoulders: 1.2, arms: 1.05 }, skin: '#7a8a6a', bare: true, body: { build: 'robusto' }, outfit: { sleeves: 'none', bottom: 'shorts', belt: '#3a2a1a', shoes: 'descalzo' }, colors: { bottom: '#4a3a2a' }, gear: { main: 'club', off: null }, anims: [...BASIC_FOE, 'attack_heavy', 'warcry'] },
};

/** Tamaño de celda recomendado (los jefes grandes no caben en 48). */
export function enemyCell(id: EnemyId): 48 | 64 {
  return ENEMY_DEFS[id].boss || ENEMY_DEFS[id].big ? 64 : 48;
}

/** Animaciones pensadas para un enemigo. */
export function enemyAnims(id: EnemyId): string[] {
  return ENEMY_DEFS[id].anims;
}

/** Arma un enemigo completo: cabeza de monstruo, cuerpo, ropa o armadura y arma. */
export function enemyFicha(id: EnemyId): HumanFicha {
  const e = ENEMY_DEFS[id];
  let av: Avatar = withLpc(defaultAvatar(), 'lpcMonster', e.head);
  av = { ...av, lpc: { ...DEFAULT_LPC, ...av.lpc!, hair: null, brows: null, nose: null, beard: null, mustache: null, glasses: null, ...e.lpc } };
  if (e.skin) av = { ...av, skin: e.skin };
  const body: BodyType = { ...DEFAULT_BODY, ...e.body };
  av = { ...av, body };
  let f = fichaFromAvatar(id, av) as HumanFicha;
  f = { ...f, body: { ...f.body, proportions: { ...bodyProportions(f.body.proportions.preset, body), ...e.size } } };
  f = applyKit(f, e);
  if (e.bare) f = recolor(f, 'top', av.skin) as HumanFicha;
  return f;
}

/**
 * Pone una armadura de la evolución del botín: línea (cuero, malla, placas, túnica) y nivel 1 a 5.
 * Cambia el color, ribete, hombreras, cinturón, capa, gema, runas y (si helmet) el casco LPC del nivel.
 */
export function applyArmorTier(f: HumanFicha, line: ArmorLine, tier: ArmorTier, helmet = true, over: Partial<TierLook> = {}): HumanFicha {
  const t = { ...ARMOR_EVOLUTION[line][tier - 1], ...over };
  let out: HumanFicha = {
    ...f,
    outfit: { ...f.outfit, armor: line, armorTier: tier, armorColor: t.base, trim: t.trim, pauldrons: t.pauldrons, belt: t.belt, cape: t.cape, armorGem: t.gem, armorGlow: t.glow, shoes: f.outfit.shoes === 'descalzo' || f.outfit.shoes === 'tenis' ? 'botas' : f.outfit.shoes },
  };
  if (out.avatar?.lpc) {
    // el casco toma el color de la armadura (el celestial, el del ribete)
    // cascos de cuero altos y de vikingo van en hierro; el de la égida celestial, en blanco con oro
    const hatColor = !helmet || !t.helm ? null
      : t.helm === 'crown' ? t.trim ?? t.base
      : line === 'cuero' && tier >= 4 ? '#6e7480'
      : line === 'placas' && tier === 5 ? '#ece6d4'
      : t.base;
    out = { ...out, avatar: { ...out.avatar, kit: 'lpc', lpc: { ...out.avatar.lpc, hat: helmet ? t.helm : null, hatColor } } };
  }
  return out;
}

/** Se equipa un objeto del botín: armas y escudos van a la mano con sus colores; las piezas de armadura visten al héroe. */
export function equipLoot(f: HumanFicha, item: LootItem, helmet = true): HumanFicha {
  if (item.base.cat === 'armor') return applyArmorTier(f, item.base.line, item.base.tier, helmet, (item.design ?? {}) as Partial<TierLook>);
  const h = handKindOf(item);
  if (!h) return f;
  const gear = { ...(f.gear ?? {}) };
  if (h.main) {
    gear.main = h.main; gear.mainLoot = item.id;
    if (item.twoHanded) { gear.off = null; gear.offLoot = null; }
  }
  if (h.off) { gear.off = h.off; gear.offLoot = item.id; }
  const d = item.design as { glow?: string | null; gem?: string | null; face?: string } | undefined;
  if (d?.glow ?? d?.gem) gear.glow = (d.glow ?? d.gem)!;
  if (h.off && d?.face) gear.shield = d.face;
  return { ...f, gear };
}
