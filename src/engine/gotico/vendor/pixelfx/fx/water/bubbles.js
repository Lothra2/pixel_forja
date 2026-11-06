// The bubble shading (a lit rim top-left, a shaded rim bottom-right, a see-through body, a highlight and a
// refraction fleck, 2x2 and 1 px forms when small) and the surface line are adapted from Sprite Fusion's
// open-source bubbles (https://www.spritefusion.com/pixel-art-vfx/bubbles), MIT License, Copyright (c) 2026 Hugo Duprez.
import { ISO, fit, cycle, clamp, smooth, rand, TAU, WHITE } from "../../core/index.js";
import { WATER, rock } from "./_lib.js";

export const meta = {
  name: "Bubbles",
  desc: "Bubbles stream up from a vent of pebbles, wobbling and swelling as they rise, flare as they cross shafts of light from the surface, then dome up and pop there.",
  tags: ["water", "bubbles", "underwater", "vent", "ambient", "loop"],
  size: [104, 112],
  origin: [52, 104],
  duration: 4,
  loop: true,
  fps: 30,
  bg: "ground",
  options: { palette: WATER, seed: 4 },
};

const D = meta.duration, TOP = -92, HALF = 48;

// the surface: a wavy lit line, a darker band under it
const surfaceY = (x, ph) => TOP + Math.sin(x * 0.13 + ph * TAU * 2) * 1.1 + Math.sin(x * 0.051 - ph * TAU) * 1.3;
// light shafts slanting down from the surface, drifting: how much of one a point is in
const shaft = (x, y, ph) => {
  const u = x + (y - TOP) * 0.32, s = Math.sin(u * 0.16 + ph * TAU) * 0.6 + Math.sin(u * 0.07 - ph * TAU + 1) * 0.4;
  return Math.max(0, s - 0.35) / 0.65;
};

// one bubble at (x, y), radius r, squash q: tiny ones a pixel or a shaded 2x2, bigger ones a lit rim round a
// see-through body with a highlight and a fleck of light refracted through it
function bubble(p, C, x, y, r, q, lit) {
  if (r < 0.9) return p.px(x, y, lit > 0.3 ? WHITE : r < 0.7 ? C[5] : C[6]);
  if (r < 1.5) {
    const X = Math.floor(x), Y = Math.floor(y);
    p.px(X, Y, WHITE);
    p.px(X + 1, Y, C[6]);
    p.px(X, Y + 1, C[5]);
    p.px(X + 1, Y + 1, C[4]);
    p.glow(x + 0.5, y + 0.5, 3, C[5], 0.12 + 0.2 * lit);
    return;
  }
  const rx = r * (1 + q), ry = r * (1 - q);
  p.shade(x - rx - 1, y - ry - 1, x + rx + 1, y + ry + 1, (px, py, out) => {
    const dx = (px - x) / rx, dy = (py - y) / ry, d = Math.hypot(dx, dy) * r;
    if (d > r + 0.5) return;
    const l = (-dx - dy) / Math.SQRT2 / Math.max(0.01, d / r);
    if (d > r - 0.6) out.c = l > 0.45 ? C[6] : l < -0.55 ? C[3] : C[4];
    else p.blend(px, py, C[5], 0.16 + 0.2 * lit);
  });
  p.px(Math.round(x - rx * 0.45), Math.round(y - ry * 0.45), WHITE);
  if (r >= 2.5) p.px(Math.round(x - rx * 0.45) + 1, Math.round(y - ry * 0.45), C[6]);
  if (r >= 2) p.px(Math.round(x + rx * 0.5), Math.round(y + ry * 0.5), C[6]);
  p.glow(x, y, r * 2.4 + 2, C[5], 0.12 + 0.3 * lit);
}

// the bubbles, from the vent's three mouths: each rises faster the bigger it is, swells as the pressure drops,
// wobbles side to side, and pops at the surface
const MOUTHS = [-5, 1, 6];
function each(t, S, fn) {
  cycle(t, D, 46, S, (g) => g.range(2.2, 3.4), (age, life, r, i) => {
    const m = MOUTHS[i % 3], r0 = r.next() < 0.7 ? r.range(0.5, 1.4) : r.range(1.6, 2.6), vy = 30 + 9 * r0 + r.range(-4, 4);
    const wf = r.range(3, 6), wa = 0.8 + r0 * 1.2, ph0 = r.range(0, TAU), drift = r.range(-4, 4);
    const y = -2 - vy * age, k = clamp(-y / -TOP), x = m + drift * k + Math.sin(age * wf + ph0) * wa * k;
    fn({ x, y, r: r0 * (1 + 0.45 * k), q: 0.12 * Math.sin(age * wf * 2 + ph0) * Math.min(1, r0 / 2), i, age, vy });
  });
}

// Forja: en la cámara isométrica no se ve el agua de costado. El efecto pasa a ser el burbujeo visto desde arriba:
// burbujas que asoman en la superficie de un charco, una ciénaga o un caldero, se hinchan, revientan con un destello
// y dejan un anillo 2:1 que se abre. El agua la pone el piso del juego.
export function drawBack() {}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), S = o.seed;
  cycle(t, D, 34, S, (g) => g.range(1.1, 1.9), (age, life, r) => {
    const g = r.range(0, TAU), d = Math.sqrt(r.next()) * 26, x = Math.cos(g) * d, y = Math.sin(g) * d * ISO, rb = r.range(0.9, 2.6);
    const u = age / life;
    if (u < 0.55) {
      // la cúpula que asoma y se hincha
      const k = u / 0.55, rr = rb * (0.4 + 0.6 * k);
      for (let a = Math.PI; a <= TAU + 0.01; a += 0.35 / Math.max(1, rr)) p.dot(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.9, C[4], 0.55 + 0.45 * k);
      p.dot(x + rr * 0.35, y - rr * 0.55, k > 0.6 ? C[6] : C[5], k);
      p.dot(x, y, C[2], 0.8);
    } else if (u < 0.62) {
      // revienta
      p.px(x, y - rb * 0.6, rb > 1.6 ? WHITE : C[6]);
      p.glow(x, y - 1, 4 + rb, C[5], 0.25);
    } else {
      // el anillo que se abre en la superficie y dos gotitas
      const k = (u - 0.62) / 0.38, w = rb + 1 + k * (4 + rb * 2);
      for (let a = 0; a < TAU; a += 0.5 / w) p.dot(x + Math.cos(a) * w, y + Math.sin(a) * w * ISO, k < 0.3 ? C[6] : C[5], (1 - k) * (Math.sin(a) > 0 ? 1 : 0.6));
      if (rb > 1.6 && k < 0.5) { p.dot(x - 2 - k * 3, y - 2 - k * 6 + k * k * 10, C[6], 1 - k); p.dot(x + 2 + k * 3, y - 3 - k * 7 + k * k * 12, C[6], 1 - k); }
    }
  });
}
