import { type V3, type M3, add, sub, mul, mv, mm, rotX, rotY, rotZ, norm } from './sdf';
import { Body, loc } from './build';
import { bipedDims, solveBiped, type BossPose, type BossDims, type Joints } from './rig';
import { makeBossRamp, type BossScene, type BossMaterial } from './render';
import type { Secondary } from './secondary';
import type { BossSpec } from './sheet';
import { type BossAnimDef, type BossKey, over, bossPoses } from './anim';
import { createRaster, type Raster } from '../core/raster';

/**
 * El jefe final de GG Abyss: El Diablo (celda 192, el más grande y el más detallado del juego), con el motor de
 * volúmenes de los jefes grandes. Diseño propio, inspirado en el clásico: rojo oscuro, enorme, cuernos, espinas y alas
 * de murciélago. Nada de sangre.
 *
 * - La piel es roja oscura y gruesa, partida en placas por grietas de brasa que laten (la superficie `crack` del
 *   pintor: las grietas están pegadas a cada pieza y no se resbalan al moverse).
 * - La cabeza: un cráneo ancho con la frente pesada, los ojos hundidos que queman, cuernos enormes curvos hacia atrás
 *   con escarcha en las puntas, una hilera de cuernitos en la frente, orejas en punta, colmillos de arriba largos y
 *   dos colmillos de abajo que salen como defensas.
 * - Hombros con púas, brazos enormes con manos de cuatro garras, una fila de espinas por la espalda que sigue por la
 *   cola (con la punta en pala), piernas con garras, y dos alas de murciélago rotas, con la piel desgarrada.
 * - En el pecho, adentro, la última llama (la luz robada): al morir sale y él se deshace en ceniza y escarcha.
 *
 * La pose usa `face.mouth` (la boca: 0 a 1) y `extra`:
 * - `heat` (cuánto laten las grietas: 0 frío, 1 normal, 1.5 al rojo), `cool` (aturdido: la piel se enfría y se pone
 *   gris azulada), `dark` (se envuelve en sombra: todo negro menos los ojos), `wing` (alas: 0 plegadas, 1 abiertas),
 *   `wrap` (las alas lo envuelven por delante), `frost` (escarcha en los cuernos), `hornIce` (la escarcha de los
 *   cuernos que salta al romperse: 0 a 1), `heart` (la llama del pecho que se ve: 0 a 1), `flameOut` (la llama que
 *   sale y sube: 0 a 1), `beam` (el rayo rojo que sale de la boca: 0 a 1), `fist` (manos cerradas), `point` (el dedo
 *   que señala) y `t` (fase de lo que tiembla: el fuego, el humo).
 */

const BASE = { hipH: 44, hipW: 11, legU: 22, legL: 22, foot: 11, spine: 36, shW: 23, armU: 25, armL: 24, hand: 10, neck: 7, head: 14 };
const K = 0.7;
const diabloDims = (cell: number): BossDims => bipedDims(cell * K, BASE);

function mixHex(a: string, b: string, t: number): string {
  if (t <= 0) return a;
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * Math.min(1, t)).toString(16).padStart(2, '0')).join('');
}

function materials(ex: Record<string, number>, mouth: number): Record<string, BossMaterial> {
  const cool = ex.cool ?? 0, dark = ex.dark ?? 0, heat = (ex.heat ?? 1) * (1 - cool * 0.85);
  const sh = (hex: string) => mixHex(mixHex(hex, '#4a5468', cool * 0.7), '#06060a', dark);
  const ember = cool > 0.5 ? ['#5a3a3a', '#7a4a40'] : dark > 0.6 ? ['#0c0608', '#140a0c'] : heat > 1.2 ? ['#ff6a20', '#ffd070'] : ['#c03010', '#ff7a30'];
  const skinRamp = [...makeBossRamp(sh('#5a0e0c'), 6, { spread: 1.6, hue: 18 }), ...ember];
  return {
    skin: { ramp: skinRamp, surface: 'crack', tex: 0.7, scale: 2.4, heat: dark > 0.6 ? 0 : heat },
    skinDark: { ramp: [...makeBossRamp(sh('#300808'), 5, { spread: 1.3 }), ...ember], surface: 'crack', tex: 0.6, scale: 2, heat: dark > 0.6 ? 0 : heat * 0.7 },
    horn: { ramp: makeBossRamp(sh('#2e2420'), 6, { spread: 1.4 }), surface: 'horn', tex: 0.6, scale: 2, patch: { mat: 'frost', amount: (ex.frost ?? 0.3) * 0.5, scale: 2.2 } },
    hornTip: { ramp: dark > 0.6 ? ['#06060a', '#0c0c14', '#14141e'] : ['#6a8aac', '#9ab8d8', '#d0e4f6', '#ffffff'], surface: 'horn', tex: 0.3 },
    frost: { ramp: dark > 0.6 ? ['#06060a', '#0c0c14'] : ['#9ab8d8', '#d0e4f6', '#ffffff'], surface: 'stone', tex: 0.4, scale: 1.4 },
    claw: { ramp: makeBossRamp(sh('#1c1414'), 5, { spread: 1.2 }), surface: 'horn', tex: 0.3 },
    wing: { ramp: makeBossRamp(sh('#2a0408'), 6, { spread: 1.05, hue: -4 }), surface: 'leather', tex: 0.55, scale: 2.4 },
    spine: { ramp: dark > 0.6 ? ['#06060a', '#0c0c14', '#14141e'] : makeBossRamp(mixHex('#7a6656', '#4a5468', cool * 0.5), 5, { spread: 1.5 }), surface: 'horn', tex: 0.3 },
    blood: { ramp: dark > 0.6 ? ['#06060a', '#0c0608', '#140a0c'] : ['#2a0004', '#4a0008', '#6a0610', '#8a0a12', '#b8404a'], surface: 'horn', tex: 0.15 },
    wingBone: { ramp: makeBossRamp(sh('#24100c'), 5, { spread: 1.2 }), surface: 'horn', tex: 0.4 },
    eye: { ramp: ['#c01a10', '#ff2a1a', '#ffb090'], surface: 'glow' },
    socket: { ramp: ['#020102', '#0a0406'], surface: 'eye' },
    mouthIn: mouth > 0.4 && dark < 0.6 ? { ramp: ['#8a1000', '#ff3a10', '#ffd060'], surface: 'glow' } : { ramp: ['#0a0204', '#1a0608'], surface: 'eye' },
    fang: { ramp: dark > 0.6 ? ['#0c0c14', '#14141e', '#1e1e2a'] : ['#8a8072', '#c8beac', '#ece4d4', '#ffffff'], surface: 'horn', tex: 0.2 },
    heart: { ramp: ['#ff2a1a', '#ff8a5a', '#ffe0c0'], surface: 'glow' },
    beam: { ramp: ['#ff1a10', '#ff6a50', '#fff0e0'], surface: 'glow' },
    shard: { ramp: ['#9ab8d8', '#d0e4f6', '#ffffff'], surface: 'glow' },
  };
}

/** Dónde están los ojos (el medio entre los dos, marco del personaje): para la luz de los ojos. null si ya no está. */
export function diabloOjos(cell: number, pose: BossPose): V3 | null {
  const ex = pose.extra ?? {};
  if ((ex.ash ?? 0) > 0.6) return null;
  const d = diabloDims(cell), j = solveBiped(d, pose);
  return loc(j.headM, j.headC, mul([11, 2.4, 0], d.s * 1.3));
}

/** La boca (de donde sale el rayo), marco del personaje. */
export function diabloBoca(cell: number, pose: BossPose): V3 {
  const d = diabloDims(cell), j = solveBiped(d, pose);
  return loc(j.headM, j.headC, mul([14, -6, 0], d.s * 1.3));
}

/** Dónde van los huesos del ala (marco del personaje): la raíz, el codo y las cuatro puntas de los dedos. */
function wingGeom(d: BossDims, j: Joints, ex: Record<string, number>, z: -1 | 1, flap = 0): { root: V3; elbow: V3; tips: V3[] } {
  const s = d.s, ch = j.chest, wing = ex.wing ?? 0.3, wrap = ex.wrap ?? 0;
  const S = (v: V3): V3 => mul(v, s);
  const root = loc(ch, j.pelvis, S([-12, 34, z * 9]));
  // con wrap las alas vienen hacia adelante y lo tapan
  // las alas son enormes: todo se agranda desde la raíz (más hacia los lados que hacia atrás); abiertas del todo
  // vuelven al ancho de la celda
  const R0: V3 = [-12, 34, 9], GR: V3 = [1, 1.12, 1.36 - 0.36 * Math.min(1, Math.max(0, (wing - 0.3) / 0.4))];
  const big = (v: V3): V3 => [R0[0] + (v[0] - R0[0]) * GR[0], R0[1] + (v[1] - R0[1]) * GR[1], R0[2] + (v[2] - R0[2]) * GR[2]];
  const W = (v0: V3): V3 => { const v = big(v0); return loc(ch, j.pelvis, S([v[0] * (1 - wrap) + wrap * (Math.abs(v[2]) * 0.55 + 4), v[1] - wrap * 6, v[2] * (1 - wrap * 0.55) * z])); };
  const op = 0.45 + wing * 0.42;
  const elbow = W([-22 - flap, 50 + wing * 8, 16 + op * 18]);
  const tips = [W([-28, 72 + wing * 10, 20 + op * 30]), W([-38, 50 + wing * 6, 28 + op * 38]), W([-32, 24, 26 + op * 30]), W([-20, 12, 16 + op * 16])];
  return { root, elbow, tips };
}

/** Las dos puntas de las alas (el dedo de más afuera), para que el juego tire gotas de sangre desde ahí. */
export function diabloAlas(cell: number, pose: BossPose): [V3, V3] {
  const d = diabloDims(cell), j = solveBiped(d, pose), ex = pose.extra ?? {};
  return [wingGeom(d, j, ex, -1).tips[1], wingGeom(d, j, ex, 1).tips[1]];
}

/** Un marco con x a lo largo de `along` y la piel en el plano de `across`. */
function frameAlong(along: V3, across: V3): M3 {
  const x = norm(along), yv = norm(across);
  const zz = norm([x[1] * yv[2] - x[2] * yv[1], x[2] * yv[0] - x[0] * yv[2], x[0] * yv[1] - x[1] * yv[0]]);
  const yy: V3 = [zz[1] * x[2] - zz[2] * x[1], zz[2] * x[0] - zz[0] * x[2], zz[0] * x[1] - zz[1] * x[0]];
  return [[x[0], yy[0], zz[0]], [x[1], yy[1], zz[1]], [x[2], yy[2], zz[2]]];
}

/** Los desgarrones: qué tiras faltan en cada paño del ala (izquierda y derecha, distintos). */
const WING_TEARS: number[][][] = [[[5], [2], [2, 3]], [[4], [3, 4], [1, 2]]];
const hashW = (x: number, y: number, s: number) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

function diabloScene(cell: number, pose: BossPose, sec?: Secondary): BossScene {
  const d = diabloDims(cell), s = d.s, j = solveBiped(d, pose), B = new Body();
  const S = (v: V3): V3 => mul(v, s);
  const ex = pose.extra ?? {}, ch = j.chest, hm = j.headM, body = j.body;
  const mouth = pose.face?.mouth ?? 0;
  // ---------- el cuerpo: la cadera, el torso enorme, los pectorales, la panza y el cuello grueso ----------
  B.ell(loc(body, j.pelvis, S([0, 4, 0])), S([13, 11, 15]), 'skin', 1, { rot: body, bump: 0.5 * s });
  B.ell(loc(ch, j.pelvis, S([0, 24, 0])), S([15, 17, 21]), 'skin', 1, { rot: ch, bump: 0.6 * s });
  for (const z of [-1, 1]) B.ell(loc(ch, j.pelvis, S([8, 28, z * 9])), S([8, 8, 9.4]), 'skin', 1, { rot: mm(ch, rotX(z * 8)), bump: 0.4 * s });
  B.ell(loc(ch, j.pelvis, S([8, 13, 0])), S([7, 10, 11]), 'skinDark', 2, { rot: ch, bump: 0.4 * s });
  B.ell(loc(ch, j.pelvis, S([-6, 30, 0])), S([10, 12, 18]), 'skin', 1, { rot: ch, bump: 0.6 * s });
  B.cone(j.chestTop, j.neck, 12 * s, 10 * s, 'skin', 3, { bump: 0.4 * s });
  // la última llama, adentro del pecho (se ve por una grieta grande, y al morir sale y sube)
  const heart = ex.heart ?? 0, out = ex.flameOut ?? 0;
  if (heart > 0.05) {
    const c0 = loc(ch, j.pelvis, S([13 + out * 18, 26 + out * 40, 0]));
    B.ell(c0, S([2.4 + heart * 2, 3 + heart * 3, 2.4 + heart * 2]), 'heart', 70);
  }
  // ---------- la fila de espinas de la espalda ----------
  for (let k = 0; k < 7; k++) {
    const y = 40 - k * 6.4, sz = 1 - k * 0.09;
    const base = loc(ch, j.pelvis, S([-14 + k * 0.6, y, 0]));
    B.cone(base, loc(ch, j.pelvis, S([-24 - sz * 4, y + 6 * sz, 0])), 3.6 * s * sz, 0.4 * s, 'horn', 4);
  }
  // ---------- las piernas: muslos gruesos, pantorrillas y pies de tres garras ----------
  for (const side of ['far', 'near'] as const) {
    const g = side === 'near' ? 44 : 40;
    B.cone(j.hips[side], j.knees[side], 11 * s, 8.4 * s, 'skin', g, { bump: 0.4 * s });
    B.ell(add(mul(j.hips[side], 0.55), mul(j.knees[side], 0.45)), S([10, 10, 10]), 'skin', g, { bump: 0.4 * s });
    B.cone(j.knees[side], j.ankles[side], 8 * s, 6 * s, 'skinDark', g);
    B.cone(j.knees[side], add(j.knees[side], mv(body, S([5, 3, 0]))), 2.6 * s, 0.4 * s, 'horn', g);
    const foot = add(j.ankles[side], mv(rotY(pose.root.yaw ?? 0), S([4, -2, 0])));
    B.ell(foot, S([9, 4.4, 7]), 'skinDark', g + 1, { rot: rotY(pose.root.yaw ?? 0) });
    for (const dz of [-4, 0, 4]) B.cone(add(foot, mv(rotY(pose.root.yaw ?? 0), S([7, 0, dz]))), add(foot, mv(rotY(pose.root.yaw ?? 0), S([13, -3, dz * 1.2]))), 1.8 * s, 0.3 * s, 'claw', g + 2);
  }
  // ---------- los brazos: hombros con púas, brazos enormes y manos de cuatro garras ----------
  const fist = ex.fist ?? 0, point = ex.point ?? 0;
  for (const side of ['far', 'near'] as const) {
    const g = side === 'near' ? 34 : 30, zs = side === 'near' ? 1 : -1;
    B.ell(j.shoulders[side], S([11, 10, 11]), 'skin', g, { rot: ch, bump: 0.4 * s });
    for (let q = 0; q < 3; q++) B.cone(add(j.shoulders[side], mv(ch, S([-3 + q * 3, 6, zs * (4 + q * 2)]))), add(j.shoulders[side], mv(ch, S([-6 + q * 3, 16 - q * 2.6, zs * (8 + q * 3)]))), 2.6 * s, 0.3 * s, 'horn', g);
    B.cone(j.shoulders[side], j.elbows[side], 9.4 * s, 7.4 * s, 'skin', g, { bump: 0.4 * s });
    { const m = add(mul(j.shoulders[side], 0.55), mul(j.elbows[side], 0.45)); B.ell(m, S([8, 8, 8]), 'skin', g, { bump: 0.4 * s }); }
    B.cone(j.elbows[side], add(j.elbows[side], mv(ch, S([-6, -2, zs * 2]))), 2.4 * s, 0.4 * s, 'horn', g);
    B.cone(j.elbows[side], j.hands[side], 8.4 * s, 6 * s, 'skin', g, { bump: 0.4 * s });
    { const m = add(mul(j.elbows[side], 0.7), mul(j.hands[side], 0.3)); B.ell(m, S([8, 8.6, 8]), 'skin', g, { bump: 0.4 * s }); }
    const h = j.hands[side], fwd = norm(sub(h, j.elbows[side]));
    B.ell(h, S([7, 6, 6.4]), 'skinDark', g + 1, { bump: 0.3 * s });
    // las garras: cuatro dedos largos (cerradas en puño, abiertas o el índice que señala)
    for (let q = 0; q < 4; q++) {
      const spreadZ = (q - 1.5) * 2.6;
      const open = side === 'near' && point > 0.5 ? (q === 0 ? 1 : 0.1) : 1 - fist;
      const len = (8 + (q === 0 && point > 0.5 && side === 'near' ? 6 : 0)) * (0.35 + open * 0.65);
      const base = add(h, mv(ch, S([0, 0, spreadZ])));
      const tip = add(base, add(mul(fwd, len * s), mv(ch, S([0, -3 * (1 - open), spreadZ * 0.3]))));
      B.cone(base, tip, 2 * s, 1.2 * s, 'skinDark', g + 2);
      B.cone(tip, add(tip, add(mul(fwd, 5 * s), mv(ch, S([0, -1.6, 0])))), 1.3 * s, 0.2 * s, 'claw', g + 3);
    }
  }
  // ---------- las alas de murciélago, rotas: los huesos con espinas y garras, la piel desgarrada que sangra ----------
  for (const z of [-1, 1] as const) {
    const g = z > 0 ? 50 : 52;
    const flap = Math.max(-3, Math.min(3, (sec?.flap ?? 0) * 4));
    const { root, elbow, tips } = wingGeom(d, j, ex, z, flap);
    B.cone(root, elbow, 3.4 * s, 2.4 * s, 'wingBone', g);
    tips.forEach((t, i) => { if (i < 3) B.cone(elbow, t, 1.8 * s, 0.6 * s, 'wingBone', g); });
    const blood: V3[] = [];
    // la piel entre los huesos: en abanico de tiras finas desde la base, con el borde festoneado (cada tira más
    // corta en el medio entre dos huesos) y desgarrada (faltan tiras: por ahí chorrea)
    for (let i = 0; i < 3; i++) {
      const a = i === 0 ? root : elbow, b = tips[i], c = tips[i + 1];
      for (let q = 0; q <= 6; q++) {
        const t = q / 6;
        const edge = add(b, mul(sub(c, b), t));
        const scallop = 1 - Math.sin(t * Math.PI) * 0.26;
        const tip = add(a, mul(sub(edge, a), scallop));
        if (WING_TEARS[z > 0 ? 1 : 0][i].includes(q)) {
          // el desgarrón: queda un pedacito de piel cerca del hueso y el borde roto sangra
          const cut = add(a, mul(sub(tip, a), 0.42));
          B.ell(mul(add(a, cut), 0.5), [Math.hypot(...sub(cut, a)) / 2, 1.4 * s, 0.9 * s], 'wing', g + 1, { rot: frameAlong(sub(cut, a), sub(c, b)) });
          blood.push(cut);
          continue;
        }
        const mid = mul(add(a, tip), 0.5), len = Math.hypot(...sub(tip, a)) / 2;
        const span = Math.hypot(...sub(c, b));
        B.ell(mid, [len, Math.max(1.6 * s, span / 9), 0.9 * s], 'wing', g + 1, { rot: frameAlong(sub(tip, a), sub(c, b)) });
      }
    }
    // el centro de la piel: las espinas apuntan para afuera de ahí
    const mc = mul(add(add(tips[1], tips[2]), mul(elbow, 2)), 0.25);
    const away = (p: V3, dir: V3): V3 => { const o = sub(p, mc), bd = norm(dir); const k2 = o[0] * bd[0] + o[1] * bd[1] + o[2] * bd[2]; return norm(sub(o, mul(bd, k2))); };
    const spine = (p: V3, dir: V3, len: number, r0: number, bleed: boolean) => {
      const o = away(p, dir), bd = norm(dir);
      const tp = add(p, add(mul(o, len * s), mul(bd, len * 0.35 * s)));
      B.cone(p, tp, r0 * s, 0.15 * s, 'spine', g + 2);
      if (bleed) blood.push(add(p, mul(sub(tp, p), 0.55)));
    };
    // la hilera de espinas del borde de adelante (el brazo del ala y el primer dedo)
    for (let k = 1; k <= 7; k++) { const t = k / 8; spine(add(root, mul(sub(elbow, root), t)), sub(elbow, root), 6 - t * 1.5, 1.5, k % 3 === 1); }
    for (let k = 1; k <= 5; k++) { const t = k / 6; spine(add(elbow, mul(sub(tips[0], elbow), t)), sub(tips[0], elbow), 5.4 - t * 2, 1.3, k % 2 === 0); }
    // y unas espinas más chicas en cada dedo del ala
    for (let i = 1; i < 3; i++) for (let k = 1; k <= 3; k++) { const t = k / 4; spine(add(elbow, mul(sub(tips[i], elbow), t)), sub(tips[i], elbow), 3.6, 1, k === 2); }
    // las garras curvas: en la punta de cada dedo y una grande en el codo del ala
    const claw = (p: V3, dir: V3, len: number, r0: number) => {
      const bd = norm(dir), c1 = add(p, mul(bd, len * 0.5 * s)), c2 = add(c1, add(mul(bd, len * 0.15 * s), [0, -len * 0.55 * s, 0]));
      B.cone(p, c1, r0 * s, r0 * 0.6 * s, 'spine', g + 2);
      B.cone(c1, c2, r0 * 0.6 * s, 0.15 * s, 'spine', g + 2);
      blood.push(c1);
    };
    for (let i = 0; i < 3; i++) claw(tips[i], sub(tips[i], elbow), 7.5, 1.4);
    claw(elbow, add(sub(elbow, root), [0, 6, 0]), 9, 1.9);
    // la sangre oscura: hilos que cuelgan de los desgarrones, de las espinas y de las garras, y una gota que cae
    // despacio por cada hilo; en los aletazos salpica un poco desde las puntas
    const tt = (ex.t ?? 0) / 8;
    blood.forEach((p, i) => {
      const h = hashW(i * 7 + (z > 0 ? 3 : 0), 31, 77), L = (3 + h * 6) * s;
      const end = add(p, [0, -L, 0]);
      B.cone(p, end, 0.95 * s, 0.6 * s, 'blood', g + 3);
      B.ell(end, S([1.1, 1.4, 1.1]), 'blood', g + 3);
      const ph = (tt + h) % 1;
      if (ph < 0.8) B.ell(add(end, [0, -(2 + ph * 12) * s, 0]), S([0.9, 1.2, 0.9]), 'blood', g + 3);
    });
    const fl = Math.min(1, Math.abs(flap) / 4 + (ex.splash ?? 0));
    if (fl > 0.25) for (let k = 0; k < 4; k++) {
      const t0 = tips[k % 3], o = away(t0, sub(t0, elbow));
      B.ell(add(t0, add(mul(o, (1.5 + k * 1.2) * fl * s), [0, -(1 + k * 2) * fl * s, 0])), S([0.9, 0.9, 0.9]), 'blood', g + 3);
    }
  }
  // ---------- la cola gruesa con espinas y la punta en pala ----------
  const ts = (sec?.tail ?? 0) * 8 + (ex.tailSwing ?? 0);
  const tail: V3[] = [loc(body, j.pelvis, S([-12, 2, 0])), loc(body, j.pelvis, S([-24, -12, ts * 0.4])), loc(body, j.pelvis, S([-34, -28, ts])), loc(body, j.pelvis, S([-46, -34 + 2, ts * 1.6])), loc(body, j.pelvis, S([-56, -32, ts * 2.2]))];
  // la cola no se mete debajo del piso
  for (const p of tail) p[1] = Math.max(p[1], 3 * s);
  B.chain(tail, [7, 6, 4.6, 3.2, 2].map((v) => v * s), 'skin', 60, { bump: 0.3 * s });
  for (let k = 1; k < 4; k++) B.cone(add(tail[k], [0, 2 * s, 0]), add(tail[k], [0, 7 * s - k * s, 0]), 2 * s, 0.3 * s, 'horn', 61);
  B.ell(tail[4], S([6, 1.6, 4.6]), 'skinDark', 62, { rot: body });
  // ---------- la cabeza ----------
  const HK = 1.3, SH = (v: V3): V3 => mul(v, s * HK);
  const H = (v: V3): V3 => loc(hm, j.headC, SH(v));
  B.ell(H([0, 1, 0]), SH([12, 12, 12]), 'skin', 10, { rot: hm, bump: 0.4 * s });
  // la frente pesada, fruncida hacia el medio
  for (const z of [-1, 1]) B.ell(H([8.6, 5.6, z * 5]), SH([4.2, 2, 6]), 'skinDark', 11, { rot: mm(hm, rotX(z * -20)) });
  // los pómulos y el hocico ancho
  for (const z of [-1, 1]) B.ell(H([6, -2, z * 8]), SH([6, 4.4, 4]), 'skin', 10, { rot: hm });
  B.ell(H([10, -4, 0]), SH([8, 5.4, 8.6]), 'skin', 10, { rot: hm });
  for (const z of [-1.6, 1.6]) B.ell(H([16.6, -2.6, z]), SH([0.9, 0.8, 0.9]), 'socket', 12, { rot: hm });
  // la mandíbula que se abre
  const jm: M3 = mm(hm, rotZ(-mouth * 30));
  B.ell(loc(jm, j.headC, mul([8, -9, 0], s * HK)), SH([8, 3.4, 8]), 'skinDark', 13, { rot: jm });
  if (mouth > 0.08) B.ell(H([11, -8 - mouth * 2, 0]), SH([5.4, 1 + mouth * 3.4, 6]), 'mouthIn', 14, { rot: hm });
  // los colmillos de arriba (largos) y las defensas de abajo que suben
  for (const z of [-4, 4]) B.cone(H([14.6, -6.4, z]), H([15, -12 - mouth * 1.4, z * 0.9]), 1.3 * s * HK, 0.2 * s * HK, 'fang', 15);
  for (const z of [-1.6, 1.6]) B.cone(H([15.4, -6.4, z]), H([15.6, -8.6, z]), 0.8 * s * HK, 0.2 * s * HK, 'fang', 15);
  for (const z of [-6, 6]) { const b0 = loc(jm, j.headC, mul([12, -10, z], s * HK)); B.cone(b0, add(b0, mv(jm, SH([1.6, 6.6, z * 0.15]))), 1.4 * s * HK, 0.2 * s * HK, 'fang', 16); }
  // los ojos hundidos que queman (oblicuos, debajo de la frente)
  for (const z of [-1, 1]) {
    B.ell(H([10.6, 2.4, z * 4.8]), SH([1.6, 2.2, 3.6]), 'socket', 17, { rot: mm(hm, rotX(z * -22)) });
    B.ell(H([11.8, 2.2, z * 4.8]), SH([1.3, 1.6, 2.8]), 'eye', 18, { rot: mm(hm, rotX(z * -22)) });
  }
  // las orejas en punta
  for (const z of [-1, 1]) B.cone(H([-1, 3, z * 11]), H([-8, 8, z * 17]), 3 * s * HK, 0.4 * s * HK, 'skin', 19);
  // la hilera de cuernitos de la frente
  for (const z of [-3, 0, 3]) B.cone(H([7, 9 - Math.abs(z) * 0.3, z]), H([5, 13 - Math.abs(z) * 0.4, z * 1.2]), 1.6 * s * HK, 0.2 * s * HK, 'horn', 20);
  // los cuernos enormes: salen de los costados, van hacia afuera, suben y se curvan hacia atrás, con escarcha
  const hornIce = ex.hornIce ?? 0;
  for (const z of [-1, 1]) {
    const pts = [H([1, 9, z * 8]), H([-3, 15, z * 15]), H([-10, 23, z * 20]), H([-18, 30, z * 19]), H([-22, 36, z * 13])];
    B.chain(pts.slice(0, 4), [5.4, 4.4, 3.2, 2].map((v) => v * s * HK), 'horn', 21);
    B.cone(pts[3], pts[4], 2 * s * HK, 0.3 * s * HK, hornIce > 0.4 ? 'horn' : 'hornTip', 22);
    // las placas de escarcha de los cuernos que saltan al romperse (die)
    if (hornIce > 0.02 && hornIce < 0.98) for (let q = 0; q < 4; q++) { const p = pts[2 + (q % 2)]; B.ell(add(p, SH([Math.cos(q * 1.7) * hornIce * 14, hornIce * 10 - hornIce * hornIce * 14, Math.sin(q * 1.7) * hornIce * 14])), SH([1.6, 1.2, 1.4]), 'shard', 71 + q); }
  }
  // ---------- el rayo rojo (corto: el largo lo pone el juego con rayo_rojo en línea) ----------
  const beam = ex.beam ?? 0;
  if (beam > 0.05) {
    const m0 = diabloBoca(cell, pose), dir = mv(hm, [1, -0.2, 0]);
    for (let q = 0; q < 6; q++) { const c = add(m0, mul(dir, (q * 5 + 3) * s * beam)); B.ell(c, S([5, 4 + q * 0.5, 4 + q * 0.5]), 'beam', 80); }
  }
  void sec;
  return { pieces: B.pieces, materials: materials(ex, mouth), smooth: { 1: 6 * s, 3: 3 * s, 10: 3 * s, 60: 2 * s, 30: 2.5 * s, 34: 2.5 * s, 40: 2.5 * s, 44: 2.5 * s, 80: 3 * s } };
}

// ---------------------------------------------------------------- animaciones

const k = (f: number, pose: BossPose, ease: BossKey['ease'] = 'linear'): BossKey => ({ f, pose, ease });
const cyc = (n: number, f: number, ph = 0) => Math.sin((f / n) * Math.PI * 2 + ph);

/** De pie, encorvado y enorme: los hombros adelante, los brazos colgando con las garras abiertas. */
const STAND: BossPose = {
  root: { y: -3, lean: 8 }, spine: { bend: 10 }, head: { pitch: -6 },
  arms: { near: { pitch: 18, spread: 26, elbow: 30 }, far: { pitch: 16, spread: 26, elbow: 34 } },
  legs: { near: { x: 7, y: 0, z: 4 }, far: { x: -7, y: 0, z: 4 } },
  face: { mouth: 0.12 },
  extra: { heat: 1, cool: 0, dark: 0, wing: 0.25, wrap: 0, frost: 0.4, hornIce: 0, heart: 0, flameOut: 0, beam: 0, fist: 0, point: 0, ash: 0, t: 0, tailSwing: 0 },
};

function gait(S: number, lift: number, duty: number, n: number): { x: number; y: number; z: number }[] {
  const out: { x: number; y: number; z: number }[] = [];
  for (let f = 0; f < n; f++) {
    const t = f / n;
    if (t < duty) out.push({ x: S - (2 * S * t) / duty, y: 0, z: 4 });
    else { const u = (t - duty) / (1 - duty); out.push({ x: -S + 2 * S * (u * u * (3 - 2 * u)), y: Math.sin(u * Math.PI) * lift, z: 4.5 }); }
  }
  return out;
}

function diabloAnims(): BossAnimDef[] {
  // respira pesado: el pecho sube y baja, las grietas laten, sale humo de la nariz (el retoque)
  const idle: BossAnimDef = { name: 'idle', fps: 6, loop: true, frames: 8, keys: Array.from({ length: 8 }, (_, f) => k(f, over(STAND, { root: { y: -3 + cyc(8, f) * 1.2 }, spine: { bend: 10 - cyc(8, f) * 3 }, head: { pitch: -6 + cyc(8, f, 0.6) * 2 }, arms: { near: { pitch: 18 + cyc(8, f) * 3 }, far: { pitch: 16 + cyc(8, f) * 3 } }, extra: { heat: 1 + 0.25 * cyc(8, f), t: f, wing: 0.25 + 0.04 * cyc(8, f) } }))) };
  // pasos que tiemblan: pesado, el cuerpo se balancea, la cola atrás
  const n = 8, S = 11, near = gait(S, 7, 0.58, n);
  const walk: BossAnimDef = {
    name: 'walk', fps: 6, loop: true, frames: n, stride: (2 * S) / 0.58,
    keys: Array.from({ length: n }, (_, f) => k(f, over(STAND, { root: { y: -4 - Math.abs(cyc(n, f)) * 2, roll: cyc(n, f) * 4, lean: 10 }, spine: { twist: -8 * cyc(n, f) }, legs: { near: near[f], far: near[(f + n / 2) % n] }, arms: { near: { pitch: 18 - cyc(n, f) * 16 }, far: { pitch: 16 + cyc(n, f) * 16 } }, extra: { t: f, tailSwing: cyc(n, f) * 4 } }))),
    events: [{ type: 'paso', frame: 0, foot: 'near' }, { type: 'paso', frame: 4, foot: 'far' }],
  };
  // el zarpazo: lleva la garra bien atrás y arriba (6 de aviso que tiemblan) y la cruza por delante
  const UP = over(STAND, { root: { lean: -4, x: -3 }, spine: { twist: -32, bend: 0 }, head: { pitch: -10 }, arms: { near: { pitch: 150, spread: 44, elbow: 60 } }, face: { mouth: 0.6 }, extra: { heat: 1.3, wing: 0.45 } });
  const DN = over(STAND, { root: { lean: 18, x: 4, y: -6 }, spine: { twist: 30, bend: 16 }, arms: { near: { pitch: 66, spread: -24, elbow: 8 } }, legs: { near: { x: 12 }, far: { x: -9 } }, face: { mouth: 0.8 }, extra: { heat: 1.3, wing: 0.4 } });
  const attack: BossAnimDef = {
    name: 'attack', fps: 10, loop: false, frames: 14, windup: [1, 6], shake: 1.2,
    keys: [k(0, STAND), k(2, UP, 'out'), k(6, over(UP, { spine: { twist: -36 } })), k(7, over(DN, { spine: { twist: 0 } }), 'in'), k(8, DN), k(10, DN), k(13, STAND, 'ease')],
    events: [{ type: 'impacto', frame: 8 }],
  };
  // la nova: levanta los brazos de a poco y se pone al rojo (8 de aviso), y los baja de golpe abriéndolos: el anillo
  const NUP = (t: number) => over(STAND, { root: { lean: -6 - t * 4, y: -2 + t * 2 }, spine: { bend: -6 * t }, head: { pitch: -16 * t }, arms: { near: { pitch: 60 + t * 110, spread: 40 + t * 20, elbow: 30 }, far: { pitch: 60 + t * 110, spread: 40 + t * 20, elbow: 30 } }, face: { mouth: 0.3 + t * 0.5 }, extra: { heat: 1 + t * 0.5, wing: 0.3 + t * 0.6, fist: 1 } });
  const NDN = over(STAND, { root: { lean: 14, y: -10 }, spine: { bend: 18 }, arms: { near: { pitch: 50, spread: 62, elbow: 16 }, far: { pitch: 50, spread: 62, elbow: 16 } }, legs: { near: { x: 11, z: 6 }, far: { x: -10, z: 6 } }, face: { mouth: 1 }, extra: { heat: 1.5, wing: 1 } });
  const nova: BossAnimDef = {
    name: 'nova', fps: 10, loop: false, frames: 16, windup: [1, 8], shake: 1.4,
    keys: [k(0, STAND), ...[1, 2, 3, 4, 5, 6, 7, 8].map((f) => k(f, NUP(f / 8), f === 1 ? 'out' : 'linear')), k(9, NDN, 'in'), k(12, NDN), k(15, STAND, 'ease')],
    events: [{ type: 'grito', frame: 9 }, { type: 'impacto', frame: 9 }],
  };
  // la carga: encorvado, los cuernos adelante, corre
  const CN = 6, CG = gait(13, 9, 0.5, CN);
  const charge: BossAnimDef = {
    name: 'charge', fps: 12, loop: true, frames: CN, stride: 52,
    keys: Array.from({ length: CN }, (_, f) => k(f, over(STAND, { root: { lean: 22, y: -8 - Math.abs(cyc(CN, f)) * 2 }, spine: { bend: 14 }, head: { pitch: 16 }, arms: { near: { pitch: -20 + cyc(CN, f) * 30, spread: 30, elbow: 40 }, far: { pitch: -20 - cyc(CN, f) * 30, spread: 30, elbow: 40 } }, legs: { near: CG[f], far: CG[(f + CN / 2) % CN] }, face: { mouth: 0.5 }, extra: { heat: 1.3, wing: 0.1, t: f } }))),
    events: [{ type: 'paso', frame: 0 }, { type: 'paso', frame: 3 }],
  };
  // el rayo: echa la cabeza atrás con la boca brillando (8 de aviso) y abre la boca hacia adelante: sale el rayo rojo
  const RIN = (t: number) => over(STAND, { root: { lean: -8 - t * 4, x: -3 }, spine: { bend: -8 }, head: { pitch: -30 * t }, arms: { near: { pitch: 30, spread: 50, elbow: 50 }, far: { pitch: 30, spread: 50, elbow: 50 } }, face: { mouth: 0.25 + t * 0.2 }, extra: { heat: 1 + t * 0.5, wing: 0.4 + t * 0.4, fist: 1 } });
  const RBLOW = (f: number) => over(STAND, { root: { lean: 12, x: 2 }, spine: { bend: 10 }, head: { pitch: 6 + (f % 2) * 2 }, arms: { near: { pitch: 40, spread: 50, elbow: 40 }, far: { pitch: 40, spread: 50, elbow: 40 } }, face: { mouth: 1 }, extra: { heat: 1.5, wing: 0.8, beam: 1, fist: 1, t: f } });
  const rayo: BossAnimDef = {
    name: 'rayo', fps: 10, loop: false, frames: 18, windup: [1, 8], shake: 1,
    keys: [k(0, STAND), ...[1, 2, 3, 4, 5, 6, 7, 8].map((f) => k(f, RIN(f / 8), f === 1 ? 'out' : 'linear')), k(9, RBLOW(9), 'in'), ...[10, 11, 12, 13, 14].map((f) => k(f, RBLOW(f))), k(15, over(RBLOW(15), { extra: { beam: 0.4 } })), k(17, STAND, 'ease')],
    events: [{ type: 'grito', frame: 9 }, { type: 'impacto', frame: 10 }],
  };
  // los pilares: sube los dos puños por encima de la cabeza (7 de aviso) y golpea el piso
  const PUP = over(STAND, { root: { lean: -6, y: 0 }, spine: { bend: -6 }, head: { pitch: -14 }, arms: { near: { pitch: 160, spread: 14, elbow: 30 }, far: { pitch: 160, spread: 14, elbow: 30 } }, face: { mouth: 0.7 }, extra: { heat: 1.3, wing: 0.7, fist: 1 } });
  const PDN = over(STAND, { root: { lean: 22, y: -12, x: 1 }, spine: { bend: 22 }, head: { pitch: 6 }, arms: { near: { pitch: 50, spread: 14, elbow: 10 }, far: { pitch: 50, spread: 14, elbow: 10 } }, legs: { near: { x: 12, z: 6 }, far: { x: -12, z: 6 } }, face: { mouth: 0.9 }, extra: { heat: 1.5, wing: 0.5, fist: 1 } });
  const pilares: BossAnimDef = {
    name: 'pilares', fps: 10, loop: false, frames: 14, windup: [1, 7], shake: 1.2,
    keys: [k(0, STAND), k(2, PUP, 'out'), k(7, over(PUP, { root: { y: 1 } })), k(8, PDN, 'in'), k(10, PDN), k(13, STAND, 'ease')],
    events: [{ type: 'impacto', frame: 8 }],
  };
  // la oscuridad: se envuelve en las alas y se oscurece hasta que solo quedan los ojos (los últimos 4 cuadros, en bucle)
  const DARK = (t: number) => over(STAND, { root: { lean: 4, y: -4 }, spine: { bend: 8 }, head: { pitch: 0 }, arms: { near: { pitch: 40, spread: 0, elbow: 90 }, far: { pitch: 40, spread: 0, elbow: 90 } }, face: { mouth: 0.1 }, extra: { dark: Math.min(1, t * 1.3), wrap: t, wing: 0.3 + t * 0.4, heat: 1 - t * 0.6 } });
  const oscuridad: BossAnimDef = {
    name: 'oscuridad', fps: 8, loop: false, frames: 12,
    keys: [k(0, STAND), ...[1, 2, 3, 4, 5, 6, 7].map((f) => k(f, DARK(f / 7))), ...[8, 9, 10, 11].map((f) => k(f, over(DARK(1), { root: { y: -4 + (f % 2) * 0.8 } })))],
    events: [{ type: 'grito', frame: 2 }],
  };
  // la jaula: señala a la heroína con el índice (6 de aviso) y cierra la mano: salen los huesos del piso
  const POINT = over(STAND, { root: { lean: 4 }, spine: { twist: 10 }, head: { pitch: -2 }, arms: { near: { pitch: 92, spread: 4, elbow: 4 }, far: { pitch: 20, spread: 30, elbow: 40 } }, face: { mouth: 0.4 }, extra: { point: 1, heat: 1.2 } });
  const CLOSE = over(POINT, { arms: { near: { pitch: 100, elbow: 20 } }, face: { mouth: 0.7 }, extra: { point: 0, fist: 1, heat: 1.4 } });
  const jaula: BossAnimDef = {
    name: 'jaula', fps: 10, loop: false, frames: 12, windup: [1, 6], shake: 0.6,
    keys: [k(0, STAND), k(2, POINT, 'out'), k(6, over(POINT, { arms: { near: { pitch: 94 } } })), k(7, CLOSE, 'in'), k(9, CLOSE), k(11, STAND, 'ease')],
    events: [{ type: 'impacto', frame: 7 }],
  };
  // ruge al cielo: abre las alas y los brazos, la cabeza atrás (llama demonios)
  const ROAR = (f: number) => over(STAND, { root: { lean: -12, y: 0 }, spine: { bend: -12 }, head: { pitch: -34 + (f % 2) * 3 }, arms: { near: { pitch: 110, spread: 58, elbow: 36 }, far: { pitch: 110, spread: 58, elbow: 36 } }, face: { mouth: 1 }, extra: { wing: 1, heat: 1.4, t: f } });
  const warcry: BossAnimDef = {
    name: 'warcry', fps: 8, loop: false, frames: 14, windup: [1, 3],
    keys: [k(0, STAND), k(3, ROAR(3), 'out'), ...[4, 5, 6, 7, 8, 9, 10].map((f) => k(f, ROAR(f))), k(13, STAND, 'ease')],
    events: [{ type: 'grito', frame: 4 }],
  };
  // aturdido: de rodillas con los braseros prendidos, la piel enfriada (gris azulada, sin brasa); ahí se le pega
  const KNEEL = over(STAND, { root: { y: -21, lean: 16, x: -2 }, spine: { bend: 20 }, head: { pitch: 26 }, arms: { near: { pitch: 30, spread: 24, elbow: 40 }, far: { pitch: 28, spread: 24, elbow: 46 } }, legs: { near: { x: -18, y: 0, z: 5, toe: 60 }, far: { x: 14, y: 0, z: 6 } }, face: { mouth: 0.3 } });
  const aturdido: BossAnimDef = { name: 'aturdido', fps: 5, loop: true, frames: 8, keys: Array.from({ length: 8 }, (_, f) => k(f, over(KNEEL, { root: { y: -21 + cyc(8, f) * 0.8 }, head: { pitch: 26 + cyc(8, f, 1) * 3, roll: cyc(8, f) * 4 }, extra: { cool: 1, heat: 0.2, frost: 1, wing: 0.15, t: f } }))) };
  const hit: BossAnimDef = { name: 'hit', fps: 12, loop: false, frames: 5, keys: [k(0, STAND), k(1, over(STAND, { root: { x: -5, lean: -8, y: -4 }, spine: { bend: -4 }, head: { pitch: -16 }, face: { mouth: 0.7 }, extra: { heat: 1.4 } }), 'out'), k(2, over(STAND, { root: { x: -6, lean: -10, y: -5 }, head: { pitch: -18 }, face: { mouth: 0.6 } })), k(4, STAND, 'ease')] };
  // muere: tambalea, cae de rodillas, se le rompe el hielo de los cuernos, la última llama sale del pecho y sube, y él
  // se deshace en ceniza y escarcha
  const die: BossAnimDef = {
    name: 'die', fps: 8, loop: false, frames: 21,
    keys: [
      k(0, STAND),
      k(2, over(STAND, { root: { lean: -10, y: -2, x: -3 }, head: { pitch: -24 }, arms: { near: { pitch: 60, spread: 50 }, far: { pitch: 60, spread: 50 } }, face: { mouth: 0.9 }, extra: { heat: 1.5, wing: 0.8 } }), 'out'),
      k(5, over(KNEEL, { extra: { heat: 1.2, wing: 0.5 } }), 'in'),
      k(7, over(KNEEL, { head: { pitch: -10 }, face: { mouth: 0.5 }, extra: { heat: 1, hornIce: 0.05, frost: 1, heart: 0.4 } })),
      k(9, over(KNEEL, { head: { pitch: -18 }, face: { mouth: 0.7 }, extra: { heat: 0.8, hornIce: 0.6, frost: 0.2, heart: 1 } })),
      k(10, over(KNEEL, { head: { pitch: -20 }, face: { mouth: 0.6 }, extra: { heat: 0.6, hornIce: 0.99, frost: 0, heart: 1, flameOut: 0.05 } })),
      k(14, over(KNEEL, { head: { pitch: -26 }, face: { mouth: 0.3 }, extra: { heat: 0.3, cool: 0.6, frost: 0, heart: 1, flameOut: 0.8 } }), 'ease'),
      k(16, over(KNEEL, { head: { pitch: 10 }, extra: { heat: 0.1, cool: 1, frost: 0.6, heart: 0.6, flameOut: 1 } }), 'ease'),
      k(20, over(KNEEL, { head: { pitch: 20 }, extra: { heat: 0, cool: 1, frost: 0.8, heart: 0, flameOut: 1, ash: 1 } }), 'ease'),
    ],
    events: [{ type: 'aterriza', frame: 5 }, { type: 'suelta', frame: 10 }],
  };
  return [idle, walk, attack, nova, charge, rayo, pilares, oscuridad, jaula, warcry, aturdido, hit, die];
}

// ---------------------------------------------------------------- retoque

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

/** Lo que tiene cada cuadro de cada animación para el retoque (calor, oscuridad, ceniza), sacado de las claves. */
const POSES = new Map<string, BossPose[]>();
function poseOf(anim: string, f: number): BossPose | undefined {
  let p = POSES.get(anim);
  if (!p) { const def = DIABLO_ANIMS.find((a) => a.name === anim); if (!def) return undefined; p = bossPoses(def); POSES.set(anim, p); }
  return p[f];
}

/**
 * Retoque: el halo de lo que brilla (ojos, grietas, boca, la llama), el filo frío arriba y el rebote rojo abajo, el
 * humo de la nariz al respirar (idle), y al morir la ceniza y la escarcha en que se deshace.
 */
function diabloPost(r: Raster, anim: string, f: number, n: number) {
  const W = r.w, H = r.h, pose = poseOf(anim, f), ex = pose?.extra ?? {};
  const dark = ex.dark ?? 0, eyes = eyesOnSheet(r);
  const a0 = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) a0[i] = r.data[i * 4 + 3] > 150 ? 1 : 0;
  // el filo frío arriba a la izquierda y el rebote de las brasas abajo a la derecha
  if (dark < 0.6) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!a0[y * W + x]) continue;
    if ((x > 0 && !a0[y * W + x - 1]) || (y > 0 && !a0[(y - 1) * W + x])) put(r, x, y, '#9ab8d8', 70);
    else if ((x + 1 < W && !a0[y * W + x + 1]) || (y + 1 < H && !a0[(y + 1) * W + x])) put(r, x, y, '#ff4a1a', 90);
  }
  // el halo de lo que brilla: rojo alrededor de los ojos y las grietas (en la oscuridad, solo los ojos)
  const hot: number[] = [];
  for (let i = 0; i < W * H; i++) { const R = r.data[i * 4], G = r.data[i * 4 + 1], B = r.data[i * 4 + 2]; if (r.data[i * 4 + 3] && R > 230 && G < 200 && B < 160) hot.push(i); }
  const set = new Set(hot);
  for (const i of hot) { const x = i % W, y = Math.floor(i / W); for (const [dx, dy] of [[1, 0], [-1, 0], [0, -1], [0, 1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H || set.has(Y * W + X)) continue; if (!r.data[(Y * W + X) * 4 + 3]) put(r, X, Y, '#ff2a1a', 140); } }
  // el humo de la nariz al respirar (idle y aturdido): dos bocanadas que suben y se abren
  if ((anim === 'idle' || anim === 'aturdido') && pose) {
    const nose = eyes ? [eyes[0], eyes[1] + 8] : null;
    if (nose) for (let i = 0; i < 14; i++) {
      const t = ((f / n) + i / 14) % 1, x = nose[0] + (i % 2 ? 3 : -3) + Math.sin(t * 6 + i) * 2 + t * 6, y = nose[1] - t * 22;
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1]]) put(r, x + dx, y + dy, anim === 'aturdido' ? '#c8d8ea' : '#5a5054', Math.round(150 * (1 - t)));
    }
  }
  // al morir: se deshace en ceniza (gris oscura) y escarcha (celeste), de arriba hacia abajo
  if (anim === 'die') {
    const kk = Math.max(0, (f - 14) / (n - 15));
    if (kk > 0) {
      let g = H - 1;
      for (let y = H - 1; y >= 0; y--) { let any = false; for (let x = 0; x < W; x++) if (a0[y * W + x]) { any = true; break; } if (any) { g = y; break; } }
      const src = Uint8ClampedArray.from(r.data);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (!src[i + 3]) continue;
        const hy = (g - y) / Math.max(1, g);
        if (hash(x, y, 911) < kk * 1.6 - (1 - hy) * 0.5) {
          r.data[i + 3] = 0;
          if (hash(x, y, 912) > 0.8) { const c = hash(x, y, 913) > 0.55 ? '#3a3438' : hash(x, y, 914) > 0.4 ? '#9ab8d8' : '#5a5054'; put(r, x + (hash(x, y, 915) - 0.5) * 14 * kk, Math.min(g, y + kk * 30 * (0.4 + hash(x, y, 916))), c, Math.round(230 * (1 - kk * 0.4))); }
        }
      }
      // el montoncito de ceniza y escarcha que queda en el piso
      for (let i = 0; i < 160 * kk; i++) { const x = W / 2 + (hash(i, 1, 917) - 0.5) * 70 * Math.sqrt(hash(i, 2, 917)), y = g - hash(i, 3, 917) * 6 * kk; put(r, x, y, i % 3 ? '#3a3438' : '#d0e4f6', 230); }
    }
    // las chispas de la llama que sube
    if ((ex.flameOut ?? 0) > 0.05 && (ex.heart ?? 0) > 0.2) for (let i = 0; i < 16; i++) { const t = ((f / n) * 3 + i / 16) % 1; put(r, W / 2 + (hash(i, 4, 918) - 0.5) * 30, H * 0.45 - t * 60 - (ex.flameOut ?? 0) * 30, t < 0.5 ? '#ffe0c0' : '#ff2a1a', Math.round(220 * (1 - t))); }
  }
}

/** Dónde están los ojos en la hoja (el centro de los pixeles del color de los ojos), en cualquier dirección. */
function eyesOnSheet(r: Raster): [number, number] | null {
  let sx = 0, sy = 0, n = 0;
  for (let i = 0; i < r.w * r.h; i++) {
    const R = r.data[i * 4], G = r.data[i * 4 + 1], B = r.data[i * 4 + 2];
    if (r.data[i * 4 + 3] && ((R === 255 && G === 42 && B === 26) || (R === 255 && G === 176 && B === 144))) { sx += i % r.w; sy += Math.floor(i / r.w); n++; }
  }
  return n ? [sx / n, sy / n] : null;
}

const DIABLO_ANIMS = diabloAnims();

export const DIABLO_SPEC: BossSpec = {
  id: 'diablo', cell: 192, dims: diabloDims, elev: 26, anims: DIABLO_ANIMS, post: diabloPost,
  scene: (cell, pose, sec) => diabloScene(cell, pose, sec),
  // el punto que pega: la garra cercana (el zarpazo, los pilares y la jaula usan el mismo punto de referencia)
  strikePoint: (j: Joints) => j.hands.near,
};

void rotZ; void createRaster;

// ---------------------------------------------------------------- los efectos del Diablo

/** Los huecos del anillo de la nova (ángulos de centro en radianes y medio ancho): por ahí se pasa. */
export const NOVA_HUECOS: [number, number][] = [[0.7, 0.28], [3.6, 0.28]];
const enHueco = (a: number) => NOVA_HUECOS.some(([c, w]) => { let d = Math.abs(((a - c + Math.PI * 3) % (Math.PI * 2)) - Math.PI); return d < w; });

/**
 * `nova_fuego_diablo` (256 x 256, 10 cuadros): el anillo de fuego que sale de él y se abre (el juego lo agranda más
 * si quiere). Tiene dos huecos (NOVA_HUECOS): por ahí se pasa. Borde negro adentro, lenguas de fuego afuera.
 */
export function novaFire(): Raster[] {
  return Array.from({ length: 10 }, (_, f) => {
    const r = createRaster(256, 256), t = (f + 1) / 10, R = 18 + t * 104, th = 16 - t * 7, fade = f > 7 ? 1 - (f - 7) / 3 : 1;
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const dx = x + 0.5 - 128, dy = (y + 0.5 - 128) / 0.62, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      if (enHueco(a)) continue;
      const tongue = (Math.sin(a * 22 + f * 1.7) + 1) * 3 + (Math.sin(a * 9 - f) + 1) * 2;
      const u = (d - (R - th)) / (th + tongue);
      if (u < 0 || u > 1) continue;
      const c = u < 0.18 ? '#1a0204' : u < 0.4 ? '#ffe0a0' : u < 0.65 ? '#ff7a30' : u < 0.85 ? '#d01a10' : '#5a0806';
      put(r, x, y, c, Math.round(255 * fade * (u > 0.85 ? 0.7 : 1)));
    }
    // chispas que saltan hacia afuera
    for (let i = 0; i < 40; i++) { const a = hash(i, 1, 931) * Math.PI * 2; if (enHueco(a)) continue; const d = R + 4 + hash(i, f, 932) * 18; put(r, 128 + Math.cos(a) * d, 128 + Math.sin(a) * d * 0.62, i % 3 ? '#ffb040' : '#ffffff', Math.round(230 * fade)); }
    return r;
  });
}

/** `aviso_nova` (256 x 256, 8 cuadros, capa suelo): el anillo donde va a pasar el fuego, con los huecos marcados claros. */
export function novaWarning(): Raster[] {
  return Array.from({ length: 8 }, (_, f) => {
    const r = createRaster(256, 256), t = (f + 1) / 8;
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const dx = x + 0.5 - 128, dy = (y + 0.5 - 128) / 0.62, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      if (d > 124) continue;
      const ang = (a + Math.PI) / (Math.PI * 2);
      if (enHueco(a)) { if (d > 100 && d < 124 && (Math.floor(d / 4) + f) % 2 === 0) put(r, x, y, '#d0e4f6', 150); continue; }
      if (d > 118 && ang < t + 0.02) put(r, x, y, f % 2 ? '#ff6a20' : '#ff2a1a', 235);
      else if (d < 118 && d > 118 - t * 100) put(r, x, y, '#2a0404', Math.round(30 + t * 70 * (1 - d / 130)));
    }
    return r;
  });
}

/** `rayo_rojo` (32 x 32, 6 cuadros en bucle): un tramo del rayo, se repite en línea (pega de lado a lado). */
export function redBeam(): Raster[] {
  return Array.from({ length: 6 }, (_, f) => {
    const r = createRaster(32, 32);
    for (let x = 0; x < 32; x++) {
      const w = 6 + Math.sin((x / 32) * Math.PI * 4 + f * (Math.PI / 3)) * 1.6 + Math.sin((x / 32) * Math.PI * 2 - f * (Math.PI / 3) * 2) * 1.2;
      for (let y = 0; y < 32; y++) {
        const u = Math.abs(y + 0.5 - 16) / w;
        if (u > 1.6) continue;
        const c = u < 0.3 ? '#ffffff' : u < 0.6 ? '#ffd0c0' : u < 1 ? '#ff2a1a' : '#8a0a06';
        put(r, x, y, c, u < 1 ? 255 : Math.round(200 * (1.6 - u) / 0.6));
      }
    }
    // chispas que corren por el rayo
    for (let i = 0; i < 4; i++) { const x = (i * 8 + f * 5) % 32; put(r, x, 16 + ((i % 2) ? -8 : 8), '#ff8a6a', 220); }
    return r;
  });
}

/** `aviso_rayo` (32 x 32, 6 cuadros en bucle, capa suelo): la línea por donde va a girar el rayo. Pega en línea. */
export function beamWarning(): Raster[] {
  return Array.from({ length: 6 }, (_, f) => {
    const r = createRaster(32, 32);
    for (let x = 0; x < 32; x++) for (let y = 10; y <= 21; y++) {
      if (y === 10 || y === 21) { if ((x + f * 3) % 8 < 5) put(r, x, y, '#ff2a1a', 230); }
      else put(r, x, y, '#3a0606', Math.round(60 + 30 * Math.sin((x + f * 5) * 0.4)));
    }
    for (let k2 = 0; k2 < 2; k2++) { const cx = (k2 * 16 + (f * 32) / 6) % 32; for (let t = 0; t < 5; t++) { put(r, cx + t * 0.6, 15.5 - t, '#ff8a6a', 220); put(r, cx + t * 0.6, 15.5 + t, '#ff8a6a', 220); } }
    return r;
  });
}

/** `pilar_fuego` (64 x 128, 12 cuadros): sale del piso quebrándolo, arde alto y se apaga en humo. */
export function firePillar(): Raster[] {
  return Array.from({ length: 12 }, (_, f) => {
    const r = createRaster(64, 128), base = 120;
    const grow = f < 3 ? (f + 1) / 3 : f < 9 ? 1 : Math.max(0, 1 - (f - 8) / 3);
    const h = 108 * grow;
    // el piso quebrado al pie
    for (let k2 = 0; k2 < 8; k2++) { const a = (k2 / 8) * Math.PI * 2; for (let t = 0; t < 12; t++) put(r, 32 + Math.cos(a) * t * 2, base + Math.sin(a) * t * 0.6, t < 4 ? '#ffb040' : '#5a0806', 220); }
    if (f < 10) for (let y = 0; y < h; y++) {
      const v = y / Math.max(1, h), hw = (14 - v * 6) * (f < 3 ? 0.7 + grow * 0.3 : 1) + Math.sin(y * 0.3 + f * 1.4) * 2;
      const cx = 32 + Math.sin(y * 0.08 + f) * 2 * v;
      for (let x = Math.floor(cx - hw); x <= cx + hw; x++) {
        const u = Math.abs(x + 0.5 - cx) / hw;
        const c = u < 0.25 && v < 0.75 ? '#fff0c0' : u < 0.5 ? '#ffb040' : u < 0.8 ? '#ff4a10' : '#3a0404';
        put(r, x, base - y, c, Math.round(255 * (v > 0.85 ? (1 - v) / 0.15 : 1)));
      }
    }
    // el humo al apagarse
    if (f >= 8) for (let i = 0; i < 26; i++) { const t = ((f - 8) / 4 + hash(i, 1, 941) * 0.5) % 1; const x = 32 + (hash(i, 2, 941) - 0.5) * 28, y = base - 10 - t * 90; for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) put(r, x + dx, y + dy, '#3a3438', Math.round(170 * (1 - t))); }
    // brasas que suben
    for (let i = 0; i < 10; i++) { const t = ((f / 12) * 2 + hash(i, 3, 942)) % 1; put(r, 32 + (hash(i, 4, 942) - 0.5) * 30, base - t * h, '#ffd060', Math.round(220 * (1 - t))); }
    return r;
  });
}

/** `aviso_pilar` (64 x 32, 8 cuadros, capa suelo): donde va a salir un pilar. El círculo se llena y el piso se agrieta. */
export function pillarWarning(): Raster[] {
  return Array.from({ length: 8 }, (_, f) => {
    const r = createRaster(64, 32), t = (f + 1) / 8;
    for (let y = 0; y < 32; y++) for (let x = 0; x < 64; x++) {
      const dx = (x + 0.5 - 32) / 30, dy = (y + 0.5 - 16) / 14, d = Math.hypot(dx, dy);
      if (d > 1) continue;
      const ang = (Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2);
      if (d > 0.84 && ang < t + 0.02) put(r, x, y, f % 2 ? '#ffb040' : '#ff2a1a', 235);
      else if (d < 0.84 * t) put(r, x, y, '#2a0404', Math.round(50 + t * 110));
    }
    for (let c = 0; c < 6; c++) { const a = (c / 6) * Math.PI * 2 + 0.4; for (let q = 0; q < t * 12; q++) put(r, 32 + Math.cos(a) * q * 2, 16 + Math.sin(a) * q * 0.9, '#ff6a20', 210); }
    return r;
  });
}

/** Un hueso que sale del piso y se curva hacia adentro (de la jaula), de abajo (x0, y0) a la punta. */
function cageBone(r: Raster, x0: number, y0: number, h: number, lean: number, a = 255) {
  for (let t = 0; t <= 1; t += 0.02) {
    const x = x0 + lean * t * t * h * 0.35, y = y0 - t * h, w = 3.2 - t * 2 + (t < 0.08 ? 1.2 : 0);
    for (let q = -w; q <= w; q += 0.5) put(r, x + q, y, q < -w * 0.3 ? '#ece4d4' : q > w * 0.4 ? '#8a8072' : '#c8beac', a);
  }
}

/**
 * `jaula_huesos` (96 x 96): encierra a la heroína (va centrada en ella). `subir` (8 cuadros): ocho huesos grandes salen
 * del piso en círculo y se curvan hacia adentro. `quieta` (1). `romper` (8 cuadros): se quiebran y saltan para afuera.
 */
export function boneCage(): { subir: Raster[]; quieta: Raster[]; romper: Raster[] } {
  const N = 10;
  const draw = (rise: number, broken: number, f: number) => {
    const r = createRaster(96, 96);
    const bones = Array.from({ length: N }, (_, i) => { const a = (i / N) * Math.PI * 2; return { a, x: 48 + Math.cos(a) * 30, y: 80 + Math.sin(a) * 13, back: Math.sin(a) < 0 }; });
    // los de atrás primero, después los de adelante
    for (const pass of [true, false]) for (const [i, b] of bones.entries()) {
      if (b.back !== pass) continue;
      const h = (52 + (i % 3) * 6) * rise, lean = -Math.cos(b.a) * 1;
      if (broken <= 0) { cageBone(r, b.x, b.y, h, lean); continue; }
      // roto: el pedazo de abajo queda y el de arriba sale volando hacia afuera
      cageBone(r, b.x, b.y, h * 0.35, lean * 0.3, Math.round(255 * (1 - broken * 0.5)));
      const fx = b.x + Math.cos(b.a) * broken * 26, fy = b.y - h * 0.5 - broken * 20 + broken * broken * 30;
      for (let q = 0; q < 8; q++) put(r, fx + Math.cos(b.a + q) * q * 0.8, fy + q, '#c8beac', Math.round(255 * (1 - broken)));
    }
    // el piso que se quebró al salir
    if (rise < 1 || broken > 0) for (let i = 0; i < 18; i++) put(r, 48 + (hash(i, f, 951) - 0.5) * 80, 80 + (hash(f, i, 952) - 0.5) * 28, '#3a3438', 200);
    return r;
  };
  return {
    subir: Array.from({ length: 8 }, (_, f) => draw((f + 1) / 8, 0, f)),
    quieta: [draw(1, 0, 0)],
    romper: Array.from({ length: 8 }, (_, f) => draw(1, (f + 1) / 8, f)),
  };
}

/** `aviso_carga_diablo` (32 x 32, 6 cuadros en bucle, capa suelo): la línea de la carga, con flechas que corren. */
export function chargeWarning(): Raster[] {
  return Array.from({ length: 6 }, (_, f) => {
    const r = createRaster(32, 32);
    for (let x = 0; x < 32; x++) for (let y = 7; y <= 24; y++) {
      if (y === 7 || y === 24) { if ((x + f * 3) % 6 < 4) put(r, x, y, '#ff6a20', 230); }
      else put(r, x, y, '#2a0404', 70);
    }
    for (let k2 = 0; k2 < 2; k2++) { const cx = (k2 * 16 + (f * 32) / 6) % 32; for (let t = 0; t < 7; t++) for (const w of [0, 1]) { put(r, cx + t * 0.8 + w, 15.5 - t, '#ffb040', 230); put(r, cx + t * 0.8 + w, 15.5 + t, '#ffb040', 230); } }
    return r;
  });
}

/**
 * `gota_sangre_diablo` (16 x 16, 6 cuadros, una vez): la gota oscura que cae de la punta del ala y salpica chiquito en
 * el piso. El piso es la fila 13: el juego la pone con el pie ahí, debajo de la punta del ala.
 */
export function bloodDrop(): Raster[] {
  const B0 = '#2a0004', B1 = '#4a0008', B2 = '#6a0610', B3 = '#8a0a12', HI = '#b8404a';
  return Array.from({ length: 6 }, (_, f) => {
    const r = createRaster(16, 16);
    if (f < 4) {
      // cae: la gota se estira un poco y deja una estela finita
      const y = 1 + f * f * 0.9 + f * 1.6, len = 2 + Math.min(2, f);
      for (let t = 0; t < len + 2; t++) put(r, 8, y - t - 1, t < 2 ? B1 : B0, Math.round(200 * (1 - t / (len + 2))));
      put(r, 7, y, B2); put(r, 8, y, B3); put(r, 9, y, B2);
      put(r, 7, y + 1, B1); put(r, 8, y + 1, B2); put(r, 9, y + 1, B1);
      put(r, 8, y + 2, B1);
      put(r, 7, y, HI, 160);
    } else {
      // salpica chiquito: una manchita y dos gotitas que saltan
      const k = f - 4;
      for (let x = 6 - k; x <= 10 + k; x++) put(r, x, 13, x === 8 ? B3 : B1, 220 - k * 60);
      put(r, 7, 12, B2, 200 - k * 60); put(r, 9, 12, B2, 200 - k * 60);
      put(r, 5 - k, 11 - k, B2, 200 - k * 70); put(r, 11 + k, 11 - k, B2, 200 - k * 70);
      put(r, 8, 13, HI, 120 - k * 50);
    }
    return r;
  });
}
