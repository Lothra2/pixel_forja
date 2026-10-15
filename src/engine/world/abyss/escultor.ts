import { createRaster, type Raster } from '../../core/raster';
import { hash, rgb } from '../puertoObjects';

/**
 * El escultor de los monumentos (abyss premium): se dibuja con volúmenes (esferas, cápsulas, cajas, polígonos con
 * bisel) y cada pixel guarda su material y su normal. Al final se ilumina con la luz de siempre del kit (de arriba a la
 * izquierda), se pasa cada luz a un tono de la rampa del material con tramado ordenado y se cierra con el contorno.
 *
 * Así cien monumentos salen con la misma luz y el mismo lenguaje de pixel art, y cada uno se escribe en pocas líneas.
 */

export type Rampa = readonly string[];

/** luz de arriba a la izquierda y un poco de frente (x a la derecha, y hacia abajo, z hacia la cámara) */
const LUZ = (() => { const v = [-0.55, -0.62, 0.56], n = Math.hypot(v[0], v[1], v[2]); return v.map((c) => c / n); })();
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

export interface OpcVol {
  /** ruido de la superficie (0 a 1): piedra gastada, corteza */
  rugoso?: number;
  semilla?: number;
  /** cambia la luz de todo el volumen (más claro o más oscuro) */
  luz?: number;
  /** solo pinta donde esto dice que sí (para recortar un volumen) */
  solo?: (x: number, y: number) => boolean;
}

export class Escultor {
  readonly w: number;
  readonly h: number;
  /** material por pixel (-1 vacío) */
  readonly mat: Int16Array;
  readonly nx: Float32Array;
  readonly ny: Float32Array;
  readonly nz: Float32Array;
  /** corrimiento de la luz por pixel */
  readonly off: Float32Array;
  /** número de pieza (las de después van delante) */
  readonly pieza: Int32Array;
  private rampas: Rampa[] = [];
  private emite: boolean[] = [];
  private n = 0;

  constructor(w: number, h: number) {
    this.w = w; this.h = h;
    const N = w * h;
    this.mat = new Int16Array(N).fill(-1);
    this.nx = new Float32Array(N); this.ny = new Float32Array(N); this.nz = new Float32Array(N).fill(1);
    this.off = new Float32Array(N);
    this.pieza = new Int32Array(N);
  }

  /** registra una rampa (de oscuro a claro); `emite` = brilla sola (lava, cristal prendido, llama) */
  rampa(r: Rampa, emite = false): number { this.rampas.push(r); this.emite.push(emite); return this.rampas.length - 1; }

  private set(x: number, y: number, m: number, nx: number, ny: number, nz: number, off: number, o: OpcVol) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    if (o.solo && !o.solo(x, y)) return;
    const i = y * this.w + x;
    let ruido = 0;
    // ruido en grumos (2 x 2 y manchas de 5 px), no pixel por pixel: así se lee como pixel art y no como grano
    if (o.rugoso) { const s = o.semilla ?? 7; ruido = ((hash(x >> 1, y >> 1, s) - 0.5) * 0.35 + (suave(x / 5, y / 5, s + 1) - 0.5) * 0.65) * o.rugoso * 0.55; }
    this.mat[i] = m; this.nx[i] = nx; this.ny[i] = ny; this.nz[i] = nz; this.off[i] = off + (o.luz ?? 0) + ruido; this.pieza[i] = this.n;
  }

  /** elipsoide (un tronco visto de frente, una piedra, una cabeza) */
  esfera(cx: number, cy: number, rx: number, ry: number, m: number, o: OpcVol = {}) {
    this.n++;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry, d = u * u + v * v;
      if (d > 1) continue;
      this.set(x, y, m, u, v, Math.sqrt(1 - d), 0, o);
    }
  }

  /** cápsula entre dos puntos con radio que cambia (brazos, ramas, raíces, patas, cuernos) */
  capsula(x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, m: number, o: OpcVol = {}) {
    this.n++;
    const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1, R = Math.max(r0, r1);
    for (let y = Math.floor(Math.min(y0, y1) - R); y <= Math.ceil(Math.max(y0, y1) + R); y++) for (let x = Math.floor(Math.min(x0, x1) - R); x <= Math.ceil(Math.max(x0, x1) + R); x++) {
      const px = x + 0.5, py = y + 0.5, t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / L2));
      const qx = x0 + dx * t, qy = y0 + dy * t, r = r0 + (r1 - r0) * t, ex = px - qx, ey = py - qy, d = Math.hypot(ex, ey);
      if (d > r) continue;
      const u = ex / r, v = ey / r;
      this.set(x, y, m, u, v, Math.sqrt(Math.max(0, 1 - u * u - v * v)), 0, o);
    }
  }

  /** varias cápsulas seguidas (una raíz que serpentea, una cadena de ramas) */
  trazo(pts: [number, number][], r0: number, r1: number, m: number, o: OpcVol = {}) {
    const n = pts.length - 1;
    for (let i = 0; i < n; i++) this.capsula(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r0 + ((r1 - r0) * i) / n, r0 + ((r1 - r0) * (i + 1)) / n, m, o);
  }

  /**
   * caja en vista 3/4: la tapa (arriba, `tapa` px de alto) mira al cielo, el frente a la cámara y una franja del
   * costado derecho (`lado` px) queda en sombra
   */
  caja(x: number, y: number, w: number, h: number, tapa: number, m: number, o: OpcVol & { lado?: number; bisel?: number } = {}) {
    this.n++;
    const lado = o.lado ?? Math.max(1, Math.round(w * 0.12)), b = o.bisel ?? 1;
    for (let yy = Math.round(y); yy < Math.round(y + h); yy++) for (let xx = Math.round(x); xx < Math.round(x + w); xx++) {
      const top = yy < y + tapa, right = xx >= x + w - lado;
      let nx = 0, ny = top ? -0.8 : 0.05, nz = top ? 0.6 : 1;
      if (right && !top) { nx = 0.85; nz = 0.5; }
      // bisel: los cantos de la tapa brillan un poco, los de abajo se apagan
      let off = 0;
      if (b && yy >= y + tapa && yy < y + tapa + b) off += 0.12;
      if (b && yy >= y + h - b) off -= 0.1;
      if (b && xx < x + b && !top) off += 0.06;
      this.set(xx, yy, m, nx, ny, nz, off, o);
    }
  }

  /** cilindro parado (columna, barril, torre): frente redondo y tapa elíptica arriba */
  cilindro(cx: number, top: number, bottom: number, rx: number, ry: number, m: number, o: OpcVol & { sinTapa?: boolean } = {}) {
    this.n++;
    for (let y = Math.floor(top - ry); y <= Math.ceil(bottom + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const u = (x + 0.5 - cx) / rx;
      if (Math.abs(u) > 1) continue;
      const curva = Math.sqrt(1 - u * u) * ry;
      const yTapa = y + 0.5 - top;
      if (!o.sinTapa && yTapa * yTapa / (ry * ry) + u * u <= 1) { this.set(x, y, m, u * 0.2, -0.85, 0.5, 0.05, o); continue; }
      if (y + 0.5 < top || y + 0.5 > bottom + curva) continue;
      this.set(x, y, m, u, 0.1, Math.sqrt(1 - u * u), 0, o);
    }
  }

  /** polígono plano con bisel: el borde se inclina hacia afuera `bisel` px (lajas, alas, hojas de hacha, tablas) */
  poligono(pts: [number, number][], m: number, o: OpcVol & { bisel?: number; normal?: [number, number, number] } = {}) {
    this.n++;
    const b = o.bisel ?? 2, nrm = o.normal ?? [0, 0, 1];
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
      const px = x + 0.5, py = y + 0.5;
      if (!dentro(px, py, pts)) continue;
      // el borde más cercano y su normal hacia afuera
      let best = 1e9, ex = 0, ey = 0;
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L2));
        const d = Math.hypot(px - ax - dx * t, py - ay - dy * t);
        if (d < best) { best = d; ex = px - (ax + dx * t); ey = py - (ay + dy * t); }
      }
      let [nx, ny, nz] = nrm;
      if (b > 0 && best < b) {
        const l = Math.hypot(ex, ey) || 1, k = 1 - best / b;
        // hacia afuera = contrario a donde está el borde visto desde adentro
        nx = nx * (1 - k) - (ex / l) * k * 0.9; ny = ny * (1 - k) - (ey / l) * k * 0.9; nz = nz * (1 - k * 0.6);
        const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
      }
      this.set(x, y, m, nx, ny, nz, 0, o);
    }
  }

  /** pinta pixeles sueltos con un material y una luz fija (detalles: ojos, remaches, letras) */
  punto(x: number, y: number, m: number, off = 0) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    this.mat[i] = m; this.nx[i] = 0; this.ny[i] = 0; this.nz[i] = 1; this.off[i] = off; this.pieza[i] = ++this.n;
  }

  /** cambia la luz de lo que ya está pintado en una zona (tallas, agujeros, sombras pintadas) */
  luz(fn: (x: number, y: number) => number) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const i = y * this.w + x; if (this.mat[i] >= 0) this.off[i] += fn(x, y); }
  }

  /** cambia el material de lo pintado donde `fn` dice (musgo, escarcha, hollín, óxido) */
  cubrir(m: number, fn: (x: number, y: number, ny: number) => boolean) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const i = y * this.w + x; if (this.mat[i] >= 0 && fn(x, y, this.ny[i])) this.mat[i] = m; }
  }

  /** musgo (o nieve, ceniza): sobre lo que mira para arriba, en manchas de ruido */
  musgo(m: number, cantidad: number, semilla: number, soloMat?: number[]) {
    this.cubrir(m, (x, y, ny) => {
      const i = y * this.w + x;
      if (soloMat && !soloMat.includes(this.mat[i])) return false;
      const n = suave(x / 6, y / 4, semilla) * 0.7 + hash(x, y, semilla) * 0.3;
      return n < cantidad * (ny < -0.25 ? 1.25 : ny < 0.1 ? 0.6 : 0.2);
    });
  }

  /** grieta: camino al azar que oscurece (con un pixel claro abajo, el canto que agarra luz) */
  grieta(x: number, y: number, largo: number, ang: number, semilla: number, fuerza = 0.45) {
    let px = x, py = y, a = ang;
    for (let k = 0; k < largo; k++) {
      const i = Math.round(py) * this.w + Math.round(px);
      if (px < 0 || py < 0 || px >= this.w || py >= this.h || this.mat[i] < 0) break;
      this.off[i] -= fuerza;
      const j = i + this.w + 1;
      if (py + 1 < this.h && px + 1 < this.w && this.mat[j] >= 0) this.off[j] += fuerza * 0.35;
      a += (hash(k, semilla, 3) - 0.5) * 0.9;
      px += Math.cos(a); py += Math.sin(a);
      // a veces se abre una rama
      if (k > 3 && hash(k, semilla, 9) < 0.06) this.grieta(px, py, Math.round(largo * 0.4), a + (hash(k, semilla, 5) < 0.5 ? 0.9 : -0.9), semilla + k, fuerza * 0.8);
    }
  }

  /** tallado: un hueco (más oscuro) con el canto de abajo y la derecha claro (letras, runas, marcas) */
  tallar(pts: [number, number][]) {
    for (const [x, y] of pts) {
      const i = Math.round(y) * this.w + Math.round(x);
      if (this.mat[i] < 0) continue;
      this.off[i] -= 0.5;
      if (this.mat[i + this.w] >= 0) this.off[i + this.w] += 0.2;
    }
  }

  /** contorno, oclusión entre piezas, luz y tramado: el sprite final */
  render(o: { contorno?: string | false; oclusion?: number; tramado?: boolean } = {}): Raster {
    const W = this.w, H = this.h, r = createRaster(W, H), occ = o.oclusion ?? 0.18, tram = o.tramado ?? true;
    const off = new Float32Array(this.off);
    // oclusión: lo de atrás se oscurece pegado a lo de adelante (se leen las piezas)
    if (occ) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (this.mat[i] < 0) continue;
      for (const j of [i - 1, i + 1, i - W, i + W]) {
        if (j < 0 || j >= W * H || this.mat[j] < 0) continue;
        if (this.pieza[j] > this.pieza[i] && this.mat[j] !== this.mat[i]) { off[i] -= occ; break; }
      }
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, m = this.mat[i];
      if (m < 0) continue;
      const ramp = this.rampas[m];
      let l: number;
      if (this.emite[m]) l = 0.55 + off[i];
      else {
        const d = this.nx[i] * LUZ[0] + this.ny[i] * LUZ[1] + this.nz[i] * LUZ[2];
        l = 0.12 + 0.82 * Math.max(0, d) + off[i];
      }
      const t = Math.max(0, Math.min(1, l)) * (ramp.length - 1), b = Math.floor(t), f = t - b;
      // tramado solo en el medio de cada escalón: bandas limpias con un borde tramado corto
      const umbral = tram ? 0.3 + BAYER[(y & 3) * 4 + (x & 3)] * 0.4 : 0.5;
      const idx = Math.min(ramp.length - 1, f > umbral ? b + 1 : b);
      const c = rgb(ramp[idx]);
      r.data[i * 4] = c[0]; r.data[i * 4 + 1] = c[1]; r.data[i * 4 + 2] = c[2]; r.data[i * 4 + 3] = 255;
    }
    if (o.contorno !== false) {
      const filled = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) filled[i] = this.mat[i] >= 0 ? 1 : 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (filled[i]) continue;
        let vecino = -1;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const X = x + dx, Y = y + dy;
          if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
          if (filled[Y * W + X]) { vecino = Y * W + X; break; }
        }
        if (vecino < 0) continue;
        // contorno del color más oscuro del material vecino, más oscuro todavía (selout)
        const c = o.contorno ? rgb(o.contorno) : oscurecer(rgb(this.rampas[this.mat[vecino]][0]), 0.55);
        r.data[i * 4] = c[0]; r.data[i * 4 + 1] = c[1]; r.data[i * 4 + 2] = c[2]; r.data[i * 4 + 3] = 255;
      }
    }
    return r;
  }
}

const oscurecer = (c: number[], k: number) => [Math.round(c[0] * k), Math.round(c[1] * k), Math.round(c[2] * k)];

export function dentro(x: number, y: number, pts: [number, number][]): boolean {
  let ins = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}

/** ruido suave (bilineal con suavizado) */
export function suave(x: number, y: number, s: number): number {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0, s), b = hash(x0 + 1, y0, s), c = hash(x0, y0 + 1, s), d = hash(x0 + 1, y0 + 1, s);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** brillo suave alrededor de un punto, solo donde no hay nada (lo prendido: una llama, un cristal, un ojo) */
export function halo(r: Raster, cx: number, cy: number, rad: number, c: string, k = 1) {
  const v = rgb(c);
  for (let y = Math.floor(cy - rad); y <= cy + rad; y++) for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
    if (x < 0 || y < 0 || x >= r.w || y >= r.h) continue;
    const d = Math.hypot(x - cx, y - cy) / rad;
    if (d >= 1) continue;
    // en escalones de 16 (pixel art, no degradado liso)
    const a = Math.round(((1 - d) ** 2 * 110 * k) / 16) * 16, i = (y * r.w + x) * 4;
    if (a > 0 && !r.data[i + 3]) { r.data[i] = v[0]; r.data[i + 1] = v[1]; r.data[i + 2] = v[2]; r.data[i + 3] = a; }
  }
}

/** Rampas de materiales compartidas por los siete mundos (de oscuro a claro). */
export const MAT = {
  piedra: ['#14161c', '#23262e', '#353943', '#4a4f5a', '#626874', '#7e8590', '#a0a6ae'],
  piedraTibia: ['#1a1612', '#2c261f', '#40382e', '#574d40', '#706454', '#8c7f6b', '#ada08a'],
  musgo: ['#0e1a10', '#1a2e18', '#2a4420', '#3c5a28', '#527232', '#6e8c3e', '#90a84e'],
  madera: ['#140c08', '#24160e', '#3a2416', '#52341e', '#6c4628', '#8a5c36', '#a87648'],
  maderaVieja: ['#16130f', '#262019', '#3a3024', '#4f4231', '#665641', '#7f6d54', '#9a876a'],
  corteza: ['#0f0b08', '#1c140e', '#2c2016', '#3e2e1f', '#52402b', '#6a5438', '#846b48'],
  hierro: ['#0a0c10', '#161a20', '#242a32', '#363e48', '#4c5662', '#68727e', '#8c96a0'],
  oxido: ['#1a0c06', '#2e160a', '#4a2410', '#6a3616', '#8a4a1e', '#a8622c', '#c4803e'],
  oro: ['#2a1a04', '#4a3008', '#704a0e', '#9a6a16', '#c48e22', '#e8b440', '#fff0a0'],
  bronce: ['#1a120a', '#2e2012', '#4a321a', '#6a4824', '#8a6030', '#a87a40', '#c89a5c'],
  hueso: ['#2a2620', '#4a443c', '#6e665a', '#968c7c', '#bcb2a0', '#ddd4c2', '#f4eee0'],
  tela: ['#1a1418', '#2e2228', '#46343a', '#60484c', '#7c6060', '#987a74', '#b8988c'],
  hoja: ['#0a160c', '#122414', '#1c361c', '#284a24', '#365e2c', '#4a7434', '#62883e'],
  hojaOtono: ['#2a0e06', '#4a1c0a', '#6e2e0e', '#964414', '#bc5e1c', '#dc8028', '#f4a640'],
  calabaza: ['#2e1004', '#521e06', '#7e320a', '#aa4a10', '#d06a18', '#ec8c28', '#ffb04a'],
  paja: ['#2a200c', '#463616', '#6a5420', '#8e722c', '#b2923a', '#d0b04e', '#ecd070'],
  cristalCian: ['#04121c', '#0a2a3e', '#12486a', '#1e6e98', '#3a9cc4', '#76d0ea', '#d0f6ff'],
  cristalVioleta: ['#10061c', '#22103a', '#3a1e5e', '#583088', '#7c4cb2', '#a87ad8', '#e0c8ff'],
  cristalAmbar: ['#1c0e02', '#3e2006', '#6a3a0c', '#9a5a14', '#c88020', '#eeb048', '#fff0b0'],
  hielo: ['#05070c', '#0c1220', '#16203a', '#22304a', '#3a5472', '#6a8aac', '#b8d0ea'],
  escarcha: ['#3a4a62', '#6a8aac', '#9ab8d8', '#b8d0ea', '#d0e4f6', '#e8f4ff', '#ffffff'],
  brasa: ['#2a0600', '#5a1000', '#8a2000', '#c03a10', '#ff6a20', '#ffa050', '#ffe0a0'],
  lava: ['#3a0800', '#7a1800', '#b83000', '#e85a10', '#ff8a20', '#ffc050', '#fff0b0'],
  agua: ['#04101a', '#08202e', '#0e3044', '#16445c', '#245c74', '#3a7a8e', '#68a4b0'],
  coral: ['#1c0a10', '#38141c', '#5a2228', '#80363a', '#a44e4a', '#c46e5e', '#e0967c'],
  luzTurquesa: ['#062a26', '#0e4a42', '#1a7064', '#2e9a88', '#52c4ae', '#8ae8d4', '#d0fff4'],
  luzDorada: ['#3a2004', '#6a3c08', '#9a5e10', '#c88420', '#ecac38', '#ffd070', '#fff4c8'],
  sueno: ['#140e22', '#22183a', '#342654', '#4a3870', '#644e8e', '#8470aa', '#a898c8'],
  marmol: ['#2a2a32', '#44444e', '#62626c', '#82828c', '#a2a2aa', '#c2c2c8', '#e2e2e6'],
  ceniza: ['#0e0c0c', '#1a1716', '#282422', '#38332f', '#4a443e', '#5e5750', '#766e66'],
} as const;
