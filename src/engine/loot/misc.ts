import { IconCanvas, type MatDef, type P } from './canvas';
import { MAT, gemMat, glowMat, GEM_COLORS, type GemColor } from './materials';
import { PET_ARMOR } from '../render/pet3d';

/**
 * Mano libre (escudos, orbes, tomos, cabezas reducidas, carcaj), joyas, consumibles, gemas por grado y runas.
 */

export type OffhandIcon = 'shield_heater' | 'shield_round' | 'shield_kite' | 'shield_tower' | 'buckler' | 'orb' | 'tome' | 'shrunken_head' | 'quiver';
export const OFFHAND_ICONS: OffhandIcon[] = ['shield_heater', 'shield_round', 'shield_kite', 'shield_tower', 'buckler', 'orb', 'tome', 'shrunken_head', 'quiver'];

export type Emblem = 'none' | 'cross' | 'sun' | 'chevron' | 'skull' | 'star' | 'tree' | 'moon' | 'eye' | 'paw' | 'dragon';

export interface OffhandDesign {
  /** pintura del escudo o tapa del tomo */
  face?: string;
  rim?: MatDef;
  boss?: MatDef;
  emblem?: Emblem;
  emblemMat?: MatDef;
  gem?: string | null;
  glow?: string | null;
}

export type JewelIcon = 'ring' | 'ring_band' | 'amulet' | 'amulet_pendant' | 'charm_small' | 'charm_large' | 'charm_grand' | 'jewel';
export const JEWEL_ICONS: JewelIcon[] = ['ring', 'ring_band', 'amulet', 'amulet_pendant', 'charm_small', 'charm_large', 'charm_grand', 'jewel'];

export interface JewelDesign { metal?: MatDef; gem?: string; glow?: string | null; seed?: number }

export type PotionKind = 'health' | 'mana' | 'rejuv' | 'stamina' | 'antidote' | 'thawing';
export const POTION_KINDS: PotionKind[] = ['health', 'mana', 'rejuv', 'stamina', 'antidote', 'thawing'];
export const POTION_COLORS: Record<PotionKind, string> = { health: '#d8243e', mana: '#2f62e6', rejuv: '#9a3ad8', stamina: '#f2b21e', antidote: '#3fbf5a', thawing: '#ff8a3a' };
export type PotionSize = 'minor' | 'light' | 'normal' | 'greater' | 'super';
export const POTION_SIZES: PotionSize[] = ['minor', 'light', 'normal', 'greater', 'super'];

export type ConsumableIcon = 'scroll_portal' | 'scroll_identify' | 'tome_portal' | 'key' | 'key_boss' | 'gold' | 'ore' | 'essence' | 'skull_trophy' | 'map';
export const CONSUMABLE_ICONS: ConsumableIcon[] = ['scroll_portal', 'scroll_identify', 'tome_portal', 'key', 'key_boss', 'gold', 'ore', 'essence', 'skull_trophy', 'map'];

export type GemGrade = 'chipped' | 'flawed' | 'normal' | 'flawless' | 'perfect';
export const GEM_GRADES: GemGrade[] = ['chipped', 'flawed', 'normal', 'flawless', 'perfect'];
export const GEM_KINDS: GemColor[] = ['ruby', 'sapphire', 'emerald', 'topaz', 'amethyst', 'diamond', 'skull'];

/** runas: 12 glifos tallados en piedra */
export const RUNE_COUNT = 12;

// ---------- emblemas ----------

function emblem(c: IconCanvas, e: Emblem, C: P, r: number, m: MatDef) {
  if (e === 'none') return;
  const [x, y] = C;
  if (e === 'cross') { c.poly([[x - r * 0.22, y - r], [x + r * 0.22, y - r], [x + r * 0.22, y + r], [x - r * 0.22, y + r]], m); c.poly([[x - r * 0.75, y - r * 0.45], [x + r * 0.75, y - r * 0.45], [x + r * 0.75, y - r * 0.05], [x - r * 0.75, y - r * 0.05]], m); }
  if (e === 'sun') { c.circle(C, r * 0.42, m); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; c.poly([[x + Math.cos(a - 0.2) * r * 0.5, y + Math.sin(a - 0.2) * r * 0.5], [x + Math.cos(a) * r, y + Math.sin(a) * r], [x + Math.cos(a + 0.2) * r * 0.5, y + Math.sin(a + 0.2) * r * 0.5]], m); } }
  if (e === 'chevron') { c.poly([[x - r, y - r * 0.2], [x, y + r * 0.6], [x + r, y - r * 0.2], [x + r, y + r * 0.3], [x, y + r * 1.1], [x - r, y + r * 0.3]], m); }
  if (e === 'skull') { c.circle([x, y - r * 0.15], r * 0.62, MAT.bone); c.poly([[x - r * 0.35, y + r * 0.2], [x + r * 0.35, y + r * 0.2], [x + r * 0.3, y + r * 0.75], [x - r * 0.3, y + r * 0.75]], MAT.bone); c.circle([x - r * 0.25, y - r * 0.1], r * 0.17, MAT.obsidian, { tone: 0 }); c.circle([x + r * 0.25, y - r * 0.1], r * 0.17, MAT.obsidian, { tone: 0 }); }
  if (e === 'star') { const pts: P[] = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI * 2, rr = i % 2 ? r * 0.42 : r; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } c.poly(pts, m); }
  if (e === 'tree') { c.poly([[x - r * 0.15, y], [x + r * 0.15, y], [x + r * 0.2, y + r], [x - r * 0.2, y + r]], MAT.darkwood); c.circle([x, y - r * 0.3], r * 0.65, m); c.circle([x - r * 0.45, y - r * 0.05], r * 0.4, m); c.circle([x + r * 0.45, y - r * 0.05], r * 0.4, m); }
  if (e === 'moon') { c.circle(C, r * 0.8, m); c.eraseCircle([x + r * 0.35, y - r * 0.2], r * 0.62); }
  if (e === 'eye') { c.ellipse(C, r, r * 0.5, m); c.circle(C, r * 0.32, gemMat('#d8243e')); }
  if (e === 'paw') { c.ellipse([x, y + r * 0.3], r * 0.5, r * 0.4, m); for (const [dx, dy] of [[-0.55, -0.25], [-0.2, -0.65], [0.2, -0.65], [0.55, -0.25]]) c.circle([x + dx * r, y + dy * r], r * 0.2, m); }
  if (e === 'dragon') { c.poly([[x - r, y + r * 0.6], [x - r * 0.2, y - r * 0.2], [x + r * 0.2, y - r], [x + r * 0.5, y - r * 0.3], [x + r, y - r * 0.1], [x + r * 0.3, y + r * 0.2], [x, y + r], [x - r * 0.3, y + r * 0.3]], m); }
}

// ---------- mano libre ----------

export function drawOffhandIcon(c: IconCanvas, kind: OffhandIcon, d: OffhandDesign = {}) {
  const face = { hex: d.face ?? '#2f5fb8', kind: 'cloth' as const };
  const rim = d.rim ?? MAT.iron;
  const em = d.emblemMat ?? MAT.gold;
  if (kind === 'shield_heater' || kind === 'shield_kite') {
    const kite = kind === 'shield_kite';
    const outer: P[] = kite ? [[6, 3], [26, 3], [26.6, 12], [16, 30.4], [5.4, 12]] : [[5, 3.4], [27, 3.4], [27, 15], [24, 23], [16, 29.6], [8, 23], [5, 15]];
    c.poly(outer, rim);
    const inner = outer.map(([x, y]) => [16 + (x - 16) * 0.8, 15 + (y - 15) * 0.82] as P);
    c.poly(inner, face);
    emblem(c, d.emblem ?? 'cross', [16, 13.6], 6.4, em);
    for (const p of [[7.4, 5.4], [24.6, 5.4], [16, kite ? 27.6 : 27]] as P[]) c.dot(p, rim, { tone: 4 });
  } else if (kind === 'shield_round' || kind === 'buckler') {
    const R = kind === 'buckler' ? 9.6 : 13.4;
    c.circle([16, 16], R, rim);
    c.circle([16, 16], R - 2, kind === 'buckler' ? rim : { hex: d.face ?? '#7a4a2a', kind: d.face ? 'cloth' : 'wood' });
    if (kind === 'shield_round') {
      if (!d.face) for (let i = -2; i <= 2; i++) c.px1([16 + i * 4.4, 4.4], [16 + i * 4.4, 27.6], MAT.wood, { tone: 2 }, true);
      emblem(c, d.emblem ?? 'none', [16, 16], 8.4, em);
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; c.dot([16 + Math.cos(a) * (R - 1), 16 + Math.sin(a) * (R - 1)], MAT.steel, { tone: 4 }); }
    }
    c.circle([16, 16], kind === 'buckler' ? 3.6 : 3.4, d.boss ?? MAT.steel);
    if (kind === 'buckler') c.ring([16, 16], 7, 7, 1, rim, { bias: -1 });
  } else if (kind === 'shield_tower') {
    c.poly([[6, 2.6], [26, 2.6], [27, 4.4], [27, 28], [25.6, 30], [6.4, 30], [5, 28], [5, 4.4]], rim);
    c.poly([[8, 5], [24, 5], [24.6, 27.4], [7.4, 27.4]], face);
    emblem(c, d.emblem ?? 'chevron', [16, 14], 6, em);
    for (const y of [9.4, 21.4]) c.poly([[7, y], [25, y], [25, y + 1.6], [7, y + 1.6]], rim);
  } else if (kind === 'orb') {
    // orbe sobre una garra de metal
    const gc = d.gem ?? '#7fd8ff';
    for (const s of [-1, 1]) c.poly([[16, 27], [16 + s * 3, 22], [16 + s * 8.6, 13], [16 + s * 7, 21], [16 + s * 2, 28.4]], rim);
    c.poly([[13, 26.6], [19, 26.6], [18, 30.4], [14, 30.4]], rim);
    c.circle([16, 14.4], 9.6, { hex: gc, kind: 'glass' });
    c.circle([16, 14.4], 5, glowMat(d.glow ?? gc));
    c.ellipse([12.6, 10.2], 2.2, 1.2, { hex: '#ffffff', kind: 'glass' }, { tone: 5 }, -35);
  } else if (kind === 'tome') {
    c.poly([[6, 4], [25, 4], [26.4, 6], [26.4, 28], [6, 28]], { hex: d.face ?? '#5a2a6a', kind: 'leather' });
    c.poly([[25, 5], [27.4, 6.4], [27.4, 27], [25, 28]], MAT.parch, { tone: 4 });
    c.poly([[6, 4], [8.6, 4], [8.6, 28], [6, 28]], { hex: d.face ?? '#5a2a6a', kind: 'leather' }, { bias: -1 });
    for (const [x, y] of [[9, 4.4], [24.4, 4.4], [9, 26.4], [24.4, 26.4]] as P[]) c.poly([[x - 1.2, y - 0.8], [x + 1.6, y - 0.8], [x + 1.6, y + 2], [x - 1.2, y + 2]], rim);
    emblem(c, d.emblem ?? 'eye', [17, 16], 6, em);
    if (d.gem) c.circle([17, 16], 1.6, gemMat(d.gem));
    if (d.glow) for (const [x, y] of [[11, 9], [22, 23], [12, 23]] as P[]) c.dot([x, y], glowMat(d.glow), { tone: 5 }, true);
  } else if (kind === 'shrunken_head') {
    c.line([16, 3.0], [16, 7.64], 0.8, MAT.string);
    c.poly([[9, 9.36], [16, 6.44], [23, 9.36], [24, 17.1], [20.6, 23.98], [11.4, 23.98], [8, 17.1]], MAT.flesh);
    for (const s of [-1, 2.48]) c.poly([[16 + s * 7.4, 11.08], [16 + s * 10.6, 7.64], [16 + s * 9, 13.66]], MAT.flesh);
    c.poly([[9.6, 6.78], [16, 4.55], [22.4, 6.78], [20.6, 9.02], [11.4, 9.02]], MAT.darkleather);
    for (const s of [-1, 2.48]) { c.ellipse([16 + s * 3.2, 14.52], 1.6, 1.1, MAT.obsidian, { tone: 0 }); c.px1([16 + s * 4.6, 12.98], [16 + s * 1.8, 16.07], MAT.string, { tone: 3 }); }
    c.poly([[13, 19.68], [19, 19.68], [18.4, 21.4], [13.6, 21.4]], MAT.obsidian, { tone: 0 });
    for (let x = 13.8; x < 18.6; x += 1.4) c.px1([x, 20.4], [x, 23.6], MAT.string, { tone: 4 });
    if (d.glow) for (const s of [-1, 2.48]) c.dot([16 + s * 3.2, 14.52], glowMat(d.glow), { tone: 5 }, true);
    for (let i = 0; i < 4; i++) c.line([10 + i * 3.6, 26], [9.4 + i * 3.8, 30.6], 0.9, MAT.darkleather);
  } else if (kind === 'quiver') {
    c.poly([[9.4, 11], [20, 7.4], [24, 25], [14, 28.6]], { hex: d.face ?? '#7a4a2a', kind: 'leather' });
    c.px1([10.4, 13], [21, 9], rim, { tone: 4 });
    c.px1([13, 26], [23.6, 22], rim, { tone: 4 });
    for (let i = 0; i < 4; i++) {
      const bx = 10.6 + i * 2.6, by = 11.4 - i * 0.8;
      c.line([bx, by], [bx - 2.4, by - 6.4], 0.7, MAT.palewood);
      c.poly([[bx - 2.6, by - 6.2], [bx - 4, by - 9.4], [bx - 1.4, by - 7.6]], { hex: d.glow ?? '#e8e2d2', kind: d.glow ? 'glow' : 'cloth' });
    }
    if (d.gem) c.circle([17, 18], 1.4, gemMat(d.gem));
  }
  if (d.gem && (kind.startsWith('shield') || kind === 'buckler')) c.circle([16, kind === 'shield_round' || kind === 'buckler' ? 16 : 13.6], 1.5, gemMat(d.gem));
  if (d.glow && kind.startsWith('shield')) c.ring([16, 15.6], 10.6, 11.6, 0.55, glowMat(d.glow), { tone: 4 }, 0, 360);
  c.center();
}

// ---------- joyas ----------

export function drawJewelIcon(c: IconCanvas, kind: JewelIcon, d: JewelDesign = {}) {
  const metal = d.metal ?? MAT.gold;
  const gem = gemMat(d.gem ?? GEM_COLORS.ruby);
  if (kind === 'ring' || kind === 'ring_band') {
    c.ring([16, 19], 9, 6.6, kind === 'ring_band' ? 3 : 2.2, metal, {}, 0, 360);
    c.px1([9, 16.6], [13, 13.4], metal, { tone: 5 }, true);
    if (kind === 'ring') {
      c.poly([[12, 13.4], [20, 13.4], [21, 10], [11, 10]], metal);
      c.poly([[12.4, 10.4], [16, 3.4], [19.6, 10.4], [16, 13]], gem);
      c.px1([14.4, 8], [16, 5], gem, { tone: 5 }, true);
    } else for (let i = 0; i < 3; i++) c.circle([11.6 + i * 4.4, 13.4 + (i === 1 ? -0.6 : 0)], 1.2, gem);
    if (d.glow) c.ring([16, 19], 8, 5.6, 0.6, glowMat(d.glow), { tone: 4 }, 180, 360);
  } else if (kind === 'amulet' || kind === 'amulet_pendant') {
    // cadena en V y colgante
    for (let i = 0; i < 9; i++) { const t = i / 8; c.ring([5 + t * 11, 3 + t * 13], 0.9, 0.7, 0.4, metal, {}, 0, 360); c.ring([27 - t * 11, 3 + t * 13], 0.9, 0.7, 0.4, metal, {}, 0, 360); }
    if (kind === 'amulet') {
      c.circle([16, 21.4], 7, metal);
      c.circle([16, 21.4], 4.6, gem);
      c.ellipse([14.4, 19.4], 1.4, 0.8, { hex: '#ffffff', kind: 'glass' }, { tone: 5 }, -35);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 - Math.PI / 2; c.dot([16 + Math.cos(a) * 6, 21.4 + Math.sin(a) * 6], metal, { tone: 5 }, true); }
    } else {
      c.poly([[16, 15], [22, 21], [16, 30], [10, 21]], metal);
      c.poly([[16, 17.4], [19.8, 21.2], [16, 27.2], [12.2, 21.2]], gem);
      c.px1([14, 20.4], [15.6, 18.6], gem, { tone: 5 }, true);
    }
    if (d.glow) c.circle(kind === 'amulet' ? [16, 21.4] : [16, 22], 1.4, glowMat(d.glow));
  } else if (kind.startsWith('charm')) {
    // talismanes: pequeño, grande (alto) y enorme (más alto), con un glifo
    const h = kind === 'charm_small' ? 8 : kind === 'charm_large' ? 14 : 22;
    const w = kind === 'charm_grand' ? 8 : 6.4;
    const top = 16 - h / 2;
    const m: MatDef = { hex: d.gem ?? '#6a8a5a', kind: 'stone' };
    c.poly([[16 - w, top + 2], [16 - w + 2, top], [16 + w - 2, top], [16 + w, top + 2], [16 + w, top + h - 2], [16 + w - 2, top + h], [16 - w + 2, top + h], [16 - w, top + h - 2]], m);
    const g = glowMat(d.glow ?? '#d8f0a0');
    c.px1([16, top + 2], [16, top + h - 2], g, { tone: 4 }, true);
    c.px1([16 - w + 2, top + h / 2], [16 + w - 2, top + h / 2], g, { tone: 4 }, true);
    c.circle([16, top + h / 2], 1.2, gemMat(d.gem ? '#ffffff' : '#d8243e'));
  } else if (kind === 'jewel') {
    const pts: P[] = [];
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; pts.push([16 + Math.cos(a) * 9, 16 + Math.sin(a) * 9]); }
    c.poly(pts, gem);
    c.poly(pts.map(([x, y]) => [16 + (x - 16) * 0.5, 15 + (y - 16) * 0.5] as P), gem, { bias: 2 });
    c.ring([16, 16], 10, 10, 1.2, metal, {}, 0, 360);
  }
  c.center();
}

// ---------- consumibles ----------

export function drawPotionIcon(c: IconCanvas, kind: PotionKind, size: PotionSize = 'normal') {
  const liquid = { hex: POTION_COLORS[kind], kind: 'liquid' as const };
  const glass = { hex: '#cfe8f4', kind: 'glass' as const };
  const i = POTION_SIZES.indexOf(size);
  // frascos distintos por tamaño: redondo chico, redondo, cónico, cuadrado grande, cáliz
  const r = 5 + i * 0.9;
  const cy = 21;
  if (size === 'greater') c.poly([[9.4, 12], [22.6, 12], [24, 28.6], [8, 28.6]], glass);
  else if (size === 'super') { c.poly([[8, 12], [24, 12], [21, 22], [18, 24], [18.6, 28.6], [13.4, 28.6], [14, 24], [11, 22]], glass); c.poly([[11, 28], [21, 28], [21, 29.8], [11, 29.8]], MAT.gold); }
  else c.circle([16, cy], r, glass);
  // líquido hasta la mitad de arriba
  const top = size === 'greater' || size === 'super' ? 15.6 : cy - r * 0.35;
  for (let y = 0; y < c.size; y++) for (let x = 0; x < c.size; x++) {
    const m = c.matAt(x, y);
    if (m && m.kind === 'glass' && y / c.k >= top) c.setPx(x, y, liquid, {}, c.getPx(x, y)!.group);
  }
  // cuello, corcho, reflejo y burbujas
  const neckTop = size === 'greater' || size === 'super' ? 12 : cy - r;
  c.poly([[14, neckTop - 4.4], [18, neckTop - 4.4], [18, neckTop + 0.6], [14, neckTop + 0.6]], glass);
  c.poly([[13.6, neckTop - 7], [18.4, neckTop - 7], [18, neckTop - 4], [14, neckTop - 4]], { hex: '#8a5a2b', kind: 'wood' });
  c.ellipse([size === 'greater' ? 11.4 : 16 - r * 0.5, size === 'greater' ? 16 : cy - r * 0.35], 1, 2, { hex: '#ffffff', kind: 'glass' }, { tone: 5 }, 20);
  for (const [x, y] of [[17.6, top + 3], [15, top + 6], [18.6, top + 7.4]] as P[]) c.dot([x, y], liquid, { tone: 5 }, true);
  if (kind === 'rejuv') c.poly([[16, 18], [18.6, 21], [16, 24], [13.4, 21]], glowMat('#f0d0ff'), { tone: 5 });
  c.center();
}

export function drawConsumableIcon(c: IconCanvas, kind: ConsumableIcon, seed = 0) {
  if (kind === 'scroll_portal' || kind === 'scroll_identify') {
    c.poly([[8, 9], [24, 9], [24, 24], [8, 24]], MAT.parch);
    for (const y of [8, 24.6]) { c.line([5.6, y], [26.4, y], 3, MAT.parch); c.circle([5.6, y], 1.6, MAT.palewood); c.circle([26.4, y], 1.6, MAT.palewood); }
    if (kind === 'scroll_portal') { c.ring([16, 16.4], 5, 5.4, 1.4, glowMat('#5fb0ff'), { tone: 4 }, 0, 360); c.circle([16, 16.4], 2.4, glowMat('#c8e8ff')); }
    else { for (let y = 12.4; y <= 20.6; y += 2.7) c.px1([10.6, y], [21.4, y], MAT.darkleather, { tone: 2 }); c.circle([16, 24.4], 2.4, gemMat('#b8242c')); }
  } else if (kind === 'tome_portal') {
    drawOffhandIcon(c, 'tome', { face: '#2a4a8a', emblem: 'moon', emblemMat: glowMat('#7fc8ff'), glow: '#7fc8ff' });
    return;
  } else if (kind === 'key' || kind === 'key_boss') {
    const boss = kind === 'key_boss';
    const m = boss ? MAT.gold : MAT.iron;
    c.ring([10.6, 10.6], 5.6, 5.6, 2, m, {}, 0, 360);
    if (boss) { c.circle([10.6, 10.6], 2.2, gemMat('#d8243e')); }
    c.line([14.4, 14.4], [26, 26], 2.4, m);
    c.line([22.6, 25.4], [20.4, 27.6], 2.2, m);
    c.line([26, 21.6], [28.2, 19.4], 2.2, m);
    if (boss) c.line([24, 24], [27.4, 23.6], 1.6, m);
  } else if (kind === 'gold') {
    // montoncito de monedas apiladas y sueltas
    const coin = MAT.gold;
    for (let i = 0; i < 6; i++) c.ellipse([11, 25 - i * 2.2], 5.4, 2.2, coin, { bias: i === 5 ? 1 : 0 });
    for (let i = 0; i < 4; i++) c.ellipse([21, 26 - i * 2.2], 5.4, 2.2, coin, { bias: i === 3 ? 1 : 0 });
    c.ellipse([16.6, 28], 4.6, 1.8, coin);
    for (const [x, y] of [[11, 14], [21, 19.4]] as P[]) c.px1([x - 2.4, y], [x + 2.4, y], coin, { tone: 5 }, true);
  } else if (kind === 'ore') {
    c.poly([[6, 22], [9, 12], [16, 8], [24, 10.4], [27, 19], [22, 26], [11, 27]], MAT.stone);
    for (const [x, y, r] of [[12, 15, 2.2], [19.4, 14, 1.6], [16, 21, 2], [22, 20, 1.4]] as [number, number, number][]) c.circle([x, y], r, (seed % 2 ? MAT.silver : MAT.gold));
  } else if (kind === 'essence') {
    c.circle([16, 16], 8.4, glowMat(['#ff6a2a', '#5fb0ff', '#b48cff', '#7ad48a'][seed % 4]));
    c.circle([16, 16], 4, glowMat('#ffffff'));
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; c.dot([16 + Math.cos(a) * 11.4, 16 + Math.sin(a) * 11.4], glowMat('#ffffff'), { tone: 5 }, true); }
  } else if (kind === 'skull_trophy') {
    c.circle([16, 13], 9, MAT.bone);
    c.poly([[10, 17], [22, 17], [21, 26], [11, 26]], MAT.bone);
    for (const s of [-1, 1]) c.ellipse([16 + s * 3.8, 13.6], 2.4, 2.8, MAT.obsidian, { tone: 0 });
    c.poly([[15, 17.4], [17, 17.4], [16, 20.4]], MAT.obsidian, { tone: 0 });
    for (let x = 12.6; x <= 19.6; x += 1.8) c.px1([x, 22.4], [x, 25.6], MAT.obsidian, { tone: 1 });
    for (const s of [-1, 1]) c.poly([[16 + s * 7, 7], [16 + s * 12, 1.6], [16 + s * 10.6, 8.6]], MAT.bone);
  } else if (kind === 'map') {
    c.poly([[5, 7], [12, 5], [20, 7], [27, 5], [27, 25], [20, 27], [12, 25], [5, 27]], MAT.parch);
    c.px1([12, 5], [12, 25], MAT.parch, { tone: 2 }, true); c.px1([20, 7], [20, 27], MAT.parch, { tone: 2 }, true);
    for (let i = 0; i < 6; i++) c.dot([8 + i * 3, 20 - (i % 2) * 3 - i * 1.2], MAT.redleather, { tone: 3 }, true);
    c.px1([22, 9], [25, 12], MAT.redleather, { tone: 3 }); c.px1([25, 9], [22, 12], MAT.redleather, { tone: 3 });
  }
  c.center();
}

// ---------- gemas y runas ----------

export function drawGemIcon(c: IconCanvas, kind: GemColor, grade: GemGrade = 'normal') {
  const gi = GEM_GRADES.indexOf(grade);
  const gm = gemMat(GEM_COLORS[kind]);
  const sc = 0.55 + gi * 0.13;
  if (kind === 'skull') {
    // calaveras: de astillada a perfecta (crece y se pule)
    c.circle([16, 15], 8 * sc, MAT.bone);
    c.poly([[16 - 5 * sc, 15 + 3 * sc], [16 + 5 * sc, 15 + 3 * sc], [16 + 4 * sc, 15 + 9 * sc], [16 - 4 * sc, 15 + 9 * sc]], MAT.bone);
    for (const s of [-1, 1]) c.circle([16 + s * 3 * sc, 15], 1.8 * sc, gi >= 3 ? gemMat('#d8243e') : MAT.obsidian, gi >= 3 ? {} : { tone: 0 });
    c.center();
    return;
  }
  const sides = kind === 'sapphire' ? 4 : kind === 'emerald' ? 8 : kind === 'topaz' ? 6 : kind === 'amethyst' ? 6 : kind === 'diamond' ? 5 : 7;
  const pts: P[] = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 - Math.PI / 2 + (sides === 4 ? Math.PI / 4 : 0);
    // astillada: bordes rotos (radio irregular)
    const rr = 11 * sc * (gi === 0 ? [1, 0.7, 0.95, 0.75, 1, 0.8, 0.9, 0.7][i % 8] : gi === 1 ? [1, 0.88, 1, 0.92][i % 4] : 1);
    pts.push([16 + Math.cos(a) * rr, 16 + Math.sin(a) * rr * (kind === 'emerald' || kind === 'topaz' ? 1.2 : 1)]);
  }
  c.poly(pts, gm);
  // mesa (la cara de arriba) y facetas
  const table = pts.map(([x, y]) => [16 + (x - 16) * 0.5, 15.2 + (y - 16) * 0.5] as P);
  c.poly(table, gm, { bias: 1 });
  if (gi >= 2) for (let i = 0; i < sides; i++) c.px1(pts[i], table[i], gm, { tone: i < sides / 2 ? 4 : 2 }, true);
  if (gi >= 3) c.px1(table[0], table[Math.floor(sides / 2)], gm, { tone: 5 }, true);
  c.center();
}

const RUNE_GLYPHS: P[][][] = [
  [[[16, 7], [16, 25]], [[16, 11], [22, 7]], [[16, 15], [22, 11]]],
  [[[11, 7], [11, 25]], [[11, 7], [21, 16]], [[21, 16], [11, 25]]],
  [[[16, 7], [16, 25]], [[10, 12], [22, 20]]],
  [[[11, 7], [11, 25]], [[21, 7], [21, 25]], [[11, 16], [21, 12]]],
  [[[16, 7], [10, 16]], [[10, 16], [16, 25]], [[16, 7], [22, 16]], [[22, 16], [16, 25]]],
  [[[10, 7], [22, 25]], [[22, 7], [10, 25]]],
  [[[16, 7], [16, 25]], [[10, 10], [16, 16]], [[22, 10], [16, 16]]],
  [[[11, 25], [11, 7]], [[11, 7], [21, 12]], [[21, 12], [11, 17]]],
  [[[16, 7], [16, 25]], [[10, 19], [16, 13]], [[16, 13], [22, 19]]],
  [[[10, 9], [22, 9]], [[16, 9], [16, 25]], [[11, 25], [21, 25]]],
  [[[11, 7], [21, 7]], [[21, 7], [11, 16]], [[11, 16], [21, 25]]],
  [[[16, 7], [10, 13]], [[16, 7], [22, 13]], [[16, 7], [16, 25]], [[10, 19], [22, 19]]],
];

export function drawRuneIcon(c: IconCanvas, index: number, glow: string | null = null) {
  c.poly([[8.6, 4.4], [23.4, 4.4], [26, 7.6], [26, 25], [22.6, 28], [9.4, 28], [6, 25], [6, 7.6]], MAT.stone);
  const g = RUNE_GLYPHS[((index % RUNE_COUNT) + RUNE_COUNT) % RUNE_COUNT];
  const m: MatDef = glow ? glowMat(glow) : { hex: '#4a443c', kind: 'stone' };
  for (const [a, b] of g) c.line(a, b, 1.6, m, glow ? { tone: 4 } : { tone: 1 });
  c.center();
}

// ---------- armadura de mascota (la barda de Thor) ----------

export function drawPetArmorIcon(c: IconCanvas, tier: number) {
  const L = PET_ARMOR[Math.max(1, Math.min(5, tier)) - 1];
  const main = { hex: L.main, kind: tier >= 3 ? 'metal' as const : 'leather' as const };
  const trim = L.trim ? { hex: L.trim, kind: 'metal' as const } : null;
  // manta de lomo vista de arriba en 3/4: un escudo ancho con las puntas que caen a los lados
  if (L.cloth) c.poly([[4, 10], [28, 10], [29, 24], [23, 28], [16, 29], [9, 28], [3, 24]], { hex: L.cloth, kind: 'cloth' });
  c.poly([[6, 7], [26, 7], [27.4, 20], [22, 25], [16, 26.4], [10, 25], [4.6, 20]], main);
  if (tier >= 3) for (const y of [12, 17]) c.px1([6, y], [26, y], main, { tone: 1 }, true);
  if (trim) { c.px1([6, 7.4], [26, 7.4], trim, { tone: 4 }); c.px1([5, 20.4], [10, 25.4], trim, { tone: 4 }); c.px1([27, 20.4], [22, 25.4], trim, { tone: 4 }); c.px1([10, 25.6], [22, 25.6], trim, { tone: 4 }); }
  // collar con chapa arriba
  c.ring([16, 6], 7.6, 2.6, 1.4, { hex: '#225fd4', kind: 'leather' }, {}, 180, 360);
  c.circle([16, 8.6], 1.3, MAT.gold);
  // huella en el centro
  emblem(c, 'paw', [16, 16.6], 5, L.glow ? glowMat(L.glow) : trim ?? MAT.bone);
  if (tier >= 2 && tier < 4) for (const [x, y] of [[8, 10], [24, 10], [9, 21], [23, 21]] as P[]) c.dot([x, y], trim ?? MAT.bronze, { tone: 4 });
  if (L.gem) c.circle([16, 11.4], 1.3, gemMat(L.gem));
  c.center();
}
