import { type Lab, labToLch, lchToLab, labToHex, hexToLab } from './oklab';

/**
 * Rampa de 4 tonos por zona: [contorno, sombra, base, luz].
 * Las sombras se enfrían (giran hacia azul violeta) y las luces se calientan (hacia amarillo),
 * como hace un pixel artist. Así una camisa roja no se vuelve marrón en la sombra.
 */
export type Ramp = [string, string, string, string];
export const OUTLINE = 0, SHADOW = 1, BASE = 2, LIGHT = 3;

const COOL = (275 * Math.PI) / 180;
const WARM = (95 * Math.PI) / 180;

function shiftHue(h: number, target: number, maxRad: number, chroma: number): number {
  if (chroma < 0.02) return h; // grises: sin giro de tono
  let d = target - h;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return h + Math.sign(d) * Math.min(Math.abs(d), maxRad);
}

function tone(base: Lab, dL: number, chromaK: number, hueTarget: number, hueDeg: number): string {
  const [L, C, h] = labToLch(base);
  const nh = shiftHue(h, hueTarget, (hueDeg * Math.PI) / 180, C);
  const nL = Math.max(0.08, Math.min(0.98, L + dL));
  return labToHex(lchToLab([nL, C * chromaK, nh]));
}

export function makeRamp(baseHex: string): Ramp {
  const base = hexToLab(baseHex);
  const L = base[0];
  // En colores muy claros (blanco) la sombra baja más para que se lea; en muy oscuros, la luz sube más.
  const shadowDL = L > 0.85 ? -0.14 : -0.11;
  const lightDL = L < 0.35 ? 0.12 : L > 0.9 ? 0.04 : 0.08;
  const outlineDL = -Math.max(0.24, Math.min(0.42, L * 0.5));
  return [
    tone(base, outlineDL, 0.85, COOL, 18),
    tone(base, shadowDL, 1.05, COOL, 12),
    labToHex(base),
    tone(base, lightDL, 0.9, WARM, 8),
  ];
}

/** Oscurece un color (para extremidades del lado lejano). */
export function darken(hex: string, dL = 0.07): string {
  const lab = hexToLab(hex);
  return tone(lab, -dL, 1, COOL, 6);
}
