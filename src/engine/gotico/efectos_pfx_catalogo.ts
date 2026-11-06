/**
 * Catálogo de los efectos de pixelfx mudados al taller gótico: qué efecto, con qué paleta, cómo se orienta y para qué
 * sirve en Réquiem de Ceniza. El adaptador está en efectos_pfx.ts.
 *
 * Los usos nombran las habilidades del juego (juego/src/datos/clases.ts), los estados, las zonas por acto
 * (juego/src/mundo/actos.ts y actos67.ts), el botín, las muertes y las cinemáticas.
 */
import type { CfgPfx } from './efectos_pfx';
import { rampa, tramo } from './efectos_pfx_paletas';

/** Chispas de forja: brasa clara que se apaga en rojo (para golpes de acero). */
const CHISPAS = () => tramo('fuego', 4, 1, 0.45);
/** Piedra del piso y de los escombros (pixelfx la tenía violeta). */
const PIEDRA = '#3a3431';
/** Chispas de rayo: blanco violáceo que se apaga en azul. */
const CHISPAS_RAYO = () => tramo('rayo', 4, 1, 0.5);

export const CATALOGO_PFX: CfgPfx[] = [
  // ============================================================ fuego
  {
    id: 'fx_bola_fuego', origen: 'fire/fireball', nombre: ['Bola de fuego', 'Fireball'], categoria: 'fuego', elemento: 'fuego',
    dir: { modo: 'vuelo' }, ancla: [0, 21], opciones: { palette: rampa('fuego', 9) },
    uso: [
      { tipo: 'poder', clase: 'arcanista', habilidades: ['bola_fuego', 'saeta_ignea'], nota: 'el proyectil en vuelo; al pegar, fx_explosion_chica' },
      { tipo: 'poder', clase: 'alquimista', habilidades: ['virote_dragon'] },
      { tipo: 'monstruo', monstruos: ['brujo_diablillo', 'cultista'], nota: 'bola de fuego de los lanzadores' },
    ],
  },
  {
    id: 'fx_aliento_fuego', origen: 'fire/fire-breath', nombre: ['Aliento de fuego', 'Fire breath'], categoria: 'fuego', elemento: 'fuego',
    dir: { modo: 'vuelo' }, ancla: [-6, 30], detrasEn: ['no', 'n', 'ne'], opciones: { palette: rampa('fuego', 9) },
    uso: [
      { tipo: 'monstruo', monstruos: ['diablillo', 'satiro'], nota: 'chorro de fuego de las bestias y demonios del acto 5 (de la boca hacia adelante)' },
      { tipo: 'poder', clase: 'monje', habilidades: ['palma_dragon'], nota: 'la llamarada que sale de la palma' },
      { tipo: 'poder', clase: 'alquimista', habilidades: ['destilar'], nota: 'soplete del alambique' },
    ],
  },
  {
    id: 'fx_anillo_fuego', origen: 'fire/fire-ring', nombre: ['Anillo de fuego', 'Ring of fire'], categoria: 'fuego', elemento: 'fuego', capa: 'piso', enLanzador: true,
    opciones: { palette: rampa('fuego', 9) },
    uso: [
      { tipo: 'poder', clase: 'arcanista', habilidades: ['combustion'], nota: 'el fuego corre por el piso en un anillo alrededor de la arcanista' },
      { tipo: 'poder', clase: 'monje', habilidades: ['rodilla_volcan'] },
      { tipo: 'monstruo', monstruos: ['abadesa'], nota: 'el pisotón de fuego de la Abadesa en El Pozo de la Brasa' },
    ],
  },
  {
    id: 'fx_tornado_fuego', origen: 'fire/fire-tornado', nombre: ['Tornado de fuego', 'Fire tornado'], categoria: 'fuego', elemento: 'fuego',
    opciones: { palette: rampa('fuego', 9) },
    uso: [
      { tipo: 'poder', clase: 'druida', habilidades: ['ira_estacion'], nota: 'remolinos de fuego que avanzan por el área' },
      { tipo: 'monstruo', monstruos: ['senor_demonio'], nota: 'columnas de fuego que vagan por La Fragua de Ozmaren (acto 5)' },
      { tipo: 'ambiente', zonas: ['a5_llanuras', 'a5_rio'], nota: 'remolino de brasas suelto en las Llanuras de Ceniza' },
    ],
  },
  {
    id: 'fx_pilar_llamas', origen: 'fire/flame-pillar', nombre: ['Pilar de llamas', 'Flame pillar'], categoria: 'fuego', elemento: 'fuego',
    opciones: { palette: rampa('fuego', 9), stone: PIEDRA }, maxSeg: 3.6,
    uso: [
      { tipo: 'poder', clase: 'druida', habilidades: ['fisura'], nota: 'erupción de fuego donde se abre la tierra' },
      { tipo: 'poder', clase: 'arcanista', habilidades: ['muro_fuego'], nota: 'varios en fila hacen el muro' },
      { tipo: 'poder', clase: 'cazadora', habilidades: ['mina_brasa'], nota: 'al pisar la mina' },
    ],
  },
  {
    id: 'fx_meteoro', origen: 'fire/meteor', nombre: ['Meteoro', 'Meteor'], categoria: 'fuego', elemento: 'fuego',
    // cae 0.64 s y pega: la ventana rápida es el golpe
    opciones: { palette: rampa('fuego', 9), rock: tramo('piedra', 4, 0.05, 0.7), stone: PIEDRA }, maxSeg: 3.8, rapido25: [0.56, 1.08],
    uso: [
      { tipo: 'poder', clase: 'arcanista', habilidades: ['meteoro'], nota: 'cae en diagonal y se clava en el ancla' },
      { tipo: 'poder', clase: 'cazadora', habilidades: ['flecha_cometa'] },
      { tipo: 'cinematica', nota: 'lluvia de fuego del cielo roto (acto 7)' },
    ],
  },
  {
    id: 'fx_llama_fatua', origen: 'fire/spirit-flame', nombre: ['Llama fatua', 'Will-o-flame'], categoria: 'fuego', elemento: 'fatuo',
    opciones: { palette: rampa('fatuo', 9) },
    uso: [
      { tipo: 'ambiente', zonas: ['a1_cementerio', 'a1_cripta', 'a1_cata1', 'a6_criptas'], nota: 'fuego de ánima sobre las tumbas y los osarios' },
      { tipo: 'poder', clase: 'nigromante', habilidades: ['legion_ceniza'], nota: 'la llama en las cuencas de los invocados' },
      { tipo: 'monstruo', monstruos: ['aparecida'], nota: 'fuego frío que deja la Aparecida' },
    ],
  },
  // ============================================================ explosiones
  {
    id: 'fx_explosion_barril', origen: 'explosions/barrel-explosion', nombre: ['Barril que estalla', 'Exploding barrel'], categoria: 'explosiones', elemento: 'fuego',
    // el barril tiembla 0.8 s antes de reventar: la ventana rápida es el reventón
    opciones: { palette: rampa('fuego', 8), barrel: tramo('madera', 6, 0.05, 1) }, maxSeg: 3.6, cola: 0.02, rapido25: [0.72, 1.24],
    uso: [
      { tipo: 'ambiente', zonas: ['a1_mina1', 'a1_mina2', 'a4_minas1', 'a6_barco'], nota: 'barriles de pólvora que estallan al romperlos' },
      { tipo: 'poder', clase: 'alquimista', habilidades: ['gran_crisol'], nota: 'el crisol que revienta' },
    ],
  },
  {
    id: 'fx_gran_explosion', origen: 'explosions/big-explosion', nombre: ['Gran explosión', 'Great explosion'], categoria: 'explosiones', elemento: 'fuego',
    opciones: { palette: rampa('fuego', 8), stone: PIEDRA }, maxSeg: 4, cola: 0.02, rapido25: [0, 0.5],
    uso: [
      { tipo: 'poder', clase: 'arcanista', habilidades: ['sol_negro'], nota: 'el estallido final' },
      { tipo: 'muerte', nota: 'muerte de un jefe de fuego (la Abadesa, Ozmaren)' },
      { tipo: 'cinematica', nota: 'la fragua que revienta en el cierre del acto 5' },
    ],
  },
  {
    id: 'fx_explosion_tierra', origen: 'explosions/dirt-explosion', nombre: ['Reventón de tierra', 'Dirt blast'], categoria: 'explosiones', elemento: 'tierra',
    opciones: { palette: rampa('tierra', 7), fire: rampa('fuego', 8) }, maxSeg: 3, cola: 0.02, rapido25: [0, 0.5],
    uso: [
      { tipo: 'poder', clase: 'cazadora', habilidades: ['cepo_dientes'], nota: 'la trampa que salta' },
      { tipo: 'poder', clase: 'berserker', habilidades: ['salto_lobo'], nota: 'la caída' },
      { tipo: 'monstruo', monstruos: ['gusano_de_arena', 'ogro'], nota: 'algo que sale de la tierra o un golpe de garrote al piso' },
    ],
  },
  {
    id: 'fx_implosion', origen: 'explosions/implosion', nombre: ['Implosión', 'Implosion'], categoria: 'explosiones', elemento: 'sombra',
    opciones: { palette: rampa('sombra', 7) },
    uso: [
      { tipo: 'poder', clase: 'nigromante', habilidades: ['explosion_cadaver'], nota: 'el cadáver que se hunde en sí mismo antes de reventar' },
      { tipo: 'muerte', nota: 'muerte de un espectro o de un ser del abismo (acto 5)' },
    ],
  },
  {
    id: 'fx_explosion_chica', origen: 'explosions/small-explosion', nombre: ['Explosión', 'Explosion'], categoria: 'explosiones', elemento: 'fuego',
    opciones: { palette: rampa('fuego', 8), stone: PIEDRA }, maxSeg: 3.2, cola: 0.02, rapido25: [0, 0.5],
    uso: [
      { tipo: 'poder', clase: 'arcanista', habilidades: ['bola_fuego'], nota: 'al pegar la bola de fuego' },
      { tipo: 'poder', clase: 'alquimista', habilidades: ['bomba_ignea', 'virote_explosivo', 'bomba_cluster'] },
      { tipo: 'poder', clase: 'nigromante', habilidades: ['explosion_cadaver'] },
    ],
  },
  {
    id: 'fx_bomba_humo', origen: 'explosions/smoke-bomb', nombre: ['Bomba de humo', 'Smoke bomb'], categoria: 'explosiones', elemento: 'humo',
    opciones: { palette: tramo('ceniza', 7, 0.05, 1), canister: tramo('piedra', 5, 0.1, 0.9), sparks: CHISPAS() }, maxSeg: 4.2, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'alquimista', habilidades: ['bomba_humo'], nota: 'la nube que ciega' },
      { tipo: 'monstruo', monstruos: ['bandido'], nota: 'el bandido que huye' },
    ],
  },
  // ============================================================ agua
  {
    id: 'fx_burbujas', origen: 'water/bubbles', nombre: ['Burbujeo', 'Bubbling'], categoria: 'agua', elemento: 'agua', capa: 'piso',
    opciones: { palette: rampa('agua', 8) },
    notas: 'Reescrito: el original era una columna de burbujas vista bajo el agua; acá son burbujas que asoman y revientan en la superficie, vistas desde arriba.',
    uso: [
      { tipo: 'ambiente', zonas: ['a3_pantano', 'a3_inundadas', 'a6_criptas', 'a6_criptas2'], nota: 'algo respira bajo el agua estancada' },
      { tipo: 'poder', clase: 'alquimista', habilidades: ['elixir', 'panacea_negra'], nota: 'el caldero o el frasco que hierve' },
      { tipo: 'monstruo', monstruos: ['ahogado', 'madre_cienaga'], nota: 'marca dónde va a salir el que está sumergido' },
    ],
  },
  {
    id: 'fx_gotera', origen: 'water/drip', nombre: ['Gotera', 'Drip'], categoria: 'agua', elemento: 'agua',
    opciones: { palette: rampa('agua', 8), source: false },
    uso: [{ tipo: 'ambiente', zonas: ['a1_cata1', 'a1_cripta', 'a3_inundadas', 'a6_faro', 'a6_criptas'], nota: 'gota que cae del techo en un charco (el ancla es el charco)' }],
  },
  {
    id: 'fx_fuente', origen: 'water/fountain', nombre: ['Fuente', 'Fountain'], categoria: 'agua', elemento: 'agua',
    opciones: { palette: rampa('agua', 8) },
    uso: [
      { tipo: 'ambiente', zonas: ['a2_oasis', 'a6_barrio2', 'a7_jardin'], nota: 'el chorro de agua sobre una pila del catálogo (fuente del pueblo, la plaza de las ánimas)' },
    ],
  },
  {
    id: 'fx_geiser', origen: 'water/geyser', nombre: ['Géiser', 'Geyser'], categoria: 'agua', elemento: 'agua',
    opciones: { palette: rampa('agua', 8) }, maxSeg: 4, cola: 0.02,
    uso: [
      { tipo: 'ambiente', zonas: ['a4_grieta', 'a3_pantano'], nota: 'surtidor que estalla cada tanto (trampa de vapor)' },
      { tipo: 'monstruo', monstruos: ['madre_cienaga'], nota: 'columna de agua al emerger' },
    ],
  },
  {
    id: 'fx_salpicon_lluvia', origen: 'water/rain-splash', nombre: ['Charco bajo la lluvia', 'Rain puddle'], categoria: 'agua', elemento: 'agua', capa: 'piso',
    opciones: { palette: rampa('agua', 8) },
    uso: [{ tipo: 'clima', actos: [1, 3, 6], zonas: ['a1_refugio', 'a3_muelle', 'a6_barco'], nota: 'charcos con gotas: sembrarlos en el piso mientras llueve' }],
  },
  {
    id: 'fx_ondas', origen: 'water/ripples', nombre: ['Ondas', 'Ripples'], categoria: 'agua', elemento: 'agua', capa: 'piso',
    opciones: { palette: rampa('agua', 8) },
    uso: [
      { tipo: 'ambiente', zonas: ['a1_paramo', 'a3_pantano', 'a6_costa'], nota: 'agua quieta que tiembla (arroyos, ciénaga, pozas)' },
      { tipo: 'golpe', nota: 'pasos del héroe sobre agua baja' },
    ],
  },
  {
    id: 'fx_salpicadura', origen: 'water/splash', nombre: ['Salpicadura', 'Splash'], categoria: 'agua', elemento: 'agua',
    opciones: { palette: rampa('agua', 8) },
    uso: [
      { tipo: 'golpe', nota: 'algo cae al agua: un cuerpo, una roca, el héroe que salta' },
      { tipo: 'muerte', nota: 'muerte de un ahogado que se deshace en agua' },
    ],
  },
  {
    id: 'fx_chorro_agua', origen: 'water/water-jet', nombre: ['Chorro de agua', 'Water jet'], categoria: 'agua', elemento: 'agua',
    dir: { modo: 'vuelo' }, ancla: [-6, 24], detrasEn: ['no', 'n', 'ne'], opciones: { palette: rampa('agua', 8) }, gradacion: { brillo: 0.8, tope: 0.8 },
    uso: [
      { tipo: 'monstruo', monstruos: ['ahogado', 'campana_ahoga'], nota: 'vómito de agua negra de los ahogados (acto 6)' },
      { tipo: 'ambiente', zonas: ['a6_faro', 'a6_criptas'], nota: 'caño roto que escupe agua' },
    ],
  },
  {
    id: 'fx_orbe_agua', origen: 'water/water-orb', nombre: ['Orbe de agua', 'Water orb'], categoria: 'agua', elemento: 'agua',
    opciones: { palette: rampa('agua', 8) },
    uso: [
      { tipo: 'monstruo', monstruos: ['madre_cienaga', 'hechicera_sangre'], nota: 'esfera de agua que flota antes del ataque' },
      { tipo: 'botin', nota: 'reliquia del agua (aura del objeto en el piso)' },
    ],
  },
  {
    id: 'fx_cascada', origen: 'water/waterfall', nombre: ['Cascada', 'Waterfall'], categoria: 'agua', elemento: 'agua',
    opciones: { palette: rampa('agua', 8), ledge: false },
    uso: [{ tipo: 'ambiente', zonas: ['a3_selva', 'a3_inundadas', 'a4_glaciar', 'a6_criptas'], nota: 'agua que cae de una cornisa o de un caño de piedra' }],
  },
  {
    id: 'fx_ola', origen: 'water/wave-crash', nombre: ['Ola que rompe', 'Crashing wave'], categoria: 'agua', elemento: 'agua',
    opciones: { palette: rampa('agua', 8) }, cola: 0.02,
    notas: 'Ola que rompe sobre el piso isométrico: corre hacia la derecha de la pantalla (dirección e) sobre una lámina de agua 2:1 y su cresta va hacia la cámara; rompe en diagonal (wave-crash.js de la Forja).',
    uso: [
      { tipo: 'cinematica', nota: 'el mar que golpea el barco varado o la costa de los naufragios (acto 6)' },
      { tipo: 'ambiente', zonas: ['a6_arrecife'], nota: 'la resaca que rompe contra la orilla' },
    ],
  },
  {
    id: 'fx_remolino', origen: 'water/whirlpool', nombre: ['Remolino', 'Whirlpool'], categoria: 'agua', elemento: 'agua', capa: 'piso',
    opciones: { palette: rampa('agua', 8) },
    uso: [
      { tipo: 'ambiente', zonas: ['a6_arrecife', 'a6_criptas2'], nota: 'el agua que se traga todo' },
      { tipo: 'monstruo', monstruos: ['campana_ahoga'], nota: 'remolino bajo la Campana Ahogada' },
    ],
  },
  // ============================================================ hielo
  {
    id: 'fx_nova_escarcha', origen: 'ice/frost-nova', nombre: ['Nova de escarcha', 'Frost nova'], categoria: 'hielo', elemento: 'hielo', capa: 'piso', enLanzador: true,
    // se carga 0.48 s y estalla: la ventana rápida es el estallido
    opciones: { palette: rampa('hielo', 8) }, rapido25: [0.4, 0.92],
    uso: [
      { tipo: 'poder', clase: 'arcanista', habilidades: ['nova_escarcha', 'edad_hielo'], nota: 'centrada en la arcanista; el anillo de cristales llega a ~2 personas de radio' },
      { tipo: 'poder', clase: 'berserker', habilidades: ['canto_invierno'] },
      { tipo: 'monstruo', monstruos: ['gigante_helado', 'espectro'], nota: 'pisotón o grito helado del acto 4' },
    ],
  },  {
    id: 'fx_vortice_ventisca', origen: 'ice/blizzard-vortex', nombre: ['Vórtice de ventisca', 'Blizzard vortex'], categoria: 'hielo', elemento: 'hielo',
    opciones: { palette: rampa('hielo', 8) },
    uso: [
      { tipo: 'poder', clase: 'arcanista', habilidades: ['ventisca'], nota: 'varios remolinos repartidos por el área' },
      { tipo: 'poder', clase: 'druida', habilidades: ['huracan'] },
      { tipo: 'poder', clase: 'monje', habilidades: ['ciclon', 'ojo_tifon'] },
    ],
  },
  {
    id: 'fx_congelar', origen: 'ice/freeze', nombre: ['Congelar', 'Freeze'], categoria: 'hielo', elemento: 'hielo',
    opciones: { palette: rampa('hielo', 8) }, cuerpo: { quitar: 'silueta', rampa: 'hielo', tinte: { color: '#86b8dc', fuerza: 0.55, nota: 'el sprite queda azul hielo y quieto mientras dura' } },
    uso: [
      { tipo: 'poder', clase: 'arcanista', habilidades: ['sepulcro_hielo'], nota: 'sobre el que queda encerrado en hielo' },
      { tipo: 'poder', clase: 'alquimista', habilidades: ['frasco_helado'] },
      { tipo: 'estado', estado: 'congelado', nota: 'el momento en que se congela (después, fx_congelado en bucle)' },
    ],
  },
  {
    id: 'fx_aliento_escarcha', origen: 'ice/frost-breath', nombre: ['Aliento de escarcha', 'Frost breath'], categoria: 'hielo', elemento: 'hielo',
    dir: { modo: 'vuelo' }, ancla: [-6, 30], detrasEn: ['no', 'n', 'ne'], opciones: { palette: rampa('hielo', 8) },
    uso: [
      { tipo: 'poder', clase: 'druida', habilidades: ['rafaga_artica'] },
      { tipo: 'poder', clase: 'monje', habilidades: ['puno_vendaval'] },
      { tipo: 'monstruo', monstruos: ['gigante_helado', 'rey_escarcha', 'dragon_oseo'], nota: 'aliento helado del acto 4' },
    ],
  },
  {
    id: 'fx_cristal_hielo', origen: 'ice/ice-crystal', nombre: ['Cristal de hielo', 'Ice crystal'], categoria: 'hielo', elemento: 'hielo',
    ancla: [0, 0], opciones: { palette: rampa('hielo', 8) },
    uso: [
      { tipo: 'botin', nota: 'gema de escarcha o fragmento de reliquia flotando en el piso' },
      { tipo: 'ambiente', zonas: ['a4_hielo1', 'a4_hielo2', 'a4_grieta'], nota: 'cristal que flota en las cuevas del aliento helado' },
    ],
  },
  {
    id: 'fx_lanza_hielo', origen: 'ice/ice-lance', nombre: ['Lanza de hielo', 'Ice lance'], categoria: 'hielo', elemento: 'hielo',
    dir: { modo: 'vuelo' }, ancla: [0, 21], opciones: { palette: rampa('hielo', 8) },
    uso: [
      { tipo: 'poder', clase: 'arcanista', habilidades: ['carambano', 'esquirla'], nota: 'en vuelo; al pegar, fx_estallido_hielo' },
      { tipo: 'poder', clase: 'cazadora', habilidades: ['flecha_helada'] },
      { tipo: 'poder', clase: 'alquimista', habilidades: ['virote_escarcha'] },
    ],
  },
  {
    id: 'fx_estallido_hielo', origen: 'ice/ice-shatter', nombre: ['Hielo que estalla', 'Ice shatter'], categoria: 'hielo', elemento: 'hielo',
    opciones: { palette: rampa('hielo', 8) }, cola: 0.02,
    notas: 'Un bloque de hielo que revienta y tira sus astillas hacia la derecha; espejarlo para la izquierda.',
    uso: [
      { tipo: 'golpe', nota: 'impacto de los proyectiles de hielo (fx_lanza_hielo, carámbano, virote de escarcha)' },
      { tipo: 'muerte', nota: 'un enemigo congelado que se rompe' },
    ],
  },
  {
    id: 'fx_puas_hielo', origen: 'ice/ice-spikes', nombre: ['Púas de hielo', 'Ice spikes'], categoria: 'hielo', elemento: 'hielo',
    dir: { modo: 'suelo' }, opciones: { palette: rampa('hielo', 8) }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'monje', habilidades: ['ola_escarcha'], nota: 'la línea de púas avanza por el piso desde los pies' },
      { tipo: 'poder', clase: 'druida', habilidades: ['granizada'] },
      { tipo: 'monstruo', monstruos: ['rey_escarcha', 'escarchado'] },
    ],
  },
  {
    id: 'fx_caida_carambano', origen: 'ice/icicle-fall', nombre: ['Carámbano que cae', 'Falling icicle'], categoria: 'hielo', elemento: 'hielo',
    opciones: { palette: rampa('hielo', 8) }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'druida', habilidades: ['granizada'], nota: 'varios a la vez en el área' },
      { tipo: 'ambiente', zonas: ['a4_hielo1', 'a4_grieta', 'a4_glaciar'], nota: 'trampa del techo de hielo' },
    ],
  },
  {
    id: 'fx_estallido_copos', origen: 'ice/snowflake-burst', nombre: ['Estallido de escarcha', 'Snowflake burst'], categoria: 'hielo', elemento: 'hielo',
    opciones: { palette: rampa('hielo', 8) }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'arcanista', habilidades: ['orbe_glacial', 'armadura_escarcha'], nota: 'el orbe que revienta; el brillo al ponerse la armadura' },
      { tipo: 'golpe', nota: 'golpe con arma de hielo (encanto hielo)' },
    ],
  },
  // ============================================================ rayo
  {
    id: 'fx_bola_rayo', origen: 'lightning/ball-lightning', nombre: ['Rayo globular', 'Ball lightning'], categoria: 'rayo', elemento: 'rayo',
    opciones: { palette: rampa('rayo', 8), sparks: CHISPAS_RAYO() },
    uso: [
      { tipo: 'poder', clase: 'arcanista', habilidades: ['chispa', 'descarga_prismatica'], nota: 'la esfera que avanza chisporroteando' },
      { tipo: 'poder', clase: 'alquimista', habilidades: ['frasco_rayo'] },
      { tipo: 'ambiente', zonas: ['a7_cielo', 'a7_boveda'], nota: 'fuego de San Telmo suelto en el Cielo Roto' },
    ],
  },
  {
    id: 'fx_rayo_cadena', origen: 'lightning/chain-lightning', nombre: ['Rayo en cadena', 'Chain lightning'], categoria: 'rayo', elemento: 'rayo', enLanzador: true,
    dir: { modo: 'vuelo', pivote: [0, -24] }, opciones: { palette: rampa('rayo', 8), sparks: CHISPAS_RAYO() }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'arcanista', habilidades: ['rayo_cadena', 'arco_voltaico'], nota: 'salta de la mano a los blancos que tiene delante' },
      { tipo: 'poder', clase: 'druida', habilidades: ['relampago_canada'] },
      { tipo: 'poder', clase: 'cazadora', habilidades: ['furia_tormenta'] },
    ],
  },
  {
    id: 'fx_carga_rayo', origen: 'lightning/charge-up', nombre: ['Carga de rayo', 'Lightning charge'], categoria: 'rayo', elemento: 'rayo', enLanzador: true,
    opciones: { palette: rampa('rayo', 8), sparks: CHISPAS_RAYO() }, cuerpo: { quitar: 'silueta' }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'arcanista', habilidades: ['tempestad', 'paso_tormenta'], nota: 'la carga sobre la arcanista antes de soltar' },
      { tipo: 'poder', clase: 'monje', habilidades: ['puno_dios'], nota: 'la carga antes del golpe' },
    ],
  },
  {
    id: 'fx_electrocutado', origen: 'lightning/electrified', nombre: ['Electrocutado', 'Electrified'], categoria: 'rayo', elemento: 'rayo',
    opciones: { palette: rampa('rayo', 8), sparks: CHISPAS_RAYO() }, cuerpo: { quitar: 'silueta', tinte: { color: '#a8b2f0', fuerza: 0.4, nota: 'parpadeo blanco azulado del sprite' } },
    uso: [
      { tipo: 'estado', estado: 'electrocutado', nota: 'en bucle sobre el afectado (aturdido por rayo)' },
      { tipo: 'poder', clase: 'cazadora', habilidades: ['trampa_chispas', 'jabalina_rayo'], nota: 'sobre los que alcanza' },
    ],
  },
  {
    id: 'fx_relampago', origen: 'lightning/lightning-strike', nombre: ['Relámpago', 'Lightning strike'], categoria: 'rayo', elemento: 'rayo',
    opciones: { palette: rampa('rayo', 8), sparks: CHISPAS_RAYO() }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'druida', habilidades: ['trueno_valle'], nota: 'cae del cielo sobre el ancla' },
      { tipo: 'poder', clase: 'arcanista', habilidades: ['furia_firmamento'] },
      { tipo: 'cinematica', nota: 'el rayo que ilumina la abadía en la entrada del acto 1' },
    ],
  },
  {
    id: 'fx_arco_chispas', origen: 'lightning/spark-arc', nombre: ['Arco de chispas', 'Spark arc'], categoria: 'rayo', elemento: 'rayo',
    opciones: { palette: rampa('rayo', 8), sparks: CHISPAS_RAYO() },
    uso: [
      { tipo: 'ambiente', zonas: ['a5_fragua', 'a7_boveda'], nota: 'arco entre dos electrodos de una máquina o dos pararrayos (va entre dos postes del catálogo)' },
      { tipo: 'poder', clase: 'cazadora', habilidades: ['trampa_chispas'], nota: 'la trampa armada' },
    ],
  },
  {
    id: 'fx_nube_tormenta', origen: 'lightning/storm-cloud', nombre: ['Nube de tormenta', 'Storm cloud'], categoria: 'rayo', elemento: 'rayo',
    opciones: { palette: rampa('rayo', 8), sparks: CHISPAS_RAYO(), cloud: rampa('noche', 7), rain: tramo('agua', 4, 0.3, 0.9) },
    uso: [
      { tipo: 'poder', clase: 'druida', habilidades: ['huracan', 'trueno_valle'], nota: 'la nube que sigue al druida y descarga' },
      { tipo: 'poder', clase: 'arcanista', habilidades: ['tempestad'] },
    ],
  },
  {
    id: 'fx_trueno', origen: 'lightning/thunderclap', nombre: ['Trueno', 'Thunderclap'], categoria: 'rayo', elemento: 'rayo', capa: 'piso', enLanzador: true,
    opciones: { palette: rampa('rayo', 8), sparks: CHISPAS_RAYO() }, cuerpo: { quitar: 'silueta' }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'arcanista', habilidades: ['latido_galvanico'], nota: 'nova de rayo alrededor de la arcanista' },
      { tipo: 'poder', clase: 'monje', habilidades: ['puno_eco'] },
    ],
  },
  {
    id: 'fx_descarga', origen: 'lightning/zap-hit', nombre: ['Descarga', 'Zap'], categoria: 'rayo', elemento: 'rayo',
    dir: { modo: 'vuelo' }, opciones: { palette: rampa('rayo', 8) }, cola: 0.02,
    uso: [
      { tipo: 'golpe', nota: 'impacto de rayo sobre un enemigo (al pegar fx_rayo_cadena, chispa, virote de tormenta)' },
      { tipo: 'poder', clase: 'monje', habilidades: ['puno_rayo'] },
      { tipo: 'poder', clase: 'alquimista', habilidades: ['virote_tormenta'] },
    ],
  },

  // ============================================================ cuerpo a cuerpo
  {
    id: 'fx_tajo_espada', origen: 'melee/sword-slash', nombre: ['Tajo de espada', 'Sword slash'], categoria: 'cuerpo_a_cuerpo', elemento: 'acero',
    dir: { modo: 'vuelo', pivote: [0, -22], giro: 1 }, detrasEn: ['no', 'n', 'ne'],
    opciones: { palette: rampa('acero', 7), sparks: CHISPAS() },
    uso: [
      { tipo: 'poder', clase: 'templario', habilidades: ['celo', 'corte_sello'], nota: 'el arco del tajo delante del templario, en la dirección del golpe' },
      { tipo: 'poder', clase: 'berserker', habilidades: ['tajo_salvaje', 'doble_golpe'] },
      { tipo: 'monstruo', monstruos: ['esqueleto', 'caballero_muerto', 'bandido'], nota: 'tajo de los espadachines' },
    ],
  },  {
    id: 'fx_zarpazo', origen: 'melee/claw-swipe', nombre: ['Zarpazo', 'Claw swipe'], categoria: 'cuerpo_a_cuerpo', elemento: 'sangre',
    dir: { modo: 'vuelo', pivote: [0, -22] }, detrasEn: ['no', 'n', 'ne'], opciones: { palette: rampa('sangre', 8), sparks: tramo('sangre', 4, 1, 0.4) },
    uso: [
      { tipo: 'poder', clase: 'druida', habilidades: ['zarpazo_oso', 'mordida_rabiosa', 'frenesi_luna'] },
      { tipo: 'monstruo', monstruos: ['necrofago', 'lobo_sombrio', 'desollado', 'demonio_alado'], nota: 'garras de bestias y necrófagos' },
    ],
  },
  {
    id: 'fx_rafaga_dagas', origen: 'melee/dagger-flurry', nombre: ['Ráfaga de dagas', 'Dagger flurry'], categoria: 'cuerpo_a_cuerpo', elemento: 'acero',
    dir: { modo: 'vuelo', pivote: [0, -22] }, detrasEn: ['no', 'n', 'ne'], opciones: { palette: rampa('acero', 7), sparks: CHISPAS() },
    uso: [
      { tipo: 'poder', clase: 'monje', habilidades: ['rafaga_golpes', 'mil_palmas'], nota: 'los golpes seguidos' },
      { tipo: 'monstruo', monstruos: ['cultista', 'saqueador', 'cazacabezas'], nota: 'puñaladas rápidas' },
    ],
  },
  {
    id: 'fx_tajo_doble', origen: 'melee/double-slash', nombre: ['Tajo doble', 'Double slash'], categoria: 'cuerpo_a_cuerpo', elemento: 'sangre',
    dir: { modo: 'vuelo', pivote: [0, -22] }, detrasEn: ['no', 'n', 'ne'], opciones: { palette: rampa('sangre', 7), sparks: CHISPAS() },
    uso: [
      { tipo: 'poder', clase: 'berserker', habilidades: ['doble_golpe', 'desgarro'] },
      { tipo: 'monstruo', monstruos: ['verdugo', 'caballero_espectral'] },
    ],
  },
  {
    id: 'fx_martillazo', origen: 'melee/hammer-smash', nombre: ['Martillazo', 'Hammer smash'], categoria: 'cuerpo_a_cuerpo', elemento: 'piedra',
    dir: { modo: 'punto' }, detrasEn: ['no', 'n', 'ne'], opciones: { palette: tramo('sagrado', 8, 0.1, 0.9), stone: PIEDRA }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'templario', habilidades: ['juicio', 'martillo_bendito'], nota: 'el golpe al piso delante del templario' },
      { tipo: 'monstruo', monstruos: ['ogro', 'gigante_helado', 'golem_de_piedra', 'trol_pantano'], nota: 'mazazo al piso' },
    ],
  },
  {
    id: 'fx_hachazo', origen: 'melee/heavy-cleave', nombre: ['Hachazo', 'Heavy cleave'], categoria: 'cuerpo_a_cuerpo', elemento: 'brasa',
    dir: { modo: 'punto' }, detrasEn: ['no', 'n', 'ne'], opciones: { palette: rampa('brasa', 8), stone: PIEDRA }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'berserker', habilidades: ['hachazo_ancho', 'ejecucion', 'tajo_salvaje'], nota: 'hachazo que muerde el piso' },
      { tipo: 'monstruo', monstruos: ['verdugo', 'caballero_abismo'] },
    ],
  },
  {
    id: 'fx_siega', origen: 'melee/scythe-reap', nombre: ['Siega', 'Scythe reap'], categoria: 'cuerpo_a_cuerpo', elemento: 'alma',
    dir: { modo: 'vuelo', pivote: [0, -22] }, detrasEn: ['no', 'n', 'ne'], opciones: { palette: rampa('alma', 8) }, cola: 0.02,
    uso: [
      { tipo: 'monstruo', monstruos: ['segador'], nota: 'la guadaña del Segador' },
      { tipo: 'poder', clase: 'nigromante', habilidades: ['festin_tumba', 'cosecha_osario'], nota: 'la cosecha de almas' },
    ],
  },
  {
    id: 'fx_barrido_lanza', origen: 'melee/spear-sweep', nombre: ['Barrido de lanza', 'Spear sweep'], categoria: 'cuerpo_a_cuerpo', elemento: 'acero', enLanzador: true,
    opciones: { palette: rampa('acero', 7), sparks: CHISPAS(), stone: PIEDRA }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'cazadora', habilidades: ['furia_lanza'], nota: 'barrido bajo alrededor de la cazadora' },
      { tipo: 'monstruo', monstruos: ['satiro', 'guardia_corrupto'], nota: 'barrido de alabarda' },
    ],
  },
  {
    id: 'fx_tajo_giratorio', origen: 'melee/spin-slash', nombre: ['Tajo giratorio', 'Spin slash'], categoria: 'cuerpo_a_cuerpo', elemento: 'acero', enLanzador: true,
    opciones: { palette: rampa('acero', 7), sparks: CHISPAS() },
    uso: [
      { tipo: 'poder', clase: 'berserker', habilidades: ['torbellino'], nota: 'en bucle mientras gira (repetir la tira)' },
      { tipo: 'poder', clase: 'templario', habilidades: ['carga'] },
    ],
  },
  {
    id: 'fx_estocada', origen: 'melee/thrust', nombre: ['Estocada', 'Thrust'], categoria: 'cuerpo_a_cuerpo', elemento: 'acero',
    dir: { modo: 'vuelo', pivote: [0, -22] }, detrasEn: ['no', 'n', 'ne'], opciones: { palette: rampa('acero', 7), sparks: CHISPAS() },
    uso: [
      { tipo: 'poder', clase: 'cazadora', habilidades: ['estocada'] },
      { tipo: 'poder', clase: 'templario', habilidades: ['carga', 'sentencia_final'] },
      { tipo: 'monstruo', monstruos: ['diablillo', 'caballero_muerto'], nota: 'lanzazo' },
    ],
  },
  {
    id: 'fx_gancho', origen: 'melee/uppercut', nombre: ['Gancho ascendente', 'Rising strike'], categoria: 'cuerpo_a_cuerpo', elemento: 'brasa',
    dir: { modo: 'vuelo', pivote: [0, -22] }, detrasEn: ['no', 'n', 'ne'], opciones: { palette: rampa('brasa', 7), sparks: CHISPAS(), outline: '#120403' },
    uso: [
      { tipo: 'poder', clase: 'monje', habilidades: ['codo_piedra', 'rodilla_volcan'], nota: 'el golpe que levanta' },
      { tipo: 'monstruo', monstruos: ['ogro', 'jabali_demonio'], nota: 'embestida hacia arriba' },
    ],
  },
  {
    id: 'fx_latigazo', origen: 'melee/whip-crack', nombre: ['Latigazo', 'Whip crack'], categoria: 'cuerpo_a_cuerpo', elemento: 'sangre',
    dir: { modo: 'vuelo', pivote: [0, -22] }, detrasEn: ['no', 'n', 'ne'], opciones: { palette: tramo('carne', 7, 0.05, 0.95), sparks: tramo('sangre', 4, 1, 0.4) },
    uso: [
      { tipo: 'monstruo', monstruos: ['penitente', 'monja_hueca', 'senor_demonio'], nota: 'flagelo y látigo' },
      { tipo: 'poder', clase: 'berserker', habilidades: ['sangria'] },
    ],
  },
  // ============================================================ impactos
  {
    id: 'fx_golpe_seco', origen: 'impacts/blunt-hit', nombre: ['Golpe seco', 'Blunt hit'], categoria: 'impactos', elemento: 'piedra',
    opciones: { palette: tramo('hueso', 7, 0.05, 0.95), warm: '#d8a870', dust: '#5c524a', clod: '#2e2620' }, cola: 0.02,
    uso: [
      { tipo: 'golpe', nota: 'impacto de maza, puño o garrote sobre un enemigo' },
      { tipo: 'poder', clase: 'monje', habilidades: ['codo_piedra'] },
      { tipo: 'poder', clase: 'templario', habilidades: ['golpe_escudo'] },
    ],
  },
  {
    id: 'fx_critico', origen: 'impacts/crit-hit', nombre: ['Golpe crítico', 'Critical hit'], categoria: 'impactos', elemento: 'sangre',
    dir: { modo: 'vuelo', pivote: [0, -13] }, opciones: { palette: rampa('sangre', 8) }, cola: 0.02,
    uso: [
      { tipo: 'golpe', nota: 'golpe crítico de cualquier arma (en el punto de impacto, mirando hacia donde va el golpe)' },
      { tipo: 'poder', clase: 'berserker', habilidades: ['ejecucion'] },
    ],
  },
  {
    id: 'fx_golpe_piso', origen: 'impacts/ground-slam', nombre: ['Golpe al piso', 'Ground slam'], categoria: 'impactos', elemento: 'tierra', capa: 'piso', enLanzador: true,
    opciones: { palette: rampa('tierra', 7), stone: PIEDRA }, cola: 0.02, rapido25: [0, 0.5],
    uso: [
      { tipo: 'poder', clase: 'berserker', habilidades: ['ira_jarl', 'desatar'], nota: 'el pisotón que sacude la tierra' },
      { tipo: 'poder', clase: 'druida', habilidades: ['rugido_primigenio'] },
      { tipo: 'monstruo', monstruos: ['ogro', 'golem_de_piedra', 'gigante_helado'], nota: 'pisotón de los grandes' },
    ],
  },
  {
    id: 'fx_aterrizaje', origen: 'impacts/heavy-landing', nombre: ['Aterrizaje pesado', 'Heavy landing'], categoria: 'impactos', elemento: 'tierra', capa: 'piso', enLanzador: true,
    opciones: { palette: tramo('tierra', 7, 0.05, 1), stone: PIEDRA }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'berserker', habilidades: ['salto_lobo'], nota: 'la caída del salto' },
      { tipo: 'poder', clase: 'monje', habilidades: ['patada_voladora'] },
      { tipo: 'monstruo', monstruos: ['demonio_alado', 'gargola'], nota: 'el que baja volando' },
    ],
  },
  {
    id: 'fx_destello_herida', origen: 'impacts/hit-flash', nombre: ['Destello de herida', 'Hurt flash'], categoria: 'impactos', elemento: 'sangre',
    opciones: { palette: rampa('sangre', 7), lines: 0 }, cuerpo: { quitar: 'mascara', tinte: { color: '#c84a36', fuerza: 0.6, nota: 'el sprite se enciende rojo un instante (curva de la luz)' } },
    uso: [{ tipo: 'golpe', nota: 'cuando el héroe o un enemigo recibe daño: teñir el sprite con cuerpo.tinte siguiendo luz.curva' }],
  },
  {
    id: 'fx_chispa_golpe', origen: 'impacts/hit-spark', nombre: ['Chispa de golpe', 'Hit spark'], categoria: 'impactos', elemento: 'fuego',
    dir: { modo: 'vuelo', pivote: [0, -10] }, opciones: { palette: tramo('fuego', 7, 0.1, 1) }, cola: 0.02,
    uso: [{ tipo: 'golpe', nota: 'acero contra armadura o hueso: chispas en el punto de impacto (orientar con el golpe)' }],
  },
  {
    id: 'fx_parada', origen: 'impacts/parry', nombre: ['Parada', 'Parry'], categoria: 'impactos', elemento: 'oro',
    opciones: { palette: rampa('oro', 7) }, cola: 0.02,
    uso: [
      { tipo: 'golpe', nota: 'bloqueo con el arma: choque de acero' },
      { tipo: 'poder', clase: 'templario', habilidades: ['aura_firmeza'], nota: 'al desviar un golpe' },
    ],
  },
  {
    id: 'fx_rebote', origen: 'impacts/ricochet', nombre: ['Rebote', 'Ricochet'], categoria: 'impactos', elemento: 'fuego',
    dir: { modo: 'vuelo', pivote: [0, -4] }, opciones: { palette: tramo('fuego', 7, 0.1, 1), stone: PIEDRA }, cola: 0.02,
    uso: [
      { tipo: 'golpe', nota: 'una flecha o un virote que rebota en la piedra' },
      { tipo: 'poder', clase: 'alquimista', habilidades: ['virote_lastre'] },
    ],
  },
  {
    id: 'fx_bloqueo_escudo', origen: 'impacts/shield-block', nombre: ['Bloqueo con escudo', 'Shield block'], categoria: 'impactos', elemento: 'sagrado',
    dir: { modo: 'vuelo', pivote: [0, -22] }, opciones: { palette: rampa('sagrado', 8), sparks: CHISPAS() }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'templario', habilidades: ['egida_alba', 'golpe_escudo'], nota: 'el escudo que para el golpe, del lado del golpe' },
      { tipo: 'golpe', nota: 'bloqueo con escudo de cualquiera' },
    ],
  },
  // ============================================================ proyectiles
  {
    id: 'fx_flecha', origen: 'projectiles/arrow', nombre: ['Flecha', 'Arrow'], categoria: 'proyectiles', elemento: 'madera',
    dir: { modo: 'vuelo' }, ancla: [0, 21], opciones: { palette: ['#3a0c0c', '#6a1814', '#b8ae98', '#d8d0bc'], wood: tramo('madera', 4, 0.2, 1), steel: tramo('acero', 4, 0.2, 0.95), wind: '#7c8890' },
    uso: [
      { tipo: 'poder', clase: 'cazadora', habilidades: ['flecha_certera', 'flecha_rastro', 'andanada', 'lluvia_flechas'] },
      { tipo: 'monstruo', monstruos: ['esqueleto_arquero', 'ballestero_oscuro'] },
    ],
  },
  {
    id: 'fx_proyectil_magico', origen: 'projectiles/magic-missile', nombre: ['Proyectil arcano', 'Arcane missile'], categoria: 'proyectiles', elemento: 'arcano',
    dir: { modo: 'vuelo', pivote: [0, -13] }, opciones: { palette: rampa('arcano', 8) }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'nigromante', habilidades: ['dientes_tumba'], nota: 'sale de la mano y pega ~4 cuerpos adelante' },
      { tipo: 'poder', clase: 'monje', habilidades: ['lanza_espiritu'] },
      { tipo: 'monstruo', monstruos: ['brujo_diablillo', 'lich', 'sacerdote_caido'], nota: 'saeta de los hechiceros' },
    ],
  },

  // ============================================================ estados
  {
    id: 'fx_envenenado', origen: 'status/poisoned', nombre: ['Envenenado', 'Poisoned'], categoria: 'estado', elemento: 'veneno',
    opciones: { palette: rampa('veneno', 8), veins: '#10180a' },
    cuerpo: { quitar: 'silueta', tinte: { color: '#5c7c1e', fuerza: 0.35, nota: 'teñir el sprite del envenenado con pulso lento' } },
    uso: [
      { tipo: 'estado', estado: 'veneno', nota: 'en bucle sobre el afectado mientras dure el veneno' },
      { tipo: 'poder', clase: 'alquimista', habilidades: ['virote_veneno', 'frasco_peste', 'miasma'], nota: 'sobre los que alcanza' },
      { tipo: 'poder', clase: 'nigromante', habilidades: ['toque_putrido'] },
    ],
  },
  // ============================================================ clima
  {
    id: 'fx_lluvia', origen: 'weather/rain', nombre: ['Lluvia', 'Rain'], categoria: 'clima', elemento: 'agua', capa: 'pantalla', t: 2,
    opciones: { palette: rampa('agua', 8) }, gradacion: { tope: 0.3 },
    uso: [
      { tipo: 'clima', actos: [1], zonas: ['a1_refugio', 'a1_paramo', 'a1_bosque'], nota: 'las zonas con lluvia del acto 1' },
      { tipo: 'clima', actos: [3], zonas: ['a3_muelle', 'a3_selva', 'a3_pantano'] },
      { tipo: 'clima', actos: [6], zonas: ['a6_costa', 'a6_barrio1', 'a6_barrio2'] },
    ],
  },
  // ============================================================ criaturas
  {
    id: 'fx_murcielago', origen: 'critters/bat', nombre: ['Murciélago', 'Bat'], categoria: 'criaturas', elemento: 'carne',
    ancla: [0, 30], opciones: { palette: tramo('ceniza', 7, 0, 0.8), eyes: ['#2a0303', '#5a0808', '#9a2418', '#d08050'] },
    uso: [
      { tipo: 'ambiente', zonas: ['a1_cripta', 'a1_cata1', 'a1_guarida', 'a2_escarabajos', 'a3_nido'], nota: 'bandadas que cruzan el techo de las mazmorras' },
      { tipo: 'cinematica', nota: 'murciélagos que salen de la cripta en las tomas de entrada' },
    ],
  },
  // ============================================================ aparición y muerte
  {
    id: 'fx_monedas_caen', origen: 'spawn/coin-drop', nombre: ['Monedas que caen', 'Coin drop'], categoria: 'aparicion', elemento: 'oro',
    opciones: { palette: rampa('oro', 8), smoke: tramo('ceniza', 4, 0.3, 1) }, cola: 0.02,
    uso: [
      { tipo: 'botin', nota: 'oro que suelta un enemigo al morir: las monedas rebotan y quedan en el piso' },
      { tipo: 'muerte', nota: 'muerte de un saqueador o un bandido (el humo y el oro)' },
    ],
  },
  {
    id: 'fx_desintegrar', origen: 'spawn/disintegrate', nombre: ['Desintegrar', 'Disintegrate'], categoria: 'aparicion', elemento: 'alma',
    opciones: { palette: rampa('alma', 8), accent: tramo('arcano', 3, 0.4, 1) }, cuerpo: { quitar: 'silueta', alfa: true, rampa: 'alma' }, cola: 0.02,
    uso: [
      { tipo: 'muerte', nota: 'muerte por magia: el cuerpo se deshace en motas de luz (desvanecer el sprite con cuerpo.alfa)' },
      { tipo: 'poder', clase: 'monje', habilidades: ['ascenso_espiritu'] },
      { tipo: 'cinematica', nota: 'un ánima que se deshace en el cierre del acto 7' },
    ],
  },
  {
    id: 'fx_arder_hasta_ceniza', origen: 'spawn/dissolve-burn', nombre: ['Arder hasta la ceniza', 'Burn to ash'], categoria: 'aparicion', elemento: 'fuego',
    opciones: { palette: rampa('fuego', 8), ash: tramo('ceniza', 3, 0.1, 0.7) }, cuerpo: { quitar: 'silueta', rampa: 'ceniza' }, cola: 0.02,
    notas: 'El efecto original reemplaza el cuerpo entero; acá quedan las llamas, las brasas y la ceniza. El juego desvanece el sprite de abajo hacia arriba (o con alfa) a lo largo del efecto.',
    uso: [
      { tipo: 'muerte', nota: 'muerte por fuego: el cadáver se consume en brasas y ceniza' },
      { tipo: 'poder', clase: 'nigromante', habilidades: ['cosecha_osario'], nota: 'los cadáveres que arden' },
    ],
  },
  {
    id: 'fx_humareda', origen: 'spawn/poof', nombre: ['Humareda', 'Puff of smoke'], categoria: 'aparicion', elemento: 'humo',
    opciones: { palette: tramo('ceniza', 6, 0.1, 1), stars: tramo('ceniza', 3, 0.5, 1) }, cola: 0.02,
    notas: 'Sin las líneas de velocidad ni las estrellitas del original: solo el humo.',
    uso: [
      { tipo: 'muerte', nota: 'desaparecer en humo: espectros menores, ilusiones, el que huye' },
      { tipo: 'poder', clase: 'alquimista', habilidades: ['bomba_humo'], nota: 'versión chica' },
    ],
  },
  {
    id: 'fx_columna_regreso', origen: 'spawn/respawn-beam', nombre: ['Columna de regreso', 'Return pillar'], categoria: 'aparicion', elemento: 'sagrado',
    opciones: { palette: rampa('sagrado', 7) }, cuerpo: { quitar: 'todo', alfa: true }, cola: 0.02,
    uso: [
      { tipo: 'ambiente', zonas: ['a1_refugio', 'a2_oasis', 'a3_muelle', 'a4_fortin', 'a5_bastion'], nota: 'llegar por la piedra de viaje: el héroe aparece en la columna (aparecer el sprite con cuerpo.alfa)' },
      { tipo: 'muerte', nota: 'el héroe vuelve a la vida en el pueblo' },
    ],
  },
  {
    id: 'fx_muerte_helada', origen: 'spawn/shatter-death', nombre: ['Muerte helada', 'Shatter death'], categoria: 'aparicion', elemento: 'hielo',
    opciones: { palette: rampa('hielo', 8) }, cuerpo: { quitar: 'silueta', alfa: true, rampa: 'hielo' }, cola: 0.02,
    uso: [
      { tipo: 'muerte', nota: 'muerte de un enemigo congelado: se encierra en hielo y revienta en esquirlas (ocultar el sprite con cuerpo.alfa)' },
      { tipo: 'poder', clase: 'arcanista', habilidades: ['edad_hielo'], nota: 'los que mueren en la nova' },
    ],
  },
  {
    id: 'fx_alma_sube', origen: 'spawn/soul-rise', nombre: ['Alma que sube', 'Soul rise'], categoria: 'aparicion', elemento: 'alma',
    opciones: { palette: rampa('alma', 7) }, cuerpo: { quitar: 'silueta' }, cola: 0.02,
    uso: [
      { tipo: 'muerte', nota: 'el ánima que deja el cadáver de los humanos y los muertos vivientes' },
      { tipo: 'poder', clase: 'nigromante', habilidades: ['ofrenda', 'festin_tumba'], nota: 'el alma que el nigromante arranca' },
      { tipo: 'cinematica', nota: 'las almas de la plaza de las ánimas (acto 6)' },
    ],
  },
  {
    id: 'fx_grieta_invocacion', origen: 'spawn/spawn-portal', nombre: ['Grieta de invocación', 'Summoning rift'], categoria: 'aparicion', elemento: 'infierno', capa: 'piso',
    opciones: { palette: rampa('infierno', 8) }, cola: 0.02,
    uso: [
      { tipo: 'monstruo', monstruos: ['senor_demonio', 'brujo_diablillo', 'lich'], nota: 'la grieta por la que llegan los invocados' },
      { tipo: 'ambiente', zonas: ['a5_abismo1', 'a5_abismo2'], nota: 'grietas que escupen diablillos' },
    ],
  },
  {
    id: 'fx_surge_del_piso', origen: 'spawn/summon-rise', nombre: ['Surge del piso', 'Rises from the ground'], categoria: 'aparicion', elemento: 'brasa', capa: 'piso',
    opciones: { palette: rampa('brasa', 8), body: tramo('ceniza', 5, 0, 0.5), horn: tramo('hueso', 5, 0, 0.7), stone: tramo('piedra', 5, 0.05, 0.85), bruto: false }, cola: 0.02,
    notas: 'Sin la bestia del original: queda el círculo de runas, el piso que revienta, el polvo y los escombros. El juego levanta su propio monstruo desde el ancla.',
    uso: [
      { tipo: 'poder', clase: 'nigromante', habilidades: ['alzar_esqueleto', 'golem_sangre', 'marcha_fosa'], nota: 'el invocado sale del agujero' },
      { tipo: 'monstruo', monstruos: ['senor_demonio', 'caballero_abismo', 'golem_de_piedra'], nota: 'entrada de jefe que sale del piso' },
    ],
  },
  // ============================================================ arcano
  {
    id: 'fx_rayo_arcano', origen: 'arcane/arcane-beam', nombre: ['Rayo arcano', 'Arcane beam'], categoria: 'arcano', elemento: 'arcano',
    dir: { modo: 'vuelo', pivote: [0, -24] }, detrasEn: ['no', 'n', 'ne'], cuerpo: { quitar: 'silueta' }, opciones: { palette: rampa('arcano', 8) },
    uso: [
      { tipo: 'poder', clase: 'monje', habilidades: ['lanza_espiritu'], nota: 'el haz sostenido desde la mano' },
      { tipo: 'monstruo', monstruos: ['lich', 'sacerdote_caido'], nota: 'haz que canalizan los hechiceros' },
    ],
  },
  {
    id: 'fx_proyectiles_arcanos', origen: 'arcane/arcane-missiles', nombre: ['Saetas arcanas', 'Arcane missiles'], categoria: 'arcano', elemento: 'arcano',
    dir: { modo: 'vuelo', pivote: [0, -24] }, cuerpo: { quitar: 'silueta' }, opciones: { palette: rampa('arcano', 8) }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'nigromante', habilidades: ['espiral_huesos'], nota: 'la ráfaga en abanico que se curva al blanco' },
      { tipo: 'poder', clase: 'templario', habilidades: ['espadas_votivas'] },
    ],
  },
  {
    id: 'fx_orbe_arcano', origen: 'arcane/arcane-orb', nombre: ['Orbe arcano', 'Arcane orb'], categoria: 'arcano', elemento: 'arcano',
    opciones: { palette: rampa('arcano', 8) },
    uso: [
      { tipo: 'botin', nota: 'orbe de una reliquia o del pedestal de un santuario' },
      { tipo: 'ambiente', zonas: ['a7_boveda', 'a7_relicario'], nota: 'orbes que flotan en la Bóveda de los Astros' },
      { tipo: 'monstruo', monstruos: ['lich'], nota: 'orbe que orbita al Lich' },
    ],
  },
  {
    id: 'fx_aparecer', origen: 'arcane/blink-in', nombre: ['Aparecer', 'Blink in'], categoria: 'arcano', elemento: 'arcano',
    opciones: { palette: rampa('arcano', 8) }, cuerpo: { quitar: 'silueta', alfa: true }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'arcanista', habilidades: ['paso_tormenta'], nota: 'donde llega (mostrar el sprite con cuerpo.alfa)' },
      { tipo: 'poder', clase: 'monje', habilidades: ['paso_viento'] },
      { tipo: 'monstruo', monstruos: ['aparecida', 'sin_rostro'], nota: 'el que se teletransporta' },
    ],
  },
  {
    id: 'fx_desaparecer', origen: 'arcane/blink-out', nombre: ['Desaparecer', 'Blink out'], categoria: 'arcano', elemento: 'arcano',
    opciones: { palette: rampa('arcano', 8) }, cuerpo: { quitar: 'silueta', alfa: true }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'arcanista', habilidades: ['paso_tormenta'], nota: 'de donde sale (ocultar el sprite con cuerpo.alfa)' },
      { tipo: 'monstruo', monstruos: ['aparecida', 'sin_rostro'] },
    ],
  },
  {
    id: 'fx_circulo_conjuro', origen: 'arcane/magic-circle-cast', nombre: ['Círculo de conjuro', 'Casting circle'], categoria: 'arcano', elemento: 'arcano', capa: 'piso', enLanzador: true,
    opciones: { palette: rampa('arcano', 8) }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'nigromante', habilidades: ['condena_osario', 'legion_ceniza'], nota: 'el círculo bajo el lanzador y la columna de luz' },
      { tipo: 'poder', clase: 'templario', habilidades: ['coro_sellos'] },
      { tipo: 'cinematica', nota: 'un ritual del culto' },
    ],
  },
  {
    id: 'fx_estallido_mana', origen: 'arcane/mana-burst', nombre: ['Estallido de maná', 'Mana burst'], categoria: 'arcano', elemento: 'arcano', capa: 'piso', enLanzador: true,
    opciones: { palette: rampa('arcano', 8) }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'monje', habilidades: ['campana_interior'], nota: 'nova de runas alrededor del monje' },
      { tipo: 'botin', nota: 'al romper un santuario de maná' },
    ],
  },
  {
    id: 'fx_portal', origen: 'arcane/portal', nombre: ['Portal', 'Portal'], categoria: 'arcano', elemento: 'arcano',
    opciones: { palette: rampa('arcano', 8) },
    uso: [
      { tipo: 'ambiente', zonas: ['a1_refugio', 'a2_oasis', 'a3_muelle', 'a4_fortin', 'a5_bastion', 'a6_barco', 'a7_campamento'], nota: 'el portal al pueblo (pergamino de portal)' },
      { tipo: 'cinematica', nota: 'el paso entre actos' },
    ],
  },
  {
    id: 'fx_circulo_runas', origen: 'arcane/rune-circle', nombre: ['Círculo de runas', 'Rune circle'], categoria: 'arcano', elemento: 'arcano', capa: 'piso',
    opciones: { palette: rampa('arcano', 8) },
    uso: [
      { tipo: 'ambiente', zonas: ['a7_boveda', 'a5_santuario1', 'a2_sol'], nota: 'sello que gira en el piso de un santuario o de una trampa' },
      { tipo: 'poder', clase: 'cazadora', habilidades: ['coto_caza'], nota: 'el área marcada' },
      { tipo: 'poder', clase: 'templario', habilidades: ['aura_conviccion'], nota: 'bajo el templario mientras dura el aura' },
    ],
  },
  {
    id: 'fx_carga_conjuro', origen: 'arcane/spell-charge', nombre: ['Carga de conjuro', 'Spell charge'], categoria: 'arcano', elemento: 'arcano', enLanzador: true,
    opciones: { palette: rampa('arcano', 8) }, cuerpo: { quitar: 'silueta' },
    uso: [
      { tipo: 'poder', clase: 'arcanista', habilidades: ['descarga_prismatica', 'orbe_glacial'], nota: 'la energía que se junta en la mano antes de lanzar' },
      { tipo: 'monstruo', monstruos: ['brujo_diablillo', 'lich', 'hechicera_sangre'], nota: 'carga antes del hechizo' },
    ],
  },
  {
    id: 'fx_lluvia_astros', origen: 'arcane/star-fall', nombre: ['Lluvia de astros', 'Star fall'], categoria: 'arcano', elemento: 'sagrado',
    opciones: { palette: rampa('sagrado', 8) }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'templario', habilidades: ['cielo_abierto'], nota: 'astros que caen sobre el área' },
      { tipo: 'poder', clase: 'cazadora', habilidades: ['lluvia_flechas'], nota: 'variante encantada' },
      { tipo: 'cinematica', nota: 'el cielo roto que se cae a pedazos (acto 7)' },
    ],
  },
  {
    id: 'fx_reloj_detenido', origen: 'arcane/time-stop', nombre: ['Reloj detenido', 'Time stop'], categoria: 'arcano', elemento: 'hueso',
    opciones: { palette: rampa('hueso', 8) }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'nigromante', habilidades: ['decrepitud'], nota: 'el tiempo que se le acaba al maldito' },
      { tipo: 'cinematica', nota: 'el reloj de la catedral que se detiene (acto 6)' },
    ],
  },
  // ============================================================ sagrado
  {
    id: 'fx_bendicion', origen: 'holy/blessing', nombre: ['Bendición', 'Blessing'], categoria: 'sagrado', elemento: 'sagrado',
    opciones: { palette: rampa('sagrado', 8) }, cuerpo: { quitar: 'silueta' },
    uso: [
      { tipo: 'poder', clase: 'templario', habilidades: ['juramento_renovado', 'rezo_alivio', 'aura_oracion'], nota: 'en bucle sobre el bendecido' },
      { tipo: 'estado', estado: 'bendecido' },
    ],
  },
  {
    id: 'fx_escudo_divino', origen: 'holy/divine-shield', nombre: ['Escudo divino', 'Divine shield'], categoria: 'sagrado', elemento: 'sagrado',
    opciones: { palette: rampa('sagrado', 8) }, cuerpo: { quitar: 'silueta' },
    uso: [
      { tipo: 'poder', clase: 'templario', habilidades: ['egida_alba'], nota: 'burbuja en bucle mientras dura' },
      { tipo: 'poder', clase: 'monje', habilidades: ['cortina_viento', 'mantra_piedra'] },
      { tipo: 'estado', estado: 'invulnerable' },
    ],
  },
  {
    id: 'fx_plumas', origen: 'holy/feather-burst', nombre: ['Estallido de plumas', 'Feather burst'], categoria: 'sagrado', elemento: 'hueso',
    opciones: { palette: tramo('hueso', 6, 0.2, 1), glow: '#e8d8b0' }, cola: 0.02,
    uso: [
      { tipo: 'muerte', nota: 'muerte de un cuervo o de un ser alado (gárgola, demonio alado: plumas negras con otra paleta)' },
      { tipo: 'poder', clase: 'cazadora', habilidades: ['llamar_halcon', 'cielo_halcones'], nota: 'el halcón que aparece o se va' },
      { tipo: 'cinematica', nota: 'plumas en el Jardín de los que Intentaron (acto 7)' },
    ],
  },
  {
    id: 'fx_aureola', origen: 'holy/halo', nombre: ['Aureola', 'Halo'], categoria: 'sagrado', elemento: 'sagrado',
    opciones: { palette: rampa('sagrado', 8) }, cuerpo: { quitar: 'silueta' },
    uso: [
      { tipo: 'poder', clase: 'monje', habilidades: ['loto_dorado', 'ascenso_espiritu'], nota: 'sobre la cabeza mientras dura' },
      { tipo: 'monstruo', monstruos: ['sacerdote_caido'], nota: 'aureola rota del sacerdote caído (teñir de rojo)' },
    ],
  },
  {
    id: 'fx_curacion_area', origen: 'holy/heal-aoe', nombre: ['Curación en área', 'Area heal'], categoria: 'sagrado', elemento: 'sagrado', capa: 'piso', enLanzador: true,
    opciones: { palette: rampa('sagrado', 8) }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'templario', habilidades: ['aura_oracion', 'rezo_alivio'], nota: 'el anillo de luz que cura a los cercanos' },
      { tipo: 'poder', clase: 'druida', habilidades: ['roble_sabio'] },
    ],
  },
  {
    id: 'fx_curacion', origen: 'holy/heal', nombre: ['Curación', 'Heal'], categoria: 'sagrado', elemento: 'sagrado',
    opciones: { palette: rampa('sagrado', 8) }, cuerpo: { quitar: 'silueta' }, cola: 0.02,
    notas: 'Las motas terminan en cruces de luz en vez de corazones.',
    uso: [
      { tipo: 'botin', nota: 'al beber una poción de vida' },
      { tipo: 'poder', clase: 'monje', habilidades: ['palma_serena'] },
      { tipo: 'ambiente', zonas: ['a1_refugio', 'a2_oasis'], nota: 'el pozo o la fuente que cura' },
    ],
  },
  {
    id: 'fx_pilar_sagrado', origen: 'holy/holy-pillar', nombre: ['Pilar sagrado', 'Holy pillar'], categoria: 'sagrado', elemento: 'sagrado', capa: 'piso',
    opciones: { palette: rampa('sagrado', 8) }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'templario', habilidades: ['cielo_abierto', 'campana_penitencia'], nota: 'la luz baja sobre la marca' },
      { tipo: 'cinematica', nota: 'la luz que entra en la catedral del acto 6 o en el trono del acto 7' },
    ],
  },
  {
    id: 'fx_resurreccion', origen: 'holy/resurrection', nombre: ['Resurrección', 'Resurrection'], categoria: 'sagrado', elemento: 'sagrado',
    opciones: { palette: rampa('sagrado', 8), ash: tramo('ceniza', 6, 0, 0.8) }, cuerpo: { quitar: 'silueta', rampa: 'ceniza' }, cola: 0.02, maxSeg: 4.2,
    uso: [
      { tipo: 'poder', clase: 'templario', habilidades: ['juramento_renovado'], nota: 'alas de luz al levantarse' },
      { tipo: 'muerte', nota: 'el héroe resucita en el lugar (si el juego lo permite)' },
      { tipo: 'cinematica', nota: 'la abadesa redimida o el ángel caído del acto 7' },
    ],
  },
  {
    id: 'fx_castigo_divino', origen: 'holy/smite', nombre: ['Castigo divino', 'Smite'], categoria: 'sagrado', elemento: 'sagrado',
    opciones: { palette: rampa('sagrado', 8), stone: PIEDRA }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'templario', habilidades: ['golpe_sagrado', 'juicio', 'sentencia_final'], nota: 'el rayo de luz cae sobre el blanco' },
      { tipo: 'poder', clase: 'templario', habilidades: ['martillo_bendito'], nota: 'al pegar' },
    ],
  },
  {
    id: 'fx_sol_radiante', origen: 'holy/sunburst', nombre: ['Sol radiante', 'Sunburst'], categoria: 'sagrado', elemento: 'sagrado',
    opciones: { palette: rampa('sagrado', 8) },
    uso: [
      { tipo: 'ambiente', zonas: ['a2_sol', 'a7_trono'], nota: 'el sol del Templo del Sol Caído, sobre el altar' },
      { tipo: 'cinematica', nota: 'el amanecer sobre el desierto (acto 2)' },
      { tipo: 'botin', nota: 'brillo de un objeto sagrado único' },
    ],
  },
  // ============================================================ sombra
  {
    id: 'fx_agujero_negro', origen: 'shadow/black-hole', nombre: ['Agujero negro', 'Black hole'], categoria: 'sombra', elemento: 'sombra',
    opciones: { palette: rampa('sombra', 8), rock: tramo('piedra', 4, 0.05, 0.75) },
    uso: [
      { tipo: 'poder', clase: 'arcanista', habilidades: ['sol_negro'], nota: 'el sol negro que se traga todo antes de estallar' },
      { tipo: 'ambiente', zonas: ['a5_abismo1', 'a5_abismo2'], nota: 'la nada sobre las islas del abismo' },
    ],
  },
  {
    id: 'fx_maldicion', origen: 'shadow/curse', nombre: ['Maldición', 'Curse'], categoria: 'sombra', elemento: 'sombra',
    opciones: { palette: rampa('sombra', 8), bone: tramo('hueso', 5, 0, 0.9) }, cuerpo: { quitar: 'silueta', tinte: { color: '#522a78', fuerza: 0.4, nota: 'el maldito se tiñe de violeta' } }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'nigromante', habilidades: ['amplificar', 'debilidad', 'terror', 'decrepitud'], nota: 'la calavera que cae sobre el maldito' },
      { tipo: 'monstruo', monstruos: ['bruja', 'cultista'] },
    ],
  },
  {
    id: 'fx_explosion_oscura', origen: 'shadow/dark-explosion', nombre: ['Explosión oscura', 'Dark explosion'], categoria: 'sombra', elemento: 'sombra',
    // se junta 0.56 s y revienta: la ventana rápida es el reventón
    opciones: { palette: rampa('sombra', 8) }, cola: 0.02, maxSeg: 3.2, rapido25: [0.48, 1],
    uso: [
      { tipo: 'poder', clase: 'arcanista', habilidades: ['sol_negro'], nota: 'el estallido' },
      { tipo: 'muerte', nota: 'muerte del Caballero del Abismo o del Señor Demonio' },
      { tipo: 'poder', clase: 'nigromante', habilidades: ['explosion_cadaver'], nota: 'versión de sombra' },
    ],
  },
  {
    id: 'fx_eclipse', origen: 'shadow/eclipse', nombre: ['Eclipse', 'Eclipse'], categoria: 'sombra', elemento: 'sombra',
    opciones: { palette: rampa('sombra', 8), pearl: tramo('hueso', 4, 0.4, 1) }, soloCinematica: true,
    notas: 'Solo capa de cinemática: es un astro del cielo (cinemáticas y cartas de acto), no va en el piso ni prende luz.',
    uso: [{ tipo: 'cinematica', nota: 'el eclipse sobre el trono sediento (cierre del acto 7) o la carta del acto 5' }],
  },
  {
    id: 'fx_manos_que_agarran', origen: 'shadow/grasping-hands', nombre: ['Manos que agarran', 'Grasping hands'], categoria: 'sombra', elemento: 'sombra', capa: 'piso',
    opciones: { palette: rampa('sombra', 8) }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'nigromante', habilidades: ['jaula_costillas', 'condena_osario'], nota: 'brazos que salen del piso y sujetan' },
      { tipo: 'ambiente', zonas: ['a1_cripta', 'a6_criptas2'], nota: 'trampa de la cripta' },
      { tipo: 'monstruo', monstruos: ['madre_cienaga', 'monja_hueca'] },
    ],
  },
  {
    id: 'fx_sello_maleficio', origen: 'shadow/hex-sigil', nombre: ['Sello de maleficio', 'Hex sigil'], categoria: 'sombra', elemento: 'infierno',
    opciones: { palette: rampa('infierno', 8) }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'nigromante', habilidades: ['huesos_vidrio', 'amplificar'], nota: 'el sello que se dibuja en el aire sobre el blanco' },
      { tipo: 'monstruo', monstruos: ['bruja', 'hechicera_sangre'] },
    ],
  },
  {
    id: 'fx_robo_vida', origen: 'shadow/life-steal', nombre: ['Robo de vida', 'Life steal'], categoria: 'sombra', elemento: 'sangre',
    dir: { modo: 'vuelo', pivote: [0, -22] }, opciones: { palette: rampa('sangre', 8), dark: '#200204' }, cuerpo: { quitar: 'silueta' }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'nigromante', habilidades: ['sifon_vida'], nota: 'las gotas vuelven del blanco al lanzador (orientar hacia el blanco)' },
      { tipo: 'poder', clase: 'berserker', habilidades: ['pacto_herida', 'rio_carmesi'] },
      { tipo: 'monstruo', monstruos: ['hechicera_sangre'] },
    ],
  },
  {
    id: 'fx_calaveras_orbitan', origen: 'shadow/necro-skulls', nombre: ['Calaveras que orbitan', 'Orbiting skulls'], categoria: 'sombra', elemento: 'necro',
    opciones: { palette: rampa('necro', 8), bone: tramo('hueso', 5, 0, 1) },
    uso: [
      { tipo: 'poder', clase: 'nigromante', habilidades: ['armadura_hueso', 'lamento_osario'], nota: 'calaveras que giran alrededor del nigromante' },
      { tipo: 'monstruo', monstruos: ['lich'] },
    ],
  },
  {
    id: 'fx_llamas_sombra', origen: 'shadow/shadow-flames', nombre: ['Llamas de sombra', 'Shadow flames'], categoria: 'sombra', elemento: 'infierno',
    opciones: { palette: rampa('infierno', 8) },
    uso: [
      { tipo: 'ambiente', zonas: ['a5_abismo1', 'a5_santuario2', 'a1_pozo'], nota: 'fuego negro que no se apaga' },
      { tipo: 'poder', clase: 'nigromante', habilidades: ['lamento_osario'] },
    ],
  },
  {
    id: 'fx_tentaculos_sombra', origen: 'shadow/shadow-tendrils', nombre: ['Tentáculos de sombra', 'Shadow tendrils'], categoria: 'sombra', elemento: 'sombra', capa: 'piso',
    opciones: { palette: rampa('sombra', 8) }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'nigromante', habilidades: ['terror', 'jaula_costillas'] },
      { tipo: 'monstruo', monstruos: ['madre_cienaga', 'caballero_abismo'], nota: 'tentáculos que salen de un charco negro' },
      { tipo: 'ambiente', zonas: ['a5_abismo2'] },
    ],
  },
  {
    id: 'fx_drenar_almas', origen: 'shadow/soul-drain', nombre: ['Drenar almas', 'Soul drain'], categoria: 'sombra', elemento: 'sombra',
    dir: { modo: 'vuelo', pivote: [0, -24] }, opciones: { palette: rampa('sombra', 8), soul: tramo('alma', 4, 0.3, 1) },
    uso: [
      { tipo: 'poder', clase: 'nigromante', habilidades: ['festin_tumba', 'sifon_vida'], nota: 'en bucle mientras canaliza, hacia el blanco' },
      { tipo: 'monstruo', monstruos: ['lich', 'segador'] },
    ],
  },
  {
    id: 'fx_orbe_vacio', origen: 'shadow/void-orb', nombre: ['Orbe del vacío', 'Void orb'], categoria: 'sombra', elemento: 'sombra',
    opciones: { palette: rampa('sombra', 8) },
    uso: [
      { tipo: 'poder', clase: 'arcanista', habilidades: ['sol_negro'], nota: 'el orbe que crece antes del estallido' },
      { tipo: 'ambiente', zonas: ['a5_abismo1', 'a7_boveda'] },
      { tipo: 'monstruo', monstruos: ['caballero_abismo'] },
    ],
  },
  // ============================================================ estados (más)
  {
    id: 'fx_sangrando', origen: 'status/bleeding', nombre: ['Sangrando', 'Bleeding'], categoria: 'estado', elemento: 'sangre',
    opciones: { palette: tramo('sangre', 6, 0.15, 1) }, cuerpo: { quitar: 'mascara', tinte: { color: '#8a1614', fuerza: 0.25, nota: 'pulso rojo con cada latido' } },
    uso: [
      { tipo: 'estado', estado: 'sangrado', nota: 'en bucle sobre el herido' },
      { tipo: 'poder', clase: 'berserker', habilidades: ['desgarro', 'sangria', 'marea_roja'], nota: 'sobre los que alcanza' },
      { tipo: 'poder', clase: 'cazadora', habilidades: ['cepo_dientes', 'marca_presa'] },
    ],
  },
  {
    id: 'fx_confundido', origen: 'status/confused', nombre: ['Confundido', 'Confused'], categoria: 'estado', elemento: 'sombra',
    opciones: { palette: tramo('sombra', 6, 0.1, 1), marks: tramo('hueso', 4, 0.05, 1) }, cuerpo: { quitar: 'silueta' },
    notas: 'Calaveritas que giran alrededor de la cabeza en vez de signos de pregunta.',
    uso: [
      { tipo: 'estado', estado: 'confusion', nota: 'en bucle sobre la cabeza del confundido' },
      { tipo: 'poder', clase: 'nigromante', habilidades: ['terror'], nota: 'los que huyen sin rumbo' },
      { tipo: 'poder', clase: 'berserker', habilidades: ['bramido'] },
    ],
  },
  {
    id: 'fx_maldito', origen: 'status/cursed', nombre: ['Maldito', 'Cursed'], categoria: 'estado', elemento: 'sombra',
    opciones: { palette: rampa('sombra', 8) }, cuerpo: { quitar: 'mascara', tinte: { color: '#381a56', fuerza: 0.35 } },
    uso: [
      { tipo: 'estado', estado: 'maldicion', nota: 'en bucle mientras dura cualquier maldición' },
      { tipo: 'poder', clase: 'nigromante', habilidades: ['amplificar', 'debilidad', 'decrepitud'] },
      { tipo: 'monstruo', monstruos: ['maldito'], nota: 'el modificador de élite maldito' },
    ],
  },
  {
    id: 'fx_congelado', origen: 'status/frozen', nombre: ['Congelado', 'Frozen'], categoria: 'estado', elemento: 'hielo',
    opciones: { palette: rampa('hielo', 8) }, cuerpo: { quitar: 'mascara', tinte: { color: '#86b8dc', fuerza: 0.5, nota: 'azul hielo; frenar la animación' } },
    uso: [
      { tipo: 'estado', estado: 'helado', nota: 'en bucle mientras está helado o lento por frío' },
      { tipo: 'poder', clase: 'arcanista', habilidades: ['nova_escarcha', 'ventisca'], nota: 'sobre los afectados' },
      { tipo: 'monstruo', monstruos: ['helado'], nota: 'el modificador de élite helado' },
    ],
  },
  {
    id: 'fx_presteza', origen: 'status/haste', nombre: ['Presteza', 'Haste'], categoria: 'estado', elemento: 'acero',
    dir: { modo: 'vuelo', pivote: [0, -18] }, opciones: { palette: tramo('acero', 7, 0.1, 1), dust: '#4a4240' }, cuerpo: { quitar: 'forma' },
    uso: [
      { tipo: 'poder', clase: 'templario', habilidades: ['aura_presteza'], nota: 'estelas detrás del que corre, en la dirección de la marcha' },
      { tipo: 'poder', clase: 'cazadora', habilidades: ['caceria_salvaje'] },
      { tipo: 'monstruo', monstruos: ['rapido'], nota: 'el modificador de élite rápido' },
    ],
  },
  {
    id: 'fx_petrificado', origen: 'status/petrified', nombre: ['Petrificado', 'Petrified'], categoria: 'estado', elemento: 'piedra',
    opciones: { palette: rampa('piedra', 8) }, cuerpo: { quitar: 'silueta', alfa: true, rampa: 'piedra', tinte: { color: '#5f5a5b', fuerza: 0.85, nota: 'el sprite se vuelve piedra gris y se queda quieto; al final revienta (cuerpo.alfa)' } }, cola: 0.02,
    uso: [
      { tipo: 'estado', estado: 'petrificado' },
      { tipo: 'monstruo', monstruos: ['gargola', 'piel_piedra'], nota: 'la mirada de la gárgola; el modificador piel de piedra' },
      { tipo: 'poder', clase: 'monje', habilidades: ['mantra_piedra'], nota: 'versión que no revienta: usar hasta el cuadro de la estatua' },
    ],
  },
  {
    id: 'fx_furia', origen: 'status/rage', nombre: ['Furia', 'Rage'], categoria: 'estado', elemento: 'sangre',
    opciones: { palette: rampa('sangre', 8), heat: tramo('brasa', 4, 0.3, 1), steam: '#8a7e78' }, cuerpo: { quitar: 'silueta', tinte: { color: '#a8241a', fuerza: 0.3, nota: 'pulso rojo con cada latido' } },
    uso: [
      { tipo: 'poder', clase: 'berserker', habilidades: ['ira_jarl', 'grito_guerra', 'hambre_batalla'], nota: 'en bucle mientras la furia está llena' },
      { tipo: 'poder', clase: 'druida', habilidades: ['frenesi_luna'] },
      { tipo: 'monstruo', monstruos: ['fuerte'], nota: 'el modificador de élite fuerte' },
    ],
  },
  {
    id: 'fx_dormido', origen: 'status/sleep', nombre: ['Dormido', 'Asleep'], categoria: 'estado', elemento: 'alma',
    opciones: { palette: tramo('alma', 6, 0.05, 0.95) }, cuerpo: { quitar: 'silueta' },
    notas: 'Sin las letras Z del original: sube un aliento pálido.',
    uso: [
      { tipo: 'estado', estado: 'sueno', nota: 'en bucle sobre el dormido o el aturdido largo' },
      { tipo: 'ambiente', zonas: ['a2_tumbas1'], nota: 'los durmientes de la Galería de los Dormidos' },
    ],
  },
  {
    id: 'fx_ralentizado', origen: 'status/slowed', nombre: ['Ralentizado', 'Slowed'], categoria: 'estado', elemento: 'alma',
    opciones: { palette: tramo('hueso', 8, 0, 1) },
    notas: 'Un reloj de arena gótico chico sobre la cabeza que se vacía y se da vuelta, y granos de arena que caen lentos alrededor (en vez de la esfera de reloj del original).', cuerpo: { quitar: 'silueta' },
    uso: [
      { tipo: 'estado', estado: 'lento', nota: 'un reloj que pesa sobre la cabeza del ralentizado' },
      { tipo: 'poder', clase: 'nigromante', habilidades: ['decrepitud'] },
      { tipo: 'poder', clase: 'alquimista', habilidades: ['virote_lastre'] },
    ],
  },
  {
    id: 'fx_aturdido', origen: 'status/stunned', nombre: ['Aturdido', 'Stunned'], categoria: 'estado', elemento: 'acero',
    opciones: { palette: tramo('acero', 7, 0.1, 1), birds: ['#050406', '#151318', '#2a262c', '#5a5258'], beak: '#3a3431' }, cuerpo: { quitar: 'silueta' },
    notas: 'Los pajaritos son cuervos y las estrellas, chispas de acero apagado.',
    uso: [
      { tipo: 'estado', estado: 'aturdido', nota: 'en bucle sobre la cabeza' },
      { tipo: 'poder', clase: 'templario', habilidades: ['golpe_escudo'] },
      { tipo: 'poder', clase: 'monje', habilidades: ['puno_dios', 'codo_piedra'] },
    ],
  },
  // ============================================================ naturaleza
  {
    notas: 'El hoyo que come el ácido es de perfil bajo (una franja); lo que se lee es el salpicón. Para un charco que dura, fx_charco_toxico.',
    id: 'fx_salpicadura_acido', origen: 'nature/acid-splash', nombre: ['Salpicadura de ácido', 'Acid splash'], categoria: 'naturaleza', elemento: 'veneno',
    opciones: { palette: rampa('veneno', 8) }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'alquimista', habilidades: ['frasco_peste', 'lluvia_acida'], nota: 'el frasco que revienta y come el piso' },
      { tipo: 'monstruo', monstruos: ['arana_reina', 'gusano_de_arena', 'hombre_cienaga'], nota: 'escupitajo ácido' },
    ],
  },
  {
    id: 'fx_roca', origen: 'nature/boulder', nombre: ['Roca rodante', 'Boulder'], categoria: 'naturaleza', elemento: 'piedra',
    dir: { modo: 'suelo' }, opciones: { palette: rampa('piedra', 8), sparks: CHISPAS() }, cola: 0.02,
    uso: [
      { tipo: 'monstruo', monstruos: ['ogro', 'golem_de_piedra', 'gigante_helado'], nota: 'la roca que tiran y revienta' },
      { tipo: 'ambiente', zonas: ['a4_picos', 'a1_mina2'], nota: 'trampa de rocas' },
    ],
  },
  {
    id: 'fx_pua_tierra', origen: 'nature/earth-spike', nombre: ['Púa de tierra', 'Earth spike'], categoria: 'naturaleza', elemento: 'tierra',
    opciones: { palette: rampa('tierra', 8), glow: tramo('brasa', 5, 0.2, 1) }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'druida', habilidades: ['fisura', 'lanzas_raiz'] },
      { tipo: 'monstruo', monstruos: ['golem_de_piedra', 'gusano_de_arena'] },
    ],
  },
  {
    id: 'fx_flor_curativa', origen: 'nature/healing-bloom', nombre: ['Lirio de difuntos', 'Corpse lily'], categoria: 'naturaleza', elemento: 'naturaleza',
    opciones: { palette: rampa('naturaleza', 8), petal: tramo('hueso', 4, 0.15, 0.9), heart: tramo('alma', 4, 0.4, 1) }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'druida', habilidades: ['roble_sabio', 'piel_corteza'], nota: 'brote que cura a los cercanos' },
      { tipo: 'poder', clase: 'cazadora', habilidades: ['savia_bosque'] },
      { tipo: 'ambiente', zonas: ['a3_selva', 'a7_jardin'], nota: 'flor que se abre al pasar' },
    ],
  },
  {
    id: 'fx_torbellino_hojas', origen: 'nature/leaf-storm', nombre: ['Torbellino de hojas', 'Leaf storm'], categoria: 'naturaleza', elemento: 'naturaleza',
    opciones: { palette: tramo('naturaleza', 6, 0.15, 1), leaves: ['#14200c', '#2a3a14', '#4a5a20', '#7a8040', '#2a1806', '#5a3410', '#8a5a1c', '#b08a3a', '#200606', '#4a1208', '#7a2a12', '#a8502a'] }, cuerpo: { quitar: 'silueta' },
    uso: [
      { tipo: 'poder', clase: 'druida', habilidades: ['huracan', 'forma_lobo'], nota: 'en bucle alrededor del druida' },
      { tipo: 'poder', clase: 'monje', habilidades: ['ojo_tifon'] },
    ],
  },
  {
    id: 'fx_nube_veneno', origen: 'nature/poison-cloud', nombre: ['Nube de veneno', 'Poison cloud'], categoria: 'naturaleza', elemento: 'veneno', capa: 'piso',
    opciones: { palette: rampa('veneno', 8), spread: 0.7 }, relleno: [[0, -26], [-34, -13], [30, -10], [-6, 0], [26, 12], [-26, 14], [4, 26]],
    notas: 'La nube de pixelfx es una franja de perfil; acá se compone siete veces desfasada sobre una elipse 2:1 para que cubra un área.',
    uso: [
      { tipo: 'poder', clase: 'alquimista', habilidades: ['nube_toxica', 'miasma'], nota: 'en bucle mientras dura el área' },
      { tipo: 'ambiente', zonas: ['a3_pantano', 'a1_cata1'], nota: 'gas de la ciénaga y de los osarios' },
    ],
  },
  {
    id: 'fx_temblor', origen: 'nature/quake', nombre: ['Temblor', 'Quake'], categoria: 'naturaleza', elemento: 'tierra', capa: 'piso', dir: { modo: 'suelo' },
    opciones: { palette: rampa('piedra', 8), glow: tramo('brasa', 5, 0.2, 1) }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'druida', habilidades: ['fisura'], nota: 'la grieta que se abre con brasa adentro' },
      { tipo: 'poder', clase: 'berserker', habilidades: ['ira_jarl'] },
      { tipo: 'cinematica', nota: 'la tierra que se abre en la entrada del acto 5' },
    ],
  },
  {
    id: 'fx_raices_atrapan', origen: 'nature/root-snare', nombre: ['Raíces que atrapan', 'Root snare'], categoria: 'naturaleza', elemento: 'madera',
    opciones: { palette: rampa('madera', 8), glow: tramo('naturaleza', 4, 0.3, 1) }, cuerpo: { quitar: 'silueta' }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'druida', habilidades: ['enredadera', 'raiz_madre'], nota: 'las raíces suben por las piernas del enemigo' },
      { tipo: 'estado', estado: 'inmovil' },
    ],
  },
  {
    id: 'fx_esporas', origen: 'nature/spore-burst', nombre: ['Estallido de esporas', 'Spore burst'], categoria: 'naturaleza', elemento: 'fatuo',
    opciones: { palette: rampa('fatuo', 8), cap: tramo('carne', 6, 0, 0.55), stem: tramo('hueso', 5, 0.1, 0.9) }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'druida', habilidades: ['corro_hongos'], nota: 'el hongo que revienta al pisarlo' },
      { tipo: 'ambiente', zonas: ['a3_selva', 'a1_guarida', 'a3_nido'], nota: 'hongos venenosos' },
    ],
  },
  {
    id: 'fx_espinas', origen: 'nature/thorns', nombre: ['Espinas', 'Thorns'], categoria: 'naturaleza', elemento: 'madera',
    dir: { modo: 'suelo' }, opciones: { palette: rampa('madera', 8), glow: tramo('naturaleza', 4, 0.3, 1), soil: rampa('tierra', 8) }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'druida', habilidades: ['zarzas', 'lanzas_raiz'], nota: 'la línea de espinas que avanza por el piso' },
      { tipo: 'poder', clase: 'templario', habilidades: ['aura_espinas'] },
    ],
  },
  {
    id: 'fx_tornado', origen: 'nature/tornado', nombre: ['Tornado', 'Tornado'], categoria: 'naturaleza', elemento: 'humo',
    opciones: { palette: rampa('humo', 8), dust: tramo('tierra', 5, 0.1, 0.9), leaves: ['#2a1806', '#5a3410', '#8a5a1c', '#b08a3a', '#14200c', '#2a3a14', '#4a5a20', '#7a8040'] },
    uso: [
      { tipo: 'poder', clase: 'druida', habilidades: ['tornado'], nota: 'el tornado que avanza' },
      { tipo: 'ambiente', zonas: ['a2_dunas'], nota: 'remolino de arena (con otra paleta)' },
    ],
  },
  {
    id: 'fx_charco_toxico', origen: 'nature/toxic-puddle', nombre: ['Charco tóxico', 'Toxic puddle'], categoria: 'naturaleza', elemento: 'veneno', capa: 'piso',
    opciones: { palette: rampa('veneno', 8), sheen: ['#160a20', '#2e1640', '#123e40', '#3a7a70'], width: 30 }, relleno: [[2, -12], [-12, -7], [12, -5], [-4, -1], [-14, 4], [10, 5], [0, 10]],
    notas: 'El charco de pixelfx es una franja de perfil; acá se apila siete veces desfasado para que ocupe una mancha 2:1 en el piso.',
    uso: [
      { tipo: 'poder', clase: 'alquimista', habilidades: ['lluvia_acida', 'frasco_peste'], nota: 'el charco que queda' },
      { tipo: 'ambiente', zonas: ['a3_pantano', 'a1_mina2', 'a6_criptas'], nota: 'brea venenosa en el piso' },
      { tipo: 'monstruo', monstruos: ['madre_cienaga'] },
    ],
  },
  {
    id: 'fx_latigo_enredadera', origen: 'nature/vine-whip', nombre: ['Látigo de enredadera', 'Vine whip'], categoria: 'naturaleza', elemento: 'naturaleza',
    dir: { modo: 'suelo' }, opciones: { palette: rampa('naturaleza', 8), thorn: tramo('madera', 4, 0.2, 1), soil: rampa('tierra', 8) }, cola: 0.02,
    uso: [
      { tipo: 'poder', clase: 'druida', habilidades: ['enredadera', 'despertar_bosque'] },
      { tipo: 'monstruo', monstruos: ['madre_cienaga', 'hombre_cienaga'], nota: 'la ciénaga que azota' },
    ],
  },
  // ============================================================ clima (más)
  {
    id: 'fx_aurora', origen: 'weather/aurora', nombre: ['Aurora', 'Aurora'], categoria: 'clima', elemento: 'fatuo', capa: 'pantalla', t: 4,
    opciones: { palette: rampa('fatuo', 7), upper: tramo('sombra', 7, 0, 0.85) },
    notas: 'Es cielo: para cinemáticas, cartas de acto y la portada, no para el piso del juego.',
    uso: [
      { tipo: 'cinematica', nota: 'el cielo del Paso del Glaciar y de los Picos de Hrimgard (acto 4)' },
      { tipo: 'clima', actos: [4], zonas: ['a4_picos', 'a4_glaciar'], nota: 'solo si el juego muestra cielo (carta de acto)' },
    ],
  },
  {
    id: 'fx_ventisca', origen: 'weather/blizzard', nombre: ['Ventisca', 'Blizzard'], categoria: 'clima', elemento: 'hielo', capa: 'pantalla', t: 2,
    opciones: { palette: rampa('hielo', 8) }, gradacion: { tope: 0.3 },
    uso: [{ tipo: 'clima', actos: [4], zonas: ['a4_picos', 'a4_glaciar', 'a4_fortin'], nota: 'nieve horizontal con viento' }],
  },
  {
    id: 'fx_nubes', origen: 'weather/clouds', nombre: ['Nubes y luna', 'Clouds and moon'], categoria: 'clima', elemento: 'noche', capa: 'pantalla', t: 4,
    opciones: { palette: rampa('noche', 8) },
    notas: 'Es cielo nocturno: para cinemáticas y cartas de acto.',
    uso: [
      { tipo: 'cinematica', nota: 'cielo nocturno detrás de la abadía (acto 1) o del barco varado (acto 6)' },
      { tipo: 'clima', actos: [1, 6], nota: 'sombras de nubes sobre el mapa: dibujar solo el alfa muy bajo' },
    ],
  },
  {
    id: 'fx_hojas_caen', origen: 'weather/falling-leaves', nombre: ['Hojas que caen', 'Falling leaves'], categoria: 'clima', elemento: 'tierra', capa: 'pantalla',
    opciones: { palette: tramo('brasa', 6, 0.1, 0.85), reds: tramo('sangre', 6, 0.1, 0.9), golds: tramo('oro', 6, 0.05, 0.75) },
    uso: [{ tipo: 'clima', actos: [1], zonas: ['a1_bosque', 'a1_cementerio', 'a1_paramo'], nota: 'hojas muertas en el Bosque de los Ahorcados' }],
  },
  {
    id: 'fx_luciernagas', origen: 'weather/fireflies', nombre: ['Luciérnagas', 'Fireflies'], categoria: 'clima', elemento: 'fatuo', capa: 'pantalla',
    opciones: { palette: tramo('fatuo', 6, 0.2, 1), grass: tramo('naturaleza', 6, 0, 0.5) },
    uso: [
      { tipo: 'clima', actos: [3], zonas: ['a3_selva', 'a3_pantano'], nota: 'luces de la ciénaga de noche' },
      { tipo: 'clima', actos: [1], zonas: ['a1_cementerio'], nota: 'fuegos fatuos sobre las tumbas' },
    ],
  },
  {
    id: 'fx_niebla', origen: 'weather/fog', nombre: ['Niebla', 'Fog'], categoria: 'clima', elemento: 'humo', capa: 'pantalla', t: 4,
    opciones: { palette: tramo('humo', 8, 0, 1) }, gradacion: { tope: 0 }, relleno: [[-40, -150], [30, -100], [-20, -50], [0, 0]],
    notas: 'La niebla de pixelfx son bancos en una franja baja (de perfil); acá se repite en cuatro alturas desfasadas para cubrir la pantalla isométrica.',
    uso: [
      { tipo: 'clima', actos: [1], zonas: ['a1_cementerio'], nota: 'las zonas con niebla (actos.ts: niebla)' },
      { tipo: 'clima', actos: [3, 6], zonas: ['a3_pantano', 'a6_costa', 'a6_barrio1', 'a6_barrio2'] },
    ],
  },
  {
    id: 'fx_rayos_luz', origen: 'weather/god-rays', nombre: ['Rayos de luz', 'God rays'], categoria: 'clima', elemento: 'sagrado', capa: 'pantalla',
    opciones: { palette: rampa('sagrado', 7) },
    uso: [
      { tipo: 'clima', actos: [1], zonas: ['a1_abadia1', 'a1_abadia2'], nota: 'luz que entra por los vitrales de la abadía' },
      { tipo: 'clima', actos: [7], zonas: ['a7_campamento', 'a7_jardin'] },
      { tipo: 'cinematica', nota: 'la luz en la nave de la catedral' },
    ],
  },
  {
    id: 'fx_nieve', origen: 'weather/snow', nombre: ['Nieve', 'Snow'], categoria: 'clima', elemento: 'hielo', capa: 'pantalla',
    opciones: { palette: rampa('hielo', 8) }, gradacion: { tope: 0.3 },
    uso: [{ tipo: 'clima', actos: [4], zonas: ['a4_fortin', 'a4_picos', 'a4_glaciar'], nota: 'las zonas con nieve (actos.ts: nieve)' }],
  },
  {
    id: 'fx_tormenta', origen: 'weather/storm', nombre: ['Tormenta', 'Storm'], categoria: 'clima', elemento: 'rayo', capa: 'pantalla', t: 2,
    opciones: { palette: rampa('noche', 8), bolt: tramo('rayo', 6, 0.2, 1) }, luz: { intensidad: 0.7, radio: 360, altura: 200, prioridad: 2, sombra: true },
    uso: [
      { tipo: 'clima', actos: [1], zonas: ['a1_paramo', 'a1_refugio'], nota: 'lluvia con relámpagos; la luz es el destello del rayo' },
      { tipo: 'clima', actos: [6], zonas: ['a6_costa', 'a6_arrecife'] },
      { tipo: 'cinematica', nota: 'la tormenta sobre el barco varado' },
    ],
  },
  // ============================================================ botín
  {
    id: 'fx_cofre_abre', origen: 'pickups/chest-open', nombre: ['Cofre que se abre', 'Chest opening'], categoria: 'botin', elemento: 'oro',
    opciones: { palette: rampa('oro', 8), wood: tramo('madera', 7, 0, 1) }, cola: 0.02,
    uso: [{ tipo: 'botin', nota: 'cofre de tesoro que se abre y escupe oro (el cofre del catálogo se oculta mientras dura)' }],
  },
  {
    id: 'fx_moneda_gira', origen: 'pickups/coin-spin', nombre: ['Moneda que gira', 'Spinning coin'], categoria: 'botin', elemento: 'oro',
    opciones: { palette: rampa('oro', 8) },
    uso: [{ tipo: 'botin', nota: 'moneda de oro en el piso' }],
  },
  {
    id: 'fx_recoger', origen: 'pickups/collect-burst', nombre: ['Recoger', 'Pickup burst'], categoria: 'botin', elemento: 'oro',
    opciones: { palette: rampa('oro', 8) }, cola: 0.02,
    uso: [{ tipo: 'botin', nota: 'destello al levantar un objeto o una gema' }],
  },
  {
    id: 'fx_fragmento_reliquia', origen: 'pickups/crystal-shard', nombre: ['Fragmento de reliquia', 'Relic shard'], categoria: 'botin', elemento: 'brasa',
    opciones: { palette: rampa('brasa', 8) },
    uso: [
      { tipo: 'botin', nota: 'fragmento de la Brasa (objeto de misión) flotando en el piso' },
      { tipo: 'ambiente', zonas: ['a5_santuario2'], nota: 'el Corazón de la Brasa' },
    ],
  },
  {
    id: 'fx_gema_gira', origen: 'pickups/gem-spin', nombre: ['Gema que gira', 'Spinning gem'], categoria: 'botin', elemento: 'sangre',
    opciones: { palette: rampa('sangre', 8) },
    uso: [{ tipo: 'botin', nota: 'gema en el piso (rubí; otras gemas con la rampa de su color)' }],
  },
  {
    id: 'fx_llave', origen: 'pickups/key-glint', nombre: ['Llave', 'Key'], categoria: 'botin', elemento: 'acero',
    opciones: { palette: rampa('acero', 8) },
    uso: [{ tipo: 'botin', nota: 'llave de mazmorra o de cripta en el piso' }],
  },
  {
    id: 'fx_columna_botin', origen: 'pickups/loot-beam', nombre: ['Columna de botín', 'Loot beam'], categoria: 'botin', elemento: 'oro',
    opciones: { palette: rampa('oro', 8) },
    notas: 'Sin la espada del original: el juego dibuja el objeto caído. Para otras rarezas, repintar con otra rampa (sangre: único, alma: de conjunto).',
    uso: [{ tipo: 'botin', nota: 'columna de luz sobre un objeto raro o único caído' }],
  },
  {
    id: 'fx_pocion', origen: 'pickups/potion', nombre: ['Poción', 'Potion'], categoria: 'botin', elemento: 'sangre',
    opciones: { palette: tramo('sangre', 8, 0, 0.9) }, gradacion: { brillo: 0.85 },
    notas: 'Brebaje rojo oscuro y espeso (vida); para maná usar la rampa arcano.',
    uso: [{ tipo: 'botin', nota: 'poción de vida en el piso' }],
  },
  {
    id: 'fx_orbe_alma', origen: 'pickups/xp-orb', nombre: ['Orbe de alma', 'Soul orb'], categoria: 'botin', elemento: 'alma',
    opciones: { palette: rampa('alma', 8) },
    uso: [
      { tipo: 'botin', nota: 'el alma que suelta un enemigo y vuela al héroe (experiencia)' },
      { tipo: 'poder', clase: 'nigromante', habilidades: ['ofrenda'] },
    ],
  },
  // ============================================================ criaturas (más)
  {
    id: 'fx_cuervo', origen: 'critters/bird', nombre: ['Cuervo', 'Crow'], categoria: 'criaturas', elemento: 'noche',
    ancla: [0, 30], opciones: { palette: ['#030305', '#08080c', '#101016', '#1a1a22', '#262630', '#363644', '#4a4a5c'], breast: ['#050507', '#0c0c10', '#16161c', '#24242c'] },
    notas: 'Es el pájaro de pixelfx repintado de negro azulado: un cuervo.',
    uso: [
      { tipo: 'ambiente', zonas: ['a1_paramo', 'a1_bosque', 'a1_cementerio'], nota: 'cuervos sobre el Bosque de los Ahorcados' },
      { tipo: 'poder', clase: 'druida', habilidades: ['cuervos'], nota: 'la bandada del druida' },
      { tipo: 'cinematica', nota: 'cuervos que levantan vuelo' },
    ],
  },
  {
    id: 'fx_ojo_flotante', origen: 'critters/eyeball', nombre: ['Ojo flotante', 'Floating eye'], categoria: 'criaturas', elemento: 'carne',
    opciones: { palette: tramo('hueso', 6, 0.05, 0.85), flesh: tramo('carne', 5, 0, 0.75), iris: tramo('sangre', 5, 0.2, 1) }, gradacion: { brillo: 0.85 },
    uso: [
      { tipo: 'monstruo', monstruos: ['sin_rostro'], nota: 'los ojos que acompañan al Sin Rostro' },
      { tipo: 'ambiente', zonas: ['a5_abismo1', 'a5_abismo2'], nota: 'ojos que miran desde el Abismo de los Susurros' },
    ],
  },
  {
    id: 'fx_cardumen', origen: 'critters/fish-school', nombre: ['Cardumen', 'Fish school'], categoria: 'criaturas', elemento: 'agua',
    opciones: { palette: tramo('agua', 7, 0, 0.9), stripe: tramo('ceniza', 3, 0.2, 0.7) },
    notas: 'Visto desde arriba en 2:1 (los peces nadan hacia la dirección se, con su sombra en el fondo): agua honda vista desde la orilla o cinemáticas.',
    uso: [{ tipo: 'cinematica', nota: 'peces en la ciudad hundida y en la catedral ahogada (actos 3 y 6)' }],
  },
  {
    id: 'fx_calavera_voladora', origen: 'critters/flying-skull', nombre: ['Calavera en llamas', 'Flaming skull'], categoria: 'criaturas', elemento: 'fatuo',
    opciones: { palette: rampa('fatuo', 9), bone: tramo('hueso', 7, 0, 1) },
    uso: [
      { tipo: 'monstruo', monstruos: ['lich', 'dragon_oseo'], nota: 'calaveras que escupen los nigromantes enemigos' },
      { tipo: 'ambiente', zonas: ['a1_cata1', 'a1_cripta'], nota: 'calavera que ronda los osarios' },
    ],
  },
  {
    id: 'fx_espectro', origen: 'critters/ghost', nombre: ['Espectro', 'Wraith'], categoria: 'criaturas', elemento: 'alma',
    opciones: { palette: tramo('alma', 7, 0, 0.8) }, gradacion: { brillo: 0.8, sat: 0.6 }, opacidad: 0.6,
    notas: 'Reescrito: espectro con capucha en punta, hueco negro con dos brasas por cara, mangas que cuelgan y el ruedo en jirones; translúcido (60 %).',
    uso: [
      { tipo: 'ambiente', zonas: ['a1_cripta', 'a6_barrio2', 'a6_catedral1'], nota: 'ánimas que vagan' },
      { tipo: 'monstruo', monstruos: ['espectral'], nota: 'el modificador de élite espectral' },
    ],
  },
  {
    id: 'fx_serpiente', origen: 'critters/snake', nombre: ['Serpiente', 'Snake'], categoria: 'criaturas', elemento: 'naturaleza',
    opciones: { palette: tramo('naturaleza', 7, 0, 0.85), belly: tramo('hueso', 3, 0.2, 0.8) },
    uso: [{ tipo: 'ambiente', zonas: ['a2_dunas', 'a2_tumbas1', 'a3_selva', 'a3_templo1'], nota: 'serpientes en el desierto y en los templos' }],
  },
  {
    id: 'fx_baba', origen: 'critters/slime', nombre: ['Baba', 'Ooze'], categoria: 'criaturas', elemento: 'necro',
    opciones: { palette: tramo('necro', 7, 0, 0.75) }, gradacion: { brillo: 0.8, sat: 0.7 }, opacidad: 0.85,
    notas: 'Sin la cara del original: una baba que salta.',
    uso: [
      { tipo: 'ambiente', zonas: ['a1_cata1', 'a3_inundadas', 'a6_criptas'], nota: 'babas de cloaca y de cripta' },
      { tipo: 'muerte', nota: 'lo que queda de un hombre ciénaga' },
    ],
  },
  {
    id: 'fx_fuego_fatuo', origen: 'critters/wisp', nombre: ['Fuego fatuo', 'Will-o-wisp'], categoria: 'criaturas', elemento: 'fatuo',
    opciones: { palette: rampa('fatuo', 7) },
    notas: 'Sin la carita del original.',
    uso: [
      { tipo: 'ambiente', zonas: ['a3_pantano', 'a1_cementerio', 'a6_criptas'], nota: 'luces que llevan al pantano' },
      { tipo: 'poder', clase: 'cazadora', habilidades: ['espiritu_guardian'] },
    ],
  },
  {
    id: 'fx_sapo', origen: 'critters/frog', nombre: ['Sapo', 'Toad'], categoria: 'criaturas', elemento: 'naturaleza',
    opciones: { palette: tramo('naturaleza', 7, 0, 0.75), belly: tramo('hueso', 3, 0.2, 0.7) },
    uso: [{ tipo: 'ambiente', zonas: ['a3_pantano', 'a3_selva', 'a1_paramo'], nota: 'sapos de la ciénaga' }],
  },
  {
    id: 'fx_medusa', origen: 'critters/jellyfish', nombre: ['Medusa de las criptas', 'Crypt jelly'], categoria: 'criaturas', elemento: 'alma',
    ancla: [0, 40], opciones: { palette: rampa('alma', 8), glow: tramo('sombra', 4, 0.3, 1) },
    uso: [
      { tipo: 'ambiente', zonas: ['a6_criptas', 'a6_criptas2', 'a6_catedral1', 'a3_hundida2'], nota: 'medusas que flotan en el aire de las criptas inundadas' },
      { tipo: 'cinematica', nota: 'bajo el agua en la catedral ahogada' },
    ],
  },
  // ============================================================ transiciones
  {
    id: 'fx_trans_quemar', origen: 'transitions/burn-away', nombre: ['Quemar la pantalla', 'Burn away'], categoria: 'transiciones', elemento: 'fuego', capa: 'pantalla',
    opciones: { palette: rampa('fuego', 9), color: '#050405' },
    uso: [{ tipo: 'cinematica', nota: 'paso a negro quemándose: entrada al infierno (acto 5), muerte del héroe' }],
  },
  {
    id: 'fx_trans_vidrio', origen: 'transitions/shatter-wipe', nombre: ['Vidrio que estalla', 'Shatter wipe'], categoria: 'transiciones', elemento: 'acero', capa: 'pantalla',
    opciones: { palette: rampa('acero', 8), color: '#050405' },
    uso: [{ tipo: 'cinematica', nota: 'el vitral que estalla: entrada a la catedral ahogada o al cielo de vidrio (acto 7)' }],
  },
  {
    id: 'fx_trans_tajo', origen: 'transitions/slash-wipe', nombre: ['Tajo que corta', 'Slash wipe'], categoria: 'transiciones', elemento: 'acero', capa: 'pantalla',
    opciones: { palette: rampa('acero', 8), sparks: CHISPAS(), color: '#050405' },
    uso: [{ tipo: 'cinematica', nota: 'corte a la pelea de jefe' }],
  },
  {
    id: 'fx_trans_ceniza', origen: 'transitions/pixel-dissolve', nombre: ['Disolver en ceniza', 'Ash dissolve'], categoria: 'transiciones', elemento: 'ceniza', capa: 'pantalla',
    opciones: { palette: rampa('brasa', 8), color: '#050405' },
    uso: [{ tipo: 'cinematica', nota: 'paso entre planos de cinemática: la imagen se deshace en bloques de ceniza' }],
  },
  {
    id: 'fx_trans_iris', origen: 'transitions/iris', nombre: ['Iris', 'Iris'], categoria: 'transiciones', elemento: 'sagrado', capa: 'pantalla',
    opciones: { palette: rampa('sagrado', 8), color: '#050405' },
    uso: [{ tipo: 'cinematica', nota: 'cierre en círculo sobre el héroe al terminar un acto' }],
  },
];
