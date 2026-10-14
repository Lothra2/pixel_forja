import { createRaster, type Raster } from '../core/raster';
import type { WorldObject } from './objects';
import { hash, put, glow, tone, outline } from './puertoObjects';
import { mixC, one, grounded, ellipse, line, chainLinks } from './fraguaObjects';

/**
 * Mundo 7: El Corazón Helado (encargo F13, parte 2). Detrás de la Puerta Negra no hay fuego: el fondo del abismo está
 * congelado. Un lago de hielo negro con gigantes adentro mirando hacia arriba, columnas de hielo, cadenas con escarcha,
 * una ventisca que nunca para y, en el centro, el trono del Diablo: mitad hielo y mitad brasa.
 *
 * Como en la Fragua: sin sombra horneada con dirección, cada objeto trae solo su sombra de contacto al pie. La luz es de
 * las hogueras de hueso, los braseros de la arena y los ojos y grietas del Diablo. Por eso el hielo lleva escarcha clara
 * arriba (la poca luz fría que queda) y un filo rojo apagado abajo a la derecha (el rebote de las brasas): el contraste
 * del piso es el azul negro del hielo contra el rojo.
 */

export const HIELO = {
  hielo: ['#05070c', '#0c1220', '#16203a', '#22304a', '#2e3e58', '#3a4a62'],
  escarcha: ['#6a8aac', '#9ab8d8', '#b8d0ea', '#d0e4f6', '#e8f4ff'],
  nieve: ['#2e343c', '#3a424c', '#4e5864', '#6a7480', '#8a94a0', '#aab4c0'],
  roca: ['#08090c', '#0e1014', '#14161c', '#1e2028', '#2a2e38', '#383e4a'],
  brasa: ['#5a1000', '#8a2000', '#c03a10', '#ff6a20', '#ffa050', '#ffe0a0'],
  ojo: '#ff2a1a',
  fuego: ['#8a3a10', '#d06020', '#ffb060', '#ffe0a0', '#fff6d8'],
  hueso: ['#2a2620', '#4a443c', '#6e665a', '#968c7c', '#bcb2a0', '#ddd4c2'],
  hierro: ['#0a0c10', '#161a22', '#242a34', '#363e4a', '#4e5866'],
  /** la piel de los gigantes de adentro del hielo: piedra azul gris, sin color de carne */
  gigante: ['#0e1420', '#1a2232', '#283246', '#3a465c', '#4e5c74', '#66748c'],
};
const HI = HIELO.hielo, E = HIELO.escarcha, N = HIELO.nieve, BR = HIELO.brasa, FU = HIELO.fuego, HU = HIELO.hueso, FE = HIELO.hierro, GI = HIELO.gigante;

// ---------------------------------------------------------------- ayudas

/** Un montón de nieve sucia desparejo (ruido suave, sin ondas que se repitan) entre x0 y x1 con el piso en `base`. */
export function snowDrift(r: Raster, x0: number, x1: number, base: number, hmax: number, seed: number) {
  const cx = (x0 + x1) / 2, hw = (x1 - x0) / 2;
  for (let x = Math.floor(x0); x <= x1; x++) {
    const u = (x - cx) / hw, gx = x / 7, i0 = Math.floor(gx), fx = gx - i0, sm = fx * fx * (3 - 2 * fx);
    const n = hash(i0, 0, seed) * (1 - sm) + hash(i0 + 1, 0, seed) * sm;
    const h = Math.max(1, (1 - u * u) * hmax * (0.55 + n * 0.6));
    for (let y = base - h; y < base + 2; y++) put(r, x, y, tone(HIELO.nieve, 0.82 - (y - (base - h)) / (h + 3) * 0.6 - u * 0.12, x, Math.round(y), true));
  }
}

/** Grietas: distancia al borde entre celdas de Voronoi (0 en la grieta). Para las venas de brasa y el hielo quebrado. */
export function crackDist(x: number, y: number, sc: number, seed: number): number {
  const gx = x / sc, gy = y / sc, cx0 = Math.floor(gx), cy0 = Math.floor(gy);
  let d1 = 9, d2 = 9;
  for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
    const qx = cx0 + k, qy = cy0 + j, px = qx + hash(qx, qy, seed), py = qy + hash(qy, qx, seed + 1);
    const d = Math.hypot(gx - px, gy - py);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return (d2 - d1) * sc;
}

/** Escarcha: cristalitos claros sobre lo que mira para arriba (con aire arriba) y algún brillo blanco. */
export function frostCap(r: Raster, amount: number, seed: number, f = 0) {
  const W = r.w;
  for (let y = 1; y < r.h; y++) for (let x = 0; x < W; x++) {
    const k = (y * W + x) * 4;
    if (r.data[k + 3] < 200 || r.data[k - W * 4 + 3] > 0) continue;
    const h = hash(x, y, seed);
    if (h < amount) {
      put(r, x, y, h < amount * 0.2 && (x + f * 3) % 7 === 0 ? '#ffffff' : hash(x, y, seed + 1) > 0.5 ? E[4] : E[2]);
      if (hash(x, y, seed + 2) > 0.5 && y + 1 < r.h) put(r, x, y + 1, E[1], 200);
    }
  }
}

/**
 * El rebote de las brasas: los pixeles del borde de abajo y de la derecha se tiñen de rojo apagado. Muy poco: el hielo
 * sigue siendo azul negro, pero se siente que hay fuego en el piso.
 */
export function emberRim(r: Raster, k = 0.3, col = '#c03a10') {
  const W = r.w, H = r.h, a0 = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) a0[i] = r.data[i * 4 + 3] > 150 ? 1 : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!a0[y * W + x]) continue;
    const open = (x + 1 < W && !a0[y * W + x + 1]) || (y + 1 < H && !a0[(y + 1) * W + x]);
    if (open) put(r, x, y, col, Math.round(255 * k));
  }
}

/** El filo frío de arriba a la izquierda: lo que tiene aire arriba o a la izquierda se aclara un tono de escarcha. */
export function coldEdge(r: Raster, k = 0.45) {
  const W = r.w, H = r.h, a0 = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) a0[i] = r.data[i * 4 + 3] > 150 ? 1 : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!a0[y * W + x]) continue;
    if ((x > 0 && !a0[y * W + x - 1]) || (y > 0 && !a0[(y - 1) * W + x])) put(r, x, y, E[1], Math.round(255 * k));
  }
}

/**
 * Una lengua de fuego: gota que sube desde (cx, by) con medio ancho hw y alto h, que se mece con `sw`. El centro de
 * abajo es casi blanco, el borde naranja y la punta roja.
 */
export function flameTongue(r: Raster, cx: number, by: number, hw: number, h: number, sw: number, pal: string[] = FU, a = 255) {
  for (let t = 0; t < h; t++) {
    const u = t / h, w = hw * Math.sin(Math.PI * Math.min(1, (1 - u) ** 0.8 * 1.02)) * (u < 0.15 ? 0.7 + u * 2 : 1);
    const x0 = cx + Math.sin(u * Math.PI) * sw * u;
    for (let x = Math.floor(x0 - w); x <= x0 + w; x++) {
      const d = Math.abs(x + 0.5 - x0) / Math.max(0.6, w);
      let l = 1 - d * 0.75 - u * 0.65;
      if (u < 0.35 && d < 0.4) l += 0.35;
      put(r, x, by - t, tone(pal, l, x, by - t), a);
    }
  }
}

/** Un hueso largo (fémur): caña con las dos cabezas redondas, de (x0, y0) a (x1, y1), con luz de arriba. */
export function boneLine(r: Raster, x0: number, y0: number, x1: number, y1: number, th = 2, pal: string[] = HU) {
  const len = Math.hypot(x1 - x0, y1 - y0), nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
  const n = Math.ceil(len * 1.6);
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
    const knob = t < 0.1 || t > 0.9 ? 1.6 : 1;
    for (let s = -th * knob; s <= th * knob; s += 0.5) {
      const l = 0.62 - (s / (th * knob)) * (ny < 0 ? -0.3 : 0.3) + (t < 0.1 || t > 0.9 ? 0.08 : 0);
      put(r, x + nx * s, y + ny * s, tone(pal, l, Math.round(x), Math.round(y)));
    }
  }
}

/** Calavera de demonio de piedra (sin sangre): cráneo con dos cuernos, cuencas hondas y colmillos de piedra. */
export function demonSkull(r: Raster, cx: number, cy: number, s: number, opts: { eyes?: string | null; pal?: string[]; frost?: number; seed?: number } = {}) {
  const P = opts.pal ?? ['#14161c', '#22252e', '#343844', '#4a505e', '#646c7c', '#7e8898'];
  // los cuernos: salen de los costados de arriba, curvos hacia afuera y arriba
  for (const sx of [-1, 1]) {
    for (let t = 0; t <= 1; t += 0.02) {
      const ang = -0.3 - t * 1.4, rr = s * (0.7 + t * 0.55);
      const x = cx + sx * (s * 0.55 + Math.cos(ang) * rr * 0.55 + t * s * 0.25), y = cy - s * 0.35 + Math.sin(ang) * rr * 0.6 - t * s * 0.4;
      const w = s * 0.24 * (1 - t * 0.85);
      for (let q = -w; q <= w; q += 0.5) put(r, x + q * 0.6, y + q * 0.3, tone(P, 0.55 + (q / Math.max(0.5, w)) * -0.25 * sx + t * 0.15, Math.round(x), Math.round(y)));
    }
  }
  // el cráneo: domo ancho arriba, pómulos y la mandíbula angosta con colmillos
  ellipse(r, cx, cy - s * 0.12, s * 0.62, s * 0.55, (u, v, x, y) => tone(P, 0.62 - v * 0.35 - u * 0.15 + (hash(x >> 1, y >> 1, opts.seed ?? 301) - 0.5) * 0.12, x, y));
  ellipse(r, cx, cy + s * 0.32, s * 0.4, s * 0.3, (u, v, x, y) => tone(P, 0.48 - v * 0.3 - u * 0.15, x, y));
  // la frente fruncida: una raya oscura en V
  for (let t = -1; t <= 1; t += 0.05) put(r, cx + t * s * 0.32, cy - s * 0.2 - Math.abs(t) * s * 0.12, P[1]);
  // las cuencas: hondas y oblicuas (enojadas); si `eyes` trae color, brillan
  for (const sx of [-1, 1]) ellipse(r, cx + sx * s * 0.24, cy - s * 0.02, s * 0.17, s * 0.12, (u, v) => (opts.eyes ? (u * sx > 0.2 || v > 0.3 ? '#5a0a08' : opts.eyes) : v > 0.2 ? P[0] : '#05060a'));
  // la nariz: dos tajitos
  put(r, cx - 1, cy + s * 0.16, P[0]); put(r, cx + 1, cy + s * 0.16, P[0]);
  // los colmillos de piedra
  for (const sx of [-1, 1]) for (let t = 0; t < s * 0.22; t++) { const w = (1 - t / (s * 0.22)) * s * 0.06 + 0.4; for (let q = -w; q <= w; q += 0.5) put(r, cx + sx * s * 0.17 + q, cy + s * 0.42 + t, tone(P, 0.85 - t * 0.04, 0, 0)); }
  for (let x = -s * 0.1; x <= s * 0.1; x += 1) put(r, cx + x, cy + s * 0.44, P[0]);
  if (opts.eyes) for (const sx of [-1, 1]) glow(r, cx + sx * s * 0.24, cy, s * 0.4, opts.eyes, 0.9);
}

// ---------------------------------------------------------------- la hoguera de hueso (la fogata del piso)

/**
 * Hoguera de hueso (64 x 64, `idle` 8 cuadros a 8 fps, sólida 32 x 12): huesos largos de gigante apoyados en punta
 * como una carpa, un anillo de piedras de hielo negro con escarcha y una calaverita de demonio de piedra adelante. El
 * fuego es cálido (#ffb060) y es lo único tibio del piso: la nieve de alrededor está derretida y oscura.
 */
function boneFire(f: number): Raster {
  const r = createRaster(64, 64), cx = 32, by = 52;
  // la nieve derretida alrededor (mancha húmeda oscura con reflejo cálido)
  ellipse(r, cx, by + 3, 30, 8, (u, v, x, y) => (hash(x, y, 311) > 0.92 ? '#4a3020' : u * u + v * v > 0.7 ? '#1a1c22' : '#120e10'), 200);
  // las brasas del fondo de la hoguera
  ellipse(r, cx, by - 1, 13, 4, (_u, v, x, y) => tone(BR, 0.55 + (hash(x, y + f, 312) - 0.5) * 0.6 - v * 0.2, x, y));
  // los huesos de atrás de la carpa
  boneLine(r, 16, by, 33, 20, 1.3, HU.slice(0, 5)); boneLine(r, 48, by, 31, 20, 1.3, HU.slice(0, 5));
  // el fuego: tres lenguas que se mecen y una del medio más alta
  const sw = (k: number) => Math.sin((f / 8) * Math.PI * 2 + k * 1.9) * 3;
  const hh = (k: number) => Math.sin((f / 8) * Math.PI * 2 * (k % 2 ? 2 : 1) + k) * 3;
  flameTongue(r, cx - 7, by, 5, 17 + hh(1), sw(1));
  flameTongue(r, cx + 7, by, 5, 16 + hh(2), sw(2));
  flameTongue(r, cx, by, 8, 28 + hh(0), sw(0));
  flameTongue(r, cx + 1, by - 2, 3, 14 + hh(3), sw(3), [FU[2], FU[3], FU[4], '#ffffff']);
  // los huesos de adelante, cruzados sobre el fuego
  boneLine(r, 10, by + 3, 28, by - 12, 1.6, HU.slice(0, 5)); boneLine(r, 54, by + 3, 36, by - 12, 1.6, HU.slice(0, 5));
  // el anillo de piedras de hielo negro
  for (let k = 0; k < 9; k++) {
    const a = Math.PI * (0.05 + (k / 8) * 0.9), x = cx + Math.cos(a) * 24, y = by + 2 + Math.sin(a) * 6;
    ellipse(r, x, y, 4.6 + hash(k, 1, 313) * 2, 3.6, (u, v, xx, yy) => tone(HI, 0.75 - v * 0.5 - u * 0.2, xx, yy));
    put(r, x - 2, y - 3, E[3]); put(r, x - 1, y - 3, E[2]);
  }
  // la calaverita de demonio adelante, de piedra
  demonSkull(r, cx, by + 6, 6, { seed: 314 });
  // chispas que suben
  for (let i = 0; i < 5; i++) { const t = ((f + i * 3) % 8) / 8; put(r, cx + (hash(i, 1, 315) - 0.5) * 18 + Math.sin(t * 6 + i) * 2, by - 26 - t * 22, t < 0.5 ? FU[4] : FU[2], Math.round(255 * (1 - t))); }
  outline(r, '#030406');
  glow(r, cx, by - 14, 30, FU[2], 1.1 + 0.15 * Math.sin(f));
  return r;
}

function boneFireObject(): WorldObject {
  const frames = Array.from({ length: 8 }, (_, f) => boneFire(f));
  return grounded({ name: 'hoguera_hueso', w: 64, h: 64, anchor: [32, 58], solid: [-16, -10, 32, 12], light: { color: '#ffb060', radius: 240, flicker: true, dy: 18 }, anims: { idle: { frames, fps: 8, loop: true } } }, frames[0], { spread: 4 });
}

// ---------------------------------------------------------------- las columnas de hielo (refugios de la ventisca)

/**
 * Columna de hielo (64 x 160, 1 cuadro, sólida en la base): un pilar de hielo negro en facetas, con vetas y burbujas
 * adentro, escarcha arriba de cada saliente y el pie hundido en un montón de nieve. Detrás de ella la ventisca no
 * llega. Variantes: 0 entera y alta, 1 con una cadena con escarcha enroscada, 2 quebrada arriba con carámbanos, 3 con
 * una espada de hueso congelada adentro.
 */
function iceColumn(v: number): WorldObject {
  const r = createRaster(64, 160), cx = 32, base = 152;
  const P = ['#05070c', '#0c1220', '#16203a', '#22304a', '#2e3e58', '#3a4a62', '#4e6480', '#6a8aac', '#9ab8d8'];
  /** un prisma de hielo: tres caras (la izquierda con luz, la de frente, la derecha en sombra) y la punta */
  const prism = (x0: number, by: number, hw: number, h: number, lean: number, tip: number, seed: number, broken = false) => {
    for (let y = by - h; y < by; y++) {
      const t = (by - y) / h, xc = x0 + lean * t * h, w = hw * (1 - t * 0.12) * (broken ? 1 : y < by - h + tip ? (y - (by - h)) / tip : 1);
      if (w < 0.5) continue;
      for (let x = Math.floor(xc - w); x <= xc + w; x++) {
        const u = (x + 0.5 - xc) / w;
        let l = u < -0.45 ? 0.82 : u < 0.35 ? 0.55 : 0.25;
        // las aristas claras entre caras
        if (Math.abs(u + 0.45) < 0.09 || Math.abs(u - 0.35) < 0.07) l = 0.95;
        // el corazón del hielo: una franja más clara y borrosa que baja por la cara de frente
        if (u > -0.3 && u < 0.2) l += 0.12 * Math.sin(y * 0.05 + seed);
        // vetas oscuras en diagonal y burbujas
        if (Math.abs(((y + x * 0.6 + seed * 13) % 37) - 18) < 0.8 && u > -0.45) l -= 0.3;
        l += (hash(x >> 1, y >> 2, seed) - 0.5) * 0.08 - (1 - t) * 0.1;
        let c = tone(P, l, x, y, true);
        if (hash(x, y, seed + 1) > 0.992) c = E[3];
        put(r, x, y, c);
      }
    }
    // la escarcha arriba de la punta
    if (broken) for (let x = Math.floor(x0 + lean * h - hw); x <= x0 + lean * h + hw; x++) { const cut = by - h + Math.round(Math.abs(Math.sin(x * 0.9 + seed)) * 4); for (let y = cut - 1; y < cut + 2; y++) put(r, x, y, y < cut + 1 ? E[4] : E[2]); }
  };
  const top = v === 2 ? 70 : 128 + v * 4;
  // los cristales chicos de atrás, el grande y uno chico de adelante apoyado
  prism(cx + 13, base - 2, 6, 44 + v * 6, 0.12, 12, 381 + v);
  prism(cx, base, 15, Math.min(140, top), v === 3 ? -0.03 : 0.02, 22, 383 + v, v === 2);
  prism(cx - 15, base + 1, 5, 30 + v * 4, -0.18, 9, 385 + v);
  // carámbanos de la punta quebrada
  if (v === 2) for (let k = 0; k < 5; k++) { const x = cx - 10 + k * 5, y0 = base - top + 6, len = 4 + hash(k, 1, 386) * 7; for (let t = 0; t < len; t++) put(r, x, y0 + t, t > len - 2 ? '#ffffff' : E[1], 220); }
  // la cadena con escarcha enroscada (variante 1): eslabones de hierro frío
  if (v === 1) for (let k = 0; k < 4; k++) {
    const y0 = 50 + k * 24;
    for (let t = 0; t <= 1; t += 0.06) { const x = cx - 15 + t * 30, y = y0 + t * 12; ellipse(r, x, y, 2.4, 2, (u, vv) => (u * u + vv * vv < 0.3 ? null : vv < -0.2 ? E[2] : u > 0.3 ? FE[1] : FE[3])); }
  }
  // la espada de hueso congelada adentro (variante 3): se ve borrosa detrás del hielo
  if (v === 3) for (let y = 44; y < 120; y++) for (let x = -3; x <= 3; x++) { const blade = y < 102 ? Math.abs(x) <= 2 - (y < 54 ? (54 - y) * 0.25 : 0) : y < 106 ? Math.abs(x) <= 3 : Math.abs(x) <= 1; if (blade) put(r, cx + x - 2, y, y >= 102 ? '#4a3a2a' : x < 0 ? '#9aaabb' : '#6a7a8a', 130); }
  // el montón de nieve sucia al pie, desparejo
  snowDrift(r, cx - 26, cx + 26, base + 1, 9, 387 + v);
  outline(r, '#030406');
  frostCap(r, 0.7, 324 + v);
  emberRim(r, 0.16);
  return grounded({ name: `columna_hielo_${v}`, w: 64, h: 160, anchor: [32, 154], solid: [-17, -12, 34, 14], light: { color: '#6a8aac', radius: 70, pulse: true, dy: 70 }, anims: one(r) }, r, { spread: 4 });
}

// ---------------------------------------------------------------- los gigantes congelados

/**
 * Gigante congelado (192 x 160, sólido): un bloque de hielo negro que sale del lago, y adentro un gigante de piedra
 * azul gris mirando hacia arriba. Se ve a través del hielo, borroso y teñido. `idle` (1) y `respira` (2 cuadros a 1
 * fps: casi nada se mueve, solo un ojo que se corre). Inquietantes, no asquerosos. Variantes:
 * - 0: la cara entera mirando arriba, con la mano abierta pegada al hielo y dos dedos afuera.
 * - 1: de hombros para arriba, el brazo estirado hacia arriba que sale del hielo hasta el codo.
 * - 2: de costado, encogido, con un cuerno roto y el ojo grande abierto.
 */
function frozenGiant(v: number, eye: number): Raster {
  const W = 192, H = 160, r = createRaster(W, H), cx = 96, base = 154;
  // la silueta del bloque de hielo: un montón quebrado con facetas
  const blockTop = (x: number) => {
    const u = (x - cx) / 86;
    if (Math.abs(u) > 1) return H;
    return base - (1 - u * u) ** 0.7 * (v === 1 ? 70 : 84) - Math.abs(Math.sin(x * 0.09 + v * 2)) * 10 - (hash(Math.floor(x / 11), v, 331) - 0.5) * 8;
  };
  const inBlock = (x: number, y: number) => y >= blockTop(x) && y < base + 2;
  // el gigante adentro (y lo que sale): se dibuja en su propia capa
  const g = createRaster(W, H);
  const gs = (x: number, y: number, l: number) => put(g, x, y, tone(GI, l, x, y, true));
  if (v === 0) {
    // la cara grande mirando arriba (vista desde arriba en 3/4: la frente atrás, la barbilla adelante)
    ellipse(g, cx - 6, 110, 46, 32, (u, vv, x, y) => tone(GI, 0.55 - vv * 0.25 - u * 0.2 + (hash(x >> 2, y >> 2, 332) - 0.5) * 0.1, x, y, true));
    // las cejas pesadas, la nariz ancha y la boca entreabierta (una línea oscura)
    // las cuencas hundidas (sin cejas: la cara está quieta, mirando)
    for (const sx of [-1, 1]) ellipse(g, cx - 6 + sx * 17, 103, 10, 7.5, (_u, vv) => (vv < 0 ? GI[1] : GI[2]));
    ellipse(g, cx - 6, 112, 6, 8, (u, _vv, x, y) => tone(GI, 0.75 - u * 0.3, x, y));
    ellipse(g, cx - 6, 128, 9, 3.4, (_u, vv) => (vv < -0.3 ? GI[0] : '#05070c'));
    // los ojos abiertos, mirando arriba: blanco gris apagado con la pupila que se corre en `respira`
    for (const sx of [-1, 1]) {
      ellipse(g, cx - 6 + sx * 17, 104, 7.4, 5, (_u, vv) => (vv < -0.55 ? GI[1] : '#a8b4c4'));
      const px = cx - 6 + sx * 17 + (eye ? 2 : -1), py = 102 + (eye ? 1 : 0);
      ellipse(g, px, py, 1.6, 1.6, () => '#05070c');
    }
    // la mano abierta pegada al hielo, al costado; dos dedos salen afuera
    ellipse(g, cx + 52, 96, 18, 13, (u, vv, x, y) => tone(GI, 0.6 - vv * 0.2 - u * 0.15, x, y, true));
    for (let k = 0; k < 4; k++) for (let t = 0; t < 22 + (k === 1 ? 6 : 0); t++) { const x = cx + 42 + k * 7 + t * 0.15, y = 86 - t; for (let q = -2; q <= 2; q++) gs(x + q, y, 0.6 - q * 0.08 + t * 0.005); }
  } else if (v === 1) {
    // los hombros y la cabeza calva inclinada hacia arriba
    ellipse(g, cx - 10, 132, 62, 22, (u, vv, x, y) => tone(GI, 0.5 - vv * 0.3 - u * 0.15, x, y, true));
    ellipse(g, cx - 18, 108, 26, 24, (u, vv, x, y) => tone(GI, 0.6 - vv * 0.25 - u * 0.25 + (hash(x >> 2, y >> 2, 333) - 0.5) * 0.08, x, y, true));
    for (const sx of [-1, 1]) {
      ellipse(g, cx - 18 + sx * 10, 104, 4.6, 3.2, () => '#8a98ac');
      ellipse(g, cx - 18 + sx * 10 + (eye ? 1 : -1), 103 - (eye ? 1 : 0), 1.8, 1.8, () => '#0a0e16');
    }
    for (let x = -7; x <= 7; x++) put(g, cx - 18 + x, 118, GI[0]);
    // el brazo estirado hacia arriba: el antebrazo sale del hielo con la mano abierta
    for (let t = 0; t < 78; t++) { const x = cx + 30 + t * 0.18, y = 132 - t, w = t < 40 ? 9 : 8 - (t - 40) * 0.04; for (let q = -w; q <= w; q++) gs(x + q, y, 0.6 - q / (w * 2.2)); }
    ellipse(g, cx + 44, 52, 11, 9, (u, vv, x, y) => tone(GI, 0.65 - u * 0.2 - vv * 0.15, x, y, true));
    for (let k = 0; k < 4; k++) for (let t = 0; t < 13 + (k === 1 || k === 2 ? 4 : 0); t++) { const x = cx + 37 + k * 5 + (k - 1.5) * t * 0.3, y = 45 - t; for (let q = -1.5; q <= 1.5; q++) gs(x + q, y, 0.62 - q * 0.08); }
  } else {
    // de costado, encogido: la espalda curva, las rodillas, el cuerno roto y un ojo grande abierto
    ellipse(g, cx + 10, 116, 58, 30, (u, vv, x, y) => tone(GI, 0.48 - vv * 0.3 - u * 0.1 + (hash(x >> 2, y >> 2, 334) - 0.5) * 0.08, x, y, true));
    ellipse(g, cx - 40, 104, 24, 22, (u, vv, x, y) => tone(GI, 0.6 - vv * 0.25 - u * 0.2, x, y, true));
    for (let t = 0; t < 22; t++) { const x = cx - 54 - t * 0.6, y = 88 - t * 0.9, w = 5 - t * 0.15; for (let q = -w; q <= w; q++) gs(x + q, y, 0.75 - t * 0.01); }
    for (let q = -4; q <= 4; q++) put(g, cx - 67 + q, 68, E[0]);
    ellipse(g, cx - 36, 100, 7, 5, () => '#8a98ac');
    ellipse(g, cx - 34 + (eye ? 2 : -1), 99, 3, 3, () => '#0a0e16');
    ellipse(g, cx + 50, 128, 20, 14, (u, vv, x, y) => tone(GI, 0.5 - vv * 0.2 - u * 0.2, x, y, true));
  }
  // el bloque de hielo con el gigante adentro: el hielo tiñe y borra lo de adentro; lo de afuera queda nítido
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const gi = (y * W + x) * 4, inG = g.data[gi + 3] > 0;
    if (inBlock(x, y)) {
      const u = (x - cx) / 86, depth = (y - blockTop(x)) / Math.max(1, base - blockTop(x));
      const facet = Math.floor((u + 1) * 4 + depth * 2);
      let l = 0.42 - u * 0.2 + (hash(facet, v, 335) - 0.5) * 0.14 + (depth < 0.06 ? 0.3 : 0);
      if (crackDist(x, y, 30, 338 + v) < 1.1) l += 0.22;
      const gl = ((x - y * 0.6 + v * 30) % 64 + 64) % 64;
      if (gl < 2 || (gl > 6 && gl < 7.5)) l += 0.18;
      let c = tone(HI, l, x, y, true);
      if (inG) {
        // lo de adentro, a través del hielo: mitad gigante, mitad hielo
        const gc = [g.data[gi], g.data[gi + 1], g.data[gi + 2]];
        const hex = '#' + gc.map((q) => q.toString(16).padStart(2, '0')).join('');
        c = mixC(c, hex, 0.62 - depth * 0.15);
      }
      if (hash(x >> 1, y >> 1, 336 + v) > 0.988) c = E[1];
      put(r, x, y, c);
    } else if (inG) put(r, x, y, [g.data[gi], g.data[gi + 1], g.data[gi + 2]]);
  }
  // la nieve que se juntó al pie del bloque
  for (let x = 6; x < W - 6; x++) {
    const u = (x - cx) / 90, gx = x / 9, x0 = Math.floor(gx), fx = gx - x0, sm = fx * fx * (3 - 2 * fx);
    const h = 4 + (hash(x0, v, 339) * (1 - sm) + hash(x0 + 1, v, 339) * sm) * 7 - u * u * 4;
    for (let y = base - h; y < base + 3; y++) put(r, x, y, tone(N, 0.82 - (y - (base - h)) / 10 - u * 0.1, x, Math.round(y), true));
  }
  outline(r, '#030406');
  frostCap(r, 0.5, 337 + v);
  coldEdge(r, 0.35);
  emberRim(r, 0.15);
  return r;
}

function frozenGiantObject(v: number): WorldObject {
  const a = frozenGiant(v, 0), b = frozenGiant(v, 1);
  return grounded({ name: `gigante_congelado_${v}`, w: 192, h: 160, anchor: [96, 154], solid: [-78, -30, 156, 34], light: { color: '#6a8aac', radius: 140, pulse: true, dy: 50 }, anims: { idle: { frames: [a], fps: 1, loop: true }, respira: { frames: [a, b], fps: 1, loop: true } } }, a, { spread: 2 });
}

// ---------------------------------------------------------------- el hielo fino

/**
 * Hielo fino (64 x 64, capa suelo): más claro y más gris que el hielo firme, con burbujas y rayitas blancas, para que
 * se lea de lejos. `quieto` (1), `cruje` (6 cuadros a 8 fps: la grieta crece desde el medio con brillitos), `roto` (1:
 * pedazos que flotan en el agua negra). La textura pega con la de al lado (el juego llena rectángulos con estos).
 */
function thinIce(v: number, state: 'quieto' | 'cruje' | 'roto', f = 0): Raster {
  const r = createRaster(64, 64);
  const P = ['#1a2232', '#283446', '#3a4a60', '#52647c', '#6e829a'];
  const crackLen = state === 'cruje' ? (f + 1) / 6 : state === 'roto' ? 1 : 0;
  // las grietas: caminos que salen del centro, se cortan antes del borde
  const cracks = new Uint8Array(64 * 64);
  if (crackLen > 0) for (let c = 0; c < 5; c++) {
    let x = 32 + (hash(c, v, 341) - 0.5) * 6, y = 32 + (hash(v, c, 342) - 0.5) * 6;
    const a0 = (c / 5) * Math.PI * 2 + hash(c, 3, 343 + v);
    for (let s = 0; s < 26 * crackLen; s++) {
      const a = a0 + (hash(c, s, 344 + v) - 0.5) * 1.2;
      x += Math.cos(a) * 1.1; y += Math.sin(a) * 1.1;
      if (x < 3 || y < 3 || x > 60 || y > 60) break;
      cracks[Math.round(y) * 64 + Math.round(x)] = 1;
    }
  }
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    // ruido que pega por los bordes (todo con módulo 64)
    const n = (hash(x >> 3, y >> 3, 345) + hash(((x + 4) >> 3) & 7, ((y + 4) >> 3) & 7, 346)) * 0.5;
    let l = 0.5 + (n - 0.5) * 0.3;
    // rayitas blancas finas en diagonal (hielo nuevo)
    if (((x + y * 2 + v * 11) % 23) === 0 && hash(x, y, 347) > 0.4) l += 0.3;
    let c = tone(P, l, x, y, true), a = 225;
    // burbujas
    if (hash(x, y, 348 + v) > 0.992) c = E[2];
    if (state === 'roto') {
      // agua negra entre los pedazos: lo que está cerca de una grieta se hunde
      let near = 99;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < 64 && Y < 64 && cracks[Y * 64 + X]) near = Math.min(near, Math.hypot(dx, dy)); }
      const hole = Math.hypot(x - 32, y - 32) < 13 + Math.sin(Math.atan2(y - 32, x - 32) * 5 + v) * 3;
      if (hole || near < 2) { c = Math.sin(x * 0.4 + y * 0.2) > 0.85 ? '#22304a' : '#05070c'; a = 255; }
      else if (near < 3) c = E[3];
    } else if (cracks[y * 64 + x]) { c = state === 'cruje' && (x + y + f) % 5 === 0 ? '#ffffff' : '#05070c'; a = 255; }
    else if (crackLen > 0) {
      // el brillo claro al lado de la grieta
      if ((x > 0 && cracks[y * 64 + x - 1]) || (y > 0 && cracks[(y - 1) * 64 + x])) c = E[2];
    }
    put(r, x, y, c, a);
  }
  return r;
}

function thinIceObjects(): WorldObject[] {
  const mk = (name: string, v: number): WorldObject => ({
    name, w: 64, h: 64, anchor: [32, 32], solid: null, layer: 'suelo',
    anims: { quieto: { frames: [thinIce(v, 'quieto')], fps: 1, loop: true }, cruje: { frames: Array.from({ length: 6 }, (_, f) => thinIce(v, 'cruje', f)), fps: 8, loop: false }, roto: { frames: [thinIce(v, 'roto')], fps: 1, loop: true } },
  });
  return [mk('hielo_fino', 0), mk('hielo_fino_0', 0), mk('hielo_fino_1', 1), mk('hielo_fino_2', 2), mk('hielo_fino_3', 3)];
}

// ---------------------------------------------------------------- los árboles de hielo

/**
 * Árbol de hielo (96 x 160, `idle` 2 cuadros a 2 fps, sólido en el tronco): un árbol muerto hecho hielo, sin hojas,
 * con las ramas como agujas, carámbanos que cuelgan y nieve arriba de cada rama. Titila apenas (los brillos cambian de
 * lugar). Variantes: 0 alto y flaco, 1 llorón (las ramas caen), 2 retorcido y partido, 3 de tres troncos.
 */
function iceTree(v: number, f: number): Raster {
  const r = createRaster(96, 160), cx = 48, base = 154;
  const segs: { x0: number; y0: number; x1: number; y1: number; w: number }[] = [];
  const grow = (x: number, y: number, ang: number, len: number, w: number, depth: number, seed: number) => {
    const droop = v === 1 ? 0.035 * (4 - depth) : 0, twist = v === 2 ? 0.25 : 0.12;
    let a = ang, px = x, py = y;
    const n = Math.max(2, Math.round(len / 6));
    for (let i = 0; i < n; i++) {
      a += (hash(seed, i, 351 + v) - 0.5) * twist + droop * (Math.cos(a) > 0 ? 1 : -1) * (a < -Math.PI / 2 ? -1 : 1);
      const nx = px + Math.cos(a) * (len / n), ny = py + Math.sin(a) * (len / n), ww = w * (1 - (i / n) * 0.55);
      if (nx < 8 || nx > 88 || ny < 6) break;
      segs.push({ x0: px, y0: py, x1: nx, y1: ny, w: ww });
      px = nx; py = ny;
      if (depth > 0 && i > 0 && hash(seed, i, 352 + v) > 0.62) grow(px, py, a + (hash(i, seed, 353) > 0.5 ? 0.7 : -0.7) * (v === 1 ? 1.3 : 1), len * 0.55, ww * 0.62, depth - 1, seed * 7 + i);
    }
  };
  if (v === 3) for (const dx of [-12, 0, 12]) grow(cx + dx, base, -Math.PI / 2 + dx * 0.03, 92 - Math.abs(dx) * 1.5, 5, 2, 360 + dx);
  else grow(cx, base, -Math.PI / 2 + (v === 2 ? 0.15 : 0), v === 0 ? 128 : 108, v === 0 ? 6 : 7, 2, 361 + v);
  for (const s of segs) {
    const len = Math.hypot(s.x1 - s.x0, s.y1 - s.y0) || 1, n = Math.ceil(len * 1.5) + 1, nx = -(s.y1 - s.y0) / len, ny = (s.x1 - s.x0) / len;
    // el lado con luz es el de arriba a la izquierda
    const lit = nx * -0.7 + ny * -0.7 > 0 ? 1 : -1;
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = s.x0 + (s.x1 - s.x0) * t, y = s.y0 + (s.y1 - s.y0) * t;
      for (let q = -s.w; q <= s.w; q += 0.5) {
        const side = (q / Math.max(0.5, s.w)) * lit;
        put(r, x + nx * q, y + ny * q, tone(HI, 0.6 + side * 0.35 + (hash(Math.round(x), Math.round(y), 354) - 0.5) * 0.12, Math.round(x), Math.round(y), true));
      }
      // la veta clara del lado de la luz (es hielo: se ve el fondo más claro)
      if (s.w > 2) put(r, x + nx * s.w * 0.45 * lit, y + ny * s.w * 0.45 * lit, E[0], 170);
    }
  }
  // carámbanos que cuelgan de las ramas casi horizontales y nieve encima
  for (const [i, s] of segs.entries()) {
    const horiz = Math.abs(s.y1 - s.y0) < Math.abs(s.x1 - s.x0);
    if (!horiz) continue;
    const mx = (s.x0 + s.x1) / 2, my = (s.y0 + s.y1) / 2;
    if (hash(i, 1, 355 + v) > 0.75) { const len = 3 + hash(i, 2, 355) * 6; for (let t = 0; t < len; t++) put(r, mx, my + s.w + t, t > len - 2 ? E[4] : E[1], 230); }
    for (let t = 0; t <= 1; t += 0.1) put(r, s.x0 + (s.x1 - s.x0) * t, s.y0 + (s.y1 - s.y0) * t - s.w - 0.5, E[3]);
  }
  // las raíces y el montón de nieve
  for (const dx of [-1, 1]) line(r, cx + dx * 4, base - 6, cx + dx * 18, base, (t) => tone(HI, 0.5 - t * 0.2, 0, 0), 3);
  snowDrift(r, cx - 22, cx + 22, base + 1, 8, 359 + v);
  outline(r, '#030406');
  frostCap(r, 0.6, 356 + v, f);
  emberRim(r, 0.12);
  // los brillos que titilan (cambian de lugar en cada cuadro)
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(hash(i, f, 357 + v) * 96), y = Math.floor(hash(f, i, 358 + v) * 150);
    const k = (y * 96 + x) * 4;
    if (r.data[k + 3] > 200) { put(r, x, y, '#ffffff'); put(r, x + 1, y, E[3], 160); put(r, x, y - 1, E[3], 160); }
  }
  return r;
}

function iceTreeObject(v: number): WorldObject {
  const frames = [0, 1].map((f) => iceTree(v, f));
  return grounded({ name: `arbol_hielo_${v}`, w: 96, h: 160, anchor: [48, 154], solid: [-8, -6, 16, 8], anims: { idle: { frames, fps: 2, loop: true } } }, frames[0], { spread: 3 });
}

// ---------------------------------------------------------------- el brasero de hueso (la arena del Diablo)

/**
 * Brasero de hueso (48 x 80, sólido chico): tres cuernos largos de piedra que se cruzan como un trípode y aguantan un
 * cuenco hecho de una calavera de demonio de piedra boca arriba. `apagado` (frío, ceniza y escarcha en el cuenco),
 * `prenderse` (8 cuadros a 12 fps: la chispa y el fuego que sube), `prendido` (6 cuadros a 8 fps) y `congelado` (el
 * aliento del Diablo lo cubrió de hielo, con carámbanos). Prendido alumbra con radio 220.
 */
function boneBrazier(state: 'apagado' | 'prenderse' | 'prendido' | 'congelado', f: number): Raster {
  const r = createRaster(48, 80), cx = 24, bowlY = 34, base = 76;
  const P = ['#14161c', '#22252e', '#343844', '#4a505e', '#646c7c', '#7e8898'];
  // las tres patas: cuernos de piedra cruzados
  for (const [x0, x1, w] of [[8, 30, 2.6], [40, 18, 2.6], [24, 24, 2.2]] as [number, number, number][]) {
    for (let t = 0; t <= 1; t += 0.01) {
      const x = x0 + (x1 - x0) * t + Math.sin(t * Math.PI) * (x0 < 24 ? -3 : x0 > 24 ? 3 : 0), y = base - (base - bowlY - 6) * t, ww = w * (1 - t * 0.3);
      for (let q = -ww; q <= ww; q += 0.5) put(r, x + q, y, tone(P, 0.6 - q / (ww * 2.4) + ((y | 0) % 6 === 0 ? -0.15 : 0), Math.round(x), Math.round(y)));
    }
  }
  // un anillo de hueso que ata las patas
  for (let x = 12; x <= 36; x++) { put(r, x, 56, tone(HU, 0.7 - (x - 12) / 60, x, 56)); put(r, x, 57, HU[1]); }
  // el cuenco: la calavera boca arriba (se ven la mandíbula y los cuernos hacia los costados)
  ellipse(r, cx, bowlY + 4, 15, 8, (u, v, x, y) => tone(P, 0.6 - v * 0.35 - u * 0.2, x, y));
  for (const sx of [-1, 1]) for (let t = 0; t < 12; t++) { const x = cx + sx * (13 + t * 0.7), y = bowlY + 2 - t * 1.1 + (t * t) * 0.03, w = 2.2 * (1 - t / 13); for (let q = -w; q <= w; q += 0.5) put(r, x, y + q, tone(P, 0.65 - q * 0.1, Math.round(x), Math.round(y))); }
  for (const sx of [-1, 1]) ellipse(r, cx + sx * 6, bowlY + 7, 3, 2, () => '#05060a');
  for (let k = -3; k <= 3; k++) put(r, cx + k * 2, bowlY + 11, k % 2 ? P[4] : P[1]);
  // la boca del cuenco
  ellipse(r, cx, bowlY, 12, 4, (_u, v) => (v < -0.5 ? P[4] : '#0a0b0e'));
  const burn = state === 'prendido' ? 1 : state === 'prenderse' ? (f + 1) / 8 : 0;
  if (state === 'apagado') {
    ellipse(r, cx, bowlY, 10, 3, (_u, _v, x, y) => (hash(x, y, 361) > 0.5 ? '#3a3a40' : '#24242a'));
    for (let k = 0; k < 6; k++) put(r, cx - 8 + k * 3, bowlY - 1, E[2]);
  }
  if (burn > 0) {
    ellipse(r, cx, bowlY, 10, 3, (_u, _v, x, y) => tone(BR, 0.4 + burn * 0.4 + (hash(x, y + f, 362) - 0.5) * 0.4, x, y));
    const sw = (k: number) => Math.sin((f / 6) * Math.PI * 2 + k * 2.1) * 2;
    const H0 = 26 * burn, hh = (k: number) => Math.sin((f / 6) * Math.PI * 2 + k) * 2.5 * burn;
    if (H0 > 2) {
      flameTongue(r, cx - 5, bowlY + 1, 4 * burn + 1, H0 * 0.6 + hh(1), sw(1), BR.slice(1));
      flameTongue(r, cx + 5, bowlY + 1, 4 * burn + 1, H0 * 0.55 + hh(2), sw(2), BR.slice(1));
      flameTongue(r, cx, bowlY + 1, 6 * burn + 1, H0 + hh(0), sw(0), BR.slice(1));
    }
    // la chispa que lo prende (los primeros cuadros)
    if (state === 'prenderse' && f < 3) for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + f; put(r, cx + Math.cos(a) * (4 + f * 3), bowlY - 4 + Math.sin(a) * (2 + f), BR[5]); }
    for (let i = 0; i < 4; i++) { const t = ((f + i * 2) % 6) / 6; put(r, cx + (hash(i, 1, 363) - 0.5) * 14, bowlY - H0 - 2 - t * 10, BR[4], Math.round(240 * (1 - t) * burn)); }
  }
  outline(r, '#030406');
  if (state === 'congelado') {
    // todo cubierto de hielo: una costra celeste clara y carámbanos que cuelgan del cuenco
    const W = 48, a0 = new Uint8Array(W * 80);
    for (let i = 0; i < W * 80; i++) a0[i] = r.data[i * 4 + 3];
    for (let y = 0; y < 80; y++) for (let x = 0; x < W; x++) if (a0[y * W + x] && y < 64) put(r, x, y, hash(x, y, 364) > 0.8 ? E[4] : E[1], 150);
    ellipse(r, cx, bowlY - 2, 13, 7, (u, v, x, y) => tone(['#3a5a7a', '#6a8aac', '#9ab8d8', '#d0e4f6', '#ffffff'], 0.8 - v * 0.4 - u * 0.2, x, y), 235);
    for (let k = 0; k < 7; k++) { const x = cx - 12 + k * 4, len = 4 + hash(k, 1, 365) * 8; for (let t = 0; t < len; t++) put(r, x, bowlY + 10 + t, t > len - 2 ? '#ffffff' : E[2], 235); }
  } else frostCap(r, state === 'apagado' ? 0.55 : 0.2, 366);
  if (burn > 0) { glow(r, cx, bowlY - 10, 22, BR[3], burn); emberRim(r, 0.25 * burn, '#ff6a20'); }
  return r;
}

function boneBrazierObject(): WorldObject {
  const st = (s: Parameters<typeof boneBrazier>[0], n: number) => Array.from({ length: n }, (_, f) => boneBrazier(s, f));
  const apagado = st('apagado', 1);
  return grounded({
    name: 'brasero_hueso', w: 48, h: 80, anchor: [24, 76], solid: [-8, -6, 16, 8], light: { color: '#ff7a30', radius: 220, flicker: true, dy: 44 },
    anims: { apagado: { frames: apagado, fps: 1, loop: true }, prenderse: { frames: st('prenderse', 8), fps: 12, loop: false }, prendido: { frames: st('prendido', 6), fps: 8, loop: true }, congelado: { frames: st('congelado', 1), fps: 1, loop: true } },
  }, apagado[0], { spread: 3 });
}

// ---------------------------------------------------------------- el trono del Diablo

/**
 * El trono del Diablo (256 x 256, `idle` 6 cuadros a 4 fps, sólido): tres escalones de piedra negra, un asiento enorme
 * con el respaldo alto lleno de púas y una calavera de demonio de piedra arriba con los ojos encendidos. La mitad de la
 * izquierda es hielo (cristales claros, carámbanos, escarcha) y la de la derecha es brasa (roca negra con grietas que
 * laten rojo y naranja y chispas que suben). Cadenas heladas cuelgan de los apoyabrazos. Nada de sangre.
 */
function throne(f: number): Raster {
  const W = 256, H = 256, r = createRaster(W, H), cx = 128, base = 248;
  const pulse = 0.6 + 0.4 * Math.sin((f / 6) * Math.PI * 2);
  const side = (x: number) => (x < cx ? -1 : 1);
  // material por mitad: hielo a la izquierda, roca de brasa a la derecha (la costura quebrada en el medio)
  const seam = (y: number) => cx + Math.sin(y * 0.09) * 6 + (hash(y >> 3, 0, 371) - 0.5) * 6;
  const ICE = ['#0c1220', '#16203a', '#22304a', '#3a4a62', '#6a8aac', '#9ab8d8', '#d0e4f6'];
  const EMB = ['#060406', '#0e0a0c', '#1a1214', '#261a1a', '#342424', '#4a3230', '#5e403a'];
  const mat = (x: number, y: number, l: number) => {
    const ice = x < seam(y);
    if (ice) {
      // hielo en cristales: facetas en diagonal, cada una con su tono, con el canto claro
      const fd = crackDist(x * 0.8 + y * 0.5, y * 0.9 - x * 0.2, 34, 372);
      let li = l + (hash(Math.floor((x * 0.8 + y * 0.5) / 34), Math.floor((y * 0.9 - x * 0.2) / 34), 373) - 0.5) * 0.18;
      if (fd < 0.9 && hash(Math.floor(x / 9), Math.floor(y / 9), 376) > 0.35) li += 0.14;
      return tone(ICE, li, x, y, true);
    }
    let c = tone(EMB, l, x, y, true);
    // las grietas de brasa: venas quebradas que laten (más calientes en el medio de la grieta)
    const d = crackDist(x, y, 40, 374), on = hash(Math.floor(x / 14), Math.floor(y / 14), 375) > 0.45;
    if (on && d < 0.8) c = pulse > 0.8 ? BR[4] : BR[3];
    else if (on && d < 1.6) c = pulse > 0.5 ? BR[2] : BR[1];
    else if (d < 3) c = mixC(c, BR[0], 0.45 * pulse);
    return c;
  };
  // los tres escalones (el de abajo más ancho)
  for (let s = 0; s < 3; s++) {
    const y0 = base - 14 - s * 14, y1 = y0 + 14, hw = 118 - s * 16;
    for (let y = y0; y < y1; y++) for (let x = cx - hw; x <= cx + hw; x++) {
      const tread = y < y0 + 4;
      put(r, x, y, mat(x, y, tread ? 0.72 : 0.38 - (y - y0) * 0.012 + (x % 24 === 0 ? -0.2 : 0)));
    }
  }
  // el asiento: un bloque ancho con los apoyabrazos
  const seatTop = 150, seatY = base - 42;
  for (let y = seatTop; y < seatY; y++) for (let x = cx - 70; x <= cx + 70; x++) {
    const arm = Math.abs(x - cx) > 46;
    if (!arm && y < 176) continue;
    const u = (x - cx) / 70;
    put(r, x, y, mat(x, y, (arm && y < seatTop + 5) || (!arm && y < 180) ? 0.78 : 0.45 - u * 0.12 - (y - seatTop) * 0.002));
  }
  // el almohadón del asiento (hundido, más oscuro)
  for (let y = 176; y < 184; y++) for (let x = cx - 44; x <= cx + 44; x++) put(r, x, y, mat(x, y, 0.62));
  // el respaldo alto: una lápida con púas en el borde que sube en punta
  for (let y = 26; y < 178; y++) {
    const t = (y - 26) / 152, hw = 40 + t * 8 - (y < 60 ? (60 - y) * 0.8 : 0);
    for (let x = Math.floor(cx - hw); x <= cx + hw; x++) {
      const u = (x - cx) / Math.max(1, hw);
      let l = 0.5 - Math.abs(u) * 0.15 + (Math.abs(u) > 0.86 ? 0.2 : 0) - (y > 168 ? 0.15 : 0);
      // nervaduras verticales
      if (Math.abs(Math.sin(u * 7)) < 0.12) l -= 0.18;
      put(r, x, y, mat(x, y, l));
    }
  }
  // las púas del borde del respaldo: hielo a la izquierda, roca a la derecha
  for (let k = 0; k < 9; k++) for (const sx of [-1, 1]) {
    const y0 = 50 + k * 14, x0 = cx + sx * (44 + k * 0.9), len = 16 + (k % 2) * 8 - k * 0.6;
    for (let t = 0; t < len; t++) { const w = 3.6 * (1 - t / len); for (let q = -w; q <= w; q += 0.5) put(r, x0 + sx * t, y0 - t * 0.55 + q, mat(x0 + sx * t, y0, 0.6 + q * 0.06 * -sx)); }
  }
  // las dos púas grandes de arriba (los cuernos del trono)
  for (const sx of [-1, 1]) for (let t = 0; t < 46; t++) {
    const x = cx + sx * (18 + t * 0.55 + Math.sin(t * 0.06) * 6), y = 34 - t * 0.7, w = 6 * (1 - t / 46) + 0.5;
    for (let q = -w; q <= w; q += 0.5) put(r, x + q, y, mat(Math.round(cx + sx * 20), y, 0.62 - (q / w) * 0.25 * sx));
  }
  // la calavera de demonio de piedra arriba del respaldo, con los ojos encendidos
  demonSkull(r, cx, 50, 26, { eyes: pulse > 0.5 ? '#ff2a1a' : '#d01a10', seed: 373 });
  // calaveritas en los apoyabrazos
  demonSkull(r, cx - 58, 146, 12, { seed: 374, pal: ['#16203a', '#22304a', '#3a4a62', '#6a8aac', '#9ab8d8', '#d0e4f6'] });
  demonSkull(r, cx + 58, 146, 12, { seed: 375, eyes: '#ff6a20' });
  // las cadenas heladas que cuelgan de los apoyabrazos
  chainLinks(r, cx - 68, 158, cx - 76, 222, 4, 0);
  chainLinks(r, cx + 68, 158, cx + 80, 220, 4, 0.6);
  // del lado del hielo: carámbanos que cuelgan de los escalones y del apoyabrazo
  for (let k = 0; k < 18; k++) {
    const x = cx - 116 + k * 6.4, y = base - 14 - (k > 13 ? 14 : 0) + (k > 15 ? -14 : 0), len = 3 + hash(k, 1, 376) * 9;
    if (x > seam(y)) continue;
    for (let t = 0; t < len; t++) put(r, x, y + t, t > len - 2 ? '#ffffff' : E[1], 230);
  }
  for (let k = 0; k < 6; k++) { const x = cx - 70 + k * 4, len = 4 + hash(k, 2, 376) * 10; for (let t = 0; t < len; t++) put(r, x, seatY + t, t > len - 2 ? '#ffffff' : E[1], 230); }
  outline(r, '#020305');
  // escarcha arriba de todo lo de la izquierda; chispas que suben a la derecha
  {
    const a0 = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) a0[i] = r.data[i * 4 + 3] > 200 ? 1 : 0;
    for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) if (a0[y * W + x] && !a0[(y - 1) * W + x] && x < seam(y)) { put(r, x, y, E[4]); if (hash(x, y, 377) > 0.4) put(r, x, y + 1, E[2]); }
  }
  for (let i = 0; i < 16; i++) {
    const t = ((f / 6 + hash(i, 3, 378)) % 1);
    const x = cx + 10 + hash(i, 1, 378) * 100 + Math.sin(t * 7 + i) * 3, y = base - 30 - hash(i, 2, 378) * 120 - t * 40;
    put(r, x, y, t < 0.5 ? BR[5] : BR[3], Math.round(255 * (1 - t)));
  }
  // del lado del hielo, motas de escarcha que bajan
  for (let i = 0; i < 12; i++) { const t = ((f / 6 + hash(i, 5, 379)) % 1); put(r, cx - 20 - hash(i, 4, 379) * 100, 40 + hash(i, 6, 379) * 150 + t * 20, '#e8f4ff', Math.round(220 * (1 - t))); }
  // el resplandor rojo de las grietas
  glow(r, cx + 40, 160, 70, BR[3], 0.5 * pulse);
  glow(r, cx, 50, 30, HIELO.ojo, 0.9 * pulse);
  void side;
  return r;
}

function throneObject(): WorldObject {
  const frames = Array.from({ length: 6 }, (_, f) => throne(f));
  return grounded({ name: 'trono_diablo', w: 256, h: 256, anchor: [128, 248], solid: [-110, -46, 220, 48], light: { color: '#ff3a20', radius: 260, pulse: true, dy: 120 }, anims: { idle: { frames, fps: 4, loop: true } } }, frames[0], { spread: 4 });
}

export function corazonObjectsA(): WorldObject[] {
  return [
    boneFireObject(), ...[0, 1, 2, 3].map(iceColumn), ...[0, 1, 2].map(frozenGiantObject), ...thinIceObjects(),
    ...[0, 1, 2, 3].map(iceTreeObject), boneBrazierObject(), throneObject(),
  ];
}

export { line, glow };
