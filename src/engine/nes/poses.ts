import type { NesPose } from './draw';

/**
 * Las poses del estilo Nekketsu. Mirando a la derecha: legs son los pies respecto a la cadera (largo de pierna 7) y arms las manos
 * respecto al hombro (largo de brazo 6). Las animaciones tienen los nombres que usan los juegos de la forja (fútbol y pelea).
 */
const L7 = 6;
export const RUN: NesPose[] = [
  { legs: [[4, L7 - 1], [-4, L7 - 1]], arms: [[-3, 5], [3, 4]] },
  { legs: [[1, L7], [-1, L7 - 2]], arms: [[0, 6], [0, 6]], bob: 1 },
  { legs: [[-4, L7 - 1], [4, L7 - 1]], arms: [[3, 4], [-3, 5]] },
  { legs: [[-1, L7 - 2], [1, L7]], arms: [[0, 6], [0, 6]], bob: 1 },
];
export const RUN_F: NesPose[] = [
  { legs: [[-2, L7], [2, L7 - 2]], arms: [[-2, 5], [2, 4]] },
  { legs: [[-2, L7], [2, L7]], arms: [[-2, 6], [2, 6]], bob: 1 },
  { legs: [[-2, L7 - 2], [2, L7]], arms: [[-2, 4], [2, 5]] },
  { legs: [[-2, L7], [2, L7]], arms: [[-2, 6], [2, 6]], bob: 1 },
];
export const IDLE: NesPose[] = [{ legs: [[2, L7], [-2, L7]] }, { legs: [[2, L7], [-2, L7]], arms: [[1, 5], [-1, 5]], bob: 1 }];
export const IDLE_F: NesPose[] = [{ legs: [[-2, L7], [2, L7]], arms: [[-1, 6], [1, 6]] }, { legs: [[-2, L7], [2, L7]], arms: [[-1, 5], [1, 5]], bob: 1 }];
export const SHOT: NesPose[] = [
  { legs: [[1, L7], [-5, 4]], arms: [[3, 2], [-3, 3]], lean: -1 },
  { legs: [[1, L7], [-6, 2]], arms: [[4, 1], [-4, 2]], lean: -1 },
  { legs: [[-1, L7], [7, 1]], arms: [[-3, 2], [3, 2]], lean: 1, face: 'grito' },
  { legs: [[-1, L7], [6, 4]], arms: [[-2, 3], [2, 3]], lean: 1 },
  { legs: [[0, L7], [3, L7]] },
];
export const PASS: NesPose[] = [{ legs: [[1, L7], [-4, 5]], arms: [[2, 3], [-2, 4]] }, { legs: [[-1, L7], [5, 5]], arms: [[-2, 4], [2, 4]] }, { legs: [[0, L7], [2, L7]] }];
export const HEADER: NesPose[] = [
  { bob: 3, legs: [[2, 5], [-3, 6]], arms: [[-3, 0], [3, 0]], hx: 1 },
  { bob: 5, legs: [[1, 4], [-4, 5]], arms: [[-4, -1], [4, -1]], hx: 3, hy: 1, face: 'grito' },
  { bob: 2, legs: [[1, L7], [-2, L7]] },
];
export const VOLLEY: NesPose[] = [
  { bob: 3, legs: [[-3, 6], [6, 1]], arms: [[-4, 0], [4, 1]], lean: -1 },
  { bob: 3, legs: [[-3, 6], [8, 0]], arms: [[-4, -1], [4, 0]], lean: -2, face: 'grito' },
  { bob: 1, legs: [[0, L7], [3, 6]] },
];
export const SLIDE: NesPose[] = [
  { legs: [[8, 1], [4, 2]], arms: [[-5, -1], [3, 2]], lean: -2, rot: -25, ty: 4 },
  { legs: [[9, 1], [5, 2]], arms: [[-5, 0], [3, 2]], lean: -2, rot: -32, ty: 5, face: 'grito' },
];
export const PUNCH: NesPose[] = [
  { legs: [[3, L7], [-3, L7]], arms: [[-2, 3], [2, 2]], lean: -1 },
  { legs: [[4, L7], [-4, L7]], arms: [[8, 0], [-3, 3]], lean: 2, hx: 1, face: 'grito' },
  { legs: [[3, L7], [-3, L7]], arms: [[5, 1], [-3, 3]], lean: 1 },
];
export const KICK_HIT: NesPose[] = [
  { legs: [[0, L7], [-4, 4]], arms: [[-3, 2], [3, 2]], lean: -1 },
  { legs: [[-2, L7], [9, -1]], arms: [[-4, 0], [2, 3]], lean: -2, hx: -1, face: 'grito' },
  { legs: [[-1, L7], [6, 4]], arms: [[-3, 2], [2, 3]] },
];
export const STAGGER: NesPose[] = [
  { legs: [[-2, L7], [2, L7]], arms: [[-4, -3], [4, -3]], lean: -2, hx: -2, face: 'dolor' },
  { legs: [[-3, L7], [1, L7]], arms: [[-5, -2], [3, -4]], lean: -3, hx: -3, face: 'dolor' },
];
const HURT: NesPose = { legs: [[-3, 6], [3, 5]], arms: [[-5, -3], [4, -4]], lean: -2, hx: -2, face: 'dolor' };
export const TUMBLE: NesPose[] = [
  { ...HURT, rot: 25 }, { ...HURT, rot: 70, ty: 3 }, { ...HURT, rot: 120, ty: 6 }, { ...HURT, rot: 165, ty: 8 }, { ...HURT, rot: 90, ty: 9, tx: -2, face: 'ko' },
];
export const LIE: NesPose[] = [{ legs: [[3, L7], [-3, L7]], arms: [[-4, 5], [4, 5]], rot: 90, ty: 9, tx: -2, face: 'ko' }];
export const GETUP: NesPose[] = [{ bob: -4, legs: [[4, 4], [-3, 4]], arms: [[-3, 3], [3, 4]], face: 'dolor' }, { bob: -1, legs: [[2, L7 - 1], [-2, L7 - 1]], arms: [[-2, 5], [2, 5]] }];
export const DIZZY: NesPose[] = [{ legs: [[-2, L7], [2, L7]], arms: [[-2, 5], [2, 5]], lean: -1, hx: -1, face: 'ko' }, { legs: [[-2, L7], [2, L7]], arms: [[-2, 5], [2, 5]], lean: 1, hx: 1, face: 'ko' }];
export const CELEB: NesPose[] = [{ arms: [[-3, -7], [3, -7]], legs: [[2, L7], [-2, L7]], face: 'feliz' }, { bob: 4, arms: [[-4, -8], [4, -8]], legs: [[2, 5], [-2, 5]], face: 'grito' }];
export const CELEB_F: NesPose[] = [{ arms: [[-4, -7], [4, -7]], legs: [[-2, L7], [2, L7]], face: 'feliz' }, { bob: 4, arms: [[-5, -8], [5, -8]], legs: [[-2, 5], [2, 5]], face: 'grito' }];
/** las manos en la cabeza, como el que acaba de fallar en Nintendo World Cup */
export const SAD: NesPose[] = [{ arms: [[2, -3], [-2, -3]], legs: [[2, L7], [-2, L7]], hy: 1, face: 'triste' }, { arms: [[2, -4], [-2, -4]], legs: [[2, L7], [-2, L7]], hy: 1, bob: 1, face: 'triste' }];
export const SAD_F: NesPose[] = [{ arms: [[3, -4], [-3, -4]], legs: [[-2, L7], [2, L7]], face: 'triste' }, { arms: [[3, -5], [-3, -5]], legs: [[-2, L7], [2, L7]], bob: 1, face: 'triste' }];
export const JUMP: NesPose[] = [{ bob: 2, legs: [[2, 6], [-2, 6]], arms: [[-3, -4], [3, -4]] }, { bob: 6, legs: [[2, 5], [-2, 5]], arms: [[-4, -5], [4, -5]] }];
export const THROW: NesPose[] = [{ arms: [[-2, -8], [2, -8]], legs: [[2, L7], [-3, L7]], lean: -1 }, { arms: [[5, -6], [4, -5]], legs: [[3, L7], [-3, L7]], lean: 1 }];
export const GK_READY: NesPose[] = [{ bob: -2, legs: [[-3, L7 - 1], [4, L7 - 1]], arms: [[-6, 1], [6, 1]] }, { bob: -1, legs: [[-3, L7 - 1], [4, L7 - 1]], arms: [[-6, 2], [6, 2]] }];
export const GK_DIVE: NesPose[] = [
  { bob: 2, legs: [[-4, 5], [-2, 6]], arms: [[5, -6], [7, -4]], lean: 1, rot: -35, ty: -2, face: 'grito' },
  { legs: [[-6, 4], [-4, 5]], arms: [[8, -2], [9, 0]], lean: 2, rot: -80, ty: 7, face: 'grito' },
];
export const GK_CATCH: NesPose[] = [{ arms: [[4, 1], [4, 2]], legs: [[1, L7], [-2, L7]] }];
export const GK_THROW: NesPose[] = [{ arms: [[-3, -8], [-2, -8]], legs: [[2, L7], [-3, L7]], lean: -1 }, { arms: [[6, -4], [5, -3]], legs: [[3, L7], [-3, L7]], lean: 1 }];
export const CHILENA: NesPose[] = [60, 140, 200].map((r, i) => ({ ...HURT, legs: [[2, 3], [8, -6]] as [number, number][], rot: r, ty: [-2, -4, -2][i], face: 'grito' as const }));

/** nombre de la animación: cuadros por segundo, si se repite, y las poses de lado, de frente y de espalda (sin frente ni espalda se usa la de lado) */
export const NES_ANIMS: Record<string, { fps: number; loop: boolean; side: NesPose[]; front?: NesPose[]; back?: NesPose[]; keeper?: boolean }> = {
  idle: { fps: 5, loop: true, side: IDLE, front: IDLE_F, back: IDLE_F },
  run: { fps: 12, loop: true, side: RUN, front: RUN_F, back: RUN_F },
  run_ball: { fps: 12, loop: true, side: RUN, front: RUN_F, back: RUN_F },
  shot: { fps: 16, loop: false, side: SHOT },
  pass: { fps: 14, loop: false, side: PASS },
  chip: { fps: 14, loop: false, side: SHOT },
  header: { fps: 10, loop: false, side: HEADER },
  volley: { fps: 12, loop: false, side: VOLLEY },
  chilena: { fps: 10, loop: false, side: CHILENA },
  slide: { fps: 10, loop: false, side: SLIDE },
  tackle: { fps: 14, loop: false, side: PUNCH },
  punch: { fps: 14, loop: false, side: PUNCH },
  kick_hit: { fps: 14, loop: false, side: KICK_HIT },
  stagger: { fps: 10, loop: false, side: STAGGER },
  tumble: { fps: 12, loop: false, side: TUMBLE },
  lie: { fps: 2, loop: true, side: LIE },
  fall_getup: { fps: 8, loop: false, side: GETUP },
  dizzy: { fps: 6, loop: true, side: DIZZY },
  celebrate: { fps: 8, loop: true, side: CELEB, front: CELEB_F, back: CELEB_F },
  dance: { fps: 8, loop: true, side: CELEB, front: CELEB_F, back: CELEB_F },
  sad: { fps: 4, loop: true, side: SAD, front: SAD_F, back: SAD_F },
  jump: { fps: 10, loop: false, side: JUMP },
  throw_in: { fps: 8, loop: false, side: THROW },
  keeper_ready: { fps: 6, loop: true, side: GK_READY, front: GK_READY, back: GK_READY, keeper: true },
  keeper_dive: { fps: 10, loop: false, side: GK_DIVE, keeper: true },
  keeper_catch: { fps: 6, loop: false, side: GK_CATCH, keeper: true },
  keeper_throw: { fps: 10, loop: false, side: GK_THROW, keeper: true },
  keeper_punt: { fps: 12, loop: false, side: SHOT, keeper: true },
};
