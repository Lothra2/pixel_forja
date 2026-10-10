import type { HumanFicha, Gear, Proportions, CellSize } from '../sheet/ficha';
import { fichaFromAvatar } from '../sheet/build';
import { recolor, type ColorSlot } from '../sheet/recolor';
import { defaultAvatar } from '../head3d/avatar';
import { DEFAULT_LPC, type LpcLook } from '../parts/lpc';
import { bodyProportions, DEFAULT_BODY, type BodyType } from '../rig/dims';

/**
 * Héroes de cómic para el proyecto de juegos deportivos de Rick: versiones chibi de fan, para uso personal.
 * Son personajes con dueño (Marvel y DC): publicarlos en un juego o un sitio abierto necesita licencia.
 *
 * La máscara se logra pintando la cabeza del color del traje, sin pelo ni cejas, con los ojos como lentes.
 * El traje entero: manga larga, pantalón, guantes y botas, y el emblema en el pecho cuando lo tiene.
 */

export type HeroId = 'spiderman' | 'wolverine' | 'blackpanther' | 'deadpool' | 'batman' | 'hulk';
export const HEROES: HeroId[] = ['spiderman', 'wolverine', 'blackpanther', 'deadpool', 'batman', 'hulk'];

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
  /** medidas fuera de los límites del estudio (Hulk) */
  size?: Partial<Proportions>;
  outfit: Partial<HumanFicha['outfit']>;
  colors: Partial<Record<ColorSlot, string>>;
  mouth: HumanFicha['face']['mouth'];
  gear?: Gear;
  /** celda en la que se dibuja (Hulk no entra en 48) */
  cell: CellSize;
}

/** cabeza con máscara: sin pelo, cejas, nariz ni barba. Con marco redondo y ojos blancos quedan los ojos de la máscara */
const mask: Partial<LpcLook> = { hair: null, brows: null, nose: null, beard: null, mustache: null, glasses: 'sunglasses' };

export const HERO_DEFS: Record<HeroId, HeroDef> = {
  // rojo con telaraña negra, azul en las piernas, ojos blancos grandes y la araña en el pecho
  spiderman: {
    name: { es: 'Spider-Man', en: 'Spider-Man' }, idea: { es: 'El trepamuros: rojo y azul, telaraña y la araña en el pecho', en: 'The wall-crawler: red and blue, webbing and the chest spider' },
    skin: '#c8202c', eyes: '#ffffff', lens: '#101014', lpc: { head: 'male', ...mask, glasses: 'round' },
    body: { age: 'adulto', build: 'medio', shape: 'recto' },
    outfit: { sleeves: 'long', bottom: 'pants', socks: 'none', shoes: 'botas', gloves: true, pattern: 'cuadros', pattern2: '#7a0f18', collar: 'redondo', emblem: 'spider', emblemColor: '#141418' },
    colors: { top: '#c8202c', bottom: '#1f4fc0', shoes: '#c8202c', accessory: '#c8202c' },
    mouth: 'line', cell: 48,
  },
  // Logan: pelo en punta, patillas, traje amarillo y azul y las garras
  wolverine: {
    name: { es: 'Wolverine', en: 'Wolverine' }, idea: { es: 'Logan: traje amarillo y azul, patillas y garras de adamantium', en: 'Logan: yellow and blue suit, sideburns and adamantium claws' },
    skin: '#d39a72', hair: '#141414', eyes: '#3a2418', lpc: { head: 'male_gaunt', hair: 'spiked', brows: 'thick', nose: 'straight', beard: 'trimmed' },
    body: { age: 'adulto', build: 'robusto', shape: 'recto' },
    outfit: { sleeves: 'long', bottom: 'pants', socks: 'none', shoes: 'botas', gloves: true, collar: 'redondo', belt: '#b8322a' },
    colors: { top: '#f2c230', bottom: '#2443a0', shoes: '#2443a0', accessory: '#2443a0' },
    mouth: 'line', gear: { main: 'claws', off: null }, cell: 48,
  },
  // todo negro con detalles plateados, orejas de felino y garras
  blackpanther: {
    name: { es: 'Pantera Negra', en: 'Black Panther' }, idea: { es: 'El rey de Wakanda: traje negro con plata, orejas de felino y garras', en: 'The king of Wakanda: black suit with silver, cat ears and claws' },
    skin: '#18181d', eyes: '#e8ecf5', lens: '#e8ecf5', lpc: { head: 'male', ...mask, ears: 'cat' },
    body: { age: 'adulto', build: 'medio', shape: 'recto' },
    outfit: { sleeves: 'long', bottom: 'pants', socks: 'none', shoes: 'botas', gloves: true, collar: 'v' },
    colors: { top: '#1d1d24', bottom: '#15151a', shoes: '#15151a', accessory: '#26262e' },
    mouth: 'line', gear: { main: 'claws', off: null }, cell: 48,
  },
  // rojo entero con los parches negros de los ojos, guantes y botas negras, cinturón y su espada
  deadpool: {
    name: { es: 'Deadpool', en: 'Deadpool' }, idea: { es: 'El mercenario bocón: rojo con negro, parches en los ojos y katana', en: 'The merc with a mouth: red and black, eye patches and katana' },
    skin: '#b3121e', eyes: '#ffffff', lens: '#0d0d10', lpc: { head: 'male', ...mask, glasses: 'round' },
    body: { age: 'adulto', build: 'medio', shape: 'recto' },
    outfit: { sleeves: 'long', bottom: 'pants', socks: 'none', shoes: 'botas', gloves: true, pattern: 'banda', pattern2: '#141418', belt: '#3a2a1a', collar: 'redondo' },
    colors: { top: '#b3121e', bottom: '#b3121e', shoes: '#141418', accessory: '#141418' },
    mouth: 'line', gear: { main: 'sword', off: null }, cell: 48,
  },
  // gris con capa y capucha negras, orejas en punta, cinturón amarillo y el murciélago en el óvalo amarillo
  batman: {
    name: { es: 'Batman', en: 'Batman' }, idea: { es: 'El caballero de la noche: gris y negro, capa, orejas en punta y el murciélago', en: 'The dark knight: grey and black, cape, pointed ears and the bat' },
    skin: '#1e1f26', eyes: '#f4f6ff', lens: '#f4f6ff', lpc: { head: 'male', ...mask, ears: 'cat' },
    body: { age: 'adulto', build: 'robusto', shape: 'recto' },
    outfit: { sleeves: 'long', bottom: 'pants', socks: 'none', shoes: 'botas', gloves: true, belt: '#f2c230', cape: '#16171d', collar: 'redondo', emblem: 'bat', emblemColor: '#141418', emblemBg: '#f2c230' },
    colors: { top: '#7f828e', bottom: '#4a4d59', shoes: '#16171d', accessory: '#16171d' },
    mouth: 'line', cell: 48,
  },
  // gigante verde, pelo negro revuelto, short morado roto, descalzo
  hulk: {
    name: { es: 'Hulk', en: 'Hulk' }, idea: { es: 'El gigante verde: enorme, short morado y descalzo', en: 'The green giant: huge, purple shorts and barefoot' },
    skin: '#5d9b48', hair: '#121212', eyes: '#2a3a1e', lpc: { head: 'male', hair: 'messy1', brows: 'thick', nose: 'big' },
    body: { age: 'adulto', build: 'robusto', shape: 'recto' },
    size: { height: 1.2, build: 1.38, shoulders: 1.25, arms: 1.08 },
    // el pecho marcado en un verde más oscuro (sin camisa)
    outfit: { sleeves: 'none', bottom: 'shorts', socks: 'none', shoes: 'descalzo', print: '#47803a' },
    colors: { bottom: '#5b2a86' },
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
