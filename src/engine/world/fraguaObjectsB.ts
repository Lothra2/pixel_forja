import { createRaster, type Raster } from '../core/raster';
import type { WorldObject } from './objects';
import { hash, put, glow, tone, outline } from './puertoObjects';
import { FRAGUA, LUCES, LUZ_IDS, type LuzId, mixC, warmRim, ashDust, chainLinks, one, grounded, ellipse, line } from './fraguaObjects';

/**
 * Mundo 6, parte 2 (segunda mitad): el primer plano (cadenas, jaulas y humo que se mecen delante de la cámara), el
 * fondo lejano, el Bosque de Ceniza, la utilería de la fragua, el mural 6, la Ladrona cargando jaulas, las
 * calcomanías, la partícula de brasas y la lava (la hoja de la capa agua, viva y apagada).
 */

const R = FRAGUA.roca, O = FRAGUA.obsidiana, L = FRAGUA.lava, I = FRAGUA.hierro, C = FRAGUA.carbon, M = FRAGUA.madera;

// ---------------------------------------------------------------- primer plano (capa frente)

/** Cadenas colgantes (128 x 128, 4 cuadros a 3 fps): cadenas gruesas que bajan del techo y se mecen, oscuras con el filo naranja. */
function hangingChains(v: number): WorldObject {
  const frames = [0, 1, 2, 3].map((f) => {
    const r = createRaster(128, 128);
    const n = 2 + v;
    for (let k = 0; k < n; k++) {
      const x0 = 14 + k * (100 / n) + hash(k, v, 501) * 14, len = 60 + hash(v, k, 502) * 60;
      const sw = Math.sin((f / 4) * Math.PI * 2 + k * 1.7) * (3 + k);
      chainLinks(r, x0, 0, x0 + sw, len, 7 + (k % 2) * 2, 0.55);
      // un gancho al final de alguna
      if ((k + v) % 2 === 0) for (let t = 0; t < Math.PI * 1.3; t += 0.08) for (let q = 0; q < 3; q++) put(r, x0 + sw + Math.sin(t) * (8 + q), len + 8 + (1 - Math.cos(t)) * (8 + q), q ? I[2] : I[3]);
    }
    outline(r, '#050303');
    return r;
  });
  return { name: `cadena_colgante_${v}`, w: 128, h: 128, anchor: [64, 0], solid: null, layer: 'frente', anims: { idle: { frames, fps: 3, loop: true } } };
}

/** Jaulas de frente (128 x 128, 4 cuadros a 3 fps): siluetas grandes de jaulas colgando cerca de la cámara, con su luz adentro. */
function frontCages(v: number): WorldObject {
  const frames = [0, 1, 2, 3].map((f) => {
    const r = createRaster(128, 128);
    const cages = v ? [[34, 76, 'faro'], [96, 40, 'galerias']] : [[48, 50, 'bosque'], [104, 90, 'ciudad']];
    for (const [k, [x0, len, luz]] of cages.entries()) {
      const sw = Math.sin((f / 4) * Math.PI * 2 + k * 2.1) * 2.5, X = (x0 as number) + sw, Y = len as number;
      chainLinks(r, x0 as number, 0, X, Y - 26, 5, 0.4);
      const c = LUCES[luz as LuzId];
      // la jaula: cúpula y barrotes en silueta, con la luz que se ve entre los barrotes
      for (let y = Y - 20; y < Y + 32; y++) for (let x = X - 18; x <= X + 18; x++) {
        const d = Math.hypot((x - X) / 18, (y - Y - 6) / 26);
        const inside = y > Y - 10 ? Math.abs(x - X) < 18 : Math.hypot(x - X, (y - (Y - 10)) * 1.8) < 18;
        if (!inside) continue;
        const bar = Math.round(x - X + 18) % 6 < 2 || Math.abs(y - (Y - 10)) < 2 || y >= Y + 29 || Math.abs(y - (Y + 10)) < 1;
        put(r, x, y, bar ? '#120a08' : mixC('#1a0c08', c, Math.max(0, 1 - d) * 0.9), bar ? 255 : 220);
      }
      glow(r, X, Y + 6, 30, c, 1.1);
    }
    return r;
  });
  return { name: `jaulas_frente_${v}`, w: 128, h: 128, anchor: [64, 0], solid: null, layer: 'frente', anims: { idle: { frames, fps: 3, loop: true } } };
}

/** Humo de frente (128 x 128, 4 cuadros a 4 fps): jirones de humo oscuro que pasan con brasas que suben. */
function frontSmoke(v: number): WorldObject {
  const frames = [0, 1, 2, 3].map((f) => {
    const r = createRaster(128, 128);
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      const n = Math.sin(x * 0.05 + y * 0.03 + f * 0.4 + v) * 0.5 + Math.sin(x * 0.11 - y * 0.07 - f * 0.6) * 0.3 + Math.sin(y * 0.09 + v * 3) * 0.2;
      const band = 1 - Math.abs(y - (v ? 84 : 52) - Math.sin(x * 0.04 + f * 0.5) * 12) / 34;
      const a = Math.max(0, n * 0.6 + band * 0.8 - 0.35);
      if (a > 0.05) put(r, x, y, a > 0.5 ? '#3a2c28' : '#241a16', Math.round(Math.min(1, a * 1.3) * 215));
    }
    for (let i = 0; i < 12; i++) { const x = hash(i, v, 511) * 128, y = 128 - ((hash(v, i, 512) * 128 + f * 10) % 128); put(r, x + Math.sin(y * 0.1) * 2, y, i % 2 ? L[4] : L[3]); }
    return r;
  });
  return { name: `humo_frente_${v}`, w: 128, h: 128, anchor: [64, 0], solid: null, layer: 'frente', anims: { idle: { frames, fps: 4, loop: true } } };
}

// ---------------------------------------------------------------- el fondo lejano (capa fondo)

function tn(x: number, y: number, cell: number, Wp: number, seed: number): number {
  const gx = x / cell, gy = y / cell, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0, n = Math.round(Wp / cell);
  const h = (a: number, b: number) => hash(((a % n) + n) % n, b, seed);
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = h(x0, y0), b = h(x0 + 1, y0), c = h(x0, y0 + 1), d = h(x0 + 1, y0 + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/**
 * La fragua lejana (512 x 256, capa fondo, pega de lado a lado): chimeneas y hornos lejanos en la bruma roja, fuegos
 * chiquitos, ríos de lava que bajan por la montaña y cadenas que cuelgan del techo y se pierden en lo oscuro.
 */
function farForge(v: 0 | 1 | 2): WorldObject {
  const W = 512, H = 256, r = createRaster(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const t = y / H; put(r, x, y, [Math.round(8 + t * 34), Math.round(4 + t * 10), Math.round(6 + t * 6)]); }
  const layers = [{ base: 150, amp: 80, col: [40, 22, 22], seed: 521 }, { base: 185, amp: 60, col: [26, 14, 14], seed: 523 }, { base: 215, amp: 40, col: [14, 8, 8], seed: 525 }];
  for (const [li, Lr] of layers.entries()) {
    let x = 0;
    while (x < W) {
      const w = 16 + Math.floor(hash(x, li, Lr.seed + v) * 44), x1 = Math.min(W, x + w), top = Lr.base - hash(x, li + 1, Lr.seed + v) * Lr.amp;
      const kind = Math.floor(hash(x, li + 2, Lr.seed + v) * 3);
      for (let xx = x; xx < x1; xx++) {
        const u = (xx - (x + x1) / 2) / ((x1 - x) / 2);
        let tp = top;
        if (kind === 1) tp = top - Math.sqrt(Math.max(0, 1 - u * u)) * w * 0.4; // horno redondo
        if (kind === 2 && Math.abs(u) < 0.25) tp = top - 40 - hash(x, 7, Lr.seed) * 30; // chimenea
        for (let y = Math.max(0, Math.floor(tp)); y < H; y++) {
          put(r, xx, y, Lr.col.map((c) => c + (u < -0.5 ? 4 : 0)));
          // las bocas de los hornos lejanos: rectángulos naranjas chiquitos
          if (kind === 1 && Math.abs(u) < 0.3 && y > top + 6 && y < top + 14) put(r, xx, y, li === 0 ? [200, 90, 30] : [150, 60, 20]);
        }
        // humo de las chimeneas
        if (kind === 2 && Math.abs(u) < 0.25) for (let y = Math.floor(tp) - 30; y < tp; y++) if (tn(xx, y, 8, W, Lr.seed + li) > 0.5) put(r, xx, y, [50, 34, 32], 90);
      }
      x = x1 + Math.floor(hash(x, 5, Lr.seed) * 8);
    }
    // ríos de lava lejanos que bajan
    for (let k = 0; k < 2; k++) { const lx = hash(k, li, 527 + v) * W; for (let y = Lr.base - 20; y < H; y++) { const xx = lx + Math.sin(y * 0.05 + k) * 6; for (let d = -1; d <= 1; d++) put(r, ((Math.round(xx + d) % W) + W) % W, y, li === 0 ? [255, 120, 40] : [200, 70, 20], d ? 150 : 230); } }
    // bruma roja entre los planos
    for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) { const n = tn(xx, y, 64, W, 529 + li); if (y > Lr.base - 30 && n > 0.55) put(r, xx, y, [90, 30, 20], Math.round((n - 0.55) * 140 * (y / H))); }
  }
  // cadenas que cuelgan del techo y se pierden
  for (let k = 0; k < 6; k++) { const x0 = hash(k, v, 531) * W, len = 60 + hash(v, k, 532) * 120; for (let y = 0; y < len; y++) put(r, x0, y, y % 4 < 2 ? [30, 22, 20] : [20, 14, 12]); }
  // jaulitas lejanas con luz (puntitos de colores)
  for (let i = 0; i < 26; i++) { const px = Math.floor(hash(i, v, 533) * W), py = Math.floor(10 + hash(v, i, 534) * 120); const c = LUCES[LUZ_IDS[i % 5]]; put(r, px, py, c); put(r, px, py - 1, [30, 22, 20]); put(r, px + 1, py, c, 120); }
  // brasas que flotan
  for (let i = 0; i < 60; i++) put(r, Math.floor(hash(i, 3, 535 + v) * W), Math.floor(hash(v, i, 536) * H), i % 2 ? [255, 160, 60] : [200, 80, 30], 180);
  return { name: `fondo_fragua_lejos_${v}`, w: W, h: H, anchor: [0, 0], solid: null, layer: 'fondo', anims: one(r) };
}

export const FRAGUA_PARALAJE = [0.25, 0.4, 0.55];

// ---------------------------------------------------------------- el Bosque de Ceniza

/**
 * Árbol de ceniza (96 x 128, `idle` 4 cuadros a 4 fps): un árbol del Bosque del piso 1 quemado y quieto. Tronco de
 * carbón con la corteza partida en escamas, ramas negras que se abren como antes la copa, y brasas como hojas que
 * titilan en las puntas. 4 formas.
 */
function ashTree(v: number, f: number): Raster {
  const r = createRaster(96, 128), cx = 48 + (v % 2 ? 3 : -3);
  // el tronco: grueso abajo con raíces, se angosta hacia arriba
  for (let y = 56; y < 124; y++) {
    const hw = 6 + Math.max(0, (y - 108) * 0.7) + Math.sin(y * 0.3 + v) * 0.6;
    const bend = Math.sin((y / 128) * Math.PI + v) * 3;
    for (let x = Math.floor(cx - hw + bend); x <= cx + hw + bend; x++) {
      const u = (x - cx - bend) / hw, scale = Math.floor((y + (x % 5) * 2) / 6) % 2 === 0 && Math.abs(Math.sin(x * 0.9 + y * 0.3)) < 0.18;
      put(r, x, y, scale ? FRAGUA.grieta.aviso : tone(C, 0.7 - u * 0.45 + (hash(x >> 1, y >> 2, 541 + v) - 0.5) * 0.25, x, y));
    }
  }
  // las raíces
  for (const s of [-1, 1]) for (let t = 0; t < 14; t++) put(r, cx + s * (7 + t), 120 + t * 0.25, C[2]), put(r, cx + s * (7 + t), 121 + t * 0.25, C[1]);
  // las ramas: se abren en abanico como la copa de los árboles del Bosque
  const tips: [number, number][] = [];
  const branch = (x: number, y: number, a: number, len: number, w: number, depth: number) => {
    const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
    for (let t = 0; t <= 1; t += 0.04) { const px = x + (ex - x) * t, py = y + (ey - y) * t, ww = w * (1 - t * 0.5); for (let k = -ww; k <= ww; k += 0.7) put(r, px + k * Math.sin(a), py - k * Math.cos(a), k < 0 ? C[3] : C[1]); }
    if (depth <= 0) { tips.push([ex, ey]); return; }
    const n = 2 + ((depth + v) % 2);
    for (let k = 0; k < n; k++) branch(ex, ey, a + (k / (n - 1) - 0.5) * (1.5 + hash(k, depth, 542 + v) * 0.5), len * (0.7 + hash(depth, k, 543 + v) * 0.12), Math.max(0.6, w * 0.62), depth - 1);
  };
  branch(cx + Math.sin(v) * 3, 60, -Math.PI / 2 + (v - 1.5) * 0.08, 16 + v * 1.5, 5, 4);
  outline(r, '#050303');
  warmRim(r, 0.35);
  // las brasas-hoja: racimos chiquitos en las puntas que titilan (unas se apagan y otras se prenden)
  for (const [i, [tx, ty]] of tips.entries()) {
    for (let k = 0; k < 5; k++) {
      const on = (Math.floor(hash(i, k, 544 + v) * 4) + f) % 4;
      const px = tx + (hash(k, i, 545) - 0.5) * 6, py = ty + (hash(i, k, 546) - 0.5) * 5;
      put(r, px, py, on < 1 ? L[5] : on < 2 ? L[4] : on < 3 ? L[3] : L[1]);
      if (on < 2) put(r, px + 1, py, L[3], 180);
    }
  }
  // ceniza en el piso al pie y alguna brasa que cae
  for (let i = 0; i < 30; i++) put(r, cx - 20 + hash(i, 1, 547 + v) * 40, 122 + hash(i, 2, 547) * 4, i % 3 ? '#5a504a' : '#8a8078', 220);
  put(r, cx + 10 + (v * 7) % 12, 70 + ((f * 9 + v * 5) % 40), L[4]);
  return r;
}

function ashTrees(): WorldObject[] {
  return [0, 1, 2, 3].map((v) => {
    const frames = [0, 1, 2, 3].map((f) => ashTree(v, f));
    return grounded({ name: `arbol_ceniza_${v}`, w: 96, h: 128, anchor: [48, 122], solid: [-10, -8, 20, 10], light: { color: '#ff6a20', radius: 70, flicker: true, dy: 70 }, anims: { idle: { frames, fps: 4, loop: true } } }, frames[0]);
  });
}

// ---------------------------------------------------------------- la utilería de la fragua

function props(): WorldObject[] {
  const out: WorldObject[] = [];
  const mk = (name: string, w: number, h: number, anchor: [number, number], solid: [number, number, number, number] | null, draw: (r: Raster) => void, rim = 0.4) => {
    const r = createRaster(w, h);
    draw(r);
    outline(r, '#0a0606');
    if (rim) warmRim(r, rim);
    out.push(grounded({ name, w, h, anchor, solid, anims: one(r) }, r));
  };
  // el yunque: cuerno, cara plana y el pie sobre un tronco
  mk('yunque', 48, 48, [24, 44], [-14, -8, 28, 8], (r) => {
    for (let y = 30; y < 45; y++) { const hw = 10 + (y > 40 ? 2 : 0); for (let x = 24 - hw; x <= 24 + hw; x++) put(r, x, y, tone(M, 0.7 - (x - 24 + hw) / (hw * 2.4) + (y < 32 ? 0.25 : 0), x, y)); }
    for (let y = 22; y < 30; y++) for (let x = 17; x <= 31; x++) put(r, x, y, tone(I, 0.6 - (x - 17) / 30, x, y));
    for (let y = 14; y < 22; y++) for (let x = 8; x <= 40; x++) { if (x < 14 && y > 14 + (14 - x) * 0.6) continue; put(r, x, y, tone(I, (y < 16 ? 0.95 : 0.6) - (x - 8) / 70, x, y)); }
    for (let x = 2; x < 10; x++) for (let y = 15; y < 18 - (10 - x) * 0.2; y++) put(r, x, y, I[3]);
    // el martillo apoyado
    line(r, 34, 13, 44, 4, M[3], 2); for (let y = 2; y < 7; y++) for (let x = 41; x < 47; x++) put(r, x, y, I[3]);
  });
  for (const v of [0, 1]) mk(`pila_carbon_${v}`, 48, 32, [24, 28], [-16, -6, 32, 6], (r) => {
    for (let i = 0; i < 70 + v * 30; i++) {
      const a = hash(i, v, 551), x = 24 + (a - 0.5) * (36 + v * 6) * (1 - hash(v, i, 552) * 0.3), top = 28 - Math.sqrt(Math.max(0, 1 - ((x - 24) / (20 + v * 3)) ** 2)) * (14 + v * 4);
      const y = top + hash(i, i, 553) * (28 - top);
      ellipse(r, x, y, 2.4, 1.8, (u, vv) => (u + vv < -0.5 ? C[4] : u + vv > 0.6 ? C[0] : C[2]));
    }
    for (let i = 0; i < 5; i++) put(r, 14 + hash(i, v, 554) * 20, 22 + hash(v, i, 555) * 5, i % 2 ? L[3] : L[2]);
  });
  for (const v of [0, 1]) mk(`molde_${v}`, 48, 32, [24, 28], [-18, -8, 36, 8], (r) => {
    // un molde de arena con la forma de una jaula (o de un farol) vacía
    for (let y = 12; y < 29; y++) for (let x = 4; x < 44; x++) put(r, x, y, tone(['#2a2018', '#3a2c20', '#4e3c2c', '#62503a'], (y < 15 ? 0.95 : 0.55) - (x - 4) / 120 - (y > 26 ? 0.3 : 0), x, y));
    for (let y = 15; y < 22; y++) for (let x = 10; x < 38; x++) { const inShape = v ? Math.abs(x - 24) < 6 + (y - 15) * 0.4 : (x - 10) % 5 === 0 || y === 15 || y === 21; if (inShape) put(r, x, y, '#1a120c'); }
    if (v) put(r, 24, 18, L[2]);
  });
  mk('carretilla_fragua', 64, 48, [32, 44], [-22, -8, 44, 8], (r) => {
    // la carretilla de hierro con carbón y una jaula vacía encima
    for (let y = 16; y < 32; y++) { const x0 = 10 + (y - 16) * 0.4, x1 = 52 - (y - 16) * 0.3; for (let x = Math.floor(x0); x <= x1; x++) put(r, x, y, tone(I, 0.7 - (x - x0) / 60 + (y < 18 ? 0.2 : 0), x, y)); }
    for (let i = 0; i < 30; i++) ellipse(r, 16 + hash(i, 1, 561) * 30, 14 + hash(i, 2, 561) * 3, 2, 1.6, (u, v) => (u + v < -0.4 ? C[4] : C[2]));
    ellipse(r, 42, 36, 7, 7, (u, v) => (u * u + v * v < 0.25 ? I[4] : u * u + v * v < 0.55 ? I[1] : I[3]));
    line(r, 12, 30, 2, 42, I[3], 2); line(r, 20, 30, 18, 44, I[2], 2);
    line(r, 50, 18, 62, 10, M[3], 2);
  });
  mk('crisol', 48, 48, [24, 44], [-14, -8, 28, 8], (r) => {
    // el crisol: un caldero de piedra con metal al rojo adentro, sobre patas
    for (const s of [-1, 1]) line(r, 24 + s * 8, 34, 24 + s * 12, 45, I[3], 2);
    ellipse(r, 24, 28, 15, 12, (u, v, x, y) => (v < -0.4 ? null : tone(R, 0.75 - u * 0.4 - v * 0.2, x, y)));
    ellipse(r, 24, 22, 13, 4, (u, v, x, y) => tone(L, 0.8 + (hash(x, y, 563) - 0.5) * 0.4 - Math.hypot(u, v) * 0.3, x, y));
    line(r, 10, 20, 2, 10, I[3], 2);
    glow(r, 24, 18, 16, L[3], 0.9);
  }, 0.5);
  for (const v of [0, 1]) mk(`pila_jaulas_${v}`, 64, 64, [32, 60], [-22, -8, 44, 8], (r) => {
    // jaulas vacías amontonadas, de lado y paradas, esperando su luz
    const cs = v ? [[16, 46, 0], [44, 48, 1], [30, 26, 0]] : [[18, 48, 1], [44, 44, 0], [32, 22, 1], [52, 22, 0]];
    for (const [x, y, side] of cs) {
      const hw = side ? 12 : 8, hh = side ? 8 : 12;
      for (let yy = -hh; yy <= hh; yy++) for (let xx = -hw; xx <= hw; xx++) {
        const edge = Math.abs(xx) === hw || Math.abs(yy) === hh, bar = side ? (yy + hh) % 4 === 0 : (xx + hw) % 3 === 0;
        if (edge || bar) put(r, x + xx, y + yy, tone(I, 0.7 - (xx + hw) / (hw * 3) - (yy > 0 ? 0.15 : 0), xx, yy));
      }
    }
  });
  for (const v of [0, 1, 2]) mk(`columna_basalto_${v}`, 48, 96, [24, 92], [-14, -10, 28, 10], (r) => {
    // columnas de basalto hexagonales de distinta altura, juntas
    const cols = [[16, 30 + v * 6], [28, 14 + v * 4], [38, 40 - v * 4]];
    for (const [x0, top] of cols) for (let y = top; y < 93; y++) for (let x = x0 - 6; x <= x0 + 6; x++) {
      const u = (x - x0) / 6, face = y < top + 4;
      put(r, x, y, face ? tone(O, 0.9 - u * 0.2, x, y) : tone(O, 0.6 - u * 0.5 + (Math.abs(u) > 0.6 ? -0.1 : 0) + ((y - top) % 22 === 0 ? -0.3 : 0), x, y));
    }
    for (let i = 0; i < 8; i++) put(r, 10 + hash(i, v, 565) * 30, 30 + hash(v, i, 566) * 60, '#8a6aa8', 200);
  }, 0.45);
  // las celdas de la cárcel: jaulas grandes (como cuartitos) vacías, con la puerta trancada
  for (const v of [0, 1]) mk(`celda_jaula_${v}`, 96, 128, [48, 122], [-40, -14, 80, 16], (r) => {
    for (let y = 108; y < 124; y++) for (let x = 6; x < 90; x++) put(r, x, y, tone(R, 0.6 - (x - 6) / 200 + (y < 110 ? 0.25 : 0) - (y > 121 ? 0.25 : 0), x, y));
    for (let b = 0; b < 12; b++) { const x = 10 + b * 7; for (let y = 22 + (v ? Math.abs(b - 5.5) * 1.5 : 0); y < 108; y++) put(r, x, y, b === 0 ? I[4] : I[3]), put(r, x + 1, y, I[2]); }
    for (const y of [22, 60, 104]) for (let x = 8; x < 90; x++) put(r, x, y + (v && y === 22 ? 0 : 0), tone(I, 0.8 - (x - 8) / 120, x, y));
    // la tranca y un candado grande
    for (let x = 40; x < 58; x++) for (let y = 62; y < 66; y++) put(r, x, y, I[4]);
    for (let y = 66; y < 74; y++) for (let x = 46; x < 53; x++) put(r, x, y, y === 66 ? '#c8a060' : x < 48 ? '#d8b070' : FRAGUA.oxido);
    // alguna luz que quedó adentro de la celda (chiquita, del color de un mundo)
    glow(r, 30 + v * 30, 90, 10, LUCES[v ? 'galerias' : 'bosque'], 1);
  });
  return out;
}

// ---------------------------------------------------------------- el mural 6

/**
 * El sexto pedazo del mural (128 x 96): pintado en hierro y roca. La figura alta y oscura, cargando jaulas de luces
 * de colores, entra por una puerta negra enorme; adentro, muy arriba, solo se ven dos ojos rojos grandes. Sin texto.
 */
function mural6(): WorldObject {
  const r = createRaster(128, 96);
  for (let y = 0; y < 96; y++) for (let x = 0; x < 128; x++) put(r, x, y, tone(['#2a1e1a', '#3a2a24', '#4e3a30', '#62483a', '#7a5a46'], 0.5 + (hash(x >> 3, y >> 3, 571) - 0.5) * 0.2 + (y < 4 || y > 92 || x < 3 || x > 124 ? -0.35 : 0), x, y));
  const ink = '#0e0a0c';
  // la puerta negra: un arco enorme a la derecha, negro de verdad, con el marco de hierro
  for (let y = 10; y < 92; y++) for (let x = 56; x < 124; x++) {
    const dx = Math.abs(x - 90), inA = y > 36 ? dx < 28 : Math.hypot(dx, (y - 36) * 1.2) < 28, frameA = y > 36 ? dx < 32 : Math.hypot(dx, (y - 36) * 1.2) < 32;
    if (inA) put(r, x, y, '#000000'); else if (frameA) put(r, x, y, '#3a3230');
  }
  // los dos ojos rojos grandes, muy arriba adentro de la puerta
  for (const ex of [82, 98]) ellipse(r, ex, 24, 3.4, 2, (u, v) => (u < -0.2 && v < 0 ? '#ffb0a0' : '#ff2a1a'));
  glow(r, 90, 24, 16, '#ff2a1a', 0.6);
  // la figura entrando, con un palo al hombro y jaulas de colores colgando
  const fx = 50, fy = 86;
  for (let y = fy - 34; y < fy; y++) { const w = y < fy - 24 ? 4 : 4 + (y - (fy - 24)) * 0.4; for (let x = -w; x <= w; x++) put(r, fx + x, y, ink); }
  for (const ex of [-1.5, 1.5]) put(r, fx + ex + 1, fy - 29, '#ff4a32');
  line(r, fx - 22, fy - 28, fx + 14, fy - 24, '#2a2018', 1);
  for (const [k, luz] of (['bosque', 'catedral', 'galerias', 'faro', 'ciudad'] as LuzId[]).entries()) {
    const cx = fx - 20 + k * 7 + (k > 2 ? 6 : 0), cy = fy - 18 + (k % 2) * 3;
    line(r, cx, fy - 27 + k * 0.1, cx, cy - 3, ink);
    for (let y = -3; y <= 3; y++) for (let x = -2; x <= 2; x++) put(r, cx + x, cy + y, Math.abs(x) === 2 || Math.abs(y) === 3 ? ink : LUCES[luz]);
  }
  // el camino de luces robadas que viene desde la izquierda (de los mundos de arriba), en puntitos de colores
  for (let t = 0; t < 1; t += 0.02) { const x = 4 + t * 34, y = 20 + t * 40 + Math.sin(t * 12) * 3; put(r, x, y, LUCES[LUZ_IDS[Math.floor(t * 50) % 5]]); }
  // descascarado
  for (let i = 0; i < 12; i++) { const cx = 8 + hash(i, 1, 572) * 48, cy = 8 + hash(i, 2, 572) * 80, s = 2 + hash(i, 3, 572) * 3; for (let y = -s; y <= s; y++) for (let x = -s; x <= s; x++) if (x * x + y * y <= s * s && hash(x, y + i, 573) > 0.3) put(r, cx + x, cy + y, '#5a443a'); }
  return { name: 'mural_6', w: 128, h: 96, anchor: [64, 95], solid: null, anims: one(r) };
}

// ---------------------------------------------------------------- la Ladrona cargando jaulas

/**
 * La Ladrona cargando jaulas (48 x 64): la figura de los ojos rojos chiquitos, con un palo al hombro del que cuelgan
 * tres jaulitas con luces de colores que se mecen. `idle` (4 cuadros a 4 fps: camina despacio, las jaulas se mecen) e
 * `irse` (8 cuadros a 10 fps: se va en humo, las jaulitas también).
 */
function carrierFigure(): WorldObject {
  const DARK = '#0e0b16', RIM = '#3a2230', EDGE = '#07060c';
  const draw = (k: number, f: number): Raster => {
    const r = createRaster(48, 64), bob = f === 1 || f === 3 ? -1 : 0;
    for (let y = 12; y < 62; y++) {
      const t = (y - 19) / 7.5, w = y < 26 ? 7.5 * Math.sqrt(Math.max(0, 1 - t * t)) + (y > 22 ? 1 : 0) : y < 30 ? 8 + (y - 26) * 0.9 : 11 + (y - 30) * 0.2;
      if (w <= 0) continue;
      const cx = 22 + (y < 28 ? -(28 - y) * 0.1 : 0);
      for (let x = -w; x <= w; x++) {
        if (k > 0 && hash(Math.round(x), y, 581 + f) < k * (0.4 + (62 - y) / 80)) continue;
        if (y > 54 && hash(Math.round(x) + 40, y, 582 + f) < (y - 54) / 9) continue;
        put(r, cx + x + Math.sin(y * 0.2 + f) * k * 4, y - k * 10 + bob, x < -w + 1.2 && y < 42 ? RIM : x > w - 1.5 ? EDGE : DARK, Math.round(240 * (1 - k * 0.6)));
      }
    }
    // los ojos rojos chiquitos
    if (k < 0.7) for (const ex of [19, 25]) { put(r, ex, 20 - k * 10 + bob, '#ff4a32'); put(r, ex, 21 - k * 10 + bob, '#a01a14'); }
    // el palo al hombro y las tres jaulitas colgando que se mecen
    if (k < 0.85) {
      const a = Math.round(255 * (1 - k));
      line(r, 4, 26 - k * 10 + bob, 46, 22 - k * 10 + bob, '#3a2a20', 1, a);
      for (const [j, luz] of (['bosque', 'galerias', 'ciudad'] as LuzId[]).entries()) {
        const hx = 6 + j * 17 + (j === 1 ? 4 : 0), hy = 26 - j * 1.3 - k * 10 + bob, sw = Math.sin((f / 4) * Math.PI * 2 + j * 1.6) * 1.6;
        const cx = hx + sw, cy = hy + 9;
        line(r, hx, hy, cx, cy - 4, '#2a2020', 1, a);
        for (let y = -3; y <= 3; y++) for (let x = -2; x <= 2; x++) put(r, cx + x, cy + y, Math.abs(x) === 2 || y === -3 || y === 3 || (Math.abs(x) === 1 && y === -2) ? '#2a2020' : LUCES[luz], a);
        glow(r, cx, cy, 6, LUCES[luz], 0.9 * (1 - k));
      }
    }
    if (k > 0) for (let i = 0; i < 22; i++) { const hx2 = 24 + (hash(i, f, 583) - 0.5) * 34, hy2 = 54 - hash(f, i, 584) * 56 * k; put(r, hx2, hy2, '#2a2438', 150); }
    return r;
  };
  return {
    name: 'figura_cargadora', w: 48, h: 64, anchor: [24, 60], solid: null,
    light: { color: '#ff3a2a', radius: 36, pulse: true, dy: 40 },
    anims: { idle: { frames: [0, 1, 2, 3].map((f) => draw(0, f)), fps: 4, loop: true }, irse: { frames: Array.from({ length: 8 }, (_, f) => draw((f + 1) / 8, f)), fps: 10, loop: false } },
  };
}

// ---------------------------------------------------------------- calcomanías

/** Calcomanías (capa suelo): escoria, ceniza acumulada, marcas de carretilla, charquitos de metal frío y eslabones sueltos. */
function decals(): WorldObject[] {
  const out: WorldObject[] = [];
  const mk = (name: string, w: number, h: number, draw: (r: Raster) => void) => { const r = createRaster(w, h); draw(r); out.push({ name, w, h, anchor: [w >> 1, h >> 1], solid: null, layer: 'suelo', anims: one(r) }); };
  for (const v of [0, 1]) mk(`escoria_${v}`, 48, 32, (r) => {
    for (let k = 0; k < 7 + v * 3; k++) { const cx = 6 + hash(k, v, 591) * 36, cy = 6 + hash(v, k, 592) * 20, s = 1.5 + hash(k, k, 593) * 2.5; ellipse(r, cx, cy, s * 1.3, s, (u, vv) => (u + vv < -0.4 ? '#5a4a5a' : '#2a2028')); if (k % 3 === 0) put(r, cx, cy, '#8a6aa8'); }
  });
  for (const v of [0, 1]) mk(`ceniza_${v}`, 48, 24, (r) => {
    for (let i = 0; i < 80 + v * 30; i++) { const a = hash(i, v, 594) * Math.PI * 2, d = Math.sqrt(hash(v, i, 595)) * (10 + v * 3); put(r, 24 + Math.cos(a) * d * 1.6, 12 + Math.sin(a) * d * 0.6, hash(i, i, 596) > 0.6 ? '#8a8078' : '#5a504a', Math.round(210 - d * 8)); }
  });
  mk('marcas_carretilla_0', 64, 32, (r) => {
    for (const y0 of [10, 22]) for (let x = 0; x < 64; x++) { const y = y0 + Math.sin(x * 0.06) * 2; if (hash(x >> 2, y0, 597) > 0.15) { put(r, x, y, '#120a08', 170); put(r, x, y + 1, '#2a1e1a', 120); } }
  });
  for (const v of [0, 1]) mk(`metal_frio_${v}`, 32, 24, (r) => {
    // un charquito de metal que se enfrió: gris plateado con un borde y brillo
    ellipse(r, 16, 12, 10 + v * 3, 5 + v, (u, vv, x, y) => { const d = Math.hypot(u, vv) + (hash(x >> 1, y, 598 + v) - 0.5) * 0.25; return d > 1 ? null : d > 0.8 ? '#3a3238' : u + vv < -0.5 ? '#c8c0c8' : '#7a7078'; });
  });
  for (const v of [0, 1]) mk(`eslabones_${v}`, 32, 24, (r) => {
    for (let k = 0; k < 2 + v; k++) { const cx = 7 + k * 8, cy = 10 + (k % 2) * 3; ellipse(r, cx, cy, 4, 3, (u, vv) => (u * u + vv * vv < 0.3 ? null : u < 0 ? I[4] : I[2])); }
    for (let i = 0; i < 6; i++) put(r, 4 + hash(i, v, 599) * 24, 8 + hash(v, i, 600) * 10, FRAGUA.oxido, 200);
  });
  return out;
}

// ---------------------------------------------------------------- la lava y la partícula de brasas

/**
 * Un cuadro de la lava (32 x 32, pega por los cuatro lados): rojo hondo con costra oscura que se va moviendo lento,
 * vetas naranjas y el corazón amarillo claro que late. 4 cuadros (el bucle cierra). `apagada`: la lava hecha piedra
 * gris con vetas tibias.
 */
export function lavaTile(frame: number, apagada = false): Raster {
  const T = 32, r = createRaster(T, T);
  const per = (x: number, y: number, cell: number, seed: number) => {
    const n = T / cell, gx = x / cell, gy = y / cell, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
    const h = (a: number, b: number) => hash(((a % n) + n) % n, ((b % n) + n) % n, seed);
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = h(x0, y0), b = h(x0 + 1, y0), c = h(x0, y0 + 1), d = h(x0 + 1, y0 + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
  const ph = (frame / 4) * Math.PI * 2;
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    // la corriente: se corre en diagonal 8 px por bucle (el ruido pega cada 8), y la costra respira
    const sx = x + frame * 2, sy = y + frame;
    const n = per(sx, sy, 8, 611) * 0.6 + per(x - frame * 2, y + frame * 2, 16, 613) * 0.4;
    const crust = per(x, y, 16, 617) * 0.5 + per(sx, y, 8, 619) * 0.5;
    let c: string;
    const v1 = Math.abs(n - 0.5), v2 = Math.abs(per(x + frame * 4, y - frame * 4, 8, 621) - 0.5);
    if (apagada) c = v1 < 0.035 || v2 < 0.03 ? FRAGUA.apagada : tone(['#2a2624', '#3a3532', '#4a4440', '#5a5450', '#6a6460'], crust * 0.7 + 0.15, x, y, true);
    else {
      // rojo hondo y parejo (casi sin dibujo, así no se nota que se repite), con vetas finas que corren al naranja
      // y un hilo amarillo en el medio de las más calientes
      let l = 0.1 + n * 0.22 + 0.05 * Math.sin(ph + (x + y) * 0.2) + (crust > 0.72 ? -0.08 : 0);
      if (v1 < 0.045) l += 0.32 * (1 - v1 / 0.045) + 0.12;
      if (v2 < 0.03) l += 0.22 * (1 - v2 / 0.03);
      if (v1 < 0.01) l = 0.98;
      c = tone(L, l, x, y, true);
    }
    const [R0, G0, B0] = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    const k = (y * T + x) * 4;
    r.data[k] = R0; r.data[k + 1] = G0; r.data[k + 2] = B0; r.data[k + 3] = 255;
  }
  return r;
}

/** La partícula del piso: brasas (8 x 8, 4 cuadros a 8 fps), una chispa que sube y titila de amarillo a rojo. */
export function emberParticle(): { name: string; w: number; h: number; frames: Raster[]; fps: number } {
  const frames = [0, 1, 2, 3].map((k) => {
    const r = createRaster(8, 8), c = [L[5], L[4], L[3], L[4]][k];
    put(r, 3, 4, c); put(r, 4, 4, c, 210); put(r, 3, 3, c, 200);
    put(r, 3, 5, L[2], 140); put(r, 4, 6, L[1], 90);
    if (k === 0) for (const [x, y] of [[2, 4], [5, 3]]) put(r, x, y, L[3], 120);
    return r;
  });
  return { name: 'brasas', w: 8, h: 8, frames, fps: 8 };
}

export function fraguaObjectsB(): WorldObject[] {
  return [
    hangingChains(0), hangingChains(1), hangingChains(2), frontCages(0), frontCages(1), frontSmoke(0), frontSmoke(1),
    farForge(0), farForge(1), farForge(2), ...ashTrees(), ...props(), mural6(), carrierFigure(), ...decals(),
  ];
}

void ashDust; void O;
