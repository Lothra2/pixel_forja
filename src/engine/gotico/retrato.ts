import type { Iluminacion, V3 } from './render';

/**
 * Luz de retrato para la selección de personaje (el menú de inicio), aparte de la clave baja del juego, a juego con la
 * escena del menú: una fogata en el piso a la DERECHA del héroe en pantalla. Claroscuro:
 * - la principal es la fogata: cálida, desde la derecha y desde abajo (unos 25° bajo la horizontal: la luz de hoguera
 *   sube), un punto con caída (más fuerte en la cara, el pecho y la mano del arma que en los pies), con sus sombras;
 * - el lado opuesto queda en sombra profunda: el relleno es bajo, frío y débil (principal:relleno ~7:1);
 * - una contraluz fría desde arriba, a la izquierda y atrás recorta la silueta del lado de la sombra (1 a 2 px), fuerte
 *   en cabeza y hombros y nada en las piernas ni del lado de la fogata, y tiñe de frío el filo del metal de ese lado;
 *   el de la fogata lleva su calor;
 * - la placa refleja: recibe menos difuso (la cara de la lámina oscura, el filo encendido);
 * - oclusión ambiental en axilas, entrepierna, juntas de placas y bajo el casco;
 * - la piel en la sombra tira a rojo oscuro (sangre bajo la piel), no a gris, y con poca saturación al sol.
 * Hecha para la dirección 'so': el héroe mira hacia +y (a la izquierda y abajo de la pantalla) y su derecha es +x (a
 * la derecha y abajo); la cámara está hacia +x +y. La fogata va del lado de su derecha y un poco adelante: así le da
 * en la mejilla que mira a la cámara.
 * `escala`: cuántas veces el tamaño de juego (la fogata y la oclusión se miden en unidades del mundo).
 */
export function retrato(escala = 1): Iluminacion {
  const k = escala;
  // horizontal: la derecha del héroe con algo de su frente; vertical: 25° desde abajo
  const hz: V3 = [0.91, 0.41, 0], b = (25 * Math.PI) / 180;
  const d: V3 = [hz[0] * Math.cos(b), hz[1] * Math.cos(b), -Math.sin(b)];
  // la fogata: a 75 unidades (de un cuerpo de alto 1) del pecho, cerca del piso
  const pecho: V3 = [0, 0, 42 * k], pos: V3 = [pecho[0] + d[0] * 75 * k, pecho[1] + d[1] * 75 * k, Math.max(4 * k, pecho[2] + d[2] * 75 * k)];
  const al = [pos[0] - pecho[0], pos[1] - pecho[1], pos[2] - pecho[2]], la = Math.hypot(al[0], al[1], al[2]);
  return {
    amb: 0.025, dif: 1.0, cielo: 0.015, rebote: 0,
    especular: 0.7, especularMin: 0.4,
    expo: 1.0, gamma: 1.4,
    principal: { dir: [al[0] / la, al[1] / la, al[2] / la], color: '#ffa860', tinte: 0.6, pos, alcance: 62 * k, foco: [4 * k, 48 * k, 0.5] },
    relleno: { dir: [-0.6, 0.6, 0.35] as V3, color: '#5b74a6', fuerza: 0.1, tinte: 1 },
    borde: { dir: [-0.8, -0.2, 0.6] as V3, fuerza: 0.55, color: '#4a6894', ancho: 2.6, mezcla: 0.85, contorno: 1.3, alto: [26 * k, 52 * k] },
    sombra: { color: '#04050b', fuerza: 0.78, hasta: 0.3 },
    techo: { desde: 100, k: 0.45, color: '#c8b496', mezcla: 0.3 },
    metal: { brillo: 0.6, esp: 3.2, exp: 12, filo: 0.18, borde: 1.3, ancho: 1.4, piso: 0.03, difuso: 0.4, suave: 0.04, tope: 0.4 },
    ao: { radio: 3 * k, fuerza: 0.6, muestras: 8 },
    piel: { sombra: '#1e0806', satura: 0.7 },
  };
}
/** La de la selección, a la escala del grupo 'sel' (2,5: el héroe a ~195 px, que el juego dibuja a ×1). */
export const RETRATO: Iluminacion = retrato(2.5);
