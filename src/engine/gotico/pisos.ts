import { createRaster, type Raster } from '../core/raster';
import { MATERIALES } from './materiales';
import { LUZ, BALDOSA, trama, hash3 } from './render';

/**
 * Pisos del taller gótico: baldosas en rombo de 160×80 (5×5 celdas de juego), como las del juego de la catedral.
 * La textura sale de la posición en el mundo y se repite cada 80 unidades, así dos baldosas iguales pegan sin
 * costura en cualquier lado. Cada piso tiene un relieve (alto por punto) que la luz de arriba a la izquierda
 * convierte en volumen, y una o varias rampas de material según la zona (piedra en las lajas, tierra en las juntas).
 * Las variantes agregan detalles lejos del borde (grietas, piedras sueltas, hojas, huesos).
 */

export interface PisoDef {
  id: string;
  nombre: [string, string];
  /** Tema donde aparece primero (para la paleta). */
  tema: string;
  variantes: number;
  cuadros?: number;
  /** Para cada punto del piso (x, y en 0..80) da [material, alto, tono]. */
  punto: (x: number, y: number, v: number, f: number) => [string, number, number];
}

const P = BALDOSA;
// ruido de valor que se repite cada `per` (para que las baldosas peguen)
function rper(x: number, y: number, per: number, s = 0): number {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const h = (a: number, b: number) => hash3(((a % per) + per) % per, ((b % per) + per) % per, s);
  const sm = (t: number) => t * t * (3 - 2 * t), u = sm(xf), v = sm(yf);
  return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v;
}
/** Ruido fractal periódico (escala `e` en celdas por baldosa). */
const fr = (x: number, y: number, e: number, s = 0) => rper((x / P) * e, (y / P) * e, e, s) * 0.6 + rper((x / P) * e * 2, (y / P) * e * 2, e * 2, s + 1) * 0.3 + rper((x / P) * e * 4, (y / P) * e * 4, e * 4, s + 2) * 0.1;
/** Celdas de Voronoi periódicas: distancia al centro más cercano, al segundo y el id del más cercano. */
function voronoi(x: number, y: number, n: number, s = 0): [number, number, number] {
  const c = P / n, cx = Math.floor(x / c), cy = Math.floor(y / c);
  let d1 = 1e9, d2 = 1e9, id = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const gx = cx + i, gy = cy + j, wx = ((gx % n) + n) % n, wy = ((gy % n) + n) % n;
    const px = (gx + 0.15 + hash3(wx, wy, s) * 0.7) * c, py = (gy + 0.15 + hash3(wx, wy, s + 9) * 0.7) * c;
    const d = Math.hypot(x - px, y - py);
    if (d < d1) { d2 = d1; d1 = d; id = wx * 131 + wy; } else if (d < d2) d2 = d;
  }
  return [d1, d2, id];
}
/** Para detalles de variante: cerca del borde no (para no romper la costura). */
const lejosBorde = (x: number, y: number, m = 8) => x > m && y > m && x < P - m && y < P - m;
const det = (x: number, y: number, v: number, k: number) => hash3(Math.floor(x / k), Math.floor(y / k), v * 7 + 3);

function lajas(n: number, matA: string, matJ: string, tostado = 0) {
  return (x: number, y: number, v: number): [string, number, number] => {
    const [d1, d2, id] = voronoi(x, y, n, 4);
    const borde = d2 - d1;
    if (borde < 1.6) return [matJ, -2, -0.1];
    const h = Math.min(3, borde * 0.6) + (fr(x, y, 8, id) - 0.5) * 1.2;
    let tono = (hash3(id, 1, 2) - 0.5) * 0.18 + tostado;
    if (v > 0 && lejosBorde(x, y) && det(x, y, v, 22) > 0.8 && borde < 4) tono -= 0.2; // grietas en algunas
    return [matA, h, tono];
  };
}

export const PISOS: PisoDef[] = [
  { id: 'pasto', nombre: ['Pasto', 'Grass'], tema: 'campo', variantes: 4, punto: (x, y, v) => {
    const n = fr(x, y, 8, 1), m = fr(x, y, 3, 5);
    if (v > 0 && lejosBorde(x, y) && det(x, y, v, 3) > 0.96) return ['piedra', 1, 0];
    if (m < 0.3) return ['tierra', n * 1.5, (n - 0.5) * 0.3];
    return ['pasto', n * 1.5 + (hash3(x | 0, y | 0, 3) > 0.75 ? 0.8 : 0), (m - 0.5) * 0.2];
  } },
  { id: 'pasto_seco', nombre: ['Pasto seco', 'Dry grass'], tema: 'campo', variantes: 4, punto: (x, y) => {
    const n = fr(x, y, 8, 2), m = fr(x, y, 4, 6);
    return m < 0.45 ? ['tierra', n * 1.5, 0.05] : ['paja', n * 1.5, (m - 0.5) * 0.3 - 0.15];
  } },
  { id: 'tierra', nombre: ['Tierra', 'Dirt'], tema: 'campo', variantes: 4, punto: (x, y, v) => {
    const n = fr(x, y, 10, 3);
    if (v > 0 && lejosBorde(x, y) && det(x, y, v, 2) > 0.97) return ['piedra', 1.5, 0];
    return ['tierra', n * 2, (fr(x, y, 4, 8) - 0.5) * 0.3];
  } },
  { id: 'camino', nombre: ['Camino de tierra', 'Dirt road'], tema: 'campo', variantes: 2, punto: (x, y, v) => {
    // variante 0: el camino corre a lo largo de x; 1: a lo largo de y. Rodadas que serpentean con ruido periódico.
    const [u, w] = v === 0 ? [x, y] : [y, x];
    const n = fr(x, y, 10, 4), serp = (rper((u / P) * 2, 0.5, 2, 9) - 0.5) * 8;
    const rodada = Math.abs(w - 30 - serp) < 2.2 || Math.abs(w - 50 - serp) < 2.2;
    const piedrita = hash3(Math.floor(x / 2), Math.floor(y / 2), 41) > 0.95;
    return piedrita ? ['piedra', 1, 0] : ['tierra', n * 1.5 - (rodada ? 1.2 : 0), rodada ? -0.14 : 0.1];
  } },
  { id: 'empedrado', nombre: ['Empedrado', 'Cobblestone'], tema: 'pueblo', variantes: 4, punto: (x, y, v) => {
    const [d1, d2, id] = voronoi(x, y, 7, 7);
    if (d2 - d1 < 1.5) return ['tierra', -1.5, -0.2];
    if (v > 1 && lejosBorde(x, y) && det(x, y, v, 16) > 0.85) return ['tierra', 0, 0];
    return ['piedra', Math.min(2.5, (d2 - d1) * 0.7), (hash3(id, 3, 3) - 0.5) * 0.25];
  } },
  { id: 'lajas', nombre: ['Lajas de piedra', 'Flagstones'], tema: 'monasterio', variantes: 4, punto: lajas(4, 'piedra_bloques', 'tierra') },
  { id: 'lajas_musgo', nombre: ['Lajas con musgo', 'Mossy flagstones'], tema: 'cementerio', variantes: 4, punto: (x, y, v) => {
    const r = lajas(4, 'piedra_gris', 'musgo')(x, y, v);
    return fr(x, y, 5, 11) > 0.62 && r[1] > 0 ? ['piedra_musgo', r[1], r[2]] : r;
  } },
  { id: 'baldosa_catedral', nombre: ['Piso de catedral', 'Cathedral floor'], tema: 'monasterio', variantes: 3, punto: (x, y, v) => {
    const c = 20, i = Math.floor(x / c), j = Math.floor(y / c), ux = x % c, uy = y % c;
    if (ux < 1 || uy < 1) return ['negro', -1, 0];
    const blanco = (i + j) % 2 === 0;
    let tono = (fr(x, y, 6, 12) - 0.5) * 0.2;
    if (v > 0 && lejosBorde(x, y) && det(x, y, v, 20) > 0.75) tono -= 0.25;
    return [blanco ? 'marmol' : 'marmol_negro', 1, tono];
  } },
  { id: 'madera', nombre: ['Piso de tablas', 'Wooden floor'], tema: 'muebles', variantes: 3, punto: (x, y, v) => {
    const ancho = 8, tabla = Math.floor(x / ancho);
    if (x % ancho < 1) return ['negro', -1, 0];
    const corte = (y + hash3(tabla % 10, 0, 5) * P) % 40 < 0.8;
    if (corte) return ['negro', -1, 0];
    return [v === 2 ? 'madera_vieja' : 'madera', 0.5, (hash3(tabla % 10, 1, 6) - 0.5) * 0.25 + (fr(x * 0.3, y * 3, 6, tabla) - 0.5) * 0.25];
  } },
  { id: 'cueva', nombre: ['Suelo de cueva', 'Cave floor'], tema: 'cueva', variantes: 4, punto: (x, y, v) => {
    const n = fr(x, y, 6, 13), g = fr(x, y, 16, 14);
    if (v > 0 && lejosBorde(x, y) && det(x, y, v, 5) > 0.88) return ['roca', 2.5, 0.1];
    return ['roca', n * 3 + g, (g - 0.5) * 0.3 - 0.05];
  } },
  { id: 'arena', nombre: ['Arena', 'Sand'], tema: 'desierto', variantes: 4, punto: (x, y) => {
    const ola = Math.sin(((2 * x + y) / P) * Math.PI * 2 * 2 + fr(x, y, 4, 15) * 6);
    return ['arena', ola * 0.8 + fr(x, y, 12, 16), ola * 0.06];
  } },
  { id: 'arenisca', nombre: ['Losas de arenisca', 'Sandstone tiles'], tema: 'tumba', variantes: 4, punto: (x, y, v) => {
    const c = 16, ux = x % c, uy = (y + (Math.floor(x / c) % 2) * 8) % c;
    if (ux < 1 || uy < 1) return ['arena', -1, -0.1];
    let tono = (fr(x, y, 8, 17) - 0.5) * 0.25;
    if (v > 0 && lejosBorde(x, y) && det(x, y, v, 16) > 0.8) tono -= 0.2;
    return ['arenisca_lisa', 1, tono];
  } },
  { id: 'ladrillo_cloaca', nombre: ['Ladrillo de cloaca', 'Sewer bricks'], tema: 'cloaca', variantes: 3, punto: (x, y) => {
    const ux = (x + (Math.floor(y / 6) % 2) * 6) % 12, uy = y % 6;
    if (ux < 1 || uy < 1) return ['negro', -1, 0];
    const humedo = fr(x, y, 4, 18) > 0.6;
    return [humedo ? 'piedra_musgo' : 'ladrillo', 0.5, (fr(x, y, 10, 19) - 0.5) * 0.25 + (humedo ? 0.05 : 0)];
  } },
  { id: 'nieve', nombre: ['Nieve', 'Snow'], tema: 'nieve', variantes: 4, punto: (x, y, v) => {
    const n = fr(x, y, 6, 20);
    if (v > 0 && lejosBorde(x, y) && fr(x, y, 10, 40 + v) > 0.78) return ['roca', 1, 0.15];
    return ['nieve', n * 3, (n - 0.5) * 0.2];
  } },
  { id: 'hielo', nombre: ['Hielo', 'Ice'], tema: 'hielo', variantes: 3, punto: (x, y) => {
    const [d1, d2] = voronoi(x, y, 5, 21);
    return d2 - d1 < 0.9 ? ['nieve', 0, 0.1] : ['hielo', 0.5, (fr(x, y, 4, 22) - 0.5) * 0.3];
  } },
  { id: 'selva', nombre: ['Suelo de selva', 'Jungle floor'], tema: 'selva', variantes: 4, punto: (x, y, v) => {
    const n = fr(x, y, 8, 23), hoja = hash3(Math.floor(x / 3), Math.floor(y / 3), 24 + v);
    if (hoja > 0.88) return ['hojas_otono', 1, 0];
    return n > 0.5 ? ['hojas_selva', n * 2, -0.1] : ['tierra', n, -0.1];
  } },
  { id: 'pantano', nombre: ['Pantano', 'Marsh'], tema: 'selva', variantes: 3, cuadros: 4, punto: (x, y, _v, f) => {
    const m = fr(x, y, 4, 25);
    if (m < 0.42) return ['agua_sucia', 0, (rper((x / P) * 6 + f * 0.25, (y / P) * 6, 6, 42) - 0.5) * 0.3];
    return ['tierra', fr(x, y, 12, 26) * 1.5, -0.12];
  } },
  { id: 'agua', nombre: ['Agua', 'Water'], tema: 'campo', variantes: 2, cuadros: 6, punto: (x, y, _v, f) => {
    const ola = Math.sin(((x - y) / P) * Math.PI * 2 * 3 + (f / 6) * Math.PI * 2) + Math.sin(((x + 2 * y) / P) * Math.PI * 2 * 2 - (f / 6) * Math.PI * 2) * 0.6;
    return ['agua', ola * 0.6, ola * 0.08 + (fr(x, y, 6, 27) - 0.5) * 0.15];
  } },
  { id: 'hueso', nombre: ['Suelo de huesos', 'Bone floor'], tema: 'catacumbas', variantes: 3, punto: (x, y) => {
    const [d1, d2, id] = voronoi(x, y, 14, 28);
    if (d2 - d1 < 1) return ['tierra', -1, -0.15];
    return [hash3(id, 2, 2) > 0.85 ? 'piedra' : 'hueso', Math.min(2, d2 - d1), (hash3(id, 5, 5) - 0.5) * 0.3 - 0.1];
  } },
  { id: 'tierra_infierno', nombre: ['Tierra del infierno', 'Hell ground'], tema: 'infierno', variantes: 4, punto: (x, y, v) => {
    const n = fr(x, y, 6, 29);
    if (v > 0 && lejosBorde(x, y) && det(x, y, v, 6) > 0.9) return ['hueso', 1, -0.1];
    return ['roca_roja', n * 3, (n - 0.5) * 0.3];
  } },
  { id: 'lava_grietas', nombre: ['Roca con grietas de lava', 'Lava-cracked rock'], tema: 'infierno', variantes: 3, cuadros: 6, punto: (x, y, _v, f) => {
    const [d1, d2] = voronoi(x, y, 5, 30);
    if (d2 - d1 < 1.4) return ['lava', 0, Math.sin(f / 6 * Math.PI * 2 + x * 0.1) * 0.15];
    return ['roca_roja', Math.min(3, (d2 - d1) * 0.5), -0.15];
  } },
  { id: 'lava', nombre: ['Lava', 'Lava'], tema: 'infierno', variantes: 2, cuadros: 8, punto: (x, y, _v, f) => {
    const t = f / 8;
    const n = rper((x / P) * 4 + t * 4, (y / P) * 4, 4, 31) * 0.6 + rper((x / P) * 8, (y / P) * 8 - t * 8, 8, 32) * 0.4;
    return n > 0.72 ? ['roca_roja', 1, -0.2] : ['lava', 0, (n - 0.5) * 0.6];
  } },
  { id: 'fortaleza', nombre: ['Losas con runas', 'Runed slabs'], tema: 'fortaleza', variantes: 3, cuadros: 4, punto: (x, y, _v, f) => {
    const c = 40, ux = x % c, uy = y % c;
    if (ux < 1.2 || uy < 1.2) return ['negro', -1, 0];
    const runa = Math.abs(Math.hypot(ux - 20, uy - 20) - 11) < 0.9 || (Math.abs(ux - 20) < 0.7 && Math.abs(uy - 20) < 8);
    if (runa) return ['runa', 0, Math.sin(f / 4 * Math.PI * 2) * 0.2];
    return ['marmol_negro', 1, (fr(x, y, 6, 33) - 0.5) * 0.2];
  } },
  { id: 'arcano', nombre: ['Losas arcanas', 'Arcane slabs'], tema: 'arcano', variantes: 2, punto: lajas(3, 'marmol', 'marmol_negro', 0.05) },
  { id: 'pentagrama', nombre: ['Suelo marcado', 'Marked floor'], tema: 'infierno', variantes: 1, cuadros: 4, punto: (x, y, _v, f) => {
    const dx = x - 40, dy = y - 40, r = Math.hypot(dx, dy);
    if (Math.abs(r - 34) < 1.2 || Math.abs(r - 28) < 0.8) return ['portal_rojo', 0, Math.sin(f / 4 * Math.PI * 2) * 0.2];
    // estrella: cinco líneas entre los puntos del círculo
    const pts = Array.from({ length: 5 }, (_, i) => [40 + Math.cos(-Math.PI / 2 + (i * 4 * Math.PI) / 5) * 28, 40 + Math.sin(-Math.PI / 2 + (i * 4 * Math.PI) / 5) * 28]);
    for (let i = 0; i < 5; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % 5];
      const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)));
      if (Math.hypot(x - (ax + t * (bx - ax)), y - (ay + t * (by - ay))) < 0.9) return ['portal_rojo', 0, 0.1];
    }
    return lajas(4, 'roca_roja', 'negro')(x, y, 0);
  } },
];

const rgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const cache = new Map<string, Raster>();
const rampas = new Map<string, [number, number, number][]>();
const rampaDe = (mat: string) => { let r = rampas.get(mat); if (!r) { r = (MATERIALES[mat] ?? MATERIALES.tierra).rampa.map(rgb); rampas.set(mat, r); } return r; };

/** Pinta una baldosa de piso (160×80) de la variante v y el cuadro f. */
export function pintarPiso(id: string, v = 0, f = 0): Raster {
  const k = `${id}|${v}|${f}`;
  const c = cache.get(k);
  if (c) return c;
  const d = PISOS.find((p) => p.id === id);
  if (!d) throw new Error(`No hay piso "${id}"`);
  const W = 160, H = 80, img = createRaster(W, H);
  const alto = (x: number, y: number) => d.punto(((x % P) + P) % P, ((y % P) + P) % P, v, f)[1];
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const sx = px - 80 + 0.5, sy = py - 40 + 0.5;
    if (Math.abs(sx) / 80 + Math.abs(sy) / 40 > 1.0001) continue;
    // del pixel al piso: x - y = sx, x + y = 2 sy (con el origen en el centro de la baldosa)
    const x = (2 * sy + sx) / 2 + 40, y = (2 * sy - sx) / 2 + 40;
    const xx = ((x % P) + P) % P, yy = ((y % P) + P) % P;
    const [mat, h, tono] = d.punto(xx, yy, v, f);
    const m = MATERIALES[mat] ?? MATERIALES.tierra;
    let s: number;
    if (m.emite) s = 0.6 + tono;
    else {
      // relieve: la pendiente contra la luz
      const gx = (alto(xx + 1, yy) - h) * 2, gy = (alto(xx, yy + 1) - h) * 2;
      const n = [-gx * 0.5, -gy * 0.5, 1], l = Math.hypot(n[0], n[1], n[2]);
      const dif = Math.max(0, (n[0] * LUZ[0] + n[1] * LUZ[1] + n[2] * LUZ[2]) / l);
      s = 0.05 + 0.55 * dif + tono + h * 0.02;
    }
    const R = rampaDe(mat);
    const k2 = Math.max(0, Math.min(R.length - 1, Math.floor(Math.max(0, Math.min(0.999, s)) * R.length + trama(px, py) - 0.5)));
    const o = (py * W + px) * 4;
    img.data[o] = R[k2][0]; img.data[o + 1] = R[k2][1]; img.data[o + 2] = R[k2][2]; img.data[o + 3] = 255;
  }
  cache.set(k, img);
  return img;
}
