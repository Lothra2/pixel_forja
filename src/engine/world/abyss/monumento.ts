import type { Raster } from '../../core/raster';
import type { WorldObject } from '../objects';
import { castShadow } from '../premium/shadow';
import { contactShadow } from '../premium/contact';

/**
 * Un monumento por zona (abyss premium): un objeto grande que se reconoce de lejos, de 64 x 64 a 128 x 160, sólido
 * solo en su base y con su sombra horneada. Cuenta algo de la historia del piso.
 */
export interface Monumento {
  /** zona del mapa (nombre exacto) */
  zona: string;
  obj: WorldObject;
  /** qué cuenta (para la entrega) */
  historia: string;
  /** dónde le gusta estar: junto al agua (molinos, barcas) o pegado al camino (lo normal) */
  prefiere?: 'agua' | 'camino';
}

/** Medidas permitidas de un monumento. */
export const MONUMENTO_MIN = [64, 64] as const;
export const MONUMENTO_MAX = [128, 160] as const;

/**
 * Arma el objeto: apoyo abajo al centro de la base, sólido solo en la base (ancho `base` px y 12 de alto) y la sombra
 * del mundo: con dirección en los mundos 1 a 3 (la luz de arriba a la izquierda), de contacto en los mundos 4 a 7
 * (ahí la sombra larga la hace el juego desde la luz que alumbra).
 */
export function monumento(name: string, frames: Raster[], anchor: [number, number], base: number, sombra: 'larga' | 'contacto', fps = 4, extra: Partial<WorldObject> = {}): WorldObject {
  const f0 = frames[0];
  if (f0.w < MONUMENTO_MIN[0] || f0.h < MONUMENTO_MIN[1] || f0.w > MONUMENTO_MAX[0] || f0.h > MONUMENTO_MAX[1]) throw new Error(`monumento ${name}: ${f0.w} x ${f0.h} fuera de 64 x 64 a 128 x 160`);
  const shadow = sombra === 'larga' ? castShadow(f0, anchor, { length: 0.42, drop: 0.2, alpha: 110 }) : contactShadow(f0, anchor, { spread: 4, tall: 3.2 });
  return {
    name, w: f0.w, h: f0.h, anchor, solid: [-Math.round(base / 2), -12, base, 12], shadow,
    anims: { idle: { frames, fps, loop: true } },
    ...extra,
  };
}
