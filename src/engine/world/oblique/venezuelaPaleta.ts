import type { Color, Paleta } from './paleta';
import { VENEZUELA_MARGARITA_MEDIODIA, VENEZUELA_MARACAIBO_NOCHE, VENEZUELA_APURE_ATARDECER, VENEZUELA_BARRIO_TARDE, VENEZUELA_LICEO_MEDIODIA } from './lugaresPaleta';

/**
 * El estilo `venezuela_ciudad`: Caracas de noche. La misma lista de 24 nombres de siempre, con los tonos de la noche:
 * el cielo y El Ávila casi negros y azules, el concreto gris violeta mojado, las ventanas y los cerros encendidos de
 * amarillo, y los neones rosado y turquesa (`salmon` y `menta`). El piso queda en grises medios para que los atletas,
 * con su contorno oscuro, se lean encima. `canal` es el violeta del reflejo del neón: en la azotea no hay agua.
 */
export const VENEZUELA_NOCHE: Paleta = {
  tinta: '#0e0b18',
  sombra: '#1f1a30',
  asfalto: '#332d48',
  asfalto_claro: '#4f4866',
  cemento: '#686180',
  cemento_claro: '#8a83a0',
  crema: '#b6aec6',
  luz: '#fff4dc',
  amarillo: '#ffd23c',
  ocre: '#e8902c',
  terracota: '#9c5434',
  rojo: '#ef2d3c',
  vino: '#6c2240',
  salmon: '#ff4aa6',
  menta: '#38e6e4',
  verde: '#2c5446',
  verde_oscuro: '#172a2c',
  celeste: '#3f6cc4',
  cielo: '#26356e',
  azul: '#18245a',
  azul_noche: '#10173a',
  canal: '#8a3cc0',
  oro: '#ffac2a',
  bruma: '#3a4478',
};

export const USO_VENEZUELA: Record<Color, string> = {
  tinta: 'contorno, lo más oscuro, la franja negra del borde',
  sombra: 'sombras hondas, edificios de lejos, rejas',
  asfalto: 'concreto en sombra, juntas de las losas, edificios',
  asfalto_claro: 'losa mojada, metal de las antenas',
  cemento: 'losa de la azotea, paredes de la caseta',
  cemento_claro: 'concreto con luz, tanques, el canto del murito',
  crema: 'pared bajo el bombillo, brillos del concreto',
  luz: 'el corazón de los neones, la Cruz del Ávila, bombillos',
  amarillo: 'ventanas prendidas, la franja amarilla del borde, la bandera',
  ocre: 'ventanas tibias, lucecitas de los cerros',
  terracota: 'tubos oxidados',
  rojo: 'luces rojas de las torres y las antenas, la bandera',
  vino: 'sombra del óxido',
  salmon: 'el neón rosado de AREPERA LA CHAMA y su reflejo',
  menta: 'el neón turquesa de CARACAS y su reflejo',
  verde: 'las laderas del Ávila con la luz de la luna',
  verde_oscuro: 'El Ávila en sombra',
  celeste: 'el haz del reflector, brillo del cielo, la tele prendida',
  cielo: 'cielo bajo, nubes con luna',
  azul: 'cielo del medio, el azul de la bandera',
  azul_noche: 'cielo alto',
  canal: 'violeta del reflejo del neón en el piso mojado',
  oro: 'ventanas, faroles de la ciudad',
  bruma: 'el resplandor de la ciudad en el cielo',
};

/** Las horas que el estilo ya sabe pintar. Caracas, por ahora, solo de noche. */
export const HORAS_VENEZUELA = ['noche'];

/** Los lugares de Venezuela con paleta propia, por su fondo (`paralaje.cerca`): Playa El Agua y la cancha de Maracaibo. */
export const PALETAS_LUGAR_VENEZUELA: Record<string, Paleta> = { playa_el_agua: VENEZUELA_MARGARITA_MEDIODIA, cancha_barrio_maracaibo: VENEZUELA_MARACAIBO_NOCHE, morichal_apure: VENEZUELA_APURE_ATARDECER, calle_barrio_caracas: VENEZUELA_BARRIO_TARDE, patio_liceo_caracas: VENEZUELA_LICEO_MEDIODIA };

/** La paleta de Venezuela: Caracas de noche, o la del lugar que trae la suya (Margarita, Maracaibo). */
export function paletaVenezuela(_hora: string, _clima: string[] = [], tema?: string): Paleta {
  return (tema && PALETAS_LUGAR_VENEZUELA[tema]) || VENEZUELA_NOCHE;
}
