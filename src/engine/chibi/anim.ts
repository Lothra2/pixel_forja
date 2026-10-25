import type { Raster } from '../core/raster';
import type { ChibiLook, Talla } from './look';
import { medidas } from './metrics';
import { pintarPose, cajaGolpe, type Render } from './body';
import { clipsHumano, type Clip, type Cuadro, type Punto } from './clips';
import { clipsPerro, pintarPerro } from './dog';
import { pintarMolde, escala2x } from './video';

/**
 * Pinta los cuadros de una animación para un muñeco: imagen, tiempos, raíz, cajas y puntos de efecto.
 * Todo se dibuja a 32 (la resolución del video). La talla grande es el mismo cuadro al doble con Scale2x.
 */

export interface CuadroPintado {
  img: Raster;
  t: number;
  /** Avance de la raíz en este cuadro y altura sobre el piso (px de la talla). */
  dx: number;
  dy: number;
  /** El ancla (raíz en el piso) dentro de la celda. */
  ancla: [number, number];
  hurt: [number, number, number, number];
  hit?: [number, number, number, number];
  fx?: { id: string; x: number; y: number };
  sonido?: string;
  puntos: Record<Punto, [number, number]>;
}

export function clipsDe(look: ChibiLook): Clip[] {
  return look.especie === 'perro' ? clipsPerro() : clipsHumano();
}

const piso = new Map<string, number>();
/** Fila más baja del muñeco parado (para apoyar las poses giradas en el mismo piso). */
function filaPiso(look: ChibiLook): number {
  const key = `${look.contextura}:${look.especie}`;
  let v = piso.get(key);
  if (v === undefined) {
    const r = look.especie === 'perro' ? pintarPerro(look, 32, {}) : pintarPose(look, 32, {});
    v = ultimaFila(r.img);
    piso.set(key, v);
  }
  return v;
}
function ultimaFila(img: Raster): number {
  for (let y = img.h - 1; y >= 0; y--) for (let x = 0; x < img.w; x++) if (img.data[(y * img.w + x) * 4 + 3]) return y;
  return img.h - 1;
}
function mover(img: Raster, dy: number): Raster {
  if (!dy) return img;
  const out = { w: img.w, h: img.h, data: new Uint8ClampedArray(img.data.length) };
  for (let y = 0; y < img.h; y++) {
    const sy = y - dy;
    if (sy < 0 || sy >= img.h) continue;
    out.data.set(img.data.subarray(sy * img.w * 4, (sy + 1) * img.w * 4), y * img.w * 4);
  }
  return out;
}

export function pintarCuadro(look: ChibiLook, talla: Talla, q: Cuadro, i = 0): CuadroPintado {
  const m = medidas(32, look.contextura);
  let r: Render;
  if (q.p.molde && look.especie !== 'perro') {
    const v = pintarMolde(look, q.p.molde, q.p.espejo, q.p.gesto ?? 'normal');
    r = { img: v.img, puntos: v.puntos, hurt: v.hurt };
  } else r = look.especie === 'perro' ? pintarPerro(look, 32, q.p, i) : pintarPose(look, 32, q.p, i);
  let img = r.img;
  let corr = 0;
  if (q.apoyar) {
    corr = filaPiso(look) - ultimaFila(img);
    img = mover(img, corr);
  }
  const k = talla === 48 ? 2 : 1;
  const sh = (p: [number, number]): [number, number] => [p[0] * k, (p[1] + corr) * k];
  const puntos = Object.fromEntries(Object.entries(r.puntos).map(([n, v]) => [n, sh(v as [number, number])])) as Record<Punto, [number, number]>;
  const box = (b: [number, number, number, number]): [number, number, number, number] => [b[0] * k, (b[1] + corr) * k, b[2] * k, b[3] * k];
  const out: CuadroPintado = {
    img: k === 2 ? escala2x(img) : img, t: q.t, dx: Math.round((q.dx ?? 0) * k * 10) / 10, dy: Math.round((q.dy ?? 0) * k),
    ancla: [Math.floor(m.celda[0] / 2) * k, m.piso * k], hurt: box(r.hurt), puntos,
  };
  if (q.golpe) out.hit = box(cajaGolpe({ ...r, puntos: Object.fromEntries(Object.entries(r.puntos).map(([n, v]) => [n, [v[0], v[1] + corr]])) as Render['puntos'] }, q.golpe, 32));
  if (q.fx) {
    const p = puntos[q.fx.en];
    out.fx = { id: q.fx.id, x: Math.round(p[0] + (q.fx.dx ?? 0) * k), y: Math.round(p[1] + (q.fx.dy ?? 0) * k) };
  }
  if (q.sonido) out.sonido = q.sonido;
  return out;
}

const cache = new Map<string, CuadroPintado[]>();
/** Todos los cuadros de un clip (con caché por muñeco, talla y clip). */
export function pintarClip(look: ChibiLook, talla: Talla, clip: Clip): CuadroPintado[] {
  const key = JSON.stringify(look) + `|${talla}|${clip.id}`;
  let v = cache.get(key);
  if (!v) {
    v = clip.cuadros.map((q, i) => pintarCuadro(look, talla, q, i));
    cache.set(key, v);
    if (cache.size > 600) cache.delete(cache.keys().next().value!);
  }
  return v;
}
export function limpiarCache() { cache.clear(); }
