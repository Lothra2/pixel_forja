// Efectos de pixelfx (exportados por la Forja): hojas de cuadros con su ancla, por dirección, empacadas en pocos .bin.
// Los datos y los paquetes se bajan cuando hace falta; cada página se decodifica la primera vez que un efecto la usa y se
// suelta cuando nadie la usa, con un tope de memoria (60 Mpx en táctil). Ver hornear/empacar_pfx.py.
import { BASE } from '../motor/assets';
import { E } from '../nucleo/lienzo';
import { armarUsosPfx } from '../juego/pfx_usos';

export interface CuadroPfx { 0: number; 1: number; 2: number; 3: number; 4: number; 5: number; 6: number }
interface Pagina { archivo: string; w: number; h: number; bytes: number; ubic: [string, number, number] }
interface DirPfx { dir: string; espejo: boolean; de?: string; cuadros?: number[][] }
export interface EfectoPfx {
  id: string; nombre: [string, string]; categoria: string; capa: 'mundo' | 'piso' | 'pantalla';
  cuadros: number; t: number; bucle: boolean; direccional: boolean; escala: number; caja: number[];
  paginas: Pagina[]; peso: number; mezcla: string; direcciones: DirPfx[];
  cuerpo?: { tinte?: { color: string; fuerza: number }; alfa?: number[] }; luz?: any; uso?: any[]; paquete: string;
}

let datos: Record<string, EfectoPfx> | null = null, pidiendoDatos = false;
/** Pide el índice de efectos (una vez). */
function cargarDatos() {
  if (datos || pidiendoDatos) return;
  pidiendoDatos = true;
  fetch(BASE + 'fx/efectos_pfx.json').then((r) => r.json()).then((j) => { datos = Object.fromEntries(j.efectos.map((e: EfectoPfx) => [e.id, e])); armarUsosPfx(j.efectos); }).catch(() => { pidiendoDatos = false; });
}
cargarDatos();
export const efectoPfx = (id: string) => (cargarDatos(), datos?.[id]);
export const pfxListo = () => !!datos;
export const todosPfx = () => (datos ? Object.values(datos) : []);

// paquetes: los bytes comprimidos, guardados (pesan poco); las páginas decodificadas, con tope
const paquetes = new Map<string, ArrayBuffer | null>();
function paquete(g: string): ArrayBuffer | null {
  if (paquetes.has(g)) return paquetes.get(g)!;
  paquetes.set(g, null);
  // el paquete viene en base64 (el artifact no sirve binarios): se decodifica una vez con fetch de un data: URL
  fetch(BASE + `fx/pfx_${g}.txt`).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.text(); }).then((t) => fetch('data:application/octet-stream;base64,' + t.trim())).then((r) => r.arrayBuffer()).then((b) => paquetes.set(g, b)).catch(() => setTimeout(() => paquetes.delete(g), 3000));
  return null;
}
interface Viva { bmp: ImageBitmap | HTMLImageElement | null; mpx: number; uso: number; pidiendo: boolean }
const paginas = new Map<string, Viva>();
export const memoriaPfx = { mpx: 0, paginas: 0, tope: 0 };
const tope = () => (E.tactil ? 60 : 160);
function pagina(p: Pagina): Viva['bmp'] {
  let v = paginas.get(p.archivo);
  const ahora = performance.now();
  if (v) { v.uso = ahora; return v.bmp; }
  const buf = paquete(p.ubic[0]); if (!buf) return null;
  v = { bmp: null, mpx: (p.w * p.h) / 1e6, uso: ahora, pidiendo: true };
  paginas.set(p.archivo, v);
  memoriaPfx.mpx += v.mpx; memoriaPfx.paginas++;
  const blob = new Blob([buf.slice(p.ubic[1], p.ubic[1] + p.ubic[2])], { type: 'image/png' });
  const fin = (b: Viva['bmp']) => { v!.bmp = b; v!.pidiendo = false; };
  if (typeof createImageBitmap === 'function') createImageBitmap(blob).then(fin).catch(() => soltar(p.archivo));
  else { const im = new Image(); im.onload = () => fin(im); im.src = URL.createObjectURL(blob); }
  podar();
  return null;
}
function soltar(archivo: string) {
  const v = paginas.get(archivo); if (!v) return;
  if (v.bmp && 'close' in v.bmp) (v.bmp as ImageBitmap).close();
  paginas.delete(archivo); memoriaPfx.mpx -= v.mpx; memoriaPfx.paginas--;
}
/** Suelta lo que nadie usó hace rato y, si se pasa del tope, lo menos usado (nunca lo de este último segundo). */
export function podar() {
  const ahora = performance.now(), t = tope(); memoriaPfx.tope = t;
  for (const [k, v] of paginas) if (!v.pidiendo && ahora - v.uso > 20000) soltar(k);
  if (memoriaPfx.mpx <= t) return;
  const orden = [...paginas.entries()].filter(([, v]) => !v.pidiendo && ahora - v.uso > 1000).sort((a, b) => a[1].uso - b[1].uso);
  for (const [k] of orden) { if (memoriaPfx.mpx <= t) break; soltar(k); }
}
let ultimaPoda = 0;
export function cuidarPfx() { const a = performance.now(); if (a - ultimaPoda > 2000) { ultimaPoda = a; podar(); } }

/** Pide de antemano las páginas de estos efectos (al entrar a una zona o elegir la clase). */
export function precargarPfx(ids: string[]) {
  for (const id of ids) { const e = efectoPfx(id); if (e) for (const p of e.paginas) pagina(p); }
}

/** Cuadro del efecto a los `seg` segundos (o -1 si ya terminó). */
export function cuadroPfx(e: EfectoPfx, seg: number) {
  const i = Math.floor((seg * 25) / e.t);
  return e.bucle ? ((i % e.cuadros) + e.cuadros) % e.cuadros : i < e.cuadros ? i : -1;
}
/** Duración en segundos de una pasada. */
export const duracionPfx = (e: EfectoPfx) => (e.cuadros * e.t) / 25;
/** El índice de dirección 0..7 (s, so, o, no, n, ne, e, se) desde un vector en el mundo. */
export function dirPfx(vx: number, vy: number) {
  // en pantalla: sx = vx - vy, sy = (vx + vy) / 2
  const sx = vx - vy, sy = (vx + vy) / 2, a = Math.atan2(sy, sx);
  // s = abajo (pi/2), so = abajo izquierda, o = izquierda (pi), ... sentido horario visto en pantalla
  const k = Math.round(((a - Math.PI / 2) / (Math.PI / 4)) + 8) % 8;
  return k;
}

/**
 * Dibuja el efecto con su ancla en (x, y) de pantalla. `dir` 0..7. Devuelve false si todavía no está cargado o ya
 * terminó. Capa pantalla: estirado a cubrir (W, H) y la esquina en (0, 0).
 */
export function dibujarPfx(ctx: CanvasRenderingContext2D, id: string, seg: number, x: number, y: number, o: { dir?: number; alfa?: number; escala?: number; W?: number; H?: number; tesela?: boolean } = {}): boolean {
  const e = efectoPfx(id); if (!e) return false;
  const n = cuadroPfx(e, seg); if (n < 0) return false;
  let d = e.direcciones[e.direccional ? (o.dir ?? 0) % e.direcciones.length : 0];
  let espejo = false;
  if (d.espejo) { espejo = true; d = e.direcciones.find((q) => q.dir === d.de)!; }
  const c = d?.cuadros?.[Math.min(n, d.cuadros.length - 1)]; if (!c) return false;
  if (!c[3]) return true; // cuadro vacío
  const p = e.paginas[c[0]]; const bmp = pagina(p); if (!bmp) return false;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (o.alfa !== undefined) ctx.globalAlpha *= o.alfa;
  ctx.globalCompositeOperation = e.mezcla === 'aditiva' || e.mezcla === 'sumar' ? 'lighter' : 'source-over';
  if (e.capa === 'pantalla' && o.tesela) {
    // clima en mosaico: el cuadro a escala 2 (el mismo pixel que el mundo) con la esquina en (x, y)
    ctx.drawImage(bmp, c[1], c[2], c[3], c[4], Math.round(x), Math.round(y), c[3] * 2, c[4] * 2);
  } else if (e.capa === 'pantalla' && o.W) {
    // a cubrir la pantalla manteniendo la proporción del cuadro
    const k = Math.max(o.W / c[3], (o.H ?? 0) / c[4]);
    ctx.drawImage(bmp, c[1], c[2], c[3], c[4], (o.W - c[3] * k) / 2, ((o.H ?? 0) - c[4] * k) / 2, c[3] * k, c[4] * k);
  } else {
    const k = e.escala * (o.escala ?? 1), w = c[3] * k, h = c[4] * k;
    if (espejo) { ctx.translate(Math.round(x - (c[5] + c[3]) * k) + w, Math.round(y + c[6] * k)); ctx.scale(-1, 1); ctx.drawImage(bmp, c[1], c[2], c[3], c[4], 0, 0, w, h); }
    else ctx.drawImage(bmp, c[1], c[2], c[3], c[4], Math.round(x + c[5] * k), Math.round(y + c[6] * k), w, h);
  }
  ctx.restore();
  return true;
}
/** Alfa del cuerpo en el cuadro (aparecer, desaparecer, morir) o 1. */
export function alfaCuerpo(id: string, seg: number) {
  const e = efectoPfx(id); const a = e?.cuerpo?.alfa; if (!a || !e) return 1;
  const n = cuadroPfx(e, seg); return n < 0 ? a[a.length - 1] : a[Math.min(n, a.length - 1)];
}
(window as any).__pfx = { memoria: memoriaPfx, dibujarPfx, efectoPfx, todos: todosPfx };
