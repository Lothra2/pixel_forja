import { createRaster, type Raster } from '../core/raster';
import { makeRamp, OUTLINE, SHADOW, BASE, LIGHT, type Ramp } from '../color/ramp';
import { Part, stroke, blob, polygon } from '../render/part';
import { PROP_COLORS } from '../render/materials';
import { drawHeld } from '../render/props';
import type { PropKind } from '../rig/pose';

/**
 * Objetos y artefactos del RPG: íconos de inventario de 32 px dibujados con código.
 * Cada objeto se arma con formas simples, se sombrea con luz de arriba a la izquierda y lleva contorno.
 * Rarezas como en Diablo: normal (blanco), mágico (azul), raro (amarillo), de set (verde) y único (dorado).
 */

export type ItemKind =
  | 'potion_health' | 'potion_mana' | 'potion_rejuv' | 'potion_stamina' | 'potion_antidote'
  | 'ring' | 'amulet' | 'gem' | 'rune' | 'scroll' | 'tome' | 'key' | 'gold' | 'charm' | 'skull'
  | 'helm' | 'armor' | 'robe' | 'gloves' | 'boots' | 'belt'
  | 'w_sword' | 'w_dagger' | 'w_greatsword' | 'w_axe' | 'w_mace' | 'w_hammer' | 'w_spear' | 'w_staff' | 'w_wand' | 'w_bow' | 'w_claws' | 'w_scythe'
  | 's_shield' | 's_round' | 's_kite' | 's_tower' | 's_orb' | 's_tome';

export const ITEM_KINDS: ItemKind[] = [
  'potion_health', 'potion_mana', 'potion_rejuv', 'potion_stamina', 'potion_antidote',
  'ring', 'amulet', 'gem', 'rune', 'scroll', 'tome', 'key', 'gold', 'charm', 'skull',
  'helm', 'armor', 'robe', 'gloves', 'boots', 'belt',
  'w_sword', 'w_dagger', 'w_greatsword', 'w_axe', 'w_mace', 'w_hammer', 'w_spear', 'w_staff', 'w_wand', 'w_bow', 'w_claws', 'w_scythe',
  's_shield', 's_round', 's_kite', 's_tower', 's_orb', 's_tome',
];

export type Rarity = 'normal' | 'magic' | 'rare' | 'set' | 'unique';
export const RARITIES: Rarity[] = ['normal', 'magic', 'rare', 'set', 'unique'];
export const RARITY_COLORS: Record<Rarity, string> = { normal: '#e8e4dc', magic: '#6c8cff', rare: '#ffd84a', set: '#4ade80', unique: '#c79a3c' };

export type GemColor = 'ruby' | 'sapphire' | 'emerald' | 'topaz' | 'amethyst' | 'diamond';
export const GEM_COLORS: Record<GemColor, string> = { ruby: '#d0243c', sapphire: '#2f5fe0', emerald: '#1fae5a', topaz: '#f0b020', amethyst: '#9a3ad8', diamond: '#d8eef8' };

export interface ItemSpec {
  kind: ItemKind;
  rarity?: Rarity;
  /** pociones: chica, mediana, grande. Gemas: astillada, normal, perfecta */
  size?: 'small' | 'medium' | 'large';
  /** gema, piedra de anillo o amuleto */
  gem?: GemColor;
  /** casillero de inventario con borde del color de la rareza */
  frame?: boolean;
  seed?: number;
  /** tamaño del ícono: 32 (o 16, 48, 64) */
  px?: number;
}

const POTION: Record<string, string> = { potion_health: '#d0243c', potion_mana: '#2f5fe0', potion_rejuv: '#9a3ad8', potion_stamina: '#f0b020', potion_antidote: '#4caf50' };

function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Dibuja la forma del objeto en una pieza de 32x32 (materiales con nombre). */
function shape(part: Part, s: ItemSpec, rnd: () => number) {
  const k = s.kind;
  const size = s.size ?? 'medium';
  if (k.startsWith('potion_')) {
    // frasco: cuello de vidrio, corcho y cuerpo con líquido
    const big = size === 'large', small = size === 'small';
    const r = small ? 5 : big ? 7 : 6;
    const cy = big ? 20 : 21;
    if (big) polygon(part, [[10, 12], [22, 12], [23, 27], [9, 27]], 'glass');
    else blob(part, [16, cy], r * 2, 'glass');
    for (const [x, y] of [...part.entries()].map(([x, y]) => [x, y])) if (y >= cy - (big ? 3 : 1)) part.set(x, y, 'liquid');
    const top = big ? 12 : cy - r;
    for (let y = top - 4; y < top + 1; y++) for (let x = 14; x <= 17; x++) part.set(x, y, 'glass');
    for (let y = top - 6; y < top - 3; y++) for (let x = 14; x <= 17; x++) part.set(x, y, 'cork');
    part.set(big ? 11 : 16 - Math.round(r * 0.5), (big ? 15 : cy - Math.round(r * 0.4)), 'shine', LIGHT);
  } else if (k === 'ring') {
    for (let a = 0; a < Math.PI * 2; a += 0.08) { const x = 16 + Math.cos(a) * 7, y = 19 + Math.sin(a) * 5; blob(part, [x, y], 3, 'metal'); }
    for (let a = 0; a < Math.PI * 2; a += 0.1) part.px.delete(Part.key(Math.round(16 + Math.cos(a) * 4.5), Math.round(19 + Math.sin(a) * 2.5)));
    for (let y = 16; y <= 22; y++) for (let x = 12; x <= 20; x++) { const dx = (x - 16) / 4.6, dy = (y - 19) / 3; if (dx * dx + dy * dy < 1) part.px.delete(Part.key(x, y)); }
    blob(part, [16, 12], 6, 'gem');
    part.set(15, 11, 'shine', LIGHT);
  } else if (k === 'amulet') {
    stroke(part, [7, 4], [16, 18], 1, () => 'metal');
    stroke(part, [25, 4], [16, 18], 1, () => 'metal');
    polygon(part, [[16, 14], [22, 20], [16, 28], [10, 20]], 'metal');
    polygon(part, [[16, 16.5], [20, 20.5], [16, 25.5], [12, 20.5]], 'gem');
    part.set(15, 18, 'shine', LIGHT);
  } else if (k === 'gem') {
    const sc = size === 'small' ? 0.65 : size === 'large' ? 1.15 : 0.9;
    const pts: [number, number][] = [];
    const sides = s.gem === 'sapphire' ? 4 : s.gem === 'emerald' ? 8 : s.gem === 'topaz' ? 3 : s.gem === 'amethyst' ? 6 : s.gem === 'diamond' ? 5 : 7;
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 - Math.PI / 2 + (sides === 4 ? Math.PI / 4 : 0);
      const rr = 9 * sc * (size === 'small' ? 0.8 + rnd() * 0.3 : 1);
      pts.push([16 + Math.cos(a) * rr, 16 + Math.sin(a) * rr * (s.gem === 'emerald' ? 0.8 : 1)]);
    }
    polygon(part, pts, 'gem');
    // facetas: la mesa de arriba más clara
    polygon(part, pts.map(([x, y]) => [16 + (x - 16) * 0.5, 16 + (y - 16) * 0.5 - 1.5]), 'gem', LIGHT);
    part.set(13, 12, 'shine', LIGHT);
    if (size === 'large') { part.set(23, 8, 'shine', LIGHT); part.set(24, 7, 'shine', LIGHT); part.set(22, 7, 'shine', LIGHT); }
  } else if (k === 'rune') {
    polygon(part, [[9, 6], [23, 6], [25, 9], [25, 25], [22, 27], [10, 27], [7, 24], [7, 9]], 'stone');
    // glifo tallado (cambia con la semilla)
    let x = 12 + Math.round(rnd() * 3), y = 10;
    for (let i = 0; i < 4; i++) { const nx = 11 + Math.round(rnd() * 10), ny = Math.min(23, y + 3 + Math.round(rnd() * 4)); stroke(part, [x, y], [nx, ny], 2, () => 'glyph', SHADOW); x = nx; y = ny; }
  } else if (k === 'scroll') {
    polygon(part, [[8, 9], [24, 9], [24, 23], [8, 23]], 'parch');
    for (const yy of [8, 24]) stroke(part, [6, yy], [26, yy], 3, () => 'parch', SHADOW);
    for (let yy = 12; yy <= 20; yy += 3) stroke(part, [11, yy], [21, yy], 1, () => 'ink', SHADOW);
    blob(part, [16, 24], 5, 'seal');
  } else if (k === 'tome' || k === 's_tome') {
    polygon(part, [[8, 6], [24, 6], [24, 27], [8, 27]], 'cover');
    stroke(part, [9, 6], [9, 27], 2, () => 'cover', SHADOW);
    stroke(part, [24, 8], [24, 26], 1, () => 'parch');
    polygon(part, [[16, 11], [20, 16], [16, 22], [12, 16]], 'metal');
    blob(part, [16, 16], 3, 'gem');
  } else if (k === 'key') {
    for (let a = 0; a < Math.PI * 2; a += 0.1) blob(part, [11 + Math.cos(a) * 4, 11 + Math.sin(a) * 4], 2, 'metal');
    stroke(part, [14, 14], [25, 25], 2, () => 'metal');
    stroke(part, [22, 24], [20, 26], 2, () => 'metal');
    stroke(part, [25, 21], [27, 19], 2, () => 'metal');
  } else if (k === 'gold') {
    const coins: [number, number][] = [[10, 22], [16, 23], [22, 22], [13, 18], [19, 18], [16, 14], [8, 25], [24, 25], [12, 26], [20, 26]];
    for (const [x, y] of coins) { blob(part, [x, y], 6, 'metal'); part.set(x - 1, y - 1, 'shine', LIGHT); }
  } else if (k === 'charm') {
    polygon(part, [[12, 8], [20, 8], [23, 14], [20, 25], [12, 25], [9, 14]], 'charm');
    stroke(part, [16, 11], [16, 21], 1, () => 'glyph', SHADOW);
    stroke(part, [13, 15], [19, 15], 1, () => 'glyph', SHADOW);
  } else if (k === 'skull') {
    blob(part, [16, 14], 14, 'bone');
    polygon(part, [[11, 18], [21, 18], [20, 25], [12, 25]], 'bone');
    blob(part, [12.5, 15], 4, 'void'); blob(part, [19.5, 15], 4, 'void');
    part.set(16, 19, 'void'); part.set(16, 20, 'void');
    for (let x = 13; x <= 19; x += 2) part.set(x, 23, 'void');
  } else if (k === 'helm') {
    blob(part, [16, 15], 18, 'metal');
    for (let y = 18; y <= 26; y++) for (let x = 7; x <= 25; x++) if (part.has(x, y) || (y <= 25 && x >= 8 && x <= 24)) part.set(x, y, 'metal');
    for (let y = 14; y <= 17; y++) for (let x = 10; x <= 22; x++) part.set(x, y, 'void');
    stroke(part, [16, 14], [16, 24], 2, () => 'metal');
    stroke(part, [16, 6], [16, 12], 2, () => 'trim', LIGHT);
  } else if (k === 'armor' || k === 'robe') {
    const robe = k === 'robe';
    polygon(part, [[6, 8], [12, 6], [20, 6], [26, 8], [27, 15], [23, 15], [23, robe ? 29 : 26], [9, robe ? 29 : 26], [9, 15], [5, 15]], robe ? 'cloth' : 'metal');
    polygon(part, [[13, 6], [16, 10], [19, 6]], 'void');
    stroke(part, [16, 10], [16, robe ? 28 : 25], 1, () => 'trim');
    if (!robe) for (const yy of [14, 19]) stroke(part, [10, yy], [22, yy], 1, () => 'metal', SHADOW);
  } else if (k === 'gloves') {
    polygon(part, [[9, 12], [19, 10], [21, 22], [11, 26], [8, 20]], 'leather');
    for (let i = 0; i < 4; i++) stroke(part, [11 + i * 2.6, 11 - i * 0.6], [12 + i * 2.8, 5 + i * 0.3], 2, () => 'leather');
    stroke(part, [19, 16], [24, 12], 2, () => 'leather');
    stroke(part, [10, 23], [21, 21], 2, () => 'trim');
  } else if (k === 'boots') {
    polygon(part, [[9, 5], [17, 5], [17, 19], [26, 22], [26, 27], [8, 27]], 'leather');
    stroke(part, [9, 8], [17, 8], 1, () => 'trim');
    stroke(part, [8, 26], [26, 26], 2, () => 'leather', SHADOW);
  } else if (k === 'belt') {
    stroke(part, [3, 16], [29, 16], 5, () => 'leather');
    polygon(part, [[12, 12], [20, 12], [20, 20], [12, 20]], 'metal');
    polygon(part, [[14, 14], [18, 14], [18, 18], [14, 18]], 'void');
    stroke(part, [16, 15], [21, 15], 1, () => 'metal', LIGHT);
  } else if (k.startsWith('w_') || k.startsWith('s_')) {
    // armas y escudos: el mismo dibujo que en la mano, en diagonal y más grande
    const kind = ({ s_shield: 'shield', s_round: 'shield_round', s_kite: 'shield_kite', s_tower: 'shield_tower', s_orb: 'orb' } as Record<string, PropKind>)[k] ?? (k.slice(2) as PropKind);
    const shieldLike = k.startsWith('s_');
    const long = ['w_spear', 'w_staff', 'w_scythe', 'w_greatsword'].includes(k);
    const u = shieldLike ? 2.2 : long ? 1.05 : k === 'w_dagger' || k === 'w_wand' || k === 'w_claws' ? 2.2 : 1.5;
    const at: [number, number] = shieldLike ? [16, 16] : k === 'w_bow' ? [16, 16] : long ? [9, 23] : [8, 24];
    drawHeld(part, kind, at, k === 'w_bow' ? -45 : -45, u, false);
  }
}

/** Colores de cada material del ícono (algunos dependen del objeto y la rareza). */
function ramps(s: ItemSpec): Record<string, Ramp> {
  const gem = GEM_COLORS[s.gem ?? (s.kind === 'ring' || s.kind === 'amulet' ? (['ruby', 'sapphire', 'emerald', 'topaz', 'amethyst', 'diamond'] as GemColor[])[(s.seed ?? 0) % 6] : 'ruby')];
  const metal = s.rarity === 'unique' || s.rarity === 'set' || s.kind === 'gold' || s.kind === 'ring' || s.kind === 'amulet' ? '#e2b23c' : '#b4bfcc';
  const glow = s.rarity && s.rarity !== 'normal' ? RARITY_COLORS[s.rarity] : '#8a7a6a';
  const out: Record<string, Ramp> = {
    glass: makeRamp('#bfe8ff'), liquid: makeRamp(POTION[s.kind] ?? '#d0243c'), cork: makeRamp('#8a5a2b'), shine: makeRamp('#ffffff'),
    metal: makeRamp(metal), gem: makeRamp(gem), stone: makeRamp('#8c8478'), glyph: makeRamp(s.rarity && s.rarity !== 'normal' ? glow : '#4a443c'),
    parch: makeRamp('#e8d6a8'), ink: makeRamp('#5a4630'), seal: makeRamp('#b8242c'), cover: makeRamp(s.rarity === 'unique' ? '#7a3a14' : '#5a2a6a'),
    bone: makeRamp('#e6dcc2'), void: makeRamp('#1c1620'), trim: makeRamp('#e2b23c'), cloth: makeRamp('#4b3a8c'), leather: makeRamp('#7a4a2a'),
    charm: makeRamp(s.rarity === 'unique' ? '#c79a3c' : '#6a8a5a'),
  };
  for (const [kk, hex] of Object.entries(PROP_COLORS)) out[`p_${kk}`] = makeRamp(hex);
  out.p_glow = makeRamp(gem);
  return out;
}

const hex = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** Dibuja el ícono de un objeto (32 px por defecto). */
export function renderItem(s: ItemSpec): Raster {
  const part = new Part();
  shape(part, s, rng((s.seed ?? 1) * 7919 + ITEM_KINDS.indexOf(s.kind)));
  const R = ramps(s);
  const S = 32;
  // luz de arriba a la izquierda: borde de arriba claro, de abajo a la derecha oscuro
  const shade = (x: number, y: number, slot: number) => {
    if (slot !== BASE) return slot;
    if (!part.has(x, y - 1) || !part.has(x - 1, y)) return LIGHT;
    if (!part.has(x, y + 1) || !part.has(x + 1, y)) return SHADOW;
    return BASE;
  };
  const r = createRaster(S, S);
  if (s.frame) {
    // casillero: fondo oscuro y borde del color de la rareza
    const border = hex(RARITY_COLORS[s.rarity ?? 'normal']);
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const edge = x === 0 || y === 0 || x === S - 1 || y === S - 1;
        const corner = (x === 0 || x === S - 1) && (y === 0 || y === S - 1);
        if (corner) continue;
        const glowIn = s.rarity && s.rarity !== 'normal' ? Math.max(0, 1 - Math.hypot(x - 15.5, y - 15.5) / 16) * 0.35 : 0;
        const bg: [number, number, number] = [24 + border[0] * glowIn * 0.3, 20 + border[1] * glowIn * 0.3, 30 + border[2] * glowIn * 0.3];
        r.data.set([...(edge ? border.map((v) => v * 0.8) : bg), 255] as number[], (y * S + x) * 4);
      }
  }
  // contorno
  for (const [x, y, p] of part.entries()) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const X = x + dx, Y = y + dy;
      if (part.has(X, Y) || X < 0 || Y < 0 || X >= S || Y >= S) continue;
      r.data.set([...hex(R[p.mat][OUTLINE]), 255], (Y * S + X) * 4);
    }
  }
  for (const [x, y, p] of part.entries()) {
    if (x < 0 || y < 0 || x >= S || y >= S) continue;
    r.data.set([...hex(R[p.mat][Math.max(0, Math.min(3, shade(x, y, p.slot)))]), 255], (y * S + x) * 4);
  }
  // brillo de rareza: unos pixeles de destello en una esquina
  if (s.rarity === 'rare' || s.rarity === 'unique' || s.rarity === 'set') {
    const c = hex(RARITY_COLORS[s.rarity]);
    for (const [x, y] of [[26, 5], [27, 4], [25, 4], [26, 3], [26, 6]]) r.data.set([...c, 255], (y * S + x) * 4);
  }
  const px = s.px ?? 32;
  if (px === S) return r;
  // tamaños 16/48/64: vecino más cercano
  const out = createRaster(px, px);
  for (let y = 0; y < px; y++) for (let x = 0; x < px; x++) {
    const si = (Math.floor((y * S) / px) * S + Math.floor((x * S) / px)) * 4;
    out.data.set(r.data.subarray(si, si + 4), (y * px + x) * 4);
  }
  return out;
}

/** Nombre del objeto para el atlas (ej. potion_health_large, gem_ruby_perfect, w_axe_unique). */
export function itemName(s: ItemSpec): string {
  const parts: string[] = [s.kind];
  if (s.kind.startsWith('potion_') && s.size) parts.push(s.size);
  if (s.kind === 'gem') parts.splice(0, 1, `gem_${s.gem ?? 'ruby'}`), parts.push(s.size === 'small' ? 'chipped' : s.size === 'large' ? 'perfect' : 'normal');
  if (s.rarity && s.rarity !== 'normal') parts.push(s.rarity);
  return parts.join('_');
}
