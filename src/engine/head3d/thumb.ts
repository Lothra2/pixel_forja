import { createRaster, type Raster } from '../core/raster';
import { hexToRgb } from '../color/oklab';
import { makeRamp, OUTLINE } from '../color/ramp';
import { renderHeadModel, HEAD_STYLES, type ModelHeadImage } from './render';
import { lpcHead, LPC_HEADS, LPC_HAIRS, LPC_BROWS, LPC_NOSES, LPC_BEARDS, LPC_MUSTACHES, LPC_GLASSES, LPC_HATS, LPC_MONSTERS, LPC_EARS, LPC_HORNS, DEFAULT_LPC, isMonsterHead, lpcSkinOf, type LpcLook } from '../parts/lpc';
import { GORROS_PROPIOS } from '../parts/sombreros';
import {
  modelFromAvatar, withHairStyle, HAIR_STYLE_IDS, EYE_STYLE_IDS, BROW_STYLE_IDS, BEARD_STYLE_IDS, GLASSES_STYLE_IDS, NOSE_IDS, LOOK_IDS,
  GLASSES_SWATCHES, type Avatar,
} from './avatar';

/** Cabeza sola con su contorno, para las miniaturas del creador de avatar. */
export function headThumb(a: Avatar, yaw = 30, width = 20): Raster {
  const style = HEAD_STYLES[a.look] ?? HEAD_STYLES.stardew;
  const h: ModelHeadImage = a.kit === 'lpc' && a.lpc
    ? lpcHead(a.lpc, yaw > 50 ? 'side' : 'front', { skin: a.skin, hair: a.hair.color, eyes: a.eyes.color, beard: a.beard.color, glasses: a.glasses.color })
    : renderHeadModel(modelFromAvatar(a), { width, yaw, style, skin: a.skin, hair: a.hair.color });
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

export type AvatarPart = 'look' | 'hair' | 'eyes' | 'brows' | 'nose' | 'beard' | 'glasses'
  | 'lpcHead' | 'lpcHair' | 'lpcBrows' | 'lpcNose' | 'lpcBeard' | 'lpcMustache' | 'lpcGlasses' | 'lpcHat'
  | 'lpcMonster' | 'lpcEars' | 'lpcHorns';

const LPC_FIELD: Record<string, keyof LpcLook> = {
  lpcHead: 'head', lpcHair: 'hair', lpcBrows: 'brows', lpcNose: 'nose', lpcBeard: 'beard', lpcMustache: 'mustache', lpcGlasses: 'glasses', lpcHat: 'hat',
  lpcMonster: 'head', lpcEars: 'ears', lpcHorns: 'horns',
};
const LPC_LIST: Record<string, (string | null)[]> = {
  lpcHead: LPC_HEADS, lpcHair: LPC_HAIRS, lpcBrows: [...LPC_BROWS, null], lpcNose: [null, ...LPC_NOSES], lpcBeard: [null, ...LPC_BEARDS], lpcMustache: [null, ...LPC_MUSTACHES], lpcGlasses: [null, ...LPC_GLASSES], lpcHat: [null, ...LPC_HATS, ...GORROS_PROPIOS],
  lpcMonster: LPC_MONSTERS, lpcEars: [null, ...LPC_EARS], lpcHorns: [null, ...LPC_HORNS],
};
/** piel humana por defecto al volver de una cabeza de monstruo */
const HUMAN_SKIN = '#e0ac8a';

/** Valor actual de una pieza LPC ('none' si no lleva). */
export function lpcValue(a: Avatar, part: AvatarPart): string {
  return (a.lpc ?? DEFAULT_LPC)[LPC_FIELD[part]] ?? 'none';
}
/** Aplica una pieza LPC al avatar. */
export function withLpc(a: Avatar, part: AvatarPart, id: string): Avatar {
  const out: Avatar = { ...a, kit: 'lpc', lpc: { ...(a.lpc ?? DEFAULT_LPC), [LPC_FIELD[part]]: id === 'none' ? null : id } };
  // cabeza de monstruo: el cuerpo toma su color. De vuelta a una humana, piel humana
  if (part === 'lpcMonster' || part === 'lpcHead') {
    const was = isMonsterHead(a.lpc?.head ?? 'male');
    const m = lpcSkinOf(id);
    if (m) out.skin = m;
    else if (was) out.skin = HUMAN_SKIN;
  }
  return out;
}

/** Las opciones de una pieza aplicadas al avatar actual (así cada miniatura muestra TU cara con esa opción). */
export function avatarOptions(a: Avatar, part: AvatarPart): { id: string; avatar: Avatar; yaw: number }[] {
  if (part in LPC_FIELD) {
    const yaw = part === 'lpcNose' ? 90 : 0;
    return LPC_LIST[part].map((v) => { const id = v ?? 'none'; return { id, avatar: withLpc(a, part, id), yaw }; });
  }
  switch (part) {
    case 'look': return LOOK_IDS.map((id) => ({ id, avatar: { ...a, look: id }, yaw: 20 }));
    case 'hair': return HAIR_STYLE_IDS.map((id) => ({ id, avatar: withHairStyle(a, id), yaw: 35 }));
    case 'eyes': return EYE_STYLE_IDS.map((id) => ({ id, avatar: { ...a, eyes: { ...a.eyes, style: id } }, yaw: 0 }));
    case 'brows': return BROW_STYLE_IDS.map((id) => ({ id, avatar: { ...a, brows: { style: id } }, yaw: 0 }));
    case 'nose': return NOSE_IDS.map((id) => ({ id, avatar: { ...a, nose: id }, yaw: 70 }));
    case 'beard': return BEARD_STYLE_IDS.map((id) => ({ id, avatar: { ...a, beard: { ...a.beard, style: id } }, yaw: 20 }));
    default: return [];
    case 'glasses': return GLASSES_STYLE_IDS.map((id) => ({ id, avatar: { ...a, glasses: { style: id, color: a.glasses.style === 'ninguno' && id !== 'ninguno' ? (id === 'sol' ? GLASSES_SWATCHES[0] : a.glasses.color) : a.glasses.color } }, yaw: 0 }));
  }
}
