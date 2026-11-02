import { createRaster, type Raster } from '../core/raster';

/**
 * Lienzo de cine: lo que comparten el título, la portada y las cartas de los actos de Réquiem de Ceniza. A
 * diferencia del resto del taller (pixel art con rampas), acá se pinta como una ilustración: color en flotantes con
 * alfa premultiplicado, luces que pasan de 1 y se comprimen al final, desenfoques para el resplandor, ruido fractal
 * para nubes y humo, polígonos con antialias para las siluetas y un mapa de distancias para biselar letras. Sin
 * Canvas: da los mismos pixeles en Node y en el navegador.
 */

export type C3 = [number, number, number];
/** Color en flotantes premultiplicados (r, g, b ya multiplicados por a). Las luces pueden pasar de 1. */
export interface Lamina { w: number; h: number; d: Float32Array }
/** Un solo canal (cobertura, alto, luz). */
export interface Mascara { w: number; h: number; d: Float32Array }

export const lamina = (w: number, h: number): Lamina => ({ w, h, d: new Float32Array(w * h * 4) });
export const mascara = (w: number, h: number): Mascara => ({ w, h, d: new Float32Array(w * h) });
export const hex = (s: string): C3 => [parseInt(s.slice(1, 3), 16) / 255, parseInt(s.slice(3, 5), 16) / 255, parseInt(s.slice(5, 7), 16) / 255];
export const mezcla = (a: C3, b: C3, t: number): C3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const sat = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const suave = (a: number, b: number, v: number) => { const t = sat((v - a) / (b - a)); return t * t * (3 - 2 * t); };

// ------------------------------------------------------------------ ruido
/** Hash entero a 0..1 (rápido y estable). */
export function hash2(x: number, y: number, s = 0): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** Ruido de valor 2D suave. Con `per` se repite cada `per` unidades en x (para capas que se enrollan). */
export function ruido2(x: number, y: number, s = 0, per = 0): number {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const X0 = per ? ((xi % per) + per) % per : xi, X1 = per ? (((xi + 1) % per) + per) % per : xi + 1;
  const a = hash2(X0, yi, s), b = hash2(X1, yi, s), c = hash2(X0, yi + 1, s), d = hash2(X1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
/** Ruido fractal (0..1). `per` en unidades de la primera octava. */
export function fbm(x: number, y: number, oct = 5, s = 0, per = 0): number {
  let v = 0, amp = 0.5, tot = 0, f = 1;
  for (let i = 0; i < oct; i++) { v += ruido2(x * f, y * f, s + i * 17, per ? per * f : 0) * amp; tot += amp; amp *= 0.5; f *= 2; }
  return v / tot;
}

/** Celdas (Worley): distancia al punto más cercano y al segundo. F2 - F1 cerca de 0 es el borde entre celdas. */
export function celdas(x: number, y: number, s = 0): [number, number] {
  const xi = Math.floor(x), yi = Math.floor(y);
  let f1 = 9, f2 = 9;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = xi + i, cy = yi + j, px = cx + hash2(cx, cy, s), py = cy + hash2(cx, cy, s + 101);
    const d = Math.hypot(px - x, py - y);
    if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
  }
  return [f1, f2];
}

// ------------------------------------------------------------------ polígonos con antialias
export type P2 = [number, number];
type Modo = 'max' | 'sumar' | 'restar' | 'poner';
function aplicar(m: Mascara, i: number, c: number, valor: number, modo: Modo) {
  if (c <= 0) return;
  const v = c * valor;
  if (modo === 'max') { if (v > m.d[i]) m.d[i] = v; }
  else if (modo === 'sumar') m.d[i] += v;
  else if (modo === 'restar') m.d[i] *= 1 - c;
  else m.d[i] = m.d[i] * (1 - c) + v;
}
/**
 * Rellena uno o más anillos (par-impar: un anillo dentro de otro hace un hueco) con cobertura exacta en x y 4
 * sublíneas por fila. `modo`: max (unir), sumar, restar (cavar) o poner (pintar encima).
 */
export function rellenar(m: Mascara, anillos: P2[][] | P2[], valor = 1, modo: Modo = 'max') {
  const rs = (typeof (anillos as P2[][])[0]?.[0] === 'number' ? [anillos as P2[]] : anillos as P2[][]).filter((r) => r.length > 2);
  const ed: [number, number, number, number][] = [];
  let ymin = Infinity, ymax = -Infinity;
  for (const r of rs) for (let i = 0; i < r.length; i++) {
    const a = r[i], b = r[(i + 1) % r.length];
    if (a[1] === b[1]) continue;
    ed.push(a[1] < b[1] ? [a[0], a[1], b[0], b[1]] : [b[0], b[1], a[0], a[1]]);
    ymin = Math.min(ymin, a[1], b[1]); ymax = Math.max(ymax, a[1], b[1]);
  }
  if (!ed.length) return;
  const y0 = Math.max(0, Math.floor(ymin)), y1 = Math.min(m.h - 1, Math.ceil(ymax));
  const fila = new Float32Array(m.w + 2);
  const SS = 4, xs: number[] = [];
  for (let y = y0; y <= y1; y++) {
    fila.fill(0);
    let xa = m.w, xb = -1;
    for (let s = 0; s < SS; s++) {
      const sy = y + (s + 0.5) / SS;
      xs.length = 0;
      for (const e of ed) if (sy >= e[1] && sy < e[3]) xs.push(e[0] + (sy - e[1]) / (e[3] - e[1]) * (e[2] - e[0]));
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const a = Math.max(0, xs[k]), b = Math.min(m.w, xs[k + 1]);
        if (b <= a) continue;
        const ia = Math.floor(a), ib = Math.floor(b);
        xa = Math.min(xa, ia); xb = Math.max(xb, ib);
        if (ia === ib) { fila[ia] += (b - a) / SS; continue; }
        fila[ia] += (ia + 1 - a) / SS;
        for (let x = ia + 1; x < ib; x++) fila[x] += 1 / SS;
        if (ib < m.w) fila[ib] += (b - ib) / SS;
      }
    }
    for (let x = Math.max(0, xa); x <= Math.min(m.w - 1, xb); x++) aplicar(m, y * m.w + x, Math.min(1, fila[x]), valor, modo);
  }
}
/** Disco con borde suave. */
export function disco(m: Mascara, cx: number, cy: number, r: number, valor = 1, modo: Modo = 'max') {
  const x0 = Math.max(0, Math.floor(cx - r - 1)), x1 = Math.min(m.w - 1, Math.ceil(cx + r + 1));
  const y0 = Math.max(0, Math.floor(cy - r - 1)), y1 = Math.min(m.h - 1, Math.ceil(cy + r + 1));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    aplicar(m, y * m.w + x, sat(r - d + 0.5), valor, modo);
  }
}
/** Trazo de grosor variable (de w0 a w1) con puntas redondas opcionales. */
export function trazo(m: Mascara, x0: number, y0: number, x1: number, y1: number, w0: number, w1 = w0, valor = 1, modo: Modo = 'max', puntas = true) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  rellenar(m, [[x0 + nx * w0 / 2, y0 + ny * w0 / 2], [x1 + nx * w1 / 2, y1 + ny * w1 / 2], [x1 - nx * w1 / 2, y1 - ny * w1 / 2], [x0 - nx * w0 / 2, y0 - ny * w0 / 2]], valor, modo);
  if (puntas) { if (w0 > 1.2) disco(m, x0, y0, w0 / 2, valor, modo); if (w1 > 1.2) disco(m, x1, y1, w1 / 2, valor, modo); }
}
/** Línea quebrada de grosor que va de w0 a w1 a lo largo. */
export function polilinea(m: Mascara, pts: P2[], w0: number, w1 = w0, valor = 1, modo: Modo = 'max') {
  for (let i = 0; i + 1 < pts.length; i++) {
    const t0 = i / (pts.length - 1), t1 = (i + 1) / (pts.length - 1);
    trazo(m, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w0 + (w1 - w0) * t0, w0 + (w1 - w0) * t1, valor, modo);
  }
}

// ------------------------------------------------------------------ desenfoque y distancias
/** Desenfoque de caja de radio r sobre `n` canales intercalados (tres pasadas se parecen a una gaussiana). */
function caja1(src: Float32Array, dst: Float32Array, w: number, h: number, r: number, n: number, horiz: boolean) {
  const largo = horiz ? w : h, lineas = horiz ? h : w, paso = horiz ? n : w * n, inv = 1 / (2 * r + 1);
  const acc = new Float32Array(n);
  for (let l = 0; l < lineas; l++) {
    const base = horiz ? l * w * n : l * n;
    for (let c = 0; c < n; c++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += src[base + Math.min(largo - 1, Math.max(0, k)) * paso + c];
      acc[c] = s;
      for (let i = 0; i < largo; i++) {
        dst[base + i * paso + c] = acc[c] * inv;
        const sale = Math.max(0, i - r), entra = Math.min(largo - 1, i + r + 1);
        acc[c] += src[base + entra * paso + c] - src[base + sale * paso + c];
      }
    }
  }
}
/** Desenfoque casi gaussiano (radio aproximado `r` pixeles) de un buffer de `n` canales, en el lugar. */
export function desenfocar(d: Float32Array, w: number, h: number, r: number, n = 1) {
  if (r < 0.5) return;
  const tmp = new Float32Array(d.length), rr = Math.max(1, Math.round(r / 1.7));
  for (let p = 0; p < 3; p++) { caja1(d, tmp, w, h, rr, n, true); caja1(tmp, d, w, h, rr, n, false); }
}
export const desenfocada = (m: Mascara, r: number): Mascara => { const o = { w: m.w, h: m.h, d: new Float32Array(m.d) }; desenfocar(o.d, o.w, o.h, r); return o; };

/** Distancia euclídea exacta (Felzenszwalb) de cada pixel al pixel "dentro" más cercano (0 si está dentro). */
export function distancia(m: Mascara, dentro: (v: number) => boolean): Float32Array {
  const { w, h } = m, INF = 1e12;
  const f = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) f[i] = dentro(m.d[i]) ? 0 : INF;
  const n = Math.max(w, h), z = new Float32Array(n + 1), v = new Int32Array(n), g = new Float32Array(n), out = new Float32Array(n);
  const pasada = (len: number, get: (i: number) => number, set: (i: number, x: number) => void) => {
    for (let i = 0; i < len; i++) g[i] = get(i);
    let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
    for (let q = 1; q < len; q++) {
      let s = ((g[q] + q * q) - (g[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) { k--; s = ((g[q] + q * q) - (g[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
      k++; v[k] = q; z[k] = s; z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < len; q++) { while (z[k + 1] < q) k++; out[q] = (q - v[k]) * (q - v[k]) + g[v[k]]; }
    for (let i = 0; i < len; i++) set(i, out[i]);
  };
  for (let x = 0; x < w; x++) pasada(h, (i) => f[i * w + x], (i, val) => { f[i * w + x] = val; });
  for (let y = 0; y < h; y++) pasada(w, (i) => f[y * w + i], (i, val) => { f[y * w + i] = val; });
  for (let i = 0; i < w * h; i++) f[i] = Math.sqrt(f[i]);
  return f;
}

// ------------------------------------------------------------------ pintar en la lámina
/** Pinta un color a través de una máscara: `normal` (encima, con alfa), `luz` (suma la luz sin tocar el alfa). */
export function pintar(L: Lamina, m: Mascara | null, c: C3, k = 1, modo: 'normal' | 'luz' | 'multiplicar' = 'normal') {
  const d = L.d;
  for (let i = 0, n = L.w * L.h; i < n; i++) {
    const a = (m ? m.d[i] : 1) * k;
    if (a <= 0) continue;
    const j = i * 4;
    if (modo === 'normal') { const aa = Math.min(1, a); d[j] = d[j] * (1 - aa) + c[0] * aa; d[j + 1] = d[j + 1] * (1 - aa) + c[1] * aa; d[j + 2] = d[j + 2] * (1 - aa) + c[2] * aa; d[j + 3] = d[j + 3] * (1 - aa) + aa; }
    else if (modo === 'luz') { d[j] += c[0] * a; d[j + 1] += c[1] * a; d[j + 2] += c[2] * a; }
    else { const aa = Math.min(1, a); d[j] *= 1 - aa + c[0] * aa; d[j + 1] *= 1 - aa + c[1] * aa; d[j + 2] *= 1 - aa + c[2] * aa; }
  }
}
/** Luz que también da alfa (para capas transparentes: un resplandor que se ve sobre cualquier fondo). */
export function brillo(L: Lamina, m: Mascara, c: C3, k = 1) {
  const d = L.d;
  for (let i = 0, n = L.w * L.h; i < n; i++) {
    const a = m.d[i] * k; if (a <= 0) continue;
    const j = i * 4;
    d[j] += c[0] * a; d[j + 1] += c[1] * a; d[j + 2] += c[2] * a; d[j + 3] = Math.min(1, d[j + 3] + a * Math.max(c[0], c[1], c[2]));
  }
}
/** Rellena con un degradado vertical (paradas [y 0..1, color]). */
export function degradado(L: Lamina, paradas: [number, C3][], m: Mascara | null = null) {
  for (let y = 0; y < L.h; y++) {
    const t = y / (L.h - 1);
    let k = 0; while (k < paradas.length - 2 && t > paradas[k + 1][0]) k++;
    const [ta, ca] = paradas[k], [tb, cb] = paradas[Math.min(k + 1, paradas.length - 1)];
    const c = mezcla(ca, cb, tb > ta ? sat((t - ta) / (tb - ta)) : 0);
    for (let x = 0; x < L.w; x++) {
      const i = y * L.w + x, a = m ? m.d[i] : 1; if (a <= 0) continue;
      const j = i * 4; L.d[j] = L.d[j] * (1 - a) + c[0] * a; L.d[j + 1] = L.d[j + 1] * (1 - a) + c[1] * a; L.d[j + 2] = L.d[j + 2] * (1 - a) + c[2] * a; L.d[j + 3] = L.d[j + 3] * (1 - a) + a;
    }
  }
}
/** Resplandor radial (luz que suma), elíptico con `ey` < 1. */
export function halo(L: Lamina, cx: number, cy: number, r: number, c: C3, k = 1, ey = 1, conAlfa = false) {
  const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(L.w - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r * ey)), y1 = Math.min(L.h - 1, Math.ceil(cy + r * ey));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const q = Math.hypot((x - cx) / r, (y - cy) / (r * ey)); if (q >= 1) continue;
    const a = (1 - q) * (1 - q) * k, j = (y * L.w + x) * 4;
    L.d[j] += c[0] * a; L.d[j + 1] += c[1] * a; L.d[j + 2] += c[2] * a;
    if (conAlfa) L.d[j + 3] = Math.min(1, L.d[j + 3] + a * Math.max(c[0], c[1], c[2]));
  }
}
/** Lámina b encima de a en (x, y), con alfa premultiplicado. `k` la opacidad. */
export function encima(a: Lamina, b: Lamina, ox = 0, oy = 0, k = 1, sumar = false) {
  for (let y = 0; y < b.h; y++) {
    const ty = y + oy; if (ty < 0 || ty >= a.h) continue;
    for (let x = 0; x < b.w; x++) {
      const tx = x + ox; if (tx < 0 || tx >= a.w) continue;
      const s = (y * b.w + x) * 4, t = (ty * a.w + tx) * 4, al = b.d[s + 3] * k;
      if (sumar) { a.d[t] += b.d[s] * k; a.d[t + 1] += b.d[s + 1] * k; a.d[t + 2] += b.d[s + 2] * k; a.d[t + 3] = Math.min(1, a.d[t + 3] + al); continue; }
      if (al <= 0 && b.d[s] <= 0 && b.d[s + 1] <= 0 && b.d[s + 2] <= 0) continue;
      a.d[t] = a.d[t] * (1 - al) + b.d[s] * k; a.d[t + 1] = a.d[t + 1] * (1 - al) + b.d[s + 1] * k; a.d[t + 2] = a.d[t + 2] * (1 - al) + b.d[s + 2] * k; a.d[t + 3] = a.d[t + 3] * (1 - al) + al;
    }
  }
}
/** Reescala por área (para achicar) o bilineal (para agrandar). */
export function escalar(L: Lamina, w: number, h: number): Lamina {
  const o = lamina(w, h), sx = L.w / w, sy = L.h / h;
  if (sx >= 1 && sy >= 1) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const fx0 = x * sx, fx1 = fx0 + sx, fy0 = y * sy, fy1 = fy0 + sy;
      let r = 0, g = 0, b = 0, a = 0, tot = 0;
      for (let yy = Math.floor(fy0); yy < Math.min(L.h, Math.ceil(fy1)); yy++) {
        const wy = Math.min(fy1, yy + 1) - Math.max(fy0, yy);
        for (let xx = Math.floor(fx0); xx < Math.min(L.w, Math.ceil(fx1)); xx++) {
          const ww = wy * (Math.min(fx1, xx + 1) - Math.max(fx0, xx)), j = (yy * L.w + xx) * 4;
          r += L.d[j] * ww; g += L.d[j + 1] * ww; b += L.d[j + 2] * ww; a += L.d[j + 3] * ww; tot += ww;
        }
      }
      const j = (y * w + x) * 4; o.d[j] = r / tot; o.d[j + 1] = g / tot; o.d[j + 2] = b / tot; o.d[j + 3] = a / tot;
    }
    return o;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const fx = Math.min(L.w - 1.001, Math.max(0, (x + 0.5) * sx - 0.5)), fy = Math.min(L.h - 1.001, Math.max(0, (y + 0.5) * sy - 0.5));
    const xi = Math.floor(fx), yi = Math.floor(fy), u = fx - xi, v = fy - yi;
    for (let c = 0; c < 4; c++) {
      const p = (yy: number, xx: number) => L.d[(yy * L.w + xx) * 4 + c];
      o.d[(y * w + x) * 4 + c] = (p(yi, xi) * (1 - u) + p(yi, xi + 1) * u) * (1 - v) + (p(yi + 1, xi) * (1 - u) + p(yi + 1, xi + 1) * u) * v;
    }
  }
  return o;
}
/** Un render del motor (Raster 8 bits) como lámina, con un tono por pixel opcional. */
export function desdeRaster(r: Raster, tono?: (c: C3, a: number, x: number, y: number) => C3): Lamina {
  const o = lamina(r.w, r.h);
  for (let i = 0; i < r.w * r.h; i++) {
    const a = r.data[i * 4 + 3] / 255; if (!a) continue;
    let c: C3 = [r.data[i * 4] / 255, r.data[i * 4 + 1] / 255, r.data[i * 4 + 2] / 255];
    if (tono) c = tono(c, a, i % r.w, Math.floor(i / r.w));
    o.d[i * 4] = c[0] * a; o.d[i * 4 + 1] = c[1] * a; o.d[i * 4 + 2] = c[2] * a; o.d[i * 4 + 3] = a;
  }
  return o;
}
/** Recorte de una lámina (con relleno transparente). */
export function recortar(L: Lamina, x0: number, y0: number, w: number, h: number): Lamina {
  const o = lamina(w, h);
  for (let y = 0; y < h; y++) { const sy = y + y0; if (sy < 0 || sy >= L.h) continue; for (let x = 0; x < w; x++) { const sx = x + x0; if (sx < 0 || sx >= L.w) continue; o.d.set(L.d.subarray((sy * L.w + sx) * 4, (sy * L.w + sx) * 4 + 4), (y * w + x) * 4); } }
  return o;
}

/** Pinta a través de una máscara con el color variado por ruido (piedra, tierra, corteza). */
export function pintarTex(L: Lamina, m: Mascara, c: C3, variacion = 0.35, esc = 30, s = 1) {
  const d = L.d;
  for (let i = 0, n = L.w * L.h; i < n; i++) {
    const a = Math.min(1, m.d[i]); if (a <= 0) continue;
    const x = i % L.w, y = (i - x) / L.w, v = 1 + (fbm(x / esc, y / esc, 4, s) - 0.5) * 2 * variacion, j = i * 4;
    d[j] = d[j] * (1 - a) + c[0] * v * a; d[j + 1] = d[j + 1] * (1 - a) + c[1] * v * a; d[j + 2] = d[j + 2] * (1 - a) + c[2] * v * a; d[j + 3] = d[j + 3] * (1 - a) + a;
  }
}
/**
 * Rayos de luz (dispersión): lo que brilla más que `umbral` se arrastra hacia la fuente (sx, sy) y se suma. Se hace a
 * la mitad de resolución.
 */
export function rayosDeLuz(L: Lamina, sx: number, sy: number, k = 0.6, umbral = 0.3, n = 40, decae = 0.965) {
  const w = L.w >> 1, h = L.h >> 1, src = new Float32Array(w * h * 3), out = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const j = ((y * 2) * L.w + x * 2) * 4, l = L.d[j] * 0.3 + L.d[j + 1] * 0.55 + L.d[j + 2] * 0.15, f = Math.max(0, l - umbral) / (l || 1), i = (y * w + x) * 3;
    src[i] = L.d[j] * f; src[i + 1] = L.d[j + 1] * f; src[i + 2] = L.d[j + 2] * f;
  }
  const fx = sx / 2, fy = sy / 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, peso = 1, tot = 0;
    const dx = (fx - x) / n, dy = (fy - y) / n;
    for (let s2 = 0; s2 < n; s2++) {
      const px = Math.round(x + dx * s2), py = Math.round(y + dy * s2);
      if (px < 0 || py < 0 || px >= w || py >= h) break;
      const i = (py * w + px) * 3; r += src[i] * peso; g += src[i + 1] * peso; b += src[i + 2] * peso; tot += peso; peso *= decae;
    }
    const i = (y * w + x) * 3, q = tot ? 1 / tot : 0; out[i] = r * q; out[i + 1] = g * q; out[i + 2] = b * q;
  }
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    const i = (Math.min(h - 1, y >> 1) * w + Math.min(w - 1, x >> 1)) * 3, j = (y * L.w + x) * 4;
    L.d[j] += out[i] * k; L.d[j + 1] += out[i + 1] * k; L.d[j + 2] += out[i + 2] * k;
  }
}

// ------------------------------------------------------------------ terminar
/** Comprime las luces altas con una rodilla suave (no se queman en blanco plano). */
const rodilla = (v: number) => (v <= 0.78 ? v : 0.78 + 0.22 * (1 - Math.exp(-(v - 0.78) / 0.22)));
/**
 * A 8 bits: comprime luces y quita el premultiplicado. En las opacas agrega un poco de ruido para que los degradados
 * no hagan escalones (en las transparentes no: arruina la compresión del PNG y el resplandor no lo necesita).
 */
export function aRaster(L: Lamina, opaco = false): Raster {
  const r = createRaster(L.w, L.h);
  for (let i = 0; i < L.w * L.h; i++) {
    const j = i * 4, a = opaco ? 1 : sat(L.d[j + 3]);
    if (a <= 0.0005) continue;
    const tr = opaco ? (hash2(i, 7, 3) - 0.5) / 255 : 0;
    for (let c = 0; c < 3; c++) {
      let v = L.d[j + c] / (opaco ? 1 : a);
      v = rodilla(Math.max(0, v));
      r.data[j + c] = Math.round(sat(v + tr) * 255);
    }
    r.data[j + 3] = Math.round(a * 255);
  }
  return r;
}
/** Viñeta: oscurece los bordes (multiplica). */
export function vineta(L: Lamina, k = 0.6, r0 = 0.55, r1 = 1.4) {
  const cx = L.w / 2, cy = L.h / 2;
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    // 0 en el centro, 1 en el medio de cada borde, 1.41 en las esquinas
    const q = Math.hypot((x - cx) / cx, (y - cy) / cy);
    const f = 1 - k * suave(r0, r1, q), j = (y * L.w + x) * 4;
    L.d[j] *= f; L.d[j + 1] *= f; L.d[j + 2] *= f;
  }
}
/** Grano de película (suma y resta muy poco, con semilla). */
export function grano(L: Lamina, k = 0.025, s = 1) {
  for (let i = 0; i < L.w * L.h; i++) { const n = (hash2(i % L.w, Math.floor(i / L.w), s) - 0.5) * k, j = i * 4; L.d[j] = Math.max(0, L.d[j] + n * L.d[j + 3]); L.d[j + 1] = Math.max(0, L.d[j + 1] + n * L.d[j + 3]); L.d[j + 2] = Math.max(0, L.d[j + 2] + n * L.d[j + 3]); }
}
/** Varios cuadros en una grilla de `cols` columnas (cuadro i en la columna i % cols, fila floor(i / cols)). */
export function grilla(cuadros: Raster[], cols: number): Raster {
  const w = cuadros[0].w, h = cuadros[0].h, filas = Math.ceil(cuadros.length / cols), o = createRaster(w * cols, h * filas);
  cuadros.forEach((c, i) => { const ox = (i % cols) * w, oy = Math.floor(i / cols) * h; for (let y = 0; y < h; y++) o.data.set(c.data.subarray(y * w * 4, (y + 1) * w * 4), ((oy + y) * o.w + ox) * 4); });
  return o;
}
/** Rayo con ramas (desplazamiento del punto medio): devuelve los tramos con su grosor relativo. */
export function rayo(x0: number, y0: number, x1: number, y1: number, r: () => number, rugosidad = 0.28, ramas = 4): { pts: P2[]; w: number }[] {
  const partir = (a: P2, b: P2, n: number): P2[] => {
    if (n === 0) return [a, b];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L, desv = (r() - 0.5) * L * rugosidad;
    const m: P2 = [(a[0] + b[0]) / 2 + nx * desv, (a[1] + b[1]) / 2 + ny * desv];
    return [...partir(a, m, n - 1).slice(0, -1), ...partir(m, b, n - 1)];
  };
  const tronco = partir([x0, y0], [x1, y1], 7), out = [{ pts: tronco, w: 1 }];
  for (let k = 0; k < ramas; k++) {
    const i = 8 + Math.floor(r() * (tronco.length * 0.6)), p = tronco[Math.min(i, tronco.length - 2)];
    const L = Math.hypot(x1 - x0, y1 - y0) * (0.15 + r() * 0.25), ang = Math.atan2(y1 - y0, x1 - x0) + (r() < 0.5 ? -1 : 1) * (0.4 + r() * 0.6);
    out.push({ pts: partir(p, [p[0] + Math.cos(ang) * L, p[1] + Math.sin(ang) * L], 5), w: 0.45 });
  }
  return out;
}
