// Zonas del mundo: exteriores grandes armados con paisajes del motor como viñetas, mazmorras de cuartos y pasillos
// con muros del tema, y campamentos seguros. Todo con semilla. Celdas de juego de 32x16 (5x5 por baldosa).
import './actos67';
import { REGISTRO, huellaDe, generarPaisaje, type ObjetoDef, type Tema, type AmbienteId } from '../../../src/engine/gotico/index';
import { ATRIO_CATEDRAL } from '../../../src/engine/gotico/catalogo/atrio_oria';
import { juncosDeTramo } from '../../../src/engine/gotico/agua';
import { pisosParamo, estadoEn } from '../../../src/engine/gotico/suelo_paramo';
import { regarDecalsParamo } from '../../../src/engine/gotico/decals_paramo';
import { rng, clamp } from '../nucleo/azar';

export interface ObjZ { id: string; v: string; cx: number; cy: number; hw: number; hh: number; bloquea: boolean; tag?: string; dato?: any }
export interface Salida { cx: number; cy: number; destino: string; entrada: string; nombre: [string, string]; obj?: ObjZ; /** Misión que hay que haber aceptado para pasar (si no, la puerta está sellada). */ sello?: string; /** Misión que, cumplida, deja la pieza herida. */ herida?: string; /** Piezas que cambian de variante con la historia. */ piezas?: ObjZ[] }
export interface Spawn { cx: number; cy: number; tipo: 'grupo' | 'jefe' | 'unico' | 'campeon'; fuerza: number }
export interface Zona {
  id: string;
  /** Puentes sobre el río (centro del tablero, que corre en x): el juego sube al que pasa por encima. */
  puentes?: { cx: number; cy: number }[];
  nombre: [string, string];
  acto: number;
  nivel: number;
  tipo: 'pueblo' | 'exterior' | 'mazmorra';
  tw: number; th: number; W: number; H: number;
  pisos: ({ id: string; v: number } | null)[];
  objetos: ObjZ[];
  /** 0 libre, 1 objeto, 2 vacío (fuera del mapa). */
  bloq: Uint8Array;
  ambiente: AmbienteId;
  oscuridad: number;
  salidas: Salida[];
  entradas: Record<string, [number, number]>;
  spawns: Spawn[];
  explorado: Uint8Array;
  /** Cavernas: celdas de roca maciza dentro de baldosas con piso (se pintan de negro; los peñascos del borde van encima). */
  hueco?: Uint8Array;
  semilla: number;
  lluvia?: boolean; niebla?: number; ceniza?: boolean; nieve?: boolean;
  /** Puntos especiales: npc, cofre, santuario, piedra de viaje, baúl... */
  marcas: { tipo: string; cx: number; cy: number; dato?: any }[];
}

export interface DefZona {
  id: string; nombre: [string, string]; acto: number; nivel: number;
  tipo: 'pueblo' | 'exterior' | 'mazmorra';
  tema: string; tam: [number, number];
  /** Salidas: a qué zona y por cuál entrada; lado para exteriores (n, s, e, o) o 'abajo'/'arriba' en mazmorras. */
  salidas: { destino: string; entrada: string; lado: string; nombre: [string, string] }[];
  piedraViaje?: boolean;
  jefe?: string;
  lluvia?: boolean; niebla?: number; ceniza?: boolean; nieve?: boolean;
  densidad?: number;
  /** Paisajes del motor que se estampan como viñetas. */
  vinetas?: string[];
  oscuridad?: number;
  /** Mazmorra lateral: tiene mini jefe y cofre de tesoro. */
  lateral?: boolean;
  /** Un río cruza el mapa de norte a sur (de lava o un arroyo): no se pasa, salvo por los puentes (o vados) donde lo corta el camino. */
  rio?: boolean | 'lava' | 'arroyo';
  /** Objetos propios de esta zona, además de los de su tema (el bosque de los ahorcados, el oasis muerto...). */
  extra?: Sel[];
  /**
   * Pieza ancla en el centro del mapa (la catedral del camposanto): `id` entera o en `piezas` de adelante hacia atrás.
   * Su puerta es la salida hacia `salida`; con `sello`, la puerta está sellada hasta aceptar esa misión. `cerca` se riega alrededor.
   */
  ancla?: { piezas: [string, number, number][]; puerta: [number, number]; salida: string; sello?: string; herida?: string; cerca?: Sel[]; /** El atrio de la Forja alrededor (losas, sendero, derrumbes, niebla baja): ATRIO_CATEDRAL. */ marco?: boolean };
  /** Pueblo amurallado: murallas de fortaleza en los bordes de atrás y portones en las salidas. */
  amurallado?: boolean;
}

// ------------------------------------------------------------------ búsqueda en el catálogo
const cacheBusca = new Map<string, ObjetoDef[]>();
export function buscar(temas: string[], palabras?: string[], sin?: string[]): ObjetoDef[] {
  const k = temas.join() + '|' + (palabras ?? []).join() + '|' + (sin ?? []).join();
  let r = cacheBusca.get(k);
  if (!r) { r = REGISTRO.filter((d) => temas.includes(d.tema) && !/^(gore|hor)_/.test(d.id) && !d.id.endsWith('_sin_llama') && (!palabras || palabras.some((p) => d.id.includes(p))) && !(sin ?? []).some((p) => d.id.includes(p))); cacheBusca.set(k, r); }
  return r;
}

// ------------------------------------------------------------------ temáticas
interface Sel { t: Tema[]; p?: string[]; s?: string[]; v?: (v: string) => boolean }
interface Tematica {
  piso: string; parches: string[]; camino?: string; ambiente: AmbienteId; oscuridad: number;
  borde: Sel[]; disperso: Sel[]; grande?: Sel[]; luces?: Sel[];
  muroX?: [string, string[]]; muroY?: [string, string[]];
  /** Otros pares de muros (x, y) para que no todas las mazmorras del tema se vean iguales: se elige uno por zona. */
  murosAlt?: [[string, string[]], [string, string[]]][];
  deco?: Sel[]; vinetas?: string[];
  /** Caverna orgánica: cámaras irregulares y túneles que serpentean, con peñascos por todo el contorno (en vez de cuartos rectos con muros). */
  organica?: boolean | string;
  /** Mazmorra de islas: sin muros, los cuartos son islas con borde de precipicio y los pasillos son puentes sobre el vacío. */
  islas?: { borde: string; puente: string; vacio?: Sel[]; mapa?: Record<string, string> };
  /** Mazmorra con vías: los pasillos llevan rieles (rectos, curvas y fin de vía) y a veces una vagoneta. */
  rieles?: boolean;
}

const TEMATICAS: Record<string, Tematica> = {
  paramo: {
    piso: 'pasto_seco', parches: ['pasto', 'tierra', 'pasto_seco'], camino: 'camino', ambiente: 'atardecer', oscuridad: 0.45,
    borde: [{ t: ['arboles'], p: ['muert', 'seco', 'torc', 'pino'] }, { t: ['campo'], p: ['roca', 'penasco'] }, { t: ['paramo' as Tema], p: ['par_penasco', 'par_roca', 'par_matorral', 'par_brezo'] }],
    disperso: [{ t: ['arboles'], p: ['arbust', 'zarza', 'tocon', 'tronco', 'hongo', 'pasto'] }, { t: ['campo'], p: ['roca', 'craneo', 'esqueleto', 'mojon', 'letrero', 'cerca_rota', 'muro_ruina', 'menhir'] },
      { t: ['paramo' as Tema], p: ['par_roca', 'par_pedregal', 'par_brezo', 'par_matorral', 'par_pasto', 'par_tronco', 'par_tocon', 'par_cadaver', 'par_restos_batalla', 'par_cuervos', 'par_esqueleto_animal', 'par_huesos', 'par_charco', 'par_estandarte', 'par_botin'] }],
    grande: [{ t: ['arboles'], p: ['roble', 'muert', 'sauce', 'torc'], v: (v) => !/nevad/.test(v) }, { t: ['paramo' as Tema], p: ['par_menhir', 'par_dolmen', 'par_circulo', 'par_torre_vigia', 'par_carreta_rota', 'par_caravana', 'par_molino', 'par_granja', 'par_pozo', 'par_tumulo', 'par_fosa_comun'] }],
    luces: [{ t: ['campo'], p: ['fogata'] }, { t: ['paramo' as Tema], p: ['par_fogata', 'par_farol', 'par_santuario', 'par_rescoldos'] }],
    vinetas: ['pueblo', 'cementerio', 'bosque'],
  },
  cementerio: {
    piso: 'pasto', parches: ['lajas_musgo', 'tierra', 'pasto_seco'], camino: 'lajas_musgo', ambiente: 'noche', oscuridad: 0.62,
    borde: [{ t: ['arboles'], p: ['muert', 'seco', 'torc'] }, { t: ['cementerio'], p: ['muro'] }],
    disperso: [{ t: ['cementerio'], p: ['losa', 'tumba', 'cruz', 'urna', 'velas', 'flores', 'pila', 'ataud', 'fosa'] }, { t: ['arboles'], p: ['tocon', 'zarza', 'hongo'] },
      { t: ['cementerio'], p: ['cem2_cruz_celta', 'cem2_lapida', 'cem2_losa', 'cem2_cruz_', 'cem2_tumba_', 'cem2_ataud', 'cem2_corona', 'cem2_cuervo', 'cem2_doliente', 'cem2_parca', 'cem2_pala', 'cem2_velas', 'cem2_campana', 'cem2_trampilla', 'cem2_banco', 'cem2_jaula', 'cem2_tocon', 'cem2_obelisco'] }],
    grande: [{ t: ['cementerio'], p: ['mausoleo', 'angel', 'sarcofago'] }, { t: ['arboles'], p: ['muert', 'torc'] },
      { t: ['cementerio'], p: ['cem2_mausoleo', 'cem2_capilla', 'cem2_arbol_muerto', 'cem2_osario_aire', 'cem2_cerco', 'cem2_carreta', 'cem2_fosa_comun'], v: (v) => !/_der$/.test(v) }],
    luces: [{ t: ['cementerio'], p: ['farol', 'velas', 'cem2_linterna', 'cem2_farol_cayado'] }],
    vinetas: ['cementerio', 'cementerio'],
  },
  abadia: {
    piso: 'baldosa_catedral', parches: ['lajas', 'baldosa_catedral'], ambiente: 'cripta', oscuridad: 0.72,
    borde: [], disperso: [{ t: ['monasterio'], p: ['banco', 'estatua', 'pila', 'charco', 'campana', 'tapiz', 'pulpito'] }, { t: ['muebles'], p: ['mesa', 'silla', 'estante', 'libro', 'candel', 'vela'] }],
    grande: [{ t: ['monasterio'], p: ['pilar'] }], luces: [{ t: ['monasterio'], p: ['brasero', 'antorcha'] }],
    muroX: ['mon_muro', ['izq', 'izq', 'izq_roto']], muroY: ['mon_muro', ['der', 'der', 'der_roto']],
    deco: [{ t: ['monasterio'], p: ['altar'] }],
  },
  catacumbas: {
    piso: 'lajas', parches: ['hueso', 'lajas', 'lajas_musgo'], ambiente: 'cripta', oscuridad: 0.82,
    borde: [], disperso: [{ t: ['catacumbas'], p: ['osario', 'poste', 'potro', 'jaula', 'banco', 'cama', 'rejilla', 'ataudes', 'monton', 'doncella'] }, { t: ['cementerio'], p: ['pila', 'ataud', 'urna'] },
      { t: ['catacumbas'], p: ['cat2_escombro', 'cat2_gotera', 'cat2_rata', 'cat2_huesos_suelo', 'cat2_carretilla', 'cat2_pozo', 'cat2_columna_derrumbada', 'cat2_ataudes_estante'] }],
    grande: [{ t: ['catacumbas'], p: ['osario', 'cat2_arco_derrumbado', 'cat2_ataudes_estante'] }], luces: [{ t: ['monasterio'], p: ['brasero', 'antorcha'] }],
    muroX: ['cat_nichos', ['izq', 'izq_saqueado']], muroY: ['cat_nichos', ['der', 'der_saqueado']],
    murosAlt: [
      [['cat2_loculos', ['sellados', 'abiertos', 'mixto', 'saqueado']], ['cat2_loculos', ['sellados_der', 'abiertos_der']]],
      [['cat2_pasillo_osario', ['femures', 'banda_calaveras', 'cruz_calaveras']], ['cat2_pasillo_osario', ['femures_der', 'banda_calaveras_der']]],
      [['cat2_pared_toba', ['lisa', 'humeda', 'agrietada', 'con_nicho']], ['cat2_pared_toba', ['lisa_der', 'humeda_der']]],
    ],
  },
  desierto: {
    piso: 'arena', parches: ['arena', 'arenisca', 'tierra'], camino: 'arenisca', ambiente: 'desierto', oscuridad: 0.12,
    borde: [{ t: ['desierto'], p: ['roca', 'duna', 'peña', 'pena', 'acantil', 'cactus', 'palm'], s: ['des2_'] }, { t: ['desierto'], p: ['des2_duna', 'des2_roca_viento', 'des2_palmera', 'des2_cactus'] }],
    disperso: [{ t: ['desierto'], p: ['cactus', 'arbust', 'hueso', 'craneo', 'esquel', 'roca', 'jarr', 'vasij', 'obelis', 'ruina', 'colum'], s: ['des2_'] },
      { t: ['desierto'], p: ['des2_huesos', 'des2_craneo_cuernos', 'des2_camello_muerto', 'des2_buitres', 'des2_escarabajos', 'des2_restos_batalla', 'des2_arbusto', 'des2_cactus', 'des2_estela'] }],
    grande: [{ t: ['desierto'], p: ['palm', 'ruina', 'colum', 'estatua'], s: ['des2_'] }, { t: ['desierto'], p: ['des2_duna', 'des2_roca_viento', 'des2_osamenta', 'des2_tienda', 'des2_caravana', 'des2_pozo_seco', 'des2_obelisco', 'des2_palmera'] }],
    luces: [{ t: ['desierto'], p: ['fuego', 'antorch', 'brasero', 'fogat'], s: ['des2_'] }, { t: ['desierto'], p: ['des2_fogata'] }],
    vinetas: ['desierto', 'tumba'],
  },
  tumba: {
    piso: 'arenisca', parches: ['arenisca', 'arena'], ambiente: 'cripta', oscuridad: 0.78,
    borde: [], disperso: [{ t: ['tumba'], p: ['canopos', 'guardian', 'trampa', 'obelisco', 'altar'] }, { t: ['desierto'], p: ['jarr', 'vasij', 'hueso'] }],
    grande: [{ t: ['tumba'], p: ['columna', 'sarcofago'] }], luces: [{ t: ['tumba'], p: ['antorcha', 'brasero'] }],
    muroX: ['tum_muro', ['liso', 'signos', 'nicho', 'roto']], muroY: ['tum_muro', ['liso_y', 'signos_y', 'nicho_y', 'roto_y']],
  },
  selva: {
    piso: 'selva', parches: ['selva', 'pantano', 'tierra'], camino: 'tierra', ambiente: 'selva', oscuridad: 0.5,
    borde: [{ t: ['selva', 'arboles'], p: ['arbol', 'ceiba', 'palma', 'mangl'], s: ['sel2_'] }, { t: ['selva'], p: ['sel2_arbol_gigante', 'sel2_bambu', 'sel2_helecho'] }],
    disperso: [{ t: ['selva'], p: ['helecho', 'hongo', 'enred', 'flor', 'totem', 'calav', 'capullo', 'raiz', 'tronco', 'planta'], s: ['sel2_'] },
      { t: ['selva'], p: ['sel2_helecho', 'sel2_planta', 'sel2_tronco_podrido', 'sel2_raices', 'sel2_hongos', 'sel2_flor_carnivora', 'sel2_ranas', 'sel2_nido', 'sel2_cadaver', 'sel2_trampa', 'sel2_calaveras_estacas', 'sel2_charca'] }],
    grande: [{ t: ['selva', 'arboles'], p: ['arbol', 'ceiba', 'palma'], s: ['sel2_'] }, { t: ['templo_selva'], p: ['idolo', 'estatua', 'columna', 'muro_musgo'] }, { t: ['selva'], p: ['sel2_arbol_gigante', 'sel2_idolo', 'sel2_cabeza_colosal', 'sel2_ruina', 'sel2_totem', 'sel2_choza', 'sel2_jaula'] }],
    luces: [{ t: ['selva'], p: ['antorcha', 'tiki', 'fuego'], s: ['sel2_'] }, { t: ['templo_selva'], p: ['brasero'] }, { t: ['selva'], p: ['sel2_fogata_tribal', 'sel2_altar'] }],
    vinetas: ['templo'],
  },
  templo: {
    piso: 'arenisca', parches: ['arenisca', 'selva', 'lajas_musgo'], ambiente: 'selva', oscuridad: 0.72,
    borde: [], disperso: [{ t: ['templo_selva'], p: ['idolo', 'estatua', 'altar', 'pedestal', 'calzada'] }, { t: ['selva'], p: ['helecho', 'hongo', 'calav', 'raiz'] }],
    grande: [{ t: ['templo_selva'], p: ['columna'] }], luces: [{ t: ['templo_selva'], p: ['brasero'] }],
    muroX: ['tem_muro_glifos', ['entero', 'roto']], muroY: ['tem_muro_glifos', ['entero_y', 'roto_y']],
  },
  nieve: {
    piso: 'nieve', parches: ['nieve', 'hielo', 'nieve'], camino: 'nieve', ambiente: 'nieve', oscuridad: 0.25,
    borde: [{ t: ['nieve'], p: ['pino', 'arbol', 'roca'] }, { t: ['arboles'], p: ['pino'], v: (v) => /nevad/.test(v) }, { t: ['nieve'], p: ['nie2_pino', 'nie2_bosquecillo', 'nie2_arbol_muerto'] }],
    disperso: [{ t: ['nieve'], p: ['roca', 'ventis', 'tronco', 'poste', 'totem', 'barric', 'estand', 'jaula', 'trineo'] },
      { t: ['nieve'], p: ['nie2_roca', 'nie2_ventisquero', 'nie2_tronco_caido', 'nie2_cadaver', 'nie2_lena', 'nie2_escudos', 'nie2_hito', 'nie2_osamenta', 'nie2_cuerno', 'nie2_piedra_runica', 'nie2_estandarte', 'nie2_trineo', 'nie2_tumulo', 'nie2_soldado_hielo'] }],
    grande: [{ t: ['nieve'], p: ['pino', 'torre', 'catapul', 'altar'] }, { t: ['nieve'], p: ['nie2_pino', 'nie2_mamut', 'nie2_cabana', 'nie2_tienda', 'nie2_totem', 'nie2_secadero', 'nie2_horca'] }],
    luces: [{ t: ['nieve'], p: ['fuego', 'fogat', 'antorch', 'brasero', 'nie2_hoguera', 'nie2_brasero', 'nie2_runa_viva'] }],
    vinetas: ['nieve'],
  },
  hielo: {
    piso: 'hielo', parches: ['hielo', 'nieve', 'cueva'], ambiente: 'cripta', oscuridad: 0.66,
    borde: [], disperso: [{ t: ['hielo'], p: ['puas', 'cristales', 'cuerpo', 'roca', 'estanque'] },
      { t: ['hielo'], p: ['hie2_estalactita', 'hie2_cadaver', 'hie2_escarcha', 'hie2_osamenta', 'hie2_roca', 'hie2_charco', 'hie2_cofre', 'hie2_lago', 'hie2_erupcion'] }],
    grande: [{ t: ['hielo'], p: ['pilar', 'hie2_columna', 'hie2_serac', 'hie2_estatua', 'hie2_pilar_runa', 'hie2_arbol', 'hie2_sarcofago', 'hie2_espejo', 'hie2_pozo'] }],
    luces: [{ t: ['hielo'], p: ['antorcha', 'hie2_cristal', 'hie2_brasero', 'hie2_altar'] }],
    deco: [{ t: ['hielo'], p: ['hie2_trono', 'hie2_barco', 'hie2_cascada', 'hie2_portal'] }],
    organica: 'nieve',
    muroX: ['hie_muro', ['x', 'x_alta']], muroY: ['hie_muro', ['y', 'y_alta']],
  },
  infierno: {
    piso: 'tierra_infierno', parches: ['tierra_infierno', 'lava_grietas', 'hueso'], camino: 'tierra_infierno', ambiente: 'infierno', oscuridad: 0.55,
    borde: [{ t: ['infierno'], p: ['aguja', 'roca', 'espin', 'obsid'], s: ['inf2_'] }, { t: ['infierno'], p: ['inf2_roca', 'inf2_obsidiana', 'inf2_espina', 'inf2_arbol'] }],
    disperso: [{ t: ['infierno'], p: ['huesos', 'empalados', 'cadenas', 'jaula', 'estatua', 'pentagrama', 'grieta'], s: ['inf2_'] }, { t: ['infierno'], p: ['inf2_roca', 'inf2_obsidiana', 'inf2_grieta', 'inf2_charca_lava', 'inf2_fumarola', 'inf2_empalado', 'inf2_cadenas', 'inf2_ganchos', 'inf2_pinchos', 'inf2_cuerpos', 'inf2_sangre', 'inf2_espina', 'inf2_caldero', 'inf2_huevo', 'inf2_carne', 'inf2_estandarte'] }],
    grande: [{ t: ['infierno'], p: ['aguja', 'estatua', 'lago'], s: ['inf2_'] }, { t: ['infierno'], p: ['inf2_coloso', 'inf2_craneo', 'inf2_estatua', 'inf2_ruina', 'inf2_jaula', 'inf2_osario', 'inf2_geiser', 'inf2_obelisco', 'inf2_arbol'] }],
    luces: [{ t: ['infierno'], p: ['brasero', 'pilar_luz', 'forja'], s: ['inf2_'] }, { t: ['infierno'], p: ['inf2_brasero', 'inf2_pira', 'inf2_columna_fuego'] }],
    vinetas: ['infierno'],
  },
  santuario: {
    piso: 'tierra_infierno', parches: ['hueso', 'tierra_infierno', 'pentagrama'], ambiente: 'infierno', oscuridad: 0.7,
    borde: [], disperso: [{ t: ['infierno'], p: ['huesos', 'empalados', 'cadenas', 'jaula', 'sello', 'pentagrama'], s: ['inf2_'] }, { t: ['infierno'], p: ['inf2_empalado', 'inf2_cadenas', 'inf2_ganchos', 'inf2_pinchos', 'inf2_cuerpos', 'inf2_sangre', 'inf2_carne', 'inf2_huevo', 'inf2_caldero'] }],
    grande: [{ t: ['infierno'], p: ['estatua', 'aguja'], s: ['inf2_'] }, { t: ['infierno'], p: ['inf2_jaula', 'inf2_altar', 'inf2_craneo', 'inf2_trono', 'inf2_osario', 'inf2_obelisco'] }],
    luces: [{ t: ['infierno'], p: ['brasero', 'pilar_luz'], s: ['inf2_'] }, { t: ['infierno'], p: ['inf2_brasero', 'inf2_pira', 'inf2_pentaculo'] }],
    muroX: ['inf_muro_carne', ['liso', 'costillas']], muroY: ['inf_muro_carne', ['liso_y', 'costillas_y']],
  },
  cueva: {
    piso: 'cueva', parches: ['cueva', 'tierra'], ambiente: 'cripta', oscuridad: 0.8,
    borde: [], disperso: [{ t: ['cueva'], p: ['estalag', 'roca', 'escomb', 'hueso', 'costill', 'hongo', 'telar', 'raiz', 'cristal', 'poza'], s: ['cue2_'] },
      { t: ['cueva'], p: ['cue2_estalagmitas', 'cue2_estalactitas_caidas', 'cue2_cristales_suelo', 'cue2_charca', 'cue2_nido_huesos', 'cue2_capullos', 'cue2_aventurero', 'cue2_pertrechos', 'cue2_grieta_vapor', 'cue2_gours'] }],
    grande: [{ t: ['cueva'], p: ['columna'], s: ['cue2_'] }, { t: ['cueva'], p: ['cue2_columna', 'cue2_pilar_roca', 'cue2_hongo_gigante', 'cue2_campamento', 'cue2_sima'] }],
    luces: [{ t: ['cueva'], p: ['antorcha', 'hongos'], s: ['cue2_'] }, { t: ['cueva'], p: ['cue2_drusa', 'cue2_cristal_gigante', 'cue2_hongos_luz'] }],
    deco: [{ t: ['cueva'], p: ['cue2_lago_negro'] }],
    organica: true,
    muroX: ['cue_muro', ['x', 'x_alta']], muroY: ['cue_muro', ['y', 'y_alta']],
  },
  // acto 6: la ciudad ahogada (afuera) y su catedral (adentro). Mezclan lo nuevo de la Forja con lo que existe
  ahogada: {
    piso: 'lajas_musgo', parches: ['agua', 'pantano', 'ladrillo_cloaca'], camino: 'empedrado', ambiente: 'noche', oscuridad: 0.6,
    borde: [{ t: ['ahogada' as Tema], p: ['casco', 'ruina', 'muro'], s: ['ahg_'] }, { t: ['ahogada' as Tema], p: ['ahg_roca_percebes', 'ahg_arrecife_huesos', 'ahg_mastil_caido', 'ahg_casco_costillar'] }, { t: ['arboles'], p: ['muert', 'seco'] }],
    disperso: [{ t: ['ahogada' as Tema], p: [''], s: ['ahg_'] }, { t: ['cloaca'], p: ['charco', 'barril', 'desague'] }, { t: ['cementerio'], p: ['losa', 'cruz', 'urna', 'ataud'] }, { t: ['ahogada' as Tema], p: ['ahg_tablones', 'ahg_vela_raida', 'ahg_timon', 'ahg_barril_marino', 'ahg_nasa', 'ahg_cofre_barco', 'ahg_red_huesos', 'ahg_cadena_ancla', 'ahg_charco_marea', 'ahg_coral_hueso', 'ahg_concha_gigante', 'ahg_roca_percebes', 'ahg_peces_muertos', 'ahg_algas_colgantes', 'ahg_tentaculo', 'ahg_marino_ahogado', 'ahg_cruz_marinos', 'ahg_roseton_caido'] }],
    grande: [{ t: ['ahogada' as Tema], p: ['campana', 'casco', 'torre', 'estatua', 'ancla'], s: ['ahg_'] }, { t: ['ahogada' as Tema], p: ['ahg_casco_proa', 'ahg_casco_popa', 'ahg_casco_costillar', 'ahg_mastil_roto', 'ahg_ancla', 'ahg_bote_roto', 'ahg_casco_bote_colgado', 'ahg_campana_caida', 'ahg_torre_campanario', 'ahg_columna_percebes', 'ahg_arco_hundido', 'ahg_estatua_santo', 'ahg_ballena_huesos', 'ahg_pescadora_estatua', 'ahg_columna_caida_algas'] }],
    luces: [{ t: ['ahogada' as Tema], p: ['farol', 'vela'], s: ['ahg_'] }, { t: ['ahogada' as Tema], p: ['ahg_farol_pescador', 'ahg_boya_campana', 'ahg_torre_farol', 'ahg_pila_ahogada'] }],
    vinetas: ['cementerio'],
  },
  catedral_ahogada: {
    piso: 'baldosa_catedral', parches: ['agua', 'lajas_musgo'], ambiente: 'cripta', oscuridad: 0.82,
    borde: [], disperso: [{ t: ['ahogada' as Tema], p: [''], s: ['ahg_'] }, { t: ['monasterio'], p: ['banco', 'estatua', 'pila', 'charco', 'campana'] }, { t: ['cloaca'], p: ['charco', 'reja'] },
      { t: ['ahogada' as Tema], p: ['ahg_charco_marea', 'ahg_roseton_caido', 'ahg_algas_colgantes', 'ahg_peces_muertos', 'ahg_marino_ahogado', 'ahg_cruz_marinos', 'ahg_coral_hueso', 'ahg_tentaculo', 'ahg_red_huesos'] }],
    grande: [{ t: ['ahogada' as Tema], p: ['campana', 'pilar', 'organo'], s: ['ahg_'] }, { t: ['monasterio'], p: ['pilar'] }, { t: ['ahogada' as Tema], p: ['ahg_columna_percebes', 'ahg_campana_caida', 'ahg_campana_colgante', 'ahg_estatua_santo', 'ahg_columna_caida_algas', 'ahg_arco_hundido'] }],
    luces: [{ t: ['monasterio'], p: ['brasero', 'antorcha'] }, { t: ['ahogada' as Tema], p: ['ahg_pila_ahogada', 'ahg_farol_altar'] }],
    muroX: ['mon_muro_vitral', ['izq', 'izq_roto']], muroY: ['mon_muro_vitral', ['der', 'der_roto']],
    deco: [{ t: ['monasterio'], p: ['altar'] }],
  },
  // acto 7: islas de oro sobre el vacío y el interior del trono
  celestial: {
    piso: 'arenisca', parches: ['arcano', 'fortaleza', 'arenisca'], camino: 'fortaleza', ambiente: 'dia', oscuridad: 0.4,
    borde: [{ t: ['celestial' as Tema], p: ['nube', 'roca', 'isla'], s: ['cel_'] }, { t: ['celestial' as Tema], p: ['cel_nube_ceniza', 'cel_isla_roca', 'cel_cadena_dorada'] }, { t: ['arcano'], p: ['pilar_estrella'] }],
    disperso: [{ t: ['celestial' as Tema], p: [''], s: ['cel_'] }, { t: ['arcano'], p: ['atril', 'pasarela', 'brasero'] }, { t: ['celestial' as Tema], p: ['cel_escombros_marmol', 'cel_piso_roto', 'cel_estatua_suplica', 'cel_corona_caida', 'cel_halo_roto', 'cel_anfora_oro', 'cel_lanza_angel', 'cel_arpa_rota', 'cel_relicario', 'cel_ala_piedra', 'cel_mano_estatua', 'cel_pedestal_vacio', 'cel_estandarte', 'cel_fragmento_flotante'] }],
    grande: [{ t: ['celestial' as Tema], p: ['estatua', 'arco', 'trono', 'columna'], s: ['cel_'] }, { t: ['fortaleza'], p: ['estatua_angel'], s: ['for2_'] }, { t: ['celestial' as Tema], p: ['cel_columna_rota', 'cel_arco_triunfal', 'cel_templo_ruina', 'cel_torre_ruina', 'cel_obelisco_oro', 'cel_angel_caido', 'cel_estatua_angel', 'cel_cabeza_coloso', 'cel_fuente_seca', 'cel_esfera_armilar', 'cel_arbol_oro', 'cel_isla_ruinas', 'cel_isla_roca', 'cel_puerta_cielo', 'cel_jardin_estatuas'] }],
    luces: [{ t: ['celestial' as Tema], p: ['luz', 'brasero'], s: ['cel_'] }, { t: ['celestial' as Tema], p: ['cel_brasero_blanco', 'cel_candelabro_oro', 'cel_rayo_luz'] }],
  },
  // las Islas de Oro: mazmorra de islas como el abismo, con bordes de oro y escaleras flotantes entre isla e isla
  celestial_islas: {
    piso: 'arenisca', parches: ['arcano', 'fortaleza', 'arenisca'], ambiente: 'dia', oscuridad: 0.42,
    borde: [], disperso: [{ t: ['celestial' as Tema], p: ['cel_escombros_marmol', 'cel_piso_roto', 'cel_estatua_suplica', 'cel_corona_caida', 'cel_halo_roto', 'cel_anfora_oro', 'cel_lanza_angel', 'cel_arpa_rota', 'cel_relicario', 'cel_ala_piedra', 'cel_mano_estatua', 'cel_pedestal_vacio', 'cel_estandarte', 'cel_fragmento_flotante'] }],
    grande: [{ t: ['celestial' as Tema], p: ['cel_columna_rota', 'cel_arco_triunfal', 'cel_templo_ruina', 'cel_obelisco_oro', 'cel_angel_caido', 'cel_estatua_angel', 'cel_fuente_seca', 'cel_esfera_armilar', 'cel_arbol_oro', 'cel_jardin_estatuas', 'cel_cabeza_coloso'] }],
    luces: [{ t: ['celestial' as Tema], p: ['cel_brasero_blanco', 'cel_candelabro_oro', 'cel_rayo_luz'] }],
    deco: [{ t: ['celestial' as Tema], p: ['cel_puerta_cielo', 'cel_torre_ruina', 'cel_ojo_cielo'] }],
    islas: { borde: 'cel_isla_borde', puente: 'abi_escalones', mapa: { s: 'esquina_s', e: 'esquina_e', n: 'esquina_n', o: 'esquina_o', tramo: 'firmes', tramo_y: 'firmes_y', pilar: 'sueltos', pilar_y: 'sueltos_y', roto: 'sueltos', roto_y: 'sueltos_y' },
      vacio: [{ t: ['celestial' as Tema], p: ['cel_isla_ruinas', 'cel_isla_roca', 'cel_fragmento_flotante', 'cel_cadena_dorada', 'cel_nube_ceniza', 'cel_ojo_cielo', 'cel_torre_ruina'] }, { t: ['abismo' as Tema], p: ['abi_estrellas', 'abi_fragmentos'] }] },
  },
  celestial_interior: {
    piso: 'fortaleza', parches: ['arcano', 'arenisca'], ambiente: 'cripta', oscuridad: 0.68,
    borde: [], disperso: [{ t: ['celestial' as Tema], p: [''], s: ['cel_'] }, { t: ['arcano'], p: ['atril', 'estante', 'cofre'] }, { t: ['celestial' as Tema], p: ['cel_escombros_marmol', 'cel_estatua_suplica', 'cel_corona_caida', 'cel_halo_roto', 'cel_anfora_oro', 'cel_relicario', 'cel_arpa_rota', 'cel_pedestal_vacio', 'cel_grieta_vacio'] }],
    grande: [{ t: ['fortaleza'], p: ['pilar', 'estatua_angel'], s: ['for2_'] }, { t: ['celestial' as Tema], p: ['cel_columna_rota', 'cel_estatua_angel', 'cel_altar_sed', 'cel_fuente_seca', 'cel_esfera_armilar', 'cel_obelisco_oro'] }],
    luces: [{ t: ['fortaleza'], p: ['brasero'], s: ['for2_'] }, { t: ['celestial' as Tema], p: ['cel_brasero_blanco', 'cel_candelabro_oro'] }],
    deco: [{ t: ['celestial' as Tema], p: ['cel_columnata', 'cel_balaustrada', 'cel_escalera_oro'] }],
    muroX: ['for_muro_runas', ['recto', 'roto', 'torre']], muroY: ['for_muro_runas', ['recto_y', 'roto_y', 'torre_y']],
  },
  // temas nuevos de la Forja: cada lista mezcla lo nuevo (cuando llegue) con lo que ya existe, así funcionan desde hoy
  mina: {
    piso: 'cueva', parches: ['cueva', 'tierra'], ambiente: 'cripta', oscuridad: 0.84,
    borde: [], disperso: [{ t: ['mina' as Tema], p: [''], s: ['min_'] }, { t: ['cueva'], p: ['escomb', 'roca', 'hueso', 'cristal', 'estalag'], s: ['cue2_'] },
      { t: ['mina' as Tema], p: ['min_vagoneta_volcada', 'min_vagoneta_rota', 'min_viga_caida', 'min_herramientas', 'min_pico_clavado', 'min_veta', 'min_derrumbe', 'min_polvora', 'min_cajones', 'min_minero_muerto', 'min_carretilla', 'min_mineral', 'min_bomba'] }],
    grande: [{ t: ['mina' as Tema], p: ['vagon', 'grua', 'puntal', 'torno', 'polea'], s: ['min_'] }, { t: ['mina' as Tema], p: ['min_montacargas', 'min_torno', 'min_polea', 'min_tolva', 'min_pozo', 'min_mesa_capataz', 'min_andamio', 'min_escalera'] }],
    luces: [{ t: ['mina' as Tema], p: ['farol', 'lampara', 'antorcha'], s: ['min_'] }, { t: ['mina' as Tema], p: ['min_linterna', 'min_horno'] }],
    muroX: ['cue_muro', ['x', 'x_alta']], muroY: ['cue_muro', ['y', 'y_alta']],
    murosAlt: [[['min_pared_veta', ['oro', 'hierro', 'sangre']], ['min_pared_veta', ['oro_y', 'hierro_y', 'sangre_y']]]],
    rieles: true,
  },
  cripta: {
    piso: 'lajas', parches: ['lajas', 'hueso', 'lajas_musgo'], ambiente: 'cripta', oscuridad: 0.84,
    borde: [], disperso: [{ t: ['cripta' as Tema], p: ['cri_pila_craneos', 'cri_sangre_seca', 'cri_lapida_suelo', 'cri_vasijas', 'cri_telarana', 'cri_cofres_osarios', 'cri_cuerpo_amortajado', 'cri_mesa_embalsamar', 'cri_relicario', 'cri_atril', 'cri_estandarte', 'cri_crucifijo', 'cri_pila_agua', 'cri_tumba_abierta', 'cri_pozo_huesos', 'cri_sello_suelo', 'cri_jaula_colgante'] }, { t: ['catacumbas'], p: ['cat2_huesos_suelo', 'cat2_rata', 'cat2_gotera'] }],
    grande: [{ t: ['cripta' as Tema], p: ['cri_sarcofago', 'cri_estatua_guardian', 'cri_pilar', 'cri_altar_huesos', 'cri_columna_calaveras'] }],
    luces: [{ t: ['cripta' as Tema], p: ['cri_candelabro', 'cri_brasero_huesos', 'cri_lampara_aceite'], v: (v) => !/_der$/.test(v) }],
    deco: [{ t: ['cripta' as Tema], p: ['cri_altar_huesos', 'cri_escalera_caracol'] }],
    muroX: ['cri_muro', ['liso', 'agrietado', 'hornacina']], muroY: ['cri_muro', ['liso_der', 'agrietado_der']],
    murosAlt: [
      [['cri_muro_nichos', ['huesos', 'calaveras', 'mixto', 'saqueado']], ['cri_muro_nichos', ['huesos_der', 'calaveras_der']]],
      [['cri_osario_pared', ['calaveras', 'huesos_cruzados', 'roseton', 'arco']], ['cri_osario_pared', ['calaveras_der', 'huesos_cruzados_der']]],
    ],
  },
  fortaleza: {
    piso: 'lajas', parches: ['lajas', 'fortaleza', 'lajas_musgo'], ambiente: 'cripta', oscuridad: 0.7,
    borde: [], disperso: [{ t: ['fortaleza'], p: ['for2_escombros', 'for2_pertrechos', 'for2_barricada', 'for2_cadaver', 'for2_estandarte', 'for2_caldero_aceite', 'for2_tumba'] }],
    grande: [{ t: ['fortaleza'], p: ['for2_columna', 'for2_armeria', 'for2_catapulta', 'for2_ballesta', 'for2_estatua_rey', 'for2_celda', 'for2_potro', 'for2_horca', 'for2_aljibe', 'for2_campana'] }],
    luces: [{ t: ['fortaleza'], p: ['for2_brasero', 'for2_antorchero'] }],
    deco: [{ t: ['fortaleza'], p: ['for2_trono', 'for2_mesa_guerra', 'for2_torre'] }],
    muroX: ['for2_muralla', ['recta', 'saeteras', 'contrafuerte', 'rota']], muroY: ['for2_muralla', ['recta_y', 'saeteras_y', 'contrafuerte_y']],
    murosAlt: [[['for2_almena', ['recta', 'matacan', 'estandarte', 'rota']], ['for2_almena', ['recta_y', 'matacan_y', 'estandarte_y']]]],
  },
  abismo: {
    piso: 'tierra_infierno', parches: ['hueso', 'tierra_infierno', 'pentagrama'], ambiente: 'infierno', oscuridad: 0.9,
    borde: [], disperso: [{ t: ['abismo' as Tema], p: [''], s: ['abi_'] }, { t: ['infierno'], p: ['huesos', 'cadenas', 'grieta', 'sello'], s: ['inf2_'] },
      { t: ['abismo' as Tema], p: ['abi_runa', 'abi_circulo_runas', 'abi_grieta', 'abi_reliquia', 'abi_jaula', 'abi_farol', 'abi_cristal_vacio', 'abi_almas'] }],
    islas: { borde: 'abi_borde', puente: 'abi_puente', vacio: [{ t: ['abismo' as Tema], p: ['abi_isla', 'abi_islote', 'abi_cadena', 'abi_pilar', 'abi_torre_invertida', 'abi_fragmentos', 'abi_ojos', 'abi_niebla', 'abi_espiral', 'abi_estrellas', 'abi_tentaculos', 'abi_raices', 'abi_estatua', 'abi_costillar', 'abi_mano', 'abi_campana', 'abi_ancla'] }] },
    grande: [{ t: ['abismo' as Tema], p: ['isla', 'roca', 'aguja', 'puente', 'monolito'], s: ['abi_'] }, { t: ['abismo' as Tema], p: ['abi_ruina', 'abi_altar', 'abi_trono', 'abi_puerta', 'abi_obelisco', 'abi_arbol_borde', 'abi_portal', 'abi_plataforma'] }],
    luces: [{ t: ['abismo' as Tema], p: ['brasero', 'cristal', 'luz'], s: ['abi_'] }, { t: ['abismo' as Tema], p: ['abi_runa', 'abi_farol'] }],
    muroX: ['inf_muro_carne', ['liso', 'costillas']], muroY: ['inf_muro_carne', ['liso_y', 'costillas_y']],
  },
};
export const tematica = (t: string) => TEMATICAS[t] ?? TEMATICAS.paramo;

// ------------------------------------------------------------------ construcción
class Constructor {
  z: Zona; r: () => number;
  constructor(z: Zona) { this.z = z; this.r = rng(z.semilla * 9301 + 49297); }
  libre(x0: number, y0: number, w: number, h: number) {
    const z = this.z;
    if (x0 < 0 || y0 < 0 || x0 + w > z.W || y0 + h > z.H) return false;
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (z.bloq[y * z.W + x]) return false;
    return true;
  }
  poner(d: ObjetoDef | undefined | string, cx: number, cy: number, v?: string, forzar = false, tag?: string, dato?: any): ObjZ | null {
    if (!d) return null;
    const def = typeof d === 'string' ? REGISTRO.find((x) => x.id === d) : d;
    if (!def) return null;
    const vv = v && def.variantes.includes(v) ? v : def.variantes[Math.floor(this.r() * def.variantes.length)];
    const [hw, hh] = huellaDe(def, vv);
    const x0 = Math.round(cx - (hw - 1) / 2), y0 = Math.round(cy - (hh - 1) / 2);
    if (!forzar && !this.libre(x0, y0, hw, hh)) return null;
    const z = this.z;
    // no tapar las celdas reservadas (caminos, entradas)
    if (!forzar) for (let y = y0; y < y0 + hh; y++) for (let x = x0; x < x0 + hw; x++) if (this.reserva[y * z.W + x]) return null;
    const bloquea = !!def.bloquea && !def.plano;
    if (bloquea) for (let y = y0; y < y0 + hh; y++) for (let x = x0; x < x0 + hw; x++) if (x >= 0 && y >= 0 && x < z.W && y < z.H && z.bloq[y * z.W + x] !== 2) z.bloq[y * z.W + x] = 1;
    else if (!def.plano) for (let y = y0; y < y0 + hh; y++) for (let x = x0; x < x0 + hw; x++) if (x >= 0 && y >= 0 && x < z.W && y < z.H && !z.bloq[y * z.W + x]) z.bloq[y * z.W + x] = 3; // ocupado sin bloquear (para no apilar)
    const o: ObjZ = { id: def.id, v: vv, cx: Math.round(cx), cy: Math.round(cy), hw, hh, bloquea, tag, dato };
    z.objetos.push(o);
    return o;
  }
  reserva!: Uint8Array;
  sel(ss: Sel[] | undefined): { d: ObjetoDef; v: (v: string) => boolean }[] {
    const out: { d: ObjetoDef; v: (v: string) => boolean }[] = [];
    for (const s of ss ?? []) for (const d of buscar(s.t, s.p, s.s)) out.push({ d, v: s.v ?? (() => true) });
    return out;
  }
  /** Riega objetos al azar. `separar` > 0: no repite el mismo objeto a menos de esa distancia (nada grande repetido en pantalla). */
  regar(ss: Sel[] | undefined, n: number, x0: number, y0: number, x1: number, y1: number, cerca?: (x: number, y: number) => boolean, separar = 0) {
    const op = this.sel(ss); if (!op.length) return;
    for (let i = 0, k = 0; i < n && k < n * 10; k++) {
      const o = op[Math.floor(this.r() * op.length)];
      const vs = o.d.variantes.filter(o.v); if (!vs.length) continue;
      const x = x0 + Math.floor(this.r() * (x1 - x0)), y = y0 + Math.floor(this.r() * (y1 - y0));
      if (cerca && !cerca(x, y)) continue;
      if (this.z.bloq[clamp(y, 0, this.z.H - 1) * this.z.W + clamp(x, 0, this.z.W - 1)]) continue;
      if (separar && this.z.objetos.some((q) => q.id === o.d.id && Math.abs(q.cx - x) + Math.abs(q.cy - y) < separar)) continue;
      if (this.poner(o.d, x, y, vs[Math.floor(this.r() * vs.length)])) i++;
    }
  }
  piso(id: string, bx: number, by: number) {
    const z = this.z; if (bx < 0 || by < 0 || bx >= z.tw || by >= z.th) return;
    const n = id === 'camino' ? 2 : id === 'pentagrama' ? 1 : id === 'agua' || id === 'lava' || id === 'arcano' ? 2 : id === 'baldosa_catedral' || id === 'madera' || id === 'hielo' || id === 'pantano' || id === 'hueso' || id === 'lava_grietas' || id === 'fortaleza' || id === 'ladrillo_cloaca' ? 3 : 4;
    z.pisos[by * z.tw + bx] = { id, v: Math.floor(this.r() * n) };
  }
  vaciar(bx: number, by: number) {
    const z = this.z; z.pisos[by * z.tw + bx] = null;
    for (let y = by * 5; y < by * 5 + 5; y++) for (let x = bx * 5; x < bx * 5 + 5; x++) z.bloq[y * z.W + x] = 2;
  }
}

function nuevaZona(def: DefZona, semilla: number): Zona {
  const [tw, th] = def.tam, W = tw * 5, H = th * 5;
  const t = tematica(def.tema);
  return {
    id: def.id, nombre: def.nombre, acto: def.acto, nivel: def.nivel, tipo: def.tipo, tw, th, W, H,
    pisos: Array.from({ length: tw * th }, () => ({ id: t.piso, v: 0 })), objetos: [], bloq: new Uint8Array(W * H),
    ambiente: t.ambiente, oscuridad: def.oscuridad ?? t.oscuridad, salidas: [], entradas: {}, spawns: [], explorado: new Uint8Array(tw * th), semilla,
    lluvia: def.lluvia, niebla: def.niebla, ceniza: def.ceniza, nieve: def.nieve, marcas: [],
  };
}

/** Ruido de valor suave para manchas de piso. */
function ruido2(r: () => number, w: number, h: number, escala: number): Float32Array {
  const gw = Math.ceil(w / escala) + 2, gh = Math.ceil(h / escala) + 2, g = Float32Array.from({ length: gw * gh }, () => r());
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const fx = x / escala, fy = y / escala, ix = Math.floor(fx), iy = Math.floor(fy), u = fx - ix, v = fy - iy;
    const s = (a: number) => a * a * (3 - 2 * a);
    const a = g[iy * gw + ix], b = g[iy * gw + ix + 1], c = g[(iy + 1) * gw + ix], d = g[(iy + 1) * gw + ix + 1];
    out[y * w + x] = (a * (1 - s(u)) + b * s(u)) * (1 - s(v)) + (c * (1 - s(u)) + d * s(u)) * s(v);
  }
  return out;
}

// ------------------------------------------------------------------ exterior
function exterior(def: DefZona, semilla: number): Zona {
  const z = nuevaZona(def, semilla), k = new Constructor(z), t = tematica(def.tema), r = k.r;
  k.reserva = new Uint8Array(z.W * z.H);
  const { tw, th } = z;
  // forma: un manchón irregular que llena casi todo el rectángulo
  const forma = ruido2(r, tw, th, 4);
  const dentro = (bx: number, by: number) => {
    const ex = Math.min(bx, tw - 1 - bx), ey = Math.min(by, th - 1 - by), borde = Math.min(ex, ey);
    return borde >= 1 && (borde >= 3 || forma[by * tw + bx] > 0.3 + (3 - borde) * 0.12);
  };
  const manchas = ruido2(r, tw, th, 3), manchas2 = ruido2(r, tw, th, 5);
  for (let by = 0; by < th; by++) for (let bx = 0; bx < tw; bx++) {
    if (!dentro(bx, by)) { k.vaciar(bx, by); continue; }
    const m = manchas[by * tw + bx], m2 = manchas2[by * tw + bx];
    k.piso(m > 0.62 ? t.parches[0] : m2 > 0.6 ? t.parches[1] : m < 0.25 ? t.parches[2] : t.piso, bx, by);
  }
  // salidas en los lados y el camino que las une pasando por el centro
  const puntos: [number, number][] = [];

  const enLado = (lado: string): [number, number] => {
    for (let i = 0; i < 200; i++) {
      const u = 0.3 + r() * 0.4;
      let bx = 0, by = 0;
      if (lado === 'n') { bx = Math.floor(u * tw); by = 0; while (by < th - 1 && !z.pisos[by * tw + bx]) by++; }
      else if (lado === 's') { bx = Math.floor(u * tw); by = th - 1; while (by > 0 && !z.pisos[by * tw + bx]) by--; }
      else if (lado === 'o') { by = Math.floor(u * th); bx = 0; while (bx < tw - 1 && !z.pisos[by * tw + bx]) bx++; }
      else { by = Math.floor(u * th); bx = tw - 1; while (bx > 0 && !z.pisos[by * tw + bx]) bx--; }
      if (z.pisos[by * tw + bx]) return [bx * 5 + 2, by * 5 + 2];
    }
    return [Math.floor(z.W / 2), Math.floor(z.H / 2)];
  };
  // las bocas de mazmorra van adentro del mapa, separadas entre sí y de los bordes
  const enInterior = (): [number, number] => {
    for (let i = 0; i < 300; i++) {
      const bx = Math.floor((0.18 + r() * 0.64) * tw), by = Math.floor((0.18 + r() * 0.64) * th);
      if (!z.pisos[by * tw + bx]) continue;
      const p: [number, number] = [bx * 5 + 2, by * 5 + 2];
      if (puntos.some(([x, y]) => Math.hypot(x - p[0], y - p[1]) < 28)) continue;
      return p;
    }
    return [Math.floor(z.W / 2) + Math.floor((r() - 0.5) * 20), Math.floor(z.H / 2) + Math.floor((r() - 0.5) * 20)];
  };
  // entrada principal (de dónde se llega primero): la primera salida
  for (const s of def.salidas) if (s.lado !== 'abajo') puntos.push(enLado(s.lado)); else puntos.push([-999, -999]);
  def.salidas.forEach((s, i) => { if (s.lado === 'abajo') puntos[i] = enInterior(); });
  const centro: [number, number] = [Math.floor(z.W / 2), Math.floor(z.H / 2)];
  const camino = (a: [number, number], b: [number, number]) => {
    let x = a[0], y = a[1];
    for (let paso = 0; paso < 2000; paso++) {
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < z.W && Y < z.H && z.bloq[Y * z.W + X] !== 2) k.reserva[Y * z.W + X] = 1; }
      if (t.camino && r() < 0.5) k.piso(t.camino, Math.floor(x / 5), Math.floor(y / 5));
      if (Math.abs(x - b[0]) + Math.abs(y - b[1]) < 2) break;
      const dx = Math.sign(b[0] - x), dy = Math.sign(b[1] - y);
      if (r() < 0.25) { if (r() < 0.5) x += r() < 0.5 ? 1 : -1; else y += r() < 0.5 ? 1 : -1; }
      else if (Math.abs(b[0] - x) > Math.abs(b[1] - y) ? r() < 0.75 : r() < 0.25) x += dx; else y += dy;
      x = clamp(x, 2, z.W - 3); y = clamp(y, 2, z.H - 3);
    }
  };
  // la pieza ancla: la catedral en el centro, por piezas con su desplazamiento (la Forja da el ancla de cada una);
  // la puerta es la salida y el pie de la escalinata, el punto de llegada
  let anclaObj: ObjZ | null = null; const anclaPiezas: ObjZ[] = [];
  const anc = def.ancla, ia = anc ? def.salidas.findIndex((s) => s.destino === anc.salida) : -1;
  if (anc) {
    const [ax, ay] = [centro[0], centro[1] + 2];
    for (const [id, dx, dy] of anc.piezas) {
      const d = REGISTRO.find((q) => q.id === id); if (!d) continue;
      const v = anc.sello && d.variantes.includes('sellada') ? 'sellada' : d.variantes[0];
      const [hw, hh] = huellaDe(d, v);
      const o = k.poner(d, ax + dx, ay + dy, v, true);
      if (!o) continue;
      anclaPiezas.push(o); anclaObj ??= o;
      for (let yy = Math.floor(ay + dy - hh / 2 - 1); yy <= ay + dy + hh / 2 + 1; yy++) for (let xx = Math.floor(ax + dx - hw / 2 - 1); xx <= ax + dx + hw / 2 + 1; xx++) if (xx >= 0 && yy >= 0 && xx < z.W && yy < z.H) k.reserva[yy * z.W + xx] = 1;
    }
    if (anclaObj && ia >= 0) puntos[ia] = [ax + anc.puerta[0], ay + anc.puerta[1]];
    // el atrio de la Forja: tierra pisada bajo la obra, el marco (plaza, sendero, derrumbes, lápidas, faroles, verja y niebla)
    // y la plaza reservada para que el riego al azar no caiga encima
    if (anclaObj && anc.marco) {
      const A = ATRIO_CATEDRAL, [t0, t1, t2, t3] = A.tierra;
      for (let by = Math.floor((ay + t1) / 5); by <= Math.floor((ay + t3) / 5); by++) for (let bx = Math.floor((ax + t0) / 5); bx <= Math.floor((ax + t2) / 5); bx++) if (z.pisos[by * z.tw + bx]) k.piso('tierra', bx, by);
      for (const [id, v, dx, dy] of A.marco) k.poner(id, ax + dx, ay + dy, v, true);
      const [r0, r1, r2, r3] = A.reservar;
      for (let yy = Math.floor(ay + r1); yy <= ay + r3; yy++) for (let xx = Math.floor(ax + r0); xx <= ax + r2; xx++) if (xx >= 0 && yy >= 0 && xx < z.W && yy < z.H) k.reserva![yy * z.W + xx] = 1;
    }
    // la catedral es un hito: se ve desde lejos, así que su terreno (y lo que tapan las torres detrás) ya cuenta como visto
    if (anclaObj && z.explorado) for (let by = Math.floor((ay - 34) / 5); by <= Math.floor((ay + 30) / 5); by++) for (let bx = Math.floor((ax - 34) / 5); bx <= Math.floor((ax + 34) / 5); bx++) if (bx >= 0 && by >= 0 && bx < tw && by < th) z.explorado[by * tw + bx] = 1;
    if (anclaObj && anc.cerca) k.regar(anc.cerca, 18, ax - 20, ay - 22, ax + 20, ay + 16, undefined, 5);
  }
  for (const p of puntos) camino(anclaObj && ia >= 0 && p === puntos[ia] ? [p[0], p[1] + 1] : p, anclaObj && ia >= 0 && p === puntos[ia] ? [p[0], p[1] + 8] : centro);
  if (def.rio) rioDeLava(k, r, def.rio === 'arroyo');
  // viñetas: paisajes del motor estampados donde haya lugar
  const vin = def.vinetas ?? t.vinetas ?? [];
  const usadas: [number, number, number, number][] = [];
  for (let i = 0; i < Math.min(4, vin.length + 1) && vin.length; i++) {
    const id = vin[i % vin.length];
    const m = generarPaisaje(id, semilla * 13 + i);
    for (let intento = 0; intento < 30; intento++) {
      const bx = 2 + Math.floor(r() * (tw - m.ancho - 4)), by = 2 + Math.floor(r() * (th - m.alto - 4));
      if (bx < 1 || by < 1) break;
      if (usadas.some(([x, y, w, h]) => bx < x + w + 1 && bx + m.ancho + 1 > x && by < y + h + 1 && by + m.alto + 1 > y)) continue;
      let ok = true;
      for (let y = by; y < by + m.alto && ok; y++) for (let x = bx; x < bx + m.ancho; x++) if (!z.pisos[y * tw + x]) { ok = false; break; }
      if (!ok) continue;
      usadas.push([bx, by, m.ancho, m.alto]);
      for (let y = 0; y < m.alto; y++) for (let x = 0; x < m.ancho; x++) { const p = m.pisos[y * m.ancho + x]; if (p) z.pisos[(by + y) * tw + bx + x] = { ...p }; }
      for (const o of m.objetos) {
        // las viñetas no tapan el camino ni las salidas
        const cx = o.cx + bx * 5, cy = o.cy + by * 5;
        if (/portal_azul|piedra_viaje|baul/.test(o.id)) continue;
        k.poner(o.id, cx, cy, o.v);
      }
      break;
    }
  }
  // borde: árboles y rocas pegados al vacío
  const bordes = k.sel(t.borde);
  if (bordes.length) for (let cy = 1; cy < z.H - 1; cy += 2) for (let cx = 1; cx < z.W - 1; cx += 2) {
    if (z.bloq[cy * z.W + cx] === 2) continue;
    let cercaVacio = false;
    for (let dy = -4; dy <= 4 && !cercaVacio; dy++) for (let dx = -4; dx <= 4; dx++) { const X = cx + dx, Y = cy + dy; if (X < 0 || Y < 0 || X >= z.W || Y >= z.H || z.bloq[Y * z.W + X] === 2) { cercaVacio = true; break; } }
    if (cercaVacio && r() < 0.55) { const o = bordes[Math.floor(r() * bordes.length)]; const vs = o.d.variantes.filter(o.v); if (vs.length) k.poner(o.d, cx, cy, vs[Math.floor(r() * vs.length)]); }
  }
  // grandes y dispersos
  const area = z.W * z.H, dens = def.densidad ?? 1;
  k.regar(t.grande, Math.floor((area / 900) * dens), 3, 3, z.W - 3, z.H - 3, undefined, 26);
  k.regar(t.disperso, Math.floor((area / 260) * dens), 2, 2, z.W - 2, z.H - 2);
  k.regar(t.luces, Math.floor(area / 2600), 4, 4, z.W - 4, z.H - 4);
  if (def.extra) k.regar(def.extra, Math.floor((area / 1100) * dens), 4, 4, z.W - 4, z.H - 4, undefined, 12);
  if (def.tipo === 'exterior') k.regar([{ t: ['misterio' as Tema], p: ['arbol_rostros', 'manos', 'ojos', 'estatua', 'pozo'] }], 2 + Math.floor(area / 5000), 4, 4, z.W - 4, z.H - 4);
  // salidas reales
  def.salidas.forEach((s, i) => {
    const [cx, cy] = puntos[i];
    const sal: Salida = { cx, cy, destino: s.destino, entrada: s.entrada, nombre: s.nombre };
    if (i === ia && anclaObj) { sal.obj = anclaObj; sal.piezas = anclaPiezas; if (anc!.sello) sal.sello = anc!.sello; if (anc!.herida) sal.herida = anc!.herida; }
    else if (s.lado === 'abajo') {
      // entrada a una mazmorra: una boca de cripta o cueva
      const boca = def.tema === 'desierto' ? 'tum_entrada' : def.tema === 'cementerio' ? 'cem_entrada_cripta' : def.tema === 'nieve' ? 'cue_entrada' : def.tema === 'selva' ? 'tem_escalinata' : def.tema === 'infierno' ? 'inf_portal_rojo' : 'com_cueva';
      const o = k.poner(boca, cx, cy - 3, undefined, true);
      if (o) sal.obj = o;
    }
    z.salidas.push(sal);
    z.entradas[s.lado === 'abajo' ? 'boca' : s.lado] = [cx + (s.lado === 'o' ? 3 : s.lado === 'e' ? -3 : 0), cy + (s.lado === 'n' ? 3 : s.lado === 's' ? -3 : s.lado === 'abajo' ? 3 : 0)];
    z.entradas['salida_' + s.destino] = z.entradas[s.lado === 'abajo' ? 'boca' : s.lado];
  });
  if (def.piedraViaje) {
    const [cx, cy] = puntos[0];
    const o = ponerPiedra(k, cx, cy);
    if (o) z.marcas.push({ tipo: 'viaje', cx: o.cx, cy: o.cy });
  }
  // cofres, santuarios y pozos
  colocarInteractivos(k, 2 + Math.floor(area / 6000), 1 + Math.floor(area / 9000), def.tema);
  // dónde salen los monstruos: lejos de las entradas
  sembrar(k, Math.floor((area / 700) * dens), puntos);
  if (def.jefe) { const p = lejos(k, puntos); z.spawns.push({ cx: p[0], cy: p[1], tipo: 'jefe', fuerza: 1 }); }
  if (def.tema === 'paramo') sueloParamo(k);
  costa(k, def.tema);
  return z;
}

/** Islas sobre el vacío: cada cuarto es una isla con su borde de precipicio y cada pasillo un puente; en el vacío flota lo que vive ahí. */
function islas(k: Constructor, o: NonNullable<Tematica['islas']>, suelo: Uint8Array, sala: Uint8Array) {
  const z = k.z, { tw, th } = z, r = k.r;
  const borde = REGISTRO.find((d) => d.id === o.borde), puente = REGISTRO.find((d) => d.id === o.puente);
  const S = (x: number, y: number) => x >= 0 && y >= 0 && x < tw && y < th && !!suelo[y * tw + x];
  for (let by = 0; by < th; by++) for (let bx = 0; bx < tw; bx++) {
    const i = by * tw + bx;
    if (!suelo[i]) continue;
    const cx = bx * 5 + 2, cy = by * 5 + 2;
    if (!sala[i]) {
      // pasillo: el piso se va y queda un puente; se camina por la franja del medio
      const enX = S(bx - 1, by) || S(bx + 1, by), enY = S(bx, by - 1) || S(bx, by + 1);
      const v = enX && !enY ? 'tramo' : !enX && enY ? 'tramo_y' : r() < 0.5 ? 'pilar' : 'pilar_y';
      z.pisos[i] = null;
      const vp = r() < 0.12 && v.startsWith('tramo') ? v.replace('tramo', 'roto') : v;
      if (puente) k.poner(puente, cx, cy, o.mapa?.[vp] ?? vp, true);
      continue;
    }
    if (!borde) continue;
    // isla: un borde por cada lado que da al vacío (los puentes cuentan como tierra)
    const px = !S(bx + 1, by), py = !S(bx, by + 1), nx = !S(bx - 1, by), ny = !S(bx, by - 1);
    const vs: string[] = [];
    if (px && py) vs.push('s'); else if (nx && ny) vs.push('n'); else if (px && ny) vs.push('e'); else if (py && nx) vs.push('o');
    if (!vs.length) { if (px) vs.push('se'); if (py) vs.push('so'); if (nx) vs.push('no'); if (ny) vs.push('ne'); }
    else {
      // tres lados: punta más el recto que queda
      if (px && py && nx) vs.push('no'); else if (px && py && ny) vs.push('ne'); else if (nx && ny && px) vs.push('se'); else if (nx && ny && py) vs.push('so');
    }
    if (!px && !py && !S(bx + 1, by + 1)) vs.push('is');
    if (!nx && !ny && !S(bx - 1, by - 1)) vs.push('in');
    if (!px && !ny && !S(bx + 1, by - 1)) vs.push('ie');
    if (!nx && !py && !S(bx - 1, by + 1)) vs.push('io');
    for (const v0 of vs) { const v = o.mapa?.[v0] ?? v0; if (borde.variantes.includes(v)) k.poner(borde, cx, cy, v, true); }
  }
  // lo que flota en el vacío (islotes, cadenas, ojos, estrellas abajo...)
  const vacios = k.sel(o.vacio);
  if (vacios.length) for (let n = 0, i = 0; n < Math.floor((tw * th) / 6) && i < 2000; i++) {
    const bx = Math.floor(r() * tw), by = Math.floor(r() * th);
    if (suelo[by * tw + bx]) continue;
    let cerca = false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (S(bx + dx, by + dy)) cerca = true;
    if (!cerca && r() < 0.6) continue;
    const q = vacios[Math.floor(r() * vacios.length)], vs = q.d.variantes.filter(q.v);
    if (k.poner(q.d, bx * 5 + 2, by * 5 + 2, vs[Math.floor(r() * vs.length)], true)) n++;
  }
}

/** Vías de mina por los pasillos: rieles rectos, curvas donde dobla, fin de vía en los extremos y alguna vagoneta. */
function rieles(k: Constructor, suelo: Uint8Array, sala: Uint8Array) {
  const z = k.z, { tw, th } = z, r = k.r;
  const P = (x: number, y: number) => x >= 0 && y >= 0 && x < tw && y < th && !!suelo[y * tw + x] && !sala[y * tw + x];
  const S = (x: number, y: number) => x >= 0 && y >= 0 && x < tw && y < th && !!suelo[y * tw + x];
  for (let by = 0; by < th; by++) for (let bx = 0; bx < tw; bx++) {
    if (!P(bx, by)) continue;
    const cx = bx * 5 + 2, cy = by * 5 + 2;
    const px = S(bx + 1, by), nx = S(bx - 1, by), py = S(bx, by + 1), ny = S(bx, by - 1);
    const n = +px + +nx + +py + +ny;
    let id = 'min_riel', v = '';
    if (n >= 3) { id = 'min_riel_cruce'; v = (px && nx) ? 'cruce' : 'cruce_y'; }
    else if ((px || nx) && (py || ny)) { id = 'min_riel_curva'; v = nx && ny ? 'n' : px && ny ? 'e' : px && py ? 's' : 'o'; }
    else if (n === 1) { id = 'min_riel_fin'; v = px || nx ? 'fin' : 'fin_y'; }
    else v = (px || nx ? 'recto' : 'recto_y').replace('recto', r() < 0.7 ? 'recto' : r() < 0.5 ? 'gastado' : 'hundido');
    const d = REGISTRO.find((q) => q.id === id); if (!d) continue;
    const vv = d.variantes.includes(v) ? v : d.variantes.filter((q) => q.endsWith('_y') === v.endsWith('_y'))[0] ?? d.variantes[0];
    k.poner(d, cx, cy, vv, true);
    if (id === 'min_riel' && r() < 0.12) k.poner('min_vagoneta', cx, cy, undefined, true);
    else if (r() < 0.25) k.poner('min_puntal', cx + (v.endsWith('_y') ? 2 : 0), cy + (v.endsWith('_y') ? 0 : 2), v.endsWith('_y') ? 'entero_y' : 'entero');
  }
}

/** La piedra de viaje: en piso firme y libre cerca de (x, y), buscando en espiral; nunca en el vacío ni en un muro. */
function ponerPiedra(k: Constructor, x: number, y: number): ObjZ | null {
  const z = k.z;
  for (let r = 4; r <= 16; r++) for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + r, px = Math.round(x + Math.cos(a) * r), py = Math.round(y + Math.sin(a) * r);
    if (px < 3 || py < 3 || px >= z.W - 3 || py >= z.H - 3) continue;
    if (!z.pisos[Math.floor(py / 5) * z.tw + Math.floor(px / 5)]) continue;
    let firme = true;
    for (let dy = -2; dy <= 2 && firme; dy++) for (let dx = -2; dx <= 2; dx++) if (z.bloq[(py + dy) * z.W + px + dx] !== 0) { firme = false; break; }
    if (!firme) continue;
    const o = k.poner('com_piedra_viaje', px, py, 'apagada');
    if (o) return o;
  }
  const [lx, ly] = libreCerca(z, x, y);
  return k.poner('com_piedra_viaje', lx, ly, 'apagada', true);
}

/**
 * Que todo se pueda alcanzar: desde la primera entrada, inunda lo caminable; si una salida, el jefe, la piedra de viaje o un
 * cofre quedan aislados, busca el camino más barato (el piso libre cuesta 1, un objeto que estorba 25, el vacío no se cruza)
 * y despeja solo lo que estorba en ese camino. Los ríos se vuelven vado o puente donde hace falta.
 */
export function conectar(z: Zona) {
  const { W, H } = z, N = W * H;
  const ent = Object.values(z.entradas)[0]; if (!ent) return 0;
  const alcanza = new Uint8Array(N);
  const inundar = (x0: number, y0: number) => {
    const pila = [y0 * W + x0]; alcanza[y0 * W + x0] = 1;
    while (pila.length) { const i = pila.pop()!, x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const j = Y * W + X; if (alcanza[j]) continue; const b = z.bloq[j]; if (b === 0 || b === 3) { alcanza[j] = 1; pila.push(j); } }
    }
  };
  inundar(ent[0], ent[1]);
  const metas: [number, number][] = [...Object.values(z.entradas), ...z.salidas.map((s) => [s.cx, s.cy] as [number, number]), ...z.spawns.filter((s) => s.tipo === 'jefe').map((s) => [s.cx, s.cy] as [number, number]), ...z.marcas.filter((m) => m.tipo === 'viaje' || m.tipo === 'cofre').map((m) => [m.cx, m.cy] as [number, number])];
  let abiertos = 0;
  const cerca = (x: number, y: number) => { for (let r = 0; r <= 3; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const X = Math.round(x) + dx, Y = Math.round(y) + dy; if (X >= 0 && Y >= 0 && X < W && Y < H && alcanza[Y * W + X]) return true; } return false; };
  for (const [mx, my] of metas) {
    if (cerca(mx, my)) continue;
    // Dijkstra desde la meta hasta cualquier celda ya alcanzable
    const dist = new Float32Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1);
    let s0 = -1;
    for (let r = 0; r <= 3 && s0 < 0; r++) for (let dy = -r; dy <= r && s0 < 0; dy++) for (let dx = -r; dx <= r; dx++) { const X = Math.round(mx) + dx, Y = Math.round(my) + dy; if (X >= 0 && Y >= 0 && X < W && Y < H && z.bloq[Y * W + X] !== 2) { s0 = Y * W + X; break; } }
    if (s0 < 0) continue;
    const cola: [number, number][] = [[0, s0]]; dist[s0] = 0; let fin = -1;
    while (cola.length) {
      let bi = 0; for (let i = 1; i < cola.length; i++) if (cola[i][0] < cola[bi][0]) bi = i;
      const [d, i] = cola[bi]; cola[bi] = cola[cola.length - 1]; cola.pop();
      if (d > dist[i]) continue;
      if (alcanza[i]) { fin = i; break; }
      const x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const j = Y * W + X; const b = z.bloq[j]; const nd = d + (b === 2 ? 400 : b === 1 ? 25 : 1); if (nd < dist[j]) { dist[j] = nd; prev[j] = i; cola.push([nd, j]); } }
    }
    if (fin < 0) continue;
    // despejar el camino: quitar lo que estorba (salvo salidas y piezas ancla) y abrir ríos
    const fijos = new Set<ObjZ>(); for (const s of z.salidas) { if (s.obj) fijos.add(s.obj); for (const o of s.piezas ?? []) fijos.add(o); }
    for (let i = fin; i >= 0; i = prev[i]) {
      // último recurso: si el camino cruza el vacío (una isla suelta), esa baldosa se vuelve piso como la de al lado
      if (z.bloq[i] === 2) {
        const tx = Math.floor((i % W) / 5), ty = Math.floor(((i / W) | 0) / 5), tw = z.tw;
        const vecino = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => z.pisos[(ty + b) * tw + tx + a]).find((q) => q) ?? Object.values(z.pisos).find((q) => q);
        if (vecino) z.pisos[ty * tw + tx] = { ...vecino };
        for (let yy = ty * 5; yy < ty * 5 + 5; yy++) for (let xx = tx * 5; xx < tx * 5 + 5; xx++) if (z.bloq[yy * W + xx] === 2) z.bloq[yy * W + xx] = 0;
        abiertos++;
        continue;
      }
      if (z.bloq[i] !== 1) continue;
      const x = i % W, y = (i / W) | 0;
      for (let oi = z.objetos.length - 1; oi >= 0; oi--) {
        const o = z.objetos[oi]; if (fijos.has(o)) continue;
        const x0 = Math.round(o.cx - (o.hw - 1) / 2), y0 = Math.round(o.cy - (o.hh - 1) / 2);
        if (x < x0 || x >= x0 + o.hw || y < y0 || y >= y0 + o.hh) continue;
        if (/rio_lava|arroyo/.test(o.id)) { if (/arroyo/.test(o.id)) o.v = 'vado_y'; else { o.id = 'inf2_puente'; o.v = 'piedra'; } }
        else if (o.bloquea) z.objetos.splice(oi, 1);
        for (let yy = Math.max(0, y0); yy < Math.min(H, y0 + o.hh); yy++) for (let xx = Math.max(0, x0); xx < Math.min(W, x0 + o.hw); xx++) if (z.bloq[yy * W + xx] === 1) z.bloq[yy * W + xx] = 0;
      }
      if (z.bloq[i] === 1) z.bloq[i] = 0;
      abiertos++;
    }
    alcanza.fill(0); inundar(ent[0], ent[1]);
  }
  return abiertos;
}

/** El río de lava: tramos de la Forja de norte a sur que serpentean, bloquean el paso y dejan puentes donde pasa el camino. */
function rioDeLava(k: Constructor, r: () => number, arroyo = false) {
  const z = k.z, { tw, th } = z;
  const rio = REGISTRO.find((d) => d.id === (arroyo ? 'par_arroyo' : 'inf2_rio_lava')), puente = REGISTRO.find((d) => d.id === (arroyo ? 'par_puente' : 'inf2_puente'));
  if (!rio) return;
  let bx = Math.floor(tw * (0.35 + r() * 0.3));
  const cruzaCamino = (tx: number, ty: number) => { for (let y = ty * 5; y < ty * 5 + 5; y++) for (let x = tx * 5; x < tx * 5 + 5; x++) if (k.reserva[y * z.W + x]) return true; return false; };
  const bloquear = (tx: number, ty: number, v: number) => { for (let y = ty * 5; y < ty * 5 + 5; y++) for (let x = tx * 5; x < tx * 5 + 5; x++) if (z.bloq[y * z.W + x] !== 2) z.bloq[y * z.W + x] = v; };
  /** Un tramo: recto de norte a sur, o un codo (`codo`) que une dos lados de la baldosa. */
  const tramo = (tx: number, ty: number, codo?: string) => {
    if (!z.pisos[ty * tw + tx]) return;
    const x0 = tx * 5, y0 = ty * 5;
    if (!arroyo) k.piso('lava_grietas', tx, ty);
    if (!codo && cruzaCamino(tx, ty)) {
      if (arroyo && r() < 0.35) { k.poner(rio, x0 + 2, y0 + 2, 'vado_y', true); return; }
      if (puente) {
        k.poner(puente, x0 + 2, y0 + 2, arroyo ? (r() < 0.7 ? 'x' : 'musgoso') : r() < 0.7 ? 'piedra' : 'hueso', true);
        // solo se pasa por el tablero: el agua a los lados del puente bloquea (antes la baldosa entera quedaba libre y el
        // héroe cruzaba por el agua, dibujado detrás del puente). El juego sube al que va por el tablero (ver escena.ts)
        bloquear(tx, ty, 1);
        // el tablero mide 6 casillas: la huella del puente se sale de la baldosa y tapaba la salida. Se libera con una casilla de más a cada lado
        for (let y = y0 + 1; y <= y0 + 3; y++) for (let x = x0 - 1; x <= x0 + 5; x++) if (x >= 0 && x < z.W) z.bloq[y * z.W + x] = 0;
        (z.puentes ??= []).push({ cx: x0 + 2.5, cy: y0 + 2.5 });
        return;
      }
    }
    const v = codo ?? (arroyo ? (r() < 0.6 ? 'recto_y' : r() < 0.5 ? 'piedras_y' : 'juncal_y') : r() < 0.6 ? 'recto_y' : r() < 0.5 ? 'ancho_y' : 'meandro_y');
    k.poner(rio, x0 + 2, y0 + 2, v, true);
    // los juncos de la orilla van como objeto aparte: el agua se dibuja como suelo y lo alto tiene que poder tapar
    if (arroyo) for (const j of juncosDeTramo(v, tx * 31 + ty)) k.poner('par_juncos_orilla', x0 + 2 + j.dx, y0 + 2 + j.dy, j.v, true);
    // el camino no se corta: si un codo cae sobre él, se deja pasar
    bloquear(tx, ty, codo && cruzaCamino(tx, ty) ? 0 : 1);
  };
  // de norte a sur; cuando el cauce se corre de columna dobla con dos codos (nunca corre en x hacia atrás más de una baldosa)
  for (let by = 0; by < th; by++) {
    const lado = by > 1 && by < th - 2 && r() < 0.3 ? (r() < 0.5 ? -1 : 1) : 0;
    const nx = bx + lado;
    if (lado && nx >= 2 && nx <= tw - 3 && !cruzaCamino(bx, by) && !cruzaCamino(nx, by)) {
      tramo(bx, by, lado > 0 ? 'codo_e' : 'codo_n');
      tramo(nx, by, lado > 0 ? 'codo_o' : 'codo_s');
      bx = nx;
    } else tramo(bx, by);
  }
}

/**
 * Suelo del páramo de la Forja: cada baldosa de pasto, tierra o camino pasa a `par_suelo` con la variante que empalma con
 * sus vecinas (manchas continuas, sin mosaico), y después se riegan detalles en el piso (raíces, piedras, pisadas, rodadas,
 * charcos, ceniza junto a los fuegos). `humedos`: centros de baldosa donde el suelo va más mojado.
 */
function sueloParamo(k: Constructor, humedos: [number, number][] = []) {
  const z = k.z;
  pisosParamo(z.tw, z.th, (bx, by) => z.pisos[by * z.tw + bx]?.id, z.semilla, { humedos }).forEach((p, i) => { if (p) z.pisos[i] = p; });
  const fuegos = z.objetos.filter((o) => /fogata|hoguera|rescoldos/.test(o.id)).map((o) => [o.cx, o.cy] as [number, number]);
  for (const d of regarDecalsParamo({ W: z.W, H: z.H, semilla: z.semilla, fuegos,
    tipo: (x, y) => (z.bloq[y * z.W + x] ? 'bloqueado' : k.reserva?.[y * z.W + x] ? 'camino' : 'libre'),
    estado: (x, y) => { const p = z.pisos[Math.floor(y / 5) * z.tw + Math.floor(x / 5)]; return p?.id === 'par_suelo' ? estadoEn(p.v, ((x % 5) + 0.5) / 5, ((y % 5) + 0.5) / 5) : 1; } }))
    k.poner(d.id, d.cx, d.cy, d.v, true);
}

/** Murallas de fortaleza en los bordes de atrás de un pueblo, con portón abierto donde salen los caminos. */
function amurallar(k: Constructor, huecos: [number, number][]) {
  const z = k.z, { tw, th } = z, r = k.r;
  const mur = REGISTRO.find((d) => d.id === 'for2_muralla'), alm = REGISTRO.find((d) => d.id === 'for2_almena'), por = REGISTRO.find((d) => d.id === 'for2_porton');
  if (!mur) return;
  const hueco = (bx: number, by: number) => huecos.some(([x, y]) => Math.abs(Math.floor(x / 5) - bx) <= 1 && Math.abs(Math.floor(y / 5) - by) <= 1);
  const poner = (d: ObjetoDef | undefined, v: string, bx: number, by: number) => { if (!d) return; const [hw, hh] = huellaDe(d, v); k.poner(d, bx * 5 + (hw - 1) / 2, by * 5 + (hh - 1) / 2, v, true); };
  for (let bx = 1; bx < tw - 1; bx++) {
    if (hueco(bx, 1)) { if (Math.abs(Math.floor(huecos.find(([x]) => Math.abs(Math.floor(x / 5) - bx) <= 1)![0] / 5) - bx) === 0) poner(por, 'abierto', bx, 1); continue; }
    poner(bx % 4 === 2 && alm ? alm : mur, bx % 4 === 2 ? 'estandarte' : r() < 0.2 ? 'saeteras' : r() < 0.15 ? 'contrafuerte' : 'almenada', bx, 1);
  }
  for (let by = 1; by < th - 1; by++) {
    if (hueco(1, by)) { if (Math.abs(Math.floor(huecos.find(([, y]) => Math.abs(Math.floor(y / 5) - by) <= 1)![1] / 5) - by) === 0) poner(por, 'abierto_y', 1, by); continue; }
    poner(by % 4 === 2 && alm ? alm : mur, by % 4 === 2 ? 'estandarte_y' : r() < 0.2 ? 'saeteras_y' : r() < 0.15 ? 'contrafuerte_y' : 'almenada_y', 1, by);
  }
}

/** Cofres de la Forja según el lugar: madera y hierro afuera, malditos abajo, relicarios en templos y tumbas. */
function cofresDe(z: Zona, tema: string): string[] {
  if (z.tipo === 'mazmorra') {
    if (/templo|tumba|catedral|abadia/.test(tema)) return ['cofre_sarcofago_tesoro', 'cofre_maldito', 'cofre_hierro', 'cofre_noble'];
    return ['cofre_maldito', 'cofre_maldito', 'cofre_hierro', 'cofre_noble'];
  }
  return ['cofre_madera', 'cofre_madera', 'cofre_hierro', 'cofre_noble'];
}
function colocarInteractivos(k: Constructor, cofres: number, santuarios: number, tema = '') {
  const z = k.z;
  const pc = cofresDe(z, tema);
  const ps = ['com_santuario_obelisco', 'com_santuario_cuernos', 'com_santuario_estela', 'com_santuario_calaveras', 'com_santuario_caldero', 'com_santuario_monolito'];
  for (let i = 0, n = 0; i < cofres * 20 && n < cofres; i++) {
    const x = 3 + Math.floor(k.r() * (z.W - 6)), y = 3 + Math.floor(k.r() * (z.H - 6));
    if (z.bloq[y * z.W + x]) continue;
    const o = k.poner(pc[Math.floor(k.r() * pc.length)], x, y, k.r() < 0.5 ? 'cerrado' : 'cerrado_y', false, 'cofre');
    if (o) { n++; z.marcas.push({ tipo: 'cofre', cx: x, cy: y }); }
  }
  for (let i = 0, n = 0; i < santuarios * 20 && n < santuarios; i++) {
    const x = 3 + Math.floor(k.r() * (z.W - 6)), y = 3 + Math.floor(k.r() * (z.H - 6));
    if (z.bloq[y * z.W + x]) continue;
    const pozo = k.r() < 0.3;
    const id = pozo ? (k.r() < 0.5 ? 'com_pozo_vida' : 'com_pozo_mana') : ps[Math.floor(k.r() * ps.length)];
    const o = k.poner(id, x, y, pozo ? 'lleno' : 'activo', false, pozo ? 'pozo' : 'santuario');
    if (o) n++;
  }
  // urnas y ataúdes que se rompen
  for (let i = 0, n = 0; i < 200 && n < 4 + Math.floor(z.W * z.H / 3000); i++) {
    const x = 3 + Math.floor(k.r() * (z.W - 6)), y = 3 + Math.floor(k.r() * (z.H - 6));
    if (z.bloq[y * z.W + x]) continue;
    if (k.poner(k.r() < 0.6 ? 'com_urna' : 'com_barril_explosivo', x, y, k.r() < 0.5 ? 'entera' : undefined, false, 'romper')) n++;
  }
}

function lejos(k: Constructor, de: [number, number][]): [number, number] {
  const z = k.z; let best: [number, number] = [z.W >> 1, z.H >> 1], bd = -1;
  for (let i = 0; i < 400; i++) {
    const x = 4 + Math.floor(k.r() * (z.W - 8)), y = 4 + Math.floor(k.r() * (z.H - 8));
    if (z.bloq[y * z.W + x]) continue;
    let ok = true; for (let dy = -2; dy <= 2 && ok; dy++) for (let dx = -2; dx <= 2; dx++) if (z.bloq[(y + dy) * z.W + x + dx] === 1 || z.bloq[(y + dy) * z.W + x + dx] === 2) { ok = false; break; }
    if (!ok) continue;
    const d = Math.min(...de.map(([a, b]) => Math.hypot(a - x, b - y)));
    if (d > bd) { bd = d; best = [x, y]; }
  }
  return best;
}
function sembrar(k: Constructor, n: number, evitar: [number, number][]) {
  const z = k.z;
  for (let i = 0, c = 0; i < n * 20 && c < n; i++) {
    const x = 3 + Math.floor(k.r() * (z.W - 6)), y = 3 + Math.floor(k.r() * (z.H - 6));
    if (z.bloq[y * z.W + x]) continue;
    if (evitar.some(([a, b]) => Math.hypot(a - x, b - y) < 16)) continue;
    if (z.spawns.some((s) => Math.hypot(s.cx - x, s.cy - y) < 9)) continue;
    const q = k.r();
    z.spawns.push({ cx: x, cy: y, tipo: q < 0.07 ? 'unico' : q < 0.16 ? 'campeon' : 'grupo', fuerza: 0.7 + k.r() * 0.6 });
    c++;
  }
}

// ------------------------------------------------------------------ cavernas orgánicas
/**
 * Cava una caverna a nivel de celda sobre el esqueleto de cuartos y enlaces: cada cuarto es una cámara de borde irregular
 * (elipse deformada con ruido), cada enlace un túnel curvo de ancho variable con nichos, más algún lazo extra para que no
 * sea un solo pasillo. Dos pasadas de autómata redondean. Reescribe `suelo` y `sala` (por baldosa) y devuelve las celdas abiertas.
 */
function cavarCueva(k: Constructor, cuartos: number[][], enlaces: [number[], number[]][], suelo: Uint8Array, sala: Uint8Array, conJefe: boolean): Uint8Array {
  const z = k.z, r = k.r, { W, H, tw, th } = z;
  let ab = new Uint8Array(W * H); const nuc = new Uint8Array(W * H);
  const n1 = ruido2(r, W, H, 6), n2 = ruido2(r, W, H, 2.5);
  const disco = (m: Uint8Array, cx: number, cy: number, rad: number) => {
    for (let y = Math.floor(cy - rad); y <= cy + rad; y++) for (let x = Math.floor(cx - rad); x <= cx + rad; x++)
      if (x >= 2 && y >= 2 && x < W - 2 && y < H - 2 && Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= rad) m[y * W + x] = 1;
  };
  const centro = (c: number[]): [number, number] => [(c[0] + c[2] / 2) * 5, (c[1] + c[3] / 2) * 5];
  const radios = cuartos.map((c, i) => { const jefe = conJefe && i === cuartos.length - 1; return [Math.max(jefe ? 12.5 : 5.5, c[2] * 2.7), Math.max(jefe ? 12.5 : 5.5, c[3] * 2.7)]; });
  cuartos.forEach((c, i) => {
    const [cx, cy] = centro(c), [rx, ry] = radios[i], punta = i === 0 || i === cuartos.length - 1;
    for (let y = Math.floor(cy - ry - 3); y <= cy + ry + 3; y++) for (let x = Math.floor(cx - rx - 3); x <= cx + rx + 3; x++) {
      if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) continue;
      const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry), n = n1[y * W + x] * 0.65 + n2[y * W + x] * 0.35;
      if (d < 0.8 + (n - 0.5) * 0.8) ab[y * W + x] = 1;
    }
    // el centro (escalera, piedra de viaje, jefe y su tesoro) siempre queda despejado
    disco(ab, cx, cy + 1, conJefe && i === cuartos.length - 1 ? 10 : punta ? 4.6 : 3.2); disco(nuc, cx, cy + 1, conJefe && i === cuartos.length - 1 ? 10 : punta ? 4.6 : 3.2);
  });
  // lazos: algún cuarto se une además con otro cercano que no era su vecino en la cadena
  const unidos = (a: number[], b: number[]) => enlaces.some(([p, q]) => (p === a && q === b) || (p === b && q === a));
  for (const a of cuartos) if (r() < 0.4) {
    let mejor: number[] | null = null, bd = 34;
    for (const b of cuartos) { if (b === a || unidos(a, b)) continue; const [ax, ay] = centro(a), [bx, by] = centro(b), d = Math.hypot(ax - bx, ay - by); if (d < bd) { bd = d; mejor = b; } }
    if (mejor) enlaces.push([a, mejor]);
  }
  for (const [a, b] of enlaces) {
    const [ax, ay] = centro(a), [bx, by] = centro(b), dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
    const off = (r() - 0.5) * L * 0.55, mx = (ax + bx) / 2 - (dy / L) * off, my = (ay + by) / 2 + (dx / L) * off;
    const pasos = Math.ceil(L * 2), fase = r() * 6.28, f2 = 5 + r() * 6;
    for (let i = 0; i <= pasos; i++) {
      const t = i / pasos, u = 1 - t, x = u * u * ax + 2 * u * t * mx + t * t * bx, y = u * u * ay + 2 * u * t * my + t * t * by;
      disco(ab, x, y, 2.8 + 0.9 * Math.sin(t * f2 + fase)); disco(nuc, x, y, 2);
      // nichos y ensanches a los lados del túnel
      if (r() < 0.03) disco(ab, x + (r() - 0.5) * 9, y + (r() - 0.5) * 9, 2.2 + r() * 1.8);
    }
  }
  for (let it = 0; it < 2; it++) {
    const o = ab.slice();
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      let c = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && !ab[(y + dy) * W + x + dx]) c++;
      if (c >= 5) o[y * W + x] = 0; else if (c <= 2) o[y * W + x] = 1;
    }
    ab = o;
  }
  for (let i = 0; i < W * H; i++) if (nuc[i]) ab[i] = 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) ab[y * W + x] = 0;
  suelo.fill(0); sala.fill(0);
  for (let by = 0; by < th; by++) for (let bx = 0; bx < tw; bx++) {
    let hay = false; for (let y = by * 5; y < by * 5 + 5 && !hay; y++) for (let x = bx * 5; x < bx * 5 + 5; x++) if (ab[y * W + x]) { hay = true; break; }
    if (!hay) continue;
    suelo[by * tw + bx] = 1;
    const px = bx * 5 + 2.5, py = by * 5 + 2.5;
    if (cuartos.some((c, i) => { const [cx, cy] = centro(c); return Math.hypot((px - cx) / radios[i][0], (py - cy) / radios[i][1]) < 0.85; })) sala[by * tw + bx] = 1;
  }
  return ab;
}
/** Peñascos por todo el contorno de la caverna: altos donde la roca queda detrás del piso (se ve de frente) y bajos donde queda delante (para no tapar). */
function bordeCueva(k: Constructor, ab: Uint8Array, id = 'cue_penasco', pre = '', puede?: (i: number) => boolean) {
  const z = k.z, r = k.r, { W, H } = z;
  const pen = REGISTRO.find((d) => d.id === id); if (!pen) return;
  const cub = new Uint8Array(W * H);
  const op = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && !!ab[y * W + x];
  const de = (talla: string) => { const vs = pen.variantes.filter((v) => v.startsWith(pre + talla)); return vs[Math.floor(r() * vs.length)]; };
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (ab[y * W + x] || cub[y * W + x] || (puede && !puede(y * W + x))) continue;
    let borde = false; for (let dy = -1; dy <= 1 && !borde; dy++) for (let dx = -1; dx <= 1; dx++) if (op(x + dx, y + dy)) { borde = true; break; }
    if (!borde) continue;
    const atras = op(x + 1, y) || op(x, y + 1) || op(x + 1, y + 1);
    if (atras) {
      k.poner(pen, x - 0.2 + r() * 0.4, y - 0.2 + r() * 0.4, de(r() < 0.7 ? 'alta' : 'media'), true);
      for (let dy = 0; dy <= 1; dy++) for (let dx = 0; dx <= 1; dx++) if (x + dx < W && y + dy < H && !(dx && dy)) cub[(y + dy) * W + x + dx] = 1;
    } else if (r() < 0.8) {
      k.poner(pen, x + 0.3, y + 0.3, de(r() < 0.12 ? 'media' : 'baja'), true);
      cub[y * W + x] = 1; if (r() < 0.5 && x + 1 < W) cub[y * W + x + 1] = 1;
    }
  }
}

// ------------------------------------------------------------------ la costa de los mundos abiertos
const ESTILO_BORDE: Record<string, string> = { paramo: 'paramo', cementerio: 'cementerio', desierto: 'desierto', nieve: 'nieve', selva: 'selva', infierno: 'infierno', ahogada: 'ahogada', celestial: 'celestial' };
/**
 * Recorta el contorno de un exterior o un pueblo a nivel de celda: una franja de ancho irregular junto al vacío pasa a
 * ser roca (no se pisa, se pinta negra) y se bordea con los riscos del tema. Caminos, salidas, entradas, piedras de
 * viaje, edificios y grupos quedan protegidos; si aun así algo dejara de alcanzarse, el recorte se deshace entero.
 */
function costa(k: Constructor, tema: string) {
  const e = ESTILO_BORDE[tema]; if (!e) return;
  const z = k.z, r = k.r, { W, H } = z;
  const d = new Int16Array(W * H).fill(99), cola: number[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (z.bloq[i] === 2) { d[i] = 0; cola.push(i); } else if (x === 0 || y === 0 || x === W - 1 || y === H - 1) { d[i] = 1; cola.push(i); } }
  for (let q = 0; q < cola.length; q++) { const i = cola[q], x = i % W, y = (i - x) / W; if (d[i] >= 8) continue; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const j = Y * W + X; if (d[j] > d[i] + 1) { d[j] = d[i] + 1; cola.push(j); } } }
  const prot = new Uint8Array(W * H);
  const guarda = (cx: number, cy: number, rad: number) => { for (let y = Math.floor(cy - rad); y <= cy + rad; y++) for (let x = Math.floor(cx - rad); x <= cx + rad; x++) if (x >= 0 && y >= 0 && x < W && y < H) prot[y * W + x] = 1; };
  for (let i = 0; i < W * H; i++) if (k.reserva[i]) guarda(i % W, Math.floor(i / W), 2);
  for (const sa of z.salidas) guarda(sa.cx, sa.cy, 8);
  for (const p of Object.values(z.entradas)) guarda(p[0], p[1], 8);
  for (const m of z.marcas) guarda(m.cx, m.cy, 5);
  for (const sp of z.spawns) guarda(sp.cx, sp.cy, 3);
  for (const o of z.objetos) if (o.tag || o.hw >= 4 || o.hh >= 4) guarda(o.cx, o.cy, Math.max(o.hw, o.hh) / 2 + 2);
  const n1 = ruido2(r, W, H, 6), n2 = ruido2(r, W, H, 2.2), fuera = new Uint8Array(W * H);
  let hay = 0;
  for (let i = 0; i < W * H; i++) if (z.bloq[i] !== 2 && !prot[i] && d[i] <= 0.6 + (n1[i] * 0.7 + n2[i] * 0.3) * 4.6) { fuera[i] = 1; hay++; }
  if (!hay) return;
  const bloq0 = z.bloq.slice(), obj0 = z.objetos;
  z.objetos = z.objetos.filter((o) => { const x = Math.floor(o.cx), y = Math.floor(o.cy); return !(x >= 0 && y >= 0 && x < W && y < H && fuera[y * W + x]); });
  for (let i = 0; i < W * H; i++) if (fuera[i]) z.bloq[i] = 1;
  // todo lo importante se sigue alcanzando desde la primera entrada
  const vis = new Uint8Array(W * H), e0 = Object.values(z.entradas)[0];
  if (e0) {
    let ini = -1; for (let rad = 0; rad < 6 && ini < 0; rad++) for (let dy = -rad; dy <= rad && ini < 0; dy++) for (let dx = -rad; dx <= rad; dx++) { const X = Math.floor(e0[0]) + dx, Y = Math.floor(e0[1]) + dy; if (X >= 0 && Y >= 0 && X < W && Y < H && !z.bloq[Y * W + X]) { ini = Y * W + X; break; } }
    const pila = ini >= 0 ? [ini] : []; if (ini >= 0) vis[ini] = 1;
    while (pila.length) { const i = pila.pop()!, x = i % W, y = (i - x) / W; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const j = Y * W + X; if (vis[j] || z.bloq[j]) continue; vis[j] = 1; pila.push(j); } }
    const llega = (cx: number, cy: number) => { for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const X = Math.floor(cx) + dx, Y = Math.floor(cy) + dy; if (X >= 0 && Y >= 0 && X < W && Y < H && vis[Y * W + X]) return true; } return false; };
    const antes = (cx: number, cy: number) => { for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const X = Math.floor(cx) + dx, Y = Math.floor(cy) + dy; if (X >= 0 && Y >= 0 && X < W && Y < H && !bloq0[Y * W + X]) return true; } return false; };
    const ptos: [number, number][] = [...z.salidas.map((q): [number, number] => [q.cx, q.cy]), ...Object.values(z.entradas), ...z.spawns.map((q): [number, number] => [q.cx, q.cy]), ...z.marcas.map((q): [number, number] => [q.cx, q.cy])];
    // (solo cuenta lo que antes del recorte tenía piso al lado: una salida sobre el agua no es culpa de la costa)
    const mal = ptos.filter(([x, y]) => antes(x, y) && !llega(x, y));
    if (mal.length) { (globalThis as any).__costaMal = { id: z.id, mal: mal.length, de: ptos.length, ini }; z.bloq.set(bloq0); z.objetos = obj0; return; }
  }
  z.hueco ??= new Uint8Array(W * H);
  const ab = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) { if (fuera[i]) z.hueco[i] = 1; else if (z.bloq[i] !== 2) ab[i] = 1; }
  bordeCueva(k, ab, 'bor_risco', e + '_', (i) => !!fuera[i]);
}

const ESCOMBRO_TEMA: Record<string, string> = { tumba: 'desierto', templo: 'selva', santuario: 'infierno', abismo: 'infierno', celestial_interior: 'celestial', catedral_ahogada: 'ahogada', mina: 'paramo' };
function escombroFrente(k: Constructor, suelo: Uint8Array, estilo: string) {
  const z = k.z, r = k.r, { W, tw, th } = z;
  const pen = REGISTRO.find((d) => d.id === 'bor_risco'); if (!pen) return;
  const de = (talla: string) => { const vs = pen.variantes.filter((v) => v.startsWith(estilo + '_' + talla)); return vs[Math.floor(r() * vs.length)]; };
  const puestos: { o: ObjZ; i: number }[] = [];
  // cuántas regiones separadas de piso libre hay (para comprobar que el escombro no parte ninguna)
  const regiones = () => { const v = new Uint8Array(W * z.H); let n = 0; for (let i0 = 0; i0 < v.length; i0++) { if (v[i0] || z.bloq[i0]) continue; n++; const pila = [i0]; v[i0] = 1; while (pila.length) { const i = pila.pop()!, x = i % W, y = (i - x) / W; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= z.H) continue; const j = Y * W + X; if (!v[j] && !z.bloq[j]) { v[j] = 1; pila.push(j); } } } } return n; };
  const antes = regiones();
  const pon = (x: number, y: number) => {
    const i = y * W + x; if (z.bloq[i] || k.reserva[i] || r() > 0.42) return;
    const o = k.poner(pen, x + 0.3, y + 0.3, de(r() < 0.1 ? 'media' : 'baja'), true); if (!o) return; z.bloq[i] = 1; puestos.push({ o, i });
  };
  for (let by = 0; by < th; by++) for (let bx = 0; bx < tw; bx++) {
    if (!suelo[by * tw + bx]) continue;
    if (bx === tw - 1 || !suelo[by * tw + bx + 1]) for (let y = by * 5; y < by * 5 + 5; y++) pon(bx * 5 + 4, y);
    if (by === th - 1 || !suelo[(by + 1) * tw + bx]) for (let x = bx * 5; x < bx * 5 + 5; x++) pon(x, by * 5 + 4);
  }
  // si el escombro partió el piso en más regiones (algún rincón quedó aislado), se quita entero
  if (regiones() !== antes) { const fuera = new Set(puestos.map((q) => q.o)); z.objetos = z.objetos.filter((o) => !fuera.has(o)); for (const q of puestos) z.bloq[q.i] = 0; }
}

// ------------------------------------------------------------------ mazmorra
function mazmorra(def: DefZona, semilla: number): Zona {
  const z = nuevaZona(def, semilla), k = new Constructor(z), t = tematica(def.tema), r = k.r;
  k.reserva = new Uint8Array(z.W * z.H);
  const { tw, th } = z;
  for (let by = 0; by < th; by++) for (let bx = 0; bx < tw; bx++) k.vaciar(bx, by);
  const suelo = new Uint8Array(tw * th);
  const cuartos: [number, number, number, number][] = [];
  for (let i = 0; i < 80 && cuartos.length < Math.floor((tw * th) / 45); i++) {
    const w = 2 + Math.floor(r() * 4), h = 2 + Math.floor(r() * 4);
    const x = 1 + Math.floor(r() * (tw - w - 2)), y = 1 + Math.floor(r() * (th - h - 2));
    if (cuartos.some(([a, b, c, d]) => x < a + c + 1 && x + w + 1 > a && y < b + d + 1 && y + h + 1 > b)) continue;
    cuartos.push([x, y, w, h]);
  }
  // ordenar en cadena (el primero es la entrada, el último el fondo) uniendo cada cuarto con el más cercano ya unido
  const orden = [cuartos.shift()!];
  const enlaces: [number[], number[]][] = [];
  while (cuartos.length) {
    let bi = 0, bj = 0, bd = Infinity;
    cuartos.forEach((c, i) => orden.forEach((o, j) => { const d = Math.abs(c[0] + c[2] / 2 - o[0] - o[2] / 2) + Math.abs(c[1] + c[3] / 2 - o[1] - o[3] / 2); if (d < bd) { bd = d; bi = i; bj = j; } }));
    const c = cuartos.splice(bi, 1)[0];
    const o = orden[bj];
    enlaces.push([o, c]);
    // pasillo en L
    let x = Math.floor(o[0] + o[2] / 2), y = Math.floor(o[1] + o[3] / 2);
    const X = Math.floor(c[0] + c[2] / 2), Y = Math.floor(c[1] + c[3] / 2);
    const primeroX = r() < 0.5;
    const marca = () => { suelo[y * tw + x] = 1; };
    if (primeroX) { while (x !== X) { marca(); x += Math.sign(X - x); } while (y !== Y) { marca(); y += Math.sign(Y - y); } }
    else { while (y !== Y) { marca(); y += Math.sign(Y - y); } while (x !== X) { marca(); x += Math.sign(X - x); } }
    marca();
    orden.push(c);
  }
  // los jefes grandes pelean en una sala con aire: la del fondo crece (en bloques de 5 casillas) alrededor de su centro
  const SALA_JEFE: Record<string, number> = { senor_demonio: 7, aun_saar: 7, dragon_oseo: 6, campana_ahoga: 6, madre_cienaga: 6, rey_escarcha: 6, abadesa: 5, caballero_abismo: 5, verdugo: 5, rey_sin_sombra: 5, gigante_helado: 5 };
  const lado = def.jefe ? SALA_JEFE[def.jefe] : 0;
  if (lado) {
    const c = orden[orden.length - 1], cx = c[0] + c[2] / 2, cy = c[1] + c[3] / 2;
    const w = Math.min(tw - 2, Math.max(c[2], lado)), h = Math.min(th - 2, Math.max(c[3], lado));
    c[0] = Math.max(1, Math.min(tw - 1 - w, Math.round(cx - w / 2))); c[1] = Math.max(1, Math.min(th - 1 - h, Math.round(cy - h / 2))); c[2] = w; c[3] = h;
  }
  const sala = new Uint8Array(tw * th);
  for (const [x, y, w, h] of orden) for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { suelo[j * tw + i] = 1; sala[j * tw + i] = 1; }
  const abierto = t.organica ? cavarCueva(k, orden, enlaces, suelo, sala, !!def.jefe) : null;
  const manchas = ruido2(r, tw, th, 3);
  for (let by = 0; by < th; by++) for (let bx = 0; bx < tw; bx++) if (suelo[by * tw + bx]) {
    const m = manchas[by * tw + bx];
    k.piso(m > 0.66 ? t.parches[1] : m < 0.22 ? t.parches[2] : t.piso, bx, by);
    for (let y = by * 5; y < by * 5 + 5; y++) for (let x = bx * 5; x < bx * 5 + 5; x++) z.bloq[y * z.W + x] = 0;
  }
  if (abierto) {
    // la roca maciza dentro de las baldosas con piso: no se pasa y se pinta negra; el contorno lleva peñascos
    z.hueco = new Uint8Array(z.W * z.H);
    for (let y = 0; y < z.H; y++) for (let x = 0; x < z.W; x++) if (!abierto[y * z.W + x] && suelo[Math.floor(y / 5) * tw + Math.floor(x / 5)]) { z.bloq[y * z.W + x] = 1; z.hueco[y * z.W + x] = 1; }
    if (typeof t.organica === 'string') bordeCueva(k, abierto, 'bor_risco', t.organica + '_'); else bordeCueva(k, abierto);
  }
  // muros: en los bordes de atrás (hacia -x y -y) de cada baldosa con suelo
  const opcionesMuro: [[string, string[]], [string, string[]]][] = [[t.muroX ?? ['mon_muro', ['izq']], t.muroY ?? ['mon_muro', ['der']]], ...(t.murosAlt ?? [])];
  const [[mx, vx], [my, vy]] = opcionesMuro[Math.floor(r() * opcionesMuro.length)];
  const defX = t.islas || abierto ? undefined : REGISTRO.find((d) => d.id === mx), defY = t.islas || abierto ? undefined : REGISTRO.find((d) => d.id === my);
  if (t.islas) islas(k, t.islas, suelo, sala);
  if (t.rieles) rieles(k, suelo, sala);
  for (let by = 0; by < th; by++) for (let bx = 0; bx < tw; bx++) {
    if (!suelo[by * tw + bx]) continue;
    if (by === 0 || !suelo[(by - 1) * tw + bx]) if (defX) {
      const v = vx[Math.floor(r() * vx.length)], [hw, hh] = huellaDe(defX, v);
      k.poner(defX, bx * 5 + (hw - 1) / 2, by * 5 + (hh - 1) / 2, v, true);
    }
    if (bx === 0 || !suelo[by * tw + bx - 1]) if (defY) {
      const v = vy[Math.floor(r() * vy.length)], [hw, hh] = huellaDe(defY, v);
      k.poner(defY, bx * 5 + (hw - 1) / 2, by * 5 + (hh - 1) / 2, v, true);
    }
  }
  // el frente de las mazmorras de obra (hacia la cámara) no lleva muro: en vez de un piso cortado a regla, escombro y roca
  // caída del tema a lo largo de esos bordes, que estrecha y desordena el filo
  if (!abierto && !t.islas && !(globalThis as any).__sinEscombro) escombroFrente(k, sala, ESCOMBRO_TEMA[def.tema] ?? 'cementerio'); // (solo en las salas: en un pasillo podría cerrar el paso)
  // entrada (primer cuarto) y fondo (último)
  const c0 = orden[0], cN = orden[orden.length - 1];
  const centroDe = (c: [number, number, number, number]): [number, number] => [Math.floor((c[0] + c[2] / 2) * 5), Math.floor((c[1] + c[3] / 2) * 5)];
  const p0 = centroDe(c0), pN = centroDe(cN);
  for (const p of [p0, pN]) for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const X = p[0] + dx, Y = p[1] + dy; if (X >= 0 && Y >= 0 && X < z.W && Y < z.H) k.reserva[Y * z.W + X] = 1; }
  // decoración
  const area = orden.reduce((s, c) => s + c[2] * c[3], 0) * 25;
  for (const c of orden) if (c[2] >= 3 && c[3] >= 3 && r() < 0.6) {
    const gs = k.sel(t.grande); if (!gs.length) continue;
    const g = gs[Math.floor(r() * gs.length)];
    for (const [fx, fy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) k.poner(g.d, Math.floor((c[0] + c[2] * fx) * 5), Math.floor((c[1] + c[3] * fy) * 5));
  }
  // con islas o vías, los pasillos (puentes y rieles) quedan libres de adornos
  const enSuelo = abierto ? (x: number, y: number) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!abierto[(Math.floor(y) + dy) * z.W + Math.floor(x) + dx]) return false; return true; }
    : (x: number, y: number) => !!(t.islas || t.rieles ? sala : suelo)[Math.floor(y / 5) * tw + Math.floor(x / 5)];
  k.regar(t.disperso, Math.floor(area / 160), 1, 1, z.W - 1, z.H - 1, enSuelo);
  k.regar(t.luces, Math.floor(area / 500), 1, 1, z.W - 1, z.H - 1, enSuelo);
  k.regar(t.deco, Math.floor(area / 2500), 1, 1, z.W - 1, z.H - 1, enSuelo);
  // salidas: la primera en la entrada, las demás al fondo
  def.salidas.forEach((s, i) => {
    const p = i === 0 ? p0 : i === 1 ? pN : centroDe(orden[Math.max(1, Math.floor((orden.length * i) / (def.salidas.length + 1)))]);
    const arriba = s.lado === 'arriba';
    const id = arriba ? (def.tema === 'tumba' ? 'tum_escalera' : 'com_escalera_subida') : def.tema === 'tumba' ? 'tum_escalera' : 'com_escalera';
    const v = arriba ? (def.tema === 'tumba' ? 'subida' : 'piedra') : def.tema === 'tumba' ? 'bajada' : 'bajada';
    const o = k.poner(id, p[0], p[1] - 2, v, true);
    z.salidas.push({ cx: p[0], cy: p[1] - 1, destino: s.destino, entrada: s.entrada, nombre: s.nombre, obj: o ?? undefined });
    z.entradas[s.lado] = [p[0], p[1] + 2];
    z.entradas['salida_' + s.destino] = [p[0], p[1] + 2];
  });
  if (!z.entradas.arriba) z.entradas.arriba = [p0[0], p0[1] + 2];
  if (def.piedraViaje) { const o = ponerPiedra(k, p0[0], p0[1]); if (o) z.marcas.push({ tipo: 'viaje', cx: o.cx, cy: o.cy }); }
  colocarInteractivos(k, 2 + Math.floor(area / 3500), 1 + Math.floor(area / 7000), def.tema);
  // ni la entrada ni la sala del jefe llevan grupos sembrados: la escolta del jefe llega por oleadas
  sembrar(k, Math.floor(area / 260), def.jefe ? [p0, [pN[0], pN[1] + 2]] : [p0]);
  if (def.jefe) {
    z.spawns.push({ cx: pN[0], cy: pN[1] + 2, tipo: 'jefe', fuerza: 1 });
    // la sala del jefe: cosas que no deberían existir
    const mis = ['mis_trono_huesos', 'mis_manos', 'mis_ojos_oscuridad', 'mis_carne_viva', 'mis_estatua_doliente', 'mis_pozo_almas', 'mis_reliquia', 'mis_libro_maldito', 'mis_espejo'];
    // los jefes enormes necesitan la sala despejada: el anillo y el tesoro se abren
    const g = def.jefe === 'aun_saar' || def.jefe === 'senor_demonio' ? 1.7 : def.jefe === 'campana_ahoga' ? 1.3 : 1;
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2 + r(); k.poner(mis[i % mis.length], pN[0] + Math.cos(a) * (4 + r() * 3) * g, pN[1] + 2 + Math.sin(a) * (4 + r() * 3) * g); }
    // la sala de Ozmaren: el piso se raja y deja ver la lava
    if (def.jefe === 'senor_demonio') {
      const bx = Math.floor(pN[0] / 5), by = Math.floor((pN[1] + 2) / 5);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const X = bx + dx, Y = by + dy; if (dx * dx + dy * dy > 5 || X < 0 || Y < 0 || X >= z.tw || Y >= z.th || !z.pisos[Y * z.tw + X]) continue; z.pisos[Y * z.tw + X] = { id: 'lava_grietas', v: Math.floor(r() * 3) }; }
      for (let i = 0; i < 14; i++) { const a = r() * Math.PI * 2, d = 2 + r() * 10; z.marcas.push({ tipo: 'lava', cx: Math.round(pN[0] + Math.cos(a) * d), cy: Math.round(pN[1] + 2 + Math.sin(a) * d) }); }
    }
    // y el tesoro que guardaba
    const tesoro: [string, string][] = [['tesoro_pila', 'grande'], ['tesoro_pila', 'chica'], ['saco_monedas', 'derramado'], ['caliz', 'volcado'], ['corona_suelo', 'con_calavera'], ['jarron_oro', 'de_pie'], ['oro_monton', 'mediano'], ['saco_monedas', 'cerrado']];
    tesoro.forEach(([id, v], i) => { const a = (i / tesoro.length) * Math.PI * 2 + 0.3; k.poner(id, pN[0] + Math.cos(a) * 7.5 * g, pN[1] + 2 + Math.sin(a) * 6 * g, v); });
    // las mazmorras laterales guardan un cofre de tesoro junto a su mini jefe
    if (def.lateral) { const c = k.poner(def.tema === 'tumba' || def.tema === 'templo' ? 'cofre_sarcofago_tesoro' : 'cofre_noble', pN[0] + 4, pN[1] + 5, 'cerrado', true, 'cofre'); if (c) z.marcas.push({ tipo: 'cofre', cx: c.cx, cy: c.cy }); }
  }
  // en las mazmorras a veces asoman ojos en la oscuridad
  k.regar([{ t: ['misterio' as Tema], p: ['ojos', 'manos', 'espejo', 'libro', 'arbol_rostros'] }], 2 + Math.floor(area / 3000), 1, 1, z.W - 1, z.H - 1, enSuelo);
  return z;
}

// ------------------------------------------------------------------ pueblo
const PUEBLOS: Record<string, { paisaje: string; piso: string; extra: Sel[] }> = {
  paramo: { paisaje: 'campamento', piso: 'pasto_seco', extra: [{ t: ['arboles'], p: ['muert', 'roble', 'torc'] }, { t: ['campo'], p: ['roca'] }, { t: ['paramo' as Tema], p: ['par_brezo', 'par_menhir', 'par_tienda', 'par_pozo', 'par_tronco'] }] },
  desierto: { paisaje: 'desierto', piso: 'arena', extra: [{ t: ['desierto'], p: ['palm', 'cactus', 'roca'], s: ['des2_'] }, { t: ['desierto'], p: ['des2_palmera', 'des2_tienda', 'des2_caravana', 'des2_duna'] }] },
  selva: { paisaje: 'campamento', piso: 'selva', extra: [{ t: ['selva', 'arboles'], p: ['arbol', 'palma', 'ceiba', 'helecho'], s: ['sel2_'] }, { t: ['selva'], p: ['sel2_choza', 'sel2_barca', 'sel2_bambu', 'sel2_arbol_gigante'] }] },
  ahogada: { paisaje: 'campamento', piso: 'lajas_musgo', extra: [{ t: ['ahogada' as Tema], p: ['ahg_barril_marino', 'ahg_nasa', 'ahg_red_huesos', 'ahg_bote_roto', 'ahg_ancla', 'ahg_farol_pescador', 'ahg_cruz_marinos'] }] },
  celestial: { paisaje: 'fortaleza', piso: 'arenisca', extra: [{ t: ['celestial' as Tema], p: ['cel_estatua_suplica', 'cel_columna_rota', 'cel_brasero_blanco', 'cel_escombros_marmol', 'cel_estandarte', 'cel_anfora_oro'] }] },
  nieve: { paisaje: 'campamento', piso: 'nieve', extra: [{ t: ['nieve'], p: ['pino', 'roca'] }, { t: ['nieve'], p: ['nie2_pino', 'nie2_cabana', 'nie2_lena', 'nie2_trineo', 'nie2_secadero', 'nie2_estandarte'] }, { t: ['fortaleza'], p: ['for2_pertrechos', 'for2_barricada', 'for2_catapulta'] }] },
  infierno: { paisaje: 'fortaleza', piso: 'fortaleza', extra: [{ t: ['fortaleza'], p: ['cristal', 'pilar', 'estatua'], s: ['for2_'] }, { t: ['fortaleza'], p: ['for2_armeria', 'for2_ballesta', 'for2_pertrechos', 'for2_estatua_rey', 'for2_campana', 'for2_brasero', 'for2_antorchero', 'for2_estandarte'] }] },
};
function pueblo(def: DefZona, semilla: number): Zona {
  const z = nuevaZona(def, semilla), k = new Constructor(z), r = k.r;
  k.reserva = new Uint8Array(z.W * z.H);
  const pu = PUEBLOS[def.tema] ?? PUEBLOS.paramo;
  const { tw, th } = z;
  for (let by = 0; by < th; by++) for (let bx = 0; bx < tw; bx++) {
    const borde = Math.min(bx, by, tw - 1 - bx, th - 1 - by);
    if (borde === 0) k.vaciar(bx, by); else k.piso(pu.piso, bx, by);
  }
  const m = generarPaisaje(pu.paisaje, semilla);
  const ox = Math.floor((tw - m.ancho) / 2), oy = Math.floor((th - m.alto) / 2);
  for (let y = 0; y < m.alto; y++) for (let x = 0; x < m.ancho; x++) { const p = m.pisos[y * m.ancho + x]; if (p) z.pisos[(oy + y) * tw + ox + x] = { ...p }; }
  // lugares para NPC alrededor del centro (se reservan antes de poner objetos)
  const cx0 = (ox + m.ancho / 2) * 5, cy0 = (oy + m.alto / 2) * 5;
  const lugares: [number, number][] = [];
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + 0.4; lugares.push([Math.round(cx0 + Math.cos(a) * 6), Math.round(cy0 + Math.sin(a) * 6)]); }
  for (const [x, y] of lugares) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) k.reserva[(y + dy) * z.W + x + dx] = 1;
  for (const o of m.objetos) {
    const cx = o.cx + ox * 5, cy = o.cy + oy * 5;
    if (/portal_azul/.test(o.id)) continue;
    if (/piedra_viaje/.test(o.id)) { const q = k.poner(o.id, cx, cy, 'encendida', true); if (q) z.marcas.push({ tipo: 'viaje', cx, cy }); continue; }
    if (/baul|alijo/.test(o.id)) { const q = k.poner('cofre_gg', cx, cy, 'cerrado', true, 'baul'); if (q) z.marcas.push({ tipo: 'baul', cx, cy }); continue; }
    k.poner(o.id, cx, cy, o.v);
  }
  if (!z.marcas.some((q) => q.tipo === 'viaje')) { const q = k.poner('com_piedra_viaje', cx0 + 9, cy0 - 7, 'encendida', true); if (q) z.marcas.push({ tipo: 'viaje', cx: q.cx, cy: q.cy }); }
  if (!z.marcas.some((q) => q.tipo === 'baul')) { const q = k.poner('cofre_gg', cx0 - 9, cy0 + 8, 'cerrado', true, 'baul'); if (q) z.marcas.push({ tipo: 'baul', cx: q.cx, cy: q.cy }); }
  lugares.forEach(([x, y], i) => z.marcas.push({ tipo: 'npc', cx: x, cy: y, dato: i }));
  // alrededores
  k.regar(pu.extra, Math.floor((z.W * z.H) / 300), 3, 3, z.W - 3, z.H - 3, (x, y) => Math.hypot(x - cx0, y - cy0) > m.ancho * 2.8);
  // salida: hacia el lado de la primera salida
  def.salidas.forEach((s) => {
    const p: [number, number] = s.lado === 's' ? [Math.floor(z.W / 2), z.H - 8] : s.lado === 'e' ? [z.W - 8, Math.floor(z.H / 2)] : s.lado === 'n' ? [Math.floor(z.W / 2), 7] : [7, Math.floor(z.H / 2)];
    z.salidas.push({ cx: p[0], cy: p[1], destino: s.destino, entrada: s.entrada, nombre: s.nombre });
    z.entradas[s.lado] = [p[0] + (s.lado === 'e' ? -3 : s.lado === 'o' ? 3 : 0), p[1] + (s.lado === 's' ? -3 : s.lado === 'n' ? 3 : 0)];
    z.entradas['salida_' + s.destino] = z.entradas[s.lado];
  });
  // el Barco Varado: el casco grande hace de pueblo, encallado detrás del campamento
  if (def.tema === 'ahogada') for (let i = 0; i < 12; i++) { if (k.poner('ahg_casco_pueblo', cx0 + (r() - 0.5) * 8, cy0 - 16 - r() * 6, ['chozas', 'faroles', 'mercado'][i % 3])) break; }
  if (def.amurallado) amurallar(k, z.salidas.filter((s) => s.cx < 12 || s.cy < 12).map((s) => [s.cx, s.cy] as [number, number]));
  z.entradas.centro = [Math.round(cx0 + 2), Math.round(cy0 + 3)];
  z.entradas.portal = [Math.round(cx0 - 3), Math.round(cy0 + 5)];
  if (def.tema === 'paramo') sueloParamo(k, [[cx0 / 5, cy0 / 5]]);
  void r;
  z.explorado.fill(1); // el campamento se conoce entero desde que llegas
  costa(k, def.tema);
  return z;
}

export function generarZona(def: DefZona, semilla: number): Zona {
  const z = def.tipo === 'pueblo' ? pueblo(def, semilla) : def.tipo === 'mazmorra' ? mazmorra(def, semilla) : exterior(def, semilla);
  for (const o of z.objetos) if (o.id === 'mis_libro_maldito') o.tag = 'libro';
  // los gemelos sin llama del fuego de Doom son solo para dibujar: si el paisaje del motor eligió uno, va el original con su fuego
  for (const o of z.objetos) if (o.id.endsWith('_sin_llama')) o.id = o.id.slice(0, -10);
  // asegurar que toda entrada caiga en celda libre
  for (const k of Object.keys(z.entradas)) z.entradas[k] = libreCerca(z, z.entradas[k][0], z.entradas[k][1]);
  // los pisos 'fortaleza' y 'arcano' parecen de prueba (círculos tachados): se cambian por baldosa de catedral y arenisca
  for (const t of z.pisos) if (t && (t.id === 'fortaleza' || t.id === 'arcano')) t.id = t.id === 'fortaleza' ? 'baldosa_catedral' : 'arenisca';
  if (def.tipo !== 'pueblo') ambientarHorror(z, def);
  conectar(z);
  // un grupo sembrado en un rincón que no se alcanza desde la entrada no sale (quedaba vivo e inalcanzable)
  const e0 = z.entradas.arriba ?? Object.values(z.entradas)[0];
  if (e0) {
    const vis = new Uint8Array(z.W * z.H), i0 = Math.floor(e0[1]) * z.W + Math.floor(e0[0]);
    if (!z.bloq[i0]) {
      const pila = [i0]; vis[i0] = 1;
      while (pila.length) { const i = pila.pop()!, x = i % z.W, y = (i - x) / z.W; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= z.W || Y >= z.H) continue; const j = Y * z.W + X; if (!vis[j] && !z.bloq[j]) { vis[j] = 1; pila.push(j); } } }
      const llega = (cx: number, cy: number) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const X = Math.floor(cx) + dx, Y = Math.floor(cy) + dy; if (X >= 0 && Y >= 0 && X < z.W && Y < z.H && vis[Y * z.W + X]) return true; } return false; };
      z.spawns = z.spawns.filter((sp) => sp.tipo === 'jefe' || llega(sp.cx, sp.cy));
    }
  }
  return z;
}

export const pasable = (z: Zona, x: number, y: number) => { const cx = Math.floor(x), cy = Math.floor(y); if (cx < 0 || cy < 0 || cx >= z.W || cy >= z.H) return false; const b = z.bloq[cy * z.W + cx]; return b === 0 || b === 3; };
export function libreCerca(z: Zona, x: number, y: number): [number, number] {
  for (let r = 0; r < 30; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const X = Math.round(x) + dx, Y = Math.round(y) + dy;
    if (pasable(z, X, Y)) return [X, Y];
  }
  return [Math.round(x), Math.round(y)];
}
/** ¿Se ve (y pasa un proyectil) en línea recta de a a b? */
export function lineaLibre(z: Zona, ax: number, ay: number, bx: number, by: number): boolean {
  const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d * 2);
  for (let i = 1; i < n; i++) { const t = i / n; const x = ax + (bx - ax) * t, y = ay + (by - ay) * t; const b = z.bloq[Math.floor(y) * z.W + Math.floor(x)]; if (b === 1 || b === 2) return false; }
  return true;
}

/** A* en la grilla con 8 direcciones (sin cortar esquinas). Devuelve los puntos centrales de las celdas. */
export function buscarCamino(z: Zona, ax: number, ay: number, bx: number, by: number, max = 4000): [number, number][] | null {
  const W = z.W;
  let sx = Math.floor(ax), sy = Math.floor(ay), tx = Math.floor(bx), ty = Math.floor(by);
  if (!pasable(z, tx, ty)) { const q = libreCerca(z, tx, ty); tx = q[0]; ty = q[1]; }
  if (!pasable(z, sx, sy)) { const q = libreCerca(z, sx, sy); sx = q[0]; sy = q[1]; }
  if (sx === tx && sy === ty) return [[bx, by]];
  const g = new Map<number, number>(), de = new Map<number, number>();
  const abiertos: { k: number; f: number }[] = [];
  const s = sy * W + sx, t = ty * W + tx;
  g.set(s, 0); abiertos.push({ k: s, f: 0 });
  const h = (k: number) => { const x = k % W, y = (k / W) | 0, dx = Math.abs(x - tx), dy = Math.abs(y - ty); return Math.max(dx, dy) + 0.41 * Math.min(dx, dy); };
  let mejor = s, mejorH = h(s), n = 0;
  while (abiertos.length && n++ < max) {
    // montículo simple: buscar el menor (listas cortas)
    let bi = 0; for (let i = 1; i < abiertos.length; i++) if (abiertos[i].f < abiertos[bi].f) bi = i;
    const { k } = abiertos[bi]; abiertos[bi] = abiertos[abiertos.length - 1]; abiertos.pop();
    if (k === t) { mejor = t; break; }
    const x = k % W, y = (k / W) | 0, gk = g.get(k)!;
    const hk = h(k); if (hk < mejorH) { mejorH = hk; mejor = k; }
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const X = x + dx, Y = y + dy;
      if (!pasable(z, X, Y)) continue;
      if (dx && dy && (!pasable(z, x + dx, y) || !pasable(z, x, y + dy))) continue;
      const nk = Y * W + X, ng = gk + (dx && dy ? 1.414 : 1);
      if (ng < (g.get(nk) ?? Infinity)) { g.set(nk, ng); de.set(nk, k); abiertos.push({ k: nk, f: ng + h(nk) * 1.1 }); }
    }
  }
  const camino: [number, number][] = [];
  for (let k = mejor; k !== s; k = de.get(k)!) { camino.push([(k % W) + 0.5, ((k / W) | 0) + 0.5]); if (!de.has(k)) break; }
  camino.reverse();
  if (mejor === t && camino.length) camino[camino.length - 1] = [bx, by];
  // suavizar: saltar puntos con línea libre
  const out: [number, number][] = [];
  let ix = ax, iy = ay, i = 0;
  while (i < camino.length) {
    let j = camino.length - 1;
    while (j > i && !lineaPasable(z, ix, iy, camino[j][0], camino[j][1])) j--;
    out.push(camino[j]); ix = camino[j][0]; iy = camino[j][1]; i = j + 1;
  }
  return out.length ? out : null;
}
function lineaPasable(z: Zona, ax: number, ay: number, bx: number, by: number) {
  const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d * 3);
  for (let i = 1; i <= n; i++) { const t = i / n; const x = ax + (bx - ax) * t, y = ay + (by - ay) * t; for (const [ox, oy] of [[0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]]) if (!pasable(z, x + ox, y + oy)) return false; }
  return true;
}

// ------------------------------------------------------------------ horror: lo que rodea a los jefes y a los lugares de misión
/** Qué pone cada acto (kit de gore y horror de la Forja): [id, variantes]. */
const HORROR_ACTO: Record<number, [string, string[]][]> = {
  1: [['hor_cabezas_picas', ['una', 'tres', 'cerco']], ['hor_cuervos_cadaver', ['suelo', 'horca']], ['hor_colgados', ['munecas', 'pies', 'ganchos']], ['hor_empalado', ['viejo']]],
  2: [['hor_jaula', ['cadaver', 'momia', 'antorcha']], ['hor_mesa_tortura', ['vacia', 'con_cuerpo', 'brasero']], ['hor_nido_huesos', ['chico', 'grande']], ['hor_pila_cadaveres', ['chica', 'grande']]],
  3: [['hor_altar', ['x', 'y']], ['hor_crucificado', ['madera', 'hierro']], ['hor_escritura_sangre', ['circulo', 'palabras', 'sello']]],
  4: [['hor_pared_carne', ['x', 'der']], ['hor_foso_sangre', ['piedra', 'carne']], ['hor_pila_cadaveres', ['quemada']], ['hor_empalado', ['tres']]],
  5: [['hor_pared_carne', ['x', 'der']], ['hor_foso_sangre', ['piedra', 'carne']], ['hor_pila_cadaveres', ['quemada']], ['hor_empalado', ['tres', 'uno']]],
};
HORROR_ACTO[6] = HORROR_ACTO[7] = [...HORROR_ACTO[1], ...HORROR_ACTO[2], ...HORROR_ACTO[3], ...HORROR_ACTO[4], ['hor_escritura_sangre', ['circulo', 'palabras', 'sello']]];
/** Lugares de misión con su escena propia: los que cuelgan del bosque y la guarida de Ciro en la cripta. */
const HORROR_MISION: Record<string, [string, string][]> = {
  a1_bosque: [['hor_colgados', 'pies'], ['hor_cuervos_cadaver', 'horca'], ['hor_colgados', 'munecas'], ['hor_cuervos_cadaver', 'suelo']],
  a1_cripta: [['hor_mesa_tortura', 'con_cuerpo'], ['hor_escritura_sangre', 'palabras'], ['hor_colgados', 'ganchos'], ['hor_cabezas_picas', 'tres'], ['hor_pila_cadaveres', 'chica']],
};
function ambientarHorror(z: Zona, def: DefZona) {
  const k = new Constructor(z), r = rng(z.semilla * 7717 + 31);
  // nada cerca de entradas ni salidas (conectar() igual despeja lo que estorbe después)
  k.reserva = new Uint8Array(z.W * z.H);
  const res = (x: number, y: number, rr: number) => { for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) { const X = Math.round(x) + dx, Y = Math.round(y) + dy; if (X >= 0 && Y >= 0 && X < z.W && Y < z.H) k.reserva[Y * z.W + X] = 1; } };
  for (const e of Object.values(z.entradas)) res(e[0], e[1], 4);
  for (const s of z.salidas) res(s.cx, s.cy, 4);
  const poner = (id: string, v: string, cx: number, cy: number) => {
    for (let i = 0; i < 14; i++) { const a = r() * Math.PI * 2, d = 4 + r() * 5; const o = k.poner(id, Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d), v); if (o) return o; }
    return null;
  };
  const lista = HORROR_ACTO[def.acto] ?? HORROR_ACTO[1];
  // sala del jefe: 3 a 5 piezas alrededor, nunca encima de él (radio 4 a 9)
  const jf = z.spawns.find((s) => s.tipo === 'jefe');
  if (jf) { const n = 3 + Math.floor(r() * 3); for (let i = 0; i < n; i++) { const [id, vs] = lista[Math.floor(r() * lista.length)]; poner(id, vs[Math.floor(r() * vs.length)], jf.cx, jf.cy); } }
  // la escena de la misión: cerca del centro de la zona, lejos de la entrada
  const esc = HORROR_MISION[def.id];
  if (esc) { const s = z.spawns.filter((q) => q.tipo !== 'jefe'); const c = s[Math.floor(s.length / 2)] ?? { cx: z.W / 2, cy: z.H / 2 }; for (const [id, v] of esc) poner(id, v, c.cx, c.cy); }
  // y alguna pieza suelta en las zonas de combate (rara: no tiene que estar en todas partes)
  if (r() < 0.45) { const s = z.spawns[Math.floor(r() * z.spawns.length)]; if (s && s.tipo !== 'jefe') { const [id, vs] = lista[Math.floor(r() * lista.length)]; poner(id, vs[Math.floor(r() * vs.length)], s.cx, s.cy); } }
}
/** Dónde se dibuja y se pisa una salida: las del borde un poco hacia adentro (sobre piso firme), las de puerta en su casilla. */
export function puntoSalida(z: Zona, sa: Salida): [number, number] {
  if (sa.obj) return [sa.cx + 0.5, sa.cy + 0.5];
  const adentro = z.entradas['salida_' + sa.destino] ?? [sa.cx, sa.cy];
  return [(sa.cx + adentro[0]) / 2 + 0.5, (sa.cy + adentro[1]) / 2 + 0.5];
}
