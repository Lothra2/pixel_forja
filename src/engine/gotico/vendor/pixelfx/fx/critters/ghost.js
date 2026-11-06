import { fit, clamp, wrap, lerp, rng, cycle, rand, TAU } from "../../core/index.js";
import { Grid, shift, shadow } from "./_lib.js";

export const meta = {
  name: "Ghost",
  desc: "A sheet ghost bobs over the floor: its scalloped hem ripples and trails its drift, little arms flutter, it glances about and blinks, motes trickle off its hem.",
  tags: ["critter", "ghost", "spirit", "undead", "spooky", "float", "loop"],
  size: [96, 100],
  origin: [48, 90],
  duration: 2.4,
  loop: true,
  fps: 30,
  bg: "ground",
  options: { palette: ["#10142a", "#232c52", "#3e4f86", "#6b84bb", "#a3b8e2", "#d8e4ff", "#ffffff"], hover: 14, seed: 1 },
};

const D = meta.duration, GRID = new Grid(-24, -48, 48, 60), R = 10.5;

// where the ghost is: a lazy drift side to side and a bob, both looping
function at(t, hover) {
  const a = (t / D) * TAU;
  return { x: 4 * Math.sin(a), y: -hover - 3 * Math.sin(2 * a + 0.8) };
}

// Forja: un espectro con capucha en punta y jirones abajo, en vez del fantasma de sábana redondo. La capucha sube a
// una punta, los hombros caen en una túnica que se abre, el ruedo se rompe en tiras de largo distinto que ondulan, y
// las mangas cuelgan en punta. La cara es un hueco negro con dos brasas frías.
const TOP = 2 * R + 14, HOOD = 12;
function halfW(h) {
  if (h > TOP || h < -1) return -1;
  if (h > TOP - HOOD) return Math.min(R * 0.82, (TOP - h) * 0.78 + 0.4);
  return lerp(R + 3, R * 0.82, (h / (TOP - HOOD)) ** 0.8);
}

function sheet(g, C, t, o, lagX) {
  g.clear();
  const top = TOP, ph = (t / D) * TAU * 2, HW = R + 3;
  // el cuerpo de abajo se queda atrás cuando el espectro se mueve
  const off = (h) => lagX * (1 - clamp(h / top)) ** 1.4;
  // jirones: tiras de 3 px con punta, de largo distinto, que ondulan una después de otra
  const NT = Math.ceil((2 * HW) / 3);
  const rag = (X) => {
    const j = clamp(Math.floor((X + HW) / 3), 0, NT - 1), u = (X + HW - j * 3 - 1.5) / 1.5;
    const L = 2 + 7 * rand(j, 41) + 1.6 * Math.sin(ph - j * 0.9);
    return { j, u, d: L * (1 - Math.abs(u)) };
  };
  const inside = (x, y) => {
    const h = -y, X = x - off(h);
    if (h < 0) {
      const hw0 = halfW(0);
      return Math.abs(X) <= hw0 && -h <= rag(X).d;
    }
    const hw = halfW(h);
    return hw >= 0 && Math.abs(X) <= hw;
  };
  // mangas que cuelgan en punta desde los hombros
  const arm = (x, y) => {
    for (const s of [-1, 1]) {
      const ax = s * (R * 0.8) + off(top - HOOD - 2), ay = -(top - HOOD - 2), bx = s * (R + 6) + off(8) + 1.2 * Math.sin(ph + s), by = -9 + 1.4 * Math.sin(ph + s * 1.3);
      const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy, k = clamp(((x - ax) * vx + (y - ay) * vy) / l2);
      const dx = x - (ax + vx * k), dy = y - (ay + vy * k);
      if (dx * dx + dy * dy <= (2.6 * (1 - k) + 0.3) ** 2) return true;
    }
    return false;
  };
  const any = (x, y) => inside(x, y) || arm(x, y);
  const lx = -9, ly = -top - 1;
  const lit = (x, y, k) => any(lx + (x - lx) / k, ly + (y - ly) / k);
  g.shade(-22, -top - 2, 22, 12, (x, y, o2) => {
    if (!any(x, y)) return 0;
    const h = -y, X = x - off(h);
    let i = lit(x, y, 0.62) ? 4 : 3;
    if (!any(x + 2.4, y + 1.8)) i = 2;
    if (!any(x + 1.2, y + 1) && X > 2) i = 1;
    // pliegues largos que bajan por la túnica
    if (h < top - HOOD && h > 0) for (const cx of [-5.5, -1.5, 3]) if (Math.abs(X - cx - 0.8 * Math.sin(ph + cx)) < 0.6) i = Math.min(i, 2);
    // los jirones, más oscuros y transparentes hacia la punta
    if (h < 1) { const r = rag(X); i = Math.min(i, r.u > 0 ? 2 : 3); o2.a = clamp(0.85 - (-h / Math.max(1, r.d + 1)) * 0.6); return C[i]; }
    o2.a = 0.92;
    return C[i];
  });
  return { inside, off, top };
}

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), C = fit(o.palette, 7), S = at(t, o.hover), lagX = at(t - 0.3, o.hover).x - S.x;
  const g = GRID;
  const sh = sheet(g, C, t, o, lagX), top = sh.top;
  // el hueco de la capucha: negro, con dos brasas frías adentro
  const fy = -top + HOOD * 0.62;
  for (let y = -4; y <= 4; y++) for (let x = -3; x <= 3; x++) if ((x / 3.2) ** 2 + (y / 4.2) ** 2 <= 1) g.set(x, Math.round(fy + y), C[0]);
  const parpadeo = 0.75 + 0.25 * Math.sin((t / D) * TAU * 3);
  g.set(-2, Math.round(fy - 0.5), C[parpadeo > 0.85 ? 6 : 5]);
  g.set(1, Math.round(fy - 0.5), C[parpadeo > 0.85 ? 6 : 5]);
  g.outline((x, y, nx, ny) => (ny > 0 ? C[2] : C[1]), 0.95);
  g.draw(p, 1, S.x, S.y);
  // motes trickle off the hem and fade as they sink and drift
  cycle(t, D, 12, o.seed * 3 + 1, (r) => r.range(1, 1.7), (age, L, r, i) => {
    const S0 = at(wrap(t - age, D), o.hover), k = age / L, x0 = S0.x + r.range(-10, 10), y0 = S0.y + 1.5;
    const x = x0 + Math.sin(age * 2.2 + i) * 2.4, y = y0 + r.range(5, 11) * age - 3 * age * age;
    const a = Math.min(1, k * 6) * Math.min(1, (1 - k) * 2.2), tw = 0.6 + 0.4 * Math.sin(age * 8 + i * 1.7);
    p.dot(x, y, tw > 0.8 ? C[6] : C[5], a);
    if (r.chance(0.3)) p.dot(x, y - 1, C[4], a * 0.7);
    p.glow(x, y, 7, C[4], 0.42 * a * tw);
  });
  // a cold glow round it
  p.glow(S.x, S.y - top * 0.55, 54, C[3], 0.3);
  p.glow(S.x - 3, S.y - top * 0.72, 14, C[5], 0.12);
}

export function drawBack(p, time, o) {
  const t = shift(time, D, o.seed), C = fit(o.palette, 7), S = at(t, o.hover), hgt = clamp((-S.y - 8) / 16);
  // its shadow on the floor, and the floor lit cold under it
  shadow(p, S.x, 0, 11 - 3 * hgt, 1.6, C[0], 0.55 - 0.2 * hgt);
  for (let x = -24; x <= 24; x += 6) p.glow(S.x + x, -1, 16, C[4], 0.14 * (1 - Math.abs(x) / 34) * (1 - 0.4 * hgt));
}
