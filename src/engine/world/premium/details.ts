import { createRaster, type Raster } from '../../core/raster';
import { over } from '../../loot/canvas';
import { drawCanopy, drawBranches, swayFrames, RAMPS, type Puff } from '../flora';
import type { WorldObject } from '../objects';

/**
 * Detalles premium del suelo y del primer plano para el Bosque:
 * - Calcomanías (`capa: suelo`, sin sólido, un cuadro): hojas caídas, raíces, grietas, charquitos, flores y piedritas.
 *   Rompen el pasto parejo y llevan su luz de arriba a la izquierda y su oclusión pegada al piso.
 * - Grupos armados como un solo objeto (un punto focal de una vez): tronco caído con hongos y flores, rocas con musgo
 *   y helechos, raíces grandes que salen del suelo y un arbusto con flores.
 * - Primer plano (`capa: frente`): ramas que cuelgan desde arriba y hojas desde abajo, oscuras y con viento. El juego
 *   las dibuja encima de todo con paralaje y las transparenta si la heroína queda detrás.
 */

type RGB = [number, number, number];
const hx = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function hash(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function put(r: Raster, x: number, y: number, hex: string, a = 255) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= r.w || y >= r.h) return;
  const [R, G, B] = hx(hex), i = (y * r.w + x) * 4;
  if (a < 255 && r.data[i + 3]) { const t = a / 255; r.data[i] = r.data[i] * (1 - t) + R * t; r.data[i + 1] = r.data[i + 1] * (1 - t) + G * t; r.data[i + 2] = r.data[i + 2] * (1 - t) + B * t; return; }
  r.data[i] = R; r.data[i + 1] = G; r.data[i + 2] = B; r.data[i + 3] = a;
}
const one = (frame: Raster, fps = 1) => ({ idle: { frames: [frame], fps, loop: true } });

// rampas del suelo del bosque (sombra fría, luz cálida)
const LEAF = [['#3a2016', '#5e3a20', '#7a4a26', '#9a6a34'], ['#2e1c16', '#4a2e1a', '#6a4426', '#8e6a34'], ['#3a2a14', '#5e4a20', '#8a6e2e', '#b0923e']];
const ROOT = ['#120e10', '#1e1716', '#2c211c', '#3c2d24', '#4e3c2e', '#634d38'];
const STONE = ['#16151c', '#272630', '#3c3b47', '#585666', '#706e7c'];
const MOSS = ['#16241c', '#22362a', '#2e4a34', '#3e5e3c', '#527448'];
const FLOW = ['#c8b84a', '#b06a9a', '#cfd2e4', '#7a8ee0', '#c87a5a', '#9a7ad8'];

/** Hojas caídas: 6 a 10 hojitas de dos tonos con su sombra fría abajo a la derecha. */
function fallenLeaves(v: number): WorldObject {
  const W = 32, H = 20, r = createRaster(W, H);
  const n = 6 + Math.floor(hash(v, 1, 11) * 5);
  for (let i = 0; i < n; i++) {
    const x = 3 + hash(i, v, 12) * (W - 7), y = 3 + hash(v, i, 13) * (H - 7), pal = LEAF[Math.floor(hash(i, v, 14) * 3)];
    const ang = hash(i, v, 15) * Math.PI;
    for (let k = -2; k <= 2; k++) {
      const px = x + Math.cos(ang) * k, py = y + Math.sin(ang) * k * 0.6;
      put(r, px + 1, py + 1, '#0a1210', 90);
      put(r, px, py, pal[k < 0 ? 3 : k === 0 ? 2 : 1]);
      if (Math.abs(k) < 2) put(r, px, py - 1, pal[k < 0 ? 2 : 1]);
    }
  }
  return { name: `hojas_caidas_${v}`, w: W, h: H, anchor: [16, 10], solid: null, layer: 'suelo', anims: one(r) };
}

/** Raíz que asoma del suelo: una curva gruesa con luz arriba y oclusión abajo. */
function groundRoot(v: number): WorldObject {
  const W = 44, H = 24, r = createRaster(W, H);
  const pts: [number, number, number][] = [];
  let x = 3, y = 12 + (hash(v, 1, 21) - 0.5) * 6, w = 4.2;
  for (let i = 0; i < 38; i++) {
    x += 1; y += (hash(i, v, 22) - 0.5) * 1.4 + Math.sin(i / 6 + v) * 0.35; w = Math.max(1.2, w - 0.08);
    pts.push([x, y, w]);
    if (i === 14 || i === 24) for (let j = 0; j < 8; j++) pts.push([x + j, y + (i === 14 ? -1 : 1) * j * 0.6, Math.max(1, w * 0.6 - j * 0.15)]);
  }
  // oclusión: franja oscura debajo de la raíz, donde toca la tierra
  for (const [px, py, pw] of pts) for (let k = 0; k <= 2; k++) put(r, px, py + pw / 2 + k, '#0a0e0c', 140 - k * 40);
  for (const [px, py, pw] of pts) for (let d = -pw / 2; d <= pw / 2; d += 0.5) put(r, px, py + d, ROOT[Math.max(1, Math.min(5, Math.round(3.6 - (d / pw) * 3.2)))]);
  for (const [px, py, pw] of pts) put(r, px, py - pw / 2 - 0.5, ROOT[0]);
  return { name: `raiz_suelo_${v}`, w: W, h: H, anchor: [22, 12], solid: null, layer: 'suelo', anims: one(r) };
}

/** Grieta en el suelo: línea quebrada oscura con el borde de abajo apenas más claro. */
function crack(v: number): WorldObject {
  const W = 34, H = 16, r = createRaster(W, H);
  let x = 2, y = 8 + (hash(v, 0, 31) - 0.5) * 4;
  const path: [number, number][] = [];
  while (x < W - 3) { x += 1; y += (hash(Math.floor(x), v, 32) - 0.5) * 1.6; y = Math.max(3, Math.min(H - 4, y)); path.push([x, y]); }
  for (const [px, py] of path) { put(r, px, py, '#0c0f0e'); put(r, px, py + 1, '#3a4a3a', 160); }
  for (const b of [0.35, 0.65]) { const [bx, by] = path[Math.floor(path.length * b)]; for (let k = 1; k < 6; k++) put(r, bx + k * 0.6, by + (v % 2 ? k : -k) * 0.7, '#0c0f0e'); }
  return { name: `grieta_${v}`, w: W, h: H, anchor: [17, 8], solid: null, layer: 'suelo', anims: one(r) };
}

/** Charquito: agua oscura con reflejo del cielo y orilla de tierra mojada. */
function puddle(v: number): WorldObject {
  const W = 32, H = 18, r = createRaster(W, H), cx = 16, cy = 9, rx = 12 + v * 2, ry = 5 + v;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + (hash(x, y, 41 + v) - 0.5) * 0.12;
    if (d > 1.25) continue;
    if (d > 1) put(r, x, y, '#141812', 200); // tierra mojada
    else if (d > 0.82) put(r, x, y, y < cy ? '#1c2a30' : '#0e161c');
    else put(r, x, y, y < cy - 1 ? '#3a5262' : '#1a2a36');
  }
  for (let k = -3; k <= 2; k++) put(r, cx - 3 + k, cy - 2, '#8aa8b8'); // reflejo
  put(r, cx + 4, cy + 1, '#5a7a8a');
  return { name: `charco_chico_${v}`, w: W, h: H, anchor: [16, 9], solid: null, layer: 'suelo', anims: one(r) };
}

/** Florcitas a ras del suelo, un color por ramito. */
function groundFlowers(v: number): WorldObject {
  const W = 26, H = 18, r = createRaster(W, H);
  const col = FLOW[v % FLOW.length];
  for (let i = 0; i < 5 + v; i++) {
    const x = 4 + hash(i, v, 51) * 18, y = 4 + hash(v, i, 52) * 10;
    put(r, x, y + 2, '#1f352c'); put(r, x, y + 1, '#2c4a36');
    put(r, x - 1, y, col); put(r, x + 1, y, col); put(r, x, y - 1, col); put(r, x, y + 1, '#1f352c');
    put(r, x, y, '#fff2a0');
  }
  return { name: `flores_suelo_${v}`, w: W, h: H, anchor: [13, 9], solid: null, layer: 'suelo', anims: one(r) };
}

/** Piedritas con luz arriba a la izquierda y sombra de contacto. */
function pebbles(v: number): WorldObject {
  const W = 26, H = 16, r = createRaster(W, H);
  for (let i = 0; i < 3 + v; i++) {
    const x = 4 + hash(i, v, 61) * 17, y = 4 + hash(v, i, 62) * 8, rr = 1.2 + hash(i, v, 63) * 1.8;
    for (let dy = -rr - 1; dy <= rr + 1; dy++) for (let dx = -rr - 1; dx <= rr + 1; dx++) {
      const d = (dx * dx) / (rr * rr) + (dy * dy) / (rr * rr * 0.7);
      if (d > 1) { if (d < 1.6 && dy > 0) put(r, x + dx + 1, y + dy, '#0a0e0c', 110); continue; }
      put(r, x + dx, y + dy, STONE[dx + dy < -rr * 0.6 ? 4 : dx + dy > rr * 0.6 ? 1 : 2]);
    }
  }
  return { name: `piedritas_${v}`, w: W, h: H, anchor: [13, 8], solid: null, layer: 'suelo', anims: one(r) };
}

/** Las calcomanías del Bosque. */
export function forestDecals(): WorldObject[] {
  return [
    ...[0, 1, 2, 3].map(fallenLeaves), ...[0, 1, 2].map(groundRoot), ...[0, 1, 2].map(crack),
    ...[0, 1].map(puddle), ...[0, 1, 2, 3].map(groundFlowers), ...[0, 1, 2].map(pebbles),
  ];
}

// ---------- grupos armados ----------

/** Arma un objeto pegando otros (cada uno en su posición respecto del apoyo del grupo). */
function compose(name: string, W: number, H: number, anchor: [number, number], parts: { o: WorldObject; x: number; y: number }[], solid: [number, number, number, number] | null): WorldObject {
  const r = createRaster(W, H);
  for (const p of [...parts].sort((a, b) => a.y - b.y)) {
    const fr = (p.o.anims.idle ?? Object.values(p.o.anims)[0]).frames[0];
    over(r, fr, Math.round(anchor[0] + p.x - p.o.anchor[0]), Math.round(anchor[1] + p.y - p.o.anchor[1]));
  }
  return { name, w: W, h: H, anchor, solid, anims: one(r) };
}

/** Helecho: hojas largas en abanico, luz arriba a la izquierda. */
function fern(v: number): WorldObject {
  const W = 28, H = 22, r = createRaster(W, H), cx = 14, base = 20;
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI / 2 + (k - 3) * 0.42 + (hash(k, v, 71) - 0.5) * 0.2, len = 9 + hash(v, k, 72) * 5;
    for (let s = 0; s < len; s++) {
      const x = cx + Math.cos(a) * s, y = base + Math.sin(a) * s + (s * s) / (len * 2.6);
      const t = s / len;
      put(r, x, y, MOSS[a < -Math.PI / 2 ? 4 : 3 - Math.round(t)]);
      if (s % 2 === 0 && s > 2) { put(r, x - 1, y + 1, MOSS[2]); put(r, x + 1, y + 1, MOSS[1]); }
    }
  }
  return { name: 'helecho', w: W, h: H, anchor: [cx, base], solid: null, anims: one(r) };
}

/** Raíces grandes que salen del suelo (de un árbol que ya no está): sólidas en el centro. */
function exposedRoots(): WorldObject {
  const W = 96, H = 52, r = createRaster(W, H);
  const roots = [
    { x: 46, y: 34, a: Math.PI + 0.25, len: 30, w: 8, depth: 2 },
    { x: 50, y: 34, a: -0.2, len: 34, w: 9, depth: 2 },
    { x: 48, y: 36, a: Math.PI / 2 + 0.3, len: 10, w: 7, depth: 1 },
    { x: 48, y: 30, a: -Math.PI / 2 - 0.4, len: 14, w: 8, depth: 1 },
  ];
  // oclusión debajo y alrededor de la base
  for (let y = 26; y < 50; y++) for (let x = 14; x < 86; x++) { const d = ((x - 48) / 36) ** 2 + ((y - 38) / 9) ** 2; if (d < 1) put(r, x, y, '#0a0e0c', d < 0.5 ? 120 : 70); }
  drawBranches(r, roots, RAMPS.corteza, 9001, 0, H);
  // musgo arriba de las raíces (donde llega la humedad: del lado de la sombra, abajo a la derecha, más)
  for (let i = 0; i < 40; i++) { const x = 30 + hash(i, 1, 81) * 40, y = 24 + hash(i, 2, 81) * 18; if (r.data[(Math.round(y) * W + Math.round(x)) * 4 + 3]) put(r, x, y, MOSS[2 + Math.floor(hash(i, 3, 81) * 2)]); }
  return { name: 'raices_expuestas', w: W, h: H, anchor: [48, 40], solid: [-14, -8, 28, 8], anims: one(r) };
}

/** Los cuatro grupos (necesitan los objetos sueltos que ya existen). */
export function forestGroups(existing: Map<string, WorldObject>): WorldObject[] {
  const g = (n: string) => { const o = existing.get(n); if (!o) throw new Error(`falta ${n} para armar un grupo`); return o; };
  const f0 = fern(0), f1 = fern(1);
  return [
    compose('claro_tronco_hongos', 128, 64, [64, 50], [
      { o: g('tronco_caido'), x: 0, y: 0 }, { o: g('hongos'), x: -30, y: -6 }, { o: g('hongos'), x: 26, y: -4 },
      { o: g('flores_grandes_1'), x: -46, y: 8 }, { o: f0, x: 44, y: 6 }, { o: g('hongos'), x: 6, y: 10 },
    ], [-44, -12, 88, 12]),
    compose('rocas_musgo_grupo', 96, 64, [48, 52], [
      { o: g('roca_grande'), x: -4, y: -2 }, { o: g('roca'), x: 22, y: 6 }, { o: g('roca'), x: -26, y: 8 },
      { o: f0, x: -14, y: 10 }, { o: f1, x: 16, y: -10 }, { o: f1, x: 30, y: 10 },
    ], [-30, -10, 60, 12]),
    exposedRoots(),
    compose('arbusto_flores_grupo', 96, 64, [48, 52], [
      { o: g('arbusto_verde_0'), x: -10, y: -2 }, { o: g('arbusto_verde_1'), x: 14, y: 2 },
      { o: g('flores_grandes_0'), x: -30, y: 8 }, { o: g('flores_grandes_2'), x: 28, y: 9 }, { o: f0, x: 0, y: 10 },
    ], [-24, -6, 48, 8]),
    f0, f1,
  ];
}

// ---------- primer plano ----------

/** Ramas que cuelgan desde el borde de arriba (256 x 96), 9 cuadros de viento. Oscuras: están cerca y en sombra. */
function frontBranches(v: number): WorldObject {
  const W = 256, H = 96, seed = 12000 + v * 77;
  const sws = swayFrames(2.2);
  const dark = RAMPS.roble.slice(0, 5);
  const frames = sws.map((sw) => {
    const r = createRaster(W, H);
    const roots = [
      { x: 20 + v * 30, y: -2, a: Math.PI / 2 - 0.5, len: 70, w: 10, depth: 3 },
      { x: 150 + v * 20, y: -2, a: Math.PI / 2 + 0.7, len: 60, w: 9, depth: 3 },
    ];
    drawBranches(r, roots, RAMPS.corteza.slice(0, 5), seed, sw * 0.5, H);
    const puffs: Puff[] = [];
    for (let i = 0; i < 14; i++) {
      const x = 10 + hash(i, v, 91) * (W - 20), y = 6 + hash(v, i, 92) * 48 * (1 - Math.abs(x - W / 2) / W);
      puffs.push({ x: x + sw * (y / H), y, r: 9 + hash(i, v, 93) * 9 });
    }
    drawCanopy(r, puffs, dark, seed, 0, 6);
    return r;
  });
  return { name: `frente_ramas_${v}`, w: W, h: H, anchor: [W / 2, 0], solid: null, layer: 'frente', anims: { idle: { frames, fps: 5, loop: true } } };
}

/** Hojas desde el borde de abajo (128 x 64). */
function frontLeaves(v: number): WorldObject {
  const W = 128, H = 64, seed = 13000 + v * 51;
  const sws = swayFrames(1.6);
  const frames = sws.map((sw) => {
    const r = createRaster(W, H);
    const puffs: Puff[] = [];
    for (let i = 0; i < 9; i++) {
      const x = 8 + hash(i, v, 95) * (W - 16), y = H - 6 - hash(v, i, 96) * 26;
      puffs.push({ x: x + sw * ((H - y) / H), y, r: 10 + hash(i, v, 97) * 8 });
    }
    drawCanopy(r, puffs, RAMPS.arbusto.slice(0, 5), seed, 0, 5);
    return r;
  });
  return { name: `frente_hojas_${v}`, w: W, h: H, anchor: [W / 2, H], solid: null, layer: 'frente', anims: { idle: { frames, fps: 5, loop: true } } };
}

export function forestFront(): WorldObject[] {
  return [frontBranches(0), frontBranches(1), frontBranches(2), frontLeaves(0), frontLeaves(1)];
}
