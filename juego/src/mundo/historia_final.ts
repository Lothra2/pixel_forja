// La cadena principal con decisiones (Vigdis en el acto 4 y la Corona en el acto 7) y ocho misiones secundarias más
// para los actos 4 a 7, que no son de matar: investigar, ritual, escolta, purga, elección y traición.
// Se suma a MISIONES, UNICOS, NPCS, GENTE y DIALOGOS al importarse (desde misiones_historia).
import { MISIONES, type Mision } from './actos';
import { UNICOS } from '../datos/objetos_datos';
import { leg } from '../datos/legendarias';
import { NPCS, GENTE, DIALOGOS, type Linea } from '../datos/npcs';
import type { RangoStat, Stat } from '../juego/tipos_objetos';

const r = (stat: Stat, min: number, max: number = min): RangoStat => ({ stat, min, max });

// ------------------------------------------------------------------ legendarias de las decisiones, los finales y las misiones nuevas
const PREMIOS = [
  // la sangre tibia
  leg('lagrima_de_vigdis', 'Lágrima de Vigdis', 'Vigdis\'s Tear', 'baculo_raiz_negra', 4, 'frio',
    [r('vida', 35, 50), r('regen_vida', 4, 6), r('res_frio', 25, 35)],
    'Vigdis lloró de rabia cuando la detuviste. La lágrima se congeló antes de tocar la nieve, y ella misma la engarzó en el báculo. «Para que te acuerdes de que me debes una.»', 'Vigdis wept with rage when you stopped her. The tear froze before it touched the snow, and she set it in the staff herself. "So you remember you owe me one."'),
  leg('corazon_tibio', 'Corazón Tibio', 'The Warm Heart', 'hacha_norte', 4, 'sangre',
    [r('robo_vida', 5, 8), r('fue', 12, 16), r('res_frio', 30, 40)],
    'Lo último que salió del trono antes de cerrarse. El hacha está tibia y no se enfría nunca. Dicen que si la apoyas en el pecho, late.', 'The last thing to leave the throne before it closed. The axe is warm and never cools. They say that if you rest it on your chest, it beats.'),
  // los cuatro finales
  leg('llave_de_la_vigilia', 'Llave de la Vigilia', 'Key of the Vigil', 'cetro_llama_santa', 8, 'luz',
    [r('res_todo', 20, 28), r('vida', 60, 80), r('mas_habilidades', 1)],
    'Abre la cripta nueva de Santa Oria. Nadie debería usarla. Por eso te la dieron a ti.', 'It opens the new crypt of Santa Oria. No one should ever use it. That is why they gave it to you.'),
  leg('esquirla_del_cielo', 'Esquirla del Cielo', 'Shard of the Sky', 'katana_bruma', 8, 'luz',
    [r('critico', 14, 18), r('vel_ataque', 18, 24), r('hallazgo', 30, 45)],
    'Un pedazo de la Corona que no subió. Corta como corta la luz cuando entra por una grieta.', 'A piece of the Crown that did not rise. It cuts the way light cuts when it comes through a crack.'),
  leg('corona_del_rey_de_ceniza', 'Hoja del Rey de Ceniza', 'Blade of the King of Ash', 'guadana_siega', 8, 'fuego',
    [r('robo_vida', 8, 12), r('dano_sangre', 12, 18), r('mas_habilidades', 2)],
    'La sed te forjó un arma con su propia forma. Bebe cada vez que corta, y nunca queda satisfecha.', 'The thirst forged you a weapon in its own shape. It drinks every time it cuts, and it is never satisfied.'),
  leg('cetro_de_la_corona_fria', 'Cetro de la Corona Fría', 'Scepter of the Cold Crown', 'maza_penitencia', 8, 'frio',
    [r('reduc_dano', 8, 12), r('vida', 70, 90), r('res_frio', 40, 50)],
    'El cetro de un rey que no siente nada. Pesa lo justo para no soltarlo nunca.', 'The scepter of a king who feels nothing. It weighs just enough that you never let it go.'),
  // acto 4
  leg('colmillo_de_la_loba_blanca', 'Colmillo de la Loba Blanca', 'Fang of the White She-Wolf', 'daga_misericordia', 4, 'frio',
    [r('vel_ataque', 12, 18), r('critico', 6, 9), r('vel_mover', 10)],
    'Sigrid cazó lobos toda su vida. La última noche, uno la cazó a ella desde adentro.', 'Sigrid hunted wolves all her life. On her last night, one hunted her from within.'),
  leg('runa_del_deshielo', 'Runa del Deshielo', 'Rune of the Thaw', 'varita_susurro', 4, 'fuego',
    [r('mana', 30, 45), r('ene', 10, 14), r('res_frio', 20, 30)],
    'Las runas decían cómo derretir la montaña. Las leíste en voz alta. La montaña escuchó.', 'The runes told how to melt the mountain. You read them aloud. The mountain listened.'),
  // acto 5
  leg('cadena_del_penitente', 'Cadena del Penitente', 'The Penitent\'s Chain', 'mangual_trilla', 5, 'fuego',
    [r('golpe_aplastante', 10, 15), r('vida', 35, 50), r('res_fuego', 25, 35)],
    'Te pidió que le quitaras la cadena. Se la quitaste. Ahora la cadena es tuya, y él ya no es nadie.', 'He asked you to take off his chain. You did. Now the chain is yours, and he is no one.'),
  leg('ceniza_de_los_justos', 'Ceniza de los Justos', 'Ash of the Just', 'cetro_llama_santa', 5, 'luz',
    [r('res_todo', 12, 18), r('mana', 40, 55), r('regen_mana', 25, 35)],
    'Los tres juicios ardieron con la verdad. Lo que queda en el cetro es lo que la verdad no pudo quemar.', 'The three judgments burned with the truth. What remains in the scepter is what the truth could not burn.'),
  // acto 6
  leg('brujula_de_la_capitana', 'Brújula de la Capitana', 'The Captain\'s Compass', 'lanza_obsidiana', 5, 'frio',
    [r('vel_mover', 15), r('critico', 8, 12), r('hallazgo', 20, 30)],
    'La aguja no apunta al norte. Apunta a lo que más quieres encontrar, y no siempre te gusta saber qué es.', 'The needle does not point north. It points to what you most want to find, and you do not always like knowing what that is.'),
  leg('voz_del_sacerdote_marea', 'Voz del Sacerdote de la Marea', 'Voice of the Tide Priest', 'baculo_peregrino', 6, 'sombra',
    [r('mana', 45, 60), r('ene', 14, 20), r('robo_vida', 4, 6)],
    'Predicaba la paz con la boca y el hambre con las manos. El báculo se quedó con la voz. Las manos las enterraste.', 'He preached peace with his mouth and hunger with his hands. The staff kept the voice. The hands you buried.'),
  // acto 7
  leg('copa_de_eskel', 'Copa de Eskel', 'Eskel\'s Cup', 'martillo_forja', 6, 'luz',
    [r('vida', 50, 65), r('fue', 16, 22), r('res_todo', 12, 16)],
    'Eskel bebió de esta copa en el trono, antes de esconderse. Martilló la copa hasta que dejó de tener forma de copa.', 'Eskel drank from this cup at the throne, before he hid. He hammered the cup until it was no longer the shape of a cup.'),
  leg('ala_del_angel_sediento', 'Ala del Ángel Sediento', 'Wing of the Thirsting Angel', 'arco_cuerno', 6, 'luz',
    [r('critico', 12, 16), r('des', 16, 22), r('vel_ataque', 12, 18)],
    'Pedía agua con la voz de un niño. Cuando se la diste, se acordó de lo que era.', 'It begged for water in a child\'s voice. When you gave it some, it remembered what it was.'),
];
for (const u of PREMIOS) { u.soloMision = true; UNICOS.push(u); }

// ------------------------------------------------------------------ Vigdis: muere si se entrega al trono; si la salvas te sigue
NPCS.vigdis.muereSi = ['vigdis', 'sacrificar'];
NPCS['vigdis_viva'] = {
  ...NPCS.vigdis, id: 'vigdis_viva', oficio: 'relato', sprite: 'vigdis', muereSi: undefined, soloSi: ['vigdis', 'salvar'],
  saludo: [
    ['«Bajé con la nieve pegada a las botas. No pienso volver al fortín hasta que esto termine. Me debes una, ¿te acuerdas?»', '"I came down with snow stuck to my boots. I will not go back to the fort until this is over. You owe me one, remember?"'],
    ['«A veces sueño que me dejaste ir. En el sueño hace calor. Me despierto temblando, y me alegro.»', '"Sometimes I dream you let me go. In the dream it is warm. I wake up shivering, and I am glad."'],
  ],
  relato: ['«Eirik me esperó veinte inviernos bajo el hielo. Ahora me toca esperarlo a mí, del lado de los vivos. Es más difícil, ¿sabes? Los muertos no tienen que hacer nada.»', '"Eirik waited for me twenty winters beneath the ice. Now it is my turn to wait for him, on the side of the living. It is harder, you know. The dead do not have to do anything."'],
};
for (const a of [5, 6, 7]) GENTE[a].push('vigdis_viva');

// ------------------------------------------------------------------ la cadena principal
const M = (m: Mision) => m;
/** Acto 4, antes del rey: la puerta del trono pide una vida que vaya sola. */
const SANGRE = M({ id: 'm4_sangre', acto: 4, nombre: ['La sangre tibia', 'The Warm Blood'],
  pedido: ['El trono de Hjaldur tiene una puerta que nadie abrió desde que se sentó. Los viejos dicen que está escrita en los Picos, en lo que dejaron los que intentaron entrar antes. Sube y lee lo que encuentres. Quiero saber qué pide esa puerta antes de mandarte a golpearla.', 'Hjaldur\'s throne has a door no one has opened since he sat down. The old ones say it is written on the Peaks, in what those who tried to enter before left behind. Climb up and read whatever you find. I want to know what that door asks for before I send you to knock on it.'],
  hecho: ['', ''],
  objetivo: { tipo: 'pistas', zona: 'a4_picos', pistas: [
    { obj: 'hie_cuerpo', v: 'de_pie', texto: ['Un explorador congelado de pie, con la mano abierta sobre el pecho, como si ofreciera algo. Debajo de la mano no hay corazón. Hay un hueco limpio, sin sangre.', 'A frozen scout standing upright, his hand open over his chest, as if offering something. Beneath the hand there is no heart. There is a clean hollow, without blood.'] },
    { obj: 'nie_altar_antiguos', v: 'dormido', texto: ['Runas viejas en la piedra: «El trono no se abre a la fuerza ni a la llave. Se abre a la sangre tibia que viene sola, sin que nadie la empuje».', 'Old runes on the stone: "The throne opens neither to force nor to key. It opens to warm blood that comes alone, with no one pushing it".'] },
    { obj: 'hie2_cadaver', v: 'tendido', texto: ['Una mujer tendida con una carta en la mano: «Fui sola. Nadie me obligó. La puerta se abrió un palmo y se volvió a cerrar. No alcanzó. Que la próxima sea más tibia que yo».', 'A woman lying with a letter in her hand: "I went alone. No one forced me. The door opened a hand\'s width and closed again. It was not enough. Let the next one be warmer than me".'] },
  ] },
  premio: { atributos: 3 },
  eleccion: { pregunta: ['Le cuentas a Sigrun lo que leíste. Antes de que conteste, Vigdis se levanta junto al fuego. «Yo voy. Eirik está allá abajo hace veinte inviernos, y yo estoy tibia de esperarlo. Si me dejas ir, Hjaldur pierde el calor que le queda.» Sigrun te mira a ti. Sin Vigdis el fortín se queda sin curandera.', 'You tell Sigrun what you read. Before she can answer, Vigdis stands by the fire. "I will go. Eirik has been down there twenty winters, and I am warm from waiting for him. If you let me go, Hjaldur loses what warmth he has left." Sigrun looks at you. Without Vigdis the fort will have no healer.'], opciones: [
    { texto: ['Detener a Vigdis. Enfrentarás a Hjaldur entero.', 'Stop Vigdis. You will face Hjaldur at full strength.'], decision: ['vigdis', 'salvar'],
      hecho: ['Le agarras la muñeca. Vigdis forcejea, después llora de rabia, y la lágrima se congela antes de tocar el suelo. «Entonces vas a pelear con un rey entero. Toma. Para que te acuerdes de que me debes una.» Sigrun asiente despacio. Hay respeto en la cara de la jarla, y también miedo.', 'You grab her wrist. Vigdis struggles, then weeps with rage, and the tear freezes before it touches the ground. "Then you will fight a whole king. Take this. So you remember you owe me one." Sigrun nods slowly. There is respect in the jarl\'s face, and fear too.'],
      premio: { unico: 'lagrima_de_vigdis', vida: 15 } },
    { texto: ['Dejarla ir. Hjaldur perderá un cuarto de su fuerza.', 'Let her go. Hjaldur will lose a quarter of his strength.'], decision: ['vigdis', 'sacrificar'],
      hecho: ['Vigdis te besa la frente, como a un hijo, y sale sin abrigo. Esa noche la montaña deja de cantar. A la mañana encuentran un hacha tibia clavada en la puerta del fortín y nada más. Sigrun manda cavar una tumba vacía junto al fuego. «Para que tenga dónde volver», dice.', 'Vigdis kisses your forehead, like a son, and walks out without a coat. That night the mountain stops singing. In the morning they find a warm axe driven into the fort\'s gate, and nothing else. Sigrun has an empty grave dug by the fire. "So she has somewhere to come back to," she says.'],
      premio: { unico: 'corazon_tibio', atributos: 3 } },
  ] },
});
const iRey = MISIONES.findIndex((m) => m.id === 'm4_rey');
MISIONES.splice(iRey, 0, SANGRE);

/** Acto 7: la Corona de Aun-Saar, a quién se la das. Cierra la historia. */
const aunsaar = MISIONES.find((m) => m.id === 'm7_aunsaar')!;
aunsaar.final = true;
aunsaar.hecho = ['Se terminó. Escucha: el cielo está callado.', 'It is over. Listen: the sky is silent.'];
aunsaar.eleccion = { pregunta: ['Pones la Corona de Aun-Saar sobre la mesa. Es pequeña, como para un niño, y está tibia. Todos callan. Auren estira las manos sin pedirla. Mira la mira como se mira un pájaro enjaulado. Nadie te dice que te la quedes. Nadie tiene que decirlo.', 'You set Aun-Saar\'s Crown on the table. It is small, as if for a child, and it is warm. Everyone falls silent. Auren reaches out without asking for it. Mira looks at it the way one looks at a caged bird. No one tells you to keep it. No one has to.'], opciones: [
  { texto: ['Dársela a Auren. Que la Iglesia la vigile.', 'Give it to Auren. Let the Church keep watch over it.'], decision: ['corona', 'auren'],
    hecho: ['Auren la envuelve en su manto sin mirarla. «La vamos a enterrar más hondo que el pozo, y vamos a cantar encima para siempre. Así se paga.»', 'Auren wraps it in his cloak without looking at it. "We will bury it deeper than the well, and we will sing over it forever. That is how it is paid for."'], premio: {} },
  { texto: ['Dársela a Mira. Que el cielo quede libre.', 'Give it to Mira. Let the sky be free.'], decision: ['corona', 'mira'],
    hecho: ['Mira la toma con las dos manos y sonríe por primera vez. «Las estrellas no son de nadie. Los dioses tampoco deberían serlo.» Sale al borde del campamento y mira hacia arriba.', 'Mira takes it with both hands and smiles for the first time. "The stars belong to no one. Gods should not belong to anyone either." She walks to the edge of the camp and looks up.'], premio: {} },
  { texto: ['Quedártela.', 'Keep it.'], decision: ['corona', 'quedarse'],
    hecho: ['Nadie dice nada mientras la levantas. Ysolde guarda sus cartas sin tirarlas. Auren baja la mirada. Tu Marca te dice lo que va a pasar antes de que pase.', 'No one says a word as you lift it. Ysolde puts away her cards without reading them. Auren lowers his eyes. Your Mark tells you what will happen before it happens.'], premio: {} },
] };

// ------------------------------------------------------------------ misiones secundarias nuevas (dos por acto, del 4 al 7)
const NUEVAS: Mision[] = [
  // ============================================================== ACTO 4
  M({ id: 'm4t_loba', acto: 4, lateral: true, da: 'hakon', requiere: ['m4_paso'], nombre: ['La cazadora que volvió', 'The Huntress Who Returned'],
    pedido: ['Sigrid, mi sobrina, cazaba lobos en las Minas. Apareció ayer en los Socavones, viva, después de tres lunas. Dice que no se acuerda de nada. Tráela al fortín. Y si en el camino te pide que la dejes descansar a oscuras, no la dejes.', 'Sigrid, my niece, hunted wolves in the Mines. She turned up yesterday in the Tunnels, alive, after three moons. She says she remembers nothing. Bring her to the fort. And if on the way she asks you to let her rest in the dark, do not let her.'],
    hecho: ['Hakon escucha y no dice nada. Después saca un cuchillo de hueso del cajón y te lo da. «Esto se lo hice yo a los siete años. Si lo llevaba, entonces era ella. Si no lo llevaba, entonces hace tres lunas que ya no estaba.» No te pregunta si lo llevaba.', 'Hakon listens and says nothing. Then he takes a bone knife from a drawer and gives it to you. "I made her this when she was seven. If she was carrying it, then it was her. If not, then she has been gone three moons already." He does not ask you whether she was carrying it.'],
    objetivo: { tipo: 'escoltar', zona: 'a4_minas1', sprite: 'saqueador', nombre: ['Sigrid la cazadora', 'Sigrid the huntress'],
      inicio: ['«Hakon te mandó, ¿verdad? Siempre manda a otro. Vamos. Hace frío aquí abajo. O no. Ya no sé.»', '"Hakon sent you, did he not? He always sends someone else. Let us go. It is cold down here. Or not. I no longer know."'],
      llegada: ['«Ya veo la luz. Qué raro. Me duele mirarla.»', '"I can see the light now. How strange. It hurts to look at it."'],
      muerte: ['Sigrid cae y no se levanta. Por un momento parece aliviada.', 'Sigrid falls and does not rise. For a moment she looks relieved.'],
      traicion: { monstruo: 'lobo_sombrio', nombre: ['Sigrid, la Loba Blanca', 'Sigrid, the White She-Wolf'], en: 0.5,
        frase: ['Sigrid se detiene y se dobla. Se le abre la espalda como una manta. «Me dijiste que no descansara a oscuras. Pero aquí abajo todo es oscuro.»', 'Sigrid stops and doubles over. Her back splits open like a blanket. "You told me not to rest in the dark. But down here everything is dark."'] } },
    premio: { unico: 'colmillo_de_la_loba_blanca', atributos: 2 },
    comentarios: [{ npc: 'sigrun', texto: ['Hakon cerró la herrería un día entero. Nunca la cierra. Ni cuando murió su mujer.', 'Hakon closed the forge for a whole day. He never closes it. Not even when his wife died.'] }] }),
  M({ id: 'm4t_runas', acto: 4, lateral: true, da: 'sigrun', requiere: ['m4_aliento'], nombre: ['Las runas del deshielo', 'The Runes of the Thaw'],
    pedido: ['En la Grieta Glaciar hay runas talladas por los primeros jarls. Mi abuela decía que explican cómo derretir la montaña entera. Si las traes, puedo terminar este invierno. O puedo enterrarlas otra vez, y que nadie las lea nunca. Tráelas y después decidimos.', 'In the Glacial Rift there are runes carved by the first jarls. My grandmother said they explain how to melt the whole mountain. If you bring them, I can end this winter. Or I can bury them again, and let no one ever read them. Bring them and then we decide.'],
    hecho: ['', ''],
    objetivo: { tipo: 'pistas', zona: 'a4_grieta', pistas: [
      { obj: 'hie_altar', v: 'roto', texto: ['Primera runa: «El hielo es la montaña dormida. El agua es la montaña despierta».', 'First rune: "Ice is the mountain asleep. Water is the mountain awake".'] },
      { obj: 'hie_cuerpo', v: 'acostado', texto: ['Segunda runa, grabada en el escudo de un muerto: «Quien la despierta la tiene que alimentar».', 'Second rune, carved on a dead man\'s shield: "Whoever wakes it must feed it".'] },
      { obj: 'hie_altar', v: 'ofrenda', texto: ['Tercera runa, bajo una ofrenda vieja: «Come pueblos. Siempre empieza por el más cercano».', 'Third rune, beneath an old offering: "It eats villages. It always starts with the nearest one".'] },
    ] },
    premio: { atributos: 2 },
    eleccion: { pregunta: ['Sigrun lee las tres runas dos veces. «Si las leo en voz alta, el invierno se termina mañana. Y la montaña se despierta con hambre. El fortín es el pueblo más cercano.» Te mira. «Mi abuela no me dijo esa parte.»', 'Sigrun reads the three runes twice. "If I read them aloud, winter ends tomorrow. And the mountain wakes up hungry. The fort is the nearest village." She looks at you. "My grandmother never told me that part."'], opciones: [
      { texto: ['Leerlas tú, lejos del fortín. Que la montaña te busque a ti.', 'Read them yourself, far from the fort. Let the mountain look for you.'],
        hecho: ['Lees las runas en el borde de la Grieta, solo. El hielo cruje y algo grande se da vuelta debajo, buscándote. Tu Marca se calienta. Esa noche el fortín no siente frío por primera vez en años. Tú sí.', 'You read the runes at the edge of the Rift, alone. The ice cracks and something big turns over below, looking for you. Your Mark grows warm. That night the fort does not feel cold for the first time in years. You do.'],
        premio: { unico: 'runa_del_deshielo', vida: 10 } },
      { texto: ['Enterrarlas otra vez.', 'Bury them again.'],
        hecho: ['Sigrun entierra las runas bajo el fuego del fortín y pone una piedra encima. «Prefiero el frío que conozco.» Te da lo que su abuela le dejó a ella, que no es mucho, pero pesa.', 'Sigrun buries the runes beneath the fort\'s fire and sets a stone on top. "I prefer the cold I know." She gives you what her grandmother left her, which is not much, but it weighs.'],
        premio: { habilidad: 1, oro: 900 } },
    ] },
    comentarios: [
      { npc: 'nino_nieve', eleccion: 0, texto: ['El niño de la nieve no se acerca más a ti. Dice que hueles a agua.', 'The snow child does not come near you anymore. He says you smell of water.'] },
      { npc: 'nino_nieve', eleccion: 1, texto: ['El niño de la nieve duerme junto al fuego, encima de la piedra. Dice que abajo hay alguien que habla dormido.', 'The snow child sleeps by the fire, on top of the stone. He says someone beneath it talks in their sleep.'] },
    ] }),
  // ============================================================== ACTO 5
  M({ id: 'm5t_penitente', acto: 5, lateral: true, da: 'lys', nombre: ['El penitente de la Fragua', 'The Penitent of the Forge'],
    pedido: ['En el Abismo de los Susurros hay un hombre encadenado que dice haber sido uno de los herreros de Ozmaren. Dice que se arrepintió. Quiere venir al Bastión y contarnos cómo están hechas las cadenas, para que Brannoc las rompa. Tráelo. Y no le quites la cadena aunque te lo pida.', 'In the Abyss of Whispers there is a chained man who claims he was one of Ozmaren\'s smiths. He says he repented. He wants to come to the Bastion and tell us how the chains are made, so Brannoc can break them. Bring him. And do not take off his chain, even if he asks.'],
    hecho: ['Lys te cura sin decir nada. Cuando termina, te pone la cadena en las manos. «La próxima vez que alguien te diga que se arrepintió, mírale las manos, no la cara.»', 'Lys heals you without a word. When she finishes, she puts the chain in your hands. "Next time someone tells you they repented, look at their hands, not their face."'],
    objetivo: { tipo: 'escoltar', zona: 'a5_abismo1', sprite: 'cultista', nombre: ['Odvar el penitente', 'Odvar the penitent'],
      inicio: ['«Gracias. Gracias. Llevo cien años colgando de esta cadena. ¿Me la quitas? No, tienes razón. Primero salgamos.»', '"Thank you. Thank you. I have hung from this chain for a hundred years. Will you take it off? No, you are right. Let us get out first."'],
      llegada: ['«El Bastión. Huele a pan. Hace cien años que no huelo pan.»', '"The Bastion. It smells of bread. I have not smelled bread in a hundred years."'],
      muerte: ['Odvar cae con la cadena enredada en el cuello. Sonríe. Tal vez era eso lo que quería.', 'Odvar falls with the chain tangled around his neck. He smiles. Perhaps that is what he wanted.'],
      traicion: { monstruo: 'sacerdote_caido', nombre: ['Odvar, el que Forjó las Cadenas', 'Odvar Who Forged the Chains'], en: 0.6,
        frase: ['La cadena se rompe sola. Odvar se endereza y crece. «Cien años esperando que alguien me sacara. Ozmaren cayó, pero su fragua sigue encendida. Y necesita carbón.»', 'The chain snaps on its own. Odvar straightens and grows. "A hundred years waiting for someone to take me out. Ozmaren fell, but his forge still burns. And it needs coal."'] } },
    premio: { unico: 'cadena_del_penitente', resistencia: 5 },
    comentarios: [{ npc: 'brannoc', texto: ['Me dijeron que el herrero arrepentido no era herrero. Era el yunque. Menos mal que no lo traje a mi fragua.', 'They told me the repentant smith was no smith. He was the anvil. Good thing I never brought him to my forge.'] }] }),
  M({ id: 'm5t_juicio', acto: 5, lateral: true, da: 'auren', requiere: ['m5_heraldo'], nombre: ['El juicio de las cenizas', 'The Judgment of Ashes'],
    pedido: ['En la Herida hay tres braseros donde el Coro juzgaba a los suyos. Se encendían con la ceniza de un culpable, y la llama decía la verdad. Antes de entrar al Corazón quiero saber algo de Vesperio que no me atrevo a preguntar. Enciende los tres y escucha lo que dicen las llamas.', 'In the Wound there are three braziers where the Choir judged its own. They were lit with a guilty man\'s ash, and the flame told the truth. Before you enter the Heart I want to know something about Vesperio that I dare not ask. Light all three and listen to what the flames say.'],
    hecho: ['', ''],
    objetivo: { tipo: 'ritual', zona: 'a5_santuario1', n: 3, reliquia: ['inf2_cuerpos', 'calcinado'], altar: ['inf2_altar', 'piedra', 'velas'] },
    premio: { atributos: 3 },
    eleccion: { pregunta: ['Las tres llamas hablaron con la misma voz: Vesperio no cantó solo aquella noche. Cantó con su maestro de coro, que le enseñó la canción y después lo dejó cargar la culpa. Su maestro se llamaba Auren. Auren te mira desde el fuego. No niega nada.', 'All three flames spoke with the same voice: Vesperio did not sing alone that night. He sang with his choirmaster, who taught him the song and then let him carry the blame. His choirmaster\'s name was Auren. Auren looks at you from the fire. He denies nothing.'], opciones: [
      { texto: ['Perdonarlo. Lo que hizo ya lo está pagando.', 'Forgive him. He is already paying for what he did.'],
        hecho: ['Auren no te da las gracias. Te da la ceniza que quedó en los braseros, dentro de su cetro. «Cada canto que canté desde esa noche fue para pagarla. No me alcanzó. Tal vez contigo alcance.»', 'Auren does not thank you. He gives you the ash left in the braziers, inside his scepter. "Every song I have sung since that night was to pay for it. It was not enough. Perhaps with you it will be."'],
        premio: { unico: 'ceniza_de_los_justos' } },
      { texto: ['Contárselo a todo el Bastión.', 'Tell the whole Bastion.'],
        hecho: ['Lo cuentas junto al fuego, en voz alta. Nadie se mueve. Después Odrán se levanta, escupe en el suelo y se va a dormir. Auren se queda solo. Al otro día sigue dando misiones, pero ya nadie le contesta el saludo. A ti te dejan una bolsa de oro en la puerta, sin firma.', 'You tell it by the fire, out loud. No one moves. Then Odran stands, spits on the ground and goes to sleep. Auren is left alone. The next day he still hands out tasks, but no one returns his greeting. Someone leaves a bag of gold at your door, unsigned.'],
        premio: { oro: 2500, habilidad: 1 } },
    ] },
    comentarios: [
      { npc: 'odran', eleccion: 0, texto: ['Auren te contó algo, ¿no? Se le nota. Camina más derecho, como el que dejó una carga en el suelo. No me lo cuentes. Ya estoy viejo para cargas ajenas.', 'Auren told you something, did he not? It shows. He walks straighter, like someone who set a burden down. Do not tell me. I am too old for other people\'s burdens.'] },
      { npc: 'odran', eleccion: 1, texto: ['Treinta años cantando a su lado. Treinta años. Y lo supo siempre.', 'Thirty years singing at his side. Thirty years. And he knew all along.'] },
    ] }),
  // ============================================================== ACTO 6
  M({ id: 'm6t_bitacora', acto: 6, lateral: true, da: 'tarn', nombre: ['La bitácora de la capitana', 'The Captain\'s Logbook'],
    pedido: ['La madre de Oyá era capitana, como ella. Su barco se hundió con Ysmeral hace treinta años. Encontré su bitácora repartida en la Costa de los Naufragios, página por página. Oyá no sabe que existe. Junta lo que falta. Después decides tú si se la damos.', 'Oya\'s mother was a captain, like her. Her ship sank with Ysmeral thirty years ago. I found her logbook scattered along the Shipwreck Coast, page by page. Oya does not know it exists. Gather what is missing. Then you decide whether we give it to her.'],
    hecho: ['', ''],
    objetivo: { tipo: 'pistas', zona: 'a6_costa', pistas: [
      { obj: 'par_cadaver', v: 'campesino', texto: ['«Día 3. La ciudad sube del agua y las campanas tocan. La tripulación quiere ir. Yo no. Oyá tiene cuatro años y me espera en el puerto.»', '"Day 3. The city rises from the water and the bells ring. The crew wants to go. I do not. Oya is four years old and waits for me at the port."'] },
      { obj: 'abi_reliquia', v: 'libro', texto: ['«Día 5. Fui. Las campanas tocaban mi nombre. No sé por qué fui. Sí sé. Me prometieron que si iba, Oyá nunca se iba a ahogar.»', '"Day 5. I went. The bells were ringing my name. I do not know why I went. Yes, I do. They promised me that if I went, Oya would never drown."'] },
      { obj: 'par_cadaver', v: 'con_cuervos', texto: ['«Último día. Cumplieron. Oyá nunca se va a ahogar. Pero el mar se la va a llevar de otra forma, y yo no voy a estar para verlo. Perdóname, hija.»', '"Last day. They kept their word. Oya will never drown. But the sea will take her some other way, and I will not be there to see it. Forgive me, daughter."'] },
    ] },
    premio: { atributos: 2 },
    eleccion: { pregunta: ['Tarn sostiene la bitácora con las dos manos. «Si se la doy, va a saber que su madre la cambió por una promesa de campanas. Si no se la doy, va a seguir pensando que la abandonó.» Te la pasa a ti.', 'Tarn holds the logbook in both hands. "If I give it to her, she will know her mother traded her for a promise from the bells. If I do not, she will go on thinking she was abandoned." He hands it to you.'], opciones: [
      { texto: ['Dársela a Oyá.', 'Give it to Oya.'],
        hecho: ['Oyá lee toda la noche, sola, en la proa. A la mañana tiene los ojos secos y la brújula de su madre en la mano. Te la da. «A mí ya no me sirve. Ya sé dónde está lo que buscaba.»', 'Oya reads all night, alone, at the prow. By morning her eyes are dry and her mother\'s compass is in her hand. She gives it to you. "It is no use to me anymore. I know where what I was looking for is now."'],
        premio: { unico: 'brujula_de_la_capitana' } },
      { texto: ['Devolverla al mar.', 'Return it to the sea.'],
        hecho: ['Tiras la bitácora desde la borda. Flota un momento, se abre en la última página y se hunde. Tarn asiente. «Algunas verdades son para los muertos.» Te paga lo que vale callar, que en este barco es bastante.', 'You throw the logbook over the rail. It floats a moment, opens to the last page and sinks. Tarn nods. "Some truths are for the dead." He pays you what silence is worth, which on this ship is a good deal.'],
        premio: { oro: 2500, vida: 15 } },
    ] },
    comentarios: [
      { npc: 'oya', eleccion: 0, texto: ['Mi madre no me abandonó. Me compró. Es distinto. No sé si es mejor.', 'My mother did not abandon me. She bought me. It is different. I do not know if it is better.'] },
      { npc: 'nerea', eleccion: 1, texto: ['Vi algo flotar junto al casco anoche. Un libro. Las páginas se movían como si alguien las leyera desde abajo.', 'I saw something floating by the hull last night. A book. The pages moved as if someone were reading them from below.'] },
    ] }),
  M({ id: 'm6t_marea', acto: 6, lateral: true, da: 'sor_salitre', requiere: ['m6_plaza'], nombre: ['El sacerdote de la marea', 'The Tide Priest'],
    pedido: ['En la Plaza de las Ánimas predica un sacerdote que dice que el mar es misericordioso. Los ahogados lo escuchan y se quedan quietos. Quiere venir al barco y bendecirnos. Dice que así la marea no nos va a tocar. Tráelo. Yo también quiero creerle.', 'In the Square of Souls a priest preaches that the sea is merciful. The drowned listen to him and keep still. He wants to come to the ship and bless us. He says that way the tide will never touch us. Bring him. I want to believe him too.'],
    hecho: ['Sor Salitre reza toda la noche. A la mañana te da el báculo del sacerdote, todavía mojado. «Predicaba la paz. Y tenía razón en una cosa: los ahogados sí lo escuchaban. Era su pastor.»', 'Sister Brine prays all night. In the morning she gives you the priest\'s staff, still wet. "He preached peace. And he was right about one thing: the drowned did listen to him. He was their shepherd."'],
    objetivo: { tipo: 'escoltar', zona: 'a6_barrio2', sprite: 'aparecida', nombre: ['El sacerdote de la marea', 'The tide priest'],
      inicio: ['«El mar no odia a nadie, hijo. Solo tiene sed, como todos. Vamos al barco. Les voy a enseñar a no tenerle miedo.»', '"The sea hates no one, child. It is only thirsty, like everyone. Let us go to the ship. I will teach them not to fear it."'],
      llegada: ['«El barco. Qué bonito. Qué lleno de gente.»', '"The ship. How beautiful. How full of people."'],
      muerte: ['El sacerdote cae al agua y se deja llevar sin luchar. Los ahogados de la plaza se dan vuelta para mirarte.', 'The priest falls into the water and lets himself be carried away without a struggle. The drowned in the square turn to look at you.'],
      traicion: { monstruo: 'sacerdote_marea', nombre: ['El Pastor de los Ahogados', 'The Shepherd of the Drowned'], en: 0.55,
        frase: ['El sacerdote se detiene en medio de la plaza y abre los brazos. Del agua suben todos los que estaban quietos. «No les tengas miedo. Vienen conmigo al barco. Todos.»', 'The priest stops in the middle of the square and opens his arms. From the water rise all those who were still. "Do not be afraid of them. They are coming with me to the ship. All of them."'] } },
    premio: { unico: 'voz_del_sacerdote_marea', habilidad: 1 },
    comentarios: [{ npc: 'tarn', texto: ['Sor Salitre ya no reza en voz alta. Dice que no sabe quién más escucha.', 'Sister Brine no longer prays aloud. She says she does not know who else is listening.'] }] }),
  // ============================================================== ACTO 7
  M({ id: 'm7t_copa', acto: 7, lateral: true, da: 'eskel', requiere: ['m7_puente'], nombre: ['La copa que Eskel no bebió', 'The Cup Eskel Did Not Drink'],
    pedido: ['Yo subí antes que tú. Hace cuarenta años. Llegué al trono y Aun-Saar me ofreció su copa. No la bebí. Me escondí, y por eso estoy vivo, y por eso no soy nadie. En las Islas Altas hay tres copas como esa. Si las vacías en las fuentes secas, el dios pierde lo que guardó para el próximo que suba. Hazlo por mí.', 'I climbed before you. Forty years ago. I reached the throne and Aun-Saar offered me his cup. I did not drink. I hid, and that is why I am alive, and that is why I am no one. In the High Isles there are three cups like that one. If you empty them into the dry fountains, the god loses what he saved for the next one to climb. Do it for me.'],
    hecho: ['Eskel martilla la última copa hasta que deja de ser una copa. Te la da. «Ahora el que sube no tiene nada que rechazar. Tiene que pelear. Es más justo.»', 'Eskel hammers the last cup until it is no longer a cup. He gives it to you. "Now whoever climbs has nothing to refuse. They have to fight. It is fairer."'],
    objetivo: { tipo: 'ritual', zona: 'a7_islas2', n: 3, reliquia: ['cel_trono_copa', 'entera'], altar: ['cel_fuente_seca', 'rota', 'con_estatua'], guardian: 'guardian_halo' },
    premio: { unico: 'copa_de_eskel', atributos: 2 },
    comentarios: [{ npc: 'hollin', texto: ['Eskel durmió toda la noche. Cuarenta años sin dormir, y anoche roncó como un buey.', 'Eskel slept all night. Forty years without sleep, and last night he snored like an ox.'] }] }),
  M({ id: 'm7t_angel', acto: 7, lateral: true, da: 'mira', requiere: ['m7_escaleras'], nombre: ['El ángel que pedía agua', 'The Angel Who Begged for Water'],
    pedido: ['En el Cielo Roto hay un ángel tirado en el suelo que pide agua con voz de niño. Los otros dicen que es una trampa. Yo no sé. Las estrellas que solté también parecían trampas, y no lo eran. Llévale agua y quédate cerca hasta que beba todo. Si es una trampa, te vas a enterar. Si no lo es, alguien tiene que darle de beber.', 'In the Broken Sky there is an angel lying on the ground, begging for water in a child\'s voice. The others say it is a trap. I do not know. The stars I set free also looked like traps, and they were not. Take it water and stay close until it has drunk it all. If it is a trap, you will find out. If not, someone has to give it a drink.'],
    hecho: ['Mira te escucha con los ojos cerrados. «Entonces era una trampa. Y le diste agua igual.» Te pone una pluma dorada en la mano. «Eso es lo que te hace distinto de él.»', 'Mira listens to you with her eyes closed. "So it was a trap. And you gave it water anyway." She places a golden feather in your hand. "That is what makes you different from him."'],
    objetivo: { tipo: 'purgar', zona: 'a7_cielo', n: 45, tiempo: 170 },
    premio: { unico: 'ala_del_angel_sediento', resistencia: 6 },
    comentarios: [{ npc: 'eskel', texto: ['¿Le diste de beber al ángel? Yo pasé a su lado hace cuarenta años y no me detuve. Mira tiene razón. Tú eres distinto.', 'You gave the angel a drink? I walked past it forty years ago and did not stop. Mira is right. You are different.'] }] }),
];
// el ángel: al purgar, el que pedía agua llama a todos los sedientos del cielo
const angel = NUEVAS.find((m) => m.id === 'm7t_angel')!;
angel.pedido = [angel.pedido[0] + ' Tarda en beber, y mientras bebe, los que tienen sed lo oyen.', angel.pedido[1] + ' It drinks slowly, and while it drinks, the thirsty ones hear it.'];
MISIONES.push(...NUEVAS);

// ------------------------------------------------------------------ lo que dice la gente
const linea = (npc: string, l: Linea) => { const dl = (DIALOGOS[npc] ??= {}); (dl.lineas ??= []).push(l); };
for (const m of NUEVAS) for (const c of m.comentarios ?? []) linea(c.npc, c.eleccion === undefined ? { acto: m.acto, hecha: [m.id], texto: c.texto } : { acto: m.acto, eleccion: [m.id, c.eleccion], texto: c.texto });
for (const m of [...NUEVAS, SANGRE]) linea(m.da ?? 'sigrun', { acto: m.acto, activa: m.id, texto: m.pedido });

// según lo que pasó con Vigdis
linea('sigrun', { acto: 4, decision: ['vigdis', 'salvar'], texto: ['Vigdis no me habla. Dice que le robaste la única cosa que había decidido sola en veinte inviernos. Pero sigue cosiendo heridas. Es lo que hace.', 'Vigdis will not speak to me. She says you stole the only thing she had decided on her own in twenty winters. But she still stitches wounds. It is what she does.'] });
linea('sigrun', { acto: 4, decision: ['vigdis', 'sacrificar'], texto: ['La tumba de Vigdis está vacía, pero tibia. Le pongo nieve encima cada mañana y cada mañana se derrite. No sé si eso es bueno.', 'Vigdis\'s grave is empty, but warm. I put snow on it every morning and every morning it melts. I do not know if that is good.'] });
linea('hakon', { acto: 4, decision: ['vigdis', 'sacrificar'], texto: ['Ahora cuando me corto, me curo solo. Mal. Vigdis me habría retado por las vendas. Extraño que me reten.', 'Now when I cut myself, I heal myself. Badly. Vigdis would have scolded me over the bandages. I miss being scolded.'] });
linea('hakon', { acto: 4, decision: ['vigdis', 'salvar'], texto: ['Vigdis se quedó, y el rey va a estar entero. Te forjé el acero más duro que tengo. Lo vas a necesitar.', 'Vigdis stayed, and the king will be whole. I forged you the hardest steel I have. You will need it.'] });
linea('nino_nieve', { acto: 4, decision: ['vigdis', 'sacrificar'], texto: ['El niño de la nieve pone la mano sobre la tumba vacía y la deja ahí mucho rato. «Está tibia», dice. «Como yo quería estar.»', 'The snow child lays his hand on the empty grave and leaves it there a long time. "It is warm," he says. "The way I wanted to be."'] });
for (const npc of ['auren', 'brannoc']) linea(npc, { decision: ['vigdis', 'sacrificar'], texto: npc === 'auren'
  ? ['Me contaron lo de la curandera del norte. Hay quien dice que fue un sacrificio. Yo digo que fue una elección. La de ella. Y la tuya.', 'They told me about the healer from the north. Some say it was a sacrifice. I say it was a choice. Hers. And yours.']
  : ['El hacha que dejó en la puerta del fortín... ¿todavía está tibia? Si alguna vez la quieres afilar, no la traigas. No quiero sentirla latir en mi yunque.', 'The axe she left at the fort\'s gate... is it still warm? If you ever want it sharpened, do not bring it. I do not want to feel it beat on my anvil.'] });
linea('lys', { decision: ['vigdis', 'salvar'], texto: ['Vigdis me enseñó a coser con hilo de tripa de foca. Dice que no se suelta nunca. Como ella, supongo.', 'Vigdis taught me to stitch with seal-gut thread. She says it never comes loose. Like her, I suppose.'] });
// según la Brasa, en el acto 7 (antes de la Corona)
linea('auren', { acto: 7, decision: ['brasa', 'absorber'], texto: ['Tienes la sed adentro y vas a ver a quien la inventó. Te va a reconocer. Cuando lo haga, acuérdate de que también tienes un nombre propio.', 'You carry the thirst inside and you are going to see the one who invented it. He will recognize you. When he does, remember that you also have a name of your own.'] });
linea('auren', { acto: 7, decision: ['brasa', 'destruir'], texto: ['Tu Marca está gris. Para él vas a ser invisible hasta que lo tengas enfrente. Aprovéchalo.', 'Your Mark is grey. To him you will be invisible until you are standing in front of him. Use that.'] });
// después de la Corona, para quien se queda en el mundo
linea('auren', { acto: 7, decision: ['corona', 'auren'], texto: ['La Corona pesa más cada día. Ya elegí a los doce que van a cantar sobre ella. Yo voy a ser el primero.', 'The Crown grows heavier every day. I have already chosen the twelve who will sing over it. I will be the first.'] });
linea('mira', { acto: 7, decision: ['corona', 'mira'], texto: ['Cuento estrellas otra vez. Hay muchas más de las que había. Los dioses tapaban la mitad, ¿te imaginas?', 'I count stars again. There are many more than there were. The gods covered half of them, can you imagine?'] });
linea('mira', { acto: 7, decision: ['corona', 'quedarse'], texto: ['Mira no te mira. Cuenta estrellas en voz baja, y cuando llega a una que brilla rojo, se salta el número.', 'Mira does not look at you. She counts stars under her breath, and when she reaches one that glows red, she skips the number.'] });
linea('ysolde', { acto: 7, decision: ['corona', 'quedarse'], texto: ['No te voy a tirar las cartas. Ya sé lo que salen. Siempre la misma. Siempre tú.', 'I will not read the cards for you. I know what comes up. Always the same one. Always you.'] });
