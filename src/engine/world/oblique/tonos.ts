import type { Color } from './paleta';

/** Un tono más claro de la paleta (la cara que da a la luz). */
export const MAS_CLARO: Record<Color, Color> = {
  tinta: 'sombra', sombra: 'asfalto', asfalto: 'asfalto_claro', asfalto_claro: 'cemento', cemento: 'cemento_claro', cemento_claro: 'crema', crema: 'luz', luz: 'luz',
  amarillo: 'crema', ocre: 'amarillo', terracota: 'ocre', rojo: 'oro', vino: 'rojo', salmon: 'crema', menta: 'cielo', verde: 'menta',
  verde_oscuro: 'verde', celeste: 'cielo', cielo: 'luz', azul: 'celeste', azul_noche: 'azul', canal: 'celeste', oro: 'amarillo', bruma: 'luz',
};
/** Un tono más oscuro (el pie de una cara, la sombra). */
export const MAS_OSCURO: Record<Color, Color> = {
  tinta: 'tinta', sombra: 'tinta', asfalto: 'sombra', asfalto_claro: 'asfalto', cemento: 'asfalto_claro', cemento_claro: 'cemento', crema: 'cemento_claro', luz: 'crema',
  amarillo: 'ocre', ocre: 'terracota', terracota: 'vino', rojo: 'vino', vino: 'sombra', salmon: 'terracota', menta: 'verde', verde: 'verde_oscuro',
  verde_oscuro: 'tinta', celeste: 'azul', cielo: 'celeste', azul: 'azul_noche', azul_noche: 'tinta', canal: 'verde_oscuro', oro: 'ocre', bruma: 'cemento_claro',
};
