import type { MatDef, MatKind } from './canvas';

/** Materiales con nombre para armas, armaduras y objetos. */
const m = (hex: string, kind: MatKind): MatDef => ({ hex, kind });

export const MAT = {
  iron: m('#7d838c', 'metal'),
  steel: m('#aab5c3', 'metal'),
  darksteel: m('#565c6b', 'metal'),
  silver: m('#d3dbe6', 'metal'),
  mithril: m('#a8d0f0', 'metal'),
  gold: m('#e3ae3c', 'metal'),
  palegold: m('#f0d27a', 'metal'),
  bronze: m('#b87a3e', 'metal'),
  copper: m('#c46a3e', 'metal'),
  obsidian: m('#3b3150', 'metal'),
  bloodsteel: m('#8e2a32', 'metal'),
  wood: m('#8a5a32', 'wood'),
  darkwood: m('#5b3a26', 'wood'),
  palewood: m('#c09460', 'wood'),
  leather: m('#7a4a2a', 'leather'),
  darkleather: m('#4a3022', 'leather'),
  redleather: m('#8a2e2a', 'leather'),
  bone: m('#e4d6b4', 'bone'),
  stone: m('#8c8478', 'stone'),
  parch: m('#e8d6a8', 'paper'),
  cloth: m('#4b3a8c', 'cloth'),
  string: m('#efe8d6', 'cloth'),
  fur: m('#8a6a4a', 'fur'),
  flesh: m('#9a7a5a', 'flesh'),
};

export const gemMat = (hex: string): MatDef => ({ hex, kind: 'gem' });
export const glowMat = (hex: string): MatDef => ({ hex, kind: 'glow' });
export const crystalMat = (hex: string): MatDef => ({ hex, kind: 'crystal' });
export const clothMat = (hex: string): MatDef => ({ hex, kind: 'cloth' });
export const metalMat = (hex: string): MatDef => ({ hex, kind: 'metal' });
export const leatherMat = (hex: string): MatDef => ({ hex, kind: 'leather' });

export type GemColor = 'ruby' | 'sapphire' | 'emerald' | 'topaz' | 'amethyst' | 'diamond' | 'skull';
export const GEM_COLORS: Record<GemColor, string> = {
  ruby: '#d8243e', sapphire: '#2f62e6', emerald: '#1fb35e', topaz: '#f2b21e', amethyst: '#9a3ad8', diamond: '#dff2fb', skull: '#d9cfb8',
};

export type Rarity = 'normal' | 'magic' | 'rare' | 'set' | 'unique' | 'legendary';
export const RARITIES: Rarity[] = ['normal', 'magic', 'rare', 'set', 'unique', 'legendary'];
/** colores de rareza como en Diablo (legendario en naranja, como en Diablo 3 y 4) */
export const RARITY_COLORS: Record<Rarity, string> = {
  normal: '#e8e4dc', magic: '#6c8cff', rare: '#ffd84a', set: '#3fe07a', unique: '#c79a3c', legendary: '#ff8a1e',
};
