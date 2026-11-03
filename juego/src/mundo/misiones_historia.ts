// Misiones con historia: dos por acto, que no son "mata a X". Investigar, escoltar, purgar, ritual, cazar y traición,
// cada una con su legendaria fija (con nombre y lore) y con lo que comenta la gente del pueblo después.
// Se suman a MISIONES, UNICOS, NPCS, GENTE y DIALOGOS al importarse (desde actos67).
import { MISIONES, type Mision } from './actos';
import { UNICOS } from '../datos/objetos_datos';
import { leg } from '../datos/legendarias';
import { NPCS, GENTE, DIALOGOS } from '../datos/npcs';
import type { RangoStat, Stat } from '../juego/tipos_objetos';

const r = (stat: Stat, min: number, max: number = min): RangoStat => ({ stat, min, max });

// ------------------------------------------------------------------ las legendarias de las misiones (nunca caen al azar)
const PREMIOS = [
  // acto 1
  leg('cuerda_de_la_horca', 'Cuerda de la Horca', 'The Gallows String', 'arco_tejo_paramo', 1, 'sombra',
    [r('critico', 6, 9), r('dano_sangre', 3, 6), r('vida', 10, 16)],
    'Tensada con la soga de los ahorcados del bosque. Cada flecha que suelta tiene el peso de un cuerpo que cae.', 'Strung with the rope of the hanged in the wood. Every arrow it looses has the weight of a falling body.'),
  leg('penitencia_de_ciro', 'Penitencia de Ciro', 'Ciro\'s Penance', 'mangual_trilla', 1, 'sangre',
    [r('robo_vida', 3, 5), r('fue', 6, 10), r('res_sombra', 10, 15)],
    'Ciro se azotaba con ella cada noche, y cada noche ahorcaba a alguien para tener de qué arrepentirse.', 'Ciro scourged himself with it every night, and every night he hanged someone so he would have something to repent.'),
  // acto 2
  leg('vara_de_yusra', 'Vara de Yusra', 'Yusra\'s Rod', 'baculo_peregrino', 2, 'fuego',
    [r('mana', 20, 30), r('vel_mover', 10), r('radio_luz', 2)],
    'Con ella midió el desierto paso a paso. Las marcas de la vara no coinciden con ningún mapa conocido.', 'She measured the desert with it step by step. The marks on the rod match no known map.'),
  leg('segadora_de_nombres', 'Segadora de Nombres', 'Reaper of Names', 'guadana_siega', 2, 'sombra',
    [r('vida', 18, 26), r('robo_vida', 3, 6), r('dano_sangre', 6, 10)],
    'En la hoja hay nombres grabados que nadie grabó. Cuando matas con ella, aparece uno nuevo.', 'There are names etched on the blade that no one etched. When you kill with it, a new one appears.'),
  // acto 3
  leg('garras_del_manglar', 'Garras del Manglar', 'Mangrove Talons', 'garras_tigre', 3, 'veneno',
    [r('vel_ataque', 10, 15), r('res_veneno', 20, 30), r('des', 8, 12)],
    'Las arrancaron de algo que vivía bajo el agua negra y que todavía no termina de morir.', 'They were torn from something that lived beneath the black water and has not finished dying.'),
  leg('ojo_de_jade', 'Ojo de Jade', 'Eye of Jade', 'arco_cuerno', 3, 'veneno',
    [r('critico', 8, 12), r('des', 10, 14), r('hallazgo', 15, 25)],
    'El ídolo lloraba por este ojo. El Muelle lo guardó y la selva no lo perdonó.', 'The idol wept through this eye. The Wharf kept it, and the jungle did not forgive.'),
  leg('diente_de_la_madre', 'Diente de la Madre', 'Tooth of the Mother', 'daga_misericordia', 3, 'sangre',
    [r('robo_vida', 5, 8), r('vel_ataque', 10, 15), r('ene', 8, 12)],
    'Ixel lo devolvió a la tribu. La tribu le dio esto a cambio, y le pidió que no volviera.', 'Ixel returned it to the tribe. The tribe gave him this in exchange, and asked him not to come back.'),
  // acto 4
  leg('hacha_del_desertor', 'Hacha del Desertor', 'The Deserter\'s Axe', 'hacha_norte', 4, 'frio',
    [r('vida', 30, 45), r('reduc_dano', 4, 6), r('fue', 10, 14)],
    'Ulfar la tiró en la nieve cuando huyó de Hjaldur. La recogió al llegar, porque entendió que huir también es pelear.', 'Ulfar threw it in the snow when he fled Hjaldur. He picked it up again on arrival, for he understood that fleeing is also fighting.'),
  leg('aliento_de_los_abrazados', 'Aliento de los Abrazados', 'Breath of the Embraced', 'baculo_raiz_negra', 4, 'frio',
    [r('mana', 30, 45), r('res_frio', 25, 35), r('regen_mana', 20, 30)],
    'Se murieron abrazados para no tener frío. El báculo guarda el último calor que compartieron.', 'They died embracing so as not to be cold. The staff keeps the last warmth they shared.'),
  // acto 5
  leg('martillo_que_rompio_las_cadenas', 'Martillo que Rompió las Cadenas', 'The Hammer that Broke the Chains', 'martillo_forja', 5, 'fuego',
    [r('golpe_aplastante', 10, 15), r('fue', 14, 20), r('res_fuego', 20, 30)],
    'Brannoc lo forjó con los eslabones de las cadenas de los sellos. Todavía están calientes.', 'Brannoc forged it from the links of the seal chains. They are still warm.'),
  leg('cetro_del_coro_quemado', 'Cetro del Coro Quemado', 'Scepter of the Burned Choir', 'cetro_llama_santa', 5, 'luz',
    [r('mana', 40, 60), r('res_todo', 10, 15), r('vida', 30, 45)],
    'Cantaron hasta que el fuego les llegó a la boca. El cetro sigue cantando por ellos, muy bajito.', 'They sang until the fire reached their mouths. The scepter still sings for them, very softly.'),
  // acto 6
  leg('badajo_del_campanero', 'Badajo del Campanero', 'The Bell-Ringer\'s Clapper', 'maza_penitencia', 5, 'frio',
    [r('golpe_aplastante', 12, 18), r('vida', 35, 50), r('res_frio', 20, 30)],
    'Lo arrancaron de la campana para que no pudiera avisar. Ahora avisa cada vez que golpea.', 'They tore it from the bell so it could not warn anyone. Now it warns with every blow.'),
  leg('arpon_de_nerea', 'Arpón de Nerea', 'Nerea\'s Harpoon', 'lanza_obsidiana', 5, 'frio',
    [r('critico', 10, 14), r('vel_ataque', 10, 15), r('des', 12, 18)],
    'Nerea guardó la perla en el mar, donde tenía que estar. El mar le devolvió el arpón de su padre.', 'Nerea kept the pearl in the sea, where it belonged. The sea gave her back her father\'s harpoon.'),
  leg('susurro_de_la_perla', 'Susurro de la Perla', 'Whisper of the Pearl', 'varita_susurro', 5, 'sombra',
    [r('mana', 40, 55), r('ene', 12, 18), r('mas_habilidades', 1)],
    'Sor Salitre puso la perla en la varita. Por las noches se oye a alguien pedir que la devuelvan al agua.', 'Sister Brine set the pearl in the wand. At night someone can be heard asking for it to be returned to the water.'),
  // acto 7
  leg('jabalina_del_peregrino', 'Jabalina del Último Peregrino', 'Javelin of the Last Pilgrim', 'jabalina_arponera', 6, 'luz',
    [r('vida', 45, 60), r('vel_mover', 15), r('res_todo', 12, 18)],
    'La llevó hasta el borde del Jardín y la clavó allí, para que el próximo que suba sepa que se puede.', 'He carried it to the edge of the Garden and drove it there, so the next one to climb knows it can be done.'),
  leg('katana_del_halo_roto', 'Katana del Halo Roto', 'Katana of the Broken Halo', 'katana_bruma', 6, 'luz',
    [r('critico', 12, 16), r('vel_ataque', 15, 20), r('robo_vida', 4, 6)],
    'Forjada con los tres halos que encendiste. El dios sediento los extraña.', 'Forged from the three halos you lit. The thirsting god misses them.'),
];
for (const u of PREMIOS) { u.soloMision = true; UNICOS.push(u); }

// ------------------------------------------------------------------ Ciro, el penitente del Refugio (el traidor del acto 1)
NPCS['ciro'] = {
  id: 'ciro', nombre: ['Hermano Ciro, el penitente', 'Brother Ciro, the penitent'], oficio: 'relato', sprite: 'penitente', desaparece: 'm1s_ciro',
  cuerpo: {} as any, equipo: {} as any,
  saludo: [
    ['Ciro no levanta la capucha. «Rezo por los del bosque. Alguien tiene que rezar por ellos.»', 'Ciro does not lift his hood. "I pray for the ones in the wood. Someone has to pray for them."'],
    ['«Los ahorcados no pesan nada, ¿sabías? Se van livianos. Es un regalo.»', '"The hanged weigh nothing, did you know? They leave light. It is a gift."'],
  ],
  relato: ['«Llegué al Refugio con la ceniza. Desde entonces me azoto cada noche. No preguntes por qué. Pregúntale al bosque.»', '"I came to the Refuge with the ash. Since then I scourge myself every night. Do not ask why. Ask the wood."'],
};
GENTE[1].push('ciro');

// ------------------------------------------------------------------ las misiones
const M = (m: Mision) => m;
const NUEVAS: Mision[] = [
  // ============================================================== ACTO 1
  M({ id: 'm1s_ahorcados', acto: 1, lateral: true, da: 'tomas', nombre: ['Los que cuelgan', 'Those Who Hang'],
    pedido: ['Tomás te pone tres dibujos en la mano. Tres árboles del Bosque de los Ahorcados, y en cada uno un cuerpo con algo en el bolsillo. En el último dibujo hay una capucha que mira desde lejos. Tomás se toca la garganta y niega con la cabeza: no se ahorcaron solos.', 'Tomas puts three drawings in your hand. Three trees in the Hanged Men\'s Wood, and on each a body with something in its pocket. In the last drawing a hood watches from afar. Tomas touches his throat and shakes his head: they did not hang themselves.'],
    hecho: ['Tomás mira las tres notas y se pone blanco. Dibuja una capucha, después el Refugio, después a alguien que reza. Cuando levanta la vista, mira detrás de ti, hacia Ciro. Toma: es lo que encontraste en el último. Ya no lo quiere cerca.', 'Tomas looks at the three notes and goes pale. He draws a hood, then the Refuge, then someone praying. When he looks up, he looks behind you, towards Ciro. Take this: it is what you found on the last one. He does not want it near him anymore.'],
    objetivo: { tipo: 'pistas', zona: 'a1_bosque', pistas: [
      { obj: 'par_cadaver', v: 'campesino', texto: ['Un leñador. En el bolsillo, una nota con letra apretada: «Me pidió que lo acompañara a buscar leña para la capilla. Era un hombre de fe. Qué le iba a decir que no».', 'A woodcutter. In his pocket, a note in cramped handwriting: "He asked me to go with him to gather wood for the chapel. He was a man of faith. How could I say no".'] },
      { obj: 'par_cadaver', v: 'con_cuervos', texto: ['Una pastora. Los cuervos ya le sacaron los ojos. En la mano aprieta un trozo de tela de hábito, gris, de los que usan los penitentes del Refugio.', 'A shepherdess. The crows have already taken her eyes. In her hand she clutches a scrap of habit cloth, grey, the kind the Refuge penitents wear.'] },
      { obj: 'par_cadaver', v: 'flechado', texto: ['Un soldado que intentó huir: tiene una flecha en la espalda y la soga todavía al cuello. En la corteza, alguien grabó con cuidado: «Livianos. Se van livianos». Y una C.', 'A soldier who tried to flee: there is an arrow in his back and the rope still around his neck. On the bark, someone carved with care: "Light. They leave light". And a C.'] },
    ] },
    premio: { unico: 'cuerda_de_la_horca', oro: 300 },
    comentarios: [
      { npc: 'odran', texto: ['Tomás no ha dejado de mirar a Ciro desde que volviste. Yo tampoco.', 'Tomas has not stopped looking at Ciro since you came back. Neither have I.'] },
    ] }),
  M({ id: 'm1s_ciro', acto: 1, lateral: true, da: 'odran', requiere: ['m1s_ahorcados'], nombre: ['El penitente', 'The Penitent'],
    pedido: ['Lo dejamos dormir entre nosotros. Rezaba más que nadie. Cuando le pregunté por la C del bosque se rió, se bajó la capucha y salió caminando hacia el camposanto como si nada. Bajó a la Cripta de los Olvidados. Tráeme su cuerda, o su cabeza. Lo que sea más fácil de cargar.', 'We let him sleep among us. He prayed more than anyone. When I asked him about the C in the wood, he laughed, lowered his hood and walked off towards the churchyard as if nothing were wrong. He went down into the Crypt of the Forgotten. Bring me his rope, or his head. Whichever is easier to carry.'],
    hecho: ['Así que era él. Y lo dejamos comer de nuestra olla. Guarda su mangual: él lo usaba para pedir perdón. Úsalo tú para no tener que pedirlo nunca.', 'So it was him. And we let him eat from our pot. Keep his flail: he used it to ask forgiveness. Use it so you never have to ask.'],
    objetivo: { tipo: 'cazar', zona: 'a1_cripta', monstruo: 'penitente', nombre: ['Ciro, el que Ahorcaba', 'Ciro Who Hanged'], frase: ['«¿Viniste a rezar conmigo? Arrodíllate. La soga es corta, pero alcanza para los dos.»', '"Did you come to pray with me? Kneel. The rope is short, but there is enough for two."'] },
    premio: { unico: 'penitencia_de_ciro', atributos: 2 },
    comentarios: [
      { npc: 'lys', texto: ['Rezo por los del bosque. Por Ciro no puedo. Que me perdone quien tenga que perdonarme.', 'I pray for the ones in the wood. For Ciro I cannot. May whoever must forgive me, forgive me.'] },
      { npc: 'brannoc', texto: ['Le arreglé la hebilla del cinto a ese hombre. Dos veces. Ahora entiendo por qué se le gastaba tanto.', 'I mended that man\'s belt buckle. Twice. Now I understand why it wore out so fast.'] },
    ] }),
  // ============================================================== ACTO 2
  M({ id: 'm2s_cartografa', acto: 2, lateral: true, da: 'cartografo', nombre: ['La regla de Yusra', 'Yusra\'s Rule'],
    pedido: ['Mi aprendiza, Yusra, ve por mí desde que perdí los ojos. Quiere medir las Dunas hasta las ruinas viejas, donde el mapa se queda en blanco. Sola no llega: las arenas tienen dientes. Llévala. Ella mide, tú cuidas que siga respirando.', 'My apprentice, Yusra, sees for me since I lost my eyes. She wants to measure the Dunes all the way to the old ruins, where the map goes blank. Alone she will not make it: the sands have teeth. Take her. She measures, you make sure she keeps breathing.'],
    hecho: ['Yusra volvió con la regla llena de marcas. Dice que las dunas se mueven hacia el oeste un paso por noche, todas juntas, como si caminaran. Esta vara es suya: me pidió que te la diera. Dice que tú también mides el mundo, pero con otra cosa.', 'Yusra came back with the rod full of marks. She says the dunes move west one step each night, all together, as if they were walking. This rod is hers: she asked me to give it to you. She says you measure the world too, just with something else.'],
    objetivo: { tipo: 'escoltar', zona: 'a2_dunas', sprite: 'saqueador', nombre: ['Yusra la cartógrafa', 'Yusra the cartographer'],
      inicio: ['«Tú camina, yo cuento los pasos. Si algo sale de la arena, no me mires: pégale.»', '"You walk, I count the steps. If something comes out of the sand, do not look at me: hit it."'],
      llegada: ['«Aquí se acaba el mapa. Y mira: hay huellas que van hacia adentro y ninguna que vuelva. Lo anoto y nos vamos.»', '"The map ends here. And look: there are tracks going in and none coming back. I note it down and we leave."'],
      muerte: ['Yusra cae en la arena con la regla en la mano. La arena se la traga despacio, como si tuviera paciencia.', 'Yusra falls in the sand with the rod in her hand. The sand swallows her slowly, as if it had patience.'] },
    premio: { unico: 'vara_de_yusra', oro: 600 },
    comentarios: [{ npc: 'qadir', texto: ['La chica del cartógrafo dice que las dunas caminan. Yo le creo. El agua de los pozos también se está yendo hacia el oeste.', 'The cartographer\'s girl says the dunes walk. I believe her. The water in the wells is going west too.'] }] }),
  M({ id: 'm2s_nombres', acto: 2, lateral: true, da: 'nahla', nombre: ['Los nombres borrados', 'The Erased Names'],
    pedido: ['En el Pozo de los Nombres enterraban a los que el rey quería olvidar. Les rompían la lápida para que nadie los llamara. Pero los nombres siguen ahí, en piedras sueltas, y los muertos no descansan sin ellos. Junta tres piedras de nombre y ponlas en los altares viejos. Y si algo se despierta, no es culpa mía.', 'In the Well of Names they buried those the king wished forgotten. They broke the headstones so no one would call them. But the names are still there, on loose stones, and the dead will not rest without them. Gather three name-stones and set them on the old altars. And if something wakes up, it is not my fault.'],
    hecho: ['Esta noche, por primera vez desde que llegué, no oí rascar las paredes del pozo. Tres nombres volvieron a su sitio. El guardián que despertó era el último que quería olvido. Toma su guadaña: ahora sirve para lo contrario.', 'Tonight, for the first time since I came, I did not hear scratching in the well walls. Three names went back where they belong. The guardian that woke was the last one who wanted oblivion. Take its scythe: now it serves the opposite purpose.'],
    objetivo: { tipo: 'ritual', zona: 'a2_nombres1', n: 3, reliquia: ['mis_reliquia', 'hueso'], altar: ['cri_altar_huesos', 'con_craneo', 'con_velas'], guardian: 'momia' },
    premio: { unico: 'segadora_de_nombres' },
    comentarios: [{ npc: 'barzin', texto: ['Nahla durmió toda la noche. Nunca la había visto dormir. Algo hiciste allá abajo.', 'Nahla slept all night. I had never seen her sleep. You did something down there.'] }] }),
  // ============================================================== ACTO 3
  M({ id: 'm3s_plaga', acto: 3, lateral: true, da: 'tlalli', nombre: ['La flor que pudre', 'The Rotting Bloom'],
    pedido: ['En el Manglar Negro abrió una flor que no es flor. Suelta esporas, y lo que las respira se levanta torcido y con hambre. Si la plaga sigue creciendo llega al Muelle en dos noches. Entra y mata todo lo que se mueva, rápido, antes de que la flor termine de abrir. Te doy poco tiempo porque la flor tampoco te va a dar más.', 'In the Black Mangrove a flower opened that is not a flower. It sheds spores, and whatever breathes them rises twisted and hungry. If the plague keeps growing it reaches the Wharf in two nights. Go in and kill everything that moves, fast, before the flower finishes opening. I give you little time because the flower will not give you more.'],
    hecho: ['La flor se cerró. Se pudrió sola, sin nada que comer. Te arranqué esto de la última cosa que trajiste en la bota: estaba pegado. Lávalo antes de usarlo. O no lo laves: así pegan más.', 'The flower closed. It rotted on its own, with nothing left to feed on. I pulled this off the last thing you brought back on your boot: it was stuck there. Wash it before you use it. Or do not: they cut deeper that way.'],
    objetivo: { tipo: 'purgar', zona: 'a3_pantano', n: 40, tiempo: 150 },
    premio: { unico: 'garras_del_manglar', vida: 9 },
    comentarios: [{ npc: 'jorun', texto: ['Dicen que el Manglar quedó en silencio. Nunca había estado en silencio. No sé si eso es mejor.', 'They say the Mangrove went silent. It had never been silent. I do not know if that is better.'] }] }),
  M({ id: 'm3s_idolo', acto: 3, lateral: true, da: 'ixel', nombre: ['El ojo del ídolo', 'The Idol\'s Eye'],
    pedido: ['En el Nido de la Araña un cazacabezas le arrancó el ojo de jade al ídolo de la tribu. Desde entonces la tribu no deja que nadie del Muelle se acerque al río. Mata al cazacabezas y trae el ojo. Después decidiremos qué hacer con él. Yo sé lo que me gustaría. Tú sabrás lo que es justo.', 'In the Spider\'s Nest a headhunter tore the jade eye out of the tribe\'s idol. Since then the tribe lets no one from the Wharf near the river. Kill the headhunter and bring the eye. Then we will decide what to do with it. I know what I would like. You will know what is fair.'],
    hecho: ['Hecho está.', 'It is done.'],
    objetivo: { tipo: 'cazar', zona: 'a3_nido', monstruo: 'cazacabezas', nombre: ['Tozcatl, el que Arranca Ojos', 'Tozcatl the Eye-Taker'], frase: ['«El ojo ve lo que viene. Por eso me lo quedé: para verte llegar.»', '"The eye sees what is coming. That is why I kept it: to see you arrive."'] },
    eleccion: { pregunta: ['Ixel mira el ojo de jade en tu mano. «Oya lo quiere para el Muelle: dice que con él podríamos negociar el río. La tribu lo quiere de vuelta en el ídolo. ¿A quién se lo das?»', 'Ixel looks at the jade eye in your hand. "Oya wants it for the Wharf: she says with it we could bargain for the river. The tribe wants it back in the idol. Who do you give it to?"'],
      opciones: [
        { texto: ['Dárselo a Oya, para el Muelle', 'Give it to Oya, for the Wharf'], hecho: ['Oya guarda el ojo bajo llave. Esa noche llueven flechas sobre el Muelle, pocas, pero con nombre. Oya te da un arco tallado con un ojo de jade: «Con esto se ve más lejos. Lo vamos a necesitar».', 'Oya locks the eye away. That night arrows rain on the Wharf, few, but with names on them. Oya gives you a bow carved with a jade eye: "You see farther with this. We are going to need it".'], premio: { unico: 'ojo_de_jade' } },
        { texto: ['Devolverlo a la tribu', 'Return it to the tribe'], hecho: ['Ixel lleva el ojo río arriba. Vuelve sin sandalias y con una daga hecha de un diente enorme. «Me dieron esto y me pidieron que no volviera. Me pareció un buen trato.»', 'Ixel carries the eye upriver. He comes back without sandals and with a dagger made from an enormous tooth. "They gave me this and asked me not to come back. It seemed a fair deal."'], premio: { unico: 'diente_de_la_madre' } },
      ] },
    premio: {},
    comentarios: [
      { npc: 'oya', eleccion: 0, texto: ['El ojo está a salvo y el río cerrado. Ya encontraremos otra manera de cruzarlo. Siempre hay otra manera.', 'The eye is safe and the river closed. We will find another way to cross it. There is always another way.'] },
      { npc: 'oya', eleccion: 1, texto: ['Le diste el ojo a la tribu. Ixel dice que fue lo justo. Yo digo que lo justo no da de comer. Pero el río está abierto, eso sí.', 'You gave the eye to the tribe. Ixel says it was fair. I say fairness does not feed anyone. But the river is open, that much is true.'] },
    ] }),
  // ============================================================== ACTO 4
  M({ id: 'm4s_desertor', acto: 4, lateral: true, da: 'vigdis', nombre: ['El que huyó del rey', 'He Who Fled the King'],
    pedido: ['Hay un hombre escondido en el Paso del Glaciar. Se llama Ulfar. Era de la guardia de Hjaldur y huyó la noche en que el rey dejó de respirar y siguió hablando. Sabe cosas del trono. Si lo traes, Sigrun lo escucha. Si lo dejas allá, se lo comen los escarchados antes del amanecer.', 'There is a man hiding in the Glacier Pass. His name is Ulfar. He was in Hjaldur\'s guard and fled the night the king stopped breathing and kept on talking. He knows things about the throne. If you bring him, Sigrun will listen. If you leave him there, the frostbitten will eat him before dawn.'],
    hecho: ['Ulfar le contó a Sigrun que el rey ya no tiene corazón: tiene escarcha que late. Dice que el frío habla con su voz. Te dejó su hacha. «Que la use alguien que no huyó», dijo. Después pidió vino y lloró.', 'Ulfar told Sigrun the king no longer has a heart: he has frost that beats. He says the cold speaks with his voice. He left you his axe. "Let someone who did not flee use it," he said. Then he asked for wine and wept.'],
    objetivo: { tipo: 'escoltar', zona: 'a4_glaciar', sprite: 'guardia_corrupto', nombre: ['Ulfar el desertor', 'Ulfar the deserter'],
      inicio: ['«No me mires así. Yo vi lo que hay en el trono. Tú todavía no. Sácame de aquí y te cuento.»', '"Do not look at me like that. I saw what sits on the throne. You have not yet. Get me out of here and I will tell you."'],
      llegada: ['«Desde aquí veo el humo del Fortín. Nunca pensé que el humo me iba a parecer bonito.»', '"From here I can see the smoke of the Fort. I never thought smoke would look beautiful to me."'],
      muerte: ['Ulfar cae en la nieve. Antes de cerrar los ojos dice algo sobre un corazón de hielo. Nadie más lo va a escuchar.', 'Ulfar falls in the snow. Before closing his eyes he says something about a heart of ice. No one else will hear it.'] },
    premio: { unico: 'hacha_del_desertor', resistencia: 5 },
    comentarios: [{ npc: 'sigrun', texto: ['El desertor bebe todo el día y de noche grita el nombre del rey. Pero lo que contó era verdad. Gracias por traerlo vivo. Vivo es más útil.', 'The deserter drinks all day and screams the king\'s name at night. But what he told us was true. Thank you for bringing him alive. Alive is more useful.'] }] }),
  M({ id: 'm4s_abrazados', acto: 4, lateral: true, da: 'hakon', nombre: ['Los abrazados del hielo', 'The Embraced in the Ice'],
    pedido: ['Mis hijos subieron a las Cuevas del Aliento Helado a buscar a su madre. Ninguno de los tres volvió. No te pido que los traigas. Te pido que me digas qué pasó. Un viejo puede vivir con la pena, pero no con no saber.', 'My sons went up to the Caves of the Frozen Breath to find their mother. None of the three came back. I do not ask you to bring them. I ask you to tell me what happened. An old man can live with grief, but not with not knowing.'],
    hecho: ['Hakon escucha todo sin moverse. Cuando terminas, asiente. «Así que la encontraron. Y se quedaron con ella.» Te da el báculo de su mujer. «Ella lo usaba para espantar el frío. Úsalo tú. Yo ya no tengo a quién abrazar.»', 'Hakon listens to everything without moving. When you finish, he nods. "So they found her. And they stayed with her." He gives you his wife\'s staff. "She used it to keep the cold away. You use it. I have no one left to hold."'],
    objetivo: { tipo: 'pistas', zona: 'a4_hielo1', pistas: [
      { obj: 'hie2_cadaver', v: 'arrodillado', texto: ['El mayor. Murió arrodillado, mirando hacia adentro de la cueva. Tiene las uñas rotas de rascar el hielo. Del otro lado del hielo hay una cara.', 'The eldest. He died kneeling, looking into the cave. His nails are broken from scratching at the ice. On the other side of the ice there is a face.'] },
      { obj: 'hie2_cadaver', v: 'tendido', texto: ['El del medio. Lleva una carta en la mano: «Madre nos llama desde abajo. Dice que allá no hace frío. Dice que el rey le prometió calor».', 'The middle one. He holds a letter: "Mother calls us from below. She says it is not cold down there. She says the king promised her warmth".'] },
      { obj: 'hie2_cadaver', v: 'abrazados', texto: ['El menor y una mujer mayor, abrazados. La escarcha los cubrió a los dos al mismo tiempo. Ella sonríe. Él no.', 'The youngest and an older woman, embracing. The frost covered them both at the same time. She is smiling. He is not.'] },
    ] },
    premio: { unico: 'aliento_de_los_abrazados' },
    comentarios: [{ npc: 'nino_nieve', texto: ['El viejo Hakon ya no sale a mirar el camino. Antes lo miraba todo el día. Ahora mira el fuego.', 'Old Hakon does not go out to watch the road anymore. He used to watch it all day. Now he watches the fire.'] }] }),
  // ============================================================== ACTO 5
  M({ id: 'm5s_cadenas', acto: 5, lateral: true, da: 'brannoc', nombre: ['Los eslabones', 'The Links'],
    pedido: ['En las Llanuras de Ceniza quedaron eslabones de las cadenas que ataban los sellos. Sueltos, tirados como huesos. Si los llevas a los altares de piedra, se calientan y se pueden forjar. Con eso te hago algo que valga la pena. Pero ojo: las cadenas tenían quien las cuidara.', 'On the Ash Plains lie links from the chains that bound the seals. Loose, scattered like bones. If you carry them to the stone altars, they heat up and can be forged. With that I will make you something worth having. But beware: the chains had someone guarding them.'],
    hecho: ['Tres eslabones, tres noches en la fragua y un martillo que no se enfría. Lo forjé con las cadenas que ataron al mundo. Cuando lo bajes sobre algo, que sea sobre algo que lo merezca.', 'Three links, three nights in the forge, and a hammer that never cools. I forged it from the chains that bound the world. When you bring it down on something, let it be something that deserves it.'],
    objetivo: { tipo: 'ritual', zona: 'a5_llanuras', n: 3, reliquia: ['abi_reliquia', 'orbe'], altar: ['inf2_altar', 'piedra', 'velas'], guardian: 'carcelero' },
    premio: { unico: 'martillo_que_rompio_las_cadenas' },
    comentarios: [{ npc: 'auren', texto: ['Brannoc no duerme desde que le llevaste esos eslabones. Dice que la fragua le habla. Yo le dije que descanse. Él me dijo que la fragua tampoco descansa.', 'Brannoc has not slept since you brought him those links. He says the forge speaks to him. I told him to rest. He told me the forge does not rest either.'] }] }),
  M({ id: 'm5s_ceniza', acto: 5, lateral: true, da: 'lys', nombre: ['El coro quemado', 'The Burned Choir'],
    pedido: ['En el Río de Lava se levantan los del coro del Bastión, los que cantaron mientras ardían. No están en paz. Si no los paras rápido, cantan, y su canto llama a más. Ve y hazlos callar. Con cariño, si puedes. Rápido, si no.', 'At the Lava River the choir of the Bastion are rising, the ones who sang while they burned. They are not at peace. If you do not stop them quickly, they sing, and their song calls more. Go and silence them. Gently, if you can. Quickly, if not.'],
    hecho: ['Esta noche nadie cantó en el río. Encontré esto en el altar del Bastión, donde no había nada ayer. Creo que te lo dejaron ellos. Creo que es un gracias.', 'Tonight no one sang at the river. I found this on the Bastion altar, where there was nothing yesterday. I think they left it for you. I think it is a thank-you.'],
    objetivo: { tipo: 'purgar', zona: 'a5_rio', n: 50, tiempo: 180 },
    premio: { unico: 'cetro_del_coro_quemado' },
    comentarios: [{ npc: 'ysolde', texto: ['El río de lava ya no canta. Lo extraño un poco. Era lo único bonito de este lugar, aunque fuera horrible.', 'The lava river does not sing anymore. I miss it a little. It was the only beautiful thing here, even if it was horrible.'] }] }),
  // ============================================================== ACTO 6
  M({ id: 'm6s_campanero', acto: 6, lateral: true, da: 'tarn', nombre: ['Quién mató al campanero', 'Who Killed the Bell-Ringer'],
    pedido: ['Antes de que el agua subiera, el campanero de Ysmeral tocó a rebato. Una sola vez. Después la campana se calló y la ciudad se hundió sin aviso. Siempre dijeron que se ahogó. Yo lo conocía: nadaba mejor que un pez. Ve al Barrio Sumergido y averigua qué le pasó.', 'Before the water rose, the bell-ringer of Ysmeral sounded the alarm. Once. Then the bell went silent and the city sank without warning. They always said he drowned. I knew him: he swam better than a fish. Go to the Sunken Quarter and find out what happened to him.'],
    hecho: ['Así que fue la Orden. Lo callaron para que nadie huyera, porque la campana tenía que sonar llena para el dios. Toma el badajo: lo arrancaron para que no pudiera volver a avisar. Úsalo para avisarles tú.', 'So it was the Order. They silenced him so no one would flee, because the bell had to ring full for the god. Take the clapper: they tore it out so it could never warn again. Use it to warn them yourself.'],
    objetivo: { tipo: 'pistas', zona: 'a6_barrio1', pistas: [
      { obj: 'cem2_velas_tumba', v: 'en_calavera', texto: ['Un altar de calle con velas que no se apagan bajo el agua. Entre la cera, un sello de la Orden de la Marea y la fecha de la noche en que se hundió la ciudad.', 'A street shrine with candles that do not go out underwater. In the wax, a seal of the Order of the Tide and the date of the night the city sank.'] },
      { obj: 'abi_reliquia', v: 'libro', texto: ['Un registro del campanario, hinchado de agua: «El campanero insiste en tocar a rebato. La Madre Superiora ordena retirarle el badajo. Que suene una sola vez, y llena, cuando llegue la hora».', 'A belfry ledger, swollen with water: "The bell-ringer insists on sounding the alarm. The Mother Superior orders his clapper removed. Let it ring once, and full, when the hour comes".'] },
      { obj: 'abi_reliquia', v: 'craneo', texto: ['Un cráneo atado a una cuerda de campana, con los dientes rotos de morderla. Tiene grabado en la frente: «Calla». Alguien lo dejó aquí para que la ciudad lo viera.', 'A skull tied to a bell rope, its teeth broken from biting it. Carved on its brow: "Silence". Someone left it here for the city to see.'] },
    ] },
    premio: { unico: 'badajo_del_campanero' },
    comentarios: [
      { npc: 'sor_salitre', texto: ['Me miras distinto desde que volviste del Barrio. No fui yo. Pero sí, yo llevaba ese hábito. Todas lo llevábamos.', 'You look at me differently since you came back from the Quarter. It was not me. But yes, I wore that habit. We all wore it.'] },
      { npc: 'nerea', texto: ['El calafate lloró por el campanero. Nunca lo había visto llorar. Ni cuando se le hundió el barco.', 'The caulker wept for the bell-ringer. I had never seen him cry. Not even when his ship sank.'] },
    ] }),
  M({ id: 'm6s_perla', acto: 6, lateral: true, da: 'nerea', nombre: ['La perla de la sirena', 'The Siren\'s Pearl'],
    pedido: ['En el Arrecife de Huesos canta una sirena hueca. Tiene en el pecho una perla negra que fue de mi madre: se la tragó el día que el mar se la llevó. Mátala y trae la perla. Sor Salitre dice que la perla tiene poder, que puede servirle a la Orden. Yo digo que es de mi madre.', 'On the Bone Reef a hollow siren sings. In her chest is a black pearl that belonged to my mother: she swallowed it the day the sea took her. Kill her and bring the pearl. Sister Brine says the pearl has power, that it could serve the Order. I say it is my mother\'s.'],
    hecho: ['Hecho está.', 'It is done.'],
    objetivo: { tipo: 'cazar', zona: 'a6_arrecife', monstruo: 'sirena_hueca', nombre: ['La que Canta con Voz Ajena', 'She Who Sings with Another\'s Voice'], frase: ['La sirena canta con voz de mujer vieja: «Nerea, hija, no vengas. Aquí abajo no hace frío.»', 'The siren sings in an old woman\'s voice: "Nerea, daughter, do not come. It is not cold down here."'] },
    eleccion: { pregunta: ['La perla está fría en tu mano. Nerea la mira y no dice nada. Sor Salitre, desde la puerta, dice: «Con eso podemos ver lo que ve el dios». ¿A quién se la das?', 'The pearl is cold in your hand. Nerea looks at it and says nothing. Sister Brine, from the doorway, says: "With that we can see what the god sees". Who do you give it to?'],
      opciones: [
        { texto: ['A Nerea, para el mar', 'To Nerea, for the sea'], hecho: ['Nerea camina hasta la orilla y tira la perla lejos, al agua. Cuando vuelve trae un arpón viejo cubierto de percebes. «Estaba ahí, esperándome. Era de mi padre.»', 'Nerea walks to the shore and throws the pearl far out into the water. When she returns she carries an old harpoon covered in barnacles. "It was there, waiting for me. It was my father\'s."'], premio: { unico: 'arpon_de_nerea' } },
        { texto: ['A Sor Salitre, para la Orden', 'To Sister Brine, for the Order'], hecho: ['Sor Salitre engasta la perla en una varita delante de ti, sin prisa. Nerea se va sin despedirse. «Ya se le pasará», dice la monja. «A todos se nos pasa.»', 'Sister Brine sets the pearl into a wand in front of you, unhurried. Nerea leaves without saying goodbye. "She will get over it," says the nun. "We all do."'], premio: { unico: 'susurro_de_la_perla' } },
      ] },
    premio: {},
    comentarios: [
      { npc: 'tarn', eleccion: 0, texto: ['Nerea tiró la perla al mar y el mar le devolvió el arpón de su padre. El mar a veces es justo. Casi nunca, pero a veces.', 'Nerea threw the pearl into the sea and the sea gave back her father\'s harpoon. The sea is sometimes fair. Almost never, but sometimes.'] },
      { npc: 'tarn', eleccion: 1, texto: ['Nerea ya no me habla. A ti tampoco te va a hablar. La monja tiene la perla y anoche la oí reírse sola.', 'Nerea does not speak to me anymore. She will not speak to you either. The nun has the pearl, and last night I heard her laughing alone.'] },
    ] }),
  // ============================================================== ACTO 7
  M({ id: 'm7s_peregrino', acto: 7, lateral: true, da: 'mira', nombre: ['El último peregrino', 'The Last Pilgrim'],
    pedido: ['Hay un peregrino que subió antes que tú y se perdió en el Jardín de los que Intentaron. Está vivo: lo veo cada noche, una lucecita entre las estatuas. Quiere llegar al borde del Jardín, donde se ve el Trono. Dice que si lo ve una vez, puede morir tranquilo. Llévalo. Y no dejes que se convierta en estatua.', 'There is a pilgrim who climbed before you and got lost in the Garden of Those Who Tried. He is alive: I see him every night, a little light among the statues. He wants to reach the edge of the Garden, where the Throne can be seen. He says if he sees it once, he can die in peace. Take him. And do not let him turn into a statue.'],
    hecho: ['Mira cuenta una estrella menos esta noche, y sonríe. «Llegó. Lo vio. Y se fue tranquilo.» Te da una jabalina: el peregrino la clavó en el borde del Jardín para que el siguiente sepa que se puede llegar. Mira fue a buscarla para ti.', 'Mira counts one star fewer tonight, and smiles. "He made it. He saw it. And he left in peace." She gives you a javelin: the pilgrim drove it into the edge of the Garden so the next one would know it can be reached. Mira went to fetch it for you.'],
    objetivo: { tipo: 'escoltar', zona: 'a7_jardin', sprite: 'penitente', nombre: ['El último peregrino', 'The last pilgrim'],
      inicio: ['«¿Eres de verdad? Las estatuas también me hablan, a veces. Si eres de verdad, camina delante. Yo te sigo.»', '"Are you real? The statues talk to me too, sometimes. If you are real, walk ahead. I will follow."'],
      llegada: ['«Ahí está. Es más chico de lo que soñé. Y está vacío. Siempre estuvo vacío.» El peregrino se sienta, cierra los ojos y no los vuelve a abrir.', '"There it is. It is smaller than I dreamed. And it is empty. It was always empty." The pilgrim sits down, closes his eyes, and does not open them again.'],
      muerte: ['El peregrino cae entre las estatuas. Cuando lo vuelves a mirar, ya es de piedra, con los brazos estirados hacia el Trono.', 'The pilgrim falls among the statues. When you look again, he is already stone, his arms reaching towards the Throne.'] },
    premio: { unico: 'jabalina_del_peregrino' },
    comentarios: [{ npc: 'auren', texto: ['Mira dice que el peregrino vio el Trono vacío. Si está vacío, ¿quién nos llama desde arriba? No me contestes. No quiero saberlo.', 'Mira says the pilgrim saw the Throne empty. If it is empty, who calls us from above? Do not answer. I do not want to know.'] }] }),
  M({ id: 'm7s_halos', acto: 7, lateral: true, da: 'eskel', nombre: ['Los tres halos', 'The Three Halos'],
    pedido: ['Me escondí cuando los ángeles bajaron por los míos. Desde mi escondite vi dónde guardan los halos de los que mataron: en el Cielo Roto, sobre los altares secos. Si llevas tres halos a tres altares y los enciendes, los ángeles los van a oír llorar. Y eso los va a debilitar. O los va a enfurecer. Yo ya no sé distinguir.', 'I hid when the angels came down for my people. From my hiding place I saw where they keep the halos of those they killed: in the Broken Sky, on the dry altars. If you carry three halos to three altars and light them, the angels will hear them weep. And that will weaken them. Or enrage them. I can no longer tell the difference.'],
    hecho: ['Eskel no te mira cuando le cuentas. «Ya no me voy a esconder», dice. Te da una katana forjada con algo que brilla. «Era de mi hermano. Le puse lo que quedó de los halos. Él hubiera querido que se usara, no que se llorara.»', 'Eskel does not look at you while you tell him. "I will not hide anymore," he says. He gives you a katana forged from something that glows. "It was my brother\'s. I set what remained of the halos in it. He would have wanted it used, not mourned."'],
    objetivo: { tipo: 'ritual', zona: 'a7_cielo', n: 3, reliquia: ['mis_reliquia', 'oro'], altar: ['cel_altar_sed', 'vacio', 'con_ofrendas'], guardian: 'guardian_halo' },
    premio: { unico: 'katana_del_halo_roto' },
    comentarios: [{ npc: 'hollin', texto: ['Eskel salió de su tienda hoy. Primera vez. Se quedó mirando el cielo un buen rato y después me pidió que le enseñara a afilar.', 'Eskel came out of his tent today. First time. He stood looking at the sky for a long while and then asked me to teach him to sharpen a blade.'] }] }),
];
MISIONES.push(...NUEVAS);

// lo que dice la gente después (solo en el acto de la misión, para no tapar lo que viene)
for (const m of NUEVAS) for (const c of m.comentarios ?? []) {
  const dl = (DIALOGOS[c.npc] ??= {}); (dl.lineas ??= []).push(c.eleccion === undefined ? { acto: m.acto, hecha: [m.id], texto: c.texto } : { acto: m.acto, eleccion: [m.id, c.eleccion], texto: c.texto });
}
// mientras la misión está activa, quien la dio recuerda qué hay que hacer
for (const m of NUEVAS) { const dl = (DIALOGOS[m.da!] ??= {}); (dl.lineas ??= []).push({ acto: m.acto, activa: m.id, texto: m.pedido }); }
// Ciro, mientras no lo desenmascaras
(DIALOGOS.ciro ??= {}).lineas = [
  { acto: 1, hecha: ['m1s_ahorcados'], texto: ['Ciro te mira las manos. «Encontraste mis notas. Qué lástima. Eran para Dios, no para ti.»', 'Ciro looks at your hands. "You found my notes. What a pity. They were for God, not for you."'] },
];
import './historia_final';
