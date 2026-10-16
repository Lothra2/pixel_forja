import { createRaster, type Raster } from '../core/raster';
import { hexToRgb } from '../color/oklab';
import type { LuchadorFicha } from './ficha';
import type { Grupo } from './volumen';
import { pintarLuchador, type CuadroLuchador, type OpcionesPintar } from './render';
import type { AnimLuchador, Fase } from './golpes';

/**
 * Los datos por cuadro de un juego de pelea, como los usa SF2: las cajas que reciben (por zona), la caja que pega
 * (solo en los cuadros activos), la caja de empuje (la que no deja que dos luchadores se encimen) y cuánto dura cada
 * cuadro. Todo en pixeles desde el pivote (el punto del piso bajo el luchador), con y hacia abajo, mirando a la
 * derecha. Si el luchador mira a la izquierda, el juego invierte x.
 */
export type Caja = [number, number, number, number];
export type Zona = 'cabeza' | 'cuerpo' | 'piernas' | 'brazo';

export interface DatosCuadro {
  ticks: number;
  fase: Fase;
  recibe: { zona: Zona; caja: Caja }[];
  pega: Caja[];
  empuje: Caja;
  /** el centro de cada puño, para los efectos */
  puño: { cerca: [number, number]; lejos: [number, number] };
}

export interface AnimRender {
  nombre: string;
  bucle: boolean;
  cuadros: Raster[];
  datos: DatosCuadro[];
  golpe?: AnimLuchador['golpe'];
  /** inicio, activos y recuperación, en ticks (solo los golpes) */
  tiempos?: { inicio: number; activo: number; recuperacion: number };
  ox: number;
  oy: number;
}

const ZONAS: Record<Zona, Grupo[]> = {
  cabeza: ['cabeza'],
  cuerpo: ['torso', 'brazoC', 'brazoL'],
  piernas: ['musloC', 'musloL', 'piernaC', 'piernaL'],
  brazo: [],
};

/** La caja de los pixeles de unos grupos, desde el pivote. null si no hay ninguno. */
function cajaGrupos(c: CuadroLuchador, w: number, grupos: Grupo[]): Caja | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < c.grupos.length; i++) {
    const g = c.grupos[i];
    if (!g || !grupos.includes(g)) continue;
    const x = i % w, y = Math.floor(i / w);
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return x1 < 0 ? null : [x0 - c.ox, y0 - c.oy, x1 - x0 + 1, y1 - y0 + 1];
}

const pantalla = (p: [number, number, number]): [number, number] => [Math.round(p[0]), -Math.round(p[1])];

/** Pinta una animación entera y saca sus datos por cuadro. */
export function pintarAnim(f: LuchadorFicha, a: AnimLuchador, o: OpcionesPintar): AnimRender {
  const cuadros: Raster[] = [], datos: DatosCuadro[] = [];
  let previo: CuadroLuchador | null = null;
  let empuje: Caja | null = null;
  for (const q of a.cuadros) {
    const c = pintarLuchador(f, q.pose, o);
    const recibe: DatosCuadro['recibe'] = [];
    for (const z of ['cabeza', 'cuerpo', 'piernas'] as Zona[]) {
      const b = cajaGrupos(c, o.w, ZONAS[z]);
      if (b) recibe.push({ zona: z, caja: b });
    }
    // el brazo que pega también recibe mientras está afuera (así se le puede contestar al golpe)
    if (q.fase === 'activo' || (q.fase === 'recuperacion' && a.cuadros.some((x) => x.pega))) {
      const lado = a.cuadros.find((x) => x.pega)?.pega ?? 'cerca';
      const b = cajaGrupos(c, o.w, lado === 'cerca' ? ['antebrazoC'] : ['antebrazoL']);
      if (b) recibe.push({ zona: 'brazo', caja: b });
    }
    const pc = pantalla(c.art.puño.cerca), pl = pantalla(c.art.puño.lejos);
    const pega: Caja[] = [];
    if (q.fase === 'activo' && q.pega) {
      const [px, py] = q.pega === 'cerca' ? pc : pl;
      pega.push([px - 6, py - 7, 16, 14]);
    }
    if (!empuje) {
      const t = cajaGrupos(c, o.w, ['torso']);
      empuje = t ? [Math.round(t[0] + t[2] * 0.05), t[1] - 18, Math.round(t[2] * 0.9), -(t[1] - 18)] : [-12, -80, 24, 80];
    }
    if (q.estela && previo) estela(c.r, c.ox, c.oy, previo, c, q.pega ?? 'cerca', f);
    cuadros.push(c.r);
    datos.push({ ticks: q.ticks, fase: q.fase, recibe, pega, empuje, puño: { cerca: pc, lejos: pl } });
    previo = c;
  }
  const out: AnimRender = { nombre: a.nombre, bucle: a.bucle, cuadros, datos, golpe: a.golpe, ox: o.ox, oy: o.oy };
  if (a.cuadros.some((q) => q.fase === 'activo')) {
    const suma = (fa: Fase) => a.cuadros.filter((q) => q.fase === fa).reduce((s, q) => s + q.ticks, 0);
    out.tiempos = { inicio: suma('inicio'), activo: suma('activo'), recuperacion: suma('recuperacion') };
  }
  return out;
}

/**
 * La estela del golpe: un borrón de velocidad detrás del puño, desde donde estaba en el cuadro anterior. Va solo en los
 * pixeles vacíos (detrás del luchador), claro en el centro y del color de la piel en el borde, y se afina hacia atrás.
 */
function estela(r: Raster, ox: number, oy: number, a: CuadroLuchador, b: CuadroLuchador, lado: 'cerca' | 'lejos', f: LuchadorFicha) {
  const p0 = a.art.puño[lado], p1 = b.art.puño[lado];
  const x0 = ox + p0[0], y0 = oy - p0[1], x1 = ox + p1[0], y1 = oy - p1[1];
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  const borde = hexToRgb(f.colores.piel), centro: [number, number, number] = [255, 248, 228];
  for (let s = 0; s <= n * 0.82; s++) {
    const t = s / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, rad = 0.6 + 3.2 * t;
    for (let dy = -Math.ceil(rad); dy <= Math.ceil(rad); dy++)
      for (let dx = -Math.ceil(rad); dx <= Math.ceil(rad); dx++) {
        const d = Math.hypot(dx, dy);
        if (d > rad) continue;
        const px = Math.round(x + dx), py = Math.round(y + dy);
        if (px < 0 || py < 0 || px >= r.w || py >= r.h) continue;
        const i = (py * r.w + px) * 4;
        if (r.data[i + 3]) continue;
        // a rayas a lo largo, como las líneas de velocidad de Capcom
        if (t < 0.45 && (Math.round(y + dy) + Math.round(x)) % 3 === 0) continue;
        const c = d < rad * 0.5 ? centro : borde;
        r.data[i] = c[0]; r.data[i + 1] = c[1]; r.data[i + 2] = c[2]; r.data[i + 3] = 255;
      }
  }
}

/**
 * La chispa del golpe, en 4 cuadros de 3 ticks: el destello blanco, la estrella grande amarilla y naranja, el anillo
 * roto y las chispitas que se apagan. Mide 48 x 48 y el centro va en el punto del impacto.
 */
export function chispaGolpe(): Raster[] {
  const S = 48, c = S / 2;
  const BL: [number, number, number] = [255, 255, 255], AM: [number, number, number] = [255, 236, 96], NA: [number, number, number] = [255, 148, 40], RO: [number, number, number] = [214, 60, 24];
  const cuadro = (fn: (x: number, y: number, r: number, a: number) => [number, number, number] | null) => {
    const r = createRaster(S, S);
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const dx = x + 0.5 - c, dy = y + 0.5 - c;
        const col = fn(dx, dy, Math.hypot(dx, dy), Math.atan2(dy, dx));
        if (!col) continue;
        const i = (y * S + x) * 4;
        r.data[i] = col[0]; r.data[i + 1] = col[1]; r.data[i + 2] = col[2]; r.data[i + 3] = 255;
      }
    return r;
  };
  // una estrella: el radio cambia con el ángulo (puntas largas y cortas alternadas)
  const estrella = (a: number, puntas: number, largo: number, corto: number, giro = 0) => {
    const u = ((a + giro) / (2 * Math.PI)) * puntas;
    const fr = Math.abs(u - Math.round(u));
    const k = Math.round(u) % 2 === 0 ? largo : largo * 0.62;
    return corto + (k - corto) * Math.max(0, 1 - fr * 2.6);
  };
  return [
    cuadro((_x, _y, r, a) => { const e = estrella(a, 8, 11, 3.5); return r < e * 0.55 ? BL : r < e ? AM : null; }),
    cuadro((_x, _y, r, a) => { const e = estrella(a, 12, 21, 6, 0.26); return r < 4 ? BL : r < e * 0.5 ? AM : r < e * 0.8 ? NA : r < e ? RO : null; }),
    cuadro((_x, _y, r, a) => {
      const e = estrella(a, 12, 23, 9, 0.26);
      const anillo = r > 13 && r < 17 && Math.sin(a * 7) > -0.2;
      return anillo ? (r < 15 ? AM : NA) : r < e && r > e * 0.7 && r > 11 ? RO : r < 3 ? AM : null;
    }),
    cuadro((x, y, r) => {
      const h = (Math.floor(x + 30) * 73856093) ^ (Math.floor(y + 30) * 19349663);
      return r > 14 && r < 22 && (h & 31) === 0 ? ((h >> 5) & 1 ? AM : NA) : null;
    }),
  ];
}

/** Dibuja las cajas encima de un cuadro (para revisar): recibe en azul, pega en rojo, empuje en amarillo. */
export function dibujarCajas(r: Raster, ox: number, oy: number, d: DatosCuadro): Raster {
  const out = createRaster(r.w, r.h);
  out.data.set(r.data);
  const marco = (b: Caja, c: [number, number, number]) => {
    const [x, y, w, h] = b;
    for (let i = 0; i < w; i++) for (const yy of [y, y + h - 1]) put(ox + x + i, oy + yy, c);
    for (let j = 0; j < h; j++) for (const xx of [x, x + w - 1]) put(ox + xx, oy + y + j, c);
  };
  const put = (x: number, y: number, c: [number, number, number]) => {
    if (x < 0 || y < 0 || x >= r.w || y >= r.h) return;
    const i = (y * r.w + x) * 4;
    out.data[i] = c[0]; out.data[i + 1] = c[1]; out.data[i + 2] = c[2]; out.data[i + 3] = 255;
  };
  marco(d.empuje, [255, 214, 0]);
  for (const z of d.recibe) marco(z.caja, [40, 140, 255]);
  for (const b of d.pega) marco(b, [255, 30, 40]);
  return out;
}
