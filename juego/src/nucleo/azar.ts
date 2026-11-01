// Azar con semilla (mulberry32) y ayudas.
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const R = Math.random;
export const entre = (a: number, b: number, r = R) => a + (b - a) * r();
export const entero = (a: number, b: number, r = R) => Math.floor(a + (b - a + 1) * r());
export const elegir = <T>(xs: T[], r = R): T => xs[Math.floor(r() * xs.length)];
export function pesado<T extends { peso: number }>(xs: T[], r = R): T {
  let s = 0; for (const x of xs) s += x.peso;
  let k = r() * s;
  for (const x of xs) { k -= x.peso; if (k <= 0) return x; }
  return xs[xs.length - 1];
}
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const hashTxt = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
export const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);
