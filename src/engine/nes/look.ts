import type { Ficha } from '../sheet/ficha';

/**
 * Estilo Nekketsu (Kunio-kun, Nintendo World Cup, Technos en la NES): lo que hace falta para dibujar a alguien así.
 * Es mucho menos que una ficha: en ese estilo un personaje es un peinado, un color de piel y su uniforme.
 * Se escribe a mano o sale de una ficha con `nesLookFromFicha`.
 */
export type NesHair = 'corto' | 'raya' | 'largo' | 'liso' | 'colitas' | 'despeinado' | 'puntas' | 'tazon' | 'rapado' | 'moño';
export const NES_HAIRS: NesHair[] = ['corto', 'raya', 'largo', 'liso', 'colitas', 'despeinado', 'puntas', 'tazon', 'rapado', 'moño'];

/** Marcas sobre la cabeza: barba, cintillo, ligas, y las de las mascotas (cuernos, aleta, plumas, antifaz con orejas). */
export type NesMark = 'barba' | 'bigote' | 'cintillo' | 'ligas' | 'cuernos' | 'aleta' | 'plumas' | 'antifaz' | 'lentes';

export interface NesLook {
  /** colores en #rrggbb */
  piel: string;
  pelo: string;
  peinado: NesHair;
  camisa: string;
  short: string;
  medias: string;
  zapatos: string;
  /** color de cintillo, ligas o de la marca de la mascota */
  acento?: string;
  marcas?: NesMark[];
  /** portero: guantes blancos */
  guantes?: boolean;
  /** un poco más bajito (niños pequeños) o más ancho (adultos grandes) */
  talla?: 'nino' | 'normal' | 'grande';
  /** cara de malo: cejas más bajas y gruesas */
  malandro?: boolean;
}

/** A ramp of the forja is [outline, shadow, base, light]: the base is the colour of the garment. */
const hex = (r: unknown, fb: string): string => (Array.isArray(r) && typeof r[2] === 'string' ? r[2] : typeof r === 'string' ? r : fb);

/** Traduce una ficha de la forja al estilo Nekketsu: toma la piel, el pelo y los colores de la ropa, y elige el peinado más parecido. */
export function nesLookFromFicha(f: Ficha, extra: Partial<NesLook> = {}): NesLook {
  const h = f as unknown as { palette?: Record<string, unknown>; avatar?: { hair?: { style?: string } }; outfit?: { gloves?: boolean } };
  const p = (h.palette ?? {}) as Record<string, unknown>;
  const style = String(h.avatar?.hair?.style ?? '').toLowerCase();
  const peinado: NesHair = /pigtail|colita|twin/.test(style) ? 'colitas' : /xlong|wavy|largo|long/.test(style) ? 'largo' : /straight|liso|bob/.test(style) ? 'liso'
    : /messy|despein|shag/.test(style) ? 'despeinado' : /spik|punta/.test(style) ? 'puntas' : /bowl|tazon/.test(style) ? 'tazon' : /part|raya/.test(style) ? 'raya'
      : /buzz|bald|rapad/.test(style) ? 'rapado' : /bun|moño/.test(style) ? 'moño' : 'corto';
  return {
    piel: hex(p.skin as never, '#e0a070'), pelo: hex(p.hair as never, '#241814'), peinado,
    camisa: hex(p.top as never, '#d8202a'), short: hex(p.bottom as never, '#ffffff'), medias: hex(p.socks as never, '#ffffff'), zapatos: hex(p.shoes as never, '#181010'),
    acento: hex(p.accessory as never, '#ffd447'), guantes: !!h.outfit?.gloves, ...extra,
  };
}
