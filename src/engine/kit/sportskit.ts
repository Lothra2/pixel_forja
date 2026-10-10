import { createRaster, blit, type Raster } from '../core/raster';
import { encodePng } from '../export/png';
import { motionOf8 } from '../export/motion';
import { creditsFor, type ExportFile } from '../export/bundle';
import { renderClip, EIGHT_VIEWS, VIEW_SUFFIX, hasAnim, type RenderedClip } from '../render/clip';
import type { CellSize, HumanFicha } from '../sheet/ficha';
import { familyFicha, FAMILY } from '../rpg/family';
import { heroFicha, heroCell, HEROES } from '../rpg/heroes';
import { ATHLETICS_PREMIUM } from '../anim/athletics';
import { SWIM_PREMIUM } from '../anim/swim';
import { NET_PREMIUM } from '../anim/net';
import { FIGHT_PREMIUM } from '../anim/fight';

/**
 * Kit deportivo: hojas de 8 direcciones de cada atleta y cada deporte, con un manifest.json que le dice al juego
 * todo lo que necesita: cuadros, fps, eventos (pasos, golpes, despegues, sueltas, aterrizajes), avance sin patinar,
 * elevación de los saltos y la fila del agua de los nadadores.
 */

const base = ['idle', 'walk', 'run', 'hit', 'celebrate', 'sad'];
export const SPORT_PACKS = {
  atletismo: [...base, ...ATHLETICS_PREMIUM.map((a) => a.name)],
  natacion: ['idle', ...SWIM_PREMIUM.map((a) => a.name)],
  voley: [...base, ...NET_PREMIUM.filter((a) => a.pack === 'volley').map((a) => a.name)],
  tenis: [...base, ...NET_PREMIUM.filter((a) => a.pack === 'tennis').map((a) => a.name)],
  pelea: ['idle', 'walk', ...FIGHT_PREMIUM.map((a) => a.name)],
} as const;
export type SportPack = keyof typeof SPORT_PACKS;
export const SPORT_PACK_NAMES = Object.keys(SPORT_PACKS) as SportPack[];

export interface SportsKitOptions {
  /** atletas por id (minúsculas, números y _). Sin esto, la familia con ropa de calle y los héroes */
  athletes?: Record<string, HumanFicha>;
  /** celda de un atleta en particular (el coloso va en 64); los demás usan `cell` */
  cells?: Record<string, CellSize>;
  packs?: SportPack[];
  cell?: CellSize;
  /** pocas animaciones por deporte (para pruebas rápidas) */
  quick?: boolean;
  progress?: (msg: string) => void;
}

export interface SportAnimEntry {
  archivo: string;
  cuadros: number;
  fps: number;
  loop: boolean;
  eventos?: { tipo: string; cuadro: number; fase: number; pie?: string }[];
  avance?: number;
  elevacion?: number[];
  desplazamiento?: number[];
  rumbo?: string[];
  /** fila de la superficie del agua en cada cuadro (en pixeles desde arriba de la celda), o null */
  agua?: (number | null)[];
}

const enc = new TextEncoder();

/** Hoja de 8 direcciones: fila = dirección (orden de `direcciones`), columna = cuadro. */
function sheet8(f: HumanFicha, cell: CellSize, anim: string): { png: Raster; first: RenderedClip; clips: RenderedClip[]; frames: number } {
  const clips = EIGHT_VIEWS.map((v) => renderClip(f, cell, anim, v, { props: true }));
  const n = Math.max(...clips.map((c) => c.frames.length));
  const png = createRaster(n * cell, 8 * cell);
  clips.forEach((c, row) => c.frames.forEach((fr, i) => blit(png, fr, i * cell, row * cell)));
  return { png, first: clips[0], clips, frames: n };
}

export function buildSportsKit(opts: SportsKitOptions = {}): ExportFile[] {
  const log = opts.progress ?? (() => {});
  const cell = opts.cell ?? 48;
  const packs = opts.packs ?? SPORT_PACK_NAMES;
  const athletes: Record<string, HumanFicha> = opts.athletes ?? Object.fromEntries([
    ...FAMILY.map((id): [string, HumanFicha] => [id, { ...familyFicha(id, false), movementProfile: 'premium' }]),
    ...HEROES.map((id): [string, HumanFicha] => [id, heroFicha(id)]),
  ]);
  const cells: Record<string, CellSize> = opts.cells ?? (opts.athletes ? {} : Object.fromEntries(HEROES.map((id) => [id, heroCell(id)])));
  const files: ExportFile[] = [];
  const credits = new Set<string>();
  const manifest: Record<string, unknown> = {
    tipo: 'kit deportivo', generado_con: 'PixelForja', version: 1, celda: cell, pivote: [cell / 2, cell - 2],
    // cada atleta trae su celda y su pivote (un gigante puede ir en una celda más grande)
    direcciones: EIGHT_VIEWS.map((v) => VIEW_SUFFIX[v]),
    notas: [
      'Hojas: fila = dirección (orden de `direcciones`), columna = cuadro. El pivote es el punto de apoyo (pies) y no se mueve.',
      'eventos: en qué cuadro cae cada paso, golpe (impacto), despegue, suelta (pelota, bala, jabalina, hechizo) y aterrizaje.',
      'avance: pixeles que avanza el cuerpo en un ciclo sin patinar. Ritmo = velocidad_del_juego * cuadros / (avance * fps).',
      'elevacion: pixeles que el juego sube el sprite en cada cuadro (saltos que no caben en la celda); la sombra queda en el piso.',
      'agua: fila de la superficie en la celda; el juego puede dibujar su piscina detrás y el nadador ya trae el tinte y las gotas.',
      'desplazamiento: en las acciones que avanzan (salto largo, clavado, remate), pixeles que el juego mueve el sprite hacia donde mira, acumulados desde el primer cuadro.',
      'rumbo: en las pruebas de campo, de frente y de espalda se dibuja la diagonal más cercana; rumbo dice hacia dónde moverlo en cada fila.',
    ],
  };
  const out: Record<string, { nombre: string; celda: number; pivote: [number, number]; deportes: Record<string, Record<string, SportAnimEntry>> }> = {};
  for (const [id, f] of Object.entries(athletes)) {
    if (!/^[a-z0-9_]+$/.test(id)) throw new Error(`id de atleta inválido: "${id}" (usa minúsculas, números y _)`);
    const c = creditsFor(f);
    if (c) credits.add(c);
    const sports: Record<string, Record<string, SportAnimEntry>> = {};
    const C = cells[id] ?? cell;
    for (const pack of packs) {
      const names = (opts.quick ? SPORT_PACKS[pack].slice(-2) : SPORT_PACKS[pack]).filter((a) => hasAnim(f, a));
      const entries: Record<string, SportAnimEntry> = {};
      for (const a of names) {
        const s = sheet8(f, C, a);
        const name = `atletas/${id}/${pack}/${a}.png`;
        files.push({ name, bytes: encodePng(s.png), mime: 'image/png' });
        const m = motionOf8(s.clips);
        entries[a] = {
          archivo: name, cuadros: s.frames, fps: s.first.fps, loop: s.first.loop, ...m,
          ...(s.first.waterRows ? { agua: s.first.waterRows } : {}),
        };
      }
      sports[pack] = entries;
      log(`${id}/${pack}: ${names.length} animaciones`);
    }
    out[id] = { nombre: f.name || id, celda: C, pivote: [C / 2, C - 2], deportes: sports };
  }
  manifest.atletas = out;
  if (credits.size) {
    files.push({ name: 'CREDITOS.txt', bytes: enc.encode([...credits].join('\n\n')), mime: 'text/plain' });
    manifest.creditos = 'CREDITOS.txt';
  }
  files.push({ name: 'manifest.json', bytes: enc.encode(JSON.stringify(manifest, null, 1)), mime: 'application/json' });
  return files;
}
