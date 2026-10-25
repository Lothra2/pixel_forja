import type { Raster } from '../engine/core/raster';

/** Ayudantes de la página: imágenes del motor a canvas (con caché), DOM chiquito y textos es/en. */

const lienzos = new WeakMap<Raster, HTMLCanvasElement>();
/** Canvas con los pixeles de un Raster (se crea una sola vez por imagen). */
export function lienzo(r: Raster): HTMLCanvasElement {
  let c = lienzos.get(r);
  if (!c) {
    c = document.createElement('canvas');
    c.width = r.w; c.height = r.h;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(r.w, r.h);
    img.data.set(r.data);
    ctx.putImageData(img, 0, 0);
    lienzos.set(r, c);
  }
  return c;
}

/** Dibuja un Raster en un contexto (espejado si hace falta), en coordenadas de pixel del juego. */
export function dibujar(ctx: CanvasRenderingContext2D, r: Raster, x: number, y: number, espejo = false): void {
  const c = lienzo(r);
  if (!espejo) { ctx.drawImage(c, Math.round(x), Math.round(y)); return; }
  ctx.save();
  ctx.translate(Math.round(x) + r.w, Math.round(y));
  ctx.scale(-1, 1);
  ctx.drawImage(c, 0, 0);
  ctx.restore();
}

type Hijo = Node | string | number | null | undefined | false;
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, unknown> = {}, ...hijos: Hijo[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k in el && typeof v !== 'string') (el as unknown as Record<string, unknown>)[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of hijos) if (c !== null && c !== undefined && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}

/** Canvas de pixel art que se ve nítido a cualquier escala. */
export function canvasPixel(w: number, h: number, escala: number, clase = ''): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.className = 'px ' + clase;
  c.style.width = `${w * escala}px`;
  c.style.height = `${h * escala}px`;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return c;
}

export type Lang = 'es' | 'en';
export let lang: Lang = (() => {
  try { const s = localStorage.getItem('pf.lang'); if (s === 'es' || s === 'en') return s; } catch { /* sin almacenamiento */ }
  return 'es';
})();
export function setLang(l: Lang) { lang = l; try { localStorage.setItem('pf.lang', l); } catch { /* nada */ } }
export const tr = (par: [string, string] | undefined, fallback = '') => (par ? par[lang === 'es' ? 0 : 1] : fallback);

export function guardar<T>(clave: string, v: T): void { try { localStorage.setItem(clave, JSON.stringify(v)); } catch { /* sin almacenamiento */ } }
export function leer<T>(clave: string, def: T): T { try { const s = localStorage.getItem(clave); return s ? (JSON.parse(s) as T) : def; } catch { return def; } }

/** Reloj de 60 ticks por segundo para todas las animaciones de la página. */
const suscriptores = new Set<(tick: number) => void>();
let tick = 0, ultimo = 0, corriendo = false;
export function alTick(f: (tick: number) => void): () => void {
  suscriptores.add(f);
  if (!corriendo) {
    corriendo = true;
    const loop = (t: number) => {
      if (!ultimo) ultimo = t;
      let pasos = Math.min(4, Math.floor((t - ultimo) / (1000 / 60)));
      if (pasos > 0) ultimo += pasos * (1000 / 60);
      while (pasos-- > 0) { tick++; for (const s of suscriptores) s(tick); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  return () => suscriptores.delete(f);
}
export const ahora = () => tick;

/**
 * Entrega un archivo al usuario. Dentro de un artifact de claude.ai usa la capacidad de descargas (pide confirmación);
 * en una página normal hace la descarga de siempre con un enlace.
 */
type ClaudeDescargas = { save(r: { filename: string; data: Blob }): Promise<unknown> };
const descargas: Promise<ClaudeDescargas | null> = (() => {
  const cl = (globalThis as { claude?: { use?: (n: string) => Promise<unknown> } }).claude;
  if (!cl?.use) return Promise.resolve(null);
  return Promise.race([cl.use('downloads') as Promise<ClaudeDescargas | null>, new Promise<null>((r) => setTimeout(() => r(null), 10000))]).catch(() => null);
})();
export async function guardarArchivo(nombre: string, bytes: Uint8Array, tipo = 'application/zip'): Promise<void> {
  const blob = new Blob([bytes as BlobPart], { type: tipo });
  const d = await descargas;
  if (d) { try { await d.save({ filename: nombre, data: blob }); } catch { /* el usuario dijo que no o no se puede aquí */ } return; }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
/** Botón que vuelve a entregar el archivo. */
export const botonArchivo = (nombre: string, bytes: Uint8Array) =>
  h('button', { class: 'btn', onclick: () => void guardarArchivo(nombre, bytes) }, lang === 'es' ? 'Descargar el zip' : 'Download zip');
