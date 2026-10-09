import type { TerrainDesign, TP } from './paint';

/**
 * Diseño del Mundo 1, el Bosque GG (120 x 90 cuadros = 3840 x 2880 px, unas 22 pantallas).
 * Un recorrido con historia, del portal de llegada abajo a la izquierda hasta la arena del minotauro arriba a la derecha:
 *
 *   Claro de la Llegada -> Pradera de las Mariposas -> El Abuelo Roble -> Puente del Trol sobre el Arroyo Cristalino
 *   -> Ruinas del Viejo Reino (estatua de Thor) -> escalera de piedra -> Las Alturas -> Arena del Minotauro.
 *
 * Desvíos para explorar: Bosque Profundo con hongos que brillan y el Anillo de las Hadas, el Claro Escondido,
 * el vado de piedras bajo la cascada, el Lago Espejo, la Colina de los Goblins y el Campo de Calabazas.
 */

export const BOSQUE_W = 120;
export const BOSQUE_H = 90;

/** Lugares importantes (en cuadros). El terreno y los objetos se arman alrededor de estos puntos. */
export const LUGARES = {
  llegada: [10, 79] as TP,
  pradera: [30, 70] as TP,
  abuelo: [36, 45] as TP,
  profundo: [16, 34] as TP,
  hadas: [9, 25] as TP,
  escondido: [11, 9] as TP,
  puente: [55, 55] as TP,
  puenteSur: [59, 71] as TP,
  vado: [52, 33] as TP,
  cascada: [53, 25] as TP,
  lago: [64, 81] as TP,
  ruinas: [79, 50] as TP,
  escalera: [81, 26] as TP,
  alturas: [70, 14] as TP,
  arena: [102, 12] as TP,
  goblins: [106, 55] as TP,
  escaleraGoblin: [97, 73] as TP,
  calabazas: [90, 83] as TP,
};

const L = LUGARES;

export const bosqueDesign: TerrainDesign = {
  w: BOSQUE_W, h: BOSQUE_H, seed: 1207,
  plateaus: [
    // Las Alturas: toda la franja de arriba, de la cascada hacia el este. El borde baja y sube.
    [[34, -2], [122, -2], [122, 25], [112, 27], [104, 24], [96, 26], [88, 23], [76, 27], [66, 24], [58, 26], [50, 25], [43, 22], [36, 18], [34, 10]],
    // Colina de los Goblins, al este
    [[93, 40], [104, 37], [116, 38], [122, 41], [122, 72], [112, 75], [101, 74], [94, 69], [91, 60], [92, 50]],
  ],
  stairs: [
    { x: L.escalera[0], y: 26.2, w: 3 },
    { x: L.escaleraGoblin[0], y: 73.4, w: 3 },
  ],
  rivers: [
    // Arroyo Cristalino: nace arriba, cae por la cascada, serpentea al sur y llega al Lago Espejo
    { pts: [[51, -2], [50, 6], [54, 14], [53, 21], [53, 27], [51, 34], [55, 42], [56, 50], [55, 58], [58, 65], [59, 72], [62, 78]], w: 3.2 },
  ],
  lakes: [
    { c: L.lago, rx: 9, ry: 5.5 },
    { c: [40, 9], rx: 3.4, ry: 2.4 }, // estanque en las alturas, al lado del río
    { c: [7, 49], rx: 3.6, ry: 2.6 }, // charca del bosque profundo
  ],
  roads: [
    // camino principal
    { pts: [[4, 81], [L.llegada[0], L.llegada[1]], [20, 76], [30, 71], [37, 63], [42, 57], [50, 55], [61, 54], [70, 52], [L.ruinas[0], L.ruinas[1]], [82, 42], [81, 34], [L.escalera[0], 28]], w: 2.4 },
    // en las alturas, de la escalera a la arena
    { pts: [[L.escalera[0], 22], [82, 18], [90, 15], [L.arena[0] - 5, 13], [L.arena[0], 12]], w: 2.2 },
    // sendero al Abuelo Roble y al bosque profundo
    { pts: [[30, 71], [31, 60], [31, 49], [25, 40], [L.profundo[0], L.profundo[1]], [11, 28]], w: 1.6 },
    // sendero al puente del sur y al campo de calabazas
    { pts: [[22, 76], [38, 75], [50, 73], [L.puenteSur[0], L.puenteSur[1]], [70, 74], [80, 78], [L.calabazas[0], L.calabazas[1]]], w: 1.6 },
    // de las ruinas a la escalera de los goblins
    { pts: [[L.ruinas[0], L.ruinas[1]], [84, 60], [88, 70], [93, 77], [L.escaleraGoblin[0], 77]], w: 1.6 },
    // en la colina, hasta el campamento
    { pts: [[L.escaleraGoblin[0], 71], [101, 64], [L.goblins[0], L.goblins[1]]], w: 1.6 },
  ],
  plazas: [
    // Ruinas del Viejo Reino
    [[72, 45], [79, 43.5], [86, 46], [86.5, 53], [82, 56.5], [75, 56], [71.5, 51]],
    // arena del minotauro: piso de piedra rúnica
    [[95, 8], [102, 5], [109, 8], [110, 15], [103, 19], [96, 16]],
  ],
  meadows: [
    { c: L.pradera, r: 13 }, { c: [44, 80], r: 8 }, { c: L.llegada, r: 6 }, { c: L.calabazas, r: 9 }, { c: [66, 38], r: 7 }, { c: [62, 12], r: 9 },
  ],
  dark: [
    { c: L.profundo, r: 15 }, { c: [10, 14], r: 11 }, { c: [22, 54], r: 9 }, { c: [44, 38], r: 8 }, { c: [114, 86], r: 9 }, { c: [40, 14], r: 6 },
  ],
  clearings: [
    { c: L.llegada, r: 5 }, { c: L.abuelo, r: 5 }, { c: L.hadas, r: 3 }, { c: L.escondido, r: 4 }, { c: L.ruinas, r: 8 }, { c: L.arena, r: 8 }, { c: L.goblins, r: 6 },
  ],
};
