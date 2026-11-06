import {
  ArbolCajas, baseCamara, rayoCamara, proyectar, hueso, bulto, masa, ruido, fbm as fbm3, hash3,
  type Pieza, type V3, type Camara, type BaseCamara, type Comp, type GolpeEscena,
} from './render';
import { MATERIALES, type Material } from './materiales';
import type { Lamina } from './cine';
import { createRaster, type Raster } from '../core/raster';

/**
 * Escenas de cine en 3D: el mismo motor de piezas del taller (la catedral, las casas, los árboles y los personajes del
 * catálogo) puesto entero en un mundo con terreno, mirado con la cámara libre de render.ts y pintado con UNA luz y UNA
 * atmósfera para todo. Nada de recortes pegados: lo que está lejos se aclara y se funde en el aire del color del cielo,
 * lo que está a contraluz se recorta con su filo de luz, las ventanas iluminan la nieve de alrededor, la catedral echa
 * su sombra sobre la colina.
 *
 * El trabajo va en dos tiempos (es offline):
 * 1. `renderFilas` traza la escena quieta (con supermuestreo) y guarda capas en flotantes: la luz de la escena, la luz
 *    de los fuegos aparte (para hacerla latir por cuadro), el aire, la distancia, el cielo y máscaras de materiales.
 *    Con `pase` se traza solo el fondo o solo el primer plano (con alfa), para darles paralaje distinto.
 * 2. `luzCuadro` + `revelar` arman cada cuadro encima: el fuego que late, las llamas de Doom como carteles en el mundo,
 *    el humo como volumen, las partículas con profundidad, estela y desenfoque, los rayos de luz del cielo, el derrame
 *    de luz en los bordes, el resplandor y la curva de película.
 *
 * Unidades: las del taller (una persona mide 61; una unidad ~3 cm). z hacia arriba.
 */

export type C3 = [number, number, number];
const TAU = Math.PI * 2;
const sat = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const suave = (a: number, b: number, v: number) => { const t = sat((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const lin = (c: number) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
/** Color hex (sRGB) a lineal. */
export const hexLin = (h: string): C3 => [lin(parseInt(h.slice(1, 3), 16)), lin(parseInt(h.slice(3, 5), 16)), lin(parseInt(h.slice(5, 7), 16))];
export const mezclar = (a: C3, b: C3, t: number): C3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const escalar = (a: C3, k: number): C3 => [a[0] * k, a[1] * k, a[2] * k];
const h01 = (a: number, b: number, c: number) => hash3(a, b, c);

// ================================================================== colocar assets
/**
 * Piezas movidas con una rotación cualquiera alrededor de un pivote (filas de la matriz R) y corridas `t`: la campana
 * que se mece en su eje, el muerto que se tuerce al salir de la tierra, el monje que se echa atrás al tirar.
 */
export function moverPiezas(ps: Pieza[], R: [V3, V3, V3], piv: V3 = [0, 0, 0], t: V3 = [0, 0, 0]): Pieza[] {
  const Rv = (v: V3): V3 => [dot(R[0], v), dot(R[1], v), dot(R[2], v)];
  const P = (v: V3): V3 => { const r = Rv([v[0] - piv[0], v[1] - piv[1], v[2] - piv[2]]); return [r[0] + piv[0] + t[0], r[1] + piv[1] + t[1], r[2] + piv[2] + t[2]]; };
  const T0 = P([0, 0, 0]);
  return ps.map((p): Pieza => {
    if (p.k === 'conv') return { ...p, planos: p.planos.map(([n, d]) => { const m = Rv(n); return [m, d + dot(m, T0)] as [V3, number]; }), pts: p.pts.map(P) };
    if (p.k === 'cono') return { ...p, o: P(p.o), ex: Rv(p.ex), ey: Rv(p.ey), ez: Rv(p.ez) };
    if (p.k === 'elip') return { ...p, c: P(p.c), ex: Rv(p.ex), ey: Rv(p.ey), ez: Rv(p.ez) };
    const comps = p.comps.map((q): Comp => (q.f === 'hueso'
      ? hueso(P(q.a), P(q.b), q.r0, q.r1, { mat: q.mat, tono: q.tono, k: q.k })
      : bulto(P(q.c), q.r, { ejes: [Rv(q.ex), Rv(q.ey), Rv(q.ez)], mat: q.mat, tono: q.tono, k: q.k })));
    return masa(comps, { mat: p.mat, tono: p.tono, suave: p.suave });
  });
}
/** Matriz de giro de `ang` radianes alrededor del eje `e` (Rodrigues), en filas. */
export function giroEje(e: V3, ang: number): [V3, V3, V3] {
  const [x, y, z] = norm(e), c = Math.cos(ang), s = Math.sin(ang), k = 1 - c;
  return [[c + x * x * k, x * y * k - z * s, x * z * k + y * s], [y * x * k + z * s, c + y * y * k, y * z * k - x * s], [z * x * k - y * s, z * y * k + x * s, c + z * z * k]];
}

/** Dónde va un asset: su origen (el centro de la huella en el piso) en el mundo, el giro en grados y la escala. */
export interface Colocar { x: number; y: number; z: number; giro?: number; k?: number }
/** Las piezas de un asset movidas, giradas alrededor del eje vertical y escaladas. */
export function colocarPiezas(ps: Pieza[], c: Colocar): Pieza[] {
  const k = c.k ?? 1, a = ((c.giro ?? 0) * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a);
  const R = (v: V3): V3 => [v[0] * co - v[1] * si, v[0] * si + v[1] * co, v[2]];
  const P = (v: V3): V3 => { const r = R(v); return [r[0] * k + c.x, r[1] * k + c.y, r[2] * k + c.z]; };
  const t: V3 = [c.x, c.y, c.z];
  return ps.map((p): Pieza => {
    if (p.k === 'conv') return { ...p, planos: p.planos.map(([n, d]) => { const m = R(n); return [m, d * k + dot(m, t)] as [V3, number]; }), pts: p.pts.map(P) };
    if (p.k === 'cono') return { ...p, o: P(p.o), ex: R(p.ex), ey: R(p.ey), ez: R(p.ez), h: p.h * k, r0: p.r0 * k, r1: p.r1 * k };
    if (p.k === 'elip') return { ...p, c: P(p.c), ex: R(p.ex), ey: R(p.ey), ez: R(p.ez), r: [p.r[0] * k, p.r[1] * k, p.r[2] * k] };
    const comps = p.comps.map((q): Comp => (q.f === 'hueso'
      ? hueso(P(q.a), P(q.b), q.r0 * k, q.r1 * k, { mat: q.mat, tono: q.tono, k: q.k !== undefined ? q.k * k : undefined })
      : bulto(P(q.c), [q.r[0] * k, q.r[1] * k, q.r[2] * k], { ejes: [R(q.ex), R(q.ey), R(q.ez)], mat: q.mat, tono: q.tono, k: q.k !== undefined ? q.k * k : undefined })));
    return masa(comps, { mat: p.mat, tono: p.tono, suave: p.suave * k });
  });
}

/** Un asset puesto en la escena: su transformación (para mirar la textura en sus coordenadas) y cuánta nieve junta. */
export interface Grupo { t: V3; co: number; si: number; k: number; nieve: number }
/** Luz puntual con caída. `canal` 1 = luz de fuego (late por cuadro); `envuelve` deja pasar un poco el terminador. */
export interface LuzPuntual { p: V3; c: C3; k: number; r: number; sombra?: boolean; canal?: 0 | 1; envuelve?: number; halo?: number }
/** Cómo brilla un material que emite: intensidad, canal y, si hace falta, otro color (lineal) que reemplaza su rampa. */
export interface Emision { k: number; canal?: 0 | 1; color?: C3 }

// ================================================================== terreno
/** Lo que el terreno le dice al sombreado en un punto: color (lineal) y brillo especular. */
export interface Superficie { albedo: C3; brillo?: number }
export interface DefTerreno {
  /** alto del terreno (con todo el detalle: el sombreado saca de acá la normal) */
  alto: (x: number, y: number) => number;
  /** color del suelo en el punto (p) con su normal (n) */
  superficie: (p: V3, n: V3, t: number) => Superficie;
  /** grillas que se precalculan para trazar: [x0, y0, x1, y1, paso]; la primera que contiene el punto manda */
  grillas: [number, number, number, number, number][];
  /** el alto más alto del terreno (para dejar de buscar) */
  techo: number;
}
interface Grilla { x0: number; y0: number; x1: number; y1: number; paso: number; nx: number; ny: number; h: Float32Array }

/** Terreno de alturas: se traza por pasos sobre grillas precalculadas y se sombrea con la función de alto exacta. */
export class Terreno {
  readonly def: DefTerreno; private gs: Grilla[];
  constructor(def: DefTerreno) {
    this.def = def;
    this.gs = def.grillas.map(([x0, y0, x1, y1, paso]) => {
      const nx = Math.ceil((x1 - x0) / paso) + 1, ny = Math.ceil((y1 - y0) / paso) + 1, h = new Float32Array(nx * ny);
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) h[j * nx + i] = def.alto(x0 + i * paso, y0 + j * paso);
      return { x0, y0, x1: x0 + (nx - 1) * paso, y1: y0 + (ny - 1) * paso, paso, nx, ny, h };
    });
  }
  /** Alto del terreno trazable (bilineal sobre la grilla que toca). */
  h(x: number, y: number): number {
    for (const g of this.gs) {
      if (x < g.x0 || y < g.y0 || x >= g.x1 || y >= g.y1) continue;
      const u = (x - g.x0) / g.paso, v = (y - g.y0) / g.paso, i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, k = j * g.nx + i;
      const a = g.h[k], b = g.h[k + 1], c = g.h[k + g.nx], d = g.h[k + g.nx + 1];
      return a + (b - a) * fu + (c - a) * fv + (a - b - c + d) * fu * fv;
    }
    return this.def.alto(x, y);
  }
  /** Normal con el detalle fino (eps crece con la distancia para no hacer ruido de lejos). */
  normal(x: number, y: number, t: number): V3 {
    const e = Math.max(0.6, t * 0.0007), A = this.def.alto;
    return norm([(A(x - e, y) - A(x + e, y)) / (2 * e), (A(x, y - e) - A(x, y + e)) / (2 * e), 1]);
  }
  /** Distancia al terreno por el rayo, o -1. */
  trazar(o: V3, d: V3, tmin: number, tmax: number, grueso = 1): number {
    const techo = this.def.techo;
    let t = tmin, tp = tmin, n = 0;
    while (t < tmax && n++ < 1400) {
      const x = o[0] + d[0] * t, y = o[1] + d[1] * t, z = o[2] + d[2] * t;
      if (z > techo && d[2] >= 0) return -1;
      const dh = z - this.h(x, y);
      if (dh < 0) {
        if (t === tmin) return tmin;
        let a = tp, b = t;
        for (let k = 0; k < 8; k++) { const m = (a + b) / 2; if (o[2] + d[2] * m - this.h(o[0] + d[0] * m, o[1] + d[1] * m) < 0) b = m; else a = m; }
        return (a + b) / 2;
      }
      tp = t;
      t += Math.max(dh * 0.42, (0.35 + t * 0.0016) * grueso);
    }
    return -1;
  }
}

// ================================================================== atmósfera
export interface Atmosfera {
  /** luz principal (direccional): hacia dónde está, color lineal, intensidad y radio angular (sombra blanda) */
  sol: { dir: V3; c: C3; k: number; ancho?: number };
  /** el cielo de fondo (infinito) y el color del aire en cada dirección: en el horizonte tienen que dar lo mismo */
  cielo: (d: V3) => C3;
  aire: (d: V3) => C3;
  /** luz del cielo (hemisferio de arriba) y lo que rebota del suelo */
  ambCielo: C3; ambSuelo: C3;
  /** niebla: densidad pareja (por unidad) y bruma baja por altura (densidad en z0, cae con escala H) */
  niebla: { densidad: number; baja: number; z0: number; H: number; ruido?: number; escalaRuido?: number };
  /** filo de luz en las siluetas a contraluz: color e intensidad */
  borde: { c: C3; k: number };
  /** nieve que se junta en lo que mira al cielo (en los assets): color y desde qué normal z */
  nieve?: { albedo: C3; desde: number };
  /** cuánto se oscurece lo que tapa el cielo (oclusión), 0..1 */
  oclusion?: number;
  /** largo de los rayos de oclusión (34 al aire libre; adentro, lo que mide el cuarto: el cielo entra solo por los vanos) */
  oclusionLargo?: number;
}

/** Cuánto deja pasar el aire entre el ojo `o` y la distancia t por el rayo d (niebla pareja más bruma baja). */
export function transmision(atm: Atmosfera, o: V3, d: V3, t: number): number {
  const n = atm.niebla;
  let I = n.densidad * t;
  if (n.baja > 0) {
    const e0 = Math.exp(-(o[2] - n.z0) / n.H), dz = d[2];
    let kr = 1;
    // la bruma baja tiene su ruido: más espesa en unos lados que en otros (se mira donde el rayo la cruza)
    if (n.ruido) { const tm = Math.min(t, 3000) * 0.6, s = n.escalaRuido ?? 0.0012; kr = 1 - n.ruido + n.ruido * 2 * ruido((o[0] + d[0] * tm) * s, (o[1] + d[1] * tm) * s, 3.7); }
    if (Math.abs(dz) < 1e-5) I += n.baja * kr * e0 * t;
    else { const x = (-dz * t) / n.H, tb = x > 60 ? 1e9 : (n.H * e0 * (Math.exp(x) - 1)) / -dz; I += n.baja * kr * Math.min(tb, 1e9); }
  }
  return Math.exp(-I);
}

// ================================================================== la escena
export class EscenaCine {
  piezas: Pieza[] = [];
  grupoDe: number[] = [];
  grupos: Grupo[] = [];
  luces: LuzPuntual[] = [];
  terreno?: Terreno;
  emision: Record<string, Emision> = {};
  /** máscaras: nombre -> materiales (se guarda por pixel cuánto de él se ve) */
  marcas: Record<string, string[]> = {};
  /** grupos del primer plano: van en su propia capa (con alfa) para que el reproductor les dé paralaje */
  frente = new Set<number>();
  /**
   * grupos que se mueven (la campana, su soga, el monje que tira): no van ni en el fondo ni en el frente; se trazan
   * solos (pase 'movil', con alfa) cuadro por cuadro en su recorte, y el fondo tampoco recibe su sombra quieta
   */
  moviles = new Set<number>();
  private arbol?: ArbolCajas;
  private arboles = new Map<string, ArbolCajas>();
  /** Pone un asset (sus piezas en coordenadas propias) en el mundo. Devuelve el número de grupo. */
  poner(ps: Pieza[], c: Colocar, o: { nieve?: number } = {}): number {
    const g = this.grupos.length, a = ((c.giro ?? 0) * Math.PI) / 180;
    this.grupos.push({ t: [c.x, c.y, c.z], co: Math.cos(a), si: Math.sin(a), k: c.k ?? 1, nieve: o.nieve ?? 1 });
    for (const p of colocarPiezas(ps, c)) { this.piezas.push(p); this.grupoDe.push(g); }
    this.arbol = undefined; this.arboles.clear();
    return g;
  }
  /** Piezas ya en coordenadas del mundo (geometría propia de la escena). */
  ponerMundo(ps: Pieza[], o: { nieve?: number } = {}): number {
    const g = this.grupos.length;
    this.grupos.push({ t: [0, 0, 0], co: 1, si: 0, k: 1, nieve: o.nieve ?? 1 });
    for (const p of ps) { this.piezas.push(p); this.grupoDe.push(g); }
    this.arbol = undefined; this.arboles.clear();
    return g;
  }
  get bvh(): ArbolCajas { return (this.arbol ??= new ArbolCajas(this.piezas, this.grupoDe)); }
  /** Árbol solo con lo que se ve en un pase: el fondo (todo menos el primer plano) o el primer plano. */
  bvhPase(pase: 'fondo' | 'frente' | 'movil' | 'quietas'): ArbolCajas {
    let a = this.arboles.get(pase);
    if (!a) {
      const g = (i: number) => this.grupoDe[i], mv = (i: number) => this.moviles.has(g(i));
      const idx = this.piezas.map((_, i) => i).filter((i) => (pase === 'movil' ? mv(i) : pase === 'quietas' ? !mv(i) : !mv(i) && this.frente.has(g(i)) === (pase === 'frente')));
      const ps = idx.map((i) => this.piezas[i]), arbol = new ArbolCajas(ps, idx.map((i) => this.grupoDe[i])), golpe = arbol.golpe.bind(arbol);
      // el índice que devuelve tiene que ser el de la escena (para su grupo y su orden)
      arbol.golpe = (o, d, tmin, tmax) => { const g = golpe(o, d, tmin, tmax); if (g) g.i = idx[g.i]; return g; };
      this.arboles.set(pase, (a = arbol));
    }
    return a;
  }
}

// ------------------------------------------------------------------ materiales en lineal
const rampasLin = new Map<string, C3[]>();
function rampaLin(m: Material, id: string): C3[] { let r = rampasLin.get(id); if (!r) { r = m.rampa.map(hexLin); rampasLin.set(id, r); } return r; }
function enRampa(R: C3[], s: number): C3 {
  const pos = sat(s) * (R.length - 1), k = Math.min(R.length - 2, Math.floor(pos)), f = pos - k, a = R[k], b = R[k + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

// ================================================================== trazado
/** Capas de la escena quieta, en flotantes (lineal). La luz y el aire ya vienen multiplicados por la transmisión. */
export interface Capas {
  w: number; h: number;
  base: Float32Array;
  /** luz de los fuegos (canal 1), aparte para hacerla latir */
  fuego: Float32Array;
  /** cuánto deja pasar el aire (0..1) y el color del aire que se suma */
  trans: Float32Array; aire: Float32Array;
  /** resplandor del aire alrededor de las luces de fuego (canal 1) */
  aireFuego: Float32Array;
  /** distancia al ojo (la más cercana de las muestras; Infinity = cielo) y cuánto del pixel es cielo (o vacío) */
  dist: Float32Array; cielo: Float32Array;
  /** cobertura de cada máscara */
  marcas: Record<string, Float32Array>;
}
export function capasVacias(w: number, h: number, marcas: string[]): Capas {
  const n = w * h;
  return {
    w, h, base: new Float32Array(n * 3), fuego: new Float32Array(n * 3), trans: new Float32Array(n), aire: new Float32Array(n * 3), aireFuego: new Float32Array(n * 3),
    dist: new Float32Array(n).fill(Infinity), cielo: new Float32Array(n), marcas: Object.fromEntries(marcas.map((m) => [m, new Float32Array(n)])),
  };
}

/** Dirección de oclusión (coseno) alrededor de n. */
function hemisferio(n: V3, u1: number, u2: number): V3 {
  const r = Math.sqrt(u1), a = TAU * u2, x = r * Math.cos(a), y = r * Math.sin(a), z = Math.sqrt(Math.max(0, 1 - u1));
  const t: V3 = Math.abs(n[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const b1 = norm([t[1] * n[2] - t[2] * n[1], t[2] * n[0] - t[0] * n[2], t[0] * n[1] - t[1] * n[0]]);
  const b2: V3 = [n[1] * b1[2] - n[2] * b1[1], n[2] * b1[0] - n[0] * b1[2], n[0] * b1[1] - n[1] * b1[0]];
  return [b1[0] * x + b2[0] * y + n[0] * z, b1[1] * x + b2[1] * y + n[1] * z, b1[2] * x + b2[2] * y + n[2] * z];
}
/**
 * Resplandor del aire alrededor de una luz: integral a lo largo del rayo de una caída 1 / (1 + d²/r²)² (forma
 * cerrada). Cae rápido con la distancia del rayo a la luz (como 1/h³): un halo, no un velo sobre todo el cuadro.
 */
function haloLuz(L: LuzPuntual, o: V3, d: V3, t: number): number {
  const w: V3 = [L.p[0] - o[0], L.p[1] - o[1], L.p[2] - o[2]], tc = dot(w, d), h2 = Math.max(0, dot(w, w) - tc * tc), r2 = L.r * L.r, q2 = r2 + h2, q = Math.sqrt(q2);
  const F = (s: number) => s / (2 * q2 * (q2 + s * s)) + Math.atan(s / q) / (2 * q2 * q);
  return r2 * r2 * (F(Math.min(t, 1e6) - tc) - F(-tc));
}

/** `pase`: 'todo' (por omisión), 'fondo' (sin el primer plano) o 'frente' (solo el primer plano: lo que no toca queda
 * transparente y `cielo` guarda cuánto del pixel quedó vacío). */
export interface OpcRender { ss?: number; ao?: number; semilla?: number; pase?: 'todo' | 'fondo' | 'frente' | 'movil'; /** solo las columnas x0..x1 (el recorte de lo que se mueve) */ x0?: number; x1?: number }

/**
 * Traza las filas y0..y1 (en las capas `c`, del tamaño de la cámara). Cada pixel tira ss x ss rayos con desplazamiento
 * al azar estable; cada muestra se sombrea con la luz principal (sombra de piezas y terreno, con radio angular), el
 * cielo (con oclusión), las luces puntuales, el filo de contraluz y el brillo húmedo, y se mete en el aire.
 */
export function renderFilas(esc: EscenaCine, atm: Atmosfera, cam: Camara, c: Capas, y0: number, y1: number, o: OpcRender = {}) {
  const b = baseCamara(cam), ter = esc.terreno, ss = Math.max(1, o.ss ?? 2), nao = o.ao ?? 2, sem = o.semilla ?? 1, pase0 = o.pase ?? 'todo';
  // lo que se mueve no tapa el sol del fondo ni del frente (su sombra quieta mentiría); en su propio pase, todo cuenta
  const bvh = esc.moviles.size && (pase0 === 'fondo' || pase0 === 'frente') ? esc.bvhPase('quietas') : esc.bvh;
  const prim = pase0 === 'todo' ? esc.bvh : esc.bvhPase(pase0), pase = pase0 === 'movil' ? 'frente' : pase0;
  const cx0 = Math.max(0, o.x0 ?? 0), cx1 = Math.min(cam.w, o.x1 ?? cam.w);
  const L = norm(atm.sol.dir), ancho = atm.sol.ancho ?? 0.01, marcas = Object.entries(esc.marcas), ocl = atm.oclusion ?? 0.85, aoL = atm.oclusionLargo ?? 34;
  const lucesHalo = esc.luces.filter((l) => l.halo);
  for (let py = y0; py < y1; py++) for (let px = cx0; px < cx1; px++) {
    const I = py * cam.w + px;
    let bR = 0, bG = 0, bB = 0, fR = 0, fG = 0, fB = 0, T = 0, aR = 0, aG = 0, aB = 0, hR = 0, hG = 0, hB = 0, cie = 0, dmin = Infinity;
    const mk = marcas.map(() => 0);
    for (let s = 0; s < ss * ss; s++) {
      const jx = h01(px * 3 + 1, py * 7 + 3, s * 13 + sem), jy = h01(px * 5 + 7, py * 11 + 5, s * 17 + sem);
      const d = rayoCamara(b, px + ((s % ss) + jx) / ss, py + (Math.floor(s / ss) + jy) / ss), oo = cam.pos;
      const g = prim.golpe(oo, d, 0.5, 1e6);
      const tt = ter && pase !== 'frente' ? ter.trazar(oo, d, 0.5, g ? g.t : 9e4) : -1;
      let t = Infinity, golpe: GolpeEscena | null = null;
      if (g) { t = g.t; golpe = g; }
      if (tt >= 0 && tt < t) { t = tt; golpe = null; }
      if (pase0 === 'movil') {
        // lo que se mueve, tapado por algo quieto que está delante: ese pixel queda vacío (se ve el fondo, que ya lo
        // tiene); y lo quieto que recibe la sombra de lo que se mueve va en la tira con esa sombra (la del sol)
        const q = esc.bvhPase('quietas').golpe(oo, d, 0.5, g ? g.t - 0.5 : 1e6), tq = ter ? ter.trazar(oo, d, 0.5, q ? q.t : g ? g.t - 0.5 : 9e4) : -1;
        const ts = tq >= 0 && (!q || tq < q.t) ? tq : q ? q.t : Infinity;
        if (isFinite(ts)) {
          const ps: V3 = [oo[0] + d[0] * ts, oo[1] + d[1] * ts, oo[2] + d[2] * ts], nq = q && ts === q.t ? q.n : ter!.normal(ps[0], ps[1], ts), sg = dot(nq, d) > 0 ? -1 : 1;
          const pe: V3 = [ps[0] + nq[0] * sg * 0.6, ps[1] + nq[1] * sg * 0.6, ps[2] + nq[2] * sg * 0.6];
          if (!prim.golpe(pe, L, 0.05, 6000)) { cie++; continue; }
          t = ts; golpe = q && ts === q.t ? q : null;
        } else if (!g) { cie++; continue; }
      }
      if (pase !== 'frente') for (const l of lucesHalo) { const k = haloLuz(l, oo, d, t) * l.halo! * l.k; hR += l.c[0] * k; hG += l.c[1] * k; hB += l.c[2] * k; }
      if (!isFinite(t)) {
        if (pase !== 'frente') { const col = atm.cielo(d); aR += col[0]; aG += col[1]; aB += col[2]; }
        cie++; continue;
      }
      dmin = Math.min(dmin, t);
      const p: V3 = [oo[0] + d[0] * t, oo[1] + d[1] * t, oo[2] + d[2] * t];
      let n: V3, albedo: C3, brillo = 0, emi: C3 | null = null, canalEmi = 0;
      if (golpe) {
        n = golpe.n; if (dot(n, d) > 0) n = [-n[0], -n[1], -n[2]];
        const gr = esc.grupos[esc.grupoDe[golpe.i]];
        // la textura en las coordenadas propias del asset (sus juntas y su humedad, como en el juego)
        const q: V3 = [(p[0] - gr.t[0]) / gr.k, (p[1] - gr.t[1]) / gr.k, (p[2] - gr.t[2]) / gr.k];
        const pl: V3 = [q[0] * gr.co + q[1] * gr.si, -q[0] * gr.si + q[1] * gr.co, q[2]], nl: V3 = [n[0] * gr.co + n[1] * gr.si, -n[0] * gr.si + n[1] * gr.co, n[2]];
        const m = MATERIALES[golpe.mat] ?? MATERIALES.piedra, R = rampaLin(m, golpe.mat);
        const tex = (fbm3(pl[0] * m.escala, pl[1] * m.escala, pl[2] * m.escala) - 0.5) * m.ruido;
        marcas.forEach(([, mats], k) => { if (mats.includes(golpe!.mat)) mk[k]++; });
        if (m.emite) {
          const e = esc.emision[golpe.mat] ?? { k: 2 }, base = enRampa(R, 0.62 + tex + golpe.tono);
          emi = e.color ? escalar(e.color, e.k * (0.3 + base[0] + base[1] + base[2])) : escalar(base, e.k);
          canalEmi = e.canal ?? 0; albedo = [0, 0, 0];
        } else {
          albedo = enRampa(R, 0.64 + 0.85 * (tex + (m.patron ? m.patron(pl, nl) : 0) + golpe.tono));
          brillo = m.brillo ?? 0;
          if (atm.nieve && gr.nieve > 0) {
            const cub = suave(atm.nieve.desde, atm.nieve.desde + 0.22, n[2] + (ruido(p[0] * 0.21, p[1] * 0.21, p[2] * 0.21) - 0.5) * 0.45) * gr.nieve;
            if (cub > 0) { albedo = mezclar(albedo, atm.nieve.albedo, cub); brillo *= 1 - cub; }
          }
        }
      } else {
        n = ter!.normal(p[0], p[1], t);
        const sf = ter!.def.superficie(p, n, t);
        albedo = sf.albedo; brillo = sf.brillo ?? 0;
      }
      let sR = 0, sG = 0, sB = 0, qR = 0, qG = 0, qB = 0;
      if (emi) { if (canalEmi) { qR = emi[0]; qG = emi[1]; qB = emi[2]; } else { sR = emi[0]; sG = emi[1]; sB = emi[2]; } }
      else {
        // luz principal con su sombra (piezas y terreno), con el disco del sol corrido por muestra
        const ndl = dot(n, L), pe: V3 = [p[0] + n[0] * 0.6, p[1] + n[1] * 0.6, p[2] + n[2] * 0.6];
        let sombra = 0;
        if (ndl > -0.3) {
          const Lj = norm([L[0] + (jx - 0.5) * ancho * 2, L[1] + (jy - 0.5) * ancho * 2, L[2] + (h01(px, py, s + 99) - 0.5) * ancho * 2]);
          sombra = bvh.golpe(pe, Lj, 0.05, 6000) || (ter && ter.trazar(pe, Lj, 0.5, 30000, 1.6) >= 0) ? 0 : 1;
        }
        const sol = Math.max(0, ndl) * sombra * atm.sol.k;
        // cielo con oclusión: rayos cortos contra piezas y terreno, y el horizonte del terreno alrededor
        let vis = 1;
        if (nao > 0) {
          let tapados = 0;
          for (let k = 0; k < nao; k++) { const r = hemisferio(n, h01(px * 13 + k, py * 17, s * 3 + sem + 7), h01(px * 19, py * 23 + k, s * 5 + sem + 11)); if (bvh.golpe(pe, r, 0.05, aoL) || (ter && ter.trazar(pe, r, 0.5, aoL) >= 0)) tapados++; }
          vis = 1 - (tapados / nao) * ocl;
        }
        if (ter) {
          let hz = 0;
          for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU, ca = Math.cos(a), sa = Math.sin(a); for (const rr of [40, 140, 400]) { const dz = ter.h(p[0] + ca * rr, p[1] + sa * rr) - p[2]; if (dz > 0) hz += (Math.min(1, dz / rr) * 0.5) / 3; } }
          vis *= 1 - Math.min(0.7, hz / 6);
        }
        const up = 0.5 + 0.5 * n[2], A = atm.ambSuelo, C = atm.ambCielo;
        const amb: C3 = [(A[0] + (C[0] - A[0]) * up) * vis, (A[1] + (C[1] - A[1]) * up) * vis, (A[2] + (C[2] - A[2]) * up) * vis];
        // filo de contraluz: lo que roza la vista y da al sol, más fuerte cuanto más de frente está el sol
        const fres = Math.pow(1 - Math.max(0, -dot(n, d)), 3), hacia = suave(-0.2, 0.9, dot(d, L)), filo = ((fres * hacia * Math.max(0, ndl + 0.3)) / 1.3) * sombra * atm.borde.k;
        const esp = brillo > 0 ? brillo * Math.pow(Math.max(0, dot(n, norm([L[0] - d[0], L[1] - d[1], L[2] - d[2]]))), 30) * sombra * atm.sol.k * 0.6 : 0;
        let pR = 0, pG = 0, pB = 0;
        for (const l of esc.luces) {
          const lx = l.p[0] - p[0], ly = l.p[1] - p[1], lz = l.p[2] - p[2], dd = Math.hypot(lx, ly, lz), lim = l.r * 6;
          if (dd > lim) continue;
          const w = l.envuelve ?? 0.15, nl = ((n[0] * lx + n[1] * ly + n[2] * lz) / dd + w) / (1 + w);
          if (nl <= 0) continue;
          let k = (l.k / (1 + (dd / l.r) ** 2)) * (1 - (dd / lim) ** 2) ** 2 * nl;
          if (l.sombra && k > 0.002) { const dl: V3 = [lx / dd, ly / dd, lz / dd]; if (bvh.golpe(pe, dl, 0.05, dd - 3) || (ter && ter.trazar(pe, dl, 0.5, dd - 3) >= 0)) k *= 0.08; }
          const e = brillo > 0 ? brillo * Math.pow(Math.max(0, dot(n, norm([lx / dd - d[0], ly / dd - d[1], lz / dd - d[2]]))), 24) * k * 0.5 : 0;
          if (l.canal) { qR += (albedo[0] * k + e) * l.c[0]; qG += (albedo[1] * k + e) * l.c[1]; qB += (albedo[2] * k + e) * l.c[2]; }
          else { pR += (albedo[0] * k + e) * l.c[0]; pG += (albedo[1] * k + e) * l.c[1]; pB += (albedo[2] * k + e) * l.c[2]; }
        }
        const sc = atm.sol.c, bc = atm.borde.c;
        sR = albedo[0] * (sc[0] * sol + amb[0]) + bc[0] * filo * (0.25 + albedo[0]) + sc[0] * esp + pR;
        sG = albedo[1] * (sc[1] * sol + amb[1]) + bc[1] * filo * (0.25 + albedo[1]) + sc[1] * esp + pG;
        sB = albedo[2] * (sc[2] * sol + amb[2]) + bc[2] * filo * (0.25 + albedo[2]) + sc[2] * esp + pB;
      }
      const tr = transmision(atm, oo, d, t), ai = atm.aire(d);
      bR += sR * tr; bG += sG * tr; bB += sB * tr; fR += qR * tr; fG += qG * tr; fB += qB * tr; T += tr;
      aR += ai[0] * (1 - tr); aG += ai[1] * (1 - tr); aB += ai[2] * (1 - tr);
    }
    const N = ss * ss, k3 = I * 3;
    c.base[k3] = bR / N; c.base[k3 + 1] = bG / N; c.base[k3 + 2] = bB / N;
    c.fuego[k3] = fR / N; c.fuego[k3 + 1] = fG / N; c.fuego[k3 + 2] = fB / N;
    c.trans[I] = T / N; c.aire[k3] = aR / N; c.aire[k3 + 1] = aG / N; c.aire[k3 + 2] = aB / N;
    c.aireFuego[k3] = hR / N; c.aireFuego[k3 + 1] = hG / N; c.aireFuego[k3 + 2] = hB / N;
    c.dist[I] = dmin; c.cielo[I] = cie / N;
    marcas.forEach(([nom], k) => { c.marcas[nom][I] = mk[k] / N; });
  }
}

// ================================================================== cada cuadro
/** Llama de Doom (u otra lámina que SUMA, premultiplicada) parada en el mundo: pie en `p`, ancho y alto en unidades. */
export interface Cartel { p: V3; ancho: number; alto: number; lam: Lamina; k?: number; fondo?: number }
/** Columna de humo (volumen): nace en `base`, sube `alto`, se abre de r0 a r1 y se tuerce con el viento. */
export interface Pluma { base: V3; alto: number; r0: number; r1: number; viento: V3; dens: number; humo: C3; abajo?: C3; kAbajo?: number; semilla: number; sube: number; escala?: number; /** cuánto le da la luz principal */ sol?: number }
/** Partícula (copo, ceniza, chispa): posición, radio en unidades, color lineal, opacidad; `suma` para las que brillan. */
export interface Particula { p: V3; r: number; c: C3; a: number; suma?: boolean; /** velocidad (unidades/s) para la estela */ v?: V3 }
export interface OpcCuadro {
  t: number;
  /** multiplica la luz de los fuegos (canal 1) en este cuadro */
  flick?: number;
  carteles?: Cartel[];
  /** láminas que suman en pantalla (el fuego detrás de los vitrales), con su esquina; se apagan con el aire del pixel */
  pantalla?: { lam: Lamina; x: number; y: number; k?: number }[];
  plumas?: Pluma[];
  particulas?: Particula[];
  /** distancia en foco, apertura (pixeles de desenfoque) y su tope */
  foco?: number; apertura?: number; cocMax?: number;
  /** tiempo de obturador en segundos (estela de las partículas que se mueven); 1/48 por omisión */
  obturador?: number;
  /** luz del fondo que se derrama sobre los bordes de las siluetas (light wrap): cuánto y en qué radio */
  derrame?: { k: number; r: number };
  /** rayos de luz que salen del cielo brillante hacia el sol (o desde otro punto del mundo) */
  rayos?: { k: number; c: C3; desde?: V3; umbral?: number; decae?: number };
  exposicion?: number;
  bloom?: { k: number; umbral?: number };
  /** ajuste de color sobre lo ya revelado (lineal 0..1) */
  grado?: (c: C3, x: number, y: number) => C3;
  vineta?: number; grano?: number; semilla?: number;
}

function muestrear(L: Lamina, u: number, v: number): C3 {
  const x = u - 0.5, y = v - 0.5, i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, out: C3 = [0, 0, 0];
  for (const [a, b, w] of [[i, j, (1 - fx) * (1 - fy)], [i + 1, j, fx * (1 - fy)], [i, j + 1, (1 - fx) * fy], [i + 1, j + 1, fx * fy]] as [number, number, number][]) {
    if (a < 0 || b < 0 || a >= L.w || b >= L.h || w <= 0) continue;
    const k = (b * L.w + a) * 4; out[0] += L.d[k] * w; out[1] += L.d[k + 1] * w; out[2] += L.d[k + 2] * w;
  }
  return out;
}
/** Desenfoque de caja separable, `pasadas` veces (con 3 se parece a una gaussiana). */
function cajaBlur(src: Float32Array, w: number, h: number, ch: number, r: number, pasadas = 3): Float32Array {
  let a: Float32Array = src, b: Float32Array = new Float32Array(src.length);
  const R = Math.max(1, Math.round(r)), k = 1 / (2 * R + 1);
  for (let p = 0; p < pasadas; p++) {
    for (let y = 0; y < h; y++) for (let c = 0; c < ch; c++) {
      let s = 0; for (let x = -R; x <= R; x++) s += a[(y * w + Math.min(w - 1, Math.max(0, x))) * ch + c];
      for (let x = 0; x < w; x++) { b[(y * w + x) * ch + c] = s * k; s += a[(y * w + Math.min(w - 1, x + R + 1)) * ch + c] - a[(y * w + Math.max(0, x - R)) * ch + c]; }
    }
    [a, b] = [b, a];
    for (let x = 0; x < w; x++) for (let c = 0; c < ch; c++) {
      let s = 0; for (let y = -R; y <= R; y++) s += a[(Math.min(h - 1, Math.max(0, y)) * w + x) * ch + c];
      for (let y = 0; y < h; y++) { b[(y * w + x) * ch + c] = s * k; s += a[(Math.min(h - 1, y + R + 1) * w + x) * ch + c] - a[(Math.max(0, y - R) * w + x) * ch + c]; }
    }
    [a, b] = [b, a];
  }
  return a;
}
function remuestrear(src: Float32Array, w: number, h: number, ch: number, W: number, H: number): Float32Array {
  const out = new Float32Array(W * H * ch);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = ((x + 0.5) * w) / W - 0.5, v = ((y + 0.5) * h) / H - 0.5, i = Math.max(0, Math.min(w - 2, Math.floor(u))), j = Math.max(0, Math.min(h - 2, Math.floor(v))), fu = sat(u - i), fv = sat(v - j);
    for (let c = 0; c < ch; c++) {
      const a = src[(j * w + i) * ch + c], b = src[(j * w + i + 1) * ch + c], cc = src[((j + 1) * w + i) * ch + c], d = src[((j + 1) * w + i + 1) * ch + c];
      out[(y * W + x) * ch + c] = a + (b - a) * fu + (cc - a) * fv + (a - b - cc + d) * fu * fv;
    }
  }
  return out;
}
const aces = (x: number) => sat((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14));
const aSrgb = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
/** Largo focal en pixeles (cuántos pixeles mide una unidad a distancia 1). */
export const focalPx = (cam: Camara) => cam.h / 2 / Math.tan((cam.fov * Math.PI) / 360);

/** La luz del cuadro en flotantes (antes de revelar): escena, fuegos, humo, carteles y partículas. */
export function luzCuadro(c: Capas, atm: Atmosfera, cam: Camara, o: OpcCuadro): Float32Array {
  const { w, h } = c, n = w * h, fl = o.flick ?? 1, hdr = new Float32Array(n * 3), b = baseCamara(cam), F = focalPx(cam);
  for (let i = 0; i < n * 3; i++) hdr[i] = c.base[i] + c.fuego[i] * fl + c.aire[i] + c.aireFuego[i] * fl;
  for (const L of o.pantalla ?? []) {
    const k = L.k ?? 1;
    for (let y = 0; y < L.lam.h; y++) for (let x = 0; x < L.lam.w; x++) {
      const X = x + L.x, Y = y + L.y; if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
      const s = (y * L.lam.w + x) * 4, I = Y * w + X, t = c.trans[I] * k;
      hdr[I * 3] += L.lam.d[s] * t; hdr[I * 3 + 1] += L.lam.d[s + 1] * t; hdr[I * 3 + 2] += L.lam.d[s + 2] * t;
    }
  }
  if (o.plumas?.length) humo(hdr, c, atm, cam, b, o.plumas, o.t, fl);
  // las llamas, después del humo (la llama se ve a través de su propio humo), tapadas por lo que esté delante
  for (const ct of o.carteles ?? []) {
    const pr = proyectar(b, ct.p); if (!pr) continue;
    const [bx, by, dist] = pr, s = F / dist, W = ct.ancho * s, H = ct.alto * s, fondo = ct.fondo ?? ct.ancho * 0.6;
    const dir = norm([ct.p[0] - cam.pos[0], ct.p[1] - cam.pos[1], ct.p[2] + ct.alto * 0.4 - cam.pos[2]]), tr = transmision(atm, cam.pos, dir, dist) * (ct.k ?? 1);
    for (let y = Math.max(0, Math.floor(by - H)); y <= Math.min(h - 1, Math.ceil(by)); y++) for (let x = Math.max(0, Math.floor(bx - W / 2)); x <= Math.min(w - 1, Math.ceil(bx + W / 2)); x++) {
      const I = y * w + x; if (c.dist[I] < dist - fondo) continue;
      const q = muestrear(ct.lam, ((x + 0.5 - (bx - W / 2)) / W) * ct.lam.w, ((y + 0.5 - (by - H)) / H) * ct.lam.h);
      hdr[I * 3] += q[0] * tr * fl; hdr[I * 3 + 1] += q[1] * tr * fl; hdr[I * 3 + 2] += q[2] * tr * fl;
    }
  }
  if (o.particulas?.length) {
    const foco = o.foco ?? 1e9, ap = o.apertura ?? 0, obt = o.obturador ?? 1 / 48;
    const ps = o.particulas.map((p) => ({ p, pr: proyectar(b, p.p) })).filter((q) => q.pr) as { p: Particula; pr: [number, number, number] }[];
    ps.sort((a, z) => z.pr[2] - a.pr[2]);
    for (const { p, pr } of ps) {
      const [x, y, d] = pr; if (x < -40 || y < -40 || x > w + 40 || y > h + 40) continue;
      let x2 = x, y2 = y;
      if (p.v) { const q = proyectar(b, [p.p[0] - p.v[0] * obt, p.p[1] - p.v[1] * obt, p.p[2] - p.v[2] * obt]); if (q) { x2 = q[0]; y2 = q[1]; } }
      const largo = Math.hypot(x2 - x, y2 - y), rp = (p.r * F) / d, coc = Math.min(o.cocMax ?? 14, ap * Math.abs(1 - foco / d)), R = Math.max(0.55, Math.hypot(rp, coc));
      // la luz de la partícula se reparte en su disco y su estela
      const a0 = p.a * Math.min(1, (rp * rp + 0.12) / (R * R)) * (coc > 2 ? 0.55 : 1) * Math.min(1, (2 * R + 0.6) / (2 * R + largo));
      if (a0 < 0.004) continue;
      const dir = norm([p.p[0] - cam.pos[0], p.p[1] - cam.pos[1], p.p[2] - cam.pos[2]]), tf = transmision(atm, cam.pos, dir, d), ai = atm.aire(dir);
      const col: C3 = p.suma ? escalar(p.c, tf) : [p.c[0] * tf + ai[0] * (1 - tf), p.c[1] * tf + ai[1] * (1 - tf), p.c[2] * tf + ai[2] * (1 - tf)];
      const Rc = Math.ceil(R + 1), sx = x2 - x, sy = y2 - y, l2 = sx * sx + sy * sy;
      for (let yy = Math.max(0, Math.floor(Math.min(y, y2) - Rc)); yy <= Math.min(h - 1, Math.ceil(Math.max(y, y2) + Rc)); yy++) for (let xx = Math.max(0, Math.floor(Math.min(x, x2) - Rc)); xx <= Math.min(w - 1, Math.ceil(Math.max(x, x2) + Rc)); xx++) {
        const I = yy * w + xx; if (c.dist[I] < d) continue;
        const qx = xx + 0.5 - x, qy = yy + 0.5 - y, u = l2 > 1e-6 ? sat((qx * sx + qy * sy) / l2) : 0, r = Math.hypot(qx - sx * u, qy - sy * u);
        const a = a0 * sat(R + 0.5 - r) * (coc > 1.5 ? 0.75 + 0.25 * suave(R * 0.4, R, r) : 1); if (a <= 0) continue;
        if (p.suma) { hdr[I * 3] += col[0] * a; hdr[I * 3 + 1] += col[1] * a; hdr[I * 3 + 2] += col[2] * a; }
        else for (let k = 0; k < 3; k++) hdr[I * 3 + k] += (col[k] - hdr[I * 3 + k]) * a;
      }
    }
  }
  return hdr;
}

function ejePluma(pl: Pluma, u: number): V3 {
  const k = Math.pow(u, 1.7) * pl.alto;
  return [pl.base[0] + pl.viento[0] * k, pl.base[1] + pl.viento[1] * k, pl.base[2] + u * pl.alto];
}
/** Marcha cada pixel por las columnas de humo que cruza (hasta lo que tape la escena). */
function humo(hdr: Float32Array, c: Capas, atm: Atmosfera, cam: Camara, b: BaseCamara, plumas: Pluma[], t: number, fl: number) {
  const { w, h } = c, L = norm(atm.sol.dir);
  const cajas = plumas.map((pl) => {
    const lo: V3 = [Infinity, Infinity, Infinity], hi: V3 = [-Infinity, -Infinity, -Infinity];
    for (let k = 0; k <= 8; k++) { const u = k / 8, ce = ejePluma(pl, u), r = pl.r0 + (pl.r1 - pl.r0) * Math.pow(u, 0.8); for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], ce[a] - r * 1.15); hi[a] = Math.max(hi[a], ce[a] + r * 1.15); } }
    return [lo, hi] as [V3, V3];
  });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const I = y * w + x, d = rayoCamara(b, x + 0.5, y + 0.5), o = cam.pos, ai = atm.aire(d);
    let Ts = 1, cr = 0, cg = 0, cb = 0, tmed = 0, peso = 0;
    plumas.forEach((pl, k) => {
      const [lo, hi] = cajas[k];
      let t0 = 0, t1 = c.dist[I];
      for (let a = 0; a < 3; a++) { const ia = 1 / d[a], ta = (lo[a] - o[a]) * ia, tb = (hi[a] - o[a]) * ia; t0 = Math.max(t0, Math.min(ta, tb)); t1 = Math.min(t1, Math.max(ta, tb)); }
      if (!(t1 > t0)) return;
      const N = 36, paso = (t1 - t0) / N, j = h01(x, y, k + 5), esc = pl.escala ?? 1 / 60;
      for (let s = 0; s < N && Ts > 0.01; s++) {
        const tt = t0 + (s + j) * paso, q: V3 = [o[0] + d[0] * tt, o[1] + d[1] * tt, o[2] + d[2] * tt], u = (q[2] - pl.base[2]) / pl.alto;
        if (u < 0 || u > 1) continue;
        const ce = ejePluma(pl, u), r = pl.r0 + (pl.r1 - pl.r0) * Math.pow(u, 0.8), dn = Math.hypot(q[0] - ce[0], q[1] - ce[1]) / r;
        if (dn > 1.15) continue;
        const forma = (1 - suave(0.25, 1.1, dn)) * suave(0, 0.06, u) * (1 - suave(0.7, 1, u)), sube = t * pl.sube;
        const ru = fbm3((q[0] - pl.viento[0] * sube * 0.5) * esc + pl.semilla, (q[1] - pl.viento[1] * sube * 0.5) * esc, (q[2] - sube) * esc);
        const den = forma * Math.max(0, ru * 1.9 - 0.62 + forma * 0.25) * pl.dens;
        if (den <= 0) continue;
        const a = 1 - Math.exp(-den * paso);
        const abajo = pl.abajo ? (pl.kAbajo ?? 1) * Math.exp(-u * 6) * fl * (0.5 + 0.5 * ru) * (1 - dn * 0.5) : 0;
        const luzSol = atm.sol.k * 0.22 * (pl.sol ?? 1) * (0.5 + 0.5 * dot(d, L)) * (1 - dn * 0.4);
        const l: C3 = [0, 1, 2].map((e) => pl.humo[e] * (ai[e] * 0.35 + atm.ambCielo[e] * 1.1 + atm.sol.c[e] * luzSol) + (pl.abajo ? pl.abajo[e] * abajo : 0)) as C3;
        cr += Ts * a * l[0]; cg += Ts * a * l[1]; cb += Ts * a * l[2]; tmed += Ts * a * tt; peso += Ts * a;
        Ts *= 1 - a;
      }
    });
    if (Ts >= 0.999) continue;
    const tf = transmision(atm, o, d, peso > 0 ? tmed / peso : 0), k3 = I * 3;
    hdr[k3] = hdr[k3] * Ts + cr * tf + ai[0] * (1 - tf) * (1 - Ts);
    hdr[k3 + 1] = hdr[k3 + 1] * Ts + cg * tf + ai[1] * (1 - tf) * (1 - Ts);
    hdr[k3 + 2] = hdr[k3 + 2] * Ts + cb * tf + ai[2] * (1 - tf) * (1 - Ts);
  }
}

/** Rayos del cielo, derrame en los bordes y resplandor, sobre la luz lineal (devuelve una copia). */
export function luzRevelada(hdr: Float32Array, c: Capas, atm: Atmosfera, cam: Camara, o: OpcCuadro): Float32Array {
  const { w, h } = c, n = w * h, b = baseCamara(cam), out = new Float32Array(hdr);
  if (o.rayos) {
    const W = w >> 1, H = h >> 1, br = new Float32Array(W * H * 3), um = o.rayos.umbral ?? 0;
    const fuente = o.rayos.desde ?? ([cam.pos[0] + atm.sol.dir[0] * 1e6, cam.pos[1] + atm.sol.dir[1] * 1e6, cam.pos[2] + atm.sol.dir[2] * 1e6] as V3), pr = proyectar(b, fuente);
    if (pr) {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const q: C3 = [0, 0, 0];
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const I = (y * 2 + dy) * w + x * 2 + dx, k = c.cielo[I]; q[0] += hdr[I * 3] * k; q[1] += hdr[I * 3 + 1] * k; q[2] += hdr[I * 3 + 2] * k; }
        const l = (q[0] + q[1] + q[2]) / 12, f = Math.max(0, l - um) / Math.max(1e-6, l);
        for (let k = 0; k < 3; k++) br[(y * W + x) * 3 + k] = (q[k] / 4) * f;
      }
      const sx = pr[0] / 2, sy = pr[1] / 2, N = 56, dec = o.rayos.decae ?? 0.965, ry = new Float32Array(W * H * 3);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let r = 0, g = 0, bb = 0, peso = 1;
        const dx = ((sx - x) / N) * 0.85, dy = ((sy - y) / N) * 0.85;
        for (let s = 0; s < N; s++) {
          const X = Math.round(x + dx * s), Y = Math.round(y + dy * s); if (X < 0 || Y < 0 || X >= W || Y >= H) break;
          const k = (Y * W + X) * 3; r += br[k] * peso; g += br[k + 1] * peso; bb += br[k + 2] * peso; peso *= dec;
        }
        ry[(y * W + x) * 3] = r / N; ry[(y * W + x) * 3 + 1] = g / N; ry[(y * W + x) * 3 + 2] = bb / N;
      }
      const up = remuestrear(ry, W, H, 3, w, h);
      for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) out[i * 3 + k] += up[i * 3 + k] * o.rayos.k * o.rayos.c[k];
    }
  }
  if (o.derrame) {
    // el cielo brillante se derrama sobre el borde de lo que tiene delante (lo que hace la lente a contraluz)
    const fondo = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { const k = c.cielo[i]; fondo[i * 4] = hdr[i * 3] * k; fondo[i * 4 + 1] = hdr[i * 3 + 1] * k; fondo[i * 4 + 2] = hdr[i * 3 + 2] * k; fondo[i * 4 + 3] = k; }
    const bl = cajaBlur(fondo, w, h, 4, o.derrame.r, 2);
    for (let i = 0; i < n; i++) {
      const s = 1 - c.cielo[i], a = bl[i * 4 + 3];
      if (s <= 0 || a <= 0.001) continue;
      const k = o.derrame.k * s * Math.min(1, a * 2);
      for (let j = 0; j < 3; j++) out[i * 3 + j] += bl[i * 4 + j] * k;
    }
  }
  if (o.bloom) {
    const W = Math.max(1, w >> 2), H = Math.max(1, h >> 2), um = o.bloom.umbral ?? 1, br = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const l = (out[i * 3] + out[i * 3 + 1] + out[i * 3 + 2]) / 3, f = Math.max(0, l - um) / Math.max(1e-6, l); for (let k = 0; k < 3; k++) br[i * 3 + k] = out[i * 3 + k] * f; }
    const ch = remuestrear(br, w, h, 3, W, H), u1 = remuestrear(cajaBlur(ch, W, H, 3, 2), W, H, 3, w, h), u2 = remuestrear(cajaBlur(ch, W, H, 3, 9), W, H, 3, w, h);
    for (let i = 0; i < n * 3; i++) out[i] += (u1[i] * 0.6 + u2[i] * 0.4) * o.bloom.k;
  }
  return out;
}
/** Exposición, viñeta, curva de película, ajuste y paso a sRGB: luz lineal a color de pantalla (0..1, 3 canales). */
export function revelarLuz(luz: Float32Array, w: number, h: number, o: OpcCuadro): Float32Array {
  const out = new Float32Array(w * h * 3), ex = o.exposicion ?? 1, vi = o.vineta ?? 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const I = y * w + x, dx = (x + 0.5) / w - 0.5, dy = (y + 0.5) / h - 0.5, v = 1 - vi * suave(0.18, 0.75, Math.hypot(dx * 1.1, dy * 1.4) * 1.414);
    let col: C3 = [aces(luz[I * 3] * ex * v), aces(luz[I * 3 + 1] * ex * v), aces(luz[I * 3 + 2] * ex * v)];
    if (o.grado) col = o.grado(col, x, y);
    for (let k = 0; k < 3; k++) out[I * 3 + k] = sat(aSrgb(sat(col[k])));
  }
  return out;
}
/** El cuadro revelado a 8 bits (con grano si se pide). */
export function revelar(hdr: Float32Array, c: Capas, atm: Atmosfera, cam: Camara, o: OpcCuadro): Raster {
  const { w, h } = c, f = revelarLuz(luzRevelada(hdr, c, atm, cam, o), w, h, o), img = createRaster(w, h), gr = o.grano ?? 0, sm = o.semilla ?? 1;
  for (let I = 0; I < w * h; I++) {
    const x = I % w, y = (I - x) / w, g = gr ? (h01(x, y, sm * 31 + 7) + h01(x + 911, y, sm * 17 + 3) - 1) * gr : 0;
    for (let k = 0; k < 3; k++) img.data[I * 4 + k] = Math.round(sat(f[I * 3 + k] + g) * 255);
    img.data[I * 4 + 3] = 255;
  }
  return img;
}
