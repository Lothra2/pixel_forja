import { renderClip } from '../render/clip';
import { createRaster, blit, type Raster } from '../core/raster';
import { humanAnim } from '../anim/registry';
import type { HumanFicha } from '../sheet/ficha';
import type { CellSize } from '../sheet/ficha';

/**
 * La gente de la calle en el kit (lote C6a): cada NPC sale en `npc/<id>.png`, una tira con todos los cuadros de sus
 * animaciones seguidas, de frente o en 3/4 hacia la calle (sin espejo), o de lado para el que camina de un lado al otro. Un grupo (los músicos) va en un solo sprite,
 * uno al lado del otro y con el parlante. La pelota del fútbol de la calle va aparte, chiquita y girando.
 */

/**
 * Cómo se ve cada animación: de frente, en 3/4 hacia la calle, de espaldas (el grafitero contra su muro) o de lado,
 * mirando a la derecha (lote E5: la Marimonda que cruza la calle; el juego la espeja para ir a la izquierda).
 */
export type VistaNpc = 'frente' | 'tres_cuartos' | 'espalda' | 'espalda_tres_cuartos' | 'lado';
export const VISTAS_NPC: readonly VistaNpc[] = ['frente', 'tres_cuartos', 'espalda', 'espalda_tres_cuartos', 'lado'];
const VISTA: Record<VistaNpc, 'front' | 'se' | 'back' | 'ne' | 'side'> = { frente: 'front', tres_cuartos: 'se', espalda: 'back', espalda_tres_cuartos: 'ne', lado: 'side' };

export interface NpcDef {
  /** la ficha (por nombre de archivo en la carpeta de NPC). Por defecto, el id */
  ficha?: string;
  /** sus animaciones: una lista de nombres del motor, o { nombre_en_el_juego: animación_del_motor } */
  anims?: string[] | Record<string, string>;
  /** la vista de todas sus animaciones (frente por defecto) */
  vista?: VistaNpc;
  /** la vista de alguna animación en particular */
  vistas?: Record<string, VistaNpc>;
  /** un grupo en un solo sprite: { ficha: { nombre_en_el_juego: animación_del_motor } }, uno al lado del otro */
  grupo?: Record<string, Record<string, string>>;
  /** el parlante en el piso al lado del grupo, que late con la música */
  parlante?: boolean;
}

export interface NpcConfig {
  /** carpeta con las fichas de los NPC (*.ficha.json), relativa al kit.config.json. No son atletas */
  fichas?: string;
  personajes: Record<string, NpcDef>;
  /** la pelota de la calle: 8 x 8 con 4 cuadros de giro */
  pelota?: boolean;
}

export interface NpcEntrada {
  archivo: string;
  w: number;
  h: number;
  /** el pixel de los pies en el cuadro: el juego pone ahí el (x, y) del NPC */
  ancla: [number, number];
  cuadros: number;
  anims: Record<string, { desde: number; cuadros: number; fps: number; loop: boolean; vista: VistaNpc }>;
  /** por animación: en qué cuadro pasa cada cosa (la patada que suelta la pelota) */
  eventos?: Record<string, { tipo: string; cuadro: number }[]>;
  /** los del grupo, de izquierda a derecha */
  grupo?: string[];
}

/** Las animaciones de un NPC como pares [nombre en el juego, animación del motor]. */
function animsDe(d: NpcDef): [string, string][] {
  if (!d.anims) return [];
  return Array.isArray(d.anims) ? d.anims.map((a) => [a, a]) : Object.entries(d.anims);
}

/** El parlante de pie: caja negra con dos conos; en los cuadros de golpe el cono grande se infla. */
function parlante(r: Raster, x: number, piso: number, golpe: boolean) {
  const w = 14, h = 20, y = piso - h;
  const set = (px: number, py: number, c: [number, number, number]) => { if (px < 0 || py < 0 || px >= r.w || py >= r.h) return; r.data.set([...c, 255], (py * r.w + px) * 4); };
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, i === 0 || j === 0 || i === w - 1 || j === h - 1 ? [30, 20, 24] : i === 1 ? [74, 70, 80] : [46, 42, 50]);
  const cono = (cx: number, cy: number, rad: number) => {
    for (let j = -rad; j <= rad; j++) for (let i = -rad; i <= rad; i++) { const d = Math.hypot(i, j); if (d <= rad) set(cx + i, cy + j, d > rad - 1 ? [30, 20, 24] : d < 1.2 ? [190, 186, 196] : [100, 96, 108]); }
  };
  cono(x + 7, y + 5, 2);
  cono(x + 7, y + 13, golpe ? 5 : 4);
  // las ondas del sonido en el golpe
  if (golpe) for (const k of [7, 9]) for (let j = -3; j <= 3; j++) set(x + w + k - Math.abs(j) / 2, y + 13 + j, [245, 201, 60]);
}

/**
 * Arma un NPC: los cuadros de cada animación en su vista, en una tira. Devuelve null (con el porqué) si falta la ficha
 * o una animación.
 */
export function npcTira(id: string, d: NpcDef, fichas: Record<string, HumanFicha>, cell: CellSize): { tira: Raster; entrada: Omit<NpcEntrada, 'archivo'> } | string {
  const C = cell;
  const premium = (f: HumanFicha): HumanFicha => ({ ...f, movementProfile: 'premium' });
  const vistaDe = (nombre: string): VistaNpc => d.vistas?.[nombre] ?? d.vista ?? 'frente';
  const cuadros: Raster[] = [];
  const anims: NpcEntrada['anims'] = {};
  const eventos: NonNullable<NpcEntrada['eventos']> = {};
  let w = C;
  const extra = d.parlante ? 26 : 0;
  if (d.grupo) {
    // el grupo: cada uno en su celda, encimados un poco, y el parlante a la derecha
    const miembros = Object.entries(d.grupo);
    for (const [fid] of miembros) if (!fichas[fid]) return `npc.${id}: no hay ficha "${fid}" en la carpeta de NPC`;
    const nombres = [...new Set(miembros.flatMap(([, m]) => Object.keys(m)))];
    const paso = Math.round(C * 0.62);
    w = paso * (miembros.length - 1) + C + extra;
    for (const nombre of nombres) {
      const clips = miembros.map(([fid, m]) => {
        const a = m[nombre];
        if (!a || !humanAnim(a)) return null;
        return renderClip(premium(fichas[fid]), C, a, VISTA[vistaDe(nombre)], { props: true });
      });
      if (clips.some((c) => !c)) return `npc.${id}: la animación "${nombre}" no existe para todos los del grupo`;
      const n = Math.max(...clips.map((c) => c!.frames.length));
      anims[nombre] = { desde: cuadros.length, cuadros: n, fps: clips[0]!.fps, loop: clips[0]!.loop, vista: vistaDe(nombre) };
      for (let k = 0; k < n; k++) {
        const r = createRaster(w, C);
        // de atrás para adelante: el de la izquierda queda detrás
        clips.forEach((c, i) => blit(r, c!.frames[c!.loop ? k % c!.frames.length : Math.min(k, c!.frames.length - 1)], i * paso, 0));
        if (d.parlante) parlante(r, w - extra + 6, C - 2, nombre !== 'animar' ? k % 2 === 0 : k === 1);
        cuadros.push(r);
      }
    }
    return { tira: tira(cuadros, w, C), entrada: { w, h: C, ancla: [Math.round(C / 2), C - 2], cuadros: cuadros.length, anims, grupo: miembros.map(([f]) => f) } };
  }
  const f = fichas[d.ficha ?? id];
  if (!f) return `npc.${id}: no hay ficha "${d.ficha ?? id}" en la carpeta de NPC`;
  for (const [nombre, a] of animsDe(d)) {
    const def = humanAnim(a);
    if (!def) return `npc.${id}: la animación "${a}" no existe`;
    const c = renderClip(premium(f), C, a, VISTA[vistaDe(nombre)], { props: true });
    anims[nombre] = { desde: cuadros.length, cuadros: c.frames.length, fps: c.fps, loop: c.loop, vista: vistaDe(nombre) };
    if (def.events?.length) eventos[nombre] = def.events.map((e) => ({ tipo: e.type, cuadro: Math.min(c.frames.length - 1, Math.floor(e.phase * c.frames.length + 1e-6)) }));
    cuadros.push(...c.frames);
  }
  return { tira: tira(cuadros, w, C), entrada: { w, h: C, ancla: [Math.round(C / 2), C - 2], cuadros: cuadros.length, anims, ...(Object.keys(eventos).length ? { eventos } : {}) } };
}

function tira(cuadros: Raster[], w: number, h: number): Raster {
  const r = createRaster(w * cuadros.length, h);
  cuadros.forEach((c, i) => blit(r, c, i * w, 0));
  return r;
}

/** La pelota de la calle: 8 x 8, blanca con los parches negros, 4 cuadros de giro. */
export function pelotaTira(): Raster {
  const r = createRaster(32, 8);
  const parches = [[[3, 2], [4, 2], [3, 3]], [[5, 3], [5, 4], [4, 4]], [[4, 5], [3, 5], [4, 4]], [[2, 4], [2, 3], [3, 4]]];
  for (let k = 0; k < 4; k++) {
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
      const d = Math.hypot(i - 3.5, j - 3.5);
      if (d > 3.6) continue;
      const c: [number, number, number] = d > 2.9 ? [30, 20, 24] : i + j < 6 ? [255, 250, 240] : [212, 205, 196];
      r.data.set([...c, 255], (j * 32 + k * 8 + i) * 4);
    }
    for (const [i, j] of parches[k]) r.data.set([46, 42, 50, 255], (j * 32 + k * 8 + i) * 4);
  }
  return r;
}
