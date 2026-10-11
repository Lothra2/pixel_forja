import { labToLch, lchToLab, labToHex, hexToLab } from '../color/oklab';

/**
 * Rampa larga para jefes: n tonos (5 a 7) de oscuro a claro alrededor de un color base, que queda en el medio.
 * El tono cambia de verdad, no solo el brillo: las sombras giran hacia azul violeta y las luces hacia amarillo
 * cálido. Nunca se oscurece agregando negro ni gris: el croma se mantiene en las sombras.
 */
const COOL = (285 * Math.PI) / 180;
const WARM = (85 * Math.PI) / 180;

function toward(h: number, target: number, rad: number, chroma: number): number {
  if (chroma < 0.015) return h;
  let d = target - h;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return h + Math.sign(d) * Math.min(Math.abs(d), rad);
}

export function makeBossRamp(baseHex: string, n = 6, opts: { spread?: number; hue?: number; lightUp?: number } = {}): string[] {
  const [L, C, h] = labToLch(hexToLab(baseHex));
  const spread = opts.spread ?? 1;
  const hueDeg = opts.hue ?? 22;
  // el base va en el tono de arriba del medio (la mayor parte del cuerpo está iluminada)
  const mid = Math.floor((n - 1) * 0.55);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i - mid) / Math.max(1, mid); // -1 en el más oscuro, 0 en la base
    const up = (i - mid) / Math.max(1, n - 1 - mid); // 0 en la base, 1 en el más claro
    let nl: number, nc: number, nh: number;
    if (i <= mid) {
      nl = L + t * 0.27 * spread * (L > 0.8 ? 1.2 : 1);
      nc = C * (1 + 0.12 * -t);
      nh = toward(h, COOL, ((hueDeg * -t) * Math.PI) / 180, C);
    } else {
      nl = L + up * (opts.lightUp ?? 0.14) * spread * (L < 0.35 ? 1.4 : 1);
      nc = C * (1 - 0.18 * up);
      nh = toward(h, WARM, ((hueDeg * 0.7 * up) * Math.PI) / 180, C);
    }
    out.push(labToHex(lchToLab([Math.max(0.06, Math.min(0.97, nl)), nc, nh])));
  }
  return out;
}
