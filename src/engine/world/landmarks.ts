import { createRaster, type Raster } from '../core/raster';
import { IconCanvas, type MatDef, type P, over } from '../loot/canvas';
import { glowMat, crystalMat, metalMat, clothMat } from '../loot/materials';
import { renderClip } from '../render/clip';
import { thorFicha } from '../rpg/family';
import type { WorldObject } from './objects';

/**
 * Lugares y detalles del mundo grande: puente, vado, nenúfares, juncos, cascada, tronco caído, sauce, el Abuelo Roble,
 * hongos que brillan, anillo de las hadas, cristales, ruinas (pilares, muro, arco, pozo), la estatua de Thor,
 * campamentos (carpas, empalizada, estandarte), el campo de calabazas (espantapájaros) y faroles.
 */

const leaf = (hex: string): MatDef => ({ hex, kind: 'fur' });
const wood = (hex: string): MatDef => ({ hex, kind: 'wood' });
const stone = (hex: string): MatDef => ({ hex, kind: 'stone' });
const canvas = (w: number, h: number, k = 2) => new IconCanvas(w, w / k, h);
const one = (fr: Raster) => ({ idle: { frames: [fr], fps: 1, loop: true } });

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function hash(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const rgb = (hex: string): [number, number, number] => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
function put(r: Raster, x: number, y: number, hex: string, a = 255) {
  if (x < 0 || y < 0 || x >= r.w || y >= r.h) return;
  const i = (y * r.w + x) * 4, [R, G, B] = rgb(hex);
  if (a >= 255 || !r.data[i + 3]) { r.data[i] = R; r.data[i + 1] = G; r.data[i + 2] = B; r.data[i + 3] = a; return; }
  const t = a / 255;
  r.data[i] = r.data[i] * (1 - t) + R * t; r.data[i + 1] = r.data[i + 1] * (1 - t) + G * t; r.data[i + 2] = r.data[i + 2] * (1 - t) + B * t;
  r.data[i + 3] = Math.max(r.data[i + 3], a);
}

/** Copa de árbol hecha de grupos de hojas con luz arriba a la izquierda. */
function canopy(c: IconCanvas, C: P, rx: number, ry: number, col: string, seed: number, n = 9) {
  const r = seeded(seed);
  c.ellipse(C, rx, ry, leaf(col), { bias: -1 });
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.62;
    const p: P = [C[0] + Math.cos(a) * rx * d, C[1] + Math.sin(a) * ry * d - 1];
    c.ellipse(p, rx * (0.32 + r() * 0.12), ry * (0.3 + r() * 0.12), leaf(col), { bias: p[1] < C[1] ? 1 : 0 });
  }
}

// ---------- agua ----------

/** Puente de madera de este a oeste (se cruza un río que corre de norte a sur). Va en el suelo. */
export function bridge(): WorldObject {
  const c = canvas(160, 72, 4); // 40 x 18 unidades
  // sombra del puente sobre el agua
  c.poly([[3, 15.4], [37, 15.4], [36, 16.8], [4, 16.8]], stone('#1e4e80'), { tone: 1 });
  // tablas (de norte a sur), alternando tono
  for (let i = 0; i < 18; i++) {
    const x = 2.5 + i * 2, j = (i * 7) % 3;
    c.poly([[x, 4.6 + (j === 1 ? 0.3 : 0)], [x + 1.9, 4.6], [x + 1.9, 14.6 + (j === 2 ? 0.3 : 0)], [x, 14.6]], wood(['#9a6a3e', '#a8743e', '#8a5a32'][j]), { bias: 0 });
    if (j === 0) c.dot([x + 1, 9.5], wood('#5a3a22'), { tone: 1 }, true);
  }
  // vigas de abajo que asoman en las puntas
  for (const x of [2, 38]) c.poly([[x - 1.2, 4], [x + 1.2, 4], [x + 1.2, 15.4], [x - 1.2, 15.4]], wood('#6a4428'));
  // barandas: postes y pasamanos
  for (const y of [4.2, 14.4]) {
    for (const x of [3, 11.5, 20, 28.5, 37]) c.poly([[x - 0.8, y + 0.6], [x - 0.8, y - 3.4], [x + 0.8, y - 3.4], [x + 0.8, y + 0.6]], wood('#7a5232'), { bias: 1 });
    c.poly([[2.2, y - 3.4], [37.8, y - 3.4], [37.8, y - 2.2], [2.2, y - 2.2]], wood('#a8743e'), { bias: 1 });
  }
  const fr = c.render();
  return { name: 'puente', w: 160, h: 72, anchor: [80, 40], solid: null, layer: 'suelo', anims: one(fr) };
}

/** Piedra plana del vado (se cruza el río saltando de piedra en piedra). */
export function fordStone(variant = 0): WorldObject {
  const c = canvas(32, 24, 1);
  const rx = variant ? 9.5 : 11, ry = variant ? 5.5 : 6.4;
  c.ring([16, 13], rx + 2, ry + 1.6, 1.1, { hex: '#e8f6ff', kind: 'cloth' }, { tone: 4 }, 0, 360);
  c.ellipse([16, 12], rx, ry, stone('#8c8a94'));
  c.ellipse([14, 10.5], rx * 0.6, ry * 0.45, stone('#a8a6b0'), { bias: 1 });
  if (!variant) c.ellipse([20, 14], 2.6, 1.4, leaf('#4f8f34'));
  return { name: `piedra_vado_${variant}`, w: 32, h: 24, anchor: [16, 14], solid: null, layer: 'suelo', anims: one(c.render({ noOutline: false })) };
}

export function lilyPad(flower = false): WorldObject {
  const c = canvas(32, 24, 1);
  c.ellipse([15, 12], 8, 5, leaf('#4f9a3a'));
  c.poly([[15, 12], [23, 9], [23, 13]], stone('#2a66ad'), { tone: 2 }); // muesca
  c.px1([10, 12], [15, 12], leaf('#4f9a3a'), { tone: 1 }, true);
  if (flower) {
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; c.ellipse([13 + Math.cos(a) * 2.2, 10 + Math.sin(a) * 1.4], 1.6, 1, clothMat('#f6b8d0'), { bias: 1 }); }
    c.dot([13, 10], clothMat('#ffe08a'), { tone: 4 }, true);
  }
  return { name: flower ? 'nenufar_flor' : 'nenufar', w: 32, h: 24, anchor: [16, 14], solid: null, layer: 'suelo', anims: one(c.render()) };
}

/** Juncos de la orilla (se mecen). */
export function reeds(): WorldObject {
  const frames: Raster[] = [];
  for (let f = 0; f < 4; f++) {
    const c = canvas(32, 40, 1);
    const sway = [0, 0.7, 1, 0.5][f];
    const r = seeded(31);
    for (let i = 0; i < 7; i++) {
      const x = 8 + i * 2.6 + r() * 1.2, h = 18 + r() * 12, s = sway * (h / 26) * (i % 2 ? 1 : 0.7);
      c.line([x, 36], [x + s, 36 - h], 0.9, leaf(i % 2 ? '#4f8f34' : '#5f9e3c'));
      if (i % 2 === 0) c.ellipse([x + s, 36 - h + 2.4], 0.9, 2.4, wood('#7a4a2a'));
      else c.line([x + s * 0.6, 36 - h * 0.6], [x + s * 0.6 + 3, 36 - h * 0.75], 0.7, leaf('#71ad44'));
    }
    frames.push(c.render({ shadow: [16, 36, 9, 1.4] }));
  }
  return { name: 'juncos', w: 32, h: 40, anchor: [16, 37], solid: null, anims: { idle: { frames, fps: 5, loop: true } } };
}

/** Cascada: el río cae por el acantilado (4 cuadros: el agua baja y la espuma salta). */
export function waterfall(): WorldObject {
  const W = 128, H = 128, top = 10, bot = 92;
  const frames: Raster[] = [];
  for (let f = 0; f < 4; f++) {
    const r = createRaster(W, H);
    for (let y = top; y < bot; y++) {
      const spread = (y - top) / (bot - top);
      const half = 44 + spread * 8;
      const lip = Math.round(Math.cos(((y - top) / 6) * 0) * 0);
      void lip;
      for (let x = Math.floor(64 - half - hash(y >> 2, 1, 5) * 4); x < 64 + half + hash(y >> 2, 2, 5) * 4; x++) {
        const dx = (x - 64) / half;
        // el agua arriba se curva (más alta al centro): el labio
        const lipY = top + Math.round(dx * dx * 6);
        if (y < lipY) continue;
        const col = x >> 1;
        const streak = hash(col, Math.floor((y - f * 8 - hash(col, 0, 3) * 20) / 7), 11);
        const shadeX = 1 - Math.abs(dx); // más claro al centro
        let c = shadeX > 0.55 ? '#3f8ed0' : shadeX > 0.25 ? '#3478be' : '#2a62a4';
        if (streak > 0.78) c = '#bfe6ff'; else if (streak > 0.6) c = '#7cc0ec';
        if (y < lipY + 3) c = y < lipY + 1 ? '#ffffff' : '#bfe6ff';
        if (Math.abs(dx) > 0.96) c = '#dff2ff';
        put(r, x, y, c, Math.abs(dx) > 0.9 ? 190 : 240);
      }
    }
    // espuma abajo: burbujas que saltan
    const rr = seeded(100 + f);
    for (let i = 0; i < 70; i++) {
      const x = 12 + rr() * 104, y = bot - 6 + rr() * 26 - Math.sin((x / 128) * Math.PI) * 4;
      const s = 1 + Math.floor(rr() * 3);
      for (let dy = -s; dy <= s; dy++) for (let dx = -s; dx <= s; dx++) if (dx * dx + dy * dy <= s * s) put(r, Math.round(x + dx), Math.round(y + dy), dx + dy < 0 ? '#ffffff' : '#cfeaff', 230);
    }
    // gotitas de rocío arriba de la espuma
    for (let i = 0; i < 12; i++) put(r, Math.round(16 + rr() * 96), Math.round(bot - 10 - rr() * 16), '#ffffff', 200);
    frames.push(r);
  }
  return { name: 'cascada', w: W, h: H, anchor: [64, 112], solid: null, anims: { idle: { frames, fps: 10, loop: true } }, light: { color: '#bfe6ff', radius: 110, pulse: true, dy: 40 } };
}

// ---------- bosque ----------

export function fallenLog(): WorldObject {
  const c = canvas(96, 40, 3); // 32 x 13.3
  c.poly([[3, 6], [27, 5], [28, 11], [4, 12.2]], wood('#6a4428'));
  c.poly([[3, 6], [27, 5], [27.4, 7], [3.4, 8]], wood('#8a5a32'), { bias: 1 });
  for (let x = 6; x < 26; x += 3.4) c.px1([x, 7], [x + 1.6, 10.6], wood('#4a2e1a'), { tone: 1 }, true);
  c.ellipse([28, 8], 2.2, 3.2, wood('#c09460'));
  c.ring([28, 8], 1.2, 1.8, 0.5, wood('#8a5a32'), { tone: 2 }, 0, 360);
  // musgo y hongos
  c.ellipse([10, 5.6], 3, 1, leaf('#5f9e3c')); c.ellipse([19, 5.2], 2.4, 0.9, leaf('#71ad44'));
  for (const [x, y] of [[14, 11.6], [16, 12], [22, 11.2]] as P[]) { c.poly([[x - 0.4, y], [x + 0.4, y], [x + 0.3, y - 1.4], [x - 0.3, y - 1.4]], clothMat('#f0e6d0')); c.ellipse([x, y - 1.6], 1.2, 0.7, clothMat('#e8a040')); }
  return { name: 'tronco_caido', w: 96, h: 40, anchor: [48, 36], solid: [-42, -12, 84, 12], anims: one(c.render({ shadow: [16, 12, 15, 1.6] })) };
}

export function willow(): WorldObject {
  const c = canvas(96, 112, 3); // 32 x 37.3
  c.poly([[14, 35], [14.6, 22], [17.4, 22], [18, 35], [20, 36], [12, 36]], wood('#6a4a32'));
  canopy(c, [16, 15], 13, 10, '#6aa84a', 77, 9);
  // ramas que cuelgan
  const r = seeded(78);
  for (let i = 0; i < 16; i++) {
    const x = 4 + i * 1.6 + r() * 0.6, y0 = 12 + r() * 6, len = 12 + r() * 10;
    c.line([x, y0], [x + (x < 16 ? -0.6 : 0.6), y0 + len], 0.8, leaf(i % 2 ? '#7ab84e' : '#5a9a3c'));
  }
  return { name: 'sauce', w: 96, h: 112, anchor: [48, 106], solid: [-10, -8, 20, 8], anims: one(c.render({ shadow: [16, 35.5, 12, 2.6] })) };
}

/** El Abuelo Roble: árbol gigante con cara amable tallada en el tronco. El lugar más memorable del bosque. */
export function grandOak(): WorldObject {
  const c = canvas(192, 208, 6); // 32 x 34.7
  // raíces
  for (const [x, dx] of [[11, -6], [21, 6], [14, -3], [18, 3]] as P[]) c.poly([[x - 1, 30], [x + 1.4, 30], [x + dx, 33.6], [x + dx * 0.8 - 0.8, 33.8]], wood('#6a4428'));
  // tronco
  c.poly([[10.5, 33], [11.5, 20], [13, 15], [19, 15], [20.5, 20], [21.5, 33]], wood('#7a5232'));
  c.poly([[11.6, 31], [12.4, 20], [13.6, 16], [14.6, 16], [13.8, 22], [13.6, 31]], wood('#7a5232'), { bias: 1 });
  // cara: ojos cerrados contentos y sonrisa
  c.ring([14.2, 24.5], 1.1, 0.6, 0.35, wood('#3a2416'), { tone: 0 }, 180, 360);
  c.ring([17.8, 24.5], 1.1, 0.6, 0.35, wood('#3a2416'), { tone: 0 }, 180, 360);
  c.ring([16, 26.6], 1.8, 1, 0.4, wood('#3a2416'), { tone: 0 }, 0, 180);
  c.ellipse([12.8, 26], 0.8, 0.5, clothMat('#d88a7a'), { tone: 2 }); c.ellipse([19.2, 26], 0.8, 0.5, clothMat('#d88a7a'), { tone: 2 });
  // copa enorme en tres pisos
  canopy(c, [16, 11], 15.5, 10, '#3f7f3a', 501, 14);
  canopy(c, [9, 13], 7, 5.5, '#4f8f34', 502, 6);
  canopy(c, [23, 13], 7, 5.5, '#4f8f34', 503, 6);
  canopy(c, [16, 6.5], 9, 5, '#5a9a3a', 504, 7);
  // musgo y lucecitas
  c.ellipse([12, 31], 1.6, 0.7, leaf('#71ad44')); c.ellipse([20, 30], 1.4, 0.6, leaf('#71ad44'));
  const fr = c.render({ shadow: [16, 33.6, 14, 2.4], sparkles: [[6, 8], [26, 6], [20, 15]] });
  return { name: 'abuelo_roble', w: 192, h: 208, anchor: [96, 202], solid: [-30, -18, 60, 18], anims: one(fr) };
}

/** Hongo gigante que brilla (late despacio). */
export function glowShroom(color: 'azul' | 'morado'): WorldObject {
  const hex = color === 'azul' ? '#4ad8ff' : '#c47aff';
  const frames: Raster[] = [];
  for (let f = 0; f < 4; f++) {
    const c = canvas(48, 64, 1.5); // 32 x 42.7
    const k = [0.6, 0.85, 1, 0.8][f];
    c.poly([[13, 40], [14, 24], [18, 24], [19, 40]], clothMat('#e8e0d0'));
    c.ellipse([16, 22], 13, 7.5, glowMat(hex), { tone: 3 });
    c.ellipse([13, 19.5], 7, 3.4, glowMat(hex), { tone: 4 });
    for (const [x, y] of [[9, 21], [16, 18], [22, 22], [19, 25.5], [11, 25]] as P[]) c.ellipse([x, y], 1.4, 0.9, clothMat('#f6fbff'), { tone: 4 });
    // hongo chico al lado
    c.poly([[25, 40], [25.5, 34], [27, 34], [27.5, 40]], clothMat('#e8e0d0'));
    c.ellipse([26.2, 33.4], 4, 2.4, glowMat(hex), { tone: 3 });
    frames.push(c.render({ glowK: k, shadow: [16, 40, 10, 2] }));
  }
  return { name: `hongo_gigante_${color}`, w: 48, h: 64, anchor: [24, 60], solid: [-6, -4, 12, 4], anims: { idle: { frames, fps: 4, loop: true } }, light: { color: hex, radius: 100, pulse: true, dy: 26 } };
}

/** Anillo de las hadas: círculo de hongos chiquitos que brillan. Va en el suelo. */
export function fairyRing(): WorldObject {
  const frames: Raster[] = [];
  for (let f = 0; f < 4; f++) {
    const c = canvas(96, 64, 3); // 32 x 21.3
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2, x = 16 + Math.cos(a) * 12, y = 11 + Math.sin(a) * 7.5;
      const on = (i + f) % 4 === 0;
      c.poly([[x - 0.4, y + 1], [x + 0.4, y + 1], [x + 0.3, y - 0.4], [x - 0.3, y - 0.4]], clothMat('#f0e6d0'));
      c.ellipse([x, y - 0.6], 1.3, 0.8, glowMat(on ? '#a8fff0' : '#5ad8c8'), { tone: on ? 4 : 3 });
    }
    frames.push(c.render({ glowK: 0.7 + (f % 2) * 0.3, sparkles: f % 2 ? [[16, 8]] : [[12, 12]] }));
  }
  return { name: 'anillo_hadas', w: 96, h: 64, anchor: [48, 36], solid: null, layer: 'suelo', anims: { idle: { frames, fps: 4, loop: true } }, light: { color: '#7affe0', radius: 120, pulse: true, dy: 4 } };
}

export function crystals(): WorldObject {
  const frames: Raster[] = [];
  for (let f = 0; f < 4; f++) {
    const c = canvas(32, 48, 1);
    for (const [x, h, w, tilt] of [[12, 22, 3.6, -3], [18, 30, 4.4, 1], [24, 18, 3.2, 4]] as [number, number, number, number][]) {
      c.poly([[x - w, 44], [x - w + tilt * 0.4, 44 - h * 0.8], [x + tilt, 44 - h], [x + w + tilt * 0.4, 44 - h * 0.8], [x + w, 44]], crystalMat('#b47aff'));
      c.poly([[x - w * 0.4, 43], [x + tilt * 0.8, 44 - h * 0.95], [x + w * 0.2 + tilt * 0.4, 44 - h * 0.7], [x, 43]], crystalMat('#e0c8ff'), { bias: 1 });
    }
    frames.push(c.render({ glowK: 0.8, sweep: f / 3 * 2 - 0.5, shadow: [16, 44, 12, 2] }));
  }
  return { name: 'cristales', w: 32, h: 48, anchor: [16, 45], solid: [-10, -4, 20, 4], anims: { idle: { frames, fps: 4, loop: true } }, light: { color: '#b47aff', radius: 80, pulse: true, dy: 16 } };
}

// ---------- ruinas del Viejo Reino ----------

const RUIN = '#a8a2a0';

export function pillar(broken = false): WorldObject {
  const H = broken ? 64 : 96;
  const c = canvas(32, H, 1);
  const top = broken ? 18 : 8;
  c.poly([[5, H - 4], [5, H - 9], [27, H - 9], [27, H - 4]], stone(RUIN)); // base
  c.poly([[8, H - 9], [8, top + 6], [24, top + 6], [24, H - 9]], stone(RUIN));
  for (const x of [11, 16, 21]) c.px1([x, top + 7], [x, H - 10], stone(RUIN), { tone: 1 }, true); // estrías
  if (broken) {
    c.poly([[8, top + 6], [11, top + 2], [14, top + 5], [18, top], [21, top + 4], [24, top + 6]], stone(RUIN), { bias: 1 });
    for (const [x, y, s] of [[3, H - 3, 2.2], [28, H - 2.5, 1.8], [24, H - 1.5, 1.4]] as [number, number, number][]) c.ellipse([x, y], s, s * 0.7, stone(RUIN));
  } else {
    c.poly([[5, top + 6], [5, top + 1], [27, top + 1], [27, top + 6]], stone(RUIN), { bias: 1 }); // capitel
    c.poly([[7, top + 1], [8, top - 2], [24, top - 2], [25, top + 1]], stone(RUIN), { bias: 1 });
  }
  // grieta y hiedra
  c.line([19, top + 14], [16, top + 24], 0.6, stone('#4a4652'), { tone: 0 });
  for (let i = 0; i < 6; i++) c.ellipse([9 + (i % 2) * 1.6, H - 12 - i * 5], 1.6, 1.2, leaf(i % 2 ? '#4f8f34' : '#5f9e3c'));
  return { name: broken ? 'pilar_roto' : 'pilar', w: 32, h: H, anchor: [16, H - 4], solid: [-11, -6, 22, 6], anims: one(c.render({ shadow: [16, H - 4, 12, 2] })) };
}

export function ruinWall(): WorldObject {
  const c = canvas(96, 64, 3); // 32 x 21.3
  const r = seeded(91);
  // contorno quebrado arriba
  const tops = [9, 7, 8, 5, 6, 9, 11, 10, 8, 12];
  for (let i = 0; i < 10; i++) {
    const x = 1.5 + i * 2.9, t = tops[i];
    for (let y = t; y < 19; y += 2.4) {
      const off = (Math.floor((y - t) / 2.4) % 2) * 1.4;
      c.poly([[x + off * 0.3, y], [x + 2.8, y], [x + 2.8, y + 2.3], [x + off * 0.3, y + 2.3]], stone(r() > 0.5 ? RUIN : '#98928e'), { bias: y === t ? 1 : 0 });
    }
  }
  for (let i = 0; i < 8; i++) c.ellipse([3 + r() * 26, 8 + r() * 10], 1.6, 1.1, leaf(i % 2 ? '#4f8f34' : '#5f9e3c'));
  return { name: 'muro_ruina', w: 96, h: 64, anchor: [48, 58], solid: [-44, -10, 88, 10], anims: one(c.render({ shadow: [16, 19.4, 15, 1.4] })) };
}

/** Arco de piedra: se pasa por debajo (solo las patas son sólidas). */
export function ruinArch(): WorldObject {
  const c = canvas(128, 128, 4); // 32 x 32
  for (const x of [4, 24]) {
    c.poly([[x, 30], [x, 9], [x + 4, 9], [x + 4, 30]], stone(RUIN));
    c.poly([[x - 1, 31], [x - 1, 28.5], [x + 5, 28.5], [x + 5, 31]], stone(RUIN), { bias: 1 });
  }
  c.ring([16, 10], 12, 7.6, 3.6, stone(RUIN), {}, 180, 360);
  // piedra clave rota y faltante a la derecha
  c.erase([[24, 0], [32, 0], [32, 6], [26, 7]]);
  c.poly([[14.4, 1.4], [17.6, 1.4], [17, 4.6], [15, 4.6]], stone('#c8c0b8'), { bias: 1 });
  for (let i = 0; i < 7; i++) c.ellipse([5 + (i % 2), 12 + i * 2.6], 1.4, 1, leaf('#4f8f34'));
  c.ellipse([9, 3.6], 2.4, 1.2, leaf('#5f9e3c'));
  return { name: 'arco_ruina', w: 128, h: 128, anchor: [64, 122], solid: null, solids: [[-52, -8, 22, 8], [28, -8, 22, 8]], anims: one(c.render({ shadow: [16, 30.8, 14, 1.2] })) };
}

export function well(): WorldObject {
  const c = canvas(48, 64, 1.5); // 32 x 42.7
  c.poly([[5, 38], [5, 29], [27, 29], [27, 38]], stone(RUIN));
  c.ellipse([16, 29], 11, 4.2, stone(RUIN), { bias: 1 });
  c.ellipse([16, 29], 8, 2.8, stone('#0e2a4a'), { tone: 0 });
  c.ellipse([16, 29.6], 5, 1.4, stone('#2a66ad'), { tone: 2 });
  for (const x of [6, 26]) c.poly([[x - 1, 30], [x - 1, 12], [x + 1, 12], [x + 1, 30]], wood('#7a5232'));
  c.poly([[2, 13], [16, 5], [30, 13], [27, 14.4], [16, 8], [5, 14.4]], wood('#9a3a2a'), { bias: 1 }); // techito
  c.line([6, 17], [26, 17], 0.8, wood('#5a3a22'));
  c.line([16, 17], [16, 24], 0.4, clothMat('#efe8d6'));
  c.poly([[14.6, 24], [17.4, 24], [17, 27], [15, 27]], wood('#8a5a32'));
  return { name: 'pozo', w: 48, h: 64, anchor: [24, 58], solid: [-17, -10, 34, 10], anims: one(c.render({ shadow: [16, 38.4, 13, 2] })) };
}

/** Estatua de Thor sentado sobre su pedestal: el guardián del Viejo Reino. */
export function thorStatue(): WorldObject {
  const W = 96, H = 150;
  const out = createRaster(W, H);
  // pedestal (más bajo: el protagonista es Thor)
  const ped = canvas(96, 150, 3); // 32 x 50
  ped.poly([[5, 48.6], [5, 36.6], [27, 36.6], [27, 48.6]], stone(RUIN));
  ped.poly([[3, 37.1], [3, 34.1], [29, 34.1], [29, 37.1]], stone(RUIN), { bias: 1 });
  ped.poly([[3, 49.6], [3, 47.1], [29, 47.1], [29, 49.6]], stone(RUIN));
  ped.poly([[9, 45.6], [9, 39.0], [23, 39.0], [23, 45.6]], metalMat('#c8a050')); // placa
  for (const x of [11.5, 14, 16.5, 19, 21]) ped.px1([x, 40.6], [x, 44.0], metalMat('#6a4a1a'), { tone: 1 }, true);
  for (let i = 0; i < 5; i++) ped.ellipse([4.6 + (i % 2), 47.6 - i * 2.4], 1.2, 0.9, leaf('#4f8f34'));
  over(out, ped.render({ shadow: [16, 49.2, 15, 1.6] }), 0, 0);
  // Thor sentado de 3/4, convertido en piedra y al doble de tamaño (una estatua grande se ve robusta)
  const clip = renderClip(thorFicha(0), 64, 'sit', 'se');
  const t = clip.frames[0];
  const ramp = ['#3a3640', '#5e5862', '#7e7880', '#9e9898', '#bdb6b2', '#dcd6cc'];
  let x0 = t.w, y0 = t.h, x1 = 0, y1 = 0;
  for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) if (t.data[(y * t.w + x) * 4 + 3]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const sw = (x1 - x0 + 1) * 2, sh = (y1 - y0 + 1) * 2;
  const st = createRaster(sw, sh);
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    const i = ((y0 + (y >> 1)) * t.w + x0 + (x >> 1)) * 4;
    if (!t.data[i + 3]) continue;
    const l = (t.data[i] * 0.3 + t.data[i + 1] * 0.59 + t.data[i + 2] * 0.11) / 255;
    const [R, G, B] = rgb(ramp[Math.max(0, Math.min(5, Math.round(l * 6 - 0.2)))]);
    const k = (y * sw + x) * 4;
    st.data[k] = R; st.data[k + 1] = G; st.data[k + 2] = B; st.data[k + 3] = 255;
  }
  over(out, st, Math.round(W / 2 - sw / 2), Math.round((38.5 - 4.4) * 3) - sh + 3);
  return { name: 'estatua_thor', w: W, h: H, anchor: [48, 146], solid: [-40, -14, 80, 14], anims: one(out) };
}

// ---------- campamentos y granja ----------

export function tent(kind: 'goblin' | 'familia'): WorldObject {
  const c = canvas(64, 64, 2); // 32 x 32
  const a = kind === 'goblin' ? '#7a6a3a' : '#3a6ad8', b = kind === 'goblin' ? '#5a6a2e' : '#f2f2f2';
  // techo de lado (se ve a la derecha) y frente triangular
  c.poly([[16, 5], [29, 22], [29, 28], [21, 28]], clothMat(a), { bias: -1 });
  c.poly([[16, 5], [4, 28], [21, 28]], clothMat(a), { bias: 0 });
  if (kind === 'familia') for (let i = 0; i < 3; i++) c.poly([[16, 5], [6 + i * 6, 28], [9 + i * 6, 28]], clothMat(b));
  else { c.poly([[8, 22], [11, 21], [11.5, 24], [8.4, 24.6]], clothMat(b)); c.poly([[22, 14], [25, 16], [24, 18.4], [21.6, 16.6]], clothMat('#8a3a2a')); }
  c.poly([[16, 13], [11.5, 28], [20.5, 28]], clothMat('#1a1418'), { tone: 0 }); // entrada
  c.line([16, 5], [16, 2.4], 0.7, wood('#5a3a22'));
  if (kind === 'familia') c.poly([[16.4, 2.4], [20, 3.4], [16.4, 4.4]], clothMat('#e2363e'));
  return { name: `carpa_${kind}`, w: 64, h: 64, anchor: [32, 58], solid: [-24, -10, 48, 10], anims: one(c.render({ shadow: [16, 28.6, 14, 1.8] })) };
}

export function palisade(): WorldObject {
  const c = canvas(32, 48, 1);
  for (const [x, h] of [[6, 36], [13, 40], [20, 35], [27, 38]] as P[]) {
    c.poly([[x - 3, 44], [x - 3, 44 - h + 6], [x, 44 - h], [x + 3, 44 - h + 6], [x + 3, 44]], wood('#7a5232'));
    c.px1([x - 1, 44 - h + 8], [x - 1, 42], wood('#7a5232'), { tone: 1 }, true);
  }
  c.line([2, 30], [30, 31], 0.8, clothMat('#c8b890'));
  return { name: 'empalizada', w: 32, h: 48, anchor: [16, 44], solid: [-16, -6, 32, 6], anims: one(c.render({ shadow: [16, 44, 15, 1.6] })) };
}

export function goblinBanner(): WorldObject {
  const frames: Raster[] = [];
  for (let f = 0; f < 4; f++) {
    const c = canvas(32, 80, 1);
    c.poly([[9, 76], [9, 6], [11, 6], [11, 76]], wood('#5a3a22'));
    const w = [0, 1, 2, 1][f];
    c.poly([[11, 9], [27 + w, 10 + w * 0.5], [25 + w, 20], [28 + w * 0.6, 32], [19, 28 + w], [11, 33]], clothMat('#a8242c'));
    c.ellipse([18.5 + w * 0.5, 18], 3.2, 3, clothMat('#e4d6b4'));
    c.circle([17.4 + w * 0.5, 17.4], 0.8, clothMat('#2a1a1a'), { tone: 0 }); c.circle([19.8 + w * 0.5, 17.4], 0.8, clothMat('#2a1a1a'), { tone: 0 });
    c.poly([[8, 6], [12, 6], [10, 2]], metalMat('#7d838c'));
    frames.push(c.render({ shadow: [10, 76, 5, 1.4] }));
  }
  return { name: 'estandarte_goblin', w: 32, h: 80, anchor: [10, 76], solid: [-3, -3, 6, 3], anims: { idle: { frames, fps: 6, loop: true } } };
}

export function scarecrow(): WorldObject {
  const c = canvas(32, 64, 1);
  c.poly([[15, 60], [15, 14], [17, 14], [17, 60]], wood('#7a5232'));
  c.poly([[4, 26], [28, 26], [28, 28], [4, 28]], wood('#7a5232'));
  c.poly([[9, 26], [23, 26], [22, 42], [10, 42]], clothMat('#4a7ab8'));
  c.poly([[11, 30], [14, 30], [14, 33], [11, 33]], clothMat('#c8643a'));
  for (const x of [5, 27]) c.poly([[x - 1.6, 27], [x + 1.6, 27], [x + 0.8, 31], [x - 0.8, 31]], clothMat('#e8c870'));
  c.ellipse([16, 19], 5.4, 5.4, clothMat('#d8c090'));
  c.circle([14, 18.4], 0.9, clothMat('#2a1a1a'), { tone: 0 }); c.circle([18, 18.4], 0.9, clothMat('#2a1a1a'), { tone: 0 });
  c.ring([16, 20.4], 2, 1, 0.4, clothMat('#2a1a1a'), { tone: 0 }, 0, 180);
  c.poly([[8, 15], [24, 15], [21, 13], [11, 13]], clothMat('#c8a050')); c.poly([[12, 13], [20, 13], [18, 8.6], [14, 8.6]], clothMat('#c8a050'), { bias: 1 });
  return { name: 'espantapajaros', w: 32, h: 64, anchor: [16, 60], solid: [-3, -3, 6, 3], anims: one(c.render({ shadow: [16, 60, 7, 1.4] })) };
}

export function pumpkins(): WorldObject {
  const c = canvas(32, 32, 1);
  for (const [x, y, s] of [[11, 22, 1], [21, 23, 1.2], [16, 17, 0.8]] as [number, number, number][]) {
    c.ellipse([x, y], 5.4 * s, 4.2 * s, clothMat('#e8822a'));
    for (const dx of [-2.4, 0, 2.4]) c.px1([x + dx * s, y - 3.4 * s], [x + dx * s, y + 3.4 * s], clothMat('#e8822a'), { tone: 1 }, true);
    c.poly([[x - 0.6, y - 4 * s], [x + 0.8, y - 4 * s], [x + 1.2, y - 6 * s], [x, y - 6.4 * s]], leaf('#4f8f34'));
  }
  c.line([5, 18], [9, 14], 0.6, leaf('#4f8f34'));
  return { name: 'calabazas_deco', w: 32, h: 32, anchor: [16, 28], solid: [-11, -6, 22, 6], anims: one(c.render({ shadow: [16, 27, 12, 2] })) };
}

export function lantern(): WorldObject {
  const frames: Raster[] = [];
  for (let f = 0; f < 4; f++) {
    const c = canvas(24, 56, 0.75); // 32 x 74.7
    c.poly([[14.6, 72], [14.6, 14], [17.4, 14], [17.4, 72]], wood('#5a3a22'));
    c.poly([[17, 14], [26, 14], [26, 16], [17, 16]], wood('#5a3a22'));
    c.line([24, 16], [24, 19], 0.5, metalMat('#5a5f68'));
    c.poly([[20, 20], [28, 20], [27, 32], [21, 32]], metalMat('#3a3d44'));
    c.poly([[21.6, 21.6], [26.4, 21.6], [25.8, 30.4], [22.2, 30.4]], glowMat(['#ffd27a', '#ffe08a', '#ffc860', '#ffe8a0'][f]), { tone: 4 });
    c.poly([[19, 20], [29, 20], [24, 16.4]], metalMat('#3a3d44'), { bias: 1 });
    frames.push(c.render({ glowK: [0.8, 1, 0.75, 0.95][f], shadow: [16, 72, 5, 1.6] }));
  }
  return { name: 'farol', w: 24, h: 56, anchor: [12, 54], solid: [-2, -2, 4, 2], anims: { idle: { frames, fps: 6, loop: true } }, light: { color: '#ffd27a', radius: 100, flicker: true, dy: 36 } };
}

/** Todos los objetos nuevos del mundo grande. */
export function landmarkObjects(): WorldObject[] {
  return [
    bridge(), fordStone(0), fordStone(1), lilyPad(false), lilyPad(true), reeds(), waterfall(),
    fallenLog(), willow(), grandOak(), glowShroom('azul'), glowShroom('morado'), fairyRing(), crystals(),
    pillar(false), pillar(true), ruinWall(), ruinArch(), well(), thorStatue(),
    tent('goblin'), tent('familia'), palisade(), goblinBanner(), scarecrow(), pumpkins(), lantern(),
  ];
}
