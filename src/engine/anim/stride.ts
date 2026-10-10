import type { Pose } from '../rig/pose';

/**
 * Cuánto se mueve el cuerpo en el mundo, medido sobre las poses de lado (adelante = +x, en pixeles de la celda).
 * El pie que carga el peso queda quieto en el piso: lo que ese pie retrocede en la celda es lo que el cuerpo avanza.
 * En el aire no hay pie que mande y el cuerpo sigue con la velocidad que traía.
 */

const airborne = (p: Pose) => p.air > 0 || (p.rise ?? 0) > 0;
const footX = (p: Pose, s: 'near' | 'far') => p.x + p.legs[s].x;
const planted = (p: Pose) => (p.support === 'near' || p.support === 'far' ? p.support : null);

/** Lo que avanza el cuerpo del cuadro a al b con un pie en el piso, o null si va en el aire. */
export function groundStep(a: Pose, b: Pose): number | null {
  if (airborne(a) || airborne(b)) return null;
  // en el cambio de apoyo manda el pie que venía cargando (sigue en el piso hasta despegar)
  const s = planted(a) ?? planted(b);
  if (s) return footX(a, s) - footX(b, s);
  // los dos pies en el piso (o de pie sin apoyo marcado): el promedio
  return (footX(a, 'near') + footX(a, 'far') - footX(b, 'near') - footX(b, 'far')) / 2;
}

/**
 * Avance de un ciclo: la velocidad media del cuerpo mientras pisa por la cantidad de cuadros (en el vuelo de la
 * carrera el cuerpo no frena). Sin ningún paso apoyado no hay cómo medirlo.
 */
export function strideOf(poses: Pose[]): number | undefined {
  const steps: number[] = [];
  for (let i = 0; i < poses.length; i++) {
    const d = groundStep(poses[i], poses[(i + 1) % poses.length]);
    if (d !== null && (planted(poses[i]) || planted(poses[(i + 1) % poses.length]))) steps.push(d);
  }
  if (!steps.length) return undefined;
  const v = (steps.reduce((s, d) => s + d, 0) / steps.length) * poses.length;
  return v > 0 ? Math.round(v * 10) / 10 : undefined;
}
