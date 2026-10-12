import { type HumanFicha, type HeadBitmap, type HeadSet, PIXEL_CHARS } from '../sheet/ficha';
import { OUTLINE, BASE } from '../color/ramp';
import { hexToLab, labToHex } from '../color/oklab';
import { stampClass } from '../rig/dims';
import { EYES, MOUTHS, BLUSH, BROW, BROW_THICK, BROW_ANGRY, BROW_SAD, stampOrigin, mirrorStamp, type Stamp, type EyeExpr, type MouthExpr } from '../head/stamps';
import type { IndexImage } from './rotsprite';

export type View = 'side' | 'front' | 'back';

export interface HeadPal {
  hex: string;
  /** material para el contorno (hair, skin, accessory, face) */
  mat: 'hair' | 'skin' | 'accessory' | 'face' | 'beard';
  /** pelo largo que cuelga detrás del cuerpo */
  back: boolean;
}

export interface HeadImage {
  img: IndexImage;
  pal: HeadPal[];
  anchor: { x: number; y: number };
}

/** Espalda derivada de la cabeza de frente: todo pelo, con la nuca en piel abajo. */
export function deriveBack(front: HeadBitmap): HeadBitmap {
  const hairEntries = front.palette.map((p, i) => ({ p, i })).filter((e) => e.p.zone === 'hair');
  const hairMid = hairEntries.length
    ? hairEntries.sort((a, b) => hexToLab(a.p.hex)[0] - hexToLab(b.p.hex)[0])[Math.floor((hairEntries.length - 1) / 2)].i
    : -1;
  // con pelo largo la nuca queda tapada
  const longHair = front.rows.some((r, y) => y > front.anchor.y && [...r].some((ch) => ch !== '.' && front.palette[PIXEL_CHARS.indexOf(ch)]?.zone === 'hair'));
  const rows = front.rows.map((r, y) =>
    [...r]
      .map((ch) => {
        if (ch === '.') return ch;
        const e = front.palette[PIXEL_CHARS.indexOf(ch)];
        if (e.zone !== 'skin') return ch;
        if ((!longHair && y >= front.anchor.y - 1) || hairMid < 0) return ch; // nuca
        return PIXEL_CHARS[hairMid];
      })
      .join(''),
  );
  return { ...front, rows };
}

export function pickHead(set: HeadSet, view: View): { hb: HeadBitmap; fromImage: boolean } {
  if (view === 'back') return set.back ? { hb: set.back, fromImage: true } : { hb: deriveBack(set.front), fromImage: false };
  if (view === 'side') return set.side ? { hb: set.side, fromImage: true } : { hb: set.front, fromImage: false };
  return { hb: set.front, fromImage: true };
}

/**
 * Arma la cabeza de un cuadro como imagen de índices: pixeles de la ficha + sellos de la cara.
 * Los sellos se ponen aquí (no en la ficha) para poder parpadear y cambiar de expresión.
 */
export function buildHeadImage(f: HumanFicha, set: HeadSet, view: View, eyes: EyeExpr, mouth: MouthExpr | undefined): HeadImage {
  const { hb, fromImage } = pickHead(set, view);
  const pal: HeadPal[] = [];
  const palIndex = new Map<string, number>();
  const entry = (hex: string, mat: HeadPal['mat'], back = false) => {
    const k = `${hex}|${mat}|${back}`;
    let i = palIndex.get(k);
    if (i === undefined) { i = pal.length; pal.push({ hex, mat, back }); palIndex.set(k, i); }
    return i;
  };
  const idx = new Int16Array(hb.w * hb.h).fill(-1);
  for (let y = 0; y < hb.h; y++)
    for (let x = 0; x < hb.w; x++) {
      const ch = hb.rows[y][x];
      if (ch === '.') continue;
      const e = hb.palette[PIXEL_CHARS.indexOf(ch)];
      if (!e) continue;
      // de espalda no hay pelo "atrás": todo lo de la cabeza va delante del cuerpo
      const back = e.zone === 'hair' && y > hb.anchor.y && view !== 'back';
      idx[y * hb.w + x] = entry(e.hex, e.zone, back);
    }
  if (view !== 'back') stampFace(f, hb, view, fromImage, idx, entry, eyes, mouth ?? f.face.mouth);
  return { img: { w: hb.w, h: hb.h, idx }, pal, anchor: { ...hb.anchor } };
}

function stampFace(
  f: HumanFicha,
  hb: HeadBitmap,
  view: View,
  fromImage: boolean,
  idx: Int16Array,
  entry: (hex: string, mat: HeadPal['mat']) => number,
  eyesExpr: EyeExpr,
  mouthExpr: MouthExpr,
) {
  const cls = stampClass(hb.w);
  const eyeLab = hexToLab(f.palette.eyes);
  const darkEye = labToHex([Math.min(0.24, eyeLab[0] * 0.45), eyeLab[1] * 0.5, eyeLab[2] * 0.5]);
  const iris = labToHex([Math.min(0.5, Math.max(0.3, eyeLab[0])), eyeLab[1], eyeLab[2]]);
  const skinLab = hexToLab(f.palette.skin[BASE]);
  const blushLab = hexToLab('#ff5a78');
  const blush = labToHex([skinLab[0] * 0.7 + blushLab[0] * 0.3 - 0.03, skinLab[1] * 0.5 + blushLab[1] * 0.5, skinLab[2] * 0.6 + blushLab[2] * 0.4]);
  // con barba la línea de la boca se pierde: se dibuja color labio
  const bearded = hb.palette.some((e) => e.zone === 'beard');
  const colors: Record<string, string> = {
    o: darkEye, i: iris, w: '#ffffff', m: bearded ? '#7a3b3b' : f.palette.skin[OUTLINE], r: '#b8323f', t: '#ee7a8a', b: blush, h: f.palette.hair[OUTLINE],
    g: f.face.glasses || '#1d3c78',
  };
  const shift = view === 'side' && !fromImage ? (cls >= 48 ? 1 : 0) : 0;
  const put = (s: Stamp, x0: number, y0: number) =>
    s.forEach((row, j) =>
      [...row].forEach((ch, i) => {
        if (ch === '.' || !colors[ch]) return;
        const x = x0 + i, y = y0 + j;
        if (x < 0 || y < 0 || x >= hb.w || y > hb.anchor.y || idx[y * hb.w + x] < 0) return;
        idx[y * hb.w + x] = entry(colors[ch], ch === 'g' ? 'accessory' : 'face');
      }),
    );
  const set = EYES[cls];
  const eyeStamp = eyesExpr === 'open' ? set[f.face.eyes] : set[eyesExpr];
  const ew = eyeStamp[0].length, eh = eyeStamp.length;
  const [l, r] = hb.eyes;
  const single = Math.abs(l.x - r.x) < 1;
  const eyeY = Math.round((l.y + r.y) / 2);
  const lx = l.x - Math.floor((ew - 1) / 2) + shift;
  const rx = r.x - Math.ceil((ew - 1) / 2) + shift;
  const ey0 = eyeY - Math.floor((eh - 1) / 2);
  if (f.face.brows || eyesExpr === 'angry' || eyesExpr === 'sad' || eyesExpr === 'wink') {
    const b = eyesExpr === 'angry' || eyesExpr === 'wink' ? BROW_ANGRY[cls] : eyesExpr === 'sad' ? BROW_SAD[cls] : f.face.thickBrows ? BROW_THICK[cls] : BROW[cls];
    const by = ey0 - 1 - b.length;
    put(b, lx, by);
    if (!single) put(mirrorStamp(b), rx + ew - b[0].length, by);
  }
  if (f.face.blush) {
    const b = BLUSH[cls];
    const pad = cls >= 48 ? 1 : 0;
    put(b, lx - Math.max(0, b[0].length - ew) - pad, ey0 + eh);
    if (!single) put(b, rx + pad, ey0 + eh);
  }
  put(eyeStamp, lx, ey0);
  // el guiño: el ojo de la derecha cerrado
  if (!single) put(eyesExpr === 'hurt' ? mirrorStamp(eyeStamp) : eyesExpr === 'wink' ? set.closed : eyeStamp, rx, ey0);
  if (f.face.glasses) {
    const pad = cls >= 64 ? 1 : 0;
    const frame = (x0: number) => {
      const fw = ew + 2 + pad * 2, fh = eh + 2;
      const rows: string[] = [];
      for (let j = 0; j < fh; j++) {
        let s = '';
        for (let i = 0; i < fw; i++) s += j === 0 || j === fh - 1 || i === 0 || i === fw - 1 ? 'g' : '.';
        rows.push(s);
      }
      put(rows, x0 - 1 - pad, ey0 - 1);
    };
    frame(lx);
    if (!single) {
      frame(rx);
      const bx0 = lx + ew + pad, bx1 = rx - 1 - pad;
      if (bx1 >= bx0) put(['g'.repeat(bx1 - bx0 + 1)], bx0, ey0);
    }
  }
  const mouth = MOUTHS[cls][mouthExpr];
  const mcx = single ? lx + (ew - 1) / 2 + (cls >= 48 ? 1 : 0) : (lx + rx + ew - 1) / 2;
  const my = ey0 + eh + Math.max(1, Math.round(hb.w / 10));
  const [mx0] = stampOrigin(mcx, my, mouth);
  put(mouth, mx0, my);
}
