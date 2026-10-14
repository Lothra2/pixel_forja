import { type V3, type M3, add, mul, mv, mm, rotX, rotY, rotZ } from './sdf';
import { Body, loc } from './build';
import { bipedDims, solveBiped, type BossPose, type BossDims } from './rig';
import { makeBossRamp, type BossScene } from './render';
import type { Secondary } from './secondary';
import type { BossSpec } from './sheet';
import { type BossAnimDef, type BossKey, over } from './anim';
import { citizenScene, type CitizenLook } from './ciudadano';
import { createRaster, type Raster } from '../core/raster';

/**
 * Los enemigos del Mundo 6 (La Fragua de las Luces), con el motor de volúmenes (8 direcciones, pivote medido).
 * Terror de cuento: tensión sin sustos. Lo que ataca siempre se ve antes de pegar.
 *
 * - `hollin` (32): una bolita de hollín redonda y peluda con dos ojitos blancos grandes. Rebota, rueda y salta a
 *   pegarse (4 cuadros agachada antes). `pegado`: chiquito, encima de la heroína. Al morir se deshace en polvo negro.
 * - `salamandra_brasa` (48): lagartija de brasa con ojos grandes, se lee en lo oscuro por su brillo. Escupe brasas
 *   (4 cuadros con la boca brillando). `piedra`: mojada, negra y quieta, humea. Al morir se apaga y queda una piedrita.
 * - `farolero_cadenas` (64): una armadura vacía con dos brasas por ojos y una jaula de luz a la espalda. Puñetazo de
 *   hierro y la cadena que gira (8 cuadros de aviso). Al morir se desarma y la jaula cae y se abre.
 * - `carcelero` (64, minijefe): carcelero de hierro enorme con aro de llaves. Al morir se le cae el aro, se quita el
 *   casco y queda un viejito herrero que saluda.
 */

const kk = (f: number, pose: BossPose, ease: BossKey['ease'] = 'linear'): BossKey => ({ f, pose, ease });
const cyc = (n: number, f: number, ph = 0) => Math.sin((f / n) * Math.PI * 2 + ph);
const hash = (x: number, y: number, s: number) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function put(r: Raster, x: number, y: number, c: string, a = 255) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= r.w || y >= r.h) return;
  const k = (y * r.w + x) * 4, v = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  if (a >= 255 || !r.data[k + 3]) { r.data[k] = v[0]; r.data[k + 1] = v[1]; r.data[k + 2] = v[2]; r.data[k + 3] = Math.max(a, r.data[k + 3]); return; }
  const t = a / 255;
  for (let i = 0; i < 3; i++) r.data[k + i] = Math.round(r.data[k + i] * (1 - t) + v[i] * t);
  r.data[k + 3] = Math.max(r.data[k + 3], a);
}
function gait(S: number, lift: number, duty: number, n: number): { x: number; y: number; z: number }[] {
  const out: { x: number; y: number; z: number }[] = [];
  for (let f = 0; f < n; f++) {
    const t = f / n;
    if (t < duty) out.push({ x: S - (2 * S * t) / duty, y: 0, z: 1 });
    else { const u = (t - duty) / (1 - duty); out.push({ x: -S + 2 * S * (u * u * (3 - 2 * u)), y: Math.sin(u * Math.PI) * lift, z: 1.5 }); }
  }
  return out;
}
const lowest = (r: Raster) => { for (let y = r.h - 1; y >= 0; y--) for (let x = 0; x < r.w; x++) if (r.data[(y * r.w + x) * 4 + 3] > 150) return y; return r.h - 4; };
/** Un halo de un pixel alrededor de lo que brilla naranja (los ojos de brasa y la boca): se ven de lejos. */
function emberHalo(r: Raster, col = '#ff7020') {
  const W = r.w, H = r.h, hot: number[] = [];
  for (let i = 0; i < W * H; i++) { const R = r.data[i * 4], G = r.data[i * 4 + 1], B = r.data[i * 4 + 2]; if (r.data[i * 4 + 3] && R > 240 && G > 150 && B < 140) hot.push(i); }
  const set = new Set(hot);
  for (const i of hot) { const x = i % W, y = Math.floor(i / W); for (const [dx, dy] of [[1, 0], [-1, 0], [0, -1], [0, 1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H || set.has(Y * W + X)) continue; put(r, X, Y, col, 170); } }
}
/** El rebote del fuego: el borde de abajo y de la derecha de cada figura se tiñe de naranja (como los objetos). */
function fireRim(r: Raster, k = 0.42) {
  const W = r.w, H = r.h, a0 = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) a0[i] = r.data[i * 4 + 3] > 150 ? 1 : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!a0[y * W + x]) continue;
    if ((x + 1 < W && !a0[y * W + x + 1]) || (y + 1 < H && !a0[(y + 1) * W + x])) put(r, x, y, '#ff7020', Math.round(255 * k));
  }
}
const DUMMY = { hipH: 20, hipW: 5, legU: 10, legL: 10, foot: 5, spine: 15, shW: 7, armU: 9, armL: 9, hand: 3, neck: 3, head: 7 };

// ---------------------------------------------------------------- el hollín

/**
 * El hollín: una bola de pelo negro con mechones que se paran, dos ojos blancos redondos y grandes (con la pupila
 * que mira para adelante) y dos patitas. `extra`: `hop` (altura), `squash` (-1 estirado a 1 aplastado), `roll`
 * (vuelta de la bola al rodar), `small` (pegado: más chiquito) y `look` (los ojos miran para arriba al saltar).
 */
function hollinScene(cell: number, pose: BossPose): BossScene {
  const ex = pose.extra ?? {};
  const small = ex.small ?? 1, s = (cell / 128) * 1.85 * small;
  const S = (v: V3): V3 => mul(v, s);
  const B = new Body();
  const sq = ex.squash ?? 0, hop = (ex.hop ?? 0) * (cell / 128) * 1.85;
  const body: M3 = mm(rotY(pose.root.yaw ?? 0), rotZ(-(pose.root.lean ?? 0)));
  const R = 19, ry = R * (1 - sq * 0.25), rxz = R * (1 + sq * 0.15);
  const c: V3 = [(pose.root.x ?? 0) * s, ry * s + hop, 0];
  const P = (v: V3): V3 => add(c, mv(body, S(v)));
  B.ell(c, S([rxz, ry, rxz]), 'soot', 1, { rot: mm(body, rotZ(-(ex.roll ?? 0))), bump: 3.2 * s });
  // los mechones que se paran arriba
  for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + (ex.roll ?? 0) * 0.02; B.cone(P([Math.cos(a) * 8, ry * 0.8, Math.sin(a) * 8]), P([Math.cos(a) * 11, ry * 1.08 + 2, Math.sin(a) * 11]), 4 * s, 0.6 * s, 'soot', 2); }
  // los ojos grandes y la pupila
  const look = ex.look ?? 0;
  for (const z of [-1, 1]) {
    const e = P([R * 0.8, 3 + sq * -2, z * 8]);
    B.ell(e, S([4.5, ex.blink ? 1.2 : 8.2 * (1 - sq * 0.15), 6.4]), 'eyeW', 3);
    if (!ex.blink) B.ell(add(e, mv(body, S([3.6, 0.6 + look * 3, z * 0.6]))), S([2.4, 4, 3.2]), 'pupil', 4);
    if (!ex.blink) B.ell(add(e, mv(body, S([4.4, 3.2 + look * 2, z * 1.6 - 1.2]))), S([1.2, 1.4, 1.2]), 'glint', 5);
  }
  // las patitas
  if (small >= 1) for (const z of [-1, 1]) B.ell(P([4, -ry + 3, z * 9]), S([5, 3, 4]), 'soot', 6);
  return {
    pieces: B.pieces, smooth: { 1: 4 * s, 2: 4 * s },
    materials: {
      soot: { ramp: ['#060406', '#100c10', '#1a1418', '#262022', '#342c2c', '#4a3e3a'], surface: 'fur', tex: 0.9, scale: 1.2 },
      eyeW: { ramp: ['#a8a8b0', '#e0e0e8', '#ffffff'], surface: 'skin', tex: 0.05 },
      pupil: { ramp: ['#020204', '#0a0a10'], surface: 'eye' },
      glint: { ramp: ['#ffffff', '#ffffff'], surface: 'glow' },
    },
  };
}

const H0 = (extra: Record<string, number> = {}, root: BossPose['root'] = {}): BossPose => ({ root, arms: { near: { pitch: 0, elbow: 0 }, far: { pitch: 0, elbow: 0 } }, legs: { near: { x: 0, y: 0 }, far: { x: 0, y: 0 } }, extra: { hop: 0, squash: 0, roll: 0, small: 1, look: 0, blink: 0, ...extra } });

function hollinAnims(): BossAnimDef[] {
  // rebota en el lugar, aplastándose al tocar el piso
  const idle: BossAnimDef = { name: 'idle', fps: 8, loop: true, frames: 6, keys: [0, 1, 2, 3, 4, 5].map((f) => { const h = Math.abs(Math.sin((f / 6) * Math.PI)); return kk(f, H0({ hop: h * 6, squash: f === 0 ? 0.6 : -h * 0.3, blink: f === 4 ? 1 : 0 })); }) };
  // rueda y salta de a saltitos
  const walk: BossAnimDef = { name: 'walk', fps: 10, loop: true, frames: 6, stride: 14, keys: [0, 1, 2, 3, 4, 5].map((f) => { const h = Math.abs(Math.sin((f / 6) * Math.PI)); return kk(f, H0({ hop: h * 7, squash: f === 0 ? 0.5 : -h * 0.25, roll: f * 60 }, { lean: 8 })); }) };
  // se agacha (4 cuadros, tiembla y mira para arriba) y salta a pegarse
  const attack: BossAnimDef = {
    name: 'attack', fps: 10, loop: false, frames: 10, windup: [1, 4], shake: 0.6,
    keys: [kk(0, H0()), kk(1, H0({ squash: 0.6, look: 0.6 }), 'out'), kk(4, H0({ squash: 0.85, look: 1 })), kk(5, H0({ hop: 5, squash: -0.5 }, { x: 4, lean: 12 }), 'in'), kk(6, H0({ hop: 4, squash: -0.3 }, { x: 7, lean: 8 })), kk(7, H0({ hop: 1, squash: 0.5 }, { x: 8 })), kk(9, H0({}, { x: 8 }), 'ease')],
    events: [{ type: 'impacto', frame: 6 }],
  };
  // pegado a la heroína: chiquito, se aprieta y se suelta, parpadeando
  const pegado: BossAnimDef = { name: 'pegado', fps: 8, loop: true, frames: 4, keys: [0, 1, 2, 3].map((f) => kk(f, H0({ small: 0.62, squash: f % 2 ? 0.4 : -0.2, hop: 0, blink: f === 3 ? 1 : 0, look: 0.4 }))) };
  const hit: BossAnimDef = { name: 'hit', fps: 12, loop: false, frames: 4, keys: [kk(0, H0()), kk(1, H0({ squash: -0.4, hop: 3, blink: 1 }, { x: -3, lean: -12 }), 'out'), kk(3, H0(), 'ease')] };
  const die: BossAnimDef = { name: 'die', fps: 10, loop: false, frames: 10, keys: [kk(0, H0()), kk(2, H0({ squash: -0.3, hop: 4, blink: 1 }), 'out'), kk(4, H0({ squash: 0.8, blink: 1 }), 'in'), kk(9, H0({ squash: 0.9, blink: 1 }))] };
  return [idle, walk, attack, pegado, hit, die];
}

/** Al morir se deshace en polvo negro que se asienta, con una chispita que sube. */
function hollinPost(r: Raster, anim: string, f: number, n: number) {
  fireRim(r, 0.3);
  if (anim !== 'die') return;
  const k = Math.max(0, (f - 3) / (n - 4));
  if (k <= 0) return;
  const W = r.w, H = r.h, g = lowest(r);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (!r.data[i + 3]) continue;
    if (hash(x, y, 91) < k * 1.4) { r.data[i + 3] = 0; if (hash(x, y, 92) > 0.75) put(r, x + (hash(x, y, 93) - 0.5) * 6 * k, Math.min(g, y + k * 8), hash(x, y, 94) > 0.5 ? '#1a1418' : '#3a3030', Math.round(220 * (1 - k * 0.5))); }
  }
  // la chispita que se escapa
  put(r, W / 2 + 2, g - 4 - k * 14, '#ffd060'); put(r, W / 2 + 2, g - 3 - k * 14, '#ff7020', 200);
}

export const HOLLIN_SPEC: BossSpec = {
  id: 'hollin', cell: 32, dims: (cell) => bipedDims(cell, DUMMY), elev: 26, anims: hollinAnims(), post: hollinPost,
  scene: (cell, pose) => hollinScene(cell, pose),
  strikePoint: () => [10, 6, 0],
};

// ---------------------------------------------------------------- la salamandra de brasa

/**
 * La salamandra: cuerpo largo y bajo de brasa (rojo hondo con grietas que brillan naranja en el lomo), cabeza
 * redonda con ojos grandes amarillos, cuatro patas cortas y la cola que se mueve. `extra`: `ph` (fase del paso),
 * `tail` (vaivén), `mouth` (0 a 1: la boca abierta que brilla), `cool` (0 brasa, 1 piedra negra: mojada o apagada),
 * `small` (al morir se encoge en una piedrita), `head` (la cabeza sube) y `blink`.
 */
function salamandraScene(cell: number, pose: BossPose): BossScene {
  const ex = pose.extra ?? {};
  const small = ex.small ?? 1, s = (cell / 128) * 1.12 * small;
  const S = (v: V3): V3 => mul(v, s);
  const B = new Body();
  const body: M3 = mm(rotY(pose.root.yaw ?? 0), rotZ(-(pose.root.lean ?? 0)));
  const base: V3 = [(pose.root.x ?? 0) * s, (pose.root.y ?? 0) * s, 0];
  const P = (v: V3): V3 => add(base, mv(body, S(v)));
  const ph = ex.ph ?? 0, tail = ex.tail ?? 0, mouth = ex.mouth ?? 0, cool = ex.cool ?? 0, hd = ex.head ?? 0;
  const wig = Math.sin(ph) * 3;
  // el cuerpo: tres gajos que serpentean
  const spine: V3[] = [P([22, 12, 0]), P([8, 11, wig]), P([-8, 11, -wig]), P([-20, 10, wig * 0.6])];
  B.ell(spine[1], S([14, 8, 10]), 'skin', 1, { rot: body, bump: 0.5 * s });
  B.ell(spine[2], S([13, 7.4, 9]), 'skin', 1, { rot: body, bump: 0.5 * s });
  B.ell(add(spine[1], mv(body, S([0, -3, 0]))), S([11, 4, 8]), 'belly', 2, { rot: body });
  // la cola que se angosta y se mueve
  const t1 = P([-30, 9, wig + tail * 8]), t2 = P([-42, 7, tail * 16]), t3 = P([-52, 5 + tail * 2, tail * 22]);
  B.chain([spine[3], t1, t2, t3], [7.4, 5, 3, 1.2].map((v) => v * s), 'skin', 3, { bump: 0.4 * s });
  // la cabeza redonda (grande, de cuento) con el hocico chato
  const hb = P([30, 16 + hd * 6, 0]);
  B.ell(hb, S([12, 10, 11]), 'skin', 4, { rot: body, bump: 0.3 * s });
  B.ell(add(hb, mv(body, S([9, -2, 0]))), S([6, 5, 7.4]), 'skin', 4, { rot: body });
  // la boca: se abre y brilla adentro
  if (mouth > 0.05) B.ell(add(hb, mv(body, S([12.6, -3, 0]))), S([2.4, 1 + mouth * 3.4, 5]), 'mouth', 5, { rot: body });
  // los ojos grandes, arriba de la cabeza, amarillos con la pupila de rayita
  for (const z of [-1, 1]) {
    const e = add(hb, mv(body, S([5, 6.4, z * 6.2])));
    B.ell(e, S([4, ex.blink ? 1.2 : 5, 4.2]), 'eyeY', 6);
    if (!ex.blink) B.ell(add(e, mv(body, S([3, 0.2, z * 0.4]))), S([1.8, 3.4, 2.6]), 'pupil', 7);
    if (!ex.blink) B.ell(add(e, mv(body, S([3.8, 2.4, z * 1.4 - 0.6]))), S([1, 1.1, 1]), 'glint', 8);
  }
  // las grietas que brillan en el lomo
  for (let k = 0; k < 8; k++) B.ell(P([18 - k * 6, 18.4 - Math.abs(k - 3.5) * 0.5, (k % 2 ? 1 : -1) * 3 + (k % 2 ? wig : -wig) * 0.4]), S([3.2, 1.6, 2.4]), 'ember', 9);
  for (const z of [-1, 1]) for (let k = 0; k < 3; k++) B.ell(P([12 - k * 10, 13, z * 9.6]), S([2.4, 1.6, 1]), 'ember', 9);
  // las patas: cuatro cortas que pisan con el paso
  ([[18, 1, 0], [18, -1, Math.PI], [-12, 1, Math.PI], [-12, -1, 0]] as [number, number, number][]).forEach(([x, z, o], i) => {
    const step = Math.sin(ph + o), lift = Math.max(0, Math.cos(ph + o)) * 4;
    const hip = P([x, 9, z * 8]), foot = P([x + step * 7, lift, z * 15]);
    B.cone(hip, foot, 3.6 * s, 2.6 * s, 'skin', 10 + i);
    B.ell(add(foot, [0, 1 * s, 0]), S([4.4, 2, 4]), 'skin', 10 + i);
  });
  const coolHex = (a: string) => mixC(a, '#16120e', cool);
  return {
    pieces: B.pieces, smooth: { 1: 4 * s, 3: 2 * s, 4: 3 * s },
    materials: {
      skin: { ramp: makeBossRamp(coolHex('#4a1610'), 6, { spread: 1.4, hue: 14 }), surface: cool > 0.5 ? 'stone' : 'leather', tex: 0.5, scale: 1.6 },
      belly: { ramp: makeBossRamp(coolHex('#a8401a'), 5, { spread: 1.1 }), surface: 'leather', tex: 0.3 },
      ember: cool > 0.5 ? { ramp: ['#2a2420', '#3a322c'], surface: 'stone', tex: 0.2 } : { ramp: ['#c04010', '#ff9030', '#fff0a0'], surface: 'glow' },
      mouth: { ramp: mouth > 0.6 ? ['#ff7020', '#ffd060', '#fff8d0'] : ['#8a2000', '#ff7020', '#ffb040'], surface: 'glow' },
      eyeY: cool > 0.7 ? { ramp: ['#3a3430', '#4a4440', '#5a544e'], surface: 'skin', tex: 0.1 } : { ramp: ['#b8a888', '#e8dcc0', '#fffaf0'], surface: 'skin', tex: 0.05 },
      pupil: { ramp: ['#060202', '#140808'], surface: 'eye' },
      glint: { ramp: ['#ffffff', '#ffffff'], surface: 'glow' },
    },
  };
}

function mixC(a: string, b: string, t: number): string {
  if (t <= 0) return a;
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * Math.min(1, t)).toString(16).padStart(2, '0')).join('');
}

const S0 = (extra: Record<string, number> = {}, root: BossPose['root'] = {}): BossPose => ({ root, arms: { near: { pitch: 0, elbow: 0 }, far: { pitch: 0, elbow: 0 } }, legs: { near: { x: 0, y: 0 }, far: { x: 0, y: 0 } }, extra: { ph: 0, tail: 0, mouth: 0, cool: 0, small: 1, head: 0, blink: 0, ...extra } });

function salamandraAnims(): BossAnimDef[] {
  const idle: BossAnimDef = { name: 'idle', fps: 6, loop: true, frames: 6, keys: [0, 1, 2, 3, 4, 5].map((f) => kk(f, S0({ tail: cyc(6, f) * 0.6, head: cyc(6, f, 1) * 0.2, blink: f === 4 ? 1 : 0 }, { y: cyc(6, f) * 0.4 }))) };
  // rápida: el cuerpo serpentea y las patas van cruzadas
  const walk: BossAnimDef = { name: 'walk', fps: 14, loop: true, frames: 8, stride: 30, keys: Array.from({ length: 8 }, (_, f) => kk(f, S0({ ph: (f / 8) * Math.PI * 2, tail: -cyc(8, f) * 0.9 }))), events: [{ type: 'paso', frame: 0 }, { type: 'paso', frame: 4 }] };
  // escupe: levanta la cabeza con la boca brillando (4 cuadros) y escupe la brasa
  const attack: BossAnimDef = {
    name: 'attack', fps: 10, loop: false, frames: 9, windup: [1, 4], shake: 0.5,
    keys: [kk(0, S0()), kk(1, S0({ head: 0.45, mouth: 0.35, tail: 0.5 }, { x: -1 }), 'out'), kk(4, S0({ head: 0.6, mouth: 0.8, tail: 0.7 }, { x: -2 })), kk(5, S0({ head: 0.1, mouth: 1, tail: -0.5 }, { x: 1, lean: 5 }), 'in'), kk(6, S0({ head: 0, mouth: 0.5 }, { x: 2 })), kk(8, S0(), 'ease')],
    events: [{ type: 'impacto', frame: 5 }],
  };
  // mojada: negra, quieta, con los ojitos entrecerrados (el humo lo pone el retoque)
  const piedra: BossAnimDef = { name: 'piedra', fps: 4, loop: true, frames: 4, keys: [0, 1, 2, 3].map((f) => kk(f, S0({ cool: 1, blink: 1, head: -0.1 }, { y: -1 }))) };
  const hit: BossAnimDef = { name: 'hit', fps: 12, loop: false, frames: 4, keys: [kk(0, S0()), kk(1, S0({ blink: 1, tail: 0.8, head: 0.4 }, { x: -2, lean: -8 }), 'out'), kk(3, S0(), 'ease')] };
  // se apaga: se enrosca, se pone negra y se achica en una piedrita tibia
  const die: BossAnimDef = { name: 'die', fps: 8, loop: false, frames: 10, keys: [kk(0, S0()), kk(2, S0({ blink: 1, tail: 1, head: 0.3 }), 'out'), kk(5, S0({ blink: 1, tail: 1.4, cool: 0.7, small: 0.75 }), 'ease'), kk(9, S0({ blink: 1, tail: 1.6, cool: 1, small: 0.42 }, { y: -2 }), 'ease')] };
  return [idle, walk, attack, piedra, hit, die];
}

/** El humo de la salamandra mojada y el brillo de la boca y del lomo; al morir, la piedrita queda tibia. */
function salamandraPost(r: Raster, anim: string, f: number) {
  if (anim !== 'piedra' && !(anim === 'die' && f >= 5)) emberHalo(r);
  if (anim === 'piedra' || (anim === 'die' && f >= 6)) {
    const W = r.w, g = lowest(r), cx = W / 2;
    for (let i = 0; i < 12; i++) { const t = ((f * 3 + i * 5) % 12) / 12; put(r, cx + (hash(i, 1, 101) - 0.5) * 16 + Math.sin(t * 6 + i) * 2, g - 6 - t * 22, t < 0.5 ? '#c8c0b8' : '#8a827a', Math.round(170 * (1 - t))); }
    if (anim === 'die') for (const [dx, dy] of [[0, -2], [1, -2], [-1, -1]]) put(r, cx + dx, g + dy, '#a05030');
  }
}

export const SALAMANDRA_SPEC: BossSpec = {
  id: 'salamandra_brasa', cell: 48, dims: (cell) => bipedDims(cell, DUMMY), elev: 26, anims: salamandraAnims(), post: salamandraPost,
  scene: (cell, pose) => salamandraScene(cell, pose),
  strikePoint: () => [18, 8, 0],
};

// ---------------------------------------------------------------- la armadura vacía (el farolero y el Carcelero)

interface ArmorLook {
  /** hierro de la armadura */
  iron: string;
  /** cuánto más ancha y pesada (el Carcelero) */
  bulk: number;
  /** casco: cubeta con rendija (farolero) o yelmo redondo con cresta (carcelero) */
  helm: 'cubeta' | 'yelmo';
  /** la jaula de luz a la espalda (el farolero) */
  cage?: boolean;
  /** el aro de llaves en el cinturón (el Carcelero) */
  keys?: boolean;
}

const ARMOR = { hipH: 40, hipW: 8, legU: 20, legL: 19, foot: 8, spine: 30, shW: 15, armU: 18, armL: 17, hand: 5, neck: 4, head: 11, weaponLen: 30, weaponR: 4 };
const armorDims = (k: number) => (cell: number): BossDims => bipedDims(cell * k, ARMOR);

/** Dónde va la jaula del farolero (marco del personaje, pixeles de la celda), según la pose. */
export function faroleroJaula(cell: number, pose: BossPose, k = FK): V3 {
  const d = armorDims(k)(cell), s = d.s, j = solveBiped(d, pose), ex = pose.extra ?? {};
  const fall = ex.cageFall ?? 0;
  const onBack = loc(j.chest, j.pelvis, mul([-10, 47, -8], s));
  // al morir la jaula cae al piso detrás de la armadura
  const ground: V3 = [onBack[0] - 8 * s, 7 * s, onBack[2]];
  return add(mul(onBack, 1 - fall), mul(ground, fall));
}

/**
 * Una armadura vacía en 3D: peto, hombreras, guanteletes, grebas y botas de hierro con remaches y óxido, el casco con
 * la rendija negra y dos brasas por ojos. Adentro no hay nadie. `extra`: `eyes` (brillo de los ojos), `broken` (se
 * desarma: las piezas se separan y caen), `chain` (la cadena que gira: ángulo y largo), `cageFall` y `cageOpen` (la
 * jaula del farolero que cae y se abre), `keys` (el aro de llaves que se suelta) y `helmOff` (el casco que se saca).
 */
function armorScene(look: ArmorLook, cell: number, pose: BossPose, sec: Secondary | undefined, k: number): BossScene {
  const d = armorDims(k)(cell), s = d.s, j = solveBiped(d, pose), B = new Body();
  const S = (v: V3): V3 => mul(v, s);
  const ch = j.chest, hm = j.headM, body = j.body;
  const ex = pose.extra ?? {};
  const bk = look.bulk, br = ex.broken ?? 0;
  // cuando se desarma, cada pieza cae hacia el piso y se corre un poco hacia afuera
  const drop = (p: V3, sx: number, sz: number): V3 => (br > 0 ? [p[0] + sx * br * 10 * s, p[1] - Math.min(p[1] - 3 * s, br * p[1]), p[2] + sz * br * 10 * s] : p);
  // ---------- el peto, la faldilla y el cinturón ----------
  B.ell(drop(loc(ch, j.pelvis, S([1, 20, 0])), 0.2, 0), S([10 * bk, 12, 12.4 * bk]), 'iron', 1, { rot: ch, bump: 0.3 * s });
  B.ell(drop(loc(ch, j.pelvis, S([6 * bk, 21, 0])), 0.4, 0), S([4, 9, 9 * bk]), 'ironHi', 2, { rot: ch });
  B.ell(drop(loc(body, j.pelvis, S([0, 4, 0])), -0.2, 0), S([9 * bk, 6, 11 * bk]), 'iron', 3, { rot: body });
  B.ell(drop(loc(body, j.pelvis, S([0, 8, 0])), -0.2, 0), S([9.6 * bk, 1.8, 11.8 * bk]), 'leather', 4, { rot: body });
  // los remaches del peto
  for (let q = 0; q < 5; q++) B.ell(drop(loc(ch, j.pelvis, S([10 * bk + 0.4, 14 + q * 3, (q % 2 ? 4 : -4)])), 0.4, 0), S([1, 1, 1]), 'rivet', 5);
  // ---------- las piernas: grebas y botas ----------
  for (const side of ['far', 'near'] as const) {
    const g = side === 'near' ? 44 : 40, zs = side === 'near' ? 1 : -1;
    B.cone(drop(j.hips[side], 0, zs * 0.4), drop(j.knees[side], 0, zs * 0.6), 5.4 * s * bk, 4.6 * s * bk, 'iron', g);
    B.ell(drop(j.knees[side], 0.2, zs * 0.6), S([4.4, 4, 4.4]), 'ironHi', g);
    B.cone(drop(j.knees[side], 0.2, zs * 0.6), drop(j.ankles[side], 0.2, zs * 0.6), 4.6 * s * bk, 4 * s * bk, 'iron', g);
    B.ell(drop(add(j.ankles[side], mv(rotY(pose.root.yaw ?? 0), S([3, -1.6, 0]))), 0.3, zs * 0.6), S([6.4 * bk, 3, 4.4 * bk]), 'ironDark', g + 1);
  }
  // ---------- los brazos: hombreras grandes, brazales y guanteletes ----------
  for (const side of ['far', 'near'] as const) {
    const g = side === 'near' ? 34 : 30, zs = side === 'near' ? 1 : -1;
    B.ell(drop(j.shoulders[side], -0.3, zs), S([6.6 * bk, 5.4, 6.6 * bk]), 'ironHi', g, { rot: ch });
    B.cone(drop(j.shoulders[side], -0.3, zs), drop(j.elbows[side], -0.4, zs), 4.4 * s * bk, 3.8 * s * bk, 'iron', g);
    B.cone(drop(j.elbows[side], -0.4, zs), drop(j.hands[side], -0.5, zs), 3.8 * s * bk, 4.2 * s * bk, 'iron', g);
    B.ell(drop(j.hands[side], -0.5, zs), S([4.6 * bk, 4.2 * bk, 4.2 * bk]), 'ironDark', g + 1);
  }
  // ---------- el casco ----------
  const helmOff = ex.helmOff ?? 0;
  const hk = 1.4;
  const H = (v: V3): V3 => add(drop(loc(hm, j.headC, mul([v[0], v[1] + 1, v[2]], s * hk)), 0.6, 0), mul([0, helmOff * 14 * s, helmOff * 10 * s], 1));
  const SH = (v: V3): V3 => mul(v, s * hk);
  if (look.helm === 'cubeta') {
    // la cubeta: un cilindro alto con la rendija de los ojos y respiraderos
    B.box(H([0, 1, 0]), SH([8, 9, 8]), 'iron', 20, { rot: hm, round: 2.4 * s });
    B.ell(H([0, 10, 0]), SH([8.2, 2, 8.2]), 'ironHi', 21, { rot: hm });
    B.box(H([8.1, 2.4, 0]), SH([0.6, 1.3, 6.4]), 'void', 22, { rot: hm });
  } else {
    // el yelmo redondo con la cresta y la visera de rejas
    B.ell(H([0, 2, 0]), SH([9.4, 10, 9.4]), 'iron', 20, { rot: hm, bump: 0.2 * s });
    B.ell(H([-1, 10.6, 0]), SH([7, 2.4, 1.4]), 'ironHi', 21, { rot: hm });
    B.box(H([8.6, 1, 0]), SH([0.8, 4.4, 6.4]), 'void', 22, { rot: hm });
    for (const z of [-4, -1.4, 1.4, 4]) B.box(H([9.4, 1, z]), SH([0.5, 4.6, 0.5]), 'ironHi', 23, { rot: hm });
  }
  // los ojos: dos brasas en la oscuridad del casco
  const eyes = ex.eyes ?? 0.7;
  if (eyes > 0.05 && br < 0.5) for (const z of [-2.8, 2.8]) B.ell(H([look.helm === 'cubeta' ? 8.6 : 9, 2.4, z]), SH([1, 1.1 + eyes * 0.6, 1.5 + eyes * 0.6]), 'emberEye', 24, { rot: hm });
  // ---------- la jaula del farolero a la espalda ----------
  if (look.cage) {
    const c = faroleroJaula(cell, pose, k), open = ex.cageOpen ?? 0, fall = ex.cageFall ?? 0;
    const cr = mm(body, rotZ((sec?.hangX ?? 0) * 8 + fall * 70));
    // el soporte (correas) mientras va en la espalda
    if (fall < 0.3) { B.cone(loc(ch, j.pelvis, S([-9, 12, -3])), add(c, mv(ch, S([0, 11, 0]))), 1.4 * s, 1.2 * s, 'ironDark', 49); B.cone(add(c, mv(ch, S([0, 11, 0]))), add(c, mv(ch, S([0, 9, 0]))), 1 * s, 1 * s, 'ironDark', 49); }
    for (let q = 0; q < 8; q++) {
      const a = (q / 8) * Math.PI * 2;
      if (open > 0.5 && q >= 2 && q <= 3) continue;
      B.cone(add(c, mv(cr, S([Math.cos(a) * 7.6, -8.6, Math.sin(a) * 7.6]))), add(c, mv(cr, S([Math.cos(a) * 7.6, 7.4, Math.sin(a) * 7.6]))), 0.9 * s, 0.9 * s, 'ironDark', 50);
    }
    B.ell(add(c, mv(cr, S([0, 8.4, 0]))), S([8.2, 2.6, 8.2]), 'iron', 51, { rot: cr });
    B.ell(add(c, mv(cr, S([0, -8.6, 0]))), S([8.2, 1.6, 8.2]), 'iron', 51, { rot: cr });
    if (open < 0.8) B.ell(c, S([5.2, 5.6, 5.2]), 'cageLight', 52);
  }
  // ---------- el aro de llaves del Carcelero ----------
  if (look.keys) {
    const kf = ex.keys ?? 0;
    // en el cinturón, o cayendo hasta quedar tirado en el piso, adelante
    const belt = loc(body, j.pelvis, S([2, 4, 12 * bk]));
    const ringC: V3 = kf > 0 ? [belt[0] + kf * 8 * s, belt[1] + (3 * s - belt[1]) * kf, belt[2]] : belt;
    const rr: M3 = kf > 0.5 ? mm(rotZ(90), I()) : body;
    B.torus(ringC, 6 * s, 1 * s, 'brass', 60, mm(rr, rotX(90)));
    for (let q = 0; q < 5; q++) { const a = (q / 5) * Math.PI * 2 + (sec?.hangX ?? 0); const p = add(ringC, mv(rr, S([Math.cos(a) * 6, -2 + Math.sin(a) * 2, Math.sin(a) * 6]))); B.cone(p, add(p, mv(rr, S([0, -7, 0]))), 1.2 * s, 0.8 * s, 'brass', 61); B.box(add(p, mv(rr, S([1.6, -7, 0]))), S([1.4, 1, 0.8]), 'brass', 62, { rot: rr }); }
  }
  // ---------- la cadena (el giro del farolero, la que lanza el Carcelero) ----------
  const chainA = ex.chainA, chainL = ex.chainL ?? 0;
  if (chainL > 0.5 && chainA !== undefined) {
    const h = j.hands.near, n = Math.max(3, Math.round(chainL / 6));
    const ang = (chainA * Math.PI) / 180;
    for (let q = 1; q <= n; q++) {
      const t = q / n, r = chainL * t * s;
      const p: V3 = [h[0] + Math.cos(ang) * r, Math.max(2 * s, h[1] - t * (ex.chainDrop ?? 0) * s), h[2] + Math.sin(ang) * r];
      B.ell(p, S([2.6, 2, 2.6]), q === n ? 'ironHi' : 'ironDark', 70 + (q % 2));
    }
    if (ex.chainBall) B.ell([h[0] + Math.cos(ang) * chainL * s, Math.max(4 * s, h[1] - (ex.chainDrop ?? 0) * s), h[2] + Math.sin(ang) * chainL * s], S([5, 5, 5]), 'iron', 72);
  }
  return {
    pieces: B.pieces, smooth: { 1: 2 * s },
    materials: {
      iron: { ramp: makeBossRamp(look.iron, 6, { spread: 1.3, hue: 10 }), surface: 'metal', tex: 0.5, patch: { mat: 'rust', amount: 0.22, scale: 2.4 } },
      ironHi: { ramp: makeBossRamp(mixC(look.iron, '#8a7a70', 0.35), 6, { spread: 1.25, hue: 10 }), surface: 'metal', tex: 0.4 },
      ironDark: { ramp: makeBossRamp(mixC(look.iron, '#0a0606', 0.35), 5, { spread: 1.2 }), surface: 'metal', tex: 0.4 },
      rust: { ramp: makeBossRamp('#8a4a2a', 5, { spread: 1 }), surface: 'stone', tex: 0.6, scale: 1.4 },
      rivet: { ramp: ['#6a5a50', '#a08a7a', '#d8c8b8'], surface: 'metal' },
      leather: { ramp: makeBossRamp('#4e2e1e', 5), surface: 'leather', tex: 0.4 },
      void: { ramp: ['#000000', '#060406'], surface: 'eye' },
      emberEye: { ramp: eyes > 0.6 ? ['#ff7020', '#ffb040', '#fff0a0'] : ['#8a2000', '#c04010', '#ff7020'], surface: 'glow' },
      cageLight: { ramp: ['#ffc070', '#ffe0a0', '#fffaf0'], surface: 'glow' },
      brass: { ramp: makeBossRamp('#c89a3a', 5, { spread: 1.2 }), surface: 'metal', tex: 0.3 },
    },
  };
}
const I = (): M3 => [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

// ---------------------------------------------------------------- el farolero de cadenas

const FK = 0.88;
const FAROLERO: ArmorLook = { iron: '#7a6658', bulk: 1, helm: 'cubeta', cage: true };
/** de pie, pesado, los brazos colgando con la cadena enrollada en la mano */
const FGUARD: BossPose = {
  root: { y: -1, lean: 4 }, spine: { bend: 4 }, head: { pitch: 4 },
  arms: { near: { pitch: 14, spread: 16, elbow: 24 }, far: { pitch: 10, spread: 14, elbow: 20 } },
  legs: { near: { x: 4, y: 0, z: 1.5 }, far: { x: -4, y: 0, z: 1.5 } },
  extra: { eyes: 0.6, broken: 0, cageFall: 0, cageOpen: 0, chainL: 0 },
};

function faroleroAnims(): BossAnimDef[] {
  const idle: BossAnimDef = { name: 'idle', fps: 5, loop: true, frames: 6, keys: Array.from({ length: 6 }, (_, f) => kk(f, over(FGUARD, { root: { y: -1 + cyc(6, f) * 0.5 }, head: { yaw: cyc(6, f) * 6 }, extra: { eyes: 0.55 + 0.15 * Math.abs(cyc(6, f)) } }))) };
  // lento y pesado: la jaula se mece en la espalda
  const n = 8, S = 6, near = gait(S, 3, 0.6, n);
  const walk: BossAnimDef = {
    name: 'walk', fps: 7, loop: true, frames: n, stride: (2 * S) / 0.6,
    keys: Array.from({ length: n }, (_, f) => kk(f, over(FGUARD, { root: { roll: cyc(n, f) * 4, y: -1.5 - Math.abs(cyc(n, f)) * 1.4, lean: 6 }, legs: { near: near[f], far: near[(f + n / 2) % n] }, arms: { near: { pitch: 14 - cyc(n, f) * 14 }, far: { pitch: 10 + cyc(n, f) * 14 } } }))),
    events: [{ type: 'paso', frame: 0, foot: 'near' }, { type: 'paso', frame: 4, foot: 'far' }],
  };
  // el puñetazo de hierro: lleva el puño atrás (4 de aviso) y lo pega
  const BACK = over(FGUARD, { root: { lean: -4, x: -2 }, spine: { twist: -26 }, arms: { near: { pitch: 40, spread: 20, elbow: 100 } }, extra: { eyes: 1 } });
  const PUNCH = over(FGUARD, { root: { lean: 14, x: 4, y: -2 }, spine: { twist: 22 }, arms: { near: { pitch: 92, spread: 6, elbow: 4 } }, legs: { near: { x: 9 }, far: { x: -6 } }, extra: { eyes: 1 } });
  const attack: BossAnimDef = {
    name: 'attack', fps: 10, loop: false, frames: 9, windup: [1, 4], shake: 0.6,
    keys: [kk(0, FGUARD), kk(1, BACK, 'out'), kk(4, over(BACK, { spine: { twist: -30 } })), kk(5, PUNCH, 'in'), kk(6, PUNCH), kk(8, FGUARD, 'ease')],
    events: [{ type: 'impacto', frame: 5 }],
  };
  // la cadena que gira: la suelta y empieza a hacerla girar despacio sobre la cabeza (8 de aviso), después gira en
  // un círculo amplio alrededor
  const SPIN = (a: number, L: number, drop = 4) => over(FGUARD, { root: { y: -3, lean: 2 }, spine: { twist: Math.sin((a * Math.PI) / 180) * 10 }, arms: { near: { pitch: 150, spread: 30, elbow: 20 } }, extra: { eyes: 1, chainA: a, chainL: L, chainDrop: drop, chainBall: 1 } });
  const heavy: BossAnimDef = {
    name: 'attack_heavy', fps: 10, loop: false, frames: 16, windup: [1, 8], shake: 0.6,
    keys: [kk(0, FGUARD), ...[1, 2, 3, 4, 5, 6, 7, 8].map((f) => kk(f, SPIN(f * 45, 8 + f, 6))), ...[9, 10, 11, 12, 13].map((f) => kk(f, SPIN(f * 72, 22, 16))), kk(15, FGUARD, 'ease')],
    events: [{ type: 'impacto', frame: 9 }, { type: 'impacto', frame: 11 }],
  };
  const hit: BossAnimDef = { name: 'hit', fps: 12, loop: false, frames: 4, keys: [kk(0, FGUARD), kk(1, over(FGUARD, { root: { lean: -12, x: -4 }, head: { pitch: -12 }, extra: { eyes: 0.3 } }), 'out'), kk(3, FGUARD, 'ease')] };
  // se desarma: los ojos se apagan, las piezas se separan y caen; la jaula cae al piso y se abre
  const die: BossAnimDef = {
    name: 'die', fps: 9, loop: false, frames: 14,
    keys: [kk(0, FGUARD), kk(2, over(FGUARD, { root: { lean: -8 }, head: { pitch: -14 }, extra: { eyes: 0.2 } }), 'out'), kk(4, over(FGUARD, { root: { y: -4 }, extra: { eyes: 0, broken: 0.25, cageFall: 0.3 } }), 'in'), kk(7, over(FGUARD, { root: { y: -8 }, extra: { eyes: 0, broken: 0.85, cageFall: 1 } }), 'in'), kk(9, over(FGUARD, { root: { y: -8 }, extra: { eyes: 0, broken: 1, cageFall: 1, cageOpen: 0 } })), kk(11, over(FGUARD, { root: { y: -8 }, extra: { eyes: 0, broken: 1, cageFall: 1, cageOpen: 1 } })), kk(13, over(FGUARD, { root: { y: -8 }, extra: { eyes: 0, broken: 1, cageFall: 1, cageOpen: 1 } }))],
    events: [{ type: 'aterriza', frame: 7 }, { type: 'suelta', frame: 11 }],
  };
  return [idle, walk, attack, heavy, hit, die];
}

export const FAROLERO_SPEC: BossSpec = {
  id: 'farolero_cadenas', cell: 64, dims: armorDims(FK), elev: 26, anims: faroleroAnims(), post: (r) => { fireRim(r); emberHalo(r); },
  scene: (cell, pose, sec) => armorScene(FAROLERO, cell, pose, sec, FK),
  strikePoint: (j) => j.hands.near,
};

// ---------------------------------------------------------------- El Carcelero (minijefe)

const CK = 0.88;
const CARCELERO: ArmorLook = { iron: '#5e5048', bulk: 1.28, helm: 'yelmo', keys: true };
/** el herrero viejito que queda al liberarse */
const HERRERO: CitizenLook = { skin: '#d8a888', hair: '#e8e4dc', top: '#6a4a3a', bottom: '#3a3430', shoe: '#2a2018', accent: '#8a5a3a', apron: true, beard: '#f0ece4', hairStyle: 'calvo', belly: 0.9 };
const CGUARD: BossPose = {
  root: { y: -1, lean: 4 }, spine: { bend: 6 }, head: { pitch: 4 },
  arms: { near: { pitch: 18, spread: 20, elbow: 30 }, far: { pitch: 14, spread: 20, elbow: 26 } },
  legs: { near: { x: 5, y: 0, z: 2.5 }, far: { x: -5, y: 0, z: 2.5 } },
  extra: { eyes: 0.6, keys: 0, helmOff: 0, chainL: 0 },
};

function carceleroAnims(): BossAnimDef[] {
  const idle: BossAnimDef = { name: 'idle', fps: 5, loop: true, frames: 6, keys: Array.from({ length: 6 }, (_, f) => kk(f, over(CGUARD, { root: { y: -1 + cyc(6, f) * 0.6 }, spine: { bend: 6 + cyc(6, f) * 2 }, extra: { eyes: 0.55 + 0.2 * Math.abs(cyc(6, f)) } }))) };
  const n = 8, S = 7, near = gait(S, 4, 0.58, n);
  const walk: BossAnimDef = {
    name: 'walk', fps: 7, loop: true, frames: n, stride: (2 * S) / 0.58,
    keys: Array.from({ length: n }, (_, f) => kk(f, over(CGUARD, { root: { roll: cyc(n, f) * 4, y: -2 - Math.abs(cyc(n, f)) * 1.6, lean: 7 }, legs: { near: near[f], far: near[(f + n / 2) % n] }, arms: { near: { pitch: 18 - cyc(n, f) * 16 }, far: { pitch: 14 + cyc(n, f) * 16 } } }))),
    events: [{ type: 'paso', frame: 0, foot: 'near' }, { type: 'paso', frame: 4, foot: 'far' }],
  };
  // el golpe del llavero: levanta el brazo con el aro de llaves (4 de aviso) y lo baja
  const UP = over(CGUARD, { root: { lean: -4 }, spine: { twist: -20 }, arms: { near: { pitch: 150, spread: 26, elbow: 40 } }, extra: { eyes: 1 } });
  const DOWN = over(CGUARD, { root: { lean: 16, y: -4 }, spine: { twist: 16, bend: 14 }, arms: { near: { pitch: 60, spread: 8, elbow: 6 } }, legs: { near: { x: 9 } }, extra: { eyes: 1 } });
  const attack: BossAnimDef = {
    name: 'attack', fps: 10, loop: false, frames: 10, windup: [1, 4], shake: 0.8,
    keys: [kk(0, CGUARD), kk(1, UP, 'out'), kk(4, over(UP, { arms: { near: { pitch: 156 } } })), kk(5, DOWN, 'in'), kk(6, DOWN), kk(9, CGUARD, 'ease')],
    events: [{ type: 'impacto', frame: 5 }],
  };
  // lanza la cadena en línea: la revolea a un costado (8 de aviso) y la tira derecho adelante, larga
  const WIND = (a: number) => over(CGUARD, { root: { lean: -4, x: 0 }, spine: { twist: -28 }, arms: { near: { pitch: 120, spread: 40, elbow: 30 } }, extra: { eyes: 1, chainA: a, chainL: 9, chainDrop: 4, chainBall: 1 } });
  const THROW = (L: number) => over(CGUARD, { root: { lean: 14, x: 2, y: -3 }, spine: { twist: 24 }, arms: { near: { pitch: 92, spread: 4, elbow: 2 } }, legs: { near: { x: 10 }, far: { x: -7 } }, extra: { eyes: 1, chainA: 0, chainL: L, chainDrop: 40, chainBall: 1 } });
  const heavy: BossAnimDef = {
    name: 'attack_heavy', fps: 10, loop: false, frames: 16, windup: [1, 8], shake: 0.8,
    keys: [kk(0, CGUARD), ...[1, 2, 3, 4, 5, 6, 7, 8].map((f) => kk(f, WIND(160 + f * 40))), kk(9, THROW(8), 'in'), kk(10, THROW(11)), kk(11, THROW(13)), kk(13, THROW(13)), kk(15, CGUARD, 'ease')],
    events: [{ type: 'impacto', frame: 10 }],
  };
  // se jala hacia donde cayó la cadena: inclinado, tirando con las dos manos, los pies arrastran
  const PULL = (f: number) => over(CGUARD, { root: { lean: 22, x: 4 + f * 1.2, y: -4 }, spine: { bend: 10 }, arms: { near: { pitch: 80, spread: 6, elbow: 30 }, far: { pitch: 76, spread: 6, elbow: 34 } }, legs: { near: { x: 6 + (f % 2) * 4 }, far: { x: -8 + (f % 2) * 4 } }, extra: { eyes: 1, chainA: 0, chainL: 17 - f * 1.4, chainDrop: 40, chainBall: 1 } });
  const jalar: BossAnimDef = { name: 'jalar', fps: 10, loop: true, frames: 6, stride: 26, keys: [0, 1, 2, 3, 4, 5].map((f) => kk(f, PULL(f))) };
  // el portazo: levanta las dos manos y golpea el piso
  const SLAM_UP = over(CGUARD, { root: { y: 0, lean: -8 }, spine: { bend: -10 }, head: { pitch: -16 }, arms: { near: { pitch: 160, spread: 20, elbow: 20 }, far: { pitch: 158, spread: 20, elbow: 22 } }, extra: { eyes: 1 } });
  const SLAM = over(CGUARD, { root: { y: -12, lean: 20 }, spine: { bend: 22 }, arms: { near: { pitch: 70, spread: 10, elbow: 0 }, far: { pitch: 68, spread: 10, elbow: 2 } }, legs: { near: { x: 7, z: 4 }, far: { x: -7, z: 4 } }, extra: { eyes: 1 } });
  const warcry: BossAnimDef = {
    name: 'warcry', fps: 10, loop: false, frames: 12, windup: [1, 4],
    keys: [kk(0, CGUARD), kk(2, SLAM_UP, 'out'), kk(4, SLAM_UP), kk(5, SLAM, 'in'), kk(6, over(SLAM, { root: { y: -13 } })), kk(8, SLAM), kk(11, CGUARD, 'ease')],
    events: [{ type: 'grito', frame: 5 }, { type: 'impacto', frame: 5 }],
  };
  const hit: BossAnimDef = { name: 'hit', fps: 12, loop: false, frames: 5, keys: [kk(0, CGUARD), kk(1, over(CGUARD, { root: { lean: -12, x: -4, y: -3 }, head: { pitch: -16 }, extra: { eyes: 0.4 } }), 'out'), kk(4, CGUARD, 'ease')] };
  // se libera: se le cae el aro de llaves, se quita el casco con las dos manos y queda un herrero viejito que saluda
  const KNEEL = over(CGUARD, { root: { y: -14, lean: 10, x: -2 }, spine: { bend: 12 }, head: { pitch: 16 }, arms: { near: { pitch: 20, spread: 18, elbow: 40 }, far: { pitch: 18, spread: 18, elbow: 42 } }, legs: { near: { x: -10, y: 0, z: 3, toe: 60 }, far: { x: 8, y: 0, z: 4 } }, extra: { eyes: 0.2, keys: 1 } });
  const HELM = over(KNEEL, { root: { y: -10 }, head: { pitch: -6 }, arms: { near: { pitch: 150, spread: 30, elbow: 90 }, far: { pitch: 148, spread: 30, elbow: 92 } }, extra: { eyes: 0, keys: 1, helmOff: 0.5 } });
  const STAND: BossPose = { ...over(CGUARD, { root: { y: -1, lean: 0 }, spine: { bend: 2 }, head: { pitch: -4 }, face: { eyes: 'open' } }), freed: 1 };
  const WAVE = over(STAND, { arms: { near: { pitch: 132, spread: 40, elbow: 50, open: 1 } }, head: { pitch: -8 }, face: { eyes: 'happy', mouth: 0.5 } });
  const die: BossAnimDef = {
    name: 'die', fps: 8, loop: false, frames: 22,
    keys: [
      kk(0, CGUARD), kk(2, over(CGUARD, { root: { lean: -10, x: -3, y: -3 }, head: { pitch: -20 }, extra: { keys: 0.4 } }), 'out'),
      kk(5, KNEEL, 'in'), kk(7, over(KNEEL, { extra: { keys: 1 } })), kk(9, HELM, 'ease'), kk(10, over(HELM, { extra: { helmOff: 1 } })),
      kk(11, { ...over(KNEEL, { head: { pitch: -2 }, face: { eyes: 'open' } }), freed: 1 }), kk(14, STAND, 'ease'), kk(16, over(STAND, { head: { pitch: -10 } })), kk(18, WAVE, 'ease'), kk(19, over(WAVE, { arms: { near: { spread: 22 } } })), kk(20, WAVE), kk(21, over(WAVE, { arms: { near: { spread: 22 } } })),
    ],
    events: [{ type: 'suelta', frame: 7 }],
  };
  return [idle, walk, attack, heavy, jalar, warcry, hit, die];
}

/** Al quitarse el casco sale una nubecita de hollín, y los ojos de brasa se ven de lejos. */
function carceleroPost(r: Raster, anim: string, f: number) {
  fireRim(r);
  emberHalo(r);
  if (anim === 'die' && f >= 10 && f <= 12) {
    const W = r.w, g = lowest(r);
    for (let i = 0; i < 40; i++) { const a = hash(i, 1, 111) * Math.PI * 2, d = (f - 9) * 6 * hash(i, 2, 111); put(r, W / 2 + Math.cos(a) * d * 1.4, g - 30 + Math.sin(a) * d, i % 2 ? '#3a3030' : '#6a5a50', 180); }
  }
}

export const CARCELERO_SPEC: BossSpec = {
  id: 'carcelero', cell: 64, dims: armorDims(CK), elev: 26, anims: carceleroAnims(), post: carceleroPost,
  scene: (cell, pose, sec) => ((pose.freed ?? 0) >= 0.5 ? citizenScene({ ...HERRERO }, cell, { ...pose, freed: 1 }, sec, CK * 0.98) : armorScene(CARCELERO, cell, pose, sec, CK)),
  strikePoint: (j) => j.hands.near,
};

// ---------------------------------------------------------------- los efectos

/** La brasa que escupe la salamandra (16 x 16, 4 cuadros, mirando a la derecha): una bolita al rojo con su estela. */
export function emberProjectile(): Raster[] {
  return Array.from({ length: 4 }, (_, f) => {
    const r = createRaster(16, 16);
    for (let t = 0; t < 8; t++) put(r, 10 - t, 8 + Math.sin(t * 0.9 + f) * 0.8, t < 2 ? '#ffb040' : t < 5 ? '#ff7020' : '#8a2000', Math.round(255 * (1 - t / 9)));
    for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) { const d = Math.hypot(x, y); if (d > 3.2) continue; put(r, 11 + x, 8 + y, d < 1.2 ? '#fff0a0' : d < 2.2 ? '#ffb040' : '#ff7020'); }
    put(r, 10, 7, '#ffffff');
    if (f % 2) { put(r, 7, 5, '#ffb040', 200); put(r, 6, 11, '#ff7020', 180); }
    return r;
  });
}

/** `impacto_brasa` (32 x 32, 6 cuadros): la brasa revienta en chispas y queda un humito. */
export function emberImpact(): Raster[] {
  return Array.from({ length: 6 }, (_, f) => {
    const r = createRaster(32, 32), t = (f + 1) / 6;
    if (f < 2) for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) { const d = Math.hypot(x, y) / (3 + f * 3); if (d < 1) put(r, 16 + x, 18 + y, d < 0.4 ? '#fff0a0' : d < 0.7 ? '#ffb040' : '#ff7020', Math.round(255 * (1 - d * 0.5))); }
    for (let i = 0; i < 16; i++) { const a = hash(i, 1, 121) * Math.PI * 2, d = (0.4 + hash(i, 2, 121) * 0.6) * t * 14; put(r, 16 + Math.cos(a) * d, 18 + Math.sin(a) * d * 0.7 - t * 3 + t * t * 6, i % 3 ? '#ffb040' : '#fff0a0', Math.round(255 * (1 - t * 0.8))); }
    if (f >= 2) for (let i = 0; i < 12; i++) { const x = 16 + (hash(i, 3, 121) - 0.5) * 12, y = 16 - (f - 2) * 3 - hash(i, 4, 121) * 6; put(r, x, y, '#8a827a', Math.round(140 * (1 - t * 0.6))); }
    return r;
  });
}

/** `rastro_brasa` (32 x 32, 6 cuadros, capa suelo): las brasitas que deja la salamandra, que se apagan. */
export function emberTrail(): Raster[] {
  return Array.from({ length: 6 }, (_, f) => {
    const r = createRaster(32, 32), t = f / 5;
    for (let i = 0; i < 10; i++) {
      const x = 6 + hash(i, 1, 131) * 20, y = 10 + hash(i, 2, 131) * 12, life = hash(i, 3, 131);
      const c = t < life * 0.5 ? '#ffb040' : t < life ? '#ff7020' : t < life + 0.3 ? '#8a2000' : '#2a1410';
      put(r, x, y, c, Math.round(255 * (1 - t * 0.5))); if (t < life) put(r, x + 1, y, '#c04010', 160);
    }
    return r;
  });
}

/** `aviso_cadena` (128 x 64, 8 cuadros, capa suelo): el anillo donde va a girar la cadena, con eslabones que corren. */
export function chainSpinWarning(): Raster[] {
  return Array.from({ length: 8 }, (_, f) => {
    const r = createRaster(128, 64), t = (f + 1) / 8;
    for (let y = 0; y < 64; y++) for (let x = 0; x < 128; x++) {
      const dx = (x + 0.5 - 64) / 60, dy = (y + 0.5 - 32) / 28, d = Math.hypot(dx, dy);
      if (d > 1) continue;
      const ang = (Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2);
      if (d > 0.84) { if (ang < t + 0.01 && Math.floor(ang * 40 + f) % 2 === 0) put(r, x, y, f % 2 ? '#ffb040' : '#ff7020', 230); else put(r, x, y, '#3a1408', 120); }
      else if (d < 0.84) put(r, x, y, '#1a0806', Math.round(30 + t * 70));
    }
    return r;
  });
}

/** `aviso_linea_cadena` (32 x 32, 6 cuadros en bucle, capa suelo): se repite en línea donde va a caer la cadena. */
export function chainLineWarning(): Raster[] {
  return Array.from({ length: 6 }, (_, f) => {
    const r = createRaster(32, 32);
    for (let x = 0; x < 32; x++) for (let y = 11; y <= 20; y++) {
      const edge = y === 11 || y === 20;
      if (edge) { if ((x + f * 2) % 8 < 5) put(r, x, y, '#ff7020', 220); }
      else put(r, x, y, '#1a0806', 80);
    }
    // eslabones que corren hacia adelante
    for (let k = 0; k < 3; k++) { const cx = ((k * 11 + f * 32 / 6) % 32); for (let a = 0; a < Math.PI * 2; a += 0.4) put(r, cx + Math.cos(a) * 3, 15.5 + Math.sin(a) * 2, '#ffb040', 220); }
    return r;
  });
}

/** `vapor` (64 x 64, 8 cuadros): una nube de vapor blanco que se abre y sube, con gotitas celestes. */
export function steamPuff(): Raster[] {
  return Array.from({ length: 8 }, (_, f) => {
    const r = createRaster(64, 64), t = (f + 1) / 8;
    for (let i = 0; i < 9; i++) {
      const a = hash(i, 1, 141) * Math.PI * 2, d = (0.3 + hash(i, 2, 141) * 0.7) * t * 18, rr = 5 + hash(i, 3, 141) * 5 + t * 6;
      const cx = 32 + Math.cos(a) * d, cy = 40 + Math.sin(a) * d * 0.6 - t * 18;
      for (let y = Math.floor(cy - rr); y <= cy + rr; y++) for (let x = Math.floor(cx - rr); x <= cx + rr; x++) { const q = Math.hypot(x - cx, y - cy) / rr; if (q < 1) put(r, x, y, q < 0.5 && y < cy ? '#ffffff' : '#d8ecf8', Math.round((1 - q * 0.5) * 210 * (1 - t * 0.6))); }
    }
    if (f < 4) for (let i = 0; i < 8; i++) put(r, 32 + (hash(i, 4, 141) - 0.5) * 30 * t, 44 - hash(i, 5, 141) * 10 + t * 10, '#7ad0ff');
    return r;
  });
}

void rotX; void lowest;
