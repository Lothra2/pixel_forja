import type { Raster } from '../core/raster';
import { lpcHead, type LpcLook } from '../parts/lpc';
import { rotSprite } from '../render/rotsprite';
import { hexToRgb } from '../color/oklab';
import { makeBossRamp } from '../boss/ramp';
import { sub, type V3 } from '../boss/sdf';
import type { EyeExpr, MouthExpr } from '../head/stamps';
import gi from './datos/vestuarios/gi.json';
import rick from './datos/personajes/rick.json';
import type { EstiloDef, Medidas } from './estilo';
import { resolver, type Esqueleto } from './esqueleto';
import { aEsqueleto, type Cara } from './pose';
import { armarCuerpo, suavidad, type Vestuario, type Secundario } from './cuerpo';
import { pintar, TONOS, type Material, type Pintado } from './pintor';
import { outlineHex } from '../boss/render';
import type { Cuadro } from './movimiento';

/**
 * Un personaje de Forja 2 (dato): su cabeza LPC de siempre, sus colores y su vestuario.
 */
export interface Personaje {
  id: string;
  nombre: string;
  cabeza: LpcLook;
  colores: Record<string, string>;
  vestuario: string;
}

export const VESTUARIOS: Record<string, Vestuario> = { gi: gi as Vestuario };
export const PERSONAJES: Record<string, Personaje> = { rick: rick as unknown as Personaje };

/** Qué superficie lleva cada material del vestuario (cambia la textura). */
const SUPERFICIE: Record<string, Material['superficie']> = { piel: 'piel', gi: 'tela', cinturon: 'tela', venda: 'tela', cinta: 'tela', guante: 'cuero' };

export function materiales(pj: Personaje, e: EstiloDef, cell: number): Record<string, Material> {
  const n = TONOS[e.acabado];
  const out: Record<string, Material> = {};
  for (const [k, hex] of Object.entries(pj.colores)) {
    if (k === 'pelo' || k === 'ojos' || k === 'barba') continue;
    out[k] = { ramp: makeBossRamp(hex, n, { spread: 1.25, hue: 14, lightUp: 0.13 }), superficie: SUPERFICIE[k] ?? 'tela', tex: 0.7, escala: Math.max(1.5, cell * 0.022) };
  }
  return out;
}

const CARA: Record<Cara, { ojos: EyeExpr; boca?: MouthExpr }> = {
  serio: { ojos: 'angry' }, grito: { ojos: 'angry', boca: 'open' }, dolor: { ojos: 'hurt', boca: 'open' }, feliz: { ojos: 'happy', boca: 'grin' },
};

/** Color de la estela de los golpes (es parte de la paleta fija). */
export const ESTELA = '#fff4d6';

export interface CuadroPintado {
  raster: Raster;
  /** colores de la cabeza LPC que se usaron (entran en la paleta fija) */
  colCabeza: string[];
  pintado: Pintado;
  j: Esqueleto;
  /** dónde quedó la cabeza (caja en la celda) */
  cabeza: { x0: number; y0: number; x1: number; y1: number } | null;
  /** segundos que tardó en pintarse */
  segundos: number;
}

/** Lienzo de salida: ancho, alto y pivote (los pies). Por defecto la celda cuadrada con el pivote abajo al medio. */
export interface Lienzo { w: number; h: number; pivot: [number, number] }

export function pintarCuadro(pj: Personaje, e: EstiloDef, m: Medidas, cell: number, q: Cuadro, sec?: Secundario, lz?: Lienzo): CuadroPintado {
  const t0 = performance.now();
  const pivot: [number, number] = lz?.pivot ?? [cell / 2, cell - 2];
  const esq = aEsqueleto(m, q.pose, q.extras, e.retarget);
  const j = resolver(m, esq);
  const v = VESTUARIOS[pj.vestuario];
  if (!v) throw new Error(`No existe el vestuario ${pj.vestuario}`);
  const body = armarCuerpo(e, m, j, esq, v, sec);
  const pintado = pintar({ piezas: body.pieces, materiales: materiales(pj, e, cell), suave: suavidad(m) }, { cell, ss: e.supersample, pivot, acabado: e.acabado, lienzo: lz ? [lz.w, lz.h] : undefined });
  const colCabeza: string[] = [];
  const cabeza = pegarCabeza(pintado, pj, m, j, q.pose.cara, q.pose.cabeza.giro + q.pose.giroPecho * 0.35, q.pose.cabeza.inclina + q.pose.inclina * 0.3, pivot, colCabeza);
  return { raster: pintado.raster, colCabeza, pintado, j, cabeza, segundos: (performance.now() - t0) / 1000 };
}

/**
 * La cabeza LPC, sin cambiarla: se elige la vista por el giro, se inclina con RotSprite y se pega con la barbilla en el
 * cuello. Lo que del cuerpo está más cerca de la cámara que la cabeza (un puño delante de la cara) queda encima.
 */
function pegarCabeza(pt: Pintado, pj: Personaje, m: Medidas, j: Esqueleto, cara: Cara, giro: number, inclina: number, pivot: [number, number], cols: string[]) {
  const c = pj.colores;
  const vista = giro > 25 ? 'front34' : 'side';
  const ex = CARA[cara];
  const hi = lpcHead(pj.cabeza, vista, { skin: c.piel, hair: c.pelo, eyes: c.ojos, beard: c.barba ?? c.pelo, glasses: '#1e1e24' }, ex.ojos, ex.boca);
  let img = hi.img, ax = hi.anchor.x, ay = hi.anchor.y;
  // cabeceo: + hacia adelante (en pantalla, horario mirando a la derecha)
  const ang = Math.round(inclina);
  if (Math.abs(ang) >= 6) { const r = rotSprite(img, ang, ax + 0.5, ay + 0.5); img = r.img; ax = r.px - 0.5; ay = r.py - 0.5; }
  // la barbilla, un poco arriba del cuello y hacia adelante
  const barb: V3 = sub(j.cabeza, [j.baseCabeza.u[0] * m.cabeza * 0.42, j.baseCabeza.u[1] * m.cabeza * 0.42, 0]);
  const X0 = Math.round(pivot[0] + barb[0] - ax), Y0 = Math.round(pivot[1] - barb[1] - ay);
  const zc = j.cabeza[2], margen = 0.035 * m.H, W = pt.raster.w, Hh = pt.raster.h;
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      const i = img.idx[y * img.w + x];
      if (i < 0) continue;
      const X = X0 + x, Y = Y0 + y;
      if (X < 0 || Y < 0 || X >= W || Y >= Hh) continue;
      const t = Y * W + X;
      if (pt.mat[t] >= 0 && pt.z[t] > zc + margen) continue;
      const [r, g, b] = hexToRgb(hi.pal[i].hex);
      cols.push(hi.pal[i].hex.toLowerCase());
      pt.raster.data.set([r, g, b, 255], t * 4);
      pt.mat[t] = -2;
      x0 = Math.min(x0, X); y0 = Math.min(y0, Y); x1 = Math.max(x1, X); y1 = Math.max(y1, Y);
    }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

/**
 * Un movimiento entero: cada cuadro con el movimiento secundario (las colas de tela se arrastran según cuánto se movió
 * su ancla desde el cuadro anterior) y la estela del impacto (el camino del puño o del pie en los cuadros de antes,
 * detrás del cuerpo).
 */
export function pintarMovimiento(pj: Personaje, e: EstiloDef, m: Medidas, cell: number, cuadros: Cuadro[], lz?: Lienzo): CuadroPintado[] {
  const out: CuadroPintado[] = [];
  let prev: Esqueleto | null = null;
  const juntas: Esqueleto[] = cuadros.map((q) => resolver(m, aEsqueleto(m, q.pose, q.extras, e.retarget)));
  for (let i = 0; i < cuadros.length; i++) {
    const j = juntas[i];
    const vel = (a: V3 | undefined, b: V3): V3 => (a ? sub(b, a) : [0, 0, 0]);
    const sec: Secundario = { cabeza: vel(prev?.cabeza, j.cabeza), cintura: vel(prev?.pelvis, j.pelvis) };
    const f = pintarCuadro(pj, e, m, cell, cuadros[i], sec, lz);
    const imp = cuadros[i].impacto;
    if (imp) {
      const punto = (x: Esqueleto) => (imp.miembro === 'mano' ? x.puño[imp.lado] : x.punta[imp.lado]);
      const camino = [juntas[i - 2], juntas[i - 1], j].filter(Boolean).map((x) => punto(x!));
      estela(f, camino, lz?.pivot ?? [cell / 2, cell - 2], Math.max(1, m.H * 0.02));
    }
    out.push(f);
    prev = j;
  }
  return out;
}

/** La estela del golpe: el camino del puño o del pie, en un tono claro, solo donde no hay cuerpo (queda detrás). */
function estela(f: CuadroPintado, camino: V3[], pivot: [number, number], grosor: number) {
  const W = f.raster.w, H = f.raster.h;
  const pasos = 40;
  for (let s = 0; s < camino.length - 1; s++)
    for (let k = 0; k <= pasos; k++) {
      const t = k / pasos, a = camino[s], b = camino[s + 1];
      const x = pivot[0] + a[0] + (b[0] - a[0]) * t, y = pivot[1] - (a[1] + (b[1] - a[1]) * t);
      // más angosta lejos del golpe
      const g = grosor * (0.35 + 0.65 * ((s + t) / (camino.length - 1)));
      for (let dy = -Math.ceil(g); dy <= Math.ceil(g); dy++)
        for (let dx = -Math.ceil(g); dx <= Math.ceil(g); dx++) {
          if (dx * dx + dy * dy > g * g) continue;
          const X = Math.round(x + dx), Y = Math.round(y + dy);
          if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
          const i = Y * W + X;
          if (f.raster.data[i * 4 + 3]) continue;
          f.raster.data.set([...hexToRgb(ESTELA), 255], i * 4);
        }
    }
}

/** La paleta fija de un personaje en un estilo: sus rampas, los contornos, la estela y los colores de su cabeza. */
export function paleta(pj: Personaje, e: EstiloDef, cell: number, pintados: CuadroPintado[]): Set<string> {
  const out = new Set<string>([ESTELA]);
  for (const mt of Object.values(materiales(pj, e, cell))) { for (const h of mt.ramp) out.add(h.toLowerCase()); out.add(outlineHex(mt.ramp[0]).toLowerCase()); }
  for (const p of pintados) for (const h of p.colCabeza) out.add(h);
  return out;
}
