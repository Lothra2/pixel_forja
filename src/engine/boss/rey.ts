import { type V3, add, mul, mv, mm, rotY, rotZ, rotX } from './sdf';
import { Body, loc } from './build';
import { bipedDims, solveBiped, type BossPose, type BossDims } from './rig';
import { makeBossRamp, type BossScene, type BossMaterial } from './render';
import type { Secondary } from './secondary';
import type { BossSpec } from './sheet';
import { type BossAnimDef, type BossKey, over } from './anim';
import { mixHex, MUSGO } from './ciudadano';
import { createRaster, type Raster } from '../core/raster';

/**
 * El jefe del Mundo 5: el Rey de Piedra (celda 128), con el motor de volúmenes de los jefes grandes.
 *
 * Enorme, de piedra clara con musgo plateado, el manto real hasta los pies con el cuello de armiño, la barba de
 * piedra larga y los ojos cerrados como dormido. En la cabeza, la corona de oro con la luz robada de la ciudad: lo más
 * brillante de la pantalla. Imponente pero de cuento: no tiene dientes ni garras, pega con los puños y con los pies.
 *
 * - `idle`: dormido de pie, respira lento y la corona brilla.
 * - `walk`: pasos pesados.
 * - `attack`: levanta el puño (6 cuadros de aviso que tiemblan) y lo deja caer delante.
 * - `attack_heavy`: el pisotón: se agacha (7 cuadros de aviso), da un saltito (`elevacion`) y cae con los dos pies.
 * - `barrido`: estira el brazo hacia un lado (6 de aviso) y lo barre en línea delante de él.
 * - `warcry`: canta la canción de cuna: abre la boca, levanta la cabeza y salen notas de piedra.
 * - `aturdido`: de rodillas, con las grietas brillando dorado. Ahí se le pega.
 * - `hit` y `die`: se libera. La corona se rompe y la luz sale volando hacia arriba, la piedra se le cae como polvo y
 *   queda un rey viejito y bonachón que bosteza, se estira y saluda.
 *
 * La pose usa `freed` (0 piedra, 1 el rey de colores), `face.mouth`, y `extra`: `crown` (1 la corona entera con la
 * luz, 0 rota), `lightUp` (la luz que se va volando: 0 en la corona a 1 lejos arriba), `cracks` (las grietas que
 * brillan), `yawn`, `notes` (las notas de la canción) y `t` (giro de los brillitos de la corona).
 */

const REY_DIMS = { hipH: 42, hipW: 12, legU: 22, legL: 21, foot: 11, spine: 35, shW: 24, armU: 25, armL: 24, hand: 9, neck: 6, head: 15 };
const REY_SCALE = 0.8;
/** la cabeza va más grande que la de una persona (rey de cuento) */
const HK = 1.22;
const reyDims = (cell: number): BossDims => bipedDims(cell * REY_SCALE, REY_DIMS);

function materials(freed: number, lit: number): Record<string, BossMaterial> {
  const st = freed < 0.5;
  const m = (stone: string, real: string, surface: BossMaterial['surface'], tex = 0.5, scale = 2): BossMaterial => ({
    ramp: makeBossRamp(mixHex(stone, real, freed), 7, { spread: 1.2, hue: st ? 8 : 22 }),
    surface: st ? 'stone' : surface, tex: st ? 0.45 : tex, scale: st ? 3.2 : scale,
    ...(freed < 0.3 ? { patch: { mat: 'moss', amount: 0.16 * (1 - freed / 0.3), scale: 4 } } : {}),
  });
  return {
    robe: m('#646c7e', '#a83a4a', 'cloth', 0.6, 2.4),
    robeIn: m('#4e566a', '#3a4a8a', 'cloth', 0.5, 2),
    fur: m('#d4d8e2', '#f4f0e8', 'fur', 0.9, 1.6),
    furSpot: m('#525a6a', '#1a1a20', 'fur', 0.3),
    skin: m('#9aa2b2', '#e8b890', 'skin', 0.3),
    beard: m('#c8ccd8', '#f4f4ee', 'fur', 0.9, 1.8),
    belt: m('#6c7484', '#d8a848', 'metal', 0.5),
    boot: m('#5a6274', '#4a2a20', 'leather', 0.4),
    lid: { ramp: makeBossRamp(mixHex('#525a6a', '#8a5a40', freed), 4), surface: 'skin', tex: 0.1 },
    eye: { ramp: ['#141820', '#2a3040'], surface: 'eye' },
    mouth: { ramp: freed > 0.5 ? ['#3a1a1a', '#5a2a2a', '#8a4a4a'] : ['#2c323e', '#3a4050', '#4a5262'], surface: 'skin', tex: 0.1 },
    gold: { ramp: makeBossRamp('#d8a848', 6, { spread: 1.3 }), surface: 'metal', tex: 0.4 },
    gem: { ramp: ['#5a3aa8', '#b89aff', '#f0e8ff'], surface: 'glow' },
    light: { ramp: lit > 0.6 ? ['#ffd890', '#fff4d0', '#ffffff'] : ['#c8903a', '#ffd890', '#fff4d0'], surface: 'glow' },
    spark: { ramp: ['#ffd890', '#fff4d0', '#ffffff'], surface: 'glow' },
    note: { ramp: ['#6c7484', '#a8aebb', '#c8ccd8', '#e8e8f4'], surface: 'stone', tex: 0.2 },
    moss: { ramp: makeBossRamp(MUSGO, 5, { spread: 0.8 }), surface: 'fur', tex: 0.6, scale: 1.4 },
  };
}

/** Dónde está la luz de la corona (marco del personaje, pixeles de la celda), o null si ya se rompió y se fue. */
export function reyCorona(cell: number, pose: BossPose): V3 | null {
  const ex = pose.extra ?? {};
  if ((ex.crown ?? 1) < 0.5 && (ex.lightUp ?? 0) >= 0.99) return null;
  const d = reyDims(cell), s = d.s, j = solveBiped(d, pose);
  const c = loc(j.headM, j.headC, mul([-1, 17.5, 0], s * HK));
  const up = ex.lightUp ?? 0;
  return add(c, [0, up * 26 * s, 0]);
}

function reyScene(cell: number, pose: BossPose, sec?: Secondary): BossScene {
  const d = reyDims(cell), s = d.s, j = solveBiped(d, pose), B = new Body();
  const S = (v: V3): V3 => mul(v, s);
  const ch = j.chest, hm = j.headM, body = j.body;
  const ex = pose.extra ?? {};
  const freed = pose.freed ?? 0;
  const crown = ex.crown ?? 1, lightUp = ex.lightUp ?? 0;
  // ---------- el cuerpo: pecho ancho, panza de rey y el manto hasta los pies ----------
  B.ell(loc(ch, j.pelvis, S([1, 22, 0])), S([15, 15, 21]), 'robe', 1, { rot: ch, bump: 0.6 * s });
  B.ell(loc(body, j.pelvis, S([4, 8, 0])), S([16, 13, 19]), 'robe', 1, { rot: body });
  const ankMid = mul(add(j.ankles.near, j.ankles.far), 0.5);
  const flap = (sec?.flap ?? 0) * 4 * s;
  const hipC = loc(body, j.pelvis, S([0, 2, 0]));
  B.cone(hipC, [ankMid[0] - flap, ankMid[1] + 2 * s, ankMid[2]], 17 * s, 21 * s, 'robe', 2);
  // el forro azul que se ve adelante, abierto
  B.ell(loc(body, j.pelvis, S([12, -10, 0])), S([4, 18, 9]), 'robeIn', 3, { rot: mm(body, rotZ(-8)) });
  // el manto de atrás, que cae de los hombros hasta el piso y se mece
  B.ell(loc(ch, j.pelvis, S([-12, 6, 0])), S([7, 30, 22]), 'robe', 4, { rot: mm(ch, rotZ(6 + (sec?.flap ?? 0) * 6)) });
  // el cinturón de oro con su hebilla
  B.ell(loc(body, j.pelvis, S([2, 12, 0])), S([16.4, 2, 19.6]), 'belt', 5, { rot: body });
  B.ell(loc(body, j.pelvis, S([17.6, 12, 0])), S([1.4, 3, 3.4]), 'gem', 6, { rot: body });
  // el cuello de armiño con sus colitas negras
  B.ell(loc(ch, j.pelvis, S([0, 33, 0])), S([14, 7, 22]), 'fur', 7, { rot: ch, bump: 0.6 * s });
  for (let k = 0; k < 7; k++) { const a = (k / 6 - 0.5) * 2.6; B.ell(loc(ch, j.pelvis, S([Math.cos(a) * 12, 31, Math.sin(a) * 20])), S([1.4, 2.4, 1.4]), 'furSpot', 8, { rot: ch }); }
  // los pies que asoman abajo del manto
  for (const side of ['far', 'near'] as const) B.ell(add(j.ankles[side], mv(rotY(pose.root.yaw ?? 0), S([5, -2, 0]))), S([9, 4.4, 6.4]), 'boot', side === 'near' ? 41 : 40);
  // ---------- los brazos: mangas anchas, puños grandes ----------
  for (const side of ['far', 'near'] as const) {
    const g = side === 'near' ? 34 : 30;
    B.cone(j.shoulders[side], j.elbows[side], 9 * s, 8 * s, 'robe', g);
    B.cone(j.elbows[side], j.hands[side], 8 * s, 9.5 * s, 'robe', g);
    B.ell(j.hands[side], S([7, 6.6, 6.6]), 'skin', g + 1, { bump: 0.4 * s });
    // el puño de armiño de la manga
    B.ell(add(j.hands[side], mul(add(j.elbows[side], mul(j.hands[side], -1)), 0.2)), S([5, 5, 5]), 'fur', g + 2);
  }
  // ---------- la cabeza: cara redonda, cejas tupidas, ojos cerrados, nariz grande y la barba larga ----------
  const hk = HK;
  const SH = (v: V3): V3 => mul(v, s * hk);
  const H = (v: V3): V3 => loc(hm, j.headC, mul(v, s * hk));
  B.ell(H([0, 0, 0]), SH([11, 12, 11]), 'skin', 20, { rot: hm });
  B.ell(H([10.6, -1, 0]), SH([3.2, 3.2, 2.8]), 'skin', 20, { rot: hm });
  for (const z of [-1, 1]) B.ell(H([0, 0, z * 11]), SH([2.2, 3, 1.4]), 'skin', 20, { rot: hm });
  const eyes = pose.face?.eyes ?? 'closed';
  for (const z of [-4.2, 4.2]) {
    const e = H([9.6, 2.6, z]);
    if (eyes === 'closed' || eyes === 'happy') B.ell(add(e, mv(hm, SH([0, eyes === 'happy' ? 0.5 : -0.2, 0]))), SH([1, 0.6, 2.2]), 'lid', 21, { rot: hm });
    else B.ell(e, SH([0.9, 1.6, 1.4]), 'eye', 21, { rot: hm });
    // la ceja tupida
    B.ell(H([9.2, 5, z * 1.05]), SH([2, 1.4, 3.4]), 'beard', 22, { rot: mm(hm, rotX(z > 0 ? -10 : 10)) });
  }
  // la barba de piedra: un gajo grande que cae hasta la panza, con bigotes
  const yawn = ex.yawn ?? 0, mouth = Math.max(pose.face?.mouth ?? 0, yawn);
  const sway = (sec?.hangX ?? 0) * 2;
  const bTop = H([8, -5, 0]);
  B.chain([bTop, add(bTop, mv(hm, SH([2 - sway, -10, 0]))), add(bTop, mv(hm, SH([-1 - sway * 2, -20, 0])))], [9, 7.4, 3.4].map((v) => v * s * hk), 'beard', 23, { bump: 0.6 * s });
  for (const z of [-1, 1]) B.chain([H([10.6, -3.6, z * 1.6]), H([10, -4.6, z * 6]), H([8, -7.6, z * 8.4])], [1.8, 1.6, 0.8].map((v) => v * s), 'beard', 24);
  if (mouth > 0.1) B.ell(H([10.4, -5.4, 0]), SH([1.4, 0.8 + mouth * 3, 2.6 + mouth]), 'mouth', 25, { rot: hm });
  // el pelo de los costados (calvito arriba, la corona tapa)
  for (const z of [-1, 1]) B.ell(H([-3, 0, z * 9.6]), SH([6, 6, 3]), 'beard', 26, { rot: hm, bump: 0.4 * s });
  // ---------- la corona de oro con la luz robada ----------
  if (crown > 0.5) {
    const cb = H([-1, 9.6, 0]);
    B.torus(cb, 9.6 * s * hk, 2 * s * hk, 'gold', 27, mm(hm, rotX(90)));
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const p = add(cb, mv(hm, SH([Math.cos(a) * 9.6, 1, Math.sin(a) * 9.6])));
      B.cone(p, add(p, mv(hm, SH([0, 6 + (k % 2) * 2, 0]))), 2.2 * s * hk, 0.7 * s * hk, 'gold', 28);
      B.ell(add(p, mv(hm, SH([0, 0.4, 0]))), SH([1.2, 1.2, 1.2]), 'gem', 29);
    }
  }
  // la luz: en el medio de la corona (o volando para arriba cuando se rompe)
  const lc = reyCorona(cell, pose);
  if (lc && (crown > 0.5 || lightUp > 0)) {
    const R = (6.4 - lightUp * 2) * s;
    B.ell(lc, [R, R, R], 'light', 31);
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + (ex.t ?? 0); B.ell(add(lc, [Math.cos(a) * R * 2, Math.sin(a) * R * 1.3, Math.sin(a) * R]), [R * 0.3, R * 0.3, R * 0.3], 'spark', 32 + k); }
  }
  // los pedazos de la corona que saltan al romperse (extra.burst de 0 a 1)
  const burst = ex.burst ?? 0;
  if (burst > 0 && burst < 1) for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + 0.4; B.ell(add(H([-1, 10, 0]), S([Math.cos(a) * (10 + burst * 18), burst * 10 - burst * burst * 14, Math.sin(a) * (10 + burst * 18)])), S([2, 1.4, 1.4]), 'gold', 40 + k); }
  // las notas de piedra de la canción de cuna (extra.notes de 0 a 1)
  const notes = ex.notes ?? 0;
  if (notes > 0) for (let k = 0; k < 3; k++) {
    const t = (notes + k / 3) % 1, p = add(H([14, -4, 0]), S([4 + t * 14, t * 22, (k - 1) * 8]));
    B.ell(p, S([2.4, 2, 2]), 'note', 50 + k);
    B.cone(add(p, S([1.6, 0, 0])), add(p, S([1.6, 7, 0])), 0.8 * s, 0.6 * s, 'note', 50 + k);
  }
  return { pieces: B.pieces, materials: materials(freed, crown), smooth: { 1: 6 * s, 2: 3 * s, 20: 2 * s } };
}

// ---------------------------------------------------------------- animaciones

const k = (f: number, pose: BossPose, ease: BossKey['ease'] = 'linear'): BossKey => ({ f, pose, ease });
const cyc = (n: number, f: number, ph = 0) => Math.sin((f / n) * Math.PI * 2 + ph);

/** De pie, dormido: los brazos a los costados, la cabeza apenas caída. */
const SLEEP: BossPose = {
  root: { y: -2, lean: 2 }, spine: { bend: 4 }, head: { pitch: 8 },
  arms: { near: { pitch: 10, spread: 18, elbow: 26 }, far: { pitch: 8, spread: 18, elbow: 30 } },
  legs: { near: { x: 5, y: 0, z: 2 }, far: { x: -5, y: 0, z: 2 } },
  face: { eyes: 'closed' }, freed: 0, extra: { crown: 1, lightUp: 0, t: 0, yawn: 0, notes: 0, burst: 0 },
};

function gait(S: number, lift: number, duty: number, n: number): { x: number; y: number; z: number }[] {
  const out: { x: number; y: number; z: number }[] = [];
  for (let f = 0; f < n; f++) {
    const t = f / n;
    if (t < duty) out.push({ x: S - (2 * S * t) / duty, y: 0, z: 2 });
    else { const u = (t - duty) / (1 - duty); out.push({ x: -S + 2 * S * (u * u * (3 - 2 * u)), y: Math.sin(u * Math.PI) * lift, z: 2.5 }); }
  }
  return out;
}

function reyAnims(): BossAnimDef[] {
  const idle: BossAnimDef = { name: 'idle', fps: 5, loop: true, frames: 8, keys: Array.from({ length: 8 }, (_, f) => k(f, over(SLEEP, { root: { y: -2 + cyc(8, f) * 0.8 }, spine: { bend: 4 + cyc(8, f) * 2 }, head: { pitch: 8 - cyc(8, f) * 2 }, extra: { t: f * 0.78 } }))) };
  const n = 8, S = 9, near = gait(S, 6, 0.55, n);
  const walk: BossAnimDef = {
    name: 'walk', fps: 7, loop: true, frames: n, stride: (2 * S) / 0.55,
    keys: Array.from({ length: n }, (_, f) => k(f, over(SLEEP, { root: { y: -3 - Math.abs(cyc(n, f)) * 1.6, roll: cyc(n, f) * 3, lean: 5 }, spine: { twist: -6 * cyc(n, f) }, legs: { near: near[f], far: near[(f + n / 2) % n] }, arms: { near: { pitch: 10 - cyc(n, f) * 12 }, far: { pitch: 8 + cyc(n, f) * 12 } }, extra: { t: f * 0.78 } }))),
    events: [{ type: 'paso', frame: 0, foot: 'near' }, { type: 'paso', frame: 4, foot: 'far' }],
  };
  // el puño: lo levanta bien arriba (6 cuadros que tiemblan) y lo deja caer delante, cerca de los pies
  const FIST_UP = over(SLEEP, { root: { y: -3, lean: -4 }, spine: { bend: -6, twist: -14 }, head: { pitch: -4 }, arms: { near: { pitch: 140, spread: 18, elbow: 50 } }, legs: { near: { x: 7 }, far: { x: -7 } } });
  const FIST_DOWN = over(SLEEP, { root: { y: -9, lean: 18, x: 2 }, spine: { bend: 16, twist: 12 }, head: { pitch: 10 }, arms: { near: { pitch: 52, spread: 6, elbow: 4 } }, legs: { near: { x: 9 }, far: { x: -8 } } });
  const attack: BossAnimDef = {
    name: 'attack', fps: 10, loop: false, frames: 12, windup: [1, 6], shake: 1,
    keys: [k(0, SLEEP), k(2, FIST_UP, 'out'), k(6, over(FIST_UP, { arms: { near: { pitch: 144 } } })), k(8, FIST_DOWN, 'in'), k(9, over(FIST_DOWN, { root: { y: -10 } })), k(11, SLEEP, 'ease')],
    events: [{ type: 'impacto', frame: 8 }],
  };
  // el pisotón: se agacha juntando fuerza (7 de aviso), un saltito y cae con los dos pies
  const CROUCH = over(SLEEP, { root: { y: -12, lean: 10 }, spine: { bend: 10 }, head: { pitch: 2 }, arms: { near: { pitch: 30, spread: 40, elbow: 50 }, far: { pitch: 30, spread: 40, elbow: 50 } }, legs: { near: { x: 8, z: 4 }, far: { x: -8, z: 4 } } });
  const AIR = over(SLEEP, { root: { y: -2, lean: -4 }, arms: { near: { pitch: 120, spread: 40, elbow: 30 }, far: { pitch: 118, spread: 40, elbow: 30 } }, legs: { near: { x: 6, y: 8, z: 4 }, far: { x: -6, y: 8, z: 4 } } });
  const LAND = over(SLEEP, { root: { y: -14, lean: 12 }, spine: { bend: 12 }, arms: { near: { pitch: 40, spread: 40, elbow: 20 }, far: { pitch: 40, spread: 40, elbow: 20 } }, legs: { near: { x: 9, z: 5 }, far: { x: -9, z: 5 } } });
  const heavy: BossAnimDef = {
    name: 'attack_heavy', fps: 10, loop: false, frames: 15, windup: [1, 7], shake: 1.2,
    keys: [k(0, SLEEP), k(2, CROUCH, 'out'), k(7, over(CROUCH, { root: { y: -13 } })), k(8, AIR, 'out'), k(10, AIR), k(11, LAND, 'in'), k(12, over(LAND, { root: { y: -15 } })), k(14, SLEEP, 'ease')],
    events: [{ type: 'despegue', frame: 8 }, { type: 'aterriza', frame: 11 }, { type: 'impacto', frame: 11 }],
    rise: [0, 0, 0, 0, 0, 0, 0, 0, 12, 20, 14, 0, 0, 0, 0],
  };
  // el barrido: lleva el brazo estirado al otro lado (6 de aviso) y lo pasa bajo en línea por delante
  const SW_OUT = over(SLEEP, { root: { y: -5, lean: 4 }, spine: { twist: -34, bend: 6 }, arms: { near: { pitch: 80, spread: 40, elbow: 20 } }, legs: { near: { x: 8 }, far: { x: -8 } } });
  const SW_IN = over(SLEEP, { root: { y: -7, lean: 10 }, spine: { twist: 32, bend: 10 }, arms: { near: { pitch: 78, spread: -14, elbow: 14 } }, legs: { near: { x: 9 }, far: { x: -8 } } });
  const barrido: BossAnimDef = {
    name: 'barrido', fps: 10, loop: false, frames: 12, windup: [1, 6], shake: 1,
    keys: [k(0, SLEEP), k(2, SW_OUT, 'out'), k(6, over(SW_OUT, { spine: { twist: -38 } })), k(8, SW_IN, 'in'), k(9, over(SW_IN, { spine: { twist: 36 } })), k(11, SLEEP, 'ease')],
    events: [{ type: 'impacto', frame: 8 }],
  };
  // la canción de cuna: levanta la cabeza, abre la boca y abre los brazos; salen notas de piedra
  const SING = over(SLEEP, { root: { y: 0, lean: -6 }, spine: { bend: -8 }, head: { pitch: -24 }, arms: { near: { pitch: 70, spread: 50, elbow: 30, open: 1 }, far: { pitch: 72, spread: 50, elbow: 30, open: 1 } }, face: { mouth: 0.8 } });
  const warcry: BossAnimDef = {
    name: 'warcry', fps: 8, loop: false, frames: 12, windup: [1, 3],
    keys: [k(0, SLEEP), k(3, over(SING, { extra: { notes: 0.05 } }), 'out'), ...[4, 5, 6, 7, 8, 9].map((f) => k(f, over(SING, { root: { y: (f % 2) * 0.6 }, face: { mouth: f % 2 ? 0.6 : 0.9 }, extra: { notes: (f - 3) / 6, t: f } }))), k(11, SLEEP, 'ease')],
    events: [{ type: 'grito', frame: 3 }],
  };
  // aturdido: de rodillas, la cabeza gacha, la corona apenas titila y las grietas brillan dorado (post)
  const KNEEL = over(SLEEP, { root: { y: -22, lean: 10, x: -2 }, spine: { bend: 14 }, head: { pitch: 22 }, arms: { near: { pitch: 26, spread: 20, elbow: 50 }, far: { pitch: 24, spread: 20, elbow: 54 } }, legs: { near: { x: -14, y: 0, z: 3, toe: 60 }, far: { x: 12, y: 0, z: 4 } } });
  const aturdido: BossAnimDef = { name: 'aturdido', fps: 6, loop: true, frames: 8, keys: Array.from({ length: 8 }, (_, f) => k(f, over(KNEEL, { root: { y: -22 + cyc(8, f) * 0.6 }, head: { pitch: 22 + cyc(8, f, 1) * 3, roll: cyc(8, f) * 4 }, extra: { t: f * 0.5, cracks: 0.6 + 0.4 * Math.abs(cyc(8, f)) } }))) };
  const hit: BossAnimDef = { name: 'hit', fps: 12, loop: false, frames: 5, keys: [k(0, SLEEP), k(1, over(SLEEP, { root: { x: -4, lean: -10, y: -4 }, spine: { bend: -8 }, head: { pitch: -12 } }), 'out'), k(2, over(SLEEP, { root: { x: -5, lean: -12, y: -5 }, head: { pitch: -16 } })), k(4, SLEEP, 'ease')] };
  // se libera: tiembla, la corona estalla y la luz sale volando, la piedra cae como polvo y queda un rey viejito
  const STAND: BossPose = over(SLEEP, { root: { y: -3, lean: 0 }, spine: { bend: 2 }, head: { pitch: -4 }, face: { eyes: 'open' }, freed: 1, extra: { crown: 0, lightUp: 1 } });
  const YAWN = over(STAND, { head: { pitch: -22 }, arms: { near: { pitch: 60, spread: 20, elbow: 120 } }, face: { eyes: 'closed' }, extra: { yawn: 1 } });
  const STRETCH = over(STAND, { root: { y: 0, lean: -6 }, spine: { bend: -8 }, head: { pitch: -18 }, arms: { near: { pitch: 140, spread: 44, elbow: 40, open: 1 }, far: { pitch: 138, spread: 44, elbow: 42, open: 1 } }, face: { eyes: 'closed' }, extra: { yawn: 0.6 } });
  const WAVE = over(STAND, { arms: { near: { pitch: 136, spread: 40, elbow: 50, open: 1 } }, head: { pitch: -8 }, face: { eyes: 'happy', mouth: 0.5 } });
  const die: BossAnimDef = {
    name: 'die', fps: 8, loop: false, frames: 24,
    keys: [
      k(0, SLEEP),
      k(2, over(SLEEP, { root: { lean: -8, y: -4 }, head: { pitch: -18 }, arms: { near: { pitch: 30, spread: 30 }, far: { pitch: 30, spread: 30 } } }), 'out'),
      k(4, over(SLEEP, { root: { lean: -10, y: -4 }, head: { pitch: -20 }, extra: { crown: 1, burst: 0.01 } })),
      k(5, over(SLEEP, { root: { lean: -6, y: -5 }, head: { pitch: -10 }, extra: { crown: 0, burst: 0.4, lightUp: 0.3 } }), 'out'),
      k(7, over(KNEEL, { extra: { crown: 0, burst: 0.99, lightUp: 1 } }), 'ease'),
      k(9, over(KNEEL, { freed: 0.3, extra: { crown: 0, lightUp: 1 } })),
      k(13, over(KNEEL, { freed: 1, head: { pitch: 6 }, face: { eyes: 'closed' }, extra: { crown: 0, lightUp: 1 } }), 'ease'),
      k(15, STAND, 'ease'), k(16, YAWN, 'out'), k(17, YAWN), k(19, STRETCH, 'ease'), k(20, STRETCH),
      k(22, WAVE, 'ease'), k(23, over(WAVE, { arms: { near: { spread: 20 } } })),
    ],
    events: [{ type: 'suelta', frame: 5 }],
  };
  return [idle, walk, attack, heavy, barrido, warcry, aturdido, hit, die];
}

/**
 * Retoque de cada cuadro: un halo dorado alrededor de la luz de la corona (que se lea como lo más brillante), las
 * grietas doradas cuando está aturdido y el polvo de piedra que se le cae al liberarse.
 */
function reyPost(r: Raster, anim: string, f: number) {
  const W = r.w, H = r.h;
  // el halo de la luz: alrededor de lo que es casi blanco cálido
  const hot: number[] = [];
  for (let i = 0; i < W * H; i++) if (r.data[i * 4 + 3] && r.data[i * 4] > 245 && r.data[i * 4 + 1] > 225 && r.data[i * 4 + 2] > 180) hot.push(i);
  if (hot.length) {
    let cx = 0, cy = 0;
    for (const i of hot) { cx += i % W; cy += Math.floor(i / W); }
    cx /= hot.length; cy /= hot.length;
    for (let y = Math.floor(cy - 12); y <= cy + 12; y++) for (let x = Math.floor(cx - 12); x <= cx + 12; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const d = Math.hypot(x - cx, y - cy) / 12;
      if (d >= 1) continue;
      const i = (y * W + x) * 4, a = Math.round((1 - d) ** 2 * 140);
      if (!r.data[i + 3]) { r.data[i] = 255; r.data[i + 1] = 216; r.data[i + 2] = 144; r.data[i + 3] = a; }
    }
  }
  // las grietas doradas: caminos cortos sobre el cuerpo que brillan
  if (anim === 'aturdido') {
    const pts: number[] = [];
    for (let i = 0; i < W * H; i++) if (r.data[i * 4 + 3] > 200) pts.push(i);
    const pulse = 0.6 + 0.4 * Math.abs(Math.sin(f * 0.8));
    for (let c = 0; c < 9; c++) {
      let p = pts[Math.floor(((c * 7919 + 13) % 997) / 997 * pts.length)];
      let x = p % W, y = Math.floor(p / W);
      for (let t = 0; t < 9; t++) {
        const i = (y * W + x) * 4;
        if (!r.data[i + 3] || r.data[i + 3] < 200) break;
        r.data[i] = 255; r.data[i + 1] = Math.round(200 + 40 * pulse); r.data[i + 2] = Math.round(110 + 60 * pulse);
        x += ((c + t) % 3) - 1; y += t % 2 ? 1 : 0;
        p = y * W + x;
      }
    }
  }
  // el polvo de piedra que se cae al liberarse (cuadros 8 a 14)
  if (anim === 'die' && f >= 8 && f <= 14) {
    const kk2 = (f - 8) / 6, pts: number[] = [];
    for (let i = 0; i < W * H; i++) if (r.data[i * 4 + 3] > 200) pts.push(i);
    let g = 0;
    for (const i of pts) g = Math.max(g, Math.floor(i / W));
    for (let q = 0; q < 90; q++) {
      const i = pts[Math.floor((((q * 7919 + f * 104729) % 9973) / 9973) * pts.length)], x = i % W, y = Math.floor(i / W);
      const yy = Math.min(g, y + Math.round(kk2 * 26 * (0.4 + ((q * 37) % 10) / 16))), j = (yy * W + x + ((q % 5) - 2)) * 4;
      if (j < 0 || j >= r.data.length) continue;
      r.data[j] = q % 2 ? 200 : 138; r.data[j + 1] = q % 2 ? 204 : 145; r.data[j + 2] = q % 2 ? 216 : 160; r.data[j + 3] = 230;
    }
  }
}

export const REY_DE_PIEDRA_SPEC: BossSpec = {
  id: 'rey_de_piedra', cell: 128, dims: reyDims, elev: 26, anims: reyAnims(), post: reyPost,
  scene: (cell, pose, sec) => reyScene(cell, pose, sec),
  // el punto que pega: el puño cercano (el pisotón y el barrido van con el mismo punto de referencia)
  strikePoint: (j) => j.hands.near,
};

// ---------------------------------------------------------------- los avisos y efectos del Rey

function put(r: Raster, x: number, y: number, c: string, a = 255) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= r.w || y >= r.h) return;
  const k2 = (y * r.w + x) * 4, v = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  if (a >= 255 || !r.data[k2 + 3]) { r.data[k2] = v[0]; r.data[k2 + 1] = v[1]; r.data[k2 + 2] = v[2]; r.data[k2 + 3] = Math.max(a, r.data[k2 + 3]); return; }
  const t = a / 255;
  for (let i = 0; i < 3; i++) r.data[k2 + i] = Math.round(r.data[k2 + i] * (1 - t) + v[i] * t);
  r.data[k2 + 3] = Math.max(r.data[k2 + 3], a);
}
const hash = (x: number, y: number, s: number) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/**
 * `aviso_puno` (96 x 48, 8 cuadros, capa suelo): donde va a caer el puño. La sombra del puño que se oscurece, con el
 * borde dorado que se completa y grietitas que se abren desde el centro.
 */
export function fistWarning(): Raster[] {
  return Array.from({ length: 8 }, (_, f) => {
    const r = createRaster(96, 48), t = (f + 1) / 8;
    for (let y = 0; y < 48; y++) for (let x = 0; x < 96; x++) {
      const dx = (x + 0.5 - 48) / 44, dy = (y + 0.5 - 24) / 20, d = Math.hypot(dx, dy);
      if (d > 1) continue;
      const ang = (Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2);
      if (d > 0.88 && ang < t + 0.02) put(r, x, y, f % 2 ? '#ffd890' : '#e8b858', 230);
      else if (d < 0.88 * t) put(r, x, y, '#0a0c14', Math.round(40 + t * 110));
    }
    // grietitas que salen del centro
    for (let c = 0; c < 6; c++) { const a = (c / 6) * Math.PI * 2 + 0.3; for (let s = 0; s < t * 18; s++) put(r, 48 + Math.cos(a) * s * 2 + Math.sin(s + c) * 1.2, 24 + Math.sin(a) * s * 0.9, '#c08a34', 200); }
    return r;
  });
}

/** `grieta_luz` (64 x 64, 6 cuadros): el brillo de las grietas cuando está aturdido. Rayas doradas quebradas que laten. */
export function crackGlow(): Raster[] {
  return Array.from({ length: 6 }, (_, f) => {
    const r = createRaster(64, 64), pulse = 0.55 + 0.45 * Math.sin((f / 6) * Math.PI * 2);
    for (let c = 0; c < 7; c++) {
      let x = 32 + (hash(c, 1, 81) - 0.5) * 30, y = 10 + hash(c, 2, 81) * 30;
      for (let s = 0; s < 18; s++) {
        put(r, x, y, s % 4 === 0 ? '#fff4d0' : '#ffd890', Math.round(255 * pulse));
        put(r, x + 1, y, '#c08a34', Math.round(140 * pulse));
        x += (hash(c, s, 82) - 0.5) * 3; y += 1 + hash(s, c, 83) * 0.6;
        if (y >= 63) break;
      }
    }
    // el resplandor alrededor
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const i = (y * 64 + x) * 4; if (!r.data[i + 3]) { const d = Math.hypot(x - 32, y - 34) / 30; if (d < 1) put(r, x, y, '#ffd890', Math.round((1 - d) ** 2 * 60 * pulse)); } }
    return r;
  });
}

/** `nota_cuna` (16 x 16, 6 cuadros): una nota de piedra de la canción de cuna que flota y se mece, con brillo lila. */
export function lullabyNote(): Raster[] {
  return Array.from({ length: 6 }, (_, f) => {
    const r = createRaster(16, 16), ph = (f / 6) * Math.PI * 2, ox = Math.sin(ph) * 1.5, oy = Math.cos(ph) * 1;
    // el halo lila
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7 - ox, y - 10 - oy) / 7; if (d < 1) put(r, x, y, '#b89aff', Math.round((1 - d) ** 2 * 120)); }
    // la cabeza de la nota y el palito con su banderita
    for (let y = -2; y <= 2; y++) for (let x = -3; x <= 3; x++) if ((x / 3.2) ** 2 + (y / 2.2) ** 2 < 1) put(r, 6 + x + ox, 11 + y + oy, y < 0 && x < 1 ? '#e8e8f4' : '#a8aebb');
    for (let y = 2; y < 11; y++) put(r, 9 + ox, y + oy, '#c8ccd8');
    for (let t = 0; t < 4; t++) put(r, 10 + t + ox, 3 + t * 0.8 + oy, '#a8aebb');
    put(r, 5 + ox, 10 + oy, '#ffffff');
    return r;
  });
}

void rotZ;
