// Los cinco actos: zonas, cómo se unen, misiones y la historia que se cuenta en cada una.
import type { DefZona } from './zona';

const Z = (d: DefZona) => d;
export const ZONAS: Record<string, DefZona> = Object.fromEntries([
  // ============================================================== ACTO 1: Velmora
  Z({ id: 'a1_refugio', nombre: ['El Refugio de los Cenicientos', 'The Ashen Refuge'], acto: 1, nivel: 1, tipo: 'pueblo', tema: 'paramo', tam: [14, 14], piedraViaje: true, lluvia: true,
    salidas: [{ destino: 'a1_paramo', entrada: 'o', lado: 'e', nombre: ['Páramo de Velmora', 'Velmora Moor'] }] }),
  Z({ id: 'a1_paramo', nombre: ['Páramo de Velmora', 'Velmora Moor'], acto: 1, nivel: 2, tipo: 'exterior', tema: 'paramo', tam: [26, 26], piedraViaje: true, lluvia: true, niebla: 0.25,
    salidas: [{ destino: 'a1_refugio', entrada: 'e', lado: 'o', nombre: ['El Refugio', 'The Refuge'] }, { destino: 'a1_cementerio', entrada: 'o', lado: 'e', nombre: ['Camposanto de Santa Oria', 'Santa Oria Churchyard'] }, { destino: 'a1_guarida', entrada: 'arriba', lado: 'abajo', nombre: ['La Guarida del Hambre', 'The Hunger Den'] }] }),
  Z({ id: 'a1_guarida', nombre: ['La Guarida del Hambre', 'The Hunger Den'], acto: 1, nivel: 3, tipo: 'mazmorra', tema: 'cueva', tam: [16, 16], jefe: 'arana_reina',
    salidas: [{ destino: 'a1_paramo', entrada: 'boca', lado: 'arriba', nombre: ['Páramo de Velmora', 'Velmora Moor'] }] }),
  Z({ id: 'a1_cementerio', nombre: ['Camposanto de Santa Oria', 'Santa Oria Churchyard'], acto: 1, nivel: 5, tipo: 'exterior', tema: 'cementerio', tam: [24, 24], piedraViaje: true, niebla: 0.45,
    salidas: [{ destino: 'a1_paramo', entrada: 'e', lado: 'o', nombre: ['Páramo de Velmora', 'Velmora Moor'] }, { destino: 'a1_abadia1', entrada: 'arriba', lado: 'abajo', nombre: ['Abadía de Santa Oria', 'Abbey of Santa Oria'] }] }),
  Z({ id: 'a1_abadia1', nombre: ['Abadía: la Nave del Silencio', 'Abbey: the Nave of Silence'], acto: 1, nivel: 7, tipo: 'mazmorra', tema: 'abadia', tam: [20, 20], piedraViaje: true,
    salidas: [{ destino: 'a1_cementerio', entrada: 'boca', lado: 'arriba', nombre: ['Camposanto', 'Churchyard'] }, { destino: 'a1_abadia2', entrada: 'arriba', lado: 'abajo', nombre: ['Claustro profanado', 'Defiled Cloister'] }] }),
  Z({ id: 'a1_abadia2', nombre: ['Abadía: el Claustro Profanado', 'Abbey: the Defiled Cloister'], acto: 1, nivel: 9, tipo: 'mazmorra', tema: 'abadia', tam: [20, 20],
    salidas: [{ destino: 'a1_abadia1', entrada: 'abajo', lado: 'arriba', nombre: ['La Nave', 'The Nave'] }, { destino: 'a1_cata1', entrada: 'arriba', lado: 'abajo', nombre: ['Catacumbas', 'Catacombs'] }] }),
  Z({ id: 'a1_cata1', nombre: ['Catacumbas: los Osarios', 'Catacombs: the Ossuaries'], acto: 1, nivel: 11, tipo: 'mazmorra', tema: 'catacumbas', tam: [22, 22], piedraViaje: true, jefe: 'verdugo',
    salidas: [{ destino: 'a1_abadia2', entrada: 'abajo', lado: 'arriba', nombre: ['Claustro', 'Cloister'] }, { destino: 'a1_pozo', entrada: 'arriba', lado: 'abajo', nombre: ['El Pozo de la Brasa', 'The Ember Well'] }] }),
  Z({ id: 'a1_pozo', nombre: ['El Pozo de la Brasa', 'The Ember Well'], acto: 1, nivel: 13, tipo: 'mazmorra', tema: 'catacumbas', tam: [16, 16], jefe: 'abadesa', oscuridad: 0.86,
    salidas: [{ destino: 'a1_cata1', entrada: 'abajo', lado: 'arriba', nombre: ['Osarios', 'Ossuaries'] }] }),
  // ============================================================== ACTO 2: Sahrim
  Z({ id: 'a2_oasis', nombre: ['El Oasis de Qadir', 'The Oasis of Qadir'], acto: 2, nivel: 14, tipo: 'pueblo', tema: 'desierto', tam: [14, 14], piedraViaje: true,
    salidas: [{ destino: 'a2_dunas', entrada: 'n', lado: 's', nombre: ['Dunas de Sahrim', 'Sahrim Dunes'] }] }),
  Z({ id: 'a2_dunas', nombre: ['Las Dunas de Sahrim', 'The Sahrim Dunes'], acto: 2, nivel: 15, tipo: 'exterior', tema: 'desierto', tam: [28, 28], piedraViaje: true,
    salidas: [{ destino: 'a2_oasis', entrada: 's', lado: 'n', nombre: ['El Oasis', 'The Oasis'] }, { destino: 'a2_oasis_muerto', entrada: 'o', lado: 'e', nombre: ['El Oasis Muerto', 'The Dead Oasis'] }] }),
  Z({ id: 'a2_oasis_muerto', nombre: ['El Oasis Muerto', 'The Dead Oasis'], acto: 2, nivel: 17, tipo: 'exterior', tema: 'desierto', tam: [24, 24], piedraViaje: true, jefe: 'gusano_de_arena',
    salidas: [{ destino: 'a2_dunas', entrada: 'e', lado: 'o', nombre: ['Dunas', 'Dunes'] }, { destino: 'a2_tumbas1', entrada: 'arriba', lado: 'abajo', nombre: ['Tumbas de los Reyes', 'Tombs of the Kings'] }] }),
  Z({ id: 'a2_tumbas1', nombre: ['Tumbas: la Galería de los Dormidos', 'Tombs: Gallery of the Sleepers'], acto: 2, nivel: 19, tipo: 'mazmorra', tema: 'tumba', tam: [22, 22], piedraViaje: true,
    salidas: [{ destino: 'a2_oasis_muerto', entrada: 'boca', lado: 'arriba', nombre: ['El Oasis Muerto', 'The Dead Oasis'] }, { destino: 'a2_tumbas2', entrada: 'arriba', lado: 'abajo', nombre: ['Cámara del Rey', 'King\'s Chamber'] }] }),
  Z({ id: 'a2_tumbas2', nombre: ['La Cámara del Rey sin Sombra', 'Chamber of the Shadowless King'], acto: 2, nivel: 21, tipo: 'mazmorra', tema: 'tumba', tam: [18, 18], jefe: 'rey_sin_sombra',
    salidas: [{ destino: 'a2_tumbas1', entrada: 'abajo', lado: 'arriba', nombre: ['Galería', 'Gallery'] }] }),
  // ============================================================== ACTO 3: Yhuantl
  Z({ id: 'a3_muelle', nombre: ['El Muelle de Kesh', 'Kesh Landing'], acto: 3, nivel: 22, tipo: 'pueblo', tema: 'selva', tam: [14, 14], piedraViaje: true, lluvia: true,
    salidas: [{ destino: 'a3_selva', entrada: 'o', lado: 'e', nombre: ['Selva de Yhuantl', 'Yhuantl Jungle'] }] }),
  Z({ id: 'a3_selva', nombre: ['La Selva de Yhuantl', 'The Yhuantl Jungle'], acto: 3, nivel: 23, tipo: 'exterior', tema: 'selva', tam: [26, 26], piedraViaje: true, lluvia: true, niebla: 0.3,
    salidas: [{ destino: 'a3_muelle', entrada: 'e', lado: 'o', nombre: ['El Muelle', 'The Landing'] }, { destino: 'a3_pantano', entrada: 'n', lado: 's', nombre: ['El Manglar Negro', 'The Black Mangrove'] }] }),
  Z({ id: 'a3_pantano', nombre: ['El Manglar Negro', 'The Black Mangrove'], acto: 3, nivel: 25, tipo: 'exterior', tema: 'selva', tam: [24, 24], piedraViaje: true, niebla: 0.5, jefe: 'bruja',
    salidas: [{ destino: 'a3_selva', entrada: 's', lado: 'n', nombre: ['Selva', 'Jungle'] }, { destino: 'a3_templo1', entrada: 'arriba', lado: 'abajo', nombre: ['Templo de Yhuantl', 'Temple of Yhuantl'] }] }),
  Z({ id: 'a3_templo1', nombre: ['Templo: los Escalones Hundidos', 'Temple: the Sunken Steps'], acto: 3, nivel: 27, tipo: 'mazmorra', tema: 'templo', tam: [22, 22], piedraViaje: true,
    salidas: [{ destino: 'a3_pantano', entrada: 'boca', lado: 'arriba', nombre: ['Manglar', 'Mangrove'] }, { destino: 'a3_templo2', entrada: 'arriba', lado: 'abajo', nombre: ['El Vientre', 'The Womb'] }] }),
  Z({ id: 'a3_templo2', nombre: ['Templo: el Vientre de la Madre', 'Temple: the Mother\'s Womb'], acto: 3, nivel: 29, tipo: 'mazmorra', tema: 'templo', tam: [18, 18], jefe: 'madre_cienaga',
    salidas: [{ destino: 'a3_templo1', entrada: 'abajo', lado: 'arriba', nombre: ['Escalones', 'Steps'] }] }),
  // ============================================================== ACTO 4: Hrimgard
  Z({ id: 'a4_fortin', nombre: ['El Fortín de Vel', 'Vel Fort'], acto: 4, nivel: 30, tipo: 'pueblo', tema: 'nieve', tam: [14, 14], piedraViaje: true, nieve: true,
    salidas: [{ destino: 'a4_picos', entrada: 's', lado: 'n', nombre: ['Picos de Hrimgard', 'Hrimgard Peaks'] }] }),
  Z({ id: 'a4_picos', nombre: ['Los Picos de Hrimgard', 'The Hrimgard Peaks'], acto: 4, nivel: 31, tipo: 'exterior', tema: 'nieve', tam: [26, 26], piedraViaje: true, nieve: true, niebla: 0.35,
    salidas: [{ destino: 'a4_fortin', entrada: 'n', lado: 's', nombre: ['El Fortín', 'The Fort'] }, { destino: 'a4_hielo1', entrada: 'arriba', lado: 'abajo', nombre: ['Cuevas de Hielo', 'Ice Caves'] }] }),
  Z({ id: 'a4_hielo1', nombre: ['Las Cuevas del Aliento Helado', 'Caves of the Frozen Breath'], acto: 4, nivel: 33, tipo: 'mazmorra', tema: 'hielo', tam: [22, 22], piedraViaje: true,
    salidas: [{ destino: 'a4_picos', entrada: 'boca', lado: 'arriba', nombre: ['Picos', 'Peaks'] }, { destino: 'a4_hielo2', entrada: 'arriba', lado: 'abajo', nombre: ['El Trono Helado', 'The Frozen Throne'] }] }),
  Z({ id: 'a4_hielo2', nombre: ['El Trono de Hjaldur', 'Hjaldur\'s Throne'], acto: 4, nivel: 35, tipo: 'mazmorra', tema: 'hielo', tam: [18, 18], jefe: 'rey_escarcha',
    salidas: [{ destino: 'a4_hielo1', entrada: 'abajo', lado: 'arriba', nombre: ['Cuevas', 'Caves'] }] }),
  // ============================================================== ACTO 5: La Herida
  Z({ id: 'a5_bastion', nombre: ['El Bastión del Último Coro', 'Bastion of the Last Choir'], acto: 5, nivel: 36, tipo: 'pueblo', tema: 'infierno', tam: [14, 14], piedraViaje: true, ceniza: true,
    salidas: [{ destino: 'a5_llanuras', entrada: 'o', lado: 'e', nombre: ['Llanuras de Ceniza', 'Ash Plains'] }] }),
  Z({ id: 'a5_llanuras', nombre: ['Las Llanuras de Ceniza', 'The Ash Plains'], acto: 5, nivel: 38, tipo: 'exterior', tema: 'infierno', tam: [26, 26], piedraViaje: true, ceniza: true,
    salidas: [{ destino: 'a5_bastion', entrada: 'e', lado: 'o', nombre: ['El Bastión', 'The Bastion'] }, { destino: 'a5_santuario1', entrada: 'arriba', lado: 'abajo', nombre: ['La Herida', 'The Wound'] }] }),
  Z({ id: 'a5_santuario1', nombre: ['La Herida: la Garganta', 'The Wound: the Throat'], acto: 5, nivel: 41, tipo: 'mazmorra', tema: 'santuario', tam: [22, 22], piedraViaje: true, ceniza: true, jefe: 'dragon_oseo',
    salidas: [{ destino: 'a5_llanuras', entrada: 'boca', lado: 'arriba', nombre: ['Llanuras', 'Plains'] }, { destino: 'a5_santuario2', entrada: 'arriba', lado: 'abajo', nombre: ['El Corazón de la Brasa', 'The Ember Heart'] }] }),
  Z({ id: 'a5_santuario2', nombre: ['El Corazón de la Brasa', 'The Ember Heart'], acto: 5, nivel: 44, tipo: 'mazmorra', tema: 'santuario', tam: [18, 18], jefe: 'senor_demonio', ceniza: true,
    salidas: [{ destino: 'a5_santuario1', entrada: 'abajo', lado: 'arriba', nombre: ['La Garganta', 'The Throat'] }] }),
].map((z) => [z.id, z]));

/** Monstruos por zona (claves de POBLACION en datos/monstruos). */
export const POBL_ZONA: Record<string, string> = {
  a1_paramo: 'paramo', a1_guarida: 'cueva_hambre', a1_cementerio: 'cementerio', a1_abadia1: 'abadia1', a1_abadia2: 'abadia2', a1_cata1: 'catacumbas1', a1_pozo: 'catacumbas2',
  a2_dunas: 'dunas', a2_oasis_muerto: 'oasis_muerto', a2_tumbas1: 'tumbas1', a2_tumbas2: 'tumbas2',
  a3_selva: 'selva', a3_pantano: 'pantano', a3_templo1: 'templo1', a3_templo2: 'templo2',
  a4_picos: 'picos', a4_hielo1: 'cuevas_hielo1', a4_hielo2: 'cuevas_hielo2',
  a5_llanuras: 'llanuras_ceniza', a5_santuario1: 'santuario1', a5_santuario2: 'santuario2',
};
export const PUEBLO_DE: Record<number, string> = { 1: 'a1_refugio', 2: 'a2_oasis', 3: 'a3_muelle', 4: 'a4_fortin', 5: 'a5_bastion' };
export const MUSICA_ACTO = (acto: number, tipo: string) => (tipo === 'pueblo' ? `campamento${acto}` : tipo === 'mazmorra' ? (acto === 1 ? 'mazmorra' : `acto${acto}`) : `acto${acto}`);

// ------------------------------------------------------------------ misiones
export interface Mision {
  id: string; acto: number; nombre: [string, string];
  /** Lo que pide el que da la misión y lo que dice cuando vuelves. */
  pedido: [string, string]; hecho: [string, string];
  objetivo: { tipo: 'matar'; zona: string; monstruo: string; nombreUnico?: [string, string] } | { tipo: 'llegar'; zona: string };
  premio: { habilidad?: number; atributos?: number; vida?: number; oro?: number; objeto?: 'raro' | 'unico' | 'conjunto'; resistencia?: number };
  /** Al terminarla se abre el siguiente acto. */
  cierraActo?: boolean;
}
export const MISIONES: Mision[] = [
  { id: 'm1_hambre', acto: 1, nombre: ['El hambre bajo el páramo', 'The Hunger Beneath the Moor'],
    pedido: ['Hay una cueva en el páramo. De ahí salen arañas del tamaño de un perro y los que comen a los muertos. Algo grande teje allá abajo. Los pastores la llaman la Madre del Pozo. Mátala y el páramo respirará un poco.', 'There is a cave on the moor. Spiders the size of dogs crawl out of it, and the corpse-eaters with them. Something big weaves down below. The shepherds call it the Well Mother. Kill it and the moor will breathe a little.'],
    hecho: ['Siento el aire más liviano. Toma, esto es lo único que sé enseñar: cómo aprender más rápido.', 'The air feels lighter. Here, this is the only thing I know how to teach: how to learn faster.'],
    objetivo: { tipo: 'matar', zona: 'a1_guarida', monstruo: 'arana_reina' }, premio: { habilidad: 1 } },
  { id: 'm1_campanas', acto: 1, nombre: ['Las campanas mudas', 'The Silent Bells'],
    pedido: ['La abadía está más allá del camposanto. Alguien tiene que entrar y ver qué quedó. Si encuentras la piedra de viaje de la Nave, enciéndela. Así podremos seguirte.', 'The abbey lies beyond the churchyard. Someone must go in and see what remains. If you find the travel stone in the Nave, light it. Then we can follow you.'],
    hecho: ['Encendiste la piedra. Escuché las campanas desde aquí, una sola vez. Tomás lloró toda la noche. Ten, te lo ganaste.', 'You lit the stone. I heard the bells from here, just once. Tomas cried all night. Here, you earned it.'],
    objetivo: { tipo: 'llegar', zona: 'a1_abadia1' }, premio: { atributos: 5 } },
  { id: 'm1_verdugo', acto: 1, nombre: ['El Verdugo de Velmora', 'The Velmora Headsman'],
    pedido: ['Antes de la brasa, la abadía tenía un verdugo para los herejes. Lo enterraron con su hacha en los osarios. Lys dice que lo oye afilar por las noches. Que deje de afilar.', 'Before the ember, the abbey kept a headsman for heretics. They buried him with his axe in the ossuaries. Lys says she hears him sharpening at night. Make the sharpening stop.'],
    hecho: ['Tenía mi nombre escrito en su hacha. No te asustes, tenía el de todos. Toma esto, era de él.', 'He had my name written on his axe. Do not worry, he had everyone\'s. Take this, it was his.'],
    objetivo: { tipo: 'matar', zona: 'a1_cata1', monstruo: 'verdugo' }, premio: { objeto: 'raro', oro: 500 } },
  { id: 'm1_abadesa', acto: 1, nombre: ['La Brasa en el Pozo', 'The Ember in the Well'], cierraActo: true,
    pedido: ['Bajo los osarios está el pozo. Ilvara está allí abajo con la brasa. Ya no es la Abadesa. Si la dejas, la brasa abre el primer sello y todo el valle se enciende. Ve.', 'Beneath the ossuaries lies the well. Ilvara is down there with the ember. She is no longer the Abbess. If you let her be, the ember opens the first seal and the whole valley ignites. Go.'],
    hecho: ['La brasa se fue antes de que cayera Ilvara. Voló al sur, al desierto de Sahrim. Ysolde la vio en sus cartas. La seguiremos. La piedra de viaje ya conoce el camino.', 'The ember fled before Ilvara fell. It flew south, to the Sahrim desert. Ysolde saw it in her cards. We will follow. The travel stone already knows the way.'],
    objetivo: { tipo: 'matar', zona: 'a1_pozo', monstruo: 'abadesa' }, premio: { habilidad: 1, atributos: 5 } },
  { id: 'm2_saqueador', acto: 2, nombre: ['El agua negra', 'The Black Water'],
    pedido: ['Bajo el Oasis Muerto vive algo que se bebe el agua desde abajo. Los saqueadores la llaman la Boca de Arena. La tierra tiembla antes de que salga. Mientras respire, el agua no vuelve.', 'Beneath the Dead Oasis lives something that drinks the water from below. The raiders call it the Sand Maw. The ground trembles before it rises. While it breathes, the water will not return.'],
    hecho: ['El agua corre clara otra vez, aunque sabe a hierro. Toma, para tu sed y tus heridas.', 'The water runs clear again, though it tastes of iron. Here, for your thirst and your wounds.'],
    objetivo: { tipo: 'matar', zona: 'a2_oasis_muerto', monstruo: 'gusano_de_arena' }, premio: { vida: 20, oro: 1000 } },
  { id: 'm2_rey', acto: 2, nombre: ['El Rey sin Sombra', 'The Shadowless King'], cierraActo: true,
    pedido: ['Khamer-Ul despertó. Su sombra se fue con la brasa hace mil años y ahora volvió a buscarla. Baja a las tumbas y quítale lo que le queda.', 'Khamer-Ul has woken. His shadow left with the ember a thousand years ago and now it has come back for it. Go down to the tombs and take what remains.'],
    hecho: ['Segundo sello roto, pero la brasa escapó otra vez. Ahora va hacia el río, hacia Yhuantl. La capitana Oyá tiene barco. Te espera en Kesh.', 'Second seal broken, but the ember escaped again. Now it heads for the river, to Yhuantl. Captain Oya has a ship. She waits for you at Kesh.'],
    objetivo: { tipo: 'matar', zona: 'a2_tumbas2', monstruo: 'rey_sin_sombra' }, premio: { habilidad: 1, objeto: 'unico' } },
  { id: 'm3_bruja', acto: 3, nombre: ['La voz del manglar', 'The Voice of the Mangrove'],
    pedido: ['En el manglar hay una bruja que llama a los marineros por su nombre. Ya me robó tres. Tráeme su lengua o lo que sea que use para hablar.', 'In the mangrove there is a witch who calls sailors by name. She has taken three of mine. Bring me her tongue, or whatever she speaks with.'],
    hecho: ['Silencio por fin. Toma, Tlalli dice que esto te hará más fuerte.', 'Silence at last. Here, Tlalli says this will make you stronger.'],
    objetivo: { tipo: 'matar', zona: 'a3_pantano', monstruo: 'bruja', nombreUnico: ['La que Llama', 'She Who Calls'] }, premio: { atributos: 5, resistencia: 10 } },
  { id: 'm3_madre', acto: 3, nombre: ['La Madre Ciénaga', 'Mother Mire'], cierraActo: true,
    pedido: ['Bajo el templo vive la Madre. Pare monstruos con el barro de la brasa. Si la matas, el río se limpia y mi barco puede llevarte al norte, a Hrimgard.', 'Beneath the temple lives the Mother. She births monsters from the ember\'s mud. Kill her and the river is cleansed, and my ship can take you north, to Hrimgard.'],
    hecho: ['El río ya no sangra. Sube a bordo. Dicen que en el norte el frío conserva todo, hasta las promesas rotas.', 'The river no longer bleeds. Come aboard. They say in the north the cold preserves everything, even broken promises.'],
    objetivo: { tipo: 'matar', zona: 'a3_templo2', monstruo: 'madre_cienaga' }, premio: { habilidad: 1, objeto: 'conjunto' } },
  { id: 'm4_rey', acto: 4, nombre: ['El trono vacío', 'The Empty Throne'], cierraActo: true,
    pedido: ['Hjaldur dejó el trono de hielo. Los muertos de la montaña lo siguen. Si no vuelve a sentarse, que no se levante nunca más. Tú eliges cómo.', 'Hjaldur left the ice throne. The mountain dead follow him. If he will not sit again, make sure he never stands again. You choose how.'],
    hecho: ['Cuatro sellos. Queda uno: la Herida, donde cayó el dios que tiene sed. Auren te espera en el Bastión. Que la nieve te guarde.', 'Four seals. One remains: the Wound, where the thirsting god fell. Auren awaits you at the Bastion. May the snow keep you.'],
    objetivo: { tipo: 'matar', zona: 'a4_hielo2', monstruo: 'rey_escarcha' }, premio: { habilidad: 1, atributos: 5, objeto: 'unico' } },
  { id: 'm5_dragon', acto: 5, nombre: ['Los huesos que vuelan', 'The Bones That Fly'],
    pedido: ['En la Garganta de la Herida duerme Varnhul, un dragón que murió antes de que existieran los hombres. Ozmaren le prestó aliento. Si llegas al Corazón con él vivo a tus espaldas, no saldrás.', 'In the Throat of the Wound sleeps Varnhul, a dragon that died before men existed. Ozmaren lent it breath. If you reach the Heart with it alive behind you, you will not come out.'],
    hecho: ['El aliento de Varnhul se apagó. Ahora solo queda la sed.', 'Varnhul\'s breath has gone out. Now only the thirst remains.'],
    objetivo: { tipo: 'matar', zona: 'a5_santuario1', monstruo: 'dragon_oseo' }, premio: { atributos: 5, objeto: 'unico' } },
  { id: 'm5_ozmaren', acto: 5, nombre: ['La Sed que Arde', 'The Burning Thirst'], cierraActo: true,
    pedido: ['Ozmaren está entero otra vez, en el Corazón de la Brasa. Tu Marca es la llave que le falta. Si entras, puede que no salgas siendo tú. Pero si no entras, no queda nadie para salir.', 'Ozmaren is whole again, in the Ember Heart. Your Mark is the key it lacks. If you go in, you may not come out as yourself. But if you do not, there will be no one left to come out.'],
    hecho: ['Lo lograste. La Marca en tu piel se puso gris y fría. Escucha: en el valle las campanas sonaron de noche, todas a la vez. Odrán dice que es una despedida. Yo no estoy tan seguro.', 'You did it. The Mark on your skin turned grey and cold. Listen: in the valley the bells rang at night, all at once. Odran says it is a farewell. I am not so sure.'],
    objetivo: { tipo: 'matar', zona: 'a5_santuario2', monstruo: 'senor_demonio' }, premio: { habilidad: 2, atributos: 10, objeto: 'unico' } },
];

/** Lo que se ve al entrar a una zona por primera vez (una línea de ambiente). */
export const ENTRADA_ZONA: Record<string, [string, string]> = {
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
];
