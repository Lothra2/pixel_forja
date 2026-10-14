import { type V3, type M3, add, mul, mv, mm, rotX, rotY, rotZ } from './sdf';
import { Body, loc } from './build';
import { bipedDims, solveBiped, type BossPose, type BossDims } from './rig';
import { makeBossRamp, type BossScene } from './render';
import type { Secondary } from './secondary';
import type { BossSpec } from './sheet';
import { type BossAnimDef, type BossKey, over } from './anim';
import { createRaster, type Raster } from '../core/raster';

/**
 * Los enemigos del Mundo 7 (El Corazón Helado), con el motor de volúmenes (8 direcciones, pivote medido). Es el piso
 * más oscuro del juego: los demonios tienen cara de verdad (cuernos, colmillos, ojos que queman) y dan miedo. Pero sin
 * sangre ni vísceras (se deshacen en nieve, escarcha, humo o ceniza) y lo que ataca siempre avisa antes.
 *
 * - `lobo_escarcha` (48): lobo flaco de pelo azul gris con escarcha en el lomo, colmillos y ojos celestes que brillan.
 * - `espectro_helado` (48, vuela): fantasma de hielo con capucha, la cara hueca y dos ojos fríos. Tira un rayo de hielo.
 * - `diablillo` (32): demonio chiquito rojo, cuernos, sonrisa de colmillos, ojos de brasa, alitas y cola. Tira fuego.
 * - `caballero_congelado` (64): armadura de hielo con escudo y espada, ojos rojos adentro del yelmo. Bloquea de frente.
 * - `bruja_escarcha` (48): bruja de hielo encorvada, de manos largas, que levanta muros de hielo y cura.
 * - `sombra_devoradora` (48): una sombra sin cuerpo claro, con una boca grande y ojos blancos. Se traga las luces.
 * - `reina_escarcha` y `guardian_puerta` (64, minijefes): en corazonJefes.ts, con `CORAZON_SPECS` (todos juntos).
 */

export const kk = (f: number, pose: BossPose, ease: BossKey['ease'] = 'linear'): BossKey => ({ f, pose, ease });
export const cyc = (n: number, f: number, ph = 0) => Math.sin((f / n) * Math.PI * 2 + ph);
export const hash = (x: number, y: number, s: number) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export function put(r: Raster, x: number, y: number, c: string, a = 255) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= r.w || y >= r.h) return;
  const k = (y * r.w + x) * 4, v = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  if (a >= 255 || !r.data[k + 3]) { r.data[k] = v[0]; r.data[k + 1] = v[1]; r.data[k + 2] = v[2]; r.data[k + 3] = Math.max(a, r.data[k + 3]); return; }
  const t = a / 255;
  for (let i = 0; i < 3; i++) r.data[k + i] = Math.round(r.data[k + i] * (1 - t) + v[i] * t);
  r.data[k + 3] = Math.max(r.data[k + 3], a);
}
export function gait(S: number, lift: number, duty: number, n: number): { x: number; y: number; z: number }[] {
  const out: { x: number; y: number; z: number }[] = [];
  for (let f = 0; f < n; f++) {
    const t = f / n;
    if (t < duty) out.push({ x: S - (2 * S * t) / duty, y: 0, z: 1 });
    else { const u = (t - duty) / (1 - duty); out.push({ x: -S + 2 * S * (u * u * (3 - 2 * u)), y: Math.sin(u * Math.PI) * lift, z: 1.5 }); }
  }
  return out;
}
export const lowest = (r: Raster) => { for (let y = r.h - 1; y >= 0; y--) for (let x = 0; x < r.w; x++) if (r.data[(y * r.w + x) * 4 + 3] > 150) return y; return r.h - 4; };

/** Un halo de un pixel alrededor de lo que brilla (los ojos): se ven en lo oscuro. `test` dice qué brilla. */
export function eyeHalo(r: Raster, test: (R: number, G: number, B: number) => boolean, col: string, a = 170) {
  const W = r.w, H = r.h, hot: number[] = [];
  for (let i = 0; i < W * H; i++) if (r.data[i * 4 + 3] && test(r.data[i * 4], r.data[i * 4 + 1], r.data[i * 4 + 2])) hot.push(i);
  const set = new Set(hot);
  for (const i of hot) { const x = i % W, y = Math.floor(i / W); for (const [dx, dy] of [[1, 0], [-1, 0], [0, -1], [0, 1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H || set.has(Y * W + X)) continue; put(r, X, Y, col, a); } }
}
/** Lo de los ojos rojos de brasa y lo de los celestes fríos. */
export const isRed = (R: number, G: number, B: number) => R > 230 && G < 170 && B < 120;
export const isCold = (R: number, G: number, B: number) => B > 230 && G > 190 && R < 200;
/** El filo frío arriba a la izquierda (la poca luz del hielo) y el rebote rojo de las brasas abajo a la derecha. */
export function iceRim(r: Raster, kCold = 0.3, kRed = 0.2) {
  const W = r.w, H = r.h, a0 = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) a0[i] = r.data[i * 4 + 3] > 150 ? 1 : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!a0[y * W + x]) continue;
    if ((x > 0 && !a0[y * W + x - 1]) || (y > 0 && !a0[(y - 1) * W + x])) put(r, x, y, '#9ab8d8', Math.round(255 * kCold));
    else if ((x + 1 < W && !a0[y * W + x + 1]) || (y + 1 < H && !a0[(y + 1) * W + x])) put(r, x, y, '#c03a10', Math.round(255 * kRed));
  }
}
/**
 * Se deshace: los pixeles se van de a poco (de arriba hacia abajo un poco antes) y caen como motas del color que se
 * diga (nieve, escarcha, ceniza o humo) que se juntan en el piso. k de 0 a 1.
 */
export function crumble(r: Raster, k: number, cols: string[], seed: number, up = false) {
  if (k <= 0) return;
  const W = r.w, H = r.h, g = lowest(r);
  const src = Uint8ClampedArray.from(r.data);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (!src[i + 3]) continue;
    const hy = (g - y) / Math.max(1, g);
    if (hash(x, y, seed) < k * 1.5 - hy * 0.4) {
      r.data[i + 3] = 0;
      if (hash(x, y, seed + 1) > 0.72) {
        const c = cols[Math.floor(hash(x, y, seed + 2) * cols.length)];
        const dx = (hash(x, y, seed + 3) - 0.5) * 10 * k, dy = up ? -k * 16 * hash(x, y, seed + 4) : Math.min(g - y, k * 14 * (0.5 + hash(x, y, seed + 4)));
        put(r, x + dx, y + dy, c, Math.round(230 * (1 - k * 0.5)));
      }
    }
  }
}
/** Lo de abajo de los que flotan se vuelve transparente de a poco (se pierde en jirones). */
export function fadeBottom(r: Raster, from: number, seed: number, f = 0) {
  const W = r.w, g = lowest(r);
  for (let y = 0; y < r.h; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (!r.data[i + 3]) continue;
    const t = (y - (g - from)) / Math.max(1, from);
    if (t <= 0) continue;
    const a = Math.max(0, 1 - t * 0.9 - (hash(x, y + f, seed) - 0.5) * 0.4);
    r.data[i + 3] = Math.round(r.data[i + 3] * a);
  }
}

const DUMMY = { hipH: 20, hipW: 5, legU: 10, legL: 10, foot: 5, spine: 15, shW: 7, armU: 9, armL: 9, hand: 3, neck: 3, head: 7 };
const M = (ramp: string, n = 6, o: { spread?: number; hue?: number } = {}): string[] => makeBossRamp(ramp, n, o);

// ---------------------------------------------------------------- el lobo de escarcha

/**
 * El lobo: cuerpo largo y flaco de pelo azul gris con escarcha en el lomo, el pecho más claro, el hocico largo con la
 * nariz negra, las orejas paradas hacia atrás, colmillos blancos cuando abre la boca y los ojos celestes que brillan
 * en lo oscuro. `extra`: `ph` (fase del paso), `step` (cuánto camina), `run` (galope), `jaw` (la boca), `head` (la
 * cabeza sube: el aullido), `low` (agachado, gruñe), `tail` y `blink`.
 */
function loboScene(cell: number, pose: BossPose): BossScene {
  const ex = pose.extra ?? {};
  const s = (cell / 128) * 1.2;
  const S = (v: V3): V3 => mul(v, s);
  const B = new Body();
  const body: M3 = mm(mm(rotY(pose.root.yaw ?? 0), rotZ(-(pose.root.lean ?? 0))), rotX(pose.root.roll ?? 0));
  const base: V3 = [(pose.root.x ?? 0) * s, (pose.root.y ?? 0) * s, 0];
  const P = (v: V3): V3 => add(base, mv(body, S(v)));
  const ph = ex.ph ?? 0, step = ex.step ?? 0, run = ex.run ?? 0, jaw = ex.jaw ?? 0, hd = ex.head ?? 0, low = ex.low ?? 0;
  const by = 26 - low * 5 + run * Math.sin(ph * 2) * 2;
  // el cuerpo: el pecho hondo adelante, la cintura flaca, la cadera
  B.ell(P([12, by + 1, 0]), S([13, 10, 9]), 'fur', 1, { rot: body, bump: 1.2 * s });
  B.ell(P([-2, by + 1, 0]), S([12, 7.4, 7.6]), 'fur', 1, { rot: body, bump: 1.2 * s });
  B.ell(P([-14, by + 1, 0]), S([10, 8.6, 8]), 'fur', 1, { rot: body, bump: 1.2 * s });
  B.ell(P([16, by - 4, 0]), S([8, 7, 6.6]), 'belly', 2, { rot: body, bump: 0.8 * s });
  // la crin del lomo con escarcha (mechones parados)
  for (let k = 0; k < 6; k++) B.cone(P([18 - k * 6, by + 8 - Math.abs(k - 2) * 0.6, 0]), P([14 - k * 6, by + 13 - Math.abs(k - 2), 0]), 3.6 * s, 0.6 * s, 'frostFur', 3);
  // el cuello y la cabeza (sube al aullar)
  const neck = P([24, by + 6 + hd * 6, 0]);
  const hc = P([31 - hd * 6, by + 11 + hd * 14 - low * 6, 0]);
  B.cone(P([18, by + 4, 0]), neck, 8 * s, 7 * s, 'fur', 4, { bump: 1 * s });
  B.cone(neck, hc, 7 * s, 6.4 * s, 'fur', 4, { bump: 0.8 * s });
  const hm: M3 = mm(body, rotZ(hd * 70 - low * 14));
  const H = (v: V3): V3 => add(hc, mv(hm, S(v)));
  B.ell(hc, S([8, 7, 7]), 'fur', 5, { rot: hm, bump: 0.6 * s });
  // el hocico largo, la nariz y la mandíbula que se abre
  B.ell(H([9, -1.6, 0]), S([8, 3.6, 4]), 'fur', 5, { rot: hm });
  B.ell(H([16.4, -0.6, 0]), S([1.8, 1.6, 2]), 'nose', 6, { rot: hm });
  const jm: M3 = mm(hm, rotZ(-jaw * 34));
  B.ell(add(hc, mv(jm, S([8, -4.6, 0]))), S([7.4, 1.8, 3.4]), 'belly', 7, { rot: jm });
  if (jaw > 0.1) {
    B.ell(H([9, -3.6 - jaw * 1.6, 0]), S([6.4, 1 + jaw * 1.6, 3]), 'mouth', 8, { rot: hm });
    // los colmillos: arriba y abajo, de los dos lados
    for (const z of [-1.8, 1.8]) {
      B.cone(H([13.4, -3.2, z]), H([13.6, -6 - jaw, z]), 0.9 * s, 0.2 * s, 'fang', 9);
      B.cone(add(hc, mv(jm, S([12.6, -3.8, z]))), add(hc, mv(jm, S([12.6, -1.2, z]))), 0.8 * s, 0.2 * s, 'fang', 9);
    }
  }
  // las orejas paradas, hacia atrás
  for (const z of [-1, 1]) B.cone(H([-2, 5, z * 4]), H([-5.6, 13 - low * 3, z * 5]), 2.6 * s, 0.5 * s, 'furDark', 10);
  // los ojos celestes que brillan, con la ceja hundida (mirada fea)
  for (const z of [-1, 1]) {
    if (!ex.blink) B.ell(H([6.6, 3, z * 3.4]), S([2.2, 1.8, 2.2]), 'eye', 11, { rot: hm });
    B.ell(H([6.2, 4.8, z * 3.4]), S([2.4, 0.8, 2.2]), 'furDark', 12, { rot: mm(hm, rotX(z * 18)) });
  }
  // la cola peluda: cuelga y se mueve (al galope va estirada)
  const ta = (ex.tail ?? 0) * 0.6;
  const t0 = P([-22, by + 3, 0]), t1 = P([-30, by - 3 + run * 6, ta * 6]), t2 = P([-36, by - 10 + run * 9, ta * 10]);
  B.chain([t0, t1, t2], [4.4, 5, 3].map((v) => v * s), 'fur', 13, { bump: 1.2 * s });
  B.ell(t2, S([3, 3, 3]), 'frostFur', 13);
  // las cuatro patas largas y flacas
  ([[13, 1, 0], [13, -1, Math.PI], [-13, 1, Math.PI], [-13, -1, 0]] as [number, number, number][]).forEach(([x, z, o], i) => {
    const front = x > 0;
    // al galope las de adelante van juntas y las de atrás juntas
    const off = run > 0.5 ? (front ? 0 : Math.PI) + (z > 0 ? 0.3 : 0) : o;
    const sw = Math.sin(ph + off) * (step * 7 + run * 11), lift = Math.max(0, Math.cos(ph + off)) * (step * 5 + run * 7);
    const hip = P([x, by - 2, z * 5]), foot = P([x + sw, lift, z * 6]);
    const knee = add(mul(add(hip, foot), 0.5), mv(body, S([front ? -2.6 : 3.2, 1, 0])));
    B.cone(hip, knee, (front ? 4 : 5) * s, 2.8 * s, 'fur', 20 + i);
    B.cone(knee, foot, 2.6 * s, 2 * s, 'furDark', 20 + i);
    B.ell(add(foot, mv(body, S([1.6, 1, 0]))), S([3, 1.6, 2.4]), 'furDark', 20 + i, { rot: body });
  });
  return {
    pieces: B.pieces, smooth: { 1: 4 * s, 4: 3 * s, 5: 2 * s },
    materials: {
      fur: { ramp: M('#3a4458', 6, { spread: 1.35, hue: 12 }), surface: 'fur', tex: 0.9, scale: 1.4, patch: { mat: 'frostFur', amount: 0.12, scale: 2, below: 0.6 } },
      furDark: { ramp: M('#2a3242', 5, { spread: 1.2 }), surface: 'fur', tex: 0.7, scale: 1.2 },
      frostFur: { ramp: ['#6a8aac', '#9ab8d8', '#d0e4f6', '#ffffff'], surface: 'fur', tex: 0.6, scale: 1 },
      belly: { ramp: M('#7a889e', 5, { spread: 1.1 }), surface: 'fur', tex: 0.6, scale: 1.2 },
      nose: { ramp: ['#05060a', '#14161c', '#2a2e38'], surface: 'skin', tex: 0.1 },
      mouth: { ramp: ['#14040a', '#2a0a12', '#3a121a'], surface: 'skin', tex: 0.1 },
      fang: { ramp: ['#a8b4c4', '#e8f0f8', '#ffffff'], surface: 'horn', tex: 0.1 },
      eye: { ramp: ['#8ae0ff', '#c8f4ff', '#ffffff'], surface: 'glow' },
    },
  };
}

const L0 = (extra: Record<string, number> = {}, root: BossPose['root'] = {}): BossPose => ({ root, arms: { near: { pitch: 0, elbow: 0 }, far: { pitch: 0, elbow: 0 } }, legs: { near: { x: 0, y: 0 }, far: { x: 0, y: 0 } }, extra: { ph: 0, step: 0, run: 0, jaw: 0, head: 0, low: 0, tail: 0, blink: 0, ...extra } });

function loboAnims(): BossAnimDef[] {
  // quieto pero tenso: respira, mueve la cola, la cabeza baja mirando
  const idle: BossAnimDef = { name: 'idle', fps: 6, loop: true, frames: 6, keys: [0, 1, 2, 3, 4, 5].map((f) => kk(f, L0({ low: 0.3, tail: cyc(6, f) * 0.6, jaw: 0.1 + 0.08 * Math.abs(cyc(6, f)), blink: f === 4 ? 1 : 0 }, { y: cyc(6, f) * 0.5 }))) };
  const walk: BossAnimDef = { name: 'walk', fps: 10, loop: true, frames: 8, stride: 34, keys: Array.from({ length: 8 }, (_, f) => kk(f, L0({ ph: (f / 8) * Math.PI * 2, step: 1, low: 0.2, tail: cyc(8, f) * 0.5 }, { y: -Math.abs(cyc(8, f)) * 0.8 }))), events: [{ type: 'paso', frame: 0 }, { type: 'paso', frame: 4 }] };
  // el galope: rodea rápido
  const run: BossAnimDef = { name: 'run', fps: 14, loop: true, frames: 6, stride: 56, keys: Array.from({ length: 6 }, (_, f) => kk(f, L0({ ph: (f / 6) * Math.PI * 2, run: 1, low: 0.3, jaw: 0.3, tail: 0 }, { lean: cyc(6, f) * 6, y: cyc(6, f, 1) * 2 }))), events: [{ type: 'paso', frame: 0 }, { type: 'paso', frame: 3 }] };
  // la mordida: se agacha gruñendo con los colmillos al aire (4 de aviso que tiemblan) y se tira adelante
  const CROUCH = L0({ low: 1, jaw: 0.55, tail: -0.4 }, { x: -3, lean: -6 });
  const BITE = L0({ low: 0.3, jaw: 0.1, head: -0.1, run: 0.5, ph: 1.2 }, { x: 0, lean: 4, y: 0 });
  const attack: BossAnimDef = {
    name: 'attack', fps: 12, loop: false, frames: 10, windup: [1, 4], shake: 0.6,
    keys: [kk(0, L0({ low: 0.3 })), kk(1, CROUCH, 'out'), kk(4, L0({ low: 1, jaw: 0.75, tail: -0.5 }, { x: -4, lean: -8 })), kk(5, L0({ low: 0.4, jaw: 1, run: 0.5 }, { x: 0, lean: 4, y: 0 }), 'in'), kk(6, BITE, 'in'), kk(7, BITE), kk(9, L0({ low: 0.3 }, { x: 2 }), 'ease')],
    events: [{ type: 'despegue', frame: 5 }, { type: 'impacto', frame: 6 }, { type: 'aterriza', frame: 7 }],
    rise: [0, 0, 0, 0, 0, 5, 3, 0, 0, 0],
  };
  // el aullido: se sienta un poco, sube la cabeza y aúlla (llama a la manada)
  const HOWL = L0({ head: 1, jaw: 0.8, tail: 0.2 }, { lean: -14, y: -3 });
  const aullar: BossAnimDef = {
    name: 'aullar', fps: 8, loop: false, frames: 12,
    keys: [kk(0, L0({ low: 0.3 })), kk(3, HOWL, 'out'), ...[4, 5, 6, 7, 8, 9].map((f) => kk(f, L0({ head: 1, jaw: f % 2 ? 0.7 : 0.9, tail: 0.2 }, { lean: -14, y: -3 + (f % 2) * 0.4 }))), kk(11, L0({ low: 0.3 }), 'ease')],
    events: [{ type: 'grito', frame: 4 }],
  };
  const hit: BossAnimDef = { name: 'hit', fps: 12, loop: false, frames: 4, keys: [kk(0, L0({ low: 0.3 })), kk(1, L0({ head: 0.4, jaw: 0.5, blink: 1, tail: 0.6 }, { x: -4, lean: -10 }), 'out'), kk(3, L0({ low: 0.3 }), 'ease')] };
  // se cae de costado y se deshace en nieve (el retoque)
  const die: BossAnimDef = { name: 'die', fps: 10, loop: false, frames: 12, keys: [kk(0, L0({ low: 0.3 })), kk(2, L0({ head: 0.5, jaw: 0.4, blink: 1 }, { lean: -10 }), 'out'), kk(5, L0({ low: 1, blink: 1, tail: -0.5 }, { roll: 55, y: -2 }), 'in'), kk(11, L0({ low: 1, blink: 1, tail: -0.5 }, { roll: 62, y: -3 }))] };
  return [idle, walk, run, attack, aullar, hit, die];
}

function loboPost(r: Raster, anim: string, f: number, n: number) {
  iceRim(r, 0.28, 0.16);
  eyeHalo(r, isCold, '#8ae0ff', 150);
  if (anim === 'die') crumble(r, Math.max(0, (f - 4) / (n - 5)), ['#e8f4ff', '#b8d0ea', '#9ab8d8', '#6a7480'], 211);
}

export const LOBO_SPEC: BossSpec = {
  id: 'lobo_escarcha', cell: 48, dims: (cell) => bipedDims(cell, DUMMY), elev: 26, anims: loboAnims(), post: loboPost,
  scene: (cell, pose) => loboScene(cell, pose),
  strikePoint: () => [17, 10, 0],
};

// ---------------------------------------------------------------- el espectro helado

/**
 * El espectro: capucha y manto de hielo pálido que se pierde abajo en jirones (no tiene piernas), la cara hueca y negra
 * con dos ojos fríos que brillan, los brazos flacos con dedos largos de hielo. Flota. `extra`: `bob` (sube y baja),
 * `cast` (levanta las manos: 0 a 1), `orb` (la bola del rayo de hielo entre las manos), `wisp` (los jirones), `lean`.
 */
const ESPECTRO = { hipH: 26, hipW: 6, legU: 12, legL: 12, foot: 4, spine: 24, shW: 12, armU: 16, armL: 16, hand: 4, neck: 3, head: 10 };
const espectroDims = (cell: number): BossDims => bipedDims(cell * 1.0, ESPECTRO);
function espectroScene(cell: number, pose: BossPose, sec?: Secondary): BossScene {
  const d = espectroDims(cell), s = d.s, j = solveBiped(d, pose), B = new Body();
  const S = (v: V3): V3 => mul(v, s);
  const ex = pose.extra ?? {}, ch = j.chest, hm = j.headM, body = j.body;
  const flap = (sec?.flap ?? 0) * 3, wisp = ex.wisp ?? 0;
  // el manto: del pecho hasta abajo, abierto en la falda, en tres jirones que se mecen
  B.ell(loc(ch, j.pelvis, S([0, 16, 0])), S([9, 14, 11]), 'robe', 1, { rot: ch, bump: 0.4 * s });
  const hem = loc(body, j.pelvis, S([-2 - flap, -20, 0]));
  B.cone(loc(body, j.pelvis, S([0, 6, 0])), hem, 11 * s, 14 * s, 'robe', 1);
  for (let k = 0; k < 3; k++) {
    const z = (k - 1) * 8, w = Math.sin(wisp * Math.PI * 2 + k * 2.1) * 3;
    B.chain([add(hem, S([0, 2, z])), add(hem, S([-4 + w, -10, z * 1.1])), add(hem, S([-8 + w * 1.6, -18, z * 1.2 + w]))], [5, 3, 0.8].map((v) => v * s), 'robeDark', 2);
  }
  // la capucha grande y la cara hueca
  const H = (v: V3): V3 => loc(hm, j.headC, S(v));
  B.ell(H([-1, 1, 0]), S([10, 11, 10]), 'robe', 3, { rot: hm, bump: 0.3 * s });
  B.cone(H([-6, 7, 0]), H([-14, 12, 0]), 5 * s, 1 * s, 'robe', 3);
  B.ell(H([5.2, -0.6, 0]), S([5, 8, 7.4]), 'void', 4, { rot: hm });
  // los ojos fríos, chiquitos y hondos (un poco caídos: tristes y malos)
  for (const z of [-2.8, 2.8]) B.ell(H([9.4, 0.6, z]), S([1.6, 2.4, 2]), 'eye', 5, { rot: mm(hm, rotX(z > 0 ? 12 : -12)) });
  // la boca: una sombra alargada, abierta en el grito
  if ((pose.face?.mouth ?? 0) > 0.1) B.ell(H([9.6, -4.4, 0]), S([0.8, 1 + (pose.face?.mouth ?? 0) * 2.4, 1.6]), 'eyeDim', 6, { rot: hm });
  // los brazos flacos, con mangas que cuelgan, y las manos de dedos largos de hielo
  for (const side of ['far', 'near'] as const) {
    const g = side === 'near' ? 34 : 30;
    B.cone(j.shoulders[side], j.elbows[side], 4.4 * s, 4 * s, 'robe', g);
    B.cone(j.elbows[side], j.hands[side], 3.6 * s, 1.4 * s, 'ice', g + 1);
    for (let q = 0; q < 3; q++) {
      const dir = mul(add(j.hands[side], mul(j.elbows[side], -1)), 0.32);
      const tip = add(j.hands[side], add(dir, mv(ch, S([0, (q - 1) * 2, (q - 1) * 1.6]))));
      B.cone(j.hands[side], tip, 0.9 * s, 0.3 * s, 'ice', g + 2);
    }
  }
  // la bola de hielo del rayo, entre las manos
  const orb = ex.orb ?? 0;
  if (orb > 0.05) { const c = mul(add(j.hands.near, j.hands.far), 0.5); B.ell(add(c, mv(body, S([4, 0, 0]))), S([2 + orb * 3.6, 2 + orb * 3.6, 2 + orb * 3.6]), 'orb', 40); }
  return {
    pieces: B.pieces, smooth: { 1: 3 * s, 3: 2 * s },
    materials: {
      robe: { ramp: M('#6a86a8', 6, { spread: 1.3, hue: 10 }), surface: 'cloth', tex: 0.5, scale: 1.6, patch: { mat: 'frost', amount: 0.14, scale: 1.6 } },
      robeDark: { ramp: M('#3a4e6a', 5, { spread: 1.2 }), surface: 'cloth', tex: 0.4 },
      frost: { ramp: ['#9ab8d8', '#d0e4f6', '#ffffff'], surface: 'stone', tex: 0.3 },
      ice: { ramp: M('#9ab8d8', 5, { spread: 1.1 }), surface: 'horn', tex: 0.3 },
      void: { ramp: ['#020306', '#06080e'], surface: 'eye' },
      eye: { ramp: ['#8ae0ff', '#d8f8ff', '#ffffff'], surface: 'glow' },
      eyeDim: { ramp: ['#020306', '#0a0e18'], surface: 'eye' },
      orb: { ramp: ['#8ae0ff', '#d8f8ff', '#ffffff'], surface: 'glow' },
    },
  };
}

const EFLOAT: BossPose = {
  root: { y: 0, lean: 6 }, spine: { bend: 10 }, head: { pitch: 8 },
  arms: { near: { pitch: 20, spread: 22, elbow: 40 }, far: { pitch: 18, spread: 22, elbow: 44 } },
  legs: { near: { x: 2, y: 10, z: 1 }, far: { x: -2, y: 10, z: 1 } },
  air: 12, extra: { orb: 0, wisp: 0 },
};

function espectroAnims(): BossAnimDef[] {
  const idle: BossAnimDef = { name: 'idle', fps: 6, loop: true, frames: 6, keys: [0, 1, 2, 3, 4, 5].map((f) => kk(f, over(EFLOAT, { air: 12 + cyc(6, f) * 2, head: { yaw: cyc(6, f) * 8 }, arms: { near: { pitch: 20 + cyc(6, f, 1) * 6 }, far: { pitch: 18 - cyc(6, f, 1) * 6 } }, extra: { wisp: f / 6 } }))) };
  const walk: BossAnimDef = { name: 'walk', fps: 8, loop: true, frames: 6, stride: 26, keys: [0, 1, 2, 3, 4, 5].map((f) => kk(f, over(EFLOAT, { root: { lean: 16 }, air: 12 + cyc(6, f) * 2, arms: { near: { pitch: 4, spread: 30 }, far: { pitch: 4, spread: 30 } }, extra: { wisp: f / 6 } }))) };
  // el rayo de hielo: sube las dos manos juntas y la bola crece (6 de aviso), y lo suelta adelante
  const CHARGE = (t: number) => over(EFLOAT, { root: { lean: -6 }, air: 14, head: { pitch: -6 }, arms: { near: { pitch: 80 + t * 20, spread: -10, elbow: 40 }, far: { pitch: 80 + t * 20, spread: -10, elbow: 40 } }, face: { mouth: t }, extra: { orb: 0.2 + t * 0.8, wisp: t } });
  const SHOOT = over(EFLOAT, { root: { lean: 14 }, air: 12, arms: { near: { pitch: 92, spread: -6, elbow: 4 }, far: { pitch: 92, spread: -6, elbow: 4 } }, face: { mouth: 1 }, extra: { orb: 0.5 } });
  const cast: BossAnimDef = {
    name: 'cast', fps: 10, loop: false, frames: 12, windup: [1, 6], shake: 0.5,
    keys: [kk(0, EFLOAT), ...[1, 2, 3, 4, 5, 6].map((f) => kk(f, CHARGE(f / 6), f === 1 ? 'out' : 'linear')), kk(7, SHOOT, 'in'), kk(8, over(SHOOT, { extra: { orb: 0.2 } })), kk(11, EFLOAT, 'ease')],
    events: [{ type: 'impacto', frame: 7 }],
  };
  const hit: BossAnimDef = { name: 'hit', fps: 12, loop: false, frames: 4, keys: [kk(0, EFLOAT), kk(1, over(EFLOAT, { root: { lean: -16, x: -4 }, head: { pitch: -16 }, face: { mouth: 0.8 } }), 'out'), kk(3, EFLOAT, 'ease')] };
  const die: BossAnimDef = { name: 'die', fps: 10, loop: false, frames: 10, keys: [kk(0, EFLOAT), kk(2, over(EFLOAT, { root: { lean: -12 }, head: { pitch: -24 }, arms: { near: { pitch: 120, spread: 40 }, far: { pitch: 120, spread: 40 } }, face: { mouth: 1 } }), 'out'), kk(9, over(EFLOAT, { root: { lean: -12 }, air: 6, head: { pitch: -24 }, arms: { near: { pitch: 130, spread: 50 }, far: { pitch: 130, spread: 50 } }, face: { mouth: 1 } }))] };
  return [idle, walk, cast, hit, die];
}

function espectroPost(r: Raster, anim: string, f: number, n: number) {
  fadeBottom(r, 12, 221, f);
  iceRim(r, 0.35, 0.1);
  eyeHalo(r, isCold, '#8ae0ff', 160);
  if (anim === 'die') crumble(r, Math.max(0, (f - 2) / (n - 3)), ['#ffffff', '#d0e4f6', '#9ab8d8'], 223, true);
}

export const ESPECTRO_SPEC: BossSpec = {
  id: 'espectro_helado', cell: 48, dims: espectroDims, elev: 26, anims: espectroAnims(), post: espectroPost,
  scene: (cell, pose, sec) => espectroScene(cell, pose, sec),
  strikePoint: (j) => mul(add(j.hands.near, j.hands.far), 0.5),
};

// ---------------------------------------------------------------- el diablillo

/**
 * El diablillo: chiquito, rojo oscuro, panzón, con la cabeza grande. Cuernos curvos, orejas en punta, la frente
 * fruncida, los ojos de brasa (amarillo con la pupila roja) y una sonrisa de oreja a oreja llena de colmillos. Alitas
 * de murciélago y la cola con punta de flecha. `extra`: `throw` (el brazo atrás con la bolita de fuego: 0 a 1),
 * `grin` (la sonrisa), `wing` (aleteo) y `ph`.
 */
const DIABLILLO = { hipH: 24, hipW: 6, legU: 11, legL: 12, foot: 6, spine: 18, shW: 10, armU: 11, armL: 11, hand: 4, neck: 2, head: 13 };
const diablilloDims = (cell: number): BossDims => bipedDims(cell * 1.3, DIABLILLO);
function diablilloScene(cell: number, pose: BossPose, sec?: Secondary): BossScene {
  const d = diablilloDims(cell), s = d.s, j = solveBiped(d, pose), B = new Body();
  const S = (v: V3): V3 => mul(v, s);
  const ex = pose.extra ?? {}, ch = j.chest, hm = j.headM, body = j.body;
  // la panza y el pecho
  B.ell(loc(ch, j.pelvis, S([2, 9, 0])), S([10, 12, 10]), 'skin', 1, { rot: ch, bump: 0.3 * s });
  B.ell(loc(ch, j.pelvis, S([6, 6, 0])), S([6, 8, 8]), 'belly', 2, { rot: ch });
  // las piernas de cabra cortas, con pezuña negra
  for (const side of ['far', 'near'] as const) {
    const g = side === 'near' ? 44 : 40;
    B.cone(j.hips[side], j.knees[side], 5 * s, 3.6 * s, 'skin', g);
    B.cone(j.knees[side], j.ankles[side], 3.4 * s, 2.6 * s, 'skinDark', g);
    B.ell(add(j.ankles[side], mv(rotY(pose.root.yaw ?? 0), S([2, -1.6, 0]))), S([3.6, 2.2, 3]), 'hoof', g + 1);
  }
  // los brazos flacos con garritas
  for (const side of ['far', 'near'] as const) {
    const g = side === 'near' ? 34 : 30;
    B.cone(j.shoulders[side], j.elbows[side], 3.4 * s, 3 * s, 'skin', g);
    B.cone(j.elbows[side], j.hands[side], 3 * s, 2.6 * s, 'skin', g);
    B.ell(j.hands[side], S([3.4, 3, 3]), 'skinDark', g + 1);
  }
  // la bolita de fuego en la mano (crece en el aviso)
  const fire = ex.fire ?? 0;
  if (fire > 0.05) B.ell(add(j.hands.near, mv(ch, S([0, 3, 0]))), S([2 + fire * 3, 2 + fire * 3.4, 2 + fire * 3]), 'fire', 50);
  // las alitas de murciélago (huesitos y la piel entre medio)
  const wing = ex.wing ?? 0;
  for (const z of [-1, 1]) {
    const root = loc(ch, j.pelvis, S([-7, 15, z * 5]));
    const tip = add(root, mv(ch, S([-8, 10 + wing * 6, z * (14 - wing * 4)])));
    const mid = add(root, mv(ch, S([-12, 2, z * 10])));
    B.cone(root, tip, 1.4 * s, 0.6 * s, 'wingBone', 60 + (z > 0 ? 1 : 0));
    B.ell(mul(add(add(root, tip), mid), 1 / 3), S([1.6, 7, 6]), 'wing', 60 + (z > 0 ? 1 : 0), { rot: mm(ch, rotX(z * (40 - wing * 20))) });
  }
  // la cola con punta de flecha
  const sw = (sec?.tail ?? 0) * 4;
  const t0 = loc(body, j.pelvis, S([-8, 2, 0])), t1 = loc(body, j.pelvis, S([-16, -4, sw])), t2 = loc(body, j.pelvis, S([-20, 4, sw * 1.6 + 2]));
  B.chain([t0, t1, t2], [2, 1.4, 1].map((v) => v * s), 'skin', 62);
  B.ell(t2, S([3, 2.2, 1.2]), 'skinDark', 63, { rot: body });
  // la cabeza grande: el cráneo, las mejillas, la nariz chata
  const H = (v: V3): V3 => loc(hm, j.headC, S(v));
  B.ell(H([0, 0, 0]), S([11, 10.4, 11]), 'skin', 10, { rot: hm, bump: 0.2 * s });
  B.ell(H([8, -3, 0]), S([5, 4.4, 8]), 'skin', 10, { rot: hm });
  B.ell(H([10.6, -1, 0]), S([2, 1.6, 2.4]), 'skinDark', 11, { rot: hm });
  // la frente fruncida: dos bultos que bajan hacia el medio (cara de malo)
  for (const z of [-1, 1]) B.ell(H([8, 5.4, z * 4.2]), S([3, 1.4, 3.6]), 'skinDark', 12, { rot: mm(hm, rotX(z * -26)) });
  // los ojos de brasa, grandes y oblicuos
  for (const z of [-1, 1]) {
    // a este tamaño la pupila no se lee: los ojos son dos brasas enteras
    B.ell(H([9.4, 2.2, z * 4.4]), S([2.6, 3, 3.4]), 'eye', 13, { rot: mm(hm, rotX(z * -18)) });
  }
  // la sonrisa de oreja a oreja con dos filas de colmillos
  const grin = ex.grin ?? 0.6;
  B.ell(H([10.2, -4.4, 0]), S([1.6, 1 + grin * 1.8, 7]), 'mouth', 15, { rot: hm });
  for (let q = -3; q <= 3; q++) {
    const z = q * 2, up = H([10.4, -3.8 + Math.abs(q) * 0.2, z]);
    B.cone(up, add(up, mv(hm, S([0.2, -1.6 - grin, 0]))), 0.7 * s, 0.15 * s, 'fang', 16);
    if (q % 2 === 0) { const dn = H([10.2, -5.6 - grin * 1.4 + Math.abs(q) * 0.2, z + 1]); B.cone(dn, add(dn, mv(hm, S([0.2, 1.2, 0]))), 0.6 * s, 0.15 * s, 'fang', 16); }
  }
  // los cuernos curvos y las orejas en punta
  for (const z of [-1, 1]) {
    B.chain([H([1, 8, z * 5.4]), H([0, 13, z * 8]), H([-3, 17, z * 8.6])], [2.6, 1.6, 0.4].map((v) => v * s), 'horn', 17);
    B.cone(H([-1, 2, z * 10]), H([-6, 6, z * 15]), 2.4 * s, 0.4 * s, 'skin', 18);
  }
  return {
    pieces: B.pieces, smooth: { 1: 3 * s, 10: 2 * s },
    materials: {
      skin: { ramp: M('#8a1a14', 6, { spread: 1.4, hue: 16 }), surface: 'leather', tex: 0.6, scale: 1.4 },
      skinDark: { ramp: M('#4a0c0a', 5, { spread: 1.2 }), surface: 'leather', tex: 0.4 },
      belly: { ramp: M('#b03a24', 5, { spread: 1.1 }), surface: 'leather', tex: 0.3 },
      hoof: { ramp: ['#08060a', '#16121a', '#2a2430'], surface: 'horn', tex: 0.2 },
      horn: { ramp: M('#2a2420', 5, { spread: 1.3 }), surface: 'horn', tex: 0.5 },
      wing: { ramp: M('#4a1210', 5, { spread: 1.2 }), surface: 'leather', tex: 0.3 },
      wingBone: { ramp: M('#2a0a08', 4), surface: 'horn', tex: 0.2 },
      eye: { ramp: ['#ff6a20', '#ffc040', '#fff0a0'], surface: 'glow' },
      mouth: { ramp: ['#080204', '#1a0608'], surface: 'eye' },
      fang: { ramp: ['#c8c0b0', '#f0ece4', '#ffffff'], surface: 'horn', tex: 0.1 },
      fire: { ramp: ['#ff6a20', '#ffb040', '#fff0a0'], surface: 'glow' },
    },
  };
}

const DSTAND: BossPose = {
  root: { y: -2, lean: 8 }, spine: { bend: 10 }, head: { pitch: 4 },
  arms: { near: { pitch: 30, spread: 30, elbow: 60 }, far: { pitch: 26, spread: 30, elbow: 60 } },
  legs: { near: { x: 3, y: 0, z: 2 }, far: { x: -3, y: 0, z: 2 } },
  extra: { fire: 0, grin: 0.6, wing: 0 },
};

function diablilloAnims(): BossAnimDef[] {
  // se balancea de un pie al otro, sonriendo y aleteando apenas
  const idle: BossAnimDef = { name: 'idle', fps: 8, loop: true, frames: 6, keys: [0, 1, 2, 3, 4, 5].map((f) => kk(f, over(DSTAND, { root: { roll: cyc(6, f) * 6, y: -2 + Math.abs(cyc(6, f)) }, head: { roll: cyc(6, f) * 8 }, extra: { wing: 0.5 + 0.5 * cyc(6, f), grin: 0.6 + 0.2 * Math.abs(cyc(6, f)) } }))) };
  const n = 6, near = gait(5, 4, 0.5, n);
  const walk: BossAnimDef = {
    name: 'walk', fps: 12, loop: true, frames: n, stride: 20,
    keys: Array.from({ length: n }, (_, f) => kk(f, over(DSTAND, { root: { lean: 14, y: -2 - Math.abs(cyc(n, f)) * 2, roll: cyc(n, f) * 6 }, legs: { near: near[f], far: near[(f + n / 2) % n] }, arms: { near: { pitch: 30 - cyc(n, f) * 30 }, far: { pitch: 26 + cyc(n, f) * 30 } }, extra: { wing: 0.5 + 0.5 * cyc(n, f, 1) } }))),
    events: [{ type: 'paso', frame: 0 }, { type: 'paso', frame: 3 }],
  };
  // tira fuego: lleva la mano atrás y la bolita crece (4 de aviso), y la tira con todo el cuerpo
  const BACK = (t: number) => over(DSTAND, { root: { lean: -6, x: -2 }, spine: { twist: -30, bend: -4 }, head: { pitch: -6 }, arms: { near: { pitch: 140, spread: 20, elbow: 70 } }, extra: { fire: 0.3 + t * 0.7, grin: 1, wing: 1 } });
  const THROW = over(DSTAND, { root: { lean: 22, x: 3 }, spine: { twist: 26, bend: 14 }, arms: { near: { pitch: 80, spread: 0, elbow: 0 } }, legs: { near: { x: 7 }, far: { x: -5 } }, extra: { fire: 0, grin: 1, wing: 0 } });
  const attack: BossAnimDef = {
    name: 'attack', fps: 10, loop: false, frames: 9, windup: [1, 4], shake: 0.5,
    keys: [kk(0, DSTAND), kk(1, BACK(0), 'out'), kk(2, BACK(0.4)), kk(3, BACK(0.75)), kk(4, BACK(1)), kk(5, THROW, 'in'), kk(6, THROW), kk(8, DSTAND, 'ease')],
    events: [{ type: 'impacto', frame: 5 }],
  };
  const hit: BossAnimDef = { name: 'hit', fps: 12, loop: false, frames: 4, keys: [kk(0, DSTAND), kk(1, over(DSTAND, { root: { lean: -16, x: -3 }, head: { pitch: -16 }, extra: { grin: 0.2, wing: 1 } }), 'out'), kk(3, DSTAND, 'ease')] };
  // se apaga en humo: se encoge sobre sí mismo
  const die: BossAnimDef = { name: 'die', fps: 10, loop: false, frames: 10, keys: [kk(0, DSTAND), kk(2, over(DSTAND, { root: { lean: -10 }, head: { pitch: -20 }, arms: { near: { pitch: 120, spread: 40 }, far: { pitch: 120, spread: 40 } }, extra: { grin: 0.1, wing: 1 } }), 'out'), kk(6, over(DSTAND, { root: { y: -10, lean: 20 }, spine: { bend: 30 }, head: { pitch: 30 }, extra: { grin: 0, wing: 0 } }), 'in'), kk(9, over(DSTAND, { root: { y: -12, lean: 24 }, spine: { bend: 34 }, head: { pitch: 34 }, extra: { grin: 0, wing: 0 } }))] };
  return [idle, walk, attack, hit, die];
}

function diablilloPost(r: Raster, anim: string, f: number, n: number) {
  iceRim(r, 0.2, 0.3);
  eyeHalo(r, (R, G, B) => R > 240 && G > 100 && B < 120, '#ff6a20', 160);
  if (anim === 'die') crumble(r, Math.max(0, (f - 3) / (n - 4)), ['#3a3438', '#5a5054', '#2a2428', '#8a2000'], 231, true);
}

export const DIABLILLO_SPEC: BossSpec = {
  id: 'diablillo', cell: 32, dims: diablilloDims, elev: 26, anims: diablilloAnims(), post: diablilloPost,
  scene: (cell, pose, sec) => diablilloScene(cell, pose, sec),
  strikePoint: (j) => j.hands.near,
};

// ---------------------------------------------------------------- el caballero congelado

/**
 * El caballero congelado: una armadura cubierta de hielo (placas celestes con escarcha y carámbanos colgando) con un
 * escudo de cometa en la mano de lejos y la espada en la de cerca. Adentro del yelmo, por la rendija, dos ojos rojos.
 * `extra`: `eyes`, `broken` (se desarma y cae vacía), `shield` (el escudo al frente: bloquear).
 */
const KNIGHT = { hipH: 40, hipW: 8, legU: 20, legL: 19, foot: 8, spine: 30, shW: 15, armU: 18, armL: 17, hand: 5, neck: 4, head: 11, weaponLen: 28, weaponR: 3 };
const knightDims = (cell: number): BossDims => bipedDims(cell * 0.84, KNIGHT);
function knightScene(cell: number, pose: BossPose): BossScene {
  const d = knightDims(cell), s = d.s, j = solveBiped(d, pose), B = new Body();
  const S = (v: V3): V3 => mul(v, s);
  const ex = pose.extra ?? {}, ch = j.chest, hm = j.headM, body = j.body;
  const br = ex.broken ?? 0;
  const drop = (p: V3, sx: number, sz: number): V3 => (br > 0 ? [p[0] + sx * br * 10 * s, p[1] - Math.min(p[1] - 3 * s, br * p[1]), p[2] + sz * br * 10 * s] : p);
  // el peto con la escarcha, la faldilla de placas y el cinturón
  B.ell(drop(loc(ch, j.pelvis, S([1, 20, 0])), 0.2, 0), S([10, 12.4, 12.6]), 'armor', 1, { rot: ch, bump: 0.3 * s });
  B.ell(drop(loc(ch, j.pelvis, S([6, 22, 0])), 0.4, 0), S([4.4, 9, 9]), 'armorHi', 2, { rot: ch });
  B.ell(drop(loc(body, j.pelvis, S([0, 3, 0])), -0.2, 0), S([9.4, 7, 11.4]), 'armor', 3, { rot: body });
  B.ell(drop(loc(body, j.pelvis, S([0, 8, 0])), -0.2, 0), S([10, 1.8, 12]), 'iron', 4, { rot: body });
  // carámbanos que cuelgan de la faldilla y de las hombreras
  for (let q = 0; q < 5; q++) { const p = drop(loc(body, j.pelvis, S([6 - q * 3, -3, (q - 2) * 5])), -0.2, 0); B.cone(p, add(p, [0, -5 * s, 0]), 1 * s, 0.2 * s, 'ice', 5); }
  for (const side of ['far', 'near'] as const) {
    const g = side === 'near' ? 44 : 40, zs = side === 'near' ? 1 : -1;
    B.cone(drop(j.hips[side], 0, zs * 0.4), drop(j.knees[side], 0, zs * 0.6), 5.6 * s, 4.6 * s, 'armor', g);
    B.ell(drop(j.knees[side], 0.2, zs * 0.6), S([4.6, 4, 4.6]), 'armorHi', g);
    B.cone(drop(j.knees[side], 0.2, zs * 0.6), drop(j.ankles[side], 0.2, zs * 0.6), 4.6 * s, 4 * s, 'armor', g);
    B.ell(drop(add(j.ankles[side], mv(rotY(pose.root.yaw ?? 0), S([3, -1.6, 0]))), 0.3, zs * 0.6), S([6.6, 3, 4.4]), 'iron', g + 1);
  }
  for (const side of ['far', 'near'] as const) {
    const g = side === 'near' ? 34 : 30, zs = side === 'near' ? 1 : -1;
    B.ell(drop(j.shoulders[side], -0.3, zs), S([7, 5.6, 7]), 'armorHi', g, { rot: ch });
    const sp = drop(j.shoulders[side], -0.3, zs);
    B.cone(add(sp, [0, -3 * s, 0]), add(sp, [0, -7 * s, 0]), 1 * s, 0.2 * s, 'ice', g);
    B.cone(drop(j.shoulders[side], -0.3, zs), drop(j.elbows[side], -0.4, zs), 4.4 * s, 3.8 * s, 'armor', g);
    B.cone(drop(j.elbows[side], -0.4, zs), drop(j.hands[side], -0.5, zs), 3.8 * s, 4.2 * s, 'armor', g);
    B.ell(drop(j.hands[side], -0.5, zs), S([4.4, 4.2, 4.2]), 'iron', g + 1);
  }
  // el escudo de cometa en la mano de lejos (al frente cuando bloquea)
  const sh = ex.shield ?? 0;
  {
    const c = drop(add(j.hands.far, mv(ch, S([3 + sh * 4, 0, -3 + sh * 3]))), -0.6, -1);
    const rot = mm(ch, mm(rotY(-70 + sh * 70), rotZ(br * 80)));
    B.box(c, S([1.6, 16, 11]), 'shield', 70, { rot, round: 2 * s });
    B.box(add(c, mv(rot, S([1.4, 0, 0]))), S([0.6, 13, 8]), 'shieldFace', 71, { rot, round: 1.4 * s });
    B.ell(add(c, mv(rot, S([2, 2, 0]))), S([0.8, 4, 4]), 'ice', 72, { rot });
  }
  // la espada larga de hielo
  if (j.weapon && br < 0.5) {
    const g = j.weapon.grip, dir = j.weapon.dir;
    B.cone(add(g, mul(dir, -4 * s)), add(g, mul(dir, 3 * s)), 1.4 * s, 1.4 * s, 'iron', 80);
    B.cone(add(g, mul(dir, 3 * s)), add(g, mul(dir, 4 * s)), 4.4 * s, 4.4 * s, 'iron', 80);
    B.cone(add(g, mul(dir, 4 * s)), add(g, mul(dir, 28 * s)), 2.2 * s, 0.6 * s, 'blade', 81);
  } else if (br >= 0.5) {
    // la espada tirada en el piso
    const g = drop(j.hands.near, 0.8, 1);
    B.cone([g[0], 2 * s, g[2]], [g[0] + 30 * s, 2 * s, g[2] + 6 * s], 2 * s, 0.6 * s, 'blade', 81);
  }
  // el yelmo con la cresta de hielo y la rendija; adentro, los ojos rojos
  const hk = 1.35;
  const H = (v: V3): V3 => drop(loc(hm, j.headC, mul([v[0], v[1] + 1, v[2]], s * hk)), 0.6, 0);
  const SH = (v: V3): V3 => mul(v, s * hk);
  B.ell(H([0, 2, 0]), SH([9.4, 10, 9.4]), 'armor', 20, { rot: hm, bump: 0.2 * s });
  for (let q = 0; q < 4; q++) B.cone(H([2 - q * 3, 10, 0]), H([1 - q * 3.4, 15 - q * 0.6, 0]), 1.6 * s * hk, 0.3 * s * hk, 'ice', 21);
  B.box(H([8.6, 2, 0]), SH([0.8, 1.6, 6.6]), 'void', 22, { rot: hm });
  const eyes = ex.eyes ?? 0.8;
  if (eyes > 0.05 && br < 0.4) for (const z of [-2.6, 2.6]) B.ell(H([8.8, 2, z]), SH([0.9, 0.9 + eyes * 0.4, 1.3]), 'eye', 24, { rot: hm });
  return {
    pieces: B.pieces, smooth: { 1: 2 * s },
    materials: {
      armor: { ramp: M('#4a6a8a', 6, { spread: 1.35, hue: 10 }), surface: 'metal', tex: 0.4, patch: { mat: 'frost', amount: 0.24, scale: 2.2 } },
      armorHi: { ramp: M('#6a8aac', 6, { spread: 1.3 }), surface: 'metal', tex: 0.4, patch: { mat: 'frost', amount: 0.3, scale: 1.8 } },
      iron: { ramp: M('#242a34', 5, { spread: 1.2 }), surface: 'metal', tex: 0.4 },
      frost: { ramp: ['#9ab8d8', '#d0e4f6', '#ffffff'], surface: 'stone', tex: 0.3, scale: 1.2 },
      ice: { ramp: ['#6a8aac', '#b8d0ea', '#ffffff'], surface: 'horn', tex: 0.2 },
      blade: { ramp: ['#6a8aac', '#9ab8d8', '#d0e4f6', '#ffffff'], surface: 'metal', tex: 0.2 },
      shield: { ramp: M('#2e3e58', 5, { spread: 1.2 }), surface: 'metal', tex: 0.4, patch: { mat: 'frost', amount: 0.2 } },
      shieldFace: { ramp: M('#5a1414', 5, { spread: 1.2 }), surface: 'cloth', tex: 0.4, patch: { mat: 'frost', amount: 0.3 } },
      void: { ramp: ['#000000', '#05060a'], surface: 'eye' },
      eye: { ramp: ['#c01a10', '#ff2a1a', '#ff8a6a'], surface: 'glow' },
    },
  };
}

const KGUARD: BossPose = {
  root: { y: -1, lean: 4 }, spine: { bend: 4 }, head: { pitch: 4 },
  arms: { near: { pitch: 20, spread: 14, elbow: 40 }, far: { pitch: 34, spread: 12, elbow: 70 } },
  legs: { near: { x: 5, y: 0, z: 2 }, far: { x: -5, y: 0, z: 2 } },
  weapon: { angle: 120 }, extra: { eyes: 0.7, broken: 0, shield: 0.3 },
};

function knightAnims(): BossAnimDef[] {
  const idle: BossAnimDef = { name: 'idle', fps: 5, loop: true, frames: 6, keys: Array.from({ length: 6 }, (_, f) => kk(f, over(KGUARD, { root: { y: -1 + cyc(6, f) * 0.5 }, extra: { eyes: 0.6 + 0.3 * Math.abs(cyc(6, f)) } }))) };
  const n = 8, near = gait(6, 3, 0.6, n);
  const walk: BossAnimDef = {
    name: 'walk', fps: 7, loop: true, frames: n, stride: 20,
    keys: Array.from({ length: n }, (_, f) => kk(f, over(KGUARD, { root: { roll: cyc(n, f) * 3, y: -1.5 - Math.abs(cyc(n, f)) * 1.4, lean: 6 }, legs: { near: near[f], far: near[(f + n / 2) % n] }, arms: { near: { pitch: 20 - cyc(n, f) * 12 } } }))),
    events: [{ type: 'paso', frame: 0, foot: 'near' }, { type: 'paso', frame: 4, foot: 'far' }],
  };
  // el tajo: la espada atrás (4 de aviso) y un tajo de costado
  const SL_UP = over(KGUARD, { root: { lean: -4 }, spine: { twist: -30 }, arms: { near: { pitch: 110, spread: 30, elbow: 40 } }, weapon: { angle: -10 }, extra: { eyes: 1 } });
  const SL_DN = over(KGUARD, { root: { lean: 14, x: 3 }, spine: { twist: 26 }, arms: { near: { pitch: 70, spread: -10, elbow: 6 } }, weapon: { angle: 140 }, legs: { near: { x: 9 } }, extra: { eyes: 1 } });
  const attack: BossAnimDef = {
    name: 'attack', fps: 10, loop: false, frames: 10, windup: [1, 4], shake: 0.6,
    keys: [kk(0, KGUARD), kk(1, SL_UP, 'out'), kk(4, over(SL_UP, { spine: { twist: -34 } })), kk(5, SL_DN, 'in'), kk(6, SL_DN), kk(9, KGUARD, 'ease')],
    events: [{ type: 'impacto', frame: 5 }],
  };
  // el golpe pesado: la espada bien arriba con las dos manos (7 de aviso que tiemblan) y la baja de golpe al piso
  const HV_UP = over(KGUARD, { root: { lean: -6, y: -2 }, spine: { bend: -4 }, head: { pitch: -10 }, arms: { near: { pitch: 140, spread: 10, elbow: 40 } }, weapon: { angle: -50, twoHand: true }, extra: { eyes: 1, shield: 0 } });
  const HV_DN = over(KGUARD, { root: { lean: 16, y: -8, x: 1 }, spine: { bend: 16 }, arms: { near: { pitch: 60, spread: 4, elbow: 0 } }, weapon: { angle: 170, twoHand: true }, legs: { near: { x: 10 }, far: { x: -8 } }, extra: { eyes: 1, shield: 0 } });
  const heavy: BossAnimDef = {
    name: 'attack_heavy', fps: 10, loop: false, frames: 14, windup: [1, 7], shake: 1,
    keys: [kk(0, KGUARD), kk(2, HV_UP, 'out'), kk(7, over(HV_UP, { root: { y: -2 } })), kk(8, HV_DN, 'in'), kk(10, HV_DN), kk(13, KGUARD, 'ease')],
    events: [{ type: 'impacto', frame: 8 }],
  };
  // bloquear: el escudo al frente, agachado detrás (de frente no le entra el golpe)
  const BLOCK = over(KGUARD, { root: { lean: 10, y: -4 }, spine: { bend: 8 }, arms: { far: { pitch: 86, spread: -6, elbow: 30 }, near: { pitch: 30, spread: 20, elbow: 60 } }, legs: { near: { x: 7, z: 3 }, far: { x: -7, z: 3 } }, extra: { eyes: 1, shield: 1 } });
  const bloquear: BossAnimDef = { name: 'bloquear', fps: 8, loop: true, frames: 4, keys: [0, 1, 2, 3].map((f) => kk(f, over(BLOCK, { root: { y: -4 + (f % 2) * 0.5 } }))) };
  const hit: BossAnimDef = { name: 'hit', fps: 12, loop: false, frames: 4, keys: [kk(0, KGUARD), kk(1, over(KGUARD, { root: { lean: -12, x: -4 }, head: { pitch: -12 }, extra: { eyes: 0.3 } }), 'out'), kk(3, KGUARD, 'ease')] };
  // la armadura cae vacía: los ojos se apagan y las piezas caen al piso
  const die: BossAnimDef = {
    name: 'die', fps: 9, loop: false, frames: 12,
    keys: [kk(0, KGUARD), kk(2, over(KGUARD, { root: { lean: -8 }, head: { pitch: -14 }, extra: { eyes: 0.2 } }), 'out'), kk(4, over(KGUARD, { root: { y: -4 }, extra: { eyes: 0, broken: 0.3 } }), 'in'), kk(7, over(KGUARD, { root: { y: -8 }, extra: { eyes: 0, broken: 0.9 } }), 'in'), kk(11, over(KGUARD, { root: { y: -8 }, extra: { eyes: 0, broken: 1 } }))],
    events: [{ type: 'aterriza', frame: 7 }],
  };
  return [idle, walk, attack, heavy, bloquear, hit, die];
}

function knightPost(r: Raster, anim: string, f: number, n: number) {
  iceRim(r, 0.3, 0.18);
  eyeHalo(r, isRed, '#ff2a1a', 170);
  // al caer, un poco de escarcha que se levanta
  if (anim === 'die' && f >= 6) { const g = lowest(r); for (let i = 0; i < 14; i++) { const t = ((f - 6) / (n - 6) + i / 14) % 1; put(r, r.w / 2 + (hash(i, 1, 241) - 0.5) * 40, g - t * 14, '#d0e4f6', Math.round(200 * (1 - t))); } }
}

export const CABALLERO_SPEC: BossSpec = {
  id: 'caballero_congelado', cell: 64, dims: knightDims, elev: 26, anims: knightAnims(), post: knightPost,
  scene: (cell, pose) => knightScene(cell, pose),
  strikePoint: (j, d) => (j.weapon ? add(j.weapon.grip, mul(j.weapon.dir, 26 * d.s)) : j.hands.near),
};

// ---------------------------------------------------------------- la bruja de escarcha

/**
 * La bruja de escarcha: encorvada, con un manto largo azul de hielo que arrastra, el pelo blanco largo y duro de
 * escarcha, la cara flaca azul pálido con la nariz larga y ganchuda, los ojos blancos que brillan y las manos largas
 * de dedos finos. `extra`: `cast` (la bola de hielo entre las manos), `heal` (la luz verde fría de curar).
 */
const WITCH = { hipH: 26, hipW: 6, legU: 13, legL: 13, foot: 5, spine: 22, shW: 10, armU: 14, armL: 15, hand: 4, neck: 4, head: 9 };
const witchDims = (cell: number): BossDims => bipedDims(cell * 1.1, WITCH);
function witchScene(cell: number, pose: BossPose, sec?: Secondary): BossScene {
  const d = witchDims(cell), s = d.s, j = solveBiped(d, pose), B = new Body();
  const S = (v: V3): V3 => mul(v, s);
  const ex = pose.extra ?? {}, ch = j.chest, hm = j.headM, body = j.body;
  const flap = (sec?.flap ?? 0) * 3;
  // el manto hasta el piso, arrastrando
  const ankMid = mul(add(j.ankles.near, j.ankles.far), 0.5);
  B.ell(loc(ch, j.pelvis, S([0, 13, 0])), S([8, 12, 9]), 'robe', 1, { rot: ch, bump: 0.4 * s });
  B.cone(loc(body, j.pelvis, S([0, 4, 0])), [ankMid[0] - flap - 3 * s, 2 * s, ankMid[2]], 9 * s, 13 * s, 'robe', 1);
  // la joroba
  B.ell(loc(ch, j.pelvis, S([-5, 20, 0])), S([7, 7, 8]), 'robe', 1, { rot: ch });
  // el borde del manto escarchado y quebrado
  for (let q = 0; q < 6; q++) { const a = (q / 6) * Math.PI * 2; B.cone([ankMid[0] + Math.cos(a) * 12 * s - flap, 3 * s, ankMid[2] + Math.sin(a) * 12 * s], [ankMid[0] + Math.cos(a) * 13 * s - flap, 0.5 * s, ankMid[2] + Math.sin(a) * 13 * s], 2.4 * s, 0.6 * s, 'frost', 2); }
  // los brazos largos y flacos, las manos de dedos largos
  for (const side of ['far', 'near'] as const) {
    const g = side === 'near' ? 34 : 30;
    B.cone(j.shoulders[side], j.elbows[side], 3.6 * s, 3.2 * s, 'robe', g);
    B.cone(j.elbows[side], j.hands[side], 2.4 * s, 1.6 * s, 'skin', g + 1);
    const dir = mul(add(j.hands[side], mul(j.elbows[side], -1)), 0.36);
    for (let q = 0; q < 4; q++) { const tip = add(j.hands[side], add(dir, mv(ch, S([0, (q - 1.5) * 1.6, (q - 1.5) * 1.4])))); B.cone(j.hands[side], tip, 0.8 * s, 0.25 * s, 'skin', g + 2); }
  }
  // la bola de hielo de los muros, o la luz de curar
  const cast = ex.cast ?? 0, heal = ex.heal ?? 0;
  const mid = mul(add(j.hands.near, j.hands.far), 0.5);
  if (cast > 0.05) B.ell(add(mid, mv(body, S([3, 2, 0]))), S([1.6 + cast * 3, 1.6 + cast * 3, 1.6 + cast * 3]), 'orb', 40);
  if (heal > 0.05) B.ell(add(mid, mv(body, S([3, 4, 0]))), S([1.6 + heal * 3, 1.6 + heal * 3, 1.6 + heal * 3]), 'heal', 41);
  // la cabeza: cara flaca, nariz ganchuda, la boca torcida y el pelo largo de escarcha
  const H = (v: V3): V3 => loc(hm, j.headC, S(v));
  B.ell(H([1, -0.5, 0]), S([7, 8.4, 6.6]), 'skin', 10, { rot: hm });
  B.chain([H([6.4, 1, 0]), H([10, -1.4, 0]), H([10.6, -4.4, 0])], [1.6, 1.2, 0.5].map((v) => v * s), 'skin', 11);
  B.ell(H([7.2, -4.2, 0.4]), S([0.6, 0.6, 2.6]), 'mouth', 12, { rot: mm(hm, rotX(10)) });
  for (const z of [-2.6, 2.6]) { B.ell(H([7, 1.6, z]), S([1.8, 2, 2]), 'eye', 13, { rot: hm }); B.ell(H([7, 3.2, z * 1.1]), S([1.4, 0.6, 2]), 'hair', 14, { rot: mm(hm, rotX(z > 0 ? 20 : -20)) }); }
  // el pelo largo y duro que cae por la espalda, con la corona rota de carámbanos
  for (let q = 0; q < 5; q++) { const z = (q - 2) * 2.6; B.chain([H([-3, 5, z]), H([-9, -4, z * 1.3]), H([-12, -16, z * 1.5])], [2.4, 2, 0.6].map((v) => v * s), 'hair', 15); }
  for (let q = 0; q < 4; q++) B.cone(H([-1 + q * 0.6, 7, (q - 1.5) * 3]), H([-2 + q * 0.6, 12 + (q % 2) * 3, (q - 1.5) * 3.4]), 1 * s, 0.2 * s, 'ice', 16);
  return {
    pieces: B.pieces, smooth: { 1: 3 * s, 10: 1.5 * s },
    materials: {
      robe: { ramp: M('#2a3e5e', 6, { spread: 1.3, hue: 10 }), surface: 'cloth', tex: 0.6, scale: 1.8, patch: { mat: 'frost', amount: 0.14, scale: 1.6 } },
      frost: { ramp: ['#9ab8d8', '#d0e4f6', '#ffffff'], surface: 'stone', tex: 0.3 },
      skin: { ramp: M('#8aa0b8', 5, { spread: 1.2 }), surface: 'skin', tex: 0.2 },
      hair: { ramp: ['#9ab8d8', '#c8dcee', '#e8f4ff', '#ffffff'], surface: 'fur', tex: 0.7, scale: 1 },
      ice: { ramp: ['#6a8aac', '#b8d0ea', '#ffffff'], surface: 'horn', tex: 0.2 },
      mouth: { ramp: ['#05060a', '#14161c'], surface: 'eye' },
      eye: { ramp: ['#c8f4ff', '#e8fcff', '#ffffff'], surface: 'glow' },
      orb: { ramp: ['#8ae0ff', '#d8f8ff', '#ffffff'], surface: 'glow' },
      heal: { ramp: ['#6ae8c8', '#b8fff0', '#ffffff'], surface: 'glow' },
    },
  };
}

const WSTAND: BossPose = {
  root: { y: -3, lean: 14 }, spine: { bend: 24 }, head: { pitch: -52 },
  arms: { near: { pitch: 40, spread: 20, elbow: 50 }, far: { pitch: 36, spread: 20, elbow: 56 } },
  legs: { near: { x: 3, y: 0, z: 1.5 }, far: { x: -3, y: 0, z: 1.5 } },
  extra: { cast: 0, heal: 0 },
};

function witchAnims(): BossAnimDef[] {
  // encorvada, los dedos se mueven solos
  const idle: BossAnimDef = { name: 'idle', fps: 6, loop: true, frames: 6, keys: [0, 1, 2, 3, 4, 5].map((f) => kk(f, over(WSTAND, { root: { y: -3 + cyc(6, f) * 0.5 }, head: { yaw: cyc(6, f) * 10 }, arms: { near: { elbow: 50 + cyc(6, f) * 10 }, far: { elbow: 56 - cyc(6, f) * 10 } } }))) };
  const n = 8, near = gait(4, 2, 0.6, n);
  const walk: BossAnimDef = {
    name: 'walk', fps: 7, loop: true, frames: n, stride: 14,
    keys: Array.from({ length: n }, (_, f) => kk(f, over(WSTAND, { root: { roll: cyc(n, f) * 3, y: -3 - Math.abs(cyc(n, f)) }, legs: { near: near[f], far: near[(f + n / 2) % n] } }))),
    events: [{ type: 'paso', frame: 0 }, { type: 'paso', frame: 4 }],
  };
  // el muro (o curar): sube las manos largas, la bola crece (6 de aviso) y la tira al piso adelante
  const UP = (t: number) => over(WSTAND, { root: { lean: 4, y: -2 }, spine: { bend: 10 }, head: { pitch: -24 }, arms: { near: { pitch: 110 + t * 30, spread: 26, elbow: 30 }, far: { pitch: 110 + t * 30, spread: 26, elbow: 30 } }, extra: { cast: 0.2 + t * 0.8 } });
  const DOWN = over(WSTAND, { root: { lean: 24, y: -5 }, spine: { bend: 30 }, arms: { near: { pitch: 60, spread: 10, elbow: 6 }, far: { pitch: 60, spread: 10, elbow: 6 } }, extra: { cast: 0.3 } });
  const cast: BossAnimDef = {
    name: 'cast', fps: 10, loop: false, frames: 12, windup: [1, 6], shake: 0.4,
    keys: [kk(0, WSTAND), ...[1, 2, 3, 4, 5, 6].map((f) => kk(f, UP(f / 6), f === 1 ? 'out' : 'linear')), kk(7, DOWN, 'in'), kk(8, over(DOWN, { extra: { cast: 0 } })), kk(11, WSTAND, 'ease')],
    events: [{ type: 'impacto', frame: 7 }],
  };
  const hit: BossAnimDef = { name: 'hit', fps: 12, loop: false, frames: 4, keys: [kk(0, WSTAND), kk(1, over(WSTAND, { root: { lean: 0, x: -3 }, head: { pitch: -34 } }), 'out'), kk(3, WSTAND, 'ease')] };
  // se vuelve nieve: se hunde y se deshace en un montoncito
  const die: BossAnimDef = { name: 'die', fps: 9, loop: false, frames: 12, keys: [kk(0, WSTAND), kk(2, over(WSTAND, { root: { lean: 0 }, head: { pitch: -40 }, arms: { near: { pitch: 130, spread: 40 }, far: { pitch: 130, spread: 40 } } }), 'out'), kk(7, over(WSTAND, { root: { y: -14, lean: 30 }, spine: { bend: 40 } }), 'in'), kk(11, over(WSTAND, { root: { y: -18, lean: 34 }, spine: { bend: 44 } }))] };
  return [idle, walk, cast, hit, die];
}

function witchPost(r: Raster, anim: string, f: number, n: number) {
  iceRim(r, 0.3, 0.16);
  eyeHalo(r, (R, G, B) => R > 190 && G > 235 && B > 240, '#c8f4ff', 140);
  if (anim === 'die') crumble(r, Math.max(0, (f - 3) / (n - 4)), ['#ffffff', '#e8f4ff', '#b8d0ea', '#8a94a0'], 251);
}

export const BRUJA_SPEC: BossSpec = {
  id: 'bruja_escarcha', cell: 48, dims: witchDims, elev: 26, anims: witchAnims(), post: witchPost,
  scene: (cell, pose, sec) => witchScene(cell, pose, sec),
  strikePoint: (j) => mul(add(j.hands.near, j.hands.far), 0.5),
};

// ---------------------------------------------------------------- la sombra devoradora

/**
 * La sombra devoradora: humo negro sin cuerpo claro, un montón que se arrastra con jirones que se levantan, dos ojos
 * blancos redondos que no parpadean y una boca enorme que se abre de lado a lado (negra adentro, con dientes chuecos
 * de hueso). `extra`: `mouth` (0 a 1: se abre hasta tragarse una luz), `stretch` (se estira hacia adelante), `t`.
 */
function sombraScene(cell: number, pose: BossPose): BossScene {
  const ex = pose.extra ?? {};
  const s = (cell / 128) * 1.25;
  const S = (v: V3): V3 => mul(v, s);
  const B = new Body();
  const body: M3 = mm(rotY(pose.root.yaw ?? 0), rotZ(-(pose.root.lean ?? 0)));
  const base: V3 = [(pose.root.x ?? 0) * s, (pose.root.y ?? 0) * s, 0];
  const P = (v: V3): V3 => add(base, mv(body, S(v)));
  const t = ex.t ?? 0, mo = ex.mouth ?? 0, st = ex.stretch ?? 0;
  // el montón de humo: varias bolas que se mueven por su cuenta
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + t * 0.6, rr = 9 + (k % 3) * 2;
    B.ell(P([Math.cos(a) * rr * 0.8 + st * 4, 12 + Math.sin(t * 2 + k) * 2 + (k % 2) * 4, Math.sin(a) * rr]), S([10 + (k % 2) * 3, 9, 10]), 'smoke', 1, { bump: 2 * s });
  }
  // la cabeza: el bulto de arriba, hacia adelante
  const hc = P([8 + st * 8, 24 + Math.sin(t * 1.6) * 1.4 + mo * 2, 0]);
  B.ell(hc, S([13, 11 + mo * 3, 14]), 'smoke', 1, { rot: body, bump: 1.6 * s });
  // los jirones que suben
  for (let k = 0; k < 4; k++) { const z = (k - 1.5) * 7; B.chain([P([-6 + k * 2, 22, z]), P([-10 + Math.sin(t + k) * 3, 34, z * 1.2]), P([-12 + Math.sin(t * 1.4 + k) * 5, 44 + k * 2, z * 1.3])], [5, 3, 0.6].map((v) => v * s), 'smokeLight', 2); }
  const hm = mm(body, rotZ(mo * 10));
  const H = (v: V3): V3 => add(hc, mv(hm, S(v)));
  // la boca grande de lado a lado
  if (mo > 0.04) {
    B.ell(H([11.4, -3, 0]), S([3, 1.4 + mo * 9, 10 + mo * 2]), 'mouth', 3, { rot: hm });
    B.ell(H([10.8, -3, 0]), S([3, 0.8 + mo * 7, 8 + mo * 2]), 'throat', 3, { rot: hm });
    for (let q = -4; q <= 4; q++) {
      const z = q * 2.2, top = H([13, -3 + 1.2 + mo * 8.4 - Math.abs(q) * 0.3, z]), bot = H([12.8, -3 - 1.2 - mo * 8.4 + Math.abs(q) * 0.3, z + 0.6]);
      B.cone(top, add(top, mv(hm, S([0, -2.6 - (q % 2) * 1.6, 0]))), 1.1 * s, 0.2 * s, 'tooth', 4);
      B.cone(bot, add(bot, mv(hm, S([0, 2.4 + ((q + 1) % 2) * 1.4, 0]))), 1.1 * s, 0.2 * s, 'tooth', 4);
    }
  } else B.ell(H([13, -3, 0]), S([0.8, 0.6, 8]), 'mouth', 3, { rot: hm });
  // los ojos blancos, redondos, que no parpadean
  for (const z of [-5, 5]) B.ell(H([11.6, 5 + mo * 2.4, z]), S([2, 2.8, 2.8]), 'eye', 5, { rot: hm });
  return {
    pieces: B.pieces, smooth: { 1: 6 * s, 2: 3 * s },
    materials: {
      smoke: { ramp: ['#020204', '#06060a', '#0c0c14', '#14141e', '#1e1e2a'], surface: 'fur', tex: 0.8, scale: 2 },
      smokeLight: { ramp: ['#06060a', '#14141e', '#24243a'], surface: 'fur', tex: 0.6 },
      mouth: { ramp: ['#3a0a1a', '#5a1028', '#7a1a34'], surface: 'skin', tex: 0.2 },
      throat: { ramp: ['#000000', '#020002'], surface: 'eye' },
      tooth: { ramp: ['#8a8478', '#c8c0b0', '#ece6da'], surface: 'horn', tex: 0.2 },
      eye: { ramp: ['#e8e8f0', '#ffffff', '#ffffff'], surface: 'glow' },
    },
  };
}

const SH0 = (extra: Record<string, number> = {}, root: BossPose['root'] = {}): BossPose => ({ root, arms: { near: { pitch: 0, elbow: 0 }, far: { pitch: 0, elbow: 0 } }, legs: { near: { x: 0, y: 0 }, far: { x: 0, y: 0 } }, extra: { t: 0, mouth: 0, stretch: 0, ...extra } });

function sombraAnims(): BossAnimDef[] {
  const idle: BossAnimDef = { name: 'idle', fps: 6, loop: true, frames: 6, keys: [0, 1, 2, 3, 4, 5].map((f) => kk(f, SH0({ t: (f / 6) * Math.PI * 2, mouth: 0.05 + 0.05 * Math.abs(cyc(6, f)) }))) };
  const walk: BossAnimDef = { name: 'walk', fps: 8, loop: true, frames: 6, stride: 22, keys: [0, 1, 2, 3, 4, 5].map((f) => kk(f, SH0({ t: (f / 6) * Math.PI * 2, stretch: 0.4 + 0.3 * cyc(6, f) }, { lean: 6 }))) };
  // se traga una luz: abre la boca enorme de a poco (4 de aviso) y se tira adelante a tragar
  const attack: BossAnimDef = {
    name: 'attack', fps: 10, loop: false, frames: 10, windup: [1, 4], shake: 0.5,
    keys: [kk(0, SH0()), ...[1, 2, 3, 4].map((f) => kk(f, SH0({ t: f, mouth: 0.25 * f, stretch: -0.2 }, { x: -1 }), f === 1 ? 'out' : 'linear')), kk(5, SH0({ t: 5, mouth: 1, stretch: 1.2 }, { x: 6 }), 'in'), kk(6, SH0({ t: 6, mouth: 0.1, stretch: 1 }, { x: 6 })), kk(9, SH0({ t: 9 }), 'ease')],
    events: [{ type: 'impacto', frame: 6 }],
  };
  const hit: BossAnimDef = { name: 'hit', fps: 12, loop: false, frames: 4, keys: [kk(0, SH0()), kk(1, SH0({ mouth: 0.5, stretch: -0.6 }, { x: -4 }), 'out'), kk(3, SH0(), 'ease')] };
  const die: BossAnimDef = { name: 'die', fps: 10, loop: false, frames: 10, keys: [kk(0, SH0()), kk(2, SH0({ mouth: 0.8, stretch: -0.4, t: 2 }), 'out'), kk(9, SH0({ mouth: 0.2, stretch: -0.6, t: 6 }, { y: -6 }))] };
  return [idle, walk, attack, hit, die];
}

function sombraPost(r: Raster, anim: string, f: number, n: number) {
  // el borde de humo: deshilachado y semitransparente
  const W = r.w, H = r.h, a0 = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) a0[i] = r.data[i * 4 + 3] > 150 ? 1 : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!a0[i]) continue;
    const edge = (x > 0 && !a0[i - 1]) || (x < W - 1 && !a0[i + 1]) || (y > 0 && !a0[i - W]) || (y < H - 1 && !a0[i + W]);
    if (edge && hash(x, y + f, 261) > 0.4) r.data[i * 4 + 3] = 150;
    if (edge && hash(x, y, 262 + f) > 0.7) put(r, x + (hash(x, y, 263) > 0.5 ? 1 : -1), y - 1, '#0c0c14', 120);
  }
  eyeHalo(r, (R, G, B) => R > 230 && G > 230 && B > 230, '#e8e8f0', 120);
  if (anim === 'die') crumble(r, Math.max(0, (f - 1) / (n - 2)), ['#0c0c14', '#14141e', '#24243a'], 265, true);
}

export const SOMBRA_DEVORADORA_SPEC: BossSpec = {
  id: 'sombra_devoradora', cell: 48, dims: (cell) => bipedDims(cell, DUMMY), elev: 26, anims: sombraAnims(), post: sombraPost,
  scene: (cell, pose) => sombraScene(cell, pose),
  strikePoint: () => [16, 10, 0],
};


// ---------------------------------------------------------------- los efectos

/** `proyectil_rayo_hielo_<dir>` (16 x 16, 4 cuadros; `proyectil_hielo` ya es del poder de las heroínas): el rayo de hielo del espectro, una aguja celeste con cola de escarcha. */
export function iceProjectile(): Raster[] {
  return Array.from({ length: 4 }, (_, f) => {
    const r = createRaster(16, 16);
    for (let t = 0; t < 9; t++) put(r, 11 - t, 8 + Math.sin(t * 1.1 + f) * 0.6, t < 2 ? '#ffffff' : t < 5 ? '#b8e8ff' : '#6a8aac', Math.round(255 * (1 - t / 10)));
    for (let y = -2; y <= 2; y++) for (let x = -4; x <= 3; x++) { if (Math.abs(y) > 2 - Math.max(0, x) * 0.6) continue; put(r, 11 + x, 8 + y, Math.abs(y) < 1 && x > -2 ? '#ffffff' : '#8ae0ff'); }
    if (f % 2) { put(r, 6, 5, '#d0e4f6', 200); put(r, 4, 11, '#9ab8d8', 180); } else { put(r, 7, 11, '#d0e4f6', 200); put(r, 3, 6, '#9ab8d8', 180); }
    return r;
  });
}

/** `impacto_rayo_hielo` (32 x 32, 6 cuadros; `impacto_hielo` ya es del poder de las heroínas): el rayo pega y salen cristales para todos lados, queda escarcha. */
export function iceImpact(): Raster[] {
  return Array.from({ length: 6 }, (_, f) => {
    const r = createRaster(32, 32), t = (f + 1) / 6;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + 0.3, d = 3 + t * 12, len = 4 * (1 - t) + 1;
      for (let q = 0; q < len; q++) put(r, 16 + Math.cos(a) * (d + q), 16 + Math.sin(a) * (d + q) * 0.8, q < 1 ? '#ffffff' : '#8ae0ff', Math.round(255 * (1 - t * 0.6)));
    }
    if (f < 3) for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (Math.hypot(x, y) < 3.4 - f) put(r, 16 + x, 16 + y, '#ffffff');
    // la escarcha que queda en el piso
    for (let i = 0; i < 10 * t; i++) put(r, 16 + (hash(i, 1, 271) - 0.5) * 20, 22 + hash(i, 2, 271) * 6, '#d0e4f6', 200);
    return r;
  });
}

/** `proyectil_fuego_chico_<dir>` (16 x 16, 4 cuadros): la bolita de fuego del diablillo. */
export function smallFireball(): Raster[] {
  return Array.from({ length: 4 }, (_, f) => {
    const r = createRaster(16, 16);
    for (let t = 0; t < 7; t++) put(r, 9 - t, 8 + Math.sin(t * 1.2 + f * 1.5) * 1, t < 2 ? '#ffb040' : t < 4 ? '#ff6a20' : '#8a2000', Math.round(255 * (1 - t / 8)));
    for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) { const d = Math.hypot(x, y); if (d > 2.8 + (f % 2) * 0.4) continue; put(r, 10 + x, 8 + y, d < 1.2 ? '#fff0a0' : d < 2 ? '#ffb040' : '#ff6a20'); }
    put(r, 9, 7, '#ffffff');
    return r;
  });
}

/** `aviso_lanza_hielo` (48 x 32, 8 cuadros, capa suelo): donde va a caer una lanza de la Reina. El círculo se cierra. */
export function iceLanceWarning(): Raster[] {
  return Array.from({ length: 8 }, (_, f) => {
    const r = createRaster(48, 32), t = (f + 1) / 8;
    for (let y = 0; y < 32; y++) for (let x = 0; x < 48; x++) {
      const dx = (x + 0.5 - 24) / 22, dy = (y + 0.5 - 16) / 14, d = Math.hypot(dx, dy);
      if (d > 1) continue;
      const ang = (Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2);
      if (d > 0.84 && ang < t + 0.02) put(r, x, y, f % 2 ? '#ffffff' : '#8ae0ff', 235);
      else if (d < 0.84 * t) put(r, x, y, '#0c1a2e', Math.round(50 + t * 110));
    }
    // la cruz de escarcha del medio, que crece
    for (let q = -6 * t; q <= 6 * t; q++) { put(r, 24 + q, 16, '#d0e4f6', 200); put(r, 24, 16 + q * 0.6, '#d0e4f6', 200); }
    return r;
  });
}

/** `aviso_cruz` (128 x 128, 8 cuadros, capa suelo): el golpe en cruz del Guardián. Dos franjas que se prenden rojas. */
export function crossWarning(): Raster[] {
  return Array.from({ length: 8 }, (_, f) => {
    const r = createRaster(128, 128), t = (f + 1) / 8;
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      const inH = Math.abs(y - 63.5) < 12, inV = Math.abs(x - 63.5) < 12;
      if (!inH && !inV) continue;
      const along = inH ? Math.abs(x - 63.5) / 64 : Math.abs(y - 63.5) / 64;
      const edge = inH ? Math.abs(y - 63.5) > 10 : Math.abs(x - 63.5) > 10;
      // se llena del centro hacia afuera
      if (along > t) continue;
      if (edge) put(r, x, y, f % 2 ? '#ff6a20' : '#ff2a1a', 235);
      else put(r, x, y, '#2a0606', Math.round(40 + t * 110));
    }
    // runas de fuego negro en las puntas
    for (const [cx, cy] of [[63.5, 8], [63.5, 120], [8, 63.5], [120, 63.5]]) if (t > 0.6) for (let k = 0; k < 6; k++) put(r, cx + Math.cos(k) * 4, cy + Math.sin(k * 1.7) * 4, '#ffb040', 220);
    return r;
  });
}
