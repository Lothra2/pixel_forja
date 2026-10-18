import { type V3, type M3, add, mul, mv, mm, rotX, rotY, rotZ } from './sdf';
import { Body } from './build';
import { bipedDims, type BossPose, type BossDims } from './rig';
import { makeBossRamp, type BossScene, type BossMaterial } from './render';
import type { BossAnimDef, BossKey } from './anim';
import type { BossSpec } from './sheet';
import { createRaster, type Raster } from '../core/raster';

/**
 * El jefe del Mundo 4: el Pez Farol (celda 128), con el mismo motor de volúmenes que los otros jefes grandes.
 *
 * Un pez abisal enorme y oscuro que se robó la luz del faro: la lleva en la punta de su antena y es lo más brillante
 * de la pantalla. Dientes de cuento (redondos, no filosos), ojos redondos con brillo: da tensión, no terror. Vive en
 * el agua: la escena trae la superficie (el piso) y lo que queda debajo se ve a través del agua, teñido y translúcido.
 *
 * - `idle`: sumergido. Solo se ve la lucecita sobre el agua y la sombra del cuerpo debajo.
 * - `emerger` y `hundirse`: sale y vuelve a entrar al agua.
 * - `walk`: nada medio sumergido.
 * - `attack`: sale y muerde, con 6 cuadros de preparación (abre la boca de a poco, temblando).
 * - `attack_heavy`: se hunde (6 cuadros de aviso), salta fuera del agua y cae levantando una ola (`elevacion`).
 * - `warcry`: asoma y hace brillar la luz: llama cangrejos y medusas.
 * - `hit`, `aturdido` (fuera del agua, boqueando) y `die`: se libera. La luz robada se le escapa de la antena y vuela
 *   hacia el faro, el pez se achica, pasa de negro verdoso a azul y dorado y se va nadando, chiquito y simpático.
 *
 * La pose usa `extra`: `depth` (altura del centro del cuerpo, + fuera del agua), `mouth` (0 a 1), `tail` (vaivén de
 * la cola), `fin`, `lure` (cuánto brilla la luz), `lureOff` (la luz se va: 0 en la antena, 1 lejos), `small` (tamaño,
 * 1 a 0.35) y `side` (aturdido: el cuerpo de costado).
 */

const LOOK = {
  spell: { body: '#0e1e1a', belly: '#1c322c', fin: '#163a32', spot: '#2a4a40' },
  free: { body: '#2a5aa8', belly: '#7aa8e0', fin: '#e8b850', spot: '#f0d070' },
};

function mixHex(a: string, b: string, t: number): string {
  if (t <= 0) return a;
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * Math.min(1, t)).toString(16).padStart(2, '0')).join('');
}

function materials(freed: number, lure: number): Record<string, BossMaterial> {
  const L = (k: keyof typeof LOOK.spell) => mixHex(LOOK.spell[k], LOOK.free[k], freed);
  return {
    body: { ramp: makeBossRamp(L('body'), 7, { spread: 1.3, lightUp: 0.2 }), surface: 'skin', tex: 0.6, scale: 2.4 },
    belly: { ramp: makeBossRamp(L('belly'), 6, { spread: 1.2 }), surface: 'skin', tex: 0.4 },
    fin: { ramp: makeBossRamp(L('fin'), 6, { spread: 1.2 }), surface: 'cloth', tex: 0.5, scale: 1.6 },
    spot: { ramp: makeBossRamp(L('spot'), 5), surface: 'skin', tex: 0.2 },
    mouthIn: { ramp: ['#06060e', '#0e0e1c', '#18182a', '#24243a'], surface: 'skin', tex: 0.2 },
    tongue: { ramp: makeBossRamp('#7a5a6e', 5), surface: 'skin', tex: 0.3 },
    tooth: { ramp: ['#8a8a78', '#b8b8a4', '#e0dccc', '#fffaf0'], surface: 'bone' as 'horn', tex: 0.2 },
    eyeball: { ramp: makeBossRamp(mixHex('#c8d8c0', '#f0f4ff', freed), 5), surface: 'skin', tex: 0.1 },
    pupil: { ramp: ['#04080a', '#0a1418'], surface: 'eye' },
    stalk: { ramp: makeBossRamp(L('fin'), 5), surface: 'skin', tex: 0.3 },
    lure: { ramp: lure > 0.5 ? ['#c8781a', '#ffd890', '#fffaf0'] : ['#5a3a10', '#a8782a', '#d8b060'], surface: 'glow' },
    halo: { ramp: ['#a8601a', '#ffc070', '#fff0c0'], surface: 'glow' },
  };
}

const s0 = 0.96;

/**
 * #42: dónde está la luz de la antena (en el marco del personaje, pixeles de la celda) para una pose, o null si no se
 * ve (sumergida del todo, o ya se escapó y se apagó). Misma cuenta que la escena.
 */
export function pezAntena(cell: number, pose: BossPose): V3 | null {
  const ex = pose.extra ?? {}, r = pose.root;
  const small = ex.small ?? 1, s = (cell / 128) * s0 * small, base = (cell / 128) * s0;
  const depth = ex.depth ?? -30, lure = ex.lure ?? 1, lureOff = ex.lureOff ?? 0, side = ex.side ?? 0;
  if (lure <= 0.02) return null;
  const body: M3 = mm(mm(rotY(r.yaw ?? 0), rotZ(-(r.lean ?? 0))), rotX((r.roll ?? 0) + side * 70));
  const P = (v: V3): V3 => add([(r.x ?? 0) * base, (depth + (r.y ?? 0) + (pose.air ?? 0)) * base, (r.z ?? 0) * base], mv(body, mul(v, s)));
  const lc = add(add(P([51, 34, 0]), mul([2, -2, 0], s)), [-lureOff * 34 * base, lureOff * 30 * base, -lureOff * 24 * base]);
  return lc[1] < 0 ? null : lc;
}

function pezScene(cell: number, pose: BossPose): BossScene {
  const ex = pose.extra ?? {}, r = pose.root;
  const small = ex.small ?? 1;
  const s = (cell / 128) * s0 * small;
  const S = (v: V3): V3 => mul(v, s);
  const B = new Body();
  const depth = ex.depth ?? -30, mouth = ex.mouth ?? 0.1, tail = ex.tail ?? 0, fin = ex.fin ?? 0, lure = ex.lure ?? 1, lureOff = ex.lureOff ?? 0, side = ex.side ?? 0;
  const body: M3 = mm(mm(rotY(r.yaw ?? 0), rotZ(-(r.lean ?? 0))), rotX((r.roll ?? 0) + side * 70));
  const base = (cell / 128) * s0;
  const P = (v: V3): V3 => add([(r.x ?? 0) * base, (depth + (r.y ?? 0) + (pose.air ?? 0)) * base, (r.z ?? 0) * base], mv(body, S(v)));
  // ---------- el cuerpo: barriga grande, cabeza enorme y la cola que se angosta ----------
  B.ell(P([0, 0, 0]), S([34, 22, 21]), 'body', 1, { rot: body, bump: 0.6 * s });
  B.ell(P([20, 2, 0]), S([20, 21, 20]), 'body', 1, { rot: body, bump: 0.5 * s });
  B.ell(P([2, -10, 0]), S([26, 12, 17]), 'belly', 1, { rot: body });
  B.ell(P([-30, 2, 0]), S([14, 11, 10]), 'body', 1, { rot: body });
  // manchas claras en el lomo (pecas de pez)
  for (let k = 0; k < 6; k++) B.ell(P([-14 + k * 7, 18 - Math.abs(k - 2.5) * 1.6, (k % 2 ? 1 : -1) * (6 + (k % 3) * 3)]), S([2.2, 1.2, 2.2]), 'spot', 2, { rot: body });
  // ---------- la boca: mandíbula de abajo que se abre, el adentro oscuro y los dientes redondos ----------
  const jaw = mm(body, rotZ(-mouth * 28));
  const J = (v: V3): V3 => add(P([18, -6, 0]), mv(jaw, S(v)));
  B.ell(P([32, -3, 0]), S([12, 3 + mouth * 9, 14]), 'mouthIn', 3, { rot: body });
  B.ell(J([16, -6, 0]), S([18, 6, 16]), 'body', 4, { rot: jaw });
  B.ell(J([12, -3, 0]), S([10, 3, 11]), 'tongue', 5, { rot: jaw });
  for (let k = 0; k < 5; k++) {
    for (const z of [-1, 1]) {
      // dientes de arriba (cuelgan) y de abajo (paran), redondeados
      B.ell(P([38 - k * 3.4, -3.6, z * (12.4 - k * 1.6)]), S([1.9, 2.6, 1.9]), 'tooth', 6, { rot: body });
      B.ell(J([28 - k * 3.4, -1 + 1.2, z * (12 - k * 1.6)]), S([1.7, 2.3, 1.7]), 'tooth', 7, { rot: jaw });
    }
  }
  // ---------- los ojos: redondos, con pupila y brillo (curiosos, no de terror) ----------
  const eyes = pose.face?.eyes ?? 'open';
  for (const z of [-1, 1]) {
    const c = P([30, 13, z * 13]);
    B.ell(c, S([4.6, eyes === 'closed' ? 1.2 : 4.6, 4]), 'eyeball', 8, { rot: body });
    if (eyes !== 'closed') B.ell(add(c, mv(body, S([2.6, eyes === 'dizzy' ? 1.4 : 0.4, z * 0.8]))), S([2.2, 2.4, 2.2]), 'pupil', 9, { rot: body });
  }
  // ---------- aletas: la de arriba con espinas blandas, las del pecho y la cola de dos lóbulos ----------
  for (let k = 0; k < 4; k++) B.cone(P([-8 + k * 7, 19, 0]), P([-11 + k * 7, 30 + Math.sin(k + fin * 3) * 2 - k, 0]), 2.2 * s, 0.6 * s, 'fin', 10 + k);
  for (const z of [-1, 1]) B.ell(P([4, -4, z * 21]), S([11, 1.6, 7]), 'fin', 15 + (z > 0 ? 1 : 0), { rot: mm(body, mm(rotY(z * (20 + fin * 25)), rotX(z * 25))) });
  const tb = mm(body, rotY(tail * 28));
  for (const yy of [-1, 1]) B.ell(add(P([-40, 0, 0]), mv(tb, S([-8, yy * 8, 0]))), S([10, 7, 1.8]), 'fin', 20 + (yy > 0 ? 1 : 0), { rot: mm(tb, rotZ(yy * 30)) });
  // ---------- la antena con la luz robada del faro ----------
  const stalk: V3[] = [P([24, 20, 0]), P([32, 31, 0]), P([43, 37, 0]), P([51, 34, 0])];
  B.chain(stalk, [2, 1.6, 1.2, 0.9].map((v) => v * s), 'stalk', 30);
  // la luz: en la punta, o escapándose (se va lejos y arriba, hacia el faro)
  const tip = stalk[3];
  const away: V3 = [-lureOff * 34 * base, lureOff * 30 * base, -lureOff * 24 * base];
  const lc = add(add(tip, S([2, -2, 0])), away);
  if (lure > 0.02) {
    const R = (5 + lure * 2) * (lureOff > 0 ? 1 - lureOff * 0.3 : 1) * (cell / 128) * s0;
    B.ell(lc, [R, R, R], 'lure', 31);
    // el halo de la luz: chispitas alrededor que giran
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + (ex.t ?? 0); B.ell(add(lc, [Math.cos(a) * R * 1.8, Math.sin(a) * R * 1.4, Math.sin(a) * R]), [R * 0.28, R * 0.28, R * 0.28], 'halo', 32 + k); }
  }
  return {
    pieces: B.pieces, materials: materials(pose.freed ?? 0, lure), smooth: { 1: 6 * s, 4: 2 * s },
    water: { level: 0, color: '#06141a', alpha: 150, line: '#6fb8a8', cut: 30 * (cell / 128) },
  };
}

// ---------------------------------------------------------------- animaciones

const P0 = (extra: Record<string, number>, more: Partial<BossPose> = {}): BossPose => ({
  root: {}, arms: { near: { pitch: 0, elbow: 0 }, far: { pitch: 0, elbow: 0 } }, legs: { near: { x: 0, y: 0 }, far: { x: 0, y: 0 } },
  extra: { depth: -30, mouth: 0.1, tail: 0, fin: 0, lure: 1, lureOff: 0, small: 1, side: 0, t: 0, ...extra }, ...more,
});
const k = (f: number, pose: BossPose, ease: BossKey['ease'] = 'linear'): BossKey => ({ f, pose, ease });
const cyc = (n: number, f: number, ph = 0) => Math.sin((f / n) * Math.PI * 2 + ph);

/** Profundidades: abajo (solo la luz afuera), medio (nadando) y afuera (la barriga toca la superficie) */
const DEEP = -32, SWIM = -16, OUT = 6;

function pezAnims(): BossAnimDef[] {
  const idle: BossAnimDef = { name: 'idle', fps: 6, loop: true, frames: 8, keys: Array.from({ length: 8 }, (_, f) => k(f, P0({ depth: DEEP + cyc(8, f) * 2, tail: cyc(8, f) * 0.6, fin: cyc(8, f, 1) * 0.5, t: f * 0.8, lure: 1 }, { root: { lean: -6 } }))) };
  const emerger: BossAnimDef = { name: 'emerger', fps: 10, loop: false, frames: 10, keys: [k(0, P0({ depth: DEEP })), k(5, P0({ depth: -10, tail: 0.6, mouth: 0.2 }, { root: { lean: -14 } }), 'out'), k(7, P0({ depth: 0, tail: -0.4, mouth: 0.3, t: 2 }, { root: { lean: -6 } })), k(9, P0({ depth: SWIM + 6, tail: 0.2, t: 3 }), 'ease')], events: [{ type: 'grito', frame: 6 }] };
  const hundirse: BossAnimDef = { name: 'hundirse', fps: 10, loop: false, frames: 8, keys: [k(0, P0({ depth: SWIM + 6 })), k(3, P0({ depth: -8, tail: 0.6, mouth: 0 }, { root: { lean: 14 } }), 'in'), k(7, P0({ depth: DEEP, tail: -0.3, t: 2 }, { root: { lean: 0 } }), 'out')] };
  const walk: BossAnimDef = { name: 'walk', fps: 10, loop: true, frames: 8, keys: Array.from({ length: 8 }, (_, f) => k(f, P0({ depth: SWIM + cyc(8, f) * 1.5, tail: cyc(8, f) * 1, fin: cyc(8, f, 1.4), mouth: 0.15, t: f * 0.8 }, { root: { lean: 4, roll: cyc(8, f) * 3 } }))), stride: 34 };
  // la mordida: sale despacio abriendo la boca (6 cuadros que tiemblan) y se tira para adelante
  const attack: BossAnimDef = {
    name: 'attack', fps: 12, loop: false, frames: 12, windup: [1, 6], shake: 1.2,
    keys: [
      k(0, P0({ depth: SWIM })),
      k(2, P0({ depth: -6, mouth: 0.5, tail: 0.5 }, { root: { lean: -12, x: -4 } }), 'out'),
      k(6, P0({ depth: -4, mouth: 1, tail: -0.5, t: 2 }, { root: { lean: -14, x: -6 } })),
      k(7, P0({ depth: 0, mouth: 1, tail: 0.8 }, { root: { lean: 8, x: 4 } }), 'in'),
      k(8, P0({ depth: -2, mouth: 0, tail: -0.6 }, { root: { lean: 10, x: 5 } }), 'in'),
      k(10, P0({ depth: -8, mouth: 0.1, tail: 0.3 }, { root: { lean: 4, x: 2 } }), 'out'),
      k(11, P0({ depth: SWIM }), 'ease'),
    ],
    events: [{ type: 'impacto', frame: 8 }],
  };
  // el salto con ola: se hunde y se enrosca (aviso de 6), salta afuera y cae de panza
  const heavy: BossAnimDef = {
    name: 'attack_heavy', fps: 12, loop: false, frames: 16, windup: [1, 6], shake: 1.5,
    keys: [
      k(0, P0({ depth: SWIM })),
      k(2, P0({ depth: -30, tail: 1, mouth: 0.3 }, { root: { lean: 18 } }), 'out'),
      k(6, P0({ depth: -34, tail: 1, mouth: 0.4, t: 3 }, { root: { lean: 24 } })),
      k(8, P0({ depth: 2, tail: -1, mouth: 0.8 }, { root: { lean: -24, x: 2 } }), 'out'),
      k(10, P0({ depth: 4, tail: 0.6, mouth: 0.6 }, { root: { lean: 0, x: 3 } })),
      k(12, P0({ depth: -2, tail: -0.8, mouth: 0.2 }, { root: { lean: 18, x: 4 } }), 'in'),
      k(13, P0({ depth: -6, tail: 0.4 }, { root: { lean: 8, x: 4 } })),
      k(15, P0({ depth: SWIM }, { root: { x: 2 } }), 'ease'),
    ],
    events: [{ type: 'despegue', frame: 8 }, { type: 'aterriza', frame: 12 }, { type: 'impacto', frame: 12 }],
    rise: [0, 0, 0, 0, 0, 0, 0, 14, 34, 42, 30, 10, 0, 0, 0, 0],
  };
  // el llamado: asoma, abre la boca y la luz late fuerte (llama cangrejos y medusas)
  const warcry: BossAnimDef = {
    name: 'warcry', fps: 10, loop: false, frames: 10, windup: [1, 4],
    keys: [
      k(0, P0({ depth: SWIM })),
      k(3, P0({ depth: -6, mouth: 0.9, lure: 1, tail: 0.5 }, { root: { lean: -14 } }), 'out'),
      ...[4, 5, 6, 7].map((f) => k(f, P0({ depth: -6, mouth: 0.9, lure: f % 2 ? 0.6 : 1, tail: f % 2 ? -0.5 : 0.5, t: f }, { root: { lean: -14 } }))),
      k(9, P0({ depth: SWIM }), 'ease'),
    ],
    events: [{ type: 'grito', frame: 4 }],
  };
  const hit: BossAnimDef = { name: 'hit', fps: 12, loop: false, frames: 5, keys: [k(0, P0({ depth: SWIM })), k(1, P0({ depth: SWIM + 4, mouth: 0.6, tail: 1 }, { root: { x: -8, lean: -18 }, face: { eyes: 'closed' } }), 'out'), k(3, P0({ depth: SWIM + 2, tail: -0.6 }, { root: { x: -4 } })), k(4, P0({ depth: SWIM }), 'ease')] };
  // aturdido: fuera del agua, de costado, boqueando y coleando
  const aturdido: BossAnimDef = { name: 'aturdido', fps: 6, loop: true, frames: 8, keys: Array.from({ length: 8 }, (_, f) => k(f, P0({ depth: OUT + 8, side: 1, mouth: 0.2 + Math.max(0, cyc(8, f)) * 0.7, tail: cyc(8, f, 0.5) * 0.9, fin: cyc(8, f), lure: 0.4, t: f }, { face: { eyes: 'dizzy' } }))) };
  // se libera: la luz robada se le escapa y vuela hacia el faro; el pez se achica, se pone azul y dorado y se va nadando
  const die: BossAnimDef = {
    name: 'die', fps: 8, loop: false, frames: 20,
    keys: [
      k(0, P0({ depth: SWIM })),
      k(2, P0({ depth: 0, mouth: 0.8, tail: 1 }, { root: { lean: -20 }, face: { eyes: 'closed' } }), 'out'),
      k(4, P0({ depth: 2, mouth: 0.6, tail: -1, lure: 1, lureOff: 0.1 }, { root: { lean: -10 }, face: { eyes: 'closed' } })),
      k(8, P0({ depth: 0, mouth: 0.2, tail: 0.4, lure: 1, lureOff: 1, freed: 0.4 } as Record<string, number>, { root: { lean: 0 }, freed: 0.4, face: { eyes: 'open' } }), 'ease'),
      k(9, P0({ depth: 0, mouth: 0.1, lure: 0, lureOff: 1, small: 0.8 }, { freed: 0.7 })),
      k(12, P0({ depth: 0, mouth: 0.3, lure: 0, small: 0.4, tail: 0.6, t: 2 }, { freed: 1, face: { eyes: 'happy' } }), 'ease'),
      k(14, P0({ depth: -2, mouth: 0.1, lure: 0, small: 0.36, tail: -0.8 }, { freed: 1, root: { x: -6, yaw: 160 }, face: { eyes: 'happy' } }), 'ease'),
      k(17, P0({ depth: -10, lure: 0, small: 0.35, tail: 0.8 }, { freed: 1, root: { x: -14, yaw: 180 }, face: { eyes: 'open' } })),
      k(19, P0({ depth: -22, lure: 0, small: 0.35, tail: -0.8 }, { freed: 1, root: { x: -20, yaw: 180 } })),
    ],
    events: [{ type: 'suelta', frame: 6 }],
  };
  return [idle, emerger, walk, attack, heavy, warcry, hit, hundirse, die, aturdido];
}

const dims = (cell: number): BossDims => bipedDims(cell, { hipH: 30, hipW: 8, legU: 14, legL: 14, foot: 6, spine: 20, shW: 14, armU: 12, armL: 12, hand: 5, neck: 4, head: 8 });

export const PEZ_FAROL_SPEC: BossSpec = {
  id: 'pez_farol', cell: 128, dims, elev: 26, anims: pezAnims(),
  scene: (cell: number, pose: BossPose) => pezScene(cell, pose),
  // el punto que muerde: la boca, adelante
  strikePoint: () => [40 * s0, 0, 0],
};

// ---------------------------------------------------------------- los avisos del Pez Farol

function put(r: Raster, x: number, y: number, c: string, a = 255) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= r.w || y >= r.h) return;
  const k2 = (y * r.w + x) * 4;
  const v = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  if (a >= 255 || !r.data[k2 + 3]) { r.data[k2] = v[0]; r.data[k2 + 1] = v[1]; r.data[k2 + 2] = v[2]; r.data[k2 + 3] = Math.max(a, r.data[k2 + 3]); return; }
  const t = a / 255;
  for (let i = 0; i < 3; i++) r.data[k2 + i] = Math.round(r.data[k2 + i] * (1 - t) + v[i] * t);
  r.data[k2 + 3] = Math.max(r.data[k2 + 3], a);
}

/**
 * `aviso_mordida` (128 x 64, 8 cuadros, capa suelo): dónde va a morder. La silueta de una boca abierta (dos arcos con
 * dientes redondos) que se dibuja de a poco en el piso y se llena de luz ámbar, con onditas del agua que se agitan.
 */
export function biteWarning(): Raster[] {
  const out: Raster[] = [];
  for (let f = 0; f < 8; f++) {
    const r = createRaster(128, 64), t = (f + 1) / 8;
    const cx = 64, cy = 32;
    for (let y = 0; y < 64; y++) for (let x = 0; x < 128; x++) {
      const dx = (x - cx) / 58, dy = (y - cy) / 26, d = Math.hypot(dx, dy);
      if (d > 1) continue;
      // el borde: el contorno de la boca (arriba y abajo), que se completa de izquierda a derecha
      const ang = (Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2);
      if (d > 0.9 && ang < t) put(r, x, y, f % 2 ? '#ffd890' : '#ffc070', 230);
      // el adentro: se llena de luz ámbar tenue
      else if (d < 0.9 * t && ((x + y + f) % 3 === 0)) put(r, x, y, '#c8701a', Math.round(60 + t * 80));
    }
    // dientes redondos en el borde, de arriba y de abajo
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (0.15 + i * 0.1), b = Math.PI * (1.15 + i * 0.1);
      for (const ang of [a, b]) {
        if ((ang / (Math.PI * 2) + 0.5) % 1 > t + 0.1) continue;
        const tx = cx + Math.cos(ang) * 50, ty = cy + Math.sin(ang) * 21;
        for (let yy = -2; yy <= 2; yy++) for (let xx = -2; xx <= 2; xx++) if (xx * xx + yy * yy <= 4) put(r, tx + xx, ty + yy, '#fff0c0', 210);
      }
    }
    out.push(r);
  }
  return out;
}

/**
 * `aviso_ola` (32 x 32, 6 cuadros, se repite en línea): por dónde va a pasar la ola. Rayas de espuma que se mueven
 * hacia adelante (a la derecha del cuadro: el juego lo gira hacia donde va la ola) y pegan con el cuadro de al lado.
 */
export function waveWarning(): Raster[] {
  const out: Raster[] = [];
  for (let f = 0; f < 6; f++) {
    const r = createRaster(32, 32);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const band = Math.sin(((x - f * 32 / 6) / 32) * Math.PI * 4 + Math.sin((y / 32) * Math.PI * 2) * 0.8);
      if (y < 4 || y > 27) continue;
      if (band > 0.82) put(r, x, y, '#a8f0e0', 220);
      else if (band > 0.55) put(r, x, y, '#6fb8a8', 130);
    }
    // el borde del carril: dos líneas punteadas
    for (let x = 0; x < 32; x++) if ((x + f * 2) % 6 < 3) { put(r, x, 4, '#6fb8a8', 200); put(r, x, 27, '#6fb8a8', 200); }
    out.push(r);
  }
  return out;
}

/**
 * `ola` (128 x 64, 8 cuadros a 12 fps): la ola del salto del Pez Farol. Se levanta, rompe con espuma y se desarma.
 * Agua negra verdosa con la cresta clara.
 */
export function wave(): Raster[] {
  const out: Raster[] = [];
  for (let f = 0; f < 8; f++) {
    const r = createRaster(128, 64), t = f / 7;
    const h = Math.sin(Math.min(1, t * 1.6) * Math.PI) * 40 + 6 * (1 - t);
    for (let x = 0; x < 128; x++) {
      const prof = Math.sin((x / 128) * Math.PI);
      const top = 60 - h * prof - Math.sin(x * 0.2 + f) * 2;
      for (let y = Math.max(0, Math.floor(top)); y < 62; y++) {
        const dd = y - top;
        let c = dd < 2 ? '#e0fff4' : dd < 5 ? '#a8f0e0' : dd < 10 ? '#3a7a70' : dd < 18 ? '#1c3a3a' : '#0c1c1e';
        if (t > 0.55 && dd < 6 && ((x * 7 + y * 3 + f) % 4) === 0) c = '#ffffff';
        put(r, x, y, c, t > 0.7 ? Math.round(255 * (1 - (t - 0.7) / 0.35)) : 235);
      }
    }
    // las gotas de la espuma que salen volando al romper
    if (t > 0.3) for (let i = 0; i < 16; i++) { const x = 8 + ((i * 37) % 112), y = 60 - h * 0.9 - ((i * 13 + f * 7) % 24); put(r, x, y, '#e0fff4', Math.round(220 * (1 - t * 0.6))); }
    out.push(r);
  }
  return out;
}
