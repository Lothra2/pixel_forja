import { createRaster, type Raster } from '../core/raster';
import { IconCanvas, ramp6, type MatDef, type P } from '../loot/canvas';
import { glowMat, metalMat } from '../loot/materials';
import { CAT } from './catedralObjects';
import { withShadow } from './premium/shadow';
import type { WorldObject } from './objects';

/**
 * La Catedral premium (encargo 2.2, 2.3, 2.5 y 2.6): ladrillos con variantes, mobiliario roto, calcomanías de losa,
 * vitrales con su charco de luz y el haz de polvo, escalones rotos, primer plano y el fondo de abismo.
 *
 * Misma luz que todo el kit: de arriba a la izquierda. Las rampas salen de `ramp6` (las sombras tiran al azul, las
 * luces al cálido), nada se oscurece con negro ni gris.
 */

const stone = (hex: string): MatDef => ({ hex, kind: 'stone' });
const wood = (hex: string): MatDef => ({ hex, kind: 'wood' });
const one = (fr: Raster) => ({ idle: { frames: [fr], fps: 1, loop: true } });

function hash(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function put(r: Raster, x: number, y: number, hex: string, a = 255) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= r.w || y >= r.h) return;
  const [R, G, B] = rgb(hex), k = (y * r.w + x) * 4;
  if (a >= 255 || r.data[k + 3] === 0) { r.data[k] = R; r.data[k + 1] = G; r.data[k + 2] = B; r.data[k + 3] = Math.max(r.data[k + 3], a); return; }
  const t = a / 255;
  r.data[k] = r.data[k] * (1 - t) + R * t; r.data[k + 1] = r.data[k + 1] * (1 - t) + G * t; r.data[k + 2] = r.data[k + 2] * (1 - t) + B * t;
}
/** ruido de valor que repite cada `period` px (para el fondo que pega por los 4 lados) */
function tnoise(x: number, y: number, cell: number, period: number, seed: number): number {
  const n = Math.round(period / cell);
  const gx = x / cell, gy = y / cell, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const m = (v: number) => ((v % n) + n) % n;
  const a = hash(m(x0), m(y0), seed), b = hash(m(x0 + 1), m(y0), seed), c = hash(m(x0), m(y0 + 1), seed), d = hash(m(x0 + 1), m(y0 + 1), seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

// ---------------------------------------------------------------- ladrillos

export const BRICK_RAMP = ramp6(CAT.piedra, 'stone');
const BRICK_DARK = ramp6(CAT.piedraOscura, 'stone');
const MOSS = ramp6('#3f6e5a', 'fur');
const ROOT = ramp6(CAT.raiz, 'wood');

/**
 * Un cuadro de ladrillo de 32 x 32 (4 hileras de 16 x 8, trabadas). Variantes: base (6), con musgo, roto y con raíz
 * (3 de cada uno). Cada ladrillo tiene su tono, canto con luz arriba a la izquierda, sombra abajo a la derecha y
 * esquinas gastadas.
 */
export function brickTile(kind: 'base' | 'musgo' | 'roto' | 'raiz', v: number): Raster {
  const r = createRaster(32, 32), seed = 300 + v * 17 + (kind === 'base' ? 0 : kind === 'musgo' ? 100 : kind === 'roto' ? 200 : 300);
  const off0 = (v * 5) % 16;
  const brickAt = (x: number, y: number) => { const row = y >> 3, off = (off0 + (row % 2) * 8) % 16; const bx = Math.floor((x + off) / 16); return { row, bx, lx: (x + off) % 16, ly: y & 7 }; };
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const { row, bx, lx, ly } = brickAt(x, y);
    const mortar = ly === 7 || lx === 15;
    let t = 3 + Math.round((hash(bx, row, seed) - 0.5) * 1.6);
    if (ly === 0) t += 1; else if (ly === 6) t -= 1;
    if (lx === 0) t += 1; else if (lx === 14) t -= 1;
    if (hash(x, y, seed + 1) > 0.9) t -= 1;
    // esquinas gastadas: el ladrillo pierde la punta y se ve la junta
    const chip = (lx <= 1 && ly <= 1 && hash(bx, row, seed + 2) > 0.55) || (lx >= 13 && ly >= 5 && hash(bx, row, seed + 3) > 0.7);
    put(r, x, y, mortar || chip ? BRICK_DARK[1] : BRICK_RAMP[Math.max(1, Math.min(5, t))]);
  }
  if (kind === 'musgo') {
    // el musgo crece abajo y en el lado de la sombra (donde se junta la humedad), y se mete en las juntas
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const { lx, ly } = brickAt(x, y);
      const m = tnoise(x, y, 6, 32, seed) * 0.8 + (y / 32) * 0.5 + (lx > 10 ? 0.1 : 0) + (ly === 7 || lx === 15 ? 0.2 : 0);
      if (m < 0.82) continue;
      put(r, x, y, MOSS[m > 1.05 ? 4 : m > 0.92 ? 3 : 2]);
    }
  }
  if (kind === 'roto') {
    // falta un ladrillo (o medio): se ve el hueco oscuro, con el canto de abajo con luz y el de arriba en sombra
    const row = 1 + (v % 2), off = (off0 + (row % 2) * 8) % 16, bx0 = 16 * (1 + (v % 2)) - off;
    const rr = seeded(seed);
    for (let y = row * 8; y < row * 8 + 8; y++) for (let x = bx0 - 1; x < bx0 + 15; x++) {
      const edge = Math.min(x - bx0 + 1, bx0 + 14 - x, y - row * 8, row * 8 + 7 - y);
      if (x < 0 || x >= 32 || edge < (rr() < 0.25 ? 1 : 0)) continue;
      const top = y - row * 8 <= 1;
      put(r, x, y, top ? '#05060a' : y === row * 8 + 6 ? BRICK_DARK[2] : '#0a0c13');
    }
    // pedacitos en la junta de abajo
    for (let i = 0; i < 4; i++) put(r, bx0 + 2 + rr() * 10, row * 8 + 8 + rr() * 2, BRICK_RAMP[2]);
  }
  if (kind === 'raiz') {
    // una raíz que baja cruzando los ladrillos, con su sombra a la derecha
    const rr = seeded(seed);
    let x = 6 + rr() * 18;
    for (let y = 0; y < 32; y++) {
      x += (rr() - 0.5) * 1.6 + (v - 1) * 0.15;
      const w = 2.4 - y * 0.03;
      for (let dx = -w; dx <= w; dx++) put(r, x + dx, y, ROOT[dx < -w + 1 ? 4 : dx > w - 1.2 ? 1 : 3]);
      put(r, x + w + 1, y, BRICK_DARK[1]);
      if (hash(y, v, seed) > 0.9) put(r, x - 1, y, glowMat(CAT.turquesa).hex);
    }
  }
  return r;
}

function brickObjects(): WorldObject[] {
  const tile = (name: string, fr: Raster): WorldObject => ({ name, w: 32, h: 32, anchor: [16, 32], solid: null, layer: 'suelo', anims: one(fr) });
  return [
    ...[0, 1, 2, 3, 4, 5].map((v) => tile(`ladrillo_${v}`, brickTile('base', v))),
    ...[0, 1, 2].map((v) => tile(`ladrillo_musgo_${v}`, brickTile('musgo', v))),
    ...[0, 1, 2].map((v) => tile(`ladrillo_roto_${v}`, brickTile('roto', v))),
    ...[0, 1, 2].map((v) => tile(`ladrillo_raiz_${v}`, brickTile('raiz', v))),
  ];
}

// ---------------------------------------------------------------- mobiliario

/** Banca de la nave, rota: el asiento se vence a la derecha y una tabla quedó en el piso. Sólida. */
function brokenPew(): WorldObject {
  const c = new IconCanvas(64, 64, 40);
  const W = wood('#5e4434'), WD = wood('#4a3428');
  // respaldo: dos postes y tres tablas (la de arriba partida)
  c.poly([[5, 34], [5, 7], [9, 7], [9, 34]], WD);
  c.poly([[52, 36], [53, 10], [57, 10], [56, 36]], WD);
  c.poly([[7, 10], [36, 10], [33, 14], [7, 14]], W, { bias: 1 });
  c.poly([[38, 11], [55, 12], [55, 15], [40, 15]], W, { bias: 1 });
  c.poly([[7, 16], [55, 16], [55, 19], [7, 19]], W);
  // asiento: entero a la izquierda, vencido a la derecha
  c.poly([[3, 22], [34, 22], [36, 27], [3, 27]], W, { bias: 1 });
  c.poly([[34, 22], [58, 27], [57, 31], [36, 27]], W);
  c.poly([[3, 27], [36, 27], [36, 30], [3, 30]], WD, { bias: -1 });
  // patas
  for (const x of [6, 30]) c.poly([[x, 30], [x, 37], [x + 3, 37], [x + 3, 30]], WD);
  // tabla caída y astillas
  c.poly([[38, 34], [60, 32], [61, 35], [39, 37]], W);
  for (const [x, y] of [[36, 31], [41, 38], [58, 37]] as P[]) c.dot([x, y], W, { tone: 4 }, true);
  // musgo donde llega la humedad (abajo, a la derecha)
  c.dot([33, 29], { hex: '#3f6e5a', kind: 'fur' }, { tone: 3 }, true);
  c.dot([55, 33], { hex: '#3f6e5a', kind: 'fur' }, { tone: 3 }, true);
  return withShadow({ name: 'banca_rota', w: 64, h: 40, anchor: [32, 37], solid: [-28, -8, 56, 8], anims: one(c.render()) }, { length: 0.45, drop: 0.25 });
}

/**
 * Candelabro de pie con tres velas. `idle` encendido (la llama tiembla), `apagada` (1 cuadro) y `prender`
 * (6 cuadros: una chispa que crece hasta la llama). Luz ámbar de 90 que tiembla.
 */
function candelabra(): WorldObject {
  const IRON = metalMat('#3a3a44');
  const base = (c: IconCanvas) => {
    c.line([16, 60], [9, 63], 1.4, IRON); c.line([16, 60], [23, 63], 1.4, IRON); c.line([16, 61], [16, 63], 1.4, IRON);
    c.line([16, 61], [16, 26], 1.6, IRON);
    c.ellipse([16, 44], 2.4, 1.2, IRON, { bias: 1 });
    c.ellipse([16, 27], 9, 2, IRON);
    c.line([8, 27], [7, 20], 1.2, IRON); c.line([24, 27], [25, 20], 1.2, IRON);
    for (const [x, y, h] of [[7, 19, 7], [16, 22, 9], [25, 19, 6]] as [number, number, number][]) {
      c.poly([[x - 1.6, y], [x - 1.6, y - h], [x + 1.6, y - h], [x + 1.6, y]], { hex: '#e8dcc0', kind: 'paper' });
      c.dot([x + 1.4, y - 2], { hex: '#e8dcc0', kind: 'paper' }, { tone: 4 }, true); // gota de cera
    }
  };
  const flame = (c: IconCanvas, f: number, k: number) => {
    for (const [x, y, h] of [[7, 19, 7], [16, 22, 9], [25, 19, 6]] as [number, number, number][]) {
      const top = y - h, s = Math.sin(f * 1.7 + x) * 0.6;
      if (k <= 0) continue;
      c.poly([[x - 1.2 * k, top], [x + s, top - 5 * k], [x + 1.2 * k, top]], glowMat('#ff8a2a'), { tone: 3 });
      c.poly([[x - 0.6 * k, top], [x + s * 0.6, top - 3.4 * k], [x + 0.6 * k, top]], glowMat('#ffe0a0'), { tone: 5 });
    }
  };
  const frame = (f: number, k: number) => { const c = new IconCanvas(32, 32, 64); base(c); flame(c, f, k); return c.render({ glowK: k > 0 ? 0.9 : 0 }); };
  const idle = [0, 1, 2, 3].map((f) => frame(f, [1, 0.9, 1.05, 0.95][f]));
  const prender = [0.15, 0.3, 0.5, 0.7, 0.85, 1].map((k, f) => frame(f, k));
  const o: WorldObject = {
    name: 'candelabro_pie', w: 32, h: 64, anchor: [16, 62], solid: [-6, -4, 12, 4],
    anims: { idle: { frames: idle, fps: 8, loop: true }, apagada: { frames: [frame(0, 0)], fps: 1, loop: true }, prender: { frames: prender, fps: 10, loop: false } },
    light: { color: CAT.ambar, radius: 90, flicker: true, dy: 44 },
  };
  return withShadow(o, { length: 0.42, drop: 0.2 });
}

/** Estatua de un santo, rota: sin cabeza, un brazo partido, musgo y una raíz que la abraza. Sólida. */
function brokenSaint(): WorldObject {
  const c = new IconCanvas(48, 48, 96);
  const S = stone('#6a7286'), SD = stone(CAT.piedraOscura);
  // pedestal
  c.poly([[6, 94], [6, 82], [42, 82], [42, 94]], SD);
  c.poly([[8, 82], [8, 78], [40, 78], [40, 82]], S, { bias: 1 });
  // túnica: se abre hacia abajo, con pliegues
  c.poly([[12, 78], [15, 34], [33, 34], [36, 78]], S);
  for (const x of [18, 23, 28, 32]) c.px1([x, 40], [x + (x - 24) * 0.25, 76], SD, { tone: 2 }, true);
  // hombros y cuello partido (la cabeza ya no está: canto irregular claro)
  c.poly([[14, 36], [17, 28], [31, 28], [34, 36]], S, { bias: 1 });
  c.poly([[20, 28], [21, 24], [23, 26], [25, 23], [27, 25], [28, 28]], stone('#8a92a4'), { bias: 1 });
  // manos juntas al pecho, un brazo partido a la altura del codo
  c.poly([[19, 42], [29, 42], [27, 50], [21, 50]], S, { bias: 1 });
  c.poly([[33, 36], [38, 44], [36, 46], [31, 40]], S);
  c.poly([[36, 44], [38.5, 45.5], [37, 47]], stone('#8a92a4'), { bias: 1 });
  // pedazos en el piso
  for (const [x, y, s] of [[40, 90, 2.4], [44, 92, 1.6], [4, 92, 1.8]] as [number, number, number][]) c.ellipse([x, y], s, s * 0.7, S);
  // musgo abajo y del lado de la sombra; raíz que sube abrazándola
  const r = seeded(77);
  for (let i = 0; i < 9; i++) c.dot([28 + r() * 8, 60 + r() * 20], { hex: '#3f6e5a', kind: 'fur' }, { tone: 3 }, true);
  c.line([10, 94], [16, 66], 1.6, wood(CAT.raiz)); c.line([16, 66], [30, 56], 1.2, wood(CAT.raiz));
  c.dot([24, 38], glowMat(CAT.turquesa), { tone: 3 }, true);
  return withShadow({ name: 'estatua_santo_rota', w: 48, h: 96, anchor: [24, 93], solid: [-14, -8, 28, 8], anims: one(c.render()) });
}

/** Libros tirados: dos cerrados y uno abierto (capa suelo). */
function fallenBooks(): WorldObject {
  const c = new IconCanvas(40, 40, 24);
  c.poly([[3, 14], [14, 11], [16, 17], [5, 20]], { hex: '#7a3a34', kind: 'leather' });
  c.poly([[4, 15], [14, 12.4], [14.6, 13.6], [4.6, 16.2]], { hex: '#e0d4b8', kind: 'paper' }, { tone: 4 }); // hojas
  c.poly([[24, 18], [36, 17], [36, 22], [24, 23]], { hex: '#3a5a5a', kind: 'leather' });
  // el abierto: dos páginas con renglones
  c.poly([[12, 6], [20, 4], [20, 11], [12, 13]], { hex: '#d8ccb0', kind: 'paper' }, { bias: 1 });
  c.poly([[20, 4], [28, 6], [28, 13], [20, 11]], { hex: '#d8ccb0', kind: 'paper' });
  for (let i = 0; i < 3; i++) { c.px1([13.5, 7 + i * 1.8], [18.5, 5.6 + i * 1.8], { hex: '#8a7a64', kind: 'paper' }, { tone: 2 }, true); c.px1([21.5, 5.6 + i * 1.8], [26.5, 7 + i * 1.8], { hex: '#8a7a64', kind: 'paper' }, { tone: 2 }, true); }
  return { name: 'libros_tirados', w: 40, h: 24, anchor: [20, 18], solid: null, layer: 'suelo', anims: one(c.render()) };
}

// ---------------------------------------------------------------- calcomanías de losa

function decal(name: string, w: number, h: number, anchor: [number, number], paint: (r: Raster) => void): WorldObject {
  const r = createRaster(w, h); paint(r);
  return { name, w, h, anchor, solid: null, layer: 'suelo', anims: one(r) };
}

function slabMoss(v: number) {
  return decal(`musgo_losa_${v}`, 32, 24, [16, 12], (r) => {
    for (let y = 0; y < 24; y++) for (let x = 0; x < 32; x++) {
      const d = Math.hypot((x - 16) / 14, (y - 12) / 9) + (tnoise(x, y, 5, 40, 610 + v) - 0.5) * 0.9;
      if (d > 0.95) continue;
      // más claro arriba a la izquierda (la luz), el borde más oscuro
      const t = d > 0.8 ? 1 : (x + y < 26 && d < 0.6) ? 4 : hash(x, y, 611 + v) > 0.8 ? 2 : 3;
      put(r, x, y, MOSS[t]);
    }
  });
}
function slabCrack(v: number) {
  return decal(`grieta_losa_${v}`, 32, 20, [16, 10], (r) => {
    const rr = seeded(620 + v);
    const walk = (x: number, y: number, n: number, dx: number) => {
      for (let i = 0; i < n; i++) {
        put(r, x, y, '#06070b'); put(r, x + 1, y + 1, BRICK_RAMP[4], 160); // el canto de abajo de la grieta recibe luz
        x += dx + (rr() - 0.5) * 0.8; y += (rr() - 0.5) * 1.4;
        if (rr() < 0.08) walk(x, y, n - i - 2, dx * 0.6 + (rr() - 0.5));
      }
    };
    walk(3, 6 + v * 3, 26, 1);
  });
}
function smallRubble(v: number) {
  return decal(`escombro_chico_${v}`, 24, 16, [12, 10], (r) => {
    const rr = seeded(630 + v);
    for (let i = 0; i < 4 + v; i++) {
      const cx = 4 + rr() * 16, cy = 5 + rr() * 7, s = 1.4 + rr() * 2.4;
      for (let y = -s - 1; y <= s + 1; y++) for (let x = -s - 1; x <= s + 1; x++) {
        const d = Math.hypot(x / s, y / (s * 0.75));
        if (d > 1.15) continue;
        if (d > 1) { if (x > 0 && y > 0) put(r, cx + x, cy + y, '#06070b', 140); continue; } // sombra de contacto
        put(r, cx + x, cy + y, BRICK_RAMP[x + y < -s * 0.5 ? 5 : x + y > s * 0.6 ? 2 : 3]);
      }
    }
  });
}
function meltedWax(v: number) {
  const WAX = ramp6('#e4d8bc', 'paper');
  return decal(`cera_derretida_${v}`, 24, 16, [12, 10], (r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 24; x++) {
      const d = Math.hypot((x - 12) / (9 - v * 2), (y - 9) / 4.5) + (tnoise(x, y, 3, 24, 640 + v) - 0.5) * 0.5;
      if (d > 1) continue;
      put(r, x, y, WAX[d > 0.85 ? 2 : x + y < 16 ? 4 : 3]);
    }
    // el cabo de la vela
    for (let y = 2; y < 9; y++) for (let x = 11; x < 14; x++) put(r, x, y, WAX[x === 11 ? 4 : x === 13 ? 2 : 3]);
    put(r, 12, 1, '#2a1e18');
  });
}
function blackPuddle(v: number) {
  return decal(`charco_negro_${v}`, 32, 16, [16, 8], (r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) {
      const d = Math.hypot((x - 16) / (14 - v * 3), (y - 8) / 6) + (tnoise(x, y, 4, 32, 650 + v) - 0.5) * 0.4;
      if (d > 1) continue;
      // agua negra que refleja un poco: canto claro abajo, reflejo de luz arriba a la izquierda
      const c = d > 0.88 && y > 8 ? '#2a3448' : d < 0.35 && x < 14 && y < 8 ? '#1c2636' : '#0a0e16';
      put(r, x, y, c);
    }
  });
}

// ---------------------------------------------------------------- vitrales, charcos de luz y haz de polvo

const VITRAL = [
  { name: 'ambar', glass: ['#7a4418', '#c0762a', '#ffb050', '#ffe0a0'], light: '#ffb050' },
  { name: 'rosa', glass: ['#5a2236', '#a04060', '#e07090', '#ffc0d0'], light: '#e07090' },
  { name: 'turquesa', glass: ['#14544e', '#2a9a90', '#5ae0d0', '#b0fff0'], light: '#5ae0d0' },
];

/** Vitral de 48 x 96 con arco apuntado, parteluz, rosetón arriba y vidrios en rombos (va en la cara del muro). */
function stainedGlass(v: number): WorldObject {
  const r = createRaster(48, 96), G = VITRAL[v].glass, F = BRICK_RAMP;
  const cx = 23.5;
  const inArch = (x: number, y: number, inset: number) => {
    const hw = 20 - inset, top = 6 + inset;
    if (y < top || y > 88 - inset || Math.abs(x - cx) > hw) return false;
    if (y > 30) return true;
    // arco apuntado: dos arcos que se cruzan
    const R = 30 - inset;
    return Math.hypot(x - (cx - hw + R), y - 30) <= R && Math.hypot(x - (cx + hw - R), y - 30) <= R;
  };
  for (let y = 0; y < 96; y++) for (let x = 0; x < 48; x++) {
    if (!inArch(x, y, -3)) continue;
    if (!inArch(x, y, 1)) {
      // marco de piedra: canto con luz arriba a la izquierda
      const lit = x < cx && y < 60;
      put(r, x, y, inArch(x, y, -1) ? F[lit ? 4 : 2] : F[1]);
      continue;
    }
    // plomo: parteluz, travesaño, rosetón y rombos
    const rose = Math.hypot(x - cx, y - 26);
    const lead = Math.abs(x - cx) < 1 || (y > 44 && y < 47) || (rose > 7 && rose < 8.6) || (rose < 7 && (Math.abs(x - cx) < 0.6 || Math.abs(y - 26) < 0.6)) || (y > 36 && ((x + y) % 10 === 0 || (x - y + 100) % 10 === 0));
    if (lead) { put(r, x, y, '#14141c'); continue; }
    // vidrio: brilla más en el centro y arriba (le pega la luz de afuera)
    const t = Math.min(3, Math.max(0, Math.round(2.2 - (y / 96) * 1.2 + (hash(x >> 2, y >> 2, 700 + v) - 0.5) * 1.4 + (rose < 7 ? 0.8 : 0))));
    put(r, x, y, G[t]);
  }
  // alféizar
  for (let x = 2; x < 46; x++) { put(r, x, 89, F[4]); put(r, x, 90, F[3]); put(r, x, 91, F[1]); }
  return { name: `vitral_${v}`, w: 48, h: 96, anchor: [24, 95], solid: null, anims: one(r), light: { color: VITRAL[v].light, radius: 70, pulse: true, dy: 50 } };
}

/** El charco de luz del vitral en el piso (96 x 64, capa suelo): los rombos del vidrio corridos abajo a la derecha. */
function glassLight(v: number): WorldObject {
  const r = createRaster(96, 64), G = VITRAL[v].glass;
  for (let y = 0; y < 64; y++) for (let x = 0; x < 96; x++) {
    // la ventana proyectada: se estira hacia abajo a la derecha (la luz viene de arriba a la izquierda)
    const u = (x - 18 - y * 0.55) / 40, w = y / 60;
    if (u < 0 || u > 1 || w < 0 || w > 1) continue;
    const edge = Math.min(u, 1 - u, w, 1 - w);
    const lead = Math.abs(u - 0.5) < 0.025 || ((Math.round(u * 40 + w * 30) % 7) === 0);
    if (lead) continue;
    const a = Math.round(Math.min(1, edge * 6) * 70);
    if (a < 6) continue;
    put(r, x, y, G[2 + ((x >> 3) + (y >> 3)) % 2], a);
  }
  return { name: `luz_vitral_${v}`, w: 96, h: 64, anchor: [48, 60], solid: null, layer: 'suelo', anims: one(r), light: { color: VITRAL[v].light, radius: 80, pulse: true, dy: 20 } };
}

/** Haz de polvo (64 x 192, 6 cuadros a 6 fps, capa suelo): baja en diagonal y el polvo flota adentro. */
function dustBeam(): WorldObject {
  const frames: Raster[] = [];
  const motes = Array.from({ length: 40 }, (_, i) => ({ u: hash(i, 1, 801), w: hash(i, 2, 801), s: 0.5 + hash(i, 3, 801) }));
  for (let f = 0; f < 6; f++) {
    const r = createRaster(64, 192);
    for (let y = 0; y < 192; y++) {
      const cx = 14 + (y / 192) * 34, hw = 9 + (y / 192) * 8;
      for (let x = 0; x < 64; x++) {
        const d = Math.abs(x - cx) / hw;
        if (d > 1) continue;
        const a = Math.round((1 - d) * 46 * (0.55 + 0.45 * (y / 192)) * (1 - Math.max(0, (y - 176) / 16)));
        if (a > 2) put(r, x, y, '#fff0d0', a);
      }
    }
    for (const m of motes) {
      const y = ((m.w * 192 + f * 6 * m.s) % 192), cx = 14 + (y / 192) * 34 + (m.u - 0.5) * 14;
      put(r, cx, y, '#fff8e8', 200);
    }
    frames.push(r);
  }
  return { name: 'haz_polvo', w: 64, h: 192, anchor: [48, 190], solid: null, layer: 'suelo', anims: { idle: { frames, fps: 6, loop: true } } };
}

/** Escalones rotos entre los dos niveles de la Catedral (96 x 64, capa suelo: se caminan). */
function brokenSteps(): WorldObject {
  const r = createRaster(96, 64), F = BRICK_RAMP;
  const rr = seeded(901);
  for (let s = 0; s < 6; s++) {
    const y0 = s * 10 + 2;
    for (let y = y0; y < y0 + 10 && y < 64; y++) for (let x = 4; x < 92; x++) {
      const ly = y - y0;
      // un pedazo que falta a la derecha, más grande abajo
      if (x > 74 - s * 2 && hash(x >> 3, s, 902) > 0.55 - s * 0.04) continue;
      const tread = ly < 4;
      let t = tread ? (ly === 0 ? 5 : 4) : ly === 9 ? 1 : 2;
      if (x === 4) t = Math.min(5, t + 1); else if (x === 91) t = Math.max(1, t - 1);
      if (hash(x, y, 903) > 0.94) t -= 1;
      put(r, x, y, F[Math.max(1, t)]);
    }
    // grietas
    let cx = 10 + rr() * 60;
    for (let y = y0; y < y0 + 8; y++) { put(r, cx, y, '#06070b'); cx += (rr() - 0.5) * 1.5; }
  }
  // escombro y musgo en los rincones
  for (let i = 0; i < 6; i++) put(r, 78 + rr() * 14, 50 + rr() * 12, F[3]);
  for (let i = 0; i < 10; i++) put(r, 5 + rr() * 6, 30 + rr() * 30, MOSS[3]);
  return { name: 'escalones_rotos', w: 96, h: 64, anchor: [48, 62], solid: null, layer: 'suelo', anims: one(r) };
}

// ---------------------------------------------------------------- primer plano y fondo

/** Columna cerca de la cámara (64 x 256, capa frente): casi negra, con el canto de la luz a la izquierda. */
function frontColumn(): WorldObject {
  const r = createRaster(64, 256);
  const D = ramp6('#141a26', 'stone');
  for (let y = 0; y < 256; y++) for (let x = 8; x < 56; x++) {
    const flute = (x - 8) % 8;
    let t = x < 11 ? 4 : x > 52 ? 1 : flute === 0 ? 1 : flute === 1 ? 3 : 2;
    if (hash(x, y >> 2, 950) > 0.93) t = Math.max(1, t - 1);
    put(r, x, y, D[t]);
  }
  for (let y = 0; y < 256; y += 1) { const x = 30 + Math.sin(y * 0.05) * 8; put(r, x, y, ROOT[1]); put(r, x + 1, y, ROOT[2]); }
  return { name: 'frente_columna', w: 64, h: 256, anchor: [32, 256], solid: null, layer: 'frente', anims: one(r) };
}

/** Raíces que cuelgan del techo (128 x 160, 4 cuadros a 4 fps, capa frente): se mecen apenas. */
function frontRoots(): WorldObject {
  const frames: Raster[] = [];
  const roots = Array.from({ length: 9 }, (_, i) => ({ x: 8 + i * 14 + hash(i, 1, 960) * 8, len: 60 + hash(i, 2, 960) * 95, w: 2 + hash(i, 3, 960) * 3, ph: hash(i, 4, 960) * 6 }));
  const R = ramp6('#2a1c14', 'wood');
  for (let f = 0; f < 4; f++) {
    const r = createRaster(128, 160);
    for (const ro of roots) {
      for (let y = 0; y < ro.len; y++) {
        const sw = Math.sin(f * (Math.PI / 2) + ro.ph) * (y / 160) * 3;
        const x = ro.x + Math.sin(y * 0.06 + ro.ph) * 3 + sw, w = ro.w * (1 - y / ro.len * 0.7);
        for (let dx = -w; dx <= w; dx++) put(r, x + dx, y, R[dx < -w + 1 ? 3 : dx > w - 1 ? 1 : 2]);
        if (hash(Math.round(x), y, 961) > 0.985) put(r, x, y, CAT.turquesa);
      }
    }
    frames.push(r);
  }
  return { name: 'frente_raices_colgantes', w: 128, h: 160, anchor: [64, 0], solid: null, layer: 'frente', anims: { idle: { frames, fps: 4, loop: true } } };
}

/**
 * El fondo de abismo (512 x 512, pega por los 4 lados, capa fondo). El 0 son arcos y columnas lejanas en azul muy
 * oscuro, el 1 niebla y el 2 chispas turquesa. El juego los pone donde no hay piso, con paralaje 0.6, 0.75 y 0.9.
 */
function abyss(v: 0 | 1 | 2): WorldObject {
  const S = 512, r = createRaster(S, S);
  if (v === 0) {
    // perspectiva atmosférica: poco contraste, todo tira al azul de la bruma
    const FAR = ['#070b14', '#0a1020', '#0e1628', '#131c32'];
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const n = tnoise(x, y, 64, S, 980) * 0.6 + tnoise(x, y, 16, S, 981) * 0.4;
      put(r, x, y, FAR[n > 0.62 ? 1 : 0]);
    }
    // dos hileras de arcadas (cada 256 de alto), columnas cada 128
    for (const [row, depth] of [[0, 0], [256, 1]] as [number, number][]) for (let col = 0; col < 4; col++) {
      const cx = col * 128 + (depth ? 64 : 0);
      for (let y = 0; y < 256; y++) for (let dx = -10; dx <= 10; dx++) {
        const X = (cx + dx + S) % S, Y = (row + y) % S;
        const arch = y < 90;
        if (arch) continue;
        put(r, X, Y, dx < -7 ? FAR[3] : FAR[2]);
      }
      // el arco entre esta columna y la siguiente
      for (let a = 0; a <= 180; a += 0.5) {
        const t = (a * Math.PI) / 180;
        for (let w = 0; w < 7; w++) {
          const X = Math.round(cx + 64 - Math.cos(t) * (64 - w)), Y = Math.round(row + 90 - Math.sin(t) * (60 - w));
          put(r, ((X % S) + S) % S, ((Y % S) + S) % S, w < 2 ? FAR[3] : FAR[2]);
        }
      }
    }
  } else if (v === 1) {
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const n = tnoise(x, y, 128, S, 990) * 0.55 + tnoise(x, y, 48, S, 991) * 0.3 + tnoise(x, y, 16, S, 992) * 0.15;
      const a = Math.round(Math.max(0, n - 0.42) * 260);
      if (a > 4) put(r, x, y, '#3a4a6a', Math.min(110, a));
    }
  } else {
    for (let i = 0; i < 260; i++) {
      const x = Math.floor(hash(i, 1, 995) * S), y = Math.floor(hash(i, 2, 995) * S), big = hash(i, 3, 995) > 0.8;
      put(r, x, y, '#8affe8', 230);
      if (big) { put(r, (x + 1) % S, y, CAT.turquesa, 160); put(r, x, (y + 1) % S, CAT.turquesa, 160); }
    }
  }
  return { name: `fondo_abismo_${v}`, w: S, h: S, anchor: [0, 0], solid: null, layer: 'fondo', anims: one(r) };
}

/** Paralaje de cada fondo de abismo (el 0 es el más lejano). */
export const ABISMO_PARALAJE = [0.6, 0.75, 0.9];

export function catedralPremiumObjects(): WorldObject[] {
  return [
    ...brickObjects(), brokenPew(), candelabra(), brokenSaint(), fallenBooks(),
    ...[0, 1, 2, 3].map(slabMoss), ...[0, 1, 2, 3].map(slabCrack), ...[0, 1, 2].map(smallRubble), ...[0, 1].map(meltedWax), ...[0, 1].map(blackPuddle),
    ...[0, 1, 2].map(stainedGlass), ...[0, 1, 2].map(glassLight), dustBeam(), brokenSteps(),
    frontColumn(), frontRoots(), abyss(0), abyss(1), abyss(2),
  ];
}
