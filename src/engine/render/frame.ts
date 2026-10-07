import type { Raster } from '../core/raster';
import { type Ficha, type CellSize, PIXEL_CHARS, type HeadBitmap } from '../sheet/ficha';
import { dimsFor, type Dims } from '../rig/dims';
import { type Pose, solveLeg, armPoints } from '../rig/pose';
import { type Ramp, OUTLINE, SHADOW, BASE, LIGHT } from '../color/ramp';
import { hexToLab, labToHex } from '../color/oklab';
import { LayerCanvas, Layer, packHex, finalizeOutlines, toRaster, type Paint } from './canvas';
import { EYES, MOUTHS, BLUSH, BROW, stampOrigin, type Stamp } from '../head/stamps';

type MatName = 'skin' | 'hair' | 'top' | 'bottom' | 'socks' | 'shoes' | 'accessory' | 'face';
const MAT_ID: Record<MatName, number> = { skin: 0, hair: 1, top: 2, bottom: 3, socks: 4, shoes: 5, accessory: 6, face: 7 };

interface Px { mat: MatName; slot: number }

/** Pieza en construcción. Se sombrea completa al final y recién ahí va al lienzo. */
class Part {
  readonly px = new Map<number, Px>();
  static key(x: number, y: number) { return (y + 1024) * 4096 + (x + 1024); }
  set(x: number, y: number, mat: MatName, slot = BASE) { this.px.set(Part.key(x, y), { mat, slot }); }
  has(x: number, y: number) { return this.px.has(Part.key(x, y)); }
  get(x: number, y: number) { return this.px.get(Part.key(x, y)); }
  *entries(): Generator<[number, number, Px]> {
    for (const [k, v] of this.px) yield [(k % 4096) - 1024, Math.floor(k / 4096) - 1024, v];
  }
}

/** Pincel de grosor fijo: un cuadrado de t x t que se estampa a lo largo de la línea. Nunca se rotan imágenes. */
function stroke(part: Part, a: [number, number], b: [number, number], t: number, matAt: (s: number) => MatName) {
  const x0 = Math.round(a[0]), y0 = Math.round(a[1]), x1 = Math.round(b[0]), y1 = Math.round(b[1]);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  const n = Math.max(dx, -dy);
  let err = dx + dy, x = x0, y = y0, i = 0;
  const off = Math.floor((t - 1) / 2);
  for (;;) {
    const mat = matAt(n ? i / n : 0);
    for (let yy = 0; yy < t; yy++) for (let xx = 0; xx < t; xx++) part.set(x - off + xx, y - off + yy, mat);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
    i++;
  }
}

function blob(part: Part, c: [number, number], size: number, mat: MatName) {
  const r = (size - 1) / 2;
  const ox = Math.round(c[0] - r), oy = Math.round(c[1] - r);
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++) {
      const dx = i - r, dy = j - r;
      if (dx * dx + dy * dy <= r * r + 0.5) part.set(ox + i, oy + j, mat);
    }
}

export interface RenderOptions {
  /** dibujar sin contorno (para depurar) */
  noOutline?: boolean;
}

export function renderPose(f: Ficha, cell: CellSize, pose: Pose, opt: RenderOptions = {}): Raster {
  const d = dimsFor(cell, f.body.proportions);
  const head = f.heads[`${cell}`];
  if (!head) throw new Error(`La ficha no tiene cabeza para ${cell}px`);
  const C = cell * 4;
  const canvas = new LayerCanvas(C, C, C / 2, C / 2);
  const ramps: Record<MatName, Ramp> = {
    skin: f.palette.skin, hair: f.palette.hair, top: f.palette.top, bottom: f.palette.bottom,
    socks: f.palette.socks, shoes: f.palette.shoes, accessory: f.palette.accessory, face: f.palette.skin,
  };
  const paint = (mat: MatName, slot: number): Paint => ({
    color: packHex(ramps[mat][slot]),
    dark: packHex(ramps[mat][OUTLINE]),
    mat: MAT_ID[mat],
  });
  const commit = (part: Part, layer: number, far = false, extra?: (x: number, y: number, p: Px) => number) => {
    for (const [x, y, p] of part.entries()) {
      let slot = p.slot;
      if (extra) slot = extra(x, y, p);
      // borde de atrás (izquierda) en sombra: da volumen sin línea negra
      if (!part.has(x - 1, y) && slot >= BASE) slot = SHADOW;
      if (far) slot = Math.max(SHADOW, Math.min(slot, BASE) - 1);
      canvas.put(x, y, layer, paint(p.mat, slot));
    }
  };

  const tx0 = -Math.floor(d.torsoW / 2), tx1 = tx0 + d.torsoW - 1;
  const leanAt = (y: number) => Math.round((pose.lean * -y) / d.torsoH);
  const shoulderY = -d.torsoH + Math.max(1, Math.round(d.u * 1.5));
  const nearHipX = Math.floor(d.hipSpread / 2), farHipX = nearHipX - d.hipSpread;
  const hipY = -1;

  // brazos
  const drawArm = (far: boolean) => {
    const a = far ? pose.arms.far : pose.arms.near;
    // el brazo cuelga al costado del torso (solapa un pixel), no encima
    const sx = (far ? tx0 - 1 : tx1 + 1) + leanAt(shoulderY);
    const s: [number, number] = [sx, shoulderY];
    const { elbow, hand } = armPoints(d.armUpper, d.armLower, a);
    const e: [number, number] = [s[0] + elbow[0], s[1] + elbow[1]];
    const h: [number, number] = [s[0] + hand[0], s[1] + hand[1]];
    const part = new Part();
    const sleeve = f.outfit.sleeves;
    stroke(part, s, e, d.armT, (t) => (sleeve === 'long' || (sleeve === 'short' && t < 0.6) ? 'top' : 'skin'));
    stroke(part, e, h, d.armT, () => (sleeve === 'long' ? 'top' : 'skin'));
    blob(part, h, d.hand, 'skin');
    commit(part, far ? Layer.FarArm : Layer.NearArm, far);
  };

  // piernas
  const drawLeg = (far: boolean) => {
    const hx = far ? farHipX : nearHipX;
    const foot = far ? pose.legs.far : pose.legs.near;
    const { knee, ankle } = solveLeg(d.legUpper, d.legLower, foot);
    const hp: [number, number] = [hx, hipY];
    const k: [number, number] = [hx + knee[0], hipY + knee[1]];
    const an: [number, number] = [Math.round(hx + ankle[0]), Math.round(hipY + ankle[1])];
    const part = new Part();
    const bottom = f.outfit.bottom, socks = f.outfit.socks;
    stroke(part, hp, k, d.legT, () => (bottom === 'skirt' ? 'skin' : 'bottom'));
    const socksFrom = socks === 'knee' ? 0.2 : socks === 'low' ? 0.8 : 2;
    stroke(part, k, an, d.legT, (t) => (bottom === 'pants' ? 'bottom' : bottom === 'shorts' && t < 0.2 ? 'bottom' : t >= socksFrom ? 'socks' : 'skin'));
    // zapato: punta hacia adelante, esquina de arriba redondeada
    const off = Math.floor((d.legT - 1) / 2);
    const fx0 = an[0] - off;
    const fyBottom = an[1] + (d.legT - 1 - off);
    for (let r = 0; r < d.footH; r++) {
      const y = fyBottom - r;
      const len = r === d.footH - 1 && d.footH > 1 ? d.footLen - 1 : d.footLen;
      for (let x = fx0; x < fx0 + len; x++) {
        const slot = d.footH >= 3 && r === 0 ? SHADOW : r === d.footH - 1 && x === fx0 + len - 1 ? LIGHT : BASE;
        part.set(x, y, 'shoes', slot);
      }
    }
    // tapa la pierna dentro del zapato con el ancho del pie
    commit(part, far ? Layer.FarLeg : Layer.NearLeg, far);
  };

  drawArm(true);
  drawLeg(true);
  drawLeg(false);

  if (f.outfit.bottom === 'skirt') {
    const part = new Part();
    const len = Math.max(2, Math.round(d.legUpper * 0.9));
    for (let y = -d.pantsRows; y <= len; y++) {
      const grow = y > 0 ? Math.min(2, Math.ceil((y / len) * 2)) : 0;
      for (let x = tx0 - grow; x <= tx1 + grow; x++) part.set(x, y, 'bottom', y === len ? SHADOW : BASE);
    }
    commit(part, Layer.Skirt);
  }

  // torso
  {
    const part = new Part();
    for (let y = -d.torsoH; y <= -1; y++) {
      const sh = leanAt(y);
      const isPants = y >= -d.pantsRows;
      for (let x = tx0; x <= tx1; x++) {
        // esquinas de los hombros redondeadas
        if (y === -d.torsoH && (x === tx0 || x === tx1)) continue;
        const slot = !isPants && y === -d.torsoH ? LIGHT : BASE;
        part.set(x + sh, y, isPants ? 'bottom' : 'top', slot);
      }
    }
    commit(part, Layer.Torso);
  }

  // cabeza (de la ficha) + sellos de la cara
  drawHead(canvas, f, head, d, pose, -d.torsoH, paint);

  drawArm(false);

  if (!opt.noOutline)
    finalizeOutlines(canvas, {
      fused: [[Layer.FarLeg, Layer.Torso], [Layer.NearLeg, Layer.Torso], [Layer.Skirt, Layer.Torso]],
    });

  const bb = canvas.bbox();
  const dy = bb ? d.groundY - Math.round(pose.air) - bb.y1 : 0;
  return toRaster(canvas, 0, 0, cell, cell, d.pivot[0] - canvas.ox, dy);
}

function drawHead(
  canvas: LayerCanvas,
  f: Ficha,
  hb: HeadBitmap,
  d: Dims,
  pose: Pose,
  neckY: number,
  paint: (m: MatName, s: number) => Paint,
) {
  const forward = Math.max(1, Math.round(d.u * 1.2));
  const ox = forward - hb.anchor.x + Math.round(pose.head.dx);
  const oy = neckY - hb.anchor.y + Math.round(pose.head.dy);
  const zoneMat: Record<string, MatName> = { hair: 'hair', skin: 'skin', accessory: 'accessory' };
  const occupied = new Set<number>();
  for (let y = 0; y < hb.h; y++)
    for (let x = 0; x < hb.w; x++) {
      const ch = hb.rows[y][x];
      if (ch === '.') continue;
      const e = hb.palette[PIXEL_CHARS.indexOf(ch)];
      if (!e) continue;
      const mat = zoneMat[e.zone];
      const p = paint(mat, BASE);
      // el pelo largo debajo de la barbilla cuelga detrás del cuerpo
      const layer = e.zone === 'hair' && y > hb.anchor.y ? Layer.HairBack : Layer.Head;
      canvas.put(ox + x, oy + y, layer, { color: packHex(e.hex), dark: p.dark, mat: p.mat });
      occupied.add(y * 1000 + x);
    }
  // sellos
  const cell = d.cell;
  const eyeHex = f.palette.eyes;
  const eyeLab = hexToLab(eyeHex);
  const darkEye = labToHex([Math.min(0.24, eyeLab[0] * 0.45), eyeLab[1] * 0.5, eyeLab[2] * 0.5]);
  const iris = labToHex([Math.min(0.5, Math.max(0.3, eyeLab[0])), eyeLab[1], eyeLab[2]]);
  const skinLab = hexToLab(f.palette.skin[BASE]);
  const blushLab = hexToLab('#ff5a78');
  const blush = labToHex([skinLab[0] * 0.7 + blushLab[0] * 0.3 - 0.03, skinLab[1] * 0.5 + blushLab[1] * 0.5, skinLab[2] * 0.6 + blushLab[2] * 0.4]);
  const colors: Record<string, string> = {
    o: darkEye, i: iris, w: '#ffffff', m: f.palette.skin[OUTLINE], r: '#b8323f', b: blush, h: f.palette.hair[OUTLINE],
  };
  const faceShift = cell >= 48 ? 1 : 0;
  const skinDark = paint('skin', OUTLINE).dark;
  const put = (s: Stamp, x0: number, y0: number) => {
    s.forEach((row, j) =>
      [...row].forEach((ch, i) => {
        if (ch === '.' || !colors[ch]) return;
        const bx = x0 + i, by = y0 + j;
        if (!occupied.has(by * 1000 + bx) || by > hb.anchor.y) return;
        canvas.put(ox + bx, oy + by, Layer.Head, { color: packHex(colors[ch]), dark: skinDark, mat: MAT_ID.face });
      }),
    );
  };
  const eyeStamp = pose.face.eyes === 'closed' ? EYES[cell].closed : EYES[cell][f.face.eyes];
  const ew = eyeStamp[0].length;
  const [l, r] = hb.eyes;
  const eyeY = Math.round((l.y + r.y) / 2);
  const lx = l.x - Math.floor((ew - 1) / 2) + faceShift;
  const rx = r.x - Math.ceil((ew - 1) / 2) + faceShift;
  const ey0 = eyeY - Math.floor((eyeStamp.length - 1) / 2);
  if (f.face.brows) {
    const b = BROW[cell];
    put(b, lx, ey0 - 2);
    put(b, rx + ew - b[0].length, ey0 - 2);
  }
  if (f.face.blush) {
    const b = BLUSH[cell];
    put(b, lx - Math.max(0, b[0].length - ew) - (cell >= 48 ? 1 : 0), ey0 + eyeStamp.length);
    put(b, rx + (cell >= 48 ? 1 : 0), ey0 + eyeStamp.length);
  }
  put(eyeStamp, lx, ey0);
  put(eyeStamp, rx, ey0);
  if (f.face.glasses) {
    // marco de 1 px alrededor de cada ojo y un puente entre ambos
    colors.g = f.face.glasses;
    const eh = EYES[cell][f.face.eyes].length;
    const pad = cell >= 64 ? 1 : 0;
    const frame = (x0: number) => {
      const fw = ew + 2 + pad * 2, fh = eh + 2;
      const rows: string[] = [];
      for (let j = 0; j < fh; j++) {
        let r = '';
        for (let i = 0; i < fw; i++) r += j === 0 || j === fh - 1 || i === 0 || i === fw - 1 ? 'g' : '.';
        rows.push(r);
      }
      put(rows, x0 - 1 - pad, ey0 - 1);
    };
    frame(lx);
    frame(rx);
    const bx0 = lx + ew + pad, bx1 = rx - 1 - pad;
    if (bx1 >= bx0) put(['g'.repeat(bx1 - bx0 + 1)], bx0, ey0);
  }
  const mouth = MOUTHS[cell][pose.face.mouth ?? f.face.mouth];
  const mcx = (lx + rx + ew - 1) / 2;
  const my = ey0 + eyeStamp.length + Math.max(1, Math.round(d.u * 2));
  const [mx0] = stampOrigin(mcx, my, mouth);
  put(mouth, mx0, my);
}
