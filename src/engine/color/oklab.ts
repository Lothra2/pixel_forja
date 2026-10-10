/** Conversión sRGB <-> OKLab / OKLCh. Todas las comparaciones de color del motor se hacen en OKLab. */
export type Lab = [number, number, number];
export type RGB = [number, number, number];

function toLinear(c: number): number {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function fromLinear(c: number): number {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(1, v)) * 255);
}

export function rgbToLab(r: number, g: number, b: number): Lab {
  const lr = toLinear(r), lg = toLinear(g), lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function labToLinear(L: number, a: number, b: number): RGB {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** OKLab a sRGB, reduciendo croma si se sale de la gama (así no hay colores "quemados"). */
export function labToRgb(L: number, a: number, b: number): RGB {
  let lin = labToLinear(L, a, b);
  let k = 1;
  for (let i = 0; i < 20 && lin.some((v) => v < -1e-4 || v > 1 + 1e-4); i++) {
    k *= 0.9;
    lin = labToLinear(L, a * k, b * k);
  }
  return [fromLinear(lin[0]), fromLinear(lin[1]), fromLinear(lin[2])];
}

export function labToLch([L, a, b]: Lab): Lab {
  return [L, Math.hypot(a, b), Math.atan2(b, a)];
}
export function lchToLab([L, C, h]: Lab): Lab {
  return [L, C * Math.cos(h), C * Math.sin(h)];
}

export function deltaE(p: Lab, q: Lab): number {
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
export function rgbToHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}
export function hexToLab(hex: string): Lab {
  const [r, g, b] = hexToRgb(hex);
  return rgbToLab(r, g, b);
}
export function labToHex(l: Lab): string {
  return rgbToHex(labToRgb(l[0], l[1], l[2]));
}
