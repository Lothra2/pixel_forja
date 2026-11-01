// Gente de los campamentos: cuerpo (se hornea solo quieto), oficio y lo que dicen.
import type { Cuerpo, Equipo } from '../../../src/engine/gotico/cuerpo';

export type Oficio = 'misiones' | 'curandera' | 'herrero' | 'vidente' | 'relato';
export interface NPC {
  id: string; nombre: [string, string]; oficio: Oficio; cuerpo: Cuerpo; equipo: Equipo;
  /** Saludos que rotan. */
  saludo: [string, string][];
  /** Lo que cuenta si le preguntas por el lugar. */
  relato: [string, string];
}

export const NPCS: Record<string, NPC> = Object.fromEntries(([
  // ----------------------------------------------------------- Acto 1: El Refugio de los Cenicientos
  { id: 'odran', nombre: ['Maestre Odrán', 'Master Odran'], oficio: 'misiones',
    cuerpo: { genero: 'h', piel: 'cu_piel_clara', pelo: 'cu_pelo_blanco', peinado: 'largo', barba: 'larga', joroba: 0.3, musculo: 0.1 },
    equipo: { torso: { tipo: 'tunica', mat: 'cu_tela_parda' }, piernas: { tipo: 'tunica_larga', mat: 'cu_tela_parda' }, cinturon: { mat: 'cuerda' }, arma: { tipo: 'baculo', mango: 'madera_vieja', gema: 'luz_vela' }, izq: { tipo: 'libro', mat: 'cu_cuero' } },
    saludo: [['Acércate. A mi edad la voz no llega lejos, y las paredes de lona escuchan.', 'Come closer. At my age the voice does not carry far, and canvas walls listen.'], ['Llevas la Marca. Igual que todos nosotros. Pero la tuya no se apaga.', 'You bear the Mark. Like all of us. But yours does not fade.']],
    relato: ['Fui archivero de Santa Oria cuarenta años. Los libros más viejos hablaban de un pozo bajo el claustro y de un voto: no cantar de noche. Nunca supe por qué. Ahora creo que el canto era una cerradura.', 'I was archivist of Santa Oria for forty years. The oldest books spoke of a well beneath the cloister and of a vow: never sing at night. I never knew why. Now I believe the singing was a lock.'] },
  { id: 'lys', nombre: ['Hermana Lys', 'Sister Lys'], oficio: 'curandera',
    cuerpo: { genero: 'm', piel: 'cu_piel_clara', pelo: 'cu_pelo_castano', peinado: 'trenzas', musculo: 0.1, ancho: 0.92 },
    equipo: { torso: { tipo: 'vestido', mat: 'cu_tela_blanca' }, cabeza: { tipo: 'capucha', mat: 'cu_tela_blanca' }, cinturon: { mat: 'cu_cuero', hebilla: 'cu_oro' }, izq: { tipo: 'libro', mat: 'cu_cuero' } },
    saludo: [['Siéntate. Déjame ver esas heridas antes de que se pongan grises.', 'Sit. Let me see those wounds before they turn grey.'], ['Fui novicia allá arriba. Salí corriendo la noche de las campanas. No me preguntes qué vi.', 'I was a novice up there. I ran the night the bells rang. Do not ask me what I saw.']],
    relato: ['La Abadesa Ilvara tomó la brasa con las manos desnudas. No se quemó. Sonrió. Esa sonrisa es lo que no me deja dormir.', 'Abbess Ilvara took the ember in her bare hands. She did not burn. She smiled. That smile is what keeps me awake.'] },
  { id: 'brannoc', nombre: ['Brannoc el herrero', 'Brannoc the smith'], oficio: 'herrero',
    cuerpo: { genero: 'h', piel: 'cu_piel', pelo: 'cu_pelo_rojo', peinado: 'rapado', barba: 'trenzada', musculo: 0.9, ancho: 1.15, grasa: 0.3 },
    equipo: { torso: { tipo: 'sin_mangas', mat: 'cu_cuero' }, piernas: { tipo: 'pantalon', mat: 'cu_cuero_negro' }, pies: { tipo: 'botas', mat: 'cu_cuero' }, manos: { tipo: 'guantes', mat: 'cu_cuero' }, cinturon: { mat: 'cu_cuero_negro', hebilla: 'hierro' }, arma: { tipo: 'martillo', mat: 'hierro', mango: 'madera' } },
    saludo: [['El acero no pregunta de qué lado estás. Yo sí. Pero tu plata me sirve igual.', 'Steel does not ask which side you are on. I do. But your silver works all the same.'], ['Tráeme lo que encuentres allá afuera. Hasta el hierro maldito se puede vender.', 'Bring me what you find out there. Even cursed iron can be sold.']],
    relato: ['Mi fragua no prende desde la noche de la brasa. El carbón arde, pero no calienta. Tuve que aprender a forjar con fuego frío.', 'My forge has not lit since the night of the ember. The coal burns but gives no heat. I had to learn to forge with cold fire.'] },
  { id: 'ysolde', nombre: ['Ysolde la vidente', 'Ysolde the seer'], oficio: 'vidente',
    cuerpo: { genero: 'm', piel: 'cu_piel_morena', pelo: 'cu_pelo_negro', peinado: 'largo', musculo: 0, ancho: 0.9 },
    equipo: { torso: { tipo: 'vestido', mat: 'cu_tela_morada' }, cabeza: { tipo: 'turbante', mat: 'cu_tela_negra', mat2: 'cu_ojo_verde' }, cinturon: { mat: 'cu_oro', hebilla: 'magia' }, izq: { tipo: 'orbe', mat: 'magia' } },
    saludo: [['Las cartas ya sabían que vendrías. Las cartas siempre saben. Por eso las cobro caras.', 'The cards knew you would come. The cards always know. That is why I charge dearly.'], ['¿Quieres probar suerte? A veces el destino viene envuelto en trapo viejo.', 'Care to try your luck? Sometimes fate comes wrapped in old rags.']],
    relato: ['Te sigo porque tu Marca brilla en mis visiones. No sé si eres la cura o la herida. Las dos cosas se parecen mucho de lejos.', 'I follow you because your Mark shines in my visions. I do not know if you are the cure or the wound. From afar they look alike.'] },
  { id: 'tomas', nombre: ['Tomás el Mudo', 'Tomas the Mute'], oficio: 'relato',
    cuerpo: { genero: 'h', alto: 0.72, piel: 'cu_piel_clara', pelo: 'cu_pelo_rubio', peinado: 'corto', musculo: 0, ancho: 0.85, cabeza: 1.12 },
    equipo: { torso: { tipo: 'camisa', mat: 'cu_tela_parda' }, piernas: { tipo: 'pantalon', mat: 'cu_tela_parda' }, pies: { tipo: 'vendas', mat: 'cu_tela_blanca' } },
    saludo: [['Tomás no habla. Te muestra un dibujo de carbón: una campana con un ojo adentro.', 'Tomas does not speak. He shows you a charcoal drawing: a bell with an eye inside it.'], ['Tomás dibuja siete figuras con capucha alrededor de un pozo. Una de ellas no tiene cara.', 'Tomas draws seven hooded figures around a well. One of them has no face.']],
    relato: ['Tomás señala tu brazo, donde está la Marca, y después el cielo. Junta las manos como si cayera algo. Después se tapa los oídos.', 'Tomas points at your arm, at the Mark, and then at the sky. He brings his hands together as if something fell. Then he covers his ears.'] },
  // ----------------------------------------------------------- Acto 2: el Oasis de Qadir
  { id: 'qadir', nombre: ['Qadir el aguador', 'Qadir the water-bearer'], oficio: 'misiones',
    cuerpo: { genero: 'h', piel: 'cu_piel_morena', pelo: 'cu_pelo_negro', peinado: 'corto', barba: 'larga', musculo: 0.4 },
    equipo: { torso: { tipo: 'tunica', mat: 'cu_tela_blanca' }, piernas: { tipo: 'tunica_larga', mat: 'cu_tela_blanca' }, cabeza: { tipo: 'turbante', mat: 'cu_tela_azul', mat2: 'cu_oro' }, cinturon: { mat: 'cu_tela_roja' }, arma: { tipo: 'baculo', mango: 'madera_lisa', gema: 'cu_ojo_hielo' } },
    saludo: [['Bebe primero. Aquí nadie habla con la garganta seca.', 'Drink first. Here no one speaks with a dry throat.'], ['El agua del oasis se pone negra a medianoche. Desde que pasó tu brasa.', 'The oasis water turns black at midnight. Ever since your ember passed by.']],
    relato: ['Los reyes de Sahrim no morían. Se dormían y seguían mandando desde abajo. Khamer-Ul vendió su sombra para dormir más hondo que todos. Ahora algo la está usando.', 'The kings of Sahrim did not die. They slept and kept ruling from below. Khamer-Ul sold his shadow to sleep deeper than all. Now something is wearing it.'] },
  { id: 'nahla', nombre: ['Nahla la ungüentera', 'Nahla the salve-maker'], oficio: 'curandera',
    cuerpo: { genero: 'm', piel: 'cu_piel_morena', pelo: 'cu_pelo_negro', peinado: 'cola', musculo: 0.2 },
    equipo: { torso: { tipo: 'vestido', mat: 'cu_tela_roja' }, cabeza: { tipo: 'aro', mat: 'cu_oro' }, cinturon: { mat: 'cu_oro' } },
    saludo: [['Mirra, sal y un poco de veneno. La receta de siempre para seguir vivo.', 'Myrrh, salt and a little poison. The usual recipe for staying alive.']],
    relato: ['Las momias se levantan cuando el viento sopla desde las tumbas. Huelen a canela y a algo dulce que no quiero nombrar.', 'The mummies rise when the wind blows from the tombs. They smell of cinnamon and of something sweet I do not want to name.'] },
  { id: 'barzin', nombre: ['Barzin el forjador', 'Barzin the forger'], oficio: 'herrero',
    cuerpo: { genero: 'h', piel: 'cu_piel_morena', peinado: 'calvo', pelo: 'cu_pelo_negro', barba: 'bigote', musculo: 0.8, ancho: 1.1 },
    equipo: { torso: { tipo: 'sin_mangas', mat: 'cu_tela_parda' }, piernas: { tipo: 'pantalon', mat: 'cu_tela_parda' }, pies: { tipo: 'sandalias', mat: 'cu_cuero' }, manos: { tipo: 'brazales', mat: 'cu_oro' }, arma: { tipo: 'martillo', mat: 'bronce', mango: 'madera' } },
    saludo: [['Bronce para el que tiene prisa, acero para el que piensa volver.', 'Bronze for the hasty, steel for those who plan to come back.']],
    relato: ['Saqué esta hoja de una tumba. Por las noches suda arena.', 'I pulled this blade from a tomb. At night it sweats sand.'] },
  { id: 'cartografo', nombre: ['El cartógrafo ciego', 'The blind cartographer'], oficio: 'relato',
    cuerpo: { genero: 'h', piel: 'cu_piel', pelo: 'cu_pelo_blanco', peinado: 'largo', barba: 'corta', joroba: 0.5, musculo: 0 },
    equipo: { torso: { tipo: 'tunica', mat: 'cu_tela_azul' }, cabeza: { tipo: 'mascara', mat: 'cu_tela_negra' }, izq: { tipo: 'libro', mat: 'cu_cuero' } },
    saludo: [['Dibujo mapas de lugares que todavía no existen. Este de aquí es tu tumba. No te asustes, tiene muchas salidas.', 'I draw maps of places that do not exist yet. This one is your grave. Do not worry, it has many exits.']],
    relato: ['Hay cinco sellos. El de la abadía ya se rompió. Cada vez que uno cae, el mapa del mundo se me borra un poco más.', 'There are five seals. The abbey seal has already broken. Each time one falls, the map of the world fades a little more for me.'] },
  // ----------------------------------------------------------- Acto 3: el Muelle de Kesh
  { id: 'oya', nombre: ['Capitana Oyá', 'Captain Oya'], oficio: 'misiones',
    cuerpo: { genero: 'm', piel: 'cu_piel_morena', pelo: 'cu_pelo_negro', peinado: 'trenzas', musculo: 0.6, ancho: 1 },
    equipo: { torso: { tipo: 'cuero', mat: 'cu_cuero_negro' }, piernas: { tipo: 'calzas', mat: 'cu_tela_roja' }, pies: { tipo: 'botas_altas', mat: 'cu_cuero' }, cinturon: { mat: 'cu_cuero', hebilla: 'cu_oro' }, capa: { mat: 'cu_tela_roja', largo: 0.7 }, arma: { tipo: 'cimitarra', mat: 'cu_placa' } },
    saludo: [['Mi barco sale cuando el río deje de sangrar. O sea, nunca, si no haces algo.', 'My ship sails when the river stops bleeding. So, never, unless you do something.']],
    relato: ['La selva era sagrada antes de ser selva. Bajo las raíces hay escalones. Bajo los escalones hay una madre que no deja de parir.', 'The jungle was sacred before it was a jungle. Beneath the roots there are steps. Beneath the steps there is a mother who never stops giving birth.'] },
  { id: 'tlalli', nombre: ['Tlalli la yerbera', 'Tlalli the herbwife'], oficio: 'curandera',
    cuerpo: { genero: 'm', piel: 'cu_piel_morena', pelo: 'cu_pelo_blanco', peinado: 'largo', joroba: 0.4, musculo: 0 },
    equipo: { torso: { tipo: 'harapos', mat: 'cu_tela_verde' }, cabeza: { tipo: 'aro', mat: 'cu_hueso' }, cinturon: { mat: 'cuerda' }, arma: { tipo: 'baculo', mango: 'corteza', gema: 'fuego_verde' } },
    saludo: [['Las hojas curan. Las raíces matan. Hay que saber dónde cortar.', 'Leaves heal. Roots kill. You must know where to cut.']],
    relato: ['El pantano habla con la voz de los que se hunden. Si oyes tu nombre, no contestes.', 'The marsh speaks with the voices of those who sink. If you hear your name, do not answer.'] },
  { id: 'jorun', nombre: ['Jorun el remendón', 'Jorun the patcher'], oficio: 'herrero',
    cuerpo: { genero: 'h', piel: 'cu_piel_clara', pelo: 'cu_pelo_castano', peinado: 'melena', barba: 'corta', musculo: 0.6 },
    equipo: { torso: { tipo: 'cuero_tachonado', mat: 'cu_cuero' }, piernas: { tipo: 'pantalon', mat: 'cu_tela_verde' }, pies: { tipo: 'botas', mat: 'cu_cuero' }, arma: { tipo: 'hacha', mat: 'hierro', mango: 'madera' } },
    saludo: [['Arreglo lo que sea. Lo que no arreglo lo vendo como antigüedad.', 'I fix anything. What I cannot fix I sell as an antique.']],
    relato: ['Vine a buscar oro en los templos. Encontré un ídolo que me miraba aunque yo me moviera. Lo dejé. Todavía lo siento mirándome.', 'I came looking for gold in the temples. I found an idol whose eyes followed me. I left it. I still feel it watching.'] },
  { id: 'ixel', nombre: ['Hermano Ixel', 'Brother Ixel'], oficio: 'relato',
    cuerpo: { genero: 'h', piel: 'cu_piel_palida', peinado: 'calvo', pelo: 'cu_pelo_negro', musculo: 0.1, ancho: 0.9 },
    equipo: { torso: { tipo: 'tunica', mat: 'cu_tela_negra' }, piernas: { tipo: 'tunica_larga', mat: 'cu_tela_negra' }, cinturon: { mat: 'cuerda' }, cabeza: { tipo: 'capucha', mat: 'cu_tela_negra' } },
    saludo: [['Yo era de Santa Oria. Hui antes de la brasa. Soñé con ella una semana antes de que cayera.', 'I was of Santa Oria. I fled before the ember. I dreamed of it a week before it fell.']],
    relato: ['Ozmaren. Así se llama. Los hermanos antiguos no lo encerraron: lo partieron en brasas y enterraron cada pedazo bajo un canto distinto. Tú llevas su ceniza en la piel. Eso te deja oírlo.', 'Ozmaren. That is its name. The old brothers did not imprison it: they split it into embers and buried each piece beneath a different song. You carry its ash on your skin. That is why you can hear it.'] },
  // ----------------------------------------------------------- Acto 4: el Fortín de Vel
  { id: 'sigrun', nombre: ['Jarla Sigrun', 'Jarl Sigrun'], oficio: 'misiones',
    cuerpo: { genero: 'm', piel: 'cu_piel_clara', pelo: 'cu_pelo_rubio', peinado: 'trenzas', musculo: 0.7, alto: 1.05 },
    equipo: { torso: { tipo: 'malla', mat: 'cu_malla' }, piernas: { tipo: 'pantalon', mat: 'cu_pelaje_gris' }, pies: { tipo: 'botas', mat: 'cu_pelaje' }, hombros: { tipo: 'pieles', mat: 'cu_pelaje_gris' }, capa: { mat: 'cu_tela_azul' }, arma: { tipo: 'hacha', mat: 'cu_placa', mango: 'madera' }, izq: { tipo: 'escudo_redondo', mat: 'madera', mat2: 'hierro' } },
    saludo: [['En Hrimgard enterramos a los muertos con la cara hacia abajo. Para que no encuentren el camino de vuelta.', 'In Hrimgard we bury the dead face down. So they cannot find the way back.']],
    relato: ['Hjaldur fue nuestro primer rey. Se sentó en el trono de hielo para vigilar el sello y prometió no levantarse nunca. Se levantó.', 'Hjaldur was our first king. He sat on the ice throne to guard the seal and swore never to rise. He rose.'] },
  { id: 'vigdis', nombre: ['Vigdis', 'Vigdis'], oficio: 'curandera',
    cuerpo: { genero: 'm', piel: 'cu_piel_clara', pelo: 'cu_pelo_blanco', peinado: 'largo', musculo: 0.2 },
    equipo: { torso: { tipo: 'vestido', mat: 'cu_tela_azul' }, hombros: { tipo: 'pieles', mat: 'cu_pelaje' }, cinturon: { mat: 'cu_cuero' } },
    saludo: [['El frío conserva. Las heridas también. Déjame cerrarte eso.', 'Cold preserves. Wounds too. Let me close that.']],
    relato: ['Los escarchados eran pastores. Se perdieron en la ventisca buscando a sus hijos. Todavía los buscan.', 'The frostbitten were shepherds. They got lost in the blizzard looking for their children. They are still looking.'] },
  { id: 'hakon', nombre: ['Viejo Hakon', 'Old Hakon'], oficio: 'herrero',
    cuerpo: { genero: 'h', piel: 'cu_piel_clara', pelo: 'cu_pelo_blanco', peinado: 'melena', barba: 'trenzada', musculo: 0.7, ancho: 1.1, joroba: 0.2 },
    equipo: { torso: { tipo: 'cuero', mat: 'cu_pelaje_gris' }, piernas: { tipo: 'pantalon', mat: 'cu_cuero' }, pies: { tipo: 'botas', mat: 'cu_pelaje' }, manos: { tipo: 'guantes', mat: 'cu_cuero' }, arma: { tipo: 'martillo', mat: 'cu_placa', mango: 'madera' } },
    saludo: [['Acero de montaña. No se dobla, no se oxida, no perdona.', 'Mountain steel. It does not bend, does not rust, does not forgive.']],
    relato: ['Forjé la espada de Hjaldur cuando yo tenía tu edad. Si la ves, no la toques. Todavía tiene sed.', 'I forged Hjaldur\'s sword when I was your age. If you see it, do not touch it. It is still thirsty.'] },
  { id: 'nino_nieve', nombre: ['El niño de la nieve', 'The snow child'], oficio: 'relato',
    cuerpo: { genero: 'h', alto: 0.7, piel: 'cu_piel_azul', ojos: 'cu_ojo_hielo', pelo: 'cu_pelo_blanco', peinado: 'corto', cabeza: 1.15, musculo: 0 },
    equipo: { torso: { tipo: 'camisa', mat: 'cu_tela_blanca' }, piernas: { tipo: 'pantalon', mat: 'cu_tela_blanca' }, pies: { tipo: 'vendas', mat: 'cu_tela_blanca' } },
    saludo: [['Nadie sabe de quién es. Apareció en la puerta del fortín. No tiene frío. No come.', 'No one knows whose he is. He appeared at the fort gate. He is never cold. He never eats.']],
    relato: ['El niño dice: «Cuando caiga el último sello, la brasa va a necesitar un cuerpo. Ya eligió uno». Y te mira.', 'The child says: "When the last seal falls, the ember will need a body. It has already chosen one." And he looks at you.'] },
  // ----------------------------------------------------------- Acto 5: el Bastión del Último Coro
  { id: 'auren', nombre: ['Auren, el último cantor', 'Auren, the last singer'], oficio: 'misiones',
    cuerpo: { genero: 'h', alto: 1.1, piel: 'cu_piel_clara', pelo: 'cu_pelo_blanco', peinado: 'largo', ojos: 'cu_ojo_hielo', musculo: 0.3, alas: 'cu_tela_blanca' },
    equipo: { torso: { tipo: 'placas', mat: 'cu_oro', mat2: 'cu_tela_blanca' }, piernas: { tipo: 'tunica_larga', mat: 'cu_tela_blanca' }, hombros: { tipo: 'placas', mat: 'cu_oro' }, capa: { mat: 'cu_tela_blanca' }, arma: { tipo: 'espada', mat: 'cu_oro' } },
    saludo: [['Fuimos siete voces. Quedo yo. Mientras cante, este bastión no cae.', 'We were seven voices. I remain. As long as I sing, this bastion will not fall.']],
    relato: ['Ozmaren no es un demonio. Es una sed. La sed de un dios que murió de hambre. Cada brasa es un recuerdo de comer.', 'Ozmaren is not a demon. It is a thirst. The thirst of a god who starved to death. Each ember is a memory of eating.'] },
] as NPC[]).map((n) => [n.id, n]));

/** Quién está en cada campamento (en este orden alrededor del fuego). */
export const GENTE: Record<number, string[]> = {
  1: ['odran', 'lys', 'brannoc', 'ysolde', 'tomas'],
  2: ['qadir', 'nahla', 'barzin', 'ysolde', 'cartografo'],
  3: ['oya', 'tlalli', 'jorun', 'ysolde', 'ixel'],
  4: ['sigrun', 'vigdis', 'hakon', 'ysolde', 'nino_nieve'],
  5: ['auren', 'lys', 'brannoc', 'ysolde', 'odran'],
};
