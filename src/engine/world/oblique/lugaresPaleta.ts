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

// ---------------------------------------------------------------------------------------------------------------------
// Lote E5: los escenarios de los cuatro deportes de pelota

/**
 * Playa El Agua, isla de Margarita, al mediodía (estilo `venezuela_playa`): la arena clarita, el mar Caribe turquesa
 * que se oscurece hacia el horizonte, el cielo azul limpio, el verde de las palmas y los colores de los toldos.
 * `menta` es el agua turquesa de la orilla y `canal` el mar hondo.
 */
export const VENEZUELA_MARGARITA_MEDIODIA: Paleta = {
  tinta: '#1c1820',
  sombra: '#3a3238',
  asfalto: '#5e5450',
  asfalto_claro: '#8a7a6a',
  cemento: '#b8a68c',
  cemento_claro: '#dccaa6',
  crema: '#f2e4c2',
  luz: '#fffcf0',
  amarillo: '#f6d25a',
  ocre: '#c8963e',
  terracota: '#a65a36',
  rojo: '#e0403a',
  vino: '#80282c',
  salmon: '#f08a74',
  menta: '#5ad8c8',
  verde: '#4c9a3e',
  verde_oscuro: '#255a32',
  celeste: '#5ab4ec',
  cielo: '#b4e0f8',
  azul: '#2a62b8',
  azul_noche: '#1e3a6a',
  canal: '#1f8eaa',
  oro: '#f7a828',
  bruma: '#e2f0ee',
};

export const USO_MARGARITA: Record<Color, string> = {
  tinta: 'contorno, lo más oscuro',
  sombra: 'sombra honda debajo de los toldos y del kiosco',
  asfalto: 'la arena mojada en sombra, el tronco de las palmas en sombra',
  asfalto_claro: 'los troncos de las palmas, la madera gastada',
  cemento: 'la arena en sombra, el cerro seco',
  cemento_claro: 'la arena con sombrita, las huellas',
  crema: 'la arena seca al sol',
  luz: 'la espuma de las olas, el sol, la tela blanca',
  amarillo: 'los toldos amarillos, la arena con sol',
  ocre: 'el techo de palma del kiosco, los cocos',
  terracota: 'la madera del kiosco, los cocos secos',
  rojo: 'los toldos rojos, la bandera',
  vino: 'sombra del rojo',
  salmon: 'la piel, las flores',
  menta: 'el agua turquesa de la orilla',
  verde: 'las hojas de las palmas, el cerro con luz',
  verde_oscuro: 'las hojas en sombra, el cerro',
  celeste: 'el cielo alto del mediodía',
  cielo: 'el cielo bajo, el agua que brilla',
  azul: 'los toldos azules, la bandera, el mar en sombra',
  azul_noche: 'sombra del azul, el horizonte del mar',
  canal: 'el mar Caribe hondo',
  oro: 'el sol en el agua, las empanadas fritas',
  bruma: 'la calima del horizonte',
};

/**
 * La cancha de arcilla de Đà Lạt en la mañana con neblina (estilo `vietnam_montana`): la arcilla roja de la cancha, el
 * verde oscuro de los pinos, la neblina gris azulada de la montaña, el lago Xuân Hương, las villas coloniales crema con
 * techo de teja y las hortensias. `canal` es el agua del lago y `bruma` la neblina.
 */
export const VIETNAM_DALAT_MANANA: Paleta = {
  tinta: '#1a1c22',
  sombra: '#2e3634',
  asfalto: '#4a524c',
  asfalto_claro: '#6e7670',
  cemento: '#9aa09a',
  cemento_claro: '#c6cac2',
  crema: '#ece6d4',
  luz: '#fafaf2',
  amarillo: '#f0d066',
  ocre: '#d08a52',
  terracota: '#b0582e',
  rojo: '#cc3c32',
  vino: '#7a3026',
  salmon: '#e89c8a',
  menta: '#9cc8a8',
  verde: '#4e8456',
  verde_oscuro: '#264634',
  celeste: '#a8c4d6',
  cielo: '#d6e2e6',
  azul: '#5a7cb0',
  azul_noche: '#2e3e58',
  canal: '#7894a0',
  oro: '#f2b04c',
  bruma: '#dfe4e2',
};

export const USO_DALAT: Record<Color, string> = {
  tinta: 'contorno, lo más oscuro',
  sombra: 'sombra honda de los pinos',
  asfalto: 'la malla de la cancha, el hierro',
  asfalto_claro: 'los parales de la malla, la corteza en sombra',
  cemento: 'los pinos lejos en la neblina, el concreto',
  cemento_claro: 'la neblina con sombra, el concreto con luz',
  crema: 'las villas coloniales, la ropa clara',
  luz: 'las rayas de la cancha, la ropa blanca de tenis',
  amarillo: 'las mimosas, el sol entre la neblina',
  ocre: 'la arcilla barrida con luz',
  terracota: 'la arcilla roja de la cancha, las tejas',
  rojo: 'las tejas de las villas, las banderas',
  vino: 'la arcilla en sombra, la corteza de los pinos',
  salmon: 'la catedral, las hortensias rosadas, la piel',
  menta: 'los pinos con luz, el pasto',
  verde: 'los pinos, el pasto',
  verde_oscuro: 'los pinos en sombra, la malla verde',
  celeste: 'el cielo, las hortensias claras',
  cielo: 'el cielo bajo de la mañana',
  azul: 'las hortensias azules, la ropa azul',
  azul_noche: 'sombra del azul',
  canal: 'el agua del lago Xuân Hương',
  oro: 'la luz del sol en el borde de la neblina',
  bruma: 'la neblina de la montaña',
};

/**
 * La calle del Carnaval de Barranquilla al mediodía (estilo `colombia_caribe`): las casas de colores del Barrio Abajo,
 * los palcos, las guirnaldas y los colores del Carnaval (rojo, amarillo, verde, azul, morado y naranja), el cielo azul
 * del Caribe y el asfalto caliente con el confeti. `canal` es el morado del Carnaval.
 */
export const COLOMBIA_BARRANQUILLA_MEDIODIA: Paleta = {
  tinta: '#1e161c',
  sombra: '#3c2c34',
  asfalto: '#5a5258',
  asfalto_claro: '#7c7478',
  cemento: '#a49c98',
  cemento_claro: '#cec6bc',
  crema: '#f4ead6',
  luz: '#fffbf2',
  amarillo: '#fcd03a',
  ocre: '#e08c2c',
  terracota: '#b45a30',
  rojo: '#e43434',
  vino: '#86223a',
  salmon: '#f47aa8',
  menta: '#3cc8b4',
  verde: '#3ca448',
  verde_oscuro: '#1e6036',
  celeste: '#4eaaf0',
  cielo: '#a8d8fa',
  azul: '#2a52c8',
  azul_noche: '#22306a',
  canal: '#9a4cc8',
  oro: '#ff9a1e',
  bruma: '#dceaf0',
};

export const USO_BARRANQUILLA: Record<Color, string> = {
  tinta: 'contorno, lo más oscuro',
  sombra: 'sombra honda de las puertas y los palcos',
  asfalto: 'el asfalto de la calle',
  asfalto_claro: 'el asfalto con sol, el hierro de los palcos',
  cemento: 'el andén, la piedra de los arcos en sombra',
  cemento_claro: 'la piedra de los arcos, el andén con sol',
  crema: 'las paredes claras, las columnas',
  luz: 'la maicena, las rayas de tiza, brillos',
  amarillo: 'la casa amarilla, las guirnaldas, la bandera',
  ocre: 'la casa naranja, la madera de los palcos',
  terracota: 'las tejas, la madera en sombra',
  rojo: 'el rojo del Carnaval y de la bandera',
  vino: 'sombra del rojo',
  salmon: 'la casa rosada, la piel, las flores',
  menta: 'la casa turquesa',
  verde: 'el verde del Carnaval y de la bandera, las matas',
  verde_oscuro: 'sombra del verde, las palmas',
  celeste: 'el cielo alto del Caribe',
  cielo: 'el cielo bajo, los vidrios',
  azul: 'el azul de la bandera de Colombia, las puertas',
  azul_noche: 'sombra del azul',
  canal: 'el morado del Carnaval',
  oro: 'el naranja del Carnaval, el sol',
  bruma: 'la calima del mediodía',
};

/**
 * La cancha de barrio de Maracaibo de noche (estilo `venezuela_lago`): el cielo de noche con el resplandor de la
 * ciudad, el Lago oscuro con el puente General Rafael Urdaneta encendido y los mechurrios, el relámpago del Catatumbo
 * (blanco y violeta), los bombillos de sodio de la cancha y el concreto pintado de la cancha. `salmon` es el violeta
 * rosado del relámpago, `canal` la nube de tormenta y `celeste` el azul de la cancha.
 */
export const VENEZUELA_MARACAIBO_NOCHE: Paleta = {
  tinta: '#0c0a16',
  sombra: '#1c1a30',
  asfalto: '#2e2c46',
  asfalto_claro: '#4a4864',
  cemento: '#6c6a84',
  cemento_claro: '#9a96ac',
  crema: '#cfc8d0',
  luz: '#fff8e4',
  amarillo: '#ffd84a',
  ocre: '#e09a36',
  terracota: '#a0583a',
  rojo: '#e83a3c',
  vino: '#6e2440',
  salmon: '#e48ad8',
  menta: '#48c8b0',
  verde: '#2e7a5a',
  verde_oscuro: '#1a3a34',
  celeste: '#4a78c0',
  cielo: '#34428a',
  azul: '#202e66',
  azul_noche: '#10163a',
  canal: '#5a3e96',
  oro: '#ffb43a',
  bruma: '#4a3e78',
};

export const USO_MARACAIBO: Record<Color, string> = {
  tinta: 'contorno, lo más oscuro',
  sombra: 'la noche honda, el agua del Lago',
  asfalto: 'la malla de la cancha, el Lago con sombra',
  asfalto_claro: 'los tubos de la malla, la otra orilla',
  cemento: 'el concreto de las gradas',
  cemento_claro: 'el puente de concreto, el muro con luz',
  crema: 'el muro alumbrado por los bombillos',
  luz: 'el corazón del relámpago, los bombillos, las rayas de la cancha',
  amarillo: 'las luces del puente y de la ciudad, la bandera',
  ocre: 'la luz de sodio en el piso, los mechurrios',
  terracota: 'el ladrillo, el óxido',
  rojo: 'las luces rojas de las torres del puente y los balancines, la bandera',
  vino: 'sombra del rojo',
  salmon: 'el violeta rosado del relámpago del Catatumbo',
  menta: 'el mural, la franja de la cancha',
  verde: 'el concreto pintado de verde alrededor de la cancha',
  verde_oscuro: 'sombra del verde, las matas',
  celeste: 'el azul de la cancha',
  cielo: 'el cielo bajo, las nubes con luz',
  azul: 'el cielo del medio, la bandera',
  azul_noche: 'el cielo alto',
  canal: 'la nube de tormenta del Catatumbo',
  oro: 'los bombillos de sodio, las ventanas',
  bruma: 'el resplandor de la ciudad en el cielo',
};

// ---------------------------------------------------------------------------------------------------------------------
// Lote E6: los escenarios de las seis pruebas que seguían pintadas por código

/**
 * El valle de Cocora, en el Eje Cafetero, en la mañana (estilo `colombia_cafetera`): el verde vivo del valle, las
 * palmas de cera con el tronco gris claro y los anillos, la neblina que baja de las montañas, el tartán rojo de la pista
 * y los colores de las fincas de Salento. `canal` es la montaña lejana azul verdosa y `bruma` la neblina.
 */
export const COLOMBIA_COCORA_MANANA: Paleta = {
  tinta: '#1a1c1e',
  sombra: '#2e3a34',
  asfalto: '#4a5248',
  asfalto_claro: '#767e70',
  cemento: '#a8aa9c',
  cemento_claro: '#d8d6c8',
  crema: '#f0ead6',
  luz: '#fbfaf2',
  amarillo: '#f2cf4a',
  ocre: '#c79a48',
  terracota: '#a8553c',
  rojo: '#cc4a34',
  vino: '#7a2a2c',
  salmon: '#e88a72',
  menta: '#9ed6a0',
  verde: '#5aa44a',
  verde_oscuro: '#2e6a3a',
  celeste: '#8cc4e4',
  cielo: '#cfe6f0',
  azul: '#3a6aa8',
  azul_noche: '#26425e',
  canal: '#5e8a8a',
  oro: '#f6b23a',
  bruma: '#e4ece6',
};

export const USO_COCORA: Record<Color, string> = {
  tinta: 'contorno, lo más oscuro',
  sombra: 'la sombra honda del monte y de la cerca',
  asfalto: 'los anillos del tronco de las palmas, el caucho del Willys',
  asfalto_claro: 'el tronco de las palmas en sombra, el alambre de la cerca',
  cemento: 'el tronco de las palmas a media luz, las vacas',
  cemento_claro: 'el tronco de las palmas con luz, la cera',
  crema: 'las paredes encaladas de la finca',
  luz: 'las rayas de la pista, la neblina con sol',
  amarillo: 'el balcón amarillo, las flores, el loro orejiamarillo',
  ocre: 'la madera de la cerca y del letrero, los bultos de café',
  terracota: 'las tejas de barro, el tartán en sombra',
  rojo: 'el tartán de la pista, las cerezas del café, la puerta',
  vino: 'sombra del rojo y de las tejas',
  salmon: 'la piel, las flores rosadas',
  menta: 'el pasto con luz',
  verde: 'el pasto del valle, las hojas del café',
  verde_oscuro: 'el monte, las hojas de las palmas',
  celeste: 'el cielo alto',
  cielo: 'el cielo bajo de la mañana',
  azul: 'el balcón azul, el Willys',
  azul_noche: 'la montaña de más atrás',
  canal: 'las montañas lejanas azul verdosas',
  oro: 'el sol de la mañana, el plátano maduro',
  bruma: 'la neblina que baja de las montañas',
};

/**
 * La bahía de Hạ Long al mediodía (estilo `vietnam_bahia`): el agua esmeralda de la bahía, la piedra caliza gris de los
 * islotes con su monte verde encima, el azul de la piscina flotante, la madera del muelle y el rojo de las banderas y
 * de las velas de los juncos. `canal` es el esmeralda de la bahía y `azul` el agua de la piscina.
 */
export const VIETNAM_HALONG_MEDIODIA: Paleta = {
  tinta: '#161c22',
  sombra: '#2a3a40',
  asfalto: '#4a5658',
  asfalto_claro: '#768486',
  cemento: '#a0aaa8',
  cemento_claro: '#ccd4d0',
  crema: '#efe6d0',
  luz: '#fbfcf6',
  amarillo: '#f4d24a',
  ocre: '#c8964a',
  terracota: '#9a5a36',
  rojo: '#d8402e',
  vino: '#7a2e26',
  salmon: '#e89a7a',
  menta: '#7ad6c0',
  verde: '#4c9a54',
  verde_oscuro: '#2a5e3e',
  celeste: '#7cc0e4',
  cielo: '#c4e2f0',
  azul: '#2a78b4',
  azul_noche: '#1e4268',
  canal: '#2e9a92',
  oro: '#f2a83a',
  bruma: '#dce8e8',
};

export const USO_HALONG: Record<Color, string> = {
  tinta: 'contorno, lo más oscuro',
  sombra: 'la sombra honda de los islotes y del muelle',
  asfalto: 'la piedra caliza en sombra, el casco de los juncos',
  asfalto_claro: 'la piedra caliza a media luz',
  cemento: 'la piedra caliza con luz, los islotes lejanos',
  cemento_claro: 'la piedra con sol, los islotes en la calima',
  crema: 'las casitas de la aldea flotante, la lona',
  luz: 'la espuma, el borde de la piscina, las rayas',
  amarillo: 'la estrella de la bandera, las franjas de la pared de llegada',
  ocre: 'la madera del muelle con sol, las velas con luz',
  terracota: 'la madera del muelle, las velas de los juncos',
  rojo: 'la bandera de Vietnam, las corcheras',
  vino: 'sombra del rojo y de las velas',
  salmon: 'la piel',
  menta: 'el agua esmeralda bajita, el reflejo',
  verde: 'el monte de los islotes con luz',
  verde_oscuro: 'el monte de los islotes en sombra',
  celeste: 'el cielo alto, el agua de la piscina con luz',
  cielo: 'el cielo bajo, la calima',
  azul: 'el agua de la piscina',
  azul_noche: 'el agua honda de la piscina, la sombra del azul',
  canal: 'el agua esmeralda de la bahía',
  oro: 'el sol en el agua, la vela con sol',
  bruma: 'la calima de la bahía',
};
