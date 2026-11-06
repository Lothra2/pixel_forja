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
import { GRADACION_BASE, GRADACION_ELEMENTO, RAMPAS, VIOLETAS, gradar, nucleo, rampa, rgbHex, type Gradacion, type NombreRampa } from './efectos_pfx_paletas';
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
  | { tipo: 'monstruo'; monstruos: string[]; nota?: string }
  | { tipo: 'estado'; estado: string; nota?: string }
  | { tipo: 'clima'; actos: number[]; zonas?: string[]; nota?: string }
  | { tipo: 'ambiente'; zonas: string[]; nota?: string }
  | { tipo: 'botin'; nota: string }
  | { tipo: 'muerte'; nota: string }
  | { tipo: 'cinematica'; nota: string }
  | { tipo: 'golpe'; nota: string };

/** Dónde vive el efecto: en el mundo, pegado al piso, o sobre toda la pantalla. */
export type CapaPfx = 'mundo' | 'piso' | 'pantalla';

/** Cómo se sacan las 8 direcciones de un efecto que mira a la derecha. */
export interface DirPfx {
  /**
   * vuelo: rotar el sprite; suelo: repartirlo en tajadas sobre la línea del piso; punto: el efecto pega en un punto
   * delante del que lo lanza (martillazo, hachazo) y solo se corre ese punto por la línea 2:1, sin girar nada
   */
  modo: 'vuelo' | 'suelo' | 'punto';
  /** distancia (local, 1x) del punto de impacto en el modo punto; por omisión, el centro de la luz */
  distancia?: number;
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
  /** ticks por cuadro a 25 por segundo (1 = 25 cps, 2 = 12.5 cps, 3 = 8.3 cps, 4 = 6.25 cps) */
  t?: 1 | 2 | 3 | 4;
  /**
   * ventana [desde, hasta] (segundos del original) a 25 cps en un efecto que pasa una vez: el impacto de una
   * explosión, que a 12.5 cps salta. El efecto sale con t 1; antes y después de la ventana sigue a 12.5 cps con cada
   * cuadro repetido dos veces. El atlas guarda una sola vez los repetidos (no pesan) y el juego no cambia nada: es un
   * t 1 común
   */
  rapido25?: [number, number];
  /** escala entera de salida (2 en el mundo; 1 en los de pantalla, que el juego estira para cubrirla) */
  escala?: number;
  /** punto local (1x) que va sobre el piso: el ancla. Proyectiles: el piso debajo de la bola */
  ancla?: [number, number];
  /** margen del lienzo a 1x para que nada se corte */
  margen?: number;
  /** cuerpo: qué hacer con lo que el efecto pinta sobre el muñeco */
  cuerpo?: {
    /**
     * borrar lo que depende del color del muñeco: 'silueta' solo adentro de la silueta, 'todo' también afuera;
     * 'mascara' borra todo lo que cae sobre la silueta engordada 2 px (efectos que son el cuerpo mismo encendido);
     * 'forma' borra en todos lados lo que sigue a la forma del cuerpo (estelas con su silueta, contornos)
     */
    quitar?: 'silueta' | 'todo' | 'mascara' | 'forma';
    /** rampa para los colores del muñeco (lo que sale del cuerpo y queda: astillas, ceniza) */
    rampa?: NombreRampa;
    /** exportar la curva de visibilidad del sprite (el efecto lo hace desaparecer o aparecer) */
    alfa?: boolean;
    /** tinte sugerido para el sprite del que sufre el efecto */
    tinte?: { color: string; fuerza: number; nota?: string };
  };
  gradacion?: Partial<Gradacion>;
  /** multiplica el alfa de todo el efecto (espectros translúcidos) */
  opacidad?: number;
  /** fracción de la energía máxima bajo la que se corta la cola de un efecto que pasa una vez (0 = no cortar) */
  cola?: number;
  /** máximo de segundos (los largos se cortan con un desvanecido) */
  maxSeg?: number;
  /** recorta el efecto a una ventana de tiempo [desde, hasta] en segundos del original */
  ventana?: [number, number];
  luz?: Partial<LuzEfecto>;
  /** el efecto se centra en el que lo lanza (novas, auras, cargas): el juego lo pone en sus pies */
  enLanzador?: boolean;
  /**
   * copias del efecto sobre el piso (desplazamientos x, y a 1x, de atrás hacia adelante) para que algo que pixelfx
   * pinta como una franja de perfil (una nube que se arrastra por el piso) cubra un área 2:1; en los bucles cada
   * copia va desfasada
   */
  relleno?: [number, number][];
  /** en qué direcciones va detrás del que lo lanza (tajos y alientos pegados al cuerpo) */
  detrasEn?: (typeof DIRS_PODER)[number][];
  /** solo para cinemáticas (un astro del cielo, una toma de costado): no va en el mundo y no prende luz dinámica */
  soloCinematica?: boolean;
  uso: UsoPfx[];
  notas?: string;
}

/**
 * Un cuadro en el atlas: [página, x, y, ancho, alto, dx, dy]. (x, y, ancho, alto) es el rectángulo en la página, a 1x;
 * (dx, dy) es dónde va su esquina de arriba a la izquierda respecto del ancla, a 1x (multiplicar por `escala` al dibujar).
 * Un cuadro vacío tiene ancho y alto 0.
 */
export type CuadroAtlas = [number, number, number, number, number, number, number];

/** Una dirección: sus cuadros, o el espejo horizontal de otra (`de`), reflejado alrededor del ancla. */
export interface DireccionPfx {
  dir: string | null;
  espejo: boolean;
  de?: string;
  cuadros?: CuadroAtlas[];
}

/** Una página del atlas. */
export interface PaginaPfx {
  archivo: string;
  w: number;
  h: number;
  bytes: number;
}

/** Lo que va al manifiesto por efecto. */
export interface EfectoPfx {
  id: string;
  origen: string;
  nombre: [string, string];
  categoria: CategoriaPfx;
  capa: CapaPfx;
  cuadros: number;
  t: number;
  bucle: boolean;
  direccional: boolean;
  /** escala de dibujo: el atlas está a 1x y se dibuja así, con vecino más cercano */
  escala: number;
  /** caja de todo el efecto respecto del ancla, a 1x: [x0, y0, x1, y1] (para recortar y ordenar) */
  caja: [number, number, number, number];
  /** páginas del atlas */
  paginas: PaginaPfx[];
  /** Mpx decodificados de todas las páginas (para cargar bajo demanda y descargar) */
  peso: number;
  /** en el orden de DIRS_PODER (s, so, o, no, n, ne, e, se), o una sola con dir null */
  direcciones: DireccionPfx[];
  mezcla: 'normal' | 'aditiva';
  detrasEn?: string[];
  enLanzador?: boolean;
  /** solo para cinemáticas: el juego no lo pone en el mundo */
  soloCinematica?: true;
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
/** alfa (0..255) bajo la que un pixel se borra antes de armar el atlas */
const ALFA_PISO = 10;
/** límites de cada página del atlas: lado y Mpx (iOS Safari no sube a textura imágenes más grandes) */
export const LADO_MAX = 4096;
export const PX_MAX = 4_000_000;

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
  /** el cuadro repite al anterior (la cola a 12.5 cps de un arranque a 25) */
  repetido: boolean[];
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
function actorDe(cfg: CfgPfx, variante: 0 | 1 | 2): ActorPfx {
  const s0 = siluetaHeroe();
  // la variante 2 (modo forma) adelgaza la silueta 2 px por lado: lo que siga a la forma del cuerpo sale distinto
  const s = variante === 2 ? { ...s0, mask: s0.mask.map((v, i) => { const x = i % s0.w, y = (i / s0.w) | 0; return v && s0.mask[y * s0.w + Math.max(0, x - 2)] && s0.mask[y * s0.w + Math.min(s0.w - 1, x + 2)] ? 1 : 0; }) } : s0;
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

/**
 * Ticks por cuadro según el presupuesto de memoria: 25 cps donde se nota (golpes e impactos cortos, efectos rápidos);
 * 12.5 cps en los direccionales en bucle o largos (como los poderes), los que pasan una vez y duran más de 1.6 s, los
 * bucles de más de 2 s, los golpes largos (polvo que queda) y las transiciones; 8.3 cps en el clima lento y 6.25 en el
 * cielo de cinemática (aurora, nubes) y la niebla. Nunca menos de 12.5 cps en golpes e impactos.
 */
function tPorOmision(cfg: CfgPfx, meta: ModuloPfx['meta']): 1 | 2 | 3 | 4 {
  if (cfg.categoria === 'clima') return 3;
  if (cfg.categoria === 'transiciones') return 2;
  const dur = Math.min(meta.duration, cfg.maxSeg ?? Infinity);
  if (cfg.categoria === 'impactos' || cfg.categoria === 'cuerpo_a_cuerpo') return dur > 1.2 ? 2 : 1;
  if (cfg.dir && (meta.loop || dur > 1.5)) return 2;
  if (dur > (meta.loop ? 2 : 1.6)) return 2;
  return 1;
}

/** Tiempos de los cuadros: los bucles reparten su período en cuadros enteros (empalma), los otros a 25/t por segundo. */
function tiempos(cfg: CfgPfx, meta: ModuloPfx['meta']): { ts: number[]; t: number; bucle: boolean } {
  const t = cfg.t ?? tPorOmision(cfg, meta), dt = t / CPS, D = meta.duration, bucle = !!meta.loop;
  if (bucle) {
    const n = Math.max(2, Math.round(D / dt));
    return { ts: Array.from({ length: n }, (_, i) => (i * D) / n), t, bucle };
  }
  const [a, b] = cfg.ventana ?? [0, D];
  const fin = Math.min(b, cfg.maxSeg !== undefined ? a + cfg.maxSeg : b);
  if (cfg.rapido25 && !bucle) {
    // la ventana del impacto cuadro a cuadro a 25 por segundo; lo de antes y lo de después a 12.5, cada tiempo dos
    // veces (dos ticks)
    const [w0, w1] = cfg.rapido25, ts: number[] = [];
    let x = a;
    for (; x < Math.min(fin, w0) - 1e-9; x += 2 / CPS) ts.push(x, x);
    for (; x < Math.min(fin, w1) - 1e-9; x += 1 / CPS) ts.push(x);
    for (; x < fin - 1e-9; x += 2 / CPS) ts.push(x, x);
    return { ts, t: 1, bucle };
  }
  const n = Math.max(1, Math.ceil((fin - a) / dt - 1e-9));
  return { ts: Array.from({ length: n }, (_, i) => a + i * dt), t, bucle };
}

/** Pinta todos los cuadros a 1x en un lienzo con margen. Devuelve RGBA con alfa directa, más la luz medida. */
function pintarCrudo(cfg: CfgPfx, variante: 0 | 1 | 2 = 0): Crudo {
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
  const cuadros: Uint8ClampedArray[] = [], energia: number[] = [], materia: number[] = [], alfaCuerpo: number[] = [], repetido: boolean[] = [];
  let lr = 0, lg = 0, lb = 0, cx = 0, cy = 0, sw = 0;
  // centro y dispersión de la luz del cuadro con más energía
  let pico = { e: -1, x: 0, y: 0, d: 0 };
  let ahora = 0;
  for (let it = 0; it < ts.length; it++) {
    const tt = ts[it];
    // el mismo tiempo que el anterior (la cola a 12.5 cps de un arranque a 25): el mismo cuadro
    if (it > 0 && tt === ts[it - 1]) {
      cuadros.push(cuadros[it - 1].slice()); energia.push(energia[it - 1]); materia.push(materia[it - 1]); alfaCuerpo.push(alfaCuerpo[it - 1]); repetido.push(true);
      continue;
    }
    repetido.push(false);
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
    energia, materia, luzRgb: sw > 0 ? [lr / sw, lg / sw, lb / sw] : [0, 0, 0], centro: [cx, cy], dispersion: pico.d, alfaCuerpo, repetido, n, t, bucle,
  };
}

/** Borra la capa que teñía al muñeco: lo que cambia cuando cambian los colores del muñeco. */
function quitarCuerpo(cfg: CfgPfx, a: Crudo): void {
  const mascara = cfg.cuerpo?.quitar === 'mascara', forma = cfg.cuerpo?.quitar === 'forma';
  const b = mascara ? a : pintarCrudo(cfg, forma ? 2 : 1);
  const { w, h } = a.lam, s = siluetaHeroe();
  const dentro = new Uint8Array(w * h);
  const x0 = a.lam.ox - Math.floor(s.w / 2), y0 = a.lam.oy - s.h;
  // la silueta engordada 1 px (el borde del tinte; 2 px en el modo máscara)
  const G = mascara ? 2 : 1;
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      if (!s.mask[y * s.w + x]) continue;
      for (let dy = -G; dy <= G; dy++)
        for (let dx = -G; dx <= G; dx++) {
          const X = x0 + x + dx, Y = y0 + y + dy;
          if (X >= 0 && Y >= 0 && X < w && Y < h) dentro[Y * w + X] = 1;
        }
    }
  const todo = cfg.cuerpo?.quitar === 'todo' || forma;
  for (let f = 0; f < a.n; f++) {
    const A = a.lam.cuadros[f], B = b.lam.cuadros[f];
    for (let i = 0; i < w * h; i++) {
      const j = i * 4;
      if (!A[j + 3] && !B[j + 3]) continue;
      const dif = Math.abs(A[j] - B[j]) + Math.abs(A[j + 1] - B[j + 1]) + Math.abs(A[j + 2] - B[j + 2]) + Math.abs(A[j + 3] - B[j + 3]);
      if (mascara ? dentro[i] && A[j + 3] > 0 : dif > 6 && (todo || dentro[i])) { A[j] = A[j + 1] = A[j + 2] = A[j + 3] = 0; }
    }
  }
}

/** Compone copias desplazadas (y desfasadas si es bucle) del efecto: de una franja hace un área sobre el piso. */
function rellenar(offs: [number, number][], c: Crudo): void {
  const { w, h } = c.lam, n = c.n, orig = c.lam.cuadros.map((q) => q.slice());
  const orden = [...offs.keys()].sort((a, b) => offs[a][1] - offs[b][1]);
  for (let f = 0; f < n; f++) {
    const o = new Uint8ClampedArray(w * h * 4);
    orden.forEach((k, rango) => {
      const [dx, dy] = offs[k], src = orig[c.bucle ? (f + Math.round((k * n) / offs.length)) % n : f];
      // las copias de atrás, más apagadas; la línea de piso de cada copia (salvo la de adelante) casi no se ve
      const delante = rango === orden.length - 1, mul = 0.55 + 0.45 * (rango / Math.max(1, orden.length - 1));
      for (let y = 0; y < h; y++) {
        const Y = y + dy;
        if (Y < 0 || Y >= h) continue;
        const linea = !delante && Math.abs(y - c.lam.oy) <= 2 ? 0.3 : 1;
        for (let x = 0; x < w; x++) {
          const X = x + dx, j = (y * w + x) * 4;
          if (X < 0 || X >= w || !src[j + 3]) continue;
          const i = (Y * w + X) * 4, a = (src[j + 3] / 255) * mul * linea, b = o[i + 3] / 255, oa = a + b * (1 - a);
          for (let ch = 0; ch < 3; ch++) o[i + ch] = (src[j + ch] * a + o[i + ch] * b * (1 - a)) / Math.max(oa, 1e-6);
          o[i + 3] = oa * 255;
        }
      }
    });
    c.lam.cuadros[f] = o;
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
  c.lam.cuadros.length = fin; c.energia.length = fin; c.materia.length = fin; c.alfaCuerpo.length = fin; c.repetido.length = fin; c.n = fin;
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
  // cortes cada ~10 px en el mínimo local (una púa o una mata entera por tajada)
  const cortes = [0];
  for (let x = 6; x < w - 4;) {
    let mejor = x;
    for (let k = x; k < Math.min(w - 1, x + 8); k++) if (masa[k] < masa[mejor]) mejor = k;
    if (mejor - cortes[cortes.length - 1] >= 4) cortes.push(mejor);
    x = mejor + 6;
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
          const X = x + ox2 - mx, Y = y + oy2 - my, k = (Y * W + X) * 4;
          // lo sólido de adelante tapa lo de atrás; lo translúcido (brillos, vapor) no se apila: queda el más fuerte
          if (q[j + 3] >= 217 || q[j + 3] > o[k + 3]) o.set(q.subarray(j, j + 4), k);
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

/** Los cuadros de una dirección, todos de la misma celda y con la misma ancla. */
interface Bloque {
  celda: [number, number];
  ancla: [number, number];
  cuadros: Uint8ClampedArray[];
}

interface Hecho {
  cfg: CfgPfx;
  /** un bloque por dirección (1 o 8), a 1x: cada dirección tiene su propia celda ajustada (y su ancla) */
  dirs: Bloque[];
  atlas?: Atlas;
  escala: number;
  t: number;
  bucle: boolean;
  luz: LuzEfecto;
  mezcla: 'normal' | 'aditiva';
  alfaCuerpo?: number[];
  pngs?: Uint8Array[];
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
  const g: Gradacion = { ...GRADACION_BASE, blanco: nucleo(cfg.elemento), ...(VIOLETAS.includes(cfg.elemento) ? { violeta: 0 } : {}), ...(GRADACION_ELEMENTO[cfg.elemento] ?? {}), ...(cfg.gradacion ?? {}) };
  for (const q of crudo.lam.cuadros) {
    gradar(q, g);
    if (cfg.opacidad !== undefined) for (let i = 3; i < q.length; i += 4) q[i] = Math.round(q[i] * cfg.opacidad);
  }
  cortarCola(cfg, crudo);
  if (cfg.relleno) rellenar(cfg.relleno, crudo);
  // los repetidos vuelven a ser idénticos al anterior (el desvanecido de la cola los separaba): el atlas los guarda una
  // vez. El último no: termina apagado como pide el contrato de un efecto que pasa una vez
  for (let f = 1; f < crudo.n - 1; f++) if (crudo.repetido[f]) { crudo.lam.cuadros[f] = crudo.lam.cuadros[f - 1].slice(); crudo.energia[f] = crudo.energia[f - 1]; }
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
      } else if (d.modo === 'punto') {
        const a = (dp.ang * Math.PI) / 180, L = dp.largo, D = d.distancia ?? crudo.centro[0] - crudo.lam.ox;
        // correr el contenido es correr el ancla al revés
        por[nom] = nom === 'e' ? base : { ...base, ax: base.ax - Math.round(D * Math.cos(a) * L - D), ay: base.ay - Math.round(D * Math.sin(a) * L) };
      } else {
        // al norte y al sur la línea se inclina un poco (0.24 de avance de costado): si no, todas las tajadas caen en
        // la misma columna y lo que corre por el piso se vuelve una barra
        const a = (dp.ang * Math.PI) / 180, L = dp.largo, dx = Math.abs(Math.cos(a)) < 0.01 ? 0.24 : Math.cos(a) * L;
        por[nom] = nom === 'e' ? base : tajadasSuelo(base, dx, Math.sin(a) * L);
      }
    }
    lams = DIRS_PODER.map((nom) => { const e = DIR_PANTALLA[nom].espejo; return e ? espejar(por[e]!) : por[nom]!; });
    lams = alinear(lams);
  } else lams = [base];
  // lo casi invisible (alfa < ALFA_PISO, menos del 4 %) se borra: agranda las cajas y pesa en el PNG sin verse
  for (const l of lams) for (const q of l.cuadros) for (let i = 3; i < q.length; i += 4) if (q[i] < ALFA_PISO) q[i - 3] = q[i - 2] = q[i - 1] = q[i] = 0;
  // a 1x: el juego dibuja con `escala` (vecino más cercano); cada dirección recortada por su cuenta
  const k = cfg.escala ?? (pantalla ? 1 : ESCALA);
  const dirs: Bloque[] = pantalla
    ? lams.map((l) => ({ celda: [l.w, l.h], ancla: [0, 0], cuadros: l.cuadros }))
    : lams.map((l) => {
        const [a0, b0, a1, b1] = caja([l], ALFA_MIN);
        const r = recortar(l, a0 - 1, b0 - 1, a1 - a0 + 3, b1 - b0 + 3);
        return { celda: [r.w, r.h], ancla: [Math.round(r.ax), Math.round(r.ay)], cuadros: r.cuadros };
      });
  const luz = luzDe(cfg, crudo, k);
  const mezcla = cfg.luz?.mezcla ?? luz.mezcla ?? 'aditiva';
  const hecho: Hecho = {
    cfg, dirs, escala: k, t: crudo.t, bucle: crudo.bucle, luz, mezcla,
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
  const sinLuz = pico < 4 || cfg.soloCinematica || (cfg.capa === 'pantalla' && !cfg.luz?.intensidad);
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

/**
 * Un cuadro de un efecto tal como sale del render, sin optimizar, a la escala de dibujo: `dir` índice en DIRS_PODER o
 * su nombre (los no direccionales lo ignoran). Es la referencia contra la que se prueba el atlas.
 */
export function pintarEfectoPfx(id: string, dir: number | string, f: number): { img: Raster; ancla: [number, number] } {
  const h = hacer(id);
  const di = h.dirs.length === 1 ? 0 : typeof dir === 'string' ? Math.max(0, (DIRS_PODER as readonly string[]).indexOf(dir)) : ((dir % 8) + 8) % 8;
  const b = h.dirs[di], k = h.escala;
  const n = b.cuadros.length, ff = h.bucle ? ((f % n) + n) % n : Math.max(0, Math.min(n - 1, f));
  return { img: { w: b.celda[0] * k, h: b.celda[1] * k, data: agrandar(b.cuadros[ff], b.celda[0], b.celda[1], k) }, ancla: [b.ancla[0] * k, b.ancla[1] * k] };
}

// ---------------------------------------------------------------------------------------------------------------
// atlas: cada cuadro recortado a su caja, repetidos una sola vez, espejos sin guardar, empaquetado en estantes

interface Atlas {
  paginas: Raster[];
  direcciones: { dir: string | null; espejo: boolean; de?: string; cuadros?: CuadroAtlas[] }[];
  caja: [number, number, number, number];
}

/** Direcciones que se guardan y las que se dibujan espejadas (se de so, e de o, ne de no). */
const ESPEJOS: Record<string, string> = { se: 'so', e: 'o', ne: 'no' };

function hash32(q: Uint8ClampedArray, w: number, h: number): number {
  let x = (Math.imul(w, 73856093) ^ Math.imul(h, 19349663)) >>> 0;
  for (let i = 0; i < q.length; i += 4) x = Math.imul(x ^ (q[i] | (q[i + 1] << 8) | (q[i + 2] << 16) | (q[i + 3] << 24)), 16777619) >>> 0;
  return x;
}

function armarAtlas(h: Hecho): Atlas {
  if (h.atlas) return h.atlas;
  const ocho = h.dirs.length > 1;
  // los recortes únicos
  const unicos: { w: number; h: number; data: Uint8ClampedArray; key: number }[] = [];
  const porClave = new Map<number, number[]>();
  const refs: { dir: string | null; espejo: boolean; de?: string; cuadros?: { u: number; dx: number; dy: number }[] }[] = [];
  let X0 = Infinity, Y0 = Infinity, X1 = -Infinity, Y1 = -Infinity;
  h.dirs.forEach((b, d) => {
    const nom = ocho ? DIRS_PODER[d] : null;
    if (nom && ESPEJOS[nom]) { refs.push({ dir: nom, espejo: true, de: ESPEJOS[nom] }); return; }
    const [W] = b.celda, cuadros: { u: number; dx: number; dy: number }[] = [];
    for (const q of b.cuadros) {
      const H = b.celda[1];
      let x0 = W, y0 = H, x1 = -1, y1 = -1;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (q[(y * W + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < 0) { cuadros.push({ u: -1, dx: 0, dy: 0 }); continue; }
      const w = x1 - x0 + 1, hh = y1 - y0 + 1, data = new Uint8ClampedArray(w * hh * 4);
      for (let y = 0; y < hh; y++) data.set(q.subarray(((y0 + y) * W + x0) * 4, ((y0 + y) * W + x1 + 1) * 4), y * w * 4);
      const key = hash32(data, w, hh);
      let u = (porClave.get(key) ?? []).find((i) => unicos[i].w === w && unicos[i].h === hh && unicos[i].data.every((v, j) => v === data[j]));
      if (u === undefined) { u = unicos.length; unicos.push({ w, h: hh, data, key }); porClave.set(key, [...(porClave.get(key) ?? []), u]); }
      const dx = x0 - b.ancla[0], dy = y0 - b.ancla[1];
      cuadros.push({ u, dx, dy });
      X0 = Math.min(X0, dx); Y0 = Math.min(Y0, dy); X1 = Math.max(X1, dx + w); Y1 = Math.max(Y1, dy + hh);
      // la caja también cubre el espejo
      if (ocho && Object.values(ESPEJOS).includes(nom!)) { X0 = Math.min(X0, -dx - w); X1 = Math.max(X1, -dx); }
    }
    refs.push({ dir: nom, espejo: false, cuadros });
  });
  if (X0 > X1) { X0 = Y0 = X1 = Y1 = 0; }
  // estantes: de más alto a más bajo, con 1 px de aire entre recortes
  const G = 1, area = unicos.reduce((s, r) => s + (r.w + G) * (r.h + G), 0), anchoMax = Math.max(1, ...unicos.map((r) => r.w + G));
  const PW = Math.min(LADO_MAX, Math.max(anchoMax, Math.ceil(Math.sqrt(area * 1.08))));
  const PH = Math.min(LADO_MAX, Math.floor(PX_MAX / PW));
  const orden = unicos.map((_, i) => i).sort((a, b) => unicos[b].h - unicos[a].h || unicos[b].w - unicos[a].w || a - b);
  const lugar: [number, number, number][] = [];
  let pag = 0, x = 0, y = 0, alto = 0;
  const usado: number[] = [0];
  for (const i of orden) {
    const r = unicos[i];
    if (x + r.w > PW) { y += alto + G; x = 0; alto = 0; }
    if (y + r.h > PH) { pag++; usado.push(0); x = 0; y = 0; alto = 0; }
    lugar[i] = [pag, x, y];
    x += r.w + G; alto = Math.max(alto, r.h);
    usado[pag] = Math.max(usado[pag], y + r.h);
  }
  const anchos = usado.map(() => 0);
  unicos.forEach((r, i) => { anchos[lugar[i][0]] = Math.max(anchos[lugar[i][0]], lugar[i][1] + r.w); });
  const paginas = usado.map((hh, p) => createRaster(Math.max(1, anchos[p]), Math.max(1, hh)));
  unicos.forEach((r, i) => {
    const [p, px, py] = lugar[i], pg = paginas[p];
    for (let yy = 0; yy < r.h; yy++) pg.data.set(r.data.subarray(yy * r.w * 4, (yy + 1) * r.w * 4), ((py + yy) * pg.w + px) * 4);
  });
  const direcciones = refs.map((r) => r.espejo ? { dir: r.dir, espejo: true, de: r.de } : {
    dir: r.dir, espejo: false,
    cuadros: r.cuadros!.map((c): CuadroAtlas => c.u < 0 ? [0, 0, 0, 0, 0, 0, 0] : [lugar[c.u][0], lugar[c.u][1], lugar[c.u][2], unicos[c.u].w, unicos[c.u].h, c.dx, c.dy]),
  });
  h.atlas = { paginas, direcciones, caja: [X0, Y0, X1, Y1] };
  return h.atlas;
}

/** Las páginas del atlas (RGBA a 1x, antes de pasar a PNG). */
export function paginasEfectoPfx(id: string): Raster[] {
  return armarAtlas(hacer(id)).paginas;
}

/** Los PNG de las páginas (paleta de hasta 256 colores con alfa; 161 en los de pantalla). */
export function pngsEfectoPfx(id: string): Uint8Array[] {
  const h = hacer(id);
  // la pantalla (clima, transiciones) con 160 colores: son velos grandes y el resto con 255
  h.pngs ??= armarAtlas(h).paginas.map((p) => pngLiviano(p, h.cfg.capa === 'pantalla' ? 160 : 255));
  return h.pngs;
}

/**
 * Arma un cuadro desde el atlas como lo haría el juego (recorte, desplazamiento, espejo y escala) sobre el lienzo de
 * la referencia sin optimizar, para comprobar que son idénticos. `paginas` permite pasar las páginas decodificadas del PNG.
 */
export function armarCuadroPfx(id: string, dir: number, f: number, paginas: Raster[] = paginasEfectoPfx(id)): { img: Raster; ancla: [number, number] } {
  const h = hacer(id), e = efectoPfx(id), k = h.escala;
  const di = h.dirs.length === 1 ? 0 : ((dir % 8) + 8) % 8, b = h.dirs[di];
  const W = b.celda[0] * k, H = b.celda[1] * k, AX = b.ancla[0] * k, AY = b.ancla[1] * k, img = createRaster(W, H);
  let d = e.direcciones[di], espejo = false;
  if (d.espejo) { espejo = true; d = e.direcciones.find((x) => x.dir === d.de)!; }
  const n = d.cuadros!.length, ff = h.bucle ? ((f % n) + n) % n : Math.max(0, Math.min(n - 1, f));
  const [p, x, y, w, hh, dx, dy] = d.cuadros![ff];
  if (!w) return { img, ancla: [AX, AY] };
  const pg = paginas[p];
  for (let yy = 0; yy < hh * k; yy++)
    for (let xx = 0; xx < w * k; xx++) {
      const sx = x + Math.floor(xx / k), sy = y + Math.floor(yy / k);
      const X = espejo ? AX - dx * k - w * k + (w * k - 1 - xx) : AX + dx * k + xx, Y = AY + dy * k + yy;
      if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      img.data.set(pg.data.subarray((sy * pg.w + sx) * 4, (sy * pg.w + sx) * 4 + 4), (Y * W + X) * 4);
    }
  return { img, ancla: [AX, AY] };
}

/** Datos del manifiesto de un efecto (pinta el efecto si hace falta). */
export function efectoPfx(id: string): EfectoPfx {
  const h = hacer(id), c = h.cfg, at = armarAtlas(h), pngs = pngsEfectoPfx(id);
  const paginas = at.paginas.map((p, i): PaginaPfx => ({ archivo: i ? `${c.id}_${i + 1}.png` : `${c.id}.png`, w: p.w, h: p.h, bytes: pngs[i].length }));
  return {
    id: c.id, origen: c.origen, nombre: c.nombre, categoria: c.categoria, capa: c.capa ?? 'mundo',
    cuadros: h.dirs[0].cuadros.length, t: h.t, bucle: h.bucle, direccional: h.dirs.length > 1, escala: h.escala, caja: at.caja,
    paginas, peso: Math.round(paginas.reduce((s, p) => s + p.w * p.h, 0) / 1e4) / 100, direcciones: at.direcciones, mezcla: h.mezcla,
    ...(c.detrasEn ? { detrasEn: c.detrasEn } : {}),
    ...(c.enLanzador ? { enLanzador: true } : {}),
    ...(c.soloCinematica ? { soloCinematica: true } : {}),
    ...(h.alfaCuerpo || c.cuerpo?.tinte ? { cuerpo: { ...(h.alfaCuerpo ? { alfa: h.alfaCuerpo } : {}), ...(c.cuerpo?.tinte ? { tinte: c.cuerpo.tinte } : {}) } } : {}),
    luz: h.luz, uso: c.uso, ...(c.notas ? { notas: c.notas } : {}),
  };
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
  'Atlas PNG con paleta y alfa directa, a 1x: dibujar con escala (2 en el mundo) y vecino más cercano. Cada cuadro es ' +
  '[página, x, y, ancho, alto, dx, dy]: el rectángulo en paginas[página] y su esquina respecto del ancla (en px a 1x; multiplicar por escala). ' +
  'Ancho 0 = cuadro vacío. Direcciones en el orden de DIRS_PODER (s, so, o, no, n, ne, e, se); las que tienen espejo: true se dibujan con los ' +
  'cuadros de `de` volteados en horizontal alrededor del ancla (esquina x = -(dx + ancho)). Animación: cuadro = floor(segundos * 25 / t) ' +
  '(bucle: % cuadros; si no, el último y se termina). Ancla: el punto del piso (los proyectiles: el piso bajo la bola; el juego los mueve). ' +
  "peso: Mpx decodificados de las páginas: cargar al usarse y descargar lo que no se use. capa 'pantalla': ancla = esquina de la pantalla " +
  "de 320x180, estirar entero (x3 a 960x540). mezcla 'aditiva': color * alfa sumado; 'normal': alfa común. cuerpo.tinte: teñir el sprite " +
  'del afectado; cuerpo.alfa: visibilidad del sprite por cuadro. detrasEn: direcciones en que va detrás del lanzador. ' +
  'soloCinematica: capa de cinemática (no va en el mundo ni prende luz dinámica).';

export const CREDITOS_PFX =
  'Efectos adaptados de pixelfx (https://github.com/patch-gg/pixelfx), MIT, Copyright (c) 2026 Patch y Copyright (c) 2026 Hugo Duprez ' +
  '(Sprite Fusion, https://www.spritefusion.com/pixel-art-vfx); partes de Hollow Crown (rehan-remade), MIT. Ver LICENSE-pixelfx.txt y NOTICE-pixelfx.md.';

export const LEEME_PFX = `Efectos de pixelfx mudados al taller gótico de Réquiem de Ceniza.

Créditos: ${CREDITOS_PFX}
Las hojas son derivados de esos efectos (repintados con las paletas góticas, para dibujar x2, con piso isométrico 2:1,
sin muñeco y en 8 direcciones); siguen bajo la licencia MIT, que va en LICENSE-pixelfx.txt.

Cada efecto es un atlas de una o más páginas PNG con paleta (hasta 256 colores con alfa, a 1x, cada página de
4096 px de lado y 4 Mpx como mucho). efectos_pfx.json trae por efecto: id (fx_...), nombre [es, en], categoria, capa
(mundo, piso: debajo de los personajes, pantalla: cubre la pantalla), cuadros, t (ticks por cuadro a 25 por segundo),
bucle, direccional, escala (de dibujo), caja, paginas (archivo, w, h, bytes), peso (Mpx decodificados), direcciones
(cuadros [página, x, y, ancho, alto, dx, dy] o espejo de otra), mezcla, enLanzador, detrasEn, soloCinematica, cuerpo (tinte y
visibilidad del sprite afectado), luz (como luz_efectos.json) y uso (para qué sirve en el juego).

${NOTAS_MANIFIESTO}
`;

/** Ids de pixelfx que se mudaron, por si hace falta buscar el original. */
export const ORIGENES_PFX: Record<string, string> = Object.fromEntries(CATALOGO_PFX.map((c) => [c.id, c.origen]));

