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
  M({ id: 'verdugo', sprite: 'jefe_verdugo', nombre: ['El Verdugo de Velmora', 'The Velmora Headsman'], vida: 240, dano: [8, 18], def: 30, vel: 2.1, ia: 'jefe', xp: 400, sonido: 'carne', area: 1.6, huella: 2 , escala: 1 }),
  M({ id: 'abadesa', sprite: 'jefe_abadesa', nombre: ['La Abadesa Ilvara', 'Abbess Ilvara'], vida: 620, dano: [10, 22], elem: 'fuego', def: 35, vel: 2.4, ia: 'jefe', rango: 8, proyectil: 'fuego', xp: 1500, jefe: true, sonido: 'carne', res: { fuego: 60, veneno: 30 }, invoca: 'monja_hueca', huella: 2 , escala: 1 }),
  // ---------------- Acto 2
  M({ id: 'saqueador', sprite: 'saqueador', nombre: ['Saqueador de tumbas', 'Tomb raider'], vida: 30, dano: [4, 9], def: 14, vel: 3.2, ia: 'normal', xp: 24, sonido: 'carne' }),
  M({ id: 'momia', sprite: 'momia', nombre: ['Momia insomne', 'Sleepless mummy'], vida: 50, dano: [5, 10], elem: 'veneno', def: 12, vel: 1.4, ia: 'bruto', xp: 30, sonido: 'carne', surge: true, res: { veneno: 50, fuego: -30 } }),
  M({ id: 'chacal', sprite: 'chacal', nombre: ['Sacerdote chacal', 'Jackal priest'], vida: 32, dano: [5, 9], elem: 'veneno', def: 10, vel: 2.6, ia: 'invocador', rango: 7, proyectil: 'veneno', invoca: 'esqueleto', xp: 34, sonido: 'carne', res: { veneno: 40 } }),
  M({ id: 'satiro', sprite: 'satiro', nombre: ['Cabrío de las dunas', 'Dune goatman'], vida: 40, dano: [5, 12], def: 16, vel: 2.9, ia: 'normal', xp: 28, sonido: 'carne' }),
  M({ id: 'rey_sin_sombra', sprite: 'jefe_rey_sin_sombra', nombre: ['Khamer-Ul, el Rey sin Sombra', 'Khamer-Ul, the Shadowless King'], vida: 1100, dano: [14, 30], elem: 'veneno', def: 50, vel: 2.4, ia: 'jefe', rango: 8, proyectil: 'veneno', xp: 3200, jefe: true, sonido: 'carne', res: { veneno: 75, fuego: -10 }, invoca: 'momia', huella: 2, area: 2 , escala: 1 }),
  // ---------------- Acto 3
  M({ id: 'cazacabezas', sprite: 'cazacabezas', nombre: ['Cazacabezas', 'Headhunter'], vida: 36, dano: [5, 11], def: 14, vel: 3.2, ia: 'distancia', rango: 6, proyectil: 'lanza', xp: 34, sonido: 'carne' }),
  M({ id: 'hombre_cienaga', sprite: 'hombre_cienaga', nombre: ['Hombre ciénaga', 'Bog man'], vida: 70, dano: [7, 15], elem: 'veneno', def: 18, vel: 1.8, ia: 'bruto', xp: 42, sonido: 'carne', res: { veneno: 60 } }),
  M({ id: 'bruja', sprite: 'bruja', nombre: ['Bruja del manglar', 'Mangrove witch'], vida: 34, dano: [6, 12], elem: 'veneno', def: 10, vel: 2.4, ia: 'invocador', rango: 7, proyectil: 'veneno', invoca: 'zombi', xp: 46, sonido: 'carne', res: { veneno: 50 } }),
  M({ id: 'diablillo', sprite: 'diablillo', nombre: ['Diablillo de la fronda', 'Canopy imp'], vida: 22, dano: [4, 9], elem: 'fuego', def: 10, vel: 3.8, ia: 'enjambre', xp: 26, escala: 1, sonido: 'carne', res: { fuego: 50 } }),
  M({ id: 'brujo_diablillo', sprite: 'brujo_diablillo', nombre: ['Chamán diablillo', 'Imp shaman'], vida: 26, dano: [5, 10], elem: 'fuego', def: 8, vel: 2.8, ia: 'mago', rango: 7, proyectil: 'fuego', xp: 34, sonido: 'carne', res: { fuego: 60 } }),
  M({ id: 'madre_cienaga', sprite: 'jefe_madre_cienaga', nombre: ['Madre Ciénaga', 'Mother Mire'], vida: 1800, dano: [18, 38], elem: 'veneno', def: 60, vel: 2.0, ia: 'jefe', rango: 8, proyectil: 'veneno', xp: 6000, jefe: true, sonido: 'carne', res: { veneno: 75, frio: 20 }, invoca: 'hombre_cienaga', huella: 3, area: 2.2 , escala: 1 }),
  // ---------------- Acto 4
  M({ id: 'escarchado', sprite: 'escarchado', nombre: ['Escarchado', 'Frostbitten'], vida: 60, dano: [8, 16], elem: 'frio', def: 22, vel: 2.6, ia: 'normal', xp: 50, sonido: 'carne', res: { frio: 75, fuego: -20 } }),
  M({ id: 'espectro', sprite: 'espectro', nombre: ['Espectro helado', 'Frost wraith'], vida: 40, dano: [8, 14], elem: 'frio', def: 14, vel: 3.0, ia: 'mago', rango: 7, proyectil: 'hielo', xp: 54, sonido: 'carne', res: { frio: 75, fisico: 30 } }),
  M({ id: 'ogro', sprite: 'ogro', nombre: ['Ogro de las cumbres', 'Peak ogre'], vida: 150, dano: [14, 28], def: 30, vel: 1.9, ia: 'bruto', xp: 90, sonido: 'carne', area: 1.4, huella: 2 }),
  M({ id: 'rey_escarcha', sprite: 'jefe_rey_escarcha', nombre: ['Hjaldur, el Rey de Escarcha', 'Hjaldur, the Frost King'], vida: 2600, dano: [22, 46], elem: 'frio', def: 80, vel: 2.4, ia: 'jefe', rango: 8, proyectil: 'hielo', xp: 10000, jefe: true, sonido: 'hueso', res: { frio: 75, veneno: 75 }, invoca: 'escarchado', huella: 2, area: 2 , escala: 1 }),
  // ---------------- Acto 5
  M({ id: 'carcelero', sprite: 'carcelero', nombre: ['Carcelero del abismo', 'Abyss jailer'], vida: 110, dano: [14, 26], elem: 'fuego', def: 34, vel: 2.2, ia: 'bruto', xp: 80, sonido: 'carne', res: { fuego: 75 }, area: 1.3 }),
  M({ id: 'caballero_abismo', sprite: 'caballero_abismo', nombre: ['Caballero del abismo', 'Abyss knight'], vida: 160, dano: [16, 32], elem: 'fuego', def: 50, vel: 2.4, ia: 'normal', xp: 110, sonido: 'metal', res: { fuego: 60, fisico: 20 }, huella: 2 }),
  M({ id: 'lich', sprite: 'lich', nombre: ['Rey hueco', 'Hollow king'], vida: 120, dano: [14, 24], elem: 'sombra', def: 30, vel: 2.4, ia: 'invocador', rango: 8, proyectil: 'sombra', invoca: 'esqueleto', xp: 120, sonido: 'hueso', res: { sombra: 60, frio: 50 }, huella: 2 }),
  M({ id: 'senor_demonio', sprite: 'jefe_ozmaren', nombre: ['Ozmaren, la Sed que Arde', 'Ozmaren, the Burning Thirst'], vida: 4200, dano: [30, 60], elem: 'fuego', def: 100, vel: 2.6, ia: 'jefe', rango: 9, proyectil: 'fuego', xp: 30000, jefe: true, sonido: 'carne', res: { fuego: 75, sombra: 50 }, invoca: 'carcelero', huella: 4, area: 3 , escala: 0.55 }),
  // ---------------- bestias y monstruos nuevos del motor (más terror)
  M({ id: 'lobo_sombrio', sprite: 'lobo_sombrio', nombre: ['Lobo sombrío', 'Shadow wolf'], vida: 20, dano: [3, 6], def: 6, vel: 4.4, ia: 'enjambre', xp: 15, sonido: 'carne', huella: 1.4 }),
  M({ id: 'jabali_demonio', sprite: 'jabali_demonio', nombre: ['Jabalí de la brasa', 'Ember boar'], vida: 46, dano: [5, 10], elem: 'fuego', def: 14, vel: 3.6, ia: 'bruto', xp: 26, sonido: 'carne', huella: 1.4, res: { fuego: 30 } }),
  M({ id: 'perro_infernal', sprite: 'perro_infernal', nombre: ['Perro de la Herida', 'Hound of the Wound'], vida: 70, dano: [12, 22], elem: 'fuego', def: 30, vel: 4.6, ia: 'enjambre', xp: 70, sonido: 'carne', huella: 1.4, res: { fuego: 75 } }),
  M({ id: 'arana_cueva', sprite: 'arana_cueva', nombre: ['Araña de pozo', 'Well spider'], vida: 16, dano: [2, 5], elem: 'veneno', def: 8, vel: 4.0, ia: 'enjambre', xp: 13, sonido: 'hueso', huella: 1.2, res: { veneno: 60 } }),
  M({ id: 'arana_reina', sprite: 'arana_reina', nombre: ['La Madre del Pozo', 'The Well Mother'], vida: 260, dano: [7, 14], elem: 'veneno', def: 25, vel: 2.4, ia: 'jefe', rango: 7, proyectil: 'veneno', xp: 420, sonido: 'hueso', invoca: 'arana_cueva', huella: 3, area: 2, res: { veneno: 75 } }),
  M({ id: 'escorpion_gigante', sprite: 'escorpion_gigante', nombre: ['Escorpión de las dunas', 'Dune scorpion'], vida: 60, dano: [6, 13], elem: 'veneno', def: 30, vel: 2.8, ia: 'bruto', xp: 34, sonido: 'hueso', huella: 1.8, res: { veneno: 50, fisico: 15 } }),
  M({ id: 'gusano_de_arena', sprite: 'gusano_de_arena', nombre: ['La Boca de Arena', 'The Sand Maw'], vida: 900, dano: [12, 26], elem: 'veneno', def: 40, vel: 2.0, ia: 'jefe', rango: 8, proyectil: 'veneno', xp: 1800, sonido: 'carne', invoca: 'escorpion_gigante', huella: 3, area: 2.5, surge: true, res: { veneno: 60 } }),
  M({ id: 'golem_de_piedra', sprite: 'golem_de_piedra', nombre: ['Gólem del sello', 'Seal golem'], vida: 160, dano: [14, 26], def: 70, vel: 1.7, ia: 'bruto', xp: 90, sonido: 'metal', huella: 2, area: 1.5, res: { fisico: 35, veneno: 75, rayo: 30 } }),
  M({ id: 'gargola', sprite: 'gargola', nombre: ['Gárgola de la abadía', 'Abbey gargoyle'], vida: 34, dano: [4, 9], def: 26, vel: 3.4, ia: 'normal', xp: 26, sonido: 'metal', huella: 1.4, res: { fisico: 25, veneno: 75 } }),
  M({ id: 'murcielago_gigante', sprite: 'murcielago_gigante', nombre: ['Murciélago de cripta', 'Crypt bat'], vida: 12, dano: [2, 5], def: 10, vel: 4.8, ia: 'enjambre', xp: 10, sonido: 'carne', huella: 1.2 }),
  M({ id: 'demonio_alado', sprite: 'demonio_alado', nombre: ['Demonio alado', 'Winged demon'], vida: 190, dano: [18, 34], elem: 'fuego', def: 60, vel: 3.2, ia: 'normal', rango: 7, proyectil: 'fuego', xp: 160, sonido: 'carne', huella: 2.2, res: { fuego: 75 } }),
  M({ id: 'dragon_oseo', sprite: 'dragon_oseo', nombre: ['Varnhul, el Dragón de Huesos', 'Varnhul, the Bone Dragon'], vida: 2600, dano: [26, 52], elem: 'frio', def: 90, vel: 2.4, ia: 'jefe', rango: 9, proyectil: 'hielo', xp: 14000, sonido: 'hueso', invoca: 'esqueleto', huella: 3.5, area: 3, res: { frio: 75, veneno: 75, fisico: 20 } }),
  M({ id: 'cangrejo_cripta', sprite: 'cangrejo_cripta', nombre: ['Cangrejo de cripta', 'Crypt crab'], vida: 40, dano: [4, 9], def: 40, vel: 2.2, ia: 'bruto', xp: 24, sonido: 'hueso', huella: 1.6, res: { fisico: 30 } }),
  M({ id: 'desollado', sprite: 'desollado', nombre: ['Desollado', 'Flayed one'], vida: 30, dano: [4, 9], elem: 'sangre', def: 10, vel: 3.2, ia: 'normal', xp: 20, sonido: 'carne' }),
  M({ id: 'sin_rostro', sprite: 'sin_rostro', nombre: ['El sin rostro', 'Faceless'], vida: 36, dano: [5, 10], def: 14, vel: 2.6, ia: 'normal', xp: 26, sonido: 'carne', surge: true }),
  M({ id: 'aparecida', sprite: 'aparecida', nombre: ['Aparecida', 'Apparition'], vida: 22, dano: [4, 8], elem: 'frio', def: 12, vel: 3.0, ia: 'mago', rango: 6, proyectil: 'hielo', xp: 24, sonido: 'carne', res: { fisico: 40, frio: 60 } }),
  M({ id: 'bandido', sprite: 'bandido', nombre: ['Bandido de la ceniza', 'Ash bandit'], vida: 26, dano: [3, 8], def: 12, vel: 3.2, ia: 'normal', xp: 18, sonido: 'carne' }),
  M({ id: 'ballestero_oscuro', sprite: 'ballestero_oscuro', nombre: ['Ballestero oscuro', 'Dark crossbowman'], vida: 24, dano: [4, 9], def: 14, vel: 2.8, ia: 'distancia', rango: 8, proyectil: 'flecha', xp: 24, sonido: 'carne' }),
  M({ id: 'gigante_helado', sprite: 'gigante_helado', nombre: ['Gigante helado', 'Frost giant'], vida: 180, dano: [16, 30], elem: 'frio', def: 40, vel: 2.0, ia: 'bruto', xp: 110, sonido: 'carne', huella: 2, area: 1.6, res: { frio: 75 } }),
  M({ id: 'guardia_corrupto', sprite: 'guardia_corrupto', nombre: ['Guardia corrompido', 'Corrupted guard'], vida: 40, dano: [5, 11], def: 30, vel: 2.6, ia: 'normal', xp: 28, sonido: 'metal' }),
  M({ id: 'sacerdote_caido', sprite: 'sacerdote_caido', nombre: ['Sacerdote caído', 'Fallen priest'], vida: 30, dano: [5, 10], elem: 'sombra', def: 12, vel: 2.6, ia: 'invocador', rango: 7, proyectil: 'sombra', invoca: 'zombi', xp: 34, sonido: 'carne', res: { sombra: 50 } }),
  M({ id: 'segador', sprite: 'segador', nombre: ['Segador', 'Reaper'], vida: 120, dano: [16, 30], elem: 'sombra', def: 40, vel: 3.0, ia: 'normal', xp: 100, sonido: 'hueso', res: { sombra: 60, fisico: 20 } }),
  M({ id: 'trol_pantano', sprite: 'trol_pantano', nombre: ['Trol del manglar', 'Mangrove troll'], vida: 110, dano: [10, 20], def: 24, vel: 2.2, ia: 'bruto', xp: 60, sonido: 'carne', huella: 1.6, area: 1.3, res: { veneno: 50 } }),
  M({ id: 'hechicera_sangre', sprite: 'hechicera_sangre', nombre: ['Hechicera de sangre', 'Blood witch'], vida: 44, dano: [8, 16], elem: 'sangre', def: 16, vel: 2.6, ia: 'mago', rango: 7, proyectil: 'fuego', xp: 48, sonido: 'carne' }),
  M({ id: 'caballero_espectral', sprite: 'caballero_espectral', nombre: ['Caballero espectral', 'Spectral knight'], vida: 90, dano: [12, 24], elem: 'frio', def: 50, vel: 2.6, ia: 'normal', xp: 70, sonido: 'metal', res: { fisico: 40, frio: 50 } }),
].map((m) => [m.id, m]));

/** Monstruos de cada zona (por id de zona). Los primeros son los más comunes. */
export const POBLACION: Record<string, string[]> = {
  paramo: ['zombi', 'zombi', 'lobo_sombrio', 'necrofago', 'bandido', 'penitente'],
  cementerio: ['esqueleto', 'esqueleto_arquero', 'zombi', 'aparecida', 'murcielago_gigante', 'ahogado'],
  cueva_hambre: ['arana_cueva', 'necrofago', 'murcielago_gigante', 'arana_cueva'],
  abadia1: ['penitente', 'cultista', 'monja_hueca', 'sin_rostro', 'gargola', 'guardia_corrupto'],
  abadia2: ['cultista', 'monja_hueca', 'caballero_muerto', 'ballestero_oscuro', 'gargola', 'sin_rostro'],
  catacumbas1: ['esqueleto', 'desollado', 'caballero_muerto', 'esqueleto_arquero', 'cangrejo_cripta', 'necrofago'],
  catacumbas2: ['caballero_muerto', 'desollado', 'sacerdote_caido', 'monja_hueca', 'cangrejo_cripta', 'aparecida'],
  dunas: ['saqueador', 'escorpion_gigante', 'satiro', 'bandido', 'momia'],
  oasis_muerto: ['escorpion_gigante', 'satiro', 'saqueador', 'chacal'],
  tumbas1: ['momia', 'esqueleto', 'chacal', 'cangrejo_cripta', 'golem_de_piedra'],
  tumbas2: ['momia', 'chacal', 'golem_de_piedra', 'esqueleto_arquero', 'sin_rostro'],
  selva: ['cazacabezas', 'jabali_demonio', 'diablillo', 'brujo_diablillo', 'murcielago_gigante'],
  pantano: ['hombre_cienaga', 'trol_pantano', 'bruja', 'diablillo', 'arana_cueva'],
  templo1: ['cazacabezas', 'brujo_diablillo', 'hechicera_sangre', 'hombre_cienaga', 'arana_cueva'],
  templo2: ['hechicera_sangre', 'trol_pantano', 'cazacabezas', 'bruja', 'desollado'],
  picos: ['escarchado', 'lobo_sombrio', 'gigante_helado', 'espectro', 'ballestero_oscuro'],
  cuevas_hielo1: ['espectro', 'escarchado', 'caballero_espectral', 'murcielago_gigante'],
  cuevas_hielo2: ['gigante_helado', 'caballero_espectral', 'espectro', 'golem_de_piedra'],
  llanuras_ceniza: ['perro_infernal', 'carcelero', 'diablillo', 'demonio_alado', 'segador'],
  santuario1: ['caballero_abismo', 'segador', 'lich', 'perro_infernal', 'sacerdote_caido'],
  santuario2: ['lich', 'demonio_alado', 'segador', 'caballero_abismo', 'hechicera_sangre'],
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
