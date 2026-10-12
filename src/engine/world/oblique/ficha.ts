import type { ObliqueLayout } from './layout';
import { boxesOf } from './layout';
import { NOMBRES, USO_VIETNAM, USO_CIELO, VIETNAM_MANANA, paletaVietnam, type Paleta } from './paleta';

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

const ESTILOS: Record<string, Estilo> = { vietnam: VIETNAM };

/** El estilo de fachada que va con cada país. */
export const estiloDe = (L: ObliqueLayout) => (L.pais === 'vietnam' ? 'vietnam' : L.pais);

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
  const vida = [...L.vida, ...(lugar ? [] : ['incienso'])].filter((v, i, a) => a.indexOf(v) === i).map((id) => ({ id, detalle: E.vida[id] ?? 'Sin dibujo todavía: se propone en la ficha' }));
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
