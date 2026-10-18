import type { HumanFicha } from '../sheet/ficha';
import { fichaFromAvatar } from '../sheet/build';
import { recolor, type ColorSlot } from '../sheet/recolor';
import { defaultAvatar } from '../head3d/avatar';
import { DEFAULT_LPC } from '../parts/lpc';
import { bodyProportions, DEFAULT_BODY, type BodyType } from '../rig/dims';

/**
 * Personajes que no pelean (PNJ): el mercader de las fogatas. Personas inventadas, solo medidas y colores.
 * Van con las mismas 8 direcciones que la heroína para que la miren cuando se acerca.
 */

export type NpcId = 'mercader';
export const NPCS: NpcId[] = ['mercader'];

/** Lo que anima un PNJ: quieto, y un gesto de "pasa adelante" cuando la heroína llega */
export const NPC_ANIMS: Record<NpcId, string[]> = { mercader: ['idle', 'cast'] };

export const NPC_NOMBRES: Record<NpcId, string> = { mercader: 'Don Cachivache' };

/**
 * Don Cachivache, el buhonero del abismo: panzón, bigote blanco de morsa, lentes redondos, sombrero de ala ancha
 * morado, túnica de cuero con ribete dorado, capa verde y su libro de cuentas en la mano.
 */
export function merchantFicha(): HumanFicha {
  const b = defaultAvatar();
  const body: BodyType = { ...DEFAULT_BODY, age: 'mayor', build: 'robusto' };
  const av = {
    ...b, skin: '#d9a07a', kit: 'lpc' as const, body,
    hair: { ...b.hair, color: '#ece8e0' }, eyes: { ...b.eyes, color: '#3a2418' },
    beard: { ...b.beard, color: '#f4f0e8' }, glasses: { ...b.glasses, color: '#c8a040' },
    lpc: { ...DEFAULT_LPC, head: 'male_plump', hair: 'balding', brows: 'thick', nose: 'big', beard: null, mustache: 'walrus', glasses: 'round', hat: 'cavalier', hatColor: '#6a2a8a' },
  };
  let f = fichaFromAvatar(NPC_NOMBRES.mercader, av, { sleeves: 'long', bottom: 'pants', socks: 'low', shoes: 'botas' }) as HumanFicha;
  f = { ...f, body: { ...f.body, proportions: { ...bodyProportions(f.body.proportions.preset, body), height: 0.94 } } };
  const colors: Partial<Record<ColorSlot, string>> = { top: '#c8a060', bottom: '#4a3a2a', shoes: '#5a3a22', socks: '#e8e0d0' };
  for (const [s, h] of Object.entries(colors)) f = recolor(f, s as ColorSlot, h) as HumanFicha;
  return {
    ...f,
    face: { ...f.face, mouth: 'smile' },
    outfit: { ...f.outfit, armor: 'tunica', armorColor: '#8a5a32', trim: '#e2b74a', cape: '#2f6a4a', belt: '#3a2414', pauldrons: false },
    gear: { main: null, off: 'tome' },
  };
}
