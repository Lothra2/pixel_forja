import { createRaster, type Raster } from '../core/raster';
import { rng } from '../core/rng';
import {
  lamina, mascara, rellenar, trazo, disco, desenfocada, desenfocar, pintar, brillo, halo, aRaster, grilla, desdeRaster, escalar, sat, suave, fbm, mezcla,
  type Lamina, type C3, type P2,
} from './cine';
import { llamas } from './siluetas';
import { hojaCeniza } from './portada';
import { CW, CH, MX, MY, Toma, type FxToma, type FilaParticula } from './cine_toma';
import { PINTORES_A } from './cine_planos_a';
import { PINTORES_B } from './cine_planos_b';
import { PINTORES_C } from './cine_planos_c';

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
export type Curva = 'lineal' | 'suave' | 'entrada' | 'salida';
/** Cámara: (cx, cy) en px de la capa de paralaje 1 y zoom; se acerca hacia `foco` (pantalla base). */
export interface Camara { tipo: 'acercar' | 'alejar' | 'paneo' | 'quieta' | 'temblor' | 'subir' | 'bajar'; desde: [number, number, number]; hasta: [number, number, number]; foco: [number, number]; curva: Curva; temblor?: { amp: number; hz: number; desde_s: number; hasta_s: number; decae: boolean }[] }
export interface Transicion { tipo: 'corte' | 'negro' | 'fundido' | 'blanco' | 'rojo'; s: number }
export interface Plano { id: string; que: string; dur: number; cam: Camara; texto: Texto; textoSegun?: Record<string, Texto>; eleccion?: 'vigdis' | 'brasa'; entrada: Transicion; salida: Transicion }

// ------------------------------------------------------------------ cámaras
const acercar = (foco: [number, number], z1 = 1.08, desde: [number, number] = [0, 0], hasta: [number, number] = [0, 0], z0 = 1): Camara => ({ tipo: 'acercar', desde: [desde[0], desde[1], z0], hasta: [hasta[0], hasta[1], z1], foco, curva: 'suave' });
const paneo = (dx0: number, dx1: number, dy0 = 0, dy1 = 0, z = 1.02): Camara => ({ tipo: 'paneo', desde: [dx0, dy0, z], hasta: [dx1, dy1, z], foco: [640, 360], curva: 'suave' });
const temblar = (c: Camara, amp: number, hasta_s: number, desde_s = 0, hz = 11): Camara => ({ ...c, temblor: [...(c.temblor ?? []), { amp, hz, desde_s, hasta_s, decae: true }] });
const T = (tipo: Transicion['tipo'], s: number): Transicion => ({ tipo, s });

// ------------------------------------------------------------------ el guion
/** Los planos de cada cinemática (clave del manifiesto: acto_1 ... acto_6, acto_7 y acto_7_<final>). */
export const GUION: Record<string, Plano[]> = {
  acto_1: [
    { id: 'p1_abadesa', que: 'En el Pozo de la Brasa, la Abadesa Ilvara cae sobre la boca del pozo; la brasa le revienta el pecho.', dur: 6.5,
      cam: temblar(acercar([640, 300], 1.1, [0, 8], [0, -6]), 8, 1.4), entrada: T('blanco', 0.25), salida: T('fundido', 1),
      texto: ['La Abadesa cayó con el pecho abierto, cantando todavía. La brasa no cayó con ella.', 'The Abbess fell with her chest torn open, still singing. The ember did not fall with her.'] },
    { id: 'p2_campanas', que: 'Afuera, la brasa sube por el pozo y sale por el campanario de Santa Oria rumbo al sur; las campanas doblan.', dur: 7,
      cam: paneo(40, -40, 10, -12, 1.03), entrada: T('fundido', 1), salida: T('fundido', 1),
      texto: ['Subió por el pozo como una chispa que se niega a morir, y en Santa Oria las campanas doblaron una última vez.', 'It rose up the well like a spark that refuses to die, and in Santa Oria the bells tolled one last time.'] },
    { id: 'p3_camino', que: 'El héroe en el cruce del páramo, junto a la horca; al sur cae una estrella roja. La Marca le late en el brazo.', dur: 7.5,
      cam: acercar([700, 360], 1.07, [-20, 0], [10, -4]), entrada: T('fundido', 1), salida: T('negro', 1.6),
      texto: ['Tomó el camino del sur, hacia Sahrim, donde los reyes no mueren: solo duermen. En tu brazo, la Marca se calentó un poco más.', 'It took the southern road, toward Sahrim, where kings do not die: they only sleep. On your arm, the Mark grew a little warmer.'] },
  ],
  acto_2: [
    { id: 'p1_rey', que: 'En la Cámara del Rey, Khamer-Ul se deshace en arena bajo el haz de luz; la máscara de oro cae.', dur: 6.5,
      cam: temblar(acercar([640, 330], 1.09), 6, 1.2), entrada: T('blanco', 0.25), salida: T('fundido', 1),
      texto: ['Khamer-Ul volvió al polvo de donde lo habían sacado. Ni siquiera su sombra vino a despedirlo.', 'Khamer-Ul returned to the dust he was raised from. Not even his shadow came to say farewell.'] },
    { id: 'p2_coloso', que: 'En el desierto rojo, el coloso enterrado se raja; la brasa huye hacia el este sobre el camino de los empalados.', dur: 7,
      cam: paneo(-40, 40, 0, -8, 1.03), entrada: T('fundido', 1), salida: T('fundido', 1),
      texto: ['El segundo sello se quebró como un hueso seco. La brasa siguió el río hacia el este, donde la selva respira y el agua sangra.', 'The second seal cracked like a dry bone. The ember followed the river east, where the jungle breathes and the water bleeds.'] },
    { id: 'p3_rio', que: 'De noche, el barco de Oyá baja el río; detrás, una figura pálida camina sobre el agua, cantando.', dur: 7.5,
      cam: acercar([980, 380], 1.08, [-30, 0], [20, 0]), entrada: T('fundido', 1), salida: T('negro', 1.6),
      texto: ['Nadie habló durante el viaje. Detrás del barco, algo pálido caminaba sobre el agua, cantando.', 'No one spoke during the voyage. Behind the ship, something pale walked upon the water, singing.'] },
  ],
  acto_3: [
    { id: 'p1_madre', que: 'En el Vientre del templo, la Madre Ciénaga se abre y se hunde en su barro; los huevos revientan.', dur: 6.5,
      cam: temblar(acercar([640, 360], 1.08, [0, -6], [0, 6]), 7, 1.6), entrada: T('blanco', 0.25), salida: T('fundido', 1),
      texto: ['La Madre se abrió como un fruto podrido. De su vientre ya no salió nada vivo.', 'The Mother split open like rotten fruit. Nothing living came out of her womb again.'] },
    { id: 'p2_rio', que: 'Al alba, la pirámide en la niebla; el río ya no es rojo pero arrastra a los muertos. El barco espera.', dur: 7,
      cam: paneo(30, -30, 6, -6, 1.03), entrada: T('fundido', 1), salida: T('fundido', 1),
      texto: ['El río dejó de sangrar, aunque todavía sabe a hierro. Oyá desató las amarras sin mirar atrás.', 'The river stopped bleeding, though it still tastes of iron. Oya cast off without looking back.'] },
    { id: 'p3_norte', que: 'Al norte, en la ventisca, el rey de escarcha camina y los muertos de la montaña lo siguen.', dur: 7.5,
      cam: acercar([700, 340], 1.1), entrada: T('fundido', 1.2), salida: T('negro', 1.6),
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
        destruir: ['Cerraste la mano hasta que la Brasa dejó de latir. Tu Marca quedó gris, como un nombre olvidado.', 'You closed your hand until the Ember stopped beating. Your Mark turned grey, like a forgotten name.'],
        absorber: ['La Marca bebió la Brasa como agua en el desierto. Desde entonces tu sombra es tibia.', 'The Mark drank the Ember like water in the desert. Since then your shadow has been warm.'],
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
        destruir: ['Arriba, Aun-Saar abrió la boca que tiene en el pecho y preguntó por el pedazo que le faltaba. Preguntó por ti.', 'Above, Aun-Saar opened the mouth in his chest and asked for the piece he was missing. He asked for you.'],
        absorber: ['Arriba, Aun-Saar abrió la boca que tiene en el pecho y sonrió. Ya sabía que su sed venía en camino.', 'Above, Aun-Saar opened the mouth in his chest and smiled. He knew his thirst was on its way.'],
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
};
/** Valores de cada elección (las capas con `solo_si` se dibujan solo con ese valor). */
export const ELECCIONES: Record<string, string[]> = { vigdis: ['vigdis_viva', 'vigdis_muerta'], brasa: ['destruir', 'absorber'] };
export const CLAVES_CINE = Object.keys(GUION);
const PINTORES: Record<string, (t: Toma) => void> = { ...PINTORES_A, ...PINTORES_B, ...PINTORES_C };

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
export const FILAS_PARTICULAS: FilaParticula[] = ['copo', 'copo2', 'brasa', 'chispa', 'nieve', 'oro', 'lluvia', 'polvo'];
export interface HojaFx { img: Raster; w: number; h: number; columnas: number; cuadros: number; filas: string[]; notas: string }
/** Hoja de partículas: 8 x 8 celdas de 32 (ceniza, ceniza grande, brasa, chispa, nieve, polvo de oro, lluvia, polvo). */
function hojaParticulas(): Raster {
  const base = hojaCeniza(), C = 32, extra: Raster[] = [];
  for (let fila = 4; fila < 8; fila++) for (let f = 0; f < 8; f++) {
    const L = lamina(C, C), m = mascara(C, C), a = (f / 8) * Math.PI * 2;
    if (fila === 4) { disco(m, 16, 16, 3.2 + Math.sin(a) * 0.4); const g = desenfocada(m, 1.2); pintar(L, g, [0.86, 0.9, 1], 0.95); }
    else if (fila === 5) { const p = 0.5 + 0.5 * Math.sin(a); halo(L, 16, 16, 9, [1, 0.78, 0.35], 0.6 * p + 0.2, 1, true); trazo(m, 16, 16 - 7 * p, 16, 16 + 7 * p, 1, 1); trazo(m, 16 - 7 * p, 16, 16 + 7 * p, 16, 1, 1); disco(m, 16, 16, 1.6); brillo(L, m, [1, 0.9, 0.6], 1.1); }
    else if (fila === 6) { trazo(m, 18, 2, 14, 30, 1.1, 1.1, 0.9, 'max', false); pintar(L, m, [0.7, 0.75, 0.82], 0.55); }
    else { disco(m, 16, 16, 2.5); pintar(L, desenfocada(m, 2), [0.55, 0.5, 0.45], 0.6 + 0.2 * Math.sin(a)); }
    extra.push(aRaster(L));
  }
  const ex = grilla(extra, 8), o = createRaster(256, 256);
  o.data.set(base.data, 0); o.data.set(ex.data, 256 * 128 * 4);
  return o;
}
/** Fuego: 8 cuadros de 64 x 128 que se repiten (se suma). El pie de la llama está en (32, 120). */
function hojaFuego(): Raster {
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
/** Goteo: 12 cuadros de 32 x 128 por fila (sangre, agua de mar). La gota se forma arriba (16, 6), se estira, cae y sale por abajo. */
function hojaGoteo(): Raster {
  const cuadros: Raster[] = [];
  for (const [base, filo] of [[[0.24, 0.01, 0.012], [0.9, 0.35, 0.3]], [[0.08, 0.2, 0.18], [0.6, 0.95, 0.85]]] as [C3, C3][]) for (let f = 0; f < 12; f++) {
    const L = lamina(32, 128), m = mascara(32, 128);
    const t = f / 11;
    if (t < 0.5) { const r = 2 + t * 5, l = 6 + t * 18; trazo(m, 16, 0, 16, l, 3, r * 1.4); disco(m, 16, l, r); }
    else { const q = (t - 0.5) / 0.5, y = 24 + q * q * 110, r = 3.2; trazo(m, 16, 0, 16, 6 + (1 - q) * 8, 3, 2); disco(m, 16, y, r); trazo(m, 16, y - r * 3 * q, 16, y, r * 0.6, r * 1.5); }
    pintar(L, m, base, 1);
    const b = mascara(32, 128); for (let y = 1; y < 128; y++) for (let x = 1; x < 32; x++) { const i = y * 32 + x; b.d[i] = sat(m.d[i] - m.d[i - 1]) * m.d[i]; }
    pintar(L, b, filo, 0.9, 'luz');
    cuadros.push(aRaster(L));
  }
  return grilla(cuadros, 12);
}
/** Humo: 8 cuadros de 128 x 128 de una bocanada que crece y se deshace (normal; el juego la hace subir). */
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
/** Cuervo: 8 cuadros de 64 x 48 batiendo las alas (silueta negra; el juego lo mueve). */
function hojaCuervo(): Raster {
  const cuadros: Raster[] = [];
  for (let f = 0; f < 8; f++) {
    const L = lamina(64, 48), m = mascara(64, 48), a = Math.sin((f / 8) * Math.PI * 2), cx = 32, cy = 24;
    rellenar(m, [[cx - 14, cy + 1], [cx - 4, cy - 3], [cx + 10, cy - 2], [cx + 16, cy], [cx + 10, cy + 3], [cx - 6, cy + 4]]);
    disco(m, cx + 13, cy - 1.5, 3.2); rellenar(m, [[cx + 15, cy - 2.5], [cx + 21, cy - 0.5], [cx + 15, cy + 0.5]]);
    rellenar(m, [[cx - 13, cy + 1], [cx - 22, cy - 2], [cx - 21, cy + 5], [cx - 12, cy + 4]]);
    for (const lado of [-1, 1]) { const tip: P2 = [cx - 6 + lado * 2, cy - 20 * a * lado * lado]; rellenar(m, [[cx - 4, cy - 1], [cx + 6, cy - 1], [cx + 2 + 8, tip[1] * 0.5 + cy * 0.5], tip, [cx - 16, tip[1] * 0.7 + cy * 0.3]]); }
    pintar(L, m, [0.015, 0.012, 0.015], 1);
    cuadros.push(aRaster(L));
  }
  return grilla(cuadros, 8);
}
let hojasCache: Record<string, HojaFx> | null = null;
export function hojasFx(): Record<string, HojaFx> {
  if (hojasCache) return hojasCache;
  hojasCache = {
    particulas: { img: hojaParticulas(), w: 32, h: 32, columnas: 8, cuadros: 8, filas: FILAS_PARTICULAS, notas: 'Una fila por tipo; cada partícula avanza por los 8 cuadros de su fila.' },
    fuego: { img: hojaFuego(), w: 64, h: 128, columnas: 8, cuadros: 8, filas: ['fuego'], notas: 'Se suma. El pie de la llama va en (32, 120) de la celda.' },
    goteo: { img: hojaGoteo(), w: 32, h: 128, columnas: 12, cuadros: 12, filas: ['sangre', 'agua'], notas: 'Normal. La gota nace en (16, 0) de la celda; poner ese punto en la posición del efecto.' },
    humo: { img: hojaHumo(), w: 128, h: 128, columnas: 8, cuadros: 8, filas: ['humo'], notas: 'Normal. Centro de la bocanada en (64, 70) de la celda.' },
    cuervo: { img: hojaCuervo(), w: 64, h: 48, columnas: 8, cuadros: 8, filas: ['cuervo'], notas: 'Normal. Mira a la derecha: espejar para volar a la izquierda.' },
  };
  return hojasCache;
}

// ------------------------------------------------------------------ viñeta y cámara
/** Viñeta fija de 1280 x 720 de las cinemáticas (negro con alfa): bordes y la franja de la narración más oscura. */
export function vinetaCine(): Lamina {
  const w = 1280, h = 720, L = lamina(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const q = Math.hypot((x - w / 2) / (w / 2), (y - h / 2) / (h / 2));
    L.d[(y * w + x) * 4 + 3] = sat(0.7 * suave(0.62, 1.45, q) + 0.55 * suave(500, 640, y) + 0.2 * (1 - suave(0, 70, y)));
  }
  return L;
}
const curva = (c: Curva, t: number) => (c === 'lineal' ? t : c === 'entrada' ? t * t : c === 'salida' ? 1 - (1 - t) * (1 - t) : t * t * (3 - 2 * t));
/** Dónde está la cámara en el segundo t del plano: (cx, cy, zoom), con el temblor. */
export function camaraEn(cam: Camara, dur: number, t: number): [number, number, number] {
  const u = curva(cam.curva, sat(t / dur));
  let cx = cam.desde[0] + (cam.hasta[0] - cam.desde[0]) * u, cy = cam.desde[1] + (cam.hasta[1] - cam.desde[1]) * u;
  const z = cam.desde[2] + (cam.hasta[2] - cam.desde[2]) * u;
  for (const tb of cam.temblor ?? []) {
    if (t < tb.desde_s || t > tb.hasta_s) continue;
    const k = tb.decae ? 1 - (t - tb.desde_s) / (tb.hasta_s - tb.desde_s) : 1, w = t * tb.hz * Math.PI * 2;
    cx += tb.amp * k * (Math.sin(w) * 0.6 + Math.sin(w * 2.3 + 1) * 0.4); cy += tb.amp * k * (Math.sin(w * 1.3 + 2) * 0.6 + Math.sin(w * 2.9) * 0.4);
  }
  return [cx, cy, z];
}

// ------------------------------------------------------------------ componer (vistas de control)
/** Dibuja una capa (de 1408 x 792 o recortada en ox, oy) en la pantalla base con la cámara, como lo haría el juego. */
function dibujarCapa(out: Lamina, L: Lamina, ox: number, oy: number, p: number, cam: [number, number, number], foco: [number, number], sumar: boolean, k = 1) {
  const s = 1 + (cam[2] - 1) * p;
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) {
    // pantalla = foco + (capa - margen - cam * p - foco) * s  =>  capa = (pantalla - foco) / s + foco + margen + cam * p
    const lx = (x + 0.5 - foco[0]) / s + foco[0] + MX + cam[0] * p - ox - 0.5, ly = (y + 0.5 - foco[1]) / s + foco[1] + MY + cam[1] * p - oy - 0.5;
    if (lx < 0 || ly < 0 || lx >= L.w - 1 || ly >= L.h - 1) continue;
    const xi = Math.floor(lx), yi = Math.floor(ly), u = lx - xi, v = ly - yi, j = (y * out.w + x) * 4;
    const q = (yy: number, xx: number, c: number) => L.d[(yy * L.w + xx) * 4 + c];
    const smp = (c: number) => (q(yi, xi, c) * (1 - u) + q(yi, xi + 1, c) * u) * (1 - v) + (q(yi + 1, xi, c) * (1 - u) + q(yi + 1, xi + 1, c) * u) * v;
    const a = smp(3) * k;
    if (sumar) { out.d[j] += smp(0) * k; out.d[j + 1] += smp(1) * k; out.d[j + 2] += smp(2) * k; continue; }
    if (a <= 0) continue;
    out.d[j] = out.d[j] * (1 - a) + smp(0) * k; out.d[j + 1] = out.d[j + 1] * (1 - a) + smp(1) * k; out.d[j + 2] = out.d[j + 2] * (1 - a) + smp(2) * k; out.d[j + 3] = 1;
  }
}
/** Los efectos de un plano pintados quietos (posiciones sembradas) en una lámina de capa: para las vistas de control. */
function sembrarFx(L: Lamina, fx: FxToma, s: number) {
  const H = hojasFx(), r = rng(s);
  const sello = (h: HojaFx, fila: number, cuadro: number, x: number, y: number, esc: number, alfa: number, sumar: boolean, px: number, py: number) => {
    const cel = recorteCelda(h, fila, cuadro), w = Math.max(1, Math.round(h.w * esc)), hh = Math.max(1, Math.round(h.h * esc));
    const e = escalar(cel, w, hh);
    for (let yy = 0; yy < hh; yy++) for (let xx = 0; xx < w; xx++) {
      const tx = Math.round(x - px * esc + xx), ty = Math.round(y - py * esc + yy); if (tx < 0 || ty < 0 || tx >= L.w || ty >= L.h) continue;
      const sj = (yy * w + xx) * 4, tj = (ty * L.w + tx) * 4, a = e.d[sj + 3] * alfa;
      if (sumar) { L.d[tj] += e.d[sj] * alfa; L.d[tj + 1] += e.d[sj + 1] * alfa; L.d[tj + 2] += e.d[sj + 2] * alfa; continue; }
      L.d[tj] = L.d[tj] * (1 - a) + e.d[sj] * alfa; L.d[tj + 1] = L.d[tj + 1] * (1 - a) + e.d[sj + 1] * alfa; L.d[tj + 2] = L.d[tj + 2] * (1 - a) + e.d[sj + 2] * alfa;
    }
  };
  if (fx.tipo === 'particulas') {
    const fila = FILAS_PARTICULAS.indexOf(fx.fila);
    for (let i = 0; i < fx.cantidad; i++) sello(H.particulas, fila, Math.floor(r() * 8), fx.zona[0] + r() * fx.zona[2], fx.zona[1] + r() * fx.zona[3], fx.escala[0] + r() * (fx.escala[1] - fx.escala[0]), fx.alfa[0] + r() * (fx.alfa[1] - fx.alfa[0]), fx.mezcla === 'sumar', 16, 16);
  } else {
    const h = H[fx.hoja], fila = fx.fila ? Math.max(0, h.filas.indexOf(fx.fila)) : 0, piv: P2 = fx.hoja === 'fuego' ? [32, 120] : fx.hoja === 'goteo' ? [16, 0] : fx.hoja === 'humo' ? [64, 70] : [32, 24];
    for (const [x, y, e] of fx.en) sello(h, fila, Math.floor(r() * h.cuadros), x, y, e, fx.alfa ?? 1, fx.mezcla === 'sumar', piv[0], piv[1]);
  }
}
const celdas = new Map<string, Lamina>();
function recorteCelda(h: HojaFx, fila: number, cuadro: number): Lamina {
  const k = `${h.w}x${h.h}|${h.columnas}|${fila}|${cuadro}|${h.img.w}`;
  let c = celdas.get(k);
  if (!c) {
    const i = fila * h.cuadros + cuadro, cx = (i % h.columnas) * h.w, cy = Math.floor(i / h.columnas) * h.h, r = createRaster(h.w, h.h);
    for (let y = 0; y < h.h; y++) r.data.set(h.img.data.subarray(((cy + y) * h.img.w + cx) * 4, ((cy + y) * h.img.w + cx + h.w) * 4), y * h.w * 4);
    c = desdeRaster(r); celdas.set(k, c);
  }
  return c;
}
/** Una toma compuesta en la pantalla base (1280 x 720) en el segundo t, con una elección y sus efectos sembrados. */
export function componerPlano(t: Toma, p: Plano, o: { t?: number; valor?: string; fx?: boolean; vineta?: Lamina } = {}): Lamina {
  const out = lamina(1280, 720), cam = camaraEn(p.cam, p.dur, o.t ?? p.dur * 0.5);
  const valor = o.valor ?? (p.eleccion ? ELECCIONES[p.eleccion][0] : undefined);
  const capas = [...t.capas].filter((c) => !c.soloSi || c.soloSi === valor).sort((a, b) => a.z - b.z);
  for (const c of capas) {
    dibujarCapa(out, c.L, 0, 0, c.paralaje, cam, p.cam.foco, c.mezcla === 'sumar');
    if (o.fx !== false) for (const [i, f] of t.fx.entries()) {
      if (f.despues_de !== c.id || (f.tipo === 'sprite' && f.soloSi && f.soloSi !== valor)) continue;
      const L = lamina(CW, CH); sembrarFx(L, f, t.semilla + i * 7);
      dibujarCapa(out, L, 0, 0, f.paralaje, cam, p.cam.foco, f.mezcla === 'sumar');
    }
  }
  const v = o.vineta ?? vinetaCine();
  for (let i = 0; i < out.w * out.h; i++) { const a = v.d[i * 4 + 3], j = i * 4; out.d[j] *= 1 - a; out.d[j + 1] *= 1 - a; out.d[j + 2] *= 1 - a; out.d[j + 3] = 1; }
  return out;
}

// ------------------------------------------------------------------ manifiesto
/** Recorta una capa transparente a lo que tiene (con 2 px de aire): devuelve el pedazo y dónde va en la capa. */
export function recorteCapa(L: Lamina, opaca: boolean): { img: Raster; x: number; y: number } {
  if (opaca) return { img: aRaster(L, true), x: 0, y: 0 };
  let x0 = L.w, y0 = L.h, x1 = -1, y1 = -1;
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) { const j = (y * L.w + x) * 4; if (L.d[j + 3] > 0.004 || L.d[j] > 0.004 || L.d[j + 1] > 0.004 || L.d[j + 2] > 0.004) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  if (x1 < 0) return { img: createRaster(1, 1), x: 0, y: 0 };
  x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); x1 = Math.min(L.w - 1, x1 + 2); y1 = Math.min(L.h - 1, y1 + 2);
  const w = x1 - x0 + 1, h = y1 - y0 + 1, R = lamina(w, h);
  for (let y = 0; y < h; y++) R.d.set(L.d.subarray(((y + y0) * L.w + x0) * 4, ((y + y0) * L.w + x1 + 1) * 4), y * w * 4);
  // lo que suma no tiene alfa propio: se guarda con alfa = su luz para que el PNG lo conserve (el juego lo dibuja con 'lighter')
  return { img: aRaster(R), x: x0, y: y0 };
}
const aBase = ([x, y]: [number, number]): [number, number] => [Math.round(x - MX), Math.round(y - MY)];
/** El pedazo del manifiesto de un plano (los archivos los pone quien llama). */
export function manifiestoPlano(clave: string, n: number, p: Plano, capas: { id: string; z: number; archivo: string; x: number; y: number; w: number; h: number; paralaje: number; mezcla: string; anim?: Record<string, unknown>; soloSi?: string; notas?: string }[], fx: FxToma[]) {
  const narr = (tx: Texto) => ({ es: tx[0], en: tx[1] });
  return {
    id: p.id, n, que: p.que, dur_s: p.dur,
    camara: { ...p.cam, notas: undefined },
    narracion: { ...narr(p.texto), aparece_s: Math.min(1.2, p.entrada.s + 0.3), hasta_s: +(p.dur - p.salida.s * 0.6).toFixed(2), ...(p.textoSegun ? { segun: Object.fromEntries(Object.entries(p.textoSegun).map(([k, v]) => [k, narr(v)])) } : {}) },
    ...(p.eleccion ? { eleccion: p.eleccion, valores: ELECCIONES[p.eleccion] } : {}),
    transicion: { entrada: p.entrada, salida: p.salida },
    capas: capas.map((c) => ({ id: c.id, z: c.z, archivo: c.archivo, x: c.x, y: c.y, w: c.w, h: c.h, paralaje: c.paralaje, mezcla: c.mezcla, ...(c.anim ? { anim: c.anim } : {}), ...(c.soloSi ? { solo_si: { eleccion: p.eleccion, valor: c.soloSi } } : {}), ...(c.notas ? { notas: c.notas } : {}) })),
    efectos: fx.map((f) => (f.tipo === 'particulas'
      ? { ...f, hoja: 'particulas', zona: [Math.round(f.zona[0] - MX), Math.round(f.zona[1] - MY), Math.round(f.zona[2]), Math.round(f.zona[3])], fps: f.fps ?? 10, loop: true }
      : { ...f, en: f.en.map(([x, y, e]) => [...aBase([x, y]), e]), loop: true, ...(f.soloSi ? { solo_si: { eleccion: p.eleccion, valor: f.soloSi }, soloSi: undefined } : {}) })),
  };
}
export const CAPA_CINE = { w: CW, h: CH, margen_x: MX, margen_y: MY };
export { CW, CH, MX, MY };
export type { Toma };
export const LEEME_CINE = `cinematicas/  las cinemáticas de cierre de cada acto. portada.json > cinematicas dice, por clave (acto_1 ... acto_6, acto_7 y
              acto_7_<final>), sus planos: capas recortadas con su lugar en la capa de 1408x792, paralaje, mezcla y
              animación; efectos (partículas y sprites de cinematicas/fx/); duración, cámara, transiciones y narración.
`;
