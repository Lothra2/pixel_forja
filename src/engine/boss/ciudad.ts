import { type V3, type M3, add, mul, mv, mm, rotX, rotY, rotZ } from './sdf';
import { Body } from './build';
import { type BossPose } from './rig';
import { makeBossRamp, type BossScene, type BossMaterial } from './render';
import { weaponHead, type BossSpec } from './sheet';
import { type BossAnimDef, type BossKey, over } from './anim';
import { citizenScene, citizenDims, MUSGO, OJO_SONAMBULO, type CitizenLook } from './ciudadano';
import { createRaster, type Raster } from '../core/raster';

/**
 * Los enemigos del Mundo 5 (La Ciudad Dormida), con el motor de volúmenes de los jefes (8 direcciones, pivote
 * medido). Terror de cuento: dan tensión y no miedo. Lo que ataca siempre se ve antes de pegar.
 *
 * - `sonambulo_piedra` (48): un ciudadano de piedra en camisón que camina dormido con los brazos adelante. En la luz
 *   el juego lo deja en `quieto`. Antes de empujar, cuatro cuadros en los que le brillan los ojos celeste.
 * - `gargola_dormida` (48, vuela): gárgola chica y simpática; posada parece una estatua más. Despierta, vuela y se
 *   tira en picada (seis cuadros de aviso arriba, y la `sombra_picada` en el piso).
 * - `duende_sueno` (48): chiquito y dormilón, con gorro de dormir largo y su bolsa: tira arena de sueño.
 * - `relojero` (64, minijefe): relojero de piedra con una llave de dar cuerda gigante. Al morir se libera: queda un
 *   relojero viejo de verdad que se arregla los anteojos y saluda.
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
/** Paso: el pie apoyado va de +S a -S mientras el otro pasa (como el minotauro). */
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

/** Se desmorona: la piedra se va de arriba para abajo en granitos que caen. k de 0 a 1. */
function crumble(r: Raster, k: number, f: number, seed: number) {
  if (k <= 0) return;
  const W = r.w, H = r.h, keep = new Uint8Array(r.data);
  const ground = lowest(r);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (!keep[i + 3]) continue;
    if (hash(x, y, seed) < k * 1.5 - (y / H) * 0.55) {
      r.data[i + 3] = 0;
      // un granito cae desde ahí
      if (hash(x, y, seed + 1) > 0.88) { const fy = Math.min(ground, y + (hash(x, y, seed + 2) * 0.6 + 0.4) * k * 30 + f); const j = (Math.round(fy) * W + x) * 4; if (!r.data[j + 3]) { r.data[j] = keep[i]; r.data[j + 1] = keep[i + 1]; r.data[j + 2] = keep[i + 2]; r.data[j + 3] = 230; } }
    }
  }
  // el montoncito de polvo
  const cx = W / 2;
  for (let x = Math.floor(cx - 9); x <= cx + 9; x++) { const h = Math.sin(((x - cx + 9) / 18) * Math.PI) * 2.6 * Math.min(1, k * 1.3); for (let y = 0; y < h; y++) put(r, x, ground - y, y > h - 1.2 ? '#a8aebb' : '#6c7484', 230); }
}

// ---------------------------------------------------------------- el sonámbulo de piedra

const SONAMBULO_LOOK: CitizenLook = { skin: '#e0c8b0', hair: '#3a2a20', top: '#c8c0b0', bottom: '#8a8478', shoe: '#4a4038', hairStyle: 'rizos', accent: '#6a6458' };
const SK = 1.1;
/** dormido de pie, los brazos adelante como quien camina en sueños, la cabeza caída */
const SLEEP: BossPose = {
  root: { y: -1, lean: 3 }, spine: { bend: 4 }, head: { pitch: 14, roll: 6 },
  arms: { near: { pitch: 78, spread: 12, elbow: 8, open: 1 }, far: { pitch: 72, spread: 12, elbow: 12, open: 1 } },
  legs: { near: { x: 2, y: 0, z: 1 }, far: { x: -2, y: 0, z: 1 } },
  face: { eyes: 'closed' }, freed: 0, extra: { glow: 0 },
};

function sonambuloAnims(): BossAnimDef[] {
  const quieto: BossAnimDef = { name: 'quieto', fps: 1, loop: true, frames: 1, keys: [kk(0, over(SLEEP, { arms: { near: { pitch: 70 }, far: { pitch: 64 } } }))] };
  const idle: BossAnimDef = { name: 'idle', fps: 5, loop: true, frames: 6, keys: Array.from({ length: 6 }, (_, f) => kk(f, over(SLEEP, { root: { roll: cyc(6, f) * 3, y: -1 + cyc(6, f, 1) * 0.4 }, head: { roll: 6 + cyc(6, f) * 4 }, arms: { near: { pitch: 78 + cyc(6, f) * 4 }, far: { pitch: 72 - cyc(6, f) * 4 } } }))) };
  // camina arrastrando los pies: pasos cortitos y bajos, despacio
  const n = 8, S = 4, near = gait(S, 1.6, 0.6, n);
  const walk: BossAnimDef = {
    name: 'walk', fps: 6, loop: true, frames: n, stride: (2 * S) / 0.6,
    keys: Array.from({ length: n }, (_, f) => kk(f, over(SLEEP, { root: { roll: cyc(n, f) * 4, y: -1.4 - Math.abs(cyc(n, f)) * 0.6, lean: 6 }, legs: { near: near[f], far: near[(f + n / 2) % n] }, arms: { near: { pitch: 80 + cyc(n, f) * 3 }, far: { pitch: 74 - cyc(n, f) * 3 } } }))),
    events: [{ type: 'paso', frame: 0, foot: 'near' }, { type: 'paso', frame: 4, foot: 'far' }],
  };
  // el empujón: retira las manos al pecho mientras se le prenden los ojos (4 cuadros), y empuja con las dos
  const PULL = over(SLEEP, { root: { lean: -6, x: -2 }, head: { pitch: 0, roll: 0 }, arms: { near: { pitch: 34, elbow: 84, spread: 30 }, far: { pitch: 32, elbow: 86, spread: 30 } }, legs: { near: { x: 5 }, far: { x: -5 } } });
  const PUSH = over(SLEEP, { root: { lean: 16, x: 5, y: -2 }, head: { pitch: -2, roll: 0 }, arms: { near: { pitch: 88, elbow: 0, spread: 10 }, far: { pitch: 86, elbow: 2, spread: 10 } }, legs: { near: { x: 9 }, far: { x: -6 } } });
  const attack: BossAnimDef = {
    name: 'attack', fps: 9, loop: false, frames: 10, windup: [1, 4], shake: 0.6,
    keys: [kk(0, SLEEP), kk(1, over(PULL, { extra: { glow: 0.35 } }), 'out'), kk(4, over(PULL, { root: { lean: -8 }, extra: { glow: 1 } })), kk(5, over(PUSH, { extra: { glow: 1 } }), 'in'), kk(6, over(PUSH, { extra: { glow: 0.7 } })), kk(9, over(SLEEP, { extra: { glow: 0 } }), 'ease')],
    events: [{ type: 'impacto', frame: 5 }],
  };
  const hit: BossAnimDef = { name: 'hit', fps: 10, loop: false, frames: 4, keys: [kk(0, SLEEP), kk(1, over(SLEEP, { root: { lean: -12, x: -4 }, head: { pitch: -10 }, arms: { near: { pitch: 50 }, far: { pitch: 46 } } }), 'out'), kk(3, SLEEP, 'ease')] };
  const die: BossAnimDef = {
    name: 'die', fps: 9, loop: false, frames: 12,
    keys: [kk(0, SLEEP), kk(2, over(SLEEP, { root: { lean: -10, y: -3 }, head: { pitch: -16 }, arms: { near: { pitch: 30 }, far: { pitch: 26 } } }), 'out'), kk(5, over(SLEEP, { root: { y: -9, lean: 10 }, spine: { bend: 14 }, head: { pitch: 26 }, arms: { near: { pitch: 10, elbow: 30 }, far: { pitch: 8, elbow: 30 } }, legs: { near: { x: 4 }, far: { x: -3 } } }), 'ease'), kk(11, over(SLEEP, { root: { y: -12, lean: 14 }, spine: { bend: 18 }, head: { pitch: 30 }, arms: { near: { pitch: 4, elbow: 30 }, far: { pitch: 4, elbow: 30 } } }))],
  };
  return [quieto, idle, walk, attack, hit, die];
}

/** Los ojos celestes se ven de lejos: un halo de un pixel alrededor de lo que brilla celeste. */
function eyeHalo(r: Raster) {
  const W = r.w, H = r.h, hot: number[] = [];
  for (let i = 0; i < W * H; i++) { const R = r.data[i * 4], G = r.data[i * 4 + 1], Bc = r.data[i * 4 + 2]; if (r.data[i * 4 + 3] && Bc > 220 && G > 170 && R < 190) hot.push(i); }
  for (const i of hot) {
    const x = i % W, y = Math.floor(i / W);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, -1], [0, 1], [2, 0], [-2, 0]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const j = Y * W + X; if (hot.includes(j)) continue; put(r, X, Y, Math.abs(dx) === 2 ? '#3a8ac8' : OJO_SONAMBULO, Math.abs(dx) === 2 ? 150 : 235); }
  }
}

/** Al morir se desmorona en polvo y queda una florcita de piedra en el piso. */
function sonambuloPost(r: Raster, anim: string, f: number, n: number) {
  eyeHalo(r);
  if (anim !== 'die') return;
  const k = Math.max(0, (f - 3) / (n - 5));
  if (k <= 0) return;
  const g = lowest(r);
  crumble(r, k, f, 41);
  if (k >= 0.75) {
    // la florcita de piedra
    const cx = Math.round(r.w / 2), cy = Math.min(r.h - 4, g - 3), a = Math.min(1, (k - 0.75) * 5);
    for (let y = 0; y < 3; y++) put(r, cx, cy + y + 1, '#6c7484', Math.round(255 * a));
    for (const [dx, dy, c] of [[0, -1, '#c8ccd8'], [-1, 0, '#a8aebb'], [1, 0, '#a8aebb'], [0, 1, '#8a91a0'], [-1, -1, '#8a91a0'], [1, -1, '#8a91a0']] as [number, number, string][]) put(r, cx + dx, cy - 1 + dy, c, Math.round(255 * a));
    put(r, cx, cy - 1, '#525a6a', Math.round(255 * a));
    put(r, cx + 1, cy + 2, '#9aa8b8', Math.round(220 * a));
  }
}

export const SONAMBULO_SPEC: BossSpec = {
  id: 'sonambulo_piedra', cell: 48, dims: citizenDims(SONAMBULO_LOOK, SK), elev: 26, anims: sonambuloAnims(), post: sonambuloPost,
  scene: (cell, pose, sec) => citizenScene(SONAMBULO_LOOK, cell, pose, sec, SK),
  strikePoint: (j) => mul(add(j.hands.near, j.hands.far), 0.5),
};

// ---------------------------------------------------------------- la gárgola dormida

/**
 * La gárgola: cuerpo de perrito agachado, cabeza grande redonda con cuernitos y orejas, ojos grandes (cerrados
 * posada, celestes despierta), alas de murciélago de piedra y la colita con punta. `extra`: `hover` (altura del cuerpo
 * sobre el piso), `wing` (0 plegadas a 1 abiertas), `flap` (-1 abajo a 1 arriba), `eyes` (0 a 1), `dive` (cabeza
 * abajo en la picada), `tuck` (patas recogidas al volar) y `broken` (al morir, se separan los pedazos).
 */
function gargolaScene(cell: number, pose: BossPose): BossScene {
  const s = (cell / 128) * 0.86;
  const S = (v: V3): V3 => mul(v, s);
  const B = new Body();
  const ex = pose.extra ?? {}, r = pose.root;
  const hover = ex.hover ?? 0, wing = ex.wing ?? 0, flap = ex.flap ?? 0, eyes = ex.eyes ?? 0, dive = ex.dive ?? 0, tuck = ex.tuck ?? 0, broken = ex.broken ?? 0;
  const body: M3 = mm(mm(rotY(r.yaw ?? 0), rotZ(-(r.lean ?? 0) - dive * 40)), rotX(r.roll ?? 0));
  const base: V3 = [(r.x ?? 0) * s, (hover + (r.y ?? 0)) * s, (r.z ?? 0) * s];
  const P = (v: V3, sp: V3 = [0, 0, 0]): V3 => add(add(base, mv(body, S(v))), S(mul(sp, broken)));
  // el cuerpo agachado y la pancita
  B.ell(P([-2, 30, 0]), S([24, 19, 18]), 'stone', 1, { rot: body, bump: 0.8 * s });
  B.ell(P([6, 24, 0], [6, -4, 0]), S([14, 12, 13]), 'belly', 1, { rot: body });
  // la cabeza: grande y redonda, el hocico corto, los cuernitos y las orejas puntudas
  const hb: V3 = [22, 50, 0];
  B.ell(P(hb, [10, 6, 0]), S([15, 14, 14]), 'stone', 2, { rot: body, bump: 0.6 * s });
  B.ell(P([34, 45, 0], [12, 6, 0]), S([7, 6, 8.4]), 'stone', 2, { rot: body });
  B.ell(P([40.2, 46.6, 0], [12, 6, 0]), S([1.8, 1.6, 2.2]), 'dark', 3, { rot: body });
  for (const z of [-1, 1]) {
    B.cone(P([18, 61, z * 7], [10, 8, z * 4]), P([12, 72, z * 10], [10, 8, z * 4]), 3.4 * s, 0.8 * s, 'horn', 4);
    B.cone(P([16, 56, z * 12], [10, 6, z * 6]), P([10, 62, z * 20], [10, 6, z * 6]), 3 * s, 0.6 * s, 'stone', 5);
    // los ojos grandes: cerrados (una rayita) o abiertos, celestes y redondos
    const e = P([33, 54, z * 6.4], [12, 6, 0]);
    if (eyes > 0.4) { B.ell(e, S([2.4, 4.2 * eyes, 3.6]), 'eye', 6, { rot: body }); B.ell(add(e, mv(body, S([1.6, 0.6, 0]))), S([1.2, 1.4, 1.4]), 'glint', 7, { rot: body }); }
    else B.ell(e, S([1.6, 0.8, 3.6]), 'dark', 6, { rot: body });
  }
  // la sonrisita
  B.ell(P([37, 41, 0], [12, 6, 0]), S([1.4, 0.7, 4]), 'dark', 8, { rot: body });
  // las patas: de adelante paradas (posada) o recogidas (volando), de atrás agachadas
  for (const z of [-1, 1]) {
    const fy = tuck * 14, fx = tuck * -4;
    B.cone(P([14, 26, z * 10], [4, -4, z * 8]), P([18 + fx, 4 + fy, z * 11], [4, -4, z * 8]), 4.6 * s, 3.6 * s, 'stone', 10 + (z > 0 ? 1 : 0));
    B.ell(P([21 + fx, 2 + fy, z * 11], [4, -4, z * 8]), S([5, 2.6, 4]), 'stone', 10 + (z > 0 ? 1 : 0), { rot: body });
    B.ell(P([-14, 20 - tuck * 2, z * 14], [-6, -6, z * 8]), S([12, 10, 7]), 'stone', 12 + (z > 0 ? 1 : 0), { rot: body });
    B.ell(P([-6 + fx, 2 + fy, z * 13], [-6, -6, z * 8]), S([6, 2.6, 4]), 'stone', 12 + (z > 0 ? 1 : 0), { rot: body });
  }
  // la colita enroscada con la punta de flecha
  const tail: V3[] = [P([-22, 26, 0], [-10, -2, 0]), P([-34, 22, 4], [-10, -2, 0]), P([-40, 32, 6], [-10, -2, 0]), P([-36, 40, 4], [-10, -2, 0])];
  B.chain(tail, [4, 3, 2.2, 1.4].map((v) => v * s), 'stone', 14);
  B.ell(tail[3], S([3.6, 2.4, 1.4]), 'horn', 15, { rot: body });
  // las alas: hueso del ala y la membrana (dos gajos) que se abren y aletean
  for (const z of [-1, 1]) {
    const shoulder = P([2, 44, z * 13], [0, 4, z * 14]);
    const open = wing, up = flap * 26 * wing;
    const a = (z > 0 ? 1 : -1);
    const tipL: V3 = [-18 + open * 6, 44 + open * (14 + up * 0.32) - (1 - open) * 18, z * (16 + open * 30)];
    const midL: V3 = [-6 + open * 4, 54 + open * (8 + up * 0.2) - (1 - open) * 4, z * (14 + open * 17)];
    const tip = P(tipL, [0, 6, z * 18]), mid = P(midL, [0, 6, z * 18]);
    B.chain([shoulder, mid, tip], [2.6, 2, 1.2].map((v) => v * s), 'horn', 20 + (z > 0 ? 1 : 0));
    // la membrana: dos gajos entre el hueso y el cuerpo
    const m1 = P([(midL[0] - 8) * 0.9, midL[1] - 12 - (1 - open) * 2, midL[2] * 0.9], [0, 6, z * 18]);
    const m2 = P([(tipL[0] - 10) * 0.9, tipL[1] - 14 - (1 - open) * 4, tipL[2] * 0.92], [0, 6, z * 18]);
    B.ell(m1, S([10 + open * 6, 12, 2 + open * 10]), 'wing', 22 + (z > 0 ? 1 : 0), { rot: mm(body, rotX(a * (open * 20 + up * 0.3))) });
    B.ell(m2, S([9 + open * 6, 11, 2 + open * 12]), 'wing', 22 + (z > 0 ? 1 : 0), { rot: mm(body, rotX(a * (open * 30 + up * 0.5))) });
  }
  const st = makeBossRamp('#8a91a0', 6, { spread: 1.2, hue: 8 });
  const mats: Record<string, BossMaterial> = {
    stone: { ramp: st, surface: 'stone', tex: 0.45, scale: 2.6, patch: { mat: 'moss', amount: 0.12, scale: 3 } },
    belly: { ramp: makeBossRamp('#a8aebb', 6, { spread: 1.1, hue: 8 }), surface: 'stone', tex: 0.35, scale: 2.6 },
    horn: { ramp: makeBossRamp('#6c7484', 5, { hue: 8 }), surface: 'stone', tex: 0.3 },
    wing: { ramp: makeBossRamp('#5a6274', 5, { spread: 1.1, hue: 8 }), surface: 'stone', tex: 0.3, scale: 2 },
    dark: { ramp: ['#1a1e28', '#2a303e'], surface: 'skin', tex: 0.1 },
    eye: { ramp: ['#2a6a9a', OJO_SONAMBULO, '#d8f4ff'], surface: 'glow' },
    glint: { ramp: ['#e8f8ff', '#ffffff'], surface: 'glow' },
    moss: { ramp: makeBossRamp(MUSGO, 5, { spread: 0.8 }), surface: 'fur', tex: 0.6, scale: 1.4 },
  };
  return { pieces: B.pieces, materials: mats, smooth: { 1: 4 * s, 2: 2 * s } };
}

const G0 = (extra: Record<string, number>, root: BossPose['root'] = {}): BossPose => ({ root, arms: { near: { pitch: 0, elbow: 0 }, far: { pitch: 0, elbow: 0 } }, legs: { near: { x: 0, y: 0 }, far: { x: 0, y: 0 } }, extra: { hover: 0, wing: 0, flap: 0, eyes: 0, dive: 0, tuck: 0, broken: 0, ...extra } });
const FLY = 20, HIGH = 26;

function gargolaAnims(): BossAnimDef[] {
  const posada: BossAnimDef = { name: 'posada', fps: 1, loop: true, frames: 1, keys: [kk(0, G0({}))] };
  const despertar: BossAnimDef = {
    name: 'despertar', fps: 10, loop: false, frames: 9,
    keys: [kk(0, G0({})), kk(2, G0({ eyes: 1 }, { lean: -6 }), 'out'), kk(4, G0({ eyes: 1, wing: 0.8, flap: 0.6 }, { lean: -10 }), 'ease'), kk(6, G0({ eyes: 1, wing: 1, flap: -0.6, hover: 14, tuck: 0.6 }), 'out'), kk(8, G0({ eyes: 1, wing: 1, flap: 0.5, hover: FLY, tuck: 1 }), 'ease')],
  };
  const walk: BossAnimDef = { name: 'walk', fps: 10, loop: true, frames: 6, stride: 18, keys: Array.from({ length: 6 }, (_, f) => kk(f, G0({ eyes: 1, wing: 1, flap: cyc(6, f), hover: FLY + cyc(6, f, -1.2) * 2.4, tuck: 1 }, { lean: 8 }))) };
  // la picada: sube alto con las alas arriba y tiembla (6 cuadros de aviso), y se tira de cabeza al piso
  const attack: BossAnimDef = {
    name: 'attack', fps: 12, loop: false, frames: 15, windup: [1, 6], shake: 1,
    keys: [
      kk(0, G0({ eyes: 1, wing: 1, flap: 0, hover: FLY, tuck: 1 })),
      kk(2, G0({ eyes: 1, wing: 1, flap: 1, hover: HIGH, tuck: 1 }, { lean: -14 }), 'out'),
      ...[3, 4, 5, 6].map((f) => kk(f, G0({ eyes: 1, wing: 1, flap: f % 2 ? 0.8 : 1, hover: HIGH + (f % 2), tuck: 1 }, { lean: -16 }))),
      kk(8, G0({ eyes: 1, wing: 0.4, flap: 1, hover: 4, dive: 1, tuck: 1 }, { x: 4 }), 'in'),
      kk(9, G0({ eyes: 1, wing: 0.6, flap: 0.6, hover: 2, dive: 0.6, tuck: 1 }, { x: 5 })),
      kk(12, G0({ eyes: 1, wing: 1, flap: -0.8, hover: 14, tuck: 1 }, { x: 3 }), 'out'),
      kk(14, G0({ eyes: 1, wing: 1, flap: 0.4, hover: FLY, tuck: 1 }), 'ease'),
    ],
    events: [{ type: 'impacto', frame: 8 }],
  };
  const hit: BossAnimDef = { name: 'hit', fps: 12, loop: false, frames: 4, keys: [kk(0, G0({ eyes: 1, wing: 1, hover: FLY, tuck: 1 })), kk(1, G0({ eyes: 0.5, wing: 0.7, flap: -1, hover: FLY - 4, tuck: 1 }, { lean: -20, x: -6 }), 'out'), kk(3, G0({ eyes: 1, wing: 1, hover: FLY, tuck: 1 }), 'ease')] };
  // se cae y se vuelve piedra rota
  const die: BossAnimDef = {
    name: 'die', fps: 10, loop: false, frames: 12,
    keys: [kk(0, G0({ eyes: 1, wing: 1, hover: FLY, tuck: 1 })), kk(2, G0({ eyes: 0, wing: 0.6, flap: -1, hover: FLY - 2, tuck: 0.6 }, { roll: 30 }), 'out'), kk(5, G0({ eyes: 0, wing: 0.3, hover: 0, tuck: 0 }, { roll: 50, y: -2 }), 'in'), kk(7, G0({ eyes: 0, wing: 0.2, hover: 0, broken: 0.4 }, { roll: 55, y: -4 })), kk(11, G0({ eyes: 0, wing: 0.1, hover: 0, broken: 1 }, { roll: 60, y: -6 }), 'out')],
    events: [{ type: 'aterriza', frame: 5 }],
  };
  return [posada, despertar, walk, attack, hit, die];
}

export const GARGOLA_SPEC: BossSpec = {
  id: 'gargola_dormida', cell: 48, dims: (cell) => citizenDims(SONAMBULO_LOOK)(cell), elev: 26, anims: gargolaAnims(),
  scene: (cell, pose) => gargolaScene(cell, pose),
  strikePoint: () => [8, 0, 0],
};

/** `sombra_picada` (48 x 24, 6 cuadros, capa suelo): donde va a caer la gárgola. Una sombra que crece con un anillo celeste. */
export function diveShadow(): Raster[] {
  return Array.from({ length: 6 }, (_, f) => {
    const r = createRaster(48, 24), t = (f + 1) / 6, rx = 8 + t * 14, ry = 4 + t * 6;
    for (let y = 0; y < 24; y++) for (let x = 0; x < 48; x++) {
      const d = Math.hypot((x + 0.5 - 24) / rx, (y + 0.5 - 12) / ry);
      if (d < 1) put(r, x, y, '#0a0c14', Math.round((60 + t * 100) * (d < 0.6 ? 1 : 0.7)));
      if (d > 0.86 && d < 1.06) put(r, x, y, OJO_SONAMBULO, Math.round(120 + t * 110));
    }
    return r;
  });
}

// ---------------------------------------------------------------- el duende del sueño

const DUENDE_LOOK: CitizenLook = { skin: '#f0c8b0', hair: '#e8e0d8', top: '#3a4a8a', bottom: '#2a3468', shoe: '#5a3a2a', hairStyle: 'corto', hat: 'gorro_dormir', hatHex: '#8a6ac8', accent: '#f4ecd8', beard: '#f4f0e8', prop: 'bolsa', child: true, belly: 0.8 };
const DK = 1.3;
const NAP: BossPose = {
  root: { y: -1, lean: 2 }, spine: { bend: 4 }, head: { pitch: 6 },
  arms: { near: { pitch: 16, spread: 16, elbow: 30 }, far: { pitch: 12, spread: 18, elbow: 40 } },
  legs: { near: { x: 2, y: 0, z: 1 }, far: { x: -2, y: 0, z: 1 } },
  face: { eyes: 'closed' }, freed: 1, extra: { yawn: 0, sand: 0, cap: 0 },
};

function duendeAnims(): BossAnimDef[] {
  const idle: BossAnimDef = { name: 'idle', fps: 6, loop: true, frames: 6, keys: Array.from({ length: 6 }, (_, f) => kk(f, over(NAP, { root: { y: -1 + cyc(6, f) * 0.6, roll: cyc(6, f, 1) * 2 }, head: { pitch: 6 - (f === 3 || f === 4 ? 16 : 0) }, extra: { yawn: f === 3 || f === 4 ? 1 : 0, cap: cyc(6, f) } }))) };
  const n = 8, S = 5, near = gait(S, 3, 0.5, n);
  const walk: BossAnimDef = {
    name: 'walk', fps: 10, loop: true, frames: n, stride: (2 * S) / 0.5,
    keys: Array.from({ length: n }, (_, f) => kk(f, over(NAP, { root: { roll: cyc(n, f) * 7, y: -1 - Math.abs(cyc(n, f)) * 1.2, lean: 6 }, legs: { near: near[f], far: near[(f + n / 2) % n] }, arms: { near: { pitch: 16 + cyc(n, f) * 20 }, far: { pitch: 12 - cyc(n, f) * 20 } }, extra: { cap: -cyc(n, f) } }))),
    events: [{ type: 'paso', frame: 0, foot: 'near' }, { type: 'paso', frame: 4, foot: 'far' }],
  };
  // tira arena: mete la mano en la bolsa (3 cuadros de aviso), saca un puñado que brilla y lo tira para adelante
  const REACH = over(NAP, { root: { lean: -4 }, spine: { twist: 30 }, arms: { near: { pitch: -30, spread: 30, elbow: 60 } }, extra: { sand: 0.6 } });
  const THROW = over(NAP, { root: { lean: 12, x: 3 }, spine: { twist: -24 }, arms: { near: { pitch: 104, spread: 10, elbow: 6, open: 1 } }, legs: { near: { x: 6 }, far: { x: -5 } }, extra: { sand: 0 } });
  const attack: BossAnimDef = {
    name: 'attack', fps: 12, loop: false, frames: 9, windup: [1, 4],
    keys: [kk(0, NAP), kk(1, REACH, 'out'), kk(3, over(REACH, { extra: { sand: 1 } })), kk(4, over(REACH, { spine: { twist: 34 }, extra: { sand: 1 } })), kk(5, THROW, 'in'), kk(6, THROW), kk(8, NAP, 'ease')],
    events: [{ type: 'impacto', frame: 5 }],
  };
  const hit: BossAnimDef = { name: 'hit', fps: 12, loop: false, frames: 4, keys: [kk(0, NAP), kk(1, over(NAP, { root: { lean: -14, x: -3 }, head: { pitch: -14 }, face: { eyes: 'open' }, extra: { cap: 1 } }), 'out'), kk(3, NAP, 'ease')] };
  // se queda dormido: bosteza, se acurruca en el piso y se va en polvo lila
  const die: BossAnimDef = {
    name: 'die', fps: 8, loop: false, frames: 12,
    keys: [kk(0, NAP), kk(2, over(NAP, { head: { pitch: -16 }, extra: { yawn: 1 } }), 'ease'), kk(5, over(NAP, { root: { y: -10, lean: 20 }, spine: { bend: 16 }, head: { pitch: 26 }, legs: { near: { x: 6, y: 0 }, far: { x: -2, y: 0 } } }), 'ease'), kk(11, over(NAP, { root: { y: -12, lean: 24 }, spine: { bend: 20 }, head: { pitch: 30 }, legs: { near: { x: 6, y: 0 }, far: { x: -2, y: 0 } } }))],
  };
  return [idle, walk, attack, hit, die];
}

/** Al quedarse dormido se va en polvo lila (motitas que suben), con tres zetas de dormir que se escapan. */
function duendePost(r: Raster, anim: string, f: number, n: number) {
  if (anim !== 'die') return;
  const k = Math.max(0, (f - 5) / (n - 6));
  if (f >= 4 && f < n - 1) for (let z = 0; z < 2; z++) { const zx = r.w / 2 + 8 + z * 4, zy = 12 - z * 5 - (f % 3); for (const [dx, dy] of [[0, 0], [1, 0], [2, 0], [1, 1], [0, 2], [1, 2], [2, 2]]) put(r, zx + dx, zy + dy, '#e8e0ff', 220); }
  if (k <= 0) return;
  const W = r.w, H = r.h;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (!r.data[i + 3]) continue;
    if (hash(x, y, 51) < k * 1.2) { r.data[i + 3] = 0; if (hash(x, y, 52) > 0.9) put(r, x + (hash(x, y, 53) - 0.5) * 4, y - k * 10 * hash(y, x, 54), hash(x, y, 55) > 0.5 ? '#b89aff' : '#8a74c8', Math.round(220 * (1 - k * 0.6))); }
    else r.data[i + 3] = Math.round(r.data[i + 3] * (1 - k * 0.5));
  }
}

export const DUENDE_SPEC: BossSpec = {
  id: 'duende_sueno', cell: 48, dims: citizenDims(DUENDE_LOOK, DK), elev: 26, anims: duendeAnims(), post: duendePost,
  scene: (cell, pose, sec) => citizenScene(DUENDE_LOOK, cell, pose, sec, DK),
  strikePoint: (j) => j.hands.near,
};

/** La arena de sueño (16 x 16, 4 cuadros, mirando a la derecha): un puñado de granitos lilas que vuela con su estela. */
export function sandProjectile(): Raster[] {
  return Array.from({ length: 4 }, (_, f) => {
    const r = createRaster(16, 16);
    for (let i = 0; i < 16; i++) {
      const t = hash(i, 1, 61), x = 13 - t * 12, y = 8 + (hash(i, 2, 61 + f) - 0.5) * (2 + t * 6) + Math.sin(f + i) * 0.5;
      put(r, x, y, t < 0.3 ? '#f0e8ff' : t < 0.6 ? '#b89aff' : '#8a74c8', Math.round(255 * (1 - t * 0.6)));
    }
    for (const [x, y] of [[12, 7], [13, 8], [12, 9], [11, 8]]) put(r, x, y, '#ffffff');
    return r;
  });
}

/** `impacto_arena` (32 x 32, 6 cuadros): la arena se abre en una nubecita lila con brillitos y se asienta. */
export function sandImpact(): Raster[] {
  return Array.from({ length: 6 }, (_, f) => {
    const r = createRaster(32, 32), t = (f + 1) / 6;
    for (let i = 0; i < 40; i++) {
      const a = hash(i, 3, 63) * Math.PI * 2, d = (0.3 + hash(i, 4, 63) * 0.7) * t * 13;
      put(r, 16 + Math.cos(a) * d, 16 + Math.sin(a) * d * 0.7 + t * t * 4, hash(i, 5, 63) > 0.5 ? '#b89aff' : '#d8c8ff', Math.round(240 * (1 - t * 0.7)));
    }
    if (f < 3) for (const [dx, dy] of [[0, -4], [4, 0], [0, 4], [-4, 0]]) put(r, 16 + dx * t * 2, 16 + dy * t * 2, '#ffffff', 220);
    return r;
  });
}

// ---------------------------------------------------------------- el Relojero (minijefe)

const RELOJERO_LOOK: CitizenLook = { skin: '#d8b090', hair: '#e0e0d8', top: '#6a4a3a', bottom: '#3a3a4a', shoe: '#2a2018', accent: '#8a6a4a', apron: true, glasses: true, beard: '#ecece4', hairStyle: 'calvo', prop: 'llave', propHex: '#d0a848', propVivo: true, belly: 0.6 };
const RK = 0.96;
/** con la llave apoyada en el piso como un bastón */
const RGUARD: BossPose = {
  root: { y: -1, lean: 3 }, spine: { bend: 4 }, head: { pitch: 2 },
  arms: { near: { pitch: 20, spread: 16, elbow: 30 }, far: { pitch: 10, spread: 12, elbow: 22 } },
  legs: { near: { x: 4, y: 0, z: 1 }, far: { x: -4, y: 0, z: 1 } },
  weapon: { angle: 168, yaw: -20 }, face: { eyes: 'closed' }, freed: 0, extra: { glow: 0 },
};

function relojeroAnims(): BossAnimDef[] {
  const idle: BossAnimDef = { name: 'idle', fps: 6, loop: true, frames: 6, keys: Array.from({ length: 6 }, (_, f) => kk(f, over(RGUARD, { root: { y: -1 + cyc(6, f) * 0.6 }, spine: { bend: 4 + cyc(6, f) * 2 }, head: { roll: cyc(6, f, 1) * 3 } }))) };
  const n = 8, S = 7, near = gait(S, 4, 0.55, n);
  const walk: BossAnimDef = {
    name: 'walk', fps: 9, loop: true, frames: n, stride: (2 * S) / 0.55,
    keys: Array.from({ length: n }, (_, f) => kk(f, over(RGUARD, { root: { roll: cyc(n, f) * 3, y: -1.5 - Math.abs(cyc(n, f)) * 1, lean: 6 }, legs: { near: near[f], far: near[(f + n / 2) % n] }, arms: { far: { pitch: 10 + cyc(n, f) * 18 } }, weapon: { angle: 160 - cyc(n, f) * 6, yaw: -20 } }))),
    events: [{ type: 'paso', frame: 0, foot: 'near' }, { type: 'paso', frame: 4, foot: 'far' }],
  };
  // llavazo: la lleva al hombro y la pasa por delante
  const SH = over(RGUARD, { root: { lean: -2 }, spine: { twist: -26 }, arms: { near: { pitch: 76, spread: 30, elbow: 96 } }, weapon: { angle: -60, yaw: 20 }, extra: { glow: 0.5 } });
  const SW = over(RGUARD, { root: { lean: 12, y: -3 }, spine: { twist: 24 }, arms: { near: { pitch: 50, spread: 8, elbow: 6 }, far: { pitch: -10 } }, legs: { near: { x: 8 } }, weapon: { angle: 120, yaw: 50 }, extra: { glow: 0.5 } });
  const attack: BossAnimDef = {
    name: 'attack', fps: 12, loop: false, frames: 8, windup: [1, 3],
    keys: [kk(0, RGUARD), kk(1, SH, 'out'), kk(3, over(SH, { spine: { twist: -30 }, extra: { glow: 1 } })), kk(4, SW, 'in'), kk(5, over(SW, { weapon: { angle: 130, yaw: 60 } })), kk(7, RGUARD, 'ease')],
    events: [{ type: 'impacto', frame: 4 }],
  };
  // el golpe fuerte: levanta la llave con las dos manos (8 cuadros que tiemblan y le brillan los ojos) y la clava
  const UP = over(RGUARD, { root: { y: -7, lean: 2 }, spine: { bend: 0 }, head: { pitch: -6 }, arms: { near: { pitch: 122, spread: 14, elbow: 60 }, far: { pitch: 118, spread: 14, elbow: 64 } }, legs: { near: { x: 7 }, far: { x: -7 } }, weapon: { angle: -66, yaw: 0, twoHand: true }, extra: { glow: 0.6 } });
  const SLAM = over(RGUARD, { root: { y: -8, lean: 16, x: -2 }, spine: { bend: 12 }, head: { pitch: 6 }, arms: { near: { pitch: 30, spread: 8, elbow: 6 }, far: { pitch: 28, spread: 8, elbow: 10 } }, legs: { near: { x: 8 }, far: { x: -9 } }, weapon: { angle: 150, yaw: 0, twoHand: true }, extra: { glow: 1 } });
  const heavy: BossAnimDef = {
    name: 'attack_heavy', fps: 12, loop: false, frames: 16, windup: [1, 8], shake: 1,
    keys: [kk(0, RGUARD), kk(2, UP, 'out'), kk(8, over(UP, { root: { y: -5 }, weapon: { angle: -70 }, extra: { glow: 1 } })), kk(9, SLAM, 'in'), kk(10, over(SLAM, { root: { y: -9 } })), kk(12, over(SLAM, { root: { y: -7 }, extra: { glow: 0.4 } })), kk(15, RGUARD, 'ease')],
    events: [{ type: 'impacto', frame: 9 }],
  };
  // da cuerda: para la llave delante, la agarra con las dos manos y la gira (tic tac), los ojos se le prenden
  const warcry: BossAnimDef = {
    name: 'warcry', fps: 10, loop: false, frames: 12, windup: [1, 3],
    keys: [
      kk(0, RGUARD),
      ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((f) => kk(f, over(RGUARD, { root: { lean: 4, y: -2 + (f % 2) * 0.6 }, arms: { near: { pitch: 60, spread: 10, elbow: 50 }, far: { pitch: 58, spread: 10, elbow: 54 } }, weapon: { angle: 8, yaw: (f % 4) * 90, twoHand: true }, head: { pitch: -6 }, extra: { glow: Math.min(1, f / 4) } }), f === 1 ? 'out' : 'linear')),
      kk(11, RGUARD, 'ease'),
    ],
    events: [{ type: 'grito', frame: 2 }],
  };
  const hit: BossAnimDef = { name: 'hit', fps: 12, loop: false, frames: 5, keys: [kk(0, RGUARD), kk(1, over(RGUARD, { root: { lean: -12, x: -4, y: -3 }, head: { pitch: -16 } }), 'out'), kk(4, RGUARD, 'ease')] };
  // se libera: se tambalea, se arrodilla, se le va la piedra; se para, se arregla los anteojos y saluda
  const KNEEL: BossPose = { ...over(RGUARD, { root: { y: -14, lean: 8, x: -2 }, spine: { bend: 12 }, head: { pitch: 18 }, arms: { near: { pitch: 20, spread: 18, elbow: 40 }, far: { pitch: 18, spread: 18, elbow: 42 } }, legs: { near: { x: -10, y: 0, z: 2, toe: 60 }, far: { x: 8, y: 0, z: 3 } } }), weapon: { angle: 0, drop: true } };
  const STAND: BossPose = { ...over(RGUARD, { root: { y: -1, lean: 0 }, spine: { bend: 2 }, head: { pitch: -4 }, face: { eyes: 'open' } }), weapon: { angle: 0, drop: true }, freed: 1 };
  const GLASSES = over(STAND, { arms: { near: { pitch: 150, spread: 26, elbow: 150 } }, head: { pitch: 4 } });
  const SALUTE = over(STAND, { arms: { near: { pitch: 150, spread: 34, elbow: 40, open: 1 } }, head: { pitch: -8 }, face: { eyes: 'happy', mouth: 0.5 } });
  const die: BossAnimDef = {
    name: 'die', fps: 8, loop: false, frames: 22,
    keys: [
      kk(0, RGUARD), kk(2, over(RGUARD, { root: { lean: -10, x: -3, y: -3 }, head: { pitch: -20 } }), 'out'),
      kk(5, KNEEL, 'in'), kk(8, over(KNEEL, { freed: 0.4 })), kk(10, over(KNEEL, { freed: 1, face: { eyes: 'open' }, head: { pitch: -2 } }), 'ease'),
      kk(13, STAND, 'ease'), kk(15, GLASSES, 'out'), kk(17, GLASSES), kk(19, SALUTE, 'ease'), kk(21, SALUTE),
    ],
    events: [{ type: 'suelta', frame: 5 }],
  };
  return [idle, walk, attack, heavy, warcry, hit, die];
}

/** En die, mientras se libera, la piedra se le cae como polvo alrededor (de los cuadros 6 a 11). */
function relojeroPost(r: Raster, anim: string, f: number) {
  eyeHalo(r);
  if (anim !== 'die' || f < 6 || f > 12) return;
  const k = (f - 6) / 6, W = r.w, pts: [number, number][] = [];
  for (let y = 0; y < r.h; y++) for (let x = 0; x < W; x++) if (r.data[(y * W + x) * 4 + 3] > 200) pts.push([x, y]);
  if (!pts.length) return;
  const g = lowest(r);
  for (let i = 0; i < 40; i++) { const [px, py] = pts[Math.floor(hash(i, f, 71) * pts.length)]; put(r, px + (hash(i, 2, 72) - 0.5) * 6, Math.min(g, py + k * 18 * (0.4 + hash(i, 3, 73))), hash(i, 4, 74) > 0.5 ? '#c8ccd8' : '#8a91a0', 220); }
}

export const RELOJERO_SPEC: BossSpec = {
  id: 'relojero', cell: 64, dims: citizenDims(RELOJERO_LOOK, RK), elev: 26, anims: relojeroAnims(), post: relojeroPost,
  scene: (cell, pose, sec) => citizenScene(RELOJERO_LOOK, cell, pose, sec, RK),
  strikePoint: weaponHead(24),
};

/**
 * `aviso_aguja` (32 x 32, 6 cuadros en bucle, capa suelo): por dónde va a barrer la aguja del reloj. Se repite en
 * línea (pega con el de al lado): una aguja dorada punteada con marquitas de minutos que avanzan.
 */
export function needleWarning(): Raster[] {
  return Array.from({ length: 6 }, (_, f) => {
    const r = createRaster(32, 32);
    for (let x = 0; x < 32; x++) {
      const on = (x + f * 32 / 6) % 8 < 5;
      for (let y = 13; y <= 18; y++) { const edge = y === 13 || y === 18; if (edge) { if (on) put(r, x, y, '#ffd890', 220); } else if ((x + y + f) % 3 === 0) put(r, x, y, '#c08a34', 110); }
      // las marquitas de los minutos
      if ((x + Math.round(f * 32 / 6)) % 16 === 0) for (let y = 9; y < 23; y++) put(r, x, y, '#fff4d0', y > 11 && y < 21 ? 230 : 140);
    }
    return r;
  });
}

void rotX;
