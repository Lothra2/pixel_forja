import type { ObliqueLayout } from './layout';
import { boxesOf } from './layout';
import { NOMBRES, USO_VIETNAM, USO_CIELO, VIETNAM_MANANA, paletaVietnam, type Paleta } from './paleta';
import { COLOMBIA_MANANA, USO_COLOMBIA, paletaColombia } from './colombiaPaleta';
import { VENEZUELA_NOCHE, USO_VENEZUELA, HORAS_VENEZUELA, paletaVenezuela } from './venezuelaPaleta';
import { VIETNAM_HOIAN_NOCHE, USO_HOIAN, HORAS_HOIAN } from './hoianPaleta';
import { VIETNAM_DOJO_TARDE, USO_DOJO, VIETNAM_TAODAN_AMANECER, USO_TAODAN, COLOMBIA_CANDELARIA_TARDE, USO_CANDELARIA } from './lugaresPaleta';
import { lugarDe } from './lugares';

/**
 * Ficha de arte de un escenario: la puerta 1 del pedido. Paleta de 24 colores, de 8 a 12 elementos icónicos y los
 * detalles de vida, más qué dibujo va en cada caja del layout. Se arma desde el layout y el estilo del país.
 */
export interface Icono { id: string; nombre: string; donde: string }
export interface Vida { id: string; detalle: string }
export interface FichaArte {
  id: string;
  nombre: string;
  estilo: string;
  hora: string;
  paleta: { nombre: string; hex: string; uso: string }[];
  iconos: Icono[];
  vida: Vida[];
  cajas: { tipo: string; medida: string; dibujo: string; cuantas: number }[];
  letreros: string[];
}

interface Estilo {
  paleta: Paleta;
  /** La paleta a la hora y con el clima del layout. */
  paletaDe?: (hora: string, clima: string[]) => Paleta;
  /** Íconos y letreros por lugar (`paralaje.cerca`), cuando no son los de siempre. */
  lugares?: Record<string, { iconos: Icono[]; letreros: string[] }>;
  uso: Record<string, string>;
  iconos: Icono[];
  vida: Record<string, string>;
  cajas: Record<string, string>;
  letreros: string[];
  /** Las horas que el estilo ya sabe pintar. Sin la lista, todas. */
  horas?: string[];
}

const VIETNAM: Estilo = {
  paleta: VIETNAM_MANANA,
  paletaDe: paletaVietnam,
  uso: USO_VIETNAM,
  iconos: [
    { id: 'casa_tubo', nombre: 'Casas tubo angostas de 3 a 5 pisos', donde: 'cerca: la fila de fachadas de todo el tramo' },
    { id: 'tienda', nombre: 'Planta baja con tienda: tạp hóa, phở, café, taller de motos', donde: 'cerca, con letrero de texto real' },
    { id: 'reja', nombre: 'Rejas plegables (cửa xếp)', donde: 'cerca, en las casas cerradas' },
    { id: 'altar', nombre: 'Altar de la tierra con incienso', donde: 'cerca, al pie de las casas' },
    { id: 'cables', nombre: 'Cables enredados y postes de luz', donde: 'cerca y frente: de poste a poste y a las casas' },
    { id: 'motos', nombre: 'Motos tipo Cub paradas', donde: 'caja moto_estacionada y garajes' },
    { id: 'sillas', nombre: 'Sillas y mesas plásticas rojas y azules', donde: 'caja mesas_plasticas y los cafés' },
    { id: 'banhmi', nombre: 'Carrito de bánh mì', donde: 'caja puesto_banhmi' },
    { id: 'ba_gac', nombre: 'Xe ba gác, el triciclo de carga', donde: 'caja carro' },
    { id: 'balcones', nombre: 'Balcones con matas, buganvilla, aires y ropa tendida', donde: 'cerca, pisos de arriba' },
    { id: 'tanques', nombre: 'Tanques de agua de acero', donde: 'techos y la caja tanque_agua' },
    { id: 'ciudad', nombre: 'Landmark 81 y Bitexco en la bruma', donde: 'lejos' },
  ],
  vida: {
    motos_fondo: 'Motos que cruzan al fondo del hẻm, de un lado al otro',
    ropa_tendida: 'Ropa tendida que se mueve con el viento, 2 cuadros',
    palomas: 'Palomas paradas en los cables y el piso, que salen volando',
    cables_viento: 'Cables que se mecen apenas, 2 cuadros',
    incienso: 'Humo del incienso de los altares',
    vendedoras_pregonando: 'Vendedoras detrás de los puestos que levantan la mano y pregonan, 2 cuadros',
    toldos_viento: 'Las lonas y la ropa colgada de los puestos que se mecen, 2 cuadros',
    jacintos_flotando: 'Matas de jacinto que bajan con la corriente del río',
    agua_animada: 'Rayas de la corriente y brillos que corren en el río, 4 cuadros',
    ferry: 'El ferry que va y viene entre los muelles (entidad vehiculo: lo dibuja D2)',
    botes_bambu: 'Thúng chai que se mecen en la orilla, 2 cuadros',
    lluvia: 'Aguacero: rayas de lluvia (efecto lluvia del kit) y salpicaduras en los charcos',
    ropa_viento: 'Ropa tendida que se sacude con el viento del aguacero, 2 cuadros',
    charcos_crecen: 'Los charcos se agrandan con anillos de gotas',
    publico_ondeando: 'El público de las gradas que se para y ondea banderas, 2 cuadros',
    banderas: 'Banderas de Vietnam en las astas de afuera, 2 cuadros',
    fuegos_artificiales: 'Fuegos artificiales en el cielo del atardecer cuando alguien llega a la meta',
  },
  cajas: {
    carro: 'Xe ba gác: plataforma de tablas a la altura de la caja, ruedas abajo y la moto adelante',
    puesto_banhmi: 'Carrito de bánh mì: vitrina con los panes y el letrero BÁNH MÌ',
    cajas: 'Guacales verdes de cerveza. Con dos capas, cajas de anime arriba',
    moto_estacionada: 'Dos motos Cub, con el asiento a la altura de la caja',
    mesas_plasticas: 'Bajas: mesitas azules con banquitos. Altas: columnas de banquitos rojos',
    tanque_agua: 'Tanque de acero parado, con anillos y tapa',
    kiosco: 'Kiosco de lámina de tarjetas de teléfono (SIM THẺ)',
    muro_bajo: 'Muro repellado con el ladrillo pelado y moho abajo',
    muro_alto: 'Muro con tejas y vidrios rotos arriba, y el portón de hierro plegado contra el frente',
    porton_mercado: 'Pilar de repello amarillo de Bến Thành con cornisa de teja y remate. Sobre el paso, el arco con la placa CỬA NAM',
    puesto_ropa: 'Fila de puestos altos con camisas y áo dài en ganchos, mostrador de madera y la placa del puesto',
    puesto_flores: 'Ramos en baldes de lata y una guirnalda de cempasúchil',
    puesto_telas: 'Rollos de tela en estantes y pañuelos colgados',
    puesto_comida: 'Tablero del menú (BÚN BÒ, CƠM, PHỞ), ollas con vapor y mostrador',
    puesto_recuerdos: 'Nón lá colgados, cajitas lacadas rojas y franelas',
    puesto_cafe: 'Sacos de café abiertos, latas y filtros phin, letrero CÀ PHÊ',
    puesto_frutas: 'Canastos de thanh long, mango, chôm chôm y măng cụt sobre una tarima, con el precio en cartón',
    sacos_arroz: 'Sacos de fique abiertos con el arroz y un cucharón',
    cubos_flores: 'Baldes de lata llenos de flores',
    canastas: 'Canastas de bambú con verduras, ají y limones',
    carrito_cafe: 'Carrito rojo de cà phê sữa đá con los vasos, el termo y dos ruedas',
    banca: 'Banca del malecón: tablas de madera sobre patas de hierro verde',
    carrito_che: 'Carrito de chè con los frascos de colores en capas',
    escalon: 'Escalón de concreto con el canto gastado',
    muelle: 'Muelle de tablas sobre pilotes, con bitas de amarre y llantas de defensa',
    bote_bambu: 'Thúng chai: bote redondo de bambú tejido, embreado abajo, con su remo',
    cajas_pescado: 'Cajas de icopor con pescado sobre hielo',
    aire_acondicionado: 'Unidad de aire acondicionado con el ventilador redondo',
    macetas: 'Materas de barro con matas y buganvilla',
    caseta_escalera: 'Caseta de la escalera de la azotea: puerta de lámina azul, ventanita y repello mojado',
    porton_estadio: 'Pilar de concreto con franjas azules. Sobre el paso, el arco con la placa VÀO',
    valla: 'Una valla de atletismo por carril, calada: barra a rayas y patas',
  },
  letreros: ['TẠP HÓA', 'PHỞ 24', 'CÀ PHÊ SỮA ĐÁ', 'SỬA XE', 'BÁNH MÌ', 'CƠM TẤM', 'GỘI ĐẦU', 'NHÀ THUỐC', 'SIM THẺ'],
};

VIETNAM.lugares = {
  benthanh: {
    iconos: [
      { id: 'torre_reloj', nombre: 'La torre del reloj de Bến Thành con CHỢ BẾN THÀNH y la bandera', donde: 'cerca, sobre la entrada (x del portón)' },
      { id: 'fachada', nombre: 'Fachada amarilla con ventanas de arco y techo de teja', donde: 'cerca, calle Lê Lợi' },
      { id: 'arboles', nombre: 'Árboles de Lê Lợi con su seto', donde: 'cerca, antes del mercado' },
      { id: 'techo', nombre: 'Techo de lámina con claraboya y cerchas de acero', donde: 'cerca, adentro del mercado' },
      { id: 'zonas', nombre: 'Letreros de zona colgados: QUẦN ÁO, HOA TƯƠI, VẢI, ĂN UỐNG, LƯU NIỆM, CÀ PHÊ', donde: 'cerca, sobre cada fila de puestos' },
      { id: 'puestos_fondo', nombre: 'Puestos del fondo con estantes llenos, placa numerada y mostrador', donde: 'cerca, adentro' },
      { id: 'columnas', nombre: 'Columnas pintadas de verde abajo', donde: 'cerca, cada 400 px' },
      { id: 'puestos', nombre: 'Filas de puestos altos que arman los pasillos', donde: 'cajas puesto_*' },
      { id: 'frutas', nombre: 'Canastos de fruta tropical', donde: 'caja puesto_frutas' },
      { id: 'faroles', nombre: 'Faroles rojos colgados del techo', donde: 'bajo lamparas_colgantes' },
      { id: 'arco_salida', nombre: 'Arco de salida CỬA BẮC con la luz de afuera', donde: 'cerca, en el portón de salida' },
      { id: 'calle', nombre: 'Casas tubo de la calle de salida', donde: 'cerca, después del mercado' },
    ],
    letreros: ['CHỢ BẾN THÀNH', 'CỬA NAM', 'CỬA BẮC', 'QUẦN ÁO', 'HOA TƯƠI', 'VẢI', 'ĂN UỐNG', 'LƯU NIỆM', 'CÀ PHÊ', 'BÚN BÒ', 'CƠM', 'PHỞ', 'CHÈ'],
  },
  rio: {
    iconos: [
      { id: 'landmark81', nombre: 'Landmark 81 grande al otro lado del río, con Thủ Thiêm verde a sus pies', donde: 'lejos' },
      { id: 'coloniales', nombre: 'Edificios coloniales crema con persianas verdes', donde: 'cerca, malecón Bạch Đằng' },
      { id: 'tamarindos', nombre: 'Tamarindos y la jardinera con seto y flores', donde: 'cerca, malecón' },
      { id: 'farol', nombre: 'Faroles de tres globos del malecón', donde: 'postes farol_rio' },
      { id: 'rio', nombre: 'El río abierto hasta la otra orilla, con botes a lo lejos', donde: 'cerca, entre los muelles' },
      { id: 'agua', nombre: 'Agua honda con la corriente, espuma en la orilla y jacintos', donde: 'piso del río' },
      { id: 'muelle', nombre: 'Muelles de tablas sobre pilotes', donde: 'caja muelle' },
      { id: 'thung_chai', nombre: 'Thúng chai, los botes redondos de bambú', donde: 'caja bote_bambu' },
      { id: 'palafitos', nombre: 'Palafitos de tablas de colores con techo de zinc', donde: 'cerca, orilla Thủ Thiêm' },
      { id: 'cocoteros', nombre: 'Cocoteros y matas de dừa nước', donde: 'cerca, orilla' },
      { id: 'redes', nombre: 'Redes de pesca secándose en varas de bambú', donde: 'bajo redes_pesca' },
      { id: 'che', nombre: 'Carrito de chè', donde: 'caja carrito_che' },
    ],
    letreros: ['KHÁCH SẠN', 'NHÀ HÀNG', 'BẢO TÀNG', 'CÀ PHÊ', 'CHÈ'],
  },
  azoteas: {
    iconos: [
      { id: 'bitexco', nombre: 'Bitexco con su helipuerto entre torres con ventanas prendidas', donde: 'lejos' },
      { id: 'nubarrones', nombre: 'Nubarrones del aguacero y cortinas de lluvia', donde: 'cielo' },
      { id: 'vecinos', nombre: 'Pisos de arriba de los edificios vecinos, con ventanas encendidas', donde: 'cerca' },
      { id: 'avisos', nombre: 'Avisos en los techos: KARAOKE, KHÁCH SẠN, CÀ PHÊ, NHÀ HÀNG, PHỞ, SPA', donde: 'cerca' },
      { id: 'cafe_azotea', nombre: 'Café de azotea con sombrillas rojas y bombillos', donde: 'cerca' },
      { id: 'baranda', nombre: 'Murito del fondo con matas, cortado en los huecos', donde: 'cerca' },
      { id: 'vacio', nombre: 'El vacío entre edificios, con ventanitas prendidas abajo', donde: 'huecos vacio' },
      { id: 'zinc', nombre: 'Techo de zinc con óxido', donde: 'piso metal' },
      { id: 'tanques', nombre: 'Tanques de acero', donde: 'caja tanque_agua' },
      { id: 'aires', nombre: 'Aires acondicionados', donde: 'caja aire_acondicionado' },
      { id: 'ropa', nombre: 'Cuerdas de ropa tendida', donde: 'bajo ropa_tendida' },
      { id: 'antenas', nombre: 'Antenas de espina de pescado y parabólicas, en metal claro', donde: 'postes antena' },
    ],
    letreros: ['KARAOKE', 'KHÁCH SẠN', 'CÀ PHÊ', 'NHÀ HÀNG', 'PHỞ', 'SPA'],
  },
  gradas: {
    iconos: [
      { id: 'sol', nombre: 'Sol bajo con su halo y nubes encendidas', donde: 'cielo del atardecer' },
      { id: 'fuera', nombre: 'El estadio por fuera: muro con aletas, SÂN VẬN ĐỘNG, taquilla y banderas', donde: 'cerca, antes del portón' },
      { id: 'gradas', nombre: 'Gradas llenas de público con banderas', donde: 'cerca' },
      { id: 'techo', nombre: 'Techo voladizo con su sombra y reflectores', donde: 'cerca' },
      { id: 'pancarta', nombre: 'Pancarta CỐ LÊN NEKKETSU!', donde: 'cerca, entre el público' },
      { id: 'vallas_aviso', nombre: 'Valla de avisos: NEKKETSU, VIỆT NAM, SÀI GÒN, GG, CỐ LÊN!, CROSS', donde: 'cerca, al pie de las gradas' },
      { id: 'marcador', nombre: 'Marcador de puntos con VỀ ĐÍCH y el reloj', donde: 'cerca, sobre las gradas del final' },
      { id: 'torres', nombre: 'Torres de luz', donde: 'postes torre_luz' },
      { id: 'pista', nombre: 'Pista de tartán rojo con sus carriles', donde: 'piso cancha' },
      { id: 'vallas', nombre: 'Vallas de atletismo caladas', donde: 'caja valla' },
      { id: 'pasto', nombre: 'El pasto de adentro con el bordillo blanco', donde: 'orilla de enfrente' },
      { id: 'meta', nombre: 'Línea de meta a cuadros y la pancarta VỀ ĐÍCH', donde: 'piso y cerca' },
    ],
    letreros: ['SÂN VẬN ĐỘNG', 'VÉ', 'VÀO', 'CỐ LÊN NEKKETSU!', 'VỀ ĐÍCH', 'NEKKETSU', 'VIỆT NAM', 'SÀI GÒN'],
  },
};

/** Los barrios de ladrillo de Medellín. Hoy: la Comuna 13. */
const COLOMBIA_LADRILLO: Estilo = {
  paleta: COLOMBIA_MANANA,
  paletaDe: paletaColombia,
  uso: USO_COLOMBIA,
  iconos: [
    { id: 'casas', nombre: 'Casas de ladrillo apiladas en el cerro, en tres gradas, con losa de concreto y varillas', donde: 'cerca' },
    { id: 'rejas', nombre: 'Ventanas con rejas de colores y matas en latas', donde: 'cerca, en cada casa' },
    { id: 'tanques', nombre: 'Tanques negros de plástico en los techos', donde: 'cerca y caja tanque_agua' },
    { id: 'murales', nombre: 'Murales: la cara de perfil, el ojo, el colibrí y la mariposa', donde: 'cerca y el frente de las terrazas' },
    { id: 'valle', nombre: 'El Valle de Aburrá: cordillera, cerros llenos de casitas y la ciudad abajo', donde: 'lejos' },
    { id: 'metrocable', nombre: 'El metrocable: torres, cables y las cabinas rojas que cruzan', donde: 'lejos y vida' },
  ],
  vida: {
    metrocable: 'Cabinas rojas que cruzan el valle por los cables, en la capa lejos, con su recorrido',
    banderines: 'Banderines de colores de casa a casa, 2 cuadros',
    ropa_tendida: 'Ropa tendida que se mueve con el viento, 2 cuadros',
    bailarines_break: 'Bailarines de break en rueda (entidad npc: lote C6a)',
    musicos: 'Músicos con el parlante en el mirador (entidad npc: lote C6a)',
    perros: 'Perros de la calle (entidad animal, lote C7)',
    gallos: 'El gallo en el techo de zinc (entidad animal, lote C7b)',
  },
  cajas: {
    carrito_paletas: 'Carrito amarillo de paletas de mango biche con el parasol verde y el letrero MANGO',
    escalon: 'Escalón de concreto de la estación con la franja amarilla en la nariz',
    terraza: 'Terraza de concreto. Su frente es el muro de contención: el mural corrido de COMUNA 13 en la subida, y ladrillo con murales en el callejón',
    muro_grafiti: 'Muro de grafitis con franjas de colores por altura: la cara de la izquierda las sigue',
    escalera_electrica: 'Peldaño de aluminio con estrías y borde amarillo, el vidrio y el pasamanos negro que sube. Los peldaños corren hacia abajo (vida)',
    escalones: 'Escalones de concreto con el pasamanos de tubo',
    tanque_agua: 'Tanque negro de plástico con sus anillos',
    techo_lata: 'Techo de zinc ondulado con óxido y tornillos. Abajo, la casa de ladrillo con ventanas y un mural',
    baranda: 'Pasarela de lámina sobre el hueco, con reja a los dos lados',
    aire_acondicionado: 'Unidad de aire acondicionado con el ventilador redondo',
    escalera_pintada: 'La escalera de colores: franjas del arcoíris en el peldaño y la contrahuella de un color',
    mirador: 'La plaza del mirador en adoquín, con la reja del borde, bancas y materas. Su frente es el mural AQUÍ SE SUEÑA EN GRANDE',
    letras_comuna13: 'Las letras gigantes de COMUNA 13, cada una de un color, con su espesor y la base',
  },
  letreros: ['ESTACIÓN SAN JAVIER', 'METROCABLE LÍNEA J', 'MANGO', 'COMUNA 13', 'LA 13 ES CULTURA', 'AQUÍ SE SUEÑA EN GRANDE', 'SALIDA', 'META'],
};
COLOMBIA_LADRILLO.lugares = {
  c13_casas_ladrillo: {
    iconos: [
      { id: 'estacion', nombre: 'La estación San Javier del metro, con el letrero y la torre del metrocable', donde: 'cerca, x 0 a 520' },
      { id: 'mural_comuna', nombre: 'El muro largo de COMUNA 13 con colibríes y mariposas', donde: 'frente de la terraza de la subida' },
      { id: 'cara', nombre: 'El mural de la cara de perfil con el colibrí, y LA 13 ES CULTURA', donde: 'cerca, la subida de los grafitis' },
      { id: 'casas', nombre: 'Casas de ladrillo apiladas en tres gradas, con rejas de colores y matas', donde: 'cerca' },
      { id: 'escalera_electrica', nombre: 'La escalera eléctrica con el techo naranja sobre columnas grises', donde: 'cajas escalera_electrica y bajo techo_escalera' },
      { id: 'tanques', nombre: 'Tanques negros, varillas y antenas en los techos', donde: 'cerca y caja tanque_agua' },
      { id: 'zinc', nombre: 'Techos de zinc con óxido', donde: 'cajas techo_lata' },
      { id: 'escalera_colores', nombre: 'La escalera de colores', donde: 'cajas escalera_pintada' },
      { id: 'letras', nombre: 'Las letras gigantes de COMUNA 13', donde: 'caja letras_comuna13' },
      { id: 'bandera', nombre: 'La bandera de Colombia en el asta del mirador', donde: 'poste asta_bandera y vida' },
      { id: 'valle', nombre: 'El Valle de Aburrá con la ciudad abajo', donde: 'lejos' },
      { id: 'metrocable', nombre: 'El metrocable cruzando el valle', donde: 'lejos y vida' },
    ],
    letreros: ['ESTACIÓN SAN JAVIER', 'METROCABLE LÍNEA J', 'MANGO', 'COMUNA 13', 'LA 13 ES CULTURA', 'AQUÍ SE SUEÑA EN GRANDE', 'SALIDA', 'META'],
  },
};

/** Caracas de noche. Hoy: la azotea de Parque Central. */
const VENEZUELA_CIUDAD: Estilo = {
  paleta: VENEZUELA_NOCHE,
  paletaDe: paletaVenezuela,
  uso: USO_VENEZUELA,
  horas: HORAS_VENEZUELA,
  iconos: [
    { id: 'avila', nombre: 'El Ávila de noche, con la luna en las laderas', donde: 'lejos' },
    { id: 'cruz', nombre: 'La Cruz del Ávila encendida en el pico', donde: 'lejos' },
    { id: 'cerros', nombre: 'Los cerros llenos de lucecitas y la ciudad encendida abajo', donde: 'lejos y cerca' },
    { id: 'torres', nombre: 'Las dos torres de Parque Central con sus ventanas y la luz roja arriba', donde: 'cerca, x 74 a 260' },
    { id: 'publico', nombre: 'El público en las azoteas vecinas, con banderitas y celulares', donde: 'cerca, entre las torres y al lado de la caseta' },
    { id: 'neon_arepera', nombre: 'El neón rosado de AREPERA LA CHAMA con la arepa', donde: 'cerca, sobre la caseta' },
    { id: 'neon_caracas', nombre: 'El neón turquesa de CARACAS con El Ávila y la Cruz', donde: 'cerca, sobre la caseta' },
    { id: 'caseta', nombre: 'La caseta de la escalera: puerta de lámina, bombillos, CARACAS ES BELLA y la escalerita al techo', donde: 'cerca, x 392 a 606' },
    { id: 'tanques', nombre: 'Los tanques de agua en sus patas, con el tubo oxidado', donde: 'cerca, a la izquierda' },
    { id: 'antenas', nombre: 'Las antenas de celosía con los paneles y la luz roja', donde: 'postes antena y el techo de la caseta' },
    { id: 'borde', nombre: 'El borde sin baranda con la franja amarilla y negra, y la ciudad allá abajo', donde: 'el hueco vacío del final y el piso' },
    { id: 'piso_mojado', nombre: 'Las losas mojadas que reflejan el neón', donde: 'piso' },
  ],
  vida: {
    letreros_neon: 'Los dos neones prendidos, y LA CHAMA (o El Ávila del letrero) que parpadea: 4 cuadros',
    luces_ciudad: 'Las luces rojas de las torres que prenden y apagan, y el tráfico que corre allá abajo pasando el borde',
    avion_lejos: 'Un avioncito con las luces de las alas que parpadean, cruzando alto en la capa lejos',
    helicoptero_reflector: 'El helicóptero con el reflector que barre hacia abajo, cruzando delante del Ávila (capa lejos)',
    helicoptero: 'El helicóptero con el reflector que barre hacia abajo, cruzando delante del Ávila (capa lejos)',
    publico: 'El público de las azoteas vecinas levanta los brazos, las banderas y los celulares: 2 cuadros',
    fuegos_artificiales: 'Fuegos artificiales sobre la ciudad al final (partículas)',
  },
  cajas: {
    tanque_agua: 'Tanque de agua cilíndrico de concreto pintado, con sus anillos',
    aire_acondicionado: 'Unidad de aire acondicionado con el ventilador redondo',
  },
  letreros: ['AREPERA LA CHAMA', 'CARACAS', 'CARACAS ES BELLA'],
};

/** Hội An de noche: la ciudad vieja con el Tama-wari. */
const VIETNAM_HOIAN: Estilo = {
  paleta: VIETNAM_HOIAN_NOCHE,
  paletaDe: paletaVietnam,
  uso: USO_HOIAN,
  horas: HORAS_HOIAN,
  iconos: [
    { id: 'casas', nombre: 'Las casas amarillas de la ciudad vieja, de dos pisos, con la pared gastada', donde: 'cerca, de x 166 al final' },
    { id: 'tejas', nombre: 'Los techos de tejas de barro con el caballete de puntas curvas, y el alero entre los pisos', donde: 'cerca' },
    { id: 'madera', nombre: 'La planta baja de madera oscura: vanos abiertos con la tienda encendida, puertas plegables y celosías', donde: 'cerca' },
    { id: 'farol_puerta', nombre: 'Un farol en cada puerta y los racimos de faroles debajo del alero', donde: 'cerca' },
    { id: 'cuerdas', nombre: 'Las cuerdas de faroles de seda de colores sobre la calle, de poste en poste', donde: 'bajo cuerdas_faroles' },
    { id: 'puestos', nombre: 'Los puestos de faroles: techito de tejas, faroles en dos filas y el mostrador', donde: 'cerca, detrás de la vendedora y al final' },
    { id: 'buganvilla', nombre: 'La buganvilla fucsia que cae de los techos y los balcones, y el árbol de la esquina', donde: 'cerca' },
    { id: 'puente', nombre: 'El puente japonés (Chùa Cầu) encendido, con sus arcos y el templito', donde: 'lejos, por la izquierda' },
    { id: 'rio', nombre: 'El río Thu Bồn con los reflejos de los faroles, velitas en flores de papel y botes con faroles', donde: 'lejos, cerca (izquierda) y debajo del muelle' },
    { id: 'tamawari', nombre: 'Los dos postes de bambú del Tama-wari, con trípode, el collar del equipo y las cintas de colores', donde: 'postes poste_tamawari' },
    { id: 'piedra', nombre: 'La calle de piedra con la luz tibia de los faroles y el muelle de madera', donde: 'piso' },
    { id: 'balcones', nombre: 'Los vecinos asomados a los balcones de madera, con nón lá y abanicos', donde: 'cerca, vida publico' },
  ],
  vida: {
    faroles_meciendose: 'Los faroles de las cuerdas y de los postes que se mecen con la brisa, 4 cuadros',
    velitas_rio: 'Las velitas del río de adelante, que titilan, 3 cuadros',
    botes_con_faroles: 'El bote con faroles amarrado en el río de la izquierda, que se mece, y otro que cruza lejos por el río',
    publico: 'Los vecinos de los balcones, que levantan los brazos, los abanicos y los celulares: 2 cuadros',
  },
  cajas: {
    base_poste: 'Cajón de madera lleno de piedras al pie del poste del Tama-wari, con el trípode de bambú amarrado encima',
  },
  letreros: ['ĐÈN LỒNG', 'CAO LẦU', 'MAY ĐO'],
};

/** El dojo de judo de Hà Nội en la tarde (lote E4a). */
const VIETNAM_DOJO: Estilo = {
  paleta: VIETNAM_DOJO_TARDE,
  uso: USO_DOJO,
  horas: ['tarde'],
  iconos: [
    { id: 'tatami', nombre: 'El tatami: la zona de combate verde, la de seguridad amarilla, las esteras de 2 x 1 con sus juntas y las cintas de salida', donde: 'piso' },
    { id: 'madera', nombre: 'Las paredes de madera clara en paneles, con el zócalo oscuro y las vigas', donde: 'cerca' },
    { id: 'ventanales', nombre: 'Los ventanales altos con su marco de madera y los postigos abiertos', donde: 'cerca, sobre el público' },
    { id: 'lago', nombre: 'El lago Hoàn Kiếm por las ventanas, color jade, con los sauces de la orilla', donde: 'lejos' },
    { id: 'torre_tortuga', nombre: 'La Torre de la Tortuga (Tháp Rùa) en su islote, y el puente rojo Thê Húc', donde: 'lejos, por las ventanas' },
    { id: 'bandera', nombre: 'La bandera de Vietnam colgada en el centro de la pared', donde: 'cerca' },
    { id: 'caligrafia', nombre: 'La caligrafía (thư pháp) en rollos de papel con su sello rojo: TÂM y NHẪN', donde: 'cerca, entre las ventanas' },
    { id: 'letrero', nombre: 'El letrero de madera del club: VÕ ĐƯỜNG NHU ĐẠO HÀ NỘI', donde: 'cerca, sobre la bandera' },
    { id: 'publico', nombre: 'El público sentado en la banca, al borde del tatami: familias, niños y judocas de judogi', donde: 'cerca, al pie de la pared' },
    { id: 'rayos', nombre: 'La luz de la tarde que entra por las ventanas y cae en rayos sobre el tatami', donde: 'cerca y piso' },
  ],
  vida: {
    publico: 'El público de la banca levanta los brazos y aplaude: 2 cuadros',
    hojas_cayendo: 'Las hojas de los árboles del lago que caen afuera, detrás de los vidrios: 4 cuadros',
  },
  cajas: {},
  letreros: ['VÕ ĐƯỜNG NHU ĐẠO HÀ NỘI', 'TÂM', 'NHẪN'],
};

/** El parque Tao Đàn de Saigón al amanecer (lote E4a). */
const VIETNAM_PARQUE: Estilo = {
  paleta: VIETNAM_TAODAN_AMANECER,
  uso: USO_TAODAN,
  horas: ['amanecer'],
  iconos: [
    { id: 'dau', nombre: 'Los árboles dầu enormes: troncos claros y altísimos con sus raíces abiertas y la copa allá arriba', donde: 'cerca' },
    { id: 'rayos', nombre: 'Los rayos de sol del amanecer que entran entre los troncos', donde: 'cerca' },
    { id: 'jaulas', nombre: 'Las jaulas de pájaros colgadas de las ramas y de un palo, con los pájaros adentro', donde: 'cerca' },
    { id: 'tai_chi', nombre: 'El grupo de tai chi, de ropa clara, con abanicos rojos', donde: 'cerca' },
    { id: 'abuelos', nombre: 'Los abuelos haciendo ejercicio: brazos que giran y estiramientos', donde: 'cerca' },
    { id: 'bancos', nombre: 'Los bancos de piedra del parque con los señores del café de los pájaros', donde: 'cerca' },
    { id: 'ciudad', nombre: 'Landmark 81 y Bitexco en la bruma rosada, por entre los árboles', donde: 'lejos' },
    { id: 'cancha', nombre: 'La cancha de tierra apisonada del đá cầu con sus rayas gastadas', donde: 'piso' },
  ],
  vida: {
    tai_chi: 'El grupo de tai chi que se mueve despacio, 4 cuadros',
    abuelos_ejercicio: 'Los abuelos que giran los brazos y se estiran, 2 cuadros',
    pajaros: 'Los pájaros que saltan en las jaulas, 2 cuadros, y los que cruzan el cielo lejos',
    rayos_de_luz: 'El polvo que brilla en los rayos de sol (partículas)',
  },
  cajas: {},
  letreros: ['CÔNG VIÊN TAO ĐÀN'],
};

/** La cancha de tejo de La Candelaria en la tarde nublada (lote E4a). */
const COLOMBIA_COLONIAL: Estilo = {
  paleta: COLOMBIA_CANDELARIA_TARDE,
  uso: USO_CANDELARIA,
  horas: ['tarde'],
  iconos: [
    { id: 'techo', nombre: 'La cancha techada: las cerchas y vigas de madera, la teja de barro por dentro y los pilares', donde: 'cerca' },
    { id: 'greda', nombre: 'La caja de greda con el bocín, donde el juego tira el tejo', donde: 'caja caja_greda' },
    { id: 'mechas', nombre: 'Las mechas: los triángulos de papel con pólvora, en las cajas de atrás y en la cajita del estante', donde: 'cerca' },
    { id: 'banderines', nombre: 'Los banderines de papel de colores colgados de viga a viga', donde: 'cerca y vida' },
    { id: 'pared', nombre: 'La pared colonial de cal con el zócalo pintado y las ventanas de madera verdes', donde: 'cerca' },
    { id: 'monserrate', nombre: 'Monserrate con la iglesia blanca arriba, por la ventana', donde: 'lejos' },
    { id: 'casas', nombre: 'Las casas coloniales de La Candelaria con techo de teja y balcones, del otro lado de la calle', donde: 'lejos, por las ventanas' },
    { id: 'llovizna', nombre: 'La llovizna de Bogotá afuera, en la ventana', donde: 'lejos y vida' },
    { id: 'ruana', nombre: 'La gente con ruana y sombrero sentada en la banca, con su tinto', donde: 'cerca, vida publico' },
    { id: 'tablero', nombre: 'El tablero de las reglas: MECHA 3, BOCÍN 6, MOÑONA 9', donde: 'cerca' },
  ],
  vida: {
    banderines: 'Los banderines que se mecen con el aire, 2 cuadros',
    publico: 'La gente con ruana que levanta el tinto y aplaude, 2 cuadros',
    llovizna: 'La llovizna que cae afuera, en la ventana, 3 cuadros',
    humo_mechas: 'El humo que queda de las mechas reventadas (partículas)',
  },
  cajas: {
    caja_greda: 'La caja de tejo de lado: el marco de madera, la cara de greda inclinada hacia el que lanza y el bocín de metal. Las mechas y los tejos los pinta el juego',
  },
  letreros: ['CANCHA DE TEJO', 'MECHA 3', 'BOCÍN 6', 'MOÑONA 9'],
};

const ESTILOS: Record<string, Estilo> = { vietnam: VIETNAM, vietnam_hoian: VIETNAM_HOIAN, vietnam_dojo: VIETNAM_DOJO, vietnam_parque: VIETNAM_PARQUE, colombia_ladrillo: COLOMBIA_LADRILLO, colombia_colonial: COLOMBIA_COLONIAL, venezuela_ciudad: VENEZUELA_CIUDAD };

/** Los fondos de la capa cerca que son de Hội An (con su estilo). */
const CERCAS_HOIAN = new Set(['casas_amarillas_hoian']);

/** ¿Ya hay ficha para el estilo de este layout, y a su hora? */
export const hayEstilo = (L: ObliqueLayout) => estiloDe(L) in ESTILOS && (!ESTILOS[estiloDe(L)].horas || ESTILOS[estiloDe(L)].horas!.includes(L.hora));

/** Las horas que pinta el estilo del layout (undefined: todas, o no hay estilo). */
export const horasDe = (L: ObliqueLayout) => ESTILOS[estiloDe(L)]?.horas;

/** El estilo de fachada que va con cada país. */
export const estiloDe = (L: ObliqueLayout) => lugarDe(L)?.estilo ?? (L.pais === 'vietnam' ? (CERCAS_HOIAN.has(L.paralaje?.cerca ?? '') ? 'vietnam_hoian' : 'vietnam') : L.pais === 'colombia' ? 'colombia_ladrillo' : L.pais === 'venezuela' ? 'venezuela_ciudad' : L.pais);

export function fichaArte(L: ObliqueLayout): FichaArte {
  const estilo = estiloDe(L), E = ESTILOS[estilo];
  if (!E) throw new Error(`El estilo "${estilo}" todavía no tiene ficha. Hoy está: ${Object.keys(ESTILOS).join(', ')}.`);
  const cajas = new Map<string, { medidas: string[]; cuantas: number }>();
  for (const b of boxesOf(L)) {
    const k = b.tipo ?? b.lista, m = `${b.w} x ${b.d}, z ${b.z}`;
    const c = cajas.get(k) ?? { medidas: [], cuantas: 0 };
    c.cuantas++;
    if (!c.medidas.includes(m)) c.medidas.push(m);
    cajas.set(k, c);
  }
  const lugar = E.lugares?.[L.paralaje?.cerca ?? ''];
  const pal = E.paletaDe?.(L.hora, L.clima) ?? E.paleta, uso = { ...E.uso, ...(pal === E.paleta ? {} : USO_CIELO[L.hora === 'tarde' || L.clima[0] === 'aguacero' ? 'tarde' : L.hora] ?? {}) };
  // el incienso de los altares es de las casas de Vietnam
  const vida = [...L.vida, ...(lugar || estilo !== 'vietnam' ? [] : ['incienso'])].filter((v, i, a) => a.indexOf(v) === i).map((id) => ({ id, detalle: E.vida[id] ?? 'Sin dibujo todavía: se propone en la ficha' }));
  return {
    id: L.id,
    nombre: L.nombre ?? L.id,
    estilo,
    hora: L.hora,
    paleta: NOMBRES.map((n) => ({ nombre: n, hex: pal[n], uso: uso[n] ?? E.uso[n] })),
    iconos: lugar?.iconos ?? E.iconos,
    vida,
    cajas: [...cajas].map(([tipo, c]) => ({ tipo, medida: c.medidas.join(' y '), cuantas: c.cuantas, dibujo: E.cajas[tipo] ?? 'Muro genérico del estilo' })),
    letreros: lugar?.letreros ?? E.letreros,
  };
}

/** La ficha en Markdown, para `ficha_arte.md`. */
export function fichaMarkdown(f: FichaArte): string {
  const out: string[] = [];
  out.push(`# Ficha de arte: ${f.id}`, '');
  out.push(`${f.nombre}. Estilo \`${f.estilo}\`, hora \`${f.hora}\`.`, '');
  out.push('## Paleta: 24 colores', '', 'Cada pixel del escenario sale de aquí. La prueba 8 lo revisa.', '');
  out.push('| Color | Hex | Para qué |', '|---|---|---|');
  for (const c of f.paleta) out.push(`| \`${c.nombre}\` | \`${c.hex}\` | ${c.uso} |`);
  out.push('', `## Elementos icónicos (${f.iconos.length})`, '');
  out.push('| Elemento | Dónde va |', '|---|---|');
  for (const i of f.iconos) out.push(`| ${i.nombre} | ${i.donde} |`);
  out.push('', `## Vida (${f.vida.length})`, '');
  for (const v of f.vida) out.push(`- \`${v.id}\`: ${v.detalle}.`);
  out.push('', '## Cada caja del layout', '', 'El dibujo calza con la caja: el techo mide `d` filas y el frente `z` filas. Nada cambia de lugar ni de alto.', '');
  out.push('| Tipo | Medida | Cuántas | Dibujo |', '|---|---|---|---|');
  for (const c of f.cajas) out.push(`| \`${c.tipo}\` | ${c.medida} | ${c.cuantas} | ${c.dibujo} |`);
  out.push('', '## Letreros', '', `Texto real y corto, con los acentos: ${f.letreros.map((t) => `"${t}"`).join(', ')}.`, '');
  return out.join('\n');
}
