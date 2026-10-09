import { createRaster, type Raster } from '../core/raster';
import { IconCanvas, over, type P } from './canvas';
import { drawWeaponIcon, type WeaponIcon, type WeaponDesign } from './weapons';
import { drawArmorIcon, type TierLook } from './armor';
import { drawOffhandIcon, drawJewelIcon, drawPotionIcon, drawConsumableIcon, drawGemIcon, drawRuneIcon, type OffhandIcon, type OffhandDesign, type JewelDesign } from './misc';
import { RARITY_COLORS, type Rarity } from './materials';
import type { LootItem, LootBase } from './catalog';
import type { WeaponKind, OffhandKind } from '../rig/pose';
import { makeRamp, type Ramp } from '../color/ramp';

/**
 * Pinta cualquier objeto del botín: a 32 o 64 px nativos, con halo de rareza y, para legendarios, únicos
 * y de set, una animación de 8 cuadros (barrido de brillo, destellos y halo que respira).
 */

export interface LootRenderOpts {
  px?: 32 | 48 | 64;
  /** cuadro de la animación (0..frames-1) */
  frame?: number;
  frames?: number;
  /** casillero de inventario de fondo con borde de rareza */
  slot?: boolean;
  /** sin halo (por ejemplo para el objeto en el piso, que lleva su propio haz) */
  noAura?: boolean;
}

export function drawBase(c: IconCanvas, base: LootBase, design?: LootItem['design']) {
  switch (base.cat) {
    case 'weapon': return drawWeaponIcon(c, base.icon, design as WeaponDesign);
    case 'offhand': return drawOffhandIcon(c, base.icon, design as OffhandDesign);
    case 'armor': return drawArmorIcon(c, base.slot, base.line, base.tier, design as Partial<TierLook>);
    case 'jewel': return drawJewelIcon(c, base.icon, design as JewelDesign);
    case 'potion': return drawPotionIcon(c, base.kind, base.size);
    case 'consumable': return drawConsumableIcon(c, base.icon);
    case 'gem': return drawGemIcon(c, base.kind, base.grade);
    case 'rune': return drawRuneIcon(c, base.index, null);
  }
}

/** ¿la rareza lleva halo y animación? */
export function isSpecial(r: Rarity) { return r === 'legendary' || r === 'unique' || r === 'set'; }

function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const hash = (s: string) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };

/** Casillero de inventario: fondo oscuro con el borde de la rareza y un poco de luz adentro. */
export function slotFrame(px: number, rarity: Rarity): Raster {
  const r = createRaster(px, px);
  const col = RARITY_COLORS[rarity];
  const c = [parseInt(col.slice(1, 3), 16), parseInt(col.slice(3, 5), 16), parseInt(col.slice(5, 7), 16)];
  const glow = rarity === 'normal' ? 0 : rarity === 'magic' ? 0.18 : 0.3;
  for (let y = 0; y < px; y++) for (let x = 0; x < px; x++) {
    const e = Math.min(x, y, px - 1 - x, px - 1 - y);
    if (e === 0 && (x === 0 || x === px - 1) && (y === 0 || y === px - 1)) continue;
    const g = Math.max(0, 1 - Math.hypot(x - (px - 1) / 2, y - (px - 1) / 2) / (px * 0.55)) * glow;
    const i = (y * px + x) * 4;
    if (e === 0) { r.data[i] = c[0] * 0.75; r.data[i + 1] = c[1] * 0.75; r.data[i + 2] = c[2] * 0.75; }
    else if (e === 1) { r.data[i] = 14 + c[0] * 0.12; r.data[i + 1] = 12 + c[1] * 0.12; r.data[i + 2] = 20 + c[2] * 0.12; }
    else { r.data[i] = 22 + c[0] * g; r.data[i + 1] = 19 + c[1] * g; r.data[i + 2] = 30 + c[2] * g; }
    r.data[i + 3] = 255;
  }
  return r;
}

/** Ícono de un objeto. */
export function renderLoot(item: LootItem, o: LootRenderOpts = {}): Raster {
  const px = o.px ?? 32;
  const c = new IconCanvas(px);
  drawBase(c, item.base, item.design);
  const special = isSpecial(item.rarity);
  const frames = o.frames ?? 8;
  const f = o.frame ?? 0;
  const aura = o.noAura ? null : special ? RARITY_COLORS[item.rarity] : item.rarity === 'rare' ? '#ffd84a' : null;
  let sparkles: P[] = [];
  let sweep: number | null = null;
  let auraK = item.rarity === 'rare' ? 0.55 : 1;
  if (special && o.frame !== undefined) {
    // el barrido cruza en los primeros cuadros; los destellos aparecen y se apagan; el halo respira
    sweep = -0.2 + (f / frames) * 1.6;
    auraK = 0.7 + 0.3 * Math.sin((f / frames) * Math.PI * 2);
    const r = rng(hash(item.id));
    const b = c.bbox();
    if (b) {
      const pts: P[] = [];
      for (let i = 0; i < 3; i++) pts.push([(b.x0 + r() * (b.x1 - b.x0)) / c.k, (b.y0 + r() * (b.y1 - b.y0)) / c.k]);
      sparkles = pts.filter((_, i) => (f + i * 3) % frames < 2);
    }
  }
  const icon = c.render({ aura, auraK, sweep, sparkles });
  if (!o.slot) return icon;
  const bg = slotFrame(px, item.rarity);
  over(bg, icon);
  return bg;
}

/** Animación del ícono (8 cuadros). Los objetos comunes devuelven un solo cuadro. */
export function lootFrames(item: LootItem, px: 32 | 48 | 64 = 32, slot = false): Raster[] {
  if (!isSpecial(item.rarity)) return [renderLoot(item, { px, slot })];
  return Array.from({ length: 8 }, (_, i) => renderLoot(item, { px, slot, frame: i, frames: 8 }));
}

// ---------- el arma legendaria en la mano del personaje ----------

const HAND: Record<WeaponIcon, WeaponKind> = {
  sword: 'sword', scimitar: 'sword', katana: 'sword', rapier: 'sword', dagger: 'dagger', kris: 'dagger', axe: 'axe', hatchet: 'axe', mace: 'mace',
  morning_star: 'mace', flail: 'mace', warhammer: 'hammer', scepter: 'mace', club: 'club', wand: 'wand', claw: 'claws', javelin: 'spear',
  greatsword: 'greatsword', greataxe: 'axe', maul: 'hammer', staff: 'staff', spear: 'spear', halberd: 'spear', scythe: 'scythe', bow: 'bow', longbow: 'bow', crossbow: 'bow',
};
const HAND_OFF: Partial<Record<OffhandIcon, OffhandKind>> = {
  shield_heater: 'shield', shield_round: 'shield_round', shield_kite: 'shield_kite', shield_tower: 'shield_tower', buckler: 'shield_round', orb: 'orb', tome: 'tome', shrunken_head: 'orb',
};

/** Qué dibujo de mano usa un objeto (o null si no se sostiene). */
export function handKindOf(item: LootItem): { main?: WeaponKind; off?: OffhandKind } | null {
  if (item.base.cat === 'weapon') return { main: HAND[item.base.icon] };
  if (item.base.cat === 'offhand') { const k = HAND_OFF[item.base.icon]; return k ? { off: k } : null; }
  return null;
}

/** Colores del arma en la mano según el diseño del objeto (pisan los de siempre). */
export function handMaterials(item: LootItem): Record<string, Ramp> {
  const d = (item.design ?? {}) as WeaponDesign & OffhandDesign;
  const out: Record<string, Ramp> = {};
  if (d.blade) { out.p_steel = makeRamp(d.blade.hex); out.p_metal = makeRamp(d.blade.hex); out.p_iron = makeRamp(d.blade.hex); if (d.blade.kind === 'bone' || d.blade.kind === 'crystal') out.p_bone = makeRamp(d.blade.hex); }
  if (d.guard) out.p_gold = makeRamp(d.guard.hex);
  if (d.haft) out.p_wood = makeRamp(d.haft.hex);
  if (d.grip) { out.p_leather = makeRamp(d.grip.hex); out.p_brown = makeRamp(d.grip.hex); }
  if (d.glow ?? d.gem) out.p_glow = makeRamp((d.glow ?? d.gem)!);
  if (d.face) out.p_shieldc = makeRamp(d.face);
  return out;
}
