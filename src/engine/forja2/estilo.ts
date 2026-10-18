import luchador from './datos/estilos/luchador.json';
import cabezon from './datos/estilos/cabezon.json';

/**
 * Un estilo de personaje (Forja 2): proporciones, grosores y reglas de exageración. Es solo un dato (un JSON en
 * datos/estilos): un estilo nuevo es un archivo nuevo, no un renderizador nuevo. Las medidas van en fracciones del alto
 * del personaje (H), así el mismo estilo sirve en cualquier celda.
 */
export type Acabado = 'retro3' | 'sf2' | 'suave';

export interface EstiloDef {
  id: string;
  nombre: string;
  /** cabezas de alto */
  cabezas: number;
  /** alto del personaje parado, en fracción de la celda */
  alto: number;
  notas?: string;
  /** largos de los huesos y separaciones (fracciones de H) */
  huesos: {
    tobillo: number; canilla: number; muslo: number; columna: number; cuello: number; hombroAlto: number;
    hombros: number; caderas: number; brazo: number; antebrazo: number; puno: number; pie: number;
  };
  /** radios de los volúmenes (fracciones de H); los pares son [de arriba, de abajo] y los tríos [x, y, z] */
  volumen: {
    pecho: number[]; cintura: number[]; pelvis: number[]; cuello: number; trapecio: number; hombro: number;
    brazo: number[]; biceps: number; antebrazo: number[]; mano: number; muslo: number[]; canilla: number[]; gemelo: number; pie: number[];
  };
  /** reglas de exageración que el motor aplica a cualquier movimiento */
  exagera: {
    /** cuánto se agranda el recogido de la anticipación (1 = lo que dice el movimiento) */
    anticipa: number;
    /** escala del puño o del pie en el cuadro del impacto */
    punoImpacto: number;
    /** cuánto se estira el miembro que pega (fracción de su largo) */
    estira: number;
    /** cuánto se aplasta al caer o al recibir */
    aplasta: number;
    /** cuánto sigue de largo el cuerpo después del impacto (1 = lo normal) */
    sobrepaso: number;
    /** amplitud de la respiración en reposo (fracción de H) */
    respira: number;
  };
  /**
   * retarget: cómo se adapta un mismo movimiento a estas proporciones. `pieAlto` multiplica la altura de los pies en el
   * aire (un cabezón de piernas cortas patea más alto, relativo a su pierna, para que la patada se lea)
   */
  retarget?: { pieAlto?: number };
  acabado: Acabado;
  /** a cuántas veces la celda se pinta antes de bajar (2 o 4) */
  supersample: number;
}

export const ESTILOS: Record<string, EstiloDef> = {
  luchador: luchador as EstiloDef,
  cabezon: cabezon as EstiloDef,
};

export function estilo(id: string): EstiloDef {
  const e = ESTILOS[id];
  if (!e) throw new Error(`No existe el estilo ${id} (hay: ${Object.keys(ESTILOS).join(', ')})`);
  return e;
}

/** Las medidas en pixeles de un estilo en una celda. */
export interface Medidas {
  /** alto parado */
  H: number;
  /** alto de la cabeza */
  cabeza: number;
  tobillo: number; canilla: number; muslo: number; columna: number; cuello: number; hombroAlto: number;
  hombros: number; caderas: number; brazo: number; antebrazo: number; puno: number; pie: number;
  /** largo de la pierna (cadera al tobillo) y del brazo (hombro al centro del puño) */
  pierna: number;
  alcance: number;
  /** alto de la cadera parado */
  caderaAlta: number;
}

export function medidasDe(e: EstiloDef, cell: number): Medidas {
  const H = e.alto * cell;
  const h = Object.fromEntries(Object.entries(e.huesos).map(([k, v]) => [k, v * H])) as EstiloDef['huesos'];
  return {
    H, cabeza: H / e.cabezas, ...h,
    pierna: h.muslo + h.canilla,
    alcance: h.brazo + h.antebrazo + h.puno,
    caderaAlta: h.tobillo + h.canilla + h.muslo,
  };
}
