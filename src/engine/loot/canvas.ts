import { createRaster, type Raster } from '../core/raster';
import { type Lab, hexToLab, labToHex, labToLch, lchToLab } from '../color/oklab';

/**
 * Lienzo de íconos v2. Se diseña en un espacio de 32 unidades y se dibuja NATIVO a 32 o 64 px
 * (no se escala una imagen: las formas se rasterizan al tamaño final, así a 64 hay el doble de detalle).
 *
 * Cada material tiene 6 tonos [contorno, sombra honda, sombra, base, luz, brillo] con giro de tono:
 * las sombras se enfrían y las luces se calientan. El sombreado sale solo: luz de arriba a la izquierda
 * según la forma de cada grupo, borde de luz o de sombra, sombra de contacto bajo lo que está encima,
 * brillo especular en metales y gemas, y contorno de color (nunca negro puro).
 */

export type MatKind = 'metal' | 'wood' | 'leather' | 'cloth' | 'gem' | 'crystal' | 'bone' | 'stone' | 'glow' | 'paper' | 'fur' | 'liquid' | 'glass' | 'flesh';

export interface MatDef { hex: string; kind: MatKind }

/** Rampa de 6 tonos. */
export type Ramp6 = [string, string, string, string, string, string];

const COOL = (275 * Math.PI) / 180;
const WARM = (85 * Math.PI) / 180;

function shift(h: number, target: number, maxDeg: number, C: number): number {
  if (C < 0.015) return h;
  let d = target - h;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  const m = (maxDeg * Math.PI) / 180;
  return h + Math.sign(d) * Math.min(Math.abs(d), m);
}

// pasos de luminosidad por tipo de material: [contorno, honda, sombra, base, luz, brillo]
const STEPS: Record<MatKind, number[]> = {
  metal: [-0.4, -0.22, -0.11, 0, 0.12, 0.27],
  gem: [-0.36, -0.2, -0.1, 0, 0.13, 0.33],
  crystal: [-0.34, -0.17, -0.08, 0, 0.1, 0.24],
  glass: [-0.32, -0.15, -0.07, 0, 0.1, 0.22],
  glow: [-0.3, -0.16, -0.08, 0, 0.07, 0.16],
  wood: [-0.32, -0.17, -0.08, 0, 0.07, 0.13],
  leather: [-0.3, -0.16, -0.08, 0, 0.07, 0.12],
  cloth: [-0.3, -0.15, -0.07, 0, 0.07, 0.12],
  fur: [-0.3, -0.15, -0.07, 0, 0.07, 0.12],
  bone: [-0.36, -0.19, -0.09, 0, 0.06, 0.1],
  stone: [-0.32, -0.16, -0.08, 0, 0.07, 0.12],
  paper: [-0.34, -0.17, -0.08, 0, 0.05, 0.09],
  liquid: [-0.32, -0.17, -0.08, 0, 0.12, 0.3],
  flesh: [-0.3, -0.15, -0.07, 0, 0.06, 0.11],
};

export function ramp6(hex: string, kind: MatKind): Ramp6 {
  const base: Lab = hexToLab(hex);
  const [L, C, h] = labToLch(base);
  const st = STEPS[kind];
  // en colores muy claros las sombras bajan más; en muy oscuros, las luces suben más
  const kS = L > 0.85 ? 1.25 : 1, kL = L < 0.35 ? 1.5 : L > 0.88 ? 0.5 : 1;
  return st.map((dL, i) => {
    if (i === 3) return hex.toLowerCase();
    const dark = dL < 0;
    const nL = Math.max(0.07, Math.min(0.99, L + dL * (dark ? kS : kL)));
    // metal y gemas: el brillo se blanquea; las sombras ganan un poco de color
    const cK = dark ? (i === 0 ? 0.9 : 1.08) : i === 5 && (kind === 'metal' || kind === 'gem' || kind === 'crystal' || kind === 'liquid' || kind === 'glass') ? 0.35 : 0.92;
    const nh = dark ? shift(h, COOL, i === 0 ? 22 : 14, C) : shift(h, WARM, i === 5 ? 14 : 8, C);
    return labToHex(lchToLab([nL, C * cK, nh]));
  }) as Ramp6;
}

export type P = [number, number];

interface Cell { mat: number; group: number; z: number; tone?: number; bias: number }

export interface DrawOpts {
  /** tono fijo 1..5 (0 es el contorno) */
  tone?: number;
  /** suma al tono automático (-2..2) */
  bias?: number;
  /** grupo de sombreado: por defecto, cada llamada es un grupo nuevo */
  group?: number;
}

export interface RenderOpts {
  /** halo del color de la rareza alrededor (únicos, sets, legendarios) */
  aura?: string | null;
  /** fuerza del halo 0..1 (para animar) */
  auraK?: number;
  /** fuerza del resplandor de los materiales que brillan 0..1 */
  glowK?: number;
  /** barrido de brillo: posición -1..2 a lo largo de la diagonal (null = sin barrido) */
  sweep?: number | null;
  /** destellos: lista de centros en unidades */
  sparkles?: P[];
  /** sin contorno exterior (para piezas que se pegan sobre otras) */
  noOutline?: boolean;
  /** sombra en el piso (elipse) debajo del objeto, en unidades: [cx, cy, rx, ry] */
  shadow?: [number, number, number, number] | null;
}

/** Lienzo de un ícono. Unidades de diseño: 0..32 en cada eje, sea cual sea el tamaño en pixeles. */
export class IconCanvas {
  readonly k: number;
  private cells: (Cell | undefined)[];
  private mats: MatDef[] = [];
  private matIdx = new Map<string, number>();
  private nextGroup = 1;
  private z = 0;

  constructor(readonly size: number, readonly design = 32, readonly h = size) {
    this.k = size / design;
    this.cells = new Array(size * h);
  }

  mat(m: MatDef): number {
    const key = `${m.kind}|${m.hex.toLowerCase()}`;
    let i = this.matIdx.get(key);
    if (i === undefined) { i = this.mats.length; this.mats.push(m); this.matIdx.set(key, i); }
    return i;
  }

  group(): number { return this.nextGroup++; }

  /** pone un pixel (en pixeles) */
  setPx(x: number, y: number, mat: MatDef, o: DrawOpts = {}, group?: number) {
    if (x < 0 || y < 0 || x >= this.size || y >= this.h) return;
    this.cells[y * this.size + x] = { mat: this.mat(mat), group: group ?? o.group ?? 0, z: this.z, tone: o.tone, bias: o.bias ?? 0 };
  }

  getPx(x: number, y: number) { return x < 0 || y < 0 || x >= this.size || y >= this.h ? undefined : this.cells[y * this.size + x]; }
  has(x: number, y: number) { return !!this.getPx(x, y); }
  /** material de un pixel (para recolorear zonas) */
  matAt(x: number, y: number): MatDef | undefined { const c = this.getPx(x, y); return c ? this.mats[c.mat] : undefined; }
  erasePx(x: number, y: number) { if (x >= 0 && y >= 0 && x < this.size && y < this.h) this.cells[y * this.size + x] = undefined; }

  private begin(o: DrawOpts) { this.z++; return o.group ?? this.group(); }

  /** polígono lleno, en unidades */
  poly(pts: P[], mat: MatDef, o: DrawOpts = {}) {
    const g = this.begin(o);
    const k = this.k;
    const q = pts.map(([x, y]) => [x * k, y * k] as P);
    const xs = q.map((p) => p[0]), ys = q.map((p) => p[1]);
    for (let y = Math.max(0, Math.floor(Math.min(...ys))); y <= Math.min(this.h - 1, Math.ceil(Math.max(...ys))); y++)
      for (let x = Math.max(0, Math.floor(Math.min(...xs))); x <= Math.min(this.size - 1, Math.ceil(Math.max(...xs))); x++) {
        const cx = x + 0.5, cy = y + 0.5;
        let inside = false;
        for (let i = 0, j = q.length - 1; i < q.length; j = i++) {
          const [xi, yi] = q[i], [xj, yj] = q[j];
          if (yi > cy !== yj > cy && cx < ((xj - xi) * (cy - yi)) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) this.setPx(x, y, mat, o, g);
      }
    return g;
  }

  /** elipse llena (rot en grados), en unidades */
  ellipse(c: P, rx: number, ry: number, mat: MatDef, o: DrawOpts = {}, rotDeg = 0) {
    const g = this.begin(o);
    const k = this.k, a = (rotDeg * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
    const R = Math.max(rx, ry) * k + 1;
    const X = c[0] * k, Y = c[1] * k;
    for (let y = Math.floor(Y - R); y <= Math.ceil(Y + R); y++)
      for (let x = Math.floor(X - R); x <= Math.ceil(X + R); x++) {
        const dx = x + 0.5 - X, dy = y + 0.5 - Y;
        const u = (dx * ca + dy * sa) / (rx * k), v = (-dx * sa + dy * ca) / (ry * k);
        if (u * u + v * v <= 1) this.setPx(x, y, mat, o, g);
      }
    return g;
  }

  circle(c: P, r: number, mat: MatDef, o: DrawOpts = {}) { return this.ellipse(c, r, r, mat, o); }

  /** anillo (rx, ry exteriores y grosor w), en unidades */
  ring(c: P, rx: number, ry: number, w: number, mat: MatDef, o: DrawOpts = {}, from = 0, to = 360) {
    const g = this.begin(o);
    const k = this.k;
    const X = c[0] * k, Y = c[1] * k, R = Math.max(rx, ry) * k + 1;
    for (let y = Math.floor(Y - R); y <= Math.ceil(Y + R); y++)
      for (let x = Math.floor(X - R); x <= Math.ceil(X + R); x++) {
        const dx = x + 0.5 - X, dy = y + 0.5 - Y;
        const out = (dx / (rx * k)) ** 2 + (dy / (ry * k)) ** 2;
        const inn = (dx / Math.max(0.01, (rx - w) * k)) ** 2 + (dy / Math.max(0.01, (ry - w) * k)) ** 2;
        if (out > 1 || inn < 1) continue;
        let ang = (Math.atan2(dy, dx) * 180) / Math.PI;
        if (ang < 0) ang += 360;
        if (from <= to ? ang >= from && ang <= to : ang >= from || ang <= to) this.setPx(x, y, mat, o, g);
      }
    return g;
  }

  /** trazo grueso de a a b (w en unidades), con puntas redondas */
  line(a: P, b: P, w: number, mat: MatDef, o: DrawOpts = {}) {
    const g = this.begin(o);
    const k = this.k;
    const A: P = [a[0] * k, a[1] * k], B: P = [b[0] * k, b[1] * k];
    const r = Math.max(0.5, (w * k) / 2);
    const minX = Math.floor(Math.min(A[0], B[0]) - r - 1), maxX = Math.ceil(Math.max(A[0], B[0]) + r + 1);
    const minY = Math.floor(Math.min(A[1], B[1]) - r - 1), maxY = Math.ceil(Math.max(A[1], B[1]) + r + 1);
    const dx = B[0] - A[0], dy = B[1] - A[1], L2 = dx * dx + dy * dy || 1;
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5, py = y + 0.5;
        const t = Math.max(0, Math.min(1, ((px - A[0]) * dx + (py - A[1]) * dy) / L2));
        const ex = A[0] + dx * t - px, ey = A[1] + dy * t - py;
        if (ex * ex + ey * ey <= r * r + 0.15) this.setPx(x, y, mat, o, g);
      }
    return g;
  }

  /** línea de 1 pixel (a cualquier tamaño): detalles, filos, costuras */
  px1(a: P, b: P, mat: MatDef, o: DrawOpts = {}, onlyOver = false) {
    const g = o.group ?? this.group();
    this.z++;
    const k = this.k;
    let x0 = Math.floor(a[0] * k), y0 = Math.floor(a[1] * k);
    const x1 = Math.floor(b[0] * k), y1 = Math.floor(b[1] * k);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      if (!onlyOver || this.has(x0, y0)) this.setPx(x0, y0, mat, o, g);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return g;
  }

  /** un punto: un pixel a 32, un cuadrito de k x k a más tamaño (o 1 px si one) */
  dot(p: P, mat: MatDef, o: DrawOpts = {}, one = false) {
    const g = o.group ?? this.group();
    this.z++;
    const n = one ? 1 : Math.max(1, Math.round(this.k));
    const x0 = Math.floor(p[0] * this.k), y0 = Math.floor(p[1] * this.k);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) this.setPx(x0 + i, y0 + j, mat, o, g);
    return g;
  }

  /** borra dentro de un polígono (agujeros, muescas) */
  erase(pts: P[]) {
    const k = this.k;
    const q = pts.map(([x, y]) => [x * k, y * k] as P);
    const xs = q.map((p) => p[0]), ys = q.map((p) => p[1]);
    for (let y = Math.max(0, Math.floor(Math.min(...ys))); y <= Math.min(this.h - 1, Math.ceil(Math.max(...ys))); y++)
      for (let x = Math.max(0, Math.floor(Math.min(...xs))); x <= Math.min(this.size - 1, Math.ceil(Math.max(...xs))); x++) {
        let inside = false;
        for (let i = 0, j = q.length - 1; i < q.length; j = i++) {
          const [xi, yi] = q[i], [xj, yj] = q[j];
          if (yi > y + 0.5 !== yj > y + 0.5 && x + 0.5 < ((xj - xi) * (y + 0.5 - yi)) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) this.cells[y * this.size + x] = undefined;
      }
  }

  eraseCircle(c: P, r: number) {
    const k = this.k;
    for (let y = Math.floor((c[1] - r) * k) - 1; y <= Math.ceil((c[1] + r) * k) + 1; y++)
      for (let x = Math.floor((c[0] - r) * k) - 1; x <= Math.ceil((c[0] + r) * k) + 1; x++) {
        const dx = x + 0.5 - c[0] * k, dy = y + 0.5 - c[1] * k;
        if (dx * dx + dy * dy <= r * r * k * k && x >= 0 && y >= 0 && x < this.size && y < this.h) this.cells[y * this.size + x] = undefined;
      }
  }

  /** caja de lo dibujado, en pixeles */
  bbox(): { x0: number; y0: number; x1: number; y1: number } | null {
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.size; x++) if (this.cells[y * this.size + x]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return x1 < 0 ? null : { x0, y0, x1, y1 };
  }

  /** corre todo lo dibujado (en pixeles), para centrar */
  shift(dx: number, dy: number) {
    if (!dx && !dy) return;
    const n: (Cell | undefined)[] = new Array(this.size * this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.size; x++) {
      const c = this.cells[y * this.size + x];
      const X = x + dx, Y = y + dy;
      if (c && X >= 0 && Y >= 0 && X < this.size && Y < this.h) n[Y * this.size + X] = c;
    }
    this.cells = n;
  }

  /** centra lo dibujado en el lienzo (deja margen para el contorno y el halo) */
  center(vertical = true) {
    const b = this.bbox();
    if (!b) return;
    const dx = Math.round((this.size - 1 - b.x1 - b.x0) / 2), dy = vertical ? Math.round((this.h - 1 - b.y1 - b.y0) / 2) : 0;
    this.shift(dx, dy);
  }

  /** Sombrea, contornea y pinta. Devuelve RGBA. */
  render(opt: RenderOpts = {}): Raster {
    const S = this.size, H = this.h, k = this.k;
    const ramps = this.mats.map((m) => ramp6(m.hex, m.kind));
    const out = createRaster(S, H);
    const cells = this.cells;
    // centro y radio de cada grupo (para la luz por volumen)
    const gb = new Map<number, { x0: number; y0: number; x1: number; y1: number }>();
    for (let y = 0; y < H; y++) for (let x = 0; x < S; x++) {
      const c = cells[y * S + x];
      if (!c) continue;
      const b = gb.get(c.group);
      if (!b) gb.set(c.group, { x0: x, y0: y, x1: x, y1: y });
      else { b.x0 = Math.min(b.x0, x); b.y0 = Math.min(b.y0, y); b.x1 = Math.max(b.x1, x); b.y1 = Math.max(b.y1, y); }
    }
    const band = Math.max(1, Math.round(k));
    const toneOf = new Int8Array(S * H).fill(-1);
    for (let y = 0; y < H; y++) for (let x = 0; x < S; x++) {
      const c = cells[y * S + x];
      if (!c) continue;
      const m = this.mats[c.mat];
      if (c.tone !== undefined) { toneOf[y * S + x] = c.tone; continue; }
      const b = gb.get(c.group)!;
      const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
      const R = Math.max(2, Math.max(b.x1 - b.x0, b.y1 - b.y0) / 2);
      const t = (x - cx + (y - cy)) / (R * 1.6);
      // borde: luz si afuera queda arriba o a la izquierda, sombra si queda abajo o a la derecha
      const same = (X: number, Y: number) => { const o = cells[Y * S + X]; return X >= 0 && Y >= 0 && X < S && Y < H && !!o && o.group === c.group; };
      let edge = 0;
      for (let d = 1; d <= band; d++) {
        if (!same(x, y - d) || !same(x - d, y)) edge = Math.max(edge, 1);
        if (!same(x, y + d) || !same(x + d, y)) edge = edge > 0 ? 0 : -1;
        if (edge) break;
      }
      // sombra de contacto: lo que está encima (z mayor) arriba o a la izquierda proyecta sombra
      let contact = 0;
      for (const [dx, dy] of [[0, -1], [-1, 0], [-1, -1]]) {
        const o = cells[(y + dy) * S + (x + dx)];
        if (x + dx >= 0 && y + dy >= 0 && o && o.group !== c.group && o.z > c.z && this.mats[o.mat].kind !== 'glow') contact = -1;
      }
      let v = 3 - t * (m.kind === 'metal' || m.kind === 'gem' || m.kind === 'crystal' ? 1.15 : 0.85) + edge * 0.9 + contact + c.bias;
      if (m.kind === 'glow') v = 4 - t * 0.5 + c.bias;
      let tone = Math.max(1, Math.min(5, Math.round(v)));
      // brillo especular: metal y gemas en el borde de luz de arriba
      if ((m.kind === 'metal' || m.kind === 'gem' || m.kind === 'crystal' || m.kind === 'glass' || m.kind === 'liquid') && edge > 0 && t < -0.25 && c.bias >= 0) tone = 5;
      if (m.kind !== 'metal' && m.kind !== 'gem' && m.kind !== 'crystal' && m.kind !== 'glass' && m.kind !== 'liquid' && m.kind !== 'glow' && tone === 5 && c.bias < 2) tone = 4;
      toneOf[y * S + x] = tone;
    }
    const put = (x: number, y: number, hex: string, a = 255) => {
      const i = (y * S + x) * 4;
      const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), bb = parseInt(hex.slice(5, 7), 16);
      if (a >= 255 || out.data[i + 3] === 0) { out.data[i] = r; out.data[i + 1] = g; out.data[i + 2] = bb; out.data[i + 3] = a; return; }
      // mezcla sobre lo que ya hay (halo sobre sombra)
      const A = a / 255, B = out.data[i + 3] / 255, oa = A + B * (1 - A);
      out.data[i] = (r * A + out.data[i] * B * (1 - A)) / oa; out.data[i + 1] = (g * A + out.data[i + 1] * B * (1 - A)) / oa; out.data[i + 2] = (bb * A + out.data[i + 2] * B * (1 - A)) / oa;
      out.data[i + 3] = oa * 255;
    };
    // sombra en el piso
    if (opt.shadow) {
      const [scx, scy, srx, sry] = opt.shadow;
      for (let y = 0; y < H; y++) for (let x = 0; x < S; x++) {
        const dx = (x + 0.5 - scx * k) / (srx * k), dy = (y + 0.5 - scy * k) / (sry * k);
        const d = dx * dx + dy * dy;
        if (d <= 1) put(x, y, '#0a0710', d < 0.45 ? 120 : 70);
      }
    }
    // halo de rareza: alrededor de la silueta, desvanecido
    const filled = (x: number, y: number) => x >= 0 && y >= 0 && x < S && y < H && !!cells[y * S + x];
    if (opt.aura) {
      const K = opt.auraK ?? 1;
      const reach = Math.max(2, Math.round(1.7 * k));
      const dist = this.distField(reach + 1);
      for (let y = 0; y < H; y++) for (let x = 0; x < S; x++) {
        if (filled(x, y)) continue;
        const d = dist[y * S + x];
        if (d < 2 || d > reach + 1) continue;
        const a = Math.round(K * 105 * (1 - (d - 2) / (reach + 0.5)) ** 1.3);
        if (a > 6) put(x, y, opt.aura, a);
      }
    }
    // resplandor de lo que brilla (runas, cristales encendidos)
    const glowK = opt.glowK ?? 1;
    const glowR = Math.max(1, Math.round(1.6 * k));
    for (let y = 0; y < H; y++) for (let x = 0; x < S; x++) {
      const c = cells[y * S + x];
      if (!c || this.mats[c.mat].kind !== 'glow') continue;
      const col = ramps[c.mat][4];
      for (let dy = -glowR; dy <= glowR; dy++) for (let dx = -glowR; dx <= glowR; dx++) {
        const X = x + dx, Y = y + dy, d = Math.hypot(dx, dy);
        if (d === 0 || d > glowR + 0.3 || X < 0 || Y < 0 || X >= S || Y >= H || filled(X, Y)) continue;
        if (Math.max(Math.abs(dx), Math.abs(dy)) === 1 && !opt.noOutline) {
          // el pixel de al lado es contorno: se tiñe un poco
          continue;
        }
        put(X, Y, col, Math.round(glowK * 70 * (1 - d / (glowR + 1))));
      }
    }
    // contorno exterior de color: el tono más oscuro del material vecino
    if (!opt.noOutline) {
      for (let y = 0; y < H; y++) for (let x = 0; x < S; x++) {
        if (filled(x, y)) continue;
        let best: Cell | undefined;
        for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
          const o = filled(x + dx, y + dy) ? cells[(y + dy) * S + (x + dx)] : undefined;
          if (o && (!best || o.z > best.z)) best = o;
        }
        if (!best) continue;
        const m = this.mats[best.mat];
        // lo que brilla tiene contorno de su color (no oscuro): se ve como luz
        put(x, y, m.kind === 'glow' ? ramps[best.mat][2] : ramps[best.mat][0]);
      }
    }
    // pixeles
    const sw = opt.sweep;
    for (let y = 0; y < H; y++) for (let x = 0; x < S; x++) {
      const c = cells[y * S + x];
      if (!c) continue;
      let tone = toneOf[y * S + x];
      const kind = this.mats[c.mat].kind;
      if (sw !== null && sw !== undefined && (kind === 'metal' || kind === 'gem' || kind === 'crystal' || kind === 'glow')) {
        // barrido: una banda diagonal clara que cruza el objeto
        const p = (x + (H - 1 - y)) / (S + H);
        const d = Math.abs(p - sw);
        if (d < 0.05) tone = Math.min(5, tone + 2);
        else if (d < 0.1) tone = Math.min(5, tone + 1);
      }
      put(x, y, ramps[c.mat][Math.max(0, Math.min(5, tone))]);
    }
    // destellos: estrella de 4 puntas
    for (const sp of opt.sparkles ?? []) {
      const X = Math.round(sp[0] * k), Y = Math.round(sp[1] * k);
      const arm = Math.max(1, Math.round(1.2 * k));
      if (X < 0 || Y < 0 || X >= S || Y >= H) continue;
      put(X, Y, '#ffffff');
      for (let i = 1; i <= arm; i++) {
        const a = i === arm ? 150 : 230;
        for (const [dx, dy] of [[i, 0], [-i, 0], [0, i], [0, -i]]) { const XX = X + dx, YY = Y + dy; if (XX >= 0 && YY >= 0 && XX < S && YY < H) put(XX, YY, '#fff6d8', a); }
      }
    }
    return out;
  }

  /** distancia (chebyshev aproximada) de cada pixel vacío a la silueta, hasta max */
  private distField(max: number): Uint8Array {
    const S = this.size, H = this.h;
    const d = new Uint8Array(S * H).fill(255);
    const q: number[] = [];
    for (let i = 0; i < S * H; i++) if (this.cells[i]) { d[i] = 0; q.push(i); }
    for (let head = 0; head < q.length; head++) {
      const i = q[head], x = i % S, y = (i / S) | 0;
      if (d[i] >= max) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const X = x + dx, Y = y + dy;
        if (X < 0 || Y < 0 || X >= S || Y >= H) continue;
        const j = Y * S + X;
        const nd = d[i] + 1;
        if (nd < d[j]) { d[j] = nd; q.push(j); }
      }
    }
    return d;
  }
}

/** Eje local para dibujar armas: u a lo largo (desde el pomo), v de través. */
export class Axis {
  private ca: number;
  private sa: number;
  constructor(readonly origin: P, angleDeg: number, readonly scale = 1) {
    const a = (angleDeg * Math.PI) / 180;
    this.ca = Math.cos(a); this.sa = Math.sin(a);
  }
  p(u: number, v = 0): P {
    const s = this.scale;
    return [this.origin[0] + (u * this.ca - v * this.sa) * s, this.origin[1] + (u * this.sa + v * this.ca) * s];
  }
  pts(list: P[]): P[] { return list.map(([u, v]) => this.p(u, v)); }
}

/** Mezcla dos colores hex (t = 0 → a, 1 → b). */
export function mixHex(a: string, b: string, t: number): string {
  const A = hexToLab(a), B = hexToLab(b);
  return labToHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

/** Pone una imagen RGBA sobre otra (con alfa). */
export function over(dst: Raster, src: Raster, ox = 0, oy = 0) {
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    const X = x + ox, Y = y + oy;
    if (X < 0 || Y < 0 || X >= dst.w || Y >= dst.h) continue;
    const s = (y * src.w + x) * 4, d = (Y * dst.w + X) * 4;
    const a = src.data[s + 3] / 255;
    if (!a) continue;
    const b = dst.data[d + 3] / 255, oa = a + b * (1 - a);
    for (let c = 0; c < 3; c++) dst.data[d + c] = (src.data[s + c] * a + dst.data[d + c] * b * (1 - a)) / oa;
    dst.data[d + 3] = oa * 255;
  }
}
