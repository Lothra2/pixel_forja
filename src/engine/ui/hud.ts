import { createRaster, type Raster } from '../core/raster';
import { IconCanvas, over } from '../loot/canvas';
import { MAT, glowMat, metalMat } from '../loot/materials';
import { renderLoot } from '../loot/render';
import { baseArmor, baseWeapon, baseOffhand, type LootItem } from '../loot/catalog';
import { shade } from '../world/tiles';

/**
 * Interfaz tipo Diablo, dibujada con código: orbes de vida y maná (11 niveles), paneles y botones en 9 partes,
 * casilleros del inventario y del equipo con su silueta, tooltip, barras del jefe y de experiencia, cinturón de pociones,
 * números de daño, cursores y estandarte. Piedra oscura con borde de hierro y oro.
 */

export interface UiSprite {
  name: string;
  frames: Raster[];
  /** para estirar en 9 partes (Phaser NineSlice): márgenes izquierda, derecha, arriba, abajo */
  slice?: [number, number, number, number];
}

const rgb = (hex: string): [number, number, number] => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
function put(r: Raster, x: number, y: number, hex: string, a = 255) {
  if (x < 0 || y < 0 || x >= r.w || y >= r.h) return;
  const i = (y * r.w + x) * 4; const [R, G, B] = rgb(hex);
  r.data[i] = R; r.data[i + 1] = G; r.data[i + 2] = B; r.data[i + 3] = a;
}
function hash(x: number, y: number, s: number) { let h = (x * 374761393 + y * 668265263 + s * 974711) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

const STONE = ['#16131c', '#1d1924', '#24202c', '#2c2734'];
const IRON = ['#2a2a32', '#4a4c56', '#6e727e', '#9aa0ac'];
const GOLD = ['#5a3a12', '#a8741e', '#e3ae3c', '#ffe08a'];

/** Marco de piedra con borde de hierro y oro, esquinas con remache. b = grosor del borde. */
function framed(w: number, h: number, b: number, opts: { inset?: boolean; gold?: boolean; alpha?: number } = {}): Raster {
  const r = createRaster(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const e = Math.min(x, y, w - 1 - x, h - 1 - y);
    const corner = (x < 1 || x > w - 2) && (y < 1 || y > h - 2);
    if (corner) continue;
    let c: string;
    if (e === 0) c = '#0a080c';
    else if (e < b) {
      // biselado: arriba e izquierda claros, abajo y derecha oscuros (o al revés si es hundido)
      const lit = (y < b || x < b) && !(y > h - 1 - b || x > w - 1 - b);
      const pal = opts.gold && e === Math.floor(b / 2) ? GOLD : IRON;
      c = opts.inset ? (lit ? pal[1] : pal[2]) : lit ? pal[3] : pal[1];
      if (e === b - 1) c = '#0e0c12';
    } else {
      const n = hash(Math.floor(x / 2), Math.floor(y / 2), 5);
      c = opts.inset ? STONE[n < 0.5 ? 0 : 1] : STONE[n < 0.3 ? 1 : n < 0.8 ? 2 : 3];
    }
    put(r, x, y, c, opts.alpha ?? 255);
  }
  // remaches dorados en las esquinas
  if (b >= 3 && !opts.inset) for (const [x, y] of [[b - 1, b - 1], [w - b, b - 1], [b - 1, h - b], [w - b, h - b]]) { put(r, x, y, GOLD[3]); put(r, x + 1, y, GOLD[1]); put(r, x, y + 1, GOLD[1]); put(r, x + 1, y + 1, GOLD[0]); }
  return r;
}

// ---------- orbes de vida y maná ----------

/** Orbe con su marco, lleno al nivel dado (0 a 10). wave anima la superficie. */
export function orb(kind: 'vida' | 'mana', level: number, wave = 0, size = 72): Raster {
  const r = createRaster(size, size);
  const C = (size - 1) / 2, R = size / 2 - 7, Ro = size / 2 - 1;
  const liquid = kind === 'vida' ? ['#4a0a12', '#8e1420', '#d8243e', '#ff6a6a'] : ['#0a1a4a', '#14308e', '#2f62e6', '#7ab0ff'];
  const top = C + R - (2 * R * level) / 10;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = x - C, dy = y - C, d = Math.hypot(dx, dy);
    if (d > Ro) continue;
    if (d > R) {
      // aro: piedra tallada con un hilo de oro
      const ring = (d - R) / (Ro - R);
      const lit = dx + dy < 0;
      let c = ring < 0.2 ? '#0a080c' : ring > 0.85 ? '#0a080c' : lit ? IRON[3] : IRON[1];
      if (ring > 0.4 && ring < 0.6) c = lit ? GOLD[3] : GOLD[1];
      put(r, x, y, c);
      continue;
    }
    // vidrio: oscuro arriba, líquido abajo con superficie ondulada
    const surf = top + Math.sin(x * 0.35 + wave * 1.6) * (level > 0 && level < 10 ? 1.2 : 0);
    if (y >= surf && level > 0) {
      const depth = (y - surf) / (2 * R);
      const side = Math.abs(dx) / R;
      let k = depth < 0.04 ? 3 : side > 0.8 ? 0 : depth > 0.6 || dx > R * 0.4 ? 1 : 2;
      if (hash(x, y + wave, 9) > 0.985) k = 3;
      put(r, x, y, liquid[k]);
    } else put(r, x, y, d > R - 1.5 ? '#08060a' : hash(x >> 1, y >> 1, 4) > 0.5 ? '#100c16' : '#140f1a');
  }
  // reflejo del vidrio
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = x - (C - R * 0.38), dy = y - (C - R * 0.42);
    if ((dx / (R * 0.32)) ** 2 + (dy / (R * 0.18)) ** 2 <= 1 && Math.hypot(x - C, y - C) < R) {
      const i = (y * size + x) * 4;
      r.data[i] = Math.min(255, r.data[i] + 90); r.data[i + 1] = Math.min(255, r.data[i + 1] + 90); r.data[i + 2] = Math.min(255, r.data[i + 2] + 100);
    }
  }
  return r;
}

// ---------- casilleros e íconos de equipo ----------

/** Silueta fantasma de un objeto (para el casillero vacío del equipo). */
function ghost(it: LootItem, px: 32 | 64 = 32): Raster {
  const src = renderLoot(it, { px, noAura: true });
  const out = createRaster(src.w, src.h);
  for (let i = 0; i < src.data.length; i += 4) {
    if (!src.data[i + 3]) continue;
    const l = (src.data[i] * 0.3 + src.data[i + 1] * 0.59 + src.data[i + 2] * 0.11) / 255;
    const v = 40 + l * 50;
    out.data[i] = v; out.data[i + 1] = v; out.data[i + 2] = v + 10; out.data[i + 3] = 150;
  }
  return out;
}

export type EquipSlot = 'casco' | 'amuleto' | 'pecho' | 'arma' | 'mano_libre' | 'guantes' | 'cinturon' | 'botas' | 'anillo' | 'mascota';

export function equipSlots(): UiSprite[] {
  const items: [EquipSlot, LootItem][] = [
    ['casco', baseArmor('helm', 'placas', 1)], ['pecho', baseArmor('chest', 'placas', 1)], ['guantes', baseArmor('gloves', 'placas', 1)],
    ['botas', baseArmor('boots', 'cuero', 1)], ['cinturon', baseArmor('belt', 'cuero', 1)], ['arma', baseWeapon('sword', 1)],
    ['mano_libre', baseOffhand('shield_heater', 1)], ['amuleto', { id: 'g_am', name: { es: '', en: '' }, rarity: 'normal', base: { cat: 'jewel', icon: 'amulet' }, level: 1, stats: { mods: [] } }],
    ['anillo', { id: 'g_ring', name: { es: '', en: '' }, rarity: 'normal', base: { cat: 'jewel', icon: 'ring' }, level: 1, stats: { mods: [] } }],
    ['mascota', { id: 'g_pet', name: { es: '', en: '' }, rarity: 'normal', base: { cat: 'pet', tier: 1 }, level: 1, stats: { mods: [] } }],
  ];
  return items.map(([slot, it]) => {
    const bg = framed(40, 40, 3, { inset: true });
    over(bg, ghost(it), 4, 4);
    return { name: `equipo_${slot}`, frames: [bg] };
  });
}

// ---------- números de daño ----------

export const DIGITS = '0123456789+-!';
const GLYPHS: Record<string, string[]> = {
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'], '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'], '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'], '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'], '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'], '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'], '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
};
export const DIGIT_COLORS = { blanco: '#ffffff', amarillo: '#ffd84a', rojo: '#ff4a4a', verde: '#6aff7a', azul: '#7ab0ff' };

/** Número de daño: 7 x 9 con contorno oscuro, en varios colores. Hoja: una fila por color, un cuadro por carácter. */
export function digitSheet(): { png: Raster; cw: number; ch: number; colors: string[] } {
  const cw = 7, ch = 9;
  const colors = Object.keys(DIGIT_COLORS);
  const png = createRaster(cw * DIGITS.length, ch * colors.length);
  colors.forEach((name, row) => {
    const col = DIGIT_COLORS[name as keyof typeof DIGIT_COLORS];
    [...DIGITS].forEach((chr, i) => {
      const g = GLYPHS[chr];
      const ox = i * cw + 1, oy = row * ch + 1;
      for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (g[y][x] === '#') for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) put(png, ox + x + dx, oy + y + dy, '#140c10');
      for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (g[y][x] === '#') put(png, ox + x, oy + y, y < 2 ? shade(col, 0.05) : y > 4 ? shade(col, -0.08) : col);
    });
  });
  return { png, cw, ch, colors };
}

// ---------- cursores, íconos y barras ----------

function cursor(kind: 'guantelete' | 'mano'): Raster {
  const c = new IconCanvas(24, 24);
  if (kind === 'guantelete') {
    c.poly([[2, 2], [14, 8], [9.6, 10], [15, 18], [12.6, 20.4], [7.4, 12.4], [4.6, 15.6]], metalMat('#aab5c3'));
    c.poly([[2, 2], [8, 5], [4.6, 9]], MAT.gold);
  } else {
    c.poly([[6, 2], [9, 2], [9, 10], [17, 11], [18, 20], [9, 21], [5, 14], [6, 10]], { hex: '#f2d0b0', kind: 'flesh' });
    c.px1([9, 10], [9, 14], { hex: '#f2d0b0', kind: 'flesh' }, { tone: 1 }, true);
  }
  return c.render();
}

function icon(kind: 'bolsa' | 'cerrar' | 'ajustes' | 'mapa' | 'oro' | 'calavera'): Raster {
  const c = new IconCanvas(24, 24);
  if (kind === 'bolsa') {
    c.poly([[6, 9], [18, 9], [21, 20], [17, 23], [7, 23], [3, 20]], MAT.leather);
    c.poly([[8, 9], [16, 9], [14, 5], [10, 5]], MAT.leather, { bias: 1 });
    c.line([7, 9.5], [17, 9.5], 1.2, MAT.gold);
    c.circle([12, 15], 1.6, MAT.gold);
  } else if (kind === 'cerrar') {
    c.line([6, 6], [18, 18], 3, { hex: '#d8243e', kind: 'cloth' }); c.line([18, 6], [6, 18], 3, { hex: '#d8243e', kind: 'cloth' });
  } else if (kind === 'ajustes') {
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; c.circle([12 + Math.cos(a) * 7, 12 + Math.sin(a) * 7], 2, metalMat('#aab5c3')); }
    c.circle([12, 12], 6.4, metalMat('#aab5c3')); c.circle([12, 12], 2.4, MAT.obsidian, { tone: 0 });
  } else if (kind === 'mapa') {
    c.poly([[3, 6], [9, 4], [15, 6], [21, 4], [21, 19], [15, 21], [9, 19], [3, 21]], MAT.parch);
    for (let i = 0; i < 4; i++) c.dot([6 + i * 4, 15 - i * 2], { hex: '#b8242c', kind: 'cloth' }, { tone: 3 }, true);
  } else if (kind === 'oro') {
    c.ellipse([12, 12], 7, 7, MAT.gold); c.ring([12, 12], 5.4, 5.4, 0.8, MAT.gold, { bias: -1 }, 0, 360); c.px1([12, 9], [12, 15], MAT.gold, { tone: 5 }, true);
  } else {
    c.circle([12, 10], 7, MAT.bone); c.poly([[8, 13], [16, 13], [15, 19], [9, 19]], MAT.bone);
    c.circle([9.4, 10.4], 1.8, MAT.obsidian, { tone: 0 }); c.circle([14.6, 10.4], 1.8, MAT.obsidian, { tone: 0 });
  }
  c.center();
  return c.render();
}

/** Barra horizontal: marco de hierro y relleno (rojo para el jefe, dorado para la experiencia). */
function bar(w: number, h: number, kind: 'marco' | 'jefe' | 'xp' | 'vida_enemigo'): Raster {
  if (kind === 'marco') return framed(w, h, 3);
  const r = createRaster(w, h);
  const pal = kind === 'jefe' ? ['#4a0a12', '#a8141e', '#e2363e', '#ff8a7a'] : kind === 'xp' ? ['#5a3a12', '#a8741e', '#e3ae3c', '#ffe08a'] : ['#3a0a10', '#8e1420', '#d8243e', '#ff6a6a'];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) put(r, x, y, y === 0 ? pal[3] : y === 1 ? pal[2] : y >= h - 1 ? pal[0] : pal[1]);
  return r;
}

/** Cinturón de pociones: 4 casilleros con su número (1 a 4). */
function beltBar(): Raster {
  const r = framed(4 * 36 + 10, 44, 3);
  for (let i = 0; i < 4; i++) {
    const s = framed(34, 34, 2, { inset: true });
    over(r, s, 5 + i * 36, 5);
    // número chico arriba a la izquierda
    const g = GLYPHS[String(i + 1)];
    for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (g[y][x] === '#') put(r, 8 + i * 36 + x, 7 + y, GOLD[2]);
  }
  return r;
}

/** Estandarte (para "¡Ganaste!", "Continuará", nombre del jefe): tela roja con bordes dorados, 9 partes. */
function banner(): Raster {
  const w = 64, h = 32;
  const r = createRaster(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const cutL = x < 8 && Math.abs(y - h / 2) > (x / 8) * (h / 2) + 0.5;
    const cutR = x > w - 9 && Math.abs(y - h / 2) > ((w - 1 - x) / 8) * (h / 2) + 0.5;
    if (cutL || cutR) continue;
    const edge = y < 3 || y > h - 4;
    const c = edge ? (y === 0 || y === h - 1 ? GOLD[0] : y === 1 || y === h - 2 ? GOLD[3] : GOLD[1]) : y < 8 ? '#a8242c' : y > h - 9 ? '#5a0a12' : '#7e1420';
    put(r, x, y, c);
  }
  return r;
}

// ---------- inventario del jugador ----------

/** Rectángulo [x, y, w, h] dentro del panel del inventario. */
export type Rect = [number, number, number, number];

export interface InventoryLayout {
  w: number; h: number;
  /** franja del título (el juego escribe "Inventario" o el nombre de la heroína) */
  titulo: Rect;
  /** casilleros del equipo: el objeto equipado se dibuja centrado encima */
  equipo: Record<string, Rect>;
  /** rejilla de la bolsa: cada objeto ocupa una casilla (más simple que el tetris de Diablo, ideal para niñas) */
  rejilla: { x: number; y: number; cols: number; filas: number; celda: number };
  /** fila del oro: ícono ya dibujado, el número va en `texto` */
  oro: { icono: Rect; texto: Rect };
}

/**
 * Panel del inventario estilo Diablo: equipo arriba (muñeco con 11 casilleros, incluido Thor) y bolsa abajo (7 x 4).
 * Devuelve el fondo con todo dibujado y las coordenadas para colocar los íconos encima.
 */
export function inventoryPanel(): { png: Raster; layout: InventoryLayout } {
  const W = 280, H = 410, S = 40, C = 36;
  const r = framed(W, H, 5, { gold: true });
  // franja del título con línea dorada
  for (let x = 8; x < W - 8; x++) { put(r, x, 27, GOLD[1]); put(r, x, 28, GOLD[0]); }
  // zona del muñeco: piedra hundida con silueta tenue
  const doll = framed(W - 24, 194, 2, { inset: true });
  over(r, doll, 12, 32);
  const col = [52, 120, 188], row = [38, 84, 130, 176];
  const eq: Record<string, Rect> = {
    mascota: [col[0], row[0], S, S], casco: [col[1], row[0], S, S], amuleto: [col[2], row[0], S, S],
    arma: [col[0], row[1], S, S], pecho: [col[1], row[1], S, S], mano_libre: [col[2], row[1], S, S],
    guantes: [col[0], row[2], S, S], cinturon: [col[1], row[2], S, S], anillo_2: [col[2], row[2], S, S],
    anillo_1: [col[0], row[3], S, S], botas: [col[1], row[3], S, S],
  };
  const ghosts = new Map(equipSlots().map((s) => [s.name.replace('equipo_', ''), s.frames[0]]));
  for (const [slot, [x, y]] of Object.entries(eq)) {
    const g = ghosts.get(slot.startsWith('anillo') ? 'anillo' : slot);
    if (g) over(r, g, x, y);
  }
  // espacio libre abajo a la derecha del muñeco: ahí va el retrato de la heroína
  over(r, framed(S, S, 2, { inset: true, gold: true }), col[2], row[3]);
  eq.retrato = [col[2], row[3], S, S];
  // oro
  const oroY = 232;
  over(r, icon('oro'), 16, oroY - 4);
  const texto: Rect = [44, oroY, 120, 16];
  // bolsa
  const cols = 7, filas = 4, gx = Math.floor((W - cols * C) / 2), gy = 256;
  for (let j = 0; j < filas; j++) for (let i = 0; i < cols; i++) over(r, framed(C, C, 2, { inset: true }), gx + i * C, gy + j * C);
  return {
    png: r,
    layout: {
      w: W, h: H, titulo: [8, 6, W - 16, 20], equipo: eq,
      rejilla: { x: gx, y: gy, cols, filas, celda: C },
      oro: { icono: [16, oroY - 4, 24, 24], texto },
    },
  };
}

/** Todos los sprites de la interfaz. */
export function hudSprites(): UiSprite[] {
  const out: UiSprite[] = [];
  out.push({ name: 'orbe_vida', frames: Array.from({ length: 11 }, (_, i) => orb('vida', i, 0)) });
  out.push({ name: 'orbe_mana', frames: Array.from({ length: 11 }, (_, i) => orb('mana', i, 0)) });
  out.push({ name: 'orbe_vida_ola', frames: Array.from({ length: 4 }, (_, i) => orb('vida', 6, i)) });
  out.push({ name: 'orbe_mana_ola', frames: Array.from({ length: 4 }, (_, i) => orb('mana', 6, i)) });
  out.push({ name: 'panel', frames: [framed(48, 48, 4, { gold: true })], slice: [12, 12, 12, 12] });
  out.push({ name: 'panel_hundido', frames: [framed(24, 24, 3, { inset: true })], slice: [6, 6, 6, 6] });
  out.push({ name: 'tooltip', frames: [framed(24, 24, 2, { alpha: 235 })], slice: [6, 6, 6, 6] });
  out.push({ name: 'casillero', frames: [framed(36, 36, 2, { inset: true })] });
  const hover = framed(36, 36, 2, { inset: true });
  for (let i = 0; i < 36; i++) { put(hover, i, 0, GOLD[2]); put(hover, i, 35, GOLD[1]); put(hover, 0, i, GOLD[2]); put(hover, 35, i, GOLD[1]); }
  out.push({ name: 'casillero_activo', frames: [hover] });
  out.push(...equipSlots());
  out.push({ name: 'boton', frames: [framed(48, 20, 3), framed(48, 20, 3, { gold: true }), framed(48, 20, 3, { inset: true })], slice: [8, 8, 6, 6] });
  out.push({ name: 'barra_marco', frames: [bar(48, 14, 'marco')], slice: [6, 6, 6, 6] });
  out.push({ name: 'barra_jefe', frames: [bar(8, 8, 'jefe')], slice: [1, 1, 2, 2] });
  out.push({ name: 'barra_xp', frames: [bar(8, 4, 'xp')], slice: [1, 1, 1, 1] });
  out.push({ name: 'barra_vida_enemigo', frames: [bar(8, 3, 'vida_enemigo')], slice: [1, 1, 1, 1] });
  out.push({ name: 'cinturon', frames: [beltBar()] });
  out.push({ name: 'estandarte', frames: [banner()], slice: [10, 10, 4, 4] });
  for (const k of ['bolsa', 'cerrar', 'ajustes', 'mapa', 'oro', 'calavera'] as const) out.push({ name: `icono_${k}`, frames: [icon(k)] });
  out.push({ name: 'cursor_guantelete', frames: [cursor('guantelete')] });
  out.push({ name: 'cursor_mano', frames: [cursor('mano')] });
  // marca de "toca aquí" para moverse (tablet): círculo que se achica
  out.push({ name: 'marca_destino', frames: [1, 0.75, 0.5, 0.3].map((k) => { const c = new IconCanvas(24, 24); c.ring([12, 12], 9 * k + 2, 4.5 * k + 1, 1.2, glowMat('#ffe08a'), { tone: 4 }, 0, 360); return c.render({ noOutline: true }); }) });
  return out;
}

export { framed as uiFrame };
