import { createRaster, blit, type Raster } from '../core/raster';
import { Pix, puff, sparkle, star5, rng, bayer } from './pix';

/**
 * Catálogo general de efectos: polvo, chispas de golpe, reacciones de anime, agua, fiesta, clima, técnicas,
 * ambiente y efectos de pantalla completa. Pixel art dibujado con código, determinista y sin imágenes de nadie.
 *
 * Cada efecto dice dónde se pega (`ancla`, el pixel de la celda que va sobre el punto del personaje que dice
 * `se_pega_a`), si va delante o detrás del personaje (`capa`) y para qué sirve. Los de pantalla completa toman la
 * resolución del juego.
 */

export type EffectGroup = 'polvo' | 'golpe' | 'reaccion' | 'agua' | 'fiesta' | 'objetos' | 'pantalla' | 'clima' | 'tecnica' | 'ambiente';
export const EFFECT_GROUPS: EffectGroup[] = ['polvo', 'golpe', 'reaccion', 'agua', 'fiesta', 'objetos', 'pantalla', 'clima', 'tecnica', 'ambiente'];
/** Dónde se pega: un dato por cuadro del personaje, la superficie del agua, el objeto, la pantalla o donde quiera el juego. */
export type EffectAttach = 'pies' | 'cabeza' | 'centro' | 'mano' | 'agua' | 'objeto' | 'pantalla' | 'mosaico' | 'libre';

export interface EffectDef {
  id: string;
  /** id del que sale (polvo_correr para polvo_correr_chico) */
  base: string;
  grupo: EffectGroup;
  w: number;
  h: number;
  cuadros: number;
  fps: number;
  loop: boolean;
  ancla: [number, number];
  se_pega_a: EffectAttach;
  capa: 'frente' | 'detras';
  uso: { es: string; en: string };
  /** cuadros que son estados (no se animan solos): el juego elige el cuadro */
  estados?: string[];
  /** toma la resolución del juego */
  pantalla?: boolean;
  draw: (p: Pix, k: number, n: number) => void;
}

// ---------- paletas ----------
const DUST = ['#7a5a3c', '#b8946a', '#e6d2ac'];
const SMOKE = ['#4a4a5a', '#8e8e9e', '#d8d8e2'];
const WATER = ['#1d4f8c', '#3a8ee0', '#8fd6ff', '#ffffff'];
const FIRE = ['#5a0f0f', '#c0261a', '#ff7a1f', '#ffc83a', '#fff4b8'];
const INK = '#1a1020';
const GOLD = ['#7a4a0a', '#e0a020', '#ffd84a', '#fff6c2'];
const CONFETTI = ['#ff4f6d', '#ffd34d', '#4fd88a', '#5a9dff', '#ff8ad8', '#ff9a1f'];
const FIREWORK: Record<string, string[]> = {
  rojo: ['#5a0a14', '#e0303a', '#ff8a90', '#ffffff'],
  azul: ['#0c1f5a', '#3a6aff', '#a8c4ff', '#ffffff'],
  dorado: ['#5a3a08', '#e0a020', '#ffe07a', '#ffffff'],
  verde: ['#0d3a1a', '#2fb04a', '#a8f0a0', '#ffffff'],
};

const ease = (t: number) => 1 - (1 - t) * (1 - t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const TAU = Math.PI * 2;

// ---------- polvo ----------
const SIZES = { chico: 16, medio: 24, grande: 32 } as const;
type Size = keyof typeof SIZES;

/** Vida de una bocanada: crece rápido, se queda y se deshace. */
const life = (t: number) => ({ grow: ease(Math.min(1, t / 0.35)), erode: Math.max(0, (t - 0.4) / 0.6) * 1.15 });

function polvoCorrer(s: number): EffectDef['draw'] {
  return (p, k, n) => {
    const t = k / (n - 1), base = p.h - 1;
    for (let i = 2; i >= 0; i--) {
      const ti = Math.max(0, Math.min(1, t * 1.2 - i * 0.12));
      if (t * 1.2 - i * 0.12 < 0) continue;
      const L = life(ti);
      const x = p.w * 0.62 - 1 - i * s * 0.2 - L.grow * s * 0.18;
      const r = s * 0.16 * (0.45 + L.grow * 0.6) * (1 - i * 0.18);
      puff(p, x, base - r - L.grow * s * 0.05 * (i + 1), r, DUST, L.erode, i + s);
    }
  };
}
function polvoFrenar(s: number): EffectDef['draw'] {
  return (p, k, n) => {
    const t = k / (n - 1), base = p.h - 1, x0 = p.w * 0.3, L = life(t);
    for (let i = 0; i < 4; i++) {
      const d = L.grow * s * (0.2 + i * 0.24);
      const r = s * (0.09 + 0.035 * (3 - i)) * (0.5 + L.grow * 0.6);
      puff(p, x0 + d + i * 2, base - r - (i % 2) * s * 0.06, r, DUST, L.erode, i * 3 + s);
    }
    // piedritas que salen hacia adelante
    const R = rng(s * 7 + 1);
    for (let i = 0; i < 4; i++) {
      const vx = 0.35 + R() * 0.4, vy = 0.5 + R() * 0.5;
      const x = x0 + s * vx * t * 1.6, y = base - s * vy * 0.6 * Math.sin(Math.PI * Math.min(1, t * 1.2));
      if (t < 0.85) p.px(x, y, DUST[0]);
    }
  };
}
function polvoCaer(s: number): EffectDef['draw'] {
  return (p, k, n) => {
    const t = k / (n - 1), base = p.h - 1, cx = p.w / 2, L = life(t);
    for (const side of [-1, 1])
      for (let i = 2; i >= 0; i--) {
        const d = (s * 0.12 + L.grow * s * (0.25 + i * 0.28)) * side;
        const r = s * (0.17 - i * 0.035) * (0.5 + L.grow * 0.6);
        puff(p, cx + d, base - r - i * s * 0.02, r, DUST, L.erode, i * 5 + (side > 0 ? 1 : 2) + s);
      }
  };
}

// ---------- golpe ----------
function chispa(s: number, rays: number): EffectDef['draw'] {
  return (p, k, n) => {
    const t = k / (n - 1), c = (s - 1) / 2;
    if (k === 0) { sparkle(p, c, c, Math.round(s * 0.3), '#ffffff', FIRE[3]); p.disc(c, c, s * 0.14, '#ffffff'); p.outline(FIRE[2]); return; }
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * TAU + (rays % 2 ? 0 : Math.PI / rays) * 0.5;
      const long = i % 2 === 0 ? 1 : 0.62;
      const len = s * 0.48 * long * (0.55 + ease(t) * 0.45);
      const start = t > 0.45 ? len * (t - 0.3) : 1;
      const x0 = c + Math.cos(a) * start, y0 = c + Math.sin(a) * start;
      const x1 = c + Math.cos(a) * len, y1 = c + Math.sin(a) * len;
      p.line(x0, y0, x1, y1, t < 0.5 ? FIRE[3] : FIRE[2]);
      p.px(x1, y1, FIRE[1]);
      if (t < 0.5 && s >= 24) p.line(x0, y0, lerp(x0, x1, 0.5), lerp(y0, y1, 0.5), '#ffffff');
    }
    if (t < 0.6) { p.disc(c, c, s * 0.16 * (1 - t), '#ffffff'); }
    if (t >= 0.6) p.ring(c, c, s * 0.18 + t * s * 0.2, FIRE[3]);
    if (s >= 32 && t > 0.2 && t < 0.9) p.ring(c, c, s * (0.2 + t * 0.25), '#ffffff', 1, 1);
    if (t < 0.5) p.outline(FIRE[1]);
    p.fade(Math.max(0, (t - 0.7) / 0.3) * 0.8);
  };
}

function estrellasMareo(p: Pix, k: number, n: number) {
  const cx = 16, cy = 7, rx = 13, ry = 4;
  const items = Array.from({ length: 5 }, (_, i) => {
    const a = (i / 5 + k / n) * TAU;
    return { i, x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry, front: Math.sin(a) > 0 };
  }).sort((a, b) => a.y - b.y);
  for (const it of items) {
    if (it.i % 5 === 1 || it.i % 5 === 3) {
      // pajarito: dos alas que aletean
      const up = (k + it.i) % 2 === 0;
      const c = it.front ? '#ffffff' : '#a8b8d8';
      p.px(it.x, it.y, c); p.px(it.x - 1, it.y + (up ? -1 : 0), c); p.px(it.x + 1, it.y + (up ? -1 : 0), c);
      p.px(it.x - 2, it.y + (up ? -1 : 1), c); p.px(it.x + 2, it.y + (up ? -1 : 1), c);
      p.px(it.x, it.y + 1, '#ff9a1f');
    } else star5(p, it.x, it.y, it.front ? GOLD[2] : GOLD[1], it.front ? GOLD[3] : GOLD[2], INK);
  }
}

function nubeKo(p: Pix, k: number) {
  const cx = 32, cy = 26, R = rng(97);
  const lobes = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * TAU, d = 12 + R() * 4;
    return { x: cx + Math.cos(a) * d * 1.25, y: cy + Math.sin(a) * d * 0.75, r: 7 + R() * 3, ph: R() * TAU };
  });
  const body = new Pix(64, 48);
  for (const l of lobes) body.disc(l.x, l.y, l.r + Math.sin(l.ph + (k / 6) * TAU) * 1.2, '#f0f0f6');
  body.disc(cx, cy, 15, '#f0f0f6', 0.75);
  // sombra abajo a la derecha
  for (let y = 0; y < 48; y++) for (let x = 0; x < 64; x++) if (body.has(x, y) && !body.has(x + 2, y + 2)) body.px(x, y, '#b8b8c8');
  body.outline(INK);
  p.paste(body);
  // lo que asoma de la pelea: un puño, un zapato y estrellas, rotando por el borde
  const poke = (a: number, kind: number) => {
    const x = cx + Math.cos(a) * 25, y = cy + Math.sin(a) * 17;
    if (kind === 0) { p.disc(x, y, 3, '#f0b890'); p.outline(INK); }
    else if (kind === 1) { p.rect(x - 3, y - 2, 6, 3, '#d42a2a'); p.rect(x - 3, y + 1, 6, 1, '#ffffff'); }
    else sparkle(p, x, y, 3, '#ffffff', GOLD[2]);
  };
  poke(((k / 6) * TAU) + 0.4, 0);
  poke(((k / 6) * TAU) + 2.6, 1);
  poke(-(k / 6) * TAU + 1.5, 2);
  poke(-(k / 6) * TAU + 4.2, 2);
  // rayitas de movimiento dentro
  for (let i = 0; i < 3; i++) {
    const a = ((k + i * 2) / 6) * TAU;
    p.line(cx + Math.cos(a) * 4, cy + Math.sin(a) * 3, cx + Math.cos(a) * 9, cy + Math.sin(a) * 6, '#8e8e9e');
  }
}

// ---------- reacciones de anime ----------
function vena(p: Pix, k: number) {
  const s = [0.85, 1, 1.15, 1][k % 4], c = 8, g = 1.6 * s, L = 4.5 * s;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    // cada cuarto: una ese que se dobla hacia afuera
    for (let i = 0; i <= 8; i++) {
      const u = i / 8, x = c + sx * (g + u * L * 0.55), y = c + sy * (g + Math.sin(u * Math.PI) * L * 0.55 + u * 0.6);
      p.disc(x, y, 0.8, '#ff3a3a');
    }
  }
  p.outline('#7a0a14');
}
function gota(p: Pix, k: number) {
  const y = 4 + (k % 6) * 0.7;
  p.disc(9, y + 3, 3, '#9ad8ff');
  for (let i = 0; i < 4; i++) p.rect(9 - Math.floor(i / 2), y - 1 + i - 2 + 1, 1 + Math.floor(i / 2) * 2, 1, '#9ad8ff');
  p.outline('#2a6ab0');
  p.px(8, y + 2, '#ffffff'); p.px(8, y + 3, '#ffffff');
}
function sonrojo(p: Pix, k: number) {
  const on = [1, 0.85, 0.7, 0.85][k % 4];
  for (const cx of [4, 15]) {
    p.disc(cx, 3, 3.2, '#ff8aa8', 0.5);
    for (let i = -1; i <= 1; i++) p.line(cx + i * 2 - 1, 4, cx + i * 2 + 1, 2, '#e0306a');
  }
  p.fade(1 - on);
}
function popGlyph(rows: string[]): (p: Pix, k: number) => void {
  return (p, k) => {
    const sc = [0.4, 1.3, 0.9, 1.05, 1, 1][k] ?? 1;
    const o = new Pix(16, 16), gh = rows.length, gw = rows[0].length;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const gx = Math.floor((x - 8) / sc + gw / 2), gy = Math.floor((y - 14) / sc + gh);
      if (gx >= 0 && gy >= 0 && gx < gw && gy < gh && rows[gy][gx] === '#') o.px(x, y, '#ffffff');
    }
    o.outline(INK);
    p.paste(o);
    if (k === 1 || k === 2) for (const [x0, y0, x1, y1] of [[2, 3, 0, 1], [13, 3, 15, 1], [1, 8, 0, 8]]) p.line(x0, y0, x1, y1, '#ff3a3a');
  };
}
const EXCL = ['.###.', '.###.', '.###.', '.###.', '..#..', '..#..', '.....', '.###.', '.###.'];
const QUES = ['.###.', '##.##', '...##', '..##.', '.##..', '.##..', '.....', '.##..', '.##..'];
function lagrimas(p: Pix, k: number) {
  for (const side of [-1, 1]) {
    const ex = 12 + side * 4;
    for (let i = 0; i < 7; i++) {
      const u = ((i + k * 0.5) % 7) / 7;
      const x = ex + side * (1 + u * 9), y = 1 + u * 5 + u * u * 9;
      p.disc(x, y, u < 0.15 ? 0.6 : 1, '#8fd6ff');
    }
  }
  p.outline('#2a6ab0');
}
function sudor(p: Pix, k: number, n: number) {
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI * (0.3 + i * 0.22), u = ((k / n) + i / 3) % 1;
    const x = 8 + Math.cos(a) * (2 + u * 7), y = 11 + Math.sin(a) * (2 + u * 7);
    if (u > 0.85) continue;
    p.disc(x, y, 1, '#9ad8ff'); p.px(x, y - 1, '#9ad8ff');
  }
  p.outline('#2a6ab0');
}

// ---------- agua ----------
function chapuzon(s: number): EffectDef['draw'] {
  return (p, k, n) => {
    const t = k / (n - 1), cx = s / 2, wl = s - s * 0.2;
    const hgt = Math.sin(Math.PI * Math.min(1, t * 1.15)) * s * 0.55;
    // columna central y corona
    if (hgt > 1) {
      p.thick(cx, wl, cx, wl - hgt, s * 0.07, WATER[2]);
      for (const side of [-1, 1]) {
        const sx = cx + side * s * (0.12 + t * 0.16);
        p.thick(sx, wl, sx + side * s * 0.05, wl - hgt * 0.65, s * 0.045, WATER[1]);
      }
      p.disc(cx, wl - hgt, s * 0.07, WATER[3]);
    }
    // gotas en parábola
    const R = rng(s * 13);
    for (let i = 0; i < Math.round(s / 4); i++) {
      const vx = (R() - 0.5) * 0.9, vy = 0.7 + R() * 0.6;
      const x = cx + vx * s * t, y = wl - (vy * s * 0.8 * t - s * 0.9 * t * t);
      if (y < wl) p.disc(x, y, s >= 48 ? 1 : 0.6, i % 3 ? WATER[2] : WATER[3]);
    }
    // anillo en la superficie
    p.ring(cx, wl, s * (0.12 + t * 0.36), WATER[2], 0.3);
    p.ring(cx, wl, s * (0.06 + t * 0.22), WATER[3], 0.3);
    p.outline(WATER[0]);
    p.fade(Math.max(0, (t - 0.6) / 0.4) * 0.85);
  };
}
function estela(p: Pix, k: number) {
  for (let i = 0; i < 10; i++) {
    const u = ((i / 10) + k / 40) % 1, x = 31 - u * 30;
    for (const side of [-1, 1]) {
      const y = 8 + side * u * 6;
      if ((i + k) % 3 !== 0) p.px(x, y, u < 0.5 ? WATER[3] : WATER[2]);
      p.px(x - 1, y, WATER[2]);
    }
  }
}
function ondas(p: Pix, k: number, n: number) {
  for (let i = 0; i < 3; i++) {
    const u = ((k / n) + i / 3) % 1;
    const ring = new Pix(48, 24);
    ring.ring(24, 12, 2 + u * 21, u < 0.5 ? WATER[3] : WATER[2], 0.5);
    ring.fade(Math.max(0, (u - 0.5) * 1.6));
    p.paste(ring);
  }
}

// ---------- fiesta ----------
function confeti(p: Pix, k: number, n: number) {
  const R = rng(4242);
  for (let i = 0; i < 44; i++) {
    const x0 = R() * 64, y0 = R() * 64, sp = R() < 0.5 ? 1 : 2, c = CONFETTI[i % CONFETTI.length], ph = Math.floor(R() * 4);
    const y = (y0 + (k / n) * 64 * sp) % 64, x = (x0 + Math.sin(((k / n) + R()) * TAU) * 2 + 64) % 64;
    const f = (k + ph) % 4;
    if (f === 0) { p.px(x, y, c); p.px(x + 1, y, c); }
    else if (f === 2) { p.px(x, y, c); p.px(x, y + 1, c); }
    else { p.px(x, y, c); p.px(x + 1, y + 1, c); }
  }
}
function serpentina(p: Pix, k: number, n: number) {
  const t = (k + 1) / n, steps = Math.round(60 * t);
  let prev: [number, number] | null = null;
  for (let i = 0; i <= steps; i++) {
    const u = i / 60, x = 3 + u * 22 + Math.cos(u * 18) * 4, y = 45 - u * 34 + Math.sin(u * 18) * 4;
    const c = Math.floor(i / 4) % 2 ? '#ff4f6d' : '#ffd34d';
    if (prev) p.thick(prev[0], prev[1], x, y, 0.8, c);
    prev = [x, y];
  }
  p.outline('#5a0a14');
}
function fuegos(pal: string[]): EffectDef['draw'] {
  return (p, k) => {
    const cx = 32, top = 22;
    if (k < 4) {
      const y = 63 - (63 - top) * ease((k + 1) / 4);
      for (let i = 0; i < 6; i++) if ((i + k) % 2 === 0) p.px(cx + Math.sin(i + k) * 0.6, y + 2 + i * 2, GOLD[i < 2 ? 2 : 1]);
      p.disc(cx, y, 1, '#ffffff');
      return;
    }
    const t = (k - 4) / 7;
    if (k === 4) { p.disc(cx, top, 4, '#ffffff'); sparkle(p, cx, top, 7, '#ffffff', pal[2]); return; }
    const R = rng(pal[1].length * 31 + pal[1].charCodeAt(2));
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * TAU + R() * 0.15, v = 22 + R() * 6;
      const d = ease(t) * v, x = cx + Math.cos(a) * d, y = top + Math.sin(a) * d + t * t * 10;
      const col = t < 0.3 ? pal[3] : t < 0.65 ? pal[2] : pal[1];
      p.disc(x, y, t < 0.6 ? 1.2 : 0.7, col);
      // la estela de cada chispa
      for (let j = 1; j <= 3; j++) {
        const dj = Math.max(0, d - j * 2.2), yj = top + Math.sin(a) * dj + Math.max(0, t - j * 0.05) ** 2 * 10;
        if ((j + k) % 2 === 0 || t < 0.4) p.px(cx + Math.cos(a) * dj, yj, j === 1 ? pal[2] : pal[1]);
      }
    }
    if (t > 0.55) p.fade((t - 0.55) / 0.45 * 0.85);
  };
}

// ---------- objetos: bola tama, tejo, chapa, ventana ----------
function bolaTama(p: Pix, k: number) {
  const cx = 16, cy = 18, r = 11;
  p.line(16, 0, 16, 6, '#c8a878');
  p.disc(cx, cy, r, '#d42a2a');
  p.disc(cx - 3, cy - 4, r * 0.45, '#ff6a5a');
  p.px(cx - 5, cy - 6, '#ffd0c8');
  // bandas doradas en cruz (las costuras de la bola)
  for (let x = cx - r; x <= cx + r; x++) if (p.has(x, cy)) p.px(x, cy, GOLD[2]);
  for (let y = cy - r; y <= cy + r; y++) if (p.has(cx, y) && k < 3) p.px(cx, y, GOLD[1]);
  p.rect(cx - 2, cy - r - 1, 5, 2, GOLD[1]);
  if (k >= 1) { p.disc(cx + 5, cy + 3, 2.2, '#8c1414'); p.px(cx + 4, cy + 2, '#5a0a0a'); }
  if (k >= 2) for (const [x0, y0, x1, y1] of [[cx + 5, cy + 3, cx + 9, cy - 2], [cx + 5, cy + 3, cx + 2, cy + 9], [cx - 6, cy - 2, cx - 2, cy + 5]]) p.line(x0, y0, x1, y1, '#3a0a0a');
  if (k >= 3) {
    // la costura se abre: asoma el confeti de adentro
    for (let y = cy - r + 1; y <= cy + r - 1; y++) { p.px(cx, y, '#2a0a0a'); if (y % 3 === 0) p.px(cx, y, CONFETTI[y % 6]); }
  }
  p.outline(INK);
}
function bolaExplota(p: Pix, k: number, n: number) {
  const t = k / (n - 1), cx = 32, cy = 18, r = 11, open = ease(Math.min(1, t * 1.6)) * 0.8;
  p.line(32, 0, 32, 6, '#c8a878');
  for (const side of [-1, 1]) {
    // cada mitad gira sobre la bisagra de arriba (se dibuja al revés: de cada pixel destino al de la bola)
    const half = new Pix(64, 48), a = -open * side, hx = cx, hy = cy - r;
    for (let y = 0; y < 48; y++)
      for (let x = 0; x < 64; x++) {
        const qx = x - hx, qy = y - hy;
        const dx = qx * Math.cos(a) + qy * Math.sin(a), dy = -qx * Math.sin(a) + qy * Math.cos(a);
        const sx = Math.round(hx + dx), sy = Math.round(hy + dy);
        if ((sx - cx) * side < 0 || (sx - cx) ** 2 + (sy - cy) ** 2 > r * r + r * 0.5) continue;
        half.px(x, y, sy === cy ? GOLD[2] : Math.abs(sx - cx) < 2 ? '#8c1414' : (sx - cx) * side > r * 0.55 && sy < cy ? '#ff6a5a' : '#d42a2a');
      }
    half.outline(INK);
    p.paste(half);
  }
  // el confeti que cae de adentro
  const R = rng(777);
  for (let i = 0; i < 40; i++) {
    const vx = (R() - 0.5) * 2.2, vy = R() * 0.6, d = R();
    const x = cx + vx * 22 * t, y = cy + 2 + vy * 10 * t + 40 * t * t * (0.6 + d * 0.6);
    if (t > 0.08 && y < 63) { p.px(x, y, CONFETTI[i % 6]); if (i % 3 === 0) p.px(x + 1, y, CONFETTI[i % 6]); }
  }
  if (t > 0.7) p.fade((t - 0.7) / 0.6);
}
function cartel(p: Pix, k: number, n: number) {
  const t = Math.min(1, (k + 1) / (n - 2)), len = Math.round(6 + t * 38), sway = k >= n - 2 ? (k === n - 2 ? 1 : -1) : 0;
  p.line(16, 0, 16, 3, '#c8a878');
  p.rect(6, 3, 21, 2, '#8c5a2a');
  for (let y = 5; y < 5 + len; y++) {
    const off = Math.round(sway * ((y - 5) / 44) * 2);
    p.rect(8 + off, y, 17, 1, '#fff8ec');
    p.px(8 + off, y, '#d42a2a'); p.px(24 + off, y, '#d42a2a');
  }
  if (t < 1) p.rect(7, 4 + len, 19, 2, '#e8dcc4');
  else p.rect(8 + sway * 2, 4 + len, 17, 1, '#d42a2a');
  p.outline(INK);
}
function mechaTejo(p: Pix, k: number, n: number) {
  const t = k / (n - 1), cx = 24, by = 44;
  if (k === 0) { p.disc(cx, by - 6, 5, '#ffffff'); sparkle(p, cx, by - 6, 10, '#ffffff', FIRE[3]); return; }
  if (k <= 3) {
    const r = 5 + k * 3;
    for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU + k; p.thick(cx, by - r * 0.7, cx + Math.cos(a) * r * 1.3, by - r * 0.7 + Math.sin(a) * r, 1.2, FIRE[2]); }
    p.disc(cx, by - r * 0.7, r * 0.8, FIRE[3]);
    p.disc(cx, by - r * 0.7, r * 0.45, FIRE[4]);
    p.outline(FIRE[1]);
  }
  // humo que sube y se abre
  for (let i = 0; i < 5; i++) {
    const u = Math.max(0, t - 0.15 - i * 0.05);
    if (u <= 0) continue;
    const x = cx + (i - 2) * 5 * (0.6 + u), y = by - 8 - u * 26 - (i % 2) * 3, r = 3 + u * 8;
    puff(p, x, y, r, SMOKE);
  }
  p.fade(Math.max(0, (t - 0.55) / 0.45) * 0.85);
}
function estelaChapa(p: Pix, k: number) {
  for (let i = 0; i < 3; i++) {
    const y = 2 + i * 2, off = (k * 4 + i * 5) % 12;
    for (let x = 0; x < 30; x++) if ((x + off) % 12 < 7 - i) p.px(29 - x, y, x < 10 ? '#ffffff' : x < 20 ? '#d8d8e2' : '#8e8e9e');
  }
}
function ventanaRota(p: Pix, k: number, n: number) {
  const t = k / (n - 1), R = rng(311);
  for (let i = 0; i < 14; i++) {
    const a = R() * TAU, v = 10 + R() * 14, rot = R() * TAU + t * (R() - 0.5) * 8, sz = 2 + R() * 3;
    const x = 24 + Math.cos(a) * v * ease(t), y = 24 + Math.sin(a) * v * ease(t) + t * t * 14;
    const tri = [0, 2.2, 4.2].map((o) => [x + Math.cos(rot + o) * sz, y + Math.sin(rot + o) * sz] as [number, number]);
    const shard = new Pix(48, 48);
    const minx = Math.floor(Math.min(...tri.map((q) => q[0]))), maxx = Math.ceil(Math.max(...tri.map((q) => q[0])));
    const miny = Math.floor(Math.min(...tri.map((q) => q[1]))), maxy = Math.ceil(Math.max(...tri.map((q) => q[1])));
    for (let yy = miny; yy <= maxy; yy++) for (let xx = minx; xx <= maxx; xx++) {
      const s = (ax: number, ay: number, bx: number, by: number) => (bx - ax) * (yy - ay) - (by - ay) * (xx - ax);
      const d1 = s(tri[0][0], tri[0][1], tri[1][0], tri[1][1]), d2 = s(tri[1][0], tri[1][1], tri[2][0], tri[2][1]), d3 = s(tri[2][0], tri[2][1], tri[0][0], tri[0][1]);
      if ((d1 >= 0 && d2 >= 0 && d3 >= 0) || (d1 <= 0 && d2 <= 0 && d3 <= 0)) shard.px(xx, yy, (xx + yy) % 3 ? '#c8f1ff' : '#ffffff');
    }
    shard.outline('#3a6a9a');
    p.paste(shard);
  }
  if (k === 0) sparkle(p, 24, 24, 8, '#ffffff', '#c8f1ff');
  p.fade(Math.max(0, (t - 0.65) / 0.35) * 0.85);
}

// ---------- pantalla completa ----------
function pantallaRota(p: Pix, k: number, n: number) {
  const t = (k + 1) / n, cx = Math.round(p.w * 0.5), cy = Math.round(p.h * 0.45), R = rng(9001);
  const L = Math.hypot(p.w, p.h) * 0.6;
  const spokes = Array.from({ length: 13 }, (_, i) => (i / 13) * TAU + R() * 0.35);
  const paths = spokes.map((a) => {
    const pts: [number, number][] = [[cx, cy]];
    let x = cx, y = cy, ang = a;
    for (let d = 0; d < L; d += 14) { ang += (R() - 0.5) * 0.5; x += Math.cos(ang) * 14; y += Math.sin(ang) * 14; pts.push([x, y]); }
    return pts;
  });
  const reach = L * ease(t);
  for (const pts of paths)
    for (let i = 1; i < pts.length; i++) {
      if (i * 14 > reach) break;
      p.line(pts[i - 1][0] + 1, pts[i - 1][1] + 1, pts[i][0] + 1, pts[i][1] + 1, '#3a4a5a');
      p.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], '#ffffff');
    }
  // anillos rotos que unen los rayos
  for (const ringD of [3, 6, 10]) {
    if (ringD * 14 > reach) continue;
    for (let s = 0; s < paths.length; s++) {
      if (R() < 0.3) continue;
      const a = paths[s][Math.min(ringD, paths[s].length - 1)], b = paths[(s + 1) % paths.length][Math.min(ringD, paths[(s + 1) % paths.length].length - 1)];
      p.line(a[0], a[1], b[0], b[1], '#e8f4ff');
    }
  }
  p.disc(cx, cy, 6 * Math.min(1, t * 2), '#ffffff');
}
function lineasVelocidad(p: Pix, k: number) {
  // cuñas finas que salen del borde y se afinan hacia el centro, que queda libre
  const R = rng(500 + k * 17), cx = p.w / 2, cy = p.h / 2, inner = Math.min(p.w, p.h) * 0.34, far = Math.hypot(p.w, p.h) / 2;
  for (let i = 0; i < 80; i++) {
    const a = (i / 80) * TAU + R() * 0.06, r0 = inner * (1 + R() * 0.7), maxW = 1 + R() * 3;
    const ca = Math.cos(a), sa = Math.sin(a);
    for (let r = r0; r < far; r++) {
      const w = maxW * ((r - r0) / (far - r0));
      for (let o = -w / 2; o <= w / 2; o += 0.5) p.px(cx + ca * r - sa * o, cy + sa * r + ca * o, '#ffffff');
    }
  }
}
function marcoCorte(p: Pix, k: number, n: number) {
  // dos barras negras que bajan y suben hasta dejar una franja inclinada para el primer plano
  const t = ease((k + 1) / n), band = p.h * 0.42, slope = 0.12, off = (1 - t) * p.h * 0.6;
  for (let x = 0; x < p.w; x++) {
    const te = (p.h - band) / 2 + (x - p.w / 2) * slope - off, be = te + off * 2 + band;
    for (let y = 0; y < p.h; y++) {
      if (y < te - 1 || y > be + 1) p.px(x, y, '#0a0612');
      else if (y < te + 1 || y > be - 1) p.px(x, y, '#ffffff');
    }
  }
}

// ---------- clima ----------
function lluvia(p: Pix, k: number, n: number) {
  const R = rng(66);
  for (let i = 0; i < 26; i++) {
    const x0 = R() * 64, y0 = R() * 64, len = 4 + Math.floor(R() * 4);
    const y = y0 + (k / n) * 128, x = x0 - (k / n) * 64;
    for (let j = 0; j < len; j++) {
      const yy = ((Math.round(y + j) % 64) + 64) % 64, xx = ((Math.round(x - j * 0.5) % 64) + 64) % 64;
      p.px(xx, yy, j < 2 ? '#ffffff' : '#a8c8ff');
    }
  }
}
function salpicadura(p: Pix, k: number, n: number) {
  const t = k / (n - 1);
  for (const side of [-1, 1]) for (let i = 0; i < 2; i++) {
    const vx = side * (0.6 + i * 0.5), x = 8 + vx * 6 * t, y = 7 - (3.5 - i) * Math.sin(Math.PI * t) * 1.2;
    p.px(x, y, i ? '#a8c8ff' : '#ffffff');
  }
  p.ring(8, 7, 1 + t * 6, '#a8c8ff', 0.3);
  p.fade(Math.max(0, (t - 0.6) / 0.4) * 0.85);
}
function ondaCharco(p: Pix, k: number, n: number) {
  for (let i = 0; i < 2; i++) {
    const u = ((k / n) + i / 2) % 1, r = new Pix(24, 12);
    r.ring(12, 6, 1 + u * 10, '#a8c8ff', 0.45);
    r.fade(Math.max(0, (u - 0.4) * 1.7));
    p.paste(r);
  }
}
function relampago(p: Pix, k: number) {
  if (k === 2 || k === 5) return;
  const R = rng(1313), pts: [number, number][] = [];
  let x = 24;
  for (let y = 0; y <= 159; y += 8) { pts.push([x, y]); x = Math.max(6, Math.min(42, x + (R() - 0.5) * 16)); }
  const glow = k === 4 ? '#5a4ab0' : '#8f7aff';
  for (let i = 1; i < pts.length; i++) p.thick(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], k === 0 ? 0.6 : 1.6, glow);
  if (k !== 4) for (let i = 1; i < pts.length; i++) p.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], '#ffffff');
  // ramas
  for (const b of [5, 9, 13]) {
    let [bx, by] = pts[b];
    for (let s = 0; s < 4; s++) { const nx = bx + (R() < 0.5 ? -5 : 5), ny = by + 7; p.line(bx, by, nx, ny, k === 4 ? glow : '#d8d0ff'); bx = nx; by = ny; }
  }
}
function calor(p: Pix, k: number, n: number) {
  for (let row = 0; row < 8; row++) {
    const y0 = row * 8 - (k / n) * 64;
    for (let x = 0; x < 64; x++) {
      const y = Math.round(y0 + Math.sin((x / 64) * TAU * 2 + row) * 1.5);
      const yy = ((y % 64) + 64) % 64;
      if ((x + row * 3) % 5 < 3) p.px(x, yy, '#ffe6b0');
    }
  }
}

// ---------- técnicas ----------
function rayoCatatumbo(p: Pix, k: number) {
  const R = rng(200 + k * 31), pts: [number, number][] = [];
  let y = 16;
  for (let x = 0; x <= 127; x += 6) { pts.push([x, y]); y = Math.max(4, Math.min(28, y + (R() - 0.5) * 12)); }
  for (let i = 1; i < pts.length; i++) p.thick(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 2, '#7a3ae0');
  for (let i = 1; i < pts.length; i++) p.thick(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 0.8, '#c8a8ff');
  for (let i = 1; i < pts.length; i++) p.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], '#ffffff');
  for (let b = 0; b < 4; b++) {
    let [bx, by] = pts[2 + Math.floor(R() * (pts.length - 4))];
    for (let s = 0; s < 3; s++) { const nx = bx + 4 + R() * 4, ny = by + (R() - 0.5) * 10; p.line(bx, by, nx, ny, '#c8a8ff'); bx = nx; by = ny; }
  }
}
function ondaFurro(p: Pix, k: number, n: number) {
  for (let i = 0; i < 3; i++) {
    const u = ((k / n) + i / 3) % 1, r = new Pix(48, 48);
    r.ring(24, 24, 3 + u * 20, u < 0.4 ? '#fff6c2' : '#ffc83a', 1, u < 0.5 ? 2 : 1);
    r.fade(Math.max(0, (u - 0.45) * 1.8));
    p.paste(r);
  }
}
function rafaga(p: Pix, k: number, n: number) {
  const t = (k + 1) / n;
  for (let i = 0; i < 4; i++) {
    const y0 = 7 + i * 6, len = 60 * ease(t) * (0.6 + (i % 2) * 0.4);
    for (let x = 0; x < len; x++) p.px(x, y0 + Math.sin(x / 7 + i) * 1.5, x > len - 10 ? '#ffffff' : '#c8f1ff');
    // remolino al final de cada línea
    const ex = len, ey = y0 + Math.sin(len / 7 + i) * 1.5;
    if (len > 12) p.ring(ex - 2, ey - 2, 2.2, '#ffffff', 1, 1, -Math.PI, Math.PI * 0.5);
  }
  p.fade(Math.max(0, (t - 0.75) / 0.25) * 0.85);
}
function vapor(p: Pix, k: number, n: number) {
  for (let w = 0; w < 2; w++)
    for (let y = 0; y < 32; y++) {
      const yy = (y + Math.round((k / n) * 32)) % 32;
      const x = 8 + w * 3 - 1.5 + Math.sin((y / 32) * TAU * 1.5 + w * 2) * 2.5;
      if (yy < 4) continue;
      p.px(x, 31 - yy, yy < 14 ? '#ffffff' : '#d8d8e2');
      if (yy < 10) p.px(x + 1, 31 - yy, '#ffffff');
    }
  // se desvanece hacia arriba
  for (let y = 0; y < 12; y++) for (let x = 0; x < 16; x++) if (bayer(x, y) > y / 12) p.clear(x, y);
}
function aura(p: Pix, k: number, n: number) {
  // una llama grande que envuelve al personaje: va detrás, así que el centro lo tapa el cuerpo y se ve el borde
  const cx = 32, cy = 40, rx = 17, ry = 21, ph = (k / n) * TAU;
  const tongue = (a: number) => {
    // lenguas que suben: solo arriba y a los lados, y se mueven con el tiempo
    const up = Math.max(0, -Math.sin(a));
    const w = Math.max(0, Math.sin(a * 5 + ph)) * 0.35 + Math.max(0, Math.sin(a * 9 - ph * 2 + 1)) * 0.2 + Math.max(0, Math.sin(a * 3 + ph + 2)) * 0.15;
    return 1 + w * (0.25 + up * 1.1);
  };
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      if (y > 62) continue;
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      // las llamas se inclinan hacia arriba: el ángulo se mide con un poco de subida
      const a = Math.atan2(dy, dx), d = Math.hypot(dx, dy) / tongue(a);
      if (d > 1) continue;
      p.px(x, y, d > 0.86 ? FIRE[1] : d > 0.68 ? FIRE[2] : d > 0.45 ? FIRE[3] : FIRE[4]);
    }
  // chispas que suben
  for (let i = 0; i < 5; i++) {
    const u = ((k / n) + i / 5) % 1, x = cx + Math.sin(i * 2.3) * 14, y = cy - ry - 2 - u * 14;
    if (u < 0.85) p.px(x + Math.sin(u * 6 + i) * 2, y, u < 0.4 ? FIRE[4] : FIRE[3]);
  }
  p.outline(FIRE[0]);
}

// ---------- ambiente ----------
function humoMoto(p: Pix, k: number, n: number) {
  const t = k / (n - 1);
  for (let i = 0; i < 3; i++) {
    const u = Math.max(0, t - i * 0.12);
    puff(p, 20 - u * 15 - i * 2, 11 - u * 5 - i, 2 + u * 4, SMOKE, Math.max(0, (u - 0.45) / 0.55), i);
  }
}
function tumble(shapes: string[][], pal: string[]): (p: Pix, k: number) => void {
  return (p, k) => {
    const s = shapes[k % shapes.length];
    s.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') p.px(x + 1, y + 1, pal[+ch]); }));
  };
}
const PETAL = [['.11.', '1221', '1221', '.11.'], ['..1.', '.12.', '121.', '1...'], ['....', '1221', '....', '....'], ['1...', '121.', '.12.', '..1.']];
const LEAF = [['..11', '.121', '121.', '0...'], ['.1..', '121.', '.121', '..10'], ['....', '1221', '0...', '....'], ['0...', '121.', '.121', '..1.']];
function arena(p: Pix, k: number, n: number) {
  const R = rng(808);
  for (let i = 0; i < 30; i++) {
    const x0 = R() * 32, y = 2 + R() * 12, sp = R() < 0.5 ? 1 : 2;
    const x = (x0 + (k / n) * 32 * sp) % 32;
    p.px(x, y + Math.sin((x / 32) * TAU) * 1.2, i % 4 ? '#e6c88a' : '#b8946a');
  }
}
function brillo(p: Pix, k: number) {
  const r = [1, 3, 5, 6, 4, 2][k];
  sparkle(p, 7.5, 7.5, r, '#ffffff', GOLD[2]);
  if (k === 3) { p.px(2, 2, GOLD[2]); p.px(13, 12, GOLD[2]); }
}
function huella(p: Pix, k: number, n: number) {
  p.disc(3.5, 4.5, 2, '#3a5a7a', 1.3);
  p.disc(3.5, 1, 1.2, '#3a5a7a');
  p.px(3, 4, '#6a8aaa');
  p.fade(k / n);
}

// ---------- el catálogo ----------
const RES: [number, number] = [640, 360];
const u = (es: string, en: string) => ({ es, en });

function sized(base: string, grupo: EffectGroup, cell: (s: number) => [number, number], n: number, fps: number,
  draw: (s: number) => EffectDef['draw'], ancla: (w: number, h: number) => [number, number], uso: { es: string; en: string }): EffectDef[] {
  return (Object.keys(SIZES) as Size[]).map((size) => {
    const [w, h] = cell(SIZES[size]);
    return { id: `${base}_${size}`, base, grupo, w, h, cuadros: n, fps, loop: false, ancla: ancla(w, h), se_pega_a: 'pies' as const, capa: 'frente' as const, uso, draw: draw(SIZES[size]) };
  });
}

export const EFFECTS: EffectDef[] = [
  ...sized('polvo_correr', 'polvo', (s) => [s, s], 6, 14, polvoCorrer, (w, h) => [Math.round(w * 0.62), h - 1],
    u('En cada evento `paso` al correr. Dibujado para quien mira a la derecha: la nube queda atrás. Espejar con flipX.', 'On every `paso` event while running. Drawn facing right: the cloud stays behind. Mirror with flipX.')),
  ...sized('polvo_frenar', 'polvo', (s) => [Math.round(s * 1.5), Math.round(s * 0.75)], 7, 14, polvoFrenar, (w, h) => [Math.round(w * 0.3), h - 1],
    u('Al frenar en seco o derrapar: el polvo y las piedritas salen hacia adelante.', 'When skidding to a stop: dust and pebbles fly forward.')),
  ...sized('polvo_caer', 'polvo', (s) => [s * 2, Math.round(s * 0.75)], 7, 14, polvoCaer, (w, h) => [w / 2, h - 1],
    u('En el evento `aterriza` y al caer de espaldas: polvo a los dos lados.', 'On `aterriza` events and back falls: dust on both sides.')),
  ...([['liviano', 16, 4, 4], ['medio', 24, 5, 6], ['pesado', 32, 6, 8]] as const).map(([peso, s, n, rays]): EffectDef => ({
    id: `chispa_golpe_${peso}`, base: 'chispa_golpe', grupo: 'golpe', w: s, h: s, cuadros: n, fps: 18, loop: false, ancla: [Math.floor(s / 2), Math.floor(s / 2)],
    se_pega_a: 'mano', capa: 'frente', draw: chispa(s, rays),
    uso: u('En el `punto` del evento `impacto`: jab y patada baja liviana, directo y patada media, golpe con arma o lanzado pesada.', 'At the `punto` of the `impacto` event: light for jabs, medium for straights and kicks, heavy for weapons and throws.'),
  })),
  { id: 'estrellas_mareo', base: 'estrellas_mareo', grupo: 'golpe', w: 32, h: 20, cuadros: 8, fps: 10, loop: true, ancla: [16, 19], se_pega_a: 'cabeza', capa: 'frente', draw: estrellasMareo,
    uso: u('Mareado (`dizzy`): estrellas y pajaritos girando sobre la cabeza. Las de atrás salen más oscuras.', 'Dizzy: stars and birds circling the head. The ones behind are darker.') },
  { id: 'nube_ko', base: 'nube_ko', grupo: 'golpe', w: 64, h: 48, cuadros: 6, fps: 12, loop: true, ancla: [32, 46], se_pega_a: 'pies', capa: 'frente', draw: nubeKo,
    uso: u('La pelea de caricatura: tapa a los que pelean. Asoman un puño, un zapato y estrellas.', 'Cartoon brawl cloud: covers the fighters. A fist, a shoe and stars poke out.') },

  { id: 'vena_enojo', base: 'vena_enojo', grupo: 'reaccion', w: 16, h: 16, cuadros: 4, fps: 8, loop: true, ancla: [0, 15], se_pega_a: 'cabeza', capa: 'frente', draw: vena, uso: u('Enojo: late arriba a la derecha de la cabeza.', 'Anger: pulses at the top right of the head.') },
  { id: 'gota_nervios', base: 'gota_nervios', grupo: 'reaccion', w: 16, h: 16, cuadros: 6, fps: 8, loop: true, ancla: [0, 15], se_pega_a: 'cabeza', capa: 'frente', draw: gota, uso: u('Nervios: la gotota que baja por la sien.', 'Nervous: the big drop sliding down the temple.') },
  { id: 'sonrojo', base: 'sonrojo', grupo: 'reaccion', w: 20, h: 6, cuadros: 4, fps: 6, loop: true, ancla: [10, 0], se_pega_a: 'cabeza', capa: 'frente', draw: sonrojo, uso: u('Sonrojo en los cachetes. Va debajo del centro de la cabeza, en las filas de frente.', 'Blush on the cheeks, below the head center, on front-facing rows.') },
  { id: 'exclamacion', base: 'exclamacion', grupo: 'reaccion', w: 16, h: 16, cuadros: 6, fps: 14, loop: false, ancla: [0, 15], se_pega_a: 'cabeza', capa: 'frente', draw: popGlyph(EXCL), uso: u('¡Sorpresa! Salta y se queda en el último cuadro.', 'Surprise! Pops and holds on the last frame.') },
  { id: 'interrogacion', base: 'interrogacion', grupo: 'reaccion', w: 16, h: 16, cuadros: 6, fps: 14, loop: false, ancla: [0, 15], se_pega_a: 'cabeza', capa: 'frente', draw: popGlyph(QUES), uso: u('¿Duda? Salta y se queda en el último cuadro.', 'Confused? Pops and holds on the last frame.') },
  { id: 'lagrima_comica', base: 'lagrima_comica', grupo: 'reaccion', w: 24, h: 16, cuadros: 4, fps: 10, loop: true, ancla: [12, 0], se_pega_a: 'cabeza', capa: 'frente', draw: lagrimas, uso: u('Llanto de caricatura: dos chorros desde los ojos. En las filas de frente.', 'Cartoon crying: two streams from the eyes. Front-facing rows.') },
  { id: 'sudor', base: 'sudor', grupo: 'reaccion', w: 16, h: 16, cuadros: 6, fps: 10, loop: true, ancla: [8, 15], se_pega_a: 'cabeza', capa: 'frente', draw: sudor, uso: u('Cansancio o esfuerzo: gotitas que salen volando.', 'Tired or straining: little drops flying off.') },

  { id: 'chapuzon_chico', base: 'chapuzon', grupo: 'agua', w: 32, h: 32, cuadros: 7, fps: 14, loop: false, ancla: [16, 25], se_pega_a: 'agua', capa: 'frente', draw: chapuzon(32), uso: u('Algo chico cae al agua, o una brazada fuerte.', 'Something small falls in, or a strong stroke.') },
  { id: 'chapuzon_grande', base: 'chapuzon', grupo: 'agua', w: 64, h: 64, cuadros: 9, fps: 14, loop: false, ancla: [32, 51], se_pega_a: 'agua', capa: 'frente', draw: chapuzon(64), uso: u('El clavado (evento `impacto` de `dive`) o alguien que cae al agua.', 'The dive (`impacto` of `dive`) or someone falling in.') },
  { id: 'estela', base: 'estela', grupo: 'agua', w: 32, h: 16, cuadros: 4, fps: 12, loop: true, ancla: [31, 8], se_pega_a: 'agua', capa: 'detras', draw: estela, uso: u('Detrás del que nada, en la superficie. Mira a la derecha: espejar con flipX.', 'Behind the swimmer, on the surface. Faces right: mirror with flipX.') },
  { id: 'ondas', base: 'ondas', grupo: 'agua', w: 48, h: 24, cuadros: 8, fps: 10, loop: true, ancla: [24, 12], se_pega_a: 'agua', capa: 'detras', draw: ondas, uso: u('Anillos en el agua alrededor de quien flota (`tread_water`).', 'Rings around someone treading water.') },

  { id: 'confeti', base: 'confeti', grupo: 'fiesta', w: 64, h: 64, cuadros: 8, fps: 10, loop: true, ancla: [0, 0], se_pega_a: 'mosaico', capa: 'frente', draw: confeti, uso: u('Lluvia de confeti en mosaico: repetir sobre toda la pantalla (TileSprite).', 'Tiling confetti rain: repeat over the screen (TileSprite).') },
  { id: 'serpentina', base: 'serpentina', grupo: 'fiesta', w: 32, h: 48, cuadros: 8, fps: 14, loop: false, ancla: [3, 45], se_pega_a: 'libre', capa: 'frente', draw: serpentina, uso: u('Una serpentina que se desenrolla hacia arriba a la derecha.', 'A streamer unrolling up and to the right.') },
  ...Object.entries(FIREWORK).map(([color, pal]): EffectDef => ({
    id: `fuegos_artificiales_${color}`, base: 'fuegos_artificiales', grupo: 'fiesta', w: 64, h: 64, cuadros: 12, fps: 12, loop: false, ancla: [32, 63], se_pega_a: 'libre', capa: 'detras', draw: fuegos(pal),
    uso: u('El cohete sube y revienta. El ancla es de donde sale.', 'The rocket rises and bursts. The anchor is where it launches.'),
  })),

  { id: 'bola_tama', base: 'bola_tama', grupo: 'objetos', w: 32, h: 32, cuadros: 4, fps: 0, loop: false, ancla: [16, 0], se_pega_a: 'objeto', capa: 'frente', draw: bolaTama, estados: ['entera', 'golpeada', 'agrietada', 'por_abrir'],
    uso: u('La bola del Tama-wari colgando. Cada cuadro es un estado de daño: el juego elige el cuadro.', 'The Tama-wari ball hanging. Each frame is a damage state: the game picks the frame.') },
  { id: 'bola_tama_explota', base: 'bola_tama', grupo: 'objetos', w: 64, h: 64, cuadros: 10, fps: 14, loop: false, ancla: [32, 0], se_pega_a: 'objeto', capa: 'frente', draw: bolaExplota, uso: u('La bola se abre en dos y cae el confeti. Misma ancla que la bola (el hilo).', 'The ball splits and confetti falls. Same anchor as the ball (the string).') },
  { id: 'bola_tama_cartel', base: 'bola_tama', grupo: 'objetos', w: 32, h: 52, cuadros: 8, fps: 10, loop: false, ancla: [16, 0], se_pega_a: 'objeto', capa: 'frente', draw: cartel, uso: u('El cartel que se desenrolla de la bola abierta, sin texto: el juego escribe encima (16 px de ancho útil).', 'The banner unrolling from the open ball, blank: the game writes on it (16 px usable width).') },
  { id: 'mecha_tejo', base: 'mecha_tejo', grupo: 'objetos', w: 48, h: 48, cuadros: 10, fps: 14, loop: false, ancla: [24, 44], se_pega_a: 'objeto', capa: 'frente', draw: mechaTejo, uso: u('El tejo pega en la mecha: estallido y humo.', 'The tejo hits the mecha: blast and smoke.') },
  { id: 'estela_chapa', base: 'estela_chapa', grupo: 'objetos', w: 32, h: 8, cuadros: 4, fps: 14, loop: true, ancla: [31, 4], se_pega_a: 'objeto', capa: 'detras', draw: estelaChapa, uso: u('Detrás de la chapa en vuelo. Mira a la derecha: girar con el ángulo del vuelo.', 'Behind the flying bottle cap. Faces right: rotate to the flight angle.') },
  { id: 'ventana_rota', base: 'ventana_rota', grupo: 'objetos', w: 48, h: 48, cuadros: 8, fps: 14, loop: false, ancla: [24, 24], se_pega_a: 'objeto', capa: 'frente', draw: ventanaRota, uso: u('Vidrios que saltan donde pegó algo.', 'Glass shards bursting where something hit.') },

  { id: 'pantalla_rota', base: 'pantalla_rota', grupo: 'pantalla', w: RES[0], h: RES[1], cuadros: 4, fps: 14, loop: false, ancla: [0, 0], se_pega_a: 'pantalla', capa: 'frente', pantalla: true, draw: pantallaRota, uso: u('El golpe que rompe la pantalla. Se queda en el último cuadro.', 'The hit that cracks the screen. Holds on the last frame.') },
  { id: 'lineas_velocidad', base: 'lineas_velocidad', grupo: 'pantalla', w: RES[0], h: RES[1], cuadros: 4, fps: 12, loop: true, ancla: [0, 0], se_pega_a: 'pantalla', capa: 'frente', pantalla: true, draw: lineasVelocidad, uso: u('Líneas de velocidad de manga para técnicas y sprints.', 'Manga speed lines for special moves and sprints.') },
  { id: 'marco_corte', base: 'marco_corte', grupo: 'pantalla', w: RES[0], h: RES[1], cuadros: 6, fps: 18, loop: false, ancla: [0, 0], se_pega_a: 'pantalla', capa: 'frente', pantalla: true, draw: marcoCorte, uso: u('El corte de anime: dos barras entran y dejan una franja inclinada para el primer plano.', 'Anime cut-in: two bars slide in leaving a slanted band for the close-up.') },

  { id: 'lluvia', base: 'lluvia', grupo: 'clima', w: 64, h: 64, cuadros: 8, fps: 16, loop: true, ancla: [0, 0], se_pega_a: 'mosaico', capa: 'frente', draw: lluvia, uso: u('Lluvia en mosaico, sin costuras: TileSprite sobre la pantalla.', 'Seamless tiling rain: TileSprite over the screen.') },
  { id: 'salpicadura_piso', base: 'salpicadura_piso', grupo: 'clima', w: 16, h: 8, cuadros: 5, fps: 14, loop: false, ancla: [8, 7], se_pega_a: 'libre', capa: 'frente', draw: salpicadura, uso: u('Gota que pega en el piso. Ponerlas al azar con lluvia.', 'A drop hitting the ground. Scatter them while raining.') },
  { id: 'onda_charco', base: 'onda_charco', grupo: 'clima', w: 24, h: 12, cuadros: 8, fps: 10, loop: true, ancla: [12, 6], se_pega_a: 'libre', capa: 'detras', draw: ondaCharco, uso: u('Ondas en un charco, en el piso.', 'Ripples on a puddle, on the ground.') },
  { id: 'relampago', base: 'relampago', grupo: 'clima', w: 48, h: 160, cuadros: 6, fps: 20, loop: false, ancla: [24, 159], se_pega_a: 'libre', capa: 'detras', draw: relampago, uso: u('El rayo de fondo; parpadea dos veces. El juego aclara la pantalla en los cuadros 1 y 3.', 'Background lightning; flickers twice. The game flashes the screen on frames 1 and 3.') },
  { id: 'calor', base: 'calor', grupo: 'clima', w: 64, h: 64, cuadros: 8, fps: 8, loop: true, ancla: [0, 0], se_pega_a: 'mosaico', capa: 'frente', draw: calor, uso: u('Reverbero del calor en mosaico, con poca opacidad (0.3) sobre el piso.', 'Tiling heat shimmer, at low opacity (0.3) over the ground.') },

  { id: 'rayo_catatumbo', base: 'rayo_catatumbo', grupo: 'tecnica', w: 128, h: 32, cuadros: 4, fps: 16, loop: true, ancla: [0, 16], se_pega_a: 'mano', capa: 'frente', draw: rayoCatatumbo, uso: u('Técnica: el rayo sale de la mano hacia la derecha. Espejar con flipX.', 'Special move: the bolt shoots right from the hand. Mirror with flipX.') },
  { id: 'onda_furro', base: 'onda_furro', grupo: 'tecnica', w: 48, h: 48, cuadros: 8, fps: 12, loop: true, ancla: [24, 24], se_pega_a: 'objeto', capa: 'frente', draw: ondaFurro, uso: u('Técnica: ondas de sonido desde el furro.', 'Special move: sound waves from the furro drum.') },
  { id: 'rafaga_abanico', base: 'rafaga_abanico', grupo: 'tecnica', w: 64, h: 32, cuadros: 6, fps: 14, loop: false, ancla: [0, 16], se_pega_a: 'mano', capa: 'frente', draw: rafaga, uso: u('Con `fan_gust`: el viento sale del abanico hacia la derecha.', 'With `fan_gust`: wind blows right from the fan.') },
  { id: 'vapor_termo', base: 'vapor_termo', grupo: 'tecnica', w: 16, h: 32, cuadros: 8, fps: 8, loop: true, ancla: [8, 31], se_pega_a: 'objeto', capa: 'frente', draw: vapor, uso: u('Vapor que sube del termo de tinto.', 'Steam rising from the coffee flask.') },
  { id: 'aura_nekketsu', base: 'aura_nekketsu', grupo: 'tecnica', w: 64, h: 64, cuadros: 8, fps: 12, loop: true, ancla: [32, 62], se_pega_a: 'pies', capa: 'detras', draw: aura, uso: u('El aura de fuego cuando se carga una técnica. Va detrás del personaje.', 'Fire aura while charging a special. Drawn behind the character.') },

  { id: 'humo_moto', base: 'humo_moto', grupo: 'ambiente', w: 24, h: 16, cuadros: 6, fps: 10, loop: false, ancla: [22, 12], se_pega_a: 'objeto', capa: 'detras', draw: humoMoto, uso: u('Humo del escape: el ancla es el tubo. Mira a la derecha.', 'Exhaust smoke: the anchor is the pipe. Faces right.') },
  { id: 'petalo_buganvilla', base: 'petalo_buganvilla', grupo: 'ambiente', w: 6, h: 6, cuadros: 4, fps: 6, loop: true, ancla: [3, 3], se_pega_a: 'libre', capa: 'frente', draw: tumble(PETAL, ['#7a1450', '#d42a8a', '#ff8ac8']), uso: u('Pétalo que da vueltas: el juego lo hace caer con vaivén.', 'A tumbling petal: the game drops it with a sway.') },
  { id: 'hoja', base: 'hoja', grupo: 'ambiente', w: 6, h: 6, cuadros: 4, fps: 6, loop: true, ancla: [3, 3], se_pega_a: 'libre', capa: 'frente', draw: tumble(LEAF, ['#5a3a10', '#3f9a24', '#a8d43a']), uso: u('Hoja que da vueltas, igual que el pétalo.', 'A tumbling leaf, like the petal.') },
  { id: 'arena', base: 'arena', grupo: 'ambiente', w: 32, h: 16, cuadros: 8, fps: 12, loop: true, ancla: [0, 15], se_pega_a: 'mosaico', capa: 'frente', draw: arena, uso: u('Arena que sopla a la derecha, en mosaico horizontal a ras del piso.', 'Sand blowing right, tiling horizontally along the ground.') },
  { id: 'brillo_record', base: 'brillo_record', grupo: 'ambiente', w: 16, h: 16, cuadros: 6, fps: 12, loop: true, ancla: [8, 8], se_pega_a: 'libre', capa: 'frente', draw: brillo, uso: u('Destello dorado para récords, medallas y trofeos.', 'Golden twinkle for records, medals and trophies.') },
  { id: 'huella_mojada', base: 'huella_mojada', grupo: 'ambiente', w: 8, h: 8, cuadros: 6, fps: 3, loop: false, ancla: [4, 4], se_pega_a: 'pies', capa: 'detras', draw: huella, uso: u('Huella mojada en el evento `paso` al salir del agua; se seca sola en 2 s.', 'Wet footprint on `paso` events after swimming; dries in 2 s.') },
];

export const EFFECT_IDS = EFFECTS.map((e) => e.id);
/** Los nombres que se pueden pedir: cada id, cada base (polvo_correr = sus 3 tamaños) y cada grupo. */
export const EFFECT_NAMES = [...new Set([...EFFECT_IDS, ...EFFECTS.map((e) => e.base), ...EFFECT_GROUPS])];

/** Pasa una lista de ids, bases o grupos a la lista de efectos (sin repetir, en el orden del catálogo). */
export function expandEffects(names: readonly string[] | true): EffectDef[] {
  if (names === true) return EFFECTS;
  const want = new Set(names);
  return EFFECTS.filter((e) => want.has(e.id) || want.has(e.base) || want.has(e.grupo));
}

/** Dibuja todos los cuadros de un efecto. Los de pantalla completa usan la resolución del juego. */
export function renderEffect(def: EffectDef, resolucion: [number, number] = RES): { w: number; h: number; frames: Raster[] } {
  const [w, h] = def.pantalla ? resolucion : [def.w, def.h];
  const frames = Array.from({ length: def.cuadros }, (_, k) => {
    const p = new Pix(w, h);
    def.draw(p, k, def.cuadros);
    return p.r;
  });
  return { w, h, frames };
}

/** Hoja del efecto: los cuadros en fila, y en varias filas si no caben en 4096 px. */
export function effectSheet(frames: Raster[], w: number, h: number): { sheet: Raster; columnas: number } {
  const columnas = Math.max(1, Math.min(frames.length, Math.floor(4096 / w)));
  const rows = Math.ceil(frames.length / columnas);
  const sheet = createRaster(w * columnas, h * rows);
  frames.forEach((f, i) => blit(sheet, f, (i % columnas) * w, Math.floor(i / columnas) * h));
  return { sheet, columnas };
}
