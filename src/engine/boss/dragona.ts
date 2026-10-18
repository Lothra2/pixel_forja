import { type V3, type M3, add, mul, mv, mm, rotX, rotY, rotZ } from './sdf';
import { Body } from './build';
import { bipedDims, type BossPose } from './rig';
import { makeBossRamp, type BossScene, type BossMaterial } from './render';
import type { Secondary } from './secondary';
import type { BossSpec } from './sheet';
import { type BossAnimDef, type BossKey } from './anim';
import { createRaster, type Raster } from '../core/raster';

/**
 * El jefe del Mundo 6: la Dragona de Brasa (celda 128), con el motor de volúmenes de los jefes grandes.
 *
 * Enorme, de escamas rojo oscuro con brasas en las juntas, ojos grandes ámbar con el párpado de arriba un poco caído
 * (más triste que mala), cuernos para atrás y las alas plegadas. Nada de dientes a la vista: la boca es una línea y
 * cuando se abre se ve el fuego adentro. Tiene un grillete en el cuello y en las patas de adelante, con cadenas.
 *
 * Es de cuatro patas, así que arma su propio esqueleto (como el Pez Farol). La pose usa `extra`:
 * - `ph` (fase del paso) y `step` (cuánto camina), `neck` (-1 gacha a 1 al cielo), `jaw` (boca, 0 a 1), `chest` (el
 *   pecho que brilla al tomar aire, 0 a 1), `tail` (barrido de la cola en grados), `claw` (la pata de adelante que
 *   sube para el zarpazo, 0 a 1) y `swipe` (el zarpazo que baja, 0 a 1);
 * - `breath` (el chorro de fuego, 0 a 1), `flame` (encendida, cubierta de llamas), `grey` (apagada, las escamas
 *   grises), `lie` (echada en el piso), `chains` (las cadenas rotas, 0 a 1), `gold` (el fuego pasa a dorado),
 *   `small` (se encoge), `curl` (se enrosca), `eyes` (1 abiertos, 0 cerrados) y `happy`.
 */

const D_SCALE = 0.72;
const BASE = { hipH: 30, hipW: 14, legU: 16, legL: 16, foot: 8, spine: 30, shW: 14, armU: 16, armL: 16, hand: 6, neck: 10, head: 14 };

function mixHex(a: string, b: string, t: number): string {
  if (t <= 0) return a;
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * Math.min(1, t)).toString(16).padStart(2, '0')).join('');
}

function materials(ex: Record<string, number>): Record<string, BossMaterial> {
  const grey = ex.grey ?? 0, gold = ex.gold ?? 0, chest = ex.chest ?? 0;
  const col = (red: string, ash: string, au: string) => mixHex(mixHex(red, ash, grey), au, gold);
  return {
    scale: { ramp: makeBossRamp(col('#8a1c12', '#5a5450', '#d8a040'), 7, { spread: 1.5, hue: 16 }), surface: 'leather', tex: 0.7, scale: 2.2, patch: { mat: 'scaleDark', amount: 0.18, scale: 2.6 } },
    scaleDark: { ramp: makeBossRamp(col('#4a1010', '#3a3634', '#b07a28'), 6, { spread: 1.2 }), surface: 'stone', tex: 0.6, scale: 1.6 },
    belly: { ramp: makeBossRamp(mixHex(col('#c8642a', '#7a726a', '#ffe0a0'), '#ffb040', chest * 0.6), 6, { spread: 1.15 }), surface: 'leather', tex: 0.3, scale: 1.4 },
    horn: { ramp: makeBossRamp(col('#3a2622', '#4a4440', '#f4e0b0'), 5, { spread: 1.2 }), surface: 'horn', tex: 0.4 },
    wing: { ramp: makeBossRamp(col('#5a1a14', '#4a4644', '#c88a30'), 6, { spread: 1.2 }), surface: 'leather', tex: 0.4, scale: 1.8 },
    ember: grey > 0.5 ? { ramp: ['#3a2a24', '#5a3a2a', '#a05030'], surface: 'stone', tex: 0.2 } : gold > 0.5 ? { ramp: ['#e8b040', '#ffe080', '#fffae0'], surface: 'glow' } : { ramp: ['#c04010', '#ff8a30', '#ffe08a'], surface: 'glow' },
    eyeA: { ramp: gold > 0.5 ? ['#c88a20', '#ffe080', '#fffae0'] : grey > 0.5 ? ['#6a5a40', '#8a7a58', '#a89a78'] : ['#e09030', '#ffd070', '#fff4d0'], surface: 'skin', tex: 0.05 },
    pupil: { ramp: ['#100604', '#20100a'], surface: 'eye' },
    glint: { ramp: ['#ffffff', '#ffffff'], surface: 'glow' },
    lid: { ramp: makeBossRamp(col('#5a1610', '#4a4644', '#c08a30'), 5), surface: 'leather', tex: 0.3 },
    mouthIn: { ramp: grey > 0.5 ? ['#1a1210', '#2a1e1a'] : ['#ff7020', '#ffb040', '#fff0a0'], surface: grey > 0.5 ? 'skin' : 'glow' },
    fire: { ramp: gold > 0.5 ? ['#e8a030', '#ffe080', '#fffae0'] : ['#ff5a10', '#ffb040', '#fff4b0'], surface: 'glow' },
    iron: { ramp: makeBossRamp('#4a3e38', 6, { spread: 1.3 }), surface: 'metal', tex: 0.5, patch: { mat: 'rust', amount: 0.3, scale: 2 } },
    rust: { ramp: makeBossRamp('#8a4a2a', 5), surface: 'stone', tex: 0.5 },
  };
}

/** Dónde está la boca (marco del personaje, pixeles de la celda): para la luz de la boca y el origen del aliento. */
export function dragonaBoca(cell: number, pose: BossPose): V3 | null {
  const sk = skeleton(cell, pose);
  if ((pose.extra?.grey ?? 0) > 0.5 && (pose.extra?.jaw ?? 0) < 0.2) return null;
  return sk.mouth;
}

interface Skel { s: number; P: (v: V3) => V3; body: M3; head: V3; hm: M3; mouth: V3; neck: V3[]; tail: V3[]; legs: { hip: V3; knee: V3; foot: V3; front: boolean; z: number }[] }

/** El esqueleto de cuatro patas: el cuerpo, el cuello, la cabeza, la cola y las cuatro patas, según la pose. */
function skeleton(cell: number, pose: BossPose): Skel {
  const ex = pose.extra ?? {}, r = pose.root;
  const small = ex.small ?? 1, s = (cell / 128) * D_SCALE * small;
  const lie = ex.lie ?? 0, curl = ex.curl ?? 0;
  const body: M3 = mm(mm(rotY(r.yaw ?? 0), rotZ(-(r.lean ?? 0))), rotX(r.roll ?? 0));
  const base: V3 = [(r.x ?? 0) * s, ((r.y ?? 0) - lie * 18) * s, (r.z ?? 0) * s];
  const P = (v: V3): V3 => add(base, mv(body, mul(v, s)));
  const neckK = ex.neck ?? 0;
  // el cuello sale del pecho y sube; con neck -1 la cabeza va baja (echada), con 1 al cielo (el rugido)
  const n0: V3 = [30, 46, 0], n1: V3 = [42 + neckK * -2, 58 + neckK * 10 - lie * 6, 0], hc: V3 = [52 + neckK * -6 - curl * 30, 68 + neckK * 16 - lie * 14 - curl * 18, curl * 26];
  const head = P(hc);
  const pitch = -neckK * 34 + lie * 10 + (ex.headPitch ?? 0);
  const hm: M3 = mm(body, mm(rotY(curl * 140), rotZ(-pitch)));
  const jaw = ex.jaw ?? 0;
  const mouth = add(head, mv(hm, mul([17, -4 - jaw * 2, 0], s)));
  // la cola: seis puntos que barren con `tail` (grados) y se enroscan con curl
  const tail: V3[] = [];
  const ta = ((ex.tail ?? 0) * Math.PI) / 180;
  for (let k = 0; k <= 6; k++) {
    const t = k / 6, a = ta * t * 1.2 + curl * t * 3.4;
    const rr = 30 + t * 50 * (1 - curl * 0.45);
    tail.push(P([-Math.cos(a) * rr + (k ? 0 : 0), 30 - t * 22 - lie * 4 * t, Math.sin(a) * rr]));
  }
  // las patas: adelante en x 22, atrás en x -24; el paso con ph (diagonales juntas)
  const ph = ex.ph ?? 0, step = ex.step ?? 0;
  const legs = ([[22, 1, 0], [22, -1, Math.PI], [-24, 1, Math.PI], [-24, -1, 0]] as [number, number, number][]).map(([x, z, o], i) => {
    const front = x > 0;
    const sw = Math.sin(ph + o) * step, lift = Math.max(0, Math.cos(ph + o)) * step;
    let footL: V3 = [x + sw * 9, lift * 7, z * 18];
    // el zarpazo: la pata de adelante cercana sube y baja delante
    if (i === 0) { const c = ex.claw ?? 0, w = ex.swipe ?? 0; footL = [x + c * 8 + w * 16, c * 24 * (1 - w) + lift * 7, z * (18 - w * 6)]; }
    if (lie > 0) footL = [footL[0] + (front ? 8 : -6) * lie, footL[1] * (1 - lie), footL[2] + z * 6 * lie];
    if (curl > 0) footL = [footL[0] * (1 - curl * 0.5), footL[1], footL[2] * (1 - curl * 0.3)];
    const hip = P([x, 34 - lie * 10, z * 12]), foot = P(footL);
    const knee = add(mul(add(hip, foot), 0.5), mv(body, mul([front ? 6 : -7, 2 + lie * 4, z * 2], s)));
    return { hip, knee, foot, front, z };
  });
  return { s, P, body, head, hm, mouth, neck: [P(n0), P(n1)], tail, legs };
}

function dragonaScene(cell: number, pose: BossPose, sec?: Secondary): BossScene {
  const ex = pose.extra ?? {};
  const sk = skeleton(cell, pose), s = sk.s, P = sk.P, body = sk.body;
  const S = (v: V3): V3 => mul(v, s);
  const B = new Body();
  const lie = ex.lie ?? 0, jaw = ex.jaw ?? 0, chains = ex.chains ?? 0;
  // ---------- el cuerpo: lomo, pecho y cadera; la panza de placas claras ----------
  B.ell(P([0, 36 - lie * 10, 0]), S([32, 19, 18]), 'scale', 1, { rot: body, bump: 0.8 * s });
  B.ell(P([22, 38 - lie * 10, 0]), S([17, 18, 16]), 'scale', 1, { rot: body, bump: 0.8 * s });
  B.ell(P([-22, 34 - lie * 10, 0]), S([16, 16, 16]), 'scale', 1, { rot: body, bump: 0.8 * s });
  B.ell(P([10, 26 - lie * 10, 0]), S([26, 10, 13]), 'belly', 2, { rot: body });
  B.ell(P([26, 34 - lie * 10, 0]), S([9, 14, 11]), 'belly', 2, { rot: mm(body, rotZ(-20)) });
  // las brasas en las juntas del lomo (placas dorsales que brillan)
  for (let k = 0; k < 7; k++) { const x = 26 - k * 9; B.ell(P([x, 54 - Math.abs(k - 3) * 1.6 - lie * 10, 0]), S([3.6, 3.4 + (k % 2), 2]), 'ember', 3, { rot: body }); }
  for (const z of [-1, 1]) for (let k = 0; k < 4; k++) B.ell(P([18 - k * 12, 40 - lie * 10, z * 17]), S([3, 2, 1.4]), 'ember', 3, { rot: body });
  // ---------- las alas plegadas sobre el lomo ----------
  for (const z of [-1, 1]) {
    const w0 = P([14, 50 - lie * 10, z * 12]), w1 = P([-6, 60 - lie * 10, z * 16]), w2 = P([-26, 50 - lie * 10, z * 18]);
    B.chain([w0, w1, w2], [3, 2.4, 1.6].map((v) => v * s), 'wing', 4 + (z > 0 ? 1 : 0));
    B.ell(P([-6, 46 - lie * 10, z * 17]), S([18, 10, 2.6]), 'wing', 4 + (z > 0 ? 1 : 0), { rot: mm(body, rotX(z * 12)) });
  }
  // ---------- el cuello y la cabeza ----------
  B.chain([P([26, 42 - lie * 10, 0]), sk.neck[1], sk.head], [12, 9.6, 8].map((v) => v * s), 'scale', 6, { bump: 0.5 * s });
  const H = (v: V3): V3 => add(sk.head, mv(sk.hm, S(v)));
  B.ell(sk.head, S([15, 13, 13]), 'scale', 7, { rot: sk.hm, bump: 0.4 * s });
  // el hocico largo y redondeado con la boca (una línea; abierta se ve el fuego adentro)
  B.ell(H([13, -2.6, 0]), S([11, 7.4, 9]), 'scale', 7, { rot: sk.hm });
  B.ell(H([13, -8 - jaw * 4, 0]), S([8, 2.6, 6.6]), 'belly', 8, { rot: mm(sk.hm, rotZ(-jaw * 20)) });
  if (jaw > 0.08) B.ell(H([16, -5.6 - jaw * 2, 0]), S([4.6, 1 + jaw * 3, 5]), 'mouthIn', 9, { rot: sk.hm });
  for (const z of [-1, 1]) B.ell(H([21, 0.4, z * 3]), S([1.2, 1, 1.2]), 'pupil', 10, { rot: sk.hm });
  // los ojos grandes ámbar con el párpado de arriba caído (más triste que mala) y su brillo
  const eyes = ex.eyes ?? 1, happy = ex.happy ?? 0;
  for (const z of [-1, 1]) {
    const e = H([8.6, 4.6, z * 8.4]);
    if (eyes > 0.4 && happy < 0.5) {
      B.ell(e, S([4.6, 6.8, 5.6]), 'eyeA', 11, { rot: sk.hm });
      B.ell(add(e, mv(sk.hm, S([3.4, -0.6, z * 0.6]))), S([1.8, 4.6, 2.8]), 'pupil', 12, { rot: sk.hm });
      B.ell(add(e, mv(sk.hm, S([4.2, 2.2, z * 1.6 - 0.6]))), S([1.2, 1.4, 1.2]), 'glint', 13, { rot: sk.hm });
      // el párpado de arriba, apenas caído (más triste que mala)
      B.ell(add(e, mv(sk.hm, S([0.8, 5.8, 0]))), S([4.8, 2, 6]), 'lid', 14, { rot: mm(sk.hm, rotX(z * -10)) });
    } else B.ell(add(e, mv(sk.hm, S([0.8, happy > 0.5 ? 0.8 : -0.4, 0]))), S([2.6, 1, 4.4]), 'lid', 11, { rot: sk.hm });
  }
  // los cuernos para atrás y las crestas de las mejillas
  for (const z of [-1, 1]) {
    B.chain([H([-4, 8, z * 6]), H([-12, 12, z * 8]), H([-20, 12, z * 9])], [3.4, 2.2, 0.8].map((v) => v * s), 'horn', 15);
    B.cone(H([-2, -2, z * 10]), H([-10, -4, z * 13]), 2.4 * s, 0.6 * s, 'horn', 16);
  }
  // ---------- la cola: seis gajos que se angostan, con brasas y la punta de flecha redonda ----------
  B.chain([P([-30, 34 - lie * 10, 0]), ...sk.tail], [13, 11, 9, 7.4, 6, 4.6, 3.4, 2].map((v) => v * s), 'scale', 17, { bump: 0.5 * s });
  for (let k = 1; k < 6; k++) B.ell(add(sk.tail[k], [0, (9 - k) * s, 0]), S([2.4, 2, 1.6]), 'ember', 18);
  B.ell(sk.tail[6], S([5.4, 2.4, 4.4]), 'horn', 19, { rot: body });
  // ---------- las patas: muslo, pata y el pie con tres garras romas ----------
  sk.legs.forEach((L, i) => {
    const g = 20 + i * 2;
    B.cone(L.hip, L.knee, 9 * s, 7 * s, 'scale', g, { bump: 0.4 * s });
    B.cone(L.knee, L.foot, 6.6 * s, 5.4 * s, 'scale', g);
    B.ell(add(L.foot, mv(body, S([3, 2, 0]))), S([8, 4, 7]), 'scale', g + 1, { rot: body });
    for (const dz of [-3, 0, 3]) B.ell(add(L.foot, mv(body, S([10, 0.6, dz]))), S([2.6, 1.6, 1.4]), 'horn', g + 1, { rot: body });
    // los grilletes de las patas de adelante, con su cadena que se arrastra (o los pedazos rotos)
    if (L.front) {
      const a = add(L.foot, mv(body, S([0, 8, 0])));
      B.torus(a, 6.2 * s, 1.6 * s, 'iron', 40 + i, body);
      if (chains < 0.5) for (let q = 1; q <= 4; q++) B.ell(add(a, mv(body, S([-q * 6, -6 - q * 0.5, L.z * (2 + q)]))), S([2.6, 1.8, 2]), 'iron', 42 + i + (q % 2));
      else for (let q = 0; q < 3; q++) B.ell(add(a, mv(body, S([-8 - q * 7 - chains * 10, -6, L.z * (6 + q * 4)]))), S([2.2, 1.6, 1.8]), 'iron', 44 + i);
    }
  });
  // el grillete del cuello y la cadena gruesa que baja (rota al liberarse)
  const nc = add(mul(add(sk.neck[0], sk.neck[1]), 0.5), mv(body, S([0, 0, 0])));
  if (chains < 0.9) B.torus(nc, 11 * s, 2 * s, 'iron', 48, mm(body, rotZ(50)));
  if (chains < 0.5) for (let q = 1; q <= 5; q++) B.ell(add(nc, [q * 3 * s, -q * 7 * s, 0]), S([3, 2.2, 2.4]), 'iron', 49 + (q % 2));
  else if (chains < 1) for (let q = 0; q < 4; q++) B.ell(add(nc, [Math.cos(q * 1.6) * (14 + chains * 18) * s, (4 - chains * 16) * s, Math.sin(q * 1.6) * (14 + chains * 18) * s]), S([3, 2, 2.4]), 'iron', 51);
  // ---------- el chorro de fuego del aliento ----------
  const breath = ex.breath ?? 0;
  if (breath > 0.02) {
    const dir = mv(sk.hm, [1, -0.35, 0]);
    for (let q = 0; q < 6; q++) {
      const t = (q + 1) / 6, d = t * 9 * breath;
      const c = add(sk.mouth, mul(dir, d * s));
      B.ell([c[0], Math.max(c[1], 3 * s), c[2]], S([3.4 + t * 4, 2.6 + t * 3, 3.4 + t * 4]), 'fire', 60 + (q % 2));
    }
  }
  void sec;
  return { pieces: B.pieces, materials: materials(ex), smooth: { 1: 7 * s, 2: 3 * s, 6: 4 * s, 7: 3 * s, 17: 3 * s } };
}

// ---------------------------------------------------------------- animaciones

const k = (f: number, pose: BossPose, ease: BossKey['ease'] = 'linear'): BossKey => ({ f, pose, ease });
const cyc = (n: number, f: number, ph = 0) => Math.sin((f / n) * Math.PI * 2 + ph);
const D0 = (extra: Record<string, number> = {}, root: BossPose['root'] = {}): BossPose => ({
  root, arms: { near: { pitch: 0, elbow: 0 }, far: { pitch: 0, elbow: 0 } }, legs: { near: { x: 0, y: 0 }, far: { x: 0, y: 0 } },
  extra: { ph: 0, step: 0, neck: 0, jaw: 0, chest: 0, tail: 0, claw: 0, swipe: 0, breath: 0, flame: 0, grey: 0, lie: 0, chains: 0, gold: 0, small: 1, curl: 0, eyes: 1, happy: 0, headPitch: 0, ...extra },
});

function dragonaAnims(): BossAnimDef[] {
  // respira: el pecho brilla con cada respiro y las cadenas pesan
  const idle: BossAnimDef = { name: 'idle', fps: 5, loop: true, frames: 8, keys: Array.from({ length: 8 }, (_, f) => k(f, D0({ chest: 0.25 + 0.35 * (0.5 + 0.5 * cyc(8, f)), neck: -0.1 + cyc(8, f) * 0.06, tail: cyc(8, f, 1) * 8, eyes: f === 6 ? 0 : 1 }, { y: cyc(8, f) * 0.8 }))) };
  // pasos pesados, arrastrando las cadenas
  const n = 8;
  const walk: BossAnimDef = {
    name: 'walk', fps: 6, loop: true, frames: n, stride: 26,
    keys: Array.from({ length: n }, (_, f) => k(f, D0({ ph: (f / n) * Math.PI * 2, step: 1, neck: -0.15 + Math.abs(cyc(n, f)) * 0.06, tail: -cyc(n, f) * 12, chest: 0.3 }, { y: -Math.abs(cyc(n, f)) * 1.4, roll: cyc(n, f) * 2 }))),
    events: [{ type: 'paso', frame: 0, foot: 'near' }, { type: 'paso', frame: 4, foot: 'far' }],
  };
  // el zarpazo: levanta la pata de adelante bien alto (6 de aviso que tiemblan) y la baja delante
  const CLAW_UP = D0({ claw: 1, neck: 0.15, chest: 0.5, tail: 10 }, { lean: -6, x: -2 });
  const CLAW_DN = D0({ claw: 1, swipe: 1, neck: -0.25, chest: 0.4, tail: -6 }, { lean: 10, x: 4 });
  const attack: BossAnimDef = {
    name: 'attack', fps: 10, loop: false, frames: 12, windup: [1, 6], shake: 1,
    keys: [k(0, D0()), k(2, CLAW_UP, 'out'), k(6, D0({ claw: 1, neck: 0.2, chest: 0.6, tail: 12 }, { lean: -8, x: -3 })), k(8, CLAW_DN, 'in'), k(9, D0({ claw: 0.9, swipe: 1, neck: -0.25 }, { lean: 11, x: 5, y: -1 })), k(11, D0(), 'ease')],
    events: [{ type: 'impacto', frame: 8 }],
  };
  // el coletazo: se agacha y gira (6 de aviso, la cola se va al otro lado) y barre medio círculo detrás, con un saltito
  const coletazo: BossAnimDef = {
    name: 'coletazo', fps: 10, loop: false, frames: 14, windup: [1, 6], shake: 0.8,
    keys: [k(0, D0()), k(2, D0({ tail: -70, neck: -0.2, chest: 0.4 }, { y: -3, yaw: 20 }), 'out'), k(6, D0({ tail: -80, neck: -0.25, chest: 0.5 }, { y: -4, yaw: 26 })), k(8, D0({ tail: 30, neck: 0 }, { y: -1, yaw: -10 }), 'in'), k(10, D0({ tail: 80, neck: 0.05 }, { y: -2, yaw: -24 })), k(13, D0(), 'ease')],
    events: [{ type: 'despegue', frame: 7 }, { type: 'impacto', frame: 9 }, { type: 'aterriza', frame: 10 }],
    rise: [0, 0, 0, 0, 0, 0, 0, 2, 6, 6, 2, 0, 0, 0],
  };
  // el aliento: toma aire con el pecho al rojo (8 cuadros que tiemblan, la boca cerrada y brillando) y echa el chorro
  const INHALE = (t: number) => D0({ chest: 0.4 + t * 0.6, neck: 0.25 + t * 0.15, jaw: 0, tail: 14 }, { lean: -6 - t * 4, x: -3 });
  const BLOW = (b: number, f: number) => D0({ chest: 1, neck: -0.2, jaw: 1, breath: b, tail: -8 + (f % 2) * 4 }, { lean: 8, x: 3 });
  const aliento: BossAnimDef = {
    name: 'aliento', fps: 10, loop: false, frames: 18, windup: [1, 8], shake: 0.8,
    keys: [k(0, D0()), ...[1, 2, 3, 4, 5, 6, 7, 8].map((f) => k(f, INHALE(f / 8), f === 1 ? 'out' : 'linear')), k(9, BLOW(0.5, 9), 'in'), ...[10, 11, 12, 13, 14].map((f) => k(f, BLOW(1, f))), k(15, BLOW(0.5, 15)), k(17, D0({ chest: 0.4 }), 'ease')],
    events: [{ type: 'grito', frame: 9 }, { type: 'impacto', frame: 10 }],
  };
  // encendida (fase 2, blindada): cubierta de llamas, en bucle; las llamas las pone el retoque
  const encendida: BossAnimDef = { name: 'encendida', fps: 8, loop: true, frames: 8, keys: Array.from({ length: 8 }, (_, f) => k(f, D0({ flame: 1, chest: 0.8 + 0.2 * cyc(8, f), neck: 0.05, tail: cyc(8, f) * 12 }, { y: cyc(8, f) * 0.8 }))) };
  // ruge al cielo y sale humo: llama a los hollines
  const ROAR = D0({ neck: 1, jaw: 0.9, chest: 0.7, tail: 18 }, { lean: -10, y: 2 });
  const warcry: BossAnimDef = {
    name: 'warcry', fps: 8, loop: false, frames: 12, windup: [1, 3],
    keys: [k(0, D0()), k(3, ROAR, 'out'), ...[4, 5, 6, 7, 8].map((f) => k(f, D0({ neck: 1, jaw: f % 2 ? 0.75 : 0.95, chest: 0.8, tail: 18 + (f % 2) * 4 }, { lean: -10, y: 2 + (f % 2) * 0.6 }))), k(11, D0(), 'ease')],
    events: [{ type: 'grito', frame: 3 }],
  };
  // apagada: echada en el piso humeando, las escamas grises, los ojos entrecerrados. Ahí se le pega
  const apagada: BossAnimDef = { name: 'apagada', fps: 5, loop: true, frames: 8, keys: Array.from({ length: 8 }, (_, f) => k(f, D0({ grey: 1, lie: 1, neck: -1, eyes: 0, tail: 30 + cyc(8, f) * 3, chest: 0 }, { y: cyc(8, f) * 0.5 }))) };
  const hit: BossAnimDef = { name: 'hit', fps: 12, loop: false, frames: 5, keys: [k(0, D0()), k(1, D0({ neck: 0.3, eyes: 0, tail: 20 }, { lean: -10, x: -5, y: -2 }), 'out'), k(2, D0({ neck: 0.35, eyes: 0, tail: 24 }, { lean: -12, x: -6, y: -2 })), k(4, D0(), 'ease')] };
  // se libera: tiembla, rompe las cadenas, el fuego pasa de rojo a dorado, se encoge y queda una dragoncita dorada
  // que ronronea enroscada
  const die: BossAnimDef = {
    name: 'die', fps: 8, loop: false, frames: 24,
    keys: [
      k(0, D0()),
      k(2, D0({ neck: 0.6, jaw: 0.4, chest: 0.9, tail: 20 }, { lean: -8, y: 1 }), 'out'),
      k(4, D0({ neck: 0.7, jaw: 0.6, chest: 1, tail: 24, chains: 0.4 }, { lean: -10, y: 2 })),
      k(5, D0({ neck: 0.5, jaw: 0.2, chest: 1, chains: 0.6 }, { lean: -6, y: 1 }), 'out'),
      k(8, D0({ neck: 0.3, chest: 0.8, chains: 1, gold: 0.3 }), 'ease'),
      k(12, D0({ neck: 0.1, chains: 1, gold: 1, small: 0.72, eyes: 1 }), 'ease'),
      k(16, D0({ neck: -0.3, chains: 1, gold: 1, small: 0.6, curl: 0.4, eyes: 0, happy: 1 }, { y: -2 }), 'ease'),
      k(19, D0({ neck: -0.5, chains: 1, gold: 1, small: 0.56, curl: 1, lie: 0.8, eyes: 0, happy: 1, tail: 10 }, { y: -2 }), 'ease'),
      k(21, D0({ neck: -0.45, chains: 1, gold: 1, small: 0.57, curl: 1, lie: 0.8, eyes: 0, happy: 1, tail: 14 }, { y: -1.4 })),
      k(23, D0({ neck: -0.5, chains: 1, gold: 1, small: 0.56, curl: 1, lie: 0.8, eyes: 0, happy: 1, tail: 10 }, { y: -2 })),
    ],
    events: [{ type: 'suelta', frame: 5 }],
  };
  return [idle, walk, attack, coletazo, aliento, encendida, warcry, apagada, hit, die];
}

/**
 * Retoque de cada cuadro: el halo naranja alrededor de las brasas y de la boca, las llamas que la cubren cuando está
 * encendida, el humo cuando está apagada (y al rugir), y al liberarse las chispas doradas que suben.
 */
function dragonaPost(r: Raster, anim: string, f: number) {
  const W = r.w, H = r.h;
  const a0 = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) a0[i] = r.data[i * 4 + 3] > 150 ? 1 : 0;
  // el rebote del fuego en los bordes de abajo y de la derecha
  if (anim !== 'apagada') for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (a0[y * W + x] && ((x + 1 < W && !a0[y * W + x + 1]) || (y + 1 < H && !a0[(y + 1) * W + x]))) put(r, x, y, anim === 'die' && f > 9 ? '#ffd060' : '#ff7020', 100);
  // el halo de lo que brilla (brasas, boca, chorro)
  const hot: number[] = [];
  for (let i = 0; i < W * H; i++) { const R = r.data[i * 4], G = r.data[i * 4 + 1], B = r.data[i * 4 + 2]; if (r.data[i * 4 + 3] && R > 240 && G > 130 && B < 150) hot.push(i); }
  for (const i of hot) { const x = i % W, y = Math.floor(i / W); for (const [dx, dy] of [[1, 0], [-1, 0], [0, -1], [0, 1]]) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < W && Y < H && !r.data[(Y * W + X) * 4 + 3]) put(r, X, Y, '#ff7020', 150); } }
  // encendida: lenguas de fuego que suben de todo el lomo (lo que tiene aire arriba)
  if (anim === 'encendida') {
    for (let x = 0; x < W; x++) {
      let top = -1;
      for (let y = 0; y < H; y++) if (a0[y * W + x]) { top = y; break; }
      if (top < 0) continue;
      const h = 4 + ((Math.sin(x * 0.7 + f * 1.4) + 1) * 3 + (Math.sin(x * 0.23 - f * 0.9) + 1) * 2.5);
      for (let t = 0; t < h; t++) { const k2 = t / h; put(r, x, top - t, k2 < 0.3 ? '#fff0a0' : k2 < 0.6 ? '#ffb040' : '#ff5a10', Math.round(255 * (1 - k2 * 0.7))); }
    }
  }
  // humo: apagada (todo el tiempo, bajito) y el rugido (sale de la boca, arriba)
  if (anim === 'apagada' || (anim === 'warcry' && f >= 4 && f <= 10)) {
    let cx = W / 2, cy = H / 2;
    if (anim === 'warcry') { for (let y = 0; y < H && cy === H / 2; y++) for (let x = 0; x < W; x++) if (a0[y * W + x]) { cx = x; cy = y; break; } }
    for (let i = 0; i < 26; i++) {
      const t = ((f * 3 + i * 5) % 14) / 14;
      const x = cx + (Math.sin(i * 2.3) * (anim === 'apagada' ? 40 : 10)) + Math.sin(t * 6 + i) * 3, y = (anim === 'apagada' ? cy + 4 : cy) - t * 30;
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) put(r, x + dx, y + dy, t < 0.5 ? '#9a928a' : '#6a625a', Math.round(150 * (1 - t)));
    }
  }
  // al liberarse: chispas doradas que suben
  if (anim === 'die' && f >= 6) for (let i = 0; i < 18; i++) { const t = ((f * 2 + i * 7) % 16) / 16; put(r, W / 2 + Math.sin(i * 1.9) * 34 + Math.sin(t * 5) * 3, H - 20 - t * 80, t < 0.4 ? '#fffae0' : '#ffd060', Math.round(240 * (1 - t))); }
}

function put(r: Raster, x: number, y: number, c: string, a = 255) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= r.w || y >= r.h) return;
  const k2 = (y * r.w + x) * 4, v = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  if (a >= 255 || !r.data[k2 + 3]) { r.data[k2] = v[0]; r.data[k2 + 1] = v[1]; r.data[k2 + 2] = v[2]; r.data[k2 + 3] = Math.max(a, r.data[k2 + 3]); return; }
  const t = a / 255;
  for (let i = 0; i < 3; i++) r.data[k2 + i] = Math.round(r.data[k2 + i] * (1 - t) + v[i] * t);
  r.data[k2 + 3] = Math.max(r.data[k2 + 3], a);
}

export const DRAGONA_SPEC: BossSpec = {
  id: 'dragona_brasa', cell: 128, dims: (cell) => bipedDims(cell * D_SCALE, BASE), elev: 26, anims: dragonaAnims(), post: dragonaPost,
  scene: (cell, pose, sec) => dragonaScene(cell, pose, sec),
  // el punto que pega: delante de la boca y las patas de adelante (el coletazo pega detrás: aviso_cola)
  strikePoint: (_j, d) => [48 * d.s, 8 * d.s, 0],
};

// ---------------------------------------------------------------- los avisos y efectos de la Dragona

const hash = (x: number, y: number, s: number) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/** `aviso_aliento` (32 x 32, 6 cuadros en bucle, capa suelo): se repite en línea donde va el fuego. Brasas que corren. */
export function breathWarning(): Raster[] {
  return Array.from({ length: 6 }, (_, f) => {
    const r = createRaster(32, 32);
    for (let x = 0; x < 32; x++) for (let y = 8; y <= 23; y++) {
      const edge = y === 8 || y === 23;
      if (edge) { if ((x + f * 3) % 8 < 5) put(r, x, y, '#ff7020', 230); }
      else put(r, x, y, '#3a0e06', Math.round(60 + 30 * Math.sin((x + f * 5) * 0.4)));
    }
    // chevrones que avanzan (hacia dónde va el fuego)
    for (let k2 = 0; k2 < 2; k2++) { const cx = (k2 * 16 + f * 32 / 6) % 32; for (let t = 0; t < 6; t++) { put(r, cx + t * 0.6, 15.5 - t, '#ffb040', 220); put(r, cx + t * 0.6, 15.5 + t, '#ffb040', 220); } }
    return r;
  });
}

/** `fuego_piso` (32 x 32, 8 cuadros en bucle): el piso ardiendo que queda después del aliento. Pega en línea. */
export function floorFire(): Raster[] {
  return Array.from({ length: 8 }, (_, f) => {
    const r = createRaster(32, 32);
    // la mancha quemada
    for (let y = 18; y < 30; y++) for (let x = 0; x < 32; x++) if (hash(x >> 1, y >> 1, 151) > 0.2) put(r, x, y, '#2a0c06', 160);
    // lenguas de fuego que bailan (pegan con la de al lado: la fase es por x)
    for (let x = 0; x < 32; x++) {
      const h = 6 + (Math.sin((x / 32) * Math.PI * 4 + f * 0.785) + 1) * 4 + (Math.sin((x / 32) * Math.PI * 2 - f * 0.785 * 2) + 1) * 2.4;
      for (let t = 0; t < h; t++) { const k2 = t / h; put(r, x, 27 - t, k2 < 0.25 ? '#fff0a0' : k2 < 0.55 ? '#ffb040' : k2 < 0.85 ? '#ff7020' : '#c04010', Math.round(250 * (1 - k2 * 0.6))); }
    }
    return r;
  });
}

/** `aviso_cola` (192 x 96, 8 cuadros, capa suelo): el medio círculo de atrás que va a barrer la cola. */
export function tailWarning(): Raster[] {
  return Array.from({ length: 8 }, (_, f) => {
    const r = createRaster(192, 96), t = (f + 1) / 8;
    for (let y = 0; y < 96; y++) for (let x = 0; x < 192; x++) {
      // medio círculo (la mitad de atrás, arriba en la hoja): centro abajo al medio
      const dx = (x + 0.5 - 96) / 92, dy = (y + 0.5 - 92) / 88, d = Math.hypot(dx, dy);
      if (d > 1 || dy > 0.02) continue;
      const ang = Math.atan2(-dy, dx) / Math.PI;
      if (d > 0.88 && 1 - ang < t + 0.02) put(r, x, y, f % 2 ? '#ffb040' : '#ff7020', 230);
      else if (d > 0.3) put(r, x, y, '#2a0a06', Math.round(30 + t * 90));
    }
    return r;
  });
}

/** `vapor_grande` (96 x 128, 10 cuadros): el chorro del surtidor que la apaga, con nubes que se abren arriba. */
export function bigSteam(): Raster[] {
  return Array.from({ length: 10 }, (_, f) => {
    const r = createRaster(96, 128), t = f / 9;
    const top = 124 - Math.min(1, (f + 1) / 3) * 110;
    // la columna de agua y vapor
    for (let y = Math.floor(top); y < 124; y++) { const hw = 10 + (124 - y) * 0.08 + Math.sin(y * 0.3 + f) * 2; for (let x = Math.floor(48 - hw); x <= 48 + hw; x++) { const u = (x - 48) / hw; if (hash(x, y + f * 7, 161) < t * 0.8) continue; put(r, x, y, Math.abs(u) < 0.4 ? '#e0f6ff' : '#9ad8ff', Math.round(230 * (1 - t * 0.5))); } }
    // las nubes que se abren arriba
    for (let i = 0; i < 12; i++) {
      const a = hash(i, 1, 163) * Math.PI * 2, d = hash(i, 2, 163) * (14 + t * 30), rr = 7 + hash(i, 3, 163) * 7 + t * 6;
      const cx = 48 + Math.cos(a) * d, cy = Math.max(rr, top + Math.sin(a) * d * 0.5 - t * 8);
      for (let y = Math.floor(cy - rr); y <= cy + rr; y++) for (let x = Math.floor(cx - rr); x <= cx + rr; x++) { const q = Math.hypot(x - cx, y - cy) / rr; if (q < 1) put(r, x, y, q < 0.5 && y < cy ? '#ffffff' : '#d8ecf8', Math.round((1 - q * 0.4) * 230 * (1 - t * 0.4))); }
    }
    return r;
  });
}

void rotX;
