import { type V3, add, mul, mv, mm, rotX, rotY, rotZ } from './sdf';
import { Body, loc } from './build';
import { bipedDims, solveBiped, type BossPose, type BossDims } from './rig';
import { makeBossRamp, type BossScene } from './render';
import type { Secondary } from './secondary';
import type { BossSpec } from './sheet';
import { type BossAnimDef, over } from './anim';
import type { Raster } from '../core/raster';
import { kk, cyc, put, hash, gait, lowest, eyeHalo, isRed, isCold, iceRim, crumble, fadeBottom, LOBO_SPEC, ESPECTRO_SPEC, DIABLILLO_SPEC, CABALLERO_SPEC, BRUJA_SPEC, SOMBRA_DEVORADORA_SPEC } from './corazon';

/**
 * Los dos minijefes del Mundo 7 (celda 64, `elite`), con el motor de volúmenes.
 *
 * - `reina_escarcha` (vuela): una reina de hielo alta y flaca, con la corona de estalactitas, el pelo blanco largo, la
 *   cara pálida y fría con los ojos celestes que brillan, y un vestido que se pierde abajo en carámbanos. Lanzas de
 *   hielo, la ventisca y se divide en tres reflejos (solo la real tiene sombra: eso lo hace el juego).
 * - `guardian_puerta`: un demonio caballero enorme de armadura negra con las juntas al rojo, el yelmo con dos cuernos
 *   grandes, colmillos y ojos que queman por la visera, y una espada de fuego negro. Golpe en cruz, golpe pesado y
 *   carga.
 */

// ---------------------------------------------------------------- la Reina Escarcha

const QUEEN = { hipH: 34, hipW: 6, legU: 16, legL: 16, foot: 5, spine: 28, shW: 11, armU: 17, armL: 17, hand: 4, neck: 6, head: 9 };
const queenDims = (cell: number): BossDims => bipedDims(cell * 0.95, QUEEN);
function reinaScene(cell: number, pose: BossPose, sec?: Secondary): BossScene {
  const d = queenDims(cell), s = d.s, j = solveBiped(d, pose), B = new Body();
  const S = (v: V3): V3 => mul(v, s);
  const ex = pose.extra ?? {}, ch = j.chest, hm = j.headM, body = j.body;
  const flap = (sec?.flap ?? 0) * 3, sw = ex.swirl ?? 0;
  // el vestido: el corpiño ajustado y la falda larga que se abre y termina en carámbanos
  B.ell(loc(ch, j.pelvis, S([0, 17, 0])), S([7, 12, 8]), 'gown', 1, { rot: ch, bump: 0.2 * s });
  B.ell(loc(ch, j.pelvis, S([4, 18, 0])), S([3, 9, 6]), 'gownHi', 2, { rot: ch });
  const hem = loc(body, j.pelvis, S([-2 - flap, -30, 0]));
  B.cone(loc(body, j.pelvis, S([0, 6, 0])), hem, 8 * s, 17 * s, 'gown', 1);
  for (let q = 0; q < 9; q++) {
    const a = (q / 9) * Math.PI * 2 + sw * 0.8, r = 16 + (q % 2) * 2;
    const top = add(hem, S([Math.cos(a) * r, 2, Math.sin(a) * r]));
    B.cone(top, add(top, S([Math.cos(a) * 2, -9 - (q % 3) * 3, Math.sin(a) * 2])), 2.4 * s, 0.3 * s, 'ice', 3);
  }
  // el cuello alto de escarcha (como abanico detrás de la cabeza)
  for (let q = 0; q < 7; q++) { const a = ((q - 3) / 3) * 1.4; B.cone(loc(ch, j.pelvis, S([-3, 27, Math.sin(a) * 6])), loc(ch, j.pelvis, S([-7 - Math.cos(a) * 2, 38 + Math.cos(a) * 4, Math.sin(a) * 13])), 1.6 * s, 0.3 * s, 'ice', 4); }
  // los brazos largos con mangas que caen, y las manos finas
  for (const side of ['far', 'near'] as const) {
    const g = side === 'near' ? 34 : 30;
    B.cone(j.shoulders[side], j.elbows[side], 3.4 * s, 3 * s, 'gown', g);
    B.cone(j.elbows[side], j.hands[side], 2.8 * s, 1.8 * s, 'skin', g + 1);
    B.ell(add(j.elbows[side], S([0, -4, 0])), S([3, 6, 3]), 'gownHi', g + 2);
    B.ell(j.hands[side], S([2.4, 2.6, 2]), 'skin', g + 3);
    for (let q = 0; q < 3; q++) { const dir = mul(add(j.hands[side], mul(j.elbows[side], -1)), 0.25); B.cone(j.hands[side], add(j.hands[side], add(dir, mv(ch, S([0, (q - 1) * 1.4, (q - 1)])))), 0.6 * s, 0.2 * s, 'ice', g + 3); }
  }
  // la lanza de hielo que levanta (cast) en la mano de cerca
  const lance = ex.lance ?? 0;
  if (lance > 0.05) { const h = j.hands.near; B.cone(add(h, S([0, -6 * lance, 0])), add(h, S([0, 17 * lance, 0])), 2 * s, 0.4 * s, 'lance', 50); }
  // la cabeza: cara fina y fría, la boca apretada, los ojos celestes que brillan, el pelo blanco largo
  const H = (v: V3): V3 => loc(hm, j.headC, S(v));
  B.ell(H([0.6, -0.4, 0]), S([6.6, 8, 6.2]), 'skin', 10, { rot: hm });
  B.ell(H([5.4, -6, 0]), S([2.6, 2, 3]), 'skin', 10, { rot: hm });
  B.ell(H([6.4, -0.6, 0]), S([1, 1.6, 0.8]), 'skin', 11, { rot: hm });
  const mouth = pose.face?.mouth ?? 0;
  B.ell(H([6.6, -4, 0]), S([0.6, 0.4 + mouth * 2.4, 2.2 + mouth * 0.6]), 'lip', 12, { rot: hm });
  for (const z of [-2.6, 2.6]) {
    B.ell(H([6.4, 1.4, z]), S([1, 1.1, 1.6]), 'eye', 13, { rot: mm(hm, rotX(z > 0 ? 14 : -14)) });
    B.ell(H([6.2, 2.8, z * 1.1]), S([1.2, 0.4, 2]), 'brow', 14, { rot: mm(hm, rotX(z > 0 ? 24 : -24)) });
  }
  for (let q = 0; q < 6; q++) { const z = (q - 2.5) * 2.2; B.chain([H([-1, 5, z]), H([-7, -4, z * 1.4]), H([-9 - flap, -20, z * 1.6]), H([-8 - flap * 1.4, -34, z * 1.6])], [2.4, 2.2, 1.6, 0.5].map((v) => v * s), 'hair', 15); }
  // la corona de estalactitas, altas y filosas, con una gema roja helada en el medio
  for (let q = 0; q < 7; q++) {
    const a = ((q - 3) / 3) * 1.2, h = 9 + (3 - Math.abs(q - 3)) * 3;
    B.cone(H([0.6 + Math.cos(a) * 3, 7.6, Math.sin(a) * 6]), H([0.2 + Math.cos(a) * 3.6, 7.6 + h, Math.sin(a) * 7.4]), 1.5 * s, 0.2 * s, 'crown', 16);
  }
  B.torus(H([0.4, 7.4, 0]), 6.4 * s, 1 * s, 'crown', 17, mm(hm, rotX(90)));
  B.ell(H([6.6, 8.6, 0]), S([1, 1.4, 1]), 'gem', 18, { rot: hm });
  // la ventisca a su alrededor (warcry): motas que giran
  const storm = ex.storm ?? 0;
  if (storm > 0.05) for (let q = 0; q < 10; q++) { const a = (q / 10) * Math.PI * 2 + sw * 2; B.ell(loc(body, j.pelvis, S([Math.cos(a) * 26, 10 + (q % 3) * 10, Math.sin(a) * 26])), S([2.4 * storm, 1.4, 1.6]), 'snow', 60 + (q % 2)); }
  return {
    pieces: B.pieces, smooth: { 1: 3 * s, 10: 1.5 * s },
    materials: {
      gown: { ramp: makeBossRamp('#3a5a8a', 6, { spread: 1.3, hue: 12 }), surface: 'cloth', tex: 0.4, scale: 1.6, patch: { mat: 'frost', amount: 0.18, scale: 1.4 } },
      gownHi: { ramp: makeBossRamp('#8ab0d8', 6, { spread: 1.2 }), surface: 'cloth', tex: 0.3 },
      frost: { ramp: ['#9ab8d8', '#d0e4f6', '#ffffff'], surface: 'stone', tex: 0.3 },
      skin: { ramp: makeBossRamp('#b8c8dc', 5, { spread: 1.1 }), surface: 'skin', tex: 0.1 },
      lip: { ramp: ['#1a2a4a', '#2a3e66'], surface: 'skin', tex: 0.1 },
      brow: { ramp: ['#6a8aac', '#9ab8d8'], surface: 'skin', tex: 0.1 },
      hair: { ramp: ['#9ab8d8', '#c8dcee', '#e8f4ff', '#ffffff'], surface: 'fur', tex: 0.6, scale: 1.2 },
      ice: { ramp: ['#6a8aac', '#9ab8d8', '#d0e4f6', '#ffffff'], surface: 'horn', tex: 0.2 },
      crown: { ramp: ['#9ab8d8', '#c8e4ff', '#e8f8ff', '#ffffff'], surface: 'metal', tex: 0.2 },
      gem: { ramp: ['#c01a10', '#ff2a1a', '#ff8a6a'], surface: 'glow' },
      eye: { ramp: ['#8ae0ff', '#d8f8ff', '#ffffff'], surface: 'glow' },
      lance: { ramp: ['#8ae0ff', '#d8f8ff', '#ffffff'], surface: 'glow' },
      snow: { ramp: ['#d0e4f6', '#ffffff'], surface: 'glow' },
    },
  };
}

const QFLOAT: BossPose = {
  root: { y: 0, lean: 2 }, spine: { bend: -2 }, head: { pitch: 4 },
  arms: { near: { pitch: 24, spread: 26, elbow: 30 }, far: { pitch: 22, spread: 26, elbow: 34 } },
  legs: { near: { x: 2, y: 8, z: 1 }, far: { x: -2, y: 8, z: 1 } },
  air: 10, extra: { lance: 0, storm: 0, swirl: 0 },
};

function reinaAnims(): BossAnimDef[] {
  const idle: BossAnimDef = { name: 'idle', fps: 6, loop: true, frames: 8, keys: Array.from({ length: 8 }, (_, f) => kk(f, over(QFLOAT, { air: 10 + cyc(8, f) * 2, head: { yaw: cyc(8, f) * 6 }, arms: { near: { pitch: 24 + cyc(8, f, 1) * 5 }, far: { pitch: 22 - cyc(8, f, 1) * 5 } }, extra: { swirl: f / 8 } }))) };
  const walk: BossAnimDef = { name: 'walk', fps: 8, loop: true, frames: 8, stride: 26, keys: Array.from({ length: 8 }, (_, f) => kk(f, over(QFLOAT, { root: { lean: 12 }, air: 10 + cyc(8, f) * 2, arms: { near: { pitch: 10, spread: 34 }, far: { pitch: 10, spread: 34 } }, extra: { swirl: f / 8 } }))) };
  // el tajo de hielo: la mano atrás (4 de aviso) y un manotazo con las uñas de hielo
  const UP = over(QFLOAT, { spine: { twist: -26 }, arms: { near: { pitch: 120, spread: 30, elbow: 40 } }, head: { pitch: -4 }, face: { mouth: 0.4 } });
  const DN = over(QFLOAT, { root: { lean: 14, x: 4 }, spine: { twist: 24 }, arms: { near: { pitch: 70, spread: -10, elbow: 4 } }, face: { mouth: 0.6 } });
  const attack: BossAnimDef = { name: 'attack', fps: 10, loop: false, frames: 10, windup: [1, 4], shake: 0.5, keys: [kk(0, QFLOAT), kk(1, UP, 'out'), kk(4, over(UP, { spine: { twist: -30 } })), kk(5, DN, 'in'), kk(6, DN), kk(9, QFLOAT, 'ease')], events: [{ type: 'impacto', frame: 5 }] };
  // las lanzas de hielo: sube la mano con la lanza que crece (6 de aviso) y la señala hacia abajo (caen del cielo)
  const CAST = (t: number) => over(QFLOAT, { root: { lean: -6 }, air: 12, head: { pitch: -14 }, arms: { near: { pitch: 160, spread: 20, elbow: 10 }, far: { pitch: 60, spread: 40, elbow: 30 } }, face: { mouth: t * 0.5 }, extra: { lance: 0.3 + t * 0.7 } });
  const POINT = over(QFLOAT, { root: { lean: 10 }, air: 10, arms: { near: { pitch: 60, spread: 0, elbow: 0 }, far: { pitch: 30, spread: 30, elbow: 30 } }, face: { mouth: 0.8 }, extra: { lance: 0 } });
  const cast: BossAnimDef = { name: 'cast', fps: 10, loop: false, frames: 12, windup: [1, 6], shake: 0.4, keys: [kk(0, QFLOAT), ...[1, 2, 3, 4, 5, 6].map((f) => kk(f, CAST(f / 6), f === 1 ? 'out' : 'linear')), kk(7, POINT, 'in'), kk(8, POINT), kk(11, QFLOAT, 'ease')], events: [{ type: 'impacto', frame: 7 }] };
  // la ventisca: abre los brazos y echa la cabeza atrás, la nieve gira a su alrededor
  const WIDE = (f: number) => over(QFLOAT, { root: { lean: -10 }, air: 14, head: { pitch: -26 }, arms: { near: { pitch: 100, spread: 70, elbow: 10 }, far: { pitch: 100, spread: 70, elbow: 10 } }, face: { mouth: 0.9 }, extra: { storm: 1, swirl: f / 4 } });
  const warcry: BossAnimDef = { name: 'warcry', fps: 8, loop: false, frames: 12, windup: [1, 3], keys: [kk(0, QFLOAT), kk(3, WIDE(3), 'out'), ...[4, 5, 6, 7, 8, 9].map((f) => kk(f, WIDE(f))), kk(11, QFLOAT, 'ease')], events: [{ type: 'grito', frame: 3 }] };
  // se divide: gira sobre sí misma cada vez más rápido y se abre en tres (los reflejos los pone el retoque)
  const dividirse: BossAnimDef = { name: 'dividirse', fps: 12, loop: false, frames: 12, keys: Array.from({ length: 12 }, (_, f) => kk(f, over(QFLOAT, { root: { yaw: f * f * 6 }, air: 12, arms: { near: { pitch: 80, spread: 60 }, far: { pitch: 80, spread: 60 } }, extra: { swirl: f / 3, storm: f > 6 ? 0.6 : 0, split: f / 11 } }))), events: [{ type: 'suelta', frame: 10 }] };
  const hit: BossAnimDef = { name: 'hit', fps: 12, loop: false, frames: 4, keys: [kk(0, QFLOAT), kk(1, over(QFLOAT, { root: { lean: -14, x: -4 }, head: { pitch: -14 }, face: { mouth: 0.8 } }), 'out'), kk(3, QFLOAT, 'ease')] };
  // se rompe en mil cristales
  const die: BossAnimDef = { name: 'die', fps: 10, loop: false, frames: 14, keys: [kk(0, QFLOAT), kk(3, over(QFLOAT, { root: { lean: -16 }, head: { pitch: -30 }, arms: { near: { pitch: 140, spread: 50 }, far: { pitch: 140, spread: 50 } }, face: { mouth: 1 } }), 'out'), kk(13, over(QFLOAT, { root: { lean: -16 }, air: 6, head: { pitch: -30 }, arms: { near: { pitch: 150, spread: 60 }, far: { pitch: 150, spread: 60 } }, face: { mouth: 1 } }))] };
  return [idle, walk, attack, cast, warcry, dividirse, hit, die];
}

function reinaPost(r: Raster, anim: string, f: number, n: number) {
  fadeBottom(r, 10, 301, f);
  iceRim(r, 0.35, 0.12);
  eyeHalo(r, isCold, '#8ae0ff', 160);
  eyeHalo(r, isRed, '#ff2a1a', 120);
  // dividirse: dos reflejos translúcidos que se separan a los lados
  if (anim === 'dividirse' && f >= 4) {
    const k = (f - 4) / (n - 5), dx = Math.round(k * 18), src = Uint8ClampedArray.from(r.data), W = r.w;
    for (const sx of [-1, 1]) for (let y = 0; y < r.h; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (!src[i + 3]) continue;
      const X = x + sx * dx;
      if (X < 0 || X >= W) continue;
      const j = (y * W + X) * 4;
      if (r.data[j + 3] > 200) continue;
      r.data[j] = Math.round(src[i] * 0.6 + 140 * 0.4); r.data[j + 1] = Math.round(src[i + 1] * 0.6 + 200 * 0.4); r.data[j + 2] = Math.round(src[i + 2] * 0.6 + 255 * 0.4);
      r.data[j + 3] = Math.max(r.data[j + 3], Math.round(src[i + 3] * 0.55));
    }
  }
  if (anim === 'die') crumble(r, Math.max(0, (f - 4) / (n - 5)), ['#ffffff', '#e8f8ff', '#8ae0ff', '#d0e4f6'], 303, true);
  if (anim === 'die' && f >= 4) for (let i = 0; i < 30; i++) { const t = ((f - 4) / (n - 4) + hash(i, 1, 305) * 0.3) % 1, a = hash(i, 2, 305) * Math.PI * 2; put(r, r.w / 2 + Math.cos(a) * t * 30, lowest(r) - 30 + Math.sin(a) * t * 20, i % 2 ? '#ffffff' : '#8ae0ff', Math.round(240 * (1 - t))); }
}

export const REINA_SPEC: BossSpec = {
  id: 'reina_escarcha', cell: 64, dims: queenDims, elev: 26, anims: reinaAnims(), post: reinaPost,
  scene: (cell, pose, sec) => reinaScene(cell, pose, sec),
  strikePoint: (j) => j.hands.near,
};

// ---------------------------------------------------------------- El Guardián de la Puerta

/**
 * El Guardián de la Puerta: un demonio caballero enorme. Armadura negra de placas con las juntas al rojo vivo, el
 * yelmo con dos cuernos grandes curvos, la visera con colmillos tallados y los ojos que queman adentro, una capa
 * rota de tela roja vieja y una espada larga de fuego negro (hoja negra con el filo violeta y rojo que tiembla).
 * `extra`: `eyes`, `kneel` (cae de rodillas al morir), `dim` (se apaga), `flame` (el fuego de la espada).
 */
const DEMON = { hipH: 40, hipW: 9, legU: 20, legL: 19, foot: 9, spine: 31, shW: 17, armU: 19, armL: 18, hand: 6, neck: 4, head: 11, weaponLen: 34, weaponR: 3 };
const demonDims = (cell: number): BossDims => bipedDims(cell * 0.74, DEMON);
function guardianScene(cell: number, pose: BossPose, sec?: Secondary): BossScene {
  const d = demonDims(cell), s = d.s, j = solveBiped(d, pose), B = new Body();
  const S = (v: V3): V3 => mul(v, s);
  const ex = pose.extra ?? {}, ch = j.chest, hm = j.headM, body = j.body;
  const dim = ex.dim ?? 0, flame = ex.flame ?? 1;
  // la capa rota de tela roja vieja, detrás
  B.ell(loc(ch, j.pelvis, S([-10, 6, 0])), S([4, 26, 16]), 'cape', 1, { rot: mm(ch, rotZ(8 + (sec?.flap ?? 0) * 8)) });
  // el peto con las juntas al rojo y la cara de demonio tallada en el pecho
  B.ell(loc(ch, j.pelvis, S([1, 21, 0])), S([11, 13, 14]), 'armor', 2, { rot: ch, bump: 0.2 * s });
  B.ell(loc(ch, j.pelvis, S([7, 23, 0])), S([4.4, 8, 9]), 'armorHi', 3, { rot: ch });
  for (const z of [-3, 3]) B.ell(loc(ch, j.pelvis, S([11.4, 24, z])), S([0.8, 1, 1.4]), 'seam', 4, { rot: ch });
  B.ell(loc(ch, j.pelvis, S([0, 13.6, 0])), S([11.2, 0.5, 14.2]), 'seam', 4, { rot: ch });
  B.ell(loc(body, j.pelvis, S([0, 3, 0])), S([10, 7, 13]), 'armor', 5, { rot: body });
  B.ell(loc(body, j.pelvis, S([0, 8, 0])), S([10.4, 0.7, 13.4]), 'seam', 6, { rot: body });
  // las piernas de placas
  for (const side of ['far', 'near'] as const) {
    const g = side === 'near' ? 44 : 40;
    B.cone(j.hips[side], j.knees[side], 6.4 * s, 5.4 * s, 'armor', g);
    B.ell(j.knees[side], S([5, 4.6, 5]), 'armorHi', g);
    B.cone(j.knees[side], add(j.knees[side], S([3, 4, 0])), 2 * s, 0.4 * s, 'horn', g);
    B.cone(j.knees[side], j.ankles[side], 5.4 * s, 4.6 * s, 'armor', g);
    B.ell(add(j.ankles[side], mv(rotY(pose.root.yaw ?? 0), S([3, -1.6, 0]))), S([7.4, 3.4, 5]), 'armor', g + 1);
  }
  // los brazos: hombreras con púas, brazales y guanteletes con garras
  for (const side of ['far', 'near'] as const) {
    const g = side === 'near' ? 34 : 30;
    B.ell(j.shoulders[side], S([8, 6.4, 8]), 'armorHi', g, { rot: ch });
    for (let q = 0; q < 3; q++) B.cone(add(j.shoulders[side], mv(ch, S([-2 + q * 2, 4, (side === 'near' ? 1 : -1) * (3 + q)]))), add(j.shoulders[side], mv(ch, S([-4 + q * 2, 12 - q * 2, (side === 'near' ? 1 : -1) * (5 + q * 2)]))), 1.8 * s, 0.3 * s, 'horn', g);
    B.cone(j.shoulders[side], j.elbows[side], 5 * s, 4.4 * s, 'armor', g);
    B.cone(j.elbows[side], j.hands[side], 4.4 * s, 4.8 * s, 'armor', g);
    B.ell(j.hands[side], S([5, 4.6, 4.6]), 'armorHi', g + 1);
  }
  // la espada de fuego negro
  if (j.weapon) {
    const g = j.weapon.grip, dir = j.weapon.dir;
    B.cone(add(g, mul(dir, -5 * s)), add(g, mul(dir, 3 * s)), 1.6 * s, 1.6 * s, 'armorHi', 80);
    B.cone(add(g, mul(dir, 3 * s)), add(g, mul(dir, 4.4 * s)), 6 * s, 6 * s, 'armorHi', 80);
    B.cone(add(g, mul(dir, 4.4 * s)), add(g, mul(dir, 34 * s)), 4.4 * s, 1 * s, 'blade', 81);
    // las llamas negras que envuelven la hoja, con el filo rojo
    if (flame > 0.2) for (let q = 0; q < 8; q++) { const p = add(g, mul(dir, (7 + q * 3.6) * s)); B.ell(add(p, [0, (2.4 + (q % 2) * 2) * s * flame, 0]), S([2.6, 3.6 * flame, 2.6]), q % 2 ? 'blackFire' : 'fireEdge', 82); }
  }
  // el yelmo con los cuernos grandes, la visera con colmillos y los ojos que queman
  const hk = 1.35;
  const H = (v: V3): V3 => loc(hm, j.headC, mul([v[0], v[1] + 1, v[2]], s * hk));
  const SH = (v: V3): V3 => mul(v, s * hk);
  B.ell(H([0, 2, 0]), SH([9.6, 10, 9.4]), 'armor', 20, { rot: hm });
  B.ell(H([6, -3, 0]), SH([5, 4, 7]), 'armor', 20, { rot: hm });
  B.box(H([8.8, 2.4, 0]), SH([0.8, 1.6, 6.8]), 'void', 21, { rot: hm });
  for (let q = -3; q <= 3; q++) B.cone(H([10.4, -1.8, q * 1.8]), H([10.6, -5 - (q % 2 ? 0 : 1.4), q * 1.8]), 0.9 * s * hk, 0.15 * s * hk, 'fang', 22);
  for (const z of [-1, 1]) B.chain([H([0, 7, z * 7]), H([-2, 13, z * 13]), H([-8, 19, z * 15]), H([-15, 20, z * 12])], [3, 2.4, 1.4, 0.3].map((v) => v * s * hk), 'horn', 23);
  const eyes = (ex.eyes ?? 0.8) * (1 - dim);
  if (eyes > 0.05) for (const z of [-2.8, 2.8]) B.ell(H([9, 2.4, z]), SH([0.9, 1 + eyes * 0.5, 1.6]), 'eye', 24, { rot: mm(hm, rotX(z > 0 ? 16 : -16)) });
  const k = (c: string, g: string) => (dim > 0.5 ? g : c);
  return {
    pieces: B.pieces, smooth: { 2: 2 * s },
    materials: {
      armor: { ramp: makeBossRamp('#1c1a22', 6, { spread: 1.4, hue: 10 }), surface: 'metal', tex: 0.4 },
      armorHi: { ramp: makeBossRamp('#34303c', 6, { spread: 1.3 }), surface: 'metal', tex: 0.4 },
      seam: dim > 0.5 ? { ramp: ['#2a1414', '#3a1a18'], surface: 'stone', tex: 0.2 } : { ramp: ['#c03a10', '#ff6a20', '#ffa050'], surface: 'glow' },
      horn: { ramp: makeBossRamp('#2a2420', 5, { spread: 1.3 }), surface: 'horn', tex: 0.5 },
      cape: { ramp: makeBossRamp('#4a1210', 5, { spread: 1.2 }), surface: 'cloth', tex: 0.6, patch: { mat: 'frost', amount: 0.12 } },
      frost: { ramp: ['#6a8aac', '#9ab8d8', '#d0e4f6'], surface: 'stone', tex: 0.3 },
      void: { ramp: ['#000000', '#050306'], surface: 'eye' },
      fang: { ramp: ['#8a8478', '#c8c0b0', '#ece6da'], surface: 'horn', tex: 0.2 },
      eye: { ramp: [k('#c01a10', '#3a0a08'), k('#ff2a1a', '#5a1010'), k('#ff8a6a', '#7a2a20')], surface: 'glow' },
      blade: { ramp: ['#020104', '#0a0610', '#16101e', '#241a30'], surface: 'metal', tex: 0.2 },
      blackFire: { ramp: ['#0a0210', '#2a0a3a', '#5a1a6a'], surface: 'glow' },
      fireEdge: { ramp: ['#8a1030', '#ff2a3a', '#ff8a8a'], surface: 'glow' },
    },
  };
}

const GGUARD: BossPose = {
  root: { y: -1, lean: 4 }, spine: { bend: 4 }, head: { pitch: 2 },
  arms: { near: { pitch: 24, spread: 16, elbow: 40 }, far: { pitch: 16, spread: 20, elbow: 30 } },
  legs: { near: { x: 6, y: 0, z: 3 }, far: { x: -6, y: 0, z: 3 } },
  weapon: { angle: 150 }, extra: { eyes: 0.8, dim: 0, flame: 1 },
};

function guardianAnims(): BossAnimDef[] {
  const idle: BossAnimDef = { name: 'idle', fps: 6, loop: true, frames: 8, keys: Array.from({ length: 8 }, (_, f) => kk(f, over(GGUARD, { root: { y: -1 + cyc(8, f) * 0.7 }, spine: { bend: 4 + cyc(8, f) * 2 }, extra: { eyes: 0.7 + 0.3 * Math.abs(cyc(8, f)), flame: 0.8 + 0.2 * cyc(8, f, 1) } }))) };
  const n = 8, near = gait(7, 4, 0.58, n);
  const walk: BossAnimDef = {
    name: 'walk', fps: 7, loop: true, frames: n, stride: 24,
    keys: Array.from({ length: n }, (_, f) => kk(f, over(GGUARD, { root: { roll: cyc(n, f) * 4, y: -2 - Math.abs(cyc(n, f)) * 1.6, lean: 7 }, legs: { near: near[f], far: near[(f + n / 2) % n] }, arms: { far: { pitch: 16 + cyc(n, f) * 16 } } }))),
    events: [{ type: 'paso', frame: 0, foot: 'near' }, { type: 'paso', frame: 4, foot: 'far' }],
  };
  // el golpe en cruz: un tajo de lado a lado y enseguida uno de arriba abajo (5 de aviso)
  const C_UP = over(GGUARD, { spine: { twist: -36 }, arms: { near: { pitch: 100, spread: 40, elbow: 20 } }, weapon: { angle: 80, yaw: -60 }, extra: { eyes: 1 } });
  const C_SIDE = over(GGUARD, { root: { lean: 10, x: 2 }, spine: { twist: 34 }, arms: { near: { pitch: 90, spread: -20, elbow: 4 } }, weapon: { angle: 90, yaw: 60 }, extra: { eyes: 1 } });
  const C_TOP = over(GGUARD, { root: { lean: -4 }, arms: { near: { pitch: 150, spread: 4, elbow: 30 } }, weapon: { angle: -40, twoHand: true }, extra: { eyes: 1 } });
  const C_DN = over(GGUARD, { root: { lean: 20, y: -6, x: 4 }, spine: { bend: 16 }, arms: { near: { pitch: 66, spread: 0, elbow: 0 } }, weapon: { angle: 175, twoHand: true }, legs: { near: { x: 10 } }, extra: { eyes: 1 } });
  const attack: BossAnimDef = {
    name: 'attack', fps: 10, loop: false, frames: 16, windup: [1, 5], shake: 0.6,
    keys: [kk(0, GGUARD), kk(2, C_UP, 'out'), kk(5, over(C_UP, { spine: { twist: -40 } })), kk(6, C_SIDE, 'in'), kk(7, C_SIDE), kk(9, C_TOP, 'out'), kk(11, C_DN, 'in'), kk(12, C_DN), kk(15, GGUARD, 'ease')],
    events: [{ type: 'impacto', frame: 6 }, { type: 'impacto', frame: 11 }],
  };
  // el golpe pesado: la espada arriba con las dos manos, el fuego crece (7 de aviso que tiemblan) y la clava en el piso
  const HV_UP = over(GGUARD, { root: { lean: -6, y: -2 }, spine: { bend: -4 }, head: { pitch: -12 }, arms: { near: { pitch: 150, spread: 8, elbow: 40 } }, weapon: { angle: -55, twoHand: true }, extra: { eyes: 1, flame: 1.4 } });
  const HV_DN = over(GGUARD, { root: { lean: 24, y: -10, x: 5 }, spine: { bend: 22 }, arms: { near: { pitch: 56, spread: 2, elbow: 0 } }, weapon: { angle: 178, twoHand: true }, legs: { near: { x: 11 }, far: { x: -9 } }, extra: { eyes: 1, flame: 1.4 } });
  const heavy: BossAnimDef = {
    name: 'attack_heavy', fps: 10, loop: false, frames: 15, windup: [1, 7], shake: 1.2,
    keys: [kk(0, GGUARD), kk(2, HV_UP, 'out'), kk(7, over(HV_UP, { root: { y: -2 } })), kk(8, HV_DN, 'in'), kk(11, HV_DN), kk(14, GGUARD, 'ease')],
    events: [{ type: 'impacto', frame: 8 }],
  };
  // la carga: se encorva con la espada adelante y corre
  const CH = (f: number) => over(GGUARD, { root: { lean: 28, y: -6 - Math.abs(cyc(6, f)) * 2 }, spine: { bend: 14 }, head: { pitch: -16 }, arms: { near: { pitch: 80, spread: 0, elbow: 4 } }, weapon: { angle: 92 }, legs: { near: gait(9, 6, 0.5, 6)[f], far: gait(9, 6, 0.5, 6)[(f + 3) % 6] }, extra: { eyes: 1, flame: 1.2 } });
  const charge: BossAnimDef = { name: 'charge', fps: 12, loop: true, frames: 6, stride: 40, keys: [0, 1, 2, 3, 4, 5].map((f) => kk(f, CH(f))), events: [{ type: 'paso', frame: 0 }, { type: 'paso', frame: 3 }] };
  const hit: BossAnimDef = { name: 'hit', fps: 12, loop: false, frames: 4, keys: [kk(0, GGUARD), kk(1, over(GGUARD, { root: { lean: -10, x: -4 }, head: { pitch: -12 }, extra: { eyes: 0.4 } }), 'out'), kk(3, GGUARD, 'ease')] };
  // cae de rodillas, la espada clavada en el piso, y se apaga
  const KNEEL = over(GGUARD, { root: { y: -18, lean: 12, x: -2 }, spine: { bend: 18 }, head: { pitch: 24 }, arms: { near: { pitch: 70, spread: 10, elbow: 20 }, far: { pitch: 20, spread: 20, elbow: 40 } }, legs: { near: { x: -14, y: 0, z: 3, toe: 60 }, far: { x: 12, y: 0, z: 4 } }, weapon: { angle: 178 } });
  const die: BossAnimDef = {
    name: 'die', fps: 8, loop: false, frames: 14,
    keys: [kk(0, GGUARD), kk(2, over(GGUARD, { root: { lean: -10 }, head: { pitch: -18 }, extra: { eyes: 1 } }), 'out'), kk(6, over(KNEEL, { extra: { eyes: 0.6, flame: 0.6 } }), 'in'), kk(9, over(KNEEL, { extra: { eyes: 0.3, flame: 0.2, dim: 0.4 } })), kk(13, over(KNEEL, { head: { pitch: 34 }, extra: { eyes: 0, flame: 0, dim: 1 } }), 'ease')],
    events: [{ type: 'aterriza', frame: 6 }],
  };
  return [idle, walk, attack, heavy, charge, hit, die];
}

function guardianPost(r: Raster, anim: string, f: number, n: number) {
  iceRim(r, 0.22, 0.3);
  eyeHalo(r, isRed, '#ff2a1a', 170);
  eyeHalo(r, (R, G, B) => R > 150 && B > 150 && G < 120, '#5a1a6a', 120);
  // al apagarse sale ceniza que sube
  if (anim === 'die' && f >= 8) for (let i = 0; i < 16; i++) { const t = ((f - 8) / (n - 8) + hash(i, 1, 311) * 0.5) % 1; put(r, r.w / 2 + (hash(i, 2, 311) - 0.5) * 36 + Math.sin(t * 6 + i) * 2, lowest(r) - 10 - t * 40, '#5a5054', Math.round(200 * (1 - t))); }
}

export const GUARDIAN_PUERTA_SPEC: BossSpec = {
  id: 'guardian_puerta', cell: 64, dims: demonDims, elev: 26, anims: guardianAnims(), post: guardianPost,
  scene: (cell, pose, sec) => guardianScene(cell, pose, sec),
  strikePoint: (j, d) => (j.weapon ? add(j.weapon.grip, mul(j.weapon.dir, 31 * d.s)) : j.hands.near),
};

void rotZ;

/** Todos los del Mundo 7 menos el Diablo, en el orden de la lámina. */
export const CORAZON_SPECS: BossSpec[] = [LOBO_SPEC, ESPECTRO_SPEC, DIABLILLO_SPEC, CABALLERO_SPEC, BRUJA_SPEC, SOMBRA_DEVORADORA_SPEC, REINA_SPEC, GUARDIAN_PUERTA_SPEC];
