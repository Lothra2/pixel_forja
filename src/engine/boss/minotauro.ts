import { type V3, add, sub, mul, norm, cross, dot, mv, rotX, rotY, rotZ, mm } from './sdf';
import { Body, along, lookRot, loc } from './build';
import { bipedDims, solveBiped, type BossPose, type BossDims } from './rig';
import { makeBossRamp, type BossScene, type BossMaterial } from './render';
import type { Secondary } from './secondary';
import type { BossSpec } from './sheet';
import { weaponHead } from './sheet';
import { MINO_ANIMS } from './minotauroAnims';

/**
 * El Minotauro del Bosque, dibujado a su tamaño (celda 128, unos 105 px de alto, 2.4 veces la heroína).
 * Toro de pelo marrón con mechones, joroba de toro, cuernos grandes de marfil, argolla de oro en la nariz,
 * correaje de cuero con remaches y un mazo de hierro con bandas de bronce que pesa.
 */

export const MINO_DIMS = { hipH: 50, hipW: 9.5, legU: 27, legL: 25, foot: 9, spine: 31, shW: 19, armU: 21, armL: 20, hand: 6, neck: 9, head: 14, weaponLen: 34, weaponR: 7 };

/**
 * A escala 0.8: el cuerpo queda en unos 94 px con los cuernos (2.2 veces la heroína). En la vista de arriba lo que
 * está delante de los pies baja en pantalla, y el mazazo necesita ese lugar debajo del apoyo dentro de la celda.
 */
export const MINO_SCALE = 0.8;
export function minoDims(cell: number): BossDims { return bipedDims(cell * MINO_SCALE, MINO_DIMS); }

export function minoMaterials(freed = 0): Record<string, BossMaterial> {
  // liberado: los ojos dejan de brillar violeta y el pelo recupera el tono tibio
  const eye = freed > 0.5 ? ['#1b1218', '#3a2a24', '#fff6e0'] : ['#2a0f3a', '#b46cff', '#f4dcff'];
  return {
    fur: { ramp: makeBossRamp('#7a4a2c', 7, { spread: 1.3 }), surface: 'fur', tex: 0.9, scale: 2.4 },
    furDark: { ramp: makeBossRamp('#4a2a1a', 6, { spread: 1.2 }), surface: 'fur', tex: 0.9, scale: 2.2 },
    furLight: { ramp: makeBossRamp('#a87652', 6), surface: 'fur', tex: 0.7, scale: 2.4 },
    muzzle: { ramp: makeBossRamp('#a87462', 6), surface: 'skin', tex: 0.5, scale: 2 },
    hand: { ramp: makeBossRamp('#5e3d2b', 6), surface: 'skin', tex: 0.4 },
    horn: { ramp: makeBossRamp('#e8d5a6', 6, { spread: 1.1 }), surface: 'horn', tex: 0.8, scale: 2 },
    hoof: { ramp: makeBossRamp('#3e2e2b', 5), surface: 'horn', tex: 0.5 },
    leather: { ramp: makeBossRamp('#5e3c23', 6), surface: 'leather', tex: 0.8, scale: 1.6 },
    gold: { ramp: makeBossRamp('#d6a23e', 6, { spread: 1.2 }), surface: 'metal', tex: 0.4 },
    iron: { ramp: makeBossRamp('#7c8694', 6, { spread: 1.25 }), surface: 'metal', tex: 0.8, scale: 1.5 },
    wood: { ramp: makeBossRamp('#6b4628', 6), surface: 'wood', tex: 0.9, scale: 1.4 },
    cloth: { ramp: makeBossRamp('#7c2c2a', 6), surface: 'cloth', tex: 0.6, scale: 2.5 },
    eye: { ramp: eye, surface: 'glow' },
    eyeDark: { ramp: ['#120a10', '#1f141a'], surface: 'eye' },
    nostril: { ramp: ['#24130f', '#341d16'], surface: 'eye' },
    aura: { ramp: ['#4a1e7a', '#9a5ae0', '#e2c4ff'], surface: 'glow' },
  };
}

/** Arma la escena del minotauro para una pose. `sec` trae el retraso de las partes que cuelgan (cola, taparrabo). */
export function minotaurScene(cell: number, pose: BossPose, sec?: Secondary): BossScene {
  const d = minoDims(cell);
  const s = d.s;
  const j = solveBiped(d, pose);
  const B = new Body();
  const S = (v: V3): V3 => mul(v, s);
  const body = j.body, ch = j.chest, hm = j.headM;
  const fur = 1.1 * s;

  // ---------- torso (un solo grupo de carne: se funde) ----------
  const pelC = loc(body, j.pelvis, S([0, 3, 0]));
  B.ell(pelC, S([11, 9, 12.5]), 'fur', 1, { rot: body, bump: fur });
  B.ell(loc(ch, j.pelvis, S([1.5, 13, 0])), S([13, 12, 14.5]), 'fur', 1, { rot: ch, bump: fur });
  const chestC = loc(ch, j.pelvis, S([2.5, 24, 0])), chestR = S([15, 13, 18.5]);
  B.ell(chestC, chestR, 'fur', 1, { rot: ch, bump: fur });
  // pecho claro y pectorales
  for (const zs of [1, -1]) B.ell(loc(ch, j.pelvis, S([10, 22.5, 7.5 * zs])), S([7, 7.5, 8]), 'furLight', 1, { rot: ch, bump: fur * 0.7 });
  // joroba de toro detrás del cuello
  B.ell(loc(ch, j.pelvis, S([-6, 27.5, 0])), S([11, 7.5, 13.5]), 'fur', 1, { rot: mm(ch, rotZ(18)), bump: fur });
  // hombros
  B.ell(j.shoulders.near, S([8.5, 8.5, 8.5]), 'fur', 1, { rot: ch, bump: fur });
  B.ell(j.shoulders.far, S([8.5, 8.5, 8.5]), 'fur', 1, { rot: ch, bump: fur });
  // cuello grueso que lleva la cabeza hacia adelante
  B.cone(loc(ch, j.chestTop, S([-3, -2, 0])), loc(hm, j.headC, S([-5, -4, 0])), 10 * s, 9 * s, 'fur', 1, { bump: fur });

  // ---------- cabeza ----------
  const hs = s * 1.42;
  const HS = (v: V3): V3 => mul(v, hs);
  const H = (v: V3): V3 => loc(hm, j.headC, HS(v));
  const mouth = pose.face?.mouth ?? 0;
  B.ell(H([0, 0, 0]), HS([10, 9.5, 9]), 'fur', 2, { rot: hm, bump: fur * 0.8 });
  B.ell(H([8.5, -4.5, 0]), HS([7.5, 6.5, 7.4]), 'muzzle', 2, { rot: hm });
  B.ell(H([6, -8.5 - mouth * 3, 0]), HS([6.5, 3, 6.2]), 'muzzle', 2, { rot: mm(hm, rotZ(-mouth * 18)) });
  // cejas pesadas: fruncidas en guardia, arriba si está feliz o liberado
  const browTilt = pose.face?.eyes === 'angry' ? 14 : pose.face?.eyes === 'happy' ? -10 : 4;
  for (const zs of [1, -1]) B.ell(H([5.5, 4.5, 5 * zs]), HS([3.6, 2.3, 4.6]), 'furDark', 2, { rot: mm(hm, rotX(browTilt * zs)), bump: fur * 0.5 });
  // mechón de la frente
  B.chain([H([-3, 8, 0]), H([3, 10.5, 0]), H([7.5, 8, 1]), H([9, 4.5, 0])], [4.2 * hs, 3.6 * hs, 2.2 * hs, 0.9 * hs], 'furDark', 2, { bump: fur });
  // orejas horizontales
  for (const zs of [1, -1]) B.ell(H([-2, 3.5, 10 * zs]), HS([3.2, 1.8, 5]), 'furDark', 2, { rot: mm(hm, rotX(-25 * zs)) });
  // ojos: brillo del encantamiento (violeta) o mirada tibia cuando se libera
  const eyes = pose.face?.eyes ?? 'open';
  for (const zs of [1, -1]) {
    if (eyes === 'closed' || eyes === 'happy') B.ell(H([7.2, 1.5, 6.4 * zs]), HS([1.4, 0.55, 1.4]), 'eyeDark', 4, { rot: hm });
    else B.ell(H([6.6, 1.6, 6.9 * zs]), HS([1.7, 1.9, 1.6]), eyes === 'dizzy' ? 'eyeDark' : 'eye', 4, { rot: hm });
  }
  for (const zs of [1, -1]) B.ell(H([15.6, -3.4, 3 * zs]), HS([1.3, 1.5, 1.4]), 'nostril', 5, { rot: hm });
  // argolla de oro en la nariz (el anillo cuelga en el plano del cuerpo)
  // mirando hacia adelante: de frente y en diagonal se lee como un aro (de canto parecería un pico)
  B.torus(H([15.5, -7.5, 0]), 3.2 * hs, 0.95 * hs, 'gold', 6, mm(hm, rotY(90)));
  // cuernos de marfil: salen hacia los costados, suben y se curvan hacia adelante
  for (const zs of [1, -1]) {
    const pts: V3[] = [[-1, 6, 7 * zs], [0, 8.5, 14.5 * zs], [2.5, 11.5, 19.5 * zs], [6, 14.5, 21.5 * zs], [9, 16.5, 19.5 * zs]].map((v) => H(v as V3));
    B.chain(pts, [3.8 * hs, 3.1 * hs, 2.3 * hs, 1.4 * hs, 0.5 * hs], 'horn', 3);
  }

  // ---------- brazos ----------
  const arm = (side: 'near' | 'far', g: number) => {
    const sh = j.shoulders[side], el = j.elbows[side], hd = j.hands[side];
    B.cone(sh, el, 7.2 * s, 5.6 * s, 'fur', g, { bump: fur });
    B.cone(el, hd, 6 * s, 4.8 * s, 'fur', g, { bump: fur * 0.8 });
    // músculos: bíceps y antebrazo abultados (se funden con el brazo)
    const upAx = norm(sub(el, sh)), loAx = norm(sub(hd, el));
    B.ell(along(sh, el, 0.5), S([9, 6.6, 6.6]), 'fur', g, { rot: lookRot(upAx), bump: fur, grain: 0 });
    B.ell(along(el, hd, 0.3), S([7.5, 6.4, 6.2]), 'fur', g, { rot: lookRot(loAx), bump: fur, grain: 0 });
    // brazalete de cuero con remaches
    B.cone(along(el, hd, 0.42), along(el, hd, 0.86), 6.5 * s, 5.8 * s, 'leather', g + 1);
    const ax = norm(sub(hd, el));
    const side3 = norm(cross(ax, [0, 1, 0]));
    for (const t of [0.5, 0.75]) B.ell(add(along(el, hd, t), mul(side3, (side === 'near' ? 6.6 : -6.6) * s)), S([0.9, 0.9, 0.9]), 'gold', 7);
    // puño
    B.ell(hd, S([6.2, 5.6, 5.6]), 'hand', g, { rot: lookRot(ax) });
  };
  arm('far', 12);
  arm('near', 10);

  // ---------- piernas ----------
  const leg = (side: 'near' | 'far', g: number) => {
    const hp = j.hips[side], kn = j.knees[side], an = j.ankles[side], to = j.toes[side];
    B.cone(hp, kn, 8.6 * s, 6.6 * s, 'fur', g, { bump: fur });
    B.cone(kn, an, 6.4 * s, 4.4 * s, 'furDark', g, { bump: fur });
    // muslo y pantorrilla con forma
    B.ell(along(hp, kn, 0.45), S([12, 9.4, 9]), 'fur', g, { rot: lookRot(norm(sub(kn, hp))), bump: fur, grain: 0 });
    B.ell(add(along(kn, an, 0.3), mul(norm(mv(j.body, [-1, 0, 0])), 1.5 * s)), S([8, 6.4, 6]), 'furDark', g, { rot: lookRot(norm(sub(an, kn))), bump: fur, grain: 0 });
    // pezuña hendida con mechón arriba
    const fd = norm(sub(to, an));
    B.ell(add(along(an, to, 0.42), S([0, -1.2, 0])), S([6.4, 3.8, 5.4]), 'hoof', g + 1, { rot: lookRot(fd) });
    B.ell(add(an, S([0, 1.5, 0])), S([4.8, 3, 5]), 'furDark', g, { rot: lookRot(fd), bump: fur * 1.3 });
  };
  leg('far', 22);
  leg('near', 20);

  // ---------- correaje ----------
  // cinturón ancho que abraza la cintura, con hebilla de bronce
  const up = mv(body, [0, 1, 0]);
  const beltC = loc(body, j.pelvis, S([0.5, 7, 0]));
  const beltBase = { kind: 'ell' as const, c: beltC, r: S([12.6, 10, 13.8]), m: [[...mv(body, [1, 0, 0])], [...up], [...mv(body, [0, 0, 1])]] as [V3, V3, V3] };
  B.band(beltBase, 1.2 * s, up, dot(up, beltC), 3 * s, 'leather', 30);
  const fwdB = mv(body, [1, 0, 0]);
  B.box(add(beltC, mul(fwdB, 14 * s)), S([1.2, 3.4, 3.6]), 'gold', 31, { rot: body, round: 0.8 * s });
  // bandolera cruzada del hombro lejano a la cadera cercana, con remaches
  const a0 = loc(ch, j.pelvis, S([0, 35, -15])), a1 = loc(ch, j.pelvis, S([0, 8, 15]));
  const strapN = norm(cross(mv(ch, [1, 0, 0]), sub(a1, a0)));
  const chestShape = { kind: 'ell' as const, c: chestC, r: chestR, m: [[...mv(ch, [1, 0, 0])], [...mv(ch, [0, 1, 0])], [...mv(ch, [0, 0, 1])]] as [V3, V3, V3] };
  B.band(chestShape, 1.3 * s, strapN, dot(strapN, a0), 2.6 * s, 'leather', 32);
  for (const t of [0.22, 0.42, 0.62, 0.82]) {
    const p = along(a0, a1, t);
    const dir = sub(add(p, mul(mv(ch, [1, 0, 0]), 20 * s)), chestC);
    const local = mv([[...mv(ch, [1, 0, 0])], [...mv(ch, [0, 1, 0])], [...mv(ch, [0, 0, 1])]] as [V3, V3, V3], dir);
    const q = surfacePoint(chestC, chestR, ch, local, 1.6 * s);
    B.ell(q, S([1, 1, 1]), 'gold', 33);
  }

  // ---------- taparrabo y cola (cuelgan con retraso) ----------
  const swayF = sec?.flap ?? 0, swayT = sec?.tail ?? 0;
  for (const [fx, g, k] of [[1, 40, 1], [-1, 41, 0.7]] as const) {
    const top = add(beltC, mul(fwdB, fx * 12.5 * s));
    const hang = norm(mv(body, [fx * 0.18 - swayF * 0.5 * k, -1, 0]));
    const rot = lookRot(hang, mul(fwdB, fx));
    B.box(add(top, mul(hang, 8.5 * s)), S([8.5, 1.1, 7]), 'cloth', g, { rot, round: 0.8 * s });
  }
  const tb = loc(body, j.pelvis, S([-12, 6, 0]));
  const ta = ((-115 + swayT * 25) * Math.PI) / 180;
  const tdir = mv(body, [Math.cos(ta), Math.sin(ta), swayT * 0.25]);
  const tm = add(tb, mul(norm(tdir), 12 * s));
  const tdir2 = mv(body, [Math.cos(ta - 0.45 - swayT * 0.4), Math.sin(ta - 0.45), swayT * 0.35]);
  const tt = add(tm, mul(norm(tdir2), 11 * s));
  B.chain([tb, tm, tt], [2.6 * s, 2 * s, 1.5 * s], 'fur', 50, { bump: fur * 0.5 });
  B.ell(add(tt, mul(norm(tdir2), 2.5 * s)), S([4.2, 2.6, 2.6]), 'furDark', 50, { rot: lookRot(tdir2), bump: fur * 1.2 });

  // ---------- el encantamiento que se va (al liberarse): chispas violetas que suben y se apagan ----------
  const aura = pose.aura ?? 0;
  if (aura > 0.02) {
    const t = pose.extra?.t ?? 0;
    for (let i = 0; i < 9; i++) {
      const a = i * 2.39996 + t * 0.6;
      const h = ((i * 17 + t * 34) % 70) + 22;
      const rr = (16 + (i % 3) * 6) * s;
      const size = (1.1 + (i % 2) * 0.7) * s * Math.min(1, aura * 1.4) * (1 - h / 120);
      if (size < 0.5) continue;
      B.ell([j.pelvis[0] + Math.cos(a) * rr, h * s, j.pelvis[2] + Math.sin(a) * rr], [size, size * 1.4, size], 'aura', 90 + i);
    }
  }

  // ---------- el mazo ----------
  if (pose.weapon?.drop) {
    // tirado en el piso, a un lado
    const base: V3 = add([(pose.root.x ?? 0) * s, 0, 0], S([16, 0, 14]));
    const dir: V3 = norm([0.85, 0, -0.5]);
    const strike: V3 = [0, 1, 0];
    const top = add(base, mul(dir, 30 * s));
    B.cone(add(base, S([0, 2.3, 0])), add(top, S([0, 2.3, 0])), 2.3 * s, 2.1 * s, 'wood', 60);
    const rot = mt3cols(strike, dir, cross(strike, dir));
    B.box(add(top, S([0, 7.5, 0])), S([7.5, 7.5, 12]), 'iron', 62, { rot: mt3cols(dir, [0, 1, 0], cross(dir, [0, 1, 0])), round: 1.6 * s });
    void rot;
  }
  if (j.weapon) {
    const { grip, dir } = j.weapon;
    const sideAx = mv(body, [0, 0, 1]);
    const strike = norm(cross(dir, sideAx));
    const top = add(grip, mul(dir, 34 * s));
    B.cone(add(grip, mul(dir, -9 * s)), add(top, mul(dir, 2 * s)), 2.3 * s, 2.1 * s, 'wood', 60);
    // pomo
    B.ell(add(grip, mul(dir, -10 * s)), S([2.8, 2.8, 2.8]), 'iron', 61);
    const rot = mt3cols(strike, dir, cross(strike, dir));
    B.box(top, S([10, 6.8, 6.8]), 'iron', 62, { rot, round: 1.5 * s });
    for (const k of [-6.5, 6.5]) B.box(add(top, mul(strike, k * s)), S([1.5, 7.4, 7.4]), 'gold', 63, { rot, round: 0.8 * s });
  }

  return { pieces: B.pieces, materials: minoMaterials(pose.freed ?? 0), smooth: { 1: 7 * s, 2: 3 * s, 10: 4 * s, 12: 4 * s, 20: 4 * s, 22: 4 * s, 50: 2 * s } };
}

/** Matriz con columnas dadas. */
function mt3cols(x: V3, y: V3, z: V3): [V3, V3, V3] {
  return [[x[0], y[0], z[0]], [x[1], y[1], z[1]], [x[2], y[2], z[2]]];
}

/** Punto de la superficie de un elipsoide girado (rot = columnas ejes) en una dirección local, un poco afuera. */
function surfacePoint(c: V3, r: V3, rot: [V3, V3, V3], dirLocal: V3, out: number): V3 {
  const d = norm(dirLocal);
  const t = 1 / Math.hypot(d[0] / r[0], d[1] / r[1], d[2] / r[2]);
  return add(c, mv(rot, mul(d, t + out)));
}

/** El minotauro listo para el kit: celda 128, sus animaciones y dónde pega el mazo. */
export const MINO_SPEC: BossSpec = { id: 'minotauro', cell: 128, dims: minoDims, scene: minotaurScene, anims: MINO_ANIMS, strikePoint: weaponHead(34), elev: 24 };
