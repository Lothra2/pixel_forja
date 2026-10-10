import type { AnimDef, Pack } from './types';
import { BASIC, swim } from './basic';
import { FOOTBALL, kick } from './football';
import { SPORTS } from './sports';
import { ATHLETICS_NEW } from './athletics';
import { SWIM_NEW } from './swim';
import { NET_NEW } from './net';
import { RPG } from './rpg';
import { SKILLS, ENEMY } from './skills';
import { ANIMAL_ANIMS, type AnimalAnimDef } from './animal';

const PET_ONLY = new Set(['bite', 'bark', 'howl', 'pickup', 'hurt', 'die', 'dig']);
import { type Pose, keyed } from '../rig/pose';
import type { CustomAnim, Ficha } from '../sheet/ficha';
import { isHuman } from '../sheet/ficha';

export const HUMAN_ANIMS: AnimDef[] = [...BASIC, kick, ...FOOTBALL, ...SPORTS.filter((a) => a !== swim), ...ATHLETICS_NEW, ...NET_NEW, swim, ...SWIM_NEW, ...RPG, ...SKILLS, ...ENEMY];

const byName = new Map(HUMAN_ANIMS.map((a) => [a.name, a]));
const animalByName = new Map(ANIMAL_ANIMS.map((a) => [a.name, a]));

export function humanAnim(name: string): AnimDef | undefined {
  return byName.get(name);
}
export function animalAnim(name: string): AnimalAnimDef | undefined {
  return animalByName.get(name);
}

/** Una animación hecha en el editor: poses clave + cuadros intermedios. */
export function customToDef(c: CustomAnim): AnimDef {
  return {
    name: c.name,
    pack: 'custom',
    fps: c.fps,
    loop: c.loop,
    build: () => customFrames(c),
  };
}

export function customFrames(c: CustomAnim): Pose[] {
  const keys = c.keys as Pose[];
  if (keys.length <= 1) return keys.map((k) => structuredClone(k));
  const step = c.inBetweens + 1;
  const n = c.loop ? keys.length * step : (keys.length - 1) * step + 1;
  return keyed(n, keys.map((k, i) => [i * step, k, 'inout'] as [number, Pose, 'inout']), c.loop);
}

export interface AnimInfo {
  name: string;
  pack: Pack;
  fps: number;
  loop: boolean;
}

/** Todas las animaciones disponibles para una ficha (incluye las propias). */
export function animsFor(f: Ficha): AnimInfo[] {
  // las de mascota de RPG (morder, ladrar, aullar, recoger, golpe, caer) van en su propio paquete
  if (!isHuman(f)) return ANIMAL_ANIMS.map((a) => ({ name: a.name, pack: (PET_ONLY.has(a.name) ? 'pet' : 'animal') as Pack, fps: a.fps, loop: a.loop }));
  return [
    ...HUMAN_ANIMS.map((a) => ({ name: a.name, pack: a.pack, fps: a.fps, loop: a.loop })),
    ...(f.customAnims ?? []).map((c) => ({ name: c.name, pack: 'custom' as Pack, fps: c.fps, loop: c.loop })),
  ];
}
