import { createRaster, type Raster } from '../core/raster';
import {
  lamina, mascara, rellenar, trazo, disco, desenfocada, pintar, brillo, halo, aRaster, grilla, desdeRaster, sat, suave, fbm,
  type Lamina, type C3, type P2,
} from './cine';
import { llamas } from './siluetas';
import { CW, CH, MX, MY, Toma } from './cine_toma';
import { cuadrosHojaFuego } from './cine_fuego';
import { PINTORES_A } from './cine_planos_a';
import { PINTORES_B } from './cine_planos_b';
import { PINTORES_C } from './cine_planos_c';
import { pintoresCine3d, paqueteCine3d } from './cine3d_paquete';
import { alfaTiempo, type AnimTiempo } from './cine3d_toma';
import { decodePng } from '../export/png';

/**
 * Las cinemáticas de cierre de cada acto de Réquiem de Ceniza: tres o cuatro planos por acto (la muerte del jefe,
 * la consecuencia y el gancho al acto siguiente) y, en el acto 7, el comienzo común (cae Aun-Saar, queda la Corona)
 * y los cuatro finales. Cada plano es una pila de capas de paralaje de 1408 x 792 (la pantalla base de 1280 x 720
 * va en 64, 36) más efectos animados de hojas compartidas (fuego, goteo de sangre, humo, cuervos y partículas), con
 * su duración, su movimiento de cámara, su transición y la narración en español e inglés. El manifiesto dice cómo
 * tocarlo todo (ver `manifiestoPlano` y LEEME_CINE).
 *
 * Elecciones: el plano 2 del acto 4 cambia una capa según Vigdis (vigdis_viva / vigdis_muerta) y el plano 2 del acto
 * 5 según la Brasa (destruir / absorber); la narración de esos planos (y la del gancho del acto 6) cambia con ellas.
 */

export type Texto = [string, string];
export type Curva = 'lineal' | 'suave';
/** Cámara del reproductor del juego: (x, y) en px de la capa de paralaje 1, zoom alrededor del centro de la pantalla. */
export interface Camara { desde: { x: number; y: number; zoom: number }; hasta: { x: number; y: number; zoom: number }; curva: Curva; sacudida?: { t: number; dur: number; fuerza: number } }
export interface Transicion { tipo: 'corte' | 'negro' | 'fundido' | 'blanco' | 'rojo'; s: number }
export type Particulas = 'ceniza' | 'brasas' | 'nieve' | 'lluvia' | 'polvo';
/** Un sonido del juego que se toca en el segundo t del plano (campana, trueno, explosion, rugido_jefe). */
export interface Sonido { t: number; efecto: string; vol?: number }
export interface Plano { id: string; que: string; dur: number; cam: Camara; texto: Texto; textoSegun?: Record<string, Texto>; eleccion?: 'vigdis' | 'brasa'; entrada: Transicion; salida: Transicion; /** sonidos a tiempo (el reproductor los toca al pasar por t) */ sonidos?: Sonido[] }

// ------------------------------------------------------------------ cámaras
/** Margen que puede usar la cámara (el de la capa menos lo que se lleva la sacudida). */
const LIM_X = 56, LIM_Y = 30;
const lim = (v: number, m: number) => Math.round(Math.max(-m, Math.min(m, v))) || 0;
/**
 * Acercarse a `foco` (pantalla base): el zoom es alrededor del centro, así que la cámara se corre para que el foco
 * no se escape: x = (foco - centro) * (1 - 1 / zoom).
 */
const acercar = (foco: [number, number], z1 = 1.08, desde: [number, number] = [0, 0], hasta: [number, number] = [0, 0], z0 = 1): Camara => ({
  desde: { x: lim(desde[0] + (foco[0] - 640) * (1 - 1 / z0), LIM_X), y: lim(desde[1] + (foco[1] - 360) * (1 - 1 / z0), LIM_Y), zoom: z0 },
  hasta: { x: lim(hasta[0] + (foco[0] - 640) * (1 - 1 / z1), LIM_X), y: lim(hasta[1] + (foco[1] - 360) * (1 - 1 / z1), LIM_Y), zoom: z1 }, curva: 'suave',
});
const paneo = (dx0: number, dx1: number, dy0 = 0, dy1 = 0, z = 1.02): Camara => ({ desde: { x: lim(dx0, LIM_X), y: lim(dy0, LIM_Y), zoom: z }, hasta: { x: lim(dx1, LIM_X), y: lim(dy1, LIM_Y), zoom: z }, curva: 'suave' });
/** Sacudida (el juego toca un trueno): fuerza en px, desde el segundo t durante dur. */
const temblar = (c: Camara, fuerza: number, hasta_s: number, desde_s = 0, _hz = 11): Camara => ({ ...c, sacudida: { t: desde_s, dur: +(hasta_s - desde_s).toFixed(2), fuerza } });
const T = (tipo: Transicion['tipo'], s: number): Transicion => ({ tipo, s });

// ------------------------------------------------------------------ el guion
/** Los planos de cada cinemática (clave del manifiesto: acto_1 ... acto_6, acto_7 y acto_7_<final>). */
export const GUION: Record<string, Plano[]> = {
  acto_1: [
    { id: 'p1_abadesa', que: 'En el Pozo de la Brasa, la Abadesa Ilvara cae sobre la boca del pozo; la brasa le revienta el pecho.', dur: 6.5,
      cam: temblar(acercar([620, 300], 1.1, [0, 8], [0, -6]), 8, 1.4), entrada: T('blanco', 0.25), salida: T('fundido', 1),
      sonidos: [{ t: 0.05, efecto: 'explosion', vol: 0.9 }, { t: 0.3, efecto: 'rugido_jefe', vol: 1 }],
      texto: ['La Abadesa cayó con el pecho abierto, cantando todavía. La brasa no cayó con ella.', 'The Abbess fell with her chest torn open, still singing. The ember did not fall with her.'] },
    { id: 'p2_campanas', que: 'Afuera, la brasa sube por el pozo y sale por el campanario de Santa Oria rumbo al sur; las campanas doblan.', dur: 7,
      cam: paneo(40, -40, 10, -12, 1.03), entrada: T('fundido', 1), salida: T('fundido', 1),
      sonidos: [{ t: 0.8, efecto: 'campana', vol: 0.85 }, { t: 3.1, efecto: 'campana', vol: 0.75 }, { t: 5.4, efecto: 'campana', vol: 0.6 }],
      texto: ['Subió por el pozo como una chispa que se niega a morir, y en Santa Oria las campanas doblaron una última vez.', 'It rose up the well like a spark that refuses to die, and in Santa Oria the bells tolled one last time.'] },
    { id: 'p3_camino', que: 'El héroe en el cruce del páramo, junto a la horca; al sur cae una estrella roja. La Marca le late en el brazo.', dur: 7.5,
      cam: acercar([560, 360], 1.07, [-20, 0], [10, -4]), entrada: T('fundido', 1), salida: T('negro', 1.6),
      sonidos: [{ t: 2.1, efecto: 'trueno', vol: 0.45 }],
      texto: ['Tomó el camino del sur, hacia Sahrim, donde los reyes no mueren: solo duermen. En tu brazo, la Marca se calentó un poco más.', 'It took the southern road, toward Sahrim, where kings do not die: they only sleep. On your arm, the Mark grew a little warmer.'] },
  ],
  acto_2: [
    { id: 'p1_rey', que: 'En la Cámara del Rey, Khamer-Ul se deshace en arena bajo el haz de luz; la máscara de oro cae.', dur: 6.5,
      cam: temblar(acercar([640, 330], 1.09), 6, 1.2), entrada: T('blanco', 0.25), salida: T('fundido', 1),
      sonidos: [{ t: 0.15, efecto: 'rugido_jefe', vol: 0.8 }],
      texto: ['Khamer-Ul volvió al polvo de donde lo habían sacado. Ni siquiera su sombra vino a despedirlo.', 'Khamer-Ul returned to the dust he was raised from. Not even his shadow came to say farewell.'] },
    { id: 'p2_coloso', que: 'En el desierto rojo, el coloso enterrado se raja; la brasa huye hacia el este sobre el camino de los empalados.', dur: 7,
      cam: paneo(-40, 40, 0, -8, 1.03), entrada: T('fundido', 1), salida: T('fundido', 1),
      sonidos: [{ t: 0.5, efecto: 'explosion', vol: 0.6 }, { t: 0.9, efecto: 'trueno', vol: 0.5 }],
      texto: ['El segundo sello se quebró como un hueso seco. La brasa siguió el río hacia el este, donde la selva respira y el agua sangra.', 'The second seal cracked like a dry bone. The ember followed the river east, where the jungle breathes and the water bleeds.'] },
    { id: 'p3_rio', que: 'De noche, el barco de Oyá baja el río; detrás, una figura pálida camina sobre el agua, cantando.', dur: 7.5,
      cam: acercar([980, 380], 1.08, [-30, 0], [20, 0]), entrada: T('fundido', 1), salida: T('negro', 1.6),
      texto: ['Nadie habló durante el viaje. Detrás del barco, algo pálido caminaba sobre el agua, cantando.', 'No one spoke during the voyage. Behind the ship, something pale walked upon the water, singing.'] },
  ],
  acto_3: [
    { id: 'p1_madre', que: 'En el Vientre del templo, la Madre Ciénaga se abre y se hunde en su barro; los huevos revientan.', dur: 6.5,
      cam: temblar(acercar([640, 360], 1.08, [0, -6], [0, 6]), 7, 1.6), entrada: T('blanco', 0.25), salida: T('fundido', 1),
      sonidos: [{ t: 0.1, efecto: 'rugido_jefe', vol: 1 }, { t: 1.3, efecto: 'explosion', vol: 0.5 }],
      texto: ['La Madre se abrió como un fruto podrido. De su vientre ya no salió nada vivo.', 'The Mother split open like rotten fruit. Nothing living came out of her womb again.'] },
    { id: 'p2_rio', que: 'Al alba, la pirámide en la niebla; el río ya no es rojo pero arrastra a los muertos. El barco espera.', dur: 7,
      cam: paneo(30, -30, 6, -6, 1.03), entrada: T('fundido', 1), salida: T('fundido', 1),
      texto: ['El río dejó de sangrar, aunque todavía sabe a hierro. Oyá desató las amarras sin mirar atrás.', 'The river stopped bleeding, though it still tastes of iron. Oya cast off without looking back.'] },
    { id: 'p3_norte', que: 'Al norte, en la ventisca, el rey de escarcha camina y los muertos de la montaña lo siguen.', dur: 7.5,
      cam: acercar([860, 330], 1.1), entrada: T('fundido', 1.2), salida: T('negro', 1.6),
      sonidos: [{ t: 0.6, efecto: 'trueno', vol: 0.4 }],
      texto: ['En Hrimgard, un rey que juró no levantarse caminaba otra vez sobre la nieve. Detrás de él, en fila, sus muertos.', 'In Hrimgard, a king who swore never to rise was walking on the snow again. Behind him, in a long line, came his dead.'] },
  ],
  acto_4: [
    { id: 'p1_hjaldur', que: 'En el Trono de Hjaldur, el rey cae de rodillas y su hacha se parte; detrás, muertos atrapados en columnas de hielo.', dur: 6.5,
      cam: temblar(acercar([640, 330], 1.09), 8, 1.5), entrada: T('blanco', 0.25), salida: T('fundido', 1),
      texto: ['Hjaldur cayó sin un grito. El hielo se quedó con su último aliento, como se queda con todo.', 'Hjaldur fell without a cry. The ice kept his last breath, as it keeps everything.'] },
    { id: 'p2_fortin', que: 'El Fortín de Vel al amanecer. Según la elección: Vigdis con su farol en la puerta, o su tumba en la nieve.', dur: 7, eleccion: 'vigdis',
      cam: acercar([560, 420], 1.07, [20, 0], [-10, -4]), entrada: T('fundido', 1), salida: T('fundido', 1),
      texto: ['Cuatro sellos rotos. En el fortín, alguien dejó una luz encendida.', 'Four seals broken. In the fort, someone left a light burning.'],
      textoSegun: {
        vigdis_viva: ['Vigdis te esperó en la puerta con el farol encendido. «El frío conserva», dijo. «A mí también.»', 'Vigdis waited at the gate with her lantern lit. "Cold preserves," she said. "Me as well."'],
        vigdis_muerta: ['A Vigdis la enterraron junto a la muralla, con su farol encima. Nadie lo apaga. Nadie se atreve.', 'They buried Vigdis beside the wall, with her lantern on the grave. No one puts it out. No one dares.'],
      } },
    { id: 'p3_herida', que: 'Al sur, más allá de los picos, el cielo se abre como una boca de fuego; cuatro brasas vuelan hacia ella.', dur: 7.5,
      cam: acercar([700, 300], 1.1, [0, 10], [0, -10]), entrada: T('fundido', 1), salida: T('negro', 1.6),
      texto: ['Cuatro brasas sueltas buscaban volver a juntarse. Sobre la Herida, el cielo se abrió como una boca que no termina de gritar.', 'Four loose embers sought to come together again. Above the Wound, the sky opened like a mouth that never finishes screaming.'] },
  ],
  acto_5: [
    { id: 'p1_ozmaren', que: 'En el Corazón de la Brasa, Ozmaren revienta en fuego: el pecho se abre y las alas arden.', dur: 6.5,
      cam: temblar(acercar([640, 320], 1.1), 12, 2.2), entrada: T('blanco', 0.3), salida: T('rojo', 0.8),
      texto: ['Ozmaren cayó. La sed que bajó a beber se quedó sin boca.', 'Ozmaren fell. The thirst that came down to drink was left without a mouth.'] },
    { id: 'p2_eleccion', que: 'Sobre la ceniza de Ozmaren, el héroe con la Brasa en el puño. Según la elección: se apaga y la Marca queda gris, o entra en él y lo enciende.', dur: 7.5, eleccion: 'brasa',
      cam: acercar([640, 380], 1.09), entrada: T('rojo', 0.8), salida: T('fundido', 1.2),
      texto: ['De la ceniza rodó una brasa hasta tus pies, y tu Marca respondió.', 'From the ash an ember rolled to your feet, and your Mark answered.'],
      textoSegun: {
        brasa_destruir: ['Cerraste la mano hasta que la Brasa dejó de latir. Tu Marca quedó gris, como un nombre olvidado.', 'You closed your hand until the Ember stopped beating. Your Mark turned grey, like a forgotten name.'],
        brasa_absorber: ['La Marca bebió la Brasa como agua en el desierto. Desde entonces tu sombra es tibia.', 'The Mark drank the Ember like water in the desert. Since then your shadow has been warm.'],
      } },
    { id: 'p3_mar', que: 'Muy al norte, de noche, el mar se parte en dos bajo un rayo; las agujas de una ciudad empiezan a salir del agua.', dur: 7,
      cam: temblar(acercar([640, 380], 1.08, [0, 6], [0, -8]), 5, 7, 0, 6), entrada: T('fundido', 1.2), salida: T('fundido', 1),
      texto: ['Esa noche, muy al norte, el mar se partió en dos.', 'That night, far to the north, the sea split in two.'] },
    { id: 'p4_ysmeral', que: 'Ysmeral, la Ciudad Ahogada, ya afuera del agua con sus campanas; el barco de Oyá varado en la costa.', dur: 7.5,
      cam: paneo(-40, 30, 0, -6, 1.04), entrada: T('fundido', 1), salida: T('negro', 1.6),
      texto: ['Del fondo subió Ysmeral con sus campanas todavía sonando. Desde la proa varada, parecían llamar a alguien.', 'From the depths rose Ysmeral, its bells still ringing. From the stranded prow, they seemed to be calling someone.'] },
  ],
  acto_6: [
    { id: 'p1_campana', que: 'En el Campanario Hundido, la Campana que Ahoga se raja; el agua estalla y la sacerdotisa se suelta de las cadenas.', dur: 6.5,
      cam: temblar(acercar([640, 340], 1.09), 9, 1.8), entrada: T('blanco', 0.25), salida: T('fundido', 1),
      texto: ['La Campana se rajó de arriba abajo, y la sacerdotisa que vivía adentro pudo, por fin, callar.', 'The Bell cracked from crown to lip, and the priestess who lived inside could, at last, fall silent.'] },
    { id: 'p2_marea', que: 'La marea vuelve de golpe sobre las calles de Ysmeral; los ahogados quedan en la playa. El barco flota.', dur: 7,
      cam: paneo(40, -30, -6, 6, 1.03), entrada: T('fundido', 1), salida: T('fundido', 1),
      texto: ['El mar volvió a su lugar como un perro que reconoce a su amo. Dejó en la arena todo lo que no quiso.', 'The sea returned to its place like a dog that knows its master. It left on the sand everything it did not want.'] },
    { id: 'p3_vidrio', que: 'Al norte, el cielo se rompe como un vidrio; detrás, una escalera de oro sube hacia la nada.', dur: 7,
      cam: acercar([640, 260], 1.1, [0, 12], [0, -10]), entrada: T('fundido', 1), salida: T('fundido', 1),
      texto: ['Entonces el cielo se rompió como un vidrio, y detrás del vidrio había escalones de oro.', 'Then the sky broke like glass, and behind the glass there were steps of gold.'] },
    { id: 'p4_aunsaar', que: 'Arriba, en el Trono Sediento, Aun-Saar abre la boca que tiene en el pecho.', dur: 7.5,
      cam: acercar([640, 330], 1.12), entrada: T('fundido', 1), salida: T('negro', 1.8),
      texto: ['Arriba, en un trono que tiene sed desde antes del mundo, Aun-Saar abrió la boca que tiene en el pecho y dijo tu nombre.', 'Above, on a throne that has thirsted since before the world, Aun-Saar opened the mouth in his chest and spoke your name.'],
      textoSegun: {
        brasa_destruir: ['Arriba, Aun-Saar abrió la boca que tiene en el pecho y preguntó por el pedazo que le faltaba. Preguntó por ti.', 'Above, Aun-Saar opened the mouth in his chest and asked for the piece he was missing. He asked for you.'],
        brasa_absorber: ['Arriba, Aun-Saar abrió la boca que tiene en el pecho y sonrió. Ya sabía que su sed venía en camino.', 'Above, Aun-Saar opened the mouth in his chest and smiled. He knew his thirst was on its way.'],
      }, eleccion: 'brasa' },
  ],
  acto_7: [
    { id: 'p1_cae', que: 'Aun-Saar se parte sobre la escalera de oro: la boca del pecho se apaga, las manos doradas caen.', dur: 7,
      cam: temblar(acercar([640, 300], 1.1, [0, -10], [0, 8]), 12, 2.4), entrada: T('blanco', 0.35), salida: T('blanco', 0.6),
      texto: ['Aun-Saar cayó del Trono Sediento, y por un instante todo el cielo contuvo la respiración.', 'Aun-Saar fell from the Thirsting Throne, and for an instant the whole sky held its breath.'] },
    { id: 'p2_corona', que: 'El trono vacío; en los escalones, entre la sangre dorada, la Corona sigue ardiendo bajito.', dur: 7.5,
      cam: acercar([640, 430], 1.12), entrada: T('blanco', 0.6), salida: T('negro', 1.2),
      texto: ['Del dios no quedó más que la Corona, tibia todavía, esperando una cabeza.', 'Nothing remained of the god but the Crown, still warm, waiting for a head.'] },
  ],
  acto_7_vigilia: [
    { id: 'v1_auren', que: 'Auren, de rodillas en la escalera, recibe la Corona y la envuelve en su manto sin mirarla.', dur: 7,
      cam: acercar([640, 360], 1.08), entrada: T('negro', 1.2), salida: T('fundido', 1),
      texto: ['Le diste la Corona a Auren. El último cantor la envolvió en su manto sin mirarla, como se tapa a un muerto.', 'You gave the Crown to Auren. The last singer wrapped it in his cloak without looking at it, the way one covers the dead.'] },
    { id: 'v2_boveda', que: 'Bajo una catedral, la Iglesia encierra la Corona en un relicario de hierro con siete sellos y monjes que cantan.', dur: 7.5,
      cam: acercar([640, 380], 1.1, [0, -6], [0, 4]), entrada: T('fundido', 1), salida: T('fundido', 1.2),
      texto: ['La Iglesia la bajó a una cripta sin nombre, bajo siete sellos y siete voces que no dejan de cantar.', 'The Church carried it down to a nameless crypt, beneath seven seals and seven voices that never stop singing.'] },
    { id: 'v3_vela', que: 'La última vela del relicario; detrás del hierro, algo tibio late despacio.', dur: 7,
      cam: acercar([640, 380], 1.14), entrada: T('fundido', 1.2), salida: T('negro', 2.4),
      texto: ['La sed duerme. No está muerta. Algún día alguien dejará de cantar.', 'The thirst sleeps. It is not dead. Someday, someone will stop singing.'] },
  ],
  acto_7_cielo: [
    { id: 'c1_mira', que: 'Mira alza la Corona contra las estrellas enjauladas y la parte con las dos manos; sale luz blanca.', dur: 7,
      cam: acercar([640, 300], 1.1), entrada: T('negro', 1.2), salida: T('blanco', 0.8),
      texto: ['Le diste la Corona a Mira. La sostuvo contra las estrellas y la partió como se parte el pan.', 'You gave the Crown to Mira. She held it up against the stars and broke it the way one breaks bread.'] },
    { id: 'c2_dioses', que: 'El cielo se abre de par en par; caen las islas de oro y los dioses de piedra, ardiendo.', dur: 7.5,
      cam: temblar(acercar([640, 300], 1.1, [0, -12], [0, 12]), 10, 4, 0, 7), entrada: T('blanco', 0.8), salida: T('fundido', 1.4),
      texto: ['El cielo se abrió de par en par. Detrás no había nadie, y los dioses murieron sin hacer ruido.', 'The sky opened wide. There was no one behind it, and the gods died without a sound.'] },
    { id: 'c3_alba', que: 'Amanece sobre Velmora: la horca vacía, la abadía en silencio y un sol pálido.', dur: 8,
      cam: paneo(-30, 30, 4, -6, 1.03), entrada: T('fundido', 1.4), salida: T('negro', 3),
      texto: ['Esa mañana salió sobre Velmora un sol que no le debía nada a nadie.', 'That morning a sun rose over Velmora that owed nothing to anyone.'] },
  ],
  acto_7_rey_ceniza: [
    { id: 'r1_trono', que: 'El héroe se sienta en el Trono Sediento con la Corona puesta; la Brasa le arde en el pecho y la sangre baja por la escalera.', dur: 7.5,
      cam: acercar([640, 300], 1.12, [0, 10], [0, -6]), entrada: T('negro', 1.2), salida: T('rojo', 1),
      texto: ['Te pusiste la Corona. La sed reconoció tu cuerpo como una casa vieja y entró sin llamar.', 'You put on the Crown. The thirst knew your body like an old house and came in without knocking.'] },
    { id: 'r2_mundo', que: 'Abajo, en Velmora, todos los fuegos se inclinan hacia el norte; la gente se arrodilla en el barro.', dur: 7.5,
      cam: paneo(30, -30, 0, 6, 1.04), entrada: T('rojo', 1), salida: T('negro', 3),
      texto: ['En cada hoguera del mundo, el fuego se inclinó hacia el norte. Hacia ti. Ahora la sed tiene tu nombre.', 'In every fire in the world, the flame leaned north. Toward you. Now the thirst bears your name.'] },
  ],
  acto_7_corona_fria: [
    { id: 'f1_trono', que: 'El héroe en el trono con la Corona, pero en luz gris y azul: la Marca apagada, escarcha en el oro.', dur: 7.5,
      cam: acercar([640, 300], 1.1), entrada: T('negro', 1.2), salida: T('fundido', 1.2),
      texto: ['Te sentaste en el Trono con la Marca gris. La Corona pesaba como una lápida y no daba calor.', 'You sat upon the Throne with your Mark grey. The Crown weighed like a gravestone and gave no warmth.'] },
    { id: 'f2_invierno', que: 'Las islas de oro, frías y nevadas; el héroe solo en el borde, mirando un cielo que ya no arde.', dur: 8,
      cam: acercar([760, 380], 1.08, [-20, 0], [10, -4]), entrada: T('fundido', 1.2), salida: T('negro', 3),
      texto: ['Reinas sobre un cielo frío. Nada te calienta ya: ni el oro, ni el recuerdo del fuego.', 'You reign over a cold sky. Nothing warms you now: not the gold, not the memory of fire.'] },
  ],
  // la intro del juego (11 planos, 83 s, música "intro"), hasta antes del título forjado: escenas 3D horneadas (cine3d_*.ts)
  intro: [
    { id: 'i01_valle', que: 'Velmora antes: el valle en invierno al alba, la abadía de Santa Oria a contraluz sobre su colina nevada, el pueblo abajo con humo y faroles.', dur: 8,
      cam: acercar([820, 250], 1.07, [-24, 8], [6, -4]), entrada: T('negro', 2), salida: T('fundido', 1),
      texto: ['Hubo un tiempo en que el valle de Velmora solo le temía al invierno.', 'There was a time when the valley of Velmora feared only winter.'] },
    { id: 'i02_campanas', que: 'Al alba, en el campanario: monjes de hábito y capucha tiran de las sogas a contraluz y la campana se mece.', dur: 8.5,
      cam: acercar([700, 330], 1.06, [18, 10], [-14, -6]), entrada: T('fundido', 1), salida: T('fundido', 1),
      sonidos: [{ t: 1.71, efecto: 'campana', vol: 0.7 }, { t: 4.0, efecto: 'campana', vol: 0.75 }, { t: 6.29, efecto: 'campana', vol: 0.8 }],
      texto: ['Los monjes de Santa Oria tocaban las campanas al alba, y nadie preguntaba por qué la abadía se alzó sobre un pozo sellado.', 'The monks of Santa Oria rang the bells at dawn, and no one asked why the abbey was raised over a sealed well.'] },
    { id: 'i03_pozo', que: 'Bajo la abadía, la cripta del pozo sellado: losa de hierro con cadenas y el sello de cera.', dur: 7.5,
      cam: acercar([636, 318], 1.1, [0, -10], [0, 6]), entrada: T('fundido', 1), salida: T('negro', 1.2),
      texto: ['Nadie recordaba el voto de los primeros hermanos: no cantar nunca de noche.', 'No one remembered the vow of the first brothers: never sing at night.'] },
    { id: 'i04_cielo', que: 'La noche de la última cosecha: la carreta en el campo, la abadía lejos, y el cielo que se desgarra con luz roja.', dur: 6.5,
      cam: temblar(acercar([640, 250], 1.05, [0, 14], [0, -12]), 5, 3.4, 1.9), entrada: T('negro', 1.2), salida: T('fundido', 0.6),
      sonidos: [{ t: 1.9, efecto: 'trueno', vol: 0.9 }],
      texto: ['La noche de la última cosecha, el cielo se abrió.', 'On the night of the last harvest, the sky opened.'] },
    { id: 'i05_brasa', que: 'La brasa cae despacio desde la herida del cielo, con estela de fuego de Doom, hacia la abadía.', dur: 7,
      cam: acercar([700, 330], 1.06, [12, -6], [-6, 6]), entrada: T('fundido', 0.6), salida: T('blanco', 0.35),
      texto: ['Una brasa cayó, lenta, como si buscara algo.', 'An ember fell, slowly, as if it were searching for something.'] },
    { id: 'i06_impacto', que: 'El impacto: la abadía arde desde adentro, fuego de Doom en el tejado, los vitrales y la puerta; los sobrevivientes miran de espaldas.', dur: 5.5,
      cam: temblar(acercar([770, 300], 1.08, [-14, -8], [10, 4]), 14, 2.4, 0), entrada: T('blanco', 0.6), salida: T('fundido', 0.8),
      sonidos: [{ t: 0, efecto: 'explosion', vol: 1 }, { t: 0.15, efecto: 'trueno', vol: 1 }],
      texto: ['Cayó en el claustro.', 'It fell into the cloister.'] },
    { id: 'i07_claustro', que: 'Desde la galería del claustro, a través de un arco ojival: la brasa caída humea en el jardín nevado con su luz roja; las campanas doblan solas, lejos.', dur: 7,
      cam: temblar(acercar([660, 500], 1.08, [0, 6], [0, -6]), 5, 0.9, 0), entrada: T('fundido', 0.8), salida: T('fundido', 1),
      sonidos: [{ t: 0.67, efecto: 'campana', vol: 0.85 }, { t: 3.33, efecto: 'campana', vol: 0.8 }, { t: 6.0, efecto: 'campana', vol: 0.7 }],
      texto: ['Y las campanas doblaron solas.', 'And the bells tolled on their own.'] },
    { id: 'i08_camposanto', que: 'Al amanecer gris, en el camposanto bajo la ceniza, los muertos se levantan secos y retorcidos.', dur: 8,
      cam: paneo(30, -26, 6, -4, 1.04), entrada: T('fundido', 1.2), salida: T('fundido', 1),
      texto: ['Al amanecer, los monjes ya no estaban. Y el valle empezó a arder sin fuego.', 'By dawn, the monks were gone. And the valley began to burn without fire.'] },
    { id: 'i09_fuego', que: 'Los sobrevivientes en silueta alrededor de una hoguera de fuego de Doom entre las ruinas del pueblo.', dur: 7.5,
      cam: acercar([640, 400], 1.07, [-10, 6], [6, -4]), entrada: T('fundido', 1), salida: T('fundido', 1),
      texto: ['Los que sobrevivieron llevan ceniza en la piel. La llaman la Marca.', 'Those who survived carry ash on their skin. They call it the Mark.'] },
    { id: 'i10_tu', que: 'Las ocho clases en la cresta, a contraluz de la catedral que arde: tú también.', dur: 8,
      cam: acercar([640, 360], 1.08, [0, 10], [0, -6]), entrada: T('fundido', 1), salida: T('negro', 1),
      texto: ['Tú también la tienes.', 'You bear it too.'] },
    { id: 'i11_ojos', que: 'En el fondo del pozo, entre relámpagos, Ozmaren abre los ojos.', dur: 9.5,
      cam: temblar(acercar([640, 330], 1.14), 10, 7.4, 6), entrada: T('negro', 1.2), salida: T('negro', 1.5),
      sonidos: [{ t: 2.2, efecto: 'trueno', vol: 0.8 }, { t: 3.1, efecto: 'trueno', vol: 0.6 }, { t: 6, efecto: 'rugido_jefe', vol: 1 }],
      texto: ['Y en el fondo del pozo, algo que esperaba mil inviernos abrió los ojos.', 'And at the bottom of the well, something that had waited a thousand winters opened its eyes.'] },
  ],
};
/** Valores de cada elección (las capas con `solo_si` se dibujan solo con ese valor). */
/** Banderas del juego para cada elección: una capa con `si` se dibuja solo con esa bandera encendida. */
export const ELECCIONES: Record<string, string[]> = { vigdis: ['vigdis_viva', 'vigdis_muerta'], brasa: ['brasa_destruir', 'brasa_absorber'] };
export const CLAVES_CINE = Object.keys(GUION);
/**
 * Los pintores de cada plano: los 2D de siempre (cine_planos_a/b/c.ts) y, encima, los de lo horneado en 3D
 * (datos/cine3d/<clave>/<plano>/): la intro siempre (negra si falta hornear) y en las demás claves cada plano que ya
 * tenga horneado reemplaza a su pintor 2D.
 */
/** Los pintores 2D de siempre (las cartas de los actos salen de estos, en modo carta). */
export const PINTORES_2D: Record<string, (t: Toma) => void> = { ...PINTORES_A, ...PINTORES_B, ...PINTORES_C };
export const PINTORES: Record<string, (t: Toma) => void> = {
  ...PINTORES_2D,
  ...Object.assign({}, ...Object.entries(GUION).map(([clave, ps]) => pintoresCine3d(clave, ps.map((p) => p.id), { soloHorneados: clave !== 'intro' }))),
};
/** Música que pide cada cinemática (la intro arranca con la pista 'intro' en el segundo 0 y sigue en el título). */
export const MUSICA_CINE: Record<string, string> = { intro: 'intro' };
/** Sonidos del juego que pueden pedir los planos (`sonidos`). */
export const SONIDOS_CINE = ['campana', 'trueno', 'explosion', 'rugido_jefe'];

/** Pinta un plano: sus capas y sus efectos. */
export function pintarPlano(clave: string, id: string): Toma {
  const p = PINTORES[`${clave}/${id}`];
  if (!p) throw new Error(`No hay pintor para ${clave}/${id}`);
  let s = 0; for (const ch of clave + id) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  const t = new Toma(s % 100000);
  p(t);
  return t;
}

// ------------------------------------------------------------------ hojas de efectos
export interface HojaFx { img: Raster; w: number; h: number; columnas: number; cuadros: number; fps: number; pivote: P2; notas: string }
/**
 * Fuego: 8 cuadros de 64 x 128 que se repiten (se suma). El pie de la llama está en (32, 120). Es fuego de Doom
 * (cine_fuego.ts) con un resplandor que late con él: todos los planos que usan la hoja (fogatas, braseros, el farol de
 * Vigdis) lo heredan sin cambiar nada.
 */
function hojaFuego(): Raster {
  return grilla(cuadrosHojaFuego().map((L, f) => { halo(L, 32, 104, 30, [0.9, 0.35, 0.08], 0.42 + 0.08 * Math.sin((f / 8) * Math.PI * 2), 0.8, true); return aRaster(L); }), 8);
}
/** La hoja de antes (lenguas con máscaras), por si se quiere comparar. */
export function hojaFuegoClasica(): Raster {
  const cuadros: Raster[] = [];
  for (let f = 0; f < 8; f++) {
    const L = lamina(64, 128), m = mascara(64, 128), n = mascara(64, 128);
    llamas(m, 32, 120, 34, 96, 7, f / 8); llamas(n, 32, 120, 16, 52, 11, f / 8 + 0.3);
    brillo(L, desenfocada(m, 5), [1, 0.32, 0.06], 1.2); brillo(L, m, [1, 0.55, 0.15], 1.1); brillo(L, n, [1, 0.88, 0.55], 1.3);
    halo(L, 32, 104, 30, [0.9, 0.35, 0.08], 0.5, 0.8, true);
    cuadros.push(aRaster(L));
  }
  return grilla(cuadros, 8);
}
/** Goteo: 12 cuadros de 32 x 128. La gota se forma arriba (16, 0), se estira, cae y sale por abajo. */
function hojaGoteo(base: C3, filo: C3): Raster {
  const cuadros: Raster[] = [];
  for (let f = 0; f < 12; f++) {
    const L = lamina(32, 128), m = mascara(32, 128), t = f / 11;
    if (t < 0.5) { const r = 2 + t * 5, l = 6 + t * 18; trazo(m, 16, 0, 16, l, 3, r * 1.4); disco(m, 16, l, r); }
    else { const q = (t - 0.5) / 0.5, y = 24 + q * q * 110, r = 3.2; trazo(m, 16, 0, 16, 6 + (1 - q) * 8, 3, 2); disco(m, 16, y, r); trazo(m, 16, y - r * 3 * q, 16, y, r * 0.6, r * 1.5); }
    pintar(L, m, base, 1);
    const b = mascara(32, 128); for (let y = 1; y < 128; y++) for (let x = 1; x < 32; x++) { const i = y * 32 + x; b.d[i] = sat(m.d[i] - m.d[i - 1]) * m.d[i]; }
    pintar(L, b, filo, 0.9, 'luz');
    cuadros.push(aRaster(L));
  }
  return grilla(cuadros, 12);
}
/** Humo: 8 cuadros de 128 x 128 de una bocanada que crece y se deshace (normal). */
function hojaHumo(): Raster {
  const cuadros: Raster[] = [];
  for (let f = 0; f < 8; f++) {
    const L = lamina(128, 128), t = f / 7, r = 22 + t * 34, a0 = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8;
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      const d = Math.hypot(x - 64, (y - 70 + t * 14) * 1.1) / r, n = fbm(x / 22 + t * 1.5, y / 22 - t * 2, 4, 3);
      const a = sat((1 - d) * 1.6 + (n - 0.5) * 1.6) * a0 * 0.75; if (a <= 0) continue;
      const c = 0.06 + n * 0.08, j = (y * 128 + x) * 4; L.d[j] = c * a; L.d[j + 1] = c * 0.92 * a; L.d[j + 2] = c * 0.9 * a; L.d[j + 3] = a;
    }
    cuadros.push(aRaster(L));
  }
  return grilla(cuadros, 8);
}
/** Cuervo: 8 cuadros de 64 x 48 batiendo las alas (silueta negra). */
function hojaCuervo(): Raster {
  const cuadros: Raster[] = [];
  for (let f = 0; f < 8; f++) {
    const L = lamina(64, 48), m = mascara(64, 48), a = Math.sin((f / 8) * Math.PI * 2), cx = 32, cy = 26;
    rellenar(m, [[cx - 14, cy + 1], [cx - 4, cy - 3], [cx + 10, cy - 2], [cx + 16, cy], [cx + 10, cy + 3], [cx - 6, cy + 4]]);
    disco(m, cx + 13, cy - 1.5, 3.2); rellenar(m, [[cx + 15, cy - 2.5], [cx + 21, cy - 0.5], [cx + 15, cy + 0.5]]);
    rellenar(m, [[cx - 13, cy + 1], [cx - 22, cy - 2], [cx - 21, cy + 5], [cx - 12, cy + 4]]);
    const tip: P2 = [cx - 8, cy - 20 * a];
    rellenar(m, [[cx - 6, cy - 1], [cx + 6, cy - 1], [cx + 4, cy - 10 * a], tip, [cx - 18, cy - 12 * a]]);
    pintar(L, m, [0.015, 0.012, 0.015], 1);
    cuadros.push(aRaster(L));
  }
  return grilla(cuadros, 8);
}
export type NombreHoja = 'fuego' | 'goteo_sangre' | 'goteo_agua' | 'humo' | 'cuervo';
let hojasCache: Record<NombreHoja, HojaFx> | null = null;
export function hojasFx(): Record<NombreHoja, HojaFx> {
  if (hojasCache) return hojasCache;
  hojasCache = {
    fuego: { img: hojaFuego(), w: 64, h: 128, columnas: 8, cuadros: 8, fps: 12, pivote: [32, 120], notas: 'llama que se suma' },
    goteo_sangre: { img: hojaGoteo([0.24, 0.01, 0.012], [0.9, 0.35, 0.3]), w: 32, h: 128, columnas: 12, cuadros: 12, fps: 10, pivote: [16, 0], notas: 'gota de sangre que se forma y cae' },
    goteo_agua: { img: hojaGoteo([0.08, 0.2, 0.18], [0.6, 0.95, 0.85]), w: 32, h: 128, columnas: 12, cuadros: 12, fps: 10, pivote: [16, 0], notas: 'gota de agua de mar' },
    humo: { img: hojaHumo(), w: 128, h: 128, columnas: 8, cuadros: 8, fps: 8, pivote: [64, 70], notas: 'bocanada de humo' },
    cuervo: { img: hojaCuervo(), w: 64, h: 48, columnas: 8, cuadros: 8, fps: 10, pivote: [32, 26], notas: 'cuervo que bate las alas' },
  };
  return hojasCache;
}

// ------------------------------------------------------------------ viñeta y cámara
/** Viñeta fija de 1280 x 720 (negro con alfa en los bordes); la franja de la narración la pone el juego. */
export function vinetaCine(): Lamina {
  const w = 1280, h = 720, L = lamina(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const q = Math.hypot((x - w / 2) / (w / 2), (y - h / 2) / (h / 2));
    L.d[(y * w + x) * 4 + 3] = sat(0.72 * suave(0.6, 1.42, q) + 0.18 * (1 - suave(0, 80, y)));
  }
  return L;
}
const curva = (c: Curva, t: number) => (c === 'lineal' ? t : t * t * (3 - 2 * t));
/** Dónde está la cámara en el segundo t del plano: (x, y, zoom), con la sacudida. */
export function camaraEn(cam: Camara, dur: number, t: number): [number, number, number] {
  const u = curva(cam.curva, sat(t / dur));
  let x = cam.desde.x + (cam.hasta.x - cam.desde.x) * u, y = cam.desde.y + (cam.hasta.y - cam.desde.y) * u;
  const z = cam.desde.zoom + (cam.hasta.zoom - cam.desde.zoom) * u, sc = cam.sacudida;
  if (sc && t >= sc.t && t <= sc.t + sc.dur) { const k = 1 - (t - sc.t) / sc.dur, w = t * 11 * Math.PI * 2; x += sc.fuerza * k * Math.sin(w); y += sc.fuerza * k * Math.sin(w * 1.3 + 2); }
  return [x, y, z];
}

// ------------------------------------------------------------------ las capas que salen de una toma
/** Una capa lista para el manifiesto: imagen (o una hoja de efectos), su lugar en la capa de 1408 x 792 y cómo se dibuja. */
export interface CapaFinal { id: string; img: Lamina | null; hoja?: NombreHoja; x: number; y: number; w: number; h: number; paralaje: number; mezcla: 'normal' | 'sumar'; alfa?: number; anim?: Record<string, unknown>; soloSi?: string; opaca?: boolean }
/** Recorta una capa transparente a lo que tiene (con 2 px de aire). */
function recorte(L: Lamina): { img: Lamina; x: number; y: number } | null {
  let x0 = L.w, y0 = L.h, x1 = -1, y1 = -1;
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) { const j = (y * L.w + x) * 4; if (L.d[j + 3] > 0.004 || L.d[j] > 0.004 || L.d[j + 1] > 0.004 || L.d[j + 2] > 0.004) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  if (x1 < 0) return null;
  x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); x1 = Math.min(L.w - 1, x1 + 2); y1 = Math.min(L.h - 1, y1 + 2);
  const w = x1 - x0 + 1, h = y1 - y0 + 1, R = lamina(w, h);
  for (let y = 0; y < h; y++) R.d.set(L.d.subarray(((y + y0) * L.w + x0) * 4, ((y + y0) * L.w + x1 + 1) * 4), y * w * 4);
  return { img: R, x: x0, y: y0 };
}
/** Las capas de la toma en orden de dibujo (recortadas) con los sprites de efectos metidos detrás de su capa. */
export function capasFinales(t: Toma): CapaFinal[] {
  const H = hojasFx(), out: CapaFinal[] = [];
  for (const c of [...t.capas].sort((a, b) => a.z - b.z)) {
    if (c.cuadros) {
      // tira de cuadros: una hoja en grilla (columnas que entren en 4096 px) con anim 'cuadros' a su fps
      const cw = c.cuadros[0].w, ch = c.cuadros[0].h, n = c.cuadros.length, cols = Math.max(1, Math.min(n, Math.floor(4096 / cw))), filas = Math.ceil(n / cols);
      const G = lamina(cw * cols, ch * filas);
      c.cuadros.forEach((L, i) => { const ox = (i % cols) * cw, oy = Math.floor(i / cols) * ch; for (let y = 0; y < ch; y++) G.d.set(L.d.subarray(y * cw * 4, (y + 1) * cw * 4), ((oy + y) * G.w + ox) * 4); });
      out.push({ id: c.id, img: G, x: c.x ?? 0, y: c.y ?? 0, w: cw, h: ch, paralaje: c.paralaje, mezcla: c.mezcla, soloSi: c.soloSi, anim: { tipo: 'cuadros', columnas: cols, cuadros: n, fps: c.fps ?? 12, w: cw, h: ch } });
      continue;
    }
    const r = c.opaca ? { img: c.L, x: 0, y: 0 } : recorte(c.L);
    if (r) out.push({ id: c.id, img: r.img, x: r.x, y: r.y, w: r.img.w, h: r.img.h, paralaje: c.paralaje, mezcla: c.mezcla, anim: c.anim, soloSi: c.soloSi, opaca: c.opaca });
    t.fx.filter((f) => f.despues_de === c.id).forEach((f, i) => {
      const h = H[f.hoja];
      f.en.forEach(([x, y, e], k) => out.push({
        id: `${f.hoja}_${c.id}_${i}_${k}`, img: null, hoja: f.hoja, x: Math.round(x - h.pivote[0] * e), y: Math.round(y - h.pivote[1] * e), w: Math.round(h.w * e), h: Math.round(h.h * e),
        paralaje: f.paralaje, mezcla: f.mezcla, alfa: f.alfa, soloSi: f.soloSi,
        anim: { tipo: 'cuadros', columnas: h.columnas, cuadros: h.cuadros, fps: f.fps ?? h.fps, w: h.w, h: h.h, desfase: +((k * 0.37) % 1).toFixed(2) },
      }));
    });
  }
  return out;
}

// ------------------------------------------------------------------ componer (vistas de control)
/** Dibuja una imagen puesta en (ox, oy) de la capa en la pantalla base, con la cámara como el reproductor del juego. */
function dibujar(out: Lamina, L: Lamina, ox: number, oy: number, w: number, h: number, p: number, cam: [number, number, number], sumar: boolean, k = 1) {
  const z = cam[2], sx = L.w / w, sy = L.h / h;
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) {
    // pantalla = centro + (capa - margen - cam * paralaje - centro) * zoom
    const lx = ((x + 0.5 - 640) / z + 640 + MX + cam[0] * p - ox) * sx - 0.5, ly = ((y + 0.5 - 360) / z + 360 + MY + cam[1] * p - oy) * sy - 0.5;
    if (lx < 0 || ly < 0 || lx >= L.w - 1 || ly >= L.h - 1) continue;
    const xi = Math.floor(lx), yi = Math.floor(ly), u = lx - xi, v = ly - yi, j = (y * out.w + x) * 4;
    const q = (yy: number, xx: number, c: number) => L.d[(yy * L.w + xx) * 4 + c];
    const smp = (c: number) => (q(yi, xi, c) * (1 - u) + q(yi, xi + 1, c) * u) * (1 - v) + (q(yi + 1, xi, c) * (1 - u) + q(yi + 1, xi + 1, c) * u) * v;
    if (sumar) { out.d[j] += smp(0) * k; out.d[j + 1] += smp(1) * k; out.d[j + 2] += smp(2) * k; continue; }
    const a = smp(3) * k; if (a <= 0) continue;
    out.d[j] = out.d[j] * (1 - a) + smp(0) * k; out.d[j + 1] = out.d[j + 1] * (1 - a) + smp(1) * k; out.d[j + 2] = out.d[j + 2] * (1 - a) + smp(2) * k; out.d[j + 3] = 1;
  }
}
const celdas = new Map<string, Lamina>();
function celda(n: NombreHoja, cuadro: number): Lamina {
  const k = `${n}|${cuadro}`;
  let c = celdas.get(k);
  if (!c) {
    const h = hojasFx()[n], cx = (cuadro % h.columnas) * h.w, cy = Math.floor(cuadro / h.columnas) * h.h, r = createRaster(h.w, h.h);
    for (let y = 0; y < h.h; y++) r.data.set(h.img.data.subarray(((cy + y) * h.img.w + cx) * 4, ((cy + y) * h.img.w + cx + h.w) * 4), y * h.w * 4);
    c = desdeRaster(r); celdas.set(k, c);
  }
  return c;
}
/** El cuadro n de una capa que es una tira (hoja en grilla con anim 'cuadros'). */
function celdaTira(c: CapaFinal, n: number): Lamina {
  const a = c.anim as { columnas: number; w: number; h: number }, L = lamina(a.w, a.h), ox = (n % a.columnas) * a.w, oy = Math.floor(n / a.columnas) * a.h;
  for (let y = 0; y < a.h; y++) L.d.set(c.img!.d.subarray(((oy + y) * c.img!.w + ox) * 4, ((oy + y) * c.img!.w + ox + a.w) * 4), y * a.w * 4);
  return L;
}
/**
 * Un plano compuesto en la pantalla base (1280 x 720) en el segundo t, como lo dibuja el juego, con la viñeta y la
 * franja oscura de la narración (para juzgarlo). Con `valor` se elige la variante de una elección.
 */
export function componerPlano(capas: CapaFinal[], p: Plano, o: { t?: number; valor?: string; vineta?: Lamina; franja?: boolean } = {}): Lamina {
  const out = lamina(1280, 720), tt = o.t ?? p.dur * 0.5, cam = camaraEn(p.cam, p.dur, tt);
  const valor = o.valor ?? (p.eleccion ? ELECCIONES[p.eleccion][0] : undefined);
  for (const [i, c] of capas.entries()) {
    if (c.soloSi && c.soloSi !== valor) continue;
    const img = c.img && c.anim?.tipo === 'cuadros' ? celdaTira(c, Math.floor(tt * Number(c.anim.fps ?? 12)) % Number(c.anim.cuadros)) : c.img ?? celda(c.hoja!, Math.floor(tt * Number(c.anim?.fps ?? 10) + i * 3) % hojasFx()[c.hoja!].cuadros);
    // anim 'tiempo': el alfa sigue sus claves en el segundo del plano (relámpagos, ojos que se encienden)
    const kt = c.anim?.tipo === 'tiempo' ? alfaTiempo(c.anim as unknown as AnimTiempo, tt) : 1;
    if (kt <= 0) continue;
    dibujar(out, img, c.x, c.y, c.w, c.h, c.paralaje, cam, c.mezcla === 'sumar', (c.alfa ?? 1) * kt);
  }
  const v = o.vineta ?? vinetaCine();
  for (let i = 0; i < out.w * out.h; i++) {
    const y = Math.floor(i / out.w), barra = o.franja === false ? 0 : sat((y - 560) / 120) * 0.8;
    const a = 1 - (1 - v.d[i * 4 + 3]) * (1 - barra), j = i * 4; out.d[j] *= 1 - a; out.d[j + 1] *= 1 - a; out.d[j + 2] *= 1 - a; out.d[j + 3] = 1;
  }
  return out;
}

// ------------------------------------------------------------------ exportar con el manifiesto
export const CAPA_CINE = { w: CW, h: CH, margen_x: MX, margen_y: MY };
export interface OpcExportar {
  /** guarda un PNG (nombre relativo a la carpeta del kit) */
  poner: (nombre: string, r: Raster) => void;
  aviso?: (s: string) => void;
  /** solo estas claves (por defecto todas) */
  claves?: string[];
  /** recibe cada plano compuesto (vistas de control): clave, índice, variante */
  vista?: (clave: string, n: number, p: Plano, valor: string | undefined, L: Lamina) => void;
}
/**
 * Pinta todas las cinemáticas, guarda sus PNG (capas recortadas, viñeta y hojas de efectos compartidas) y devuelve la
 * sección `cinematicas` del manifiesto, con el esquema del reproductor del juego.
 */
export function exportarCinematicas(o: OpcExportar): Record<string, unknown> {
  const av = o.aviso ?? (() => {}), H = hojasFx(), out: Record<string, unknown> = { capa: CAPA_CINE };
  for (const [n, h] of Object.entries(H)) o.poner(`cinematicas/fx/${n}.png`, h.img);
  o.poner('cinematicas/vineta.png', aRaster(vinetaCine()));
  const vineta = vinetaCine();
  for (const clave of o.claves ?? CLAVES_CINE) {
    const planos: unknown[] = [];
    // lo horneado en 3D (la intro y cada cierre ya rehecho), empaquetado en pocas páginas; cada capa con su recorte. Los
    // planos con horneado NO exportan sus capas 2D viejas (las páginas las reemplazan); los que no, siguen en 2D.
    const pq3 = paqueteCine3d(clave, GUION[clave].map((p) => p.id), decodePng), paquete = pq3.paginas.length || clave === 'intro' ? pq3 : null;
    paquete?.paginas.forEach((pg, i) => o.poner(`cinematicas/${clave}/pagina_${i + 1}.png`, pg));
    GUION[clave].forEach((p, n) => {
      av(`cinemática ${clave} ${p.id}`);
      const t = pintarPlano(clave, p.id), capas = capasFinales(t), pq = paquete?.planos[p.id], en3d = !!pq || clave === 'intro';
      if (paquete && !en3d) av(`cinemática ${clave} ${p.id}: sin horneado 3D, va con sus capas 2D`);
      const archivoDe = (c: CapaFinal) => (c.hoja ? `cinematicas/fx/${c.hoja}.png` : `cinematicas/${clave}/${p.id}_${c.id}.png`);
      if (!en3d) for (const c of capas) if (c.img) o.poner(archivoDe(c), aRaster(c.img, !!c.opaca));
      const json = (lista: CapaFinal[]) => [
        ...(en3d
          ? (pq?.capas ?? []).map((c) => ({ id: c.id, archivo: `cinematicas/${clave}/pagina_${c.pagina + 1}.png`, recorte: c.recorte, x: c.x, y: c.y, w: c.w, h: c.h, paralaje: c.paralaje, mezcla: c.mezcla, ...(c.anim ? { anim: c.anim } : {}), ...(c.si ? { si: c.si } : {}) }))
          : lista.map((c) => ({ id: c.id, archivo: archivoDe(c), x: c.x, y: c.y, w: c.w, h: c.h, paralaje: c.paralaje, mezcla: c.mezcla, ...(c.alfa !== undefined ? { alfa: c.alfa } : {}), ...(c.anim ? { anim: c.anim } : {}), ...(c.soloSi ? { si: c.soloSi } : {}) }))),
        { id: 'vineta', archivo: 'cinematicas/vineta.png', x: MX, y: MY, w: 1280, h: 720, paralaje: 0, mezcla: 'normal' },
      ];
      const plano: Record<string, unknown> = {
        id: p.id, que: p.que, dur: p.dur, capas: json(capas),
        camara: { desde: p.cam.desde, hasta: p.cam.hasta, curva: p.cam.curva, ...(p.cam.sacudida ? { sacudida: p.cam.sacudida } : {}) },
        narracion: { es: p.texto[0], en: p.texto[1] },
        ...(p.textoSegun ? { narracion_si: Object.fromEntries(Object.entries(p.textoSegun).map(([k, v]) => [k, { es: v[0], en: v[1] }])) } : {}),
        fundido: { entra: p.entrada.s, sale: p.salida.s, ...(p.entrada.tipo !== 'negro' && p.entrada.tipo !== 'fundido' ? { color_entra: p.entrada.tipo } : {}), ...(p.salida.tipo !== 'negro' && p.salida.tipo !== 'fundido' ? { color_sale: p.salida.tipo } : {}) },
        ...(t.particulas ? { particulas: t.particulas } : {}),
        ...(p.sonidos ? { sonidos: p.sonidos } : {}),
      };
      const valores = p.eleccion ? ELECCIONES[p.eleccion] : [undefined];
      planos.push(plano);
      if (o.vista) for (const v of valores) o.vista(clave, n, p, v, componerPlano(capas, p, { valor: v, vineta }));
    });
    out[clave] = { ...(MUSICA_CINE[clave] ? { musica: MUSICA_CINE[clave] } : {}), planos };
  }
  return out;
}

export const LEEME_CINE = `cinematicas/  las cinemáticas de cierre de cada acto: portada.json > cinematicas > <clave> > planos. Cada plano trae sus
              capas (recortadas: x, y, w, h en la capa de 1408x792 cuya pantalla base va en 64, 36), paralaje, mezcla y
              animación; cámara, fundidos, narración (es, en) y partículas del juego. cinematicas/fx/ son hojas de
              sprites compartidas (fuego, goteo de sangre y de agua, humo, cuervos) que las capas usan con anim
              "cuadros". cinematicas/vineta.png va encima de todo con paralaje 0. El fuego (la hoja fx/fuego.png y
              las tiras de fuego detrás de vitrales, como catedral_fuego en acto_5/p4_ysmeral) es fuego de Doom
              horneado: anim "cuadros" con su hoja en grilla (columnas, cuadros, fps, w, h), se suma y empalma.
              La intro y los cierres ya rehechos en 3D salen de escenas horneadas y empaquetadas en
              cinematicas/<clave>/pagina_N.png (2 páginas por clave como mucho; la intro, 3):
              cada capa trae recorte [sx, sy, sw, sh] (de dónde sale en su página; con anim "cuadros" la celda k
              está en sx + (k % columnas) * w, sy + floor(k / columnas) * h) y se dibuja en x, y, w, h de la capa
              (las tiras van a media resolución: se agrandan). movil_N: normal con alfa (campanas, monjes), en
              bucle. fuego_N: suma, en bucle. luz_N: suma con anim "tiempo" = { tipo: 'tiempo', claves: [[s, alfa],
              ...] }: el alfa sigue las claves en el segundo del plano, lineal entre claves (relámpagos, ojos).
              Una capa con "si" (vigdis_viva, brasa_absorber...) se dibuja solo con esa bandera encendida.
`;
