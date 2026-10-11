import { createRaster, blit, type Raster } from '../core/raster';
import { encodePng } from '../export/png';
import { motionOf8 } from '../export/motion';
import { creditsFor, type ExportFile } from '../export/bundle';
import { renderClip, EIGHT_VIEWS, VIEW_SUFFIX, hasAnim, type RenderedClip, type ViewName } from '../render/clip';
import { viewsForRows, frameDataOf, pivotOf, FRAME_DATA_FIELDS, type FrameData, type FrameDataField } from '../export/frameData';
import { packAtlas, atlasFrameName } from '../export/atlas';
import { portraitSheet, headIcon, HEAD_ICON, PORTRAIT_BIG_SCALE } from './portraits';
import { dressForPack, variantForPack } from '../sheet/wardrobe';
import type { CellSize, HumanFicha } from '../sheet/ficha';
import { familyFicha, FAMILY } from '../rpg/family';
import { heroFicha, heroCell, HEROES } from '../rpg/heroes';
import { ATHLETICS_PREMIUM } from '../anim/athletics';
import { SWIM_PREMIUM } from '../anim/swim';
import { NET_PREMIUM } from '../anim/net';
import { FIGHT_PREMIUM } from '../anim/fight';
import { FOOTBALL_PREMIUM } from '../anim/footballPremium';
import { BRAWL } from '../anim/brawl';
import { buildObjectsAtlas } from '../render/floorProps';

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
  futbol: ['idle', 'walk', 'run', ...FOOTBALL_PREMIUM.filter((a) => a.name !== 'kick').map((a) => a.name), 'celebrate', 'goal_knee', 'goal_plane', 'sad'],
  /** pelea callejera (beat 'em up): levantar, llevar, lanzar, agarres, armas del piso. Se pide aparte (no va por defecto) */
  calle: ['idle', 'walk', 'run', 'hit', 'jab', 'punch', 'low_kick', 'knockout', ...BRAWL.map((a) => a.name)],
} as const;
export type SportPack = keyof typeof SPORT_PACKS;
export const SPORT_PACK_NAMES = Object.keys(SPORT_PACKS) as SportPack[];
/** los deportes que salen si no se piden otros (los de siempre: la pelea callejera se pide con `calle`) */
export const DEFAULT_SPORT_PACKS = SPORT_PACK_NAMES.filter((p) => p !== 'calle');

export interface SportsKitOptions {
  /** atletas por id (minúsculas, números y _). Sin esto, la familia con ropa de calle y los héroes */
  athletes?: Record<string, HumanFicha>;
  /** celda de un atleta en particular (Hulk va en 64); si no, la de su ficha (`cell`) o la del kit */
  cells?: Record<string, CellSize>;
  packs?: SportPack[];
  cell?: CellSize;
  /** pocas animaciones por deporte (para pruebas rápidas) */
  quick?: boolean;
  /**
   * filas a exportar (nombres de `direcciones`, en el orden en que van). Sin esto, las 8. Un juego que espeja la
   * izquierda pide 5: right, down_right, up_right, down, up
   */
  filas?: string[];
  /** datos por cuadro en cada animación: true = todos (cajas, manos, cabeza, pies) o la lista de los que hacen falta */
  datos?: boolean | FrameDataField[];
  /**
   * un atlas por pack (JSON Hash de TexturePacker, cuadro `<anim>_<fila>_<cuadro>`) en vez de una hoja por animación.
   * El atleta trae `packs` en vez de `deportes`
   */
  atlas?: boolean;
  /** hoja de retratos por atleta: 7 expresiones en 40 x 40 y 96 x 96 */
  retratos?: boolean;
  /** cabecitas de 12 x 12 de todos los atletas en ui/cabecitas.png */
  cabecitas?: boolean;
  /** las armas del piso (pelea callejera) en objetos/armas.png + .json, con su entrada en `objetos` */
  objetos?: boolean;
  progress?: (msg: string) => void;
}

export interface SportAnimEntry extends FrameData {
  /** la hoja de la animación (no va si el kit sale en atlas: los cuadros están en el atlas del pack) */
  archivo?: string;
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

/** Las animaciones de una hoja: una fila por vista pedida (8 si no se piden filas). */
function clips8(f: HumanFicha, cell: CellSize, anim: string, views: readonly ViewName[]): { clips: RenderedClip[]; frames: number; side?: RenderedClip } {
  const clips = views.map((v) => renderClip(f, cell, anim, v, { props: true }));
  // el avance y los eventos se miden de lado: si las filas pedidas no lo traen, se dibuja aparte solo para medir
  const side = views.includes('side') ? undefined : renderClip(f, cell, anim, 'side', { props: true });
  return { clips, frames: Math.max(...clips.map((c) => c.frames.length)), side };
}

/** Hoja: fila = dirección (orden de `direcciones`), columna = cuadro. */
function sheetOf(clips: RenderedClip[], cell: CellSize, n: number): Raster {
  const png = createRaster(n * cell, clips.length * cell);
  clips.forEach((c, row) => c.frames.forEach((fr, i) => blit(png, fr, i * cell, row * cell)));
  return png;
}

/** ¿Se escribe en una sola línea? Los arreglos de números (y de arreglos de números): cajas, manos, agua... */
const inline = (v: unknown): boolean => Array.isArray(v) && v.every((x) => x === null || typeof x !== 'object' || inline(x));

/** JSON con sangría de 1 como siempre, pero con los arreglos de números en una línea (los datos por cuadro pesan 5 veces menos). */
export function compactJson(v: unknown, ind = ''): string {
  if (v === null || typeof v !== 'object' || inline(v)) return JSON.stringify(v);
  const n = ind + ' ';
  if (Array.isArray(v)) return v.length ? `[\n${v.map((x) => n + compactJson(x, n)).join(',\n')}\n${ind}]` : '[]';
  const es = Object.entries(v).filter(([, x]) => x !== undefined);
  return es.length ? `{\n${es.map(([k, x]) => `${n}${JSON.stringify(k)}: ${compactJson(x, n)}`).join(',\n')}\n${ind}}` : '{}';
}

/** Une rasters del mismo alto en una tira horizontal. */
function strip(rs: Raster[], w: number, h: number): Raster {
  const out = createRaster(w * rs.length, h);
  rs.forEach((r, i) => blit(out, r, i * w, 0));
  return out;
}

export function buildSportsKit(opts: SportsKitOptions = {}): ExportFile[] {
  const log = opts.progress ?? (() => {});
  const cell = opts.cell ?? 48;
  const packs = opts.packs ?? DEFAULT_SPORT_PACKS;
  const views = opts.filas ? viewsForRows(opts.filas) : EIGHT_VIEWS;
  const rows = views.map((v) => VIEW_SUFFIX[v]);
  const fields: FrameDataField[] = opts.datos === true ? FRAME_DATA_FIELDS : opts.datos || [];
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
    direcciones: rows,
    ...(opts.filas ? { filas: rows } : {}),
    notas: [
      'Hojas: fila = dirección (orden de `direcciones`), columna = cuadro. El pivote es el punto de apoyo (pies) y no se mueve.',
      'eventos: en qué cuadro cae cada paso, golpe (impacto), despegue, suelta (pelota, bala, jabalina, hechizo) y aterrizaje.',
      'avance: pixeles que avanza el cuerpo en un ciclo sin patinar. Ritmo = velocidad_del_juego * cuadros / (avance * fps).',
      'elevacion: pixeles que el juego sube el sprite en cada cuadro (saltos que no caben en la celda); la sombra queda en el piso.',
      'agua: fila de la superficie en la celda; el juego puede dibujar su piscina detrás y el nadador ya trae el tinte y las gotas.',
      'desplazamiento: en las acciones que avanzan (salto largo, clavado, remate), pixeles que el juego mueve el sprite hacia donde mira, acumulados desde el primer cuadro.',
      'rumbo: en las pruebas de campo, de frente y de espalda se dibuja la diagonal más cercana; rumbo dice hacia dónde moverlo en cada fila.',
      ...(fields.length ? ['cajas, manos, cabeza y pies: [fila][cuadro], en pixeles desde el pivote con y hacia abajo. cajas = [x, y, w, h] de lo opaco (null si el cuadro está vacío); manos y pies = [[x, y] cerca, [x, y] lejos].'] : []),
      ...(opts.atlas ? ['packs: un atlas por pack (JSON Hash de TexturePacker, para this.load.atlas de Phaser). Cada cuadro se llama <anim>_<fila>_<cuadro>, con la fila por nombre (right, down...) y el cuadro desde 0.'] : []),
    ],
  };
  type PackEntry = { atlas: string; imagen: string; anims: Record<string, SportAnimEntry> };
  type AthleteEntry = {
    nombre: string; celda: number; pivote: [number, number];
    deportes?: Record<string, Record<string, SportAnimEntry>>; packs?: Record<string, PackEntry>;
    vestuario?: Record<string, string>; retratos?: Record<string, unknown>; cabecita?: string;
  };
  const out: Record<string, AthleteEntry> = {};
  const heads: Raster[] = [];
  for (const [id, f] of Object.entries(athletes)) {
    if (!/^[a-z0-9_]+$/.test(id)) throw new Error(`id de atleta inválido: "${id}" (usa minúsculas, números y _)`);
    const c = creditsFor(f);
    if (c) credits.add(c);
    const sports: Record<string, Record<string, SportAnimEntry>> = {};
    const atlases: Record<string, PackEntry> = {};
    // la celda: la que se pidió para ese atleta, la de su ficha (un gigante va en 64) o la del kit
    const C = cells[id] ?? athletes[id].cell ?? cell;
    for (const pack of packs) {
      // vestuario por pack: la ficha puede traer una variante de ropa para este pack
      const fp = dressForPack(f, pack);
      const names = (opts.quick ? SPORT_PACKS[pack].slice(-2) : SPORT_PACKS[pack]).filter((a) => hasAnim(fp, a));
      const entries: Record<string, SportAnimEntry> = {};
      const frames: { name: string; raster: Raster }[] = [];
      for (const a of names) {
        const { clips, frames: n, side } = clips8(fp, C, a, views);
        const first = clips[0];
        const m = motionOf8(clips, 1, side);
        const entry: SportAnimEntry = { cuadros: n, fps: first.fps, loop: first.loop, ...m, ...(first.waterRows ? { agua: first.waterRows } : {}) };
        if (opts.atlas) {
          const blank = createRaster(C, C);
          clips.forEach((cl, r) => { for (let i = 0; i < n; i++) frames.push({ name: atlasFrameName(a, rows[r], i), raster: cl.frames[i] ?? blank }); });
        } else {
          const name = `atletas/${id}/${pack}/${a}.png`;
          files.push({ name, bytes: encodePng(sheetOf(clips, C, n)), mime: 'image/png' });
          entry.archivo = name;
        }
        if (fields.length) Object.assign(entry, frameDataOf(clips, fields));
        // el archivo va primero en el manifest, como siempre
        entries[a] = entry.archivo ? { archivo: entry.archivo, ...entry } : entry;
      }
      if (opts.atlas && frames.length) {
        const { png, json } = packAtlas(frames, C, `${pack}.png`, pivotOf(C));
        files.push({ name: `atletas/${id}/${pack}.png`, bytes: encodePng(png), mime: 'image/png' });
        files.push({ name: `atletas/${id}/${pack}.json`, bytes: enc.encode(JSON.stringify(json)), mime: 'application/json' });
        atlases[pack] = { atlas: `atletas/${id}/${pack}.json`, imagen: `atletas/${id}/${pack}.png`, anims: entries };
      } else if (!opts.atlas) sports[pack] = entries;
      log(`${id}/${pack}: ${names.length} animaciones`);
    }
    const entry: AthleteEntry = { nombre: f.name || id, celda: C, pivote: [C / 2, C - 2] };
    if (opts.atlas) entry.packs = atlases; else entry.deportes = sports;
    if (f.wardrobe) entry.vestuario = Object.fromEntries(packs.map((p) => [p, variantForPack(f, p) ?? 'ficha']));
    if (opts.retratos) {
      const sheet = portraitSheet(f);
      const archivo = `atletas/${id}/retratos.png`;
      files.push({ name: archivo, bytes: encodePng(sheet.png), mime: 'image/png' });
      entry.retratos = { archivo, chico: sheet.chico, grande: sheet.grande, expresiones: sheet.expresiones, escala_grande: PORTRAIT_BIG_SCALE };
    }
    if (opts.cabecitas) {
      entry.cabecita = `ui/cabecitas.png#${id}`;
      heads.push(headIcon(f));
    }
    out[id] = entry;
  }
  manifest.atletas = out;
  if (opts.retratos) manifest.retratos = 'retratos.png: arriba los chicos de 40 x 40 (el i en x = i * 40), abajo los grandes de 96 x 96 (el i en x = i * 96, y = 40), en el orden de `expresiones`. El grande es la cabeza y los hombros escalados x3 entero.';
  if (opts.cabecitas && heads.length) {
    files.push({ name: 'ui/cabecitas.png', bytes: encodePng(strip(heads, HEAD_ICON, HEAD_ICON)), mime: 'image/png' });
    manifest.cabecitas = { archivo: 'ui/cabecitas.png', celda: HEAD_ICON, orden: Object.keys(out) };
  }
  if (opts.objetos) {
    const { png, json, objetos } = buildObjectsAtlas(cell, 'armas.png');
    files.push({ name: 'objetos/armas.png', bytes: encodePng(png), mime: 'image/png' });
    files.push({ name: 'objetos/armas.json', bytes: enc.encode(JSON.stringify(json)), mime: 'application/json' });
    for (const o of Object.values(objetos)) o.atlas = 'objetos/armas.json';
    manifest.objetos = objetos;
    manifest.notas_objetos = 'objetos: armas del piso. Cuadros <id>_<anim>_<cuadro>. quieto: la base en el pivote de la celda (como un personaje). girando: centrado. mano (16 cuadros): el agarre en el centro de la celda, el cuadro k girado k * 22.5 grados (0 = como en el piso). Para dibujar el arma en la mano usa el dato `arma` [x, y, angulo, detras] de la animación: elige <id>_mano_<k> con k = round(angulo / 22.5) % 16 y pon el centro de la celda en (x, y) desde el pivote del personaje; si detras = 1, dibújala antes que al personaje.';
  }
  if (credits.size) {
    files.push({ name: 'CREDITOS.txt', bytes: enc.encode([...credits].join('\n\n')), mime: 'text/plain' });
    manifest.creditos = 'CREDITOS.txt';
  }
  // sin opciones nuevas el manifest sale byte a byte como antes; con datos por cuadro, los arreglos van en una línea
  const compact = fields.length > 0 || !!opts.atlas;
  files.push({ name: 'manifest.json', bytes: enc.encode(compact ? compactJson(manifest) : JSON.stringify(manifest, null, 1)), mime: 'application/json' });
  return files;
}
