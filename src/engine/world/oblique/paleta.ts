/**
 * Paletas de 24 colores por estilo y hora. Cada escenario se pinta solo con su paleta: la prueba 8 lo revisa.
 * Los nombres dicen para qué sirve cada color, así el dibujo se lee sin buscar códigos.
 */

export const NOMBRES = [
  'tinta', 'sombra', 'asfalto', 'asfalto_claro', 'cemento', 'cemento_claro', 'crema', 'luz',
  'amarillo', 'ocre', 'terracota', 'rojo', 'vino', 'salmon', 'menta', 'verde',
  'verde_oscuro', 'celeste', 'cielo', 'azul', 'azul_noche', 'canal', 'oro', 'bruma',
] as const;
export type Color = (typeof NOMBRES)[number];
export type Paleta = Record<Color, string>;

/** Vietnam en la mañana: luz cálida con bruma, paredes pastel gastadas, rojo y oro de letreros y altares. */
export const VIETNAM_MANANA: Paleta = {
  tinta: '#231c28',
  sombra: '#3d3442',
  asfalto: '#57505a',
  asfalto_claro: '#7a7178',
  cemento: '#a39a98',
  cemento_claro: '#cdc3b8',
  crema: '#efe4cb',
  luz: '#fff8e6',
  amarillo: '#f0cc66',
  ocre: '#c4913f',
  terracota: '#a8553a',
  rojo: '#d93a2e',
  vino: '#82242c',
  salmon: '#e2588f',
  menta: '#93cdb0',
  verde: '#4f8f55',
  verde_oscuro: '#2d5a3e',
  celeste: '#8fbfdc',
  cielo: '#d4e8f0',
  azul: '#3f71a3',
  azul_noche: '#283d5e',
  canal: '#5b7a68',
  oro: '#f5b52e',
  bruma: '#e9cfae',
};

/** Para qué sirve cada color en Vietnam: va a la ficha de arte. */
export const USO_VIETNAM: Record<Color, string> = {
  tinta: 'contorno y lo más oscuro',
  sombra: 'sombras hondas, cables, rejas',
  asfalto: 'asfalto del hẻm',
  asfalto_claro: 'asfalto gastado, marcas',
  cemento: 'acera, concreto, sombra de pared clara',
  cemento_claro: 'concreto al sol, baldosa',
  crema: 'pared crema, toldos',
  luz: 'brillos y ropa blanca',
  amarillo: 'pared amarilla, luz de la mañana',
  ocre: 'sombra del amarillo, madera, bambú',
  terracota: 'tejas, óxido, sombra del salmón',
  rojo: 'banderas, sillas plásticas, letreros',
  vino: 'sombra del rojo, altar',
  salmon: 'buganvilla y pitahaya, luz del rojo',
  menta: 'pared verde agua',
  verde: 'matas y buganvilla en hoja',
  verde_oscuro: 'sombra de matas, canal hondo',
  celeste: 'pared celeste, ciudad lejana',
  cielo: 'cielo, vidrio que brilla',
  azul: 'sillas azules, tanque de agua, letreros',
  azul_noche: 'sombra del celeste, vidrio oscuro',
  canal: 'agua turbia del canal y la calle inundada',
  oro: 'dorado del altar, letras, luz encendida',
  bruma: 'bruma del horizonte, cielo bajo',
};

/** Vietnam al mediodía: sol de arriba, sombras cortas y duras, cielo azul limpio y el río color oliva. */
export const VIETNAM_MEDIODIA: Paleta = {
  tinta: '#1f1a22', sombra: '#3a3340', asfalto: '#5a525a', asfalto_claro: '#857c80',
  cemento: '#b0a8a2', cemento_claro: '#ddd5c8', crema: '#f4ead2', luz: '#fffbee',
  amarillo: '#f6d35a', ocre: '#c8963a', terracota: '#b05a36', rojo: '#e0372a',
  vino: '#86242a', salmon: '#e65d93', menta: '#8fd0b0', verde: '#45974f',
  verde_oscuro: '#275a3a', celeste: '#6fb3e6', cielo: '#bfe1f6', azul: '#2f6fb0',
  azul_noche: '#213a5e', canal: '#6b7a52', oro: '#f7b928', bruma: '#e6e8d8',
};

/** Vietnam en la tarde con aguacero: nublado, colores lavados y fríos, ventanas encendidas y charcos. */
export const VIETNAM_TARDE_AGUACERO: Paleta = {
  tinta: '#1c1b24', sombra: '#34333f', asfalto: '#4c4b57', asfalto_claro: '#6e6d78',
  cemento: '#8f8e98', cemento_claro: '#b4b3bb', crema: '#cfcabe', luz: '#e8e6e0',
  amarillo: '#d9b85a', ocre: '#a8843f', terracota: '#94533b', rojo: '#c8392e',
  vino: '#6e2630', salmon: '#c98c80', menta: '#84aba0', verde: '#4c7a56',
  verde_oscuro: '#2c4a3c', celeste: '#7f93a8', cielo: '#a9b6c2', azul: '#3e5f86',
  azul_noche: '#27354d', canal: '#4f6872', oro: '#f2b33a', bruma: '#8b8f9c',
};

/** Vietnam al atardecer: el cielo de violeta a durazno y naranja, todo con la luz cálida de abajo. */
export const VIETNAM_ATARDECER: Paleta = {
  tinta: '#1d1424', sombra: '#3b2640', asfalto: '#54404f', asfalto_claro: '#7d6270',
  cemento: '#a8848a', cemento_claro: '#d4b4a8', crema: '#f2d8bc', luz: '#fff2d8',
  amarillo: '#ffd166', ocre: '#d98c3a', terracota: '#b9472f', rojo: '#e63b2e',
  vino: '#8a2433', salmon: '#f49a7a', menta: '#88c4a8', verde: '#3f8f4e',
  verde_oscuro: '#24553a', celeste: '#7a6fb0', cielo: '#f6b08a', azul: '#3d5ea8',
  azul_noche: '#262c5c', canal: '#5a6b8a', oro: '#ffb52e', bruma: '#f58a5a',
};

/** La paleta del estilo vietnam para una hora y un clima. */
export function paletaVietnam(hora: string, clima: string[] = []): Paleta {
  if (hora === 'mediodia') return VIETNAM_MEDIODIA;
  if (hora === 'tarde' || hora === 'aguacero' || hora === 'nublado' || clima[0] === 'aguacero') return hora === 'manana' ? VIETNAM_MANANA : VIETNAM_TARDE_AGUACERO;
  if (hora === 'atardecer') return VIETNAM_ATARDECER;
  return VIETNAM_MANANA;
}

/** Para qué sirven los colores del cielo según la hora (el resto de los usos no cambia). */
export const USO_CIELO: Record<string, Partial<Record<Color, string>>> = {
  mediodia: { celeste: 'cielo alto, pared celeste', cielo: 'cielo bajo, vidrio que brilla', bruma: 'calima del mediodía', canal: 'agua del río, color oliva' },
  tarde: { celeste: 'nubes de aguacero', cielo: 'claros entre nubes', bruma: 'cortina de lluvia, ciudad lejana', canal: 'charcos', oro: 'ventanas encendidas' },
  atardecer: { celeste: 'violeta del cielo alto', cielo: 'durazno del cielo', bruma: 'naranja del horizonte', terracota: 'pista roja', oro: 'luz del sol bajo y reflectores' },
};
