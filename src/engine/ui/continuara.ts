import { createRaster, type Raster } from '../core/raster';

/**
 * Ilustración de "Continuará" (960 x 540): una escalera de piedra que baja al abismo y, al fondo, la luz del portal.
 * Se pinta a 480 x 270 con tramado ordenado (sin degradés suaves, para que sea pixel art) y se agranda x2, el mismo
 * tamaño de pixel que el juego en zoom 2. Sin texto: el juego escribe encima con su fuente (así se traduce).
 */

type RGB = [number, number, number];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const hash = (x: number, y: number, s: number) => { let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const mixC = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Rampa de piedra fría (sombra violeta) a piedra iluminada por el portal (azul claro). */
const STONE: RGB[] = [[10, 9, 16], [20, 18, 30], [32, 30, 48], [46, 46, 70], [64, 70, 102], [92, 108, 150], [140, 170, 214]];
const pick = (ramp: RGB[], v: number, x: number, y: number) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(v * (ramp.length - 1) + BAYER[(y & 3) * 4 + (x & 3)])))];

export function continuara(): Raster {
  const W = 480, H = 270;
  const img = createRaster(W, H);
  const set = (x: number, y: number, c: RGB) => { if (x >= 0 && y >= 0 && x < W && y < H) img.data.set([Math.round(c[0]), Math.round(c[1]), Math.round(c[2]), 255], (y * W + x) * 4); };
  const VX = 240, VY = 118; // el portal
  // luz del portal: cuánto llega a cada punto (más cerca, más luz)
  const light = (x: number, y: number) => Math.max(0, 1 - Math.hypot((x - VX) / 210, (y - VY) / 150));

  // 1. fondo: roca de la caverna con grietas y vetas
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = hash(x >> 2, y >> 2, 1) * 0.12 + hash(x >> 3, y >> 3, 2) * 0.1;
    set(x, y, pick(STONE, Math.min(1, 0.08 + n + light(x, y) * 0.55), x, y));
  }

  // 2. escalera: 13 escalones que se angostan hacia el portal (de abajo, cerca, hacia arriba, lejos)
  const N = 13;
  for (let i = N - 1; i >= 0; i--) {
    const z0 = i / N, z1 = (i + 1) / N;
    const yA = H - Math.pow(z0, 0.75) * (H - VY - 26), yB = H - Math.pow(z1, 0.75) * (H - VY - 26);
    const half = (z: number) => 190 * (1 - z) + 34 * z;
    for (let y = Math.floor(yB); y <= Math.ceil(yA); y++) {
      const t = (yA - y) / Math.max(1, yA - yB); // 0 abajo del escalón, 1 arriba
      const z = z0 + (z1 - z0) * t, hw = half(z);
      const riser = t < 0.42; // contrahuella (cara vertical, más oscura) y huella (pisada, más clara)
      for (let x = Math.floor(VX - hw); x <= Math.ceil(VX + hw); x++) {
        const edge = Math.abs(x - VX) > hw - 2;
        const lit = 0.18 + z * 0.55 + (riser ? -0.12 : 0.1) + (t > 0.9 ? 0.12 : 0) + (hash(x >> 2, i, 5) - 0.5) * 0.08;
        let c = pick(STONE, Math.max(0, Math.min(1, edge ? lit - 0.2 : lit)), x, y);
        // grietas y piedras sueltas en la pisada
        if (!riser && hash(x, y, 9 + i) > 0.985) c = STONE[1];
        set(x, y, c);
      }
    }
  }

  // 3. paredes con bloques de piedra a los lados de la escalera
  for (const side of [-1, 1]) {
    for (let y = 0; y < H; y++) {
      const z = Math.max(0, Math.min(1, (H - y) / (H - VY)));
      const inner = VX + side * (190 * (1 - Math.pow(z, 1.33)) + 34 * Math.pow(z, 1.33) + 4);
      for (let k = 0; k < 70; k++) {
        const x = Math.round(inner + side * k);
        const row = Math.floor(y / (6 + (1 - z) * 10)), brick = Math.floor((k + row * 7) / (10 + (1 - z) * 16));
        const mortar = y % Math.round(6 + (1 - z) * 10) === 0 || (k + row * 7) % Math.round(10 + (1 - z) * 16) === 0;
        const v = 0.1 + light(x, y) * 0.6 * (1 - k / 90) + (hash(brick, row, 11 + side) - 0.5) * 0.1 - (mortar ? 0.08 : 0);
        set(x, y, pick(STONE, Math.max(0, v), x, y));
      }
    }
  }

  // 4. el portal: aro que brilla, remolino oscuro adentro y halo azul-violeta
  for (let y = VY - 70; y <= VY + 70; y++) for (let x = VX - 70; x <= VX + 70; x++) {
    const dx = (x - VX) / 30, dy = (y - VY) / 42, d = Math.hypot(dx, dy);
    if (d < 0.92) {
      const a = Math.atan2(dy, dx) + d * 5;
      const swirl = 0.5 + 0.5 * Math.sin(a * 3);
      set(x, y, pick([[8, 6, 24], [26, 16, 64], [58, 34, 120], [96, 70, 190], [150, 130, 240]], 0.15 + swirl * 0.35 + (1 - d) * 0.3, x, y));
    } else if (d < 1.12) {
      set(x, y, pick([[90, 140, 230], [140, 200, 255], [220, 240, 255]], 1 - Math.abs(d - 1.02) * 7, x, y));
    } else if (d < 2.2) {
      // halo: se mezcla con lo que hay (luz)
      const k = Math.pow(1 - (d - 1.12) / 1.08, 2) * 0.55;
      const i = (y * W + x) * 4;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const base: RGB = [img.data[i], img.data[i + 1], img.data[i + 2]];
      const c = mixC(base, [120, 150, 255], k);
      const q = BAYER[(y & 3) * 4 + (x & 3)] > 0.5 ? 1 : 0.92;
      set(x, y, [c[0] * q, c[1] * q, c[2] * q]);
    }
  }

  // 5. pilares con runas a los dos lados del portal
  for (const side of [-1, 1]) {
    const px = VX + side * 58;
    for (let y = VY - 64; y <= VY + 30; y++) for (let x = px - 7; x <= px + 7; x++) {
      const lit = 0.25 + (side < 0 ? (x - px + 7) / 14 : (px + 7 - x) / 14) * 0.45;
      set(x, y, pick(STONE, lit, x, y));
    }
    for (let k = 0; k < 4; k++) { const ry = VY - 50 + k * 20; for (const [ox, oy] of [[0, 0], [-1, 1], [1, 1], [0, 2], [0, 3]]) set(px + ox, ry + oy, [150, 220, 255]); }
  }

  // 6. bruma baja sobre los escalones lejanos y raíces que cuelgan arriba
  for (let y = VY + 10; y < VY + 90; y++) for (let x = 0; x < W; x++) {
    const k = Math.max(0, 1 - Math.abs(y - (VY + 40)) / 50) * (0.5 + 0.5 * Math.sin(x * 0.05 + y * 0.11)) * 0.35;
    if (k * 1.3 > BAYER[(y & 3) * 4 + (x & 3)] + 0.2) { const i = (y * W + x) * 4; set(x, y, mixC([img.data[i], img.data[i + 1], img.data[i + 2]], [130, 140, 190], 0.35)); }
  }
  for (let k = 0; k < 26; k++) {
    const x0 = Math.floor(hash(k, 1, 21) * W), len = 12 + Math.floor(hash(k, 2, 21) * 40);
    for (let s = 0; s < len; s++) { const x = Math.round(x0 + Math.sin(s * 0.25 + k) * 1.5); set(x, s, s > len - 3 ? [40, 70, 50] : [24, 36, 28]); }
  }

  // 7. chispas de luz que suben del portal
  for (let k = 0; k < 40; k++) {
    const a = hash(k, 3, 31) * Math.PI * 2, d = 40 + hash(k, 4, 31) * 120;
    const x = Math.round(VX + Math.cos(a) * d * 1.3), y = Math.round(VY + Math.sin(a) * d * 0.6 - hash(k, 5, 31) * 30);
    set(x, y, hash(k, 6, 31) > 0.5 ? [200, 230, 255] : [190, 160, 255]);
  }

  // agrandar x2 (pixel art nítido)
  const out = createRaster(W * 2, H * 2);
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) { const s = ((y >> 1) * W + (x >> 1)) * 4; out.data.set(img.data.subarray(s, s + 4), (y * out.w + x) * 4); }
  return out;
}
