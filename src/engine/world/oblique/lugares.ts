import type { Lienzo } from './lienzo';
import type { Color, Paleta } from './paleta';
import type { Entidad, ObliqueLayout, TipoPiso } from './layout';
import type { Pieza } from './calle';
import type { PintorCerca } from './fachadas';
import type { Luz, ObjetoEscena, Particula, VidaEscena } from './escena';
import { DOJO } from './dojo';
import { TAODAN } from './taodan';
import { CANDELARIA } from './candelaria';
import { MARGARITA } from './margarita';
import { DALAT } from './dalat';
import { BARRANQUILLA } from './barranquilla';
import { MARACAIBO } from './maracaibo';
import { COCORA } from './cocora';

/**
 * Un lugar con todo su arte en un solo sitio (lote E4a): el fondo de la capa cerca, la capa lejos, sus pisos, lo de
 * abajo de la franja, sus cajas, su vida, sus luces y sus partículas. Se elige por `paralaje.cerca`. Los escenarios de
 * antes siguen conectados a mano en `escena.ts`: este registro es para los nuevos, así un lugar nuevo no toca el motor.
 */

/** El color del piso de un lugar en (x, y) de la franja (pintado derecho, antes de inclinar). */
export type PintorPiso = (x: number, y: number, s: number) => Color;

export interface Lugar {
  /** El estilo de la ficha de arte. */
  estilo: string;
  /** La capa cerca (en la vista de lado, el fondo): de la fila 0 a `franja.atras`. Lo que no pinta deja ver lejos y cielo. */
  fondo: PintorCerca;
  /** La capa lejos, por el nombre de `paralaje.lejos`. */
  lejos?: Record<string, (pal: Paleta, w: number, h: number, seed: number) => Lienzo>;
  /** Los pisos propios del lugar, por tipo. */
  pisos?: Partial<Record<TipoPiso, PintorPiso>>;
  /** Lo que se ve debajo de la franja: x de mundo y fila desde el borde de adelante. */
  orilla?: (x: number, r: number, s: number) => Color;
  /** Marcas pintadas en el piso derecho, antes de inclinarlo (las rayas de una cancha, la raya del tejo). */
  marcas?: (P: Lienzo, L: ObliqueLayout, seed: number) => void;
  /** Las cajas del lugar por su `tipo`, o null. */
  pieza?: (pal: Paleta, tipo: string | undefined, w: number, d: number, z: number, seed: number) => Pieza | null;
  /**
   * Lo que el lugar pinta por una entidad `objeto` del layout que conoce (los arcos de piedra del fútbol), o null. Va con
   * los demás objetos, ordenado con los atletas. No es geometría: la colisión sigue siendo la del layout.
   */
  objeto?: (pal: Paleta, e: Entidad, L: ObliqueLayout, k: number, seed: number) => ObjetoEscena | null;
  vida?: (pal: Paleta, L: ObliqueLayout, k: number, seed: number, capas: { cerca: Lienzo; piso: Lienzo }) => VidaEscena[];
  luces?: (pal: Paleta, L: ObliqueLayout, k: number) => Luz[];
  particulas?: (pal: Paleta, L: ObliqueLayout, k: number) => Particula[];
  /** Bajo techo: la lluvia de afuera no moja el piso. */
  techado?: boolean;
}

export const LUGARES: Record<string, Lugar> = {
  dojo_hanoi: DOJO, parque_tao_dan: TAODAN, cancha_tejo_candelaria: CANDELARIA,
  // lote E5: los escenarios de los cuatro deportes de pelota
  playa_el_agua: MARGARITA, cancha_arcilla_dalat: DALAT, calle_carnaval_barranquilla: BARRANQUILLA, cancha_barrio_maracaibo: MARACAIBO,
  // lote E6: las seis pruebas que seguían pintadas por código
  valle_cocora: COCORA,
};

/** El lugar del layout, si es uno de los del registro. */
export const lugarDe = (L: Pick<ObliqueLayout, 'paralaje'>): Lugar | undefined => LUGARES[L.paralaje?.cerca ?? ''];

/** Las capas lejos de los lugares, por nombre. */
export const LEJOS_LUGARES: Record<string, NonNullable<Lugar['lejos']>[string]> = Object.assign({}, ...Object.values(LUGARES).map((l) => l.lejos ?? {}));
