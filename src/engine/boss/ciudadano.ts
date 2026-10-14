import { type V3, add, sub, mul, norm, cross, mv, mm, rotX, rotY, rotZ } from './sdf';
import { Body, lookRot, loc } from './build';
import { bipedDims, solveBiped, type BossPose, type BossDims, type Joints } from './rig';
import { makeBossRamp, renderBoss, type BossScene, type BossMaterial } from './render';
import type { Secondary } from './secondary';
import { createRaster, type Raster } from '../core/raster';

/**
 * La gente de La Ciudad Dormida (Mundo 5), con el motor de volúmenes de los jefes: un solo armado de persona para
 * las estatuas de los ciudadanos dormidos, los sonámbulos de piedra y el Relojero.
 *
 * - `look`: cómo es la persona despierta (piel, pelo, ropa, sombrero y lo que tiene en la mano).
 * - `pose.freed`: 0 es piedra clara (estatua dormida, con musgo plateado), 1 la persona de colores. En el medio la
 *   piedra se va y aparece el color.
 * - `pose.extra.glow`: los ojos del sonámbulo (celeste frío) que se prenden de a poco. `yawn`: la boca del bostezo.
 *   `book`, `bow`, `beat`: lo que se mueve de cada objeto (el libro, el arco del violín, los palillos).
 *
 * Ejes como todo el motor: x adelante, y arriba, z hacia el lado cercano. Pixeles de una celda de 128.
 */

export type CitizenProp = 'pala' | 'canasta' | 'violin' | 'tambor' | 'lanza' | 'libro' | 'regadera' | 'escudo' | 'llave' | 'bolsa' | null;

export interface CitizenLook {
  skin: string; hair: string; top: string; bottom: string; shoe: string;
  /** delantal, pañuelo o faja */
  accent?: string;
  hairStyle: 'corto' | 'mono' | 'trenzas' | 'largo' | 'calvo' | 'rizos';
  hat?: 'panadero' | 'casco' | 'gorra' | 'panuelo' | 'boina' | 'gorro_dormir' | null;
  hatHex?: string;
  /** vestido hasta los tobillos (1) o falda a la rodilla (0.5) */
  skirt?: number;
  apron?: boolean;
  beard?: string;
  glasses?: boolean;
  prop?: CitizenProp;
  propHex?: string;
  child?: boolean;
  /** panza (0 a 1) */
  belly?: number;
  /** lo que tiene en la mano no es de piedra (la llave dorada del Relojero) */
  propVivo?: boolean;
}

/** Piedra de las estatuas: de #3a4050 a #c8ccd8, y el musgo plateado. */
export const PIEDRA_ESTATUA = ['#3a4050', '#525a6a', '#6c7484', '#8a91a0', '#a8aebb', '#c8ccd8'];
export const MUSGO = '#9aa8b8';
export const OJO_SONAMBULO = '#7ad0ff';

const ADULT = { hipH: 40, hipW: 7.5, legU: 20, legL: 19, foot: 8, spine: 29, shW: 13.5, armU: 17.5, armL: 17, hand: 5, neck: 5, head: 11.5, weaponLen: 30, weaponR: 4 };
const CHILD = { hipH: 27, hipW: 6, legU: 13.5, legL: 13, foot: 6.5, spine: 21, shW: 10, armU: 12.5, armL: 12, hand: 4, neck: 4, head: 11, weaponLen: 20, weaponR: 3 };

export const citizenDims = (look: CitizenLook, k = 1) => (cell: number): BossDims => bipedDims(cell * k, look.child ? CHILD : ADULT);

export function mixHex(a: string, b: string, t: number): string {
  if (t <= 0) return a;
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * Math.min(1, t)).toString(16).padStart(2, '0')).join('');
}
const lum = (h: string) => { const v = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); return (v[0] * 0.3 + v[1] * 0.59 + v[2] * 0.11) / 255; };

/**
 * Los materiales de una persona entre piedra (freed 0) y color (freed 1). La piedra conserva algo de la luz de cada
 * cosa (la cara y las manos más claras que la ropa, el pelo más oscuro): así la estatua se lee entera.
 */
export function citizenMaterials(look: CitizenLook, freed: number, glow = 0): Record<string, BossMaterial> {
  const stoneOf = (h: string, lift = 0) => mixHex('#5e6676', '#b4bac6', Math.max(0, Math.min(1, lum(h) * 1.15 + 0.12 + lift)));
  const m = (hex: string, surface: BossMaterial['surface'], lift = 0, tex = 0.5): BossMaterial => {
    const st = freed < 0.5;
    return {
      ramp: makeBossRamp(mixHex(stoneOf(hex, lift), hex, freed), 6, { spread: st ? 1.15 : 1.1, hue: st ? 8 : 22 }),
      surface: st ? 'stone' : surface, tex: st ? 0.32 : tex, scale: st ? 2.6 : 1.8,
      ...(freed < 0.35 ? { patch: { mat: 'moss', amount: 0.14 * (1 - freed / 0.35), scale: 3.5 } } : {}),
    };
  };
  return {
    skin: m(look.skin, 'skin', 0.12, 0.3),
    hair: m(look.hair, 'fur', -0.05, 0.8),
    top: m(look.top, 'cloth', 0, 0.5),
    bottom: m(look.bottom, 'cloth', -0.04, 0.5),
    shoe: m(look.shoe, 'leather', -0.1, 0.4),
    accent: m(look.accent ?? '#e8e0d0', 'cloth', 0.05, 0.4),
    hat: m(look.hatHex ?? '#f4f0e8', 'cloth', 0.08, 0.4),
    beard: m(look.beard ?? '#c8c8c0', 'fur', 0, 0.8),
    prop: look.propVivo ? { ramp: makeBossRamp(look.propHex ?? '#d0a848', 6, { spread: 1.25 }), surface: 'metal', tex: 0.5 } : m(look.propHex ?? '#8a5a32', look.prop === 'lanza' || look.prop === 'regadera' || look.prop === 'llave' || look.prop === 'escudo' ? 'metal' : 'wood', 0, 0.5),
    propB: m(look.prop === 'canasta' ? '#d8a050' : look.prop === 'tambor' ? '#e8dcc0' : look.prop === 'libro' ? '#f0e8d8' : look.prop === 'bolsa' ? '#b89a6a' : '#c8c8c8', 'cloth', 0.1, 0.3),
    lid: { ramp: makeBossRamp(mixHex('#4a5262', '#5a3a2a', freed), 4), surface: 'skin', tex: 0.1 },
    mouth: { ramp: freed > 0.5 ? ['#3a1a1a', '#5a2a2a', '#8a4a4a'] : ['#2c323e', '#3a4050', '#4a5262'], surface: 'skin', tex: 0.1 },
    eye: { ramp: ['#141820', '#2a3040'], surface: 'eye' },
    glowEye: { ramp: glow > 0.6 ? ['#3a8ac8', OJO_SONAMBULO, '#a8e4ff'] : ['#2a5a7a', '#4a98c8', '#a8dcff'], surface: 'glow' },
    sand: { ramp: ['#6a52a8', '#b89aff', '#f0e8ff'], surface: 'glow' },
    moss: { ramp: makeBossRamp(MUSGO, 5, { spread: 0.8 }), surface: 'fur', tex: 0.6, scale: 1.4 },
    glass: { ramp: ['#3a4a5a', '#8aa8c8', '#e0f0ff'], surface: 'metal', tex: 0.2 },
  };
}

/**
 * La escena de una persona. `k`: escala del cuerpo en la celda (los niños y los grandes caben igual).
 */
export function citizenScene(look: CitizenLook, cell: number, pose: BossPose, sec?: Secondary, k = 1): BossScene {
  const d = citizenDims(look, k)(cell), s = d.s, j = solveBiped(d, pose), B = new Body();
  const S = (v: V3): V3 => mul(v, s);
  const ch = j.chest, hm = j.headM, body = j.body;
  const ex = pose.extra ?? {};
  const kid = !!look.child;
  const belly = look.belly ?? 0;
  // ---------- el torso: pecho, panza y cintura ----------
  const sh = kid ? 0.78 : 1;
  B.ell(loc(ch, j.pelvis, S([0.5, 19 * sh, 0])), S([8.4 * sh + belly, 11 * sh, 11 * sh]), 'top', 1, { rot: ch });
  B.ell(loc(body, j.pelvis, S([1 + belly * 2, 7 * sh, 0])), S([8 * sh + belly * 3.2, 8 * sh, 10 * sh + belly]), 'top', 1, { rot: body });
  B.ell(loc(body, j.pelvis, S([0, 1, 0])), S([7.4 * sh, 5 * sh, 9.6 * sh]), 'bottom', 1, { rot: body });
  // la faja o el delantal
  if (look.apron) B.ell(loc(body, j.pelvis, S([6.4 * sh + belly * 3, 2 * sh, 0])), S([2.2, 12 * sh, 8 * sh]), 'accent', 7, { rot: mm(body, rotZ(-6)) });
  else if (look.accent && !look.skirt) B.ell(loc(body, j.pelvis, S([0, 6.5 * sh, 0])), S([8.6 * sh + belly * 3, 1.6, 10.6 * sh]), 'accent', 6, { rot: body });
  // ---------- piernas o falda ----------
  const kneeMid = mul(add(j.knees.near, j.knees.far), 0.5), ankMid = mul(add(j.ankles.near, j.ankles.far), 0.5);
  const flap = (sec?.flap ?? 0) * 2 * s;
  if (look.skirt) {
    const hem = look.skirt >= 1 ? add(ankMid, S([0, 3, 0])) : kneeMid;
    const hipC = loc(body, j.pelvis, S([0, 3, 0]));
    B.cone(hipC, [hem[0] - flap, hem[1], hem[2]], 8 * sh, (look.skirt >= 1 ? 10 : 10.5) * sh, 'bottom', 2);
  }
  for (const side of ['far', 'near'] as const) {
    const g = side === 'near' ? 44 : 40;
    if (!look.skirt || look.skirt < 1) {
      if (!look.skirt) B.cone(j.hips[side], j.knees[side], 4.6 * sh, 4 * sh, 'bottom', g);
      B.cone(j.knees[side], j.ankles[side], 3.8 * sh, 3.2 * sh, look.skirt ? 'skin' : 'bottom', g);
    }
    B.ell(add(j.ankles[side], mv(rotY(pose.root.yaw ?? 0), S([2.4, -1.6, 0]))), S([4.6 * sh, 2.4 * sh, 3.2 * sh]), 'shoe', g + 1);
  }
  // ---------- la cabeza ----------
  const H = (v: V3): V3 => loc(hm, j.headC, S(v));
  const hr = kid ? 10.4 : 9.4;
  B.ell(H([0, 0, 0]), S([hr, hr * 1.08, hr]), 'skin', 20, { rot: hm });
  B.ell(H([hr - 0.2, -0.6, 0]), S([1.7, 1.9, 1.5]), 'skin', 20, { rot: hm });
  for (const z of [-1, 1]) B.ell(H([0, 0, z * hr]), S([1.6, 2.2, 1]), 'skin', 20, { rot: hm });
  // los ojos: cerrados (estatua y dormidos) o abiertos; los del sonámbulo se prenden celeste
  const eyes = pose.face?.eyes ?? 'closed';
  const glow = ex.glow ?? 0;
  for (const z of [-3.1, 3.1]) {
    const e = H([hr - 0.9, 1.6, z * (kid ? 1.12 : 1)]);
    if (glow > 0.05) B.ell(e, S([1.2, 0.8 + glow * 1.4, 1.6 + glow * 0.5]), 'glowEye', 21, { rot: hm });
    else if (eyes === 'closed' || eyes === 'happy') B.ell(add(e, mv(hm, S([0, eyes === 'happy' ? 0.4 : -0.2, 0]))), S([0.8, 0.45, 1.5]), 'lid', 21, { rot: hm });
    else B.ell(e, S([0.8, 1.3, 1.1]), 'eye', 21, { rot: hm });
  }
  // la boca: el bostezo se abre redondo, la sonrisa es una rayita
  const yawn = ex.yawn ?? 0;
  if (yawn > 0.05) B.ell(H([hr - 0.6, -3.6, 0]), S([1.2, 0.6 + yawn * 2.1, 1.3 + yawn * 0.6]), 'mouth', 22, { rot: hm });
  else if (pose.face?.mouth !== undefined && pose.face.mouth > 0.3) B.ell(H([hr - 0.7, -3.3, 0]), S([0.8, 0.5, 2]), 'mouth', 22, { rot: hm });
  if (look.glasses) for (const z of [-3.1, 3.1]) B.torus(H([hr + 0.2, 1.6, z]), 1.8 * s, 0.4 * s, 'glass', 23, mm(hm, rotY(90)));
  // el pelo
  const hair = look.hairStyle;
  if (hair !== 'calvo') B.ell(H([-1.2, 2.6, 0]), S([hr + 0.7, hr * 0.84, hr + 0.7]), 'hair', 24, { rot: hm, bump: 0.5 * s });
  else B.ell(H([-3, -0.4, 0]), S([hr * 0.7, hr * 0.6, hr + 0.6]), 'hair', 24, { rot: hm });
  if (hair === 'mono') B.ell(H([-6.5, 6, 0]), S([3.6, 3.4, 3.6]), 'hair', 25, { rot: hm, bump: 0.4 * s });
  if (hair === 'largo') B.ell(H([-5, -5, 0]), S([3.6, 9, hr]), 'hair', 25, { rot: hm, bump: 0.4 * s });
  if (hair === 'rizos') for (let q = 0; q < 6; q++) { const a = (q / 6) * Math.PI * 2; B.ell(H([-2 + Math.cos(a) * 4, 5 + Math.sin(a) * 2, Math.sin(a) * 6]), S([2.8, 2.8, 2.8]), 'hair', 25); }
  if (hair === 'trenzas') for (const z of [-1, 1]) {
    const a = H([-3, -2, z * (hr - 1)]), sway = (sec?.hangX ?? 0) * 2;
    B.chain([a, add(a, mv(hm, S([-1 - sway, -6, z * 1.2]))), add(a, mv(hm, S([-1.5 - sway * 1.5, -11, z * 1.4])))], [2.2, 1.9, 1.4].map((v) => v * s), 'hair', 26);
  }
  if (look.beard) B.ell(H([hr - 2.6, -4.4, 0]), S([3.8, 4.8, 5.6]), 'beard', 27, { rot: hm, bump: 0.5 * s });
  // los sombreros
  if (look.hat === 'panadero') { B.cone(H([-0.6, 6, 0]), H([-1.6, 13, 0]), hr * 0.86 * s, hr * 0.98 * s, 'hat', 28); B.ell(H([-1.8, 14.2, 0]), S([hr + 1.4, 3.6, hr + 1.4]), 'hat', 28, { rot: hm }); }
  if (look.hat === 'casco') { B.ell(H([-0.4, 4.6, 0]), S([hr + 1.2, hr * 0.62, hr + 1.2]), 'hat', 28, { rot: hm }); B.ell(H([-0.4, 9.4, 0]), S([5, 3.2, 1.4]), 'accent', 29, { rot: hm }); B.ell(H([1.4, 1.6, 0]), S([hr + 2.2, 1.1, hr + 2.2]), 'hat', 28, { rot: hm }); }
  if (look.hat === 'gorra') { B.ell(H([-0.6, 5.4, 0]), S([hr + 0.8, 3.6, hr + 0.8]), 'hat', 28, { rot: hm }); B.ell(H([hr - 1, 4, 0]), S([4, 0.9, 5.4]), 'hat', 28, { rot: hm }); }
  if (look.hat === 'gorro_dormir') {
    // el gorro de dormir largo: sale de la cabeza, sube un poco y se cae para atrás, con un pompón en la punta
    const sw = (sec?.hangX ?? 0) * 3 + (ex.cap ?? 0) * 3;
    const pts: V3[] = [H([-0.6, 5, 0]), H([-2.4, 11, 0]), H([-6 - sw * 0.5, 15, 1]), H([-11 - sw, 14, 2]), H([-14 - sw * 1.3, 9, 2.5])];
    B.ell(H([-0.6, 4.4, 0]), S([hr + 0.8, 4.2, hr + 0.8]), 'hat', 28, { rot: hm });
    B.chain(pts, [hr * 0.8, hr * 0.62, hr * 0.42, hr * 0.26, hr * 0.16].map((v) => v * s), 'hat', 28);
    B.ell(pts[4], S([2.8, 2.8, 2.8]), 'accent', 29);
  }
  if (look.hat === 'boina') B.ell(H([-0.8, 6.2, 0]), S([hr + 1.8, 3, hr + 1.8]), 'hat', 28, { rot: mm(hm, rotZ(10)) });
  if (look.hat === 'panuelo') { B.ell(H([-1, 2.8, 0]), S([hr + 1.2, hr * 0.92, hr + 1.2]), 'hat', 28, { rot: hm }); B.ell(H([-hr, -2, 0]), S([2.6, 3, 2.4]), 'hat', 29, { rot: hm }); }
  // ---------- los brazos y las manos ----------
  for (const side of ['far', 'near'] as const) {
    const g = side === 'near' ? 34 : 30;
    B.cone(j.shoulders[side], j.elbows[side], 3.9 * sh, 3.4 * sh, 'top', g);
    B.cone(j.elbows[side], j.hands[side], 3.3 * sh, 2.7 * sh, look.prop === 'pala' || look.child ? 'top' : 'top', g);
    B.ell(j.hands[side], S([2.6 * sh, 2.5 * sh, 2.3 * sh]), 'skin', g + 1);
  }
  prop(B, look, j, d, pose, s);
  return { pieces: B.pieces, materials: citizenMaterials(look, pose.freed ?? 0, glow), smooth: { 1: 3 * s, 20: 1.2 * s } };
}

/** Lo que tiene en la mano cada uno. */
function prop(B: Body, look: CitizenLook, j: Joints, d: BossDims, pose: BossPose, s: number) {
  const S = (v: V3): V3 => mul(v, s);
  // a 48 px lo que tiene en la mano tiene que verse: los grosores van más gruesos que en la vida real
  const Z = (v: V3): V3 => mul(v, s * 1.7), q = s * 1.7;
  const ex = pose.extra ?? {};
  const body = j.body, ch = j.chest;
  const fwd = mv(body, [1, 0, 0]), up: V3 = [0, 1, 0];
  const w = j.weapon;
  switch (look.prop) {
    case 'pala': {
      // la pala del horno: el mango largo y la pala chata con un pan encima
      if (!w) break;
      const tip = add(w.grip, mul(w.dir, 26 * s)), back = add(w.grip, mul(w.dir, -10 * s));
      B.cone(back, tip, 1.1 * q, 1.1 * q, 'prop', 60);
      const side = norm(cross(w.dir, up));
      B.box(add(tip, mul(w.dir, 4 * s)), Z([6.4, 1, 5.4]), 'prop', 61, { rot: lookRot(w.dir, cross(side, w.dir)), round: 0.6 * s });
      B.ell(add(add(tip, mul(w.dir, 4 * s)), Z([0, 1.8, 0])), Z([4.6, 2.4, 3.6]), 'propB', 62, { rot: lookRot(w.dir) });
      break;
    }
    case 'lanza': {
      if (!w) break;
      const top = add(w.grip, mul(w.dir, 30 * s)), bot = add(w.grip, mul(w.dir, -14 * s));
      B.cone(bot, top, 1.1 * q, 1 * q, 'propB', 60);
      B.cone(top, add(top, mul(w.dir, 6 * s)), 2 * q, 0.3 * q, 'prop', 61);
      B.ell(add(top, mul(w.dir, -0.5 * s)), Z([1.6, 1.6, 1.6]), 'prop', 62);
      break;
    }
    case 'llave': {
      // la llave de dar cuerda gigante: caña gruesa, el cuadro de la punta y las dos orejas de la mariposa
      if (!w) break;
      const tip = add(w.grip, mul(w.dir, 24 * s)), back = add(w.grip, mul(w.dir, -6 * s));
      B.cone(back, tip, 2.4 * q, 2.2 * q, 'prop', 60);
      const side = norm(cross(w.dir, mv(body, [0, 0, 1])));
      const bow = add(back, mul(w.dir, -2 * s));
      for (const zs of [-1, 1]) B.ell(add(bow, mul(side, zs * 6 * s)), Z([5.4, 4, 1.6]), 'prop', 61, { rot: lookRot(side, w.dir) });
      B.box(add(tip, mul(w.dir, 2 * s)), Z([3, 3, 3]), 'propB', 62, { rot: lookRot(w.dir), round: 0.5 * s });
      break;
    }
    case 'regadera': {
      const h = j.hands.near;
      const c = add(h, S([3, -6, 0]));
      B.ell(c, Z([5, 4.4, 4]), 'prop', 60, { rot: body });
      B.cone(add(c, mv(body, S([3, 1, 0]))), add(c, mv(body, S([11, 6, 0]))), 1.2 * q, 0.8 * q, 'prop', 61);
      B.ell(add(c, mv(body, S([11.6, 6.4, 0]))), Z([1.6, 1, 1.6]), 'prop', 62);
      B.torus(add(c, Z([-1, 5, 0])), 3 * q, 0.6 * q, 'prop', 63, mm(body, rotX(90)));
      // las gotas de agua que caen (solo despierta: de piedra, el agua quedó quieta en una gota)
      for (let q = 0; q < ((pose.freed ?? 0) > 0.5 ? 3 : 1); q++) B.ell(add(c, mv(body, S([13 + q * 0.6, 3 - q * 4 - (ex.drop ?? 0) * 3, 0]))), Z([0.8, 1.1, 0.8]), 'glass', 64 + q);
      break;
    }
    case 'canasta': {
      // la canasta colgando del antebrazo de atrás, con panes y flores
      const e = j.elbows.near, h = j.hands.near;
      const c = add(mul(add(e, h), 0.5), Z([0, -5, 0]));
      B.ell(c, Z([6, 4, 5]), 'propB', 60, { rot: body });
      B.torus(add(c, Z([0, 3.5, 0])), 4.6 * q, 0.6 * q, 'prop', 61, mm(body, rotX(90)));
      B.ell(add(c, Z([1, 3.6, 1.6])), Z([2.6, 1.6, 1.8]), 'top', 62, { rot: body });
      B.ell(add(c, Z([-1.5, 3.8, -1.4])), Z([2.2, 1.6, 2]), 'accent', 63, { rot: body });
      break;
    }
    case 'violin': {
      // el violín apoyado en el hombro cercano y el arco en la mano de atrás
      const c = add(loc(ch, j.chestTop, S([5, 0, 4])), Z([0, -1, 0]));
      const dirV = norm(sub(j.hands.near, c));
      B.ell(add(c, mul(dirV, 4 * s)), Z([6.4, 3.6, 2]), 'prop', 60, { rot: lookRot(dirV) });
      B.cone(add(c, mul(dirV, 8 * s)), j.hands.near, 0.8 * q, 0.6 * q, 'prop', 61);
      const h = j.hands.far, bw = ex.bow ?? 0;
      const bdir = norm(mv(body, [Math.cos(bw), 0.25, Math.sin(bw) * 0.6 + 0.6]));
      B.cone(add(h, mul(bdir, -6 * s)), add(h, mul(bdir, 12 * s)), 0.5 * q, 0.4 * q, 'propB', 62);
      break;
    }
    case 'tambor': {
      // el tambor colgado adelante y los palillos
      const c = loc(body, j.pelvis, S([10, 9, 0]));
      B.box(c, Z([4.6, 4, 4.6]), 'propB', 60, { rot: body, round: 3.6 * s });
      for (const yy of [-4, 4]) B.torus(add(c, mv(body, S([0, yy, 0]))), 4.8 * q, 0.7 * q, 'prop', 61, mm(body, rotX(90)));
      for (const side of ['near', 'far'] as const) {
        const h = j.hands[side];
        const tip = add(h, mul(norm(add(fwd, [0, -0.4, 0])), 8 * s));
        B.cone(h, tip, 0.6 * q, 0.6 * q, 'prop', 62);
        B.ell(tip, Z([1, 1, 1]), 'propB', 63);
      }
      break;
    }
    case 'libro': {
      // el libro abierto en las dos manos
      const c = add(mul(add(j.hands.near, j.hands.far), 0.5), Z([0, 1.5, 0]));
      const rot = mm(body, rotZ(-20 - (ex.book ?? 0) * 10));
      for (const zs of [-1, 1]) B.box(add(c, mv(rot, S([0, 0, zs * 2.6]))), Z([3.4, 0.6, 2.6]), 'propB', 60, { rot: mm(rot, rotX(zs * 12)), round: 0.3 * s });
      B.box(add(c, mv(rot, S([0, -0.8, 0]))), Z([3.6, 0.5, 5.4]), 'prop', 61, { rot, round: 0.3 * s });
      break;
    }
    case 'escudo': {
      // el escudo redondo en el brazo de atrás
      const c = add(j.hands.far, mv(body, S([2, 3, -2])));
      B.ell(c, Z([2, 8.6, 8.6]), 'prop', 60, { rot: mm(body, rotY(-25)) });
      B.ell(add(c, mv(body, S([1.6, 0, 0.6]))), Z([1.4, 2.4, 2.4]), 'propB', 61, { rot: mm(body, rotY(-25)) });
      break;
    }
    case 'bolsa': {
      // la bolsa de arena de sueño colgada del hombro, atrás, con la boca atada
      const c = add(loc(body, j.pelvis, Z([-6, 8, -6])), [0, 0, 0]);
      B.ell(c, Z([5.4, 6.4, 5]), 'propB', 60, { rot: body });
      B.ell(add(c, mv(body, Z([0.6, 6, 0]))), Z([2, 1.4, 2]), 'prop', 61, { rot: body });
      B.cone(add(c, mv(body, Z([0.6, 6.4, 0]))), j.shoulders.far, 0.6 * q, 0.6 * q, 'prop', 62);
      // un puñado de arena en la mano cercana cuando tira (extra.sand)
      if ((ex.sand ?? 0) > 0.2) B.ell(j.hands.near, Z([2.4 * (ex.sand ?? 0), 2.4 * (ex.sand ?? 0), 2.4 * (ex.sand ?? 0)]), 'sand', 63);
      break;
    }
    default: break;
  }
  void d; void rotZ;
}

// ---------------------------------------------------------------- poses

export const STAND: BossPose = {
  root: { y: -1, lean: 0 }, spine: { bend: 2 }, head: { pitch: -4 },
  arms: { near: { pitch: 8, spread: 10, elbow: 14 }, far: { pitch: 6, spread: 10, elbow: 16 } },
  legs: { near: { x: 2, y: 0, z: 1 }, far: { x: -2, y: 0, z: 1 } },
  face: { eyes: 'closed' },
};

/** Se estira: los brazos bien arriba, en puntas de pie. */
export const STRETCH: BossPose = {
  root: { y: 2, lean: -6 }, spine: { bend: -10 }, head: { pitch: -22 },
  arms: { near: { pitch: 168, spread: 22, elbow: 18, open: 1 }, far: { pitch: 166, spread: 22, elbow: 20, open: 1 } },
  legs: { near: { x: 1, y: 0, z: 1, toe: 30 }, far: { x: -1, y: 0, z: 1, toe: 30 } },
  face: { eyes: 'closed' }, extra: { yawn: 1 },
};

/** Saluda con la mano cercana. */
export const WAVE: BossPose = {
  root: { y: -1, lean: 0 }, spine: { bend: 0 }, head: { pitch: -8 },
  arms: { near: { pitch: 150, spread: 34, elbow: 40, open: 1 }, far: { pitch: 8, spread: 10, elbow: 16 } },
  legs: { near: { x: 2, y: 0, z: 1 }, far: { x: -2, y: 0, z: 1 } },
  face: { eyes: 'happy', mouth: 0.5 }, freed: 1,
};

/** Una persona dibujada en una sola vista (las estatuas son objetos del mapa, no personajes con 8 direcciones). */
export function renderCitizen(look: CitizenLook, pose: BossPose, yaw: number, w = 48, h = 64, k = 1, elev = 26): Raster {
  const cell = 64;
  const f = renderBoss(citizenScene(look, cell, pose, undefined, k), cell, { yaw, elev }, [32, 61]);
  const out = createRaster(w, h);
  const ox = Math.round((cell - w) / 2), oy = cell - h;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = x + ox, sy = y + oy;
    if (sx < 0 || sy < 0 || sx >= cell || sy >= cell) continue;
    const si = (sy * cell + sx) * 4, di = (y * w + x) * 4;
    for (let c = 0; c < 4; c++) out.data[di + c] = f.raster.data[si + c];
  }
  return out;
}

void rotX;
