import type { Plano3D } from './cine3d_toma';
import { PLANOS_INTRO } from './cine3d_cuadros';
import { PLANOS_ACTOS_A } from './cine3d_actos_a';

/**
 * Las escenas 3D horneables de cada cinemática, por clave (intro, acto_1...): lo que hornean scripts/gotico-cine3d.ts y
 * scripts/gotico-cine3d-previa.ts. El juego no las necesita (lee lo horneado en datos/cine3d/<clave>/<plano>/).
 * Cada archivo de escenas exporta su Record<clave, Plano3D[]> y se suma acá con una línea. Un plano que cambia con una
 * elección se hornea una vez por valor, con id `<plano>@<valor>` (p2_fortin@vigdis_viva): sus capas salen con `si`.
 */
export const PLANOS_CINE3D: Record<string, Plano3D[]> = {
  intro: PLANOS_INTRO,
  ...PLANOS_ACTOS_A,
};

/** El plano 3D `id` de la clave (o un error que dice qué hay). */
export function plano3d(clave: string, id: string): Plano3D {
  const ps = PLANOS_CINE3D[clave];
  if (!ps) throw new Error(`no hay escenas 3D para ${clave} (hay: ${Object.keys(PLANOS_CINE3D).join(', ')})`);
  const p = ps.find((q) => q.id === id);
  if (!p) throw new Error(`no hay plano 3D ${clave}/${id} (hay: ${ps.map((q) => q.id).join(', ')})`);
  return p;
}
