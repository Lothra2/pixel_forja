import { createRaster, type Raster } from '../core/raster';
import type { CellSize } from '../sheet/ficha';
import { rotSprite } from '../render/rotsprite';

/**
 * Poderes: efectos de pixel art generados con partículas, sin imágenes de nadie.
 * Cada efecto es una animación corta pensada para un RPG de acción visto desde arriba (isométrico):
 * los anillos y auras se aplastan 2:1 para quedar "en el piso".
 * Todo es determinista: la misma receta da los mismos pixeles.
 */

export type FxElement = 'fuego' | 'hielo' | 'rayo' | 'veneno' | 'sagrado' | 'sombra' | 'arcano' | 'sangre' | 'naturaleza';
export const FX_ELEMENTS: FxElement[] = ['fuego', 'hielo', 'rayo', 'veneno', 'sagrado', 'sombra', 'arcano', 'sangre', 'naturaleza'];

export type FxKind = 'projectile' | 'impact' | 'nova' | 'aura' | 'strike' | 'heal' | 'shield' | 'circle' | 'buff' | 'slash';
export const FX_KINDS: FxKind[] = ['projectile', 'impact', 'nova', 'aura', 'strike', 'heal', 'shield', 'circle', 'buff', 'slash'];

/** Rampa de 6 tonos, de oscuro (contorno) a núcleo brillante. */
export const FX_PALETTES: Record<FxElement, string[]> = {
  fuego: ['#3a0d0d', '#8c1c13', '#e0451b', '#ff9a1f', '#ffd34d', '#fff6c2'],
  hielo: ['#0c1f3a', '#1d4f8c', '#3a8ee0', '#7fd0ff', '#c8f1ff', '#ffffff'],
  rayo: ['#1a1440', '#3a3ab0', '#6f7cff', '#a8c4ff', '#e4f0ff', '#ffffff'],
  veneno: ['#0d2410', '#1f5a1a', '#3f9a24', '#8fd43a', '#d4ff7a', '#f4ffd0'],
  sagrado: ['#3a2a08', '#8c6a14', '#e0b43a', '#ffe07a', '#fff4c0', '#ffffff'],
  sombra: ['#0a0612', '#25123a', '#4d1f78', '#8a3ac4', '#c98aff', '#f0d8ff'],
  arcano: ['#120a2a', '#3a1a7a', '#7a3ae0', '#c060ff', '#ff9af0', '#ffffff'],
  sangre: ['#1a0408', '#5a0a14', '#a0162a', '#e03a4a', '#ff8a90', '#ffe0e0'],
  // verde esmeralda (más azulado que el veneno, que es lima) y se le agregan hojas y pétalos rosados
  naturaleza: ['#06201a', '#0f4f3a', '#1f9a5a', '#4fd88a', '#aaf5c0', '#f4fff0'],
};

const FRAMES: Record<FxKind, { n: number; loop: boolean; fps: number }> = {
  projectile: { n: 6, loop: true, fps: 14 },
  impact: { n: 8, loop: false, fps: 16 },
  nova: { n: 10, loop: false, fps: 16 },
  aura: { n: 8, loop: true, fps: 10 },
  strike: { n: 7, loop: false, fps: 14 },
  heal: { n: 8, loop: false, fps: 12 },
  shield: { n: 6, loop: true, fps: 10 },
  circle: { n: 8, loop: true, fps: 10 },
  buff: { n: 6, loop: false, fps: 12 },
  slash: { n: 5, loop: false, fps: 18 },
};

export interface FxSpec {
  kind: FxKind;
  element: FxElement;
  cell: CellSize;
  /** semilla: cambia la forma sin cambiar el estilo */
  seed?: number;
  /** contorno oscuro alrededor (se lee mejor sobre cualquier piso) */
  outline?: boolean;
}

export interface FxClip {
  name: string;
  fps: number;
  loop: boolean;
  cell: CellSize;
  frames: Raster[];
}

// ---------- utilidades ----------

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Lienzo de "calor": cada partícula suma intensidad; al final se pasa a la rampa de colores. */
class Heat {
  v: Float32Array;
  /** hojas y pétalos (naturaleza): se pintan encima, con forma propia */
  bits: { x: number; y: number; kind: 'petalo' | 'hoja'; a: number }[] = [];
  constructor(public w: number, public h: number) { this.v = new Float32Array(w * h); }
  add(x: number, y: number, a: number) {
    const xi = Math.round(x), yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= this.w || yi >= this.h) return;
    this.v[yi * this.w + xi] += a;
  }
  /** mancha redonda (o aplastada con sy) con caída suave hacia el borde */
  splat(cx: number, cy: number, r: number, a: number, sy = 1) {
    const ry = r * sy;
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
      for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
        const dx = (x - cx) / Math.max(0.5, r), dy = (y - cy) / Math.max(0.5, ry);
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 1) this.add(x, y, a * Math.pow(1 - d, 1.2));
      }
  }
  line(x0: number, y0: number, x1: number, y1: number, a: number, r = 0.6) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      this.splat(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, a);
    }
  }
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/** Pasa el calor a índices de la rampa (1..5) con un tramado chico en los bordes; 0 = vacío. */
function toIndex(h: Heat, outline: boolean): { w: number; h: number; idx: Int16Array } {
  const idx = new Int16Array(h.w * h.h).fill(-1);
  for (let y = 0; y < h.h; y++)
    for (let x = 0; x < h.w; x++) {
      const v = h.v[y * h.w + x];
      if (v <= 0.04) continue;
      const q = Math.min(5, v * 5.2 + (BAYER[(y & 3) * 4 + (x & 3)] - 0.5) * 0.9);
      if (q < 0.7) continue;
      idx[y * h.w + x] = Math.max(1, Math.min(5, Math.round(q)));
    }
  if (outline) {
    const src = new Int16Array(idx);
    for (let y = 0; y < h.h; y++)
      for (let x = 0; x < h.w; x++) {
        if (src[y * h.w + x] >= 0) continue;
        let near = false;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const xx = x + dx, yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < h.w && yy < h.h && src[yy * h.w + xx] >= 2) near = true;
        }
        if (near) idx[y * h.w + x] = 0;
      }
  }
  return { w: h.w, h: h.h, idx };
}

function paint(img: { w: number; h: number; idx: Int16Array }, pal: string[]): Raster {
  const r = createRaster(img.w, img.h);
  const rgb = pal.map((hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]);
  for (let i = 0; i < img.w * img.h; i++) {
    const v = img.idx[i];
    if (v < 0) continue;
    r.data.set([...rgb[v], 255], i * 4);
  }
  return r;
}

// ---------- efectos ----------

type Draw = (h: Heat, t: number, S: number, el: FxElement, rnd: () => number) => void;

/** forma del núcleo de un proyectil según el elemento */
function projectile(h: Heat, t: number, S: number, el: FxElement, rnd: () => number) {
  const cx = S * 0.62, cy = S * 0.5, r = S * 0.16;
  const flick = 1 + Math.sin(t * Math.PI * 2 * 2) * 0.12;
  if (el === 'hielo') {
    // esquirla: rombo alargado y brillos
    for (let i = -r * 1.6; i <= r * 1.6; i += 0.5) { const w = (1 - Math.abs(i) / (r * 1.6)) * r * 0.7; h.line(cx + i, cy - w, cx + i, cy + w, 0.9); }
    h.line(cx - r * 1.6, cy, cx + r * 1.7, cy, 1.1, 0.5);
    for (let k = 0; k < 5; k++) h.add(cx - r * (1.5 + rnd() * 2.5), cy + (rnd() - 0.5) * r * 1.6, 1);
  } else if (el === 'rayo') {
    // chispa: zigzag que cambia cada cuadro
    let x = cx - r * 2.4, y = cy;
    while (x < cx + r * 1.4) { const nx = x + 1.5 + rnd() * 2.5, ny = cy + (rnd() - 0.5) * r * 1.4; h.line(x, y, nx, ny, 1.0, 0.6); x = nx; y = ny; }
    h.splat(cx + r, cy, r * 0.8 * flick, 1.1);
  } else {
    h.splat(cx, cy, r * flick, 1.15);
    h.splat(cx, cy, r * 0.55, 0.6);
    // estela: partículas detrás, más chicas cuanto más lejos
    const n = el === 'veneno' ? 6 : 10;
    for (let k = 0; k < n; k++) {
      const back = r * (0.6 + rnd() * 2.6 + t * 0.6);
      const up = el === 'fuego' ? -rnd() * r * 0.8 : el === 'veneno' ? rnd() * r * 0.9 : (rnd() - 0.5) * r * 1.2;
      h.splat(cx - back, cy + up, Math.max(0.6, r * (0.55 - back / (S * 0.9))), 0.8);
    }
    if (el === 'arcano' || el === 'sombra') for (let k = 0; k < 3; k++) { const a = t * Math.PI * 2 + (k * Math.PI * 2) / 3; h.splat(cx + Math.cos(a) * r * 1.4, cy + Math.sin(a) * r * 1.4, 0.8, 1); }
    if (el === 'sagrado') { h.line(cx - r * 1.5, cy, cx + r * 1.5, cy, 0.7, 0.5); h.line(cx, cy - r * 1.5, cx, cy + r * 1.5, 0.7, 0.5); }
    if (el === 'naturaleza') {
      // dos hojas que giran alrededor de la semilla de luz y pétalos que se quedan atrás
      for (let k = 0; k < 2; k++) { const a = t * Math.PI * 2 + k * Math.PI; h.bits.push({ x: cx + Math.cos(a) * r * 1.5, y: cy + Math.sin(a) * r * 1.1, kind: 'hoja', a: a + Math.PI / 2 }); }
      for (let k = 0; k < 3; k++) h.bits.push({ x: cx - r * (1.6 + k * 1.3 + ((t * 3 + k) % 1) * 0.8), y: cy + Math.sin(t * Math.PI * 2 + k * 2) * r * 0.9, kind: 'petalo', a: t * 6 + k });
    }
  }
}

function impact(h: Heat, t: number, S: number, el: FxElement, rnd: () => number) {
  const cx = S / 2, cy = S * 0.55;
  if (t < 0.3) h.splat(cx, cy, S * (0.1 + t * 0.6), 1.3 - t);
  const n = 18;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rnd() * 0.3;
    const sp = S * (0.12 + t * 0.42) * (0.7 + rnd() * 0.5);
    const up = el === 'fuego' ? -t * S * 0.15 : el === 'veneno' ? t * S * 0.08 : 0;
    h.splat(cx + Math.cos(a) * sp, cy + Math.sin(a) * sp * 0.75 + up, Math.max(1, S * 0.09 * (1 - t * 0.8)), 1.3 - t * 0.8);
  }
  if (el === 'naturaleza') for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + 0.3, sp = S * (0.1 + t * 0.38);
    h.bits.push({ x: cx + Math.cos(a) * sp, y: cy + Math.sin(a) * sp * 0.75 + t * t * S * 0.12, kind: k % 3 ? 'petalo' : 'hoja', a: a + t * 4 });
  }
  // humo o restos al final
  if (t > 0.45 && el !== 'naturaleza') for (let k = 0; k < 7; k++) h.splat(cx + (rnd() - 0.5) * S * 0.5, cy - t * S * 0.2 + (rnd() - 0.5) * S * 0.2, S * 0.08, 0.55 * (1.3 - t));
}

function nova(h: Heat, t: number, S: number, el: FxElement, rnd: () => number) {
  const cx = S / 2, cy = S * 0.62;
  const R = S * (0.08 + t * 0.4);
  const n = 40;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rnd() * 0.1;
    const rr = R * (0.92 + rnd() * 0.16);
    h.splat(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.5, Math.max(1, S * 0.055 * (1.2 - t)), 1.25 - t * 0.7);
    if (el === 'fuego' || el === 'sombra') h.splat(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.5 - S * 0.05 * rnd(), 0.8, 0.5 * (1 - t));
  }
  if (t < 0.25) h.splat(cx, cy, S * 0.12, 1 - t * 3, 0.6);
  if (el === 'naturaleza') for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + t * 0.8, rr = R * 1.02;
    if (t < 0.9) h.bits.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr * 0.5 - t * S * 0.06 * (k % 2), kind: k % 2 ? 'petalo' : 'hoja', a: a + Math.PI / 2 });
  }
}

function aura(h: Heat, t: number, S: number, _el: FxElement, rnd: () => number) {
  const cx = S / 2, cy = S * 0.78, rx = S * 0.36;
  for (let k = 0; k < 48; k++) {
    const a = (k / 48) * Math.PI * 2;
    const glow = 0.75 + 0.45 * Math.sin(a * 3 + t * Math.PI * 2);
    h.splat(cx + Math.cos(a) * rx, cy + Math.sin(a) * rx * 0.45, 1.3, glow);
  }
  h.splat(cx, cy, rx * 0.95, 0.28, 0.45);
  // chispas que suben desde el anillo
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + 1.3;
    const life = (t + k / 7) % 1;
    h.splat(cx + Math.cos(a) * rx * 0.85, cy + Math.sin(a) * rx * 0.38 - life * S * 0.45, 1.3, 1.3 - life);
  }
  void rnd;
}

function strike(h: Heat, t: number, S: number, el: FxElement, rnd: () => number) {
  const cx = S / 2, ground = S * 0.88;
  if (el === 'fuego') {
    // columna de fuego que sube del piso
    const top = ground - S * 0.85 * Math.min(1, t * 2.2);
    for (let y = ground; y > top; y -= 1.5) h.splat(cx + Math.sin(y * 0.5 + t * 8) * 1.5, y, S * 0.1 * (1 - t * 0.5) * (0.7 + 0.3 * rnd()), 0.9);
  } else {
    // rayo desde el cielo: zigzag del borde de arriba al piso
    if (t < 0.6) {
      let x = cx + (rnd() - 0.5) * S * 0.2, y = 0;
      while (y < ground) { const ny = y + 3 + rnd() * 4, nx = cx + (rnd() - 0.5) * S * 0.22; h.line(x, y, nx, ny, 1.2, t < 0.3 ? 1 : 0.6); x = nx; y = ny; }
    }
  }
  h.splat(cx, ground, S * (0.12 + t * 0.2), 1.1 - t, 0.45);
}

function heal(h: Heat, t: number, S: number, el: FxElement, rnd: () => number) {
  const cx = S / 2;
  for (let k = 0; k < 14; k++) {
    const x = cx + (rnd() - 0.5) * S * 0.62;
    const life = (t + rnd() * 0.6) % 1;
    const y = S * 0.88 - life * S * 0.72;
    const a = 1.3 - life;
    // chispas y crucecitas que suben
    h.splat(x, y, 1.3, a);
    if (k % 3 === 0) { h.line(x - 2.5, y, x + 2.5, y, a, 0.7); h.line(x, y - 2.5, x, y + 2.5, a, 0.7); }
  }
  h.splat(cx, S * 0.86, S * 0.32 * (0.6 + t * 0.4), 0.7 * (1 - t * 0.8), 0.4);
  void el;
}

function shield(h: Heat, t: number, S: number, el: FxElement, rnd: () => number) {
  const cx = S / 2, cy = S * 0.5, R = S * 0.42;
  for (let k = 0; k < 64; k++) {
    const a = (k / 64) * Math.PI * 2;
    const shimmer = 0.7 + 0.6 * Math.max(0, Math.sin(a * 2 - t * Math.PI * 2));
    h.splat(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 1.2, shimmer);
  }
  h.splat(cx, cy, R * 0.95, 0.22);
  // brillo que recorre la burbuja
  const a = t * Math.PI * 2 - 1;
  h.splat(cx + Math.cos(a) * R * 0.72, cy + Math.sin(a) * R * 0.72, 2.2, 1.2);
  void rnd; void el;
}

function circle(h: Heat, t: number, S: number, el: FxElement, rnd: () => number) {
  const cx = S / 2, cy = S * 0.66, R = S * 0.44;
  for (const rr of [R, R * 0.72]) for (let k = 0; k < 96; k++) { const a = (k / 96) * Math.PI * 2; h.splat(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.5, 0.9, 0.55 + 0.25 * Math.sin(a * 6 + t * Math.PI * 2)); }
  // runas: puntos que giran entre los dos anillos y una estrella de cinco puntas
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + t * Math.PI * 2 * 0.2;
    const b = ((k + 2) / 5) * Math.PI * 2 + t * Math.PI * 2 * 0.2;
    h.line(cx + Math.cos(a) * R * 0.72, cy + Math.sin(a) * R * 0.36, cx + Math.cos(b) * R * 0.72, cy + Math.sin(b) * R * 0.36, 0.55, 0.45);
    h.splat(cx + Math.cos(a) * R * 0.86, cy + Math.sin(a) * R * 0.43, 1.1, 1);
  }
  void rnd; void el;
}

function buff(h: Heat, t: number, S: number, el: FxElement, rnd: () => number) {
  const cx = S / 2;
  // flechas (chevrones) que suben alrededor
  for (let k = 0; k < 3; k++) {
    const x = cx + (k - 1) * S * 0.28;
    const y = S * 0.8 - ((t + k * 0.3) % 1) * S * 0.6;
    const a = 1 - ((t + k * 0.3) % 1) * 0.7;
    const w = Math.max(3, S * 0.08);
    h.line(x - w, y + w, x, y, a * 1.3, 0.9);
    h.line(x, y, x + w, y + w, a * 1.3, 0.9);
  }
  h.splat(cx, S * 0.84, S * 0.34, 0.6 * (1 - t * 0.8), 0.4);
  void rnd; void el;
}

function slash(h: Heat, t: number, S: number, el: FxElement, rnd: () => number) {
  // media luna de un tajo: se dibuja de arriba hacia abajo y se desvanece
  const cx = S * 0.42, cy = S * 0.5, R = S * 0.36;
  const a0 = -1.3, a1 = -1.3 + Math.min(1, t * 2.2) * 2.6;
  for (let a = a0; a <= a1; a += 0.04) {
    const w = Math.sin(((a - a0) / 2.6) * Math.PI) * S * 0.07 + 0.4;
    const fade = t > 0.45 ? 1 - (t - 0.45) * 1.6 : 1;
    h.splat(cx + Math.cos(a) * R, cy + Math.sin(a) * R, w, fade);
  }
  void rnd; void el;
}

/** Colores que un elemento agrega fuera de su rampa (las hojas y pétalos de la naturaleza). */
export const FX_EXTRA_COLORS: Partial<Record<FxElement, string[]>> = {
  naturaleza: ['#0a2818', '#8ce678', '#3caa50', '#5a1a3c', '#ffd6e8', '#c85a96', '#f08ab4'],
};

/** Hoja (verde, 3 px con nervio) o pétalo (rosado, 2 x 2 con luz), con contorno oscuro. */
function drawBit(r: Raster, b: Heat['bits'][number]) {
  const put = (x: number, y: number, c: [number, number, number], soft = false) => {
    const X = Math.round(x), Y = Math.round(y);
    if (X < 0 || Y < 0 || X >= r.w || Y >= r.h) return;
    if (soft && r.data[(Y * r.w + X) * 4 + 3]) return;
    r.data.set([...c, 255], (Y * r.w + X) * 4);
  };
  const dx = Math.round(Math.cos(b.a)), dy = Math.round(Math.sin(b.a));
  if (b.kind === 'hoja') {
    const pts: [number, number][] = [[b.x - dx, b.y - dy], [b.x, b.y], [b.x + dx, b.y + dy]];
    for (const [x, y] of pts) for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(x + ox, y + oy, [10, 40, 24], true);
    pts.forEach(([x, y], i) => put(x, y, i === 1 ? [140, 230, 120] : [60, 170, 80]));
  } else {
    const pts: [number, number][] = [[b.x, b.y], [b.x + 1, b.y], [b.x, b.y + 1], [b.x + 1, b.y + 1]];
    for (const [x, y] of pts) for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(x + ox, y + oy, [90, 26, 60], true);
    pts.forEach(([x, y], i) => put(x, y, i === 0 ? [255, 214, 232] : i === 3 ? [200, 90, 150] : [240, 138, 180]));
  }
}

const DRAW: Record<FxKind, Draw> = { projectile, impact, nova, aura, strike, heal, shield, circle, buff, slash };

/** Dibuja un efecto: frames del tamaño de la celda. */
export function renderFx(spec: FxSpec): FxClip {
  const { n, loop, fps } = FRAMES[spec.kind];
  const S = spec.cell;
  const pal = FX_PALETTES[spec.element];
  const frames: Raster[] = [];
  for (let f = 0; f < n; f++) {
    const rnd = rng((spec.seed ?? 7) * 1009 + f * 7919 + FX_KINDS.indexOf(spec.kind) * 31 + FX_ELEMENTS.indexOf(spec.element) * 131);
    const h = new Heat(S, S);
    DRAW[spec.kind](h, n > 1 ? f / (loop ? n : n - 1) : 0, S, spec.element, rnd);
    const fr = paint(toIndex(h, spec.outline ?? true), pal);
    for (const b of h.bits) drawBit(fr, b);
    frames.push(fr);
  }
  return { name: `${spec.kind}_${spec.element}`, fps, loop, cell: S as CellSize, frames };
}

const DIRS8: [string, number][] = [['right', 0], ['down_right', 45], ['down', 90], ['down_left', 135], ['left', 180], ['up_left', 225], ['up', 270], ['up_right', 315]];

/** Un proyectil en las 8 direcciones (derecha, abajo-derecha, abajo...), girado con RotSprite. */
export function projectile8(spec: Omit<FxSpec, 'kind'>): { dir: string; clip: FxClip }[] {
  const base = renderFx({ ...spec, kind: 'projectile' });
  return rotate8(base.frames).map(({ dir, frames }) => ({ dir, clip: { ...base, name: `${base.name}_${dir}`, frames } }));
}

/** Cuadros dibujados mirando a la derecha, girados a las 8 direcciones con RotSprite. */
export function rotate8(frames: Raster[]): { dir: string; frames: Raster[] }[] {
  return DIRS8.map(([dir, deg]) => ({ dir, frames: frames.map((fr) => rotateRaster(fr, deg)) }));
}

/** Gira un cuadro con RotSprite (pasando por índices de color para no inventar tonos). */
export function rotateRaster(r: Raster, deg: number): Raster {
  if (deg % 360 === 0) return r;
  const colors: number[] = [];
  const idx = new Int16Array(r.w * r.h).fill(-1);
  for (let i = 0; i < r.w * r.h; i++) {
    if (!r.data[i * 4 + 3]) continue;
    const c = (r.data[i * 4] << 16) | (r.data[i * 4 + 1] << 8) | r.data[i * 4 + 2];
    let k = colors.indexOf(c);
    if (k < 0) { k = colors.length; colors.push(c); }
    idx[i] = k;
  }
  const out = rotSprite({ w: r.w, h: r.h, idx }, deg, r.w / 2, r.h / 2);
  const res = createRaster(r.w, r.h);
  const ox = Math.round(r.w / 2 - out.px), oy = Math.round(r.h / 2 - out.py);
  for (let y = 0; y < out.img.h; y++)
    for (let x = 0; x < out.img.w; x++) {
      const k = out.img.idx[y * out.img.w + x];
      if (k < 0) continue;
      const X = x + ox, Y = y + oy;
      if (X < 0 || Y < 0 || X >= r.w || Y >= r.h) continue;
      const c = colors[k];
      res.data.set([c >> 16, (c >> 8) & 255, c & 255, 255], (Y * r.w + X) * 4);
    }
  return res;
}
