import { createRaster, type Raster } from '../core/raster';
import type { WorldObject } from './objects';
import { hash, put, glow, tone, outline } from './puertoObjects';
import { one, grounded, ellipse, line, chainLinks, mixC } from './fraguaObjects';
import { HIELO, frostCap, emberRim, coldEdge, boneLine, demonSkull, flameTongue, crackDist, snowDrift } from './corazonObjects';

/**
 * Mundo 7, parte 2 (segunda mitad): el primer plano (cadenas heladas, nieve y estalactitas delante de la cámara), el
 * fondo lejano (torres de hielo, gigantes lejos y el vacío), el mural 7, la Ladrona con la última llama, la utilería
 * (armas congeladas, escudos rotos, calaveras de demonio de piedra, banderas heladas, lápidas y sarcófagos de las
 * catacumbas), las calcomanías y las partículas de nieve negra y de ventisca.
 */

const HI = HIELO.hielo, E = HIELO.escarcha, N = HIELO.nieve, RC = HIELO.roca, BR = HIELO.brasa, HU = HIELO.hueso, FE = HIELO.hierro;
/** piedra de demonio (gris azulada, fría) */
const PD = ['#0c0e14', '#16181f', '#22252e', '#343844', '#4a505e', '#646c7c'];

// ---------------------------------------------------------------- primer plano (capa frente)

/** Cadenas heladas (128 x 128, 4 cuadros a 3 fps): cadenas que cuelgan cerca de la cámara con escarcha y carámbanos. */
function frozenChains(v: number): WorldObject {
  const frames = [0, 1, 2, 3].map((f) => {
    const r = createRaster(128, 128);
    const n = 2 + (v % 2);
    for (let k = 0; k < n; k++) {
      const x0 = 16 + k * (96 / n) + hash(k, v, 701) * 16, len = 50 + hash(v, k, 702) * 66;
      const sw = Math.sin((f / 4) * Math.PI * 2 + k * 1.7 + v) * (2 + k);
      chainLinks(r, x0, 0, x0 + sw, len, 6 + (k % 2) * 2, 0);
      // un gancho o un grillete abierto al final
      if ((k + v) % 2 === 0) for (let t = 0; t < Math.PI * 1.3; t += 0.08) for (let q = 0; q < 3; q++) put(r, x0 + sw + Math.sin(t) * (7 + q), len + 8 + (1 - Math.cos(t)) * (7 + q), q ? FE[2] : FE[3]);
      // los carámbanos que cuelgan de los eslabones
      for (let c = 0; c < 4; c++) { const y = 10 + c * (len / 4), x = x0 + sw * (y / len) + 4, l2 = 3 + hash(c, k, 703 + v) * 6; for (let t = 0; t < l2; t++) put(r, x, y + t, t > l2 - 2 ? '#ffffff' : E[1], 220); }
    }
    // la escarcha arriba de cada eslabón y un poco de azul (lo frío), muy poco rojo abajo
    for (let i = 0; i < r.w * r.h; i++) if (r.data[i * 4 + 3]) { const k = i * 4; r.data[k] = Math.round(r.data[k] * 0.7); r.data[k + 1] = Math.round(r.data[k + 1] * 0.8); r.data[k + 2] = Math.min(255, Math.round(r.data[k + 2] * 1.05 + 10)); }
    outline(r, '#020306');
    frostCap(r, 0.7, 704 + v, f);
    emberRim(r, 0.12);
    return r;
  });
  return { name: `cadena_helada_${v}`, w: 128, h: 128, anchor: [64, 0], solid: null, layer: 'frente', anims: { idle: { frames, fps: 3, loop: true } } };
}

/** Nieve de frente (128 x 128, 4 cuadros a 4 fps): copos grandes y borrosos cerca de la cámara, con ceniza negra mezclada. Pega por los cuatro lados. */
function frontSnow(v: number): WorldObject {
  const frames = [0, 1, 2, 3].map((f) => {
    const r = createRaster(128, 128);
    for (let i = 0; i < 26; i++) {
      const big = hash(i, v, 711) > 0.6, s = big ? 2.6 : 1.4;
      // bajan y se corren con el viento: en 4 cuadros recorren 32 px (el bucle cierra)
      const x = (hash(i, 1, 712 + v) * 128 + f * 8 * (big ? 1 : 0.5) * 2) % 128, y = (hash(i, 2, 712 + v) * 128 + f * 8 * (big ? 1 : 0.5) * 4) % 128;
      const ash = i % 4 === 0;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const d = Math.hypot(dx, dy) / s;
        if (d > 1.3) continue;
        put(r, (x + dx + 128) % 128, (y + dy + 128) % 128, ash ? '#14161c' : d < 0.6 ? '#f0f6ff' : '#b8d0ea', Math.round((ash ? 200 : 230) * Math.max(0, 1 - d * 0.75)));
      }
    }
    return r;
  });
  return { name: `nieve_frente_${v}`, w: 128, h: 128, anchor: [64, 0], solid: null, layer: 'frente', anims: { idle: { frames, fps: 4, loop: true } } };
}

/**
 * Carámbanos de frente (128 x 128, 2 cuadros a 2 fps; el encargo los llama estalactitas_frente, pero ese nombre ya es
 * del Mundo 3 con otra forma): carámbanos enormes que bajan del techo cerca de la cámara y gotean. */
function frontStalactites(v: number): WorldObject {
  const frames = [0, 1].map((f) => {
    const r = createRaster(128, 128);
    const n = 3 + v;
    for (let k = 0; k < n; k++) {
      const x0 = 10 + k * (110 / n) + hash(k, v, 721) * 14, len = 40 + hash(v, k, 722) * 70, w = 7 + hash(k, k, 723) * 8;
      for (let y = 0; y < len; y++) {
        const t = y / len, ww = w * (1 - t) ** 0.9;
        for (let x = Math.floor(x0 - ww); x <= x0 + ww; x++) {
          const u = (x + 0.5 - x0) / Math.max(0.5, ww);
          put(r, x, y, tone(['#05070c', '#0c1220', '#16203a', '#22304a', '#3a4a62', '#6a8aac'], 0.55 - u * 0.4 + (u < -0.5 ? 0.2 : 0) + (hash(x >> 1, y >> 2, 724) - 0.5) * 0.1, x, y, true), 235);
        }
      }
      // la gota que cuelga de la punta (cambia entre los dos cuadros)
      if ((k + f) % 2 === 0) { put(r, x0, len + 1, E[3]); put(r, x0, len + 2, '#ffffff'); }
      else put(r, x0, len + 6, E[2], 200);
    }
    // la roca del techo arriba
    for (let x = 0; x < 128; x++) { const h = 6 + Math.abs(Math.sin(x * 0.07 + v)) * 6; for (let y = 0; y < h; y++) put(r, x, y, y > h - 2 ? E[1] : RC[1]); }
    return r;
  });
  return { name: `carambanos_frente_${v}`, w: 128, h: 128, anchor: [64, 0], solid: null, layer: 'frente', anims: { idle: { frames, fps: 2, loop: true } } };
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
 * El abismo helado lejos (512 x 256, capa fondo, pega de lado a lado):
 * - 0: torres de hielo que bajan al vacío, con la bruma azul entre los planos.
 * - 1: gigantes congelados lejos, de pie dentro de las paredes de hielo, con las cadenas que los atan.
 * - 2: el vacío hondo, con el resplandor rojo del corazón allá abajo y la nieve negra que cae.
 */
function farIce(v: 0 | 1 | 2): WorldObject {
  const W = 512, H = 256, r = createRaster(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const t = y / H; put(r, x, y, [Math.round(4 + t * 8), Math.round(6 + t * 10), Math.round(12 + t * 20)]); }
  // el resplandor rojo de abajo (más fuerte en el 2)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = Math.max(0, (y - 100) / 156) ** 1.6 * (v === 2 ? 1 : 0.5) * (0.7 + 0.3 * tn(x, y, 64, W, 741)); if (k > 0.02) put(r, x, y, [Math.round(120 * k + 4), Math.round(14 * k + 6), Math.round(10 * k + 12)]); }
  const planes = [{ base: 130, amp: 100, col: [18, 26, 42], seed: 743 }, { base: 175, amp: 80, col: [11, 16, 28], seed: 745 }, { base: 215, amp: 50, col: [5, 8, 15], seed: 747 }];
  for (const [li, P] of planes.entries()) {
    let x = 0;
    while (x < W) {
      const w = 14 + Math.floor(hash(x, li, P.seed + v) * 40), x1 = Math.min(W, x + w), top = P.base - hash(x, li + 1, P.seed + v) * P.amp;
      const spire = v === 0 || hash(x, li + 2, P.seed) > 0.5;
      for (let xx = x; xx < x1; xx++) {
        const u = (xx - (x + x1) / 2) / ((x1 - x) / 2);
        const tp = spire ? top + Math.abs(u) ** 0.8 * w * 1.1 : top + u * u * 10;
        for (let y = Math.max(0, Math.floor(tp)); y < H; y++) {
          const lit = u < -0.3 ? 14 : u > 0.4 ? -4 : 4;
          put(r, xx, y, P.col.map((c, ci) => Math.max(0, c + lit + (ci === 2 ? lit * 0.6 : 0))));
        }
        // la escarcha en el filo de arriba
        if (Math.floor(tp) >= 0 && li < 2) put(r, xx, Math.floor(tp), li === 0 ? [120, 150, 190] : [60, 80, 110]);
      }
      x = x1 + 12 + Math.floor(hash(x, 5, P.seed + v) * (li === 2 ? 30 : 70));
    }
    // gigantes de pie metidos en el hielo (silueta con dos ojitos pálidos)
    if (v === 1 && li < 2) for (let k = 0; k < 3; k++) {
      const gx = Math.floor(30 + k * 170 + hash(k, li, 749) * 60) + li * 80, gy = P.base - 70 + li * 20, s = li ? 0.8 : 1.3;
      for (let y = 0; y < 90 * s; y++) for (let dx = -14 * s; dx <= 14 * s; dx++) {
        const t = y / (90 * s), hw = (t < 0.16 ? 8 * Math.sqrt(Math.max(0, 1 - ((t - 0.08) / 0.085) ** 2)) : t < 0.2 ? 4.5 : Math.min(15 - t * 4, 4.5 + (t - 0.2) * 90)) * s + (hash(Math.round(dx), y, 750) - 0.5) * 0.8;
        if (Math.abs(dx) > hw) continue;
        put(r, ((gx + Math.round(dx)) % W + W) % W, gy + y, li ? [14, 20, 34] : [28, 38, 58]);
      }
      for (const ex of [-3, 3]) { put(r, ((gx + Math.round(ex * s)) % W + W) % W, gy + Math.round(8 * s), [190, 210, 240]); put(r, ((gx + Math.round(ex * s) + 1) % W + W) % W, gy + Math.round(8 * s), [120, 140, 170]); }
      // la cadena que lo ata
      for (let t = 0; t < 60; t++) put(r, ((gx - 30 + t) % W + W) % W, gy + 30 + Math.round(Math.sin(t * 0.1) * 4), t % 4 < 2 ? [40, 50, 70] : [24, 30, 44]);
    }
    // bruma azul entre los planos
    for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) { const n = tn(xx, y, 64, W, 751 + li); if (y > P.base - 30 && n > 0.55) put(r, xx, y, [40, 60, 90], Math.round((n - 0.55) * 120 * (y / H))); }
  }
  // cadenas que cuelgan del techo y se pierden
  for (let k = 0; k < 5; k++) { const x0 = Math.floor(hash(k, v, 753) * W), len = 50 + hash(v, k, 754) * 110; for (let y = 0; y < len; y++) put(r, x0, y, y % 4 < 2 ? [34, 42, 58] : [20, 26, 38]); }
  // nieve negra y ceniza que caen (puntitos), y alguna chispa roja que sube
  for (let i = 0; i < 90; i++) put(r, Math.floor(hash(i, 3, 755 + v) * W), Math.floor(hash(v, i, 756) * H), i % 3 ? [150, 170, 200] : [12, 14, 20], 170);
  for (let i = 0; i < 14; i++) put(r, Math.floor(hash(i, 7, 757 + v) * W), Math.floor(140 + hash(v, i, 758) * 110), [255, 90, 40], 200);
  return { name: `fondo_hielo_lejos_${v}`, w: W, h: H, anchor: [0, 0], solid: null, layer: 'fondo', anims: one(r) };
}

// ---------------------------------------------------------------- el mural 7

/**
 * Mural 7 (128 x 96): tallado en una pared de hielo de las catacumbas, con los colores de antes que todavía se ven.
 * La Ladrona de luz antes de ser sombra: una niña brillante, dorada y blanca, con los brazos abiertos y siete
 * lucecitas alrededor (los siete pisos). A sus pies, una mano enorme de sombra con garras que sube desde abajo, y dos
 * ojos rojos chiquitos muy al fondo. Sin texto.
 */
function mural7(): WorldObject {
  const r = createRaster(128, 96);
  // la pared de hielo: bloques tallados con escarcha en las juntas
  for (let y = 0; y < 96; y++) for (let x = 0; x < 128; x++) {
    const bx = Math.floor((x + (Math.floor(y / 24) % 2) * 16) / 32), by = Math.floor(y / 24);
    const joint = (x + (by % 2) * 16) % 32 === 0 || y % 24 === 0;
    const edge = y < 3 || y > 92 || x < 3 || x > 124;
    put(r, x, y, joint ? E[0] : tone(HI, 0.45 + (hash(bx, by, 761) - 0.5) * 0.2 + (hash(x >> 2, y >> 2, 762) - 0.5) * 0.1 - (edge ? 0.35 : 0), x, y, true));
  }
  // el halo dorado detrás de la niña (pintura vieja, se ve gastada)
  for (let y = 6; y < 70; y++) for (let x = 30; x < 98; x++) { const d = Math.hypot(x - 64, (y - 34) * 1.1) / 32; if (d < 1 && hash(x >> 1, y >> 1, 763) > 0.25) put(r, x, y, d < 0.5 ? '#f4dc90' : '#c8a050', Math.round(220 * (1 - d * 0.7))); }
  // los rayos
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; for (let t = 22; t < 38; t++) if (hash(k, t, 764) > 0.2) put(r, 64 + Math.cos(a) * t, 34 + Math.sin(a) * t * 0.9, '#ffe8a8', 200); }
  // la niña: vestido blanco, pelo claro, los brazos abiertos (siluetita de luz)
  const lightG = ['#e8c878', '#f4e0a0', '#fff4d0', '#ffffff'];
  for (let y = 22; y < 66; y++) { const t = (y - 22) / 44, hw = y < 32 ? 5 - Math.abs(y - 27) * 0.4 : 3 + t * 10; for (let x = -hw; x <= hw; x++) put(r, 64 + x, y, tone(lightG, 0.8 - (x / Math.max(1, hw)) * 0.3 - t * 0.2, Math.round(64 + x), y)); }
  // la cabeza y el pelo
  ellipse(r, 64, 24, 5.4, 5.6, (u, v) => (v < -0.2 || Math.abs(u) > 0.7 ? '#f4e0a0' : '#ffe8d0'));
  // los brazos abiertos
  line(r, 60, 36, 46, 30, '#fff4d0', 2); line(r, 68, 36, 82, 30, '#fff4d0', 2);
  // los ojitos y la sonrisa (cara de niña contenta, de cuento)
  put(r, 62, 24, '#3a2a20'); put(r, 66, 24, '#3a2a20'); put(r, 63, 27, '#c08060'); put(r, 64, 27, '#c08060'); put(r, 65, 27, '#c08060');
  // las siete lucecitas alrededor, de los siete pisos
  const luces = ['#9aff7a', '#ffc070', '#8ae0ff', '#ffe080', '#ffd890', '#ff9a50', '#ffffff'];
  luces.forEach((c, k) => { const a = Math.PI * (1.1 + (k / 6) * 0.8), x = 64 + Math.cos(a) * 30, y = 40 + Math.sin(a) * 26; ellipse(r, x, y, 2.2, 2.2, () => c); glow(r, x, y, 6, c, 0.8); });
  // la mano de sombra con garras que sube desde abajo (de la izquierda), hacia la niña
  for (let t = 0; t < 1; t += 0.005) {
    const x = 8 + t * 36, y = 92 - t * 24 + Math.sin(t * 4) * 3, w = 9 - t * 3;
    for (let q = -w; q <= w; q++) put(r, x, y + q, '#05060a', 240);
  }
  for (let k = 0; k < 4; k++) for (let t = 0; t < 14; t++) put(r, 44 + t * 0.9, 66 - k * 4 + t * 0.2 - (t > 9 ? (t - 9) * 0.8 : 0), '#05060a');
  // los dos ojos rojos muy al fondo, abajo a la derecha
  for (const ex of [104, 112]) { ellipse(r, ex, 80, 2.4, 1.4, () => HIELO.ojo); }
  glow(r, 108, 80, 10, HIELO.ojo, 0.7);
  // la escarcha que tapa un poco la pintura y algún descascarado
  for (let i = 0; i < 5; i++) { const cx = 6 + hash(i, 1, 765) * 116, cy = 6 + hash(i, 2, 765) * 84, s = 1.5 + hash(i, 3, 765) * 2.5; for (let y = -s; y <= s; y++) for (let x = -s; x <= s; x++) if (x * x + y * y <= s * s && hash(x, y + i, 766) > 0.35) put(r, cx + x, cy + y, E[2], 170); }
  frostCap(r, 0.25, 767);
  return { name: 'mural_7', w: 128, h: 96, anchor: [64, 95], solid: null, anims: one(r) };
}

// ---------------------------------------------------------------- la Ladrona con la última llama

/**
 * La Ladrona con la última llama (48 x 64): la figura de sombra de siempre, de los ojos rojos chiquitos, ahora con las
 * dos manos adelante sosteniendo una llamita roja (la última luz). `idle` (4 cuadros a 4 fps: la llama late y la
 * figura se encorva apenas, cansada) e `irse` (8 cuadros a 10 fps: se deshace en humo y la llama queda flotando
 * un momento antes de apagarse). Luz roja chiquita.
 */
function lastFlameFigure(): WorldObject {
  const DARK = '#0e0b16', RIM = '#3a2230', EDGE = '#07060c';
  const draw = (k: number, f: number): Raster => {
    const r = createRaster(48, 64), bob = f === 1 || f === 3 ? -1 : 0;
    for (let y = 12; y < 62; y++) {
      const t = (y - 19) / 7.5, w = y < 26 ? 7.5 * Math.sqrt(Math.max(0, 1 - t * t)) + (y > 22 ? 1 : 0) : y < 30 ? 8 + (y - 26) * 0.9 : 11 + (y - 30) * 0.2;
      if (w <= 0) continue;
      const cx = 22 + (y < 30 ? (30 - y) * 0.12 : 0);
      for (let x = -w; x <= w; x++) {
        if (k > 0 && hash(Math.round(x), y, 771 + f) < k * (0.4 + (62 - y) / 80)) continue;
        if (y > 54 && hash(Math.round(x) + 40, y, 772 + f) < (y - 54) / 9) continue;
        put(r, cx + x + Math.sin(y * 0.2 + f) * k * 4, y - k * 10 + bob, x < -w + 1.2 && y < 42 ? RIM : x > w - 1.5 ? EDGE : DARK, Math.round(240 * (1 - k * 0.6)));
      }
    }
    // los ojos rojos chiquitos, mirando la llama (un poco para abajo)
    if (k < 0.7) for (const ex of [21, 27]) { put(r, ex, 21 - k * 10 + bob, '#ff4a32'); put(r, ex, 22 - k * 10 + bob, '#a01a14'); }
    // los brazos de sombra hacia adelante y las manos juntas
    if (k < 0.5) { line(r, 18, 30 + bob, 28, 38 + bob, DARK, 3); line(r, 30, 30 + bob, 32, 38 + bob, DARK, 3); }
    // la llamita roja en las manos (queda un rato flotando cuando ella se va)
    const fl = k < 0.75 ? 1 : Math.max(0, 1 - (k - 0.75) * 4);
    if (fl > 0) {
      const fx = 31, fy = 36 + bob - (k > 0.5 ? (k - 0.5) * 16 : 0), hgt = (9 + Math.sin(f * 1.7) * 2) * fl;
      flameTongue(r, fx, fy, 3.4 * fl + 0.5, hgt, Math.sin(f * 1.3) * 1.5, ['#5a0a08', '#c01a14', '#ff2a1a', '#ff8a6a', '#fff0e0'], Math.round(255 * fl));
      glow(r, fx, fy - 4, 12, '#ff2a1a', 1.2 * fl);
    }
    if (k > 0) for (let i = 0; i < 22; i++) { const hx2 = 24 + (hash(i, f, 773) - 0.5) * 34, hy2 = 54 - hash(f, i, 774) * 56 * k; put(r, hx2, hy2, '#2a2438', 150); }
    return r;
  };
  return {
    name: 'figura_ultima_llama', w: 48, h: 64, anchor: [24, 60], solid: null,
    light: { color: '#ff2a1a', radius: 48, pulse: true, dy: 28 },
    anims: { idle: { frames: [0, 1, 2, 3].map((f) => draw(0, f)), fps: 4, loop: true }, irse: { frames: Array.from({ length: 8 }, (_, f) => draw((f + 1) / 8, f)), fps: 10, loop: false } },
  };
}

// ---------------------------------------------------------------- la utilería

function props(): WorldObject[] {
  const out: WorldObject[] = [];
  const mk = (name: string, w: number, h: number, anchor: [number, number], solid: [number, number, number, number] | null, draw: (r: Raster) => void, frost = 0.55, ember = 0.14) => {
    const r = createRaster(w, h);
    draw(r);
    outline(r, '#030406');
    if (frost) frostCap(r, frost, 780 + name.length * 7);
    coldEdge(r, 0.3);
    if (ember) emberRim(r, ember);
    out.push(grounded({ name, w, h, anchor, solid, anims: one(r) }, r));
  };
  /** el bloque de hielo donde quedó clavada un arma */
  const block = (r: Raster, cx: number, by: number, hw: number, h: number, seed: number) => {
    for (let y = by - h; y < by; y++) {
      const t = (by - y) / h, w = hw * (1 - t * 0.25) + Math.sin(y * 0.4 + seed) * 1.2;
      for (let x = Math.floor(cx - w); x <= cx + w; x++) { const u = (x - cx) / w; put(r, x, y, tone(HI, 0.6 - u * 0.35 + (t > 0.85 ? 0.3 : 0) + (crackDist(x, y, 12, seed) < 0.8 ? 0.2 : 0), x, y, true)); }
    }
  };
  // armas congeladas: una espada enorme y un hacha clavadas en un bloque de hielo
  mk('arma_congelada_0', 48, 64, [24, 60], [-14, -8, 28, 10], (r) => {
    // la hoja que sube del bloque, ancha, y la cruz y el mango arriba
    for (let y = 8; y < 50; y++) for (let x = -3; x <= 3; x++) put(r, 24 + x + (50 - y) * 0.08, y, x < 0 ? '#9aaabb' : x === 0 ? '#c8d4e0' : '#5a6878');
    for (let x = -9; x <= 9; x++) { put(r, 24 + x + 3.4, 8, FE[3]); put(r, 24 + x + 3.4, 9, FE[2]); }
    for (let y = 0; y < 8; y++) put(r, 27.6, y, y % 2 ? '#3a2a20' : '#5a4030');
    block(r, 24, 60, 16, 16, 791);
  });
  mk('arma_congelada_1', 48, 64, [24, 60], [-14, -8, 28, 10], (r) => {
    line(r, 14, 6, 26, 50, (t) => (t < 0.3 ? '#6a5040' : '#4a3828'), 2);
    for (let t = 0; t < 1; t += 0.02) { const a = -0.9 + t * 1.8, x = 15 + Math.cos(a) * 10, y = 14 + Math.sin(a) * 10; for (let q = 0; q < 6; q++) put(r, x - q * 0.9 + 4, y, q < 2 ? '#c8d4e0' : '#6a7888'); }
    block(r, 26, 60, 15, 18, 792);
  });
  // escudos rotos: medio hundidos en la nieve
  for (const v of [0, 1]) mk(`escudo_roto_${v}`, 32, 32, [16, 28], [-10, -6, 20, 6], (r) => {
    ellipse(r, 16, 18, 11, 12, (u, vv, x, y) => {
      if (v === 0 && u > 0.2 + vv * 0.3) return null;
      if (v === 1 && vv > 0.25 + Math.sin(u * 7) * 0.1) return null;
      const rim = u * u + vv * vv > 0.7;
      return rim ? tone(FE, 0.7 - u * 0.3, x, y) : tone(['#2a1414', '#3a1c1a', '#4e2622', '#62302a'], 0.6 - u * 0.3 - vv * 0.2, x, y);
    });
    // el emblema: un cuerno
    if (v === 0) line(r, 10, 22, 14, 12, '#8a7a60', 1);
    snowDrift(r, 1, 31, 29, 6, 811 + v);
  });
  // calaveras de demonio de piedra (sin sangre), con escarcha
  for (const v of [0, 1]) mk(`calavera_demonio_${v}`, 48, 48, [24, 44], [-14, -8, 28, 8], (r) => {
    demonSkull(r, 24, 26, v ? 13 : 15, { seed: 793 + v, pal: PD });
    snowDrift(r, 5, 43, 45, 6, 813 + v);
  });
  // banderas heladas: un asta con una bandera roja rota, dura de hielo, con carámbanos
  for (const v of [0, 1]) mk(`bandera_helada_${v}`, 32, 96, [16, 92], [-5, -6, 10, 7], (r) => {
    for (let y = 4; y < 92; y++) { put(r, 15, y, FE[3]); put(r, 16, y, FE[2]); }
    for (let x = 12; x <= 19; x++) put(r, x, 4, FE[4]);
    for (let y = 8; y < 52 - v * 8; y++) {
      const t = (y - 8) / 40, w = 13 - (v ? Math.abs(Math.sin(y * 0.4)) * 4 : t * 3);
      for (let x = 0; x < w; x++) {
        if (y > 44 - v * 8 && (x % 4 === 0 || hash(x, y, 795) > 0.6)) continue;
        put(r, 17 + x, y + x * 0.15, tone(['#2a0a0a', '#4a1210', '#6a1a14', '#8a2a1c'], 0.6 - x / 30 + Math.sin(y * 0.3) * 0.1, x, y));
      }
    }
    // el emblema descolorido (dos cuernos)
    for (const sx of [-1, 1]) for (let t = 0; t < 5; t++) put(r, 23 + sx * (2 + t * 0.3), 22 - t, '#a08060');
    for (let k = 0; k < 4; k++) { const x = 19 + k * 3, len = 3 + hash(k, v, 796) * 6; for (let t = 0; t < len; t++) put(r, x, 50 - v * 8 + t, t > len - 2 ? '#ffffff' : E[1], 220); }
    snowDrift(r, 5, 27, 93, 5, 815 + v);
  });
  // lápidas de hielo (catacumbas): una losa con un cuerno tallado
  for (const v of [0, 1]) mk(`lapida_hielo_${v}`, 32, 48, [16, 44], [-10, -6, 20, 7], (r) => {
    for (let y = 8 + v * 4; y < 44; y++) { const w = y < 16 + v * 4 ? 10 - (16 + v * 4 - y) * 0.6 : 10; for (let x = -w; x <= w; x++) put(r, 16 + x, y, tone(HI, 0.62 - x / 24 + (y < 12 + v * 4 ? 0.2 : 0), 16 + x, y, true)); }
    // grieta y un tallado de cuernos
    for (let t = 0; t < 14; t++) put(r, 12 + Math.sin(t) * 1.5 + t * 0.3, 18 + t * 1.6, HI[0]);
    for (const sx of [-1, 1]) for (let t = 0; t < 6; t++) put(r, 16 + sx * (2 + t * 0.6), 24 - t, E[0]);
    if (v) put(r, 16, 30, HIELO.ojo);
  });
  // el sarcófago de hielo: un caballero dormido adentro (solo la silueta) con la tapa quebrada
  mk('sarcofago_hielo', 64, 48, [32, 44], [-26, -14, 52, 16], (r) => {
    // el cajón: la cara de arriba (la tapa, clara) y la de adelante (más oscura), con el canto claro entre las dos
    for (let y = 12; y < 44; y++) for (let x = 6; x < 58; x++) {
      const top = y < 24;
      let l = top ? 0.72 - (x - 6) / 160 + (y < 14 ? 0.15 : 0) : 0.4 - (y - 24) / 60 - (x - 6) / 200;
      if (y === 24 || y === 25) l = 0.95;
      if (x === 6 || x === 57) l -= 0.2;
      if (!top && crackDist(x, y, 10, 817) < 0.8) l += 0.15;
      put(r, x, y, tone(HI, l, x, y, true));
    }
    // la silueta del caballero dormido adentro, borrosa a través de la tapa (yelmo con cuernos, manos juntas)
    for (let x = 12; x < 52; x++) for (let y = 15; y < 23; y++) if (Math.abs(y - 19) < 2.4 + (x < 20 ? 1.4 : 0) + (x > 30 && x < 34 ? 1 : 0)) put(r, x, y, '#2a3446', 170);
    for (const dy of [-1, 1]) for (let t = 0; t < 4; t++) put(r, 13 - t, 19 + dy * (3 + t * 0.6), '#2a3446', 150);
    put(r, 15, 18, HIELO.ojo, 170); put(r, 15, 20, HIELO.ojo, 170);
    // la tapa quebrada en diagonal
    for (let t = 0; t < 26; t++) put(r, 24 + t, 12 + t * 0.45 + Math.round(Math.sin(t * 0.9) * 0.6), HI[0]);
    // calaveritas talladas en el frente
    for (const x of [18, 32, 46]) { ellipse(r, x, 33, 3, 3, () => HI[4]); put(r, x - 1, 33, HI[0]); put(r, x + 1, 33, HI[0]); }
  });
  // estalagmitas de hielo y rocas con escarcha
  for (const v of [0, 1]) mk(`estalagmita_hielo_${v}`, 32, 64, [16, 60], [-8, -6, 16, 7], (r) => {
    for (const [dx, h, w] of (v ? [[0, 52, 7], [-7, 26, 4], [7, 34, 4]] : [[0, 40, 8], [6, 22, 4]]) as [number, number, number][]) for (let t = 0; t < h; t++) { const ww = w * (1 - t / h) + 0.4; for (let x = -ww; x <= ww; x++) put(r, 16 + dx + x, 60 - t, tone(HI, 0.7 - x / (w * 1.6) + (t > h * 0.7 ? 0.15 : 0), Math.round(16 + dx + x), 60 - t, true)); }
  });
  for (const v of [0, 1]) mk(`roca_hielo_${v}`, 48, 32, [24, 28], [-16, -6, 32, 7], (r) => {
    ellipse(r, 24, 20, 20 - v * 3, 10 + v * 2, (u, vv, x, y) => tone(RC, 0.6 - vv * 0.35 - u * 0.25 + (crackDist(x, y, 9, 797 + v) < 0.7 ? -0.2 : 0), x, y, true));
    ellipse(r, 14 + v * 18, 22, 8, 6, (u, vv, x, y) => tone(HI, 0.7 - vv * 0.3 - u * 0.2, x, y, true));
  });
  // la armadura caída: un yelmo con cuernos y una hombrera vacíos, sin nadie adentro
  mk('armadura_caida', 48, 48, [24, 44], [-14, -8, 28, 9], (r) => {
    ellipse(r, 18, 32, 10, 9, (u, vv, x, y) => (u > 0.3 && vv > -0.2 && vv < 0.3 ? '#05060a' : tone(FE, 0.75 - vv * 0.3 - u * 0.3, x, y)));
    for (const sx of [-1, 1]) for (let t = 0; t < 10; t++) put(r, 18 + sx * (8 + t * 0.5), 26 - t * 1.1 + t * t * 0.03, tone(HU, 0.7 - t * 0.03, 0, 0));
    ellipse(r, 34, 38, 9, 6, (u, vv, x, y) => tone(FE, 0.7 - vv * 0.35 - u * 0.25, x, y));
    boneLine(r, 4, 43, 18, 40, 1.2, HU.slice(0, 5));
  }, 0.5);
  // las variantes espejadas con otro tono las arma el mapa
  return out;
}

// ---------------------------------------------------------------- calcomanías

/** Calcomanías (capa suelo): nieve acumulada, grietas en el hielo, huellas de lobo, escarcha y ceniza negra. */
function decals(): WorldObject[] {
  const out: WorldObject[] = [];
  const mk = (name: string, w: number, h: number, draw: (r: Raster) => void) => { const r = createRaster(w, h); draw(r); out.push({ name, w, h, anchor: [w >> 1, h >> 1], solid: null, layer: 'suelo', anims: one(r) }); };
  for (const v of [0, 1]) mk(`nieve_acumulada_${v}`, 64, 32, (r) => {
    ellipse(r, 32, 16, 29, 12, (u, vv, x, y) => { const d = Math.hypot(u, vv) + (hash(x >> 2, y >> 1, 801 + v) - 0.5) * 0.3; return d > 1 ? null : tone(N, 0.85 - d * 0.3 - vv * 0.2, x, y, true); }, d0(220));
  });
  for (const v of [0, 1]) mk(`grieta_hielo_${v}`, 64, 32, (r) => {
    for (let c = 0; c < 3; c++) { let x = 32, y = 16; for (let s = 0; s < 24; s++) { const a = (c / 3) * Math.PI * 2 + v + (hash(c, s, 803 + v) - 0.5) * 1.3; x += Math.cos(a) * 1.2; y += Math.sin(a) * 0.6; put(r, x, y, '#020306'); put(r, x, y - 1, E[1], 150); } }
  });
  for (const v of [0, 1]) mk(`huellas_lobo_${v}`, 48, 32, (r) => {
    for (let k = 0; k < 4; k++) { const x = 6 + k * 11, y = 10 + (k % 2) * 10 + v * 2; ellipse(r, x, y, 2.4, 2, () => '#1a1e26', 200); for (const [dx, dy] of [[-2, -3], [0, -4], [2, -3]]) put(r, x + dx, y + dy, '#1a1e26', 200); }
  });
  for (const v of [0, 1]) mk(`escarcha_${v}`, 48, 32, (r) => {
    for (let i = 0; i < 6; i++) { const cx = 8 + hash(i, v, 805) * 32, cy = 6 + hash(v, i, 806) * 20; for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; for (let t = 0; t < 4; t++) put(r, cx + Math.cos(a) * t, cy + Math.sin(a) * t * 0.6, t < 2 ? E[4] : E[2], 200); } }
  });
  for (const v of [0, 1]) mk(`ceniza_negra_${v}`, 48, 32, (r) => {
    ellipse(r, 24, 16, 21, 11, (u, vv, x, y) => (hash(x, y, 807 + v) > 0.45 + Math.hypot(u, vv) * 0.4 ? (hash(x, y, 808) > 0.8 ? '#3a3a40' : '#0a0b0e') : null), 220);
    for (let i = 0; i < 3; i++) put(r, 14 + i * 9, 14 + i * 2, BR[2]);
  });
  return out;
}
const d0 = (a: number) => a;

// ---------------------------------------------------------------- las partículas

/** Nieve negra (8 x 8, 4 cuadros a 6 fps): un copo que gira, a veces claro y a veces gris de ceniza. */
export function snowParticle(): { name: string; w: number; h: number; frames: Raster[]; fps: number } {
  const frames = [0, 1, 2, 3].map((k) => {
    const r = createRaster(8, 8), c = k % 2 ? '#c8d8ea' : '#6a7480';
    put(r, 4, 4, '#ffffff');
    const arms = k % 2 ? [[1, 0], [-1, 0], [0, 1], [0, -1]] : [[1, 1], [-1, -1], [1, -1], [-1, 1]];
    for (const [dx, dy] of arms) put(r, 4 + dx, 4 + dy, c, 220);
    if (k === 2) put(r, 2, 6, '#14161c', 200);
    return r;
  });
  return { name: 'nieve', w: 8, h: 8, frames, fps: 6 };
}

/** Ventisca (16 x 4, 3 cuadros a 10 fps): una raya de nieve horizontal que se estira (la nieve corre de lado). */
export function blizzardParticle(): { name: string; w: number; h: number; frames: Raster[]; fps: number } {
  const frames = [0, 1, 2].map((k) => {
    const r = createRaster(16, 4), len = 8 + k * 3;
    for (let x = 0; x < len; x++) put(r, 15 - x, 1 + (x > len - 3 ? 1 : 0), x < 2 ? '#ffffff' : '#b8d0ea', Math.round(230 * (1 - x / len)));
    return r;
  });
  return { name: 'ventisca', w: 16, h: 4, frames, fps: 10 };
}

/** La capa agua del lago: agua helada negra con brillos fríos (la hoja la arma el mapa con estos colores). */
export const AGUA_HELADA = { base: '#081018', brillo: '#3a5a7a', espuma: '#d0e4f6' };

export function corazonObjectsB(): WorldObject[] {
  return [
    frozenChains(0), frozenChains(1), frozenChains(2), frontSnow(0), frontSnow(1), frontStalactites(0), frontStalactites(1),
    farIce(0), farIce(1), farIce(2), mural7(), lastFlameFigure(), ...props(), ...decals(),
  ];
}

void mixC; void glow;
