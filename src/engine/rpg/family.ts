import { FICHA_FORMAT, FICHA_VERSION, type HumanFicha, type AnimalFicha, type Gear } from '../sheet/ficha';
import { makeRamp } from '../color/ramp';
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
  /** la cabeza con su clase de RPG (GG Abyss), si cambia: Rick de calle va con parted2 y en GG Abyss con swept_back */
  lpcRpg?: Partial<LpcLook>;
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
    lpc: { head: 'male_gaunt', hair: 'parted2', brows: 'thick', nose: 'straight', beard: 'basic', glasses: 'nerd' },
    lpcRpg: { hair: 'swept_back' },
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
  const m0 = FAMILY_GG[id];
  // con su clase es la de GG Abyss: su cabeza de RPG y sin las cejas fruncidas de los rivales
  const m = rpg ? { ...m0, lpc: { ...m0.lpc, ...m0.lpcRpg, ceno: false } } : m0;
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
  // la familia se mueve con el perfil premium (poses clave de verdad, pivote fijo, eventos)
  f = { ...f, face: { ...f.face, mouth: m.mouth }, movementProfile: 'premium' };
  if (!rpg) return f;
  let r = applyClass(f, m.clase);
  if (m.gear) r = { ...r, gear: { ...r.gear, ...m.gear } };
  return { ...r, name: m.name };
}

/** Thor, el bóxer de la familia: mascota ayudante. barding = nivel de su armadura (0 a 5). */
export function thorFicha(barding = 0): AnimalFicha {
  return {
    format: FICHA_FORMAT, version: FICHA_VERSION, name: 'Thor',
    body: { skeleton: 'quadruped', species: 'boxer', size: 1 },
    palette: { fur: makeRamp('#b5713a'), fur2: makeRamp('#f0ece4'), dark: makeRamp('#573e2b'), eyes: '#3a2414', collar: makeRamp('#225fd4') },
    markings: { chest: true, paws: true, mask: true },
    ...(barding > 0 ? { barding } : {}),
    // premium: proporciones de bóxer, andares de verdad, eventos y pivote fijo
    movementProfile: 'premium',
  };
}
