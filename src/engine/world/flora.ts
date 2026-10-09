import { createRaster, type Raster } from '../core/raster';

/**
 * Flora v3: árboles y arbustos pintados pixel por pixel como en Stardew Valley, pero en un bosque sombrío.
 *
 * Copa: unión de "nubes" (puffs). Cada nube se sombrea como una esfera con luz arriba a la izquierda, y su superficie
 * está hecha de racimos de hojas (celdas de Voronoi de ~4 px) que toman un solo tono cada uno: eso da la textura de
 * hojas gruesas de Stardew. Las nubes de atrás se oscurecen donde las tapa una de adelante, el borde es irregular
 * (hojas que sobresalen) y el contorno es del color más oscuro de la rampa, no negro.
 *
 * Todo se anima: el viento corre la copa (más arriba, más se mueve), los árboles hechizados abren los ojos y
 * parpadean, y el musgo que cuelga se mece.
 */

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

function hash(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function setPx(r: Raster, x: number, y: number, c: RGB, a = 255) {
  if (x < 0 || y < 0 || x >= r.w || y >= r.h) return;
  const i = (y * r.w + x) * 4;
  if (a < 255 && r.data[i + 3]) {
    const t = a / 255;
    r.data[i] = r.data[i] * (1 - t) + c[0] * t; r.data[i + 1] = r.data[i + 1] * (1 - t) + c[1] * t; r.data[i + 2] = r.data[i + 2] * (1 - t) + c[2] * t;
    r.data[i + 3] = Math.max(r.data[i + 3], a);
    return;
  }
  r.data[i] = c[0]; r.data[i + 1] = c[1]; r.data[i + 2] = c[2]; r.data[i + 3] = a;
}
const alphaAt = (r: Raster, x: number, y: number) => (x < 0 || y < 0 || x >= r.w || y >= r.h ? 0 : r.data[(y * r.w + x) * 4 + 3]);

// ---------- rampas (de sombra fría a luz cálida) ----------

export const RAMPS = {
  roble: ['#0f1a1c', '#16272a', '#1d3634', '#27493f', '#335d4a', '#447454', '#5b8c5c', '#7aa466'],
  roble_otono: ['#1a1418', '#2a1c1e', '#3e2824', '#56362a', '#704a30', '#8c6236', '#a87e44', '#c49a58'],
  pino: ['#0c1619', '#112124', '#172e30', '#1e3e3c', '#284f48', '#336254', '#447660'],
  hechizado: ['#110d17', '#1a1422', '#241b2e', '#30243c', '#3e2f4c', '#4f3d5c', '#654f6e', '#7e6684'],
  sauce: ['#0e1a1a', '#152826', '#1c3632', '#25463e', '#30584a', '#3e6c56', '#528262', '#6c9a70'],
  arbusto: ['#0f1a1a', '#172a28', '#203a34', '#2b4c40', '#38604c', '#4a7456', '#628a60'],
  corteza: ['#120e10', '#1e1716', '#2c211c', '#3c2d24', '#4e3c2e', '#634d38', '#7a6044'],
  corteza_muerta: ['#100e14', '#1a1720', '#26222c', '#34303a', '#45404a', '#58525c', '#6e6872'],
  musgo: ['#16241c', '#22362a', '#2e4a34', '#3e5e3c', '#527448'],
};

// ---------- copa ----------

export interface Puff { x: number; y: number; r: number }

/** Celda de Voronoi (racimo de hojas) más cercana: id de celda, centro y distancia al borde. */
function leafCell(x: number, y: number, size: number, seed: number) {
  const gx = Math.floor(x / size), gy = Math.floor(y / size);
  let d1 = 1e9, d2 = 1e9, cx = 0, cy = 0, id = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const X = gx + i, Y = gy + j;
    const px = (X + 0.15 + hash(X, Y, seed) * 0.7) * size, py = (Y + 0.15 + hash(X, Y, seed + 1) * 0.7) * size;
    const d = (x - px) ** 2 + (y - py) ** 2;
    if (d < d1) { d2 = d1; d1 = d; cx = px; cy = py; id = X * 7919 + Y; } else if (d < d2) d2 = d;
  }
  return { id, cx, cy, edge: Math.sqrt(d2) - Math.sqrt(d1) };
}

/**
 * Pinta una copa sobre r. sway: cuánto se corre la punta (px). top/bottom: alto de la copa (el viento mueve más arriba).
 * ramp: rampa de 6 a 8 tonos. leaf: tamaño del racimo de hojas.
 */
export function drawCanopy(r: Raster, puffs: Puff[], ramp: string[], seed: number, sway = 0, leaf = 6, opts: { sparkle?: boolean; rim?: boolean } = {}) {
  const R = ramp.map(hex), N = R.length;
  const top = Math.min(...puffs.map((p) => p.y - p.r)), bottom = Math.max(...puffs.map((p) => p.y + p.r));
  const W = r.w, H = r.h;
  const owner = new Int16Array(W * H).fill(-1);
  const tone = new Float32Array(W * H);
  // orden: atrás (y chico) primero; la dueña del pixel es la de más adelante
  const order = puffs.map((p, i) => ({ ...p, i })).sort((a, b) => a.y - b.y);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = Math.max(0, Math.min(1, (bottom - y) / (bottom - top)));
    const sx = x - sway * k * k; // la punta se mueve más
    for (let o = order.length - 1; o >= 0; o--) {
      const p = order[o];
      const dx = sx - p.x, dy = y - p.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > p.r + 3) continue;
      // borde de hojas: el racimo decide si sobresale o se mete
      const c = leafCell(sx, y, leaf, seed + p.i * 13);
      const bump = (hash(c.id, 3, seed) - 0.45) * 3.4;
      if (d > p.r + bump) continue;
      owner[y * W + x] = o;
      // normal de la esfera en el centro del racimo (así cada racimo tiene un solo tono)
      const nx = (c.cx - p.x) / p.r, ny = (c.cy - p.y) / p.r;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const lit = -nx * 0.55 - ny * 0.75 + nz * 0.45; // luz arriba a la izquierda
      let t = 1.6 + (lit + 0.4) * (N - 2.6) * 0.6 + (hash(c.id, 9, seed) - 0.5) * 0.7;
      t -= (1 - k) * 0.8; // la parte de abajo de la copa, más oscura
      // cada racimo es una bolita: arriba a la izquierda con luz, abajo en sombra
      const ly = (c.cy - y) / leaf, lx = (c.cx - sx) / leaf;
      t += ly * 1.3 + lx * 0.35;
      if (c.edge < 1.1 && y > c.cy) t -= 1.2; // borde de abajo del racimo
      tone[y * W + x] = t;
      break;
    }
  }
  // oclusión: lo de atrás se oscurece justo arriba de una nube de adelante
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = owner[y * W + x];
    if (o < 0) continue;
    for (let d = 1; d <= 3; d++) {
      const yy = y + d;
      if (yy >= H) break;
      const o2 = owner[yy * W + x];
      if (o2 > o) { tone[y * W + x] -= d === 1 ? 2.2 : d === 2 ? 1.4 : 0.7; break; }
    }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (owner[y * W + x] < 0) continue;
    const t = Math.max(1, Math.min(N - 1, Math.round(tone[y * W + x])));
    setPx(r, x, y, R[t]);
  }
  // contorno: oscuro abajo y a los lados, un tono más claro arriba (luz que rebota)
  const out: [number, number, RGB][] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (owner[y * W + x] >= 0 || alphaAt(r, x, y)) continue;
    const below = y + 1 < H && owner[(y + 1) * W + x] >= 0;
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < W && Y < H && owner[Y * W + X] >= 0; });
    if (near) out.push([x, y, below ? R[1] : R[0]]);
  }
  for (const [x, y, c] of out) setPx(r, x, y, c);
  // brillos sueltos en los racimos más iluminados
  if (opts.sparkle !== false) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (owner[y * W + x] < 0 || tone[y * W + x] < N - 1.6) continue;
      if (hash(x, y, seed + 77) > 0.93) setPx(r, x, y, R[N - 1].map((v) => Math.min(255, v + 26)) as RGB);
    }
  }
}

// ---------- tronco y ramas ----------

/** Tronco de y0 (base) a y1 (arriba), ancho w0 -> w1, con curva (bend px) y raíces. */
export function drawTrunk(r: Raster, cx: number, y0: number, y1: number, w0: number, w1: number, ramp: string[], seed: number, bend = 0, roots = 3) {
  const R = ramp.map(hex), N = R.length;
  const mask = new Uint8Array(r.w * r.h), tone = new Float32Array(r.w * r.h);
  const put = (x: number, y: number, t: number) => { if (x < 0 || y < 0 || x >= r.w || y >= r.h) return; const i = y * r.w + x; mask[i] = 1; tone[i] = t; };
  for (let y = y1; y <= y0; y++) {
    const k = (y0 - y) / Math.max(1, y0 - y1);
    const w = w0 + (w1 - w0) * k + (k < 0.15 ? (0.15 - k) * w0 * 2.2 : 0); // se abre en la base
    const c = cx + Math.sin(k * Math.PI) * bend;
    for (let x = Math.floor(c - w / 2); x <= Math.ceil(c + w / 2); x++) {
      const u = (x - (c - w / 2)) / Math.max(1, w); // 0 izquierda, 1 derecha
      let t = 2 + (1 - u) * (N - 3.4) * 0.9 - (u > 0.75 ? 1 : 0);
      const bark = hash(x * 3 + Math.floor(y / 5), 1, seed);
      if (hash(x, Math.floor(y / 3), seed + 2) > 0.8) t -= 1; // vetas
      if (bark > 0.9) t += 0.6;
      put(x, y, t);
    }
  }
  // raíces
  for (let i = 0; i < roots; i++) {
    const dir = i % 2 ? 1 : -1, len = 4 + hash(i, 0, seed) * 6, dy = hash(i, 1, seed) * 2;
    for (let s = 0; s < len; s++) for (let t = 0; t < 2; t++) put(Math.round(cx + dir * (w0 / 2 + s)), Math.round(y0 - 1 + dy + s * 0.25 + t), 2 + (dir < 0 ? 1.5 : 0) - s * 0.1);
  }
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    const i = y * r.w + x;
    if (!mask[i]) continue;
    setPx(r, x, y, R[Math.max(1, Math.min(N - 1, Math.round(tone[i])))]);
  }
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    const i = y * r.w + x;
    if (mask[i] || alphaAt(r, x, y)) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => mask[(y + dy) * r.w + x + dx] && x + dx >= 0 && x + dx < r.w && y + dy >= 0 && y + dy < r.h)) setPx(r, x, y, R[0]);
  }
}

/** Rama de (x0,y0) en ángulo a, largo, grosor; se divide (recursiva) y se mece con sway. */
function branch(pts: { x: number; y: number; w: number }[], x0: number, y0: number, a: number, len: number, w: number, depth: number, seed: number) {
  const steps = Math.ceil(len);
  let x = x0, y = y0;
  for (let s = 0; s < steps; s++) {
    a += (hash(s, depth, seed) - 0.5) * 0.35;
    x += Math.cos(a); y += Math.sin(a);
    pts.push({ x, y, w: Math.max(0.6, w * (1 - (s / steps) * 0.55)) });
  }
  if (depth <= 0) return;
  const n = 2;
  for (let i = 0; i < n; i++) branch(pts, x, y, a + (i ? 0.55 : -0.6) + (hash(i, depth, seed) - 0.5) * 0.4, len * 0.68, w * 0.62, depth - 1, seed + i * 31 + depth);
}

export function drawBranches(r: Raster, roots: { x: number; y: number; a: number; len: number; w: number; depth: number }[], ramp: string[], seed: number, sway = 0, baseY = r.h) {
  const R = ramp.map(hex), N = R.length;
  const mask = new Uint8Array(r.w * r.h), tone = new Float32Array(r.w * r.h);
  roots.forEach((b, k) => {
    const pts: { x: number; y: number; w: number }[] = [];
    branch(pts, b.x, b.y, b.a, b.len, b.w, b.depth, seed + k * 101);
    for (const p of pts) {
      const kk = Math.max(0, Math.min(1, (baseY - p.y) / baseY));
      const px = p.x + sway * kk * kk;
      const rr = p.w / 2;
      for (let dy = -Math.ceil(rr); dy <= Math.ceil(rr); dy++) for (let dx = -Math.ceil(rr); dx <= Math.ceil(rr); dx++) {
        if (dx * dx + dy * dy > rr * rr + 0.3) continue;
        const X = Math.round(px + dx), Y = Math.round(p.y + dy);
        if (X < 0 || Y < 0 || X >= r.w || Y >= r.h) continue;
        mask[Y * r.w + X] = 1;
        tone[Y * r.w + X] = 2.5 + (dy < 0 ? 1.5 : 0) + (dx < 0 ? 0.8 : -0.4);
      }
    }
  });
  for (let i = 0; i < mask.length; i++) if (mask[i]) setPx(r, i % r.w, Math.floor(i / r.w), R[Math.max(1, Math.min(N - 1, Math.round(tone[i])))]);
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    if (mask[y * r.w + x] || alphaAt(r, x, y)) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < r.w && Y < r.h && mask[Y * r.w + X]; })) setPx(r, x, y, R[0]);
  }
}

/** Sombra suave en el piso (dos anillos de opacidad). */
export function groundShadow(r: Raster, cx: number, cy: number, rx: number, ry: number) {
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (d > 1) continue;
    if (alphaAt(r, x, y)) continue;
    setPx(r, x, y, [8, 14, 18], d < 0.55 ? 120 : 70);
  }
}

/** Musgo que cuelga (se mece con sway). */
function hangingMoss(r: Raster, anchors: [number, number, number][], sway: number, seed: number) {
  const R = RAMPS.musgo.map(hex);
  anchors.forEach(([x0, y0, len], k) => {
    for (let s = 0; s < len; s++) {
      const off = Math.sin((s / len) * Math.PI * 0.5) * sway * (s / len);
      const x = Math.round(x0 + off + (hash(k, s >> 2, seed) - 0.5) * 0.8);
      const t = s < 2 ? 3 : s > len - 3 ? 1 : 2 + (hash(k, s, seed) > 0.6 ? 1 : 0);
      setPx(r, x, y0 + s, R[t]);
      if (s % 3 === 1 && s < len - 2) setPx(r, x + (k % 2 ? 1 : -1), y0 + s, R[t - 1 >= 0 ? t - 1 : 0]);
    }
  });
}

/** Ojos del árbol hechizado: hueco oscuro y dos luces (open: 0 cerrados .. 1 abiertos). */
function treeFace(r: Raster, cx: number, cy: number, open: number, glow: string) {
  const G = hex(glow), dark: RGB = [8, 6, 12], hollow: RGB = [20, 14, 24], rim: RGB = [70, 62, 78];
  for (const s of [-1, 1]) {
    const ex = cx + s * 7;
    // cuenca del ojo, inclinada (cejas fruncidas pero no da miedo de verdad)
    for (let dy = -4; dy <= 4; dy++) for (let dx = -5; dx <= 5; dx++) if ((dx * dx) / 25 + (dy * dy) / 14 <= 1) setPx(r, ex + dx, cy + dy + (dx * s > 0 ? 0 : 1), hollow);
    for (let dx = -5; dx <= 5; dx++) setPx(r, ex + dx, cy - 4 - Math.round(dx * s * 0.25), rim);
    const h = Math.round(open * 2.6);
    if (h === 0) for (let dx = -2; dx <= 2; dx++) setPx(r, ex + dx, cy + 1, [90, 70, 60]);
    else {
      for (let dx = -2; dx <= 2; dx++) for (let dy = -h; dy <= h; dy++) if ((dx * dx) / 6 + (dy * dy) / (h * h + 0.5) <= 1.05) setPx(r, ex + dx, cy + dy + 1, G);
      setPx(r, ex - 1, cy - h + 1, [255, 255, 235]);
      if (open > 0.6) for (let dy = -h - 2; dy <= h + 2; dy++) for (let dx = -4; dx <= 4; dx++) { const d = (dx * dx) / 16 + (dy * dy) / ((h + 2) * (h + 2)); if (d > 0.7 && d <= 1.2) setPx(r, ex + dx, cy + dy + 1, G, 70); }
    }
  }
  // boca: hueco ovalado chueco
  for (let dy = -2; dy <= 2; dy++) for (let dx = -5; dx <= 5; dx++) if ((dx * dx) / 25 + (dy * dy) / 5 <= 1) setPx(r, cx + dx, cy + 12 + dy + Math.round(dx * 0.15), dy < 0 ? dark : hollow);
  for (let dx = -4; dx <= 4; dx++) setPx(r, cx + dx, cy + 9 + Math.round(dx * 0.15), rim);
}

// ---------- árboles ----------

export interface Flora { name: string; w: number; h: number; anchor: [number, number]; solid: [number, number, number, number]; anims: Record<string, { frames: Raster[]; fps: number; loop: boolean }> }

const SWAY = [0, 0.8, 1.4, 1.6, 1.2, 0.5, -0.3, -0.7, -0.4];
const swayFrames = (amp: number) => SWAY.map((v) => v * amp);

/** Ramas gruesas que suben desde la punta del tronco hacia adentro de la copa (solo se ven si la copa se aclara). */
function innerBranches(r: Raster, x: number, y: number, len: number, w: number, seed: number) {
  drawBranches(r, [
    { x, y, a: -1.57, len: len * 1.05, w, depth: 1 },
    { x: x - w * 0.3, y: y + 1, a: -2.3, len, w: w * 0.75, depth: 1 },
    { x: x + w * 0.3, y: y + 1, a: -0.85, len, w: w * 0.75, depth: 1 },
  ], RAMPS.corteza, seed + 5, 0, r.h);
}

/** La copa sola: los pixeles del árbol completo que no son del tronco solo. Tronco abajo + copa arriba = el árbol. */
function crownOf(full: Raster, trunk: Raster): Raster {
  const out = createRaster(full.w, full.h);
  for (let i = 0; i < full.data.length; i += 4) {
    const same = full.data[i] === trunk.data[i] && full.data[i + 1] === trunk.data[i + 1] && full.data[i + 2] === trunk.data[i + 2] && full.data[i + 3] === trunk.data[i + 3];
    if (!same && full.data[i + 3]) out.data.set(full.data.subarray(i, i + 4), i);
  }
  return out;
}

/**
 * Anims `tronco` y `copa` de un árbol (mismo tamaño, apoyo y cuadros que idle): el juego dibuja el tronco ordenado por
 * profundidad y la copa encima, y cuando la heroína pasa detrás baja solo la copa a alfa 0.45.
 */
function splitAnims(full: Raster[], trunkRaw: Raster[], fps: number, trunkName = 'tronco') {
  // las ramas de adentro nunca se salen de la silueta del árbol
  const trunk = trunkRaw.map((t, k) => { const o = createRaster(t.w, t.h); for (let i = 3; i < t.data.length; i += 4) if (full[k].data[i]) o.data.set(t.data.subarray(i - 3, i + 1), i - 3); return o; });
  return { [trunkName]: { frames: trunk, fps, loop: true }, copa: { frames: full.map((f, i) => crownOf(f, trunk[i])), fps, loop: true } };
}

function oakPuffs(cx: number, cy: number, s: number, seed: number): Puff[] {
  const p: Puff[] = [
    { x: cx, y: cy - 6 * s, r: 15 * s },
    { x: cx - 14 * s, y: cy + 2 * s, r: 12 * s }, { x: cx + 14 * s, y: cy + 1 * s, r: 12.5 * s },
    { x: cx - 6 * s, y: cy + 10 * s, r: 12 * s }, { x: cx + 8 * s, y: cy + 11 * s, r: 11.5 * s },
    { x: cx - 8 * s, y: cy - 16 * s, r: 9.5 * s }, { x: cx + 9 * s, y: cy - 15 * s, r: 10 * s },
  ];
  return p.map((q, i) => ({ x: q.x + (hash(i, 1, seed) - 0.5) * 4 * s, y: q.y + (hash(i, 2, seed) - 0.5) * 3 * s, r: q.r * (0.9 + hash(i, 3, seed) * 0.2) }));
}

/** Roble: copa grande en nubes, tronco con raíces. variant cambia la forma; autumn = hojas cobrizas. */
export function oakV3(variant = 0, big = false, autumn = false): Flora {
  const s = big ? 1.5 : 1.18;
  const W = Math.round(96 * (big ? 1.32 : 1)), H = Math.round(116 * (big ? 1.32 : 1));
  const cx = W / 2, base = H - 6, seed = 400 + variant * 37 + (big ? 900 : 0);
  const puffs = oakPuffs(cx, H * 0.4, s, seed);
  const paint = (sw: number, crown: boolean) => {
    const r = createRaster(W, H);
    groundShadow(r, cx + 3, base - 1, 22 * s, 6 * s);
    drawTrunk(r, cx, base, Math.round(H * 0.6), 12 * s, 9 * s, RAMPS.corteza, seed, 0, 3);
    if (crown) drawCanopy(r, puffs, autumn ? RAMPS.roble_otono : RAMPS.roble, seed, sw, big ? 7 : 6);
    else innerBranches(r, cx, Math.round(H * 0.6) + 2, 16 * s, 7 * s, seed);
    return r;
  };
  const sws = swayFrames(big ? 1.6 : 1.3), frames = sws.map((v) => paint(v, true));
  return { name: `roble${big ? '_grande' : ''}${autumn ? '_otono' : ''}_${variant}`, w: W, h: H, anchor: [Math.round(cx), base], solid: [-Math.round(7 * s), -6, Math.round(14 * s), 6], anims: { idle: { frames, fps: 5, loop: true }, ...splitAnims(frames, sws.map((v) => paint(v, false)), 5) } };
}

/** Pisos de agujas: triángulos con el borde de abajo en flecos que cuelgan, luz a la izquierda, sombra del piso de arriba. */
function drawPineTiers(r: Raster, cx: number, top: number, tiers: number, tierH: number, w0: number, dw: number, ramp: string[], seed: number, sway: number, bottomY: number) {
  const R = ramp.map(hex), N = R.length;
  const W = r.w, H = r.h;
  const owner = new Int16Array(W * H).fill(-1), tone = new Float32Array(W * H);
  for (let i = 0; i < tiers; i++) {
    const yTop = top + i * tierH * 0.62, yBase = yTop + tierH, half = w0 + i * dw;
    for (let y = Math.floor(yTop); y <= yBase + 5 && y < H; y++) {
      const kk = Math.max(0, Math.min(1, (bottomY - y) / (bottomY - top)));
      const sh = sway * kk * kk;
      const f = (y - yTop) / tierH; // 0 punta, 1 base
      const hw = half * Math.min(1, f * 1.08) + 1;
      for (let x = Math.floor(cx - hw - 3 + sh); x <= cx + hw + 3 + sh; x++) {
        const lx = x - sh;
        const ax = Math.abs(lx - cx);
        if (ax > hw) continue;
        // flecos: dientes que cuelgan en la base (más largos hacia las puntas del piso)
        const tooth = 2.5 + (Math.abs(((lx + i * 2) % 5) - 2.5)) * 0.9 + (ax / hw) * 2.5 + hash(Math.floor(lx / 5), i, seed) * 1.5;
        if (y > yBase + tooth - 3.5) continue;
        if (x < 0 || x >= W) continue;
        const idx = y * W + x;
        owner[idx] = i;
        // luz: lado izquierdo y arriba del piso más claros, rayitas de agujas en diagonal
        let t = 2 + (1 - (lx - cx + hw) / (2 * hw)) * 2.6 + (1 - f) * 1.2;
        const needle = (Math.floor(lx * 0.8 + (y - yTop) * 0.55 * Math.sign(lx - cx || 1)) + i) % 3;
        if (needle === 0) t -= 0.8; else if (needle === 1 && f < 0.8) t += 0.3;
        if (y > yBase - 2) t -= 0.9;
        tone[idx] = t;
      }
    }
  }
  // sombra del piso de arriba sobre el de abajo
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = owner[y * W + x];
    if (o <= 0) continue;
    for (let d = 1; d <= 4; d++) { const yy = y - d; if (yy < 0) break; const o2 = owner[yy * W + x]; if (o2 >= 0 && o2 < o) { tone[y * W + x] -= [0, 2, 1.4, 0.8, 0.4][d]; break; } }
  }
  for (let i = 0; i < W * H; i++) if (owner[i] >= 0) setPx(r, i % W, Math.floor(i / W), R[Math.max(1, Math.min(N - 1, Math.round(tone[i])))]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (owner[y * W + x] >= 0 || alphaAt(r, x, y)) continue;
    const below = y + 1 < H && owner[(y + 1) * W + x] >= 0;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < W && Y < H && owner[Y * W + X] >= 0; })) setPx(r, x, y, below ? R[1] : R[0]);
  }
}

/** Pino oscuro: pisos de ramas en punta con flecos de agujas. */
export function pineV3(variant = 0): Flora {
  const W = 64, H = 124, cx = 32, base = H - 5, seed = 700 + variant * 53;
  const tiers = 5 + (variant % 2);
  const paint = (sw: number, crown: boolean) => {
    const r = createRaster(W, H);
    groundShadow(r, cx + 2, base - 1, 16, 4.5);
    drawTrunk(r, cx, base, base - 24, 7, 5, RAMPS.corteza, seed, 0, 2);
    if (!crown) drawTrunk(r, cx, base - 20, 14, 5, 2, RAMPS.corteza, seed, 0, 0);
    if (crown) drawPineTiers(r, cx, 4, tiers, variant % 2 ? 24 : 27, 6, variant === 2 ? 4.4 : 4.9, RAMPS.pino, seed, sw, base);
    return r;
  };
  const sws = swayFrames(1.1), frames = sws.map((v) => paint(v, true));
  return { name: `pino_${variant}`, w: W, h: H, anchor: [cx, base], solid: [-5, -5, 10, 5], anims: { idle: { frames, fps: 5, loop: true }, ...splitAnims(frames, sws.map((v) => paint(v, false)), 5) } };
}

/**
 * Árbol hechizado: tronco torcido con cara, ramas secas que se mecen, musgo colgando y unas pocas hojas violeta.
 * Anims: dormido (ojos cerrados), despierto (ojos que brillan), parpadeo.
 */
export function hauntedTree(variant = 0): Flora {
  const W = 112, H = 128, cx = 56, base = H - 6, seed = 1300 + variant * 71;
  const glow = variant % 2 ? '#7affc8' : '#ffd25a';
  const bend = variant % 2 ? -5 : 5;
  const make = (sw: number, open: number, crown = true) => {
    const r = createRaster(W, H);
    groundShadow(r, cx + 3, base - 1, 28, 7);
    if (crown) drawBranches(r, [
      { x: cx + bend - 10, y: 50, a: -2.5, len: 26, w: 8, depth: 3 },
      { x: cx + bend + 10, y: 48, a: -0.6, len: 27, w: 8, depth: 3 },
      { x: cx + bend, y: 42, a: -1.7, len: 20, w: 6, depth: 2 },
    ], RAMPS.corteza_muerta, seed, sw, base);
    // pocas hojas violeta en las puntas (variante 2: sin hojas)
    drawTrunk(r, cx, base, 44, 30, 16, RAMPS.corteza_muerta, seed, bend, 5);
    // nudos en la corteza
    for (const [dx, dy] of [[-8, 92], [7, 102], [-3, 58]]) { setPx(r, cx + bend * 0.6 + dx, dy, hex(RAMPS.corteza_muerta[0])); setPx(r, cx + bend * 0.6 + dx + 1, dy, hex(RAMPS.corteza_muerta[1])); setPx(r, cx + bend * 0.6 + dx, dy - 1, hex(RAMPS.corteza_muerta[4])); }
    treeFace(r, Math.round(cx + bend * 0.85), 74, open, glow);
    if (crown) hangingMoss(r, [[cx - 30 + bend, 40, 20], [cx - 18 + bend, 46, 14], [cx + 22 + bend, 36, 24], [cx + 32 + bend, 32, 16], [cx + 8 + bend, 44, 11], [cx - 6 + bend, 48, 9]], sw * 2.2, seed);
    return r;
  };
  const sw = swayFrames(1.8);
  const dormido = sw.map((v) => make(v, 0)), despierto = sw.map((v) => make(v, 1));
  // la cara va en el tronco: un tronco por estado y una sola copa (ramas y musgo), sincronizados por cuadro
  const { copa } = splitAnims(dormido, sw.map((v) => make(v, 0, false)), 5);
  return {
    name: `arbol_hechizado_${variant}`, w: W, h: H, anchor: [cx, base], solid: [-14, -8, 28, 8],
    anims: {
      dormido: { frames: dormido, fps: 5, loop: true },
      despierto: { frames: despierto, fps: 5, loop: true },
      parpadeo: { frames: [1, 0.5, 0, 0.5, 1].map((o) => make(0, o)), fps: 12, loop: false },
      copa,
      tronco_dormido: { frames: sw.map((v) => make(v, 0, false)), fps: 5, loop: true },
      tronco_despierto: { frames: sw.map((v) => make(v, 1, false)), fps: 5, loop: true },
      tronco_parpadeo: { frames: [1, 0.5, 0, 0.5, 1].map((o) => make(0, o, false)), fps: 12, loop: false },
    },
  };
}

/** Árbol seco (sin cara): ramas negras retorcidas, para los bordes sombríos. */
export function deadTree(variant = 0): Flora {
  const W = 80, H = 112, cx = 40, base = H - 5, seed = 1700 + variant * 29;
  const paint = (sw: number, crown: boolean) => {
    const r = createRaster(W, H);
    groundShadow(r, cx + 2, base - 1, 16, 4.5);
    if (crown) drawBranches(r, [{ x: cx, y: 46, a: -2.1, len: 20, w: 4, depth: 3 }, { x: cx, y: 44, a: -1.0, len: 22, w: 4, depth: 3 }, { x: cx + 1, y: 40, a: -1.6, len: 14, w: 3, depth: 2 }], RAMPS.corteza_muerta, seed, sw, base);
    drawTrunk(r, cx, base, 42, 9, 5, RAMPS.corteza_muerta, seed, variant ? -4 : 4, 3);
    return r;
  };
  const sws = swayFrames(1.2), frames = sws.map((v) => paint(v, true));
  return { name: `arbol_seco_${variant}`, w: W, h: H, anchor: [cx, base], solid: [-5, -5, 10, 5], anims: { idle: { frames, fps: 5, loop: true }, ...splitAnims(frames, sws.map((v) => paint(v, false)), 5) } };
}

/** Sauce llorón sombrío: copa con cortinas de hojas que se mecen. */
export function willowV3(): Flora {
  const W = 104, H = 124, cx = 52, base = H - 5, seed = 2100;
  const R = RAMPS.sauce.map(hex);
  const paint = (sw: number, crown: boolean) => {
    const r = createRaster(W, H);
    groundShadow(r, cx + 2, base - 1, 26, 6);
    drawTrunk(r, cx, base, 52, 11, 7, RAMPS.corteza, seed, 2, 3);
    if (!crown) { innerBranches(r, cx + 1, 54, 22, 6, seed); return r; }
    drawCanopy(r, [{ x: cx, y: 36, r: 24 }, { x: cx - 22, y: 44, r: 16 }, { x: cx + 22, y: 42, r: 17 }, { x: cx, y: 18, r: 15 }], RAMPS.sauce, seed, sw, 5.5);
    // cortinas
    for (let k = 0; k < 22; k++) {
      const x0 = cx - 34 + k * 3.2 + (hash(k, 1, seed) - 0.5) * 2, y0 = 38 + Math.abs(k - 10.5) * 0.8 + hash(k, 2, seed) * 4, len = 24 + hash(k, 3, seed) * 26;
      for (let s = 0; s < len; s++) {
        const x = Math.round(x0 + sw * 1.6 * (s / len) * (s / len) + Math.sin(s * 0.3 + k) * 0.6);
        const t = s < 3 ? 4 : s > len - 4 ? 2 : (k + Math.floor(s / 4)) % 3 === 0 ? 5 : 3;
        setPx(r, x, Math.round(y0 + s), R[t]);
        setPx(r, x + 1, Math.round(y0 + s), R[Math.max(1, t - 1)]);
      }
      setPx(r, Math.round(x0 + sw * 1.6), Math.round(y0 + len), R[1]);
    }
    return r;
  };
  const sws = swayFrames(1.5), frames = sws.map((v) => paint(v, true));
  return { name: 'sauce_v3', w: W, h: H, anchor: [cx, base], solid: [-7, -6, 14, 6], anims: { idle: { frames, fps: 5, loop: true }, ...splitAnims(frames, sws.map((v) => paint(v, false)), 5) } };
}

/** Arbusto en nubes (con moras o flores opcionales). */
export function bushV3(kind: 'verde' | 'moras' | 'espinas' = 'verde', variant = 0): Flora {
  const W = 40, H = 34, cx = 20, base = H - 4, seed = 2500 + variant * 13 + kind.length;
  const frames = swayFrames(0.5).map((sw) => {
    const r = createRaster(W, H);
    groundShadow(r, cx + 1, base, 15, 3.5);
    drawCanopy(r, [{ x: cx - 7, y: base - 9, r: 8.5 }, { x: cx + 7, y: base - 9, r: 8 }, { x: cx, y: base - 14, r: 9 }, { x: cx, y: base - 6, r: 8 }], kind === 'espinas' ? RAMPS.hechizado : RAMPS.arbusto, seed, sw, 3.4);
    if (kind === 'moras') for (let i = 0; i < 6; i++) { const x = Math.round(cx - 10 + hash(i, 1, seed) * 20), y = Math.round(base - 18 + hash(i, 2, seed) * 12); setPx(r, x, y, [120, 60, 200]); setPx(r, x + 1, y, [80, 40, 150]); setPx(r, x, y - 1, [200, 170, 255]); }
    if (kind === 'espinas') for (let i = 0; i < 8; i++) { const x = Math.round(cx - 12 + hash(i, 1, seed) * 24), y = Math.round(base - 20 + hash(i, 2, seed) * 14); setPx(r, x, y, [200, 190, 210]); }
    return r;
  });
  return { name: `arbusto_${kind}_${variant}`, w: W, h: H, anchor: [cx, base], solid: [-12, -5, 24, 5], anims: { idle: { frames, fps: 4, loop: true } } };
}

/** Toda la flora nueva. */
export function floraV3(): Flora[] {
  return [
    oakV3(0), oakV3(1), oakV3(2), oakV3(0, true), oakV3(1, false, true),
    pineV3(0), pineV3(1), pineV3(2),
    hauntedTree(0), hauntedTree(1), hauntedTree(2), deadTree(0), deadTree(1),
    willowV3(), bushV3('verde', 0), bushV3('verde', 1), bushV3('moras', 0), bushV3('espinas', 0), grandOakV3(),
  ];
}

/** El Abuelo Roble v3: roble gigante con cara amable (ojos cerrados contentos), raíces enormes y luciérnagas. */
export function grandOakV3(): Flora {
  const W = 240, H = 228, cx = 120, base = H - 8, seed = 4242;
  const puffs = oakPuffs(cx, 72, 3.3, seed);
  /** smile: 0 = ojos cerrados contentos (como siempre); hasta 1 = ojos abiertos con brillo y sonrisa grande. t: hojitas que caen */
  const paint = (sw: number, crown: boolean, smile = 0, t = -1) => {
    const r = createRaster(W, H);
    groundShadow(r, cx + 6, base - 2, 70, 15);
    drawTrunk(r, cx, base, 118, 54, 34, RAMPS.corteza, seed, 0, 8);
    if (crown) drawCanopy(r, puffs, RAMPS.roble, seed, sw * 0.6, 9);
    else innerBranches(r, cx, 122, 48, 22, seed);
    // cara: ojos cerrados contentos, mejillas y sonrisa (talladas, con borde claro para que se lean)
    const dark: RGB = [20, 13, 10], rim: RGB = [140, 112, 78];
    const open = Math.max(0, Math.min(1, (smile - 0.3) / 0.4));
    for (const s of [-1, 1]) {
      const ex = cx + s * 12, ey = 168;
      if (open === 0) {
        for (let dx = -6; dx <= 6; dx++) { const y = ey - Math.round(Math.sqrt(Math.max(0, 36 - dx * dx)) * 0.55); setPx(r, ex + dx, y, dark); setPx(r, ex + dx, y + 1, dark); setPx(r, ex + dx, y + 2, rim); }
      } else {
        // ojo abierto: hueco ovalado que se abre, con un brillo cálido y el borde claro arriba
        const ry = 1 + open * 3.4;
        for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) if ((dx * dx) / 25 + (dy * dy) / (ry * ry) <= 1) setPx(r, ex + dx, ey - 2 + dy, dark);
        for (let dx = -5; dx <= 5; dx++) setPx(r, ex + dx, ey - 3 - Math.round(ry) - Math.round(Math.abs(dx) * -0.2), rim);
        if (open > 0.5) { setPx(r, ex - 2, ey - 4, [255, 236, 190]); setPx(r, ex - 1, ey - 4, [255, 214, 150]); setPx(r, ex - 2, ey - 3, [255, 214, 150]); }
      }
      const blush = 150 + Math.round(smile * 80);
      for (let dx = -3; dx <= 3; dx++) for (let dy = -1; dy <= 1; dy++) setPx(r, ex + s * 5 + dx, ey + 7 + dy, [190, 90, 80], blush);
    }
    const mw = 9 + Math.round(smile * 4), depth = 0.5 + smile * 0.25;
    for (let dx = -mw; dx <= mw; dx++) { const y = 182 + Math.round(Math.sqrt(Math.max(0, mw * mw - dx * dx)) * depth); setPx(r, cx + dx, y, dark); setPx(r, cx + dx, y + 1, dark); setPx(r, cx + dx, y - 1, rim); }
    // hojitas que caen de la copa cuando sonríe
    if (t >= 0) for (let k = 0; k < 10; k++) {
      const x = Math.round(cx - 70 + k * 15 + Math.sin(t * 6 + k) * 4), y = Math.round(96 + hash(k, 3, seed) * 20 + t * 90);
      const c: RGB = k % 3 ? [122, 164, 102] : [196, 154, 88];
      setPx(r, x, y, c); setPx(r, x + 1, y, c); setPx(r, x, y + 1, [40, 60, 40]);
    }
    return r;
  };
  const sws = swayFrames(1.2), frames = sws.map((v) => paint(v, true));
  // sonreir: 8 cuadros sin bucle (con la copa quieta, igual al cuadro 0 de `copa`)
  const sm = [0, 0.2, 0.4, 0.6, 0.8, 1, 1, 0.9];
  return {
    name: 'abuelo_roble_v3', w: W, h: H, anchor: [cx, base], solid: [-28, -16, 56, 16],
    anims: {
      idle: { frames, fps: 4, loop: true }, ...splitAnims(frames, sws.map((v) => paint(v, false)), 4),
      sonreir: { frames: sm.map((v, f) => paint(0, true, v, f / 7)), fps: 8, loop: false },
      tronco_sonreir: { frames: sm.map((v, f) => paint(0, false, v, f / 7)), fps: 8, loop: false },
    },
  };
}

/**
 * Corrección de color sombría para los objetos de la paleta vieja: menos saturación, más oscuro y frío.
 * Lo que brilla (fuego, cristales, runas: pixeles muy claros y saturados) queda igual.
 */
export function gloomGrade(r: Raster, k = 1): Raster {
  const out = createRaster(r.w, r.h);
  for (let i = 0; i < r.data.length; i += 4) {
    const R = r.data[i], G = r.data[i + 1], B = r.data[i + 2], A = r.data[i + 3];
    if (!A) continue;
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B), sat = mx ? (mx - mn) / mx : 0;
    if (mx > 225 && sat > 0.35) { out.data.set([R, G, B, A], i); continue; }
    const l = R * 0.3 + G * 0.59 + B * 0.11;
    const d = 0.32 * k, m = 1 - 0.26 * k;
    out.data[i] = (R * (1 - d) + l * d) * m * 0.92;
    out.data[i + 1] = (G * (1 - d) + l * d) * m * 0.98;
    out.data[i + 2] = Math.min(255, (B * (1 - d) + l * d) * m * 1.1);
    out.data[i + 3] = A;
  }
  return out;
}
