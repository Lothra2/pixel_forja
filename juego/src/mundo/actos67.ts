// Actos 6 y 7: Ysmeral, la Ciudad Ahogada, y la Corona del Dios Sediento. Se suman al mundo al importarse.
import type { DefZona } from './zona';
import { ZONAS, POBL_ZONA, PUEBLO_DE, ENTRADA_ZONA } from './actos';
import { MONSTRUOS, POBLACION, type DefMonstruo } from '../datos/monstruos';

const Z = (d: DefZona) => d;
const NUEVAS: DefZona[] = [
  Z({ id: 'a6_barco', nombre: ['El Barco Varado', 'The Stranded Ship'], acto: 6, nivel: 45, tipo: 'pueblo', tema: 'ahogada', tam: [14, 14], piedraViaje: true, lluvia: true,
    salidas: [{ destino: 'a6_costa', entrada: 'o', lado: 'e', nombre: ['Costa de los Naufragios', 'Shipwreck Coast'] }] }),
  Z({ id: 'a6_costa', nombre: ['La Costa de los Naufragios', 'The Shipwreck Coast'], acto: 6, nivel: 46, tipo: 'exterior', tema: 'ahogada', tam: [26, 26], piedraViaje: true, lluvia: true, niebla: 0.45,
    salidas: [{ destino: 'a6_barco', entrada: 'e', lado: 'o', nombre: ['El Barco Varado', 'The Stranded Ship'] }, { destino: 'a6_barrio1', entrada: 'o', lado: 'e', nombre: ['El Barrio Sumergido', 'The Sunken Quarter'] }, { destino: 'a6_faro', entrada: 'arriba', lado: 'abajo', nombre: ['El Faro Apagado', 'The Dark Lighthouse'] }, { destino: 'a6_arrecife', entrada: 'n', lado: 's', nombre: ['El Arrecife de Huesos', 'The Bone Reef'] }] }),
  Z({ id: 'a6_faro', nombre: ['El Faro Apagado', 'The Dark Lighthouse'], acto: 6, nivel: 47, tipo: 'mazmorra', tema: 'catedral_ahogada', tam: [16, 16], jefe: 'ahogado', lateral: true, oscuridad: 0.88,
    salidas: [{ destino: 'a6_costa', entrada: 'salida_a6_faro', lado: 'arriba', nombre: ['Costa', 'Coast'] }] }),
  Z({ id: 'a6_arrecife', nombre: ['El Arrecife de Huesos', 'The Bone Reef'], acto: 6, nivel: 48, tipo: 'exterior', tema: 'ahogada', tam: [22, 22], jefe: 'cangrejo_cripta', lateral: true, niebla: 0.6, densidad: 1.2,
    salidas: [{ destino: 'a6_costa', entrada: 's', lado: 'n', nombre: ['Costa', 'Coast'] }] }),
  Z({ id: 'a6_barrio1', nombre: ['El Barrio Sumergido: las Calles Mojadas', 'The Sunken Quarter: the Wet Streets'], acto: 6, nivel: 48, tipo: 'exterior', tema: 'ahogada', tam: [26, 26], piedraViaje: true, lluvia: true, niebla: 0.5, vinetas: ['cementerio', 'templo'],
    salidas: [{ destino: 'a6_costa', entrada: 'e', lado: 'o', nombre: ['Costa', 'Coast'] }, { destino: 'a6_barrio2', entrada: 'o', lado: 'e', nombre: ['La Plaza de las Ánimas', 'The Square of Souls'] }, { destino: 'a6_criptas', entrada: 'arriba', lado: 'abajo', nombre: ['Criptas Inundadas', 'Flooded Crypts'] }] }),
  Z({ id: 'a6_criptas', nombre: ['Las Criptas Inundadas', 'The Flooded Crypts'], acto: 6, nivel: 49, tipo: 'mazmorra', tema: 'catedral_ahogada', tam: [20, 20],
    salidas: [{ destino: 'a6_barrio1', entrada: 'salida_a6_criptas', lado: 'arriba', nombre: ['Barrio Sumergido', 'Sunken Quarter'] }, { destino: 'a6_criptas2', entrada: 'arriba', lado: 'abajo', nombre: ['El Osario Ahogado', 'The Drowned Ossuary'] }] }),
  Z({ id: 'a6_criptas2', nombre: ['Las Criptas: el Osario Ahogado', 'The Crypts: the Drowned Ossuary'], acto: 6, nivel: 50, tipo: 'mazmorra', tema: 'catedral_ahogada', tam: [16, 16], jefe: 'monja_hueca', lateral: true, oscuridad: 0.9,
    salidas: [{ destino: 'a6_criptas', entrada: 'abajo', lado: 'arriba', nombre: ['Criptas Inundadas', 'Flooded Crypts'] }] }),
  Z({ id: 'a6_barrio2', nombre: ['El Barrio Sumergido: la Plaza de las Ánimas', 'The Sunken Quarter: the Square of Souls'], acto: 6, nivel: 50, tipo: 'exterior', tema: 'ahogada', tam: [24, 24], piedraViaje: true, niebla: 0.55,
    salidas: [{ destino: 'a6_barrio1', entrada: 'e', lado: 'o', nombre: ['Calles Mojadas', 'Wet Streets'] }, { destino: 'a6_catedral1', entrada: 'arriba', lado: 'abajo', nombre: ['Catedral de las Campanas Ahogadas', 'Cathedral of the Drowned Bells'] }] }),
  Z({ id: 'a6_catedral1', nombre: ['Catedral de las Campanas Ahogadas: la Nave', 'Cathedral of the Drowned Bells: the Nave'], acto: 6, nivel: 51, tipo: 'mazmorra', tema: 'catedral_ahogada', tam: [22, 22], piedraViaje: true,
    salidas: [{ destino: 'a6_barrio2', entrada: 'salida_a6_catedral1', lado: 'arriba', nombre: ['Plaza de las Ánimas', 'Square of Souls'] }, { destino: 'a6_catedral2', entrada: 'arriba', lado: 'abajo', nombre: ['El Campanario Hundido', 'The Sunken Belfry'] }] }),
  Z({ id: 'a6_catedral2', nombre: ['Catedral: el Campanario Hundido', 'Cathedral: the Sunken Belfry'], acto: 6, nivel: 53, tipo: 'mazmorra', tema: 'catedral_ahogada', tam: [18, 18], jefe: 'campana_ahoga', oscuridad: 0.88,
    salidas: [{ destino: 'a6_catedral1', entrada: 'abajo', lado: 'arriba', nombre: ['La Nave', 'The Nave'] }] }),
  Z({ id: 'a7_campamento', nombre: ['El Campamento de la Escalera Rota', 'Camp of the Broken Stair'], acto: 7, nivel: 54, tipo: 'pueblo', tema: 'celestial', tam: [14, 14], piedraViaje: true, ceniza: true,
    salidas: [{ destino: 'a7_cielo', entrada: 'o', lado: 'e', nombre: ['El Cielo Roto', 'The Broken Sky'] }] }),
  Z({ id: 'a7_cielo', nombre: ['El Cielo Roto', 'The Broken Sky'], acto: 7, nivel: 55, tipo: 'exterior', tema: 'celestial', tam: [26, 26], piedraViaje: true, ceniza: true,
    salidas: [{ destino: 'a7_campamento', entrada: 'e', lado: 'o', nombre: ['El Campamento', 'The Camp'] }, { destino: 'a7_islas1', entrada: 'o', lado: 'e', nombre: ['Islas de Oro en Ruinas', 'Isles of Ruined Gold'] }, { destino: 'a7_boveda', entrada: 'arriba', lado: 'abajo', nombre: ['La Bóveda de los Astros', 'The Vault of Stars'] }] }),
  Z({ id: 'a7_boveda', nombre: ['La Bóveda de los Astros', 'The Vault of Stars'], acto: 7, nivel: 56, tipo: 'mazmorra', tema: 'celestial_interior', tam: [18, 18], jefe: 'lich', lateral: true,
    salidas: [{ destino: 'a7_cielo', entrada: 'salida_a7_boveda', lado: 'arriba', nombre: ['Cielo Roto', 'Broken Sky'] }] }),
  Z({ id: 'a7_islas1', nombre: ['Islas de Oro en Ruinas: el Puente Quebrado', 'Isles of Ruined Gold: the Broken Bridge'], acto: 7, nivel: 57, tipo: 'mazmorra', tema: 'celestial_islas', tam: [24, 24], piedraViaje: true, densidad: 1.2,
    salidas: [{ destino: 'a7_cielo', entrada: 'e', lado: 'o', nombre: ['Cielo Roto', 'Broken Sky'] }, { destino: 'a7_islas2', entrada: 'o', lado: 'e', nombre: ['Las Islas Altas', 'The High Isles'] }] }),
  Z({ id: 'a7_islas2', nombre: ['Islas de Oro en Ruinas: las Islas Altas', 'Isles of Ruined Gold: the High Isles'], acto: 7, nivel: 58, tipo: 'mazmorra', tema: 'celestial_islas', tam: [24, 24], ceniza: true,
    salidas: [{ destino: 'a7_islas1', entrada: 'e', lado: 'o', nombre: ['Puente Quebrado', 'Broken Bridge'] }, { destino: 'a7_jardin', entrada: 'o', lado: 'e', nombre: ['Jardín de los que Intentaron', 'Garden of Those Who Tried'] }, { destino: 'a7_relicario', entrada: 'arriba', lado: 'abajo', nombre: ['El Relicario del Sediento', 'Reliquary of the Thirsting'] }] }),
  Z({ id: 'a7_relicario', nombre: ['El Relicario del Sediento', 'Reliquary of the Thirsting'], acto: 7, nivel: 59, tipo: 'mazmorra', tema: 'celestial_interior', tam: [18, 18], jefe: 'caballero_abismo', lateral: true,
    salidas: [{ destino: 'a7_islas2', entrada: 'salida_a7_relicario', lado: 'arriba', nombre: ['Islas Altas', 'High Isles'] }] }),
  Z({ id: 'a7_jardin', nombre: ['El Jardín de los que Intentaron', 'The Garden of Those Who Tried'], acto: 7, nivel: 59, tipo: 'exterior', tema: 'celestial', tam: [24, 24], piedraViaje: true, niebla: 0.35, densidad: 1.3,
    salidas: [{ destino: 'a7_islas2', entrada: 'e', lado: 'o', nombre: ['Islas Altas', 'High Isles'] }, { destino: 'a7_escaleras', entrada: 'arriba', lado: 'abajo', nombre: ['Las Escaleras al Trono', 'The Stairs to the Throne'] }] }),
  Z({ id: 'a7_escaleras', nombre: ['Las Escaleras al Trono', 'The Stairs to the Throne'], acto: 7, nivel: 60, tipo: 'mazmorra', tema: 'celestial_interior', tam: [22, 22], piedraViaje: true,
    salidas: [{ destino: 'a7_jardin', entrada: 'salida_a7_escaleras', lado: 'arriba', nombre: ['Jardín', 'Garden'] }, { destino: 'a7_trono', entrada: 'arriba', lado: 'abajo', nombre: ['El Trono Sediento', 'The Thirsting Throne'] }] }),
  Z({ id: 'a7_trono', nombre: ['El Trono Sediento', 'The Thirsting Throne'], acto: 7, nivel: 62, tipo: 'mazmorra', tema: 'celestial_interior', tam: [18, 18], jefe: 'aun_saar', ceniza: true,
    salidas: [{ destino: 'a7_escaleras', entrada: 'abajo', lado: 'arriba', nombre: ['Escaleras', 'Stairs'] }] }),
];
for (const z of NUEVAS) ZONAS[z.id] = z;
PUEBLO_DE[6] = 'a6_barco';
PUEBLO_DE[7] = 'a7_campamento';

// jefes nuevos (hasta que la Forja entregue sus modelos usan cuerpos de jefes existentes, teñidos y a otra escala)
const M = (m: DefMonstruo) => m;
const JEFES: DefMonstruo[] = [
  M({ id: 'campana_ahoga', sprite: 'jefe_campana_ahoga', nombre: ['La Campana que Ahoga', 'The Drowning Bell'], vida: 6200, dano: [34, 66], elem: 'frio', def: 120, vel: 2.2, ia: 'jefe', rango: 9, proyectil: 'hielo', xp: 42000, jefe: true, sonido: 'metal', res: { frio: 70, rayo: 30 }, invoca: 'ahogado', huella: 3.5, area: 3, escala: 1.15 }),
  M({ id: 'aun_saar', sprite: 'jefe_aun_saar', nombre: ['Aun-Saar, el Dios Sediento', 'Aun-Saar, the Thirsting God'], vida: 7800, dano: [44, 88], elem: 'luz', def: 150, vel: 2.4, ia: 'jefe', rango: 10, proyectil: 'luz', xp: 80000, jefe: true, sonido: 'carne', res: { luz: 70, fuego: 50, sombra: 50 }, invoca: 'mano_dorada', huella: 5, area: 3.5, escala: 0.7 }),
];
for (const j of JEFES) (MONSTRUOS as Record<string, DefMonstruo>)[j.id] = j;

// monstruos propios de Ysmeral y de la Corona (la Forja, catalogo/monstruos67.ts). La vida y el daño base ya son de su acto.
(MONSTRUOS as Record<string, DefMonstruo>)['ahogado_campanero'] = M({ id: 'ahogado_campanero', sprite: 'ahogado_campanero', nombre: ['Ahogado campanero', 'Drowned bell-ringer'], vida: 130, dano: [14, 26], elem: 'frio', def: 36, vel: 2.0, ia: 'bruto', xp: 90, sonido: 'metal', res: { frio: 50, fuego: -20 } });
(MONSTRUOS as Record<string, DefMonstruo>)['marinero_percebe'] = M({ id: 'marinero_percebe', sprite: 'marinero_percebe', nombre: ['Marinero de percebes', 'Barnacled sailor'], vida: 110, dano: [15, 27], def: 40, vel: 2.4, ia: 'normal', xp: 85, sonido: 'hueso', res: { frio: 40, fisico: 15 } });
(MONSTRUOS as Record<string, DefMonstruo>)['sirena_hueca'] = M({ id: 'sirena_hueca', sprite: 'sirena_hueca', nombre: ['Sirena hueca', 'Hollow siren'], vida: 70, dano: [12, 22], elem: 'frio', def: 22, vel: 2.6, ia: 'distancia', rango: 8, proyectil: 'hielo', xp: 90, sonido: 'carne', res: { frio: 60 } });
(MONSTRUOS as Record<string, DefMonstruo>)['sacerdote_marea'] = M({ id: 'sacerdote_marea', sprite: 'sacerdote_marea', nombre: ['Sacerdote de la marea', 'Tide priest'], vida: 95, dano: [12, 22], elem: 'frio', def: 28, vel: 2.2, ia: 'invocador', rango: 8, proyectil: 'hielo', invoca: 'ahogado', xp: 120, sonido: 'carne', res: { frio: 60, sombra: 30 } });
(MONSTRUOS as Record<string, DefMonstruo>)['cangrejo_relicario'] = M({ id: 'cangrejo_relicario', sprite: 'cangrejo_relicario', nombre: ['Cangrejo relicario', 'Reliquary crab'], vida: 220, dano: [18, 32], def: 70, vel: 1.8, ia: 'bruto', xp: 150, sonido: 'metal', huella: 2.5, res: { fisico: 30, frio: 50 } });
(MONSTRUOS as Record<string, DefMonstruo>)['suplicante_animado'] = M({ id: 'suplicante_animado', sprite: 'suplicante_animado', nombre: ['Suplicante animado', 'Animated supplicant'], vida: 180, dano: [20, 36], elem: 'sombra', def: 60, vel: 2.0, ia: 'normal', xp: 150, sonido: 'metal', res: { fisico: 25, sombra: 40 } });
(MONSTRUOS as Record<string, DefMonstruo>)['angel_sediento'] = M({ id: 'angel_sediento', sprite: 'angel_sediento', nombre: ['Ángel sediento', 'Thirsting angel'], vida: 210, dano: [22, 40], elem: 'luz', def: 60, vel: 3.2, ia: 'normal', rango: 7, proyectil: 'luz', xp: 190, sonido: 'carne', huella: 2, res: { luz: 60, fuego: 30 } });
(MONSTRUOS as Record<string, DefMonstruo>)['guardian_halo'] = M({ id: 'guardian_halo', sprite: 'guardian_halo', nombre: ['Guardián del halo', 'Halo warden'], vida: 170, dano: [22, 38], elem: 'luz', def: 64, vel: 2.6, ia: 'normal', rango: 6, proyectil: 'luz', xp: 170, sonido: 'metal', res: { luz: 60, fisico: 20 } });
(MONSTRUOS as Record<string, DefMonstruo>)['sediento'] = M({ id: 'sediento', sprite: 'sediento', nombre: ['Sediento', 'Thirster'], vida: 60, dano: [12, 22], elem: 'sangre', def: 20, vel: 4.6, ia: 'enjambre', xp: 60, sonido: 'carne', res: { sangre: 40 } });
(MONSTRUOS as Record<string, DefMonstruo>)['mano_dorada'] = M({ id: 'mano_dorada', sprite: 'mano_dorada', nombre: ['Mano dorada', 'Golden hand'], vida: 240, dano: [26, 46], elem: 'luz', def: 80, vel: 2.2, ia: 'bruto', xp: 200, sonido: 'metal', huella: 2, res: { fisico: 30, luz: 50 } });
POBLACION.costa = ['marinero_percebe', 'ahogado_campanero', 'cangrejo_relicario', 'sirena_hueca', 'ahogado'];
POBLACION.barrio = ['ahogado_campanero', 'sirena_hueca', 'marinero_percebe', 'sacerdote_marea', 'cangrejo_relicario'];
POBLACION.catedral_ahogada = ['ahogado_campanero', 'sacerdote_marea', 'sirena_hueca', 'marinero_percebe', 'monja_hueca'];
POBLACION.cielo = ['suplicante_animado', 'sediento', 'angel_sediento', 'guardian_halo', 'mano_dorada'];
POBLACION.islas = ['sediento', 'suplicante_animado', 'guardian_halo', 'angel_sediento', 'mano_dorada'];
POBLACION.trono = ['guardian_halo', 'suplicante_animado', 'mano_dorada', 'angel_sediento', 'sediento'];
Object.assign(POBL_ZONA, {
  a6_costa: 'costa', a6_faro: 'catedral_ahogada', a6_arrecife: 'costa', a6_barrio1: 'barrio', a6_criptas: 'catedral_ahogada', a6_criptas2: 'catedral_ahogada', a6_barrio2: 'barrio', a6_catedral1: 'catedral_ahogada', a6_catedral2: 'catedral_ahogada',
  a7_cielo: 'cielo', a7_boveda: 'trono', a7_islas1: 'islas', a7_islas2: 'islas', a7_relicario: 'trono', a7_jardin: 'islas', a7_escaleras: 'trono', a7_trono: 'trono',
});
Object.assign(ENTRADA_ZONA, {
  a6_costa: ['Los cascos de mil barcos asoman de la arena mojada. Todos miran al norte.', 'The hulls of a thousand ships jut from the wet sand. All of them face north.'],
  a6_faro: ['La lámpara del faro está hecha de dientes. Alguien la sigue limpiando.', 'The lighthouse lamp is made of teeth. Someone still keeps it clean.'],
  a6_arrecife: ['No es coral. Son costillas, crecidas unas sobre otras durante siglos.', 'It is not coral. It is ribs, grown one over another for centuries.'],
  a6_barrio1: ['Las puertas están abiertas y las mesas puestas. La ciudad se hundió a la hora de la cena.', 'The doors are open and the tables are set. The city sank at supper time.'],
  a6_criptas: ['El agua sube y baja con un ritmo lento, como si la cripta respirara.', 'The water rises and falls slowly, as if the crypt were breathing.'],
  a6_criptas2: ['Los huesos flotan en orden, como si alguien los hubiera acomodado.', 'The bones float in order, as if someone had arranged them.'],
  a6_barrio2: ['En la plaza se oye una campana. Viene de abajo del agua.', 'In the square a bell tolls. It comes from beneath the water.'],
  a6_catedral1: ['Los bancos están llenos. Nadie levanta la cabeza.', 'The pews are full. No one raises their head.'],
  a6_catedral2: ['Cada golpe de la campana te quita el aire del pecho.', 'Each strike of the bell steals the air from your chest.'],
  a7_cielo: ['El cielo está roto como un vidrio. Del otro lado no hay nada, y la nada tiene sed.', 'The sky is broken like glass. On the other side there is nothing, and the nothing is thirsty.'],
  a7_boveda: ['Estrellas encerradas en jaulas de oro. Algunas todavía laten.', 'Stars locked in golden cages. Some still pulse.'],
  a7_islas1: ['Islas de oro flotan sobre el vacío. El oro está tibio, como una piel.', 'Isles of gold float over the void. The gold is warm, like skin.'],
  a7_islas2: ['Más arriba el aire sabe a ceniza dulce.', 'Higher up the air tastes of sweet ash.'],
  a7_relicario: ['Aquí guardaban lo que el dios bebió: copas vacías, miles.', 'Here they kept what the god drank: empty cups, thousands.'],
  a7_jardin: ['Estatuas de los que subieron antes que tú. Todas tienen tu Marca.', 'Statues of those who climbed before you. All of them bear your Mark.'],
  a7_escaleras: ['Cada escalón tiene un nombre grabado. El último está en blanco.', 'Every step bears a carved name. The last one is blank.'],
  a7_trono: ['El Trono Sediento te estaba esperando. Siempre te estuvo esperando.', 'The Thirsting Throne was waiting for you. It was always waiting.'],
} as Record<string, [string, string]>);
import './misiones_historia';
