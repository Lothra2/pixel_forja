import { type V3, type M3, add, mul, norm, mv, mm, rotX, rotY, rotZ } from './sdf';
import { Body, lookRot } from './build';
import { bipedDims, type BossPose, type BossDims } from './rig';
import { makeBossRamp, type BossScene, type BossMaterial } from './render';
import type { BossAnimDef, BossKey } from './anim';
import type { BossSpec } from './sheet';
import type { Secondary } from './secondary';

/**
 * Las polillas del Mundo 3, con el mismo motor de volúmenes que los jefes.
 *
 * - `polilla_reina` (celda 128): el jefe. Cuerpo peludo, antenas de pluma, cuatro alas con ojos falsos y polvo que
 *   cae. Encantada en gris y violeta; libre (al final de `die`) en colores: ámbar, cian y rosa. `aturdida` es posada
 *   en el piso con las alas caídas (cuando los 4 cristales grandes están prendidos).
 * - `polilla_ceniza` (celda 48): la chica. Gris ceniza, alas con ojos falsos, polvo que cae. Vuela hacia la luz.
 *
 * Vuelan: el cuerpo no toca el piso. El pivote de la hoja es el punto del piso debajo de ellas (donde va la sombra).
 * La pose usa `extra`: `flap` (grados del aleteo, + arriba), `fold` (0 alas abiertas, 1 plegadas hacia atrás),
 * `hover` (altura del cuerpo sobre el piso, en pixeles de una celda de 128) y `dust` (cuánto polvo cae, 0 a 1).
 */

interface MothLook { body: string; fur: string; wing: string; wingDark: string; eye: string; eyeRing: string; glow: string[] }

const ASH: MothLook = { body: '#5a5660', fur: '#8a8590', wing: '#77737e', wingDark: '#45424c', eye: '#1c1a22', eyeRing: '#b0a8b8', glow: ['#3a3640', '#8a8590', '#d8d0e0'] };
const QUEEN_SPELL: MothLook = { body: '#4a4458', fur: '#7a7290', wing: '#6a6478', wingDark: '#3a3448', eye: '#2a1450', eyeRing: '#b07aff', glow: ['#4a1e7a', '#b07aff', '#f0dcff'] };
const QUEEN_FREE: MothLook = { body: '#6a4a3a', fur: '#e0b088', wing: '#e0802a', wingDark: '#1a7a8a', eye: '#1a3a5a', eyeRing: '#ff8ab0', glow: ['#1d6a66', '#5ae8ff', '#e0faff'] };

function materials(look: MothLook): Record<string, BossMaterial> {
  return {
    body: { ramp: makeBossRamp(look.body, 6, { spread: 1.1 }), surface: 'fur', tex: 0.8, scale: 1.2 },
    fur: { ramp: makeBossRamp(look.fur, 6, { spread: 1.05 }), surface: 'fur', tex: 0.9, scale: 1 },
    wing: { ramp: makeBossRamp(look.wing, 6, { spread: 1.15 }), surface: 'cloth', tex: 0.5, scale: 2.2, patch: { mat: 'wingDark', amount: 0.28, scale: 3 } },
    wingDark: { ramp: makeBossRamp(look.wingDark, 6, { spread: 1.1 }), surface: 'cloth', tex: 0.4, scale: 2 },
    eyeRing: { ramp: makeBossRamp(look.eyeRing, 5, { spread: 1.05 }), surface: 'cloth', tex: 0.2 },
    eyeSpot: { ramp: makeBossRamp(look.eye, 5), surface: 'cloth', tex: 0.1 },
    eyes: { ramp: ['#08060c', '#141020', '#2a2438'], surface: 'eye' },
    leg: { ramp: makeBossRamp('#3a3640', 5), surface: 'leather', tex: 0.3 },
    glow: { ramp: look.glow, surface: 'glow' },
    dust: { ramp: look.glow, surface: 'glow' },
  };
}

/** Mezcla dos looks (la reina pasa de encantada a libre al morir) */
function mixLook(a: MothLook, b: MothLook, t: number): MothLook {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const m = (x: string, y: string) => {
    const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const A = p(x), B = p(y);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
  };
  return { body: m(a.body, b.body), fur: m(a.fur, b.fur), wing: m(a.wing, b.wing), wingDark: m(a.wingDark, b.wingDark), eye: m(a.eye, b.eye), eyeRing: m(a.eyeRing, b.eyeRing), glow: a.glow.map((g, i) => m(g, b.glow[i])) };
}

/** Medidas del cuerpo (en pixeles de una celda de 128) */
const QUEEN = { span: 84, thorax: 12, abdomen: 19, head: 8, hover: 32 };
const ASH_M = { span: 84, thorax: 12, abdomen: 17, head: 8, hover: 36 };

function mothScene(cell: number, pose: BossPose, look: MothLook, M: typeof QUEEN): BossScene {
  const s = cell / 128;
  const S = (v: V3): V3 => mul(v, s);
  const B = new Body();
  const ex = pose.extra ?? {};
  const flap = ex.flap ?? 0, fold = ex.fold ?? 0, dust = ex.dust ?? 0, hover = (ex.hover ?? M.hover) + (pose.air ?? 0);
  const r = pose.root;
  // marco del cuerpo: rumbo (yaw), cabeceo (lean: + baja la cabeza) y alabeo (roll)
  const body: M3 = mm(mm(rotY(r.yaw ?? 0), rotZ(-(r.lean ?? 0))), rotX(r.roll ?? 0));
  const P = (v: V3): V3 => add([(r.x ?? 0) * s, hover * s + (r.y ?? 0) * s, (r.z ?? 0) * s], mv(body, S(v)));

  // ---------- cuerpo: tórax peludo, abdomen con anillos, cabeza con ojos grandes ----------
  B.ell(P([0, 0, 0]), S([M.thorax, M.thorax * 0.9, M.thorax * 0.85]), 'fur', 1, { rot: body, bump: 0.8 * s });
  const abd = mm(body, rotZ(18 - (ex.curl ?? 0)));
  const abdC = add(P([-M.thorax * 0.6, -2, 0]), mv(abd, S([-M.abdomen * 0.75, 0, 0])));
  B.ell(abdC, S([M.abdomen, M.abdomen * 0.5, M.abdomen * 0.48]), 'body', 1, { rot: abd, bump: 0.5 * s });
  for (let i = 1; i <= 3; i++) B.torus(add(abdC, mv(abd, S([M.abdomen * (0.55 - i * 0.32), 0, 0]))), M.abdomen * 0.46 * (1 - i * 0.1) * s, 1 * s, 'fur', 2, mm(abd, rotY(90)));
  // collar de pelo entre tórax y cabeza
  B.ell(P([M.thorax * 0.8, 1, 0]), S([4, M.thorax * 0.75, M.thorax * 0.8]), 'fur', 1, { rot: body, bump: 1 * s });
  const head = mm(body, rotZ(-(pose.head?.pitch ?? 0)));
  const hc = P([M.thorax + M.head * 0.6, 1, 0]);
  B.ell(hc, S([M.head, M.head * 0.9, M.head]), 'body', 3, { rot: head });
  const eyes = pose.face?.eyes ?? 'open';
  for (const z of [-1, 1]) {
    B.ell(add(hc, mv(head, S([M.head * 0.45, 1, z * M.head * 0.62]))), S([M.head * 0.42, M.head * 0.5, M.head * 0.4]), eyes === 'dizzy' ? 'body' : 'eyes', 4, { rot: head });
    if (eyes !== 'dizzy') B.ell(add(hc, mv(head, S([M.head * 0.72, 2.2, z * M.head * 0.72]))), S([0.9, 0.9, 0.9]), 'glow', 5);
    // antenas de pluma: un tallo curvo y barbas
    const base = add(hc, mv(head, S([M.head * 0.5, M.head * 0.8, z * M.head * 0.35])));
    const up = (ex.antenna ?? 0) * 10;
    const pts: V3[] = [base];
    for (let k = 1; k <= 4; k++) pts.push(add(base, mv(head, S([k * 3.2, k * (3.4 + up * 0.08) - k * k * 0.25, z * k * 2.4]))));
    B.chain(pts, [1.1, 0.95, 0.8, 0.6, 0.4].map((v) => v * s), 'fur', 6);
    for (let k = 1; k < 4; k++) B.ell(pts[k], S([1.6, 2.6, 1.6]), 'fur', 6, { rot: mm(head, rotZ(-30)) });
  }
  // seis patitas colgando
  for (const z of [-1, 1]) for (let k = 0; k < 3; k++) {
    const a = P([M.thorax * (0.4 - k * 0.45), -M.thorax * 0.6, z * M.thorax * 0.5]);
    const b = add(a, mv(body, S([2 - k * 3, -7 - (ex.legs ?? 0) * 4, z * 5])));
    B.cone(a, b, 1.1 * s, 0.6 * s, 'leg', 7);
  }

  // ---------- alas: anteriores grandes y posteriores chicas, con ojos falsos ----------
  const wing = (z: number, fore: boolean, g: number) => {
    const len = (fore ? M.span * 0.55 : M.span * 0.36) * (1 - fold * 0.25);
    const wid = fore ? M.span * 0.3 : M.span * 0.26;
    const fl = (fore ? flap : flap * 0.85 - 6) * (1 - fold * 0.7);
    const back = (fore ? 22 : 48) + fold * 55;
    // la dirección del ala: hacia afuera (z), un poco atrás, y arriba o abajo según el aleteo
    const dirLocal: V3 = norm([-Math.sin((back * Math.PI) / 180), Math.sin((fl * Math.PI) / 180), z * Math.cos((back * Math.PI) / 180) * Math.cos((fl * Math.PI) / 180)]);
    const dir = mv(body, dirLocal);
    const root = P([fore ? 1 : -4, M.thorax * 0.35, z * M.thorax * 0.6]);
    const up = mv(body, [0, 1, 0]);
    const rot = lookRot(dir, up);
    const c = add(root, mul(dir, len * 0.5 * s));
    // la lámina del ala: ancha, fina, con el borde redondeado
    B.ell(c, S([len * 0.55, 0.9, wid * 0.5]), 'wing', g, { rot: rot });
    // el borde oscuro y las venas
    B.ell(add(c, mul(dir, len * 0.18 * s)), S([len * 0.35, 1.0, wid * 0.32]), 'wingDark', g + 1, { rot: rot });
    // el ojo falso: anillo claro con centro oscuro, apoyado sobre la cara de arriba del ala
    const nrm = mv(rot, [0, 1, 0]);
    const eyeC = add(add(c, mul(dir, len * (fore ? 0.12 : 0.05) * s)), mul(nrm, 1.1 * s));
    const er = (fore ? 0.22 : 0.26) * wid;
    B.ell(eyeC, S([er, 0.5, er]), 'eyeRing', g + 2, { rot: rot });
    B.ell(add(eyeC, mul(nrm, 0.4 * s)), S([er * 0.55, 0.5, er * 0.55]), 'eyeSpot', g + 3, { rot: rot });
    if (pose.aura) B.ell(add(eyeC, mul(nrm, 0.8 * s)), S([er * 0.2, 0.4, er * 0.2]), 'glow', g + 4);
  };
  wing(1, false, 40); wing(1, true, 50); wing(-1, false, 60); wing(-1, true, 70);

  // ---------- polvo que cae de las alas ----------
  if (dust > 0.02) {
    const t = ex.t ?? 0;
    const n = Math.round(6 + dust * 14);
    for (let i = 0; i < n; i++) {
      const a = i * 2.39996, rr = (8 + (i % 4) * 7) * s;
      const h = (((i * 23 + t * 30) % 60) / 60);
      const y = (hover - 4 - h * hover) * s;
      if (y < 0) continue;
      const size = (0.9 + (i % 3) * 0.5) * s * Math.min(1, dust * 1.6);
      if (size < 0.45) continue;
      B.ell(add([(r.x ?? 0) * s + Math.cos(a) * rr, y, (r.z ?? 0) * s + Math.sin(a) * rr], [0, 0, 0]), [size, size, size], 'dust', 90 + i);
    }
  }
  return { pieces: B.pieces, materials: materials(look), smooth: { 1: 3 * s, 3: 1.5 * s } };
}

// ---------------------------------------------------------------- animaciones

const base = (extra: Record<string, number>, more: Partial<BossPose> = {}): BossPose => ({
  root: { lean: 4 }, arms: { near: { pitch: 0, elbow: 0 }, far: { pitch: 0, elbow: 0 } }, legs: { near: { x: 0, y: 0 }, far: { x: 0, y: 0 } },
  extra: { flap: 0, fold: 0, dust: 0.3, t: 0, ...extra }, ...more,
});
const k = (f: number, pose: BossPose, ease: BossKey['ease'] = 'linear'): BossKey => ({ f, pose, ease });

/** Un ciclo de aleteo: las alas bajan rápido (empujan) y suben más lento. */
function flapCycle(n: number, amp: number, mid: number, ph = 0): number[] {
  return Array.from({ length: n }, (_, f) => { const t = ((f / n) + ph) % 1; return mid + amp * (t < 0.4 ? Math.cos((t / 0.4) * Math.PI) : -Math.cos(((t - 0.4) / 0.6) * Math.PI)); });
}

function mothAnims(queen: boolean): BossAnimDef[] {
  const idle: BossAnimDef = {
    name: 'idle', fps: 10, loop: true, frames: 8,
    keys: flapCycle(8, 34, 8).map((fl, f) => k(f, base({ flap: fl, hover: (queen ? QUEEN.hover : ASH_M.hover) + Math.sin((f / 8) * Math.PI * 2 - 1) * 3, dust: 0.4, t: f }))),
  };
  const walk: BossAnimDef = {
    name: 'walk', fps: 12, loop: true, frames: 8,
    keys: flapCycle(8, 38, 6).map((fl, f) => k(f, base({ flap: fl, hover: (queen ? QUEEN.hover : ASH_M.hover) + Math.sin((f / 8) * Math.PI * 2) * 2, dust: 0.35, t: f }, { root: { lean: 14 } }))),
    stride: 16,
  };
  // ataque: se echa atrás con las alas arriba, y un aletazo hacia adelante que empuja
  const attack: BossAnimDef = {
    name: 'attack', fps: 14, loop: false, frames: 7,
    keys: [
      k(0, base({ flap: 10, dust: 0.3 })),
      k(2, base({ flap: 60, dust: 0.3 }, { root: { x: -6, lean: -10 } }), 'out'),
      k(3, base({ flap: 64, dust: 0.3 }, { root: { x: -7, lean: -12 } })),
      k(4, base({ flap: -36, dust: 0.8 }, { root: { x: 8, lean: 22 } }), 'in'),
      k(6, base({ flap: 4, dust: 0.4 }, { root: { x: 0, lean: 6 } }), 'out'),
    ],
    events: [{ type: 'impacto', frame: 4 }],
  };
  const hit: BossAnimDef = {
    name: 'hit', fps: 12, loop: false, frames: 4,
    keys: [k(0, base({ flap: 20 })), k(1, base({ flap: 50, dust: 1 }, { root: { x: -6, lean: -16, roll: 14 }, face: { eyes: 'closed' } }), 'out'), k(3, base({ flap: 12 }), 'ease')],
  };
  // morir: la chica cae plegando las alas y se deshace en polvo; la reina se posa y se libera (las alas se colorean)
  const die: BossAnimDef = queen
    ? {
      name: 'die', fps: 8, loop: false, frames: 16,
      keys: [
        k(0, base({ flap: 30, dust: 0.6, hover: QUEEN.hover }, { aura: 1 })),
        k(3, base({ flap: 44, dust: 1, hover: QUEEN.hover + 2 }, { aura: 1, root: { lean: -8, roll: 8 }, face: { eyes: 'closed' } }), 'out'),
        k(7, base({ flap: -10, fold: 0.3, dust: 0.6, hover: 14 }, { aura: 0.5, root: { lean: 10 } }), 'ease'),
        k(10, base({ flap: 10, fold: 0.15, dust: 0.2, hover: 12, legs: 1 }, { aura: 0, freed: 0.6, root: { lean: 4 } }), 'ease'),
        k(13, base({ flap: 40, fold: 0, dust: 0, hover: 13, legs: 1, antenna: 1 }, { freed: 1, face: { eyes: 'open' } }), 'ease'),
        k(15, base({ flap: 28, fold: 0, dust: 0, hover: 13, legs: 1, antenna: 1 }, { freed: 1, face: { eyes: 'open' } }), 'ease'),
      ],
    }
    : {
      name: 'die', fps: 10, loop: false, frames: 8,
      keys: [
        k(0, base({ flap: 30, dust: 0.6 })),
        k(2, base({ flap: 56, dust: 1 }, { root: { lean: -10, roll: 20 }, face: { eyes: 'closed' } }), 'out'),
        k(5, base({ flap: 20, fold: 0.8, dust: 1, hover: 8 }, { root: { lean: 30, roll: 40 }, face: { eyes: 'dizzy' } }), 'in'),
        k(7, base({ flap: 0, fold: 1, dust: 0.2, hover: 3 }, { root: { lean: 10, roll: 70 }, face: { eyes: 'dizzy' } }), 'out'),
      ],
    };
  const out = [idle, walk, attack, hit, die];
  if (!queen) return out;
  // golpe fuerte: sube alto con las alas abiertas, aviso de 5 cuadros (se sostiene temblando) y una lluvia de polvo
  const heavy: BossAnimDef = {
    name: 'attack_heavy', fps: 12, loop: false, frames: 12,
    keys: [
      k(0, base({ flap: 10, dust: 0.4 })),
      k(3, base({ flap: 58, dust: 0.6, hover: QUEEN.hover + 5 }, { root: { lean: -14 }, aura: 1 }), 'out'),
      k(7, base({ flap: 62, dust: 0.7, hover: QUEEN.hover + 6 }, { root: { lean: -16 }, aura: 1 })),
      k(8, base({ flap: -36, dust: 1, hover: QUEEN.hover + 4 }, { root: { lean: 10 }, aura: 1 }), 'in'),
      k(9, base({ flap: 36, dust: 1, hover: QUEEN.hover + 4 }, { root: { lean: 4 }, aura: 1 })),
      k(11, base({ flap: 8, dust: 0.5 }), 'ease'),
    ],
    windup: [3, 7], shake: 1.5,
    events: [{ type: 'impacto', frame: 8 }, { type: 'suelta', frame: 8 }],
  };
  // grito: llama a las polillas. Alas bien abiertas que vibran y antenas para arriba
  const warcry: BossAnimDef = {
    name: 'warcry', fps: 10, loop: false, frames: 10,
    keys: [
      k(0, base({ flap: 10 })),
      k(3, base({ flap: 60, antenna: 1, dust: 0.8 }, { root: { lean: -12 }, aura: 1, face: { eyes: 'open' } }), 'out'),
      ...[4, 5, 6, 7].map((f) => k(f, base({ flap: 60 + (f % 2 ? 8 : -8), antenna: 1, dust: 0.9, t: f }, { root: { lean: -12 }, aura: 1 }))),
      k(9, base({ flap: 10 }), 'ease'),
    ],
    windup: [1, 4],
    events: [{ type: 'grito', frame: 4 }],
  };
  // aturdida: posada en el piso, alas caídas y abiertas, aletea despacio y sin fuerza
  const aturdida: BossAnimDef = {
    name: 'aturdida', fps: 6, loop: true, frames: 8,
    keys: Array.from({ length: 8 }, (_, f) => k(f, base({ flap: 4 + Math.max(0, Math.sin((f / 8) * Math.PI * 2)) * 16, fold: 0.1, hover: 15, legs: 1, dust: 0.1, t: f, antenna: -0.6 }, { root: { lean: 8 }, face: { eyes: 'dizzy' } }))),
  };
  return [...out, heavy, warcry, aturdida];
}

const dims = (cell: number): BossDims => bipedDims(cell, { hipH: 30, hipW: 8, legU: 14, legL: 14, foot: 6, spine: 20, shW: 14, armU: 12, armL: 12, hand: 5, neck: 4, head: 8 });

export const POLILLA_REINA_SPEC: BossSpec = {
  id: 'polilla_reina', cell: 128, dims, elev: 24, anims: mothAnims(true),
  scene: (cell: number, pose: BossPose, _sec?: Secondary) => mothScene(cell, pose, mixLook(QUEEN_SPELL, QUEEN_FREE, pose.freed ?? 0), QUEEN),
};

export const POLILLA_CENIZA_SPEC: BossSpec = {
  id: 'polilla_ceniza', cell: 48, dims, elev: 24, anims: mothAnims(false),
  scene: (cell: number, pose: BossPose, _sec?: Secondary) => mothScene(cell, pose, ASH, ASH_M),
};
