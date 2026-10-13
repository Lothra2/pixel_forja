import { pose, type AvePose } from '../rig/ave';

/**
 * Las animaciones de las aves, de lado. Todas se quedan en su sitio: el juego mueve al ave (la paloma que se va
 * volando) y espeja para la izquierda. Los eventos van como en todo el kit: { tipo, cuadro }.
 */
export interface AveAnim {
  nombre: string;
  fps: number;
  loop: boolean;
  poses: AvePose[];
  eventos?: { tipo: string; cuadro: number }[];
}

const pasos = (a: number, b: number): AvePose['patas'] => [{ x: a, sube: 0 }, { x: b, sube: 0 }];

/** El gallo: idle, picotear, cantar (con el canto en el cuadro 3), asustarse (salta y cae en el mismo sitio) y caminar. */
export const ANIMS_GALLO: AveAnim[] = [
  {
    nombre: 'idle', fps: 4, loop: true,
    poses: [
      pose(),
      pose({ alto: -0.4, cabeza: 4, cola: -2 }),
      pose({ cuello: 22, cabeza: -6, cola: 2 }),
      pose({ ojo: 'cerrado' }),
    ],
  },
  {
    nombre: 'picotear', fps: 8, loop: false,
    poses: [
      pose(),
      pose({ pitch: 2, cuello: 60, cabeza: 30, cola: 6 }),
      pose({ pitch: -10, cuello: 100, estira: 1.1, cabeza: 75, cola: 12 }),
      pose({ pitch: 4, cuello: 45, cabeza: 18, cola: 4 }),
    ],
  },
  {
    nombre: 'cantar', fps: 8, loop: false,
    eventos: [{ tipo: 'canto', cuadro: 3 }],
    poses: [
      pose(),
      pose({ pitch: 18, pecho: 1, cuello: 8, cabeza: -10 }),
      pose({ pitch: 24, pecho: 1.5, alto: 0.6, cuello: -2, estira: 1.3, cabeza: -32, pico: 0.6 }),
      pose({ pitch: 26, pecho: 1.5, alto: 0.8, cuello: -4, estira: 1.35, cabeza: -38, pico: 1 }),
      pose({ pitch: 24, pecho: 1.2, alto: 0.6, cuello: -2, estira: 1.3, cabeza: -34, pico: 0.8, cola: 4 }),
      pose({ pitch: 14, pecho: 0.5, cuello: 12, cabeza: -4, cola: 2 }),
    ],
  },
  {
    nombre: 'asustarse', fps: 10, loop: false,
    eventos: [{ tipo: 'aleteo', cuadro: 1 }],
    poses: [
      pose({ alto: -1.2, pitch: 4, cuello: 30, cabeza: 10, cola: -4 }),
      pose({ aire: 4, pitch: 20, cuello: 10, cabeza: -10, ala: 0.9, patas: [{ x: 1.4, sube: 0 }, { x: -0.2, sube: 0 }], cola: 10, pico: 0.6 }),
      pose({ aire: 5, pitch: 14, cuello: 14, ala: -0.6, patas: [{ x: 1.2, sube: 0 }, { x: 0.2, sube: 0 }], cola: 14, pico: 0.6 }),
      pose({ alto: -0.6, pitch: 8, cuello: 20, ala: 0.2, cola: 6 }),
    ],
  },
  {
    nombre: 'caminar', fps: 8, loop: true,
    poses: [
      pose({ cuello: 26, patas: [{ x: 1.8, sube: 0 }, { x: -1.4, sube: 0 }] }),
      pose({ cuello: 20, alto: 0.4, patas: [{ x: 0.6, sube: 0 }, { x: -0.6, sube: 1.6 }] }),
      pose({ cuello: 12, alto: 0.4, patas: [{ x: -0.6, sube: 0 }, { x: 1, sube: 1.2 }] }),
      pose({ cuello: 26, patas: [{ x: -1.4, sube: 0 }, { x: 1.8, sube: 0 }] }),
      pose({ cuello: 20, alto: 0.4, patas: [{ x: -0.6, sube: 1.6 }, { x: 0.6, sube: 0 }] }),
      pose({ cuello: 12, alto: 0.4, patas: [{ x: 1, sube: 1.2 }, { x: -0.6, sube: 0 }] }),
    ],
  },
];

/** La paloma: idle, picotear, caminar (cabeceando), despegar, volar y aterrizar. */
export const ANIMS_PALOMA: AveAnim[] = [
  {
    nombre: 'idle', fps: 3, loop: true,
    poses: [pose({ pitch: 8 }), pose({ pitch: 8, alto: -0.3, ojo: 'cerrado', cabeza: 6 })],
  },
  {
    nombre: 'picotear', fps: 8, loop: false,
    poses: [
      pose({ pitch: 8 }),
      pose({ pitch: 0, cuello: 60, cabeza: 35, cola: 6 }),
      pose({ pitch: -14, cuello: 115, estira: 1.4, cabeza: 80, cola: 14 }),
      pose({ pitch: 4, cuello: 38, cabeza: 15, cola: 4 }),
    ],
  },
  {
    // la paloma cabecea: la cabeza va adelante cuando la pata de atrás se levanta
    nombre: 'caminar', fps: 8, loop: true,
    poses: [
      pose({ pitch: 8, cuello: 42, patas: pasos(1.2, -1) }),
      pose({ pitch: 8, cuello: 10, alto: 0.3, patas: [{ x: 0.2, sube: 0 }, { x: 0.4, sube: 1 }] }),
      pose({ pitch: 8, cuello: 42, patas: pasos(-1, 1.2) }),
      pose({ pitch: 8, cuello: 10, alto: 0.3, patas: [{ x: 0.4, sube: 1 }, { x: 0.2, sube: 0 }] }),
    ],
  },
  {
    nombre: 'despegar', fps: 10, loop: false,
    eventos: [{ tipo: 'aleteo', cuadro: 1 }],
    poses: [
      pose({ pitch: 4, alto: -0.7, cuello: 30, cola: -4 }),
      pose({ pitch: 18, aire: 0.7, ala: 0.8, cuello: 15, patas: pasos(0.6, -0.4), cola: 6 }),
      pose({ pitch: 12, aire: 1.4, ala: -0.7, cuello: 25, patas: pasos(-0.4, -1), cola: 8 }),
      pose({ pitch: 4, aire: 2, ala: 0.6, cuello: 30, recogidas: true, cola: 4 }),
    ],
  },
  {
    // el aleteo: dos cuadros con las alas bien arriba del lomo, uno abajo y uno de paso; la silueta cambia de alto
    nombre: 'volar', fps: 12, loop: true,
    poses: [1, 0.55, -1, 0.05].map((a, i) => pose({ pitch: 0, aire: [0.4, 0.8, 1.8, 1.2][i], ala: a, cuello: 35, cabeza: 4, recogidas: true, cola: 2 })),
  },
  {
    nombre: 'aterrizar', fps: 10, loop: false,
    poses: [
      pose({ pitch: 20, aire: 3, ala: 0.45, cuello: 25, patas: pasos(1.4, 1), cola: 14 }),
      pose({ pitch: 24, aire: 1.5, ala: 0.55, cuello: 20, patas: pasos(1.2, 0.8), cola: 16 }),
      pose({ pitch: 12, aire: 0, alto: -0.6, ala: 0.6, cuello: 30, patas: pasos(0.8, -0.6), cola: 8 }),
      pose({ pitch: 8 }),
    ],
  },
];

export const ANIMS_AVE: Record<string, AveAnim[]> = { gallo: ANIMS_GALLO, paloma: ANIMS_PALOMA };
