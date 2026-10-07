import { hexToLab, labToHex } from '../color/oklab';
import { makeRamp, BASE } from '../color/ramp';
import type { Ficha } from './ficha';

export type ColorSlot = 'skin' | 'hair' | 'eyes' | 'top' | 'bottom' | 'socks' | 'shoes' | 'accessory';

/**
 * Cambia el color de una zona sin volver a leer la imagen.
 * La cabeza se ajusta también: la piel toma la nueva rampa y el pelo se corre en OKLab
 * (mantiene sus luces y sombras propias).
 */
export function recolor(f: Ficha, slot: ColorSlot, hex: string): Ficha {
  const out: Ficha = structuredClone(f);
  if (slot === 'eyes') {
    out.palette.eyes = hex;
    return out;
  }
  const old = f.palette[slot];
  const ramp = makeRamp(hex);
  out.palette[slot] = ramp;
  if (slot === 'skin' || slot === 'hair' || slot === 'accessory') {
    const o = hexToLab(old[BASE]), n = hexToLab(ramp[BASE]);
    const d = [n[0] - o[0], n[1] - o[1], n[2] - o[2]];
    for (const hb of Object.values(out.heads)) {
      if (!hb) continue;
      for (const e of hb.palette) {
        if (e.zone !== slot) continue;
        if (slot === 'skin') e.hex = ramp[Math.max(0, Math.min(3, e.tone))];
        else {
          const l = hexToLab(e.hex);
          e.hex = labToHex([l[0] + d[0], l[1] + d[1], l[2] + d[2]]);
        }
      }
    }
  }
  return out;
}
