import type { Pose } from '../rig/pose';
import { type AnimDef, P } from './types';

/**
 * Animaciones de la heroína celestial (encargo F13).
 *
 * Volar: el poder Alas. El cuerpo flota inclinado hacia adelante, las piernas cuelgan con las puntas hacia abajo y los
 * brazos van un poco atrás, como planeando. En la hoja el cuerpo queda cerca del piso (no cabe en la celda si sube):
 * la altura la pone el juego con `elevacion` (pose.rise), que sube y baja con el aleteo. El ala baja en los cuadros
 * 1 a 3 y es ahí donde el cuerpo sube: el impulso se ve.
 */

/** cuánto sube el juego el sprite en cada cuadro (pixeles de la celda de 48) */
export const VOLAR_ELEVACION = [10, 12, 14, 15, 14, 12, 10, 9];
/** aleteo: 1 alas arriba, -1 abajo (las alas de la capa lo leen) */
export const VOLAR_ALETEO = [1, 0.3, -0.6, -1, -0.6, 0, 0.5, 0.9];

export const volar: AnimDef = {
  name: 'volar', pack: 'skills', fps: 10, loop: true, steady: false, views: ['side', 'front', 'back'],
  build: (c) => {
    const L = c.L;
    return VOLAR_ELEVACION.map((rise, i): Pose => {
      const k = VOLAR_ALETEO[i];
      // las piernas acompañan el aleteo con un poco de atraso: cuando el ala baja, se van atrás
      const sway = -k * 0.06 * L;
      return P(c, {
        torso: 10 - k * 2,
        head: { dy: k > 0.5 ? -1 : 0 },
        legs: {
          near: { x: -0.12 * L + sway, y: 0.82 * L, toe: 55 },
          far: { x: -0.32 * L + sway * 0.6, y: 0.7 * L, toe: 60 },
        },
        arms: {
          near: { shoulder: -28 - k * 6, elbow: 22, spread: 18 },
          far: { shoulder: -22 - k * 6, elbow: 26, spread: 18 },
        },
        face: { eyes: 'open', mouth: 'smile' },
        rise,
      });
    });
  },
};

export const CELESTIAL_ANIMS: AnimDef[] = [volar];
