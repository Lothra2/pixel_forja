/**
 * Hojas livianas para los efectos de pixelfx: PNG con paleta de hasta 256 colores con alfa (corte por la mediana en
 * espacio premultiplicado, sin trama: es pixel art). Una hoja de luz suave tiene miles de colores; con 255 bien
 * elegidos no se nota el escalón y pesa un tercio.
 */
import { encode } from 'fast-png';
import type { Raster } from '../core/raster';

interface Caja { idx: number[]; }

/** Cuantiza a lo sumo `n` colores (más el transparente). Devuelve índices y paleta RGBA. */
export function cuantizar(img: Raster, n = 255): { idx: Uint8Array; paleta: number[][] } {
  const d = img.data, total = img.w * img.h;
  // colores únicos con su cuenta
  const mapa = new Map<number, number>();
  const claves: number[] = [], cuentas: number[] = [];
  const llave = new Uint32Array(total);
  for (let i = 0; i < total; i++) {
    const a = d[i * 4 + 3];
    if (!a) { llave[i] = 0xffffffff; continue; }
    const k = ((d[i * 4] << 24) | (d[i * 4 + 1] << 16) | (d[i * 4 + 2] << 8) | a) >>> 0;
    llave[i] = k;
    let j = mapa.get(k);
    if (j === undefined) { j = claves.length; mapa.set(k, j); claves.push(k); cuentas.push(0); }
    cuentas[j]++;
  }
  const U = claves.length;
  // espacio premultiplicado (lo casi transparente pesa poco en el color) con el alfa al doble
  const P = new Float32Array(U * 4);
  for (let j = 0; j < U; j++) {
    const k = claves[j], a = (k & 255) / 255;
    P[j * 4] = (k >>> 24) * a; P[j * 4 + 1] = ((k >>> 16) & 255) * a; P[j * 4 + 2] = ((k >>> 8) & 255) * a; P[j * 4 + 3] = (k & 255) * 2;
  }
  let cajas: Caja[];
  if (U <= n) cajas = claves.map((_, j) => ({ idx: [j] }));
  else {
    cajas = [{ idx: Array.from({ length: U }, (_, j) => j) }];
    while (cajas.length < n) {
      // la caja con más error (rango × cuenta) se parte por la mediana de su canal más largo
      let mejor = -1, mejorV = 0, canal = 0;
      cajas.forEach((c, ci) => {
        if (c.idx.length < 2) return;
        let peso = 0;
        const lo = [Infinity, Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity, -Infinity];
        for (const j of c.idx) { peso += cuentas[j]; for (let q = 0; q < 4; q++) { const v = P[j * 4 + q]; if (v < lo[q]) lo[q] = v; if (v > hi[q]) hi[q] = v; } }
        let ch = 0;
        for (let q = 1; q < 4; q++) if (hi[q] - lo[q] > hi[ch] - lo[ch]) ch = q;
        const v = (hi[ch] - lo[ch]) * Math.sqrt(peso);
        if (v > mejorV) { mejorV = v; mejor = ci; canal = ch; }
      });
      if (mejor < 0) break;
      const c = cajas[mejor];
      c.idx.sort((a, b) => P[a * 4 + canal] - P[b * 4 + canal]);
      // mediana por cuenta
      let tot = 0;
      for (const j of c.idx) tot += cuentas[j];
      let acc = 0, corte = 1;
      for (let i = 0; i < c.idx.length - 1; i++) { acc += cuentas[c.idx[i]]; if (acc >= tot / 2) { corte = i + 1; break; } }
      cajas.splice(mejor, 1, { idx: c.idx.slice(0, corte) }, { idx: c.idx.slice(corte) });
    }
  }
  // paleta: promedio pesado de cada caja, vuelto a alfa directa
  const paleta: number[][] = [[0, 0, 0, 0]];
  const asig = new Uint8Array(U);
  cajas.forEach((c, ci) => {
    let w = 0, r = 0, g = 0, b = 0, a = 0;
    for (const j of c.idx) { const k = cuentas[j]; w += k; r += P[j * 4] * k; g += P[j * 4 + 1] * k; b += P[j * 4 + 2] * k; a += P[j * 4 + 3] * k; }
    const A = a / w / 2, af = Math.max(A / 255, 1e-6);
    paleta.push([Math.min(255, Math.round(r / w / af)), Math.min(255, Math.round(g / w / af)), Math.min(255, Math.round(b / w / af)), Math.max(1, Math.round(A))]);
    for (const j of c.idx) asig[j] = ci + 1;
  });
  const idx = new Uint8Array(total);
  for (let i = 0; i < total; i++) if (llave[i] !== 0xffffffff) idx[i] = asig[mapa.get(llave[i])!];
  return { idx, paleta };
}

/** PNG con paleta (cuantizado si hace falta). */
export function pngLiviano(img: Raster): Uint8Array {
  const { idx, paleta } = cuantizar(img);
  return encode({ width: img.w, height: img.h, data: idx, channels: 1, depth: 8, palette: paleta });
}
