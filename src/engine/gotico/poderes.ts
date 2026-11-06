/**
 * Poderes del taller gótico: hechizos y efectos de combate originales para el juego isométrico.
 *
 * Los efectos son luz y energía, así que no pasan por el trazador de rayos de `render.ts`: cada uno es un sistema de
 * partículas y formas armado en el espacio del mundo (las mismas unidades que los assets: una persona mide 61), que
 * se proyecta con la cámara 2:1 del taller y se compone en 2D con alfa de verdad.
 *
 * Hay dos clases de trazo:
 * - luz: se suma (núcleo casi blanco, color saturado al medio, borde oscuro y transparente). Al final una curva
 *   suave comprime lo que se pasa de 1 y lo derrama a blanco, así los núcleos calientes queden blancos.
 * - materia: se compone encima con alfa (humo, polvo, sangre, hueso, flechas, hielo).
 *
 * El resultado es RGBA con alfa directa: el color sobre negro es el mismo que se vería sumando la luz. Todo es
 * determinista (semillas por efecto y por cuadro, nada de Math.random).
 */
import { zipSync } from 'fflate';
import { createRaster, type Raster } from '../core/raster';
import { rng, hashString } from '../core/rng';
import { encodePng } from '../export/png';
import { luzEfectosJson } from './luz_efectos';
import { DEFS_DOOM, MEJORAS_DOOM, EFECTOS_DOOM } from './poderes_doom';

// ---------------------------------------------------------------------------------------------------------------
// tipos públicos

export type Elemento = 'fuego' | 'hielo' | 'rayo' | 'veneno' | 'hueso' | 'sagrado' | 'sombra' | 'naturaleza' | 'arcano' | 'fisico' | 'sangre';
export type TipoPoder = 'proyectil' | 'area' | 'aura' | 'rayo' | 'impacto' | 'invocacion' | 'buff' | 'muro' | 'lluvia';

export interface Poder {
  id: string;
  nombre: [string, string];
  elemento: Elemento;
  tipo: TipoPoder;
  cuadros: number;
  direccional: boolean;
  /** true: el efecto se repite (proyectiles, auras, muros); false: se reproduce una vez */
  bucle: boolean;
  /** ticks por cuadro a 25 cuadros por segundo */
  t: number;
  /** pixel del cuadro que va sobre el origen del mundo en el piso (se calcula la primera vez que se pide) */
  readonly ancla: [number, number];
  /** ancho y alto de cada cuadro (igual en todos los cuadros y direcciones) */
  readonly celda: [number, number];
}

/** Direcciones en el orden de las hojas: s, so, o, no, n, ne, e, se. */
export const DIRS_PODER = ['s', 'so', 'o', 'no', 'n', 'ne', 'e', 'se'] as const;
/** Rumbo en el piso de cada dirección, en grados (atan2 sobre el piso; x abajo a la derecha, y abajo a la izquierda). */
const RUMBO = [45, 90, 135, 180, 225, 270, 315, 0];

// ---------------------------------------------------------------------------------------------------------------
// utilidades

type V3 = [number, number, number];
type C = [number, number, number];
type Pt = [number, number];

const KZ = Math.sqrt(1.5);
const S2 = Math.SQRT2;
const TAU = Math.PI * 2;
const frac = (x: number) => x - Math.floor(x);
const c01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mezcla = (a: C, b: C, t: number): C => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rampa = (cs: C[], t: number): C => {
  const x = c01(t) * (cs.length - 1);
  const i = Math.min(cs.length - 2, Math.floor(x));
  return mezcla(cs[i], cs[i + 1], x - i);
};
const suave = (a: number, b: number, x: number) => {
  const t = c01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** sube de a a b y baja de b a c */
const campana = (x: number, a: number, b: number, c: number) => (x < b ? suave(a, b, x) : 1 - suave(b, c, x));
const sale = (x: number, p = 2) => 1 - Math.pow(1 - c01(x), p);
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const largo = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const unit = (a: V3): V3 => mul(a, 1 / (largo(a) || 1));
const cruz = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const mix3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

function hash2(ix: number, iy: number): number {
  let h = (Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function ruido(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  let fx = x - ix, fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
}
const fbm = (x: number, y: number) => ruido(x, y) * 0.5 + ruido(x * 2.03 + 17.1, y * 2.03 + 3.7) * 0.3 + ruido(x * 4.1 + 5.3, y * 4.1 + 9.1) * 0.2;

// paletas: de núcleo caliente a borde oscuro
const FUEGO: C[] = [[1, 0.9, 0.62], [1, 0.58, 0.16], [0.95, 0.28, 0.05], [0.5, 0.08, 0.02]];
const HIELO: C[] = [[0.88, 0.97, 1], [0.48, 0.8, 1], [0.2, 0.48, 1], [0.06, 0.16, 0.6]];
const RAYO: C[] = [[0.94, 0.98, 1], [0.58, 0.8, 1], [0.32, 0.55, 1], [0.14, 0.24, 0.85]];
const VENENO: C[] = [[0.86, 1, 0.6], [0.52, 1, 0.16], [0.26, 0.7, 0.06], [0.08, 0.3, 0.02]];
const SAGRADO: C[] = [[1, 0.98, 0.88], [1, 0.86, 0.48], [1, 0.62, 0.2], [0.55, 0.32, 0.05]];
const SOMBRA: C[] = [[0.9, 0.75, 1], [0.62, 0.32, 1], [0.36, 0.1, 0.72], [0.14, 0.02, 0.3]];
const ARCANO: C[] = [[0.92, 0.88, 1], [0.62, 0.55, 1], [0.38, 0.28, 1], [0.15, 0.08, 0.5]];
const AZUL: C[] = [[0.85, 0.95, 1], [0.4, 0.72, 1], [0.12, 0.36, 1], [0.04, 0.1, 0.5]];
const NATURA: C[] = [[0.9, 1, 0.72], [0.55, 0.95, 0.32], [0.22, 0.66, 0.14], [0.05, 0.28, 0.05]];
const ALMA: C[] = [[0.9, 1, 0.98], [0.55, 0.95, 0.85], [0.22, 0.62, 0.62], [0.06, 0.24, 0.3]];
const NIGRO: C[] = [[0.85, 1, 0.85], [0.4, 1, 0.55], [0.6, 0.3, 1], [0.25, 0.05, 0.45]];
const TRAMPA: C[] = [[1, 0.88, 0.95], [1, 0.42, 0.7], [0.78, 0.15, 0.48], [0.3, 0.03, 0.2]];
const ACERO: C[] = [[1, 1, 1], [0.78, 0.85, 1], [0.5, 0.58, 0.8], [0.2, 0.22, 0.35]];
const BESTIA: C[] = [[1, 0.92, 0.7], [1, 0.62, 0.2], [0.85, 0.22, 0.05], [0.35, 0.05, 0.02]];
const BLANCO: C = [1, 1, 1];

// ---------------------------------------------------------------------------------------------------------------
// el lienzo: un búfer HDR premultiplicado donde la luz se suma y la materia se compone encima

const LW = 760, LH = 720, AX = 380, AY = 520;

class Lienzo {
  b = new Float32Array(LW * LH * 4);
  x0 = LW; y0 = LH; x1 = -1; y1 = -1;

  limpiar(): void {
    if (this.x1 >= 0) for (let y = this.y0; y <= this.y1; y++) this.b.fill(0, (y * LW + this.x0) * 4, (y * LW + this.x1 + 1) * 4);
    this.x0 = LW; this.y0 = LH; this.x1 = -1; this.y1 = -1;
  }
  /** recorta una caja al lienzo y la marca como sucia; null si no toca nada */
  private caja(xa: number, ya: number, xb: number, yb: number): [number, number, number, number] | null {
    const a = Math.max(0, Math.floor(xa)), b = Math.max(0, Math.floor(ya));
    const c = Math.min(LW - 1, Math.ceil(xb)), d = Math.min(LH - 1, Math.ceil(yb));
    if (a > c || b > d) return null;
    if (a < this.x0) this.x0 = a;
    if (b < this.y0) this.y0 = b;
    if (c > this.x1) this.x1 = c;
    if (d > this.y1) this.y1 = d;
    return [a, b, c, d];
  }
  private suma(i: number, c: C, k: number): void {
    this.b[i] += c[0] * k; this.b[i + 1] += c[1] * k; this.b[i + 2] += c[2] * k;
  }
  private sobre(i: number, c: C, a: number): void {
    const q = 1 - a;
    this.b[i] = c[0] * a + this.b[i] * q; this.b[i + 1] = c[1] * a + this.b[i + 1] * q;
    this.b[i + 2] = c[2] * a + this.b[i + 2] * q; this.b[i + 3] = a + this.b[i + 3] * q;
  }

  // --- proyección
  P(p: V3): Pt { return [AX + 0.5 + p[0] - p[1], AY + 0.5 + (p[0] + p[1]) / 2 - KZ * p[2]]; }

  // --- luz (aditiva)
  /** mancha de luz gaussiana; r es el radio visible en px; ex/ey la estiran, ang la gira */
  luz(x: number, y: number, r: number, c: C, k: number, ex = 1, ey = 1, ang = 0): void {
    if (k <= 0.003) return;
    r = Math.max(0.55, r);
    const R = r * Math.max(ex, ey) * 1.65;
    const bx = this.caja(x - R, y - R, x + R, y + R);
    if (!bx) return;
    const ca = Math.cos(ang), sa = Math.sin(ang), irx = 1 / (r * ex), iry = 1 / (r * ey);
    for (let py = bx[1]; py <= bx[3]; py++) {
      const dy = py + 0.5 - y;
      for (let px = bx[0]; px <= bx[2]; px++) {
        const dx = px + 0.5 - x;
        const u = (dx * ca + dy * sa) * irx, v = (dy * ca - dx * sa) * iry;
        const q = u * u + v * v;
        if (q > 2.8) continue;
        this.suma((py * LW + px) * 4, c, k * Math.exp(-3 * q));
      }
    }
  }
  /** trazo de luz entre dos puntos con radio e intensidad que cambian a lo largo */
  trazo(xa: number, ya: number, xb: number, yb: number, ra: number, rb: number, c: C, ka: number, kb = ka): void {
    if (ka <= 0.003 && kb <= 0.003) return;
    ra = Math.max(0.5, ra); rb = Math.max(0.5, rb);
    const R = Math.max(ra, rb) * 1.65;
    const bx = this.caja(Math.min(xa, xb) - R, Math.min(ya, yb) - R, Math.max(xa, xb) + R, Math.max(ya, yb) + R);
    if (!bx) return;
    const vx = xb - xa, vy = yb - ya, l2 = vx * vx + vy * vy || 1e-6;
    for (let py = bx[1]; py <= bx[3]; py++) {
      const cy = py + 0.5;
      for (let px = bx[0]; px <= bx[2]; px++) {
        const cx = px + 0.5;
        const t = c01(((cx - xa) * vx + (cy - ya) * vy) / l2);
        const dx = xa + vx * t - cx, dy = ya + vy * t - cy;
        const r = ra + (rb - ra) * t;
        const q = (dx * dx + dy * dy) / (r * r);
        if (q > 2.8) continue;
        this.suma((py * LW + px) * 4, c, (ka + (kb - ka) * t) * Math.exp(-3 * q));
      }
    }
  }
  /** anillo de luz; aplast 2 = sobre el piso (rombo 2:1), 1 = círculo en pantalla. mod(ángulo) lo modula */
  anillo(x: number, y: number, rx: number, ancho: number, c: C, k: number, aplast = 2, mod?: (a: number) => number): void {
    if (k <= 0.003 || rx <= 0) return;
    ancho = Math.max(0.6, ancho);
    const m = ancho * 1.7;
    const bx = this.caja(x - rx - m, y - (rx + m) / aplast, x + rx + m, y + (rx + m) / aplast);
    if (!bx) return;
    for (let py = bx[1]; py <= bx[3]; py++) {
      const dy = (py + 0.5 - y) * aplast;
      for (let px = bx[0]; px <= bx[2]; px++) {
        const dx = px + 0.5 - x;
        const d = Math.hypot(dx, dy) - rx;
        if (d > m || d < -m) continue;
        let f = k * Math.exp(-3 * (d / ancho) * (d / ancho));
        if (mod) f *= mod(Math.atan2(dy, dx));
        if (f > 0.002) this.suma((py * LW + px) * 4, c, f);
      }
    }
  }
  /** anillo de materia (aire comprimido, borde de humo): igual que `anillo` pero se compone con alfa */
  aro(x: number, y: number, rx: number, ancho: number, c: C, a: number, aplast = 2, mod?: (a: number) => number): void {
    if (a <= 0.003 || rx <= 0) return;
    ancho = Math.max(0.6, ancho);
    const m = ancho * 1.7;
    const bx = this.caja(x - rx - m, y - (rx + m) / aplast, x + rx + m, y + (rx + m) / aplast);
    if (!bx) return;
    for (let py = bx[1]; py <= bx[3]; py++) {
      const dy = (py + 0.5 - y) * aplast;
      for (let px = bx[0]; px <= bx[2]; px++) {
        const dx = px + 0.5 - x;
        const d = Math.hypot(dx, dy) - rx;
        if (d > m || d < -m) continue;
        let f = a * Math.exp(-3 * (d / ancho) * (d / ancho));
        if (mod) f *= mod(Math.atan2(dy, dx));
        if (f > 0.004) this.sobre((py * LW + px) * 4, c, Math.min(1, f));
      }
    }
  }
  /** polígono (con borde suavizado), de luz o de materia */
  poli(pts: Pt[], c: C, a: number, luz = false): void {
    if (a <= 0.003 || pts.length < 3) return;
    let xa = Infinity, ya = Infinity, xb = -Infinity, yb = -Infinity;
    for (const p of pts) { xa = Math.min(xa, p[0]); ya = Math.min(ya, p[1]); xb = Math.max(xb, p[0]); yb = Math.max(yb, p[1]); }
    const bx = this.caja(xa - 1, ya - 1, xb + 1, yb + 1);
    if (!bx) return;
    const n = pts.length;
    for (let py = bx[1]; py <= bx[3]; py++)
      for (let px = bx[0]; px <= bx[2]; px++) {
        let cov = 0;
        for (let sy = 0; sy < 3; sy++)
          for (let sx = 0; sx < 3; sx++) {
            const X = px + (sx + 0.5) / 3, Y = py + (sy + 0.5) / 3;
            let dentro = false;
            for (let i = 0, j = n - 1; i < n; j = i++) {
              const [xi, yi] = pts[i], [xj, yj] = pts[j];
              if (yi > Y !== yj > Y && X < ((xj - xi) * (Y - yi)) / (yj - yi) + xi) dentro = !dentro;
            }
            if (dentro) cov++;
          }
        if (!cov) continue;
        const i = (py * LW + px) * 4;
        if (luz) this.suma(i, c, (a * cov) / 9);
        else this.sobre(i, c, (a * cov) / 9);
      }
  }
  /** cápsula de materia (palo, gota, enredadera), con borde suavizado */
  capsula(xa: number, ya: number, xb: number, yb: number, ra: number, rb: number, c: C, a: number): void {
    if (a <= 0.003) return;
    const R = Math.max(ra, rb) + 1;
    const bx = this.caja(Math.min(xa, xb) - R, Math.min(ya, yb) - R, Math.max(xa, xb) + R, Math.max(ya, yb) + R);
    if (!bx) return;
    const vx = xb - xa, vy = yb - ya, l2 = vx * vx + vy * vy || 1e-6;
    for (let py = bx[1]; py <= bx[3]; py++) {
      const cy = py + 0.5;
      for (let px = bx[0]; px <= bx[2]; px++) {
        const cx = px + 0.5;
        const t = c01(((cx - xa) * vx + (cy - ya) * vy) / l2);
        const d = Math.hypot(xa + vx * t - cx, ya + vy * t - cy);
        const cov = c01(ra + (rb - ra) * t - d + 0.5);
        if (cov > 0) this.sobre((py * LW + px) * 4, c, a * cov);
      }
    }
  }
  /** voluta de humo o polvo: disco blando roto por ruido, más claro arriba a la izquierda (de donde viene la luz) */
  humo(x: number, y: number, r: number, c: C, a: number, nx = 0, ny = 0, ey = 1): void {
    if (a <= 0.003 || r < 0.8) return;
    const bx = this.caja(x - r, y - r * ey, x + r, y + r * ey);
    if (!bx) return;
    const ir = 1 / r;
    for (let py = bx[1]; py <= bx[3]; py++) {
      const dy = (py + 0.5 - y) / ey;
      for (let px = bx[0]; px <= bx[2]; px++) {
        const dx = px + 0.5 - x;
        const q2 = (dx * dx + dy * dy) * ir * ir;
        if (q2 >= 1) continue;
        const n = fbm(dx * ir * 1.7 + nx, dy * ir * 1.7 + ny);
        const al = a * c01((1 - q2) * (1 - q2) * 2.2 * (n * 1.5 - 0.28));
        if (al <= 0.004) continue;
        const sh = 1 + 0.45 * Math.max(-1, Math.min(1, -(dx + dy) * ir * 0.8)) - 0.15 * q2;
        this.sobre((py * LW + px) * 4, [c[0] * sh, c[1] * sh, c[2] * sh], al);
      }
    }
  }
  /** mancha sólida con borde irregular (cráter, charco, salpicadura en el piso) */
  mancha(x: number, y: number, rx: number, ry: number, c: C, a: number, nx = 0, ny = 0, borde = 0.4): void {
    if (a <= 0.003) return;
    const bx = this.caja(x - rx * 1.3, y - ry * 1.3, x + rx * 1.3, y + ry * 1.3);
    if (!bx) return;
    for (let py = bx[1]; py <= bx[3]; py++)
      for (let px = bx[0]; px <= bx[2]; px++) {
        const u = (px + 0.5 - x) / rx, v = (py + 0.5 - y) / ry;
        const q = Math.hypot(u, v) + (fbm(u * 2.2 + nx, v * 2.2 + ny) - 0.5) * borde;
        const cov = c01((1 - q) * Math.max(rx, ry) * 0.7 + 0.5);
        if (cov > 0) this.sobre((py * LW + px) * 4, c, a * cov);
      }
  }
  /** luz calculada pixel a pixel dentro de una caja (burbujas, portales) */
  campo(xa: number, ya: number, xb: number, yb: number, fn: (dx: number, dy: number) => number, c: C | ((dx: number, dy: number) => C), cx: number, cy: number): void {
    const bx = this.caja(xa, ya, xb, yb);
    if (!bx) return;
    for (let py = bx[1]; py <= bx[3]; py++)
      for (let px = bx[0]; px <= bx[2]; px++) {
        const dx = px + 0.5 - cx, dy = py + 0.5 - cy;
        const k = fn(dx, dy);
        if (k > 0.003) this.suma((py * LW + px) * 4, typeof c === 'function' ? c(dx, dy) : c, k);
      }
  }

  // --- en el mundo
  bola(p: V3, r: number, c: C, k: number, ex = 1, ey = 1): void { const [x, y] = this.P(p); this.luz(x, y, r, c, k, ex, ey); }
  /** charco de luz sobre el piso: rw en unidades del mundo */
  piso(p: V3, rw: number, c: C, k: number): void { const [x, y] = this.P([p[0], p[1], 0]); this.luz(x, y, rw * S2, c, k, 1, 0.5); }
  rayo3(a: V3, b: V3, ra: number, rb: number, c: C, ka: number, kb = ka): void {
    const [xa, ya] = this.P(a), [xb, yb] = this.P(b);
    this.trazo(xa, ya, xb, yb, ra, rb, c, ka, kb);
  }
  aroPiso(p: V3, rw: number, ancho: number, c: C, k: number, mod?: (a: number) => number): void {
    const [x, y] = this.P(p); this.anillo(x, y, rw * S2, ancho, c, k, 2, mod);
  }
  humo3(p: V3, r: number, c: C, a: number, nx = 0, ny = 0): void { const [x, y] = this.P(p); this.humo(x, y, r, c, a, nx, ny); }
  cap3(a: V3, b: V3, ra: number, rb: number, c: C, al: number): void {
    const [xa, ya] = this.P(a), [xb, yb] = this.P(b);
    this.capsula(xa, ya, xb, yb, ra, rb, c, al);
  }

  /** imagen RGBA (alfa directa) con su esquina en (x0, y0): la luz suma color * alfa * k, la materia se compone encima */
  imagen(x0: number, y0: number, w: number, h: number, rgba: ArrayLike<number>, luz: boolean, k = 1): void {
    const bx = this.caja(x0, y0, x0 + w - 1, y0 + h - 1);
    if (!bx) return;
    for (let py = bx[1]; py <= bx[3]; py++)
      for (let px = bx[0]; px <= bx[2]; px++) {
        const s = ((py - y0) * w + (px - x0)) * 4, a = (rgba[s + 3] / 255) * k;
        if (a <= 0.003) continue;
        const c: C = [rgba[s] / 255, rgba[s + 1] / 255, rgba[s + 2] / 255], i = (py * LW + px) * 4;
        if (luz) this.suma(i, c, a);
        else this.sobre(i, c, Math.min(1, a));
      }
  }

  /** pasa el búfer a RGBA (solo la parte sucia) */
  exportar(): { img: Raster; ox: number; oy: number } {
    if (this.x1 < 0) return { img: createRaster(1, 1), ox: AX, oy: AY };
    const w = this.x1 - this.x0 + 1, h = this.y1 - this.y0 + 1;
    const img = createRaster(w, h);
    const tm = (v: number) => (v < 0.78 ? v : 0.78 + 0.22 * (1 - Math.exp(-(v - 0.78) / 0.22)));
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = ((y + this.y0) * LW + x + this.x0) * 4;
        let r = this.b[i], g = this.b[i + 1], bl = this.b[i + 2];
        const A = Math.min(1, this.b[i + 3]);
        if (r <= 0 && g <= 0 && bl <= 0 && A <= 0) continue;
        const m = Math.max(r, g, bl);
        if (m > 1) { const e = (m - 1) * 0.38; r += e; g += e; bl += e; }
        r = tm(r); g = tm(g); bl = tm(bl);
        const a = Math.min(1, Math.max(A, r, g, bl));
        if (a < 0.018) continue;
        const o = (y * w + x) * 4;
        img.data[o] = (r / a) * 255; img.data[o + 1] = (g / a) * 255; img.data[o + 2] = (bl / a) * 255; img.data[o + 3] = a * 255;
      }
    return { img, ox: this.x0, oy: this.y0 };
  }
}

// ---------------------------------------------------------------------------------------------------------------
// piezas que comparten varios efectos

interface Cx {
  L: Lienzo;
  f: number;
  n: number;
  /** f / n: para los que se repiten */
  u: number;
  /** (f + 0.3) / n: para los que pasan una vez (ni el primer cuadro ni el último quedan vacíos) */
  v: number;
  /** hacia dónde va (unitario en el piso) */
  fx: number;
  fy: number;
  sem: number;
  /** punto del mundo a `d` unidades hacia adelante, `l` hacia la izquierda de la marcha, a altura z */
  fw(d: number, l: number, z: number): V3;
  /** el mismo punto girando la marcha `giro` radianes */
  fwr(giro: number, d: number, l: number, z: number): V3;
  /** azar con semilla fija por efecto (y por k) */
  R(k?: number): () => number;
}

/** lengua de fuego que sube desde (x, y, z); fase 0..1 se repite sin salto */
function llama(L: Lienzo, x: number, y: number, z: number, alto: number, ancho: number, fase: number, k = 1, pal: C[] = FUEGO): void {
  const ph = fase * TAU;
  const h = alto * (0.86 + 0.14 * Math.sin(ph * 2));
  const N = 14;
  const b = L.P([x, y, z + h * 0.3]);
  L.luz(b[0], b[1], ancho * 2.6, pal[3], k * 0.16, 1, 1.5);
  for (let i = 0; i < N; i++) {
    const s = i / (N - 1);
    const sway = (Math.sin(s * 3.1 - ph) * 0.42 + Math.sin(s * 6.7 - ph * 2) * 0.16) * ancho * s;
    const r = ancho * Math.pow(1 - s, 1.1) * 0.75 + 0.7;
    const p = L.P([x + sway / 2, y - sway / 2, z + r * 0.45 + s * h]);
    L.luz(p[0], p[1], r, rampa(pal, 0.22 + s * 0.78), k * (0.5 * Math.pow(1 - s, 0.8) + 0.1) * (0.55 + 0.45 * suave(0, 0.25, s)), 0.85, 1.45);
  }
  // núcleo caliente abajo
  const b0 = L.P([x, y, z + h * 0.16]);
  L.luz(b0[0], b0[1], ancho * 0.35, pal[0], k * 0.4, 0.8, 1.8);
  // lengüeta que se suelta y sube
  const q = frac(fase * 2 + 0.3);
  const sw = Math.sin(q * 5 - ph) * ancho * 0.4;
  const t = L.P([x + sw / 2, y - sw / 2, z + h * (0.75 + q * 0.55)]);
  L.luz(t[0], t[1], ancho * 0.42 * (1 - q) + 0.8, rampa(pal, 0.45 + q * 0.5), k * 0.75 * (1 - q), 1, 1.5);
}

/** brasas que suben (repiten con u) */
function brasas(L: Lienzo, R: () => number, n: number, cx: number, cy: number, rad: number, z0: number, alto: number, u: number, k = 1, pal: C[] = FUEGO): void {
  for (let i = 0; i < n; i++) {
    const a = R() * TAU, rr = Math.sqrt(R()) * rad, ph = R(), vel = 0.7 + R() * 0.6, ws = R() * TAU;
    const t = frac(u * (vel > 1 ? 2 : 1) + ph);
    const wob = Math.sin(t * 7 + ws) * 3;
    const p: V3 = [cx + Math.cos(a) * rr + wob / 2, cy + Math.sin(a) * rr - wob / 2, z0 + t * alto];
    const [x, y] = L.P(p);
    const fl = 0.6 + 0.4 * Math.sin(t * 23 + ws);
    const kk = k * campana(t, 0, 0.1, 1) * fl;
    L.trazo(x, y, x - wob * 0.3, y + 2.5, 0.75, 0.5, rampa(pal, 0.15 + t * 0.6), kk * 1.6, 0);
    L.luz(x, y, 2.2, pal[2], kk * 0.25);
  }
}

/** humo que sube (repite con u) */
function humareda(L: Lienzo, R: () => number, n: number, cx: number, cy: number, rad: number, z0: number, alto: number, u: number, a: number, c: C = [0.12, 0.1, 0.09], r0 = 5, r1 = 14): void {
  for (let i = 0; i < n; i++) {
    const ang = R() * TAU, rr = Math.sqrt(R()) * rad, ph = R(), dr = (R() - 0.5) * 16;
    const t = frac(u + ph);
    const p: V3 = [cx + Math.cos(ang) * rr + dr * t / 2, cy + Math.sin(ang) * rr - dr * t / 2, z0 + t * alto];
    const [x, y] = L.P(p);
    L.humo(x, y, lerp(r0, r1, t), c, a * campana(t, 0, 0.25, 1), i * 3.1 + Math.cos(u * TAU) * 0.5, i * 1.7 + Math.sin(u * TAU) * 0.5 + t);
  }
}

/** destello de cuatro puntas (chispa, brillo de hielo, estrellita) */
function destello(L: Lienzo, x: number, y: number, s: number, c: C, k: number): void {
  if (k <= 0.01) return;
  L.luz(x, y, 1.6, c, k * 1.4);
  L.luz(x, y, s * 0.9, c, k * 0.25);
  L.trazo(x, y, x - s, y, 0.75, 0.5, c, k, 0); L.trazo(x, y, x + s, y, 0.75, 0.5, c, k, 0);
  L.trazo(x, y, x, y - s * 1.2, 0.75, 0.5, c, k, 0); L.trazo(x, y, x, y + s * 1.2, 0.75, 0.5, c, k, 0);
}

/** camino quebrado de un rayo entre a y b (desplazamiento del punto medio) */
function zigzag(a: V3, b: V3, R: () => number, rug: number, niv: number, plano = false): V3[] {
  const d = sub(b, a), len = largo(d), u = unit(d);
  let n1: V3, n2: V3;
  if (plano) { n1 = unit([-u[1], u[0], 0]); n2 = [0, 0, 0]; }
  else { n1 = Math.abs(u[2]) > 0.9 ? [1, 0, 0] : unit(cruz(u, [0, 0, 1])); n2 = cruz(u, n1); }
  let pts: V3[] = [a, b];
  let amp = len * rug;
  for (let l = 0; l < niv; l++) {
    const nx: V3[] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const m = mix3(pts[i], pts[i + 1], 0.5);
      nx.push(add(add(m, mul(n1, (R() - 0.5) * 2 * amp)), mul(n2, (R() - 0.5) * 2 * amp)), pts[i + 1]);
    }
    pts = nx;
    amp *= 0.55;
  }
  return pts;
}

/** dibuja un rayo: halo ancho, cuerpo de color, alma blanca */
function dibujaRayo(L: Lienzo, pts: V3[], pal: C[], k: number, g = 1, k1 = k): void {
  const n = pts.length - 1;
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n;
    const [xa, ya] = L.P(pts[i]), [xb, yb] = L.P(pts[i + 1]);
    const ka = lerp(k, k1, t0), kb = lerp(k, k1, t1);
    L.trazo(xa, ya, xb, yb, 7 * g, 7 * g, pal[3], ka * 0.16, kb * 0.16);
    L.trazo(xa, ya, xb, yb, 2.2 * g, 2.2 * g, pal[1], ka * 0.55, kb * 0.55);
    L.trazo(xa, ya, xb, yb, 0.8 * g, 0.8 * g, pal[0], ka * 1.7, kb * 1.7);
  }
}

/** explosión de fuego (sirve para la bola de fuego y para el meteoro) */
function explosion(L: Lienzo, R: () => number, v: number, s: number): void {
  const e = sale(v, 3), fin = Math.pow(1 - v, 1.5);
  // piso: quemadura que queda, charco de luz y onda de choque que deforma
  const [cx, cy] = L.P([0, 0, 0]);
  L.mancha(cx, cy, 24 * s * sale(v * 3), 12 * s * sale(v * 3), [0.06, 0.04, 0.03], 0.55 * suave(0, 0.2, v), 4.1, 1.3, 0.6);
  L.piso([0, 0, 0], (30 + 30 * e) * s, FUEGO[2], 1.3 * fin);
  const ph0 = R() * 10;
  ondaChoque(L, (10 + 62 * e) * s, 3 + 5 * v, FUEGO[1], 0.85 * Math.pow(1 - v, 2.2) * suave(0, 0.12, v), ph0, 0.35);
  // humo (detrás del fuego)
  for (let i = 0; i < 16; i++) {
    const a = R() * TAU, el = R() * 0.9, d = (0.45 + R() * 0.55) * 34 * s, ph = R();
    const t = c01((v - 0.12 - ph * 0.15) / 0.85);
    if (t <= 0) continue;
    const p: V3 = [Math.cos(a) * Math.cos(el) * d * sale(t), Math.sin(a) * Math.cos(el) * d * sale(t), (10 + Math.sin(el) * d * 0.8 + t * 26) * 1];
    L.humo3(p, (8 + t * 13) * s, [0.24, 0.19, 0.16], 0.75 * campana(t, 0, 0.3, 1), i * 2.3, i * 1.1 + t * 0.8);
  }
  // fuego: bolas que se abren y se apagan del blanco al rojo oscuro
  for (let i = 0; i < 44; i++) {
    const a = R() * TAU, el = R() * 1.2, d = (0.15 + R() * 0.85) * 32 * s, rr = R();
    const p: V3 = [Math.cos(a) * Math.cos(el) * d * e, Math.sin(a) * Math.cos(el) * d * e, 8 * s + Math.sin(el) * d * e * 0.9 + v * 14 * s];
    const k = 0.75 * Math.pow(1 - v, 1.2 + rr);
    L.bola(p, (8 + rr * 12) * s * (0.45 + 0.75 * e), rampa(FUEGO, 0.15 + v * 0.85 + rr * 0.2), k);
  }
  // fogonazo
  if (v < 0.25) {
    const k = 1 - v / 0.25;
    L.bola([0, 0, 12 * s], 34 * s, FUEGO[1], 1.4 * k);
    L.bola([0, 0, 12 * s], 14 * s, FUEGO[0], 3 * k);
  }
  // el aire empujado por el fogonazo y pavesas que planean después
  const [ex, ey] = L.P([0, 0, 14 * s]);
  ondaAire(L, ex, ey, (10 + 52 * e) * s, 2 + 3 * v, FUEGO[1], 0.6 * Math.pow(1 - v, 2.5), ph0 + 1);
  pavesas(L, R, 16, [0, 0, 10 * s], v, 40 * s, FUEGO, 0.9);
  // esquirlas encendidas con gravedad
  for (let i = 0; i < 26; i++) {
    const a = R() * TAU, up = 0.3 + R() * 0.9, sp = (40 + R() * 70) * s, lt = 0.5 + R() * 0.5;
    const T = v / lt;
    if (T >= 1) continue;
    const pos = (t: number): V3 => [Math.cos(a) * sp * t, Math.sin(a) * sp * t, 8 * s + up * sp * t - 70 * s * t * t];
    const p0 = pos(T * lt), p1 = pos(Math.max(0, T * lt - 0.07));
    if (p0[2] < 0) continue;
    L.rayo3(p0, p1, 0.9, 0.5, rampa(FUEGO, 0.2 + T * 0.5), 1.6 * (1 - T), 0);
  }
}

/** flecha de materia: asta de madera, punta de hierro, plumas */
function dibujaFlecha(L: Lienzo, cola: V3, punta: V3, al = 1, estela = true): void {
  const [xa, ya] = L.P(cola), [xb, yb] = L.P(punta);
  const dx = xb - xa, dy = yb - ya, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, nx = -uy, ny = ux;
  if (estela) L.trazo(xa, ya, xa - ux * 26, ya - uy * 26, 1.6, 0.6, [0.85, 0.85, 0.8], 0.28 * al, 0);
  // plumas
  const pl = (s: number, c: C) => L.poli([[xa + ux * 1, ya + uy * 1], [xa + ux * 7, ya + uy * 7], [xa + ux * 5 + nx * 2.6 * s, ya + uy * 5 + ny * 2.6 * s], [xa - ux * 0.5 + nx * 2.8 * s, ya - uy * 0.5 + ny * 2.8 * s]], c, al);
  pl(1, [0.62, 0.2, 0.14]); pl(-1, [0.86, 0.8, 0.68]);
  // asta
  L.capsula(xa, ya, xb - ux * 3, yb - uy * 3, 0.95, 0.95, [0.36, 0.24, 0.13], al);
  L.capsula(xa - nx * 0.3, ya - ny * 0.3, xb - ux * 3 - nx * 0.3, yb - uy * 3 - ny * 0.3, 0.4, 0.4, [0.66, 0.5, 0.3], al);
  // punta
  L.poli([[xb + ux * 2, yb + uy * 2], [xb - ux * 4 + nx * 2.3, yb - uy * 4 + ny * 2.3], [xb - ux * 3, yb - uy * 3], [xb - ux * 4 - nx * 2.3, yb - uy * 4 - ny * 2.3]], [0.42, 0.44, 0.48], al);
  L.poli([[xb + ux * 2, yb + uy * 2], [xb - ux * 4 + nx * 2.3 * Math.sign(-ny || 1), yb - uy * 4 + ny * 2.3 * Math.sign(-ny || 1)], [xb - ux * 3, yb - uy * 3]], [0.78, 0.8, 0.84], al);
}

/** fragmento de cristal (hielo) entre dos puntos de pantalla */
function cristal(L: Lienzo, xa: number, ya: number, xb: number, yb: number, w: number, a: number, pal: C[] = HIELO): void {
  const dx = xb - xa, dy = yb - ya, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  const mx = lerp(xa, xb, 0.38), my = lerp(ya, yb, 0.38);
  L.poli([[xa, ya], [mx + nx * w, my + ny * w], [xb, yb], [mx - nx * w, my - ny * w]], [0.5, 0.7, 0.9], a * 0.75);
  const s = ny > 0 ? -1 : 1; // la cara de arriba recibe luz
  L.poli([[xa, ya], [mx + nx * w * s, my + ny * w * s], [xb, yb]], [0.85, 0.95, 1], a * 0.8);
  L.trazo(xa, ya, xb, yb, 1.2, 0.6, pal[1], a * 0.5, a * 0.9);
}

/** curva de hueso (colmillo, púa) con luz de un lado */
function colmillo(L: Lienzo, pts: Pt[], anchos: number[], a = 1, c: C = [0.8, 0.76, 0.64]): void {
  const n = pts.length;
  const osc: C = [c[0] * 0.55, c[1] * 0.52, c[2] * 0.45], cla: C = [Math.min(1, c[0] * 1.17), Math.min(1, c[1] * 1.18), Math.min(1, c[2] * 1.22)];
  for (let i = 0; i < n - 1; i++) L.capsula(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], anchos[i] + 0.7, anchos[i + 1] + 0.7, osc, a);
  for (let i = 0; i < n - 1; i++) L.capsula(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], anchos[i], anchos[i + 1], c, a);
  for (let i = 0; i < n - 1; i++) {
    const o0 = anchos[i] * 0.4, o1 = anchos[i + 1] * 0.4;
    L.capsula(pts[i][0] - o0, pts[i][1] - o0 * 0.6, pts[i + 1][0] - o1, pts[i + 1][1] - o1 * 0.6, anchos[i] * 0.45, anchos[i + 1] * 0.45, cla, a);
  }
}

/** glifos de runas: trazos en [-1,1]² */
const RUNAS: number[][][] = [
  [[-1, -1, -1, 1], [-1, -1, 1, 0], [1, 0, -1, 1]],
  [[0, -1, 0, 1], [-1, -0.3, 1, -0.3], [-1, 0.6, 0, 1]],
  [[-1, 1, 0, -1], [0, -1, 1, 1], [-0.5, 0.2, 0.5, 0.2]],
  [[-1, -1, 1, -1], [1, -1, -1, 1], [-1, 1, 1, 1]],
  [[0, -1, 0, 1], [0, -0.2, -1, -1], [0, -0.2, 1, -1]],
  [[-1, -1, -1, 1], [1, -1, 1, 1], [-1, 0, 1, 0]],
  [[-1, 0, 0, -1], [0, -1, 1, 0], [1, 0, 0, 1], [0, 1, -1, 0]],
];
/** runa tumbada en el piso en (x, y), mirando hacia afuera del centro con ángulo `a` */
function runaPiso(L: Lienzo, g: number, x: number, y: number, a: number, s: number, c: C, k: number): void {
  const ca = Math.cos(a), sa = Math.sin(a);
  for (const [x0, y0, x1, y1] of RUNAS[g % RUNAS.length]) {
    // x de la runa a lo largo del círculo (tangente), y hacia afuera (radial)
    const w = (u: number, v: number): V3 => [x + (-sa * u + ca * v) * s, y + (ca * u + sa * v) * s, 0.5];
    L.rayo3(w(x0, -y0), w(x1, -y1), 0.75, 0.75, c, k);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// piezas premium: ondas que deforman, sangre, astillas, rayos de luz

/**
 * Onda de choque sobre el piso que parece deformar el aire: detrás del frente una banda oscura (aire comprimido, es
 * materia), el frente de luz roto por ruido (nunca un círculo perfecto), un filo caliente y un halo tenue afuera.
 */
function ondaChoque(L: Lienzo, rw: number, ancho: number, c: C, k: number, sem: number, oscuro = 0.3, p: V3 = [0, 0, 0]): void {
  if (k <= 0.01 || rw <= 0.5) return;
  const [x, y] = L.P([p[0], p[1], 0]);
  const R = rw * S2;
  // el frente se rompe en jirones: ruido de dos escalas que además corre con el radio (no gira igual en cada cuadro)
  const mod = (a: number) => 0.12 + 0.88 * suave(0.28, 0.72, fbm(Math.cos(a) * 3.2 + sem, Math.sin(a) * 3.2 + rw * 0.04));
  const mod2 = (a: number) => 0.3 + 0.7 * ruido(Math.cos(a) * 5 + sem * 1.7, Math.sin(a) * 5 - rw * 0.05);
  if (oscuro > 0) L.aro(x, y, R - ancho * 1.6, ancho * 1.6, [0.03, 0.025, 0.03], oscuro * Math.min(1, k * 1.4), 2, mod2);
  L.anillo(x, y, R * 1.05, ancho * 3.2, c, k * 0.16);
  L.anillo(x, y, R, ancho, c, k, 2, mod);
  L.anillo(x, y, R + ancho * 0.25, Math.max(0.6, ancho * 0.3), mezcla(c, BLANCO, 0.65), k * 0.9, 2, (a) => mod(a) * mod2(a));
}

/** onda en el aire (de frente a la cámara, apenas aplastada): el golpe que "empuja" la vista */
function ondaAire(L: Lienzo, x: number, y: number, r: number, ancho: number, c: C, k: number, sem: number): void {
  if (k <= 0.01 || r <= 0.5) return;
  // solo quedan arcos sueltos (nunca la burbuja entera), más fuertes a los costados que arriba y abajo
  const mod = (a: number) => suave(0.42, 0.78, fbm(Math.cos(a) * 3 + sem, Math.sin(a) * 3 + r * 0.05)) * (0.45 + 0.55 * Math.abs(Math.cos(a)));
  L.aro(x, y, r - ancho * 1.4, ancho * 1.3, [0.03, 0.025, 0.035], 0.2 * Math.min(1, k * 1.3), 1.12, mod);
  L.anillo(x, y, r, ancho, c, k * 0.8, 1.12, mod);
  L.anillo(x, y, r + ancho * 0.3, Math.max(0.6, ancho * 0.3), mezcla(c, BLANCO, 0.6), k * 0.6, 1.12, mod);
}

/** paletas de líquidos: brillo húmedo, cuerpo, sombra, mancha seca */
const SANGRE: C[] = [[0.86, 0.32, 0.27], [0.44, 0.02, 0.03], [0.26, 0.01, 0.018], [0.16, 0.008, 0.012]];
const BILIS: C[] = [[0.78, 1, 0.5], [0.3, 0.55, 0.06], [0.16, 0.32, 0.03], [0.1, 0.18, 0.03]];

/**
 * Salpicadura de líquido (sangre, bilis): gotas con gravedad que se estiran con la velocidad, cuajos gordos, brillo
 * húmedo arriba a la izquierda y manchas alargadas donde caen. `T` es el tiempo del efecto (0..~1).
 */
function salpicar(L: Lienzo, R: () => number, o: {
  n: number; C0: V3; T: number; vel: [number, number]; sube: [number, number]; g?: number; rumbo?: number; abre?: number;
  r?: [number, number]; pal?: C[]; manchas?: boolean; al?: number;
}): void {
  const pal = o.pal ?? SANGRE, g = o.g ?? 120, al = o.al ?? 1;
  const gs: { p: V3; q: V3; r: number; land: V3 | null; lt: number; a: number }[] = [];
  for (let i = 0; i < o.n; i++) {
    const a = o.rumbo === undefined ? R() * TAU : o.rumbo + (R() - 0.5) * 2 * (o.abre ?? 0.6);
    const sp = lerp(o.vel[0], o.vel[1], R()), up = lerp(o.sube[0], o.sube[1], R());
    const r = lerp(o.r?.[0] ?? 0.8, o.r?.[1] ?? 2, R() * R());
    const z0 = o.C0[2];
    const pos = (t: number): V3 => [o.C0[0] + Math.cos(a) * sp * t, o.C0[1] + Math.sin(a) * sp * t, z0 + up * sp * t - g * t * t];
    const b = up * sp, tl = (b + Math.sqrt(b * b + 4 * g * Math.max(0.1, z0))) / (2 * g);
    const t = Math.min(o.T, tl);
    gs.push({ p: pos(t), q: pos(Math.max(0, t - 0.016 - r * 0.006)), r, land: o.T >= tl ? pos(tl) : null, lt: o.T - tl, a });
  }
  if (o.manchas !== false)
    for (const g2 of gs) if (g2.land) {
      const [x, y] = L.P([g2.land[0], g2.land[1], 0]);
      const s = Math.min(1, g2.lt * 9 + 0.35);
      // la mancha se alarga hacia donde iba la gota
      const sx = Math.abs(Math.cos(g2.a - Math.PI / 4)) * 0.6 + 0.7;
      L.mancha(x, y, (1.2 + g2.r * 2.1) * s * sx, (0.7 + g2.r * 1.0) * s, pal[3], 0.9 * al, x * 0.13, y * 0.13, 0.75);
      if (g2.r > 1.4) L.mancha(x - 0.4, y - 0.3, (0.6 + g2.r) * s * sx, (0.35 + g2.r * 0.5) * s, pal[2], 0.8 * al, y * 0.2, x * 0.2, 0.6);
    }
  gs.sort((a, b) => a.p[0] + a.p[1] - b.p[0] - b.p[1]);
  for (const g2 of gs) if (!g2.land) {
    const [xa, ya] = L.P(g2.p), [xb, yb] = L.P(g2.q);
    L.capsula(xb, yb, xa, ya, g2.r * 0.45, g2.r, pal[2], al);
    L.capsula(lerp(xb, xa, 0.4), lerp(yb, ya, 0.4), xa, ya, g2.r * 0.3, g2.r * 0.75, pal[1], al);
    L.capsula(xa - g2.r * 0.3, ya - g2.r * 0.35, xa - g2.r * 0.3, ya - g2.r * 0.35, g2.r * 0.28, g2.r * 0.28, pal[0], al * 0.9);
  }
}

/** astillas de hueso que giran y caen (y quedan en el piso) */
function astillas(L: Lienzo, R: () => number, n: number, C0: V3, T: number, vel: [number, number], g = 110, c: C = [0.84, 0.8, 0.68], al = 1): void {
  const os: C = [c[0] * 0.5, c[1] * 0.47, c[2] * 0.42], cl: C = [Math.min(1, c[0] * 1.15), Math.min(1, c[1] * 1.15), Math.min(1, c[2] * 1.18)];
  const ps: { p: V3; ang: number; l: number; w: number; quieto: boolean }[] = [];
  for (let i = 0; i < n; i++) {
    const a = R() * TAU, sp = lerp(vel[0], vel[1], R()), up = 0.2 + R() * 1.1, spin = (R() - 0.5) * 30, l = 2 + R() * 4.5, w = 0.6 + R() * 0.7;
    const b = up * sp, tl = (b + Math.sqrt(b * b + 4 * g * Math.max(0.1, C0[2]))) / (2 * g);
    const t = Math.min(T, tl);
    ps.push({ p: [C0[0] + Math.cos(a) * sp * t, C0[1] + Math.sin(a) * sp * t, Math.max(0, C0[2] + b * t - g * t * t)], ang: R() * TAU + spin * t, l, w, quieto: T >= tl });
  }
  ps.sort((a, b) => a.p[0] + a.p[1] - b.p[0] - b.p[1]);
  for (const s of ps) {
    const [x, y] = L.P(s.p);
    const dx = Math.cos(s.ang) * s.l, dy = Math.sin(s.ang) * s.l * (s.quieto ? 0.5 : 1);
    L.capsula(x - dx / 2, y - dy / 2, x + dx / 2, y + dy / 2, s.w + 0.45, s.w * 0.3 + 0.35, os, al);
    L.capsula(x - dx / 2, y - dy / 2, x + dx / 2, y + dy / 2, s.w, s.w * 0.25, c, al);
    L.capsula(x - dx / 2 - 0.3, y - dy / 2 - 0.4, x + dx * 0.1 - 0.3, y + dy * 0.1 - 0.4, s.w * 0.35, s.w * 0.2, cl, al);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// hueso que se astilla y rayos que se ramifican

const MARFIL: C = [0.86, 0.81, 0.68];
const TUETANO: C = [0.24, 0.09, 0.07];
const TIERRA: C = [0.17, 0.13, 0.1];

/**
 * Esquirla de hueso de verdad: larga, angosta y quebrada (no un grano), con los bordes mellados, la boca partida en
 * dientes con el tuétano oscuro adentro y la punta en aguja. (x, y) es el medio; `ang` el rumbo en pantalla; `l` el
 * largo y `w` el medio ancho de la boca.
 */
function esquirla(L: Lienzo, R: () => number, x: number, y: number, ang: number, l: number, w: number, al = 1, plana = false): void {
  const ca = Math.cos(ang), sa = Math.sin(ang) * (plana ? 0.5 : 1), nx = -Math.sin(ang), ny = Math.cos(ang) * (plana ? 0.5 : 1);
  const P = (u: number, v: number): Pt => [x + ca * u * l + nx * v * w, y + sa * u * l + ny * v * w];
  // el ancho se mantiene en la mitad de atrás y se afila hasta la aguja; los bordes, mellados
  const an = (u: number) => (u < -0.05 ? 1 : Math.max(0, 1 - (u + 0.05) / 0.55));
  const us = [-0.5, -0.32, -0.14, 0.04, 0.2, 0.34];
  const arriba: Pt[] = us.map((u) => P(u, an(u) * (0.75 + R() * 0.45)));
  const abajo: Pt[] = us.map((u) => P(u, -an(u) * (0.75 + R() * 0.45))).reverse();
  // la boca partida: tres dientes desparejos
  const boca: Pt[] = [P(-0.5 - R() * 0.08, -0.45), P(-0.45, -0.05), P(-0.5 - R() * 0.1, 0.35)];
  const pts: Pt[] = [...arriba, P(0.5, (R() - 0.5) * 0.3), ...abajo, ...boca];
  // la sombra propia (un poco corrida abajo a la derecha), el cuerpo de marfil y el filo que mira a la luz
  L.poli(pts.map(([px, py]) => [px + 0.55, py + 0.65] as Pt), [0.16, 0.13, 0.1], al * 0.9);
  L.poli(pts, MARFIL, al);
  const luz = ny < 0 ? 1 : -1, [ax, ay] = P(-0.42, 0.55 * luz), [bx, by] = P(0.28, 0.25 * luz);
  L.capsula(ax, ay, bx, by, Math.max(0.45, w * 0.32), 0.3, [1, 0.97, 0.88], al * 0.8);
  // la veta a lo largo y el tuétano en la boca
  const [vx, vy] = P(-0.3, -0.25 * luz), [wx, wy] = P(0.15, -0.1 * luz);
  L.capsula(vx, vy, wx, wy, 0.35, 0.25, [0.6, 0.53, 0.42], al * 0.6);
  const [tx, ty] = P(-0.48, 0), [ux, uy] = P(-0.3, 0);
  L.capsula(tx, ty, ux, uy, Math.max(0.5, w * 0.42), 0.35, TUETANO, al);
}

/** lluvia de esquirlas: salen de C0 con velocidad `vel` (px por unidad de tiempo), giran, caen y quedan en el piso */
function esquirlas(L: Lienzo, R: () => number, n: number, C0: V3, T: number, vel: [number, number], g = 110, largo: [number, number] = [6, 11], al = 1): void {
  const ps: { p: V3; ang: number; l: number; w: number; quieto: boolean }[] = [];
  for (let i = 0; i < n; i++) {
    const a = R() * TAU, sp = lerp(vel[0], vel[1], R()), up = 0.25 + R() * 1.1, spin = (R() - 0.5) * 14, l = lerp(largo[0], largo[1], R()), w = Math.max(0.9, l * (0.09 + R() * 0.04));
    const b = up * sp, tl = (b + Math.sqrt(b * b + 4 * g * Math.max(0.1, C0[2]))) / (2 * g), t = Math.min(T, tl);
    ps.push({ p: [C0[0] + Math.cos(a) * sp * t, C0[1] + Math.sin(a) * sp * t, Math.max(0, C0[2] + b * t - g * t * t)], ang: R() * TAU + spin * t, l: l * (1 - 0.15 * Math.min(1, t * 2)), w, quieto: T >= tl });
  }
  ps.sort((a, b) => a.p[0] + a.p[1] - b.p[0] - b.p[1]);
  for (const s of ps) { const [x, y] = L.P(s.p); esquirla(L, R, x, y, s.ang, s.l, s.w, al, s.quieto); }
}

/** terrón o piedra suelta: polígono irregular de tierra con la cara de arriba más clara */
function terron(L: Lienzo, R: () => number, x: number, y: number, r: number, c: C = TIERRA, al = 1): void {
  const n = 5 + Math.floor(R() * 3), f = R() * TAU, pts: Pt[] = [];
  for (let i = 0; i < n; i++) { const t = f + (i / n) * TAU, rr = r * (0.65 + R() * 0.45); pts.push([x + Math.cos(t) * rr, y + Math.sin(t) * rr * 0.85]); }
  L.poli(pts, [c[0] * 0.55, c[1] * 0.5, c[2] * 0.48], al);
  L.poli(pts.map(([px, py]) => [x + (px - x) * 0.75 - r * 0.15, y + (py - y) * 0.6 - r * 0.25] as Pt), [c[0] * 1.5, c[1] * 1.45, c[2] * 1.4], al * 0.9);
}

/** grieta en el piso: un camino quebrado que se abre desde (x, y), oscuro, con un hilo de luz `brillo` en el fondo */
function grietaPiso(L: Lienzo, R: () => number, p: V3, ang: number, largo: number, ancho: number, crece: number, brillo?: C, kb = 0): void {
  if (crece <= 0.02) return;
  let q = p, a = ang;
  const n = 5;
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n;
    if (t0 > crece) break;
    a += (R() - 0.5) * 0.9;
    const seg = (largo / n) * Math.min(1, (crece - t0) * n), nq: V3 = [q[0] + Math.cos(a) * seg, q[1] + Math.sin(a) * seg, 0];
    const [xa, ya] = L.P(q), [xb, yb] = L.P(nq);
    L.capsula(xa, ya, xb, yb, ancho * (1 - t0 * 0.7), ancho * (1 - t1 * 0.7), [0.03, 0.025, 0.02], 0.9);
    if (brillo && kb > 0) L.trazo(xa, ya, xb, yb, 1.2, 0.8, brillo, kb * (1 - t0), kb * (1 - t1));
    // una rama corta a mitad de camino
    if (i === 2 && R() < 0.7) grietaPiso(L, R, nq, a + (R() < 0.5 ? -1 : 1) * (0.6 + R() * 0.5), largo * 0.35, ancho * 0.6, c01((crece - 0.5) * 2), brillo, kb * 0.6);
    q = nq;
  }
}

/**
 * Costilla o púa de hueso que sale del piso: quebrada y nudosa (no un colmillo liso), con el borde oscuro, la cara a la
 * luz, muescas y rajaduras de través, la base sucia de tierra y la punta astillada en dos.
 */
function costillaHueso(L: Lienzo, R: () => number, pts: Pt[], anchos: number[], a = 1, punta = 1): void {
  const n = pts.length, sucio = (i: number) => c01(1 - i / (n * 0.3));
  const col = (i: number, k: number): C => { const s = sucio(i); return [lerp(MARFIL[0], TIERRA[0] * 2.1, s) * k, lerp(MARFIL[1], TIERRA[1] * 2.1, s) * k, lerp(MARFIL[2], TIERRA[2] * 2.1, s) * k]; };
  const nudo = pts.map(() => 0.85 + R() * 0.3);
  for (let i = 0; i < n - 1; i++) L.capsula(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], anchos[i] * nudo[i] + 0.8, anchos[i + 1] * nudo[i + 1] + 0.8, [0.12, 0.1, 0.08], a);
  for (let i = 0; i < n - 1; i++) L.capsula(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], anchos[i] * nudo[i], anchos[i + 1] * nudo[i + 1], col(i, 0.82), a);
  for (let i = 0; i < n - 1; i++) {
    const o0 = anchos[i] * 0.42, o1 = anchos[i + 1] * 0.42;
    L.capsula(pts[i][0] - o0, pts[i][1] - o0 * 0.5, pts[i + 1][0] - o1, pts[i + 1][1] - o1 * 0.5, anchos[i] * 0.42, anchos[i + 1] * 0.42, col(i, 1.12), a * 0.9);
  }
  // muescas y rajaduras de través (en los nudos)
  for (let i = 2; i < n - 2; i++) {
    if (R() < 0.45) continue;
    const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1], l = Math.hypot(dx, dy) || 1, w = anchos[i] * 0.9;
    L.capsula(pts[i][0] - (dy / l) * w, pts[i][1] + (dx / l) * w, pts[i][0] + (dy / l) * w * 0.3, pts[i][1] - (dx / l) * w * 0.3, 0.45, 0.3, [0.22, 0.18, 0.13], a * 0.85);
  }
  // la punta astillada: dos agujas desparejas
  const [px, py] = pts[n - 1], [qx, qy] = pts[n - 2], dx = px - qx, dy = py - qy, l = Math.hypot(dx, dy) || 1;
  for (const s of [-1, 1]) {
    const e = (2 + R() * 3.5) * punta, ox = (-dy / l) * s * 0.6, oy = (dx / l) * s * 0.6;
    L.capsula(qx + ox, qy + oy, px + (dx / l) * e * (s > 0 ? 1 : 0.55) + ox * 1.6, py + (dy / l) * e * (s > 0 ? 1 : 0.55) + oy * 1.6, anchos[n - 2] * 0.45, 0.25, MARFIL, a);
  }
}

/** rayo con cuatro capas: aura ancha de color, halo, cuerpo y el alma blanca que quema */
function rayoHalo(L: Lienzo, pts: V3[], pal: C[], k: number, g = 1, k1 = k): void {
  const n = pts.length - 1;
  for (let i = 0; i < n; i++) {
    const [xa, ya] = L.P(pts[i]), [xb, yb] = L.P(pts[i + 1]);
    const ka = lerp(k, k1, i / n), kb = lerp(k, k1, (i + 1) / n);
    L.trazo(xa, ya, xb, yb, 13 * g, 13 * g, pal[3], ka * 0.07, kb * 0.07);
    L.trazo(xa, ya, xb, yb, 4.6 * g, 4.6 * g, pal[2], ka * 0.26, kb * 0.26);
    L.trazo(xa, ya, xb, yb, 1.7 * g, 1.7 * g, pal[1], ka * 0.8, kb * 0.8);
    L.trazo(xa, ya, xb, yb, 0.7 * g, 0.7 * g, BLANCO, ka * 1.6, kb * 1.6);
  }
}

/**
 * Rayo que se ramifica: el tronco quebrado y, desde puntos al azar del tronco, horquillas que salen en ángulo hacia
 * adelante y a su vez se parten (más finas y más tenues cada vez), como un relámpago de verdad.
 */
function rayoRamas(L: Lienzo, a: V3, b: V3, R: () => number, pal: C[], k: number, g: number, niv: number, rug: number, prof: number, fin = 0): void {
  const pts = zigzag(a, b, R, rug, niv);
  rayoHalo(L, pts, pal, k, g, k * fin);
  if (prof <= 0) return;
  const u = unit(sub(b, a)), len = largo(sub(b, a));
  const n1 = Math.abs(u[2]) > 0.9 ? [1, 0, 0] as V3 : unit(cruz(u, [0, 0, 1]));
  const nr = 1 + Math.floor(R() * (prof + 1.6));
  for (let i = 0; i < nr; i++) {
    const j = Math.floor(lerp(0.12, 0.75, R()) * (pts.length - 1)), o = pts[j], s = R() < 0.5 ? -1 : 1, an = 0.35 + R() * 0.65;
    const d = unit(add(add(mul(u, Math.cos(an)), mul(n1, Math.sin(an) * s)), [0, 0, (R() - 0.5) * 0.7]));
    const kk = k * lerp(1, k1Fin(fin), j / (pts.length - 1)) * (0.7 + R() * 0.2);
    rayoRamas(L, o, add(o, mul(d, len * (0.2 + R() * 0.3))), R, pal, kk, g * 0.62, Math.max(2, niv - 2), rug * 1.4, prof - 1, 0);
  }
}
const k1Fin = (fin: number) => 0.4 + fin * 0.6;

/** rayos de luz desparejos (god rays) desde un punto de pantalla: largos y anchos distintos, nunca una estrella perfecta */
function rayosLuz(L: Lienzo, R: () => number, x: number, y: number, n: number, largo: number, pal: C[], k: number, giro = 0): void {
  if (k <= 0.01) return;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + (R() - 0.5) * (TAU / n) * 0.8 + giro, l = largo * (0.35 + R() * 0.75), w = 1 + R() * 2.4, kk = k * (0.5 + R() * 0.6);
    const ex = x + Math.cos(a) * l, ey = y + Math.sin(a) * l * 0.85;
    L.trazo(x, y, ex, ey, w * 1.6, 0.5, pal[2], kk * 0.35, 0);
    L.trazo(x, y, lerp(x, ex, 0.7), lerp(y, ey, 0.7), w * 0.5, 0.4, pal[0], kk * 1.1, 0);
  }
}

/** brasas que caen despacio planeando (pavesas después de un golpe de luz o de fuego) */
function pavesas(L: Lienzo, R: () => number, n: number, C0: V3, v: number, rad: number, pal: C[], k: number): void {
  for (let i = 0; i < n; i++) {
    const a = R() * TAU, d = Math.sqrt(R()) * rad, z = C0[2] + 10 + R() * 30, ph = R() * TAU, t0 = R() * 0.3;
    const t = c01((v - t0) / (1 - t0));
    if (t <= 0) continue;
    const p: V3 = [C0[0] + Math.cos(a) * d * sale(t, 2) + Math.sin(t * 9 + ph) * 3, C0[1] + Math.sin(a) * d * sale(t, 2), Math.max(0, z * (1 - t * 0.8))];
    const [x, y] = L.P(p);
    const fl = 0.6 + 0.4 * Math.sin(t * 25 + ph);
    L.luz(x, y, 1.1, pal[0], k * fl * campana(t, 0, 0.1, 1) * 1.2);
    L.luz(x, y, 3, pal[2], k * fl * campana(t, 0, 0.1, 1) * 0.25);
  }
}

/** virote de ballesta: asta corta y gruesa, aletas de cuero rígidas, virola y punzón de hierro con filo que brilla */
function dibujaVirote(L: Lienzo, cola: V3, punta: V3, al = 1): void {
  const [xa, ya] = L.P(cola), [xb, yb] = L.P(punta);
  const dx = xb - xa, dy = yb - ya, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, nx = -uy, ny = ux;
  const aleta = (s: number, c: C) => L.poli([[xa + ux * 0.5, ya + uy * 0.5], [xa + ux * 5, ya + uy * 5], [xa + ux * 1.5 + nx * 2.3 * s, ya + uy * 1.5 + ny * 2.3 * s], [xa - ux * 0.5 + nx * 2.3 * s, ya - uy * 0.5 + ny * 2.3 * s]], c, al);
  aleta(1, [0.28, 0.2, 0.13]); aleta(-1, [0.52, 0.42, 0.3]);
  L.capsula(xa, ya, xb - ux * 4, yb - uy * 4, 1.25, 1.25, [0.22, 0.14, 0.08], al);
  L.capsula(xa - nx * 0.4, ya - ny * 0.4, xb - ux * 4 - nx * 0.4, yb - uy * 4 - ny * 0.4, 0.45, 0.45, [0.5, 0.37, 0.22], al);
  L.capsula(xb - ux * 5.2, yb - uy * 5.2, xb - ux * 3.4, yb - uy * 3.4, 1.65, 1.65, [0.28, 0.28, 0.31], al);
  const sg = Math.sign(-ny || 1);
  L.poli([[xb + ux * 3, yb + uy * 3], [xb - ux * 3.5 + nx * 2.6, yb - uy * 3.5 + ny * 2.6], [xb - ux * 2.4, yb - uy * 2.4], [xb - ux * 3.5 - nx * 2.6, yb - uy * 3.5 - ny * 2.6]], [0.32, 0.33, 0.38], al);
  L.poli([[xb + ux * 3, yb + uy * 3], [xb - ux * 3.5 + nx * 2.6 * sg, yb - uy * 3.5 + ny * 2.6 * sg], [xb - ux * 2.4, yb - uy * 2.4]], [0.76, 0.79, 0.85], al);
  L.trazo(xb + ux * 3, yb + uy * 3, xb - ux * 2, yb - uy * 2, 0.5, 0.4, BLANCO, 0.35 * al, 0);
}

/**
 * Golpe de luz sagrada (castigo e impacto sagrado): sello quemado, onda rota en el piso, fogonazo en capas, destello
 * en cruz de lente, rayos desparejos que giran, onda en el aire, pavesas doradas y chispas. `cielo`: además una
 * columna que baja de arriba en los primeros cuadros (la anticipación del castigo).
 */
function estallidoSagrado(c: Cx, s: number, cielo: boolean): void {
  const { L, v } = c, R = c.R(), C0: V3 = [0, 0, 32];
  const env = Math.pow(1 - v, 1.5), e = sale(v, 2.5);
  const [x, y] = L.P(C0), [cx, cy] = L.P([0, 0, 0]);
  L.mancha(cx, cy, 15 * s * sale(v * 3), 7.5 * s * sale(v * 3), [0.1, 0.07, 0.03], 0.45 * (1 - suave(0.7, 1, v)), 2, 5, 0.5);
  L.piso([0, 0, 0], 30 * s, SAGRADO[2], 0.8 * env);
  ondaChoque(L, (10 + 44 * e) * s, 2.5 + 3 * v, SAGRADO[1], 0.9 * Math.pow(1 - v, 1.8), 4.4, 0.22);
  if (cielo) {
    const k = 1 - suave(0.05, 0.5, v);
    L.rayo3([0, 0, 0], [0, 0, 130], 9 * s, 16 * s, SAGRADO[3], 0.35 * k, 0);
    L.rayo3([0, 0, 0], [0, 0, 124], 3.5 * s, 6 * s, SAGRADO[1], 0.7 * k, 0);
    L.rayo3([0, 0, 0], [0, 0, 112], 1.2 * s, 2.2 * s, BLANCO, 1.3 * k, 0);
  }
  L.luz(x, y, 36 * s, SAGRADO[3], 0.55 * env);
  L.luz(x, y, 14 * s, SAGRADO[1], 1.4 * env);
  L.luz(x, y, 5 * s, SAGRADO[0], 3 * Math.pow(1 - v, 2.2));
  const kc = Math.pow(1 - v, 2.4), lh = 44 * s * (0.6 + e), lv = 16 * s * (0.6 + e);
  for (const sd of [-1, 1]) {
    L.trazo(x, y, x + sd * lh, y, 1.6, 0.4, SAGRADO[1], 0.8 * kc, 0);
    L.trazo(x, y, x + sd * lh * 0.6, y, 0.6, 0.3, BLANCO, 1.2 * kc, 0);
    L.trazo(x, y, x, y + sd * lv, 1.2, 0.4, SAGRADO[1], 0.7 * kc, 0);
  }
  rayosLuz(L, rng(c.sem + 77), x, y, 13, 44 * s * (0.5 + e), SAGRADO, 1.1 * env, v * 0.6);
  ondaAire(L, x, y, (6 + 34 * e) * s, 1.8 + 2 * v, SAGRADO[1], 0.8 * env, 2.9);
  pavesas(L, c.R(3), 18, C0, v, 34 * s, SAGRADO, 1);
  for (let i = 0; i < 14; i++) {
    const a = R() * TAU, up = R() - 0.2, sp = (40 + R() * 40) * s;
    const pos = (t: number): V3 => [Math.cos(a) * sp * t, Math.sin(a) * sp * t, 32 + up * sp * t - 50 * t * t];
    const p0 = pos(v * 0.9), p1 = pos(Math.max(0, v * 0.9 - 0.06));
    if (p0[2] > 0) L.rayo3(p0, p1, 0.8, 0.5, SAGRADO[0], 1.4 * (1 - v), 0);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// los efectos

interface Def {
  id: string;
  nombre: [string, string];
  elemento: Elemento;
  tipo: TipoPoder;
  cuadros: number;
  t: number;
  dir?: boolean;
  bucle?: boolean;
  /** caja fija en el lienzo (si no, se mide): para cambiar el dibujo de un poder sin mover su celda ni su ancla */
  caja?: { x0: number; y0: number; w: number; h: number };
  pinta: (c: Cx) => void;
}

const ALTO_VUELO = 34;
const POLVO: C = [0.42, 0.36, 0.28];

const DEFS: Def[] = [
  // ============================== fuego
  {
    id: 'saeta_fuego', nombre: ['Saeta de fuego', 'Fire bolt'], elemento: 'fuego', tipo: 'proyectil', cuadros: 6, t: 2, dir: true, bucle: true,
    pinta: (c) => {
      const { L } = c, z = ALTO_VUELO, ph = c.u * TAU;
      const H = c.fw(7, 0, z);
      L.piso(H, 14, FUEGO[2], 0.3);
      const R = c.R();
      for (let i = 0; i < 4; i++) {
        const t = frac(c.u + i / 4);
        L.humo3(c.fw(-16 - t * 26, (R() - 0.5) * 6, z + 2 + t * 8), 3 + t * 6, [0.14, 0.11, 0.1], 0.3 * (1 - t), i * 3, t);
      }
      for (let i = 0; i < 14; i++) {
        const s = i / 13;
        const ond = Math.sin(s * 6 - ph * 2) * s * 3.2;
        L.bola(c.fw(7 - s * 30, ond, z + Math.cos(s * 5 - ph * 2) * s * 2 + s * 3), 4.6 * (1 - s) + 1.2, rampa(FUEGO, 0.3 + s * 0.7), 0.36 * Math.pow(1 - s, 1.2));
      }
      L.rayo3(H, c.fw(-18, 0, z + 1), 1.6, 0.6, FUEGO[1], 0.7, 0);
      // núcleo en capas: halo rojo oscuro, cuerpo naranja, corazón casi blanco que late
      L.bola(H, 22, FUEGO[3], 0.25);
      L.bola(H, 15, FUEGO[3], 0.35);
      L.bola(H, 8, FUEGO[2], 0.9 * (0.92 + 0.08 * Math.sin(ph * 2)));
      L.bola(c.fw(8, 0, z), 4, FUEGO[1], 1.0);
      L.bola(c.fw(8.5, 0, z), 2, FUEGO[0], 1.6 * (0.9 + 0.1 * Math.sin(ph * 4)));
      for (let i = 0; i < 10; i++) {
        const t = frac(c.u * 2 + R()), l = (R() - 0.5) * 12, zz = (R() - 0.5) * 7;
        const p = c.fw(-2 - t * 36, l * t, z + zz * t + t * 6), q = c.fw(-5 - t * 36, l * t, z + zz * t + t * 6);
        L.rayo3(p, q, 0.8, 0.5, rampa(FUEGO, 0.1 + t * 0.6), 1.4 * (1 - t), 0);
      }
    },
  },
  {
    id: 'bola_fuego', nombre: ['Bola de fuego', 'Fireball'], elemento: 'fuego', tipo: 'proyectil', cuadros: 8, t: 2, dir: true, bucle: true,
    pinta: (c) => {
      const { L } = c, z = ALTO_VUELO, ph = c.u * TAU;
      const H = c.fw(8, 0, z), R = c.R();
      L.piso(H, 22, FUEGO[2], 0.4);
      for (let i = 0; i < 6; i++) {
        const t = frac(c.u + i / 6);
        L.humo3(c.fw(-10 - t * 34, (R() - 0.5) * 10, z + 4 + t * 12), 4 + t * 9, [0.13, 0.1, 0.09], 0.38 * campana(t, 0, 0.15, 1), i * 3, t * 0.7);
      }
      for (let i = 0; i < 18; i++) {
        const s = i / 17;
        const ond = Math.sin(s * 5 - ph) * s * 5, ond2 = Math.cos(s * 4 - ph) * s * 3;
        L.bola(c.fw(4 - s * 40, ond, z + ond2 + s * 4), 7 * Math.pow(1 - s, 0.8) + 1.5, rampa(FUEGO, 0.35 + s * 0.65), 0.3 * Math.pow(1 - s, 1.1));
      }
      const [hx, hy] = L.P(H);
      L.luz(hx, hy, 34, FUEGO[3], 0.45);
      L.luz(hx, hy, 19, FUEGO[2], 0.85);
      for (let i = 0; i < 14; i++) {
        const a = R() * TAU + ph * (i % 2 ? 1 : -1), rr = 6 + R() * 4;
        L.luz(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr * 0.9, 4 + R() * 2.5, rampa(FUEGO, 0.3 + R() * 0.6), 0.42);
      }
      L.luz(hx, hy, 11, FUEGO[1], 0.75);
      const k = c.fw(9.5, 0, z + 1);
      L.bola(k, 6, FUEGO[1], 0.8);
      L.bola(k, 3, FUEGO[0], 1.4);
      for (let i = 0; i < 14; i++) {
        const t = frac(c.u * 2 + R()), l = (R() - 0.5) * 18, zz = (R() - 0.5) * 12;
        const p = c.fw(-t * 44, l * t, z + zz * t + t * 9), q = c.fw(-3 - t * 44, l * t, z + zz * t + t * 9);
        L.rayo3(p, q, 0.85, 0.5, rampa(FUEGO, 0.1 + t * 0.6), 1.5 * (1 - t), 0);
      }
    },
  },
  {
    id: 'explosion_fuego', nombre: ['Explosión de fuego', 'Fire explosion'], elemento: 'fuego', tipo: 'impacto', cuadros: 14, t: 2,
    pinta: (c) => explosion(c.L, c.R(), c.v, 1),
  },
  {
    id: 'muro_llamas', nombre: ['Muro de llamas (tramo)', 'Flame wall segment'], elemento: 'fuego', tipo: 'muro', cuadros: 10, t: 2, bucle: true,
    pinta: (c) => {
      const { L } = c, R = c.R();
      L.piso([0, 0, 0], 26, FUEGO[2], 0.75);
      L.piso([0, 0, 0], 12, FUEGO[1], 0.6);
      humareda(L, c.R(5), 5, 0, 0, 10, 40, 40, c.u, 0.22, [0.12, 0.1, 0.09], 5, 13);
      const ls: [number, number, number, number, number][] = [];
      for (let i = 0; i < 11; i++) {
        const a = (i / 11) * TAU + R() * 0.6, rr = 3 + R() * 12;
        ls.push([Math.cos(a) * rr, Math.sin(a) * rr, 26 + R() * 30, 6.5 + R() * 3.5, R()]);
      }
      ls.sort((a, b) => a[0] + a[1] - b[0] - b[1]);
      for (const [x, y, h, w, ph] of ls) llama(L, x, y, 0, h, w, frac(c.u + ph), 0.42);
      brasas(L, c.R(7), 12, 0, 0, 12, 10, 70, c.u, 1);
    },
  },
  {
    id: 'meteoro', nombre: ['Meteoro', 'Meteor'], elemento: 'fuego', tipo: 'lluvia', cuadros: 18, t: 2,
    pinta: (c) => {
      const { L, v } = c;
      const vi = 8 / 17; // cuadro del golpe
      const ini: V3 = [-70, -40, 230];
      if (v < vi) {
        const s = v / vi, ps = Math.pow(s, 1.3);
        const pos = mix3(ini, [0, 0, 0], ps);
        // aviso en el piso
        L.piso([0, 0, 0], 8 + 22 * s, FUEGO[2], 0.25 + 0.6 * s);
        L.aroPiso([0, 0, 0], 26 - 8 * s, 1.5, FUEGO[2], 0.5 * s);
        const back = unit(sub(ini, [0, 0, 0]));
        const R = c.R(1);
        for (let i = 0; i < 6; i++) {
          const t = frac(i / 6 + s * 2);
          L.humo3(add(pos, mul(back, 14 + t * 60)), 5 + t * 10, [0.14, 0.11, 0.1], 0.5 * (1 - t), i * 2.1, t);
        }
        for (let i = 0; i < 16; i++) {
          const q = i / 15;
          const p = add(pos, add(mul(back, q * 70), [Math.sin(q * 9 + s * 20) * q * 4, 0, 0]));
          L.bola(p, 10 * Math.pow(1 - q, 0.7) + 2, rampa(FUEGO, 0.15 + q * 0.85), 1.1 * Math.pow(1 - q, 1.1));
        }
        L.bola(pos, 26, FUEGO[3], 0.45);
        L.bola(pos, 12, FUEGO[2], 1.2);
        // la roca
        const [x, y] = L.P(pos);
        const rr = c.R(3), roca: Pt[] = [];
        for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU; const r = 5.5 + rr() * 2.5; roca.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
        L.poli(roca, [0.2, 0.1, 0.07], 1);
        L.poli(roca.map(([px, py]) => [lerp(x, px, 0.6) - 1, lerp(y, py, 0.6) - 1] as Pt), [0.32, 0.16, 0.09], 1);
        L.luz(x + 2, y + 3, 4, FUEGO[1], 1.3);
        L.luz(x + 3, y + 4, 1.8, FUEGO[0], 1.5);
        for (let i = 0; i < 12; i++) {
          const t = frac(R() + s * 3), off: V3 = [(R() - 0.5) * 14, (R() - 0.5) * 14, (R() - 0.5) * 10];
          const p = add(add(pos, mul(back, 10 + t * 50)), mul(off, t));
          L.rayo3(p, add(p, mul(back, 5)), 0.8, 0.5, FUEGO[1], 1.3 * (1 - t), 0);
        }
      } else {
        const t = (v - vi) / (1 - vi);
        explosion(L, c.R(9), t, 1.45);
        L.mancha(L.P([0, 0, 0])[0], L.P([0, 0, 0])[1], 34 * sale(t * 3), 17 * sale(t * 3), [0.08, 0.05, 0.04], 0.5 * suave(0, 0.3, t), 2, 3);
      }
    },
  },
  {
    id: 'crater_ardiente', nombre: ['Cráter ardiente', 'Burning crater'], elemento: 'fuego', tipo: 'area', cuadros: 10, t: 2, bucle: true,
    pinta: (c) => {
      const { L } = c, [cx, cy] = L.P([0, 0, 0]), R = c.R();
      const pul = 0.85 + 0.15 * Math.sin(c.u * TAU);
      L.mancha(cx, cy, 44, 22, [0.07, 0.05, 0.045], 0.9, 1.3, 2.1, 0.5);
      L.mancha(cx, cy - 1, 30, 15, [0.04, 0.025, 0.02], 0.9, 4.1, 0.7, 0.4);
      // grietas encendidas
      for (let i = 0; i < 8; i++) {
        let a = (i / 8) * TAU + R() * 0.5;
        const r0 = 5 + R() * 5;
        let x = Math.cos(a) * r0, y = Math.sin(a) * r0;
        const n = 3 + Math.floor(R() * 3);
        for (let j = 0; j < n; j++) {
          const st = 3 + R() * 3;
          a += (R() - 0.5) * 1.3;
          const nx = x + Math.cos(a) * st, ny = y + Math.sin(a) * st;
          const k = (1 - j / n) * 0.6 * pul;
          L.rayo3([x, y, 0], [nx, ny, 0], 1.2, 0.9, FUEGO[1], k * 1.2, k);
          L.rayo3([x, y, 0], [nx, ny, 0], 3.5, 3, FUEGO[3], k * 0.3, k * 0.25);
          x = nx; y = ny;
        }
      }
      L.piso([0, 0, 0], 12, FUEGO[1], 0.9 * pul);
      L.piso([0, 0, 0], 30, FUEGO[3], 0.5);
      humareda(L, c.R(4), 6, 0, 0, 14, 16, 46, c.u, 0.3, [0.11, 0.09, 0.08], 6, 15);
      const ls: [number, number, number, number, number][] = [];
      for (let i = 0; i < 6; i++) { const a = R() * TAU, rr = 3 + R() * 14; ls.push([Math.cos(a) * rr, Math.sin(a) * rr, 12 + R() * 14, 3 + R() * 2.5, R()]); }
      ls.sort((a, b) => a[0] + a[1] - b[0] - b[1]);
      for (const [x, y, h, w, ph] of ls) llama(L, x, y, 0, h, w, frac(c.u + ph), 0.8);
      brasas(L, c.R(8), 10, 0, 0, 16, 4, 50, c.u, 0.9);
    },
  },
  {
    id: 'aliento_infernal', nombre: ['Aliento infernal', 'Inferno breath'], elemento: 'fuego', tipo: 'rayo', cuadros: 8, t: 2, dir: true, bucle: true,
    pinta: (c) => {
      const { L } = c, R = c.R();
      for (let i = 0; i < 7; i++) L.piso(c.fw(18 + i * 16, 0, 0), 8 + i * 4, FUEGO[2], 0.28);
      const ps: { a: number; g: number; z: number; r: number; k: number }[] = [];
      for (let i = 0; i < 120; i++) {
        const a = frac(c.u * 2 + i / 120 + R() * 0.05);
        ps.push({ a, g: (R() - 0.5) * 0.62 * Math.sqrt(a + 0.03), z: R() - 0.5, r: R(), k: R() });
      }
      const pos = (p: { a: number; g: number; z: number }) => c.fwr(p.g, 10 + p.a * 112, 0, 40 - p.a * 18 + p.z * p.a * 18);
      // humo en la punta, detrás del fuego
      for (const p of ps) if (p.a > 0.5 && p.k > 0.7) {
        const q = (p.a - 0.5) / 0.5;
        L.humo3(add(pos(p), [0, 0, q * 14]), 8 + q * 10, [0.2, 0.16, 0.14], 0.4 * Math.sin(q * Math.PI), p.r * 9, p.a);
      }
      // chorro continuo cerca de la boca
      L.rayo3(c.fw(10, 0, 40), c.fw(60, 0, 31), 3, 9, FUEGO[1], 0.7, 0.15);
      L.rayo3(c.fw(10, 0, 40), c.fw(40, 0, 35), 1.4, 3, FUEGO[0], 0.9, 0);
      for (const p of ps) {
        const k = 0.42 * Math.pow(1 - p.a, 0.8) * suave(0, 0.05, p.a);
        L.bola(pos(p), 3.5 + p.a * 15 * (0.7 + p.r * 0.6), rampa(FUEGO, 0.15 + p.a * 0.85 + p.r * 0.1), k);
      }
      for (let i = 0; i < 14; i++) {
        const t = frac(c.u * 2 + R()), g = (R() - 0.5) * 0.8;
        const p = c.fwr(g, 20 + t * 110, 0, 38 - t * 10 + R() * 10), q = c.fwr(g, 15 + t * 110, 0, 38 - t * 10);
        L.rayo3(p, q, 0.8, 0.5, FUEGO[1], 1.3 * (1 - t), 0);
      }
      const M = c.fw(10, 0, 40);
      L.bola(M, 6, FUEGO[0], 1.1);
      L.bola(M, 14, FUEGO[2], 0.5);
    },
  },

  // ============================== hielo
  {
    id: 'saeta_hielo', nombre: ['Saeta de hielo', 'Ice bolt'], elemento: 'hielo', tipo: 'proyectil', cuadros: 6, t: 2, dir: true, bucle: true,
    pinta: (c) => {
      const { L } = c, z = ALTO_VUELO, R = c.R(), ph = c.u * TAU;
      const H = c.fw(6, 0, z);
      L.piso(H, 14, HIELO[2], 0.3);
      for (let i = 0; i < 5; i++) {
        const t = frac(c.u + i / 5);
        L.humo3(c.fw(-6 - t * 30, (R() - 0.5) * 8, z + (R() - 0.5) * 4), 3 + t * 6, [0.62, 0.78, 0.95], 0.22 * (1 - t), i * 2, t);
      }
      L.rayo3(c.fw(4, 0, z), c.fw(-30, 0, z), 3.2, 0.8, HIELO[2], 0.75, 0);
      L.rayo3(c.fw(4, 0, z), c.fw(-20, 0, z), 1.3, 0.5, HIELO[1], 1.1, 0);
      L.bola(H, 20, HIELO[3], 0.55);
      L.bola(H, 10, HIELO[2], 0.7);
      const [xa, ya] = L.P(c.fw(-8, 0, z)), [xb, yb] = L.P(c.fw(16, 0, z));
      cristal(L, xa, ya, xb, yb, 4.6, 1);
      L.bola(c.fw(10, 0, z), 2.2, HIELO[0], 1.6 * (0.85 + 0.15 * Math.sin(ph * 2)));
      for (let i = 0; i < 7; i++) {
        const t = frac(c.u + R()), l = (R() - 0.5) * 12, zz = (R() - 0.5) * 9;
        const [x, y] = L.P(c.fw(-4 - t * 32, l * t, z + zz * t));
        destello(L, x, y, 2.5 + R() * 2, HIELO[0], 0.9 * Math.sin(t * Math.PI));
      }
    },
  },
  {
    id: 'estallido_esquirlas', nombre: ['Estallido de esquirlas', 'Ice shard burst'], elemento: 'hielo', tipo: 'impacto', cuadros: 10, t: 2,
    pinta: (c) => {
      const { L, v } = c, R = c.R(), C0: V3 = [0, 0, 24];
      const e = sale(v, 2.5), fin = 1 - suave(0.55, 1, v);
      L.piso([0, 0, 0], 16 + 34 * e, HIELO[2], 0.5 * (1 - v));
      for (let i = 0; i < 12; i++) {
        const a = R() * TAU, d = (0.6 + R() * 0.4) * 40 * e;
        L.humo3([Math.cos(a) * d, Math.sin(a) * d, 24 + (R() - 0.5) * 20 * e], 6 + 8 * e, [0.7, 0.85, 1], 0.3 * (1 - v), i * 2.7, v);
      }
      if (v < 0.35) { const k = 1 - v / 0.35; L.bola(C0, 22, HIELO[2], 1.2 * k); L.bola(C0, 8, HIELO[0], 2.4 * k); }
      const sh: { p: V3; q: V3; w: number }[] = [];
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * TAU + R() * 0.3, up = (R() - 0.35) * 0.7, sp = 45 + R() * 35;
        const dv = unit([Math.cos(a), Math.sin(a), up]);
        const d = sp * e;
        const p = add(C0, add(mul(dv, d), [0, 0, -16 * v * v]));
        sh.push({ p, q: add(p, mul(dv, 8 + R() * 6)), w: 2 + R() * 1.6 });
      }
      sh.sort((a, b) => a.p[0] + a.p[1] - b.p[0] - b.p[1]);
      for (const s of sh) {
        const [xa, ya] = L.P(s.p), [xb, yb] = L.P(s.q);
        L.trazo(xa, ya, xa - (xb - xa) * 1.1, ya - (yb - ya) * 1.1, 1.6, 0.5, HIELO[1], 0.5 * fin * (1 - v * 0.6), 0);
        cristal(L, xa, ya, xb, yb, s.w, fin);
      }
      for (let i = 0; i < 8; i++) {
        const a = R() * TAU, d = R() * 50 * e, t = R();
        const [x, y] = L.P([Math.cos(a) * d, Math.sin(a) * d, 24 + (R() - 0.5) * 30]);
        destello(L, x, y, 3, HIELO[0], Math.max(0, Math.sin((v * 3 + t) * Math.PI)) * fin);
      }
    },
  },
  {
    id: 'nova_escarcha', nombre: ['Nova de escarcha', 'Frost nova'], elemento: 'hielo', tipo: 'area', cuadros: 14, t: 2,
    pinta: (c) => {
      const { L, v } = c, R = c.R();
      const e = sale(v, 2), Rw = 6 + 79 * e, fade = Math.pow(1 - v, 0.7) * suave(0, 0.08, v + 0.04);
      L.piso([0, 0, 0], Rw * 0.95, HIELO[3], 0.22 * fade);
      L.aroPiso([0, 0, 0], Rw * 0.97, 12 + 8 * v, HIELO[3], 0.35 * fade);
      L.aroPiso([0, 0, 0], Rw, 3.5 + 3 * v, HIELO[1], 1.1 * fade);
      L.aroPiso([0, 0, 0], Rw, 1.2, HIELO[0], 0.8 * fade);
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * TAU + R() * 0.2;
        L.humo3([Math.cos(a) * Rw * 0.96, Math.sin(a) * Rw * 0.96, 4], 7 + 5 * v, [0.72, 0.86, 1], 0.28 * fade, i * 1.9, v * 2);
      }
      const cs: { a: number; h: number; o: number; t: number }[] = [];
      for (let i = 0; i < 64; i++) cs.push({ a: (i / 64) * TAU + (R() - 0.5) * 0.08, h: 5 + R() * 10, o: (R() - 0.5) * 6, t: R() });
      cs.sort((p, q) => Math.cos(p.a) + Math.sin(p.a) - Math.cos(q.a) - Math.sin(q.a));
      for (const s of cs) {
        const r = Rw + s.o, ca = Math.cos(s.a), sa = Math.sin(s.a);
        const h = s.h * (0.6 + 0.4 * fade);
        const [xa, ya] = L.P([ca * r, sa * r, 0]), [xb, yb] = L.P([ca * (r + h * 0.4), sa * (r + h * 0.4), h]);
        cristal(L, xa, ya, xb, yb, 1.7, fade);
        if (s.t > 0.8) destello(L, xb, yb, 3, HIELO[0], fade * Math.max(0, Math.sin((v * 4 + s.t * 3) * Math.PI)));
      }
    },
  },
  {
    id: 'ventisca', nombre: ['Ventisca', 'Blizzard'], elemento: 'hielo', tipo: 'lluvia', cuadros: 12, t: 2, bucle: true,
    pinta: (c) => {
      const { L } = c, R = c.R();
      L.piso([0, 0, 0], 60, HIELO[3], 0.3);
      // copos que giran
      for (let i = 0; i < 46; i++) {
        const a0 = R() * TAU, rr = 10 + R() * 55, z = R() * 70, sp = R() < 0.5 ? 1 : 2;
        const a = a0 + c.u * TAU * sp * 0.25 * (R() < 0.5 ? 1 : -1);
        const zz = (z - c.u * 70 * sp + 140) % 70;
        const [x, y] = L.P([Math.cos(a) * rr, Math.sin(a) * rr, zz]);
        L.luz(x, y, 1, BLANCO, 0.6 * suave(0, 12, zz));
      }
      const tr: { x: number; y: number; ph: number; s: number }[] = [];
      for (let i = 0; i < 20; i++) { const a = R() * TAU, rr = Math.sqrt(R()) * 52; tr.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr, ph: R(), s: 0.8 + R() * 0.5 }); }
      tr.sort((a, b) => a.x + a.y - b.x - b.y);
      for (const t of tr) {
        const q = frac(c.u + t.ph);
        if (q < 0.7) {
          const s = q / 0.7, h = 170 * (1 - s);
          const p: V3 = [t.x - h * 0.22, t.y - h * 0.22, h], tail: V3 = [p[0] - 9, p[1] - 9, p[2] + 40];
          L.rayo3(p, tail, 1.8, 0.4, HIELO[1], 0.75 * suave(0, 0.15, s), 0);
          const [xa, ya] = L.P(tail.map((v2, k) => lerp(p[k], v2, 0.25)) as V3), [xb, yb] = L.P(p);
          cristal(L, xa, ya, xb, yb, 3.2 * t.s, suave(0, 0.12, s));
          L.piso([t.x, t.y, 0], 6, HIELO[2], 0.4 * s * s);
        } else {
          const s = (q - 0.7) / 0.3;
          const [x, y] = L.P([t.x, t.y, 0]);
          L.humo(x, y - 4 - s * 6, 5 + s * 8, [0.75, 0.88, 1], 0.45 * (1 - s), t.ph * 9, s);
          L.anillo(x, y, 4 + s * 14, 1.5, HIELO[1], 0.9 * (1 - s));
          L.luz(x, y - 2, 6, HIELO[1], 1.2 * (1 - s) * (1 - s));
          for (let k = 0; k < 4; k++) {
            const a = (k / 4) * TAU + t.ph * 5, d = s * 10;
            const [qx, qy] = L.P([t.x + Math.cos(a) * d, t.y + Math.sin(a) * d, 8 * s * (1 - s) * 4]);
            L.luz(qx, qy, 1.2, HIELO[0], 0.9 * (1 - s));
          }
        }
      }
    },
  },
  {
    id: 'coraza_helada', nombre: ['Coraza helada', 'Frozen shell'], elemento: 'hielo', tipo: 'aura', cuadros: 8, t: 3, bucle: true,
    pinta: (c) => {
      const { L } = c, R = c.R();
      const [cx, cy] = L.P([0, 0, 0]);
      L.piso([0, 0, 0], 28, HIELO[2], 0.45);
      L.mancha(cx, cy, 36, 18, [0.6, 0.76, 0.9], 0.5, 1, 2, 0.6);
      const banda = frac(c.u) * 110 - 20;
      const pr: { a: number; r: number; h: number; w: number; t: number; lean: number }[] = [];
      for (let i = 0; i < 10; i++) pr.push({ a: (i / 10) * TAU + R() * 0.3, r: 13 + R() * 5, h: 44 + R() * 26, w: 5 + R() * 3, t: R(), lean: 0.25 + R() * 0.3 });
      for (let i = 0; i < 8; i++) pr.push({ a: R() * TAU, r: 18 + R() * 6, h: 12 + R() * 14, w: 3 + R() * 2, t: R(), lean: 0.5 + R() * 0.4 });
      pr.sort((p, q) => Math.cos(p.a) + Math.sin(p.a) - Math.cos(q.a) - Math.sin(q.a));
      for (const s of pr) {
        const ca = Math.cos(s.a), sa = Math.sin(s.a), frente = ca + sa > 0.3;
        // prisma: base ancha en el piso, cuerpo que se inclina hacia el eje, punta biselada
        const base: V3 = [ca * s.r, sa * s.r, 0], cuello: V3 = [ca * s.r * (1 - s.lean * 0.6), sa * s.r * (1 - s.lean * 0.6), s.h * 0.78], tip: V3 = [ca * s.r * (1 - s.lean), sa * s.r * (1 - s.lean), s.h];
        const [bx, by] = L.P(base), [nx, ny] = L.P(cuello), [tx, ty] = L.P(tip);
        const w = s.w;
        const al = frente ? 0.32 : 0.6;
        // cara izquierda (recibe luz) y derecha (en sombra)
        L.poli([[bx - w, by], [bx, by + w * 0.35], [nx, ny + w * 0.3], [tx, ty], [nx - w * 0.85, ny]], [0.62, 0.8, 0.95], al);
        L.poli([[bx, by + w * 0.35], [bx + w, by], [nx + w * 0.85, ny], [tx, ty], [nx, ny + w * 0.3]], [0.25, 0.42, 0.66], al);
        const zb = (banda - s.h * 0.55) / 16, g = Math.exp(-zb * zb * 3);
        L.trazo(bx - w, by, nx - w * 0.85, ny, 0.6, 0.6, HIELO[0], 0.3 + 0.5 * g);
        L.trazo(nx - w * 0.85, ny, tx, ty, 0.6, 0.5, HIELO[0], 0.7 + 0.6 * g);
        L.trazo(bx, by + w * 0.35, nx, ny + w * 0.3, 0.55, 0.55, HIELO[1], 0.35 + 0.6 * g);
        L.trazo(nx, ny + w * 0.3, tx, ty, 0.55, 0.5, HIELO[1], 0.45 + 0.6 * g);
        L.luz(lerp(bx, nx, 0.5), lerp(by, ny, 0.5), w * 1.4, HIELO[2], 0.12 + 0.3 * g, 0.6, 1.6);
        if (s.t > 0.7) destello(L, tx, ty, 3.5, HIELO[0], 0.9 * Math.max(0, Math.sin((c.u * 2 + s.t * 4) * Math.PI)));
      }
      humareda(L, c.R(3), 7, 0, 0, 20, 0, 14, c.u, 0.3, [0.72, 0.86, 1], 6, 11);
    },
  },

  // ============================== rayo
  {
    id: 'arco_cadena', nombre: ['Arco en cadena', 'Chain lightning arc'], elemento: 'rayo', tipo: 'rayo', cuadros: 6, t: 1, dir: true, bucle: true,
    pinta: (c) => {
      const { L } = c, R = rng(c.sem + c.f * 7919);
      const A: V3 = [0, 0, 32], B = c.fw(110, 0, 32);
      const fl = 0.8 + R() * 0.4;
      L.piso(A, 14, RAYO[2], 0.4 * fl); L.piso(B, 18, RAYO[2], 0.5 * fl);
      for (let i = 1; i < 6; i++) L.piso(c.fw(i * 18, 0, 0), 12, RAYO[3], 0.15 * fl);
      const pts = zigzag(A, B, R, 0.11, 6);
      dibujaRayo(L, pts, RAYO, fl);
      for (let j = 0; j < 3; j++) {
        const k = 4 + Math.floor(R() * (pts.length - 8));
        const o = pts[k], d: V3 = [(R() - 0.5) * 30, (R() - 0.5) * 30, (R() - 0.5) * 24];
        dibujaRayo(L, zigzag(o, add(o, d), R, 0.25, 4), RAYO, fl * 0.7, 0.6, 0);
      }
      for (const p of [A, B]) { L.bola(p, 10, RAYO[2], 0.8 * fl); L.bola(p, 3.5, RAYO[0], 2 * fl); }
      for (let i = 0; i < 6; i++) {
        const d: V3 = [(R() - 0.5) * 22, (R() - 0.5) * 22, (R() - 0.3) * 20];
        dibujaRayo(L, zigzag(B, add(B, d), R, 0.3, 3), RAYO, 0.6 * fl, 0.5, 0);
      }
    },
  },
  {
    id: 'relampago', nombre: ['Relámpago', 'Lightning bolt'], elemento: 'rayo', tipo: 'proyectil', cuadros: 6, t: 1, dir: true, bucle: true,
    pinta: (c) => {
      const { L } = c, z = ALTO_VUELO, R = rng(c.sem + c.f * 104729);
      const H = c.fw(22, 0, z), T = c.fw(-34, 0, z);
      L.piso(c.fw(-2, 0, 0), 30, RAYO[2], 0.35);
      // la estela de aire ionizado detrás de la cabeza
      L.rayo3(H, T, 11, 3, RAYO[3], 0.38, 0);
      // el tronco, más vivo hacia la cabeza, con horquillas que se vuelven a partir
      rayoRamas(L, T, H, R, RAYO, 0.55, 1, 5, 0.1, 2, 1.9);
      // un segundo filamento más tenue que se le cruza
      rayoHalo(L, zigzag(T, H, R, 0.15, 5), RAYO, 0.12, 0.55, 0.55);
      // ramitas que saltan de la cabeza hacia adelante y a los costados
      for (let i = 0; i < 4; i++) {
        const o = c.fw(8 + R() * 12, 0, z), d: V3 = [(R() - 0.5) * 22, (R() - 0.5) * 22, (R() - 0.5) * 18];
        rayoRamas(L, o, add(o, d), R, RAYO, 0.6, 0.5, 3, 0.3, 1, 0);
      }
      // la cabeza: el alma blanca con la corona azul y el halo violeta
      L.bola(H, 17, RAYO[3], 0.5);
      L.bola(H, 8, RAYO[2], 0.85);
      L.bola(H, 3.6, RAYO[1], 1.5);
      L.bola(H, 1.7, BLANCO, 2.6);
      for (let i = 0; i < 5; i++) L.bola(add(H, [(R() - 0.5) * 16, (R() - 0.5) * 16, (R() - 0.5) * 12]), 0.9, RAYO[0], 1.1);
    },
  },
  {
    id: 'campo_estatico', nombre: ['Campo estático', 'Static field'], elemento: 'rayo', tipo: 'area', cuadros: 8, t: 2, bucle: true,
    pinta: (c) => {
      const { L } = c, R = rng(c.sem + c.f * 31337), Rf = c.R();
      const Rw = 46;
      L.piso([0, 0, 0], Rw, RAYO[3], 0.35);
      const ph = Rf() * TAU;
      L.aroPiso([0, 0, 0], Rw, 2.2, RAYO[1], 0.8, (a) => 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(a * 5 + ph + c.f * 2.3), 3));
      L.aroPiso([0, 0, 0], Rw * 0.7, 1.2, RAYO[2], 0.4, (a) => 0.3 + 0.7 * Math.pow(0.5 + 0.5 * Math.sin(-a * 4 + c.f * 1.7), 4));
      for (let i = 0; i < 8; i++) {
        const a = R() * TAU, rr = Math.sqrt(R()) * Rw * 0.9, b = R() * TAU, l = 10 + R() * 18;
        const o: V3 = [Math.cos(a) * rr, Math.sin(a) * rr, 1], e: V3 = [o[0] + Math.cos(b) * l, o[1] + Math.sin(b) * l, 1];
        dibujaRayo(L, zigzag(o, e, R, 0.28, 4, true), RAYO, 0.8, 0.6, 0.2);
      }
      for (let i = 0; i < 5; i++) {
        const a = R() * TAU, rr = R() * Rw;
        const o: V3 = [Math.cos(a) * rr, Math.sin(a) * rr, 0];
        dibujaRayo(L, zigzag(o, add(o, [(R() - 0.5) * 6, (R() - 0.5) * 6, 8 + R() * 14]), R, 0.3, 3), RAYO, 0.7, 0.5, 0);
        const [x, y] = L.P(o);
        L.luz(x, y, 4, RAYO[1], 0.8);
      }
    },
  },
  {
    id: 'chispa_cargada', nombre: ['Chispa cargada', 'Charged spark'], elemento: 'rayo', tipo: 'proyectil', cuadros: 8, t: 1, bucle: true,
    pinta: (c) => {
      const { L } = c, R = rng(c.sem + c.f * 7121), ph = c.u * TAU;
      const C0: V3 = [Math.sin(ph) * 2, Math.cos(ph * 2) * 2, 20 + Math.sin(ph * 2) * 3];
      L.piso(C0, 16, RAYO[2], 0.5);
      // el halo de color: aura violeta y la esfera azul
      L.bola(C0, 22, RAYO[3], 0.42);
      L.bola(C0, 10, RAYO[2], 0.42);
      // zarcillos que salen de la esfera y se ramifican
      for (let i = 0; i < 7; i++) {
        const d = unit([R() - 0.5, R() - 0.5, R() - 0.5]);
        rayoRamas(L, add(C0, mul(d, 3.5)), add(C0, mul(d, 10 + R() * 10)), R, RAYO, 0.75, 0.5, 3, 0.32, 1, 0.1);
      }
      // un arco que sale y vuelve a entrar
      const d1 = unit([R() - 0.5, R() - 0.5, R() - 0.2]), d2 = unit(add(d1, [R() - 0.5, R() - 0.5, R() - 0.5]));
      rayoHalo(L, zigzag(add(C0, mul(d1, 5)), add(C0, mul(d2, 5)), R, 0.45, 3), RAYO, 0.6, 0.5);
      // chispas que orbitan
      for (let k = 0; k < 3; k++) {
        const a = ph * (k + 1) * (k % 2 ? -1 : 1) + k * 2.1;
        const s = add(C0, [Math.cos(a) * 10, Math.sin(a) * 10, Math.sin(a * 2 + k) * 6]);
        L.bola(s, 4, RAYO[1], 0.6); L.bola(s, 1.2, BLANCO, 1.8);
        if (R() < 0.5) rayoHalo(L, zigzag(C0, s, R, 0.22, 3), RAYO, 0.45, 0.45);
      }
      // el núcleo: blanco que quema dentro de un azul vivo
      L.bola(C0, 5, RAYO[1], 0.85);
      L.bola(C0, 2.2, BLANCO, 2.3);
    },
  },
  {
    id: 'trueno', nombre: ['Trueno del cielo', 'Thunder strike'], elemento: 'rayo', tipo: 'impacto', cuadros: 12, t: 2,
    pinta: (c) => {
      const { L, f } = c;
      const top: V3 = [-16, -24, 270];
      const golpe = f >= 1 && f <= 6 && f !== 4;
      const k = f === 1 ? 1.3 : f === 2 ? 1.1 : f === 3 ? 0.7 : f === 5 ? 1 : f === 6 ? 0.5 : 0;
      // en el cielo
      if (golpe || f === 0) L.bola(top, 34, RAYO[3], f === 0 ? 0.25 : 0.5 * k);
      if (golpe) {
        const R = rng(c.sem + (f >= 5 ? 2 : 1) * 999);
        const pts = zigzag(top, [0, 0, 0], R, 0.07, 7);
        dibujaRayo(L, pts, RAYO, k, 1.2);
        for (let j = 0; j < 4; j++) {
          const i0 = 10 + Math.floor(R() * (pts.length - 30));
          const o = pts[i0];
          dibujaRayo(L, zigzag(o, add(o, [(R() - 0.5) * 60, (R() - 0.5) * 60, -30 - R() * 40]), R, 0.2, 5), RAYO, k * 0.6, 0.7, 0);
        }
        L.piso([0, 0, 0], 40, RAYO[1], 1.3 * k);
        L.bola([0, 0, 4], 18, RAYO[1], 1.4 * k);
        L.bola([0, 0, 2], 6, RAYO[0], 3 * k);
      }
      if (f >= 1) {
        const t = (f - 1) / (c.n - 1);
        ondaChoque(L, 8 + 60 * sale(t, 2), 3 + 5 * t, RAYO[1], 0.9 * Math.pow(1 - t, 1.5), 8.3, 0.3);
        L.piso([0, 0, 0], 22, RAYO[2], 0.6 * (1 - t));
        const [cx, cy] = L.P([0, 0, 0]);
        L.mancha(cx, cy, 20, 10, [0.06, 0.05, 0.06], 0.5 * suave(0, 0.2, t) * (1 - suave(0.7, 1, t)), 3, 1);
        humareda(L, c.R(2), 5, 0, 0, 10, 4, 30 + 30 * t, t * 0.6, 0.35 * (1 - t), [0.2, 0.2, 0.24], 5, 12);
        const R = c.R(5);
        for (let i = 0; i < 16; i++) {
          const a = R() * TAU, sp = 40 + R() * 50, up = 0.4 + R();
          const T = t * 1.6;
          if (T > 1) continue;
          const pos = (q: number): V3 => [Math.cos(a) * sp * q, Math.sin(a) * sp * q, up * sp * q - 80 * q * q];
          const p0 = pos(T * 0.8), p1 = pos(Math.max(0, T * 0.8 - 0.06));
          if (p0[2] < 0) continue;
          L.rayo3(p0, p1, 0.8, 0.5, RAYO[0], 1.4 * (1 - T), 0);
        }
      } else {
        L.piso([0, 0, 0], 14, RAYO[2], 0.4);
      }
    },
  },

  // ============================== hueso / necro
  {
    id: 'lanza_hueso', nombre: ['Lanza de hueso', 'Bone spear'], elemento: 'hueso', tipo: 'proyectil', cuadros: 6, t: 2, dir: true, bucle: true,
    pinta: (c) => {
      const { L } = c, z = ALTO_VUELO, ph = c.u * TAU, R = c.R();
      const H = c.fw(24, 0, z), T = c.fw(-22, 0, z);
      L.piso(c.fw(0, 0, 0), 22, ALMA[2], 0.3);
      // estela de espíritu
      for (let w = 0; w < 3; w++) {
        let prev: V3 | null = null;
        for (let i = 0; i <= 14; i++) {
          const s = i / 14;
          const p = c.fw(-14 - s * 44, Math.sin(s * 6 - ph + w * 2.1) * (2 + s * 6), z + Math.cos(s * 5 - ph + w * 1.3) * (1 + s * 4));
          if (prev) L.rayo3(prev, p, 1.6 + s * 2, 1.6 + s * 2, ALMA[1], 0.45 * (1 - s), 0.45 * (1 - s - 1 / 14));
          prev = p;
        }
      }
      L.rayo3(T, H, 8, 5, ALMA[3], 0.5);
      L.rayo3(T, H, 4, 3, ALMA[2], 0.45);
      const [xa, ya] = L.P(T), [xb, yb] = L.P(H);
      const pts: Pt[] = [], an: number[] = [];
      for (let i = 0; i <= 14; i++) {
        const s = i / 14;
        pts.push([lerp(xa, xb, s), lerp(ya, yb, s)]);
        an.push(s < 0.12 ? 1.8 + s * 6 : 2.6 * Math.pow(1 - s, 0.55) + 0.35 + (i % 3 === 0 && s < 0.8 ? 0.5 : 0));
      }
      colmillo(L, pts, an, 1, [0.84, 0.8, 0.68]);
      const dx = xb - xa, dy = yb - ya, l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l;
      for (let i = 1; i < 5; i++) {
        const s = i * 0.15;
        const px = lerp(xa, xb, s), py = lerp(ya, yb, s), w = an[Math.round(s * 14)];
        L.capsula(px - nx * w, py - ny * w, px + nx * w, py + ny * w, 0.35, 0.35, [0.42, 0.38, 0.3], 0.8);
      }
      L.bola(H, 4, ALMA[0], 0.6);
      for (let i = 0; i < 6; i++) {
        const t = frac(c.u + R());
        const p = c.fw(-20 - t * 40, (R() - 0.5) * 14 * t, z + (R() - 0.5) * 10 * t);
        const [x, y] = L.P(p);
        L.luz(x, y, 1.4, ALMA[0], 1.1 * (1 - t));
      }
    },
  },
  {
    id: 'prision_hueso', nombre: ['Prisión de hueso', 'Bone prison'], elemento: 'hueso', tipo: 'muro', cuadros: 12, t: 2,
    pinta: (c) => {
      const { L, v } = c, R = c.R(), Rb = 26;
      const [cx, cy] = L.P([0, 0, 0]);
      L.piso([0, 0, 0], 32, ALMA[2], 0.55 * (1 - v * 0.6));
      // el suelo removido donde se cierra la jaula
      L.mancha(cx, cy, 46, 23, [0.07, 0.06, 0.05], 0.5 * suave(0, 0.3, v), 2, 5, 0.7);
      const sp: { a: number; h: number; d: number; w: number; cu: number; i: number }[] = [];
      // doce costillas en anillo (algunas quebradas a media altura: la silueta no queda pareja como un peine)
      for (let i = 0; i < 12; i++) { const rota = R() < 0.25; sp.push({ a: (i / 12) * TAU + (R() - 0.5) * 0.25, h: rota ? 17 + R() * 9 : 36 + R() * 20, d: R() * 0.35, w: 2.6 + R() * 1.5, cu: 0.55 + R() * 0.55, i }); }
      sp.sort((p, q) => Math.cos(p.a) + Math.sin(p.a) - Math.cos(q.a) - Math.sin(q.a));
      // el piso primero: grietas que se abren desde la base de cada púa (con el alma brillando en el fondo), el labio
      // de tierra levantada y los terrones que ya cayeron
      for (const s of sp) {
        const e = c01((v - s.d) / 0.2), Rg = rng(c.sem + s.i * 977), ca = Math.cos(s.a), sa = Math.sin(s.a), base: V3 = [ca * Rb, sa * Rb, 0];
        for (let k = 0; k < 3; k++) grietaPiso(L, Rg, base, s.a + (k - 1) * 1.1 + (Rg() - 0.5) * 0.5, 8 + Rg() * 8, 1.1, e, ALMA[1], 0.55 * (1 - v * 0.5));
        if (e > 0) {
          const [bx, by] = L.P(base);
          L.mancha(bx, by + 0.5, 6 * sale(e), 3 * sale(e), [0.05, 0.04, 0.035], 0.85, s.a * 3, 1, 0.6);
          for (let k = 0; k < 5; k++) { const t = s.a + (Rg() - 0.5) * 2.4, d = 3.5 + Rg() * 3; const [x, y] = L.P([base[0] + Math.cos(t) * d * sale(e), base[1] + Math.sin(t) * d * sale(e), 0]); terron(L, Rg, x, y - 0.6, 1 + Rg() * 1.3); }
        }
      }
      // las púas: costillas quebradas que revientan el piso, cada una con su erupción de tierra, esquirlas y polvo
      for (const s of sp) {
        const g = sale(c01((v - s.d) / 0.3), 2.5), te = v - s.d, ca = Math.cos(s.a), sa = Math.sin(s.a), Rg = rng(c.sem + s.i * 977 + 5);
        const base: V3 = [ca * Rb, sa * Rb, 0];
        const qu = Array.from({ length: 11 }, () => (Rg() - 0.5) * 1.6);
        if (g > 0.06) {
          const pts: Pt[] = [], an: number[] = [], ab = Math.min(1, g * 2.5);
          for (let i = 0; i <= 10; i++) {
            const q = i / 10, h = q * s.h * g;
            const rr = Rb * (1 - 0.5 * (q * g) ** 2 * s.cu) + 2 * Math.sin(q * Math.PI) * s.cu * g;
            const tg = qu[i] * Math.sin(q * Math.PI) * g;
            pts.push(L.P([ca * rr - sa * tg, sa * rr + ca * tg, h]));
            an.push((s.w * Math.pow(1 - q, 0.7) + 0.4) * ab);
          }
          costillaHueso(L, Rg, pts, an, 1, ab);
        }
        if (te > 0 && te < 0.45) {
          // la erupción: terrones y piedras que saltan, esquirlas del hueso que rompió el piso y el polvo
          const Rt = rng(c.sem + s.i * 131), T = te * 1.6;
          for (let k = 0; k < 9; k++) {
            const t = s.a + (Rt() - 0.5) * 2.4, vel = 20 + Rt() * 34, vz = 40 + Rt() * 45, z = vz * T - 80 * T * T, r = 1.2 + Rt() * 1.7, piedra = Rt() < 0.3;
            if (z <= 0) continue;
            const [x, y] = L.P([base[0] + Math.cos(t) * vel * T, base[1] + Math.sin(t) * vel * T, z]);
            terron(L, Rt, x, y, r, piedra ? [0.22, 0.2, 0.18] : TIERRA);
          }
          esquirlas(L, rng(c.sem + s.i * 53), 3, [base[0], base[1], 3], te * 0.9, [18, 40], 110, [3.5, 6.5]);
          const dust = campana(te, 0, 0.08, 0.45);
          const [x, y] = L.P(base);
          L.humo(x, y - 4 - te * 14, 8 + 16 * te, POLVO, 0.75 * dust, s.a * 5, te * 4);
          L.humo(x + ca * 5, y - 1, 6 + 10 * te, [0.3, 0.25, 0.2], 0.65 * dust, s.a * 7 + 3, te * 3);
        }
      }
      // motas del alma que suben
      for (let i = 0; i < 8; i++) {
        const t = frac(v * 1.5 + R()), a = R() * TAU, rr = R() * 24;
        const [x, y] = L.P([Math.cos(a) * rr, Math.sin(a) * rr, t * 50]);
        L.luz(x, y, 1.3, ALMA[0], 0.9 * Math.sin(t * Math.PI) * (1 - v * 0.6));
      }
    },
  },
  {
    id: 'circulo_invocacion', nombre: ['Círculo de invocación', 'Summoning circle'], elemento: 'hueso', tipo: 'invocacion', cuadros: 12, t: 2, bucle: true,
    pinta: (c) => {
      const { L, u } = c, R = c.R(), Rw = 40;
      const [cx, cy] = L.P([0, 0, 0]);
      L.mancha(cx, cy, Rw * S2 * 1.05, Rw * S2 * 0.52, [0.05, 0.03, 0.07], 0.5, 1, 1, 0.25);
      L.piso([0, 0, 0], Rw, NIGRO[3], 0.55);
      L.piso([0, 0, 0], Rw * 0.4, NIGRO[2], 0.35);
      const pulso = (a: number) => 0.55 + 0.45 * Math.pow(0.5 + 0.5 * Math.cos(a - u * TAU), 3);
      L.aroPiso([0, 0, 0], Rw, 4, NIGRO[3], 0.5);
      L.aroPiso([0, 0, 0], Rw, 1.3, NIGRO[1], 1.1, pulso);
      L.aroPiso([0, 0, 0], Rw * 0.8, 1.1, NIGRO[2], 1.1);
      L.aroPiso([0, 0, 0], Rw * 0.8, 3.5, NIGRO[3], 0.4);
      // heptagrama que gira un séptimo de vuelta por ciclo
      const rot = (u * TAU) / 7, pts: V3[] = [];
      for (let i = 0; i < 7; i++) { const a = rot + (i / 7) * TAU; pts.push([Math.cos(a) * Rw * 0.8, Math.sin(a) * Rw * 0.8, 0.5]); }
      for (let i = 0; i < 7; i++) {
        L.rayo3(pts[i], pts[(i + 3) % 7], 2.6, 2.6, NIGRO[3], 0.35);
        L.rayo3(pts[i], pts[(i + 3) % 7], 0.8, 0.8, mezcla(NIGRO[1], NIGRO[2], 0.5), 0.75);
        const [x, y] = L.P(pts[i]);
        L.luz(x, y, 3, NIGRO[1], 0.9);
      }
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU - rot * 0.5;
        const k = 0.4 + 0.9 * Math.pow(Math.max(0, Math.cos(a + Math.PI / 4 - u * TAU)), 4);
        runaPiso(L, i, Math.cos(a) * Rw * 0.9, Math.sin(a) * Rw * 0.9, a, 2.6, NIGRO[1], k);
      }
      humareda(L, c.R(4), 10, 0, 0, Rw, 0, 40, u, 0.22, [0.22, 0.08, 0.3], 5, 11);
      for (let i = 0; i < 14; i++) {
        const t = frac(u + R()), a = R() * TAU, rr = Rw * (0.75 + R() * 0.3);
        const [x, y] = L.P([Math.cos(a) * rr, Math.sin(a) * rr, t * 55]);
        L.trazo(x, y, x, y + 4, 0.9, 0.5, R() < 0.5 ? NIGRO[1] : NIGRO[2], 1.1 * Math.sin(t * Math.PI), 0);
      }
    },
  },

  // ============================== veneno
  {
    id: 'nova_veneno', nombre: ['Nova de veneno', 'Poison nova'], elemento: 'veneno', tipo: 'area', cuadros: 14, t: 2,
    pinta: (c) => {
      const { L, v } = c, R = c.R();
      const e = sale(v, 2), Rw = 6 + 74 * e, fade = Math.pow(1 - v, 0.8) * suave(0, 0.1, v + 0.05);
      L.piso([0, 0, 0], Rw, VENENO[3], 0.25 * fade);
      L.aroPiso([0, 0, 0], Rw, 10 + 6 * v, VENENO[3], 0.45 * fade);
      const ps: { a: number; r: number; o: number; z: number }[] = [];
      for (let i = 0; i < 40; i++) ps.push({ a: (i / 40) * TAU + R() * 0.15, r: R(), o: (R() - 0.5) * 8, z: R() * 8 });
      ps.sort((p, q) => Math.cos(p.a) + Math.sin(p.a) - Math.cos(q.a) - Math.sin(q.a));
      for (const p of ps) {
        const rr = Rw + p.o, pos: V3 = [Math.cos(p.a) * rr, Math.sin(p.a) * rr, 5 + p.z + v * 6];
        L.humo3(pos, 7 + p.r * 6 + v * 4, mezcla([0.16, 0.32, 0.06], [0.36, 0.5, 0.08], p.r), 0.55 * fade, p.a * 4, v * 2 + p.r * 5);
        L.bola(pos, 7, VENENO[2], 0.35 * fade);
      }
      L.aroPiso([0, 0, 0], Rw, 2.4, VENENO[1], 0.9 * fade);
      for (let i = 0; i < 18; i++) {
        const a = R() * TAU, rr = Rw * (0.85 + R() * 0.2), t = frac(v * 2 + R());
        const [x, y] = L.P([Math.cos(a) * rr, Math.sin(a) * rr, 8 + t * 18]);
        L.anillo(x, y, 1.6 + t * 1.5, 0.7, VENENO[1], 0.6 * fade * (1 - t), 1);
      }
    },
  },
  {
    id: 'nube_veneno', nombre: ['Nube venenosa', 'Poison cloud'], elemento: 'veneno', tipo: 'area', cuadros: 12, t: 3, bucle: true,
    pinta: (c) => {
      const { L, u } = c, R = c.R(), ph = u * TAU;
      L.piso([0, 0, 0], 42, VENENO[3], 0.45);
      const ps: { x: number; y: number; z: number; r: number; p: number; c: number }[] = [];
      for (let i = 0; i < 18; i++) {
        const a = R() * TAU, rr = Math.sqrt(R()) * 30;
        ps.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr, z: 6 + R() * 18, r: 9 + R() * 7, p: R() * TAU, c: R() });
      }
      ps.sort((a, b) => a.x + a.y - a.z * 0.5 - (b.x + b.y - b.z * 0.5));
      for (const p of ps) {
        const pos: V3 = [p.x + Math.cos(ph + p.p) * 4, p.y + Math.sin(ph + p.p) * 4, p.z + Math.sin(ph * 2 + p.p) * 2];
        const r = p.r * (0.92 + 0.08 * Math.sin(ph + p.p));
        L.bola(pos, r * 1.2, VENENO[2], 0.22);
        L.humo3(pos, r, mezcla([0.14, 0.3, 0.05], [0.4, 0.55, 0.1], p.c), 0.5, p.p + Math.cos(ph) * 0.5, p.c * 7 + Math.sin(ph) * 0.5);
      }
      for (let i = 0; i < 10; i++) {
        const t = frac(u + R()), a = R() * TAU, rr = R() * 30;
        const [x, y] = L.P([Math.cos(a) * rr, Math.sin(a) * rr, 4 + t * 26]);
        L.anillo(x, y, 1 + t * 1.2, 0.5, VENENO[1], 0.28 * Math.sin(t * Math.PI), 1);
        L.luz(x - 0.6, y - 0.6, 0.6, VENENO[0], 0.5 * Math.sin(t * Math.PI));
      }
    },
  },
  {
    id: 'estallido_cadaver', nombre: ['Estallido de cadáver', 'Corpse burst'], elemento: 'hueso', tipo: 'impacto', cuadros: 12, t: 2,
    // el cadáver revienta: fogonazo de fuego, onda que empuja, niebla roja, sangre a chorros, costillas y trozos de
    // carne que giran y quedan en el piso, y pavesas
    pinta: (c) => {
      const { L, v } = c, R = c.R(), C0: V3 = [0, 0, 10];
      const [x, y] = L.P([0, 0, 18]);
      if (v < 0.3) { const k = 1 - v / 0.3; L.bola(C0, 30, [0.9, 0.3, 0.1], 1.1 * k); L.bola(C0, 10, [1, 0.75, 0.4], 2.2 * k); L.piso([0, 0, 0], 40, [0.8, 0.25, 0.1], k); ondaAire(L, x, y, 8 + 50 * sale(v, 2), 2.2, [1, 0.45, 0.2], 0.8 * k, 6.6); }
      ondaChoque(L, 8 + 52 * sale(v, 2.2), 3 + 3 * v, [0.9, 0.3, 0.1], 0.8 * Math.pow(1 - v, 2), 6.1, 0.4);
      for (let i = 0; i < 12; i++) {
        const a = R() * TAU, d = R() * 30 * sale(v), z = 10 + R() * 22 * sale(v) + v * 10;
        L.humo3([Math.cos(a) * d, Math.sin(a) * d, z], 8 + v * 12, i % 3 ? SANGRE[2] : [0.2, 0.15, 0.13], 0.5 * campana(v, 0, 0.15, 1), i * 2, v);
      }
      if (v > 0.04) {
        salpicar(L, c.R(2), { n: 46, C0, T: v * 1.1, vel: [35, 90], sube: [0.2, 1.3], r: [0.9, 2.6], g: 110 });
        astillas(L, c.R(3), 9, C0, v * 1.1, [30, 70], 110);
        astillas(L, c.R(4), 8, C0, v * 1.1, [25, 60], 110, [0.5, 0.08, 0.08]);
      }
      pavesas(L, c.R(5), 10, C0, v, 30, FUEGO, 0.8);
    },
  },

  // ============================== sagrado
  {
    id: 'pilar_luz', nombre: ['Pilar de luz', 'Holy light pillar'], elemento: 'sagrado', tipo: 'impacto', cuadros: 14, t: 2,
    pinta: (c) => {
      const { L, v } = c, R = c.R();
      const env = suave(0, 0.18, v) * (1 - suave(0.62, 1, v));
      const bajo = suave(0, 0.25, v); // la columna baja del cielo
      const H = 116, zb = H * (1 - bajo);
      L.piso([0, 0, 0], 34, SAGRADO[2], 1.0 * env);
      L.piso([0, 0, 0], 14, SAGRADO[1], 1.2 * env);
      L.aroPiso([0, 0, 0], 16 + 10 * v, 2.4, SAGRADO[1], 1.1 * env);
      L.aroPiso([0, 0, 0], 26 + 20 * v, 1.5, SAGRADO[2], 0.6 * env);
      L.rayo3([0, 0, zb], [0, 0, H + 10], 34, 38, SAGRADO[3], 0.3 * env, 0.05 * env);
      L.rayo3([0, 0, zb], [0, 0, H], 21, 24, SAGRADO[2], 0.6 * env, 0.1 * env);
      L.rayo3([0, 0, zb], [0, 0, H], 11, 12, SAGRADO[1], 0.75 * env, 0.2 * env);
      L.rayo3([0, 0, zb], [0, 0, H * 0.85], 4.5, 5, SAGRADO[0], 1.1 * env, 0.3 * env);
      for (let i = 0; i < 12; i++) {
        const t = frac(v * 2.5 + R()), off = (R() - 0.5) * 18;
        const p0: V3 = [off / 2, -off / 2, Math.max(zb, t * H)], p1: V3 = [off / 2, -off / 2, Math.max(zb, t * H - 24)];
        L.rayo3(p0, p1, 0.9, 0.9, SAGRADO[0], 0.5 * env * Math.sin(t * Math.PI));
      }
      for (let i = 0; i < 16; i++) {
        const t = frac(v * 1.5 + R()), a = R() * TAU + v * 4, rr = 10 + R() * 14;
        const [x, y] = L.P([Math.cos(a) * rr, Math.sin(a) * rr, t * 90]);
        destello(L, x, y, 2 + R() * 2.5, SAGRADO[0], 0.9 * env * Math.sin(t * Math.PI));
      }
      if (v < 0.3) L.bola([0, 0, 4], 26, SAGRADO[0], 1.4 * campana(v, 0.1, 0.18, 0.3));
    },
  },
  {
    id: 'aura_sagrada', nombre: ['Aura sagrada', 'Holy aura'], elemento: 'sagrado', tipo: 'aura', cuadros: 12, t: 2, bucle: true,
    pinta: (c) => {
      const { L, u } = c, R = c.R(), ph = u * TAU;
      L.piso([0, 0, 0], 28, SAGRADO[3], 0.4);
      L.aroPiso([0, 0, 0], 27, 5, SAGRADO[3], 0.4);
      L.aroPiso([0, 0, 0], 27, 1.6, SAGRADO[1], 1.1, (a) => 0.5 + 0.5 * Math.pow(0.5 + 0.5 * Math.cos(3 * (a - ph / 3)), 2));
      L.aroPiso([0, 0, 0], 20, 1.1, SAGRADO[2], 0.9, (a) => 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.cos(4 * (a + ph / 4)), 3));
      L.aroPiso([0, 0, 0], 33, 1.1, SAGRADO[1], 0.8, (a) => suave(0.25, 0.45, Math.abs(frac((a / TAU) * 18 - u * 2) - 0.5) * 2));
      // cruces que giran
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU + ph / 4, x = Math.cos(a) * 27, y = Math.sin(a) * 27;
        const [px, py] = L.P([x, y, 0]);
        L.trazo(px - 3.5, py, px + 3.5, py, 0.8, 0.8, SAGRADO[0], 1.1);
        L.trazo(px, py - 1.8, px, py + 1.8, 0.8, 0.8, SAGRADO[0], 1.1);
        L.luz(px, py, 5, SAGRADO[1], 0.6);
      }
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU + ph / 7, h = 7 + 6 * (0.5 + 0.5 * Math.sin(ph * 2 + i * 1.7));
        L.rayo3([Math.cos(a) * 27, Math.sin(a) * 27, 0], [Math.cos(a) * 27, Math.sin(a) * 27, h], 1.2, 0.6, SAGRADO[1], 0.45, 0);
      }
      for (let i = 0; i < 10; i++) {
        const t = frac(u + R()), a = R() * TAU, rr = 12 + R() * 18;
        const [x, y] = L.P([Math.cos(a) * rr, Math.sin(a) * rr, t * 40]);
        destello(L, x, y, 2.2, SAGRADO[0], 0.8 * Math.sin(t * Math.PI));
      }
    },
  },
  {
    id: 'castigo', nombre: ['Castigo', 'Smite flash'], elemento: 'sagrado', tipo: 'impacto', cuadros: 8, t: 2,
    // golpe de luz: la columna baja del cielo (anticipación), fogonazo en capas, cruz de lente, onda y pavesas
    pinta: (c) => estallidoSagrado(c, 1, true),
  },
  {
    id: 'chispas_curacion', nombre: ['Chispas de curación', 'Healing sparkles'], elemento: 'sagrado', tipo: 'buff', cuadros: 14, t: 2,
    pinta: (c) => {
      const { L, v } = c, R = c.R();
      const VERDE: C = [0.55, 1, 0.55];
      const env = campana(v, 0, 0.2, 1);
      L.piso([0, 0, 0], 24, [0.3, 0.8, 0.3], 0.5 * env);
      L.aroPiso([0, 0, 0], 14 + 16 * sale(v), 1.6, VERDE, 0.9 * (1 - v));
      L.bola([0, 0, 30], 26, [0.3, 0.75, 0.35], 0.3 * env, 1, 1.5);
      for (let i = 0; i < 24; i++) {
        const d = R() * 0.45, a0 = R() * TAU, r0 = 12 + R() * 10, s = 2 + R() * 3, col = R() < 0.5 ? VERDE : SAGRADO[1];
        const age = (v - d) / 0.55;
        if (age <= 0 || age >= 1) continue;
        const a = a0 + age * 3, rr = r0 * (1 - age * 0.35);
        const [x, y] = L.P([Math.cos(a) * rr, Math.sin(a) * rr, 4 + age * 72]);
        destello(L, x, y, s, col, 1.1 * Math.sin(age * Math.PI) * (0.7 + 0.3 * Math.sin(age * 20 + a0)));
        L.luz(x, y + 4, 0.8, col, 0.5 * Math.sin(age * Math.PI));
      }
      // cruces que suben
      for (let i = 0; i < 4; i++) {
        const d = 0.1 + i * 0.12, age = (v - d) / 0.5;
        if (age <= 0 || age >= 1) continue;
        const a = i * 1.7;
        const [x, y] = L.P([Math.cos(a) * 16, Math.sin(a) * 16, 15 + age * 50]);
        const k = Math.sin(age * Math.PI);
        L.trazo(x - 3, y, x + 3, y, 0.9, 0.9, VERDE, k);
        L.trazo(x, y - 3, x, y + 3, 0.9, 0.9, VERDE, k);
        L.luz(x, y, 5, [0.3, 0.8, 0.3], 0.5 * k);
      }
    },
  },
  {
    id: 'escudo_divino', nombre: ['Escudo divino', 'Divine shield'], elemento: 'sagrado', tipo: 'buff', cuadros: 10, t: 2, bucle: true,
    pinta: (c) => {
      const { L, u } = c, R = c.R(), ph = u * TAU;
      const [cx, cy] = L.P([0, 0, 33]);
      const rx = 38, ry = 50;
      L.piso([0, 0, 0], 28, SAGRADO[2], 0.45);
      L.aroPiso([0, 0, 0], 26, 2, SAGRADO[1], 0.7, (a) => 0.25 + 0.75 * suave(0.3, 0.7, fbm(Math.cos(a) * 3 + Math.cos(ph) * 0.7, Math.sin(a) * 3 + Math.sin(ph) * 0.7)));
      const banda = frac(u) * 2.6 - 1.3;
      const col: C = mezcla(SAGRADO[1], BLANCO, 0.25);
      L.campo(cx - rx * 1.3, cy - ry * 1.3, cx + rx * 1.3, cy + ry * 1.3, (dx, dy) => {
        const u2 = dx / rx, v2 = dy / ry, q = Math.hypot(u2, v2);
        if (q > 1.3) return 0;
        let k = 0;
        // energía que corre por la cáscara: el filo se enciende a jirones
        const th = Math.atan2(v2, u2), flujo = 0.3 + 0.7 * suave(0.25, 0.75, fbm(Math.cos(th) * 2.6 + Math.cos(ph) * 0.8, Math.sin(th) * 2.6 + Math.sin(ph) * 0.8 + q * 1.5));
        if (q < 1) {
          const nz = Math.sqrt(1 - q * q);
          k += 0.06 + 0.9 * Math.pow(1 - nz, 2.2) * flujo;
          const hx = Math.abs(Math.sin(dx * 0.32 + dy * 0.55 + ph * 0) * Math.sin(dx * 0.32 - dy * 0.55));
          k += (1 - suave(0, 0.18, hx)) * 0.18 * (1 - nz * 0.6);
          const b = (v2 + u2 * 0.3 - banda) / 0.12;
          k += Math.exp(-b * b) * 0.35 * nz;
          k *= suave(1.0, 0.96, q) ;
        }
        k += Math.exp(-Math.max(0, q - 0.98) * 14) * 0.35 * suave(0.85, 1, q) * flujo;
        return k;
      }, col, cx, cy);
      L.luz(cx - rx * 0.42, cy - ry * 0.5, 7, BLANCO, 0.5);
      L.luz(cx - rx * 0.42, cy - ry * 0.5, 2.2, BLANCO, 1.2);
      for (let i = 0; i < 8; i++) {
        const a = R() * TAU + ph * (i % 2 ? 0.5 : -0.5), t = frac(u * 2 + R());
        const x = cx + Math.cos(a) * rx * 0.96, y = cy + Math.sin(a) * ry * 0.96;
        destello(L, x, y, 3, SAGRADO[0], Math.sin(t * Math.PI) * 0.9);
      }
    },
  },

  // ============================== físico (guerrero, amazona, asesina)
  {
    id: 'torbellino', nombre: ['Torbellino', 'Whirlwind'], elemento: 'fisico', tipo: 'aura', cuadros: 8, t: 2, bucle: true,
    pinta: (c) => {
      const { L, u } = c, R = c.R();
      const A = u * TAU * 2;
      // polvo que gira en la base
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU + A * 0.5, rr = 26 + R() * 10;
        L.humo3([Math.cos(a) * rr, Math.sin(a) * rr, 3], 7 + R() * 5, POLVO, 0.3, i * 2.3 + Math.cos(u * TAU), Math.sin(u * TAU));
      }
      L.piso([0, 0, 0], 34, [0.6, 0.6, 0.65], 0.12);
      const arcos: [number, number, number, number][] = [[36, 30, 0, 1], [32, 20, Math.PI, 0.7]];
      for (const [Rr, z, off, kk] of arcos) {
        const N = 44;
        for (let j = 0; j < N; j++) {
          const s0 = j / N, s1 = (j + 1) / N;
          const a0 = A + off - s0 * 3.8, a1 = A + off - s1 * 3.8;
          const p0: V3 = [Math.cos(a0) * Rr, Math.sin(a0) * Rr, z + Math.sin(a0) * 2], p1: V3 = [Math.cos(a1) * Rr, Math.sin(a1) * Rr, z + Math.sin(a1) * 2];
          const k0 = Math.pow(1 - s0, 1.6) * kk, k1 = Math.pow(1 - s1, 1.6) * kk;
          L.rayo3(p0, p1, 10 * (1 - s0 * 0.4), 10 * (1 - s1 * 0.4), ACERO[3], 0.3 * k0, 0.3 * k1);
          for (const dz of [-5, -2.5, 2.5, 5]) L.rayo3(add(p0, [0, 0, dz * (1 - s0 * 0.5)]), add(p1, [0, 0, dz * (1 - s1 * 0.5)]), 1.4, 1.4, ACERO[2], 0.22 * k0, 0.22 * k1);
          L.rayo3(p0, p1, 3, 3, ACERO[2], 0.45 * k0, 0.45 * k1);
          L.rayo3(p0, p1, 0.9, 0.9, ACERO[0], 1.1 * Math.pow(k0, 2), 1.1 * Math.pow(k1, 2));
        }
        const tip: V3 = [Math.cos(A + off) * Rr, Math.sin(A + off) * Rr, z + Math.sin(A + off) * 2];
        const [x, y] = L.P(tip);
        destello(L, x, y, 5, ACERO[0], 1.2 * kk);
      }
      for (let i = 0; i < 10; i++) {
        const a = R() * TAU + A, rr = 20 + R() * 20, z = R() * 20;
        const [x, y] = L.P([Math.cos(a) * rr, Math.sin(a) * rr, z]);
        L.capsula(x, y, x + 1, y, 0.6, 0.6, [0.3, 0.26, 0.2], 0.8);
      }
    },
  },
  {
    id: 'onda_aterrizaje', nombre: ['Onda de aterrizaje', 'Leap landing shockwave'], elemento: 'fisico', tipo: 'impacto', cuadros: 10, t: 2,
    pinta: (c) => {
      const { L, v } = c, R = c.R();
      const e = sale(v, 2.5), Rw = 8 + 58 * e;
      const [cx, cy] = L.P([0, 0, 0]);
      // grietas
      const gk = 0.75 * (1 - suave(0.6, 1, v)) * suave(0, 0.1, v + 0.05);
      for (let i = 0; i < 9; i++) {
        let a = (i / 9) * TAU + R() * 0.5, x = 0, y = 0;
        const n = 4 + Math.floor(R() * 3);
        for (let j = 0; j < n; j++) {
          const st = 5 + R() * 4;
          a += (R() - 0.5) * 0.9;
          const nx = x + Math.cos(a) * st, ny = y + Math.sin(a) * st;
          const [xa, ya] = L.P([x, y, 0]), [xb, yb] = L.P([nx, ny, 0]);
          L.capsula(xa, ya, xb, yb, 1.1 * (1 - j / n) + 0.3, 1.1 * (1 - (j + 1) / n) + 0.3, [0.07, 0.05, 0.04], gk);
          x = nx; y = ny;
        }
      }
      L.mancha(cx, cy, 14, 7, [0.1, 0.08, 0.06], 0.6 * (1 - suave(0.6, 1, v)), 2, 2);
      if (v < 0.25) L.piso([0, 0, 0], 30, [1, 0.95, 0.8], 0.8 * (1 - v / 0.25));
      ondaChoque(L, Rw, 3 + 4 * v, [1, 0.92, 0.8], 0.75 * Math.pow(1 - v, 2), 2.2, 0.4);
      const ps: { a: number; r: number; o: number }[] = [];
      for (let i = 0; i < 30; i++) ps.push({ a: (i / 30) * TAU + R() * 0.2, r: R(), o: (R() - 0.5) * 8 });
      ps.sort((p, q) => Math.cos(p.a) + Math.sin(p.a) - Math.cos(q.a) - Math.sin(q.a));
      for (const p of ps) {
        const rr = Rw * (0.92 + p.r * 0.1) + p.o;
        L.humo3([Math.cos(p.a) * rr, Math.sin(p.a) * rr, 3 + v * 10 * p.r], 6 + 8 * e + p.r * 3, POLVO, 0.6 * Math.pow(1 - v, 1.2), p.a * 3, v * 1.5);
      }
      for (let i = 0; i < 14; i++) {
        const a = R() * TAU, sp = 30 + R() * 40, up = 0.6 + R() * 0.8, s = 1 + R() * 1.4;
        const pos = (t: number): V3 => [Math.cos(a) * sp * t, Math.sin(a) * sp * t, Math.max(0, up * sp * t - 110 * t * t)];
        const p = pos(v * 0.8);
        const [x, y] = L.P(p);
        L.poli([[x - s, y], [x, y - s * 1.1], [x + s * 1.1, y + 0.2], [x + 0.2, y + s]], [0.24, 0.2, 0.16], 1 - suave(0.7, 1, v));
        L.capsula(x - s * 0.5, y - s * 0.4, x - s * 0.1, y - s * 0.6, 0.4, 0.4, [0.45, 0.4, 0.33], 1 - suave(0.7, 1, v));
      }
    },
  },
  {
    id: 'grito_guerra', nombre: ['Grito de guerra', 'War cry'], elemento: 'fisico', tipo: 'buff', cuadros: 10, t: 2,
    pinta: (c) => {
      const { L, v } = c, R = c.R();
      const ROJO: C[] = [[1, 0.9, 0.7], [1, 0.5, 0.2], [0.85, 0.2, 0.08], [0.4, 0.05, 0.02]];
      const [hx, hy] = L.P([0, 0, 54]);
      L.luz(hx, hy, 12, ROJO[1], 1.4 * Math.pow(1 - v, 2));
      L.luz(hx, hy, 4, ROJO[0], 2 * Math.pow(1 - v, 3));
      L.piso([0, 0, 0], 30, ROJO[2], 0.6 * (1 - v));
      for (let j = 0; j < 3; j++) {
        const t = c01((v - j * 0.15) / 0.75);
        if (t <= 0 || t >= 1) continue;
        const e = sale(t, 2), k = Math.pow(1 - t, 1.3);
        L.aroPiso([0, 0, 0], 12 + 70 * e, 3 + 4 * t, ROJO[3], 0.5 * k);
        ondaChoque(L, 12 + 70 * e, 1.8 + 2 * t, ROJO[1], 1.1 * k, 2 + j * 1.3, 0.3);
        ondaAire(L, hx, hy, 8 + 40 * e, 1.5 + t * 2, ROJO[1], 0.75 * k, 3 + j * 0.7);
      }
      for (let i = 0; i < 16; i++) {
        const a = R() * TAU, d = 10 + R() * 40 * sale(v), z = R() * 30 + v * 30;
        const [x, y] = L.P([Math.cos(a) * d, Math.sin(a) * d, z]);
        L.trazo(x, y, x, y + 3, 0.9, 0.5, ROJO[1], 1.2 * (1 - v) * Math.sin(c01(v * 2 + R()) * Math.PI), 0);
      }
    },
  },
  {
    id: 'polvo_carga', nombre: ['Polvo de carga', 'Charge dust trail'], elemento: 'fisico', tipo: 'aura', cuadros: 8, t: 2, dir: true, bucle: true,
    pinta: (c) => {
      const { L, u } = c, R = c.R();
      const ps: { a: number; l: number; s: number; r: number }[] = [];
      for (let i = 0; i < 16; i++) ps.push({ a: frac(u + i / 16), l: (R() - 0.5) * 2, s: R(), r: R() });
      ps.sort((p, q) => q.a - p.a);
      for (const p of ps) {
        const pos = c.fw(-4 - p.a * 60, p.l * (4 + 10 * p.a), 3 + p.a * 9 * (0.6 + p.s));
        L.humo3(pos, 5 + p.a * 13, mezcla(POLVO, [0.55, 0.48, 0.38], p.s), 0.6 * Math.pow(1 - p.a, 1.3) * suave(0, 0.08, p.a), p.r * 9, p.a * 1.2);
      }
      for (let i = 0; i < 7; i++) {
        const t = frac(u * 2 + R()), l = (R() - 0.5) * 16;
        const pos = c.fw(-t * 40, l, Math.max(0, Math.sin(t * Math.PI) * 9));
        const [x, y] = L.P(pos);
        L.capsula(x, y, x + 0.8, y, 0.8, 0.8, [0.2, 0.17, 0.13], 1 - t);
      }
      for (let i = 0; i < 6; i++) {
        const t = frac(u * 2 + R()), l = (R() - 0.5) * 22, z = 10 + R() * 45;
        L.rayo3(c.fw(-6 - t * 50, l, z), c.fw(-26 - t * 50, l, z), 0.8, 0.5, [0.9, 0.9, 0.85], 0.35 * Math.sin(t * Math.PI), 0);
      }
    },
  },
  {
    id: 'flecha', nombre: ['Flecha', 'Arrow'], elemento: 'fisico', tipo: 'proyectil', cuadros: 4, t: 2, dir: true, bucle: true,
    pinta: (c) => {
      const { L } = c, z = ALTO_VUELO;
      const ond = Math.sin(c.u * TAU) * 0.6;
      dibujaFlecha(L, c.fw(-12, ond, z), c.fw(12, 0, z));
    },
  },
  {
    id: 'flecha_fuego', nombre: ['Flecha de fuego', 'Fire arrow'], elemento: 'fuego', tipo: 'proyectil', cuadros: 6, t: 2, dir: true, bucle: true,
    pinta: (c) => {
      const { L } = c, z = ALTO_VUELO, ph = c.u * TAU, R = c.R();
      L.piso(c.fw(8, 0, 0), 12, FUEGO[2], 0.3);
      for (let i = 0; i < 12; i++) {
        const s = i / 11;
        L.bola(c.fw(10 - s * 30, Math.sin(s * 6 - ph) * s * 2.5, z + Math.cos(s * 5 - ph) * s * 2 + s * 4), 3.6 * (1 - s) + 1, rampa(FUEGO, 0.1 + s * 0.9), 0.9 * Math.pow(1 - s, 1.2));
      }
      dibujaFlecha(L, c.fw(-12, 0, z), c.fw(12, 0, z), 1, false);
      L.bola(c.fw(10, 0, z), 5, FUEGO[1], 1.2);
      L.bola(c.fw(11, 0, z), 2, FUEGO[0], 1.8);
      for (let i = 0; i < 8; i++) {
        const t = frac(c.u * 2 + R()), l = (R() - 0.5) * 10, zz = (R() - 0.5) * 6;
        const p = c.fw(6 - t * 34, l * t, z + zz * t + t * 6);
        L.rayo3(p, c.fw(3 - t * 34, l * t, z + zz * t + t * 6), 0.7, 0.5, FUEGO[1], 1.3 * (1 - t), 0);
      }
    },
  },
  {
    id: 'flecha_hielo', nombre: ['Flecha de hielo', 'Ice arrow'], elemento: 'hielo', tipo: 'proyectil', cuadros: 6, t: 2, dir: true, bucle: true,
    pinta: (c) => {
      const { L } = c, z = ALTO_VUELO, R = c.R();
      L.piso(c.fw(8, 0, 0), 12, HIELO[2], 0.3);
      for (let i = 0; i < 4; i++) {
        const t = frac(c.u + i / 4);
        L.humo3(c.fw(-6 - t * 28, (R() - 0.5) * 6, z), 3 + t * 5, [0.7, 0.85, 1], 0.25 * (1 - t), i * 2, t);
      }
      L.rayo3(c.fw(10, 0, z), c.fw(-30, 0, z), 3, 0.6, HIELO[2], 0.6, 0);
      dibujaFlecha(L, c.fw(-12, 0, z), c.fw(12, 0, z), 1, false);
      const [xa, ya] = L.P(c.fw(7, 0, z)), [xb, yb] = L.P(c.fw(16, 0, z));
      cristal(L, xa, ya, xb, yb, 2.4, 1);
      L.bola(c.fw(12, 0, z), 7, HIELO[2], 0.6);
      for (let i = 0; i < 6; i++) {
        const t = frac(c.u + R()), l = (R() - 0.5) * 10, zz = (R() - 0.5) * 8;
        const [x, y] = L.P(c.fw(4 - t * 32, l * t, z + zz * t));
        destello(L, x, y, 2.2, HIELO[0], 0.9 * Math.sin(t * Math.PI));
      }
    },
  },
  {
    id: 'abanico_flechas', nombre: ['Abanico de flechas', 'Multishot fan'], elemento: 'fisico', tipo: 'proyectil', cuadros: 6, t: 2, dir: true,
    pinta: (c) => {
      const { L, v } = c, z = ALTO_VUELO;
      if (v < 0.4) { const k = 1 - v / 0.4; L.bola(c.fw(8, 0, z), 10, [0.9, 0.85, 0.7], 0.6 * k); L.bola(c.fw(8, 0, z), 3, BLANCO, 1.2 * k); }
      const d = 32 + v * 60;
      const giros = [-0.48, -0.24, 0, 0.24, 0.48];
      const orden = giros.map((g) => ({ g, k: c.fwr(g, d, 0, z) })).sort((a, b) => a.k[0] + a.k[1] - b.k[0] - b.k[1]);
      for (const { g } of orden) dibujaFlecha(L, c.fwr(g, d - 24, 0, z), c.fwr(g, d, 0, z), 1);
    },
  },
  {
    id: 'lluvia_flechas', nombre: ['Lluvia de flechas', 'Rain of arrows'], elemento: 'fisico', tipo: 'lluvia', cuadros: 12, t: 2, bucle: true,
    pinta: (c) => {
      const { L, u } = c, R = c.R();
      const fs: { x: number; y: number; ph: number; g: number }[] = [];
      for (let i = 0; i < 18; i++) { const a = R() * TAU, rr = Math.sqrt(R()) * 46; fs.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr, ph: R(), g: (R() - 0.5) * 0.3 }); }
      fs.sort((a, b) => a.x + a.y - b.x - b.y);
      const caida: V3 = unit([0.18, 0.12, -1]);
      for (const f of fs) {
        const q = frac(u + f.ph);
        if (q < 0.45) {
          const s = q / 0.45, h = 190 * (1 - s);
          const tip = add([f.x, f.y, 0], mul(caida, -h / -caida[2]));
          dibujaFlecha(L, sub(tip, mul(caida, 24)), tip, suave(0, 0.15, s));
          L.piso([f.x, f.y, 0], 4, [0, 0, 0], 0);
        } else {
          const s = (q - 0.45) / 0.55;
          const [x, y] = L.P([f.x, f.y, 0]);
          if (s < 0.4) L.humo(x, y - 2 - s * 6, 4 + s * 12, POLVO, 0.6 * (1 - s / 0.4), f.ph * 9, s);
          const al = 1 - suave(0.6, 1, s);
          const tip: V3 = [f.x + caida[0] * 5, f.y + caida[1] * 5, -5];
          dibujaFlecha(L, sub(tip, mul(unit(add(caida, [f.g, -f.g, 0])), 24)), [f.x, f.y, 0], al, false);
        }
      }
    },
  },

  // ============================== sombra (asesina)
  {
    id: 'paso_sombrio', nombre: ['Paso sombrío', 'Shadow step'], elemento: 'sombra', tipo: 'impacto', cuadros: 10, t: 2,
    pinta: (c) => {
      const { L, v } = c, R = c.R();
      const e = sale(v, 2), fin = Math.pow(1 - v, 1.1);
      if (v < 0.3) { const k = 1 - v / 0.3; L.bola([0, 0, 30], 22, SOMBRA[2], 1.2 * k); L.bola([0, 0, 30], 6, SOMBRA[0], 1.5 * k); }
      L.piso([0, 0, 0], 28, SOMBRA[3], 0.6 * fin);
      const ps: { p: V3; r: number; s: number }[] = [];
      for (let i = 0; i < 22; i++) {
        const d = unit([R() - 0.5, R() - 0.5, (R() - 0.3) * 1.2]), sp = 18 + R() * 22;
        ps.push({ p: add([0, 0, 28], add(mul(d, sp * e), [0, 0, v * 14])), r: 8 + R() * 6, s: R() });
      }
      ps.sort((a, b) => a.p[0] + a.p[1] - b.p[0] - b.p[1]);
      for (const p of ps) {
        L.bola(p.p, p.r * 1.6, SOMBRA[2], 0.3 * fin);
        L.humo3(p.p, p.r * (0.8 + e * 0.6), [0.16, 0.1, 0.24], 0.8 * fin, p.s * 9, v * 1.5);
      }
      for (let w = 0; w < 7; w++) {
        const a0 = R() * TAU, z0 = 10 + R() * 40;
        let prev: V3 | null = null;
        for (let i = 0; i <= 10; i++) {
          const s = i / 10, a = a0 + s * 2.4, rr = (8 + s * 30) * e;
          const p: V3 = [Math.cos(a) * rr, Math.sin(a) * rr, z0 + s * 16 * e];
          if (prev) L.rayo3(prev, p, 1, 1, SOMBRA[1], 0.7 * fin * (1 - s), 0.7 * fin * (1 - s - 0.1));
          prev = p;
        }
      }
    },
  },
  {
    id: 'tajo_garras', nombre: ['Tajo de garras', 'Claw slash'], elemento: 'fisico', tipo: 'impacto', cuadros: 6, t: 2, dir: true,
    pinta: (c) => {
      const { L, v } = c;
      const ROJO: C[] = [[1, 0.95, 0.92], [1, 0.45, 0.35], [0.8, 0.12, 0.1], [0.35, 0.02, 0.02]];
      const avance = sale(0.3 + v * 1.6, 2), fin = 1 - suave(0.35, 1, v);
      for (let j = 0; j < 3; j++) {
        const o = (j - 1) * 6;
        const pt = (s: number): V3 => {
          const q = s * 2 - 1;
          const b = c.fw(20 - q * q * 9 + j * 1.5, q * 22 + o * 0.5, 36 - q * 16 + (1 - q * q) * 7 + o);
          return b;
        };
        const N = 18, vis = avance;
        for (let i = 0; i < N; i++) {
          const s0 = (i / N) * vis, s1 = ((i + 1) / N) * vis;
          const w0 = Math.sin(Math.PI * (s0 / Math.max(vis, 0.01))) * 1.6 + 0.4, w1 = Math.sin(Math.PI * (s1 / Math.max(vis, 0.01))) * 1.6 + 0.4;
          const k0 = fin * (0.4 + 0.6 * (i / N)), k1 = fin * (0.4 + 0.6 * ((i + 1) / N));
          L.rayo3(pt(s0), pt(s1), w0 * 3, w1 * 3, ROJO[3], k0 * 0.35, k1 * 0.35);
          L.rayo3(pt(s0), pt(s1), w0 * 1.3, w1 * 1.3, ROJO[1], k0 * 0.8, k1 * 0.8);
          L.rayo3(pt(s0), pt(s1), w0 * 0.55, w1 * 0.55, ROJO[0], k0 * 1.6, k1 * 1.6);
        }
        const [x, y] = L.P(pt(vis));
        if (v < 0.6) destello(L, x, y, 3, ROJO[0], fin);
      }
      if (v > 0.15) salpicar(L, c.R(2), { n: 18, C0: c.fw(20, 0, 34), T: (v - 0.15) * 0.6, vel: [25, 60], sube: [0, 0.8], rumbo: Math.atan2(c.fy, c.fx) + 0.6, abre: 1.1, r: [0.7, 1.6] });
    },
  },
  {
    id: 'glifo_trampa', nombre: ['Glifo de trampa', 'Trap glyph'], elemento: 'arcano', tipo: 'area', cuadros: 8, t: 3, bucle: true,
    pinta: (c) => {
      const { L, u } = c, R = c.R(), ph = u * TAU;
      const pul = 0.75 + 0.25 * Math.sin(ph);
      const Rw = 18;
      L.piso([0, 0, 0], Rw * 1.2, TRAMPA[3], 0.5 * pul);
      L.aroPiso([0, 0, 0], Rw, 1.1, TRAMPA[1], 1.1 * pul);
      L.aroPiso([0, 0, 0], Rw, 3.5, TRAMPA[3], 0.4 * pul);
      L.aroPiso([0, 0, 0], Rw * 0.4, 0.9, TRAMPA[1], 0.9 * pul);
      const v3: V3[] = [0, 1, 2].map((i) => [Math.cos(i * TAU / 3 - Math.PI / 4) * Rw, Math.sin(i * TAU / 3 - Math.PI / 4) * Rw, 0.5]);
      for (let i = 0; i < 3; i++) {
        L.rayo3(v3[i], v3[(i + 1) % 3], 0.8, 0.8, TRAMPA[1], 0.9 * pul);
        L.rayo3(v3[i], [0, 0, 0.5], 0.7, 0.7, TRAMPA[2], 0.6 * pul);
        const [x, y] = L.P(v3[i]);
        L.luz(x, y, 3, TRAMPA[0], 1.2 * pul);
        runaPiso(L, i + 2, v3[i][0] * 0.62, v3[i][1] * 0.62, Math.atan2(v3[i][1], v3[i][0]), 2, TRAMPA[1], 0.8 * pul);
      }
      for (let i = 0; i < 6; i++) {
        const t = frac(u + R()), k = Math.floor(R() * 3);
        const [x, y] = L.P(add(v3[k], [(R() - 0.5) * 4, (R() - 0.5) * 4, t * 18]));
        L.luz(x, y, 1.1, TRAMPA[0], 1 * Math.sin(t * Math.PI));
      }
    },
  },

  // ============================== naturaleza (druida)
  {
    id: 'tornado', nombre: ['Tornado', 'Tornado'], elemento: 'naturaleza', tipo: 'area', cuadros: 10, t: 2, bucle: true,
    pinta: (c) => {
      const { L, u } = c, R = c.R(), ph = u * TAU;
      const H = 96;
      L.piso([0, 0, 0], 30, [0.5, 0.55, 0.5], 0.15);
      const eje = (z: number): V3 => { const s = Math.sin(z * 0.035 - ph) * 5 * (z / H); return [s / 2, -s / 2, z]; };
      const ps: { p: V3; r: number; c: C; a: number; ak: number; i: number }[] = [];
      for (let j = 0; j < 16; j++) {
        const q = j / 15, z = q * H, Rr = 5 + 27 * Math.pow(q, 1.4);
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * TAU + ph * 2 + j * 0.6;
          const e = eje(z);
          ps.push({ p: [e[0] + Math.cos(a) * Rr, e[1] + Math.sin(a) * Rr, z], r: 4 + q * 9 + R() * 3, c: mezcla([0.32, 0.31, 0.27], [0.6, 0.6, 0.55], R()), a, ak: Rr, i: j * 7 + k });
        }
      }
      ps.sort((a, b) => a.p[0] + a.p[1] - b.p[0] - b.p[1]);
      for (const p of ps) L.humo3(p.p, p.r, p.c, 0.3, p.i * 1.3, Math.cos(ph) * 0.4);
      for (let j = 0; j < 14; j++) {
        const q = j / 13, z = q * H, Rr = 6 + 27 * Math.pow(q, 1.4), e = eje(z);
        const a0 = ph * 2 + j * 1.1;
        let prev: V3 | null = null;
        for (let i = 0; i <= 8; i++) {
          const a = a0 + (i / 8) * 2;
          const p: V3 = [e[0] + Math.cos(a) * Rr, e[1] + Math.sin(a) * Rr, z + i * 0.8];
          if (prev) L.rayo3(prev, p, 0.9, 0.9, [0.75, 0.82, 0.72], 0.18 * Math.sin((i / 8) * Math.PI));
          prev = p;
        }
      }
      for (let i = 0; i < 14; i++) {
        const z = R() * H * 0.9, Rr = 8 + 26 * Math.pow(z / H, 1.4) + 4, a = R() * TAU + ph * 3, e = eje(z);
        const [x, y] = L.P([e[0] + Math.cos(a) * Rr, e[1] + Math.sin(a) * Rr, z]);
        const leaf = R() < 0.5;
        L.capsula(x - 1.2, y, x + 1.2, y - 0.6, 0.9, 0.7, leaf ? [0.25, 0.42, 0.12] : [0.22, 0.17, 0.12], 1);
      }
      humareda(L, c.R(6), 8, 0, 0, 18, 0, 10, u, 0.4, POLVO, 6, 12);
    },
  },
  {
    id: 'estallido_enredaderas', nombre: ['Estallido de enredaderas', 'Vine burst'], elemento: 'naturaleza', tipo: 'area', cuadros: 12, t: 2,
    pinta: (c) => {
      const { L, v } = c, R = c.R();
      const [cx, cy] = L.P([0, 0, 0]);
      const fin = 1 - suave(0.78, 1, v);
      L.piso([0, 0, 0], 34, NATURA[2], 0.6 * (1 - v));
      L.mancha(cx, cy, 20, 10, [0.16, 0.11, 0.07], 0.8 * suave(0, 0.15, v) * fin, 1, 4);
      const vs: { a: number; l: number; d: number; h: number; w: number; s: number }[] = [];
      for (let i = 0; i < 10; i++) vs.push({ a: (i / 10) * TAU + (R() - 0.5) * 0.4, l: 34 + R() * 22, d: R() * 0.2, h: 10 + R() * 16, w: (R() - 0.5) * 1.6, s: R() });
      vs.sort((p, q) => Math.cos(p.a) + Math.sin(p.a) - Math.cos(q.a) - Math.sin(q.a));
      for (const vi of vs) {
        const g = sale(c01((v - vi.d) / 0.45), 2);
        if (g <= 0) continue;
        const N = 14, pts: Pt[] = [], an: number[] = [];
        const n = Math.max(2, Math.round(N * g));
        for (let i = 0; i <= n; i++) {
          const s = (i / N);
          const a = vi.a + Math.sin(s * 5 + vi.s * 6) * 0.35 * vi.w;
          const r = s * vi.l;
          pts.push(L.P([Math.cos(a) * r, Math.sin(a) * r, Math.sin(s * Math.PI) * vi.h + 1]));
          an.push(2.3 * (1 - s * 0.75));
        }
        for (let i = 0; i < pts.length - 1; i++) L.capsula(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], an[i] + 0.6, an[i + 1] + 0.6, [0.05, 0.12, 0.03], fin);
        for (let i = 0; i < pts.length - 1; i++) L.capsula(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], an[i], an[i + 1], [0.16, 0.34, 0.08], fin);
        for (let i = 0; i < pts.length - 1; i++) L.capsula(pts[i][0] - 0.5, pts[i][1] - 0.7, pts[i + 1][0] - 0.5, pts[i + 1][1] - 0.7, an[i] * 0.35, an[i + 1] * 0.35, [0.38, 0.6, 0.18], fin);
        for (let i = 2; i < pts.length - 1; i += 2) {
          const [x, y] = pts[i], sd = i % 4 ? 1 : -1;
          L.poli([[x, y], [x + 3 * sd, y - 3.5], [x + 5.5 * sd, y - 1.5], [x + 2.5 * sd, y + 0.6]], [0.22, 0.48, 0.12], fin);
          L.poli([[x, y], [x + 3 * sd, y - 3.5], [x + 5.5 * sd, y - 1.5]], [0.42, 0.68, 0.2], fin);
          L.poli([[x - 0.8, y - an[i]], [x + 0.6, y - an[i] - 2.6], [x + 0.9, y - an[i]]], [0.55, 0.5, 0.32], fin);
        }
      }
      for (let i = 0; i < 18; i++) {
        const t = frac(v * 1.3 + R()), a = R() * TAU, rr = R() * 40;
        const [x, y] = L.P([Math.cos(a) * rr, Math.sin(a) * rr, 4 + t * 36]);
        L.luz(x, y, 1.1, NATURA[0], 1.1 * Math.sin(t * Math.PI) * (1 - v * 0.7));
        L.luz(x, y, 3, NATURA[1], 0.3 * Math.sin(t * Math.PI) * (1 - v * 0.7));
      }
    },
  },
  {
    id: 'transformacion_bestia', nombre: ['Transformación bestial', 'Beast transform burst'], elemento: 'naturaleza', tipo: 'buff', cuadros: 10, t: 2,
    pinta: (c) => {
      const { L, v } = c, R = c.R(), C0: V3 = [0, 0, 34];
      const env = Math.pow(1 - v, 1.4), e = sale(v, 2.5);
      L.piso([0, 0, 0], 32, BESTIA[2], 0.8 * env);
      L.aroPiso([0, 0, 0], 10 + 50 * e, 3, BESTIA[1], 0.9 * env);
      L.bola(C0, 30, BESTIA[3], 0.8 * env, 1, 1.4);
      for (let i = 0; i < 18; i++) {
        const d = unit([R() - 0.5, R() - 0.5, (R() - 0.4) * 1.4]), l = 20 + R() * 30;
        L.rayo3(add(C0, mul(d, 6 + 10 * e)), add(C0, mul(d, 6 + l * (0.4 + e))), 2, 0.6, BESTIA[1], 1.2 * env, 0);
      }
      for (let i = 0; i < 26; i++) {
        const d = unit([R() - 0.5, R() - 0.5, (R() - 0.2) * 1.2]), sp = 30 + R() * 30;
        const p = add(add(C0, mul(d, sp * e)), [0, 0, -20 * v * v]);
        const q = add(p, mul(d, -4));
        const [xa, ya] = L.P(p), [xb, yb] = L.P(q);
        L.capsula(xb, yb, xa, ya, 0.5, 1, R() < 0.5 ? [0.3, 0.2, 0.11] : [0.48, 0.34, 0.2], 1 - suave(0.6, 1, v));
      }
      L.bola(C0, 12, BESTIA[1], 1.6 * env);
      L.bola(C0, 5, BESTIA[0], 2.4 * Math.pow(1 - v, 2.5));
      humareda(L, c.R(4), 8, 0, 0, 30 * e + 8, 2, 16, v * 0.8, 0.45 * env, POLVO, 6, 13);
    },
  },

  // ============================== arcano y utilidades
  {
    id: 'destello_teleporte', nombre: ['Destello de teleporte', 'Teleport flash'], elemento: 'arcano', tipo: 'impacto', cuadros: 10, t: 2,
    pinta: (c) => {
      const { L, v } = c, R = c.R(), C0: V3 = [0, 0, 32];
      const [x, y] = L.P(C0);
      const fl = campana(v, 0, 0.32, 0.75);
      L.piso([0, 0, 0], 26, ARCANO[2], 0.9 * fl);
      L.luz(x, y, 14, ARCANO[2], 1.5 * fl, 0.35, 3.2);
      L.luz(x, y, 6, ARCANO[0], 2.5 * fl, 0.3, 4.5);
      L.luz(x, y, 30, ARCANO[3], 0.5 * fl);
      if (v > 0.3) {
        const t = (v - 0.3) / 0.7;
        L.aroPiso([0, 0, 0], 8 + 44 * sale(t), 2, ARCANO[1], 1.1 * (1 - t));
        L.anillo(x, y, 6 + 30 * sale(t), 1.4, ARCANO[1], 0.8 * (1 - t), 0.5);
      }
      for (let i = 0; i < 26; i++) {
        const d = unit([R() - 0.5, R() - 0.5, (R() - 0.5) * 1.6]), r0 = 30 + R() * 20;
        let p: V3, q: V3, k: number;
        if (v < 0.35) { const s = v / 0.35, rr = r0 * (1 - sale(s, 2)); p = add(C0, mul(d, rr)); q = add(C0, mul(d, rr + 6)); k = s; }
        else { const s = (v - 0.35) / 0.65, rr = r0 * 1.2 * sale(s, 2); p = add(C0, mul(d, rr + 4)); q = add(C0, mul(d, Math.max(0, rr - 4))); k = 1 - s; }
        L.rayo3(p, q, 0.9, 0.5, ARCANO[0], 1.3 * k, 0.2 * k);
      }
    },
  },
  {
    id: 'portal_regreso', nombre: ['Portal de regreso', 'Return portal'], elemento: 'arcano', tipo: 'invocacion', cuadros: 12, t: 2, bucle: true,
    pinta: (c) => {
      const { L, u } = c, R = c.R(), ph = u * TAU;
      const [cx, cy] = L.P([0, 0, 40]);
      const rx = 22, ry = 42;
      L.piso([0, 0, 0], 26, AZUL[2], 0.65);
      L.piso([0, 0, 0], 12, AZUL[1], 0.5);
      // superficie: un velo azul oscuro que tapa un poco lo de atrás
      {
        const pts: Pt[] = [];
        for (let i = 0; i < 32; i++) { const a = (i / 32) * TAU; pts.push([cx + Math.cos(a) * rx * 0.98, cy + Math.sin(a) * ry * 0.98]); }
        L.poli(pts, [0.02, 0.05, 0.16], 0.55);
      }
      L.campo(cx - rx * 1.9, cy - ry * 1.5, cx + rx * 1.9, cy + ry * 1.5, (dx, dy) => {
        const u2 = dx / rx, v2 = dy / ry, q = Math.hypot(u2, v2), th = Math.atan2(v2, u2);
        let k = 0;
        if (q < 1) {
          const s = Math.sin(th * 3 + q * 9 - ph * 2);
          const s2 = Math.sin(-th * 2 + q * 6 - ph * 3 + 1);
          k += (0.18 + 0.35 * Math.max(0, s) ** 2 + 0.2 * Math.max(0, s2) ** 3) * (0.35 + 0.65 * q);
          k += Math.exp(-q * q * 8) * 0.6;
        }
        const lick = 0.5 + 0.5 * Math.sin(th * 7 + ph * 2) * Math.sin(th * 4 - ph * 3);
        const d = (q - 1) * rx;
        k += Math.exp(-3 * (d / 2.4) * (d / 2.4)) * 1.5;
        if (d > 0) k += Math.exp(-d / (3 + 6 * lick)) * 0.6 * (0.4 + 0.6 * lick) * suave(1.45, 1.05, q);
        return k;
      }, (dx, dy) => {
        const q = Math.hypot(dx / rx, dy / ry);
        return q > 1.02 ? AZUL[1] : q > 0.93 ? AZUL[0] : rampa([AZUL[0], AZUL[1], AZUL[2]], q);
      }, cx, cy);
      for (let i = 0; i < 18; i++) {
        const t = frac(u + R()), a = R() * TAU;
        const rr = 1.4 - t * 1.3;
        const x = cx + Math.cos(a + t * 3) * rx * rr, y = cy + Math.sin(a + t * 3) * ry * rr;
        L.luz(x, y, 1.1, AZUL[0], 1 * Math.sin(t * Math.PI));
      }
      humareda(L, c.R(3), 6, 0, 0, 16, 0, 12, u, 0.3, [0.4, 0.6, 0.9], 6, 11);
    },
  },
  {
    id: 'subida_nivel', nombre: ['Subida de nivel', 'Level up'], elemento: 'sagrado', tipo: 'buff', cuadros: 16, t: 2,
    pinta: (c) => {
      const { L, v } = c, R = c.R();
      const env = suave(0, 0.12, v) * (1 - suave(0.55, 1, v));
      L.piso([0, 0, 0], 30, SAGRADO[2], 0.9 * env);
      L.rayo3([0, 0, 0], [0, 0, 110], 18, 22, SAGRADO[3], 0.35 * env, 0);
      L.rayo3([0, 0, 0], [0, 0, 100], 8, 10, SAGRADO[1], 0.8 * env, 0);
      L.rayo3([0, 0, 0], [0, 0, 80], 2.5, 2.5, SAGRADO[0], 1.5 * env, 0);
      for (let j = 0; j < 5; j++) {
        const t = v * 1.5 - j * 0.12;
        if (t <= 0 || t >= 1) continue;
        const z = sale(t, 1.5) * 100, R2 = 24 - t * 12;
        const [x, y] = L.P([0, 0, z]);
        const k = Math.sin(t * Math.PI);
        L.anillo(x, y, R2 * S2, 2.5, SAGRADO[3], 0.5 * k);
        L.anillo(x, y, R2 * S2, 1.1, SAGRADO[0], 1.2 * k);
      }
      for (let i = 0; i < 26; i++) {
        const t = c01(v * 1.4 - R() * 0.4), a = R() * TAU + t * 4, rr = 10 + R() * 12;
        if (t <= 0 || t >= 1) continue;
        const [x, y] = L.P([Math.cos(a) * rr, Math.sin(a) * rr, t * 110]);
        destello(L, x, y, 2 + R() * 2, SAGRADO[0], Math.sin(t * Math.PI));
      }
      if (v < 0.2) { L.piso([0, 0, 0], 22, SAGRADO[1], 1.2 * (1 - v / 0.2)); L.bola([0, 0, 8], 12, SAGRADO[0], 0.9 * (1 - v / 0.2)); }
    },
  },
  ...(
    [
      ['normal', 'Normal', [0.92, 0.9, 0.84]],
      ['magico', 'Magic', [0.35, 0.52, 1]],
      ['raro', 'Rare', [1, 0.9, 0.3]],
      ['unico', 'Unique', [0.86, 0.66, 0.32]],
      ['conjunto', 'Set', [0.3, 1, 0.32]],
    ] as [string, string, C][]
  ).map(([k, en, col]): Def => ({
    id: `haz_botin_${k}`, nombre: [`Haz de botín (${k === 'magico' ? 'mágico' : k === 'unico' ? 'único' : k})`, `Item drop beam (${en.toLowerCase()})`], elemento: 'arcano', tipo: 'aura', cuadros: 8, t: 3, bucle: true,
    pinta: (c) => {
      const { L, u } = c, R = c.R(), ph = u * TAU;
      const pul = 0.85 + 0.15 * Math.sin(ph);
      const hondo: C = [col[0] * 0.45, col[1] * 0.45, col[2] * 0.45], claro = mezcla(col, BLANCO, 0.6);
      L.piso([0, 0, 0], 12, col, 0.6 * pul);
      L.rayo3([0, 0, 0], [0, 0, 104], 8, 6, hondo, 0.35 * pul, 0);
      L.rayo3([0, 0, 0], [0, 0, 100], 2.6, 2, col, 0.9 * pul, 0);
      L.rayo3([0, 0, 0], [0, 0, 80], 0.8, 0.7, claro, 1.6 * pul, 0);
      L.aroPiso([0, 0, 0], 7, 1.2, col, 0.8 * pul);
      for (let i = 0; i < 5; i++) {
        const t = frac(u + i / 5 + R() * 0.1), a = R() * TAU;
        const [x, y] = L.P([Math.cos(a) * 3, Math.sin(a) * 3, t * 80]);
        L.luz(x, y, 1.1, claro, 1.2 * Math.sin(t * Math.PI));
      }
      const [x, y] = L.P([0, 0, 2]);
      destello(L, x, y, 5 + 2 * Math.sin(ph), claro, 0.9 * pul);
    },
  })),
  // ============================== golpes y sangre
  {
    id: 'salpicadura_sangre', nombre: ['Salpicadura de sangre', 'Blood splat'], elemento: 'sangre', tipo: 'impacto', cuadros: 8, t: 2,
    // golpe húmedo: apenas un fogonazo rojo, niebla de sangre que cae, un chorro hacia un lado y gotas sueltas que
    // se estiran en el aire y dejan manchas alargadas en el piso
    pinta: (c) => {
      const { L, v } = c, R = c.R(), C0: V3 = [0, 0, 32];
      const [x, y] = L.P(C0);
      if (v < 0.25) { const k = 1 - v / 0.25; L.luz(x, y, 10, [0.7, 0.05, 0.05], 0.8 * k); L.luz(x, y, 3, [1, 0.75, 0.7], 1.2 * k); }
      for (let i = 0; i < 6; i++) {
        const a = R() * TAU, d = 4 + R() * 12 * sale(v);
        L.humo3([Math.cos(a) * d, Math.sin(a) * d, 32 - v * 12 + (R() - 0.5) * 8], 5 + 9 * sale(v), mezcla(SANGRE[2], SANGRE[1], R()), 0.5 * Math.pow(1 - v, 1.5), i * 2.3, v);
      }
      salpicar(L, c.R(2), { n: 30, C0, T: v * 0.8, vel: [35, 80], sube: [-0.1, 0.7], rumbo: 0.3, abre: 0.9, r: [0.9, 2.4], g: 130 });
      salpicar(L, c.R(3), { n: 18, C0, T: v * 0.8, vel: [15, 50], sube: [0, 1.1], r: [0.7, 1.8], g: 130 });
    },
  },
  {
    id: 'chispas_metal', nombre: ['Chispas (metal)', 'Hit sparks (metal)'], elemento: 'fisico', tipo: 'impacto', cuadros: 6, t: 2,
    pinta: (c) => {
      const { L, v } = c, R = c.R(), C0: V3 = [0, 0, 36];
      const CH: C[] = [[1, 1, 0.9], [1, 0.85, 0.45], [1, 0.55, 0.15], [0.5, 0.2, 0.05]];
      const env = Math.pow(1 - v, 2);
      const [x, y] = L.P(C0);
      // humo de metal caliente (detrás)
      L.humo(x + 2, y - 4 - v * 10, 3 + 8 * v, [0.2, 0.19, 0.19], 0.35 * campana(v, 0.1, 0.35, 1), 5, v);
      L.luz(x, y, 16, CH[2], 0.55 * env);
      L.luz(x, y, 6, CH[1], 1.2 * env);
      L.luz(x, y, 2.5, CH[0], 2.6 * env);
      rayosLuz(L, rng(c.sem + c.f * 31), x, y, 7, 18 * (0.6 + v), CH, 1.3 * env);
      ondaAire(L, x, y, 3 + 16 * sale(v, 2), 1, CH[1], 0.6 * env, 4.1);
      for (let i = 0; i < 20; i++) {
        const d = unit([R() - 0.5, R() - 0.5, R() * 0.9 - 0.2]), sp = 60 + R() * 70, lt = 0.6 + R() * 0.4;
        const T = v / lt;
        if (T >= 1) continue;
        const pos = (t: number): V3 => add(C0, [d[0] * sp * t, d[1] * sp * t, d[2] * sp * t - 90 * t * t]);
        const p0 = pos(v * 0.5), p1 = pos(Math.max(0, v * 0.5 - 0.07));
        L.rayo3(p0, p1, 0.75, 0.5, rampa(CH, 0.1 + T * 0.7), 1.8 * (1 - T), 0.1);
      }
      // gotitas de metal fundido: caen en arco y se enfrían del blanco al rojo
      for (let i = 0; i < 7; i++) {
        const a = R() * TAU, sp = 25 + R() * 35, up = 0.3 + R() * 0.8;
        const pos = (t: number): V3 => [Math.cos(a) * sp * t, Math.sin(a) * sp * t, Math.max(0, 36 + up * sp * t - 140 * t * t)];
        const p0 = pos(v * 0.6), p1 = pos(Math.max(0, v * 0.6 - 0.03));
        L.rayo3(p0, p1, 0.9, 0.6, rampa(CH, 0.2 + v * 0.8), 1.4 * (1 - v * 0.7), 0.2);
      }
    },
  },
  {
    id: 'chispas_carne', nombre: ['Chispas (carne)', 'Hit sparks (flesh)'], elemento: 'fisico', tipo: 'impacto', cuadros: 6, t: 2,
    // golpe en carne: fogonazo rojo corto, onda de aire, niebla de sangre y gotas con gravedad que manchan el piso
    pinta: (c) => {
      const { L, v } = c, R = c.R(), C0: V3 = [0, 0, 34];
      const env = Math.pow(1 - v, 2);
      const [x, y] = L.P(C0);
      L.humo(x, y + v * 3, 4 + 9 * v, SANGRE[2], 0.5 * (1 - v), 2, v);
      L.luz(x, y, 12, [0.8, 0.1, 0.06], 0.7 * env);
      L.luz(x, y, 4, [1, 0.75, 0.65], 1.7 * env);
      ondaAire(L, x, y, 7 + 14 * sale(v, 2), 1.2, [1, 0.4, 0.3], 0.5 * env, 1.3);
      for (let i = 0; i < 5; i++) {
        const a = R() * TAU, l = 6 + 10 * sale(v);
        L.trazo(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, 0.9, 0.5, [1, 0.55, 0.45], 1.1 * env, 0);
      }
      salpicar(L, c.R(2), { n: 20, C0, T: v * 0.55, vel: [35, 75], sube: [-0.1, 0.8], r: [0.7, 1.7], g: 120 });
    },
  },
  ...(
    [
      ['vida', 'Pocion de vida', 'Health potion glow', [1, 0.22, 0.2]],
      ['mana', 'Pocion de maná', 'Mana potion glow', [0.28, 0.45, 1]],
      ['rejuvenecer', 'Pocion de rejuvenecer', 'Rejuvenation potion glow', [0.78, 0.3, 1]],
    ] as [string, string, string, C][]
  ).map(([k, es, en, col]): Def => ({
    id: `brillo_pocion_${k}`, nombre: [`Brillo de ${es.toLowerCase().replace('pocion', 'poción')}`, en], elemento: 'arcano', tipo: 'buff', cuadros: 12, t: 2,
    pinta: (c) => {
      const { L, v } = c, R = c.R();
      const env = campana(v, 0, 0.2, 1);
      const claro = mezcla(col, BLANCO, 0.55), hondo: C = [col[0] * 0.4, col[1] * 0.4, col[2] * 0.4];
      L.piso([0, 0, 0], 24, col, 0.6 * env);
      L.aroPiso([0, 0, 0], 12 + 14 * sale(v), 1.5, claro, 0.9 * (1 - v));
      L.bola([0, 0, 30], 24, hondo, 0.6 * env, 1, 1.6);
      for (let i = 0; i < 22; i++) {
        const d = R() * 0.35, a0 = R() * TAU, r0 = 14 + R() * 8, ar = (i % 2 ? 1 : -1) * (2.5 + R());
        const age = (v - d) / 0.65;
        if (age <= 0 || age >= 1) continue;
        const a = a0 + age * ar, rr = r0 * (1 - age * 0.5);
        const p: V3 = [Math.cos(a) * rr, Math.sin(a) * rr, 2 + age * 66];
        const q: V3 = [Math.cos(a - 0.35 * Math.sign(ar)) * rr, Math.sin(a - 0.35 * Math.sign(ar)) * rr, p[2] - 4];
        const k = Math.sin(age * Math.PI);
        L.rayo3(p, q, 1.1, 0.5, col, 1.1 * k, 0);
        L.bola(p, 1.3, claro, 1.4 * k);
      }
    },
  })),
  {
    id: 'alma_ascendente', nombre: ['Alma que asciende', 'Rising soul'], elemento: 'sombra', tipo: 'aura', cuadros: 16, t: 2,
    pinta: (c) => {
      const { L, v } = c, R = c.R();
      const env = suave(0, 0.15, v) * (1 - suave(0.6, 1, v));
      const z0 = 12 + sale(v, 1.4) * 105;
      L.piso([0, 0, 0], 18, ALMA[2], 0.6 * (1 - v));
      const sway = (z: number) => Math.sin(z * 0.08 + v * 8) * 4;
      for (let i = 0; i < 14; i++) {
        const s = i / 13, z = z0 - 4 - s * 34, sw = sway(z) * s;
        L.bola([sw / 2, -sw / 2, z], 6.5 * (1 - s) + 1.2, rampa(ALMA, 0.15 + s * 0.8), 0.7 * env * (1 - s * 0.8));
      }
      for (let w = 0; w < 3; w++) {
        let prev: V3 | null = null;
        for (let i = 0; i <= 10; i++) {
          const s = i / 10, z = z0 - s * 46, sw = (sway(z) + Math.sin(s * 6 + w * 2 + v * 10) * 5) * s + (w - 1) * 4 * s;
          const p: V3 = [sw / 2, -sw / 2, z];
          if (prev) L.rayo3(prev, p, 0.8, 0.8, ALMA[1], 0.6 * env * (1 - s));
          prev = p;
        }
      }
      const [x, y] = L.P([0, 0, z0]);
      L.luz(x, y, 18, ALMA[3], 0.45 * env);
      L.luz(x, y - 1, 7, ALMA[1], 0.9 * env, 0.85, 1.1);
      L.luz(x, y - 1, 3, ALMA[0], 1.4 * env);
      L.capsula(x - 2, y - 2, x - 2, y - 1.2, 0.8, 0.8, [0.04, 0.12, 0.14], 0.7 * env);
      L.capsula(x + 2, y - 2, x + 2, y - 1.2, 0.8, 0.8, [0.04, 0.12, 0.14], 0.7 * env);
      L.capsula(x, y + 2, x, y + 2.6, 0.7, 0.9, [0.04, 0.12, 0.14], 0.5 * env);
      for (let i = 0; i < 8; i++) {
        const t = frac(v * 2 + R()), a = R() * TAU;
        const [px, py] = L.P([Math.cos(a) * 10, Math.sin(a) * 10, z0 - 30 + t * 40]);
        L.luz(px, py, 1, ALMA[0], 0.9 * env * Math.sin(t * Math.PI));
      }
    },
  },
  // ============================== nuevos: proyectiles e impactos por elemento (van al lado de los de siempre)
  {
    id: 'virote', nombre: ['Virote', 'Crossbow bolt'], elemento: 'fisico', tipo: 'proyectil', cuadros: 4, t: 2, dir: true, bucle: true,
    pinta: (c) => {
      const { L } = c, z = ALTO_VUELO, R = c.R();
      const ond = Math.sin(c.u * TAU) * 0.25;
      // aire cortado: dos hilos tenues que se abren detrás
      for (const l of [-1.6, 1.6]) {
        const [xa, ya] = L.P(c.fw(-9, l * 0.4, z)), [xb, yb] = L.P(c.fw(-46, l * 2.2, z + 1));
        L.trazo(xa, ya, xb, yb, 0.9, 0.5, [0.8, 0.82, 0.86], 0.2, 0);
      }
      for (let i = 0; i < 3; i++) {
        const t = frac(c.u + i / 3 + R() * 0.1), [x, y] = L.P(c.fw(-12 - t * 30, (R() - 0.5) * 4, z + (R() - 0.5) * 3));
        L.luz(x, y, 0.8, [0.9, 0.9, 0.9], 0.35 * (1 - t));
      }
      dibujaVirote(L, c.fw(-11, ond, z), c.fw(11, 0, z));
    },
  },
  {
    id: 'saeta_sagrada', nombre: ['Saeta sagrada', 'Holy lance'], elemento: 'sagrado', tipo: 'proyectil', cuadros: 6, t: 2, dir: true, bucle: true,
    pinta: (c) => {
      const { L } = c, z = ALTO_VUELO, ph = c.u * TAU, R = c.R();
      const H = c.fw(16, 0, z), T = c.fw(-20, 0, z);
      L.piso(c.fw(6, 0, 0), 22, SAGRADO[2], 0.35);
      // cintas de luz en hélice detrás (estela)
      for (let w = 0; w < 2; w++) {
        let prev: V3 | null = null;
        for (let i = 0; i <= 16; i++) {
          const s = i / 16, a = s * 9 - ph * 2 + w * Math.PI;
          const p = c.fw(-12 - s * 34, Math.cos(a) * (1 + s * 3), z + Math.sin(a) * (1 + s * 2.5));
          if (prev) L.rayo3(prev, p, 1 + s * 1.4, 1 + s * 1.4, rampa(SAGRADO, 0.2 + s * 0.7), 0.5 * Math.pow(1 - s, 1.5), 0.5 * Math.pow(Math.max(0, 1 - s - 1 / 16), 1.5));
          prev = p;
        }
      }
      // halo y cuerpo en capas: borde dorado oscuro, cuerpo dorado, alma blanca
      L.bola(c.fw(4, 0, z), 20, SAGRADO[3], 0.45, 1.3, 1);
      L.rayo3(c.fw(-30, 0, z), H, 1.5, 7, SAGRADO[3], 0.2, 0.5);
      L.rayo3(T, H, 2.4, 6, SAGRADO[2], 0.6, 0.9);
      L.rayo3(T, H, 1.1, 2.8, SAGRADO[1], 0.9, 1.2);
      L.rayo3(c.fw(-14, 0, z), c.fw(15, 0, z), 0.55, 1.2, BLANCO, 1.3, 1.9);
      // alas de luz que aletean junto a la cola
      for (const sd of [-1, 1]) for (let k = 0; k < 2; k++) {
        const b = c.fw(-6 - k * 6, 0, z), ab = 0.6 + 0.25 * Math.sin(ph * 2 + k);
        const t2 = c.fw(-15 - k * 7, sd * 9 * ab, z + 6 * ab - k * 2);
        L.rayo3(b, t2, 1.4, 0.4, SAGRADO[1], 0.6 - k * 0.2, 0);
        L.rayo3(b, t2, 0.5, 0.3, SAGRADO[0], 0.9 - k * 0.3, 0);
      }
      // punta: destello que respira
      const [hx, hy] = L.P(H);
      L.luz(hx, hy, 10, SAGRADO[2], 0.8);
      L.luz(hx, hy, 4, SAGRADO[0], 1.6 * (0.9 + 0.1 * Math.sin(ph * 2)));
      destello(L, hx, hy, 6 + 2 * Math.sin(ph * 2), SAGRADO[0], 0.9);
      // motas que se desprenden y caen
      for (let i = 0; i < 8; i++) {
        const t = frac(c.u * 2 + R()), l = (R() - 0.5) * 10;
        const [x, y] = L.P(c.fw(-6 - t * 40, l * t, z - t * t * 14 + (R() - 0.5) * 4));
        L.luz(x, y, 1, SAGRADO[0], 1.1 * (1 - t));
        L.luz(x, y, 2.6, SAGRADO[2], 0.25 * (1 - t));
      }
    },
  },
  {
    id: 'saeta_veneno', nombre: ['Saeta de veneno', 'Venom glob'], elemento: 'veneno', tipo: 'proyectil', cuadros: 6, t: 2, dir: true, bucle: true,
    pinta: (c) => {
      const { L } = c, z = ALTO_VUELO, ph = c.u * TAU, R = c.R();
      const H = c.fw(8, 0, z);
      L.piso(H, 16, VENENO[2], 0.3);
      // vapor tóxico detrás (materia, más oscuro en el borde)
      for (let i = 0; i < 6; i++) {
        const t = frac(c.u + i / 6);
        L.humo3(c.fw(-4 - t * 34, (R() - 0.5) * 7, z + 2 + t * 7), 3 + t * 7, mezcla([0.12, 0.2, 0.05], [0.28, 0.4, 0.1], R()), 0.42 * campana(t, 0, 0.12, 1), i * 2.3, t);
      }
      // gotas que chorrean y caen
      for (let i = 0; i < 6; i++) {
        const t = frac(c.u * 1.5 + R()), l = (R() - 0.5) * 6;
        const p = c.fw(-2 - t * 26, l, z - 1 - t * t * 30), q = c.fw(-2 - t * 26, l, z + 2 - t * t * 30);
        if (p[2] < 1) continue;
        const [xa, ya] = L.P(p), [xb, yb] = L.P(q);
        L.capsula(xb, yb, xa, ya, 0.4, 1, BILIS[2], 1 - t * 0.5);
        L.luz(xa, ya, 1.4, VENENO[1], 0.5 * (1 - t));
      }
      L.bola(H, 14, VENENO[3], 0.45);
      L.bola(H, 8, VENENO[2], 0.5);
      // la gota: cola que se adelgaza y cuerpo viscoso que tiembla
      const [hx, hy] = L.P(H);
      for (let k = 3; k >= 1; k--) {
        const [x, y] = L.P(c.fw(8 - k * 5, Math.sin(ph + k) * 0.8, z + Math.cos(ph * 2 + k) * 0.6));
        L.mancha(x, y, 4.2 - k * 0.9, 3.4 - k * 0.7, BILIS[2], 1, k * 3 + Math.cos(ph) * 0.4, Math.sin(ph) * 0.4, 0.5);
      }
      L.mancha(hx, hy, 7.4 + Math.sin(ph * 2) * 0.5, 6 - Math.sin(ph * 2) * 0.4, BILIS[3], 1, Math.cos(ph) * 0.6, Math.sin(ph) * 0.6, 0.45);
      L.mancha(hx - 0.3, hy - 0.3, 6.2, 5, BILIS[2], 1, 2 + Math.cos(ph) * 0.6, Math.sin(ph) * 0.6, 0.45);
      L.mancha(hx - 0.8, hy - 0.8, 4.4, 3.4, BILIS[1], 1, 3 + Math.cos(ph) * 0.6, 1 + Math.sin(ph) * 0.6, 0.5);
      L.luz(hx + 1, hy + 0.8, 4.5, VENENO[1], 0.9);
      L.luz(hx + 0.6, hy + 0.4, 2, VENENO[0], 1.1);
      L.luz(hx - 2.6, hy - 2.4, 1.1, BLANCO, 1.3);
      // burbujas que revientan alrededor
      for (let i = 0; i < 4; i++) {
        const t = frac(c.u + i / 4), a = R() * TAU;
        L.anillo(hx + Math.cos(a) * 5, hy + Math.sin(a) * 4 - t * 4, 0.8 + t * 1.4, 0.5, VENENO[1], 0.7 * (1 - t), 1);
      }
    },
  },
  {
    id: 'impacto_rayo', nombre: ['Impacto de rayo', 'Lightning impact'], elemento: 'rayo', tipo: 'impacto', cuadros: 8, t: 2,
    pinta: (c) => {
      const { L, v, f } = c, R = c.R(), C0: V3 = [0, 0, 30], Rf = rng(c.sem + f * 4517);
      const e = sale(v, 2.2), fin = Math.pow(1 - v, 1.3);
      const [x, y] = L.P(C0), [cx, cy] = L.P([0, 0, 0]);
      // quemadura en el piso (queda)
      L.mancha(cx, cy, 16 * sale(v * 3), 8 * sale(v * 3), [0.05, 0.05, 0.07], 0.55 * (1 - suave(0.75, 1, v)), 3, 2);
      L.piso([0, 0, 0], 34, RAYO[2], 0.9 * fin);
      ondaChoque(L, 10 + 46 * e, 2.4 + 2 * v, RAYO[1], 0.9 * Math.pow(1 - v, 1.6), 3.1, 0.25);
      // fogonazo
      if (v < 0.3) { const k = 1 - v / 0.3; L.luz(x, y, 30, RAYO[2], 1.1 * k); L.luz(x, y, 9, RAYO[0], 2.6 * k); ondaAire(L, x, y, 8 + 40 * e, 2, RAYO[1], 0.8 * k, 1.7); }
      // ramas que salen del golpe y chisporrotean (otro azar por cuadro)
      const nr = v < 0.5 ? 7 : 4;
      for (let i = 0; i < nr; i++) {
        const d = unit([Rf() - 0.5, Rf() - 0.5, (Rf() - 0.6) * 0.8]), l = (14 + Rf() * 26) * (0.5 + e);
        dibujaRayo(L, zigzag(C0, add(C0, mul(d, l)), Rf, 0.3, 4), RAYO, fin * (0.8 + Rf() * 0.4), 0.7, 0);
      }
      // arcos que trepan por el piso al final
      for (let i = 0; i < 3; i++) {
        const a = Rf() * TAU, rr = 6 + Rf() * 22, b = Rf() * TAU, l = 6 + Rf() * 10;
        const o: V3 = [Math.cos(a) * rr, Math.sin(a) * rr, 0.5];
        dibujaRayo(L, zigzag(o, add(o, [Math.cos(b) * l, Math.sin(b) * l, 0]), Rf, 0.3, 3, true), RAYO, 0.7 * campana(v, 0.2, 0.5, 1), 0.5, 0.1);
      }
      // chispas con gravedad
      for (let i = 0; i < 18; i++) {
        const a = R() * TAU, sp = 40 + R() * 60, up = 0.2 + R() * 0.9, lt = 0.5 + R() * 0.5;
        const T = v / lt;
        if (T >= 1) continue;
        const pos = (q: number): V3 => [Math.cos(a) * sp * q, Math.sin(a) * sp * q, 30 + up * sp * q - 120 * q * q];
        const p0 = pos(T * lt * 0.8), p1 = pos(Math.max(0, T * lt * 0.8 - 0.05));
        if (p0[2] < 0) continue;
        L.rayo3(p0, p1, 0.7, 0.4, RAYO[0], 1.5 * (1 - T), 0);
      }
      humareda(L, c.R(3), 4, 0, 0, 8, 6, 26, v * 0.7, 0.3 * suave(0.15, 0.4, v) * (1 - v), [0.2, 0.2, 0.25], 4, 10);
    },
  },
  {
    id: 'impacto_veneno', nombre: ['Impacto de veneno', 'Venom splash'], elemento: 'veneno', tipo: 'impacto', cuadros: 8, t: 2,
    pinta: (c) => {
      const { L, v } = c, R = c.R(), C0: V3 = [0, 0, 30];
      const e = sale(v, 2), fin = Math.pow(1 - v, 1.2);
      const [x, y] = L.P(C0), [cx, cy] = L.P([0, 0, 0]);
      // charco ácido que chisporrotea
      L.mancha(cx, cy, 18 * sale(v * 2.5), 9 * sale(v * 2.5), BILIS[3], 0.8 * (1 - suave(0.8, 1, v)), 1.3, 2.4, 0.6);
      L.mancha(cx, cy - 0.5, 11 * sale(v * 2.5), 5.5 * sale(v * 2.5), BILIS[2], 0.8 * (1 - suave(0.8, 1, v)), 4.3, 1.1, 0.6);
      L.piso([0, 0, 0], 26, VENENO[2], 0.6 * fin);
      ondaChoque(L, 6 + 30 * e, 2, VENENO[1], 0.6 * Math.pow(1 - v, 2), 5.2, 0.2);
      if (v < 0.3) { const k = 1 - v / 0.3; L.luz(x, y, 18, VENENO[2], 0.9 * k); L.luz(x, y, 6, VENENO[0], 1.8 * k); }
      // vapor que sube del ácido
      for (let i = 0; i < 7; i++) {
        const a = R() * TAU, d = R() * 14 * e, t = c01(v * 1.3 - R() * 0.2);
        L.humo3([Math.cos(a) * d, Math.sin(a) * d, 4 + t * 26], 5 + t * 9, mezcla([0.16, 0.26, 0.06], [0.34, 0.46, 0.12], R()), 0.45 * Math.sin(t * Math.PI), i * 2.1, t);
      }
      salpicar(L, c.R(2), { n: 26, C0, T: v * 0.7, vel: [30, 70], sube: [-0.1, 0.9], pal: BILIS, r: [0.7, 1.8], g: 130 });
      // burbujas que revientan en el charco
      for (let i = 0; i < 6; i++) {
        const t = frac(v * 2 + R()), a = R() * TAU, rr = R() * 14;
        const [bx, by] = L.P([Math.cos(a) * rr, Math.sin(a) * rr, 0]);
        L.anillo(bx, by - 1, 0.8 + t * 2, 0.5, VENENO[1], 0.8 * (1 - t) * suave(0.1, 0.3, v), 1.6);
      }
    },
  },
  {
    id: 'impacto_sagrado', nombre: ['Impacto sagrado', 'Holy impact'], elemento: 'sagrado', tipo: 'impacto', cuadros: 8, t: 2,
    pinta: (c) => estallidoSagrado(c, 0.8, false),
  },
  {
    id: 'impacto_hueso', nombre: ['Impacto de hueso', 'Bone shatter'], elemento: 'hueso', tipo: 'impacto', cuadros: 8, t: 2,
    pinta: (c) => {
      const { L, v } = c, R = c.R(), C0: V3 = [0, 0, 32];
      const fin = Math.pow(1 - v, 1.3);
      const [x, y] = L.P(C0);
      L.piso([0, 0, 0], 20, ALMA[2], 0.45 * fin);
      // el chasquido: un destello blanco y la onda de aire
      if (v < 0.3) { const k = 1 - v / 0.3; L.luz(x, y, 15, ALMA[2], 0.8 * k); L.luz(x, y, 4.5, [1, 0.98, 0.9], 1.8 * k); ondaAire(L, x, y, 6 + 26 * sale(v, 2), 1.6, ALMA[1], 0.6 * k, 2.2); }
      // la nube de polvo de hueso: se abre, se aplasta y se asienta
      for (let i = 0; i < 9; i++) {
        const a = R() * TAU, d = 4 + R() * 18 * sale(v), z = 26 + R() * 12 - sale(v) * 10 * R();
        L.humo3([Math.cos(a) * d, Math.sin(a) * d, z], 4 + 9 * sale(v), [0.6, 0.56, 0.48], 0.42 * campana(v, 0, 0.18, 1), i * 2.7, v);
      }
      // espíritus que se deshacen
      for (let w = 0; w < 3; w++) {
        const a0 = R() * TAU;
        let prev: V3 | null = null;
        for (let i = 0; i <= 8; i++) {
          const s = i / 8, a = a0 + s * 2, rr = (4 + s * 22) * sale(v);
          const p: V3 = [Math.cos(a) * rr, Math.sin(a) * rr, 32 + s * 12 * sale(v)];
          if (prev) L.rayo3(prev, p, 0.9, 0.9, ALMA[1], 0.55 * fin * (1 - s), 0.55 * fin * (1 - s - 0.12));
          prev = p;
        }
      }
      // las esquirlas: largas y quebradas, con el tuétano en la boca; las chicas vuelan más lejos
      esquirlas(L, c.R(4), 9, C0, v * 0.75, [26, 60], 110, [11, 17]);
      esquirlas(L, c.R(5), 11, C0, v * 0.75, [38, 85], 110, [5, 9]);
      // motas de polvo fino que caen
      const Rm = c.R(7);
      for (let i = 0; i < 24; i++) {
        const a = Rm() * TAU, sp = 14 + Rm() * 46, up = Rm() * 40, t = v * 0.75, z = 32 + up * t - 70 * t * t;
        if (z <= 0) continue;
        const [px, py] = L.P([Math.cos(a) * sp * t, Math.sin(a) * sp * t, z]);
        L.capsula(px, py, px + 0.4, py, 0.55, 0.55, [0.8, 0.76, 0.66], 0.85 * (1 - v * 0.7));
      }
    },
  },
  {
    id: 'nova_sangre', nombre: ['Nova de sangre', 'Blood nova'], elemento: 'sangre', tipo: 'area', cuadros: 14, t: 2,
    pinta: (c) => {
      const { L, v } = c, R = c.R();
      const e = sale(v, 2), Rw = 8 + 72 * e, fade = Math.pow(1 - v, 0.9) * suave(0, 0.08, v + 0.03);
      const [cx, cy] = L.P([0, 0, 0]);
      // charco central que se extiende
      L.mancha(cx, cy, 20 * sale(v * 2), 10 * sale(v * 2), SANGRE[3], 0.85, 2.2, 1.4, 0.7);
      L.mancha(cx - 1, cy - 0.5, 12 * sale(v * 2), 6 * sale(v * 2), SANGRE[2], 0.8 * (1 - v * 0.5), 5.1, 0.3, 0.6);
      L.piso([0, 0, 0], Rw * 0.9, [0.5, 0.02, 0.03], 0.35 * fade);
      if (v < 0.22) { const k = 1 - v / 0.22; L.bola([0, 0, 26], 26, [0.6, 0.02, 0.04], 1.2 * k); L.bola([0, 0, 26], 9, [1, 0.6, 0.55], 1.6 * k); }
      ondaChoque(L, Rw, 3 + 4 * v, [0.9, 0.08, 0.08], 0.9 * fade, 7.7, 0.4);
      // niebla carmesí que acompaña al frente
      const ps: { a: number; r: number }[] = [];
      for (let i = 0; i < 26; i++) ps.push({ a: (i / 26) * TAU + R() * 0.2, r: R() });
      ps.sort((p, q) => Math.cos(p.a) + Math.sin(p.a) - Math.cos(q.a) - Math.sin(q.a));
      for (const p of ps) L.humo3([Math.cos(p.a) * Rw * 0.95, Math.sin(p.a) * Rw * 0.95, 4 + p.r * 8], 6 + 6 * v + p.r * 3, mezcla(SANGRE[2], SANGRE[1], p.r), 0.5 * fade, p.a * 4, v * 2);
      // la ola: chorros radiales que suben y caen en anillo
      salpicar(L, c.R(5), { n: 70, C0: [0, 0, 10], T: v * 0.95, vel: [65, 120], sube: [0.25, 0.8], r: [0.9, 2.4], g: 140 });
      salpicar(L, c.R(6), { n: 24, C0: [0, 0, 24], T: v * 0.8, vel: [15, 40], sube: [0.6, 1.4], r: [1.2, 2.6], g: 150 });
    },
  },
  {
    id: 'maldicion_sombra', nombre: ['Maldición de sombra', 'Shadow curse'], elemento: 'sombra', tipo: 'area', cuadros: 14, t: 2,
    pinta: (c) => {
      const { L, v } = c, R = c.R();
      const env = suave(0, 0.2, v) * (1 - suave(0.7, 1, v)), Rw = 30, rot = v * 1.2;
      const [cx, cy] = L.P([0, 0, 0]);
      // oscuridad que se come el piso
      L.piso([0, 0, 0], Rw * 1.2, SOMBRA[3], 0.45 * env);
      L.mancha(cx, cy, Rw * S2 * 0.95 * sale(v * 2), Rw * S2 * 0.47 * sale(v * 2), [0.02, 0.005, 0.035], 0.85 * env, 1.7 + v, 0.4, 1.1);
      // sello que se quema hacia adentro: anillos rotos y runas
      const quema = sale(c01(v / 0.4), 2);
      const jiron = (a: number, k: number) => suave(0.3, 0.7, fbm(Math.cos(a) * 3 + k, Math.sin(a) * 3 + v * 1.5));
      L.aroPiso([0, 0, 0], Rw, 1.2, SOMBRA[1], 1.2 * env, (a) => suave(0, 0.04, quema - (frac((a + Math.PI) / TAU + 0.25))) * (0.2 + 0.8 * jiron(a, 0)));
      L.aroPiso([0, 0, 0], Rw * 0.72, 0.9, SOMBRA[2], 0.9 * env, (a) => jiron(a, 5));
      L.aroPiso([0, 0, 0], Rw, 4, SOMBRA[3], 0.4 * env, (a) => jiron(a, 9));
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU + rot;
        if (frac(i / 9 + 0.25) > quema) continue;
        runaPiso(L, i + 3, Math.cos(a) * Rw * 0.86, Math.sin(a) * Rw * 0.86, a, 2.3, SOMBRA[1], 0.9 * env * (0.6 + 0.4 * Math.sin(v * 12 + i)));
      }
      // zarcillos de humo negro que suben y se enroscan hacia el centro
      for (let w = 0; w < 8; w++) {
        const a0 = (w / 8) * TAU + R() * 0.5, h = 40 + R() * 34, t0 = R() * 0.3;
        const g = sale(c01((v - t0) / 0.5), 2) * env;
        if (g <= 0.02) continue;
        let prev: V3 | null = null;
        for (let i = 0; i <= 10; i++) {
          const s = i / 10, a = a0 + s * 1.6 + Math.sin(v * 6 + w) * 0.2, rr = Rw * (0.95 - s * 0.6);
          const p: V3 = [Math.cos(a) * rr, Math.sin(a) * rr, s * h * g];
          L.humo3(p, (4.5 - s * 2.5) * (0.6 + g * 0.6), [0.07, 0.03, 0.1], 0.55 * g * (1 - s * 0.6), w * 3 + s * 2, v * 2);
          if (prev) {
            L.rayo3(prev, p, 3, 3, SOMBRA[3], 0.4 * g * (1 - s), 0.4 * g * (1 - s - 0.1));
            L.rayo3(prev, p, 0.8, 0.8, SOMBRA[1], 0.8 * g * (1 - s), 0.8 * g * (1 - s - 0.1));
          }
          prev = p;
        }
      }
      // motas que caen hacia el sello (al revés que la luz)
      for (let i = 0; i < 12; i++) {
        const t = frac(v * 1.6 + R()), a = R() * TAU, rr = R() * Rw;
        const [x, y] = L.P([Math.cos(a) * rr * (1 - t * 0.5), Math.sin(a) * rr * (1 - t * 0.5), 50 * (1 - t)]);
        L.luz(x, y, 1, SOMBRA[0], 0.9 * env * Math.sin(t * Math.PI));
      }
    },
  },
  {
    id: 'aura_furia', nombre: ['Aura de furia', 'Fury aura'], elemento: 'sangre', tipo: 'aura', cuadros: 12, t: 2, bucle: true,
    pinta: (c) => {
      const { L, u } = c, R = c.R(), ph = u * TAU;
      const FURIA: C[] = [[1, 0.85, 0.6], [1, 0.38, 0.14], [0.82, 0.1, 0.05], [0.36, 0.02, 0.02]];
      const pul = 0.8 + 0.2 * Math.sin(ph * 2);
      L.piso([0, 0, 0], 30, FURIA[3], 0.55 * pul);
      L.aroPiso([0, 0, 0], 27, 4.5, FURIA[3], 0.45);
      L.aroPiso([0, 0, 0], 27, 1.4, FURIA[1], 0.8 * pul, (a) => 0.1 + 0.9 * suave(0.3, 0.7, fbm(Math.cos(a) * 3 + Math.cos(ph) * 0.5, Math.sin(a) * 3 + Math.sin(ph) * 0.5)));
      // bruma de sangre baja (materia) y lenguas en el borde
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU + ph / 10;
        L.humo3([Math.cos(a) * 25, Math.sin(a) * 25, 3], 6 + 2 * Math.sin(ph + i), [0.25, 0.03, 0.03], 0.3, i * 2.1 + Math.cos(ph) * 0.4, Math.sin(ph) * 0.4);
      }
      const ls: [number, number, number, number, number][] = [];
      for (let i = 0; i < 11; i++) { const a = (i / 11) * TAU + R() * 0.4, rr = 24 + R() * 5; ls.push([Math.cos(a) * rr, Math.sin(a) * rr, 12 + R() * 12, 4 + R() * 2.5, R()]); }
      ls.sort((a, b) => a[0] + a[1] - b[0] - b[1]);
      for (const [x, y, h, w, f0] of ls) llama(L, x, y, 0, h, w, frac(u * 2 + f0), 0.4, FURIA);
      // calor que sube (hilos que ondulan) y brasas rojas
      for (let i = 0; i < 6; i++) {
        const t = frac(u + i / 6), a = R() * TAU, rr = 6 + R() * 16;
        let prev: V3 | null = null;
        for (let k = 0; k <= 6; k++) {
          const s = k / 6, z = (t * 40 + s * 18);
          const p: V3 = [Math.cos(a) * rr + Math.sin(z * 0.3 + ph) * 2, Math.sin(a) * rr, z];
          if (prev) L.rayo3(prev, p, 0.7, 0.7, FURIA[2], 0.22 * Math.sin(t * Math.PI) * (1 - s), 0);
          prev = p;
        }
      }
      brasas(L, c.R(4), 14, 0, 0, 24, 2, 60, u, 0.9, FURIA);
    },
  },

  // fuego de Doom (poderes_doom.ts): ids nuevos
  ...DEFS_DOOM,
];
// fuego de Doom en dos de siempre: mismo id, cuadros, celda y ancla (la caja fija es la que medían antes)
for (const d of DEFS) { const m = MEJORAS_DOOM[d.id]; if (m) { d.pinta = m.pinta; d.caja = m.caja; } }

// ---------------------------------------------------------------------------------------------------------------
// pintar, medir, empaquetar

const LIENZO_COMPARTIDO: { l: Lienzo | null } = { l: null };
const lienzo = () => (LIENZO_COMPARTIDO.l ??= new Lienzo());

function def(id: string): Def {
  const d = DEFS.find((x) => x.id === id);
  if (!d) throw new Error(`poder desconocido: ${id}`);
  return d;
}

function crudo(d: Def, dir: number, f: number): { img: Raster; ox: number; oy: number } {
  const L = lienzo();
  L.limpiar();
  const ang = (RUMBO[((dir % 8) + 8) % 8] * Math.PI) / 180;
  const fx = Math.cos(ang), fy = Math.sin(ang);
  const sem = hashString(d.id);
  const n = d.cuadros, ff = ((f % n) + n) % n;
  const cx: Cx = {
    L, f: ff, n, u: ff / n, v: (ff + 0.3) / n, fx, fy, sem,
    // izquierda de la marcha: el vector (fy, -fx) gira a la izquierda en pantalla
    fw: (dd, l, z) => [fx * dd + fy * l, fy * dd - fx * l, z],
    fwr: (g, dd, l, z) => {
      const gx = Math.cos(ang + g), gy = Math.sin(ang + g);
      return [gx * dd + gy * l, gy * dd - gx * l, z];
    },
    R: (k = 0) => rng(sem + k * 7907),
  };
  d.pinta(cx);
  return L.exportar();
}

const MEDIDAS = new Map<string, { x0: number; y0: number; w: number; h: number }>();

/** caja común de todos los cuadros (y direcciones) del efecto, en coordenadas del lienzo */
function medida(d: Def, cuadros?: { img: Raster; ox: number; oy: number }[]): { x0: number; y0: number; w: number; h: number } {
  const m = MEDIDAS.get(d.id) ?? d.caja;
  if (m) return m;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const todos = cuadros ?? todosCrudos(d);
  for (const c of todos) {
    const { img } = c;
    for (let y = 0; y < img.h; y++)
      for (let x = 0; x < img.w; x++)
        if (img.data[(y * img.w + x) * 4 + 3]) {
          if (x + c.ox < x0) x0 = x + c.ox;
          if (x + c.ox > x1) x1 = x + c.ox;
          if (y + c.oy < y0) y0 = y + c.oy;
          if (y + c.oy > y1) y1 = y + c.oy;
        }
  }
  if (x0 > x1) { x0 = AX; x1 = AX; y0 = AY; y1 = AY; }
  // margen de 1 px y la caja siempre contiene el ancla
  x0 = Math.min(x0, AX) - 1; y0 = Math.min(y0, AY) - 1; x1 = Math.max(x1, AX) + 1; y1 = Math.max(y1, AY) + 1;
  const r = { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  MEDIDAS.set(d.id, r);
  return r;
}

function todosCrudos(d: Def): { img: Raster; ox: number; oy: number }[] {
  const out: { img: Raster; ox: number; oy: number }[] = [];
  for (let dir = 0; dir < (d.dir ? 8 : 1); dir++) for (let f = 0; f < d.cuadros; f++) out.push(crudo(d, dir, f));
  return out;
}

function encuadrar(c: { img: Raster; ox: number; oy: number }, m: { x0: number; y0: number; w: number; h: number }): Raster {
  const out = createRaster(m.w, m.h);
  const { img } = c;
  for (let y = 0; y < img.h; y++) {
    const ty = y + c.oy - m.y0;
    if (ty < 0 || ty >= m.h) continue;
    for (let x = 0; x < img.w; x++) {
      const tx = x + c.ox - m.x0;
      if (tx < 0 || tx >= m.w) continue;
      const s = (y * img.w + x) * 4, t = (ty * m.w + tx) * 4;
      out.data[t] = img.data[s]; out.data[t + 1] = img.data[s + 1]; out.data[t + 2] = img.data[s + 2]; out.data[t + 3] = img.data[s + 3];
    }
  }
  return out;
}

/** Catálogo de poderes. `ancla` y `celda` se miden la primera vez que se leen (pintan todos los cuadros). */
export const PODERES: Poder[] = DEFS.map((d) => {
  const p = {
    id: d.id, nombre: d.nombre, elemento: d.elemento, tipo: d.tipo, cuadros: d.cuadros, direccional: !!d.dir, bucle: !!d.bucle, t: d.t,
  } as Poder;
  Object.defineProperty(p, 'ancla', { enumerable: true, get: () => { const m = medida(d); return [AX - m.x0, AY - m.y0]; } });
  Object.defineProperty(p, 'celda', { enumerable: true, get: () => { const m = medida(d); return [m.w, m.h]; } });
  return p;
});

/**
 * Pinta un cuadro de un poder. `dir` es el índice en DIRS_PODER (s, so, o, no, n, ne, e, se) o su nombre; los que
 * no son direccionales lo ignoran. `ancla` es el pixel que va sobre el origen del mundo en el piso.
 */
export function pintarPoder(id: string, dir: number | string, f: number): { img: Raster; ancla: [number, number] } {
  const d = def(id);
  const di = typeof dir === 'string' ? Math.max(0, (DIRS_PODER as readonly string[]).indexOf(dir)) : dir;
  const m = medida(d);
  return { img: encuadrar(crudo(d, d.dir ? di : 0, f), m), ancla: [AX - m.x0, AY - m.y0] };
}

/** Tira de un poder: columnas = cuadros, filas = direcciones (s, so, o, no, n, ne, e, se) si es direccional. */
export function tiraPoder(id: string): { png: Raster; celda: [number, number]; ancla: [number, number]; filas: number } {
  const d = def(id);
  const crudos = todosCrudos(d);
  const m = medida(d, crudos);
  const filas = d.dir ? 8 : 1, n = d.cuadros;
  const png = createRaster(m.w * n, m.h * filas);
  crudos.forEach((c, i) => {
    const fr = encuadrar(c, m), fila = Math.floor(i / n), col = i % n;
    for (let y = 0; y < m.h; y++) png.data.set(fr.data.subarray(y * m.w * 4, (y + 1) * m.w * 4), ((fila * m.h + y) * png.w + col * m.w) * 4);
  });
  return { png, celda: [m.w, m.h], ancla: [AX - m.x0, AY - m.y0], filas };
}

const LEEME = `Poderes del taller gótico (hechizos y efectos de combate), todos originales.

Cada efecto es una tira PNG RGBA con alfa de verdad: columnas = cuadros; si es direccional, una fila por dirección
en el orden s, so, o, no, n, ne, e, se. Todas las celdas de un efecto miden lo mismo y comparten el ancla.

poderes.json: id, nombre [es, en], archivo, celda [ancho, alto], ancla [x, y] (el pixel que va sobre el punto del
piso donde ocurre el efecto: el piso bajo el proyectil, los pies del personaje, el centro del área), cuadros, t
(ticks por cuadro a 25 por segundo), bucle (se repite o pasa una vez), direccional, elemento y tipo.

Animación: cuadro = floor(tiempo * 25 / t) % cuadros (o el último si no es bucle y ya terminó).
Dirección: ángulo atan2(dy, dx) en el piso; 0° = se, 45° = s, 90° = so, 135° = o, 180° = no, 225° = n, 270° = ne,
315° = e. Los proyectiles se dibujan quietos sobre su ancla: el juego los mueve.
Los efectos son luz: se ven bien con mezcla normal (alfa), y mejor todavía con mezcla aditiva usando color * alfa.
Los que tienen mucha materia (sangre, hueso, humo, flechas) van con mezcla normal: lo dice luz_efectos.json (mezcla).

luz_efectos.json: la luz dinámica de cada efecto (color, radio, intensidad, curva por cuadro, altura, parpadeo,
enVuelo, fogonazo al lanzar, impacto sugerido, sombra, prioridad). Ver luz_efectos.ts.

Ids nuevos (al lado de los de siempre, no reemplazan a nadie): virote, saeta_sagrada, saeta_veneno, impacto_rayo,
impacto_veneno, impacto_sagrado, impacto_hueso, nova_sangre, maldicion_sombra, aura_furia.

Fuego de Doom (el autómata de fuego_doom.ts horneado en los cuadros): ${EFECTOS_DOOM.join(', ')}.
crater_ardiente ahora arde con fuego de Doom, con los mismos cuadros, celda y ancla de antes.
`;

/** Zip con una tira PNG por poder más poderes.json y LEEME.txt. */
export function paquetePoderes(): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  const lista: unknown[] = [];
  for (const d of DEFS) {
    const t = tiraPoder(d.id);
    const archivo = `${d.id}.png`;
    files[archivo] = encodePng(t.png);
    lista.push({
      id: d.id, nombre: d.nombre, archivo, celda: t.celda, ancla: t.ancla, cuadros: d.cuadros, t: d.t, bucle: !!d.bucle,
      direccional: !!d.dir, filas: d.dir ? [...DIRS_PODER] : null, elemento: d.elemento, tipo: d.tipo,
    });
  }
  const enc = new TextEncoder();
  files['poderes.json'] = enc.encode(JSON.stringify({ formato: 'pixelforja-gotico-poderes', version: 1, cuadros_por_segundo: 25, persona_px: 75, direcciones: DIRS_PODER, poderes: lista }, null, 1));
  files['luz_efectos.json'] = enc.encode(JSON.stringify(luzEfectosJson(), null, 1));
  files['LEEME.txt'] = enc.encode(LEEME);
  return zipSync(files, { level: 6 });
}
