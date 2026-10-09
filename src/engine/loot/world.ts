import { createRaster, type Raster } from '../core/raster';
import { IconCanvas, over, type MatDef, type P } from './canvas';
import { MAT, gemMat, glowMat, metalMat, RARITY_COLORS, type Rarity } from './materials';
import { renderLoot } from './render';
import type { LootItem } from './catalog';

/**
 * Botín en el mundo: cofres que se abren (por nivel), monedas que giran, montones de oro con brillo,
 * lluvia de monedas, el objeto que cae al piso dando vueltas y el haz de luz de los legendarios.
 * Todo con la vista de arriba en 3/4 del juego isométrico.
 */

export type ChestTier = 'madera' | 'reforzado' | 'dorado' | 'legendario';
export const CHEST_TIERS: ChestTier[] = ['madera', 'reforzado', 'dorado', 'legendario'];
export const CHEST_NAMES: Record<ChestTier, { es: string; en: string }> = {
  madera: { es: 'Cofre de madera', en: 'Wooden Chest' }, reforzado: { es: 'Cofre reforzado', en: 'Reinforced Chest' },
  dorado: { es: 'Cofre dorado', en: 'Golden Chest' }, legendario: { es: 'Cofre legendario', en: 'Legendary Chest' },
};

interface ChestLook { body: MatDef; band: MatDef; trim: MatDef; lock: MatDef; inside: MatDef; light: string; gem?: string; runes?: string }

const CHEST: Record<ChestTier, ChestLook> = {
  madera: { body: MAT.wood, band: MAT.iron, trim: MAT.iron, lock: MAT.iron, inside: MAT.darkwood, light: '#ffd27a' },
  reforzado: { body: MAT.darkwood, band: MAT.steel, trim: MAT.steel, lock: MAT.bronze, inside: { hex: '#2a1a14', kind: 'wood' }, light: '#ffe08a' },
  dorado: { body: { hex: '#7a1f2b', kind: 'leather' }, band: MAT.gold, trim: MAT.gold, lock: MAT.gold, inside: { hex: '#3a0f18', kind: 'cloth' }, light: '#fff0a0', gem: '#2f62e6' },
  legendario: { body: MAT.obsidian, band: metalMat('#2a2236'), trim: MAT.gold, lock: MAT.gold, inside: { hex: '#1a1028', kind: 'cloth' }, light: '#ffb84a', gem: '#ff8a1e', runes: '#ff8a1e' },
};

export const CHEST_FRAMES = 10;

/**
 * Cofre en el cuadro f (0 cerrado, 1-2 se sacude, 3 rendija de luz, 4-5 la tapa sube, 6 abierto con estallido,
 * 7-9 abierto). idle=true: cerrado con brillo que respira (para dejarlo en el mapa).
 */
export function renderChest(tier: ChestTier, f: number, px: 32 | 48 | 64 = 48, idle = false): Raster {
  const L = CHEST[tier];
  const c = new IconCanvas(px);
  const open = idle ? 0 : [0, 0, 0, 0.12, 0.45, 0.8, 1, 1, 1, 1][Math.min(9, f)];
  const shake = idle ? 0 : f === 1 ? -0.8 : f === 2 ? 0.8 : 0;
  const X = (x: number) => x + shake;
  // cuerpo: cara de adelante y costado
  const top = 16, bot = 28;
  c.poly([[X(4), top], [X(26), top], [X(26), bot], [X(4), bot]], L.body);
  c.poly([[X(26), top], [X(29), top - 2.4], [X(29), bot - 2.4], [X(26), bot]], L.body, { bias: -1 });
  // tablas
  for (const y of [20, 24]) c.px1([X(4.4), y], [X(25.6), y], L.body, { tone: 2 }, true);
  // bandas verticales y esquinas
  for (const x of [7, 22.4]) c.poly([[X(x), top], [X(x + 1.8), top], [X(x + 1.8), bot], [X(x), bot]], L.band);
  c.poly([[X(4), bot - 1.6], [X(26), bot - 1.6], [X(26), bot], [X(4), bot]], L.trim);
  // adentro (se ve cuando abre): oscuro con oro y luz
  if (open > 0) {
    c.poly([[X(4.6), top - 0.2], [X(26), top - 0.2], [X(28.6), top - 2.4], [X(7.4), top - 2.6]], L.inside, { tone: 1 });
    if (open >= 0.45) {
      for (const [x, y] of [[9, 14.6], [13, 14], [17, 14.4], [21, 14], [24.6, 14.6], [11, 15.4], [19.6, 15.4], [15, 15.6]] as P[]) c.ellipse([X(x), y], 1.8, 0.9, MAT.gold);
      if (L.gem) c.circle([X(16), 13.4], 1, gemMat(L.gem));
    }
  }
  // tapa: cerrada es una bóveda; abriendo, sube y se acorta; abierta, se ve el forro detrás
  const lidH = 7 * (1 - open) + 1.6 * open;
  const lidBase = top - 0.2 - open * 2.6;
  const lidMat = open >= 0.8 ? L.inside : L.body;
  const arch: P[] = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; arch.push([X(4 + 22 * t + open * 2.8), lidBase - lidH * Math.sin(Math.PI * (0.15 + 0.7 * t)) - (open >= 0.8 ? 7 * open : 0)]); }
  const lid: P[] = [[X(4 + open * 2.8), lidBase], ...arch, [X(26 + open * 2.8), lidBase]];
  if (open < 0.8) {
    c.poly(lid, lidMat, { bias: open > 0 ? -1 : 0 });
    c.poly([[X(26), lidBase], [X(29), lidBase - 2.4], [X(29), lidBase - 2.4 - lidH * 0.8], [X(26), lidBase - lidH * 0.85]], L.body, { bias: -1 });
    for (const x of [7, 22.4]) c.poly([[X(x), lidBase + 0.2], [X(x + 1.8), lidBase + 0.2], [X(x + 1.8), lidBase - lidH * 0.92], [X(x), lidBase - lidH * 0.92]], L.band);
    c.poly([[X(4), lidBase - 1.2], [X(26), lidBase - 1.2], [X(26), lidBase + 0.2], [X(4), lidBase + 0.2]], L.trim);
  } else {
    // tapa abierta: el forro detrás, arriba
    const lb = top - 2.6;
    c.poly([[X(7.4), lb], [X(28.6), lb - 0.2], [X(28), lb - 8.6], [X(8), lb - 8.4]], L.inside, { bias: -1 });
    c.poly([[X(7.4), lb - 8.4], [X(28.4), lb - 8.6], [X(28.2), lb - 10], [X(7.6), lb - 9.8]], L.trim);
    for (const x of [10, 25]) c.poly([[X(x), lb], [X(x + 1.6), lb], [X(x + 1.6), lb - 8.6], [X(x), lb - 8.6]], L.band, { bias: -1 });
  }
  // cerradura
  const lockY = open < 0.8 ? top - 1.6 : top + 1.4;
  c.poly([[X(13.6), lockY], [X(18.4), lockY], [X(18.4), lockY + 4.4], [X(16), lockY + 5.6], [X(13.6), lockY + 4.4]], L.lock);
  if (L.gem) c.circle([X(16), lockY + 2.2], 1, gemMat(L.gem));
  else c.poly([[X(15.4), lockY + 1.4], [X(16.6), lockY + 1.4], [X(16.6), lockY + 3.6], [X(15.4), lockY + 3.6]], MAT.obsidian, { tone: 0 });
  // runas encendidas del legendario
  if (L.runes) for (const [x, y] of [[11, 21.6], [20, 21.6], [11, 25.6], [20, 25.6]] as P[]) c.px1([X(x), y], [X(x + 1.4), y + 1.4], glowMat(L.runes), { tone: 5 }, true);
  // esquinas con cuernos del legendario
  if (tier === 'legendario') for (const s of [0, 1]) c.poly(s ? [[X(26), top + 0.4], [X(30.6), top - 4], [X(28), top + 2]] : [[X(4), top + 0.4], [X(0.6), top - 4], [X(3), top + 2]], MAT.bone);
  // rendija de luz y estallido
  const sparkles: P[] = [];
  if (!idle && f === 3) c.px1([X(5), top - 0.6], [X(25), top - 0.6], glowMat(L.light), { tone: 5 });
  if (!idle && f >= 4 && f <= 7) {
    const k = f === 6 ? 1 : f === 5 || f === 7 ? 0.7 : 0.4;
    for (let i = 0; i < 7; i++) {
      const a = (-90 + (i - 3) * 22) * (Math.PI / 180), len = (6 + (i % 2) * 4) * k;
      c.line([X(16), 13], [X(16) + Math.cos(a) * len, 13 + Math.sin(a) * len], 0.8, glowMat(L.light), { tone: 5 });
    }
    if (f >= 6) sparkles.push([X(9), 6], [X(24), 4.4], [X(16), 1.6]);
  }
  const auraK = idle ? 0.55 + 0.45 * Math.sin((f / CHEST_FRAMES) * Math.PI * 2) : 0;
  const aura = tier === 'legendario' && idle ? '#ff8a1e' : tier === 'dorado' && idle ? '#ffd84a' : null;
  return c.render({ shadow: [16.6, 28.4, 14, 2.6], aura, auraK, sparkles, glowK: 1 });
}

/** Animación de abrir el cofre (10 cuadros) o el cofre quieto con brillo (8 cuadros). */
export function chestFrames(tier: ChestTier, px: 32 | 48 | 64 = 48, idle = false): Raster[] {
  return Array.from({ length: idle ? 8 : CHEST_FRAMES }, (_, i) => renderChest(tier, i, px, idle));
}

// ---------- monedas ----------

/** Moneda que gira (8 cuadros), de 16 px por defecto. */
export function coinFrames(px: 16 | 24 | 32 = 16): Raster[] {
  const out: Raster[] = [];
  for (let i = 0; i < 8; i++) {
    const c = new IconCanvas(px, 16);
    const w = Math.abs(Math.cos((i / 8) * Math.PI));
    const rx = Math.max(0.9, 6 * w);
    c.ellipse([8, 8], rx, 6, MAT.gold);
    // canto (cuando está de perfil se ve más grueso)
    if (w < 0.5) c.poly([[8 - 0.9, 2.2], [8 + 0.9, 2.2], [8 + 0.9, 13.8], [8 - 0.9, 13.8]], MAT.gold, { bias: -1 });
    if (rx > 3) { c.ring([8, 8], rx - 0.6, 5.4, 0.9, MAT.gold, { bias: -1 }, 0, 360); c.px1([8, 5.4], [8, 10.6], MAT.gold, { tone: 5 }, true); }
    out.push(c.render({ sparkles: i === 0 ? [[11, 4.6]] : [] }));
  }
  return out;
}

export type PileSize = 'small' | 'medium' | 'large' | 'huge';
export const PILE_SIZES: PileSize[] = ['small', 'medium', 'large', 'huge'];

/** Montón de oro en el piso con brillo (6 cuadros). */
export function pileFrames(size: PileSize, px: 32 | 48 = 32): Raster[] {
  const n = { small: 3, medium: 7, large: 13, huge: 22 }[size];
  const coins: P[] = [];
  let seed = 7;
  const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * (2.4 + n * 0.3);
    coins.push([16 + Math.cos(a) * d * 1.5, 23 + Math.sin(a) * d * 0.6]);
  }
  coins.sort((a, b) => a[1] - b[1]);
  const out: Raster[] = [];
  for (let f = 0; f < 6; f++) {
    const c = new IconCanvas(px);
    // el montón grande tiene un cerro abajo
    if (size === 'large' || size === 'huge') c.ellipse([16, 25], size === 'huge' ? 11 : 8, size === 'huge' ? 5 : 3.6, MAT.gold, { bias: -1 });
    if (size === 'huge') c.ellipse([16, 22], 7, 4, MAT.gold);
    coins.forEach(([x, y], i) => c.ellipse([x, y - (size === 'huge' ? Math.max(0, 6 - Math.hypot(x - 16, (y - 24) * 2) * 0.6) : 0)], 3, 1.5, MAT.gold, { bias: i % 3 === 0 ? 1 : 0 }));
    const b = coins[(f * 3) % coins.length];
    out.push(c.render({ shadow: [16, 26, Math.min(14, 4 + n * 0.5), 2.2], sparkles: f % 2 === 0 ? [[b[0], b[1] - 1.4]] : [] }));
  }
  return out;
}

/** Lluvia de monedas: salen de un punto, vuelan girando y caen desparramadas (12 cuadros, 48 px). */
export function coinBurstFrames(px: 48 | 64 = 48, count = 10): Raster[] {
  const out: Raster[] = [];
  let seed = 3;
  const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const coins = Array.from({ length: count }, () => ({ vx: (r() - 0.5) * 2.2, vy: -2.6 - r() * 1.6, land: 0.72 + r() * 0.2, spin: r() * 8 }));
  for (let f = 0; f < 12; f++) {
    const c = new IconCanvas(px);
    const t = f / 11;
    for (const k of coins) {
      const tt = Math.min(t, k.land);
      const x = 16 + k.vx * tt * 11;
      // parábola: sube y cae al piso (y = 26)
      const y = Math.min(26 + (k.vx > 0 ? 0.6 : -0.4), 22 + k.vy * tt * 11 + 9 * tt * tt * 11 / 4.5);
      const landed = t >= k.land;
      const w = landed ? 1 : Math.abs(Math.cos(k.spin + f * 0.9));
      if (landed) c.ellipse([x, y], 1.7, 0.85, MAT.gold);
      else c.ellipse([x, y], Math.max(0.5, 1.7 * w), 1.7, MAT.gold, { bias: w < 0.4 ? -1 : 0 });
    }
    out.push(c.render({ sparkles: f === 2 ? [[16, 18]] : f === 10 ? [[20, 25]] : [] }));
  }
  return out;
}

// ---------- objeto que cae y haz de luz ----------

/** Escala horizontal de un ícono (para que "gire" como en Diablo al caer). */
function squash(src: Raster, k: number): Raster {
  const out = createRaster(src.w, src.h);
  const cx = (src.w - 1) / 2;
  const ak = Math.max(0.08, Math.abs(k));
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    const sx = Math.round(cx + (x - cx) / ak * (k < 0 ? -1 : 1));
    if (sx < 0 || sx >= src.w) continue;
    const s = (y * src.w + sx) * 4, d = (y * src.w + x) * 4;
    for (let i = 0; i < 4; i++) out.data[d + i] = src.data[s + i];
  }
  return out;
}

/**
 * El objeto sale volando, gira y cae al piso con un rebote (10 cuadros). Lienzo de px de ancho y 1.5 px de alto.
 * El último cuadro es el objeto en el piso (para dejarlo quieto en el mapa).
 */
export function dropFrames(item: LootItem, px: 32 | 48 | 64 = 32): Raster[] {
  const icon = renderLoot(item, { px, noAura: true });
  const H = Math.round(px * 1.5);
  const hs = [0, 0.45, 0.75, 0.9, 0.85, 0.6, 0.2, 0, 0.1, 0];
  const out: Raster[] = [];
  for (let f = 0; f < 10; f++) {
    const fr = createRaster(px, H);
    // sombra en el piso: más chica cuanto más alto va
    const sh = 1 - hs[f] * 0.6;
    for (let y = 0; y < H; y++) for (let x = 0; x < px; x++) {
      const dx = (x + 0.5 - px / 2) / (px * 0.32 * sh), dy = (y + 0.5 - (H - px * 0.12)) / (px * 0.07 * sh);
      if (dx * dx + dy * dy <= 1) { const i = (y * px + x) * 4; fr.data[i] = 10; fr.data[i + 1] = 7; fr.data[i + 2] = 16; fr.data[i + 3] = 110; }
    }
    const spin = f < 7 ? Math.cos((f / 7) * Math.PI * 3) : 1;
    over(fr, squash(icon, spin), 0, Math.round(H - px - px * 0.05 - hs[f] * px * 0.5));
    out.push(fr);
  }
  return out;
}

/** Haz de luz sobre un objeto en el piso (8 cuadros, 24 x 64 por defecto), del color de la rareza. */
export function beamFrames(rarity: Rarity, w = 24, h = 64): Raster[] {
  const col = RARITY_COLORS[rarity];
  const rgb = [parseInt(col.slice(1, 3), 16), parseInt(col.slice(3, 5), 16), parseInt(col.slice(5, 7), 16)];
  const out: Raster[] = [];
  for (let f = 0; f < 8; f++) {
    const r = createRaster(w, h);
    const pulse = 0.8 + 0.2 * Math.sin((f / 8) * Math.PI * 2);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = Math.abs(x + 0.5 - w / 2) / (w / 2);
      const fade = Math.min(1, (y / h) * 1.6) * (y > h - 6 ? 1 : 1);
      let a = 0, white = 0;
      if (dx < 0.12) { a = 235; white = 0.5; } else if (dx < 0.3) { a = 150; white = 0.08; } else if (dx < 0.55) a = 60; else if (dx < 0.85) a = 22;
      a *= fade * pulse;
      // base: un charco de luz
      const by = (y + 0.5 - (h - 4)) / 3, bx = (x + 0.5 - w / 2) / (w / 2);
      if (bx * bx + by * by <= 1) { a = Math.max(a, 140 * pulse); white = Math.max(white, 0.15); }
      if (a < 4) continue;
      const i = (y * w + x) * 4;
      r.data[i] = rgb[0] + (255 - rgb[0]) * white; r.data[i + 1] = rgb[1] + (255 - rgb[1]) * white; r.data[i + 2] = rgb[2] + (255 - rgb[2]) * white; r.data[i + 3] = Math.min(255, a);
    }
    // chispas que suben
    for (let k = 0; k < 4; k++) {
      const y = Math.round(h - 6 - (((f + k * 2) % 8) / 8) * (h - 10));
      const x = Math.round(w / 2 + (k % 2 ? 4 : -4) + Math.sin(f + k) * 2);
      if (x >= 0 && x < w && y >= 0) { const i = (y * w + x) * 4; r.data[i] = 255; r.data[i + 1] = 255; r.data[i + 2] = 255; r.data[i + 3] = 230; }
    }
    out.push(r);
  }
  return out;
}
