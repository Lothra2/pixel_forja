// Gente de los campamentos: cuerpo (se hornea solo quieto), oficio y lo que dicen.
import type { Cuerpo, Equipo } from '../../../src/engine/gotico/cuerpo';
import type { FinalElegido } from '../mundo/actos';

export type Oficio = 'misiones' | 'curandera' | 'herrero' | 'vidente' | 'relato';
export interface NPC {
  id: string; nombre: [string, string]; oficio: Oficio; cuerpo: Cuerpo; equipo: Equipo;
  /** Saludos que rotan. */
  saludo: [string, string][];
  /** Lo que cuenta si le preguntas por el lugar. */
  relato: [string, string];
  /** Dibujo de otro personaje horneado (para gente que no tiene el suyo). */
  sprite?: string;
  /** Deja de estar en el pueblo cuando esta misión está cumplida (el traidor que huye o muere). */
  desaparece?: string;
  /** Muere si tomaste esta decisión: no aparece más y en su lugar queda su tumba. */
  muereSi?: [string, string];
  /** Solo aparece si tomaste esta decisión. */
  soloSi?: [string, string];
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
  // ----------------------------------------------------------- Acto 6: el Barco Varado (Ysmeral)
  { id: 'tarn', nombre: ['Maese Tarn, el calafate', 'Master Tarn, the caulker'], oficio: 'relato',
    cuerpo: { genero: 'h', piel: 'cu_piel', pelo: 'cu_pelo_castano', peinado: 'rapado', barba: 'corta', musculo: 0.6, ancho: 1.05, joroba: 0.15 },
    equipo: { torso: { tipo: 'cuero', mat: 'cu_cuero' }, piernas: { tipo: 'pantalon', mat: 'cu_tela_azul' }, pies: { tipo: 'botas', mat: 'cu_cuero_negro' }, cinturon: { mat: 'cuerda' }, arma: { tipo: 'martillo', mat: 'hierro', mango: 'madera' } },
    saludo: [['Brea, estopa y paciencia. Con eso se cierra cualquier casco. Con eso no se cierra el cielo.', 'Pitch, oakum and patience. That is how you seal any hull. That is not how you seal the sky.']],
    relato: ['Llevo treinta años remendando el barco de Oyá. Nunca lo vi varado. La arena de esta costa no es arena: son escamas de algo muy grande que duerme debajo.', 'Thirty years patching Oya\'s ship. I never saw her aground. The sand on this coast is not sand: it is the scales of something very large sleeping underneath.'] },
  { id: 'nerea', nombre: ['Nerea, la de la marea', 'Nerea of the Tide'], oficio: 'relato',
    cuerpo: { genero: 'm', alto: 0.74, piel: 'cu_piel_palida', pelo: 'cu_pelo_negro', peinado: 'largo', musculo: 0, ancho: 0.85, cabeza: 1.1 },
    equipo: { torso: { tipo: 'vestido', mat: 'cu_tela_azul' }, pies: { tipo: 'vendas', mat: 'cu_tela_blanca' } },
    saludo: [['Tengo el pelo mojado y no se seca nunca. No me molesta. Me recuerda a casa.', 'My hair is wet and it never dries. I do not mind. It reminds me of home.']],
    relato: ['En Ysmeral cenábamos con las ventanas abiertas para oír las campanas. La noche que nos hundimos, el agua entró por la ventana despacio, como un invitado.', 'In Ysmeral we had supper with the windows open to hear the bells. The night we sank, the water came in through the window slowly, like a guest.'] },
  { id: 'sor_salitre', nombre: ['Sor Salitre', 'Sister Brine'], oficio: 'relato',
    cuerpo: { genero: 'm', piel: 'cu_piel_azul', pelo: 'cu_pelo_blanco', peinado: 'largo', musculo: 0.1, ancho: 0.9 },
    equipo: { torso: { tipo: 'vestido', mat: 'cu_tela_negra' }, cabeza: { tipo: 'capucha', mat: 'cu_tela_azul' }, cinturon: { mat: 'cuerda' }, izq: { tipo: 'libro', mat: 'cu_cuero' } },
    saludo: [['Sabe a sal todo lo que como. Hasta las oraciones.', 'Everything I eat tastes of salt. Even the prayers.']],
    relato: ['La primera sacerdotisa pactó con el fondo del mar: campanas a cambio de orilla. Pero el fondo no es el mar. El fondo mira hacia arriba, hacia alguien que tiene sed.', 'The first priestess made a pact with the bottom of the sea: bells in exchange for shore. But the bottom is not the sea. The bottom looks upward, toward someone who thirsts.'] },
  // ----------------------------------------------------------- Acto 7: el Campamento de la Escalera Rota
  { id: 'mira', nombre: ['Mira, la que cuenta estrellas', 'Mira the Star-Counter'], oficio: 'relato',
    cuerpo: { genero: 'm', piel: 'cu_piel_morena', pelo: 'cu_pelo_castano', peinado: 'cola', musculo: 0.1 },
    equipo: { torso: { tipo: 'vestido', mat: 'cu_tela_morada' }, cabeza: { tipo: 'aro', mat: 'cu_oro' }, cinturon: { mat: 'cu_cuero', hebilla: 'cu_oro' }, izq: { tipo: 'orbe', mat: 'magia' } },
    saludo: [['Desde aquí arriba las estrellas se ven del otro lado. Tienen la espalda gastada, como monedas viejas.', 'From up here you see the stars from behind. Their backs are worn, like old coins.']],
    relato: ['Aun-Saar no creó el mundo. Lo encontró. Y como todo lo que tiene sed, empezó a beber. Las estrellas son lo que dejó en el fondo del vaso.', 'Aun-Saar did not create the world. He found it. And like everything that thirsts, he began to drink. The stars are what he left at the bottom of the cup.'] },
  { id: 'eskel', nombre: ['Eskel el que se escondió', 'Eskel Who Hid'], oficio: 'relato',
    cuerpo: { genero: 'h', piel: 'cu_piel_clara', pelo: 'cu_pelo_blanco', peinado: 'melena', barba: 'larga', joroba: 0.4, musculo: 0.3 },
    equipo: { torso: { tipo: 'malla', mat: 'cu_malla' }, piernas: { tipo: 'pantalon', mat: 'cu_pelaje_gris' }, pies: { tipo: 'botas', mat: 'cu_pelaje' }, capa: { mat: 'cu_tela_parda', largo: 0.6 }, arma: { tipo: 'espada', mat: 'hierro' } },
    saludo: [['Cuarenta años en este campamento. Cada vez que alguien sube, le doy agua. Ninguno vuelve a pedir más.', 'Forty years in this camp. Each time someone climbs, I give them water. None come back to ask for more.']],
    relato: ['Éramos siete, con la Marca, igual que tú. Los monjes nos dijeron que éramos la llave. No nos dijeron de qué puerta.', 'We were seven, with the Mark, just like you. The monks told us we were the key. They did not tell us to which door.'] },
  { id: 'hollin', nombre: ['Hollin el ermitaño', 'Hollin the Hermit'], oficio: 'relato',
    cuerpo: { genero: 'h', piel: 'cu_piel', pelo: 'cu_pelo_blanco', peinado: 'calvo', barba: 'larga', joroba: 0.5, musculo: 0, ancho: 0.85 },
    equipo: { torso: { tipo: 'harapos', mat: 'cu_tela_parda' }, cinturon: { mat: 'cuerda' }, arma: { tipo: 'baculo', mango: 'corteza', gema: 'luz_vela' } },
    saludo: [['Esculpo a los que suben. No con cincel. Con mirarlos basta. El jardín hace el resto.', 'I sculpt those who climb. Not with a chisel. Looking at them is enough. The garden does the rest.']],
    relato: ['Todas las estatuas del jardín miran al trono. Ninguna mira hacia abajo. A veces pienso que no es que no puedan. Es que ya no quieren volver.', 'Every statue in the garden faces the throne. None look down. Sometimes I think it is not that they cannot. It is that they no longer want to return.'] },
] as NPC[]).map((n) => [n.id, n]));

/** Quién está en cada campamento (en este orden alrededor del fuego). */
export const GENTE: Record<number, string[]> = {
  1: ['odran', 'lys', 'brannoc', 'ysolde', 'tomas'],
  2: ['qadir', 'nahla', 'barzin', 'ysolde', 'cartografo'],
  3: ['oya', 'tlalli', 'jorun', 'ysolde', 'ixel'],
  4: ['sigrun', 'vigdis', 'hakon', 'ysolde', 'nino_nieve'],
  5: ['auren', 'lys', 'brannoc', 'ysolde', 'odran'],
  6: ['oya', 'lys', 'brannoc', 'ysolde', 'tarn', 'nerea', 'sor_salitre'],
  7: ['auren', 'lys', 'brannoc', 'ysolde', 'mira', 'eskel', 'hollin'],
};

// ------------------------------------------------------------------ lo que dicen según cómo va la historia
/** Una línea que solo se dice si se cumplen sus condiciones. Entre las que se cumplen gana la última de la lista. */
export interface Linea {
  texto: [string, string];
  /** Solo en este acto (para la gente que te sigue de un acto a otro). */
  acto?: number;
  /** Todas estas misiones terminadas. */
  hecha?: string[];
  /** Esta misión aceptada y sin entregar. */
  activa?: string;
  /** En esta misión elegiste esta opción (0 o 1). */
  eleccion?: [string, number];
  /** El heraldo ya se te escapó en este acto. */
  heraldo?: number;
  /** Lo que hiciste con la Brasa al caer Ozmaren. */
  final?: FinalElegido;
  /** Una decisión de la cadena principal (clave y valor, ver mundo/decisiones). */
  decision?: [string, string];
}
export const DIALOGOS: Record<string, { lineas?: Linea[]; relatos?: Linea[] }> = {
  odran: { lineas: [
    { acto: 1, activa: 'm1_hambre', texto: ['La Guarida del Hambre se abre en el mismo páramo. Busca el agujero que huele a carne vieja. Y no te detengas a escuchar lo que mastica.', 'The Hunger Den opens on the moor itself. Look for the hole that smells of old meat. And do not stop to listen to what it chews.'] },
    { acto: 1, hecha: ['m1_hambre'], texto: ['Los pastores volvieron a sacar las ovejas. Pocas, pero vivas. Eso es más de lo que teníamos ayer.', 'The shepherds have taken the sheep out again. Few, but alive. That is more than we had yesterday.'] },
    { acto: 1, activa: 'm1_campanas', texto: ['El camposanto está pasando el páramo. La abadía, detrás. No entres a las tumbas abiertas si no tienes que hacerlo.', 'The churchyard lies past the moor. The abbey, behind it. Do not go into the open graves unless you must.'] },
    { acto: 1, hecha: ['m1_campanas'], texto: ['Desde que encendiste la piedra duermo un poco mejor. Las campanas suenan una vez cada noche, siempre a la misma hora. Como si alguien contara.', 'Since you lit the stone I sleep a little better. The bells ring once each night, always at the same hour. As if someone were counting.'] },
    { acto: 1, heraldo: 1, texto: ['¿Un hombre pálido en los osarios, cantando? Los libros viejos hablan de un novicio que cantó de noche y nunca murió. No le contestes si te habla.', 'A pale man in the ossuaries, singing? The old books speak of a novice who sang at night and never died. Do not answer if he speaks to you.'] },
    { acto: 1, eleccion: ['m1_reliquia', 0], texto: ['Tomás dijo una palabra. Una. Llevo toda la vida archivando palabras y ninguna me pesó tanto.', 'Tomas said a word. One. I have spent my life archiving words and none ever weighed so much.'] },
    { acto: 1, eleccion: ['m1_reliquia', 1], texto: ['Guardaste el dedo de la santa. No te juzgo. Pero cuídate de los santos que viajan en el bolsillo.', 'You kept the saint\'s finger. I do not judge you. But beware of saints who travel in pockets.'] },
    { acto: 1, hecha: ['m1_abadesa'], texto: ['El primer sello está roto y yo sigo vivo para escribirlo. No sé si es una bendición.', 'The first seal is broken and I am still alive to write it down. I do not know if that is a blessing.'] },
    { acto: 5, texto: ['Vine hasta el fin del mundo con un libro bajo el brazo. Alguien tiene que escribir cómo termina.', 'I came to the end of the world with a book under my arm. Someone has to write down how it ends.'] },
    { acto: 5, hecha: ['m5_coro'], texto: ['Seis nombres más en mi libro. Ya no me caben las lágrimas, así que escribo.', 'Six more names in my book. I have no room left for tears, so I write.'] },
    { acto: 5, final: 'destruir', texto: ['Tu Marca se puso gris. La mía también. Por primera vez en un año me pica como una cicatriz cualquiera.', 'Your Mark turned grey. So did mine. For the first time in a year it itches like any other scar.'] },
    { acto: 5, final: 'absorber', texto: ['No te tengo miedo. Tengo miedo de lo que me mira desde adentro de tus ojos.', 'I am not afraid of you. I am afraid of what looks at me from behind your eyes.'] },
  ] },
  lys: { lineas: [
    { acto: 1, activa: 'm1_verdugo', texto: ['¿Lo oyes? No, claro, tú no lo oyes. Afila despacio, como si tuviera toda la eternidad.', 'Do you hear it? No, of course you do not. He sharpens slowly, as if he had all eternity.'] },
    { acto: 1, hecha: ['m1_verdugo'], texto: ['Dormí toda la noche. Soñé con el claustro, pero en el sueño nadie cantaba.', 'I slept the whole night. I dreamed of the cloister, but in the dream no one was singing.'] },
    { acto: 1, hecha: ['m1_abadesa'], texto: ['Ilvara cayó. Quisiera sentir alivio. Siento frío.', 'Ilvara has fallen. I would like to feel relief. I feel cold.'] },
    { acto: 5, texto: ['Te seguí hasta aquí. Alguien tiene que coserte cuando vuelvas, y nadie conoce tus heridas como yo.', 'I followed you here. Someone has to stitch you up when you return, and no one knows your wounds like I do.'] },
    { acto: 5, hecha: ['m5_heraldo'], texto: ['Vesperio. Lo recuerdo. Era el más dulce del coro. Cantaba para que las novicias no tuviéramos miedo de noche.', 'Vesperio. I remember him. He was the sweetest of the choir. He sang so we novices would not be afraid at night.'] },
    { acto: 6, texto: ['El agua salada cierra las heridas, dicen. Mentira. Las conserva.', 'Salt water closes wounds, they say. A lie. It preserves them.'] },
    { acto: 6, final: 'destruir', texto: ['Déjame ver tu brazo. Gris y frío. Es solo una cicatriz ahora, y de cicatrices yo sé.', 'Let me see your arm. Grey and cold. It is only a scar now, and I know about scars.'] },
    { acto: 6, final: 'absorber', texto: ['Tu piel está tibia. Demasiado tibia. Siéntate. No, no te voy a curar. No sé curar esto.', 'Your skin is warm. Too warm. Sit down. No, I will not heal you. I do not know how to heal this.'] },
    { acto: 7, texto: ['Aquí arriba no sangra nadie. Lo que se rompe se vuelve oro. Prefiero la sangre.', 'Up here no one bleeds. What breaks turns to gold. I prefer blood.'] },
    { acto: 7, final: 'absorber', texto: ['Cuando subas al trono, ¿vas a bajar? No me contestes. Quiero creer que sí.', 'When you climb to the throne, will you come back down? Do not answer. I want to believe you will.'] },
  ], relatos: [
    { acto: 5, texto: ['En la abadía nos enseñaban que la Marca era un castigo. Ahora creo que era un aviso.', 'At the abbey they taught us the Mark was a punishment. Now I believe it was a warning.'] },
    { acto: 6, texto: ['Ysmeral tenía doce hermanas, como Santa Oria tenía siete voces. Siempre hubo alguien cantando para sostener algo. Nunca supimos qué.', 'Ysmeral had twelve sisters, as Santa Oria had seven voices. There was always someone singing to hold something up. We never knew what.'] },
    { acto: 7, texto: ['Aun-Saar. Ahora que sé su nombre, no puedo dejar de pensarlo. Quizás por eso los monjes nunca lo escribían.', 'Aun-Saar. Now that I know his name, I cannot stop thinking it. Perhaps that is why the monks never wrote it down.'] },
  ] },
  brannoc: { lineas: [
    { acto: 1, activa: 'm1_pastor', texto: ['La Cueva del Pastor está en el páramo. Si encuentras a Edrin... no. Primero encuéntralo.', 'The Shepherd\'s Cave is on the moor. If you find Edrin... no. Find him first.'] },
    { acto: 1, eleccion: ['m1_pastor', 0], texto: ['Todavía oigo el cayado cantar en la fragua. Cuida esa hoja.', 'I can still hear the crook singing in the forge. Take care of that blade.'] },
    { acto: 1, eleccion: ['m1_pastor', 1], texto: ['Le conté a todo el refugio cómo murió mi hermano. Defendiendo el rebaño. Gracias por eso.', 'I told the whole refuge how my brother died. Defending the flock. Thank you for that.'] },
    { acto: 5, texto: ['Traje el yunque en una carreta, desde Velmora. No me preguntes cómo. Tráeme lo que encuentres.', 'I brought the anvil in a cart, all the way from Velmora. Do not ask me how. Bring me what you find.'] },
    { acto: 5, activa: 'm5_fuelle', texto: ['La Fragua de Ozmaren está pasando el Río de Lava. Sigue el calor. Es mío.', 'Ozmaren\'s Forge lies past the Lava River. Follow the heat. It is mine.'] },
    { acto: 5, hecha: ['m5_fuelle'], texto: ['Mi fragua canta otra vez. Todo lo que forjo sale un poco mejor de lo que merezco.', 'My forge sings again. Everything I forge comes out a little better than I deserve.'] },
    { acto: 6, texto: ['El hierro se oxida aquí en una noche. Forjo con bronce de campana. Suena raro cuando lo golpeo, como si rezara.', 'Iron rusts here overnight. I forge with bell bronze. It sounds strange when I strike it, as if it were praying.'] },
    { acto: 7, texto: ['El oro de estas islas no se deja forjar. Se derrite y vuelve a su forma, como si recordara. Me da escalofríos.', 'The gold of these isles will not be forged. It melts and returns to its shape, as if it remembered. It gives me chills.'] },
    { acto: 7, final: 'destruir', texto: ['Tu Marca apagada es lo más valiente que he visto. Y he visto a mi hermano con un cayado frente a un lobo.', 'Your dark Mark is the bravest thing I have seen. And I saw my brother face a wolf with a crook.'] },
    { acto: 7, final: 'absorber', texto: ['Si un día tienes sed de verdad, ven a mi fragua. Te doy agua. Y si no alcanza, te doy un martillazo. Con cariño.', 'If one day you are truly thirsty, come to my forge. I will give you water. And if that is not enough, a hammer blow. With affection.'] },
  ], relatos: [
    { acto: 5, texto: ['Las cadenas de los sellos las forjó Ozmaren mismo, en su fragua. Por eso se rompían. Nadie hace cadenas para sí mismo pensando que van a aguantar.', 'Ozmaren forged the chains of the seals himself, in his own forge. That is why they broke. No one makes chains for himself expecting them to hold.'] },
    { acto: 6, texto: ['Tarn dice que la arena de aquí son escamas. Yo le creo. Las fundí y salió algo que no era metal. Lo tiré al mar. El mar lo devolvió.', 'Tarn says the sand here is scales. I believe him. I melted some and what came out was not metal. I threw it in the sea. The sea gave it back.'] },
    { acto: 7, texto: ['Mi abuelo decía que el primer herrero le robó el fuego a un dios dormido. Si es verdad, ya sé a cuál.', 'My grandfather said the first smith stole fire from a sleeping god. If it is true, I know which one now.'] },
  ] },
  ysolde: { lineas: [
    { acto: 1, hecha: ['m1_campanas'], texto: ['Las cartas cambiaron desde que entraste a la abadía. Sale mucho la Torre. Y una figura pálida que canta.', 'The cards changed since you entered the abbey. The Tower comes up a lot. And a pale figure who sings.'] },
    { acto: 2, texto: ['El desierto no deja leer bien las cartas. La arena se mete entre las figuras y las cambia.', 'The desert does not let the cards read well. Sand gets between the figures and changes them.'] },
    { acto: 2, hecha: ['m2_rey'], texto: ['Sale el río. Sale una madre. Y sale otra vez el hombre pálido, sonriendo detrás de ti.', 'The river comes up. A mother comes up. And again the pale man, smiling behind you.'] },
    { acto: 3, texto: ['La humedad me pudre el mazo. Igual sigo tirando. Tu carta sale siempre primero, ¿sabes?', 'The damp is rotting my deck. I keep drawing anyway. Your card always comes up first, you know?'] },
    { acto: 4, texto: ['En el norte las cartas salen heladas. Las caliento con el aliento antes de leerlas. Anoche salió una que no tengo en el mazo: un trono de oro con una boca.', 'In the north the cards come out frozen. I warm them with my breath before reading them. Last night one came up that is not in my deck: a golden throne with a mouth.'] },
    { acto: 4, eleccion: ['m4_nino', 1], texto: ['Tu Marca brilla más que antes. En mis visiones ya no sé dónde terminas tú y dónde empieza la brasa.', 'Your Mark shines brighter than before. In my visions I no longer know where you end and the ember begins.'] },
    { acto: 5, texto: ['Aquí no necesito cartas. Todo lo que va a pasar ya está escrito en el cielo, y el cielo está abierto.', 'Here I do not need cards. Everything that will happen is already written in the sky, and the sky is open.'] },
    { acto: 5, eleccion: ['m5_cartas', 0], texto: ['La Hoguera. Pensé que elegirías la Corona. Me alegra equivocarme, a veces.', 'The Pyre. I thought you would choose the Crown. I am glad to be wrong, sometimes.'] },
    { acto: 5, eleccion: ['m5_cartas', 1], texto: ['La Corona. Ya lo sabía. Las cartas nunca mienten, solo a veces callan.', 'The Crown. I knew it. The cards never lie, they only sometimes keep quiet.'] },
    { acto: 6, texto: ['Las cartas se me mojaron todas. Ahora solo sale una figura, borrosa: alguien sentado muy arriba.', 'All my cards got wet. Now only one figure comes up, blurred: someone seated very high.'] },
    { acto: 6, final: 'destruir', texto: ['En tus cartas ya no sale la brasa. Sale una vela apagada. Es la primera vez que me alegra ver una vela apagada.', 'The ember no longer appears in your cards. A snuffed candle does. It is the first time a snuffed candle has made me glad.'] },
    { acto: 6, final: 'absorber', texto: ['En tus cartas sale la Corona, una y otra vez, aunque la saque del mazo. Ya no hace falta que tire. Ya eres la carta.', 'The Crown comes up in your cards, again and again, even when I take it out of the deck. I no longer need to draw. You are the card now.'] },
    { acto: 7, texto: ['Esta es la última tirada. Después de esto guardo el mazo. Pase lo que pase.', 'This is the last reading. After this I put the deck away. Whatever happens.'] },
    { acto: 7, final: 'destruir', texto: ['Aun-Saar te busca y no te encuentra. Llevas la Marca apagada como un disfraz. Úsalo bien.', 'Aun-Saar searches for you and cannot find you. You wear your dark Mark like a disguise. Use it well.'] },
    { acto: 7, final: 'absorber', texto: ['Él te espera como a un hijo que vuelve a casa. No le des esa alegría. O dásela, y que sea la última.', 'He awaits you like a child coming home. Do not give him that joy. Or give it to him, and let it be his last.'] },
  ], relatos: [
    { acto: 7, texto: ['Te seguí desde el Refugio porque tu Marca brillaba en mis visiones. Ahora sé por qué: brillaba porque él la estaba mirando.', 'I followed you from the Refuge because your Mark shone in my visions. Now I know why: it shone because he was looking at it.'] },
  ] },
  tomas: { lineas: [
    { hecha: ['m1_hambre'], texto: ['Tomás te dibuja con una espada. Encima de tu cabeza dibuja una brasa pequeña, muy pequeña.', 'Tomas draws you holding a sword. Above your head he draws a small ember, very small.'] },
    { heraldo: 1, texto: ['Tomás dibuja a un hombre pálido con la boca abierta, cantando. Alrededor dibuja notas que son pequeñas llamas.', 'Tomas draws a pale man with his mouth open, singing. Around him he draws notes that are tiny flames.'] },
    { activa: 'm1_reliquia', texto: ['Tomás golpea su dibujo de la cripta con el dedo, una y otra vez. Después junta las manos como si rezara.', 'Tomas taps his drawing of the crypt with his finger, again and again. Then he presses his hands together as if in prayer.'] },
    { eleccion: ['m1_reliquia', 0], texto: ['Tomás te mira y mueve los labios despacio. Esta vez sale un sonido: tu nombre. Le cuesta, pero lo dice.', 'Tomas looks at you and moves his lips slowly. This time a sound comes out: your name. It costs him, but he says it.'] },
    { eleccion: ['m1_reliquia', 1], texto: ['Tomás no levanta la vista de su dibujo. Está dibujando un bolsillo con una luz adentro.', 'Tomas does not look up from his drawing. He is drawing a pocket with a light inside it.'] },
  ] },
  qadir: { lineas: [
    { activa: 'm2_saqueador', texto: ['El Oasis Muerto está al otro lado de las dunas. Si la arena tiembla, corre hacia las piedras. A la Boca no le gustan las piedras.', 'The Dead Oasis lies across the dunes. If the sand trembles, run for the rocks. The Maw does not like rocks.'] },
    { hecha: ['m2_saqueador'], texto: ['Mis hijos bebieron hoy sin miedo. Hace semanas que no veía eso.', 'My children drank today without fear. I had not seen that in weeks.'] },
    { activa: 'm2_dormidos', texto: ['Las tumbas están pasando las Ruinas del Sol. Si hueles canela, ya llegaste.', 'The tombs lie past the Ruins of the Sun. If you smell cinnamon, you have arrived.'] },
    { heraldo: 2, texto: ['Los saqueadores vieron a un hombre pálido salir de las tumbas caminando sobre la arena, sin hundirse. Nadie lo siguió.', 'The raiders saw a pale man leave the tombs walking on the sand, without sinking. No one followed him.'] },
    { hecha: ['m2_rey'], texto: ['Khamer-Ul ya no manda desde abajo. Los demás reyes siguen durmiendo. Que sigan.', 'Khamer-Ul no longer rules from below. The other kings keep sleeping. Let them.'] },
  ] },
  nahla: { lineas: [
    { activa: 'm2_nombres', texto: ['El Pozo de los Nombres está junto al Oasis Muerto. Baja hasta donde los nombres se borran solos. Ahí está.', 'The Well of Names lies beside the Dead Oasis. Go down to where the names erase themselves. That is where it is.'] },
    { eleccion: ['m2_nombres', 0], texto: ['Fui al pozo esta mañana. El nombre de Samira sigue ahí. Le dejé dátiles. Le gustaban.', 'I went to the well this morning. Samira\'s name is still there. I left her dates. She liked them.'] },
    { eleccion: ['m2_nombres', 1], texto: ['Tu nombre está en el pozo. El de mi hija no. Te curo porque es mi oficio. No me pidas más.', 'Your name is in the well. My daughter\'s is not. I heal you because it is my trade. Ask nothing more of me.'] },
  ] },
  barzin: { lineas: [
    { activa: 'm2_escarabajos', texto: ['La Cueva de los Escarabajos está en las dunas. No le pegues de frente al caparazón. Busca las juntas.', 'The Scarab Cave lies in the dunes. Do not strike the shell head on. Look for the joints.'] },
    { hecha: ['m2_escarabajos'], texto: ['Ya me encargan piezas de caparazón desde tres oasis. Les digo que no hay más. Es verdad.', 'Three oases already ask me for shell pieces. I tell them there are no more. It is the truth.'] },
  ] },
  cartografo: { lineas: [
    { activa: 'm2_sol', texto: ['El Templo del Sol Caído está en las Ruinas del Sol. Lo dibujé hace cuarenta años. Ya era viejo entonces.', 'The Temple of the Fallen Sun lies in the Ruins of the Sun. I drew it forty years ago. It was already old then.'] },
    { eleccion: ['m2_sol', 0], texto: ['Desde que tengo el mapa veo un poco. Sombras, nada más. Pero tu sombra tiene dos dueños.', 'Since I have the map I see a little. Shadows, nothing more. But your shadow has two owners.'] },
    { eleccion: ['m2_sol', 1], texto: ['Quemaste el mapa. Bien. Ahora nadie sabe dónde están los sellos. Ni siquiera yo. Es un alivio extraño.', 'You burned the map. Good. Now no one knows where the seals are. Not even I. It is a strange relief.'] },
    { hecha: ['m2_rey'], texto: ['Dos sellos rotos. En mi cabeza el mundo ya es más pequeño. Al sur no queda nada que pueda dibujar.', 'Two seals broken. In my head the world is already smaller. To the south there is nothing left I can draw.'] },
  ] },
  oya: { lineas: [
    { acto: 3, activa: 'm3_bruja', texto: ['El Manglar Negro está pasando la selva. Si oyes tu nombre, tápate los oídos y sigue caminando.', 'The Black Mangrove lies past the jungle. If you hear your name, cover your ears and keep walking.'] },
    { acto: 3, activa: 'm3_escalones', texto: ['Los escalones bajan desde el manglar. Cuenta los que bajas. Si al volver no te dan los mismos, no subas.', 'The steps go down from the mangrove. Count them as you descend. If they do not add up on your way back, do not climb.'] },
    { acto: 3, heraldo: 3, texto: ['Mis vigías vieron a un hombre pálido caminar sobre el río, río arriba, sin mojarse. Cantaba.', 'My lookouts saw a pale man walk upon the river, upstream, without getting wet. He was singing.'] },
    { acto: 3, eleccion: ['m3_tunde', 0], texto: ['Tunde volvió a timonear. No habla mucho. Yo tampoco. Gracias por traerlo.', 'Tunde is back at the helm. He does not talk much. Neither do I. Thank you for bringing him back.'] },
    { acto: 3, eleccion: ['m3_tunde', 1], texto: ['No quiero hablar de Tunde. Haz tu trabajo. Yo haré el mío.', 'I do not want to talk about Tunde. Do your job. I will do mine.'] },
    { acto: 3, hecha: ['m3_madre'], texto: ['El barco está listo. El río ya no sangra, pero todavía sabe a hierro.', 'The ship is ready. The river no longer bleeds, but it still tastes of iron.'] },
    { acto: 6, texto: ['Mi barco nunca había tocado fondo. Ahora está sentado en la arena como un perro viejo. Esa ciudad lo agarró del casco.', 'My ship had never touched bottom. Now she sits on the sand like an old dog. That city grabbed her by the hull.'] },
    { acto: 6, activa: 'm6_costa', texto: ['Cruza la costa de los naufragios. Si un casco te habla, no le contestes. Los barcos no hablan.', 'Cross the shipwreck coast. If a hull speaks to you, do not answer. Ships do not speak.'] },
    { acto: 6, activa: 'm6_plaza', texto: ['La catedral está al otro lado de la plaza. Dicen que las ánimas de la plaza todavía hacen fila para confesarse.', 'The cathedral lies across the square. They say the souls in the square still queue to confess.'] },
    { acto: 6, final: 'destruir', texto: ['Desde que apagaste esa cosa, el mar te mira distinto. Como a alguien que le quitó algo. No le des la espalda al agua.', 'Since you put that thing out, the sea looks at you differently. As at someone who took something from it. Do not turn your back on the water.'] },
    { acto: 6, final: 'absorber', texto: ['Anoche la marea subió hasta tus pies y se detuvo. Como un perro que espera una orden. No me gusta.', 'Last night the tide came up to your feet and stopped. Like a dog awaiting an order. I do not like it.'] },
    { acto: 6, hecha: ['m6_campana'], texto: ['Flotamos otra vez. Pero no pienso navegar hacia ese cielo roto. Hasta ahí te llevo. Más arriba no hay agua.', 'We float again. But I will not sail toward that broken sky. That is as far as I take you. Higher up there is no water.'] },
  ] },
  tlalli: { lineas: [
    { activa: 'm3_tunde', texto: ['El Nido de la Araña está en la selva, debajo de las raíces más gruesas. Si los hilos te tocan, no tires. Corta.', 'The Spider\'s Nest lies in the jungle, beneath the thickest roots. If the threads touch you, do not pull. Cut.'] },
    { eleccion: ['m3_tunde', 0], texto: ['Tunde se cura despacio. Le doy hojas amargas y le canto. Lo que llevaba adentro no volvió a moverse.', 'Tunde heals slowly. I give him bitter leaves and sing to him. What he carried inside never moved again.'] },
    { eleccion: ['m3_tunde', 1], texto: ['Hiciste lo que había que hacer. No es lo mismo que hacer lo correcto, pero a veces se parecen.', 'You did what had to be done. That is not the same as doing what is right, but sometimes they look alike.'] },
  ] },
  jorun: { lineas: [
    { activa: 'm3_idolo', texto: ['El Palacio Ahogado está al fondo de la Ciudad Hundida, pasando el manglar. Lleva algo para respirar. O no respires.', 'The Drowned Palace lies at the bottom of the Sunken City, past the mangrove. Bring something to breathe with. Or do not breathe.'] },
    { hecha: ['m3_idolo'], texto: ['Duermo como un niño desde que el ídolo se fue. El comerciante que lo compró no ha vuelto a pasar. Mejor.', 'I sleep like a baby since the idol left. The trader who bought it has not passed by again. Better.'] },
  ] },
  ixel: { lineas: [
    { activa: 'm3_ixel', texto: ['Las Cavernas Inundadas se abren en la selva. Si oyes la campana, sigue el sonido. Pero no cantes.', 'The Flooded Caverns open in the jungle. If you hear the bell, follow the sound. But do not sing.'] },
    { eleccion: ['m3_ixel', 0], texto: ['Desde que toqué la campana, sueño con seis voces que me llaman. Una vez fueron siete.', 'Since I rang the bell, I dream of six voices calling me. Once there were seven.'] },
    { eleccion: ['m3_ixel', 1], texto: ['La campana duerme en el río. Yo también duermo, por fin.', 'The bell sleeps in the river. I sleep too, at last.'] },
  ], relatos: [
    { heraldo: 1, texto: ['¿Viste a un hombre pálido que canta? Es Vesperio. Era novicio cuando yo era hermano. Lo encerramos en una celda por cantar de noche. A la mañana la celda estaba vacía y la puerta seguía cerrada.', 'Did you see a pale man who sings? That is Vesperio. He was a novice when I was a brother. We locked him in a cell for singing at night. In the morning the cell was empty and the door was still shut.'] },
  ] },
  sigrun: { lineas: [
    { activa: 'm4_paso', texto: ['El Paso del Glaciar está subiendo los Picos. Mantente en las piedras. La nieve blanda tiene hambre.', 'The Glacier Pass lies up the Peaks. Keep to the stones. Soft snow is hungry.'] },
    { activa: 'm4_aliento', texto: ['Las cuevas se abren en el mismo glaciar. Lleva fuego. No para el frío. Para las caras.', 'The caves open in the glacier itself. Bring fire. Not for the cold. For the faces.'] },
    { heraldo: 4, texto: ['Un hombre pálido salió de las cuevas cantando una canción de cuna del sur. La nieve se derretía bajo sus pies.', 'A pale man came out of the caves singing a southern lullaby. The snow melted beneath his feet.'] },
    { hecha: ['m4_rey'], texto: ['Hjaldur está en el trono otra vez. Muerto, como debía. Le pusimos la cara hacia abajo.', 'Hjaldur sits on the throne again. Dead, as he should be. We set him face down.'] },
  ], relatos: [
    { hecha: ['m4_aliento'], texto: ['Mi abuela contaba que encima del cielo hay otro trono, de oro, y que en él se sienta un dios que se muere de sed desde antes del mundo. Hjaldur se sentó en el hielo para que ese dios no pudiera beber de nosotros.', 'My grandmother told of another throne above the sky, of gold, where a god sits who has been dying of thirst since before the world. Hjaldur sat on the ice so that god could not drink from us.'] },
  ] },
  vigdis: { lineas: [
    { activa: 'm4_grieta', texto: ['La Grieta Glaciar se abre en el paso. Si lo ves, no le digas mi nombre. Se detendría a pensar, y no quiero que piense.', 'The Glacial Rift opens in the pass. If you see him, do not tell him my name. He would stop to think, and I do not want him to think.'] },
    { hecha: ['m4_grieta'], texto: ['Bajo el fortín ya no hay pasos. Por fin puedo llorar sin que nadie me escuche.', 'There are no more footsteps beneath the fort. At last I can weep without anyone hearing.'] },
  ] },
  hakon: { lineas: [
    { activa: 'm4_barbaro', texto: ['La cripta de Hrodulf está en el Paso del Glaciar. Su ejército está de pie. No te pongas delante de la puerta.', 'Hrodulf\'s crypt lies in the Glacier Pass. His army stands. Do not stand in front of the door.'] },
    { hecha: ['m4_barbaro'], texto: ['Fundí el martillo. Sonó como mi abuelo cuando se reía. Ahora el acero de la montaña te reconoce.', 'I melted the hammer. It sounded like my grandfather laughing. Now the mountain steel knows you.'] },
  ] },
  nino_nieve: { lineas: [
    { activa: 'm4_nino', texto: ['El niño mira hacia las minas. «Ahí abajo late. ¿Lo oyes? Igual que tu brazo.»', 'The child looks toward the mines. "It beats down there. Do you hear it? Just like your arm."'] },
    { eleccion: ['m4_nino', 0], texto: ['Junto a la puerta hay nieve con forma de niño. Si te acercas, la nieve susurra: «Gracias. Hace frío. Qué bonito.»', 'By the gate there is snow in the shape of a child. If you come close, the snow whispers: "Thank you. It is cold. How lovely."'] },
    { eleccion: ['m4_nino', 1], texto: ['El niño ya no te mira a los ojos. Te mira el brazo. «Ella ya eligió. Ahora le toca a él, el de arriba, el que tiene sed.»', 'The child no longer looks you in the eye. He looks at your arm. "It has chosen. Now it is his turn, the one above, the thirsty one."'] },
  ], relatos: [
    { texto: ['El niño dice: «Cuando caiga el último sello, la brasa va a necesitar un cuerpo. Ya eligió uno. Y el que la perdió, allá arriba, va a venir a buscarlo». Y te mira.', 'The child says: "When the last seal falls, the ember will need a body. It has already chosen one. And the one who lost it, up above, will come looking for it." And he looks at you.'] },
  ] },
  auren: { lineas: [
    { acto: 5, activa: 'm5_heraldo', texto: ['La Fragua está más allá del Río de Lava. Vesperio te espera. Le gusta tener público.', 'The Forge lies beyond the Lava River. Vesperio awaits you. He likes an audience.'] },
    { acto: 5, hecha: ['m5_heraldo'], texto: ['Vesperio cantaba conmigo cuando éramos novicios. Tenía la voz más limpia del coro. Por eso la sed lo eligió.', 'Vesperio sang with me when we were novices. He had the clearest voice in the choir. That is why the thirst chose him.'] },
    { acto: 5, activa: 'm5_dragon', texto: ['La Garganta está pasando el río. Varnhul duerme con un ojo abierto. Entra por el lado del ojo cerrado.', 'The Throat lies past the river. Varnhul sleeps with one eye open. Go in on the side of the closed eye.'] },
    { acto: 5, final: 'destruir', texto: ['Mi canto ya no sostiene nada aquí. Puedo cantar por gusto. Lo había olvidado.', 'My song no longer holds anything up here. I can sing for pleasure. I had forgotten.'] },
    { acto: 5, final: 'absorber', texto: ['Sigo cantando. No para el bastión. Para ti. Por si acaso.', 'I keep singing. Not for the bastion. For you. Just in case.'] },
    { acto: 7, texto: ['Siete voces subimos esta escalera en sueños, cuando éramos novicios. Desperté solo yo. Ahora sé por qué: alguien tenía que guiarte.', 'Seven voices climbed this stair in dreams, when we were novices. Only I woke. Now I know why: someone had to guide you.'] },
    { acto: 7, activa: 'm7_puente', texto: ['El Cielo Roto empieza al borde del campamento. Camina sobre el vidrio. Si cruje, no te detengas.', 'The Broken Sky begins at the edge of the camp. Walk upon the glass. If it creaks, do not stop.'] },
    { acto: 7, final: 'destruir', texto: ['Aun-Saar no te siente. Tu Marca apagada es silencio para él. Llegarás a su trono sin que te oiga venir.', 'Aun-Saar cannot feel you. Your dark Mark is silence to him. You will reach his throne without him hearing you come.'] },
    { acto: 7, final: 'absorber', texto: ['Él te siente con cada paso. Te llama. Cuando llegues, recuerda que la sed que llevas es tuya, no suya.', 'He feels you with every step. He calls you. When you arrive, remember that the thirst you carry is yours, not his.'] },
  ], relatos: [
    { hecha: ['m5_heraldo'], texto: ['Vesperio me dijo una vez que la brasa no era un demonio sino una pregunta. Nunca supe cuál. Creo que tú sí lo sabes ahora.', 'Vesperio once told me the ember was not a demon but a question. I never knew which. I think you know now.'] },
    { acto: 7, texto: ['Aun-Saar no es malo. El hambre no es mala. Pero un dios con hambre se come los mundos uno por uno, y el nuestro es el próximo.', 'Aun-Saar is not evil. Hunger is not evil. But a hungry god eats worlds one by one, and ours is next.'] },
  ] },
  tarn: { lineas: [
    { activa: 'm6_faro', texto: ['El Faro Apagado está bajando por la costa. La escalera de adentro tiene más escalones de bajada que de subida. No preguntes.', 'The Dark Lighthouse lies down the coast. The stair inside has more steps going down than going up. Do not ask.'] },
    { eleccion: ['m6_faro', 0], texto: ['Ayer llegó otro barco a la luz del faro. Vacío. Alguien había dejado la mesa puesta para nosotros.', 'Yesterday another ship came to the lighthouse glow. Empty. Someone had set the table for us.'] },
    { eleccion: ['m6_faro', 1], texto: ['El faro está oscuro y la costa está tranquila. A veces la tranquilidad es lo único que se puede reparar.', 'The lighthouse is dark and the coast is quiet. Sometimes quiet is the only thing that can be repaired.'] },
    { final: 'absorber', texto: ['La brea se derrite cuando pasas cerca. No es reproche. Solo te aviso, por si quieres saberlo.', 'The pitch melts when you pass close by. It is not a reproach. Just telling you, in case you want to know.'] },
  ] },
  nerea: { lineas: [
    { activa: 'm6_arrecife', texto: ['El Arrecife está al norte de la costa. Si oyes a alguien cantar «Nerea, Nerea», es mi madre. No le tengas miedo.', 'The Reef lies north of the coast. If you hear someone singing "Nerea, Nerea", it is my mother. Do not be afraid of her.'] },
    { hecha: ['m6_arrecife'], texto: ['Esta noche soñé que mi madre peinaba mi pelo mojado. Por primera vez se secó un poco.', 'Tonight I dreamed my mother combed my wet hair. For the first time it dried a little.'] },
    { final: 'destruir', texto: ['Tu brazo huele a vela apagada. Me gusta. En Ysmeral apagábamos las velas para dormir tranquilos.', 'Your arm smells of a snuffed candle. I like it. In Ysmeral we snuffed the candles to sleep in peace.'] },
    { final: 'absorber', texto: ['Cuando pasas, las campanas de abajo suenan solas. Mi madre decía que solo sonaban así para los santos. O para los ahogados.', 'When you pass, the bells below ring on their own. My mother said they only rang like that for saints. Or for the drowned.'] },
  ] },
  sor_salitre: { lineas: [
    { activa: 'm6_criptas', texto: ['Las Criptas Inundadas están bajo el Barrio Sumergido. Mis hermanas rezan en el osario. Si te ofrecen agua, no la bebas.', 'The Flooded Crypts lie beneath the Sunken Quarter. My sisters pray in the ossuary. If they offer you water, do not drink it.'] },
    { eleccion: ['m6_criptas', 0], texto: ['Mis hermanas cantan junto al barco. No hablan, pero cantan. Con eso me basta.', 'My sisters sing beside the ship. They do not speak, but they sing. That is enough for me.'] },
    { eleccion: ['m6_criptas', 1], texto: ['El osario está vacío y yo estoy sola. Pero ellas descansan, y eso pesa más que mi soledad.', 'The ossuary is empty and I am alone. But they rest, and that weighs more than my solitude.'] },
  ] },
  mira: { lineas: [
    { activa: 'm7_boveda', texto: ['La Bóveda de los Astros se abre en el mismo Cielo Roto. Busca la luz que tiembla. Las estrellas presas tiemblan.', 'The Vault of Stars opens in the Broken Sky itself. Look for the trembling light. Caged stars tremble.'] },
    { eleccion: ['m7_boveda', 0], texto: ['Tres estrellas volvieron a su sitio. Las conté anoche desde aquí: el cielo de Velmora está completo.', 'Three stars went back to their place. I counted them last night from here: Velmora\'s sky is whole.'] },
    { eleccion: ['m7_boveda', 1], texto: ['Llevas una estrella en el bolsillo. Brilla a través de la tela. No te juzgo. Yo también me quedé con una, hace años.', 'You carry a star in your pocket. It shines through the cloth. I do not judge you. I kept one too, years ago.'] },
    { final: 'absorber', texto: ['Las estrellas se apartan de ti cuando pasas. Como peces cuando entra una sombra al agua.', 'The stars move away from you when you pass. Like fish when a shadow enters the water.'] },
  ] },
  eskel: { lineas: [
    { activa: 'm7_relicario', texto: ['El Relicario está en las Islas Altas. El copero no pelea con odio. Pelea con cortesía. Eso es lo peor.', 'The Reliquary lies in the High Isles. The cupbearer does not fight with hatred. He fights with courtesy. That is the worst of it.'] },
    { hecha: ['m7_relicario'], texto: ['Esta noche voy a dormir sin esconderme. Cuarenta años. No sé si me acuerdo cómo.', 'Tonight I will sleep without hiding. Forty years. I do not know if I remember how.'] },
    { final: 'destruir', texto: ['Apagaste tu Marca. Nosotros no nos atrevimos. Creímos que sin ella no éramos nada.', 'You put out your Mark. We did not dare. We believed we were nothing without it.'] },
    { final: 'absorber', texto: ['Te pareces a Vael, la que iba primero de los siete. Ella también bebió su brasa. Su estatua es la más cercana al trono.', 'You remind me of Vael, who led the seven. She drank her ember too. Her statue stands closest to the throne.'] },
  ] },
  hollin: { lineas: [
    { activa: 'm7_jardin', texto: ['El Jardín está pasando las Islas Altas. Tu estatua mira al trono. Cuando la veas, sabrás qué hacer. O no.', 'The Garden lies past the High Isles. Your statue faces the throne. When you see it, you will know what to do. Or not.'] },
    { eleccion: ['m7_jardin', 0], texto: ['El jardín no hizo otra estatua tuya. Todavía no. Es la primera vez que alguien lo hace esperar.', 'The garden has not made another statue of you. Not yet. It is the first time anyone has made it wait.'] },
    { eleccion: ['m7_jardin', 1], texto: ['Tu estatua sigue mirando el trono. Anoche le vi una lágrima de piedra. No sé si por ti o por él.', 'Your statue still faces the throne. Last night I saw a stone tear on it. I do not know if it was for you or for him.'] },
  ] },
};
