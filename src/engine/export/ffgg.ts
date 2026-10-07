import type { SheetJson, SheetAnim } from './sheet';

/** Preajuste para Fútbol Familia GG: celdas de 48, 8 por fila, apoyo en [24, 46]. */
export const FFGG_ANIMS = [
  'idle', 'walk', 'run', 'jump_takeoff', 'jump_rise', 'jump_apex', 'jump_fall', 'land', 'ready', 'trap', 'pass', 'chip',
  'shot', 'header', 'volley', 'chilena', 'slide', 'bump', 'stagger', 'tumble', 'celebrate', 'dance', 'sad', 'lose', 'win',
  'laugh', 'point', 'call', 'clap', 'goal_knee', 'goal_plane', 'skid', 'power',
] as const;

export interface FfggJson {
  cell: [48, 48];
  pivot: [24, 46];
  anims: Record<string, SheetAnim>;
}

export function toFfgg(sheet: SheetJson): { json: FfggJson; missing: string[] } {
  if (sheet.cell[0] !== 48) throw new Error('El preajuste de Fútbol Familia GG necesita celdas de 48 px');
  const anims: Record<string, SheetAnim> = {};
  const missing: string[] = [];
  for (const name of FFGG_ANIMS) {
    if (sheet.anims[name]) anims[name] = sheet.anims[name];
    else missing.push(name);
  }
  return { json: { cell: [48, 48], pivot: [24, 46], anims }, missing };
}
