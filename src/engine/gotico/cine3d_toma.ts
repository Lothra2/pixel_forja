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
export interface Armado { esc: EscenaCine; atm: Atmosfera; cam: Camara; plumas?: Pluma[]; /** partículas quietas horneadas en el fondo (el polvo en los rayos de luz) */ polvo?: Particula[] }
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
  /** lo que se mueve en el mundo (las campanas, sus sogas, los monjes que tiran): tiras normales con alfa entre el fondo y el frente */
  moviles?: Movil[];
  /** la misma escena con otra luz (el relámpago, los ojos que se encienden): lo que suma va en una capa con anim de tiempo */
  variantes?: Variante[];
  /** los instantes (s) de las cuatro vistas de la hoja de control */
  qa?: number[];
}
/** Envolvente de alfa en el tiempo del plano: claves [segundo, alfa], lineal entre claves, la primera y la última se sostienen. */
export interface AnimTiempo { tipo: 'tiempo'; claves: [number, number][] }
export function alfaTiempo(an: AnimTiempo, t: number): number {
  const c = an.claves; if (!c.length) return 1;
  if (t <= c[0][0]) return c[0][1];
  for (let i = 1; i < c.length; i++) if (t <= c[i][0]) { const [t0, a0] = c[i - 1], [t1, a1] = c[i]; return t1 > t0 ? a0 + ((a1 - a0) * (t - t0)) / (t1 - t0) : a1; }
  return c[c.length - 1][1];
}
/**
 * Lo que se mueve: la escena del cuadro k (con lo que se mueve en su pose y marcado en `esc.moviles`), trazada solo en
 * `caja` (px de la capa) a 1 / escala, en bucle de `cuadros` a `fps` (el cuadro n se ve en n / fps segundos del plano).
 */
export interface Movil { id: string; cuadros: number; fps: number; escala: number; armar: (w: number, h: number, k: number) => Armado; caja: (a: Armado) => [number, number, number, number] }
/** Otra luz sobre la misma escena: se traza entera y lo que suma sobre la base va en una capa recortada, con su anim. */
export interface Variante {
  id: string; anim: AnimTiempo; escala?: number;
  /** la escena con la otra luz (se traza entera); sin `armar`, es la misma escena revelada con otro `flick` (otra luz del canal 1) */
  armar?: (w: number, h: number) => Armado; flick?: number;
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

export interface TiraHorneada { x: number; y: number; escala: number; cuadros: Raster[]; fps: number; anim?: AnimTiempo }
export interface Horneado { fondo: Raster; frente?: Raster; fuegos: TiraHorneada[]; moviles: TiraHorneada[]; luces: TiraHorneada[]; particulas?: Particulas; paralaje: number }
/** Lo trazado de lo que se mueve: por cada `Movil`, su recorte (px de la capa a 1 / escala) y las capas de cada cuadro (del tamaño del recorte). */
export interface TrazadoMovil { caja: [number, number, number, number]; cuadros: Capas[]; arm: Armado }
/** Lo trazado de cada variante (pase entero) con su armado. */
export interface TrazadoVariante { capas: Capas; arm: Armado }

/** Del trazado a las capas de la toma (colores de pantalla, 8 bits). */
export function hornear(pl: Plano3D, a: Armado, fondo: Capas, frente?: Capas, mas: { moviles?: TrazadoMovil[]; variantes?: TrazadoVariante[] } = {}): Horneado {
  const { w, h } = fondo, n = w * h, fb = pl.flickBase ?? 1, rev = { ...pl.revelado, vineta: 0 };
  const aRast = (f: Float32Array, alfa?: Float32Array) => { const r = createRaster(w, h); for (let i = 0; i < n; i++) { for (let k = 0; k < 3; k++) r.data[i * 4 + k] = Math.round(f[i * 3 + k] * 255); r.data[i * 4 + 3] = Math.round((alfa ? alfa[i] : 1) * 255); } return r; };
  const ver = (c: Capas, o: Partial<OpcCuadro>) => revelarLuz(luzRevelada(luzCuadro(c, a.atm, a.cam, { t: 0, flick: fb, plumas: a.plumas, ...o }), c, a.atm, a.cam, rev), w, h, rev);
  const out: Horneado = { fondo: aRast(ver(fondo, a.polvo ? { particulas: a.polvo } : {})), fuegos: [], moviles: [], luces: [], particulas: pl.particulas, paralaje: pl.paralaje ?? 0.85 };
  // lo que se mueve: cada cuadro revelado como el frente (su luz sin el aire de atrás, con su cobertura como alfa)
  (mas.moviles ?? []).forEach((m, j) => {
    const mv = pl.moviles![j], [x0, y0, x1, y1] = m.caja, tw = x1 - x0, th = y1 - y0;
    out.moviles.push({ x: x0 * mv.escala, y: y0 * mv.escala, escala: mv.escala, fps: mv.fps, cuadros: m.cuadros.map((c) => {
      const L = luzCuadro(c, m.arm.atm, m.arm.cam, { t: 0, flick: fb }), r = createRaster(tw, th);
      for (let i = 0; i < c.w * c.h; i++) { const cob = 1 - c.cielo[i]; if (cob > 0) for (let k = 0; k < 3; k++) L[i * 3 + k] /= cob; }
      const col = revelarLuz(L, c.w, c.h, rev);
      for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
        const i = y * tw + x, cob = 1 - c.cielo[i], j2 = i * 4;
        if (cob <= 0.002) continue;
        // en pasos de 2 (color) y de 4 (alfa): no se nota y el PNG de la tira pesa bastante menos
        for (let k = 0; k < 3; k++) r.data[j2 + k] = Math.min(254, Math.round(col[i * 3 + k] * 127.5) * 2);
        r.data[j2 + 3] = Math.min(255, Math.round(Math.min(1, cob) * 63.75) * 4);
      }
      return r;
    }) });
  });
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
      if (x1 - x0 < 8 || y1 - y0 < 8) continue; // la zona cae fuera del cuadro
      const tw = Math.ceil((x1 - x0 + 1) / e), th = Math.ceil((y1 - y0 + 1) / e);
      const tira: TiraHorneada = { x: x0, y: y0, escala: e, fps, cuadros: difs.map((d) => {
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
      }) };
      // una zona donde no se ve nada (la llama queda detrás de algo) no va
      if (tira.cuadros.some((r) => r.data.some((v, i) => i % 4 === 3 && v > 0))) out.fuegos.push(tira);
    }
  }
  if (mas.variantes?.length) {
    // la base es lo que ve el ojo sin la variante; lo que la variante suma, recortado a donde se nota y a su escala
    const quieto = ver(frente ? combinar(fondo, frente) : fondo, {});
    mas.variantes.forEach((v, j) => {
      const def = pl.variantes![j], e = def.escala ?? 2;
      const vr = revelarLuz(luzRevelada(luzCuadro(v.capas, v.arm.atm, v.arm.cam, { t: 0, flick: def.flick ?? fb, plumas: v.arm.plumas }), v.capas, v.arm.atm, v.arm.cam, rev), w, h, rev);
      const d = new Float32Array(n * 3); let x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { const q = vr[i * 3 + k] - quieto[i * 3 + k]; if (q > 2 / 255) { d[i * 3 + k] = q; const x = i % w, y = (i - x) / w; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }
      if (x1 < 0) return;
      x0 = Math.floor(x0 / e) * e; y0 = Math.floor(y0 / e) * e;
      const tw = Math.ceil((x1 - x0 + 1) / e), th = Math.ceil((y1 - y0 + 1) / e), r = createRaster(tw, th);
      for (let ty = 0; ty < th; ty++) for (let tx = 0; tx < tw; tx++) {
        const q = [0, 0, 0]; let k = 0;
        for (let yy = 0; yy < e; yy++) for (let xx = 0; xx < e; xx++) { const X = x0 + tx * e + xx, Y = y0 + ty * e + yy; if (X >= w || Y >= h) continue; const i = Y * w + X; q[0] += d[i * 3]; q[1] += d[i * 3 + 1]; q[2] += d[i * 3 + 2]; k++; }
        const m = Math.max(q[0], q[1], q[2]) / Math.max(1, k); if (m < 1.5 / 255) continue;
        const jj = (ty * tw + tx) * 4;
        for (let c2 = 0; c2 < 3; c2++) r.data[jj + c2] = Math.min(255, Math.round(((q[c2] / k) / m) * 63) * 4);
        r.data[jj + 3] = Math.round(m * 255);
      }
      out.luces.push({ x: x0, y: y0, escala: e, fps: 12, cuadros: [r], anim: def.anim });
    });
  }
  return out;
}

// ------------------------------------------------------------------ guardar y leer lo horneado
/** El juego (aRaster) comprime las luces altas con una rodilla: lo horneado ya está revelado, así que va con la inversa. */
const sinRodilla = (v: number) => (v <= 0.78 ? v : 0.78 - 0.22 * Math.log(1 - Math.min(0.995, (v - 0.78) / 0.22)));
const aLamina = (r: Raster): Lamina => desdeRaster(r, (c) => [sinRodilla(c[0]), sinRodilla(c[1]), sinRodilla(c[2])]);

export interface MetaTira { x: number; y: number; w: number; h: number; escala: number; cuadros: number; columnas: number; fps: number; anim?: AnimTiempo }
export interface MetaHorneado {
  /** horneado a esta escala de la capa (1 = entero; menos, para probar) */ escala?: number; fondo: boolean; frente: boolean;
  /** tiras que suman en bucle (fuego_N.png) */ fuegos: MetaTira[];
  /** tiras normales con alfa en bucle, entre el fondo y el frente (movil_N.png) */ moviles?: MetaTira[];
  /** capas que suman con anim de tiempo, encima de todo (luz_N.png) */ luces?: MetaTira[];
  particulas?: Particulas; paralaje: number;
}
/** La grilla de una tira (columnas que entren en 4096 px). */
export function grilla(cs: Raster[]): { img: Raster; columnas: number } {
  const w = cs[0].w, h = cs[0].h, columnas = Math.max(1, Math.min(cs.length, Math.floor(4096 / w))), img = createRaster(w * columnas, h * Math.ceil(cs.length / columnas));
  cs.forEach((c, i) => { const ox = (i % columnas) * w, oy = Math.floor(i / columnas) * h; for (let y = 0; y < h; y++) img.data.set(c.data.subarray(y * w * 4, (y + 1) * w * 4), ((oy + y) * img.w + ox) * 4); });
  return { img, columnas };
}
type Fs = { readFileSync: (p: string) => Uint8Array; existsSync: (p: string) => boolean };
const fs = (): Fs | null => ((globalThis as { process?: { getBuiltinModule?: (m: string) => unknown } }).process?.getBuiltinModule?.('node:fs') as Fs | undefined) ?? null;
export const CARPETA_HORNEADO = new URL('./datos/intro3d/', import.meta.url);
export interface LeidoHorneado { meta: MetaHorneado; fondo?: Raster; frente?: Raster; fuegos: Raster[]; moviles: Raster[]; luces: Raster[] }
/** Lee lo horneado de un plano (null si no está, o si no hay sistema de archivos: en el navegador). */
export function leerHorneado(id: string, decodificar: (b: Uint8Array) => Raster, base: URL = CARPETA_HORNEADO): LeidoHorneado | null {
  const F = fs(); if (!F) return null;
  const ruta = (n: string) => new URL(`${id}/${n}`, base).pathname;
  if (!F.existsSync(ruta('meta.json'))) return null;
  const meta = JSON.parse(new TextDecoder().decode(F.readFileSync(ruta('meta.json')))) as MetaHorneado, leer = (n: string) => decodificar(F.readFileSync(ruta(n)));
  return {
    meta, fondo: leer('fondo.png'), frente: meta.frente ? leer('frente.png') : undefined, fuegos: meta.fuegos.map((_, k) => leer(`fuego_${k + 1}.png`)),
    moviles: (meta.moviles ?? []).map((_, k) => leer(`movil_${k + 1}.png`)), luces: (meta.luces ?? []).map((_, k) => leer(`luz_${k + 1}.png`)),
  };
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
  (meta.moviles ?? []).forEach((f, n) => t.tira(`movil_${n + 1}`, 1 + n / 100, meta.paralaje, 'normal', Array.from({ length: f.cuadros }, (_, k) => aLamina(cuadroTira(h.moviles[n], f, k, esc))), f.x / esc, f.y / esc, f.fps, { notas: 'lo que se mueve (campanas, sogas, monjes)' }));
  if (h.frente) poner(t.capa('frente', 2, 1, 'normal', { notas: 'escena 3D (primer plano)' }), h.frente);
  meta.fuegos.forEach((f, n) => t.tira(`fuego_${n + 1}`, 3 + n, meta.paralaje, 'sumar', Array.from({ length: f.cuadros }, (_, k) => aLamina(cuadroTira(h.fuegos[n], f, k, esc))), f.x / esc, f.y / esc, f.fps, { notas: 'fuego de Doom y su luz' }));
  (meta.luces ?? []).forEach((f, n) => {
    const L = t.capa(`luz_${n + 1}`, 50 + n, meta.paralaje, 'sumar', { anim: f.anim as unknown as Record<string, unknown>, notas: 'luz que llega en su momento (relámpago, ojos)' }), r = cuadroTira(h.luces[n], f, 0, esc), s = aLamina(r), x0 = Math.round(f.x / esc), y0 = Math.round(f.y / esc);
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const X = x + x0, Y = y + y0; if (X >= 0 && Y >= 0 && X < L.w && Y < L.h) L.d.set(s.d.subarray((y * s.w + x) * 4, (y * s.w + x) * 4 + 4), (Y * L.w + X) * 4); }
  });
  if (meta.particulas) t.particulas = meta.particulas;
}
/**
 * Para las vistas de control: el plano compuesto en la capa entera en el segundo t (fondo, el cuadro de lo que se
 * mueve, frente, el cuadro de cada tira de fuego y las luces con su alfa de ese momento).
 */
export function componerHorneado(h: LeidoHorneado, t: number): Lamina {
  const esc = h.meta.escala ?? 1, W = Math.round(1408 * esc), H = Math.round(792 * esc), L = lamina(W, H);
  const sobre = (r: Raster, ox: number, oy: number, sumar: boolean, ka = 1) => {
    if (ka <= 0) return;
    for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
      const X = x + ox, Y = y + oy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const s = (y * r.w + x) * 4, a = (r.data[s + 3] / 255) * ka, j = (Y * W + X) * 4; if (a <= 0) continue;
      for (let c = 0; c < 3; c++) { const v = r.data[s + c] / 255; L.d[j + c] = sumar ? Math.min(1, L.d[j + c] + v * a) : L.d[j + c] * (1 - a) + v * a; }
      L.d[j + 3] = 1;
    }
  };
  const cuadro = (f: MetaTira) => Math.floor(t * f.fps + 1e-6) % f.cuadros;
  if (h.fondo) sobre(h.fondo, 0, 0, false);
  (h.meta.moviles ?? []).forEach((f, n) => sobre(cuadroTira(h.moviles[n], f, cuadro(f), 1), f.x, f.y, false));
  if (h.frente) sobre(h.frente, 0, 0, false);
  h.meta.fuegos.forEach((f, n) => sobre(cuadroTira(h.fuegos[n], f, cuadro(f), 1), f.x, f.y, true));
  (h.meta.luces ?? []).forEach((f, n) => sobre(cuadroTira(h.luces[n], f, 0, 1), f.x, f.y, true, f.anim ? alfaTiempo(f.anim, t) : 1));
  return L;
}
