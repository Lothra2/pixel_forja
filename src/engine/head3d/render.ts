import { type HeadModel, type HeadRow, rowAt } from './model';
import { makeRamp, type Ramp, OUTLINE, SHADOW, BASE, LIGHT } from '../color/ramp';
import { hexToLab, labToHex, labToLch, lchToLab } from '../color/oklab';
import type { EyeExpr, MouthExpr } from '../head/stamps';
import type { IndexImage } from '../render/rotsprite';

/**
 * Dibuja el modelo de cabeza en pixel art, en cualquier ángulo.
 * Se lanza un rayo por subpixel contra el volumen de la cabeza (cortes por fila, nariz y orejas),
 * se decide el material por ángulo (pelo, barba, piel), se sombrea en bandas con una luz arriba a la
 * izquierda y al final se ponen ojos, cejas y boca con reglas de pixel art, no reducidos.
 */
export interface HeadStyle {
  name: string;
  /** alto / ancho del dibujo (chibi ~1.1, más fiel ~1.35) */
  aspect: number;
  /** peso de cada tercio al repartir el alto: [pelo y frente, ojos y nariz, boca y barbilla] */
  thirds: [number, number, number];
  /** contorno del color del material (Stardew) o negro (Megaman) */
  outline: 'color' | 'black';
  eyes: 'dot' | 'stardew' | 'big';
  /** blanco del ojo y brillo */
  shine: boolean;
  /** sombra bajo la ceja (ojos hundidos medidos en la foto) */
  socket: boolean;
  /** barba canosa con pixeles claros y oscuros */
  speckle: boolean;
  /** cejas más gruesas que lo medido */
  boldBrows: number;
  /** nariz más larga que lo medido (caricatura) */
  noseK: number;
  /** usar la banda de luz en la piel */
  skinLight: boolean;
}

export const HEAD_STYLES: Record<string, HeadStyle> = {
  stardew: { name: 'stardew', aspect: 1.12, thirds: [1, 0.95, 0.72], outline: 'color', eyes: 'stardew', shine: true, socket: true, speckle: true, boldBrows: 1, noseK: 1, skinLight: true },
  fiel: { name: 'fiel', aspect: 1.32, thirds: [1, 1, 0.95], outline: 'color', eyes: 'stardew', shine: true, socket: true, speckle: true, boldBrows: 1, noseK: 1, skinLight: true },
  megaman: { name: 'megaman', aspect: 1.02, thirds: [0.95, 1.05, 0.6], outline: 'black', eyes: 'big', shine: true, socket: false, speckle: false, boldBrows: 1, noseK: 0.7, skinLight: false },
  caricatura: { name: 'caricatura', aspect: 1.24, thirds: [0.9, 0.95, 1.15], outline: 'color', eyes: 'dot', shine: false, socket: true, speckle: true, boldBrows: 1.6, noseK: 1.5, skinLight: true },
};

export interface ModelHeadPal {
  hex: string;
  mat: 'hair' | 'skin' | 'face' | 'beard' | 'accessory';
  back: boolean;
  /** color del contorno de este color */
  dark?: string;
}
export interface ModelHeadImage {
  img: IndexImage;
  pal: ModelHeadPal[];
  /** cuello: centro de la barbilla */
  anchor: { x: number; y: number };
}

export interface ModelHeadOpts {
  /** ancho de la cabeza de frente, en pixeles */
  width: number;
  /** giro: 0 de frente, 90 de perfil mirando a la derecha, 180 de espalda */
  yaw: number;
  style: HeadStyle;
  eyes?: EyeExpr;
  mouth?: MouthExpr;
  /** colores de la ficha (si se recoloreó): base de piel y de pelo */
  skin?: string;
  hair?: string;
}

const SS = 4;
const N_FRONT = 2.4, N_BACK = 2.2;
const LIGHT_DIR = (() => { const v = [-0.45, -0.62, 0.64]; const n = Math.hypot(...v); return v.map((x) => x / n); })();

type Solid = 0 | 1 | 2 | 3; // nada, cabeza, nariz, oreja
type Mat = 'skin' | 'hair' | 'beard';

/** Geometría 3D del modelo: perfiles de profundidad por fila, nariz y orejas. */
export class HeadGeo {
  readonly m: HeadModel;
  readonly noseLen: number;
  private rowCache = new Map<number, HeadRow>();
  constructor(m: HeadModel, noseK = 1) {
    this.m = m;
    this.noseLen = m.nose.len * noseK;
  }
  row(y: number): HeadRow {
    const k = Math.round(y * 400);
    let r = this.rowCache.get(k);
    if (!r) { r = rowAt(this.m, k / 400); this.rowCache.set(k, r); }
    return r;
  }
  /** profundidad hacia adelante de la silueta (0 = centro de la cabeza) */
  zf(y: number): number {
    const { brow, mouth } = this.m.marks;
    const H = this.m.height;
    if (y < brow) { const s = (brow - y) / brow; return 0.98 * Math.sqrt(Math.max(0, 1 - s * s)); }
    const chinT = Math.max(0, (y - mouth) / Math.max(0.01, H - mouth));
    return 0.96 - 0.08 * chinT + this.m.beardLen * Math.sin(Math.min(1, chinT) * Math.PI * 0.5);
  }
  /** profundidad hacia atrás (nuca) */
  zb(y: number): number {
    const { brow, nose, mouth } = this.m.marks;
    const H = this.m.height;
    if (y < brow) { const s = (brow - y) / brow; return 1.12 * Math.sqrt(Math.max(0, 1 - s * s * 0.92)); }
    const pts: [number, number][] = [[brow, 1.12], [nose, 0.92], [mouth, 0.62], [H, 0.32]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [y0, a] = pts[i], [y1, b] = pts[i + 1];
      if (y <= y1) return a + ((b - a) * (y - y0)) / Math.max(0.01, y1 - y0);
    }
    return 0.32;
  }
  /** campo: <= 0 adentro. Devuelve también qué pieza es */
  field(x: number, y: number, z: number): [number, Solid] {
    let best = 1e9, solid: Solid = 0;
    if (y >= 0 && y <= this.m.height) {
      const r = this.row(y);
      const wd = x < 0 ? r.wl : r.wr;
      if (wd > 0.02) {
        const d = z >= 0 ? this.zf(y) : this.zb(y);
        const n = z >= 0 ? N_FRONT : N_BACK;
        const v = Math.pow(Math.abs(x) / wd, n) + Math.pow(Math.abs(z) / Math.max(0.05, d), n) - 1;
        if (v < best) { best = v; solid = 1; }
      }
    }
    // nariz: de la línea de los ojos a la punta, sale de la cara
    const { eye, nose } = this.m.marks;
    const n0 = eye - 0.05, n1 = nose + 0.04;
    if (y > n0 && y < n1 && this.noseLen > 0) {
      const q = (y - n0) / (n1 - n0);
      const p = this.noseLen * (q < 0.82 ? 0.3 + 0.7 * (q / 0.82) : 1 - ((q - 0.82) / 0.18) * 0.45);
      const nw = this.m.nose.w * (0.55 + 0.45 * q);
      const base = this.zf(y) - 0.12;
      const cz = base + (p + 0.12) / 2, rz = (p + 0.12) / 2;
      const v = (x / nw) ** 2 + ((z - cz) / rz) ** 2 - 1;
      if (v < best) { best = v; solid = 2; }
    }
    const ears = this.m.ears;
    if (ears) {
      const cy = (ears.y0 + ears.y1) / 2, ry = Math.max(0.15, (ears.y1 - ears.y0) / 2);
      const r = this.row(cy);
      for (const sgn of [-1, 1]) {
        const cx = sgn * ((sgn < 0 ? r.wl : r.wr) * 0.96 + ears.size * 0.15);
        const rx = 0.07 + ears.size * 0.55;
        const v = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z + 0.06) / 0.22) ** 2 - 1;
        if (v < best) { best = v; solid = 3; }
      }
    }
    return [best, solid];
  }
  material(x: number, y: number, z: number, solid: Solid): Mat {
    if (solid !== 1) return 'skin';
    const r = this.row(y);
    const phi = (Math.atan2(Math.abs(x), z) * 180) / Math.PI;
    let hair = x < 0 ? r.hairL : r.hairR;
    // nuca: lo de atrás de la cabeza es pelo hasta un poco más abajo de las orejas
    const nape = this.m.marks.mouth + (this.m.height - this.m.marks.mouth) * 0.45;
    if (hair > 180 && y < nape) hair = 100;
    // debajo de la ceja, el pelo que se ve de frente en el borde es patilla o pelo detrás de la oreja:
    // de lado, la mejilla sigue siendo piel
    if (hair <= 180 && y > this.m.marks.brow) hair = Math.max(hair, 80);
    if (hair < 180 && y < nape) hair = Math.min(hair, 100);
    if (phi >= hair) return 'hair';
    if (r.beardTo > 0) {
      const to = r.beardTo >= 85 ? 112 : r.beardTo;
      if (phi >= r.beardFrom && phi <= to) return 'beard';
    }
    return 'skin';
  }
}


/** Ajuste del color de piel medido en foto: un poco más claro y cálido, como en el pixel art. */
export function stylizeSkin(hex: string): string {
  const [L, C, h] = labToLch(hexToLab(hex));
  const target = (62 * Math.PI) / 180;
  let d = target - h; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
  return labToHex(lchToLab([Math.min(0.86, L + 0.07), Math.min(0.11, C * 1.05), h + d * 0.45]));
}
export function liftHair(hex: string): string {
  const [L, C, h] = labToLch(hexToLab(hex));
  return labToHex(lchToLab([Math.max(L, Math.min(0.42, L + 0.05)), C * 1.1, h]));
}
function lighten(hex: string, dL: number): string {
  const l = hexToLab(hex);
  return labToHex([Math.min(0.95, l[0] + dL), l[1], l[2]]);
}
function mixHex(a: string, b: string, t: number): string {
  const p = hexToLab(a), q = hexToLab(b);
  return labToHex([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t]);
}
function grayish(hex: string, k = 0.45): string {
  const [L, C, h] = labToLch(hexToLab(hex));
  return labToHex(lchToLab([L, C * k, h]));
}
function lipOf(skin: string): string {
  const [L, C, h] = labToLch(hexToLab(skin));
  return labToHex(lchToLab([L - 0.12, Math.max(0.08, C * 1.5), h - 0.35]));
}

interface Px { solid: Solid; mat: Mat; d: number; x: number; y: number; z: number; zv: number; nz: number }

const cache = new WeakMap<HeadModel, Map<string, ModelHeadImage>>();

export function renderHeadModel(m: HeadModel, o: ModelHeadOpts): ModelHeadImage {
  const key = `${o.width}|${Math.round(o.yaw)}|${o.style.name}|${o.eyes ?? 'open'}|${o.mouth ?? 'line'}|${o.skin}|${o.hair}`;
  let mc = cache.get(m);
  if (!mc) { mc = new Map(); cache.set(m, mc); }
  const hit = mc.get(key);
  if (hit) return hit;
  const out = render(m, o);
  mc.set(key, out);
  return out;
}

function render(m: HeadModel, o: ModelHeadOpts): ModelHeadImage {
  const st = o.style;
  const geo = new HeadGeo(m, st.noseK);
  const yaw = (o.yaw * Math.PI) / 180;
  const cs = Math.cos(yaw), sn = Math.sin(yaw);
  // escala: el ancho de frente (con orejas) mide `width` pixeles
  let maxW = 0;
  for (const r of m.rows) maxW = Math.max(maxW, r.wl, r.wr);
  if (m.ears) maxW = Math.max(maxW, Math.max(...m.rows.map((r) => r.wr)) * 0.96 + m.ears.size * 0.15 + 0.07 + m.ears.size * 0.55);
  const k = o.width / (2 * maxW);
  // reparto vertical por tercios
  const Hout = Math.max(6, Math.round(o.width * st.aspect));
  const { brow, nose } = m.marks;
  const H = m.height;
  const segs = [brow, nose - brow, H - nose].map((l, i) => l * st.thirds[i]);
  const tot = segs.reduce((s, v) => s + v, 0);
  const cuts = [0, segs[0] / tot, (segs[0] + segs[1]) / tot, 1].map((t) => t * Hout);
  const ys = [0, brow, nose, H];
  const yOf = (row: number) => {
    for (let i = 0; i < 3; i++) if (row <= cuts[i + 1] || i === 2) return ys[i] + ((row - cuts[i]) / Math.max(1e-6, cuts[i + 1] - cuts[i])) * (ys[i + 1] - ys[i]);
    return H;
  };
  const rowOf = (y: number) => {
    for (let i = 0; i < 3; i++) if (y <= ys[i + 1] || i === 2) return cuts[i] + ((y - ys[i]) / Math.max(1e-6, ys[i + 1] - ys[i])) * (cuts[i + 1] - cuts[i]);
    return Hout;
  };
  const ext = Math.max(maxW, 0.98 + geo.noseLen, 1.15) * 1.08;
  const Wimg = Math.ceil(2 * ext * k) + 2;
  const cx = Wimg / 2;

  // ---------- rayos ----------
  const samples: (Px | null)[] = new Array(Wimg * Hout * SS * SS).fill(null);
  const step = 0.02;
  for (let row = 0; row < Hout; row++)
    for (let j = 0; j < SS; j++) {
      const y = yOf(row + (j + 0.5) / SS);
      for (let col = 0; col < Wimg; col++)
        for (let i = 0; i < SS; i++) {
          const X = (col + (i + 0.5) / SS - cx) / k;
          let prev = ext + 0.2, found = false;
          for (let zv = ext + 0.2; zv >= -ext - 0.2; zv -= step) {
            const x = X * cs - zv * sn, z = X * sn + zv * cs;
            if (geo.field(x, y, z)[0] <= 0) {
              // afinar el borde
              let a = zv, b = prev;
              for (let t = 0; t < 6; t++) {
                const mid = (a + b) / 2;
                if (geo.field(X * cs - mid * sn, y, X * sn + mid * cs)[0] <= 0) a = mid; else b = mid;
              }
              const zh = a;
              const x2 = X * cs - zh * sn, z2 = X * sn + zh * cs;
              const [, solid] = geo.field(x2, y, z2);
              // normal por diferencias
              const e = 0.025;
              const gx = geo.field(x2 + e, y, z2)[0] - geo.field(x2 - e, y, z2)[0];
              const gy = geo.field(x2, y + e, z2)[0] - geo.field(x2, y - e, z2)[0];
              const gz = geo.field(x2, y, z2 + e)[0] - geo.field(x2, y, z2 - e)[0];
              const gl = Math.hypot(gx, gy, gz) || 1;
              const nx = gx / gl, ny = gy / gl, nz = gz / gl;
              const vx = nx * cs + nz * sn, vz = -nx * sn + nz * cs;
              const d = vx * LIGHT_DIR[0] + ny * LIGHT_DIR[1] + vz * LIGHT_DIR[2];
              samples[((row * SS + j) * Wimg + col) * SS + i] = { solid, mat: geo.material(x2, y, z2, solid), d, x: x2, y, z: z2, zv: zh, nz: vz };
              found = true;
              break;
            }
            prev = zv;
          }
          void found;
        }
    }

  // ---------- pixeles ----------
  interface Cell { mat: Mat; solid: Solid; d: number; x: number; y: number; z: number; zv: number; nz: number }
  const cells: (Cell | null)[] = new Array(Wimg * Hout).fill(null);
  for (let row = 0; row < Hout; row++)
    for (let col = 0; col < Wimg; col++) {
      const list: Px[] = [];
      for (let j = 0; j < SS; j++) for (let i = 0; i < SS; i++) { const s = samples[((row * SS + j) * Wimg + col) * SS + i]; if (s) list.push(s); }
      if (list.length < (SS * SS) / 2) continue;
      const count: Record<Mat, number> = { skin: 0, hair: 0, beard: 0 };
      for (const s of list) count[s.mat]++;
      const mat = (Object.keys(count) as Mat[]).sort((a, b) => count[b] - count[a])[0];
      const sel = list.filter((s) => s.mat === mat);
      const avg = (f: (s: Px) => number) => sel.reduce((a, s) => a + f(s), 0) / sel.length;
      const solids = [0, 0, 0, 0];
      for (const s of sel) solids[s.solid]++;
      cells[row * Wimg + col] = {
        mat, solid: solids.indexOf(Math.max(...solids)) as Solid, d: avg((s) => s.d), x: avg((s) => s.x), y: avg((s) => s.y), z: avg((s) => s.z), zv: avg((s) => s.zv), nz: avg((s) => s.nz),
      };
    }

  // ---------- color ----------
  const skin = o.skin ?? stylizeSkin(m.colors.skin);
  const skinR = makeRamp(skin);
  const hairR = makeRamp(o.hair ?? liftHair(m.colors.hair));
  const bl = m.colors.beardLight ? lighten(grayish(m.colors.beardLight, 0.35), 0.06) : null;
  const bd = m.colors.beardDark ? grayish(m.colors.beardDark, 0.6) : null;
  const beardLR = bl ? makeRamp(bl) : hairR;
  const beardDR = bd ? makeRamp(bd) : hairR;
  const beardMR = bl && bd ? makeRamp(mixHex(bl, bd, 0.45)) : beardLR;
  const black = '#16121c';
  const pal: ModelHeadPal[] = [];
  const palIdx = new Map<string, number>();
  const entry = (hex: string, mat: ModelHeadPal['mat'], dark: string) => {
    const kk = `${hex}|${mat}|${dark}`;
    let i = palIdx.get(kk);
    if (i === undefined) { i = pal.length; pal.push({ hex, mat, back: false, dark }); palIdx.set(kk, i); }
    return i;
  };
  const outl = (r: Ramp) => (st.outline === 'black' ? black : r[OUTLINE]);
  const idx = new Int16Array(Wimg * Hout).fill(-1);
  const tone = (c: Cell): number => {
    if (c.mat === 'hair') return c.d > 0.62 ? LIGHT : c.d > 0.12 ? BASE : SHADOW;
    if (c.mat === 'beard') return c.d > 0.2 ? BASE : SHADOW;
    if (c.solid === 3) return c.d > 0.45 ? BASE : SHADOW;
    return st.skinLight && c.d > 0.88 ? LIGHT : c.d > 0.3 ? BASE : SHADOW;
  };
  const tones = new Int8Array(Wimg * Hout).fill(-1);
  for (let p = 0; p < cells.length; p++) { const c = cells[p]; if (c) tones[p] = tone(c); }
  // sombras de pixel artist: bajo el pelo, bajo la nariz
  for (let row = 1; row < Hout; row++)
    for (let col = 0; col < Wimg; col++) {
      const p = row * Wimg + col, c = cells[p], up = cells[p - Wimg];
      if (!c || !up || c.mat !== 'skin' || c.solid === 3) continue;
      if (up.mat === 'hair' && c.y < m.marks.eye) tones[p] = Math.min(tones[p], SHADOW);
      if (up.solid === 2 && c.solid === 1) tones[p] = Math.min(tones[p], SHADOW);
    }
  // oreja: el centro hundido. Pelo: mechones claros peinados hacia atrás
  for (let p = 0; p < cells.length; p++) {
    const c = cells[p];
    if (!c) continue;
    if (c.solid === 3 && [p - 1, p + 1, p - Wimg, p + Wimg].every((q) => cells[q]?.solid === 3)) tones[p] = SHADOW;
    if (c.mat === 'hair' && tones[p] === BASE && c.d > 0.3) {
      const sweep = c.y * 1.1 - c.z * 0.7 + Math.abs(c.x) * 0.35;
      const f = sweep * 3.2 - Math.floor(sweep * 3.2);
      if (f < 0.16 && c.y < m.marks.brow) tones[p] = LIGHT;
    }
  }
  const rampOf = (c: Cell, p: number): Ramp => {
    if (c.mat === 'skin') return skinR;
    if (c.mat === 'hair') return hairR;
    if (!st.speckle) return beardLR;
    // canas: claro y oscuro según la fila, con un tramado 2x2 solo en la transición
    const r = geo.row(c.y);
    // canas: oscura donde la foto es oscura (bigote), gris en el grueso y clara donde hay más canas
    const v = r.beardLight;
    void p;
    return v < 0.34 ? beardDR : v > 0.56 ? beardLR : beardMR;
  };
  for (let p = 0; p < cells.length; p++) {
    const c = cells[p];
    if (!c) continue;
    const r = rampOf(c, p);
    const mat = c.mat === 'beard' ? 'beard' : c.mat === 'hair' ? 'hair' : 'skin';
    idx[p] = entry(r[tones[p]], mat, outl(r));
  }

  // ---------- rasgos ----------
  const put = (col: number, row: number, hex: string, mat: ModelHeadPal['mat'] = 'face') => {
    col = Math.round(col); row = Math.round(row);
    if (col < 0 || row < 0 || col >= Wimg || row >= Hout || idx[row * Wimg + col] < 0) return;
    idx[row * Wimg + col] = entry(hex, mat, mat === 'hair' ? outl(hairR) : outl(skinR));
  };
  /** punto de la superficie a la altura y y ángulo φ (grados) */
  const surf = (y: number, phiDeg: number) => {
    const a = (phiDeg * Math.PI) / 180;
    let lo = 0, hi = 2;
    for (let t = 0; t < 18; t++) {
      const mid = (lo + hi) / 2;
      const [f, s] = geo.field(mid * Math.sin(a), y, mid * Math.cos(a));
      if (f <= 0 && s === 1) lo = mid; else hi = mid;
    }
    const x = lo * Math.sin(a), z = lo * Math.cos(a);
    const X = x * cs + z * sn, zv = -x * sn + z * cs;
    // de frente a la cámara: normal aproximada por el ángulo
    const facing = Math.cos(a) * cs - Math.sin(a) * sn;
    return { col: cx + X * k - 0.5, row: rowOf(y) - 0.5, zv, facing, x, z };
  };
  const visible = (s: { col: number; row: number; zv: number; facing: number }) => {
    if (s.facing < 0.18) return false;
    const c = cells[Math.round(s.row) * Wimg + Math.round(s.col)];
    return !!c && c.mat !== 'hair' && Math.abs(c.zv - s.zv) < 0.22;
  };
  const eyeExpr = o.eyes ?? 'open';
  const mouthExpr = o.mouth ?? 'line';
  const vk = Hout / (o.width * 1.0) / (H / (2 * maxW)); // escala vertical relativa
  void vk;
  const darkEye = labToHex((() => { const l = hexToLab(m.eyes.color); return [Math.min(0.2, l[0] * 0.55), l[1] * 0.6, l[2] * 0.6] as [number, number, number]; })());
  const browHex = st.outline === 'black' ? black : labToHex((() => { const l = hexToLab(m.brows.color); return [Math.min(0.24, l[0] * 0.7), l[1], l[2]] as [number, number, number]; })());
  const cls = o.width >= 24 ? 64 : o.width >= 17 ? 48 : 32;
  const ey = m.marks.eye;
  const rowE = geo.row(ey);
  const halfW = (rowE.wl + rowE.wr) / 2;
  const eyePhi = (Math.asin(Math.min(0.95, m.eyes.x / halfW)) * 180) / Math.PI;

  for (const sgn of [-1, 1]) {
    const e = surf(ey, sgn * eyePhi);
    if (!visible(e)) continue;
    const fore = Math.max(0.35, e.facing);
    // cuenca: sombra entre la ceja y el ojo
    const ecol = Math.round(e.col), erow = Math.round(e.row);
    const ew = cls === 64 ? 3 : cls === 48 ? 2 : 1;
    const ewF = Math.max(1, Math.round(ew * Math.min(1, fore + 0.25)));
    const x0 = ecol - Math.floor((ewF - 1) / 2);
    if (st.socket && m.eyes.deep) {
      for (let i = -1; i <= ewF; i++) {
        const p = (erow - 1) * Wimg + x0 + i;
        if (cells[p]?.mat === 'skin' && idx[p] >= 0) idx[p] = entry(skinR[SHADOW], 'skin', outl(skinR));
      }
    }
    // ceja: encima del ojo, gruesa si lo es
    const bRow = Math.round(surf(m.marks.brow, sgn * eyePhi).row);
    const bT = Math.max(1, Math.min(cls === 64 ? 3 : 2, Math.round(m.brows.t * k * st.boldBrows * 0.75 + (m.brows.t > 0.15 && cls >= 48 ? 0.6 : 0))));
    const bw = Math.max(2, Math.round((m.brows.w * k * Math.min(1, fore + 0.15)) * (cls === 32 ? 0.7 : 0.85)));
    const browTop = Math.min(bRow, erow - 1 - bT);
    // la ceja se corre un poco hacia afuera del ojo
    const bx0 = sgn < 0 ? x0 + ewF - bw + (bw > ewF ? 0 : 0) - (bw > ewF + 1 ? 1 : 0) : x0 - (bw > ewF + 1 ? 0 : 0);
    for (let t = 0; t < bT; t++)
      for (let i = 0; i < bw; i++) {
        const outer = sgn < 0 ? i === 0 : i === bw - 1;
        const inner = sgn < 0 ? i === bw - 1 : i === 0;
        let rr = browTop + t;
        if (eyeExpr === 'angry' && inner) rr += 1;
        if (eyeExpr === 'sad' && inner) rr -= 1;
        // grosor: el extremo de afuera más fino
        if (t === bT - 1 && bT > 1 && outer) continue;
        put(bx0 + i, rr, browHex, 'hair');
      }
    // ojo
    const eh = cls === 64 ? 3 : 2;
    const shineLeft = true; // la luz viene de la izquierda
    for (let j = 0; j < eh; j++)
      for (let i = 0; i < ewF; i++) {
        const xx = x0 + i, yy = erow - Math.floor((eh - 1) / 2) + j;
        let hex: string | null = darkEye;
        if (eyeExpr === 'closed' || eyeExpr === 'happy') {
          if (j !== eh - 1) hex = null;
          if (eyeExpr === 'happy' && j === eh - 1 && ewF >= 2) hex = darkEye;
        } else if (st.eyes === 'dot') {
          if (j === 0 && eh > 1 && ewF > 1 && i !== (shineLeft ? ewF - 1 : 0)) hex = null;
        } else if (st.eyes === 'stardew') {
          if (st.shine && ewF >= 2 && j === 0 && i === (sgn < 0 ? 0 : ewF - 1)) hex = '#f4f1ea';
        }
        if (eyeExpr === 'wide' && j === 0) hex = darkEye;
        if (hex) put(xx, yy, hex);
      }
    if (st.eyes === 'big' && eyeExpr !== 'closed' && eyeExpr !== 'happy') {
      // ojo grande tipo Megaman: blanco al lado de afuera y pupila oscura adentro
      const wx = sgn < 0 ? x0 - 1 : x0 + ewF;
      for (let j = 0; j < eh; j++) put(wx, erow - Math.floor((eh - 1) / 2) + j, '#f4f1ea');
      put(sgn < 0 ? x0 : x0 + ewF - 1, erow - Math.floor((eh - 1) / 2), '#f4f1ea');
    }
  }
  // nariz de frente: una línea de sombra al lado de la sombra y la fosa abajo
  if (Math.abs(o.yaw) < 20) {
    const nb = surf(m.marks.nose, 0), nt = surf(m.marks.eye + (m.marks.nose - m.marks.eye) * 0.35, 0);
    const ncol = Math.round(nb.col);
    const shade = (col: number, row: number) => { const p = row * Wimg + col; if (cells[p]?.mat === 'skin' && idx[p] >= 0) idx[p] = entry(skinR[SHADOW], 'skin', outl(skinR)); };
    for (let r = Math.round(nt.row); r < Math.round(nb.row); r++) shade(ncol + 1, r);
    shade(ncol, Math.round(nb.row)); shade(ncol + 1, Math.round(nb.row));
  }
  // boca
  const mo = surf(m.marks.mouth, 0);
  if (visible(mo)) {
    const lip = lipOf(skin);
    const mw = Math.max(2, Math.round(2 * m.mouth.w * k * 0.7 * Math.max(0.5, mo.facing)));
    const mcol = Math.round(mo.col - (mw - 1) / 2), mrow = Math.round(mo.row);
    const lineHex = st.outline === 'black' ? black : labToHex((() => { const l = hexToLab(lip); return [l[0] * 0.62, l[1], l[2]] as [number, number, number]; })());
    const shape: Record<MouthExpr, string[]> = {
      line: ['l'.repeat(mw)],
      smile: [`m${'l'.repeat(Math.max(0, mw - 2))}m`.slice(0, mw), `.${'m'.repeat(Math.max(1, mw - 2))}.`],
      frown: [`.${'m'.repeat(Math.max(1, mw - 2))}.`, `m${'.'.repeat(Math.max(0, mw - 2))}m`.slice(0, mw)],
      open: ['m'.repeat(mw), `.${'r'.repeat(Math.max(1, mw - 2))}.`],
      grin: ['m'.repeat(mw), 'w'.repeat(mw)],
      o: ['mm', 'rr'],
    };
    const rows = shape[mouthExpr] ?? shape.line;
    rows.forEach((s, j) => [...s].forEach((ch, i) => {
      const hex = ch === 'l' ? lip : ch === 'm' ? lineHex : ch === 'r' ? '#5a1f26' : ch === 'w' ? '#f4f1ea' : null;
      if (hex) put(mcol + i + (rows[0].length < mw ? Math.floor((mw - rows[0].length) / 2) : 0), mrow + j, hex);
    }));
  }

  // ---------- recorte y cuello ----------
  let x0 = Wimg, x1 = -1, y1 = -1;
  for (let p = 0; p < idx.length; p++) if (idx[p] >= 0) { const c = p % Wimg; x0 = Math.min(x0, c); x1 = Math.max(x1, c); y1 = Math.max(y1, Math.floor(p / Wimg)); }
  const nw = x1 - x0 + 1;
  const img = new Int16Array(nw * Hout).fill(-1);
  for (let r = 0; r < Hout; r++) for (let c = 0; c < nw; c++) img[r * nw + c] = idx[r * Wimg + c + x0];
  // cuello: debajo del centro de la cabeza, un poco hacia la nuca de perfil
  const neckX = cx + (-0.12 * sn) * k - 0.5 - x0;
  let chinRow = y1;
  const nc = Math.round(neckX);
  for (let r = Hout - 1; r >= 0; r--) if (img[r * nw + Math.max(0, Math.min(nw - 1, nc))] >= 0) { chinRow = r; break; }
  return { img: { w: nw, h: Hout, idx: img }, pal, anchor: { x: Math.round(neckX), y: chinRow } };
}
