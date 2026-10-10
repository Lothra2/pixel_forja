import type { Raster } from '../core/raster';
import { analyzeImage } from '../sheet/build';
import { measureHead } from './measure';
import { fitAvatar, type Avatar } from './avatar';

/**
 * Colores desde una foto. Las formas de una foto (pelo, barba, cara) no se detectan de forma confiable sin IA,
 * pero los colores sí: piel, pelo, ojos y barba. Se aplican al avatar que ya tiene la persona,
 * sin tocar el peinado ni las piezas que eligió (salvo poner barba si la foto la muestra y no tenía).
 */
export interface PhotoColors {
  skin: string;
  hair: string;
  eyes: string;
  beard: { color: string; lpc: string | null } | null;
}

export function colorsFromPhoto(img: Raster): PhotoColors {
  const a = analyzeImage(img, { mode: 'bust' });
  const fitted = fitAvatar(measureHead({ work: a.work, zone: a.zone, mask: a.mask, head: a.zones.head }));
  const beard = fitted.beard.style !== 'ninguna' ? { color: fitted.beard.color, lpc: fitted.lpc?.beard ?? null } : null;
  return { skin: fitted.skin, hair: fitted.hair.color, eyes: fitted.eyes.color, beard };
}

export function applyPhotoColors(av: Avatar, c: PhotoColors): Avatar {
  const out: Avatar = { ...av, skin: c.skin, hair: { ...av.hair, color: c.hair }, eyes: { ...av.eyes, color: c.eyes } };
  if (c.beard) {
    out.beard = { ...av.beard, color: c.beard.color, style: av.beard.style === 'ninguna' ? 'corta' : av.beard.style };
    if (out.lpc && !out.lpc.beard) out.lpc = { ...out.lpc, beard: c.beard.lpc ?? 'trimmed' };
  }
  return out;
}
