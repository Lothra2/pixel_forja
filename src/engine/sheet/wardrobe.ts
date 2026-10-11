import { makeRamp, type Ramp } from '../color/ramp';
import type { Ficha, HumanFicha, WardrobeVariant } from './ficha';
import { isHuman } from './ficha';

/**
 * Vestuario por pack: una ficha puede tener variantes de ropa (calle, bañador, judogi...) y el kit dibuja cada pack
 * con la suya. Es una capacidad general: cualquier juego la usa con sus propios nombres de pack y de variante.
 */

/** La ficha con una variante puesta. La variante solo cambia lo que dice; lo demás queda igual. */
export function withVariant<F extends Ficha>(f: F, variant: WardrobeVariant | undefined): F {
  if (!variant || !isHuman(f)) return f;
  const h = f as HumanFicha;
  const palette = { ...h.palette };
  for (const [k, v] of Object.entries(variant.colors ?? {}) as [keyof typeof variant.colors & string, string | Ramp][]) {
    if (v) (palette as unknown as Record<string, Ramp>)[k] = typeof v === 'string' ? makeRamp(v) : v;
  }
  return { ...h, outfit: { ...h.outfit, ...(variant.outfit ?? {}) }, palette } as F;
}

/** Nombre de la variante que usa un pack (o null si usa la ropa de la ficha). */
export function variantForPack(f: Ficha, pack: string): string | null {
  if (!isHuman(f)) return null;
  const name = f.wardrobe?.packs?.[pack];
  return name && f.wardrobe?.variants[name] ? name : null;
}

/** La ficha vestida para un pack. */
export function dressForPack<F extends Ficha>(f: F, pack: string): F {
  const name = variantForPack(f, pack);
  return name && isHuman(f) ? withVariant(f, f.wardrobe!.variants[name]) : f;
}

/** Nombres de las variantes de una ficha (vacío si no tiene vestuario). */
export function variantNames(f: Ficha): string[] {
  return isHuman(f) && f.wardrobe ? Object.keys(f.wardrobe.variants) : [];
}
