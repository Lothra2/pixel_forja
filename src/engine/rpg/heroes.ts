import type { HumanFicha, Gear, Proportions, CellSize } from '../sheet/ficha';
import { fichaFromAvatar } from '../sheet/build';
import { recolor, type ColorSlot } from '../sheet/recolor';
import { defaultAvatar } from '../head3d/avatar';
import { DEFAULT_LPC, type LpcLook } from '../parts/lpc';
import { bodyProportions, DEFAULT_BODY, type BodyType } from '../rig/dims';

/**
 * Héroes de cómic originales para el proyecto de juegos deportivos. Son arquetipos propios: nombres, colores y
 * siluetas distintos, sin emblemas ni trajes copiados de personajes con dueño (así el juego se puede publicar).
 *
 * La máscara se logra pintando la cabeza del color del traje, sin pelo ni cejas, con los ojos como lentes claros.
 * El traje entero: manga larga, pantalón, guantes y botas del mismo color.
 */

export type HeroId = 'aracnido' | 'garra' | 'pantera' | 'carmesi' | 'vigilante' | 'coloso';
export const HEROES: HeroId[] = ['aracnido', 'garra', 'pantera', 'carmesi', 'vigilante', 'coloso'];

interface HeroDef {
  name: { es: string; en: string };
  /** de qué va, en una línea (para el estudio y la documentación) */
  idea: { es: string; en: string };
  /** color de la piel; con máscara, el color de la máscara */
  skin: string;
  hair?: string;
  eyes: string;
  /** con máscara: color de los lentes (se dibujan con la pieza de anteojos de sol, que tapa los ojos) */
  lens?: string;
  lpc: Partial<LpcLook>;
  body?: BodyType;
  /** medidas fuera de los límites del estudio (el coloso) */
  size?: Partial<Proportions>;
  outfit: Partial<HumanFicha['outfit']>;
  colors: Partial<Record<ColorSlot, string>>;
  mouth: HumanFicha['face']['mouth'];
  gear?: Gear;
  /** celda en la que se dibuja (el coloso no entra en 48) */
  cell: CellSize;
}

/** cabeza con máscara: sin pelo, cejas, nariz ni barba */
const mask: Partial<LpcLook> = { hair: null, brows: null, nose: null, beard: null, mustache: null, glasses: 'sunglasses' };

export const HERO_DEFS: Record<HeroId, HeroDef> = {
  // trepamuros: azul noche con una red dorada, lentes blancos grandes
  aracnido: {
    name: { es: 'Arácnido', en: 'Webcrawler' }, idea: { es: 'Trepamuros ágil de traje azul noche con red dorada', en: 'Agile wall-crawler in a midnight suit with a golden web' },
    skin: '#1f3fae', eyes: '#f4f8ff', lens: '#f4f8ff', lpc: { head: 'male', ...mask },
    body: { age: 'adolescente', build: 'delgado', shape: 'recto' },
    outfit: { sleeves: 'long', bottom: 'pants', socks: 'none', shoes: 'botas', gloves: true, pattern: 'cuadros', pattern2: '#e8b938', collar: 'redondo' },
    colors: { top: '#1f3fae', bottom: '#16245e', shoes: '#16245e', accessory: '#e8b938' },
    mouth: 'line', cell: 48,
  },
  // mutante con garras: chaqueta de cuero, patillas y pelo en punta, garras de acero
  garra: {
    name: { es: 'Garra', en: 'Talon' }, idea: { es: 'Mutante rudo de chaqueta de cuero y garras de acero', en: 'Rugged mutant in a leather jacket with steel claws' },
    skin: '#c48a64', hair: '#1c1612', eyes: '#3a2418', lpc: { head: 'male_gaunt', hair: 'spiked', brows: 'thick', nose: 'straight', beard: 'trimmed' },
    body: { age: 'adulto', build: 'robusto', shape: 'recto' },
    outfit: { sleeves: 'long', bottom: 'pants', socks: 'none', shoes: 'botas', jacket: '#6b4527', collar: 'v' },
    colors: { top: '#d9d2bc', bottom: '#2e3b55', shoes: '#2a201a' },
    mouth: 'line', gear: { main: 'claws', off: null }, cell: 48,
  },
  // guerrera pantera: todo negro con franja plateada, orejas de felino y garras
  pantera: {
    name: { es: 'Pantera de Ónix', en: 'Onyx Panther' }, idea: { es: 'Guerrera felina de traje negro con franja plateada', en: 'Feline warrior in a black suit with a silver stripe' },
    skin: '#18181d', eyes: '#cfdcff', lens: '#c9d4ef', lpc: { head: 'male', ...mask, ears: 'cat' },
    body: { age: 'adulto', build: 'medio', shape: 'recto' },
    outfit: { sleeves: 'long', bottom: 'pants', socks: 'none', shoes: 'botas', gloves: true, pattern: 'banda', pattern2: '#9aa6bd', collar: 'redondo' },
    colors: { top: '#1d1d24', bottom: '#15151a', shoes: '#15151a', accessory: '#2a2a33' },
    mouth: 'line', gear: { main: 'claws', off: null }, cell: 48,
  },
  // mercenario bocón: mitad carmesí, mitad negro, máscara roja y una espada
  carmesi: {
    name: { es: 'Mercenario Carmesí', en: 'Crimson Merc' }, idea: { es: 'Mercenario bromista de traje carmesí y negro con espada', en: 'Wisecracking merc in crimson and black with a sword' },
    skin: '#b01f2b', eyes: '#ffffff', lens: '#ffffff', lpc: { head: 'male', ...mask },
    body: { age: 'adulto', build: 'medio', shape: 'recto' },
    outfit: { sleeves: 'long', bottom: 'pants', socks: 'none', shoes: 'botas', gloves: true, pattern: 'mitades', pattern2: '#1e1e24', belt: '#3a2a1a' },
    colors: { top: '#b01f2b', bottom: '#1e1e24', shoes: '#1e1e24', accessory: '#1e1e24' },
    mouth: 'line', gear: { main: 'sword', off: null }, cell: 48,
  },
  // vigilante nocturno: gris carbón, capa larga, capucha con orejas en punta y cinturón dorado
  vigilante: {
    name: { es: 'Vigilante Nocturno', en: 'Night Warden' }, idea: { es: 'Detective de la noche con capa, capucha de orejas en punta y cinturón dorado', en: 'Night detective with a cape, pointed cowl and golden belt' },
    skin: '#24252d', eyes: '#f4f6ff', lens: '#e9edf8', lpc: { head: 'male', ...mask, ears: 'long' },
    body: { age: 'adulto', build: 'robusto', shape: 'recto' },
    outfit: { sleeves: 'long', bottom: 'pants', socks: 'none', shoes: 'botas', gloves: true, belt: '#e2b23c', cape: '#17181f', collar: 'redondo' },
    colors: { top: '#4a4d59', bottom: '#2a2b33', shoes: '#1b1c22', accessory: '#1b1c22' },
    mouth: 'line', cell: 48,
  },
  // coloso: gigante verde, sin camisa, short de jean roto, descalzo
  coloso: {
    name: { es: 'Coloso Verde', en: 'Green Colossus' }, idea: { es: 'Gigante verde de fuerza bruta, enorme y descalzo', en: 'Huge barefoot green brute' },
    skin: '#5d9b48', hair: '#18201a', eyes: '#2a3a1e', lpc: { head: 'male', hair: 'buzzcut', brows: 'thick', nose: 'big' },
    body: { age: 'adulto', build: 'robusto', shape: 'recto' },
    size: { height: 1.2, build: 1.38, shoulders: 1.25, arms: 1.08 },
    // el pecho marcado en un verde más oscuro (sin camisa)
    outfit: { sleeves: 'none', bottom: 'shorts', socks: 'none', shoes: 'descalzo', belt: '#3a2a1a', print: '#47803a' },
    colors: { bottom: '#33405e' },
    mouth: 'line', cell: 64,
  },
};

/** Ficha de un héroe (casual de deporte: sin arma). Con armado = true lleva sus garras o su espada. */
export function heroFicha(id: HeroId, armed = false): HumanFicha {
  const h = HERO_DEFS[id];
  const b = defaultAvatar();
  const av = {
    ...b, skin: h.skin, kit: 'lpc' as const, body: h.body,
    hair: { ...b.hair, color: h.hair ?? h.skin }, eyes: { ...b.eyes, color: h.eyes },
    beard: { ...b.beard, color: h.hair ?? h.skin }, glasses: { ...b.glasses, color: h.lens ?? '#1e1e24' },
    lpc: { ...DEFAULT_LPC, nose: null, beard: null, mustache: null, glasses: null, ...h.lpc },
  };
  let f = fichaFromAvatar(h.name.es, av, h.outfit) as HumanFicha;
  const body = { ...DEFAULT_BODY, ...(h.body ?? {}) };
  f = { ...f, body: { ...f.body, proportions: { ...bodyProportions(f.body.proportions.preset, body), ...(h.size ?? {}) } } };
  for (const [s, c] of Object.entries(h.colors)) f = recolor(f, s as ColorSlot, c) as HumanFicha;
  // sin camisa: el torso es piel
  if (h.outfit.sleeves === 'none' && !h.colors.top) f = recolor(f, 'top', h.skin) as HumanFicha;
  f = { ...f, face: { ...f.face, mouth: h.mouth }, movementProfile: 'premium' };
  if (armed && h.gear) f = { ...f, gear: { ...h.gear } };
  return f;
}

export const heroCell = (id: HeroId): CellSize => HERO_DEFS[id].cell;
