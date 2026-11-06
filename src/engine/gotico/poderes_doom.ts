import * as D from './fuego_doom';

/**
 * Poderes con fuego de Doom, horneados con el mismo formato que poderes.ts (8 direcciones, 25 cuadros por segundo, luz
 * que se suma y materia con alfa). El fuego se simula una vez por poder (el autómata de fuego_doom.ts a 25 pasos por
 * segundo: `t` pasos por cuadro, así la llama corre a su velocidad real) y cada cuadro se pinta en el lienzo del poder
 * con su pie en un punto del piso proyectado.
 *
 * Los que se repiten (bucle) empalman sin salto: se graban K cuadros de más antes del primero y los últimos K se funden
 * en calor con esos (el cuadro n-1 ya es casi el -1, y el siguiente es el 0). Los que pasan una vez siguen un guion:
 * prender, avivar, mover la fuente, apagar.
 *
 * La luz de cada uno (luz_efectos.ts) sale de `curvaDoom`: el calor medio de la llama en cada cuadro.
 *
 * Este archivo no importa poderes.ts (solo sus tipos por estructura): poderes.ts lo importa y suma estos efectos a su
 * lista, y reemplaza el cuerpo de crater_ardiente manteniendo su id, cuadros, celda y ancla (muro_llamas se probó y
 * quedó como estaba: sus lenguas nítidas se veían mejor).
 */

type V3 = [number, number, number];
type C = [number, number, number];
/** Lo que se usa del lienzo de poderes.ts (mismas firmas). */
export interface LienzoDoom {
  P(p: V3): [number, number];
  imagen(x0: number, y0: number, w: number, h: number, rgba: ArrayLike<number>, luz: boolean, k?: number): void;
  luz(x: number, y: number, r: number, c: C, k: number, ex?: number, ey?: number, ang?: number): void;
  trazo(xa: number, ya: number, xb: number, yb: number, ra: number, rb: number, c: C, ka: number, kb?: number): void;
  piso(p: V3, rw: number, c: C, k: number): void;
  mancha(x: number, y: number, rx: number, ry: number, c: C, a: number, nx?: number, ny?: number, borde?: number): void;
  rayo3(a: V3, b: V3, ra: number, rb: number, c: C, ka: number, kb?: number): void;
  humo(x: number, y: number, r: number, c: C, a: number, nx?: number, ny?: number, ey?: number): void;
  bola(p: V3, r: number, c: C, k: number, ex?: number, ey?: number): void;
}
export interface CxDoom { L: LienzoDoom; f: number; n: number; u: number; v: number; sem: number; R(k?: number): () => number }
export interface DefDoom {
  id: string;
  nombre: [string, string];
  elemento: 'fuego' | 'hielo' | 'sombra' | 'sagrado';
  tipo: 'area' | 'aura' | 'impacto' | 'buff' | 'muro' | 'lluvia';
  cuadros: number;
  t: number;
  dir?: boolean;
  bucle?: boolean;
  /** caja fija del cuadro en el lienzo (para mejorar un poder sin mover su celda ni su ancla) */
  caja?: { x0: number; y0: number; w: number; h: number };
  pinta: (c: CxDoom) => void;
}

const TAU = Math.PI * 2, S2 = Math.SQRT2, KZ = Math.sqrt(1.5);
const frac = (x: number) => x - Math.floor(x);
const c01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const suave = (a: number, b: number, x: number) => { const t = c01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const hexC = (h: string): C => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
/** Ancla de los lienzos de poderes.ts (para las cajas fijas). */
const AX = 380, AY = 520;

// ---------------------------------------------------------------------------------------------------------------
// secuencias: el fuego simulado una vez por poder

interface Cuadro { calor: Uint8Array; humo: Uint8Array; k: number }
interface Secuencia { base: D.Fuego; celda: number; cuadros: Cuadro[] }
interface Guion {
  /** crea el fuego (ya precalentado si arranca encendido) */
  crear: () => D.Fuego;
  celda: number;
  /** pasos del autómata por cuadro (el `t` del poder: 25 pasos por segundo) */
  t: number;
  n: number;
  bucle: boolean;
  /** cuadros de fundido del empalme (bucle) */
  funde?: number;
  /** guion de los que pasan una vez: se llama antes de avanzar al cuadro i */
  antes?: (f: D.Fuego, i: number) => void;
  /** pasos del cuadro i si no son siempre `t` (una erupción sube más rápido que lo que arde quieto) */
  pasosEn?: (i: number) => number;
}
const SECUENCIAS = new Map<string, Secuencia>();
function foto(f: D.Fuego): Cuadro { return { calor: new Uint8Array(f.calor), humo: new Uint8Array(f.humo), k: D.calorMedio(f).k }; }

function secuencia(id: string, g: Guion): Secuencia {
  const s = SECUENCIAS.get(id);
  if (s) return s;
  const f = g.crear(), cuadros: Cuadro[] = [];
  if (g.bucle) {
    const K = Math.min(g.n - 1, g.funde ?? 3), grab: Cuadro[] = [];
    for (let i = -K; i < g.n; i++) { grab.push(foto(f)); D.pasos(f, g.t); }
    for (let i = 0; i < g.n; i++) {
      const a = grab[i + K];
      if (i < g.n - K) { cuadros.push(a); continue; }
      // empalme: el cuadro i se funde con el i - n (grabado antes del 0)
      const b = grab[i - g.n + K], w = (i - (g.n - K) + 1) / (K + 1), cal = new Uint8Array(a.calor.length), hum = new Uint8Array(a.humo.length);
      for (let j = 0; j < cal.length; j++) { cal[j] = Math.round(a.calor[j] * (1 - w) + b.calor[j] * w); hum[j] = Math.round(a.humo[j] * (1 - w) + b.humo[j] * w); }
      cuadros.push({ calor: cal, humo: hum, k: a.k * (1 - w) + b.k * w });
    }
  } else {
    for (let i = 0; i < g.n; i++) { g.antes?.(f, i); D.pasos(f, g.pasosEn?.(i) ?? g.t); cuadros.push(foto(f)); }
  }
  const out = { base: D.copiarFuego(f), celda: g.celda, cuadros };
  SECUENCIAS.set(id, out);
  return out;
}

let buf = new Uint8ClampedArray(0);
/**
 * Pinta el cuadro i de una secuencia en el lienzo con el pie de la grilla en (x, y) del lienzo: el humo como materia
 * y la llama como luz. `caja` (coordenadas del lienzo) funde el borde para que nada se corte en seco.
 */
function pintarCuadro(L: LienzoDoom, s: Secuencia, i: number, x: number, y: number, k = 1, o: { caja?: { x0: number; y0: number; w: number; h: number }; humo?: number } = {}): void {
  const q = s.cuadros[((i % s.cuadros.length) + s.cuadros.length) % s.cuadros.length];
  const f = s.base;
  f.calor.set(q.calor); f.humo.set(q.humo);
  const [pw, ph] = D.tamanoPintado(f, s.celda), [px, py] = D.pieFuego(f, s.celda);
  if (buf.length < pw * ph * 4) buf = new Uint8ClampedArray(pw * ph * 4);
  const x0 = Math.round(x - px), y0 = Math.round(y - py);
  const borde = (b: Uint8ClampedArray) => {
    const c = o.caja; if (!c) return;
    for (let yy = 0; yy < ph; yy++) for (let xx = 0; xx < pw; xx++) {
      const X = x0 + xx, Y = y0 + yy, d = Math.min(X - c.x0, c.x0 + c.w - 1 - X, Y - c.y0, c.y0 + c.h - 1 - Y);
      if (d < 8) b[(yy * pw + xx) * 4 + 3] *= suave(0, 8, d);
    }
  };
  if ((o.humo ?? 1) > 0) {
    D.pintar(f, buf, pw, ph, s.celda, { capa: 'humo', filtro: 0.8, alfa: o.humo ?? 1 });
    borde(buf);
    L.imagen(x0, y0, pw, ph, buf, false, 1);
  }
  D.pintar(f, buf, pw, ph, s.celda, { capa: 'llama', filtro: 0.8 });
  borde(buf);
  L.imagen(x0, y0, pw, ph, buf, f.paleta.mezcla === 'sumar', k);
}

/** Calor medio por cuadro de la secuencia de un poder, normalizado a su máximo (la curva de su luz). */
export function curvaDoom(id: string): number[] {
  const s = SECUENCIAS.get(id) ?? (GUIONES[id] ? secuencia(id, GUIONES[id]) : null);
  if (!s) throw new Error(`curvaDoom: ${id} no es un poder de Doom`);
  const ks = s.cuadros.map((q) => q.k), m = Math.max(1e-6, ...ks), bucle = GUIONES[id]?.bucle;
  // en un bucle el calor medio cambia poco: se exagera la diferencia (x3) para que la luz tiemble a la vista
  return ks.map((k) => Math.round((bucle ? Math.max(0.45, 1 - 3 * (1 - k / m)) : c01(k / m)) * 100) / 100);
}

// ---------------------------------------------------------------------------------------------------------------
// formas en el piso: de unidades del mundo a celdas de la grilla (proyección 2:1 del taller)

/** Celdas que mide en x un radio del mundo sobre el piso. */
const rx = (rw: number, celda: number) => (rw * S2) / celda;
/**
 * Cuánto baja el pie de la grilla desde el centro de un círculo o anillo de radio `r` celdas (en x) de fuego_doom: su
 * centro está en la fila alto - 1 - r/2, así que el centro del piso queda (r/2 + 1) celdas arriba del pie.
 */
const bajoCentro = (r: number, celda: number) => (r / 2 + 1) * celda;
/** Lo mismo para un centro en la fila `fila` contada desde abajo (0 = la última). */
const bajoFila = (fila: number, celda: number) => (fila + 0.5) * celda;

/** chispas que suben y se repiten con u (como las brasas de poderes.ts) */
function chispas(L: LienzoDoom, R: () => number, n: number, rad: number, z0: number, alto: number, u: number, pal: C[], k = 1): void {
  for (let i = 0; i < n; i++) {
    const a = R() * TAU, rr = Math.sqrt(R()) * rad, ph = R(), vel = 0.7 + R() * 0.6, ws = R() * TAU;
    const t = frac(u * (vel > 1 ? 2 : 1) + ph), wob = Math.sin(t * 7 + ws) * 3;
    const [x, y] = L.P([Math.cos(a) * rr + wob / 2, Math.sin(a) * rr - wob / 2, z0 + t * alto]);
    const kk = k * (t < 0.1 ? t / 0.1 : 1 - (t - 0.1) / 0.9) * (0.6 + 0.4 * Math.sin(t * 23 + ws));
    L.trazo(x, y, x - wob * 0.3, y + 2.5, 0.75, 0.5, pal[Math.min(pal.length - 1, Math.floor(t * pal.length))], kk * 1.5, 0);
  }
}
const BRASA: C[] = [[1, 0.86, 0.5], [1, 0.55, 0.16], [0.9, 0.26, 0.05]];
const FRIO: C[] = [[0.9, 0.95, 0.9], [0.45, 0.85, 0.82], [0.1, 0.45, 0.5]];
const PALIDO: C[] = [[0.97, 0.98, 1], [0.78, 0.85, 0.95], [0.5, 0.58, 0.7]];

// ---------------------------------------------------------------------------------------------------------------
// los guiones de cada fuego

/**
 * Bases de lenguas sueltas sobre un charco del piso de radio `rw` (mundo): puntos [x, y] en celdas de una grilla de
 * `w` x `h` cuyo centro del piso está en la fila h - 1 - r/2 (como el círculo de fuego_doom). Lenguas separadas que se
 * juntan arriba: así un muro o un charco no sale como una pared de techo plano.
 */
function lenguas(n: number, rw: number, celda: number, w: number, h: number, sem: number, centro = 0.25): [number, number][] {
  const r = D.azar(sem), R = rx(rw, celda), cx = w / 2, cy = h - 1 - R / 2, out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + r() * 0.9, d = Math.sqrt(centro + (1 - centro) * r()) * 0.92;
    out.push([Math.round((cx + Math.cos(a) * d * R) * 10) / 10, Math.round(cy + Math.sin(a) * d * R / 2)]);
  }
  return out;
}

/** Celda de los poderes horneados: 2 px (más fina que en el mundo: acá no se paga en vivo y las áreas son grandes). */
const CP = 2;
/** decay para que la llama se vea de `px` en una grilla de `altoPx` (ver decayPara) */
const dec = (px: number, altoPx: number) => Math.round(D.decayPara(px / altoPx, altoPx / CP) * 100) / 100;
const anchoAnillo = (rw: number) => Math.ceil(rx(rw, CP) * 2) + 12;

const GUIONES: Record<string, Guion> = {
  // tramo de muro: lenguas altas sobre una casilla y media (el juego los pone en fila)
  muro_infierno: {
    celda: CP, t: 2, n: 12, bucle: true,
    crear: () => D.crearFuego({ ancho: 50, alto: 92, forma: { tipo: 'puntos', en: lenguas(9, 20, CP, 50, 92, 41, 0.35), ancho: 3 }, paleta: 'infierno', semilla: 4101, decay: dec(112, 184), humo: 0.55, ruido: 0.3, turbulencia: 0.4 }),
  },
  // anillo de llamas sobre el piso, de radio 52 (casi dos casillas), a tramos
  cerco_llamas: {
    celda: CP, t: 2, n: 12, bucle: true,
    crear: () => D.crearFuego({ ancho: anchoAnillo(52), alto: 78, forma: { tipo: 'anillo', radio: rx(52, CP), grosor: 1.3, relleno: 0.5 }, paleta: 'infierno', semilla: 4102, decay: dec(58, 156), humo: 0.45, ruido: 0.4, turbulencia: 0.4 }),
  },
  // suelo que arde: llamas bajas a manchas en un charco de radio 40
  suelo_ardiente: {
    celda: CP, t: 2, n: 10, bucle: true,
    crear: () => D.crearFuego({ ancho: anchoAnillo(40), alto: 60, forma: { tipo: 'circulo', radio: rx(40, CP), relleno: 0.22 }, paleta: 'infierno', semilla: 4103, decay: dec(24, 120), humo: 0.45, ruido: 0.6, tramo: 3, turbulencia: 0.5 }),
  },
  // brasas que caen y prenden fuegos chicos donde pegan (la fuente se arma cuadro a cuadro); después se templa
  lluvia_brasas: {
    celda: CP, t: 2, n: 18, bucle: false,
    crear: () => D.crearFuego({ ancho: anchoAnillo(56), alto: 64, forma: { tipo: 'mapa', fuente: [] }, paleta: 'infierno', semilla: 4104, decay: dec(44, 128), humo: 0.25, ruido: 0.25, turbulencia: 0.4, brillo: 1.7, pegada: 0.7 }),
    pasosEn: (i) => (i < 13 ? 3 : 4),
    antes: (f, i) => {
      // donde pega cada brasa nace un fuego chico: una mancha de fuente de 7 x 2 celdas, al rojo, y se aviva
      for (const g of GOLPES_LLUVIA) if (g.cuadro === i) {
        for (let dy = -1; dy <= 0; dy++) for (let dx = -3; dx <= 3; dx++) {
          const x = Math.round(f.w / 2 + g.cx * 1.5 + dx), y = Math.round(f.h - 18 + g.cy * 1.5 + dy);
          if (x > 1 && y > 1 && x < f.w - 2 && y < f.h) f.fuente[y * f.w + x] = Math.max(f.fuente[y * f.w + x], 1 - Math.abs(dx) * 0.08);
        }
        D.avivar(f, 1.3, 0.25);
      }
      if (i === 13) { D.apagar(f); f.nivel = 0.3; }
      if (i === 15) f.decay *= 1.8;
    },
  },
  // pilar: el sello brilla, revienta una columna de fuego alta y rápida (más pasos por cuadro) y se apaga templándose
  pilar_infernal: {
    celda: CP, t: 2, n: 16, bucle: false,
    crear: () => D.crearFuego({ ancho: 40, alto: 98, forma: { tipo: 'llama', ancho: 0.45 }, paleta: 'infierno', semilla: 4105, decay: dec(175, 196), humo: 0.6, encendido: 0, turbulencia: 0.4, ruido: 0.25 }),
    pasosEn: (i) => (i < 2 ? 2 : i < 10 ? 10 : 5),
    antes: (f, i) => {
      if (i === 2) { D.encender(f, 1); f.nivel = 1; D.avivar(f, 1.4, 0.4); }
      if (i === 9) { D.apagar(f); f.nivel = 0.25; }
      if (i === 11) f.decay *= 2;
    },
  },
  // nova de fuego frío: lenguas de ánimas en un aro que se abre de 8 a 72 y se apaga templándose
  llanto_animas: {
    celda: CP, t: 2, n: 14, bucle: false,
    crear: () => D.crearFuego({ ancho: anchoAnillo(76), alto: 84, forma: { tipo: 'mapa', fuente: [] }, paleta: 'animas', semilla: 4106, decay: dec(64, 168), humo: 0.4, hueco: 0.4, ruido: 0.3, turbulencia: 0.35 }),
    pasosEn: (i) => (i < 9 ? 3 : 4),
    antes: (f, i) => {
      const r = rx(8 + 64 * (1 - (1 - Math.min(1, i / 8)) ** 2), CP), cx = f.w / 2, cy = f.h - 2 - rx(72, CP) / 2;
      f.fuente.fill(0);
      if (i <= 8) for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
        const ang = Math.atan2((y - cy) / (r / 2), (x - cx) / r), d = Math.abs(Math.hypot((x - cx) / r, (y - cy) / (r / 2)) - 1) * r;
        if (d < 1.2 && x > 1 && x < f.w - 2 && Math.sin(ang * 8 + i * 0.6) > 0.25) f.fuente[y * f.w + x] = 0.85 + 0.15 * (1 - d / 1.2);
      }
      if (i === 9) { D.apagar(f); f.nivel = 0; }
      if (i === 10) f.decay *= 1.8;
    },
  },
  // aura de la corona fría: lenguas pálidas que suben alrededor del cuerpo desde un anillo a tramos en los pies
  llama_corona_fria: {
    celda: CP, t: 2, n: 12, bucle: true,
    crear: () => D.crearFuego({ ancho: 38, alto: 60, forma: { tipo: 'anillo', radio: rx(17, CP), grosor: 1, relleno: 0.6 }, paleta: 'corona_fria', semilla: 4107, decay: dec(84, 120), humo: 0.25, hueco: 0.25, turbulencia: 0.35, ruido: 0.4, rafagas: 0.1 }),
  },
  // mejora de uno de siempre (misma caja), con fuego de Doom
  crater_ardiente: {
    celda: CP, t: 2, n: 10, bucle: true,
    crear: () => D.crearFuego({ ancho: 42, alto: 34, forma: { tipo: 'puntos', en: lenguas(6, 15, CP, 42, 34, 44, 0.15), ancho: 2 }, paleta: 'infierno', semilla: 4112, decay: dec(36, 68), brillo: 1.5, pegada: 0.6, humo: 0.35, ruido: 0.45, tramo: 2.2, turbulencia: 0.45 }),
  },
};

/** Dónde pegan las brasas de la lluvia: cuadro y celda (desde el centro de abajo de la grilla). */
const GOLPES_LLUVIA: { cuadro: number; cx: number; cy: number; wx: number; wy: number }[] = (() => {
  const r = D.azar(4199), out: { cuadro: number; cx: number; cy: number; wx: number; wy: number }[] = [];
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * TAU * 2.3 + r() * 1.2, d = Math.sqrt(0.08 + 0.92 * r()) * 50, wx = Math.cos(a) * d, wy = Math.sin(a) * d;
    // del mundo a celdas: x de pantalla = (wx - wy), y de pantalla = (wx + wy) / 2 (el centro queda en la fila alto - 12)
    out.push({ cuadro: 3 + Math.floor((k / 14) * 9), cx: (wx - wy) / 3, cy: (wx + wy) / 2 / 3, wx, wy });
  }
  return out;
})();

// ---------------------------------------------------------------------------------------------------------------
// los poderes

const seq = (id: string) => secuencia(id, GUIONES[id]);
const PAL = (n: D.NombrePaleta) => hexC(D.PALETAS[n].luz);

export const DEFS_DOOM: DefDoom[] = [
  {
    id: 'muro_infierno', nombre: ['Muro del Infierno (tramo)', 'Wall of Perdition (segment)'], elemento: 'fuego', tipo: 'muro', cuadros: 12, t: 2, bucle: true,
    pinta: (c) => {
      const { L } = c, s = seq('muro_infierno'), [x, y] = L.P([0, 0, 0]), k = s.cuadros[c.f].k;
      L.mancha(x, y + 2, 34, 15, [0.05, 0.035, 0.03], 0.7, 2.3, 1.1, 0.5);
      L.piso([0, 0, 0], 40, PAL('infierno'), 0.55 * (0.8 + 0.2 * k));
      pintarCuadro(L, s, c.f, x, y + bajoCentro(rx(20, CP), CP), 1);
      chispas(L, c.R(3), 12, 18, 30, 110, c.u, BRASA, 0.9);
    },
  },
  {
    id: 'cerco_llamas', nombre: ['Cerco de Llamas', 'Ring of Pyres'], elemento: 'fuego', tipo: 'area', cuadros: 12, t: 2, bucle: true,
    pinta: (c) => {
      const { L } = c, s = seq('cerco_llamas'), [x, y] = L.P([0, 0, 0]), r = rx(52, 3) * 3;
      L.mancha(x, y, r + 8, (r + 8) / 2, [0.05, 0.035, 0.03], 0.55, 3.1, 0.7, 0.35);
      L.piso([0, 0, 0], 66, PAL('infierno'), 0.35);
      pintarCuadro(L, s, c.f, x, y + bajoCentro(rx(52, CP), CP), 1);
      chispas(L, c.R(5), 14, 52, 20, 90, c.u, BRASA, 0.7);
    },
  },
  {
    id: 'suelo_ardiente', nombre: ['Suelo Ardiente', 'Burning Ground'], elemento: 'fuego', tipo: 'area', cuadros: 10, t: 2, bucle: true,
    pinta: (c) => {
      const { L } = c, s = seq('suelo_ardiente'), [x, y] = L.P([0, 0, 0]), r = rx(40, 3) * 3;
      L.mancha(x, y, r + 6, (r + 6) / 2, [0.045, 0.03, 0.025], 0.75, 1.7, 2.9, 0.5);
      L.piso([0, 0, 0], 46, PAL('infierno'), 0.45 * (0.85 + 0.15 * s.cuadros[c.f].k));
      pintarCuadro(L, s, c.f, x, y + bajoCentro(rx(40, CP), CP), 0.85);
      chispas(L, c.R(6), 8, 36, 6, 50, c.u, BRASA, 0.6);
    },
  },
  {
    id: 'lluvia_brasas', nombre: ['Lluvia de Brasas', 'Rain of Cinders'], elemento: 'fuego', tipo: 'lluvia', cuadros: 18, t: 2,
    pinta: (c) => {
      const { L } = c, s = seq('lluvia_brasas'), [x, y] = L.P([0, 0, 0]);
      const k = s.cuadros[c.f].k;
      L.mancha(x, y, 72, 36, [0.045, 0.03, 0.025], 0.5 * Math.min(1, c.f / 6), 2.7, 1.9, 0.5);
      L.piso([0, 0, 0], 64, PAL('infierno'), 0.3 + 0.5 * k);
      // primero las llamitas del piso (detrás de las brasas que siguen cayendo)
      pintarCuadro(L, s, c.f, x, y + bajoFila(17, CP), 1);
      for (const g of GOLPES_LLUVIA) {
        const T = c.f + 0.5 - g.cuadro;
        // cae: brasa grande con estela, en diagonal desde arriba (3.5 cuadros en el aire)
        if (T > -3.5 && T <= 0) {
          const z = -T * 58, a: V3 = [g.wx - z * 0.32, g.wy - z * 0.16, z + 3], b: V3 = [a[0] - 11, a[1] - 5.5, a[2] + 34];
          // humo de la estela (materia, detrás), estela de fuego gruesa y la brasa: un carbón que arde
          const [hx, hy] = L.P([a[0] - 14, a[1] - 7, a[2] + 44]);
          L.humo(hx, hy, 7, [0.16, 0.12, 0.1], 0.35, g.wx * 0.1, T);
          L.rayo3(a, b, 8, 3, BRASA[2], 0.32, 0);
          L.rayo3(a, b, 3.4, 1, BRASA[1], 1.15, 0);
          L.rayo3(a, b, 1.4, 0.5, BRASA[0], 1.4, 0);
          L.bola(a, 14, BRASA[2], 0.42);
          L.bola(a, 6, BRASA[1], 1.4);
          L.bola(a, 2.8, BRASA[0], 2.2);
        }
        // revienta al tocar el piso: fogonazo, chispas que saltan y se apagan
        if (T > 0 && T < 2) {
          const q = T / 2, R = D.azar(g.cuadro * 977 + Math.round(g.wx * 13));
          L.piso([g.wx, g.wy, 0], 16 + 10 * q, BRASA[1], 1.1 * (1 - q));
          L.bola([g.wx, g.wy, 5], 9 * (1 - q * 0.5), BRASA[0], 0.9 * (1 - q) ** 2);
          for (let i = 0; i < 7; i++) {
            const an = R() * TAU, v = 14 + R() * 18, up = 18 + R() * 22, t1 = q * 0.9, t0 = Math.max(0, t1 - 0.12);
            const at = (t: number): V3 => [g.wx + Math.cos(an) * v * t, g.wy + Math.sin(an) * v * t, Math.max(0, up * t - 40 * t * t)];
            L.rayo3(at(t1), at(t0), 0.9, 0.5, BRASA[1], 1.4 * (1 - q), 0);
          }
        }
      }
    },
  },
  {
    id: 'pilar_infernal', nombre: ['Pilar Infernal', 'Infernal Pillar'], elemento: 'fuego', tipo: 'impacto', cuadros: 16, t: 2,
    pinta: (c) => {
      const { L } = c, s = seq('pilar_infernal'), [x, y] = L.P([0, 0, 0]), f = c.f;
      // el sello en el piso que avisa y queda quemado
      const aviso = f < 3 ? (f + 1) / 3 : Math.max(0, 1 - (f - 3) / 10);
      L.mancha(x, y, 28, 14, [0.05, 0.035, 0.03], 0.6 * Math.min(1, (f + 1) / 3), 1.9, 3.3, 0.4);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.3, b = a + TAU / 3; L.rayo3([Math.cos(a) * 20, Math.sin(a) * 20, 0], [Math.cos(b) * 20, Math.sin(b) * 20, 0], 1, 1, BRASA[1], 0.6 * aviso); }
      L.piso([0, 0, 0], 30, PAL('infierno'), 0.9 * Math.max(aviso, s.cuadros[f].k * 1.4));
      pintarCuadro(L, s, f, x, y + 2, 1);
      if (f >= 2 && f < 12) chispas(L, c.R(7), 16, 14, 20, 170, c.v * 2, BRASA, 1 - (f - 2) / 10);
    },
  },
  {
    id: 'llanto_animas', nombre: ['Llanto de Ánimas', 'Wail of the Souls'], elemento: 'sombra', tipo: 'area', cuadros: 14, t: 2,
    pinta: (c) => {
      const { L } = c, s = seq('llanto_animas'), [x, y] = L.P([0, 0, 0]), f = c.f;
      const r = 8 + 64 * (1 - (1 - Math.min(1, f / 9)) ** 2);
      L.piso([0, 0, 0], r + 10, PAL('animas'), 0.5 * Math.max(0, 1 - f / 13));
      pintarCuadro(L, s, f, x, y + bajoFila(1 + rx(72, CP) / 2, CP), 1);
      if (f < 11) chispas(L, c.R(9), 12, r, 4, 70, c.v, FRIO, 0.6 * (1 - f / 11));
    },
  },
  {
    id: 'llama_corona_fria', nombre: ['Llama de la Corona Fría', 'Flame of the Cold Crown'], elemento: 'hielo', tipo: 'aura', cuadros: 12, t: 2, bucle: true,
    pinta: (c) => {
      const { L } = c, s = seq('llama_corona_fria'), [x, y] = L.P([0, 0, 0]);
      L.piso([0, 0, 0], 26, PAL('corona_fria'), 0.4);
      pintarCuadro(L, s, c.f, x, y + bajoCentro(rx(17, CP), CP), 1);
      chispas(L, c.R(11), 8, 14, 10, 100, c.u, PALIDO, 0.5);
    },
  },
];

/** El nuevo cuerpo de dos poderes de siempre (mismo id, cuadros, celda y ancla: la caja es la que medían antes). */
export const MEJORAS_DOOM: Record<string, Pick<DefDoom, 'pinta' | 'caja'>> = {
  crater_ardiente: {
    caja: { x0: AX - 45, y0: AY - 78, w: 93, h: 105 },
    pinta: (c) => {
      const { L } = c, [cx, cy] = L.P([0, 0, 0]), R = c.R(), s = seq('crater_ardiente'), caja = MEJORAS_DOOM.crater_ardiente.caja;
      const pul = 0.85 + 0.15 * s.cuadros[c.f].k;
      L.mancha(cx, cy, 44, 22, [0.07, 0.05, 0.045], 0.9, 1.3, 2.1, 0.5);
      L.mancha(cx, cy - 1, 30, 15, [0.04, 0.025, 0.02], 0.9, 4.1, 0.7, 0.4);
      // grietas encendidas (las de siempre), que laten con la llama
      for (let i = 0; i < 8; i++) {
        let a = (i / 8) * TAU + R() * 0.5;
        const r0 = 5 + R() * 5;
        let x = Math.cos(a) * r0, y = Math.sin(a) * r0;
        const n = 3 + Math.floor(R() * 3);
        for (let j = 0; j < n; j++) {
          const st = 3 + R() * 3;
          a += (R() - 0.5) * 1.3;
          const nx = x + Math.cos(a) * st, ny = y + Math.sin(a) * st, k = (1 - j / n) * 0.6 * pul;
          L.rayo3([x, y, 0], [nx, ny, 0], 1.2, 0.9, BRASA[1], k * 1.2, k);
          L.rayo3([x, y, 0], [nx, ny, 0], 3.5, 3, BRASA[2], k * 0.3, k * 0.25);
          x = nx; y = ny;
        }
      }
      L.piso([0, 0, 0], 12, BRASA[1], 0.9 * pul);
      L.piso([0, 0, 0], 30, BRASA[2], 0.5);
      pintarCuadro(L, s, c.f, cx, cy + bajoCentro(rx(15, CP), CP), 1, { caja });
      chispas(L, c.R(8), 10, 16, 4, 50, c.u, BRASA, 0.9);
    },
  },
};

/** Ids nuevos de esta tanda (van al lado de los de siempre). */
export const EFECTOS_DOOM = DEFS_DOOM.map((d) => d.id);
/** Dónde va la altura del fuego en la proyección (para quien quiera ubicar la luz): z del mundo a px. */
export const pxAlto = (z: number) => z * KZ;
