/**
 * Modelo de cabeza por medidas. No es la foto reducida: son las medidas que hacen reconocible a alguien
 * (silueta del pelo, entradas, dónde arranca la barba, cejas, nariz, ancho de mandíbula) y con ellas
 * se dibuja la cabeza en cualquier ángulo.
 *
 * Unidades: R = media anchura de la cabeza a la altura de los ojos. `y` va de 0 (tope del pelo)
 * a `height` (lo más bajo: barbilla, barba o pelo largo), en unidades de R, creciendo hacia abajo.
 * Cada fila guarda la media anchura de la silueta vista de frente y desde qué ángulo hay pelo o barba.
 * Ángulo φ: 0 = frente, 90 = costado, 180 = nuca.
 */
export interface HeadRow {
  /** media anchura de la silueta (pelo, piel o barba), lado izquierdo y derecho de la imagen */
  wl: number;
  wr: number;
  /** desde qué ángulo hay pelo (0 = cubre la frente, 181 = no hay pelo en esta fila) */
  hairL: number;
  hairR: number;
  /** barba entre estos ángulos (to = 0 sin barba) */
  beardFrom: number;
  beardTo: number;
  /** claridad de la barba en esta fila: 0 oscura, 1 canosa */
  beardLight: number;
  /** también hay pelo de 0 hasta este ángulo (el mechón del centro cuando hay entradas) */
  peak?: number;
  /** fila sin piel (debajo de la barbilla): solo pelo largo o barba */
  hollow?: boolean;
}

export type EyeStyleId = 'punto' | 'brillo' | 'grandes' | 'pestanas' | 'serios';
export type BrowStyleId = 'ninguna' | 'fina' | 'normal' | 'gruesa' | 'arqueada';
export type BeardStyleId = 'ninguna' | 'sombra' | 'bigote' | 'candado' | 'corta' | 'completa' | 'larga';
export type GlassesStyleId = 'ninguno' | 'cuadrados' | 'redondos' | 'sol';

/** Rasgos que se dibujan con reglas de pixel art (no salen del volumen). */
export interface HeadLook {
  eyes: EyeStyleId;
  brows: BrowStyleId;
  glasses: { style: Exclude<GlassesStyleId, 'ninguno'>; color: string } | null;
  beard: BeardStyleId;
}

/** Pieza extra de pelo: esfera (sin b) o cápsula de a hasta b. Coordenadas de la cabeza: x derecha, y abajo, z adelante. */
export interface HairBlob {
  a: [number, number, number];
  b?: [number, number, number];
  r: number;
}

export interface HeadModel {
  version: 1;
  /** alto total en unidades de R */
  height: number;
  rows: HeadRow[];
  /** filas clave, en unidades de R desde el tope */
  marks: { hairline: number; brow: number; eye: number; nose: number; mouth: number; chin: number };
  eyes: { x: number; w: number; color: string; deep: boolean };
  brows: { x: number; w: number; t: number; slant: number; color: string };
  nose: { w: number; len: number };
  mouth: { w: number };
  ears: { y0: number; y1: number; size: number } | null;
  colors: { skin: string; hair: string; beardLight: string | null; beardDark: string | null; lip: string };
  /** largo de la barba que sobresale de la barbilla (de perfil), en R */
  beardLen: number;
  /** pelo largo que cuelga detrás */
  hairLong: boolean;
  /** hasta dónde llega el pelo por detrás */
  nape?: number;
  /** volumen extra del pelo hacia adelante (copete) y hacia atrás */
  depth?: { front: number; back: number };
  /** flequillo: de y0 a y1, más largo del lado de la raya (part -1 izquierda, 1 derecha) */
  fringe?: { y0: number; y1: number; part: number };
  extras?: HairBlob[];
  /** copete: el pelo de arriba sube y sale hacia adelante */
  quiff?: number;
  /** rulos: 0 liso, 1 crespo */
  curl?: number;
  look?: HeadLook;
}

export function rowAt(m: HeadModel, y: number): HeadRow {
  const n = m.rows.length;
  const f = Math.max(0, Math.min(n - 1, (y / m.height) * (n - 1)));
  const i = Math.floor(f), j = Math.min(n - 1, i + 1), t = f - i;
  const a = m.rows[i], b = m.rows[j];
  const l = (p: number, q: number) => p + (q - p) * t;
  // los ángulos de pelo y barba no se interpolan (un 181 mezclado daría pelo falso): el más cercano
  const near = t < 0.5 ? a : b;
  return {
    wl: l(a.wl, b.wl), wr: l(a.wr, b.wr),
    hairL: near.hairL, hairR: near.hairR,
    beardFrom: near.beardFrom, beardTo: near.beardTo,
    beardLight: l(a.beardLight, b.beardLight),
    peak: near.peak, hollow: near.hollow,
  };
}
