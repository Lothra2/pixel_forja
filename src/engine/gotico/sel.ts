import { personajeEscena, type Cuerpo, type Equipo } from './cuerpo';
import { pintarEscena, esferaDe, type Pieza, type Render, type V3 } from './render';
import { MATERIALES } from './materiales';
import { escalarPiezas } from './estudio';
import { RETRATO } from './retrato';
import { SEL_CUADROS, SEL_ENTRADA, SEL_FPS } from './figura';

/**
 * El grupo de horneo 'sel': los héroes de la selección de personaje (el menú de inicio), aparte del juego.
 *
 * - A 2,5 veces el tamaño de juego (el héroe mide ~195 px, la cabeza ~20 px: la cara lleva sus rasgos grandes); el
 *   juego lo dibuja a ×1.
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
  /** cuántas veces el tamaño de juego: 2,5 deja al héroe en ~195 px, que el juego dibuja a ×1 en el iPad 11 */
  escala: 2.5,
  dir: 'so' as const,
};

/** Un cuadro de la selección: el héroe ×2,5 con la luz de retrato, sin sombra, con el ancla en el origen (los pies). */
export function pintarSeleccion(cuerpo: Cuerpo, equipo: Equipo, f: number, o: { ss?: number; fijo?: { w: number; h: number; ax: number; ay: number } } = {}): Render {
  const k = SELECCION.escala;
  const e = personajeEscena(cuerpo, equipo, SELECCION.dir, 'seleccion', f, { detalle: 2 });
  // (el resplandor del encantamiento, contenido: solo alrededor del filo, no tiñe el arma entera)
  const resplandor = e.resplandor ? { ...e.resplandor, c: e.resplandor.c.map((v) => v * k) as V3, r: e.resplandor.r * k * 0.55 } : undefined;
  const luz = { ...RETRATO, expo: (RETRATO.expo ?? 1) * exposicion(cuerpo, equipo, resplandor) };
  return pintarEscena({ piezas: escalarPiezas(contenido(e.piezas), k), resplandor, luz, sinSombra: true, ss: o.ss }, {}, o.fijo);
}

/**
 * La exposición de cada retrato, como el fotógrafo con cada modelo: la misma luz deja al templario de placa y tabardo
 * blanco casi sin sombra y al nigromante de negro casi sin luz. Se calibra una vez por héroe y equipo (en el cuadro de
 * reposo) para que el lado opuesto a la fogata quede en sombra profunda en la proporción buscada (~57 % del cuerpo con
 * luminancia < 0,18 después del screen del juego), y se usa igual en los 48 cuadros.
 */
export const SOMBRA_OBJETIVO = 0.57;
const expos = new WeakMap<Equipo, number>();
function exposicion(cuerpo: Cuerpo, equipo: Equipo, resplandor?: { c: V3; r: number; color: string }): number {
  const c = expos.get(equipo);
  if (c !== undefined) return c;
  const k = SELECCION.escala, e = personajeEscena(cuerpo, equipo, SELECCION.dir, 'seleccion', SELECCION.entrada + 6, { detalle: 2 });
  const piezas = escalarPiezas(contenido(e.piezas).filter((p) => !MATERIALES[p.mat]?.emite), k);
  const sombra = (x: number) => {
    const img = pintarEscena({ piezas, resplandor, luz: { ...RETRATO, expo: (RETRATO.expo ?? 1) * x }, sinSombra: true, ss: 1 }).img;
    let n = 0, o = 0;
    for (let i = 0; i < img.data.length; i += 4) {
      if (!img.data[i + 3]) continue;
      const v = (j: number) => { const q = img.data[i + j] / 255; return q * (2 - q); };
      n++; if (0.2126 * v(0) + 0.7152 * v(1) + 0.0722 * v(2) < 0.18) o++;
    }
    return o / Math.max(1, n);
  };
  // más exposición, menos sombra: búsqueda en escala logarítmica entre ×0,5 y ×2,2
  let lo = Math.log(0.5), hi = Math.log(2.2);
  for (let i = 0; i < 6; i++) { const m = (lo + hi) / 2; if (sombra(Math.exp(m)) > SOMBRA_OBJETIVO) lo = m; else hi = m; }
  const x = Math.exp((lo + hi) / 2);
  expos.set(equipo, x);
  return x;
}
/**
 * El encantamiento contenido: en el retrato, las chispas sueltas del rayo y de la luz santa (puntos blancos que
 * tapaban la mano y la cara) se van; queda el brillo del filo, la cuerda o la punta.
 */
const CHISPA = new Set(['cu_rayo', 'ar_rayo', 'cu_luz_santa', 'cu_ojo_hielo']);
function contenido(ps: Pieza[]): Pieza[] {
  // (los rayos y las chispas son tramos cortos: se van; el filo largo del arma queda)
  return ps.filter((p) => {
    if (p.k === 'masa' || !MATERIALES[p.mat]?.emite) return true;
    const r = esferaDe(p)[3];
    return !((CHISPA.has(p.mat) && r < 4) || r < 0.55);
  });
}
