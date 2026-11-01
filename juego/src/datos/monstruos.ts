// Monstruos: estadísticas a nivel 1 (se escalan con el nivel de la zona), comportamiento y cómo pegan.
import type { Elemento } from '../juego/tipos_objetos';

export type IA = 'normal' | 'enjambre' | 'distancia' | 'mago' | 'invocador' | 'cobarde' | 'bruto' | 'jefe';
export interface DefMonstruo {
  id: string;
  /** Sprite horneado (id del monstruo en el manifiesto). */
  sprite: string;
  nombre: [string, string];
  vida: number;
  dano: [number, number];
  elem?: Elemento;
  def: number;
  vel: number;
  ia: IA;
  rango?: number;
  proyectil?: string;
  res?: Partial<Record<Elemento, number>>;
  xp: number;
  /** Escala de dibujo (1 = como lo pinta el motor). */
  escala?: number;
  sonido?: 'carne' | 'hueso' | 'metal';
  invoca?: string;
  /** El jefe de acto: fases y frase. */
  jefe?: boolean;
  huella?: number;
  /** Ataque en cono o en área alrededor (brutos y jefes). */
  area?: number;
  /** Tinte para variantes de color (campeones del mismo sprite). */
  tinte?: string;
  /** Sale caminando del piso (zombis) o aparece de la niebla. */
  surge?: boolean;
  /** No se mueve (tótems, nidos). */
  fijo?: boolean;
}

const M = (d: DefMonstruo) => d;
export const MONSTRUOS: Record<string, DefMonstruo> = Object.fromEntries([
  // ---------------- Acto 1
  M({ id: 'zombi', sprite: 'zombi', nombre: ['Caminante podrido', 'Rotting walker'], vida: 24, dano: [2, 5], def: 4, vel: 1.4, ia: 'enjambre', xp: 12, sonido: 'carne', surge: true, res: { veneno: 50 } }),
  M({ id: 'necrofago', sprite: 'necrofago', nombre: ['Necrófago', 'Ghoul'], vida: 20, dano: [2, 6], def: 6, vel: 3.4, ia: 'normal', xp: 14, sonido: 'carne' }),
  M({ id: 'penitente', sprite: 'penitente', nombre: ['Penitente', 'Penitent'], vida: 26, dano: [3, 7], def: 8, vel: 2.2, ia: 'normal', xp: 16, sonido: 'carne' }),
  M({ id: 'esqueleto', sprite: 'esqueleto', nombre: ['Esqueleto de la cripta', 'Crypt skeleton'], vida: 18, dano: [2, 6], def: 10, vel: 2.4, ia: 'normal', xp: 13, sonido: 'hueso', res: { veneno: 75, frio: 20 } }),
  M({ id: 'esqueleto_arquero', sprite: 'esqueleto_arquero', nombre: ['Arquero de hueso', 'Bone archer'], vida: 14, dano: [2, 5], def: 6, vel: 2.4, ia: 'distancia', rango: 7, proyectil: 'flecha', xp: 15, sonido: 'hueso', res: { veneno: 75 } }),
  M({ id: 'ahogado', sprite: 'ahogado', nombre: ['Ahogado del estanque', 'Pond drowned'], vida: 34, dano: [3, 8], elem: 'frio', def: 6, vel: 1.5, ia: 'bruto', xp: 20, sonido: 'carne', surge: true, res: { frio: 50, fuego: -25 } }),
  M({ id: 'monja_hueca', sprite: 'monja_hueca', nombre: ['Monja hueca', 'Hollow nun'], vida: 18, dano: [3, 6], elem: 'frio', def: 4, vel: 2.6, ia: 'mago', rango: 7, proyectil: 'hielo', xp: 22, sonido: 'carne', res: { frio: 60 } }),
  M({ id: 'cultista', sprite: 'cultista', nombre: ['Cultista de la Brasa', 'Ember cultist'], vida: 22, dano: [3, 7], elem: 'fuego', def: 6, vel: 2.6, ia: 'mago', rango: 7, proyectil: 'fuego', xp: 22, sonido: 'carne', res: { fuego: 50 } }),
  M({ id: 'caballero_muerto', sprite: 'caballero_muerto', nombre: ['Caballero sin descanso', 'Restless knight'], vida: 48, dano: [5, 11], def: 22, vel: 2.0, ia: 'bruto', xp: 34, sonido: 'metal', res: { veneno: 75, fisico: 15 } }),
  M({ id: 'verdugo', sprite: 'verdugo', nombre: ['El Verdugo de Velmora', 'The Velmora Headsman'], vida: 240, dano: [8, 18], def: 30, vel: 2.1, ia: 'jefe', xp: 400, sonido: 'carne', escala: 1, area: 1.6, huella: 2 }),
  M({ id: 'abadesa', sprite: 'abadesa', nombre: ['La Abadesa Ilvara', 'Abbess Ilvara'], vida: 620, dano: [10, 22], elem: 'fuego', def: 35, vel: 2.4, ia: 'jefe', rango: 8, proyectil: 'fuego', xp: 1500, jefe: true, sonido: 'carne', res: { fuego: 60, veneno: 30 }, invoca: 'monja_hueca', huella: 2 }),
  // ---------------- Acto 2
  M({ id: 'saqueador', sprite: 'saqueador', nombre: ['Saqueador de tumbas', 'Tomb raider'], vida: 30, dano: [4, 9], def: 14, vel: 3.2, ia: 'normal', xp: 24, sonido: 'carne' }),
  M({ id: 'momia', sprite: 'momia', nombre: ['Momia insomne', 'Sleepless mummy'], vida: 50, dano: [5, 10], elem: 'veneno', def: 12, vel: 1.4, ia: 'bruto', xp: 30, sonido: 'carne', surge: true, res: { veneno: 50, fuego: -30 } }),
  M({ id: 'chacal', sprite: 'chacal', nombre: ['Sacerdote chacal', 'Jackal priest'], vida: 32, dano: [5, 9], elem: 'veneno', def: 10, vel: 2.6, ia: 'invocador', rango: 7, proyectil: 'veneno', invoca: 'esqueleto', xp: 34, sonido: 'carne', res: { veneno: 40 } }),
  M({ id: 'satiro', sprite: 'satiro', nombre: ['Cabrío de las dunas', 'Dune goatman'], vida: 40, dano: [5, 12], def: 16, vel: 2.9, ia: 'normal', xp: 28, sonido: 'carne' }),
  M({ id: 'rey_sin_sombra', sprite: 'rey_sin_sombra', nombre: ['Khamer-Ul, el Rey sin Sombra', 'Khamer-Ul, the Shadowless King'], vida: 1100, dano: [14, 30], elem: 'veneno', def: 50, vel: 2.4, ia: 'jefe', rango: 8, proyectil: 'veneno', xp: 3200, jefe: true, sonido: 'carne', res: { veneno: 75, fuego: -10 }, invoca: 'momia', huella: 2, area: 2 }),
  // ---------------- Acto 3
  M({ id: 'cazacabezas', sprite: 'cazacabezas', nombre: ['Cazacabezas', 'Headhunter'], vida: 36, dano: [5, 11], def: 14, vel: 3.2, ia: 'distancia', rango: 6, proyectil: 'lanza', xp: 34, sonido: 'carne' }),
  M({ id: 'hombre_cienaga', sprite: 'hombre_cienaga', nombre: ['Hombre ciénaga', 'Bog man'], vida: 70, dano: [7, 15], elem: 'veneno', def: 18, vel: 1.8, ia: 'bruto', xp: 42, sonido: 'carne', res: { veneno: 60 } }),
  M({ id: 'bruja', sprite: 'bruja', nombre: ['Bruja del manglar', 'Mangrove witch'], vida: 34, dano: [6, 12], elem: 'veneno', def: 10, vel: 2.4, ia: 'invocador', rango: 7, proyectil: 'veneno', invoca: 'zombi', xp: 46, sonido: 'carne', res: { veneno: 50 } }),
  M({ id: 'diablillo', sprite: 'diablillo', nombre: ['Diablillo de la fronda', 'Canopy imp'], vida: 22, dano: [4, 9], elem: 'fuego', def: 10, vel: 3.8, ia: 'enjambre', xp: 26, escala: 1, sonido: 'carne', res: { fuego: 50 } }),
  M({ id: 'brujo_diablillo', sprite: 'brujo_diablillo', nombre: ['Chamán diablillo', 'Imp shaman'], vida: 26, dano: [5, 10], elem: 'fuego', def: 8, vel: 2.8, ia: 'mago', rango: 7, proyectil: 'fuego', xp: 34, sonido: 'carne', res: { fuego: 60 } }),
  M({ id: 'madre_cienaga', sprite: 'madre_cienaga', nombre: ['Madre Ciénaga', 'Mother Mire'], vida: 1800, dano: [18, 38], elem: 'veneno', def: 60, vel: 2.0, ia: 'jefe', rango: 8, proyectil: 'veneno', xp: 6000, jefe: true, sonido: 'carne', res: { veneno: 75, frio: 20 }, invoca: 'hombre_cienaga', huella: 3, area: 2.2 }),
  // ---------------- Acto 4
  M({ id: 'escarchado', sprite: 'escarchado', nombre: ['Escarchado', 'Frostbitten'], vida: 60, dano: [8, 16], elem: 'frio', def: 22, vel: 2.6, ia: 'normal', xp: 50, sonido: 'carne', res: { frio: 75, fuego: -20 } }),
  M({ id: 'espectro', sprite: 'espectro', nombre: ['Espectro helado', 'Frost wraith'], vida: 40, dano: [8, 14], elem: 'frio', def: 14, vel: 3.0, ia: 'mago', rango: 7, proyectil: 'hielo', xp: 54, sonido: 'carne', res: { frio: 75, fisico: 30 } }),
  M({ id: 'ogro', sprite: 'ogro', nombre: ['Ogro de las cumbres', 'Peak ogre'], vida: 150, dano: [14, 28], def: 30, vel: 1.9, ia: 'bruto', xp: 90, sonido: 'carne', area: 1.4, huella: 2 }),
  M({ id: 'rey_escarcha', sprite: 'rey_escarcha', nombre: ['Hjaldur, el Rey de Escarcha', 'Hjaldur, the Frost King'], vida: 2600, dano: [22, 46], elem: 'frio', def: 80, vel: 2.4, ia: 'jefe', rango: 8, proyectil: 'hielo', xp: 10000, jefe: true, sonido: 'hueso', res: { frio: 75, veneno: 75 }, invoca: 'escarchado', huella: 2, area: 2 }),
  // ---------------- Acto 5
  M({ id: 'carcelero', sprite: 'carcelero', nombre: ['Carcelero del abismo', 'Abyss jailer'], vida: 110, dano: [14, 26], elem: 'fuego', def: 34, vel: 2.2, ia: 'bruto', xp: 80, sonido: 'carne', res: { fuego: 75 }, area: 1.3 }),
  M({ id: 'caballero_abismo', sprite: 'caballero_abismo', nombre: ['Caballero del abismo', 'Abyss knight'], vida: 160, dano: [16, 32], elem: 'fuego', def: 50, vel: 2.4, ia: 'normal', xp: 110, sonido: 'metal', res: { fuego: 60, fisico: 20 }, huella: 2 }),
  M({ id: 'lich', sprite: 'lich', nombre: ['Rey hueco', 'Hollow king'], vida: 120, dano: [14, 24], elem: 'sombra', def: 30, vel: 2.4, ia: 'invocador', rango: 8, proyectil: 'sombra', invoca: 'esqueleto', xp: 120, sonido: 'hueso', res: { sombra: 60, frio: 50 }, huella: 2 }),
  M({ id: 'senor_demonio', sprite: 'senor_demonio', nombre: ['Ozmaren, la Sed que Arde', 'Ozmaren, the Burning Thirst'], vida: 4200, dano: [30, 60], elem: 'fuego', def: 100, vel: 2.6, ia: 'jefe', rango: 9, proyectil: 'fuego', xp: 30000, jefe: true, sonido: 'carne', res: { fuego: 75, sombra: 50 }, invoca: 'carcelero', huella: 4, area: 3 }),
].map((m) => [m.id, m]));

/** Monstruos de cada zona (por id de zona). Los primeros son los más comunes. */
export const POBLACION: Record<string, string[]> = {
  paramo: ['zombi', 'necrofago', 'penitente', 'zombi'],
  cementerio: ['esqueleto', 'esqueleto_arquero', 'zombi', 'ahogado'],
  abadia1: ['penitente', 'cultista', 'monja_hueca', 'esqueleto'],
  abadia2: ['cultista', 'monja_hueca', 'caballero_muerto', 'esqueleto_arquero'],
  catacumbas1: ['esqueleto', 'necrofago', 'caballero_muerto', 'esqueleto_arquero'],
  catacumbas2: ['caballero_muerto', 'monja_hueca', 'esqueleto', 'cultista', 'ahogado'],
  dunas: ['saqueador', 'satiro', 'momia'],
  oasis_muerto: ['satiro', 'saqueador', 'chacal'],
  tumbas1: ['momia', 'esqueleto', 'chacal', 'saqueador'],
  tumbas2: ['momia', 'chacal', 'caballero_muerto', 'esqueleto_arquero'],
  selva: ['cazacabezas', 'diablillo', 'brujo_diablillo'],
  pantano: ['hombre_cienaga', 'bruja', 'diablillo', 'zombi'],
  templo1: ['cazacabezas', 'brujo_diablillo', 'hombre_cienaga', 'bruja'],
  templo2: ['bruja', 'hombre_cienaga', 'cazacabezas', 'brujo_diablillo'],
  picos: ['escarchado', 'espectro', 'ogro'],
  cuevas_hielo1: ['espectro', 'escarchado', 'esqueleto'],
  cuevas_hielo2: ['ogro', 'espectro', 'escarchado', 'caballero_muerto'],
  llanuras_ceniza: ['carcelero', 'diablillo', 'brujo_diablillo', 'caballero_abismo'],
  santuario1: ['caballero_abismo', 'lich', 'carcelero'],
  santuario2: ['lich', 'caballero_abismo', 'carcelero', 'brujo_diablillo'],
};

/** Prefijos y sufijos para nombres de únicos generados. */
export const NOMBRES_UNICOS = {
  pre: [['Grieta', 'Rift'], ['Ceniza', 'Ash'], ['Llanto', 'Weep'], ['Hambre', 'Hunger'], ['Hueso', 'Bone'], ['Sombra', 'Shade'], ['Brasa', 'Ember'], ['Niebla', 'Mist'], ['Grito', 'Shriek'], ['Óxido', 'Rust'], ['Ciego', 'Blind'], ['Sangre', 'Blood'], ['Raíz', 'Root'], ['Lápida', 'Grave'], ['Campana', 'Bell'], ['Escarcha', 'Frost'], ['Polilla', 'Moth'], ['Cuervo', 'Crow'], ['Diente', 'Tooth'], ['Vela', 'Candle']] as [string, string][],
  suf: [['el Desollado', 'the Flayed'], ['la Que Reza', 'the Praying'], ['el Hueco', 'the Hollow'], ['el Insomne', 'the Sleepless'], ['Boca de Pozo', 'Wellmouth'], ['el Sin Nombre', 'the Nameless'], ['Siete Uñas', 'Seven Nails'], ['el Paciente', 'the Patient'], ['la Viuda', 'the Widow'], ['Ojo Quemado', 'Burnt Eye'], ['el Coleccionista', 'the Collector'], ['Lengua Negra', 'Blacktongue'], ['el Devoto', 'the Devout'], ['Mil Velas', 'Thousand Candles'], ['el Último', 'the Last']] as [string, string][],
};

/** Modificadores de campeones y únicos. */
export const MODS = [
  { id: 'rapido', nombre: ['Veloz', 'Swift'], tinte: '#e0e060' },
  { id: 'piel_piedra', nombre: ['Piel de piedra', 'Stoneskin'], tinte: '#909090' },
  { id: 'ardiente', nombre: ['Encantado de fuego', 'Fire enchanted'], tinte: '#ff6020' },
  { id: 'helado', nombre: ['Encantado de escarcha', 'Frost enchanted'], tinte: '#60b0ff' },
  { id: 'electrico', nombre: ['Cargado de rayo', 'Lightning charged'], tinte: '#c0c0ff' },
  { id: 'vampiro', nombre: ['Sediento', 'Thirsting'], tinte: '#a01020' },
  { id: 'maldito', nombre: ['Maldito', 'Cursed'], tinte: '#8040c0' },
  { id: 'fuerte', nombre: ['Bruto', 'Brute'], tinte: '#c08040' },
  { id: 'espectral', nombre: ['Espectral', 'Spectral'], tinte: '#a0ffe0' },
] as const;
