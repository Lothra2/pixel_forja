import { createRaster, blit, type Raster } from '../core/raster';
import { encodePng } from '../export/png';
import { motionOf8 } from '../export/motion';
import { creditsFor, type ExportFile } from '../export/bundle';
import { renderClip, EIGHT_VIEWS, VIEW_SUFFIX, hasAnim, type RenderedClip, type ViewName } from '../render/clip';
import { viewsForRows, frameDataOf, objetosOf, PELOTAS, PELOTA_IDS, pivotOf, FRAME_DATA_FIELDS, type FrameData, type FrameDataField } from '../export/frameData';
import { packAtlas, atlasFrameName } from '../export/atlas';
import { portraitSheet, headIcon, HEAD_ICON } from './portraits';
import { dressForPack, dressWithUniform, variantForPack } from '../sheet/wardrobe';
import type { CellSize, HumanFicha, AnimalFicha } from '../sheet/ficha';
import { animsFor } from '../anim/registry';
import { buildComidaAtlas, COMIDA_CELDA, COMIDA_PIVOTE, type Comida } from '../render/comida';
import { familyFicha, FAMILY } from '../rpg/family';
import { heroFicha, heroCell, HEROES } from '../rpg/heroes';
import { ATHLETICS_PREMIUM } from '../anim/athletics';
import { SWIM_PREMIUM } from '../anim/swim';
import { NET_PREMIUM } from '../anim/net';
import { FIGHT_PREMIUM } from '../anim/fight';
import { FOOTBALL_PREMIUM } from '../anim/footballPremium';
import { BRAWL } from '../anim/brawl';
import { PELEA, duenoDe } from '../anim/pelea';
import { RECORRIDOS, TREPAR } from '../anim/recorridos';
import { buildObjectsAtlas, buildPelotasAtlas } from '../render/floorProps';
import type { FloorPropKind } from '../render/props';
import type { PropKind } from '../rig/pose';
import { bitmapFonts } from '../ui/fonts';

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
  /** la pelea del Kachinuki (lote P1): pisotón, lanzar, codazo, amague, cabezazo, comer, borde, burla y victoria propias */
  kachinuki: PELEA.map((a) => a.name),
  /** recorridos (lote B2): escalera, muro, colgarse, viga, correr agachado, bici rápida y caídas de bici y patineta */
  recorridos: RECORRIDOS.map((a) => a.name),
  /** trepar (lote B3): el poste y lo que se hace desde abajo, más el borde de la azotea */
  trepar: [...TREPAR.map((a) => a.name), 'edge_teeter', 'fall_off'],
} as const;
export type SportPack = keyof typeof SPORT_PACKS;
export const SPORT_PACK_NAMES = Object.keys(SPORT_PACKS) as SportPack[];
/** los deportes que salen si no se piden otros (los de siempre: la pelea callejera se pide con `calle`) */
export const DEFAULT_SPORT_PACKS = SPORT_PACK_NAMES.filter((p) => p !== 'calle' && p !== 'kachinuki' && p !== 'recorridos' && p !== 'trepar');

export interface SportsKitOptions {
  /** atletas por id (minúsculas, números y _). Sin esto, la familia con ropa de calle y los héroes */
  athletes?: Record<string, HumanFicha>;
  /** celda de un atleta en particular (Hulk va en 64); si no, la de su ficha (`cell`) o la del kit */
  cells?: Record<string, CellSize>;
  /** packs a exportar: los del kit deportivo o, con `packDefs`, los que ahí se definan */
  packs?: string[];
  /** packs a medida: nombre -> animaciones (el kit a medida los arma desde su configuración). Sin esto, SPORT_PACKS */
  packDefs?: Record<string, readonly string[]>;
  /** nombres propios del juego para animaciones del motor: { "burla_familia_gg": "burla_pulgar" }. Salen con el nombre del juego */
  alias?: Record<string, string>;
  /**
   * el equipo de cada atleta. Una animación (o un alias) que termina en `_<equipo>` solo se dibuja para los de ese
   * equipo, como `taunt_<id>` solo para su dueño
   */
  equipoDe?: Record<string, string>;
  /**
   * packs que salen sin las pelotas dibujadas (`sin_props` del kit a medida): el cuerpo queda igual, pixel a pixel, y
   * dónde iba cada pelota sale en el dato `objetos` de la animación
   */
  sinProps?: readonly string[];
  /** uniforme de cada pack (`vestuario` del kit a medida): pack -> uniforme de `UNIFORMES` */
  uniformes?: Record<string, string>;
  /** los colores de cada equipo (el cinturón del judogi sale de aquí) */
  coloresEquipo?: Record<string, string[]>;
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
  /** hoja de retratos por atleta: 8 expresiones en 40 x 40 y 96 x 96 */
  retratos?: boolean;
  /** cabecitas de 12 x 12 de todos los atletas en ui/cabecitas.png */
  cabecitas?: boolean;
  /** las armas del piso (pelea callejera) en objetos/armas.png + .json, con su entrada en `objetos`: todas o las de la lista */
  objetos?: boolean | FloorPropKind[];
  /** la comida de la pelea en objetos/comida.png + .json, con `peso: 'comida'` en `objetos`: toda o la de la lista */
  comida?: boolean | Comida[];
  /** animales (una mascota como Thor): todas sus animaciones en animales/<id>.png + .json, con su entrada en `animales` */
  animales?: Record<string, AnimalFicha>;
  /**
   * archivos de Silkscreen (normal y negrita): las fuentes bitmap (BMFont) en ui/fuentes/, con ñ, tildes y vietnamita,
   * y su entrada en `ui.fuentes`
   */
  fuentes?: { regular: ArrayBuffer; bold: ArrayBuffer };
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
  velocidad_natural?: number;
  elevacion?: number[];
  desplazamiento?: number[];
  rumbo?: string[];
  /** fila de la superficie del agua en cada cuadro (en pixeles desde arriba de la celda), o null */
  agua?: (number | null)[];
}

const enc = new TextEncoder();

/** Las animaciones de una hoja: una fila por vista pedida (8 si no se piden filas). */
function clips8(f: HumanFicha, cell: CellSize, anim: string, views: readonly ViewName[], sinPelotas = false): { clips: RenderedClip[]; frames: number; side?: RenderedClip } {
  const ro = sinPelotas ? { props: true, sinPelotas } : { props: true };
  const clips = views.map((v) => renderClip(f, cell, anim, v, ro));
  // el avance y los eventos se miden de lado: si las filas pedidas no lo traen, se dibuja aparte solo para medir
  const side = views.includes('side') ? undefined : renderClip(f, cell, anim, 'side', ro);
  return { clips, frames: Math.max(...clips.map((c) => c.frames.length)), side };
}

/** Hoja: fila = dirección (orden de `direcciones`), columna = cuadro. */
function sheetOf(clips: RenderedClip[], cell: CellSize, n: number): Raster {
  const png = createRaster(n * cell, clips.length * cell);
  clips.forEach((c, row) => c.frames.forEach((fr, i) => blit(png, fr, i * cell, row * cell)));
  return png;
}

/** La nota del manifiesto para los packs sin pelotas. */
export const NOTA_SIN_PROPS = (packs: readonly string[]): string =>
  `sin_props (${packs.join(', ')}): estos packs salen sin las pelotas dibujadas, porque el juego las mueve con su física. El cuerpo es el mismo, pixel a pixel, que en un pack con pelota. Lo que va agarrado (raqueta, bate, garrocha, jabalina) sí sale dibujado. objetos: [fila][cuadro] = lista de { tipo, clase, x, y, r, detras } o null si en ese cuadro no hay pelota. tipo = "pelota", clase = ${Object.values(PELOTAS).join(', ')}. x, y = centro exacto desde el pivote (puede caer en medio pixel), r = radio sin el contorno, detras = 1 si iba detrás del cuerpo. Al espejar, x pasa a -x. pelotas: cada pelota quitada, dibujada igual, en objetos/pelotas.json (cuadro <id>_<celda>, con su contorno y el pivote en el centro exacto): se pone en (x, y) de objetos.`;

/** ¿Se escribe en una sola línea? Los arreglos de números (y de arreglos de números): cajas, manos, agua... */
const inline = (v: unknown): boolean => Array.isArray(v) && v.every((x) => x === null || typeof x !== 'object' || inline(x));

/** JSON con sangría de 1 como siempre, pero con los arreglos de números en una línea (los datos por cuadro pesan 5 veces menos). */
export function compactJson(v: unknown, ind = ''): string {
  if (v === null || typeof v !== 'object' || inline(v)) return JSON.stringify(v);
  const n = ind + ' ';
  if (Array.isArray(v)) return v.length ? `[\n${v.map((x) => n + compactJson(x, n)).join(',\n')}\n${ind}]` : '[]';
  const es = Object.entries(v).filter(([, x]) => x !== undefined);
  // `objetos` de una animación ([fila][cuadro] = lista de objetos o null): una fila por línea, como los demás datos por cuadro
  const rows = (k: string, x: unknown) => k === 'objetos' && Array.isArray(x) && x.every(Array.isArray)
    ? `[\n${x.map((r) => n + ' ' + JSON.stringify(r)).join(',\n')}\n${n}]` : compactJson(x, n);
  return es.length ? `{\n${es.map(([k, x]) => `${n}${JSON.stringify(k)}: ${rows(k, x)}`).join(',\n')}\n${ind}}` : '{}';
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
  const defs: Record<string, readonly string[]> = opts.packDefs ?? SPORT_PACKS;
  const packs = opts.packs ?? (opts.packDefs ? Object.keys(opts.packDefs) : DEFAULT_SPORT_PACKS);
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
      'eventos: en qué cuadro cae cada paso, golpe (impacto), despegue, suelta (pelota, bala, jabalina, hechizo), aterrizaje y brazada (la mano entra al agua).',
      'avance: pixeles que avanza el cuerpo en un ciclo sin patinar. Ritmo = velocidad_del_juego * cuadros / (avance * fps).',
      'elevacion: pixeles que el juego sube el sprite en cada cuadro (saltos que no caben en la celda); la sombra queda en el piso.',
      'agua: fila de la superficie en la celda; el juego puede dibujar su piscina detrás y el nadador ya trae el tinte y las gotas.',
      'desplazamiento: en las acciones que avanzan (salto largo, clavado, remate), pixeles que el juego mueve el sprite hacia donde mira, acumulados desde el primer cuadro.',
      'rumbo: en las pruebas de campo, de frente y de espalda se dibuja la diagonal más cercana; rumbo dice hacia dónde moverlo en cada fila.',
      ...(fields.length ? ['cajas, manos, cabeza y pies: [fila][cuadro], en pixeles desde el pivote con y hacia abajo. cajas = [x, y, w, h] de lo opaco (null si el cuadro está vacío); manos y pies = [[x, y] cerca, [x, y] lejos].'] : []),
      ...(opts.sinProps?.some((p) => packs.includes(p)) ? [NOTA_SIN_PROPS(opts.sinProps.filter((p) => packs.includes(p)))] : []),
      ...(opts.atlas ? ['packs: un atlas por pack (JSON Hash de TexturePacker, para this.load.atlas de Phaser). Cada cuadro se llama <anim>_<fila>_<cuadro>, con la fila por nombre (right, down...) y el cuadro desde 0.'] : []),
    ],
  };
  type PackEntry = { atlas: string; imagen: string; anims: Record<string, SportAnimEntry> };
  type AthleteEntry = {
    nombre: string; celda: number; pivote: [number, number];
    deportes?: Record<string, Record<string, SportAnimEntry>>; packs?: Record<string, PackEntry>;
    vestuario?: Record<string, string>; retratos?: Record<string, unknown>; cabecita?: string; numero?: string;
  };
  const out: Record<string, AthleteEntry> = {};
  const heads: Raster[] = [];
  // las pelotas que quitaron los packs sin_props, en cada celda (`<kind>:<celda>`): salen sueltas en objetos/pelotas.png
  const pelotasUsadas = new Set<string>();
  const ids = Object.keys(athletes);
  const equipos = [...new Set(Object.values(opts.equipoDe ?? {}))];
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
      const eq = opts.equipoDe?.[id];
      const fp = opts.uniformes?.[pack] ? dressWithUniform(f, pack, opts.uniformes[pack], eq ? opts.coloresEquipo?.[eq] : undefined) : dressForPack(f, pack);
      const all = defs[pack] ?? [];
      // las propias de otro atleta (`taunt_kenji` en Rick) no se dibujan: cada uno trae solo las suyas
      const real = (a: string) => opts.alias?.[a] ?? a;
      const names = (opts.quick ? all.slice(-2) : all).filter((a) => hasAnim(fp, real(a)) && (duenoDe(a, ids) ?? id) === id && (duenoDe(a, equipos) ?? opts.equipoDe?.[id]) === opts.equipoDe?.[id]);
      const entries: Record<string, SportAnimEntry> = {};
      const frames: { name: string; raster: Raster }[] = [];
      for (const a of names) {
        const sinP = !!opts.sinProps?.includes(pack);
        const { clips, frames: n, side } = clips8(fp, C, real(a), views, sinP);
        const first = clips[0];
        const m = motionOf8(clips, 1, side, { velocidadNatural: false });
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
        // sin pelotas: dónde iba cada una, aunque no se pidan datos por cuadro (sin esto la pelota se pierde)
        if (sinP) {
          Object.assign(entry, objetosOf(clips));
          for (const c of clips) for (const bs of c.balls ?? []) for (const b of bs) pelotasUsadas.add(`${b.kind}:${C}`);
        }
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
    // el número de la camiseta, para el HUD (de espalda el pelo largo lo puede tapar)
    if (f.outfit.number) entry.numero = f.outfit.number;
    if (opts.atlas) entry.packs = atlases; else entry.deportes = sports;
    // la ropa de cada pack: la variante de la ficha, el uniforme del pack (judogi) o la de la ficha
    if (f.wardrobe || packs.some((p) => opts.uniformes?.[p])) entry.vestuario = Object.fromEntries(packs.map((p) => [p, variantForPack(f, p) ?? opts.uniformes?.[p] ?? 'ficha']));
    if (opts.retratos) {
      const sheet = portraitSheet(f);
      const archivo = `atletas/${id}/retratos.png`;
      files.push({ name: archivo, bytes: encodePng(sheet.png), mime: 'image/png' });
      entry.retratos = { archivo, chico: sheet.chico, grande: sheet.grande, expresiones: sheet.expresiones, escala_grande: 1 };
    }
    if (opts.cabecitas) {
      entry.cabecita = `ui/cabecitas.png#${id}`;
      heads.push(headIcon(f));
    }
    out[id] = entry;
  }
  manifest.atletas = out;
  // girado (seoi nage): solo si alguna animación lo trae, así los kits sin judo salen iguales
  if (JSON.stringify(out).includes('"girado":')) (manifest.notas as string[]).push('girado: [cuadro] true o false. En los cuadros con true el sprite viene dibujado mirando al otro lado: el juego lo espeja (flipX al revés de como esté) junto con sus datos de ese cuadro (x pasa a -x; en cajas y cuerpo, x pasa a -(x + w)). Si el último cuadro está girado, el personaje termina mirando al otro lado.');
  if (pelotasUsadas.size) {
    // en el orden de PELOTAS y de menor a mayor celda
    const kinds = Object.keys(PELOTAS) as PropKind[];
    const pares = [...pelotasUsadas].map((k) => { const [kind, c] = k.split(':'); return { kind: kind as PropKind, cell: Number(c), id: PELOTA_IDS[PELOTAS[kind as PropKind]!] }; })
      .sort((a, b) => kinds.indexOf(a.kind) - kinds.indexOf(b.kind) || a.cell - b.cell);
    const { png, json } = buildPelotasAtlas(pares);
    files.push({ name: 'objetos/pelotas.png', bytes: encodePng(png), mime: 'image/png' });
    files.push({ name: 'objetos/pelotas.json', bytes: enc.encode(JSON.stringify(json)), mime: 'application/json' });
    const pelotas: Record<string, { clase: string; atlas: string; cuadros: Record<string, string> }> = {};
    for (const p of pares) {
      pelotas[p.id] ??= { clase: PELOTAS[p.kind]!, atlas: 'objetos/pelotas.json', cuadros: {} };
      pelotas[p.id].cuadros[String(p.cell)] = `${p.id}_${p.cell}`;
    }
    manifest.pelotas = pelotas;
  }
  if (opts.retratos) manifest.retratos = 'retratos.png: arriba los chicos de 40 x 40 (el i en x = i * 40), abajo los grandes de 96 x 96 (el i en x = i * 96, y = 40), en el orden de `expresiones`. El grande es la cabeza y los hombros redibujados a 96, con contorno de un pixel (escala_grande 1: ya no es el sprite x3).';
  if (opts.cabecitas && heads.length) {
    files.push({ name: 'ui/cabecitas.png', bytes: encodePng(strip(heads, HEAD_ICON, HEAD_ICON)), mime: 'image/png' });
    manifest.cabecitas = { archivo: 'ui/cabecitas.png', celda: HEAD_ICON, orden: Object.keys(out) };
  }
  if (opts.objetos) {
    const { png, json, objetos } = buildObjectsAtlas(cell, 'armas.png', Array.isArray(opts.objetos) ? opts.objetos : undefined);
    files.push({ name: 'objetos/armas.png', bytes: encodePng(png), mime: 'image/png' });
    files.push({ name: 'objetos/armas.json', bytes: enc.encode(JSON.stringify(json)), mime: 'application/json' });
    for (const o of Object.values(objetos)) o.atlas = 'objetos/armas.json';
    manifest.objetos = objetos;
    manifest.notas_objetos = 'objetos: armas del piso. Cuadros <id>_<anim>_<cuadro>. quieto: la base en el pivote de la celda (como un personaje). girando: centrado. mano (16 cuadros): el agarre en el centro de la celda, el cuadro k girado k * 22.5 grados (0 = como en el piso). Para dibujar el arma en la mano usa el dato `arma` [x, y, angulo, detras] de la animación: elige <id>_mano_<k> con k = round(angulo / 22.5) % 16 y pon el centro de la celda en (x, y) desde el pivote del personaje; si detras = 1, dibújala antes que al personaje.';
  }
  if (opts.comida) {
    const { png, json, objetos } = buildComidaAtlas('comida.png', Array.isArray(opts.comida) ? opts.comida : undefined);
    files.push({ name: 'objetos/comida.png', bytes: encodePng(png), mime: 'image/png' });
    files.push({ name: 'objetos/comida.json', bytes: enc.encode(JSON.stringify(json)), mime: 'application/json' });
    for (const o of Object.values(objetos)) o.atlas = 'objetos/comida.json';
    // van después de las armas: el primer objeto sigue siendo un arma
    manifest.objetos = { ...((manifest.objetos as Record<string, unknown>) ?? {}), ...objetos };
    manifest.notas_comida = `comida: objetos con peso "comida" en su propio atlas (objetos/comida.json, celdas de ${COMIDA_CELDA}). Cuadros <id>_quieto_0 y <id>_humito_0..3 (en bucle a 6 fps), con la base en el pivote (${COMIDA_PIVOTE.join(', ')}) y su sombra ya dibujada. \`cura\` va de 1 a 3. Se come con la animación eat: el evento impacto marca el mordisco.`;
  }
  if (opts.animales && Object.keys(opts.animales).length) {
    // las mascotas: un atlas por animal con todas sus animaciones, en las mismas filas que los atletas
    const animals: Record<string, unknown> = {};
    for (const [id, f] of Object.entries(opts.animales)) {
      if (!/^[a-z0-9_]+$/.test(id)) throw new Error(`id de animal inválido: "${id}" (usa minúsculas, números y _)`);
      const entries: Record<string, SportAnimEntry> = {};
      const frames: { name: string; raster: Raster }[] = [];
      const blank = createRaster(cell, cell);
      for (const a of animsFor(f).map((x) => x.name)) {
        const clips = views.map((v) => renderClip(f, cell, a, v, {}));
        const side = views.includes('side') ? undefined : renderClip(f, cell, a, 'side', {});
        const n = Math.max(...clips.map((c) => c.frames.length));
        clips.forEach((cl, r) => { for (let i = 0; i < n; i++) frames.push({ name: atlasFrameName(a, rows[r], i), raster: cl.frames[i] ?? blank }); });
        const entry: SportAnimEntry = { cuadros: n, fps: clips[0].fps, loop: clips[0].loop, ...motionOf8(clips, 1, side, { velocidadNatural: false }) };
        if (fields.length) Object.assign(entry, frameDataOf(clips, fields));
        entries[a] = entry;
      }
      const { png, json } = packAtlas(frames, cell, `${id}.png`, pivotOf(cell));
      files.push({ name: `animales/${id}.png`, bytes: encodePng(png), mime: 'image/png' });
      files.push({ name: `animales/${id}.json`, bytes: enc.encode(JSON.stringify(json)), mime: 'application/json' });
      animals[id] = { nombre: f.name || id, celda: cell, pivote: [cell / 2, cell - 2], atlas: `animales/${id}.json`, imagen: `animales/${id}.png`, anims: entries };
      log(`animal ${id}: ${Object.keys(entries).length} animaciones`);
    }
    manifest.animales = animals;
  }
  if (opts.fuentes) {
    const fuentes: Record<string, unknown> = {};
    for (const f of bitmapFonts(opts.fuentes.regular, opts.fuentes.bold)) {
      files.push({ name: `ui/fuentes/${f.name}.png`, bytes: encodePng(f.png), mime: 'image/png' });
      files.push({ name: `ui/fuentes/${f.name}.fnt`, bytes: enc.encode(f.fnt), mime: 'application/xml' });
      fuentes[f.name] = { png: `ui/fuentes/${f.name}.png`, fnt: `ui/fuentes/${f.name}.fnt`, alto_linea: f.lineHeight, base: f.base };
    }
    manifest.ui = { fuentes: { ...fuentes, notas: 'BMFont XML: this.load.bitmapFont(nombre, png, fnt). fuente_ui (8 px, blanca con sombra, se tiñe con setTint; usar escala entera x2 o x3), fuente_titulo y fuente_titulo_plata (16 px, ya pintadas). Tienen ñ, tildes, ¡, ¿ y todas las letras del vietnamita (ă, â, ê, ô, ơ, ư, đ y los 5 tonos). Las marcas dobles de la breve con tono (ắ) y del circunflejo con tilde (ẫ) suben 2 pixeles de fuente por encima de la línea.' } };
    credits.add('Fuentes: Silkscreen, de Jason Kottke. SIL Open Font License 1.1 (https://openfontlicense.org).');
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
