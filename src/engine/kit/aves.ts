import { createRaster, blit, type Raster } from '../core/raster';
import { AVES } from '../rig/ave';
import { ANIMS_AVE } from '../anim/ave';
import { dibujarAve, caderaAve } from '../render/ave';

/**
 * Las aves en el kit (lote C7b), en la sección `animales` junto a Thor y los perros: cada ave en `animales/<id>.png`,
 * una tira con los cuadros de todas sus animaciones seguidas, de lado mirando a la derecha. El juego la espeja para la
 * izquierda. El ancla va en las patas y los eventos en el formato de siempre.
 */

/** Las aves que trae el motor (el juego las pide por id en `animales`, sin ficha). */
export const AVES_KIT = Object.keys(ANIMS_AVE);

export interface AveEntrada {
  nombre: string;
  tipo: 'ave';
  w: number;
  h: number;
  /** el pixel de las patas sobre el piso: el juego pone ahí el (x, y) del ave */
  ancla: [number, number];
  cuadros: number;
  vista: 'lado';
  anims: Record<string, { desde: number; cuadros: number; fps: number; loop: boolean; aire?: number[] }>;
  eventos?: Record<string, { tipo: string; cuadro: number }[]>;
}

const NOMBRES: Record<string, string> = { gallo: 'Gallo', paloma: 'Paloma' };

/** Arma la tira de un ave y su entrada del manifiesto. `aire`: cuántos pixeles sobre el ancla va el ave en cada cuadro (si sube). */
export function aveTira(id: string): { tira: Raster; entrada: AveEntrada } {
  const E = AVES[id], anims = ANIMS_AVE[id];
  if (!E || !anims) throw new Error(`no hay ave "${id}". Hay: ${AVES_KIT.join(', ')}`);
  const C = E.celda, cuadros: Raster[] = [];
  const entrada: AveEntrada = { nombre: NOMBRES[id] ?? id, tipo: 'ave', w: C, h: C, ancla: anclaAve(id), cuadros: 0, vista: 'lado', anims: {} };
  const eventos: NonNullable<AveEntrada['eventos']> = {};
  for (const a of anims) {
    const aire = a.poses.map((p) => Math.round(p.aire * (C / E.celda)));
    entrada.anims[a.nombre] = { desde: cuadros.length, cuadros: a.poses.length, fps: a.fps, loop: a.loop, ...(aire.some((v) => v) ? { aire } : {}) };
    if (a.eventos?.length) eventos[a.nombre] = a.eventos;
    for (const p of a.poses) cuadros.push(dibujarAve(id, p));
  }
  entrada.cuadros = cuadros.length;
  if (Object.keys(eventos).length) entrada.eventos = eventos;
  const tira = createRaster(C * cuadros.length, C);
  cuadros.forEach((c, i) => blit(tira, c, i * C, 0));
  return { tira, entrada };
}

/** El ancla: la cadera de la primera pose de pie, sobre el piso (fila celda - 2). */
export function anclaAve(id: string): [number, number] {
  const E = AVES[id];
  return [Math.round(caderaAve(id, ANIMS_AVE[id][0].poses[0])), E.celda - 2];
}

export const NOTA_AVES = 'Las aves (tipo "ave") van en una tira de cuadros de w x h, de lado mirando a la derecha: para la izquierda se espejan con el ancla. El cuadro i va en x = i * w; cada animación empieza en "desde" y dura "cuadros". El ancla es el pixel de las patas en el piso. Las animaciones se quedan en su sitio (el juego mueve al ave); "aire" dice cuántos pixeles sube el ave sobre el ancla en cada cuadro (el salto del gallo, el vuelo de la paloma). eventos: en qué cuadro pasa algo (el canto del gallo, el aleteo que suena).';
