import { createRaster, type Raster } from '../../core/raster';
import { hexToRgb } from '../../color/oklab';
import { rotSprite, type IndexImage } from '../../render/rotsprite';
import type { AnimRender, Caja, DatosCuadro, Zona } from '../datos';
import type { Fase } from '../golpes';

/**
 * El muñeco de pixel a mano: un luchador pintado pixel por pixel en una hoja, cortado en piezas con su pivote (la
 * cabeza, el torso, cada brazo y cada pierna en dos). Las poses giran y corren las piezas con RotSprite, así no
 * aparecen colores nuevos ni se rompe el contorno, y cada cuadro puede llevar retoques a mano encima.
 * Es como trabajaban los estudios de pixel: el arte es a mano y las piezas se reusan de cuadro en cuadro.
 */
export interface PiezaPixel {
  /** dónde empieza la pieza en la hoja */
  x: number;
  y: number;
  /** la junta con su padre, en coordenadas de la hoja: alrededor de ella gira */
  pivote: [number, number];
  /** la pieza de la que cuelga (null si cuelga de la raíz) */
  padre: string | null;
  /** una fila de texto por fila de pixeles: '.' vacío y una letra por tono (A es el primero de la paleta) */
  filas: string[];
  /** solo en una pieza de recambio: dónde se pega en su padre, si no es en su propio pivote */
  ancla?: [number, number];
  /** solo en una pieza de recambio: dónde quedan los puntos que la siguen (el puño de una mano abierta) */
  puntos?: Record<string, [number, number]>;
}

/**
 * Un cuadro dibujado entero (una pose clave pintada completa, no armada con piezas). Se pone con su ancla sobre el
 * pivote del luchador y puede girar entero o voltearse. Así las poses que las piezas no alcanzan quedan fieles.
 */
export interface DibujoPixel {
  filas: string[];
  /** el punto del dibujo que va sobre el pivote del luchador (el centro entre los pies, en el piso) */
  ancla: [number, number];
  /** los puntos del dibujo: puños, pies, cabeza */
  puntos: Record<string, [number, number]>;
  /** hasta qué fila es cabeza y hasta cuál cuerpo, para las cajas que reciben (lo de abajo son piernas) */
  zonas: [number, number];
}

export interface MunecoPixel {
  nombre: string;
  paleta: string[];
  /** tamaño de la hoja */
  w: number;
  h: number;
  /** la fila del piso bajo los pies y la columna del centro del cuerpo: el pivote del luchador */
  piso: number;
  centro: number;
  /** orden de dibujo, de atrás hacia adelante */
  orden: string[];
  piezas: Record<string, PiezaPixel>;
  /** puntos que siguen a una pieza (los puños, las puntas de los pies), en coordenadas de la hoja */
  puntos: Record<string, { pieza: string; en: [number, number] }>;
  /** de qué zona es cada pieza, para las cajas que reciben */
  zonas: Record<string, Zona>;
  /** las poses clave dibujadas enteras */
  dibujos?: Record<string, DibujoPixel>;
}

export interface ParchePixel {
  x: number;
  y: number;
  /** ' ' no toca, '.' borra, una letra pinta ese tono */
  filas: string[];
}

export interface PosePixel {
  /** giro de cada pieza en grados, sumado al de su padre. Positivo es en el sentido del reloj */
  giro?: Record<string, number>;
  /** corrimiento de cada pieza en pixeles de pantalla, después de girar */
  mover?: Record<string, [number, number]>;
  /** el muñeco entero: corrimiento y giro alrededor de un centro de la hoja (el centro del cuerpo si no se dice) */
  raiz?: { x?: number; y?: number; giro?: number; centro?: [number, number] };
  /** estira o voltea una pieza a lo ancho antes de girarla (-1 la voltea): sirve para fingir una vuelta */
  ancho?: Record<string, number>;
  orden?: string[];
  ocultar?: string[];
  /** una pieza dibujada aparte en lugar de la de la hoja (una mano abierta, una cara de dolor) */
  cambiar?: Record<string, PiezaPixel>;
  /** retoques a mano sobre el cuadro armado, en coordenadas de la hoja */
  parches?: ParchePixel[];
  /** baja o sube el cuadro entero para que el pixel más bajo pise el piso (para las poses de pie) */
  suelo?: boolean;
  /** con `suelo`: cuántos pixeles queda por encima del piso (un rebote) */
  sobre?: number;
  /** en vez de armar las piezas, pone este dibujo entero (girado con `raiz.giro` alrededor de su centro) */
  dibujo?: string;
  /** voltea el dibujo de izquierda a derecha */
  espejo?: boolean;
}

export interface CuadroPixel {
  w: number;
  h: number;
  idx: Int16Array;
  /** qué pieza pintó cada pixel (índice en el orden de dibujo, -1 vacío) */
  pieza: Int8Array;
  orden: string[];
  /** los puntos del muñeco ya en el lienzo */
  puntos: Record<string, [number, number]>;
}

export interface LienzoPixel {
  w: number;
  h: number;
  /** dónde cae el pivote del luchador (centro, piso) en el lienzo */
  ox: number;
  oy: number;
}

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function imagenPieza(p: PiezaPixel): IndexImage {
  const h = p.filas.length, w = Math.max(...p.filas.map((f) => f.length));
  const idx = new Int16Array(w * h).fill(-1);
  p.filas.forEach((f, y) => {
    for (let x = 0; x < f.length; x++) if (f[x] !== '.') idx[y * w + x] = LETRAS.indexOf(f[x]);
  });
  return { w, h, idx };
}

/** Estira una imagen a lo ancho alrededor de una columna (vecino más cercano); con k negativo la voltea. */
function estirar(img: IndexImage, k: number, px: number): { img: IndexImage; px: number } {
  if (k === 1) return { img, px };
  const a = Math.abs(k);
  const w = Math.max(1, Math.round(img.w * a));
  const idx = new Int16Array(w * img.h).fill(-1);
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < w; x++) {
      const sx = Math.min(img.w - 1, Math.floor((x + 0.5) / a));
      idx[y * w + (k < 0 ? w - 1 - x : x)] = img.idx[y * img.w + sx];
    }
  const npx = px * a;
  return { img: { w, h: img.h, idx }, px: k < 0 ? w - npx : npx };
}

type Trans = { a: number; f: (q: [number, number]) => [number, number] };

/** Arma un cuadro: cada pieza girada y puesta en su lugar, de atrás hacia adelante, y los retoques encima. */
export function componerPixel(m: MunecoPixel, pose: PosePixel, l: LienzoPixel): CuadroPixel {
  const orden = pose.orden ?? m.orden;
  const idx = new Int16Array(l.w * l.h).fill(-1);
  const pieza = new Int8Array(l.w * l.h).fill(-1);
  const r = pose.raiz ?? {};
  const rc: [number, number] = r.centro ?? [m.centro, m.piso - m.h * 0.45];
  const ra = ((r.giro ?? 0) * Math.PI) / 180;
  const rot = (a: number, v: [number, number]): [number, number] => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
  const raiz: Trans = { a: r.giro ?? 0, f: (q) => { const v = rot(ra, [q[0] - rc[0], q[1] - rc[1]]); return [v[0] + rc[0] + (r.x ?? 0), v[1] + rc[1] + (r.y ?? 0)]; } };
  const memo: Record<string, Trans> = {};
  const trans = (n: string): Trans => {
    if (memo[n]) return memo[n];
    const p = pose.cambiar?.[n] ?? m.piezas[n];
    const padre = m.piezas[n].padre ? trans(m.piezas[n].padre!) : raiz;
    const a = padre.a + (pose.giro?.[n] ?? 0);
    const w0 = padre.f(p.ancla ?? p.pivote), mv = pose.mover?.[n] ?? [0, 0];
    const W: [number, number] = [w0[0] + mv[0], w0[1] + mv[1]];
    const ar = (a * Math.PI) / 180;
    const k = pose.ancho?.[n] ?? 1;
    const t: Trans = { a, f: (q) => { const v = rot(ar, [(q[0] - p.pivote[0]) * k, q[1] - p.pivote[1]]); return [v[0] + W[0], v[1] + W[1]]; } };
    memo[n] = t;
    return t;
  };
  const aLienzo = (q: [number, number]): [number, number] => [Math.round(q[0] - m.centro + l.ox), Math.round(q[1] - m.piso + l.oy)];
  const dib = pose.dibujo ? m.dibujos?.[pose.dibujo] : undefined;
  if (pose.dibujo && !dib) throw new Error(`no hay dibujo ${pose.dibujo}`);
  let puntosDib: Record<string, [number, number]> | null = null;
  if (dib) {
    let img = imagenPieza({ x: 0, y: 0, pivote: [0, 0], padre: null, filas: dib.filas });
    const espejo = (x: number) => (pose.espejo ? img.w - x : x);
    if (pose.espejo) ({ img } = estirar(img, -1, 0));
    const cx = img.w / 2, cy = img.h / 2;
    const ancla: [number, number] = [espejo(dib.ancla[0]), dib.ancla[1]];
    const rs = rotSprite(img, r.giro ?? 0, cx, cy);
    // el centro del dibujo en la hoja: el ancla cae en el pivote del luchador, más el corrimiento de la raíz
    const C: [number, number] = [m.centro + (cx - ancla[0]) + (r.x ?? 0), m.piso + (cy - ancla[1]) + (r.y ?? 0)];
    const x0 = Math.round(C[0] - rs.px - m.centro + l.ox), y0 = Math.round(C[1] - rs.py - m.piso + l.oy);
    // las zonas por filas del dibujo: cabeza, cuerpo y piernas
    const zonaDe = (fy: number) => (fy < dib.zonas[0] ? 'cabeza' : fy < dib.zonas[1] ? 'torso' : 'piernaC');
    const ids = { cabeza: orden.indexOf('cabeza'), torso: orden.indexOf('torso'), piernaC: orden.indexOf('piernaC') };
    const a = ((r.giro ?? 0) * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
    for (let y = 0; y < rs.img.h; y++)
      for (let x = 0; x < rs.img.w; x++) {
        const v = rs.img.idx[y * rs.img.w + x];
        if (v < 0) continue;
        const X = x0 + x, Y = y0 + y;
        if (X < 0 || Y < 0 || X >= l.w || Y >= l.h) continue;
        idx[Y * l.w + X] = v;
        // la fila del dibujo de donde sale este pixel (deshaciendo el giro)
        const dx = x + 0.5 - rs.px, dy = y + 0.5 - rs.py;
        const fy = -dx * sin + dy * cos + cy;
        pieza[Y * l.w + X] = ids[zonaDe(fy)];
      }
    puntosDib = {};
    for (const [n, p] of Object.entries(dib.puntos)) {
      const dx = espejo(p[0]) - cx, dy = p[1] - cy;
      puntosDib[n] = [C[0] + dx * cos - dy * sin, C[1] + dx * sin + dy * cos];
    }
  }
  if (!dib) orden.forEach((n, oi) => {
    if (pose.ocultar?.includes(n)) return;
    const p = pose.cambiar?.[n] ?? m.piezas[n];
    const t = trans(n);
    let img = imagenPieza(p);
    let px = p.pivote[0] - p.x, py = p.pivote[1] - p.y;
    const k = pose.ancho?.[n] ?? 1;
    if (k !== 1) ({ img, px } = estirar(img, k, px));
    const rs = rotSprite(img, t.a, px, py);
    const W = t.f(p.pivote);
    const x0 = Math.round(W[0] - rs.px - m.centro + l.ox), y0 = Math.round(W[1] - rs.py - m.piso + l.oy);
    for (let y = 0; y < rs.img.h; y++)
      for (let x = 0; x < rs.img.w; x++) {
        const v = rs.img.idx[y * rs.img.w + x];
        if (v < 0) continue;
        const X = x0 + x, Y = y0 + y;
        if (X < 0 || Y < 0 || X >= l.w || Y >= l.h) continue;
        idx[Y * l.w + X] = v;
        pieza[Y * l.w + X] = oi;
      }
  });
  let dy = 0;
  if (pose.suelo) {
    let fondo = -1;
    for (let i = idx.length - 1; i >= 0; i--) if (idx[i] >= 0) { fondo = Math.floor(i / l.w); break; }
    const d = l.oy - 1 - fondo - (pose.sobre ?? 0);
    if (fondo >= 0 && d !== 0) {
      const mueve = <T extends Int16Array | Int8Array>(arr: T) => {
        const c = arr.slice() as T;
        arr.fill(-1);
        for (let y = 0; y < l.h; y++) { const yy = y + d; if (yy >= 0 && yy < l.h) arr.set(c.subarray(y * l.w, (y + 1) * l.w), yy * l.w); }
      };
      mueve(idx); mueve(pieza);
      dy = d;
    }
  }
  for (const pa of pose.parches ?? []) {
    const [x0, y0] = aLienzo([pa.x, pa.y + dy]);
    pa.filas.forEach((f, j) => {
      for (let i = 0; i < f.length; i++) {
        const ch = f[i];
        if (ch === ' ') continue;
        const X = x0 + i, Y = y0 + j;
        if (X < 0 || Y < 0 || X >= l.w || Y >= l.h) continue;
        idx[Y * l.w + X] = ch === '.' ? -1 : LETRAS.indexOf(ch);
        if (ch === '.') pieza[Y * l.w + X] = -1;
      }
    });
  }
  const puntos: Record<string, [number, number]> = {};
  if (puntosDib) for (const [n, p] of Object.entries(puntosDib)) { const q = aLienzo(p); puntos[n] = [q[0], q[1] + dy]; }
  else for (const [n, pt] of Object.entries(m.puntos)) {
    const en = pose.cambiar?.[pt.pieza]?.puntos?.[n] ?? pt.en;
    const q = aLienzo(trans(pt.pieza).f(en));
    puntos[n] = [q[0], q[1] + dy];
  }
  return { w: l.w, h: l.h, idx, pieza, orden, puntos };
}

/** Pasa un cuadro a colores. */
export function pintarPixel(m: MunecoPixel, c: CuadroPixel): Raster {
  const pal = m.paleta.map(hexToRgb);
  const r = createRaster(c.w, c.h);
  for (let i = 0; i < c.w * c.h; i++) {
    const v = c.idx[i];
    if (v < 0) continue;
    const [R, G, B] = pal[v];
    r.data[i * 4] = R; r.data[i * 4 + 1] = G; r.data[i * 4 + 2] = B; r.data[i * 4 + 3] = 255;
  }
  return r;
}

export interface CuadroAnimPixel {
  pose: PosePixel;
  ticks: number;
  fase: Fase;
  /** el punto del muñeco que pega en los cuadros activos (puñoC, puñoL, pieC, pieL) */
  pega?: string;
}

export interface AnimPixel {
  nombre: string;
  bucle: boolean;
  cuadros: CuadroAnimPixel[];
  golpe?: { daño: number; parada: number; retroceso: number; aturde: number };
}

function cajaPiezas(c: CuadroPixel, ox: number, oy: number, nombres: string[]): Caja | null {
  const ids = nombres.map((n) => c.orden.indexOf(n)).filter((i) => i >= 0);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < c.pieza.length; i++) {
    if (!ids.includes(c.pieza[i])) continue;
    const x = i % c.w, y = Math.floor(i / c.w);
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return x1 < 0 ? null : [x0 - ox, y0 - oy, x1 - x0 + 1, y1 - y0 + 1];
}

/** Arma y pinta una animación entera con sus datos por cuadro, igual que las del luchador por volúmenes. */
export function pintarAnimPixel(m: MunecoPixel, a: AnimPixel, l: LienzoPixel): AnimRender {
  const cuadros: Raster[] = [], datos: DatosCuadro[] = [];
  const porZona: Partial<Record<Zona, string[]>> = {};
  for (const [n, z] of Object.entries(m.zonas)) (porZona[z] ??= []).push(n);
  let empuje: Caja | null = null;
  for (const q of a.cuadros) {
    const c = componerPixel(m, q.pose, l);
    const recibe: DatosCuadro['recibe'] = [];
    for (const z of ['cabeza', 'cuerpo', 'piernas'] as Zona[]) {
      const b = cajaPiezas(c, l.ox, l.oy, porZona[z] ?? []);
      if (b) recibe.push({ zona: z, caja: b });
    }
    const pega: Caja[] = [];
    const rel = (p: [number, number]): [number, number] => [p[0] - l.ox, p[1] - l.oy];
    if (q.fase === 'activo' && q.pega) {
      const [px, py] = rel(c.puntos[q.pega]);
      pega.push([px - 8, py - 7, 16, 14]);
      const brazo = q.pega === 'puñoC' ? 'antebrazoC' : q.pega === 'puñoL' ? 'antebrazoL' : q.pega === 'pieC' ? 'piernaC' : 'piernaL';
      // el brazo o la pierna que pega también recibe; en un dibujo entero es la zona alrededor del golpe
      const b = q.pose.dibujo ? [px - 10, py - 9, 20, 18] as Caja : cajaPiezas(c, l.ox, l.oy, [brazo]);
      if (b) recibe.push({ zona: 'brazo', caja: b });
    }
    if (!empuje) {
      const t = cajaPiezas(c, l.ox, l.oy, ['torso']);
      empuje = t ? [Math.round(t[0] + t[2] * 0.1), t[1] - 14, Math.round(t[2] * 0.8), -(t[1] - 14)] : [-12, -80, 24, 80];
    }
    cuadros.push(pintarPixel(m, c));
    const pc = c.puntos.puñoC ? rel(c.puntos.puñoC) : [0, 0] as [number, number];
    const pl = c.puntos.puñoL ? rel(c.puntos.puñoL) : [0, 0] as [number, number];
    datos.push({ ticks: q.ticks, fase: q.fase, recibe, pega, empuje, puño: { cerca: pc, lejos: pl } });
  }
  const out: AnimRender = { nombre: a.nombre, bucle: a.bucle, cuadros, datos, golpe: a.golpe, ox: l.ox, oy: l.oy };
  if (a.cuadros.some((q) => q.fase === 'activo')) {
    const suma = (fa: Fase) => a.cuadros.filter((q) => q.fase === fa).reduce((s, q) => s + q.ticks, 0);
    out.tiempos = { inicio: suma('inicio'), activo: suma('activo'), recuperacion: suma('recuperacion') };
  }
  return out;
}
