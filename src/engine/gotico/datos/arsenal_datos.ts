import type { TipoArma, Encanto } from '../cuerpo';
import type { WeaponIcon } from '../../loot/weapons';

/**
 * El arsenal elemental de Réquiem de Ceniza, como datos puros (sin pintar nada): las 30 familias de armas de las ocho
 * clases, los cinco niveles visuales (común, excepcional, élite, legendaria y mítica), los siete elementos, la
 * afinidad de cada clase con cada familia y las armas legendarias con nombre propio.
 *
 * De acá salen las bases del botín (`src/engine/loot/arsenal.ts`), el arma en la mano y el ícono 3D (forja_armas.ts y
 * elementos_arma.ts). Todo se arma combinando familia × nivel × elemento: cualquier familia puede llevar cualquier
 * elemento, y la capa del elemento y el metal se aplican encima de la forma de la familia.
 *
 * El juego puede importar `AFINIDAD_ARMA` desde acá o el JSON gemelo `datos/afinidad_armas.json`.
 */

// ------------------------------------------------------------------ clases
export type ClaseId = 'berserker' | 'templario' | 'arcanista' | 'cazadora' | 'nigromante' | 'monje' | 'druida' | 'alquimista';
export const CLASES_HEROE: ClaseId[] = ['berserker', 'templario', 'arcanista', 'cazadora', 'nigromante', 'monje', 'druida', 'alquimista'];

// ------------------------------------------------------------------ familias
/** Cómo se adorna la familia al subir de nivel: hoja (guarda, pomo y lomo), cabeza (púas y aros), asta, vara, arco, puño o frasco. */
export type CategoriaArma = 'hoja' | 'cabeza' | 'asta' | 'vara' | 'arco' | 'puno' | 'frasco';
export type FamiliaArma =
  | 'espada' | 'mandoble' | 'cimitarra' | 'katana' | 'estoque' | 'daga' | 'katar' | 'garra'
  | 'hacha' | 'gran_hacha' | 'maza' | 'lucero' | 'martillo' | 'mangual'
  | 'lanza' | 'alabarda' | 'tridente' | 'guadana' | 'hoz' | 'jabalina'
  | 'arco_corto' | 'arco_largo' | 'ballesta'
  | 'baculo' | 'gran_baculo' | 'varita' | 'orbe' | 'cetro'
  | 'cestus' | 'frascos';

export interface DefFamilia {
  id: FamiliaArma;
  /** la forma del motor (cuerpo.ts) que la pinta en la mano y en el ícono */
  tipo: TipoArma;
  /** el ícono 2D del botín */
  icono: WeaponIcon;
  nombre: { es: string; en: string };
  /** el nombre en español es femenino (para concordar "templada", "mítica") */
  fem: boolean;
  categoria: CategoriaArma;
}
const F = (id: FamiliaArma, tipo: TipoArma, icono: WeaponIcon, es: string, en: string, fem: boolean, categoria: CategoriaArma): DefFamilia => ({ id, tipo, icono, nombre: { es, en }, fem, categoria });
export const FAMILIAS_ARMA: DefFamilia[] = [
  F('espada', 'espada', 'sword', 'Espada', 'Sword', true, 'hoja'),
  F('mandoble', 'mandoble', 'greatsword', 'Mandoble', 'Bastard Greatsword', false, 'hoja'),
  F('cimitarra', 'cimitarra', 'scimitar', 'Sable', 'Sabre', false, 'hoja'),
  F('katana', 'katana', 'katana', 'Katana', 'Katana', true, 'hoja'),
  F('estoque', 'estoque', 'rapier', 'Estoque', 'Rapier', false, 'hoja'),
  F('daga', 'daga', 'dagger', 'Daga', 'Dagger', true, 'hoja'),
  F('katar', 'katar', 'katar', 'Katar', 'Katar', false, 'hoja'),
  F('garra', 'garras', 'claw', 'Garra', 'Claw', true, 'puno'),
  F('hacha', 'hacha', 'axe', 'Hacha', 'Axe', true, 'cabeza'),
  F('gran_hacha', 'hacha_doble', 'greataxe', 'Gran hacha', 'Great Axe', true, 'cabeza'),
  F('maza', 'maza', 'mace', 'Maza', 'Mace', true, 'cabeza'),
  F('lucero', 'maza_estrella', 'morning_star', 'Lucero del alba', 'Morning Star', false, 'cabeza'),
  F('martillo', 'martillo', 'maul', 'Martillo de guerra', 'War Hammer', false, 'cabeza'),
  F('mangual', 'mangual', 'flail', 'Mangual', 'Flail', false, 'cabeza'),
  F('lanza', 'lanza', 'spear', 'Lanza', 'Spear', true, 'asta'),
  F('alabarda', 'alabarda', 'halberd', 'Alabarda', 'Halberd', true, 'asta'),
  F('tridente', 'tridente', 'trident', 'Tridente', 'Trident', false, 'asta'),
  F('guadana', 'guadana', 'scythe', 'Guadaña', 'Scythe', true, 'asta'),
  F('hoz', 'hoz', 'sickle', 'Hoz', 'Sickle', true, 'hoja'),
  F('jabalina', 'jabalina', 'javelin', 'Jabalina', 'Javelin', true, 'asta'),
  F('arco_corto', 'arco_corto', 'bow', 'Arco corto', 'Short Bow', false, 'arco'),
  F('arco_largo', 'arco_largo', 'longbow', 'Arco largo', 'Long Bow', false, 'arco'),
  F('ballesta', 'ballesta', 'crossbow', 'Ballesta', 'Crossbow', true, 'arco'),
  F('baculo', 'baculo', 'staff', 'Báculo', 'Staff', false, 'vara'),
  F('gran_baculo', 'gran_baculo', 'greatstaff', 'Gran báculo', 'Greatstaff', false, 'vara'),
  F('varita', 'varita', 'wand', 'Varita', 'Wand', true, 'vara'),
  F('orbe', 'orbe_mano', 'hand_orb', 'Orbe', 'Orb', false, 'vara'),
  F('cetro', 'cetro', 'scepter', 'Cetro', 'Scepter', false, 'vara'),
  F('cestus', 'cestus', 'cestus', 'Cesto', 'Cestus', false, 'puno'),
  F('frascos', 'frasco', 'flask', 'Frasco', 'Flask', false, 'frasco'),
];
export const FAMILIA: Record<FamiliaArma, DefFamilia> = Object.fromEntries(FAMILIAS_ARMA.map((f) => [f.id, f])) as Record<FamiliaArma, DefFamilia>;

// ------------------------------------------------------------------ niveles
export type NivelArma = 1 | 2 | 3 | 4 | 5;
export interface DefNivel {
  nivel: NivelArma;
  id: 'comun' | 'excepcional' | 'elite' | 'legendaria' | 'mitica';
  /** adjetivo: masculino, femenino e inglés */
  nombre: { m: string; f: string; en: string };
  /** franja de niveles del personaje en la que cae (se pisan un poco entre sí) */
  niveles: [number, number];
  /** multiplicador del daño base */
  k: number;
}
export const TIERS_ARMA: DefNivel[] = [
  { nivel: 1, id: 'comun', nombre: { m: 'tosco', f: 'tosca', en: 'Crude' }, niveles: [1, 22], k: 1 },
  { nivel: 2, id: 'excepcional', nombre: { m: 'templado', f: 'templada', en: 'Tempered' }, niveles: [16, 42], k: 1.9 },
  { nivel: 3, id: 'elite', nombre: { m: 'de élite', f: 'de élite', en: 'Elite' }, niveles: [34, 62], k: 3.2 },
  { nivel: 4, id: 'legendaria', nombre: { m: 'legendario', f: 'legendaria', en: 'Legendary' }, niveles: [54, 82], k: 4.6 },
  { nivel: 5, id: 'mitica', nombre: { m: 'mítico', f: 'mítica', en: 'Mythic' }, niveles: [74, 100], k: 6.6 },
];

// ------------------------------------------------------------------ elementos
export type ElementoArma = Encanto;
export const ELEMENTOS_ARMA: ElementoArma[] = ['fuego', 'hielo', 'veneno', 'rayo', 'sombra', 'sagrado', 'sangre'];
export const NOMBRE_ELEMENTO: Record<ElementoArma, { es: string; en: string }> = {
  fuego: { es: 'de brasas', en: 'of Embers' }, hielo: { es: 'de escarcha', en: 'of Frost' }, veneno: { es: 'de ponzoña', en: 'of Venom' },
  rayo: { es: 'del trueno', en: 'of Thunder' }, sombra: { es: 'de sombra', en: 'of Shadow' }, sagrado: { es: 'de la luz', en: 'of Light' }, sangre: { es: 'de sangre', en: 'of Blood' },
};

/**
 * Qué combinaciones caen como base del botín (el generador acepta cualquiera): común sin elemento, excepcional sin
 * elemento y con uno, y élite, legendaria y mítica con tres elementos cada una. Los elementos rotan por familia, así
 * cada familia pasa por los siete y ninguna familia repite la tanda de la de al lado.
 */
export function elementosDe(familia: FamiliaArma, nivel: NivelArma): (ElementoArma | null)[] {
  const i = FAMILIAS_ARMA.findIndex((f) => f.id === familia);
  const orden = ELEMENTOS_ARMA.map((_, k) => ELEMENTOS_ARMA[(k + i * 3) % 7]);
  switch (nivel) {
    case 1: return [null];
    case 2: return [null, orden[0]];
    case 3: return [orden[1], orden[2], orden[3]];
    case 4: return [orden[4], orden[5], orden[6]];
    case 5: return [orden[1], orden[3], orden[5]];
  }
}

// ------------------------------------------------------------------ afinidad de clase
export type Afinidad = 'afin' | 'neutra' | 'torpe';
/** Las familias con las que cada clase pelea mejor (afín) y peor (torpe); lo demás es neutro. */
const AFINES: Record<ClaseId, FamiliaArma[]> = {
  berserker: ['hacha', 'gran_hacha', 'martillo', 'mangual', 'mandoble'],
  templario: ['espada', 'mandoble', 'maza', 'lucero', 'mangual', 'cetro'],
  arcanista: ['baculo', 'gran_baculo', 'orbe', 'varita'],
  cazadora: ['arco_corto', 'arco_largo', 'ballesta', 'jabalina', 'lanza'],
  nigromante: ['guadana', 'daga', 'varita', 'cetro', 'hoz'],
  monje: ['cestus', 'katar', 'garra', 'baculo'],
  druida: ['lanza', 'hoz', 'baculo', 'gran_baculo'],
  alquimista: ['daga', 'ballesta', 'frascos'],
};
const TORPES: Record<ClaseId, FamiliaArma[]> = {
  berserker: ['varita', 'orbe', 'cetro', 'baculo', 'gran_baculo', 'frascos', 'estoque'],
  templario: ['katar', 'garra', 'cestus', 'frascos', 'hoz', 'varita'],
  arcanista: ['gran_hacha', 'martillo', 'mangual', 'alabarda', 'mandoble', 'cestus'],
  cazadora: ['martillo', 'gran_hacha', 'mangual', 'orbe', 'cetro', 'gran_baculo'],
  nigromante: ['martillo', 'gran_hacha', 'alabarda', 'cestus', 'arco_largo', 'lucero'],
  monje: ['ballesta', 'arco_largo', 'mandoble', 'gran_hacha', 'frascos', 'varita'],
  druida: ['estoque', 'katana', 'ballesta', 'mangual', 'cestus'],
  alquimista: ['mandoble', 'gran_hacha', 'martillo', 'alabarda', 'guadana', 'gran_baculo'],
};
/** Afinidad de cada familia con cada clase: 'afin' (bonificación), 'neutra' o 'torpe' (penalización). */
export const AFINIDAD_ARMA: Record<FamiliaArma, Record<ClaseId, Afinidad>> = Object.fromEntries(FAMILIAS_ARMA.map((f) => [f.id,
  Object.fromEntries(CLASES_HEROE.map((c) => [c, AFINES[c].includes(f.id) ? 'afin' : TORPES[c].includes(f.id) ? 'torpe' : 'neutra'])),
])) as Record<FamiliaArma, Record<ClaseId, Afinidad>>;

// ------------------------------------------------------------------ el arma 3D de una combinación
/** Metal de la hoja: hierro picado, acero, acero pavonado, y el metal del elemento (venas que brillan) desde excepcional. */
const HOJA_NIVEL = ['ar_hierro', 'ar_acero', 'ar_acero_negro', 'ar_acero_negro', 'ar_obsidiana'];
const MANGO_CORTO = ['cu_cuero', 'cu_cuero', 'cu_cuero_negro', 'cu_cuero_negro', 'cu_hueso_demonio'];
const MANGO_LARGO = ['madera_vieja', 'madera_lisa', 'ar_ebano', 'ar_ebano', 'cu_hueso_demonio'];
const PALAS_ARCO = ['madera', 'madera_lisa', 'ar_ebano', 'cu_cuerno', 'cu_hueso_demonio'];
/** El cetro es de metal: bronce, oro, acero pavonado y hueso. */
const MANGO_CETRO = ['madera_lisa', 'cu_bronce', 'ar_oro', 'ar_acero_negro', 'cu_hueso_demonio'];
/** La gema del elemento (brilla sola). */
export const GEMA_ELEMENTO: Record<ElementoArma, string> = { fuego: 'cu_ojo_brasa', hielo: 'cu_ojo_hielo', veneno: 'cu_ojo_verde', rayo: 'cu_rayo', sombra: 'cu_sombra', sagrado: 'cu_luz_santa', sangre: 'cu_sangre_viva' };
export const matHoja = (nivel: NivelArma, el?: ElementoArma | null) => (el && nivel >= 2 ? `ar_${el}_${nivel >= 4 ? 2 : 1}` : HOJA_NIVEL[nivel - 1]);

export interface EspecArma { tipo: TipoArma; mat: string; mango: string; gema?: string; encanto?: ElementoArma; nivel: NivelArma }
/** Lo que pinta el motor para una familia, un nivel y un elemento (el mismo objeto sirve para `Equipo.arma` y para el ícono). */
export function especArma(familia: FamiliaArma, nivel: NivelArma, el?: ElementoArma | null, extra: Partial<EspecArma> = {}): EspecArma {
  const d = FAMILIA[familia];
  const largo = d.categoria === 'asta' || d.categoria === 'vara';
  const mango = d.tipo === 'cetro' ? MANGO_CETRO[nivel - 1] : d.categoria === 'arco' && d.tipo !== 'ballesta' ? PALAS_ARCO[nivel - 1] : largo || d.tipo === 'ballesta' ? MANGO_LARGO[nivel - 1] : MANGO_CORTO[nivel - 1];
  const e: EspecArma = { tipo: d.tipo, mat: matHoja(nivel, el), mango, nivel };
  if (nivel >= 3 || d.categoria === 'vara') e.gema = el ? GEMA_ELEMENTO[el] : 'magia';
  if (el) e.encanto = el;
  return { ...e, ...extra };
}
export const idArma = (familia: FamiliaArma, nivel: NivelArma, el?: ElementoArma | null) => `ars_${familia}_${nivel}${el ? '_' + el : ''}`;

// ------------------------------------------------------------------ legendarias con nombre propio
export interface ArmaLegendaria {
  id: string;
  familia: FamiliaArma;
  elemento: ElementoArma;
  nivel: 4 | 5;
  /** nivel del personaje en que puede caer */
  nv: number;
  nombre: { es: string; en: string };
  lore: { es: string; en: string };
  /** material propio de la hoja o del mango (si no, el del nivel y el elemento) */
  mat?: string; mango?: string;
}
const LG = (id: string, familia: FamiliaArma, elemento: ElementoArma, nivel: 4 | 5, nv: number, es: string, en: string, loreEs: string, loreEn: string, o: { mat?: string; mango?: string } = {}): ArmaLegendaria =>
  ({ id, familia, elemento, nivel, nv, nombre: { es, en }, lore: { es: loreEs, en: loreEn }, ...o });
/** Sesenta armas legendarias y míticas con nombre, una línea de leyenda cada una (nombres propios, de ningún otro juego). */
export const ARMAS_LEGENDARIAS: ArmaLegendaria[] = [
  LG('leg_ultima_misa', 'espada', 'sagrado', 5, 92, 'Última Misa', 'The Last Mass', 'Cada tajo es una absolución que nadie pidió.', 'Every cut is an absolution no one asked for.'),
  LG('leg_diezmo_rojo', 'espada', 'sangre', 4, 61, 'Diezmo Rojo', 'Red Tithe', 'La iglesia cobraba en oro. Esta hoja cobra en venas abiertas.', 'The church took its tithe in gold. This blade takes it in open veins.'),
  LG('leg_hoguera_herejes', 'mandoble', 'fuego', 5, 88, 'Hoguera de los Herejes', "Heretics' Pyre", 'Ardieron cien en su nombre; el acero todavía huele a ellos.', 'A hundred burned in its name; the steel still smells of them.'),
  LG('leg_eclipse_verdugo', 'mandoble', 'sombra', 4, 66, 'Eclipse del Verdugo', "Headsman's Eclipse", 'Cuando cae, el día se apaga para alguien.', 'When it falls, the day goes dark for someone.'),
  LG('leg_lengua_brasero', 'cimitarra', 'fuego', 4, 57, 'Lengua de Brasero', 'Brazier Tongue', 'Habla en chispas y deja cicatrices que no cierran.', 'It speaks in sparks and leaves scars that never close.'),
  LG('leg_media_luna_leprosa', 'cimitarra', 'veneno', 5, 81, 'Media Luna Leprosa', 'Leper Crescent', 'Curva como una sonrisa podrida, y igual de contagiosa.', 'Curved like a rotten smile, and just as catching.'),
  LG('leg_invierno_sin_nombre', 'katana', 'hielo', 5, 95, 'Invierno sin Nombre', 'Nameless Winter', 'El herrero la templó en la nieve sobre la tumba de su hija.', 'The smith quenched it in the snow over his daughter\'s grave.'),
  LG('leg_relampago_ahorcado', 'katana', 'rayo', 4, 70, 'Relámpago Ahorcado', 'Hanged Lightning', 'La forjaron con la cadena de una horca que alcanzó un rayo.', 'Forged from the chain of a gallows struck by lightning.'),
  LG('leg_aguja_baronesa', 'estoque', 'sangre', 5, 84, 'Aguja de la Baronesa', "Baroness's Needle", 'Bebía de sus doncellas con ella: elegante, paciente, insaciable.', 'She drank from her maidens with it: elegant, patient, insatiable.'),
  LG('leg_duelo_helado', 'estoque', 'hielo', 4, 58, 'Duelo Helado', 'Frozen Duel', 'Ganó cien duelos al alba; los muertos siguen en guardia.', 'It won a hundred duels at dawn; the dead are still en garde.'),
  LG('leg_beso_comadrona', 'daga', 'veneno', 4, 55, 'Beso de la Comadrona', "Midwife's Kiss", 'Trajo al mundo a muchos. Sacó de él a más.', 'It brought many into the world. It took more out of it.'),
  LG('leg_confesion_muda', 'daga', 'sombra', 5, 86, 'Confesión Muda', 'Silent Confession', 'Entra entre dos costillas y se lleva los secretos.', 'It slips between two ribs and takes the secrets with it.'),
  LG('leg_garra_campanario', 'katar', 'rayo', 4, 63, 'Garra del Campanario', 'Belfry Talon', 'La tormenta tocó a muerto tres veces sobre su yunque.', 'The storm tolled for the dead three times over its anvil.'),
  LG('leg_desollador_santos', 'katar', 'sangre', 5, 90, 'Desollador de Santos', 'Saint-Flayer', 'Los mártires también sangran. Más despacio.', 'Martyrs bleed too. Only slower.'),
  LG('leg_garfios_penitente', 'garra', 'sombra', 4, 60, 'Garfios del Penitente', "Penitent's Hooks", 'Se los clavaba a sí mismo cada noche. Ahora te toca a ti.', 'He drove them into himself every night. Now it is your turn.'),
  LG('leg_caricia_fiebre', 'garra', 'veneno', 5, 83, 'Caricia de la Fiebre', "Fever's Caress", 'Una caricia, tres días de delirio, una fosa.', 'One caress, three days of delirium, one pit.'),
  LG('leg_lenadora_piras', 'hacha', 'fuego', 4, 56, 'Leñadora de Piras', 'Pyre-Feller', 'Taló el bosque entero para quemar a una sola bruja.', 'It felled the whole forest to burn a single witch.'),
  LG('leg_diente_glaciar', 'hacha', 'hielo', 5, 87, 'Diente del Glaciar', "Glacier's Tooth", 'Salió del hielo eterno con un cadáver todavía aferrado al mango.', 'It came out of the eternal ice with a corpse still gripping the haft.'),
  LG('leg_tajo_patibulo', 'gran_hacha', 'sangre', 5, 93, 'Tajo del Patíbulo', 'Gallows Cleave', 'Cortó tantas cabezas que el patíbulo la reclamó como suya.', 'It took so many heads the scaffold claimed it as its own.'),
  LG('leg_partecumbres', 'gran_hacha', 'rayo', 4, 68, 'Partecumbres', 'Peakbreaker', 'Un golpe abrió el paso de la montaña. Y la avalancha.', 'One blow opened the mountain pass. And the avalanche.'),
  LG('leg_catecismo_hierro', 'maza', 'sagrado', 4, 59, 'Catecismo de Hierro', 'Iron Catechism', 'Enseña la fe a golpes, una lección por hueso.', 'It teaches faith by blows, one lesson per bone.'),
  LG('leg_sermon_abismo', 'maza', 'sombra', 5, 89, 'Sermón del Abismo', 'Abyssal Sermon', 'Predica en la oscuridad; los cráneos responden amén.', 'It preaches in the dark; the skulls answer amen.'),
  LG('leg_lucero_purgatorio', 'lucero', 'fuego', 5, 85, 'Lucero del Purgatorio', 'Purgatory Star', 'Cayó del cielo encendido y nunca terminó de apagarse.', 'It fell from the sky ablaze and never finished going out.'),
  LG('leg_rosario_puas', 'lucero', 'sangre', 4, 62, 'Rosario de Púas', 'Rosary of Spikes', 'Cada púa es una cuenta; cada cuenta, un pecador.', 'Every spike a bead; every bead, a sinner.'),
  LG('leg_juicio_tormenta', 'martillo', 'rayo', 5, 96, 'Juicio de la Tormenta Vieja', "Old Storm's Verdict", 'El cielo dicta sentencia; el martillo la ejecuta.', 'The sky passes sentence; the hammer carries it out.'),
  LG('leg_mazo_inquisicion', 'martillo', 'sagrado', 4, 71, 'Mazo de la Inquisición', 'Inquisition Maul', 'Los confesos se salvaban. Los demás también, pero en pedazos.', 'The confessed were saved. So were the rest, in pieces.'),
  LG('leg_incensario_plaga', 'mangual', 'veneno', 4, 64, 'Incensario de la Plaga', 'Plague Censer', 'Lo mecían en las procesiones de la peste. Nadie sabe si curaba o contagiaba.', 'They swung it in the plague processions. No one knows if it cured or spread it.'),
  LG('leg_pendulo_osario', 'mangual', 'sombra', 5, 91, 'Péndulo del Osario', 'Ossuary Pendulum', 'Marca la hora de los muertos, y nunca atrasa.', 'It keeps the hour of the dead, and never runs late.'),
  LG('leg_estalactita_monarca', 'lanza', 'hielo', 4, 67, 'Estalactita del Monarca Muerto', "Dead Monarch's Icicle", 'Atravesó al rey en su trono de hielo; él no dejó de sonreír.', 'It pierced the king on his ice throne; he never stopped smiling.'),
  LG('leg_asta_peregrina', 'lanza', 'sagrado', 5, 82, 'Asta de la Peregrina', "Pilgrim's Shaft", 'La santa caminó mil leguas con ella y no volvió a rezar.', 'The saint walked a thousand leagues with it and never prayed again.'),
  LG('leg_guardiana_pira', 'alabarda', 'fuego', 5, 94, 'Guardiana de la Pira', 'Pyre Warden', 'Vigila la hoguera para que nadie escape del fuego.', 'It guards the bonfire so no one escapes the flames.'),
  LG('leg_centinela_matadero', 'alabarda', 'sangre', 4, 65, 'Centinela del Matadero', 'Slaughterhouse Sentinel', 'Hizo guardia en la puerta del matadero durante el asedio. Comió bien.', 'It stood guard at the slaughterhouse during the siege. It ate well.'),
  LG('leg_arpon_marea_muerta', 'tridente', 'hielo', 5, 88, 'Arpón de la Marea Muerta', 'Dead Tide Harpoon', 'Pescó ahogados durante un siglo; algunos aún tironean de la punta.', 'It fished the drowned for a century; some still tug at the tines.'),
  LG('leg_tenedor_naufragio', 'tridente', 'rayo', 4, 69, 'Tenedor del Naufragio', 'Shipwreck Fork', 'Llamó al rayo que partió la nave del obispo en dos.', 'It called down the bolt that split the bishop\'s ship in two.'),
  LG('leg_cosecha_cenizas', 'guadana', 'sombra', 5, 97, 'Cosecha de Cenizas', 'Harvest of Ashes', 'Siega almas como trigo negro y no deja ni rastrojo.', 'It reaps souls like black wheat and leaves no stubble.'),
  LG('leg_segadora_fosas', 'guadana', 'veneno', 4, 72, 'Segadora de Fosas', 'Gravepit Reaper', 'Abre la tierra, y lo que duerme debajo despierta con hambre.', 'It opens the earth, and what sleeps beneath wakes hungry.'),
  LG('leg_luna_matanza', 'hoz', 'sangre', 5, 84, 'Luna de Matanza', 'Slaughter Moon', 'Los druidas viejos cortaban muérdago con ella. Y gargantas.', 'The old druids cut mistletoe with it. And throats.'),
  LG('leg_cuchilla_herbolario', 'hoz', 'veneno', 4, 57, 'Cuchilla del Herbolario', "Herbalist's Crescent", 'Corta raíces y venas con la misma indiferencia.', 'It cuts roots and veins with the same indifference.'),
  LG('leg_grito_halcon_negro', 'jabalina', 'rayo', 5, 86, 'Grito del Halcón Negro', "Black Falcon's Cry", 'Vuela más rápido que el trueno que la sigue.', 'It flies faster than the thunder that follows it.'),
  LG('leg_cometa_brea', 'jabalina', 'fuego', 4, 60, 'Cometa de Brea', 'Pitch Comet', 'Cae del cielo envuelta en brea ardiendo, y no pregunta a quién.', 'It falls from the sky wrapped in burning pitch, and never asks on whom.'),
  LG('leg_tripa_sapo', 'arco_corto', 'veneno', 4, 55, 'Cuerda de Tripa de Sapo', 'Toadgut String', 'La cuerda es de tripa de sapo de ciénaga. Las flechas también apestan.', 'The string is bog-toad gut. The arrows stink too.'),
  LG('leg_ojo_cuervo_ciego', 'arco_corto', 'sombra', 5, 83, 'Ojo del Cuervo Ciego', "Blind Raven's Eye", 'No necesita ver. Huele el miedo.', 'It needs no sight. It smells fear.'),
  LG('leg_arpa_tempestad', 'arco_largo', 'rayo', 4, 66, 'Arpa de la Tempestad', 'Tempest Harp', 'Su cuerda canta antes de cada muerte.', 'Its string sings before every death.'),
  LG('leg_aliento_ultimo_invierno', 'arco_largo', 'hielo', 5, 98, 'Aliento del Último Invierno', "Last Winter's Breath", 'Cada flecha deja un rastro de escarcha sobre las tumbas.', 'Every arrow leaves a trail of frost across the graves.'),
  LG('leg_bombarda_alquimista', 'ballesta', 'fuego', 5, 90, 'Bombarda de la Alquimista', "Alchemist's Bombard", 'Dispara virotes rellenos de fuego líquido.', 'It fires bolts filled with liquid fire.'),
  LG('leg_aguijon_boticario', 'ballesta', 'veneno', 4, 62, 'Aguijón del Boticario', "Apothecary's Sting", 'Cada virote viene con su receta. Ninguna cura.', 'Every bolt comes with a prescription. None of them cure.'),
  LG('leg_cayado_inquisidor', 'baculo', 'fuego', 4, 58, 'Cayado del Inquisidor', "Inquisitor's Crook", 'Encendía las hogueras sin tocar la leña.', 'It lit the pyres without touching the kindling.'),
  LG('leg_raiz_bosque_podrido', 'baculo', 'veneno', 5, 87, 'Raíz del Bosque Podrido', 'Rotwood Root', 'Brotan hongos negros donde se apoya.', 'Black fungus sprouts wherever it rests.', { mango: 'corteza_muerta' }),
  LG('leg_obispo_hueco', 'gran_baculo', 'sombra', 5, 99, 'Báculo del Obispo Hueco', "Hollow Bishop's Crozier", 'El obispo se vació de fe y se llenó de otra cosa.', 'The bishop emptied himself of faith and filled with something else.'),
  LG('leg_faro_invierno', 'gran_baculo', 'hielo', 4, 73, 'Faro del Invierno', 'Winter Beacon', 'Alumbra el camino de los que mueren de frío.', 'It lights the way for those who freeze to death.'),
  LG('leg_dedo_ahorcado', 'varita', 'sombra', 4, 56, 'Dedo del Ahorcado', "Hanged Man's Finger", 'Es un dedo de verdad. Todavía señala.', 'It is a real finger. It still points.', { mango: 'cu_hueso' }),
  LG('leg_astilla_vertebra', 'varita', 'sangre', 5, 85, 'Astilla de Vértebra', 'Vertebra Splinter', 'Tallada de la columna de un rey que no quiso morir.', 'Carved from the spine of a king who refused to die.', { mango: 'cu_hueso' }),
  LG('leg_tempestad_embotellada', 'orbe', 'rayo', 5, 92, 'Corazón de Tempestad Embotellada', 'Bottled Tempest Heart', 'Una tormenta entera, encerrada y furiosa.', 'A whole storm, locked away and furious.'),
  LG('leg_lagrima_martir', 'orbe', 'sagrado', 4, 64, 'Lágrima de la Mártir', "Martyr's Tear", 'Lloró una sola vez antes de arder.', 'She wept only once before she burned.'),
  LG('leg_cetro_papa_leproso', 'cetro', 'sagrado', 5, 95, 'Cetro del Papa Leproso', "Leper Pope's Scepter", 'Gobernó la ciudad apestada hasta que se le cayeron las manos.', 'He ruled the plague city until his hands fell off.', { mat: 'ar_oro' }),
  LG('leg_reina_sangrante', 'cetro', 'sangre', 4, 69, 'Cetro de la Reina Sangrante', "Bleeding Queen's Scepter", 'Firmaba decretos con su propia sangre. Y con la de otros.', 'She signed decrees in her own blood. And in others\'.'),
  LG('leg_nudillos_campana', 'cestus', 'rayo', 4, 61, 'Nudillos de Campana', 'Bell Knuckles', 'Cada golpe suena como un toque a difuntos.', 'Every blow rings like a funeral knell.'),
  LG('leg_punos_fogonero', 'cestus', 'fuego', 5, 89, 'Puños del Fogonero', "Stoker's Fists", 'Alimentó el horno del monasterio con lo que golpeaba.', 'He fed the monastery furnace with whatever he struck.'),
  LG('leg_destilado_fin_mundo', 'frascos', 'veneno', 5, 100, 'Destilado del Fin del Mundo', "World's-End Distillate", 'Una gota envenena un pozo. Un frasco, una ciudad.', 'One drop poisons a well. One flask, a city.'),
  LG('leg_fuego_abad', 'frascos', 'fuego', 4, 63, 'Fuego Líquido del Abad', "Abbot's Liquid Fire", 'El abad lo guardaba para los herejes. Y para los acreedores.', 'The abbot kept it for heretics. And for creditors.'),
];
/** El arma 3D de una legendaria: su familia en su nivel y elemento, con su material propio. */
export function especLegendaria(l: ArmaLegendaria): EspecArma {
  return especArma(l.familia, l.nivel, l.elemento, { ...(l.mat ? { mat: l.mat } : {}), ...(l.mango ? { mango: l.mango } : {}) });
}
