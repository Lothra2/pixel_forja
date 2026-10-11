import { type V3, type M3, type Piece, type Shape, add, sub, mul, norm, cross, mt, mv, I3, len } from './sdf';

/**
 * Ayudas para armar cuerpos con piezas: cada una guarda su marco local para que la textura viaje pegada a ella.
 * `rot` es la orientación de la pieza (columnas = sus ejes en el marco del personaje).
 */
export class Body {
  pieces: Piece[] = [];

  /** Elipsoide con centro, radios y orientación. */
  ell(c: V3, r: V3, mat: string, g: number, opt: { rot?: M3; bump?: number; tag?: string; grain?: 0 | 1 | 2 } = {}): this {
    const rot = opt.rot ?? I3;
    const m = mt(rot);
    this.pieces.push({ shape: { kind: 'ell', c, r, m }, mat, g, bump: opt.bump, o: c, frame: m, tag: opt.tag, grain: opt.grain ?? 1 });
    return this;
  }

  /** Cono redondeado (de una esfera de radio ra en a a una de radio rb en b): brazos, piernas, cuernos, mangos. */
  cone(a: V3, b: V3, ra: number, rb: number, mat: string, g: number, opt: { bump?: number; tag?: string } = {}): this {
    this.pieces.push({ shape: { kind: 'cone', a, b, ra, rb }, mat, g, bump: opt.bump, o: a, frame: axisFrame(sub(b, a)), tag: opt.tag, grain: 0 });
    return this;
  }

  /** Caja (con esquinas redondeadas) con centro, medios lados y orientación. */
  box(c: V3, h: V3, mat: string, g: number, opt: { rot?: M3; round?: number; bump?: number; tag?: string } = {}): this {
    const m = mt(opt.rot ?? I3);
    this.pieces.push({ shape: { kind: 'box', c, h, m, round: opt.round }, mat, g, bump: opt.bump, o: c, frame: m, tag: opt.tag });
    return this;
  }

  /** Anillo: centro, radio mayor y grosor; su eje es el z de `rot`. */
  torus(c: V3, R: number, r: number, mat: string, g: number, rot: M3 = I3): this {
    const m = mt(rot);
    this.pieces.push({ shape: { kind: 'torus', c, R, r, m }, mat, g, o: c, frame: m });
    return this;
  }

  /** Banda que abraza otra forma (correa, cinturón). */
  band(base: Shape, inflate: number, n: V3, d: number, w: number, mat: string, g: number, within?: { n: V3; d: number }): this {
    this.pieces.push({ shape: { kind: 'band', base, inflate, n: norm(n), d, w, within }, mat, g, o: [0, 0, 0], frame: I3 });
    return this;
  }

  /** Cadena de conos por una lista de puntos con radios (cuernos curvos, colas, mechones). */
  chain(pts: V3[], radii: number[], mat: string, g: number, opt: { bump?: number } = {}): this {
    for (let i = 0; i < pts.length - 1; i++) this.cone(pts[i], pts[i + 1], radii[i], radii[i + 1], mat, g, opt);
    return this;
  }

  last(): Piece { return this.pieces[this.pieces.length - 1]; }
}

/** Marco con el eje x a lo largo de una dirección (filas = ejes locales). */
export function axisFrame(dir: V3): M3 {
  const x = norm(dir);
  const ref: V3 = Math.abs(x[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const z = norm(cross(x, ref));
  const y = cross(z, x);
  return [x, y, z];
}

/** Orientación (columnas = ejes) con el eje x hacia una dirección y el y lo más parecido a `up`. */
export function lookRot(dirX: V3, up: V3 = [0, 1, 0]): M3 {
  const x = norm(dirX);
  let z = cross(x, up);
  if (len(z) < 1e-4) z = cross(x, [0, 0, 1]);
  z = norm(z);
  const y = cross(z, x);
  return mt([x, y, z]);
}

/** Punto a lo largo de un segmento. */
export const along = (a: V3, b: V3, t: number): V3 => add(a, mul(sub(b, a), t));
/** Un vector local de un marco (columnas = ejes) llevado al personaje. */
export const loc = (rot: M3, o: V3, v: V3): V3 => add(o, mv(rot, v));
