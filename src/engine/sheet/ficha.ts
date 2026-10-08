import type { Ramp } from '../color/ramp';

/**
 * La ficha del personaje: todo sale de aquí. JSON versionado, editable a mano.
 * La cabeza se guarda ya pixelada por tamaño y por vista (sin sellos: los sellos se ponen en cada cuadro,
 * así se puede parpadear y cambiar de expresión).
 */
export const FICHA_FORMAT = 'pixelforja.ficha';
export const FICHA_VERSION = 2;

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
export type MouthStyle = 'smile' | 'line' | 'open';

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
}

interface FichaBase {
  format: typeof FICHA_FORMAT;
  version: number;
  name: string;
  /** animaciones hechas en el editor de poses */
  customAnims?: CustomAnim[];
}

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
  };
  /** glasses: color del marco si tiene lentes (se dibujan con sello, no se reducen) */
  face: { eyes: EyeStyle; mouth: MouthStyle; blush: boolean; brows: boolean; glasses?: string | null; thickBrows?: boolean };
  /** cabezas ya pixeladas, por tamaño */
  heads: Partial<Record<`${CellSize}`, HeadSet>>;
  physics: { hairLag: number };
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
}

export type Ficha = HumanFicha | AnimalFicha;

export function isHuman(f: Ficha): f is HumanFicha {
  return f.body.skeleton === 'human';
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
  if (!o.heads || Object.keys(o.heads).length === 0) errs.push('falta al menos una cabeza en heads');
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
  return f as unknown as Ficha;
}
