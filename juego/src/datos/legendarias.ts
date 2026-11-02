// Armas legendarias por escalón de nivel (6, 15, 24, 33, 42), la legendaria temática de cada jefe
// y los conjuntos nuevos (con el "Legado GG" de la familia). Todo original. Se suman a UNICOS y CONJUNTOS al cargar.
import { BASES, UNICOS, CONJUNTOS } from './objetos_datos';
import type { Conjunto, Elemento, RangoStat, Stat, Unico } from '../juego/tipos_objetos';

const r = (stat: Stat, min: number, max: number = min): RangoStat => ({ stat, min, max });

/** Nivel necesario de cada escalón (también es el nivel desde el que caen). */
export const NIVEL_LEGENDARIA = [6, 15, 24, 33, 42] as const;
const DANO: [number, number][] = [[60, 90], [90, 130], [125, 170], [160, 215], [200, 260]];
const ELEM: [number, number][] = [[5, 10], [10, 18], [16, 28], [24, 40], [34, 58]];
const STAT_ELEM: Record<Exclude<Elemento, 'fisico'>, Stat> = { fuego: 'dano_fuego', frio: 'dano_frio', rayo: 'dano_rayo', veneno: 'dano_veneno', sombra: 'dano_sombra', luz: 'dano_luz', sangre: 'dano_sangre' };
const LANZADOR = new Set(['baculo', 'varita', 'cetro']);

/** Una legendaria viva: el daño mejorado y el daño de su elemento salen del escalón, lo demás lo pone cada una. */
function leg(
  id: string, es: string, en: string, base: string, escalon: 1 | 2 | 3 | 4 | 5, vivo: Exclude<Elemento, 'fisico'>,
  extra: RangoStat[], loreEs: string, loreEn: string,
): Unico {
  const b = BASES.find((x) => x.id === base);
  if (!b) throw new Error(`legendaria ${id}: falta la base ${base}`);
  const k = escalon - 1, d = DANO[k], e = ELEM[k];
  const lanzador = LANZADOR.has(b.familia);
  const stats: RangoStat[] = [
    lanzador ? r('dano_pct', Math.round(d[0] * 0.5), Math.round(d[1] * 0.5)) : r('dano_pct', d[0], d[1]),
    r(STAT_ELEM[vivo], lanzador ? Math.round(e[0] * 1.2) : e[0], lanzador ? Math.round(e[1] * 1.2) : e[1]),
    ...extra,
  ];
  return { id, nombre: [es, en], base, nivel: NIVEL_LEGENDARIA[k], req: NIVEL_LEGENDARIA[k], vivo, legendario: true, stats, lore: [loreEs, loreEn] };
}

export const LEGENDARIAS: Unico[] = [
  // ---------------- escalón 1 (nivel 6): el valle de Velmora
  leg('vela_primera_vigilia', 'Vela de la Primera Vigilia', 'First Vigil Candle', 'hoja_vigilia', 1, 'fuego',
    [r('radio_luz', 2), r('vida', 10, 15), r('res_fuego', 10)],
    'La empuñó el primer centinela de Velmora. Su llama no conoce el sueño.', 'The first sentinel of Velmora held it. Its flame knows no sleep.'),
  leg('hacha_lenador_helado', 'Hacha del Leñador Helado', 'Frozen Woodsman\'s Axe', 'hacha_lenador', 1, 'frio',
    [r('ralentizar', 10), r('fue', 4, 6), r('vit', 4, 6)],
    'Taló los pinos del valle el invierno en que nadie volvió del bosque.', 'It felled the valley pines the winter no one came back from the woods.'),
  leg('campanilla_santa_oria', 'Campanilla de Santa Oria', 'Saint Oria\'s Handbell', 'maza_cofradia', 1, 'luz',
    [r('aturdir', 10), r('res_sombra', 10, 15), r('radio_luz', 1)],
    'Los novicios la tocaban para espantar a los muertos. A veces funcionaba.', 'The novices rang it to scare off the dead. Sometimes it worked.'),
  leg('aguja_tormenta_seca', 'Aguja de la Tormenta Seca', 'Dry Storm Needle', 'lanza_cazador', 1, 'rayo',
    [r('perforar', 15), r('des', 5, 7), r('vel_ataque', 10)],
    'Cayó un rayo en el páramo y dejó esto clavado en la tierra.', 'Lightning struck the moor and left this buried in the earth.'),
  leg('arco_niebla_paramo', 'Arco de la Niebla del Páramo', 'Moor Mist Bow', 'arco_tejo_paramo', 1, 'sombra',
    [r('des', 5, 7), r('critico', 4), r('robo_mana', 2)],
    'Sus flechas salen de la niebla y vuelven a ella.', 'Its arrows come out of the mist and return to it.'),
  leg('varita_sangrador', 'Varita del Sangrador', 'Bloodletter\'s Wand', 'varita_tejo', 1, 'sangre',
    [r('mas_habilidades', 1), r('mana', 15, 20), r('vel_lanzar', 10), r('robo_vida', 2)],
    'El barbero del pueblo sangraba a los enfermos con ella. Ninguno sanó.', 'The village barber bled the sick with it. None recovered.'),
  leg('aguijon_madre_pozo', 'Aguijón de la Madre del Pozo', 'Well Mother\'s Sting', 'punal_taberna', 1, 'veneno',
    [r('vel_ataque', 15), r('res_veneno', 15), r('des', 4, 6)],
    'La reina de las arañas lo guardaba en el vientre. Todavía gotea.', 'The spider queen kept it in her belly. It still drips.'),
  leg('bordon_peregrino_helado', 'Bordón del Peregrino Helado', 'Frozen Pilgrim\'s Staff', 'baculo_peregrino', 1, 'frio',
    [r('mas_habilidades', 1), r('mana', 15, 25), r('res_frio', 15), r('regen_mana', 20)],
    'Lo encontraron junto a un peregrino que murió de pie, mirando a la abadía.', 'They found it beside a pilgrim who died standing, staring at the abbey.'),

  // ---------------- escalón 2 (nivel 15): la abadía y sus catacumbas
  leg('sentencia_cadalso', 'Sentencia del Cadalso', 'Scaffold Sentence', 'mandoble_verdugo', 2, 'sangre',
    [r('herida_abierta', 25), r('robo_vida', 4, 6), r('golpe_aplastante', 10)],
    'Cada muesca del filo es un nombre. Quedan pocas sin grabar.', 'Every notch on the edge is a name. Few remain uncarved.'),
  leg('alas_relampago', 'Alas del Relámpago', 'Lightning Wings', 'hacha_dos_hojas', 2, 'rayo',
    [r('vel_ataque', 10), r('fue', 6, 9), r('res_rayo', 15)],
    'Dos hojas que se buscan como nubes en tormenta.', 'Two blades that seek each other like storm clouds.'),
  leg('piedra_angular', 'Piedra Angular de Santa Oria', 'Saint Oria\'s Cornerstone', 'mazo_cantero', 2, 'luz',
    [r('aturdir', 15), r('golpe_aplastante', 15), r('res_sombra', 20)],
    'Arrancada de los cimientos de la abadía. Desde entonces el claustro se inclina.', 'Torn from the abbey foundations. The cloister has leaned ever since.'),
  leg('azote_abadesa', 'Azote de la Abadesa', 'The Abbess\'s Scourge', 'mangual_trilla', 2, 'fuego',
    [r('espinas', 8), r('vida', 20, 30), r('res_fuego', 20), r('valor', 25)],
    'Ilvara se azotaba con él cada noche para no oír el Ascua. Una noche dejó de azotarse.', 'Ilvara scourged herself with it each night so as not to hear the Ember. One night she stopped.'),
  leg('centinela_puente_helado', 'Centinela del Puente Helado', 'Frozen Bridge Sentinel', 'alabarda_ronda', 2, 'frio',
    [r('ralentizar', 15), r('vit', 6, 9), r('res_frio', 20)],
    'El guardia del puente murió congelado sin soltarla. Ella sigue de guardia.', 'The bridge guard froze to death without letting go. It still keeps watch.'),
  leg('ultima_cosecha', 'Última Cosecha de Velmora', 'Velmora\'s Last Harvest', 'guadana_siega', 2, 'sombra',
    [r('robo_mana', 3), r('vida_por_muerte', 3), r('herida_abierta', 10)],
    'Segó el trigo del último verano. Lo que cortó en otoño no fue trigo.', 'It reaped the wheat of the last summer. What it cut that autumn was not wheat.'),
  leg('pico_garza_negra', 'Pico de la Garza Negra', 'Black Heron\'s Beak', 'ballesta_ligera', 2, 'sangre',
    [r('perforar', 20), r('des', 6, 9), r('herida_abierta', 15)],
    'Los cazadores del pantano bendecían sus virotes con sangre de garza.', 'The marsh hunters blessed its bolts with heron blood.'),
  leg('diente_boca_arena', 'Diente de la Boca de Arena', 'Tooth of the Sand Maw', 'sable_caravana', 2, 'veneno',
    [r('vel_ataque', 20), r('dano_max', 6, 10), r('des', 6, 9), r('res_veneno', 20)],
    'Las caravanas de Sahrim lo sacaron de las entrañas del gusano. Seguía mordiendo.', 'The Sahrim caravans pulled it from the worm\'s gut. It was still biting.'),

  // ---------------- escalón 3 (nivel 24): el desierto de Sahrim y el manglar
  leg('promesa_penitente', 'Promesa del Penitente', 'Penitent\'s Vow', 'espada_penitente', 3, 'luz',
    [r('res_sombra', 25), r('vida', 25, 35), r('critico', 5)],
    'Juró no envainarla hasta que el Ascua se apagara. Sigue desenvainada.', 'He swore not to sheathe it until the Ember went out. It is still drawn.'),
  leg('cetro_sin_sombra', 'Cetro sin Sombra', 'The Shadowless Sceptre', 'cetro_prior', 3, 'sombra',
    [r('mas_habilidades', 1), r('mana', 30, 45), r('vel_lanzar', 20), r('res_sombra', 20)],
    'Khamer-Ul vendió su sombra por este cetro. La sombra todavía lo reclama.', 'Khamer-Ul sold his shadow for this sceptre. The shadow still claims it.'),
  leg('zarpas_monje_tormenta', 'Zarpas del Monje Tormenta', 'Storm Monk\'s Talons', 'garras_tigre', 3, 'rayo',
    [r('mas_clase', 1), r('vel_ataque', 20), r('des', 8, 12)],
    'Meditó en la cumbre durante una tormenta entera. Bajó con esto en las manos.', 'He meditated on the summit through an entire storm. He came down with these on his hands.'),
  leg('ultimo_favor', 'Último Favor', 'Last Mercy', 'daga_misericordia', 3, 'sangre',
    [r('critico', 8), r('herida_abierta', 25), r('robo_vida', 4, 5)],
    'Servía para rematar a los heridos del campo de batalla. Nunca negó un favor.', 'It was used to finish the wounded on the battlefield. It never refused a mercy.'),
  leg('dedo_bruja_manglar', 'Dedo de la Bruja del Manglar', 'Mangrove Witch\'s Finger', 'varita_hueso_tallado', 3, 'veneno',
    [r('mas_habilidades', 1), r('vel_lanzar', 20), r('mana', 25, 35), r('res_veneno', 20)],
    'Se lo cortaron de la mano y siguió señalando.', 'They cut it from her hand and it kept pointing.'),
  leg('baculo_escarcha_temprana', 'Báculo de la Escarcha Temprana', 'Early Frost Staff', 'baculo_raiz_negra', 3, 'frio',
    [r('mas_habilidades', 1), r('mana', 30, 40), r('vel_lanzar', 20), r('res_frio', 25)],
    'Brotó de una raíz que se heló en pleno verano.', 'It sprouted from a root that froze in midsummer.'),
  leg('arco_dunas_ardientes', 'Arco de las Dunas Ardientes', 'Burning Dunes Bow', 'arco_cuerno', 3, 'fuego',
    [r('des', 8, 12), r('vel_ataque', 20), r('perforar', 15)],
    'Tensado con tendón de camello y secado al sol del mediodía en Sahrim.', 'Strung with camel sinew and dried under the Sahrim noon sun.'),
  leg('mazo_inquisidor_ciego', 'Mazo del Inquisidor Ciego', 'Blind Inquisitor\'s Mace', 'maza_abad', 3, 'fuego',
    [r('golpe_aplastante', 15), r('aturdir', 10), r('res_fuego', 20), r('fue', 8, 12)],
    'Juzgaba sin mirar. Decía que el fuego veía por él.', 'He judged without looking. He said the fire saw for him.'),

  // ---------------- escalón 4 (nivel 33): la selva de Yhuantl y las cumbres de Hrimgard
  leg('mandato_hjaldur', 'Mandato de Hjaldur', 'Hjaldur\'s Decree', 'hacha_norte', 4, 'frio',
    [r('ralentizar', 25), r('fue', 10, 14), r('res_frio', 30), r('golpe_aplastante', 10)],
    'Con ella el Rey de Escarcha firmaba sus sentencias en la carne de los clanes.', 'With it the Frost King signed his sentences in the flesh of the clans.'),
  leg('lanza_alba_hrimgard', 'Lanza del Alba de Hrimgard', 'Hrimgard Dawnspear', 'pica_guardia', 4, 'luz',
    [r('perforar', 25), r('res_sombra', 25), r('precision', 60, 100)],
    'En las cumbres el sol sale tarde. Esta lanza lo esperó por todos.', 'On the peaks the sun rises late. This spear waited for it on everyone\'s behalf.'),
  leg('juramento_calcinado', 'Juramento Calcinado', 'Charred Oath', 'hoja_cruzada_rota', 4, 'fuego',
    [r('fue', 10, 14), r('vida', 35, 50), r('res_fuego', 25)],
    'La cruzada ardió en el Pozo de la Brasa. La hoja salió entera y caliente.', 'The crusade burned in the Ember Well. The blade came out whole and hot.'),
  leg('trueno_murallas', 'Trueno de las Murallas', 'Rampart Thunder', 'ballesta_asedio', 4, 'rayo',
    [r('perforar', 30), r('aturdir', 15), r('des', 10, 14)],
    'Defendió las murallas de Velmora una noche entera. Al alba ya no quedaba muralla.', 'It defended the walls of Velmora a whole night. By dawn there was no wall left.'),
  leg('hoz_madre_cienaga', 'Hoz de la Madre Ciénaga', 'Mother Mire\'s Sickle', 'guadana_sepulturero', 4, 'veneno',
    [r('robo_vida', 5, 7), r('res_veneno', 30), r('vel_ataque', 10)],
    'En Yhuantl dicen que la Madre siega a sus hijos para que nunca crezcan.', 'In Yhuantl they say the Mother reaps her children so they never grow up.'),
  leg('badajo_campanario_mudo', 'Badajo del Campanario Mudo', 'Silent Belfry Clapper', 'alabarda_campanario', 4, 'sombra',
    [r('robo_mana', 4, 5), r('res_sombra', 25), r('aturdir', 10)],
    'La campana dejó de sonar cuando le arrancaron esto. El silencio se quedó.', 'The bell stopped ringing when this was torn from it. The silence stayed.'),
  leg('martillo_forja_roja', 'Martillo de la Forja Roja', 'Red Forge Hammer', 'martillo_forja', 4, 'sangre',
    [r('golpe_aplastante', 25), r('herida_abierta', 20), r('fue', 12, 16)],
    'El herrero templaba el acero en sangre. Decía que el agua no tiene memoria.', 'The smith quenched the steel in blood. He said water has no memory.'),
  leg('cadena_relampagos', 'Cadena de Relámpagos', 'Chained Lightning', 'mangual_cadenas', 4, 'rayo',
    [r('aturdir', 15), r('vel_ataque', 10), r('res_rayo', 25)],
    'Forjada con los eslabones que ataban a un hereje a un pararrayos.', 'Forged from the links that bound a heretic to a lightning rod.'),

  // ---------------- escalón 5 (nivel 42): la Herida y el Ascua
  leg('beso_herida', 'Beso de la Herida', 'Kiss of the Wound', 'colmillo_sombra', 5, 'sombra',
    [r('critico', 10), r('vel_ataque', 30), r('robo_mana', 5)],
    'No corta. Abre. Lo que sale por ahí ya no vuelve a entrar.', 'It does not cut. It opens. What comes out never goes back in.'),
  leg('varita_ultimo_rezo', 'Varita del Último Rezo', 'Last Prayer Wand', 'varita_susurro', 5, 'luz',
    [r('mas_habilidades', 2), r('vel_lanzar', 30), r('mana', 45, 60), r('res_sombra', 25)],
    'Santa Oria rezó una sola vez con ella. El rezo todavía resuena.', 'Saint Oria prayed with it only once. The prayer is still echoing.'),
  leg('baculo_cielo_partido', 'Báculo del Cielo Partido', 'Split Sky Staff', 'baculo_astro_caido', 5, 'rayo',
    [r('mas_habilidades', 2), r('vel_lanzar', 30), r('mana', 50, 70), r('res_rayo', 30)],
    'El Ascua rasgó el cielo al caer. Esta madera guardó el trueno de esa noche.', 'The Ember tore the sky as it fell. This wood kept that night\'s thunder.'),
  leg('ala_varnhul', 'Ala de Varnhul', 'Varnhul\'s Wing', 'arco_cuervo', 5, 'frio',
    [r('perforar', 35), r('des', 15, 20), r('vel_ataque', 20)],
    'Tallado con un hueso del ala del dragón. Todavía quiere volar.', 'Carved from a bone of the dragon\'s wing. It still yearns to fly.'),
  leg('sueno_yhuantl', 'Sueño de Yhuantl', 'Dream of Yhuantl', 'hoz_rey_dormido', 5, 'veneno',
    [r('vel_ataque', 20), r('des', 12, 16), r('res_veneno', 30), r('critico', 6)],
    'Los sacerdotes de la selva la usaban para dormir a los sacrificios. Ninguno despertó.', 'The jungle priests used it to put sacrifices to sleep. None of them woke.'),
  leg('penitencia_final', 'Penitencia Final', 'Final Penance', 'maza_penitencia', 5, 'sangre',
    [r('golpe_aplastante', 25), r('herida_abierta', 30), r('robo_vida', 5, 7), r('fue', 12, 16)],
    'Los penitentes pedían perdón a cada golpe. Ella nunca lo concedió.', 'The penitents begged forgiveness with every blow. It never granted it.'),
  leg('garras_brasa_viva', 'Garras de la Brasa Viva', 'Living Ember Claws', 'garras_dragon_palido', 5, 'fuego',
    [r('mas_clase', 2), r('vel_ataque', 30), r('critico', 8)],
    'El monje metió las manos en el Ascua para entenderla. Las sacó así.', 'The monk thrust his hands into the Ember to understand it. They came out like this.'),
  leg('sed_ozmaren', 'Sed de Ozmaren', 'Ozmaren\'s Thirst', 'hoja_ceniza_negra', 5, 'fuego',
    [r('robo_vida', 6, 9), r('res_fuego', 35), r('vida', 50, 70), r('mas_habilidades', 1)],
    'Ozmaren bebía del Ascua con esta hoja. Ahora te pide de beber a ti.', 'Ozmaren drank from the Ember with this blade. Now it asks you for a drink.'),
];

/** La legendaria temática de cada jefe y su probabilidad (además de su botín de siempre). */
export const LEGENDARIA_JEFE: Record<string, [string, number]> = {
  // jefes de acto
  abadesa: ['azote_abadesa', 0.6],
  rey_sin_sombra: ['cetro_sin_sombra', 0.6],
  madre_cienaga: ['hoz_madre_cienaga', 0.6],
  rey_escarcha: ['mandato_hjaldur', 0.6],
  senor_demonio: ['sed_ozmaren', 0.6],
  // jefes de mazmorra (menos probable)
  arana_reina: ['aguijon_madre_pozo', 0.25],
  verdugo: ['sentencia_cadalso', 0.3],
  gusano_de_arena: ['diente_boca_arena', 0.25],
  bruja: ['dedo_bruja_manglar', 0.25],
  dragon_oseo: ['ala_varnhul', 0.3],
};

// ------------------------------------------------------------------ conjuntos nuevos
export const CONJUNTOS_NUEVOS: Conjunto[] = [
  { id: 'ceniza_peregrino', nombre: ['Ceniza del Peregrino', 'Pilgrim\'s Ash'], nivel: 8, req: 8,
    aspecto: { linea: 'cuero', grado: 4, color: '#5e4a3a' },
    lore: ['Caminaron hasta la abadía para ver caer el Ascua. Volvieron cubiertos de ella.', 'They walked to the abbey to watch the Ember fall. They came back covered in it.'],
    piezas: [
      { id: 'peregrino_gorro', nombre: ['Capucha de Ceniza', 'Ashen Cowl'], base: 'gorro_cuero', stats: [r('def_pct', 40, 60), r('vida', 10, 15)] },
      { id: 'peregrino_jubon', nombre: ['Jubón de Ceniza', 'Ashen Doublet'], base: 'jubon_cuero', stats: [r('def_pct', 50, 70), r('res_fuego', 10, 15)] },
      { id: 'peregrino_guantes', nombre: ['Manos de Ceniza', 'Ashen Hands'], base: 'guantes_cuero', stats: [r('def_pct', 40, 60), r('vel_ataque', 10)] },
      { id: 'peregrino_botas', nombre: ['Pasos de Ceniza', 'Ashen Steps'], base: 'botas_cuero', stats: [r('def_pct', 40, 60), r('vel_mover', 10)] },
      { id: 'peregrino_cinturon', nombre: ['Cordón de Ceniza', 'Ashen Cord'], base: 'cinturon_cuero', stats: [r('def_pct', 40, 60), r('vit', 5)] },
    ],
    bonos: [
      { piezas: 2, stats: [r('vida', 20)] },
      { piezas: 3, stats: [r('res_todo', 8), r('vel_mover', 10)] },
      { piezas: 4, stats: [r('regen_vida', 3), r('hallazgo', 20)] },
      { piezas: 5, stats: [r('mas_habilidades', 1), r('vida', 40), r('valor', 30)] },
    ] },
  { id: 'guardia_brasa', nombre: ['Guardia de la Brasa', 'Ember Guard'], nivel: 18, req: 18,
    aspecto: { linea: 'metal', grado: 4, color: '#8a3a20' },
    lore: ['Juraron custodiar el Pozo de la Brasa. El pozo los custodia a ellos ahora.', 'They swore to guard the Ember Well. Now the well guards them.'],
    piezas: [
      { id: 'brasa_yelmo', nombre: ['Yelmo de la Guardia de Brasa', 'Ember Guard Helm'], base: 'yelmo_cerrado', stats: [r('def_pct', 60, 80), r('res_fuego', 15)] },
      { id: 'brasa_coraza', nombre: ['Coraza de la Guardia de Brasa', 'Ember Guard Cuirass'], base: 'coraza_hierro', stats: [r('def_pct', 70, 90), r('vida', 25, 35)] },
      { id: 'brasa_guanteletes', nombre: ['Guanteletes de la Guardia de Brasa', 'Ember Guard Gauntlets'], base: 'guanteletes_malla', stats: [r('def_pct', 50, 70), r('dano_fuego', 4, 8)] },
      { id: 'brasa_sabatones', nombre: ['Sabatones de la Guardia de Brasa', 'Ember Guard Sabatons'], base: 'sabatones_malla', stats: [r('def_pct', 50, 70), r('vel_mover', 10)] },
      { id: 'brasa_escudo', nombre: ['Escudo de la Guardia de Brasa', 'Ember Guard Shield'], base: 'escudo_cometa', stats: [r('def_pct', 60, 80), r('bloqueo', 10)] },
    ],
    bonos: [
      { piezas: 2, stats: [r('res_fuego', 20)] },
      { piezas: 3, stats: [r('vida', 50), r('espinas', 10)] },
      { piezas: 4, stats: [r('bloqueo', 10), r('reduc_dano', 8)] },
      { piezas: 5, stats: [r('dano_fuego', 15, 25), r('mas_habilidades', 1), r('res_todo', 10)] },
    ] },
  { id: 'velo_sahrim', nombre: ['Velo de Sahrim', 'Veil of Sahrim'], nivel: 28, req: 28,
    aspecto: { linea: 'tunica', grado: 4, color: '#b08a4a' },
    lore: ['Los astrónomos de Sahrim vestían de arena para que el sol no los reconociera.', 'The astronomers of Sahrim dressed in sand so the sun would not know them.'],
    piezas: [
      { id: 'sahrim_turbante', nombre: ['Turbante del Astrónomo', 'Astronomer\'s Turban'], base: 'turbante_desierto', stats: [r('def_pct', 60, 80), r('mana', 25, 35)] },
      { id: 'sahrim_habito', nombre: ['Hábito del Astrónomo', 'Astronomer\'s Habit'], base: 'habito_ceremonial', stats: [r('def_pct', 70, 90), r('ene', 8, 12)] },
      { id: 'sahrim_vendas', nombre: ['Vendas del Astrónomo', 'Astronomer\'s Wraps'], base: 'vendas_pugil', stats: [r('def_pct', 50, 70), r('vel_lanzar', 10)] },
      { id: 'sahrim_sandalias', nombre: ['Sandalias del Astrónomo', 'Astronomer\'s Sandals'], base: 'sandalias_peregrino', stats: [r('def_pct', 50, 70), r('vel_mover', 15)] },
      { id: 'sahrim_faja', nombre: ['Faja del Astrónomo', 'Astronomer\'s Sash'], base: 'faja_tela', stats: [r('def_pct', 50, 70), r('res_fuego', 20)] },
    ],
    bonos: [
      { piezas: 2, stats: [r('mana', 40)] },
      { piezas: 3, stats: [r('vel_lanzar', 20), r('res_fuego', 25)] },
      { piezas: 4, stats: [r('regen_mana', 40), r('res_todo', 10)] },
      { piezas: 5, stats: [r('mas_habilidades', 1), r('dano_fuego', 15, 25), r('vida', 60)] },
    ] },
  { id: 'luto_herida', nombre: ['Luto de la Herida', 'Mourning of the Wound'], nivel: 40, req: 40,
    aspecto: { linea: 'metal', grado: 5, color: '#4a2440' },
    lore: ['Los últimos caballeros de Velmora bajaron a la Herida de luto por sí mismos.', 'The last knights of Velmora went down into the Wound mourning themselves.'],
    piezas: [
      { id: 'luto_yelmo', nombre: ['Yelmo del Luto', 'Mourning Greathelm'], base: 'gran_yelmo_herida', stats: [r('def_pct', 90, 120), r('res_sombra', 20)] },
      { id: 'luto_placas', nombre: ['Placas del Luto', 'Mourning Plate'], base: 'placas_obsidiana', stats: [r('def_pct', 100, 130), r('vida', 50, 70)] },
      { id: 'luto_guanteletes', nombre: ['Guanteletes del Luto', 'Mourning Gauntlets'], base: 'guanteletes_verdugo', stats: [r('def_pct', 80, 100), r('vel_ataque', 15)] },
      { id: 'luto_sabatones', nombre: ['Sabatones del Luto', 'Mourning Sabatons'], base: 'sabatones_obsidiana', stats: [r('def_pct', 80, 100), r('vel_mover', 15)] },
      { id: 'luto_mandoble', nombre: ['Mandoble del Luto', 'Mourning Greatsword'], base: 'mandoble_eclipse', vivo: 'sombra', stats: [r('dano_pct', 150, 190), r('dano_sombra', 25, 40), r('robo_vida', 5)] },
    ],
    bonos: [
      { piezas: 2, stats: [r('res_sombra', 25)] },
      { piezas: 3, stats: [r('robo_vida', 5), r('vida', 60)] },
      { piezas: 4, stats: [r('reduc_dano', 10), r('dano_sombra', 20)] },
      { piezas: 5, stats: [r('mas_habilidades', 2), r('dano_pct', 60), r('res_todo', 15)] },
    ] },
  // El set de la familia GG del motor, portado: un objeto por cada miembro y el collar de Thor.
  { id: 'legado_gg', nombre: ['Legado GG', 'GG Legacy'], nivel: 25, req: 25,
    aspecto: { linea: 'metal', grado: 5, color: '#1e3a7a' },
    lore: ['Cuatro estrellas y un perro. Una casa.', 'Four stars and a dog. One house.'],
    piezas: [
      { id: 'juramento_de_rick', nombre: ['Juramento de Rick', 'Rick\'s Oath'], base: 'espada_penitente', vivo: 'luz', stats: [r('dano_pct', 120, 140), r('vida', 60), r('res_todo', 10)] },
      { id: 'escudo_de_la_casa_gg', nombre: ['Escudo de la Casa GG', 'House GG Shield'], base: 'escudo_templo', color: '#1e3a7a', stats: [r('def_pct', 80, 100), r('bloqueo', 12), r('res_todo', 15)] },
      { id: 'baculo_de_steph', nombre: ['Báculo Estelar de Steph', 'Steph\'s Starstaff'], base: 'baculo_raiz_negra', vivo: 'luz', stats: [r('mas_habilidades', 2), r('regen_vida', 6), r('mana', 80)] },
      { id: 'arco_de_sophie', nombre: ['Arco Celeste de Sophie', 'Sophie\'s Skybow'], base: 'arco_cuerno', vivo: 'frio', stats: [r('dano_pct', 120, 140), r('des', 25), r('vel_ataque', 20), r('critico', 6)] },
      { id: 'varita_de_alana', nombre: ['Varita en Flor de Alana', 'Alana\'s Bloomwand'], base: 'varita_hueso_tallado', vivo: 'veneno', stats: [r('mas_habilidades', 1), r('regen_vida', 8), r('invocados_pct', 25)] },
      { id: 'collar_de_thor', nombre: ['Collar de Thor', 'Thor\'s Collar'], base: 'amuleto', stats: [r('invocados_pct', 50), r('vel_mover', 10), r('vida', 40)] },
    ],
    bonos: [
      { piezas: 2, stats: [r('res_todo', 15)] },
      { piezas: 3, stats: [r('vida', 120), r('mas_habilidades', 1), r('hallazgo', 30)] },
    ] },
];

// se suman a las listas del botín al cargar
UNICOS.push(...LEGENDARIAS);
CONJUNTOS.push(...CONJUNTOS_NUEVOS);
