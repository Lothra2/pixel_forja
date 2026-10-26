import { createRaster, type Raster } from '../core/raster';
import DATA from './video/repeticion.json';

/**
 * La pelea del video de @dave.xp reconstruida cuadro por cuadro: el muelle de Ken por capas (plano fijo, barco que se
 * mece, bandera, gente que saluda, barriles que se rompen), la cámara con su temblor, Ryu y Ken con cada dibujo en su
 * pixel exacto, sombras, bola de fuego, chispas, HUD y letreros. Comparado contra el video da 99,9% de pixeles iguales.
 */

interface Img { w: number; h: number; d?: string; r?: string; m?: string; i?: string }
type Pieza = [string, number, number, number];

export const REP = {
  ancho: DATA.ancho as number,
  alto: DATA.alto as number,
  fps: DATA.fps as number,
  cuadros: DATA.cuadros as number,
  fuente: DATA.fuente as string,
};

// ------------------------------------------------------------------ decodificación (sin atob: igual en Node y navegador)
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const INV = new Int16Array(256).fill(-1);
for (let i = 0; i < B64.length; i++) INV[B64.charCodeAt(i)] = i;
function base64(s: string): Uint8Array {
  let n = s.length; while (n && s[n - 1] === '=') n--;
  const out = new Uint8Array(Math.floor((n * 3) / 4));
  let o = 0, buf = 0, bits = 0;
  for (let i = 0; i < n; i++) {
    buf = (buf << 6) | INV[s.charCodeAt(i)]; bits += 6;
    if (bits >= 8) { bits -= 8; out[o++] = (buf >> bits) & 255; }
  }
  return out;
}
/** Corridas (valor, cantidad) → índices. */
function corridas(s: string, n: number): Uint8Array {
  const b = base64(s), out = new Uint8Array(n);
  let o = 0;
  for (let i = 0; i + 1 < b.length; i += 2) { out.fill(b[i], o, o + b[i + 1]); o += b[i + 1]; }
  return out;
}
function indices(img: Img): Uint8Array {
  if (img.r) return corridas(img.r, img.w * img.h);
  return base64((img.d ?? img.i)!).subarray(0, img.w * img.h);
}
const hexRGB = (h: string): [number, number, number] => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];

// ------------------------------------------------------------------ fondo: el muelle de Ken
const F = DATA.fondo;
const PAL_FONDO = F.paleta.map(hexRGB);
// colores del fondo ya empaquetados como un pixel RGBA (little endian, como en todos los navegadores y en Node)
const PAL32 = Uint32Array.from(PAL_FONDO, ([r, g, b]: [number, number, number]) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0);
let planos: { plano: Uint8Array; barco: Uint8Array; mascara: Uint8Array; bandera: Uint8Array[]; gente: Uint8Array[]; rotos: Uint8Array } | null = null;
function fondo() {
  if (!planos) {
    planos = {
      plano: base64(F.plano.i), barco: base64(F.barco.i), mascara: base64(F.barco.m),
      bandera: F.bandera.i.map((s: string) => base64(s)), gente: F.gente.i.map((s: string) => base64(s)), rotos: base64(F.rotos.i),
    };
  }
  return planos;
}
/** Medidas del muelle completo (más ancho que la pantalla: la cámara se corre por él). */
export const MUELLE = { w: F.plano.w as number, h: F.plano.h as number, origen: F.origen as [number, number], rotura: F.rotos.desde as number };

/** Cuánto sube el barco en un tick del video (ciclo de 90 cuadros). */
export const vaivenBarco = (t: number) => F.vaiven[(((t + F.vaivenFase) % F.vaiven.length) + F.vaiven.length) % F.vaiven.length] as number;

/**
 * El muelle visto con la cámara en (camX, camY), en un rectángulo de `w`×`h` desde la fila `y0` de la pantalla del video.
 * `t` mueve el barco, la bandera y la gente; `rotos` decide si los barriles ya se rompieron.
 */
export function pintarMuelle(t: number, camX: number, camY: number, rotos: boolean, w = REP.ancho, h = REP.alto, dst?: Raster, ox = 0, oy = 0): Raster {
  const P = fondo();
  const out = dst ?? createRaster(w, h);
  const u32 = new Uint32Array(out.data.buffer, out.data.byteOffset, out.w * out.h);
  const W = F.plano.w, H = F.plano.h;
  const x0 = F.origen[0] + camX, y0 = F.origen[1] + camY;
  const b = vaivenBarco(t);
  const fb = Math.floor(t / F.banderaCuadros) % 3, fg = Math.floor(t / F.genteCuadros) % 2;
  const BX = F.bandera.x, BY = F.bandera.y, BW = F.bandera.w, BH = F.bandera.h;
  const GX = F.gente.x, GY = F.gente.y, GW = F.gente.w, GH = F.gente.h;
  const RX = F.rotos.x, RY = F.rotos.y, RW = F.rotos.w, RH = F.rotos.h;
  for (let y = 0; y < h; y++) {
    const py = Math.min(H - 1, Math.max(0, y + y0));
    const by = py - b;
    for (let x = 0; x < w; x++) {
      const px = Math.min(W - 1, Math.max(0, x + x0));
      let c: number;
      if (by >= 0 && by < H && P.mascara[by * W + px]) {
        c = (px >= GX && px < GX + GW && by >= GY && by < GY + GH) ? P.gente[fg][(by - GY) * GW + (px - GX)] : P.barco[by * W + px];
      } else if (px >= BX && px < BX + BW && py >= BY && py < BY + BH) c = P.bandera[fb][(py - BY) * BW + (px - BX)];
      else if (rotos && px >= RX && px < RX + RW && py >= RY && py < RY + RH) c = P.rotos[(py - RY) * RW + (px - RX)];
      else c = P.plano[py * W + px];
      u32[(y + oy) * out.w + x + ox] = PAL32[c];
    }
  }
  return out;
}

// ------------------------------------------------------------------ piezas
const L = DATA.luchadores;
const LETRAS = L.letras as string;
/** Los dibujos de Ryu y Ken en letras de la paleta (una letra por pixel, '.' vacío), como sale del video. */
const cacheLetras = new Map<string, string[]>();
export function dibujoLuchador(quien: 'ryu' | 'ken', i: number): { w: number; h: number; filas: string[] } {
  const img = (L[quien] as Img[])[i];
  const clave = quien + i;
  let filas = cacheLetras.get(clave);
  if (!filas) {
    const b = base64(img.d!), n = img.w * img.h;
    const idx = new Uint8Array(n + 1);
    for (let j = 0; j < b.length; j++) { idx[2 * j] = b[j] >> 4; if (2 * j + 1 < n + 1) idx[2 * j + 1] = b[j] & 15; }
    filas = [];
    for (let y = 0; y < img.h; y++) { let s = ''; for (let x = 0; x < img.w; x++) s += LETRAS[idx[y * img.w + x]]; filas.push(s); }
    cacheLetras.set(clave, filas);
  }
  return { w: img.w, h: img.h, filas };
}
export const cantidadDibujos = (quien: 'ryu' | 'ken') => (L[quien] as Img[]).length;
const PAL_LUCH: Record<string, [number, number, number]> = Object.fromEntries(Object.entries(L.paleta as Record<string, string>).map(([k, v]) => [k, hexRGB(v)]));
const PAL_SUP: Record<string, [number, number, number][]> = Object.fromEntries(Object.entries(DATA.paletas as Record<string, string[]>).map(([k, v]) => [k, v.map(hexRGB)]));
const SOMBRA = hexRGB(DATA.sombra.color);
const cacheIdx = new Map<string, Uint8Array>();
function idxDe(lista: string, i: number, img: Img) {
  const k = lista + i;
  let v = cacheIdx.get(k);
  if (!v) { v = indices(img); cacheIdx.set(k, v); }
  return v;
}

/** Lo que hay en el cuadro `k`: piezas en coordenadas del mundo (luchadores, sombras, efectos) o de pantalla (HUD, letreros). */
export function piezas(k: number): Pieza[] { return (DATA.linea as Pieza[][])[k] ?? []; }
export function camara(k: number): [number, number] { return (DATA.camara as [number, number][])[k] ?? [0, 0]; }

/** Un pintor de luchador: recibe el dibujo (letras) y devuelve el color de cada letra, o lo pinta él mismo. */
export type PintorLuchador = (quien: 'ryu' | 'ken', dibujo: number, dst: Raster, sx: number, sy: number) => boolean;

/** Pinta el cuadro `k` de la pelea tal cual el video (o con otro pintor para los luchadores). */
export function cuadroRepeticion(k: number, opc: { pintor?: PintorLuchador; hud?: boolean; letreros?: boolean; nombres?: [string, string] } = {}): Raster {
  const [cx, cy] = camara(k);
  const out = pintarMuelle(k, cx, cy, k >= MUELLE.rotura);
  const [ox, oy] = MUELLE.origen;
  const put = (x: number, y: number, c: [number, number, number]) => {
    if (x < 0 || y < 0 || x >= out.w || y >= out.h) return;
    const o = (y * out.w + x) * 4; out.data[o] = c[0]; out.data[o + 1] = c[1]; out.data[o + 2] = c[2]; out.data[o + 3] = 255;
  };
  for (const [t, i, x, y] of piezas(k)) {
    const enMundo = t === 'r' || t === 'k' || t === 's' || t === 'e';
    const sx = enMundo ? x - ox - cx : x, sy = enMundo ? y - oy - cy : y;
    if (t === 'r' || t === 'k') {
      const quien = t === 'r' ? 'ryu' : 'ken';
      if (opc.pintor && opc.pintor(quien, i, out, sx, sy)) continue;
      const d = dibujoLuchador(quien, i);
      for (let yy = 0; yy < d.h; yy++) for (let xx = 0; xx < d.w; xx++) { const c = d.filas[yy][xx]; if (c !== '.') put(sx + xx, sy + yy, PAL_LUCH[c]); }
    } else if (t === 's') {
      const img = DATA.sombra.m[i] as Img; const m = idxDe('s', i, img);
      for (let j = 0; j < m.length; j++) if (m[j]) put(sx + (j % img.w), sy + Math.floor(j / img.w), SOMBRA);
    } else {
      if (t === 'h' && opc.hud === false) continue;
      if (t === 't' && opc.letreros === false) continue;
      const lista = t === 'e' ? 'efectos' : t === 't' ? 'textos' : 'hud';
      const pal = PAL_SUP[t === 'e' ? 'fx' : t === 't' ? 'txt' : 'hud'];
      const img = (DATA as unknown as Record<string, Img[]>)[lista][i]; const m = idxDe(lista, i, img);
      // con otros nombres, el RYU y el KEN del HUD no se pintan
      const tapa = t === 'h' && opc.nombres;
      for (let j = 0; j < m.length; j++) {
        if (!m[j]) continue;
        const x = sx + (j % img.w), y = sy + Math.floor(j / img.w);
        if (tapa && enCajaNombre(x, y)) continue;
        put(x, y, pal[m[j] - 1]);
      }
    }
  }
  if (opc.nombres && opc.hud !== false && piezas(k).some((p) => p[0] === 'h')) {
    nombreHud(out, opc.nombres[0], NOMBRE_X[0], false);
    nombreHud(out, opc.nombres[1], NOMBRE_X[1], true);
  }
  return out;
}

// ------------------------------------------------------------------ nombres del HUD
// dónde van RYU y KEN bajo las barras (filas 61 a 70) y las letras en el mismo estilo: relleno naranja que baja a rojo,
// contorno azul y sombra
const NOMBRE_Y = 61;
const NOMBRE_X: [number, number] = [16, 164];
const CAJAS = [[16, 42], [139, 165]];
const enCajaNombre = (x: number, y: number) => y >= NOMBRE_Y && y <= NOMBRE_Y + 9 && CAJAS.some(([a, b]) => x >= a && x < b);
const RELLENO = ['f8b87c', 'f8b87c', 'eea67e', 'ea8157', 'e7704f', 'd88b7a', 'c57977'].map(hexRGB);
const CONTORNO = hexRGB('193e8c'), SOMBRA_TXT = hexRGB('0a38a0');
const LETRA: Record<string, string> = {
  A: '01110100011000111111100011000110001', B: '11110100011000111110100011000111110', C: '01110100011000010000100001000101110',
  D: '11110100011000110001100011000111110', E: '11111100001000011110100001000011111', F: '11111100001000011110100001000010000',
  G: '01110100011000010111100011000101111', H: '10001100011000111111100011000110001', I: '11111001000010000100001000010011111',
  J: '00111000100001000010100101001001100', K: '10001100101010011000101001001010001', L: '10000100001000010000100001000011111',
  M: '10001110111010110101100011000110001', N: '10001110011010110011100011000110001', O: '01110100011000110001100011000101110',
  P: '11110100011000111110100001000010000', Q: '01110100011000110001101011001001101', R: '11110100011000111110101001001010001',
  S: '01111100001000001110000010000111110', T: '11111001000010000100001000010000100', U: '10001100011000110001100011000101110',
  V: '10001100011000110001100010101000100', W: '10001100011000110101101011101110001', X: '10001100010101000100010101000110001',
  Y: '10001100010101000100001000010000100', Z: '11111000010001000100010001000011111',
};
/** Pinta un nombre como los del HUD del video; `derecha` lo alinea por el final. */
function nombreHud(out: Raster, nombre: string, x: number, derecha: boolean): void {
  const txt = nombre.normalize('NFD').replace(/[^A-Za-z ]/g, '').toUpperCase().trim().slice(0, 7);
  const w = txt.length * 7 - 1;
  const x0 = derecha ? x - w : x, y0 = NOMBRE_Y + 1;
  const lleno = new Set<number>();
  [...txt].forEach((c, n) => {
    const g = LETRA[c]; if (!g) return;
    // trazo de dos pixeles de ancho, como las letras gruesas del juego
    for (let j = 0; j < 35; j++) if (g[j] === '1') for (const d of [0, 1]) lleno.add((y0 + Math.floor(j / 5)) * out.w + x0 + n * 7 + (j % 5) + d);
  });
  const pon = (i: number, c: [number, number, number]) => {
    const px = i % out.w, py = (i - px) / out.w;
    if (px < 0 || py < 0 || px >= out.w || py >= out.h) return;
    out.data[i * 4] = c[0]; out.data[i * 4 + 1] = c[1]; out.data[i * 4 + 2] = c[2]; out.data[i * 4 + 3] = 255;
  };
  const borde = new Set<number>();
  for (const i of lleno) for (const d of [-1, 1, -out.w, out.w, -out.w - 1, -out.w + 1, out.w - 1, out.w + 1]) if (!lleno.has(i + d)) borde.add(i + d);
  for (const i of borde) if (!lleno.has(i + out.w + 1) && !borde.has(i + out.w + 1)) pon(i + out.w + 1, SOMBRA_TXT);
  for (const i of borde) pon(i, CONTORNO);
  for (const i of lleno) pon(i, RELLENO[Math.floor(i / out.w) - y0]);
}
