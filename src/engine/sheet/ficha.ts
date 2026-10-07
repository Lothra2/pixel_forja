import type { Ramp } from '../color/ramp';

/**
 * La ficha del personaje: todo sale de aquí. JSON versionado, editable a mano.
 * La cabeza se guarda ya pixelada por tamaño (sin sellos: los sellos se ponen en cada cuadro,
 * así se puede parpadear y cambiar de expresión).
 */
export const FICHA_FORMAT = 'pixelforja.ficha';
export const FICHA_VERSION = 1;

export type CellSize = 32 | 48 | 64;
export const CELL_SIZES: CellSize[] = [32, 48, 64];

export type HeadZone = 'hair' | 'skin' | 'accessory';

export interface HeadBitmap {
  w: number;
  h: number;
  /** colores de la cabeza. `zone` dice a qué zona pertenece cada uno */
  palette: { hex: string; zone: HeadZone; tone: number }[];
  /** una fila por string. '.' es transparente; cualquier otro carácter es el índice en PIXEL_CHARS */
  rows: string[];
  /** punto del cuello (centro de la barbilla), donde se engancha al cuerpo */
  anchor: { x: number; y: number };
  /** centro de cada ojo, en coordenadas de la cabeza */
  eyes: [{ x: number; y: number }, { x: number; y: number }];
}

export const PIXEL_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export type EyeStyle = 'round' | 'big' | 'small';
export type MouthStyle = 'smile' | 'line' | 'open';

export interface Proportions {
  preset: 'chibi';
  /** multiplicadores (1 = estándar del preajuste) */
  height: number;
  build: number;
  legs: number;
  arms: number;
  head: number;
  shoulders: number;
  hips: number;
}

export interface Ficha {
  format: typeof FICHA_FORMAT;
  version: number;
  name: string;
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
  };
  /** glasses: color del marco si tiene lentes (se dibujan con sello, no se reducen) */
  face: { eyes: EyeStyle; mouth: MouthStyle; blush: boolean; brows: boolean; glasses?: string | null };
  /** cabeza de frente, ya pixelada, por tamaño */
  heads: Partial<Record<`${CellSize}`, HeadBitmap>>;
  physics: { hairLag: number };
}

export const DEFAULT_PROPORTIONS: Proportions = { preset: 'chibi', height: 1, build: 1, legs: 1, arms: 1, head: 1, shoulders: 1, hips: 1 };

/** Valida lo mínimo para no reventar al abrir una ficha editada a mano. */
export function validateFicha(f: unknown): string[] {
  const errs: string[] = [];
  const o = f as Partial<Ficha>;
  if (!o || typeof o !== 'object') return ['la ficha no es un objeto'];
  if (o.format !== FICHA_FORMAT) errs.push(`format debe ser "${FICHA_FORMAT}"`);
  if (typeof o.version !== 'number' || o.version > FICHA_VERSION) errs.push(`version no soportada: ${o.version}`);
  if (!o.palette) errs.push('falta palette');
  if (!o.heads || Object.keys(o.heads).length === 0) errs.push('falta al menos una cabeza en heads');
  for (const [k, hb] of Object.entries(o.heads ?? {})) {
    if (!hb) continue;
    if (hb.rows.length !== hb.h) errs.push(`heads.${k}: rows tiene ${hb.rows.length} filas y h=${hb.h}`);
    hb.rows.forEach((r, i) => { if (r.length !== hb.w) errs.push(`heads.${k}.rows[${i}] mide ${r.length} y w=${hb.w}`); });
  }
  return errs;
}

/** Migraciones futuras de versiones viejas van aquí. */
export function migrateFicha(f: Ficha): Ficha {
  return f;
}
