import { personajeEscena, type Cuerpo, type Equipo } from './cuerpo';
import { pintarEscena, type Render, type V3 } from './render';
import { escalarPiezas } from './estudio';
import { RETRATO } from './retrato';
import { SEL_CUADROS, SEL_ENTRADA, SEL_FPS } from './figura';

/**
 * El grupo de horneo 'sel': los héroes de la selección de personaje (el menú de inicio), aparte del juego.
 *
 * - Al doble del tamaño de juego (el héroe mide ~150 px, la cabeza ~16 px: la cara lleva sus rasgos grandes).
 * - Con la luz de retrato (retrato.ts): principal cálida de 3/4, contraluz fría que recorta y relleno bajo y frío.
 * - La presentación cinematográfica de la clase (acción 'seleccion', seleccion.ts): 48 cuadros a 12 por segundo;
 *   0 a 11 la entrada (el gesto al ser elegido), 12 a 47 el bucle (empalma el 47 con el 12).
 * - Dirección 'so': de 3/4 frontal, la que muestra la cara, el pecho y el arma de perfil (en 's' el arma queda de canto).
 *
 * El juego arma la escena (fondo, niebla, fuego y cámara) y pinta estos cuadros encima, sin la sombra (lleva la suya).
 *
 * Llamada desde el horneado del juego (un trabajo por clase y nivel; cada cuadro se recorta como los demás grupos):
 *
 *   import { pintarSeleccion, SELECCION } from '<motor>/gotico/sel.ts';
 *   for (let f = 0; f < SELECCION.cuadros; f++) {
 *     const r = pintarSeleccion(heroe.cuerpo, heroe.niveles[nivel], f);   // { img, ancla }
 *     out.push(recortar(r.img, r.ancla[0], r.ancla[1]));
 *   }
 *   // manifiesto: man.sel['<clase>/<nivel>'] = cuadros; man.selm = SELECCION
 *
 * scripts/hornear-sel.mts hace lo mismo por su cuenta (atlas y manifiesto con el formato de los otros grupos).
 */
export const SELECCION = {
  cuadros: SEL_CUADROS,
  /** cuadros de la entrada (desde el 0); el bucle es del `entrada` al último */
  entrada: SEL_ENTRADA,
  fps: SEL_FPS,
  /** cuántas veces el tamaño de juego */
  escala: 2,
  dir: 'so' as const,
};

/** Un cuadro de la selección: el héroe ×2 con la luz de retrato, sin sombra, con el ancla en el origen (los pies). */
export function pintarSeleccion(cuerpo: Cuerpo, equipo: Equipo, f: number, o: { ss?: number; fijo?: { w: number; h: number; ax: number; ay: number } } = {}): Render {
  const k = SELECCION.escala;
  const e = personajeEscena(cuerpo, equipo, SELECCION.dir, 'seleccion', f, { detalle: 2 });
  const resplandor = e.resplandor ? { ...e.resplandor, c: e.resplandor.c.map((v) => v * k) as V3, r: e.resplandor.r * k } : undefined;
  return pintarEscena({ piezas: escalarPiezas(e.piezas, k), resplandor, luz: RETRATO, sinSombra: true, ss: o.ss }, {}, o.fijo);
}
