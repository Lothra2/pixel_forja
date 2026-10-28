/**
 * Estilos de pelea: los movimientos de los doce luchadores clásicos sobre el cuerpo chibi de la familia. Cada estilo
 * dice qué clip responde a cada botón; los clips se arman con las poses limpias de Ryu y Ken (video.ts) y los
 * proyectiles y efectos propios de cada uno (fx.ts). Un familiar puede pelear con cualquier estilo.
 */

export type EstiloId = 'ryu' | 'ken' | 'chunli' | 'guile' | 'blanka' | 'honda' | 'zangief' | 'dhalsim' | 'balrog' | 'vega' | 'sagat' | 'bison';
export type Boton = 'golpe' | 'golpe_fuerte' | 'golpe_agachado' | 'patada' | 'patada_fuerte' | 'patada_agachado' | 'barrida' | 'salto_patada' | 'poder' | 'upper' | 'torbe' | 'anti' | 'agarrar';

export interface Estilo {
  id: EstiloId;
  nombre: [string, string];
  /** Clip por botón; lo que no esté sale del estilo base (Ryu). */
  movs: Partial<Record<Boton, string>>;
  /** Cómo se llaman los tres especiales en la pantalla (poder, upper, torbe). */
  especiales: [string, string, string];
}

const BASE: Record<Boton, string> = {
  golpe: 'golpe_debil', golpe_fuerte: 'golpe_fuerte', golpe_agachado: 'golpe_agachado', patada: 'patada_fuerte', patada_fuerte: 'patada_fuerte',
  patada_agachado: 'patada_agachado', barrida: 'barrida', salto_patada: 'salto_patada', poder: 'poder', upper: 'uppercut', torbe: 'torbellino',
  anti: 'antiaereo', agarrar: 'agarrar',
};

export const ESTILOS: Estilo[] = [
  { id: 'ryu', nombre: ['Ryu', 'Ryu'], movs: {}, especiales: ['Hadouken', 'Shoryuken', 'Tatsumaki'] },
  { id: 'ken', nombre: ['Ken', 'Ken'], movs: { upper: 'shoryuken_ken' }, especiales: ['Hadouken', 'Shoryuken de fuego', 'Tatsumaki'] },
  { id: 'chunli', nombre: ['Chun-Li', 'Chun-Li'], movs: { poder: 'kikoken', upper: 'patadas_relampago', torbe: 'patada_giratoria', anti: 'patada_alta', patada: 'patada_alta' }, especiales: ['Kikoken', 'Patadas relámpago', 'Patada giratoria'] },
  { id: 'guile', nombre: ['Guile', 'Guile'], movs: { poder: 'sonic_boom', upper: 'flash_kick', anti: 'flash_kick', torbe: 'patada_alta' }, especiales: ['Sonic Boom', 'Flash Kick', 'Patada alta'] },
  { id: 'blanka', nombre: ['Blanka', 'Blanka'], movs: { poder: 'electricidad', torbe: 'rodar', upper: 'rodar_alto', anti: 'electricidad', agarrar: 'mordida' }, especiales: ['Electricidad', 'Rodar hacia arriba', 'Rodar'] },
  { id: 'honda', nombre: ['E. Honda', 'E. Honda'], movs: { poder: 'cien_manos', torbe: 'cabezazo', upper: 'sumo_pisoton', anti: 'cien_manos' }, especiales: ['Cien manos', 'Pisotón de sumo', 'Cabezazo'] },
  { id: 'zangief', nombre: ['Zangief', 'Zangief'], movs: { poder: 'lariat', torbe: 'lariat', upper: 'golpe_oso', anti: 'patada_alta', agarrar: 'piledriver' }, especiales: ['Lariat', 'Golpe de oso', 'Lariat'] },
  { id: 'dhalsim', nombre: ['Dhalsim', 'Dhalsim'], movs: { golpe: 'yoga_golpe', golpe_fuerte: 'yoga_golpe_fuerte', patada: 'yoga_patada', patada_fuerte: 'yoga_patada', patada_agachado: 'yoga_patada_baja', barrida: 'yoga_patada_baja', poder: 'yoga_fire', torbe: 'yoga_flame', upper: 'yoga_flame', anti: 'yoga_patada' }, especiales: ['Yoga Fire', 'Yoga Flame', 'Yoga Flame'] },
  { id: 'balrog', nombre: ['Balrog', 'Balrog'], movs: { poder: 'puno_carrera', torbe: 'gancho_giro', upper: 'gancho_subida', anti: 'gancho_subida' }, especiales: ['Puño con carrera', 'Gancho', 'Gancho con giro'] },
  { id: 'vega', nombre: ['Vega', 'Vega'], movs: { poder: 'garra', torbe: 'rodar_vega', upper: 'clavado', anti: 'clavado' }, especiales: ['Garra', 'Clavado', 'Rodar'] },
  { id: 'sagat', nombre: ['Sagat', 'Sagat'], movs: { poder: 'tiger_shot', torbe: 'tiger_shot_bajo', upper: 'tiger_uppercut', anti: 'tiger_knee' }, especiales: ['Tiger Shot', 'Tiger Uppercut', 'Tiger Shot bajo'] },
  { id: 'bison', nombre: ['M. Bison', 'M. Bison'], movs: { poder: 'psycho_crusher', torbe: 'patada_tijera', upper: 'patada_tijera', anti: 'cabezazo_bison' }, especiales: ['Psycho Crusher', 'Patada tijera', 'Patada tijera'] },
];

export const ESTILO_DE: Record<EstiloId, Estilo> = Object.fromEntries(ESTILOS.map((e) => [e.id, e])) as Record<EstiloId, Estilo>;

/** El clip que responde a un botón en un estilo. */
export function movimiento(estilo: EstiloId, boton: Boton): string {
  return ESTILO_DE[estilo]?.movs[boton] ?? BASE[boton];
}

/** Efectos que viajan (o se quedan en su sitio) y pegan solos: nacen como proyectiles en la arena. */
export const PROYECTILES = new Set(['poder', 'sonic', 'kikoken', 'tiger', 'tiger_bajo', 'yoga_fire', 'yoga_flame', 'rayo_blanka']);

/** Daño y si tumba, por clip; lo que no esté pega 5. */
export const DANO: Record<string, { daño: number; tumba?: boolean }> = {
  golpe_debil: { daño: 4 }, golpe_fuerte: { daño: 8 }, patada_fuerte: { daño: 9 }, patada_alta: { daño: 9 }, barrida: { daño: 8, tumba: true }, antiaereo: { daño: 12, tumba: true },
  uppercut: { daño: 14, tumba: true }, shoryuken_ken: { daño: 15, tumba: true }, uppercut_corto: { daño: 10 }, torbellino: { daño: 6 }, salto_patada: { daño: 8 }, patada_agachado: { daño: 6 }, golpe_agachado: { daño: 5 },
  agarrar: { daño: 12, tumba: true }, mordida: { daño: 14, tumba: true }, piledriver: { daño: 20, tumba: true },
  patadas_relampago: { daño: 7 }, patada_giratoria: { daño: 9 }, flash_kick: { daño: 13, tumba: true },
  rodar: { daño: 11, tumba: true }, rodar_alto: { daño: 12, tumba: true }, cien_manos: { daño: 7 }, cabezazo: { daño: 11, tumba: true }, sumo_pisoton: { daño: 12, tumba: true },
  lariat: { daño: 10, tumba: true }, golpe_oso: { daño: 12, tumba: true },
  puno_carrera: { daño: 12, tumba: true }, gancho_giro: { daño: 13, tumba: true }, gancho_subida: { daño: 11, tumba: true },
  garra: { daño: 9 }, clavado: { daño: 12, tumba: true },
  tiger_uppercut: { daño: 14, tumba: true }, tiger_knee: { daño: 10 },
  yoga_golpe: { daño: 5 }, yoga_golpe_fuerte: { daño: 9 }, yoga_patada: { daño: 9 }, yoga_patada_baja: { daño: 8, tumba: true },
  psycho_crusher: { daño: 13, tumba: true }, patada_tijera: { daño: 11, tumba: true }, cabezazo_bison: { daño: 10 },
};
