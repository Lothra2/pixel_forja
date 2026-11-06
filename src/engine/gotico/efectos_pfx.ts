/**
 * Efectos de pixelfx mudados al taller gótico.
 *
 * pixelfx (vendor/pixelfx, MIT, de Patch, con partes de Hugo Duprez y Hollow Crown: ver su LICENSE y NOTICE.md) pinta
 * efectos de pixel art de vista lateral a 30 cuadros por segundo, con un muñeco de 24 × 38 px. Este adaptador los
 * pasa al formato de los poderes del taller (poderes.ts):
 *
 * - 25 cuadros por segundo con `t` ticks por cuadro. No se remuestrean cuadros: cada cuadro se pinta en su tiempo
 *   exacto (los efectos puros son una función del tiempo y las simulaciones avanzan a 120 Hz o más fino), así no hay
 *   tirones. En los bucles el período se reparte en un número entero de cuadros y el último empalma con el primero.
 * - Escala ×2 con vecino más cercano: el muñeco de pixelfx mide 38 px y nuestra persona 75 px en pantalla (render.ts:
 *   ALTO_PERSONA), así cada pixel de pixelfx es un bloque de 2 × 2 como el grano de nuestros sprites.
 * - Paletas góticas por elemento (efectos_pfx_paletas.ts) pasadas a las opciones del efecto, más una gradación que
 *   baja la saturación, hunde las sombras y tiñe los núcleos casi blancos.
 * - Direccionales en las 8 direcciones de DIRS_PODER con la proyección 2:1: los que vuelan se rotan con RotSprite
 *   (Scale2x tres veces y muestreo afín, sin colores nuevos) con escorzo a lo largo de la marcha y espejo para los de
 *   la izquierda; los que corren por el piso se reparten en tajadas que se apoyan sobre la línea 2:1.
 * - Efectos de piso: los anillos, novas, charcos y grietas se reescribieron en la copia vendorizada para que queden
 *   aplastados 2:1 (core/forja.js), no de perfil.
 * - Sin muñeco ni blanco de paja: se pinta solo el efecto. Los que leen el cuerpo se pintan dos veces con colores
 *   distintos en el muñeco y se borra lo que depende de esos colores dentro de la silueta (la capa que teñía al
 *   muñeco); el juego tiñe su propio sprite con `cuerpo.tinte` y lo desvanece con `cuerpo.alfa`.
 * - Luz dinámica por efecto en el formato de luz_efectos.ts, sacada de la energía del buffer de luz de pixelfx.
 *
 * Todo es determinista (las semillas son las de cada efecto).
 */
import { createRaster, type Raster } from '../core/raster';
import { scale2xRaster } from '../render/rotsprite';
import { pngLiviano } from './efectos_pfx_png';
import { createFrame, clearFrame, createFx, composite, type ActorPfx, type CuadroPfx } from './vendor/pixelfx/core/index.js';
import { EFECTOS, type ModuloPfx } from './vendor/pixelfx/fx/indice.js';
import { DIRS_PODER } from './poderes';
import type { LuzEfecto } from './luz_efectos';
import { GRADACION_BASE, RAMPAS, VIOLETAS, gradar, nucleo, rampa, rgbHex, type Gradacion, type NombreRampa } from './efectos_pfx_paletas';
import { CATALOGO_PFX } from './efectos_pfx_catalogo';
import { siluetaHeroe } from './efectos_pfx_silueta';

// ---------------------------------------------------------------------------------------------------------------
// tipos

export type CategoriaPfx =
  | 'fuego' | 'explosiones' | 'agua' | 'hielo' | 'rayo' | 'cuerpo_a_cuerpo' | 'impactos' | 'proyectiles' | 'aparicion'
  | 'arcano' | 'sagrado' | 'sombra' | 'estado' | 'naturaleza' | 'clima' | 'botin' | 'criaturas' | 'transiciones';

export type ClaseHeroe = 'berserker' | 'templario' | 'arcanista' | 'cazadora' | 'nigromante' | 'monje' | 'druida' | 'alquimista';

/** Para qué sirve cada efecto en el juego (sugerencias concretas para cablearlo). */
export type UsoPfx =
  | { tipo: 'poder'; clase: ClaseHeroe; habilidades: string[]; nota?: string }
  | { tipo: 'monstruo'; monstruos: string[]; nota: string }
  | { tipo: 'estado'; estado: string; nota?: string }
  | { tipo: 'clima'; actos: number[]; zonas?: string[]; nota?: string }
  | { tipo: 'ambiente'; zonas: string[]; nota: string }
  | { tipo: 'botin'; nota: string }
  | { tipo: 'muerte'; nota: string }
  | { tipo: 'cinematica'; nota: string }
  | { tipo: 'golpe'; nota: string };

/** Dónde vive el efecto: en el mundo, pegado al piso, o sobre toda la pantalla. */
export type CapaPfx = 'mundo' | 'piso' | 'pantalla';

/** Cómo se sacan las 8 direcciones de un efecto que mira a la derecha. */
export interface DirPfx {
  /** vuelo: rotar el sprite; suelo: repartirlo en tajadas sobre la línea del piso */
  modo: 'vuelo' | 'suelo';
  /** punto (local, 1x) alrededor del que se rota; por omisión el origen */
  pivote?: [number, number];
  /** exponente del escorzo a lo largo de la marcha (0 sin escorzo, 1 escorzo completo); por omisión 0.5 */
  escorzo?: number;
  /** cuánto del giro se aplica (1 todo; 0.6 los tajos, que se leen mejor más planos) */
  giro?: number;
}

/** Configuración de un efecto mudado (efectos_pfx_catalogo.ts). */
export interface CfgPfx {
  id: string;
  /** id en pixelfx: categoría/nombre */
  origen: string;
  nombre: [string, string];
  categoria: CategoriaPfx;
  /** rampa de la gradación (núcleo caliente) y de la luz */
  elemento: NombreRampa;
  capa?: CapaPfx;
  dir?: DirPfx;
  /** opciones que se pasan al efecto (paletas góticas, tamaños, semillas) */
  opciones?: Record<string, unknown>;
  /** ticks por cuadro a 25 por segundo (1 = 25 cps, 2 = 12.5 cps) */
  t?: 1 | 2;
  /** escala entera de salida (2 en el mundo; 1 en los de pantalla, que el juego estira para cubrirla) */
  escala?: number;
  /** punto local (1x) que va sobre el piso: el ancla. Proyectiles: el piso debajo de la bola */
  ancla?: [number, number];
  /** margen del lienzo a 1x para que nada se corte */
  margen?: number;
  /** cuerpo: qué hacer con lo que el efecto pinta sobre el muñeco */
  cuerpo?: {
    /** borrar lo que depende del color del muñeco: 'silueta' solo adentro de la silueta, 'todo' también afuera */
    quitar?: 'silueta' | 'todo';
    /** rampa para los colores del muñeco (lo que sale del cuerpo y queda: astillas, ceniza) */
    rampa?: NombreRampa;
    /** exportar la curva de visibilidad del sprite (el efecto lo hace desaparecer o aparecer) */
    alfa?: boolean;
    /** tinte sugerido para el sprite del que sufre el efecto */
    tinte?: { color: string; fuerza: number; nota?: string };
  };
  gradacion?: Partial<Gradacion>;
  /** fracción de la energía máxima bajo la que se corta la cola de un efecto que pasa una vez (0 = no cortar) */
  cola?: number;
  /** máximo de segundos (los largos se cortan con un desvanecido) */
  maxSeg?: number;
  /** recorta el efecto a una ventana de tiempo [desde, hasta] en segundos del original */
  ventana?: [number, number];
  luz?: Partial<LuzEfecto>;
  /** el efecto se centra en el que lo lanza (novas, auras, cargas): el juego lo pone en sus pies */
  enLanzador?: boolean;
  /** en qué direcciones va detrás del que lo lanza (tajos y alientos pegados al cuerpo) */
  detrasEn?: (typeof DIRS_PODER)[number][];
  uso: UsoPfx[];
  notas?: string;
}

/** Lo que va al manifiesto por efecto. */
export interface EfectoPfx {
  id: string;
  origen: string;
  nombre: [string, string];
  categoria: CategoriaPfx;
  capa: CapaPfx;
  archivo: string;
  cuadros: number;
  t: number;
  bucle: boolean;
  direccional: boolean;
  filas: string[] | null;
  /** celdas por fila de la hoja (un efecto largo se parte en varias filas por dirección) */
  columnas: number;
  /** filas de la hoja que ocupa cada dirección */
  filasPorDir: number;
  celda: [number, number];
  ancla: [number, number];
  escala: number;
  mezcla: 'normal' | 'aditiva';
  detrasEn?: string[];
  enLanzador?: boolean;
  cuerpo?: { alfa?: number[]; tinte?: { color: string; fuerza: number; nota?: string } };
  luz: LuzEfecto;
  uso: UsoPfx[];
  notas?: string;
}

// ---------------------------------------------------------------------------------------------------------------
// constantes

export const CPS = 25;
const ESCALA = 2;
/** alfa mínima (0..255) que cuenta como contenido al medir la celda */
const ALFA_MIN = 3;
/** ancho máximo de una hoja en px (se parte en filas) */
const ANCHO_HOJA = 4096;

/** Ángulo en pantalla (grados, y hacia abajo) y escorzo de cada dirección a la derecha; las de la izquierda espejan. */
const DIR_PANTALLA: Record<(typeof DIRS_PODER)[number], { ang: number; largo: number; espejo?: (typeof DIRS_PODER)[number] }> = {
  s: { ang: 90, largo: 0.5 },
  so: { ang: 0, largo: 0, espejo: 'se' },
  o: { ang: 0, largo: 0, espejo: 'e' },
  no: { ang: 0, largo: 0, espejo: 'ne' },
  n: { ang: -90, largo: 0.5 },
  ne: { ang: -Math.atan2(0.5, 1) * (180 / Math.PI), largo: Math.hypot(1, 0.5) / Math.SQRT2 },
  e: { ang: 0, largo: 1 },
  se: { ang: Math.atan2(0.5, 1) * (180 / Math.PI), largo: Math.hypot(1, 0.5) / Math.SQRT2 },
};

// ---------------------------------------------------------------------------------------------------------------
// render crudo a 1x

interface Lamina {
  w: number;
  h: number;
  /** ancla (frontera de pixel) dentro de la lámina */
  ax: number;
  ay: number;
  /** origen del efecto (frontera de pixel) dentro de la lámina */
  ox: number;
  oy: number;
  cuadros: Uint8ClampedArray[];
}

interface Crudo {
  lam: Lamina;
  /** energía de luz por cuadro, color medio de la luz y su centroide (en la lámina) */
  energia: number[];
  materia: number[];
  luzRgb: [number, number, number];
  centro: [number, number];
  dispersion: number;
  alfaCuerpo: number[];
  n: number;
  t: number;
  bucle: boolean;
}

const modulo = (cfg: CfgPfx): ModuloPfx => {
  const m = EFECTOS[cfg.origen];
  if (!m) throw new Error(`pixelfx no tiene ${cfg.origen}`);
  return m;
};

/** El muñeco para los efectos de cuerpo: la silueta de nuestro héroe a 1x con colores de una rampa. */
function actorDe(cfg: CfgPfx, variante: 0 | 1): ActorPfx {
  const s = siluetaHeroe();
  const r = rampa(cfg.cuerpo?.rampa ?? 'piedra', 16).map(rgbHex);
  const pixels = new Uint32Array(s.w * s.h);
  for (let i = 0; i < s.w * s.h; i++) {
    if (!s.mask[i]) continue;
    let [R, G, B] = r[Math.min(15, Math.round(s.luz[i] * 15))];
    // la segunda pasada cambia todos los colores: lo que dependa de ellos sale distinto
    if (variante) { R = 255 - R; G = (G + 97) & 255; B = 255 - (B >> 1); }
    pixels[i] = (255 << 24) | (B << 16) | (G << 8) | R;
  }
  const x = -Math.floor(s.w / 2), y = -s.h;
  return { mask: { w: s.w, h: s.h, data: s.mask }, pixels, x, y, w: s.w, h: s.h, k: 2, head: [0, y], chest: [0, Math.round(y * 0.68)], eyes: [[Math.floor(s.w / 2) - 2, 4], [Math.floor(s.w / 2) + 1, 4]] };
}

/** Tiempos de los cuadros: los bucles reparten su período en cuadros enteros (empalma), los otros a 25/t por segundo. */
function tiempos(cfg: CfgPfx, meta: ModuloPfx['meta']): { ts: number[]; t: number; bucle: boolean } {
  // los direccionales en bucle (proyectiles) van a 12.5 cps como los poderes: 8 direcciones pesan
  const t = cfg.t ?? (cfg.dir && meta.loop ? 2 : 1), dt = t / CPS, D = meta.duration, bucle = !!meta.loop;
  if (bucle) {
    const n = Math.max(2, Math.round(D / dt));
    return { ts: Array.from({ length: n }, (_, i) => (i * D) / n), t, bucle };
  }
  const [a, b] = cfg.ventana ?? [0, D];
  const fin = Math.min(b, cfg.maxSeg !== undefined ? a + cfg.maxSeg : b);
  const n = Math.max(1, Math.ceil((fin - a) / dt - 1e-9));
  return { ts: Array.from({ length: n }, (_, i) => a + i * dt), t, bucle };
}

/** Pinta todos los cuadros a 1x en un lienzo con margen. Devuelve RGBA con alfa directa, más la luz medida. */
function pintarCrudo(cfg: CfgPfx, variante: 0 | 1 = 0): Crudo {
  const mod = modulo(cfg), meta = mod.meta;
  const [W, H] = meta.size, [OX, OY] = meta.origin;
  const pantalla = cfg.capa === 'pantalla';
  const m = pantalla ? 0 : cfg.margen ?? 80;
  const w = W + m * 2, h = H + m * 2;
  const fr: CuadroPfx = createFrame(w, h, -m, -m);
  const opc: Record<string, unknown> = { x: OX, y: OY, ...(cfg.opciones ?? {}) };
  const usaCuerpo = !!meta.actor;
  if (usaCuerpo) opc.actor = actorDe(cfg, variante);
  const inst = createFx(mod, opc);
  const { ts, t, bucle } = tiempos(cfg, meta);
  const cuadros: Uint8ClampedArray[] = [], energia: number[] = [], materia: number[] = [], alfaCuerpo: number[] = [];
  let lr = 0, lg = 0, lb = 0, cx = 0, cy = 0, sw = 0;
  // centro y dispersión de la luz del cuadro con más energía
  let pico = { e: -1, x: 0, y: 0, d: 0 };
  let ahora = 0;
  for (const tt of ts) {
    // pura: se puede pedir cualquier tiempo; simulada: se avanza (a 120 Hz o más fino por dentro)
    if (tt > ahora + 1e-9) { inst.update(tt - ahora); ahora = tt; }
    clearFrame(fr);
    inst.draw(fr);
    const rgba = composite(fr, new Uint8ClampedArray(w * h * 4), null);
    cuadros.push(rgba);
    let e = 0, mt = 0, sx = 0, sy = 0, sxx = 0, syy = 0;
    const L = fr.light, C = fr.color;
    for (let i = 0; i < w * h; i++) {
      const c = C[i];
      if (c >>> 24) mt += (c >>> 24) / 255;
      const l = L[i];
      if (!(l & 0xffffff)) continue;
      const r = l & 255, g = (l >>> 8) & 255, b = (l >>> 16) & 255, k = (r + g + b) / 765;
      e += k;
      lr += r * k; lg += g * k; lb += b * k;
      const x = i % w, y = (i / w) | 0;
      sx += x * k; sy += y * k; sxx += x * x * k; syy += y * y * k;
    }
    cx += sx; cy += sy; sw += e;
    if (e > pico.e && e > 0) {
      const mx = sx / e, my = sy / e;
      pico = { e, x: mx, y: my, d: Math.sqrt(Math.max(0, sxx / e - mx * mx + syy / e - my * my)) };
    }
    energia.push(e);
    materia.push(mt);
    alfaCuerpo.push(usaCuerpo && mod.actorAlpha ? Math.max(0, Math.min(1, mod.actorAlpha(bucle ? tt % meta.duration : tt, inst.options))) : 1);
  }
  if (sw > 0) { cx /= sw; cy /= sw; }
  const n = cuadros.length;
  const ax = OX + m + (cfg.ancla?.[0] ?? 0), ay = OY + m + (cfg.ancla?.[1] ?? 0);
  return {
    lam: { w, h, ax, ay, ox: OX + m, oy: OY + m, cuadros },
    energia, materia, luzRgb: sw > 0 ? [lr / sw, lg / sw, lb / sw] : [0, 0, 0], centro: [cx, cy], dispersion: pico.d, alfaCuerpo, n, t, bucle,
  };
}

/** Borra la capa que teñía al muñeco: lo que cambia cuando cambian los colores del muñeco. */
function quitarCuerpo(cfg: CfgPfx, a: Crudo): void {
  const b = pintarCrudo(cfg, 1);
  const { w, h } = a.lam, s = siluetaHeroe();
  const dentro = new Uint8Array(w * h);
  const x0 = a.lam.ox - Math.floor(s.w / 2), y0 = a.lam.oy - s.h;
  // la silueta engordada 1 px (el borde del tinte)
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      if (!s.mask[y * s.w + x]) continue;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const X = x0 + x + dx, Y = y0 + y + dy;
          if (X >= 0 && Y >= 0 && X < w && Y < h) dentro[Y * w + X] = 1;
        }
    }
  const todo = cfg.cuerpo?.quitar === 'todo';
  for (let f = 0; f < a.n; f++) {
    const A = a.lam.cuadros[f], B = b.lam.cuadros[f];
    for (let i = 0; i < w * h; i++) {
      const j = i * 4;
      if (!A[j + 3] && !B[j + 3]) continue;
      const dif = Math.abs(A[j] - B[j]) + Math.abs(A[j + 1] - B[j + 1]) + Math.abs(A[j + 2] - B[j + 2]) + Math.abs(A[j + 3] - B[j + 3]);
      if (dif > 6 && (todo || dentro[i])) { A[j] = A[j + 1] = A[j + 2] = A[j + 3] = 0; }
    }
  }
}

/** Corta la cola casi invisible de un efecto que pasa una vez y la desvanece en los últimos cuadros. */
function cortarCola(cfg: CfgPfx, c: Crudo): void {
  if (c.bucle) return;
  const frac = cfg.cola ?? 0.006;
  const masa = c.lam.cuadros.map((q) => { let s = 0; for (let i = 3; i < q.length; i += 4) s += q[i]; return s / 255; });
  const pico = Math.max(...masa, 1e-6);
  let fin = masa.length;
  while (fin > 1 && masa[fin - 1] < pico * frac) fin--;
  // desvanecido de los últimos cuadros si se cortó o si se cortó por tiempo
  const cortado = fin < masa.length || (cfg.maxSeg !== undefined && cfg.maxSeg < modulo(cfg).meta.duration);
  c.lam.cuadros.length = fin; c.energia.length = fin; c.materia.length = fin; c.alfaCuerpo.length = fin; c.n = fin;
  if (cortado) {
    const K = Math.min(8, Math.max(2, Math.floor(fin / 4)));
    for (let k = 0; k < K; k++) {
      const f = fin - K + k, mul = 1 - (k + 1) / (K + 1);
      if (f < 0) continue;
      const q = c.lam.cuadros[f];
      for (let i = 3; i < q.length; i += 4) q[i] = Math.round(q[i] * mul);
      c.energia[f] *= mul;
    }
  }
  // el último cuadro termina vacío (o casi) como pide el contrato de un efecto que pasa una vez
  c.energia[fin - 1] = Math.min(c.energia[fin - 1], 0.04 * Math.max(...c.energia, 1e-6));
}

// ---------------------------------------------------------------------------------------------------------------
// recortes, rotaciones y escalas

/** Caja de contenido de varias láminas del mismo tamaño (incluye siempre el ancla). */
function caja(lams: Lamina[], umbral = 1): [number, number, number, number] {
  const { w, h } = lams[0];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const L of lams)
    for (const q of L.cuadros)
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
          if (q[(y * w + x) * 4 + 3] >= umbral) {
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
  const { ax, ay } = lams[0];
  if (x0 > x1) { x0 = ax - 1; x1 = ax; y0 = ay - 1; y1 = ay; }
  x0 = Math.min(x0, ax - 1); x1 = Math.max(x1, ax); y0 = Math.min(y0, ay - 1); y1 = Math.max(y1, ay);
  return [x0, y0, x1, y1];
}

function recortar(L: Lamina, x0: number, y0: number, w: number, h: number): Lamina {
  const cuadros = L.cuadros.map((q) => {
    const o = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      const sy = y + y0;
      if (sy < 0 || sy >= L.h) continue;
      const a = Math.max(0, -x0), b = Math.min(w, L.w - x0);
      if (b > a) o.set(q.subarray((sy * L.w + x0 + a) * 4, (sy * L.w + x0 + b) * 4), (y * w + a) * 4);
    }
    return o;
  });
  return { w, h, ax: L.ax - x0, ay: L.ay - y0, ox: L.ox - x0, oy: L.oy - y0, cuadros };
}

function espejar(L: Lamina): Lamina {
  // espeja alrededor del ancla: la columna x va a 2·ax - 1 - x, en un lienzo que la contiene
  const izq = L.ax, der = L.w - L.ax, W = 2 * Math.max(izq, der), off = Math.max(izq, der) - L.ax;
  const cuadros = L.cuadros.map((q) => {
    const o = new Uint8ClampedArray(W * L.h * 4);
    for (let y = 0; y < L.h; y++)
      for (let x = 0; x < L.w; x++) {
        const X = 2 * L.ax - 1 - x + off;
        o.set(q.subarray((y * L.w + x) * 4, (y * L.w + x) * 4 + 4), (y * W + X) * 4);
      }
    return o;
  });
  return { w: W, h: L.h, ax: L.ax + off, ay: L.ay, ox: 2 * L.ax - L.ox + off, oy: L.oy, cuadros };
}

/**
 * Rota (y escorza a lo largo de la marcha) como RotSprite: agranda 8x con Scale2x tres veces y muestrea con vecino
 * más cercano. `ang` en grados (y hacia abajo), `f` el factor a lo largo del eje x local antes de rotar.
 */
function rotarLamina(L: Lamina, piv: [number, number], ang: number, f: number): Lamina {
  const a = (ang * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
  // caja de destino: las esquinas transformadas
  const tf = (x: number, y: number): [number, number] => { const u = (x - piv[0]) * f, v = y - piv[1]; return [piv[0] + u * ca - v * sa, piv[1] + u * sa + v * ca]; };
  const esq = [tf(0, 0), tf(L.w, 0), tf(0, L.h), tf(L.w, L.h)];
  const X0 = Math.floor(Math.min(...esq.map((e) => e[0]))) - 1, Y0 = Math.floor(Math.min(...esq.map((e) => e[1]))) - 1;
  const X1 = Math.ceil(Math.max(...esq.map((e) => e[0]))) + 1, Y1 = Math.ceil(Math.max(...esq.map((e) => e[1]))) + 1;
  const W = X1 - X0, H = Y1 - Y0, K = 8;
  const cuadros = L.cuadros.map((q) => {
    const big = scale2xRaster(scale2xRaster(scale2xRaster({ w: L.w, h: L.h, data: q })));
    const o = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const dx = x + X0 + 0.5 - piv[0], dy = y + Y0 + 0.5 - piv[1];
        const u = (dx * ca + dy * sa) / f, v = -dx * sa + dy * ca;
        const sx = Math.floor((piv[0] + u) * K), sy = Math.floor((piv[1] + v) * K);
        if (sx < 0 || sy < 0 || sx >= big.w || sy >= big.h) continue;
        const s = (sy * big.w + sx) * 4;
        if (big.data[s + 3]) o.set(big.data.subarray(s, s + 4), (y * W + x) * 4);
      }
    return o;
  });
  // el ancla no rota: queda en el piso bajo el pivote, a la misma distancia vertical
  const [px, py] = tf(L.ox, L.oy);
  return { w: W, h: H, ax: L.ax - X0, ay: L.ay - Y0, ox: px - X0, oy: py - Y0, cuadros };
}

/**
 * Reparte el efecto en tajadas verticales (cortadas donde hay menos contenido) y apoya cada tajada sobre la línea del
 * piso en la dirección pedida: lo que está de pie sigue de pie y la línea de avance queda en 2:1.
 */
function tajadasSuelo(L: Lamina, dx: number, dy: number): Lamina {
  const { w, h, ox } = L;
  // masa por columna sumando todos los cuadros
  const masa = new Float64Array(w);
  for (const q of L.cuadros) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) masa[x] += q[(y * w + x) * 4 + 3];
  // cortes cada ~7 px en el mínimo local
  const cortes = [0];
  for (let x = 4; x < w - 3;) {
    let mejor = x;
    for (let k = x; k < Math.min(w - 1, x + 6); k++) if (masa[k] < masa[mejor]) mejor = k;
    if (mejor - cortes[cortes.length - 1] >= 3) cortes.push(mejor);
    x = mejor + 4;
  }
  cortes.push(w);
  const tajadas = cortes.slice(0, -1).map((a, i) => ({ a, b: cortes[i + 1], u: (a + cortes[i + 1]) / 2 - ox }));
  const off = tajadas.map((s) => [Math.round(s.u * dx - s.u), Math.round(s.u * dy)] as [number, number]);
  const mx = Math.min(0, ...off.map((o) => o[0])), Mx = Math.max(0, ...off.map((o) => o[0]));
  const my = Math.min(0, ...off.map((o) => o[1])), My = Math.max(0, ...off.map((o) => o[1]));
  const W = w + Mx - mx, H = h + My - my;
  // de lo lejano (arriba en pantalla) a lo cercano
  const orden = tajadas.map((_, i) => i).sort((i, j) => off[i][1] - off[j][1] || (dy >= 0 ? tajadas[i].u - tajadas[j].u : tajadas[j].u - tajadas[i].u));
  const cuadros = L.cuadros.map((q) => {
    const o = new Uint8ClampedArray(W * H * 4);
    for (const i of orden) {
      const s = tajadas[i], [ox2, oy2] = off[i];
      for (let y = 0; y < h; y++)
        for (let x = s.a; x < s.b; x++) {
          const j = (y * w + x) * 4;
          if (!q[j + 3]) continue;
          const X = x + ox2 - mx, Y = y + oy2 - my, k = (Y * W + X) * 4, al = q[j + 3] / 255;
          // compone sobre lo de atrás
          const ab = o[k + 3] / 255, oa = al + ab * (1 - al);
          for (let c = 0; c < 3; c++) o[k + c] = (q[j + c] * al + o[k + c] * ab * (1 - al)) / Math.max(oa, 1e-6);
          o[k + 3] = oa * 255;
        }
    }
    return o;
  });
  return { w: W, h: H, ax: L.ax - mx, ay: L.ay - my, ox: L.ox - mx, oy: L.oy - my, cuadros };
}

/** Pone varias láminas en un lienzo común, todas con el ancla en el mismo punto. */
function alinear(lams: Lamina[]): Lamina[] {
  const izq = Math.max(...lams.map((l) => l.ax)), der = Math.max(...lams.map((l) => l.w - l.ax));
  const arr = Math.max(...lams.map((l) => l.ay)), aba = Math.max(...lams.map((l) => l.h - l.ay));
  const W = Math.ceil(izq + der), H = Math.ceil(arr + aba);
  return lams.map((l) => {
    const dx = Math.round(izq - l.ax), dy = Math.round(arr - l.ay);
    return { ...recortar(l, -dx, -dy, W, H) };
  });
}

function agrandar(q: Uint8ClampedArray, w: number, h: number, k: number): Uint8ClampedArray {
  if (k === 1) return q;
  const o = new Uint8ClampedArray(w * k * h * k * 4);
  const s32 = new Uint32Array(q.buffer, q.byteOffset, w * h), d32 = new Uint32Array(o.buffer);
  for (let y = 0; y < h * k; y++) {
    const sy = (y / k) | 0;
    for (let x = 0; x < w * k; x++) d32[y * w * k + x] = s32[sy * w + ((x / k) | 0)];
  }
  return o;
}

// ---------------------------------------------------------------------------------------------------------------
// el efecto terminado

interface Hecho {
  cfg: CfgPfx;
  /** cuadros por dirección (1 o 8), cada uno RGBA de celda[0] × celda[1] a la escala final */
  dirs: Uint8ClampedArray[][];
  celda: [number, number];
  ancla: [number, number];
  escala: number;
  t: number;
  bucle: boolean;
  luz: LuzEfecto;
  mezcla: 'normal' | 'aditiva';
  alfaCuerpo?: number[];
}

const HECHOS = new Map<string, Hecho>();

const cfgDe = (id: string): CfgPfx => {
  const c = CATALOGO_PFX.find((x) => x.id === id);
  if (!c) throw new Error(`efecto pfx desconocido: ${id}`);
  return c;
};

/** Pinta y procesa un efecto completo (se guarda: la segunda vez sale de la memoria). */
function hacer(id: string): Hecho {
  const ya = HECHOS.get(id);
  if (ya) return ya;
  const cfg = cfgDe(id);
  const crudo = pintarCrudo(cfg, 0);
  if (cfg.cuerpo?.quitar) quitarCuerpo(cfg, crudo);
  const g: Gradacion = { ...GRADACION_BASE, blanco: nucleo(cfg.elemento), ...(VIOLETAS.includes(cfg.elemento) ? { violeta: 0 } : {}), ...(cfg.gradacion ?? {}) };
  for (const q of crudo.lam.cuadros) gradar(q, g);
  cortarCola(cfg, crudo);
  // recorte a 1x (la pantalla va entera: es el cuadro de 320 × 180)
  const pantalla = cfg.capa === 'pantalla';
  const [x0, y0, x1, y1] = caja([crudo.lam], 1);
  const base = pantalla ? crudo.lam : recortar(crudo.lam, x0 - 1, y0 - 1, x1 - x0 + 3, y1 - y0 + 3);
  // direcciones
  let lams: Lamina[];
  if (cfg.dir) {
    const d = cfg.dir, por: Partial<Record<(typeof DIRS_PODER)[number], Lamina>> = {};
    for (const nom of ['e', 'se', 'ne', 's', 'n'] as const) {
      const dp = DIR_PANTALLA[nom];
      if (d.modo === 'vuelo') {
        const piv: [number, number] = [base.ox + (d.pivote?.[0] ?? 0), base.oy + (d.pivote?.[1] ?? 0)];
        const f = Math.pow(dp.largo, d.escorzo ?? 0.5);
        por[nom] = nom === 'e' ? base : rotarLamina(base, piv, dp.ang * (d.giro ?? 1), f);
      } else {
        const a = (dp.ang * Math.PI) / 180, L = dp.largo;
        por[nom] = nom === 'e' ? base : tajadasSuelo(base, Math.cos(a) * L, Math.sin(a) * L);
      }
    }
    lams = DIRS_PODER.map((nom) => { const e = DIR_PANTALLA[nom].espejo; return e ? espejar(por[e]!) : por[nom]!; });
    lams = alinear(lams);
  } else lams = [base];
  // escala final y recorte común
  const k = cfg.escala ?? (pantalla ? 1 : ESCALA);
  const grandes: Lamina[] = lams.map((l) => ({ w: l.w * k, h: l.h * k, ax: l.ax * k, ay: l.ay * k, ox: l.ox * k, oy: l.oy * k, cuadros: l.cuadros.map((q) => agrandar(q, l.w, l.h, k)) }));
  let celda: [number, number], ancla: [number, number], dirs: Uint8ClampedArray[][];
  if (pantalla) {
    celda = [grandes[0].w, grandes[0].h];
    ancla = [0, 0];
    dirs = grandes.map((l) => l.cuadros);
  } else {
    const [a0, b0, a1, b1] = caja(grandes, ALFA_MIN);
    const r = grandes.map((l) => recortar(l, a0 - 1, b0 - 1, a1 - a0 + 3, b1 - b0 + 3));
    celda = [r[0].w, r[0].h];
    ancla = [Math.round(r[0].ax), Math.round(r[0].ay)];
    dirs = r.map((l) => l.cuadros);
  }
  const luz = luzDe(cfg, crudo, k);
  const mezcla = cfg.luz?.mezcla ?? luz.mezcla ?? 'aditiva';
  const hecho: Hecho = {
    cfg, dirs, celda, ancla, escala: k, t: crudo.t, bucle: crudo.bucle, luz, mezcla,
    ...(cfg.cuerpo?.alfa ? { alfaCuerpo: crudo.alfaCuerpo.map((a) => Math.round(a * 100) / 100) } : {}),
  };
  HECHOS.set(id, hecho);
  return hecho;
}

// ---------------------------------------------------------------------------------------------------------------
// luz dinámica

const r2 = (x: number) => Math.round(Math.max(0, Math.min(1, x)) * 100) / 100;
const PRIORIDAD: Record<CategoriaPfx, 0 | 1 | 2 | 3> = {
  fuego: 1, explosiones: 0, agua: 2, hielo: 1, rayo: 0, cuerpo_a_cuerpo: 1, impactos: 1, proyectiles: 1, aparicion: 1, arcano: 1,
  sagrado: 1, sombra: 1, estado: 3, naturaleza: 2, clima: 3, botin: 2, criaturas: 3, transiciones: 3,
};

function luzDe(cfg: CfgPfx, c: Crudo, k: number): LuzEfecto {
  const pico = Math.max(...c.energia, 0);
  const n = c.n;
  // los de pantalla (clima, transiciones) no prenden luz salvo que el catálogo la pida (tormenta)
  const sinLuz = pico < 4 || (cfg.capa === 'pantalla' && !cfg.luz?.intensidad);
  const curva = sinLuz ? Array.from({ length: n }, () => 0) : c.energia.map((e) => r2(e / pico));
  // color: el promedio de la luz con el máximo en 255, apenas desaturado
  const [lr, lg, lb] = c.luzRgb, mx = Math.max(lr, lg, lb, 1);
  const l = (lr + lg + lb) / 3;
  const col = [lr, lg, lb].map((v) => (l + (v - l) * 0.85) * (255 / mx)).map((v) => Math.max(0, Math.min(255, Math.round(v))));
  const color = sinLuz ? hexDe(rgbHex(RAMPAS[cfg.elemento][6]).map((v) => v)) : hexDe(col);
  // radio e intensidad: crecen con la luz total del cuadro pico y con lo que se abre
  const radio = sinLuz ? 0 : Math.round(Math.max(60, Math.min(360, 46 + 5.2 * Math.sqrt(pico) + 1.2 * c.dispersion * k)) / 2) * 2;
  const intensidad = sinLuz ? 0 : r2(0.3 + 0.7 * Math.min(1, Math.sqrt(pico / 900)));
  const altura = Math.max(4, Math.round((c.lam.ay - c.centro[1]) * k));
  // parpadeo: cuánto salta la curva de un cuadro al siguiente, más lo que pide el elemento
  let salto = 0;
  for (let i = 1; i < n; i++) salto += Math.abs(curva[i] - curva[i - 1]);
  const extra = cfg.elemento === 'rayo' ? 0.3 : cfg.elemento === 'fuego' || cfg.elemento === 'brasa' ? 0.12 : 0.04;
  const parpadeo = sinLuz ? 0 : r2(Math.min(0.6, (salto / Math.max(1, n - 1)) * 1.5 + extra));
  const materia = c.materia.reduce((a, b) => a + b, 0), energia = c.energia.reduce((a, b) => a + b, 0);
  const mezcla: 'normal' | 'aditiva' = materia > energia * 1.6 ? 'normal' : 'aditiva';
  const vuela = cfg.dir?.modo === 'vuelo' && c.bucle && cfg.categoria !== 'cuerpo_a_cuerpo';
  const base: LuzEfecto = {
    color, radio, intensidad, curva, altura, parpadeo,
    ...(vuela ? { enVuelo: true } : {}),
    sombra: intensidad >= 0.6 && radio >= 160 && !['estado', 'criaturas', 'botin', 'clima'].includes(cfg.categoria),
    prioridad: PRIORIDAD[cfg.categoria],
    mezcla,
  };
  const o = { ...base, ...(cfg.luz ?? {}) };
  if (cfg.luz?.curva === undefined) o.curva = curva;
  return o;
}

const hexDe = (c: readonly number[]) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

// ---------------------------------------------------------------------------------------------------------------
// API pública

/** Lista de los efectos mudados (sin pintar: celda y ancla se miden la primera vez que se leen). */
export const EFECTOS_PFX: readonly CfgPfx[] = CATALOGO_PFX;

/** Ids del manifiesto. */
export const IDS_PFX: readonly string[] = CATALOGO_PFX.map((c) => c.id);

/** Un cuadro de un efecto: `dir` índice en DIRS_PODER o su nombre (los no direccionales lo ignoran). */
export function pintarEfectoPfx(id: string, dir: number | string, f: number): { img: Raster; ancla: [number, number] } {
  const h = hacer(id);
  const di = h.dirs.length === 1 ? 0 : typeof dir === 'string' ? Math.max(0, (DIRS_PODER as readonly string[]).indexOf(dir)) : ((dir % 8) + 8) % 8;
  const q = h.dirs[di];
  const n = q.length, ff = h.bucle ? ((f % n) + n) % n : Math.max(0, Math.min(n - 1, f));
  return { img: { w: h.celda[0], h: h.celda[1], data: q[ff] }, ancla: h.ancla };
}

/** Datos del manifiesto de un efecto (pinta el efecto si hace falta). */
export function efectoPfx(id: string): EfectoPfx {
  const h = hacer(id), c = h.cfg;
  const n = h.dirs[0].length;
  const columnas = Math.max(1, Math.min(n, Math.floor(ANCHO_HOJA / h.celda[0])));
  return {
    id: c.id, origen: c.origen, nombre: c.nombre, categoria: c.categoria, capa: c.capa ?? 'mundo', archivo: `${c.id}.png`,
    cuadros: n, t: h.t, bucle: h.bucle, direccional: h.dirs.length > 1, filas: h.dirs.length > 1 ? [...DIRS_PODER] : null,
    columnas, filasPorDir: Math.ceil(n / columnas), celda: h.celda, ancla: h.ancla, escala: h.escala, mezcla: h.mezcla,
    ...(c.detrasEn ? { detrasEn: c.detrasEn } : {}),
    ...(c.enLanzador ? { enLanzador: true } : {}),
    ...(h.alfaCuerpo || c.cuerpo?.tinte ? { cuerpo: { ...(h.alfaCuerpo ? { alfa: h.alfaCuerpo } : {}), ...(c.cuerpo?.tinte ? { tinte: c.cuerpo.tinte } : {}) } } : {}),
    luz: h.luz, uso: c.uso, ...(c.notas ? { notas: c.notas } : {}),
  };
}

/**
 * Hoja de un efecto: cada dirección ocupa `filasPorDir` filas de `columnas` celdas (el cuadro i de la dirección d está
 * en la columna i % columnas, fila d · filasPorDir + floor(i / columnas)).
 */
export function hojaEfectoPfx(id: string): { img: Raster; efecto: EfectoPfx } {
  const h = hacer(id), e = efectoPfx(id);
  const [cw, ch] = e.celda, filas = h.dirs.length * e.filasPorDir;
  const img = createRaster(cw * e.columnas, ch * filas);
  h.dirs.forEach((cuadros, d) => cuadros.forEach((q, i) => {
    const X = (i % e.columnas) * cw, Y = (d * e.filasPorDir + Math.floor(i / e.columnas)) * ch;
    for (let y = 0; y < ch; y++) img.data.set(q.subarray(y * cw * 4, (y + 1) * cw * 4), ((Y + y) * img.w + X) * 4);
  }));
  return { img, efecto: e };
}

/** PNG de la hoja con paleta de hasta 256 colores con alfa (liviano). */
export function pngEfectoPfx(id: string): Uint8Array {
  const { img } = hojaEfectoPfx(id);
  return pngLiviano(img);
}

/** Olvida lo pintado (para medir de nuevo o liberar memoria). */
export function olvidarEfectosPfx(id?: string): void {
  if (id) HECHOS.delete(id);
  else HECHOS.clear();
}

export interface ManifiestoPfx {
  formato: string;
  version: number;
  cuadros_por_segundo: number;
  persona_px: number;
  direcciones: readonly string[];
  notas: string;
  creditos: string;
  efectos: EfectoPfx[];
}

/** Manifiesto a partir de efectos ya medidos. */
export function manifiestoDe(efectos: EfectoPfx[]): ManifiestoPfx {
  return {
    formato: 'pixelforja-gotico-efectos-pfx', version: 1, cuadros_por_segundo: CPS, persona_px: 75, direcciones: DIRS_PODER, notas: NOTAS_MANIFIESTO,
    creditos: CREDITOS_PFX, efectos,
  };
}

/** Manifiesto completo para el juego (pinta todos los efectos: tarda). */
export function manifiestoEfectosPfx(): ManifiestoPfx {
  return manifiestoDe(CATALOGO_PFX.map((c) => efectoPfx(c.id)));
}

/** La luz de todos los efectos en el formato de luz_efectos.json (va en datos/luz_efectos_pfx.json). */
export function luzEfectosPfxJson(manifiesto: { efectos: EfectoPfx[] } = manifiestoEfectosPfx()): { formato: string; version: number; cuadros_por_segundo: number; notas: string; efectos: Record<string, LuzEfecto> } {
  const efectos: Record<string, LuzEfecto> = {};
  for (const e of [...manifiesto.efectos].sort((a, b) => (a.id < b.id ? -1 : 1))) efectos[e.id] = e.luz;
  return {
    formato: 'pixelforja-gotico-luz-efectos', version: 1, cuadros_por_segundo: CPS,
    notas: 'Luz de los efectos mudados de pixelfx (efectos_pfx.json), mismo formato que luz_efectos.json: radio y altura en px de pantalla, luz del cuadro = intensidad * curva[cuadro]; curva sacada de la energía del buffer de luz de cada efecto.',
    efectos,
  };
}

export const NOTAS_MANIFIESTO =
  'Hojas PNG RGBA con alfa directa. Cuadro i de la dirección d: columna i % columnas, fila d * filasPorDir + floor(i / columnas). ' +
  'Animación: cuadro = floor(segundos * 25 / t) (bucle: % cuadros; si no, el último y se termina). Ancla: el pixel que va sobre el punto del piso ' +
  '(los proyectiles: el piso bajo la bola; el juego los mueve). Direcciones en el orden de DIRS_PODER (s, so, o, no, n, ne, e, se), como poderes.json. ' +
  "capa 'pantalla': el cuadro cubre la pantalla, escalarlo entero (x3 a 960x540) con vecino más cercano. mezcla 'aditiva': color * alfa sumado; " +
  "'normal': alfa común. cuerpo.tinte: teñir el sprite del afectado con ese color y fuerza; cuerpo.alfa: visibilidad del sprite por cuadro. " +
  'detrasEn: direcciones en las que el efecto va detrás del que lo lanza.';

export const CREDITOS_PFX =
  'Efectos adaptados de pixelfx (https://github.com/patch-gg/pixelfx), MIT, Copyright (c) 2026 Patch y Copyright (c) 2026 Hugo Duprez ' +
  '(Sprite Fusion, https://www.spritefusion.com/pixel-art-vfx); partes de Hollow Crown (rehan-remade), MIT. Ver LICENSE-pixelfx.txt y NOTICE-pixelfx.md.';

export const LEEME_PFX = `Efectos de pixelfx mudados al taller gótico de Réquiem de Ceniza.

Créditos: ${CREDITOS_PFX}
Las hojas son derivados de esos efectos (repintados con las paletas góticas, escalados x2, con piso isométrico 2:1,
sin muñeco y en 8 direcciones); siguen bajo la licencia MIT, que va en LICENSE-pixelfx.txt.

Cada efecto es una hoja PNG con paleta (hasta 256 colores con alfa). efectos_pfx.json trae por efecto: id (fx_...),
nombre [es, en], categoria, capa (mundo, piso: debajo de los personajes, pantalla: cubre la pantalla), archivo,
cuadros, t (ticks por cuadro a 25 por segundo), bucle, direccional, filas (orden de las direcciones), columnas y
filasPorDir (cómo se parte la hoja), celda [ancho, alto], ancla [x, y], escala, mezcla, enLanzador, detrasEn, cuerpo
(tinte y visibilidad del sprite afectado), luz (como luz_efectos.json) y uso (para qué sirve en el juego).

${NOTAS_MANIFIESTO}
`;

/** Ids de pixelfx que se mudaron, por si hace falta buscar el original. */
export const ORIGENES_PFX: Record<string, string> = Object.fromEntries(CATALOGO_PFX.map((c) => [c.id, c.origen]));

