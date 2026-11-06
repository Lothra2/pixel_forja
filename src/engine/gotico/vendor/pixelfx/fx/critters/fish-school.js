// The caustic light and the bubbles are adapted from Sprite Fusion's open-source bubbles
// (https://www.spritefusion.com/pixel-art-vfx/bubbles), MIT License, Copyright (c) 2026 Hugo Duprez.
import { fit, mix, clamp, wrap, lerp, smooth, ease, rng, cycle, TAU } from "../../core/index.js";
import { Grid, shift, bubble } from "./_lib.js";

export const meta = {
  name: "Fish school",
  desc: "A school of fish seen from above in 2:1 holds station in two depth rows: bodies wag into swinging tails, one darts ahead now and then, their shadows slide on the bed, bubbles rise and caustic light ripples over them.",
  tags: ["critter", "fish", "school", "sea", "underwater", "swim", "loop"],
  size: [136, 80],
  origin: [68, 40],
  duration: 4.8,
  loop: true,
  fps: 30,
  bg: "dark",
  options: {
    palette: ["#0a1a2a", "#123552", "#1d5a7e", "#2f8aa8", "#62bccc", "#bfe8e6", "#f4fff8"],
    stripe: ["#5a1e14", "#d8582a", "#ffa04a"],
    seed: 1,
  },
};

const D = meta.duration, GRID = new Grid(-34, -22, 68, 44);
// Forja: el cardumen se ve desde arriba en 2:1 (la cámara isométrica del juego mira el agua desde arriba): cada pez
// es un huso acostado en el plano del piso que nada en diagonal hacia abajo a la derecha (la dirección se del juego), la
// cola se mece de costado en ese plano y su sombra cae en el fondo, corrida hacia abajo.
// the school: [x, y, size, back row?, phase]
const SCHOOL = [
  [-34, -16, 0.72, true, 0.1], [2, -20, 0.68, true, 0.55], [30, -10, 0.7, true, 0.3],
  [-22, 4, 1, false, 0.8], [12, -4, 1, false, 0.2], [-40, -2, 0.95, false, 0.45], [26, 14, 0.96, false, 0.65],
];
/** rumbo en el piso: hacia abajo a la derecha de la pantalla (la dirección se del juego), así se ven el largo y el ancho */
const RUMBO = 0;
/** del piso a la pantalla 2:1 y de vuelta (unidades del mundo = px de pantalla a lo ancho / √2) */
const aPant = (fx, fy) => [fx - fy, (fx + fy) / 2];
const aPiso = (x, y) => [(x + 2 * y) / 2, (2 * y - x) / 2];

// one fish seen from above, its nose at (0, 0), heading hd on the floor plane, its body trailing back
function fish(g, C, Sp, s, t, ph, dart, hd) {
  g.clear();
  const L = 13 * s, Wd = 3.4 * s, beats = 12 + (dart > 0 ? 6 : 0), w = (t / D) * TAU * beats + ph * TAU;
  const amp = (1.5 + 1.3 * dart) * s, bend = (u) => amp * u ** 1.8 * Math.sin(w - 4 * u);
  const prof = (u) => (u < 0.3 ? Math.sqrt(Math.max(0, u) / 0.3) : 1 - ((u - 0.3) / 0.7) ** 1.5 * 0.78);
  const hw = (u) => Wd * prof(u), ch = Math.cos(hd), sh = Math.sin(hd);
  // pantalla -> a lo largo del rumbo (a) y de costado (l)
  const loc = (x, y) => { const [fx, fy] = aPiso(x, y); return [fx * ch + fy * sh, -fx * sh + fy * ch]; };
  const fuera = (a, l) => aPant(a * ch - l * sh, a * sh + l * ch);
  const TL = 5.5 * s, pf = Math.sin(w * 0.5);
  g.shade(-30, -20, 30, 20, (x, y, o) => {
    const [a, l] = loc(x, y), u = -a / L;
    if (u < 0 || u > 1 + TL / L) return 0;
    if (u > 1) {
      // la cola: una aleta en horquilla que sigue la onda del cuerpo
      const q = (u - 1) * (L / TL), c0 = bend(1) + amp * 1.8 * Math.sin(w - 4) * (u - 1) * 0.6, d = Math.abs(l - c0);
      if (d > 0.7 + 3.2 * s * q || (q > 0.55 && d < 1.6 * s * (q - 0.55) / 0.45)) return 0;
      o.a = 0.9;
      return l - c0 < 0 ? C[4] : C[3];
    }
    const dl = l - bend(u), h = hw(u), v = dl / h;
    if (Math.abs(v) > 1) {
      // aletas del pecho: dos paletas que reman a los costados
      const fin = u > 0.24 && u < 0.42 ? (1 - Math.abs(u - 0.33) / 0.09) * (1.8 + 0.8 * (v > 0 ? pf : -pf)) * s : 0;
      if (fin > 0 && Math.abs(dl) < h + fin) { o.a = 0.8; return C[4]; }
      return 0;
    }
    // el lomo oscuro al medio, la franja de color a los costados y los flancos que toman la luz (de arriba a la izquierda)
    if (Math.abs(v) < 0.3 && u > 0.06 && u < 0.92) return u < 0.18 ? C[1] : C[2];
    if (Math.abs(v) < 0.56 && u > 0.2 && u < 0.88) return Sp[v < 0 ? 2 : 1];
    if (u < 0.1) return C[3];
    return v < 0 ? (Math.abs(v) > 0.84 ? C[5] : C[4]) : C[3];
  });
  // los ojos a los costados de la cabeza
  for (const sd of [-1, 1]) { const [ex, ey] = fuera(-0.12 * L, sd * hw(0.12) * 0.9 + bend(0.12)); g.set(ex, ey, C[0]); if (sd < 0) g.set(ex + 1, ey, C[6]); }
  g.outline(C[0]);
}

// where a fish is: holding station in the current, swaying; one darts ahead and drifts back once a loop
function place(f, i, t) {
  const [bx, by, , , ph] = f, a = (t / D) * TAU;
  const dt = wrap(t - (i * 0.71 * D) % D, D), dart = i === 4 ? (dt < 0.25 ? ease.outCubic(dt / 0.25) : dt < 1.6 ? 1 - ease.inOutSine((dt - 0.25) / 1.35) : 0) : 0;
  return { x: bx + 3 * Math.sin(a + ph * TAU) + 8 * dart, y: by + 1.8 * Math.sin(2 * a + ph * 5), dart: i === 4 && dt < 0.6 ? 1 - dt / 0.6 : 0, hd: RUMBO + 0.16 * Math.sin(a + ph * 7) - 0.1 * dart };
}

// caustics: the light that comes down through rippling water, as bright crossing lines
function caustics(p, C, t) {
  const a = (t / D) * TAU;
  for (let y = -38; y < 38; y++)
    for (let x = -66; x < 66; x++) {
      const fall = clamp(1 - ((x / 64) ** 2 + (y / 34) ** 2)) * (0.6 + 0.4 * clamp(-y / 40 + 0.6));
      if (fall <= 0) continue;
      const u = x * 0.16 + 1.9 * Math.sin(y * 0.12 + a), v = y * 0.19 + 1.9 * Math.sin(x * 0.1 - a);
      const n1 = Math.sin(u) + Math.sin(v), sh = 0.75 + 0.25 * Math.sin(x * 0.05 - y * 0.04 + 2 * a);
      const f = Math.max(0, 1 - Math.abs(n1) * 5) * fall * sh;
      if (f > 0.55) p.light(x, y, C[4], 0.3);
      else if (f > 0.25) p.light(x, y, C[3], 0.14);
    }
}

export function draw(p, time, o) {
  const t = shift(time, D, o.seed), C = fit(o.palette, 7), Sp = fit(o.stripe, 3), g = GRID;
  // caustics on the bed first, then the shadows of the fish on it, then the fish (the deep row dimmed into the water)
  caustics(p, C, t);
  for (const back of [true, false])
    SCHOOL.forEach((f, i) => {
      if (f[3] !== back) return;
      const P = place(f, i, t);
      fish(g, C, Sp, f[2], t, f[4], P.dart, P.hd);
      g.recolor(() => C[0]);
      for (let k = 0; k < g.a.length; k++) g.a[k] = back ? 0.18 : 0.26;
      g.draw(p, 1, P.x + 2, P.y + (back ? 9 : 7));
    });
  for (const back of [true, false])
    SCHOOL.forEach((f, i) => {
      if (f[3] !== back) return;
      const P = place(f, i, t);
      fish(g, C, Sp, f[2], t, f[4], P.dart, P.hd);
      if (back) g.recolor((x, y, c) => mix(c, C[1], 0.42));
      g.draw(p, 1, P.x, P.y);
    });
  // bubbles let go from their mouths now and then and rise toward the surface (up the screen)
  cycle(t, D, 9, o.seed * 13 + 1, (r) => r.range(1.6, 2.6), (age, L, r, i) => {
    const f = SCHOOL[i % SCHOOL.length], P = place(f, i % SCHOOL.length, wrap(t - age, D)), rad = r.range(0.6, 1.6) * f[2];
    const ph = r.next() * TAU, x = P.x + 1 + Math.sin(age * (4 + 2 / rad) + ph) * (0.5 + rad * 0.7), y = P.y - 1 - (16 + 12 * rad) * age;
    if (y < -38) return;
    bubble(p, x, y, rad, [C[6], C[5], C[4], C[3]], Math.min(1, age * 4, (L - age) * 3, (y + 38) / 4));
  });
  p.glow(0, -4, 70, C[2], 0.16);
}
