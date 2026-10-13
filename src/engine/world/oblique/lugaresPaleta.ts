import type { Color, Paleta } from './paleta';

/**
 * Las paletas de los lugares del lote E4a. Cada una es la de un solo lugar a su hora, con los mismos 24 nombres de
 * siempre: se eligen por el fondo (`paralaje.cerca`), así las otras horas de Vietnam y la mañana de Colombia no cambian.
 */

/**
 * El dojo de Hà Nội en la tarde (estilo `vietnam_dojo`): la madera clara de las paredes, el tatami verde y amarillo, el
 * rojo de la bandera y de la caligrafía, y por las ventanas el lago Hoàn Kiếm color jade con la luz de miel de la tarde.
 * `canal` es el jade del lago, `salmon` la piel y la luz cálida, `azul` el judogi azul.
 */
export const VIETNAM_DOJO_TARDE: Paleta = {
  tinta: '#1c1418',
  sombra: '#3c2c28',
  asfalto: '#5e4838',
  asfalto_claro: '#82664c',
  cemento: '#a88a68',
  cemento_claro: '#cdb088',
  crema: '#efd8ae',
  luz: '#fff6e2',
  amarillo: '#dcbc58',
  ocre: '#b8863c',
  terracota: '#965834',
  rojo: '#d63a2c',
  vino: '#7a2228',
  salmon: '#e2a07c',
  menta: '#8fc77a',
  verde: '#4f9a4c',
  verde_oscuro: '#2c5a36',
  celeste: '#a8c8d4',
  cielo: '#f4dcb0',
  azul: '#2f5a9a',
  azul_noche: '#24304c',
  canal: '#6c9c86',
  oro: '#f6b23a',
  bruma: '#e6caa0',
};

export const USO_DOJO: Record<Color, string> = {
  tinta: 'contorno, lo más oscuro, la tinta de la caligrafía',
  sombra: 'madera en sombra, el pelo, las juntas hondas',
  asfalto: 'vigas y marcos de madera oscura',
  asfalto_claro: 'madera media en sombra, la orilla del tatami',
  cemento: 'madera de los paneles en sombra',
  cemento_claro: 'los paneles de madera clara',
  crema: 'la pared de arriba, el papel de la caligrafía',
  luz: 'el judogi blanco, los rayos de sol, brillos',
  amarillo: 'el tatami amarillo de la zona de seguridad, la estrella',
  ocre: 'madera dorada, el borde del tatami amarillo',
  terracota: 'madera rojiza, tejas de la ciudad vieja por la ventana',
  rojo: 'la bandera de Vietnam, el sello de la caligrafía, el puente Thê Húc',
  vino: 'sombra del rojo, cinturones',
  salmon: 'la piel, la luz cálida de la tarde',
  menta: 'el tatami verde con luz, los sauces con sol',
  verde: 'el tatami verde de la zona de combate, los sauces',
  verde_oscuro: 'las juntas del tatami, los árboles del lago',
  celeste: 'el cielo alto por la ventana',
  cielo: 'el cielo de miel de la tarde',
  azul: 'el judogi azul',
  azul_noche: 'el pantalón oscuro, el vidrio en sombra',
  canal: 'el agua jade del lago Hoàn Kiếm',
  oro: 'el sol de la tarde, la estrella de la bandera',
  bruma: 'la bruma del lago, la ciudad lejos',
};

/**
 * El parque Tao Đàn al amanecer (estilo `vietnam_parque`): el cielo rosado y durazno, la luz de oro que entra en rayos
 * entre los árboles dầu enormes, los troncos claros, el verde fresco y la tierra de la cancha. `canal` es la ciudad en la
 * bruma, `salmon` el rosado del cielo.
 */
export const VIETNAM_TAODAN_AMANECER: Paleta = {
  tinta: '#1e1824',
  sombra: '#3a3040',
  asfalto: '#5a4c56',
  asfalto_claro: '#7e6c70',
  cemento: '#a8968e',
  cemento_claro: '#d0c0ae',
  crema: '#f2e2c4',
  luz: '#fff6e4',
  amarillo: '#f6d27a',
  ocre: '#c8945a',
  terracota: '#a6603e',
  rojo: '#d8483a',
  vino: '#7c2e34',
  salmon: '#f0a28a',
  menta: '#a6cc9a',
  verde: '#5a9058',
  verde_oscuro: '#2c5440',
  celeste: '#9cb8d8',
  cielo: '#f4d0b4',
  azul: '#4a68a0',
  azul_noche: '#2c3a5c',
  canal: '#8a94b4',
  oro: '#f6b04a',
  bruma: '#e8c6b6',
};

export const USO_TAODAN: Record<Color, string> = {
  tinta: 'contorno, lo más oscuro',
  sombra: 'sombra honda del follaje, las jaulas',
  asfalto: 'la corteza en sombra, el hierro de la reja',
  asfalto_claro: 'la corteza, los bancos en sombra',
  cemento: 'los troncos de los dầu, el camino',
  cemento_claro: 'los troncos con luz, los bancos de piedra',
  crema: 'la ropa clara del tai chi, el camino con sol',
  luz: 'el sol, los rayos de luz, la raya de la cancha',
  amarillo: 'los rayos de sol, el sol del amanecer',
  ocre: 'la tierra apisonada con luz',
  terracota: 'la tierra roja de la cancha',
  rojo: 'el abanico del tai chi, las sillas, la bandera',
  vino: 'sombra del rojo, la tierra en sombra',
  salmon: 'el cielo rosado, la piel',
  menta: 'el follaje con luz, el pasto con sol',
  verde: 'el follaje y el pasto',
  verde_oscuro: 'el follaje en sombra, los setos',
  celeste: 'el cielo alto de la mañana',
  cielo: 'el cielo durazno, el horizonte',
  azul: 'la ropa azul, las jaulas pintadas',
  azul_noche: 'sombra del azul',
  canal: 'las torres de la ciudad en la bruma',
  oro: 'el sol, la luz en el borde de las hojas',
  bruma: 'la bruma rosada del amanecer',
};

/**
 * La cancha de tejo de La Candelaria en la tarde nublada (estilo `colombia_colonial`): la cal de las paredes, la madera
 * del techo y de los pilares, la greda, el gris del cielo con llovizna, el verde de Monserrate y las puertas coloniales,
 * los colores de la bandera en los banderines y la luz tibia de los bombillos. `canal` es el gris frío de la llovizna.
 */
export const COLOMBIA_CANDELARIA_TARDE: Paleta = {
  tinta: '#1e1a1e',
  sombra: '#3a3232',
  asfalto: '#56504c',
  asfalto_claro: '#78706a',
  cemento: '#9c968e',
  cemento_claro: '#c4beb4',
  crema: '#e8e2d4',
  luz: '#f8f6ee',
  amarillo: '#f2c838',
  ocre: '#b08048',
  terracota: '#8a5030',
  rojo: '#cc3a2e',
  vino: '#6a2a26',
  salmon: '#d68c6a',
  menta: '#76b098',
  verde: '#3e7a4c',
  verde_oscuro: '#264a34',
  celeste: '#8ea6b8',
  cielo: '#b6c2ca',
  azul: '#2c4c9a',
  azul_noche: '#2a3446',
  canal: '#647480',
  oro: '#f0a040',
  bruma: '#a6aeb2',
};

export const USO_CANDELARIA: Record<Color, string> = {
  tinta: 'contorno, lo más oscuro',
  sombra: 'madera en sombra, las juntas hondas',
  asfalto: 'vigas del techo, el hierro, la ruana oscura',
  asfalto_claro: 'la madera gastada en sombra, el piso de cemento',
  cemento: 'el piso de cemento, la pared en sombra',
  cemento_claro: 'la pared de cal en sombra, las nubes',
  crema: 'la cal de las paredes coloniales',
  luz: 'brillos, la iglesia de Monserrate, la mecha',
  amarillo: 'el amarillo de la bandera y los banderines',
  ocre: 'la madera clara de los pilares y las bancas',
  terracota: 'la madera del techo, la teja de barro',
  rojo: 'el rojo de la bandera, la ruana roja',
  vino: 'sombra del rojo, la teja en sombra',
  salmon: 'la teja clara, la piel, la greda mojada',
  menta: 'las puertas y ventanas verdes coloniales',
  verde: 'las matas, Monserrate con luz',
  verde_oscuro: 'Monserrate, la sombra de las matas',
  celeste: 'las nubes grises con luz',
  cielo: 'el cielo nublado de Bogotá',
  azul: 'el azul de la bandera, las puertas azules',
  azul_noche: 'sombra del azul, el vidrio',
  canal: 'la llovizna, la sombra fría de afuera',
  oro: 'los bombillos encendidos, la llama de la mecha',
  bruma: 'la neblina en los cerros',
};
