import { createRaster, blit, type Raster } from '../core/raster';
import type { EstiloDef, Medidas } from './estilo';
import type { Cuadro, Movimiento } from './movimiento';
import { pintarMovimiento, type CuadroPintado, type Lienzo, type Personaje } from './figura';
import { G, ZONA } from './cuerpo';

/**
 * Exportación al contrato de pelea de docs/pelea/JUEGO/LEEME.md, tal cual: una hoja PNG por animación con los cuadros
 * en fila y un manifest.json con ticks, fase y cajas por cuadro en pixeles desde el pivote (y negativa hacia arriba).
 * Las cajas salen de los grupos del cuerpo (qué pixel es brazo, pierna o tronco) y de la cabeza pegada.
 */
export type Caja = [number, number, number, number];
export interface CuadroContrato { ticks: number; fase: string; recibe: { zona: string; caja: Caja }[]; pega: Caja[]; empuje: Caja }
export interface AnimContrato { bucle: boolean; hoja: string; w: number; h: number; ox: number; oy: number; cuadros: CuadroContrato[]; golpe?: Movimiento['golpe'] }

export interface ResultadoAnim { nombre: string; hoja: Raster; anim: AnimContrato; cuadros: Cuadro[]; pintados: CuadroPintado[]; pega: (Caja | null)[] }

export function exportarAnim(pj: Personaje, e: EstiloDef, m: Medidas, cell: number, mov: Movimiento, cuadros: Cuadro[], lz: Lienzo): ResultadoAnim {
  const pintados = pintarMovimiento(pj, e, m, cell, cuadros, lz);
  const [ox, oy] = lz.pivot;
  const pegas: (Caja | null)[] = [];
  const cs: CuadroContrato[] = pintados.map((p, k) => {
    const q = cuadros[k];
    const caja = (grupos: number[]) => cajaDe(p, (g) => grupos.includes(g), ox, oy);
    const zonas: { zona: string; caja: Caja | null }[] = [
      { zona: 'cabeza', caja: p.cabeza ? [p.cabeza.x0 - ox, p.cabeza.y0 - oy, p.cabeza.x1 - p.cabeza.x0 + 1, p.cabeza.y1 - p.cabeza.y0 + 1] : null },
      { zona: 'cuerpo', caja: caja(grupos('cuerpo')) },
      { zona: 'piernas', caja: caja(grupos('piernas')) },
    ];
    // el miembro que pega también recibe mientras está afuera (como en SF2: el que tira el golpe se expone)
    const imp = cuadros.find((x) => x.impacto)?.impacto;
    const gPega = imp ? grupoDe(imp.miembro, imp.lado) : null;
    let pega: Caja | null = null;
    if (q.fase === 'activo' && gPega !== null) {
      pega = caja(gPega);
      zonas.push({ zona: imp!.miembro === 'mano' ? 'brazo' : 'piernas', caja: caja(imp!.miembro === 'mano' ? [G.brazoCerca, G.brazoLejos].filter((g) => (imp!.lado === 'cerca' ? g === G.brazoCerca : g === G.brazoLejos)) : gPega) });
    }
    pegas.push(pega);
    // empuje: el tronco, del piso al cuello
    const tronco = caja([G.torso]) ?? [-10, -50, 20, 50];
    const alto = Math.round(p.j.cuello[1]);
    const ancho = Math.max(4, Math.round(tronco[2] * 0.85));
    const cx = Math.round(p.j.pelvis[0]);
    return {
      ticks: q.ticks, fase: q.fase,
      recibe: zonas.filter((z) => z.caja).map((z) => ({ zona: z.zona, caja: z.caja! })),
      pega: pega ? [pega] : [],
      empuje: [cx - Math.round(ancho / 2), -alto, ancho, alto],
    };
  });
  const hoja = createRaster(lz.w * pintados.length, lz.h);
  pintados.forEach((p, k) => blit(hoja, p.raster, k * lz.w, 0));
  return {
    nombre: mov.nombre, hoja, cuadros, pintados, pega: pegas,
    anim: { bucle: mov.bucle, hoja: `${mov.nombre}.png`, w: lz.w, h: lz.h, ox, oy, cuadros: cs, ...(mov.golpe ? { golpe: mov.golpe } : {}) },
  };
}

const grupos = (z: 'cuerpo' | 'brazo' | 'piernas') => Object.entries(ZONA).filter(([, v]) => v === z).map(([g]) => Number(g));
const grupoDe = (miembro: 'mano' | 'pie', lado: 'cerca' | 'lejos') =>
  miembro === 'mano' ? [lado === 'cerca' ? G.manoCerca : G.manoLejos] : [lado === 'cerca' ? G.pieCerca : G.pieLejos];

/** Caja de los pixeles de unos grupos, desde el pivote. */
function cajaDe(p: CuadroPintado, es: (g: number) => boolean, ox: number, oy: number): Caja | null {
  const { grp, mat } = p.pintado, W = p.raster.w;
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let i = 0; i < grp.length; i++) {
    if (mat[i] < 0 || !es(grp[i])) continue;
    const x = i % W, y = Math.floor(i / W);
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return x1 < 0 ? null : [x0 - ox, y0 - oy, x1 - x0 + 1, y1 - y0 + 1];
}
