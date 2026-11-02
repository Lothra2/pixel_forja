// Pinta en vivo (con Web Workers) los cuadros del héroe cuando cambia el equipo, y los guarda en IndexedDB.
import type { Cuadro } from './assets';
import Obrero from './pintor.worker.ts?worker&inline';

const ACCS: [string, number][] = [['quieto', 4], ['caminar', 8], ['correr', 8], ['atacar', 8], ['lanzar', 8], ['herido', 4], ['morir', 8]];
const DIRS = ['s', 'so', 'o', 'no', 'n', 'ne', 'e', 'se'];
let vivos: Map<string, Cuadro[]> | null = null;
/** Lo nuevo que ya está listo: cada animación se cambia apenas se termina de pintar. */
let nuevosVivos: Map<string, Cuadro[]> | null = null;
let firmaActual = 'base';
let trabajo = 0;
let obreros: Worker[] = [];
export let progresoPintura = 1;
/** Momento del último cambio visible (para el destello sobre el héroe). */
export let cambioVisible = -10;

/** Los cuadros pintados solo si son de esta firma (para no mostrar el héroe anterior mientras se pinta el nuevo). */
export const cuadrosDeFirma = (firma: string, acc: string, dir: string) => (firma === firmaVivos ? cuadrosVivos(acc, dir) : nuevosVivos && firma === firmaActual ? nuevosVivos.get(acc + '/' + dir) ?? null : null);
let firmaVivos = '';
export const cuadrosVivos = (acc: string, dir: string) => nuevosVivos?.get(acc + '/' + dir) ?? vivos?.get(acc + '/' + dir) ?? null;

function aCuadro(f: any): Cuadro {
  const c = document.createElement('canvas'); c.width = f.w; c.height = f.h;
  c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(f.data), f.w, f.h), 0, 0);
  return { img: c, atlas: '', x: 0, y: 0, w: f.w, h: f.h, ax: f.ax, ay: f.ay, hoja: f.hoja };
}

// ---------------- IndexedDB (si no hay, se pinta igual)
function db(): Promise<IDBDatabase | null> {
  return new Promise((ok) => {
    try { const r = indexedDB.open('marca_ceniza', 1); r.onupgradeneeded = () => r.result.createObjectStore('sprites'); r.onsuccess = () => ok(r.result); r.onerror = () => ok(null); } catch { ok(null); }
  });
}
async function leer(k: string): Promise<any | null> {
  const d = await db(); if (!d) return null;
  return new Promise((ok) => { try { const t = d.transaction('sprites').objectStore('sprites').get(k); t.onsuccess = () => ok(t.result ?? null); t.onerror = () => ok(null); } catch { ok(null); } });
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

/** Pide los cuadros para este cuerpo y equipo. firma 'base' = usar lo horneado. */
export async function pintarHeroe(clase: string, cuerpo: any, equipo: any, firma: string, dirPref = 's') {
  if (firma === firmaActual) return;
  firmaActual = firma;
  const yo = ++trabajo;
  for (const o of obreros) o.terminate();
  obreros = [];
  if (firma === 'base') { vivos = null; nuevosVivos = null; progresoPintura = 1; cambioVisible = performance.now() / 1000; return; }
  const clave = 'v6|' + clase + '|' + firma;
  const cache = await leer(clave);
  if (yo !== trabajo) return;
  if (cache) { const m = new Map<string, Cuadro[]>(); for (const [k, fs] of Object.entries(cache as Record<string, any[]>)) m.set(k, fs.map(aCuadro)); vivos = m; firmaVivos = firma; nuevosVivos = null; progresoPintura = 1; cambioVisible = performance.now() / 1000; return; }
  // prioridad: quieto y caminar hacia donde mira, después quieto, caminar y correr en todas, al final el resto
  const trabajos: { acc: string; dir: string; n: number }[] = [];
  const N_ = Object.fromEntries(ACCS) as Record<string, number>;
  const poner = (acc: string, dir: string) => { if (!trabajos.some((t) => t.acc === acc && t.dir === dir)) trabajos.push({ acc, dir, n: N_[acc] }); };
  poner('quieto', dirPref); poner('caminar', dirPref); poner('correr', dirPref); poner('atacar', dirPref);
  for (const acc of ['quieto', 'caminar', 'correr']) for (const dir of DIRS) poner(acc, dir);
  for (const [acc] of ACCS) for (const dir of DIRS) poner(acc, dir);
  const nuevos = new Map<string, Cuadro[]>();
  nuevosVivos = nuevos;
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
        if (!m.error) { nuevos.set(m.acc + '/' + m.dir, m.out.map(aCuadro)); crudos[m.acc + '/' + m.dir] = m.out; if (nuevos.size === 1) cambioVisible = performance.now() / 1000; }
        hechos++; progresoPintura = hechos / trabajos.length;
        if (hechos >= trabajos.length) fin();
        dar();
      };
      w.onerror = () => { hechos++; if (hechos >= trabajos.length) fin(); dar(); };
      dar();
    }
  });
  if (yo !== trabajo) return;
  if (nuevos.size) { vivos = nuevos; firmaVivos = firma; nuevosVivos = null; escribir(clave, crudos); }
  progresoPintura = 1;
}
