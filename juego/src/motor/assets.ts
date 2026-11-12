// Carga de los atlas horneados y dibujo de cuadros. Los atlas se bajan cuando hacen falta (por zona).
export interface Cuadro {
  img: CanvasImageSource | null;
  atlas: string;
  x: number; y: number; w: number; h: number;
  /** Ancla: el pixel que va sobre el punto del piso. */
  ax: number; ay: number;
  /** Hoja del arma (de la mano a la punta) relativa al ancla, si es personaje. */
  hoja?: [number, number, number, number];
}
export interface ObjMeta { f: Cuadro[]; t: number; hu: [number, number]; b: number; tema: string; luz: [number, string, number] | 0; plano: number }
interface Manifiesto { atlas: Record<string, [string, number, number]>; h: Record<string, any[]>; m: Record<string, any[]>; o: Record<string, any>; p: Record<string, any[]>; i?: Record<string, any[]>; w?: Record<string, any[]>; wm?: Record<string, any>; r?: Record<string, any[]>; za?: Record<string, number> }

let man: Manifiesto | null = null;
const imgs = new Map<string, HTMLImageElement | ImageBitmap>();
const cargando = new Map<string, Promise<void>>();
const cuadros = new Map<string, Cuadro[]>();
const objetos = new Map<string, ObjMeta>();
export const BASE = './assets/';

const aCuadro = (e: any[]): Cuadro => ({ img: null, atlas: e[0], x: e[1], y: e[2], w: e[3], h: e[4], ax: e[5], ay: e[6], hoja: e.length >= 11 ? [e[7], e[8], e[9], e[10]] : undefined });

export async function cargarManifiesto(): Promise<void> {
  const r = await fetch(BASE + 'manifiesto.json');
  man = await r.json();
}
export const manifiesto = () => man!;

// Descargas: como mucho MAX_DESCARGAS a la vez, con reintentos de espera creciente.
// Si un atlas falla del todo, se borra de `cargando` y se vuelve a pedir pasado un rato
// (antes la promesa resuelta quedaba ahí y el atlas no volvía a bajar nunca: jefe sin cuerpo).
const MAX_DESCARGAS = 4;
const REINTENTOS = 5;
let activas = 0;
const cola: (() => void)[] = [];
const fallo = new Map<string, number>();
const usado = new Map<string, number>();
/** Hora del cuadro actual, para el LRU sin llamar a performance.now() en cada dibujo. */
let ahoraCuadro = 0;
export const marcarCuadro = (t: number) => { ahoraCuadro = t; };
const turno = () => new Promise<void>((ok) => { if (activas < MAX_DESCARGAS) { activas++; ok(); } else cola.push(() => { activas++; ok(); }); });
const soltarTurno = () => { activas--; const s = cola.shift(); if (s) s(); };
function bajar(url: string): Promise<HTMLImageElement | null> {
  return new Promise((ok) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => ok(null);
    im.src = url;
  });
}
export function cargarAtlas(nombre: string): Promise<void> {
  if (imgs.has(nombre)) return Promise.resolve();
  let p = cargando.get(nombre);
  if (p) return p;
  const archivo = man!.atlas[nombre]?.[0];
  if (!archivo) return Promise.resolve();
  const f = fallo.get(nombre);
  if (f && performance.now() - f < 4000) return Promise.resolve();
  p = (async () => {
    for (let i = 0; i < REINTENTOS; i++) {
      if (i) await new Promise((r) => setTimeout(r, 300 * 2 ** i));
      await turno();
      const im = await bajar(BASE + archivo + (i ? `?r=${i}` : ''));
      soltarTurno();
      if (im) { imgs.set(nombre, im); usado.set(nombre, performance.now()); fallo.delete(nombre); cargando.delete(nombre); return; }
    }
    console.warn('no cargó', archivo);
    fallo.set(nombre, performance.now());
    cargando.delete(nombre);
  })();
  cargando.set(nombre, p);
  return p;
}
const bytesAtlas = (n: string) => { const a = man?.atlas[n]; return a ? a[1] * a[2] * 4 : 0; };
/** Memoria de atlas decodificados en MB (aprox.). */
export const memoriaAtlas = () => { let t = 0; for (const n of imgs.keys()) t += bytesAtlas(n); return t / 1e6; };
/** Libera atlas que no están en `mantener`, del menos usado al más reciente, hasta quedar bajo el tope (MB).
 *  Lo de la zona anterior suele sobrevivir si cabe, así volver atrás no recarga nada. */
export function liberarAtlas(mantener: Set<string>, topeMB = 500): string[] {
  let total = memoriaAtlas() * 1e6;
  const tope = topeMB * 1e6;
  if (total <= tope) return [];
  const ahora = performance.now();
  const cand = [...imgs.keys()].filter((n) => !mantener.has(n) && ahora - (usado.get(n) ?? 0) > 5000).sort((a, b) => (usado.get(a) ?? 0) - (usado.get(b) ?? 0));
  const fuera = new Set<string>();
  for (const n of cand) { if (total <= tope) break; total -= bytesAtlas(n); fuera.add(n); }
  if (!fuera.size) return [];
  for (const n of fuera) { const im = imgs.get(n); imgs.delete(n); usado.delete(n); if (im instanceof HTMLImageElement) im.src = ''; }
  // los cuadros guardan la imagen: soltarla para que se pueda recoger y se vuelva a pedir al dibujar
  const limpiar = (q: Cuadro) => { if (q.img && fuera.has(q.atlas)) q.img = null; };
  for (const l of cuadros.values()) l.forEach(limpiar);
  for (const o of objetos.values()) o.f.forEach(limpiar);
  return [...fuera];
}
/** Pide atlas en segundo plano (p. ej. el jefe de la zona siguiente). */
export function precargar(nombres: Iterable<string>) { for (const n of nombres) if (!imgs.has(n)) cargarAtlas(n); }
export const atlasListo = (n: string) => imgs.has(n);
export async function asegurar(nombres: Iterable<string>, progreso?: (h: number, t: number) => void) {
  const ns = [...new Set(nombres)].filter((n) => !imgs.has(n));
  let h = 0;
  progreso?.(0, ns.length);
  await Promise.all(ns.map((n) => cargarAtlas(n).then(() => progreso?.(++h, ns.length))));
}

function lista(grupo: 'h' | 'm' | 'p' | 'i' | 'r' | 'sel', clave: string): Cuadro[] {
  const k = grupo + ':' + clave;
  let c = cuadros.get(k);
  if (!c) { const raw = (man as any)?.[grupo]?.[clave]; c = raw ? raw.map(aCuadro) : []; cuadros.set(k, c!); }
  return c!;
}
export const cuadrosHeroe = (clase: string, acc: string, dir: string) => lista('h', `${clase}/${acc}/${dir}`);
export const cuadrosMonstruo = (id: string, acc: string, dir: string) => lista('m', `${id}/${acc}/${dir}`);
export const cuadrosPiso = (id: string, v: number) => lista('p', `${id}|${v}`);
/** Retrato grande de la clase en su pose de presentación (nivel 0 novato, 2 leyenda). */
export const cuadrosRetrato = (id: string, nivel: number) => lista('r', `${id}/${nivel}`);
/** Presentación de la selección de personaje (grupo 'sel' de la Forja): 48 cuadros, los 12 primeros son la entrada. */
export const cuadrosSel = (id: string, nivel: number) => lista('sel', `${id}/${nivel}`);
export const metaSel = (): { cuadros: number; entrada: number; fps: number; escala: number } | null => (man as any)?.selm ?? null;
export const cuadrosIcono = (id: string) => lista('i', id);
export function objetoMeta(id: string, v: string): ObjMeta | null {
  const k = `${id}|${v}`;
  let o = objetos.get(k);
  if (o) return o;
  const raw = man?.o[k];
  if (!raw) return null;
  o = { ...raw, f: raw.f.map(aCuadro) } as ObjMeta;
  objetos.set(k, o);
  return o;
}
/** Atlas que usa una lista de claves. */
export function atlasDe(grupo: 'h' | 'm' | 'p' | 'o' | 'i' | 'w', claves: string[]): Set<string> {
  const s = new Set<string>();
  const g = (man as any)?.[grupo] ?? {};
  for (const k of claves) {
    const v = g[k]; if (!v) continue;
    const fs = grupo === 'o' ? v.f : v;
    for (const e of fs) s.add(e[0]);
  }
  return s;
}
/** Todas las claves de un grupo que empiezan con un prefijo (p. ej. 'zombi/'). */
export function clavesCon(grupo: 'h' | 'm' | 'p' | 'o' | 'i' | 'w', prefijo: string): string[] {
  return Object.keys((man as any)?.[grupo] ?? {}).filter((k) => k.startsWith(prefijo));
}

/** Dibuja un cuadro con el ancla en (x, y). Devuelve si se pudo (el atlas puede estar bajando). */
export function dibujar(c: CanvasRenderingContext2D, q: Cuadro | undefined, x: number, y: number, escala = 1): boolean {
  if (!q) return false;
  let im = q.img;
  if (!im) { im = imgs.get(q.atlas) ?? null; if (!im) { cargarAtlas(q.atlas); return false; } q.img = im; }
  usado.set(q.atlas, ahoraCuadro);
  if (escala === 1) c.drawImage(im, q.x, q.y, q.w, q.h, Math.round(x - q.ax), Math.round(y - q.ay), q.w, q.h);
  else c.drawImage(im, q.x, q.y, q.w, q.h, x - q.ax * escala, y - q.ay * escala, q.w * escala, q.h * escala);
  return true;
}

// lienzo de trabajo para teñir sprites (golpe, hielo, veneno, campeones)
const tmp = document.createElement('canvas');
const tctx = tmp.getContext('2d')!;
export function dibujarTenido(c: CanvasRenderingContext2D, q: Cuadro | undefined, x: number, y: number, color: string, k: number, escala = 1): boolean {
  if (!q) return false;
  let im = q.img;
  if (!im) { im = imgs.get(q.atlas) ?? null; if (!im) { cargarAtlas(q.atlas); return false; } q.img = im; }
  usado.set(q.atlas, ahoraCuadro);
  if (tmp.width < q.w || tmp.height < q.h) { tmp.width = Math.max(tmp.width, q.w); tmp.height = Math.max(tmp.height, q.h); }
  tctx.globalCompositeOperation = 'copy';
  tctx.drawImage(im, q.x, q.y, q.w, q.h, 0, 0, q.w, q.h);
  tctx.globalCompositeOperation = 'source-atop';
  tctx.globalAlpha = k; tctx.fillStyle = color; tctx.fillRect(0, 0, q.w, q.h); tctx.globalAlpha = 1;
  tctx.globalCompositeOperation = 'source-over';
  c.drawImage(tmp, 0, 0, q.w, q.h, x - q.ax * escala, y - q.ay * escala, q.w * escala, q.h * escala);
  return true;
}
/** Silueta para sombras y fantasmas: todo el sprite de un color. */
export function dibujarSilueta(c: CanvasRenderingContext2D, q: Cuadro | undefined, x: number, y: number, color: string, escala = 1): boolean {
  return dibujarTenido(c, q, x, y, color, 1, escala);
}
