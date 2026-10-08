/**
 * Modelo de cabeza por medidas. No es la foto reducida: son las medidas que hacen reconocible a alguien
 * (silueta del pelo, entradas, dónde arranca la barba, cejas, nariz, ancho de mandíbula) y con ellas
 * se dibuja la cabeza en cualquier ángulo.
 *
 * Unidades: R = media anchura de la cabeza a la altura de los ojos. `y` va de 0 (tope del pelo)
 * a `height` (barbilla, o punta de la barba), en unidades de R, creciendo hacia abajo.
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
  };
}
