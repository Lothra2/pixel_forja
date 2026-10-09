import type { HumanFicha, Gear } from '../sheet/ficha';
import { fichaFromAvatar } from '../sheet/build';
import { recolor, type ColorSlot } from '../sheet/recolor';
import { defaultAvatar } from '../head3d/avatar';
import { DEFAULT_LPC, type LpcLook } from '../parts/lpc';
import { bodyProportions, DEFAULT_BODY, type BodyType } from '../rig/dims';
import type { Proportions } from '../sheet/ficha';
import { applyClass, type HeroClass } from './presets';

/**
 * La familia GG: avatares listos para abrir y modificar (casual y con su clase de RPG).
 * Solo medidas y colores: ninguna foto vive en el código.
 */

export type FamilyId = 'rick' | 'steph' | 'sophie' | 'alana';
export const FAMILY: FamilyId[] = ['rick', 'steph', 'sophie', 'alana'];

interface Member {
  name: string;
  skin: string; hair: string; eyes: string; beard?: string; glasses?: string;
  lpc: Partial<LpcLook>;
  body?: BodyType;
  proportions?: Partial<Proportions>;
  outfit: Partial<HumanFicha['outfit']>;
  colors: Partial<Record<ColorSlot, string>>;
  mouth: HumanFicha['face']['mouth'];
  clase: HeroClass;
  gear?: Gear;
}

export const FAMILY_GG: Record<FamilyId, Member> = {
  rick: {
    name: 'Rick', skin: '#c98e70', hair: '#2e231f', eyes: '#3a2418', beard: '#7d736c', glasses: '#1e1e24',
    lpc: { head: 'male_gaunt', hair: 'swept_back', brows: 'thick', nose: 'straight', beard: 'basic', glasses: 'nerd' },
    outfit: { sleeves: 'short', bottom: 'pants', socks: 'low', shoes: 'tenis' },
    colors: { top: '#26272c', bottom: '#3a4256', shoes: '#e8e8ec', socks: '#f2f2f2' },
    mouth: 'smile', clase: 'paladin',
  },
  steph: {
    name: 'Steph', skin: '#c99272', hair: '#1a1416', eyes: '#3a2418',
    lpc: { head: 'female', hair: 'loose', brows: 'thin' },
    body: { age: 'adulto', build: 'delgado', shape: 'curvas' },
    outfit: { sleeves: 'short', bottom: 'pants', socks: 'low', shoes: 'tenis', print: '#e0243c' },
    colors: { top: '#f4a5b5', bottom: '#3c4a6a', shoes: '#f2f2f2', socks: '#f2f2f2' },
    mouth: 'smile', clase: 'hechicera',
  },
  sophie: {
    name: 'Sophie', skin: '#c99470', hair: '#24160f', eyes: '#2e1c14',
    lpc: { head: 'female', hair: 'ponytail', brows: 'thin' },
    body: { age: 'nino', build: 'delgado', shape: 'recto' },
    proportions: { height: 0.84, legs: 0.88 },
    outfit: { sleeves: 'short', bottom: 'skirt', socks: 'none', shoes: 'tenis', collar: 'redondo' },
    colors: { top: '#3fa8c8', bottom: '#2f96bd', shoes: '#f2f2f2' },
    mouth: 'smile', clase: 'amazona', gear: { main: 'bow', off: null },
  },
  alana: {
    name: 'Alana', skin: '#c48a66', hair: '#1e130e', eyes: '#2e1c14',
    lpc: { head: 'female', hair: 'curly_short', brows: 'thin' },
    body: { age: 'nino', build: 'medio', shape: 'recto' },
    outfit: { sleeves: 'short', bottom: 'pants', socks: 'low', shoes: 'descalzo' },
    colors: { top: '#f3dcdc', bottom: '#f4ebe8', socks: '#ecc9c0' },
    mouth: 'smile', clase: 'druida', gear: { main: 'wand', off: null, glow: '#7ad48a' },
  },
};

/** Ficha de un miembro de la familia: casual o con su clase de RPG (se puede editar como cualquier otra). */
export function familyFicha(id: FamilyId, rpg = false): HumanFicha {
  const m = FAMILY_GG[id];
  const b = defaultAvatar();
  const av = {
    ...b, skin: m.skin, kit: 'lpc' as const, body: m.body,
    hair: { ...b.hair, color: m.hair }, eyes: { ...b.eyes, color: m.eyes },
    beard: { ...b.beard, color: m.beard ?? m.hair }, glasses: { ...b.glasses, color: m.glasses ?? '#1e1e24' },
    lpc: { ...DEFAULT_LPC, nose: null, beard: null, mustache: null, glasses: null, ...m.lpc },
  };
  let f = fichaFromAvatar(m.name, av, m.outfit) as HumanFicha;
  const body = { ...DEFAULT_BODY, ...(m.body ?? {}) };
  f = { ...f, body: { ...f.body, proportions: { ...bodyProportions(f.body.proportions.preset, body), ...(m.proportions ?? {}) } } };
  for (const [s, h] of Object.entries(m.colors)) f = recolor(f, s as ColorSlot, h) as HumanFicha;
  f = { ...f, face: { ...f.face, mouth: m.mouth } };
  if (!rpg) return f;
  let r = applyClass(f, m.clase);
  if (m.gear) r = { ...r, gear: { ...r.gear, ...m.gear } };
  return { ...r, name: m.name };
}
