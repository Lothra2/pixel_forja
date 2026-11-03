// Las decisiones de la cadena principal y los cuatro finales.
// Tres decisiones se combinan: Vigdis en el acto 4 (salvarla o dejar que se entregue al trono), la Brasa en el acto 5
// (destruirla o absorberla) y la Corona de Aun-Saar en el acto 7 (Auren, Mira o quedártela). La Corona elige el final,
// la Brasa decide qué pasa si te la quedas, y Vigdis cambia un párrafo de cada epílogo.
import type { FinalElegido } from './actos';

export type Final = 'vigilia' | 'cielo' | 'rey_ceniza' | 'corona_fria';
export interface Decisiones { vigdis?: 'salvar' | 'sacrificar'; brasa?: FinalElegido; corona?: 'auren' | 'mira' | 'quedarse' }

/** El final que corresponde a lo decidido. Sin Corona elegida (partidas viejas) sale por la Brasa. */
export function finalPor(dec: Decisiones): Final {
  if (dec.corona === 'auren') return 'vigilia';
  if (dec.corona === 'mira') return 'cielo';
  if (dec.corona === 'quedarse') return dec.brasa === 'absorber' ? 'rey_ceniza' : 'corona_fria';
  return dec.brasa === 'absorber' ? 'rey_ceniza' : 'vigilia';
}

export interface Epilogo {
  titulo: [string, string];
  lineas: [string, string][];
  /** El párrafo de Vigdis (va antes de la última línea). */
  vigdis: { salvar: [string, string]; sacrificar: [string, string] };
  /** La legendaria que deja este final. */
  unico: string;
  /** Tono de la escena: escenarios del fondo y si arde. */
  escenas: [string, string, string]; arde: boolean;
}

export const EPILOGOS: Record<Final, Epilogo> = {
  vigilia: {
    titulo: ['La Vigilia', 'The Vigil'], unico: 'llave_de_la_vigilia', escenas: ['catedral', 'campamento', 'arcano'], arde: false,
    lineas: [
      ['Pones la Corona en las manos de Auren. Pesa como un niño dormido. Él no la mira. La envuelve en su manto y baja la escalera sin decir nada.', 'You place the Crown in Auren\'s hands. It weighs like a sleeping child. He does not look at it. He wraps it in his cloak and descends the stair without a word.'],
      ['En Santa Oria cavan una cripta nueva, más honda que el pozo. Doce monjes cantan sobre ella, de día y de noche, por turnos. El canto ya no llama a nada. Lo mantiene abajo.', 'At Santa Oria they dig a new crypt, deeper than the well. Twelve monks sing over it, day and night, in turns. The song no longer calls anything. It holds it down.'],
      ['La sed no murió. Duerme bajo una abadía que aprendió a vigilar. Cada generación elige quién canta, y cada generación alguien quiere dejar de cantar.', 'The thirst did not die. It sleeps beneath an abbey that learned to keep watch. Each generation chooses who sings, and each generation someone wants to stop.'],
      ['Tú vuelves al Refugio. Odrán te guarda un sitio junto al fuego, el mismo de la primera noche, y por primera vez el fuego no te mira.', 'You return to the Refuge. Odran keeps you a place by the fire, the same as on the first night, and for the first time the fire does not look back at you.'],
    ],
    vigdis: {
      salvar: ['Vigdis llega al Refugio con el primer deshielo. Trae nieve en el pelo y una canción del norte para los monjes. Dice que Eirik se la cantaba. Ahora la canta ella, y la cripta se queda quieta.', 'Vigdis reaches the Refuge with the first thaw. She brings snow in her hair and a northern song for the monks. She says Eirik used to sing it to her. Now she sings it, and the crypt stays still.'],
      sacrificar: ['En el Fortín de Vel nadie toca la tumba de Vigdis. Cuando la nieve la cubre, aparece limpia a la mañana siguiente. Dicen que es ella, que sigue tibia, y que eso también es una vigilia.', 'At the Fort of Vel no one touches Vigdis\'s grave. When the snow covers it, it is clean again by morning. They say it is her, that she is still warm, and that this too is a vigil.'],
    },
  },
  cielo: {
    titulo: ['El Cielo Abierto', 'The Open Sky'], unico: 'esquirla_del_cielo', escenas: ['arcano', 'cementerio', 'campamento'], arde: false,
    lineas: [
      ['Le das la Corona a Mira. Ella la levanta hacia las tres estrellas que liberó y la suelta. No cae. Sube.', 'You give the Crown to Mira. She raises it toward the three stars she freed and lets go. It does not fall. It rises.'],
      ['Arriba, la Corona se rompe como un vidrio, y con ella se rompen los dioses que bebían del cielo. Cae una lluvia de oro tibio sobre Velmora durante siete días.', 'Above, the Crown shatters like glass, and with it shatter the gods who drank from the sky. A rain of warm gold falls on Velmora for seven days.'],
      ['Sin dioses no hay sed. Tampoco hay milagros. Las campanas son solo campanas, las brasas son solo fuego, y los muertos se quedan muertos.', 'Without gods there is no thirst. There are no miracles either. Bells are only bells, embers only fire, and the dead stay dead.'],
      ['Mira cuenta estrellas otra vez. Dice que hay más que antes. Que los dioses tapaban la mitad del cielo, y nadie se había dado cuenta.', 'Mira counts stars again. She says there are more than before. That the gods covered half the sky, and no one had noticed.'],
    ],
    vigdis: {
      salvar: ['En el norte, Vigdis sube al Paso del Glaciar con una lámpara. Le dijeron que sin dioses no hay más allá. Igual deja la lámpara encendida para Eirik, por si acaso. Hay cosas que no se rompen con una corona.', 'In the north, Vigdis climbs to the Glacier Pass with a lamp. They told her that without gods there is no beyond. She leaves the lamp lit for Eirik all the same, just in case. Some things do not break with a crown.'],
      sacrificar: ['En el Fortín, la tumba de Vigdis se derrite la primera noche sin dioses. Debajo no hay nadie. Hakon dice que el trono la soltó, que el frío ya no tiene a quién obedecer. Nadie sabe adónde fue.', 'At the Fort, Vigdis\'s grave melts on the first night without gods. There is no one beneath it. Hakon says the throne let her go, that the cold has no one left to obey. No one knows where she went.'],
    },
  },
  rey_ceniza: {
    titulo: ['El Rey de Ceniza', 'The King of Ash'], unico: 'corona_del_rey_de_ceniza', escenas: ['fortaleza', 'catedral', 'infierno'], arde: true,
    lineas: [
      ['No le das la Corona a nadie. Te la pones. La Brasa que llevas adentro la reconoce como una boca reconoce el agua.', 'You give the Crown to no one. You put it on. The Ember inside you knows it the way a mouth knows water.'],
      ['Te sientas en el Trono Sediento. La sed ya no tiene otro nombre que el tuyo. Tienes sed de todo, y todo viene a ti.', 'You sit upon the Thirsting Throne. The thirst has no name but yours now. You thirst for everything, and everything comes to you.'],
      ['Velmora no vuelve a arder. Arde por dentro. De noche nadie se acerca al fuego, y cuando el viento sopla desde el norte, las campanas contestan solas.', 'Velmora never burns again. It burns inside. At night no one goes near the fire, and when the wind blows from the north, the bells answer on their own.'],
      ['Muy lejos, en otro cielo, una segunda brasa cambia de rumbo. Ahora sabe adónde ir. Ahora tiene a quién servir.', 'Far away, in another sky, a second ember changes course. Now it knows where to go. Now it has someone to serve.'],
    ],
    vigdis: {
      salvar: ['Vigdis es la única que sube a verte. Trae un caldo caliente, como hacía con Eirik, y lo deja en el primer escalón. No sube más. Dice que no tiene miedo. Dice que no quiere que la beban.', 'Vigdis is the only one who climbs to see you. She brings hot broth, as she did for Eirik, and leaves it on the first step. She climbs no further. She says she is not afraid. She says she does not want to be drunk.'],
      sacrificar: ['Desde el trono sientes cada calor de Velmora. Uno es distinto: tibio, quieto, bajo la nieve del Fortín. Es Vigdis. Fue la primera que entregaste. Tienes sed de ella todavía.', 'From the throne you feel every warmth in Velmora. One is different: warm, still, beneath the snow of the Fort. It is Vigdis. She was the first you gave away. You thirst for her still.'],
    },
  },
  corona_fria: {
    titulo: ['La Corona Fría', 'The Cold Crown'], unico: 'cetro_de_la_corona_fria', escenas: ['fortaleza', 'campamento', 'cementerio'], arde: false,
    lineas: [
      ['No le das la Corona a nadie. Te la pones. No pasa nada. Tu Marca está gris desde que apagaste la Brasa, y la Corona no encuentra nada que beber.', 'You give the Crown to no one. You put it on. Nothing happens. Your Mark has been grey since you put out the Ember, and the Crown finds nothing to drink.'],
      ['Bajas a Velmora con ella puesta. Te reciben como a un rey, porque nadie más quiso serlo. Gobiernas bien. Eres justo. No sientes nada.', 'You descend to Velmora wearing it. They greet you as a king, because no one else wanted to be one. You rule well. You are just. You feel nothing.'],
      ['Los inviernos se hacen largos. El fuego ya no te calienta las manos. Ysolde te tira las cartas una vez por año y siempre sale la misma: un rey con escarcha en la cara.', 'The winters grow long. Fire no longer warms your hands. Ysolde reads the cards for you once a year and the same one always comes up: a king with frost on his face.'],
      ['La sed se acabó, de verdad. Contigo. Nadie más la va a cargar, y tú la vas a cargar hasta el final, fría, sin hambre, sin descanso.', 'The thirst is over, truly. With you. No one else will carry it, and you will carry it to the end, cold, without hunger, without rest.'],
    ],
    vigdis: {
      salvar: ['Vigdis es tu curandera en la corte. Te pone las manos en el pecho cada luna llena, buscando algo tibio. Nunca lo encuentra. Igual vuelve la luna siguiente.', 'Vigdis is your healer at court. She lays her hands on your chest every full moon, searching for something warm. She never finds it. She comes back the next moon all the same.'],
      sacrificar: ['Una vez por año subes al Fortín y te sientas junto a la tumba de Vigdis. Es el único lugar de Velmora donde casi sientes algo. Casi.', 'Once a year you climb to the Fort and sit beside Vigdis\'s grave. It is the only place in Velmora where you almost feel something. Almost.'],
    },
  },
};

/** Cómo se cuenta cada decisión en el diario. */
export const TEXTO_DECISION: Record<string, Record<string, [string, string]>> = {
  vigdis: {
    salvar: ['Detuviste a Vigdis. Hjaldur te esperó entero, y ella sigue viva.', 'You stopped Vigdis. Hjaldur awaited you whole, and she still lives.'],
    sacrificar: ['Dejaste que Vigdis se entregara al trono. El rey se debilitó, y en el Fortín quedó su tumba.', 'You let Vigdis give herself to the throne. The king weakened, and her grave remains at the Fort.'],
  },
  brasa: {
    destruir: ['Apagaste la Brasa. Tu Marca quedó gris y fría.', 'You put out the Ember. Your Mark turned grey and cold.'],
    absorber: ['Bebiste la Brasa. La sed es tuya.', 'You drank the Ember. The thirst is yours.'],
  },
  corona: {
    auren: ['Le diste la Corona a Auren, para que la Iglesia la vigile.', 'You gave the Crown to Auren, for the Church to watch over.'],
    mira: ['Le diste la Corona a Mira, y el cielo se abrió.', 'You gave the Crown to Mira, and the sky opened.'],
    quedarse: ['Te quedaste con la Corona.', 'You kept the Crown.'],
  },
};
export const NOMBRE_DECISION: Record<string, [string, string]> = { vigdis: ['Acto 4: la sangre tibia', 'Act 4: the warm blood'], brasa: ['Acto 5: la Brasa', 'Act 5: the Ember'], corona: ['Acto 7: la Corona', 'Act 7: the Crown'] };
