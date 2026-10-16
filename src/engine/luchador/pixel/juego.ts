import { createRaster, type Raster } from '../../core/raster';
import type { Caja, DatosCuadro } from '../datos';
import { ondaEnergia } from '../efectos';
import { pintarAnimPixel, type AnimPixel, type LienzoPixel, type MunecoPixel, type PosePixel } from './muneco';

/**
 * Exporta un luchador de pixel al contrato de arte del juego (Street Family Fighter 2, `docs/CONTRATO_ARTE.md`):
 * una hoja PNG por animación con los cuadros en una fila, y un `manifest.json` con los ticks, la fase y las cajas
 * de cada cuadro, todo desde el pivote (el centro entre los pies, en el piso) y mirando a la derecha.
 *
 * - **El juego mueve al luchador:** en los saltos y en la patada voladora se quita la altura que la animación traía,
 *   porque el juego ya lo sube. Los giros se quedan.
 * - **Las cajas que pegan se agrandan** a un tamaño jugable alrededor del puño o del pie, y el remolino de Sophie
 *   pega abajo y a los dos lados, porque es golpe bajo.
 * - **Los proyectiles** (`onda_bola`, `super_bola`) salen de la bola de energía de la pelea, agrandada.
 */
export interface CuadroJuego {
  ticks: number;
  fase: DatosCuadro['fase'];
  recibe: { zona: string; caja: Caja }[];
  pega: Caja[];
  empuje: Caja;
}

export interface AnimJuego {
  bucle: boolean;
  hoja: string;
  w: number;
  h: number;
  ox: number;
  oy: number;
  cuadros: CuadroJuego[];
}

export interface ManifestLuchadorJuego {
  id: string;
  nombre: string;
  alto: number;
  retrato?: string;
  /** qué animación usa cada botón (para los luchadores nuevos) y qué proyectil sale de cada especial */
  botones?: Record<string, string>;
  /** los nombres de los poderes, como se muestran en el juego */
  poderes?: Record<string, string>;
  anims: Record<string, AnimJuego>;
}

export interface ExportJuego {
  manifest: ManifestLuchadorJuego;
  /** las imágenes por nombre de archivo */
  hojas: Record<string, Raster>;
}

/** Las animaciones que el juego mueve por su cuenta en el aire: se les quita la altura. */
const EN_EL_AIRE = new Set(['salto', 'patada_voladora', 'patada_aerea']);

function sinAltura(a: AnimPixel): AnimPixel {
  const plano = (p: PosePixel): PosePixel => ({
    ...p,
    raiz: p.raiz ? { ...p.raiz, y: 0 } : undefined,
    estelas: p.estelas?.map((e) => ({ ...e, pose: plano(e.pose) })),
  });
  return { ...a, cuadros: a.cuadros.map((c) => ({ ...c, pose: plano(c.pose) })) };
}

/** Pone los cuadros en una fila. */
function tira(cuadros: Raster[]): Raster {
  const w = cuadros[0].w, h = cuadros[0].h;
  const r = createRaster(w * cuadros.length, h);
  cuadros.forEach((c, i) => {
    for (let y = 0; y < h; y++) r.data.set(c.data.subarray(y * w * 4, (y + 1) * w * 4), (y * r.w + i * w) * 4);
  });
  return r;
}

/** Agranda una imagen por un entero, vecino más cercano. */
function agrandar(r: Raster, k: number): Raster {
  const o = createRaster(r.w * k, r.h * k);
  for (let y = 0; y < o.h; y++)
    for (let x = 0; x < o.w; x++) {
      const s = (Math.floor(y / k) * r.w + Math.floor(x / k)) * 4, d = (y * o.w + x) * 4;
      for (let q = 0; q < 4; q++) o.data[d + q] = r.data[s + q];
    }
  return o;
}

/** Un retrato cuadrado: la cabeza de la guardia con un margen, mirando a la derecha. */
function retrato(guardia: Raster, lado: number): Raster {
  // la cabeza: la fila opaca más alta y su columna media
  let top = -1, x0 = Infinity, x1 = -1;
  for (let y = 0; y < guardia.h && top < 0; y++) for (let x = 0; x < guardia.w; x++) if (guardia.data[(y * guardia.w + x) * 4 + 3]) { top = y; break; }
  for (let y = top; y < top + lado * 0.6; y++) for (let x = 0; x < guardia.w; x++) if (guardia.data[(y * guardia.w + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
  const cx = Math.round((x0 + x1) / 2 + lado * 0.12), y0 = top - 2;
  const r = createRaster(lado, lado);
  for (let y = 0; y < lado; y++)
    for (let x = 0; x < lado; x++) {
      const sx = cx - (lado >> 1) + x, sy = y0 + y;
      if (sx < 0 || sy < 0 || sx >= guardia.w || sy >= guardia.h) continue;
      const s = (sy * guardia.w + sx) * 4, d = (y * lado + x) * 4;
      for (let q = 0; q < 4; q++) r.data[d + q] = guardia.data[s + q];
    }
  return r;
}

export interface OpcionesJuego {
  id: string;
  nombre: string;
  lienzo: LienzoPixel;
  /** cajas que pegan fijas para una animación (desde el pivote), en vez de la del puño o el pie */
  pegaFija?: Record<string, Caja[]>;
  /** el lado del retrato en pixeles (por omisión, un 36 % de la altura del luchador) */
  retrato?: number;
  /** agrega los proyectiles de la onda */
  proyectiles?: boolean;
  /** proyectiles propios: sus cuadros (mirando a la derecha), el centro y cuánto se agrandan */
  bolas?: { nombre: string; cuadros: Raster[]; ox: number; oy: number; escala: number; ticks: number }[];
  botones?: Record<string, string>;
  poderes?: Record<string, string>;
}

/** Exporta todas las animaciones de un luchador al contrato del juego. */
export function exportarLuchadorJuego(m: MunecoPixel, anims: Record<string, () => AnimPixel>, o: OpcionesJuego): ExportJuego {
  const hojas: Record<string, Raster> = {};
  const out: ManifestLuchadorJuego = { id: o.id, nombre: o.nombre, alto: m.h, retrato: 'retrato.png', botones: o.botones, poderes: o.poderes, anims: {} };
  for (const [nombre, f] of Object.entries(anims)) {
    let a = f();
    if (EN_EL_AIRE.has(nombre)) a = sinAltura(a);
    const r = pintarAnimPixel(m, a, o.lienzo);
    const hoja = `${nombre}.png`;
    hojas[hoja] = tira(r.cuadros);
    out.anims[nombre] = {
      bucle: a.bucle, hoja, w: o.lienzo.w, h: o.lienzo.h, ox: o.lienzo.ox, oy: o.lienzo.oy,
      cuadros: r.datos.map((dc) => ({
        ticks: dc.ticks, fase: dc.fase,
        recibe: dc.recibe.map((z) => ({ zona: z.zona, caja: z.caja })),
        pega: dc.fase !== 'activo' ? [] : o.pegaFija?.[nombre] ?? dc.pega.map(([x, y, w, h]): Caja => [x + w / 2 - 22, y + h / 2 - 14, 34, 28]),
        empuje: dc.empuje,
      })),
    };
    if (nombre === 'guardia') hojas['retrato.png'] = retrato(r.cuadros[0], o.retrato ?? Math.round(m.h * 0.36));
  }
  const bolas = [...(o.bolas ?? [])];
  // la bola de la onda mide 48 x 32 con el centro en (32, 16): al doble para la onda y al triple para el súper
  if (o.proyectiles) bolas.push({ nombre: 'onda_bola', cuadros: ondaEnergia(), ox: 32, oy: 16, escala: 2, ticks: 3 }, { nombre: 'super_bola', cuadros: ondaEnergia(), ox: 32, oy: 16, escala: 3, ticks: 3 });
  for (const b of bolas) {
    const cs = b.cuadros.map((c) => agrandar(c, b.escala));
    hojas[`${b.nombre}.png`] = tira(cs);
    out.anims[b.nombre] = {
      bucle: true, hoja: `${b.nombre}.png`, w: cs[0].w, h: cs[0].h, ox: b.ox * b.escala, oy: b.oy * b.escala,
      cuadros: cs.map(() => ({ ticks: b.ticks, fase: 'neutral' as const, recibe: [], pega: [], empuje: [0, 0, 0, 0] as Caja })),
    };
  }
  return { manifest: out, hojas };
}
