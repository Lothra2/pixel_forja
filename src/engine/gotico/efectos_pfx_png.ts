/**
 * Hojas livianas para los efectos de pixelfx: PNG con paleta de hasta 256 colores con alfa (corte por la mediana en
 * espacio premultiplicado, sin trama: es pixel art). Una hoja de luz suave tiene miles de colores; con 255 bien
 * elegidos no se nota el escalón y pesa un tercio.
 */
import { zlibSync } from 'fflate';
import type { Raster } from '../core/raster';

interface Caja { idx: number[]; }

/** Cuantiza a lo sumo `n` colores (más el transparente). Devuelve índices y paleta RGBA. */
export function cuantizar(img: Raster, n = 255, corteViejo = false): { idx: Uint8Array; paleta: number[][] } {
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
      // si el último color solo pesa más de la mitad, el corte va justo antes de él. El corte viejo quedaba en 1 y la
      // caja perdía un color por vuelta: un velo de un color muy repetido se comía la paleta (se sigue usando donde
      // el error queda bajo, porque comprime mejor: ver pngLiviano)
      let acc = 0, corte = corteViejo ? 1 : c.idx.length - 1;
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

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function trozo(tipo: string, datos: Uint8Array): Uint8Array {
  const o = new Uint8Array(12 + datos.length), v = new DataView(o.buffer);
  v.setUint32(0, datos.length);
  for (let i = 0; i < 4; i++) o[4 + i] = tipo.charCodeAt(i);
  o.set(datos, 8);
  let c = 0xffffffff;
  for (let i = 4; i < 8 + datos.length; i++) c = CRC[(c ^ o[i]) & 255] ^ (c >>> 8);
  v.setUint32(8 + datos.length, (c ^ 0xffffffff) >>> 0);
  return o;
}

/** Filas con filtro: 0 (ninguno) o 2 (arriba) en todas; se queda con el que comprime mejor. */
function idat(w: number, h: number, idx: Uint8Array): Uint8Array {
  let mejor: Uint8Array | null = null;
  for (const f of [0, 2]) {
    const raw = new Uint8Array((w + 1) * h);
    for (let y = 0; y < h; y++) {
      raw[y * (w + 1)] = f;
      for (let x = 0; x < w; x++) {
        const v = idx[y * w + x];
        raw[y * (w + 1) + 1 + x] = f === 2 && y ? (v - idx[(y - 1) * w + x]) & 255 : v;
      }
    }
    const z = zlibSync(raw, { level: 9, mem: 12 });
    if (!mejor || z.length < mejor.length) mejor = z;
  }
  return mejor!;
}

/** Error medio de color de una cuantización (0..255 por canal), pesado por el alfa: lo casi transparente casi no se ve. */
export function errorPaleta(img: Raster, q: { idx: Uint8Array; paleta: number[][] }): number {
  const d = img.data;
  let e = 0, n = 0;
  for (let i = 0; i < q.idx.length; i++) {
    const a = d[i * 4 + 3] / 255;
    if (!a) continue;
    const p = q.paleta[q.idx[i]];
    e += a * (Math.abs(p[0] - d[i * 4]) + Math.abs(p[1] - d[i * 4 + 1]) + Math.abs(p[2] - d[i * 4 + 2]));
    n += 3 * a;
  }
  return n ? e / n : 0;
}

/** Tamaños de paleta que se prueban, de menos a más colores. */
const PASOS_PALETA = [48, 64, 96, 128, 160, 192, 224, 255];

/**
 * PNG con paleta de hasta `colores` colores con alfa (cuantizado si hace falta). Determinista.
 * Con `errorMax`, la paleta se elige por el error medio de color (errorPaleta):
 * - primero el corte de siempre con todos los colores; si su error pasa de `errorMax` (un velo translúcido grande se
 *   comió la paleta y lo opaco cambió de color), el corte corregido con la paleta más chica de PASOS_PALETA que queda
 *   por debajo de `errorFino` (o la entera);
 * - si no, la paleta más chica con el corte de siempre que no empeora el error en más de `holgura`: las hojas fáciles
 *   pesan menos.
 */
export function pngLiviano(img: Raster, colores = 255, errorMax?: number, errorFino = 4, holgura = 1): Uint8Array {
  let q = cuantizar(img, colores, errorMax !== undefined);
  if (errorMax !== undefined) {
    const e0 = errorPaleta(img, q), corregido = e0 > errorMax;
    if (corregido) q = cuantizar(img, colores);
    for (const n of PASOS_PALETA) {
      if (n >= colores) break;
      const c = cuantizar(img, n, !corregido), e = errorPaleta(img, c);
      if (corregido ? e <= errorFino : e <= e0 + holgura && e <= errorMax) { q = c; break; }
    }
  }
  const { idx, paleta } = q;
  const ihdr = new Uint8Array(13), v = new DataView(ihdr.buffer);
  v.setUint32(0, img.w); v.setUint32(4, img.h); ihdr[8] = 8; ihdr[9] = 3; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const plte = new Uint8Array(paleta.length * 3), trns = new Uint8Array(paleta.length);
  paleta.forEach((c, i) => { plte[i * 3] = c[0]; plte[i * 3 + 1] = c[1]; plte[i * 3 + 2] = c[2]; trns[i] = c[3]; });
  const partes = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), trozo('IHDR', ihdr), trozo('PLTE', plte), trozo('tRNS', trns), trozo('IDAT', idat(img.w, img.h, idx)), trozo('IEND', new Uint8Array(0))];
  const out = new Uint8Array(partes.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of partes) { out.set(p, o); o += p.length; }
  return out;
}
