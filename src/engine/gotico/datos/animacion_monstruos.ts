import { REGISTRO } from '../objeto';
import { BESTIAS } from '../catalogo/bestias';
import { JEFES } from '../catalogo/jefes';
import { JEFES2 } from '../catalogo/jefes2';
import { BESTIAS67 } from '../catalogo/monstruos67';

/**
 * Las acciones horneadas de los monstruos que se arman en los catálogos propios (bestias, bestias de los actos 6 y 7, y
 * jefes a medida), con cuántos cuadros tiene cada una y en qué cuadro del ataque cae el golpe. Es un dato, no una
 * convención: el juego puede leerlo en vez de suponer los cuadros de los humanoides.
 *
 * - `impacto`: el índice del cuadro de 'atacar' en que el arma, el puño o la boca llegan (el que el juego tiene que
 *   mostrar en el instante del golpe). Hoy es 4 de 8 en todos, que es lo que hace `cuadroAtaque` de sensacion.ts
 *   (`round(n × 0,5)`, con el golpe a 0,55 de la acción): los cuadros 0 a 3 son la carga (el arma arriba en 1 a 3) y
 *   5 a 7 la salida.
 * - Una acción que no está no se horneó: el juego usa la de reemplazo (correr → caminar, herido → quieto).
 *
 * Las claves son los ids de sprite del juego (los jefes van como `jefe_<id>`). JSON gemelo: datos/animacion_monstruos.json
 * (un test los mantiene iguales).
 */
export interface AnimacionMonstruo { acciones: Record<string, number>; impacto: number }
const ACCIONES = ['quieto', 'caminar', 'correr', 'atacar', 'lanzar', 'herido', 'morir', 'especial'];
/** El cuadro del golpe en 'atacar' (de 8). */
export const IMPACTO_ATAQUE = 4;

function tabla(): Record<string, AnimacionMonstruo> {
  const t: Record<string, AnimacionMonstruo> = {};
  const fichas: [string, string][] = [...BESTIAS.map((b) => [b.id, `mon_${b.id}`] as [string, string]), ...BESTIAS67.map((b) => [b.id, `mon_${b.id}`] as [string, string]), ...[...JEFES, ...JEFES2].map((j) => [`jefe_${j.id}`, `jefe_${j.id}`] as [string, string])];
  for (const [sprite, pre] of fichas) {
    const acciones: Record<string, number> = {};
    for (const acc of ACCIONES) { const o = REGISTRO.find((x) => x.id === `${pre}_${acc}`); if (o) acciones[acc] = o.cuadros ?? 1; }
    t[sprite] = { acciones, impacto: IMPACTO_ATAQUE };
  }
  return t;
}

/** Acciones y cuadro del golpe de cada monstruo armado en los catálogos propios. */
export const ANIMACION_MONSTRUO: Record<string, AnimacionMonstruo> = tabla();
