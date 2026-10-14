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

/**
 * Uniformes de pack (lote B4B6 bis): ropa que el kit pone a todos los atletas de un pack, encima de la suya, con
 * `vestuario` en el pack del `kit.config.json`. La variante de la ficha para ese pack, si la tiene, manda.
 * El cinturón toma el color del equipo del atleta (el que más contrasta con el uniforme de sus dos colores).
 */
export const UNIFORMES: Record<string, WardrobeVariant & { cinturonEquipo?: boolean; sinSombrero?: boolean }> = {
  /** judogi blanco: chaqueta abierta del mismo blanco sobre la camiseta (se ve la solapa), pantalón, descalzo */
  judogi: {
    label: 'Judogi blanco',
    outfit: { sleeves: 'long', bottom: 'pants', socks: 'none', shoes: 'descalzo', collar: 'v', pattern: 'liso', print: null, emblem: null, chestText: null, armband: null, neck: null, cape: null, armor: null, jacket: '#f4f3ee', jacketCut: 'casual', jacketClosed: false, jacketSleeves: 'long' },
    colors: { top: '#f4f3ee', bottom: '#f4f3ee' }, cinturonEquipo: true, sinSombrero: true,
  },
  /** judogi azul, el del rival */
  judogi_azul: {
    label: 'Judogi azul',
    outfit: { sleeves: 'long', bottom: 'pants', socks: 'none', shoes: 'descalzo', collar: 'v', pattern: 'liso', print: null, emblem: null, chestText: null, armband: null, neck: null, cape: null, armor: null, jacket: '#2c4fa6', jacketCut: 'casual', jacketClosed: false, jacketSleeves: 'long' },
    colors: { top: '#2c4fa6', bottom: '#2c4fa6' }, cinturonEquipo: true, sinSombrero: true,
  },
};

const luma = (hex: string) => { const n = parseInt(hex.replace('#', '').slice(0, 6), 16); return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); };

/**
 * La ficha vestida para un pack con su uniforme: la variante propia de la ficha para el pack manda; si no tiene, el
 * uniforme, con el cinturón del color del equipo (de sus colores, el que más contrasta con el uniforme; negro sin equipo).
 */
export function dressWithUniform<F extends Ficha>(f: F, pack: string, uniforme?: string, coloresEquipo?: string[]): F {
  if (variantForPack(f, pack) || !uniforme || !UNIFORMES[uniforme] || !isHuman(f)) return dressForPack(f, pack);
  const u = UNIFORMES[uniforme];
  const fondo = String(u.colors?.top ?? '#ffffff');
  const cols = (coloresEquipo ?? []).filter((c) => /^#[0-9a-f]{6}$/i.test(c));
  const belt = !u.cinturonEquipo ? undefined : cols.length ? cols.reduce((a, b) => (Math.abs(luma(b) - luma(fondo)) > Math.abs(luma(a) - luma(fondo)) + 40 ? b : a)) : '#1e1e24';
  const vestida = withVariant(f, { ...u, outfit: { ...u.outfit, ...(belt ? { belt } : {}) } }) as F & HumanFicha;
  // en el tatami no van sombreros, cascos ni gorras: quedan las cintas de la cabeza y los rulos, que son del personaje
  const hat = vestida.avatar?.lpc?.hat;
  if (u.sinSombrero && hat && !/^(headband|rolos)/.test(hat)) return { ...vestida, avatar: { ...vestida.avatar!, lpc: { ...vestida.avatar!.lpc!, hat: null } } } as F;
  return vestida;
}
