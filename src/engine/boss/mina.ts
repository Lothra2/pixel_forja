import { type V3, add, sub, mul, norm, cross, mv, mm, rotX } from './sdf';
import { Body, along, lookRot, loc } from './build';
import { bipedDims, solveBiped, type BossPose, type BossDims } from './rig';
import { makeBossRamp, type BossScene, type BossMaterial } from './render';
import type { Secondary } from './secondary';
import { weaponHead, type BossSpec } from './sheet';
import { MINO_ANIMS } from './minotauroAnims';
import type { Raster } from '../core/raster';

/**
 * Los enemigos de a pie del Mundo 3, con el motor de volúmenes y las poses del minotauro (mismo esqueleto bípedo):
 *
 * - `minero_piedra` (celda 64): gólem chico de roca, con casco de minero y un cristal cian en el pecho. Lento y pega
 *   fuerte con un pico. Su golpe fuerte avisa 4 cuadros.
 * - `sombra` (celda 48): una silueta encapuchada, casi negra, con un contorno violeta de 1 pixel para que se lea
 *   dentro de la luz (el juego la muestra solo ahí). Pega con zarpazos. Al morir se deshace.
 */

const ROCK_DIMS = { hipH: 34, hipW: 12, legU: 17, legL: 15, foot: 10, spine: 26, shW: 22, armU: 19, armL: 19, hand: 8, neck: 3, head: 10, weaponLen: 22, weaponR: 6 };
const SHADOW_DIMS = { hipH: 44, hipW: 8, legU: 22, legL: 21, foot: 8, spine: 30, shW: 15, armU: 20, armL: 20, hand: 6, neck: 5, head: 10 };
const rockDims = (cell: number): BossDims => bipedDims(cell * 0.98, ROCK_DIMS);
const shadowDims = (cell: number): BossDims => bipedDims(cell * 0.92, SHADOW_DIMS);

function rockMaterials(): Record<string, BossMaterial> {
  return {
    rock: { ramp: makeBossRamp('#4a586c', 7, { spread: 1.2 }), surface: 'stone', tex: 0.9, scale: 1.4, patch: { mat: 'moss', amount: 0.12, scale: 3, below: 0.4 } },
    moss: { ramp: makeBossRamp('#3a4a40', 5), surface: 'stone', tex: 0.7, scale: 2 },
    helmet: { ramp: makeBossRamp('#b08a38', 6, { spread: 1.2 }), surface: 'metal', tex: 0.5, scale: 1.6 },
    iron: { ramp: makeBossRamp('#4a4e58', 6, { spread: 1.2 }), surface: 'metal', tex: 0.6, scale: 1.4 },
    wood: { ramp: makeBossRamp('#5e4630', 6), surface: 'wood', tex: 0.9, scale: 1.3 },
    crystal: { ramp: ['#1a5a6a', '#5ae8ff', '#e0faff'], surface: 'glow' },
    lamp: { ramp: ['#7a4a1a', '#ffb35a', '#fff0c0'], surface: 'glow' },
    eyes: { ramp: ['#1a5a6a', '#5ae8ff', '#e0faff'], surface: 'glow' },
    dark: { ramp: ['#08090c', '#12141a'], surface: 'eye' },
  };
}

/** El minero de piedra para una pose. */
function rockScene(cell: number, pose: BossPose, _sec?: Secondary): BossScene {
  const d = rockDims(cell), s = d.s, j = solveBiped(d, pose), B = new Body();
  const S = (v: V3): V3 => mul(v, s);
  const body = j.body, ch = j.chest, hm = j.headM;
  // cadera y torso: piedras grandes unidas
  B.ell(loc(body, j.pelvis, S([0, 2, 0])), S([11, 8, 13]), 'rock', 1, { rot: body, bump: 1.2 * s });
  B.ell(loc(ch, j.pelvis, S([0, 18, 0])), S([14, 15, 18]), 'rock', 1, { rot: ch, bump: 1.4 * s });
  B.ell(loc(ch, j.pelvis, S([-3, 28, 0])), S([12, 8, 21]), 'rock', 1, { rot: ch, bump: 1.2 * s });
  // el cristal del pecho: incrustado, con puntas que asoman
  const cc = loc(ch, j.pelvis, S([12, 19, 0]));
  B.ell(cc, S([3.5, 6, 4]), 'crystal', 3, { rot: mm(ch, rotX(10)) });
  B.cone(cc, loc(ch, j.pelvis, S([16, 27, 3])), 2.6 * s, 0.6 * s, 'crystal', 3);
  B.cone(cc, loc(ch, j.pelvis, S([15, 14, -4])), 2 * s, 0.5 * s, 'crystal', 3);
  // cabeza chica hundida entre los hombros, con casco de minero y su lámpara
  const H = (v: V3): V3 => loc(hm, j.headC, S(v));
  B.ell(H([0, -1, 0]), S([8.5, 7.5, 8.5]), 'rock', 20, { rot: hm, bump: 0.8 * s });
  B.ell(H([1, 3.5, 0]), S([9.5, 5.5, 9.5]), 'helmet', 21, { rot: hm });
  B.torus(H([1, 1.5, 0]), 9.6 * s, 1.4 * s, 'helmet', 21, mm(hm, rotX(90)));
  B.cone(H([8, 4, 0]), H([10.5, 4.2, 0]), 2.6 * s, 2.8 * s, 'iron', 22);
  B.ell(H([11, 4.2, 0]), S([0.9, 2.2, 2.2]), 'lamp', 23, { rot: hm });
  const eyes = pose.face?.eyes ?? 'open';
  for (const z of [-3, 3]) B.ell(H([7.6, -1.5, z]), S([0.8, eyes === 'closed' || eyes === 'happy' ? 0.5 : 1.3, 1.3]), eyes === 'dizzy' ? 'dark' : 'eyes', 24, { rot: hm });
  // brazos: piedras en cadena y manos grandes
  const arm = (side: 'near' | 'far', g: number) => {
    const sh = j.shoulders[side], el = j.elbows[side], hd = j.hands[side];
    B.ell(add(sh, S([0, 2, 0])), S([9, 8, 9]), 'rock', g, { rot: ch, bump: 1 * s });
    B.cone(sh, el, 6.5 * s, 6 * s, 'rock', g, { bump: 0.8 * s });
    B.cone(el, hd, 6 * s, 7 * s, 'rock', g, { bump: 0.8 * s });
    B.ell(hd, S([7, 6.5, 6.5]), 'rock', g + 1, { rot: lookRot(norm(sub(hd, el))), bump: 0.8 * s });
  };
  arm('far', 30); arm('near', 34);
  const leg = (side: 'near' | 'far', g: number) => {
    const hp = j.hips[side], kn = j.knees[side], an = j.ankles[side], to = j.toes[side];
    B.cone(hp, kn, 8 * s, 7 * s, 'rock', g, { bump: 0.8 * s });
    B.cone(kn, an, 7 * s, 7.5 * s, 'rock', g, { bump: 0.8 * s });
    B.box(add(along(an, to, 0.4), S([0, -1.5, 0])), S([8, 3.8, 7]), 'rock', g + 1, { rot: lookRot(norm(sub(to, an))), round: 2 * s });
  };
  leg('far', 40); leg('near', 44);
  // el pico de minero en la mano cercana
  if (j.weapon) {
    const { grip, dir } = j.weapon;
    const strike = norm(cross(dir, mv(body, [0, 0, 1])));
    const top = add(grip, mul(dir, 22 * s));
    B.cone(add(grip, mul(dir, -6 * s)), add(top, mul(dir, 1 * s)), 1.8 * s, 1.6 * s, 'wood', 60);
    B.cone(add(top, mul(strike, -11 * s)), add(top, mul(strike, 1 * s)), 0.8 * s, 2.6 * s, 'iron', 62);
    B.cone(add(top, mul(strike, 1 * s)), add(top, mul(strike, 9 * s)), 2.6 * s, 1 * s, 'iron', 62);
  }
  return { pieces: B.pieces, materials: rockMaterials(), smooth: { 1: 3 * s, 20: 1.5 * s } };
}

function shadowMaterials(): Record<string, BossMaterial> {
  return {
    cloak: { ramp: ['#060509', '#0c0a12', '#14111c', '#1c1828', '#262036'], surface: 'cloth', tex: 0.4, scale: 1.6 },
    eyes: { ramp: ['#5a2a8a', '#b07aff', '#f0dcff'], surface: 'glow' },
    dark: { ramp: ['#020203', '#060508'], surface: 'eye' },
  };
}

/** La sombra para una pose: capucha, manto que se abre abajo, brazos largos con garras. */
function shadowScene(cell: number, pose: BossPose, _sec?: Secondary): BossScene {
  const d = shadowDims(cell), s = d.s, j = solveBiped(d, pose), B = new Body();
  const S = (v: V3): V3 => mul(v, s);
  const ch = j.chest, hm = j.headM, body = j.body;
  // manto: un cono que cubre las piernas y se abre hasta el piso
  const hipC = loc(body, j.pelvis, S([0, 4, 0]));
  const footMid = mul(add(j.ankles.near, j.ankles.far), 0.5);
  B.cone(loc(ch, j.pelvis, S([0, 26, 0])), hipC, 11 * s, 12 * s, 'cloak', 1);
  B.cone(hipC, [footMid[0], 3 * s, footMid[2]], 12 * s, 16 * s, 'cloak', 1);
  // capucha con el hueco oscuro donde brillan los ojos
  const H = (v: V3): V3 => loc(hm, j.headC, S(v));
  B.ell(H([0, 1, 0]), S([10, 11, 10]), 'cloak', 2, { rot: hm });
  B.cone(H([-2, 9, 0]), H([-9, 14, 0]), 4 * s, 1 * s, 'cloak', 2);
  B.ell(H([5.5, -0.5, 0]), S([4.5, 6.5, 6.5]), 'dark', 3, { rot: hm });
  const eyes = pose.face?.eyes ?? 'open';
  if (eyes !== 'dizzy') for (const z of [-2.6, 2.6]) B.ell(H([9.5, 0, z]), S([0.7, eyes === 'closed' ? 0.5 : 1.6, 1.5]), 'eyes', 4, { rot: hm });
  // brazos largos y garras
  for (const side of ['far', 'near'] as const) {
    const sh = j.shoulders[side], el = j.elbows[side], hd = j.hands[side];
    B.cone(sh, el, 4.5 * s, 3.5 * s, 'cloak', side === 'near' ? 31 : 30);
    B.cone(el, hd, 3.5 * s, 2.2 * s, 'cloak', side === 'near' ? 31 : 30);
    const fd = norm(sub(hd, el));
    for (const k of [-1, 0, 1]) B.cone(hd, add(hd, add(mul(fd, 7 * s), mul(norm(cross(fd, [0, 1, 0])), k * 2.5 * s))), 1.1 * s, 0.3 * s, 'cloak', 32);
  }
  return { pieces: B.pieces, materials: shadowMaterials(), smooth: { 1: 4 * s, 2: 2 * s } };
}

const pick = (names: string[]) => MINO_ANIMS.filter((a) => names.includes(a.name));
/** Sin arma: los brazos de las poses del minotauro dan zarpazos */
const unarmed = (names: string[]) => pick(names).map((a) => ({ ...a, keys: a.keys.map((k) => ({ ...k, pose: { ...k.pose, weapon: undefined } })) }));

export const MINERO_PIEDRA_SPEC: BossSpec = {
  id: 'minero_piedra', cell: 64, dims: rockDims, scene: rockScene, anims: pick(['idle', 'walk', 'attack', 'hit', 'die', 'attack_heavy']), strikePoint: weaponHead(22), elev: 24,
};

/**
 * El contorno violeta de 1 pixel solo por fuera de la silueta (adentro las piezas se separan con su tono oscuro), y al
 * morir se deshace: los últimos cuadros se van volviendo transparentes, de abajo hacia arriba.
 */
function shadowPost(r: Raster, anim: string, f: number, n: number) {
  const W = r.w, H = r.h, a0 = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) a0[i] = r.data[i * 4 + 3];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!a0[i]) continue;
    const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1 || !a0[i - 1] || !a0[i + 1] || !a0[i - W] || !a0[i + W];
    if (edge) { r.data[i * 4] = 0x8a; r.data[i * 4 + 1] = 0x4a; r.data[i * 4 + 2] = 0xc8; r.data[i * 4 + 3] = 255; }
  }
  if (anim !== 'die') return;
  const k = Math.max(0, (f - n * 0.45) / (n * 0.55));
  if (k <= 0) return;
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    const i = (y * r.w + x) * 4;
    if (!r.data[i + 3]) continue;
    const fromBottom = 1 - y / r.h, h = ((x * 7919 + y * 104729) % 97) / 97;
    if (h < k * 1.3 - fromBottom * 0.3) r.data[i + 3] = 0;
    else r.data[i + 3] = Math.round(r.data[i + 3] * (1 - k * 0.5));
  }
}

export const SOMBRA_SPEC: BossSpec = {
  id: 'sombra', cell: 48, dims: shadowDims, scene: shadowScene, anims: unarmed(['idle', 'walk', 'attack', 'hit', 'die']), elev: 24, post: shadowPost,
};
