import { type V3, add, sub, mul, norm, cross, dot, mv, rotX, rotY, rotZ, mm } from './sdf';
import { Body, along, lookRot, loc } from './build';
import { bipedDims, solveBiped, type BossPose, type BossDims } from './rig';
import { makeBossRamp, type BossScene, type BossMaterial } from './render';
import type { Secondary } from './secondary';
import { weaponHead, type BossSpec } from './sheet';
import { MINO_ANIMS } from './minotauroAnims';

/**
 * El Guardián de la Campana, jefe de la Catedral de las Raíces, a su tamaño (celda 128).
 * Un gólem de cobre con verdín: el pecho es una jaula de hierro y adentro cuelga la campana, que se mece con
 * retraso cuando el guardián se mueve. Raíces enredadas en brazos, piernas y hombros. Pega con un mazo de campanero.
 *
 * Dos colores: encantado, las grietas, los ojos y los brotes de las raíces brillan violeta; libre (al final de
 * `die` y en `libre`), turquesa.
 */

export const GUARDIAN_DIMS = { hipH: 46, hipW: 11, legU: 25, legL: 22, foot: 10, spine: 30, shW: 21, armU: 21, armL: 20, hand: 7, neck: 6, head: 11, weaponLen: 34, weaponR: 7 };
export const GUARDIAN_SCALE = 0.8;
export function guardianDims(cell: number): BossDims { return bipedDims(cell * GUARDIAN_SCALE, GUARDIAN_DIMS); }

export function guardianMaterials(freed = 0): Record<string, BossMaterial> {
  const glow = freed > 0.5 ? '#5ae0d0' : '#b46cff';
  const glowRamp = freed > 0.5 ? ['#1d6a66', '#5ae0d0', '#d4fff6'] : ['#4a1e7a', '#b46cff', '#f0dcff'];
  return {
    copper: { ramp: makeBossRamp('#8e5634', 7, { spread: 1.2 }), surface: 'metal', tex: 0.7, scale: 1.8, patch: { mat: 'verdigris', amount: 0.2, scale: 4, below: 0.45 } },
    verdigris: { ramp: makeBossRamp('#3f7f70', 6, { spread: 1.1 }), surface: 'stone', tex: 0.6, scale: 2 },
    iron: { ramp: makeBossRamp('#4a5060', 6, { spread: 1.2 }), surface: 'metal', tex: 0.6, scale: 1.5 },
    bronze: { ramp: makeBossRamp('#b07e3a', 7, { spread: 1.25 }), surface: 'metal', tex: 0.6, scale: 2, patch: { mat: 'verdigris', amount: 0.16, scale: 3.5, below: 0.4 } },
    root: { ramp: makeBossRamp('#5a3e2a', 6, { spread: 1.15 }), surface: 'wood', tex: 0.9, scale: 1.2 },
    wood: { ramp: makeBossRamp('#6b4628', 6), surface: 'wood', tex: 0.9, scale: 1.4 },
    glow: { ramp: glowRamp, surface: 'glow' },
    eyeGlow: { ramp: glowRamp, surface: 'glow' },
    aura: { ramp: glowRamp, surface: 'glow' },
    dark: { ramp: ['#120e16', '#1c1822'], surface: 'eye' },
    _glowHex: { ramp: [glow], surface: 'glow' },
  };
}

/** Arma la escena del guardián para una pose. */
export function guardianScene(cell: number, pose: BossPose, sec?: Secondary): BossScene {
  const d = guardianDims(cell);
  const s = d.s;
  const j = solveBiped(d, pose);
  const B = new Body();
  const S = (v: V3): V3 => mul(v, s);
  const body = j.body, ch = j.chest, hm = j.headM;
  const fwd = mv(body, [1, 0, 0]);

  // ---------- pelvis y cintura de hierro ----------
  B.box(loc(body, j.pelvis, S([0, 2, 0])), S([10, 7, 12.5]), 'copper', 1, { rot: body, round: 4 * s });
  B.cone(loc(ch, j.pelvis, S([0, 6, 0])), loc(ch, j.pelvis, S([0, 13, 0])), 9 * s, 10 * s, 'iron', 2);

  // ---------- pecho: jaula con la campana adentro ----------
  // placa de la espalda y hombros (lo que tapa la jaula por detrás)
  B.ell(loc(ch, j.pelvis, S([-6, 23, 0])), S([8, 12, 17]), 'copper', 3, { rot: ch });
  B.ell(loc(ch, j.pelvis, S([-2, 31, 0])), S([12, 6.5, 19]), 'copper', 3, { rot: ch });
  // pecho de placas con dos costillas de hierro
  B.box(loc(ch, j.pelvis, S([2, 22, 0])), S([11, 11, 16]), 'copper', 3, { rot: ch, round: 5 * s });
  // costura de hierro con remaches entre la placa del pecho y la de la panza
  B.band({ kind: 'box', c: loc(ch, j.pelvis, S([2, 22, 0])), h: S([11, 11, 16]), m: [[...mv(ch, [1, 0, 0])], [...mv(ch, [0, 1, 0])], [...mv(ch, [0, 0, 1])]] as [V3, V3, V3], round: 5 * s }, 0.8 * s, mv(ch, [0, 1, 0]), dot(mv(ch, [0, 1, 0]), loc(ch, j.pelvis, S([2, 17, 0]))), 1.2 * s, 'iron', 5);
  for (const [y, r] of [[18, 13], [25, 14]] as const) B.torus(loc(ch, j.pelvis, S([1, y, 0])), r * s, 1.4 * s, 'iron', 4, mm(ch, rotX(90)));
  // la campana: cuelga de un yugo delante de la panza y se mece con retraso (se lee de frente y de costado)
  const yoke = loc(ch, j.pelvis, S([14, 24, 0]));
  B.cone(loc(ch, j.pelvis, S([11, 25, -7])), loc(ch, j.pelvis, S([11, 25, 7])), 1.6 * s, 1.6 * s, 'iron', 6);
  const swing = (sec?.hangX ?? 0) * 26 + (pose.extra?.bell ?? 0);
  const bellM = mm(ch, rotZ(swing));
  const bellTop = loc(bellM, yoke, S([0, -2, 0]));
  B.cone(yoke, bellTop, 1.2 * s, 1.2 * s, 'iron', 6);
  const bellC = loc(bellM, yoke, S([1, -9, 0]));
  B.cone(loc(bellM, bellC, S([0, 4.5, 0])), loc(bellM, bellC, S([0, -5.5, 0])), 5 * s, 9.5 * s, 'bronze', 7);
  B.torus(loc(bellM, bellC, S([0, -5.5, 0])), 9.2 * s, 1.5 * s, 'bronze', 7, mm(bellM, rotX(90)));
  // boca oscura, badajo y runas que brillan (violeta encantado, turquesa libre)
  B.ell(loc(bellM, bellC, S([0, -7, 0])), S([6.5, 1.3, 6.5]), 'dark', 8, { rot: bellM });
  B.ell(loc(mm(bellM, rotZ(-swing * 0.6)), bellC, S([0, -8.5, 0])), S([2, 2.4, 2]), 'iron', 9);
  for (const zs of [-1, 0, 1]) B.ell(loc(bellM, bellC, S([7.8, -1.5, zs * 3.5])), S([0.8, 1.8, 0.9]), 'glow', 10, { rot: bellM });

  // ---------- hombreras ----------
  for (const side of ['near', 'far'] as const) {
    const sh = j.shoulders[side];
    B.ell(add(sh, S([0, 2, 0])), S([9.5, 7.5, 9]), 'copper', side === 'near' ? 11 : 12, { rot: ch });
    // remaches en el borde
    for (let i = 0; i < 4; i++) {
      const a = -0.8 + i * 0.55;
      B.ell(add(sh, mv(ch, [Math.cos(a) * 8.5 * s, 3 * s, Math.sin(a) * 8 * s * (side === 'near' ? 1 : -1)])), S([0.9, 0.9, 0.9]), 'iron', 13);
    }
  }

  // ---------- cabeza: yelmo de cobre con visera que brilla ----------
  const H = (v: V3): V3 => loc(hm, j.headC, S(v));
  // yelmo con forma de campana: angosto arriba, ancho abajo, con aro de hierro y perilla
  B.ell(H([0, 4.5, 0]), S([7.5, 6, 7.5]), 'copper', 20, { rot: hm });
  B.cone(H([0, 4, 0]), H([0, -3, 0]), 7.5 * s, 10.5 * s, 'copper', 20);
  B.torus(H([0, -3.5, 0]), 10 * s, 1.5 * s, 'iron', 21, mm(hm, rotX(90)));
  B.ell(H([0, 10.8, 0]), S([2.2, 2, 2.2]), 'iron', 21);
  const eyes = pose.face?.eyes ?? 'open';
  if (eyes === 'closed' || eyes === 'happy') B.box(H([8.4, -0.5, 0]), S([1, 0.6, 5]), 'dark', 22, { rot: hm });
  else B.box(H([8.2, 0, 0]), S([1.2, 1.3, 5.4]), eyes === 'dizzy' ? 'dark' : 'eyeGlow', 22, { rot: hm });
  // cuello hundido entre las hombreras
  B.cone(loc(ch, j.chestTop, S([0, -2, 0])), loc(hm, j.headC, S([-2, -6, 0])), 6.5 * s, 6 * s, 'iron', 2);

  // ---------- brazos de placas con raíces enredadas ----------
  const arm = (side: 'near' | 'far', g: number) => {
    const sh = j.shoulders[side], el = j.elbows[side], hd = j.hands[side];
    B.cone(sh, el, 7 * s, 6 * s, 'copper', g);
    B.ell(el, S([5.5, 5.5, 5.5]), 'iron', g + 1);
    B.cone(el, hd, 6.4 * s, 6.8 * s, 'copper', g);
    B.ell(hd, S([6.4, 6, 6]), 'iron', g + 1, { rot: lookRot(norm(sub(hd, el))) });
    // raíz que da vueltas por el brazo
    const ax = norm(sub(hd, sh)), ref = norm(cross(ax, [0, 1, 0.3]));
    const pts: V3[] = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6, a = t * Math.PI * 3.2;
      const base = along(sh, hd, t);
      const r = (t < 0.5 ? 7.6 : 7) * s;
      pts.push(add(base, add(mul(ref, Math.cos(a) * r), mul(norm(cross(ax, ref)), Math.sin(a) * r))));
    }
    B.chain(pts, pts.map((_, i) => (2.4 - i * 0.16) * s), 'root', g + 2, { bump: 0.5 * s });
  };
  arm('far', 30);
  arm('near', 34);

  // ---------- piernas: columnas de cobre con botas de hierro ----------
  const leg = (side: 'near' | 'far', g: number) => {
    const hp = j.hips[side], kn = j.knees[side], an = j.ankles[side], to = j.toes[side];
    B.cone(hp, kn, 8.5 * s, 7 * s, 'copper', g);
    B.ell(kn, S([5.5, 5.5, 5.5]), 'iron', g + 1);
    B.cone(kn, an, 7 * s, 6.5 * s, 'copper', g);
    const fd = norm(sub(to, an));
    B.box(add(along(an, to, 0.4), S([0, -1.5, 0])), S([7.5, 3.5, 6.5]), 'iron', g + 1, { rot: lookRot(fd), round: 1.5 * s });
    // raíces que suben desde el piso
    const up: V3 = [0, 1, 0];
    const side3 = norm(cross(fd, up));
    B.chain([add(an, mul(side3, 6 * s)), add(along(an, kn, 0.5), mul(side3, 7 * s)), add(kn, mul(norm(add(side3, fwd)), 6 * s))], [2.6 * s, 2 * s, 1.2 * s], 'root', g + 2, { bump: 0.5 * s });
  };
  leg('far', 40);
  leg('near', 44);

  // ---------- raíces grandes en los hombros, con brotes que brillan ----------
  for (const zs of [1, -1]) {
    const base = loc(ch, j.pelvis, S([-6, 31, 15 * zs]));
    const pts: V3[] = [base, loc(ch, j.pelvis, S([-10, 36, 20 * zs])), loc(ch, j.pelvis, S([-8, 41, 24 * zs])), loc(ch, j.pelvis, S([-3, 43, 26 * zs]))];
    B.chain(pts, [3.2 * s, 2.5 * s, 1.7 * s, 0.8 * s], 'root', 50, { bump: 0.6 * s });
    B.ell(pts[3], S([1.8, 2.2, 1.8]), 'glow', 51);
    B.ell(pts[2], S([1.4, 1.6, 1.4]), 'glow', 51);
  }

  // ---------- encantamiento que se va ----------
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

  // ---------- mazo de campanero ----------
  if (pose.weapon?.drop) {
    const base: V3 = add([(pose.root.x ?? 0) * s, 0, 0], S([16, 0, 14]));
    const dir: V3 = norm([0.85, 0, -0.5]);
    const top = add(base, mul(dir, 30 * s));
    B.cone(add(base, S([0, 2.3, 0])), add(top, S([0, 2.3, 0])), 2.3 * s, 2.1 * s, 'wood', 60);
    B.ell(add(top, S([0, 7, 0])), S([7, 7, 9]), 'bronze', 62, { rot: lookRot(dir) });
  }
  if (j.weapon) {
    const { grip, dir } = j.weapon;
    const strike = norm(cross(dir, mv(body, [0, 0, 1])));
    const top = add(grip, mul(dir, 34 * s));
    B.cone(add(grip, mul(dir, -9 * s)), add(top, mul(dir, 2 * s)), 2.3 * s, 2.1 * s, 'wood', 60);
    B.ell(add(grip, mul(dir, -10 * s)), S([2.8, 2.8, 2.8]), 'iron', 61);
    // cabeza del mazo: un tambor de bronce acolchado, como el de los campaneros
    B.cone(add(top, mul(strike, -6.5 * s)), add(top, mul(strike, 6.5 * s)), 7.4 * s, 7.4 * s, 'bronze', 62);
    for (const k of [-6.8, 6.8]) B.torus(add(top, mul(strike, k * s)), 7 * s, 1.2 * s, 'iron', 63, lookRot(strike, dir));
  }

  void dot; void rotY;
  return { pieces: B.pieces, materials: guardianMaterials(pose.freed ?? 0), smooth: { 1: 4 * s, 3: 5 * s, 20: 3 * s, 30: 2 * s, 34: 2 * s, 40: 2 * s, 44: 2 * s } };
}

/**
 * Las mismas poses que el minotauro (mismo esqueleto bípedo y mismos tiempos), más `libre`: el guardián de pie y en
 * paz, en turquesa, para cuando el juego lo muestra liberado.
 */
const libre = (() => {
  const idle = MINO_ANIMS.find((a) => a.name === 'idle')!;
  return { ...idle, name: 'libre', keys: idle.keys.map((k) => ({ ...k, pose: { ...k.pose, freed: 1, face: { eyes: 'happy' as const }, weapon: { angle: 0, drop: true } } })) };
})();

export const GUARDIAN_SPEC: BossSpec = {
  id: 'guardian_campana', cell: 128, dims: guardianDims, scene: guardianScene, anims: [...MINO_ANIMS, libre], strikePoint: weaponHead(34), elev: 24,
};
