import type { Raster } from '../core/raster';
import type { ChibiLook } from './look';
import { MARGEN } from './cabezaMolde';
import { MOLDES, vestirMolde, espejar, type Molde } from './video';
import type { PintorLuchador } from './repeticion';
import DATA from './video/repeticionMoldes.json';

/**
 * La familia haciendo la pelea del video: cada dibujo de Ryu y Ken de la repetición tiene su molde (qué es cada pixel:
 * contorno, piel, ropa, cinturón, guante, pie, pelo, cara) y el lugar exacto donde cae dentro del dibujo. El pintor viste
 * ese molde con el muñeco y lo pone en el mismo pixel, así el familiar se mueve igual que el luchador del video.
 */

/** Por dibujo: molde, x e y del molde dentro del dibujo y si va espejado. */
type Ubicacion = [string, number, number, boolean] | null;
const UBIC = { ryu: DATA.ryu as Ubicacion[], ken: DATA.ken as Ubicacion[] };
const POSES: Record<string, Molde> = { ...MOLDES, ...(DATA.poses as unknown as Record<string, Molde>) };
// la cabeza del familiar puede salir del molde (pelo, colas, gorro): se deja ese margen alrededor
const PAD = MARGEN + 1;

/** El molde de un dibujo de la repetición (o null si ese dibujo no se usa). */
export function moldeDeDibujo(quien: 'ryu' | 'ken', i: number): { molde: Molde; x: number; y: number; espejo: boolean } | null {
  const u = UBIC[quien][i];
  return u ? { molde: POSES[u[0]], x: u[1], y: u[2], espejo: u[3] } : null;
}

/** Un pintor para la repetición que pone a dos familiares en lugar de Ryu y Ken. */
export function pintorFamilia(looks: { ryu: ChibiLook; ken: ChibiLook }): PintorLuchador {
  const hechos = new Map<string, { img: Raster; x: number; y: number }>();
  return (quien, i, dst, sx, sy) => {
    const clave = quien + i;
    let v = hechos.get(clave);
    if (!v) {
      const md = moldeDeDibujo(quien, i);
      if (!md) return false;
      const { molde: m } = md;
      const img = vestirMolde(looks[quien], m, m.w + 2 * PAD, m.h + 2 * PAD, PAD, PAD);
      if (md.espejo) espejar(img);
      v = { img, x: md.x - PAD, y: md.y - PAD };
      hechos.set(clave, v);
    }
    const { img } = v, x0 = sx + v.x, y0 = sy + v.y;
    for (let y = 0; y < img.h; y++) {
      const yy = y0 + y;
      if (yy < 0 || yy >= dst.h) continue;
      for (let x = 0; x < img.w; x++) {
        const xx = x0 + x, o = (y * img.w + x) * 4;
        if (xx < 0 || xx >= dst.w || !img.data[o + 3]) continue;
        const d = (yy * dst.w + xx) * 4;
        dst.data[d] = img.data[o]; dst.data[d + 1] = img.data[o + 1]; dst.data[d + 2] = img.data[o + 2]; dst.data[d + 3] = 255;
      }
    }
    return true;
  };
}
