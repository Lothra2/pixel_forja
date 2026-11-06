import { createRaster, type Raster } from '../core/raster';
import { desdeRaster, lamina, type Lamina } from './cine';
import type { Toma } from './cine_toma';
import { luzCuadro, luzRevelada, revelarLuz, capasVacias, type Capas, type Atmosfera, type EscenaCine, type OpcCuadro, type Pluma, type Cartel, type Particula } from './cine3d';
import type { Camara } from './render';
import type { Particulas } from './cinematicas';

/**
 * De la escena 3D a la toma del reproductor (cine.ts del juego). La escena se traza una vez (offline) en dos pases a
 * 1408 x 792 (la capa de paralaje, con la pantalla base de 1280 x 720 en 64, 36):
 * - `fondo`: todo menos el primer plano, opaco;
 * - `frente`: el primer plano solo (sobrevivientes, árboles cercanos), con alfa, para que la cámara del juego le dé
 *   paralaje sin volver a pintar nada.
 * Lo que se mueve va en tiras que SUMAN, una por zona (la catedral que arde, una antorcha, una hoguera): la diferencia
 * exacta entre el cuadro con fuego (llamas de Doom, vitrales, brasas, el latido de su luz) y el cuadro quieto, ya
 * revelados, con el borde de la zona fundido a cero. La nieve y la ceniza son las partículas vivas del juego.
 * Lo horneado queda en datos/intro3d/<plano>/ (fondo.png, frente.png, fuego_N.png en grilla y meta.json).
 */

export interface Extras { flick: number; carteles?: Cartel[]; pantalla?: { lam: Lamina; x: number; y: number; k?: number }[]; particulas?: Particula[] }
export interface Armado { esc: EscenaCine; atm: Atmosfera; cam: Camara; plumas?: Pluma[] }
export interface Plano3D {
  /** id del plano en el guion (i01_valle...) */
  id: string;
  /** arma la escena para una cámara de w x h (la capa entera: 1408 x 792) */
  armar: (w: number, h: number) => Armado;
  revelado: OpcCuadro;
  /** lo que se mueve en el instante t: si no hay, el plano no lleva tiras */
  extras?: (a: Armado, c: Capas, t: number) => Extras;
  flickBase?: number;
  particulas?: Particulas;
  cuadros?: number; fps?: number;
  /** paralaje del fondo (el frente va a 1) */
  paralaje?: number;
  /** dónde se mueve algo (px de la capa): una tira por zona, a su escala (2 = a media resolución) */
  zonas?: (a: Armado) => { caja: [number, number, number, number]; escala: number }[];
}

/** Junta el pase del fondo y el del frente (lo que ve el ojo) para sacar el fuego con su profundidad. */
export function combinar(f: Capas, p: Capas): Capas {
  const n = f.w * f.h, c = capasVacias(f.w, f.h, Object.keys(f.marcas));
  for (let i = 0; i < n; i++) {
    const w = 1 - p.cielo[i];
    for (let j = i * 3; j < i * 3 + 3; j++) { c.base[j] = f.base[j] * (1 - w) + p.base[j]; c.fuego[j] = f.fuego[j] * (1 - w) + p.fuego[j]; c.aire[j] = f.aire[j] * (1 - w) + p.aire[j]; c.aireFuego[j] = f.aireFuego[j] * (1 - w) + p.aireFuego[j]; }
    c.trans[i] = f.trans[i] * (1 - w) + p.trans[i]; c.cielo[i] = f.cielo[i] * (1 - w); c.dist[i] = w > 0.5 ? p.dist[i] : f.dist[i];
    for (const m of Object.keys(f.marcas)) c.marcas[m][i] = f.marcas[m][i] * (1 - w);
  }
  return c;
}

export interface TiraHorneada { x: number; y: number; escala: number; cuadros: Raster[]; fps: number }
export interface Horneado { fondo: Raster; frente?: Raster; fuegos: TiraHorneada[]; particulas?: Particulas; paralaje: number }

/** Del trazado a las capas de la toma (colores de pantalla, 8 bits). */
export function hornear(pl: Plano3D, a: Armado, fondo: Capas, frente?: Capas): Horneado {
  const { w, h } = fondo, n = w * h, fb = pl.flickBase ?? 1, rev = { ...pl.revelado, vineta: 0 };
  const aRast = (f: Float32Array, alfa?: Float32Array) => { const r = createRaster(w, h); for (let i = 0; i < n; i++) { for (let k = 0; k < 3; k++) r.data[i * 4 + k] = Math.round(f[i * 3 + k] * 255); r.data[i * 4 + 3] = Math.round((alfa ? alfa[i] : 1) * 255); } return r; };
  const ver = (c: Capas, o: Partial<OpcCuadro>) => revelarLuz(luzRevelada(luzCuadro(c, a.atm, a.cam, { t: 0, flick: fb, plumas: a.plumas, ...o }), c, a.atm, a.cam, rev), w, h, rev);
  const out: Horneado = { fondo: aRast(ver(fondo, {})), fuegos: [], particulas: pl.particulas, paralaje: pl.paralaje ?? 0.85 };
  if (frente) {
    // el primer plano: su luz sin el aire de atrás, revelada sin postproceso y con su cobertura como alfa
    const L = luzCuadro(frente, a.atm, a.cam, { t: 0, flick: fb }), cob = new Float32Array(n);
    for (let i = 0; i < n; i++) { cob[i] = 1 - frente.cielo[i]; if (cob[i] > 0) for (let k = 0; k < 3; k++) L[i * 3 + k] /= cob[i]; }
    out.frente = aRast(revelarLuz(L, w, h, rev), cob);
  }
  if (pl.extras) {
    const c = frente ? combinar(fondo, frente) : fondo, quieto = ver(c, {}), nf = pl.cuadros ?? 16, fps = pl.fps ?? 12, difs: Float32Array[] = [];
    for (let f = 0; f < nf; f++) {
      const ex = pl.extras(a, c, f / fps), v = ver(c, { t: f / fps, flick: ex.flick, carteles: ex.carteles, pantalla: ex.pantalla, particulas: ex.particulas }), d = new Float32Array(n * 3);
      // lo que cambia muy poco queda en cero (no se ve y el PNG pesa mucho menos)
      for (let i = 0; i < n * 3; i++) { const q = v[i] - quieto[i]; d[i] = q > 2 / 255 ? q : 0; }
      difs.push(d);
    }
    for (const z of pl.zonas ? pl.zonas(a) : [{ caja: [0, 0, w - 1, h - 1] as [number, number, number, number], escala: 1 }]) {
      const e = z.escala, x0 = Math.max(0, Math.floor(z.caja[0])), y0 = Math.max(0, Math.floor(z.caja[1])), x1 = Math.min(w - 1, Math.ceil(z.caja[2])), y1 = Math.min(h - 1, Math.ceil(z.caja[3]));
      const tw = Math.ceil((x1 - x0 + 1) / e), th = Math.ceil((y1 - y0 + 1) / e);
      out.fuegos.push({ x: x0, y: y0, escala: e, fps, cuadros: difs.map((d) => {
        const r = createRaster(tw, th);
        for (let ty = 0; ty < th; ty++) for (let tx = 0; tx < tw; tx++) {
          const q = [0, 0, 0]; let k = 0;
          for (let yy = 0; yy < e; yy++) for (let xx = 0; xx < e; xx++) { const X = x0 + tx * e + xx, Y = y0 + ty * e + yy; if (X > x1 || Y > y1) continue; const i = Y * w + X; q[0] += d[i * 3]; q[1] += d[i * 3 + 1]; q[2] += d[i * 3 + 2]; k++; }
          // el borde de la zona se funde a cero (el latido de la luz no deja un escalón donde termina la tira)
          const pluma = Math.min(1, (Math.min(tx, tw - 1 - tx, ty, th - 1 - ty) * e) / 24), m = (Math.max(q[0], q[1], q[2]) / Math.max(1, k)) * pluma;
          if (m < 1.5 / 255) continue;
          // se suma: color sin premultiplicar (en pasos de 4) y alfa = el canal más fuerte (color * alfa es lo que se suma)
          const j = (ty * tw + tx) * 4;
          for (let c2 = 0; c2 < 3; c2++) r.data[j + c2] = Math.min(255, Math.round(((q[c2] / k) * pluma / m) * 63) * 4);
          r.data[j + 3] = Math.round(m * 255);
        }
        return r;
      }) });
    }
  }
  return out;
}

// ------------------------------------------------------------------ guardar y leer lo horneado
/** El juego (aRaster) comprime las luces altas con una rodilla: lo horneado ya está revelado, así que va con la inversa. */
const sinRodilla = (v: number) => (v <= 0.78 ? v : 0.78 - 0.22 * Math.log(1 - Math.min(0.995, (v - 0.78) / 0.22)));
const aLamina = (r: Raster): Lamina => desdeRaster(r, (c) => [sinRodilla(c[0]), sinRodilla(c[1]), sinRodilla(c[2])]);

export interface MetaTira { x: number; y: number; w: number; h: number; escala: number; cuadros: number; columnas: number; fps: number }
export interface MetaHorneado { /** horneado a esta escala de la capa (1 = entero; menos, para probar) */ escala?: number; fondo: boolean; frente: boolean; fuegos: MetaTira[]; particulas?: Particulas; paralaje: number }
/** La grilla de una tira (columnas que entren en 4096 px). */
export function grilla(cs: Raster[]): { img: Raster; columnas: number } {
  const w = cs[0].w, h = cs[0].h, columnas = Math.max(1, Math.min(cs.length, Math.floor(4096 / w))), img = createRaster(w * columnas, h * Math.ceil(cs.length / columnas));
  cs.forEach((c, i) => { const ox = (i % columnas) * w, oy = Math.floor(i / columnas) * h; for (let y = 0; y < h; y++) img.data.set(c.data.subarray(y * w * 4, (y + 1) * w * 4), ((oy + y) * img.w + ox) * 4); });
  return { img, columnas };
}
type Fs = { readFileSync: (p: string) => Uint8Array; existsSync: (p: string) => boolean };
const fs = (): Fs | null => ((globalThis as { process?: { getBuiltinModule?: (m: string) => unknown } }).process?.getBuiltinModule?.('node:fs') as Fs | undefined) ?? null;
export const CARPETA_HORNEADO = new URL('./datos/intro3d/', import.meta.url);
export interface LeidoHorneado { meta: MetaHorneado; fondo?: Raster; frente?: Raster; fuegos: Raster[] }
/** Lee lo horneado de un plano (null si no está, o si no hay sistema de archivos: en el navegador). */
export function leerHorneado(id: string, decodificar: (b: Uint8Array) => Raster): LeidoHorneado | null {
  const F = fs(); if (!F) return null;
  const ruta = (n: string) => new URL(`${id}/${n}`, CARPETA_HORNEADO).pathname;
  if (!F.existsSync(ruta('meta.json'))) return null;
  const meta = JSON.parse(new TextDecoder().decode(F.readFileSync(ruta('meta.json')))) as MetaHorneado, leer = (n: string) => decodificar(F.readFileSync(ruta(n)));
  return { meta, fondo: leer('fondo.png'), frente: meta.frente ? leer('frente.png') : undefined, fuegos: meta.fuegos.map((_, k) => leer(`fuego_${k + 1}.png`)) };
}
/** Un cuadro de una tira horneada, ya agrandado a su tamaño en la capa. */
export function cuadroTira(img: Raster, f: MetaTira, k: number, esc = 1): Raster {
  const e = f.escala / esc, W = Math.round(f.w * e), H = Math.round(f.h * e), ox = (k % f.columnas) * f.w, oy = Math.floor(k / f.columnas) * f.h, r = createRaster(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const s = ((oy + Math.min(f.h - 1, Math.floor(y / e))) * img.w + ox + Math.min(f.w - 1, Math.floor(x / e))) * 4; r.data.set(img.data.subarray(s, s + 4), (y * W + x) * 4); }
  return r;
}
/** Pone lo horneado en la toma: fondo opaco, frente con paralaje 1 y las tiras que suman encima de todo. */
export function tomaDeHorneado(t: Toma, h: LeidoHorneado) {
  const { meta } = h, esc = meta.escala ?? 1;
  const poner = (L: Lamina, r: Raster) => {
    const s = aLamina(r);
    if (s.w === L.w && s.h === L.h) { L.d.set(s.d); return; }
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) { const sx = Math.min(s.w - 1, Math.floor((x * s.w) / L.w)), sy = Math.min(s.h - 1, Math.floor((y * s.h) / L.h)); L.d.set(s.d.subarray((sy * s.w + sx) * 4, (sy * s.w + sx) * 4 + 4), (y * L.w + x) * 4); }
  };
  if (h.fondo) poner(t.capa('fondo', 0, meta.paralaje, 'normal', { opaca: true, notas: 'escena 3D (fondo)' }), h.fondo);
  if (h.frente) poner(t.capa('frente', 2, 1, 'normal', { notas: 'escena 3D (primer plano)' }), h.frente);
  meta.fuegos.forEach((f, n) => t.tira(`fuego_${n + 1}`, 3 + n, meta.paralaje, 'sumar', Array.from({ length: f.cuadros }, (_, k) => aLamina(cuadroTira(h.fuegos[n], f, k, esc))), f.x / esc, f.y / esc, f.fps, { notas: 'fuego de Doom y su luz' }));
  if (meta.particulas) t.particulas = meta.particulas;
}
/** Para las vistas de control: el plano compuesto en la capa entera (fondo, frente y el cuadro k de cada tira). */
export function componerHorneado(h: LeidoHorneado, k: number): Lamina {
  const esc = h.meta.escala ?? 1, W = Math.round(1408 * esc), H = Math.round(792 * esc), L = lamina(W, H);
  const sobre = (r: Raster, ox: number, oy: number, sumar: boolean) => {
    for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
      const X = x + ox, Y = y + oy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const s = (y * r.w + x) * 4, a = r.data[s + 3] / 255, j = (Y * W + X) * 4; if (a <= 0) continue;
      for (let c = 0; c < 3; c++) { const v = r.data[s + c] / 255; L.d[j + c] = sumar ? Math.min(1, L.d[j + c] + v * a) : L.d[j + c] * (1 - a) + v * a; }
      L.d[j + 3] = 1;
    }
  };
  if (h.fondo) sobre(h.fondo, 0, 0, false);
  if (h.frente) sobre(h.frente, 0, 0, false);
  h.meta.fuegos.forEach((f, n) => sobre(cuadroTira(h.fuegos[n], f, k % f.cuadros, 1), f.x, f.y, true));
  return L;
}
