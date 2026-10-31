import type { Raster } from '../core/raster';
import { Pix, sparkle, star5 } from '../fx/pix';
import { textMask } from './fonts';

/**
 * Interfaz retro para juegos de deporte y pelea: caja de diálogo estilo NES (9-slice) con flecha que titila, logo
 * animado a partir de cualquier texto, paneles por equipo, barras de aguante y medidor, marcos de retrato, fondos de
 * banners, controles táctiles, minimapa de carrera y números de marcador de TV. Todo pixel art con código.
 *
 * Las piezas que se estiran traen `nueve` (9-slice: bordes izquierda, arriba, derecha, abajo) o `tres` (3-slice:
 * bordes izquierda y derecha). El texto lo pone el juego con sus fuentes: los banners dicen en `texto` dónde va.
 */

export interface UiPiece {
  /** nombre del archivo dentro de ui/ (sin .png) */
  name: string;
  frames: Raster[];
  w: number;
  h: number;
  fps?: number;
  loop?: boolean;
  /** 9-slice: [izquierda, arriba, derecha, abajo] */
  nueve?: [number, number, number, number];
  /** 3-slice: [izquierda, derecha] */
  tres?: [number, number];
  /** datos extra para el manifiesto (zona del texto, hueco del retrato, letras...) */
  extra?: Record<string, unknown>;
}

const INK = '#0e0c18', WHITE = '#ffffff';
const FIRE = ['#fff6c2', '#ffd34d', '#ff9a1f', '#e0451b', '#8c1c13'];
const COOL = ['#ffffff', '#dce8ff', '#9ab8ff', '#5272e0', '#26338a'];
const GOLD = ['#fff6c2', '#ffd84a', '#e0a020', '#9a6410', '#4a2c08'];

const toHex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
/** Mezcla un color hacia otro (k = 0: igual, 1: el otro). */
export const mixHex = (a: string, b: string, k: number) => { const A = rgb(a), B = rgb(b); return toHex(A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k); };
const one = (p: Pix) => [p.r];

/** Caja redondeada: contorno, borde de color y relleno, con las esquinas recortadas. */
function box(p: Pix, x: number, y: number, w: number, h: number, edge: string, fill: string, rad = 3, edgeW = 2, inner?: string) {
  const inCorner = (px: number, py: number, r: number) => {
    const cx = px < x + r ? x + r : px > x + w - 1 - r ? x + w - 1 - r : px;
    const cy = py < y + r ? y + r : py > y + h - 1 - r ? y + h - 1 - r : py;
    return (px - cx) ** 2 + (py - cy) ** 2 <= r * r + 0.5;
  };
  for (let py = y; py < y + h; py++) for (let px = x; px < x + w; px++) {
    if (!inCorner(px, py, rad)) continue;
    const d = Math.min(px - x, py - y, x + w - 1 - px, y + h - 1 - py);
    p.px(px, py, d < 1 ? INK : d < 1 + edgeW ? edge : inner && d < 2 + edgeW ? inner : fill);
  }
}

// ---------- caja de diálogo ----------
export function dialogBox(): UiPiece[] {
  const p = new Pix(24, 24);
  box(p, 0, 0, 24, 24, WHITE, '#141634', 4, 2, '#3a4a8a');
  const arrow = [0, 1, 0, 2].map((k) => {
    const a = new Pix(10, 10);
    if (k === 2) return a.r;
    const dy = k === 1 ? 1 : 0;
    for (let y = 0; y < 4; y++) for (let x = y; x < 7 - y; x++) a.px(x + 1, y + 2 + dy, WHITE);
    a.outline(INK);
    return a.r;
  });
  return [
    { name: 'dialogo', frames: one(p), w: 24, h: 24, nueve: [8, 8, 8, 8], extra: { relleno: [10, 8], retrato: { x: 8, y: 8, marco: 'marco_retrato_40' } } },
    { name: 'dialogo_flecha', frames: arrow, w: 10, h: 10, fps: 4, loop: true, extra: { ancla: 'abajo a la derecha de la caja, 6 px adentro' } },
  ];
}

// ---------- logo ----------
/** Parte el texto en 1 o 2 líneas, la segunda nunca más larga que la primera por mucho. */
function splitLines(text: string): string[] {
  const words = text.trim().split(/\s+/);
  if (words.length < 2) return [text.trim()];
  let best: string[] = [text], score = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const s = Math.abs(a.length - b.length);
    if (s < score) { score = s; best = [a, b]; }
  }
  return best;
}

/**
 * El logo del juego a partir de su texto (de la configuración): en 1 o 2 líneas, la primera en fuego y la segunda en
 * frío, con contorno, sombra, borde de luz arriba y un brillo que pasa en diagonal (8 cuadros a 10 fps).
 */
export function gameLogo(bold: ArrayBuffer, text: string, W: number, H: number): Raster[] {
  const lines = splitLines(text.toUpperCase());
  const pad = Math.max(4, Math.round(W / 40)), gap = Math.max(2, Math.round(H / 28));
  // el tamaño más grande que entra
  let px = 1, masks = lines.map((l) => textMask(bold, l, 1));
  for (let k = 12; k >= 1; k--) {
    const ms = lines.map((l) => textMask(bold, l, k));
    const tw = Math.max(...ms.map((m) => m.w)), th = ms.reduce((a, m) => a + m.h, 0) + gap * (ms.length - 1);
    if (tw <= W - pad * 2 && th <= H - pad * 2) { px = k; masks = ms; break; }
  }
  const outline = px >= 3 ? 2 : 1;
  const total = masks.reduce((a, m) => a + m.h, 0) + gap * (masks.length - 1);
  const fill = new Int16Array(W * H).fill(-1), lineOf = new Int8Array(W * H).fill(-1);
  let y0 = Math.round((H - total) / 2);
  masks.forEach((m, li) => {
    const x0 = Math.round((W - m.w) / 2);
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.mask[y * m.w + x]) {
      const X = x0 + x, Y = y0 + y;
      fill[Y * W + X] = Math.min(4, Math.floor((y / m.h) * 5));
      lineOf[Y * W + X] = li;
    }
    y0 += m.h + gap;
  });
  const isFill = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && fill[y * W + x] >= 0;
  return Array.from({ length: 8 }, (_, f) => {
    const p = new Pix(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (isFill(x, y)) continue;
      let near = false;
      for (let dy = -outline; dy <= outline && !near; dy++) for (let dx = -outline; dx <= outline; dx++) if (Math.abs(dx) + Math.abs(dy) <= outline + 1 && isFill(x + dx, y + dy)) { near = true; break; }
      if (near) p.px(x, y, INK);
      else if (isFill(x - outline - 1, y - outline - 1)) p.px(x, y, '#2a0c10');
    }
    const s = -W * 0.2 + (f / 7) * W * 1.4;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = fill[y * W + x];
      if (k < 0) continue;
      const ramp = lineOf[y * W + x] === 0 && lines.length > 1 ? FIRE : lines.length > 1 ? COOL : FIRE;
      let c = ramp[k];
      if (!isFill(x, y - 1)) c = ramp[0];
      const band = Math.abs(x + y * 0.6 - s);
      if (band < px * 1.6) c = WHITE;
      else if (band < px * 3) c = mixHex(c, WHITE, 0.45);
      p.px(x, y, c);
    }
    // un destello que salta de una esquina a otra
    if (f % 4 === 1) sparkle(p, f < 4 ? pad + px * 2 : W - pad - px * 2, f < 4 ? pad + px : H - pad - px, Math.max(2, px), WHITE, GOLD[1]);
    return p.r;
  });
}

// ---------- paneles por equipo ----------
/** Panel 9-slice en los colores de un equipo: borde del color de acento, fondo oscuro del color principal. */
export function teamPanel(name: string, main: string, accent: string): UiPiece {
  const p = new Pix(24, 24);
  box(p, 0, 0, 24, 24, accent, mixHex(main, '#000000', 0.55), 3, 2, mixHex(main, '#000000', 0.25));
  for (let x = 4; x < 20; x++) p.px(x, 4, mixHex(main, '#ffffff', 0.25));
  return { name, frames: one(p), w: 24, h: 24, nueve: [8, 8, 8, 8], extra: { colores: [main, accent] } };
}
/** Los 6 colores de partida, si la configuración no trae equipos. */
export const DEFAULT_TEAM_COLORS: [string, string, string][] = [
  ['rojo', '#c0261a', '#ffd34d'], ['azul', '#2a5bd7', '#f2c230'], ['verde', '#2f9a4a', '#ffffff'],
  ['amarillo', '#e0a020', '#1a1c3a'], ['morado', '#7a3ae0', '#ff8ad8'], ['negro', '#353c58', '#d42a2a'],
];

// ---------- barras ----------
export function bars(): UiPiece[] {
  const frame = new Pix(16, 10);
  box(frame, 0, 0, 16, 10, '#c8d4ff', '#1a1630', 2, 1);
  const grad = (cols: string[]) => { const p = new Pix(1, 6); cols.forEach((c, y) => p.px(0, y, c)); return p.r; };
  const llena = Array.from({ length: 4 }, (_, f) => {
    const p = new Pix(8, 6);
    const cols = ['#fff6c2', '#ffd34d', '#ff9a1f', '#ff7a1f', '#e0451b', '#8c1c13'];
    for (let y = 0; y < 6; y++) for (let x = 0; x < 8; x++) p.px(x, y, cols[y]);
    // el brillo que corre (sin costura: se repite cada 8 px)
    for (let y = 0; y < 6; y++) { const x = (f * 2 + y) % 8; p.px(x, y, WHITE); p.px((x + 1) % 8, y, '#fff6c2'); }
    return p.r;
  });
  return [
    { name: 'barra_marco', frames: one(frame), w: 16, h: 10, tres: [4, 4], extra: { relleno: { x: 2, y: 2, h: 6 } } },
    { name: 'barra_aguante', frames: [grad(['#d8ffd0', '#8ff07a', '#4fd84a', '#2fb04a', '#1f8a3a', '#0d5a20'])], w: 1, h: 6, extra: { uso: 'se estira al ancho del valor' } },
    { name: 'barra_nekketsu', frames: [grad(['#ffd0c8', '#ff8a6a', '#ff4f3a', '#e0261a', '#a8141a', '#5a0a0a'])], w: 1, h: 6, extra: { uso: 'se estira al ancho del valor' } },
    { name: 'barra_nekketsu_llena', frames: llena, w: 8, h: 6, fps: 12, loop: true, extra: { uso: 'mosaico cuando el medidor está lleno' } },
  ];
}

// ---------- marcos de retrato ----------
export function portraitFrames(): UiPiece[] {
  return [40, 96].map((s) => {
    const b = s >= 96 ? 6 : 4, W = s + b * 2;
    const p = new Pix(W, W);
    box(p, 0, 0, W, W, GOLD[2], '#000000', 2, b - 1, GOLD[1]);
    for (let y = b; y < W - b; y++) for (let x = b; x < W - b; x++) p.clear(x, y);
    for (const [x, y] of [[1, 1], [W - 2, 1], [1, W - 2], [W - 2, W - 2]]) { p.px(x + (x < 2 ? 1 : -1), y + (y < 2 ? 1 : -1), GOLD[0]); }
    for (let x = b; x < W - b; x++) p.px(x, 1, GOLD[0]);
    return { name: `marco_retrato_${s}`, frames: one(p), w: W, h: W, extra: { hueco: [b, b, s, s] } };
  });
}

// ---------- banners ----------
export const BANNERS = ['listos', 'ya', 'chao_pescao', 'meta', 'gol', 'record', 'jonron'] as const;
export function banners(): UiPiece[] {
  const W = 256, H = 80;
  const make = (id: string, draw: (p: Pix) => [number, number, number, number]): UiPiece => {
    const p = new Pix(W, H);
    const texto = draw(p);
    return { name: `banner_${id}`, frames: one(p), w: W, h: H, extra: { texto } };
  };
  const ribbon = (p: Pix, c: string, light: string, dark: string, notch = true) => {
    for (let y = 18; y < 62; y++) for (let x = 14; x < 242; x++) {
      const tail = notch && (x < 30 || x > 225) && Math.abs(y - 40) < (x < 30 ? 30 - x : x - 225) * 1.2;
      if (tail) continue;
      p.px(x, y, y < 24 ? light : y > 55 ? dark : c);
    }
    p.outline(INK);
  };
  const burst = (p: Pix, c: string, light: string, spikes: number) => {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = (x - W / 2) / (W / 2 - 6), dy = (y - H / 2) / (H / 2 - 4), a = Math.atan2(dy, dx), d = Math.hypot(dx, dy);
      // puntas rectas: una onda triangular en el ángulo
      const f = ((a / (Math.PI * 2)) * spikes + 10) % 1;
      const r = 0.68 + 0.32 * Math.abs(2 * f - 1);
      if (d < r) p.px(x, y, d < r - 0.2 ? c : light);
    }
    p.outline(INK);
  };
  return [
    make('listos', (p) => { ribbon(p, '#ffd34d', '#fff6c2', '#c08a10'); return [36, 24, 184, 32]; }),
    make('ya', (p) => { burst(p, '#e0261a', '#ffd34d', 14); return [56, 22, 144, 36]; }),
    make('chao_pescao', (p) => {
      ribbon(p, '#2fa8c8', '#9ae0f0', '#1a6a8a');
      // olas abajo y un pescadito que se va
      for (let x = 30; x < 226; x++) p.px(x, 56 + Math.round(Math.sin(x / 6) * 1.5), '#ffffff');
      const fish = new Pix(24, 14);
      fish.disc(9, 7, 6, '#ff9a1f', 0.62);
      for (let k = 0; k < 5; k++) fish.line(15, 7, 21, 3 + k * 2, '#ff9a1f');
      fish.disc(7, 5, 2, '#ffd34d', 0.6); fish.px(5, 6, INK);
      fish.outline(INK);
      p.paste(fish, 200, 20);
      return [36, 24, 168, 30];
    }),
    make('meta', (p) => {
      ribbon(p, '#ffffff', '#ffffff', '#c8c8d0', false);
      for (let y = 18; y < 62; y++) for (let x = 14; x < 242; x++) if ((Math.floor(x / 8) + Math.floor(y / 8)) % 2 && (x < 54 || x > 202)) p.px(x, y, '#1a1a24');
      return [60, 22, 136, 36];
    }),
    make('gol', (p) => {
      burst(p, '#2f9a4a', '#a8f0a0', 18);
      for (const [x, y] of [[40, 16], [214, 18], [34, 62], [220, 62]]) star5(p, x, y, GOLD[1], GOLD[0], INK);
      return [56, 22, 144, 36];
    }),
    make('record', (p) => {
      ribbon(p, '#e0a020', '#ffe07a', '#9a6410');
      for (const [x, y] of [[20, 10], [236, 12], [128, 6], [24, 70], [232, 70]]) sparkle(p, x, y, 3, WHITE, GOLD[1]);
      return [36, 24, 184, 32];
    }),
    make('jonron', (p) => {
      ribbon(p, '#f4f0e8', '#ffffff', '#c8c0b0');
      // las dos costuras de la pelota de béisbol, en C, con sus puntadas
      for (const side of [-1, 1]) for (let y = 21; y < 60; y++) {
        const x = 128 + side * (78 + ((y - 40) ** 2) / 22);
        p.px(x, y, '#d42a2a');
        if (y % 4 === 0) { p.line(x - 3, y - 2, x - 1, y, '#d42a2a'); p.line(x + 3, y - 2, x + 1, y, '#d42a2a'); }
      }
      return [44, 24, 168, 32];
    }),
  ];
}

// ---------- controles táctiles ----------
/** Cada control trae 2 cuadros: normal y presionado. */
export function touchControls(bold: ArrayBuffer): UiPiece[] {
  const button = (id: string, base: string, label: (p: Pix, cx: number, cy: number, dy: number) => void): UiPiece => {
    const S = 48;
    const frames = [0, 1].map((pressed) => {
      const p = new Pix(S, S), dy = pressed ? 2 : 0;
      if (!pressed) p.disc(S / 2 - 0.5, S / 2 + 1.5, 21, mixHex(base, '#000000', 0.6));
      p.disc(S / 2 - 0.5, S / 2 - 0.5 + dy, 21, pressed ? mixHex(base, '#000000', 0.25) : base);
      p.disc(S / 2 - 3.5, S / 2 - 4.5 + dy, 12, pressed ? mixHex(base, '#000000', 0.15) : mixHex(base, '#ffffff', 0.25));
      p.disc(S / 2 - 0.5, S / 2 - 0.5 + dy, 15, pressed ? mixHex(base, '#000000', 0.25) : base);
      label(p, S / 2, S / 2 - 1 + dy, dy);
      p.outline(INK);
      return p.r;
    });
    return { name: `control_${id}`, frames, w: S, h: S, extra: { estados: ['normal', 'presionado'] } };
  };
  const letter = (ch: string) => (p: Pix, cx: number, cy: number) => {
    const m = textMask(bold, ch, 3);
    const x0 = Math.round(cx - m.w / 2), y0 = Math.round(cy - m.h / 2);
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.mask[y * m.w + x]) { p.px(x0 + x + 1, y0 + y + 1, INK); }
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.mask[y * m.w + x]) p.px(x0 + x, y0 + y, WHITE);
  };
  const stick = (pressed: number) => {
    const S = 96, p = new Pix(S, S);
    p.disc(S / 2 - 0.5, S / 2 - 0.5, 46, '#1a1c3a'); p.disc(S / 2 - 0.5, S / 2 - 0.5, 42, pressed ? '#2a2e58' : '#22264a');
    for (const a of [0, 1, 2, 3]) { const ang = (a * Math.PI) / 2; const x = S / 2 + Math.cos(ang) * 34, y = S / 2 + Math.sin(ang) * 34; p.disc(x - 0.5, y - 0.5, 3, '#4a5290'); }
    p.outline(INK);
    return p.r;
  };
  const nub = [0, 1].map((pr) => { const p = new Pix(40, 40); p.disc(19.5, 20.5, 18, '#8a94c8'); p.disc(19.5, 19.5 + pr, 18, pr ? '#b8c0ec' : '#dce2ff'); p.disc(16.5, 15.5 + pr, 8, WHITE); p.outline(INK); return p.r; });
  return [
    { name: 'control_palanca', frames: [stick(0), stick(1)], w: 96, h: 96, extra: { estados: ['normal', 'presionado'], recorrido: 30 } },
    { name: 'control_palanca_bola', frames: nub, w: 40, h: 40, extra: { estados: ['normal', 'presionado'] } },
    button('a', '#e0261a', letter('A')),
    button('b', '#2a5bd7', letter('B')),
    button('c', '#2f9a4a', letter('C')),
    button('especial', '#e0a020', (p, cx, cy) => {
      // estrella de 5 puntas de radio 10
      for (let y = -11; y <= 11; y++) for (let x = -11; x <= 11; x++) {
        const a = Math.atan2(y, x) + Math.PI / 2, d = Math.hypot(x, y), f = ((a / (Math.PI * 2)) * 5 + 10) % 1;
        if (d <= 4.5 + 6 * Math.abs(2 * f - 1)) p.px(cx + x, cy + y, WHITE);
      }
    }),
    button('pausa', '#4a4e6a', (p, cx, cy) => { p.rect(cx - 6, cy - 7, 4, 14, WHITE); p.rect(cx + 2, cy - 7, 4, 14, WHITE); }),
  ];
}

// ---------- minimapa de carrera ----------
export function raceMinimap(): UiPiece[] {
  const bar = new Pix(16, 8);
  box(bar, 0, 0, 16, 8, '#8a94c8', '#22264a', 2, 1);
  for (let x = 2; x < 14; x += 4) bar.px(x, 4, '#4a5290');
  const flag = (checker: boolean, color: string) => {
    const p = new Pix(10, 12);
    p.rect(1, 0, 1, 12, '#c8c8d0');
    for (let y = 0; y < 6; y++) for (let x = 2; x < 9; x++) p.px(x, y, checker ? ((x + y) % 2 ? '#1a1a24' : WHITE) : color);
    p.outline(INK);
    return p.r;
  };
  const marker = new Pix(7, 6);
  for (let y = 0; y < 4; y++) for (let x = y; x < 7 - y; x++) marker.px(x, y + 1, WHITE);
  marker.outline(INK);
  return [
    { name: 'minimapa_barra', frames: one(bar), w: 16, h: 8, tres: [4, 4], extra: { pista: { y: 4 } } },
    { name: 'minimapa_salida', frames: [flag(false, '#4fd84a')], w: 10, h: 12 },
    { name: 'minimapa_meta', frames: [flag(true, '')], w: 10, h: 12 },
    { name: 'minimapa_marcador', frames: one(marker), w: 7, h: 6, extra: { uso: 'teñirlo con el color del equipo (setTint) y ponerlo arriba de la cabecita' } },
  ];
}

// ---------- números de marcador de TV ----------
export const TV_CHARS = '0123456789+-:x';
/** Números grandes de marcador de TV: blancos con el pie dorado, contorno y sombra, sobre una placa 9-slice. */
export function tvNumbers(bold: ArrayBuffer): UiPiece[] {
  const cw = 14, ch = 18;
  const sheet = new Pix(cw * TV_CHARS.length, ch);
  [...TV_CHARS].forEach((c, i) => {
    const m = textMask(bold, c, 2), p = new Pix(cw, ch);
    const x0 = Math.round((cw - m.w) / 2), y0 = Math.round((ch - m.h) / 2) - 1;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.mask[y * m.w + x]) p.px(x0 + x + 1, y0 + y + 1, '#2a0c10');
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.mask[y * m.w + x]) p.px(x0 + x, y0 + y, y < m.h * 0.55 ? WHITE : y < m.h * 0.8 ? GOLD[1] : GOLD[2]);
    p.outline(INK);
    sheet.paste(p, i * cw, 0);
  });
  const plate = new Pix(24, 24);
  box(plate, 0, 0, 24, 24, '#c8d4ff', '#0e1030', 2, 1, '#22264a');
  for (let x = 3; x < 21; x++) plate.px(x, 3, '#3a4a8a');
  return [
    { name: 'numeros', frames: [sheet.r], w: cw * TV_CHARS.length, h: ch, extra: { letras: TV_CHARS, celda: [cw, ch], uso: 'el cuadro de cada letra está en x = indice * 14; al sumar, el juego cuenta de a poco y hace saltar el número' } },
    { name: 'numeros_placa', frames: one(plate), w: 24, h: 24, nueve: [6, 6, 6, 6] },
  ];
}

/** Las piezas de interfaz. Las ocho primeras son las retro de siempre; desde `medallas`, el envoltorio (lote G2, ver envoltorio.ts). */
export const UI_PARTS = ['dialogo', 'paneles', 'barras', 'marcos', 'banners', 'controles', 'minimapa', 'numeros', 'medallas', 'podio', 'iconos', 'banderas', 'tarjetas', 'marco_vs', 'pantallas', 'mapa', 'intro', 'tenis', 'bordes'] as const;
export type UiPart = (typeof UI_PARTS)[number];

/** Todas las piezas de interfaz pedidas. `equipos`: id -> [color principal, acento]; sin equipos, los 6 de partida. */
export function retroUi(bold: ArrayBuffer, parts: readonly UiPart[] = UI_PARTS, equipos?: Record<string, [string, string]>): UiPiece[] {
  const out: UiPiece[] = [];
  const want = new Set(parts);
  if (want.has('dialogo')) out.push(...dialogBox());
  if (want.has('paneles')) {
    const teams = equipos && Object.keys(equipos).length ? Object.entries(equipos).map(([id, [a, b]]) => [id, a, b] as const) : DEFAULT_TEAM_COLORS;
    for (const [id, a, b] of teams) out.push(teamPanel(`panel_${id}`, a, b));
  }
  if (want.has('barras')) out.push(...bars());
  if (want.has('marcos')) out.push(...portraitFrames());
  if (want.has('banners')) out.push(...banners());
  if (want.has('controles')) out.push(...touchControls(bold));
  if (want.has('minimapa')) out.push(...raceMinimap());
  if (want.has('numeros')) out.push(...tvNumbers(bold));
  return out;
}
