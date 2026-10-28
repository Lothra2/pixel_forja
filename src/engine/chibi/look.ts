/**
 * El muñeco chibi: todo lo que se puede elegir en la tienda. Solo ids y colores, nada de imágenes:
 * el motor dibuja cada pieza por código a 32 px (2 cabezas) o a 48 px (2,5 cabezas).
 */

export type Talla = 32 | 48;
export const TALLAS: Talla[] = [32, 48];

export type Especie = 'humano' | 'perro';
export type Contextura = 'adulto' | 'hombre' | 'mujer' | 'robusta' | 'nino' | 'pequena' | 'abuela';
/** Silueta extra de un estilo de pelea sobre el cuerpo del video: ancho (Zangief, Honda) o flaco (Dhalsim). */
export type Silueta = 'fornido' | 'flaco';

export type Peinado =
  | 'corto' | 'puntas' | 'atras' | 'raya' | 'rapado' | 'calvo' | 'afro' | 'rizos' | 'largo' | 'cola'
  | 'colitas' | 'mono' | 'bob' | 'mohicano' | 'ondas' | 'trenzas' | 'recogido' | 'flequillo' | 'lado' | 'erizo';
export type Ojos = 'punto' | 'grandes' | 'pestanas' | 'serios' | 'felices' | 'dormilones';
export type Cejas = 'normal' | 'gruesas' | 'finas' | 'bravas' | 'tristes';
export type Boca = 'linea' | 'sonrisa' | 'abierta' | 'gato' | 'seria';
export type Barba = 'barba' | 'bigote' | 'candado' | 'chivo' | 'sombra';
export type Lentes = 'redondos' | 'cuadrados' | 'sol' | 'gato' | 'nerd';
export type Gorro =
  | 'gorra' | 'gorra_atras' | 'gorro_lana' | 'navidad' | 'llanero' | 'paja' | 'vincha' | 'lazo' | 'corona'
  | 'tiara' | 'panda' | 'chef' | 'fiesta' | 'boina' | 'casco' | 'audifonos' | 'cintillo' | 'flor';
export type Aretes = 'aro' | 'perla' | 'largos';
export type Marca = 'panda' | 'pecas' | 'cachetes' | 'curita' | 'lunar';

export type Arriba =
  | 'franela' | 'polo' | 'gi' | 'gi_sin_mangas' | 'chaqueta' | 'sueter' | 'vinotinto' | 'camiseta' | 'vestido'
  | 'pijama' | 'franelilla' | 'jeogori' | 'kimono' | 'sudadera' | 'floreada' | 'delantal' | 'bano' | 'camisa'
  | 'chaleco' | 'top' | 'nada';
export type Abajo = 'pantalon' | 'jean' | 'short' | 'falda' | 'falda_larga' | 'leggings' | 'gi' | 'pijama' | 'bermuda' | 'bano' | 'malla';
export type Zapatos = 'tenis' | 'botas' | 'sandalias' | 'pantuflas' | 'descalzo' | 'tacos' | 'zapatos' | 'botines';
export type Estampado = 'liso' | 'rayas' | 'copos' | 'numero' | 'corazon' | 'estrella' | 'cuadros' | 'puntos' | 'flores' | 'gg';
export type Accesorio = 'capa' | 'mochila' | 'bufanda' | 'collar' | 'cinturon' | 'rinonera';
export type Utileria = 'bate' | 'paleta' | 'escoba' | 'varita' | 'raqueta' | 'espada' | 'telefono' | 'taza' | 'cuchara' | 'microfono' | 'paraguas' | 'flor';
export type Poder = 'bola' | 'fuego' | 'estrella' | 'corazon' | 'balon' | 'arepa' | 'rayo' | 'burbuja' | 'nota' | 'hoja';

export interface Prenda<T extends string> { estilo: T; color: string; color2?: string }

export interface ChibiLook {
  nombre: string;
  especie: Especie;
  contextura: Contextura;
  /** Solo en la arena: la silueta del estilo elegido. */
  silueta?: Silueta;
  piel: string;
  pelo: { estilo: Peinado; color: string; color2?: string };
  ojos: { estilo: Ojos; color: string };
  cejas: { estilo: Cejas; color?: string };
  boca: Boca;
  barba?: { estilo: Barba; color: string } | null;
  lentes?: { estilo: Lentes; color: string } | null;
  gorro?: Prenda<Gorro> | null;
  aretes?: { estilo: Aretes; color: string } | null;
  marca?: Marca | null;
  arriba: Prenda<Arriba> & { estampado?: Estampado; numero?: string; color3?: string };
  abajo: Prenda<Abajo>;
  zapatos: Prenda<Zapatos>;
  medias?: string | null;
  guantes?: string | null;
  accesorio?: Prenda<Accesorio> | null;
  utileria?: Prenda<Utileria> | null;
  poder: { estilo: Poder; color: string; color2: string };
  /** Solo para el perro: pelaje, pecho/patas, máscara. */
  perro?: { pelaje: string; blanco: string; mascara: string; collar: string; capa?: string | null; antifaz?: string | null };
}

/** Etiquetas para la tienda (es / en). */
export const ETIQUETAS: Record<string, [string, string]> = {
  // contexturas
  adulto: ['Adulto', 'Adult'], hombre: ['Hombre', 'Man'], mujer: ['Mujer', 'Woman'], robusta: ['Robusta', 'Sturdy'],
  nino: ['Niña o niño', 'Kid'], pequena: ['Pequeñita', 'Toddler'], abuela: ['Abuelita', 'Granny'],
  // peinados
  corto: ['Corto', 'Short'], puntas: ['Puntas', 'Spiky'], atras: ['Peinado atrás', 'Swept back'], raya: ['Con raya', 'Side part'],
  rapado: ['Rapado', 'Buzz'], calvo: ['Calvo', 'Bald'], afro: ['Afro', 'Afro'], rizos: ['Rizos', 'Curls'], largo: ['Largo', 'Long'],
  cola: ['Cola de caballo', 'Ponytail'], colitas: ['Colitas', 'Pigtails'], mono: ['Moño', 'Bun'], bob: ['Bob', 'Bob'],
  mohicano: ['Mohicano', 'Mohawk'], ondas: ['Ondas', 'Waves'], trenzas: ['Trenzas', 'Braids'], recogido: ['Recogido', 'Updo'],
  flequillo: ['Flequillo', 'Bangs'], lado: ['De lado', 'Side swept'], erizo: ['Erizo', 'Hedgehog'],
  // ojos, cejas, boca
  punto: ['Punto', 'Dot'], grandes: ['Grandes', 'Big'], pestanas: ['Pestañas', 'Lashes'], serios: ['Serios', 'Stern'],
  felices: ['Felices', 'Happy'], dormilones: ['Dormilones', 'Sleepy'],
  normal: ['Normal', 'Normal'], gruesas: ['Gruesas', 'Thick'], finas: ['Finas', 'Thin'], bravas: ['Bravas', 'Angry'], tristes: ['Tristes', 'Sad'],
  linea: ['Línea', 'Line'], sonrisa: ['Sonrisa', 'Smile'], abierta: ['Abierta', 'Open'], gato: ['Gatuna', 'Cat'], seria: ['Seria', 'Serious'],
  // barba, lentes
  barba: ['Barba', 'Beard'], bigote: ['Bigote', 'Mustache'], candado: ['Candado', 'Goatee ring'], chivo: ['Chivita', 'Goatee'], sombra: ['Sombra', 'Stubble'],
  redondos: ['Redondos', 'Round'], cuadrados: ['Cuadrados', 'Square'], sol: ['De sol', 'Sunglasses'], nerd: ['De pasta', 'Thick frame'],
  // gorros
  gorra: ['Gorra', 'Cap'], gorra_atras: ['Gorra al revés', 'Backwards cap'], gorro_lana: ['Gorro de lana', 'Beanie'], navidad: ['Gorro navideño', 'Santa hat'],
  llanero: ['Sombrero llanero', 'Llanero hat'], paja: ['Sombrero de paja', 'Straw hat'], vincha: ['Vincha de pelea', 'Headband'], lazo: ['Lazo', 'Bow'],
  corona: ['Corona', 'Crown'], tiara: ['Tiara', 'Tiara'], panda: ['Orejitas de panda', 'Panda ears'], chef: ['Gorro de chef', 'Chef hat'],
  fiesta: ['Gorro de fiesta', 'Party hat'], boina: ['Boina', 'Beret'], casco: ['Casco', 'Helmet'], audifonos: ['Audífonos', 'Headphones'], cintillo: ['Cintillo', 'Hairband'],
  aro: ['Argollas', 'Hoops'], perla: ['Perlas', 'Pearls'], largos: ['Largos', 'Drop'],
  pecas: ['Pecas', 'Freckles'], cachetes: ['Cachetes', 'Blush'], curita: ['Curita', 'Band-aid'], lunar: ['Lunar', 'Mole'],
  // ropa
  franela: ['Franela', 'T-shirt'], polo: ['Chemise', 'Polo'], gi: ['Gi de karate', 'Karate gi'], gi_sin_mangas: ['Gi sin mangas', 'Sleeveless gi'],
  chaqueta: ['Chaqueta', 'Jacket'], sueter: ['Suéter', 'Sweater'], vinotinto: ['Camiseta Vinotinto', 'Vinotinto jersey'], camiseta: ['Camiseta de fútbol', 'Football shirt'],
  vestido: ['Vestido', 'Dress'], pijama: ['Pijama', 'Pajamas'], franelilla: ['Franelilla', 'Tank top'], jeogori: ['Jeogori', 'Jeogori'], kimono: ['Kimono', 'Kimono'],
  sudadera: ['Sudadera', 'Hoodie'], floreada: ['Camisa floreada', 'Floral shirt'], delantal: ['Delantal', 'Apron'], bano: ['Traje de baño', 'Swimsuit'],
  camisa: ['Camisa', 'Shirt'], nada: ['Sin camisa', 'Shirtless'], chaleco: ['Chaleco', 'Vest'], top: ['Top', 'Crop top'],
  pantalon: ['Pantalón', 'Trousers'], jean: ['Jean', 'Jeans'], short: ['Short', 'Shorts'], falda: ['Falda', 'Skirt'], falda_larga: ['Falda larga', 'Long skirt'],
  leggings: ['Licras', 'Leggings'], bermuda: ['Bermuda', 'Bermuda'], malla: ['Malla', 'Tights'],
  tenis: ['Zapatos de goma', 'Sneakers'], botas: ['Botas', 'Boots'], sandalias: ['Cholas', 'Sandals'], pantuflas: ['Pantuflas', 'Slippers'],
  descalzo: ['Descalzo', 'Barefoot'], tacos: ['Tacos de fútbol', 'Football boots'], zapatos: ['Zapatos', 'Shoes'], botines: ['Botines', 'Ankle boots'],
  liso: ['Liso', 'Plain'], rayas: ['Rayas', 'Stripes'], copos: ['Copos de nieve', 'Snowflakes'], numero: ['Número', 'Number'], corazon: ['Corazón', 'Heart'],
  estrella: ['Estrella', 'Star'], cuadros: ['Cuadros', 'Plaid'], puntos: ['Puntos', 'Dots'], flores: ['Flores', 'Flowers'], gg: ['Logo GG', 'GG logo'],
  capa: ['Capa', 'Cape'], mochila: ['Morral', 'Backpack'], bufanda: ['Bufanda', 'Scarf'], collar: ['Collar', 'Necklace'], cinturon: ['Cinturón', 'Belt'], rinonera: ['Koala', 'Belt bag'],
  bate: ['Bate', 'Bat'], paleta: ['Paleta de arepas', 'Arepa paddle'], escoba: ['Escoba', 'Broom'], varita: ['Varita', 'Wand'], raqueta: ['Raqueta', 'Racket'],
  espada: ['Espada de palo', 'Wooden sword'], telefono: ['Teléfono', 'Phone'], taza: ['Taza de café', 'Coffee cup'], cuchara: ['Cucharón', 'Ladle'],
  microfono: ['Micrófono', 'Microphone'], paraguas: ['Paraguas', 'Umbrella'], flor: ['Flor', 'Flower'],
  bola: ['Bola de energía', 'Energy ball'], fuego: ['Fuego', 'Fire'], balon: ['Balón', 'Ball'], arepa: ['Arepa', 'Arepa'], rayo: ['Rayo', 'Lightning'],
  burbuja: ['Burbuja', 'Bubble'], nota: ['Nota musical', 'Music note'], hoja: ['Hoja', 'Leaf'],
};

export const PEINADOS: Peinado[] = ['corto', 'puntas', 'atras', 'raya', 'lado', 'rapado', 'calvo', 'erizo', 'mohicano', 'afro', 'rizos', 'bob', 'flequillo', 'ondas', 'largo', 'cola', 'colitas', 'trenzas', 'mono', 'recogido'];
export const OJOS: Ojos[] = ['punto', 'grandes', 'pestanas', 'serios', 'felices', 'dormilones'];
export const CEJAS: Cejas[] = ['normal', 'gruesas', 'finas', 'bravas', 'tristes'];
export const BOCAS: Boca[] = ['linea', 'sonrisa', 'abierta', 'gato', 'seria'];
export const BARBAS: Barba[] = ['barba', 'bigote', 'candado', 'chivo', 'sombra'];
export const LENTES: Lentes[] = ['redondos', 'cuadrados', 'nerd', 'gato', 'sol'];
export const GORROS: Gorro[] = ['gorra', 'gorra_atras', 'gorro_lana', 'navidad', 'llanero', 'paja', 'vincha', 'cintillo', 'lazo', 'flor', 'corona', 'tiara', 'panda', 'chef', 'fiesta', 'boina', 'casco', 'audifonos'];
export const ARETES: Aretes[] = ['aro', 'perla', 'largos'];
export const MARCAS: Marca[] = ['panda', 'pecas', 'cachetes', 'curita', 'lunar'];
export const ARRIBAS: Arriba[] = ['franela', 'polo', 'camisa', 'floreada', 'franelilla', 'top', 'sueter', 'sudadera', 'chaqueta', 'chaleco', 'vinotinto', 'camiseta', 'gi', 'gi_sin_mangas', 'kimono', 'jeogori', 'vestido', 'pijama', 'delantal', 'bano', 'nada'];
export const ABAJOS: Abajo[] = ['pantalon', 'jean', 'short', 'bermuda', 'falda', 'falda_larga', 'leggings', 'malla', 'gi', 'pijama', 'bano'];
export const ZAPATOS: Zapatos[] = ['tenis', 'zapatos', 'botas', 'botines', 'tacos', 'sandalias', 'pantuflas', 'descalzo'];
export const ESTAMPADOS: Estampado[] = ['liso', 'rayas', 'cuadros', 'puntos', 'flores', 'copos', 'corazon', 'estrella', 'numero', 'gg'];
export const ACCESORIOS: Accesorio[] = ['capa', 'mochila', 'bufanda', 'collar', 'cinturon', 'rinonera'];
export const UTILERIAS: Utileria[] = ['bate', 'paleta', 'escoba', 'varita', 'raqueta', 'espada', 'telefono', 'taza', 'cuchara', 'microfono', 'paraguas', 'flor'];
export const PODERES: Poder[] = ['bola', 'fuego', 'estrella', 'corazon', 'balon', 'arepa', 'rayo', 'burbuja', 'nota', 'hoja'];
export const CONTEXTURAS: Contextura[] = ['adulto', 'hombre', 'mujer', 'robusta', 'nino', 'pequena', 'abuela'];

/** Paletas de la tienda. */
export const PIELES = ['#f6d5bd', '#efc19f', '#e2a882', '#d39670', '#c98e70', '#b97a55', '#9a5f3e', '#7a4a2e', '#5c3520', '#3f2416'];
export const COLORES_PELO = ['#141014', '#2e231f', '#4a2e1c', '#7a4a26', '#a8672e', '#e0a040', '#f2d27a', '#c7c3bd', '#ece9e4', '#c0392b', '#e86aa0', '#5b7de8', '#38b26a', '#8a4fd8'];
export const COLORES_ROPA = [
  '#f4f2ee', '#c9c6c0', '#7a7a80', '#26272c', '#101014', '#7a1f2b', '#c0392b', '#e8455a', '#f4a5b5', '#f29a3c', '#f4c430', '#f2e6b8',
  '#3fbf6a', '#2f7d4a', '#3fa8c8', '#2f6fd8', '#1f3a7a', '#3a4256', '#8a4fd8', '#d86ad8', '#8a5a3c', '#5a3a22', '#c8a070', '#e8d8c0',
];
/** Vinotinto y dorado: la selección. */
export const VINOTINTO = '#6e1a2a', DORADO = '#e8b830', CREMA = '#f0e2c0';

export function defaultLook(): ChibiLook {
  return {
    nombre: 'Muñeco', especie: 'humano', contextura: 'adulto', piel: '#d39670',
    pelo: { estilo: 'corto', color: '#2e231f' }, ojos: { estilo: 'punto', color: '#141014' }, cejas: { estilo: 'normal' }, boca: 'linea',
    barba: null, lentes: null, gorro: null, aretes: null, marca: null,
    arriba: { estilo: 'franela', color: '#2f6fd8', estampado: 'liso' }, abajo: { estilo: 'jean', color: '#3a4256' },
    zapatos: { estilo: 'tenis', color: '#f4f2ee', color2: '#c0392b' }, medias: '#f4f2ee', guantes: null, accesorio: null, utileria: null,
    poder: { estilo: 'bola', color: '#5ac8ff', color2: '#e8fbff' },
  };
}

/** Copia profunda (la tienda edita copias). */
export function cloneLook(l: ChibiLook): ChibiLook { return JSON.parse(JSON.stringify(l)); }
