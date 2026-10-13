import type { Color, Paleta } from './paleta';

/**
 * El estilo `colombia_ladrillo`: los barrios de ladrillo de Medellín. La misma lista de 24 nombres que Vietnam, con los
 * tonos de allá: el ladrillo naranja, el cielo azul limpio de la mañana, el verde de los cerros y los colores de los
 * murales. `canal` (que en Vietnam es el agua) aquí es el violeta de los murales: en estos barrios no hay canal.
 */
export const COLOMBIA_MANANA: Paleta = {
  tinta: '#221a22',
  sombra: '#3d3138',
  asfalto: '#59525a',
  asfalto_claro: '#807880',
  cemento: '#a8a09c',
  cemento_claro: '#d4cdc4',
  crema: '#f2e8d2',
  luz: '#fffaf0',
  amarillo: '#f6c93c',
  ocre: '#d98d48',
  terracota: '#b55c38',
  rojo: '#d83a30',
  vino: '#7e3226',
  salmon: '#ec6a9e',
  menta: '#58c6aa',
  verde: '#4c9a46',
  verde_oscuro: '#2b5c36',
  celeste: '#5aa8e8',
  cielo: '#b8def8',
  azul: '#2c5cba',
  azul_noche: '#2a3c66',
  canal: '#8a58c4',
  oro: '#f5862a',
  bruma: '#d2e2ea',
};

export const USO_COLOMBIA: Record<Color, string> = {
  tinta: 'contorno y lo más oscuro, tanques negros',
  sombra: 'sombras hondas, rejas, cables',
  asfalto: 'asfalto, metal de la escalera eléctrica',
  asfalto_claro: 'metal gastado, zinc en sombra',
  cemento: 'concreto, columnas sin pintar',
  cemento_claro: 'concreto al sol, zinc, baldosa',
  crema: 'pared pintada clara, letreros',
  luz: 'brillos, ropa blanca, letras',
  amarillo: 'amarillo de la bandera, pared amarilla, murales',
  ocre: 'ladrillo al sol, la junta del ladrillo',
  terracota: 'ladrillo',
  rojo: 'rojo de la bandera, cabinas del metrocable, rejas',
  vino: 'sombra del ladrillo',
  salmon: 'rosado de los murales y las flores',
  menta: 'turquesa de los murales',
  verde: 'matas, cerros cercanos',
  verde_oscuro: 'sombra de las matas, cerros',
  celeste: 'cielo alto, murales',
  cielo: 'cielo bajo, vidrio',
  azul: 'azul de la bandera, rejas azules',
  azul_noche: 'cerros lejanos en sombra, vidrio oscuro',
  canal: 'violeta de los murales',
  oro: 'naranja de los techos de la escalera eléctrica',
  bruma: 'bruma sobre el valle',
};

/** La paleta del estilo colombia para una hora. Por ahora el único escenario es de mañana. */
export function paletaColombia(_hora: string, _clima: string[] = [], _tema?: string): Paleta {
  return COLOMBIA_MANANA;
}
