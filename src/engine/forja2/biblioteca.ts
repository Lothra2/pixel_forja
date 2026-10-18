import posesPelea from './datos/poses/pelea.json';
import guardia from './datos/movimientos/pelea/guardia.json';
import punoFuerte from './datos/movimientos/pelea/puno_fuerte.json';
import patadaFuerte from './datos/movimientos/pelea/patada_fuerte.json';
import recibeAlto from './datos/movimientos/pelea/recibe_alto.json';
import type { Movimiento } from './movimiento';
import type { PoseMov } from './pose';

/**
 * Las bibliotecas de movimientos de Forja 2: por pack, sus poses base y sus movimientos (todo en datos/). Un movimiento
 * nuevo es un JSON nuevo en datos/movimientos/<pack>/ más su línea acá.
 */
export interface Pack { poses: Record<string, PoseMov>; movimientos: Record<string, Movimiento> }

const porNombre = (ms: Movimiento[]) => Object.fromEntries(ms.map((m) => [m.nombre, m]));

export const PACKS: Record<string, Pack> = {
  pelea: {
    poses: posesPelea as unknown as Record<string, PoseMov>,
    movimientos: porNombre([guardia, punoFuerte, patadaFuerte, recibeAlto] as unknown as Movimiento[]),
  },
};

export function movimiento(pack: string, nombre: string): { mov: Movimiento; poses: Record<string, PoseMov> } {
  const p = PACKS[pack];
  if (!p) throw new Error(`No existe el pack ${pack}`);
  const mov = p.movimientos[nombre];
  if (!mov) throw new Error(`${pack}: no existe el movimiento ${nombre} (hay: ${Object.keys(p.movimientos).join(', ')})`);
  return { mov, poses: p.poses };
}
