// Pinta en vivo (con Web Workers) los cuadros del héroe cuando cambia el equipo, y los guarda en IndexedDB.
import type { Cuadro } from './assets';
import Obrero from './pintor.worker.ts?worker&inline';

const ACCS: [string, number][] = [['quieto', 4], ['caminar', 8], ['correr', 8], ['atacar', 8], ['lanzar', 8], ['herido', 4], ['morir', 8]];
const DIRS = ['s', 'so', 'o', 'no', 'n', 'ne', 'e', 'se'];
let vivos: Map<string, Cuadro[]> | null = null;
let firmaActual = 'base';
let trabajo = 0;
let obreros: Worker[] = [];
export let progresoPintura = 1;

export const cuadrosVivos = (acc: string, dir: string) => vivos?.get(acc + '/' + dir) ?? null;

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
export async function pintarHeroe(clase: string, cuerpo: any, equipo: any, firma: string) {
  if (firma === firmaActual) return;
  firmaActual = firma;
  const yo = ++trabajo;
  for (const o of obreros) o.terminate();
  obreros = [];
  if (firma === 'base') { vivos = null; progresoPintura = 1; return; }
  const clave = clase + '|' + firma;
  const cache = await leer(clave);
  if (yo !== trabajo) return;
  if (cache) { const m = new Map<string, Cuadro[]>(); for (const [k, fs] of Object.entries(cache as Record<string, any[]>)) m.set(k, fs.map(aCuadro)); vivos = m; progresoPintura = 1; return; }
  const trabajos: { acc: string; dir: string; n: number }[] = [];
  for (const [acc, n] of ACCS) for (const dir of DIRS) trabajos.push({ acc, dir, n });
  const nuevos = new Map<string, Cuadro[]>();
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
        hechos++; progresoPintura = hechos / trabajos.length;
        if (hechos >= trabajos.length) fin();
        dar();
      };
      w.onerror = () => { hechos++; if (hechos >= trabajos.length) fin(); dar(); };
      dar();
    }
  });
  if (yo !== trabajo) return;
  if (nuevos.size) { vivos = nuevos; escribir(clave, crudos); }
  progresoPintura = 1;
}
