// Pinta en vivo (con Web Workers) los cuadros del héroe cuando cambia el equipo, y los guarda en IndexedDB.
import type { Cuadro } from './assets';
import Obrero from './pintor.worker.ts?worker&inline';
import { accionesClase } from '../juego/anim';

/** Sin datos de la clase: los cuadros de siempre. Cada clase trae los suyos (ver juego/anim.ts). */
const ACCS_BASE: [string, number][] = [['quieto', 4], ['caminar', 8], ['correr', 8], ['atacar', 8], ['lanzar', 8], ['herido', 4], ['morir', 8]];
/** Versión de la caché de cuadros pintados: sube cuando cambian las animaciones de la Forja. */
const VER = 'v16';
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
    const ks = st.getAllKeys(); ks.onsuccess = () => { const all = ks.result as string[]; if (all.length > 6) for (const x of all.slice(0, all.length - 6)) if (x !== k) st.delete(x); };
  } catch { /* sin espacio */ }
}

const recordar = (clase: string, clave: string) => { try { localStorage.setItem('pintor.ultima|' + clase, clave); } catch { /* sin almacenamiento */ } };
const ultima = (clase: string) => { try { return localStorage.getItem('pintor.ultima|' + clase); } catch { return null; } };

/** Pide los cuadros para este cuerpo y equipo. firma 'base' = usar lo horneado. */
export async function pintarHeroe(clase: string, cuerpo: any, equipo: any, firma: string, dirPref = 's') {
  if (firma === firmaActual) return;
  firmaActual = firma;
  const yo = ++trabajo;
  for (const o of obreros) o.terminate();
  obreros = [];
  if (firma === 'base') { vivos = null; nuevosVivos = null; accListas.clear(); progresoPintura = 1; cambioVisible = performance.now() / 1000; return; }
  const ACCS = accionesClase(clase).length ? accionesClase(clase) : ACCS_BASE;
  const clave = VER + '|' + clase + '|' + firma;
  const cache = await leer(clave);
  if (yo !== trabajo) return;
  const aMapa = (c: Record<string, any[]>) => { const m = new Map<string, Cuadro[]>(); for (const [k, fs] of Object.entries(c)) m.set(k, fs.map(aCuadro)); return m; };
  if (cache) { vivos = aMapa(cache); firmaVivos = firma; nuevosVivos = null; accListas.clear(); progresoPintura = 1; cambioVisible = performance.now() / 1000; recordar(clase, clave); return; }
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
}
