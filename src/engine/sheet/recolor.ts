import { hexToLab, labToHex } from '../color/oklab';
import { makeRamp, BASE } from '../color/ramp';
import { type Ficha, type HumanFicha, type AnimalFicha, isHuman } from './ficha';

export type ColorSlot = 'skin' | 'hair' | 'eyes' | 'top' | 'bottom' | 'socks' | 'shoes' | 'accessory';
export type AnimalColorSlot = 'fur' | 'fur2' | 'dark' | 'eyes' | 'collar';

/**
 * Cambia el color de una zona sin volver a leer la imagen.
 * La cabeza se ajusta también: la piel toma la nueva rampa y el pelo se corre en OKLab
 * (mantiene sus luces y sombras propias).
 */
export function recolor(f: Ficha, slot: ColorSlot | AnimalColorSlot, hex: string): Ficha {
  if (!isHuman(f)) return recolorAnimal(f, slot as AnimalColorSlot, hex);
  const out: HumanFicha = structuredClone(f);
  const s = slot as ColorSlot;
  if (s === 'eyes') {
    out.palette.eyes = hex;
    if (out.avatar) out.avatar.eyes.color = hex;
    return out;
  }
  if (out.avatar && s === 'skin') out.avatar.skin = hex;
  if (out.avatar && s === 'hair') out.avatar.hair.color = hex;
  const old = f.palette[s];
  const ramp = makeRamp(hex);
  out.palette[s] = ramp;
  if (s === 'skin' || s === 'hair' || s === 'accessory') {
    const o = hexToLab(old[BASE]), n = hexToLab(ramp[BASE]);
    const d = [n[0] - o[0], n[1] - o[1], n[2] - o[2]];
    for (const set of Object.values(out.heads)) {
      if (!set) continue;
      for (const hb of [set.front, set.side, set.back]) {
        if (!hb) continue;
        for (const e of hb.palette) {
          if (e.zone !== s) continue;
          if (s === 'skin') e.hex = ramp[Math.max(0, Math.min(3, e.tone))];
          else {
            const l = hexToLab(e.hex);
            e.hex = labToHex([l[0] + d[0], l[1] + d[1], l[2] + d[2]]);
          }
        }
      }
    }
  }
  return out;
}

function recolorAnimal(f: AnimalFicha, slot: AnimalColorSlot, hex: string): AnimalFicha {
  const out: AnimalFicha = structuredClone(f);
  if (slot === 'eyes') out.palette.eyes = hex;
  else out.palette[slot] = makeRamp(hex);
  return out;
}
