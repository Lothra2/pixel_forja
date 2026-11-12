import type { Iluminacion, V3 } from './render';

/**
 * Luz de retrato para la selección de personaje (el menú de inicio), aparte de la clave baja del juego:
 * - la principal, cálida (antorcha o brasero), de 3/4 desde adelante y arriba, con sus sombras propias;
 * - una contraluz fría y marcada desde atrás, que recorta la silueta contra el fondo oscuro (también en el contorno);
 * - un relleno bajo y frío desde adelante y abajo, para que la sombra de la cara no caiga a negro;
 * - el metal con el especular de filo de la clave baja.
 * La cámara isométrica mira hacia (-1, -1, -0,8): "adelante" es hacia (+1, +1).
 */
export const RETRATO: Iluminacion = {
  amb: 0.05, dif: 1.0, cielo: 0.03, rebote: 0.02,
  especular: 0.6, especularMin: 0.4,
  expo: 0.9, gamma: 1.2,
  principal: { dir: [0.9, 0.55, 0.8] as V3, color: '#ffb47a', tinte: 0.5 },
  relleno: { dir: [0.35, 1, -0.25] as V3, color: '#5f7aa8', fuerza: 0.16, tinte: 0.9 },
  borde: { dir: [-0.85, -1, 0.35] as V3, fuerza: 0.65, color: '#8fb0e0', ancho: 2.2, mezcla: 0.7, contorno: 0.35 },
  sombra: { color: '#06080f', fuerza: 0.4, hasta: 0.28 },
  techo: { desde: 88, k: 0.4, color: '#b8a890', mezcla: 0.35 },
  metal: { brillo: 0.6, esp: 3.0, exp: 12, filo: 0.18, borde: 1.2, ancho: 1.2, piso: 0.24 },
};
