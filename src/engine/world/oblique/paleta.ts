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
  salmon: '#ec9f8c',
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
  salmon: 'pared rosada',
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
