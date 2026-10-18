import { createRaster, type Raster } from '../core/raster';
import type { Pose } from '../rig/pose';
import type { Joints } from '../render/human';
import type { RenderedClip } from '../render/clip';

/**
 * El pie clavado (piloto 0d de Forja 2), para cualquier animación ya dibujada: mide cuánto patina el pie de apoyo y lo
 * corrige corriendo el cuadro entero, sin cambiar la pose, los tiempos ni qué cuadro es el impacto.
 *
 * Patina: entre dos cuadros seguidos en los que un pie está apoyado, ese pie tiene que moverse en la hoja exactamente lo
 * contrario de lo que el juego mueve el sprite (`avance`: 0 en las acciones en el sitio, el avance del ciclo en caminar
 * y correr). Lo que sobra o falta, en pixeles, es el patinazo.
 */
export type Pie = 'footNear' | 'footFar';

/**
 * Qué pies están apoyados en un cuadro: los que marca la pose (o, si no marca, los dos) que además están a nivel del
 * piso: a lo sumo 1 px sobre el tobillo más bajo de toda la animación (`piso`). Un pie que la pose marca como apoyo
 * pero que está en el aire (el saltito de un ataque) no patina: va en el aire.
 */
export function apoyados(p: Pose, j: Joints | undefined, piso: number): Pie[] {
  if (!j || p.air > 0 || (p.rise ?? 0) > 0) return [];
  const marca: Pie[] = p.support === 'near' ? ['footNear'] : p.support === 'far' ? ['footFar'] : ['footNear', 'footFar'];
  return marca.filter((k) => j[k][1] >= piso - 1);
}

/** El tobillo más bajo de la animación (la fila del piso para los tobillos). */
export const pisoDe = (joints: (Joints | undefined)[]) => Math.max(...joints.flatMap((j) => (j ? [j.footNear[1], j.footFar[1]] : [-Infinity])));

/** Patinazo de cada paso (de un cuadro al siguiente), en pixeles; null si no hay pie apoyado en los dos. */
export function patinazos(poses: Pose[], joints: (Joints | undefined)[], avance: number[], bucle: boolean): (number | null)[] {
  const n = joints.length, out: (number | null)[] = [], piso = pisoDe(joints);
  for (let i = 0; i < n - (bucle ? 0 : 1); i++) {
    const k = (i + 1) % n;
    const a = apoyados(poses[i], joints[i], piso), b = apoyados(poses[k], joints[k], piso);
    const ambos = a.filter((x) => b.includes(x));
    if (!ambos.length) { out.push(null); continue; }
    out.push(Math.max(...ambos.map((x) => Math.abs(joints[k]![x][0] - joints[i]![x][0] + (avance[i] ?? 0)))));
  }
  return out;
}

/** Resumen: el peor paso y cuántos pasos patinan más de 1 px. */
export function resumen(p: (number | null)[]): { max: number; pasos: number; malos: number } {
  const v = p.filter((x): x is number => x !== null);
  return { max: v.length ? Math.round(Math.max(...v) * 10) / 10 : 0, pasos: v.length, malos: v.filter((x) => x > 1).length };
}

/**
 * Clava el pie de apoyo en las animaciones en el sitio: calcula cuánto correr cada cuadro (en pixeles enteros) para que
 * el pie apoyado quede donde estaba en el cuadro anterior. En un bucle, lo que se acumula en la vuelta se reparte para
 * que el empalme no salte.
 */
export function corrimientos(poses: Pose[], joints: (Joints | undefined)[], bucle: boolean): number[] {
  const n = joints.length, s = [0], piso = pisoDe(joints);
  for (let i = 0; i < n - 1; i++) {
    const a = apoyados(poses[i], joints[i], piso), b = apoyados(poses[i + 1], joints[i + 1], piso);
    const ambos = a.filter((x) => b.includes(x));
    if (!ambos.length) { s.push(s[i]); continue; }
    // con los dos pies apoyados que se mueven distinto (la guardia que se abre) ningún corrimiento clava los dos: el
    // punto medio deja el peor de los dos lo más chico posible. El patinazo de un paso solo depende de su corrimiento,
    // así que ningún paso queda peor que antes (salvo el reparto de la vuelta en los bucles, a lo sumo 1 px)
    const dxs = ambos.map((x) => joints[i + 1]![x][0] - joints[i]![x][0]);
    s.push(s[i] - Math.round((Math.min(...dxs) + Math.max(...dxs)) / 2));
  }
  if (bucle && n > 1) {
    // la vuelta: del último al primero también hay un paso
    const a = apoyados(poses[n - 1], joints[n - 1], piso), b = apoyados(poses[0], joints[0], piso);
    const ambos = a.filter((x) => b.includes(x));
    if (ambos.length) {
      const dxs = ambos.map((x) => joints[0]![x][0] - joints[n - 1]![x][0]);
      const dx = (Math.min(...dxs) + Math.max(...dxs)) / 2;
      const deriva = s[n - 1] - Math.round(dx);
      for (let i = 0; i < n; i++) s[i] -= Math.round((deriva * i) / n);
    }
  }
  return s;
}

/** Corre un cuadro dx pixeles (lo que sale de la celda se pierde: se cuenta). */
export function correr(r: Raster, dx: number): { raster: Raster; perdidos: number } {
  if (!dx) return { raster: r, perdidos: 0 };
  const o = createRaster(r.w, r.h);
  let perdidos = 0;
  for (let y = 0; y < r.h; y++)
    for (let x = 0; x < r.w; x++) {
      const i = (y * r.w + x) * 4;
      if (!r.data[i + 3]) continue;
      const X = x + dx;
      if (X < 0 || X >= r.w) { perdidos++; continue; }
      o.data.set(r.data.subarray(i, i + 4), (y * r.w + X) * 4);
    }
  return { raster: o, perdidos };
}

export const correrJuntas = (j: Joints | undefined, dx: number): Joints | undefined =>
  j && dx ? (Object.fromEntries(Object.entries(j).map(([k, v]) => [k, v ? [v[0] + dx, v[1]] : v])) as Joints) : j;

/**
 * Las que no se clavan aunque no avancen: se deslizan a propósito (la embestida se tira hacia adelante, al morir el
 * cuerpo cae), y clavarles el pie cambia lo que quieren decir y saca pixeles de la celda.
 */
export const NO_CLAVAR = new Set(['charge', 'die']);

/**
 * El pie clavado aplicado a un clip ya dibujado (lo usa renderClip con `pieClavado`). Premium o clásicas (el kit de
 * GG Abyss usa las dos), en el sitio (sin avance ni desplazamiento), que no gire de vista en cada cuadro y que no esté en NO_CLAVAR. Corre los cuadros y todo lo
 * que va en coordenadas de la celda (articulaciones, cajas, el arma, las pelotas).
 */
export function clavarClip(c: RenderedClip, poses: Pose[] | null): RenderedClip {
  if (!poses || !c.joints || c.stride || c.travel || NO_CLAVAR.has(c.name) || poses.length !== c.frames.length) return c;
  const s = corrimientos(poses, c.joints, c.loop);
  if (s.every((v) => !v)) return c;
  const W = c.cell - 1, cx = (v: number) => Math.max(0, Math.min(W, v));
  return {
    ...c,
    frames: c.frames.map((r, i) => correr(r, s[i]).raster),
    joints: c.joints.map((j, i) => correrJuntas(j, s[i])!),
    ...(c.wholes ? { wholes: c.wholes.map((w, i) => (w ? { ...w, x0: cx(w.x0 + s[i]), x1: cx(w.x1 + s[i]) } : w)) } : {}),
    ...(c.held ? { held: c.held.map((h, i) => (h ? { ...h, x: h.x + s[i] } : h)) } : {}),
    ...(c.balls ? { balls: c.balls.map((bs, i) => bs.map((b) => ({ ...b, x: b.x + s[i] }))) } : {}),
  };
}
