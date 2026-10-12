import { parse, type Font } from 'opentype.js';
import { createRaster, type Raster } from '../core/raster';

/**
 * Fuentes bitmap del juego (formato BMFont XML, el que carga Phaser con this.load.bitmapFont).
 * Salen de Silkscreen (Jason Kottke, SIL Open Font License 1.1), una fuente pixel dibujada sobre una grilla:
 * 125 unidades = 1 pixel, así que a 8 px cada pixel de la fuente cae exacto en un pixel. Nada se suaviza.
 *
 * fuente_ui: blanca con sombra negra de 1 px (se tiñe con setTint y la sombra queda negra).
 * fuente_titulo / fuente_titulo_plata: la versión gruesa al doble, con relleno en degradé por filas, contorno y sombra.
 */

export const FONT_CHARS = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~¡¿ñÑáéíóúÁÉÍÓÚüÜ…·«»°';

/**
 * Letras del vietnamita: ă, â, ê, ô, ơ, ư, đ y los 5 tonos (huyền, sắc, hỏi, ngã, nặng) sobre todas las vocales, en
 * mayúscula y minúscula. Las que la fuente no trae se arman pegando las marcas dibujadas sobre la letra base (ver
 * composeGlyph). Sirven para cualquier texto que las use, no solo vietnamita.
 */
export const VIETNAMESE_CHARS: string = (() => {
  const vowels = ['a', 'ă', 'â', 'e', 'ê', 'i', 'o', 'ô', 'ơ', 'u', 'ư', 'y'];
  const tones = ['', '\u0300', '\u0301', '\u0309', '\u0303', '\u0323'];
  const out = new Set<string>();
  for (const v of vowels) for (const t of tones) for (const c of [v, v.toUpperCase()]) out.add((c + t).normalize('NFC'));
  out.add('đ'); out.add('Đ');
  return [...out].filter((c) => !FONT_CHARS.includes(c)).join('');
})();

/** Todos los caracteres de las fuentes del juego: los de siempre y, al final, los del vietnamita. */
export const ALL_FONT_CHARS = FONT_CHARS + VIETNAMESE_CHARS;

export interface BitmapFont { name: string; png: Raster; fnt: string; lineHeight: number; base: number }

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** Polígonos de un glifo en pixeles de fuente (y hacia abajo, base en 0). */
function glyphPolys(font: Font, ch: string, unit: number): { polys: [number, number][][]; adv: number } | null {
  const g = font.charToGlyph(ch);
  if (!g || g.index === 0) return null;
  const polys: [number, number][][] = [];
  let cur: [number, number][] = [];
  let lx = 0, ly = 0;
  for (const c of g.getPath(0, 0, font.unitsPerEm).commands) {
    if (c.type === 'M') { if (cur.length) polys.push(cur); cur = [[c.x / unit, c.y / unit]]; lx = c.x; ly = c.y; }
    else if (c.type === 'L') { cur.push([c.x / unit, c.y / unit]); lx = c.x; ly = c.y; }
    else if (c.type === 'Q' || c.type === 'C') {
      // la fuente es de rectas, pero por si acaso se aplana la curva
      for (let k = 1; k <= 6; k++) { const t = k / 6; const x = lx + (c.x - lx) * t, y = ly + (c.y - ly) * t; cur.push([x / unit, y / unit]); }
      lx = c.x; ly = c.y;
    } else if (c.type === 'Z') { if (cur.length) polys.push(cur); cur = []; }
  }
  if (cur.length) polys.push(cur);
  return { polys, adv: (g.advanceWidth ?? 0) / unit };
}

/** ¿El punto está adentro? (regla de no cero, sirve para letras con huecos como la O). */
function inside(polys: [number, number][][], x: number, y: number): boolean {
  let w = 0;
  for (const p of polys) for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if (yj <= y) { if (yi > y && (xi - xj) * (y - yj) - (x - xj) * (yi - yj) > 0) w++; }
    else if (yi <= y && (xi - xj) * (y - yj) - (x - xj) * (yi - yj) < 0) w--;
  }
  return w !== 0;
}

interface Glyph { ch: string; mask: Uint8Array; w: number; h: number; top: number; left: number; adv: number }

// ---------- marcas del vietnamita, dibujadas en la grilla de la fuente ----------

type Mark = 'grave' | 'acute' | 'hook' | 'tilde' | 'dot' | 'circumflex' | 'breve' | 'horn' | 'stroke';
const COMBINING: Record<string, Mark> = {
  '\u0300': 'grave', '\u0301': 'acute', '\u0309': 'hook', '\u0303': 'tilde', '\u0323': 'dot', '\u0302': 'circumflex', '\u0306': 'breve', '\u031b': 'horn',
};

/** La letra base y sus marcas: "ấ" = a + circunflejo + agudo. đ y Đ no se descomponen en Unicode: d con barra. */
export function splitMarks(ch: string): { base: string; marks: Mark[] } | null {
  if (ch === 'đ' || ch === 'Đ') return { base: ch === 'đ' ? 'd' : 'D', marks: ['stroke'] };
  const [base, ...rest] = [...ch.normalize('NFD')];
  const marks = rest.map((c) => COMBINING[c]);
  return marks.length && marks.every(Boolean) ? { base, marks } : null;
}

/**
 * Pixeles de cada marca, en pixeles de fuente, como dibuja Silkscreen sus acentos: dos filas sobre la mayúscula con una
 * de aire (filas top - 3 y top - 2). x0..x1 son las columnas de la letra; c, la columna central (la de la izquierda si
 * la letra es par). El circunflejo con un tono de lado (ấ, ầ, ẩ) se corre un pixel a la izquierda y el tono va a su
 * derecha, como se escribe en vietnamita. La tilde sobre el circunflejo (ẫ) y cualquier tono sobre la breve (ắ) van
 * dos filas más arriba.
 */
function markPixels(m: Mark, x0: number, x1: number, top: number, shift = 0, up = 0): [number, number][] {
  const w = x1 - x0 + 1, even = w % 2 === 0, c = x0 + Math.floor((w - 1) / 2) + shift;
  const r0 = top - 3 - up, r1 = top - 2 - up;
  switch (m) {
    case 'acute': return [[c + 1, r0], [c, r1]];
    case 'grave': return [[c, r0], [c + 1, r1]];
    case 'hook': return [[c, r0], [c + 1, r0], [c + 1, r1]];
    case 'tilde': return [[c, r0], [c + 2, r0], [c - 1, r1], [c + 1, r1]];
    case 'circumflex': return even ? [[c, r0], [c + 1, r0], [c - 1, r1], [c + 2, r1]] : [[c, r0], [c - 1, r1], [c + 1, r1]];
    case 'breve': return even ? [[c - 1, r0], [c + 2, r0], [c, r1], [c + 1, r1]] : [[c - 1, r0], [c + 1, r0], [c, r1]];
    // nặng: un punto debajo, con una fila de aire
    case 'dot': return [[c, 1]];
    // ơ, ư: un ganchito en el hombro derecho
    case 'horn': return [[x1 + 1, top - 1], [x1 + 1, top]];
    // đ: la barra cruza el palo de la izquierda a media altura
    case 'stroke': return [[x0 - 1, top + 2], [x0 + 1, top + 2]];
  }
}

/** Arma una letra con marcas sobre la letra base ya rasterizada (en pixeles de fuente de `px` pixeles). */
function composeGlyph(ch: string, base: Glyph, marks: Mark[], px: number): Glyph {
  const x0 = base.left / px, x1 = (base.left + base.w) / px - 1, top = base.top / px;
  const tone = marks.find((m) => m === 'grave' || m === 'acute' || m === 'hook' || m === 'tilde');
  const pts: [number, number][] = [];
  for (const m of marks) {
    if (m === tone && marks.includes('circumflex') && m !== 'tilde') {
      // el tono al lado del circunflejo, a su derecha
      pts.push(...markPixels(m, x1 + 1, x1 + 2, top));
    } else if (m === tone && (marks.includes('breve') || marks.includes('circumflex'))) pts.push(...markPixels(m, x0, x1, top, 0, 2));
    else if (m === 'circumflex' && tone && tone !== 'tilde') pts.push(...markPixels(m, x0, x1, top, -1));
    else pts.push(...markPixels(m, x0, x1, top));
  }
  // el nuevo recuadro: la letra y las marcas
  const bx0 = Math.min(x0, ...pts.map((p) => p[0])), bx1 = Math.max(x1, ...pts.map((p) => p[0]));
  const by0 = Math.min(top, ...pts.map((p) => p[1])), by1 = Math.max(base.top / px + base.h / px - 1, ...pts.map((p) => p[1]));
  const w = (bx1 - bx0 + 1) * px, h = (by1 - by0 + 1) * px;
  const mask = new Uint8Array(w * h);
  const ox = (x0 - bx0) * px, oy = (top - by0) * px;
  for (let y = 0; y < base.h; y++) for (let x = 0; x < base.w; x++) if (base.mask[y * base.w + x]) mask[(y + oy) * w + x + ox] = 1;
  for (const [fx, fy] of pts) for (let yy = 0; yy < px; yy++) for (let xx = 0; xx < px; xx++) mask[((fy - by0) * px + yy) * w + (fx - bx0) * px + xx] = 1;
  // lo que sale a la derecha corre el avance para no pisar la letra que sigue
  const adv = Math.max(base.adv, (bx1 + 2) * px);
  return { ch, mask, w, h, top: by0 * px, left: bx0 * px, adv };
}

/** Rasteriza cada glifo a pixeles de fuente (1 pixel de fuente = `px` pixeles). Las letras que faltan se componen. */
function rasterGlyphs(font: Font, px: number, chars = ALL_FONT_CHARS): Glyph[] {
  const unit = font.unitsPerEm / 8; // 125: 1 pixel de la grilla de Silkscreen
  const out: Glyph[] = [];
  const done = new Map<string, Glyph>();
  for (const ch of chars) {
    const g = glyphPolys(font, ch, unit);
    if (!g) {
      // no está en la fuente: se arma con la letra base y sus marcas
      const sp = splitMarks(ch);
      const base = sp && (done.get(sp.base) ?? rasterGlyphs(font, px, sp.base)[0]);
      if (sp && base) { const cg = composeGlyph(ch, base, sp.marks, px); out.push(cg); done.set(ch, cg); }
      continue;
    }
    const xs = g.polys.flat().map((p) => p[0]), ys = g.polys.flat().map((p) => p[1]);
    const x0 = xs.length ? Math.floor(Math.min(...xs)) : 0, x1 = xs.length ? Math.ceil(Math.max(...xs)) : 0;
    const y0 = ys.length ? Math.floor(Math.min(...ys)) : 0, y1 = ys.length ? Math.ceil(Math.max(...ys)) : 0;
    const w = (x1 - x0) * px, h = (y1 - y0) * px;
    const mask = new Uint8Array(Math.max(1, w * h));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (inside(g.polys, x0 + (x + 0.5) / px, y0 + (y + 0.5) / px)) mask[y * w + x] = 1;
    const gl = { ch, mask, w, h, top: y0 * px, left: x0 * px, adv: Math.round(g.adv * px) };
    out.push(gl);
    done.set(ch, gl);
  }
  return out;
}

/** Arma el atlas y el .fnt. style decide cómo se pinta cada glifo (con margen para contorno y sombra). */
function pack(name: string, glyphs: Glyph[], pad: number, paint: (g: Glyph) => Raster, lineHeight: number, base: number, face: string, size: number): BitmapFont {
  const cells = glyphs.map((g) => ({ g, r: paint(g) }));
  const W = 256;
  let x = 1, y = 1, rowH = 0;
  const pos = cells.map(({ r }) => {
    if (x + r.w + 1 > W) { x = 1; y += rowH + 1; rowH = 0; }
    const p = { x, y }; x += r.w + 1; rowH = Math.max(rowH, r.h); return p;
  });
  const H = 1 << Math.ceil(Math.log2(y + rowH + 2));
  const png = createRaster(W, H);
  cells.forEach(({ r }, i) => { for (let yy = 0; yy < r.h; yy++) png.data.set(r.data.subarray(yy * r.w * 4, (yy + 1) * r.w * 4), ((pos[i].y + yy) * W + pos[i].x) * 4); });
  const chars = cells.map(({ g, r }, i) => `    <char id="${g.ch.codePointAt(0)}" x="${pos[i].x}" y="${pos[i].y}" width="${r.w}" height="${r.h}" xoffset="${g.left - pad}" yoffset="${base + g.top - pad}" xadvance="${g.adv}" page="0" chnl="15"/>`);
  const fnt = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<font>',
    `  <info face="${face}" size="${size}" bold="0" italic="0" charset="" unicode="1" stretchH="100" smooth="0" aa="1" padding="0,0,0,0" spacing="1,1"/>`,
    `  <common lineHeight="${lineHeight}" base="${base}" scaleW="${W}" scaleH="${H}" pages="1" packed="0"/>`,
    `  <pages><page id="0" file="${name}.png"/></pages>`,
    `  <chars count="${chars.length}">`, ...chars, '  </chars>', '</font>', '',
  ].join('\n');
  return { name, png, fnt, lineHeight, base };
}

/** Las fuentes del juego a partir de los archivos de Silkscreen normal y negrita (woff o ttf). */
export function bitmapFonts(regular: ArrayBuffer, bold: ArrayBuffer): BitmapFont[] {
  const fr = parse(regular), fb = parse(bold);
  // ui: 1 pixel de fuente = 1 px; blanco con sombra de 1 px abajo a la derecha
  const ui = rasterGlyphs(fr, 1);
  const uiFont = pack('fuente_ui', ui, 0, (g) => {
    const r = createRaster(Math.max(1, g.w + 1), Math.max(1, g.h + 1));
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.mask[y * g.w + x]) r.data.set([0, 0, 0, 255], ((y + 1) * r.w + x + 1) * 4);
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.mask[y * g.w + x]) r.data.set([255, 255, 255, 255], (y * r.w + x) * 4);
    return r;
  }, 11, 8, 'Silkscreen', 8);
  // títulos: negrita al doble, relleno por filas (degradé), contorno de 1 px y sombra de 1 px
  const titleGlyphs = rasterGlyphs(fb, 2);
  const titled = (name: string, ramp: string[], outline: string) => pack(name, titleGlyphs, 1, (g) => {
    const w = g.w + 3, h = g.h + 4, r = createRaster(Math.max(1, w), Math.max(1, h));
    const put = (x: number, y: number, c: number[]) => { if (x >= 0 && y >= 0 && x < w && y < h) r.data.set(c, (y * w + x) * 4); };
    const at = (x: number, y: number) => x >= 0 && y >= 0 && x < g.w && y < g.h && g.mask[y * g.w + x] === 1;
    const O = hex(outline), R = ramp.map(hex);
    // sombra (abajo, 1 px más que el contorno)
    for (let y = -1; y <= g.h + 1; y++) for (let x = -1; x <= g.w + 1; x++) {
      const near = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => at(x + dx, y - 1 + dy));
      if (near && !at(x, y)) put(x + 1, y + 2, [O[0] >> 1, O[1] >> 1, O[2] >> 1, 200]);
    }
    // contorno
    for (let y = -1; y <= g.h; y++) for (let x = -1; x <= g.w; x++) {
      if (at(x, y)) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dy]) => at(x + dx, y + dy))) put(x + 1, y + 1, [O[0], O[1], O[2], 255]);
    }
    // relleno: la rampa va de arriba (clara) a abajo (oscura), según la altura de la mayúscula (10 px)
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      if (!at(x, y)) continue;
      const yy = g.top + y + 10; // 0 arriba de la mayúscula
      let k = Math.max(0, Math.min(R.length - 1, Math.floor((yy / 10) * R.length)));
      if (!at(x, y - 1)) k = 0; // borde de arriba con brillo
      put(x + 1, y + 1, [...R[k], 255]);
    }
    return r;
  }, 22, 17, 'Silkscreen Bold', 16);
  return [
    uiFont,
    titled('fuente_titulo', ['#fff2b0', '#ffd25a', '#e8a828', '#c47a18', '#8a4a10'], '#1a0e08'),
    titled('fuente_titulo_plata', ['#ffffff', '#dfe6f0', '#b4c0d2', '#8a96ac', '#5e6880'], '#0e1018'),
  ];
}

/** Escribe un texto con una fuente bitmap (para vistas previas y pruebas). */
export function drawText(font: BitmapFont, text: string, scale = 1): Raster {
  const chars = new Map<number, { x: number; y: number; w: number; h: number; xo: number; yo: number; adv: number }>();
  for (const m of font.fnt.matchAll(/<char id="(\d+)" x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" xoffset="(-?\d+)" yoffset="(-?\d+)" xadvance="(\d+)"/g))
    chars.set(+m[1], { x: +m[2], y: +m[3], w: +m[4], h: +m[5], xo: +m[6], yo: +m[7], adv: +m[8] });
  let W = 4;
  for (const ch of text) W += chars.get(ch.codePointAt(0)!)?.adv ?? 4;
  const out = createRaster(W * scale + 4, (font.lineHeight + 4) * scale);
  let cx = 2;
  for (const ch of text) {
    const c = chars.get(ch.codePointAt(0)!);
    if (!c) { cx += 4; continue; }
    for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
      const s = ((c.y + y) * font.png.w + c.x + x) * 4;
      if (!font.png.data[s + 3]) continue;
      for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
        const X = (cx + c.xo + x) * scale + sx, Y = (2 + c.yo + y) * scale + sy;
        if (X < 0 || Y < 0 || X >= out.w || Y >= out.h) continue;
        out.data.set(font.png.data.subarray(s, s + 4), (Y * out.w + X) * 4);
      }
    }
    cx += c.adv;
  }
  return out;
}

/**
 * Logo "GG Abyss" (288 x 96, 8 cuadros a 8 fps): "GG" grande dorado y "ABYSS" plateado con un halo violeta,
 * con el estilo de la fuente de títulos (degradé por filas, contorno y sombra) y un brillo que recorre las letras.
 */
export function renderLogo(bold: ArrayBuffer): Raster[] {
  const fb = parse(bold);
  const W = 288, H = 96;
  type Line = { text: string; px: number; ramp: RGB[]; outline: RGB; y: number };
  const lines: Line[] = [
    { text: 'GG', px: 8, ramp: ['#fff2b0', '#ffd25a', '#e8a828', '#c47a18', '#8a4a10'].map(hex), outline: hex('#1a0e08'), y: 3 },
    { text: 'ABYSS', px: 7, ramp: ['#ffffff', '#e4dcff', '#b8a8e8', '#8a74c8', '#5a4890'].map(hex), outline: hex('#0e0a1c'), y: 50 },
  ];
  // máscara de cada línea: qué pixel es letra y en qué fila de la mayúscula cae (para el degradé)
  const fill = new Int16Array(W * H).fill(-1), lineOf = new Int8Array(W * H).fill(-1);
  lines.forEach((ln, li) => {
    const gl = rasterGlyphs(fb, ln.px).filter((g) => ln.text.includes(g.ch));
    const by = (ch: string) => gl.find((g) => g.ch === ch)!;
    const width = [...ln.text].reduce((a, ch) => a + by(ch).adv, 0) - ln.px;
    let x = Math.round((W - width) / 2);
    const capTop = Math.min(...[...ln.text].map((ch) => by(ch).top)), capH = Math.max(...[...ln.text].map((ch) => by(ch).top + by(ch).h)) - capTop;
    for (const ch of ln.text) {
      const g = by(ch);
      for (let yy = 0; yy < g.h; yy++) for (let xx = 0; xx < g.w; xx++) {
        if (!g.mask[yy * g.w + xx]) continue;
        const X = x + g.left + xx, Y = ln.y + (g.top - capTop) + yy;
        if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        fill[Y * W + X] = Math.floor(((g.top - capTop + yy) / capH) * ln.ramp.length);
        lineOf[Y * W + X] = li;
      }
      x += g.adv;
    }
  });
  const isFill = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && fill[y * W + x] >= 0;
  const frames: Raster[] = [];
  for (let f = 0; f < 8; f++) {
    const r = createRaster(W, H);
    const put = (x: number, y: number, c: RGB, a = 255) => { if (x >= 0 && y >= 0 && x < W && y < H) r.data.set([...c, a], (y * W + x) * 4); };
    // halo violeta detrás de ABYSS que respira
    const breathe = 0.75 + 0.25 * Math.sin((f / 8) * Math.PI * 2);
    for (let y = 44; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot((x - W / 2) / 140, (y - 68) / 26);
      if (d < 1) put(x, y, [110, 70, 200], Math.round(70 * (1 - d) * breathe));
    }
    // sombra (2 px abajo a la derecha) y contorno de 2 px
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (isFill(x, y)) continue;
      let near = false, li = -1;
      for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dy) <= 3 && isFill(x + dx, y + dy)) { near = true; li = lineOf[(y + dy) * W + x + dx]; break; }
      if (near) put(x, y, lines[li].outline);
      else if (isFill(x - 3, y - 3) || isFill(x - 2, y - 4)) put(x, y, [0, 0, 0], 150);
    }
    // relleno en degradé, borde de arriba claro y el brillo que pasa en diagonal
    const s = -40 + (f / 7) * 380;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = fill[y * W + x];
      if (k < 0) continue;
      const ln = lines[lineOf[y * W + x]];
      let c = ln.ramp[Math.min(ln.ramp.length - 1, k)];
      if (!isFill(x, y - 1)) c = ln.ramp[0];
      const band = Math.abs(x + y * 0.6 - s);
      if (band < 5) c = [255, 255, 255];
      else if (band < 9) c = c.map((v) => Math.min(255, v + 70)) as RGB;
      put(x, y, c);
    }
    frames.push(r);
  }
  return frames;
}
