/**
 * Fuego de Doom para Réquiem de Ceniza: el autómata clásico del fuego de Doom PSX (una grilla de calor 0..36 que sube
 * fila por fila perdiendo calor al azar), hecho nuestro para un juego gótico.
 *
 * Por celda, de arriba hacia abajo: `decay = floor(azar * d)`, `calor[x + corrimiento, y] = calor[x, y + 1] - decay`.
 * El corrimiento lateral es el viento y la turbulencia; el decay es el enfriamiento y el parpadeo. Lo que agrega este
 * módulo encima del original:
 * - fuente irregular con ruido (tramos que se apagan y se prenden) y fuentes en cualquier celda, no solo abajo;
 * - formas: lengua de llama, boca de brasero, pira, arco de vitral gótico, puerta, anillo en el piso, tira (hoja de un
 *   arma), círculo o charco, muro y un mapa a medida (la silueta de un cuerpo);
 * - viento con dirección, fuerza y ráfagas; enfriamiento por `decay` o por `altura` (qué fracción de la grilla sube);
 * - humo: el calor que se muere deja humo gris translúcido que sigue subiendo (no se corta a negro);
 * - bordes suaves: la forma enfría de más cerca de su borde y de los bordes de la grilla (nunca un rectángulo duro), la
 *   paleta tiene alfa que sube desde 0, y al pintar se puede interpolar (bilineal) y tramar (Bayer 4x4);
 * - fuego frío con "corazón hueco": lo más caliente se pinta oscuro y la llama queda como un contorno;
 * - paletas góticas con su color de luz, y lecturas para el juego: `calorMedio` (0..1 y el centroide, para que la luz
 *   y las sombras tiemblen al ritmo de la llama), `pulsoLuz` y `brasas` (puntas calientes para soltar chispas).
 *
 * TypeScript puro y sin imports: el juego lo copia tal cual y lo corre en vivo. Determinista: cada fuego trae su propio
 * azar (xorshift32) con semilla; la misma semilla y la misma secuencia de `paso` dan los mismos cuadros.
 */

// ---------------------------------------------------------------------------------------------------------------
// constantes y azar

/** Calor máximo de una celda (la paleta tiene CALOR_MAX + 1 = 37 colores). */
export const CALOR_MAX = 36;
export const NIVELES = CALOR_MAX + 1;
/** Pasos del autómata por segundo, por omisión (el ritmo de los efectos del juego). */
export const PASOS_POR_SEGUNDO = 25;

/** Azar chico con semilla (mulberry32), por si el juego lo quiere fuera de un fuego. */
export function azar(semilla: number): () => number {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const semillaDe = (s: number) => { const r = azar(s)(); return ((r * 4294967296) >>> 0) || 0x9e3779b9; };
function hashEnt(i: number, s: number): number {
  let h = (Math.imul(i | 0, 374761393) + Math.imul(s | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** Ruido de valor 2D suave 0..1 (para los tramos de la fuente y las ráfagas). */
function ruido2(x: number, y: number, s: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  let fx = x - ix, fy = y - iy;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = hashEnt(ix * 7919 + iy * 104729, s), b = hashEnt((ix + 1) * 7919 + iy * 104729, s);
  const c = hashEnt(ix * 7919 + (iy + 1) * 104729, s), d = hashEnt((ix + 1) * 7919 + (iy + 1) * 104729, s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
const c01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const suave = (a: number, b: number, x: number) => { const t = c01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------------------------------------------------------
// paletas

export type NombrePaleta = 'infierno' | 'vela' | 'animas' | 'corona_fria' | 'veneno' | 'sombra' | 'sagrado' | 'gas' | 'clasica';
export interface PaletaFuego {
  id: string;
  nombre: [string, string];
  /** 37 colores RGBA (alfa directa), del calor 0 (transparente) al 36. */
  colores: Uint8ClampedArray;
  /** color de la luz dinámica que da este fuego */
  luz: string;
  /** color del humo (gris teñido) y su alfa máxima */
  humo: [number, number, number, number];
  /** cómo conviene dibujarlo: 'sumar' (globalCompositeOperation 'lighter') o 'normal' (los fuegos oscuros) */
  mezcla: 'sumar' | 'normal';
}

type Parada = [number, string, number];
function armarPaleta(paradas: Parada[]): Uint8ClampedArray {
  const out = new Uint8ClampedArray(NIVELES * 4);
  const rgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  for (let i = 0; i < NIVELES; i++) {
    const t = i / CALOR_MAX;
    let k = 0;
    while (k < paradas.length - 2 && t > paradas[k + 1][0]) k++;
    const [t0, c0, a0] = paradas[k], [t1, c1, a1] = paradas[k + 1];
    const u = c01((t - t0) / Math.max(1e-6, t1 - t0)), A = rgb(c0), B = rgb(c1);
    out[i * 4] = A[0] + (B[0] - A[0]) * u; out[i * 4 + 1] = A[1] + (B[1] - A[1]) * u; out[i * 4 + 2] = A[2] + (B[2] - A[2]) * u;
    out[i * 4 + 3] = i === 0 ? 0 : (a0 + (a1 - a0) * u) * 255;
  }
  return out;
}
/** Los 37 colores del fuego de Doom PSX, tal cual (para comparar). */
const DOOM_PSX = [
  0x070707, 0x1f0707, 0x2f0f07, 0x470f07, 0x571707, 0x671f07, 0x771f07, 0x8f2707, 0x9f2f07, 0xaf3f07, 0xbf4707, 0xc74707, 0xdf4f07,
  0xdf5707, 0xdf5707, 0xd75f07, 0xd75f07, 0xd7670f, 0xcf6f0f, 0xcf770f, 0xcf7f0f, 0xcf8717, 0xc78717, 0xc78f17, 0xc7971f, 0xbf9f1f,
  0xbf9f1f, 0xbfa727, 0xbfa727, 0xbfaf2f, 0xb7af2f, 0xb7b72f, 0xb7b737, 0xcfcf6f, 0xdfdf9f, 0xefefc7, 0xffffff,
];
function paletaClasica(): Uint8ClampedArray {
  const out = new Uint8ClampedArray(NIVELES * 4);
  DOOM_PSX.forEach((c, i) => { out[i * 4] = c >> 16; out[i * 4 + 1] = (c >> 8) & 255; out[i * 4 + 2] = c & 255; out[i * 4 + 3] = i === 0 ? 0 : Math.min(255, 60 + i * 40); });
  return out;
}

export const PALETAS: Record<NombrePaleta, PaletaFuego> = {
  // rojo profundo a amarillo viejo, casi sin blanco: el fuego del infierno y de la catedral
  infierno: {
    id: 'infierno', nombre: ['Infierno', 'Inferno'], luz: '#ff6a24', humo: [34, 27, 24, 0.5], mezcla: 'sumar',
    colores: armarPaleta([[0, '#080303', 0], [0.07, '#2a0705', 0.4], [0.18, '#560d07', 0.78], [0.32, '#861707', 0.94], [0.47, '#ad2c09', 1],
      [0.62, '#cc4c0e', 1], [0.76, '#e0731a', 1], [0.88, '#eb9a34', 1], [1, '#f2bf62', 1]]),
  },
  // llama corta de vela o farol: naranja y un alma amarilla clara
  vela: {
    id: 'vela', nombre: ['Vela', 'Candle'], luz: '#ffb25a', humo: [40, 34, 30, 0.35], mezcla: 'sumar',
    colores: armarPaleta([[0, '#000000', 0], [0.1, '#331004', 0.45], [0.3, '#7e2c08', 0.88], [0.5, '#c46416', 1], [0.68, '#e89a34', 1],
      [0.84, '#f8cf74', 1], [1, '#fff0c4', 1]]),
  },
  // fuego frío de las ánimas: negro, azul petróleo, cian y un blanco hueso en el alma
  animas: {
    id: 'animas', nombre: ['Ánimas (fuego frío)', 'Souls (cold fire)'], luz: '#4fd2cc', humo: [22, 34, 38, 0.45], mezcla: 'sumar',
    colores: armarPaleta([[0, '#000000', 0], [0.1, '#02121a', 0.42], [0.27, '#053039', 0.8], [0.44, '#0a5560', 0.95], [0.6, '#188a92', 1],
      [0.76, '#46bfbe', 1], [0.89, '#a2e2d6', 1], [1, '#e6e1cc', 1]]),
  },
  // la llama de la corona fría: blanco azulado casi sin color
  corona_fria: {
    id: 'corona_fria', nombre: ['Corona fría', 'Cold crown'], luz: '#cddcff', humo: [36, 40, 48, 0.4], mezcla: 'sumar',
    colores: armarPaleta([[0, '#000000', 0], [0.12, '#0c1016', 0.35], [0.3, '#363f4a', 0.72], [0.5, '#717e8c', 0.92], [0.7, '#aebac7', 1],
      [0.86, '#dbe2ea', 1], [1, '#f5f7ff', 1]]),
  },
  veneno: {
    id: 'veneno', nombre: ['Veneno', 'Poison'], luz: '#86d83e', humo: [26, 34, 20, 0.45], mezcla: 'sumar',
    colores: armarPaleta([[0, '#000000', 0], [0.1, '#081404', 0.45], [0.3, '#1c360a', 0.85], [0.5, '#3a6410', 1], [0.7, '#69981e', 1],
      [0.86, '#a2c83c', 1], [1, '#dcec8c', 1]]),
  },
  // violeta negro: se dibuja con alfa normal (oscurece y brilla apenas en el alma)
  sombra: {
    id: 'sombra', nombre: ['Sombra', 'Shadow'], luz: '#7a40d6', humo: [16, 10, 22, 0.55], mezcla: 'normal',
    colores: armarPaleta([[0, '#000000', 0], [0.12, '#0a0311', 0.55], [0.3, '#1a0828', 0.86], [0.5, '#33124e', 0.95], [0.7, '#57227c', 1],
      [0.86, '#8448b4', 1], [1, '#c09ae2', 1]]),
  },
  // oro pálido: fuego sagrado de altares y del templario
  sagrado: {
    id: 'sagrado', nombre: ['Sagrado', 'Holy'], luz: '#ffd98a', humo: [44, 40, 32, 0.3], mezcla: 'sumar',
    colores: armarPaleta([[0, '#000000', 0], [0.1, '#181006', 0.4], [0.3, '#553c0e', 0.8], [0.5, '#9a7426', 1], [0.7, '#d2aa4c', 1],
      [0.86, '#efd68c', 1], [1, '#fff5da', 1]]),
  },
  // gas azul (fuegos arcanos, braseros de hielo)
  gas: {
    id: 'gas', nombre: ['Gas azul', 'Blue gas'], luz: '#5a8cff', humo: [20, 24, 36, 0.35], mezcla: 'sumar',
    colores: armarPaleta([[0, '#000000', 0], [0.1, '#02061a', 0.4], [0.3, '#061664', 0.82], [0.5, '#1838c4', 1], [0.7, '#3874ea', 1],
      [0.86, '#88b4ff', 1], [1, '#dcecff', 1]]),
  },
  clasica: { id: 'clasica', nombre: ['Doom PSX (original)', 'Doom PSX (original)'], luz: '#ff8a33', humo: [30, 28, 26, 0], mezcla: 'sumar', colores: paletaClasica() },
};
export const NOMBRES_PALETA = Object.keys(PALETAS) as NombrePaleta[];

// ---------------------------------------------------------------------------------------------------------------
// formas

/**
 * Forma del fuego en la grilla (celdas; x a la derecha, y hacia abajo, la fila de abajo es y = alto - 1).
 * `fuente`: dónde nace el calor. La forma también dice hasta dónde puede vivir la llama (enfría de más cerca del borde).
 */
export type Forma =
  /** lengua de llama: fuente en la fila de abajo, `ancho` fracción del ancho de la grilla (0.5 por omisión) */
  | { tipo: 'llama'; ancho?: number }
  /** boca de brasero o farol: la boca es una elipse 2:1 de `ancho` celdas pegada abajo */
  | { tipo: 'boca'; ancho: number }
  /** pira u hoguera: un montón (media elipse de `ancho` x `alto` celdas) que arde entero, más alto en el medio */
  | { tipo: 'pira'; ancho: number; alto?: number }
  /** arco de vitral gótico (ojiva): la grilla es la ventana; `arranque` fracción de la altura donde nace la ojiva */
  | { tipo: 'arco'; arranque?: number; relleno?: number }
  /** puerta: rectángulo con arco de medio punto u ojiva; arde desde el umbral */
  | { tipo: 'puerta'; arranque?: number; ojiva?: boolean }
  /** anillo en el piso (elipse 2:1 de radio `radio` celdas en x), centrado abajo */
  | { tipo: 'anillo'; radio: number; grosor?: number }
  /** tira entre dos puntos (la hoja de un arma, un muro en diagonal), en celdas */
  | { tipo: 'tira'; desde: [number, number]; hasta: [number, number]; grosor?: number }
  /** círculo o charco en el piso: elipse 2:1 llena de `radio` celdas; `relleno` 0..1 cuánto de ella arde */
  | { tipo: 'circulo'; radio: number; relleno?: number }
  /** muro: toda la fila de abajo menos `margen` celdas a cada lado, con las puntas más bajas */
  | { tipo: 'muro'; margen?: number }
  /** a medida: fuente (0..1 por celda, w*h) y forma opcional (0..1, w*h) */
  | { tipo: 'mapa'; fuente: ArrayLike<number>; forma?: ArrayLike<number> };

export interface OpcFuego {
  /** grilla en celdas */
  ancho: number;
  alto: number;
  semilla?: number;
  paleta?: NombrePaleta | PaletaFuego;
  forma?: Forma;
  /** enfriamiento máximo por fila (decay = floor(azar * decay)); 3 es el clásico, 6 la vela. Si no, sale de `altura`. */
  decay?: number;
  /** fracción de la grilla que sube la llama típica (0.2 a 1); se usa si no hay `decay`. 0.8 por omisión. */
  altura?: number;
  /** viento: celdas de corrimiento por fila (negativo a la izquierda). 0.3 es una brisa, 1 un ventarrón. */
  viento?: number;
  /** ráfagas: cuánto oscila el viento en el tiempo (en las mismas unidades) */
  rafagas?: number;
  /** turbulencia lateral 0..1 (1 = el ±1 al azar del original; 0.45 por omisión: lenguas más largas) */
  turbulencia?: number;
  /** cuánto de la fuente se apaga a tramos con el ruido (0 = fuente pareja como el original, 1 = muy rota) */
  ruido?: number;
  /** tamaño de los tramos de la fuente en celdas y su velocidad (tramos por segundo) */
  tramo?: number;
  velocidadTramo?: number;
  /** humo 0..1: cuánto humo deja el calor al morir (0 = sin humo) */
  humo?: number;
  /** corazón hueco 0..1 (fuego frío): lo más caliente se pinta oscuro */
  hueco?: number;
  /** celdas de borde suave contra los lados y el techo de la grilla */
  margen?: number;
  /** pasos del autómata por segundo */
  pps?: number;
  /** 0..1 cómo arranca (1 = encendido). Por omisión 1. */
  encendido?: number;
}

/** Un fuego vivo: datos planos (se pueden copiar o guardar). */
export interface Fuego {
  w: number;
  h: number;
  calor: Uint8Array;
  humo: Uint8Array;
  fuente: Float32Array;
  forma: Float32Array;
  /** extra de enfriamiento por celda que sale de la forma (0..255) */
  frio: Uint8Array;
  paleta: PaletaFuego;
  decay: number;
  viento: number;
  rafagas: number;
  turbulencia: number;
  ruido: number;
  tramo: number;
  velocidadTramo: number;
  cantHumo: number;
  hueco: number;
  pps: number;
  semilla: number;
  /** estado del azar del autómata y del de las brasas */
  s: number;
  sb: number;
  /** segundos simulados, pasos dados y tiempo que sobró */
  t: number;
  pasos: number;
  acum: number;
  /** nivel actual de la fuente (va suave hacia `meta`) */
  nivel: number;
  meta: number;
  /** avivado: multiplica la altura de la llama hasta el segundo `avivaHasta` */
  aviva: number;
  avivaHasta: number;
  /** promedio lento de calorMedio (para el pulso de la luz) */
  medio: number;
  /** celdas que cuentan para calorMedio */
  area: number;
}

/** Decay que hace subir la llama `altura` (fracción) de una grilla de `alto` celdas. */
export const decayPara = (altura: number, alto: number) => 1 + (2 * CALOR_MAX) / Math.max(2, altura * alto);

function armarForma(w: number, h: number, f: Forma, margen: number, s: number): { fuente: Float32Array; forma: Float32Array } {
  const fuente = new Float32Array(w * h), forma = new Float32Array(w * h).fill(1);
  const cx = (w - 1) / 2, abajo = h - 1;
  const set = (x: number, y: number, v: number) => { if (x >= 0 && y >= 0 && x < w && y < h) { const i = y * w + x; if (v > fuente[i]) fuente[i] = v; } };
  switch (f.tipo) {
    case 'llama': {
      const bw = Math.max(1, (f.ancho ?? 0.5) * w);
      for (let x = 0; x < w; x++) { const d = Math.abs(x - cx) / (bw / 2); if (d <= 1) set(x, abajo, 0.6 + 0.4 * (1 - d * d)); }
      break;
    }
    case 'boca': {
      // el centro más caliente que el borde: la llama sale en punta, no en cúpula
      const rx = f.ancho / 2, ry = Math.max(0.6, rx / 2), cy = abajo - ry;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const q = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (q <= 1) set(x, y, 0.55 + 0.45 * (1 - q));
      }
      break;
    }
    case 'pira': {
      const rx = f.ancho / 2, ry = f.alto ?? Math.max(1, rx * 0.45);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const q = ((x - cx) / rx) ** 2 + ((abajo - y) / ry) ** 2;
        if (q <= 1 && y <= abajo) set(x, y, 0.7 + 0.3 * (1 - q));
      }
      break;
    }
    case 'arco':
    case 'puerta': {
      const arr = (f.arranque ?? (f.tipo === 'arco' ? 0.55 : 0.68)), ojiva = f.tipo === 'arco' ? true : f.ojiva ?? false;
      // yA: fila (desde arriba) donde arranca el arco; lo de abajo es recto
      const yA = (1 - arr) * h, alto = Math.max(1, yA * 0.97);
      // ojiva: dos arcos de radio R con centros sobre la línea de arranque, que se cruzan en la clave (R = w es la
      // equilátera; si no entra en la altura, se achata hasta el medio punto)
      const R = Math.max(w / 2, Math.min(w * 1.6, (alto * alto + (w * w) / 4) / w));
      const ry = Math.min(alto, w / 2); // medio punto (elíptico si no entra)
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const px = x + 0.5, py = y + 0.5, lados = Math.min(px, w - px);
        let dentro: number;
        if (py >= yA) dentro = lados;
        else if (ojiva) dentro = Math.min(R - Math.hypot(px - R, py - yA), R - Math.hypot(px - (w - R), py - yA), lados);
        else dentro = Math.min((1 - Math.hypot((px - w / 2) / (w / 2), (py - yA) / ry)) * Math.min(w / 2, ry), lados);
        forma[y * w + x] = suave(-0.3, 1.6, dentro);
      }
      const rell = f.tipo === 'arco' ? f.relleno ?? 0.25 : 0.12;
      for (let x = 0; x < w; x++) {
        set(x, abajo, 1);
        // algunas fuentes salteadas más arriba: el fuego llena la ventana, no es una llamita en el alféizar
        for (let y = Math.floor(h * (1 - rell)); y < abajo; y++) if (hashEnt(x * 131 + y * 977, s) < 0.18) set(x, y, 0.85);
      }
      break;
    }
    case 'anillo': {
      const rx = f.radio, ry = rx / 2, g = f.grosor ?? 1.1, cy = abajo - ry - 0.5;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const d = Math.hypot((x - cx) / rx, (y - cy) / ry), ds = Math.abs(d - 1) * rx;
        if (ds <= g) set(x, y, 0.8 + 0.2 * (1 - ds / g));
      }
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) forma[y * w + x] = suave(-1, 2.5, rx + 2 - Math.abs(x - cx));
      break;
    }
    case 'tira': {
      const [ax, ay] = f.desde, [bx, by] = f.hasta, g = f.grosor ?? 0.9, vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy || 1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const t = c01(((x - ax) * vx + (y - ay) * vy) / l2), d = Math.hypot(ax + vx * t - x, ay + vy * t - y);
        if (d <= g) set(x, y, (0.8 + 0.2 * (1 - d / g)) * (0.65 + 0.35 * Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.05))));
      }
      break;
    }
    case 'circulo': {
      const rx = f.radio, ry = rx / 2, cy = abajo - ry - 0.5, rel = f.relleno ?? 0.8;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const q = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (q <= 1 && ruido2(x * 0.45, y * 0.9, s) < rel + 0.12 * (1 - q)) set(x, y, 0.75 + 0.25 * (1 - q));
      }
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) forma[y * w + x] = suave(-1, 2.5, rx + 2 - Math.abs(x - cx));
      break;
    }
    case 'muro': {
      const m = f.margen ?? 2;
      for (let x = 0; x < w; x++) { const d = Math.min(x - m, w - 1 - m - x); if (d >= 0) set(x, abajo, 0.72 + 0.28 * suave(0, 4, d)); }
      break;
    }
    case 'mapa': {
      for (let i = 0; i < w * h; i++) fuente[i] = c01(Number(f.fuente[i] ?? 0));
      if (f.forma) for (let i = 0; i < w * h; i++) forma[i] = c01(Number(f.forma[i] ?? 0));
      break;
    }
  }
  // borde suave contra los lados y el techo: la llama no toca el borde de la grilla (nunca un corte recto)
  if (margen > 0) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = Math.min(x + 0.5, w - x - 0.5, y + 0.5);
    forma[y * w + x] *= suave(0.5, margen + 0.5, d);
  }
  // no nace fuego donde la forma no lo deja vivir
  for (let i = 0; i < w * h; i++) fuente[i] *= suave(0.12, 0.55, forma[i]);
  return { fuente, forma };
}

// ---------------------------------------------------------------------------------------------------------------
// crear, avanzar, controlar

/** Crea un fuego. Arranca ya encendido y "caliente" (simula un segundo para que el primer cuadro no salga vacío). */
export function crearFuego(o: OpcFuego): Fuego {
  const w = Math.max(2, Math.round(o.ancho)), h = Math.max(2, Math.round(o.alto)), sem = (o.semilla ?? 1) >>> 0;
  const forma = o.forma ?? { tipo: 'llama' };
  const { fuente, forma: fm } = armarForma(w, h, forma, o.margen ?? 2, sem);
  const frio = new Uint8Array(w * h);
  let area = 0;
  for (let i = 0; i < w * h; i++) { frio[i] = Math.round((1 - fm[i]) * 255); if (fm[i] > 0.25) area++; }
  const paleta = typeof o.paleta === 'object' ? o.paleta : PALETAS[o.paleta ?? 'infierno'];
  const f: Fuego = {
    w, h, calor: new Uint8Array(w * h), humo: new Uint8Array(w * h), fuente, forma: fm, frio, paleta,
    decay: o.decay ?? decayPara(o.altura ?? 0.8, h), viento: o.viento ?? 0, rafagas: o.rafagas ?? 0.15, turbulencia: o.turbulencia ?? 0.45,
    ruido: o.ruido ?? 0.35, tramo: o.tramo ?? 3.5, velocidadTramo: o.velocidadTramo ?? 1.6, cantHumo: o.humo ?? 0.4, hueco: o.hueco ?? 0,
    pps: o.pps ?? PASOS_POR_SEGUNDO, semilla: sem, s: semillaDe(sem), sb: semillaDe(sem ^ 0x5bd1e995), t: 0, pasos: 0, acum: 0,
    nivel: o.encendido ?? 1, meta: o.encendido ?? 1, aviva: 1, avivaHasta: 0, medio: 0, area: Math.max(1, area),
  };
  // precalentar: que el primer cuadro ya tenga la llama entera
  if (f.nivel > 0) { const n = Math.ceil(h * 1.5) + 8; for (let i = 0; i < n; i++) tic(f); f.medio = calorMedio(f).k; }
  return f;
}

let filaHumo = new Uint8Array(64);
/** Un paso del autómata. */
function tic(f: Fuego): void {
  const { w, h, calor, humo, fuente, frio } = f;
  const dt = 1 / f.pps;
  f.t += dt; f.pasos++;
  f.nivel += (f.meta - f.nivel) * 0.2;
  if (Math.abs(f.meta - f.nivel) < 0.004) f.nivel = f.meta;
  const avivado = f.t < f.avivaHasta ? f.aviva : 1;
  const dmax = Math.max(1.0001, f.decay / avivado);
  // viento con ráfagas (ruido lento en el tiempo)
  const v = f.viento + f.rafagas * (ruido2(f.t * 0.55, 3.7, f.semilla) - 0.5) * 2;
  const va = Math.abs(v), vEnt = Math.floor(va), vFr = va - vEnt, vs = v < 0 ? -1 : 1;
  const vh = v * 1.5, vha = Math.abs(vh), vhEnt = Math.floor(vha), vhFr = vha - vhEnt, vhs = vh < 0 ? -1 : 1;
  const turb = f.turbulencia, humoK = f.cantHumo;
  let s = f.s;
  const nuevo = filaHumo.length >= w ? filaHumo : (filaHumo = new Uint8Array(w));
  // de arriba hacia abajo: la fila y se llena con la de abajo (que todavía no se tocó en este paso)
  for (let y = 0; y < h - 1; y++) {
    const fila = y * w, abajo = fila + w;
    nuevo.fill(0, 0, w);
    // el sentido del barrido se alterna por fila y por paso: escribir en el lugar favorece al corrimiento que va
    // contra el barrido, y así el sesgo se cancela (la llama no se inclina sola)
    const izq = ((y + f.pasos) & 1) === 1;
    for (let k = 0; k < w; k++) {
      const x = izq ? w - 1 - k : k;
      s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
      const r1 = s / 4294967296;
      s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
      const r2 = s / 4294967296;
      // corrimiento: turbulencia (-1, 0, 1) más el viento (parte entera + la fracción como probabilidad)
      let dx = r2 < turb ? Math.floor((r2 / turb) * 3) - 1 : 0;
      dx += vs * (vEnt + ((r1 * 7.31) % 1 < vFr ? 1 : 0));
      const tx = x + dx;
      const b = calor[abajo + x];
      const hb = humo[abajo + x];
      if (tx >= 0 && tx < w) {
        const ti = fila + tx;
        if (b > 0) {
          let dec = Math.floor(r1 * dmax);
          const fr = frio[ti];
          // cerca del borde de la forma enfría de más; afuera no vive
          if (fr) dec += fr > 224 ? CALOR_MAX : (fr * (1 + r2 * 3)) >> 5;
          const n = b - dec;
          if (n > 0) calor[ti] = n;
          else {
            calor[ti] = 0;
            // el calor que muere deja humo
            if (humoK > 0) { const hm = Math.min(255, (90 + b * 14) * humoK); if (hm > nuevo[tx]) nuevo[tx] = hm; }
          }
        } else calor[ti] = 0;
      }
      // el humo sube, se abre de lado, el viento lo lleva más que a la llama y se apaga de a poco
      if (hb > 0) {
        const hx = x + (r1 < 0.5 ? (r2 < 0.5 ? -1 : 1) : 0) + vhs * (vhEnt + (r2 < vhFr ? 1 : 0));
        if (hx >= 0 && hx < w) {
          const n = hb - 4 - ((r1 * 10) | 0) - (frio[fila + hx] >> 5);
          if (n > nuevo[hx]) nuevo[hx] = n;
        }
      }
    }
    humo.set(nuevo.subarray(0, w), fila);
  }
  // fuentes: tramos que se apagan y se prenden con el ruido; la fila de abajo que no es fuente se apaga
  const ab = (h - 1) * w, nv = f.nivel, ru = f.ruido, tt = f.t * f.velocidadTramo, esc = 1 / Math.max(0.5, f.tramo);
  for (let x = 0; x < w; x++) { if (fuente[ab + x] <= 0) { calor[ab + x] = 0; humo[ab + x] = 0; } }
  if (nv > 0.002) for (let i = 0; i < w * h; i++) {
    const fu = fuente[i];
    if (fu <= 0) continue;
    const x = i % w, y = (i - x) / w;
    let k = 1;
    if (ru > 0) {
      const n = ruido2(x * esc, tt + y * 0.37, f.semilla) * 0.7 + ruido2(x * esc * 2.3 + 11, tt * 1.9, f.semilla + 7) * 0.3;
      k = 1 - ru + ru * suave(0.3, 0.62, n);
    }
    s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    const v2 = Math.round(CALOR_MAX * fu * nv * k * (0.88 + 0.12 * (s / 4294967296)));
    if (y === h - 1) calor[i] = v2;
    else if (v2 > calor[i]) calor[i] = v2;
  }
  f.s = s;
  // promedio lento para el pulso de la luz
  const k = calorMedio(f).k;
  f.medio = f.medio <= 0 ? k : f.medio + (k - f.medio) * 0.04;
}

/**
 * Avanza el fuego `dt` segundos a paso fijo (`pps` pasos por segundo). Devuelve cuántos pasos dio (como mucho 6 por
 * llamada: si el juego se traba, el fuego se frena en vez de saltar).
 */
export function paso(f: Fuego, dt: number): number {
  f.acum += Math.max(0, dt);
  const T = 1 / f.pps;
  let n = 0;
  while (f.acum >= T && n < 6) { tic(f); f.acum -= T; n++; }
  if (f.acum > T) f.acum = T;
  return n;
}
/** Avanza exactamente n pasos (para hornear cuadros). */
export function pasos(f: Fuego, n: number): void { for (let i = 0; i < n; i++) tic(f); }

/** Prende la fuente (k = 0..1, sube suave). */
export function encender(f: Fuego, k = 1): void { f.meta = c01(k); }
/** Apaga la fuente: la llama que ya subió se muere sola en menos de un segundo (y deja humo). */
export function apagar(f: Fuego): void { f.meta = 0; }
/** Aviva: la llama sube `k` veces más por `seg` segundos (un golpe de fuelle, aceite, un hechizo). */
export function avivar(f: Fuego, k = 1.6, seg = 0.6): void { f.aviva = Math.max(1, k); f.avivaHasta = f.t + seg; if (f.meta < 1) f.meta = 1; }
/** Cambia el viento (celdas por fila; negativo a la izquierda). */
export function soplar(f: Fuego, viento: number, rafagas = f.rafagas): void { f.viento = viento; f.rafagas = rafagas; }

// ---------------------------------------------------------------------------------------------------------------
// lecturas para la luz y las chispas

/**
 * Calor medio 0..1 de la llama (suma del calor sobre el área de la forma) y su centroide (x, y en 0..1 de la grilla).
 * `rel` es el calor de ahora sobre el promedio lento: ~1 en régimen, más cuando se aviva, menos cuando parpadea.
 */
export function calorMedio(f: Fuego): { k: number; x: number; y: number; rel: number } {
  const { w, h, calor } = f;
  let s = 0, sx = 0, sy = 0;
  for (let y = 0; y < h; y++) {
    const o = y * w;
    for (let x = 0; x < w; x++) { const c = calor[o + x]; if (c) { s += c; sx += c * x; sy += c * y; } }
  }
  const k = c01(s / (CALOR_MAX * f.area * 0.5));
  return { k, x: s ? (sx / s + 0.5) / w : 0.5, y: s ? (sy / s + 0.5) / h : 1, rel: f.medio > 0.001 ? k / f.medio : k > 0 ? 1 : 0 };
}

/**
 * Pulso de la luz para este cuadro, para que la luz y las sombras tiemblen con la llama: `k` multiplica la intensidad
 * de la luz (1 - mueve + mueve * rel, de 0 a 1.3) y (dx, dy) corren la luz con el centroide (en celdas desde el pie).
 */
export function pulsoLuz(f: Fuego, mueve = 0.5): { k: number; dx: number; dy: number } {
  const c = calorMedio(f), nivel = f.nivel;
  const k = Math.max(0, Math.min(1.3, (1 - mueve + mueve * c.rel) * Math.min(1, nivel * 1.5 + c.k * 2)));
  return { k, dx: (c.x - 0.5) * f.w, dy: (c.y - 1) * f.h };
}

/**
 * Puntas calientes de la llama (donde la lengua termina): hasta `n` puntos {x, y} en celdas y su calor 0..1, para
 * soltar chispas o pavesas. Usa su propio azar (no cambia la llama).
 */
export function brasas(f: Fuego, n = 3, minimo = 0.3): { x: number; y: number; calor: number }[] {
  const { w, h, calor } = f, out: { x: number; y: number; calor: number }[] = [];
  const umbral = Math.round(minimo * CALOR_MAX);
  const cand: number[] = [];
  for (let y = 1; y < h - 1; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (calor[i] >= umbral && calor[i - w] === 0) cand.push(i); }
  let s = f.sb;
  for (let k = 0; k < n && cand.length; k++) {
    s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    const j = Math.floor((s / 4294967296) * cand.length), i = cand[j];
    cand[j] = cand[cand.length - 1]; cand.pop();
    out.push({ x: (i % w) + 0.5, y: Math.floor(i / w), calor: calor[i] / CALOR_MAX });
  }
  f.sb = s;
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// pintar

export interface OpcPintar {
  /** dónde va la esquina de arriba a la izquierda de la grilla en el búfer (px) */
  x?: number;
  y?: number;
  /** interpolar el calor entre celdas (bilineal): la llama se ve como arte prerenderizado, no en bloques. Por omisión sí. */
  suave?: boolean;
  /** trama Bayer 4x4 entre niveles de la paleta (aspecto pixel art, sin bandas). Por omisión no. */
  trama?: boolean;
  /** qué pintar: la llama y el humo juntos, solo la llama (para dibujarla sumando) o solo el humo (con alfa normal) */
  capa?: 'todo' | 'llama' | 'humo';
  /** multiplica el alfa (fundidos) */
  alfa?: number;
  /** 'reemplazar' escribe encima (búfer propio del fuego); 'sobre' compone con alfa sobre lo que haya */
  modo?: 'reemplazar' | 'sobre';
  /** 0..1: suaviza el calor con sus vecinas antes de pintar (quita el granulado; el humo siempre va suavizado) */
  filtro?: number;
  /** celdas de fundido en la fila de abajo (la base de la llama no termina en una línea recta). 0.8 por omisión. */
  pie?: number;
}
let tmpCal = new Float32Array(0), tmpHum = new Float32Array(0);
/** Calor y humo filtrados (1-2-1 en x e y), mezclados con el crudo según `k`. */
function filtrar(f: Fuego, k: number): [Float32Array, Float32Array] {
  const { w, h, calor, humo } = f, n = w * h;
  if (tmpCal.length < n * 2) { tmpCal = new Float32Array(n * 2); tmpHum = new Float32Array(n * 2); }
  const c = tmpCal, m = tmpHum, o = n;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, a = x > 0 ? i - 1 : i, b = x < w - 1 ? i + 1 : i;
    c[o + i] = (calor[a] + 2 * calor[i] + calor[b]) * 0.25; m[o + i] = (humo[a] + 2 * humo[i] + humo[b]) * 0.25;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, a = y > 0 ? i - w : i, b = y < h - 1 ? i + w : i;
    const fc = (c[o + a] + 2 * c[o + i] + c[o + b]) * 0.25;
    c[i] = calor[i] + (fc - calor[i]) * k; m[i] = (m[o + a] + 2 * m[o + i] + m[o + b]) * 0.25;
  }
  return [c, m];
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16 - 0.5);

/** Tamaño en px de un fuego pintado con celdas de `escala` px. */
export const tamanoPintado = (f: Fuego, escala: number): [number, number] => [f.w * escala, f.h * escala];
/** El pie del fuego (centro de la fila de abajo) en px del fuego pintado: ahí va la boca del objeto. */
export const pieFuego = (f: Fuego, escala: number): [number, number] => [(f.w * escala) / 2, f.h * escala];

/**
 * Pinta el fuego en un búfer RGBA (alfa directa) de `ancho` x `alto`, con celdas de `escala` px y su esquina en
 * (o.x, o.y). Para el juego en vivo lo más barato es `escala` 1 en un lienzo chico y que drawImage lo agrande con
 * imageSmoothingEnabled = true; con `escala` > 1 el módulo interpola y (si se pide) trama.
 */
export function pintar(f: Fuego, rgba: Uint8ClampedArray | Uint8Array, ancho: number, alto: number, escala = 1, o: OpcPintar = {}): void {
  const { w, h } = f, pal = f.paleta.colores, [hr, hg, hb, ha] = f.paleta.humo;
  const [calor, humo] = filtrar(f, o.filtro ?? 0);
  const ox = Math.round(o.x ?? 0), oy = Math.round(o.y ?? 0), lisa = o.suave ?? true, trama = !!o.trama, capa = o.capa ?? 'todo';
  const alfaK0 = o.alfa ?? 1, sobre = o.modo === 'sobre', hueco = f.hueco, piv = 1 - hueco * 0.62, pie = (o.pie ?? 0.8) * escala;
  const pw = w * escala, ph = h * escala;
  const x0 = Math.max(0, ox), y0 = Math.max(0, oy), x1 = Math.min(ancho, ox + pw), y1 = Math.min(alto, oy + ph);
  const inv = 1 / escala;
  for (let py = y0; py < y1; py++) {
    let v = (py - oy + 0.5) * inv - 0.5;
    if (!lisa) v = Math.floor((py - oy) * inv);
    v = v < 0 ? 0 : v > h - 1 ? h - 1 : v;
    const iy = Math.min(h - 2, Math.floor(v)), fy = v - iy;
    const alfaK = pie > 0 ? alfaK0 * suave(-0.2, pie, ph - (py - oy) - 0.5) : alfaK0;
    for (let px = x0; px < x1; px++) {
      let u = (px - ox + 0.5) * inv - 0.5;
      if (!lisa) u = Math.floor((px - ox) * inv);
      u = u < 0 ? 0 : u > w - 1 ? w - 1 : u;
      const ix = Math.min(w - 2, Math.floor(u)), fx = u - ix;
      const i00 = iy * w + ix, i01 = i00 + 1, i10 = i00 + w, i11 = i10 + 1;
      const ia = fx * fy, ib = (1 - fx) * fy, ic = fx * (1 - fy), id = (1 - fx) * (1 - fy);
      let c = capa === 'humo' ? 0 : calor[i00] * id + calor[i01] * ic + calor[i10] * ib + calor[i11] * ia;
      let sm = capa === 'llama' ? 0 : humo[i00] * id + humo[i01] * ic + humo[i10] * ib + humo[i11] * ia;
      if (c <= 0.02 && sm <= 0.5) { if (!sobre) { const d = (py * ancho + px) * 4; rgba[d] = rgba[d + 1] = rgba[d + 2] = rgba[d + 3] = 0; } continue; }
      // corazón hueco: lo más caliente vuelve a oscuro y la llama queda como contorno
      if (hueco > 0) { const t = c / CALOR_MAX; if (t > piv) c = Math.max(0, piv - (t - piv) * 1.7) * CALOR_MAX; }
      if (trama) c += BAYER[(py & 3) * 4 + (px & 3)] * 1.6;
      c = c < 0 ? 0 : c > CALOR_MAX ? CALOR_MAX : c;
      let r: number, g: number, b: number, a: number;
      if (trama) { const k = Math.round(c) * 4; r = pal[k]; g = pal[k + 1]; b = pal[k + 2]; a = pal[k + 3]; }
      else {
        const k0 = Math.floor(c), k1 = Math.min(CALOR_MAX, k0 + 1), t = c - k0, j0 = k0 * 4, j1 = k1 * 4;
        r = pal[j0] + (pal[j1] - pal[j0]) * t; g = pal[j0 + 1] + (pal[j1 + 1] - pal[j0 + 1]) * t; b = pal[j0 + 2] + (pal[j1 + 2] - pal[j0 + 2]) * t; a = pal[j0 + 3] + (pal[j1 + 3] - pal[j0 + 3]) * t;
      }
      a = (a / 255) * alfaK;
      // humo detrás de la llama: gris translúcido
      if (sm > 0.5 && ha > 0) {
        const as = Math.min(1, (sm / 255) * ha * 1.6) * (1 - a) * alfaK;
        const at = a + as;
        if (at > 0) { r = (r * a + hr * as) / at; g = (g * a + hg * as) / at; b = (b * a + hb * as) / at; }
        a = at;
      }
      const d = (py * ancho + px) * 4;
      if (sobre) {
        const da = rgba[d + 3] / 255, oa = a + da * (1 - a);
        if (oa <= 0) continue;
        rgba[d] = (r * a + rgba[d] * da * (1 - a)) / oa; rgba[d + 1] = (g * a + rgba[d + 1] * da * (1 - a)) / oa; rgba[d + 2] = (b * a + rgba[d + 2] * da * (1 - a)) / oa; rgba[d + 3] = oa * 255;
      } else { rgba[d] = r; rgba[d + 1] = g; rgba[d + 2] = b; rgba[d + 3] = a * 255; }
    }
  }
}

/** Calor interpolado 0..1 en (u, v) celdas (para quien pinte el fuego a su manera). */
export function calorEn(f: Fuego, u: number, v: number): number {
  const { w, h, calor } = f;
  u = u < 0 ? 0 : u > w - 1 ? w - 1 : u; v = v < 0 ? 0 : v > h - 1 ? h - 1 : v;
  const ix = Math.min(w - 2, Math.floor(u)), iy = Math.min(h - 2, Math.floor(v)), fx = u - ix, fy = v - iy, i = iy * w + ix;
  return ((calor[i] * (1 - fx) + calor[i + 1] * fx) * (1 - fy) + (calor[i + w] * (1 - fx) + calor[i + w + 1] * fx) * fy) / CALOR_MAX;
}

/** Copia del estado (para hornear bucles que empalman o para guardar). */
export function copiarFuego(f: Fuego): Fuego {
  return { ...f, calor: new Uint8Array(f.calor), humo: new Uint8Array(f.humo), fuente: new Float32Array(f.fuente), forma: new Float32Array(f.forma), frio: new Uint8Array(f.frio) };
}

/** Celdas de un fuego (para medir costo: el paso cuesta lineal en celdas, el pintado lineal en px). */
export const celdasDe = (f: Fuego) => f.w * f.h;
