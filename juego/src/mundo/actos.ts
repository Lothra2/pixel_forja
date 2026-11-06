// Los cinco actos: zonas, cómo se unen, misiones y la historia que se cuenta en cada una.
import type { DefZona } from './zona';

const Z = (d: DefZona) => d;
export const ZONAS: Record<string, DefZona> = Object.fromEntries([
  // ============================================================== ACTO 1
  Z({ id: 'a1_refugio', nombre: ['El Refugio de los Cenicientos', 'The Ashen Refuge'], acto: 1, nivel: 1, tipo: 'pueblo', tema: 'paramo', tam: [14, 14], piedraViaje: true, lluvia: true,
    salidas: [{ destino: 'a1_paramo', entrada: 'o', lado: 'e', nombre: ['Páramo de Velmora', 'Velmora Moor'] }] }),
  Z({ id: 'a1_paramo', nombre: ['Páramo de Velmora', 'Velmora Moor'], acto: 1, nivel: 2, tipo: 'exterior', tema: 'paramo', tam: [26, 26], rio: 'arroyo', extra: [{ t: ['paramo'], p: ['par_horca', 'par_picota', 'par_cabezas_picas', 'par_caravana', 'par_circulo'] }], piedraViaje: true, lluvia: true, niebla: 0.25,
    salidas: [{ destino: 'a1_refugio', entrada: 'e', lado: 'o', nombre: ['El Refugio', 'The Refuge'] }, { destino: 'a1_cementerio', entrada: 'o', lado: 'e', nombre: ['Camposanto de Santa Oria', 'Santa Oria Churchyard'] }, { destino: 'a1_bosque', entrada: 's', lado: 'n', nombre: ['Bosque de los Ahorcados', 'Hanged Men\'s Wood'] }, { destino: 'a1_guarida', entrada: 'arriba', lado: 'abajo', nombre: ['La Guarida del Hambre', 'The Hunger Den'] }, { destino: 'a1_pastor', entrada: 'arriba', lado: 'abajo', nombre: ['Cueva del Pastor', 'Shepherd\'s Cave'] }] }),
  Z({ id: 'a1_guarida', nombre: ['La Guarida del Hambre', 'The Hunger Den'], acto: 1, nivel: 3, tipo: 'mazmorra', tema: 'cueva', tam: [16, 16], jefe: 'arana_reina',
    salidas: [{ destino: 'a1_paramo', entrada: 'salida_a1_guarida', lado: 'arriba', nombre: ['Páramo de Velmora', 'Velmora Moor'] }] }),
  Z({ id: 'a1_pastor', nombre: ['Cueva del Pastor', 'Shepherd\'s Cave'], acto: 1, nivel: 4, tipo: 'mazmorra', tema: 'cueva', tam: [16, 16], jefe: 'ogro', lateral: true,
    salidas: [{ destino: 'a1_paramo', entrada: 'salida_a1_pastor', lado: 'arriba', nombre: ['Páramo de Velmora', 'Velmora Moor'] }] }),
  Z({ id: 'a1_bosque', nombre: ['El Bosque de los Ahorcados', 'Hanged Men\'s Wood'], acto: 1, nivel: 4, tipo: 'exterior', tema: 'paramo', tam: [24, 24], extra: [{ t: ['paramo'], p: ['par_arbol_ahorcados', 'par_horca', 'par_jaula_colgante', 'par_rueda_tortura', 'par_hoguera', 'par_cuervos', 'par_totem_huesos'] }], niebla: 0.55, lluvia: true, vinetas: ['bosque', 'bosque', 'cementerio'], densidad: 1.3,
    salidas: [{ destino: 'a1_paramo', entrada: 'n', lado: 's', nombre: ['Páramo de Velmora', 'Velmora Moor'] }, { destino: 'a1_mina1', entrada: 'arriba', lado: 'abajo', nombre: ['Mina de Velmora', 'Velmora Mine'] }] }),
  Z({ id: 'a1_mina1', nombre: ['Mina de Velmora: las Galerías', 'Velmora Mine: the Galleries'], acto: 1, nivel: 6, tipo: 'mazmorra', tema: 'mina', tam: [20, 20], piedraViaje: true,
    salidas: [{ destino: 'a1_bosque', entrada: 'salida_a1_mina1', lado: 'arriba', nombre: ['Bosque de los Ahorcados', 'Hanged Men\'s Wood'] }, { destino: 'a1_mina2', entrada: 'arriba', lado: 'abajo', nombre: ['El Pozo Profundo', 'The Deep Shaft'] }] }),
  Z({ id: 'a1_mina2', nombre: ['Mina de Velmora: el Pozo Profundo', 'Velmora Mine: the Deep Shaft'], acto: 1, nivel: 8, tipo: 'mazmorra', tema: 'mina', tam: [18, 18], jefe: 'carcelero', lateral: true, oscuridad: 0.86,
    salidas: [{ destino: 'a1_mina1', entrada: 'abajo', lado: 'arriba', nombre: ['Las Galerías', 'The Galleries'] }] }),
  Z({ id: 'a1_cementerio', nombre: ['Camposanto de Santa Oria', 'Santa Oria Churchyard'], acto: 1, nivel: 5, tipo: 'exterior', tema: 'cementerio', tam: [28, 28], piedraViaje: true, niebla: 0.45,
    ancla: { marco: true, piezas: [['abo_catedral_cabecera', 0, -9], ['abo_catedral_nave', 0, 0], ['abo_catedral_fachada', 0, 7]], puerta: [0, 8], salida: 'a1_abadia1', sello: 'm1_campanas', herida: 'm1_abadesa',
      cerca: [{ t: ['cementerio'], p: ['abo_arbol_muerto', 'abo_lapidas', 'abo_farol_rojo'] }, { t: ['cementerio'], p: ['abo_muro_camposanto'], v: (v) => !/_y$/.test(v) }] },
    salidas: [{ destino: 'a1_paramo', entrada: 'e', lado: 'o', nombre: ['Páramo de Velmora', 'Velmora Moor'] }, { destino: 'a1_abadia1', entrada: 'arriba', lado: 'abajo', nombre: ['Abadía de Santa Oria', 'Abbey of Santa Oria'] }, { destino: 'a1_cripta', entrada: 'arriba', lado: 'abajo', nombre: ['Cripta de los Olvidados', 'Crypt of the Forgotten'] }] }),
  Z({ id: 'a1_cripta', nombre: ['La Cripta de los Olvidados', 'Crypt of the Forgotten'], acto: 1, nivel: 7, tipo: 'mazmorra', tema: 'cripta', tam: [18, 18], jefe: 'aparecida', lateral: true,
    salidas: [{ destino: 'a1_cementerio', entrada: 'salida_a1_cripta', lado: 'arriba', nombre: ['Camposanto', 'Churchyard'] }] }),
  Z({ id: 'a1_abadia1', nombre: ['Abadía: la Nave del Silencio', 'Abbey: the Nave of Silence'], acto: 1, nivel: 7, tipo: 'mazmorra', tema: 'abadia', tam: [20, 20], piedraViaje: true,
    salidas: [{ destino: 'a1_cementerio', entrada: 'salida_a1_abadia1', lado: 'arriba', nombre: ['Camposanto', 'Churchyard'] }, { destino: 'a1_abadia2', entrada: 'arriba', lado: 'abajo', nombre: ['Claustro profanado', 'Defiled Cloister'] }] }),
  Z({ id: 'a1_abadia2', nombre: ['Abadía: el Claustro Profanado', 'Abbey: the Defiled Cloister'], acto: 1, nivel: 9, tipo: 'mazmorra', tema: 'abadia', tam: [20, 20],
    salidas: [{ destino: 'a1_abadia1', entrada: 'abajo', lado: 'arriba', nombre: ['La Nave', 'The Nave'] }, { destino: 'a1_cata1', entrada: 'arriba', lado: 'abajo', nombre: ['Catacumbas', 'Catacombs'] }] }),
  Z({ id: 'a1_cata1', nombre: ['Catacumbas: los Osarios', 'Catacombs: the Ossuaries'], acto: 1, nivel: 11, tipo: 'mazmorra', tema: 'catacumbas', tam: [22, 22], piedraViaje: true, jefe: 'verdugo',
    salidas: [{ destino: 'a1_abadia2', entrada: 'abajo', lado: 'arriba', nombre: ['Claustro', 'Cloister'] }, { destino: 'a1_pozo', entrada: 'arriba', lado: 'abajo', nombre: ['El Pozo de la Brasa', 'The Ember Well'] }] }),
  Z({ id: 'a1_pozo', nombre: ['El Pozo de la Brasa', 'The Ember Well'], acto: 1, nivel: 13, tipo: 'mazmorra', tema: 'catacumbas', tam: [16, 16], jefe: 'abadesa', oscuridad: 0.86,
    salidas: [{ destino: 'a1_cata1', entrada: 'abajo', lado: 'arriba', nombre: ['Osarios', 'Ossuaries'] }] }),
  // ============================================================== ACTO 2
  Z({ id: 'a2_oasis', nombre: ['El Oasis de Qadir', 'The Oasis of Qadir'], acto: 2, nivel: 14, tipo: 'pueblo', tema: 'desierto', tam: [14, 14], piedraViaje: true,
    salidas: [{ destino: 'a2_dunas', entrada: 'n', lado: 's', nombre: ['Dunas de Sahrim', 'Sahrim Dunes'] }] }),
  Z({ id: 'a2_dunas', nombre: ['Las Dunas de Sahrim', 'The Sahrim Dunes'], acto: 2, nivel: 15, tipo: 'exterior', tema: 'desierto', tam: [28, 28], extra: [{ t: ['desierto'], p: ['des2_duna', 'des2_arenas_movedizas', 'des2_remolino', 'des2_osamenta', 'des2_caravana'] }], piedraViaje: true,
    salidas: [{ destino: 'a2_oasis', entrada: 's', lado: 'n', nombre: ['El Oasis', 'The Oasis'] }, { destino: 'a2_oasis_muerto', entrada: 'o', lado: 'e', nombre: ['El Oasis Muerto', 'The Dead Oasis'] }, { destino: 'a2_escarabajos', entrada: 'arriba', lado: 'abajo', nombre: ['Cueva de los Escarabajos', 'Scarab Cave'] }] }),
  Z({ id: 'a2_escarabajos', nombre: ['La Cueva de los Escarabajos', 'The Scarab Cave'], acto: 2, nivel: 16, tipo: 'mazmorra', tema: 'cueva', tam: [18, 18], jefe: 'escorpion_gigante', lateral: true,
    salidas: [{ destino: 'a2_dunas', entrada: 'salida_a2_escarabajos', lado: 'arriba', nombre: ['Dunas', 'Dunes'] }] }),
  Z({ id: 'a2_oasis_muerto', nombre: ['El Oasis Muerto', 'The Dead Oasis'], acto: 2, nivel: 17, tipo: 'exterior', tema: 'desierto', tam: [24, 24], extra: [{ t: ['desierto'], p: ['des2_oasis', 'des2_palmera', 'des2_camello_muerto', 'des2_buitres', 'des2_pozo_seco'] }], piedraViaje: true, jefe: 'gusano_de_arena',
    salidas: [{ destino: 'a2_dunas', entrada: 'e', lado: 'o', nombre: ['Dunas', 'Dunes'] }, { destino: 'a2_ruinas', entrada: 'o', lado: 'e', nombre: ['Ruinas del Sol', 'Ruins of the Sun'] }, { destino: 'a2_nombres1', entrada: 'arriba', lado: 'abajo', nombre: ['El Pozo de los Nombres', 'The Well of Names'] }] }),
  Z({ id: 'a2_nombres1', nombre: ['El Pozo de los Nombres', 'The Well of Names'], acto: 2, nivel: 18, tipo: 'mazmorra', tema: 'tumba', tam: [18, 18],
    salidas: [{ destino: 'a2_oasis_muerto', entrada: 'salida_a2_nombres1', lado: 'arriba', nombre: ['El Oasis Muerto', 'The Dead Oasis'] }, { destino: 'a2_nombres2', entrada: 'arriba', lado: 'abajo', nombre: ['Los Nombres Borrados', 'The Erased Names'] }] }),
  Z({ id: 'a2_nombres2', nombre: ['El Pozo: los Nombres Borrados', 'The Well: the Erased Names'], acto: 2, nivel: 19, tipo: 'mazmorra', tema: 'tumba', tam: [16, 16], jefe: 'momia', lateral: true, oscuridad: 0.84,
    salidas: [{ destino: 'a2_nombres1', entrada: 'abajo', lado: 'arriba', nombre: ['El Pozo', 'The Well'] }] }),
  Z({ id: 'a2_ruinas', nombre: ['Las Ruinas del Sol', 'The Ruins of the Sun'], acto: 2, nivel: 18, tipo: 'exterior', tema: 'desierto', tam: [24, 24], extra: [{ t: ['desierto'], p: ['des2_esfinge', 'des2_estatua_caida', 'des2_obelisco', 'des2_columnas', 'des2_muro', 'des2_sarcofago', 'des2_estela'] }], piedraViaje: true, vinetas: ['tumba', 'desierto', 'tumba'],
    salidas: [{ destino: 'a2_oasis_muerto', entrada: 'e', lado: 'o', nombre: ['El Oasis Muerto', 'The Dead Oasis'] }, { destino: 'a2_tumbas1', entrada: 'arriba', lado: 'abajo', nombre: ['Tumbas de los Reyes', 'Tombs of the Kings'] }, { destino: 'a2_sol', entrada: 'arriba', lado: 'abajo', nombre: ['Templo del Sol Caído', 'Temple of the Fallen Sun'] }] }),
  Z({ id: 'a2_sol', nombre: ['El Templo del Sol Caído', 'Temple of the Fallen Sun'], acto: 2, nivel: 20, tipo: 'mazmorra', tema: 'tumba', tam: [18, 18], jefe: 'sacerdote_caido', lateral: true,
    salidas: [{ destino: 'a2_ruinas', entrada: 'salida_a2_sol', lado: 'arriba', nombre: ['Ruinas del Sol', 'Ruins of the Sun'] }] }),
  Z({ id: 'a2_tumbas1', nombre: ['Tumbas: la Galería de los Dormidos', 'Tombs: Gallery of the Sleepers'], acto: 2, nivel: 19, tipo: 'mazmorra', tema: 'tumba', tam: [22, 22], piedraViaje: true,
    salidas: [{ destino: 'a2_ruinas', entrada: 'salida_a2_tumbas1', lado: 'arriba', nombre: ['Ruinas del Sol', 'Ruins of the Sun'] }, { destino: 'a2_tumbas2', entrada: 'arriba', lado: 'abajo', nombre: ['Cámara del Rey', 'King\'s Chamber'] }] }),
  Z({ id: 'a2_tumbas2', nombre: ['La Cámara del Rey sin Sombra', 'Chamber of the Shadowless King'], acto: 2, nivel: 21, tipo: 'mazmorra', tema: 'tumba', tam: [18, 18], jefe: 'rey_sin_sombra',
    salidas: [{ destino: 'a2_tumbas1', entrada: 'abajo', lado: 'arriba', nombre: ['Galería', 'Gallery'] }] }),
  // ============================================================== ACTO 3
  Z({ id: 'a3_muelle', nombre: ['El Muelle de Kesh', 'Kesh Landing'], acto: 3, nivel: 22, tipo: 'pueblo', tema: 'selva', tam: [14, 14], piedraViaje: true, lluvia: true,
    salidas: [{ destino: 'a3_selva', entrada: 'o', lado: 'e', nombre: ['Selva de Yhuantl', 'Yhuantl Jungle'] }] }),
  Z({ id: 'a3_selva', nombre: ['La Selva de Yhuantl', 'The Yhuantl Jungle'], acto: 3, nivel: 23, tipo: 'exterior', tema: 'selva', tam: [26, 26], extra: [{ t: ['selva'], p: ['sel2_cascada', 'sel2_idolo', 'sel2_cabeza_colosal', 'sel2_lianas', 'sel2_arbol_gigante', 'sel2_flor_carnivora'] }], piedraViaje: true, lluvia: true, niebla: 0.3,
    salidas: [{ destino: 'a3_muelle', entrada: 'e', lado: 'o', nombre: ['El Muelle', 'The Landing'] }, { destino: 'a3_pantano', entrada: 'n', lado: 's', nombre: ['El Manglar Negro', 'The Black Mangrove'] }, { destino: 'a3_inundadas', entrada: 'arriba', lado: 'abajo', nombre: ['Cavernas Inundadas', 'Flooded Caverns'] }, { destino: 'a3_nido', entrada: 'arriba', lado: 'abajo', nombre: ['Nido de la Araña', 'Spider\'s Nest'] }] }),
  Z({ id: 'a3_inundadas', nombre: ['Las Cavernas Inundadas', 'The Flooded Caverns'], acto: 3, nivel: 24, tipo: 'mazmorra', tema: 'cueva', tam: [20, 20], jefe: 'trol_pantano', lateral: true,
    salidas: [{ destino: 'a3_selva', entrada: 'salida_a3_inundadas', lado: 'arriba', nombre: ['Selva', 'Jungle'] }] }),
  Z({ id: 'a3_nido', nombre: ['El Nido de la Araña', 'The Spider\'s Nest'], acto: 3, nivel: 25, tipo: 'mazmorra', tema: 'cueva', tam: [18, 18], jefe: 'arana_reina', lateral: true, oscuridad: 0.86,
    salidas: [{ destino: 'a3_selva', entrada: 'salida_a3_nido', lado: 'arriba', nombre: ['Selva', 'Jungle'] }] }),
  Z({ id: 'a3_pantano', nombre: ['El Manglar Negro', 'The Black Mangrove'], acto: 3, nivel: 25, tipo: 'exterior', tema: 'selva', tam: [24, 24], extra: [{ t: ['selva'], p: ['sel2_manglar', 'sel2_charca', 'sel2_barca', 'sel2_choza', 'sel2_ranas', 'sel2_puente_colgante'] }], piedraViaje: true, niebla: 0.5, jefe: 'bruja',
    salidas: [{ destino: 'a3_selva', entrada: 's', lado: 'n', nombre: ['Selva', 'Jungle'] }, { destino: 'a3_templo1', entrada: 'arriba', lado: 'abajo', nombre: ['Templo de Yhuantl', 'Temple of Yhuantl'] }, { destino: 'a3_hundida1', entrada: 'arriba', lado: 'abajo', nombre: ['La Ciudad Hundida', 'The Sunken City'] }] }),
  Z({ id: 'a3_hundida1', nombre: ['La Ciudad Hundida: las Calles', 'The Sunken City: the Streets'], acto: 3, nivel: 26, tipo: 'mazmorra', tema: 'templo', tam: [22, 22], piedraViaje: true,
    salidas: [{ destino: 'a3_pantano', entrada: 'salida_a3_hundida1', lado: 'arriba', nombre: ['Manglar', 'Mangrove'] }, { destino: 'a3_hundida2', entrada: 'arriba', lado: 'abajo', nombre: ['El Palacio Ahogado', 'The Drowned Palace'] }] }),
  Z({ id: 'a3_hundida2', nombre: ['La Ciudad Hundida: el Palacio Ahogado', 'The Sunken City: the Drowned Palace'], acto: 3, nivel: 28, tipo: 'mazmorra', tema: 'templo', tam: [18, 18], jefe: 'hechicera_sangre', lateral: true,
    salidas: [{ destino: 'a3_hundida1', entrada: 'abajo', lado: 'arriba', nombre: ['Las Calles', 'The Streets'] }] }),
  Z({ id: 'a3_templo1', nombre: ['Templo: los Escalones Hundidos', 'Temple: the Sunken Steps'], acto: 3, nivel: 27, tipo: 'mazmorra', tema: 'templo', tam: [22, 22], piedraViaje: true,
    salidas: [{ destino: 'a3_pantano', entrada: 'salida_a3_templo1', lado: 'arriba', nombre: ['Manglar', 'Mangrove'] }, { destino: 'a3_templo2', entrada: 'arriba', lado: 'abajo', nombre: ['El Vientre', 'The Womb'] }] }),
  Z({ id: 'a3_templo2', nombre: ['Templo: el Vientre de la Madre', 'Temple: the Mother\'s Womb'], acto: 3, nivel: 29, tipo: 'mazmorra', tema: 'templo', tam: [18, 18], jefe: 'madre_cienaga',
    salidas: [{ destino: 'a3_templo1', entrada: 'abajo', lado: 'arriba', nombre: ['Escalones', 'Steps'] }] }),
  // ============================================================== ACTO 4
  Z({ id: 'a4_fortin', nombre: ['El Fortín de Vel', 'Vel Fort'], acto: 4, nivel: 30, tipo: 'pueblo', tema: 'nieve', tam: [14, 14], piedraViaje: true, nieve: true, amurallado: true,
    salidas: [{ destino: 'a4_picos', entrada: 's', lado: 'n', nombre: ['Picos de Hrimgard', 'Hrimgard Peaks'] }] }),
  Z({ id: 'a4_picos', nombre: ['Los Picos de Hrimgard', 'The Hrimgard Peaks'], acto: 4, nivel: 31, tipo: 'exterior', tema: 'nieve', tam: [26, 26], piedraViaje: true, nieve: true, niebla: 0.35,
    salidas: [{ destino: 'a4_fortin', entrada: 'n', lado: 's', nombre: ['El Fortín', 'The Fort'] }, { destino: 'a4_glaciar', entrada: 'o', lado: 'e', nombre: ['El Paso del Glaciar', 'The Glacier Pass'] }, { destino: 'a4_minas1', entrada: 'arriba', lado: 'abajo', nombre: ['Minas de los Gigantes', 'Giants\' Mines'] }] }),
  Z({ id: 'a4_minas1', nombre: ['Minas de los Gigantes: los Socavones', 'Giants\' Mines: the Adits'], acto: 4, nivel: 32, tipo: 'mazmorra', tema: 'mina', tam: [20, 20],
    salidas: [{ destino: 'a4_picos', entrada: 'salida_a4_minas1', lado: 'arriba', nombre: ['Picos', 'Peaks'] }, { destino: 'a4_minas2', entrada: 'arriba', lado: 'abajo', nombre: ['La Veta Madre', 'The Mother Lode'] }] }),
  Z({ id: 'a4_minas2', nombre: ['Minas de los Gigantes: la Veta Madre', 'Giants\' Mines: the Mother Lode'], acto: 4, nivel: 33, tipo: 'mazmorra', tema: 'mina', tam: [18, 18], jefe: 'gigante_helado', lateral: true,
    salidas: [{ destino: 'a4_minas1', entrada: 'abajo', lado: 'arriba', nombre: ['Los Socavones', 'The Adits'] }] }),
  Z({ id: 'a4_glaciar', nombre: ['El Paso del Glaciar', 'The Glacier Pass'], acto: 4, nivel: 32, tipo: 'exterior', tema: 'nieve', tam: [24, 24], piedraViaje: true, nieve: true, niebla: 0.5,
    salidas: [{ destino: 'a4_picos', entrada: 'e', lado: 'o', nombre: ['Picos', 'Peaks'] }, { destino: 'a4_hielo1', entrada: 'arriba', lado: 'abajo', nombre: ['Cuevas de Hielo', 'Ice Caves'] }, { destino: 'a4_barbaro', entrada: 'arriba', lado: 'abajo', nombre: ['Cripta del Rey Bárbaro', 'Crypt of the Barbarian King'] }, { destino: 'a4_grieta', entrada: 'arriba', lado: 'abajo', nombre: ['La Grieta Glaciar', 'The Glacial Rift'] }] }),
  Z({ id: 'a4_barbaro', nombre: ['La Cripta del Rey Bárbaro', 'Crypt of the Barbarian King'], acto: 4, nivel: 33, tipo: 'mazmorra', tema: 'cripta', tam: [18, 18], jefe: 'caballero_muerto', lateral: true,
    salidas: [{ destino: 'a4_glaciar', entrada: 'salida_a4_barbaro', lado: 'arriba', nombre: ['Paso del Glaciar', 'Glacier Pass'] }] }),
  Z({ id: 'a4_grieta', nombre: ['La Grieta Glaciar', 'The Glacial Rift'], acto: 4, nivel: 34, tipo: 'mazmorra', tema: 'hielo', tam: [18, 18], jefe: 'caballero_espectral', lateral: true,
    salidas: [{ destino: 'a4_glaciar', entrada: 'salida_a4_grieta', lado: 'arriba', nombre: ['Paso del Glaciar', 'Glacier Pass'] }] }),
  Z({ id: 'a4_hielo1', nombre: ['Las Cuevas del Aliento Helado', 'Caves of the Frozen Breath'], acto: 4, nivel: 33, tipo: 'mazmorra', tema: 'hielo', tam: [22, 22], piedraViaje: true,
    salidas: [{ destino: 'a4_glaciar', entrada: 'salida_a4_hielo1', lado: 'arriba', nombre: ['Paso del Glaciar', 'Glacier Pass'] }, { destino: 'a4_hielo2', entrada: 'arriba', lado: 'abajo', nombre: ['El Trono Helado', 'The Frozen Throne'] }] }),
  Z({ id: 'a4_hielo2', nombre: ['El Trono de Hjaldur', 'Hjaldur\'s Throne'], acto: 4, nivel: 35, tipo: 'mazmorra', tema: 'hielo', tam: [18, 18], jefe: 'rey_escarcha',
    salidas: [{ destino: 'a4_hielo1', entrada: 'abajo', lado: 'arriba', nombre: ['Cuevas', 'Caves'] }] }),
  // ============================================================== ACTO 5
  Z({ id: 'a5_bastion', nombre: ['El Bastión del Último Coro', 'Bastion of the Last Choir'], acto: 5, nivel: 36, tipo: 'pueblo', tema: 'infierno', tam: [14, 14], piedraViaje: true, ceniza: true, amurallado: true,
    salidas: [{ destino: 'a5_llanuras', entrada: 'o', lado: 'e', nombre: ['Llanuras de Ceniza', 'Ash Plains'] }] }),
  Z({ id: 'a5_llanuras', nombre: ['Las Llanuras de Ceniza', 'The Ash Plains'], acto: 5, nivel: 38, tipo: 'exterior', tema: 'infierno', tam: [26, 26], piedraViaje: true, ceniza: true,
    salidas: [{ destino: 'a5_bastion', entrada: 'e', lado: 'o', nombre: ['El Bastión', 'The Bastion'] }, { destino: 'a5_rio', entrada: 'o', lado: 'e', nombre: ['El Río de Lava', 'The Lava River'] }, { destino: 'a5_abismo1', entrada: 'arriba', lado: 'abajo', nombre: ['El Abismo de los Susurros', 'The Abyss of Whispers'] }] }),
  Z({ id: 'a5_abismo1', nombre: ['El Abismo de los Susurros', 'The Abyss of Whispers'], acto: 5, nivel: 39, tipo: 'mazmorra', tema: 'abismo', tam: [20, 20], oscuridad: 0.9,
    salidas: [{ destino: 'a5_llanuras', entrada: 'salida_a5_abismo1', lado: 'arriba', nombre: ['Llanuras', 'Plains'] }, { destino: 'a5_abismo2', entrada: 'arriba', lado: 'abajo', nombre: ['Las Islas sobre la Nada', 'The Isles over Nothing'] }] }),
  Z({ id: 'a5_abismo2', nombre: ['El Abismo: las Islas sobre la Nada', 'The Abyss: Isles over Nothing'], acto: 5, nivel: 40, tipo: 'mazmorra', tema: 'abismo', tam: [18, 18], jefe: 'caballero_abismo', lateral: true, oscuridad: 0.92,
    salidas: [{ destino: 'a5_abismo1', entrada: 'abajo', lado: 'arriba', nombre: ['Los Susurros', 'The Whispers'] }] }),
  Z({ id: 'a5_rio', nombre: ['El Río de Lava', 'The Lava River'], acto: 5, nivel: 40, tipo: 'exterior', tema: 'infierno', tam: [24, 24], piedraViaje: true, ceniza: true, densidad: 1.2, rio: true,
    salidas: [{ destino: 'a5_llanuras', entrada: 'e', lado: 'o', nombre: ['Llanuras', 'Plains'] }, { destino: 'a5_santuario1', entrada: 'arriba', lado: 'abajo', nombre: ['La Herida', 'The Wound'] }, { destino: 'a5_fragua', entrada: 'arriba', lado: 'abajo', nombre: ['La Fragua de Ozmaren', 'Ozmaren\'s Forge'] }] }),
  Z({ id: 'a5_fragua', nombre: ['La Fragua de Ozmaren', 'Ozmaren\'s Forge'], acto: 5, nivel: 42, tipo: 'mazmorra', tema: 'santuario', tam: [18, 18], jefe: 'segador', lateral: true, ceniza: true,
    salidas: [{ destino: 'a5_rio', entrada: 'salida_a5_fragua', lado: 'arriba', nombre: ['Río de Lava', 'Lava River'] }] }),
  Z({ id: 'a5_santuario1', nombre: ['La Herida: la Garganta', 'The Wound: the Throat'], acto: 5, nivel: 41, tipo: 'mazmorra', tema: 'santuario', tam: [22, 22], piedraViaje: true, ceniza: true, jefe: 'dragon_oseo',
    salidas: [{ destino: 'a5_rio', entrada: 'salida_a5_santuario1', lado: 'arriba', nombre: ['Río de Lava', 'Lava River'] }, { destino: 'a5_santuario2', entrada: 'arriba', lado: 'abajo', nombre: ['El Corazón de la Brasa', 'The Ember Heart'] }] }),
  Z({ id: 'a5_santuario2', nombre: ['El Corazón de la Brasa', 'The Ember Heart'], acto: 5, nivel: 44, tipo: 'mazmorra', tema: 'santuario', tam: [18, 18], jefe: 'senor_demonio', ceniza: true,
    salidas: [{ destino: 'a5_santuario1', entrada: 'abajo', lado: 'arriba', nombre: ['La Garganta', 'The Throat'] }] }),
].map((z) => [z.id, z]));

/** Monstruos por zona (claves de POBLACION en datos/monstruos). */
export const POBL_ZONA: Record<string, string> = {
  a1_paramo: 'paramo', a1_guarida: 'cueva_hambre', a1_pastor: 'cueva_hambre', a1_bosque: 'paramo', a1_mina1: 'catacumbas1', a1_mina2: 'catacumbas1',
  a1_cementerio: 'cementerio', a1_cripta: 'catacumbas1', a1_abadia1: 'abadia1', a1_abadia2: 'abadia2', a1_cata1: 'catacumbas1', a1_pozo: 'catacumbas2',
  a2_dunas: 'dunas', a2_escarabajos: 'oasis_muerto', a2_oasis_muerto: 'oasis_muerto', a2_nombres1: 'tumbas1', a2_nombres2: 'tumbas2', a2_ruinas: 'dunas', a2_sol: 'tumbas2', a2_tumbas1: 'tumbas1', a2_tumbas2: 'tumbas2',
  a3_selva: 'selva', a3_inundadas: 'pantano', a3_nido: 'templo1', a3_pantano: 'pantano', a3_hundida1: 'templo1', a3_hundida2: 'templo2', a3_templo1: 'templo1', a3_templo2: 'templo2',
  a4_picos: 'picos', a4_minas1: 'cuevas_hielo2', a4_minas2: 'cuevas_hielo2', a4_glaciar: 'picos', a4_barbaro: 'cuevas_hielo1', a4_grieta: 'cuevas_hielo1', a4_hielo1: 'cuevas_hielo1', a4_hielo2: 'cuevas_hielo2',
  a5_llanuras: 'llanuras_ceniza', a5_abismo1: 'santuario1', a5_abismo2: 'santuario2', a5_rio: 'llanuras_ceniza', a5_fragua: 'santuario1', a5_santuario1: 'santuario1', a5_santuario2: 'santuario2',
};
export const PUEBLO_DE: Record<number, string> = { 1: 'a1_refugio', 2: 'a2_oasis', 3: 'a3_muelle', 4: 'a4_fortin', 5: 'a5_bastion' };
export const MUSICA_ACTO = (acto: number, tipo: string) => (tipo === 'pueblo' ? `campamento${acto}` : tipo === 'mazmorra' ? (acto === 1 ? 'mazmorra' : `mazmorra${acto}`) : `acto${acto}`);

// ------------------------------------------------------------------ misiones
/** Una pista que se encuentra en el mapa: el objeto que se ve y lo que cuenta. */
export interface Pista { obj: string; v: string; texto: [string, string] }
export type Objetivo =
  | { tipo: 'matar'; zona: string; monstruo: string; nombreUnico?: [string, string] }
  | { tipo: 'llegar'; zona: string }
  /** Investigar: encontrar todas las pistas de la zona. */
  | { tipo: 'pistas'; zona: string; pistas: Pista[] }
  /** Ritual: recoger n reliquias y llevar cada una a un altar. Al encender el último despierta el guardián (opcional). */
  | { tipo: 'ritual'; zona: string; n: number; reliquia: [string, string]; altar: [string, string, string]; guardian?: string }
  /** Purgar: matar n monstruos en la zona antes de que se acabe el tiempo (segundos). */
  | { tipo: 'purgar'; zona: string; n: number; tiempo: number }
  /** Escoltar: alguien te sigue hasta el otro extremo de la zona; si cae, vuelves a empezar al entrar de nuevo. */
  | { tipo: 'escoltar'; zona: string; sprite: string; nombre: [string, string]; inicio: [string, string]; llegada: [string, string]; muerte: [string, string] ;
      /** Traición: a esta fracción del camino (0.55 por defecto) el escoltado se convierte en este monstruo único y hay que matarlo. */
      traicion?: { monstruo: string; nombre: [string, string]; frase: [string, string]; en?: number } }
  /** Cazar: un único con nombre que aparece en la zona mientras la misión está activa. */
  | { tipo: 'cazar'; zona: string; monstruo: string; nombre: [string, string]; frase?: [string, string] };
export interface Premio { /** Una legendaria fija con nombre (id de UNICOS). */ unico?: string; habilidad?: number; atributos?: number; vida?: number; oro?: number; objeto?: 'raro' | 'unico' | 'conjunto'; resistencia?: number; /** Una Lágrima del Olvido: reinicia habilidades y atributos. */ olvido?: boolean }
export interface OpcionMision { texto: [string, string]; hecho: [string, string]; premio: Premio;
  /** Decisión de la cadena principal que se guarda en el héroe (clave y valor), y que cambia gente, jefes y final. */
  decision?: [string, string] }
export type FinalElegido = 'destruir' | 'absorber';
export interface Mision {
  id: string; acto: number; nombre: [string, string];
  /** Lo que pide el que da la misión y lo que dice cuando vuelves. */
  pedido: [string, string]; hecho: [string, string];
  objetivo: Objetivo;
  /** Lo que dicen otros en el pueblo cuando la terminas (solo en el acto de la misión). */
  comentarios?: { npc: string; texto: [string, string]; eleccion?: number }[];
  premio: Premio;
  /** Al terminarla se abre el siguiente acto. */
  cierraActo?: boolean;
  /** Encargo lateral (las principales son la cadena del acto). */
  lateral?: boolean;
  /** Quién la da y la recibe (por defecto quien da misiones en el pueblo del acto). */
  da?: string;
  /** Misiones que tienen que estar terminadas antes de que te la ofrezcan. */
  requiere?: string[];
  /** Al volver, eliges qué hacer: cada opción tiene su desenlace y su premio. */
  eleccion?: { pregunta: [string, string]; opciones: OpcionMision[] };
  /** Al entregarla empieza el epílogo (la misión que cierra la historia). */
  final?: boolean;
  /** Otro desenlace según lo que hiciste con la Brasa. */
  hechoSegun?: Partial<Record<FinalElegido, [string, string]>>;
}
/** Quién da las misiones principales en cada acto. */
export const DA_MISIONES: Record<number, string> = { 1: 'odran', 2: 'qadir', 3: 'oya', 4: 'sigrun', 5: 'auren', 6: 'oya', 7: 'auren' };
export const daMision = (m: Mision) => m.da ?? DA_MISIONES[m.acto];

export const MISIONES: Mision[] = [
  // ============================================================== ACTO 1
  { id: 'm1_hambre', acto: 1, nombre: ['El hambre bajo el páramo', 'The Hunger Beneath the Moor'],
    pedido: ['Hay una cueva en el páramo. De ahí salen arañas del tamaño de un perro y los que comen a los muertos. Algo grande teje allá abajo. Los pastores la llaman la Madre del Pozo. Mátala y el páramo respirará un poco.', 'There is a cave on the moor. Spiders the size of dogs crawl out of it, and the corpse-eaters with them. Something big weaves down below. The shepherds call it the Well Mother. Kill it and the moor will breathe a little.'],
    hecho: ['Siento el aire más liviano. Toma, esto es lo único que sé enseñar: cómo aprender más rápido.', 'The air feels lighter. Here, this is the only thing I know how to teach: how to learn faster.'],
    objetivo: { tipo: 'matar', zona: 'a1_guarida', monstruo: 'arana_reina' }, premio: { habilidad: 1 } },
  { id: 'm1_campanas', acto: 1, nombre: ['Las campanas mudas', 'The Silent Bells'],
    pedido: ['La abadía está más allá del camposanto. Alguien tiene que entrar y ver qué quedó. Si encuentras la piedra de viaje de la Nave, enciéndela. Así podremos seguirte.', 'The abbey lies beyond the churchyard. Someone must go in and see what remains. If you find the travel stone in the Nave, light it. Then we can follow you.'],
    hecho: ['Encendiste la piedra. Escuché las campanas desde aquí, una sola vez. Tomás lloró toda la noche. Ten, te lo ganaste.', 'You lit the stone. I heard the bells from here, just once. Tomas cried all night. Here, you earned it.'],
    objetivo: { tipo: 'llegar', zona: 'a1_abadia1' }, premio: { atributos: 5 } },
  { id: 'm1_abadesa', acto: 1, nombre: ['La Brasa en el Pozo', 'The Ember in the Well'], cierraActo: true,
    pedido: ['Bajo los osarios está el pozo. Ilvara está allí abajo con la brasa. Ya no es la Abadesa. Si la dejas, la brasa abre el primer sello y todo el valle se enciende. Ve. Y si ves a un hombre pálido que canta, no le contestes.', 'Beneath the ossuaries lies the well. Ilvara is down there with the ember. She is no longer the Abbess. If you let her be, the ember opens the first seal and the whole valley ignites. Go. And if you see a pale man singing, do not answer him.'],
    hecho: ['La brasa se fue antes de que cayera Ilvara. Voló al sur, al desierto de Sahrim. Ysolde la vio en sus cartas. La seguiremos. La piedra de viaje ya conoce el camino.', 'The ember fled before Ilvara fell. It flew south, to the Sahrim desert. Ysolde saw it in her cards. We will follow. The travel stone already knows the way.'],
    objetivo: { tipo: 'matar', zona: 'a1_pozo', monstruo: 'abadesa' }, premio: { habilidad: 1, atributos: 5 } },
  { id: 'm1_verdugo', acto: 1, lateral: true, da: 'lys', requiere: ['m1_campanas'], nombre: ['El Verdugo de Velmora', 'The Velmora Headsman'],
    pedido: ['Antes de la brasa, la abadía tenía un verdugo para los herejes. Lo enterraron con su hacha en los osarios, bajo el claustro. Yo lo oigo afilar por las noches, aunque estoy lejos. Que deje de afilar. Por favor.', 'Before the ember, the abbey kept a headsman for heretics. They buried him with his axe in the ossuaries, beneath the cloister. I hear him sharpening at night, even from this far. Make the sharpening stop. Please.'],
    hecho: ['Tenía mi nombre escrito en su hacha, ¿verdad? No pongas esa cara. Tenía el de todos. Toma esto, era de él. Y mi bendición, que es lo único mío que vale algo. Esta noche voy a dormir.', 'He had my name written on his axe, did he not? Do not make that face. He had everyone\'s. Take this, it was his. And my blessing, the only thing of mine worth anything. Tonight I will sleep.'],
    objetivo: { tipo: 'matar', zona: 'a1_cata1', monstruo: 'verdugo' }, premio: { objeto: 'raro', oro: 500, vida: 10 } },
  { id: 'm1_pastor', acto: 1, lateral: true, da: 'brannoc', nombre: ['El pastor que no volvió', 'The Shepherd Who Never Returned'],
    pedido: ['Mi hermano Edrin cuidaba ovejas en el páramo. La noche de la brasa se metió con el rebaño en la Cueva del Pastor, para protegerlo de la lluvia tibia. Las ovejas salieron. Él no. Ahora algo grande vive ahí y las ovejas ya no salen. Entra. Dime qué encontraste.', 'My brother Edrin herded sheep on the moor. The night of the ember he took the flock into the Shepherd\'s Cave, to shelter it from the warm rain. The sheep came out. He did not. Now something big lives there and the sheep no longer come out. Go in. Tell me what you found.'],
    hecho: ['Gracias por entrar. Ya sé lo que hay que saber.', 'Thank you for going in. I know what there is to know.'],
    objetivo: { tipo: 'matar', zona: 'a1_pastor', monstruo: 'ogro', nombreUnico: ['Edrin, el que Comió', 'Edrin, Who Ate'] }, premio: {},
    eleccion: { pregunta: ['Lo que encontraste llevaba el cayado de Edrin clavado en la carne, como un hueso más. Brannoc espera. ¿Qué le dices?', 'What you found carried Edrin\'s crook sunk into its flesh, like another bone. Brannoc waits. What do you tell him?'], opciones: [
      { texto: ['La verdad: la brasa lo convirtió en eso.', 'The truth: the ember made him into that.'],
        hecho: ['Brannoc no dice nada durante mucho rato. Después mete el cayado en la fragua fría. Lo que sale es una hoja. «Ten. Que mi hermano siga peleando, aunque sea en tu mano.»', 'Brannoc says nothing for a long while. Then he puts the crook into the cold forge. What comes out is a blade. "Here. Let my brother keep fighting, even if it is in your hand."'],
        premio: { objeto: 'raro', oro: 200 } },
      { texto: ['Una mentira piadosa: murió defendiendo el rebaño.', 'A merciful lie: he died defending the flock.'],
        hecho: ['Brannoc sonríe por primera vez desde que lo conoces. «Así era él.» Te paga más de lo que vale tu trabajo. Tú sabes lo que vale de verdad.', 'Brannoc smiles for the first time since you met him. "That was him." He pays you more than your work is worth. You know what it is truly worth.'],
        premio: { oro: 900, atributos: 2 } }] } },
  { id: 'm1_reliquia', acto: 1, lateral: true, da: 'tomas', requiere: ['m1_hambre'], nombre: ['El dedo de Santa Oria', 'The Finger of Santa Oria'],
    pedido: ['Tomás te toma de la manga y te enseña un dibujo: una cripta, una monja sin cara y, en sus manos, una cajita con un hueso adentro. Señala el camposanto. Después se toca la garganta y niega con la cabeza, despacio.', 'Tomas tugs at your sleeve and shows you a drawing: a crypt, a faceless nun, and in her hands a small box with a bone inside. He points toward the churchyard. Then he touches his throat and shakes his head, slowly.'],
    hecho: ['Tomás asiente.', 'Tomas nods.'],
    objetivo: { tipo: 'matar', zona: 'a1_cripta', monstruo: 'aparecida', nombreUnico: ['Hermana Ívola, la que Recuerda', 'Sister Ivola, She Who Remembers'] }, premio: {},
    eleccion: { pregunta: ['Traes el relicario de Santa Oria. Adentro hay un dedo de la santa, todavía tibio. Tomás estira las manos. Odrán, desde el fuego, te mira y no dice nada.', 'You bring the reliquary of Santa Oria. Inside lies a finger of the saint, still warm. Tomas reaches out his hands. Odran, by the fire, watches you and says nothing.'], opciones: [
      { texto: ['Dárselo a Tomás.', 'Give it to Tomas.'],
        hecho: ['Tomás aprieta el relicario contra el pecho. Abre la boca. Sale una sola palabra, ronca, la primera en años: «Gracias». Odrán llora sin esconderse.', 'Tomas presses the reliquary to his chest. He opens his mouth. A single word comes out, hoarse, the first in years: "Thank you." Odran weeps without hiding it.'],
        premio: { habilidad: 1 } },
      { texto: ['Quedártelo. La santa todavía tiene poder.', 'Keep it. The saint still holds power.'],
        hecho: ['Guardas el relicario. Pesa más de lo que debería. Tomás baja las manos y vuelve a su dibujo. Esta vez dibuja a alguien con tu cara.', 'You keep the reliquary. It weighs more than it should. Tomas lowers his hands and returns to his drawing. This time he draws someone with your face.'],
        premio: { objeto: 'unico' } }] } },
  // ============================================================== ACTO 2
  { id: 'm2_saqueador', acto: 2, nombre: ['El agua negra', 'The Black Water'],
    pedido: ['Bajo el Oasis Muerto vive algo que se bebe el agua desde abajo. Los saqueadores la llaman la Boca de Arena. La tierra tiembla antes de que salga. Mientras respire, el agua no vuelve.', 'Beneath the Dead Oasis lives something that drinks the water from below. The raiders call it the Sand Maw. The ground trembles before it rises. While it breathes, the water will not return.'],
    hecho: ['El agua corre clara otra vez, aunque sabe a hierro. Toma, para tu sed y tus heridas.', 'The water runs clear again, though it tastes of iron. Here, for your thirst and your wounds.'],
    objetivo: { tipo: 'matar', zona: 'a2_oasis_muerto', monstruo: 'gusano_de_arena' }, premio: { vida: 20, oro: 1000 } },
  { id: 'm2_dormidos', acto: 2, nombre: ['La Galería de los Dormidos', 'The Gallery of the Sleepers'],
    pedido: ['Más allá de las Ruinas del Sol están las tumbas de los reyes. Los saqueadores dicen que la puerta se abrió sola hace tres noches, y que de adentro sale un viento tibio que huele a canela. Llega a la Galería de los Dormidos y enciende la piedra. Sin ella no podremos sacarte de ahí.', 'Beyond the Ruins of the Sun lie the tombs of the kings. The raiders say the door opened by itself three nights ago, and that a warm wind blows out of it smelling of cinnamon. Reach the Gallery of the Sleepers and light the stone. Without it we cannot bring you back.'],
    hecho: ['Encendiste la piedra. Desde aquí se vio una luz azul en el horizonte, y por un momento el agua del oasis estuvo limpia. Toma, para lo que viene.', 'You lit the stone. From here we saw a blue light on the horizon, and for a moment the oasis water ran clean. Here, for what comes next.'],
    objetivo: { tipo: 'llegar', zona: 'a2_tumbas1' }, premio: { atributos: 5 } },
  { id: 'm2_rey', acto: 2, nombre: ['El Rey sin Sombra', 'The Shadowless King'], cierraActo: true,
    pedido: ['Khamer-Ul despertó. Su sombra se fue con la brasa hace mil años y ahora volvió a buscarla. Baja a las tumbas y quítale lo que le queda.', 'Khamer-Ul has woken. His shadow left with the ember a thousand years ago and now it has come back for it. Go down to the tombs and take what remains.'],
    hecho: ['Segundo sello roto, pero la brasa escapó otra vez. Ahora va hacia el río, hacia Yhuantl. La capitana Oyá tiene barco. Te espera en Kesh.', 'Second seal broken, but the ember escaped again. Now it heads for the river, to Yhuantl. Captain Oya has a ship. She waits for you at Kesh.'],
    objetivo: { tipo: 'matar', zona: 'a2_tumbas2', monstruo: 'rey_sin_sombra' }, premio: { habilidad: 1, objeto: 'unico', olvido: true } },
  { id: 'm2_nombres', acto: 2, lateral: true, da: 'nahla', nombre: ['El nombre de Samira', 'Samira\'s Name'],
    pedido: ['Mi hija Samira murió de fiebre antes de la brasa. Grabamos su nombre en el Pozo de los Nombres, como manda la costumbre, para que los reyes de abajo la recuerden. Ayer fui a rezarle y su piedra estaba lisa. Algo allá abajo está borrando a nuestros muertos. Encuéntralo.', 'My daughter Samira died of fever before the ember. We carved her name into the Well of Names, as custom demands, so the kings below would remember her. Yesterday I went to pray and her stone was smooth. Something down there is erasing our dead. Find it.'],
    hecho: ['Gracias.', 'Thank you.'],
    objetivo: { tipo: 'matar', zona: 'a2_nombres2', monstruo: 'momia', nombreUnico: ['La Borradora', 'The Eraser'] }, premio: {},
    eleccion: { pregunta: ['La Borradora cayó, pero la piedra de Samira sigue lisa. Nahla te da un cincel. Solo queda espacio para un nombre. El pozo, dicen, protege a quien lleva el nombre grabado.', 'The Eraser has fallen, but Samira\'s stone is still smooth. Nahla hands you a chisel. There is room for only one name. The well, they say, protects whoever has their name carved there.'], opciones: [
      { texto: ['Grabar el nombre de Samira.', 'Carve Samira\'s name.'],
        hecho: ['Nahla pasa los dedos por las letras recién cortadas. «Ahora la recuerdan otra vez.» Te regala lo que guardaba para la dote de su hija.', 'Nahla runs her fingers over the freshly cut letters. "Now they remember her again." She gives you what she had saved for her daughter\'s dowry.'],
        premio: { atributos: 5, oro: 600 } },
      { texto: ['Grabar tu propio nombre.', 'Carve your own name.'],
        hecho: ['Nahla te mira grabar tu nombre sobre la piedra de su hija. No te detiene. Esa noche sientes que algo, muy abajo, te sostiene. Ella ya no te sirve el té.', 'Nahla watches you carve your name over her daughter\'s stone. She does not stop you. That night you feel something, far below, holding you up. She no longer pours you tea.'],
        premio: { vida: 30 } }] } },
  { id: 'm2_escarabajos', acto: 2, lateral: true, da: 'barzin', nombre: ['El caparazón de la reina', 'The Queen\'s Shell'],
    pedido: ['En la Cueva de los Escarabajos vive un escorpión tan viejo que su caparazón ya parece bronce. Ninguna hoja lo atraviesa. Tráeme ese caparazón y te hago algo que ningún rey de Sahrim tuvo nunca.', 'In the Scarab Cave lives a scorpion so old its shell looks like bronze. No blade gets through it. Bring me that shell and I will make you something no king of Sahrim ever had.'],
    hecho: ['Tres días de martillo. El caparazón cantaba cada vez que lo golpeaba. Toma. No le preguntes a la pieza de dónde viene, que te lo va a contar.', 'Three days of hammering. The shell sang every time I struck it. Take it. Do not ask the piece where it comes from, it will tell you.'],
    objetivo: { tipo: 'matar', zona: 'a2_escarabajos', monstruo: 'escorpion_gigante', nombreUnico: ['Caparazón de Reina', 'Queenshell'] }, premio: { objeto: 'conjunto', oro: 400 } },
  { id: 'm2_sol', acto: 2, lateral: true, da: 'cartografo', requiere: ['m2_saqueador'], nombre: ['El mapa que mira abajo', 'The Map That Looks Down'],
    pedido: ['En el Templo del Sol Caído hay un sacerdote que todavía reza. Pero reza hacia abajo, hacia la brasa. Tiene un mapa que yo dibujé de joven, cuando aún veía: el mapa de los cinco sellos. Si lo sigue usando, sabrá dónde cavar. Quítaselo.', 'In the Temple of the Fallen Sun there is a priest who still prays. But he prays downward, toward the ember. He has a map I drew when I was young and could still see: the map of the five seals. If he keeps using it, he will know where to dig. Take it from him.'],
    hecho: ['Lo tienes.', 'You have it.'],
    objetivo: { tipo: 'matar', zona: 'a2_sol', monstruo: 'sacerdote_caido', nombreUnico: ['Hamun, el que Reza hacia Abajo', 'Hamun, Who Prays Downward'] }, premio: {},
    eleccion: { pregunta: ['Traes el mapa de los cinco sellos. Las líneas se mueven si no las miras. En una esquina hay un sexto sello que nadie dibujó, una escalera hacia arriba. El cartógrafo extiende la mano hacia tu voz.', 'You bring the map of the five seals. The lines move when you are not looking. In one corner there is a sixth seal no one drew, a stair leading up. The cartographer reaches his hand toward your voice.'], opciones: [
      { texto: ['Devolvérselo al cartógrafo.', 'Return it to the cartographer.'],
        hecho: ['El viejo pasa los dedos sobre el pergamino y se ríe como un niño. «Todavía lo veo. Aquí, aquí y aquí.» Te enseña a leer los caminos que no existen todavía.', 'The old man runs his fingers over the parchment and laughs like a child. "I can still see it. Here, here and here." He teaches you to read paths that do not exist yet.'],
        premio: { habilidad: 1 } },
      { texto: ['Quemarlo. Nadie más debe seguirlo.', 'Burn it. No one else must follow it.'],
        hecho: ['El mapa arde con una llama verde y grita. El cartógrafo no dice nada. Después te da todo lo que tiene, como si ya no le sirviera de nada.', 'The map burns with a green flame and screams. The cartographer says nothing. Then he gives you everything he owns, as if it no longer served him.'],
        premio: { atributos: 4, oro: 1200 } }] } },
  // ============================================================== ACTO 3
  { id: 'm3_bruja', acto: 3, nombre: ['La voz del manglar', 'The Voice of the Mangrove'],
    pedido: ['En el manglar hay una bruja que llama a los marineros por su nombre. Ya me robó tres. Tráeme su lengua o lo que sea que use para hablar.', 'In the mangrove there is a witch who calls sailors by name. She has taken three of mine. Bring me her tongue, or whatever she speaks with.'],
    hecho: ['Silencio por fin. Toma, Tlalli dice que esto te hará más fuerte.', 'Silence at last. Here, Tlalli says this will make you stronger.'],
    objetivo: { tipo: 'matar', zona: 'a3_pantano', monstruo: 'bruja', nombreUnico: ['La que Llama', 'She Who Calls'] }, premio: { atributos: 5, resistencia: 10 } },
  { id: 'm3_escalones', acto: 3, nombre: ['Los escalones bajo las raíces', 'The Steps Beneath the Roots'],
    pedido: ['La bruja hablaba de unos escalones bajo el manglar. Mis hombres los encontraron: bajan más de lo que la tierra permite. Ahí empieza el templo. Baja y enciende la piedra de los Escalones Hundidos. Yo no mando a nadie más.', 'The witch spoke of steps beneath the mangrove. My men found them: they go deeper than the earth allows. That is where the temple begins. Go down and light the stone of the Sunken Steps. I am not sending anyone else.'],
    hecho: ['Ya tenemos camino. Tlalli dice que los escalones tienen tu número exacto, ni uno más ni uno menos. No sé qué quiere decir. Toma.', 'Now we have a way. Tlalli says the steps match your number exactly, not one more, not one less. I do not know what she means. Take this.'],
    objetivo: { tipo: 'llegar', zona: 'a3_templo1' }, premio: { atributos: 5 } },
  { id: 'm3_madre', acto: 3, nombre: ['La Madre Ciénaga', 'Mother Mire'], cierraActo: true,
    pedido: ['Bajo el templo vive la Madre. Pare monstruos con el barro de la brasa. Si la matas, el río se limpia y mi barco puede llevarte al norte, a Hrimgard.', 'Beneath the temple lives the Mother. She births monsters from the ember\'s mud. Kill her and the river is cleansed, and my ship can take you north, to Hrimgard.'],
    hecho: ['El río ya no sangra. Sube a bordo. Dicen que en el norte el frío conserva todo, hasta las promesas rotas.', 'The river no longer bleeds. Come aboard. They say in the north the cold preserves everything, even broken promises.'],
    objetivo: { tipo: 'matar', zona: 'a3_templo2', monstruo: 'madre_cienaga' }, premio: { habilidad: 1, objeto: 'conjunto' } },
  { id: 'm3_tunde', acto: 3, lateral: true, da: 'tlalli', nombre: ['Lo que tejió la araña', 'What the Spider Wove'],
    pedido: ['Tunde, el primer oficial de Oyá, entró al Nido de la Araña buscando a los marineros que perdimos. Eso fue hace nueve días. Anoche lo oí cantar en sueños, una canción de cuna con la voz de otro. Tráelo. Esté como esté.', 'Tunde, Oya\'s first mate, went into the Spider\'s Nest looking for the sailors we lost. That was nine days ago. Last night I heard him singing in my dreams, a lullaby in someone else\'s voice. Bring him back. However he is.'],
    hecho: ['Lo trajiste.', 'You brought him.'],
    objetivo: { tipo: 'matar', zona: 'a3_nido', monstruo: 'arana_reina', nombreUnico: ['La Tejedora de Gente', 'The People-Weaver'] }, premio: {},
    eleccion: { pregunta: ['Tunde está vivo, envuelto en hilo, con la piel tibia y algo que se mueve debajo de las costillas. Tlalli dice que lo que lleva adentro va a nacer. Tunde te pide que lo dejes ver el río una vez más.', 'Tunde is alive, wrapped in thread, his skin warm and something moving beneath his ribs. Tlalli says what he carries inside will be born. Tunde asks you to let him see the river one more time.'], opciones: [
      { texto: ['Perdonarlo. Que Tlalli intente curarlo.', 'Spare him. Let Tlalli try to heal him.'],
        hecho: ['Tlalli cose, quema y reza tres noches seguidas. Tunde sobrevive. No vuelve a hablar de la cueva, pero de noche mira la selva como si alguien lo llamara. Oyá te paga en oro y en silencio.', 'Tlalli stitches, burns and prays for three nights straight. Tunde survives. He never speaks of the cave again, but at night he watches the jungle as if someone were calling him. Oya pays you in gold and in silence.'],
        premio: { oro: 1500, objeto: 'raro' } },
      { texto: ['Darle una muerte limpia, junto al río.', 'Give him a clean death, by the river.'],
        hecho: ['Lo llevas a la orilla. Mira el agua un rato largo. Después asiente. Lo que salió de su pecho no alcanzó a abrir los ojos. Oyá no te habla en días. Tlalli te marca la frente con barro y te dice que ahora eres más fuerte que tu pena.', 'You carry him to the bank. He watches the water for a long time. Then he nods. What came out of his chest never opened its eyes. Oya does not speak to you for days. Tlalli marks your forehead with mud and tells you that now you are stronger than your grief.'],
        premio: { atributos: 6 } }] } },
  { id: 'm3_idolo', acto: 3, lateral: true, da: 'jorun', requiere: ['m3_bruja'], nombre: ['El ídolo que mira', 'The Watching Idol'],
    pedido: ['¿Te acuerdas del ídolo que te conté? Ya sé de dónde vino. Del Palacio Ahogado, en la Ciudad Hundida. Allá vive la novia del último rey, y ella me lo mandó. Me lo dijo anoche, al oído, con la boca llena de agua. Haz que deje de mirarme.', 'Remember the idol I told you about? I know where it came from now. The Drowned Palace, in the Sunken City. The last king\'s bride lives there, and she sent it to me. She told me last night, in my ear, with her mouth full of water. Make her stop watching me.'],
    hecho: ['Esta mañana el ídolo tenía los ojos cerrados. Lo vendí a un comerciante que pasaba río abajo. No me mires así, alguien tenía que comprarlo. Toma tu parte, y algo que arreglé con mis propias manos.', 'This morning the idol had its eyes closed. I sold it to a trader passing downriver. Do not look at me like that, someone had to buy it. Take your share, and something I mended with my own hands.'],
    objetivo: { tipo: 'matar', zona: 'a3_hundida2', monstruo: 'hechicera_sangre', nombreUnico: ['Nahue, la Novia Ahogada', 'Nahue, the Drowned Bride'] }, premio: { oro: 2000, objeto: 'raro' } },
  { id: 'm3_ixel', acto: 3, lateral: true, da: 'ixel', nombre: ['La campana de vísperas', 'The Vespers Bell'],
    pedido: ['Cuando hui de Santa Oria me llevé la campana pequeña, la de vísperas. Era lo único que podía cargar. Me la quitó un trol en las Cavernas Inundadas, y ahora la lleva colgada del cuello. La oigo sonar cuando camina. Cada vez que suena, algo en el agua se despierta.', 'When I fled Santa Oria I took the small bell, the vespers bell. It was all I could carry. A troll took it from me in the Flooded Caverns, and now wears it around its neck. I hear it ring when it walks. Every time it rings, something in the water wakes.'],
    hecho: ['La campana.', 'The bell.'],
    objetivo: { tipo: 'matar', zona: 'a3_inundadas', monstruo: 'trol_pantano', nombreUnico: ['Bocaferro, el de la Campana', 'Ironmaw, Bell-Bearer'] }, premio: {},
    eleccion: { pregunta: ['Recuperaste la campana de vísperas. Ixel la mira sin tocarla. «Si la toco de noche, los que quedan del coro sabrán dónde estamos. Ellos y lo que los persigue.»', 'You recovered the vespers bell. Ixel looks at it without touching it. "If I ring it at night, what remains of the choir will know where we are. They, and whatever hunts them."'], opciones: [
      { texto: ['Que la toque esta noche.', 'Let him ring it tonight.'],
        hecho: ['La campana suena una sola vez. Muy lejos, en el norte, otra campana contesta. Ixel sonríe y te enseña la última oración del coro.', 'The bell rings just once. Far away, in the north, another bell answers. Ixel smiles and teaches you the last prayer of the choir.'],
        premio: { habilidad: 1 } },
      { texto: ['Que la hunda en el río, callada para siempre.', 'Let him sink it in the river, silent forever.'],
        hecho: ['Ixel la suelta en la corriente. No hace ruido al hundirse. Esa noche nadie en el muelle sueña. Te da sus ahorros de monje, que no eran pocos.', 'Ixel lets it go in the current. It makes no sound as it sinks. That night no one at the landing dreams. He gives you his monk\'s savings, which were not few.'],
        premio: { atributos: 4, oro: 1000 } }] } },
  // ============================================================== ACTO 4
  { id: 'm4_paso', acto: 4, nombre: ['El viento que canta', 'The Singing Wind'],
    pedido: ['Hjaldur bajó del trono y la montaña se puso a cantar. Antes de ir por él necesito saber si el Paso del Glaciar sigue abierto. Mis exploradores no volvieron. Llega al glaciar y enciende la piedra.', 'Hjaldur came down from the throne and the mountain began to sing. Before we go after him I need to know if the Glacier Pass is still open. My scouts did not return. Reach the glacier and light the stone.'],
    hecho: ['Abierto, entonces. ¿Y mis exploradores? No, no me digas. Lo veo en tu cara. Toma esto. Era para ellos.', 'Open, then. And my scouts? No, do not tell me. I see it on your face. Take this. It was meant for them.'],
    objetivo: { tipo: 'llegar', zona: 'a4_glaciar' }, premio: { atributos: 5 } },
  { id: 'm4_aliento', acto: 4, nombre: ['El Aliento Helado', 'The Frozen Breath'],
    pedido: ['Las cuevas bajo el glaciar llevan al trono. Los viejos las llaman el Aliento, porque de ahí sale el frío del mundo. Entra y enciende la piedra de las cuevas. Si hay caras en el hielo, no las mires mucho.', 'The caves beneath the glacier lead to the throne. The old ones call them the Breath, because the cold of the world comes out of there. Go in and light the stone of the caves. If there are faces in the ice, do not look at them for long.'],
    hecho: ['Encendida. La montaña dejó de cantar por un momento, como si escuchara. Ya falta poco. Toma.', 'Lit. The mountain stopped singing for a moment, as if it were listening. Not long now. Take this.'],
    objetivo: { tipo: 'llegar', zona: 'a4_hielo1' }, premio: { habilidad: 1 } },
  { id: 'm4_rey', acto: 4, nombre: ['El trono vacío', 'The Empty Throne'], cierraActo: true,
    pedido: ['Hjaldur dejó el trono de hielo. Los muertos de la montaña lo siguen. Si no vuelve a sentarse, que no se levante nunca más. Tú eliges cómo.', 'Hjaldur left the ice throne. The mountain dead follow him. If he will not sit again, make sure he never stands again. You choose how.'],
    hecho: ['Cuatro sellos. Queda uno: la Herida, donde cayó la sed del dios que tiene hambre. Auren te espera en el Bastión. Que la nieve te guarde.', 'Four seals. One remains: the Wound, where the thirst of the starving god fell. Auren awaits you at the Bastion. May the snow keep you.'],
    objetivo: { tipo: 'matar', zona: 'a4_hielo2', monstruo: 'rey_escarcha' }, premio: { habilidad: 1, atributos: 5, objeto: 'unico', olvido: true } },
  { id: 'm4_nino', acto: 4, lateral: true, da: 'nino_nieve', nombre: ['El corazón del niño', 'The Child\'s Heart'],
    pedido: ['El niño de la nieve te toma la mano. Su piel no está fría, está vacía. «Los gigantes cavaron en la Veta Madre buscando mi corazón. Es rojo y está tibio. Uno grande se lo quedó. Tráemelo, por favor. Quiero saber cómo se siente tener frío.»', 'The snow child takes your hand. His skin is not cold, it is empty. "The giants dug in the Mother Lode looking for my heart. It is red and warm. A big one kept it. Bring it to me, please. I want to know how it feels to be cold."'],
    hecho: ['El niño espera.', 'The child waits.'],
    objetivo: { tipo: 'matar', zona: 'a4_minas2', monstruo: 'gigante_helado', nombreUnico: ['Ymrak, el que Cava', 'Ymrak the Digger'] }, premio: {},
    eleccion: { pregunta: ['Traes una piedra roja que late. No es un corazón. Es un pedazo de brasa. Tu Marca arde al tenerla cerca, y por un instante sientes que la piedra te reconoce. El niño la mira con hambre de niño.', 'You bring a red stone that beats. It is not a heart. It is a shard of ember. Your Mark burns with it near, and for a moment you feel the stone recognize you. The child looks at it with a child\'s hunger.'], opciones: [
      { texto: ['Dársela al niño.', 'Give it to the child.'],
        hecho: ['El niño aprieta la piedra contra el pecho y se estremece. «Frío. Así se siente.» Sonríe, y por la mañana junto a la puerta solo queda nieve con forma de niño. En la nieve hay algo para ti.', 'The child presses the stone to his chest and shivers. "Cold. So that is how it feels." He smiles, and by morning there is only snow in the shape of a child by the gate. In the snow there is something for you.'],
        premio: { habilidad: 1, objeto: 'raro' } },
      { texto: ['Dejar que tu Marca la beba.', 'Let your Mark drink it.'],
        hecho: ['Cierras la mano. La piedra se apaga y tu Marca se enciende. Te sientes más fuerte, más entero, como si recuperaras algo que te habían quitado. El niño te mira y no llora. Dice: «Ya eligió.»', 'You close your hand. The stone goes dark and your Mark lights up. You feel stronger, more whole, as if you had recovered something taken from you. The child looks at you and does not cry. He says: "It has chosen."'],
        premio: { atributos: 6, vida: 25 } }] } },
  { id: 'm4_grieta', acto: 4, lateral: true, da: 'vigdis', nombre: ['El que buscaba a sus hijos', 'He Who Sought His Children'],
    pedido: ['Mi marido Eirik bajó a la Grieta Glaciar hace veinte inviernos, buscando a nuestros hijos perdidos en la ventisca. El hielo es tan claro que lo veo desde el borde: sigue caminando allá abajo, con la armadura puesta. Ya no sabe por qué camina. Ayúdalo a detenerse.', 'My husband Eirik went down into the Glacial Rift twenty winters ago, searching for our children lost in the blizzard. The ice is so clear I can see him from the edge: he is still walking down there, armor on. He no longer knows why he walks. Help him stop.'],
    hecho: ['Lo sentí. Anoche dejé de oír sus pasos bajo el fortín. Toma su anillo, y lo que sé de curar: no lo aprendí para nadie más que para él.', 'I felt it. Last night I stopped hearing his footsteps beneath the fort. Take his ring, and what I know of healing: I learned it for no one but him.'],
    objetivo: { tipo: 'matar', zona: 'a4_grieta', monstruo: 'caballero_espectral', nombreUnico: ['Eirik el Fiel', 'Eirik the Faithful'] }, premio: { vida: 30, objeto: 'raro' } },
  { id: 'm4_barbaro', acto: 4, lateral: true, da: 'hakon', requiere: ['m4_paso'], nombre: ['El martillo de Hrodulf', 'Hrodulf\'s Hammer'],
    pedido: ['En la Cripta del Rey Bárbaro está enterrado Hrodulf con su ejército, de pie, mirando a la puerta. Mi abuelo le forjó el martillo. Dicen que ahora se mueven, que el rey se cansó de esperar. Tráeme el martillo antes de que lo use contra nosotros.', 'In the Crypt of the Barbarian King lies Hrodulf with his army, standing, facing the door. My grandfather forged his hammer. They say they move now, that the king grew tired of waiting. Bring me the hammer before he uses it against us.'],
    hecho: ['El martillo de mi abuelo. Todavía tiene su marca en el mango. Lo voy a fundir y con lo que salga te haré algo digno. Él lo habría querido así, aunque nunca lo dijo.', 'My grandfather\'s hammer. His mark is still on the handle. I will melt it down and with what comes out I will make you something worthy. He would have wanted it, though he never said so.'],
    objetivo: { tipo: 'matar', zona: 'a4_barbaro', monstruo: 'caballero_muerto', nombreUnico: ['Hrodulf, el Rey de Pie', 'Hrodulf, the Standing King'] }, premio: { objeto: 'unico' } },
  // ============================================================== ACTO 5
  { id: 'm5_heraldo', acto: 5, nombre: ['El último canto de Vesperio', 'Vesperio\'s Last Song'],
    pedido: ['Lo has visto en cada sello, ¿verdad? El que se escapa riendo. Se llama Vesperio. Fue novicio en Santa Oria, el único que rompió el voto y cantó de noche. Su canto llamó a la brasa. Ahora espera en la Fragua de Ozmaren, junto al yunque donde se forjaron las cadenas. Esta vez no tendrá adónde huir.', 'You have seen him at every seal, have you not? The one who escapes laughing. His name is Vesperio. He was a novice at Santa Oria, the only one who broke the vow and sang at night. His song called the ember. Now he waits in Ozmaren\'s Forge, beside the anvil where the chains were forged. This time he will have nowhere to run.'],
    hecho: ['Vesperio calló. Antes de morir te dijo algo, ¿verdad? Lo veo en tus ojos. No me lo cuentes todavía. Primero el dragón. Después el Corazón. Después, si quedamos, hablamos.', 'Vesperio is silent. Before he died he told you something, did he not? I see it in your eyes. Do not tell me yet. First the dragon. Then the Heart. Afterwards, if we remain, we will talk.'],
    objetivo: { tipo: 'matar', zona: 'a5_fragua', monstruo: 'heraldo' }, premio: { habilidad: 1, atributos: 5 } },
  { id: 'm5_dragon', acto: 5, nombre: ['Los huesos que vuelan', 'The Bones That Fly'],
    pedido: ['En la Garganta de la Herida duerme Varnhul, un dragón que murió antes de que existieran los hombres. Ozmaren le prestó aliento. Si llegas al Corazón con él vivo a tus espaldas, no saldrás.', 'In the Throat of the Wound sleeps Varnhul, a dragon that died before men existed. Ozmaren lent it breath. If you reach the Heart with it alive behind you, you will not come out.'],
    hecho: ['El aliento de Varnhul se apagó. Ahora solo queda la sed.', 'Varnhul\'s breath has gone out. Now only the thirst remains.'],
    objetivo: { tipo: 'matar', zona: 'a5_santuario1', monstruo: 'dragon_oseo' }, premio: { atributos: 5, objeto: 'unico' } },
  { id: 'm5_ozmaren', acto: 5, nombre: ['La Sed que Arde', 'The Burning Thirst'], cierraActo: true,
    pedido: ['Ozmaren está entero otra vez, en el Corazón de la Brasa. Tu Marca es la llave que le falta. Si entras, puede que no salgas siendo tú. Pero si no entras, no queda nadie para salir.', 'Ozmaren is whole again, in the Ember Heart. Your Mark is the key it lacks. If you go in, you may not come out as yourself. But if you do not, there will be no one left to come out.'],
    hecho: ['Lo lograste. Pero anoche el mar del norte se partió en dos y algo subió del fondo. Una ciudad entera, con sus campanas. Oyá dice que su barco quedó varado en la costa. Te espera allá.', 'You did it. But last night the northern sea split in two and something rose from the bottom. A whole city, with its bells. Oya says her ship ran aground on the coast. She waits for you there.'],
    hechoSegun: {
      destruir: ['Apagaste la Brasa. Tu Marca está gris y fría, la vi. Pero anoche el mar del norte se partió en dos, como si algo allá arriba hubiera sentido que le faltaba un pedazo. Subió una ciudad entera, con sus campanas. Oyá quedó varada en esa costa. Te espera.', 'You put out the Ember. Your Mark is grey and cold, I saw it. But last night the northern sea split in two, as if something far above had felt a piece of itself go missing. A whole city rose, with its bells. Oya ran aground on that coast. She waits for you.'],
      absorber: ['No te acerques mucho al fuego. No por ti. Por el fuego. Anoche el mar del norte se partió en dos cuando la Brasa entró en ti, y subió una ciudad entera, con sus campanas. Oyá quedó varada en esa costa. Dice que las campanas tocan tu nombre.', 'Do not stand too close to the fire. Not for your sake. For the fire\'s. Last night the northern sea split in two when the Ember entered you, and a whole city rose, with its bells. Oya ran aground on that coast. She says the bells are ringing your name.'],
    },
    objetivo: { tipo: 'matar', zona: 'a5_santuario2', monstruo: 'senor_demonio' }, premio: { habilidad: 2, atributos: 10, objeto: 'unico' } },
  { id: 'm5_coro', acto: 5, lateral: true, da: 'odran', nombre: ['Las seis voces', 'The Six Voices'],
    pedido: ['Auren dice que fueron siete voces y queda él. Las otras seis bajaron al Abismo de los Susurros a cantarle a la nada, para que no subiera. Un caballero del abismo guarda ahora sus huesos en las Islas sobre la Nada. Fui su archivero. Tráelos, o al menos tráeme sus nombres.', 'Auren says there were seven voices and he remains. The other six went down into the Abyss of Whispers to sing to the nothing, so it would not rise. An abyss knight now guards their bones on the Isles over Nothing. I was their archivist. Bring them back, or at least bring me their names.'],
    hecho: ['Gracias.', 'Thank you.'],
    objetivo: { tipo: 'matar', zona: 'a5_abismo2', monstruo: 'caballero_abismo', nombreUnico: ['Orvan el Juramentado', 'Orvan the Oathbound'] }, premio: {},
    eleccion: { pregunta: ['Traes seis cráneos envueltos en un manto. Todavía murmuran, muy bajo, el mismo canto. Si los traes al Bastión, Auren podrá cantar con ellos. Si los devuelves al Abismo, seguirán cantándole a la nada para que no suba.', 'You bring six skulls wrapped in a cloak. They still murmur, very low, the same song. If you bring them to the Bastion, Auren can sing with them. If you return them to the Abyss, they will keep singing to the nothing so it does not rise.'], opciones: [
      { texto: ['Traerlos al Bastión, con Auren.', 'Bring them to the Bastion, with Auren.'],
        hecho: ['Esa noche el Bastión canta con siete voces. Auren llora sin dejar de cantar. Odrán escribe cada nombre en su libro y después te enseña algo que solo saben los archiveros.', 'That night the Bastion sings with seven voices. Auren weeps without stopping his song. Odran writes each name in his book and then teaches you something only archivists know.'],
        premio: { habilidad: 1 } },
      { texto: ['Devolverlos al Abismo, a su guardia.', 'Return them to the Abyss, to their watch.'],
        hecho: ['Los dejas al borde de las islas. El murmullo sigue, más firme. Los susurros que te seguían desde el Abismo se callan. Odrán asiente: «Así lo habrían querido.» Te da la armadura de su hermano mayor.', 'You leave them at the edge of the isles. The murmur continues, steadier. The whispers that followed you from the Abyss fall silent. Odran nods: "That is what they would have wanted." He gives you his elder brother\'s armor.'],
        premio: { objeto: 'unico', vida: 20 } }] } },
  { id: 'm5_fuelle', acto: 5, lateral: true, da: 'brannoc', nombre: ['El fuego que no calienta', 'The Fire That Gives No Heat'],
    pedido: ['Mi fragua no prende desde la noche de la brasa, ¿te acuerdas? Ya sé por qué. Ozmaren se llevó el calor de todas las fraguas del valle a la suya. Allá abajo hay un segador que hace de fuelle. Mátalo y el fuego volverá a casa.', 'My forge has not lit since the night of the ember, remember? Now I know why. Ozmaren took the heat of every forge in the valley into his own. Down there a reaper works the bellows. Kill it and the fire will come home.'],
    hecho: ['¿Lo sientes? Calor. Calor de verdad, por primera vez en un año. Mira lo que hice con él mientras volvías. Lo templé en agua bendita y en mis lágrimas, y no sé cuál de las dos sirvió más.', 'Do you feel it? Heat. Real heat, for the first time in a year. Look what I made with it while you were coming back. I tempered it in holy water and in my tears, and I do not know which helped more.'],
    objetivo: { tipo: 'matar', zona: 'a5_fragua', monstruo: 'segador', nombreUnico: ['El Fuelle', 'The Bellows'] }, premio: { objeto: 'conjunto', oro: 2000 } },
  { id: 'm5_cartas', acto: 5, lateral: true, da: 'ysolde', nombre: ['La última carta', 'The Last Card'],
    pedido: ['Saqué la última carta del mazo y está en blanco. Dice que el futuro todavía no decide. Llega al Río de Lava, mira el fuego un rato y vuelve. Entonces le daremos la vuelta.', 'I drew the last card from the deck and it is blank. It says the future has not decided yet. Reach the Lava River, watch the fire a while, and come back. Then we will turn it over.'],
    hecho: ['Ya miraste el fuego.', 'You have watched the fire.'],
    objetivo: { tipo: 'llegar', zona: 'a5_rio' }, premio: {},
    eleccion: { pregunta: ['Ysolde pone dos cartas boca abajo. «Una es la Hoguera, que todo lo apaga. La otra es la Corona, que todo lo guarda. Elige una. No cambia nada. O lo cambia todo.»', 'Ysolde lays two cards face down. "One is the Pyre, which puts everything out. The other is the Crown, which keeps everything. Choose one. It changes nothing. Or it changes everything."'], opciones: [
      { texto: ['La Hoguera.', 'The Pyre.'],
        hecho: ['Ysolde voltea la carta. Un fuego que se apaga solo. «Valiente. O cansado. Las dos cosas se parecen.» Te regala la carta. Pesa como una moneda de plomo.', 'Ysolde turns the card. A fire putting itself out. "Brave. Or tired. The two look alike." She gives you the card. It weighs like a lead coin.'],
        premio: { atributos: 5 } },
      { texto: ['La Corona.', 'The Crown.'],
        hecho: ['Ysolde voltea la carta. Una corona de brasas sobre una cabeza sin cara. Se queda callada mucho rato. «Ten cuidado con lo que guardas. A veces lo que guardas te guarda a ti.»', 'Ysolde turns the card. A crown of embers on a faceless head. She is silent for a long while. "Be careful what you keep. Sometimes what you keep, keeps you."'],
        premio: { habilidad: 1 } }] } },
  // ============================================================== ACTO 6
  { id: 'm6_costa', acto: 6, nombre: ['La ciudad que subió', 'The City That Rose'],
    pedido: ['Mi barco no se va a mover de aquí hasta que la marea vuelva, y la marea no vuelve. Esa ciudad la sostiene del otro lado. Cruza la Costa de los Naufragios y llega al Barrio Sumergido. Enciende la piedra. Quiero saber qué clase de gente vivía ahí.', 'My ship will not move from here until the tide returns, and the tide does not return. That city holds it on the other side. Cross the Shipwreck Coast and reach the Sunken Quarter. Light the stone. I want to know what kind of people lived there.'],
    hecho: ['¿Mesas puestas? ¿Platos servidos? Se hundieron cenando. Nadie corre cuando no sabe que se está hundiendo. Toma, y descansa un poco.', 'Tables set? Plates served? They sank at supper. No one runs when they do not know they are sinking. Here, and rest a little.'],
    objetivo: { tipo: 'llegar', zona: 'a6_barrio1' }, premio: { atributos: 5 } },
  { id: 'm6_plaza', acto: 6, nombre: ['La puerta de las campanas', 'The Door of Bells'],
    pedido: ['La campana que oímos de noche viene de la catedral, al otro lado de la Plaza de las Ánimas. Sor Salitre dice que la catedral se llamaba Ysmeral, igual que la ciudad, y que la ciudad entera era una sola iglesia. Llega a la Nave y enciende la piedra.', 'The bell we hear at night comes from the cathedral, across the Square of Souls. Sister Brine says the cathedral was called Ysmeral, like the city, and that the whole city was a single church. Reach the Nave and light the stone.'],
    hecho: ['Los bancos llenos y nadie levanta la cabeza. Sí, lo vi en tu cara antes de que lo dijeras. Toma. Lo que hay arriba del campanario no es una persona. Ya no.', 'Pews full and no one raising their head. Yes, I saw it on your face before you said it. Take this. What is up in the belfry is not a person. Not anymore.'],
    objetivo: { tipo: 'llegar', zona: 'a6_catedral1' }, premio: { habilidad: 1 } },
  { id: 'm6_campana', acto: 6, nombre: ['La Campana que Ahoga', 'The Drowning Bell'], cierraActo: true,
    pedido: ['La última sacerdotisa de Ysmeral se ató a la campana mayor para que la ciudad no se hundiera. Se hundió igual. Ahora son una sola cosa, y cada vez que toca, el mar se acerca un palmo. Haz que deje de tocar.', 'The last priestess of Ysmeral bound herself to the great bell so the city would not sink. It sank anyway. Now they are one thing, and every time it tolls, the sea draws a span closer. Make it stop tolling.'],
    hecho: ['La campana calló y la marea volvió de golpe. Mi barco flota. Pero mira el cielo, al norte. Se está rompiendo como un vidrio, y detrás hay escalones de oro. Auren dice que conoce esa escalera. Dice que lleva a un trono.', 'The bell went silent and the tide came back all at once. My ship floats. But look at the sky, to the north. It is breaking like glass, and behind it are steps of gold. Auren says he knows that stair. He says it leads to a throne.'],
    objetivo: { tipo: 'matar', zona: 'a6_catedral2', monstruo: 'campana_ahoga' }, premio: { habilidad: 1, atributos: 5, objeto: 'unico', olvido: true } },
  { id: 'm6_faro', acto: 6, lateral: true, da: 'tarn', nombre: ['La luz de los dientes', 'The Light of Teeth'],
    pedido: ['En la costa hay un faro apagado. Su lámpara está hecha de dientes, y alguien la sigue limpiando cada noche. Es el farero, ahogado hace siglos. Mientras él cuide esa lámpara, ningún barco va a encontrar esta costa. Ni los nuestros.', 'On the coast there is a dark lighthouse. Its lamp is made of teeth, and someone still cleans it every night. It is the keeper, drowned centuries ago. As long as he tends that lamp, no ship will find this coast. Not even ours.'],
    hecho: ['Volviste del faro.', 'You came back from the lighthouse.'],
    objetivo: { tipo: 'matar', zona: 'a6_faro', monstruo: 'ahogado', nombreUnico: ['El Farero de Ysmeral', 'The Keeper of Ysmeral'] }, premio: {},
    eleccion: { pregunta: ['El farero cayó, pero la lámpara de dientes sigue ahí. Tarn dice que si la enciendes, la luz llegará hasta los barcos perdidos de mil años. Algunos traerán vivos. Otros no.', 'The keeper has fallen, but the lamp of teeth remains. Tarn says that if you light it, its glow will reach the ships lost for a thousand years. Some will carry the living. Others will not.'], opciones: [
      { texto: ['Encender la lámpara.', 'Light the lamp.'],
        hecho: ['La luz sale verde y fría. Esa noche llegan tres barcos a la costa. Uno trae pescadores asustados. Los otros dos no traen a nadie, pero alguien amarra los cabos. Tarn te enseña a leer las estrellas que no se mueven.', 'The light comes out green and cold. That night three ships reach the coast. One carries frightened fishermen. The other two carry no one, yet someone ties the ropes. Tarn teaches you to read the stars that do not move.'],
        premio: { habilidad: 1 } },
      { texto: ['Romper la lámpara.', 'Break the lamp.'],
        hecho: ['Los dientes caen como granizo sobre la roca. El faro queda a oscuras para siempre. Tarn suspira y te da el oro que iba a cobrar por guiar barcos. «Nadie más va a venir. Puede que sea mejor.»', 'The teeth fall like hail on the rock. The lighthouse stays dark forever. Tarn sighs and gives you the gold he would have charged to guide ships. "No one else will come. Perhaps that is better."'],
        premio: { oro: 4000, objeto: 'raro' } }] } },
  { id: 'm6_arrecife', acto: 6, lateral: true, da: 'nerea', nombre: ['Los huesos de mi madre', 'My Mother\'s Bones'],
    pedido: ['Me llamo Nerea. Salí del agua con la ciudad, pero mi madre no. Está en el Arrecife de Huesos, lo sé porque la oigo cantar mi nombre entre las costillas. Algo grande camina por el arrecife y no la deja dormir.', 'My name is Nerea. I came out of the water with the city, but my mother did not. She is on the Bone Reef, I know because I hear her singing my name among the ribs. Something big walks the reef and will not let her sleep.'],
    hecho: ['Ya no canta. Está dormida. Mi madre tenía esto guardado para el día en que yo me casara. Yo ya no me voy a casar. Es tuyo.', 'She is not singing anymore. She is asleep. My mother kept this for the day I would marry. I will not marry now. It is yours.'],
    objetivo: { tipo: 'matar', zona: 'a6_arrecife', monstruo: 'cangrejo_cripta', nombreUnico: ['Coraza de Costillas', 'Ribshell'] }, premio: { objeto: 'unico', vida: 20 } },
  { id: 'm6_criptas', acto: 6, lateral: true, da: 'sor_salitre', requiere: ['m6_costa'], nombre: ['Las hermanas de la sal', 'The Sisters of Salt'],
    pedido: ['Yo era una de las doce hermanas de Ysmeral. Subí viva. Las otras once siguen abajo, en el Osario Ahogado, rezando con agua en la boca. Las guía nuestra abadesa, que nunca aceptó que nos hundiéramos. Baja. Haz que la abadesa me escuche, o que no escuche nada más.', 'I was one of the twelve sisters of Ysmeral. I came up alive. The other eleven are still below, in the Drowned Ossuary, praying with water in their mouths. Our abbess leads them, she who never accepted that we sank. Go down. Make the abbess listen to me, or listen to nothing ever again.'],
    hecho: ['La abadesa calló.', 'The abbess is silent.'],
    objetivo: { tipo: 'matar', zona: 'a6_criptas2', monstruo: 'monja_hueca', nombreUnico: ['La Abadesa de la Sal', 'The Salt Abbess'] }, premio: {},
    eleccion: { pregunta: ['Sin su abadesa, las once hermanas flotan quietas en el osario. Sor Salitre te pide que decidas por ella. Puede rezar para que suban como subió ella, con la sal en la sangre. O dejar que el agua se las lleve por fin.', 'Without their abbess, the eleven sisters float still in the ossuary. Sister Brine asks you to decide for her. She can pray for them to rise as she did, with salt in their blood. Or let the water take them at last.'], opciones: [
      { texto: ['Que suban, como ella.', 'Let them rise, as she did.'],
        hecho: ['A la mañana once mujeres pálidas esperan junto al barco, chorreando agua. No hablan. Cantan bajito cuando pasas. Sor Salitre llora de alegría y te cose una oración en el forro de la armadura.', 'In the morning eleven pale women wait beside the ship, dripping water. They do not speak. They sing softly when you pass. Sister Brine weeps for joy and stitches a prayer into the lining of your armor.'],
        premio: { vida: 30, atributos: 3 } },
      { texto: ['Que el agua se las lleve.', 'Let the water take them.'],
        hecho: ['Sor Salitre reza toda la noche en la proa. Al alba el osario está vacío y el mar, por un momento, huele a lirios. Te entrega el rosario de la abadesa. Las cuentas son perlas negras.', 'Sister Brine prays all night at the prow. At dawn the ossuary is empty and the sea, for a moment, smells of lilies. She gives you the abbess\'s rosary. The beads are black pearls.'],
        premio: { habilidad: 1, oro: 1500 } }] } },
  // ============================================================== ACTO 7
  { id: 'm7_puente', acto: 7, nombre: ['El puente quebrado', 'The Broken Bridge'],
    pedido: ['Esta escalera la vi en sueños cuando era novicio. Lleva a Aun-Saar, el dios que tiene sed. Ozmaren era su sed. Las brasas eran su sed. Todo este tiempo peleamos contra su sed y nunca contra él. Cruza el Cielo Roto y llega a las Islas de Oro. Enciende la piedra del Puente Quebrado.', 'I saw this stair in dreams when I was a novice. It leads to Aun-Saar, the god who thirsts. Ozmaren was his thirst. The embers were his thirst. All this time we fought his thirst and never him. Cross the Broken Sky and reach the Isles of Gold. Light the stone of the Broken Bridge.'],
    hecho: ['El oro está tibio, ¿verdad? Como una piel. Es la piel de su casa. Toma, y no mires abajo, que abajo no hay nada.', 'The gold is warm, is it not? Like skin. It is the skin of his house. Here, and do not look down, for there is nothing below.'],
    objetivo: { tipo: 'llegar', zona: 'a7_islas1' }, premio: { atributos: 5 } },
  { id: 'm7_escaleras', acto: 7, nombre: ['Los escalones con nombre', 'The Named Steps'],
    pedido: ['Pasando el Jardín de los que Intentaron están las Escaleras al Trono. Cada escalón tiene grabado el nombre de alguien que subió antes que tú. Llega a las escaleras y enciende la piedra. Si encuentras tu nombre, no lo leas en voz alta.', 'Past the Garden of Those Who Tried are the Stairs to the Throne. Each step bears the name of someone who climbed before you. Reach the stairs and light the stone. If you find your name, do not read it aloud.'],
    hecho: ['El último escalón está en blanco. Ya sé. Lo dejaron así para ti. Toma esto, y lo que queda de mi voz.', 'The last step is blank. I know. They left it that way for you. Take this, and what remains of my voice.'],
    objetivo: { tipo: 'llegar', zona: 'a7_escaleras' }, premio: { habilidad: 1, vida: 20 } },
  { id: 'm7_aunsaar', acto: 7, nombre: ['El Dios Sediento', 'The Thirsting God'], cierraActo: true,
    pedido: ['Aun-Saar espera en el Trono Sediento. No odia. No ama. Solo tiene sed, y la sed no se acaba con una muerte, se acaba con un final. Ve, y elige bien qué final le das.', 'Aun-Saar waits on the Thirsting Throne. He does not hate. He does not love. He only thirsts, and thirst does not end with a death, it ends with an ending. Go, and choose well what ending you give him.'],
    hecho: ['Se terminó. Escucha: el cielo está callado. Por primera vez desde que nací, nadie canta para sostener nada.', 'It is over. Listen: the sky is silent. For the first time since I was born, no one is singing to hold anything up.'],
    objetivo: { tipo: 'matar', zona: 'a7_trono', monstruo: 'aun_saar' }, premio: { habilidad: 2, atributos: 10, objeto: 'unico' } },
  { id: 'm7_boveda', acto: 7, lateral: true, da: 'mira', nombre: ['Las estrellas enjauladas', 'The Caged Stars'],
    pedido: ['Soy Mira. Contaba estrellas en Velmora. Una noche faltaron tres, y las seguí hasta aquí. Están en la Bóveda de los Astros, en jaulas de oro, y un astrónomo hueco las cuida para que el dios tenga luz que beber. Mátalo. Las estrellas no son de nadie.', 'I am Mira. I counted stars in Velmora. One night three were missing, and I followed them here. They are in the Vault of Stars, in golden cages, and a hollow astronomer keeps them so the god has light to drink. Kill him. The stars belong to no one.'],
    hecho: ['Está muerto el astrónomo.', 'The astronomer is dead.'],
    objetivo: { tipo: 'matar', zona: 'a7_boveda', monstruo: 'lich', nombreUnico: ['El Astrónomo Hueco', 'The Hollow Astronomer'] }, premio: {},
    eleccion: { pregunta: ['Las jaulas siguen cerradas. Mira tiene las llaves en la mano y te mira a ti. «Si las suelto, vuelven al cielo de Velmora. Si te quedas con una, tendrás una luz que nunca se apaga. Tú la ganaste.»', 'The cages are still shut. Mira holds the keys and looks at you. "If I free them, they go back to Velmora\'s sky. If you keep one, you will have a light that never goes out. You earned it."'], opciones: [
      { texto: ['Soltarlas todas.', 'Free them all.'],
        hecho: ['Tres luces suben despacio y se pierden más allá del vidrio roto. Mira cuenta en voz baja: «Una, dos, tres». Esa noche, desde muy lejos, Velmora tiene otra vez su cielo completo. Mira te enseña a encontrar el norte en cualquier oscuridad.', 'Three lights rise slowly and vanish beyond the broken glass. Mira counts softly: "One, two, three." That night, far away, Velmora has its full sky again. Mira teaches you to find north in any darkness.'],
        premio: { habilidad: 1, atributos: 3 } },
      { texto: ['Quedarte con una estrella.', 'Keep one star.'],
        hecho: ['La estrella cabe en tu mano y no quema. Mira suelta las otras dos sin decir nada. Cuando cuenta, dice: «Una, dos». Y se calla.', 'The star fits in your hand and does not burn. Mira frees the other two without a word. When she counts, she says: "One, two." And falls silent.'],
        premio: { objeto: 'unico', oro: 3000 } }] } },
  { id: 'm7_relicario', acto: 7, lateral: true, da: 'eskel', requiere: ['m7_puente'], nombre: ['El copero del dios', 'The God\'s Cupbearer'],
    pedido: ['Subí esta escalera hace cuarenta años, con seis compañeros. Llegué hasta el Relicario del Sediento y no pasé de ahí. Un caballero sirve copas vacías al dios, una tras otra, y mis compañeros están entre las copas. Yo me escondí. Desde entonces sigo escondido. Termina lo que no me atreví a terminar.', 'I climbed this stair forty years ago, with six companions. I reached the Reliquary of the Thirsting and got no farther. A knight serves empty cups to the god, one after another, and my companions are among the cups. I hid. I have been hiding ever since. Finish what I did not dare to finish.'],
    hecho: ['Cuarenta años. Y bastaste tú solo. No, no lo digo con rencor. Lo digo con alivio. Toma la espada que no usé.', 'Forty years. And you alone were enough. No, I do not say it bitterly. I say it with relief. Take the sword I never used.'],
    objetivo: { tipo: 'matar', zona: 'a7_relicario', monstruo: 'caballero_abismo', nombreUnico: ['El Copero del Dios', 'The God\'s Cupbearer'] }, premio: { objeto: 'conjunto', atributos: 3 } },
  { id: 'm7_jardin', acto: 7, lateral: true, da: 'hollin', nombre: ['La estatua con tu cara', 'The Statue With Your Face'],
    pedido: ['En el Jardín de los que Intentaron hay una estatua nueva. Llegó anoche. Tiene tu cara y tu Marca, y está mirando hacia el trono. Ve a verla. Lo que hagas con ella decide algo. No sé qué.', 'In the Garden of Those Who Tried there is a new statue. It arrived last night. It has your face and your Mark, and it is looking toward the throne. Go and see it. What you do with it decides something. I do not know what.'],
    hecho: ['La viste.', 'You saw it.'],
    objetivo: { tipo: 'llegar', zona: 'a7_jardin' }, premio: {},
    eleccion: { pregunta: ['La estatua tiene tu cara, pero más vieja, cansada, con la boca abierta como si tuviera sed. Hollin te alcanza un martillo de piedra.', 'The statue has your face, but older, tired, its mouth open as if it were thirsty. Hollin hands you a stone hammer.'], opciones: [
      { texto: ['Romperla.', 'Break it.'],
        hecho: ['La estatua se parte en dos de un solo golpe. Adentro no hay piedra, hay ceniza tibia. Hollin sonríe con los dientes que le quedan: «Entonces todavía no te toca.»', 'The statue splits in two with a single blow. Inside there is no stone, only warm ash. Hollin smiles with the teeth he has left: "Then it is not your turn yet."'],
        premio: { atributos: 6 } },
      { texto: ['Dejarla de pie, mirando el trono.', 'Leave it standing, facing the throne.'],
        hecho: ['Dejas la estatua donde está. Al irte, sientes que te mira la espalda y te cuida. Hollin asiente: «Hay quien necesita un testigo. Ahora tú tienes uno.»', 'You leave the statue where it stands. As you go, you feel it watching your back, keeping you. Hollin nods: "Some need a witness. Now you have one."'],
        premio: { vida: 40 } }] } },
];

/** Lo que se ve al entrar a una zona por primera vez (una línea de ambiente). */
export const ENTRADA_ZONA: Record<string, [string, string]> = {
  a1_pastor: ['Huele a lana mojada y a algo que se pudre. El pastor nunca salió.', 'It smells of wet wool and something rotting. The shepherd never came out.'],
  a1_bosque: ['Las sogas todavía se mecen. No hay viento.', 'The ropes still sway. There is no wind.'],
  a1_mina1: ['Los picos siguen clavados donde los dejaron. Alguien sigue cavando más abajo.', 'The picks are still stuck where they were left. Someone is still digging below.'],
  a1_mina2: ['Aquí abajo la roca está tibia, como la tierra donde cayó la brasa.', 'Down here the rock is warm, like the earth where the ember fell.'],
  a1_cripta: ['Los nombres de las lápidas fueron raspados. Alguien quiso que los olvidaran.', 'The names on the slabs were scraped off. Someone wanted them forgotten.'],
  a2_escarabajos: ['El suelo cruje y se mueve. No es arena.', 'The floor crunches and shifts. It is not sand.'],
  a2_nombres1: ['Cada piedra del pozo tiene un nombre. Algunos todavía están frescos.', 'Every stone of the well bears a name. Some are still fresh.'],
  a2_nombres2: ['Aquí los nombres se borran solos mientras miras.', 'Here the names erase themselves as you watch.'],
  a2_ruinas: ['Columnas de un templo que adoraba al sol. Ahora adoran otra luz.', 'Columns of a temple that worshipped the sun. Now they worship another light.'],
  a2_sol: ['El altar mira hacia abajo, no hacia el cielo.', 'The altar faces down, not toward the sky.'],
  a3_inundadas: ['El agua te llega a las rodillas. Algo la mueve desde adentro.', 'The water reaches your knees. Something moves it from within.'],
  a3_nido: ['Hilos por todas partes. Algunos tienen forma de gente.', 'Threads everywhere. Some are shaped like people.'],
  a3_hundida1: ['Una ciudad entera se hundió en una noche. Las campanas todavía suenan bajo el agua.', 'A whole city sank in one night. Bells still toll beneath the water.'],
  a3_hundida2: ['El palacio respira. Las paredes sudan agua negra.', 'The palace breathes. The walls sweat black water.'],
  a4_minas1: ['Herramientas del tamaño de un hombre. Los gigantes cavaban buscando algo.', 'Tools the size of a man. The giants dug, searching for something.'],
  a4_minas2: ['La veta brilla roja. No es hierro.', 'The vein glows red. It is not iron.'],
  a4_glaciar: ['El viento canta un nombre. Es el tuyo.', 'The wind sings a name. It is yours.'],
  a4_barbaro: ['Un rey enterrado con su ejército, de pie, mirando a la puerta.', 'A king buried with his army, standing, facing the door.'],
  a4_grieta: ['El hielo es tan claro que ves a los que cayeron antes que tú.', 'The ice is so clear you can see those who fell before you.'],
  a5_abismo1: ['Islas de piedra flotan sobre la nada. Desde abajo, alguien susurra.', 'Stone islands float over nothing. From below, someone whispers.'],
  a5_abismo2: ['Los susurros ya no vienen de abajo. Vienen de tu Marca.', 'The whispers no longer come from below. They come from your Mark.'],
  a5_rio: ['Un río de fuego líquido corta la llanura. Las orillas están llenas de huellas.', 'A river of liquid fire cuts across the plain. Its banks are full of footprints.'],
  a5_fragua: ['Aquí Ozmaren forjó las cadenas de los sellos. El yunque todavía está caliente.', 'Here Ozmaren forged the chains of the seals. The anvil is still warm.'],
  a1_paramo: ['La lluvia cae tibia. Huele a ceniza mojada.', 'The rain falls warm. It smells of wet ash.'],
  a1_guarida: ['Algo mastica en la oscuridad. No para cuando entras.', 'Something chews in the dark. It does not stop when you enter.'],
  a1_cementerio: ['Las tumbas están abiertas desde adentro.', 'The graves are open from the inside.'],
  a1_abadia1: ['Las velas siguen encendidas. Nadie las prendió.', 'The candles are still lit. No one lit them.'],
  a1_abadia2: ['Alguien canta en el claustro. De noche.', 'Someone is singing in the cloister. At night.'],
  a1_cata1: ['Se escucha una piedra de afilar.', 'You hear a whetstone.'],
  a1_pozo: ['El calor sube del fondo. La Marca en tu brazo late.', 'Heat rises from below. The Mark on your arm throbs.'],
  a2_dunas: ['El viento borra tus huellas apenas las dejas.', 'The wind erases your footprints as soon as you make them.'],
  a2_oasis_muerto: ['El agua es negra y quieta como un ojo.', 'The water is black and still, like an eye.'],
  a2_tumbas1: ['Huele a canela. Y a algo dulce.', 'It smells of cinnamon. And of something sweet.'],
  a2_tumbas2: ['Tu sombra tiembla. Como si quisiera irse.', 'Your shadow trembles. As if it wants to leave.'],
  a3_selva: ['Los pájaros se callan cuando pasas.', 'The birds fall silent as you pass.'],
  a3_pantano: ['El barro dice tu nombre. No contestes.', 'The mud speaks your name. Do not answer.'],
  a3_templo1: ['Los escalones bajan más de lo que la tierra permite.', 'The steps go deeper than the earth allows.'],
  a3_templo2: ['Las paredes respiran.', 'The walls are breathing.'],
  a4_picos: ['El frío corta. En la nieve hay pisadas de niño, descalzo.', 'The cold cuts. In the snow there are a child\'s barefoot prints.'],
  a4_hielo1: ['En el hielo hay caras. Te siguen con los ojos.', 'There are faces in the ice. Their eyes follow you.'],
  a4_hielo2: ['Un trono vacío. Una corona en el suelo.', 'An empty throne. A crown on the floor.'],
  a5_llanuras: ['El cielo es una herida que no cierra.', 'The sky is a wound that does not close.'],
  a5_santuario1: ['La Marca arde. Algo te llama hijo.', 'The Mark burns. Something calls you child.'],
  a5_santuario2: ['Has llegado. Tiene sed.', 'You have arrived. It is thirsty.'],
};

/** Frases que el jefe dice al verte. */
export const FRASE_JEFE: Record<string, [string, string]> = {
  verdugo: ['¡Otro cuello! ¡Otro cuello para la piedra!', 'Another neck! Another neck for the stone!'],
  abadesa: ['Hija mía, ¿vienes a rezar? Aquí abajo ya no hace falta.', 'My child, have you come to pray? Down here there is no need.'],
  rey_sin_sombra: ['Devuélveme lo que es mío. Tu sombra servirá.', 'Give back what is mine. Your shadow will do.'],
  madre_cienaga: ['Otro hijo. Ven. Mamá tiene hambre.', 'Another child. Come. Mother is hungry.'],
  rey_escarcha: ['Juré no levantarme. Mentí.', 'I swore never to rise. I lied.'],
  arana_reina: ['Tantos hijos con hambre... y llegas tú, tan lleno.', 'So many hungry children... and here you come, so full.'],
  gusano_de_arena: ['(La arena tiembla. Algo enorme respira debajo de ti.)', '(The sand trembles. Something enormous breathes beneath you.)'],
  dragon_oseo: ['Morí antes de que tu raza aprendiera el fuego. Él me devolvió el aliento.', 'I died before your kind learned fire. He gave me back my breath.'],
  heraldo: ['Yo canté de noche. Yo la llamé.', 'I sang at night. I called her.'],
  campana_ahoga: ['Toca conmigo. El mar escucha cuando tocamos juntas.', 'Ring with me. The sea listens when we ring together.'],
  aun_saar: ['Tengo sed desde antes de que existiera el agua. Ven. Tú eres lo que me falta.', 'I have thirsted since before water existed. Come. You are what I lack.'],
  senor_demonio: ['Llevas mi ceniza en la piel. Ven, vuelve a mí.', 'You wear my ash on your skin. Come, return to me.'],
};

export const INTRO: [string, string][] = [
  ['Hubo un tiempo en que el valle de Velmora solo le temía al invierno.', 'There was a time when the valley of Velmora feared only winter.'],
  ['Los monjes de Santa Oria tocaban las campanas al alba, y nadie preguntaba por qué la abadía se alzó sobre un pozo sellado.', 'The monks of Santa Oria rang the bells at dawn, and no one asked why the abbey was raised over a sealed well.'],
  ['Nadie recordaba el voto de los primeros hermanos: no cantar nunca de noche.', 'No one remembered the vow of the first brothers: never sing at night.'],
  ['La noche de la última cosecha, el cielo se abrió.', 'On the night of the last harvest, the sky opened.'],
  ['Una brasa cayó, lenta, como si buscara algo.', 'An ember fell, slowly, as if it were searching for something.'],
  ['Cayó en el claustro. Y las campanas doblaron solas.', 'It fell into the cloister. And the bells tolled on their own.'],
  ['Al amanecer, los monjes ya no estaban. Y el valle empezó a arder sin fuego.', 'By dawn, the monks were gone. And the valley began to burn without fire.'],
  ['Los que sobrevivieron llevan ceniza en la piel. La llaman la Marca.', 'Those who survived carry ash on their skin. They call it the Mark.'],
  ['Tú también la tienes.', 'You bear it too.'],
  ['Y en el fondo del pozo, algo que esperaba mil inviernos abrió los ojos.', 'And at the bottom of the well, something that had waited a thousand winters opened its eyes.'],
];

/** Páginas arrancadas del diario del primer abad: se encuentran en libros malditos y cuentan el secreto. */
export const PAGINAS: [string, string][] = [
  ['«Día uno. Cavamos donde cayó. La tierra estaba tibia a veinte palmos. El hermano Ulric dice que oyó un latido.»', '"Day one. We dug where it fell. The earth was warm twenty spans down. Brother Ulric says he heard a heartbeat."'],
  ['«No es una piedra. Es un pedazo de algo. Cuando le rezamos, se enfría. Cuando callamos, crece.»', '"It is not a stone. It is a piece of something. When we pray to it, it cools. When we fall silent, it grows."'],
  ['«Decidimos cantar. Siete voces, siete cantos, siete pozos. Uno por cada pedazo. Nadie fuera del claustro debe saberlo.»', '"We decided to sing. Seven voices, seven songs, seven wells. One for each piece. No one outside the cloister must know."'],
  ['«Ulric dejó de cantar una noche. Lo encontramos con la boca llena de ceniza. Sonreía.»', '"Ulric stopped singing one night. We found him with his mouth full of ash. He was smiling."'],
  ['«Los reyes del sur aceptaron un pedazo a cambio de oro. No entendieron. Uno de ellos ya no proyecta sombra.»', '"The southern kings took a piece in exchange for gold. They did not understand. One of them no longer casts a shadow."'],
  ['«La Marca aparece en los que la miran demasiado. Es una llave. Si todas las brasas se juntan, la llave abre.»', '"The Mark appears on those who look at it too long. It is a key. If all the embers come together, the key opens."'],
  ['«El nombre. No lo escribiré. Basta decir que tiene sed, y que la sed no se apaga matándolo. Se apaga olvidándolo.»', '"The name. I will not write it. Enough to say it is thirsty, and that the thirst is not quenched by killing it. It is quenched by forgetting it."'],
  ['«Si lees esto, la abadía cayó. Busca al niño que no habla. Él lo vio todo, y por eso le quitamos la voz.»', '"If you read this, the abbey has fallen. Seek the child who does not speak. He saw everything, and that is why we took his voice."'],
  ['«Cayó una segunda brasa. No cayó aquí. Sigue cayendo. Tarda mil años en llegar.»', '"A second ember fell. It did not fall here. It is still falling. It takes a thousand years to arrive."'],
];

// ------------------------------------------------------------------ diarios de los sellos
/** Un diario por acto: se lee en los libros malditos de las zonas de ese acto, antes que las páginas del abad. */
export const DIARIOS: Record<number, { titulo: [string, string]; paginas: [string, string][] }> = {
  1: { titulo: ['Cuaderno de la hermana Ívola, campanera', 'Notebook of Sister Ivola, Bell-Ringer'], paginas: [
    ['«Soy la que toca las campanas al alba. Nunca de noche. Ese es el voto. Esta noche alguien tocó la campana pequeña, la de vísperas. Cuando subí al campanario no había nadie.»', '"I am the one who rings the bells at dawn. Never at night. That is the vow. Tonight someone rang the small bell, the vespers bell. When I climbed the tower there was no one."'],
    ['«Es el novicio Vesperio. Lo oí cantar en el claustro, bajito, con la cara pegada a la piedra del pozo. Le pregunté a quién le cantaba. Me dijo: "A la que escucha".»', '"It is the novice Vesperio. I heard him singing in the cloister, softly, his face pressed to the stone of the well. I asked him who he sang to. He said: \'To the one who listens.\'"'],
    ['«La Abadesa sostuvo la brasa y no se quemó. Dijo que el primer sello no era el pozo, era nuestro silencio. Y el silencio ya estaba roto. Raspo mi nombre de la lápida antes de que ella lo aprenda.»', '"The Abbess held the ember and did not burn. She said the first seal was not the well, it was our silence. And the silence was already broken. I am scraping my name from my tombstone before she learns it."'],
  ] },
  2: { titulo: ['Tablillas de Tahem, escriba del Rey', 'Tablets of Tahem, Scribe of the King'], paginas: [
    ['«Año treinta del reinado. Los monjes del norte trajeron una piedra que ardía en una caja de plomo. El Rey pagó con oro y con la promesa de guardarla bajo su sueño.»', '"Year thirty of the reign. The monks from the north brought a stone that burned in a lead box. The King paid in gold and with the promise to keep it beneath his sleep."'],
    ['«El Rey ya no proyecta sombra. Dice que la vendió para dormir más hondo. Yo vi a la sombra irse. Caminaba hacia la caja de plomo.»', '"The King no longer casts a shadow. He says he sold it to sleep deeper. I saw the shadow leave. It walked toward the lead box."'],
    ['«Hoy vino un hombre pálido que cantaba en una lengua del norte. Las momias le abrieron la puerta. El segundo sello no se rompió. Lo invitaron a romperse.»', '"Today a pale man came singing in a northern tongue. The mummies opened the door for him. The second seal did not break. It was invited to break."'],
  ] },
  3: { titulo: ['Bitácora de la capitana Ama Oyá', 'Log of Captain Ama Oya'], paginas: [
    ['«Llevamos una caja de plomo río arriba, por encargo de unos monjes. Nadie de la tripulación quiere dormir cerca de ella. Dicen que la caja respira.»', '"We carry a lead box upriver, commissioned by some monks. No one in the crew wants to sleep near it. They say the box breathes."'],
    ['«La sacerdotisa del templo la recibió llorando. Dijo que su diosa era madre de todo lo que nace del barro, y que ahora tendría un hijo de fuego.»', '"The temple priestess received it weeping. She said her goddess was mother to all things born of mud, and that now she would bear a child of fire."'],
    ['«La ciudad se hundió en una noche. Desde el barco vimos las torres entrar al agua, despacio, con las campanas sonando. Si mi hija lee esto: no vuelvas al templo. Nunca.»', '"The city sank in a single night. From the ship we watched the towers go into the water, slowly, with the bells ringing. If my daughter reads this: never go back to the temple. Never."'],
  ] },
  4: { titulo: ['Runas de la guardia de Hjaldur', 'Runes of Hjaldur\'s Guard'], paginas: [
    ['«Hjaldur se sentó sobre el sello y juró no levantarse. Nosotros juramos quedarnos de pie a su lado. Eso fue hace trescientos inviernos.»', '"Hjaldur sat upon the seal and swore never to rise. We swore to stand beside him. That was three hundred winters ago."'],
    ['«El rey ya no tiene frío. Eso es lo que nos asusta. Dice que la brasa bajo el trono le habla de un dios allá arriba, sentado en un trono de oro, que se muere de sed desde antes del mundo.»', '"The king no longer feels cold. That is what frightens us. He says the ember beneath the throne speaks to him of a god far above, seated on a throne of gold, dying of thirst since before the world."'],
    ['«Un hombre pálido subió la montaña descalzo. Le cantó al rey una canción de cuna. El rey se levantó. Nosotros seguimos de pie. No sabemos hacer otra cosa.»', '"A pale man climbed the mountain barefoot. He sang the king a lullaby. The king rose. We are still standing. We do not know how to do anything else."'],
    ['«Las brasas no son el dios. Son su sed, que se le cayó del pecho como una lágrima de fuego. Si alguna vez se juntan todas, él va a sentir que vuelve a tener boca.»', '"The embers are not the god. They are his thirst, which fell from his chest like a tear of fire. If they ever come together, he will feel that he has a mouth again."'],
  ] },
  5: { titulo: ['Libro de horas del Último Coro', 'Book of Hours of the Last Choir'], paginas: [
    ['«Ozmaren no es un demonio. Es la sed de Aun-Saar, el dios hambriento, hecha carne para bajar a beber. La partimos en brasas para que ninguna recordara a las otras.»', '"Ozmaren is not a demon. It is the thirst of Aun-Saar, the starving god, made flesh to come down and drink. We split it into embers so that none would remember the others."'],
    ['«Eran cinco brasas en cinco sellos. Pero hubo una sexta, la más pequeña, que no pudimos encerrar. Se metió en la piel de una criatura dormida, en el valle. Esa criatura no lo sabe.»', '"There were five embers in five seals. But there was a sixth, the smallest, which we could not imprison. It slipped into the skin of a sleeping child, in the valley. The child does not know."'],
    ['«La ceniza de los sobrevivientes es solo ceniza. Pero en uno de ellos la Marca no se apaga. Esa es la sexta brasa. Quien la lleve podrá apagar la sed para siempre, o terminar de encenderla. Que el portador elija. Nosotros ya no podemos.»', '"The ash on the survivors is only ash. But on one of them the Mark does not fade. That is the sixth ember. Whoever bears it can put out the thirst forever, or finish lighting it. Let the bearer choose. We no longer can."'],
  ] },
  6: { titulo: ['Registro de la campanera de Ysmeral', 'Register of the Bell-Keeper of Ysmeral'], paginas: [
    ['«Ysmeral no tiene muralla. Tiene campanas. Mientras suenen, el mar respeta la orilla. Así lo pactó la primera sacerdotisa con lo que vive en el fondo.»', '"Ysmeral has no wall. It has bells. As long as they ring, the sea respects the shore. So the first priestess agreed with what lives at the bottom."'],
    ['«Cayó una luz del cielo sobre el mar y el mar tuvo sed. La sacerdotisa mayor se ató a la campana grande con cadenas de plata y tocó tres días sin parar. Al tercer día las manos ya eran bronce.»', '"A light fell from the sky upon the sea and the sea grew thirsty. The high priestess chained herself to the great bell with silver chains and rang for three days without rest. By the third day her hands were bronze."'],
    ['«Nos hundimos cenando. Nadie corrió. Debajo del agua la campana sigue sonando, y cada vez que suena, el agua sube un palmo hacia el cielo. Creo que no quiere ahogarnos. Creo que quiere llevarnos arriba, a quien tiene sed.»', '"We sank at supper. No one ran. Beneath the water the bell keeps ringing, and every time it rings, the water rises a span toward the sky. I do not think it wants to drown us. I think it wants to carry us up, to the one who thirsts."'],
  ] },
  7: { titulo: ['Tablillas de los que subieron', 'Tablets of Those Who Climbed'], paginas: [
    ['«Somos siete y subimos con la Marca. Dicen que el dios nos espera porque somos pedazos suyos. Eskel tiene miedo. Yo también, pero canto.»', '"We are seven and we climb with the Mark. They say the god awaits us because we are pieces of him. Eskel is afraid. So am I, but I sing."'],
    ['«Aun-Saar no tiene ojos. Tiene una boca en el lugar del corazón. Habla con la voz de todos los que alguna vez tuvieron sed: el náufrago, el enfermo, el niño que llora de noche.»', '"Aun-Saar has no eyes. He has a mouth where his heart should be. He speaks with the voice of everyone who has ever been thirsty: the castaway, the sick, the child crying at night."'],
    ['«Llegué al último escalón. Está en blanco. Entendí que no es para mí. Bajo la vista y veo mi propia estatua formándose en el jardín. No es una tumba. Es un aviso para el que venga después.»', '"I reached the last step. It is blank. I understood it is not for me. I look down and see my own statue forming in the garden. It is not a grave. It is a warning for whoever comes after."'],
  ] },
};

// ------------------------------------------------------------------ fantasmas que repiten su última escena
/** Al acercarte, la figura pálida dice sus últimas palabras, repite su muerte y se desvanece. */
export const FANTASMAS: { id: string; zona: string; sprite: string; texto: [string, string] }[] = [
  { id: 'f_cementerio', zona: 'a1_cementerio', sprite: 'cultista', texto: ['Cierren las puertas. Algo sube por el pozo y sabe nuestros nombres.', 'Shut the doors. Something is climbing the well and it knows our names.'] },
  { id: 'f_bosque', zona: 'a1_bosque', sprite: 'penitente', texto: ['No fui yo. Fue la campana. Ella me pidió la soga.', 'It was not me. It was the bell. She asked me for the rope.'] },
  { id: 'f_abadia', zona: 'a1_abadia2', sprite: 'monja_hueca', texto: ['Hermano Vesperio, no cantes. Es de noche. Por favor, no cantes.', 'Brother Vesperio, do not sing. It is night. Please, do not sing.'] },
  { id: 'f_oasis', zona: 'a2_oasis_muerto', sprite: 'saqueador', texto: ['El agua estaba negra. Bebí igual. Tenía tanta sed.', 'The water was black. I drank anyway. I was so thirsty.'] },
  { id: 'f_hundida', zona: 'a3_hundida1', sprite: 'ahogado', texto: ['Las campanas sonaban bajo el agua. Bajé a ver quién las tocaba.', 'The bells were ringing beneath the water. I went down to see who rang them.'] },
  { id: 'f_glaciar', zona: 'a4_glaciar', sprite: 'escarchado', texto: ['¿Hijo? ¿Eres tú? Te busqué toda la noche. Ya no siento las manos.', 'Son? Is that you? I searched for you all night. I can no longer feel my hands.'] },
  { id: 'f_llanuras', zona: 'a5_llanuras', sprite: 'caballero_abismo', texto: ['Juramos que no lo despertaríamos. Lo juramos cantando.', 'We swore we would not wake it. We swore it singing.'] },
  { id: 'f_barrio', zona: 'a6_barrio1', sprite: 'ahogado', texto: ['Siéntate, la sopa se enfría. ¿Por qué hay agua en el pan?', 'Sit down, the soup is getting cold. Why is there water in the bread?'] },
  { id: 'f_jardin', zona: 'a7_jardin', sprite: 'sacerdote_caido', texto: ['Yo también subí, ¿sabes? Antes de cantar de noche. Él me dijo que tenía sed, y yo le creí.', 'I climbed too, you know. Before I sang at night. He told me he was thirsty, and I believed him.'] },
];

// ------------------------------------------------------------------ el heraldo de Ozmaren
/** Vesperio, el novicio que cantó de noche. Aparece antes del jefe de cada acto y huye, hasta la Fragua. */
export const HERALDO = {
  id: 'heraldo',
  zonas: { 1: 'a1_cata1', 2: 'a2_tumbas1', 3: 'a3_templo1', 4: 'a4_hielo1', 5: 'a5_fragua' } as Record<number, string>,
  /** Acto en el que pelea hasta morir. */
  final: 5,
  encuentro: {
    1: ['Yo canté de noche. Yo la llamé. ¿Vienes a darme las gracias?', 'I sang at night. I called her. Have you come to thank me?'],
    2: ['El rey vendió su sombra por dormir. ¿Qué venderás tú, cuando tengas sed?', 'The king sold his shadow to sleep. What will you sell, when you are thirsty?'],
    3: ['La Madre me cantaba cuando yo era niño. Ahora le canto yo a ella.', 'The Mother sang to me when I was a child. Now I sing to her.'],
    4: ['Hjaldur juró no levantarse. Yo le enseñé que los juramentos se derriten.', 'Hjaldur swore never to rise. I taught him that oaths melt.'],
    5: ['Aquí forjó las cadenas. Aquí se rompe la última. ¿Todavía no lo sabes? La llave eres tú.', 'Here he forged the chains. Here the last one breaks. Do you still not know? The key is you.'],
  } as Record<number, [string, string]>,
  huida: {
    1: ['Todavía no. Él quiere verte entero cuando llegues.', 'Not yet. He wants you whole when you arrive.'],
    2: ['La arena me guarda un sitio. Nos vemos más abajo.', 'The sand keeps a place for me. We will meet further down.'],
    3: ['El agua me lleva. Siempre me lleva adonde tú vas.', 'The water carries me. It always carries me where you are going.'],
    4: ['Corre al trono. Yo te espero donde todo arde.', 'Run to the throne. I will wait for you where everything burns.'],
  } as Record<number, [string, string]>,
  muerte: ['Canté... para que alguien me escuchara... Tu Marca... no es ceniza... nunca lo fue...', 'I sang... so that someone would listen... Your Mark... is not ash... it never was...'] as [string, string],
};

// ------------------------------------------------------------------ cinemáticas entre actos
/** Tomas que se ven al cerrar un acto (clave: el acto que se cierra). Escena del motor, semilla y la voz. */
export interface TomaEntreacto { escena: string; seed: number; texto: [string, string]; textoSegun?: Partial<Record<FinalElegido, [string, string]>>; figura?: string }
export const ENTREACTO: Record<number, TomaEntreacto[]> = {
  1: [
    { escena: 'catacumbas', seed: 3, texto: ['La Abadesa cayó. La brasa no.', 'The Abbess fell. The ember did not.'] },
    { escena: 'catedral', seed: 5, texto: ['Subió por el pozo como una chispa que se niega a morir, y en el claustro las campanas doblaron una última vez.', 'It rose up the well like a spark that refuses to die, and in the cloister the bells tolled one last time.'] },
    { escena: 'desierto', seed: 4, texto: ['Tomó el camino del sur, hacia Sahrim, donde los reyes no mueren. Solo duermen.', 'It took the southern road, toward Sahrim, where kings do not die. They only sleep.'] },
    { escena: 'tumba', seed: 2, figura: 'heraldo', texto: ['Y en tu brazo, la Marca se calentó un poco más.', 'And on your arm, the Mark grew a little warmer.'] },
  ],
  2: [
    { escena: 'tumba', seed: 6, texto: ['Khamer-Ul volvió al polvo, sin sombra que lo acompañara.', 'Khamer-Ul returned to dust, with no shadow to keep him company.'] },
    { escena: 'desierto', seed: 9, texto: ['La brasa siguió el río hacia el este, donde la selva respira y el agua sangra.', 'The ember followed the river east, where the jungle breathes and the water bleeds.'] },
    { escena: 'templo', seed: 3, texto: ['Oyá desató las amarras. Nadie habló durante el viaje.', 'Oya cast off the moorings. No one spoke during the voyage.'] },
    { escena: 'templo', seed: 7, figura: 'heraldo', texto: ['Detrás del barco, algo pálido caminaba sobre el agua, cantando.', 'Behind the ship, something pale walked upon the water, singing.'] },
  ],
  3: [
    { escena: 'templo', seed: 5, texto: ['La Madre calló. El río se aclaró, aunque todavía sabe a hierro.', 'The Mother fell silent. The river cleared, though it still tastes of iron.'] },
    { escena: 'nieve', seed: 2, texto: ['Al norte, en Hrimgard, un rey que juró no levantarse ya caminaba sobre la nieve.', 'In the north, in Hrimgard, a king who swore never to rise was already walking on the snow.'] },
    { escena: 'nieve', seed: 8, texto: ['Dicen que el frío conserva todo. Hasta las promesas rotas.', 'They say the cold preserves everything. Even broken promises.'] },
  ],
  4: [
    { escena: 'nieve', seed: 4, texto: ['Cuatro sellos rotos. Cuatro brasas sueltas que buscan volver a juntarse.', 'Four seals broken. Four loose embers seeking to come together again.'] },
    { escena: 'infierno', seed: 3, texto: ['Sobre la Herida, el cielo se abrió como una boca que no termina de gritar.', 'Above the Wound, the sky opened like a mouth that never finishes screaming.'] },
    { escena: 'fortaleza', seed: 2, texto: ['En el Bastión del Último Coro, una sola voz sigue cantando.', 'In the Bastion of the Last Choir, a single voice keeps singing.'] },
    { escena: 'infierno', seed: 6, figura: 'ozmaren', texto: ['Tu Marca ya no duele. Late. Y algo, del otro lado, te llama hijo.', 'Your Mark no longer hurts. It beats. And something, on the other side, calls you child.'] },
  ],
  5: [
    { escena: 'infierno', seed: 8, texto: ['Ozmaren cayó. La sed que bajó a beber se quedó sin boca.', 'Ozmaren fell. The thirst that came down to drink was left without a mouth.'],
      textoSegun: { destruir: ['Ozmaren cayó, y la Brasa se apagó en tu puño. Tu Marca quedó gris, como un nombre olvidado.', 'Ozmaren fell, and the Ember went out in your fist. Your Mark turned grey, like a forgotten name.'], absorber: ['Ozmaren cayó, y la Brasa entró en ti. Desde entonces tu sombra es tibia.', 'Ozmaren fell, and the Ember entered you. Since then your shadow has been warm.'] } },
    { escena: 'cementerio', seed: 7, texto: ['Esa noche, muy al norte, el mar se partió en dos.', 'That night, far to the north, the sea split in two.'] },
    { escena: 'catedral', seed: 9, texto: ['Del fondo subió Ysmeral, la Ciudad Ahogada, con sus campanas todavía sonando.', 'From the depths rose Ysmeral, the Drowned City, its bells still ringing.'] },
    { escena: 'campamento', seed: 4, texto: ['El barco de Oyá quedó varado en su costa. Desde la proa, las campanas parecían llamar a alguien.', 'Oya\'s ship ran aground on its coast. From the prow, the bells seemed to be calling someone.'] },
  ],
  6: [
    { escena: 'catedral', seed: 4, texto: ['La Campana calló. El mar volvió a su lugar, como un perro que reconoce a su amo.', 'The Bell fell silent. The sea returned to its place, like a dog that knows its master.'] },
    { escena: 'arcano', seed: 3, texto: ['Entonces el cielo se rompió como un vidrio, y detrás del vidrio había escalones de oro.', 'Then the sky broke like glass, and behind the glass there were steps of gold.'] },
    { escena: 'fortaleza', seed: 6, texto: ['Arriba, en un trono que tiene sed desde antes del mundo, Aun-Saar abrió la boca que tiene en el pecho.', 'Above, on a throne that has thirsted since before the world, Aun-Saar opened the mouth in his chest.'] },
    { escena: 'arcano', seed: 8, figura: 'aun_saar', texto: ['Y por primera vez en mil inviernos, dijo una palabra. Era tu nombre.', 'And for the first time in a thousand winters, he spoke a word. It was your name.'],
      textoSegun: { destruir: ['Y por primera vez en mil inviernos, preguntó por el pedazo que le faltaba. Preguntó por ti.', 'And for the first time in a thousand winters, he asked for the piece he was missing. He asked for you.'], absorber: ['Y por primera vez en mil inviernos, sonrió. Ya sabía que su sed venía en camino.', 'And for the first time in a thousand winters, he smiled. He knew his thirst was on its way.'] } },
  ],
};

// ------------------------------------------------------------------ la revelación (al caer Ozmaren) y los finales (al caer Aun-Saar)
export const REVELACION: [string, string][] = [
  ['Ozmaren cae. Su cuerpo se deshace en ceniza, y de la ceniza rueda una brasa hasta tus pies.', 'Ozmaren falls. Its body crumbles into ash, and from the ash an ember rolls to your feet.'],
  ['Tu Marca responde. Late al mismo ritmo. Entonces entiendes lo que Vesperio quiso decirte antes de morir.', 'Your Mark answers. It beats in the same rhythm. Then you understand what Vesperio tried to tell you before he died.'],
  ['La Marca nunca fue ceniza. Es un pedazo de la Brasa. El más pequeño. El que los monjes no pudieron encerrar.', 'The Mark was never ash. It is a piece of the Ember. The smallest. The one the monks could not imprison.'],
  ['La Brasa te habla con tu propia voz. Puedes apagarla para siempre, y apagar con ella lo que llevas adentro. O puedes tomarla, y que la sed sea tuya.', 'The Ember speaks to you in your own voice. You can put it out forever, and put out with it what you carry inside. Or you can take it, and let the thirst be yours.'],
];
export const OPCIONES_BRASA: Record<FinalElegido, [string, string]> = { destruir: ['Destruir la Brasa', 'Destroy the Ember'], absorber: ['Absorber la Brasa', 'Absorb the Ember'] };
export const TRAS_ELEGIR: Record<FinalElegido, [string, string]> = {
  destruir: ['Cierras la mano y aprietas hasta que la Brasa deja de latir. Tu Marca se pone gris y fría. Muy arriba, algo siente que le falta un pedazo.', 'You close your hand and squeeze until the Ember stops beating. Your Mark turns grey and cold. Far above, something feels a piece of itself go missing.'],
  absorber: ['Llevas la Brasa a tu pecho y la Marca la bebe como agua en el desierto. La sed entra en ti. Es tuya. Muy arriba, algo sonríe.', 'You bring the Ember to your chest and the Mark drinks it like water in the desert. The thirst enters you. It is yours. Far above, something smiles.'],
};
export const EPILOGO: Record<FinalElegido, { titulo: [string, string]; lineas: [string, string][] }> = {
  destruir: { titulo: ['La Hoguera', 'The Pyre'], lineas: [
    ['Aun-Saar cae de su trono. Busca en ti el pedazo que le faltaba, y no lo encuentra. Tu Marca está apagada.', 'Aun-Saar falls from his throne. He searches you for the piece he was missing, and does not find it. Your Mark is dark.'],
    ['Sin nada que beber, la sed se apaga como una vela bajo el agua. Las islas de oro se enfrían y el cielo se cierra despacio, como una herida.', 'With nothing to drink, the thirst goes out like a candle under water. The isles of gold grow cold and the sky closes slowly, like a wound.'],
    ['En Velmora las campanas callan para siempre. Tomás habla en voz alta, y la primera palabra que dice es tu nombre.', 'In Velmora the bells fall silent forever. Tomas speaks aloud, and the first word he says is your name.'],
    ['Nadie vuelve a pronunciar el nombre del dios. Así se apaga la sed: olvidándola.', 'No one speaks the god\'s name again. That is how the thirst goes out: by being forgotten.'],
    ['Pero muy arriba, en otro cielo, una segunda brasa sigue cayendo. Tardará mil años en llegar.', 'But far above, in another sky, a second ember is still falling. It will take a thousand years to arrive.'],
  ] },
  absorber: { titulo: ['La Corona de Ceniza', 'The Crown of Ash'], lineas: [
    ['Aun-Saar cae de su trono, y su sed busca un cuerpo nuevo. Ya lo tiene. Es el tuyo.', 'Aun-Saar falls from his throne, and his thirst seeks a new body. It already has one. It is yours.'],
    ['Te sientas en el Trono Sediento. La sed ya no tiene otro nombre que el tuyo, y por eso no puede volver a bajar.', 'You sit upon the Thirsting Throne. The thirst has no name but yours now, and so it can never come down again.'],
    ['Velmora no vuelve a arder. Pero de noche nadie se acerca al fuego, y cuando el viento sopla desde el norte, las campanas contestan solas.', 'Velmora never burns again. But at night no one goes near the fire, and when the wind blows from the north, the bells answer on their own.'],
    ['Ysolde guarda sus cartas para siempre. Dice que ya no ve la cura ni la herida. Solo te ve a ti, arriba, esperando.', 'Ysolde puts away her cards forever. She says she no longer sees the cure or the wound. She sees only you, above, waiting.'],
    ['Muy lejos, en otro cielo, una segunda brasa cambia de rumbo. Ahora sabe adónde ir.', 'Far away, in another sky, a second ember changes course. Now it knows where to go.'],
  ] },
};
