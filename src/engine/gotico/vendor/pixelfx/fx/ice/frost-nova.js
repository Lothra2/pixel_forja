import { Particles, Bits, Lights, P, B, Rng, fit, crystal, band, flare, clamp, smooth, ease, rand, TAU, WHITE, READY, ISO } from "../../core/index.js";
// Forja: la nova se abre como un anillo en el piso isométrico (2:1), con los cristales alrededor del lanzador y
// la escarcha como un disco en el piso, en vez de una línea de perfil.

export const meta = {
  name: "Frost nova",
  desc: "Frost spirals into a spinning snowflake, then a wave blooms three rings of ice crystals round the caster; snow drifts, frost creeps, and the ice melts back into the floor.",
  tags: ["ice", "nova", "aoe", "frost", "magic", "one-shot"],
  size: [288, 192],
  origin: [144, 150],
  duration: 3.4,
  loop: false,
  fps: 30,
  bg: "ground",
  actor: 2,
  options: { palette: ["#151a3d", "#212f6b", "#2c58aa", "#3a8bd8", "#62c8f4", "#a6ecff", "#dcfbff", "#ffffff"], reach: 104, seed: 4 },
};

const HIGH = { turn: 1.15, crouch: 0, fx: -7, fy: -44, bx: 8, by: -44, ffx: -5, fbx: 6 };
const SLAM = { turn: 1.15, crouch: 8, lean: 3, fx: -9, fy: -8, bx: 11, by: -8, ffx: -8, fbx: 9 };
const EASE = { turn: 1, crouch: 2, fx: -8, fy: -17, bx: 9, by: -17, ffx: -4, fbx: 5 };
export const act = {
  target: { x: 76 },
  poses: [
    [-0.34, READY],
    [-0.04, { ...HIGH, crouch: 2, fy: -36, by: -36 }],
    [0.36, HIGH],
    [0.42, SLAM, "snap"],
    [0.9, { ...SLAM, crouch: 7 }],
    [1.9, { ...SLAM, crouch: 6 }],
    [2.6, EASE],
    [3.4, READY],
  ],
  hits: [
    { t: 0.42, stop: 0.1, shake: 0.26, amp: 2, target: false },
    { t: 0.66, push: 0.9, straw: 6, y: -10, skin: "ice", shiver: 1.7 },
    { t: 2.9, push: 0.2, straw: 0, flash: 0, skin: null },
  ],
  dust: [{ t: 0.42, x: 10, n: 5, dir: 1, c: "#d8f2ff" }, { t: 0.42, x: -10, n: 5, dir: -1, c: "#d8f2ff" }],
};

const CHARGE = 0.42, SPREAD = 0.62, HOLD = 1.95, MELT = 0.7, CORE_Y = -24;
// three rings of crystals: tall ones hugging the caster, smaller ones further out
const RINGS = [
  { q: [0.15, 0.24], h: [24, 32], w: [10, 13], n: 2, kids: 2 },
  { q: [0.36, 0.52], h: [13, 19], w: [7, 9], n: 3, kids: 1 },
  { q: [0.62, 0.9], h: [5, 10], w: [4, 6], n: 4, kids: 0 },
];

// frost on the floor (Forja: un disco 2:1 en el piso): costra blanca en el borde fresco, manchas de escarcha
// adentro y pelitos de hielo sueltos
function frost(p, C, fr, reach, a, edge) {
  const R = Math.max(12, fr + 1);
  for (let y = Math.floor(-R * ISO); y <= Math.ceil(R * ISO); y++)
    for (let x = Math.floor(-R); x <= Math.ceil(R); x++) {
      const d = Math.hypot(x + 0.5, (y + 0.5) / ISO);
      if (d > R) continue;
      const q = d / reach, k = clamp((a * 1.15 - q) / 0.15);
      if (k <= 0) continue;
      const h = rand(x, y * 7 + 3), fresh = edge > 0 && d > edge - 3;
      const patch = rand(Math.floor(x / 3), Math.floor(y / 2) + 50) * 0.6 + h * 0.4;
      // escarcha translúcida (sin trama) y pocas motas vivas
      if (fresh) p.dot(x, y, h < 0.4 ? WHITE : C[6], k);
      else {
        p.blend(x, y, patch > 0.6 ? C[5] : C[4], k * (0.08 + 0.26 * clamp((patch - 0.3) * 2)) * (1 - q * 0.5));
        if (h > 0.96 && patch > 0.55) p.dot(x, y, h > 0.985 ? WHITE : C[6], k * 0.9);
      }
      // pelitos de hielo de pie
      if (h > 0.985 && !fresh) {
        const tuft = Math.round((1 + rand(x, y, 5) * 2.5) * (1 - q * 0.6));
        for (let j = 1; j <= tuft; j++) p.dot(x, y - j, j === tuft ? WHITE : C[5], k);
      }
    }
}

// the snowflake the cold gathers into: six arms with side branches, spinning, pulsing
function snowflake(p, C, x, y, L, spin, k) {
  if (L < 0.8) return;
  for (let i = 0; i < 6; i++) {
    const a = spin + (i * TAU) / 6, ca = Math.cos(a), sa = Math.sin(a);
    for (let d = 0; d <= L; d += 0.5) p.dot(x + ca * d, y + sa * d, d < L * 0.4 ? WHITE : C[6], k + 0.2);
    if (L > 3)
      for (const s of [-1, 1]) {
        const bx = x + ca * L * 0.6, by = y + sa * L * 0.6, ba = a + s * 0.9;
        for (let d = 0; d <= L * 0.35; d += 0.5) p.dot(bx + Math.cos(ba) * d, by + Math.sin(ba) * d, C[5], k);
      }
  }
  p.px(x, y, WHITE);
  p.glow(x, y, 10 + L * 3, C[5], 0.35 + 0.5 * k);
}

export function create(o) {
  const C = fit(o.palette, 8), DIM = [C[0], C[0], C[1], C[2], C[3], C[4], C[5], C[6]], REACH = o.reach;
  // Forja: las astillas caen repartidas sobre el disco del piso, no sobre una línea
  const R = new Rng(o.seed), floor = (x) => (rand(Math.round(x), 91) * 2 - 1) * Math.sqrt(Math.max(0, REACH * REACH - x * x)) * ISO * 0.8;
  const ps = new Particles({ rng: R, ground: floor, sparks: [C[7], C[6], C[5], C[4]], haze: C[5] });
  const bits = new Bits({ ground: floor }), lights = new Lights();
  const front = (t) => (t < CHARGE ? 0 : REACH * (1 - Math.pow(1 - clamp((t - CHARGE) / SPREAD), 3)));
  const reachedAt = (d) => CHARGE + SPREAD * (1 - Math.cbrt(1 - Math.min(1, d / REACH)));
  // lay out the crystals (Forja: alrededor del lanzador, en tres anillos sobre el piso 2:1)
  const sites = [];
  RINGS.forEach((ring, ri) => {
    const n = ring.n * 3, a0 = R.range(0, TAU);
    for (let i = 0; i < n; i++) {
      const g = a0 + ((i + R.range(-0.3, 0.3)) * TAU) / n, q = R.range(ring.q[0], ring.q[1]), h = R.range(...ring.h), w = R.range(...ring.w);
      const side = Math.cos(g) < 0 ? -1 : 1, d = q * REACH, x = Math.cos(g) * d, y = Math.sin(g) * d * ISO;
      // los de atrás, más chicos: que no tapen al lanzador
      const hh = Math.sin(g) < -0.3 && ri === 0 ? h * 0.7 : h;
      const parts = [{ dx: 0, h: hh, w, lean: side * hh * R.range(0.1, 0.28) }];
      for (let k = 0; k < ring.kids; k++) {
        const s2 = k % 2 ? -side : side, kh = hh * R.range(0.4, 0.62);
        parts.unshift({ dx: s2 * R.range(0.3, 0.5) * w, h: kh, w: w * 0.62, lean: s2 * kh * R.range(0.35, 0.6) });
      }
      sites.push({ x, y, d, h: hh, back: y < 0, t0: reachedAt(d) + R.range(0, 0.03), up: false, parts, phase: R.next() });
    }
  });
  sites.sort((a, b) => a.y - b.y);
  let t = 0, released = false;
  const sink = (tt) => smooth(HOLD, HOLD + MELT, tt);

  const drawCrystals = (p, back) => {
    const m = sink(t);
    for (const s of sites) {
      if (!s.up || s.back !== back || m >= 1) continue;
      const g = ease.outBack(clamp((t - s.t0) / 0.1), 2.6), white = t < s.t0 + 0.03, sw = (((t - s.t0) * 0.7 + s.phase * 3) % 1.6) / 0.5;
      for (const q of s.parts)
        crystal(p, s.x + q.dx, s.y, q.h * g * (1 - m), q.w * (1 - m * 0.3), q.lean * g * (1 - m), s.y < -REACH * 0.2 ? DIM : C, { white, glint: sw <= 1 ? sw : -1 });
    }
  };
  const ring = (p, back) => {
    if (t < CHARGE) return;
    const u = clamp((t - CHARGE) / (SPREAD + 0.15));
    if (u >= 1) return;
    band(p, 0, 0, front(t) + 2, ISO, Math.max(2, 10 * Math.pow(1 - u, 0.7)), u < 0.75 ? 1 : (1 - u) / 0.25, C, (g) => Math.sin(g) < 0 === back, t - CHARGE < 0.1);
    if (!back) for (let i = 0; i < 6; i++) { const g = (i / 6) * TAU + 0.5; p.glow(Math.cos(g) * (front(t) + 2), Math.sin(g) * (front(t) + 2) * ISO - 2, 20, C[5], 0.3 * (1 - u)); }
  };

  return {
    update(dt) {
      t += dt;
      if (t < CHARGE - 0.06) {
        // the cold gathers: streaks spiral in to the core, vapour slides in along the floor
        if (R.chance(0.9)) {
          const a = R.range(0, TAU), D = R.range(26, 58), T = R.range(0.2, 0.3), v = (D * 3) / (Math.exp(3 * T) - 1);
          const x = Math.cos(a) * D, y = Math.min(CORE_Y + Math.sin(a) * D * 0.8, -2), l = Math.hypot(x, y - CORE_Y) || 1;
          ps.spawn(P.STREAK, x, y, (-x / l) * v, ((CORE_Y - y) / l) * v, T, R.chance(0.5) ? C[6] : C[5]);
        }
        if (R.chance(0.14)) {
          const s = R.sign();
          ps.spawn(P.VAPOUR, s * R.range(28, 60), -R.range(0, 2), -s * R.range(35, 70), -R.range(0, 3), R.range(0.35, 0.5), C[6], R.range(2, 3));
        }
      }
      if (t >= CHARGE && !released) {
        released = true;
        lights.add(0, CORE_Y, 84, C[4], 0.8, 0.55);
        lights.add(0, CORE_Y, 45, WHITE, 0.7, 0.12);
        for (let i = 0; i < 22; i++) {
          const a = R.range(-Math.PI, 0.25), sp = R.range(110, 280);
          bits.add({ kind: B.SHARD, x: R.range(-3, 3), y: CORE_Y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.7, drag: 0.6, bounce: 0.3, life: R.range(0.9, 1.5), a: R.range(0, TAU), va: R.range(-20, 20), s: R.range(1.5, 3.5), c: R.pick([C[7], C[6], C[5]]) });
        }
        for (let i = 0; i < 14; i++) {
          const a = R.range(-Math.PI, 0), sp = R.range(40, 160);
          ps.spawn(P.FLAKE, 0, CORE_Y, Math.cos(a) * sp, Math.sin(a) * sp, R.range(1.2, 1.8), R.chance(0.6) ? WHITE : C[6], R.range(0.5, 1.6));
        }
      }
      const fr = front(t);
      if (t > CHARGE && t < CHARGE + SPREAD)
        for (let v = 0; v < 2; v++) {
          const g = R.range(0, TAU), ca = Math.cos(g), sa = Math.sin(g);
          ps.spawn(P.VAPOUR, ca * fr + R.range(-2, 2), sa * fr * ISO - R.range(0, 5), ca * R.range(15, 75), sa * R.range(8, 38) - R.range(2, 15), R.range(0.6, 1), R.chance(0.7) ? C[6] : C[5], R.range(3, 5.5) * (1 - 0.4 * (fr / REACH)), 0, sa < 0 ? 4 : 0);
          if (R.chance(0.45)) ps.spawn(P.FLAKE, ca * fr, sa * fr * ISO - 2, ca * R.range(10, 45), -R.range(30, 85), R.range(1.1, 1.9), R.chance(0.5) ? WHITE : C[6], R.range(0.5, 1.2));
        }
      for (const s of sites) {
        if (!s.up && t >= s.t0) {
          s.up = true;
          // each crystal punches up with a spray of shards, a puff and a glint
          for (let i = 0; i < 2 + Math.round(s.h / 8); i++) {
            const a = -Math.PI / 2 + R.range(-1.3, 1.3), sp = R.range(60, 200) * (0.5 + s.h / 40);
            bits.add({ kind: B.SHARD, x: s.x + R.range(-3, 3), y: Math.min(0, s.y), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.8, drag: 0.6, bounce: 0.3, life: R.range(0.9, 1.6), a: R.range(0, TAU), va: R.range(-18, 18), s: R.range(1.5, 3), c: R.pick([C[7], C[6], C[5]]) });
          }
          ps.spawn(P.VAPOUR, s.x, s.y - 1, R.range(-30, 30), -R.range(2, 8), R.range(0.5, 0.9), C[6], R.range(2.5, 4), 0, s.back ? 4 : 0);
          if (s.h > 10) ps.spawn(P.STAR, s.x + R.range(-3, 3), s.y - R.range(4, s.h * 0.8), 0, -3, R.range(0.3, 0.6), C[6], R.range(1, 2.4));
        }
      }
      // while it holds: glints run over the crystals, snow drifts down
      if (t > CHARGE + 0.2 && t < HOLD + 0.2) {
        if (R.chance(0.5)) {
          const s = R.pick(sites);
          if (s.up) ps.spawn(P.STAR, s.x + R.range(-3, 3), s.y - R.range(2, s.h * 0.9), 0, -3, R.range(0.3, 0.6), R.chance(0.6) ? C[6] : WHITE, R.range(0.6, 2.2));
        }
        if (t < HOLD - 0.3 && R.chance(0.16)) ps.spawn(P.FLAKE, R.range(-1, 1) * fr, R.range(-1, 1) * fr * ISO - R.range(40, 90), R.range(-5, 5), R.range(3, 10), R.range(1.1, 1.5), R.chance(0.5) ? WHITE : C[6], R.range(0.5, 1.4));
      }
      // melting: drips run off the crystals, vapour lifts off the floor
      if (t > HOLD && t < HOLD + MELT) {
        if (R.chance(0.5)) {
          const s = R.pick(sites);
          if (s.y <= 0) bits.add({ kind: B.DRIP, x: s.x + R.range(-3, 3), y: s.y - R.range(3, s.h * 0.6 * (1 - sink(t))), vy: 10, g: 0.6, life: 1, c: C[5] });
        }
        if (R.chance(0.25)) ps.spawn(P.VAPOUR, R.range(-1, 1) * REACH * 0.8, R.range(-1, 1) * REACH * 0.4 - R.range(0, 3), R.range(-10, 10), -R.range(6, 16), R.range(0.6, 1), C[5], R.range(3, 5));
      }
      ps.update(dt);
      bits.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      const out = 1 - smooth(HOLD + 0.2, HOLD + MELT + 0.6, t), fr = front(t);
      if (out > 0 && t > CHARGE) frost(p, C, fr, REACH, out, t < CHARGE + SPREAD + 0.1 ? fr : 0);
      ring(p, true);
      drawCrystals(p, true);
      ps.draw(p, "back");
    },
    draw(p) {
      ring(p, false);
      drawCrystals(p, false);
      if (t < CHARGE) {
        const k = t / CHARGE, beat = 1 + 0.25 * Math.exp(-((t - CHARGE * 0.55) ** 2) / 0.002) + 0.3 * Math.exp(-((t - CHARGE * 0.85) ** 2) / 0.002);
        snowflake(p, C, 0, CORE_Y, (2 + 5.5 * k * k) * beat, t * 4, k);
      } else if (t < CHARGE + 0.22) {
        const a = (t - CHARGE) / 0.22;
        flare(p, 0, CORE_Y, 36 * Math.pow(1 - a, 1.5), 1 - a, C);
        p.glow(0, CORE_Y, 46, WHITE, 0.6 * (1 - a));
      }
      // the frosted floor gives off a cold light while the ice stands
      if (t > CHARGE) {
        const k = (1 - smooth(HOLD, HOLD + MELT + 0.3, t)) * (0.85 + 0.15 * Math.sin(t * 2.4)), fr = front(t);
        for (let i = 0; i < 8; i++) { const g = (i / 8) * TAU; p.glow(Math.cos(g) * fr * 0.6, Math.sin(g) * fr * 0.6 * ISO - 3, 24, C[4], 0.12 * k); }
      }
      bits.draw(p);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
