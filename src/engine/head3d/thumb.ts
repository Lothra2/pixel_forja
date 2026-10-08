import { createRaster, type Raster } from '../core/raster';
import { hexToRgb } from '../color/oklab';
import { makeRamp, OUTLINE } from '../color/ramp';
import { renderHeadModel, HEAD_STYLES } from './render';
import {
  modelFromAvatar, withHairStyle, HAIR_STYLE_IDS, EYE_STYLE_IDS, BROW_STYLE_IDS, BEARD_STYLE_IDS, GLASSES_STYLE_IDS, NOSE_IDS, LOOK_IDS,
  GLASSES_SWATCHES, type Avatar,
} from './avatar';

/** Cabeza sola con su contorno, para las miniaturas del creador de avatar. */
export function headThumb(a: Avatar, yaw = 30, width = 20): Raster {
  const style = HEAD_STYLES[a.look] ?? HEAD_STYLES.stardew;
  const h = renderHeadModel(modelFromAvatar(a), { width, yaw, style, skin: a.skin, hair: a.hair.color });
  const { w, h: H, idx } = h.img;
  const out = createRaster(w + 2, H + 2);
  const fallback = style.outline === 'black' ? '#16121c' : makeRamp(a.skin)[OUTLINE];
  const set = (x: number, y: number, hex: string) => { const [R, G, B] = hexToRgb(hex); out.data.set([R, G, B, 255], (y * (w + 2) + x) * 4); };
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= H ? -1 : idx[y * w + x]);
  for (let y = -1; y <= H; y++)
    for (let x = -1; x <= w; x++) {
      const i = at(x, y);
      if (i >= 0) { set(x + 1, y + 1, h.pal[i].hex); continue; }
      const n = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].find((v) => v >= 0);
      if (n !== undefined && n >= 0) set(x + 1, y + 1, h.pal[n].dark ?? fallback);
    }
  return out;
}

export type AvatarPart = 'look' | 'hair' | 'eyes' | 'brows' | 'nose' | 'beard' | 'glasses';

/** Las opciones de una pieza aplicadas al avatar actual (así cada miniatura muestra TU cara con esa opción). */
export function avatarOptions(a: Avatar, part: AvatarPart): { id: string; avatar: Avatar; yaw: number }[] {
  switch (part) {
    case 'look': return LOOK_IDS.map((id) => ({ id, avatar: { ...a, look: id }, yaw: 20 }));
    case 'hair': return HAIR_STYLE_IDS.map((id) => ({ id, avatar: withHairStyle(a, id), yaw: 35 }));
    case 'eyes': return EYE_STYLE_IDS.map((id) => ({ id, avatar: { ...a, eyes: { ...a.eyes, style: id } }, yaw: 0 }));
    case 'brows': return BROW_STYLE_IDS.map((id) => ({ id, avatar: { ...a, brows: { style: id } }, yaw: 0 }));
    case 'nose': return NOSE_IDS.map((id) => ({ id, avatar: { ...a, nose: id }, yaw: 70 }));
    case 'beard': return BEARD_STYLE_IDS.map((id) => ({ id, avatar: { ...a, beard: { ...a.beard, style: id } }, yaw: 20 }));
    case 'glasses': return GLASSES_STYLE_IDS.map((id) => ({ id, avatar: { ...a, glasses: { style: id, color: a.glasses.style === 'ninguno' && id !== 'ninguno' ? (id === 'sol' ? GLASSES_SWATCHES[0] : a.glasses.color) : a.glasses.color } }, yaw: 0 }));
  }
}
