// Pinta en vivo (con Web Workers) los cuadros del héroe cuando cambia el equipo, y los guarda en IndexedDB.
import type { Cuadro } from './assets';
import Obrero from './pintor.worker.ts?worker&inline';
import { accionesClase } from '../juego/anim';

/** Sin datos de la clase: los cuadros de siempre. Cada clase trae los suyos (ver juego/anim.ts). */
const ACCS_BASE: [string, number][] = [['quieto', 4], ['caminar', 8], ['correr', 8], ['atacar', 8], ['lanzar', 8], ['herido', 4], ['morir', 8]];
/** Versión de la caché de cuadros pintados: sube cuando cambian las animaciones de la Forja. */
const VER = 'v18';
/**
 * El paso fino: caminar y correr en 16 rumbos (lo normal son 8). El héroe se mueve en cualquier ángulo; con 8 rumbos el
 * cuerpo iba hasta 30° cruzado respecto de sus pies y parecía patinar. Solo se pintan los 8 rumbos intermedios (los otros
 * 8 son los de siempre), después de todo lo demás y con menos obreros, y se guardan junto al resto.
 */
export const FINO_RUMBOS = 16;
const finos = new Map<string, Cuadro[]>();
let firmaFinos = '', claseFina = '';
/** Los cuadros finos de caminar o correr para el rumbo k (0..15, de a 22.5°, 0 = 'se'), si ya están pintados para el héroe que se ve. */
export const cuadrosFinos = (acc: string, k: number): Cuadro[] | null => (firmaFinos === firmaVivos ? finos.get(acc + '@' + k) ?? null : null);
const DIRS = ['s', 'so', 'o', 'no', 'n', 'ne', 'e', 'se'];
let vivos: Map<string, Cuadro[]> | null = null;
/** Lo nuevo que ya está listo: cada animación se cambia cuando está pintada en las 8 direcciones (antes se mezclaban). */
let nuevosVivos: Map<string, Cuadro[]> | null = null;
const accListas = new Set<string>();
let firmaActual = 'base';
let trabajo = 0;
let obreros: Worker[] = [];
export let progresoPintura = 1;
/** Momento del último cambio visible (para el destello sobre el héroe). */
export let cambioVisible = -10;

/** Los cuadros pintados solo si son de esta firma (para no mostrar el héroe anterior mientras se pinta el nuevo). */
export const cuadrosDeFirma = (firma: string, acc: string, dir: string) => (firma === firmaVivos ? cuadrosVivos(acc, dir) : nuevosVivos && firma === firmaActual ? nuevosVivos.get(acc + '/' + dir) ?? null : null);
let firmaVivos = '';
export const cuadrosVivos = (acc: string, dir: string) => (accListas.has(acc) ? nuevosVivos?.get(acc + '/' + dir) : null) ?? vivos?.get(acc + '/' + dir) ?? (vivos ? null : nuevosVivos?.get(acc + '/' + dir)) ?? null;

function aCuadro(f: any): Cuadro {
  const c = document.createElement('canvas'); c.width = f.w; c.height = f.h;
  c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(f.data), f.w, f.h), 0, 0);
  return { img: c, atlas: '', x: 0, y: 0, w: f.w, h: f.h, ax: f.ax, ay: f.ay, hoja: f.hoja };
}

// ---------------- IndexedDB (si no hay, se pinta igual)
// (con tiempo límite: dentro de un iframe en Safari de iPad la base puede no contestar nunca, ni éxito ni error, y el
// pintor se quedaba esperando para siempre: el equipo nuevo jamás se veía en el héroe)
let dbMuerta = false;
function db(): Promise<IDBDatabase | null> {
  if (dbMuerta) return Promise.resolve(null);
  return new Promise((ok) => {
    const t = setTimeout(() => { dbMuerta = true; ok(null); }, 1200);
    const fin = (v: IDBDatabase | null) => { clearTimeout(t); if (!v) dbMuerta = true; ok(v); };
    try { const r = indexedDB.open('marca_ceniza', 1); r.onupgradeneeded = () => r.result.createObjectStore('sprites'); r.onsuccess = () => fin(r.result); r.onerror = () => fin(null); r.onblocked = () => fin(null); } catch { fin(null); }
  });
}
async function leer(k: string): Promise<any | null> {
  const d = await db(); if (!d) return null;
  return new Promise((ok) => { const tt = setTimeout(() => ok(null), 1500); const fin = (v: any) => { clearTimeout(tt); ok(v); }; try { const t = d.transaction('sprites').objectStore('sprites').get(k); t.onsuccess = () => fin(t.result ?? null); t.onerror = () => fin(null); } catch { fin(null); } });
}
async function escribir(k: string, v: any) {
  const d = await db(); if (!d) return;
  try {
    const st = d.transaction('sprites', 'readwrite').objectStore('sprites');
    st.put(v, k);
    // guardar solo los últimos 6
    const ks = st.getAllKeys(); ks.onsuccess = () => { const ret = k.startsWith('R|'), all = (ks.result as string[]).filter((x) => x.startsWith('R|') === ret); if (all.length > 5) for (const x of all.slice(0, all.length - 5)) if (x !== k) st.delete(x); };
  } catch { /* sin espacio */ }
}

const recordar = (clase: string, clave: string) => { try { localStorage.setItem('pintor.ultima|' + clase, clave); } catch { /* sin almacenamiento */ } };
const ultima = (clase: string) => { try { return localStorage.getItem('pintor.ultima|' + clase); } catch { return null; } };

/** Pide los cuadros para este cuerpo y equipo. firma 'base' = usar lo horneado. */
export async function pintarHeroe(clase: string, cuerpo: any, equipo: any, firma: string, dirPref = 's') {
  // (el equipo de salida es 'base' para todas las clases: ahí manda la clase, que el paso fino sí es distinto)
  if (firma === firmaActual && (firma !== 'base' || claseFina === clase)) return;
  firmaActual = firma; claseFina = clase;
  const yo = ++trabajo;
  for (const o of obreros) o.terminate();
  obreros = [];
  finos.clear(); firmaFinos = '';
  // (con el equipo de salida se usa lo horneado, pero el paso fino se pinta igual: un héroe nuevo tampoco patina)
  if (firma === 'base') { vivos = null; firmaVivos = 'base'; nuevosVivos = null; accListas.clear(); progresoPintura = 1; cambioVisible = performance.now() / 1000; }
  const ACCS = accionesClase(clase).length ? accionesClase(clase) : ACCS_BASE;
  const clave = VER + '|' + clase + '|' + firma;
  const cache = await leer(clave);
  if (yo !== trabajo) return;
  const aMapa = (c: Record<string, any[]>) => { const m = new Map<string, Cuadro[]>(); for (const [k, fs] of Object.entries(c)) if (!k.includes('@')) m.set(k, fs.map(aCuadro)); return m; };
  const base12 = Object.fromEntries(ACCS) as Record<string, number>;
  const ponerFinos = (c: Record<string, any[]>) => { let n = 0; for (const [k, fs] of Object.entries(c)) if (k.includes('@')) { finos.set(k, fs.map(aCuadro)); n++; } if (n) firmaFinos = firma; return n; };
  /** Pinta el paso fino (o lo que falte de él) y lo agrega a lo guardado. */
  const afinar = async (crudos: Record<string, any[]>) => {
    const tr: { acc: string; k: number }[] = [];
    for (const acc of ['correr', 'caminar']) if (base12[acc]) for (let k = 1; k < FINO_RUMBOS; k += 2) if (!crudos[acc + '@' + k]) tr.push({ acc, k });
    if (!tr.length) return;
    firmaFinos = firma;
    let sig2 = 0, hechos2 = 0;
    await new Promise<void>((fin) => {
      for (let i = 0; i < Math.max(1, Math.min(2, (navigator.hardwareConcurrency || 4) - 2)); i++) {
        let w: Worker; try { w = new Obrero(); } catch { fin(); return; }
        obreros.push(w);
        const dar = () => { if (sig2 < tr.length) { const t = tr[sig2++]; w.postMessage({ id: yo, cuerpo, equipo, acc: t.acc, dir: 'r' + (t.k * 360) / FINO_RUMBOS, cuadros: base12[t.acc], base: base12[t.acc], calidad: 1, clave: t.acc + '@' + t.k }); } else w.terminate(); };
        w.onmessage = (ev) => { const m = ev.data; if (m.id !== yo) return; if (!m.error) { finos.set(m.clave, m.out.map(aCuadro)); crudos[m.clave] = m.out; (window as any).__finos = finos.size; } if (++hechos2 >= tr.length) fin(); dar(); };
        w.onerror = () => { if (++hechos2 >= tr.length) fin(); dar(); };
        dar();
      }
    });
    if (yo !== trabajo) return;
    escribir(clave, crudos);
  };
  if (firma === 'base') { if (cache) ponerFinos(cache); void afinar(cache ?? {}); return; }
  if (cache) { vivos = aMapa(cache); firmaVivos = firma; nuevosVivos = null; accListas.clear(); progresoPintura = 1; cambioVisible = performance.now() / 1000; recordar(clase, clave); ponerFinos(cache); void afinar(cache); return; }
  // sin nada pintado todavía (partida recién abierta): mostrar el último héroe completo de esta clase en vez del horneado
  if (!vivos) { const ult = ultima(clase); const c2 = ult && ult.startsWith(VER + '|') ? await leer(ult) : null; if (yo !== trabajo) return; if (c2) { vivos = aMapa(c2); firmaVivos = ult!.slice((VER + '|' + clase + '|').length); } }
  // si el equipo cambia varias veces seguidas, esperar a que se quede quieto antes de pintar
  await new Promise((r) => setTimeout(r, 350));
  if (yo !== trabajo) return;
  // prioridad: quieto y caminar hacia donde mira, después quieto, caminar y correr en todas, al final el resto
  const trabajos: { acc: string; dir: string; n: number }[] = [];
  const N_ = Object.fromEntries(ACCS) as Record<string, number>;
  const poner = (acc: string, dir: string) => { if (!trabajos.some((t) => t.acc === acc && t.dir === dir)) trabajos.push({ acc, dir, n: N_[acc] }); };
  poner('quieto', dirPref); poner('caminar', dirPref); poner('correr', dirPref); poner('atacar', dirPref);
  for (const acc of ['quieto', 'caminar', 'correr']) for (const dir of DIRS) poner(acc, dir);
  for (const [acc] of ACCS) for (const dir of DIRS) poner(acc, dir);
  const nuevos = new Map<string, Cuadro[]>();
  nuevosVivos = nuevos; accListas.clear();
  const faltan: Record<string, number> = {}; for (const t of trabajos) faltan[t.acc] = (faltan[t.acc] ?? 0) + 1;
  const crudos: Record<string, any[]> = {};
  let hechos = 0, sig = 0;
  progresoPintura = 0;
  const N = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1));
  await new Promise<void>((fin) => {
    for (let i = 0; i < N; i++) {
      let w: Worker;
      try { w = new Obrero(); } catch { fin(); return; }
      obreros.push(w);
      const dar = () => { if (sig < trabajos.length) { const t = trabajos[sig++]; w.postMessage({ id: yo, cuerpo, equipo, acc: t.acc, dir: t.dir, cuadros: t.n, calidad: 1 }); } else { w.terminate(); } };
      w.onmessage = (ev) => {
        const m = ev.data;
        if (m.id !== yo) return;
        if (!m.error) { nuevos.set(m.acc + '/' + m.dir, m.out.map(aCuadro)); crudos[m.acc + '/' + m.dir] = m.out; }
        if (--faltan[m.acc] <= 0) { accListas.add(m.acc); if (m.acc === 'quieto') cambioVisible = performance.now() / 1000; }
        hechos++; progresoPintura = hechos / trabajos.length;
        if (hechos >= trabajos.length) fin();
        dar();
      };
      w.onerror = () => { hechos++; if (hechos >= trabajos.length) fin(); dar(); };
      dar();
    }
  });
  if (yo !== trabajo) return;
  if (nuevos.size) { vivos = nuevos; firmaVivos = firma; nuevosVivos = null; accListas.clear(); escribir(clave, crudos); recordar(clase, clave); }
  progresoPintura = 1;
  if (nuevos.size) void afinar(crudos);
}

// ------------------------------------------------------------------ el retrato de los menús
/** Cuánto más grande que el sprite del juego se pinta el retrato. */
export const RETRATO_K = 2.6;
const retratos = new Map<string, Cuadro[] | 'pintando'>();
/**
 * El héroe en grande para los menús (la portada y «Tus héroes»), con el equipo que lleva: cuatro cuadros de su reposo
 * pintados a tamaño de retrato. Devuelve null mientras se pinta (quien llama muestra el sprite chico entretanto).
 */
export function retratoVivo(clase: string, cuerpo: any, equipo: any, firma: string): Cuadro[] | null {
  const clave = 'R|' + VER + '|' + clase + '|' + firma, ya = retratos.get(clave);
  if (ya) return ya === 'pintando' ? null : ya;
  retratos.set(clave, 'pintando');
  void (async () => {
    const cache = await leer(clave);
    if (cache?.length) { retratos.set(clave, cache.map(aCuadro)); return; }
    const n = (accionesClase(clase).find((a) => a[0] === 'quieto') ?? ['quieto', 4])[1], fs = [0, 1, 2, 3].map((i) => (i * n) / 4), out: any[] = new Array(4);
    let hechos = 0;
    await new Promise<void>((fin) => {
      const N = Math.max(1, Math.min(2, (navigator.hardwareConcurrency || 4) - 2));
      for (let w0 = 0; w0 < N; w0++) {
        let w: Worker; try { w = new Obrero(); } catch { fin(); return; }
        let sig = w0;
        const dar = () => { if (sig < 4) { w.postMessage({ id: clave, cuerpo, equipo, acc: 'quieto', dir: 'so', retrato: RETRATO_K, fs: [fs[sig]], clave: String(sig), calidad: 1 }); sig += N; } else w.terminate(); };
        w.onmessage = (ev) => { const m = ev.data; if (!m.error && m.out?.[0]) out[+m.clave] = m.out[0]; if (++hechos >= 4) fin(); dar(); };
        w.onerror = () => { if (++hechos >= 4) fin(); dar(); };
        dar();
      }
    });
    const buenos = out.filter(Boolean);
    if (buenos.length) { retratos.set(clave, buenos.map(aCuadro)); (window as any).__retratos = ((window as any).__retratos ?? 0) + 1; escribir(clave, buenos); } else retratos.delete(clave);
  })();
  return null;
}
