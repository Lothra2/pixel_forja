import type { Raster } from '../core/raster';
import { lamina, aRaster, vineta, grano, suave, type Lamina } from './cine';
import { GUION, PINTORES, capasFinales, componerPlano } from './cinematicas';
import { Toma } from './cine_toma';

/**
 * Las siete cartas de presentación de los actos de Réquiem de Ceniza, 1280 x 720. Se pintan con el mismo estudio que
 * las cinemáticas (capas con perspectiva aérea, modelos del motor iluminados con luz principal y contraluz, sangre,
 * rayos de luz) y a partir del plano que mejor muestra el mundo del acto, en modo carta (sin lo que solo pasa al
 * final: estelas de la brasa, barcos que zarpan; el río del acto 3 todavía sangra). Cada carta deja libre una franja
 * arriba para el título y otra abajo, ya oscurecida, para la narración: el juego escribe los textos encima
 * (ZONAS_CARTA).
 *
 *   1 Velmora: la abadía de Santa Oria (el modelo del juego) con sus vitrales rojos, el camposanto y la horca de los cuervos.
 *   2 Sahrim: sol de sangre, el rey colosal enterrado que llora sangre y el camino de los empalados con sus buitres.
 *   3 Yhuantl: la pirámide escalonada en la niebla, el río rojo que arrastra a sus muertos y la selva que enmarca.
 *   4 Hrimgard: la ventisca, el rey de escarcha que camina y la fila de sus muertos detrás.
 *   5 La Herida: el cielo abierto como una boca sobre los picos y el héroe en el borde de la roca.
 *   6 Ysmeral: la catedral ahogada fuera del agua con su luz verde, el barco varado y los huesos de ballena.
 *   7 La Corona: el cielo roto como vidrio y la escalera de oro que sube hacia la grieta.
 */

export const W_CARTA = 1280, H_CARTA = 720;
/** Dónde escribe el juego: el título arriba y la narración abajo (pixeles de la carta). */
export const ZONAS_CARTA = { titulo: { x: 240, y: 52, w: 800, h: 132 }, narracion: { x: 160, y: 548, w: 960, h: 144 } };

export interface Acto { n: number; id: string; es: string; en: string; tema: string; luz: string }
export const ACTOS_CARTA: Acto[] = [
  { n: 1, id: 'velmora', es: 'El Valle de Velmora', en: 'The Vale of Velmora', tema: 'páramo, horcas y la abadía de Santa Oria', luz: '#d8c7a8' },
  { n: 2, id: 'sahrim', es: 'Las Arenas de Sahrim', en: 'The Sands of Sahrim', tema: 'desierto, reyes que duermen y tumbas', luz: '#f0c27a' },
  { n: 3, id: 'yhuantl', es: 'La Selva de Yhuantl', en: 'The Jungle of Yhuantl', tema: 'selva que respira, templo y río que sangra', luz: '#b8e0c8' },
  { n: 4, id: 'hrimgard', es: 'Los Picos de Hrimgard', en: 'The Peaks of Hrimgard', tema: 'nieve, hielo y el rey que juró no levantarse', luz: '#cfe6ff' },
  { n: 5, id: 'herida', es: 'La Herida', en: 'The Wound', tema: 'el cielo abierto, lava y el Último Coro', luz: '#ffb070' },
  { n: 6, id: 'ysmeral', es: 'Ysmeral, la Ciudad Ahogada', en: 'Ysmeral, the Drowned City', tema: 'mar, campanas y naufragios', luz: '#b0e8d8' },
  { n: 7, id: 'corona', es: 'La Corona del Dios Sediento', en: 'The Crown of the Thirsting God', tema: 'el cielo roto, oro y sed', luz: '#ffe2a0' },
];
/** De qué plano sale cada carta (clave de la cinemática y plano). */
export const PLANO_DE_CARTA: Record<number, [string, string]> = {
  1: ['acto_1', 'p2_campanas'], 2: ['acto_2', 'p2_coloso'], 3: ['acto_3', 'p2_rio'], 4: ['acto_3', 'p3_norte'],
  5: ['acto_4', 'p3_herida'], 6: ['acto_5', 'p4_ysmeral'], 7: ['acto_6', 'p3_vidrio'],
};

/** Terminación de la carta: franja del título apenas más oscura, la de la narración bastante, viñeta y grano. */
function terminar(L: Lamina, s: number) {
  const z = ZONAS_CARTA;
  for (let y = 0; y < L.h; y++) {
    const arriba = 0.3 * (1 - suave(z.titulo.y + z.titulo.h * 0.4, z.titulo.y + z.titulo.h + 60, y));
    const abajo = 0.62 * suave(z.narracion.y - 40, z.narracion.y + 80, y);
    const f = 1 - Math.max(arriba, abajo);
    for (let x = 0; x < L.w; x++) { const j = (y * L.w + x) * 4; L.d[j] *= f; L.d[j + 1] *= f; L.d[j + 2] *= f; L.d[j + 3] = 1; }
  }
  vineta(L, 0.6);
  grano(L, 0.025, s);
}

/** La carta del acto n (1 a 7), 1280 x 720 opaca, en flotantes. */
export function cartaActoLamina(n: number): Lamina {
  const [clave, id] = PLANO_DE_CARTA[n];
  const p = GUION[clave].find((q) => q.id === id)!;
  const t = new Toma(n * 101);
  t.carta = true;
  PINTORES[`${clave}/${id}`](t);
  const quieta = { desde: { x: 0, y: 0, zoom: 1 }, hasta: { x: 0, y: 0, zoom: 1 }, curva: 'lineal' as const };
  const L = componerPlano(capasFinales(t), { ...p, cam: quieta }, { t: 0, franja: false, vineta: lamina(W_CARTA, H_CARTA) });
  terminar(L, n * 13);
  return L;
}
/** La carta del acto n (1 a 7) a 8 bits. */
export const cartaActo = (n: number): Raster => aRaster(cartaActoLamina(n), true);
