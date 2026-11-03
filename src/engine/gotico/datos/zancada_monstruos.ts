import { zancada } from '../figura';
import { MONSTRUOS } from '../catalogo/personajes';
import { ZANCADA_BESTIA } from '../catalogo/bestias';
import { ZANCADA_JEFE } from '../catalogo/jefes';

/**
 * Zancada de caminar de los monstruos del acto 1 (y del escorpión de las dunas del acto 2), en casillas del piso por ciclo completo de caminar (8 cuadros) y a
 * escala 1: la misma convención que `ZANCADA.caminar` del juego para los héroes (`zancada('caminar') / 16`, una casilla
 * mide 16 unidades del mundo). El juego pone la animación de caminar a `velocidad / (ZANCADA_MONSTRUO[sprite] × escala)`
 * ciclos por segundo y los pies quedan plantados.
 *
 * Las claves son los ids de sprite del juego (los jefes van como `jefe_<id>`). Los humanoides salen de la pisada de
 * figura.ts por su alto; las bestias y el verdugo, del paso de sus patas (catalogo/bestias.ts y jefes.ts). Los que no
 * pisan (la gárgola y el murciélago vuelan, la abadesa flota) no tienen pies que patinen: su valor es el ritmo del
 * aleteo o del vaivén que se ve bien a su velocidad.
 *
 * El juego puede importar `ZANCADA_MONSTRUO` desde acá o el JSON gemelo `datos/zancada_monstruos.json` (un test los
 * mantiene iguales).
 */
const CASILLA = 16;
const redondo = (v: number) => Math.round(v * 1000) / 1000;

/** Humanoides del acto 1 que arma el motor (catalogo/personajes.ts): pisan como los héroes, a su alto. */
const HUMANOS_ACTO1 = ['zombi', 'necrofago', 'bandido', 'penitente', 'esqueleto', 'esqueleto_arquero', 'aparecida', 'cultista', 'sin_rostro', 'guardia_corrupto',
  'caballero_muerto', 'ballestero_oscuro', 'desollado', 'sacerdote_caido', 'ogro', 'carcelero'];
/** Humanoides propios del juego (hornear_extra.ts) armados con cuerpos del motor de alto 1. */
const HUMANOS_JUEGO: Record<string, number> = { monja_hueca: 1, ahogado: 1 };
const BESTIAS_ACTO1 = ['lobo_sombrio', 'arana_cueva', 'arana_reina', 'cangrejo_cripta'];
/** Bestias de otros actos que el juego también hace caminar con su zancada (el escorpión de las dunas, acto 2). */
const BESTIAS_OTRAS = ['escorpion_gigante'];
/** Los que no pisan: ritmo de aleteo (la gárgola bate una vez por ciclo, el murciélago dos) y vaivén de la abadesa. */
const SIN_PISADA: Record<string, number> = { gargola: 1.7, murcielago_gigante: 2.4, jefe_abadesa: 3.8 };

function tabla(): Record<string, number> {
  const t: Record<string, number> = {};
  for (const id of HUMANOS_ACTO1) {
    const m = MONSTRUOS.find((x) => x.id === id);
    if (!m) throw new Error(`zancada: falta el monstruo ${id}`);
    t[id] = redondo(zancada('caminar', m.cuerpo.alto ?? 1) / CASILLA);
  }
  for (const [id, alto] of Object.entries(HUMANOS_JUEGO)) t[id] = redondo(zancada('caminar', alto) / CASILLA);
  for (const id of [...BESTIAS_ACTO1, ...BESTIAS_OTRAS]) t[id] = redondo(ZANCADA_BESTIA[id] / CASILLA);
  t.jefe_verdugo = redondo(ZANCADA_JEFE.jefe_verdugo / CASILLA);
  Object.assign(t, SIN_PISADA);
  return t;
}

/** Casillas por ciclo de caminar (8 cuadros) de cada monstruo del acto 1 (y del escorpión del acto 2), a escala 1. */
export const ZANCADA_MONSTRUO: Record<string, number> = tabla();
