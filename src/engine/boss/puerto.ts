import { type V3, type M3, add, sub, mul, norm, cross, mv, mm, rotX, rotY, rotZ } from './sdf';
import { Body, lookRot, loc } from './build';
import { bipedDims, solveBiped, type BossPose, type BossDims } from './rig';
import { makeBossRamp, type BossScene, type BossMaterial } from './render';
import type { Secondary } from './secondary';
import { weaponHead, type BossSpec } from './sheet';
import { MINO_ANIMS, GUARD } from './minotauroAnims';
import { type BossAnimDef, type BossKey, over } from './anim';
import type { Raster } from '../core/raster';

/**
 * Los enemigos del Mundo 4 (El Puerto Ahogado), con el motor de volúmenes de los jefes (las mismas 8 direcciones y
 * el pivote medido):
 *
 * - `marinero_niebla` (48): silueta de pescador con gorro de lluvia, abrigo largo y un gancho, hecha de niebla verde
 *   translúcida. Fuera de la luz se ven solo sus dos linternitas (`marinero_ojos`, en criaturas). Al morir se deshace
 *   en niebla que sube.
 * - `cangrejo_ceniza` (48): chico, gris ceniza con ojos naranjas en palitos, anda de costado y pega con la tenaza.
 *   Van en grupos. Al morir queda patas arriba y se vuelve ceniza.
 * - `medusa_negra` (48): flota. Campana negra con el borde violeta que late y tentáculos que se mecen. No ataca: si
 *   toca a Thor le apaga el farol (eso lo hace el juego).
 * - `capitan_ahogado` (64, minijefe): fantasma de capitán con abrigo largo, sombrero de dos picos, barba de algas y
 *   un ancla. Imponente, no grotesco. Al morir se libera: se le va la niebla, queda un capitán viejo de verdad que
 *   saluda y se va.
 */

const FATUO = '#7affc8';

// ---------------------------------------------------------------- marinero de niebla

const MARINER_DIMS = { hipH: 42, hipW: 8, legU: 21, legL: 20, foot: 8, spine: 30, shW: 15, armU: 19, armL: 19, hand: 6, neck: 5, head: 10, weaponLen: 18, weaponR: 4 };
const marinerDims = (cell: number): BossDims => bipedDims(cell * 0.98, MARINER_DIMS);

function marinerMaterials(): Record<string, BossMaterial> {
  return {
    coat: { ramp: ['#0e2a24', '#16403a', '#1f584c', '#2c7462', '#3e9078', '#5ab09a'], surface: 'cloth', tex: 0.5, scale: 1.8 },
    coatDark: { ramp: ['#0a1e1a', '#12322c', '#1a463c', '#24584c'], surface: 'cloth', tex: 0.4 },
    hat: { ramp: ['#06140f', '#0c241c', '#143428', '#1e4636'], surface: 'cloth', tex: 0.3 },
    boot: { ramp: ['#06120e', '#0c201a', '#143026'], surface: 'leather', tex: 0.3 },
    hook: { ramp: ['#3a5a52', '#6a9a8c', '#a8d8c8', '#e0fff4'], surface: 'metal', tex: 0.4 },
    dark: { ramp: ['#020806', '#06120e'], surface: 'eye' },
    eyes: { ramp: ['#2a8a64', FATUO, '#e8fff4'], surface: 'glow' },
  };
}

function marinerScene(cell: number, pose: BossPose, sec?: Secondary): BossScene {
  const d = marinerDims(cell), s = d.s, j = solveBiped(d, pose), B = new Body();
  const S = (v: V3): V3 => mul(v, s);
  const ch = j.chest, hm = j.headM, body = j.body;
  // el abrigo largo: un cono del pecho al ruedo, que se abre y se mece atrás al caminar
  const hipC = loc(body, j.pelvis, S([0, 3, 0]));
  const footMid = mul(add(j.ankles.near, j.ankles.far), 0.5);
  const flap = (sec?.flap ?? 0) * 3 * s;
  B.ell(loc(ch, j.pelvis, S([0, 20, 0])), S([10, 14, 12]), 'coat', 1, { rot: ch });
  B.cone(loc(ch, j.pelvis, S([0, 26, 0])), hipC, 11 * s, 11.5 * s, 'coat', 1);
  // el abrigo llega a las rodillas: abajo se ven las botas (la silueta de pescador, no un bulto)
  const kneeMid = mul(add(j.knees.near, j.knees.far), 0.5);
  B.cone(hipC, [kneeMid[0] - flap, kneeMid[1] - 3 * s, kneeMid[2]], 11.5 * s, 13.5 * s, 'coat', 1);
  for (const side of ['far', 'near'] as const) {
    B.cone(j.knees[side], j.ankles[side], 3.6 * s, 3.4 * s, 'boot', side === 'near' ? 44 : 40);
    B.ell(add(j.ankles[side], mv(rotY(pose.root.yaw ?? 0), S([2.5, -1.5, 0]))), S([5, 2.6, 3.6]), 'boot', side === 'near' ? 45 : 41);
  }
  void footMid;
  // el cinturón de soga
  B.ell(loc(body, j.pelvis, S([0, 8, 0])), S([11.8, 1.6, 12.4]), 'hook', 6, { rot: body });
  // la solapa del cuello levantada
  B.ell(loc(ch, j.pelvis, S([2, 29, 0])), S([6, 4, 10]), 'coatDark', 2, { rot: ch });
  // la cabeza: hundida bajo el gorro de lluvia, cara en sombra y las dos linternitas
  const H = (v: V3): V3 => loc(hm, j.headC, S(v));
  B.ell(H([1, -1, 0]), S([7.5, 8, 7.5]), 'dark', 3, { rot: hm });
  // gorro de lluvia: copa redonda y ala ancha que cae atrás
  B.ell(H([-0.5, 5.5, 0]), S([8.6, 5.4, 8.6]), 'hat', 4, { rot: hm });
  B.ell(H([-2.5, 2.6, 0]), S([14.5, 1.8, 13.5]), 'hat', 4, { rot: mm(hm, rotZ(-12)) });
  const eyes = pose.face?.eyes ?? 'open';
  if (eyes !== 'dizzy') for (const z of [-3, 3]) B.ell(H([7.4, -0.8, z]), S([1.2, eyes === 'closed' ? 0.6 : 2.2, 2.1]), 'eyes', 5, { rot: hm });
  // brazos con mangas anchas
  for (const side of ['far', 'near'] as const) {
    const g = side === 'near' ? 31 : 30;
    B.cone(j.shoulders[side], j.elbows[side], 4.6 * s, 4.2 * s, 'coat', g);
    B.cone(j.elbows[side], j.hands[side], 4.2 * s, 3.4 * s, 'coat', g);
    B.ell(j.hands[side], S([2.6, 2.6, 2.6]), 'coatDark', g + 1);
  }
  // el gancho de pescador en la mano cercana
  if (j.weapon) {
    const { grip, dir } = j.weapon;
    const side = norm(cross(dir, mv(body, [0, 0, 1])));
    const top = add(grip, mul(dir, 16 * s));
    B.cone(add(grip, mul(dir, -4 * s)), top, 1.6 * s, 1.4 * s, 'hook', 60);
    const curve: V3[] = [top, add(top, add(mul(dir, 2.5 * s), mul(side, 2 * s))), add(top, add(mul(dir, 2.2 * s), mul(side, 5 * s))), add(top, add(mul(dir, -0.5 * s), mul(side, 6.5 * s))), add(top, add(mul(dir, -3.2 * s), mul(side, 5.4 * s)))];
    B.chain(curve, [1.6, 1.5, 1.4, 1.2, 0.6].map((v) => v * s), 'hook', 61);
  }
  return { pieces: B.pieces, materials: marinerMaterials(), smooth: { 1: 4 * s, 4: 1.5 * s } };
}

/**
 * La niebla: el cuerpo translúcido (alfa 190) con un borde de luz verde de 1 px, los ojos enteros, el ruedo que se
 * deshilacha y, al morir, se deshace en niebla que sube.
 */
function mistPost(r: Raster, anim: string, f: number, n: number) {
  const W = r.w, H = r.h, a0 = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) a0[i] = r.data[i * 4 + 3];
  let y1 = 0;
  for (let i = 0; i < W * H; i++) if (a0[i]) y1 = Math.max(y1, Math.floor(i / W));
  const k = anim === 'die' ? Math.max(0, (f - n * 0.3) / (n * 0.7)) : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!a0[i]) continue;
    const R = r.data[i * 4], G = r.data[i * 4 + 1], Bc = r.data[i * 4 + 2];
    const bright = R + G + Bc > 380 && G > R;
    const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1 || !a0[i - 1] || !a0[i + 1] || !a0[i - W] || !a0[i + W];
    let a = bright ? 255 : 190;
    if (edge && !bright) { r.data[i * 4] = 0x3a; r.data[i * 4 + 1] = 0xc8; r.data[i * 4 + 2] = 0x96; a = 170; }
    // el ruedo se deshilacha: abajo la niebla se adelgaza en jirones
    const fromFoot = y1 - y;
    if (fromFoot < 6 && !bright) a = Math.round(a * (0.35 + fromFoot * 0.1) * (((x * 7 + f * 3) % 5) < 3 ? 1 : 0.4));
    if (k > 0) {
      const h = ((x * 7919 + y * 104729) % 97) / 97;
      if (h < k * 1.25 - (1 - y / H) * 0.25) a = 0;
      else a = Math.round(a * (1 - k * 0.6));
    }
    r.data[i * 4 + 3] = a;
  }
  // un halo verde alrededor de las linternitas (los ojos se ven de lejos)
  const eyeM: number[] = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    const R = r.data[i * 4], G = r.data[i * 4 + 1], Bc = r.data[i * 4 + 2];
    if (a0[i] && R + G + Bc > 380 && G > R && G > 200) eyeM.push(i);
  }
  for (const i of eyeM) {
    for (const j of [i - 1, i + 1, i - W, i + W]) { if (r.data[j * 4 + 1] > 180) continue; r.data[j * 4] = 0x4a; r.data[j * 4 + 1] = 0xe0; r.data[j * 4 + 2] = 0xa8; r.data[j * 4 + 3] = Math.max(r.data[j * 4 + 3], 230); }
  }
  // al deshacerse, jirones de niebla que suben
  if (k > 0) for (let p = 0; p < 18; p++) {
    const x = Math.round(W / 2 + (((p * 37) % 23) - 11) * 1.1), y = Math.round(y1 - 4 - ((p * 13 + f * 5) % 30) * k * 1.2);
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const i = (y * W + x) * 4;
    if (r.data[i + 3]) continue;
    r.data[i] = 0x5a; r.data[i + 1] = 0xb0; r.data[i + 2] = 0x90; r.data[i + 3] = Math.round(150 * (1 - k * 0.7));
  }
}

const pick = (names: string[]) => MINO_ANIMS.filter((a) => names.includes(a.name));

export const MARINERO_NIEBLA_SPEC: BossSpec = {
  id: 'marinero_niebla', cell: 48, dims: marinerDims, scene: marinerScene, anims: pick(['idle', 'walk', 'attack', 'hit', 'die']), strikePoint: weaponHead(18), elev: 24, post: mistPost,
};

// ---------------------------------------------------------------- cangrejo de ceniza

/**
 * Cangrejo: la pose usa `extra`. `ph` (fase de las patas, 0 a 1), `claw` (tenaza abierta 0 a 1), `raise` (tenazas
 * arriba 0 a 1), `flip` (patas arriba 0 a 1), `ash` (se vuelve ceniza 0 a 1), `side` (1: camina de costado: el cuerpo
 * gira 90 grados respecto de hacia dónde va).
 */
function crabScene(cell: number, pose: BossPose): BossScene {
  // chicos (van en grupos): tres cuartos de la celda
  const s = (cell / 128) * 0.74;
  const S = (v: V3): V3 => mul(v, s);
  const B = new Body();
  const ex = pose.extra ?? {}, r = pose.root;
  const ph = ex.ph ?? 0, claw = ex.claw ?? 0.3, raise = ex.raise ?? 0, flip = ex.flip ?? 0, ash = ex.ash ?? 0;
  void flip;
  const yaw = (r.yaw ?? 0) + (ex.side ?? 0) * 90;
  const body: M3 = mm(mm(rotY(yaw), rotZ(-(r.lean ?? 0))), rotX((r.roll ?? 0) + flip * 180));
  const hb = 22 + (r.y ?? 0) + flip * 6;
  const P = (v: V3): V3 => add([(r.x ?? 0) * s, hb * s, (r.z ?? 0) * s], mv(body, S(v)));
  // el caparazón: ancho, chato, con un borde y dos bultos
  B.ell(P([0, 0, 0]), S([26, 11, 32]), 'shell', 1, { rot: body, bump: 1.2 * s });
  B.ell(P([4, 5, 0]), S([18, 7, 24]), 'shell', 1, { rot: body, bump: 1 * s });
  B.ell(P([-6, -4, 0]), S([20, 6, 26]), 'shellDark', 2, { rot: body });
  // los ojos en palitos
  for (const z of [-7, 7]) {
    const base = P([22, 6, z]), top = P([26, 18 + (ex.alert ?? 0) * 3, z * 1.2]);
    B.cone(base, top, 2 * s, 1.6 * s, 'shellDark', 3);
    B.ell(top, S([3.2, 3.2, 3.2]), 'eyes', 4);
  }
  // seis patas, tres por lado, que se mueven alternadas (el andar de costado)
  for (const zs of [-1, 1]) for (let k = 0; k < 3; k++) {
    const t = (ph + (k % 2) * 0.5 + (zs > 0 ? 0.25 : 0)) % 1;
    const lift = Math.max(0, Math.sin(t * Math.PI * 2)) * 8;
    const sweep = Math.cos(t * Math.PI * 2) * 6;
    const root = P([10 - k * 12, -2, zs * 26]);
    const knee = P([12 - k * 13 + sweep * 0.5, 14 + lift * 0.5, zs * 48]);
    const tipW: V3 = add(P([0, 0, 0]), [0, 0, 0]);
    void tipW;
    const curl = ex.curl ?? 0;
    const tip0 = add(mv(body, S([14 - k * 15 + sweep, 0, zs * 58])), [(r.x ?? 0) * s, Math.max(0, lift) * s, (r.z ?? 0) * s]);
    // al morir las patas se recogen debajo del caparazón
    const tip = curl > 0 ? add(mul(tip0, 1 - curl), mul(P([4 - k * 8, -6, zs * 30]), curl)) : tip0;
    B.chain([root, knee, tip], [3.4, 2.6, 1.2].map((v) => v * s), 'leg', 10 + k + (zs > 0 ? 3 : 0));
  }
  // las tenazas: brazo y pinza en V que se abre y se cierra
  for (const zs of [-1, 1]) {
    const up = raise * 18;
    const sh = P([22, 0, zs * 18]), el = P([34, 6 + up, zs * 30]), hand = P([46, 4 + up * 1.4, zs * 22]);
    B.cone(sh, el, 4 * s, 3.6 * s, 'shell', 20 + (zs > 0 ? 2 : 0));
    B.cone(el, hand, 3.6 * s, 5 * s, 'shell', 20 + (zs > 0 ? 2 : 0));
    const open = (10 + claw * 30) * (zs > 0 ? 1 : -1);
    const fwd = norm(sub(hand, el));
    const sideV = norm(cross(fwd, mv(body, [0, 1, 0])));
    const tipA = add(hand, add(mul(fwd, 12 * s), mul(sideV, (open * 0.12) * s)));
    const tipB = add(hand, add(mul(fwd, 10 * s), mul(sideV, (-open * 0.12) * s)));
    B.ell(hand, S([7, 5.6, 6]), 'shell', 24 + (zs > 0 ? 2 : 0), { rot: lookRot(fwd) });
    B.cone(hand, tipA, 3.8 * s, 1 * s, 'shell', 25 + (zs > 0 ? 2 : 0));
    B.cone(hand, tipB, 3 * s, 0.9 * s, 'clawTip', 25 + (zs > 0 ? 2 : 0));
  }
  const mats: Record<string, BossMaterial> = {
    shell: { ramp: makeBossRamp(mixHex('#6e6e74', '#9a9894', ash), 6, { spread: 1.15 }), surface: 'stone', tex: 0.7, scale: 1.6 },
    shellDark: { ramp: makeBossRamp(mixHex('#4a4a52', '#7a7874', ash), 5), surface: 'stone', tex: 0.5 },
    leg: { ramp: makeBossRamp(mixHex('#5a5a62', '#8a8884', ash), 5), surface: 'stone', tex: 0.3 },
    clawTip: { ramp: makeBossRamp('#3a3a42', 5), surface: 'horn', tex: 0.3 },
    eyes: { ramp: ash > 0.5 ? ['#3a3836', '#5a5856', '#7a7876'] : ['#8a3a10', '#ff8a3a', '#ffe0b0'], surface: 'glow' },
  };
  return { pieces: B.pieces, materials: mats, smooth: { 1: 3 * s } };
}

function mixHex(a: string, b: string, t: number): string {
  if (t <= 0) return a;
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * Math.min(1, t)).toString(16).padStart(2, '0')).join('');
}

const kk = (f: number, pose: BossPose, ease: BossKey['ease'] = 'linear'): BossKey => ({ f, pose, ease });
const crab = (extra: Record<string, number>, root: BossPose['root'] = {}): BossPose => ({ root, arms: { near: { pitch: 0, elbow: 0 }, far: { pitch: 0, elbow: 0 } }, legs: { near: { x: 0, y: 0 }, far: { x: 0, y: 0 } }, extra: { ph: 0, claw: 0.3, raise: 0, flip: 0, ash: 0, side: 0, ...extra } });

function crabAnims(): BossAnimDef[] {
  const idle: BossAnimDef = { name: 'idle', fps: 6, loop: true, frames: 6, keys: Array.from({ length: 6 }, (_, f) => kk(f, crab({ ph: 0, claw: 0.3 + 0.25 * Math.max(0, Math.sin((f / 6) * Math.PI * 2)), alert: f % 3 === 0 ? 1 : 0 }, { y: Math.sin((f / 6) * Math.PI * 2) * 0.8 }))) };
  // de costado: el cuerpo mira 90 grados respecto de hacia dónde va, las patas corren rápido
  const walk: BossAnimDef = { name: 'walk', fps: 14, loop: true, frames: 8, keys: Array.from({ length: 8 }, (_, f) => kk(f, crab({ ph: f / 8, side: 1, claw: 0.2 }, { y: Math.abs(Math.sin((f / 8) * Math.PI * 4)) * 1.4, roll: Math.sin((f / 8) * Math.PI * 2) * 4 }))), stride: 24 };
  const attack: BossAnimDef = {
    name: 'attack', fps: 14, loop: false, frames: 7,
    keys: [kk(0, crab({ claw: 0.3 })), kk(2, crab({ claw: 1, raise: 1 }, { lean: -10 }), 'out'), kk(3, crab({ claw: 1, raise: 1 }, { lean: -12 })), kk(4, crab({ claw: 0, raise: 0.2 }, { x: 6, lean: 8 }), 'in'), kk(6, crab({ claw: 0.3 }), 'ease')],
    events: [{ type: 'impacto', frame: 4 }],
  };
  const hit: BossAnimDef = { name: 'hit', fps: 12, loop: false, frames: 4, keys: [kk(0, crab({})), kk(1, crab({ claw: 1, raise: 0.6 }, { x: -6, lean: -14, y: 3 }), 'out'), kk(3, crab({}), 'ease')] };
  const die: BossAnimDef = {
    name: 'die', fps: 10, loop: false, frames: 10,
    keys: [kk(0, crab({})), kk(2, crab({ claw: 1, raise: 0.8 }, { y: 8, lean: -20 }), 'out'), kk(5, crab({ flip: 1, claw: 0.6, ph: 0.3 }), 'in'), kk(7, crab({ flip: 1, claw: 0.2, ash: 0.6, ph: 0.6 })), kk(9, crab({ flip: 1, claw: 0, ash: 1, ph: 0.6 }))],
  };
  return [idle, walk, attack, hit, die];
}

/** Al final de morir, el cangrejo se desarma en ceniza: los últimos cuadros se vuelven granos grises que se van. */
function crabPost(r: Raster, anim: string, f: number, n: number) {
  if (anim !== 'die') return;
  const k = Math.max(0, (f - n * 0.6) / (n * 0.4));
  if (k <= 0) return;
  for (let i = 0; i < r.w * r.h; i++) {
    if (!r.data[i * 4 + 3]) continue;
    const h = ((i * 7919) % 97) / 97;
    if (h < k * 0.85) r.data[i * 4 + 3] = 0;
  }
}

const crabDims = (cell: number): BossDims => bipedDims(cell, { hipH: 20, hipW: 8, legU: 10, legL: 10, foot: 5, spine: 14, shW: 12, armU: 10, armL: 10, hand: 4, neck: 3, head: 6 });

export const CANGREJO_CENIZA_SPEC: BossSpec = {
  id: 'cangrejo_ceniza', cell: 48, dims: crabDims, elev: 26, anims: crabAnims(), post: crabPost,
  scene: (cell: number, pose: BossPose) => crabScene(cell, pose),
};

// ---------------------------------------------------------------- medusa negra

/**
 * Medusa: la campana negra con el borde violeta que late y tentáculos que se mecen. `extra`: `pulse` (la campana se
 * contrae, 0 a 1), `sway` (fase de los tentáculos), `hover` (altura), `squash` (golpe), `dead` (se desinfla).
 */
function jellyScene(cell: number, pose: BossPose): BossScene {
  const s = (cell / 128) * 0.8;
  const S = (v: V3): V3 => mul(v, s);
  const B = new Body();
  const ex = pose.extra ?? {}, r = pose.root;
  const pulse = ex.pulse ?? 0, sway = ex.sway ?? 0, hover = (ex.hover ?? 46) + 4 + (r.y ?? 0), squash = ex.squash ?? 0, dead = ex.dead ?? 0;
  const body: M3 = mm(rotY(r.yaw ?? 0), rotZ(-(r.lean ?? 0)));
  const P = (v: V3): V3 => add([(r.x ?? 0) * s, hover * s, (r.z ?? 0) * s], mv(body, S(v)));
  const bw = (30 - pulse * 4 + squash * 6) * (1 - dead * 0.35), bh = (24 + pulse * 3 - squash * 6) * (1 - dead * 0.5);
  // la campana: un domo negro azulado, con una cara de abajo más oscura y el borde que brilla violeta
  B.ell(P([0, 8, 0]), S([bw, bh, bw]), 'bell', 1, { rot: body });
  B.ell(P([0, -2, 0]), S([bw * 0.9, 6, bw * 0.9]), 'bellDark', 2, { rot: body });
  B.torus(P([0, 0, 0]), bw * 0.92 * s, 2.6 * s, pulse > 0.5 ? 'rimHot' : 'rim', 3, mm(body, rotX(90)));
  // el corazón que se ve a través (manchas violetas tenues arriba)
  for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.4; B.ell(P([Math.cos(a) * bw * 0.4, 14 + bh * 0.3, Math.sin(a) * bw * 0.4]), S([5, 3, 5]), 'spots', 4, { rot: body }); }
  // tentáculos: ocho cadenas que cuelgan y se mecen en ondas, más largos los del medio
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const base = P([Math.cos(a) * bw * 0.7, -3, Math.sin(a) * bw * 0.7]);
    const len = (k % 2 ? 26 : 34) * (1 - dead * 0.4);
    const pts: V3[] = [base];
    for (let t = 1; t <= 4; t++) {
      const w = Math.sin(sway * Math.PI * 2 + t * 0.9 + k) * (2 + t * 1.6);
      pts.push(add(base, S([w * Math.cos(a + 1.3) - (r.lean ?? 0) * 0.15 * t, -(len * t) / 4, w * Math.sin(a + 1.3)])));
    }
    B.chain(pts, [2, 1.6, 1.2, 0.9, 0.6].map((v) => v * s), 'tentacle', 10 + k);
  }
  const mats: Record<string, BossMaterial> = {
    bell: { ramp: ['#04030a', '#0a0814', '#141020', '#1e1830', '#2c2444'], surface: 'skin', tex: 0.2 },
    bellDark: { ramp: ['#020106', '#06040c', '#0c0818'], surface: 'skin', tex: 0.1 },
    rim: { ramp: ['#3a1e7a', '#8a5aff', '#cdb4ff'], surface: 'glow' },
    rimHot: { ramp: ['#5a2aa8', '#b08aff', '#f0e4ff'], surface: 'glow' },
    spots: { ramp: ['#1e1238', '#2e1c52', '#3e2a6a'], surface: 'skin', tex: 0.1 },
    tentacle: { ramp: ['#06040c', '#100c1c', '#1c1630', '#2a2046'], surface: 'skin', tex: 0.2 },
  };
  return { pieces: B.pieces, materials: mats, smooth: { 1: 3 * s } };
}

function jellyAnims(): BossAnimDef[] {
  const base = (extra: Record<string, number>, root: BossPose['root'] = {}): BossPose => ({ root, arms: { near: { pitch: 0, elbow: 0 }, far: { pitch: 0, elbow: 0 } }, legs: { near: { x: 0, y: 0 }, far: { x: 0, y: 0 } }, extra });
  const idle: BossAnimDef = { name: 'idle', fps: 8, loop: true, frames: 8, keys: Array.from({ length: 8 }, (_, f) => kk(f, base({ pulse: Math.max(0, Math.sin((f / 8) * Math.PI * 2)), sway: f / 8, hover: 46 + Math.sin((f / 8) * Math.PI * 2 - 1) * 3 }))) };
  const walk: BossAnimDef = { name: 'walk', fps: 8, loop: true, frames: 8, keys: Array.from({ length: 8 }, (_, f) => kk(f, base({ pulse: Math.max(0, Math.sin((f / 8) * Math.PI * 2)), sway: f / 8, hover: 46 + Math.sin((f / 8) * Math.PI * 2) * 2 }, { lean: 12 }))), stride: 12 };
  const hit: BossAnimDef = { name: 'hit', fps: 12, loop: false, frames: 4, keys: [kk(0, base({ sway: 0 })), kk(1, base({ squash: 1, sway: 0.3, hover: 42 }, { x: -6 }), 'out'), kk(3, base({ sway: 0.6 }), 'ease')] };
  const die: BossAnimDef = { name: 'die', fps: 8, loop: false, frames: 10, keys: [kk(0, base({ sway: 0 })), kk(2, base({ squash: 1, pulse: 1, sway: 0.3 }), 'out'), kk(6, base({ dead: 0.7, sway: 0.7, hover: 24 }, { lean: 20 }), 'ease'), kk(9, base({ dead: 1, sway: 1, hover: 10 }, { lean: 30 }))] };
  return [idle, walk, hit, die];
}

/** Al morir la medusa se apaga: el borde violeta deja de brillar y se va haciendo transparente. */
function jellyPost(r: Raster, anim: string, f: number, n: number) {
  if (anim !== 'die') return;
  const k = Math.max(0, (f - n * 0.4) / (n * 0.6));
  for (let i = 0; i < r.w * r.h; i++) if (r.data[i * 4 + 3]) r.data[i * 4 + 3] = Math.round(r.data[i * 4 + 3] * (1 - k * 0.9));
}

export const MEDUSA_NEGRA_SPEC: BossSpec = {
  id: 'medusa_negra', cell: 48, dims: crabDims, elev: 24, anims: jellyAnims(), post: jellyPost,
  scene: (cell: number, pose: BossPose) => jellyScene(cell, pose),
};

// ---------------------------------------------------------------- el capitán ahogado

const CAPTAIN_DIMS = { hipH: 46, hipW: 9, legU: 23, legL: 22, foot: 9, spine: 31, shW: 18, armU: 20, armL: 20, hand: 6, neck: 6, head: 11, weaponLen: 30, weaponR: 9 };
const captainDims = (cell: number): BossDims => bipedDims(cell * 0.94, CAPTAIN_DIMS);

/** De fantasma (0) a capitán viejo de verdad (1). */
function captainMaterials(freed: number): Record<string, BossMaterial> {
  const m = (a: string, b: string) => mixHex(a, b, freed);
  return {
    coat: { ramp: makeBossRamp(m('#1e4a4a', '#2a3a5a'), 7, { spread: 1.2 }), surface: 'cloth', tex: 0.6, scale: 2 },
    coatTrim: { ramp: makeBossRamp(m('#6a9a80', '#c8a040'), 5, { spread: 1.1 }), surface: 'metal', tex: 0.3 },
    hat: { ramp: makeBossRamp(m('#163a3a', '#1e2638'), 6), surface: 'cloth', tex: 0.4 },
    skin: { ramp: makeBossRamp(m('#7aa8a0', '#c89a7a'), 6), surface: 'skin', tex: 0.4 },
    beard: { ramp: makeBossRamp(m('#2a5a3a', '#c8c8c0'), 6, { spread: 1.2 }), surface: 'fur', tex: 0.9, scale: 1.4 },
    boot: { ramp: makeBossRamp(m('#142a2a', '#2a1e18'), 5), surface: 'leather', tex: 0.5 },
    anchor: { ramp: makeBossRamp(m('#3a5a52', '#5a5048'), 6, { spread: 1.25 }), surface: 'metal', tex: 0.7, scale: 1.4 },
    chain: { ramp: makeBossRamp('#4a5a58', 5), surface: 'metal', tex: 0.5 },
    eyes: { ramp: freed > 0.5 ? ['#1a1a20', '#3a5a7a', '#e8f0ff'] : ['#2a8a64', FATUO, '#e8fff4'], surface: freed > 0.5 ? 'eye' : 'glow' },
    mist: { ramp: ['#1a5a48', '#3a9a7a', '#8affd0'], surface: 'glow' },
  };
}

function captainScene(cell: number, pose: BossPose, sec?: Secondary): BossScene {
  const d = captainDims(cell), s = d.s, j = solveBiped(d, pose), B = new Body();
  const S = (v: V3): V3 => mul(v, s);
  const ch = j.chest, hm = j.headM, body = j.body;
  const freed = pose.freed ?? 0;
  // el abrigo largo de capitán: pecho, faldones que llegan a las rodillas y se mecen atrás
  const hipC = loc(body, j.pelvis, S([0, 2, 0]));
  B.ell(loc(ch, j.pelvis, S([1, 18, 0])), S([12, 15, 15]), 'coat', 1, { rot: ch });
  B.ell(loc(ch, j.pelvis, S([2, 27, 0])), S([10, 8, 17]), 'coat', 1, { rot: ch });
  const kneeMid = mul(add(j.knees.near, j.knees.far), 0.5);
  const flap = (sec?.flap ?? 0) * 4 * s;
  B.cone(hipC, [kneeMid[0] - 3 * s - flap, kneeMid[1] - 6 * s, kneeMid[2]], 12.5 * s, 15 * s, 'coat', 1);
  // botones y charreteras doradas
  for (let k = 0; k < 4; k++) B.ell(loc(ch, j.pelvis, S([12.2, 10 + k * 5, 0])), S([1.2, 1.2, 1.2]), 'coatTrim', 5);
  for (const side of ['near', 'far'] as const) B.ell(add(j.shoulders[side], S([0, 3, 0])), S([5, 2.4, 5]), 'coatTrim', 6, { rot: ch });
  // piernas con botas altas
  for (const side of ['far', 'near'] as const) {
    const g = side === 'near' ? 44 : 40;
    B.cone(j.hips[side], j.knees[side], 6 * s, 5 * s, 'coat', g);
    B.cone(j.knees[side], j.ankles[side], 5.4 * s, 5 * s, 'boot', g);
    B.ell(add(j.ankles[side], mv(rotY(pose.root.yaw ?? 0), S([3, -2, 0]))), S([6, 3, 4]), 'boot', g + 1);
  }
  // la cabeza: cara vieja, barba de algas que cuelga y el sombrero de dos picos
  const H = (v: V3): V3 => loc(hm, j.headC, S(v));
  B.ell(H([0, 0, 0]), S([8, 9, 8]), 'skin', 20, { rot: hm });
  B.ell(H([7.6, 0.4, 0]), S([2.4, 2.2, 2]), 'skin', 20, { rot: hm });
  const eyes = pose.face?.eyes ?? 'open';
  for (const z of [-3, 3]) B.ell(H([7, 2, z]), S([0.8, eyes === 'closed' || eyes === 'happy' ? 0.5 : 1.3, 1.3]), 'eyes', 21, { rot: hm });
  // barba: mechones que cuelgan (de algas cuando es fantasma, blanca cuando se libera)
  for (let k = 0; k < 5; k++) {
    const z = (k - 2) * 2.6, len = 12 + (k % 2) * 4 + (2 - Math.abs(k - 2)) * 2;
    const a = H([6, -4, z]);
    const sway = (sec?.hangX ?? 0) * 2;
    B.chain([a, add(a, mv(hm, S([1 - sway, -len * 0.5, z * 0.15]))), add(a, mv(hm, S([-1 - sway * 2, -len, z * 0.3])))], [3, 2.2, 0.8].map((v) => v * s), 'beard', 22);
  }
  B.ell(H([0, 8.6, 0]), S([9, 3.4, 9]), 'hat', 23, { rot: hm });
  B.ell(H([-1, 7.4, 0]), S([7, 3, 17]), 'hat', 23, { rot: mm(hm, rotX(0)) });
  B.ell(H([0, 9.6, 0]), S([2, 2, 2]), 'coatTrim', 24);
  // brazos con puños anchos
  for (const side of ['far', 'near'] as const) {
    const g = side === 'near' ? 34 : 30;
    B.cone(j.shoulders[side], j.elbows[side], 5.4 * s, 5 * s, 'coat', g);
    B.cone(j.elbows[side], j.hands[side], 5 * s, 4.4 * s, 'coat', g);
    B.ell(j.hands[side], S([3.6, 3.4, 3.4]), 'skin', g + 1);
  }
  // el ancla: caña larga, cepo arriba, la cruz abajo con los dos brazos curvos y la argolla con cadena
  if (j.weapon) {
    const { grip, dir } = j.weapon;
    const side = norm(cross(dir, mv(body, [0, 0, 1])));
    const top = add(grip, mul(dir, -8 * s)), crown = add(grip, mul(dir, 26 * s));
    B.cone(top, crown, 2.2 * s, 2.6 * s, 'anchor', 60);
    B.cone(add(top, mul(side, -7 * s)), add(top, mul(side, 7 * s)), 1.6 * s, 1.6 * s, 'anchor', 61);
    B.torus(add(top, mul(dir, -3 * s)), 2.4 * s, 0.9 * s, 'anchor', 62, lookRot(side, dir));
    for (const zs of [-1, 1]) {
      const pts: V3[] = [crown, add(crown, add(mul(side, zs * 7 * s), mul(dir, 1 * s))), add(crown, add(mul(side, zs * 11 * s), mul(dir, -5 * s))), add(crown, add(mul(side, zs * 11.5 * s), mul(dir, -10 * s)))];
      B.chain(pts, [3, 2.6, 2.2, 1].map((v) => v * s), 'anchor', 63);
      B.cone(pts[3], add(pts[3], add(mul(side, zs * 2 * s), mul(dir, -1 * s))), 3 * s, 0.6 * s, 'anchor', 64);
    }
    // eslabones de cadena que cuelgan del cepo hasta la mano de atrás
    const far = j.hands.far;
    for (let k = 1; k < 5; k++) { const t = k / 5; const p = add(add(top, mul(sub(far, top), t)), [0, -Math.sin(t * Math.PI) * 6 * s, 0]); B.ell(p, S([1.4, 1.4, 1.4]), 'chain', 70 + k); }
  }
  // la niebla del fantasma que le sale de los hombros y el ruedo (se va al liberarse)
  if (freed < 0.95 && (pose.aura ?? 0.5) > 0.05) for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    B.ell(add(hipC, S([Math.cos(a) * 14, -14 + (k % 2) * 3, Math.sin(a) * 14])), S([2.2, 2.2, 2.2].map((v) => v * (1 - freed)) as V3), 'mist', 80 + k);
  }
  return { pieces: B.pieces, materials: captainMaterials(freed), smooth: { 1: 3 * s, 20: 1.2 * s } };
}

const KNEEL_C: BossPose = {
  root: { y: -22, lean: 6, x: -2 }, spine: { bend: 10 }, head: { pitch: 14 },
  arms: { near: { pitch: 20, spread: 18, elbow: 40 }, far: { pitch: 18, spread: 18, elbow: 42 } },
  legs: { near: { x: -14, y: 0, z: 2, toe: 60 }, far: { x: 12, y: 0, z: 3 } },
  weapon: { angle: 0, drop: true }, face: { eyes: 'closed', mouth: 0 }, aura: 1,
};
const STAND = over(GUARD, { root: { y: -2, lean: 0 }, spine: { bend: 0 }, head: { pitch: -4 }, weapon: { angle: 0, drop: true }, face: { eyes: 'open' }, aura: 0, freed: 1 });
const SALUTE = over(STAND, { arms: { near: { pitch: 150, spread: 30, elbow: 128 } }, head: { pitch: -8 }, face: { eyes: 'happy' } });

function captainAnims(): BossAnimDef[] {
  const base = pick(['idle', 'walk', 'attack', 'hit', 'warcry']);
  // golpe fuerte: levanta el ancla con las dos manos y la sostiene temblando 7 cuadros (el aviso), y la clava
  const RAISED = over(GUARD, { root: { y: -10, lean: 2 }, spine: { bend: 0, twist: -12 }, head: { pitch: 6 }, arms: { near: { pitch: 120, spread: 14, elbow: 70 }, far: { pitch: 112, spread: 14, elbow: 74 } }, legs: { near: { x: 11, z: 3 }, far: { x: -11, z: 3 } }, weapon: { angle: -150, yaw: 0, twoHand: true }, face: { mouth: 0.5 } });
  const SLAM = over(GUARD, { root: { y: -16, lean: 12, x: -4 }, spine: { bend: 14, twist: 6 }, head: { pitch: -14 }, arms: { near: { pitch: 26, spread: 8, elbow: 6 }, far: { pitch: 24, spread: 8, elbow: 10 } }, legs: { near: { x: 9, z: 3 }, far: { x: -15, z: 3 } }, weapon: { angle: 150, yaw: 0, twoHand: true }, face: { mouth: 0.9 } });
  const heavy: BossAnimDef = {
    name: 'attack_heavy', fps: 12, loop: false, frames: 14, windup: [1, 7], shake: 1,
    keys: [
      kk(0, GUARD), kk(1, RAISED, 'out'), kk(7, over(RAISED, { root: { y: -12 }, weapon: { angle: -154 } })),
      kk(8, over(GUARD, { root: { y: -8, lean: 6 }, arms: { near: { pitch: 64, elbow: 90 }, far: { pitch: 60, elbow: 92 } }, legs: { near: { x: 12, z: 3 }, far: { x: -12, z: 3 } }, weapon: { angle: 50, yaw: 0, twoHand: true } }), 'in'),
      kk(9, SLAM, 'in'), kk(10, over(SLAM, { root: { y: -17 } })), kk(11, over(SLAM, { root: { y: -15 } })), kk(13, GUARD, 'ease'),
    ],
    events: [{ type: 'impacto', frame: 9 }],
  };
  // se libera: tambalea, se arrodilla, se le va la niebla y queda un capitán viejo; se para, saluda y se va
  const die: BossAnimDef = {
    name: 'die', fps: 8, loop: false, frames: 22,
    keys: [
      kk(0, over(GUARD, { aura: 1 })),
      kk(2, over(GUARD, { root: { x: -4, lean: -10, y: -5 }, spine: { bend: -10 }, head: { pitch: -24 }, face: { eyes: 'closed' }, aura: 1 }), 'out'),
      kk(5, KNEEL_C, 'in'),
      kk(8, over(KNEEL_C, { aura: 0.6, freed: 0.3 })),
      kk(10, over(KNEEL_C, { aura: 0.1, freed: 1, face: { eyes: 'open' }, head: { pitch: -4 } }), 'ease'),
      kk(13, STAND, 'ease'),
      kk(15, SALUTE, 'out'),
      kk(17, SALUTE),
      kk(19, over(STAND, { root: { yaw: 120, x: -2 } }), 'ease'),
      kk(21, over(STAND, { root: { yaw: 180, x: -8 }, legs: { near: { x: -6 }, far: { x: 6 } } }), 'ease'),
    ],
    events: [{ type: 'suelta', frame: 5 }],
  };
  return [...base, heavy, die];
}

/** Translúcido mientras es fantasma (con el borde de luz verde); al liberarse se vuelve sólido, y se va al final. */
function captainPost(r: Raster, anim: string, f: number, n: number) {
  const W = r.w, H = r.h, a0 = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) a0[i] = r.data[i * 4 + 3];
  // en morir: fantasma hasta el cuadro 8, sólido del 10 en adelante, y se va (se desvanece) en los últimos 3
  const ghost = anim === 'die' ? Math.max(0, Math.min(1, (10 - f) / 4)) : 1;
  const away = anim === 'die' ? Math.max(0, (f - (n - 4)) / 4) : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!a0[i]) continue;
    const R = r.data[i * 4], G = r.data[i * 4 + 1], Bc = r.data[i * 4 + 2];
    const bright = R + G + Bc > 400 && G > R;
    const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1 || !a0[i - 1] || !a0[i + 1] || !a0[i - W] || !a0[i + W];
    let a = 255;
    if (ghost > 0 && !bright) {
      a = Math.round(255 - 45 * ghost);
      if (edge) { r.data[i * 4] = Math.round(R + (0x3a - R) * ghost); r.data[i * 4 + 1] = Math.round(G + (0xc8 - G) * ghost); r.data[i * 4 + 2] = Math.round(Bc + (0x96 - Bc) * ghost); }
    }
    r.data[i * 4 + 3] = Math.round(a * (1 - away));
  }
}

export const CAPITAN_AHOGADO_SPEC: BossSpec = {
  id: 'capitan_ahogado', cell: 64, dims: captainDims, scene: captainScene, anims: captainAnims(), strikePoint: weaponHead(28), elev: 24, post: captainPost,
};
