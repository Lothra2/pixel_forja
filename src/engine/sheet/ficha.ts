import type { Ramp } from '../color/ramp';
import type { Avatar } from '../head3d/avatar';
import type { WeaponKind, OffhandKind } from '../rig/pose';

/**
 * La ficha del personaje: todo sale de aquí. JSON versionado, editable a mano.
 * La cabeza se guarda ya pixelada por tamaño y por vista (sin sellos: los sellos se ponen en cada cuadro,
 * así se puede parpadear y cambiar de expresión).
 */
export const FICHA_FORMAT = 'pixelforja.ficha';
export const FICHA_VERSION = 3;

/**
 * Cómo se mueve el personaje. classic: las animaciones de siempre (las fichas viejas quedan igual, pixel por pixel).
 * premium: animaciones con poses clave de verdad (contacto, bajada, paso, subida; anticipación, impacto y recuperación),
 * apoyo declarado en cada cuadro, encuadre fijo y eventos para el juego (pasos, golpes).
 */
export type MovementProfile = 'classic' | 'premium';
export const MOVEMENT_PROFILES: MovementProfile[] = ['classic', 'premium'];

export type CellSize = 32 | 48 | 64;
export const CELL_SIZES: CellSize[] = [32, 48, 64];

export type HeadZone = 'hair' | 'skin' | 'accessory' | 'beard';

export interface HeadBitmap {
  w: number;
  h: number;
  /** colores de la cabeza. `zone` dice a qué zona pertenece cada uno */
  palette: { hex: string; zone: HeadZone; tone: number }[];
  /** una fila por string. '.' es transparente; cualquier otro carácter es el índice en PIXEL_CHARS */
  rows: string[];
  /** punto del cuello (centro de la barbilla), donde se engancha al cuerpo */
  anchor: { x: number; y: number };
  /** centro de cada ojo, en coordenadas de la cabeza. En una vista de lado los dos pueden ser el mismo punto */
  eyes: [{ x: number; y: number }, { x: number; y: number }];
}

/** Cabezas por vista. Solo la de frente es obligatoria: lado y espalda se derivan si no se subieron. */
export interface HeadSet {
  front: HeadBitmap;
  side?: HeadBitmap;
  back?: HeadBitmap;
}

export const PIXEL_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export type EyeStyle = 'round' | 'big' | 'small';
export type MouthStyle = 'smile' | 'line' | 'open' | 'grin';

export type PresetName = 'chibi' | 'juvenil' | 'realista';

export interface Proportions {
  preset: PresetName;
  /** multiplicadores (1 = estándar del preajuste) */
  height: number;
  build: number;
  legs: number;
  arms: number;
  head: number;
  shoulders: number;
  hips: number;
}

/** Una pose clave guardada por el editor (mismo formato que Pose, ver rig/pose.ts). */
export interface CustomAnim {
  name: string;
  fps: number;
  loop: boolean;
  /** cuadros entre cada par de poses clave */
  inBetweens: number;
  keys: unknown[];
  /** tamaño de celda en el que se hicieron las poses: al exportar a otro tamaño se escalan las distancias */
  authoredCell?: CellSize;
}

interface FichaBase {
  format: typeof FICHA_FORMAT;
  version: number;
  name: string;
  /** cómo se mueve (si falta: classic) */
  movementProfile?: MovementProfile;
  /** animaciones hechas en el editor de poses */
  customAnims?: CustomAnim[];
}

/** main: arma (null = a mano limpia). off: escudo, orbe o libro (null = nada). glow: brillo mágico. shield: color del escudo */
export interface Gear {
  main?: WeaponKind | null; off?: OffhandKind | null; glow?: string; shield?: string;
  /** objeto del botín que lleva en cada mano (id del catálogo): pinta el arma con sus colores */
  mainLoot?: string | null; offLoot?: string | null;
}

/** cuero (pícaro, bárbaro), malla (guerrero), placas (paladín), túnica (mago, nigromante) */
export type ArmorKind = 'cuero' | 'malla' | 'placas' | 'tunica';
export const ARMOR_KINDS: ArmorKind[] = ['cuero', 'malla', 'placas', 'tunica'];
export const ARMOR_DEFAULT_COLOR: Record<ArmorKind, string> = { cuero: '#7a4a2a', malla: '#8f98a3', placas: '#aeb8c4', tunica: '#4b3a8c' };

export interface HumanFicha extends FichaBase {
  body: { skeleton: 'human'; proportions: Proportions };
  palette: {
    skin: Ramp;
    hair: Ramp;
    eyes: string;
    top: Ramp;
    bottom: Ramp;
    socks: Ramp;
    shoes: Ramp;
    accessory: Ramp;
  };
  outfit: {
    sleeves: 'none' | 'short' | 'long';
    bottom: 'shorts' | 'pants' | 'skirt';
    socks: 'none' | 'low' | 'knee';
    /** número de camiseta (se ve de frente y de espalda) */
    number?: string;
    numberColor?: string;
    /** guantes de portero (las manos toman el color del accesorio) */
    gloves?: boolean;
    /** estampado chillón en el pecho (un detalle de color, la letra no cabe) */
    print?: string | null;
    /** emblema del pecho, de frente y en diagonal: araña o murciélago (con óvalo de fondo si hay emblemBg) */
    emblem?: 'spider' | 'bat' | null;
    emblemColor?: string;
    emblemBg?: string | null;
    /** diseño de la camiseta, con un segundo color (camisetas de equipo) */
    pattern?: 'liso' | 'rayas' | 'rayas_h' | 'banda' | 'mitades' | 'cuadros';
    pattern2?: string;
    /** cuello de la camiseta */
    collar?: 'redondo' | 'v' | 'polo';
    /** chaqueta abierta encima (color); null o sin valor, no hay */
    jacket?: string | null;
    /** calzado */
    shoes?: 'tenis' | 'guayos' | 'botas' | 'descalzo';
    /** armadura o traje de RPG encima de la ropa */
    armor?: ArmorKind | null;
    /** color de la armadura: metal, cuero o tela */
    armorColor?: string;
    /** ribetes y detalles (dorado, plateado) */
    trim?: string | null;
    /** capa (color); null o sin valor, no hay */
    cape?: string | null;
    /** hombreras */
    pauldrons?: boolean;
    /** cinturón (color) */
    belt?: string | null;
    /** nivel de la armadura (1 a 5): sale de la evolución del botín */
    armorTier?: number;
    /** gema en el pecho (color) */
    armorGem?: string | null;
    /** runas que brillan (color, nivel legendario) */
    armorGlow?: string | null;
  };
  /** glasses: color del marco si tiene lentes (se dibujan con sello, no se reducen) */
  face: { eyes: EyeStyle; mouth: MouthStyle; blush: boolean; brows: boolean; glasses?: string | null; thickBrows?: boolean };
  /** equipo de RPG: arma en la mano y algo en la otra (escudo, orbe, libro). Reemplaza la espada y el escudo de las animaciones */
  gear?: Gear;
  /** cabezas ya pixeladas, por tamaño */
  heads: Partial<Record<`${CellSize}`, HeadSet>>;
  /**
   * avatar: la cabeza armada por piezas (pelo, ojos, barba, lentes...). Se dibuja en cada cuadro y gira
   * de verdad de lado y de espalda. headMode dice qué cabeza usar: la del avatar o la pixelada de la imagen.
   */
  avatar?: Avatar;
  headMode?: 'avatar' | 'image';
  physics: { hairLag: number };
  /**
   * Vestuario por pack: variantes de ropa con nombre (calle, bañador, judogi...) y cuál usa cada pack del kit.
   * Lo que la variante no dice queda como en la ficha. Ver sheet/wardrobe.ts
   */
  wardrobe?: Wardrobe;
}

/** Una variante de ropa: cambia la ropa y sus colores (hex o la rampa entera). */
export interface WardrobeVariant {
  /** nombre para mostrar en el estudio */
  label?: string;
  outfit?: Partial<HumanFicha['outfit']>;
  colors?: Partial<Record<'top' | 'bottom' | 'socks' | 'shoes' | 'accessory', string | Ramp>>;
}

export interface Wardrobe {
  /** variantes por nombre (en minúsculas, números y _) */
  variants: Record<string, WardrobeVariant>;
  /** qué variante usa cada pack del kit (pack -> variante). El pack que no figura usa la ropa de la ficha */
  packs?: Record<string, string>;
}

export type Species = 'boxer' | 'perro' | 'mapache' | 'gato';
export const SPECIES: Species[] = ['boxer', 'perro', 'mapache', 'gato'];

export interface AnimalFicha extends FichaBase {
  body: { skeleton: 'quadruped'; species: Species; size: number };
  palette: {
    /** pelaje principal */
    fur: Ramp;
    /** manchas claras (pecho, patas) */
    fur2: Ramp;
    /** máscara, nariz, almohadillas */
    dark: Ramp;
    eyes: string;
    /** collar; null si no tiene */
    collar: Ramp | null;
  };
  markings: { chest: boolean; paws: boolean; mask: boolean };
  /** armadura de mascota (barda), nivel 1 a 5; 0 o sin valor, sin armadura */
  barding?: number;
}

export type Ficha = HumanFicha | AnimalFicha;

export function isHuman(f: Ficha): f is HumanFicha {
  return f.body.skeleton === 'human';
}

/** ¿Esta ficha dibuja la cabeza desde el avatar? */
export function usesAvatar(f: HumanFicha): boolean {
  return !!f.avatar && (f.headMode === 'avatar' || Object.keys(f.heads).length === 0);
}

export const DEFAULT_PROPORTIONS: Proportions = { preset: 'chibi', height: 1, build: 1, legs: 1, arms: 1, head: 1, shoulders: 1, hips: 1 };

/** Valida lo mínimo para no reventar al abrir una ficha editada a mano. */
export function validateFicha(f: unknown): string[] {
  const errs: string[] = [];
  const o = f as { format?: string; version?: number; palette?: unknown; body?: { skeleton?: string }; heads?: Record<string, unknown> };
  if (!o || typeof o !== 'object') return ['la ficha no es un objeto'];
  if (o.format !== FICHA_FORMAT) errs.push(`format debe ser "${FICHA_FORMAT}"`);
  if (typeof o.version !== 'number' || o.version > FICHA_VERSION) errs.push(`version no soportada: ${o.version}`);
  if (!o.palette) errs.push('falta palette');
  if (!o.body) errs.push('falta body');
  if (o.body?.skeleton === 'quadruped') return errs;
  const wd = (o as { wardrobe?: Wardrobe }).wardrobe;
  if (wd) {
    if (!wd.variants || typeof wd.variants !== 'object') errs.push('wardrobe.variants tiene que ser un objeto');
    else for (const k of Object.keys(wd.variants)) if (!/^[a-z0-9_]+$/.test(k)) errs.push(`wardrobe.variants: nombre inválido "${k}" (minúsculas, números y _)`);
    for (const [pack, v] of Object.entries(wd.packs ?? {})) if (!wd.variants?.[v]) errs.push(`wardrobe.packs.${pack}: no existe la variante "${v}"`);
  }
  const hasAvatar = !!(o as { avatar?: unknown }).avatar;
  if (!hasAvatar && (!o.heads || Object.keys(o.heads).length === 0)) errs.push('falta al menos una cabeza en heads (o un avatar)');
  for (const [k, hs] of Object.entries(o.heads ?? {})) {
    if (!hs) continue;
    const set = (hs as HeadSet).front ? (hs as HeadSet) : { front: hs as unknown as HeadBitmap };
    for (const [view, hb] of Object.entries(set) as [string, HeadBitmap | undefined][]) {
      if (!hb) continue;
      if (hb.rows.length !== hb.h) errs.push(`heads.${k}.${view}: rows tiene ${hb.rows.length} filas y h=${hb.h}`);
      hb.rows.forEach((r, i) => { if (r.length !== hb.w) errs.push(`heads.${k}.${view}.rows[${i}] mide ${r.length} y w=${hb.w}`); });
    }
  }
  return errs;
}

/** Lleva una ficha vieja a la versión actual. */
export function migrateFicha(input: unknown): Ficha {
  const f = structuredClone(input) as Record<string, unknown> & { version: number };
  if (f.version === 1) {
    const heads = f.heads as Record<string, HeadBitmap>;
    const next: Record<string, HeadSet> = {};
    for (const [k, hb] of Object.entries(heads)) next[k] = { front: hb };
    f.heads = next;
    const body = f.body as HumanFicha['body'];
    body.proportions = { ...DEFAULT_PROPORTIONS, ...body.proportions };
    f.version = 2;
  }
  if (f.version === 2) {
    // la versión 3 agrega el perfil de movimiento: lo viejo queda clásico
    f.movementProfile = 'classic';
    f.version = 3;
  }
  return f as unknown as Ficha;
}
